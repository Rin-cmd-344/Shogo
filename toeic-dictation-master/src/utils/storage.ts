import { AppSettings, PartType, Question, UserProgressRecord } from '../types';
import { DEFAULT_QUESTIONS } from '../data/defaultQuestions';

const STORAGE_KEYS = {
  QUESTIONS: 'toeic_dictation_questions_v1',
  PROGRESS: 'toeic_dictation_user_progress_v1',
  SETTINGS: 'toeic_dictation_settings_v1',
  AUTH_PROFILE: 'toeic_dictation_auth_profile_v1',
};

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  soundVolume: 0.6,
  playbackSpeed: 1.0,
  autoAdvanceSentence: true,
  repeatAudioOnMistake: false,
};

// IndexedDB database name and store name for audio and image blobs
const IDB_NAME = 'ToeicDictationBlobsDB';
const IDB_VERSION = 1;
const BLOB_STORE = 'media_blobs';

function openBlobDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(BLOB_STORE)) {
        db.createObjectStore(BLOB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeMediaBlob(key: string, blob: Blob | string): Promise<void> {
  try {
    const db = await openBlobDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE, 'readwrite');
      const store = tx.objectStore(BLOB_STORE);
      const req = store.put(blob, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save to IndexedDB, fallback to in-memory', err);
  }
}

export async function getMediaBlob(key: string): Promise<Blob | string | null> {
  try {
    const db = await openBlobDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(BLOB_STORE, 'readonly');
      const store = tx.objectStore(BLOB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

// 1. Questions Storage
export function loadQuestions(): Question[] {
  if (typeof window === 'undefined') return DEFAULT_QUESTIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (!raw) {
      saveQuestions(DEFAULT_QUESTIONS);
      return DEFAULT_QUESTIONS;
    }
    return JSON.parse(raw) as Question[];
  } catch (e) {
    console.error('Error loading questions from localStorage:', e);
    return DEFAULT_QUESTIONS;
  }
}

export function saveQuestions(questions: Question[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
  } catch (e) {
    console.error('Failed to save questions to localStorage:', e);
  }
}

export function addOrUpdateQuestion(question: Question): Question[] {
  const current = loadQuestions();
  const existingIdx = current.findIndex((q) => q.id === question.id);
  let updated: Question[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = { ...question, updatedAt: new Date().toISOString() };
  } else {
    updated = [question, ...current];
  }
  saveQuestions(updated);
  return updated;
}

export function addOrUpdateBatchQuestions(newQuestions: Question[]): Question[] {
  const current = loadQuestions();
  const map = new Map<string, Question>();
  current.forEach((q) => map.set(q.id, q));
  newQuestions.forEach((q) => map.set(q.id, q));
  const updated = Array.from(map.values());
  saveQuestions(updated);
  return updated;
}

export function deleteQuestion(questionId: string): Question[] {
  const current = loadQuestions();
  const updated = current.filter((q) => q.id !== questionId);
  saveQuestions(updated);
  return updated;
}

// 2. User Learning History & Review List Storage
export function loadUserProgress(): Record<string, UserProgressRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error('Failed to load user progress:', e);
    return {};
  }
}

export function deleteUserProgress(questionId: string): Record<string, UserProgressRecord> {
  const allProgress = loadUserProgress();
  delete allProgress[questionId];
  saveUserProgress(allProgress);
  return allProgress;
}

export function saveUserProgress(progress: Record<string, UserProgressRecord>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  } catch (e) {
    console.error('Failed to save user progress:', e);
  }
}

/**
 * Record a dictation check or completion.
 * Rule from Spec:
 * - 一度でも間違えた問題は、自動的に個人の復習リストへ登録する (hasMistakeEver = true)
 * - 後日正解しても、復習リストから自動削除しない
 * - 挑戦回数、間違えた回数、初めて正解するまでの挑戦回数、最終学習日時を正確に記録
 */
export function recordStudyEvent(
  questionId: string,
  part: PartType,
  isMistakeMade: boolean,
  isCompleted: boolean
): UserProgressRecord {
  const allProgress = loadUserProgress();
  const existing = allProgress[questionId] || {
    questionId,
    part,
    attemptCount: 0,
    mistakeCount: 0,
    firstTryCorrect: true,
    lastStudiedAt: new Date().toISOString(),
    hasMistakeEver: false,
  };

  const newAttemptCount = existing.attemptCount + 1;
  const newMistakeCount = isMistakeMade ? existing.mistakeCount + 1 : existing.mistakeCount;
  const hasMistakeEver = existing.hasMistakeEver || isMistakeMade;
  const firstTryCorrect = existing.attemptCount === 0 ? !isMistakeMade : existing.firstTryCorrect;

  let firstCorrectAttemptCount = existing.firstCorrectAttemptCount;
  if (isCompleted && !firstCorrectAttemptCount) {
    firstCorrectAttemptCount = newAttemptCount;
  }

  const updatedRecord: UserProgressRecord = {
    ...existing,
    attemptCount: newAttemptCount,
    mistakeCount: newMistakeCount,
    hasMistakeEver,
    firstTryCorrect,
    firstCorrectAttemptCount,
    lastStudiedAt: new Date().toISOString(),
    completedAt: isCompleted ? new Date().toISOString() : existing.completedAt,
  };

  allProgress[questionId] = updatedRecord;
  saveUserProgress(allProgress);
  return updatedRecord;
}

// 3. Settings Storage
export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

// 4. Review List Queries
export function getReviewListQuestionIds(): string[] {
  const allProgress = loadUserProgress();
  return Object.values(allProgress)
    .filter((record) => record.hasMistakeEver)
    .map((record) => record.questionId);
}

// 5. User Profile (Google Auth simulation & Firestore-ready sync profile)
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  isLoggedIn: boolean;
  lastSyncedAt?: string;
}

export function loadUserProfile(): UserProfile {
  if (typeof window === 'undefined') {
    return {
      uid: 'guest-user',
      email: 'guest@toeic-dictation.local',
      displayName: 'ゲスト学習者',
      isLoggedIn: false,
    };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_PROFILE);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    uid: 'guest-user',
    email: 'guest@toeic-dictation.local',
    displayName: 'ゲスト学習者',
    isLoggedIn: false,
  };
}

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.AUTH_PROFILE, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save user profile:', e);
  }
}
