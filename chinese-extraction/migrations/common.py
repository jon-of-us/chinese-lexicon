"""Shared schema, filesystem, and reporting helpers for sentence migrations."""

from __future__ import annotations

import json
import os
import re
import shutil
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

EXTRACTION_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = EXTRACTION_ROOT.parent
DEFAULT_OUTPUT_ROOT = REPOSITORY_ROOT / "chinese"
SEGMENTER_NAME = "spacy-pkuseg"
SEGMENTER_VERSION = "1.0.1"
CEDICT_FILE = REPOSITORY_ROOT / "chinese" / "dong-chinese" / "dictionary" / "cedict.js"
ENGLISH_WORDS = re.compile(r"[a-z]+")
CEDICT_ENTRY = re.compile(r"^\S+\s+(\S+)\s+\[[^]]*\]\s+/(.+)/$")
ENGLISH_TOKEN = re.compile(r"[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)?|[^\w\s]")
PUNCTUATION = re.compile(r"^[^\w\s]+$", re.UNICODE)
ENGLISH_STOP_WORDS = {"a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for", "from", "have", "i", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "was", "we", "with", "you"}


@dataclass
class MigrationReport:
    source: str
    records_read: int = 0
    converted: int = 0
    skipped: dict[str, int] = field(default_factory=dict)
    output: dict[str, Any] = field(default_factory=dict)

    def skip(self, reason: str) -> None:
        self.skipped[reason] = self.skipped.get(reason, 0) + 1

    def as_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "records_read": self.records_read,
            "converted": self.converted,
            "skipped": dict(sorted(self.skipped.items())),
            "output": self.output,
        }


class WordSegmenter:
    """Lazy PKUSeg wrapper so source-provided splits do not need the dependency."""

    def __init__(self) -> None:
        self._segmenter: Any | None = None

    def split(self, text: str) -> list[str]:
        if self._segmenter is None:
            try:
                # Keep the downloaded model in the extraction workspace rather than ~/.pkuseg.
                os.environ.setdefault("PKUSEG_HOME", str(EXTRACTION_ROOT / ".pkuseg"))
                import spacy_pkuseg
            except ImportError as error:
                raise RuntimeError(
                    "Generated word splits require spacy-pkuseg. Install with "
                    "python3 -m pip install -r chinese-extraction/requirements.txt"
                ) from error
            self._segmenter = spacy_pkuseg.pkuseg()
        return [token for token in self._segmenter.cut(text) if token.strip()]


class WordTranslator:
    """Choose compact CC-CEDICT glosses, using the sentence English as context.

    The lexicon is loaded once per migration. This avoids network or model calls
    while allowing e.g. a translated English word to select a later CEDICT sense
    when it is a better match than the default first sense.
    """

    def __init__(self) -> None:
        self._definitions = self._load_definitions()

    @staticmethod
    def _load_definitions() -> dict[str, list[str]]:
        entries: dict[str, list[str]] = {}
        for line in CEDICT_FILE.read_text(encoding="utf-8").splitlines():
            match = CEDICT_ENTRY.match(line)
            if not match:
                continue
            word, definitions = match.groups()
            values = [value.strip() for value in definitions.split("/") if value.strip()]
            if values:
                entries.setdefault(word, []).extend(values)
        return entries

    def translate(self, tokens: list[str], sentence_translation: str) -> list[str]:
        context = set(ENGLISH_WORDS.findall(sentence_translation.lower()))
        return [self._translate_token(token, context) for token in tokens]

    def _translate_token(self, token: str, context: set[str]) -> str:
        definitions = self._definitions.get(token, [])
        if not definitions:
            return ""
        # Prefer a non-classifier sense whose English words occur in the supplied
        # sentence translation; retain CEDICT's ordering when nothing matches.
        candidates = [value for value in definitions if not value.startswith("CL:")] or definitions
        return max(
            enumerate(candidates),
            key=lambda item: (len(context.intersection(ENGLISH_WORDS.findall(item[1].lower()))), -item[0]),
        )[1]


class ContextualWordTranslator:
    """A small IBM Model 1 aligner trained on the supplied sentence pairs.

    It is intentionally used only when it is confident. This makes the model a
    contextual improvement over a dictionary lookup, rather than a source of
    speculative glosses for particles and paraphrases.
    """

    def translate_batch(self, sentences: list[tuple[list[str], str]]) -> list[list[tuple[str, int | None]]]:
        pairs = [(tokens, ENGLISH_TOKEN.findall(translation)) for tokens, translation in sentences]
        vocabulary: dict[str, set[str]] = {}
        for tokens, english_tokens in pairs:
            content = {word.lower() for word in english_tokens if word.isalnum() and word.lower() not in ENGLISH_STOP_WORDS}
            for token in tokens:
                if not PUNCTUATION.fullmatch(token):
                    vocabulary.setdefault(token, set()).update(content)
        probabilities = {
            token: {word: 1 / len(words) for word in words}
            for token, words in vocabulary.items() if words
        }
        for _ in range(8):
            counts: dict[str, dict[str, float]] = {}
            totals: dict[str, float] = {}
            for tokens, english_tokens in pairs:
                source = [token for token in tokens if token in probabilities]
                for word in {value.lower() for value in english_tokens if value.isalnum() and value.lower() not in ENGLISH_STOP_WORDS}:
                    normalization = sum(probabilities[token].get(word, 0) for token in source)
                    if not normalization:
                        continue
                    for token in source:
                        value = probabilities[token].get(word, 0) / normalization
                        counts.setdefault(token, {})[word] = counts.setdefault(token, {}).get(word, 0) + value
                        totals[token] = totals.get(token, 0) + value
            probabilities = {
                token: {word: value / totals[token] for word, value in words.items()}
                for token, words in counts.items() if totals.get(token)
            }
        results = []
        for tokens, english_tokens in pairs:
            candidates = [
                index for index, word in enumerate(english_tokens)
                if word.isalnum() and word.lower() not in ENGLISH_STOP_WORDS
            ]
            words = []
            for token in tokens:
                if PUNCTUATION.fullmatch(token):
                    words.append((token, None))
                    continue
                scores = probabilities.get(token, {})
                best = max(candidates, key=lambda index: scores.get(english_tokens[index].lower(), 0), default=None)
                if best is not None and scores.get(english_tokens[best].lower(), 0) >= .35:
                    words.append((english_tokens[best], best))
                else:
                    words.append(("", None))
            results.append(words)
        return results


def word_translations(
    tokens: list[str], sentence_translation: str, translator: WordTranslator,
    source_glosses: list[str] | None = None,
) -> list[str]:
    """Return one ordered gloss per token; source glosses take precedence."""
    generated = translator.translate(tokens, sentence_translation)
    if source_glosses is None:
        return generated
    return [source_gloss.strip() or generated[index] for index, source_gloss in enumerate(source_glosses)]


def enrich_word_translations(sentences: list[dict[str, Any]], report: MigrationReport) -> list[dict[str, Any]]:
    """Add strict ordered token glosses, excluding records that cannot be glossed."""
    dictionary = WordTranslator()
    for sentence in sentences:
        if "words" in sentence["translation"]:
            sentence["translation"]["alignment"] = [None] * len(sentence["translation"]["words"])
    pending = [sentence for sentence in sentences if "words" not in sentence["translation"]]
    contextual = ContextualWordTranslator().translate_batch([
        (sentence["word_split"]["tokens"], sentence["translation"]["text"])
        for sentence in pending
    ])
    for sentence, aligned_words in zip(pending, contextual):
        tokens = sentence["word_split"]["tokens"]
        fallback_words = dictionary.translate(tokens, sentence["translation"]["text"])
        sentence["translation"]["words"] = [
            aligned_word or fallback_word or (token if PUNCTUATION.fullmatch(token) else "")
            for token, (aligned_word, _), fallback_word in zip(tokens, aligned_words, fallback_words)
        ]
        sentence["translation"]["alignment"] = [index for _, index in aligned_words]
    accepted = []
    for sentence in sentences:
        words = sentence["translation"]["words"]
        tokens = sentence["word_split"]["tokens"]
        alignment = sentence["translation"]["alignment"]
        if len(words) != len(tokens) or len(alignment) != len(tokens) or any(not word.strip() for word in words):
            report.skip("missing_word_translation")
            report.converted -= 1
            continue
        accepted.append(sentence)
    return accepted


def provided_word_split(tokens: list[str], source_field: str) -> dict[str, Any]:
    return {
        "tokens": tokens,
        "metadata": {"origin": "provided", "source_field": source_field},
    }


def generated_word_split(text: str, segmenter: WordSegmenter) -> dict[str, Any]:
    return {
        "tokens": segmenter.split(text),
        "metadata": {
            "origin": "generated",
            "tool": SEGMENTER_NAME,
            "tool_version": SEGMENTER_VERSION,
        },
    }


def audio(destination_root: Path, source: str, filename: str) -> dict[str, str]:
    suffix = Path(filename).suffix.removeprefix(".").lower()
    return {
        "path": (Path("sentence-audio") / source / filename).as_posix(),
        "format": suffix,
    }


def copy_audio(source: Path, destination_root: Path, source_name: str, filename: str) -> None:
    destination = destination_root / "sentence-audio" / source_name / filename
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def write_output(destination_root: Path, source: str, sentences: list[dict[str, Any]], report: MigrationReport) -> None:
    sentences = enrich_word_translations(sentences, report)
    sentences_dir = destination_root / "sentences"
    reports_dir = EXTRACTION_ROOT / "migration-reports"
    sentences_dir.mkdir(parents=True, exist_ok=True)
    reports_dir.mkdir(parents=True, exist_ok=True)
    json_output = sentences_dir / f"{source}.json"
    json_output.write_text(
        json.dumps(sentences, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    # Audio is copied before enrich_word_translations drops records, so remove copies
    # that no exported record references.
    audio_files = [destination_root / sentence["audio"]["path"] for sentence in sentences]
    audio_dir = destination_root / "sentence-audio" / source
    referenced = {path.resolve() for path in audio_files}
    if audio_dir.is_dir():
        for stale in audio_dir.iterdir():
            if stale.resolve() not in referenced:
                stale.unlink()
    split_counts = {"provided": 0, "generated": 0}
    for sentence in sentences:
        origin = sentence["word_split"]["metadata"]["origin"]
        split_counts[origin] = split_counts.get(origin, 0) + 1
    report.output = {
        "json": file_size(json_output),
        "audio": {
            "files": len(audio_files),
            **size_summary(sum(path.stat().st_size for path in audio_files)),
        },
        "word_splits": split_counts,
    }
    (reports_dir / f"{source}.json").write_text(
        json.dumps(report.as_dict(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def size_summary(byte_count: int) -> dict[str, int | float]:
    """Use decimal megabytes so reported values match common disk-size displays."""
    return {"bytes": byte_count, "megabytes": round(byte_count / 1_000_000, 3)}


def file_size(path: Path) -> dict[str, int | float]:
    return size_summary(path.stat().st_size)


def plain_text(html: str) -> str:
    """Extract a human-readable translation from the simple Anki HTML fields."""
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()
