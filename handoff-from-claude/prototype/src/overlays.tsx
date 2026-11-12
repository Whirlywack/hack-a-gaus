import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { Btn, Icon, Label, idx } from './ui'
import { ALL_CONTRACTS, contractKey, distance, fmtDate, fmtMoney, JURBARKAS, JURMELSTA, type Contract, type TenderId } from './data'
import { useStore, type Sheet } from './store'
import { useWide } from './mode'

// Sheets (phone), a dialog and a side panel (desktop), the toast and the
// "Visi ekranai" list. Square, ruled, ink borders; no shadows.

const DUR = 220

/** Keeps the last sheet mounted while it slides out. */
function useLingering(sheet: Sheet) {
  const [shown, setShown] = useState<Sheet>(sheet)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (sheet) {
      setShown(sheet)
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)))
      return () => cancelAnimationFrame(id)
    }
    setOpen(false)
    const t = window.setTimeout(() => setShown(null), DUR)
    return () => window.clearTimeout(t)
  }, [sheet])
  return { shown, open }
}

const TITLES: Record<NonNullable<Sheet>['type'], string> = { neman: 'Ne man', account: 'Paskyra', contract: 'Sutartis' }

export function Sheets() {
  const { sheet, openSheet } = useStore()
  const wide = useWide()
  const { shown, open } = useLingering(sheet)
  const close = () => openSheet(null)
  useEffect(() => {
    if (!sheet) return
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  })
  if (!shown) return null
  const kind = wide ? (shown.type === 'contract' ? 'drawer' : 'dialog') : 'sheet'
  return (
    <div className="o-layer" data-kind={kind} data-open={open || undefined}>
      <div className="o-backdrop" onClick={close} />
      <Panel kind={kind} title={TITLES[shown.type]} onClose={close}>
        {shown.type === 'neman' && <NotForMe id={shown.id} thenFeed={shown.thenFeed} />}
        {shown.type === 'account' && <AccountSheet />}
        {shown.type === 'contract' && <ContractPanel c={ALL_CONTRACTS[shown.id]} amendments={shown.amendments} />}
      </Panel>
    </div>
  )
}

function Panel({ kind, title, onClose, children }: { kind: string; title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ y: number; dy: number } | null>(null)
  const [dy, setDy] = useState(0)
  useEffect(() => { ref.current?.focus({ preventScroll: true }) }, [])
  // On the phone the head row can be pulled down to close the sheet
  const sheet = kind === 'sheet'
  const down = (e: RPointerEvent) => {
    if (!sheet || (e.target as HTMLElement).closest('button')) return
    drag.current = { y: e.clientY, dy: 0 }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const move = (e: RPointerEvent) => {
    if (!drag.current) return
    drag.current.dy = Math.max(0, e.clientY - drag.current.y)
    setDy(drag.current.dy)
  }
  const up = () => {
    const d = drag.current
    drag.current = null
    if (d && d.dy > 80) onClose()
    setDy(0)
  }
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal
      aria-label={title}
      className="o-panel"
      data-kind={kind}
      style={dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined}
    >
      <header className="o-head" data-drag={sheet || undefined} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { drag.current = null; setDy(0) }}>
        <Label>{title}</Label>
        <button type="button" aria-label="Uždaryti" className="o-x" onClick={onClose}>
          <Icon name="x" size={16} />
        </button>
      </header>
      <div className="o-body">{children}</div>
    </div>
  )
}

// ---------- Ne man ----------

function NotForMe({ id, thenFeed }: { id: TenderId; thenFeed?: boolean }) {
  const { setAside, openSheet, go } = useStore()
  const pick = () => {
    setAside(id)
    openSheet(null)
    if (thenFeed) go('#/siandien')
  }
  return (
    <>
      <h2 className="o-title">Kodėl šis pirkimas ne jums?</h2>
      <div className="o-rows">
        {['Ne mano darbai', 'Per didelis', 'Per toli', 'Kita'].map((o, i) => (
          <button type="button" key={o} data-tap="" className="o-row o-option" onClick={pick}>
            <span className="v-idx">{idx(i + 1)}</span>
            <span className="o-row__text">{o}</span>
          </button>
        ))}
      </div>
    </>
  )
}

// ---------- Paskyra ----------

/** A square switch: a ruled box with a square knob, the accent when on. */
function SwitchRow({ label, on, onChange }: { label: string; on: boolean; onChange: () => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} data-tap="" className="o-row o-switchrow" onClick={onChange}>
      <span className="o-row__text">{label}</span>
      <span className="o-switch" data-on={on || undefined} aria-hidden><span /></span>
    </button>
  )
}

function AccountSheet() {
  const { go } = useStore()
  const [open, setOpen] = useState(false)
  const [a, setA] = useState(true)
  const [b, setB] = useState(true)
  return (
    <div className="o-rows">
      <button type="button" data-tap="" className="o-row o-link" onClick={() => go('#/pradzia/darbai')}>
        <span className="o-row__text">Mano darbai</span>
        <span className="v-arrow is-move"><Icon name="arrow-right" size={18} /></span>
      </button>
      <button type="button" aria-expanded={open} data-tap="" className="o-row o-link" onClick={() => setOpen((o) => !o)}>
        <span className="o-row__text">Pranešimai</span>
        <span className="v-arrow o-chev" data-open={open || undefined}><Icon name="chevron-down" size={18} /></span>
      </button>
      {open && (
        <div className="o-sub">
          <SwitchRow label="El. laiškai apie naujus pirkimus" on={a} onChange={() => setA((v) => !v)} />
          <SwitchRow label="Priminimai prieš terminą" on={b} onChange={() => setB((v) => !v)} />
        </div>
      )}
      <button type="button" data-tap="" className="o-row o-link is-quiet" onClick={() => go('#/prisijungti')}>
        <span className="o-row__text">Atsijungti</span>
      </button>
    </div>
  )
}

// ---------- Sutartis ----------

function Cell({ label, children, big }: { label: string; children: ReactNode; big?: boolean }) {
  return (
    <div className="o-cell">
      <Label>{label}</Label>
      <div className={big ? 'o-value is-big' : 'o-value'}>{children}</div>
    </div>
  )
}

function ContractPanel({ c, amendments }: { c: Contract; amendments: boolean }) {
  const { go, isFollowed, toggleEntity } = useStore()
  const dist = distance(c.ends)
  const key = contractKey(c.id)
  const on = isFollowed(key)
  const party = (text: string, to?: string) =>
    to ? (
      <button type="button" className="o-partylink" onClick={() => go(to)}>
        <span>{text}</span>
        <span className="v-arrow is-move"><Icon name="arrow-right" size={16} /></span>
      </button>
    ) : text
  return (
    <div className="o-contract">
      <h2 className="o-title is-contract">{c.title}</h2>
      <div className="o-cells">
        <Cell label="Pirkėjas">{party(c.buyer, c.buyer === JURBARKAS ? '#/pirkejas/188713933' : undefined)}</Cell>
        <Cell label="Vykdo">{party(c.holder, c.holder === JURMELSTA ? '#/imone/158257064' : undefined)}</Cell>
        <Cell label="Vertė" big>{fmtMoney(c.value)}</Cell>
        <div className="o-pair">
          <Cell label="Pasirašyta">{fmtDate(c.signed)}</Cell>
          <Cell label="Baigiasi">
            {fmtDate(c.ends)}
            {dist && <span className="o-dist" data-urgent={(dist.days && Number(dist.text.replace(/\D+/g, '')) <= 7) || undefined}>{dist.text}</span>}
          </Cell>
        </div>
        {amendments && (
          <Cell label="Pakeitimai" big={!!c.amendments}>{c.amendments ? String(c.amendments) : 'nėra'}</Cell>
        )}
      </div>
      <div className="o-foot">
        <Btn
          kind={on ? undefined : 'primary'}
          wide
          on={on}
          onClick={() => toggleEntity({ key, kind: 'Sutartis', name: c.title })}
          icon={<Icon name="bookmark" size={16} fill={on} />}
        >
          {on ? 'Stebiu' : 'Stebėti'}
        </Btn>
      </div>
    </div>
  )
}

// ---------- Toast ----------

export function ToastHost() {
  const { toast, hideToast } = useStore()
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(hideToast, 5000)
    return () => window.clearTimeout(t)
  }, [toast, hideToast])
  if (!toast) return null
  return (
    <div className="o-toast" key={toast.n} role="status">
      <span>{toast.text}</span>
      {toast.action && (
        <button type="button" className="o-toast__action" onClick={() => { toast.action!.run(); hideToast() }}>
          {toast.action.label}
        </button>
      )}
    </div>
  )
}

// ---------- Visi ekranai ----------

/** Every screen and state in the file, for jumping straight to one. */
export const ALL_SCREENS: { hash: string; label: string; then?: 'neman' | 'account' | 'read' | 'contract' }[] = [
  { hash: '#/pradzia', label: 'Kokius darbus atliekate?' },
  { hash: '#/pradzia/kodas', label: 'Įveskite įmonės kodą' },
  { hash: '#/pradzia/darbai', label: 'Pažymėkite, kas jums tinka' },
  { hash: '#/pradzia/pirkimai', label: 'Štai ką radome' },
  { hash: '#/pradzia/paskyra', label: 'Sukurkite paskyrą' },
  { hash: '#/pradzia/patvirtinimas', label: 'Patikrinkite el. paštą' },
  { hash: '#/prisijungti', label: 'Prisijungti' },
  { hash: '#/siandien', label: 'Šiandien' },
  { hash: '#/siandien', label: 'Kodėl šis pirkimas ne jums?', then: 'neman' },
  { hash: '#/siandien', label: 'Mano darbai · Pranešimai · Atsijungti', then: 'account' },
  { hash: '#/pirkimas/10377061', label: 'Autobusų stotelių remonto darbai su projektavimu' },
  { hash: '#/pirkimas/10393450', label: 'Specialių reikalavimų nėra.' },
  { hash: '#/pirkimas/10383512', label: 'Dokumentų dar neskaitėme.' },
  { hash: '#/pirkimas/10383512', label: 'Skaitome dokumentus…', then: 'read' },
  { hash: '#/pirkimas/10224312', label: 'Skelbiamos derybos' },
  { hash: '#/pirkimas/10398813', label: 'Rinkos konsultacija' },
  { hash: '#/pirkimas/baigtas-1', label: 'Baigtas · Laimėjo UAB „Jurmelsta“' },
  { hash: '#/pirkimas/baigtas-2', label: 'Baigtas · Laimėjo AB „Kelių priežiūra“' },
  { hash: '#/pirkejas/188713933', label: 'Jurbarko rajono savivaldybės administracija' },
  { hash: '#/pirkejas/188713933/sutartys', label: 'Kada atsilaisvina' },
  { hash: '#/pirkejas/188713933/laimi', label: 'Kas čia laimi' },
  { hash: '#/pirkejas/188713933/sutartys', label: 'Sutartis', then: 'contract' },
  { hash: '#/imone/158257064', label: 'UAB „Jurmelsta“' },
  { hash: '#/imone/158257064/pirkejai', label: 'Kas iš jų perka' },
  { hash: '#/imone/158257064/sutartys', label: 'Sutartys' },
  { hash: '#/imone/158257064/finansai', label: 'Finansai' },
  { hash: '#/stebimi', label: 'Stebimi' },
  { hash: '#/rinka', label: 'Rinka' },
  { hash: '#/rinka/perka', label: 'Kas perka' },
  { hash: '#/rinka/laimi', label: 'Kas laimi' },
  { hash: '#/rinka/atsilaisvina', label: 'Kada atsilaisvina' },
  { hash: '#/paieska', label: 'Paieška' },
]

export function AllScreens() {
  const { go, openSheet, read, route } = useStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc) }
  }, [open])
  const jump = (s: (typeof ALL_SCREENS)[number]) => {
    setOpen(false)
    go(s.hash)
    if (s.then === 'read') read('10383512')
    if (s.then) {
      window.setTimeout(() => {
        if (s.then === 'neman') openSheet({ type: 'neman', id: '10377061' })
        if (s.then === 'account') openSheet({ type: 'account' })
        if (s.then === 'contract') openSheet({ type: 'contract', id: '2007586625', amendments: true })
      }, 60)
    }
  }
  return (
    <div className="o-all" ref={ref}>
      {open && (
        <div className="o-all__list" role="menu">
          {ALL_SCREENS.map((s, i) => (
            <button type="button" key={i} role="menuitem" data-tap="" className="o-all__item" data-here={(!s.then && s.hash === route) || undefined} onClick={() => jump(s)}>
              <span className="v-idx">{idx(i + 1)}</span>
              <span className="o-all__label">{s.label}</span>
              <span className="o-all__hash">{s.hash.slice(1)}</span>
            </button>
          ))}
        </div>
      )}
      <button type="button" aria-expanded={open} className="o-all__btn" onClick={() => setOpen((o) => !o)}>
        <span className="o-all__glyph" aria-hidden><span /><span /><span /><span /></span>
        Visi ekranai
      </button>
    </div>
  )
}
