// TEMPORARY (ticket #6): sample the open-notice feed and print only field names,
// distinct values and counts of the kind and status fields. Never prints record
// contents, the key, or anything else from a record. Writes to no database.
// Removed once the kind mapping is verified.

const BASE = 'https://viesiejipirkimai.lt/epps-integration/api/cft-details-export'
const SIZE = 1000
const key = process.env.VPT_API_KEY
if (!key) throw new Error('VPT_API_KEY is not set')

async function page(n) {
  let last
  for (let a = 0; a < 4; a++) {
    if (a) await new Promise((r) => setTimeout(r, 2000 * a))
    try {
      const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', apiKey: key },
        body: JSON.stringify({ pageSize: SIZE, pageNum: n }),
        signal: AbortSignal.timeout(90_000),
      })
      if (!res.ok) { last = `HTTP ${res.status}`; if (res.status < 500 && res.status !== 429) break; continue }
      const body = await res.json()
      if (!Array.isArray(body)) throw new Error(`page ${n}: not an array`)
      return body
    } catch (e) { last = e instanceof Error ? e.name : 'error' }
  }
  throw new Error(`page ${n} failed: ${last}`)
}

const pages = new Map()
const get = async (n) => {
  if (!pages.has(n)) { pages.set(n, await page(n)); console.log(`page ${n}: ${pages.get(n).length} records`) }
  return pages.get(n)
}

// Head, then find the last non-empty page (exponential, then binary search), then the tail.
await get(1); await get(2)
let lo = 2, hi = 64
while ((await get(hi)).length > 0) { lo = hi; hi *= 2; if (hi > 1024) throw new Error('no end found') }
while (hi - lo > 1) { const mid = (lo + hi) >> 1; if ((await get(mid)).length > 0) lo = mid; else hi = mid }
const last = lo
for (let n = Math.max(3, last - 9); n <= last; n++) await get(n)
console.log(`last non-empty page: ${last}`)

const byId = new Map()
let noId = 0
for (const [, recs] of pages) for (const r of recs) { if (r && r.id != null) byId.set(r.id, r); else noId++ }
const recs = [...byId.values()]
console.log(`\nsampled records (unique ids): ${recs.length}; without id: ${noId}; pages fetched: ${pages.size}`)

const day = /^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}:\d{2}:\d{2})/
const local = (s) => { const m = typeof s === 'string' ? day.exec(s) : null; return m ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}` : null }
const nowLocal = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Vilnius', dateStyle: 'short', timeStyle: 'medium' }).format(new Date())

const count = (rows, f) => { const c = new Map(); for (const r of rows) { const k = f(r); c.set(k, (c.get(k) ?? 0) + 1) } return [...c].sort((a, b) => b[1] - a[1]) }
const show = (title, entries) => { console.log(`\n## ${title}`); for (const [k, n] of entries) console.log(`  ${String(k).slice(0, 80)}: ${n}`) }

// Field names with their value types and non-null counts.
const fields = new Map()
for (const r of recs) for (const [k, v] of Object.entries(r)) {
  const t = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v
  const f = fields.get(k) ?? {}; f[t] = (f[t] ?? 0) + 1; fields.set(k, f)
}
console.log('\n## field names: value type counts')
for (const [k, f] of [...fields].sort()) console.log(`  ${k}: ${JSON.stringify(f)}`)

const ENUMS = ['cftInvolves', 'procedure', 'status', 'directive', 'procurementType', 'evaluationMechanism',
  'contractAwardedInLots', 'awardPerItem', 'aboveThreshold', 'onlineInterestAllowed', 'activeCycle']
for (const f of ENUMS) show(`distinct ${f}`, count(recs, (r) => JSON.stringify(r[f] ?? null)))

const combo = (r) => `${r.cftInvolves ?? 'null'} | ${r.procedure ?? 'null'}`
const open = recs.filter((r) => { const d = local(r.tenderSubmissionDeadline); return d != null && d > nowLocal })
console.log(`\nVilnius now: ${nowLocal}; records with a future tenderSubmissionDeadline: ${open.length}`)

show('cftInvolves | procedure (all sampled)', count(recs, combo))
show('cftInvolves | procedure (future deadline)', count(open, combo))
show('cftInvolves | procedure | status (future deadline)', count(open, (r) => `${combo(r)} | ${r.status ?? 'null'}`))
show('status (future deadline)', count(open, (r) => r.status ?? 'null'))

// How many titles in each kind carry each marker word. Counts only, no titles.
const MARKERS = {
  'rinkos konsultacij': /rinkos konsultacij/i,
  'konsultacij': /konsultacij/i,
  'kvalifikacijos sistem': /kvalifikacijos sistem/i,
  'dinamin': /dinamin/i,
  'DPS (word)': /\bDPS\b/,
  'konkreči/konkreci': /konkre[čc]i/i,
  'preliminar': /preliminar/i,
  'planuojam': /planuojam/i,
}
for (const [name, re] of Object.entries(MARKERS)) {
  show(`titles containing "${name}" by cftInvolves | procedure (all sampled)`, count(recs.filter((r) => re.test(String(r.title ?? ''))), combo))
}

// Which date fields are filled, per kind (future-deadline and all).
const DATES = ['datePublished', 'tenderSubmissionDeadline', 'clarificationPeriodEnd', 'tendersOpeningDate',
  'dispatchingInvitationDeadline', 'awardDate', 'contractAwardDate', 'dateAcceptedByContractor']
console.log('\n## date fields filled, per cftInvolves | procedure (all sampled)')
for (const [k, n] of count(recs, combo)) {
  const rows = recs.filter((r) => combo(r) === k)
  const filled = DATES.map((d) => `${d}=${rows.filter((r) => r[d] != null).length}`).join(' ')
  const bad = DATES.map((d) => rows.filter((r) => r[d] != null && local(r[d]) == null).length).reduce((a, b) => a + b, 0)
  console.log(`  ${k} (${n}): ${filled}; unparseable=${bad}`)
}

// The newest publication date's Vilnius day, for the 7-day stale check.
let newest = null
for (const r of recs) { const d = local(r.datePublished); if (d && (!newest || d > newest)) newest = d }
console.log(`\nnewest datePublished day: ${newest?.slice(0, 10)}`)
console.log(`records with cpvCodes containing a comma: ${recs.filter((r) => String(r.cpvCodes ?? '').includes(',')).length}`)
console.log(`records with cpvCodes containing a dash: ${recs.filter((r) => String(r.cpvCodes ?? '').includes('-')).length}`)
console.log(`estimatedValue types: ${JSON.stringify(count(recs, (r) => typeof r.estimatedValue))}`)
