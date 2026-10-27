import { WordSlot } from '../types';

/**
 * Normalizes a word for comparison:
 * - Lowercases
 * - Strips leading/trailing punctuation (quotes, periods, commas, question marks, exclamation marks, etc.)
 * - Preserves internal apostrophes (e.g., don't, they're) and hyphens (e.g., well-known)
 */
export function normalizeWord(word: string): string {
  if (!word) return '';
  return word
    .trim()
    .toLowerCase()
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
}

/**
 * Extracts prefix, suffix, and clean word from a raw token
 */
export function dissectToken(token: string): { prefix: string; clean: string; suffix: string } {
  const match = token.match(/^([^a-zA-Z0-9]*)(.*?)([^a-zA-Z0-9]*)$/);
  if (!match) {
    return { prefix: '', clean: normalizeWord(token), suffix: '' };
  }
  const prefix = match[1] || '';
  const body = match[2] || '';
  const suffix = match[3] || '';
  return {
    prefix,
    clean: normalizeWord(body),
    suffix,
  };
}

/**
 * Convert full English sentence text into initial WordSlot array
 */
export function createWordSlotsFromSentence(sentenceText: string): WordSlot[] {
  // Split on whitespace
  const tokens = sentenceText.trim().split(/\s+/).filter(Boolean);
  return tokens.map((token, index) => {
    const { prefix, clean, suffix } = dissectToken(token);
    return {
      index,
      rawWord: token,
      cleanWord: clean,
      prefix,
      suffix,
      isCorrect: false,
      currentInput: '',
      status: 'empty',
    };
  });
}

/**
 * Calculate Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,       // Deletion
        dp[i][j - 1] + 1,       // Insertion
        dp[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return dp[a.length][b.length];
}

/**
 * Needleman-Wunsch Sequence Alignment algorithm for words
 * Matches user's typed word tokens with target sentence word slots
 */
export function alignWords(
  targetSlots: WordSlot[],
  userInputText: string
): WordSlot[] {
  // Tokenize user input
  const userTokens = userInputText.trim().split(/\s+/).filter(Boolean);
  const userCleanTokens = userTokens.map(normalizeWord);

  const N = targetSlots.length;
  const M = userCleanTokens.length;

  if (M === 0) {
    // User entered nothing
    return targetSlots.map((slot) => ({
      ...slot,
      status: slot.isCorrect ? 'correct' : 'empty',
    }));
  }

  // Scoring parameters
  const MATCH_SCORE = 3;
  const GAP_PENALTY = -1.5;
  const MISMATCH_PENALTY = -2;

  // Initialize DP table
  const dp: number[][] = Array.from({ length: N + 1 }, () => new Array(M + 1).fill(0));

  for (let i = 0; i <= N; i++) dp[i][0] = i * GAP_PENALTY;
  for (let j = 0; j <= M; j++) dp[0][j] = j * GAP_PENALTY;

  for (let i = 1; i <= N; i++) {
    for (let j = 1; j <= M; j++) {
      const targetWord = targetSlots[i - 1].cleanWord;
      const userWord = userCleanTokens[j - 1];

      let matchScore = MISMATCH_PENALTY;
      if (targetWord === userWord) {
        matchScore = MATCH_SCORE;
      } else {
        // Partial similarity score for typos so alignment doesn't misalign surrounding correct words
        const lev = levenshteinDistance(targetWord, userWord);
        if (lev <= 1 && Math.max(targetWord.length, userWord.length) >= 4) {
          matchScore = -0.5;
        }
      }

      dp[i][j] = Math.max(
        dp[i - 1][j - 1] + matchScore, // Diagonal (align target i to user j)
        dp[i - 1][j] + GAP_PENALTY,    // Deletion (target skipped)
        dp[i][j - 1] + GAP_PENALTY     // Insertion (user word extra)
      );
    }
  }

  // Backtracking to find aligned pairs
  let i = N;
  let j = M;
  const matchedPairs: Map<number, string> = new Map(); // targetIndex -> userWord

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const targetWord = targetSlots[i - 1].cleanWord;
      const userWord = userCleanTokens[j - 1];
      let matchScore = MISMATCH_PENALTY;
      if (targetWord === userWord) {
        matchScore = MATCH_SCORE;
      } else {
        const lev = levenshteinDistance(targetWord, userWord);
        if (lev <= 1 && Math.max(targetWord.length, userWord.length) >= 4) {
          matchScore = -0.5;
        }
      }

      if (dp[i][j] === dp[i - 1][j - 1] + matchScore) {
        matchedPairs.set(i - 1, userWord);
        i--;
        j--;
        continue;
      }
    }

    if (i > 0 && dp[i][j] === dp[i - 1][j] + GAP_PENALTY) {
      // Target slot aligned to gap (user skipped it)
      i--;
    } else {
      // User word aligned to gap (extra word inserted by user)
      j--;
    }
  }

  // Update slots:
  // If target matched user word and exactly equals, LOCK AS CORRECT!
  // If previously correct, ALWAYS stay correct!
  return targetSlots.map((slot, index) => {
    if (slot.isCorrect) {
      return slot; // Already permanently locked
    }

    const alignedUserWord = matchedPairs.get(index);
    if (alignedUserWord && alignedUserWord === slot.cleanWord) {
      return {
        ...slot,
        isCorrect: true,
        currentInput: slot.rawWord,
        status: 'correct',
      };
    } else {
      return {
        ...slot,
        isCorrect: false,
        currentInput: alignedUserWord || '',
        status: alignedUserWord ? 'incorrect' : 'empty',
      };
    }
  });
}

/**
 * Validates slot-by-slot re-entered values against remaining unsolved slots
 */
export function validateSlotReEntry(
  currentSlots: WordSlot[],
  slotInputs: Record<number, string>
): {
  updatedSlots: WordSlot[];
  allCorrect: boolean;
  newlyCorrectCount: number;
} {
  let newlyCorrectCount = 0;

  const updatedSlots = currentSlots.map((slot, index) => {
    if (slot.isCorrect) {
      return slot;
    }

    const userVal = slotInputs[index]?.trim() || '';
    const cleanUserVal = normalizeWord(userVal);

    if (cleanUserVal === slot.cleanWord) {
      newlyCorrectCount++;
      return {
        ...slot,
        isCorrect: true,
        currentInput: userVal,
        status: 'correct' as const,
      };
    } else {
      return {
        ...slot,
        currentInput: userVal,
        status: (userVal ? 'incorrect' : 'empty') as 'incorrect' | 'empty',
      };
    }
  });

  const allCorrect = updatedSlots.every((s) => s.isCorrect);

  return {
    updatedSlots,
    allCorrect,
    newlyCorrectCount,
  };
}
