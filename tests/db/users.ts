import { randomUUID } from 'node:crypto'
import postgres from 'postgres'
import type { Sql, TransactionSql } from 'postgres'

// Supabase Auth writes auth.users as supabase_auth_admin. In the test image
// only the superuser supabase_admin may take that role, so sign-ups go through
// a connection of their own.
export const authConnection = (url: string) => postgres(url, { max: 1, username: 'supabase_admin' })

// Sign up the way Supabase Auth does: a row inserted into auth.users as
// supabase_auth_admin, with that role's search_path. Returns the new User's id.
export async function signUp(auth: Sql, email = `${randomUUID()}@example.lt`): Promise<string> {
  const id = randomUUID()
  await auth.begin(async (tx) => {
    await tx`set local role supabase_auth_admin`
    await tx`set local search_path = auth`
    await tx`
      insert into users (id, aud, role, email, created_at, updated_at)
      values (${id}, 'authenticated', 'authenticated', ${email}, now(), now())`
  })
  return id
}

// Delete a User the way Supabase Auth does (the dashboard, the admin API): the
// auth.users row goes, as supabase_auth_admin.
export async function deleteUser(auth: Sql, id: string): Promise<void> {
  await auth.begin(async (tx) => {
    await tx`set local role supabase_auth_admin`
    await tx`set local search_path = auth`
    await tx`delete from users where id = ${id}`
  })
}

// Run queries as a signed-in User, the way the Data API does: as the
// authenticated role, with the User's JWT claims. The local image's auth.uid()
// reads request.jwt.claim.sub and the hosted one reads request.jwt.claims, so
// both are set. Everything runs in one transaction that commits on success.
export function asUser<T>(sql: Sql, userId: string, run: (tx: TransactionSql) => Promise<T>) {
  return sql.begin(async (tx) => {
    const claims = JSON.stringify({ sub: userId, role: 'authenticated' })
    await tx`
      select set_config('request.jwt.claims', ${claims}, true),
             set_config('request.jwt.claim.sub', ${userId}, true)`
    await tx`set local role authenticated`
    return run(tx)
  })
}

// Run queries as a visitor who is not signed in: the anon role, no claims.
export function asAnon<T>(sql: Sql, run: (tx: TransactionSql) => Promise<T>) {
  return sql.begin(async (tx) => {
    await tx`set local role anon`
    return run(tx)
  })
}
