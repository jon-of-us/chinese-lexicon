import frequencyWordFile from '../../../../chinese-dataset/frequency/words.json';
import frequencyCharacterFile from '../../../../chinese-dataset/frequency/characters.json';
import hskSentenceFile from '../../../../chinese-dataset/sentences/hsk-sentences-audio/sentences.json';
import tatoebaNcFile from '../../../../chinese-dataset/sentences/tatoeba-nc/sentences.json';
import tatoebaUnlicensedFile from '../../../../chinese-dataset/sentences/tatoeba-unlicensed/sentences.json';
import ankiTatoebaFile from '../../../../chinese-dataset/sentences/anki-tatoeba/sentences.json';
import { config } from '../config';
import type { FrequencyCharacter, FrequencyWord, Sentence } from './types';

export const frequencyWords = frequencyWordFile.words as FrequencyWord[];
export const frequencyCharacters = frequencyCharacterFile.characters as FrequencyCharacter[];

// A sentence set is identified by its folder name, so each record takes that name as its source.
function tagSentences(source: string, records: Omit<Sentence, 'source'>[]): Sentence[] {
  return records.map((sentence) => ({ ...sentence, source }));
}

const allSentences = [
  ...tagSentences('hsk-sentences-audio', hskSentenceFile.sentences as Omit<Sentence, 'source'>[]),
  ...tagSentences('tatoeba-nc', tatoebaNcFile.sentences as Omit<Sentence, 'source'>[]),
  ...tagSentences('tatoeba-unlicensed', tatoebaUnlicensedFile.sentences as Omit<Sentence, 'source'>[]),
  ...tagSentences('anki-tatoeba', ankiTatoebaFile.sentences as Omit<Sentence, 'source'>[]),
];
const enabledSentenceSources = new Set<string>(config.training.sentenceSources);
export const sentences = allSentences.filter((sentence) => enabledSentenceSources.has(sentence.source));
export const wordIndex = new Map(frequencyWords.map((entry) => [entry.word, entry.index]));
export const characterIndex = new Map(frequencyCharacters.map((entry) => [entry.character, entry.index]));
