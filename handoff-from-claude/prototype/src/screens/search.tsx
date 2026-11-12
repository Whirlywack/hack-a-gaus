import { useRef, type ReactNode } from 'react'
import { Account, Bar, Icon, Label, Num, Sec, Tap, Wordmark, daysOf } from '../ui'
import { EntityRow } from '../parts'
import { TENDER_ORDER, TENDERS, type Tender } from '../data'
import { useStore } from '../store'
import { useWide } from '../mode'

// Paieška: one field, then the matches grouped as pirkimai, pirkėjai, įmonės.

// Matching ignores case and Lithuanian diacritics; each letter folds to one
// letter, so a match's position in the folded text is its position in the original.
const fold = (s: string) => Array.from(s).map((c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()).join('')

function ranges(text: string, q: string) {
  const t = fold(text)
  const f = fold(q)
  const out: [number, number][] = []
  if (!f) return out
  let i = t.indexOf(f)
  while (i >= 0) {
    out.push([i, i + f.length])
    i = t.indexOf(f, i + f.length)
  }
  return out
}

/** The text with every match drawn: ink 600, an accent rule under it. */
function Hl({ text, q }: { text: string; q: string }) {
  const chars = Array.from(text)
  const rs = ranges(text, q)
  if (!rs.length) return <>{text}</>
  const parts: ReactNode[] = []
  let at = 0
  rs.forEach(([a, b], k) => {
    if (a > at) parts.push(chars.slice(at, a).join(''))
    parts.push(<b key={k} className="s-hit">{chars.slice(a, b).join('')}</b>)
    at = b
  })
  if (at < chars.length) parts.push(chars.slice(at).join(''))
  return <>{parts}</>
}

type Entity = { name: string; code?: string; to?: string }
const BUYERS: Entity[] = [
  { name: 'Jurbarko rajono savivaldybės administracija', code: 'Įm. k. 188713933', to: '#/pirkejas/188713933' },
  { name: 'VĮ Valstybinių miškų urėdija' },
  { name: 'AB „Via Lietuva“' },
  { name: 'Kelmės rajono savivaldybės administracija' },
  { name: 'Ukmergės rajono savivaldybės administracija' },
  { name: 'Kauno rajono savivaldybės administracija' },
  { name: 'Kretingos rajono savivaldybės administracija' },
  { name: 'Švenčionių rajono savivaldybės administracija' },
  { name: 'LTG Kompetencijų centras' },
]
const FIRMS: Entity[] = [
  { name: 'UAB „Jurmelsta“', code: 'Įm. k. 158257064', to: '#/imone/158257064' },
  { name: 'UAB „Jurbarko vandenys“', code: 'Įm. k. 158275315' },
  { name: 'MB „Jurvelita“', code: 'Įm. k. 306713682' },
  { name: 'AB „Kelių priežiūra“', code: 'Įm. k. 232112130' },
  ...['UAB „Daugesta“', 'UAB „JK Ranga“', 'UAB „Parama“', 'UAB „Telšių keliai“', 'UAB „Dunokai“', 'UAB „Keliukas“', 'UAB „Nivelsta“', 'UAB „Kauno keliai“', 'AB „Kauno tiltai“'].map((name) => ({ name })),
]

/** A tender result: the row of the lists, with the matches drawn in the title and the buyer. */
function TenderHit({ t, q }: { t: Tender; q: string }) {
  const { go } = useStore()
  return (
    <Tap className="v-trow s-trow" onClick={() => go(`#/pirkimas/${t.id}`)}>
      <div className="v-trow__when">
        <Num n={daysOf(t)} unit="d." urgent={t.urgent || t.pill === 'consult'} />
      </div>
      <div className="v-trow__body">
        <div className="v-rowtitle clamp2"><Hl text={t.title} q={q} /></div>
        <div className="v-small"><Hl text={t.buyer} q={q} /></div>
        <div className="v-trow__meta">
          <span className="v-small">{t.pill === 'consult' ? `Rinkos konsultacija · ${t.feedDeadline}` : t.feedDeadline}</span>
        </div>
      </div>
    </Tap>
  )
}

function EntityHit({ e, q }: { e: Entity; q: string }) {
  const { go } = useStore()
  return (
    <EntityRow
      name={<Hl text={e.name} q={q} />}
      line={e.code}
      onClick={e.to ? () => go(e.to!) : undefined}
      right={e.to ? <span className="v-arrow"><Icon name="arrow-right" size={18} /></span> : undefined}
    />
  )
}

export function Search() {
  const wide = useWide()
  const { query, setQuery } = useStore()
  const input = useRef<HTMLInputElement>(null)
  const q = query.trim()
  const active = fold(q).length >= 2
  const tenders = active ? TENDER_ORDER.map((id) => TENDERS[id]).filter((t) => ranges(t.title, q).length || ranges(t.buyer, q).length) : []
  const buyers = active ? BUYERS.filter((b) => ranges(b.name, q).length) : []
  const firms = active ? FIRMS.filter((f) => ranges(f.name, q).length) : []
  const none = active && !tenders.length && !buyers.length && !firms.length

  const clear = () => {
    setQuery('')
    input.current?.focus()
  }

  const field = (
    <div className="s-find">
      <Label>Paieška</Label>
      <label className="s-box" data-filled={query ? '' : undefined}>
        <span className="s-box__icon"><Icon name="search" size={20} /></span>
        <input
          ref={input}
          className="s-box__input"
          type="text"
          inputMode="search"
          aria-label="Paieška"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button type="button" aria-label="Išvalyti" className="s-box__clear" onClick={(e) => { e.preventDefault(); clear() }}>
            <Icon name="x" size={18} />
          </button>
        )}
      </label>
      <p className="v-small s-hint">Ieškoma tarp pirkimų, pirkėjų ir įmonių</p>
    </div>
  )

  const tenderSec = (tenders.length > 0 || wide) && (
    <Sec label="Pirkimai" n={tenders.length}>
      {tenders.map((t) => <TenderHit key={t.id} t={t} q={q} />)}
    </Sec>
  )
  const buyerSec = (buyers.length > 0 || wide) && (
    <Sec label="Pirkėjai" n={buyers.length}>
      {buyers.map((b) => <EntityHit key={b.name} e={b} q={q} />)}
    </Sec>
  )
  const firmSec = (firms.length > 0 || wide) && (
    <Sec label="Įmonės" n={firms.length}>
      {firms.map((f) => <EntityHit key={f.name} e={f} q={q} />)}
    </Sec>
  )
  const empty = none && <p className="s-none">Nieko neradome. Patikrinkite, ar nėra rašybos klaidų.</p>

  if (wide)
    return (
      <div className="s-page">
        {field}
        {empty}
        {active && !none && (
          <div className="s-cols v-nodes">
            <div>{tenderSec}</div>
            <div>{buyerSec}</div>
            <div>{firmSec}</div>
          </div>
        )}
      </div>
    )
  return (
    <div className="s-page">
      <Bar left={<Wordmark />} right={<Account />} />
      {field}
      {empty}
      {active && !none && (
        <div className="s-groups">
          {tenderSec}
          {buyerSec}
          {firmSec}
        </div>
      )}
    </div>
  )
}
