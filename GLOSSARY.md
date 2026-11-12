# gaus

gaus helps Lithuanian suppliers find public tenders worth bidding on, see what each one requires, and keep track of the ones they pursue.

## Language

### Organisations

**Organisation**:
A legal entity, identified by its code. Buyer and Supplier are roles an Organisation plays, not kinds of Organisation: the same Organisation can be a Buyer on one Contract and a Supplier on another.
_Avoid_: firm, company, vendor

**Buyer** *(pirkėjas)*:
The Organisation on the buying side of a Public tender or a Contract.
_Avoid_: contracting authority, client

**Supplier** *(tiekėjas)*:
The Organisation on the selling side of a signed Contract. An Organisation that bid and lost is not a Supplier.
_Avoid_: bidder, winner, firm

### Procurement

**Notice** *(skelbimas)*:
A record in the open-notice feed. Its kind is a Public tender *(pirkimas)*, a Market consultation *(rinkos konsultacija)*, a dynamic purchasing system, a specific contract inside one, or a qualification system.
_Avoid_: listing, announcement

**Public tender** *(pirkimas)*:
A procurement a Buyer has published for bidding. It is open until its deadline and finished *(baigtas)* after it.
_Avoid_: contract, opportunity, lead

**Market consultation** *(rinkos konsultacija)*:
A notice in which a Buyer asks the market for input before it opens a Public tender, with a date to reply by. It can be followed and dismissed like a Public tender, but it has no Stage and no Reading.
_Avoid_: pre-tender, planned tender

**Contract** *(sutartis)*:
An awarded agreement between a Buyer and a Supplier.
_Avoid_: tender, opportunity, lead

**Small purchase** *(smulkus pirkimas)*:
A Contract that the source marks as an imported small purchase, or any Contract under 3,000 EUR. Counts of Contracts shown to a User leave Small purchases out.
_Avoid_: mažos vertės pirkimas (a legal term with its own thresholds), micro-contract, direct award

**CPV**:
Common Procurement Vocabulary: the EU code list that classifies what a Public tender or a Contract buys.
_Avoid_: capability code, category

**CPV group**:
All CPV codes that share the same first five digits, such as 45233 (road and street works).

### Work

**Kind of work** *(veikla)*:
One thing a Workspace says it does: one or more CPV groups, plus title words to include and title words to exclude.
_Avoid_: capability cluster, line of work, area

**Trade** *(veiklos sritis; on screen "sritis")*:
A named set of Kinds of work, such as road and street works. A Workspace can have several.
_Avoid_: profile, search lens, line of work, area

### Documents

**Requirement** *(reikalavimas)*:
A condition an Organisation must meet to bid on a Public tender.
_Avoid_: criterion, qualification

**Quote** *(citata)*:
A sentence copied word for word from a Public tender's documents, with the file it came from.
_Avoid_: excerpt, summary

**Reading**:
What one Public tender's documents say about each Requirement: required, not required, or not found. The first two carry a Quote.
_Avoid_: analysis, extraction, summary

### Workspaces

**Workspace** *(paskyra)*:
The private space created by one sign-up. It holds that sign-up's Trades, Follows, Stages and Dismissals, and it may be linked to the Organisation it works for.
_Avoid_: account, team

**User**:
A person who signs in with an e-mail address and belongs to a Workspace.
_Avoid_: account

**Follow** *(stebėti)*:
A Workspace's mark on a Public tender or a Market consultation that it wants to keep track of.
_Avoid_: watchlist, bid tracker, pipeline

**Stage**:
Where a Workspace is with a Public tender it follows: Watching *(Stebiu)*, Preparing *(Rengiu)* or Submitted *(Pateikiau)*.
_Avoid_: status, pipeline, bid tracker

**Dismiss** *(Ne man)*:
A Workspace's decision that a Public tender is not for it, with one reason: Ne mano darbai, Per didelis, Per toli or Kita.
_Avoid_: hide, reject

## Replaced terms from the old gaus glossary

- **Bid tracker / Pipeline** is replaced by **Follow** and **Stage**.
- **Profile / Search lens** is replaced by **Trade**.
- **Capability cluster** is replaced by **Kind of work**.
