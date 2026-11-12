// Writes $DATABASE_URL to stdout with certificate verification switched on
// (sslmode=verify-full, sslrootcert=supabase/supabase-root-ca.crt), for
// `supabase db push` in .github/workflows/migrate.yml. The caller captures the output and
// never prints it. On a bad string it fails without echoing it.
import { fileURLToPath } from 'node:url'
import { SUPABASE_CA_PATH, verifiedUrl } from './db.ts'

const url = process.env.DATABASE_URL
if (!url) {
  console.error('the database connection string is not set (DATABASE_URL)')
  process.exit(1)
}
try {
  process.stdout.write(verifiedUrl(url, fileURLToPath(SUPABASE_CA_PATH)))
} catch {
  console.error('the database connection string (DATABASE_URL) is not a valid URL')
  process.exit(1)
}
