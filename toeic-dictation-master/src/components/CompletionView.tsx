import React, { useState } from 'react';
import { Question, UserProgressRecord } from '../types';
import { soundManager } from '../utils/sound';
import {
  CheckCircle,
  RotateCcw,
  ArrowRight,
  List,
  Volume2,
  BookOpen,
  Award,
  Sparkles,
  ShieldAlert,
  Image as ImageIcon,
  ExternalLink,
  Edit3,
} from 'lucide-react';

interface CompletionViewProps {
  question: Question;
  record?: UserProgressRecord;
  onRetry: () => void;
  onNextQuestion?: () => void;
  onBackToList: () => void;
  onEditQuestion?: () => void;
}

export const CompletionView: React.FC<CompletionViewProps> = ({
  question,
  record,
  onRetry,
  onNextQuestion,
  onBackToList,
  onEditQuestion,
}) => {
  const [activeTab, setActiveTab] = useState<'commentary' | 'vocab' | 'originalImage'>('commentary');
  const [playingSentenceId, setPlayingSentenceId] = useState<string | null>(null);

  const commentary = question.commentary;
  const extracted = commentary?.extractedFromMaterial;
  const aiSupplement = commentary?.aiSupplement;
  const vocabList = question.vocabulary || extracted?.vocabulary || [];
  const grammarPoints = question.grammarPoints || extracted?.grammarPoints || [];
  const listeningTips = question.listeningTips || extracted?.listeningTips || [];

  const handlePlaySentence = (text: string, id: string) => {
    setPlayingSentenceId(id);
    soundManager.speakText(text, 1.0, () => {
      setPlayingSentenceId(null);
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Celebration Header Card */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-xl text-center relative overflow-hidden">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 mb-3 border border-emerald-500/40">
          <Award className="w-8 h-8" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
          ディクテーション完了！
        </h2>
        <p className="text-sm text-slate-300 max-w-lg mx-auto mb-4">
          Part {question.part} - No. {question.questionNumber} : {question.title}
        </p>

        {/* Quick Stats Grid */}
        <div className="inline-flex flex-wrap items-center justify-center gap-3 bg-slate-900/90 border border-slate-800 px-5 py-2.5 rounded-2xl text-xs">
          <span className="text-slate-400">
            挑戦回数: <strong className="text-white">{record?.attemptCount || 1}回</strong>
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">
            誤答回数:{' '}
            <strong className={record?.mistakeCount ? 'text-rose-400' : 'text-emerald-400'}>
              {record?.mistakeCount || 0}回
            </strong>
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">
            初見クリア:{' '}
            <strong className={record?.firstTryCorrect ? 'text-emerald-400' : 'text-amber-400'}>
              {record?.firstTryCorrect ? '達成 (1発正解)' : '復習完了'}
            </strong>
          </span>
        </div>
      </div>

      {/* Action Buttons Top */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onBackToList}
          className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
        >
          <List className="w-4 h-4" />
          <span>問題一覧へ戻る</span>
        </button>

        <div className="flex items-center gap-2">
          {onEditQuestion && (
            <button
              onClick={onEditQuestion}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-cyan-400 border border-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
              title="この問題を編集"
            >
              <Edit3 className="w-4 h-4 text-cyan-400" />
              <span>編集</span>
            </button>
          )}

          <button
            onClick={onRetry}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>もう一度挑戦</span>
          </button>

          {onNextQuestion && (
            <button
              onClick={onNextQuestion}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95"
            >
              <span>次の問題へ進む</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* FULL SCRIPT & TRANSLATION CARD */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>スクリプト全文と和訳</span>
          </h3>
          <span className="text-xs text-slate-400">音声をクリックして個別確認</span>
        </div>

        <div className="space-y-4">
          {question.sentences.map((sentence, idx) => {
            const isPlayingThis = playingSentenceId === sentence.id;
            return (
              <div
                key={sentence.id}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                      文 {idx + 1}
                    </span>
                    {sentence.speaker && (
                      <span className="text-xs font-medium text-slate-400">
                        [{sentence.speaker}]
                      </span>
                    )}
                  </div>
                  <p className="text-base sm:text-lg font-semibold text-white leading-relaxed">
                    {sentence.text}
                  </p>
                  <p className="text-sm text-slate-300">{sentence.translation}</p>
                </div>

                <button
                  onClick={() => handlePlaySentence(sentence.text, sentence.id)}
                  className={`p-2.5 rounded-xl border transition-colors shrink-0 ${
                    isPlayingThis
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title="この文を再生"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* COMMENTARY TABS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('commentary')}
            className={`flex-1 py-3.5 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'commentary'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>文法・解説・聞き取り</span>
          </button>
          <button
            onClick={() => setActiveTab('vocab')}
            className={`flex-1 py-3.5 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'vocab'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>重要語彙 ({vocabList.length})</span>
          </button>
          {question.imageUrl && (
            <button
              onClick={() => setActiveTab('originalImage')}
              className={`flex-1 py-3.5 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === 'originalImage'
                  ? 'border-cyan-400 text-cyan-400 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>教材原本画像</span>
            </button>
          )}
        </div>

        {/* Tab 1: Commentary & Points */}
        {activeTab === 'commentary' && (
          <div className="p-6 space-y-6">
            {/* Textbook extracted section */}
            {grammarPoints.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                    教材抽出解説
                  </span>
                  <h4 className="text-sm font-bold text-white">文法・解答根拠ポイント</h4>
                </div>
                <ul className="space-y-2 text-sm text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  {grammarPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Listening tips section */}
            {listeningTips.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                    リスニングのコツ
                  </span>
                  <h4 className="text-sm font-bold text-white">音声変化・リンキング</h4>
                </div>
                <ul className="space-y-2 text-sm text-slate-300 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  {listeningTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">♪</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* AI Supplement section (clearly separated per requirement #4) */}
            {aiSupplement?.explanation && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    AI補足解説
                  </span>
                  <span className="text-xs text-slate-400">
                    難易度目安: {aiSupplement.difficultyRating || '標準'}
                  </span>
                </div>
                <p className="text-sm text-slate-300 bg-purple-950/20 p-4 rounded-xl border border-purple-900/30 leading-relaxed">
                  {aiSupplement.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Vocabulary */}
        {activeTab === 'vocab' && (
          <div className="p-6">
            {vocabList.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">登録された語彙はありません。</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {vocabList.map((item, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-base font-bold text-white block">{item.word}</span>
                      <span className="text-xs text-slate-300">{item.meaning}</span>
                    </div>
                    <button
                      onClick={() => handlePlaySentence(item.word, `vocab-${i}`)}
                      className="p-2 text-slate-400 hover:text-cyan-400"
                      title="発音を聞く"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Original Image */}
        {activeTab === 'originalImage' && question.imageUrl && (
          <div className="p-6 text-center space-y-4">
            <p className="text-xs text-slate-400">
              アップロードされた教材原本（写真・スクリーンショット）
            </p>
            <div className="inline-block max-w-full rounded-2xl overflow-hidden border border-slate-800 shadow-lg">
              <img
                src={question.imageUrl}
                alt="Original material"
                className="max-h-[500px] w-auto object-contain mx-auto"
              />
            </div>
          </div>
        )}
      </div>

      {/* Copyright Disclaimer Notice (Requirement #4 & #10) */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-400">
        <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>著作権と私的利用について:</strong>{' '}
          本アプリに登録された市販教材の写真・音声・解説は、個人の学習目的に限定してご利用ください。権利者の許諾なく第三者へ公開・再配布することは制限されています。
        </p>
      </div>
    </div>
  );
};
