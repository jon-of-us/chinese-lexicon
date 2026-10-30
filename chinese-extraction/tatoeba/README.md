# Tatoeba Mandarin HSK 1–3 audio set

`hsk1-3_cmn_eng_audio.tsv` contains 667 Mandarin Chinese (`cmn`) sentences with:

- an HSK level of 1, 2, or 3 according to the vendored `chinese-lexicon` list;
- at least one linked English (`eng`) translation; and
- at least one Tatoeba audio record.

The TSV includes one English translation and one audio recording per Chinese
sentence, plus the audio download URL and attribution/license metadata. The
build reads `links.csv`, which is not in the repo. Download it first, following
[DOWNLOAD.md](./DOWNLOAD.md). Then rebuild with:

```sh
node chinese-extraction/build_tatoeba_hsk13.mjs
```

Tatoeba rate-limited audio downloads during this run; `audio/` currently holds
the recordings that were successfully downloaded before the limit was reached.
The TSV's `audio_url` column is the source URL for each remaining recording.
