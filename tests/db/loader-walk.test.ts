import postgres from 'postgres'
import { afterAll, describe, expect, it } from 'vitest'
import { walkNotices, type FeedRecord, type FetchPage } from '../../loader/notices.ts'

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error('TEST_DATABASE_URL is not set. Run the tests with: npm test')
const sql = postgres(url, { max: 1, onnotice: () => {} })
afterAll(() => sql.end())

// A feed time n days from now, in the feed's format and Vilnius time.
const feedTime = (daysFromNow: number, hm = '10:00') => {
  const d = new Date(Date.now() + daysFromNow * 864e5)
  const [y, m, day] = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Vilnius' }).format(d).split('-')
  return `${day}-${m}-${y} ${hm}:00`
}

// A feed record with a fresh publication date and a deadline two weeks out.
const rec = (id: number, extra: FeedRecord = {}): FeedRecord => ({
  id,
  title: `Pirkimas ${id}`,
  caName: 'Pirkėjas',
  datePublished: feedTime(0),
  tenderSubmissionDeadline: feedTime(14),
  status: 'Bid submission',
  cpvCodes: '45233000',
  procedure: 'Open',
  evaluationMechanism: 'Lowest Price',
  contractAwardedInLots: false,
  cftInvolves: 'notice.type.publicContract',
  estimatedValue: '1000',
  ...extra,
})

// A feed made of numbered pages; every page not listed is empty.
const feed = (pages: Record<number, FeedRecord[]>) => {
  const calls: number[] = []
  const fetchPage: FetchPage = async (_size, n) => {
    calls.push(n)
    return pages[n] ?? []
  }
  return { fetchPage, calls }
}

const notice = async (id: number) => {
  const [row] = await sql`select * from public.notices where id = ${id}`
  return row
}

describe('a walk of the feed', () => {
  it('stores every Notice with its kind, its details and its times in UTC', async () => {
    const { fetchPage } = feed({
      1: [
        rec(1001, { tenderSubmissionDeadline: '30-07-2041 09:45:00', cpvCodes: '45233252, 45233141', contractAwardedInLots: true }),
        rec(1002, { cftInvolves: null, procedure: 'Preliminary Market Consultation', status: 'Proposal Submission', evaluationMechanism: null }),
      ],
      2: [rec(1003, { cftInvolves: 'notice.type.dps', procedure: 'DPS Specific Contract' })],
    })
    await walkNotices(sql, fetchPage)

    const tender = await notice(1001)
    expect(tender).toMatchObject({
      kind: 'tender',
      title: 'Pirkimas 1001',
      buyer_name: 'Pirkėjas',
      status: 'Bid submission',
      cpv_main: '45233252',
      cpv_codes: ['45233252', '45233141'],
      procedure_type: 'Open',
      evaluation: 'Lowest Price',
      in_lots: true,
    })
    expect((tender.deadline_at as Date).toISOString()).toBe('2041-07-30T06:45:00.000Z')
    const [{ local }] = await sql`
      select to_char(deadline_at at time zone 'Europe/Vilnius', 'DD-MM-YYYY HH24:MI:SS') as local
      from public.notices where id = 1001`
    expect(local).toBe('30-07-2041 09:45:00')

    expect((await notice(1002)).kind).toBe('market_consultation')
    expect((await notice(1003)).kind).toBe('dps_contract')
  })
})

const walks = async () => (await sql`select count(*)::int as n from loader.walks`)[0].n as number
const lastWalk = async () => (await sql`select * from loader.walks order by id desc limit 1`)[0]

// Ported from the old loader's walkLive tests. The feed has no total count, and it has
// returned spurious empty pages mid-walk, so an empty page is not trusted as the end.
describe('where a walk ends', () => {
  it('walks pages until a real end, probes past it, and records the walk', async () => {
    const before = await walks()
    const { fetchPage, calls } = feed({ 1: [rec(3001)], 2: [rec(3002)] })
    const out = await walkNotices(sql, fetchPage)
    expect(out).toMatchObject({ total: 2, holes: [], skipped: 0 })
    // Probes past the first empty page (3) happened, and found nothing.
    expect(Math.max(...calls)).toBeGreaterThan(3)
    expect(await walks()).toBe(before + 1)
    expect(await lastWalk()).toMatchObject({ records: 2, skipped: 0, holes: [] })
  })

  it('jumps a spurious empty run when a probe finds later pages, re-fetching the gap once', async () => {
    const { fetchPage, calls } = feed({ 1: [rec(3101)], 4: [rec(3104)] })
    const out = await walkNotices(sql, fetchPage)
    expect(out.total).toBe(2)
    expect(out.holes).toEqual([2, 3])
    const visits = (p: number) => calls.filter((c) => c === p).length
    expect(Math.max(visits(2), visits(3))).toBeGreaterThanOrEqual(2)
    expect(await notice(3104)).toBeDefined()
  })

  it('recovers a gap page that answers on the second try', async () => {
    let page2 = 0
    const fetchPage: FetchPage = async (_size, n) => {
      if (n === 1) return [rec(3201)]
      if (n === 2) return page2++ === 0 ? [] : [rec(3202)]
      if (n === 3) return [rec(3203)]
      return []
    }
    const out = await walkNotices(sql, fetchPage)
    expect(out.total).toBe(3)
    expect(out.holes).toEqual([])
    expect(await notice(3202)).toBeDefined()
  })

  it('refuses to finish when the newest publication date is more than 7 days old', async () => {
    const before = await walks()
    const { fetchPage } = feed({ 1: [rec(3301, { datePublished: feedTime(-8) })] })
    await expect(walkNotices(sql, fetchPage)).rejects.toThrow(/refusing to finish.*stale/i)
    // A refused walk records nothing, so the freshness record still shows the last good one.
    expect(await walks()).toBe(before)
  })

  it('finishes when the newest publication date is 7 days old', async () => {
    const { fetchPage } = feed({ 1: [rec(3351, { datePublished: feedTime(-7) })] })
    await expect(walkNotices(sql, fetchPage)).resolves.toMatchObject({ total: 1 })
  })

  it('refuses to finish when the feed is empty from page 1', async () => {
    const before = await walks()
    await expect(walkNotices(sql, feed({}).fetchPage)).rejects.toThrow(/refusing to finish/i)
    expect(await walks()).toBe(before)
  })

  it('stops a walk that never ends', async () => {
    const fetchPage: FetchPage = async () => [rec(3401)]
    await expect(walkNotices(sql, fetchPage, { maxPages: 5 })).rejects.toThrow(/more than 5 pages/)
  })
})

describe('a malformed record', () => {
  it('is skipped and counted when its id is missing or not a number', async () => {
    const { fetchPage } = feed({ 1: [rec(3501), { ...rec(3502), id: 'oops' }, { ...rec(3503), id: null }, rec(3504)] })
    const out = await walkNotices(sql, fetchPage)
    expect(out).toMatchObject({ total: 2, skipped: 2 })
    expect(await lastWalk()).toMatchObject({ records: 2, skipped: 2 })
  })

  it('stops the walk when more than 100 are skipped', async () => {
    const before = await walks()
    const bad = Array.from({ length: 101 }, (_, i) => ({ ...rec(3600 + i), id: `bad-${i}` }))
    await expect(walkNotices(sql, feed({ 1: bad }).fetchPage)).rejects.toThrow(/101 malformed/)
    expect(await walks()).toBe(before)
  })
})

describe('a page', () => {
  it('holding one id twice stores the last of them', async () => {
    const { fetchPage } = feed({ 1: [rec(3701), rec(3701, { title: 'antras' }), rec(3702)] })
    expect((await walkNotices(sql, fetchPage)).total).toBe(2)
    expect((await notice(3701)).title).toBe('antras')
  })

  it('of 1,000 records is stored whole', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => rec(100_000 + i))
    expect((await walkNotices(sql, feed({ 1: full }).fetchPage)).total).toBe(1000)
    const [{ n }] = await sql`select count(*)::int as n from public.notices where id between 100000 and 100999`
    expect(n).toBe(1000)
  })
})

describe('a Notice already stored', () => {
  it('is updated by the next walk, and kept when the feed no longer lists it', async () => {
    await walkNotices(sql, feed({ 1: [rec(2001), rec(2002)] }).fetchPage)
    const before1 = await notice(2001)
    const before2 = await notice(2002)

    await walkNotices(sql, feed({ 1: [rec(2001, { status: 'Evaluation', title: 'Pirkimas 2001, pataisytas' })] }).fetchPage)

    const after1 = await notice(2001)
    expect(after1).toMatchObject({ status: 'Evaluation', title: 'Pirkimas 2001, pataisytas' })
    expect(after1.first_seen_at).toEqual(before1.first_seen_at)
    expect((after1.updated_at as Date).getTime()).toBeGreaterThan((before1.updated_at as Date).getTime())

    // Gone from the feed, still here and untouched.
    expect(await notice(2002)).toEqual(before2)
  })

  it('is not rewritten when nothing in it changed', async () => {
    await walkNotices(sql, feed({ 1: [rec(2101)] }).fetchPage)
    const before = await notice(2101)
    await walkNotices(sql, feed({ 1: [rec(2101)] }).fetchPage)
    expect(await notice(2101)).toEqual(before)
  })

  it('cannot be deleted, not even by the loader', async () => {
    await walkNotices(sql, feed({ 1: [rec(2201)] }).fetchPage)
    await expect(sql`delete from public.notices where id = 2201`).rejects.toThrow(/never deleted/)
    await expect(sql`truncate public.notices cascade`).rejects.toThrow(/never deleted/)
    expect(await notice(2201)).toBeDefined()
  })
})
