# chinese-app/src code guide

This directory contains all frontend source for the Svelte app. For the overall picture, see [CHINESE_OVERVIEW.md](../../CHINESE_OVERVIEW.md).

## File structure

```
src/
├── main.ts              Entry point: mounts App.svelte and writes config.cssVariables to CSS variables
├── App.svelte           Root component: routing, global state, lazy loading, active-time tracking
├── assets/              Static assets
└── lib/
    ├── *.svelte         Pages and UI components
    ├── *.ts             Logic, configuration, data loading
    └── training/        Sentence training subsystem (see training/README.md)
```

## App.svelte (root component)

- Routing uses a `path` state with `pushState` / `popstate`. No routing library is used.
- `handleRoute` switches pages based on the path: `/`, `/character/:c`, `/word/:w`, `/components`, `/component/:c`, `/pinyin`, `/train`, `/settings`.
- Each navigation entry is saved with a snapshot of the stack in `history.state`; in-app Back and pane clicks replace the current entry rather than calling `history.go`. Section starts (`/`, `/components`, `/pinyin`, `/train`) reset the active trail; character, word, and component details extend it. Search and Settings are temporary entries, not start pages. Detail Back skips Settings and follows the configured Search behavior; “Return to …” goes to the active section start. Direct detail URLs fall back to Dictionary.
- When the window is wide enough (`App.svelte` measures the content width with `width-probe`), the trailing detail entries render as side-by-side `detail-pane`s inside `detail-panes`, the top of the stack on the right. A start page directly below the run is the leftmost pane (`startView`), so selecting a character or component from a start page keeps that page beside the detail. The count is the minimum of `settings.maxPanes`, the pane run length, and the panes that fit `settings.paneMinWidth` plus the 24 px gap. Clicking a link in a left pane pops to that pane first. `App.svelte` measures the panes' document top (`panesElement`) and the window height (`svelte:window bind:innerHeight`) to set `--pane-height`; each `detail-pane` is a `minmax(0, 1fr)` grid row with `overflow-y: auto`, so every pane scrolls on its own.
- The main character or word in `CharacterPage.svelte` and `ComponentPage.svelte` uses the `fitHeadline` action from `lib/fit-headline.ts` with `settings.detailHeadlineSize` (passed as `headlineSize`). The action sets the font size down until the headline fits its width, and re-fits on resize and once fonts load. The headline is `nowrap`, and the hero text column takes the remaining width.
- Search results preserve their query/results while a detail page is open. Settings > Navigation chooses whether detail Back restores that Search or skips it; the default restores Search. Browser Back/Forward restores the saved route trail and Search state.
- Character and component pages, the pinyin page, the training engine, and the training page are lazy-loaded to reduce the initial bundle size. The dictionary is loaded at startup.
- `prepareTraining` and session creation live near `handleRoute`. `finishSentence` updates state after a sentence is completed.
- Active time is accumulated every 15 seconds, and learning state is saved when the component unmounts.

## Components and responsibilities

| Component | Responsibility |
| --- | --- |
| `SiteHeader.svelte` | Top bar: brand button, main navigation, search box |
| `OverviewPage.svelte` | Home page: grid of characters ordered by the selected frequency source, with a sort toggle and hover pinyin (bold, character lifted) |
| `ComponentOverviewPage.svelte` | Component and radical grid ordered by aggregate frequency, with component-rank colors and hover pinyin (bold, component lifted) |
| `ComponentPage.svelte` | Component uses grouped by role, each listing the exact form used, with the component's short form shown translucently beside its heading, in collapsible multi-column lists |
| `FrequencySourceSelector.svelte` | Switches the ordering source (media, textbooks, Dong, etc.) |
| `FrequentWords.svelte` | List of frequent words |
| `SearchResults.svelte` | Search result list |
| `CharacterPage.svelte` | Character and word details; the largest component (about 450 lines): etymology, components, frequency, words, pronunciation |
| `DictionaryPageControls.svelte` | Shared back and return controls for character and component detail pages |
| `PinyinPage.svelte` | Pinyin table and syllable coverage display |
| `SentenceTrainingPage.svelte` | Sentence training UI: shows the sentence, hints, and completion feedback |
| `SettingsPage.svelte` | Settings: dictionary ordering, training parameters, navigation (Search return, pane width and count), and detail headline size |
| `PageControls.svelte` | Page action button area |
| `PlayButton.svelte` | Pronunciation button; not rendered when no recording exists |

Component props are declared with `$props()`. The props of `SentenceTrainingPage` include `state`, `session`, `settings`, `colorFor`, `componentColorFor`, `headlineSize`, and several callbacks. Its new-word card embeds `CharacterPage` and receives the same colour functions as the detail pane.

## Colors and styling

- Character and component frequency colors use `config.frequencyColorScale` (a reversed Inferno scale), mapped by `rankColor` in `ranking.ts`.
- Style variables are generated from `config.visual.colors` and `config.typography`, with `config.cssVariables` as the entry point (see [CONFIG_AND_AUDIO.md](lib/CONFIG_AND_AUDIO.md)).
- `index.html` references `/favicon.svg`, which is the only static asset in use.

## Detailed documentation

- [lib/DICTIONARY.md](lib/DICTIONARY.md): dictionary loading, search, and frequency indexes
- [lib/training/README.md](lib/training/README.md): sentence training
- [lib/CONFIG_AND_AUDIO.md](lib/CONFIG_AND_AUDIO.md): configuration, settings, and audio
