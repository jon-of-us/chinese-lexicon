import dictionaryEntriesFile from '../../../chinese-dataset/dictionary/entries.json';
import dictionaryIndexFile from '../../../chinese-dataset/dictionary/index.json';
import etymologyFile from '../../../chinese-dataset/dictionary/etymology.json';
import characterOrderFile from '../../../chinese-dataset/frequency/character-order.json';
import frequencyCharacterFile from '../../../chinese-dataset/frequency/characters.json';
import * as DictionarySearch from './dictionary-search';
import type * as Settings from './settings';
import type * as Ranking from './ranking';

type Statistics = { bookWordRank?: number; movieWordRank?: number; bookCharCount?: number; bookCharRank?: number; movieCharCount?: number; movieCharRank?: number; hskLevel?: number };
type LexiconEntry = DictionarySearch.SearchEntry & { statistics?: Statistics };
type MediaCharacter = { character: string; mediaFrequency: number; bestMediaRank?: number };
const allEntries = dictionaryEntriesFile.entries as LexiconEntry[];
const characterOrder: string[] = characterOrderFile.characters;
const mediaCharacters = frequencyCharacterFile.characters as MediaCharacter[];
const simpPositions: Record<string, number[]> = dictionaryIndexFile.simp;
const tradPositions: Record<string, number[]> = dictionaryIndexFile.trad;
const etymologyByCharacter = new Map(etymologyFile.characters.map((etymology) => [etymology.character, etymology]));
const mediaFrequencyByCharacter = new Map(mediaCharacters.map(({ character, mediaFrequency }) => [character, mediaFrequency]));
const mediaRankByCharacter = new Map(mediaCharacters.map(({ character, bestMediaRank }) => [character, bestMediaRank]));

export function getEntries(word: string) {
  return (simpPositions[word] ?? tradPositions[word] ?? []).map((position) => allEntries[position]);
}

export function getEtymology(character: string) {
  return etymologyByCharacter.get(character);
}

export function search(term: string, limit = 100) {
  return DictionarySearch.searchEntries(allEntries, term, limit);
}

type FrequencyScores = { books?: number; media?: number };
const characterRanks = new Map<string, FrequencyScores>();
const wordRanks = new Map<string, FrequencyScores>();
const bookCharacterFrequencies = new Map<string, number>();
const characterHskLevels = new Map<string, number>();
const componentForms = new Map<string, Set<string>>();
const componentOriginals = new Map<string, string>();
const dongRanks = new Map(characterOrder.map((character, index) => [character, index + 1]));

export type ComponentCharacter = {
  character: string;
  pinyin: string;
  definition: string;
  bookFrequency?: number;
  bookRank?: number;
  mediaFrequency?: number;
  mediaRank?: number;
  hskLevel?: number;
  dongRank?: number;
};
export type ComponentDetails = {
  component: string;
  pinyin: string;
  definition: string;
  variant: string;
  meaning: ComponentCharacter[];
  sound: ComponentCharacter[];
  other: ComponentCharacter[];
};
export type OverviewComponent = { component: string; rank: number; frequency?: number; level?: number };
type ComponentUseMaps = { meaning: Map<string, ComponentCharacter>; sound: Map<string, ComponentCharacter>; other: Map<string, ComponentCharacter> };
const componentUses = new Map<string, ComponentUseMaps>();
const seenComponentCharacters = new Set<string>();
const componentOverviewCache = new Map<Settings.DictionaryOrder, OverviewComponent[]>();
const componentRankCache = new Map<Settings.DictionaryOrder, Map<string, number>>();

function isSingleHan(text: string) {
  return /^\p{Script=Han}$/u.test(text);
}

function getComponentUseMaps(component: string) {
  let uses = componentUses.get(component);
  if (!uses) {
    uses = { meaning: new Map(), sound: new Map(), other: new Map() };
    componentUses.set(component, uses);
  }
  return uses;
}

function addComponentUse(component: string, type: string, character: ComponentCharacter) {
  if (!isSingleHan(component)) return;
  const uses = getComponentUseMaps(component);
  const category = type === 'meaning' || type === 'sound' ? type : 'other';
  uses[category].set(character.character, character);
}

for (const entry of allEntries) {
  if (Array.from(entry.simp).length !== 1) continue;
  const character = entry.simp;
  if (!isSingleHan(character) || seenComponentCharacters.has(character)) continue;
  seenComponentCharacters.add(character);
  const etymology = getEtymology(character);
  if (!etymology) continue;
  const characterEntry = (getEntries(character) as LexiconEntry[])[0] ?? entry;
  const statistics = characterEntry.statistics;
  const characterInfo: ComponentCharacter = {
    character,
    pinyin: characterEntry.pinyin ?? etymology.pinyin ?? '',
    definition: etymology.definition ?? characterEntry.definitions[0] ?? 'Character',
    bookFrequency: statistics?.bookCharCount,
    bookRank: statistics?.bookCharRank,
    mediaFrequency: statistics?.movieCharCount ?? mediaFrequencyByCharacter.get(character),
    mediaRank: statistics?.movieCharRank ?? mediaRankByCharacter.get(character),
    hskLevel: statistics?.hskLevel,
    dongRank: dongRanks.get(character),
  };
  for (const part of etymology.components ?? []) {
    addComponentUse(part.char, part.type, characterInfo);
  }
}

function bestRank(current?: number, candidate?: number) {
  if (!candidate) return current;
  return !current || candidate < current ? candidate : current;
}

function updateScores(store: Map<string, FrequencyScores>, text: string, scores: FrequencyScores) {
  const current = store.get(text) ?? {};
  store.set(text, {
    books: bestRank(current.books, scores.books),
    media: bestRank(current.media, scores.media),
  });
}

// One complete pass: each word contributes its best rank to every character it contains.
// Repeated dictionary entries (for example, alternate readings) are merged by their best rank.
for (const entry of allEntries) {
  const scores = { books: entry.statistics?.bookWordRank, media: entry.statistics?.movieWordRank };
  updateScores(wordRanks, entry.simp, scores);
  updateScores(wordRanks, entry.trad, scores);
  for (const character of new Set([...Array.from(entry.simp), ...Array.from(entry.trad)])) {
    updateScores(characterRanks, character, scores);
  }
  if (Array.from(entry.simp).length === 1 && entry.statistics?.bookCharCount) {
    bookCharacterFrequencies.set(entry.simp, Math.max(bookCharacterFrequencies.get(entry.simp) ?? 0, entry.statistics.bookCharCount));
    bookCharacterFrequencies.set(entry.trad, Math.max(bookCharacterFrequencies.get(entry.trad) ?? 0, entry.statistics.bookCharCount));
  }
  if (Array.from(entry.simp).length === 1 && entry.statistics?.hskLevel) {
    const level = entry.statistics.hskLevel;
    const current = characterHskLevels.get(entry.simp);
    if (!current || level < current) characterHskLevels.set(entry.simp, level);
    const traditionalCurrent = characterHskLevels.get(entry.trad);
    if (!traditionalCurrent || level < traditionalCurrent) characterHskLevels.set(entry.trad, level);
  }
  if (Array.from(entry.simp).length === 1 && Array.from(entry.trad).length === 1) {
    const rank = dongRanks.get(entry.simp);
    if (rank) dongRanks.set(entry.trad, rank);
  }
}

for (const entry of allEntries) {
  if (Array.from(entry.simp).length !== 1) continue;
  for (const component of getEtymology(entry.simp)?.components ?? []) {
    const original = component.notes?.match(/component form of ([^ .]+)/i)?.[1];
    if (original && original !== component.char) {
      if (!componentForms.has(original)) componentForms.set(original, new Set());
      componentForms.get(original)?.add(component.char);
      componentOriginals.set(component.char, original);
    }
  }
}

// Short radical form of a full component (人 → 亻) or the full component of a short form (亻 → 人).
export function getComponentVariant(component: string) {
  return [...(componentForms.get(component) ?? [])][0] ?? componentOriginals.get(component) ?? '';
}

export function getFrequencyScores(text: string) {
  if (text.length === 1) return characterRanks.get(text) ?? {};
  return wordRanks.get(text) ?? {};
}

export function getDifficultyRank(text: string, source: Settings.DifficultySource) {
  if (source === 'dong') {
    return Math.min(...Array.from(text).map((character) => dongRanks.get(character) ?? Infinity));
  }
  return getFrequencyScores(text)[source];
}

export function getBookFrequencyCharacters(): Ranking.OverviewCharacter[] {
  return characterOrder
    .map((character) => ({ character, frequency: bookCharacterFrequencies.get(character) ?? 0 }))
    .sort((left, right) => right.frequency - left.frequency)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}

export function getHskCharacters(): Ranking.OverviewCharacter[] {
  return characterOrder
    .slice()
    .sort((left, right) => (characterHskLevels.get(left) ?? Infinity) - (characterHskLevels.get(right) ?? Infinity))
    .map((character, index) => ({ character, rank: index + 1, level: characterHskLevels.get(character) }));
}

export function getComponentForms(character: string) {
  return [...(componentForms.get(character) ?? [])];
}

export function getOverviewComponents(order: Settings.DictionaryOrder): OverviewComponent[] {
  const cached = componentOverviewCache.get(order);
  if (cached) return cached;
  const components = [...componentUses.entries()].map(([component, uses]) => {
    const characters = new Map([...uses.meaning, ...uses.sound, ...uses.other]);
    const values = [...characters.values()];
    const bookFrequency = values.reduce((total, item) => total + (item.bookFrequency ?? 0), 0);
    const mediaFrequency = values.reduce((total, item) => total + (item.mediaFrequency ?? 0), 0);
    const dongFrequency = values.reduce((total, item) => total + (item.dongRank ? 1 / item.dongRank : 0), 0);
    const level = values.reduce<number | undefined>((best, item) => item.hskLevel && (!best || item.hskLevel < best) ? item.hskLevel : best, undefined);
    const frequency = order === 'books' ? bookFrequency : order === 'media' ? mediaFrequency : dongFrequency;
    return { component, frequency, level };
  });
  components.sort((left, right) => order === 'hsk'
    ? (left.level ?? Infinity) - (right.level ?? Infinity) || (right.frequency ?? 0) - (left.frequency ?? 0) || left.component.localeCompare(right.component)
    : (right.frequency ?? 0) - (left.frequency ?? 0) || (left.level ?? Infinity) - (right.level ?? Infinity) || left.component.localeCompare(right.component));
  const ranked = components.map((item, index) => ({ ...item, rank: index + 1 }));
  componentOverviewCache.set(order, ranked);
  componentRankCache.set(order, new Map(ranked.map(({ component, rank }) => [component, rank])));
  return ranked;
}

export function getComponentRank(component: string, source: Settings.DifficultySource) {
  getOverviewComponents(source);
  return componentRankCache.get(source)?.get(component);
}

export function getPinyin(text: string) {
  return (getEntries(text) as LexiconEntry[])[0]?.pinyin ?? getEtymology(text)?.pinyin ?? '';
}

export function getComponentDetails(component: string, order: Settings.DictionaryOrder): ComponentDetails {
  const uses = componentUses.get(component);
  const sortByFrequency = (characters: Map<string, ComponentCharacter> | undefined) => [...(characters?.values() ?? [])].sort((left, right) => {
    if (order === 'books') return (right.bookFrequency ?? 0) - (left.bookFrequency ?? 0) || left.character.localeCompare(right.character);
    if (order === 'media') return (right.mediaFrequency ?? 0) - (left.mediaFrequency ?? 0) || left.character.localeCompare(right.character);
    if (order === 'hsk') return (left.hskLevel ?? Infinity) - (right.hskLevel ?? Infinity) || (right.mediaFrequency ?? 0) - (left.mediaFrequency ?? 0) || left.character.localeCompare(right.character);
    return (left.dongRank ?? Infinity) - (right.dongRank ?? Infinity) || left.character.localeCompare(right.character);
  });
  const entry = (getEntries(component) as LexiconEntry[])[0];
  const etymology = getEtymology(component);
  return {
    component,
    pinyin: getPinyin(component),
    definition: etymology?.definition ?? entry?.definitions[0] ?? 'Character component',
    variant: getComponentVariant(component),
    meaning: sortByFrequency(uses?.meaning),
    sound: sortByFrequency(uses?.sound),
    other: sortByFrequency(uses?.other),
  };
}

export function getMediaCharacterRank(character: string) {
  return mediaRankByCharacter.get(character);
}

export type PinyinRankSource = 'media' | 'books' | 'hsk';
export type PinyinCharacter = { character: string; frequency: number; rank?: number; definition: string; pinyin: string };
export type PinyinSyllable = { syllable: string; frequency: number; characters: PinyinCharacter[] };
export type PinyinCoverage = { initial: Map<string, number>; final: Map<string, number>; total: number };

export function normalizePinyin(value: string) {
  return value.trim().toLowerCase().replace(/[0-9]/g, '').replace(/u:/g, 'ü').replace(/v/g, 'ü').replace(/ü/g, '~').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/~/g, 'ü');
}

const pinyinCharacters = new Map<string, Map<string, { frequency: number; pinyin: string }>>();
const primaryPinyinCharacters = new Set<string>();
for (const entry of allEntries) {
  if (Array.from(entry.simp).length !== 1 || primaryPinyinCharacters.has(entry.simp)) continue;
  primaryPinyinCharacters.add(entry.simp);
  const primaryPinyin = getEntries(entry.simp)[0]?.pinyin;
  if (!primaryPinyin) continue;
  const syllable = normalizePinyin(primaryPinyin);
  if (!syllable) continue;
  const characters = pinyinCharacters.get(syllable) ?? new Map<string, { frequency: number; pinyin: string }>();
  const frequency = mediaFrequencyByCharacter.get(entry.simp) ?? 0;
  const current = characters.get(entry.simp);
  if (!current || frequency > current.frequency) characters.set(entry.simp, { frequency, pinyin: primaryPinyin });
  pinyinCharacters.set(syllable, characters);
}

function pinyinCharacterRank(character: string, source: PinyinRankSource) {
  if (source === 'media') return mediaRankByCharacter.get(character);
  if (source === 'hsk') return characterHskLevels.get(character);
  return characterRanks.get(character)?.books;
}

function primaryDefinition(character: string) {
  return getEntries(character)[0]?.definitions.find((definition: string) => !definition.startsWith('CL:')) ?? 'Character';
}

export function getPinyinSyllables(source: PinyinRankSource = 'media'): PinyinSyllable[] {
  return [...pinyinCharacters.entries()]
    .map(([syllable, characters]) => {
      const rankedCharacters = [...characters.entries()]
        .map(([character, { frequency, pinyin }]) => ({ character, frequency, rank: pinyinCharacterRank(character, source), definition: primaryDefinition(character), pinyin }))
        .sort((left, right) => (left.rank ?? Infinity) - (right.rank ?? Infinity) || right.frequency - left.frequency || left.character.localeCompare(right.character));
      return { syllable, frequency: rankedCharacters.reduce((total, item) => total + item.frequency, 0), characters: rankedCharacters };
    })
    .sort((left, right) => (left.characters[0]?.rank ?? Infinity) - (right.characters[0]?.rank ?? Infinity) || right.frequency - left.frequency || left.syllable.localeCompare(right.syllable));
}

export function getPinyinCoverage(initials: string[], finals: string[]): PinyinCoverage {
  const initial = new Map<string, number>();
  const final = new Map<string, number>();
  let total = 0;
  for (const characters of pinyinCharacters.values()) {
    for (const { frequency, pinyin } of characters.values()) {
      const syllable = normalizePinyin(pinyin);
      const onset = [...initials].sort((left, right) => right.length - left.length).find((value) => value && syllable.startsWith(value)) ?? '';
      const ending = finals.find((value) => syllable === `${onset}${value}`) ?? '';
      total += frequency;
      initial.set(onset, (initial.get(onset) ?? 0) + frequency);
      if (ending) final.set(ending, (final.get(ending) ?? 0) + frequency);
    }
  }
  return { initial, final, total };
}
