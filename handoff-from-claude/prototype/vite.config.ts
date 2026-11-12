import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true })],
  resolve: { preserveSymlinks: true, dedupe: ['react', 'react-dom'] },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 100_000_000,
    cssTarget: ['safari13', 'chrome80'],
    target: ['es2019', 'safari13', 'chrome80'],
    cssCodeSplit: false,
  },
})
