import { describe, expect, it } from 'vitest'
import { redact, runSummary } from '../loader/notices.ts'

describe('the run summary', () => {
  const summary = runSummary({
    walk: { total: 83102, skipped: 1, holes: [41], newestPublished: '2026-11-12T20:55:00.000Z' },
    open: { tender: 1258, market_consultation: 115, dps: 200, dps_contract: 185, qualification_system: 0, unknown: 3 },
    unrecognised: [{ feed_type: 'notice.type.new', procedure_type: 'Open', count: 3 }],
    seconds: 171,
  })

  it('gives the number of open Notices of each kind', () => {
    expect(summary).toContain('| Plain tenders | 1258 |')
    expect(summary).toContain('| Market consultations | 115 |')
    expect(summary).toContain('| Dynamic purchasing systems | 200 |')
    expect(summary).toContain('| Specific contracts inside a DPS | 185 |')
    expect(summary).toContain('| Qualification systems | 0 |')
    expect(summary).toContain('| Unknown | 3 |')
  })

  it('says what the walk did, with the newest publication in Vilnius time', () => {
    expect(summary).toContain('83102 records')
    expect(summary).toContain('1 skipped')
    expect(summary).toContain('page 41')
    expect(summary).toContain('2026-11-12 22:55 Vilnius')
    expect(summary).toContain('171 s')
  })

  it('names the feed values it did not recognise, so the mapping can be extended', () => {
    expect(summary).toContain('notice.type.new / Open: 3')
  })
})

describe('an error message', () => {
  it('has the key, the connection string and its password masked', () => {
    const url = 'postgres://postgres.abc:s3cr%40t@pooler.example.com:5432/postgres'
    const message = `failed with key k-123 at ${url}; password s3cr@t; encoded s3cr%40t`
    const out = redact(message, ['k-123', url])
    expect(out).not.toContain('k-123')
    expect(out).not.toContain('s3cr@t')
    expect(out).not.toContain('s3cr%40t')
    expect(out).not.toContain(url)
    expect(out).toContain('failed with key ***')
  })

  it('is left alone when there is nothing to mask', () => {
    expect(redact('plain', [undefined, ''])).toBe('plain')
  })
})
