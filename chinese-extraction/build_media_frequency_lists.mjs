/** Build deterministic, app-ready frequency indexes from the vendored lexicon. */
import * as Fs from 'node:fs/promises';
import * as Dong from '../chinese/dong-chinese/index.js';

const outputDir = new URL('../chinese-dataset/frequency/', import.meta.url);
const wordLimit = 2_000;

function better(existing, candidate) {
  if (!existing) return candidate;
  if (candidate.mediaRank !== existing.mediaRank) return candidate.mediaRank < existing.mediaRank ? candidate : existing;
  return candidate.mediaFrequency > existing.mediaFrequency ? candidate : existing;
}

const words = new Map();
for (const entry of Dong.allEntries) {
  const { movieWordRank, movieWordCount } = entry.statistics ?? {};
  if (!entry.simp || !movieWordRank || !movieWordCount) continue;
  words.set(entry.simp, better(words.get(entry.simp), {
    word: entry.simp,
    traditional: entry.trad,
    pinyin: entry.pinyin,
    translation: entry.definitions.filter((definition) => !definition.startsWith('CL:'))[0] ?? '',
    mediaRank: movieWordRank,
    mediaFrequency: movieWordCount,
  }));
}

const topWords = [...words.values()]
  .filter((entry) => entry.translation)
  .sort((left, right) => left.mediaRank - right.mediaRank || right.mediaFrequency - left.mediaFrequency || left.word.localeCompare(right.word, 'zh'))
  .slice(0, wordLimit)
  .map((entry, index) => ({ index, ...entry }));

const characters = new Map();
for (const entry of topWords) {
  for (const character of entry.word) {
    const current = characters.get(character) ?? { character, mediaFrequency: 0, bestMediaRank: entry.mediaRank };
    current.mediaFrequency += entry.mediaFrequency;
    current.bestMediaRank = Math.min(current.bestMediaRank, entry.mediaRank);
    characters.set(character, current);
  }
}
const topCharacters = [...characters.values()]
  .sort((left, right) => right.mediaFrequency - left.mediaFrequency || left.bestMediaRank - right.bestMediaRank || left.character.localeCompare(right.character, 'zh'))
  .map((entry, index) => ({ index, ...entry }));

await Fs.writeFile(new URL('words.json', outputDir), `${JSON.stringify({ sources: ['dong-chinese'], words: topWords }, null, 2)}\n`);
await Fs.writeFile(new URL('characters.json', outputDir), `${JSON.stringify({ sources: ['dong-chinese'], characters: topCharacters }, null, 2)}\n`);
console.log(`Wrote ${topWords.length} words and ${topCharacters.length} characters.`);
