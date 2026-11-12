import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // One database per run, shared by every file in it: run files one at a time.
    fileParallelism: false,
  },
})
