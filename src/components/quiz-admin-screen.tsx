import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from './ui';
import { 
  ArrowLeft, Plus, Edit2, Trash2, Check, X, Folder, Settings, Eye, 
  RefreshCcw, TrendingUp, Activity, ImagePlus, Loader2, Image as ImageIcon 
} from 'lucide-react';
import { toast } from 'sonner';
import { PortalImagePickerModal } from './PortalImagePickerModal';

interface Question {
  id: number;
  category: string;
  text: string;
  imageUrl?: string | null;
  options: string[];
  optionImages?: (string | null)[];
  correctAnswerIndex: number;
}

interface QuizScore {
  id: number;
  nik: string;
  name: string;
  department: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timestamp: string;
}

export function QuizAdminScreen({ 
  onBack, 
  userSection, 
  isDeveloper = false 
}: { 
  onBack: () => void; 
  userSection?: string; 
  isDeveloper?: boolean; 
}) {
  const isDev = Boolean(
    isDeveloper ||
    localStorage.getItem('preplab_is_developer') === 'true' ||
    localStorage.getItem('p2h_inspector_role')?.toLowerCase() === 'developer' ||
    localStorage.getItem('p2h_inspector_nik') === '02D24000043' ||
    localStorage.getItem('p2h_inspector_nik') === '02D25000055' ||
    localStorage.getItem('p2h_inspector_nik') === '04D21001047' ||
    localStorage.getItem('p2h_inspector_nik') === '04D24000042' ||
    localStorage.getItem('p2h_inspector_nik') === 'M0403240177' ||
    localStorage.getItem('p2h_inspector_nik') === 'preplabadmin' ||
    localStorage.getItem('preplab_meeting_room_mode') === 'true'
  );

  const isQA = Boolean(
    isDev ||
    !userSection ||
    userSection.toLowerCase().includes('qa') ||
    userSection.toLowerCase().includes('quality assurance') ||
    userSection.toLowerCase().includes('developer') ||
    userSection.toLowerCase().includes('admin')
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scores, setScores] = useState<QuizScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Question>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [previewCategory, setPreviewCategory] = useState<string | "ALL">("ALL");
  
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [isQuizLive, setIsQuizLive] = useState(false);
  const [quizSettings, setQuizSettings] = useState<{ counts: Record<string, number>, activeQuestionIds: number[], version?: string }>({ counts: {}, activeQuestionIds: [] });
  
  useEffect(() => {
    fetchQuestions();
    fetchScores();
  }, []);

  const fetchQuestions = async () => {
    try {
      const [qsRes, setRes] = await Promise.all([
        fetch('/api/quiz-questions'),
        fetch('/api/settings')
      ]);
      const data = await qsRes.json();
      setQuestions(data);
      
      const settingsData = await setRes.json();
      const liveSetting = settingsData.find((s: any) => s.settingKey === 'QUIZ_LIVE_STATUS');
      if (liveSetting) {
        setIsQuizLive(liveSetting.settingValue === 'true');
      }
      const setting = settingsData.find((s: any) => s.settingKey === 'QUIZ_CONFIG');
      if (setting && setting.settingValue) {
        const parsed = JSON.parse(setting.settingValue);
        // Fallback to empty maps if not present
        if (!parsed.counts) parsed.counts = {};
        if (!parsed.activeQuestionIds) parsed.activeQuestionIds = [];
        
        // Initialize counts for any new categories
        const categories = Array.from(new Set(data.map((q: Question) => q.category)));
        categories.forEach((cat: any) => {
          if (parsed.counts[cat] === undefined) {
             parsed.counts[cat] = 1;
          }
        });
        setQuizSettings(parsed);
      } else {
         // Default
         const categories = Array.from(new Set(data.map((q: Question) => q.category)));
         const counts: Record<string, number> = {};
         categories.forEach((cat: any) => counts[cat] = 1);
         setQuizSettings({ counts, activeQuestionIds: [] });
      }
    } catch (e) {
      toast.error('Gagal memuat pertanyaan');
    } finally {
      setLoading(false);
    }
  };

  const deleteScore = async (id: number) => {
    if (!confirm('Apakah anda yakin ingin menghapus nilai ini?')) return;
    try {
      await fetch(`/api/quiz-scores/${id}`, { method: 'DELETE' });
      toast.success('Nilai berhasil dihapus');
      fetchScores();
    } catch (e) {
      toast.error('Gagal menghapus nilai');
    }
  };

  const fetchScores = async () => {
    try {
      const res = await fetch('/api/quiz-scores');
      const data = await res.json();
      setScores(data);
    } catch (e) {
      console.error(e);
    }
  };

  const toggleQuizLive = async () => {
    const newValue = !isQuizLive;
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingKey: 'QUIZ_LIVE_STATUS',
          settingValue: String(newValue),
          description: 'Quiz Live Status'
        })
      });
      setIsQuizLive(newValue);
      toast.success(newValue ? 'Kuis sekarang LIVE' : 'Kuis sekarang OFFLINE');
    } catch (e) {
      toast.error('Gagal mengubah status kuis');
    }
  };

  const saveSettings = async (newSettings = quizSettings) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settingKey: 'QUIZ_CONFIG',
          settingValue: JSON.stringify(newSettings),
          description: 'Quiz Configuration'
        })
      });
      toast.success('Pengaturan kuis disimpan');
      setShowSettings(false);
    } catch (e) {
      toast.error('Gagal menyimpan pengaturan');
    }
  };

  const handleRandomize = async () => {
    try {
      console.log("Starting randomize...");
      // Group all questions by category
      const grouped: Record<string, Question[]> = {};
      questions.forEach(q => {
        if (!grouped[q.category]) grouped[q.category] = [];
        grouped[q.category].push(q);
      });
      
      let selectedIds: number[] = [];
      Object.keys(quizSettings.counts).forEach(cat => {
        const count = parseInt(quizSettings.counts[cat] as any) || 0;
        const catQs = grouped[cat] || [];
        // use slice to clone before sort
        const shuffled = catQs.slice().sort(() => 0.5 - Math.random());
        const picked = shuffled.slice(0, count).map(q => q.id);
        selectedIds = [...selectedIds, ...picked];
      });
      
      console.log("Selected IDs: ", selectedIds);
      // Randomize the final sequence
      selectedIds = selectedIds.sort(() => 0.5 - Math.random());
      
      const newSettings = { ...quizSettings, activeQuestionIds: selectedIds, version: Date.now().toString() };
      setQuizSettings(newSettings);
      await saveSettings(newSettings);
      toast.success("Kuis berhasil diterbitkan!");
    } catch (e) {
      console.error(e);
      toast.error("Gagal menerbitkan kuis");
    }
  };

  const handleSave = async (id?: number) => {
    const category = editForm.category?.trim();
    const text = editForm.text?.trim();
    const options = editForm.options || ['', '', '', ''];
    const optionImages = editForm.optionImages || ['', '', '', ''];

    // Every option must have either text or an image
    const isOptionsValid = options.length >= 2 && options.every((opt, i) => {
      const hasText = !!opt?.trim();
      const hasImg = !!optionImages[i]?.trim();
      return hasText || hasImg;
    });

    if (!category || !text || !isOptionsValid) {
      toast.error('Mohon lengkapi kategori, pertanyaan, dan pilihan jawaban (teks atau gambar)');
      return;
    }

    const cleanOptions = [0, 1, 2, 3].map(i => {
      const txt = options[i]?.trim();
      const img = optionImages[i]?.trim();
      if (txt) return txt;
      if (img) return `(Pilihan Gambar ${String.fromCharCode(65 + i)})`;
      return '';
    });

    const cleanOptionImages = [0, 1, 2, 3].map(i => optionImages[i]?.trim() || null);

    const payload = {
      category,
      text,
      imageUrl: editForm.imageUrl?.trim() || null,
      options: cleanOptions,
      optionImages: cleanOptionImages,
      correctAnswerIndex: editForm.correctAnswerIndex ?? 0
    };

    try {
      const res = await fetch(id ? `/api/quiz-questions/${id}` : '/api/quiz-questions', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        toast.success(id ? 'Pertanyaan diperbarui' : 'Pertanyaan ditambahkan');
        setEditingId(null);
        setIsAdding(false);
        setEditForm({});
        fetchQuestions();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || errorData.details || 'Gagal menyimpan pertanyaan');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan saat menyimpan');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/quiz-questions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Pertanyaan dihapus');
        const remaining = questions.filter(q => q.id !== id);
        setQuestions(remaining);
        if (selectedCategory && !remaining.some(q => q.category === selectedCategory)) {
            setSelectedCategory(null);
        }
      } else {
        toast.error('Gagal menghapus');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan');
    }
  };

  const categories = Array.from(new Set(questions.map(q => q.category)));
  const filteredQuestions = selectedCategory ? questions.filter(q => q.category === selectedCategory) : [];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
        <button onClick={() => selectedCategory ? setSelectedCategory(null) : onBack()} className="p-2 bg-white rounded-full shadow-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{selectedCategory ? `Kategori: ${selectedCategory}` : 'Manajemen Quiz'}</h2>
          <p className="text-sm text-slate-500">{selectedCategory ? 'Manajemen soal untuk kategori ini' : 'Pilih kategori untuk manajemen pertanyaan'}</p>
        </div>
        
        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          {!selectedCategory && (
            <Button variant="secondary" onClick={() => setShowScores(true)} className="gap-2">
              <TrendingUp className="w-4 h-4" /> <span className="hidden sm:inline">Skor Crew</span>
            </Button>
          )}
          {!selectedCategory && isQA && (
            <>
              <Button 
                variant={isQuizLive ? "primary" : "secondary"} 
                onClick={toggleQuizLive} 
                className={`gap-2 ${isQuizLive ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-slate-500'}`}
              >
                <Activity className="w-4 h-4" /> <span className="hidden sm:inline">{isQuizLive ? 'Kuis LIVE' : 'Kuis OFFLINE'}</span>
              </Button>
              <Button variant="secondary" onClick={() => setShowSettings(true)} className="gap-2">
                <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Pengaturan QA</span>
              </Button>
            </>
          )}
          {!selectedCategory && (
            <Button variant="secondary" onClick={() => setShowPreview(true)} className="gap-2">
              <Eye className="w-4 h-4" /> <span className="hidden sm:inline">Preview Bank Soal</span>
            </Button>
          )}
          {selectedCategory ? (
            <Button onClick={() => { setIsAdding(true); setEditForm({ category: selectedCategory, text: '', imageUrl: '', options: ['', '', '', ''], optionImages: ['', '', '', ''], correctAnswerIndex: 0 }); }} className="gap-2">
              <Plus className="w-4 h-4" /> Tambah Soal
            </Button>
          ) : (
            <Button onClick={() => { setIsAdding(true); setEditForm({ category: '', text: '', imageUrl: '', options: ['', '', '', ''], optionImages: ['', '', '', ''], correctAnswerIndex: 0 }); }} className="gap-2">
              <Plus className="w-4 h-4" /> Tambah Kategori
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center p-8 text-slate-500">Memuat pertanyaan...</div>
      ) : (
        <div className="space-y-4">
          {isAdding && (
            <Card className="p-4 border-emerald-200 bg-emerald-50/30">
              <QuestionForm form={editForm as Question} setForm={setEditForm} onSave={() => handleSave()} onCancel={() => setIsAdding(false)} />
            </Card>
          )}

          {!selectedCategory && !isAdding && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map(cat => (
                <Card 
                  key={cat} 
                  className="p-6 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all flex flex-col items-center justify-center text-center gap-3 border-slate-200"
                  onClick={() => setSelectedCategory(cat)}
                >
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                    <Folder className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{cat}</h3>
                    <p className="text-sm text-slate-500 mt-1">{questions.filter(q => q.category === cat).length} Soal dalam bank</p>
                  </div>
                </Card>
              ))}
              {categories.length === 0 && (
                <div className="col-span-full text-center p-8 text-slate-500 bg-white rounded-xl border border-dashed">Belum ada kategori. Tambahkan soal baru untuk membuat kategori.</div>
              )}
            </div>
          )}

          {selectedCategory && !isAdding && filteredQuestions.length === 0 && (
            <div className="text-center p-8 text-slate-500 bg-white rounded-xl border border-dashed">Belum ada pertanyaan di kategori ini.</div>
          )}

          {selectedCategory && filteredQuestions.map((q) => (
            <Card key={q.id} className="p-4">
              {editingId === q.id ? (
                <QuestionForm form={editForm as Question} setForm={setEditForm} onSave={() => handleSave(q.id)} onCancel={() => setEditingId(null)} />
              ) : (
                <div className="flex justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="inline-block px-2 py-1 bg-slate-100 text-xs font-semibold text-slate-600 rounded">
                      {q.category}
                    </div>
                    <p className="font-medium text-slate-800">{q.text}</p>
                    
                    {/* Gambar Soal (jika ada) */}
                    {q.imageUrl && (
                      <div className="my-2 inline-block">
                        <div className="relative group max-w-sm rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-2xs">
                          <img 
                            src={q.imageUrl} 
                            alt="Gambar Soal" 
                            className="max-h-48 w-auto object-contain bg-slate-100 rounded-lg cursor-pointer hover:opacity-95 transition-opacity" 
                            onClick={() => window.open(q.imageUrl || '', '_blank')}
                          />
                          <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-xs flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Klik perbesar
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {q.options.map((opt, i) => {
                        const optImg = q.optionImages?.[i];
                        return (
                          <div key={i} className={`p-2.5 text-sm rounded-lg border flex items-center gap-2.5 ${i === q.correctAnswerIndex ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            <span className="font-bold shrink-0">{String.fromCharCode(65 + i)}.</span>
                            {optImg && (
                              <img 
                                src={optImg} 
                                alt={`Pilihan ${String.fromCharCode(65 + i)}`}
                                className="w-12 h-12 object-cover rounded-md border border-slate-300 bg-white shrink-0 cursor-pointer hover:scale-105 transition-transform"
                                onClick={() => window.open(optImg, '_blank')}
                                title="Klik untuk perbesar"
                              />
                            )}
                            <span className="flex-1 break-words">{opt}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button 
                      variant="secondary" 
                      onClick={() => { 
                        setEditingId(q.id); 
                        setEditForm({ 
                          ...q, 
                          imageUrl: q.imageUrl || '', 
                          options: [...q.options], 
                          optionImages: q.optionImages ? [...q.optionImages] : ['', '', '', ''] 
                        }); 
                      }} 
                      className="w-10 px-0"
                    >
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="secondary" onClick={() => handleDelete(q.id)} className="w-10 px-0">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* QA Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-xl mb-1 text-slate-800">Pengaturan Kuis Bulanan</h3>
            <p className="text-sm text-slate-500 mb-6">Atur jumlah soal per kategori yang akan diujikan, lalu tekan tombol acak untuk menerapkannya.</p>
            
            <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              {categories.map(cat => {
                const maxInBank = questions.filter(q => q.category === cat).length;
                return (
                  <div key={cat} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div>
                      <div className="font-medium text-slate-700">{cat}</div>
                      <div className="text-xs text-slate-500">Bank soal: {maxInBank}</div>
                    </div>
                    <div className="w-24">
                      <Input 
                        type="number"
                        min="0"
                        max={maxInBank}
                        value={quizSettings.counts[cat] || 0}
                        onChange={e => {
                          const val = Math.min(Math.max(0, parseInt(e.target.value) || 0), maxInBank);
                          setQuizSettings({
                            ...quizSettings,
                            counts: { ...quizSettings.counts, [cat]: val }
                          });
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              
              <div className="pt-4 border-t mt-4 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700">Total Soal Kuis yang Dikonfigurasi:</div>
                <div className="text-lg font-bold text-blue-600">
                  {Object.values(quizSettings.counts).reduce((a, b) => a + (b || 0), 0)} Soal
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                 <p className="text-xs text-blue-800 font-medium">Catatan: Mengubah angka di atas hanya menyimpan konfigurasi. Anda <strong>wajib</strong> menekan tombol "Randomize & Terbitkan" agar kuis aktif untuk personel.</p>
              </div>
              
              
            </div>
            <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowSettings(false)}>Batal</Button>
              <Button onClick={handleRandomize} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-sm">
                <Check className="w-5 h-5 mr-2" /> Simpan & Terbitkan Kuis
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Scores Dashboard */}
      {showScores && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <div>
                <h3 className="font-bold text-xl text-slate-800">Dashboard Skor Kuis</h3>
                <p className="text-sm text-slate-500">Hasil pengerjaan kuis oleh personel</p>
              </div>
              <Button variant="secondary" onClick={() => setShowScores(false)} className="w-10 h-10 p-0 rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scores.length > 0 ? scores.map(score => (
                  <Card key={score.id} className="p-4 border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-slate-800 text-lg truncate" title={score.name}>{score.name}</div>
                        <div className="flex gap-2 items-center">
                          <div className={`px-2 py-1 rounded text-xs font-bold ${score.percentage >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {score.percentage}%
                          </div>
                          <button onClick={() => deleteScore(score.id)} className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs font-mono text-slate-500">{score.nik}</div>
                      <div className="text-sm text-slate-600 mt-1">{score.department || '-'}</div>
                    </div>
                    <div className="mt-4 pt-3 border-t text-xs text-slate-400 flex justify-between">
                      <span>Benar {score.score} dari {score.totalQuestions}</span>
                      <span>{new Date(score.timestamp).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year:'numeric'})}</span>
                    </div>
                  </Card>
                )) : (
                  <div className="col-span-full text-center p-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed">
                    Belum ada data skor yang terekam.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Question Bank Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full p-5 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h3 className="font-bold text-lg">Preview Bank Soal</h3>
              <Button variant="secondary" onClick={() => setShowPreview(false)} className="w-8 h-8 p-0 rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Filter Kategori:</label>
              <select 
                className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white"
                value={previewCategory}
                onChange={(e) => setPreviewCategory(e.target.value)}
              >
                <option value="ALL">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 p-2">
              {questions.filter(q => previewCategory === "ALL" || q.category === previewCategory).map((q, index) => (
                <div key={q.id} className="p-4 border rounded-xl bg-slate-50 space-y-2">
                  <div className="flex gap-2 items-start mb-2">
                    <span className="font-bold text-slate-500">{index + 1}.</span>
                    <div className="flex-1">
                      <div className="inline-block px-2 py-0.5 bg-blue-100 text-[10px] font-bold text-blue-800 rounded mb-1 uppercase tracking-wider">
                        {q.category}
                      </div>
                      <p className="font-medium text-slate-800">{q.text}</p>
                    </div>
                  </div>

                  {/* Gambar Soal di Preview */}
                  {q.imageUrl && (
                    <div className="ml-6 my-2">
                      <img 
                        src={q.imageUrl} 
                        alt="Gambar Soal" 
                        className="max-h-40 max-w-xs object-contain rounded-lg border border-slate-300 bg-white shadow-2xs cursor-pointer"
                        onClick={() => window.open(q.imageUrl || '', '_blank')}
                      />
                    </div>
                  )}

                  <div className="ml-6 space-y-1.5">
                    {q.options.map((opt, i) => {
                      const optImg = q.optionImages?.[i];
                      return (
                        <div key={i} className={`text-sm p-2 rounded-lg flex items-center gap-2.5 border ${i === q.correctAnswerIndex ? 'bg-emerald-100/80 border-emerald-300 text-emerald-900 font-medium' : 'bg-white border-slate-200 text-slate-600'}`}>
                          <span className="font-bold shrink-0">{String.fromCharCode(65 + i)}.</span>
                          {optImg && (
                            <img 
                              src={optImg} 
                              alt={`Pilihan ${String.fromCharCode(65 + i)}`}
                              className="w-10 h-10 object-cover rounded border border-slate-300 bg-white shrink-0 cursor-pointer"
                              onClick={() => window.open(optImg, '_blank')}
                            />
                          )}
                          <span className="flex-1 break-words">{opt}</span>
                          {i === q.correctAnswerIndex && <Check className="w-4 h-4 ml-auto text-emerald-700 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <div className="text-center p-8 text-slate-500">Belum ada pertanyaan</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionForm({ 
  form, 
  setForm, 
  onSave, 
  onCancel 
}: { 
  form: Partial<Question>, 
  setForm: any, 
  onSave: () => void, 
  onCancel: () => void 
}) {
  const [uploadingTarget, setUploadingTarget] = useState<'question' | number | null>(null);
  const [pickerTarget, setPickerTarget] = useState<'question' | number | null>(null);

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'question' | number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar (JPG, PNG, WEBP, GIF)');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 20 MB');
      return;
    }

    setUploadingTarget(target);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            filename: file.name,
            mimeType: file.type,
            folderName: 'Quiz'
          })
        });
        const data = await res.json();
        if (res.ok && data.url) {
          if (target === 'question') {
            setForm({ ...form, imageUrl: data.url });
          } else {
            const newOptionImages = [...(form.optionImages || ['', '', '', ''])];
            newOptionImages[target] = data.url;
            setForm({ ...form, optionImages: newOptionImages });
          }
          toast.success('Gambar berhasil diunggah');
        } else {
          toast.error(data.error || 'Gagal mengunggah gambar');
        }
      } catch (err) {
        toast.error('Terjadi kesalahan saat mengunggah');
      } finally {
        setUploadingTarget(null);
        e.target.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const options = form.options || ['', '', '', ''];
  const optionImages = form.optionImages || ['', '', '', ''];

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
        <Input 
          value={form.category || ''} 
          onChange={(e) => setForm({ ...form, category: e.target.value })} 
          placeholder="Kategori soal..." 
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-slate-700">Pertanyaan</label>
          <span className="text-xs text-slate-400">Teks soal & gambar pendukung</span>
        </div>
        <textarea 
          value={form.text || ''} 
          onChange={(e) => setForm({ ...form, text: e.target.value })}
          className="w-full p-2.5 border border-slate-300 rounded-xl text-sm min-h-[85px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
          placeholder="Tuliskan pertanyaan..."
        />

        {/* Gambar Soal */}
        <div className="mt-2">
          {form.imageUrl ? (
            <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
              <div className="relative group rounded-lg overflow-hidden border border-slate-300 bg-slate-100 shrink-0">
                <img 
                  src={form.imageUrl} 
                  alt="Preview Gambar Soal" 
                  className="w-24 h-20 object-contain rounded bg-slate-50" 
                />
                <button 
                  type="button"
                  onClick={() => window.open(form.imageUrl || '', '_blank')}
                  className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                  title="Perbesar gambar"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Check className="w-3.5 h-3.5" /> Gambar Soal Terlampir
                </div>
                <p className="text-xs text-slate-500 truncate" title={form.imageUrl}>{form.imageUrl}</p>
                <div className="flex items-center gap-2 pt-1">
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => setPickerTarget('question')}
                    className="text-xs h-7 px-2.5 gap-1.5"
                  >
                    <RefreshCcw className="w-3 h-3" /> Ganti Gambar
                  </Button>
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="secondary" 
                    onClick={() => setForm({ ...form, imageUrl: '' })}
                    className="text-xs h-7 px-2.5 gap-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="w-3 h-3" /> Hapus
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <input 
                type="file" 
                id="question-img-upload-input" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => handleDirectUpload(e, 'question')}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => document.getElementById('question-img-upload-input')?.click()}
                disabled={uploadingTarget === 'question'}
                className="gap-2 text-xs text-slate-700 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/50"
              >
                {uploadingTarget === 'question' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ImagePlus className="w-3.5 h-3.5 text-emerald-600" />
                )}
                <span>{uploadingTarget === 'question' ? 'Mengunggah...' : 'Upload Gambar Soal'}</span>
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPickerTarget('question')}
                className="gap-1.5 text-xs text-slate-600 hover:text-slate-800"
              >
                <Folder className="w-3.5 h-3.5 text-blue-500" />
                <span>Pilih dari Galeri / URL</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Pilihan Jawaban */}
      <div className="space-y-2.5 pt-2 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-slate-700">Pilihan Jawaban</label>
          <span className="text-xs text-slate-400">Pilih radio button untuk kunci jawaban benar</span>
        </div>

        {options.map((opt, i) => {
          const optImg = optionImages[i];
          const isCorrect = form.correctAnswerIndex === i;

          return (
            <div 
              key={i} 
              className={`p-2.5 rounded-xl border transition-all ${
                isCorrect 
                  ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-500/20' 
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <input 
                  type="radio" 
                  name="correctAnswer" 
                  checked={isCorrect}
                  onChange={() => setForm({ ...form, correctAnswerIndex: i })}
                  className="w-4 h-4 text-emerald-600 shrink-0 cursor-pointer accent-emerald-600"
                  title="Tandai sebagai kunci jawaban benar"
                />

                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-extrabold shrink-0 ${
                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>

                <Input 
                  value={opt} 
                  onChange={(e) => {
                    const newOpts = [...options];
                    newOpts[i] = e.target.value;
                    setForm({ ...form, options: newOpts });
                  }}
                  placeholder={`Pilihan ${String.fromCharCode(65 + i)} (teks atau keterangan)`}
                  className="flex-1 text-sm h-9"
                />

                <input 
                  type="file" 
                  id={`option-file-input-${i}`} 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => handleDirectUpload(e, i)}
                />

                {/* Upload Image for Option Button */}
                <button
                  type="button"
                  onClick={() => document.getElementById(`option-file-input-${i}`)?.click()}
                  disabled={uploadingTarget === i}
                  title="Upload gambar dari komputer/HP"
                  className={`p-2 rounded-lg border text-xs flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                    optImg 
                      ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' 
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {uploadingTarget === i ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  ) : (
                    <ImagePlus className="w-4 h-4" />
                  )}
                </button>

                {/* Open Modal Picker for Option */}
                <button
                  type="button"
                  onClick={() => setPickerTarget(i)}
                  title="Pilih gambar dari Galeri / URL"
                  className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-xs flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Folder className="w-4 h-4 text-amber-500" />
                </button>
              </div>

              {/* Option Image Thumbnail if present */}
              {optImg && (
                <div className="ml-8 mt-2 flex items-center gap-3 p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="relative group rounded overflow-hidden border border-slate-300 bg-white shrink-0">
                    <img 
                      src={optImg} 
                      alt={`Pilihan ${String.fromCharCode(65 + i)}`}
                      className="w-12 h-12 object-contain bg-slate-50 cursor-pointer"
                      onClick={() => window.open(optImg, '_blank')}
                    />
                    <button
                      type="button"
                      onClick={() => window.open(optImg, '_blank')}
                      className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer"
                      title="Perbesar"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-slate-700 block">Gambar Pilihan {String.fromCharCode(65 + i)}</span>
                    <span className="text-[11px] text-slate-400 block truncate" title={optImg}>{optImg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newOptionImages = [...optionImages];
                      newOptionImages[i] = '';
                      setForm({ ...form, optionImages: newOptionImages });
                    }}
                    className="p-1 hover:bg-rose-100 text-rose-600 rounded transition-colors cursor-pointer"
                    title="Hapus gambar pilihan"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
        <Button variant="secondary" onClick={onCancel}>Batal</Button>
        <Button onClick={onSave} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Check className="w-4 h-4" /> Simpan
        </Button>
      </div>

      {/* Portal Image Picker Modal */}
      {pickerTarget !== null && (
        <PortalImagePickerModal
          isOpen={true}
          onClose={() => setPickerTarget(null)}
          onSelectImage={(url) => {
            if (pickerTarget === 'question') {
              setForm({ ...form, imageUrl: url });
            } else if (typeof pickerTarget === 'number') {
              const newOptionImages = [...optionImages];
              newOptionImages[pickerTarget] = url;
              setForm({ ...form, optionImages: newOptionImages });
            }
            setPickerTarget(null);
          }}
          currentImage={
            pickerTarget === 'question' 
              ? (form.imageUrl || '') 
              : (optionImages[pickerTarget as number] || '')
          }
          title={
            pickerTarget === 'question' 
              ? 'Pilih Gambar Soal' 
              : `Pilih Gambar Pilihan ${typeof pickerTarget === 'number' ? String.fromCharCode(65 + pickerTarget) : ''}`
          }
          description="Pilih dari galeri Google Drive, upload baru, atau masukkan link URL gambar."
        />
      )}
    </div>
  );
}
