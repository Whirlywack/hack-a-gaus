// Renders the design-system specimens to static HTML with the real components.
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { StoreProvider } from '../src/store'
import { ModeCtx } from '../src/mode'
import { Account, Answer, Back, Bar, Bracket, Btn, CellBtn, DeskTop, FollowBtn, Icon, Label, Num, RuleTabs, Sec, Stage, TabBar, Tag, TenderRow, TextBtn, Wordmark } from '../src/ui'
import { CheckBox, DuoBars, EndingRow, EntityRow, Field, Finding, MonthBars, MonthStrip, PlainRow, RankRows, ShareStrip } from '../src/parts'
import { TENDERS, NB } from '../src/data'
import { Feed } from '../src/screens/feed'
import { CodeCells, Setup } from '../src/screens/setup'

const noop = () => {}
const A = TENDERS['10383512'], C = TENDERS['10377061']
const SHARES = [{ n: 286, pct: `19${NB}%`, words: 'penki didžiausi' }, { n: 1032, pct: `70${NB}%`, words: 'kiti 175' }, { n: 150, pct: `10${NB}%`, words: 'nepaskelbta' }]
const MONTHS = [{ squares: 2, sum: `169${NB}582${NB}€`, label: 'lapkritis' }, { squares: 0 }, { squares: 0, year: '2027' }, { squares: 0 }, { squares: 0 }, { squares: 3, sum: `954${NB}889${NB}€`, label: 'balandis' }, { squares: 0 }, { squares: 0 }, { squares: 0 }, { squares: 0 }, { squares: 0 }, { squares: 0 }]
const COUNTS = [36, 42, 24, 34, 36, 35, 40, 37, 41, 18, 22, 23]

const S: Record<string, ReactNode> = {
  Answer: <Answer meta="trečiadienis, lapkričio 11 d." metaRight="atnaujinta 14:05">2 stebimi pirkimai baigiasi po 7 dienų. <span className="dim">Atsirado 2 nauji pirkimai.</span></Answer>,
  Label: (
    <div className="ds-pad ds-col">
      <div className="ds-row"><Label tone="accent">Skubu</Label><span className="v-idx">02</span></div>
      <div className="ds-row"><Label>Pasiūlymus teikti iki</Label><span className="v-idx">001</span></div>
      <div className="ds-row"><Label tone="urgent">Liko 7 d.</Label></div>
    </div>
  ),
  Numeral: (
    <div className="v-cells">
      <div className="v-cell"><Num n="7" unit="d." urgent /></div>
      <div className="v-cell"><Num n="13" unit="d." /></div>
      <div className="v-cell"><Num n="3,8" unit={`mln.${NB}€`} /></div>
    </div>
  ),
  Section: (
    <Sec label="Skubu" n={2}>
      <TenderRow t={A} onClick={noop} tags={<Tag tone="accent">Rengiu pasiūlymą</Tag>} />
      <TenderRow t={TENDERS['10224312']} onClick={noop} tags={<Tag>Stebiu</Tag>} />
    </Sec>
  ),
  Cells: (
    <div className="v-cells v-status">
      <div className="v-cell"><Label>Liko</Label><Num n="13" unit="d." /></div>
      <div className="v-cell"><Label>Pasiūlymus teikti iki</Label><div className="v-status__date">lapkričio 24 d., 9:00</div></div>
    </div>
  ),
  Bracket: (
    <div className="ds-pad">
      <Bracket className="v-source">
        <span>{`„…yra tinkamai atlikęs gatvių, kelių statybos, rekonstravimo ir / ar remonto darbus, kurių vertė yra ne mažesnė kaip 200${NB}000${NB}Eur be PVM.“`}</span>
        <span className="v-source__file"><Icon name="file" size={13} />4 priedas. Kvalifikacijos reikalavimai.docx</span>
      </Bracket>
    </div>
  ),
  LinkRow: (
    <>
      <div className="v-linkrow" data-tap="">
        <span className="v-linkrow__body"><Label>Pirkėjas</Label><span className="v-linkrow__value">Jurbarko rajono savivaldybės administracija</span></span>
        <span className="v-arrow"><Icon name="arrow-right" size={18} /></span>
      </div>
      <div className="v-linkrow" data-tap=""><span className="v-linkrow__value">Dokumentai</span><span className="v-arrow"><Icon name="arrow-out" size={18} /></span></div>
    </>
  ),
  TenderRow: (
    <>
      <TenderRow t={A} onClick={noop} tags={<Tag tone="accent">Rengiu pasiūlymą</Tag>} />
      <TenderRow t={C} onClick={noop} tags={<Tag>Keliai ir gatvės</Tag>} acts={
        <div className="v-cells v-trow__acts">
          <CellBtn>Ne man</CellBtn>
          <CellBtn tone="accent" icon={<Icon name="bookmark" size={15} />}>Stebėti</CellBtn>
        </div>
      } />
    </>
  ),
  EndingRow: (
    <>
      <EndingRow dist="po 8 d." urgent date="lapkričio 19 d." title="Jurbarko rajono savivaldybės kelių su žvyro danga priežiūros (greideriavimo) darbai (3, 4, 5, 6, 7, 9, 10)" holder="UAB „Jurmelsta“" value={`103${NB}655${NB}€`} onClick={noop} />
      <EndingRow dist="po 5 mėn." date="2027 m. balandžio 10 d." title="Jurbarko rajono savivaldybės kelių su žvyro danga priežiūros (žvyravimo) darbai (2-11 pirkimo dalys)" holder="AB „Kelių priežiūra“" value={`351${NB}067${NB}€`} onClick={noop} />
    </>
  ),
  RankRows: (
    <RankRows total={97} items={[
      { name: 'UAB „Jurmelsta“', count: '38 sutartys', n: 38, typical: `įprasta vertė 72${NB}000${NB}€`, tone: 'lead' },
      { name: 'AB „Kelių priežiūra“', count: '12 sutarčių', n: 12, typical: `įprasta vertė 87${NB}400${NB}€` },
      { name: 'Kitos 18 įmonių', count: '30 sutarčių', n: 30, tone: 'other' },
      { name: 'Tiekėjas dar nepaskelbtas', count: '7 sutartys', n: 7, tone: 'unknown' },
    ]} />
  ),
  EntityRow: (
    <div className="p-list">
      <EntityRow n={1} name="VĮ Valstybinių miškų urėdija" line={`78 sutartys · įprasta vertė 67${NB}500${NB}€`} right={<FollowBtn on={false} onToggle={noop} />} />
      <EntityRow n={2} name="Kelmės rajono savivaldybės administracija" line={`62 sutartys · įprasta vertė 57${NB}400${NB}€`} right={<FollowBtn on onToggle={noop} />} />
    </div>
  ),
  PlainRow: (
    <div className="p-list">
      <PlainRow top="Sutartis pasirašyta rugpjūčio 26 d." title="Pilies Sodo 1-oji g., Jurbarkas, Jurbarko r. sav. paprastojo remonto darbai" left={<>Laimėjo <b className="v-strong">UAB „Jurmelsta“</b></>} right={`112${NB}264${NB}€`} onClick={noop} />
    </div>
  ),
  Finding: <Finding n={1} label="Kas perka" text={`Pirkėjų daug: penki didžiausi pasirašo tik 19${NB}% sutarčių`} picture={<ShareStrip parts={SHARES} bare />} quiet="Dažniausiai perka VĮ Valstybinių miškų urėdija: 78 sutartys" onClick={noop} />,
  Button: (
    <div className="ds-pad ds-col">
      <div className="ds-row ds-wrap"><Btn kind="primary" trailing={<Icon name="arrow-right" size={16} />}>Toliau</Btn><Btn trailing={<Icon name="arrow-right" size={16} />}>Perskaityti dokumentus</Btn><Btn kind="quiet">Grąžinti</Btn></div>
      <div className="ds-row ds-wrap"><Btn small kind="primary" icon={<Icon name="bookmark" size={14} />}>Stebėti</Btn><Btn small kind="quiet">Ne man</Btn><TextBtn trailing={<Icon name="arrow-right" size={16} />}>Rodyti visus 180 pirkėjų</TextBtn><TextBtn quiet>Nebestebėti</TextBtn></div>
    </div>
  ),
  FollowButton: <div className="ds-pad ds-row"><FollowBtn on={false} onToggle={noop} /><FollowBtn on onToggle={noop} /></div>,
  CellButton: (
    <div className="v-cells">
      <CellBtn big>Ne man</CellBtn>
      <CellBtn big tone="fill" icon={<Icon name="bookmark" size={16} />}>Stebėti</CellBtn>
    </div>
  ),
  RuleTabs: (
    <div className="ds-col" style={{ paddingTop: 18 }}>
      <RuleTabs items={['Visos sritys', 'Keliai ir gatvės', 'Pastatų remontas']} value={0} onChange={noop} />
      <div className="v-stage"><Stage value={1} onChange={noop} /></div>
    </div>
  ),
  Tag: <div className="ds-pad ds-row ds-wrap"><Tag>Stebiu</Tag><Tag tone="accent">Rengiu pasiūlymą</Tag><Tag tone="accent" icon="check">Specialių reikalavimų nėra</Tag><Tag tone="urgent">po 8 d.</Tag><Tag tone="solid">Atviras</Tag></div>,
  Field: <div className="ds-pad ds-col"><Field label="Jūsų darbai" placeholder="pvz., gatvių remontas, šaligatviai" defaultValue="kelių ir gatvių remontas" /><Field label="Įmonės kodas" placeholder="9 skaitmenys" /></div>,
  CodeCells: <div className="ds-pad ds-col"><CodeCells value="418" onChange={noop} autoFocus /><CodeCells value="" onChange={noop} /></div>,
  CheckBox: <div className="ds-pad ds-row"><CheckBox on /><span className="v-text">Kelių remonto darbai</span><CheckBox on={false} /><span className="v-text">Įvairūs dangos darbai</span></div>,
  ShareStrip: <div className="ds-pad"><ShareStrip parts={SHARES} /></div>,
  MonthStrip: <div className="ds-pad"><Bracket style={{ padding: '36px 16px 14px' }}><MonthStrip months={MONTHS} /></Bracket></div>,
  MonthBars: <div className="ds-pad"><Bracket style={{ padding: '14px 16px' }}><MonthBars counts={COUNTS} labels={{ 0: 'lapkritis', 2: '2027', 5: 'balandis', 8: 'liepa', 11: 'spalis' }} /></Bracket></div>,
  DuoBars: <div className="ds-pad"><Bracket><DuoBars a={136} b={33} max={136} la="136" lb="33" /></Bracket></div>,
  Bar: (
    <>
      <Bar left={<Wordmark />} right={<Account />} />
      <Bar left={<Back fallback="#/siandien" />} right={<FollowBtn on={false} onToggle={noop} />} />
    </>
  ),
  TabBar: <div className="v-inframe" style={{ position: 'relative', height: 56 }}><TabBar active={0} /></div>,
  DeskTop: <div className="v-desk" style={{ minHeight: 0 }}><DeskTop active={2} /></div>,
  ScreenToday: (
    <div className="v-inframe" style={{ position: 'relative', height: 844 }}>
      <div className="v-app"><div className="v-scroll"><div className="v-page"><Feed /></div></div><TabBar active={0} /></div>
    </div>
  ),
  ScreenStart: (
    <div className="v-inframe" style={{ position: 'relative', height: 844 }}>
      <div className="v-app" data-setup=""><div className="v-scroll"><div className="v-page"><Setup /></div></div></div>
    </div>
  ),
}

const out: Record<string, string> = {}
for (const [k, node] of Object.entries(S)) {
  out[k] = renderToStaticMarkup(
    <StoreProvider><ModeCtx.Provider value={{ wide: false }}>{node}</ModeCtx.Provider></StoreProvider>,
  )
}
process.stdout.write(JSON.stringify(out))
