"""Generate basic Edge TTS audio for toned pinyin syllables using intended readings.

Each syllable is spoken as a single character, padded by whitespace to prevent
clipping. If the dictionary has no character whose primary reading is the target
syllable, no clip is generated rather than using a character with another reading.

Writes:
  chinese-dataset/word-audio/edge-tts/syllables/cmn-<syllable>.mp3
  chinese-dataset/word-audio/edge-tts/syllables/index.json

Run from the extraction directory:
    .venv/bin/python build_edge_tts_syllables.py
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

REPRESENTATIVE_OVERRIDES = {
    "si1": "思",
    "jiao4": "叫",
    "ai2": "癌",
}

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

    primary = {}
    readers = {}
    character_readings = {}
    for entry in entries:
        text = entry["simp"]
        if not CJK_CHARACTER.match(text):
            continue
        syllable = normalize_syllable(entry.get("pinyinTones"))
        if text not in primary:
            primary[text] = syllable
        if syllable:
            readers.setdefault(syllable, set()).add(text)
            character_readings.setdefault(text, set()).add(syllable)
    return primary, readers, frequencies, character_readings


def representative(syllable, candidates, primary, frequencies, character_readings):
    override = REPRESENTATIVE_OVERRIDES.get(syllable)
    if override:
        if override not in candidates or primary.get(override) != syllable:
            raise ValueError(f"{override!r} is not a character with the primary reading {syllable}.")
        return override

    intended = [text for text in candidates if primary.get(text) == syllable]
    if not intended:
        return None

    unambiguous = [text for text in intended if character_readings.get(text) == {syllable}]
    pool = unambiguous or intended
    return max(pool, key=lambda text: (frequencies.get(text, 0), text))


def main():
    primary, readers, frequencies, character_readings = load_readings()
    voices = {}
    for syllable, texts in sorted(readers.items()):
        voice = representative(syllable, sorted(texts), primary, frequencies, character_readings)
        if voice:
            voices[syllable] = voice

    missing = sorted(set(readers) - set(voices))
    characters = {
        text: syllable
        for text, syllable in sorted(primary.items())
        if syllable in voices
    }
    print(f"{len(voices)} toned syllables with intended-reading characters, {len(missing)} skipped")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(INDEX_PATH, "w", encoding="utf-8") as f:
        json.dump({"voices": voices, "characters": characters}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {INDEX_PATH.relative_to(REPO_ROOT)}")

    for syllable in missing:
        (OUTPUT_DIR / f"cmn-{syllable}.mp3").unlink(missing_ok=True)

    jobs = [(text, OUTPUT_DIR / f"cmn-{syllable}.mp3") for syllable, text in voices.items()]
    counts = asyncio.run(EdgeTtsDataset.generate(jobs, force=True))
    return 1 if counts["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
