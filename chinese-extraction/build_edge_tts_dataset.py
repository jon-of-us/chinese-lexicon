"""Generate Edge TTS audio for the most frequent words and characters.

Reads chinese-dataset/frequency/words.json and characters.json, keeps the TOP_N
unique texts by media frequency across both lists, and writes one MP3 per multi-character
text to chinese-dataset/word-audio/edge-tts/words/cmn-<text>.mp3. Single characters are
covered by the syllable audio from build_edge_tts_syllables.py.
Existing non-empty files are skipped, so reruns resume where they stopped.

Run from the repository root:
    .venv/bin/python Chinese-extraction/build_edge_tts_dataset.py
"""

import asyncio
import json
import pathlib
import sys

import edge_tts

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
FREQUENCY_DIR = REPO_ROOT / "chinese-dataset" / "frequency"

VOICE = "zh-CN-YunyangNeural"
OUTPUT_DIR = REPO_ROOT / "chinese-dataset" / "word-audio" / "edge-tts" / "words"
TOP_N = 2000
# Edge TTS can clip the first or last syllable of short inputs, so pad with whitespace.
PADDING = " "
CONCURRENCY = 8
MAX_ATTEMPTS = 3


def load_texts():
    with open(FREQUENCY_DIR / "words.json", encoding="utf-8") as f:
        words = json.load(f)["words"]
    with open(FREQUENCY_DIR / "characters.json", encoding="utf-8") as f:
        characters = json.load(f)["characters"]

    ranked = [(entry["word"], entry["mediaFrequency"]) for entry in words]
    ranked += [(entry["character"], entry["mediaFrequency"]) for entry in characters]
    ranked.sort(key=lambda item: item[1], reverse=True)

    texts = []
    seen = set()
    for text, _ in ranked:
        if text not in seen:
            seen.add(text)
            texts.append(text)
        if len(texts) == TOP_N:
            break
    # Single characters are voiced by build_edge_tts_syllables.py instead.
    return [text for text in texts if len(text) > 1]


async def synthesize(text, path, semaphore):
    if path.exists() and path.stat().st_size > 0:
        return "skipped"

    async with semaphore:
        for attempt in range(1, MAX_ATTEMPTS + 1):
            try:
                communicate = edge_tts.Communicate(f"{PADDING}{text}{PADDING}", VOICE)
                await communicate.save(str(path))
                if path.stat().st_size > 0:
                    return "generated"
                raise RuntimeError("empty audio returned")
            except Exception as error:
                path.unlink(missing_ok=True)
                if attempt == MAX_ATTEMPTS:
                    print(f"FAILED {text}: {error}", file=sys.stderr)
                    return "failed"
                await asyncio.sleep(2 ** attempt)


async def generate(jobs):
    """Synthesize (text, path) pairs with VOICE and return the counts per status."""
    semaphore = asyncio.Semaphore(CONCURRENCY)
    results = await asyncio.gather(*(synthesize(text, path, semaphore) for text, path in jobs))

    counts = {status: results.count(status) for status in ("generated", "skipped", "failed")}
    print(f"generated {counts['generated']}, skipped {counts['skipped']}, failed {counts['failed']}")
    return counts


async def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    texts = load_texts()
    print(f"{len(texts)} unique texts with {VOICE} -> {OUTPUT_DIR.relative_to(REPO_ROOT)}")

    jobs = [(text, OUTPUT_DIR / f"cmn-{text}.mp3") for text in texts]
    counts = await generate(jobs)
    return 1 if counts["failed"] else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
