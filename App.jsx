import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  PlusCircle, 
  Search, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Circle, 
  Download, 
  Upload, 
  Smartphone, 
  Monitor, 
  ChevronRight, 
  ChevronLeft,
  Sparkles,
  Layers,
  HelpCircle,
  X,
  Plus,
  Compass,
  Tag,
  ArrowRightCircle,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Calendar,
  Filter,
  FileImage,
  UploadCloud
} from 'lucide-react';

// --- IndexedDB ヘルパー (画像の容量無制限保存用) ---
const DB_NAME = 'PeraPeraImagesDB';
const STORE_NAME = 'captured_images';

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
};

const saveImageToDB = async (imageItem) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(imageItem);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('IndexedDB Save Error:', err);
  }
};

const getAllImagesFromDB = async () => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('IndexedDB Load Error:', err);
    return [];
  }
};

const deleteImageFromDB = async (id) => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('IndexedDB Delete Error:', err);
  }
};

// 画像リサイズ＆圧縮用関数 (Canvas API)
const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// 初期デモデータ (メイン単語帳)
const INITIAL_VOCAB = [
  {
    id: '1',
    word: 'Resilient',
    phonetic: '/rɪˈzɪliənt/',
    meaning: '回復力がある、立ち直りが早い、弾力のある',
    learned: false,
    examples: [
      { id: 'ex1-1', english: 'She is a resilient woman who has overcome many hardships.', japanese: '彼女は多くの苦難を乗り越えてきた、回復力の強い女性だ。' },
      { id: 'ex1-2', english: 'The local economy proved to be remarkably resilient.', japanese: '地域経済は著しく強い回復力を示した。' },
      { id: 'ex1-3', english: 'This material is highly resilient to high temperatures.', japanese: 'この素材は高温に対して非常に耐久性（復元力）がある。' }
    ]
  },
  {
    id: '2',
    word: 'Ambiguous',
    phonetic: '/æmˈbɪɡjuəs/',
    meaning: 'あいまいな、多義の、二つ以上の意味にとれる',
    learned: true,
    examples: [
      { id: 'ex2-1', english: 'His response to the question was ambiguous.', japanese: 'その質問に対する彼の回答はあいまいだった。' },
      { id: 'ex2-2', english: 'The contract contains several ambiguous clauses.', japanese: 'その契約書にはいくつかのあいまいな条項が含まれている。' }
    ]
  },
  {
    id: '3',
    word: 'Meticulous',
    phonetic: '/məˈtɪkjələs/',
    meaning: '細部まで行き届いた、きわめて慎重な、綿密な',
    learned: false,
    examples: [
      { id: 'ex3-1', english: 'He kept meticulous records of all financial transactions.', japanese: '彼はすべての金融取引の綿密な記録を残していた。' },
      { id: 'ex3-2', english: 'She paid meticulous attention to detail.', japanese: '彼女は細部に細心の注意を払った。' }
    ]
  }
];

// 初期デモデータ (野生の英単語)
const INITIAL_WILD_WORDS = [
  {
    id: 'w1',
    word: 'Serendipity',
    locationTag: 'Tシャツの胸元プリント',
    note: 'カフェで見かけた人が着ていた。思いがけない幸運という意味？',
    date: '2026-11-05'
  },
  {
    id: 'w2',
    word: 'Caution: Wet Floor',
    locationTag: '駅の看板・標識',
    note: '足元注意の黄色い看板',
    date: '2026-11-07'
  }
];

// 初期デモ画像 (サンプルPlaceholder)
const INITIAL_DEMO_IMAGES = [
  {
    id: 'img-demo-1',
    title: '洋服のバックプリント英字',
    category: '洋服・雑貨',
    note: '「EMBRACE THE UNKNOWN」と書いてあった。未知を受け入れる？',
    date: '2026-11-20',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%231e293b"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="%23f8fafc" font-size="28" font-family="sans-serif" font-weight="bold">EMBRACE THE UNKNOWN</text><text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-size="16" font-family="sans-serif">Sample Captured Screenshot</text></svg>'
  },
  {
    id: 'img-demo-2',
    title: 'カフェの黒板メニュー標識',
    category: '標識・看板',
    note: '「Freshly Brewed Happiness」＝淹れたての幸せ。表現が素敵。',
    date: '2026-11-22',
    dataUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%230f172a"/><rect x="20" y="20" width="560" height="360" rx="15" fill="none" stroke="%23334155" stroke-width="4"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="%23fbbf24" font-size="26" font-family="serif" font-style="italic">Freshly Brewed Happiness</text><text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" fill="%2364748b" font-size="14" font-family="sans-serif">Coffee Shop Signbook</text></svg>'
  }
];

export default function App() {
  // --- ステート設定 ---
  const [words, setWords] = useState(() => {
    const saved = localStorage.getItem('vocab_app_words');
    return saved ? JSON.parse(saved) : INITIAL_VOCAB;
  });

  const [wildWords, setWildWords] = useState(() => {
    const saved = localStorage.getItem('vocab_app_wild_words');
    return saved ? JSON.parse(saved) : INITIAL_WILD_WORDS;
  });

  // 「拾った画像」用ステート
  const [capturedImages, setCapturedImages] = useState([]);
  const [imageCategoryFilter, setImageCategoryFilter] = useState('すべて');
  const [selectedImageIndex, setSelectedImageIndex] = useState(null); // フルスクリーンビューア用

  // 新規画像アップロードフォーム用
  const [imageTitleInput, setImageTitleInput] = useState('');
  const [imageCategoryInput, setImageCategoryInput] = useState('スクリーンショット');
  const [imageNoteInput, setImageNoteInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'add' | 'wild' | 'images' | 'settings'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLearned, setFilterLearned] = useState('all');
  const [selectedWord, setSelectedWord] = useState(null);

  // 野生の英単語 フォームステート
  const [wildWordInput, setWildWordInput] = useState('');
  const [wildLocationInput, setWildLocationInput] = useState('');
  const [wildNoteInput, setWildNoteInput] = useState('');
  const [wildSearchQuery, setWildSearchQuery] = useState('');

  // 編集用ステート
  const [editingId, setEditingId] = useState(null);
  const [formWord, setFormWord] = useState('');
  const [formPhonetic, setFormPhonetic] = useState('');
  const [formMeaning, setFormMeaning] = useState('');
  const [formExamples, setFormExamples] = useState([{ english: '', japanese: '' }]);
  const [formError, setFormError] = useState('');

  // ローカルストレージ & IndexedDB 保存
  useEffect(() => {
    localStorage.setItem('vocab_app_words', JSON.stringify(words));
  }, [words]);

  useEffect(() => {
    localStorage.setItem('vocab_app_wild_words', JSON.stringify(wildWords));
  }, [wildWords]);

  // IndexedDBから画像を読み込み
  useEffect(() => {
    const loadImages = async () => {
      const dbImages = await getAllImagesFromDB();
      if (dbImages.length === 0) {
        // 初回デフォルトデモデータを登録
        for (const demoImg of INITIAL_DEMO_IMAGES) {
          await saveImageToDB(demoImg);
        }
        setCapturedImages(INITIAL_DEMO_IMAGES);
      } else {
        setCapturedImages(dbImages);
      }
    };
    loadImages();
  }, []);

  // アルファベット順（A-Z）ソート済みのメイン単語リスト
  const sortedWords = useMemo(() => {
    return [...words].sort((a, b) => 
      a.word.localeCompare(b.word, 'en', { sensitivity: 'base' })
    );
  }, [words]);

  const filteredWords = useMemo(() => {
    return sortedWords.filter(item => {
      const matchesSearch = 
        item.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.meaning.includes(searchQuery);
      
      if (filterLearned === 'learned') return matchesSearch && item.learned;
      if (filterLearned === 'unlearned') return matchesSearch && !item.learned;
      return matchesSearch;
    });
  }, [sortedWords, searchQuery, filterLearned]);

  const filteredWildWords = useMemo(() => {
    return [...wildWords]
      .reverse()
      .filter(item => 
        item.word.toLowerCase().includes(wildSearchQuery.toLowerCase()) ||
        item.locationTag.toLowerCase().includes(wildSearchQuery.toLowerCase()) ||
        item.note.toLowerCase().includes(wildSearchQuery.toLowerCase())
      );
  }, [wildWords, wildSearchQuery]);

  // 画像フィルター
  const filteredCapturedImages = useMemo(() => {
    return [...capturedImages]
      .reverse()
      .filter(img => {
        if (imageCategoryFilter === 'すべて') return true;
        return img.category === imageCategoryFilter;
      });
  }, [capturedImages, imageCategoryFilter]);

  // 習得状態の切り替え
  const toggleLearned = (id, e) => {
    if (e) e.stopPropagation();
    setWords(prev => prev.map(item => 
      item.id === id ? { ...item, learned: !item.learned } : item
    ));
  };

  // --- 画像アップロード＆保存ハンドラー ---
  const handleImageFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedDataUrl = await compressImage(file, 1200, 0.8);

        const newImageItem = {
          id: `img-${Date.now()}-${i}`,
          title: imageTitleInput.trim() || file.name.replace(/\.[^/.]+$/, "") || 'スクリーンショット',
          category: imageCategoryInput,
          note: imageNoteInput.trim(),
          date: new Date().toISOString().slice(0, 10),
          dataUrl: compressedDataUrl
        };

        await saveImageToDB(newImageItem);
        setCapturedImages(prev => [...prev, newImageItem]);
      }

      // 入力初期化
      setImageTitleInput('');
      setImageNoteInput('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      alert('画像の読み込みに失敗しました。');
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('この画像を削除してもよろしいですか？')) {
      await deleteImageFromDB(id);
      setCapturedImages(prev => prev.filter(img => img.id !== id));
      if (selectedImageIndex !== null) setSelectedImageIndex(null);
    }
  };

  // 野生の英単語を追加
  const handleAddWildWord = (e) => {
    e.preventDefault();
    if (!wildWordInput.trim()) return;

    const newWild = {
      id: `w-${Date.now()}`,
      word: wildWordInput.trim(),
      locationTag: wildLocationInput.trim() || '街中・その他',
      note: wildNoteInput.trim(),
      date: new Date().toISOString().slice(0, 10)
    };

    setWildWords(prev => [...prev, newWild]);
    setWildWordInput('');
    setWildLocationInput('');
    setWildNoteInput('');
  };

  const handleDeleteWildWord = (id) => {
    setWildWords(prev => prev.filter(w => w.id !== id));
  };

  const handlePromoteWildWord = (wildItem) => {
    setEditingId(null);
    setFormWord(wildItem.word);
    setFormPhonetic('');
    setFormMeaning(wildItem.note || '');
    setFormExamples([{ english: '', japanese: '' }]);
    setFormError('');
    setActiveTab('add');
  };

  // メイン単語フォームハンドラー
  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormWord('');
    setFormPhonetic('');
    setFormMeaning('');
    setFormExamples([{ english: '', japanese: '' }]);
    setFormError('');
    setActiveTab('add');
  };

  const handleOpenEditForm = (item, e) => {
    if (e) e.stopPropagation();
    setEditingId(item.id);
    setFormWord(item.word);
    setFormPhonetic(item.phonetic || '');
    setFormMeaning(item.meaning);
    setFormExamples(
      item.examples && item.examples.length > 0 
        ? item.examples.map(ex => ({ english: ex.english, japanese: ex.japanese }))
        : [{ english: '', japanese: '' }]
    );
    setFormError('');
    setActiveTab('add');
  };

  const handleAddExampleInput = () => {
    if (formExamples.length < 5) {
      setFormExamples([...formExamples, { english: '', japanese: '' }]);
    }
  };

  const handleRemoveExampleInput = (index) => {
    if (formExamples.length > 1) {
      setFormExamples(formExamples.filter((_, i) => i !== index));
    } else {
      setFormExamples([{ english: '', japanese: '' }]);
    }
  };

  const handleExampleChange = (index, field, value) => {
    const updated = [...formExamples];
    updated[index][field] = value;
    setFormExamples(updated);
  };

  const handleSaveWord = (e) => {
    e.preventDefault();
    if (!formWord.trim() || !formMeaning.trim()) {
      setFormError('英単語と和訳は必須入力です。');
      return;
    }

    const validExamples = formExamples
      .filter(ex => ex.english.trim() !== '' || ex.japanese.trim() !== '')
      .map((ex, idx) => ({
        id: `ex-${Date.now()}-${idx}`,
        english: ex.english.trim(),
        japanese: ex.japanese.trim()
      }))
      .slice(0, 5);

    if (editingId) {
      setWords(prev => prev.map(item => item.id === editingId ? {
        ...item,
        word: formWord.trim(),
        phonetic: formPhonetic.trim(),
        meaning: formMeaning.trim(),
        examples: validExamples
      } : item));
    } else {
      const newEntry = {
        id: Date.now().toString(),
        word: formWord.trim(),
        phonetic: formPhonetic.trim(),
        meaning: formMeaning.trim(),
        learned: false,
        examples: validExamples
      };
      setWords(prev => [...prev, newEntry]);
    }

    setActiveTab('list');
  };

  const handleDeleteWord = (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm('この単語を削除してもよろしいですか？')) {
      setWords(prev => prev.filter(item => item.id !== id));
      if (selectedWord?.id === id) {
        setSelectedWord(null);
      }
    }
  };

  // エクスポート & インポート
  const handleExportData = async () => {
    const imagesFromDB = await getAllImagesFromDB();
    const exportPayload = {
      words,
      wildWords,
      capturedImages: imagesFromDB
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `perapera_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (event) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (Array.isArray(parsed)) {
            setWords(parsed);
          } else if (parsed.words) {
            setWords(parsed.words);
            if (parsed.wildWords) setWildWords(parsed.wildWords);
            if (parsed.capturedImages && Array.isArray(parsed.capturedImages)) {
              for (const img of parsed.capturedImages) {
                await saveImageToDB(img);
              }
              setCapturedImages(parsed.capturedImages);
            }
          }
          alert('データを正常にインポートしました！');
        } catch (err) {
          alert('JSONファイルの読み込みに失敗しました。');
        }
      };
    }
  };

  const handleResetDemoData = async () => {
    if (window.confirm('初期デモデータに戻しますか？（現在のデータは上書きされます）')) {
      setWords(INITIAL_VOCAB);
      setWildWords(INITIAL_WILD_WORDS);
      setCapturedImages(INITIAL_DEMO_IMAGES);
      for (const demoImg of INITIAL_DEMO_IMAGES) {
        await saveImageToDB(demoImg);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white pb-24 md:pb-0">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white p-2 rounded-xl shadow-md shadow-indigo-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg leading-tight tracking-tight text-slate-900">
                英語Pera Pera
              </h1>
              <p className="text-xs text-slate-500 hidden sm:block">単語帳 ＆ 街なか英単語・スクショメモ</p>
            </div>
          </div>

          {/* デスクトップ用ナビゲーション */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'list' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>単語一覧 ({words.length})</span>
            </button>

            <button
              onClick={handleOpenAddForm}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'add' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>{editingId ? '単語を編集' : '単語を登録'}</span>
            </button>
            
            <button
              onClick={() => setActiveTab('wild')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'wild' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Compass className="w-4 h-4 text-emerald-600" />
              <span>野生の英単語 ({wildWords.length})</span>
            </button>

            {/* ★新規追加：「拾った画像」タブ */}
            <button
              onClick={() => setActiveTab('images')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'images' ? 'bg-purple-50 text-purple-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-purple-600" />
              <span className="flex items-center">
                拾った画像
                {capturedImages.length > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 bg-purple-100 text-purple-800 text-[10px] font-bold rounded-full">
                    {capturedImages.length}
                  </span>
                )}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                activeTab === 'settings' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>設定</span>
            </button>
          </nav>

          {/* 右側モバイルクイックアクション */}
          <div className="flex items-center space-x-2 md:hidden">
            <button
              onClick={() => setActiveTab('images')}
              className="bg-purple-50 border border-purple-200 text-purple-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 active:scale-95"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>画像</span>
            </button>
            <button
              onClick={handleOpenAddForm}
              className="bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 active:scale-95 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>登録</span>
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ領域 */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        
        {/* --- 1. 単語一覧タブ --- */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm border border-slate-200/80 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="英単語または和訳で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-medium">
                  <button
                    onClick={() => setFilterLearned('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterLearned === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    すべて ({sortedWords.length})
                  </button>
                  <button
                    onClick={() => setFilterLearned('unlearned')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterLearned === 'unlearned' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    未修得 ({sortedWords.filter(w => !w.learned).length})
                  </button>
                  <button
                    onClick={() => setFilterLearned('learned')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      filterLearned === 'learned' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    習得済み ({sortedWords.filter(w => w.learned).length})
                  </button>
                </div>
                
                <span className="text-xs text-slate-400 hidden sm:inline-block font-medium">
                  アルファベット順 (A-Z)
                </span>
              </div>
            </div>

            {filteredWords.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
                <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-slate-700 font-semibold mb-1">該当する単語が見つかりません</h3>
                <p className="text-slate-400 text-sm mb-4">新しい単語を登録するか、検索ワードを変更してください。</p>
                <button
                  onClick={handleOpenAddForm}
                  className="inline-flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>新しい単語を追加</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredWords.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedWord(item)}
                    className="group bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer relative overflow-hidden active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 pr-8">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h2 className="text-xl font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                            {item.word}
                          </h2>
                          {item.phonetic && (
                            <span className="text-xs text-slate-400 font-mono">
                              {item.phonetic}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 font-medium line-clamp-1">
                          {item.meaning}
                        </p>
                      </div>

                      <button
                        onClick={(e) => toggleLearned(item.id, e)}
                        className="text-slate-300 hover:text-emerald-500 transition-colors p-1"
                        title={item.learned ? "未修得に戻す" : "習得済みにする"}
                      >
                        {item.learned ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 fill-emerald-50" />
                        ) : (
                          <Circle className="w-6 h-6 hover:text-slate-400" />
                        )}
                      </button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                        例文 {item.examples ? item.examples.length : 0} 件
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={(e) => handleOpenEditForm(item, e)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                          title="編集"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteWord(item.id, e)}
                          className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- 2. 単語登録 / 編集フォームタブ --- */}
        {activeTab === 'add' && (
          <div className="bg-white rounded-2xl p-5 sm:p-7 shadow-sm border border-slate-200/80 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editingId ? '単語の編集' : '新しい単語を登録'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  英単語、和訳、および最大5つの例文ペアを登録できます。
                </p>
              </div>
              <button
                onClick={() => setActiveTab('list')}
                className="text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                キャンセル
              </button>
            </div>

            {formError && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveWord} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    英単語 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例: Resilient"
                    value={formWord}
                    onChange={(e) => setFormWord(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                    発音記号 (任意)
                  </label>
                  <input
                    type="text"
                    placeholder="例: /rɪˈzɪliənt/"
                    value={formPhonetic}
                    onChange={(e) => setFormPhonetic(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                  和訳 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 回復力がある、立ち直りが早い"
                  value={formMeaning}
                  onChange={(e) => setFormMeaning(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      例文と和訳 (最大5つ)
                    </h3>
                    <p className="text-xs text-slate-400">
                      iPhoneでの学習時、例文と和訳をそれぞれタップで表示/隠すことができます。
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-600 rounded-md">
                    {formExamples.length} / 5
                  </span>
                </div>

                <div className="space-y-4">
                  {formExamples.map((ex, index) => (
                    <div 
                      key={index} 
                      className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                        <span>例文 {index + 1}</span>
                        {formExamples.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExampleInput(index)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder={`例文 ${index + 1} (英語)`}
                          value={ex.english}
                          onChange={(e) => handleExampleChange(index, 'english', e.target.value)}
                          className="w-full px-3 py-2 text-base sm:text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        />
                        <input
                          type="text"
                          placeholder={`例文 ${index + 1} の和訳 (日本語)`}
                          value={ex.japanese}
                          onChange={(e) => handleExampleChange(index, 'japanese', e.target.value)}
                          className="w-full px-3 py-2 text-base sm:text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {formExamples.length < 5 && (
                  <button
                    type="button"
                    onClick={handleAddExampleInput}
                    className="w-full py-2.5 border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50/50 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>例文入力欄を追加する</span>
                  </button>
                )}
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-100 transition-colors"
                >
                  {editingId ? '変更を保存' : '登録する'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* --- 3. 野生の英単語タブ --- */}
        {activeTab === 'wild' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-5 shadow-lg shadow-emerald-100 space-y-4">
              <div className="flex items-center space-x-2">
                <Compass className="w-6 h-6 text-emerald-200" />
                <div>
                  <h2 className="font-extrabold text-lg">野生の英単語をメモ</h2>
                  <p className="text-xs text-emerald-100">街の看板、Tシャツ、服のプリント、映画などで気になった単語をすぐ記録！</p>
                </div>
              </div>

              <form onSubmit={handleAddWildWord} className="space-y-3 bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/20">
                <div>
                  <input
                    type="text"
                    required
                    placeholder="英単語・フレーズ (例: Serendipity)"
                    value={wildWordInput}
                    onChange={(e) => setWildWordInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-base sm:text-sm bg-white text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 placeholder:text-slate-400 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Tag className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="見かけた場所 (例: Tシャツ, 看板)"
                      value={wildLocationInput}
                      onChange={(e) => setWildLocationInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-base sm:text-xs bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 placeholder:text-slate-400"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="メモ・仮の意味 (例: 思いがけない幸運？)"
                    value={wildNoteInput}
                    onChange={(e) => setWildNoteInput(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 placeholder:text-slate-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold rounded-xl text-xs sm:text-sm shadow transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>野生単語をストックする</span>
                </button>
              </form>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                  <span>ストックした野生の単語</span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 text-xs rounded-full">
                    {wildWords.length}
                  </span>
                </h3>

                {wildWords.length > 0 && (
                  <div className="relative w-44">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="検索..."
                      value={wildSearchQuery}
                      onChange={(e) => setWildSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>

              {filteredWildWords.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200 p-6">
                  <Compass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm font-medium">野生の英単語はまだストックされていません</p>
                  <p className="text-slate-400 text-xs mt-1">街や日常で見かけた気になる英単語を上のフォームからサッとメモしましょう！</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredWildWords.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-2 relative"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-100 mb-1">
                            <Tag className="w-3 h-3" />
                            <span>{item.locationTag}</span>
                          </span>
                          <h4 className="text-lg font-bold text-slate-900 tracking-tight">
                            {item.word}
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {item.date}
                        </span>
                      </div>

                      {item.note && (
                        <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          {item.note}
                        </p>
                      )}

                      <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-100">
                        <button
                          onClick={() => handlePromoteWildWord(item)}
                          className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1 text-xs bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                        >
                          <ArrowRightCircle className="w-3.5 h-3.5" />
                          <span>単語帳に正式登録する</span>
                        </button>

                        <button
                          onClick={() => handleDeleteWildWord(item.id)}
                          className="text-slate-400 hover:text-red-500 p-1 transition-colors"
                          title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- ★ 4. 新機能：「拾った画像」タブ (Netflixスタイルのカードギャラリー) --- */}
        {activeTab === 'images' && (
          <div className="space-y-6">
            
            {/* アップロードエリア */}
            <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-2xl p-5 shadow-xl border border-purple-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-purple-500/20 rounded-xl border border-purple-400/30">
                    <ImageIcon className="w-6 h-6 text-purple-300" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-slate-100">拾った画像ギャラリー</h2>
                    <p className="text-xs text-purple-200">iPhoneのスクショや洋服・標識の写真を保存していつでも拡大閲覧</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-purple-900/80 border border-purple-700/50 rounded-full text-purple-200">
                  {capturedImages.length} 枚保存中
                </span>
              </div>

              {/* アップロードフォーム */}
              <div className="bg-white/5 border border-white/10 backdrop-blur-md rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="タイトル / 一言メモ (例: カフェの洋書スクショ)"
                    value={imageTitleInput}
                    onChange={(e) => setImageTitleInput(e.target.value)}
                    className="w-full px-3.5 py-2 text-base sm:text-xs bg-slate-800/80 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-slate-400"
                  />
                  <select
                    value={imageCategoryInput}
                    onChange={(e) => setImageCategoryInput(e.target.value)}
                    className="w-full px-3 py-2 text-base sm:text-xs bg-slate-800/80 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="スクリーンショット">スクリーンショット</option>
                    <option value="標識・看板">標識・看板</option>
                    <option value="洋服・雑貨">洋服・雑貨</option>
                    <option value="本・雑誌">本・雑誌</option>
                    <option value="その他">その他</option>
                  </select>
                </div>

                <input
                  type="text"
                  placeholder="追加の詳細メモ (例文・気になったフレーズ等)"
                  value={imageNoteInput}
                  onChange={(e) => setImageNoteInput(e.target.value)}
                  className="w-full px-3 py-2 text-base sm:text-xs bg-slate-800/80 text-white rounded-lg border border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400 placeholder:text-slate-400"
                />

                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    multiple
                    onChange={handleImageFileSelect}
                    className="hidden"
                    id="image-file-input"
                  />
                  <label
                    htmlFor="image-file-input"
                    className={`flex-1 py-3 px-4 rounded-xl border-2 border-dashed ${
                      isUploading 
                        ? 'bg-purple-900/40 border-purple-500 text-purple-300' 
                        : 'bg-purple-600/30 hover:bg-purple-600/40 border-purple-400/60 text-purple-100 cursor-pointer'
                    } flex items-center justify-center space-x-2 transition-all active:scale-[0.98]`}
                  >
                    <UploadCloud className="w-5 h-5 text-purple-300 animate-bounce" />
                    <span className="text-xs font-bold">
                      {isUploading ? '画像を圧縮保存中...' : 'iPhoneのスクショ・写真を選択（複数可）'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* カテゴリフィルターバー */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full text-xs font-medium">
                {['すべて', 'スクリーンショット', '標識・看板', '洋服・雑貨', '本・雑誌', 'その他'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setImageCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                      imageCategoryFilter === cat 
                        ? 'bg-slate-900 text-white shadow-md' 
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Netflix風カードギャラリー */}
            {filteredCapturedImages.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
                <FileImage className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-slate-700 font-semibold mb-1">保存された画像がありません</h3>
                <p className="text-slate-400 text-xs mb-4">上のフォームからスクショや写真をアップロードしてください。</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                {filteredCapturedImages.map((img, index) => (
                  <div
                    key={img.id}
                    onClick={() => setSelectedImageIndex(index)}
                    className="group relative bg-slate-900 rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 aspect-[3/4] flex flex-col justify-end border border-slate-800"
                  >
                    {/* 画像サムネイル */}
                    <img
                      src={img.dataUrl}
                      alt={img.title}
                      className="absolute inset-0 w-full h-full object-cover object-top opacity-90 group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* 黒グラデーションオーバーレイ (Netflixスタイル) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

                    {/* 上部タグ */}
                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-white text-[10px] font-bold border border-white/10">
                        {img.category}
                      </span>
                      <button
                        onClick={(e) => handleDeleteImage(img.id, e)}
                        className="p-1 rounded-full bg-black/60 hover:bg-red-600/80 text-white/80 hover:text-white transition-colors"
                        title="画像を削除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* 下部情報 (Netflix番組カード風) */}
                    <div className="relative p-3 space-y-1 text-white z-10">
                      <h4 className="font-bold text-xs sm:text-sm line-clamp-1 group-hover:text-purple-300 transition-colors">
                        {img.title}
                      </h4>
                      {img.note && (
                        <p className="text-[11px] text-slate-300 line-clamp-1 opacity-90">
                          {img.note}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-white/10">
                        <span>{img.date}</span>
                        <span className="flex items-center space-x-0.5 text-purple-300">
                          <Maximize2 className="w-3 h-3" />
                          <span>タップで拡大</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- 5. データ管理・設定タブ --- */}
        {activeTab === 'settings' && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <Monitor className="w-5 h-5 text-indigo-600" />
                <span>データ移行・バックアップ (PC/iPhone共通)</span>
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                PCで登録した単語データ、野生メモ、および「拾った画像」をファイルとしてまとめてエクスポートし、他端末で復元できます。
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleExportData}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 flex items-center space-x-3 transition-all text-left"
                >
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">JSONエクスポート</div>
                    <div className="text-xs text-slate-400">画像含む全データをファイル保存</div>
                  </div>
                </button>

                <label className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 flex items-center space-x-3 transition-all cursor-pointer text-left">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">JSONインポート</div>
                    <div className="text-xs text-slate-400">バックアップの復元</div>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <RotateCcwIcon className="w-5 h-5 text-slate-600" />
                <span>データのリセット</span>
              </h2>
              <p className="text-xs text-slate-500">
                初期デモデータ（Sampleデータ）を復元します。
              </p>
              <button
                onClick={handleResetDemoData}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
              >
                デモデータを復元する
              </button>
            </div>
          </div>
        )}

      </main>

      {/* --- 学習モーダル (条件⑦ タップで開閉) --- */}
      {selectedWord && (
        <StudyModal 
          wordItem={selectedWord} 
          onClose={() => setSelectedWord(null)}
          onToggleLearned={(id) => toggleLearned(id)}
        />
      )}

      {/* --- ★ フルスクリーン拡大画像ビューアモーダル --- */}
      {selectedImageIndex !== null && filteredCapturedImages[selectedImageIndex] && (
        <FullScreenImageViewer
          images={filteredCapturedImages}
          currentIndex={selectedImageIndex}
          onClose={() => setSelectedImageIndex(null)}
          onIndexChange={(newIdx) => setSelectedImageIndex(newIdx)}
          onDelete={handleDeleteImage}
        />
      )}

      {/* モバイル用ボトムナビゲーション (iPhoneスタイル - 4つの主要機能) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-20 px-3 py-2">
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('list')}
            className={`flex flex-col items-center space-y-1 ${
              activeTab === 'list' ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] font-medium">単語一覧</span>
          </button>

          <button
            onClick={handleOpenAddForm}
            className={`flex flex-col items-center space-y-1 ${
              activeTab === 'add' ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span className="text-[10px] font-medium">登録</span>
          </button>

          <button
            onClick={() => setActiveTab('wild')}
            className={`flex flex-col items-center space-y-1 relative ${
              activeTab === 'wild' ? 'text-emerald-600' : 'text-slate-400'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[10px] font-medium">野生単語</span>
            {wildWords.length > 0 && (
              <span className="absolute -top-1 right-2 w-2 h-2 bg-emerald-500 rounded-full"></span>
            )}
          </button>

          {/* 新規：拾った画像 */}
          <button
            onClick={() => setActiveTab('images')}
            className={`flex flex-col items-center space-y-1 relative ${
              activeTab === 'images' ? 'text-purple-600' : 'text-slate-400'
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            <span className="text-[10px] font-medium">拾った画像</span>
            {capturedImages.length > 0 && (
              <span className="absolute -top-1 right-2 w-2 h-2 bg-purple-500 rounded-full"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center space-y-1 ${
              activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span className="text-[10px] font-medium">設定</span>
          </button>
        </div>
      </div>

    </div>
  );
}

// 補足コンポーネント: アイコン
function RotateCcwIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
  );
}

// --- 学習モーダル (条件⑦) ---
function StudyModal({ wordItem, onClose, onToggleLearned }) {
  const [showMeaning, setShowMeaning] = useState(false);
  const [visibleExamplesEng, setVisibleExamplesEng] = useState({});
  const [visibleExamplesJap, setVisibleExamplesJap] = useState({});

  const toggleEng = (idx) => {
    setVisibleExamplesEng(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleJap = (idx) => {
    setVisibleExamplesJap(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const handleShowAll = () => {
    setShowMeaning(true);
    const engState = {};
    const japState = {};
    if (wordItem.examples) {
      wordItem.examples.forEach((_, i) => {
        engState[i] = true;
        japState[i] = true;
      });
    }
    setVisibleExamplesEng(engState);
    setVisibleExamplesJap(japState);
  };

  const handleHideAll = () => {
    setShowMeaning(false);
    setVisibleExamplesEng({});
    setVisibleExamplesJap({});
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full">
              学習セルフチェック
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onToggleLearned(wordItem.id)}
              className="p-1.5 rounded-full hover:bg-slate-200/60 text-slate-400 transition-colors"
            >
              {wordItem.learned ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500 fill-emerald-50" />
              ) : (
                <Circle className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-200/60 text-slate-500 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          <div className="text-center space-y-3 py-2">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {wordItem.word}
            </h2>
            {wordItem.phonetic && (
              <p className="text-sm text-slate-400 font-mono">{wordItem.phonetic}</p>
            )}

            <div
              onClick={() => setShowMeaning(!showMeaning)}
              className={`mt-3 p-4 rounded-2xl border transition-all cursor-pointer select-none text-center ${
                showMeaning 
                  ? 'bg-indigo-50/60 border-indigo-200 text-indigo-950' 
                  : 'bg-slate-100 border-dashed border-slate-300 text-slate-400 hover:bg-slate-200/60'
              }`}
            >
              {showMeaning ? (
                <div className="text-base font-bold animate-in fade-in duration-150">
                  {wordItem.meaning}
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2 text-xs font-semibold text-slate-500">
                  <EyeOff className="w-4 h-4" />
                  <span>タップして単語の和訳を表示</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <span className="font-bold text-slate-500">
              登録例文 ({wordItem.examples ? wordItem.examples.length : 0})
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handleShowAll}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium transition-colors"
              >
                すべて表示
              </button>
              <button
                onClick={handleHideAll}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium transition-colors"
              >
                すべて隠す
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {(!wordItem.examples || wordItem.examples.length === 0) ? (
              <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                登録されている例文はありません。
              </div>
            ) : (
              wordItem.examples.map((ex, idx) => {
                const isEngOpen = !!visibleExamplesEng[idx];
                const isJapOpen = !!visibleExamplesJap[idx];

                return (
                  <div 
                    key={ex.id || idx}
                    className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5 shadow-sm"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      例文 {idx + 1}
                    </div>

                    <div
                      onClick={() => toggleEng(idx)}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer select-none active:scale-[0.99] ${
                        isEngOpen
                          ? 'bg-white border-slate-300 text-slate-800 shadow-sm'
                          : 'bg-white/60 border-slate-200 text-slate-400 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-2">
                          {isEngOpen ? (
                            <p className="leading-relaxed font-serif text-slate-900">
                              {ex.english}
                            </p>
                          ) : (
                            <span className="text-xs text-slate-400 font-sans flex items-center space-x-1.5 py-0.5">
                              <Eye className="w-3.5 h-3.5" />
                              <span>例文 {idx + 1}（英語）を表示</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          ENG
                        </span>
                      </div>
                    </div>

                    <div
                      onClick={() => toggleJap(idx)}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all cursor-pointer select-none active:scale-[0.99] ${
                        isJapOpen
                          ? 'bg-amber-50/80 border-amber-200 text-amber-950 shadow-sm'
                          : 'bg-white/60 border-slate-200 text-slate-400 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-2">
                          {isJapOpen ? (
                            <p className="leading-relaxed text-slate-800">
                              {ex.japanese}
                            </p>
                          ) : (
                            <span className="text-xs text-slate-400 font-sans flex items-center space-x-1.5 py-0.5">
                              <Eye className="w-3.5 h-3.5" />
                              <span>例文 {idx + 1}（和訳）を表示</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          JPN
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-sm transition-colors shadow-md"
          >
            学習を完了して閉じる
          </button>
        </div>

      </div>
    </div>
  );
}

// --- ★ フルスクリーン拡大ビューアモーダル ---
function FullScreenImageViewer({ images, currentIndex, onClose, onIndexChange, onDelete }) {
  const currentImg = images[currentIndex];
  const [zoomScale, setZoomScale] = useState(1);

  if (!currentImg) return null;

  const handleNext = () => {
    setZoomScale(1);
    if (currentIndex < images.length - 1) {
      onIndexChange(currentIndex + 1);
    } else {
      onIndexChange(0);
    }
  };

  const handlePrev = () => {
    setZoomScale(1);
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    } else {
      onIndexChange(images.length - 1);
    }
  };

  const toggleZoom = () => {
    if (zoomScale === 1) setZoomScale(1.5);
    else if (zoomScale === 1.5) setZoomScale(2.0);
    else setZoomScale(1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between select-none animate-in fade-in duration-200">
      
      {/* ビューアヘッダー */}
      <div className="p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-20 text-white">
        <div className="flex items-center space-x-3">
          <span className="px-2.5 py-1 bg-purple-600/80 text-white text-xs font-bold rounded-md">
            {currentImg.category}
          </span>
          <div>
            <h3 className="font-bold text-sm leading-tight">{currentImg.title}</h3>
            <p className="text-[10px] text-slate-400">{currentImg.date} ({currentIndex + 1} / {images.length})</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* ズームボタン */}
          <button
            onClick={toggleZoom}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="ズーム切り替え"
          >
            {zoomScale > 1 ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
          </button>

          {/* 削除 */}
          <button
            onClick={(e) => onDelete(currentImg.id, e)}
            className="p-2 rounded-full bg-white/10 hover:bg-red-600/80 text-white transition-colors"
            title="削除"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          {/* 閉じる */}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors ml-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* メイン拡大画像表示領域 */}
      <div className="relative flex-1 flex items-center justify-center overflow-auto p-2">
        {/* 前へボタン */}
        {images.length > 1 && (
          <button
            onClick={handlePrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white transition-all backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* 画像本体 */}
        <div 
          onClick={toggleZoom} 
          className="cursor-zoom-in flex items-center justify-center w-full h-full"
        >
          <img
            src={currentImg.dataUrl}
            alt={currentImg.title}
            style={{ transform: `scale(${zoomScale})` }}
            className="max-w-full max-h-[75vh] object-contain transition-transform duration-200 ease-out rounded-lg shadow-2xl"
          />
        </div>

        {/* 次へボタン */}
        {images.length > 1 && (
          <button
            onClick={handleNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white/80 hover:text-white transition-all backdrop-blur-sm"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* ビューアフッター（メモエリア） */}
      <div className="p-4 bg-gradient-to-t from-black via-black/90 to-transparent text-white z-20 space-y-1">
        {currentImg.note && (
          <div className="max-w-xl mx-auto bg-white/10 border border-white/15 p-3 rounded-xl backdrop-blur-md">
            <p className="text-xs text-slate-200 leading-relaxed">{currentImg.note}</p>
          </div>
        )}
        <p className="text-center text-[10px] text-slate-500 pt-1">
          画像タップまたはズームボタンで拡大率切替 (1.0x / 1.5x / 2.0x)
        </p>
      </div>

    </div>
  );
}
