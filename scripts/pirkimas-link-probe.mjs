// TEMPORARY (ticket #11): evidence for the Pirkimas links and the procedure names.
// Reads the hosted notices (no writes) and a few public portal pages, 2.2 s apart, with
// the fetcher's identifying user agent. Prints counts, procedure names and portal paths
// with every digit masked. Never prints an id, a title, a Buyer, the key or the contact.
// Removed after use.
//
// Questions:
// 1. The portal's own list (handoff-from-claude/data/open-tenders-list-2026-11.json, 120
//    open notices of 10-11 Nov, each with the portal's link and Lithuanian procedure name):
//    is each list id a notice id with the same title, and which feed procedure goes with
//    which Lithuanian name? Which link path goes with which kind?
// 2. For open tenders: does the documents list (listContractDocuments.do) open without
//    sign-in and list documents? What links does the notice page carry (bid submission)?
// 3. For open Market consultations: does viewPmc.do open without sign-in with the title?
//    What links does it carry (documents)?
import { readFile } from 'node:fs/promises'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
const contact = (process.env.FETCHER_CONTACT ?? '').trim()
if (!url) throw new Error('DATABASE_URL is not set')
if (!contact) throw new Error('FETCHER_CONTACT is not set')
const UA = `gaus-reader/0.1 (+tender documents for a supplier-facing reading tool; contact: ${contact})`
const BASE = 'https://viesiejipirkimai.lt'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const sql = postgres(url, { max: 1, prepare: false, ssl: 'require', onnotice: () => {} })

const count = (rows, f) => {
  const c = new Map()
  for (const r of rows) c.set(f(r), (c.get(f(r)) ?? 0) + 1)
  return [...c].sort((a, b) => b[1] - a[1])
}
const show = (title, entries) => {
  console.log(`\n## ${title}`)
  for (const [k, n] of entries) console.log(`  ${k}: ${n}`)
}
const squash = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()
const mask = (p) => p.replace(/\d+/g, '#')

try {
  // 1. The portal's list against the stored notices.
  const list = JSON.parse(await readFile('handoff-from-claude/data/open-tenders-list-2026-11.json', 'utf8'))
  const ids = list.map((r) => Number(r.id))
  const rows = await sql`select id, kind, procedure_type, title from public.notices where id = any(${ids})`
  const byId = new Map(rows.map((r) => [Number(r.id), r]))
  const joined = list.map((r) => ({ list: r, n: byId.get(Number(r.id)) }))
  console.log(`portal list rows: ${list.length}; found among notices by id: ${joined.filter((j) => j.n).length}`)
  show('list link path | stored kind', count(joined, (j) => `${j.list.url.split('?')[0]} | ${j.n?.kind ?? 'NOT FOUND'}`))
  show('title equal (exact, whitespace squashed) | stored kind', count(joined.filter((j) => j.n), (j) => `${squash(j.n.title) === squash(j.list.title)} | ${j.n.kind}`))
  show('feed procedure -> portal procedure name', count(joined.filter((j) => j.n), (j) => `${j.n.procedure_type} -> ${j.list.proc}`))

  const kinds = await sql`select kind, procedure_type, count(*)::int as n from public.notices n where public.notice_is_open(n) and kind in ('tender', 'market_consultation') group by 1, 2 order by 3 desc`
  show('open shown notices: kind | feed procedure', kinds.map((r) => [`${r.kind} | ${r.procedure_type}`, r.n]))
  const evals = await sql`select kind, coalesce(evaluation, '(null)') as e, coalesce(in_lots::text, '(null)') as l, count(*)::int as n from public.notices n where public.notice_is_open(n) and kind in ('tender', 'market_consultation') group by 1, 2, 3 order by 4 desc`
  show('open shown notices: kind | evaluation | in_lots', evals.map((r) => [`${r.kind} | ${r.e} | ${r.l}`, r.n]))
  const statuses = await sql`select kind, coalesce(status, '(null)') as s, (deadline_at > now()) as ahead, count(*)::int as n from public.notices where kind in ('tender', 'market_consultation') group by 1, 2, 3 order by 4 desc`
  show('all shown kinds: kind | status | deadline ahead', statuses.map((r) => [`${r.kind} | ${r.s} | ${r.ahead}`, r.n]))

  // A cookie jar per notice, redirects followed by hand so cookies set on the way are kept.
  let last = 0
  async function get(path, jar) {
    let target = new URL(path, BASE)
    for (let hop = 0; hop < 6; hop++) {
      const wait = 2200 - (Date.now() - last)
      if (wait > 0) await sleep(wait)
      last = Date.now()
      const res = await fetch(target, {
        redirect: 'manual',
        headers: { 'User-Agent': UA, Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') },
        signal: AbortSignal.timeout(60_000),
      })
      for (const c of res.headers.getSetCookie()) {
        const [pair] = c.split(';')
        const i = pair.indexOf('=')
        jar.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim())
      }
      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        target = new URL(res.headers.get('location'), target)
        continue
      }
      return { status: res.status, final: mask(target.pathname.split(';')[0]), body: await res.text() }
    }
    return { status: 0, final: 'too many redirects', body: '' }
  }
  const decode = (s) => s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  // Every ".do" path a page links to or calls, digits masked.
  const paths = (body) => [...new Set([...body.matchAll(/\/epps\/[A-Za-z/]+\.do/g)].map((m) => mask(m[0])))].sort()
  // Short labels of links and buttons that speak of a bid or of documents.
  const labels = (body) => [...new Set(
    [...decode(body).matchAll(/<(?:a|button|input)[^>]*?(?:>([^<]{1,60})<|value="([^"]{1,60})")/gi)]
      .map((m) => squash(m[1] ?? m[2]))
      // Interface labels only: a document's file name is a record's content.
      .filter((t) => t.length <= 40 && !/\.\w{2,4}$/.test(t) && /pasiūlym|dokument|prisijung|teikti|pateikti/i.test(t)),
  )].sort()

  const sample = async (kind) => {
    const open = await sql`select id, title from public.notices n where kind = ${kind} and public.notice_is_open(n) order by id`
    const step = Math.max(1, Math.floor(open.length / 8))
    return open.filter((_, i) => i % step === 0).slice(0, 8)
  }

  // 2. Open tenders.
  const tenders = await sample('tender')
  const t = { notice: [], docs: [], paths: [], labels: [] }
  for (const r of tenders) {
    const jar = new Map()
    const n = await get(`/epps/cft/prepareViewCfTWS.do?resourceId=${r.id}`, jar)
    const shown = squash(decode(n.body)).toLowerCase().includes(squash(r.title).toLowerCase().slice(0, 30))
    t.notice.push(`HTTP ${n.status} at ${n.final}, title ${shown ? 'shown' : 'NOT shown'}`)
    t.paths.push(...paths(n.body))
    t.labels.push(...labels(n.body))
    const d = await get(`/epps/cft/listContractDocuments.do?resourceId=${r.id}`, jar)
    const listed = (d.body.match(/downloadDocForAnonymous\(/g) ?? []).length
    t.docs.push(`HTTP ${d.status} at ${d.final}, ${listed > 0 ? 'documents listed' : 'NO documents listed'}`)
  }
  console.log(`\nopen tenders checked: ${tenders.length}`)
  show('tender notice page (prepareViewCfTWS.do)', count(t.notice, (x) => x))
  show('tender documents page (listContractDocuments.do)', count(t.docs, (x) => x))
  show('paths linked from tender notice pages (pages that link each)', count(t.paths, (x) => x))
  show('bid and document labels on tender pages (pages that show each)', count(t.labels, (x) => x))

  // 3. Open Market consultations.
  const mcs = await sample('market_consultation')
  const m = { page: [], paths: [], labels: [], docs: [] }
  for (const r of mcs) {
    const jar = new Map()
    const p = await get(`/epps/pmc/viewPmc.do?resourceId=${r.id}`, jar)
    const shown = squash(decode(p.body)).toLowerCase().includes(squash(r.title).toLowerCase().slice(0, 30))
    m.page.push(`HTTP ${p.status} at ${p.final}, title ${shown ? 'shown' : 'NOT shown'}`)
    m.paths.push(...paths(p.body))
    m.labels.push(...labels(p.body))
    m.docs.push((p.body.match(/download[A-Za-z]*\(/g) ?? []).length > 0 ? 'download calls on the page' : 'no download calls on the page')
  }
  console.log(`\nopen Market consultations checked: ${mcs.length}`)
  show('consultation page (viewPmc.do)', count(m.page, (x) => x))
  show('consultation documents on the page', count(m.docs, (x) => x))
  show('paths linked from consultation pages (pages that link each)', count(m.paths, (x) => x))
  show('bid and document labels on consultation pages (pages that show each)', count(m.labels, (x) => x))
} finally {
  await sql.end({ timeout: 5 })
}
