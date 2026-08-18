import React, { useState, useEffect } from 'react';
import { Card, Button } from './ui';
import { ArrowLeft, ArrowRight, CheckCircle, RefreshCcw, Activity, Timer } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: number;
  category: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
}

export function QuizScreen({ onBack, userSection, inspectorName, inspectorNik }: { onBack: () => void, userSection: string, inspectorName: string, inspectorNik: string }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isFinished, setIsFinished] = useState(false);
  const [scoreData, setScoreData] = useState<{ score: number, percentage: number } | null>(null);
  const [isQuizLive, setIsQuizLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [quizVersion, setQuizVersion] = useState<string>('');
  
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
        
        if (quizConfigSetting && quizConfigSetting.settingValue) {
          const config = JSON.parse(quizConfigSetting.settingValue);
          if (config.version) setQuizVersion(config.version);
          if (config.activeQuestionIds && config.activeQuestionIds.length > 0) {
            // Find the questions based on activeQuestionIds, preserving the order of the IDs
            finalQuestions = config.activeQuestionIds
                .map((id: number) => allQuestions.find(q => q.id === id))
                .filter((q: Question | undefined): q is Question => q !== undefined);
          }
        }
        
        setQuestions(finalQuestions);
        let activeVersion = '';
        if (quizConfigSetting && quizConfigSetting.settingValue) {
           const parsed = JSON.parse(quizConfigSetting.settingValue);
           activeVersion = parsed.version || '';
        }
        const autosaveKey = `quiz_autosave_${inspectorNik}_${activeVersion}`;
        const savedData = localStorage.getItem(autosaveKey);
        if (savedData) {
          try {
            const parsed = JSON.parse(savedData);
            setAnswers(parsed.answers || {});
            setCurrentIndex(parsed.currentIndex || 0);
            setTimeLeft(parsed.timeLeft || (30 * 60));
          } catch(e) {
            setAnswers({});
            setCurrentIndex(0);
            setTimeLeft(30 * 60);
          }
        } else {
          setAnswers({});
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
        console.error(e);
        toast.error('Gagal memuat pertanyaan kuis');
      }
      setLoading(false);
    };
    initQuiz();
  }, []);


  useEffect(() => {
    if (loading || isFinished || !quizVersion || !inspectorNik || questions.length === 0) return;
    const autosaveKey = `quiz_autosave_${inspectorNik}_${quizVersion}`;
    localStorage.setItem(autosaveKey, JSON.stringify({
      answers,
      currentIndex,
      timeLeft
    }));
  }, [answers, currentIndex, timeLeft, quizVersion, inspectorNik, loading, isFinished, questions.length]);

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

  const handleBackClick = () => {
    if (!isFinished && questions.length > 0 && isQuizLive) {
      if (window.confirm('Kuis sedang berjalan. Apakah Anda yakin ingin keluar? Jawaban sementara telah disimpan otomatis.')) {
        onBack();
      }
    } else {
      onBack();
    }
  };

  useEffect(() => {
    if (isFinished || loading || questions.length === 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isFinished, loading, questions.length]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (index: number) => {
    setAnswers(prev => ({
      ...prev,
      [questions[currentIndex].id]: index
    }));
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

  const handleSubmit = () => {
    if (window.confirm('Apakah Anda yakin ingin menyelesaikan kuis ini?')) {
      handleFinishQuiz();
    }
  };
  
  const handleFinishQuiz = async () => {
      let score = 0;
      questions.forEach(q => {
        if (answers[q.id] === q.correctAnswerIndex) score++;
      });
      const percentage = Math.round((score / questions.length) * 100);
      setScoreData({ score, percentage });
      setIsFinished(true);
      
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
                totalQuestions: questions.length,
                percentage,
                quizVersion
            })
        });
        if (!res.ok) {
           const err = await res.json();
           toast.error(err.error || 'Gagal menyimpan skor');
        } else {
           toast.success('Kuis berhasil diselesaikan');
           localStorage.removeItem(`quiz_autosave_${inspectorNik}_${quizVersion}`);
        }
      } catch (e) {
          console.error("Gagal menyimpan skor", e);
          toast.error("Gagal menyimpan skor kuis");
      }
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Activity className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-slate-500 font-medium">Menyiapkan pertanyaan...</p>
      </div>
    );
  }
  
  if (!isQuizLive) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4 p-6 text-center">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-2">
            <Timer className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-700">Kuis Sedang Offline</h2>
        <p className="text-slate-500 max-w-md">Kuis saat ini belum diaktifkan atau masa pengisian telah berakhir.</p>
        <Button onClick={onBack} variant="secondary" className="mt-4">Kembali ke Beranda</Button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-64 gap-4 p-6 text-center">
        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-2">
            <CheckCircle className="w-8 h-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-700">Belum Ada Kuis Aktif</h2>
        <p className="text-slate-500 max-w-md">Kuis untuk bulan ini belum dikonfigurasi atau belum diaktifkan oleh Quality Assurance.</p>
        <Button onClick={onBack} variant="secondary" className="mt-4">Kembali ke Beranda</Button>
      </div>
    );
  }

  if (isFinished && scoreData) {
    return (
      <div className="max-w-md mx-auto p-4 space-y-6 mt-12 pb-24">
        <Card className="p-8 text-center space-y-6 shadow-xl border-slate-200">
          <div className="w-24 h-24 mx-auto bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <CheckCircle className="w-12 h-12" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Quiz Selesai!</h2>
            <p className="text-slate-500 mt-2">Terima kasih telah berpartisipasi, {inspectorName}.</p>
          </div>
          
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
            <p className="text-sm font-medium text-slate-500 mb-1">Skor Anda</p>
            <p className={`text-5xl font-bold ${scoreData.percentage >= 70 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {scoreData.percentage}%
            </p>
            <p className="text-sm text-slate-500 mt-3 font-medium">
              Benar {scoreData.score} dari {questions.length} Soal
            </p>
          </div>
          
          <Button variant="secondary" onClick={onBack} className="w-full h-12">
            Kembali ke Beranda
          </Button>
        </Card>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const selectedAnswer = answers[currentQ.id];

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4 mt-4 pb-24 flex flex-col">
      {/* Header Info */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={handleBackClick} className="w-10 h-10 p-0 rounded-full shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="font-bold text-slate-800 hidden sm:block">Quiz {userSection && `- ${userSection}`}</h2>
            <h2 className="font-bold text-slate-800 sm:hidden">Quiz QA</h2>
            <span className="text-[10px] sm:text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">{currentQ?.category}</span>
          </div>
        </div>
        <div className={`flex items-center gap-2 font-mono font-bold px-3 py-1.5 rounded-lg ${timeLeft < 300 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-700'}`}>
          <Timer className="w-4 h-4" />
          {formatTime(timeLeft)}
        </div>
      </div>
      
      {/* Question Navigator */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-3">
        <p className="text-xs font-medium text-slate-500 mb-2 px-1">Navigasi Soal</p>
        <div className="flex overflow-x-auto gap-2 pb-2 hide-scrollbar">
          {questions.map((q, idx) => {
            const isAnswered = answers[q.id] !== undefined;
            const isCurrent = currentIndex === idx;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
                  isCurrent ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                } ${
                  isAnswered 
                    ? 'bg-emerald-500 text-white border-transparent' 
                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      <Card className="p-6 shadow-sm border-slate-200 flex flex-col">
        <h3 className="text-lg font-semibold text-slate-800 leading-relaxed mb-6">
          <span className="text-slate-400 mr-2">{currentIndex + 1}.</span>
          {currentQ?.text}
        </h3>
        
        <div className="space-y-3">
          {currentQ?.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectOption(idx)}
              className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200 ${
                selectedAnswer === idx 
                  ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm' 
                  : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-start">
                <div className={`w-6 h-6 mt-0.5 rounded-full border-2 mr-3 flex items-center justify-center flex-shrink-0 ${
                  selectedAnswer === idx ? 'border-blue-500' : 'border-slate-300'
                }`}>
                  {selectedAnswer === idx && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                </div>
                <span className="text-[15px] leading-snug">{opt}</span>
              </div>
            </button>
          ))}
        </div>
      </Card>
      
      <div className="flex justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <Button 
          variant="secondary"
          onClick={handlePrev} 
          disabled={currentIndex === 0}
          className="px-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2 hidden sm:inline" /> Sebelumnya
        </Button>
        
        {currentIndex === questions.length - 1 ? (
          <Button 
            onClick={handleSubmit}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 font-bold"
          >
            Selesai
          </Button>
        ) : (
          <Button 
            onClick={handleNext}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8"
          >
            Selanjutnya <ArrowRight className="w-4 h-4 ml-2 hidden sm:inline" />
          </Button>
        )}
      </div>
      
      {Object.keys(answers).length === questions.length && currentIndex !== questions.length - 1 && (
        <div className="flex justify-center mt-2">
           <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full max-w-xs shadow-lg">
             Kumpulkan Jawaban
           </Button>
        </div>
      )}
    </div>
  );
}
