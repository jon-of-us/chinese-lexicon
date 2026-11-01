"""Generate Edge TTS audio for multi-character words in the top media words or HSK 1-4.

Ranks words by movieWordRank in chinese-dataset/dictionary/entries.json, the same rule as
build_media_frequency_lists.mjs, keeps the MEDIA_TOP_N best-ranked words, and takes the union
with the HSK 1-4 word lists in chinese/dong-chinese/statistics/hsk.js. Writes one MP3 per multi-character word to
chinese-dataset/word-audio/edge-tts/words/cmn-<text>.mp3. Single characters are covered by
the syllable audio from build_edge_tts_syllables.py.
Existing non-empty files are skipped, so reruns resume where they stopped.

Run from the repository root:
    chinese-extraction/.venv/bin/python chinese-extraction/build_edge_tts_dataset.py
"""

import asyncio
import json
import pathlib
import sys

import edge_tts

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
DICTIONARY_FILE = REPO_ROOT / "chinese-dataset" / "dictionary" / "entries.json"
HSK_FILE = REPO_ROOT / "chinese" / "dong-chinese" / "statistics" / "hsk.js"

VOICE = "zh-CN-YunyangNeural"
OUTPUT_DIR = REPO_ROOT / "chinese-dataset" / "word-audio" / "edge-tts" / "words"
MEDIA_TOP_N = 2500
HSK_LEVELS = 4
# Edge TTS can clip the first or last syllable of short inputs, so pad with whitespace.
PADDING = " "
CONCURRENCY = 8
MAX_ATTEMPTS = 3


def load_hsk_words():
    with open(HSK_FILE, encoding="utf-8") as f:
        source = f.read()
    start = source.index("let hsk = ") + len("let hsk = ")
    end = source.index("\n];", start) + len("\n]")
    levels = json.loads(source[start:end])
    return {word for level in levels[:HSK_LEVELS] for word in level}


def load_texts():
    with open(DICTIONARY_FILE, encoding="utf-8") as f:
        entries = json.load(f)["entries"]

    best_rank = {}
    for entry in entries:
        statistics = entry.get("statistics") or {}
        word = entry.get("simp")
        if not word:
            continue

        rank = statistics.get("movieWordRank")
        count = statistics.get("movieWordCount")
        if not rank or not count:
            continue
        definitions = [d for d in entry.get("definitions", []) if not d.startswith("CL:")]
        if not definitions or not definitions[0]:
            continue
        current = best_rank.get(word)
        if current is None or rank < current[0] or (rank == current[0] and count > current[1]):
            best_rank[word] = (rank, count)

    ranked = sorted(best_rank, key=lambda word: (best_rank[word][0], -best_rank[word][1], word))
    selected = set(ranked[:MEDIA_TOP_N]) | load_hsk_words()
    # Single characters are voiced by build_edge_tts_syllables.py instead.
    return sorted(word for word in selected if len(word) > 1)


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
