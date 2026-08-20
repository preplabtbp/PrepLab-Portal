import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, MapPin, CheckCircle2, ShieldAlert, ArrowRight, Loader2, Shield } from 'lucide-react';
import { Button } from './ui';
import { io, Socket } from 'socket.io-client';

interface EasterEggGameProps {
  onClose: () => void;
}

interface PlayerState {
  id: string;
  name: string;
  node: number;
}

interface LeaderboardRecord {
  nik: string;
  name: string;
  node: number;
  lastUpdated: string;
}

export const EasterEggGame: React.FC<EasterEggGameProps> = ({ onClose }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRecord[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [gameState, setGameState] = useState<'LOADING' | 'LOGIN' | 'MAP' | 'QUIZ' | 'FINISHED'>('LOADING');
  
  const [playerNik, setPlayerNik] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('p2h_inspector_nik') || 'GUEST_' + Math.floor(Math.random()*10000);
    }
    return '';
  });
  const [playerName, setPlayerName] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('p2h_inspector_name') || '';
    }
    return '';
  });
  const [currentNode, setCurrentNode] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [isAttacking, setIsAttacking] = useState<'PLAYER' | 'ENEMY' | null>(null);

  useEffect(() => {
    // Fetch questions and leaderboard
    Promise.all([
      fetch('/api/quiz/quest-questions').then(r => r.json()),
      fetch('/api/quiz/quest-leaderboard').then(r => r.json())
    ]).then(([qs, board]) => {
      setQuestions(qs);
      setLeaderboard(board);
      setGameState('LOGIN');
    }).catch(err => {
      console.error(err);
      setGameState('LOGIN');
    });

    // Initialize socket connection
    const newSocket = io(); 
    setSocket(newSocket);

    newSocket.on('quiz:state', (updatedPlayers: PlayerState[]) => {
      setPlayers(updatedPlayers);
      // Also refresh leaderboard quietly
      fetch('/api/quiz/quest-leaderboard').then(r => r.json()).then(setLeaderboard).catch(console.error);
    });

    return () => {
      newSocket.emit('quiz:leave');
      newSocket.disconnect();
    };
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !socket) return;
    
    // Attempt to verify NIK/Name from leaderboard or let them play anyway
    const existing = leaderboard.find(r => r.nik === playerNik.trim());
    const nameToUse = playerName.trim();
    
    // If they played before, resume their node
    const startingNode = existing ? existing.node : 0;
    
    setPlayerName(nameToUse);
    setCurrentNode(startingNode);
    
    if (startingNode >= questions.length && questions.length > 0) {
      setGameState('FINISHED');
    } else {
      setGameState('MAP');
    }

    socket.emit('quiz:join', { id: socket.id, nik: playerNik.trim(), name: nameToUse });
    if (startingNode > 0) {
      socket.emit('quiz:progress', startingNode);
    }
  };

  const startLevel = () => {
    setSelectedOption(null);
    setShowFeedback(false);
    setGameState('QUIZ');
  };

  const handleAnswer = (index: number) => {
    if (showFeedback) return;
    setSelectedOption(index);
    setShowFeedback(true);
    
    const q = questions[currentNode];
    const isCorrect = index === q.correctIndex;

    if (isCorrect) {
      setIsAttacking('PLAYER');
      setEnemyHp(0);
      setTimeout(() => {
        const nextNode = currentNode + 1;
        setCurrentNode(nextNode);
        setShowFeedback(false);
        setSelectedOption(null);
        setIsAttacking(null);
        
        // save progress via socket and DB
        if (socket) {
          socket.emit('quiz:progress', { nik: playerNik, name: playerName, node: nextNode });
        }
        fetch('/api/quiz/quest-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nik: playerNik, node: nextNode })
        }).catch(console.error);

        if (nextNode >= questions.length) {
          setGameState('FINISHED');
        } else {
          setGameState('MAP'); // Return to map to see progress
        }
      }, 3000);
    } else {
      setIsAttacking('ENEMY');
      const newHp = Math.max(0, playerHp - 34);
      setPlayerHp(newHp);
      
      setTimeout(() => {
        setShowFeedback(false);
        setSelectedOption(null);
        setIsAttacking(null);
        
        if (newHp === 0) {
          // Player defeated, heal and retry
          setPlayerHp(100);
        }
      }, 3000);
    }
  };

  // UI Components
  const renderLoadingScreen = () => (
    <motion.div key="loading" className="flex flex-col items-center justify-center w-full h-full text-teal-400 gap-4">
      <Loader2 className="w-12 h-12 animate-spin" />
      <p className="font-mono text-sm">Memuat modul K3LH...</p>
    </motion.div>
  );

  const renderLoginScreen = () => (
    <motion.form 
      key="login"
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
      onSubmit={handleJoin} className="flex flex-col items-center w-full max-w-sm gap-4 mx-auto bg-slate-900/90 p-8 rounded-[2rem] shadow-2xl border border-slate-700 backdrop-blur-md"
    >
      <ShieldAlert className="w-16 h-16 text-teal-400 mb-2" />
      <h2 className="text-3xl font-display font-bold text-white text-center">Masuk ke<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">Pulau Obi</span></h2>
      <p className="text-slate-400 text-center mb-4">Misi penyelamatan K3LH membutuhkan bantuanmu!</p>
      
      <input
        type="text"
        placeholder="Nama Panggilan"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
        className="w-full bg-slate-950/50 border-2 border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-white text-center font-bold text-lg outline-none transition-colors"
        required
        maxLength={15}
      />
      
      <Button type="submit" variant="primary" className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 rounded-xl shadow-[0_0_15px_rgba(13,148,136,0.5)]">
        MULAI PETUALANGAN
      </Button>
    </motion.form>
  );

  const renderMapNodes = () => {
    // Generate coordinates starting from outer coast to the center
    const getNodePosition = (idx: number, total: number) => {
      if (total <= 1) return { x: 45, y: 50 };
      
      const progress = idx / (total - 1);
      // Start from edge (radius 45) to center (radius 0)
      const angle = progress * Math.PI * 2.5; // 1.25 turns
      const radius = 45 * (1 - progress);
      
      const x = 45 + radius * Math.cos(angle);
      const y = 50 + radius * Math.sin(angle);
      
      return { x, y };
    };

    return (
      <div className="absolute inset-0 pointer-events-none">
        {questions.map((_, idx) => {
          const pos = getNodePosition(idx, questions.length);
          const isCompleted = idx < currentNode;
          const isCurrent = idx === currentNode;
          const isBoss = idx === questions.length - 1;
          
          return (
            <motion.div
              key={idx}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              className={`absolute w-8 h-8 md:w-12 md:h-12 -ml-4 -mt-4 md:-ml-6 md:-mt-6 rounded-full flex items-center justify-center cursor-pointer pointer-events-auto shadow-lg border-2 ${isCurrent ? 'bg-amber-500/90 border-white z-20 animate-bounce' : isCompleted ? 'bg-teal-500/80 border-teal-200 z-10' : 'bg-slate-800/80 border-slate-600 z-0'} ${isBoss ? 'w-12 h-12 md:w-16 md:h-16 -ml-6 -mt-6 md:-ml-8 md:-mt-8' : ''}`}
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              onClick={() => {
                if (isCurrent && gameState === 'MAP') {
                  setGameState('QUIZ');
                }
              }}
            >
              {isCurrent ? (
                 <ShieldAlert className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-md" />
              ) : isCompleted ? (
                 <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-white" />
              ) : isBoss ? (
                 <ShieldAlert className="w-6 h-6 md:w-8 md:h-8 text-rose-500" />
              ) : (
                 <span className="text-[10px] md:text-xs font-bold text-slate-400">{idx + 1}</span>
              )}
              
              {/* Connecting lines */}
              {idx < questions.length - 1 && (
                <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none -z-10">
                  <line 
                    x1="50%" y1="50%" 
                    x2={`${(getNodePosition(idx + 1, questions.length).x - pos.x) * 10}%`} 
                    y2={`${(getNodePosition(idx + 1, questions.length).y - pos.y) * 10}%`} 
                    stroke={isCompleted ? "rgba(20, 184, 166, 0.5)" : "rgba(71, 85, 105, 0.5)"} 
                    strokeWidth="4" strokeDasharray="6 6"
                  />
                </svg>
              )}
            </motion.div>
          );
        })}

        {/* Player Sprite on Map */}
        {currentNode < questions.length && (
          <motion.div
            layout
            initial={false}
            animate={{
              left: `${getNodePosition(currentNode, questions.length).x}%`,
              top: `${getNodePosition(currentNode, questions.length).y}%`,
            }}
            transition={{ type: "spring", stiffness: 50, damping: 15 }}
            className="absolute w-12 h-12 md:w-16 md:h-16 -ml-6 -mt-12 md:-ml-8 md:-mt-16 z-30 drop-shadow-2xl pointer-events-none"
          >
             <img src="/assets/rpg-player.jpg" className="w-full h-full object-contain mix-blend-multiply drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" alt="Player Map Sprite" />
          </motion.div>
        )}
      </div>
    );
  };

  const renderQuizScreen = () => {
    const q = questions[currentNode];
    if (!q) return null;
    
    const isAnswered = showFeedback;
    const isCorrect = selectedOption === q.correctIndex;
    const isBoss = currentNode === questions.length - 1;

    return (
      <motion.div key="quiz" initial={{ opacity: 0, y: 50, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.95 }} className="flex flex-col w-full max-w-lg bg-slate-900/95 border-2 border-slate-700 p-4 md:p-6 rounded-[2rem] shadow-2xl backdrop-blur-xl relative">
        <div className="flex items-center justify-between mb-4 border-b border-slate-700/50 pb-3">
          <span className="text-slate-400 text-sm font-bold tracking-widest uppercase">
            {isBoss ? 'FINAL BOSS' : `Pos ${currentNode + 1} / ${questions.length}`}
          </span>
          <div className="bg-slate-800 text-amber-400 text-xs px-3 py-1 rounded-full font-bold shadow-inner flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            Battle Arena
          </div>
        </div>

        {/* RPG BATTLE ARENA */}
        <div className="relative w-full h-36 md:h-44 mb-6 rounded-2xl border-2 border-slate-700 overflow-hidden bg-slate-800 flex justify-between items-end p-2 md:p-4 shadow-inner">
          <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: 'url("/assets/rpg-map.jpg")' }} />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none" />

          {/* Player Sprite & HP */}
          <div className="relative z-10 flex flex-col items-center w-28 md:w-32">
            {/* HP Bar */}
            <div className="w-full bg-slate-800 h-3 rounded-full mb-2 overflow-hidden border border-slate-700 shadow-inner relative">
               <div className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" style={{ width: `${playerHp}%` }} />
               <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white drop-shadow-md">{playerHp}/100</div>
            </div>
            <motion.div
              animate={
                isAttacking === 'PLAYER' ? { x: [0, 50, 0], scale: [1, 1.1, 1] } :
                isAttacking === 'ENEMY' ? { x: [-10, 10, -10, 10, 0], filter: ['brightness(1)', 'brightness(1) sepia(1) hue-rotate(-50deg) saturate(5)', 'brightness(1)'] } : {}
              }
              transition={{ duration: 0.4 }}
              className="w-24 h-24 md:w-28 md:h-28 flex items-center justify-center relative"
            >
              <img src="/assets/rpg-player.jpg" alt="Player" className="w-full h-full object-contain mix-blend-multiply drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]" />
              {playerHp === 0 && <div className="absolute top-0 right-0 text-2xl animate-bounce">😵</div>}
            </motion.div>
            <span className="text-xs font-bold text-slate-200 mt-1 uppercase tracking-wider drop-shadow-lg">{playerName}</span>
          </div>

          {/* VS Badge */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-8 md:w-10 md:h-10 bg-slate-800 rounded-full flex items-center justify-center border border-slate-600 shadow-lg z-20">
            <span className="text-amber-500 font-bold text-xs md:text-sm italic">VS</span>
          </div>

          {/* Enemy Sprite & HP */}
          <div className="relative z-10 flex flex-col items-center w-28 md:w-32">
            {/* HP Bar */}
            <div className="w-full bg-slate-800 h-3 rounded-full mb-2 overflow-hidden border border-slate-700 shadow-inner relative">
               <div className="h-full bg-rose-500 transition-all duration-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" style={{ width: `${enemyHp}%` }} />
               <div className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white drop-shadow-md">{enemyHp}/100</div>
            </div>
            <motion.div
              animate={
                isAttacking === 'ENEMY' ? { x: [0, -50, 0], scale: [1, 1.1, 1] } :
                isAttacking === 'PLAYER' ? { x: [10, -10, 10, -10, 0], filter: ['brightness(1)', 'brightness(2)', 'brightness(1)'] } : {}
              }
              transition={{ duration: 0.4 }}
              className={`flex items-center justify-center relative ${isBoss ? 'w-28 h-28 md:w-32 md:h-32' : 'w-24 h-24 md:w-28 md:h-28'}`}
            >
               <img src={isBoss ? "/assets/rpg-boss.jpg" : "/assets/rpg-enemy.jpg"} alt="Enemy" className="w-full h-full object-contain mix-blend-multiply drop-shadow-[0_0_15px_rgba(244,63,94,0.3)]" />
               {enemyHp === 0 && <div className="absolute top-0 right-0 text-3xl animate-ping">💥</div>}
            </motion.div>
            <span className={`text-[10px] md:text-xs font-bold mt-1 uppercase tracking-wider drop-shadow-lg ${isBoss ? 'text-amber-500' : 'text-rose-400'}`}>
              {isBoss ? 'Demon Insiden' : 'Toxic Sludge'}
            </span>
          </div>
        </div>

        <h3 className="text-lg md:text-xl font-bold text-white mb-4 leading-relaxed">
          {q.question}
        </h3>

        <div className="flex flex-col gap-2 md:gap-3 flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">
          {q.options.map((opt: string, idx: number) => {
            let btnClass = "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200 hover:border-teal-500/50";
            if (isAnswered) {
              if (idx === q.correctIndex) btnClass = "bg-teal-900/80 border-teal-500 text-teal-100 ring-2 ring-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.3)] scale-[1.02]";
              else if (idx === selectedOption) btnClass = "bg-rose-900/80 border-rose-500 text-rose-100 ring-2 ring-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] scale-[0.98] opacity-80";
              else btnClass = "bg-slate-800/50 border-slate-700 text-slate-500 opacity-40 scale-95";
            }

            return (
              <button
                key={idx}
                disabled={isAnswered || playerHp === 0}
                onClick={() => handleAnswer(idx)}
                className={`p-3 md:p-4 rounded-xl border-2 text-left transition-all duration-300 shadow-sm ${btnClass}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${isAnswered && idx === q.correctIndex ? 'bg-teal-500 text-white' : isAnswered && idx === selectedOption ? 'bg-rose-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="flex-1 font-medium text-sm md:text-base">{opt}</span>
                </div>
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {showFeedback && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              className={`absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-8 p-4 rounded-2xl border-2 backdrop-blur-md z-50 ${isCorrect ? 'bg-teal-900/90 border-teal-500 shadow-[0_0_30px_rgba(20,184,166,0.4)]' : playerHp === 0 ? 'bg-amber-900/90 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)]' : 'bg-rose-900/90 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)]'}`}
            >
              <h4 className={`font-display text-lg font-bold mb-1 flex items-center gap-2 ${isCorrect ? 'text-teal-400' : playerHp === 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                {isCorrect ? <CheckCircle2 className="w-5 h-5" /> : playerHp === 0 ? <Shield className="w-5 h-5" /> : <X className="w-5 h-5" />}
                {isCorrect ? 'Serangan Kritikal!' : playerHp === 0 ? 'Kamu Kelelahan!' : 'Diserang Musuh!'}
              </h4>
              <p className="text-slate-200 text-xs md:text-sm leading-relaxed drop-shadow-md">
                {isCorrect ? q.explanation : playerHp === 0 ? 'Tarik napas dan bersiaplah untuk mencoba kembali...' : 'Jawaban kurang tepat. Awas serangan balasan!'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const renderFinishedScreen = () => (
    <motion.div key="finished" initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center text-center p-8 max-w-lg bg-slate-900/95 border-2 border-slate-700 rounded-[2rem] shadow-2xl backdrop-blur-xl mx-auto mt-20">
      <div className="relative">
        <div className="absolute inset-0 bg-amber-400/20 blur-2xl rounded-full" />
        <Trophy className="w-24 h-24 text-amber-400 mb-6 animate-bounce drop-shadow-[0_0_25px_rgba(251,191,36,0.6)] relative z-10" />
      </div>
      <h2 className="text-4xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500 mb-3">Quest Selesai!</h2>
      <p className="text-slate-300 mb-8 max-w-sm text-lg">Luar biasa, <span className="font-bold text-white">{playerName}</span>! Anda telah membuktikan dedikasi tinggi pada K3LH.</p>
      
      <div className="bg-slate-900/80 rounded-2xl p-5 w-full mb-8 text-left border border-slate-700/80 shadow-2xl backdrop-blur-sm">
        <h4 className="text-amber-400 text-sm uppercase tracking-widest font-bold mb-4 flex items-center justify-center gap-2 border-b border-slate-700/80 pb-3">
          <Trophy className="w-4 h-4" /> Pahlawan Keselamatan
        </h4>
        <div className="flex flex-col gap-3 max-h-48 overflow-y-auto custom-scrollbar pr-2">
          {leaderboard.filter(p => p.node >= questions.length).map((p, i) => (
            <div key={p.nik} className={`flex items-center gap-3 text-sm p-2 rounded-lg ${p.nik === playerNik ? 'bg-teal-900/30 border border-teal-500/30' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${i === 0 ? 'bg-amber-500 border-amber-300 text-slate-900' : i === 1 ? 'bg-slate-300 border-white text-slate-900' : i === 2 ? 'bg-amber-700 border-amber-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                {i + 1}
              </div>
              <div className={`flex-1 font-medium ${p.nik === playerNik ? 'text-teal-300 font-bold' : 'text-slate-200'}`}>{p.name} {p.nik === playerNik && '(Kamu)'}</div>
              <CheckCircle2 className="w-5 h-5 text-teal-500 drop-shadow-[0_0_5px_rgba(20,184,166,0.5)]" />
            </div>
          ))}
          {leaderboard.filter(p => p.node >= questions.length).length === 0 && (
             <p className="text-slate-500 text-sm italic text-center py-4">Belum ada pemain lain yang selesai.</p>
          )}
        </div>
      </div>

      <Button onClick={onClose} variant="primary" className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 text-lg">KEMBALI KE PORTAL</Button>
    </motion.div>
  );

  // The Floating Leaderboard
  const renderFloatingLeaderboard = () => {
    if (gameState === 'LOGIN' || gameState === 'LOADING') return null;
    return (
      <div className="absolute top-4 left-4 z-[80] bg-slate-900/80 p-3 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-md w-48 md:w-56 pointer-events-auto">
        <h4 className="text-amber-400 text-xs md:text-sm uppercase tracking-widest font-bold mb-2 flex items-center gap-2 border-b border-slate-700/80 pb-2">
          <Trophy className="w-3 h-3 md:w-4 md:h-4" /> Klasemen
        </h4>
        <div className="flex flex-col gap-2 max-h-32 md:max-h-48 overflow-y-auto custom-scrollbar pr-1">
          {leaderboard.map((p, i) => (
            <div key={p.nik} className={`flex items-center gap-2 text-[10px] md:text-xs p-1.5 rounded-lg ${p.nik === playerNik ? 'bg-teal-900/50 border border-teal-500/30' : ''}`}>
              <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center font-bold border ${i === 0 ? 'bg-amber-500 border-amber-300 text-slate-900' : i === 1 ? 'bg-slate-300 border-white text-slate-900' : i === 2 ? 'bg-amber-700 border-amber-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                {i + 1}
              </div>
              <div className={`flex-1 font-medium truncate ${p.nik === playerNik ? 'text-teal-300 font-bold' : 'text-slate-200'}`}>
                {p.name}
              </div>
              <span className="text-slate-400 font-mono text-[8px] md:text-[10px]">P{p.node}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950 overflow-hidden font-sans">
      {/* Background Map Layer */}
      <div 
        className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out ${gameState === 'LOGIN' || gameState === 'LOADING' ? 'blur-md scale-105 opacity-30' : 'opacity-100'}`} 
        style={{ backgroundImage: 'url("/assets/rpg-map.jpg")' }} 
      />

      {/* Map Nodes (Only visible when not loading/login) */}
      <AnimatePresence>
        {gameState !== 'LOGIN' && gameState !== 'LOADING' && renderMapNodes()}
      </AnimatePresence>

      {/* Floating UI */}
      {renderFloatingLeaderboard()}

      <div className="absolute top-4 right-4 md:top-6 md:right-6 z-[100]">
        <button onClick={onClose} className="text-slate-400 hover:text-white bg-slate-900/80 p-2 md:p-3 rounded-full border border-slate-700 backdrop-blur-md transition-all hover:scale-110 hover:bg-slate-700 shadow-xl pointer-events-auto">
          <X className="w-5 h-5 md:w-6 md:h-6" />
        </button>
      </div>

      {/* Foreground Overlays (Modals) */}
      <AnimatePresence mode="wait">
        {gameState === 'LOADING' && (
          <div key="loading-wrap" className="absolute inset-0 flex items-center justify-center z-[90]">
            {renderLoadingScreen()}
          </div>
        )}
        {gameState === 'LOGIN' && (
          <div key="login-wrap" className="absolute inset-0 flex items-center justify-center z-[90] p-4">
            {renderLoginScreen()}
          </div>
        )}
        {gameState === 'QUIZ' && (
          <div key="quiz-wrap" className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm z-[90] p-4 pointer-events-auto">
            {renderQuizScreen()}
          </div>
        )}
        {gameState === 'FINISHED' && (
          <div key="finished-wrap" className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-[90] p-4 pointer-events-auto">
            {renderFinishedScreen()}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
