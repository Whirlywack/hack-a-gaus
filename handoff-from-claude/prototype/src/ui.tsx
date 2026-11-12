import type { CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Bookmark, Check, ChevronDown, File, Minus, Plus, Search, X, type LucideIcon } from 'lucide-react'
import { useStore } from './store'
import { STAGES, type Tender } from './data'

// gaus v2 primitives. Everything on screen is built from these: labels with
// index numbers, ruled sections, ruled cells, rule tabs, square tags, corner
// brackets. No cards.

const ICONS = {
  'arrow-left': ArrowLeft,
  'arrow-right': ArrowRight,
  'arrow-out': ArrowUpRight,
  bookmark: Bookmark,
  check: Check,
  'chevron-down': ChevronDown,
  file: File,
  minus: Minus,
  plus: Plus,
  search: Search,
  x: X,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS

export function Icon({ name, size = 16, stroke = 1.5, fill }: { name: IconName; size?: number; stroke?: number; fill?: boolean }) {
  const G = ICONS[name]
  return <G size={size} strokeWidth={stroke} absoluteStrokeWidth aria-hidden fill={fill ? 'currentColor' : 'none'} style={{ display: 'block', flex: 'none' }} />
}

/** Enter and Space press a block that acts as a button. */
export const onKey = (fn?: () => void) => (e: KeyboardEvent) => {
  if (!fn || e.target !== e.currentTarget) return
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    fn()
  }
}

export function Tap({ onClick, className, children, label, style }: { onClick: () => void; className?: string; children: ReactNode; label?: string; style?: CSSProperties }) {
  return (
    <div role="button" tabIndex={0} aria-label={label} data-tap="" className={className} style={style} onClick={onClick} onKeyDown={onKey(onClick)}>
      {children}
    </div>
  )
}

/** Two digits: "02". Three for findings: "001". */
export const idx = (n: number, width = 2) => String(n).padStart(width, '0')

export function Label({ children, tone, className }: { children: ReactNode; tone?: 'accent' | 'urgent'; className?: string }) {
  return <span className={`v-label${tone ? ` is-${tone}` : ''}${className ? ` ${className}` : ''}`}>{children}</span>
}

export function Tag({ children, tone, icon }: { children: ReactNode; tone?: 'accent' | 'urgent' | 'solid'; icon?: IconName }) {
  return (
    <span className={`v-tag${tone ? ` is-${tone}` : ''}`}>
      {icon && <Icon name={icon} size={11} stroke={1.75} />}
      {children}
    </span>
  )
}

export function Btn({ children, onClick, kind, small, wide, icon, trailing, on, disabled, label }: {
  children?: ReactNode; onClick?: () => void; kind?: 'primary' | 'quiet'; small?: boolean; wide?: boolean; icon?: ReactNode; trailing?: ReactNode; on?: boolean; disabled?: boolean; label?: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
      data-on={on || undefined}
      className={`v-btn${kind ? ` is-${kind}` : ''}${small ? ' is-small' : ''}${wide ? ' is-wide' : ''}`}
      onClick={(e) => { e.stopPropagation(); if (!disabled) onClick?.() }}
    >
      {icon}
      {children}
      {trailing}
    </button>
  )
}

export function TextBtn({ children, onClick, quiet, trailing }: { children: ReactNode; onClick?: () => void; quiet?: boolean; trailing?: ReactNode }) {
  return (
    <button type="button" className={`v-textbtn${quiet ? ' is-quiet' : ''}`} onClick={(e) => { e.stopPropagation(); onClick?.() }}>
      {children}
      {trailing}
    </button>
  )
}

/** A button that fills one ruled cell. */
export function CellBtn({ children, onClick, tone, big, icon }: { children: ReactNode; onClick?: () => void; tone?: 'accent' | 'fill'; big?: boolean; icon?: ReactNode }) {
  return (
    <button type="button" className={`v-cellbtn${tone ? ` is-${tone}` : ''}${big ? ' is-big' : ''}`} onClick={(e) => { e.stopPropagation(); onClick?.() }}>
      {icon}
      {children}
    </button>
  )
}

/** Follow: a square button with a bookmark. "Stebėti" outlined, "Stebiu" settled. */
export function FollowBtn({ on, onToggle, iconOnly }: { on: boolean; onToggle: () => void; iconOnly?: boolean }) {
  return (
    <Btn small on={on} onClick={onToggle} label={iconOnly ? (on ? 'Stebiu' : 'Stebėti') : undefined} icon={<Icon name="bookmark" size={14} fill={on} />}>
      {iconOnly ? null : on ? 'Stebiu' : 'Stebėti'}
    </Btn>
  )
}

/** Rule tabs: a rule above each option; the chosen one in the accent.
 * `progress` fills every rule up to the chosen one (a stage, not a choice). */
export function RuleTabs({ items, value, onChange, numbered, progress, className }: { items: string[]; value: number; onChange: (i: number) => void; numbered?: boolean; progress?: boolean; className?: string }) {
  return (
    <div role="radiogroup" className={`v-rtabs${className ? ` ${className}` : ''}`}>
      {items.map((o, i) => (
        <button
          type="button"
          key={o}
          role="radio"
          aria-checked={i === value}
          className="v-rtab"
          data-on={i === value || undefined}
          data-done={(progress && i < value) || undefined}
          onClick={(e) => { e.stopPropagation(); onChange(i) }}
        >
          {numbered && <span className="v-idx">{idx(i + 1)}</span>}
          <span>{o}</span>
        </button>
      ))}
    </div>
  )
}

/** The stage of a followed tender: three steps on one line of rules. */
export function Stage({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  return <RuleTabs items={STAGES} value={value} onChange={onChange} numbered progress />
}

export function Bracket({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return <div className={`v-brk${className ? ` ${className}` : ''}`} style={style}>{children}</div>
}

/** A section: rule, label, a count or a note on the right, then its rows. */
export function Sec({ label, n, note, right, children, className, tone = 'accent' }: { label: string; n?: number; note?: string; right?: ReactNode; children?: ReactNode; className?: string; tone?: 'accent' | 'plain' }) {
  return (
    <section className={`v-sec${className ? ` ${className}` : ''}`}>
      <header className="v-sec__head">
        <Label tone={tone === 'accent' ? 'accent' : undefined}>{label}</Label>
        <span className="v-sec__right">
          {note && <span className="v-sec__note">{note}</span>}
          {right}
          {n !== undefined && <span className="v-idx">{idx(n)}</span>}
        </span>
      </header>
      {children}
    </section>
  )
}

/** The answer of a screen: a small meta line, then one large sentence whose
 * second clause is dimmed. */
export function Answer({ meta, metaRight, children, sub }: { meta?: ReactNode; metaRight?: ReactNode; children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="v-answer">
      {(meta || metaRight) && (
        <div className="v-answer__meta">
          <Label>{meta}</Label>
          {metaRight && <Label>{metaRight}</Label>}
        </div>
      )}
      <h1 className="v-display">{children}</h1>
      {sub && <p className="v-answer__sub">{sub}</p>}
    </div>
  )
}

/** A big numeral with its unit: "7 d." */
export function Num({ n, unit, urgent, className }: { n: ReactNode; unit?: string; urgent?: boolean; className?: string }) {
  return (
    <span className={`v-num${urgent ? ' v-urgent' : ''}${className ? ` ${className}` : ''}`}>
      {n}
      {unit && <span className="v-unit">{unit}</span>}
    </span>
  )
}

/** The days left, read from "Liko 7 d.". */
export const daysOf = (t: Tender) => t.statusDays.replace(/\D+/g, '')

/** A tender in a list: the days left as the numeral on the left, then title,
 * buyer, the deadline and what is on the right of it. */
export function TenderRow({ t, onClick, tags, side, acts }: { t: Tender; onClick: () => void; tags?: ReactNode; side?: ReactNode; acts?: ReactNode }) {
  return (
    <>
      <Tap className="v-trow" onClick={onClick}>
        <div className="v-trow__when">
          <Num n={daysOf(t)} unit="d." urgent={t.urgent || t.pill === 'consult'} />
        </div>
        <div className="v-trow__body">
          <div className="v-rowtitle clamp2">{t.title}</div>
          <div className="v-small">{t.buyer}</div>
          <div className="v-trow__meta">
            <span className="v-small">{t.pill === 'consult' ? `Rinkos konsultacija · ${t.feedDeadline}` : t.feedDeadline}</span>
            {tags && <span className="v-trow__tags">{tags}</span>}
          </div>
        </div>
        {side && <div className="v-trow__side">{side}</div>}
      </Tap>
      {acts}
    </>
  )
}

// ---------- Screen chrome ----------

export function Bar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="v-bar">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  )
}

export function Wordmark() {
  return <span className="v-wordmark">gaus</span>
}

export const ROUTE_NAMES: Record<string, string> = {
  siandien: 'Šiandien',
  stebimi: 'Stebimi',
  rinka: 'Rinka',
  paieska: 'Paieška',
  pirkimas: 'Pirkimas',
  pirkejas: 'Pirkėjas',
  imone: 'Įmonė',
}

/** Back: an arrow and the name of the screen it returns to. */
export function Back({ fallback, label, parent }: { fallback: string; label?: string; /** A detail screen always returns to its overview. */ parent?: boolean }) {
  const { back: goBack, prev, go } = useStore()
  const press = () => (parent && prev !== fallback ? go(fallback) : goBack(fallback))
  const target = parent ? fallback : prev ?? fallback
  const parts = target.slice(2).split('/')
  const name = label ?? ROUTE_NAMES[parts[0]] ?? 'Šiandien'
  return (
    <button type="button" className="v-back" onClick={press}>
      <Icon name="arrow-left" size={16} />
      {name}
    </button>
  )
}

export function Account() {
  const { openSheet } = useStore()
  return (
    <button type="button" aria-label="Paskyra" className="v-acct-hit" onClick={() => openSheet({ type: 'account' })}>
      <span className="v-acct">KG</span>
    </button>
  )
}

const TABS: { label: string; hash: string }[] = [
  { label: 'Šiandien', hash: '#/siandien' },
  { label: 'Stebimi', hash: '#/stebimi' },
  { label: 'Rinka', hash: '#/rinka' },
  { label: 'Paieška', hash: '#/paieska' },
]

export function TabBar({ active }: { active: number }) {
  const { go } = useStore()
  return (
    <nav className="v-tabs">
      {TABS.map((t, i) => (
        <button type="button" key={t.label} className="v-tab" data-on={i === active || undefined} onClick={() => go(t.hash)}>
          {t.label}
        </button>
      ))}
    </nav>
  )
}

export function DeskTop({ active, plain }: { active: number; plain?: boolean }) {
  const { go } = useStore()
  return (
    <header className="v-dtop v-nodes">
      <button type="button" className="v-dtop__mark" onClick={() => go('#/siandien')}><Wordmark /></button>
      <nav className="v-dnav">
        {!plain && TABS.map((t, i) => (
          <button type="button" key={t.label} className="v-dnav__item" data-on={i === active || undefined} onClick={() => go(t.hash)}>
            {t.label}
          </button>
        ))}
      </nav>
      {!plain && <div className="v-dtop__right"><Account /></div>}
    </header>
  )
}
