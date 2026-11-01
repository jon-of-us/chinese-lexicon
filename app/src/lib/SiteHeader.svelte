<script lang="ts">
  let { searchOpen = $bindable(), onSearchOpen, onSearchClose, onSettings, onHome, onTrain, onPinyin, onComponents }: { searchOpen: boolean; onSearchOpen: () => void; onSearchClose: () => void; onSettings: () => void; onHome: () => void; onTrain: () => void; onPinyin: () => void; onComponents: () => void } = $props();

  function toggleSearch() {
    if (searchOpen) return onSearchClose();
    searchOpen = true;
    onSearchOpen();
  }
</script>

<header>
  <div class="bar">
    <button class="brand" onclick={onHome} aria-label="Go to dictionary"><span class="brand-mark">字</span><span>Chinese Lexicon</span></button>
    <nav class="sections" aria-label="Main sections">
      <button type="button" onclick={onHome}>Dictionary</button>
      <button type="button" onclick={onComponents}>Components</button>
      <button type="button" onclick={onPinyin}>Pinyin</button>
      {#if __TRAINING_ENABLED__}<button type="button" onclick={onTrain}>Training</button>{/if}
      <button type="button" onclick={onSettings}>Settings</button>
      <button type="button" class:active={searchOpen} onclick={toggleSearch}>Search</button>
    </nav>
  </div>
</header>

<style>
  header { border-bottom: var(--border-width) solid var(--color-border); background: var(--color-surface); }.bar { min-height: var(--header-height); padding: var(--space-header-y) max(var(--space-page), calc((100vw - var(--content-max-width)) / 2)); display: flex; align-items: center; justify-content: space-between; gap: var(--space-lg); }.brand { display: flex; align-items: center; gap: var(--space-sm); flex: none; padding: 0; border: 0; background: none; color: var(--color-heading); font-size: var(--font-size-brand); font-weight: var(--font-weight-bold); }.brand-mark { width: var(--brand-mark-size); height: var(--brand-mark-size); display: grid; place-items: center; border-radius: var(--radius-sm); color: var(--color-on-accent); background: var(--color-accent); }.sections { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-xs); }.sections button { border: 0; border-radius: var(--radius-sm); padding: var(--space-xs) var(--space-sm); color: var(--color-link); background: none; font-size: var(--font-size-small); font-weight: var(--font-weight-bold); }.sections button:hover, .sections button.active { background: var(--color-accent-subtle); }.sections button.active { color: var(--color-accent); } @media (max-width: 680px) { .bar { align-items: flex-start; }.sections { justify-content: flex-start; } }
</style>
