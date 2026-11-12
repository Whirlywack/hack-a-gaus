import { t } from '../copy/register'

/** What a tender row needs to draw itself. Later tickets fill it from the database. */
export type TenderRowData = {
  title: string
  buyer: string
  /** Whole days left until the deadline, drawn as the numeral: 7 → "7 d." */
  daysLeft: number
  /** The deadline as the row shows it. */
  feedDeadline: string
  urgent?: boolean
  /** The Notice's kind: a Public tender or a Market consultation. */
  kind: 'tender' | 'consultation'
}

/** The three stages of a followed tender. */
export const STAGES = [t('stage.watching'), t('stage.preparing'), t('stage.submitted')]
