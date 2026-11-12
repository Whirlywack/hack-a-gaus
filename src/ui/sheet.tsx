'use client'

import type { ReactNode } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Icon } from './ui'
import { t } from '../copy/register'

/** The bottom sheet. Base UI supplies focus trapping, Escape, and the dialog roles; the look is ours. */
export function Sheet({ open, onOpenChange, title, children }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="b-backdrop" />
        <Dialog.Popup className="b-sheet">
          <div className="o-head">
            <Dialog.Title className="v-label">{title}</Dialog.Title>
            <Dialog.Close className="o-x" aria-label={t('sheet.close')}>
              <Icon name="x" size={16} />
            </Dialog.Close>
          </div>
          <div className="o-body">{children}</div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
