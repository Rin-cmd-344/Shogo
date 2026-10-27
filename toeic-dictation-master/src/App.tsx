import React, { useState, useEffect } from 'react';
import {
  PartType,
  Question,
  UserProgressRecord,
  AppSettings,
  ReviewMode,
} from './types';
import {
  loadQuestions,
  loadUserProgress,
  loadSettings,
  saveSettings,
  loadUserProfile,
  deleteQuestion,
  addOrUpdateQuestion,
  addOrUpdateBatchQuestions,
  deleteUserProgress,
  UserProfile,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { PartSelector } from './components/PartSelector';
import { QuestionList } from './components/QuestionList';
import { DictationView } from './components/DictationView';
import { CompletionView } from './components/CompletionView';
import { ReviewModal } from './components/ReviewModal';
import { RegisterModal } from './components/RegisterModal';
import { AuthSyncModal } from './components/AuthSyncModal';
import { EditQuestionModal } from './components/EditQuestionModal';
import {
  BookOpen,
  Headphones,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  X,
  Shuffle,
  ListOrdered,
} from 'lucide-react';

export default function App() {
  // Navigation / View state
  const [currentView, setCurrentView] = useState<'home' | 'dictation' | 'completion'>('home');
  const [selectedPart, setSelectedPart] = useState<PartType>(1);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);

  // Data states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [progress, setProgress] = useState<Record<string, UserProgressRecord>>({});
  const [settings, setSettings] = useState<AppSettings>(loadSettings());
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile());

  // Modals state
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  // Review Mode state
  const [reviewMode, setReviewMode] = useState<ReviewMode>('none');
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);
  const [reviewCurrentIndex, setReviewCurrentIndex] = useState<number>(0);

  // Initial load
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const qList = loadQuestions();
    const pMap = loadUserProgress();
    setQuestions(qList);
    setProgress(pMap);
  };

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Start dictation for a specific question
  const handleStartQuestion = (q: Question) => {
    setActiveQuestion(q);
    setCurrentView('dictation');
  };

  // Called when user finishes dictation for current question
  const handleDictationComplete = () => {
    setCurrentView('completion');
  };

  // Move to next question or exit review
  const handleNextQuestion = () => {
    if (reviewMode !== 'none' && reviewQueue.length > 0) {
      const nextIdx = reviewCurrentIndex + 1;
      if (nextIdx < reviewQueue.length) {
        setReviewCurrentIndex(nextIdx);
        const nextQ = questions.find((q) => q.id === reviewQueue[nextIdx]);
        if (nextQ) {
          setActiveQuestion(nextQ);
          setCurrentView('dictation');
          return;
        }
      } else {
        // Finished review queue
        setReviewMode('none');
        setReviewQueue([]);
        setCurrentView('home');
        return;
      }
    }

    // Normal sequential progression in current Part
    if (activeQuestion) {
      const partQuestions = questions.filter((q) => q.part === activeQuestion.part);
      const currentIndex = partQuestions.findIndex((q) => q.id === activeQuestion.id);
      if (currentIndex >= 0 && currentIndex < partQuestions.length - 1) {
        setActiveQuestion(partQuestions[currentIndex + 1]);
        setCurrentView('dictation');
        return;
      }
    }

    setCurrentView('home');
  };

  // Start Review Mode
  const handleStartReview = (mode: ReviewMode, specificQuestionId?: string) => {
    if (specificQuestionId) {
      const target = questions.find((q) => q.id === specificQuestionId);
      if (target) {
        setReviewMode('none');
        setActiveQuestion(target);
        setCurrentView('dictation');
      }
      return;
    }

    // Get all review questions
    const reviewQIds = questions
      .filter((q) => progress[q.id]?.hasMistakeEver)
      .map((q) => q.id);

    if (reviewQIds.length === 0) return;

    let queue = [...reviewQIds];
    if (mode === 'random') {
      // Fisher-Yates shuffle
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
    }

    setReviewMode(mode);
    setReviewQueue(queue);
    setReviewCurrentIndex(0);

    const firstQ = questions.find((q) => q.id === queue[0]);
    if (firstQ) {
      setActiveQuestion(firstQ);
      setCurrentView('dictation');
    }
  };

  const handleExitReviewMode = () => {
    setReviewMode('none');
    setReviewQueue([]);
    setCurrentView('home');
  };

  const handleSaveQuestion = (newQuestion: Question) => {
    const updated = addOrUpdateQuestion(newQuestion);
    setQuestions(updated);
    setSelectedPart(newQuestion.part);
  };

  const handleSaveBatchQuestions = (newQuestions: Question[]) => {
    const updated = addOrUpdateBatchQuestions(newQuestions);
    setQuestions(updated);
    if (newQuestions.length > 0) {
      setSelectedPart(newQuestions[0].part);
    }
  };

  const handleOpenEditModal = (q: Question) => {
    setEditingQuestion(q);
    setIsEditModalOpen(true);
  };

  const handleSaveEditedQuestion = (updatedQuestion: Question) => {
    const updated = addOrUpdateQuestion(updatedQuestion);
    setQuestions(updated);
    if (activeQuestion?.id === updatedQuestion.id) {
      setActiveQuestion(updatedQuestion);
    }
    setIsEditModalOpen(false);
  };

  const handleDeleteQuestion = (questionId: string) => {
    const updated = deleteQuestion(questionId);
    const newProgress = deleteUserProgress(questionId);
    setQuestions(updated);
    setProgress(newProgress);
    if (activeQuestion?.id === questionId) {
      setActiveQuestion(null);
      setReviewMode('none');
      setCurrentView('home');
    }
  };

  const handleRecordProgress = (rec: UserProgressRecord) => {
    setProgress((prev) => ({ ...prev, [rec.questionId]: rec }));
  };

  // Statistics
  const reviewCount = questions.filter((q) => progress[q.id]?.hasMistakeEver).length;
  const completedCount = questions.filter((q) => progress[q.id]?.completedAt).length;
  const totalQuestions = questions.length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Navbar
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        reviewCount={reviewCount}
        onOpenReviewModal={() => setIsReviewModalOpen(true)}
        onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onGoHome={() => {
          setReviewMode('none');
          setCurrentView('home');
        }}
        userProfile={userProfile}
      />

      {/* Review Mode Active Sticky Banner */}
      {reviewMode !== 'none' && currentView === 'dictation' && (
        <div className="bg-gradient-to-r from-rose-950/90 to-indigo-950/90 border-b border-rose-500/40 px-4 py-2 text-xs flex items-center justify-between sticky top-16 z-30 shadow-md">
          <div className="flex items-center gap-2">
            {reviewMode === 'random' ? (
              <Shuffle className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <ListOrdered className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span className="font-bold text-white">
              {reviewMode === 'random' ? 'ランダム復習モード' : '順番復習モード'}:
            </span>
            <span className="text-rose-200">
              {reviewCurrentIndex + 1} / {reviewQueue.length} 問中
            </span>
          </div>

          <button
            onClick={handleExitReviewMode}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 font-semibold"
          >
            <X className="w-3.5 h-3.5" />
            <span>復習を終了</span>
          </button>
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* VIEW 1: HOME */}
        {currentView === 'home' && (
          <div className="space-y-6 sm:space-y-8 animate-fade-in">
            {/* Hero / Quick Stats Header */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-7 shadow-xl relative overflow-hidden">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-[11px] sm:text-xs font-semibold mb-2 sm:mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>TOEIC Listening Part 1〜4 特化型ディクテーション</span>
                </div>

                <h1 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight mb-2">
                  正解した単語を残し、
                  <br className="hidden sm:inline" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">
                    間違った箇所だけを再入力
                  </span>
                  する効率学習
                </h1>

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6">
                  編集距離アルゴリズムによる単語自動アラインメント。聞き取れた単語は緑色でロックされ、聞き落とした単語・スペルミスの空欄だけをピンポイントで再挑戦。弱点を確実に克服できます。
                </p>

                {/* Quick stats pills */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-xl">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>
                      習得済み: <strong className="text-white">{completedCount}</strong> / {totalQuestions}問
                    </span>
                  </div>

                  <div className="flex items-center gap-2 bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-xl">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    <span>
                      達成率:{' '}
                      <strong className="text-white">
                        {totalQuestions > 0 ? Math.round((completedCount / totalQuestions) * 100) : 0}%
                      </strong>
                    </span>
                  </div>

                  {reviewCount > 0 && (
                    <button
                      onClick={() => setIsReviewModalOpen(true)}
                      className="flex items-center gap-2 bg-rose-950/60 border border-rose-500/40 text-rose-300 px-3.5 py-2 rounded-xl hover:bg-rose-900/60 transition-colors"
                    >
                      <BookOpen className="w-4 h-4 text-rose-400" />
                      <span>
                        要復習: <strong className="text-white">{reviewCount}問</strong>
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Part Selector 4 Cards */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                学習するパートを選択
              </h2>
              <PartSelector
                selectedPart={selectedPart}
                onSelectPart={setSelectedPart}
                questions={questions}
                progress={progress}
              />
            </div>

            {/* Questions List for Selected Part */}
            <QuestionList
              part={selectedPart}
              questions={questions}
              progress={progress}
              onSelectQuestion={handleStartQuestion}
              onEditQuestion={handleOpenEditModal}
              onDeleteQuestion={handleDeleteQuestion}
            />
          </div>
        )}

        {/* VIEW 2: DICTATION */}
        {currentView === 'dictation' && activeQuestion && (
          <DictationView
            question={activeQuestion}
            settings={settings}
            onComplete={handleDictationComplete}
            onBack={() => {
              setReviewMode('none');
              setCurrentView('home');
            }}
            onRecordProgress={handleRecordProgress}
            onEditQuestion={() => handleOpenEditModal(activeQuestion)}
          />
        )}

        {/* VIEW 3: COMPLETION & COMMENTARY */}
        {currentView === 'completion' && activeQuestion && (
          <CompletionView
            question={activeQuestion}
            record={progress[activeQuestion.id]}
            onRetry={() => setCurrentView('dictation')}
            onNextQuestion={handleNextQuestion}
            onBackToList={() => {
              setReviewMode('none');
              setCurrentView('home');
            }}
            onEditQuestion={() => handleOpenEditModal(activeQuestion)}
          />
        )}
      </main>

      {/* MODALS */}
      <ReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        questions={questions}
        progress={progress}
        onStartReview={handleStartReview}
      />

      <RegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSaveQuestion={handleSaveQuestion}
        onSaveBatchQuestions={handleSaveBatchQuestions}
      />

      <AuthSyncModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        userProfile={userProfile}
        onUpdateProfile={setUserProfile}
        onDataImported={refreshData}
      />

      <EditQuestionModal
        isOpen={isEditModalOpen}
        question={editingQuestion}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEditedQuestion}
        onDelete={handleDeleteQuestion}
      />
    </div>
  );
}
