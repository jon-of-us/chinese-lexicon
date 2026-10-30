<script lang="ts">
  import { tick } from 'svelte';

  let { query = $bindable(), searchOpen = $bindable(), onSearch, onSearchOpen, onSearchClose, onSettings, onHome, onTrain, onPinyin, onComponents }: { query: string; searchOpen: boolean; onSearch: (value: string) => void; onSearchOpen: () => void; onSearchClose: () => void; onSettings: () => void; onHome: () => void; onTrain: () => void; onPinyin: () => void; onComponents: () => void } = $props();
  let searchInput = $state<HTMLInputElement | null>(null);

  function closeSearch() {
    searchOpen = false;
    query = '';
    onSearchClose();
  }

  async function toggleSearch() {
    if (searchOpen) return closeSearch();
    searchOpen = true;
    onSearchOpen();
    await tick();
    searchInput?.focus();
    searchInput?.select();
  }
</script>

<header>
  <div class="bar">
    <button class="brand" onclick={onHome} aria-label="Go to dictionary"><span class="brand-mark">字</span><span>Chinese Lexicon</span></button>
    <nav class="sections" aria-label="Main sections">
      <button type="button" onclick={onHome}>Dictionary</button>
      <button type="button" onclick={onComponents}>Components</button>
      <button type="button" onclick={onPinyin}>Pinyin</button>
      <button type="button" onclick={onTrain}>Training</button>
      <button type="button" onclick={onSettings}>Settings</button>
      <button type="button" class:active={searchOpen} onclick={toggleSearch}>Search</button>
    </nav>
  </div>
  {#if searchOpen}
    <div class="search-field">
      <label class="sr-only" for="dictionary-search">Search Chinese or English</label>
      <input bind:this={searchInput} id="dictionary-search" bind:value={query} placeholder="Search Chinese or English" oninput={(event) => onSearch(event.currentTarget.value)} onkeydown={(event) => event.key === 'Escape' && closeSearch()} />
    </div>
  {/if}
</header>

<style>
  header { border-bottom: var(--border-width) solid var(--color-border); background: var(--color-surface); }.bar { min-height: var(--header-height); padding: var(--space-header-y) max(var(--space-page), calc((100vw - var(--content-max-width)) / 2)); display: flex; align-items: center; justify-content: space-between; gap: var(--space-lg); }.brand { display: flex; align-items: center; gap: var(--space-sm); flex: none; padding: 0; border: 0; background: none; color: var(--color-heading); font-size: var(--font-size-brand); font-weight: var(--font-weight-bold); }.brand-mark { width: var(--brand-mark-size); height: var(--brand-mark-size); display: grid; place-items: center; border-radius: var(--radius-sm); color: var(--color-on-accent); background: var(--color-accent); }.sections { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-xs); }.sections button { border: 0; border-radius: var(--radius-sm); padding: var(--space-xs) var(--space-sm); color: var(--color-link); background: none; font-size: var(--font-size-small); font-weight: var(--font-weight-bold); }.sections button:hover, .sections button.active { background: var(--color-accent-subtle); }.sections button.active { color: var(--color-accent); }.search-field { width: min(var(--search-width), calc(100% - var(--space-page) * 2)); margin: 0 auto var(--space-md); }input { width: 100%; min-width: 0; padding: var(--input-padding-y) var(--input-padding-x); border: var(--border-width) solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-input); color: var(--color-text); outline-color: var(--color-accent); }.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); } @media (max-width: 680px) { .bar { align-items: flex-start; }.sections { justify-content: flex-start; } }
</style>
