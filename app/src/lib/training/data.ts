import frequencyWordFile from '../../../../chinese-dataset/frequency/words.json';
import frequencyCharacterFile from '../../../../chinese-dataset/frequency/characters.json';
import { config } from '../config';
import type { FrequencyCharacter, FrequencyWord, Sentence } from './types';

export const frequencyWords = frequencyWordFile.words as FrequencyWord[];
export const frequencyCharacters = frequencyCharacterFile.characters as FrequencyCharacter[];

// A sentence set is identified by its folder name, so each record takes that name as its source.
function tagSentences(source: string, records: Omit<Sentence, 'source'>[]): Sentence[] {
  return records.map((sentence) => ({ ...sentence, source }));
}

// Sets are globbed rather than imported: gitignored sets are absent in a fresh clone and are skipped.
// The order is fixed because selectSentence takes the first unseen sentence.
const sentenceSetOrder = ['hsk-sentences-audio', 'tatoeba-nc', 'tatoeba-unlicensed', 'anki-tatoeba'];
const sentenceSetFiles = import.meta.glob<{ sentences: Omit<Sentence, 'source'>[] }>(
  '../../../../chinese-dataset/sentences/*/sentences.json',
  { eager: true, import: 'default' },
);
const allSentences = sentenceSetOrder.flatMap((source) => {
  const file = sentenceSetFiles[`../../../../chinese-dataset/sentences/${source}/sentences.json`];
  return file ? tagSentences(source, file.sentences) : [];
});
const enabledSentenceSources = new Set<string>(config.training.sentenceSources);
export const sentences = allSentences.filter((sentence) => enabledSentenceSources.has(sentence.source));
export const wordIndex = new Map(frequencyWords.map((entry) => [entry.word, entry.index]));
export const characterIndex = new Map(frequencyCharacters.map((entry) => [entry.character, entry.index]));
