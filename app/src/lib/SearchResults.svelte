<script lang="ts">
  import * as Svelte from 'svelte';
  import type * as DictionarySearch from './dictionary-search';

  let { query = $bindable(), results, loading = false, error = null, colorFor, componentColorFor, onSelect, onSearch, onSearchClose }: { query: string; results: DictionarySearch.SearchEntry[]; loading?: boolean; error?: string | null; colorFor: (text: string) => string; componentColorFor: (text: string) => string; onSelect: (entry: DictionarySearch.SearchEntry) => void; onSearch: (value: string) => void; onSearchClose: () => void } = $props();
  let searchInput = $state<HTMLInputElement | null>(null);

  Svelte.onMount(() => {
    searchInput?.focus();
    searchInput?.select();
  });
</script>

<section class="search-results" aria-live="polite">
  <div class="search-field">
    <label class="sr-only" for="dictionary-search">Search Chinese or English</label>
    <input bind:this={searchInput} id="dictionary-search" bind:value={query} placeholder="Search Chinese or English" oninput={(event) => onSearch(event.currentTarget.value)} onkeydown={(event) => event.key === 'Escape' && onSearchClose()} />
  </div>
  <div class="section-heading"><p class="eyebrow">Dictionary and component search</p><h2>{query.trim() ? `Results for “${query}”` : results.length ? 'Last clicked results' : 'Search'}</h2></div>
  {#if error}<p class="empty" role="alert">{error}</p>
  {:else if loading}<p class="empty">Loading dictionary…</p>
  {:else if results.length}
    <div class="result-list">
      {#each results as result}
        <button class="result" onclick={() => onSelect(result)}>
          <span class="result-character" style={`color: ${result.kind === 'component' ? componentColorFor(result.simp) : colorFor(result.simp)}`}>{result.simp}</span>
          <span class="result-copy">{#if result.kind === 'component'}<small>Component</small>{/if}<strong>{result.pinyin}</strong><span>{result.definitions.filter((definition) => !definition.startsWith('CL:')).slice(0, 3).join('; ')}</span></span>
        </button>
      {/each}
    </div>
  {:else if !query.trim()}
    <p class="empty">Type a Chinese or English term to search the dictionary and its components.</p>
  {:else}
    <p class="empty">No dictionary entries or components match that search.</p>
  {/if}
</section>

<style>
  .search-results { max-width: var(--search-results-max-width); }.search-field { margin-bottom: var(--space-lg); }.search-field input { width: 100%; min-width: 0; padding: var(--input-padding-y) var(--input-padding-x); border: var(--border-width) solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-input); color: var(--color-text); outline-color: var(--color-accent); }.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }.section-heading { margin-bottom: var(--space-lg); }.section-heading h2 { margin: 0; color: var(--color-heading); font-size: var(--font-size-h2); line-height: var(--line-height-tight); }.eyebrow { margin: 0 0 var(--space-xs); color: var(--color-accent); font-size: var(--font-size-eyebrow); font-weight: var(--font-weight-bold); letter-spacing: var(--letter-spacing-eyebrow); text-transform: uppercase; }.result-list { display: grid; gap: var(--space-sm); }.result { display: grid; grid-template-columns: var(--result-character-width) 1fr; gap: var(--space-md); align-items: center; width: 100%; padding: var(--card-padding); border: var(--border-width) solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); text-align: left; }.result:hover { border-color: var(--color-accent); }.result-character { color: var(--color-heading); font-size: var(--font-size-result-character); }.result-copy strong { display: block; color: var(--color-accent); }.result-copy small { display: block; color: var(--color-link); font-size: var(--font-size-small); font-weight: var(--font-weight-bold); }.result-copy span { display: block; margin-top: var(--space-xxs); color: var(--color-muted); line-height: var(--line-height-body); }.empty { margin: 0; color: var(--color-muted); line-height: var(--line-height-body); }
</style>
