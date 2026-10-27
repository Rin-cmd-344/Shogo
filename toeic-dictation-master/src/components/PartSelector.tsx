import React from 'react';
import { PartType, Question, UserProgressRecord } from '../types';
import { Image, MessageSquare, Users, Radio, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';

interface PartSelectorProps {
  selectedPart: PartType;
  onSelectPart: (part: PartType) => void;
  questions: Question[];
  progress: Record<string, UserProgressRecord>;
}

export const PartSelector: React.FC<PartSelectorProps> = ({
  selectedPart,
  onSelectPart,
  questions,
  progress,
}) => {
  const partsConfig: {
    part: PartType;
    title: string;
    sub: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    borderColor: string;
    activeBg: string;
  }[] = [
    {
      part: 1,
      title: 'Part 1',
      sub: '写真描写問題',
      description: '1枚の写真に対する短い英文を正確にディクテーション。受動態や現在進行形の聞き取り。',
      icon: <Image className="w-6 h-6 text-emerald-400" />,
      color: 'text-emerald-400',
      borderColor: 'border-emerald-500/40',
      activeBg: 'bg-emerald-950/40',
    },
    {
      part: 2,
      title: 'Part 2',
      sub: '応答問題',
      description: '疑問詞(Where/When/Why)や助動詞から始まる質問・平叙文を瞬時に聞き取る訓練。',
      icon: <MessageSquare className="w-6 h-6 text-sky-400" />,
      color: 'text-sky-400',
      borderColor: 'border-sky-500/40',
      activeBg: 'bg-sky-950/40',
    },
    {
      part: 3,
      title: 'Part 3',
      sub: '会話問題',
      description: '2〜3人のビジネス会話。音声を文ごとに分割し、1文ずつ集中してディクテーション。',
      icon: <Users className="w-6 h-6 text-indigo-400" />,
      color: 'text-indigo-400',
      borderColor: 'border-indigo-500/40',
      activeBg: 'bg-indigo-950/40',
    },
    {
      part: 4,
      title: 'Part 4',
      sub: '説明文問題',
      description: 'アナウンスやスピーチなど1人のモノローグ。長文音声を文単位で確実に書き起こす。',
      icon: <Radio className="w-6 h-6 text-amber-400" />,
      color: 'text-amber-400',
      borderColor: 'border-amber-500/40',
      activeBg: 'bg-amber-950/40',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {partsConfig.map((item) => {
        const isSelected = selectedPart === item.part;
        const partQuestions = questions.filter((q) => q.part === item.part);
        const total = partQuestions.length;
        const completed = partQuestions.filter((q) => progress[q.id]?.completedAt).length;
        const needsReview = partQuestions.filter((q) => progress[q.id]?.hasMistakeEver).length;

        return (
          <button
            key={item.part}
            onClick={() => onSelectPart(item.part)}
            className={`text-left p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
              isSelected
                ? `${item.borderColor} ${item.activeBg} shadow-lg ring-2 ring-cyan-500/30 scale-[1.01]`
                : 'border-slate-800 bg-slate-900/80 hover:bg-slate-800/80 hover:border-slate-700'
            }`}
          >
            {/* Top Indicator */}
            {isSelected && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-500" />
            )}

            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/50">
                {item.icon}
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-400 block">問題数</span>
                <span className="text-lg font-bold text-white">{total}問</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                  {item.title}
                </h3>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {item.sub}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                {item.description}
              </p>
            </div>

            {/* Bottom Progress Metrics */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>完了: {completed}/{total}</span>
              </div>

              {needsReview > 0 && (
                <div className="flex items-center gap-1 text-rose-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>復習: {needsReview}</span>
                </div>
              )}

              <ArrowRight className={`w-4 h-4 ml-auto text-slate-500 group-hover:translate-x-1 group-hover:text-cyan-400 transition-all ${isSelected ? 'text-cyan-400' : ''}`} />
            </div>
          </button>
        );
      })}
    </div>
  );
};
