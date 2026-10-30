"""Migrate the unpacked Anki Tatoeba deck without modifying its SQLite database."""

from __future__ import annotations

import re
import sqlite3
from pathlib import Path

from common import DEFAULT_OUTPUT_ROOT, EXTRACTION_ROOT, MigrationReport, WordSegmenter, audio, copy_audio, generated_word_split, plain_text, write_output

SOURCE = "anki-tatoeba"
SOURCE_DIR = EXTRACTION_ROOT / "anki" / "all_mandarin_tatoeba"
SOUND_PATTERN = re.compile(r"\[sound:([^\]]+)\]")


def migrate(destination_root: Path = DEFAULT_OUTPUT_ROOT) -> MigrationReport:
    report = MigrationReport(SOURCE)
    segmenter = WordSegmenter()
    sentences = []
    database = sqlite3.connect(f"file:{SOURCE_DIR / 'collection.anki2'}?mode=ro", uri=True)
    try:
        for note_id, fields in database.execute("SELECT id, flds FROM notes"):
            report.records_read += 1
            values = fields.split("\x1f")
            if len(values) < 7:
                report.skip("invalid_note_fields")
                continue
            sentence_id, transcription, audio_field = values[0], values[1].strip(), values[2]
            match = SOUND_PATTERN.search(audio_field)
            if not match:
                report.skip("missing_audio_reference")
                continue
            filename = match.group(1)
            source_audio = SOURCE_DIR / "media" / filename
            if not source_audio.is_file():
                report.skip("missing_audio_file")
                continue
            translation = plain_text(values[6])
            if not transcription:
                report.skip("missing_transcription")
                continue
            if not translation:
                report.skip("missing_translation")
                continue
            copy_audio(source_audio, destination_root, SOURCE, filename)
            split = generated_word_split(transcription, segmenter)
            sentences.append({
                "id": f"{SOURCE}:{sentence_id}",
                "source": SOURCE,
                "audio": audio(destination_root, SOURCE, filename),
                "transcription": transcription,
                "translation": {"language": "en", "text": translation},
                "word_split": split,
                "source_metadata": {"original_id": sentence_id, "anki_note_id": note_id},
            })
            report.converted += 1
    finally:
        database.close()
    write_output(destination_root, SOURCE, sentences, report)
    return report


if __name__ == "__main__":
    print(migrate().as_dict())
