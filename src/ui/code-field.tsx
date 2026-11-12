'use client'

import { OTPField } from '@base-ui/react/otp-field'
import { t } from '../copy/register'

export const CODE_LENGTH = 6

/** The 6-digit code from the sign-in e-mail: six ruled cells. Base UI supplies paste, focus movement and the one-time-code hint. */
export function CodeField({ value, onValueChange, onComplete, busy }: {
  value: string
  onValueChange: (value: string) => void
  onComplete?: (value: string) => void
  busy?: boolean
}) {
  return (
    <div className="su-code" data-busy={busy || undefined}>
      <span className="v-label">{t('code.label')}</span>
      <OTPField.Root
        className="su-code__cells"
        length={CODE_LENGTH}
        value={value}
        onValueChange={onValueChange}
        onValueComplete={onComplete}
        readOnly={busy}
        aria-label={t('code.aria')}
      >
        {Array.from({ length: CODE_LENGTH }, (_, i) => (
          <OTPField.Input key={i} className="su-code__cell b-code__cell" aria-label={`${i + 1} / ${CODE_LENGTH}`} />
        ))}
      </OTPField.Root>
    </div>
  )
}
