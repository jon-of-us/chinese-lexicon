type TopWord = { word: string; trad: string; gloss: string; share: number };
export type Entry = { simp: string; trad: string; pinyin: string; definitions: string[]; statistics?: { topWords?: TopWord[]; hskLevel?: number; bookWordRank?: number; movieWordRank?: number } };
type ComponentPart = { char: string; type: string; definition?: string; pinyin?: string };
export type Etymology = { notes?: string; definition?: string; pinyin?: string; components?: ComponentPart[] };
