// The open-notice loader: walks the procurement office's cft-details-export feed and
// stores every Notice in public.notices. Copied from the old gaus loader
// (src/ingest/live.ts) and adapted: page size 1,000, times stored in UTC, the kind of
// each Notice stored, the value kept out of the public table. Entry point: run.ts.

import type { Sql } from 'postgres'

export type FeedRecord = Record<string, unknown>
export type FetchPage = (pageSize: number, pageNum: number) => Promise<FeedRecord[]>

export const KINDS = [
  'tender',
  'market_consultation',
  'dps',
  'dps_contract',
  'qualification_system',
  'unknown',
] as const
export type Kind = (typeof KINDS)[number]

const YEAR_MIN = 2000
// Publication and award dates: up to 5 years ahead. Deadlines: up to 20, because DPS and
// framework deadlines legitimately reach the 2040s (old loader, first real pull).
const yearMax = () => new Date().getUTCFullYear() + 5
export const deadlineYearMax = () => new Date().getUTCFullYear() + 20

const VILNIUS = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Vilnius',
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** How far Vilnius wall-clock time is ahead of UTC at this instant, in milliseconds. */
function vilniusOffset(instant: number): number {
  const p = Object.fromEntries(VILNIUS.formatToParts(new Date(instant)).map((x) => [x.type, x.value]))
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - instant
}

/**
 * A feed time ("DD-MM-YYYY HH:MM:SS", day first, Vilnius time) as a UTC instant.
 * A missing time is null and valid. Junk, years outside 2000..maxYear (the feed has sent
 * year 0028) and impossible dates are null and invalid: one such value would otherwise
 * abort a whole batch in Postgres.
 */
export function feedTimeToUtc(
  s: unknown,
  maxYear = yearMax(),
): { utc: string | null; invalid: boolean } {
  if (s == null || s === '') return { utc: null, invalid: false }
  const m = typeof s === 'string' ? /^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2}):(\d{2})/.exec(s) : null
  if (!m) return { utc: null, invalid: true }
  const [day, month, year, hour, minute, second] = m.slice(1).map(Number)
  if (year < YEAR_MIN || year > maxYear) return { utc: null, invalid: true }
  const wall = Date.UTC(year, month - 1, day, hour, minute, second)
  const back = new Date(wall)
  if (
    back.getUTCDate() !== day ||
    back.getUTCMonth() !== month - 1 ||
    back.getUTCHours() !== hour ||
    back.getUTCMinutes() !== minute ||
    back.getUTCSeconds() !== second
  ) {
    return { utc: null, invalid: true }
  }
  // The offset depends on the instant, which depends on the offset: take it at the wall
  // time read as UTC, then once more at the first answer. Two passes settle every
  // time except the hour the clocks go back, where either reading is a real instant.
  const first = wall - vilniusOffset(wall)
  return { utc: new Date(wall - vilniusOffset(first)).toISOString(), invalid: false }
}

// The notice types the feed gives in cftInvolves for an ordinary call for tenders.
const TENDER_TYPES = new Set(['notice.type.publicContract', 'notice.type.frameworkAgreement'])

/**
 * The kind of a Notice. The procedure names the special kinds; cftInvolves names an
 * ordinary tender. Seen in the feed on 12 November 2026: "Preliminary Market
 * Consultation" (cftInvolves null), "Dynamic Purchasing System" and "DPS Specific
 * Contract" (both notice.type.dps), "cft.procedure.type.qs.specific.contract"
 * (notice.type.dps, a specific contract inside a qualification system), and every
 * other procedure under notice.type.publicContract or notice.type.frameworkAgreement.
 */
export function kindOf(rec: FeedRecord): Kind {
  const procedure = typeof rec.procedure === 'string' ? rec.procedure.trim() : ''
  if (procedure === 'Preliminary Market Consultation') return 'market_consultation'
  if (procedure === 'Dynamic Purchasing System') return 'dps'
  if (procedure === 'DPS Specific Contract') return 'dps_contract'
  if (/qualification system|\bqs\b/i.test(procedure)) return 'qualification_system'
  if (typeof rec.cftInvolves === 'string' && TENDER_TYPES.has(rec.cftInvolves)) return 'tender'
  // A new notice type, or a procedure under notice.type.dps the loader has not seen.
  return 'unknown'
}

/** One row of public.notices, plus the value, which is stored apart (loader.notice_values). */
export type Notice = {
  id: number
  kind: Kind
  title: string | null
  buyer_name: string | null
  published_at: string | null
  deadline_at: string | null
  status: string | null
  cpv_main: string | null
  cpv_codes: string[]
  procedure_type: string | null
  evaluation: string | null
  in_lots: boolean | null
  feed_type: string | null
  estimated_value: number | null
  date_invalid: boolean
}

/** Text as written, or null when it is missing or blank. */
const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() !== '' ? v : null)
/** A short coded value (status, procedure), trimmed, or null. */
const code = (v: unknown): string | null => text(v)?.trim() ?? null

/** Map one feed record to a Notice. The record must have a numeric id (see walkNotices). */
export function mapNotice(raw: FeedRecord): Notice {
  // Postgres refuses NUL in text and jsonb. Strip the \u0000 escape from every string
  // field in one pass, so one poisoned record cannot abort a batch through any column.
  const rec = JSON.parse(JSON.stringify(raw).replace(/\\u0000/g, '')) as FeedRecord
  const published = feedTimeToUtc(rec.datePublished)
  // For a Market consultation this field holds the reply date.
  const deadline = feedTimeToUtc(rec.tenderSubmissionDeadline, deadlineYearMax())

  const codes = typeof rec.cpvCodes === 'string' ? rec.cpvCodes.split(',').map((c) => c.trim()).filter(Boolean) : []

  // "0" is the feed's placeholder for "not stated", never a real estimate of 0 EUR.
  const value = rec.estimatedValue == null ? NaN : Number(String(rec.estimatedValue))
  const lots = String(rec.contractAwardedInLots)

  return {
    id: rec.id as number,
    kind: kindOf(rec),
    title: text(rec.title),
    buyer_name: text(rec.caName),
    published_at: published.utc,
    deadline_at: deadline.utc,
    status: code(rec.status),
    cpv_main: codes[0] ?? null,
    cpv_codes: codes,
    procedure_type: code(rec.procedure),
    evaluation: code(rec.evaluationMechanism),
    in_lots: lots === 'true' ? true : lots === 'false' ? false : null,
    feed_type: code(rec.cftInvolves),
    estimated_value: Number.isFinite(value) && value > 0 ? value : null,
    date_invalid: published.invalid || deadline.invalid,
  }
}

// The public.notices columns the loader writes, with their types for jsonb_to_recordset.
// first_seen_at and updated_at are the table's own.
const NOTICE_COLUMNS = [
  ['id', 'bigint'],
  ['kind', 'text'],
  ['title', 'text'],
  ['buyer_name', 'text'],
  ['published_at', 'timestamptz'],
  ['deadline_at', 'timestamptz'],
  ['status', 'text'],
  ['cpv_main', 'text'],
  ['cpv_codes', 'text[]'],
  ['procedure_type', 'text'],
  ['evaluation', 'text'],
  ['in_lots', 'boolean'],
  ['feed_type', 'text'],
  ['date_invalid', 'boolean'],
] as const

const names = NOTICE_COLUMNS.map(([n]) => n)
const changing = names.filter((n) => n !== 'id')

// One statement per page, with the page as a single jsonb parameter (no bind-parameter
// cap to chunk around). A stored row is rewritten only when something in it changed, so
// an hourly walk of ~83,000 rows writes only what the feed changed.
const UPSERT_NOTICES = `
  insert into public.notices (${names.join(', ')})
  select ${names.join(', ')}
  from jsonb_to_recordset($1::text::jsonb) as r(${NOTICE_COLUMNS.map(([n, t]) => `${n} ${t}`).join(', ')})
  on conflict (id) do update set
    ${changing.map((n) => `${n} = excluded.${n}`).join(', ')},
    updated_at = now()
  where (${changing.map((n) => `notices.${n}`).join(', ')})
    is distinct from (${changing.map((n) => `excluded.${n}`).join(', ')})`

/** Store one page of feed records. */
async function storePage(sql: Sql, records: FeedRecord[]): Promise<number> {
  const notices = records.map(mapNotice)
  await sql.unsafe(UPSERT_NOTICES, [JSON.stringify(notices)])
  return notices.length
}

export const PAGE_SIZE = 1_000

/** Walk the whole feed from page 1 and store every Notice. */
export async function walkNotices(sql: Sql, fetchPage: FetchPage): Promise<{ total: number }> {
  let total = 0
  for (let pageNum = 1; ; pageNum++) {
    const page = await fetchPage(PAGE_SIZE, pageNum)
    if (page.length === 0) break
    total += await storePage(sql, page)
  }
  return { total }
}
