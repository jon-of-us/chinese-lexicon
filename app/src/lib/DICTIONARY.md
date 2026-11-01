# Dictionary module (lib/dictionary.ts and lib/ranking.ts)

This document explains how the app loads dictionary data and builds search and frequency indexes.

## Data source

At the top level, `dictionary.ts` imports `src/generated/dictionary-data.json` (built from `chinese-dataset/dictionary/` by `app/scripts/generate-dictionary-data.ts`), `chinese-dataset/dictionary/index.json`, and `chinese-dataset/frequency/` (`character-order.json`, `characters.json`). The generated file keeps only the fields the app reads, rounds floats to 4 significant figures, caps `topWords`, and precomputes `componentUses`. `dictionary.ts` is imported statically by `App.svelte`, so it is part of the entry chunk and loads at startup, before the first render. The `componentUses` map is built from the generated lists.

Entry types are defined in `lib/types.ts`:

- `Entry`: `simp` (simplified), `trad` (traditional), `pinyin`, `definitions`, `statistics`
- `Etymology`: etymology information

## Search

`search(query)` combines two matching methods:

1. **English meanings**: the query is split into tokens and fuzzy-matched against definitions, scored with edit distance.
2. **Characters and components**: substring matching against simplified and traditional forms, including component entries that navigate to component detail pages.

The final score is multiplied by `entry.boost`, which raises the ranking of common entries. Pinyin matching ignores whitespace, so both `jianada` and `jia na da` match 加拿大. `dictionary-search.ts` owns this shared scoring logic.

Search runs in `search.worker.ts`, so the scan stays off the UI thread. The worker does not import `entries.json`. It fetches `src/generated/search-entries.json` (emitted as a hashed asset via a `?url` import) the first time a query is made. `app/scripts/generate-dictionary-data.ts` writes dictionary entries and labeled component entries at build time, in `npm run generate`, and in dev. It keeps only the fields search reads (`simp`, `trad`, `definitions`, `pinyin`, `searchablePinyin`, `pinyinTones`, `boost`, and the optional `kind`). `statistics` and `usedAsComponentIn` are left out. `src/generated/` is gitignored, so the file is not committed. If `dictionary-search.ts` starts reading another field from `SearchEntry`, add it to the generator's `searchFields` list or component-entry generation.

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
- Dictionary data lives in `chinese-dataset/dictionary/` and is maintained by hand. To change entries, edit `entries.json`, `index.json`, or `etymology.json` there, and keep `index.json` consistent with the positions in `entries.json`. Do not edit `app/src/generated/`; it is rebuilt from `entries.json`.

Back to [src overview](../README.md).
