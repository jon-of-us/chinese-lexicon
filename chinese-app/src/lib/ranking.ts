import characterOrderFile from '../../../chinese-dataset/frequency/character-order.json';
import frequencyCharacterFile from '../../../chinese-dataset/frequency/characters.json';
import { config } from './config';
import type { DifficultySource, DictionaryOrder } from './settings';

const characterOrder: string[] = characterOrderFile.characters;
const dongRanks = new Map(characterOrder.map((character, index) => [character, index + 1]));
type MediaCharacter = { character: string; bestMediaRank: number; mediaFrequency: number };
const mediaRankedCharacters = frequencyCharacterFile.characters as MediaCharacter[];
const mediaRanks = new Map(mediaRankedCharacters.map(({ character, bestMediaRank }) => [character, bestMediaRank]));

export type OverviewCharacter = { character: string; rank?: number; frequency?: number; level?: number };

export function getOverviewCharacters(source: Exclude<DictionaryOrder, 'books' | 'hsk'>): OverviewCharacter[] {
  if (source === 'dong') return characterOrder.map((character, index) => ({ character, rank: index + 1 }));
  return mediaRankedCharacters
    .slice()
    .sort((left, right) => right.mediaFrequency - left.mediaFrequency)
    .map(({ character, bestMediaRank, mediaFrequency }) => ({ character, rank: bestMediaRank, frequency: mediaFrequency }));
}

// The overview only needs character ranks. Keeping this compact data separate means
// the full dictionary can wait until a user opens an entry or searches.
export function getOverviewDifficultyRank(text: string, source: DifficultySource) {
  if (source === 'dong') return Math.min(...Array.from(text).map((character) => dongRanks.get(character) ?? Infinity));
  if (source === 'media') return Math.min(...Array.from(text).map((character) => mediaRanks.get(character) ?? Infinity));
  return undefined;
}

function hexToRgb(hex: string) {
  const value = hex.slice(1);
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

export function rankColor(rank: number | undefined, range: number) {
  const { stops } = config.frequencyColorScale;
  if (!rank || !Number.isFinite(rank) || rank >= range) return stops.at(-1)!.color;
  const position = rank / range;
  const scaledStops = stops.map((stop) => ({ ...stop, position: Math.min(stop.rank / 1000, 1) }));
  const end = scaledStops.findIndex((stop) => position <= stop.position);
  const right = scaledStops[Math.max(end, 1)];
  const left = scaledStops[Math.max(end - 1, 0)];
  const progress = (position - left.position) / (right.position - left.position);
  const [red1, green1, blue1] = hexToRgb(left.color);
  const [red2, green2, blue2] = hexToRgb(right.color);
  return `rgb(${Math.round(red1 + (red2 - red1) * progress)} ${Math.round(green1 + (green2 - green1) * progress)} ${Math.round(blue1 + (blue2 - blue1) * progress)})`;
}
