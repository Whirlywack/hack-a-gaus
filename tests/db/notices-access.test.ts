import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { walkNotices, type FeedRecord } from '../../loader/notices.ts'

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error('TEST_DATABASE_URL is not set. Run the tests with: npm test')
const sql = postgres(url, { max: 1, onnotice: () => {} })
afterAll(() => sql.end())

const today = (() => {
  const [y, m, d] = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Vilnius' }).format(new Date()).split('-')
  return `${d}-${m}-${y} 10:00:00`
})()

const rec = (id: number, extra: FeedRecord = {}): FeedRecord => ({
  id,
  title: `Pirkimas ${id}`,
  caName: 'Pirkėjas',
  datePublished: today,
  tenderSubmissionDeadline: '01-01-2040 10:00:00',
  status: 'Bid submission',
  cpvCodes: '45233000',
  procedure: 'Open',
  cftInvolves: 'notice.type.publicContract',
  ...extra,
})

const load = (...records: FeedRecord[]) =>
  walkNotices(sql, async (_size, n) => (n === 1 ? records : []))

// Run one statement as a Supabase client role, inside a transaction that is rolled back.
const asRole = (role: 'anon' | 'authenticated' | 'service_role', query: string) =>
  sql
    .begin(async (tx) => {
      await tx.unsafe(`set local role ${role}`)
      const rows = await tx.unsafe(query)
      throw Object.assign(new Error('rollback'), { rows })
    })
    .catch((e: Error & { rows?: unknown[] }) => {
      if (e.message === 'rollback') return e.rows as Record<string, unknown>[]
      throw e
    })

const CLIENTS = ['anon', 'authenticated', 'service_role'] as const

describe('the value on a Notice', () => {
  beforeAll(() => load(rec(5001, { estimatedValue: '16528.93' }), rec(5002, { estimatedValue: '0' })))

  it('is stored', async () => {
    const rows = await sql`select notice_id, estimated_value::float8 as v from loader.notice_values where notice_id in (5001, 5002) order by 1`
    expect(rows).toEqual([
      { notice_id: '5001', v: 16528.93 },
      { notice_id: '5002', v: null },
    ])
  })

  it('follows the feed when it changes', async () => {
    await load(rec(5001, { estimatedValue: '20000' }))
    const [{ v }] = await sql`select estimated_value::float8 as v from loader.notice_values where notice_id = 5001`
    expect(v).toBe(20000)
  })

  it('is not a column of the public notices table', async () => {
    const cols = await sql`
      select column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'notices' and column_name ilike '%value%'`
    expect(cols).toEqual([])
  })

  it.each(CLIENTS)('cannot be read by %s', async (role) => {
    await expect(asRole(role, 'select * from loader.notice_values')).rejects.toThrow(/permission denied/)
  })
})

describe('the notices table', () => {
  beforeAll(() => load(rec(5101)))

  it.each(['anon', 'authenticated'] as const)('can be read by %s', async (role) => {
    const rows = await asRole(role, 'select id, title from public.notices where id = 5101')
    expect(rows).toEqual([{ id: '5101', title: 'Pirkimas 5101' }])
  })

  it.each(CLIENTS)('cannot be written by %s', async (role) => {
    await expect(asRole(role, `insert into public.notices (id, kind) values (5199, 'tender')`)).rejects.toThrow(/permission denied/)
    await expect(asRole(role, `update public.notices set title = 'x' where id = 5101`)).rejects.toThrow(/permission denied/)
    await expect(asRole(role, 'delete from public.notices where id = 5101')).rejects.toThrow(/permission denied/)
    await expect(asRole(role, 'truncate public.notices')).rejects.toThrow(/permission denied/)
  })

  it.each(CLIENTS)('keeps the walk record from %s', async (role) => {
    await expect(asRole(role, 'select * from loader.walks')).rejects.toThrow(/permission denied/)
  })
})
