// The spec's copy rules ("Interface copy"), as checks over one Lithuanian text.

export type CopyRule = 'jūs' | 'quotes' | 'dash'

/** Figure, en and em dashes, the horizontal bar, the minus sign, and a hyphen
 * standing between spaces as a dash. A hyphen inside a word is fine. */
const DASH = /[‒–—―−]|\s-\s/

/** "jūs" and its cases, capitalised. Allowed only where a sentence starts. */
const CAPITAL_JUS = /(?<!^|[.!?…]\s+)(?<![\p{L}\p{N}])(?:Jūs|Jūsų|Jums|Jus|Jumis|Jumyse)(?![\p{L}\p{N}])/u

/** Quote marks that are not Lithuanian: straight, English and single quotes. */
const FOREIGN_QUOTES = /["”‘’'«»]/

/** Every „ is closed by “ before the next one opens, and every “ closes a „. */
function quotesPaired(text: string): boolean {
  let open = false
  for (const ch of text) {
    if (ch === '„') {
      if (open) return false
      open = true
    } else if (ch === '“') {
      if (!open) return false
      open = false
    }
  }
  return !open
}

/** The rules a text breaks; empty when it keeps them all. */
export function copyRuleBreaks(text: string): CopyRule[] {
  const breaks: CopyRule[] = []
  if (CAPITAL_JUS.test(text)) breaks.push('jūs')
  if (FOREIGN_QUOTES.test(text) || !quotesPaired(text)) breaks.push('quotes')
  if (DASH.test(text)) breaks.push('dash')
  return breaks
}
