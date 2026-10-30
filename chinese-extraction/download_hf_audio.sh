#!/usr/bin/env bash
# Resumable Hugging Face Git-LFS audio downloader.
set -uo pipefail

audio_dir="chinese-extraction/hsk-sentences-audio/audio"
base_url="https://huggingface.co/datasets/no7z/hsk-sentences-audio/resolve/main/audio"
log_file="${audio_dir}/download.log"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$log_file"
}

log "Starting/resuming Hugging Face audio download."

while :; do
  downloaded=0
  failed=0
  pending=0

  while IFS= read -r -d '' path; do
    if head -n 1 "$path" | grep -qx 'version https://git-lfs.github.com/spec/v1'; then
      pending=$((pending + 1))
      name=${path##*/}
      temporary_path="${path}.download"
      log "Downloading $name (pending: $pending)"
      if curl -fsSL --retry 20 --retry-all-errors --retry-delay 30 \
        -o "$temporary_path" "$base_url/$name"; then
        mv "$temporary_path" "$path"
        downloaded=$((downloaded + 1))
        log "OK $name (downloaded this pass: $downloaded)"
      else
        rm -f "$temporary_path"
        failed=$((failed + 1))
        log "FAILED $name (failed this pass: $failed)"
      fi
      sleep 4
    fi
  done < <(find "$audio_dir" -type f -name '*.mp3' -print0)

  log "Pass complete: pending at start=$pending, downloaded=$downloaded, failed=$failed"
  if [ "$pending" -eq 0 ]; then
    log 'All audio files are playable MP3s.'
    break
  fi
  if [ "$downloaded" -eq 0 ]; then
    log 'No downloads succeeded in this pass; retrying in five minutes.'
    sleep 300
  fi
done
