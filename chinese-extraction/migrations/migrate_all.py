"""Build all source-specific sentence exports into chinese/."""

from __future__ import annotations

from migrate_anki_tatoeba import migrate as migrate_anki_tatoeba
from migrate_hsk_sentences_audio import migrate as migrate_hsk_sentences_audio
from migrate_tatoeba import migrate as migrate_tatoeba


if __name__ == "__main__":
    reports = [migrate_hsk_sentences_audio(), migrate_tatoeba(), migrate_anki_tatoeba()]
    for report in reports:
        print(f"{report.source}: converted={report.converted}, skipped={sum(report.skipped.values())}")
