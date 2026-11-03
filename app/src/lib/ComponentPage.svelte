<script lang="ts">
  import type * as Dictionary from './dictionary';
  import type * as Settings from './settings';
  import * as FitHeadline from './fit-headline';
  import DictionaryPageControls from './DictionaryPageControls.svelte';
  import PlayButton from './PlayButton.svelte';
  import * as Config from './config';

  let { details, order, colorFor, componentColorFor, onBack, onHome, homeLabel, onOpenCharacter, onOpenComponent, headlineSize }: {
    details: Dictionary.ComponentDetails;
    order: Settings.DictionaryOrder;
    colorFor: (text: string) => string;
    componentColorFor: (component: string) => string;
    onBack: () => void;
    onHome: () => void;
    homeLabel: string;
    onOpenCharacter: (event: MouseEvent, character: string) => void;
    onOpenComponent: (event: MouseEvent, component: string) => void;
    headlineSize: number;
  } = $props();

  let expandedComponent = $state('');
  let expandedGroups = $state<Record<string, boolean>>({});
  const groups = $derived([
    { key: 'meaning', label: 'Meaning component', characters: details.meaning },
    { key: 'sound', label: 'Sound component', characters: details.sound },
    { key: 'other', label: 'Other component roles', characters: details.other },
  ]);
  $effect(() => {
    if (expandedComponent !== details.component) {
      expandedComponent = details.component;
      expandedGroups = {};
    }
  });
  const frequencyFor = (item: Dictionary.ComponentCharacter) => {
    if (order === 'books') return item.bookRank ? `Books #${item.bookRank}` : 'No book rank data';
    if (order === 'media') return item.mediaRank ? `Media #${item.mediaRank}` : 'No media rank data';
    if (order === 'hsk') return item.hskLevel ? `HSK ${item.hskLevel}` : 'No HSK level';
    return item.dongRank ? `Dong #${item.dongRank}` : 'Not in Dong top 1,000';
  };
</script>

<section class="page">
  <header class="hero">
    <div class="hero-text">
      <p class="eyebrow">Component / radical</p>
      <h1 use:FitHeadline.fitHeadline={headlineSize} style:color={componentColorFor(details.component)}>{details.component}{#if details.variant}<a class="variant" href={`/component/${encodeURIComponent(details.variant)}`} onclick={(event) => onOpenComponent(event, details.variant)} aria-label={`Open component form ${details.variant}`} style={`color: ${componentColorFor(details.variant)}`}>{details.variant}</a>{/if}</h1>
      <div class="meta"><PlayButton text={details.component} fallbackText={details.variant} />{#if details.pinyin}<strong>{details.pinyin}</strong><b>·</b>{/if}<strong>{details.definition}</strong></div>
    </div>
  </header>

  {#if details.parts.length}
    <section class="card">
      <p class="eyebrow">Structure · {details.parts.length}</p>
      <nav class="characters" aria-label="Component structure">
        {#each details.parts as part}
          <a href={`/component/${encodeURIComponent(part.character)}`} onclick={(event) => onOpenComponent(event, part.character)}>
            <span class="glyph" style={`color: ${componentColorFor(part.character)}`}>{part.character}</span>
            <span class="details"><strong>{part.pinyin || 'Pinyin unavailable'}</strong><small>{Config.componentTypeNames[part.type] ?? part.type}</small><small>{part.definition}</small></span>
          </a>
        {/each}
      </nav>
    </section>
  {/if}

  <p class="frequency-note">Characters are ordered by {order === 'hsk' ? 'HSK level' : order === 'dong' ? 'Dong Chinese rank' : `frequency in ${order}`}.</p>
  {#each groups as group (group.key)}
    {#if group.characters.length}
      <section class="card">
        <p class="eyebrow">{group.label} · {group.characters.length}</p>
        <nav class="characters" class:collapsed={!expandedGroups[group.key] && group.characters.length > 3} aria-label={`${group.label} characters`}>
          {#each group.characters as item (item.character)}
            <a href={`/character/${encodeURIComponent(item.character)}`} onclick={(event) => onOpenCharacter(event, item.character)}>
              <span class="glyph" style={`color: ${colorFor(item.character)}`}>{item.character}</span>
              <span class="details"><strong>{item.pinyin || 'Pinyin unavailable'}</strong><small>{item.definition}</small><small class="frequency">{frequencyFor(item)}</small></span>
            </a>
          {/each}
        </nav>
        {#if group.characters.length > 3}
          <button class="toggle-group" aria-expanded={Boolean(expandedGroups[group.key])} onclick={() => expandedGroups = { ...expandedGroups, [group.key]: !expandedGroups[group.key] }}>
            {expandedGroups[group.key] ? 'Show fewer' : `Show ${group.characters.length - 3} more`}
          </button>
        {/if}
      </section>
    {/if}
  {/each}
  {#if !details.meaning.length && !details.sound.length && !details.other.length}
    <p class="empty">No character uses are recorded for this component.</p>
  {/if}
  <DictionaryPageControls {onBack} {onHome} {homeLabel} />
</section>

<style>
  h1, p { margin-top: 0; }
  .hero { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-lg); margin-bottom: var(--space-lg); }
  .hero-text { flex: 1 1 0; min-width: 0; }
  .hero h1 { white-space: nowrap; }
  h1 { margin-bottom: var(--space-xs); font-size: var(--font-size-character-detail); font-weight: var(--font-weight-character); line-height: var(--line-height-tight); letter-spacing: var(--letter-spacing-heading); }
  .eyebrow { margin-bottom: var(--space-sm); color: var(--color-muted); font-size: var(--font-size-eyebrow); font-weight: var(--font-weight-bold); text-transform: uppercase; letter-spacing: .08em; }
  .meta { display: flex; flex-wrap: wrap; align-items: baseline; gap: var(--space-xs); color: var(--color-text); }
  .meta b { color: var(--color-muted); }
  .variant { margin-left: var(--space-xxs); font-size: inherit; font-weight: var(--font-weight-character); opacity: 0.45; text-decoration: none; }
  .frequency-note { color: var(--color-muted); }
  .card { margin-bottom: var(--space-md); padding: var(--space-md); border: var(--border-width) solid var(--color-border); border-radius: var(--radius-md); background: var(--color-surface); }
  .characters { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); grid-auto-rows: 5rem; gap: var(--space-sm); }
  .characters.collapsed { max-height: calc(15rem + 2 * var(--space-sm)); overflow: hidden; }
  .characters a { min-width: 0; height: 100%; display: flex; align-items: center; gap: var(--space-sm); overflow: hidden; padding: var(--space-sm); border: var(--border-width) solid var(--color-border-subtle); border-radius: var(--radius-sm); text-decoration: none; }
  .characters a:hover { border-color: var(--color-accent); background: var(--color-accent-subtle); }
  .glyph { flex: none; font-size: var(--font-size-character-grid); }
  .details { min-width: 0; display: grid; gap: .15rem; }
  .details strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .details small { overflow: hidden; color: var(--color-muted); text-overflow: ellipsis; white-space: nowrap; }
  .details .frequency { color: var(--color-accent); }
  .toggle-group { margin-top: var(--space-sm); padding: var(--space-xs) var(--space-sm); border: var(--border-width) solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-link); background: var(--color-surface); font-size: var(--font-size-small); font-weight: var(--font-weight-bold); }
  .toggle-group:hover { border-color: var(--color-accent); background: var(--color-accent-subtle); }
  .empty { color: var(--color-muted); }
</style>
