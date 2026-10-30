import * as Dictionary from './dictionary';

const audioModules = import.meta.glob('../../../chinese-dataset/word-audio/hsk-words/*.mp3', {
  import: 'default',
  query: '?url',
}) as Record<string, () => Promise<string>>;
const syllableAudioModules = import.meta.glob('../../../chinese-dataset/word-audio/syllables/*.mp3', {
  import: 'default',
  query: '?url',
}) as Record<string, () => Promise<string>>;

const audioPrefix = '../../../chinese-dataset/word-audio/hsk-words/cmn-';
const syllableAudioPrefix = '../../../chinese-dataset/word-audio/syllables/cmn-';
const sentenceAudioModules = import.meta.glob('../../../chinese-dataset/sentences/**/*.mp3', {
  import: 'default',
  query: '?url',
}) as Record<string, () => Promise<string>>;

const numberedPinyin = new Map([
  ['ā', 'a1'], ['á', 'a2'], ['ǎ', 'a3'], ['à', 'a4'],
  ['ē', 'e1'], ['é', 'e2'], ['ě', 'e3'], ['è', 'e4'],
  ['ī', 'i1'], ['í', 'i2'], ['ǐ', 'i3'], ['ì', 'i4'],
  ['ō', 'o1'], ['ó', 'o2'], ['ǒ', 'o3'], ['ò', 'o4'],
  ['ū', 'u1'], ['ú', 'u2'], ['ǔ', 'u3'], ['ù', 'u4'],
  ['ǖ', 'v1'], ['ǘ', 'v2'], ['ǚ', 'v3'], ['ǜ', 'v4'],
]);

function syllableFilename(pinyin: string) {
  const reading = pinyin.trim().toLowerCase().replace(/u:/g, 'v').replace(/ü/g, 'v');
  if (!reading || /\s/.test(reading)) return undefined;
  let tone = '';
  let syllable = '';
  for (const character of reading) {
    const replacement = numberedPinyin.get(character);
    if (replacement) {
      syllable += replacement[0];
      tone = replacement[1];
    } else if (/^[1-5]$/.test(character)) {
      tone = character === '5' ? '1' : character;
    } else {
      syllable += character;
    }
  }
  return syllable ? `${syllable}${tone || '1'}` : undefined;
}

type PronunciationTarget =
  | { kind: 'character'; text: string; pinyin: string }
  | { kind: 'word'; text: string };

function hasMultiplePronunciations(text: string) {
  return new Set(Dictionary.getEntries(text).map((entry: { pinyin?: string }) => entry.pinyin).filter(Boolean)).size > 1;
}

export async function getPronunciationAudio(target: PronunciationTarget) {
  if (target.kind === 'character' && hasMultiplePronunciations(target.text)) {
    const filename = syllableFilename(target.pinyin);
    return filename ? syllableAudioModules[`${syllableAudioPrefix}${filename}.mp3`]?.() : undefined;
  }
  return audioModules[`${audioPrefix}${target.text}.mp3`]?.();
}

export function pronunciationTarget(text: string, pinyin?: string): PronunciationTarget {
  return Array.from(text).length === 1 && pinyin
    ? { kind: 'character', text, pinyin }
    : { kind: 'word', text };
}

export async function sentenceAudio(source: string, path: string) {
  return sentenceAudioModules[`../../../chinese-dataset/sentences/${source}/${path}`]?.();
}
