import React, { useState, useEffect, useRef } from 'react';
import {
  Question,
  WordSlot,
  DictationSentence,
  AppSettings,
  UserProgressRecord,
} from '../types';
import {
  alignWords,
  createWordSlotsFromSentence,
  validateSlotReEntry,
  normalizeWord,
} from '../utils/alignment';
import { soundManager } from '../utils/sound';
import { recordStudyEvent } from '../utils/storage';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Check,
  ArrowRight,
  HelpCircle,
  Sparkles,
  Info,
  ChevronLeft,
  ListRestart,
  Repeat,
  Lightbulb,
  Flag,
  CheckCircle2,
  Edit3,
} from 'lucide-react';

interface DictationViewProps {
  question: Question;
  settings: AppSettings;
  onComplete: () => void;
  onBack: () => void;
  onRecordProgress: (rec: UserProgressRecord) => void;
  onEditQuestion?: () => void;
}

export const DictationView: React.FC<DictationViewProps> = ({
  question,
  settings,
  onComplete,
  onBack,
  onRecordProgress,
  onEditQuestion,
}) => {
  // Current sentence index for Part 3 & 4 (0-based)
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState<number>(0);
  const currentSentence: DictationSentence =
    question.sentences[currentSentenceIdx] || question.sentences[0];

  // Dictation States
  // 'initial' = user hasn't submitted yet (full text input)
  // 'correcting' = at least one attempt submitted, word slots displayed (green locked + empty inputs)
  // 'completed' = current sentence is 100% correct
  const [phase, setPhase] = useState<'initial' | 'correcting' | 'completed'>('initial');

  // Initial full input text
  const [fullInputText, setFullInputText] = useState<string>('');

  // Word slots for current sentence
  const [wordSlots, setWordSlots] = useState<WordSlot[]>([]);

  // Individual blank inputs when correcting: slotIndex -> string
  const [slotInputs, setSlotInputs] = useState<Record<number, string>>({});

  // Audio Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(settings.playbackSpeed || 1.0);
  const [audioMode, setAudioMode] = useState<'sentence' | 'full'>('sentence');
  const [isLooping, setIsLooping] = useState<boolean>(false);

  // References to keep audio management rock solid
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loopTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioModeRef = useRef<'sentence' | 'full'>('sentence');
  audioModeRef.current = audioMode;
  const isLoopingRef = useRef<boolean>(false);
  isLoopingRef.current = isLooping;
  const speedRef = useRef<number>(playbackSpeed);
  speedRef.current = playbackSpeed;

  // Active slot index for hint targeting
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);

  // Feedback notifications
  const [hintMessage, setHintMessage] = useState<string | null>(null);

  // Mistake tracker for this sentence session
  const [hasMistakeInSentence, setHasMistakeInSentence] = useState<boolean>(false);

  // Shake animation trigger on incorrect
  const [shakeTrigger, setShakeTrigger] = useState<boolean>(false);

  // Refs for slot input auto-focusing
  const slotRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});
  const initialInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Safe Audio Stop Function: Cancels loop timers, HTML5 audio, and speech synthesis cleanly
  const stopAllAudio = () => {
    if (loopTimerRef.current) {
      clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.ontimeupdate = null;
      audioRef.current.onended = null;
      audioRef.current.pause();
    }
    soundManager.stopSpeaking();
    setIsPlaying(false);
  };

  // Initialize or reset sentence state when question or current sentence changes
  useEffect(() => {
    stopAllAudio();
    if (!currentSentence) return;

    const initialSlots = createWordSlotsFromSentence(currentSentence.text);
    setWordSlots(initialSlots);
    setPhase('initial');
    setFullInputText('');
    setSlotInputs({});
    setHasMistakeInSentence(false);
    setHintMessage(null);
    setActiveSlotIdx(null);

    // Auto-focus input
    const timer = setTimeout(() => {
      initialInputRef.current?.focus();
    }, 150);

    return () => {
      clearTimeout(timer);
      stopAllAudio();
    };
  }, [currentSentenceIdx, question.id]);

  // Update sound manager configuration
  useEffect(() => {
    soundManager.setConfig(settings.soundEnabled, settings.soundVolume);
  }, [settings.soundEnabled, settings.soundVolume]);

  // Clean cleanup on component unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  // Main Audio Playback Handler
  const startAudioPlayback = (mode: 'sentence' | 'full' = audioModeRef.current, rate: number = speedRef.current) => {
    stopAllAudio();

    if (question.audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(question.audioUrl);
      }
      const audio = audioRef.current;
      audio.playbackRate = rate;
      audio.defaultPlaybackRate = rate;

      if (mode === 'sentence' && currentSentence.startTime !== undefined) {
        audio.currentTime = currentSentence.startTime;
        const stopTime = currentSentence.endTime;

        audio.ontimeupdate = () => {
          if (stopTime && audio.currentTime >= stopTime) {
            audio.ontimeupdate = null;
            if (isLoopingRef.current) {
              audio.currentTime = currentSentence.startTime;
              audio.play().catch(() => {});
            } else {
              audio.pause();
              setIsPlaying(false);
            }
          }
        };
      } else {
        // Full audio mode: plays the whole file
        audio.currentTime = 0;
        audio.ontimeupdate = null;
      }

      audio.onended = () => {
        if (isLoopingRef.current && mode === 'full') {
          audio.currentTime = 0;
          audio.play().catch(() => {});
        } else {
          setIsPlaying(false);
        }
      };

      audio.play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn('Audio element play failed, falling back to speech synthesis:', err);
          executeSpeechFallback(mode, rate);
        });
    } else {
      executeSpeechFallback(mode, rate);
    }
  };

  const executeSpeechFallback = (mode: 'sentence' | 'full', rate: number) => {
    setIsPlaying(true);
    let textToSpeak = '';
    if (mode === 'full') {
      textToSpeak = question.sentences
        .map((s) => (s.speaker ? `${s.speaker}: ${s.text}` : s.text))
        .join('. ');
    } else {
      textToSpeak = currentSentence.text;
    }

    soundManager.speakText(textToSpeak, rate, () => {
      setIsPlaying(false);
      if (isLoopingRef.current) {
        loopTimerRef.current = setTimeout(() => {
          startAudioPlayback(mode, rate);
        }, 500);
      }
    });
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopAllAudio();
    } else {
      startAudioPlayback(audioMode, playbackSpeed);
    }
  };

  const replayAudio = () => {
    startAudioPlayback(audioMode, playbackSpeed);
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    speedRef.current = speed;

    if (isPlaying) {
      // Re-trigger playback seamlessly with new speed immediately
      startAudioPlayback(audioMode, speed);
    } else if (audioRef.current) {
      audioRef.current.playbackRate = speed;
      audioRef.current.defaultPlaybackRate = speed;
    }
  };

  const switchAudioMode = (newMode: 'sentence' | 'full') => {
    setAudioMode(newMode);
    audioModeRef.current = newMode;
    startAudioPlayback(newMode, playbackSpeed);
  };

  const toggleLoop = () => {
    const nextVal = !isLooping;
    setIsLooping(nextVal);
    isLoopingRef.current = nextVal;
  };

  // EVALUATION STEP 1: Full Initial Input Check
  const handleCheckInitial = () => {
    if (!fullInputText.trim()) return;

    // Run sequence alignment against target sentence
    const aligned = alignWords(wordSlots, fullInputText);
    const allCorrect = aligned.every((slot) => slot.isCorrect);

    if (allCorrect) {
      // 100% Correct on first try!
      soundManager.playCorrect();
      setWordSlots(aligned);
      setPhase('completed');
      handleSentenceSuccess(false);
    } else {
      // Partial correct or errors
      soundManager.playIncorrect();
      setShakeTrigger(true);
      setTimeout(() => setShakeTrigger(false), 500);

      setHasMistakeInSentence(true);

      // Record mistake immediately to register into review list
      const rec = recordStudyEvent(question.id, question.part, true, false);
      onRecordProgress(rec);

      // Populate slot inputs with misaligned / incorrect words so user can re-try
      const initialSlotInputs: Record<number, string> = {};
      aligned.forEach((slot, idx) => {
        if (!slot.isCorrect) {
          initialSlotInputs[idx] = slot.currentInput || '';
        }
      });

      setWordSlots(aligned);
      setSlotInputs(initialSlotInputs);
      setPhase('correcting');

      // Focus first unsolved slot
      setTimeout(() => {
        const firstUnsolvedIdx = aligned.findIndex((s) => !s.isCorrect);
        if (firstUnsolvedIdx >= 0) {
          slotRefs.current[firstUnsolvedIdx]?.focus();
          setActiveSlotIdx(firstUnsolvedIdx);
        }
      }, 100);
    }
  };

  // EVALUATION STEP 2: Slot-by-Slot Re-entry Check
  const handleCheckReEntry = () => {
    const { updatedSlots, allCorrect, newlyCorrectCount } = validateSlotReEntry(
      wordSlots,
      slotInputs
    );

    setWordSlots(updatedSlots);

    if (allCorrect) {
      soundManager.playCorrect();
      setPhase('completed');
      handleSentenceSuccess(hasMistakeInSentence);
    } else {
      if (newlyCorrectCount > 0) {
        soundManager.playCorrect();
      } else {
        soundManager.playIncorrect();
        setShakeTrigger(true);
        setTimeout(() => setShakeTrigger(false), 500);
      }

      setHasMistakeInSentence(true);

      const rec = recordStudyEvent(question.id, question.part, true, false);
      onRecordProgress(rec);

      // Re-focus next unsolved slot
      const nextUnsolved = updatedSlots.findIndex((s) => !s.isCorrect);
      if (nextUnsolved >= 0) {
        slotRefs.current[nextUnsolved]?.focus();
        setActiveSlotIdx(nextUnsolved);
      }
    }
  };

  // FEATURE 2A: HINT (1 character disclosure)
  const handleProvideHint = () => {
    // If user is currently in initial phase, switch to correcting view first with whatever they typed
    let targetSlots = wordSlots;
    let currentInputs = { ...slotInputs };

    if (phase === 'initial') {
      const aligned = alignWords(wordSlots, fullInputText);
      targetSlots = aligned;
      aligned.forEach((slot, idx) => {
        if (!slot.isCorrect) {
          currentInputs[idx] = slot.currentInput || '';
        }
      });
      setWordSlots(aligned);
      setSlotInputs(currentInputs);
      setPhase('correcting');
    }

    // Find target slot to hint: active slot or first unsolved slot
    let targetIdx = activeSlotIdx !== null && !targetSlots[activeSlotIdx]?.isCorrect
      ? activeSlotIdx
      : targetSlots.findIndex((s) => !s.isCorrect);

    if (targetIdx === -1) return;

    const targetSlot = targetSlots[targetIdx];
    const correctClean = targetSlot.cleanWord; // e.g. "standing"
    const currentVal = currentInputs[targetIdx] || '';

    // Calculate how many characters to reveal
    let newLength = 1;
    if (correctClean.startsWith(currentVal.toLowerCase())) {
      newLength = Math.min(correctClean.length, currentVal.length + 1);
    }
    const hintedPrefix = correctClean.slice(0, newLength);

    currentInputs[targetIdx] = hintedPrefix;
    setSlotInputs(currentInputs);

    // If fully revealed by hint, lock it as correct
    if (newLength === correctClean.length) {
      const updated = targetSlots.map((s, idx) =>
        idx === targetIdx
          ? { ...s, isCorrect: true, currentInput: targetSlot.rawWord, status: 'correct' as const }
          : s
      );
      setWordSlots(updated);

      if (updated.every((s) => s.isCorrect)) {
        soundManager.playCorrect();
        setPhase('completed');
        handleSentenceSuccess(true);
        return;
      }
    }

    // Trigger mistake record so this problem enters review list
    setHasMistakeInSentence(true);
    const rec = recordStudyEvent(question.id, question.part, true, false);
    onRecordProgress(rec);

    setHintMessage(`💡 ヒント: 「${hintedPrefix}…」を補完しました（復習リストに登録）`);
    setTimeout(() => setHintMessage(null), 3500);

    // Focus the hinted input
    slotRefs.current[targetIdx]?.focus();
    setActiveSlotIdx(targetIdx);
  };

  // FEATURE 2B: GIVE UP / SHOW ANSWER (詰み防止・回答表示して次へ)
  const handleGiveUpAndShowAnswer = () => {
    stopAllAudio();
    setHasMistakeInSentence(true);

    // Lock all slots as correct with actual target words
    const revealedSlots: WordSlot[] = wordSlots.map((slot) => ({
      ...slot,
      isCorrect: true,
      currentInput: slot.rawWord,
      status: 'correct',
    }));

    setWordSlots(revealedSlots);
    setPhase('completed');

    // Record as mistake with guaranteed review registration
    const isLastSentence = currentSentenceIdx === question.sentences.length - 1;
    const rec = recordStudyEvent(question.id, question.part, true, isLastSentence);
    onRecordProgress(rec);

    setHintMessage('正解を表示しました（復習リストに登録されました）');
  };

  // Handle sentence completion
  const handleSentenceSuccess = (mistakeMade: boolean) => {
    const isLastSentence = currentSentenceIdx === question.sentences.length - 1;
    const rec = recordStudyEvent(question.id, question.part, mistakeMade, isLastSentence);
    onRecordProgress(rec);
  };

  const goToNextSentence = () => {
    stopAllAudio();
    if (currentSentenceIdx < question.sentences.length - 1) {
      setCurrentSentenceIdx((prev) => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleSlotInputChange = (index: number, val: string) => {
    setSlotInputs((prev) => ({ ...prev, [index]: val }));
  };

  const handleSlotKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === ' ' || e.key === 'Tab') {
      e.preventDefault();
      const remainingSlots = wordSlots
        .map((s, idx) => ({ ...s, idx }))
        .filter((s) => !s.isCorrect && s.idx > index);

      if (remainingSlots.length > 0) {
        slotRefs.current[remainingSlots[0].idx]?.focus();
        setActiveSlotIdx(remainingSlots[0].idx);
      } else {
        handleCheckReEntry();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleCheckReEntry();
    }
  };

  const handleResetToFullText = () => {
    setPhase('initial');
    setFullInputText('');
    setSlotInputs({});
    setTimeout(() => initialInputRef.current?.focus(), 50);
  };

  const totalSentences = question.sentences.length;
  const isMultiSentence = totalSentences > 1;
  const solvedCount = wordSlots.filter((s) => s.isCorrect).length;
  const totalWords = wordSlots.length;
  const isLastSentence = currentSentenceIdx === totalSentences - 1;

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-5 pb-16">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => {
            stopAllAudio();
            onBack();
          }}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>一覧へ戻る</span>
        </button>

        <div className="flex items-center gap-2 truncate">
          <div className="flex items-center gap-2 truncate">
            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60 shrink-0">
              Part {question.part} - No. {question.questionNumber}
            </span>
            <span className="text-xs text-slate-400 font-medium truncate">
              {question.title}
            </span>
          </div>

          {onEditQuestion && (
            <button
              type="button"
              onClick={onEditQuestion}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
              title="この問題を編集"
            >
              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">編集</span>
            </button>
          )}
        </div>
      </div>

      {/* Part 1 Photo display (if available) */}
      {question.part === 1 && question.imageUrl && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-2 flex justify-center">
          <img
            src={question.imageUrl}
            alt="Part 1 Photo Context"
            className="max-h-64 sm:max-h-72 w-auto object-contain rounded-xl shadow-md"
          />
        </div>
      )}

      {/* Sentence Progress Tabs for Part 3 & 4 */}
      {isMultiSentence && (
        <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between px-3 py-1 text-xs text-slate-400 font-medium">
            <span>
              文の進捗: <strong className="text-white">{currentSentenceIdx + 1}</strong> / {totalSentences} 文
            </span>
            {currentSentence.speaker && (
              <span className="text-cyan-400 font-semibold bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                話者: {currentSentence.speaker}
              </span>
            )}
          </div>
          <div className="flex gap-2 overflow-x-auto p-1 scrollbar-none">
            {question.sentences.map((sent, idx) => {
              const isCurrent = idx === currentSentenceIdx;
              const isPast = idx < currentSentenceIdx;
              return (
                <button
                  key={sent.id}
                  onClick={() => {
                    stopAllAudio();
                    setCurrentSentenceIdx(idx);
                  }}
                  className={`flex-1 min-w-[65px] py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1 ${
                    isCurrent
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-950 scale-102'
                      : isPast
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
                  }`}
                >
                  {isPast ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                  <span>文 {idx + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* AUDIO PLAYER BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Main Play / Pause & Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-cyan-950 transition-all shrink-0"
              title={isPlaying ? '一時停止 (Stop)' : '再生 (Play)'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={replayAudio}
              className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0"
              title="最初から再生（リプレイ）"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={toggleLoop}
              className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shrink-0 ${
                isLooping
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title="リピート再生のON/OFF"
            >
              <Repeat className="w-4 h-4" />
              <span className="hidden sm:inline">リピート</span>
            </button>
          </div>

          {/* Speed Selector (0.7x, 0.8x, 1.0x, 1.2x) */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 overflow-x-auto">
            <span className="text-[11px] text-slate-400 px-1.5 font-medium shrink-0">速度:</span>
            {[0.7, 0.8, 1.0, 1.2].map((spd) => (
              <button
                key={spd}
                onClick={() => changeSpeed(spd)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  playbackSpeed === spd
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {spd === 1.0 ? '1.0x (標準)' : `${spd}x`}
              </button>
            ))}
          </div>

          {/* Part 3 & 4 Audio scope toggle (Current sentence vs Full Talk) */}
          {isMultiSentence && (
            <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 text-xs">
              <button
                onClick={() => switchAudioMode('sentence')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  audioMode === 'sentence'
                    ? 'bg-cyan-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                現在の文
              </button>
              <button
                onClick={() => switchAudioMode('full')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  audioMode === 'full'
                    ? 'bg-cyan-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                全体音声
              </button>
            </div>
          )}
        </div>

        {/* Audio Status Banner */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
          <span className="flex items-center gap-1.5 truncate">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            {isPlaying ? (
              <span className="text-cyan-400 font-medium animate-pulse truncate">
                再生中: {audioMode === 'sentence' ? `文 ${currentSentenceIdx + 1} を再生中` : '全体音声を再生中'} ({playbackSpeed}x)
              </span>
            ) : (
              <span className="truncate">再生ボタンを押して音声を聴いてください</span>
            )}
          </span>

          <span className="text-slate-500 text-[11px] shrink-0 ml-2">
            単語: {solvedCount}/{totalWords} (正解)
          </span>
        </div>
      </div>

      {/* Hint Alert Notice */}
      {hintMessage && (
        <div className="p-3 rounded-xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between animate-fade-in shadow-md">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-medium">{hintMessage}</span>
          </div>
          <button
            onClick={() => setHintMessage(null)}
            className="text-amber-400 hover:text-white ml-2 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* CORE DICTATION WORKSPACE */}
      <div
        className={`bg-slate-900 border rounded-2xl p-4 sm:p-6 shadow-xl transition-all duration-300 ${
          shakeTrigger
            ? 'border-rose-500 shadow-rose-950/50 animate-shake ring-2 ring-rose-500/30'
            : phase === 'completed'
            ? 'border-emerald-500/70 bg-emerald-950/15'
            : 'border-slate-800'
        }`}
      >
        {/* PHASE 1: INITIAL FULL INPUT */}
        {phase === 'initial' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>英文を入力してください（聞き取れた単語を入力）</span>
              </label>
              <span className="text-xs text-slate-400 hidden sm:inline">PC: Enterキーで判定</span>
            </div>

            <textarea
              ref={initialInputRef}
              value={fullInputText}
              onChange={(e) => setFullInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleCheckInitial();
                }
              }}
              rows={3}
              placeholder="例: The woman is standing beside the window."
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 text-white rounded-xl p-3 sm:p-4 text-base sm:text-lg font-medium leading-relaxed outline-none transition-all placeholder:text-slate-600"
            />

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleProvideHint}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-amber-950/40 text-amber-300 border border-slate-700 hover:border-amber-500/40 flex items-center justify-center gap-1.5 transition-colors"
                  title="聞き取れない時に1文字開示"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>ヒント（1文字開示）</span>
                </button>

                <button
                  type="button"
                  onClick={handleGiveUpAndShowAnswer}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-950/40 text-rose-300 border border-slate-700 hover:border-rose-500/40 flex items-center justify-center gap-1.5 transition-colors"
                  title="どうしても聞き取れない時に正解を表示して次へ"
                >
                  <Flag className="w-3.5 h-3.5 text-rose-400" />
                  <span>答えを表示して次へ</span>
                </button>
              </div>

              <button
                onClick={handleCheckInitial}
                disabled={!fullInputText.trim()}
                className="px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:pointer-events-none text-white shadow-lg shadow-cyan-950 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <span>判定する (Check)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* PHASE 2: PARTIAL CORRECTION (Green Locked Words + Re-input Blanks) */}
        {phase === 'correcting' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>正解単語は緑で固定。空欄部分のみ再入力してください。</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Spaceキーで次の空欄へ。聞き取れない場合はヒントや答え表示も使えます。
                </p>
              </div>

              <button
                onClick={handleResetToFullText}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 p-1.5 rounded-lg hover:bg-slate-800 shrink-0"
                title="最初から全文を入力し直す"
              >
                <ListRestart className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">最初からやり直す</span>
              </button>
            </div>

            {/* Word Chips & Inline Blanks Display */}
            <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-wrap items-center gap-2 sm:gap-2.5 min-h-[130px] leading-loose">
              {wordSlots.map((slot, index) => {
                if (slot.isCorrect) {
                  // LOCKED CORRECT WORD BADGE
                  return (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-300 text-sm sm:text-base font-bold shadow-sm select-none"
                    >
                      <span>{slot.prefix}</span>
                      <span>{slot.rawWord.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')}</span>
                      <span>{slot.suffix}</span>
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[3]" />
                    </span>
                  );
                } else {
                  // UNRESOLVED BLANK INPUT
                  const isError = slot.status === 'incorrect';
                  return (
                    <span key={index} className="inline-flex items-center gap-0.5">
                      {slot.prefix && <span className="text-slate-500 text-sm">{slot.prefix}</span>}
                      <input
                        ref={(el) => {
                          slotRefs.current[index] = el;
                        }}
                        type="text"
                        value={slotInputs[index] || ''}
                        onFocus={() => setActiveSlotIdx(index)}
                        onChange={(e) => handleSlotInputChange(index, e.target.value)}
                        onKeyDown={(e) => handleSlotKeyDown(index, e)}
                        placeholder={`[ 空欄 ${index + 1} ]`}
                        className={`w-24 sm:w-28 px-2 sm:px-2.5 py-1.5 rounded-xl text-center text-sm sm:text-base font-bold bg-slate-900 border-2 outline-none transition-all placeholder:text-slate-600 ${
                          isError
                            ? 'border-rose-500/80 text-rose-200 bg-rose-950/20 focus:border-rose-400'
                            : 'border-cyan-500/60 text-white focus:border-cyan-400 focus:bg-slate-850 shadow-inner'
                        }`}
                      />
                      {slot.suffix && <span className="text-slate-500 text-sm">{slot.suffix}</span>}
                    </span>
                  );
                }
              })}
            </div>

            {/* Bottom Actions for Correction & Rescue Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleProvideHint}
                  className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-amber-950/40 text-amber-300 border border-slate-700 hover:border-amber-500/40 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  title="空欄の1文字を開示"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>ヒント（1文字開示）</span>
                </button>

                <button
                  type="button"
                  onClick={handleGiveUpAndShowAnswer}
                  className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-rose-950/40 text-rose-300 border border-slate-700 hover:border-rose-500/40 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                  title="文の正解を表示して復習リスト入り"
                >
                  <Flag className="w-3.5 h-3.5 text-rose-400" />
                  <span>答えを表示（ギブアップ）</span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 hidden md:inline">
                  残り: <strong className="text-cyan-400">{totalWords - solvedCount}</strong> 箇所
                </span>

                <button
                  onClick={handleCheckReEntry}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-sm bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>空欄を判定する (Enter)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PHASE 3: COMPLETED SENTENCE BANNER (High Visibility Next Transition) */}
        {phase === 'completed' && (
          <div className="space-y-5 animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center shadow-md">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
              <span>正解！この文のディクテーションが完成しました</span>
            </div>

            {/* Revealed Target Sentence */}
            <div className="bg-slate-950 border border-emerald-500/40 rounded-2xl p-4 sm:p-6 space-y-2.5 shadow-inner">
              <p className="text-lg sm:text-xl font-bold text-white tracking-wide leading-relaxed">
                {currentSentence.text}
              </p>
              <p className="text-sm sm:text-base text-slate-300 font-medium">
                {currentSentence.translation}
              </p>
            </div>

            {/* Action to Next Sentence or Completion */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <button
                onClick={replayAudio}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>この文をもう一度聴く</span>
              </button>

              {!isLastSentence ? (
                <button
                  onClick={goToNextSentence}
                  className="px-6 py-3 rounded-xl text-sm sm:text-base font-extrabold bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 active:scale-95 transition-all animate-pulse"
                >
                  <span>正解！次の文（文 {currentSentenceIdx + 2} / {totalSentences}）へ進む</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    stopAllAudio();
                    onComplete();
                  }}
                  className="px-6 py-3 rounded-xl text-sm sm:text-base font-extrabold bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-white shadow-xl shadow-cyan-950 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <CheckCircle2 className="w-5 h-5 text-cyan-300" />
                  <span>全問完成！解説・結果画面へ進む</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Helpful Hint / Phonetic Phenomenon Note */}
      {question.listeningTips && question.listeningTips.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-xs space-y-1.5">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>リスニングのポイント (音声の聞き取り方):</span>
          </div>
          <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1">
            {question.listeningTips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
