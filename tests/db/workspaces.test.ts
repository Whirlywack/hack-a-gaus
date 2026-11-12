import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import type { TransactionSql } from 'postgres'
import { afterAll, describe, expect, it } from 'vitest'
import { asAnon, asUser, authConnection, deleteUser, signUp as signUpWith } from './users'

// ADR-0004: everything a person creates belongs to a Workspace, and each
// Workspace's data is visible only to its own Users (user story 77).

const url = process.env.TEST_DATABASE_URL
if (!url) throw new Error('TEST_DATABASE_URL is not set. Run the tests with: npm test')
const sql = postgres(url, { max: 1 })
const auth = authConnection(url)
afterAll(() => Promise.all([sql.end(), auth.end()]))

const signUp = (email?: string) => signUpWith(auth, email)

const workspaceCount = async () => {
  const [row] = await sql<{ n: number }[]>`select count(*)::int as n from public.workspaces`
  return row.n
}

// The one Workspace a User belongs to, as that User sees it.
const workspaceOf = async (user: string) => {
  const [row] = await asUser(sql, user, (tx) => tx<{ id: string }[]>`select id from public.workspaces`)
  return row.id
}

describe('sign-up', () => {
  it('creates one Workspace with the new User as its only User', async () => {
    const before = await workspaceCount()
    const user = await signUp()
    expect(await workspaceCount()).toBe(before + 1)

    const seen = await asUser(sql, user, (tx) => tx<{ workspace_id: string; user_id: string }[]>`
      select w.id as workspace_id, m.user_id
      from public.workspaces w join public.workspace_members m on m.workspace_id = w.id`)
    expect(seen).toEqual([{ workspace_id: expect.any(String), user_id: user }])

    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from public.workspace_members where workspace_id = ${seen[0].workspace_id}`
    expect(n).toBe(1)
  })

  it('gives each sign-up its own Workspace, which no other User can see', async () => {
    const ana = await signUp()
    const ben = await signUp()
    const workspacesOf = (user: string) =>
      asUser(sql, user, (tx) => tx<{ id: string }[]>`select id from public.workspaces`)
    const membersSeenBy = (user: string) =>
      asUser(sql, user, (tx) => tx<{ user_id: string }[]>`select user_id from public.workspace_members`)

    const [anas] = await workspacesOf(ana)
    const [bens] = await workspacesOf(ben)
    expect(anas.id).not.toBe(bens.id)
    expect(await workspacesOf(ana)).toEqual([anas])
    expect(await workspacesOf(ben)).toEqual([bens])
    expect(await membersSeenBy(ana)).toEqual([{ user_id: ana }])
    expect(await membersSeenBy(ben)).toEqual([{ user_id: ben }])
  })

  it('copies the e-mail address into no public table', async () => {
    const email = `sign-up-${Date.now()}@example.lt`
    await signUp(email)

    const tables = await sql<{ name: string }[]>`
      select table_name as name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'`
    expect(tables.map((t) => t.name)).toContain('workspaces')
    for (const { name } of tables) {
      const [{ n }] = await sql<{ n: number }[]>`
        select count(*)::int as n from ${sql('public.' + name)} t
        where strpos(lower(to_jsonb(t)::text), ${email}) > 0`
      expect(n, `public.${name} holds the e-mail address`).toBe(0)
    }
  })

  it('is the only way into a Workspace: a User cannot create, join or leave one', async () => {
    const ana = await signUp()
    const ben = await signUp()
    const anas = await workspaceOf(ana)
    const bens = await workspaceOf(ben)

    const attempts = [
      () => asUser(sql, ana, (tx) => tx`insert into public.workspaces default values`),
      () => asUser(sql, ana, (tx) => tx`
        insert into public.workspace_members (user_id, workspace_id) values (${ana}, ${bens})`),
      () => asUser(sql, ana, (tx) => tx`
        update public.workspace_members set workspace_id = ${bens} where user_id = ${ana}`),
      () => asUser(sql, ana, (tx) => tx`delete from public.workspace_members where user_id = ${ana}`),
      () => asUser(sql, ana, (tx) => tx`delete from public.workspaces where id = ${anas}`),
    ]
    for (const attempt of attempts) await expect(attempt()).rejects.toThrow(/permission denied/)
    expect(await workspaceOf(ana)).toBe(anas)
  })
})

type Stage = 'watching' | 'preparing' | 'submitted' | null

const follow = async (user: string, notice: number, stage: Stage) => {
  const workspace = await workspaceOf(user)
  await asUser(sql, user, (tx) => tx`
    insert into public.follows (workspace_id, notice_id, stage) values (${workspace}, ${notice}, ${stage})`)
}

const followsSeenBy = (user: string) =>
  asUser(sql, user, (tx) => tx<{ notice_id: number; stage: Stage }[]>`
    select notice_id::int, stage from public.follows order by notice_id`)

describe('Follows', () => {
  it('cannot be read by a User of another Workspace', async () => {
    const ana = await signUp()
    const ben = await signUp()
    await follow(ana, 101, 'watching')
    await follow(ben, 101, 'submitted')
    await follow(ben, 202, 'preparing')

    expect(await followsSeenBy(ana)).toEqual([{ notice_id: 101, stage: 'watching' }])
    expect(await followsSeenBy(ben)).toEqual([
      { notice_id: 101, stage: 'submitted' },
      { notice_id: 202, stage: 'preparing' },
    ])
  })

  it('can be moved through the Stages and removed by its own Workspace', async () => {
    const ana = await signUp()
    await follow(ana, 404, 'watching')

    await asUser(sql, ana, (tx) => tx`update public.follows set stage = 'preparing' where notice_id = 404`)
    expect(await followsSeenBy(ana)).toEqual([{ notice_id: 404, stage: 'preparing' }])

    await asUser(sql, ana, (tx) => tx`delete from public.follows where notice_id = 404`)
    expect(await followsSeenBy(ana)).toEqual([])
  })

  it('can change nothing but its Stage, and keeps the time it was made', async () => {
    const ana = await signUp()
    const anas = await workspaceOf(ana)
    await follow(ana, 707, 'watching')

    const attempts = [
      () => asUser(sql, ana, (tx) => tx`
        insert into public.follows (workspace_id, notice_id, stage, created_at)
        values (${anas}, 708, 'watching', '2020-01-01')`),
      () => asUser(sql, ana, (tx) => tx`update public.follows set notice_id = 709 where notice_id = 707`),
      () => asUser(sql, ana, (tx) => tx`update public.follows set created_at = '2020-01-01' where notice_id = 707`),
    ]
    for (const attempt of attempts) await expect(attempt()).rejects.toThrow(/permission denied/)
    expect(await followsSeenBy(ana)).toEqual([{ notice_id: 707, stage: 'watching' }])
  })

  it('cannot be added to another Workspace', async () => {
    const ana = await signUp()
    const ben = await signUp()
    const bens = await workspaceOf(ben)

    await expect(asUser(sql, ana, (tx) => tx`
      insert into public.follows (workspace_id, notice_id, stage) values (${bens}, 505, 'watching')`,
    )).rejects.toThrow(/row-level security/)
    expect(await followsSeenBy(ben)).toEqual([])
  })

  it('cannot be changed, moved or removed by a User of another Workspace', async () => {
    const ana = await signUp()
    const ben = await signUp()
    await follow(ana, 606, 'watching')
    await follow(ben, 606, 'watching')
    const bens = await workspaceOf(ben)

    const changed = await asUser(sql, ana, (tx) => tx`
      update public.follows set stage = 'submitted' where workspace_id = ${bens}`)
    const removed = await asUser(sql, ana, (tx) => tx`delete from public.follows where workspace_id = ${bens}`)
    expect([changed.count, removed.count]).toEqual([0, 0])
    await expect(asUser(sql, ana, (tx) => tx`
      update public.follows set workspace_id = ${bens} where notice_id = 606`,
    )).rejects.toThrow(/permission denied/)

    expect(await followsSeenBy(ben)).toEqual([{ notice_id: 606, stage: 'watching' }])
    expect(await followsSeenBy(ana)).toEqual([{ notice_id: 606, stage: 'watching' }])
  })

  // A Public tender's Follow carries a Stage; a Market consultation's has none.
  it('carries the Stage Watching, Preparing or Submitted, or no Stage', async () => {
    const ana = await signUp()
    await follow(ana, 701, 'watching')
    await follow(ana, 702, 'preparing')
    await follow(ana, 703, 'submitted')
    await follow(ana, 704, null)
    expect((await followsSeenBy(ana)).map((f) => f.stage)).toEqual(['watching', 'preparing', 'submitted', null])

    await expect(follow(ana, 705, 'won' as Stage)).rejects.toThrow(/check constraint/)
  })
})

// Setup (#12) ends by turning the ticked Kinds of work into the Workspace's one
// Trade, in a single call. Returns the new Trade's id.
const createFirstTrade = async (user: string, name: string, kinds: string[] = [randomUUID()]) => {
  const [row] = await asUser(sql, user, (tx) => tx<{ id: string }[]>`
    select public.create_first_trade(${name}, ${kinds}::uuid[]) as id`)
  return row.id
}

const tradesSeenBy = (user: string) =>
  asUser(sql, user, (tx) => tx<{ workspace_id: string; name: string }[]>`
    select workspace_id, name from public.trades order by name`)

const kindsSeenBy = (user: string) =>
  asUser(sql, user, (tx) => tx<{ trade_id: string; kind_id: string }[]>`
    select trade_id, kind_id from public.trade_kinds order by kind_id`)

describe('Trades', () => {
  it('are created by setup as one named Trade with its Kinds of work, seen only by its own Workspace', async () => {
    const ana = await signUp()
    const ben = await signUp()
    const [roads, pipes] = [randomUUID(), randomUUID()]
    const anasTrade = await createFirstTrade(ana, 'Keliai ir gatvės', [roads, pipes, roads])
    const bensTrade = await createFirstTrade(ben, 'Vamzdynai', [pipes])

    expect(await tradesSeenBy(ana)).toEqual([{ workspace_id: await workspaceOf(ana), name: 'Keliai ir gatvės' }])
    expect(await tradesSeenBy(ben)).toEqual([{ workspace_id: await workspaceOf(ben), name: 'Vamzdynai' }])
    expect(await kindsSeenBy(ana)).toEqual([roads, pipes].sort().map((kind_id) => ({ trade_id: anasTrade, kind_id })))
    expect(await kindsSeenBy(ben)).toEqual([{ trade_id: bensTrade, kind_id: pipes }])
  })

  it('are created by setup only once per Workspace', async () => {
    const ana = await signUp()
    await createFirstTrade(ana, 'Keliai')

    await expect(createFirstTrade(ana, 'Antra')).rejects.toThrow(/already has a Trade/)
    expect((await tradesSeenBy(ana)).map((t) => t.name)).toEqual(['Keliai'])
  })

  it('need a name and at least one Kind of work', async () => {
    const ana = await signUp()

    await expect(createFirstTrade(ana, ' ')).rejects.toThrow(/trades_name_check/)
    await expect(createFirstTrade(ana, 'Keliai', [])).rejects.toThrow(/needs a Kind of work/)
    expect(await tradesSeenBy(ana)).toEqual([])
    expect(await kindsSeenBy(ana)).toEqual([])
  })

  // The Account overlay (#21) has no way to edit Trades, and nothing else writes them.
  it('cannot be added, renamed, moved or removed directly, nor their Kinds of work, in any Workspace', async () => {
    const ana = await signUp()
    const ben = await signUp()
    const [anas, bens] = [await workspaceOf(ana), await workspaceOf(ben)]
    const anasTrade = await createFirstTrade(ana, 'Keliai')
    const bensTrade = await createFirstTrade(ben, 'Vamzdynai')
    const anaTries = (run: (tx: TransactionSql) => Promise<unknown>) => () => asUser(sql, ana, run)

    const attempts = [[anas, anasTrade], [bens, bensTrade]].flatMap(([workspace, trade]) => [
      anaTries((tx) => tx`insert into public.trades (workspace_id, name) values (${workspace}, 'Antra')`),
      anaTries((tx) => tx`update public.trades set name = 'Pakeista' where id = ${trade}`),
      anaTries((tx) => tx`update public.trades set workspace_id = ${bens} where id = ${trade}`),
      anaTries((tx) => tx`delete from public.trades where id = ${trade}`),
      anaTries((tx) => tx`insert into public.trade_kinds (trade_id, kind_id) values (${trade}, ${randomUUID()})`),
      anaTries((tx) => tx`delete from public.trade_kinds where trade_id = ${trade}`),
    ])
    for (const attempt of attempts) await expect(attempt()).rejects.toThrow(/permission denied/)

    expect((await tradesSeenBy(ana)).map((t) => t.name)).toEqual(['Keliai'])
    expect((await tradesSeenBy(ben)).map((t) => t.name)).toEqual(['Vamzdynai'])
    expect(await kindsSeenBy(ana)).toHaveLength(1)
    expect(await kindsSeenBy(ben)).toHaveLength(1)
  })
})

// The rows of every public table that names this Workspace, and the Kinds of
// work in this Trade: what a deleted Workspace must leave behind (nothing).
const leftBehind = async (workspace: string, trade: string) => {
  const tables = await sql<{ name: string }[]>`
    select table_name as name from information_schema.columns
    where table_schema = 'public' and column_name = 'workspace_id'
    union select 'workspaces'`
  const rows: Record<string, number> = {}
  for (const { name } of tables) {
    const column = name === 'workspaces' ? 'id' : 'workspace_id'
    const [{ n }] = await sql<{ n: number }[]>`
      select count(*)::int as n from ${sql('public.' + name)} where ${sql(column)} = ${workspace}`
    if (n > 0) rows[name] = n
  }
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from public.trade_kinds where trade_id = ${trade}`
  if (n > 0) rows.trade_kinds = n
  return rows
}

describe('deleting a User', () => {
  it('deletes their Workspace and everything in it when they were its last User', async () => {
    const ana = await signUp()
    const anas = await workspaceOf(ana)
    const trade = await createFirstTrade(ana, 'Keliai')
    await follow(ana, 901, 'watching')
    expect(await leftBehind(anas, trade)).toEqual({
      workspaces: 1, workspace_members: 1, trades: 1, follows: 1, trade_kinds: 1,
    })

    await deleteUser(auth, ana)
    expect(await leftBehind(anas, trade)).toEqual({})
  })

  it('keeps a Workspace that still has a User, and deletes it with the last one', async () => {
    const ana = await signUp()
    const ben = await signUp()
    const anas = await workspaceOf(ana)
    const bens = await workspaceOf(ben)
    // No screen adds a second User yet, so the database owner moves Ben in.
    await sql`delete from public.workspace_members where user_id = ${ben}`
    expect(await leftBehind(bens, randomUUID())).toEqual({})
    await sql`insert into public.workspace_members (user_id, workspace_id) values (${ben}, ${anas})`
    await follow(ana, 902, 'preparing')

    await deleteUser(auth, ana)
    expect(await workspaceOf(ben)).toBe(anas)
    expect(await followsSeenBy(ben)).toEqual([{ notice_id: 902, stage: 'preparing' }])

    await deleteUser(auth, ben)
    expect(await leftBehind(anas, randomUUID())).toEqual({})
  })
})

describe('Workspace data (ADR-0004)', () => {
  it('belongs to a Workspace, never directly to a User', async () => {
    const referringToUsers = await sql<{ name: string }[]>`
      select conrelid::regclass::text as name from pg_constraint
      where contype = 'f' and confrelid = 'auth.users'::regclass and connamespace = 'public'::regnamespace`
    const userColumns = await sql<{ name: string }[]>`
      select table_name as name from information_schema.columns
      where table_schema = 'public' and column_name = 'user_id'`
    expect(referringToUsers.map((t) => t.name)).toEqual(['workspace_members'])
    expect(userColumns.map((t) => t.name)).toEqual(['workspace_members'])
  })

  it('is kept behind row-level security wherever it names a Workspace', async () => {
    const tables = await sql<{ name: string; rls: boolean }[]>`
      select c.relname as name, c.relrowsecurity as rls
      from pg_class c join information_schema.columns col
        on col.table_schema = 'public' and col.table_name = c.relname and col.column_name = 'workspace_id'
      where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
      order by c.relname`
    expect(tables.map((t) => t.name)).toEqual(expect.arrayContaining(['follows', 'trades', 'workspace_members']))
    expect(tables.filter((t) => !t.rls)).toEqual([])
  })
})

describe('a visitor who is not signed in', () => {
  const tables = ['workspaces', 'workspace_members', 'trades', 'trade_kinds', 'follows']

  it.each(tables)('cannot read or write %s', async (table) => {
    await signUp()
    await expect(asAnon(sql, (tx) => tx`select * from ${sql('public.' + table)}`)).rejects.toThrow(/permission denied/)
    await expect(asAnon(sql, (tx) => tx`delete from ${sql('public.' + table)}`)).rejects.toThrow(/permission denied/)
  })

  it('cannot add a Follow or a Trade', async () => {
    const workspace = await workspaceOf(await signUp())
    await expect(asAnon(sql, (tx) => tx`
      insert into public.follows (workspace_id, notice_id) values (${workspace}, 808)`,
    )).rejects.toThrow(/permission denied/)
    await expect(asAnon(sql, (tx) => tx`
      insert into public.trades (workspace_id, name) values (${workspace}, 'Svetima')`,
    )).rejects.toThrow(/permission denied/)
    await expect(asAnon(sql, (tx) => tx`
      select public.create_first_trade('Svetima', array[${randomUUID()}]::uuid[])`,
    )).rejects.toThrow(/permission denied/)
  })
})
