import { createContext, useContext } from 'react'

/** wide: the desktop page ("Kompiuteris"); otherwise a phone (frame or real). */
export const ModeCtx = createContext<{ wide: boolean }>({ wide: false })
export const useWide = () => useContext(ModeCtx).wide
