import React, { useState, useEffect, useRef } from 'react';
import { X, Trophy, Flame, Sparkles, RotateCcw, Volume2, VolumeX, ShieldAlert } from 'lucide-react';

export type RpsChoice = 'rock' | 'paper' | 'scissors';
export type GameResult = 'win' | 'lose' | 'draw';

interface LoungeGhostRpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  onFinishGame?: (result: GameResult, playerChoice: RpsChoice, ghostChoice: RpsChoice) => void;
  soundEnabled?: boolean;
}

const CHOICES: { id: RpsChoice; label: string; icon: string; beats: RpsChoice; desc: string; color: string; border: string }[] = [
  {
    id: 'rock',
    label: 'BATU LIMONITE',
    icon: '✊',
    beats: 'scissors',
    desc: 'Keras & pejal. Menghancurkan Gunting Sampling!',
    color: 'from-amber-600/30 to-amber-900/40',
    border: 'border-amber-500 hover:border-amber-300'
  },
  {
    id: 'paper',
    label: 'KERTAS SERTIFIKAT',
    icon: '🖐️',
    beats: 'rock',
    desc: 'Luwes & presisi. Membungkus Batu Limonite!',
    color: 'from-emerald-600/30 to-emerald-900/40',
    border: 'border-emerald-500 hover:border-emerald-300'
  },
  {
    id: 'scissors',
    label: 'GUNTING SAMPLING',
    icon: '✌️',
    beats: 'paper',
    desc: 'Tajam & sigap. Memotong Kertas Sertifikat!',
    color: 'from-cyan-600/30 to-cyan-900/40',
    border: 'border-cyan-500 hover:border-cyan-300'
  }
];

const GHOST_QUOTES = {
  ready: [
    'Hihihi... Angin malam berbisik, aku tahu apa yang akan kau pilih!',
    'Jangan ragu, Ranger! Pilih senjatamu sekarang...',
    'Tanganku tembus pandang, tapi jurus suwitku nyata! 👻',
    'Ayo buktikan siapa penguasa Gazebo K3 sesungguhnya!',
    'Malam-malam dingin gini paling asyik adu keberuntungan!'
  ],
  suspense: [
    'Hmm... kubaca garis tanganmu... 🔮',
    'Batu... Gunting... Kertas... SUWIT!',
    'Konsentrasi tingkat tinggi... Hii... 👻'
  ],
  win: [
    'Waduh... tanganku licin! Kamu hebat juga, Ranger! 🎉',
    'Aduh... instingmu lebih tajam malam ini! Selamat ya!',
    'Kalah aku... ilmu samplingmu sungguh luar biasa!',
    'Hebat! Baru kali ini ada yang bisa tebak polaku!'
  ],
  lose: [
    'Hihihi... Jiwa santaimu sudah kutebak dari tadi! 👻',
    'Kena deh! Jangan sedih, ayo coba tanding sekali lagi!',
    'Hantu gazebolah pemenangnya! Hihihi...',
    'Trik klasik! Aku sudah ratusan malam latihan di sini!'
  ],
  draw: [
    'Loh?! Pikiran kita seirama... kok bisa sama persis?! 🤝',
    'Hee?! Samaan! Jangan-jangan kamu juga bisa baca pikiran?',
    'Seri! Tidak ada yang kalah dan tidak ada yang menang, ayo rematch!'
  ]
};

// 8-Bit Retro GBA Web Audio Synthesizer
function playRpsAudio(type: 'select' | 'suspense' | 'win' | 'lose' | 'draw') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'select') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(659, now + 0.05);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'suspense') {
      [220, 277, 330, 440].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.03, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (idx + 1) * 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + (idx + 1) * 0.08);
      });
    } else if (type === 'win') {
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 Fanfare
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);
        gain.gain.setValueAtTime(0.06, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.22);
      });
    } else if (type === 'lose') {
      const notes = [440, 415.3, 392, 349.2]; // A4, Ab4, G4, F4 Spooky descending
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.04, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.25);
      });
    } else if (type === 'draw') {
      [440, 440].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.12);
        gain.gain.setValueAtTime(0.05, now + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.18);
      });
    }
  } catch {}
}

export const LoungeGhostRpsModal: React.FC<LoungeGhostRpsModalProps> = ({
  isOpen,
  onClose,
  playerName,
  onFinishGame,
  soundEnabled = true
}) => {
  const [phase, setPhase] = useState<'READY' | 'SUSPENSE' | 'REVEAL'>('READY');
  const [playerChoice, setPlayerChoice] = useState<RpsChoice | null>(null);
  const [ghostChoice, setGhostChoice] = useState<RpsChoice | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [ghostSpeech, setGhostSpeech] = useState<string>('');
  const [soundOn, setSoundOn] = useState<boolean>(soundEnabled);

  // Score History (Saved in localStorage)
  const [score, setScore] = useState<{ wins: number; losses: number; draws: number; streak: number }>(() => {
    try {
      const saved = localStorage.getItem('preplab_lounge_ghost_rps_score');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { wins: 0, losses: 0, draws: 0, streak: 0 };
  });

  // Pick random quote on ready
  useEffect(() => {
    if (isOpen) {
      setPhase('READY');
      setPlayerChoice(null);
      setGhostChoice(null);
      setGameResult(null);
      const quotes = GHOST_QUOTES.ready;
      setGhostSpeech(quotes[Math.floor(Math.random() * quotes.length)]);
    }
  }, [isOpen]);

  const handlePlaySound = (type: 'select' | 'suspense' | 'win' | 'lose' | 'draw') => {
    if (soundOn) playRpsAudio(type);
  };

  const handleSelectChoice = (choice: RpsChoice) => {
    if (phase !== 'READY') return;

    setPlayerChoice(choice);
    setPhase('SUSPENSE');
    handlePlaySound('select');

    const susQuotes = GHOST_QUOTES.suspense;
    setGhostSpeech(susQuotes[Math.floor(Math.random() * susQuotes.length)]);
    handlePlaySound('suspense');

    // Suspense countdown: 1.25 seconds
    setTimeout(() => {
      // Ghost AI Pick (Fair 33.3% random selection)
      const choices: RpsChoice[] = ['rock', 'paper', 'scissors'];
      const aiPick = choices[Math.floor(Math.random() * choices.length)];
      setGhostChoice(aiPick);

      let res: GameResult = 'draw';
      if (choice === aiPick) {
        res = 'draw';
      } else if (
        (choice === 'rock' && aiPick === 'scissors') ||
        (choice === 'paper' && aiPick === 'rock') ||
        (choice === 'scissors' && aiPick === 'paper')
      ) {
        res = 'win';
      } else {
        res = 'lose';
      }

      setGameResult(res);
      setPhase('REVEAL');

      // Update quote & play result audio
      if (res === 'win') {
        const winQ = GHOST_QUOTES.win;
        setGhostSpeech(winQ[Math.floor(Math.random() * winQ.length)]);
        handlePlaySound('win');
      } else if (res === 'lose') {
        const loseQ = GHOST_QUOTES.lose;
        setGhostSpeech(loseQ[Math.floor(Math.random() * loseQ.length)]);
        handlePlaySound('lose');
      } else {
        const drawQ = GHOST_QUOTES.draw;
        setGhostSpeech(drawQ[Math.floor(Math.random() * drawQ.length)]);
        handlePlaySound('draw');
      }

      // Update persistent score
      setScore(prev => {
        const next = {
          wins: res === 'win' ? prev.wins + 1 : prev.wins,
          losses: res === 'lose' ? prev.losses + 1 : prev.losses,
          draws: res === 'draw' ? prev.draws + 1 : prev.draws,
          streak: res === 'win' ? prev.streak + 1 : (res === 'lose' ? 0 : prev.streak)
        };
        try {
          localStorage.setItem('preplab_lounge_ghost_rps_score', JSON.stringify(next));
          if (next.wins >= 5) {
            localStorage.setItem('preplab_secret_domino_unlocked', 'true');
          }
        } catch {}

        if (res === 'win' && next.wins === 5) {
          setGhostSpeech('🎉 HIHIHI... HEBAT! Kamu menang 5 kali! Lubang rahasia di lantai terbuka... Masuklah ke sana! 🕳️✨');
        }

        return next;
      });

      if (onFinishGame) {
        onFinishGame(res, choice, aiPick);
      }
    }, 1250);
  };

  const handleResetRound = () => {
    setPhase('READY');
    setPlayerChoice(null);
    setGhostChoice(null);
    setGameResult(null);
    const quotes = GHOST_QUOTES.ready;
    setGhostSpeech(quotes[Math.floor(Math.random() * quotes.length)]);
    handlePlaySound('select');
  };

  const handleResetScore = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fresh = { wins: 0, losses: 0, draws: 0, streak: 0 };
    setScore(fresh);
    try {
      localStorage.setItem('preplab_lounge_ghost_rps_score', JSON.stringify(fresh));
    } catch {}
    handlePlaySound('select');
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg rounded-3xl bg-[#0F172A] border-2 border-purple-500/50 text-slate-100 shadow-[0_0_50px_rgba(168,85,247,0.3)] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow ambient background rings */}
        <div className="absolute -top-24 -left-24 w-60 h-60 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-cyan-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="px-5 py-3.5 border-b border-purple-500/30 bg-slate-900/80 flex items-center justify-between z-10">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl animate-bounce">👻</span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black uppercase tracking-wider text-purple-400 font-mono">
                  Lounge Mini-Game
                </span>
                <span className="text-[10px] px-1.5 py-0.2 bg-purple-950/80 text-purple-300 font-bold rounded-md border border-purple-800">
                  VS BOT POJOK K3
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide flex items-center gap-1.5">
                <span>Duel Suwit Hantu Pojok Gazebo</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundOn(!soundOn)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-950/50 transition-colors cursor-pointer"
              title={soundOn ? 'Matikan Suara' : 'Nyalakan Suara'}
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-purple-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Game"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Score & Streak Banner */}
        <div className="px-5 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono z-10">
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-bold">
              🏆 Menang: <span className="text-white">{score.wins}</span>
            </span>
            <span className="text-rose-400 font-bold">
              💀 Kalah: <span className="text-white">{score.losses}</span>
            </span>
            <span className="text-amber-400 font-bold">
              🤝 Seri: <span className="text-white">{score.draws}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {score.streak > 1 && (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold text-[10px] flex items-center gap-1 border border-amber-500/40 animate-pulse">
                <Flame className="w-3 h-3 text-amber-400" /> {score.streak} Streak!
              </span>
            )}
            <button
              type="button"
              onClick={handleResetScore}
              className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-0.5"
              title="Reset Rekor Skor"
            >
              <RotateCcw className="w-2.5 h-2.5" /> Reset
            </button>
          </div>
        </div>

        {/* Central Arena Stage */}
        <div className="p-5 flex flex-col items-center gap-4 z-10">
          {/* Ghost Character & Speech Bubble */}
          <div className="flex flex-col items-center w-full max-w-sm">
            {/* Retro Speech Balloon */}
            <div className="relative mb-3 px-4 py-2.5 rounded-2xl bg-purple-950/70 border-2 border-purple-400/60 shadow-lg text-center max-w-xs transition-all">
              <p className="text-xs font-bold text-purple-200 tracking-wide font-sans leading-relaxed">
                "{ghostSpeech}"
              </p>
              {/* Balloon beak */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-x-8 border-x-transparent border-t-8 border-t-purple-400/60" />
            </div>

            {/* Ghost Avatar Visual */}
            <div className="relative flex items-center justify-center">
              {/* Ghost Aura */}
              <div className="w-16 h-16 rounded-full bg-purple-500/20 blur-md absolute -z-10 animate-pulse" />
              
              {/* Animated Floating Ghost SVG */}
              <div 
                className="w-16 h-16 select-none cursor-pointer filter drop-shadow-[0_0_12px_rgba(168,85,247,0.7)]"
                style={{
                  animation: phase === 'SUSPENSE' ? 'spin 0.4s linear infinite' : 'ghostBob 2s ease-in-out infinite'
                }}
              >
                <svg viewBox="0 0 32 32" className="w-full h-full">
                  {/* Outer Spooky Shading */}
                  <path 
                    d="M16 3 C9 3 5 8 5 15 C5 22 5 28 8 28 C10 28 11 25 13 25 C15 25 16 28 19 28 C22 28 23 25 25 25 C26 25 27 28 29 28 C30 28 30 22 30 15 C30 8 25 3 16 3 Z" 
                    fill="#C084FC" 
                    opacity="0.9"
                  />
                  {/* Inner Ghost Highlights */}
                  <path 
                    d="M16 5 C10.5 5 7.5 9 7.5 15 C7.5 21 8 25 10 25 C11.5 25 12.5 23 14 23 C15.5 23 16.5 25 19 25 C21 25 22 23 23.5 23 C24.5 23 25.5 25 27 25 C28 25 28 21 28 15 C28 9 23 5 16 5 Z" 
                    fill="#F3E8FF" 
                  />
                  {/* Glowing Eyes */}
                  <ellipse cx="12" cy="13" rx="2.5" ry="3.5" fill="#581C87" />
                  <ellipse cx="20" cy="13" rx="2.5" ry="3.5" fill="#581C87" />
                  <circle cx="11.5" cy="12.5" r="1" fill="#FACC15" />
                  <circle cx="19.5" cy="12.5" r="1" fill="#FACC15" />

                  {/* Mouth Expression */}
                  {gameResult === 'win' ? (
                    // Surprised O-mouth when defeated
                    <ellipse cx="16" cy="20" rx="2" ry="2.5" fill="#581C87" />
                  ) : gameResult === 'lose' ? (
                    // Witty smirk when ghost wins
                    <path d="M12 18 Q16 23 20 18" stroke="#581C87" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                  ) : (
                    // Classic ghostly grin
                    <path d="M13 19 Q16 22 19 19" stroke="#581C87" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  )}

                  {/* Rosy ghostly blush */}
                  <circle cx="8" cy="16" r="1.5" fill="#F472B6" opacity="0.6" />
                  <circle cx="24" cy="16" r="1.5" fill="#F472B6" opacity="0.6" />
                </svg>
              </div>
            </div>

            <span className="text-[11px] font-mono font-bold text-purple-300 mt-1">
              Si Mba Hantu (Pojok Gazebo K3)
            </span>
          </div>

          {/* Versus Match Showcase (When Suspense or Reveal) */}
          {(phase === 'SUSPENSE' || phase === 'REVEAL') && (
            <div className="w-full flex items-center justify-center gap-4 py-2 px-4 rounded-2xl bg-slate-900/90 border border-slate-800">
              {/* Player Side */}
              <div className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  {playerName}
                </span>
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border-2 border-emerald-500/60 flex items-center justify-center text-3xl shadow-inner animate-pulse">
                  {playerChoice === 'rock' && '✊'}
                  {playerChoice === 'paper' && '🖐️'}
                  {playerChoice === 'scissors' && '✌️'}
                </div>
                <span className="text-[10px] font-bold text-emerald-400 capitalize">
                  {playerChoice}
                </span>
              </div>

              {/* VS Badge */}
              <div className="flex flex-col items-center">
                <span className="px-2 py-1 rounded-lg bg-purple-600/30 text-purple-300 font-mono font-black text-xs border border-purple-500/40">
                  VS
                </span>
              </div>

              {/* Ghost Side */}
              <div className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                  Hantu Pojok
                </span>
                <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border-2 border-purple-500/60 flex items-center justify-center text-3xl shadow-inner">
                  {phase === 'SUSPENSE' ? (
                    <span className="animate-spin text-2xl">🌀</span>
                  ) : (
                    <>
                      {ghostChoice === 'rock' && '✊'}
                      {ghostChoice === 'paper' && '🖐️'}
                      {ghostChoice === 'scissors' && '✌️'}
                    </>
                  )}
                </div>
                <span className="text-[10px] font-bold text-purple-400 capitalize">
                  {phase === 'SUSPENSE' ? 'Meramal...' : ghostChoice}
                </span>
              </div>
            </div>
          )}

          {/* Reveal Outcome Result Banner */}
          {phase === 'REVEAL' && gameResult && (
            <div 
              className={`w-full py-2.5 px-4 rounded-2xl border-2 flex items-center justify-center gap-2 animate-in zoom-in-95 duration-200 ${
                gameResult === 'win' 
                  ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                  : gameResult === 'lose'
                  ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                  : 'bg-amber-950/80 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
              }`}
            >
              <span className="text-xl">
                {gameResult === 'win' ? '🎉' : gameResult === 'lose' ? '💀' : '🤝'}
              </span>
              <span className="font-black text-sm tracking-wider font-mono uppercase">
                {gameResult === 'win' ? 'KAMU MENANG!' : gameResult === 'lose' ? 'HANTU MENANG!' : 'HASIL SERI!'}
              </span>
            </div>
          )}

          {/* Move Selection Cards (Interactive Buttons) */}
          {phase === 'READY' ? (
            <div className="w-full flex flex-col gap-2">
              <span className="text-[11px] font-bold font-mono text-purple-300 text-center uppercase tracking-wider">
                Pilih Senjatamu:
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {CHOICES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectChoice(item.id)}
                    className={`p-3 rounded-2xl bg-gradient-to-b ${item.color} border-2 ${item.border} flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 group shadow-lg hover:shadow-purple-500/20`}
                  >
                    <span className="text-4xl group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                    <span className="text-xs font-black text-white tracking-wide text-center">
                      {item.label}
                    </span>
                    <span className="text-[9px] text-slate-300 text-center leading-tight line-clamp-2">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : phase === 'REVEAL' ? (
            <div className="w-full flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleResetRound}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 border border-purple-400"
              >
                <RotateCcw className="w-4 h-4 font-black" />
                <span>Tanding Lagi</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition-all cursor-pointer border border-slate-700"
              >
                Sudahi Main
              </button>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-purple-300 font-mono text-xs font-bold animate-pulse">
                <span>✊</span>
                <span>🖐️</span>
                <span>✌️</span>
                <span>Batu... Gunting... Kertas...</span>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Note */}
        <div className="px-5 py-2.5 bg-slate-950/70 border-t border-purple-500/20 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-[10px] text-purple-300/80">
            💡 Tips: Hantu memilih secara acak. Asah insting suwitmu di sela rehat shift!
          </span>
          <span className="font-mono text-[10px] text-slate-500">
            PrepLab Obi Mini-Game
          </span>
        </div>
      </div>

      <style>{`
        @keyframes ghostBob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
};
