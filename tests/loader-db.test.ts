import { X509Certificate } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SUPABASE_CA_PATH, sslFor, verifiedUrl } from '../loader/db.ts'

const HOSTED = 'postgresql://postgres.abcdefghij:s3cr%40t%2Fx@aws-0-eu-central-1.pooler.supabase.com:5432/postgres'
const LOCAL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

describe('the connection to the hosted database', () => {
  it('verifies the server certificate against the given CA, hostname included', () => {
    expect(sslFor(HOSTED, 'PEM')).toEqual({ ca: 'PEM', rejectUnauthorized: true })
  })

  it('uses no TLS on this machine', () => {
    expect(sslFor(LOCAL, 'PEM')).toBe(false)
    expect(sslFor('postgres://u:p@localhost/db', 'PEM')).toBe(false)
  })
})

describe('the connection string for supabase db push', () => {
  it('asks for verify-full with the CA file, in place of any sslmode it had', () => {
    const out = new URL(verifiedUrl(`${HOSTED}?sslmode=require`, '/work/supabase/supabase-root-ca.crt'))
    expect(out.searchParams.getAll('sslmode')).toEqual(['verify-full'])
    expect(out.searchParams.get('sslrootcert')).toBe('/work/supabase/supabase-root-ca.crt')
  })

  it('keeps the percent-encoded password, host and database exactly', () => {
    const out = verifiedUrl(HOSTED, '/ca.crt')
    expect(out.startsWith(`${HOSTED}?`)).toBe(true)
  })

  it('leaves a local connection string alone', () => {
    expect(verifiedUrl(LOCAL, '/ca.crt')).toBe(LOCAL)
  })
})

// The pooler's chain ends in "Supabase Root 2021 CA" (SHA-256 below, seen on
// aws-0-eu-central-1.pooler.supabase.com on 12 November 2026), the same certificate the
// Supabase CLI bundles as prod-ca-2021. The 2025 root is bundled for a rotation.
describe('the committed Supabase root CAs', () => {
  const certs = readFileSync(SUPABASE_CA_PATH, 'utf8')
    .split(/(?=-----BEGIN CERTIFICATE-----)/)
    .filter((p) => p.includes('BEGIN CERTIFICATE'))
    .map((pem) => new X509Certificate(pem))

  it('hold the root the session pooler chains to, and the 2025 root', () => {
    expect(certs.map((c) => c.fingerprint256)).toEqual([
      '80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA',
      '5F:9B:77:95:1A:7A:A1:30:3F:9B:58:EE:A9:BF:A8:9E:35:8C:FD:C1:5F:97:86:FF:10:D4:93:0A:72:2C:9A:E2',
    ])
    for (const c of certs) expect(c.ca).toBe(true)
  })
})
