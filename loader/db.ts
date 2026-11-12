// How the loader (run.ts) and the migrations (verified-db-url.ts) connect to the hosted
// database: TLS with the server's certificate checked against Supabase's root CAs and its
// hostname checked too (verify-full). `sslmode=require` would encrypt without checking
// who answers. The session pooler's certificate chains to "Supabase Root 2021 CA", which
// is in no public trust store, so the CA is committed: supabase/supabase-root-ca.crt.

/** Supabase's root CAs, committed beside the migrations. */
export const SUPABASE_CA_PATH = new URL('../supabase/supabase-root-ca.crt', import.meta.url)

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/** Whether a connection string points at this machine (the tests' database). */
const isLocal = (url: string) => LOCAL_HOSTS.has(new URL(url).hostname)

/** The `ssl` option for postgres.js: verify-full against `ca`, or no TLS on this machine. */
export function sslFor(url: string, ca: string): false | { ca: string; rejectUnauthorized: true } {
  return isLocal(url) ? false : { ca, rejectUnauthorized: true }
}

/**
 * The connection string with `sslmode=verify-full` and `sslrootcert` set, replacing any
 * sslmode it had, for clients that read TLS settings from the string (supabase db push).
 * The rest of the string, the percent-encoded password included, is kept as it is.
 */
export function verifiedUrl(url: string, caPath: string): string {
  if (isLocal(url)) return url
  const u = new URL(url)
  const params = new URLSearchParams(u.search)
  params.set('sslmode', 'verify-full')
  params.set('sslrootcert', caPath)
  return `${url.split('?')[0]}?${params}`
}
