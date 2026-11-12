import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Btn, Icon, Sec, TenderRow, TextBtn, Wordmark, idx } from '../ui'
import { CheckBox, Field } from '../parts'
import { TENDERS, type TenderId } from '../data'
import { useStore } from '../store'
import { useWide } from '../mode'

// The start flow: the one place where the accent floods. A blue block carries
// the step (back, progress, the question); the ground under it holds the
// fields; the action is pinned at the bottom. Nothing typed is stored or sent.

const KINDS = [
  { name: 'Kelių remonto darbai', count: '471 sutartis', ex: '„Privažiavimo prie malkinės Ežero g. 26 Daugų m., Daugų sen. paprastojo remonto darbai“' },
  { name: 'Kelių priežiūros darbai', count: '268 sutartys', ex: '„Paluknio seniūnijos vietinės reikšmės kelių (gatvių) su žvyro danga profiliavimas“' },
  { name: 'Gatvių dangos darbai', count: '115 sutarčių', ex: '„Skuodo miesto Krantinės gatvės Nr. SM-23 paprastojo remonto darbai“' },
  { name: 'Įvairūs dangos darbai', count: '87 sutartys', ex: '„Indukcinių kontūrų įrengimo kelio dangoje darbai“' },
  { name: 'Pėsčiųjų takų dangos darbai', count: '60 sutarčių', ex: '„Kolumbariumo aikštelės įrengimo darbai Stipirkių kapinėse“' },
]

const FOUND: TenderId[] = ['10377061', '10383512', '10224312']
const noop = () => {}

/** Step 3's three tenders: Feed rows C, A and B (not tappable). */
function Found() {
  return (
    <div className="su-found">
      {FOUND.map((id) => <TenderRow key={id} t={TENDERS[id]} onClick={noop} />)}
    </div>
  )
}

/** Three thin rules for the numbered steps; those up to this one in the ground colour. */
function Progress({ at }: { at: number }) {
  return (
    <ol className="su-prog" aria-label={`${at} iš 3`}>
      {[1, 2, 3].map((n) => (
        <li key={n} className="su-prog__step" data-on={n <= at || undefined} aria-current={n === at ? 'step' : undefined}>
          <span className="su-prog__n">{idx(n)}</span>
        </li>
      ))}
    </ol>
  )
}

function Step({ link, back, progress, title, text, children, content = 'pad', primary, under, proof }: {
  link?: ReactNode; back?: string; progress?: number; title: string; text?: ReactNode; children?: ReactNode
  /** How the content sits on the ground: padded fields, or full-bleed ruled rows. */
  content?: 'pad' | 'bleed'
  primary?: ReactNode; under?: ReactNode; proof?: 'full' | 'card'
}) {
  const wide = useWide()
  const { back: goBack } = useStore()
  const flood = (
    <div className="su-flood">
      <div className="su-top">
        <div className="su-top__left">
          {back && (
            <button type="button" aria-label="Atgal" className="su-back" onClick={() => goBack(back)}>
              <Icon name="arrow-left" size={20} />
            </button>
          )}
          {!wide && <Wordmark />}
        </div>
        {link}
      </div>
      {progress !== undefined && <Progress at={progress} />}
      <h1 className="v-display su-title">{title}</h1>
      {text && <p className="su-text">{text}</p>}
    </div>
  )
  const body = children && <div className="su-content" data-bleed={content === 'bleed' || undefined}>{children}</div>
  const actions = (
    <div className="su-acts">
      {primary}
      {under && <div className="su-under">{under}</div>}
    </div>
  )
  if (wide)
    return (
      <div className="su-desk">
        {flood}
        <div className="su-right">
          {body}
          {proof === 'card' && <div className="su-proof is-lead"><Found /></div>}
          {actions}
          {proof === 'full' && <Sec label="Štai ką radome" className="su-proof"><Found /></Sec>}
        </div>
      </div>
    )
  return (
    <div className="su-page">
      {flood}
      {body}
      <div className="su-spacer" />
      {actions}
    </div>
  )
}

function TextLink({ children, to, onFlood }: { children: ReactNode; to: string; onFlood?: boolean }) {
  const { go } = useStore()
  return onFlood
    ? <button type="button" className="su-toplink" onClick={() => go(to)}>{children}</button>
    : <TextBtn onClick={() => go(to)}>{children}</TextBtn>
}

function Primary({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div className="su-primary">
      <Btn kind="primary" wide disabled={disabled} onClick={onClick} trailing={<Icon name="arrow-right" size={18} />}>{label}</Btn>
    </div>
  )
}

// ---------- E-mail confirmation ----------

/** The address typed on the account step, held in memory only so the next
 * screen can repeat it back. Never stored, logged or sent; cleared on the way in. */
let typedEmail = ''

/** Seconds before another code can be asked for. */
const RESEND_WAIT = 60
const CODE_LEN = 6
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** The code from the letter: one real input (so paste and the phone's code
 * suggestion work) drawn as six ruled cells that share their borders. */
export function CodeCells({ value, onChange, busy, autoFocus }: { value: string; onChange: (v: string) => void; busy?: boolean; autoFocus?: boolean }) {
  const [focus, setFocus] = useState(!!autoFocus)
  const input = useRef<HTMLInputElement>(null)
  // If the browser did not give the focus on arrival, do not draw it
  useEffect(() => { setFocus(document.activeElement === input.current) }, [])
  return (
    <label className="su-code" data-focus={focus || undefined} data-busy={busy || undefined}>
      <span className="v-label">Kodas iš laiško</span>
      <span className="su-code__cells">
        {Array.from({ length: CODE_LEN }, (_, i) => (
          <span key={i} className="su-code__cell" data-at={(focus && !busy && i === Math.min(value.length, CODE_LEN - 1)) || undefined} data-caret={(focus && !busy && i === value.length) || undefined} aria-hidden>
            {value[i] ?? ''}
          </span>
        ))}
        <input
          ref={input}
          className="su-code__input"
          autoFocus={autoFocus}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={CODE_LEN}
          aria-label="6 skaitmenų kodas iš laiško"
          value={value}
          readOnly={busy}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, CODE_LEN))}
        />
      </span>
    </label>
  )
}

/** After "Sukurti paskyrą": the address is confirmed with a code from a letter.
 * In this prototype any six digits pass; 000000 shows the wrong-code state. */
function Verify() {
  const { go } = useStore()
  const [code, setCode] = useState('')
  const [state, setState] = useState<'idle' | 'checking' | 'wrong'>('idle')
  const [left, setLeft] = useState(RESEND_WAIT)
  const [resent, setResent] = useState(false)
  const timer = useRef<number>()
  const email = typedEmail.trim() || 'vardas@imone.lt'

  useEffect(() => () => window.clearTimeout(timer.current), [])
  useEffect(() => {
    if (left <= 0) return
    const t = window.setTimeout(() => setLeft((l) => l - 1), 1000)
    return () => window.clearTimeout(t)
  }, [left])

  const check = (v: string) => {
    setState('checking')
    timer.current = window.setTimeout(() => {
      if (v === '000000') {
        setCode('')
        setState('wrong')
        return
      }
      typedEmail = ''
      go('#/siandien')
    }, 700)
  }
  const type = (v: string) => {
    setCode(v)
    if (state === 'wrong') setState('idle')
    if (v.length === CODE_LEN) check(v)
  }
  const resend = () => {
    setCode('')
    setState('idle')
    setResent(true)
    setLeft(RESEND_WAIT)
  }

  return (
    <Step
      back="#/pradzia/paskyra"
      title="Patikrinkite el. paštą"
      text={<>Adresu <span className="su-email">{email}</span> išsiuntėme 6{'\u00a0'}skaitmenų kodą.</>}
      primary={<Primary label="Patvirtinti" disabled={code.length < CODE_LEN || state === 'checking'} onClick={() => check(code)} />}
      proof="full"
      content="bleed"
    >
      <div className="su-verify">
        <CodeCells value={code} onChange={type} busy={state === 'checking'} autoFocus />
        <div className="su-verify__status" role="status" aria-live="polite">
          {state === 'checking' && <><span className="v-spin" />Tikriname</>}
          {state === 'wrong' && (
            <span className="su-wrong">
              <span className="su-wrong__mark"><Icon name="x" size={13} stroke={2.25} /></span>
              Kodas netinka. Įveskite kodą iš naujausio laiško.
            </span>
          )}
          {state === 'idle' && (resent ? 'Išsiuntėme naują kodą. Ankstesnis nebegalioja.' : 'Kodas galioja 1 valandą.')}
        </div>
      </div>
      <div className="su-help">
        <div className="su-help__row">
          <span className="su-help__q">
            <span className="su-help__name">Negavote laiško?</span>
            <span className="v-small">Patikrinkite šlamšto aplanką.</span>
          </span>
          {left > 0
            ? <span className="su-help__wait">Siųsti dar kartą po <span className="su-help__clock">{clock(left)}</span></span>
            : <TextBtn onClick={resend}>Siųsti dar kartą</TextBtn>}
        </div>
        <div className="su-help__row">
          <span className="su-help__q">
            <span className="su-help__name">Ne tas adresas?</span>
          </span>
          <TextBtn onClick={() => go('#/pradzia/paskyra')}>Pakeisti el. paštą</TextBtn>
        </div>
      </div>
    </Step>
  )
}

export function Setup({ step }: { step?: string }) {
  const { go, kinds, toggleKind } = useStore()
  const wide = useWide()
  const primary = (label: string, to: string, disabled?: boolean) => <Primary label={label} disabled={disabled} onClick={() => go(to)} />

  if (step === 'kodas')
    return (
      <Step back="#/pradzia" progress={1} title="Įveskite įmonės kodą" text="Parodysime, kokių darbų sutartis jau laimėjote, ir pažymėsite tinkamus." primary={primary('Toliau', '#/pradzia/darbai')} under={<TextLink to="#/pradzia">Geriau aprašysiu žodžiais</TextLink>}>
        <Field label="Įmonės kodas" placeholder="9 skaitmenys" inputMode="numeric" />
      </Step>
    )
  if (step === 'darbai')
    return (
      <Step back="#/pradzia" progress={2} title="Pažymėkite, kas jums tinka" text="Tokių darbų pirkėjai ieškojo per pastaruosius 12 mėnesių." primary={primary('Toliau', '#/pradzia/pirkimai', !kinds.some(Boolean))} proof="full" content="bleed">
        <div className="su-kinds">
          {KINDS.map((k, i) => (
            <button type="button" key={k.name} role="checkbox" aria-checked={kinds[i]} data-tap="" className="su-kind" onClick={() => toggleKind(i)}>
              <CheckBox on={kinds[i]} />
              <span className="su-kind__body">
                <span className="su-kind__head">
                  <span className="su-kind__name">{k.name}</span>
                  <span className="su-kind__count">{k.count}</span>
                </span>
                <span className="su-kind__ex clamp2">pvz., {k.ex}</span>
              </span>
            </button>
          ))}
        </div>
      </Step>
    )
  if (step === 'pirkimai')
    return (
      <Step back="#/pradzia/darbai" progress={3} title="Štai ką radome" text="Šie pirkimai atviri dabar ir atitinka jūsų darbus." primary={primary('Rodyti mano pirkimus', '#/pradzia/paskyra')} proof={wide ? 'card' : undefined} content="bleed">
        {/* On desktop the rows sit in the proof place instead */}
        {!wide && <Found />}
      </Step>
    )
  if (step === 'patvirtinimas') return <Verify />
  if (step === 'paskyra')
    return (
      <Step back="#/pradzia/pirkimai" title="Sukurkite paskyrą" text="Išsaugosime jūsų pasirinkimus ir pranešime apie naujus pirkimus." primary={primary('Sukurti paskyrą', '#/pradzia/patvirtinimas')} under={<TextLink to="#/prisijungti">Jau turite paskyrą? Prisijungti</TextLink>} proof="full">
        <div className="su-fields">
          <Field label="El. paštas" placeholder="vardas@imone.lt" type="email" inputMode="email" defaultValue={typedEmail} onChange={(v) => { typedEmail = v }} />
          <Field label="Slaptažodis" type="password" autoComplete="new-password" />
        </div>
      </Step>
    )
  return (
    <Step link={<TextLink onFlood to="#/prisijungti">Prisijungti</TextLink>} progress={1} title="Kokius darbus atliekate?" text="Parašykite savais žodžiais. Parodysime viešuosius pirkimus, kuriuose galite dalyvauti." primary={primary('Toliau', '#/pradzia/darbai')} under={<TextLink to="#/pradzia/kodas">Jau laimėjote viešųjų pirkimų? Įveskite įmonės kodą</TextLink>}>
      <Field label="Jūsų darbai" placeholder="pvz., gatvių remontas, šaligatviai" defaultValue="kelių ir gatvių remontas" />
    </Step>
  )
}

export function SignIn() {
  const { go } = useStore()
  const [forgot, setForgot] = useState(false)
  const [sent, setSent] = useState(false)
  return (
    <Step title="Prisijungti" primary={<Primary label="Prisijungti" onClick={() => go('#/siandien')} />} under={<TextLink to="#/pradzia">Dar neturite paskyros? Pradėti</TextLink>}>
      <div className="su-fields">
        <Field label="El. paštas" placeholder="vardas@imone.lt" type="email" inputMode="email" />
        <Field label="Slaptažodis" type="password" autoComplete="current-password" />
      </div>
      <div className="su-forgot">
        <button type="button" aria-expanded={forgot} className="v-textbtn su-forgot__toggle" onClick={() => setForgot((f) => !f)}>
          Pamiršote slaptažodį?
          <span className="su-chev" data-open={forgot || undefined}><Icon name="chevron-down" size={15} /></span>
        </button>
        {forgot && (
          <div className="su-forgot__block">
            <span className="su-forgot__text">Atsiųsime nuorodą slaptažodžiui pakeisti.</span>
            {sent ? (
              <span className="su-sent" role="status">
                <span className="su-sent__mark"><Icon name="check" size={13} stroke={2.25} /></span>
                Nuoroda išsiųsta.
              </span>
            ) : (
              <>
                <Field label="El. paštas" placeholder="vardas@imone.lt" type="email" inputMode="email" />
                <div><Btn onClick={() => setSent(true)}>Siųsti</Btn></div>
              </>
            )}
          </div>
        )}
      </div>
    </Step>
  )
}
