import postgres from 'postgres'
import { afterAll, describe, expect, it } from 'vitest'
import { openNoticesByKind, unrecognisedKinds, walkNotices, type FeedRecord } from '../../loader/notices.ts'

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error('TEST_DATABASE_URL is not set. Run the tests with: npm test')
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} })
afterAll(() => sql.end())

const feedTime = (daysFromNow: number) => {
  const d = new Date(Date.now() + daysFromNow * 864e5)
  const [y, m, day] = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Vilnius' }).format(d).split('-')
  return `${day}-${m}-${y} 10:00:00`
}

const rec = (id: number, extra: FeedRecord = {}): FeedRecord => ({
  id,
  title: `Pirkimas ${id}`,
  datePublished: feedTime(0),
  tenderSubmissionDeadline: feedTime(10),
  status: 'Bid submission',
  procedure: 'Open',
  cftInvolves: 'notice.type.publicContract',
  ...extra,
})

const load = (...records: FeedRecord[]) => walkNotices(sql, async (_size, n) => (n === 1 ? records : []))

const isOpen = async (id: number) =>
  (await sql`select public.notice_is_open(n) as open from public.notices n where id = ${id}`)[0].open as boolean

describe('an open Notice', () => {
  it.each([
    ['a tender taking bids before its deadline', 6001, {}, true],
    ['a Market consultation taking replies before its reply date', 6002,
      { cftInvolves: null, procedure: 'Preliminary Market Consultation', status: 'Proposal Submission' }, true],
    ['a DPS that is established', 6003,
      { cftInvolves: 'notice.type.dps', procedure: 'Dynamic Purchasing System', status: 'Established' }, true],
    ['a tender in a status the loader has not seen, before its deadline', 6004, { status: 'Something new' }, true],
    ['a tender past its deadline', 6011, { tenderSubmissionDeadline: feedTime(-1) }, false],
    ['a tender without a deadline', 6012, { tenderSubmissionDeadline: null }, false],
    ['a tender cancelled before its deadline', 6013, { status: 'Cancelled' }, false],
    ['a consultation cancelled before its reply date', 6014,
      { cftInvolves: null, procedure: 'Preliminary Market Consultation', status: 'Cancelled' }, false],
    ['a DPS terminated before its deadline', 6015,
      { cftInvolves: 'notice.type.dps', procedure: 'Dynamic Purchasing System', status: 'Terminated' }, false],
    ['a tender in evaluation', 6016, { status: 'Evaluation' }, false],
    ['a tender awaiting bid opening', 6017, { status: 'Awaiting bid opening' }, false],
    ['a consultation closed to proposals', 6018, { status: 'Proposal Submission Closed' }, false],
    ['a tender awarded', 6019, { status: 'Awarded' }, false],
    ['a tender concluded', 6020, { status: 'Concluded' }, false],
    ['a tender closed', 6021, { status: 'Closed' }, false],
  ] as const)('%s: %s', async (_what, id, extra, open) => {
    await load(rec(id, extra))
    expect(await isOpen(id)).toBe(open)
  })
})

describe('open Notices by kind, for the run summary', () => {
  it('counts every kind, including those with none open', async () => {
    const before = await openNoticesByKind(sql)
    expect(Object.keys(before).sort()).toEqual(
      [
        'dps',
        'dps_contract',
        'framework_contract',
        'invitation_only',
        'market_consultation',
        'qualification_system',
        'tender',
        'unknown',
      ],
    )
    await load(
      rec(6101),
      rec(6102),
      rec(6103, { status: 'Cancelled' }),
      rec(6104, { cftInvolves: null, procedure: 'Preliminary Market Consultation', status: 'Proposal Submission' }),
      rec(6105, { cftInvolves: 'notice.type.dps', procedure: 'DPS Specific Contract' }),
      rec(6106, { cftInvolves: 'notice.type.new', procedure: 'Open' }),
      rec(6107, { procedure: 'Specific Contract' }),
      rec(6108, { procedure: 'Simplified' }),
      rec(6109, { procedure: 'Negotiated without prior publication' }),
    )
    const after = await openNoticesByKind(sql)
    expect({
      tender: after.tender - before.tender,
      market_consultation: after.market_consultation - before.market_consultation,
      dps: after.dps - before.dps,
      dps_contract: after.dps_contract - before.dps_contract,
      qualification_system: after.qualification_system - before.qualification_system,
      framework_contract: after.framework_contract - before.framework_contract,
      invitation_only: after.invitation_only - before.invitation_only,
      unknown: after.unknown - before.unknown,
    }).toEqual({
      tender: 2,
      market_consultation: 1,
      dps: 0,
      dps_contract: 1,
      qualification_system: 0,
      framework_contract: 1,
      invitation_only: 2,
      unknown: 1,
    })
  })

  it('names the notice type and procedure of each unknown kind', async () => {
    await load(
      rec(6201, { cftInvolves: 'notice.type.other', procedure: 'Design contest' }),
      rec(6202, { cftInvolves: 'notice.type.other', procedure: 'Design contest', status: 'Awarded' }),
      rec(6203, { cftInvolves: null, procedure: 'Open' }),
    )
    const rows = await unrecognisedKinds(sql)
    expect(rows).toContainEqual({ feed_type: 'notice.type.other', procedure_type: 'Design contest', count: 2 })
    expect(rows).toContainEqual({ feed_type: '(none)', procedure_type: 'Open', count: 1 })
  })
})
