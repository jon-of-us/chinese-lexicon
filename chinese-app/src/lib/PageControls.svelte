<script lang="ts">
  export type PageControl = { label: string; onClick: () => void; primary?: boolean; disabled?: boolean };
  let { controls }: { controls: PageControl[] } = $props();
</script>

<nav class="page-controls" aria-label="Page actions">
  {#each controls as control}
    <button type="button" class:primary={control.primary} disabled={control.disabled} onclick={control.onClick}>{control.label}</button>
  {/each}
</nav>

<style>
  .page-controls { position: fixed; z-index: 10; right: max(var(--space-page), env(safe-area-inset-right)); bottom: max(var(--space-lg), env(safe-area-inset-bottom)); display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-xs); max-width: min(100% - var(--space-page) * 2, 36rem); padding: var(--space-xs); border: var(--border-width) solid var(--color-border); border-radius: var(--radius-md); background: color-mix(in srgb, var(--color-surface) 92%, transparent); box-shadow: 0 10px 30px rgb(25 23 20 / .12); backdrop-filter: blur(10px); }.page-controls button { border: var(--border-width) solid var(--color-border); border-radius: var(--radius-sm); padding: var(--space-xs) var(--button-padding-x); color: var(--color-link); background: var(--color-surface); font-size: var(--font-size-small); font-weight: var(--font-weight-bold); transition: border-color var(--transition-fast), background-color var(--transition-fast), box-shadow var(--transition-fast); }.page-controls button:hover:not(:disabled) { border-color: var(--color-accent); background: var(--color-accent-subtle); }.page-controls button.primary { border-color: var(--color-accent); color: var(--color-on-accent); background: var(--color-accent); }.page-controls button.primary:hover:not(:disabled) { border-color: color-mix(in srgb, var(--color-accent) 84%, black); background: color-mix(in srgb, var(--color-accent) 92%, black); box-shadow: 0 2px 6px rgb(25 23 20 / .16); }.page-controls button:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }.page-controls button:disabled { cursor: default; opacity: .5; } @media (max-width: 680px) { .page-controls { left: var(--space-page); } .page-controls button { flex: 1; } }
</style>
