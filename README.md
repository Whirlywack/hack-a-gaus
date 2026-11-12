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

## Copy register

`src/copy/register.ts` holds every interface string: the English intent, the Lithuanian text and whether the operator has approved it. New strings go in as `pending(...)`; the operator approves one by changing it to `approved(...)` (ticket #23). A text can hold `{name}` slots, and a counted text gives its three forms (`{ one: '{n} sritis', few: '{n} sritys', other: '{n} sričių' }`). Components read strings with `t(key)` or `t(key, { n: 3 })`. `tests/copy.test.ts` checks the copy rules on every entry.

## Layout

- `src/app/`: pages. `src/ui/`: components from the prototype (`ui.tsx`, `parts.tsx`) plus `shell.tsx`, `sheet.tsx`, `code-field.tsx`.
- `src/styles/`: the prototype's stylesheets and fonts, plain CSS.
- `supabase/migrations/`: schema. `handoff-from-claude/`: planning handoff, reference only.
