<script lang="ts">
  type Entry = { simp: string; pinyin?: string; definitions: string[] };
  let { query, results, loading = false, error = null, colorFor, onSelect }: { query: string; results: Entry[]; loading?: boolean; error?: string | null; colorFor: (text: string) => string; onSelect: (entry: string) => void } = $props();
</script>

<section class="search-results" aria-live="polite">
  <div class="section-heading"><p class="eyebrow">Dictionary search</p><h2>Results for “{query}”</h2></div>
  {#if error}<p class="empty" role="alert">{error}</p>
  {:else if loading}<p class="empty">Loading dictionary…</p>
  {:else if results.length}
    <div class="result-list">
      {#each results as result}
        <button class="result" onclick={() => onSelect(result.simp)}>
          <span class="result-character" style={`color: ${colorFor(result.simp)}`}>{result.simp}</span>
          <span class="result-copy"><strong>{result.pinyin}</strong><span>{result.definitions.filter((definition) => !definition.startsWith('CL:')).slice(0, 3).join('; ')}</span></span>
        </button>
      {/each}
    </div>
  {:else}
    <p class="empty">No dictionary entries match that search.</p>
  {/if}
</section>

<style>
  .search-results { max-width: var(--search-results-max-width); }.section-heading { margin-bottom: var(--space-lg); }.section-heading h2 { margin: 0; color: var(--color-heading); font-size: var(--font-size-h2); line-height: var(--line-height-tight); }.eyebrow { margin: 0 0 var(--space-xs); color: var(--color-accent); font-size: var(--font-size-eyebrow); font-weight: var(--font-weight-bold); letter-spacing: var(--letter-spacing-eyebrow); text-transform: uppercase; }.result-list { display: grid; gap: var(--space-sm); }.result { display: grid; grid-template-columns: var(--result-character-width) 1fr; gap: var(--space-md); align-items: center; width: 100%; padding: var(--card-padding); border: var(--border-width) solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); text-align: left; }.result:hover { border-color: var(--color-accent); }.result-character { color: var(--color-heading); font-size: var(--font-size-result-character); }.result-copy strong { display: block; color: var(--color-accent); }.result-copy span { display: block; margin-top: var(--space-xxs); color: var(--color-muted); line-height: var(--line-height-body); }.empty { margin: 0; color: var(--color-muted); line-height: var(--line-height-body); }
</style>
