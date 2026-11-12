// TEMPORARY (ticket #6, security review): count how many feed records carry contact
// details (an e-mail address, a phone number, a contact word) in each text field.
// Prints counts only: never a record's contents, an id, the key. Writes nothing.
// Removed after use.

const FEED = 'https://viesiejipirkimai.lt/epps-integration/api/cft-details-export'
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
        body: JSON.stringify({ pageSize: 1000, pageNum: n }),
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

const PATTERNS = {
  'e-mail address': /[\w.+-]+@[\w-]+\.[\w.-]+/,
  'phone number (+370 / 8 6xx / 8 5)': /(\+\s?370[\s\d()-]{7,}|\b8\s?\(?[3-6]\d{1,2}\)?\s?\d{2,3}\s?\d{2,4}\b)/,
  'contact word (tel., el. p., kontakt)': /\btel\.|el\.\s?p|e-mail|\bkontakt/i,
}
const FIELDS = ['caName', 'title', 'caNumber', 'status', 'procedure', 'description']

const counts = {}
for (const f of FIELDS) counts[f] = Object.fromEntries(Object.keys(PATTERNS).map((p) => [p, 0]))
const types = {}
let total = 0
let empties = 0
const seen = new Set()
for (let n = 1; n <= 400 && empties < 3; n++) {
  const recs = await page(n)
  if (recs.length === 0) { empties++; continue }
  empties = 0
  for (const r of recs) {
    if (!r || seen.has(r.id)) continue
    seen.add(r.id)
    total++
    for (const [k, v] of Object.entries(r)) {
      const t = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v
      types[k] ??= {}; types[k][t] = (types[k][t] ?? 0) + 1
    }
    for (const f of FIELDS) {
      const v = r[f]
      if (typeof v !== 'string') continue
      for (const [p, re] of Object.entries(PATTERNS)) if (re.test(v)) counts[f][p]++
    }
  }
}
console.log(`records: ${total}`)
console.log('\n## every field name the feed sent, with value type counts')
for (const [k, t] of Object.entries(types).sort()) console.log(`  ${k}: ${JSON.stringify(t)}`)
console.log('\n## records whose field matches a contact pattern')
for (const f of FIELDS) for (const [p, n] of Object.entries(counts[f])) console.log(`  ${f} | ${p}: ${n}`)
