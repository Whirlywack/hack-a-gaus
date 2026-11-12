/** What a tender row needs to draw itself. Later tickets fill it from the database. */
export type TenderRowData = {
  title: string
  buyer: string
  /** "Liko 7 d.": the digits are drawn as the numeral. */
  statusDays: string
  feedDeadline: string
  urgent?: boolean
  pill?: 'open' | 'consult'
}

import { t } from '../copy/register'

/** The three stages of a followed tender. */
export const STAGES = [t('stage.following'), t('stage.preparing'), t('stage.submitted')]
