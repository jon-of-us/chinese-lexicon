<script lang="ts">
  import type { DictionaryOrder } from './settings';

  let { value, onChange, includeHsk = true, includeDong = true }: { value: DictionaryOrder; onChange: (source: DictionaryOrder) => void; includeHsk?: boolean; includeDong?: boolean } = $props();
  const sources: { value: DictionaryOrder; label: string }[] = [
    { value: 'media', label: 'Media frequency' },
    { value: 'books', label: 'Book frequency' },
    { value: 'dong', label: 'Dong Chinese rank' },
    { value: 'hsk', label: 'HSK level' },
  ];
  const visibleSources = $derived(sources.filter((source) => (includeHsk || source.value !== 'hsk') && (includeDong || source.value !== 'dong')));
</script>

<nav class="source-selector" aria-label="Dictionary ordering">
  {#each visibleSources as source}
    <button type="button" class:active={value === source.value} aria-pressed={value === source.value} onclick={() => onChange(source.value)}>{source.label}</button>
  {/each}
</nav>

<style>
  .source-selector { display: inline-flex; flex-wrap: wrap; gap: var(--space-xxs); padding: var(--space-xxs); border: var(--border-width) solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); }.source-selector button { border: 0; border-radius: var(--radius-sm); padding: var(--space-xs) var(--space-sm); color: var(--color-muted); background: transparent; font-size: var(--font-size-small); font-weight: var(--font-weight-bold); }.source-selector button:hover { color: var(--color-link); background: var(--color-accent-subtle); }.source-selector button.active { color: var(--color-on-accent); background: var(--color-accent); }
</style>
