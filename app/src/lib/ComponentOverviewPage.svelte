<script lang="ts">
  import type * as Dictionary from './dictionary';
  import type * as Settings from './settings';

  let { components, order, loading = false, colorFor, pinyinFor, onCycleOrder, onOpen }: {
    components: Dictionary.OverviewComponent[];
    order: Settings.DictionaryOrder;
    loading?: boolean;
    colorFor: (text: string) => string;
    pinyinFor: (text: string) => string;
    onCycleOrder: () => void;
    onOpen: (event: MouseEvent, component: string) => void;
  } = $props();

  const orderLabel: Record<Settings.DictionaryOrder, string> = {
    books: 'frequency in books',
    media: 'frequency in media',
    dong: 'Dong Chinese rank',
    hsk: 'HSK level',
  };
  const labelFor = (item: Dictionary.OverviewComponent) => order === 'hsk'
    ? item.level ? `HSK ${item.level}` : '—'
    : `#${item.rank}`;
  let hovered = $state<string | null>(null);
</script>

<section class="overview">
  <h1>Chinese components and radicals</h1>
  <button class="order-heading" onclick={onCycleOrder}>Ordered by <em>{orderLabel[order]}</em></button>
  {#if loading}
    <p class="loading">Loading component frequencies…</p>
  {:else}
    <nav aria-label="Chinese components in selected order">
      {#each components as item}
        <a
          href={`/component/${encodeURIComponent(item.component)}`}
          onclick={(event) => onOpen(event, item.component)}
          onmouseenter={() => (hovered = item.component)}
          onmouseleave={() => (hovered = null)}
          aria-label={`Open component ${item.component}`}
          style={`color: ${colorFor(item.component)}`}
        ><small>{labelFor(item)}</small><span class="glyph" class:lifted={hovered === item.component}>{item.component}</span>{#if hovered === item.component}<span class="hover-pinyin">{pinyinFor(item.component)}</span>{/if}</a>
      {/each}
    </nav>
  {/if}
</section>

<style>
  .overview { padding-bottom: var(--space-bottom); }
  h1 { margin: 0 0 var(--space-md); color: var(--color-heading); font-size: var(--font-size-h3); }
  .order-heading { margin: 0 0 var(--space-md); padding: 0; border: 0; color: var(--color-heading); background: none; font-size: var(--font-size-h3); font-weight: var(--font-weight-bold); }
  .order-heading em { color: var(--color-accent); font-style: normal; text-decoration: underline; text-underline-offset: .18em; }
  nav { display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--character-cell-min-width), 1fr)); gap: var(--grid-gap); }
  nav a { position: relative; min-height: var(--character-cell-height); display: grid; place-items: center; border: var(--border-width) solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); font-size: var(--font-size-character-grid); text-decoration: none; transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast); }
  nav a:hover { transform: translateY(var(--hover-lift)); border-color: var(--color-accent); background: var(--color-accent-subtle); }
  nav small { position: absolute; top: var(--rank-offset); left: var(--rank-offset); color: var(--color-muted); font-size: var(--font-size-rank); }
  .glyph { display: inline-block; transition: transform var(--transition-fast); }
  .glyph.lifted { transform: translateY(-.2em); }
  .hover-pinyin { position: absolute; right: var(--rank-offset); bottom: var(--rank-offset); left: var(--rank-offset); overflow: hidden; color: var(--color-muted); font-size: 1rem; font-weight: var(--font-weight-bold); text-align: center; text-overflow: ellipsis; white-space: nowrap; pointer-events: none; }
  .loading { color: var(--color-muted); }
</style>
