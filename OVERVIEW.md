# Chinese Learning Dictionary Project Overview (Chinese Lexicon)

This document describes the Chinese learning app (`chinese-app/`, Svelte), the curated dataset it reads (`chinese-dataset/`), the legacy extraction pipeline (`chinese-extraction/`), and where the code for each module lives. For details, see the explanation files inside each module (index in section 6). Dataset contents, licensing, and open decisions are in sections 7 and 8.

## 1. How the three parts relate

```
chinese-dataset/   ──read directly by──▶   chinese-app/
(curated, hand-maintained data)            (Svelte + Vite app)

chinese/              legacy data, gitignored and removed from git history, kept locally, not used by the app
chinese-extraction/   legacy pipeline, writes to chinese/, not used by the app
```

Key point: **the app's data does not live inside `chinese-app/`**. It lives in the repo-root `chinese-dataset/` folder, and the app imports it through relative paths such as `../../../chinese-dataset/...`. The `server.fs.allow: ['..']` setting in `vite.config.ts` permits this cross-directory access. The app has no other data source.

## 2. Top-level directory structure

| Path | Type | Purpose |
| --- | --- | --- |
| `chinese-app/` | Source | Svelte 5 + Vite 8 + TypeScript app, named "Chinese Lexicon" |
| `chinese-app/src/` | Source | All frontend code. Entry point `main.ts`, root component `App.svelte` |
| `chinese-extraction/` | Source + raw data | Download scripts, Node build scripts, Python migrations, and raw data sources |
| `chinese-dataset/` | Data (curated, hand-maintained) | Dictionary, frequency lists, audio, and sentence sets the app reads. See [chinese-dataset/README.md](chinese-dataset/README.md). |
| `chinese-extraction/hsk-sentences-audio/` | Git submodule | HSK example sentence and audio dataset (HF `no7z/hsk-sentences-audio`) |
| `chinese-extraction/tatoeba/` | Raw data | Tatoeba exports, TSV files, and downloaded audio |
| `chinese-extraction/anki/` | Raw data | Anki package and the unpacked collection and media files |
| `chinese-extraction/migrations/` | Source (Python) | Converts each data source into the unified sentence format |
| `chinese-extraction/migration-reports/` | Generated reports (JSON) | Per-source read, convert, and skip counts |

Note: the root `.gitignore` excludes mp3 and other audio, the `chinese-extraction/hsk-sentences-audio` submodule, and the non-publishable sentence sets by folder name.

## 3. Data flow

1. **Dictionary and frequency**: `chinese-dataset/dictionary/` (entries, lookup index, etymology) and `chinese-dataset/frequency/` (character order, word and character frequency). `dictionary.ts` loads them for pinyin, definitions, components, and etymology. `dictionary.ts` loads a generated slim copy of the data (`chinese-app/src/generated/dictionary-data.json`) and `search.worker.ts` searches a generated slim copy of the entries (`chinese-app/src/generated/search-entries.json`). Both are built from `chinese-dataset/` by `chinese-app/scripts/generate-dictionary-data.ts` during `npm run generate`, `dev`, and `build`. They are gitignored. `ranking.ts` loads the frequency files for the overview page.
2. **Audio**: `chinese-dataset/word-audio/` holds word and syllable MP3s. `audio.ts` discovers them at build time through `import.meta.glob`. `chinese-dataset/sentences/<set>/` holds sentence audio.
3. **Sentences**: `training/data.ts` globs each set's `sentences.json` and keeps the sets listed in `config.training.sentenceSources`.
4. **Curated dataset**: the data is maintained by hand. There are no generator scripts in the repository. The layout and interface are in [chinese-dataset/README.md](chinese-dataset/README.md) and [manifest.yaml](chinese-dataset/manifest.yaml).

The main fields of a unified sentence record are `id`, `source`, `audio{path,format}`, `transcription`, `translation{language,text,words[],alignment[]}`, `word_split{tokens[],metadata}`, and `source_metadata`. The full definition is in [chinese-extraction/migrations/README.md](chinese-extraction/migrations/README.md).

## 4. The app (chinese-app)

### 4.1 Pages and routes

`App.svelte` manages its own `path` state (`pushState` / `popstate`) and does not use a router library. Each history entry stores a snapshot of the navigation stack in `history.state`, so browser Back/Forward restores the trail as well as the in-app controls. In-app pops replace the current entry with a truncated snapshot instead of calling `history.go`. Routes:

| Path | Page | Components |
| --- | --- | --- |
| `/` | Dictionary overview (grid of characters sorted by frequency; hovering a character lifts it and shows its pinyin in bold below it) | `OverviewPage`, `FrequencySourceSelector` |
| `/character/:c` | Character detail (etymology, components, words, pronunciation) | `CharacterPage` |
| `/word/:w` | Word detail | `CharacterPage` |
| `/components` | Component and radical overview, ordered by the selected frequency source and colored by component rank; hovering a component lifts it and shows its pinyin in bold below it | `ComponentOverviewPage` |
| `/component/:c` | Component detail with its own structure (the parts it breaks down into, if any) and simplified-character uses grouped by meaning, sound, and other roles | `ComponentPage` |
| `/pinyin` | Pinyin table (lazy-loaded page) | `PinyinPage` |
| `/train` | Sentence training | `SentenceTrainingPage` |
| `/settings` | Settings (dictionary ordering, training parameters) | `SettingsPage` |

The search box is in `SiteHeader`, and results are shown by `SearchResults`. Search is a temporary navigation entry, not a section start page; its query and results are retained while a result detail is open. Settings is also a temporary entry and does not change the active section start page.

Section start pages are `/`, `/components`, `/pinyin`, and `/train`. Opening a section from the header replaces the active in-app trail with that start page. Opening a character, word, or component adds a detail entry. The shared detail controls behave as follows:

- **Back** returns to the preceding detail or, when there is no preceding detail, the active section start page. Settings is skipped. Returning from a Search result is configurable in Settings: restore Search with its query (default), or skip Search and go to the previous detail/start page.
- **Return to …** goes directly to the active section start page, clearing the detail trail.
- **Wide layout (panes):** the trailing run of detail entries is shown side by side, with the top of the stack on the right and earlier details to its left. When a start page sits directly below the run, it is the leftmost pane, so selecting a character or component from a start page keeps that page visible beside the detail. The pane count is the smallest of the Maximum detail panes setting, the number of panes in the run, and the number of panes that fit the Minimum pane width. Each detail pane has its own Back and return controls, placed sticky inside the pane, and scrolls independently: the pane row is sized to the rest of the window below the header, so the start page and each detail keep their own scroll position. The main character or word is sized from the Headline size setting and shrinks to fit one line rather than wrapping. Clicking a link in a left pane pops the stack to that pane before opening the new detail. Search and Settings are not panes; while one is on top, the trail is not shown side by side.
- Directly loading a detail URL uses Dictionary (`/`) as its fallback start page.
- Character and word routes both render `CharacterPage`; component routes render `ComponentPage`. These have different detail content/layouts but share `DictionaryPageControls` for their navigation actions. The training page embeds the same `CharacterPage` for new words, with the same colour functions and headline size as the detail pane, and without rendering detail controls.

### 4.2 Logic layer

- **Dictionary**: `lib/dictionary.ts` handles search (fuzzy English matching plus Hanzi substring matching) and the frequency indexes.
- **Ranking**: `lib/ranking.ts` provides a lightweight overview ranking, kept separate from the full dictionary so the dictionary can load lazily.
- **Components**: the dictionary module derives component-to-simplified-character use indexes from lexicon etymology, including meaning and sound roles. Component overview ranks aggregate character book/media counts, Dong character ranks, or HSK levels; component colors reflect their rank for the selected frequency source.
- Component details show each role in a responsive multi-column list, collapsed to three rows by default, with book/media ranks rather than raw counts. Character/word and component detail pages use different content components but share `DictionaryPageControls` and the root navigation stack for consistent Back and return-to-start behavior.
- **Config**: `lib/config.ts` is the central config object (training parameters, colors, CSS variables, and so on). `config.training.enabled` is the single switch for the whole training section. When it is `false`, the Training header button, `/train` route, Settings group, and sentence data and audio are removed from the build (`__TRAINING_ENABLED__` in `vite.config.ts`).
- **Settings**: `lib/settings.ts` and `lib/training-settings.ts` store preferences in localStorage. The Navigation settings control whether detail Back restores a Search query or skips Search, the Minimum pane width (default 400 px, 320–1200), and the Maximum detail panes (default 4, 1–5). The Detail pages setting controls the Headline size of the main character or word (default 120 px, 64–288).
- **Audio**: `lib/audio.ts` resolves pronunciation files. Characters with several readings use the matching syllable mp3.
- **Training**: `lib/training/` selects sentences based on word knowledge, persists state in IndexedDB, and filters timing outliers.

### 4.3 Key current settings

- Sentence sources: `config.training.sentenceSources` currently enables `["tatoeba-nc", "tatoeba-unlicensed"]`. Together these are the old `tatoeba-hsk1-3` set, split by audio license. `hsk-sentences-audio` and `anki-tatoeba` are commented out.
- Training thresholds: the word category thresholds are new 2 / learning 7 / familiar 14. Selection simply takes the first sentence not seen recently (see [training/README.md](chinese-app/src/lib/training/README.md)).

## 5. Running and building

App (run inside `chinese-app/`):

```bash
npm install
npm run dev       # dev server
npm run build     # production build
npm run check     # svelte-check + tsc
```

Each GitHub Pages deploy replaces the hashed `assets/` files. A tab opened before a deploy then fails to load its lazy pages (for example `CharacterPage-*.js`). `main.ts` reloads the page once when that happens, and the guard stops it from reloading repeatedly.

The data in `chinese-dataset/` is hand-maintained and kept locally. It is not regenerated by any script. The `chinese/` folder is legacy, gitignored and removed from git history; it stays on disk locally. The `chinese-extraction/` scripts are legacy and tracked. Neither is part of the app's build.

## 6. Documentation and code index

Find code and explanations by topic:

| Topic | Code | Explanation file |
| --- | --- | --- |
| App overall, routing, page components | `chinese-app/src/App.svelte`, `chinese-app/src/lib/*.svelte` | [chinese-app/src/README.md](chinese-app/src/README.md) |
| Dictionary search, frequency indexes, pinyin coverage | `chinese-app/src/lib/dictionary.ts`, `ranking.ts` | [chinese-app/src/lib/DICTIONARY.md](chinese-app/src/lib/DICTIONARY.md) |
| Sentence training (knowledge, selection, persistence) | `chinese-app/src/lib/training/` | [chinese-app/src/lib/training/README.md](chinese-app/src/lib/training/README.md) |
| Config, settings, audio resolution | `chinese-app/src/lib/config.ts`, `settings.ts`, `training-settings.ts`, `audio.ts` | [chinese-app/src/lib/CONFIG_AND_AUDIO.md](chinese-app/src/lib/CONFIG_AND_AUDIO.md) |
| Extraction pipeline, download scripts, caveats | `chinese-extraction/` | [chinese-extraction/README.md](chinese-extraction/README.md) |
| Unified sentence format and migrations | `chinese-extraction/migrations/` | [chinese-extraction/migrations/README.md](chinese-extraction/migrations/README.md) |
| Audio sources and licensing | `chinese-dataset/word-audio/` | [chinese-dataset/word-audio/ATTRIBUTION.md](chinese-dataset/word-audio/ATTRIBUTION.md) |
| Dataset contents, licenses, known gaps, open decisions | `chinese-dataset/` | [chinese-dataset/README.md](chinese-dataset/README.md) and section 7 below |
| Curated dataset layout and interface | `chinese-dataset/` (`manifest.yaml`, `sources.json`) | [chinese-dataset/README.md](chinese-dataset/README.md) |

## 7. Dataset: contents, licenses, and known gaps

The app reads only [chinese-dataset/](chinese-dataset/), whose layout and interface are in [chinese-dataset/README.md](chinese-dataset/README.md). Counts were checked against the files.

| File | Contents | Count | Source | Publishable |
| --- | --- | --- | --- | --- |
| `dictionary/entries.json` | Entries with pinyin, definitions, statistics, and component usage | 124,774 | cc-cedict, dong-chinese | yes |
| `dictionary/index.json` | Lookup keys for simplified and traditional forms | 121,015 simp, 122,197 trad | cc-cedict, dong-chinese | yes |
| `dictionary/etymology.json` | Character notes, components, and pinyin | 5,088 | dong-chinese | yes |
| `frequency/character-order.json` | First 1000 characters in learning order | 1,000 | dong-chinese | yes |
| `frequency/words.json` | Top words by media frequency | 2,000 | dong-chinese, cc-cedict | yes |
| `frequency/characters.json` | Characters in those words, ranked by media frequency | 1,229 | dong-chinese | yes |
| `word-audio/hsk-words/` | Word and character MP3s | 8,596 | audio-cmn | yes |
| `word-audio/syllables/` | Reading-specific MP3s | 1,707 | audio-cmn | yes |
| `sentences/hsk-sentences-audio/` | Sentences with synthetic audio | 4,329 | hsk-sentences-audio | yes |
| `sentences/tatoeba-nc/` | Tatoeba sentences with CC BY-NC 4.0 audio | 30 | Tatoeba | yes, non-commercial |
| `sentences/tatoeba-unlicensed/` | Tatoeba sentences with no audio license in the export | 536 | Tatoeba | no (gitignored) |
| `sentences/anki-tatoeba/` | Anki deck sentences, Tatoeba duplicates removed | 737 | Anki deck | no (gitignored) |

Licensing:

- dong-chinese (dictionary and frequency): CC BY-SA 4.0, as the owner states. `package.json` in the old submodule says ISC. This conflict is unresolved.
- audio-cmn (word audio): CC BY-SA 4.0. See [word-audio/ATTRIBUTION.md](chinese-dataset/word-audio/ATTRIBUTION.md).
- hsk-sentences-audio: dataset CC BY-SA 4.0. The synthetic voice model (CosyVoice2) is Apache-2.0.
- Tatoeba: 30 recordings are CC BY-NC 4.0 (non-commercial, credit `audio_user`). 536 have no recorded license. The Anki deck's own license has not been checked.
- Non-publishable sets are ignored by folder name in the root `.gitignore`.

Build constraint: none. The sentence sets are loaded with `import.meta.glob` in `training/data.ts`, so any set that is missing is skipped. A fresh clone builds without the gitignored `tatoeba-unlicensed` and `anki-tatoeba` sets, but those sets then contribute no sentences.

Known gaps:

- HSK `translation.alignment` is `null` for every entry. The app does not read `alignment`.
- Sentence-level `pinyin` is filled only for HSK records, and the app does not read it.
- `frequency/character-order.json` has no generator in this repository.
- 50 dictionary entries come only from dong-chinese and have no `pinyinTones` field.
- Images are not included. The app does not use them.
- The dictionary is a large static import (about 64 MB, 15.7 MB gzipped), loaded on app start because `App.svelte` preloads it on mount.

## 8. Open decisions and verification status

1. **`chinese/` and `chinese-extraction/` disposition:** `chinese/` is removed from git history (history rewritten and force-pushed) and gitignored. It stays on disk locally. `chinese-extraction/` is still tracked and legacy. The `chinese/` MP3 folders were rebuilt from the curated copies, so they match the old layout. The `anki-tatoeba.json` file and its MP3s were lost when `chinese/` was deleted. They were rebuilt with `chinese-extraction/migrations/migrate_anki_tatoeba.py` (1077 records, not the original 1028), so the rebuild does not match the old output exactly.
2. **Anki sentence set:** `anki-tatoeba` is not enabled. The 340 Anki records that duplicate converted Tatoeba records are already removed. Decide whether to enable it. The 737 records (688 original plus 49 rebuilt) have generated word glosses. About two-thirds of tokens (punctuation included) have no contextual alignment and use the CC-CEDICT fallback, and some glosses are wrong (for example `都` = "surname Du", `了` = "He"). The 624 curated glosses that differ from the current pipeline were kept as they are. Their origin cannot be reproduced from this repo, and they have not been reviewed. Review the set before enabling it.
3. **Empty-license Tatoeba records (536):** what does an empty `audio_license` mean? They are gitignored and `publishable: false` until this is answered. Also decide whether the 30 CC BY-NC recordings stay in, given that the app may be distributed.
4. **Anki deck in git history:** removed. The history rewrite dropped `chinese/`, including `chinese/sentences/anki-tatoeba.json`, and no `chinese-extraction/anki/` objects remain in history.
5. **`character-order.json` provenance:** add a generator, or document the source.
6. **Unused fields:** decide whether to drop `translation.alignment` and sentence-level `pinyin` from the dataset.
7. **dong-chinese license:** resolve the CC BY-SA 4.0 vs ISC conflict.

Verification status: `npm run check` and `npm run build` pass. `check` sets a 16 GB Node heap in its script because TypeScript inference on the large dictionary JSON runs out of memory at the default size. The app has not been checked in a browser yet. The checks still to do are dictionary search, character and component pages, the frequency overview, pinyin, training for each enabled sentence set, and audio (for example 乐 and 行).



