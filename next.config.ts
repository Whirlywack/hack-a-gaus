import type { NextConfig } from 'next'

const config: NextConfig = {
  // The handoff folder is reference material, not part of the app.
  outputFileTracingExcludes: { '*': ['handoff-from-claude/**', 'design docs/**'] },
}

export default config
