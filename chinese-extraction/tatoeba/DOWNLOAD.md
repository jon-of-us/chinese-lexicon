# Downloading the Tatoeba link export

`build_tatoeba_hsk13.mjs` reads `links.csv` from this folder. The file is about
453 MB uncompressed, and GitHub rejects files over 100 MB, so it is not stored
in the repo. The builder also reads the sentence exports described below. All of
these files are gitignored, so download them once per clone.

## Steps

From the repository root:

```sh
cd chinese-extraction/tatoeba
curl -fL -o links.tar.bz2 https://downloads.tatoeba.org/exports/links.tar.bz2
tar -xjf links.tar.bz2
rm links.tar.bz2   # optional: the extracted links.csv is all the build needs
```

This produces `chinese-extraction/tatoeba/links.csv` (about 458 MB, 150 MB
compressed download).

## Sentence exports

```sh
cd chinese-extraction/tatoeba
curl -fL -o cmn_sentences.tsv.bz2 https://downloads.tatoeba.org/exports/per_language/cmn/cmn_sentences.tsv.bz2
curl -fL -o eng_sentences.tsv.bz2 https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2
curl -fL -o sentences_with_audio.tar.bz2 https://downloads.tatoeba.org/exports/sentences_with_audio.tar.bz2
tar -xjf sentences_with_audio.tar.bz2   # produces sentences_with_audio.csv
```

Then rebuild the HSK 1–3 set:

```sh
node chinese-extraction/build_tatoeba_hsk13.mjs
```

## Notes

- Tatoeba publishes new exports weekly. The file downloaded today can differ
  from the snapshot used for the committed `hsk1-3_cmn_eng_audio.tsv`, so a
  rebuild may change a few rows.
- Do not commit these files. They are in `.gitignore`, and GitHub rejects files
  over 100 MB.
- Source: https://tatoeba.org/en/downloads

