"""Migrate HSK Sentences Audio without modifying its source checkout."""

from __future__ import annotations

import json
from pathlib import Path

from common import DEFAULT_OUTPUT_ROOT, EXTRACTION_ROOT, MigrationReport, WordTranslator, audio, copy_audio, provided_word_split, word_translations, write_output

SOURCE = "hsk-sentences-audio"
DATA_FILE = EXTRACTION_ROOT / SOURCE / "data" / "train.jsonl"
AUDIO_DIR = EXTRACTION_ROOT / SOURCE / "audio"


def migrate(destination_root: Path = DEFAULT_OUTPUT_ROOT) -> MigrationReport:
    report = MigrationReport(SOURCE)
    translator = WordTranslator()
    sentences = []
    # The export is JSON Lines (one object per line); raw_decode also handles concatenated objects.
    contents = DATA_FILE.read_text(encoding="utf-8")
    decoder = json.JSONDecoder()
    offset = 0
    while offset < len(contents):
        while offset < len(contents) and contents[offset].isspace():
            offset += 1
        if offset >= len(contents):
            break
        report.records_read += 1
        record, offset = decoder.raw_decode(contents, offset)
        filename = record.get("audio", {}).get("normal")
        if not filename:
            report.skip("missing_audio_reference")
            continue
        source_audio = EXTRACTION_ROOT / SOURCE / filename
        if not source_audio.is_file():
            report.skip("missing_audio_file")
            continue
        transcription = record.get("chinese", "").strip()
        translation = record.get("translation", {}).get("en", "").strip()
        source_token_records = [token for token in record.get("tokens", []) if token.get("word")]
        source_tokens = [token["word"] for token in source_token_records]
        source_glosses = [token.get("gloss_en", "") for token in source_token_records]
        if not transcription:
            report.skip("missing_transcription")
            continue
        if not translation:
            report.skip("missing_translation")
            continue
        if not source_tokens:
            report.skip("missing_word_split")
            continue
        output_filename = Path(filename).name
        copy_audio(source_audio, destination_root, SOURCE, output_filename)
        sentence = {
            "id": f"{SOURCE}:{record['id']}",
            "source": SOURCE,
            "audio": audio(destination_root, SOURCE, output_filename),
            "transcription": transcription,
            "translation": {"language": "en", "text": translation, "words": word_translations(source_tokens, translation, translator, source_glosses)},
            "word_split": provided_word_split(source_tokens, "tokens[].word"),
            "pinyin": record.get("pinyin"),
            "source_metadata": {"original_id": record["id"], "hsk_level": record.get("hsk_level")},
        }
        sentences.append({key: value for key, value in sentence.items() if value is not None})
        report.converted += 1
    write_output(destination_root, SOURCE, sentences, report)
    return report


if __name__ == "__main__":
    print(migrate().as_dict())
