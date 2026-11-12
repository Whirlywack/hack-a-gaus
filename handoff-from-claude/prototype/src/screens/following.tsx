import { Account, Answer, Bar, Label, Sec, Stage, Tag, Tap, TenderRow, Wordmark, daysOf } from '../ui'
import { PlainRow } from '../parts'
import { buyerKey, contractKey, firmKey, FINISHED, JURBARKAS, JURMELSTA, NB, TENDER_ORDER, TENDERS, type Entity, type FinishedId } from '../data'
import { useStore } from '../store'
import { useWide } from '../mode'

// Stebimi: what you follow. Open tenders with their stage, then buyers, firms
// and contracts with their news, then finished tenders.

/** News lines for the things followed at the start. */
const NEWS: Record<string, { lines: string[]; isNew?: boolean; chip?: string }> = {
  [buyerKey(JURBARKAS)]: {
    isNew: true,
    lines: ['Naujas pirkimas: **Autobusų stotelių remonto darbai su projektavimu**', `Lapkričio 19 d. baigiasi ilgalaikė sutartis, ją vykdo **UAB${NB}„Jurmelsta“**`],
  },
  [firmKey(JURMELSTA)]: {
    lines: [`Naujausia sutartis, rugpjūčio 26 d.: **Pilies Sodo 1-oji g., Jurbarkas, Jurbarko r. sav. paprastojo remonto darbai**, 112${NB}264${NB}€`],
  },
  [contractKey('2007586625')]: {
    chip: 'po 8 d.',
    lines: [`**UAB${NB}„Jurmelsta“** · 103${NB}655${NB}€ · baigiasi lapkričio 19 d.`],
  },
}

function Rich({ text }: { text: string }) {
  return <>{text.split('**').map((part, i) => (i % 2 ? <b key={i} className="fo-b">{part}</b> : part))}</>
}

function useOpen() {
  const { isFollowed, aside } = useStore()
  return TENDER_ORDER.filter((id) => isFollowed(id) && !aside.includes(id)).map((id) => TENDERS[id])
}

function Head() {
  const list = useOpen()
  const n = list.length
  const d = n ? Math.min(...list.map((t) => Number(daysOf(t)))) : 0
  const first = n === 0 ? 'Atvirų pirkimų nestebite.' : n === 1 ? 'Stebite 1 atvirą pirkimą.' : `Stebite ${n} atvirus pirkimus.`
  return (
    <Answer meta="Stebimi">
      {first}
      {n > 0 && <> <span className="dim">Artimiausias terminas po {d} d.</span></>}
    </Answer>
  )
}

function OpenTenders() {
  const { stages, setStage, go } = useStore()
  const list = useOpen()
  return (
    <Sec label="Atviri pirkimai" n={list.length} className="fo-open">
      {list.map((t) => (
        <div key={t.id} className="fo-item">
          <TenderRow t={t} onClick={() => go(`#/pirkimas/${t.id}`)} />
          <div className="fo-stage">
            <Stage value={stages[t.id] ?? 0} onChange={(i) => setStage(t.id, i)} />
          </div>
        </div>
      ))}
    </Sec>
  )
}

function Watched() {
  const { watched, go, openSheet } = useStore()
  if (!watched.length) return null
  const click = (e: Entity) => {
    if (e.key === buyerKey(JURBARKAS)) return () => go('#/pirkejas/188713933')
    if (e.key === firmKey(JURMELSTA)) return () => go('#/imone/158257064')
    if (e.key.startsWith('contract:')) return () => openSheet({ type: 'contract', id: e.key.slice(9), amendments: true })
    return undefined
  }
  return (
    <Sec label="Pirkėjai, įmonės ir sutartys" n={watched.length}>
      {watched.map((w) => {
        const n = NEWS[w.key]
        const body = (
          <>
            <div className="fo-w__top">
              <Label>{w.kind}</Label>
              {n?.chip ? <Tag tone="urgent">{n.chip}</Tag> : n?.isNew ? <Tag tone="solid">Nauja</Tag> : null}
            </div>
            <div className="v-rowtitle clamp2">{w.name}</div>
            {n && (
              <div className="fo-w__news">
                {n.lines.map((l, i) => <p key={i}><Rich text={l} /></p>)}
              </div>
            )}
          </>
        )
        const open = click(w)
        return open
          ? <Tap key={w.key} className="v-row fo-w" onClick={open}>{body}</Tap>
          : <div key={w.key} className="v-row fo-w">{body}</div>
      })}
    </Sec>
  )
}

function Finished() {
  const { go } = useStore()
  const ids = Object.keys(FINISHED) as FinishedId[]
  return (
    <Sec label="Baigti pirkimai" n={ids.length}>
      {ids.map((id) => {
        const d = FINISHED[id]
        return (
          <PlainRow
            key={id}
            onClick={() => go(`#/pirkimas/${id}`)}
            top={d.signed}
            title={d.title}
            left={<>Laimėjo <span className="fo-b">{d.winner}</span></>}
            right={d.amount}
          />
        )
      })}
    </Sec>
  )
}

export function Following() {
  const wide = useWide()
  if (wide)
    return (
      <>
        <Head />
        <div className="v-cols v-nodes fo-cols">
          <main>
            <OpenTenders />
            <Finished />
          </main>
          <aside>
            <Watched />
          </aside>
        </div>
      </>
    )
  return (
    <>
      <Bar left={<Wordmark />} right={<Account />} />
      <Head />
      <OpenTenders />
      <Watched />
      <Finished />
    </>
  )
}
