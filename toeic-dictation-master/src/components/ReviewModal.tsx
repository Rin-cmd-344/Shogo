import React from 'react';
import { Question, UserProgressRecord, ReviewMode } from '../types';
import {
  BookOpen,
  Shuffle,
  ListOrdered,
  Clock,
  AlertTriangle,
  Play,
  X,
  CheckCircle2,
} from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  progress: Record<string, UserProgressRecord>;
  onStartReview: (mode: ReviewMode, specificQuestionId?: string) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  questions,
  progress,
  onStartReview,
}) => {
  if (!isOpen) return null;

  // Find all questions marked for review (hasMistakeEver === true)
  const reviewQuestions = questions.filter((q) => {
    const rec = progress[q.id];
    return rec && rec.hasMistakeEver;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>間違えた問題・復習リスト</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
                  {reviewQuestions.length}問
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                一度でも間違えた問題は自動登録され、完全に定着するまで何度でも復習できます。
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {reviewQuestions.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-950/50 rounded-2xl border border-slate-800">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white mb-1">
                復習が必要な問題はありません！
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                問題演習中に間違えた問題は自動的にここに集約されます。新しい問題に挑戦してみましょう。
              </p>
            </div>
          ) : (
            <>
              {/* 2 Review Mode Launchers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    onClose();
                    onStartReview('sequential');
                  }}
                  className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/70 to-slate-900 border border-indigo-500/40 hover:border-indigo-400/80 text-left transition-all group shadow-md"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-2 rounded-xl bg-indigo-600 text-white">
                      <ListOrdered className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-white group-hover:text-indigo-300">
                      1. 順番に解く
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    登録順・問題番号順に1問ずつ確実に解き直します。
                  </p>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onStartReview('random');
                  }}
                  className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/70 to-slate-900 border border-rose-500/40 hover:border-rose-400/80 text-left transition-all group shadow-md"
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <div className="p-2 rounded-xl bg-rose-600 text-white">
                      <Shuffle className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-white group-hover:text-rose-300">
                      2. ランダムに解く
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    順番の記憶に頼らず、ランダム順で実戦力を鍛えます。
                  </p>
                </button>
              </div>

              {/* Review Question List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  復習対象の問題一覧 ({reviewQuestions.length}問)
                </h4>

                <div className="space-y-2">
                  {reviewQuestions.map((q) => {
                    const rec = progress[q.id];
                    return (
                      <div
                        key={q.id}
                        className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                              Part {q.part} No.{q.questionNumber}
                            </span>
                            <span className="text-sm font-semibold text-white truncate max-w-xs">
                              {q.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                            <span className="flex items-center gap-1 text-rose-400">
                              <AlertTriangle className="w-3 h-3" />
                              誤答 {rec?.mistakeCount || 0}回
                            </span>
                            <span>挑戦: {rec?.attemptCount || 0}回</span>
                            {rec?.lastStudiedAt && (
                              <span className="flex items-center gap-1 text-slate-500">
                                <Clock className="w-3 h-3" />
                                {new Date(rec.lastStudiedAt).toLocaleDateString('ja-JP')}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            onClose();
                            onStartReview('none', q.id);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 flex items-center gap-1 shrink-0 transition-colors"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>解く</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
