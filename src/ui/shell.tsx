'use client'

import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DeskTop, TabBar } from './ui'
import { ModeCtx } from './mode'

// The page frame. A phone (under 700px) gets the full-screen app with the tab
// bar at the foot. A wider window gets the same blocks in the ruled sheet, at
// most 1,240px wide, with the top navigation. The prototype's stylesheets key
// off `html[data-mode]`, set here.

const QUERY = '(min-width: 700px)'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function useIsWide() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}

/** Setup screens (Pradžia, sign-in) have no tab bar and no top navigation links. */
const isSetup = (path: string) => path === '/pradzia' || path.startsWith('/pradzia/') || path === '/prisijungti'

export function Shell({ children }: { children: ReactNode }) {
  const wide = useIsWide()
  const path = usePathname()
  const setup = isSetup(path)

  useEffect(() => {
    document.documentElement.dataset.mode = wide ? 'desktop' : 'native'
  }, [wide])

  return (
    <ModeCtx.Provider value={{ wide }}>
      {wide ? (
        <div className="v-desk">
          <div className="v-desk__frame">
            <DeskTop plain={setup} />
            <main className="v-dpage v-screen">{children}</main>
          </div>
        </div>
      ) : (
        <div className="v-native">
          <div className="v-app" data-setup={setup || undefined}>
            <div className="v-scroll">
              <main className="v-page v-screen">{children}</main>
            </div>
            {!setup && <TabBar />}
          </div>
        </div>
      )}
    </ModeCtx.Provider>
  )
}
