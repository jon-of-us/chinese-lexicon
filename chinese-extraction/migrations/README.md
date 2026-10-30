# Sentence migrations

> **Legacy.** The app no longer reads this output. It reads [chinese-dataset/](../../chinese-dataset/), which is maintained by hand. The migrations below write to `chinese/`, which is kept for now. Their paths must be updated before they run again.

Each migration reads its source in `chinese-extraction/` and writes only generated
files to `chinese/` (legacy path); source databases, archives, TSVs, and Anki collections are
never changed.

Build the app's stable media-frequency word and character indexes:

```sh
node chinese-extraction/build_media_frequency_lists.mjs
```

Install the pinned word segmenter and build all exports:

```sh
python3 -m pip install -r chinese-extraction/requirements.txt
python3 chinese-extraction/migrations/migrate_all.py
```

Generated files:

- `chinese/sentences/<source>.json` — one canonical JSON array per source.
- `chinese/sentence-audio/<source>/` — copied audio only for converted records.
- `chinese-extraction/migration-reports/<source>.json` — exact read, converted, and skip counts.
  Each report also records output JSON and copied-audio sizes (bytes and decimal MB),
  plus counts of source-provided and generated word splits.

Canonical records require `source`, `audio`, `transcription`, `translation`, and
`word_split`. `translation.words` is an ordered array of English token glosses;
its indexes match `word_split.tokens` (with punctuation represented by itself).
`translation.alignment` is a parallel array of English-token indexes selected by
the contextual aligner, or `null` when a source gloss or dictionary fallback was
used.
Source-provided token glosses are retained. For other sources, a lightweight
IBM Model 1 aligner is trained on the source's Chinese-English sentence pairs;
its confident contextual alignments are preferred, with the vendored CC-CEDICT
resolver as the migration-time fallback.
Records are excluded when the final ordered gloss array cannot provide a non-empty
value for every token; the application does not generate token translations.
`word_split.metadata.origin` is `provided` when an ordered source token list exists
and `generated` otherwise. Generated splits additionally identify
the pinned tool and version. The Anki deck's MorphMan fields are not used as a word
split because they are unordered vocabulary lists, not sentence-order tokenization.
