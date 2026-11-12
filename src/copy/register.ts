// The copy register: every interface string in one place.
//
// Each entry holds the English intent (what the string must make the user know
// or do), the Lithuanian text written from that intent, and whether the
// operator has approved it. Everything starts as `approved: false`; ticket #23
// is where the operator approves. Components read strings with `t(key)` and
// never hold Lithuanian text of their own.
//
// Copy rules (spec, "Interface copy"): address the user as lowercase "jūs",
// quotes are „…“, no dashes, sentence case.

export type CopyEntry = {
  /** What the string must make the user know or do. */
  en: string
  /** The Lithuanian text shown on screen. */
  lt: string
  /** True once the operator has approved this Lithuanian text. */
  approved: boolean
}

const entry = (en: string, lt: string): CopyEntry => ({ en, lt, approved: false })

export const COPY = {
  // Navigation and chrome
  'nav.today': entry('Tab: the screen with today\'s tenders', 'Šiandien'),
  'nav.following': entry('Tab: the tenders the user follows', 'Stebimi'),
  'nav.account': entry('Screen reader label of the account button', 'Paskyra'),
  'sheet.close': entry('Screen reader label of the button that closes a bottom sheet', 'Uždaryti'),
  'back.today': entry('Back link that returns to the Today screen', 'Šiandien'),
  'meta.description': entry('Page description for search engines', 'Viešieji pirkimai Lietuvoje, kurie tinka jūsų įmonei.'),

  // Following and tender rows
  'follow.off': entry('Button: start following this tender', 'Stebėti'),
  'follow.on': entry('Button state: the user already follows this tender', 'Stebiu'),
  'stage.following': entry('Stage 1 of a followed tender: only watching it', 'Stebiu'),
  'stage.preparing': entry('Stage 2 of a followed tender: preparing a bid', 'Rengiu'),
  'stage.submitted': entry('Stage 3 of a followed tender: the bid has been submitted', 'Pateikiau'),
  'unit.days': entry('Unit after the number of days left, abbreviated', 'd.'),
  'tender.consultation': entry('Tag on a row that is a market consultation, not a tender yet', 'Rinkos konsultacija'),

  // Pradžia (start)
  'start.title': entry('Question that opens the start flow', 'Kokius darbus dirbate?'),
  'start.text': entry(
    'Tells the user to describe their work freely and what they get in return',
    'Parašykite savais žodžiais. Parodysime viešuosius pirkimus, kuriuose galite dalyvauti.',
  ),
  'start.field.label': entry('Label of the text field where the user describes their work', 'Darbai'),
  'start.field.placeholder': entry('Example shown inside the empty field', 'pvz., gatvių remontas, šaligatviai'),
  'start.next': entry('Button that moves to the next step', 'Toliau'),
  'start.signin': entry('Link for a returning user', 'Prisijungti'),
  'start.codeLink': entry(
    'Link offering the other way to start: enter the company code of a firm that has already won tenders',
    'Jau laimėjote viešųjų pirkimų? Įveskite įmonės kodą',
  ),

  // E-mail code
  'code.label': entry('Label of the 6-digit code field', 'Kodas iš laiško'),
  'code.aria': entry('Screen reader label of the 6-digit code field', '6 skaitmenų kodas iš laiško'),

  // Šiandien
  'today.answer': entry('Answer sentence of the Today screen while it has no data', 'Čia matysite naujus pirkimus.'),
  'today.note': entry('Supporting line: matching tenders are not loaded yet', 'Tinkami pirkimai dar neįkelti.'),

  // Stebimi
  'following.answer': entry('Answer sentence of the Following screen', 'Čia matysite stebimus pirkimus.'),
  'following.note': entry('Supporting line: the user follows no tender yet', 'Dar nestebite nė vieno pirkimo.'),

  // Pirkimas
  'tender.answer': entry('Answer sentence of the tender page while it is not built', 'Pirkimo puslapio dar nėra.'),
  'tender.note': entry(
    'Supporting line: each tender will open here with what the buyer asks for',
    'Čia atsivers kiekvienas pirkimas su tuo, ko prašo pirkėjas.',
  ),
} satisfies Record<string, CopyEntry>

export type CopyKey = keyof typeof COPY

/** The Lithuanian text for a key. */
export const t = (key: CopyKey): string => COPY[key].lt
