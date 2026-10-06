import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, ArrowRight, CheckCircle, RefreshCcw, Activity, Timer, 
  Flag, LayoutGrid, Check, X, AlertTriangle, AlertCircle, 
  ChevronRight, ChevronLeft, Award, Sparkles, BookOpen, 
  Clock, ShieldCheck, Eye, CheckCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { triggerExpGain } from '../lib/gamificationEvents';

interface Question {
  id: number;
  category: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
}

export function QuizScreen({ 
  onBack, 
  userSection, 
  inspectorName, 
  inspectorNik 
}: { 
  onBack: () => void, 
  userSection: string, 
  inspectorName: string, 
  inspectorNik: string 
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [scoreData, setScoreData] = useState<{ score: number, percentage: number } | null>(null);
  const [isQuizLive, setIsQuizLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [quizVersion, setQuizVersion] = useState<string>('');
  
  // Enterprise UI Controls
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [showQuestionPalette, setShowQuestionPalette] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewMode, setShowReviewMode] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('Baru saja');

  // Operational Refs
  const answersRef = useRef<Record<number, number>>({});
  const flaggedRef = useRef<Record<number, boolean>>({});
  const quizVersionRef = useRef<string>('');
  const questionsRef = useRef<Question[]>([]);
  const isSubmittingRef = useRef<boolean>(false);
  const timerRef = useRef<any>(null);

  answersRef.current = answers;
  flaggedRef.current = flagged;
  quizVersionRef.current = quizVersion;
  questionsRef.current = questions;

  // Initialize Quiz
  useEffect(() => {
    const initQuiz = async () => {
      setLoading(true);
      try {
        const [qRes, sRes] = await Promise.all([
          fetch('/api/quiz-questions'),
          fetch('/api/settings')
        ]);
        const allQuestions: Question[] = await qRes.json();
        const settingsData = await sRes.json();
        
        const liveSetting = settingsData.find((s: any) => s.settingKey === 'QUIZ_LIVE_STATUS');
        if (liveSetting && liveSetting.settingValue === 'false') {
          setIsQuizLive(false);
        }
        const quizConfigSetting = settingsData.find((s: any) => s.settingKey === 'QUIZ_CONFIG');
        
        let finalQuestions: Question[] = [];
        let activeVersion = '';
        
        if (quizConfigSetting && quizConfigSetting.settingValue) {
          const config = JSON.parse(quizConfigSetting.settingValue);
          if (config.version) {
            setQuizVersion(config.version);
            activeVersion = config.version;
          }
          if (config.activeQuestionIds && config.activeQuestionIds.length > 0) {
            finalQuestions = config.activeQuestionIds
              .map((id: number) => allQuestions.find(q => q.id === id))
              .filter((q: Question | undefined): q is Question => q !== undefined);
          }
        }
        
        setQuestions(finalQuestions);
        questionsRef.current = finalQuestions;

        // Restore Autosaved State if any
        const autosaveKey = `quiz_autosave_${inspectorNik}_${activeVersion}`;
        const savedData = localStorage.getItem(autosaveKey);
        if (savedData) {
          try {
            const parsed = JSON.parse(savedData);
            const savedAnswers = parsed.answers || {};
            const savedFlagged = parsed.flagged || {};
            answersRef.current = savedAnswers;
            flaggedRef.current = savedFlagged;
            setAnswers(savedAnswers);
            setFlagged(savedFlagged);
            setCurrentIndex(parsed.currentIndex || 0);
            setTimeLeft(parsed.timeLeft !== undefined ? parsed.timeLeft : (30 * 60));
            if (parsed.fontSize) setFontSize(parsed.fontSize);
          } catch(e) {
            answersRef.current = {};
            flaggedRef.current = {};
            setAnswers({});
            setFlagged({});
            setCurrentIndex(0);
            setTimeLeft(30 * 60);
          }
        } else {
          answersRef.current = {};
          flaggedRef.current = {};
          setAnswers({});
          setFlagged({});
          setCurrentIndex(0);
          setTimeLeft(30 * 60);
        }

        // Check if user already submitted for this version
        try {
          const scoresRes = await fetch('/api/quiz-scores');
          const allScores = await scoresRes.json();
          const myScore = allScores.find((s: any) => s.nik === inspectorNik && s.quizVersion === activeVersion);
          if (myScore) {
            setScoreData({ score: myScore.score, percentage: myScore.percentage });
            setIsFinished(true);
          } else {
            setIsFinished(false);
            setScoreData(null);
          }
        } catch(err) {
          setIsFinished(false);
          setScoreData(null);
        }

      } catch (e) {
        console.error("Init Quiz Error:", e);
        toast.error('Gagal memuat pertanyaan kuis');
      }
      setLoading(false);
    };
    initQuiz();
  }, [inspectorNik]);

  // Periodic Local Autosave
  useEffect(() => {
    if (loading || isFinished || !quizVersion || !inspectorNik || questions.length === 0) return;
    const autosaveKey = `quiz_autosave_${inspectorNik}_${quizVersion}`;
    localStorage.setItem(autosaveKey, JSON.stringify({
      answers,
      flagged,
      currentIndex,
      timeLeft,
      fontSize
    }));
    const now = new Date();
    setLastSavedTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
  }, [answers, flagged, currentIndex, timeLeft, quizVersion, inspectorNik, loading, isFinished, questions.length, fontSize]);

  // Prevent accidental back navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isFinished && questions.length > 0 && isQuizLive) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isFinished, questions.length, isQuizLive]);

  // Keyboard Navigation & Shortcuts (A/B/C/D & 1/2/3/4)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished || loading || questions.length === 0 || showSubmitModal || showQuestionPalette) return;
      
      const currentQ = questions[currentIndex];
      if (!currentQ) return;

      const key = e.key.toUpperCase();
      let selectedIdx: number | null = null;
      if (key === '1' || key === 'A') selectedIdx = 0;
      else if (key === '2' || key === 'B') selectedIdx = 1;
      else if (key === '3' || key === 'C') selectedIdx = 2;
      else if (key === '4' || key === 'D') selectedIdx = 3;

      if (selectedIdx !== null && selectedIdx < currentQ.options.length) {
        handleSelectOption(selectedIdx);
      } else if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else if (key === 'F' || key === 'R') {
        toggleFlag(currentQ.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, questions, isFinished, loading, showSubmitModal, showQuestionPalette]);

  // Countdown Timer
  useEffect(() => {
    if (isFinished || loading || questions.length === 0) return;
    
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          if (!isSubmittingRef.current) {
            isSubmittingRef.current = true;
            handleFinishQuiz(answersRef.current, true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isFinished, loading, questions.length]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (index: number) => {
    const qId = questions[currentIndex]?.id;
    if (qId === undefined) return;
    const newAnswers = {
      ...answersRef.current,
      ...answers,
      [qId]: index
    };
    answersRef.current = newAnswers;
    setAnswers(newAnswers);
  };

  const toggleFlag = (qId: number) => {
    setFlagged(prev => {
      const next = { ...prev, [qId]: !prev[qId] };
      flaggedRef.current = next;
      return next;
    });
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };
  
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleBackClick = () => {
    if (!isFinished && questions.length > 0 && isQuizLive) {
      if (window.confirm('Kuis sedang berlangsung. Draf jawaban Anda sudah tersimpan otomatis di perangkat ini. Yakin ingin keluar sementara?')) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  const handleFinishQuiz = async (overrideAnswers?: Record<number, number>, isTimeout = false) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Comprehensive answer consolidation
    let effectiveAnswers: Record<number, number> = {
      ...answers,
      ...answersRef.current,
      ...(overrideAnswers || {})
    };

    const currentVersion = quizVersionRef.current || quizVersion;
    const currentNik = inspectorNik;

    if (currentNik && currentVersion) {
      const autosaveKey = `quiz_autosave_${currentNik}_${currentVersion}`;
      const savedRaw = localStorage.getItem(autosaveKey);
      if (savedRaw) {
        try {
          const parsed = JSON.parse(savedRaw);
          if (parsed?.answers && typeof parsed.answers === 'object') {
            effectiveAnswers = { ...parsed.answers, ...effectiveAnswers };
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    }

    const currentQuestions = questionsRef.current.length > 0 ? questionsRef.current : questions;
    let score = 0;
    currentQuestions.forEach(q => {
      if (effectiveAnswers[q.id] === q.correctAnswerIndex) score++;
    });
    const totalQ = currentQuestions.length > 0 ? currentQuestions.length : 1;
    const percentage = Math.round((score / totalQ) * 100);
    setScoreData({ score, percentage });
    setIsFinished(true);
    setShowSubmitModal(false);
    setShowQuestionPalette(false);

    if (isTimeout) {
      toast.warning('Waktu kuis telah berakhir! Jawaban yang telah Anda isi telah dikumpulkan otomatis.', {
        duration: 6000
      });
    }

    // Submit score to backend
    try {
      const res = await fetch('/api/quiz-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: inspectorNik,
          name: inspectorName,
          department: userSection,
          score,
          totalQuestions: currentQuestions.length,
          percentage,
          quizVersion: currentVersion
        })
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Gagal menyimpan skor');
      } else {
        if (!isTimeout) {
          toast.success('Kuis berhasil dikumpulkan!');
        }
        localStorage.removeItem(`quiz_autosave_${inspectorNik}_${currentVersion}`);
        if (percentage === 100) {
          triggerExpGain(250, 'Kuis Nilai Sempurna 100%!', `Versi ${currentVersion || 'K3/SOP'}`);
        } else if (percentage >= 70) {
          triggerExpGain(75, 'Kuis K3 Berhasil Lulus!', `Skor: ${percentage}%`);
        } else {
          triggerExpGain(30, 'Kuis Selesai Dikerjakan', `Skor: ${percentage}%`);
        }
        window.dispatchEvent(new Event('gamification_updated'));
      }
    } catch (e) {
      console.error("Gagal menyimpan skor", e);
      toast.error("Gagal menyimpan skor kuis");
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // State Counts
  const answeredCount = Object.keys(answers).length;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);
  const progressPercent = questions.length > 0 ? Math.round((answeredCount / questions.length) * 100) : 0;

  // Font size classes
  const questionFontClass = fontSize === 'sm' ? 'text-base sm:text-lg' : fontSize === 'lg' ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl';
  const optionFontClass = fontSize === 'sm' ? 'text-xs sm:text-sm' : fontSize === 'lg' ? 'text-base sm:text-lg' : 'text-sm sm:text-base';

  // 1. Loading State
  if (loading) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6 gap-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center animate-pulse shadow-sm">
            <BookOpen className="w-8 h-8 text-blue-600" />
          </div>
          <Activity className="w-6 h-6 text-emerald-600 animate-spin absolute -bottom-2 -right-2" />
        </div>
        <div className="text-center space-y-1.5">
          <h3 className="text-lg font-bold text-slate-900 tracking-tight">Menyiapkan Lembar Kuis K3 & SOP</h3>
          <p className="text-slate-500 text-xs sm:text-sm">Memuat paket pertanyaan kuis dari server...</p>
        </div>
      </div>
    );
  }
  
  // 2. Offline State
  if (!isQuizLive) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 text-center bg-white border border-slate-200 shadow-xl rounded-3xl space-y-6">
          <div className="w-20 h-20 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-amber-600">
            <Timer className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
              Periode Offline
            </span>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Kuis Sedang Dinonaktifkan</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Kuis pengujian SOP & K3 bulan ini sedang tidak dibuka atau batas waktu pengisian telah berakhir. Hubungi koordinator Quality Assurance untuk informasi jadwal aktivasi.
            </p>
          </div>
          <button 
            onClick={onBack} 
            className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // 3. No Questions Configured
  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 text-center bg-white border border-slate-200 shadow-xl rounded-3xl space-y-6">
          <div className="w-20 h-20 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center mx-auto text-blue-600">
            <CheckCircle className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Belum Ada Kuis Aktif</h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              Daftar soal untuk bulan ini belum dikonfigurasi atau belum diterbitkan oleh Quality Assurance & Safety Specialist.
            </p>
          </div>
          <button 
            onClick={onBack} 
            className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors"
          >
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  // 4. Completed Result Screen (Enterprise Grade & Crystal Clear Readability)
  if (isFinished && scoreData) {
    const isPassed = scoreData.percentage >= 70;
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 p-4 sm:p-6 pb-24 flex flex-col items-center justify-start sm:justify-center">
        <div className="max-w-xl w-full space-y-5 mt-4 sm:mt-0">
          
          {/* Main Hero Card */}
          <div className="p-6 sm:p-8 text-center bg-white border border-slate-200 shadow-xl rounded-3xl relative overflow-hidden">
            {/* Top Color Accent */}
            <div className={`absolute top-0 left-0 right-0 h-2.5 ${isPassed ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500' : 'bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500'}`} />
            
            <div className="space-y-4 pt-2">
              <div className={`w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl flex items-center justify-center shadow-md transition-transform ${
                isPassed 
                  ? 'bg-emerald-50 border-2 border-emerald-300 text-emerald-600 shadow-emerald-100' 
                  : 'bg-rose-50 border-2 border-rose-300 text-rose-600 shadow-rose-100'
              }`}>
                {isPassed ? <Award className="w-10 h-10 sm:w-12 sm:h-12" /> : <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12" />}
              </div>

              <div>
                <span className={`inline-block text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full mb-2 ${
                  isPassed 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  {isPassed ? 'Lulus Uji Kompetensi' : 'Belum Memenuhi Standar Minimal'}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {isPassed ? 'Selamat, Hasil Memuaskan!' : 'Tetap Semangat & Pelajari Kembali'}
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm mt-1">
                  Kuis K3 & Standar Operasional Prosedur • <strong>{inspectorName}</strong> ({inspectorNik})
                </p>
              </div>

              {/* Score Display Banner */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col items-center justify-center gap-1 shadow-inner">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Skor Akhir Anda</span>
                <div className={`text-6xl sm:text-7xl font-black tracking-tight ${isPassed ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {scoreData.percentage}<span className="text-3xl sm:text-4xl text-slate-400 font-bold">%</span>
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm font-semibold text-slate-700">
                  <span className="text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded-md">{scoreData.score} Benar</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-rose-700 font-bold bg-rose-100 px-2 py-0.5 rounded-md">{questions.length - scoreData.score} Salah/Kosong</span>
                  <span className="text-slate-400">•</span>
                  <span>Total {questions.length} Soal</span>
                </div>
              </div>

              {/* Status & EXP Banner */}
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-500 font-semibold uppercase">Standar Kelulusan</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">Minimal 70% (18 Soal)</div>
                </div>
                <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200">
                  <div className="text-[11px] text-amber-700 font-semibold uppercase">Reward Vanguard EXP</div>
                  <div className="text-sm font-bold text-amber-800 flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    {scoreData.percentage === 100 ? '+250 EXP' : isPassed ? '+75 EXP' : '+30 EXP'}
                  </div>
                </div>
              </div>

              {/* Review Accordion Toggle */}
              <button
                onClick={() => setShowReviewMode(!showReviewMode)}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-bold flex items-center justify-between border border-slate-300 transition-colors shadow-xs"
              >
                <span className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  {showReviewMode ? 'Sembunyikan Lembar Pembahasan' : 'Lihat Lembar Pembahasan & Jawaban'}
                </span>
                <ChevronRight className={`w-4 h-4 text-slate-600 transition-transform ${showReviewMode ? 'rotate-90' : ''}`} />
              </button>

              {/* Action Buttons */}
              <div className="pt-2">
                <button 
                  onClick={onBack} 
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-colors"
                >
                  Kembali ke Beranda
                </button>
              </div>
            </div>
          </div>

          {/* Detailed Question Review List (Pristine High Contrast Readability) */}
          {showReviewMode && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between px-2">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Rincian Jawaban per Soal
                </h3>
                <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200 shadow-xs">
                  {questions.length} Butir Soal
                </span>
              </div>

              {questions.map((q, idx) => {
                const userAns = answers[q.id];
                const isCorrect = userAns === q.correctAnswerIndex;
                const isUnanswered = userAns === undefined;

                return (
                  <div key={q.id} className="p-5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm space-y-4">
                    {/* Header: Question Number & Status */}
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-8 h-8 rounded-xl bg-teal-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                          {idx + 1}
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200">
                          {q.category}
                        </span>
                      </div>
                      
                      <span className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                        isCorrect 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : isUnanswered
                          ? 'bg-slate-100 text-slate-700 border border-slate-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {isCorrect ? <Check className="w-3.5 h-3.5 text-emerald-700 stroke-[3]" /> : isUnanswered ? <Clock className="w-3.5 h-3.5 text-slate-600" /> : <X className="w-3.5 h-3.5 text-rose-700 stroke-[3]" />}
                        {isCorrect ? 'Jawaban Benar' : isUnanswered ? 'Tidak Dijawab' : 'Kurang Tepat'}
                      </span>
                    </div>

                    {/* Question Statement (Ultra High Contrast Slate-900) */}
                    <p className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed break-words whitespace-normal">
                      {q.text}
                    </p>

                    {/* Options in Review Mode */}
                    <div className="space-y-2.5 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const letter = ['A', 'B', 'C', 'D'][optIdx] || optIdx + 1;
                        const isUserChoice = userAns === optIdx;
                        const isTheCorrectAnswer = q.correctAnswerIndex === optIdx;

                        let cardStyle = 'bg-slate-50 border-slate-200 text-slate-700';
                        let badgeStyle = 'bg-slate-200 text-slate-700 font-bold';

                        if (isTheCorrectAnswer) {
                          cardStyle = 'bg-emerald-50/90 border-2 border-emerald-500 text-emerald-950 font-medium shadow-xs';
                          badgeStyle = 'bg-emerald-600 text-white font-extrabold shadow-xs';
                        } else if (isUserChoice) {
                          cardStyle = 'bg-rose-50/90 border-2 border-rose-400 text-rose-950 font-medium shadow-xs';
                          badgeStyle = 'bg-rose-600 text-white font-extrabold shadow-xs';
                        }

                        return (
                          <div 
                            key={optIdx}
                            className={`p-3.5 rounded-xl text-sm flex items-start gap-3 border transition-all ${cardStyle}`}
                          >
                            <span className={`w-6 h-6 rounded-lg text-xs flex items-center justify-center shrink-0 ${badgeStyle}`}>
                              {letter}
                            </span>
                            
                            <span className="flex-1 break-words leading-relaxed pt-0.5">
                              {opt}
                            </span>

                            {isTheCorrectAnswer && (
                              <span className="text-[11px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-md shrink-0 self-center">
                                ✓ Kunci Benar
                              </span>
                            )}
                            
                            {isUserChoice && !isTheCorrectAnswer && (
                              <span className="text-[11px] bg-rose-600 text-white font-bold px-2 py-0.5 rounded-md shrink-0 self-center">
                                ✗ Pilihan Anda
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Quiz View
  const currentQ = questions[currentIndex];
  const selectedAnswer = answers[currentQ?.id];
  const isCurrentFlagged = !!flagged[currentQ?.id];
  const isTimeCritical = timeLeft < 300; // Under 5 minutes

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between selection:bg-blue-600 selection:text-white pb-28">
      
      {/* 1. ENTERPRISE STICKY HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          
          {/* Left: Back & Crew Info */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={handleBackClick}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors shrink-0 border border-slate-200 cursor-pointer"
              title="Kembali ke Beranda"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate max-w-[130px] sm:max-w-[200px]">
                  {inspectorName}
                </span>
                <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 shrink-0">
                  {userSection || 'Crew'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
                  Auto-save {lastSavedTime}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Timer & Palette Launcher */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Font Size Adjuster Pill */}
            <div className="hidden sm:flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200">
              <button
                onClick={() => setFontSize(prev => prev === 'lg' ? 'base' : 'sm')}
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${fontSize === 'sm' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                title="Ukuran Teks Kecil"
              >
                A-
              </button>
              <button
                onClick={() => setFontSize('base')}
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${fontSize === 'base' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                title="Ukuran Teks Normal"
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${fontSize === 'lg' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                title="Ukuran Teks Besar"
              >
                A+
              </button>
            </div>

            {/* Real-time Countdown Timer */}
            <div className={`flex items-center gap-1.5 font-mono font-bold px-3 py-1.5 rounded-xl border text-xs sm:text-sm transition-all ${
              isTimeCritical 
                ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse shadow-xs shadow-rose-200' 
                : 'bg-slate-100 text-slate-800 border-slate-200'
            }`}>
              <Timer className={`w-4 h-4 ${isTimeCritical ? 'text-rose-600' : 'text-blue-600'}`} />
              <span>{formatTime(timeLeft)}</span>
            </div>

            {/* Palette Drawer Button */}
            <button
              onClick={() => setShowQuestionPalette(true)}
              className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl font-bold text-xs transition-colors shrink-0 cursor-pointer"
              title="Buka Daftar Soal"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="font-mono">{answeredCount}/{questions.length}</span>
            </button>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full bg-slate-200 h-1.5 relative overflow-hidden">
          <div 
            className="bg-blue-600 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </header>

      {/* 2. QUESTION VIEWPORT CONTAINER */}
      <main className="max-w-3xl w-full mx-auto px-3 sm:px-6 pt-4 sm:pt-6 space-y-4">
        
        {/* Question Header Card */}
        <div className="flex items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-teal-600 text-white font-extrabold text-xs px-3 py-1 rounded-lg shadow-xs">
              Soal {currentIndex + 1} / {questions.length}
            </span>
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 truncate max-w-[180px] sm:max-w-xs">
              {currentQ?.category || 'K3 & SOP'}
            </span>
          </div>

          {/* Mark for Review (Ragu-ragu) Toggle Button */}
          <button
            onClick={() => toggleFlag(currentQ?.id)}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              isCurrentFlagged 
                ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs' 
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Flag className={`w-3.5 h-3.5 ${isCurrentFlagged ? 'fill-slate-950 text-slate-950' : 'text-slate-500'}`} />
            <span>{isCurrentFlagged ? 'Ragu-ragu' : 'Tandai Ragu'}</span>
          </button>
        </div>

        {/* Question Text Box with Pristine Contrast */}
        <div className="p-5 sm:p-7 bg-white border border-slate-200 shadow-sm rounded-3xl space-y-5">
          <h2 className={`${questionFontClass} font-bold text-slate-900 leading-relaxed tracking-normal break-words whitespace-normal`}>
            {currentQ?.text}
          </h2>

          {/* Options Container (Mobile-first Touch Friendly) */}
          <div className="space-y-3 pt-2">
            {currentQ?.options.map((optionText, optIdx) => {
              const letter = ['A', 'B', 'C', 'D'][optIdx] || String(optIdx + 1);
              const isSelected = selectedAnswer === optIdx;

              return (
                <button
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border-2 transition-all duration-200 flex items-start gap-3.5 group cursor-pointer ${
                    isSelected 
                      ? 'border-blue-600 bg-blue-50/70 shadow-sm ring-2 ring-blue-500/20' 
                      : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  {/* Option Badge A/B/C/D */}
                  <span className={`w-9 h-9 rounded-xl font-extrabold text-sm flex items-center justify-center shrink-0 transition-transform group-active:scale-95 ${
                    isSelected 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200 border border-slate-200'
                  }`}>
                    {letter}
                  </span>

                  {/* Option Text with Safe Line-Wrap & Deep High Contrast */}
                  <span className={`flex-1 ${optionFontClass} leading-relaxed break-words whitespace-normal pt-1.5 ${
                    isSelected ? 'text-blue-950 font-bold' : 'text-slate-800 group-hover:text-slate-950 font-medium'
                  }`}>
                    {optionText}
                  </span>

                  {/* Radio / Checkmark Indicator */}
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-2 transition-colors ${
                    isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                  }`}>
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Helpful Keyboard Hint for Desktop */}
        <div className="hidden sm:flex items-center justify-between text-xs text-slate-500 px-2 font-medium">
          <span>Tips: Anda dapat menekan tombol keyboard <kbd className="px-1.5 py-0.5 bg-slate-200 border border-slate-300 rounded text-slate-800 font-mono font-bold">1-4</kbd> atau <kbd className="px-1.5 py-0.5 bg-slate-200 border border-slate-300 rounded text-slate-800 font-mono font-bold">A-D</kbd> untuk memilih jawaban.</span>
          <span><kbd className="px-1.5 py-0.5 bg-slate-200 border border-slate-300 rounded text-slate-800 font-mono font-bold">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-200 border border-slate-300 rounded text-slate-800 font-mono font-bold">→</kbd> Navigasi soal</span>
        </div>
      </main>

      {/* 3. ENTERPRISE STICKY BOTTOM ACTION BAR */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-3 sm:px-6 py-3 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2.5">
          
          {/* Previous Button */}
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`h-11 sm:h-12 px-3 sm:px-5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer ${
              currentIndex === 0 
                ? 'opacity-30 cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 active:scale-95'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          {/* Quick Ragu / Palette Toggles */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleFlag(currentQ?.id)}
              className={`h-11 sm:h-12 px-3 sm:px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                isCurrentFlagged
                  ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="Tandai Ragu-ragu"
            >
              <Flag className={`w-3.5 h-3.5 ${isCurrentFlagged ? 'fill-slate-950 text-slate-950' : 'text-slate-500'}`} />
              <span className="hidden xs:inline">Ragu</span>
            </button>

            <button
              onClick={() => setShowQuestionPalette(true)}
              className="h-11 sm:h-12 px-3 sm:px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
              <span>Daftar Soal</span>
            </button>
          </div>

          {/* Next / Finish Button */}
          {currentIndex === questions.length - 1 ? (
            <button
              onClick={() => setShowSubmitModal(true)}
              className="h-11 sm:h-12 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-md shadow-emerald-200 active:scale-95 transition-all cursor-pointer"
            >
              <span>Kumpulkan</span>
              <CheckCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="h-11 sm:h-12 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 shadow-md shadow-blue-200 active:scale-95 transition-all cursor-pointer"
            >
              <span className="hidden sm:inline">Selanjutnya</span>
              <span className="sm:hidden">Lanjut</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>

      {/* 4. MODAL PALETTE DAFTAR SOAL (DRAWER / BOTTOM SHEET) */}
      {showQuestionPalette && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
            
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-white">
              <div className="space-y-0.5">
                <h3 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                  <LayoutGrid className="w-5 h-5 text-blue-600" />
                  Peta Soal Kuis
                </h3>
                <p className="text-xs text-slate-500">Pilih nomor soal untuk langsung menuju pertanyaan</p>
              </div>
              <button
                onClick={() => setShowQuestionPalette(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Legend Counters */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl text-emerald-800">
                <span className="font-black text-sm block">{answeredCount}</span>
                <span className="text-[10px] text-emerald-700 font-semibold">Terjawab</span>
              </div>
              <div className="bg-amber-50 border border-amber-200 p-2 rounded-xl text-amber-800">
                <span className="font-black text-sm block">{flaggedCount}</span>
                <span className="text-[10px] text-amber-700 font-semibold">Ragu-ragu</span>
              </div>
              <div className="bg-slate-100 border border-slate-200 p-2 rounded-xl text-slate-700">
                <span className="font-black text-sm block">{unansweredCount}</span>
                <span className="text-[10px] text-slate-500 font-semibold">Belum Diisi</span>
              </div>
            </div>

            {/* Grid of Numbers */}
            <div className="p-4 sm:p-5 overflow-y-auto max-h-[50vh] grid grid-cols-5 gap-2.5 sm:gap-3 bg-white">
              {questions.map((q, idx) => {
                const isAns = answers[q.id] !== undefined;
                const isFlg = !!flagged[q.id];
                const isCurr = currentIndex === idx;

                let colorStyles = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
                if (isFlg) {
                  colorStyles = 'bg-amber-400 text-slate-950 font-black border-amber-500 shadow-xs';
                } else if (isAns) {
                  colorStyles = 'bg-emerald-600 text-white font-bold border-emerald-600 shadow-xs';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowQuestionPalette(false);
                    }}
                    className={`h-11 sm:h-12 rounded-xl text-sm font-bold flex items-center justify-center relative border transition-all active:scale-95 cursor-pointer ${colorStyles} ${
                      isCurr ? 'ring-2 ring-blue-600 ring-offset-2 ring-offset-white' : ''
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isFlg && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border border-white" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => setShowQuestionPalette(false)}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
              >
                Tutup Peta
              </button>
              <button
                onClick={() => {
                  setShowQuestionPalette(false);
                  setShowSubmitModal(true);
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Kumpulkan Kuis ({answeredCount}/{questions.length})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. PRE-SUBMIT AUDIT & CONFIRMATION MODAL */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="max-w-md w-full p-6 sm:p-7 bg-white border border-slate-200 shadow-2xl rounded-3xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">Kumpulkan Jawaban Kuis?</h3>
              <p className="text-slate-600 text-xs sm:text-sm">
                Pastikan Anda telah memeriksa kembali seluruh jawaban sebelum melakukan penguncian skor.
              </p>
            </div>

            {/* Audit Status Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-600 font-medium">Total Pertanyaan:</span>
                <span className="font-bold text-slate-900">{questions.length} Butir</span>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-slate-600 font-medium">Sudah Terjawab:</span>
                <span className="font-bold text-emerald-700">{answeredCount} Soal ({progressPercent}%)</span>
              </div>
              {flaggedCount > 0 && (
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-600 font-medium">Masih Ragu-ragu:</span>
                  <span className="font-bold text-amber-700">{flaggedCount} Soal</span>
                </div>
              )}
              {unansweredCount > 0 && (
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-slate-600 font-medium">Belum Dijawab:</span>
                  <span className="font-bold text-rose-700">{unansweredCount} Soal</span>
                </div>
              )}
            </div>

            {/* Incomplete Warning Alert if unanswered exist */}
            {unansweredCount > 0 && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-2.5 text-xs text-amber-900 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <p className="leading-snug">
                  Masih terdapat <strong>{unansweredCount} soal</strong> yang belum terisi. Soal yang tidak terisi akan dihitung sebagai 0 poin.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  if (isSubmittingRef.current) return;
                  isSubmittingRef.current = true;
                  handleFinishQuiz(answersRef.current, false);
                }}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md active:scale-95 transition-all cursor-pointer"
              >
                Ya, Selesaikan & Kumpulkan Sekarang
              </button>
              
              <button
                onClick={() => setShowSubmitModal(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm border border-slate-300 transition-colors cursor-pointer"
              >
                Periksa Kembali Jawaban
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
