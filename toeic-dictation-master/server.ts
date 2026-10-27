import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Allow payload sizes up to 50MB for audio & textbook image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI SDK (uses GEMINI_API_KEY from environment)
const ai = new GoogleGenAI();

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. Audio Transcription & Segmentation endpoint
app.post('/api/transcribe-audio', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/mp3', filename = '' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: '音声データが指定されていません。' });
    }

    // Clean base64 prefix if present
    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');

    const prompt = `あなたはTOEIC Listeningテスト音声分析の最高峰エキスパートです。
アップロードされた音声を精密に文字起こしし、TOEICディクテーション問題として構造化してください。
音声は「1問ずつのトラック」の場合と、「1本のファイルにDirectionsや複数問が含まれる長尺音声」の場合があります。
ファイル名の手がかり: "${filename}"

【重要ルール 1: 不要音声（Directions / ページめくり案内等）の自動選別】
以下のナレーションは問題（ディクテーション対象）ではないため、必ず type: "instruction" かつ isInstruction: true としてマークし、除外理由（instructionReason）を明記してください。
- "Part 1 / Part 2 / Part 3 / Part 4 Directions..." などのパート説明
- "Go on to the next page." などのページめくりアナウンス
- "Now, let us begin with question number..." などの開始アナウンス
- テスト注意事項、チャイム音、サンプル例題のみの区間

【重要ルール 2: 長尺音声の自動スライシング（複数問への分割）】
1つの音声ファイルに複数問が含まれる場合（例: "Number 1...", "Number 2..." や会話セット）、問題ごとに正確に区切って複数のアイテムとして分割抽出し、それぞれの問題の startTime と endTime を秒単位で割り振ってください。

【重要ルール 3: 単一問題トラックの推定】
ファイル名（例: "Track_02_Part1_Q01.mp3"）や音声内容から、Part番号（1〜4）および問題番号（1〜100）を推定してください。

以下のJSONフォーマットで厳密に出力してください:
{
  "detectedItems": [
    {
      "type": "question" または "instruction",
      "isInstruction": false (instructionの場合はtrue),
      "instructionReason": "例: ページめくり案内 (Go on to the next page) のため除外" (instructionの場合のみ),
      "part": 1, 2, 3, または 4,
      "questionNumber": 1 (推定される問題番号),
      "title": "問題タイトル (例: Part 1 - Office Desk Photo または Part 3 - Project Delay)",
      "startTime": 0.0,
      "endTime": 18.5,
      "confidence": "high" または "medium" または "low",
      "confidenceReason": "推定の根拠または要確認の理由",
      "sentences": [
        {
          "id": "s1",
          "order": 1,
          "text": "英語の完全な文",
          "translation": "日本語訳",
          "startTime": 0.0,
          "endTime": 4.5,
          "speaker": "Speaker A" (Part 3/4の会話の場合、不明ならnull)
        }
      ],
      "overallVocabulary": [
        { "word": "単語/熟語", "meaning": "日本語の意味" }
      ],
      "listeningTips": [
        "聞き取りのポイント (リンキングや弱形、脱落など)"
      ]
    }
  ]
}`;

    // Normalize mimeType for Gemini API
    let normalizedMimeType = mimeType || 'audio/mp3';
    if (normalizedMimeType.includes('m4a') || normalizedMimeType.includes('mp4')) {
      normalizedMimeType = 'audio/mp4';
    } else if (normalizedMimeType.includes('mp3') || normalizedMimeType.includes('mpeg')) {
      normalizedMimeType = 'audio/mp3';
    } else if (normalizedMimeType.includes('wav')) {
      normalizedMimeType = 'audio/wav';
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: normalizedMimeType,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      // Fallback parse in case markdown blocks are returned
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('JSONの解析に失敗しました。');
      }
    }

    // Ensure detectedItems array is always present
    let detectedItems = parsedData.detectedItems || [];
    if (!Array.isArray(detectedItems) || detectedItems.length === 0) {
      detectedItems = [
        {
          type: parsedData.isInstruction ? 'instruction' : 'question',
          isInstruction: !!parsedData.isInstruction,
          instructionReason: parsedData.instructionReason,
          part: parsedData.estimatedPart || parsedData.part || 1,
          questionNumber: parsedData.estimatedQuestionNumber || parsedData.questionNumber || 1,
          title: parsedData.title || filename.replace(/\.[^/.]+$/, ''),
          startTime: parsedData.startTime || 0,
          endTime: parsedData.endTime || 10,
          confidence: parsedData.confidence || 'high',
          confidenceReason: parsedData.confidenceReason || '',
          sentences: parsedData.sentences || [],
          overallVocabulary: parsedData.overallVocabulary || [],
          listeningTips: parsedData.listeningTips || [],
        },
      ];
    }
    parsedData.detectedItems = detectedItems;

    res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Audio transcription error:', error);
    // Provide a helpful fallback structure if transcription API had issues
    res.status(500).json({
      error: error.message || '音声の文字起こしに失敗しました。もう一度お試しください。',
    });
  }
});

// 3. Textbook Commentary OCR extraction endpoint
app.post('/api/ocr-material', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: '画像データが指定されていません。' });
    }

    const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

    const prompt = `あなたはTOEIC教材の分析を行う専門アシスタントです。
提供されたTOEIC解説ページの写真/スクリーンショットから、学習に必要な要素を正確にOCR抽出し、構造化してください。
教材に直接書かれている抽出内容と、あなたが学習者のために補足するAI解説は厳密に区別してください。

以下のJSON形式で出力してください:
{
  "extractedFromMaterial": {
    "questionNumber": "例: No. 101 または Part 3 Q41-43",
    "englishSentences": [
      {
        "text": "教材に記載されている英文",
        "translation": "教材に記載されている日本語訳"
      }
    ],
    "grammarPoints": [
      "教材に書かれている文法・正解への根拠・ポイント"
    ],
    "vocabulary": [
      {
        "word": "教材に掲載された単語/熟語",
        "meaning": "教材の日本語訳"
      }
    ],
    "listeningTips": [
      "教材に書かれた聞き取りのポイント、音の変化など"
    ]
  },
  "aiSupplement": {
    "explanation": "教材の解説を補強するAI独自の追加解説（リンキングやTOEIC頻出言い換え表現）",
    "difficultyRating": "初級 / 中級 / 上級"
  },
  "rawExtractedText": "OCRで読み取れた全テキストの要約",
  "confidence": "high" または "medium" または "low"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('OCRテキストの解析に失敗しました。');
      }
    }

    res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('OCR extraction error:', error);
    res.status(500).json({
      error: error.message || '教材画像の読み取りに失敗しました。再試行してください。',
    });
  }
});

// Start Express server and mount Vite
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TOEIC Dictation] Server running on port ${PORT}`);
  });
}

startServer();
