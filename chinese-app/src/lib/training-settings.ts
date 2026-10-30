import { config } from './config';
import type { DictionaryOrder } from './settings';

export type TrainingSettings = { sessionLength: number; sentenceFontSize: number; pinyinFontSize: number; wordTranslationFontSize: number; sentenceTranslationFontSize: number; wordDetailRankSource: DictionaryOrder };
const storageKey = 'hanzi-atlas-training-settings';
const defaultTrainingSettings: TrainingSettings = { sessionLength: config.training.defaultSessionLength, sentenceFontSize: config.training.defaultTextSizes.sentence, pinyinFontSize: config.training.defaultTextSizes.pinyin, wordTranslationFontSize: config.training.defaultTextSizes.wordTranslation, sentenceTranslationFontSize: config.training.defaultTextSizes.sentenceTranslation, wordDetailRankSource: 'media' };

export function loadTrainingSettings(): TrainingSettings {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
    const limits = config.training.sessionLengthLimits;
    return {
      sessionLength: Number.isFinite(value.sessionLength) ? Math.max(limits.min, Math.min(limits.max, value.sessionLength)) : defaultTrainingSettings.sessionLength,
      sentenceFontSize: Number.isFinite(value.sentenceFontSize) ? Math.max(1.5, Math.min(5, value.sentenceFontSize)) : defaultTrainingSettings.sentenceFontSize,
      pinyinFontSize: Number.isFinite(value.pinyinFontSize) ? Math.max(.7, Math.min(2.5, value.pinyinFontSize)) : defaultTrainingSettings.pinyinFontSize,
      wordTranslationFontSize: Number.isFinite(value.wordTranslationFontSize) ? Math.max(.7, Math.min(2.5, value.wordTranslationFontSize)) : Number.isFinite(value.translationFontSize) ? Math.max(.7, Math.min(2.5, value.translationFontSize)) : defaultTrainingSettings.wordTranslationFontSize,
      sentenceTranslationFontSize: Number.isFinite(value.sentenceTranslationFontSize) ? Math.max(.7, Math.min(2.5, value.sentenceTranslationFontSize)) : Number.isFinite(value.translationFontSize) ? Math.max(.7, Math.min(2.5, value.translationFontSize)) : defaultTrainingSettings.sentenceTranslationFontSize,
      wordDetailRankSource: ['media', 'books', 'dong', 'hsk'].includes(value.wordDetailRankSource) ? value.wordDetailRankSource : defaultTrainingSettings.wordDetailRankSource,
    };
  } catch { return defaultTrainingSettings; }
}

export function saveTrainingSettings(settings: TrainingSettings) { try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* Session settings remain active. */ } }
