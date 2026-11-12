import postgres from 'postgres'
import { afterAll, describe, expect, it } from 'vitest'

// ADR-0002: Kinds of work match whole-word Lithuanian stems taken from the
// database's own text search. These are the stems the ADR records.

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error('TEST_DATABASE_URL is not set. Run the tests with: npm test')
const sql = postgres(url, { max: 1 })
afterAll(() => sql.end())

const stem = async (word: string) => {
  const [row] = await sql<{ stem: string | null }[]>`select public.lt_stem(${word}) as stem`
  return row.stem
}

describe('Lithuanian text search stems (ADR-0002)', () => {
  it('has the lithuanian text search configuration', async () => {
    const rows = await sql`select 1 from pg_ts_config where cfgname = 'lithuanian'`
    expect(rows).toHaveLength(1)
  })

  it.each([
    ['kelių', 'kel'],
    ['kelionių', 'kelion'],
    ['dangos', 'dang'],
    ['priedangos', 'priedang'],
    ['žvyrkelių', 'žvyrkel'],
    ['ir', 'ir'],
  ])('%s gives %s', async (word, expected) => {
    expect(await stem(word)).toBe(expected)
  })

  it('does not match "dang" inside "priedangos"', async () => {
    expect(await stem('priedangos')).not.toBe(await stem('dangos'))
  })

  // Text search sorts its stems, so taking the first one of several words
  // would quietly give the wrong stem ("kelionių kelių" would give "kel").
  it.each(['kelionių kelių', 'žvyro-skaldos'])('refuses %s, which is more than one word', async (text) => {
    await expect(stem(text)).rejects.toThrow(/one word/)
  })
})
