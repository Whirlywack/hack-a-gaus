// TEMPORARY (ticket #6, review): walk the whole open-notice feed and print only field
// names, distinct values and counts. Never prints a record's contents, an id, a title,
// the key, or anything else from a record. Writes to no database and no file.
// Removed once the gated-notice rule is settled.
//
// Questions:
// 1. Which procedures do the open Notices have (whole feed, not a sample)?
// 2. Which procedures does the public portal refuse to show without sign-in? (The old
//    gaus measured that gated notices redirect anonymous visitors to CAS sign-in.)
// 3. Which title markers ("neskelbiam", "preliminar", ...) come with which procedure?
// 4. How is caNumber (the Buyer's code) filled and shaped?

const FEED = 'https://viesiejipirkimai.lt/epps-integration/api/cft-details-export'
const PORTAL = 'https://viesiejipirkimai.lt/epps/cft/prepareViewCfTWS.do?resourceId='
const SIZE = 1000
const key = process.env.VPT_API_KEY
if (!key) throw new Error('VPT_API_KEY is not set')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function page(n) {
  let last
  for (let a = 0; a < 5; a++) {
    if (a) await sleep(2000 * a)
    try {
      const res = await fetch(FEED, {
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

// Whole walk: stop after 3 empty pages in a row.
const byId = new Map()
let empties = 0
for (let n = 1; n <= 400 && empties < 3; n++) {
  const recs = await page(n)
  if (recs.length === 0) { empties++; continue }
  empties = 0
  for (const r of recs) if (r && typeof r.id === 'number') byId.set(r.id, r)
}
const all = [...byId.values()]
console.log(`records (unique ids): ${all.length}`)

const day = /^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}:\d{2}:\d{2})/
const local = (s) => { const m = typeof s === 'string' ? day.exec(s) : null; return m ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}` : null }
const nowLocal = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Vilnius', dateStyle: 'short', timeStyle: 'medium' }).format(new Date())
const CLOSED = new Set(['Evaluation', 'Awaiting bid opening', 'Proposal Submission Closed', 'Awarded', 'Concluded', 'Closed', 'Cancelled', 'Terminated'])
const future = all.filter((r) => { const d = local(r.tenderSubmissionDeadline); return d != null && d > nowLocal })
const open = future.filter((r) => r.status == null || !CLOSED.has(r.status))
console.log(`Vilnius now: ${nowLocal}; future deadline: ${future.length}; open (future deadline, status not closed): ${open.length}`)

const count = (rows, f) => { const c = new Map(); for (const r of rows) { const k = f(r); c.set(k, (c.get(k) ?? 0) + 1) } return [...c].sort((a, b) => b[1] - a[1]) }
const show = (title, entries) => { console.log(`\n## ${title}`); for (const [k, n] of entries) console.log(`  ${String(k).slice(0, 110)}: ${n}`) }
const combo = (r) => `${r.cftInvolves ?? 'null'} | ${r.procedure ?? 'null'}`

show('status (future deadline, whole feed)', count(future, (r) => r.status ?? 'null'))
show('cftInvolves | procedure (all)', count(all, combo))
show('cftInvolves | procedure (open)', count(open, combo))
for (const f of ['onlineInterestAllowed', 'directive', 'aboveThreshold', 'procurementType']) {
  show(`procedure x ${f} (open)`, count(open, (r) => `${r.procedure} | ${JSON.stringify(r[f] ?? null)}`))
}
show('procedure x dispatchingInvitationDeadline filled (open)', count(open, (r) => `${r.procedure} | ${r.dispatchingInvitationDeadline != null}`))

// Title markers by procedure: counts only, no titles.
const MARKERS = {
  neskelbiam: /neskelbiam/i,
  'skelbiam (not neskelbiam)': /(?<!ne)skelbiam/i,
  apklaus: /apklaus/i,
  kviet: /kvie[čt]/i,
  preliminar: /preliminar/i,
  pagrindin: /pagrindin/i,
  'atnaujint (renewed competition)': /atnaujint/i,
  'mažos vertės': /ma[žz]os vert/i,
  'DPS (word)': /\bDPS\b/,
  dinamin: /dinamin/i,
  'kvalifikacijos sistem': /kvalifikacijos sistem/i,
}
for (const [name, re] of Object.entries(MARKERS)) {
  show(`titles containing "${name}", by procedure (all)`, count(all.filter((r) => re.test(String(r.title ?? ''))), (r) => r.procedure))
  show(`titles containing "${name}", by procedure (open)`, count(open.filter((r) => re.test(String(r.title ?? ''))), (r) => r.procedure))
}

// caNumber: filled per notice type, shape, and whether one name keeps one code.
show('caNumber filled, by cftInvolves (all)', count(all, (r) => `${r.cftInvolves ?? 'null'} | ${r.caNumber != null && r.caNumber !== ''}`))
const shape = (v) => {
  if (v == null || v === '') return 'empty'
  const s = String(v)
  if (/^\d+$/.test(s)) return `digits, length ${s.length}`
  if (/^\s|\s$/.test(s)) return 'padded with spaces'
  return `other (type ${typeof v}, length ${s.length})`
}
show('caNumber shape (all)', count(all, (r) => shape(r.caNumber)))
const nameKey = (r) => String(r.caName ?? '').replace(/\s*\(PV\)\s*$/, '').trim().toLowerCase()
const codesByName = new Map(); const namesByCode = new Map()
for (const r of all) {
  if (r.caNumber == null || r.caNumber === '') continue
  const n = nameKey(r), c = String(r.caNumber)
  if (!codesByName.has(n)) codesByName.set(n, new Set()); codesByName.get(n).add(c)
  if (!namesByCode.has(c)) namesByCode.set(c, new Set()); namesByCode.get(c).add(n)
}
console.log(`\ndistinct Buyer codes: ${namesByCode.size}; distinct Buyer names with a code: ${codesByName.size}`)
console.log(`names with more than one code: ${[...codesByName.values()].filter((s) => s.size > 1).length}`)
console.log(`codes with more than one name: ${[...namesByCode.values()].filter((s) => s.size > 1).length}`)
const mcNames = new Set(all.filter((r) => r.procedure === 'Preliminary Market Consultation').map(nameKey))
console.log(`Market consultation Buyer names that have a code on another Notice: ${[...mcNames].filter((n) => codesByName.has(n)).length} of ${mcNames.size}`)

// Portal check: does the notice page open without sign-in? Up to 8 open notices per
// procedure, spread across the list. Counts and masked paths only.
const decode = (s) => s
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
const squash = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase()
const mask = (u) => { try { const x = new URL(u, PORTAL); return `${x.host}${x.pathname.replace(/\d+/g, '#')}` } catch { return 'unparseable' } }

async function portal(r) {
  try {
    const res = await fetch(PORTAL + r.id, { redirect: 'manual', headers: { 'User-Agent': 'gaus-feed-probe' }, signal: AbortSignal.timeout(30_000) })
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location') ?? ''
      return `redirect ${res.status} to ${/cas|login|prisijung/i.test(loc) ? 'SIGN-IN' : 'other'} (${mask(loc)})`
    }
    const body = squash(decode(await res.text()))
    const t = squash(String(r.title ?? '')).slice(0, 30)
    const hasTitle = t.length > 0 && body.includes(t)
    const login = /cas\/login|j_username|name="password"/i.test(body)
    return `HTTP ${res.status}, title ${hasTitle ? 'shown' : 'NOT shown'}${login ? ', sign-in form' : ''}`
  } catch (e) { return `error ${e instanceof Error ? e.name : 'unknown'}` }
}

console.log('\n## portal page without sign-in, by procedure (open; up to 8 each)')
for (const [proc] of count(open, (r) => r.procedure)) {
  const rows = open.filter((r) => r.procedure === proc)
  const step = Math.max(1, Math.floor(rows.length / 8))
  const sample = rows.filter((_, i) => i % step === 0).slice(0, 8)
  const results = []
  for (const r of sample) { results.push(await portal(r)); await sleep(600) }
  console.log(`  ${proc} (${rows.length} open, ${sample.length} checked):`)
  for (const [k, n] of count(results, (x) => x)) console.log(`    ${k}: ${n}`)
}
