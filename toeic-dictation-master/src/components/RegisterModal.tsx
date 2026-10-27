import React, { useState, useRef } from 'react';
import { Question, PartType, DictationSentence, VocabularyItem } from '../types';
import { storeMediaBlob } from '../utils/storage';
import {
  Upload,
  FileAudio,
  Camera,
  Edit3,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Plus,
  Trash2,
  X,
  Volume2,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Ban,
  CheckSquare,
  Square,
  FileText,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface DetectedBatchItem {
  tempId: string;
  sourceFilename: string;
  fileIndex: number;
  audioBase64?: string;
  type: 'question' | 'instruction';
  isInstruction: boolean;
  instructionReason?: string;
  part: PartType;
  questionNumber: number;
  title: string;
  startTime: number;
  endTime: number;
  confidence: 'high' | 'medium' | 'low';
  confidenceReason?: string;
  sentences: DictationSentence[];
  overallVocabulary?: VocabularyItem[];
  listeningTips?: string[];
  selectedForImport: boolean;
}

interface FileProcessStatus {
  file: File;
  status: 'pending' | 'processing' | 'done' | 'excluded' | 'error';
  detectedQuestionsCount: number;
  excludedCount: number;
  error?: string;
}

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveQuestion: (question: Question) => void;
  onSaveBatchQuestions?: (questions: Question[]) => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSaveQuestion,
  onSaveBatchQuestions,
}) => {
  const [activeTab, setActiveTab] = useState<'batch_audio' | 'ocr' | 'manual'>('batch_audio');

  // Drag & drop state
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Batch Processing States
  const [fileQueue, setFileQueue] = useState<FileProcessStatus[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [isBatchCompleted, setIsBatchCompleted] = useState<boolean>(false);

  // Aggregated Detected Items (Valid questions + Excluded Instructions)
  const [detectedItems, setDetectedItems] = useState<DetectedBatchItem[]>([]);
  const [showExcludedSection, setShowExcludedSection] = useState<boolean>(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // OCR Image state
  const [ocrImageFile, setOcrImageFile] = useState<File | null>(null);
  const [ocrImagePreview, setOcrImagePreview] = useState<string | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState<boolean>(false);

  // Manual / Single Question State
  const [manualPart, setManualPart] = useState<PartType>(1);
  const [manualNumber, setManualNumber] = useState<number>(1);
  const [manualTitle, setManualTitle] = useState<string>('');
  const [manualDescription, setManualDescription] = useState<string>('');
  const [manualSentences, setManualSentences] = useState<DictationSentence[]>([
    {
      id: 's-1',
      order: 1,
      text: '',
      translation: '',
      startTime: 0,
      endTime: 5,
    },
  ]);
  const [manualVocab, setManualVocab] = useState<VocabularyItem[]>([]);
  const [manualGrammar, setManualGrammar] = useState<string[]>([]);
  const [manualTips, setManualTips] = useState<string[]>([]);
  const [manualAiSupplement, setManualAiSupplement] = useState<string>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Helper: File to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  // 1. Drag & Drop and File Selection Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      handleFilesReceived(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFilesReceived(files);
    }
  };

  const handleFilesReceived = async (files: File[]) => {
    // Filter for valid audio formats (MP3 / M4A / WAV)
    const validAudioFiles = files.filter((f) => {
      const name = f.name.toLowerCase();
      return (
        name.endsWith('.mp3') ||
        name.endsWith('.m4a') ||
        name.endsWith('.wav') ||
        f.type.includes('audio')
      );
    });

    if (validAudioFiles.length === 0) {
      setErrorMessage('MP3 または M4A 形式の音声ファイルを選択してください。');
      return;
    }

    // Check size limit (< 50MB per file)
    const oversized = validAudioFiles.find((f) => f.size > 50 * 1024 * 1024);
    if (oversized) {
      setErrorMessage(`ファイルサイズが大きすぎます (最大50MB): ${oversized.name}`);
      return;
    }

    setErrorMessage(null);
    setIsBatchCompleted(false);
    setDetectedItems([]);

    const initialQueue: FileProcessStatus[] = validAudioFiles.map((file) => ({
      file,
      status: 'pending',
      detectedQuestionsCount: 0,
      excludedCount: 0,
    }));

    setFileQueue(initialQueue);
    setBatchProgress({ current: 0, total: validAudioFiles.length });

    // Start processing files sequentially
    await processBatchQueue(initialQueue);
  };

  // Sequential batch processing of audio files
  const processBatchQueue = async (queue: FileProcessStatus[]) => {
    setIsBatchProcessing(true);
    const aggregatedResults: DetectedBatchItem[] = [];

    for (let i = 0; i < queue.length; i++) {
      const currentStatus = queue[i];

      // Update status to processing
      setFileQueue((prev) =>
        prev.map((item, idx) =>
          idx === i ? { ...item, status: 'processing' } : item
        )
      );
      setBatchProgress({ current: i + 1, total: queue.length });

      try {
        const file = currentStatus.file;
        const base64 = await fileToBase64(file);

        let detectedMime = file.type;
        if (!detectedMime) {
          if (file.name.toLowerCase().endsWith('.m4a')) {
            detectedMime = 'audio/mp4';
          } else if (file.name.toLowerCase().endsWith('.wav')) {
            detectedMime = 'audio/wav';
          } else {
            detectedMime = 'audio/mp3';
          }
        }

        const res = await fetch('/api/transcribe-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioBase64: base64,
            mimeType: detectedMime,
            filename: file.name,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || '文字起こしAPIでエラーが発生しました。');
        }

        const json = await res.json();
        const detectedItemsRaw: any[] = json.data?.detectedItems || [];

        let fileQuestionCount = 0;
        let fileExcludedCount = 0;

        detectedItemsRaw.forEach((item: any, itemIndex: number) => {
          const isInstruction =
            item.isInstruction === true ||
            item.type === 'instruction' ||
            /directions|go on to the next page|now let us begin/i.test(item.title || '') ||
            /directions|go on to the next page/i.test(item.sentences?.[0]?.text || '');

          if (isInstruction) {
            fileExcludedCount++;
          } else {
            fileQuestionCount++;
          }

          aggregatedResults.push({
            tempId: `batch-${i}-${itemIndex}-${Date.now()}`,
            sourceFilename: file.name,
            fileIndex: i,
            audioBase64: base64,
            type: isInstruction ? 'instruction' : 'question',
            isInstruction,
            instructionReason:
              item.instructionReason ||
              (isInstruction ? 'テスト説明・ページめくり案内のため自動除外' : undefined),
            part: (item.part as PartType) || 1,
            questionNumber: Number(item.questionNumber) || (i + 1),
            title: item.title || `${file.name.replace(/\.[^/.]+$/, '')} (No.${item.questionNumber || i + 1})`,
            startTime: Number(item.startTime) || 0,
            endTime: Number(item.endTime) || 10,
            confidence: item.confidence || 'high',
            confidenceReason: item.confidenceReason || '',
            sentences: (item.sentences || []).map((s: any, sIdx: number) => ({
              id: `s-${sIdx + 1}`,
              order: sIdx + 1,
              text: s.text || '',
              translation: s.translation || '',
              startTime: Number(s.startTime) || 0,
              endTime: Number(s.endTime) || 5,
              speaker: s.speaker || undefined,
            })),
            overallVocabulary: item.overallVocabulary || [],
            listeningTips: item.listeningTips || [],
            selectedForImport: !isInstruction, // valid questions selected by default
          });
        });

        setFileQueue((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: fileQuestionCount > 0 ? 'done' : 'excluded',
                  detectedQuestionsCount: fileQuestionCount,
                  excludedCount: fileExcludedCount,
                }
              : item
          )
        );
      } catch (err: any) {
        console.error(`Error processing ${currentStatus.file.name}:`, err);
        setFileQueue((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, status: 'error', error: err.message } : item
          )
        );
      }
    }

    setDetectedItems(aggregatedResults);
    setIsBatchProcessing(false);
    setIsBatchCompleted(true);
  };

  // Toggle selection for import
  const toggleItemSelection = (tempId: string) => {
    setDetectedItems((prev) =>
      prev.map((item) =>
        item.tempId === tempId
          ? { ...item, selectedForImport: !item.selectedForImport }
          : item
      )
    );
  };

  // Select all valid questions
  const selectAllQuestions = (select: boolean) => {
    setDetectedItems((prev) =>
      prev.map((item) =>
        !item.isInstruction ? { ...item, selectedForImport: select } : item
      )
    );
  };

  // Rescue an excluded instruction as an active question
  const handleRescueInstruction = (tempId: string) => {
    setDetectedItems((prev) =>
      prev.map((item) =>
        item.tempId === tempId
          ? {
              ...item,
              isInstruction: false,
              type: 'question',
              selectedForImport: true,
              instructionReason: undefined,
            }
          : item
      )
    );
  };

  // Edit fields in preview
  const handleUpdateItemField = (tempId: string, field: keyof DetectedBatchItem, val: any) => {
    setDetectedItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? { ...item, [field]: val } : item))
    );
  };

  // 4. Batch Import Confirmation Action (One-click save all)
  const handleSaveAllBatchQuestions = async () => {
    const selectedQuestions = detectedItems.filter(
      (item) => item.selectedForImport && item.sentences.length > 0
    );

    if (selectedQuestions.length === 0) {
      setErrorMessage('登録する問題が選択されていません。');
      return;
    }

    const createdQuestions: Question[] = [];

    for (const item of selectedQuestions) {
      const qId = `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      // Save audio to IndexedDB
      if (item.audioBase64) {
        await storeMediaBlob(`audio_${qId}`, item.audioBase64);
      }

      const newQ: Question = {
        id: qId,
        part: item.part,
        questionNumber: item.questionNumber,
        title: item.title,
        audioUrl: item.audioBase64,
        audioFilename: item.sourceFilename,
        sentences: item.sentences,
        vocabulary: item.overallVocabulary,
        listeningTips: item.listeningTips,
        commentary: {
          extractedFromMaterial: {
            questionNumber: `Part ${item.part} No.${item.questionNumber}`,
            englishSentences: item.sentences.map((s) => ({
              text: s.text,
              translation: s.translation,
            })),
            vocabulary: item.overallVocabulary,
            listeningTips: item.listeningTips,
          },
        },
        isCustom: true,
        confidence: item.confidence,
        needsReview: item.confidence !== 'high',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      createdQuestions.push(newQ);
    }

    if (onSaveBatchQuestions) {
      onSaveBatchQuestions(createdQuestions);
    } else {
      createdQuestions.forEach((q) => onSaveQuestion(q));
    }

    onClose();
  };

  // Reset batch view to re-upload
  const handleResetBatch = () => {
    setFileQueue([]);
    setDetectedItems([]);
    setIsBatchProcessing(false);
    setIsBatchCompleted(false);
  };

  // OCR Upload Handler
  const handleOcrImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsOcrLoading(true);
      setErrorMessage(null);
      setOcrImageFile(file);

      const base64 = await fileToBase64(file);
      setOcrImagePreview(base64);

      const res = await fetch('/api/ocr-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: file.type || 'image/jpeg',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'OCR抽出APIでエラーが発生しました。');
      }

      const json = await res.json();
      const extracted = json.data?.extractedFromMaterial;

      if (extracted?.englishSentences) {
        setManualSentences(
          extracted.englishSentences.map((s: any, idx: number) => ({
            id: `s-${idx + 1}`,
            order: idx + 1,
            text: s.text,
            translation: s.translation || '',
            startTime: idx * 4,
            endTime: (idx + 1) * 4,
          }))
        );
      }
      if (extracted?.grammarPoints) setManualGrammar(extracted.grammarPoints);
      if (extracted?.vocabulary) setManualVocab(extracted.vocabulary);
      if (extracted?.listeningTips) setManualTips(extracted.listeningTips);
      if (json.data?.aiSupplement?.explanation) {
        setManualAiSupplement(json.data.aiSupplement.explanation);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'OCR抽出に失敗しました。');
    } finally {
      setIsOcrLoading(false);
    }
  };

  // Filter valid questions and excluded instructions
  const validQuestions = detectedItems.filter((item) => !item.isInstruction);
  const excludedInstructions = detectedItems.filter((item) => item.isInstruction);
  const selectedCount = validQuestions.filter((item) => item.selectedForImport).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-md">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>TOEIC音声一括アップロード ＆ AI自動分割</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded-full font-semibold">
                  複数ファイル・長尺対応
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                10〜50ファイルのまとめ投げ、または長尺音声をAIが問題ごとに自動分割・不要ナレーションを除外。
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('batch_audio')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'batch_audio'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileAudio className="w-4 h-4" />
            <span>音声一括アップロード (AI自動選別)</span>
          </button>

          <button
            onClick={() => setActiveTab('ocr')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'ocr'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>教材写真OCR</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-3 px-3 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
              activeTab === 'manual'
                ? 'border-cyan-400 text-cyan-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>手動作成</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-start gap-3 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: BATCH AUDIO UPLOAD & SLICING */}
          {activeTab === 'batch_audio' && (
            <div className="space-y-5">
              {/* STATE 1: DRAG & DROP ZONE (If not yet completed or empty queue) */}
              {!isBatchCompleted && !isBatchProcessing && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => audioInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all group ${
                    isDragging
                      ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01]'
                      : 'border-slate-700 hover:border-cyan-500/80 bg-slate-950/60 hover:bg-slate-900/60'
                  }`}
                >
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/mp3,audio/m4a,audio/wav,.mp3,.m4a,.wav"
                    multiple
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-lg">
                    <FileAudio className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
                    音声をここにドラッグ＆ドロップ（10〜50ファイル一括対応）
                  </h3>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed mb-4">
                    MP3 / M4A 対応。1ファイル1問形式も、Part全体を収録した1本の長尺音声も、まとめて放り込むだけでAIが自動判別して問題ごとにスライシングします。
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-950 transition-all">
                    <Upload className="w-4 h-4" />
                    <span>ファイルを選択する（複数可）</span>
                  </div>
                </div>
              )}

              {/* STATE 2: PROCESSING QUEUE & PROGRESS BAR */}
              {isBatchProcessing && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 animate-fade-in shadow-xl">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2 font-bold text-white">
                      <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
                      <span>
                        AI文字起こし・問題分割中... ({batchProgress.current} / {batchProgress.total} ファイル)
                      </span>
                    </div>
                    <span className="font-mono text-cyan-400 font-bold">
                      {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                      }}
                    />
                  </div>

                  {/* File List Queue */}
                  <div className="space-y-2 max-h-60 overflow-y-auto pt-2 border-t border-slate-800/80 pr-1">
                    {fileQueue.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5 truncate max-w-sm sm:max-w-md">
                          <FileAudio className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-slate-200 truncate">{item.file.name}</span>
                        </div>

                        <div>
                          {item.status === 'pending' && (
                            <span className="text-slate-500 flex items-center gap-1 font-medium">
                              <Clock className="w-3.5 h-3.5" /> 待機中
                            </span>
                          )}
                          {item.status === 'processing' && (
                            <span className="text-cyan-400 flex items-center gap-1 font-bold animate-pulse">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" /> 解析中
                            </span>
                          )}
                          {item.status === 'done' && (
                            <span className="text-emerald-400 flex items-center gap-1 font-bold">
                              <CheckCircle className="w-3.5 h-3.5" /> {item.detectedQuestionsCount}問 検出
                            </span>
                          )}
                          {item.status === 'excluded' && (
                            <span className="text-amber-400 flex items-center gap-1 font-medium">
                              <Ban className="w-3.5 h-3.5" /> ナレーション除外
                            </span>
                          )}
                          {item.status === 'error' && (
                            <span className="text-rose-400 flex items-center gap-1 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" /> エラー
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STATE 3: BATCH IMPORT CONFIRMATION PREVIEW (一括取り込みプレビュー) */}
              {isBatchCompleted && (
                <div className="space-y-5 animate-fade-in">
                  {/* Top Summary Bar */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-white text-base">
                          解析完了: {validQuestions.length}問 検出
                        </span>
                        {excludedInstructions.length > 0 && (
                          <span className="text-xs bg-slate-800 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-semibold">
                            除外ナレーション {excludedInstructions.length}件
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        内容を確認してチェックを入れた問題をワンクリックで一括登録できます。
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => selectAllQuestions(true)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                        <span>全選択</span>
                      </button>
                      <button
                        onClick={() => selectAllQuestions(false)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Square className="w-3.5 h-3.5" />
                        <span>全解除</span>
                      </button>
                      <button
                        onClick={handleResetBatch}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="アップロードを最初からやり直す"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>再アップロード</span>
                      </button>
                    </div>
                  </div>

                  {/* SECTION 1: VALID DETECTED QUESTIONS LIST */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>登録対象の問題リスト ({validQuestions.length}問)</span>
                      <span className="text-cyan-400">
                        {selectedCount}問 選択中
                      </span>
                    </h4>

                    {validQuestions.length === 0 ? (
                      <div className="text-center py-8 bg-slate-950/40 rounded-2xl border border-slate-800">
                        <p className="text-xs text-slate-400">有効な問題が検出されませんでした。</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {validQuestions.map((item) => {
                          const isExpanded = expandedItemId === item.tempId;
                          const firstSentence = item.sentences[0];

                          return (
                            <div
                              key={item.tempId}
                              className={`p-4 rounded-2xl border transition-all ${
                                item.selectedForImport
                                  ? 'bg-slate-900 border-cyan-500/50 shadow-md ring-1 ring-cyan-500/20'
                                  : 'bg-slate-950/60 border-slate-800 opacity-60'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                  {/* Selection Checkbox */}
                                  <button
                                    onClick={() => toggleItemSelection(item.tempId)}
                                    className="mt-0.5 text-cyan-400 hover:text-cyan-300 shrink-0"
                                  >
                                    {item.selectedForImport ? (
                                      <CheckSquare className="w-5 h-5 fill-cyan-950" />
                                    ) : (
                                      <Square className="w-5 h-5 text-slate-500" />
                                    )}
                                  </button>

                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 text-xs font-bold border border-cyan-800/60">
                                        Part {item.part}
                                      </span>
                                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs font-semibold">
                                        No. {item.questionNumber}
                                      </span>
                                      <span className="text-xs text-slate-400 font-mono">
                                        {item.startTime.toFixed(1)}s 〜 {item.endTime.toFixed(1)}s
                                      </span>
                                      <span className="text-xs text-slate-500">
                                        ({item.sentences.length} 文)
                                      </span>
                                      {item.confidence !== 'high' && (
                                        <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-600/40 text-[10px] font-bold flex items-center gap-1">
                                          <AlertTriangle className="w-3 h-3" /> 要確認
                                        </span>
                                      )}
                                    </div>

                                    {/* Editable Title */}
                                    <input
                                      type="text"
                                      value={item.title}
                                      onChange={(e) =>
                                        handleUpdateItemField(item.tempId, 'title', e.target.value)
                                      }
                                      className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-400 text-sm font-bold text-white outline-none py-0.5"
                                    />

                                    {/* First sentence preview */}
                                    {firstSentence && (
                                      <div className="text-xs text-slate-300 space-y-0.5 pt-1">
                                        <p className="font-medium text-slate-200">
                                          "{firstSentence.text}"
                                        </p>
                                        <p className="text-slate-400">{firstSentence.translation}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Accordion expand toggle */}
                                <button
                                  onClick={() =>
                                    setExpandedItemId(isExpanded ? null : item.tempId)
                                  }
                                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white shrink-0"
                                  title={isExpanded ? '詳細を閉じる' : '詳細文を展開'}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </div>

                              {/* Expanded Sentences Details */}
                              {isExpanded && (
                                <div className="mt-3 pt-3 border-t border-slate-800 space-y-2.5 animate-fade-in">
                                  <h5 className="text-[11px] font-bold text-slate-400">
                                    構成文一覧（{item.sentences.length}文）:
                                  </h5>
                                  <div className="space-y-2">
                                    {item.sentences.map((sent, sIdx) => (
                                      <div
                                        key={sIdx}
                                        className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1"
                                      >
                                        <div className="flex justify-between text-slate-500 text-[10px]">
                                          <span className="font-bold text-cyan-400">
                                            文 {sent.order} {sent.speaker ? `[${sent.speaker}]` : ''}
                                          </span>
                                          <span>
                                            {sent.startTime.toFixed(1)}s 〜 {sent.endTime.toFixed(1)}s
                                          </span>
                                        </div>
                                        <p className="font-semibold text-white">{sent.text}</p>
                                        <p className="text-slate-400">{sent.translation}</p>
                                      </div>
                                    ))}
                                  </div>

                                  {item.overallVocabulary && item.overallVocabulary.length > 0 && (
                                    <div className="pt-2 text-xs">
                                      <span className="text-[11px] text-slate-400 font-bold block mb-1">
                                        検出語彙:
                                      </span>
                                      <div className="flex flex-wrap gap-1.5">
                                        {item.overallVocabulary.map((v, vIdx) => (
                                          <span
                                            key={vIdx}
                                            className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]"
                                          >
                                            {v.word}: {v.meaning}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: EXCLUDED INSTRUCTIONS ACCORDION (Directions & Go on to next page) */}
                  {excludedInstructions.length > 0 && (
                    <div className="bg-slate-950/70 border border-slate-800 rounded-2xl overflow-hidden">
                      <button
                        onClick={() => setShowExcludedSection(!showExcludedSection)}
                        className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Ban className="w-4 h-4 text-amber-400" />
                          <span>
                            AIが自動除外したナレーション ({excludedInstructions.length}件)
                          </span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            (Directions / ページめくり案内)
                          </span>
                        </div>
                        {showExcludedSection ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>

                      {showExcludedSection && (
                        <div className="p-4 pt-0 space-y-2.5 animate-fade-in border-t border-slate-800/80">
                          <p className="text-[11px] text-slate-400 pt-2">
                            問題ではない説明音声やアナウンスが除外されています。問題として学習したい場合は「問題として復活」を押してください。
                          </p>

                          {excludedInstructions.map((item) => (
                            <div
                              key={item.tempId}
                              className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/60 text-[10px] font-bold">
                                    除外済み
                                  </span>
                                  <span className="text-slate-300 font-semibold truncate">
                                    {item.title}
                                  </span>
                                </div>
                                <p className="text-slate-400 text-[11px] italic truncate">
                                  {item.instructionReason || item.sentences[0]?.text || 'ナレーション'}
                                </p>
                              </div>

                              <button
                                onClick={() => handleRescueInstruction(item.tempId)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-cyan-950 text-cyan-300 border border-cyan-800/50 flex items-center gap-1 shrink-0 transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>問題として復活</span>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OCR UPLOAD */}
          {activeTab === 'ocr' && (
            <div className="space-y-4">
              <div
                onClick={() => imageInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-cyan-500 bg-slate-950/50 hover:bg-slate-900/50 rounded-2xl p-6 text-center cursor-pointer transition-all group"
              >
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleOcrImageSelected}
                  className="hidden"
                />
                <Camera className="w-10 h-10 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="text-sm font-bold text-white mb-1">
                  解説ページの写真をアップロード (AI OCR)
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  解説写真から英文・和訳・語彙・文法ポイントをGeminiが自動抽出します。
                </p>
              </div>

              {isOcrLoading && (
                <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-center gap-3 text-purple-300 text-xs animate-pulse">
                  <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
                  <span>解説ページから英文・和訳・文法ポイントをOCR抽出中...</span>
                </div>
              )}

              {ocrImagePreview && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                  <img
                    src={ocrImagePreview}
                    alt="Preview"
                    className="w-16 h-16 object-cover rounded-lg border border-slate-700"
                  />
                  <div className="text-xs text-slate-300">
                    <p className="font-semibold text-white">画像読み取り完了</p>
                    <p className="text-slate-400">「手動作成」タブに抽出結果が反映されています。</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MANUAL INPUT */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    TOEIC Part
                  </label>
                  <select
                    value={manualPart}
                    onChange={(e) => setManualPart(Number(e.target.value) as PartType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-400 outline-none"
                  >
                    <option value={1}>Part 1 (写真描写)</option>
                    <option value={2}>Part 2 (応答問題)</option>
                    <option value={3}>Part 3 (会話問題)</option>
                    <option value={4}>Part 4 (説明文問題)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    問題番号 (No.)
                  </label>
                  <input
                    type="number"
                    value={manualNumber}
                    onChange={(e) => setManualNumber(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-400 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    問題タイトル
                  </label>
                  <input
                    type="text"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="例: Standing beside the window"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:border-cyan-400 outline-none"
                  />
                </div>
              </div>

              {/* Sentences */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>英文と和訳</span>
                  </label>
                  <button
                    onClick={() =>
                      setManualSentences([
                        ...manualSentences,
                        {
                          id: `s-${Date.now()}`,
                          order: manualSentences.length + 1,
                          text: '',
                          translation: '',
                          startTime: 0,
                          endTime: 5,
                        },
                      ])
                    }
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-cyan-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>文を追加</span>
                  </button>
                </div>

                {manualSentences.map((sent, idx) => (
                  <div
                    key={sent.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                  >
                    <div className="flex justify-between text-xs text-slate-400">
                      <span className="font-bold text-cyan-300">文 {idx + 1}</span>
                      {manualSentences.length > 1 && (
                        <button
                          onClick={() =>
                            setManualSentences(manualSentences.filter((s) => s.id !== sent.id))
                          }
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={sent.text}
                      onChange={(e) =>
                        setManualSentences(
                          manualSentences.map((s) =>
                            s.id === sent.id ? { ...s, text: e.target.value } : s
                          )
                        )
                      }
                      placeholder="正解の英文"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-cyan-400 outline-none"
                    />
                    <input
                      type="text"
                      value={sent.translation}
                      onChange={(e) =>
                        setManualSentences(
                          manualSentences.map((s) =>
                            s.id === sent.id ? { ...s, translation: e.target.value } : s
                          )
                        )
                      }
                      placeholder="日本語訳"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1 text-xs text-slate-300 focus:border-cyan-400 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Copyright reminder */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex items-start gap-2.5 text-xs text-slate-400">
            <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <p>
              登録された教材データはあなたのブラウザ専用に保存されます。市販TOEIC教材の音声や解説は私的利用の範囲でご使用ください。
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white"
          >
            閉じる
          </button>

          {activeTab === 'batch_audio' && isBatchCompleted && (
            <button
              onClick={handleSaveAllBatchQuestions}
              disabled={selectedCount === 0}
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white shadow-lg shadow-cyan-950 flex items-center gap-2 active:scale-95 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{selectedCount} 件の問題を一括登録する</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {activeTab === 'manual' && (
            <button
              onClick={() => {
                if (!manualTitle.trim()) {
                  setErrorMessage('タイトルを入力してください。');
                  return;
                }
                const validSentences = manualSentences.filter((s) => s.text.trim().length > 0);
                if (validSentences.length === 0) {
                  setErrorMessage('最低1つの英文を入力してください。');
                  return;
                }

                const newQ: Question = {
                  id: `manual-q-${Date.now()}`,
                  part: manualPart,
                  questionNumber: manualNumber,
                  title: manualTitle.trim(),
                  description: manualDescription.trim() || undefined,
                  imageUrl: ocrImagePreview || undefined,
                  sentences: validSentences,
                  vocabulary: manualVocab.length > 0 ? manualVocab : undefined,
                  grammarPoints: manualGrammar.length > 0 ? manualGrammar : undefined,
                  listeningTips: manualTips.length > 0 ? manualTips : undefined,
                  commentary: {
                    extractedFromMaterial: {
                      questionNumber: `Part ${manualPart} No.${manualNumber}`,
                      englishSentences: validSentences.map((s) => ({
                        text: s.text,
                        translation: s.translation,
                      })),
                      vocabulary: manualVocab,
                      grammarPoints: manualGrammar,
                      listeningTips: manualTips,
                    },
                    aiSupplement: manualAiSupplement ? { explanation: manualAiSupplement } : undefined,
                  },
                  isCustom: true,
                  confidence: 'high',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                };

                onSaveQuestion(newQ);
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              <span>手動問題を保存する</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
