import { readFileSync } from 'node:fs'
import postgres from 'postgres'
import { afterAll, describe, expect, it } from 'vitest'
import { COPY } from '../../src/copy/register'

// How Kinds of work are stored, the five road kinds and the hand-checked road
// Trade (spec, "The road Kinds of work"), and who may read and write them.

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error('TEST_DATABASE_URL is not set. Run the tests with: npm test')
const sql = postgres(url, { max: 1 })
afterAll(() => sql.end())

const ROLLBACK = Symbol('rollback')

/** Run fn in a transaction that is always rolled back. */
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

type Kind = {
  id: string
  name: string
  cpv_groups: string[]
  include_words: string[]
  exclude_words: string[]
  code_exclude_words: string[]
  origin: string
  contract_count: number | null
  example_title: string | null
  example_contract: string | null
}

/** The kinds of the hand-checked road Trade, in order. */
const roadKinds = () => sql<Kind[]>`
  select k.* from public.hand_checked_trade_kinds t
  join public.kinds_of_work k on k.id = t.kind_id
  where t.trade = 'road'
  order by t.position`

/** The spec's table: CPV group and the count shown. */
const ROAD: [string, number][] = [
  ['45233', 1468],
  ['45231', 404],
  ['45232', 308],
  ['45236', 94],
  ['45234', 48],
]

describe('the hand-checked road Trade', () => {
  it('is the five road kinds, the 5-digit CPV groups, in the order of the spec', async () => {
    const kinds = await roadKinds()
    expect(kinds.map((k) => k.cpv_groups)).toEqual(ROAD.map(([group]) => [group]))
    expect(kinds.every((k) => k.origin === 'hand_checked')).toBe(true)
  })

  it('Kind 45233 has include words with the nine stems, the exclude word apšvietim, and no code-exclude words', async () => {
    const [kind] = await sql<{ include: string[]; exclude: string[]; code_exclude: string[] }[]>`
      select
        array(select public.lt_stem(w) from unnest(include_words) w) as include,
        array(select public.lt_stem(w) from unnest(exclude_words) w) as exclude,
        code_exclude_words as code_exclude
      from public.kinds_of_work where origin = 'hand_checked' and cpv_groups = array['45233']`
    expect([...kind.include].sort()).toEqual(
      ['kel', 'šaligatv', 'žvyr', 'žvyrkel', 'asfalt', 'trinkel', 'tak', 'stovėjim', 'parkavim'].sort(),
    )
    expect(kind.include).not.toContain('gatv')
    expect(kind.exclude).toEqual(['apšvietim'])
    expect(kind.code_exclude).toEqual([])
  })

  it('the other four kinds have no words, so they match by code only', async () => {
    const others = (await roadKinds()).filter((k) => k.cpv_groups[0] !== '45233')
    expect(others).toHaveLength(4)
    for (const k of others) {
      expect([k.include_words, k.exclude_words, k.code_exclude_words]).toEqual([[], [], []])
    }
  })

  it('names each kind with its Lithuanian name from the copy register, pending approval', async () => {
    for (const k of await roadKinds()) {
      const entry = COPY[`kind.${k.cpv_groups[0]}` as keyof typeof COPY]
      expect(entry, `copy register entry kind.${k.cpv_groups[0]}`).toBeDefined()
      expect(k.name).toBe(entry.lt)
      expect(entry.approved).toBe(false)
    }
  })
})

// The pull of 11 November 2026 (handoff-from-claude/data/market.json).
type MarketRow = {
  dok_id: string
  dok_sut_obj_pav: string
  dok_sut_verte: number
  dok_sudarymo_data: string
  cpv_codes: string | null
  dok_sut_tipas: string
}
const market = JSON.parse(
  readFileSync(new URL('../../handoff-from-claude/data/market.json', import.meta.url), 'utf8'),
) as { A_contracts: MarketRow[] }

/** The spec's count: tendered Contracts of 3,000 EUR or more signed in the 12
 * months to 11 November 2026, with any code in the group. A Small purchase is
 * one the source marks as imported (type 8) or one under 3,000 EUR;
 * amendments (type 5) are not Contracts. */
const counted = market.A_contracts.filter(
  (r) =>
    r.dok_sudarymo_data >= '2025-11-11' &&
    r.dok_sudarymo_data <= '2026-11-11' &&
    r.dok_sut_tipas !== '8' &&
    r.dok_sut_tipas !== '5' &&
    r.dok_sut_verte >= 3000,
)
const inGroup = (r: MarketRow, group: string) =>
  (r.cpv_codes ?? '').split(';').some((code) => code.trim().startsWith(group))

describe('the fixed count and example of each road kind', () => {
  it('stores the counts the spec shows', async () => {
    expect((await roadKinds()).map((k) => [k.cpv_groups[0], k.contract_count])).toEqual(ROAD)
  })

  it.each(ROAD)('the pull gives Kind %s the count %i by the spec\'s rule', (group, count) => {
    expect(counted.filter((r) => inGroup(r, group))).toHaveLength(count)
  })

  it('takes each example title, word for word, from a counted Contract in its group', async () => {
    for (const k of await roadKinds()) {
      const source = counted.find((r) => r.dok_id === k.example_contract)
      expect(source, `Contract ${k.example_contract}`).toBeDefined()
      expect(inGroup(source!, k.cpv_groups[0])).toBe(true)
      expect(k.example_title).toBe(source!.dok_sut_obj_pav)
    }
  })
})

describe('who may read and write Kinds of work', () => {
  it.each(['anon', 'authenticated'])('%s reads the hand-checked kinds and the road Trade', async (role) => {
    await rolledBack(async (tx) => {
      await tx.unsafe(`set local role ${role}`)
      const kinds = await tx`select id from public.kinds_of_work where origin = 'hand_checked'`
      const trade = await tx`select kind_id from public.hand_checked_trade_kinds where trade = 'road'`
      expect(kinds).toHaveLength(5)
      expect(trade).toHaveLength(5)
    })
  })

  it.each(['anon', 'authenticated'])('%s matches a notice against the road Trade', async (role) => {
    await rolledBack(async (tx) => {
      const ids = (await tx`select kind_id from public.hand_checked_trade_kinds where trade = 'road'`).map((r) => r.kind_id)
      await tx.unsafe(`set local role ${role}`)
      const [m] = await tx`select matched from public.match_kinds(${ids}::uuid[], 'Kelio remontas', '45233142-6', '{}')`
      expect(m.matched).toBe(true)
    })
  })

  it.each(['anon', 'authenticated'])('%s does not see a model-proposed kind', async (role) => {
    await rolledBack(async (tx) => {
      const [{ id }] = await tx`
        insert into public.kinds_of_work (name, cpv_groups, origin)
        values ('Valymas', array['90910'], 'model_proposed') returning id`
      await tx.unsafe(`set local role ${role}`)
      expect(await tx`select 1 from public.kinds_of_work where id = ${id}`).toHaveLength(0)
      await expect(tx`select * from public.match_kind(${id}, 'Valymas', '90910000', '{}')`).rejects.toThrow(/no Kind of work/)
    })
  })

  it.each([
    ['anon', `insert into public.kinds_of_work (name, cpv_groups, origin) values ('X', array['45233'], 'hand_checked')`],
    ['anon', `update public.kinds_of_work set include_words = array['gatvė']`],
    ['anon', `delete from public.kinds_of_work`],
    ['authenticated', `insert into public.kinds_of_work (name, cpv_groups, origin) values ('X', array['45233'], 'model_proposed')`],
    ['authenticated', `update public.kinds_of_work set include_words = array['gatvė']`],
    ['authenticated', `delete from public.kinds_of_work`],
    ['anon', `insert into public.hand_checked_trade_kinds (trade, kind_id, position) select 'road', id, 9 from public.kinds_of_work limit 1`],
    ['authenticated', `update public.hand_checked_trade_kinds set position = position + 10`],
    ['authenticated', `delete from public.hand_checked_trade_kinds`],
  ])('%s may not write: %s', async (role, statement) => {
    await rolledBack(async (tx) => {
      await tx.unsafe(`set local role ${role}`)
      await expect(tx.unsafe(statement)).rejects.toThrow(/permission denied/)
    })
  })
})

describe('what a Kind of work may hold', () => {
  const insert = (tx: postgres.TransactionSql, kind: Record<string, unknown>) =>
    tx`insert into public.kinds_of_work ${tx({ name: 'Bandymas', cpv_groups: ['45233'], origin: 'model_proposed', ...kind })}`

  it('takes a valid model-proposed kind', async () => {
    await rolledBack(async (tx) => {
      await insert(tx, { cpv_groups: ['45233', '45453'], include_words: ['kelias'], exclude_words: ['apšvietimas'] })
    })
  })

  it.each([
    ['no CPV group', { cpv_groups: [] }],
    ['a 4-digit group', { cpv_groups: ['4523'] }],
    ['an 8-digit code for a group', { cpv_groups: ['45233000'] }],
    ['a group that is not digits', { cpv_groups: ['4523x'] }],
    ['a null group', { cpv_groups: ['45233', null] }],
    ['two words as one include word', { include_words: ['kelio remontas'] }],
    ['a hyphenated include word', { include_words: ['kelio-gatvės'] }],
    ['an empty exclude word', { exclude_words: [''] }],
    ['a code-exclude word with punctuation', { code_exclude_words: ['matavimas.'] }],
    ['a null include word', { include_words: [null] }],
    ['an empty name', { name: ' ' }],
    ['an origin other than hand-checked or model-proposed', { origin: 'imported' }],
  ])('refuses %s', async (_what, kind) => {
    await rolledBack(async (tx) => {
      await expect(insert(tx, kind)).rejects.toThrow(/violates/)
    })
  })
})
