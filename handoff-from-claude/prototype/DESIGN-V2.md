# gaus v2: the drawn sheet  (12 Nov 2026)  REPLACES every earlier DESIGN*.md look

The owner rejected the old prototype ("the same design with a different coloured button"). The whole
visual design is redone from nothing in `/home/user/procurement/mock/proto2/`. The OLD prototype in
`/home/user/procurement/mock/proto/` is now only a source of CONTENT and BEHAVIOUR (strings, data, routes,
states). Do not carry over any of its look, class names, kit parts, or layout.

LOOK AT THESE FIRST (Read the PNGs): `/home/user/procurement/mock/proto2/ref/feed.png`, `feed-full.png`,
`tender-full.png`, `feed-wide.png`, `tender-wide-full.png`. They are the standard. Your screens must look
like siblings of them. If yours looks like a generic mobile app (rounded white cards, pills, soft shadows),
it is wrong.

## The language
1. **Visible structure, no cards.** The app is one ruled sheet. Blocks are separated by full-width hairline
   rules; side-by-side things are ruled cells sharing a border. Nothing floats, nothing has a shadow,
   nothing has rounded corners (radius 0 everywhere; the spinner is the only circle).
2. **Type carries the hierarchy.** Each screen opens with its ANSWER: one large sentence (`.v-display`),
   its second clause dimmed (`<span className="dim">`). Above it a small uppercase meta line.
   Section names are small uppercase tracked labels in the accent (`Label tone="accent"`), with a
   two-digit count or index on the right in grey (`.v-idx`: "02"). Items inside a section are numbered
   "01", "02" in the left gutter where a number helps.
3. **Numerals are drawn big.** Time left is the big numeral at the left of a row ("7 d."), red when
   7 days or fewer. Shares and counts in legends use the medium numeral.
4. **Pictures sit inside corner brackets** (`Bracket`), as do quoted sources. Bars are flat rectangles:
   the leader ink, the rest grey, unknown hatched, and only "now"/"this one" in the accent.
5. **Choices are rule tabs** (`RuleTabs`): a 2px rule above each option, the chosen one accent.
   A progression (a stage, a step) uses the same with `progress` and `numbered`.
6. **Actions are ruled cells** (`.v-cells` + `CellBtn`) or square buttons (`Btn`). One filled accent
   action per screen at most. Tags (`Tag`) are small square outlined uppercase.
7. **Colour**: warm off-grey ground, ink text, ONE accent (ultramarine #2B39D6), red only for deadlines
   within 7 days. No green, orange, amber, yellow, purple. No gradients (except the hatch), no blur.
8. **One typeface** (Instrument Sans, loaded as 'Gaus Sans'), weights 400 to 600. No monospace.
   No tabular figures needed. Do not use an en or em dash in UI text you add.
9. **Motion** only where it explains: rules sliding in on the active tab, a screen easing in, a sheet
   sliding up. 160 to 240ms. Nothing decorative.
10. Phone first: every phone screen is its own design (an overview that fits roughly one to two screens,
    with lists behind a tap). Desktop is the same blocks laid out as ruled columns (`.v-cols`) inside the
    page frame; never a narrow centred column with empty sides.

## Files
- `src/v2.css`       the system (tokens, type, shell, sections, rows, tabs, cells, tags, buttons, brackets)
- `src/ui.tsx`       primitives: Icon, Tap, Label, Tag, Btn, TextBtn, CellBtn, FollowBtn, RuleTabs, Stage,
                     Bracket, Sec, Answer, Num, TenderRow, Bar, Wordmark, Back, Account, TabBar, DeskTop, idx
- `src/parts.tsx` + `src/parts.css`  shared blocks: TradeTabs, Finding, Detail, ShareStrip, MonthStrip,
                     MonthBars, DuoBars, RankRows, EndingRow, PlainRow, EntityRow, FollowList, More, Field, CheckBox
- `src/screens/feed.tsx`, `src/screens/tender.tsx`, `src/screens.css`   the two finished reference screens
- `src/store.tsx`, `src/data.ts`, `src/mode.tsx`   state, real data, `useWide()`: unchanged from the old
  prototype. DO NOT EDIT.
READ `ui.tsx`, `parts.tsx`, `v2.css`, `feed.tsx`, `tender.tsx` before writing anything.

## Rules for your work
- Edit ONLY the files assigned to you (below). Do NOT edit v2.css, ui.tsx, parts.tsx, parts.css,
  screens.css, App.tsx, main.tsx, store.tsx, data.ts or another agent's files. If a shared primitive is
  missing, build it locally in your own file and list it in your hand-back.
- Your CSS goes in your own `src/css/<name>.css` (already imported). Prefix classes with your screen's
  letters (e.g. `.s-…` for search). Use the tokens (`var(--line)`, `var(--pad)`, …); no new colours
  except by a stated need.
- Keep every Lithuanian string, number, name and date from the old screen VERBATIM (old source in
  `/home/user/procurement/mock/proto/src/screens/…` and `/home/user/procurement/mock/proto/src/shared/…`).
  Keep every behaviour and route. New strings: only the ones this brief gives you.
- Never store, log or send anything typed into a field. No localStorage/sessionStorage/cookies, no
  network requests, no `window.open`, no `alert/confirm/prompt`, no writes to `location.hash`/history,
  no regex lookbehind, no `100vh`/`100dvh` (the page is hosted in a sandboxed frame; use `100%`).
- Routes are state only: `useStore().go('#/…')`.
- Build to YOUR OWN folder so builds do not collide:
  `cd /home/user/procurement/mock/proto2 && npx tsc --noEmit && npx vite build --outDir dist-<you>`
  (tsc may show errors in files other agents are still writing; fix only yours.)
- Screenshot (fresh page per run; `@go:` jumps to a route; `@desk` switches to the desktop page):
  `cd /home/user/procurement/mock/proto2 && DIST=dist-<you> node tools/shot.cjs /tmp/<name> '#siandien' 390 844 '@go:#/stebimi'`
  `DIST=dist-<you> node tools/shot.cjs /tmp/<name>-wide '#siandien' 1360 900 @desk '@go:#/stebimi'`
  It writes `<name>.png` and `<name>-full.png`. Extra arguments that are plain text are clicked in order.
  OPEN EVERY PNG (Read) and fix what is wrong before handing back: clipped text, uneven insets, a rule
  missing between blocks, a left edge that does not line up with the 20px page inset (28px on desktop),
  anything rounded, anything that looks like a card.
- Hand back: files written, screenshots taken (paths), strings you added, anything you could not do.
