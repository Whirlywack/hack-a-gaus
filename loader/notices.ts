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

// The value, from the same page parameter, into the table no client role can read.
const UPSERT_VALUES = `
  insert into loader.notice_values (notice_id, estimated_value)
  select id, estimated_value
  from jsonb_to_recordset($1::text::jsonb) as r(id bigint, estimated_value numeric)
  on conflict (notice_id) do update set estimated_value = excluded.estimated_value
  where notice_values.estimated_value is distinct from excluded.estimated_value`

const FEED_URL = 'https://viesiejipirkimai.lt/epps-integration/api/cft-details-export'
const ATTEMPTS = 5

/**
 * The feed answers with a bare list of records. Anything else (an error object, an
 * envelope) must fail loudly and must not be retried: read as a page it would look
 * empty and end the walk early.
 */
export function assertPageShape(body: unknown, pageNum: number): asserts body is FeedRecord[] {
  if (!Array.isArray(body)) throw new Error(`feed page ${pageNum}: the answer is not a list of records`)
}

/**
 * Fetch pages of the feed. Network failures, server errors (5xx), rate limits (429) and
 * unreadable JSON are retried, 5 attempts in all, waiting 1, 2, 4 and 8 seconds; any
 * other HTTP error fails at once (401 is a refused key). Each request times out after 60
 * seconds: the feed has hung for days with a valid key before. Errors never hold the key.
 */
export function feedFetcher({
  key,
  fetch: fetchFn = fetch,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}: {
  key: string | undefined
  fetch?: (url: string, init: RequestInit) => Promise<Response>
  sleep?: (ms: number) => Promise<void>
}): FetchPage {
  if (!key) throw new Error('the feed key is not set (VPT_API_KEY)')
  return async (pageSize, pageNum) => {
    let last = ''
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      if (attempt > 0) await sleep(Math.min(30_000, 1000 * 2 ** (attempt - 1)))
      let res: Response
      try {
        res = await fetchFn(FEED_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', apiKey: key },
          body: JSON.stringify({ pageSize, pageNum }),
          signal: AbortSignal.timeout(60_000),
        })
      } catch (e) {
        last = e instanceof Error ? `${e.name}: ${e.message}` : 'network error'
        continue
      }
      if (!res.ok) {
        if (res.status >= 500 || res.status === 429) {
          last = `HTTP ${res.status}`
          continue
        }
        const why = res.status === 401 ? ' (the feed key was refused)' : ''
        throw new Error(`feed page ${pageNum}: HTTP ${res.status}${why}, not retried`)
      }
      let body: unknown
      try {
        body = await res.json()
      } catch {
        last = 'unreadable JSON'
        continue
      }
      // Outside the retries: a changed shape is not a passing fault.
      assertPageShape(body, pageNum)
      return body
    }
    throw new Error(`feed page ${pageNum} failed after ${ATTEMPTS} attempts: ${last}`)
  }
}

/** How many Notices of each kind are open now (public.notice_is_open). Every kind is listed. */
export async function openNoticesByKind(sql: Sql): Promise<Record<Kind, number>> {
  const rows = await sql<{ kind: Kind; open: number }[]>`
    select kind, count(*)::int as open
    from public.notices n
    where public.notice_is_open(n)
    group by kind`
  const counts = Object.fromEntries(KINDS.map((k) => [k, 0])) as Record<Kind, number>
  for (const r of rows) counts[r.kind] = r.open
  return counts
}

// The feed caps a page at 1,000 records (HTTP 400 above that, since 23 October 2026).
export const PAGE_SIZE = 1_000
// How old the newest publication date may be when the walk ends. The real feed's tail
// is minutes old; an older tail means the walk was cut short by a run of spurious empty
// pages, and finishing would quietly drop every Notice past the cut.
const FRESHNESS_DAYS = 7
// From the first empty page, look this many pages ahead before believing it is the end.
const PROBE_STEPS = [1, 2, 4, 8, 16]
// More malformed records than this in one walk means the feed's shape has changed.
const MALFORMED_LIMIT = 100
// About 2 million records, some 25 times today's 83,000: a backstop against a feed that
// keeps repeating pages instead of ending.
const MAX_PAGES = 2_000

export type WalkResult = { total: number; skipped: number; holes: number[]; newestPublished: string | null }

const vilniusDay = (instant: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Vilnius' }).format(instant)

/**
 * Walk the whole feed from page 1, store every Notice, and record the walk in
 * loader.walks. Ported from the old loader's walkLive, with the same rules:
 *
 * - An empty page is not trusted as the end. Pages +1, +2, +4, +8 and +16 are probed; if
 *   one has data, the empty run was spurious: its pages are re-fetched once (still-empty
 *   ones are reported as holes, healed by the next walk) and the walk goes on.
 * - When every probe is empty, the walk finishes only if the newest publication date seen
 *   is at most 7 days old (Vilnius days). Otherwise it refuses, and records nothing.
 * - Records without a numeric id are skipped and counted; more than 100 stops the walk.
 * - A run of 16+ spurious empty pages while the tail is fresh ends the walk early. The
 *   pages beyond are picked up by the next hourly walk (accepted trade-off, old loader).
 */
export async function walkNotices(
  sql: Sql,
  fetchPage: FetchPage,
  { maxPages = MAX_PAGES }: { maxPages?: number } = {},
): Promise<WalkResult> {
  const startedAt = new Date()
  const acc = { total: 0, skipped: 0, newest: null as string | null }
  const holes: number[] = []

  const store = async (records: FeedRecord[]) => {
    const good = records.filter((r) => typeof r.id === 'number' && Number.isSafeInteger(r.id) && r.id > 0)
    const bad = records.length - good.length
    if (bad > 0) {
      acc.skipped += bad
      // Field names only: the log never carries a record's contents.
      const example = records.find((r) => !good.includes(r))
      console.warn(`skipped ${bad} record(s) without a numeric id; first has fields: ${Object.keys(example ?? {}).join(', ')}`)
      if (acc.skipped > MALFORMED_LIMIT) {
        throw new Error(
          `walkNotices: ${acc.skipped} malformed records (missing or non-numeric id) in one walk; ` +
            'the feed has probably changed shape, so the walk stops',
        )
      }
    }
    // One id twice in a page would make the upsert touch a row twice and fail: last wins.
    const byId = new Map<unknown, FeedRecord>()
    for (const r of good) byId.set(r.id, r)
    const notices = [...byId.values()].map(mapNotice)
    if (notices.length > 0) {
      const page = JSON.stringify(notices)
      await sql.begin(async (tx) => {
        await tx.unsafe(UPSERT_NOTICES, [page])
        await tx.unsafe(UPSERT_VALUES, [page])
      })
    }
    acc.total += notices.length
    for (const n of notices) {
      if (n.published_at != null && (acc.newest == null || n.published_at > acc.newest)) acc.newest = n.published_at
    }
  }

  let pageNum = 1
  for (;;) {
    if (pageNum > maxPages) {
      throw new Error(`walkNotices: more than ${maxPages} pages; the feed may be repeating pages instead of ending`)
    }
    const page = await fetchPage(PAGE_SIZE, pageNum)
    if (page.length > 0) {
      await store(page)
      // Always step to the next page after data: probes start from the first EMPTY page,
      // or a geometric step from a short page could hop over a page with data.
      pageNum++
      continue
    }

    let jumped = false
    for (const step of PROBE_STEPS) {
      const probe = await fetchPage(PAGE_SIZE, pageNum + step)
      if (probe.length === 0) continue
      // The empty run was spurious. Re-fetch each page in it once before going on: the
      // steps skip pages (+3 when +4 hits), and a page empty once may answer again.
      for (let gap = pageNum; gap < pageNum + step; gap++) {
        const again = await fetchPage(PAGE_SIZE, gap)
        if (again.length > 0) await store(again)
        else holes.push(gap)
      }
      await store(probe)
      pageNum += step + 1
      jumped = true
      break
    }
    if (jumped) continue

    // Every probe is empty: the end, if the tail is fresh. Publication dates are compared
    // as Vilnius calendar days, as the feed writes them.
    const cutoff = vilniusDay(new Date(Date.now() - FRESHNESS_DAYS * 864e5))
    if (acc.newest == null || vilniusDay(new Date(acc.newest)) < cutoff) {
      throw new Error(
        `walkNotices: refusing to finish: the newest publication date seen (${acc.newest ?? 'none'}) is stale, ` +
          `more than ${FRESHNESS_DAYS} days old, so the walk has probably been cut short`,
      )
    }
    break
  }

  await sql`
    insert into loader.walks (started_at, records, skipped, holes, newest_published_at)
    values (${startedAt}, ${acc.total}, ${acc.skipped}, string_to_array(${holes.join(',')}, ',')::integer[], ${acc.newest})`
  if (holes.length > 0) console.warn(`pages still empty after one re-fetch (the next walk heals them): ${holes.join(', ')}`)
  return { total: acc.total, skipped: acc.skipped, holes, newestPublished: acc.newest }
}
