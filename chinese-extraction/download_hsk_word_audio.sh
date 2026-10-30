#!/usr/bin/env bash
# Download native Mandarin recordings used by chinese-app.
# Source: https://github.com/hugolpz/audio-cmn (CC BY-SA 4.0).
set -euo pipefail

source_dir="${TMPDIR:-/tmp}/audio-cmn-source"
word_target_dir="chinese/audio-cmn/hsk"
syllable_target_dir="chinese/audio-cmn/syllabs"
source_url="https://github.com/hugolpz/audio-cmn.git"

if [ ! -d "$source_dir/.git" ]; then
  git clone --depth 1 --filter=blob:none --sparse "$source_url" "$source_dir"
fi

# Use 96 kbps HSK words and the only upstream tone-named syllable collection.
git -C "$source_dir" sparse-checkout set --no-cone 96k/hsk 64k/syllabs
git -C "$source_dir" pull --ff-only

mkdir -p "$word_target_dir" "$syllable_target_dir"
rsync -a --exclude '.DS_Store' "$source_dir/96k/hsk/" "$word_target_dir/"
rsync -a --exclude '.DS_Store' "$source_dir/64k/syllabs/" "$syllable_target_dir/"

word_count=$(find "$word_target_dir" -type f -name 'cmn-*.mp3' | wc -l | tr -d ' ')
syllable_count=$(find "$syllable_target_dir" -type f -name 'cmn-*.mp3' | wc -l | tr -d ' ')
printf 'Installed %s native Mandarin HSK word audio files in %s\n' "$word_count" "$word_target_dir"
printf 'Installed %s tone-named Mandarin syllable audio files in %s\n' "$syllable_count" "$syllable_target_dir"
