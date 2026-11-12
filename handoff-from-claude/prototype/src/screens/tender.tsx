import type { ReactNode } from 'react'
import { Back, Bar, Bracket, Btn, CellBtn, Icon, Label, Num, Sec, Stage, Tag, Tap, TextBtn, daysOf, idx } from '../ui'
import { D_SOURCE, FINISHED, JURBARKAS, NB, TENDERS, type FinishedId, type Tender, type TenderId } from '../data'
import { useStore } from '../store'
import { useWide } from '../mode'

const FOOTER = 'Perskaityta automatiškai iš pirkimo dokumentų. Prieš teikdami pasiūlymą pasitikrinkite originalus.'

// Strings read from the documents of tender 10377061 (see the screens document)
export const REQUIREMENTS: { label: string; answer: string; source?: { quote: string; file: string } }[] = [
  {
    label: 'Panašūs darbai',
    answer: `Per 5 metus atlikti gatvių ar kelių statybos, rekonstravimo ar remonto darbai už ne mažiau kaip 200${NB}000${NB}€ be PVM.`,
    source: {
      quote: `„…yra tinkamai atlikęs gatvių, kelių statybos, rekonstravimo ir / ar remonto darbus, kurių vertė yra ne mažesnė kaip 200${NB}000${NB}Eur be PVM.“`,
      file: '4 priedas. Kvalifikacijos reikalavimai.docx',
    },
  },
  { label: 'Specialistai', answer: 'Ypatingojo statinio statybos vadovas ir projekto vadovas (keliai ir gatvės), turintys kvalifikacijos atestatus.' },
  { label: 'Sertifikatai', answer: 'Aplinkos apsaugos vadybos sistema: ISO 14001, EMAS arba lygiavertė.' },
  { label: 'Pasiūlymo užtikrinimas', answer: 'Nereikalaujama.' },
  { label: 'Apyvarta', answer: 'Dokumentuose nenurodyta.' },
]

function Source({ quote, file }: { quote: string; file: string }) {
  return (
    <Bracket className="v-source">
      <span>{quote}</span>
      <span className="v-source__file"><Icon name="file" size={13} />{file}</span>
    </Bracket>
  )
}

const REQ_TITLE = 'Ko reikalauja šis pirkimas'

function Requirements({ t }: { t: Tender }) {
  const { reading, read } = useStore()
  if (t.req === 'consult')
    return (
      <Sec label="Rinkos konsultacija">
        <p className="v-note t-plain">Tai rinkos konsultacija: pirkėjas klausia tiekėjų nuomonės prieš skelbdamas pirkimą. Pasiūlymo teikti nereikia.</p>
      </Sec>
    )
  if (t.req === 'full')
    return (
      <Sec label={REQ_TITLE} n={REQUIREMENTS.length}>
        {REQUIREMENTS.map((r, i) => (
          <div key={r.label} className="v-req">
            <span className="v-idx">{idx(i + 1)}</span>
            <div className="v-req__body">
              <Label>{r.label}</Label>
              <div className="v-req__content">
                <div className="v-req__answer">{r.answer}</div>
                {r.source && <Source {...r.source} />}
              </div>
            </div>
          </div>
        ))}
        <p className="v-note">{FOOTER}</p>
      </Sec>
    )
  if (t.req === 'none')
    return (
      <Sec label={REQ_TITLE} n={0}>
        <div className="v-req">
          <span className="t-ok"><Icon name="check" size={16} stroke={2} /></span>
          <div className="v-req__body">
            <div className="v-req__content">
              <div className="v-req__answer v-strong">Specialių reikalavimų nėra.</div>
              <Source {...D_SOURCE} />
            </div>
          </div>
        </div>
        <p className="v-note">{FOOTER}</p>
      </Sec>
    )
  const on = reading.has(t.id)
  return (
    <Sec label={REQ_TITLE}>
      <div className="t-unread">
        {on ? (
          <div className="t-reading" role="status">
            <span className="v-spin" aria-hidden />
            <div>
              <div className="v-strong">Skaitome dokumentus…</div>
              <div className="v-small">Paprastai užtrunka iki minutės.</div>
            </div>
          </div>
        ) : (
          <>
            <p className="v-lead">Dokumentų dar neskaitėme. Perskaitysime, kai paprašysite.</p>
            <Btn onClick={() => read(t.id)} trailing={<Icon name="arrow-right" size={16} />}>Perskaityti dokumentus</Btn>
          </>
        )}
      </div>
    </Sec>
  )
}

function OutRow({ label, href }: { label: string; href: string }) {
  return (
    <a className="v-linkrow" href={href} target="_blank" rel="noopener noreferrer" data-tap="">
      <span className="v-linkrow__value">{label}</span>
      <span className="v-arrow"><Icon name="arrow-out" size={18} /></span>
    </a>
  )
}

function KeyFacts({ t }: { t: Tender }) {
  const facts = ['Vertinama pagal mažiausią kainą', 'Į dalis neskaidoma', 'Pasiūlymo užtikrinimo nereikia']
  return (
    <>
      {t.id === '10377061' && (
        <Sec label="Svarbiausia" n={facts.length}>
          {facts.map((f, i) => (
            <div key={f} className="v-fact"><span className="v-idx">{idx(i + 1)}</span><span>{f}</span></div>
          ))}
        </Sec>
      )}
      <div className="t-links">
        <OutRow label="Dokumentai" href={t.url} />
        {t.pill !== 'consult' && <OutRow label="Teikti pasiūlymą CVP IS" href={t.url} />}
      </div>
    </>
  )
}

/** "Pasiūlymus teikti iki lapkričio 24 d., 9:00" as a label and a date. */
function splitLine(line: string) {
  const i = line.indexOf(' iki ')
  return { label: line.slice(0, i + 4), date: line.slice(i + 5) }
}

function Status({ t }: { t: Tender }) {
  const s = splitLine(t.statusLine)
  return (
    <div className="v-cells v-status">
      <div className="v-cell">
        <Label>Liko</Label>
        <Num n={daysOf(t)} unit="d." urgent={t.urgent || t.pill === 'consult'} />
      </div>
      <div className="v-cell">
        <Label>{s.label}</Label>
        <div className="v-status__date">{s.date}</div>
      </div>
    </div>
  )
}

function Head({ t, back }: { t: Tender; back?: ReactNode }) {
  return (
    <div className="t-head">
      {back}
      <div className="t-tags">
        {t.pill === 'consult' ? <Tag>Rinkos konsultacija</Tag> : <Tag tone="solid">Atviras</Tag>}
        {t.kind && <span className="v-small">{t.kind}</span>}
      </div>
      <h1 className="v-title">{t.title}</h1>
    </div>
  )
}

function BuyerRow({ name, link }: { name: string; link?: boolean }) {
  const { go } = useStore()
  const body = (
    <>
      <span className="v-linkrow__body">
        <Label>Pirkėjas</Label>
        <span className="v-linkrow__value">{name}</span>
      </span>
      {link && <span className="v-arrow"><Icon name="arrow-right" size={18} /></span>}
    </>
  )
  return link ? <Tap className="v-linkrow" onClick={() => go('#/pirkejas/188713933')}>{body}</Tap> : <div className="v-linkrow" data-plain="">{body}</div>
}

function Actions({ t }: { t: Tender }) {
  const { isFollowed, followTender, unfollowTender, openSheet, stages, setStage } = useStore()
  if (isFollowed(t.id))
    return (
      <div className="v-stage">
        <Stage value={stages[t.id] ?? 0} onChange={(i) => setStage(t.id, i)} />
        <div className="v-stage__foot"><TextBtn quiet onClick={() => unfollowTender(t.id)}>Nebestebėti</TextBtn></div>
      </div>
    )
  return (
    <div className="v-cells">
      <CellBtn big onClick={() => openSheet({ type: 'neman', id: t.id, thenFeed: true })}>Ne man</CellBtn>
      <CellBtn big tone="fill" onClick={() => followTender(t.id)} icon={<Icon name="bookmark" size={16} />}>Stebėti</CellBtn>
    </div>
  )
}

export function TenderScreen({ id }: { id: TenderId }) {
  const t = TENDERS[id]
  const wide = useWide()
  const { go } = useStore()
  if (wide)
    return (
      <div className="v-cols t-cols">
        <main>
          <Head t={t} back={<div className="t-back"><Back fallback="#/siandien" /></div>} />
          <p className="t-why v-small">{t.why}</p>
          <Requirements t={t} />
        </main>
        <aside>
          <Status t={t} />
          <Actions t={t} />
          <KeyFacts t={t} />
          <Sec label="Pirkėjas" tone="plain">
            <div className="t-buyer">
              <div className="v-rowtitle">{t.buyer}</div>
              {t.buyerLink && (
                <>
                  <p className="v-small">Artimiausia ilgalaikė kelių ir gatvių darbų sutartis baigiasi lapkričio 19 d. Ją vykdo UAB „Jurmelsta“.</p>
                  <p className="v-small">Iš 97 sutarčių 38 laimėjo UAB „Jurmelsta“.</p>
                  <TextBtn onClick={() => go('#/pirkejas/188713933')} trailing={<Icon name="arrow-right" size={16} />}>Visa informacija apie pirkėją</TextBtn>
                </>
              )}
            </div>
          </Sec>
        </aside>
      </div>
    )
  return (
    <>
      <Bar left={<Back fallback="#/siandien" />} />
      <Head t={t} />
      <Status t={t} />
      <BuyerRow name={t.buyer} link={t.buyerLink} />
      <p className="t-why v-small">{t.why}</p>
      <Actions t={t} />
      <Requirements t={t} />
      <KeyFacts t={t} />
    </>
  )
}

export function FinishedScreen({ id }: { id: FinishedId }) {
  const f = FINISHED[id]
  const wide = useWide()
  const { go } = useStore()
  const head = (back?: ReactNode) => (
    <div className="t-head">
      {back}
      <div className="t-tags">
        <Tag>Baigtas</Tag>
        <span className="v-small">{f.signed}</span>
      </div>
      <h1 className="v-title">{f.title}</h1>
    </div>
  )
  const result = (
    <Sec label="Rezultatas">
      <div className="t-result">
        <div>
          <Label>Laimėjo</Label>
          {f.firmLink ? (
            <button type="button" className="t-result__name is-link" onClick={() => go('#/imone/158257064')}>{f.winner}<Icon name="arrow-right" size={16} /></button>
          ) : (
            <div className="t-result__name">{f.winner}</div>
          )}
        </div>
        <div>
          <Label>Sutarties vertė</Label>
          <div className="t-result__name">{f.amount}</div>
        </div>
      </div>
    </Sec>
  )
  if (wide)
    return (
      <div className="v-cols t-cols">
        <main>
          {head(<div className="t-back"><Back fallback="#/stebimi" /></div>)}
          {result}
        </main>
        <aside><BuyerRow name={JURBARKAS} link /></aside>
      </div>
    )
  return (
    <>
      <Bar left={<Back fallback="#/stebimi" />} />
      {head()}
      <BuyerRow name={JURBARKAS} link />
      {result}
    </>
  )
}
