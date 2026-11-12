import type { ReactNode } from 'react'
import { Answer, Back, Bar, Bracket, FollowBtn, Label, Num, Sec, Tag } from '../ui'
import { Detail, EndingRow, Finding, MonthStrip, RankRows, ShareStrip, TradeTabs, type MonthCol, type RankItem, type Share } from '../parts'
import { buyerKey, JURBARKAS, JURBARKAS_CODE, NB } from '../data'
import { useStore } from '../store'
import { useWide } from '../mode'

const BASE = '#/pirkejas/188713933'

// Real data: Jurbarko rajono savivaldybės administracija, road and street works (see data/jurbarkas.md)
const SHARES: Share[] = [
  { n: 38, pct: `39${NB}%`, words: 'UAB „Jurmelsta“' },
  { n: 52, pct: `54${NB}%`, words: 'kitos 22' },
  { n: 7, pct: `7${NB}%`, words: 'nepaskelbta' },
]

type Ending = { id: string; date: string; dist: string; days: boolean; title: string; holder: string; value: string }

const ENDING: Ending[] = [
  { id: '2007586625', date: 'lapkričio 19 d.', dist: 'po 8 d.', days: true, title: 'Jurbarko rajono savivaldybės kelių su žvyro danga priežiūros (greideriavimo) darbai (3, 4, 5, 6, 7, 9, 10)', holder: 'UAB „Jurmelsta“', value: `103${NB}655${NB}€` },
  { id: '2007586576', date: 'lapkričio 20 d.', dist: 'po 9 d.', days: true, title: 'Jurbarko rajono savivaldybės kelių su žvyro danga priežiūros (greideriavimo) darbai (1, 2, 8, 11 pirkimo dalys)', holder: 'UAB „Dunokai“', value: `65${NB}927${NB}€` },
  { id: '2007342087', date: '2027 m. balandžio 4 d.', dist: 'po 5 mėn.', days: false, title: 'K. Donelaičio gatvės I etapo Jurbarko m., kapitalinis remontas ir lietaus nuotekų tinklų K. Donelaičio g., Jurbarko m., Jurbarko r. sav., atkarpos tarp P. Cvirkos ir Vasario 16-osios įrengimas', holder: 'UAB „Jurmelsta“', value: `547${NB}486${NB}€` },
  { id: '2007618702', date: '2027 m. balandžio 10 d.', dist: 'po 5 mėn.', days: false, title: 'Jurbarko rajono savivaldybės kelių su žvyro danga priežiūros (žvyravimo) darbai (2-11 pirkimo dalys)', holder: 'AB „Kelių priežiūra“', value: `351${NB}067${NB}€` },
  { id: '2007619198', date: '2027 m. balandžio 10 d.', dist: 'po 5 mėn.', days: false, title: 'Jurbarko rajono savivaldybės kelių su žvyro danga priežiūros (žvyravimo) darbai (1 pirkimo dalis)', holder: 'MB „Grysteka“', value: `56${NB}336${NB}€` },
]

const WINNERS: RankItem[] = [
  { name: 'UAB „Jurmelsta“', count: '38 sutartys', n: 38, typical: `įprasta vertė 72${NB}000${NB}€`, tone: 'lead' },
  { name: 'AB „Kelių priežiūra“', count: '12 sutarčių', n: 12, typical: `įprasta vertė 87${NB}400${NB}€` },
  { name: 'UAB „Keliukas“', count: '4 sutartys', n: 4, typical: `įprasta vertė 19${NB}300${NB}€` },
  { name: 'UAB „Dunokai“', count: '3 sutartys', n: 3, typical: `įprasta vertė 65${NB}900${NB}€` },
  { name: 'UAB „Nivelsta“', count: '3 sutartys', n: 3, typical: `įprasta vertė 50${NB}000${NB}€` },
  { name: 'Kitos 18 įmonių', count: '30 sutarčių', n: 30, tone: 'other' },
  { name: 'Tiekėjas dar nepaskelbtas', count: '7 sutartys', n: 7, tone: 'unknown' },
]
const WIN_TOTAL = 97

// The next 12 months from November 2026, and how many long contracts end in each
const MONTHS: MonthCol[] = [
  { squares: 2, sum: `169${NB}582${NB}€`, label: 'lapkritis' },
  { squares: 0 },
  { squares: 0, year: '2027' },
  { squares: 0 },
  { squares: 0 },
  { squares: 3, sum: `954${NB}889${NB}€`, label: 'balandis' },
  { squares: 0 }, { squares: 0 }, { squares: 0 }, { squares: 0 }, { squares: 0 }, { squares: 0 },
]

const GROUPS: { label: string; rows: Ending[] }[] = [
  { label: `Lapkritis · 2 sutartys · 169${NB}582${NB}€`, rows: ENDING.slice(0, 2) },
  { label: `2027 m. balandis · 3 sutartys · 954${NB}889${NB}€`, rows: ENDING.slice(2) },
]

function Follow() {
  const { isFollowed, toggleEntity } = useStore()
  const key = buyerKey(JURBARKAS)
  return <FollowBtn on={isFollowed(key)} onToggle={() => toggleEntity({ key, kind: 'Pirkėjas', name: JURBARKAS })} />
}

/** The name block of a buyer or a firm. */
export function EntityHead({ kind, code, name, right }: { kind: string; code: string; name: string; right?: ReactNode }) {
  return (
    <div className="e-head">
      <div className="e-head__text">
        <Label>{kind} · Įm. k. {code}</Label>
        <h1 className="v-title">{name}</h1>
      </div>
      {right}
    </div>
  )
}

function BuyerAnswer() {
  return (
    <>
      <Answer>
        Artimiausia ilgalaikė sutartis baigiasi lapkričio 19 d. <span className="dim">Ją vykdo UAB „Jurmelsta“.</span>{' '}
        <span className="e-answer__tag"><Tag tone="urgent">po 8 d.</Tag></span>
      </Answer>
      <div className="v-cells e-stats">
        <div className="v-cell"><Num n="35" /><span className="v-small">sutartys per 12 mėnesių</span></div>
        <div className="v-cell"><Num n="3,8" unit={`mln.${NB}€`} /><span className="v-small">jų vertė</span></div>
      </div>
      <p className="e-typical v-small">{`Kelių ir gatvių darbų sutartys. Dažniausia vertė: nuo 9${NB}000 iki 100${NB}000${NB}€.`}</p>
    </>
  )
}

function Release({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <>
      <div className="e-pic"><Bracket className="e-pic__strip"><MonthStrip months={MONTHS} /></Bracket></div>
      {GROUPS.map((g) => (
        <div key={g.label} className="e-group">
          <div className="e-group__label"><Label>{g.label}</Label></div>
          {g.rows.map((r) => (
            <EndingRow key={r.id} dist={r.dist} urgent={r.days} date={r.date} title={r.title} holder={r.holder} value={r.value} onClick={() => onOpen(r.id)} />
          ))}
        </div>
      ))}
    </>
  )
}

function Winners({ onFirm, lead }: { onFirm: () => void; lead?: boolean }) {
  return (
    <>
      {lead && <p className="e-lead v-lead">Iš 97 sutarčių 38 laimėjo <b className="v-strong">UAB „Jurmelsta“</b>.</p>}
      <div className="e-pic"><ShareStrip parts={SHARES} /></div>
      <RankRows items={WINNERS} total={WIN_TOTAL} onItem={(n) => (n === 'UAB „Jurmelsta“' ? onFirm : undefined)} />
    </>
  )
}

export function BuyerScreen({ sub }: { sub?: string }) {
  const wide = useWide()
  const { go, openSheet } = useStore()
  const firm = () => go('#/imone/158257064')
  const openContract = (id: string) => openSheet({ type: 'contract', id, amendments: true })

  if (wide)
    return (
      <>
        <div className="e-top">
          <div className="e-back"><Back fallback="#/siandien" /></div>
          <EntityHead kind="Pirkėjas" code={JURBARKAS_CODE} name={JURBARKAS} right={<Follow />} />
        </div>
        <div className="v-cols v-nodes" data-rev="">
          <aside>
            <div className="e-scope"><TradeTabs items={['Keliai ir gatvės', 'Viskas']} /></div>
            <BuyerAnswer />
            <Sec label="Kas čia laimi" note="nuo 2022 m. · 97 sutartys">
              <Winners onFirm={firm} lead />
            </Sec>
          </aside>
          <main>
            <Sec label="Kada atsilaisvina" note="ilgalaikės sutartys">
              <Release onOpen={openContract} />
            </Sec>
          </main>
        </div>
      </>
    )

  if (sub === 'sutartys')
    return (
      <Detail title="Kada atsilaisvina" sub="Keliai ir gatvės · ilgalaikės sutartys" back={BASE}>
        <Release onOpen={openContract} />
      </Detail>
    )
  if (sub === 'laimi')
    return (
      <Detail title="Kas čia laimi" sub="Keliai ir gatvės · nuo 2022 m." back={BASE}>
        <Winners onFirm={firm} />
      </Detail>
    )

  return (
    <>
      <Bar left={<Back fallback="#/siandien" />} right={<Follow />} />
      <EntityHead kind="Pirkėjas" code={JURBARKAS_CODE} name={JURBARKAS} />
      <TradeTabs items={['Keliai ir gatvės', 'Viskas']} />
      <div className="e-ans"><BuyerAnswer /></div>
      <Finding n={1} label="Atviras pirkimas" text="Autobusų stotelių remonto darbai su projektavimu" quiet="Liko 13 d. · iki lapkričio 24 d., 9:00" onClick={() => go('#/pirkimas/10377061')} />
      <Finding n={2} label="Kada atsilaisvina" text="Lapkritį baigiasi 2 ilgalaikės sutartys, balandį 3" picture={<MonthStrip months={MONTHS} mini />} quiet="Penkios sutartys per 12 mėnesių" onClick={() => go(`${BASE}/sutartys`)} />
      <Finding n={3} label="Kas čia laimi" text="Iš 97 sutarčių 38 laimėjo UAB „Jurmelsta“" picture={<ShareStrip parts={SHARES} bare />} quiet="Nuo 2022 m." onClick={() => go(`${BASE}/laimi`)} />
    </>
  )
}
