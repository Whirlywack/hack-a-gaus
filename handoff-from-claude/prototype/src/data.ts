// Every string and number here is from the briefs (PROTOTYPE.md, DESIGN*.md)
// or read from the named data files. Nothing is invented.
import jurmelstaRaw from './jurmelsta.json'

export const NB = ' '
/** Non-breaking spaces inside numbers and before € and %. */
export const T = (s: string) => s.replace(/(\d) (?=\d)/g, `$1${NB}`).replace(/ (€|%)/g, `${NB}$1`)

// ---- Formatting ----
const MONTHS = ['sausio', 'vasario', 'kovo', 'balandžio', 'gegužės', 'birželio', 'liepos', 'rugpjūčio', 'rugsėjo', 'spalio', 'lapkričio', 'gruodžio']
export const TODAY = '2026-11-11'

export function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  const s = `${MONTHS[m - 1]} ${d} d.`
  return y === 2026 ? s : `${y} m. ${s}`
}

export function fmtMoney(n: number) {
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NB)}${NB}€`
}

export function sutartis(n: number) {
  const t = n % 100
  const u = n % 10
  if (t >= 10 && t <= 20) return 'sutarčių'
  if (u === 1) return 'sutartis'
  if (u === 0) return 'sutarčių'
  return 'sutartys'
}

const dayNo = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86400000

/** Distance from today, as on the lists: "po 8 d." up to a month, then "po 5 mėn."; nothing for the past. */
export function distance(iso: string): { text: string; days: boolean } | null {
  const n = dayNo(iso) - dayNo(TODAY)
  if (n < 0) return null
  if (n <= 31) return { text: `po ${n} d.`, days: true }
  return { text: `po ${Math.round(n / 30.44)} mėn.`, days: false }
}

// ---- Tenders ----
export type TenderId = '10383512' | '10224312' | '10377061' | '10393450' | '10398813'
export type Tender = {
  id: TenderId
  letter: 'A' | 'B' | 'C' | 'D' | 'E'
  days: string
  urgent: boolean
  feedDeadline: string
  title: string
  buyer: string
  buyerLink?: boolean
  pill: 'open' | 'consult'
  statusDays: string
  statusLine: string
  kind?: string
  why: string
  req: 'full' | 'none' | 'unread' | 'consult'
  area?: 'roads' | 'building'
  url: string
}

const cft = (id: string) => `https://viesiejipirkimai.lt/epps/cft/prepareViewCfTWS.do?resourceId=${id}`

export const TENDERS: Record<TenderId, Tender> = {
  '10383512': {
    id: '10383512', letter: 'A', days: 'Liko 7 d.', urgent: true,
    feedDeadline: 'iki lapkričio 18 d., 14:00',
    title: 'Ežero g (KT7002), Rūdaičių k., Kretingos r. sav., pėsčiųjų tako (ruožas nuo žemės sklypo adresu Ežero g. 3 iki Ežero g. ir Malūno g. sankryžos) atnaujinimo darbai',
    buyer: 'Kretingos rajono savivaldybės administracija',
    pill: 'open', statusDays: 'Liko 7 d.', statusLine: 'Pasiūlymus teikti iki lapkričio 18 d., 14:00',
    kind: 'Skelbiama apklausa', why: 'Rodome, nes stebite šį pirkimą', req: 'unread', url: cft('10383512'),
  },
  '10224312': {
    id: '10224312', letter: 'B', days: 'Liko 7 d.', urgent: true,
    feedDeadline: 'iki lapkričio 18 d.',
    title: '34717 Pervažos Vilnius – Klaipėda 351+780 km (Kretinga) modernizavimas',
    buyer: 'LTG Kompetencijų centras',
    pill: 'open', statusDays: 'Liko 7 d.', statusLine: 'Pasiūlymus teikti iki lapkričio 18 d.',
    kind: 'Skelbiamos derybos', why: 'Rodome, nes stebite šį pirkimą', req: 'unread', url: cft('10224312'),
  },
  '10377061': {
    id: '10377061', letter: 'C', days: 'Liko 13 d.', urgent: false,
    feedDeadline: 'iki lapkričio 24 d., 9:00',
    title: 'Autobusų stotelių remonto darbai su projektavimu',
    buyer: 'Jurbarko rajono savivaldybės administracija', buyerLink: true,
    pill: 'open', statusDays: 'Liko 13 d.', statusLine: 'Pasiūlymus teikti iki lapkričio 24 d., 9:00',
    kind: 'Atviras konkursas', why: 'Rodome, nes atitinka sritį „Keliai ir gatvės“', req: 'full', area: 'roads', url: cft('10377061'),
  },
  '10393450': {
    id: '10393450', letter: 'D', days: 'Liko 7 d.', urgent: true,
    feedDeadline: 'iki lapkričio 18 d., 9:00',
    title: 'Priedangos pastate Vilniaus g. 19, Švenčionys, įrengimo darbai (vėdinimo įrengimas) (Skelbiama apklausa)',
    buyer: 'Švenčionių rajono savivaldybės administracija',
    pill: 'open', statusDays: 'Liko 7 d.', statusLine: 'Pasiūlymus teikti iki lapkričio 18 d., 9:00',
    kind: 'Skelbiama apklausa', why: 'Rodome, nes atitinka sritį „Pastatų remontas“', req: 'none', area: 'building', url: cft('10393450'),
  },
  '10398813': {
    id: '10398813', letter: 'E', days: 'Rinkos konsultacija', urgent: false,
    feedDeadline: 'iki lapkričio 16 d., 8:00',
    title: 'Visuomeninių pastatų paskirties grupės, mokslo paskirties pastato J. Janonio g. 9, Kelmėje, kapitalinis remontas',
    buyer: 'Kelmės rajono savivaldybės administracija',
    pill: 'consult', statusDays: 'Liko 5 d.', statusLine: 'Atsakyti iki lapkričio 16 d., 8:00',
    why: 'Rodome, nes atitinka sritį „Pastatų remontas“', req: 'consult',
    url: 'https://viesiejipirkimai.lt/epps/pmc/viewPmc.do?resourceId=10398813',
  },
}
export const TENDER_ORDER: TenderId[] = ['10383512', '10224312', '10377061', '10393450', '10398813']
export const isTenderId = (s: string): s is TenderId => s in TENDERS

/** From /home/user/procurement/qualify/key/10393450.json (the "3.1." entry; file name without the store's id prefix and .txt). */
export const D_SOURCE = {
  quote: '„3.1. Perkančioji organizacija netaiko kvalifikacijos reikalavimų.“',
  file: 'Skelbiamos apklausos pirkimo sąlygos.docx',
}

export const FINISHED = {
  'baigtas-1': {
    signed: 'Sutartis pasirašyta rugpjūčio 26 d.',
    title: 'Pilies Sodo 1-oji g., Jurbarkas, Jurbarko r. sav. paprastojo remonto darbai',
    winner: 'UAB „Jurmelsta“', firmLink: true, amount: T('112 264 €'),
  },
  'baigtas-2': {
    signed: 'Sutartis pasirašyta rugpjūčio 28 d.',
    title: 'Molynės g., Skirsnemunės k., kelio Nr. skm1-7 ir Skirsnemunės k. kelio Nr. skm1-6 Skirsnemunės sen. Jurbarko r. sav. paprastojo remonto darbai',
    winner: 'AB „Kelių priežiūra“', firmLink: false, amount: T('38 502 €'),
  },
} as const
export type FinishedId = keyof typeof FINISHED

export const STAGES = ['Stebiu', 'Rengiu', 'Pateikiau']
/** The stage as the Feed's chip says it. */
export const STAGE_CHIP = ['Stebiu', 'Rengiu pasiūlymą', 'Pateikiau']

// ---- Buyer and firm ----
export const JURBARKAS = 'Jurbarko rajono savivaldybės administracija'
export const JURBARKAS_CODE = '188713933'
export const JURMELSTA = 'UAB „Jurmelsta“'
export const JURMELSTA_CODE = '158257064'

// ---- Contracts (the contract panel) ----
export type Contract = {
  id: string
  title: string
  buyer: string
  holder: string
  value: number
  signed: string
  ends: string
  amendments?: number
}

/** The five long contracts of Jurbarkas, from data/jurbarkas.json. */
export const JURBARKAS_LONG: Contract[] = [
  { id: '2007586625', title: 'Jurbarko rajono savivaldybės kelių su žvyro danga priežiūros (greideriavimo) darbai (3, 4, 5, 6, 7, 9, 10)', buyer: JURBARKAS, holder: JURMELSTA, value: 103654.65, signed: '2025-03-19', ends: '2026-11-19', amendments: 0 },
  { id: '2007586576', title: 'Jurbarko rajono savivaldybės kelių su žvyro danga priežiūros (greideriavimo) darbai (1, 2, 8, 11 pirkimo dalys)', buyer: JURBARKAS, holder: 'UAB „Dunokai“', value: 65926.85, signed: '2025-03-20', ends: '2026-11-20', amendments: 0 },
  { id: '2007342087', title: 'K. Donelaičio gatvės I etapo Jurbarko m., kapitalinis remontas ir lietaus nuotekų tinklų K. Donelaičio g., Jurbarko m., Jurbarko r. sav., atkarpos tarp P. Cvirkos ir Vasario 16-osios įrengimas', buyer: JURBARKAS, holder: JURMELSTA, value: 547485.89, signed: '2024-10-28', ends: '2027-04-04', amendments: 3 },
  { id: '2007618702', title: 'Jurbarko rajono savivaldybės kelių su žvyro danga priežiūros (žvyravimo) darbai (2-11 pirkimo dalys)', buyer: JURBARKAS, holder: 'AB „Kelių priežiūra“', value: 351066.98, signed: '2025-04-10', ends: '2027-04-10', amendments: 0 },
  { id: '2007619198', title: 'Jurbarko rajono savivaldybės kelių su žvyro danga priežiūros (žvyravimo) darbai (1 pirkimo dalis)', buyer: JURBARKAS, holder: 'MB „Grysteka“', value: 56336.39, signed: '2025-04-10', ends: '2027-04-10', amendments: 0 },
]

/** Rinka "Artimiausios": DESIGN-MARKET.md, signing dates from data/market.json B_contracts. */
export const MARKET_NEXT: Contract[] = [
  { id: '2007765696', title: 'KAUNO MIESTO SUSISIEKIMO KOMUNIKACIJŲ REMONTO IR REKONSTRUKCIJOS DARBŲ CENTRO, DAINAVOS, EIGULIŲ, GRIČIUPIO, PETRAŠIŪNŲ, ŠANČIŲ IR ŽALIAKALNIO SENIŪNIJOSE PIRKIMO PAGRINDINĖ SUTARTIS J. MATEIKOS G.', buyer: 'Kauno miesto savivaldybės administracija', holder: 'UAB „Kauno keliai“', value: 662322, signed: '2025-08-13', ends: '2026-11-13' },
  { id: '2007244617', title: 'Kauno r. , Ringaudų sen., Gaižėnėlių k., Nemuno g. rekonstravimo darbai', buyer: 'Kauno rajono savivaldybės administracija', holder: 'UAB „Kauno keliai“', value: 781717, signed: '2024-09-20', ends: '2026-11-14' },
  { id: '2007747015', title: 'Rajoninio kelio 4714 Strėva–Ismonys–Rūdiškės ruožo nuo 3,333 iki 9,462 km kapitalinis remontas', buyer: 'AB „Via Lietuva“', holder: 'AB „Kauno tiltai“', value: 2255025, signed: '2025-06-30', ends: '2026-11-14' },
]

type RawJ = { id: string; title: string; buyer: string; buyerCode: string; value: number; signed: string; ends: string }
/** UAB „Jurmelsta“: the 12 road and street contracts of the year, from data/market.json A_contracts, newest first. */
export const JURMELSTA_CONTRACTS: (Contract & { buyerCode: string })[] = (jurmelstaRaw as RawJ[]).map((r) => ({ ...r, holder: JURMELSTA }))

export const ALL_CONTRACTS: Record<string, Contract> = Object.fromEntries(
  [...JURBARKAS_LONG, ...MARKET_NEXT, ...JURMELSTA_CONTRACTS].map((c) => [c.id, c]),
)

export const JURMELSTA_BUYERS = (() => {
  const m = new Map<string, number>()
  for (const c of JURMELSTA_CONTRACTS) m.set(c.buyer, (m.get(c.buyer) ?? 0) + 1)
  // Order as in PROTOTYPE.md: Jurbarkas, then Raseiniai, Kelmė, Pagėgiai
  const order = ['Jurbarko', 'Raseinių', 'Kelmės', 'Pagėgių']
  const rank = (n: string) => order.findIndex((o) => n.startsWith(o))
  return [...m.entries()].sort((a, b) => b[1] - a[1] || rank(a[0]) - rank(b[0])).map(([name, n]) => ({ name, n }))
})()

export const FINANCE = [
  { y: '2025', rev: 4402620, profit: -236644, equity: 962499 },
  { y: '2024', rev: 7518767, profit: 26215, equity: 1199143 },
  { y: '2023', rev: 5139396, profit: 365264, equity: 1172928 },
  { y: '2022', rev: 2752784, profit: 98358, equity: 807664 },
  { y: '2021', rev: 2028269, profit: -374711, equity: 709306 },
]
export const fmtSigned = (n: number) => (n < 0 ? `−${fmtMoney(-n)}` : fmtMoney(n))

// ---- Followed things (what the example user follows at the start) ----
export type Entity = { key: string; kind: 'Pirkėjas' | 'Įmonė' | 'Sutartis'; name: string }
export const buyerKey = (name: string) => `buyer:${name}`
export const firmKey = (name: string) => `firm:${name}`
export const contractKey = (id: string) => `contract:${id}`
