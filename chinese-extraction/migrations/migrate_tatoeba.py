"""Migrate the filtered Tatoeba TSV without modifying its raw exports."""

from __future__ import annotations

import csv
from pathlib import Path

from common import DEFAULT_OUTPUT_ROOT, EXTRACTION_ROOT, MigrationReport, WordSegmenter, audio, copy_audio, generated_word_split, write_output

SOURCE = "tatoeba-hsk1-3"
SOURCE_DIR = EXTRACTION_ROOT / "tatoeba"


def migrate(destination_root: Path = DEFAULT_OUTPUT_ROOT) -> MigrationReport:
    report = MigrationReport(SOURCE)
    segmenter = WordSegmenter()
    sentences = []
    with (SOURCE_DIR / "hsk1-3_cmn_eng_audio.tsv").open(encoding="utf-8", newline="") as file:
        for record in csv.DictReader(file, delimiter="\t"):
            report.records_read += 1
            sentence_id = record["sentence_id"]
            # Downloaded filenames use Tatoeba's audio ID, not sentence ID.
            filename = f"{record['audio_id']}.mp3"
            source_audio = SOURCE_DIR / "audio" / filename
            if not source_audio.is_file():
                report.skip("missing_audio_file")
                continue
            transcription = record["chinese"].strip()
            translation = record["english"].strip()
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
                "source_metadata": {
                    "original_id": sentence_id,
                    "hsk_level": int(record["hsk_level"]),
                    "english_sentence_id": record["english_id"],
                    "audio_id": record["audio_id"],
                    "audio_license": record["audio_license"] or None,
                    "audio_user": record["audio_user"] or None,
                    "audio_attribution_url": record["audio_attribution_url"] or None,
                },
            })
            report.converted += 1
    write_output(destination_root, SOURCE, sentences, report)
    return report


if __name__ == "__main__":
    print(migrate().as_dict())
