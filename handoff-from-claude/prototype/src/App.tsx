import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { StoreProvider, useStore } from './store'
import { ModeCtx } from './mode'
import { DeskTop, RuleTabs, TabBar } from './ui'
import { AllScreens, Sheets, ToastHost } from './overlays'
import { Feed } from './screens/feed'
import { FinishedScreen, TenderScreen } from './screens/tender'
import { BuyerScreen } from './screens/buyer'
import { FirmScreen } from './screens/firm'
import { Following } from './screens/following'
import { Market } from './screens/market'
import { Search } from './screens/search'
import { Setup, SignIn } from './screens/setup'
import { isTenderId } from './data'

/** Narrower than 700px: the app fills the box it is given (no matchMedia needed). */
function useNarrow() {
  const width = () => {
    try {
      return document.documentElement.clientWidth || window.innerWidth || 390
    } catch {
      return 390
    }
  }
  const [w, setW] = useState(width)
  useEffect(() => {
    const on = () => setW(width())
    window.addEventListener('resize', on)
    window.addEventListener('orientationchange', on)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('orientationchange', on)
    }
  }, [])
  return w < 700
}

const TAB_OF: Record<string, number> = { siandien: 0, stebimi: 1, rinka: 2, paieska: 3 }

/** The screen for a route, and the tab it belongs to. */
function resolve(route: string, lastTab: number): { node: ReactNode; tab: number | null; setup?: boolean } {
  const [a, b, c] = route.slice(2).split('/')
  switch (a) {
    case 'pradzia': return { node: <Setup step={b} />, tab: null, setup: true }
    case 'prisijungti': return { node: <SignIn />, tab: null, setup: true }
    case 'siandien': return { node: <Feed />, tab: 0 }
    case 'stebimi': return { node: <Following />, tab: 1 }
    case 'rinka': return { node: <Market sub={b} />, tab: 2 }
    case 'paieska': return { node: <Search />, tab: 3 }
    case 'pirkimas':
      if (b === 'baigtas-1' || b === 'baigtas-2') return { node: <FinishedScreen id={b} />, tab: lastTab }
      if (b && isTenderId(b)) return { node: <TenderScreen id={b} />, tab: lastTab }
      break
    case 'pirkejas': return { node: <BuyerScreen sub={c} />, tab: lastTab }
    case 'imone': return { node: <FirmScreen sub={c} />, tab: lastTab }
  }
  return { node: <Feed />, tab: 0 }
}

/** Scroll: top on a new screen, back where it was on the way back. */
function useScrollMemory(route: string, popped: boolean, getEl: () => HTMLElement | Window | null) {
  const saved = useRef<Record<string, number>>({})
  const cur = useRef(route)
  useEffect(() => {
    const el = getEl()
    if (!el) return
    const on = () => {
      saved.current[cur.current] = el instanceof Window ? window.scrollY : el.scrollTop
    }
    el.addEventListener('scroll', on, { passive: true })
    return () => el.removeEventListener('scroll', on)
  })
  useLayoutEffect(() => {
    cur.current = route
    const el = getEl()
    if (!el) return
    const y = popped ? saved.current[route] ?? 0 : 0
    if (el instanceof Window) window.scrollTo(0, y)
    else el.scrollTop = y
  }, [route])
}

function Screen({ wide }: { wide: boolean }) {
  const { route, popped } = useStore()
  const lastTab = useRef(0)
  const r = resolve(route, lastTab.current)
  if (r.tab !== null) lastTab.current = r.tab
  const [a] = route.slice(2).split('/')
  if (TAB_OF[a] !== undefined) lastTab.current = TAB_OF[a]
  const scroller = useRef<HTMLDivElement>(null)
  useScrollMemory(route, popped, () => (wide ? window : scroller.current))

  if (wide)
    return (
      <div className="v-desk">
        <div className="v-desk__frame">
          <DeskTop active={r.tab ?? -1} plain={r.setup} />
          <div className="v-dpage v-screen" key={route}>{r.node}</div>
        </div>
      </div>
    )
  return (
    <div className="v-app" data-setup={r.setup || undefined}>
      <div className="v-scroll" ref={scroller}>
        <div className="v-page v-screen" key={route}>{r.node}</div>
      </div>
      {!r.setup && <TabBar active={r.tab ?? 0} />}
    </div>
  )
}

const FRAME_W = 416
const FRAME_H = 870

function Shell() {
  const narrow = useNarrow()
  const [mode, setMode] = useState(0)
  const wide = !narrow && mode === 1

  // The drawn phone shrinks to fit a short window
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 96) / FRAME_H, (window.innerWidth - 32) / FRAME_W))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.mode = narrow ? 'native' : wide ? 'desktop' : 'frame'
  }, [narrow, wide])

  const app = (
    <ModeCtx.Provider value={{ wide }}>
      <Screen wide={wide} />
      <Sheets />
      <ToastHost />
    </ModeCtx.Provider>
  )

  if (narrow) return <div className="v-native">{app}</div>

  return (
    <>
      <div className="v-switch" data-wide={wide || undefined}>
        <RuleTabs items={['Telefonas', 'Kompiuteris']} value={mode} onChange={setMode} className="v-modeseg" />
      </div>
      {wide ? (
        app
      ) : (
        <div className="v-stagewrap" style={{ width: FRAME_W * scale, height: FRAME_H * scale }}>
          <div className="v-phonebox v-brk" style={{ transform: `scale(${scale})` }}>
            <div className="v-phone">
              <div className="v-inframe">{app}</div>
            </div>
          </div>
        </div>
      )}
      <AllScreens />
    </>
  )
}

export default function App() {
  return (
    <div className="v" lang="lt">
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </div>
  )
}
