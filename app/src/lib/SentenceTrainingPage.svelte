<script lang="ts">
  import { onMount } from 'svelte';
  import * as AudioFiles from './audio';
  import { config } from './config';
  import { getDifficultyRank, getEntries } from './dictionary';
  import CharacterPage from './CharacterPage.svelte';
  import { selectSentence, type TrainingSession } from './training/engine';
  import PageControls from './PageControls.svelte';
  import type { LearningState, HelpLevel } from './training/types';
  import type { TrainingSettings } from './training-settings';

  let { state: learning, session, settings, finished, canPreviousSentence, canNextSentence, colorFor, componentColorFor, headlineSize, onSession, onOpenWord, onComplete, onPreviousSentence, onStart }: { state: LearningState; session: TrainingSession | null; settings: TrainingSettings; finished: boolean; canPreviousSentence: boolean; canNextSentence: boolean; colorFor: (word: string) => string; componentColorFor: (component: string) => string; headlineSize: number; onSession: (session: TrainingSession) => void; onOpenWord: (word: string) => void; onComplete: () => void; onPreviousSentence: () => void; onStart: () => void } = $props();
  const active = $derived(session?.training);
  let flashcardIndex = $state(0);
  let flashcardSentenceId = $state('');
  let enterPreviousSentenceAtSentence = $state(false);
  const flashcardWords = $derived(active?.unknownWords ?? []);
  const currentFlashcard = $derived(flashcardWords[flashcardIndex]);
  let source = $state<string>();
  let lastFlashcardAudio = $state('');
  let suppressFlashcardAudio = $state(false);
  const selectedWord = $derived(session?.visibleTranslationIndex === null || session?.visibleTranslationIndex === undefined ? undefined : active?.sentence.word_split.tokens[session.visibleTranslationIndex]);

  $effect(() => {
    source = undefined;
    if (active) void AudioFiles.sentenceAudio(active.sentence.source, active.sentence.audio.path).then((next) => source = next);
  });

  $effect(() => {
    if (active && flashcardSentenceId !== active.sentence.id) {
      flashcardSentenceId = active.sentence.id;
      flashcardIndex = enterPreviousSentenceAtSentence ? active.unknownWords.length : Math.min(session?.flashcardIndex ?? 0, active.unknownWords.length);
      enterPreviousSentenceAtSentence = false;
    }
  });

  $effect(() => {
    if (!active || !currentFlashcard) return;
    const flashcardId = `${active.sentence.id}:${currentFlashcard}`;
    if (suppressFlashcardAudio) {
      suppressFlashcardAudio = false;
      lastFlashcardAudio = flashcardId;
      return;
    }
    if (lastFlashcardAudio === flashcardId) return;
    lastFlashcardAudio = flashcardId;
    playWord(currentFlashcard);
  });

  onMount(() => {
    if (!session) chooseSentence();
  });

  function chooseSentence() {
    const training = selectSentence(learning);
    if (training) onSession({ training, startedAt: Date.now(), reviewedWords: [], tapStates: {}, helpLevels: {}, wordPagesVisited: [], flashcardIndex: 0, visibleTranslationIndex: null, sentenceTranslationVisible: false, completedCount: 0, targetCount: settings.sessionLength });
  }
  function setFlashcardIndex(index: number, silent = false) {
    if (!session) return;
    suppressFlashcardAudio = silent;
    flashcardIndex = index;
    onSession({ ...session, flashcardIndex: index });
  }
  function learnNextWord() {
    if (!session || !currentFlashcard) return;
    const completedFlashcard = currentFlashcard;
    flashcardIndex++;
    onSession({ ...session, reviewedWords: session.reviewedWords.includes(completedFlashcard) ? session.reviewedWords : [...session.reviewedWords, completedFlashcard], flashcardIndex });
  }
  function previous() {
    if (flashcardIndex > 0) setFlashcardIndex(flashcardIndex - 1, true);
    else {
      enterPreviousSentenceAtSentence = true;
      onPreviousSentence();
    }
  }
  function tap(word: string, index: number) {
    if (!session) return;
    const current = session.tapStates[word] ?? 0;
    if (current === 2) {
      if (session.visibleTranslationIndex === index) openWord(word);
      else onSession({ ...session, visibleTranslationIndex: index });
      return;
    }
    const next = (current + 1) as HelpLevel;
    onSession({ ...session, tapStates: { ...session.tapStates, [word]: next }, helpLevels: { ...session.helpLevels, [word]: Math.max(session.helpLevels[word] ?? 0, next) as HelpLevel }, visibleTranslationIndex: next === 2 ? index : session.visibleTranslationIndex });
  }
  function openWord(word: string) {
    if (!session) return;
    onSession({ ...session, wordPagesVisited: session.wordPagesVisited.includes(word) ? session.wordPagesVisited : [...session.wordPagesVisited, word] });
    onOpenWord(word);
  }
  function pinyin(word: string) { return getEntries(word)[0]?.pinyin ?? ''; }
  function definition(index: number) { return active!.sentence.translation.words[index]; }
  function rankLabel(word: string) {
    if (settings.wordDetailRankSource === 'hsk') return `HSK ${(getEntries(word)[0] as { statistics?: { hskLevel?: number } } | undefined)?.statistics?.hskLevel ?? '—'}`;
    const rank = getDifficultyRank(word, settings.wordDetailRankSource);
    return Number.isFinite(rank) ? `#${rank}` : '—';
  }
  function play() { if (source) void new Audio(source).play().catch(() => {}); }
  const lastWordAudio = new Map<string, number>();
  function playWord(word: string) {
    const now = Date.now();
    if (now - (lastWordAudio.get(word) ?? 0) < config.training.wordAudioDebounceMilliseconds) return;
    lastWordAudio.set(word, now);
    void AudioFiles.getPronunciationAudio(word).then((wordSource) => {
      if (wordSource) void new Audio(wordSource).play().catch(() => {});
    });
  }
  function tapWord(word: string, index: number, event: MouseEvent) {
    if (!session) return;
    if (event.target instanceof Element && event.target.closest('.pinyin, .word-translation')) {
      clearWord(word, index);
      return;
    }
    if ((session.tapStates[word] ?? 0) === 0) playWord(word);
    tap(word, index);
  }
  function clearWord(word: string, index: number) {
    if (!session) return;
    onSession({ ...session, tapStates: { ...session.tapStates, [word]: 0 }, visibleTranslationIndex: session.visibleTranslationIndex === index ? null : session.visibleTranslationIndex });
  }
  function displayParts() {
    if (!active) return [] as { text: string; word?: string; index?: number }[];
    const parts: { text: string; word?: string; index?: number }[] = [];
    let cursor = 0;
    for (const [index, word] of active.sentence.word_split.tokens.entries()) {
      const start = active.sentence.transcription.indexOf(word, cursor);
      if (start < 0) continue;
      if (start > cursor) parts.push({ text: active.sentence.transcription.slice(cursor, start) });
      parts.push({ text: word, word, index });
      cursor = start + word.length;
    }
    if (cursor < active.sentence.transcription.length) parts.push({ text: active.sentence.transcription.slice(cursor) });
    return parts;
  }
</script>

<section class="training">
  {#if finished}<div class="preflight"><p class="eyebrow">Training complete</p><h1>Session finished.</h1><button class="next" onclick={onStart}>{config.training.labels.startTraining}</button></div>{:else if !active}<p class="empty">Finding a sentence for your current level…</p>{:else}<div class="mode"><strong>Training mode</strong><button class="flashcard-nav" aria-label="Previous flashcard or sentence" disabled={flashcardIndex === 0 && !canPreviousSentence} onclick={previous}>←</button><span>{session?.completedCount ?? 0} / {session?.targetCount ?? settings.sessionLength}</span><button class="flashcard-nav" aria-label="Next flashcard or sentence" disabled={flashcardIndex >= flashcardWords.length && !canNextSentence} onclick={() => flashcardIndex < flashcardWords.length ? setFlashcardIndex(flashcardIndex + 1, true) : onComplete()}>→</button><progress value={session?.completedCount ?? 0} max={session?.targetCount ?? settings.sessionLength}></progress></div>{#if currentFlashcard}<div class="card word-card"><p class="eyebrow">New word</p><CharacterPage character={Array.from(currentFlashcard).length === 1 ? currentFlashcard : ''} word={Array.from(currentFlashcard).length === 1 ? '' : currentFlashcard} {colorFor} {componentColorFor} {headlineSize} onBack={() => {}} onHome={() => {}} onOpen={onOpenWord} embedded /><PageControls controls={[{ label: config.training.labels.previous, onClick: previous, disabled: flashcardIndex === 0 && !canPreviousSentence }, { label: 'Continue', onClick: learnNextWord, primary: true }]} /></div>{:else}<div class="card sentence-card" style={`--sentence-font-size: ${settings.sentenceFontSize}rem; --pinyin-font-size: ${settings.pinyinFontSize}rem; --word-detail-font-size: ${settings.wordTranslationFontSize}rem`}><div class="word-detail">{#if selectedWord}<strong style={`--word-color: ${colorFor(selectedWord)}`}>{selectedWord}</strong><span>{definition(session!.visibleTranslationIndex!)}</span><small>{rankLabel(selectedWord)}</small>{/if}</div><p class="sentence" lang="zh">{#each displayParts() as part}{#if part.word}<button data-token-index={part.index} class:marked={(session?.tapStates[part.word] ?? 0) > 0} class="token" onclick={(event) => tapWord(part.word!, part.index!, event)}><small class:pinyin-visible={(session?.tapStates[part.word] ?? 0) >= 1} class="pinyin">{pinyin(part.word)}</small><span>{part.text}</span></button>{:else}{part.text}{/if}{/each}</p><div class="sentence-detail">{#if session?.sentenceTranslationVisible}{active.sentence.translation.text}{/if}</div>
    </div><PageControls controls={[{ label: config.training.labels.playAudio, onClick: play, disabled: !source }, { label: session?.sentenceTranslationVisible ? 'Hide translation' : config.training.labels.showTranslation, onClick: () => { if (session) onSession({ ...session, sentenceTranslationVisible: !session.sentenceTranslationVisible }); } }, { label: config.training.labels.previous, onClick: previous, disabled: flashcardIndex === 0 && !canPreviousSentence }, { label: config.training.labels.nextSentence, onClick: onComplete, primary: true }]} />{/if}{/if}
</section>

<style>
  .training { max-width: 780px; margin: 0 auto; padding-bottom: var(--space-bottom); }.card, .preflight { padding: var(--card-padding); border: var(--border-width) solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); }.sentence-card { display: flex; min-height: calc(100dvh - 14rem); flex-direction: column; }.mode { display: grid; grid-template-columns: auto auto auto auto 1fr; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-md); color: var(--color-muted); font-size: var(--font-size-small); }.mode strong { color: var(--color-accent); text-transform: uppercase; letter-spacing: var(--letter-spacing-eyebrow); }.mode progress { width: 100%; accent-color: var(--color-accent); }.flashcard-nav { padding: 0; border: 0; color: var(--color-link); background: none; font-size: var(--font-size-h2); line-height: 1; }.flashcard-nav:disabled { color: var(--color-border); cursor: default; }.next { border: 0; border-radius: var(--radius-sm); padding: var(--input-padding-y) var(--button-padding-x); background: var(--color-accent); color: var(--color-on-accent); font-weight: var(--font-weight-bold); }.sentence { margin: var(--space-xl) 0; color: var(--color-heading); font-size: clamp(1.8rem, 7vw, var(--sentence-font-size)); line-height: 1.1; text-align: center; }.token { display: inline-grid; grid-template: 1.2em auto / minmax(1em, max-content); align-items: end; margin: 0; padding: 0 .08em; border: 0; background: none; color: inherit; font: inherit; line-height: 1; vertical-align: bottom; }.token > span, .token .pinyin { grid-column: 1; justify-self: center; }.token > span { grid-row: 2; }.token .pinyin { grid-row: 1; width: 1em; max-width: 1em; overflow: hidden; color: transparent; font-family: var(--font-sans); font-size: var(--pinyin-font-size); font-weight: normal; line-height: 1.1; text-align: center; white-space: nowrap; }.token .pinyin-visible { width: max-content; max-width: min(12em, 90vw); color: var(--color-muted); }.token.marked { color: var(--color-accent); }.word-detail, .sentence-detail { min-height: 4.5rem; padding: var(--space-md); color: var(--color-muted); font-size: var(--word-detail-font-size); }.word-detail { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: var(--space-sm); border-bottom: 4px solid var(--color-border); }.word-detail strong { color: var(--word-color); font-size: var(--font-size-h2); }.word-detail small { color: var(--color-heading); font-weight: var(--font-weight-bold); }.sentence-detail { margin-top: auto; border-top: 4px solid var(--color-border); text-align: left; }.preflight { text-align: center; }.preflight h1 { color: var(--color-heading); }.word-card :global(.page) { text-align: left; }.eyebrow { color: var(--color-accent); font-size: var(--font-size-eyebrow); font-weight: var(--font-weight-bold); letter-spacing: var(--letter-spacing-eyebrow); text-transform: uppercase; }.empty { color: var(--color-muted); text-align: center; }
</style>
