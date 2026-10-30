import { config } from '../config';
import { characterIndex, sentences, wordIndex } from './data';
import { isTimingOutlier, progressForToday } from './state';
import type { HelpLevel, LearningState, Sentence } from './types';

export type TrainingSentence = { sentence: Sentence; wordIndexes: Map<string, number>; unknownWords: string[] };
export type TrainingSession = { training: TrainingSentence; startedAt: number; reviewedWords: string[]; tapStates: Record<string, HelpLevel>; helpLevels: Record<string, HelpLevel>; wordPagesVisited: string[]; flashcardIndex: number; visibleTranslationIndex: number | null; sentenceTranslationVisible: boolean; completedCount: number; targetCount: number };

function indexedWords(sentence: Sentence) {
  return new Map(sentence.word_split.tokens.map((word) => [word, wordIndex.get(word)]).filter((entry): entry is [string, number] => entry[1] !== undefined));
}

export function selectSentence(state: LearningState): TrainingSentence | undefined {
  const sentence = sentences.find((item) => !state.recentSentenceIds.includes(item.id));
  if (!sentence) return;
  const wordIndexes = indexedWords(sentence);
  return {
    sentence,
    wordIndexes,
    unknownWords: [...wordIndexes.entries()]
      .filter(([, index]) => state.wordKnowledge[index] < 0)
      .map(([word]) => word),
  };
}

export function completeSentence(state: LearningState, training: TrainingSentence, helpLevels: Map<string, HelpLevel>, startedAt: number) {
  const now = Date.now();
  for (const [word, index] of training.wordIndexes) {
    const previous = state.wordKnowledge[index];
    const help = helpLevels.get(word) ?? 0;
    const base = previous < 0 ? config.training.initialKnowledge : previous;
    const change = help === 0 ? config.training.knowledgeGainUntapped : help === 1 ? -config.training.knowledgePenaltyPinyin : -config.training.knowledgePenaltyTranslation;
    state.wordKnowledge[index] = Math.max(0, Math.min(config.training.maximumKnowledgeScore, base + change));
    state.wordEncounterCount[index]++;
  }
  for (const character of training.sentence.transcription) {
    const index = characterIndex.get(character);
    if (index !== undefined) state.characterEncounterCount[index]++;
  }
  const day = progressForToday(state);
  day.studiedSentenceCount++;
  const duration = (now - startedAt) / 1000;
  if (isTimingOutlier(duration, day.sentenceDurations)) day.excludedSentenceCount++;
  else {
    day.sentenceDurations.push(duration);
    day.sentenceStudySeconds += duration;
    day.timedSentenceCount++;
    day.averageSentenceStudySeconds = day.sentenceStudySeconds / day.timedSentenceCount;
  }
  state.recentSentenceIds = [...state.recentSentenceIds, training.sentence.id].slice(-config.training.repeatAvoidanceCount);
}
