# Kinds of work match on 5-digit CPV groups and guarded title words, not on detailed codes

A Public tender matches a Kind of work when (1) any of its CPV codes falls in one of the kind's 5-digit CPV groups, or (2) its title contains an include word **and** its main CPV is in the same 2-digit division as the kind. Exclude words remove word matches only: a code match is never dropped by them. Words are matched as whole-word Lithuanian stems, never as substrings. We match this coarsely because buyers' detailed codes are unreliable, and we guard the word match because title words alone pull in the wrong work.

## Evidence

- Only 43 of 204 footpath jobs carry the footpath code.
- In a June 2026 test, the design code 79930000 returned land surveying.
- For one buyer (Jurbarkas), 90 titles with road words had no road code. 55 were design or engineering services (division 71), 10 were street lighting, and 5 matched only because "priedangai" contains "dang". The real gain from title words is the road, pavement and car-park jobs filed under the general code 45453000, which the division guard keeps.
- A code match has to survive exclude words. Contract 2007951195 (codes 45223300 and 45233161, pavement, lighting and parking places) is road work and carries the excluded word "apšvietimo".
- A trial of the rule on the 230 Jurbarkas contracts gave 96 matched by code, 27 by word, 16 excluded and 91 not matched. No contract with a division-71 main code matched through a word. The trial's word list still held "gatv", which was then removed (see below), so these counts are a record of the trial and not test expectations.

## Consequences

- The line that tells a User why a tender is shown names the Kind of work and what matched: the code or the word.
- "Any of its CPV codes" means every code listed on the tender. The open-tender feed, as the old gaus loader stores it, gives one list of codes per tender and no codes per lot, so lots are not matched separately. Where a source has no main-code flag, the first listed code is the main one.
- Title words only add tenders filed under other codes. They never narrow a Kind of work inside its own CPV group, because how precise title words are inside one group has not been measured. The prototype's five detailed road kinds, all inside group 45233, were dropped for this reason: the road kinds are the 5-digit groups themselves.
- Include words must name things, not streets. "gatv" is left out because it appears as an address in jobs that are not road work (contract 2006196604, sewer manholes "Dariaus ir Girėno gatvėje").
- A kind may separately carry code-exclude words for an overloaded group such as 79930000, which do drop a code match. The road kinds have none.
- Stems come from the Lithuanian text search in Postgres, which keeps whole words apart: "kelių" gives "kel" while "kelionių" gives "kelion", and "dangos" gives "dang" while "priedangos" gives "priedang". It does not split compounds: "žvyrkelių" gives "žvyrkel", so a kind's words must list such forms separately. It removes no stop words.
