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

Needs Docker. Every run starts its own throwaway `supabase/postgres` container (Postgres 17, with the Lithuanian text search) on a random free port, applies this worktree's `supabase/migrations/*.sql`, runs Vitest against it with `TEST_DATABASE_URL`, and removes the container on exit. Nothing is shared between runs, so tests from different worktrees or branches can run at the same time. Extra arguments go to Vitest (`npm test -- tests/stems.test.ts`). Set `GAUS_TEST_PG_IMAGE` to use another image. CI runs the same command on every push.

Tests that do not touch the database can run alone with `npm run test:unit`, but `tests/stems.test.ts` needs `TEST_DATABASE_URL` and will fail without it.

## Copy register

`src/copy/register.ts` holds every interface string: the English intent, the Lithuanian text and an `approved` flag (all `false` until the operator approves, ticket #23). Components read strings with `t(key)`. `tests/copy.test.ts` checks the copy rules.

## Layout

- `src/app/`: pages. `src/ui/`: components from the prototype (`ui.tsx`, `parts.tsx`) plus `shell.tsx`, `sheet.tsx`, `code-field.tsx`.
- `src/styles/`: the prototype's stylesheets and fonts, plain CSS.
- `supabase/migrations/`: schema. `handoff-from-claude/`: planning handoff, reference only.
