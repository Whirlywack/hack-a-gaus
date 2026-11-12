import { useEffect, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { Back, Bar, Bracket, FollowBtn, Icon, Label, Num, RuleTabs, Tap, idx } from './ui'
import { useWide } from './mode'

// Shared blocks of the data screens (Pirkėjas, Įmonė, Rinka, Stebimi):
// findings, pictures, ranked rows, contract rows, entity rows, fields.

/** A trade switch whose second option only says the prototype shows roads. */
export function TradeTabs({ items }: { items: string[] }) {
  const [v, setV] = useState(0)
  const [note, setNote] = useState(false)
  const t = useRef<number>()
  const pick = (i: number) => {
    if (i === 0) return setV(0)
    setV(1)
    setNote(true)
    window.clearTimeout(t.current)
    t.current = window.setTimeout(() => setV(0), 450)
  }
  useEffect(() => () => window.clearTimeout(t.current), [])
  return (
    <div className="p-trade">
      <RuleTabs items={items} value={v} onChange={pick} />
      {note && <p className="p-trade__note v-small">Prototipe rodoma tik sritis „Keliai ir gatvės“.</p>}
    </div>
  )
}

/** A finding: what one block of the data says, with a small picture, leading
 * to its detail. The unit of every overview screen. */
export function Finding({ n, label, text, picture, quiet, onClick }: { n: number; label: string; text: ReactNode; picture?: ReactNode; quiet?: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      <header className="p-find__head">
        <Label tone="accent">{label}</Label>
        <span className="v-idx">{idx(n, 3)}</span>
      </header>
      <div className="p-find__text">{text}</div>
      {picture && <Bracket className="p-find__pic">{picture}</Bracket>}
      <footer className="p-find__foot">
        <span className="v-small">{quiet}</span>
        {onClick && <span className="v-arrow is-move"><Icon name="arrow-right" size={18} /></span>}
      </footer>
    </>
  )
  return onClick ? <Tap className="p-find" onClick={onClick}>{body}</Tap> : <div className="p-find">{body}</div>
}

/** A phone detail screen: back to its overview, a label line, the title. */
export function Detail({ title, sub, back, backLabel, children }: { title: string; sub: string; back: string; backLabel?: string; children: ReactNode }) {
  return (
    <>
      <Bar left={<Back fallback={back} label={backLabel} parent />} />
      <div className="p-dhead">
        <Label>{sub}</Label>
        <h1 className="v-title">{title}</h1>
      </div>
      {children}
    </>
  )
}

// ---------- Pictures ----------

export type Share = { n: number; pct: string; words: string }

/** One bar cut into real shares: the leader in ink, the rest grey, the
 * unpublished part hatched. `bare` leaves out the legend. */
export function ShareStrip({ parts, bare }: { parts: Share[]; bare?: boolean }) {
  return (
    <div className="p-share" data-bare={bare || undefined}>
      <div className="p-share__bar">
        {parts.map((p, i) => <span key={i} className="p-share__seg" data-i={i} style={{ flexGrow: p.n }} />)}
      </div>
      {!bare && (
        <div className="p-share__legend">
          {parts.map((p, i) => (
            <div key={i} className="p-share__item">
              <span className="p-share__key" data-i={i} />
              <span className="p-share__pct">{p.pct}</span>
              <span className="v-small">{p.words}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export type MonthCol = { squares: number; sum?: string; label?: string; year?: string }

/** Twelve months on a baseline: one square per contract that ends that month. */
export function MonthStrip({ months, mini }: { months: MonthCol[]; mini?: boolean }) {
  return (
    <div className="p-strip" data-mini={mini || undefined}>
      <div className="p-strip__cols">
        {months.map((m, i) => (
          <div key={i} className="p-strip__col">
            {!mini && m.sum && <span className="p-strip__sum">{m.sum}</span>}
            {m.squares > 0 ? Array.from({ length: m.squares }, (_, k) => <span key={k} className="p-strip__sq" />) : <span className="p-strip__tick" />}
          </div>
        ))}
      </div>
      {!mini && (
        <div className="p-strip__labels">
          {months.map((m, i) => <span key={i} className="p-strip__label" data-year={m.year ? '' : undefined}>{m.label ?? m.year ?? ''}</span>)}
        </div>
      )}
    </div>
  )
}

/** Twelve bars, one per month; the first (this month) in the accent. With
 * `labels`, the count stands above each bar and month names under some. */
export function MonthBars({ counts, labels }: { counts: number[]; labels?: Record<number, string> }) {
  const max = Math.max(...counts)
  return (
    <div className="p-mbars" data-mini={labels ? undefined : ''}>
      <div className="p-mbars__cols">
        {counts.map((n, i) => (
          <div key={i} className="p-mbars__col" data-first={i === 0 || undefined}>
            {labels && <span className="p-mbars__n">{n}</span>}
            <span className="p-mbars__bar" style={{ height: `${(n / max) * 100}%` }} />
          </div>
        ))}
      </div>
      {labels && (
        <div className="p-strip__labels">
          {counts.map((_, i) => <span key={i} className="p-strip__label" data-year={/^\d+$/.test(labels[i] ?? '') ? '' : undefined}>{labels[i] ?? ''}</span>)}
        </div>
      )}
    </div>
  )
}

/** Two bars on one scale: the leader against the runner-up. */
export function DuoBars({ a, b, max, la, lb }: { a: number; b: number; max: number; la?: string; lb?: string }) {
  return (
    <div className="p-duo">
      {[[a, la], [b, lb]].map(([n, l], i) => (
        <div key={i} className="p-duo__row">
          <span className="p-duo__track"><span className="p-duo__fill" data-i={i} style={{ width: `${((n as number) / max) * 100}%` }} /></span>
          {l && <span className="v-idx p-duo__n">{l}</span>}
        </div>
      ))}
    </div>
  )
}

// ---------- Rows ----------

export type RankItem = { name: string; count: string; n: number; typical?: string; tone?: 'lead' | 'other' | 'unknown' }

/** Ranked rows: index, name, count; under them a thin bar on a shared scale. */
export function RankRows({ items, total, onItem, trailing }: { items: RankItem[]; total: number; onItem?: (name: string) => (() => void) | undefined; trailing?: (name: string) => ReactNode }) {
  let k = 0
  return (
    <div className="p-rank">
      {items.map((w, i) => {
        const click = onItem?.(w.name)
        const numbered = !w.tone || w.tone === 'lead'
        if (numbered) k += 1
        const body = (
          <>
            <span className="v-idx">{numbered ? idx(k) : ''}</span>
            <div className="p-rank__body">
              <div className="p-rank__head">
                <span className="p-rank__name">{w.name}{click && <span className="v-arrow is-move p-rank__go"><Icon name="arrow-right" size={15} /></span>}</span>
                <span className="p-rank__count">{w.count}</span>
              </div>
              <span className="p-rank__track"><span className="p-rank__fill" style={{ width: `${(w.n / total) * 100}%` }} /></span>
              {w.typical && <span className="v-small">{w.typical}</span>}
            </div>
            {trailing && <span className="p-rank__trail">{numbered ? trailing(w.name) : null}</span>}
          </>
        )
        return click
          ? <Tap key={w.name} className="p-rank__row" onClick={click}><Wrap i={i} tone={w.tone} trail={!!trailing}>{body}</Wrap></Tap>
          : <div key={w.name} className="p-rank__row"><Wrap i={i} tone={w.tone} trail={!!trailing}>{body}</Wrap></div>
      })}
    </div>
  )
}

function Wrap({ i, tone, trail, children }: { i: number; tone?: string; trail: boolean; children: ReactNode }) {
  return <div className="p-rank__grid" data-first={i === 0 || undefined} data-tone={tone} data-trail={trail || undefined}>{children}</div>
}

/** "po 8 d." / "po 5 mėn." as a numeral and its unit. */
function distParts(dist: string) {
  const m = dist.match(/(\d+)\s*(.+)$/)
  return m ? { n: m[1], unit: m[2] } : { n: '', unit: '' }
}

/** A contract that ends: how soon (the numeral), what, who holds it, its value. */
export function EndingRow({ dist, urgent, date, title, buyer, holder, value, onClick }: { dist: string; urgent?: boolean; date: string; title: string; buyer?: string; holder: string; value: string; onClick?: () => void }) {
  const d = distParts(dist)
  const body = (
    <>
      <div className="v-trow__when"><Num n={d.n} unit={d.unit} urgent={urgent} /></div>
      <div className="v-trow__body">
        <div className="v-rowtitle clamp2">{title}</div>
        {buyer && <div className="v-small">{buyer}</div>}
        <div className="v-small">Baigiasi {date}</div>
        <div className="p-split">
          <span className="p-split__a">{holder}</span>
          <span className="p-split__b">{value}</span>
        </div>
      </div>
    </>
  )
  return onClick ? <Tap className="v-trow p-ending" onClick={onClick}>{body}</Tap> : <div className="v-trow p-ending">{body}</div>
}

/** A plain list row: a small top line, the title, then left and right ends. */
export function PlainRow({ top, title, left, right, onClick }: { top?: ReactNode; title: ReactNode; left?: ReactNode; right?: ReactNode; onClick?: () => void }) {
  const body = (
    <>
      {top && <div className="v-small">{top}</div>}
      <div className="v-rowtitle clamp2">{title}</div>
      {(left || right) && (
        <div className="p-split">
          <span className="p-split__a is-quiet">{left}</span>
          <span className="p-split__b">{right}</span>
        </div>
      )}
    </>
  )
  return onClick ? <Tap className="v-row p-plain" onClick={onClick}>{body}</Tap> : <div className="v-row p-plain">{body}</div>
}

/** A buyer or a firm in a list: name, one quiet line, and what is on the right. */
export function EntityRow({ name, line, right, onClick, n }: { name: ReactNode; line?: ReactNode; right?: ReactNode; onClick?: () => void; n?: number }) {
  const body = (
    <>
      {n !== undefined && <span className="v-idx">{idx(n)}</span>}
      <div className="p-entity__body">
        <span className="p-entity__name">{name}</span>
        {line && <span className="v-small">{line}</span>}
      </div>
      {right}
    </>
  )
  return onClick
    ? <Tap className="v-row p-entity" onClick={onClick} style={n === undefined ? { gridTemplateColumns: 'minmax(0, 1fr) auto' } : undefined}>{body}</Tap>
    : <div className="v-row p-entity" style={n === undefined ? { gridTemplateColumns: 'minmax(0, 1fr) auto' } : undefined}>{body}</div>
}

/** A numbered list of buyers or firms, each with a follow button. */
export function FollowList({ rows, isFollowed, onToggle, onRow }: { rows: { name: string; line: string }[]; isFollowed: (name: string) => boolean; onToggle: (name: string) => void; onRow?: (name: string) => (() => void) | undefined }) {
  const wide = useWide()
  return (
    <div className="p-list">
      {rows.map((b, i) => (
        <EntityRow key={b.name} n={i + 1} name={b.name} line={b.line} onClick={onRow?.(b.name)} right={<FollowBtn on={isFollowed(b.name)} onToggle={() => onToggle(b.name)} iconOnly={!wide && false} />} />
      ))}
    </div>
  )
}

/** "Rodyti visus…": in the prototype it only says what is shown. */
export function More({ label, note }: { label: string; note: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="p-more">
      <button type="button" className="v-textbtn" onClick={() => setOpen(true)}>{label}<Icon name="arrow-right" size={16} /></button>
      {open && <p className="v-small">{note}</p>}
    </div>
  )
}

// ---------- Fields ----------

/** A text field: an uppercase label over a square box. Nothing typed is stored or sent. */
export function Field({ label, placeholder, defaultValue, type = 'text', inputMode, autoComplete, value, onChange, leading, trailing }: {
  label?: string; placeholder?: string; defaultValue?: string; type?: string; inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']; autoComplete?: string
  value?: string; onChange?: (v: string) => void; leading?: ReactNode; trailing?: ReactNode
}) {
  return (
    <label className="p-field">
      {label && <Label>{label}</Label>}
      <span className="p-field__box">
        {leading}
        <input
          className="p-field__input"
          type={type}
          placeholder={placeholder}
          defaultValue={defaultValue}
          value={value}
          inputMode={inputMode}
          autoComplete={autoComplete ?? 'off'}
          spellCheck={false}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        />
        {trailing}
      </span>
    </label>
  )
}

/** A square check box, the accent when on. */
export function CheckBox({ on }: { on: boolean }) {
  return <span className="p-check" data-on={on || undefined} aria-hidden>{on && <Icon name="check" size={14} stroke={2.25} />}</span>
}
