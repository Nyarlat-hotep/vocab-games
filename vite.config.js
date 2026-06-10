import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
// Single-file build inlines all JS/CSS into one index.html so the deployed site
// has no loose, publicly-fetchable asset files — required for StatiCrypt to
// actually protect the content (see scripts/encrypt + README).
export default defineConfig({
  base: '/vocab-games/',
  plugins: [react(), viteSingleFile()],
})
