import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { contract, contracts } from './jurbarkas'

// Seam 1 (spec, "Testing Decisions"): a title and CPV codes go into the one
// database function, and a match and its reason come out. The named cases and
// their expected results were set by the operator, not by running the function.

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error('TEST_DATABASE_URL is not set. Run the tests with: npm test')
const sql = postgres(url, { max: 1 })
afterAll(() => sql.end())

type Match = { matched: boolean; matched_by: 'code' | 'word' | null; matched_on: string | null }

/** Kind 45233, roads and streets: the hand-checked kind every named case runs against. */
let roads: string
beforeAll(async () => {
  const [kind] = await sql<{ id: string }[]>`
    select id from public.kinds_of_work where origin = 'hand_checked' and cpv_groups = array['45233']`
  roads = kind.id
})

type Db = postgres.Sql | postgres.TransactionSql

/** Match one notice against one kind. The main code is the first listed code unless given. */
async function matchKindIn(db: Db, kindId: string, title: string | null, codes: string[] | null, main = codes?.[0] ?? null) {
  const [row] = await db<Match[]>`
    select matched, matched_by, matched_on
    from public.match_kind(${kindId}, ${title}, ${main}, ${codes}::text[])`
  return row
}

const matchKind = (kindId: string, title: string | null, codes: string[] | null, main?: string | null) =>
  matchKindIn(sql, kindId, title, codes, main)

type TradeMatch = Match & { kind_id: string | null }

/** Match one notice against a set of kinds, as a Trade does. */
async function matchKinds(kindIds: string[], title: string | null, codes: string[] | null, main = codes?.[0] ?? null) {
  const [row] = await sql<TradeMatch[]>`
    select matched, kind_id, matched_by, matched_on
    from public.match_kinds(${kindIds}::uuid[], ${title}, ${main}, ${codes}::text[])`
  return row
}

/** The hand-checked kind of one CPV group. */
async function kindOf(group: string) {
  const [kind] = await sql<{ id: string }[]>`
    select id from public.kinds_of_work where origin = 'hand_checked' and cpv_groups = array[${group}]`
  return kind.id
}

/** The kinds of the hand-checked road Trade, in order. */
async function roadTrade() {
  const rows = await sql<{ kind_id: string }[]>`
    select kind_id from public.hand_checked_trade_kinds where trade = 'road' order by position`
  return rows.map((r) => r.kind_id)
}

const ROLLBACK = Symbol('rollback')

/** Run fn in a transaction that is always rolled back, so test kinds never outlive their test. */
async function rolledBack(fn: (tx: postgres.TransactionSql) => Promise<void>) {
  await sql
    .begin(async (tx) => {
      await fn(tx)
      throw ROLLBACK
    })
    .catch((e) => {
      if (e !== ROLLBACK) throw e
    })
}

/** The spec's named cases: Contract, its codes as the spec lists them, what it is, expected. */
const NAMED: [string, string[], string, boolean][] = [
  ['2005385879', ['45233252'], 'potholes on roads and streets', true],
  ['2005423305', ['45233252'], 'access road overhaul', true],
  ['2007951195', ['45223300', '45233161'], 'pavement, lighting, parking (the code wins over the exclude word)', true],
  ['2005509451', ['45453000'], 'gravel road repair', true],
  ['2005674934', ['45453000'], 'pavement repair, Vydūno g.', true],
  ['2005618449', ['45453000'], 'car park construction', true],
  ['2008188837', ['45213316'], 'footpath restoration', true],
  ['2007684287', ['45223300'], 'car park construction, Muitinės g.', true],
  ['2006856773', ['71240000', '71248000'], 'design services for a street overhaul', false],
  ['2008037304', ['45453000', '71240000'], '"priedangai" (shelter fit-out)', false],
  ['2008232221', ['45316110', '71242000'], 'street lighting renewal', false],
  ['2007353568', ['09310000'], 'electricity for street lighting', false],
  ['2006196604', ['45000000'], 'sewer manholes; the street is an address', false],
  ['2007540545', ['45232130'], 'surface-water drain repair', false],
  ['2008225486', ['45212100'], 'dog training ground', false],
  ['2007769749', ['45342000'], 'basketball court fence', false],
]

/** The spec's two made-up cases: a title and its one code. */
const MADE_UP: [string, string, boolean][] = [
  ['Žvyrkelių greideriavimas', '45000000', true],
  ['Kelionių organizavimo paslaugos', '63510000', false],
]

describe('the named cases against Kind 45233 (spec, Seam 1)', () => {
  it.each(NAMED)('%s carries the codes the spec lists', (id, codes) => {
    expect(contract(id).codes.map((code) => code.slice(0, 8))).toEqual(codes)
  })

  it.each(NAMED)('%s (%j, %s): match is %s', async (id, _codes, _what, expected) => {
    const c = contract(id)
    expect((await matchKind(roads, c.title, c.codes)).matched).toBe(expected)
  })

  it.each(MADE_UP)('made up: "%s" (%s): match is %s', async (title, code, expected) => {
    expect((await matchKind(roads, title, [code])).matched).toBe(expected)
  })

  it('2007951195 matches by its code, although its title holds the exclude word "apšvietimo"', async () => {
    const c = contract('2007951195')
    expect(await matchKind(roads, c.title, c.codes)).toEqual({ matched: true, matched_by: 'code', matched_on: '45233161-5' })
  })

  it('"Žvyrkelių greideriavimas" matches by the word as written', async () => {
    expect(await matchKind(roads, 'Žvyrkelių greideriavimas', ['45000000'])).toEqual({
      matched: true,
      matched_by: 'word',
      matched_on: 'Žvyrkelių',
    })
  })

  it('the exclude word "apšvietimo" removes a word match: road lighting under 45316110 does not match', async () => {
    expect((await matchKind(roads, 'Kelio apšvietimo įrengimas', ['45316110'])).matched).toBe(false)
  })

  it('2005385879, potholes on roads and streets, matches by its 45233 code', async () => {
    const c = contract('2005385879')
    expect(await matchKind(roads, c.title, c.codes)).toEqual({ matched: true, matched_by: 'code', matched_on: '45233252-0' })
  })

  it('2005509451, gravel road repair under 45453000, matches by its first road word as written', async () => {
    const c = contract('2005509451')
    expect(await matchKind(roads, c.title, c.codes)).toEqual({ matched: true, matched_by: 'word', matched_on: 'kelio' })
  })
})

// Cases that would embarrass gaus in front of a supplier. Under 45453000
// (general repair works, division 45) a road word is the only way to match.
describe('titles as buyers really write them', () => {
  const byWord = (title: string) => matchKind(roads, title, ['45453000'])

  it.each([
    ['ŠALIGATVIŲ REMONTAS', 'ŠALIGATVIŲ'],
    ['Žvyrkelių ir trinkelių dangos', 'Žvyrkelių'],
    ['TRINKELIŲ KLOJIMAS', 'TRINKELIŲ'],
    ['Automobilių Stovėjimo Aikštelė', 'Stovėjimo'],
  ])('matches in any letter case, Lithuanian letters included: "%s"', async (title, word) => {
    expect(await byWord(title)).toEqual({ matched: true, matched_by: 'word', matched_on: word })
  })

  it.each([
    ['„Kelio“ remontas', 'Kelio'],
    ['Remontas (kelio Nr. 5)', 'kelio'],
    ['Remontas: kelio, tako ir aikštelės', 'kelio'],
    ['Gatvių/kelių remontas', 'kelių'],
    ['Gatvių\\kelių remontas', 'kelių'],
    ['Gatvių~kelių remontas', 'kelių'],
    ['Gatvių<kelių> remontas', 'kelių'],
    ['Vytauto g.kelio remontas', 'kelio'],
    ['Remontas Nr.5kelio', 'kelio'],
    ['Gatvių–kelių remontas', 'kelių'],
    ['Gatvių-kelių remontas', 'kelių'],
    ['Pėsčiųjų tako.', 'tako'],
  ])('finds a road word whatever punctuation sits around it: "%s"', async (title, word) => {
    expect(await byWord(title)).toEqual({ matched: true, matched_by: 'word', matched_on: word })
  })

  it('finds a road word that an invisible zero-width space glues to the next word', async () => {
    expect(await byWord('Kelio​remontas')).toEqual({ matched: true, matched_by: 'word', matched_on: 'Kelio' })
  })

  it('finds a road word split by an invisible soft hyphen', async () => {
    expect(await byWord('Šaligat­vio remontas')).toEqual({ matched: true, matched_by: 'word', matched_on: 'Šaligatvio' })
  })

  it('finds a road word written with decomposed letters (s + combining caron)', async () => {
    expect(await byWord('Šaligatvio remontas')).toEqual({ matched: true, matched_by: 'word', matched_on: 'Šaligatvio' })
  })

  it.each([
    'Kelionių organizavimo paslaugos',
    'Latakų valymo darbai',
    'Kelmės rajono mokyklos remontas',
    'Takelažo darbai',
  ])('never matches a road stem inside another word: "%s"', async (title) => {
    expect((await byWord(title)).matched).toBe(false)
  })
})

describe('CPV codes as they really come', () => {
  const title = 'Kelio remontas'

  it.each([
    [['45233252-0'], '45233252-0'],
    [['45233252'], '45233252'],
    [[' 45233252 '], '45233252'],
    [['45233'], '45233'],
  ])('matches %j by code and names the code', async (codes, code) => {
    expect(await matchKind(roads, null, codes)).toEqual({ matched: true, matched_by: 'code', matched_on: code })
  })

  it.each([[['4523']], [['04523300']], [['45232999']]])('does not take %j for a 45233 code', async (codes) => {
    expect((await matchKind(roads, null, codes)).matched).toBe(false)
  })

  it('matches by any listed code, not only the main one', async () => {
    expect(await matchKind(roads, null, ['71240000', '45233142-6'])).toEqual({
      matched: true,
      matched_by: 'code',
      matched_on: '45233142-6',
    })
  })

  it('counts the main code as one of the codes even when the list leaves it out', async () => {
    expect(await matchKind(roads, null, [], '45233142')).toEqual({ matched: true, matched_by: 'code', matched_on: '45233142' })
  })

  it('takes the first listed code as the main one when no main code is given', async () => {
    expect(await matchKind(roads, title, ['45453000', '71240000'], null)).toEqual({
      matched: true,
      matched_by: 'word',
      matched_on: 'Kelio',
    })
    expect((await matchKind(roads, title, ['71240000', '45453000'], null)).matched).toBe(false)
  })

  it.each([
    ['no codes at all', null, null],
    ['an empty list', [], null],
    ['a list of blanks and nulls', ['', '  ', null], null],
    ['a blank main code', [], ' '],
  ])('does not match a road title with %s, and does not fail', async (_what, codes, main) => {
    expect(await matchKind(roads, title, codes as string[] | null, main)).toEqual({ matched: false, matched_by: null, matched_on: null })
  })

  it.each([
    ['no title', null],
    ['an empty title', ''],
  ])('still matches by code with %s', async (_what, t) => {
    expect((await matchKind(roads, t, ['45233142'])).matched).toBe(true)
  })
})

// A notice matches a Trade when it matches any of the Trade's kinds. These
// cases do not reuse the 18 verdicts, which hold for Kind 45233 alone.
describe('the road Trade', () => {
  it('2007540545, drain repair under 45232130: no match for Kind 45233, a match for Kind 45232, so a match for the Trade', async () => {
    const c = contract('2007540545')
    const drains = await kindOf('45232')
    expect((await matchKind(roads, c.title, c.codes)).matched).toBe(false)
    expect(await matchKind(drains, c.title, c.codes)).toEqual({ matched: true, matched_by: 'code', matched_on: '45232130-2' })
    expect(await matchKinds(await roadTrade(), c.title, c.codes)).toEqual({
      matched: true,
      kind_id: drains,
      matched_by: 'code',
      matched_on: '45232130-2',
    })
  })

  it('does not match a notice that none of its kinds match', async () => {
    expect(await matchKinds(await roadTrade(), 'Biuro popieriaus pirkimas', ['30197642-8'])).toEqual({
      matched: false,
      kind_id: null,
      matched_by: null,
      matched_on: null,
    })
  })

  it('reports a code match before a word match from another kind', async () => {
    // Kind 45233 catches "Kelio" by word; Kind 45232 catches 45232130 by code.
    expect(await matchKinds(await roadTrade(), 'Kelio pralaidos remontas', ['45232130-2'])).toEqual({
      matched: true,
      kind_id: await kindOf('45232'),
      matched_by: 'code',
      matched_on: '45232130-2',
    })
  })

  it('reports the kind listed first when several match the same way', async () => {
    const [pipes, drains] = [await kindOf('45231'), await kindOf('45232')]
    const codes = ['45232130-2', '45231300-8']
    expect((await matchKinds([drains, pipes], 'Vamzdynų remontas', codes)).kind_id).toBe(drains)
    expect((await matchKinds([pipes, drains], 'Vamzdynų remontas', codes)).kind_id).toBe(pipes)
  })

  it.each(['45231', '45232', '45236', '45234'])('Kind %s matches by code only, not by road words', async (group) => {
    const title = 'Kelio, šaligatvio, žvyrkelio, asfalto, trinkelių, tako ir stovėjimo aikštelės remontas'
    expect((await matchKind(await kindOf(group), title, ['45453000-7'])).matched).toBe(false)
  })

  it('matches nothing with no kinds', async () => {
    expect((await matchKinds([], 'Kelio remontas', ['45233142-6'])).matched).toBe(false)
  })

  it('refuses a kind that does not exist, rather than leave it out', async () => {
    const nowhere = '00000000-0000-4000-8000-000000000000'
    await expect(matchKinds([await kindOf('45233'), nowhere], 'Kelio remontas', ['45233142-6'])).rejects.toThrow(/no Kind of work/)
    await expect(matchKind(nowhere, 'Kelio remontas', ['45233142-6'])).rejects.toThrow(/no Kind of work/)
  })
})

// The road kinds have no code-exclude words, so these cases use a kind made up
// for the test: design services (79930), whose code also carries land surveying.
describe('code-exclude words', () => {
  const addKind = async (tx: postgres.TransactionSql) => {
    const [kind] = await tx<{ id: string }[]>`
      insert into public.kinds_of_work (name, cpv_groups, include_words, exclude_words, code_exclude_words, origin)
      values ('Projektavimas', array['79930'], array['projektavimas'], array['remontas'], array['matavimas'], 'model_proposed')
      returning id`
    return kind.id
  }

  it('drop a code match when the title holds one', async () => {
    await rolledBack(async (tx) => {
      const kind = await addKind(tx)
      expect((await matchKindIn(tx, kind, 'Žemės sklypo matavimo paslaugos', ['79930000-2'])).matched).toBe(false)
    })
  })

  it('leave a code match alone when the title holds none', async () => {
    await rolledBack(async (tx) => {
      const kind = await addKind(tx)
      expect(await matchKindIn(tx, kind, 'Pastato projekto parengimas', ['79930000-2'])).toEqual({
        matched: true,
        matched_by: 'code',
        matched_on: '79930000-2',
      })
    })
  })

  it('are not exclude words: an exclude word never drops a code match', async () => {
    await rolledBack(async (tx) => {
      const kind = await addKind(tx)
      expect((await matchKindIn(tx, kind, 'Pastato remonto projektas', ['79930000-2'])).matched_by).toBe('code')
    })
  })
})

// A kind's words can change after it is stored (the operator edits them, or a
// model-proposed kind is revised). Matching must follow the words it holds now.
describe('a kind whose words change', () => {
  const underGeneralRepair = (db: Db, title: string) => matchKindIn(db, roads, title, ['45453000'])

  it('stops matching by an include word it no longer holds, and starts on a new one', async () => {
    await rolledBack(async (tx) => {
      await tx`update public.kinds_of_work set include_words = array['gatvė'] where id = ${roads}`
      expect((await underGeneralRepair(tx, 'Kelio remontas')).matched).toBe(false)
      expect(await underGeneralRepair(tx, 'Gatvės remontas')).toEqual({ matched: true, matched_by: 'word', matched_on: 'Gatvės' })
    })
  })

  it('applies a new exclude word and a new code-exclude word', async () => {
    await rolledBack(async (tx) => {
      await tx`
        update public.kinds_of_work
        set exclude_words = array['remontas'], code_exclude_words = array['projektas']
        where id = ${roads}`
      expect((await underGeneralRepair(tx, 'Kelio remontas')).matched).toBe(false)
      expect((await matchKindIn(tx, roads, 'Gatvės projektas', ['45233142-6'])).matched).toBe(false)
    })
  })
})

describe('the checks over all 230 rows of the Jurbarkas file (spec, Seam 1)', () => {
  it('reads all 230 rows', () => {
    expect(contracts).toHaveLength(230)
  })

  it('every row with a 45233 code matches Kind 45233', async () => {
    const rows = contracts.filter((c) => c.codes.some((code) => code.startsWith('45233')))
    expect(rows.length).toBeGreaterThan(0)
    const missed: string[] = []
    for (const c of rows) if (!(await matchKind(roads, c.title, c.codes)).matched) missed.push(c.id)
    expect(missed).toEqual([])
  })

  it('no row whose main code is in division 71 matches through a word', async () => {
    const rows = contracts.filter((c) => c.codes[0]?.startsWith('71'))
    expect(rows.length).toBeGreaterThan(0)
    const byWord: string[] = []
    for (const c of rows) if ((await matchKind(roads, c.title, c.codes)).matched_by === 'word') byWord.push(c.id)
    expect(byWord).toEqual([])
  })
})
