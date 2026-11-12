# Road and street works (CPV 4523*) across Lithuania: market figures

Source: get.data.gov.lt (Spinta), `cvpp/Sutartis` and `cvpp/Salis`, read in the built-in browser on 2026-11-11. Every figure is computed from fetched rows; nothing is estimated. Rows are in `market.json`.

**Filter.** A contract counts when any code in its `cpv_codes` field starts with `4523` (server filter `cpv_codes.startswith("4523") | contains(";4523") | contains("; 4523")`, re-checked locally on every code) and `dok_sut_tipas != 5`.

**A window (the year):** signed 2025-11-11 to 2026-11-11 inclusive. count() = **4,608**, under 8,000, so **all rows were fetched**; no sub-window.

**B window (coming free):** signed before 2025-11-11, end date 2026-11-11 to 2027-11-11 inclusive. count() = **586**, all fetched.

**Requests:** 101 browser requests to the API in total (60 Sutartis, 41 Salis), including 2 that failed (CSV format refused by the browser as a download; `sum()` rejected with HTTP 400 UnknownMethod) and 1 empty probe.

**Read this first: CPV 4523 is wider than roads.** By the first 4523 code in each contract: 45233 (roads) 2515 contracts / EUR 1,461.6m; 45231 (pipelines, power and communication lines) 873 / EUR 172.9m; 45232 (ancillary pipeline and cable works, sewers) 856 / EUR 78.3m; 45236 (flatwork) 238 / EUR 9.5m; 45234 (railways) 49 / EUR 82.3m; 45237 59; 45230 12; 45235 6. Gas-grid (ESO), power-grid (Litgrid) and water-utility contracts are in the totals.

## 1-3. The year: headline figures

| Figure | All contracts | Contracts >= EUR 3,000 |
|---|---|---|
| Contracts | 4,608 | 3,115 |
| Total value (sum of `dok_sut_verte` as published) | EUR 1,836,938,427.54 | EUR 1,835,527,929.16 |
| Distinct buyers (by code) | 766 | 499 |
| Distinct named suppliers (by code) | 1,106 | 779 |
| Value q25 / median / q75 | EUR 1,687.20 / EUR 10,317.22 / EUR 77,049.50 | EUR 9,990.85 / EUR 27,606.85 / EUR 189,440.50 |
| Mean value | EUR 398,641.15 | EUR 589,254.55 |
| Contracts with a known buyer | 4,351 | 2,863 |
| Supplier named / hashed / no Salis row | 3808 / 228 / 572 | 2649 / 86 / 380 |

Quartiles use the inclusive method over all contract values. Distinct buyers count Salis buyer rows plus `Sutartis.user_id` (filled only for type-8 rows); 257 contracts have neither.

### Contract type (`dok_sut_tipas`) and object kind (`dok_sut_obj_rusis`)

Code labels are not published in the API; none are guessed here. The earlier Jurbarkas run found that type 8 rows are the imported small purchases (they carry `user_id`; here too all 2,229 type-8 rows have `user_id` and no other type does). In 2,188 of the 2,229 type-8 rows the end date equals the signing date.

| dok_sut_tipas | Contracts | Value | Contracts >= 3,000 | Value >= 3,000 |
|---|---|---|---|---|
| 8 | 2,229 | EUR 7,698,216.00 | 786 | EUR 6,370,912.42 |
| 2 | 1,054 | EUR 44,407,399.45 | 1,023 | EUR 44,349,907.59 |
| 1 | 739 | EUR 1,269,401,922.15 | 738 | EUR 1,269,398,928.06 |
| 3 | 530 | EUR 514,997,769.50 | 526 | EUR 514,990,483.41 |
| 11 | 56 | EUR 433,120.44 | 42 | EUR 417,697.68 |

| dok_sut_obj_rusis | Contracts | Value | Contracts >= 3,000 | Value >= 3,000 |
|---|---|---|---|---|
| 3 | 4,326 | EUR 1,836,003,754.15 | 3,065 | EUR 1,834,744,691.63 |
| 2 | 259 | EUR 580,635.20 | 42 | EUR 445,044.52 |
| 1 | 23 | EUR 354,038.19 | 8 | EUR 338,193.01 |

**Small/oral purchases.** The user's repo (`src/`, `supabase/migrations/`) has no marker for oral contracts (grep for "oral"/"žodin" found only unrelated text). In the data, type 8 is the only usable signal: 2,229 contracts worth EUR 7,698,216.00 (median EUR 1,637.08), 0.4% of the year's value. 1,443 of them are under EUR 3,000.

Contracts signed per month (all): 2025-11 348, 2025-12 483, 2026-01 155, 2026-02 244, 2026-03 350, 2026-04 500, 2026-05 487, 2026-06 541, 2026-07 529, 2026-08 457, 2026-09 390, 2026-10 124

## 4. Top buyers and suppliers (whole year, all values)

| # | Buyer | Code | Contracts | Total value | Median value |
|---|---|---|---|---|---|
| 1 | Kauno miesto savivaldybės administracija | 188764867 | 189 | EUR 275,888,224.93 | EUR 36.54 |
| 2 | Kauno rajono savivaldybės administracija | 188756386 | 182 | EUR 22,767,431.99 | EUR 3,662.19 |
| 3 | Valstybės įmonė Valstybinių miškų urėdija | 132340880 | 91 | EUR 7,029,287.64 | EUR 62,604.19 |
| 4 | Uždaroji akcinė bendrovė "Giraitės vandenys" | 159702357 | 72 | EUR 4,911,210.93 | EUR 453.75 |
| 5 | Akcinė bendrovė 'Via Lietuva' | 188710638 | 71 | EUR 443,376,381.09 | EUR 3,484,664.48 |
| 6 | Prienų rajono savivaldybės administracija | 288742590 | 66 | EUR 2,833,544.84 | EUR 9,494.74 |
| 7 | Kelmės rajono savivaldybės administracija | 188768730 | 64 | EUR 24,511,301.12 | EUR 55,533.54 |
| 8 | Ukmergės rajono savivaldybės administracija | 188752174 | 63 | EUR 4,663,989.73 | EUR 18,000.00 |
| 9 | Alytaus rajono savivaldybės administracija | 188718528 | 60 | EUR 17,729,563.28 | EUR 29,346.60 |
| 10 | Jonavos rajono savivaldybės administracija | 188769070 | 48 | EUR 13,875,219.65 | EUR 3,630.00 |
| 11 | Švenčionių rajono savivaldybės administracija | 188766722 | 47 | EUR 31,199,848.61 | EUR 213,868.17 |
| 12 | AB "LTG Infra" | 305202934 | 46 | EUR 80,614,667.54 | EUR 65,523.31 |

Outside the top 5 buyers: 761 of 766 buyers, 3,746 contracts, EUR 981,200,827.14. (Kaunas city's median of EUR 36.54 reflects many tiny type-8 purchases.)

| # | Named supplier | Code | Contracts | Total value | Median value |
|---|---|---|---|---|---|
| 1 | Akcinė bendrovė 'Kelių priežiūra' | 232112130 | 186 | EUR 32,519,729.42 | EUR 34,569.28 |
| 2 | UAB Centina | 305211805 | 47 | EUR 48,545.98 | EUR 302.50 |
| 3 | UAB "Santermita" | 236043660 | 42 | EUR 21,804.95 | EUR 18.45 |
| 4 | Uždaroji akcinė bendrovė "Parama" | 165108836 | 37 | EUR 29,426,511.61 | EUR 173,946.30 |
| 5 | UAB "Geovizija" | 300810466 | 36 | EUR 5,156,186.61 | EUR 54,855.02 |
| 6 | UAB "Daugesta" | 301550690 | 33 | EUR 29,430,399.12 | EUR 707,212.31 |
| 7 | UAB "JK Ranga" | 302505335 | 33 | EUR 17,589,438.50 | EUR 231,126.15 |
| 8 | UAB "Kelranga" | 151004973 | 31 | EUR 13,287,090.89 | EUR 9,680.00 |
| 9 | UAB "Baltuvos projektai" | 302485911 | 28 | EUR 1,447,153.74 | EUR 3,977.56 |
| 10 | UAB Liejamų dangų meistrai | 305454091 | 28 | EUR 523,347.54 | EUR 12,999.50 |
| 11 | UAB Lygesta | 307129495 | 28 | EUR 150,380.20 | EUR 5,491.62 |
| 12 | UAB 'KRS' | 133630961 | 27 | EUR 49,738,031.12 | EUR 361,790.00 |

Outside the top 5 named suppliers: 1,101 of 1,106 suppliers, 3,460 contracts with a named supplier, EUR 1,575,167,057.37. A joint contract counts once for each named supplier (11 contracts have two supplier rows).

**Contracts with no usable supplier: 800** (572 with no Salis row yet + 228 hashed). If the hashed code `9f88cc611035da6` (197 contracts) were ranked, it would be second after Kelių priežiūra; it is unnamed and excluded.

`market.json` also holds the same top-12 lists for contracts >= EUR 3,000 (`summary.top_buyers_ge3000`, `summary.top_suppliers_ge3000`).

## 5. Coming free: older contracts ending 2026-11-11 to 2027-11-11

586 contracts, EUR 897,567,150.66 in total. Types: 1 = 384, 2 = 107, 3 = 89, 8 = 5, 11 = 1.

| End month | Contracts | Value |
|---|---|---|
| 2026-11 (from the 11th) | 53 | EUR 202,883,498.13 |
| 2026-12 | 64 | EUR 72,437,223.00 |
| 2027-01 | 39 | EUR 43,805,524.66 |
| 2027-02 | 53 | EUR 37,523,475.66 |
| 2027-03 | 55 | EUR 175,971,826.03 |
| 2027-04 | 51 | EUR 99,711,257.06 |
| 2027-05 | 64 | EUR 63,255,176.91 |
| 2027-06 | 53 | EUR 60,969,490.46 |
| 2027-07 | 51 | EUR 35,971,802.54 |
| 2027-08 | 33 | EUR 27,286,369.05 |
| 2027-09 | 29 | EUR 25,188,892.97 |
| 2027-10 | 34 | EUR 40,404,693.80 |

The window also includes 2027-11-01 to 2027-11-11: 7 contracts, EUR 12,157,920.39; they are outside the 12 months above.

The values are the original contract values; amendments were not fetched, so a value may since have changed. Large repeated values (for example ten Kaunas water-utility (UAB "Kauno vandenys") lots of EUR 12,100,000 each, all ending 2026-11-15) look like framework ceilings.

## 6. The 8 that end soonest

Fifteen contracts end on 2026-11-15, so the 8th place is a tie; ties are ordered by dok_id. Buyer and supplier rows were fetched for all 22 contracts ending by 2026-11-15 (in `market.json`). For the other 564 B contracts no Salis join was made.

| End | Title | Value | Signed | Buyer | Supplier | dok_id |
|---|---|---|---|---|---|---|
| 2026-11-11 | Planiniai mažos apimties remonto ir  rekonstravimo darbai nuotekų tinkluose | EUR 544,500.00 | 2024-10-11 | Uždaroji akcinė bendrovė 'VILNIAUS VANDENYS' (120545849) | UAB "Inrestas" (303990852) | 2007286765 |
| 2026-11-12 | Vandentiekio tinklo rekonstrukcija Kauno r. sav., Babtų sen., Jugintų k., Labūnavos g. | EUR 84,522.13 | 2025-06-12 | Uždaroji akcinė bendrovė "Giraitės vandenys" (159702357) | UAB "KESRAMA" (300854758) | 2007693062 |
| 2026-11-13 | KAUNO MIESTO SUSISIEKIMO KOMUNIKACIJŲ REMONTO IR REKONSTRUKCIJOS DARBŲ CENTRO, DAINAVOS, EIGULIŲ, GRIČIUPIO, PETRAŠIŪNŲ, ŠANČIŲ IR ŽALIAKALNIO SENIŪNIJOSE PIRKIMO PAGRINDINĖ SUTARTIS J. MATEIKOS G. | EUR 662,321.55 | 2025-08-13 | Kauno miesto savivaldybės administracija (188764867) | UAB 'Kauno keliai' (135640993) | 2007765696 |
| 2026-11-13 | Rokų sen., Nemuno g., tvenkinio valymo ir pakrasčių sutvarkymo darbai | EUR 63,061.80 | 2025-10-13 | Kauno rajono savivaldybės administracija (188756386) | UAB "MOBARN-LT" (302911019) | 2007833915 |
| 2026-11-14 | Kauno r. , Ringaudų sen., Gaižėnėlių k., Nemuno g. rekonstravimo darbai | EUR 781,716.54 | 2024-09-20 | Kauno rajono savivaldybės administracija (188756386) | UAB 'Kauno keliai' (135640993) | 2007244617 |
| 2026-11-14 | Rajoninio kelio 4714 Strėva–Ismonys–Rūdiškės ruožo nuo 3,333 iki 9,462 km kapitalinis remontas | EUR 2,255,024.97 | 2025-06-30 | Akcinė bendrovė 'Via Lietuva' (188710638) | Akcinė bendrovė 'Kauno tiltai' (133729589) | 2007747015 |
| 2026-11-14 | Valstybinės reikšmės magistralinio kelio A12 Ryga–Šiauliai–Tauragė–Kaliningradas ruožo nuo 155,796 iki 157,57 km kapitalinis remontas | EUR 2,216,847.05 | 2025-08-14 | Akcinė bendrovė 'Via Lietuva' (188710638) | Akcinė bendrovė 'Kauno tiltai' (133729589) | 2007761601 |
| 2026-11-15 | Teritorijų reljefo, žaliųjų plotų sutvarkymo ir užsėjimo žole darbai | EUR 18,150.00 | 2023-11-15 | Kazlų Rūdos savivaldybės administracija (188777932) | UAB "Kelranga" (151004973) | 2006570290 |

## Data-quality problems seen

- **Salis is not loaded for recent contracts.** No Salis row exists for any type-8 contract with dok_id >= 1676278990 (count() over all CPVs returned 0), and the highest tendered dok_id in Salis is 2008237159. So 571 contracts of the year (315 type-8, 256 tendered, mostly signed in August-October 2026: 537 of 571, the earliest on 2025-12-31) have no supplier, and the 256 tendered ones also have no buyer. One more contract (2008232909) had no Salis row inside the loaded range.
- **Hashed suppliers.** 228 contracts have a supplier with `salies_asmens_rusis` = "Nežinomas" and a 15-character hex code and name. One code, `9f88cc611035da6` (name `4aaf9a206f1dfe3`, also seen in the Jurbarkas run), covers 197 contracts. No supplier is marked as a private individual (no "Fizinis" rows).
- **Wrong name on a buyer code.** Code 188756386 (Kauno rajono savivaldybės administracija, 52 rows) once appears with the name UAB "Kasuna". Merged by code; the majority name is shown.
- **Names spelt several ways (merged by code only):** 232112130 as "Akcinė bendrovė 'Kelių priežiūra'" (174), "Akcinė bendrovė \"Kelių priežiūra\"" (45), "AB Kelių priežiūra" (2); 188710638 Via Lietuva with single vs double quotes; 305211805 "UAB Centina" / "UAB \"Centina\""; 300810466 "UAB ..Geovizija" / "UAB \"Geovizija\""; 151004973 Kelranga and 133630961 KRS with and without quotes. AB Kelių priežiūra (232112130) also appears as a buyer.
- **Type-8 buyer names.** For 1,006 type-8 contracts the buyer is known only as a code from `user_id`, and no Salis row in this pull gives its name (`buyer_name` = null).
- **Possible duplicates.** 18 groups (38 rows) share buyer, value, signing date and title, for example four "kelio darbai" rows of EUR 6,050.00 from Alytaus rajono savivaldybė on 2025-12-23. They may be separate jobs; all are kept.
- **Framework ceilings repeated as values.** Same buyer and same value of EUR 1m or more appears on several contracts: Kaunas city 2 x EUR 91,212,000; Vilnius city 2 x EUR 27,225,000; Vilnius district lots 2 x EUR 23,140,495.87 and 2 x EUR 19,834,710.74; Kelmės r. 4 x EUR 1,580,283.90; and others. The year total of EUR 1.84bn is the sum of these published values and is inflated by framework maximums.
- **Odd values.** One negative value (dok_id 1675936697, "Šildymo darbai", EUR -43.40). No zero values. 20 contracts are under EUR 10 and 234 under EUR 100. Values cluster just under EUR 18,150: 55 contracts at exactly EUR 18,150.00 and 148 between EUR 18,000 and 18,150, against 18 between EUR 18,150.01 and 20,000.
- **Value 100x off.** Not checkable here: `dok_fakt_sut_ivyk_verte` was not fetched.
- **End dates.** None missing, none before the signing date; for 2,188 type-8 rows the end date equals the signing date and says nothing.
- **Filter traps.** `cpv_codes.contains("4523")` returns 4,845 rows, 237 of them false hits inside other codes (44523xxx hand tools, 14523xxx). 253 contracts carry several codes separated by ";".
- **API behaviour.** One Salis OR-batch came back with only 14 of 190 rows plus a `_page.next` token; re-querying past the last dok_id returned nothing, which is how the load cutoff was found. CSV and JSONL formats are refused by the browser (download); `:format/ascii` renders. `sum()` is not supported.

## What this does not cover

- Buyer and supplier for the 571 most recent contracts (not in Salis yet), and for 564 of the 586 B contracts (not joined).
- Amendments: excluded by rule and not linked, so values and end dates are as first published.
- Labels for `dok_sut_tipas` and `dok_sut_obj_rusis` codes.
