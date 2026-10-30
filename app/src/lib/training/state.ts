import { config } from '../config';
import { frequencyCharacters, frequencyWords } from './data';
import type { DailyProgress, LearningState, WordCategory } from './types';

const databaseName = 'hanzi-atlas-learning';
const storeName = 'state';
const stateKey = 'current';
const today = () => new Date().toLocaleDateString('en-CA');
const categories = (): Record<WordCategory, number> => ({ unseen: 0, new: 0, learning: 0, familiar: 0, mastered: 0 });
const emptyDay = (date = today()): DailyProgress => ({ date, appActiveSeconds: 0, sentenceStudySeconds: 0, studiedSentenceCount: 0, timedSentenceCount: 0, excludedSentenceCount: 0, averageSentenceStudySeconds: 0, categoryCounts: categories(), sentenceDurations: [] });

function newState(): LearningState {
  const wordKnowledge = new Float32Array(frequencyWords.length);
  wordKnowledge.fill(-1);
  const wordImportance = new Float32Array(frequencyWords.length);
  frequencyWords.forEach((word) => { wordImportance[word.index] = 1 - word.index / frequencyWords.length; });
  return { wordKnowledge, wordImportance, wordEncounterCount: new Uint32Array(frequencyWords.length), characterEncounterCount: new Uint32Array(frequencyCharacters.length), daily: {}, recentSentenceIds: [] };
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadLearningState(): Promise<LearningState> {
  try {
    const database = await openDatabase();
    const stored = await new Promise<LearningState | undefined>((resolve, reject) => {
      const request = database.transaction(storeName, 'readonly').objectStore(storeName).get(stateKey);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    if (stored?.wordKnowledge?.length === frequencyWords.length && stored.characterEncounterCount?.length === frequencyCharacters.length) return stored;
  } catch { /* Fall back to a session-only state when browser storage is unavailable. */ }
  return newState();
}

export async function saveLearningState(state: LearningState) {
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(storeName, 'readwrite').objectStore(storeName).put(state, stateKey);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    database.close();
  } catch { /* The in-memory session remains usable if persistence fails. */ }
}

export function categoryFor(score: number): WordCategory {
  const limits = config.training.categoryThresholds;
  if (score < 0) return 'unseen';
  if (score < limits.new) return 'new';
  if (score < limits.learning) return 'learning';
  if (score < limits.familiar) return 'familiar';
  return 'mastered';
}

export function progressForToday(state: LearningState) {
  const date = today();
  const day = state.daily[date] ?? (state.daily[date] = emptyDay(date));
  day.categoryCounts = categories();
  for (const score of state.wordKnowledge) day.categoryCounts[categoryFor(score)]++;
  return day;
}

export function recordActiveTime(state: LearningState, seconds: number) { progressForToday(state).appActiveSeconds += seconds; }

export function isTimingOutlier(duration: number, priorDurations: number[]) {
  const timing = config.training.timing;
  if (duration < timing.minimumSentenceSeconds || duration > timing.maximumSentenceSeconds) return true;
  if (priorDurations.length < timing.madMinimumSamples) return false;
  const median = [...priorDurations].sort((a, b) => a - b)[Math.floor(priorDurations.length / 2)];
  const deviations = priorDurations.map((value) => Math.abs(value - median)).sort((a, b) => a - b);
  const mad = deviations[Math.floor(deviations.length / 2)];
  return mad > 0 && Math.abs(duration - median) > timing.madMultiplier * mad;
}
