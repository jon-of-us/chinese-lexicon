import edgeTtsSyllableIndex from '../../../chinese-dataset/word-audio/edge-tts/syllables/index.json';

const edgeTtsWordModules = import.meta.glob('../../../chinese-dataset/word-audio/edge-tts/words/*.mp3', {
  import: 'default',
  query: '?url',
}) as Record<string, () => Promise<string>>;

const edgeTtsWordPrefix = '../../../chinese-dataset/word-audio/edge-tts/words/cmn-';

const edgeTtsSyllableModules = import.meta.glob('../../../chinese-dataset/word-audio/edge-tts/syllables/*.mp3', {
  import: 'default',
  query: '?url',
}) as Record<string, () => Promise<string>>;

const edgeTtsSyllablePrefix = '../../../chinese-dataset/word-audio/edge-tts/syllables/cmn-';

const characterSyllables = new Map<string, string>(Object.entries(edgeTtsSyllableIndex.characters));

const sentenceAudioModules = import.meta.glob('../../../chinese-dataset/sentences/**/*.mp3', {
  import: 'default',
  query: '?url',
}) as Record<string, () => Promise<string>>;

// A word's own recording is used when it exists. Otherwise the character's
// primary syllable is voiced by another character with the same reading.
export async function getPronunciationAudio(text: string) {
  const own = edgeTtsWordModules[`${edgeTtsWordPrefix}${text}.mp3`];
  if (own) return own();
  const syllable = characterSyllables.get(text);
  return syllable ? edgeTtsSyllableModules[`${edgeTtsSyllablePrefix}${syllable}.mp3`]?.() : undefined;
}

export async function sentenceAudio(source: string, path: string) {
  return sentenceAudioModules[`../../../chinese-dataset/sentences/${source}/${path}`]?.();
}
