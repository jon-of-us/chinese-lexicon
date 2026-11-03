export type DifficultySource = 'media' | 'books' | 'dong';
export type DictionaryOrder = DifficultySource | 'hsk';
export type SearchBackBehavior = 'restore-search' | 'skip-search';

export type DifficultySettings = {
  source: DifficultySource;
  order: DictionaryOrder;
  range: number;
  pinyinHoverRank: number;
  searchBackBehavior: SearchBackBehavior;
  paneMinWidth: number;
  maxPanes: number;
  detailHeadlineSize: number;
};

export const defaultDetailHeadlineSize = 120;
const defaultDifficultySettings: DifficultySettings = { source: 'media', order: 'media', range: 1000, pinyinHoverRank: 500, searchBackBehavior: 'restore-search', paneMinWidth: 400, maxPanes: 4, detailHeadlineSize: defaultDetailHeadlineSize };
const storageKey = 'hanzi-atlas-difficulty-settings';

export function loadDifficultySettings(): DifficultySettings {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    if (['media', 'books', 'dong'].includes(saved.source) && Number.isFinite(saved.range)) {
      return { source: saved.source, order: ['media', 'books', 'dong', 'hsk'].includes(saved.order) ? saved.order : saved.source, range: Math.max(100, Math.min(3000, saved.range)), pinyinHoverRank: Number.isFinite(saved.pinyinHoverRank) ? Math.max(100, Math.min(3000, saved.pinyinHoverRank)) : 500, searchBackBehavior: saved.searchBackBehavior === 'skip-search' ? 'skip-search' : 'restore-search', paneMinWidth: Number.isFinite(saved.paneMinWidth) ? Math.max(320, Math.min(1200, saved.paneMinWidth)) : 400, maxPanes: Number.isInteger(saved.maxPanes) ? Math.max(1, Math.min(5, saved.maxPanes)) : 4, detailHeadlineSize: Number.isFinite(saved.detailHeadlineSize) ? Math.max(64, Math.min(288, saved.detailHeadlineSize)) : defaultDetailHeadlineSize };
    }
  } catch {
    // Use the defaults when storage is unavailable or malformed.
  }
  return defaultDifficultySettings;
}

export function saveDifficultySettings(settings: DifficultySettings) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch {
    // Preferences still work for this session if storage is unavailable.
  }
}
