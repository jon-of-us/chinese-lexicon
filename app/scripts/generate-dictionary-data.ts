import * as FileSystem from 'node:fs';
import * as Path from 'node:path';
import * as Url from 'node:url';
import type * as Vite from 'vite';
import * as AppConfig from '../src/lib/config.ts';

// Builds the app's dictionary data from chinese-dataset. Runs as a Vite plugin and as a standalone script (npm run generate).
const appDirectory = Path.resolve(Path.dirname(Url.fileURLToPath(import.meta.url)), '..');
const generatedDirectory = Path.join(appDirectory, 'src/generated');
const dictionaryDataPath = Path.join(generatedDirectory, 'dictionary-data.json');
const searchEntriesPath = Path.join(generatedDirectory, 'search-entries.json');
const datasetDirectory = Path.resolve(appDirectory, '../chinese-dataset');
const sourcePaths = {
  entries: Path.join(datasetDirectory, 'dictionary/entries.json'),
  index: Path.join(datasetDirectory, 'dictionary/index.json'),
  etymology: Path.join(datasetDirectory, 'dictionary/etymology.json'),
  characterOrder: Path.join(datasetDirectory, 'frequency/character-order.json'),
  characters: Path.join(datasetDirectory, 'frequency/characters.json'),
};

type TopWord = { word: string; trad: string; gloss: string; share: number };
type RawStatistics = { hskLevel?: number; bookWordRank?: number; movieWordRank?: number; bookCharCount?: number; bookCharRank?: number; movieCharCount?: number; movieCharRank?: number; topWords?: TopWord[] };
type RawEntry = { simp: string; trad: string; definitions: string[]; pinyin?: string; searchablePinyin?: string; pinyinTones?: string; boost?: number; statistics?: RawStatistics };
type RawComponent = { char: string; type: string; pinyin?: string; definition?: string; notes?: string; fragment?: string };
type RawEtymology = { character: string; notes?: string; definition?: string; pinyin?: string; components?: RawComponent[] };
type MediaCharacter = { character: string; mediaFrequency: number; bestMediaRank?: number };
type PositionIndex = { simp: Record<string, number[]>; trad: Record<string, number[]> };
type ComponentCharacter = { character: string; pinyin: string; definition: string; bookFrequency?: number; bookRank?: number; mediaFrequency?: number; mediaRank?: number; hskLevel?: number; dongRank?: number };
type UseCategory = 'meaning' | 'sound' | 'other';

// Only fields the app reads. Anything else in chinese-dataset (e.g. usedAsComponentIn, corpus percentages) is dropped here.
const entryFields = ['simp', 'trad', 'definitions', 'pinyin', 'searchablePinyin', 'pinyinTones', 'boost'] as const;
const statisticsFields = ['hskLevel', 'bookWordRank', 'movieWordRank', 'bookCharCount', 'bookCharRank', 'movieCharCount', 'movieCharRank', 'topWords'] as const;
const searchFields = ['simp', 'trad', 'definitions', 'pinyin', 'searchablePinyin', 'pinyinTones', 'boost'] as const;
const etymologyFields = ['character', 'notes', 'definition', 'pinyin'] as const;
const componentFields = ['char', 'type', 'pinyin', 'definition', 'notes'] as const;

function readJson<T>(path: string): T {
  return JSON.parse(FileSystem.readFileSync(path, 'utf8')) as T;
}

function pick<T extends object, K extends keyof T>(source: T, keys: readonly K[]) {
  return Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]])) as Pick<T, K>;
}

// Four significant figures keep boosts, shares, and similar values close to the source; integers stay exact.
function roundFloats<T>(value: T): T {
  if (typeof value === 'number') return (Number.isInteger(value) ? value : Number(value.toPrecision(4))) as T;
  if (Array.isArray(value)) return value.map(roundFloats) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, roundFloats(item)])) as T;
  return value;
}

function isSingleHan(text: string) {
  return /^\p{Script=Han}$/u.test(text);
}

function trimEntry(entry: RawEntry) {
  const statistics = entry.statistics && {
    ...pick(entry.statistics, statisticsFields),
    topWords: entry.statistics.topWords?.slice(0, AppConfig.config.data.topWordsLimit),
  };
  return { ...pick(entry, entryFields), statistics };
}

function trimEtymology(etymology: RawEtymology) {
  return { ...pick(etymology, etymologyFields), components: etymology.components?.map((part) => pick(part, componentFields)) };
}

// Precomputes what dictionary.ts used to build at load: for each component, the single-character words that contain it, grouped by how they use it.
function buildComponentUses(entries: RawEntry[], index: PositionIndex, etymologies: Map<string, RawEtymology>, characterOrder: string[], mediaCharacters: MediaCharacter[]) {
  const dongRanks = new Map(characterOrder.map((character, position) => [character, position + 1]));
  const mediaFrequencies = new Map(mediaCharacters.map(({ character, mediaFrequency }) => [character, mediaFrequency]));
  const mediaRanks = new Map(mediaCharacters.map(({ character, bestMediaRank }) => [character, bestMediaRank]));
  const entriesFor = (word: string) => (index.simp[word] ?? index.trad[word] ?? []).map((position) => entries[position]);
  const uses = new Map<string, Record<UseCategory, Map<string, ComponentCharacter>>>();
  const addUse = (component: string, type: string, character: ComponentCharacter) => {
    if (!isSingleHan(component)) return;
    const category: UseCategory = type === 'meaning' || type === 'sound' ? type : 'other';
    let bucket = uses.get(component);
    if (!bucket) {
      bucket = { meaning: new Map(), sound: new Map(), other: new Map() };
      uses.set(component, bucket);
    }
    bucket[category].set(character.character, character);
  };
  const seen = new Set<string>();
  for (const entry of entries) {
    if (Array.from(entry.simp).length !== 1) continue;
    const character = entry.simp;
    if (!isSingleHan(character) || seen.has(character)) continue;
    seen.add(character);
    const etymology = etymologies.get(character);
    if (!etymology) continue;
    const characterEntry = entriesFor(character)[0] ?? entry;
    const statistics = characterEntry.statistics;
    const info: ComponentCharacter = {
      character,
      pinyin: characterEntry.pinyin ?? etymology.pinyin ?? '',
      definition: etymology.definition ?? characterEntry.definitions[0] ?? 'Character',
      bookFrequency: statistics?.bookCharCount,
      bookRank: statistics?.bookCharRank,
      mediaFrequency: statistics?.movieCharCount ?? mediaFrequencies.get(character),
      mediaRank: statistics?.movieCharRank ?? mediaRanks.get(character),
      hskLevel: statistics?.hskLevel,
      dongRank: dongRanks.get(character),
    };
    for (const part of etymology.components ?? []) addUse(part.char, part.type, info);
  }
  return Object.fromEntries([...uses].map(([component, bucket]) => [component, {
    meaning: [...bucket.meaning.values()],
    sound: [...bucket.sound.values()],
    other: [...bucket.other.values()],
  }]));
}

export function writeDictionaryData() {
  const { entries: rawEntries } = readJson<{ entries: RawEntry[] }>(sourcePaths.entries);
  const index = readJson<PositionIndex>(sourcePaths.index);
  const { characters: rawEtymology } = readJson<{ characters: RawEtymology[] }>(sourcePaths.etymology);
  const { characters: characterOrder } = readJson<{ characters: string[] }>(sourcePaths.characterOrder);
  const { characters: mediaCharacters } = readJson<{ characters: MediaCharacter[] }>(sourcePaths.characters);

  const entries = rawEntries.map((entry) => roundFloats(trimEntry(entry)));
  const etymology = rawEtymology.map(trimEtymology);
  const componentUses = buildComponentUses(rawEntries, index, new Map(rawEtymology.map((item) => [item.character, item])), characterOrder, mediaCharacters);
  const searchEntries = entries.map((entry) => pick(entry, searchFields));

  FileSystem.mkdirSync(generatedDirectory, { recursive: true });
  FileSystem.writeFileSync(dictionaryDataPath, JSON.stringify({ entries, etymology, componentUses }));
  FileSystem.writeFileSync(searchEntriesPath, JSON.stringify(searchEntries));
}

export function dictionaryDataPlugin(): Vite.Plugin {
  const watchedPaths = new Set(Object.values(sourcePaths));
  return {
    name: 'dictionary-data',
    buildStart() {
      writeDictionaryData();
    },
    configureServer(server) {
      server.watcher.add([...watchedPaths]);
      server.watcher.on('change', (file) => {
        if (watchedPaths.has(Path.resolve(file))) writeDictionaryData();
      });
    },
  };
}

if (process.argv[1] === Url.fileURLToPath(import.meta.url)) writeDictionaryData();
