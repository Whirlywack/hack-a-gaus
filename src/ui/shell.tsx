'use client'

import { useEffect, useSyncExternalStore, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { DeskTop, TabBar } from './ui'
import { ModeCtx } from './mode'
import { WIDE_QUERY } from './wide'

// The page frame. A phone (under 700px) gets the full-screen app with the tab
// bar at the foot. A wider window gets the same blocks in the ruled sheet, at
// most 1,240px wide, with the top navigation. The prototype's stylesheets key
// off `html[data-mode]`, which MODE_SCRIPT sets before the first paint.
//
// The server cannot know the window's width, so it sends the phone layout. On
// a wide window that layout stays hidden (base.css) until React swaps in the
// desktop frame. The page itself keeps its place in the tree in both layouts,
// so crossing 700px (a phone turned sideways) does not remount it and lose
// what the user typed.

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(WIDE_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function useWideWindow() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  )
}

/** Setup screens (Pradžia, sign-in) have no tab bar and no top navigation links. */
const isSetup = (path: string) => path === '/pradzia' || path.startsWith('/pradzia/') || path === '/prisijungti'

export function Shell({ children }: { children: ReactNode }) {
  const wide = useWideWindow()
  const path = usePathname()
  const setup = isSetup(path)

  useEffect(() => {
    document.documentElement.dataset.mode = wide ? 'desktop' : 'native'
  }, [wide])

  return (
    <ModeCtx.Provider value={{ wide }}>
      <div className={wide ? 'v-desk' : 'v-native'}>
        <div className={wide ? 'v-desk__frame' : 'v-app'} data-setup={(!wide && setup) || undefined}>
          {wide ? <DeskTop plain={setup} /> : null}
          <div className={wide ? undefined : 'v-scroll'}>
            <main className={wide ? 'v-dpage v-screen' : 'v-page v-screen'}>{children}</main>
          </div>
          {!wide && !setup ? <TabBar /> : null}
        </div>
      </div>
    </ModeCtx.Provider>
  )
}
