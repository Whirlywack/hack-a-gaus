# Build run: how to work through the tickets

These are the operator's instructions for the session that runs `/implement-spec` on this repo. The spec is issue #1 in `Whirlywack/hack-a-gaus`. The tickets are #3 to #25. Ticket #2 (accounts and secrets) is closed: read its closing comment for what is already set up.

## The operator is away

The operator is asleep and will not answer until morning. Never stop to wait for them.

- When something needs the operator, add it as a checkbox to one issue titled "Morning list for the operator", labelled `ready-for-human`. Create the issue the first time you need it. Say what you need, which ticket it blocks, and what you did in the meantime.
- Then park that ticket and continue with every other ticket that can move.
- Skip the two operator tickets, #23 (copy approval) and #24 (demo and submission).

## How each ticket is built

- Build each ticket test-first, at the seams the spec names.
- Run `/code-review` on each ticket's branch before it merges, and fix what it finds.
- Merge each reviewed ticket into `main` and push. GitHub Actions schedules and dispatches only from `main`, and Vercel's production deploy comes from `main`.
- Follow the Priority line in each ticket: never-cut tickets first, then the cut order.
- Run implementer, reviewer and merger subagents on Sonnet. Use Haiku for exploration and other read-only lookups. Do not use Opus or Fable for subagents: the operator wants this run cheap.

## What is and is not on this machine

- **No hosted credentials are on this machine.** The feed key, the hosted database string, the Resend key and the Anthropic key are GitHub Actions secrets: `VPT_API_KEY`, `DATABASE_URL`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`. Anything that touches the hosted database or the feed, including applying migrations, runs in a GitHub Action that reads those secrets.
- **Local tests use a local database**, which needs Docker. If Docker is not running, add that to the morning list and continue with tickets that don't need a database.
- **Vercel production variables** already set: `ANTHROPIC_API_KEY`, `ADDRESS_HASH_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. If the app needs another one, such as a server-side database string or `GITHUB_DISPATCH_TOKEN`, finish the code, add the variable's name to the morning list, and continue.
- **The fetcher's contact address** is the GitHub Actions secret `FETCHER_CONTACT`. Read it from the environment. Never write the address into the repo, which is public.
- Never print, log or commit a secret. List secrets by name only.

## Live model calls and money

- **If the file `~/.config/gaus/anthropic-key` exists,** the reader's scripts may read the key from it and make live calls. Pass the key to the SDK client explicitly. Do not export it as `ANTHROPIC_API_KEY` in any shell, because the coding session itself would then start using it.
  - Spend at most 20 USD in total on live calls tonight. Keep a running total from the token counts the API returns, in a file next to the scoring script.
  - You may run the scoring script from #13 at most twice on `claude-sonnet-5-5`, the reader's model. Record the mechanical result and list every disagreement for the operator to judge. Do not decide that the bar is met: that is the operator's call in the morning, so add it to the morning list.
  - One extra scoring run on `claude-haiku-5-5` is allowed as a comparison. It costs under 1 USD. Record it separately. It does not change the reader's model, which stays `claude-sonnet-5-5` unless the operator says otherwise.
- **If that file does not exist,** make no live model calls. Build the reader against the fixtures, and add "first scoring run" to the morning list.

## Interface copy

Write every Lithuanian string with the Lithuanian copy skill, with its English intent, and mark it pending in the copy register. Do not wait for approval.

## Do not touch

- DNS, billing, or any Supabase or Vercel project other than `hack-a-gaus`.
- The spend cap, the spend limit, or any rate limit set by the operator.
- Issues #1, #23 and #24, except to add a comment.
