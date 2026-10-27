import React, { useState } from 'react';
import { PartType, Question, UserProgressRecord } from '../types';
import { Play, CheckCircle2, AlertTriangle, HelpCircle, Trash2, Clock, FileText, Music, Sparkles, Edit3 } from 'lucide-react';

interface QuestionListProps {
  part: PartType;
  questions: Question[];
  progress: Record<string, UserProgressRecord>;
  onSelectQuestion: (question: Question) => void;
  onEditQuestion: (question: Question) => void;
  onDeleteQuestion: (questionId: string) => void;
}

export const QuestionList: React.FC<QuestionListProps> = ({
  part,
  questions,
  progress,
  onSelectQuestion,
  onEditQuestion,
  onDeleteQuestion,
}) => {
  const [filter, setFilter] = useState<'all' | 'uncompleted' | 'review'>('all');

  const partQuestions = questions.filter((q) => q.part === part);

  const filteredQuestions = partQuestions.filter((q) => {
    const rec = progress[q.id];
    if (filter === 'uncompleted') {
      return !rec || !rec.completedAt;
    }
    if (filter === 'review') {
      return rec && rec.hasMistakeEver;
    }
    return true;
  });

  const getStatusBadge = (questionId: string) => {
    const rec = progress[questionId];
    if (!rec) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
          <HelpCircle className="w-3 h-3" />
          未挑戦
        </span>
      );
    }
    if (rec.completedAt) {
      if (rec.hasMistakeEver) {
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-amber-400" />
            完了（復習あり）
          </span>
        );
      }
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          習得済み
        </span>
      );
    }
    if (rec.hasMistakeEver) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-rose-400" />
          要復習
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
        学習中
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>Part {part} 問題一覧</span>
            <span className="text-sm font-normal text-slate-400">
              ({filteredQuestions.length} / {partQuestions.length}問)
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {part === 1 || part === 2
              ? '短文の聞き取りと厳密なディクテーション'
              : '長文音声を文単位で集中書き起こし'}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 self-start sm:self-auto text-xs overflow-x-auto max-w-full">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filter === 'all'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            すべて ({partQuestions.length})
          </button>
          <button
            onClick={() => setFilter('uncompleted')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filter === 'uncompleted'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            未完了
          </button>
          <button
            onClick={() => setFilter('review')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filter === 'review'
                ? 'bg-slate-800 text-rose-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            要復習
          </button>
        </div>
      </div>

      {/* Questions Cards */}
      {filteredQuestions.length === 0 ? (
        <div className="text-center py-16 px-4 bg-slate-900/50 rounded-2xl border border-slate-800/80">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-300 font-medium mb-1">
            該当する問題がありません
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            フィルターを「すべて」に変更するか、上部の「問題・教材登録」ボタンから新しい問題を追加してください。
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredQuestions.map((q) => {
            const rec = progress[q.id];
            const sentenceCount = q.sentences.length;

            return (
              <div
                key={q.id}
                className="bg-slate-900 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-lg hover:shadow-slate-950/50 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/50">
                        No. {q.questionNumber}
                      </span>
                      {getStatusBadge(q.id)}
                      {q.isCustom && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-950/70 text-purple-300 border border-purple-800/40">
                          自作/追加
                        </span>
                      )}
                      {(q.needsReview || q.confidence === 'medium' || q.confidence === 'low') && (
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-600/40 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          要確認
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditQuestion(q);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                        title="この問題を編集"
                        aria-label="問題を編集"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('この問題を削除してもよろしいですか？（学習履歴も一緒に削除されます）')) {
                            onDeleteQuestion(q.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                        title="この問題を削除"
                        aria-label="問題を削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors mb-1.5">
                    {q.title}
                  </h3>

                  {q.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                      {q.description}
                    </p>
                  )}

                  {/* Audio / Sentences info */}
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                    <span className="flex items-center gap-1 bg-slate-800/70 px-2 py-1 rounded-md">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      {sentenceCount} 文構成
                    </span>
                    {q.audioUrl ? (
                      <span className="flex items-center gap-1 bg-slate-800/70 px-2 py-1 rounded-md text-emerald-400">
                        <Music className="w-3.5 h-3.5" />
                        音声あり
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-slate-800/70 px-2 py-1 rounded-md text-slate-400">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        音声合成(TTS)
                      </span>
                    )}
                    {rec?.attemptCount ? (
                      <span className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        挑戦 {rec.attemptCount}回
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  {rec?.lastStudiedAt ? (
                    <span className="text-[11px] text-slate-500">
                      前回: {new Date(rec.lastStudiedAt).toLocaleDateString('ja-JP')}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-500">未学習</span>
                  )}

                  <button
                    onClick={() => onSelectQuestion(q)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white flex items-center gap-1.5 shadow-md shadow-cyan-950/40 transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    ディクテーション開始
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
