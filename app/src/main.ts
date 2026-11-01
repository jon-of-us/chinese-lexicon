import { mount } from 'svelte'
import App from './App.svelte'
import { cssVariables } from './lib/config'

for (const [name, value] of Object.entries(cssVariables)) {
  document.documentElement.style.setProperty(name, value)
}

const app = mount(App, {
  target: document.getElementById('app')!,
})

// After a redeploy, an open tab still points at hashed chunks that no longer exist, so reload once to get the new build.
const staleChunkReloadKey = 'staleChunkReloadAt'
const staleChunkError = /dynamically imported module|Importing a module script failed|Failed to fetch dynamically imported module/
window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason instanceof Error ? event.reason.message : String(event.reason)
  if (!staleChunkError.test(message)) return
  if (Date.now() - Number(sessionStorage.getItem(staleChunkReloadKey) ?? 0) < 10_000) return
  sessionStorage.setItem(staleChunkReloadKey, String(Date.now()))
  window.location.reload()
})

export default app
