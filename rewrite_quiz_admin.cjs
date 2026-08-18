const fs = require('fs');

const code = `import React, { useState, useEffect } from 'react';
import { Card, Button, Input } from './ui';
import { ArrowLeft, Plus, Edit2, Trash2, Check, X, Folder, Settings, Eye, RefreshCcw, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: number;
  category: string;
  text: string;
  options: string[];
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

export function QuizAdminScreen({ onBack, userSection }: { onBack: () => void, userSection: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [scores, setScores] = useState<QuizScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Question>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showScores, setShowScores] = useState(false);
  const [quizSettings, setQuizSettings] = useState<{ counts: Record<string, number>, activeQuestionIds: number[] }>({ counts: {}, activeQuestionIds: [] });
  
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

  const fetchScores = async () => {
    try {
      const res = await fetch('/api/quiz-scores');
      const data = await res.json();
      setScores(data);
    } catch (e) {
      console.error(e);
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

  const handleRandomize = () => {
    if (!window.confirm("Apakah Anda yakin ingin mengacak ulang pertanyaan untuk bulan ini? Pertanyaan aktif akan diganti!")) return;
    
    // Group all questions by category
    const grouped: Record<string, Question[]> = {};
    questions.forEach(q => {
      if (!grouped[q.category]) grouped[q.category] = [];
      grouped[q.category].push(q);
    });
    
    let selectedIds: number[] = [];
    Object.keys(quizSettings.counts).forEach(cat => {
      const count = quizSettings.counts[cat];
      const catQs = grouped[cat] || [];
      const shuffled = catQs.sort(() => 0.5 - Math.random());
      const picked = shuffled.slice(0, count).map(q => q.id);
      selectedIds = [...selectedIds, ...picked];
    });
    
    // Randomize the final sequence
    selectedIds = selectedIds.sort(() => 0.5 - Math.random());
    
    const newSettings = { ...quizSettings, activeQuestionIds: selectedIds };
    setQuizSettings(newSettings);
    saveSettings(newSettings);
    toast.success("Pertanyaan bulan ini telah diacak!");
  };

  const handleSave = async (id?: number) => {
    if (!editForm.text || !editForm.category || !editForm.options || editForm.options.some(o => !o)) {
      toast.error('Mohon lengkapi semua field');
      return;
    }
    try {
      const res = await fetch(id ? \`/api/quiz-questions/\${id}\` : '/api/quiz-questions', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        toast.success(id ? 'Pertanyaan diperbarui' : 'Pertanyaan ditambahkan');
        setEditingId(null);
        setIsAdding(false);
        setEditForm({});
        fetchQuestions();
      } else {
        toast.error('Gagal menyimpan');
      }
    } catch (err) {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(\`/api/quiz-questions/\${id}\`, { method: 'DELETE' });
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
          <h2 className="text-2xl font-bold text-slate-800">{selectedCategory ? \`Kategori: \${selectedCategory}\` : 'Manajemen Quiz'}</h2>
          <p className="text-sm text-slate-500">{selectedCategory ? 'Manajemen soal untuk kategori ini' : 'Pilih kategori untuk manajemen pertanyaan'}</p>
        </div>
        
        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          {!selectedCategory && (
            <Button variant="secondary" onClick={() => setShowScores(true)} className="gap-2">
              <TrendingUp className="w-4 h-4" /> <span className="hidden sm:inline">Skor Crew</span>
            </Button>
          )}
          {!selectedCategory && (userSection?.toLowerCase().includes('qa') || userSection?.toLowerCase().includes('quality assurance') || userSection === '') && (
            <Button variant="secondary" onClick={() => setShowSettings(true)} className="gap-2">
              <Settings className="w-4 h-4" /> <span className="hidden sm:inline">Pengaturan QA</span>
            </Button>
          )}
          {!selectedCategory && (
            <Button variant="secondary" onClick={() => setShowPreview(true)} className="gap-2">
              <Eye className="w-4 h-4" /> <span className="hidden sm:inline">Preview Bank Soal</span>
            </Button>
          )}
          {selectedCategory ? (
            <Button onClick={() => { setIsAdding(true); setEditForm({ category: selectedCategory, text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }); }} className="gap-2">
              <Plus className="w-4 h-4" /> Tambah Soal
            </Button>
          ) : (
            <Button onClick={() => { setIsAdding(true); setEditForm({ category: '', text: '', options: ['', '', '', ''], correctAnswerIndex: 0 }); }} className="gap-2">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {q.options.map((opt, i) => (
                        <div key={i} className={\`p-2 text-sm rounded border \${i === q.correctAnswerIndex ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium' : 'bg-slate-50 border-slate-200 text-slate-600'}\`}>
                          {String.fromCharCode(65 + i)}. {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="secondary"  onClick={() => { setEditingId(q.id); setEditForm(q); }} className="w-10 px-0">
                      <Edit2 className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button variant="secondary"  onClick={() => handleDelete(q.id)} className="w-10 px-0">
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
                <div className="text-sm font-medium text-slate-700">Total Soal Kuis Aktif:</div>
                <div className="text-lg font-bold text-blue-600">
                  {quizSettings.activeQuestionIds.length} Soal
                </div>
              </div>
              
              <Button 
                onClick={handleRandomize} 
                className="w-full h-12 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-sm"
              >
                <RefreshCcw className="w-5 h-5 mr-2" /> Randomize & Kunci Soal Bulan Ini
              </Button>
            </div>
            <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowSettings(false)}>Tutup</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => saveSettings()}>Simpan Pengaturan</Button>
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
                        <div className={\`px-2 py-1 rounded text-xs font-bold \${score.percentage >= 70 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}\`}>
                          {score.percentage}%
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
              <h3 className="font-bold text-lg">Preview Bank Soal Keseluruhan</h3>
              <Button variant="secondary" onClick={() => setShowPreview(false)} className="w-8 h-8 p-0 rounded-full">
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 p-2">
              {questions.map((q, index) => (
                <div key={q.id} className="p-4 border rounded-lg bg-slate-50">
                  <div className="flex gap-2 items-start mb-2">
                    <span className="font-bold text-slate-500">{index + 1}.</span>
                    <div>
                      <div className="inline-block px-2 py-0.5 bg-blue-100 text-[10px] font-bold text-blue-800 rounded mb-1 uppercase tracking-wider">
                        {q.category}
                      </div>
                      <p className="font-medium text-slate-800">{q.text}</p>
                    </div>
                  </div>
                  <div className="ml-6 space-y-1">
                    {q.options.map((opt, i) => (
                      <div key={i} className={\`text-sm p-1.5 rounded \${i === q.correctAnswerIndex ? 'bg-emerald-100 text-emerald-800 font-medium' : 'text-slate-600'}\`}>
                        {String.fromCharCode(65 + i)}. {opt}
                        {i === q.correctAnswerIndex && <Check className="inline-block w-4 h-4 ml-2" />}
                      </div>
                    ))}
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

function QuestionForm({ form, setForm, onSave, onCancel }: { form: Partial<Question>, setForm: any, onSave: () => void, onCancel: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
        <Input value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Kategori soal..." />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Pertanyaan</label>
        <textarea 
          value={form.text || ''} 
          onChange={(e) => setForm({ ...form, text: e.target.value })}
          className="w-full p-2 border border-slate-300 rounded-lg text-sm min-h-[80px]"
          placeholder="Tuliskan pertanyaan..."
        />
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">Pilihan Jawaban</label>
        {(form.options || ['', '', '', '']).map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input 
              type="radio" 
              name="correctAnswer" 
              checked={form.correctAnswerIndex === i}
              onChange={() => setForm({ ...form, correctAnswerIndex: i })}
              className="w-4 h-4 text-emerald-600"
            />
            <Input 
              value={opt} 
              onChange={(e) => {
                const newOpts = [...(form.options || [])];
                newOpts[i] = e.target.value;
                setForm({ ...form, options: newOpts });
              }}
              placeholder={\`Pilihan \${String.fromCharCode(65 + i)}\`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>Batal</Button>
        <Button onClick={onSave} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Check className="w-4 h-4" /> Simpan
        </Button>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/quiz-admin-screen.tsx', code);
