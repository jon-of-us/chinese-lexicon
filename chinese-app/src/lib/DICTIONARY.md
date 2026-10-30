# Dictionary module (lib/dictionary.ts and lib/ranking.ts)

This document explains how the app loads dictionary data and builds search and frequency indexes.

## Data source

At the top level, `dictionary.ts` statically imports the curated files in `chinese-dataset/dictionary/` (`entries.json`, `index.json`, `etymology.json`) and `chinese-dataset/frequency/` (`character-order.json`, `characters.json`). The module is loaded lazily by `App.svelte` the first time a dictionary-related page is opened, so the home page does not wait for it. It builds `allEntries` when the module initializes.

Entry types are defined in `lib/types.ts`:

- `Entry`: `simp` (simplified), `trad` (traditional), `pinyin`, `definitions`, `statistics`
- `Etymology`: etymology information

## Search

`search(query)` combines two matching methods:

1. **English meanings**: the query is split into tokens and fuzzy-matched against definitions, scored with edit distance.
2. **Characters**: substring matching against simplified and traditional forms.

The final score is multiplied by `entry.boost`, which raises the ranking of common entries. Pinyin matching ignores whitespace, so both `jianada` and `jia na da` match 加拿大. `dictionary-search.ts` owns this shared scoring logic. `App.svelte` sends debounced queries to `search.worker.ts`, so the full lexicon scan runs off the UI thread and cannot delay keystrokes; only the result update waits for the worker.

## Frequency and ranking indexes

| Function | Purpose |
| --- | --- |
| `getFrequencyScores` | Returns a character's scores across frequency sources (used by the character page) |
| `getDifficultyRank` | Returns a character's difficulty rank under the current settings (source, order, range) |
| `getBookFrequencyCharacters` | Character list ordered by textbook frequency |
| `getHskCharacters` | HSK character list |
| `getComponentForms` | Component structure of a character (etymology tree) |
| `getOverviewComponents` | Components ordered by aggregate book/media frequency, Dong rank, or HSK level |
| `getComponentRank` | A component's rank for the selected color-frequency source |
| `getComponentDetails` | Character uses of a component, grouped into meaning, sound, and other roles, plus the component's short form |
| `getComponentVariant` | The radical short form of a full component (人 → 亻), or the full component of a short form (亻 → 人), shown translucently |
| `getMediaCharacterRank` | Media character frequency rank, read from `chinese-dataset/frequency/characters.json` |

The frequency source and ordering parameters are determined by `DifficultySettings` in `lib/settings.ts`: `source` (media / books / dong), `order` (may include hsk), and `range` (100–3000).

Component relationships are built from simplified-character etymology when `dictionary.ts` loads. Each use is indexed only under the exact form it appears in, so 亻 (the short form of 人) lists words containing 亻 and 人 lists words containing 人. Component forms whose etymology notes identify a full component are recorded as short forms and shown translucently and as links next to the glyph. Component ranks aggregate the frequency data of the characters that use each component and drive the same rank-based color scale as character ranks. Book and media detail labels show rank, not raw corpus counts. Each role group is a responsive multi-column list that starts collapsed to three rows and can be expanded.

The component overview and detail pages are lazy-loaded, and character uses link back to their character pages. Character and component detail pages share `DictionaryPageControls` for back and return navigation.

## Pinyin coverage

`normalizePinyin`, `getPinyinSyllables`, and `getPinyinCoverage` normalize pinyin into syllables and compute how well each syllable is covered by the dictionary. `PinyinPage.svelte` uses them.

## Overview ranking (ranking.ts)

`ranking.ts` is independent of the full dictionary. It only provides the lightweight data the overview page needs, so the home page does not wait for the whole dictionary to load:

- `getOverviewCharacters`: character list for the overview page
- `getOverviewDifficultyRank`: difficulty rank for the overview page
- `rankColor`: maps a rank to a color using `config.frequencyColorScale`

## Modification guide

- To change search weighting, look at the scoring code in `search()` and at `entry.boost`.
- To add a frequency source, add reading and indexing functions in `dictionary.ts`, register the source in `source` in `settings.ts`, and display it in `FrequencySourceSelector.svelte`.
- Dictionary data lives in `chinese-dataset/dictionary/` and is maintained by hand. To change entries, edit `entries.json`, `index.json`, or `etymology.json` there, and keep `index.json` consistent with the positions in `entries.json`.

Back to [src overview](../README.md).
