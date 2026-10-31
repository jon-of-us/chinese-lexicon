# Configuration, settings, and audio (config / settings / audio)

This document explains the central configuration object, how user settings are persisted, and how audio files are discovered and played.

## 1. Central configuration (lib/config.ts)

`config` is a plain object with the following sections:

| Group | Contents |
| --- | --- |
| Top level | `appName` ("Chinese Lexicon"), `data` (limits for search and display, such as `searchResultsLimit: 30`) |
| `training` | Sentence training parameters; see [training/README.md](training/README.md) |
| `frequencyColorScale` | Character frequency color scale (reversed Inferno; rank 1 is brightest; `clampAtRank: 1000`) |
| `visual.colors` / `visual.typography` | Colors and fonts |
| `cssVariables` | Flattens colors into CSS variables such as `--color-*`, which `main.ts` writes to the document root |
| `componentTypeNames` | Labels for etymology component types: `meaning`, `sound`, `iconic`, `simplified`, `deleted`, `unknown` |

To change appearance, edit `visual.colors`. The CSS variables are generated automatically.

To change training parameters, edit the fields under `training`.

To hide the whole training section (header button, `/train` route, Settings group, and the sentence data and audio), set `training.enabled` to `false`. `vite.config.ts` turns it into the build-time constant `__TRAINING_ENABLED__`, so the training code is removed from the bundle.

## 2. User settings (persisted in localStorage)

### Dictionary settings (lib/settings.ts)

- Storage key: `hanzi-atlas-difficulty-settings`
- Fields:
  - `source`: `media` (films and TV), `books` (textbooks), `dong` (Dong dictionary)
  - `order`: same values as `source`, plus an optional `hsk`
  - `range`: 100–3000, default 1000
  - `pinyinHoverRank`: rank used when hovering over pinyin, default 500
- `loadDifficultySettings` falls back to defaults for invalid values and clamps `range` to [100, 3000].

### Training settings (lib/training-settings.ts)

- Storage key: `hanzi-atlas-training-settings`
- Fields: `sessionLength` (default 10, range 1–50), various font sizes, and `wordDetailRankSource`
- Values are range-limited on read. The legacy field `translationFontSize` is mapped to the new translation font size field, so older data remains usable.

When changing a setting, update three places: the reader, the saver, and the settings page (`SettingsPage.svelte`).

## 3. Audio (lib/audio.ts)

Audio files are discovered at build time through `import.meta.glob`. **After adding new audio files, rebuild or restart the dev server** so the glob rescans the directories.

| Category | Directory | Matching |
| --- | --- | --- |
| Word pronunciation | `chinese-dataset/word-audio/edge-tts/words/cmn-<word>.mp3` (top 2000 multi-character words, Yunyang voice) | Filename is the text; no audio if the word is outside the top 2000 |
| Sentence audio | `chinese-dataset/sentences/**/*.mp3` | Folder is the sentence set; file is `audio.path` in that set's `sentences.json` |

### Pronunciation selection (getPronunciationAudio)

- `getPronunciationAudio(text)` returns `edge-tts/words/cmn-<text>.mp3` when it exists. Single characters have no file in `words/`, so they use the syllable file for their primary reading: `edge-tts/syllables/cmn-<pinyin><tone>.mp3`. The mapping is in `edge-tts/syllables/index.json` (`characters`). Each syllable is voiced by one representative character with that reading (`voices`).
- No other audio is used as a fallback.
- If no matching file exists, it returns `undefined`, and `PlayButton.svelte` does not render a button.
- Component characters use the same lookup. The component page plays the component's audio automatically when it opens, and its heading shows a play button for replay. The character page's Structure cards have no play buttons.

### Sentence audio (sentenceAudio)

`sentenceAudio(source, path)` in `training/audio.ts` looks up `../../../../chinese-dataset/sentences/<source>/<path>` in its glob. `source` is the sentence set folder name, which `training/data.ts` stores on each sentence. `path` is `audio.path` from that set's `sentences.json`.

## 4. Related files and licensing

- Source and license of the pronunciation files (CC BY-SA 4.0): [ATTRIBUTION.md](../../../chinese-dataset/word-audio/ATTRIBUTION.md)
- Download script (legacy pipeline): `chinese-extraction/download_hsk_word_audio.sh`

Back to [src overview](../README.md).
