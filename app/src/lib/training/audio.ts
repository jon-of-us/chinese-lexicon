const sentenceAudioModules = import.meta.glob('../../../../chinese-dataset/sentences/**/*.mp3', {
  import: 'default',
  query: '?url',
}) as Record<string, () => Promise<string>>;

export async function sentenceAudio(source: string, path: string) {
  return sentenceAudioModules[`../../../../chinese-dataset/sentences/${source}/${path}`]?.();
}
