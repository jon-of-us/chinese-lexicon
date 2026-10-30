export type FrequencyWord = { index: number; word: string; traditional: string; pinyin: string; translation: string; mediaRank: number; mediaFrequency: number };
export type FrequencyCharacter = { index: number; character: string; mediaFrequency: number; bestMediaRank: number };
export type Sentence = { id: string; source: string; audio: { path: string; format: string }; transcription: string; translation: { language: string; text: string; words: string[]; alignment: (number | null)[] }; word_split: { tokens: string[]; metadata: { origin: 'provided' | 'generated' } } };
export type HelpLevel = 0 | 1 | 2;
export type WordCategory = 'unseen' | 'new' | 'learning' | 'familiar' | 'mastered';
export type DailyProgress = { date: string; appActiveSeconds: number; sentenceStudySeconds: number; studiedSentenceCount: number; timedSentenceCount: number; excludedSentenceCount: number; averageSentenceStudySeconds: number; categoryCounts: Record<WordCategory, number>; sentenceDurations: number[] };
export type LearningState = { wordKnowledge: Float32Array; wordImportance: Float32Array; wordEncounterCount: Uint32Array; characterEncounterCount: Uint32Array; daily: Record<string, DailyProgress>; recentSentenceIds: string[] };
