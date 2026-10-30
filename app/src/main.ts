import { mount } from 'svelte'
import App from './App.svelte'
import { cssVariables } from './lib/config'

for (const [name, value] of Object.entries(cssVariables)) {
  document.documentElement.style.setProperty(name, value)
}

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
