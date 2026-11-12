'use client'

import type { InputHTMLAttributes, ReactNode } from 'react'
import { Icon, Label, Tap } from './ui'

// Blocks from the prototype's parts.tsx that the screens in this build use:
// the plain row (Stebimi's finished tenders) and the field and check box
// (Pradžia). The prototype's blocks for the Pirkėjas, Įmonė and Rinka screens
// are out of scope and were not carried over.

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
