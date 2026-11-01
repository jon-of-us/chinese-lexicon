<script lang="ts">
  import { onMount, type Component } from 'svelte';
  import OverviewPage from './lib/OverviewPage.svelte';
  import SearchResults from './lib/SearchResults.svelte';
  import SettingsPage from './lib/SettingsPage.svelte';
  import SiteHeader from './lib/SiteHeader.svelte';
  import { loadDifficultySettings, saveDifficultySettings, type DifficultySettings } from './lib/settings';
  import type * as DictionarySearch from './lib/dictionary-search';
  import type * as SearchWorkerProtocol from './lib/search-worker-protocol';
  import * as Dictionary from './lib/dictionary';
  import { config } from './lib/config';
  import { getOverviewCharacters, getOverviewDifficultyRank, rankColor, type OverviewCharacter } from './lib/ranking';
  import type { TrainingSession } from './lib/training/engine';
  import type { LearningState } from './lib/training/types';
  import { loadTrainingSettings, saveTrainingSettings, type TrainingSettings } from './lib/training-settings';

  type TrainingEngine = typeof import('./lib/training/engine');
  type TrainingState = typeof import('./lib/training/state');
  type NavigationEntry =
    | { kind: 'start' | 'detail' | 'settings'; path: string }
    | { kind: 'search'; path: string; query: string; results: DictionarySearch.SearchEntry[]; error: string | null };
  const NAVIGATION_STATE_KEY = 'kwaslNavigation';
  const trainingEnabled = __TRAINING_ENABLED__;
  // Deployed under a subpath (GitHub Pages project sites), so routes are read and written relative to this prefix.
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
  const PANE_GAP_PX = 24;
  const PANES_MIN_HEIGHT_PX = 320;
  const PANES_BOTTOM_INSET_PX = 16;

  let path = $state('/');
  let navigationStack = $state<NavigationEntry[]>([]);
  let availableWidth = $state(0);
  let windowHeight = $state(0);
  let panesElement = $state<HTMLElement | null>(null);
  let panesHeight = $state('auto');
  $effect(() => {
    if (!panesElement || !windowHeight) return;
    const documentTop = panesElement.getBoundingClientRect().top + window.scrollY;
    panesHeight = `${Math.max(PANES_MIN_HEIGHT_PX, windowHeight - documentTop - PANES_BOTTOM_INSET_PX)}px`;
  });
  let query = $state('');
  let results = $state<DictionarySearch.SearchEntry[]>([]);
  let searchLoading = $state(false);
  let searchError = $state<string | null>(null);
  let searchOpen = $state(false);
  let settings = $state<DifficultySettings>(loadDifficultySettings());
  let learningState = $state<LearningState | null>(null);
  let trainingSession = $state<TrainingSession | null>(null);
  let trainingSettings = $state<TrainingSettings>(loadTrainingSettings());
  let trainingFinished = $state(false);
  let trainingEngine = $state<TrainingEngine | null>(null);
  let trainingState = $state<TrainingState | null>(null);
  let PinyinPage = $state<Component<any> | null>(null);
  let CharacterPage = $state<Component<any> | null>(null);
  let ComponentOverviewPage = $state<Component<any> | null>(null);
  let ComponentPage = $state<Component<any> | null>(null);
  let SentenceTrainingPage = $state<Component<any> | null>(null);
  let trainingHistory = $state<TrainingSession[]>([]);
  let trainingHistoryIndex = $state(0);
  let searchTimer: number | undefined;
  let searchRequestId = 0;
  let searchWorker: Worker | null = null;
  const character = $derived(routeValue(path, 'character'));
  const word = $derived(routeValue(path, 'word'));
  const component = $derived(routeValue(path, 'component'));
  const entry = $derived(character || word);
  const startPage = $derived(navigationStack.findLast((item) => item.kind === 'start')?.path ?? '/');
  const detailHomeLabel = $derived(startPage === '/components' ? 'Return to components' : startPage === '/pinyin' ? 'Return to pinyin' : startPage === '/train' ? trainingSession ? 'Return to sentence' : 'Return to training' : 'Return to dictionary');
  const overviewCharacters = $derived<OverviewCharacter[]>(settings.order === 'books' ? Dictionary.getBookFrequencyCharacters() : settings.order === 'hsk' ? Dictionary.getHskCharacters() : getOverviewCharacters(settings.order));
  const overviewComponents = $derived(Dictionary.getOverviewComponents(settings.order));
  const lastNonDetailIndex = $derived(navigationStack.findLastIndex((item) => item.kind !== 'detail'));
  const detailRunLength = $derived(navigationStack.length - lastNonDetailIndex - 1);
  const paneBase = $derived(navigationStack[lastNonDetailIndex]?.kind === 'start' ? lastNonDetailIndex : lastNonDetailIndex + 1);
  const paneRunLength = $derived(detailRunLength ? navigationStack.length - paneBase : 0);
  const multiPane = $derived(Math.min(settings.maxPanes, paneRunLength) >= 2);
  const fittingPanes = $derived(Math.floor((availableWidth + PANE_GAP_PX) / (settings.paneMinWidth + PANE_GAP_PX)));
  const visiblePaneCount = $derived(Math.min(settings.maxPanes, paneRunLength, Math.max(1, fittingPanes)));
  const detailPanes = $derived.by(() => {
    if (visiblePaneCount < 2) return [];
    const start = navigationStack.length - visiblePaneCount;
    return navigationStack.slice(start).map((item, offset) => ({ index: start + offset, path: item.path, kind: item.kind }));
  });

  onMount(() => {
    path = appPathname();
    restoreStoredNavigation();
    handleRoute(path);
    const onPopState = () => {
      path = appPathname();
      restoreStoredNavigation();
      handleRoute(path);
    };
    window.addEventListener('popstate', onPopState);
    let lastActiveAt = Date.now();
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (learningState && trainingState && document.visibilityState === 'visible') trainingState.recordActiveTime(learningState, (now - lastActiveAt) / 1000);
      lastActiveAt = now;
    }, 15_000);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.clearInterval(timer);
      if (searchTimer !== undefined) window.clearTimeout(searchTimer);
      searchWorker?.terminate();
      if (learningState && trainingState) void trainingState.saveLearningState(learningState);
    };
  });

  function appPathname() {
    const route = window.location.pathname.slice(basePath.length) || '/';
    return !trainingEnabled && route === '/train' ? '/' : route;
  }
  function isEntryRoute(route: string) { return /^\/(?:character|word)\//.test(route); }
  function isDetailRoute(route: string) { return isEntryRoute(route) || /^\/component\//.test(route); }
  function isStartRoute(route: string) { return route === '/' || route === '/components' || route === '/pinyin' || route === '/train'; }
  function navigationState(): NavigationEntry[] | null {
    const state = window.history.state as Record<string, unknown> | null;
    const stored = state?.[NAVIGATION_STATE_KEY];
    if (!Array.isArray(stored)) return null;
    const entries = stored as NavigationEntry[];
    return trainingEnabled ? entries : entries.map((entry) => entry.path === '/train' ? { ...entry, path: '/' } : entry);
  }
  function writeNavigationState(stack = navigationStack, url = window.location.href) {
    const state = window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
    window.history.replaceState({ ...state, [NAVIGATION_STATE_KEY]: $state.snapshot(stack) }, '', url);
  }
  function restoreStoredNavigation() {
    const stored = navigationState();
    if (stored) {
      navigationStack = stored;
      const current = navigationStack.at(-1);
      if (current?.kind === 'search') {
        query = current.query;
        results = current.results;
        searchError = current.error;
        searchOpen = true;
      } else {
        query = '';
        results = [];
        searchOpen = false;
        searchError = null;
      }
      searchLoading = false;
      return;
    }

    const initialStack: NavigationEntry[] = [{ kind: 'start', path: isStartRoute(path) ? path : '/' }];
    if (path === '/settings') initialStack.push({ kind: 'settings', path });
    else if (isDetailRoute(path)) initialStack.push({ kind: 'detail', path });
    navigationStack = initialStack;
    writeNavigationState(initialStack);
    query = '';
    results = [];
    searchOpen = false;
    searchError = null;
    searchLoading = false;
  }
  function pushNavigation(to: string, entry: NavigationEntry, stack = [...navigationStack, entry]) {
    const nextStack = [...stack.slice(0, -1), entry];
    const snapshot = $state.snapshot(nextStack);
    window.history.pushState({ [NAVIGATION_STATE_KEY]: snapshot }, '', `${basePath}${to}`);
    navigationStack = nextStack;
    path = to;
    handleRoute(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function openStartPage(to: string) {
    query = '';
    results = [];
    searchOpen = false;
    pushNavigation(to, { kind: 'start', path: to }, []);
  }
  function navigateBackTo(index: number, playAudio = true) {
    const target = navigationStack[index];
    if (!target) return;
    const nextStack = navigationStack.slice(0, index + 1);
    writeNavigationState(nextStack, target.path);
    navigationStack = nextStack;
    path = target.path;
    restoreStoredNavigation();
    handleRoute(path, playAudio);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function open(value: string) {
    const to = `${Array.from(value).length === 1 ? '/character/' : '/word/'}${encodeURIComponent(value)}`;
    pushNavigation(to, { kind: 'detail', path: to });
  }
  function openComponent(value: string) {
    const to = `/component/${encodeURIComponent(value)}`;
    pushNavigation(to, { kind: 'detail', path: to });
  }
  function popToPane(index: number) {
    if (index < navigationStack.length - 1) navigateBackTo(index, false);
  }
  function openFromPane(index: number, value: string) {
    popToPane(index);
    open(value);
  }
  function openFromPaneLink(index: number, event: MouseEvent, value: string) {
    event.preventDefault();
    openFromPane(index, value);
  }
  function openComponentFromPane(index: number, event: MouseEvent, value: string) {
    event.preventDefault();
    popToPane(index);
    openComponent(value);
  }
  function backFromPane(index: number) {
    if (index === navigationStack.length - 1) backFromDetail();
    else navigateBackTo(index - 1);
  }
  function openComponents() { openStartPage('/components'); }
  function backFromDetail() {
    const currentIndex = navigationStack.length - 1;
    for (let index = currentIndex - 1; index >= 0; index--) {
      if (navigationStack[index].kind === 'settings') continue;
      if (navigationStack[index].kind === 'search' && settings.searchBackBehavior === 'skip-search') continue;
      navigateBackTo(index);
      return;
    }
  }
  function returnToStartPage() {
    const index = navigationStack.findLastIndex((item) => item.kind === 'start');
    navigateBackTo(index);
  }
  function backFromSettings() {
    navigateBackTo(Math.max(0, navigationStack.length - 2));
  }
  function openSearch() {
    if (navigationStack.at(-1)?.kind !== 'search') {
      query = '';
      results = [];
      pushNavigation(path, { kind: 'search', path, query: '', results: [], error: null });
    }
  }
  function closeSearch() {
    const index = navigationStack.findLastIndex((item) => item.kind === 'search');
    if (index >= 0 && index === navigationStack.length - 1) navigateBackTo(index - 1);
    else {
      query = '';
      results = [];
      searchOpen = false;
    }
  }
  function getSearchWorker() {
    if (searchWorker) return searchWorker;
    searchWorker = new Worker(new URL('./lib/search.worker.ts', import.meta.url), { type: 'module' });
    searchWorker.addEventListener('message', (event: MessageEvent<SearchWorkerProtocol.SearchResponse>) => {
      if (event.data.id !== searchRequestId) return;
      results = event.data.results;
      searchError = event.data.failed ? 'Dictionary search could not be completed. Please try again.' : null;
      searchLoading = false;
      updateSearchEntry();
    });
    searchWorker.addEventListener('error', (event) => {
      console.error('Dictionary search worker failed.', event.error);
      searchWorker?.terminate();
      searchWorker = null;
      searchLoading = false;
      searchError = 'Dictionary search could not be completed. Please try again.';
      updateSearchEntry();
    });
    return searchWorker;
  }
  function runSearch(value: string) {
    const term = value.trim();
    if (searchTimer !== undefined) window.clearTimeout(searchTimer);
    const requestId = ++searchRequestId;
    searchError = null;
    if (!term) { results = []; searchLoading = false; updateSearchEntry(); return; }
    results = [];
    searchLoading = true;
    updateSearchEntry();
    searchTimer = window.setTimeout(() => {
      searchTimer = undefined;
      getSearchWorker().postMessage({ id: requestId, term, limit: config.data.searchResultsLimit } satisfies SearchWorkerProtocol.SearchRequest);
    }, 150);
  }
  function updateSearchEntry() {
    const current = navigationStack.at(-1);
    if (current?.kind !== 'search') return;
    const updated = { ...current, query, results, error: searchError };
    navigationStack = [...navigationStack.slice(0, -1), updated];
    writeNavigationState();
  }
  function selectSearchResult(value: string) { query = ''; results = []; searchOpen = false; open(value); }
  function openOverview() { openStartPage('/'); }
  function openPinyin() { openStartPage('/pinyin'); }
  function openSettings() {
    query = '';
    results = [];
    searchOpen = false;
    pushNavigation('/settings', { kind: 'settings', path: '/settings' });
  }
  function routeValue(route: string, kind: 'character' | 'word' | 'component') {
    return decodeURIComponent(route.match(new RegExp(`^/${kind}/(.+)$`))?.[1] ?? '');
  }
  function componentDetailsFor(route: string) {
    const value = routeValue(route, 'component');
    return value ? Dictionary.getComponentDetails(value, settings.order) : undefined;
  }
  function openTraining() { if (!trainingEnabled) return; trainingFinished = false; openStartPage('/train'); }
  function colorFor(text: string) { return rankColor(Dictionary.getDifficultyRank(text, settings.source) ?? getOverviewDifficultyRank(text, settings.source), settings.range); }
  function componentColorFor(text: string) { return rankColor(Dictionary.getComponentRank(text, settings.source), settings.range); }
  function pinyinFor(text: string) { return Dictionary.getPinyin(text) ?? ''; }
  function updateSettings(next: DifficultySettings) { settings = next; saveDifficultySettings(next); }
  function updateFrequencySource(order: DifficultySettings['order']) { updateSettings({ ...settings, order }); }
  function cycleDictionaryOrder() { const orders: DifficultySettings['order'][] = ['books', 'media', 'dong', 'hsk']; updateFrequencySource(orders[(orders.indexOf(settings.order) + 1) % orders.length]); }
  function handleRoute(route: string, playAudio = true) {
    if (isEntryRoute(route)) { void prepareCharacterPage(); if (playAudio) playRouteAudio(route); }
    if (route === '/components' || /^\/component\//.test(route)) void prepareComponentPages();
    if (route === '/pinyin') void preparePinyinPage();
    if (route === '/train') void prepareTraining(true);
  }
  async function playRouteAudio(route: string) {
    const text = decodeURIComponent(route.match(/^\/(?:character|word)\/(.+)$/)?.[1] ?? '');
    if (!text) return;
    const audio = await import('./lib/audio');
    const source = await audio.getPronunciationAudio(text);
    if (source) void new Audio(source).play().catch(() => {});
  }
  async function prepareCharacterPage() {
    CharacterPage = (await import('./lib/CharacterPage.svelte')).default;
  }
  async function preparePinyinPage() {
    PinyinPage = (await import('./lib/PinyinPage.svelte')).default;
  }
  async function prepareComponentPages() {
    const [overviewPage, detailPage] = await Promise.all([
      import('./lib/ComponentOverviewPage.svelte'),
      import('./lib/ComponentPage.svelte'),
    ]);
    ComponentOverviewPage = overviewPage.default;
    ComponentPage = detailPage.default;
  }
  async function prepareTraining(startSession = false) {
    if (!trainingEnabled) return;
    const [engine, state, page] = await Promise.all([
      import('./lib/training/engine'),
      import('./lib/training/state'),
      import('./lib/SentenceTrainingPage.svelte'),
    ]);
    trainingEngine = engine;
    trainingState = state;
    SentenceTrainingPage = page.default;
    learningState ??= await state.loadLearningState();
    if (startSession && path === '/train' && !trainingSession) createTrainingSession();
  }
  function createTrainingSession() {
    if (!learningState || !trainingEngine) return;
    const training = trainingEngine.selectSentence(learningState);
    if (training) { trainingSession = { training, startedAt: Date.now(), reviewedWords: [], tapStates: {}, helpLevels: {}, wordPagesVisited: [], flashcardIndex: 0, visibleTranslationIndex: null, sentenceTranslationVisible: false, completedCount: 0, targetCount: trainingSettings.sessionLength }; trainingHistory = [trainingSession]; trainingHistoryIndex = 0; }
  }
  function updateTrainingSession(next: TrainingSession) { trainingSession = next; trainingHistory = trainingHistory.map((session, index) => index === trainingHistoryIndex ? next : session); }
  function previousTrainingSentence() { if (trainingHistoryIndex === 0) return; trainingHistoryIndex--; trainingSession = trainingHistory[trainingHistoryIndex]; }
  function nextTrainingSentence() {
    if (!trainingSession || !learningState || !trainingEngine || !trainingState) return;
    if (trainingHistoryIndex < trainingHistory.length - 1) { trainingHistoryIndex++; trainingSession = trainingHistory[trainingHistoryIndex]; return; }
    finishSentence();
  }
  function finishSentence() {
    if (!learningState || !trainingSession || !trainingEngine || !trainingState) return;
    trainingEngine.completeSentence(learningState, trainingSession.training, new Map(Object.entries(trainingSession.helpLevels)), trainingSession.startedAt);
    void trainingState.saveLearningState(learningState);
    const completedCount = trainingSession.completedCount + 1;
    if (completedCount >= trainingSession.targetCount) { trainingSession = null; trainingFinished = true; return; }
    const training = trainingEngine.selectSentence(learningState);
    if (training) { trainingSession = { training, startedAt: Date.now(), reviewedWords: [], tapStates: {}, helpLevels: {}, wordPagesVisited: [], flashcardIndex: 0, visibleTranslationIndex: null, sentenceTranslationVisible: false, completedCount, targetCount: trainingSettings.sessionLength }; trainingHistory = [...trainingHistory, trainingSession]; trainingHistoryIndex = trainingHistory.length - 1; }
    else { trainingSession = null; trainingFinished = true; }
  }
  function updateTrainingSettings(next: TrainingSettings) { trainingSettings = next; saveTrainingSettings(next); }
</script>

<svelte:head><title>{component || entry ? `${component || entry} · ${config.appName}` : config.appName}</title><meta name="description" content="Explore Chinese characters, words, components, and etymology." /></svelte:head>

<svelte:window bind:innerHeight={windowHeight} />
<SiteHeader bind:query bind:searchOpen onSearch={runSearch} onSearchOpen={openSearch} onSearchClose={closeSearch} onSettings={openSettings} onTrain={openTraining} onHome={openOverview} onPinyin={openPinyin} onComponents={openComponents} />
<main class:multi-pane={multiPane}><div class="width-probe" bind:clientWidth={availableWidth}></div>{#if query.trim()}<SearchResults query={query} results={results} loading={searchLoading} error={searchError} colorFor={colorFor} onSelect={selectSearchResult} />{:else if path === '/settings'}<SettingsPage {settings} {trainingSettings} onUpdate={updateSettings} onTrainingUpdate={updateTrainingSettings} onBack={backFromSettings} />{:else if detailPanes.length}<div class="detail-panes" bind:this={panesElement} style="--pane-count: {detailPanes.length}; --pane-height: {panesHeight}">{#each detailPanes as pane (pane.index + ':' + pane.path)}<section class="detail-pane">{#if pane.kind === 'start'}{@render startView(pane.path, pane.index)}{:else}{@render detailView(pane.path, pane.index)}{/if}</section>{/each}</div>{:else if entry || component}{@render detailView(path, navigationStack.length - 1)}{:else}{@render startView(path, navigationStack.length - 1)}{/if}</main>

{#snippet startView(route: string, index: number)}
  {#if route === '/pinyin'}
    {#if PinyinPage}<PinyinPage colorFor={colorFor} colorForRank={(rank: number | undefined) => rankColor(rank, settings.range)} hoverCharacterRank={settings.pinyinHoverRank} onOpen={(value: string) => openFromPane(index, value)} />{:else}<p>Loading pinyin…</p>{/if}
  {:else if route === '/train'}
    {#if learningState && SentenceTrainingPage}<SentenceTrainingPage state={learningState} session={trainingSession} settings={trainingSettings} finished={trainingFinished} canPreviousSentence={trainingHistoryIndex > 0} canNextSentence={trainingHistoryIndex < trainingHistory.length - 1 || (trainingSession?.completedCount ?? 0) + 1 < (trainingSession?.targetCount ?? 0)} {colorFor} componentColorFor={componentColorFor} headlineSize={settings.detailHeadlineSize} onSession={updateTrainingSession} onOpenWord={(value: string) => openFromPane(index, value)} onComplete={nextTrainingSentence} onPreviousSentence={previousTrainingSentence} onStart={openTraining} />{:else}<p>Loading sentence training…</p>{/if}
  {:else if route === '/components'}
    {#if ComponentOverviewPage}<ComponentOverviewPage components={overviewComponents} order={settings.order} colorFor={componentColorFor} pinyinFor={pinyinFor} onCycleOrder={cycleDictionaryOrder} onOpen={(event: MouseEvent, value: string) => openComponentFromPane(index, event, value)} />{:else}<p>Loading components…</p>{/if}
  {:else}
    <OverviewPage characters={overviewCharacters} source={settings.order} colorFor={colorFor} pinyinFor={pinyinFor} onCycleOrder={cycleDictionaryOrder} onOpen={(event: MouseEvent, value: string) => openFromPaneLink(index, event, value)} />
  {/if}
{/snippet}

{#snippet detailView(route: string, index: number)}
  {#if routeValue(route, 'component')}
    {@const details = componentDetailsFor(route)}
    {#if ComponentPage && details}<ComponentPage {details} order={settings.order} headlineSize={settings.detailHeadlineSize} {colorFor} componentColorFor={componentColorFor} onBack={() => backFromPane(index)} onHome={returnToStartPage} homeLabel={detailHomeLabel} onOpenCharacter={(event: MouseEvent, value: string) => openFromPaneLink(index, event, value)} onOpenComponent={(event: MouseEvent, value: string) => openComponentFromPane(index, event, value)} />{:else}<p>Loading component…</p>{/if}
  {:else if CharacterPage}
    <CharacterPage character={routeValue(route, 'character')} word={routeValue(route, 'word')} headlineSize={settings.detailHeadlineSize} {colorFor} componentColorFor={componentColorFor} onBack={() => backFromPane(index)} onHome={returnToStartPage} homeLabel={detailHomeLabel} onOpen={(value: string) => openFromPane(index, value)} onOpenComponent={(event: MouseEvent, value: string) => openComponentFromPane(index, event, value)} />
  {:else}<p>Loading dictionary…</p>{/if}
{/snippet}

<style>
  :global(:root) { font-family: var(--font-sans); color: var(--color-text); background: var(--color-background); font-synthesis: none; text-rendering: optimizeLegibility; }:global(*) { box-sizing: border-box; }:global(body) { margin: 0; min-width: var(--layout-min-width); background: var(--color-background); }:global(button), :global(input) { font: inherit; }:global(button) { cursor: pointer; }:global(a) { color: inherit; }main { width: min(var(--content-max-width), calc(100% - var(--space-page) * 2)); margin: 0 auto; padding: var(--space-md) 0 var(--space-bottom); }
main.multi-pane { width: calc(100% - var(--space-page) * 2); }
.width-probe { height: 0; }
.detail-panes { display: grid; grid-template-columns: repeat(var(--pane-count), minmax(0, 1fr)); grid-template-rows: minmax(0, 1fr); gap: 24px; height: var(--pane-height); }
.detail-pane { min-width: 0; min-height: 0; overflow-y: auto; }
.detail-pane :global(nav.page-controls) { position: sticky; bottom: var(--space-md); right: auto; left: auto; margin-left: auto; z-index: 5; }
</style>
