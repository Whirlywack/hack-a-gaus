gaus: screens and visual system
Nov 12, 2026 · @Dmitry Y
Screens
Eight screens and four overlays, all in the clickable prototype on phone and desktop. The prototype shows fixed sample data; it is the design, not the working product.
Screen
Name in the app
The question it answers
Setup
Pradžia
What work do you do?
Feed
Šiandien
What needs me today?
Following
Stebimi
Where do my tenders and the things I watch stand?
Tender
Pirkimas
Should I bid on this one?
Buyer
Pirkėjas
Who holds this buyer's work, and when does it come free?
Company
Įmonė
What does this firm win, from whom, and how is it doing?
Your market
Rinka
Who buys, who wins and when do contracts end in my trade?
Search
Paieška
Where is this tender, buyer or firm?
Šiandien, Stebimi, Rinka and Paieška are the four tabs. Pirkimas, Pirkėjas and Įmonė open from rows and links. Pradžia runs once, before the tabs.
Setup (Pradžia)
1. Describe your work in your own words, or enter your company code instead.
2. Tick the kinds of work that fit. Each kind shows how many contracts were signed in 12 months and one real example.
3. See the open tenders that match ("Štai ką radome").
4. Create an account: e-mail and password.
5. Confirm the e-mail address ("Patikrinkite el. paštą"): the 6-digit code from the letter, typed into six ruled cells and checked as soon as the sixth digit is in. States: checking, wrong code, send again after 60 seconds, change the address. Then Šiandien.
6. Sign-in is a separate screen with a "forgot password" step.
Feed (Šiandien)
• The answer: how many followed tenders end soon and how many new ones appeared.
• Area tabs: all areas, or one line of work.
• Skubu: followed tenders that end within 7 days, each with its stage.
• Nauji pirkimai: new tenders that match your work. Each can be followed (Stebėti) or dismissed (Ne man). Tags show the line of work and "no special requirements" when the documents say so.
• Artėja: what is coming, such as market consultations.
• Rezultatai: who won the tenders you followed.
• Atidėti: tenders you dismissed, which you can bring back.
Following (Stebimi)
• The answer: how many open tenders you follow and the nearest deadline.
• Atviri pirkimai: each followed tender with its stage: Stebiu, Rengiu, Pateikiau.
• Pirkėjai, įmonės ir sutartys: the buyers, firms and contracts you follow, each with its latest news.
• Baigti pirkimai: finished tenders with the winner and the amount.
Tender (Pirkimas)
• Head: status, procedure type, the title exactly as the buyer wrote it.
• Days left and the deadline.
• Buyer: a link to the Buyer screen. Under it, the reason the tender is shown to you.
• Actions: Stebėti or Ne man. Once followed, the stage steps and Nebestebėti.
• Ko reikalauja šis pirkimas: similar work, specialists, certificates, bid security, turnover. Each answer can show the quoted sentence and the file it came from. Documents are read only when you ask. Other states: no special requirements; market consultation.
• Svarbiausia: how bids are judged, whether it is split into lots, whether bid security is needed.
• Links: the documents, and where to submit the bid.
• A finished tender shows the winner and the contract value instead.
Buyer (Pirkėjas)
• Head: name, company code, follow.
• The answer: the nearest long contract that ends, and who holds it.
• Two figures: contracts in 12 months and their value, plus the usual contract size.
• Atviras pirkimas: the buyer's open tender, which opens the Tender screen.
• Kada atsilaisvina: long contracts by the month they end, then the list. A row opens the contract panel.
• Kas čia laimi: each firm's share and a ranked list. A firm opens the Company screen.
Company (Įmonė)
• Head: name, company code, follow.
• The answer: contracts won in 12 months and their value.
• Kas iš jų perka: the buyers, ranked.
• Sutartys: every contract of the year. A row opens the contract panel.
• Finansai: revenue, net profit and equity for five years, and the registration date.
• A note says gaus sees only won contracts.
Your market (Rinka)
• The answer: how many buyers signed how many contracts in 12 months, and the usual contract size.
• Kas perka: the share of the five largest buyers and the top five, each with a follow button.
• Kas laimi: the same for firms.
• Kada atsilaisvina: long contracts ending in each of the next 12 months, and the nearest three.
On a phone Buyer, Company and Your market each open as a short overview of three findings; every finding leads to its own detail screen. On desktop the same blocks sit side by side on one page.
Search (Paieška)
One field. Results come in three groups: Pirkimai, Pirkėjai, Įmonės, with the matched letters marked.
Overlays
Overlay
Opens from
Holds
Contract panel
Any contract row
Title, buyer, holder, value, signed and end dates, amendments, follow
Ne man
A new tender
Four reasons: not my work, too big, too far, other. Then a message with an undo
Account
The KG box
My work, notification switches, sign out
Sign-in
Setup
E-mail, password, forgotten password
Data
Five sources carry every screen; three more are optional or parked. Spinta is the API of data.gov.lt (get.data.gov.lt). Checked in the gaus code on 11 November.
Source
Where it comes from
Screens
State
Open tenders
The procurement office's API on viesiejipirkimai.lt, with a key. Not Spinta
Setup, Feed, Following, Tender, Buyer, Search
Works, hourly. Runs on a fix that is not committed
Awarded contracts
Spinta, gov/lsd/vpt/cvpp: Sutartis (contracts) and Salis (buyers and suppliers)
All except Tender
Local copy ends September 2025; needs the full reload (6.13M rows). Buyer and supplier names lag about two months
Product codes
Spinta, gov/vpt/new: CvpCode
Setup, matching
Works
Registrų centras
Spinta, gov/rc/jar. gaus loaded it from downloaded files
Company, Search, company names everywhere
Works. Finances to 2024, loaded by hand in June
Tender documents
Public notice pages on viesiejipirkimai.lt, fetched per tender when a person asks
Tender: "Ko reikalauja šis pirkimas"
New. Fetching worked on 15 of 15. Permission for automated fetching is not yet asked
Attestation and licence registers
Each register's own API
Setup, Company
New, optional
EU notices (TED)
TED's API
Feed: award news for large tenders
A loader exists, last run 18 July
Procedures with bidders
Spinta, gov/vpt/new: Atn1
None
Parked: bid detail ends May 2023
The prototype's sample data is real: one trade (road and street works, CPV 45233), one buyer (Jurbarko rajono savivaldybės administracija), one firm (UAB „Jurmelsta“) and five open tenders, all fetched on 11 November 2026.
Visual system
The product is drawn as one ruled sheet: rules, ruled cells, corner brackets and large plain type on a warm off-grey ground. The full system, with every token, 27 components with live previews and the usage rules, is the gaus Design System. This section is the short version.
Principles
1. The structure is visible. Blocks are divided by full-width rules; things side by side are cells that share a border. No cards, no shadows, no rounded corners.
2. Every screen opens with its answer. One large sentence written from the data, its second clause in grey.
3. Type carries the hierarchy. Small upper-case section labels in the accent with a count at the far end; titles in ink; everything else smaller and grey.
4. Time left is drawn big. Days left stand at the left of a row as a large numeral, red at 7 days or fewer.
5. One accent. Ultramarine marks section labels, the chosen option, the one filled action on a screen and the bar that means now.
6. Pictures are quoted. A chart, or a sentence taken from a tender's documents, sits inside corner brackets.
7. Phone first. A phone screen is an overview of at most three findings; lists sit one tap away. Desktop lays the same blocks out as ruled columns.
Colour
Token
Value
Use
Contrast on ground
ground
#EEEBE6
The page

band
#E4E1DC
Behind a drawn phone or a demo

raise
#F7F5F1
Inside a text field; a row under the pointer

line
#CDC8BF
Rules between sections, cell dividers

line-2
#DCD8D0
Rules between rows

ink
#17181A
Headlines, titles, values, numerals
14.9 : 1
ink-2
#5A5853
Supporting text, labels, units
6.0 : 1
ink-3
#6C6963
Index numbers, placeholders
4.6 : 1
dim
#7B7871
The grey second clause of a large sentence only
3.7 : 1
mark
#86837D
Bars that are not the leader and not now; the hatch
3.2 : 1
accent
#2B39D6
Labels, the chosen option, the one filled action, now
6.6 : 1
on-accent
#FFFFFF
Text on an accent fill
7.9 : 1 on accent
urgent
#B8283B
Deadlines within 7 days; a negative amount
5.2 : 1
No green, orange, amber, yellow or purple. No gradients or blur.
Type
One family, Instrument Sans, weights 400 to 600. No monospace.
Style
Size / line
Weight
Use
display
27 / 30 on a phone, 40 / 43 on desktop
500
The answer of a screen
title
22 / 26, 30 / 34 on desktop
500
The name of the tender, buyer or firm on screen
finding
19 / 24
500
The sentence of a finding
row-title
16 / 21
500
A row's title, as the buyer wrote it, two lines at most
lead
16 / 22
400
An answer inside a section
body
15 / 21
400
Running text
small
13 / 18
400
Supporting lines, in ink-2
label
11 / 14, upper case, wide tracking
600
Section, field and cell labels
index
11 / 14, wide tracking
500
Counts and index numbers: 02, 001
numeral
34 / 34, 28 in a list row
450
Days left, counts, sums
Layout
• Page inset: 20px on a phone, 28px on desktop. Rules run past the inset to the edge.
• A row has 16px above and below. A list row starts with a 58px column for its numeral.
• Anything pressable is at least 44px high.
• Desktop: one sheet at most 1,240px wide, a rule down each side, columns divided by rules, a plus mark where rules meet the frame.
• Corner radius is 0 everywhere.
Components
Group
Components
Type
Answer, Label, Numeral
Structure
Section, Cells, Bracket, LinkRow
Rows
TenderRow, EndingRow, RankRows, EntityRow, PlainRow, Finding
Controls
Button, FollowButton, CellButton, RuleTabs, Tag, Field, CheckBox
Pictures
ShareStrip, MonthStrip, MonthBars, DuoBars
Chrome
Bar, TabBar, DeskTop
A screen is built in this order: Bar, Answer, RuleTabs if it can be filtered, Sections of rows (or three Findings on a phone overview), one decision, TabBar.
Words and numbers
• Lithuanian quotes: UAB „Jurmelsta“. Dates: "lapkričio 18 d., 14:00". Numbers: "1 468", "3,8 mln. €", "19 %".
• Time left: "7 d." up to a month, then "5 mėn.".
• Tender and contract titles are shown exactly as the buyer wrote them.
• No en or em dashes in interface text.
Never
Cards, shadows, rounded corners, pills, sliding segmented controls, icons in coloured squares, emoji, centred narrow layouts, a second accent, decorative motion.
Where it lives
• Design System: tokens, components with previews and rules, readable by people and by coding agents.
• Prototype code: the React components (ui.tsx, parts.tsx) and the stylesheet (v2.css) the Design System was taken from.
• Reference pages it was drawn from: Rig and Future AGI, for the ruled grid, the labels with index numbers, the corner brackets and the two-tone headline.
Open points
[ ] Your word on the look. The system records the redesign as it stands; you have not said yet that this direction is the one.
[ ] New interface sentences. The answer lines on Šiandien and Stebimi and a few captions were written without the Lithuanian writing skill. They need a native read.
[ ] The line under the name on the Design System cover ("Viešųjų pirkimų įrankis tiekėjams") is a plain description I put there, not an agreed tagline.
[ ] No logo. The wordmark is the word "gaus" in the product typeface.
[ ] Components are static. The Design System shows each component as markup and styles; the React code lives in the prototype and is not packaged.
[ ] Home page. Not designed yet. Its eleven blocks are in the visual design brief; the look described there is the old one and is replaced by this system.
[ ] Real iPhone check of the prototype.
[ ] Data: the full reload of awarded contracts, the uncommitted fix on open tenders, permission for automated document fetching, IT-trade numbers for a second trade.
[ ] Registration. Password, or e-mail and code only, is not decided; the confirmation screen works with both. The 1-hour code lifetime and the 60-second wait before sending again are Supabase Auth defaults written into the screen. The account step has no links to terms and a privacy notice yet.