# A tender's Buyer is linked to its Contracts by exact name, or not at all

The open-tender feed gives a Buyer's name but not its code, while Contracts carry the code and often the name. We link the two only when the name matches exactly after folding case and Lithuanian letters. If there is no exact match, the tender shows nothing about its Buyer's past Contracts. A looser match would show one Buyer's history under another's name, and a User cannot tell that it happened.

## Evidence

- The old gaus linked 91.4 % of live tenders to a Buyer by exact unique name (63,433 of 69,434, July 2026).
- Of the 4,608 Contracts pulled on 11 November 2026, 3,345 have a Buyer name (352 Buyers, median 3 Contracts each, 190 with three or more). 1,006 have a Buyer code but no name and 257 have no Buyer.

## Consequences

- Contracts without a Buyer name are left out, and the screen says it counts Contracts with a named Buyer.
- The period is the one the loaded Contracts cover, stated on screen: "per 12 mėnesių".
- A Buyer with fewer than 3 Contracts gets a plain list, not a ranking.
- Suppliers without a usable code appear as one unnamed line and are never ranked as an Organisation.
- Small purchases are left out as well, and the caption says so. That leaves 2,077 Contracts with a named Buyer in the pull. For roads (45233) it is 184 Buyers with a median of 2 Contracts: 80 get a ranking and 104 get a plain list of one or two.
