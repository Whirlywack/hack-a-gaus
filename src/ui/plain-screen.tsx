'use client'

import { Answer, Bar, Wordmark } from './ui'
import { useWide } from './mode'
import { t, type CopyKey } from '../copy/register'

/** A screen that has its place in the visual system but no data yet: the bar, then the answer sentence. */
export function PlainScreen({ meta, answer, note }: { meta: CopyKey; answer: CopyKey; note: CopyKey }) {
  const wide = useWide()
  return (
    <>
      {!wide && <Bar left={<Wordmark />} />}
      <Answer meta={t(meta)}>
        {t(answer)} <span className="dim">{t(note)}</span>
      </Answer>
    </>
  )
}
