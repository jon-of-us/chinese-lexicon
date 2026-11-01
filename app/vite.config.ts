import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import * as AppConfig from './src/lib/config.ts'
import * as DictionaryData from './scripts/generate-dictionary-data.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte(), DictionaryData.dictionaryDataPlugin()],
  // Build-time constant: when training is disabled, Rollup drops the training code and its sentence data from the bundle.
  define: { __TRAINING_ENABLED__: JSON.stringify(AppConfig.config.training.enabled) },
  server: {
    fs: { allow: ['..'] },
  },
})
