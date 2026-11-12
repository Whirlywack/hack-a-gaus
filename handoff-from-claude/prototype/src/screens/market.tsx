import type { ReactNode } from 'react'
import { Account, Answer, Bar, Bracket, FollowBtn, Label, Sec, Tag, Wordmark } from '../ui'
import { Detail, DuoBars, EndingRow, Finding, FollowList, MonthBars, More, RankRows, ShareStrip, TradeTabs, type RankItem, type Share } from '../parts'
import { buyerKey, firmKey, MARKET_NEXT, NB } from '../data'
import { useStore } from '../store'
import { useWide } from '../mode'

// Real data: road and street works (CPV 45233) across Lithuania, contracts signed
// 2025-11-11 to 2026-11-11 (see data/market.md)
const BUYERS: RankItem[] = [
  { name: 'VĮ Valstybinių miškų urėdija', count: '78 sutartys', n: 78, typical: `įprasta vertė 67${NB}500${NB}€` },
  { name: 'AB „Via Lietuva“', count: '71 sutartis', n: 71, typical: `įprasta vertė 3,5 mln.${NB}€` },
  { name: 'Kelmės rajono savivaldybės administracija', count: '62 sutartys', n: 62, typical: `įprasta vertė 57${NB}400${NB}€` },
  { name: 'Ukmergės rajono savivaldybės administracija', count: '40 sutarčių', n: 40, typical: `įprasta vertė 18${NB}150${NB}€` },
  { name: 'Kauno rajono savivaldybės administracija', count: '35 sutartys', n: 35, typical: `įprasta vertė 18${NB}150${NB}€` },
]
const WINNERS: RankItem[] = [
  { name: 'AB „Kelių priežiūra“', count: '136 sutartys', n: 136, typical: `įprasta vertė 76${NB}100${NB}€` },
  { name: 'UAB „Daugesta“', count: '33 sutartys', n: 33, typical: `įprasta vertė 707${NB}200${NB}€` },
  { name: 'UAB „JK Ranga“', count: '30 sutarčių', n: 30, typical: `įprasta vertė 247${NB}800${NB}€` },
  { name: 'UAB „Parama“', count: '29 sutartys', n: 29, typical: `įprasta vertė 228${NB}200${NB}€` },
  { name: 'UAB „Telšių keliai“', count: '22 sutartys', n: 22, typical: `įprasta vertė 600${NB}900${NB}€` },
]
const BUYER_SHARES: Share[] = [
  { n: 286, pct: `19${NB}%`, words: 'penki didžiausi' },
  { n: 1032, pct: `70${NB}%`, words: 'kiti 175' },
  { n: 150, pct: `10${NB}%`, words: 'nepaskelbta' },
]
const WINNER_SHARES: Share[] = [
  { n: 250, pct: `17${NB}%`, words: 'penki didžiausi' },
  { n: 1042, pct: `71${NB}%`, words: 'kitos 296' },
  { n: 176, pct: `12${NB}%`, words: 'nepaskelbta' },
]
const COUNTS = [36, 42, 24, 34, 36, 35, 40, 37, 41, 18, 22, 23]
const LABELS: Record<number, string> = { 0: 'lapkritis', 2: '2027', 5: 'balandis', 8: 'liepa', 11: 'spalis' }
const NEXT = [
  { date: 'lapkričio 13 d.', dist: 'po 2 d.' },
  { date: 'lapkričio 14 d.', dist: 'po 3 d.' },
  { date: 'lapkričio 14 d.', dist: 'po 3 d.' },
]
const money = (n: number) => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NB)}${NB}€`

const rowsOf = (items: RankItem[]) => items.map((w) => ({ name: w.name, line: `${w.count} · ${w.typical}` }))

function useFollowBy(kind: 'Pirkėjas' | 'Įmonė') {
  const { isFollowed, toggleEntity } = useStore()
  const key = kind === 'Pirkėjas' ? buyerKey : firmKey
  return {
    is: (name: string) => isFollowed(key(name)),
    toggle: (name: string) => toggleEntity({ key: key(name), kind, name }),
  }
}

function Nearest({ onOpen }: { onOpen: (i: number) => void }) {
  return (
    <div className="e-group">
      <div className="e-group__label"><Label>Artimiausios</Label></div>
      {MARKET_NEXT.map((c, i) => (
        <EndingRow key={c.id} dist={NEXT[i].dist} urgent date={NEXT[i].date} title={c.title} buyer={c.buyer} holder={c.holder} value={money(c.value)} onClick={() => onOpen(i)} />
      ))}
    </div>
  )
}

function Lead({ children }: { children: ReactNode }) {
  return <p className="e-lead v-lead">{children}</p>
}

export function Market({ sub }: { sub?: string }) {
  const wide = useWide()
  const { go, openSheet } = useStore()
  const buyers = useFollowBy('Pirkėjas')
  const firms = useFollowBy('Įmonė')
  const openNext = (i: number) => openSheet({ type: 'contract', id: MARKET_NEXT[i].id, amendments: false })
  const bars = <div className="e-pic"><Bracket className="e-pic__strip"><MonthBars counts={COUNTS} labels={LABELS} /></Bracket></div>

  if (wide)
    return (
      <>
        <div className="f-top">
          <Answer meta="Rinka" metaRight="per 12 mėnesių" sub={`Pusė jų verta nuo 18${NB}000 iki 400${NB}000${NB}€. Neįskaičiuota 1${NB}050 smulkių pirkimų už 4,4 mln.${NB}€.`}>
            {`Bent 180 pirkėjų pasirašė 1${NB}468 kelių ir gatvių darbų sutartis.`}
          </Answer>
          <div className="f-top__tabs m-scope">
            <span className="m-region"><Tag>Visa Lietuva</Tag></span>
            <TradeTabs items={['Keliai ir gatvės', 'Pastatų remontas']} />
          </div>
        </div>
        <div className="m-cols v-nodes">
          <Sec label="Kas perka" n={1}>
            <Lead>{`Nė vienas pirkėjas nepasirašo daugiau kaip 5${NB}% sutarčių.`}</Lead>
            <div className="e-pic"><ShareStrip parts={BUYER_SHARES} /></div>
            <RankRows items={BUYERS} total={78} trailing={(n) => <FollowBtn iconOnly on={buyers.is(n)} onToggle={() => buyers.toggle(n)} />} />
          </Sec>
          <Sec label="Kas laimi" n={2}>
            <Lead>Daugiausia sutarčių, 136, laimėjo <b className="v-strong">{`AB${NB}„Kelių${NB}priežiūra“`}</b>.</Lead>
            <div className="e-pic"><ShareStrip parts={WINNER_SHARES} /></div>
            <RankRows items={WINNERS} total={136} trailing={(n) => <FollowBtn iconOnly on={firms.is(n)} onToggle={() => firms.toggle(n)} />} />
          </Sec>
          <Sec label="Kada atsilaisvina" n={3}>
            <Lead>Per 12 mėnesių baigsis 393 ilgalaikės sutartys. Daugiausia jų baigsis gruodį: 42.</Lead>
            {bars}
            <Nearest onOpen={openNext} />
          </Sec>
        </div>
      </>
    )

  if (sub === 'perka')
    return (
      <Detail title="Kas perka" sub="Keliai ir gatvės · per 12 mėnesių" back="#/rinka">
        <div className="e-pic"><ShareStrip parts={BUYER_SHARES} /></div>
        <FollowList rows={rowsOf(BUYERS)} isFollowed={buyers.is} onToggle={buyers.toggle} />
        <More label="Rodyti visus 180 pirkėjų" note="Prototipe rodomi tik penki didžiausi." />
      </Detail>
    )
  if (sub === 'laimi')
    return (
      <Detail title="Kas laimi" sub="Keliai ir gatvės · per 12 mėnesių" back="#/rinka">
        <div className="e-pic"><ShareStrip parts={WINNER_SHARES} /></div>
        <FollowList rows={rowsOf(WINNERS)} isFollowed={firms.is} onToggle={firms.toggle} />
        <More label="Rodyti visas įmones (301)" note="Prototipe rodomos tik penkios didžiausios." />
      </Detail>
    )
  if (sub === 'atsilaisvina')
    return (
      <Detail title="Kada atsilaisvina" sub="Keliai ir gatvės · ilgalaikės sutartys" back="#/rinka">
        <Lead>Per 12 mėnesių baigsis 393 ilgalaikės sutartys. Daugiausia jų baigsis gruodį: 42.</Lead>
        {bars}
        <Nearest onOpen={openNext} />
        <More label="Rodyti visas sutartis (393)" note="Prototipe rodomos tik trys artimiausios." />
      </Detail>
    )

  return (
    <>
      <Bar left={<Wordmark />} right={<Account />} />
      <div className="m-scope"><TradeTabs items={['Keliai ir gatvės', 'Pastatų remontas']} /></div>
      <Answer meta="Rinka · visa Lietuva" metaRight="per 12 mėnesių" sub={`Pusė jų verta nuo 18${NB}000 iki 400${NB}000${NB}€.`}>
        {`Bent 180 pirkėjų pasirašė 1${NB}468 kelių ir gatvių darbų sutartis.`}
      </Answer>
      <Finding n={1} label="Kas perka" text={`Pirkėjų daug: penki didžiausi pasirašo tik 19${NB}% sutarčių`} picture={<ShareStrip parts={BUYER_SHARES} bare />} quiet="Dažniausiai perka VĮ Valstybinių miškų urėdija: 78 sutartys" onClick={() => go('#/rinka/perka')} />
      <Finding n={2} label="Kas laimi" text="AB „Kelių priežiūra“ laimėjo 136 sutartis, antra įmonė 33" picture={<DuoBars a={136} b={33} max={136} la="136" lb="33" />} quiet="Iš viso laimėjo 301 įmonė" onClick={() => go('#/rinka/laimi')} />
      <Finding n={3} label="Kada atsilaisvina" text="Iki lapkričio pabaigos baigiasi 36 ilgalaikės sutartys, per metus 393" picture={<MonthBars counts={COUNTS} />} quiet="Artimiausia baigiasi lapkričio 13 d." onClick={() => go('#/rinka/atsilaisvina')} />
    </>
  )
}
