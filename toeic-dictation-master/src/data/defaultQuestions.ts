import { Question } from '../types';

export const DEFAULT_QUESTIONS: Question[] = [
  // PART 1: Photographs
  {
    id: 'p1-q1',
    part: 1,
    questionNumber: 1,
    title: 'Part 1 - Standing beside the window',
    description: '写真描写問題：オフィスで窓辺に立つ女性',
    imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80',
    sentences: [
      {
        id: 'p1-q1-s1',
        order: 1,
        text: 'The woman is standing beside the window.',
        translation: '女性が窓のそばに立っています。',
        startTime: 0.0,
        endTime: 3.2,
      },
    ],
    vocabulary: [
      { word: 'beside', meaning: '〜のそばに（= next to）' },
      { word: 'stand', meaning: '立っている（動作ではなく状態を表す進行形）' },
    ],
    grammarPoints: [
      '現在進行形（is standing）が「立っている状態」を表しています。',
      '前置詞 beside は next to と同義で、TOEIC Part 1 の超頻出前置詞です。',
    ],
    listeningTips: [
      'is standing の [s] 音が連結して「イズ・スタンディング」ではなく「イスタンディング」のように流れるように聞こえます。',
      'the window の [ðə] は弱形となり短く発音されます。',
    ],
    commentary: {
      extractedFromMaterial: {
        questionNumber: 'Part 1 No. 1',
        englishSentences: [
          {
            text: 'The woman is standing beside the window.',
            translation: '女性が窓のそばに立っています。',
          },
        ],
        grammarPoints: [
          '現在進行形（is standing）が人物の状態を描写しています。',
          'beside は位置を表す頻出前置詞。',
        ],
        vocabulary: [
          { word: 'beside', meaning: '〜のそばに' },
          { word: 'window', meaning: '窓' },
        ],
        listeningTips: [
          '弱形「the」と「beside」のリズムに注意。',
        ],
      },
      aiSupplement: {
        explanation: 'Part 1 では「動作の最中」なのか「完了した状態」なのかの区別が問われます。stand, sit, wear などの状態進行形は特に頻出です。',
        difficultyRating: '初級',
      },
    },
    confidence: 'high',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'p1-q2',
    part: 1,
    questionNumber: 2,
    title: 'Part 1 - Boxes stacked in the warehouse',
    description: '写真描写問題：倉庫に積み上げられたダンボール箱',
    imageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    sentences: [
      {
        id: 'p1-q2-s1',
        order: 1,
        text: 'Some boxes are stacked on top of each other in the warehouse.',
        translation: 'いくつかの箱が倉庫の中で積み重ねられています。',
        startTime: 0.0,
        endTime: 4.5,
      },
    ],
    vocabulary: [
      { word: 'stack', meaning: '〜を積み重ねる、積み重なる' },
      { word: 'on top of each other', meaning: 'お互いの上に、重なり合って' },
      { word: 'warehouse', meaning: '倉庫' },
    ],
    grammarPoints: [
      '受動態（are stacked）で物が積み重なっている状態を描写しています。',
      '主語が物である場合の受け身描写は Part 1 の王道パターンです。',
    ],
    listeningTips: [
      'stacked on は [t] と [ɑ] が連結して「スタックトン」のように発音されます。',
      'top of each other は「タップオヴィーチアザー」とひと息で発音されます。',
    ],
    commentary: {
      extractedFromMaterial: {
        questionNumber: 'Part 1 No. 2',
        grammarPoints: ['受動態 are stacked による物の状態描写。'],
        vocabulary: [
          { word: 'stack', meaning: '積み重ねる' },
          { word: 'warehouse', meaning: '倉庫' },
        ],
        listeningTips: ['stacked on top of の音の連結（リンキング）を掴みましょう。'],
      },
    },
    confidence: 'high',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },

  // PART 2: Question-Response
  {
    id: 'p2-q1',
    part: 2,
    questionNumber: 7,
    title: 'Part 2 - Financial Reports Location',
    description: '疑問詞Where疑問文：更新された四半期財務報告書の置き場所',
    sentences: [
      {
        id: 'p2-q1-s1',
        order: 1,
        text: 'Where did you leave the updated quarterly financial reports?',
        translation: '更新された四半期財務報告書をどこに置きましたか？',
        startTime: 0.0,
        endTime: 3.8,
      },
    ],
    vocabulary: [
      { word: 'updated', meaning: '最新の、更新された' },
      { word: 'quarterly', meaning: '四半期ごとの、年4回の' },
      { word: 'financial report', meaning: '財務諸表、決算報告書' },
      { word: 'leave', meaning: '〜を置いておく、残す' },
    ],
    grammarPoints: [
      'Where did you ...? の疑問詞過去形疑問文です。',
      '過去分詞形容詞（updated）が名詞句を修飾しています。',
    ],
    listeningTips: [
      'Where did you は口語では「ウェアディジュ」と一瞬で発音されます。冒頭の2単語を聞き逃さないことが最重要です。',
      'updated quarterly financial の子音重複部分でリズムを崩されないようにしましょう。',
    ],
    commentary: {
      extractedFromMaterial: {
        questionNumber: 'Part 2 No. 7',
        grammarPoints: ['Where疑問文。場所を尋ねる疑問詞に集中する。'],
        vocabulary: [
          { word: 'quarterly', meaning: '四半期ごとの' },
          { word: 'financial report', meaning: '財務報告書' },
        ],
        listeningTips: ['Where did you の脱落・同化（ウェアディジュ）。'],
      },
    },
    confidence: 'high',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'p2-q2',
    part: 2,
    questionNumber: 15,
    title: 'Part 2 - Reserving a Conference Room',
    description: '申し出疑問文：クライアント会議のための会議室予約',
    sentences: [
      {
        id: 'p2-q2-s1',
        order: 1,
        text: 'Would you like me to reserve a conference room for the client meeting?',
        translation: 'クライアントとの会議のために会議室を予約しましょうか？',
        startTime: 0.0,
        endTime: 4.2,
      },
    ],
    vocabulary: [
      { word: 'Would you like me to do?', meaning: '私に〜してほしいですか？（〜しましょうか？）' },
      { word: 'reserve', meaning: '〜を予約する（= book）' },
      { word: 'conference room', meaning: '会議室' },
    ],
    grammarPoints: [
      'Would you like me to + 動詞の原形 は、相手への親切な申し出を表す定番表現です。',
    ],
    listeningTips: [
      'Would you は「ウジュ」、like me to は「ライクミートゥ」と弱く速く発音されます。',
    ],
    confidence: 'high',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },

  // PART 3: Conversations (Multiple sentences)
  {
    id: 'p3-q1',
    part: 3,
    questionNumber: 32,
    title: 'Part 3 - Project Deadline & Graphic Designer',
    description: '2人の会話：ウェブサイト再設計の納期とデザイナーの手配',
    sentences: [
      {
        id: 'p3-q1-s1',
        order: 1,
        speaker: 'Woman',
        text: 'Hi Marcus, have you had a chance to review the website redesign proposal?',
        translation: 'こんにちはマーカス、ウェブサイト再設計の提案書を確認する時間はありましたか？',
        startTime: 0.0,
        endTime: 4.5,
      },
      {
        id: 'p3-q1-s2',
        order: 2,
        speaker: 'Man',
        text: 'Yes, but I am worried that the proposed deadline might be too tight for our team.',
        translation: 'ええ、ですが提案されている締め切りは私たちのチームにとって厳しすぎるのではないかと心配しています。',
        startTime: 4.6,
        endTime: 9.8,
      },
      {
        id: 'p3-q1-s3',
        order: 3,
        speaker: 'Woman',
        text: 'I understand your concern, so we could hire a freelance graphic designer to assist us.',
        translation: '懸念はもっともですので、私たちを手伝ってくれるフリーランスのグラフィックデザイナーを雇うこともできますよ。',
        startTime: 9.9,
        endTime: 15.2,
      },
      {
        id: 'p3-q1-s4',
        order: 4,
        speaker: 'Man',
        text: 'That would be a huge relief, especially since our lead developer is on leave next week.',
        translation: 'それは本当に助かります。特に来週は主任開発者が休暇を取っているので。',
        startTime: 15.3,
        endTime: 21.0,
      },
    ],
    vocabulary: [
      { word: 'have a chance to do', meaning: '〜する機会・時間がある' },
      { word: 'redesign proposal', meaning: '再設計の提案書' },
      { word: 'tight deadline', meaning: '厳しい・逼迫した締め切り' },
      { word: 'relief', meaning: '安心、安堵（That would be a huge relief で「大助かりです」）' },
      { word: 'on leave', meaning: '休暇中で' },
    ],
    grammarPoints: [
      'have you had a chance to はビジネス会話での超頻出依頼・確認フレーズです。',
      'that節内の might be too tight（〜すぎるかもしれない）という控えめな懸念の表現。',
      'especially since（特に〜なので）は理由を後から付け足す接続詞句です。',
    ],
    listeningTips: [
      'have you had a は「ハヴユハダ」と一息に縮まります。',
      'too tight for は [t] が脱落し「トゥータイフォー」と聞こえることがあります。',
      'is on leave の [z] と [ɑ] が連結して「イズオンリーヴ」になります。',
    ],
    confidence: 'high',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },

  // PART 4: Talks (Monologue announcements)
  {
    id: 'p4-q1',
    part: 4,
    questionNumber: 71,
    title: 'Part 4 - Airport Flight Departure Announcement',
    description: 'アナウンス問題：悪天候による出発ゲート変更と搭乗手続きの案内',
    sentences: [
      {
        id: 'p4-q1-s1',
        order: 1,
        speaker: 'Announcer',
        text: 'May I have your attention please, passengers booked on Oceanic Airways flight 402 to Chicago.',
        translation: 'シカゴ行きオーシャニック航空402便をご予約のお客様、ご案内申し上げます。',
        startTime: 0.0,
        endTime: 6.2,
      },
      {
        id: 'p4-q1-s2',
        order: 2,
        speaker: 'Announcer',
        text: 'Due to severe weather conditions along our flight path, the departure has been postponed by forty minutes.',
        translation: '飛行ルート上の悪天候のため、出発が40分遅延しております。',
        startTime: 6.3,
        endTime: 12.8,
      },
      {
        id: 'p4-q1-s3',
        order: 3,
        speaker: 'Announcer',
        text: 'Additionally, our departure gate has been moved from gate B12 to gate C8.',
        translation: 'さらに、出発ゲートがB12番からC8番ゲートへ変更となりました。',
        startTime: 12.9,
        endTime: 18.0,
      },
      {
        id: 'p4-q1-s4',
        order: 4,
        speaker: 'Announcer',
        text: 'Please check the digital monitors located throughout the terminal for the latest updates.',
        translation: '最新情報はターミナル各所に設置されているデジタルモニターをご確認ください。',
        startTime: 18.1,
        endTime: 23.5,
      },
      {
        id: 'p4-q1-s5',
        order: 5,
        speaker: 'Announcer',
        text: 'We sincerely apologize for the inconvenience and appreciate your patience.',
        translation: 'ご不便をおかけしますことを深くお詫び申し上げるとともに、ご理解に感謝申し上げます。',
        startTime: 23.6,
        endTime: 29.0,
      },
    ],
    vocabulary: [
      { word: 'attention', meaning: '注意、注目（May I have your attention please で「皆様にお知らせいたします」）' },
      { word: 'severe weather conditions', meaning: '悪天候、厳しい気象条件' },
      { word: 'postpone', meaning: '〜を延期する（= delay）' },
      { word: 'throughout the terminal', meaning: 'ターミナル全体のあちこちに' },
      { word: 'inconvenience', meaning: '不便、迷惑' },
      { word: 'patience', meaning: '忍耐、我慢、理解' },
    ],
    grammarPoints: [
      'passengers booked on ... は過去分詞による後置修飾で「〜に予約された乗客」を表します。',
      'has been postponed（現在完了形の受動態）で「延期が決定され、今もその状態である」ことを表します。',
      'We sincerely apologize for ... and appreciate your patience は公式アナウンスの定型句。',
    ],
    listeningTips: [
      'Due to は速い発音では「デュートゥ」または「ジュートゥ」のように発音されます。',
      'monitors located throughout で [t] がフラップ化または弱化します。',
      'apologize for the の音が滑らかにつながる感覚を意識しましょう。',
    ],
    confidence: 'high',
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
];
