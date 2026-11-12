import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { buyerKey, contractKey, firmKey, JURBARKAS, JURMELSTA, ALL_CONTRACTS, type Entity, type TenderId } from './data'

// Everything the person changes lives here, in memory only (no storage).

export type Sheet =
  | { type: 'neman'; id: TenderId; thenFeed?: boolean }
  | { type: 'account' }
  | { type: 'contract'; id: string; amendments: boolean }
  | null

export type Toast = { text: string; action?: { label: string; run: () => void }; n: number } | null

type Store = {
  route: string
  go: (hash: string) => void
  back: (fallback: string) => void
  prev: string | null
  followed: Set<string>
  /** Followed buyers, firms and contracts, in the order they were followed. */
  watched: Entity[]
  isFollowed: (key: string) => boolean
  toggleEntity: (e: Entity) => void
  followTender: (id: TenderId) => void
  unfollowTender: (id: TenderId) => void
  stages: Partial<Record<TenderId, number>>
  setStage: (id: TenderId, n: number) => void
  aside: TenderId[]
  setAside: (id: TenderId) => void
  restore: (id: TenderId) => void
  reading: Set<TenderId>
  read: (id: TenderId) => void
  area: number
  setArea: (n: number) => void
  query: string
  setQuery: (q: string) => void
  kinds: boolean[]
  toggleKind: (i: number) => void
  sheet: Sheet
  openSheet: (s: Sheet) => void
  toast: Toast
  showToast: (t: Omit<NonNullable<Toast>, 'n'>) => void
  hideToast: () => void
  /** True when the last route change came from the browser's back/forward. */
  popped: boolean
}

const Ctx = createContext<Store>(null as unknown as Store)
export const useStore = () => useContext(Ctx)

const START_WATCHED: Entity[] = [
  { key: buyerKey(JURBARKAS), kind: 'Pirkėjas', name: JURBARKAS },
  { key: firmKey(JURMELSTA), kind: 'Įmonė', name: JURMELSTA },
  { key: contractKey('2007586625'), kind: 'Sutartis', name: ALL_CONTRACTS['2007586625'].title },
]

/** The start route: a plain "#name" from the host, nothing else. The URL is never written. */
const START: Record<string, string> = { siandien: '#/siandien', rinka: '#/rinka', stebimi: '#/stebimi', paieska: '#/paieska', pradzia: '#/pradzia', prisijungti: '#/prisijungti' }
function startRoute() {
  try {
    const h = (window.location.hash || '').replace(/^#/, '')
    if (h && !h.includes('/') && START[h]) return START[h]
  } catch {
    // a sandbox may refuse to show the location; start at the beginning
  }
  return '#/pradzia'
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // Routing lives in state only: the route and an internal back stack
  const [nav, setNav] = useState(() => ({ stack: [startRoute()], popped: false }))
  const route = nav.stack[nav.stack.length - 1]
  const popped = nav.popped

  const go = useCallback((hash: string) => {
    setNav((n) => (n.stack[n.stack.length - 1] === hash ? n : { stack: [...n.stack, hash], popped: false }))
    setSheet(null)
  }, [])

  const back = useCallback((fallback: string) => {
    setNav((n) => (n.stack.length > 1 ? { stack: n.stack.slice(0, -1), popped: true } : { stack: [fallback], popped: false }))
    setSheet(null)
  }, [])

  // For the test scripts only: jump to a route
  useEffect(() => {
    const w = window as unknown as { __gausGo?: (h: string) => void; __gausRoute?: string }
    w.__gausGo = go
    w.__gausRoute = route
  }, [go, route])

  const stack = { current: nav.stack }
  const prev = stack.current.length > 1 ? stack.current[stack.current.length - 2] : null

  const [followed, setFollowed] = useState<Set<string>>(() => new Set(['10383512', '10224312', ...START_WATCHED.map((e) => e.key)]))
  const [watched, setWatched] = useState<Entity[]>(START_WATCHED)
  const [stages, setStages] = useState<Partial<Record<TenderId, number>>>({ '10383512': 1, '10224312': 0 })
  const [aside, setAsideList] = useState<TenderId[]>([])
  const [reading, setReading] = useState<Set<TenderId>>(() => new Set())
  const [area, setArea] = useState(0)
  const [query, setQuery] = useState('')
  const [kinds, setKinds] = useState([true, true, true, false, false])
  const [sheet, setSheet] = useState<Sheet>(null)
  const [toast, setToast] = useState<Toast>(null)

  const isFollowed = useCallback((k: string) => followed.has(k), [followed])

  const toggleEntity = useCallback((e: Entity) => {
    setFollowed((s) => {
      const n = new Set(s)
      if (n.has(e.key)) {
        n.delete(e.key)
        setWatched((w) => w.filter((x) => x.key !== e.key))
      } else {
        n.add(e.key)
        setWatched((w) => [...w.filter((x) => x.key !== e.key), e])
      }
      return n
    })
  }, [])

  const followTender = useCallback((id: TenderId) => {
    setFollowed((s) => new Set(s).add(id))
    setStages((s) => ({ ...s, [id]: s[id] ?? 0 }))
    setAsideList((a) => a.filter((x) => x !== id))
  }, [])

  const unfollowTender = useCallback((id: TenderId) => setFollowed((s) => { const n = new Set(s); n.delete(id); return n }), [])

  const setStage = useCallback((id: TenderId, n: number) => setStages((s) => ({ ...s, [id]: n })), [])

  const toastN = useRef(0)
  const showToast = useCallback((t: Omit<NonNullable<Toast>, 'n'>) => setToast({ ...t, n: ++toastN.current }), [])
  const hideToast = useCallback(() => setToast(null), [])

  const restore = useCallback((id: TenderId) => setAsideList((a) => a.filter((x) => x !== id)), [])
  const setAside = useCallback(
    (id: TenderId) => {
      setAsideList((a) => (a.includes(id) ? a : [...a, id]))
      showToast({ text: 'Pirkimas atidėtas', action: { label: 'Grąžinti', run: () => restore(id) } })
    },
    [restore, showToast],
  )

  const read = useCallback((id: TenderId) => setReading((s) => new Set(s).add(id)), [])
  const toggleKind = useCallback((i: number) => setKinds((k) => k.map((v, j) => (j === i ? !v : v))), [])

  const value = useMemo<Store>(
    () => ({
      route, go, back, prev, followed, watched, isFollowed, toggleEntity, followTender, unfollowTender, stages, setStage, aside, setAside, restore,
      reading, read, area, setArea, query, setQuery, kinds, toggleKind, sheet, openSheet: setSheet, toast, showToast, hideToast, popped,
    }),
    [route, go, back, prev, followed, watched, isFollowed, toggleEntity, followTender, unfollowTender, stages, setStage, aside, setAside, restore, reading, read, area, query, kinds, toggleKind, sheet, toast, showToast, hideToast, popped],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
