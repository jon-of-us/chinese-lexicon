"""Generate Edge TTS audio for every toned pinyin syllable and map characters to them.

Each toned syllable (for example wo3 or lv4) is voiced by one representative character
that reads it. The representative is the most frequent character whose primary reading
is that syllable, so Edge TTS speaks the intended reading. If no character has it as
its primary reading, any character with that reading is used.

Writes:
  chinese-dataset/word-audio/edge-tts/syllables/cmn-<syllable>.mp3
  chinese-dataset/word-audio/edge-tts/syllables/index.json

index.json maps each character to its primary syllable, so a character without its own
file in edge-tts/words/ can play the audio of another character with the same pronunciation.

Run from the repository root:
    chinese-extraction/.venv/bin/python Chinese-extraction/build_edge_tts_syllables.py
"""

import asyncio
import json
import pathlib
import re
import sys

import build_edge_tts_dataset as EdgeTtsDataset

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
DICTIONARY_DIR = REPO_ROOT / "chinese-dataset" / "dictionary"
FREQUENCY_DIR = REPO_ROOT / "chinese-dataset" / "frequency"
OUTPUT_DIR = REPO_ROOT / "chinese-dataset" / "word-audio" / "edge-tts" / "syllables"
INDEX_PATH = OUTPUT_DIR / "index.json"

CJK_CHARACTER = re.compile(r"^[\u3400-\u9fff\uf900-\ufaff]$")
TONED_SYLLABLE = re.compile(r"^[a-z]+[1-5]$")


def normalize_syllable(value):
    """Return the toned syllable in the form used for filenames, or None if it is not one."""
    if not value:
        return None
    syllable = value.strip().lower().replace("u:", "v")
    return syllable if TONED_SYLLABLE.match(syllable) else None


def load_readings():
    with open(DICTIONARY_DIR / "entries.json", encoding="utf-8") as f:
        entries = json.load(f)["entries"]
    with open(FREQUENCY_DIR / "characters.json", encoding="utf-8") as f:
        frequencies = {entry["character"]: entry["mediaFrequency"] for entry in json.load(f)["characters"]}

    # The first dictionary entry for a character is its primary reading, as used by the app.
    primary = {}
    readers = {}
    for entry in entries:
        text = entry["simp"]
        if not CJK_CHARACTER.match(text):
            continue
        syllable = normalize_syllable(entry.get("pinyinTones"))
        if text not in primary:
            primary[text] = syllable
        if syllable:
            readers.setdefault(syllable, set()).add(text)
    return primary, readers, frequencies


def representative(syllable, candidates, primary, frequencies):
    preferred = [text for text in candidates if primary.get(text) == syllable]
    pool = preferred or candidates
    return max(pool, key=lambda text: (frequencies.get(text, 0), text))


def main():
    primary, readers, frequencies = load_readings()
    voices = {
        syllable: representative(syllable, sorted(texts), primary, frequencies)
        for syllable, texts in sorted(readers.items())
    }
    characters = {text: syllable for text, syllable in sorted(primary.items()) if syllable}
    without_primary = sum(1 for syllable, text in voices.items() if primary.get(text) != syllable)
    print(f"{len(voices)} toned syllables, {len(characters)} characters with a primary syllable")
    print(f"{without_primary} syllables voiced by a character whose primary reading differs")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump({"voices": voices, "characters": characters}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {INDEX_PATH.relative_to(REPO_ROOT)}")

    jobs = [(text, OUTPUT_DIR / f"cmn-{syllable}.mp3") for syllable, text in voices.items()]
    counts = asyncio.run(EdgeTtsDataset.generate(jobs))
    return 1 if counts["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
