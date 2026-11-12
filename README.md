# gaus

Phone-first web app for Lithuanian public tenders. Next.js 16 and Supabase, hosted on Vercel and Supabase in Frankfurt (ADR-0003). Plain CSS from the design system; Base UI for the bottom sheet and the 6-digit code field only.

## Run it

```
npm ci
npm run dev
```

Pages: `/pradzia`, `/siandien`, `/stebimi`, `/pirkimas`. `/` redirects to `/pradzia`.

## Run the tests

```
npm test
```

Needs Docker. Every run starts its own throwaway `supabase/postgres` container (Postgres 17, with the Lithuanian text search) on a random free port, applies this worktree's `supabase/migrations/*.sql`, runs Vitest against it with `TEST_DATABASE_URL`, and removes the container on exit. Nothing is shared between runs, so tests from different worktrees or branches can run at the same time. A run killed with `kill -9` leaves its container behind; the next run on the same machine removes it. Extra arguments go to Vitest (`npm test -- tests/db/stems.test.ts`). Set `GAUS_TEST_PG_IMAGE` to use another image. CI runs the same command on every push.

Tests that need the database live in `tests/db/`. Everything else runs without Docker: `npm run test:unit`.

## The notice loader

`loader/` walks the procurement office's open-notice feed (about 84 pages of 1,000) and stores every Notice in `public.notices`: one row per Notice, updated when the feed changes it, never deleted (a trigger refuses deletes). Times are stored in UTC; the feed's are Vilnius time. Each Notice has a `kind`: `tender`, `market_consultation`, `dps`, `dps_contract`, `qualification_system`, `framework_contract`, `invitation_only` or `unknown`. Only `tender` and `market_consultation` are shown in this build. `tender` is given only to procedures checked to be a published call any supplier may answer; notices only invited suppliers or a framework's parties may bid on get `invitation_only` or `framework_contract`, and an unchecked procedure is `unknown` (the rule and its evidence are in the notices migration). The Buyer's code (`caNumber`) is stored in `buyer_code`. `public.notice_is_open(n)` says whether a Notice is open now. The value on a Notice is kept in `loader.notice_values`, which no client role can read. Every finished walk is recorded in `loader.walks`. A walk that ends with the newest publication more than 7 days old is refused and records nothing.

- `.github/workflows/load-notices.yml` runs every hour from `main`, and by hand (Actions, Load notices, Run workflow). It first applies pending migrations, then runs `node loader/run.ts`. The run summary gives the open Notices of each kind.
- `.github/workflows/migrate.yml` applies `supabase/migrations/` to the hosted database on every push to `main`, by hand, and before every load.
- Both read the Actions secrets `VPT_API_KEY` and `DATABASE_URL` (the session pooler's string, percent-encoded). Neither is printed.

To run a load from a machine that has the secrets: `VPT_API_KEY=… DATABASE_URL=… node loader/run.ts`.

## Copy register

`src/copy/register.ts` holds every interface string: the English intent, the Lithuanian text and whether the operator has approved it. New strings go in as `pending(...)`; the operator approves one by changing it to `approved(...)` (ticket #23). A text can hold `{name}` slots, and a counted text gives its three forms (`{ one: '{n} sritis', few: '{n} sritys', other: '{n} sričių' }`). Components read strings with `t(key)` or `t(key, { n: 3 })`. `tests/copy.test.ts` checks the copy rules on every entry.

## Layout

- `src/app/`: pages. `src/ui/`: components from the prototype (`ui.tsx`, `parts.tsx`) plus `shell.tsx`, `sheet.tsx`, `code-field.tsx`.
- `src/styles/`: the prototype's stylesheets and fonts, plain CSS.
- `supabase/migrations/`: schema. `loader/`: the notice loader. `handoff-from-claude/`: planning handoff, reference only.
