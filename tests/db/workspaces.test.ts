import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import { afterAll, describe, expect, it } from 'vitest'
import { asAnon, asUser, authConnection, signUp as signUpWith } from './users'

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

const addTrade = async (user: string, name: string) => {
  const workspace = await workspaceOf(user)
  const [row] = await asUser(sql, user, (tx) => tx<{ id: string }[]>`
    insert into public.trades (workspace_id, name) values (${workspace}, ${name}) returning id`)
  return row.id
}

const tradesSeenBy = (user: string) =>
  asUser(sql, user, (tx) => tx<{ name: string }[]>`select name from public.trades order by name`)

describe('Trades', () => {
  it('are named, and seen only by their own Workspace', async () => {
    const ana = await signUp()
    const ben = await signUp()
    await addTrade(ana, 'Keliai ir gatvės')
    await addTrade(ben, 'Vamzdynai')
    await addTrade(ben, 'Aikštelės')

    expect(await tradesSeenBy(ana)).toEqual([{ name: 'Keliai ir gatvės' }])
    expect(await tradesSeenBy(ben)).toEqual([{ name: 'Aikštelės' }, { name: 'Vamzdynai' }])
  })

  it('can be renamed and removed by their own Workspace', async () => {
    const ana = await signUp()
    const trade = await addTrade(ana, 'Keliai')

    await asUser(sql, ana, (tx) => tx`update public.trades set name = 'Keliai ir gatvės' where id = ${trade}`)
    expect(await tradesSeenBy(ana)).toEqual([{ name: 'Keliai ir gatvės' }])

    await asUser(sql, ana, (tx) => tx`delete from public.trades where id = ${trade}`)
    expect(await tradesSeenBy(ana)).toEqual([])
  })

  it('cannot be added, renamed, moved or removed by a User of another Workspace', async () => {
    const ana = await signUp()
    const ben = await signUp()
    const bens = await workspaceOf(ben)
    const bensTrade = await addTrade(ben, 'Vamzdynai')
    const anasTrade = await addTrade(ana, 'Keliai')

    await expect(asUser(sql, ana, (tx) => tx`
      insert into public.trades (workspace_id, name) values (${bens}, 'Įkelta')`,
    )).rejects.toThrow(/row-level security/)
    const renamed = await asUser(sql, ana, (tx) => tx`update public.trades set name = 'Pakeista' where id = ${bensTrade}`)
    const removed = await asUser(sql, ana, (tx) => tx`delete from public.trades where id = ${bensTrade}`)
    expect([renamed.count, removed.count]).toEqual([0, 0])
    await expect(asUser(sql, ana, (tx) => tx`
      update public.trades set workspace_id = ${bens} where id = ${anasTrade}`,
    )).rejects.toThrow(/permission denied/)

    expect(await tradesSeenBy(ben)).toEqual([{ name: 'Vamzdynai' }])
    expect(await tradesSeenBy(ana)).toEqual([{ name: 'Keliai' }])
  })

  it('hold Kinds of work that only their own Workspace can see or change', async () => {
    const ana = await signUp()
    const ben = await signUp()
    const anasTrade = await addTrade(ana, 'Keliai')
    const [roads, pipes, other] = [randomUUID(), randomUUID(), randomUUID()]
    const kindsSeenBy = (user: string) =>
      asUser(sql, user, (tx) => tx<{ trade_id: string; kind_id: string }[]>`
        select trade_id, kind_id from public.trade_kinds order by kind_id`)

    await asUser(sql, ana, (tx) => tx`
      insert into public.trade_kinds (trade_id, kind_id) values (${anasTrade}, ${roads}), (${anasTrade}, ${pipes})`)
    const anas = [roads, pipes].sort().map((kind_id) => ({ trade_id: anasTrade, kind_id }))
    expect(await kindsSeenBy(ana)).toEqual(anas)
    expect(await kindsSeenBy(ben)).toEqual([])

    await expect(asUser(sql, ben, (tx) => tx`
      insert into public.trade_kinds (trade_id, kind_id) values (${anasTrade}, ${other})`,
    )).rejects.toThrow(/row-level security/)
    const removed = await asUser(sql, ben, (tx) => tx`delete from public.trade_kinds where trade_id = ${anasTrade}`)
    expect(removed.count).toBe(0)
    expect(await kindsSeenBy(ana)).toEqual(anas)

    await asUser(sql, ana, (tx) => tx`delete from public.trades where id = ${anasTrade}`)
    expect(await kindsSeenBy(ana)).toEqual([])
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
  })
})
