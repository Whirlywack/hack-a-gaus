import { useState } from 'react'
import { Account, Answer, Bar, Btn, CellBtn, Icon, Label, RuleTabs, Sec, Tag, TenderRow, Wordmark, idx } from '../ui'
import { STAGE_CHIP, TENDERS, type Tender, type TenderId } from '../data'
import { useStore } from '../store'
import { useWide } from '../mode'

const AREAS = ['Visos sritys', 'Keliai ir gatvės', 'Pastatų remontas']
const AREA_TAG: Record<string, string> = { roads: 'Keliai ir gatvės', building: 'Pastatų remontas' }

function useFeed() {
  const { aside, area } = useStore()
  const showNew = (t: Tender) => area === 0 || (area === 1 && t.area === 'roads') || (area === 2 && t.area === 'building')
  const urgent = (['10383512', '10224312'] as TenderId[]).map((id) => TENDERS[id])
  const fresh = (['10377061', '10393450'] as TenderId[]).map((id) => TENDERS[id]).filter((t) => !aside.includes(t.id) && showNew(t))
  const soon = (['10398813'] as TenderId[]).map((id) => TENDERS[id]).filter((t) => !aside.includes(t.id))
  const setAside = aside.map((id) => TENDERS[id])
  return { urgent, fresh, soon, setAside }
}

const freshLine = (n: number) => (n === 0 ? 'Naujų pirkimų nėra.' : n === 1 ? 'Atsirado 1 naujas pirkimas.' : `Atsirado ${n} nauji pirkimai.`)

function StageTag({ id }: { id: TenderId }) {
  const { stages, isFollowed } = useStore()
  if (!isFollowed(id)) return null
  const s = stages[id] ?? 0
  return <Tag tone={s === 0 ? undefined : 'accent'}>{STAGE_CHIP[s]}</Tag>
}

function NewTags({ t }: { t: Tender }) {
  return (
    <>
      {t.area && <Tag>{AREA_TAG[t.area]}</Tag>}
      {t.req === 'none' && <Tag tone="accent" icon="check">Specialių reikalavimų nėra</Tag>}
    </>
  )
}

function FeedHead({ fresh }: { fresh: number }) {
  return (
    <Answer meta="trečiadienis, lapkričio 11 d." metaRight="atnaujinta 14:05">
      2 stebimi pirkimai baigiasi po 7 dienų. <span className="dim">{freshLine(fresh)}</span>
    </Answer>
  )
}

function SetAside({ wide }: { wide?: boolean }) {
  const { restore } = useStore()
  const { setAside } = useFeed()
  const [open, setOpen] = useState(false)
  if (!setAside.length) return null
  return (
    <section className="v-sec">
      <button type="button" aria-expanded={open} data-tap="" className="v-sec__head" onClick={() => setOpen((o) => !o)}>
        <Label>Atidėti</Label>
        <span className="v-sec__right">
          <span className="v-idx">{idx(setAside.length)}</span>
          <span className="f-chev" data-open={open || undefined}><Icon name="chevron-down" size={14} /></span>
        </span>
      </button>
      {open && setAside.map((t) => (
        <div key={t.id} className="v-row f-aside" data-wide={wide || undefined}>
          <div className="f-aside__text">
            <div className="v-rowtitle clamp2">{t.title}</div>
            <div className="v-small">{t.buyer}</div>
          </div>
          <Btn small kind="quiet" onClick={() => restore(t.id)}>Grąžinti</Btn>
        </div>
      ))}
    </section>
  )
}

export function Feed() {
  const wide = useWide()
  const { go, area, setArea, isFollowed, followTender, openSheet } = useStore()
  const { urgent, fresh, soon } = useFeed()
  const open = (t: Tender) => () => go(`#/pirkimas/${t.id}`)

  const newRow = (t: Tender) => {
    const followed = isFollowed(t.id)
    if (wide)
      return (
        <TenderRow
          key={t.id}
          t={t}
          onClick={open(t)}
          tags={<NewTags t={t} />}
          side={followed ? <StageTag id={t.id} /> : (
            <span className="f-sideacts">
              <Btn small kind="quiet" onClick={() => openSheet({ type: 'neman', id: t.id })}>Ne man</Btn>
              <Btn small kind="primary" onClick={() => followTender(t.id)} icon={<Icon name="bookmark" size={14} />}>Stebėti</Btn>
            </span>
          )}
        />
      )
    return (
      <TenderRow
        key={t.id}
        t={t}
        onClick={open(t)}
        tags={<>{<NewTags t={t} />}{followed && <StageTag id={t.id} />}</>}
        acts={!followed && (
          <div className="v-cells v-trow__acts">
            <CellBtn onClick={() => openSheet({ type: 'neman', id: t.id })}>Ne man</CellBtn>
            <CellBtn tone="accent" onClick={() => followTender(t.id)} icon={<Icon name="bookmark" size={15} />}>Stebėti</CellBtn>
          </div>
        )}
      />
    )
  }

  const urgentSec = (
    <Sec label="Skubu" n={urgent.length}>
      {urgent.map((t) => <TenderRow key={t.id} t={t} onClick={open(t)} tags={wide ? undefined : <StageTag id={t.id} />} side={wide ? <StageTag id={t.id} /> : undefined} />)}
    </Sec>
  )
  const freshSec = fresh.length > 0 && <Sec label="Nauji pirkimai" n={fresh.length}>{fresh.map(newRow)}</Sec>
  const soonSec = soon.length > 0 && (
    <Sec label="Artėja" n={soon.length}>
      {soon.map((t) => <TenderRow key={t.id} t={t} onClick={open(t)} tags={isFollowed(t.id) ? <StageTag id={t.id} /> : undefined} />)}
    </Sec>
  )

  if (wide)
    return (
      <>
        <div className="f-top">
          <FeedHead fresh={fresh.length} />
          <div className="f-top__tabs"><RuleTabs items={AREAS} value={area} onChange={setArea} numbered /></div>
        </div>
        <div className="v-cols v-nodes">
          <main>
            {urgentSec}
            {freshSec}
            <SetAside wide />
          </main>
          <aside className="f-side">
            {soonSec}
            <Sec label="Rezultatai" n={0}>
              <p className="v-note">Rezultatų dar nėra. Kai paaiškės jūsų stebimų pirkimų laimėtojai, pamatysite juos čia.</p>
            </Sec>
          </aside>
        </div>
      </>
    )

  return (
    <>
      <Bar left={<Wordmark />} right={<Account />} />
      <FeedHead fresh={fresh.length} />
      <RuleTabs items={AREAS} value={area} onChange={setArea} />
      {urgentSec}
      {freshSec}
      {soonSec}
      <SetAside />
    </>
  )
}
