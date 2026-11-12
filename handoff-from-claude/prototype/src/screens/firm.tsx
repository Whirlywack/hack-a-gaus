import { Answer, Back, Bar, FollowBtn, Icon, Sec } from '../ui'
import { Detail, EntityRow, Finding, PlainRow, ShareStrip, TradeTabs } from '../parts'
import { FINANCE, firmKey, fmtDate, fmtMoney, fmtSigned, JURBARKAS, JURMELSTA, JURMELSTA_BUYERS, JURMELSTA_CODE, JURMELSTA_CONTRACTS, NB, sutartis } from '../data'
import { useStore } from '../store'
import { useWide } from '../mode'
import { EntityHead } from './buyer'

const BASE = '#/imone/158257064'
const TOTAL = JURMELSTA_CONTRACTS.reduce((a, c) => a + c.value, 0)
const NEWEST = JURMELSTA_CONTRACTS[0]
const N = JURMELSTA_CONTRACTS.length

function Follow() {
  const { isFollowed, toggleEntity } = useStore()
  const key = firmKey(JURMELSTA)
  return <FollowBtn on={isFollowed(key)} onToggle={() => toggleEntity({ key, kind: 'Įmonė', name: JURMELSTA })} />
}

function FirmAnswer() {
  const mln = (TOTAL / 1e6).toFixed(1).replace('.', ',')
  return (
    <Answer>
      Per 12 mėnesių laimėjo {N} kelių ir gatvių darbų {sutartis(N)}. <span className="dim">{`Jų vertė ${mln} mln.${NB}€.`}</span>
    </Answer>
  )
}

/** Revenue by year, the last year in the accent. */
function YearBars({ labels }: { labels?: boolean }) {
  const years = [...FINANCE].reverse()
  const max = Math.max(...years.map((y) => y.rev))
  return (
    <div className="fi-years" data-labels={labels || undefined}>
      {years.map((y, i) => (
        <div key={y.y} className="fi-years__col" data-last={i === years.length - 1 || undefined}>
          <span className="fi-years__bar" style={{ height: `${(y.rev / max) * 100}%` }} />
          <span className="fi-years__y">{y.y}</span>
        </div>
      ))}
    </div>
  )
}

function Buyers() {
  const { go } = useStore()
  return (
    <div className="p-list">
      {JURMELSTA_BUYERS.map((b, i) => {
        const link = b.name === JURBARKAS
        return (
          <EntityRow
            key={b.name}
            n={i + 1}
            name={b.name}
            onClick={link ? () => go('#/pirkejas/188713933') : undefined}
            right={
              <span className="fi-n">
                {`${b.n} ${sutartis(b.n)}`}
                <span className="v-arrow fi-n__go">{link && <Icon name="arrow-right" size={16} />}</span>
              </span>
            }
          />
        )
      })}
    </div>
  )
}

function Finance() {
  return (
    <div className="fi-fin">
      <div className="fi-fin__scroll">
        <table className="fi-table">
          <thead>
            <tr><th>Metai</th><th>Pajamos</th><th>Grynasis pelnas</th><th>Nuosavas kapitalas</th></tr>
          </thead>
          <tbody>
            {FINANCE.map((r) => (
              <tr key={r.y}><td>{r.y}</td><td>{fmtMoney(r.rev)}</td><td data-neg={r.profit < 0 || undefined}>{fmtSigned(r.profit)}</td><td>{fmtMoney(r.equity)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="v-note">Įmonė įregistruota 1994 m. lapkričio 9 d.</p>
    </div>
  )
}

function Contracts() {
  const { openSheet } = useStore()
  return (
    <div className="p-list">
      {JURMELSTA_CONTRACTS.map((c) => (
        <PlainRow key={c.id} onClick={() => openSheet({ type: 'contract', id: c.id, amendments: false })} top={`Pasirašyta ${fmtDate(c.signed)}`} title={c.title} left={c.buyer} right={fmtMoney(c.value)} />
      ))}
    </div>
  )
}

export function FirmScreen({ sub }: { sub?: string }) {
  const wide = useWide()
  const { go } = useStore()
  if (wide)
    return (
      <>
        <div className="e-top">
          <div className="e-back"><Back fallback="#/stebimi" /></div>
          <EntityHead kind="Įmonė" code={JURMELSTA_CODE} name={JURMELSTA} right={<Follow />} />
        </div>
        <div className="v-cols v-nodes" data-rev="">
          <aside>
            <div className="e-scope"><TradeTabs items={['Keliai ir gatvės', 'Viskas']} /></div>
            <FirmAnswer />
            <Sec label="Kas iš jų perka" note="per 12 mėnesių"><Buyers /></Sec>
            <Sec label="Finansai" note="Registrų centro duomenys">
              <div className="e-pic"><YearBars labels /></div>
              <Finance />
            </Sec>
            <p className="v-note fi-foot">Matome tik laimėtas sutartis.</p>
          </aside>
          <main>
            <Sec label="Sutartys" note="Keliai ir gatvės · per 12 mėnesių" n={N}><Contracts /></Sec>
          </main>
        </div>
      </>
    )

  if (sub === 'pirkejai')
    return <Detail title="Kas iš jų perka" sub="Keliai ir gatvės · per 12 mėnesių" back={BASE}><Buyers /></Detail>
  if (sub === 'sutartys')
    return <Detail title="Sutartys" sub="Keliai ir gatvės · per 12 mėnesių" back={BASE}><Contracts /></Detail>
  if (sub === 'finansai')
    return (
      <Detail title="Finansai" sub="Registrų centro duomenys" back={BASE}>
        <div className="e-pic"><YearBars labels /></div>
        <Finance />
      </Detail>
    )

  const top = JURMELSTA_BUYERS[0]
  return (
    <>
      <Bar left={<Back fallback="#/stebimi" />} right={<Follow />} />
      <EntityHead kind="Įmonė" code={JURMELSTA_CODE} name={JURMELSTA} />
      <TradeTabs items={['Keliai ir gatvės', 'Viskas']} />
      <div className="e-ans"><FirmAnswer /></div>
      <Finding
        n={1}
        label="Kas iš jų perka"
        text={`${top.n} iš ${N} sutarčių pasirašė ${top.name}`}
        picture={<ShareStrip bare parts={[{ n: top.n, pct: '', words: '' }, { n: N - top.n, pct: '', words: '' }]} />}
        quiet={`Iš viso ${JURMELSTA_BUYERS.length} pirkėjai`}
        onClick={() => go(`${BASE}/pirkejai`)}
      />
      <Finding n={2} label="Naujausia sutartis" text={<span className="clamp3">{NEWEST.title}</span>} quiet={`${fmtDate(NEWEST.signed)} · ${fmtMoney(NEWEST.value)}`} onClick={() => go(`${BASE}/sutartys`)} />
      <Finding n={3} label="Finansai" text={`2025 m. pajamos 4,4 mln.${NB}€, grynasis nuostolis 236${NB}644${NB}€`} picture={<YearBars />} quiet="Registrų centro duomenys" onClick={() => go(`${BASE}/finansai`)} />
      <p className="v-note fi-foot">Matome tik laimėtas sutartis.</p>
    </>
  )
}
