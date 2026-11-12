import { describe, expect, it } from 'vitest'
import { feedTimeToUtc, kindOf, mapNotice } from '../loader/notices.ts'

// A made-up record in the feed's shape (field names and value types as the feed sends them).
const record = {
  id: 8399723,
  title: 'Kelio Nr. 4 remonto darbai',
  caName: 'Jurbarko rajono savivaldybės administracija (PV)',
  datePublished: '01-07-2026 10:00:00',
  tenderSubmissionDeadline: '30-07-2026 09:45:00',
  clarificationPeriodEnd: null,
  estimatedValue: '16528.93',
  status: 'Bid submission',
  cpvCodes: '45233252, 45233141',
  procedure: 'Open',
  procurementType: 'Works',
  evaluationMechanism: 'Lowest Price',
  contractAwardedInLots: false,
  cftInvolves: 'notice.type.publicContract',
}

describe('a feed record as a Notice', () => {
  it('keeps what the screens need, with times in UTC', () => {
    expect(mapNotice(record)).toEqual({
      id: 8399723,
      kind: 'tender',
      title: 'Kelio Nr. 4 remonto darbai',
      buyer_name: 'Jurbarko rajono savivaldybės administracija (PV)',
      published_at: '2026-07-01T07:00:00.000Z',
      deadline_at: '2026-07-30T06:45:00.000Z',
      status: 'Bid submission',
      cpv_main: '45233252',
      cpv_codes: ['45233252', '45233141'],
      procedure_type: 'Open',
      evaluation: 'Lowest Price',
      in_lots: false,
      feed_type: 'notice.type.publicContract',
      estimated_value: 16528.93,
      date_invalid: false,
    })
  })

  it('takes a Market consultation reply date from the deadline field', () => {
    const row = mapNotice({
      ...record,
      cftInvolves: null,
      procedure: 'Preliminary Market Consultation',
      status: 'Proposal Submission',
      evaluationMechanism: null,
      tenderSubmissionDeadline: '20-11-2026 16:00:00',
    })
    expect(row.kind).toBe('market_consultation')
    expect(row.deadline_at).toBe('2026-11-20T14:00:00.000Z')
    expect(row.evaluation).toBeNull()
  })

  it('reads a split into lots', () => {
    expect(mapNotice({ ...record, contractAwardedInLots: true }).in_lots).toBe(true)
    expect(mapNotice({ ...record, contractAwardedInLots: 'true' }).in_lots).toBe(true)
    expect(mapNotice({ ...record, contractAwardedInLots: 'false' }).in_lots).toBe(false)
    expect(mapNotice({ ...record, contractAwardedInLots: null }).in_lots).toBeNull()
    expect(mapNotice({ ...record, contractAwardedInLots: 'banana' }).in_lots).toBeNull()
  })

  it('treats a value of 0 as not stated', () => {
    expect(mapNotice({ ...record, estimatedValue: '0' }).estimated_value).toBeNull()
    expect(mapNotice({ ...record, estimatedValue: 0 }).estimated_value).toBeNull()
    expect(mapNotice({ ...record, estimatedValue: null }).estimated_value).toBeNull()
    expect(mapNotice({ ...record, estimatedValue: 'n/a' }).estimated_value).toBeNull()
  })

  it('reads one CPV code, and no CPV codes', () => {
    expect(mapNotice({ ...record, cpvCodes: '45233252' })).toMatchObject({ cpv_main: '45233252', cpv_codes: ['45233252'] })
    expect(mapNotice({ ...record, cpvCodes: null })).toMatchObject({ cpv_main: null, cpv_codes: [] })
    expect(mapNotice({ ...record, cpvCodes: ' , ' })).toMatchObject({ cpv_main: null, cpv_codes: [] })
  })

  it('keeps a far-future DPS deadline', () => {
    const row = mapNotice({ ...record, tenderSubmissionDeadline: '01-01-2041 09:00:00' })
    expect(row.deadline_at).toBe('2041-01-01T07:00:00.000Z')
    expect(row.date_invalid).toBe(false)
  })

  it('keeps a record with a garbage date, without the date, and marks it', () => {
    const row = mapNotice({ ...record, datePublished: '14-06-0028 00:00:00' })
    expect(row.published_at).toBeNull()
    expect(row.date_invalid).toBe(true)
    expect(row.deadline_at).toBe('2026-07-30T06:45:00.000Z')
  })

  it('strips NUL from every text field, because Postgres refuses it', () => {
    const row = mapNotice({ ...record, title: 'a\u0000b', caName: 'c\u0000', status: 'Bid\u0000 submission', cpvCodes: '4523\u00003000' })
    expect(row.title).toBe('ab')
    expect(row.buyer_name).toBe('c')
    expect(row.status).toBe('Bid submission')
    expect(row.cpv_codes).toEqual(['45233000'])
  })

  it('keeps a title that spells out a backslash escape', () => {
    expect(mapNotice({ ...record, title: 'Kodas \\u0000 tekste' }).title).toBe('Kodas \\u0000 tekste')
  })

  it('stores empty text as missing', () => {
    const row = mapNotice({ ...record, title: '', caName: '   ', status: '' })
    expect(row).toMatchObject({ title: null, buyer_name: null, status: null })
  })
})

// The feed's dates are "DD-MM-YYYY HH:MM:SS", day first, in Vilnius time.
describe('a feed time', () => {
  it('is read day first, in Vilnius summer time (UTC+3)', () => {
    expect(feedTimeToUtc('30-07-2026 09:45:00')).toEqual({ utc: '2026-07-30T06:45:00.000Z', invalid: false })
  })

  it('is read in Vilnius winter time (UTC+2)', () => {
    expect(feedTimeToUtc('02-12-2025 09:30:00')).toEqual({ utc: '2025-12-02T07:30:00.000Z', invalid: false })
  })

  it('crosses midnight into the previous UTC day', () => {
    expect(feedTimeToUtc('01-01-2027 00:30:00')).toEqual({ utc: '2026-12-31T22:30:00.000Z', invalid: false })
  })

  it('is read on both sides of the change to summer time (29 March 2026, 03:00 local)', () => {
    expect(feedTimeToUtc('29-03-2026 02:59:00').utc).toBe('2026-03-29T00:59:00.000Z')
    expect(feedTimeToUtc('29-03-2026 04:00:00').utc).toBe('2026-03-29T01:00:00.000Z')
  })

  it('passes a missing time through without marking it invalid', () => {
    expect(feedTimeToUtc(null)).toEqual({ utc: null, invalid: false })
    expect(feedTimeToUtc(undefined)).toEqual({ utc: null, invalid: false })
    expect(feedTimeToUtc('')).toEqual({ utc: null, invalid: false })
  })

  it('marks garbage years invalid (the feed has sent year 0028)', () => {
    expect(feedTimeToUtc('14-06-0028 00:00:00')).toEqual({ utc: null, invalid: true })
    expect(feedTimeToUtc('01-01-2099 00:00:00')).toEqual({ utc: null, invalid: true })
  })

  it('accepts far-future years when the field allows them (DPS deadlines reach the 2040s)', () => {
    expect(feedTimeToUtc('01-01-2035 00:00:00', 2046)).toEqual({ utc: '2034-12-31T22:00:00.000Z', invalid: false })
  })

  it('marks unparseable text invalid', () => {
    expect(feedTimeToUtc('garbage')).toEqual({ utc: null, invalid: true })
    expect(feedTimeToUtc('2026-07-30 09:45:00')).toEqual({ utc: null, invalid: true })
  })

  it('marks impossible calendar dates invalid', () => {
    expect(feedTimeToUtc('31-02-2026 00:00:00')).toEqual({ utc: null, invalid: true })
    expect(feedTimeToUtc('10-10-2026 25:00:00')).toEqual({ utc: null, invalid: true })
  })
})

// The kind of a Notice comes from two feed fields: cftInvolves (the notice type) and
// procedure. The pairs below are the ones seen in the live feed on 12 November 2026
// (12,102 sampled records); the counts are how often each pair appeared.
describe('the kind of a Notice', () => {
  it.each([
    // plain tenders: a public contract or a framework agreement, by any ordinary procedure
    ['notice.type.publicContract', 'Open', 'tender'], // 3,692
    ['notice.type.publicContract', 'Simplified', 'tender'], // 2,238
    ['notice.type.publicContract', 'Simplified Open', 'tender'], // 1,627
    ['notice.type.publicContract', 'Negotiated with prior call for competition', 'tender'], // 233
    ['notice.type.frameworkAgreement', 'Open', 'tender'], // 222
    ['notice.type.publicContract', 'Specific Contract', 'tender'], // 292
    ['notice.type.publicContract', 'Negotiated without prior publication', 'tender'], // 214
    ['notice.type.frameworkAgreement', 'Competitive with negotiation', 'tender'], // 19
    // Market consultations: no notice type, and their own procedure
    [null, 'Preliminary Market Consultation', 'market_consultation'], // 1,833
    // dynamic purchasing systems and the specific contracts inside them
    ['notice.type.dps', 'Dynamic Purchasing System', 'dps'], // 245
    ['notice.type.dps', 'DPS Specific Contract', 'dps_contract'], // 1,205
    // a specific contract inside a qualification system
    ['notice.type.dps', 'cft.procedure.type.qs.specific.contract', 'qualification_system'], // 7
  ])('%s with procedure "%s" is %s', (cftInvolves, procedure, kind) => {
    expect(kindOf({ cftInvolves, procedure })).toBe(kind)
  })

  it('a qualification system notice is a qualification system, however its procedure is spelled', () => {
    expect(kindOf({ cftInvolves: 'notice.type.dps', procedure: 'Qualification System' })).toBe('qualification_system')
    expect(kindOf({ cftInvolves: null, procedure: 'cft.procedure.type.qs' })).toBe('qualification_system')
  })

  it('a kind the loader does not recognise is unknown', () => {
    expect(kindOf({ cftInvolves: 'notice.type.somethingNew', procedure: 'Open' })).toBe('unknown')
    expect(kindOf({ cftInvolves: null, procedure: 'Open' })).toBe('unknown')
    expect(kindOf({ cftInvolves: 'notice.type.dps', procedure: 'Something new' })).toBe('unknown')
    expect(kindOf({})).toBe('unknown')
  })
})
