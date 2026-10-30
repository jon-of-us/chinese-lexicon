export type SearchEntry = {
  simp: string;
  trad: string;
  definitions: string[];
  pinyin?: string;
  searchablePinyin?: string;
  pinyinTones?: string;
  boost?: number;
};

const englishWords = /[a-z0-9]+/gi;

function editDistance(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row++) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column++) {
      const saved = previous[column];
      previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + Number(left[row - 1] !== right[column - 1]));
      diagonal = saved;
    }
  }
  return previous[right.length];
}

function englishMatchScore(definitions: string[], term: string) {
  const words = definitions.join(' ').toLowerCase().match(englishWords) ?? [];
  const queryWords = term.match(englishWords) ?? [];
  let total = 0;
  for (const queryWord of queryWords) {
    let best = 0;
    for (const word of words) {
      if (word === queryWord) best = Math.max(best, 30);
      else if (word.startsWith(queryWord)) best = Math.max(best, 20);
      else if (word.includes(queryWord)) best = Math.max(best, 14);
      else if (queryWord.length >= 4 && Math.abs(word.length - queryWord.length) <= 1 && editDistance(word, queryWord) <= 1) best = Math.max(best, 8);
    }
    if (!best) return 0;
    total += best;
  }
  return total;
}

export function searchEntries(entries: readonly SearchEntry[], term: string, limit = 100): SearchEntry[] {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return [];
  const compactPinyin = normalized.replace(/\s+/g, '');
  return entries
    .map((entry) => {
      const englishScore = englishMatchScore(entry.definitions, normalized);
      const textScore = [entry.simp, entry.trad].some((text) => text.includes(normalized))
        || [entry.searchablePinyin, entry.pinyinTones, entry.pinyin?.toLowerCase()]
          .some((text) => text?.replace(/\s+/g, '').includes(compactPinyin)) ? 25 : 0;
      return { entry, score: englishScore + textScore };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => (right.score * (right.entry.boost ?? 1)) - (left.score * (left.entry.boost ?? 1)))
    .slice(0, limit)
    .map(({ entry }) => entry);
}
