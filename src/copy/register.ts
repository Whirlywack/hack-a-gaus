// The copy register: every interface string in one place.
//
// Each entry holds the English intent (what the string must make the user know
// or do), the Lithuanian text written from that intent, and whether the
// operator has approved it. New strings go in as `pending(...)`; the operator
// approves one by changing it to `approved(...)` (ticket #23). Components read
// strings with `t(key)` or `t(key, values)` and never hold Lithuanian text of
// their own.
//
// A text may hold {name} slots for values, and a text that counts something
// gives its three Lithuanian forms with the number as {n} (see `Counted`).
//
// Copy rules (spec, "Interface copy"): address the user as lowercase "jūs",
// quotes are „…“, no dashes, sentence case. `tests/copy.test.ts` checks the
// first three on every entry.

/** A text that counts something, in its three Lithuanian forms. Each form
 * holds the number as {n}: "{n} sritis", "{n} sritys", "{n} sričių". */
export type Counted = {
  /** 1, 21, 31, 101 … */
  one: string
  /** 2 to 9, 22 to 29 … */
  few: string
  /** 0, 10 to 20, 30 … */
  other: string
}

/** Lithuanian text, which may hold {name} slots for values. */
export type CopyText = string | Counted

export type CopyEntry = {
  /** What the string must make the user know or do. */
  en: string
  /** The Lithuanian text shown on screen. */
  lt: CopyText
  /** True once the operator has approved this Lithuanian text. */
  approved: boolean
}

/** A string written but not yet approved by the operator. */
const pending = (en: string, lt: CopyText): CopyEntry => ({ en, lt, approved: false })

/** A string the operator has approved. Only the operator changes an entry to this. */
const approved = (en: string, lt: CopyText): CopyEntry => ({ en, lt, approved: true })

export const COPY = {
  // Navigation and chrome
  'nav.today': pending('Tab: the screen with today\'s tenders', 'Šiandien'),
  'nav.following': pending('Tab: the tenders the user follows', 'Stebimi'),
  'nav.tender': pending('Name of the tender screen, used as the label of a back link that returns to it', 'Pirkimas'),
  'nav.account': pending('Screen reader label of the account button', 'Paskyra'),
  'sheet.close': pending('Screen reader label of the button that closes a bottom sheet', 'Uždaryti'),
  'back.today': pending('Back link that returns to the Today screen', 'Šiandien'),
  'meta.description': pending('Page description for search engines', 'Viešieji pirkimai Lietuvoje, kurie tinka jūsų įmonei.'),

  // Following and tender rows
  'follow.off': pending('Button: start following this tender', 'Stebėti'),
  'follow.on': pending('Button state: the user already follows this tender', 'Stebiu'),
  'stage.watching': pending('Stage 1 of a followed tender: only watching it', 'Stebiu'),
  'stage.preparing': pending('Stage 2 of a followed tender: preparing a bid', 'Rengiu'),
  'stage.submitted': pending('Stage 3 of a followed tender: the bid has been submitted', 'Pateikiau'),
  'unit.days': pending('Unit after the number of days left, abbreviated', 'd.'),
  'tender.consultation': pending('Tag on a row that is a market consultation, not a tender yet', 'Rinkos konsultacija'),

  // Pradžia (start)
  'start.title': pending('Question that opens the start flow', 'Kokius darbus dirbate?'),
  'start.text': pending(
    'Tells the user to describe their work freely and what they get in return',
    'Parašykite savais žodžiais. Parodysime viešuosius pirkimus, kuriuose galite dalyvauti.',
  ),
  'start.field.label': pending('Label of the text field where the user describes their work', 'Darbai'),
  'start.field.placeholder': pending('Example shown inside the empty field', 'pvz., gatvių remontas, šaligatviai'),
  'start.next': pending('Button that moves to the next step', 'Toliau'),
  'start.signin': pending('Link for a returning user', 'Prisijungti'),

  // E-mail code
  'code.label': pending('Label of the 6-digit code field', 'Kodas iš laiško'),
  'code.aria': pending('Screen reader label of the 6-digit code field', '6 skaitmenų kodas iš laiško'),

  // Šiandien
  'today.answer': pending('Answer sentence of the Today screen while it has no data', 'Čia matysite naujus pirkimus.'),
  'today.note': pending('Supporting line: matching tenders are not loaded yet', 'Tinkami pirkimai dar neįkelti.'),

  // Stebimi
  'following.answer': pending('Answer sentence of the Following screen', 'Čia matysite stebimus pirkimus.'),
  'following.note': pending('Supporting line: the user follows no tender yet', 'Dar nestebite nė vieno pirkimo.'),

  // Pirkimas
  'tender.answer': pending('Answer sentence of the tender page while it is not built', 'Pirkimo puslapio dar nėra.'),
  'tender.note': pending(
    'Supporting line: each tender will open here with what the buyer asks for',
    'Čia atsivers kiekvienas pirkimas su tuo, ko prašo pirkėjas.',
  ),

  // An address that leads nowhere
  'notFound.answer': pending('Answer sentence of the page shown for an address that does not exist', 'Tokio puslapio nėra.'),
  'notFound.note': pending('Supporting line: tells the user to check the address', 'Patikrinkite, ar adresas teisingas.'),
} satisfies Record<string, CopyEntry>

export type CopyKey = keyof typeof COPY

/** Values for a text's {name} slots. Numbers are written the Lithuanian way: "1 468". */
export type CopyValues = Record<string, string | number>

const NUMBER = new Intl.NumberFormat('lt-LT')
const PLURAL = new Intl.PluralRules('lt-LT')

/** The form a counted text takes for a whole number n. */
function countedForm(counted: Counted, n: CopyValues[string] | undefined): string {
  if (typeof n !== 'number' || !Number.isInteger(n)) throw new Error(`Counted text "${counted.other}" needs a whole number n, got ${n}`)
  const category = PLURAL.select(n)
  return category === 'one' || category === 'few' ? counted[category] : counted.other
}

/** A register text as the screen shows it: a counted text in the form its n
 * asks for, and each {name} slot holding its value. */
export function render(lt: CopyText, values: CopyValues = {}): string {
  const text = typeof lt === 'string' ? lt : countedForm(lt, values.n)
  return text.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = values[name]
    if (value === undefined) throw new Error(`Copy text "${text}" needs a value for {${name}}`)
    return typeof value === 'number' ? NUMBER.format(value) : value
  })
}

/** The Lithuanian text for a key, with its values filled in. */
export const t = (key: CopyKey, values?: CopyValues): string => render(COPY[key].lt, values)
