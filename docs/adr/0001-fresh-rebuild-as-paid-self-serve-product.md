# A fresh rebuild of gaus as a paid, self-serve product

The old gaus repo (`Whirlywack/gaus`) was a personal tool: its ADR-0003 and ADR-0007 held self-serve sign-up and billing back until a deliberate pivot. ADR-0007's own trigger has fired (matching validated on 11 June 2026, first live run on 10 July 2026), and this repo is that pivot, decided in November 2026. gaus is rebuilt here from the design brief and the design system, with self-serve sign-up from the first slice, to be launched as a paid product. The old repo is reference only.

## Consequences

- Billing is not part of the first slice, but nothing may assume a single trusted group of users.
- The old repo's 15 routes and its glossary (`CONTEXT.md`) do not carry over by default. `GLOSSARY.md` here lists the terms that replace old ones.
