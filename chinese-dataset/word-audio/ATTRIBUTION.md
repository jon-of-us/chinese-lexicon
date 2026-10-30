# Native Mandarin HSK word audio

The MP3 files in `hsk-words/` are copied from [hugolpz/audio-cmn](https://github.com/hugolpz/audio-cmn), specifically its `96k/hsk` collection.

- Coverage: 8,596 HSK words and characters (the HSK 2000 vocabulary collection).
- Speakers: Yue Tan (HSK words and characters); project management, compression, and renaming by Hugo Lopez / PLIDAM / INALCO.
- License: [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
- File naming: `cmn-<simplified Chinese text>.mp3`.

The originals are native-speaker recordings, compressed by the upstream project to 96 kbps MP3 for web and mobile use. Run `chinese-extraction/download_hsk_word_audio.sh` to retrieve or refresh this directory.

## Reading-specific character audio

The `syllables/` directory is copied from [hugolpz/audio-cmn](https://github.com/hugolpz/audio-cmn)'s `64k/syllabs` collection. It contains 1,707 recordings by Chen Wang, licensed CC BY-SA. Files use numbered pinyin names such as `cmn-le4.mp3`, `cmn-yue4.mp3`, `cmn-xing2.mp3`, and `cmn-hang2.mp3`.

`chinese-app` uses this collection only when a single character has multiple dictionary readings. This guarantees that polyphonic readings such as `乐` (`lè` and `yuè`) and `行` (`xíng` and `háng`) play the requested reading. Characters with one dictionary reading and all multi-character words use the native HSK recordings above.
