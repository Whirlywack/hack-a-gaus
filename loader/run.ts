// Load every Notice from the feed into the database, once. Run hourly by
// .github/workflows/load-notices.yml, and by hand from the same workflow.
//
//   VPT_API_KEY=... DATABASE_URL=... node loader/run.ts
//
// Writes the run's summary to $GITHUB_STEP_SUMMARY when it is set. Neither the key nor
// the connection string is ever printed: every error message is masked before it is.
import { appendFile } from 'node:fs/promises'
import postgres from 'postgres'
import {
  feedFetcher,
  openNoticesByKind,
  redact,
  runSummary,
  unrecognisedKinds,
  walkNotices,
} from './notices.ts'

const key = process.env.VPT_API_KEY
const url = process.env.DATABASE_URL

try {
  if (!url) throw new Error('the database connection string is not set (DATABASE_URL)')
  const fetchPage = feedFetcher({ key })
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url)
  const sql = postgres(url, {
    max: 1,
    // Works through Supabase's session and transaction poolers alike.
    prepare: false,
    ssl: local ? false : 'require',
    connect_timeout: 30,
    onnotice: () => {},
  })
  try {
    const started = Date.now()
    const walk = await walkNotices(sql, fetchPage)
    const summary = runSummary({
      walk,
      open: await openNoticesByKind(sql),
      unrecognised: await unrecognisedKinds(sql),
      seconds: Math.round((Date.now() - started) / 1000),
    })
    console.log(summary)
    if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, summary)
  } finally {
    await sql.end({ timeout: 5 })
  }
} catch (e) {
  const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e)
  console.error(`The load failed: ${redact(message, [key, url])}`)
  process.exitCode = 1
}
