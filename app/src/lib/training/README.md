# Sentence training module (lib/training/)

The training feature lets users read example sentences and selects sentences in a loop based on the user's mastery of each word. This document explains the responsibility of each file, the state structure, and the data flow.

## File responsibilities

| File | Responsibility |
| --- | --- |
| `types.ts` | Type definitions: `Sentence`, `LearningState`, `FrequencyWord`, `FrequencyCharacter`, `HelpLevel` (0/1/2), `WordCategory` |
| `data.ts` | Loads word lists and sentences (sentences via glob), builds `wordIndex` and `characterIndex`, and filters sentences by `config.training.sentenceSources` |
| `engine.ts` | Sentence selection (`selectSentence`) and state update after a sentence is completed (`completeSentence`) |
| `state.ts` | IndexedDB persistence, new state creation, categorization (`categoryFor`), daily progress, and timing outlier detection |

## Data loading (data.ts)

- Word list: `chinese-dataset/frequency/words.json`. Character list: `chinese-dataset/frequency/characters.json`.
- Sentences: every `chinese-dataset/sentences/<set>/sentences.json` is loaded through `import.meta.glob`. The known sets (`hsk-sentences-audio`, `tatoeba-nc`, `tatoeba-unlicensed`, `anki-tatoeba`) are concatenated in that fixed order, because `engine.ts` takes the first unseen sentence. Each set's source is its folder name. A missing set is skipped, so the build does not fail in a fresh clone that lacks the gitignored sets.
- The sentence sources actually used are determined by `config.training.sentenceSources`, which currently enables `tatoeba-nc` and `tatoeba-unlicensed`.

## Learning state (LearningState)

Defined in `types.ts`. Main fields:

- `wordKnowledge: Float32Array`: mastery score per word, indexed to match the word list. `-1` means never seen (unseen).
- `wordImportance: Float32Array`
- `wordEncounterCount: Uint32Array`, `characterEncounterCount: Uint32Array`: occurrence counts
- `daily`: today's progress (sentences studied, active seconds, timed sentences, excluded sentences, average time, etc.)
- `recentSentenceIds`: IDs of recently shown sentences, used to avoid repeats

`loadLearningState()` reads from IndexedDB (database `hanzi-atlas-learning`, store `state`, key `current`). If reading fails, or the saved array lengths do not match the current word list, it falls back to a new state. If `saveLearningState()` fails, the error is silently ignored and the in-memory session state remains usable.

## Sentence selection (engine.ts: selectSentence)

The current implementation is simple: it takes the **first sentence whose ID is not in `recentSentenceIds`**. It then:

- Collects the words in the sentence that appear in the word list, giving `wordIndexes`
- Sets `unknownWords` to those with `wordKnowledge < 0`

> Note: sentence selection by known-word ratio or number of new words is not implemented. `selectSentence` only skips recently seen sentences, so it would need new logic to add that.

## Completing a sentence (engine.ts: completeSentence)

For each word in the sentence:

- A word never seen before (`< 0`) starts from `initialKnowledge` (0).
- The score is adjusted by help level:
  - No hint tapped (help 0): `+knowledgeGainUntapped` (+1)
  - Pinyin viewed (help 1): `-knowledgePenaltyPinyin` (-0.25)
  - Translation viewed (help 2): `-knowledgePenaltyTranslation` (-0.75)
- The result is clamped to `[0, maximumKnowledgeScore]` (0–20).
- `wordEncounterCount` is incremented by one.

Character encounter counts are accumulated the same way. Daily progress is then updated. Timing uses `isTimingOutlier` (MAD method, `madMultiplier` 3.5, at least `madMinimumSamples` 5 samples) to exclude abnormal durations. Finally, the sentence ID is added to `recentSentenceIds`, which keeps the most recent `repeatAvoidanceCount` (30) entries.

## Word categories (categoryFor)

| Score | Category |
| --- | --- |
| `< 0` | `unseen` |
| `< 2` (`categoryThresholds.new`) | `new` |
| `< 7` (`learning`) | `learning` |
| `< 14` (`familiar`) | `familiar` |
| Otherwise | `mastered` |

## Connections to the UI

- `App.svelte` creates a session (`TrainingSession`) when entering `/train`, calls `finishSentence` after each completed sentence, and saves state on unmount. Active time is accumulated every 15 seconds.
- `SentenceTrainingPage.svelte` displays the sentence, receives hint clicks (pinyin, translation) as `HelpLevel`, and calls `onComplete` when finished.
- Settings such as the number of sentences per session are described in [CONFIG_AND_AUDIO.md](../CONFIG_AND_AUDIO.md) and `lib/training-settings.ts`.

## Modification guide

- To change the mastery rules, adjust the `knowledge*` parameters in `config.training` or the logic in `completeSentence`.
- To change the selection strategy, modify `selectSentence`. Note that `unknownWords` depends on `wordKnowledge`.
- To change the persistence structure, note that `loadLearningState` validates array lengths, so existing saved data may be affected.
- To add a new sentence source, create `chinese-dataset/sentences/<set>/` with a `sentences.json` and its audio, add its folder name to `sentenceSetOrder` in `data.ts`, and enable it in `config.training.sentenceSources`.

Back to [src overview](../../README.md).
