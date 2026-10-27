export type PartType = 1 | 2 | 3 | 4;

export interface DictationSentence {
  id: string;
  order: number;
  text: string;           // Target English sentence
  translation: string;    // Japanese translation
  startTime: number;      // Seconds
  endTime: number;        // Seconds
  speaker?: string;       // e.g. "Man", "Woman", "Speaker A"
}

export interface VocabularyItem {
  word: string;
  meaning: string;
}

export interface CommentaryData {
  extractedFromMaterial?: {
    questionNumber?: string;
    englishSentences?: { text: string; translation: string }[];
    grammarPoints?: string[];
    vocabulary?: VocabularyItem[];
    listeningTips?: string[];
  };
  aiSupplement?: {
    explanation?: string;
    difficultyRating?: string;
  };
  rawText?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface Question {
  id: string;
  part: PartType;
  questionNumber: number;
  title: string;
  description?: string;
  audioUrl?: string;          // base64, blob URL, or static sample
  audioFilename?: string;
  imageUrl?: string;          // For Part 1 photo or commentary page
  sentences: DictationSentence[];
  commentary?: CommentaryData;
  vocabulary?: VocabularyItem[];
  listeningTips?: string[];
  grammarPoints?: string[];
  isCustom?: boolean;         // User uploaded
  confidence?: 'high' | 'medium' | 'low';
  needsReview?: boolean;      // Low confidence marker "要確認"
  createdAt: string;
  updatedAt: string;
}

export interface WordSlot {
  index: number;
  rawWord: string;            // Original case, e.g. "Window."
  cleanWord: string;          // Normalized: "window"
  prefix: string;             // Leading punctuation, e.g. '"' or '('
  suffix: string;             // Trailing punctuation, e.g. '.' or ','
  isCorrect: boolean;         // When true, locked green
  currentInput: string;       // Current user typed value for this slot
  status: 'empty' | 'correct' | 'incorrect';
}

export interface UserProgressRecord {
  questionId: string;
  part: PartType;
  attemptCount: number;
  mistakeCount: number;
  firstTryCorrect: boolean;
  firstCorrectAttemptCount?: number;
  lastStudiedAt: string;
  hasMistakeEver: boolean;
  completedAt?: string;
}

export interface AppSettings {
  soundEnabled: boolean;
  soundVolume: number;
  playbackSpeed: number;      // 0.7, 0.8, 1.0, 1.2
  autoAdvanceSentence: boolean;
  repeatAudioOnMistake: boolean;
}

export type ReviewMode = 'none' | 'sequential' | 'random';
