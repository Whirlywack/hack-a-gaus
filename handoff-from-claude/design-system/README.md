gaus shows Lithuanian public tenders to the firms that can win them. Its interface is in Lithuanian and is built like a drawn sheet: rules, ruled cells, corner brackets and large plain type on a warm off-grey ground. There are no cards.

## Principles

1. **The structure is visible.** A screen is one ruled sheet on `ground`. Blocks are divided by a full-width rule in `line`; rows inside a block by a rule in `line-2`; things side by side are cells that share a border. Nothing floats, nothing has a shadow, and every corner is `radius-0`.
2. **Every screen opens with its answer.** One sentence in `display`, written from the data on that screen, with its second clause in `dim`. A person who reads only that sentence has the point of the screen.
3. **Type carries the hierarchy.** Section names are `label` in `accent` with a two-digit count in `index` at the far end. Titles are `row-title` in `ink`. Everything that supports them is `small` in `ink-2`.
4. **Time left is drawn big.** Days left stand at the left of a row in `numeral-row`, and turn `urgent` at 7 days or fewer. Nothing else is ever `urgent`, except a negative amount in a table.
5. **One accent.** `accent` marks the section labels, the chosen option, the one filled action on a screen and the bar that means now. Bars that compare things are `ink` for the leader and `mark` for the rest.
6. **Pictures are quoted.** A picture or a sentence taken from a document sits inside corner brackets, which say: this comes from the data.
7. **Phone first.** A phone screen is an overview of at most three findings, each leading to its own detail screen. Desktop lays the same blocks side by side as ruled columns inside one frame.

## Colour

- Set every screen on `ground`. Use `band` only behind a drawn phone or a demo, and `raise` only inside a text field or under the pointer.
- Text is `ink`, `ink-2` or `ink-3`, in that order of importance. `ink-3` is for index numbers and placeholders. `dim` is only for the second clause of a `display` sentence.
- A filled accent action carries `on-accent` text. Use one per screen.
- The start flow is the one place `accent` floods a whole block; its text is `ground`.
- Do not add green, orange, amber, yellow or purple. Do not use gradients, glows or blur. The one drawn texture is the diagonal hatch in `mark` for "not yet published".

## Type

One family, Instrument Sans, in weights 400 to 600. No second typeface and no monospace.

- `display` for the answer, `title` for the name of the thing on screen, `finding` for the sentence of a finding.
- `row-title` for a row's title, `lead` for an answer inside a section, `body` for running text, `small` for supporting lines.
- `label`, `index` and `tag` are upper case with wide tracking. Write the words in sentence case and let CSS set the case, so Lithuanian letters convert correctly.
- `numeral` and `numeral-row` for figures, with the unit after them in 13px `ink-2`.
- Headlines are weight 500, never bold. Large type is tracked in; upper-case labels are tracked out.

## Layout

- Every left edge on a phone sits on the `space-5` inset; on desktop on `space-7`. Rules run past the inset to the edge of the sheet.
- A row has `space-4` above and below its content. A list row on a phone has a `when-col` column for its numeral, then the text.
- Anything pressable is at least `tap` high.
- On desktop the sheet is at most `frame` wide, with a rule down each side for the full height and a plus mark where a horizontal rule meets them. Columns are divided by a rule, never by a gap.
- Do not centre a narrow column in a wide window.

## Building a screen

1. `Bar` at the top (phone) or `DeskTop` (desktop).
2. `Answer`.
3. If the screen can be filtered or scoped, `RuleTabs`.
4. One `Section` per kind of thing, made of `TenderRow`, `EndingRow`, `RankRows`, `EntityRow` or `PlainRow`. On a phone overview use three `Finding` blocks instead and put the lists on detail screens.
5. Facts read together go in `Cells`. Links go in `LinkRow`.
6. One decision per screen: `CellButton` for a pair of opposite choices, or one primary `Button`. In the start flow the question stands in the accent flood, the `Field` or `CodeCells` on `ground` under it, and the primary `Button` at the foot.
7. `TabBar` at the bottom of a phone screen.

## Words and numbers

- The interface is Lithuanian. Use „…“ for quotes: UAB „Jurmelsta“.
- Dates read "lapkričio 18 d.", with the year first only when it is not this year: "2027 m. balandžio 4 d.". Times follow a comma: "iki lapkričio 18 d., 14:00".
- Thousands take a space, decimals a comma, the unit a space: "1 468", "3,8 mln. €", "19 %". Keep those spaces non-breaking.
- Time left is "7 d." up to a month, then "5 mėn.".
- A tender or contract title is shown exactly as the buyer wrote it, capitals and all, and clamps to two lines.
- Do not use an en or em dash in interface text. Use a comma, a colon or two sentences.
- A finding is a sentence with its number in it: "Iš 97 sutarčių 38 laimėjo UAB „Jurmelsta“". A label is a few words: "Kas čia laimi".

## Pictures

- All bars are flat rectangles drawn to scale from zero. No rounded ends, no gridlines, no legends beyond the `ShareStrip` figures.
- `ShareStrip` for shares of one whole, `RankRows` for a ranking, `DuoBars` for first against second, `MonthStrip` when contracts can be counted, `MonthBars` when a month holds many.
- Only the bar that means "now" or "this one" is `accent`.
- Every picture stands in a `Bracket`, under one sentence that says what it shows.

## Motion and states

- Motion explains a change and nothing else: the accent rule slides in on the chosen tab, a screen eases in by 6px, a sheet slides up. 160 to 240ms. Honour reduced motion.
- Focus is a solid 2px `accent` outline inside the element.
- A followed thing settles: "Stebėti" in an ink outline becomes "Stebiu" in a `line` outline with the bookmark filled.
- An empty block says so in one `small` sentence under its section head.
- An error is one sentence in `ink` at weight 550 beside a filled `ink` square with a cross, directly under the thing that is wrong. It is never `urgent`: red only ever means a deadline.
- Something sent or done is one sentence beside a filled `accent` square with a check.

## Never

Cards, shadows, rounded corners, pills, sliding segmented controls, icons in coloured squares, emoji, centred layouts, a second accent, a coloured section background other than the start flow, decorative motion, text smaller than 10px.

## Using it in code

Load `tokens.css`, then `components/bundle.css`, and put the class `v` on the root element. Every component is plain markup with the classes shown in its preview; the previews are static renditions of the React components in the gaus prototype (`ui.tsx`, `parts.tsx`), which is the source for this system. There is no script bundle.

## Not in this system

There is no logo. The wordmark is the word "gaus" in lower case, set in the family at weight 600 with tight tracking. There is no icon set of its own: the few arrows, the bookmark, the check, the file and the search glyph are Lucide icons at a 1.5px stroke.
