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
    await expect(sql`truncate public.notices`).rejects.toThrow(/never deleted/)
    expect(await notice(2201)).toBeDefined()
  })
})
