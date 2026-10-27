import React, { useState, useEffect } from 'react';
import { Question, PartType, DictationSentence, VocabularyItem } from '../types';
import {
  Edit3,
  Trash2,
  Plus,
  Save,
  X,
  Sparkles,
  BookOpen,
  Volume2,
  HelpCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';

interface EditQuestionModalProps {
  isOpen: boolean;
  question: Question | null;
  onClose: () => void;
  onSave: (updatedQuestion: Question) => void;
  onDelete: (questionId: string) => void;
}

export const EditQuestionModal: React.FC<EditQuestionModalProps> = ({
  isOpen,
  question,
  onClose,
  onSave,
  onDelete,
}) => {
  const [part, setPart] = useState<PartType>(1);
  const [questionNumber, setQuestionNumber] = useState<number>(1);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [sentences, setSentences] = useState<DictationSentence[]>([]);
  const [vocabulary, setVocabulary] = useState<VocabularyItem[]>([]);
  const [grammarPoints, setGrammarPoints] = useState<string[]>([]);
  const [listeningTips, setListeningTips] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize form whenever question prop changes
  useEffect(() => {
    if (question) {
      setPart(question.part);
      setQuestionNumber(question.questionNumber);
      setTitle(question.title);
      setDescription(question.description || '');
      setSentences(
        question.sentences && question.sentences.length > 0
          ? JSON.parse(JSON.stringify(question.sentences))
          : [
              {
                id: 's-1',
                order: 1,
                text: '',
                translation: '',
                startTime: 0,
                endTime: 5,
              },
            ]
      );

      const vocabList = question.vocabulary || question.commentary?.extractedFromMaterial?.vocabulary || [];
      setVocabulary(JSON.parse(JSON.stringify(vocabList)));

      const grammar = question.grammarPoints || question.commentary?.extractedFromMaterial?.grammarPoints || [];
      setGrammarPoints(JSON.parse(JSON.stringify(grammar)));

      const tips = question.listeningTips || question.commentary?.extractedFromMaterial?.listeningTips || [];
      setListeningTips(JSON.parse(JSON.stringify(tips)));

      setErrorMessage(null);
    }
  }, [question, isOpen]);

  if (!isOpen || !question) return null;

  // Sentence helpers
  const handleAddSentence = () => {
    const nextOrder = sentences.length + 1;
    const lastEndTime = sentences.length > 0 ? sentences[sentences.length - 1].endTime : 0;
    setSentences([
      ...sentences,
      {
        id: `s-${Date.now()}-${nextOrder}`,
        order: nextOrder,
        text: '',
        translation: '',
        startTime: lastEndTime,
        endTime: lastEndTime + 4.5,
      },
    ]);
  };

  const handleRemoveSentence = (id: string) => {
    if (sentences.length <= 1) {
      setErrorMessage('最低1つの英文が必要です。');
      return;
    }
    setSentences(sentences.filter((s) => s.id !== id));
  };

  const handleSentenceChange = (id: string, field: keyof DictationSentence, val: any) => {
    setSentences(
      sentences.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  // Vocabulary helpers
  const handleAddVocab = () => {
    setVocabulary([...vocabulary, { word: '', meaning: '' }]);
  };

  const handleRemoveVocab = (idx: number) => {
    setVocabulary(vocabulary.filter((_, i) => i !== idx));
  };

  const handleVocabChange = (idx: number, field: keyof VocabularyItem, val: string) => {
    setVocabulary(
      vocabulary.map((v, i) => (i === idx ? { ...v, [field]: val } : v))
    );
  };

  // Grammar points helpers
  const handleAddGrammar = () => {
    setGrammarPoints([...grammarPoints, '']);
  };

  const handleRemoveGrammar = (idx: number) => {
    setGrammarPoints(grammarPoints.filter((_, i) => i !== idx));
  };

  const handleGrammarChange = (idx: number, val: string) => {
    setGrammarPoints(grammarPoints.map((g, i) => (i === idx ? val : g)));
  };

  // Listening tips helpers
  const handleAddTip = () => {
    setListeningTips([...listeningTips, '']);
  };

  const handleRemoveTip = (idx: number) => {
    setListeningTips(listeningTips.filter((_, i) => i !== idx));
  };

  const handleTipChange = (idx: number, val: string) => {
    setListeningTips(listeningTips.map((t, i) => (i === idx ? val : t)));
  };

  // Save handler
  const handleSave = () => {
    if (!title.trim()) {
      setErrorMessage('タイトルを入力してください。');
      return;
    }

    const validSentences = sentences
      .filter((s) => s.text.trim().length > 0)
      .map((s, idx) => ({ ...s, order: idx + 1 }));

    if (validSentences.length === 0) {
      setErrorMessage('有効な英文を最低1つ入力してください。');
      return;
    }

    const validVocab = vocabulary.filter((v) => v.word.trim().length > 0);
    const validGrammar = grammarPoints.filter((g) => g.trim().length > 0);
    const validTips = listeningTips.filter((t) => t.trim().length > 0);

    const updated: Question = {
      ...question,
      part,
      questionNumber: Number(questionNumber) || 1,
      title: title.trim(),
      description: description.trim() || undefined,
      sentences: validSentences,
      vocabulary: validVocab.length > 0 ? validVocab : undefined,
      grammarPoints: validGrammar.length > 0 ? validGrammar : undefined,
      listeningTips: validTips.length > 0 ? validTips : undefined,
      commentary: {
        ...question.commentary,
        extractedFromMaterial: {
          ...question.commentary?.extractedFromMaterial,
          questionNumber: `Part ${part} No.${questionNumber}`,
          englishSentences: validSentences.map((s) => ({
            text: s.text,
            translation: s.translation,
          })),
          vocabulary: validVocab,
          grammarPoints: validGrammar,
          listeningTips: validTips,
        },
      },
      updatedAt: new Date().toISOString(),
    };

    onSave(updated);
    onClose();
  };

  // Delete handler with safety confirmation
  const handleDelete = () => {
    if (confirm('この問題を削除してもよろしいですか？（学習履歴も一緒に削除されます）')) {
      onDelete(question.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>問題の編集</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  Part {part} No.{questionNumber}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                英文・日本語訳・音声再生区間・解説をいつでも修正できます。
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
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-center justify-between text-xs text-rose-300">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
                ✕
              </button>
            </div>
          )}

          {/* Basic Question Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">TOEIC Part</label>
              <select
                value={part}
                onChange={(e) => setPart(Number(e.target.value) as PartType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-400 outline-none"
              >
                <option value={1}>Part 1 (写真描写)</option>
                <option value={2}>Part 2 (応答問題)</option>
                <option value={3}>Part 3 (会話問題)</option>
                <option value={4}>Part 4 (説明文問題)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">問題番号 (No.)</label>
              <input
                type="number"
                value={questionNumber}
                onChange={(e) => setQuestionNumber(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-400 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">タイトル</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="問題タイトル"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-400 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">問題の説明・メモ (任意)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例: 写真描写問題：オフィスの女性"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 outline-none"
            />
          </div>

          {/* Sentences Editor */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>英文・和訳・音声区間の編集（{sentences.length} 文）</span>
              </label>

              <button
                type="button"
                onClick={handleAddSentence}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-cyan-300 border border-slate-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>文を追加</span>
              </button>
            </div>

            <div className="space-y-3">
              {sentences.map((sent, idx) => (
                <div
                  key={sent.id}
                  className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5 relative group"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-cyan-300 px-2 py-0.5 rounded bg-slate-900 border border-slate-750">
                        文 {idx + 1}
                      </span>
                      {part >= 3 && (
                        <input
                          type="text"
                          value={sent.speaker || ''}
                          onChange={(e) => handleSentenceChange(sent.id, 'speaker', e.target.value)}
                          placeholder="話者 (Man / Woman)"
                          className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-300"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">再生区間(秒):</span>
                      <input
                        type="number"
                        step="0.1"
                        value={sent.startTime}
                        onChange={(e) =>
                          handleSentenceChange(sent.id, 'startTime', parseFloat(e.target.value) || 0)
                        }
                        className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs text-white"
                        title="開始秒"
                      />
                      <span>〜</span>
                      <input
                        type="number"
                        step="0.1"
                        value={sent.endTime}
                        onChange={(e) =>
                          handleSentenceChange(sent.id, 'endTime', parseFloat(e.target.value) || 0)
                        }
                        className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-xs text-white"
                        title="終了秒"
                      />

                      {sentences.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveSentence(sent.id)}
                          className="text-slate-500 hover:text-rose-400 ml-1 p-1"
                          title="この文を削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* English text input */}
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block mb-0.5">英文 (正解テキスト)</span>
                    <input
                      type="text"
                      value={sent.text}
                      onChange={(e) => handleSentenceChange(sent.id, 'text', e.target.value)}
                      placeholder="正解の英文"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-white focus:border-cyan-400 outline-none"
                    />
                  </div>

                  {/* Japanese translation */}
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block mb-0.5">日本語訳</span>
                    <input
                      type="text"
                      value={sent.translation}
                      onChange={(e) => handleSentenceChange(sent.id, 'translation', e.target.value)}
                      placeholder="日本語訳"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:border-cyan-400 outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Commentary & Vocabulary Section */}
          <div className="space-y-4 pt-3 border-t border-slate-800">
            {/* Vocabulary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>重要語彙・表現 ({vocabulary.length})</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddVocab}
                  className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-cyan-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>語彙を追加</span>
                </button>
              </div>

              {vocabulary.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={v.word}
                    onChange={(e) => handleVocabChange(i, 'word', e.target.value)}
                    placeholder="単語・イディオム"
                    className="w-1/3 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={v.meaning}
                    onChange={(e) => handleVocabChange(i, 'meaning', e.target.value)}
                    placeholder="意味・訳"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveVocab(i)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Grammar Points */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                  <span>文法・解答根拠ポイント ({grammarPoints.length})</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddGrammar}
                  className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-indigo-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>ポイント追加</span>
                </button>
              </div>

              {grammarPoints.map((g, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={g}
                    onChange={(e) => handleGrammarChange(i, e.target.value)}
                    placeholder="文法解説や着眼点"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveGrammar(i)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Listening Tips */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>リスニングのコツ・音声変化 ({listeningTips.length})</span>
                </label>
                <button
                  type="button"
                  onClick={handleAddTip}
                  className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-amber-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>コツを追加</span>
                </button>
              </div>

              {listeningTips.map((tip, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tip}
                    onChange={(e) => handleTipChange(i, e.target.value)}
                    placeholder="リンキングや弱形などの注意点"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveTip(i)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          {/* Delete Button with Confirmation */}
          <button
            type="button"
            onClick={handleDelete}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>この問題を削除</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              キャンセル
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-md shadow-cyan-950 flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>変更を保存する</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
