import React, { useState, useEffect, useRef } from 'react';
import { X, Trophy, Flame, Sparkles, RotateCcw, Volume2, VolumeX, ShieldAlert, Award } from 'lucide-react';
import { renderAvatarNode } from './SecretDominoLoungeModal';

export type RpsChoice = 'rock' | 'paper' | 'scissors';
export type GameResult = 'win' | 'lose' | 'draw';

interface LoungePvPRpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  opponentName?: string;
  opponentAvatar?: string;
  opponentPangkat?: string;
  onFinishGame?: (result: GameResult, playerChoice: RpsChoice, opponentChoice: RpsChoice) => void;
  onUnlockCutscene?: () => void;
  soundEnabled?: boolean;
  isSecretHoleUnlocked?: boolean;
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

const PVP_QUOTES = {
  ready: [
    'Ayo Ranger! Tunjukkan insting sampling terbaikmu!',
    'Siapa yang kalah push-up 5x atau seduh kopi shift berikutnya!',
    'Pikiran tajam, konsentrasi K3 Zero Accident... pilih senjatamu!',
    'Malam santai di Gazebo K3 paling pas adu taktik Suwit!',
    'Buktikan siapa juara Suwit Gazebo PrepLab sesungguhnya!'
  ],
  suspense: [
    'Hmm... membaca strategi lawan... 🤔',
    'Batu... Gunting... Kertas... SUWIT!',
    'Insting siapa yang lebih cepat dan tepat?! ⚡'
  ],
  win: [
    'Luar biasa! Pilihanmu tepat sasaran! 🎉',
    'Hebat, Ranger! Poin kemenangan berhasil kau rebut!',
    'Insting samplingmu sungguh presisi malam ini!',
    'Kombinasi mantap! Satu langkah lebih dekat membuka rahasia bunker!'
  ],
  lose: [
    'Hahaha kena deh! Jangan patah semangat, ayo coba lagi!',
    'Strategi lawan ternyata lebih unggul! Rematch!',
    'Lawan membaca gerakanmu! Coba variasi pilihan lain!'
  ],
  draw: [
    'Loh?! Pilihan kita sama persis! Seirama seperti SOP Lab! 🤝',
    'Seri! Tidak ada yang kalah dan tidak ada yang menang, ayo gas lagi!',
    'Pikiran rekan satu shift memang selalu kompak! Seri!'
  ]
};

// 8-Bit Retro GBA Web Audio Synthesizer
function playRpsAudio(type: 'select' | 'suspense' | 'win' | 'lose' | 'draw' | 'unlock') {
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
      const notes = [523.25, 659.25, 783.99, 1046.50];
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
      const notes = [440, 415.3, 392, 349.2];
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

export const LoungePvPRpsModal: React.FC<LoungePvPRpsModalProps> = ({
  isOpen,
  onClose,
  playerName,
  opponentName = 'Rekan Shift Gazebo',
  opponentAvatar,
  opponentPangkat = 'Personnel',
  onFinishGame,
  onUnlockCutscene,
  soundEnabled = true,
  isSecretHoleUnlocked = false
}) => {
  const [phase, setPhase] = useState<'READY' | 'SUSPENSE' | 'REVEAL'>('READY');
  const [playerChoice, setPlayerChoice] = useState<RpsChoice | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<RpsChoice | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [dialogText, setDialogText] = useState<string>('');
  const [soundOn, setSoundOn] = useState<boolean>(soundEnabled);

  // Persistent PvP Wins Tracking
  const [pvpWins, setPvpWins] = useState<number>(() => {
    try {
      const val = localStorage.getItem('preplab_lounge_pvp_rps_wins');
      return val ? Math.max(0, parseInt(val, 10) || 0) : 0;
    } catch {}
    return 0;
  });

  useEffect(() => {
    if (isOpen) {
      setPhase('READY');
      setPlayerChoice(null);
      setOpponentChoice(null);
      setGameResult(null);
      const quotes = PVP_QUOTES.ready;
      setDialogText(quotes[Math.floor(Math.random() * quotes.length)]);
    }
  }, [isOpen]);

  const handlePlaySound = (type: 'select' | 'suspense' | 'win' | 'lose' | 'draw' | 'unlock') => {
    if (soundOn) playRpsAudio(type);
  };

  const handleSelectChoice = (choice: RpsChoice) => {
    if (phase !== 'READY') return;

    setPlayerChoice(choice);
    setPhase('SUSPENSE');
    handlePlaySound('select');

    const susQuotes = PVP_QUOTES.suspense;
    setDialogText(susQuotes[Math.floor(Math.random() * susQuotes.length)]);
    handlePlaySound('suspense');

    // Suspense countdown: 1.2 seconds
    setTimeout(() => {
      // Opponent pick (fair 33.3% random selection)
      const choices: RpsChoice[] = ['rock', 'paper', 'scissors'];
      const opponentPick = choices[Math.floor(Math.random() * choices.length)];
      setOpponentChoice(opponentPick);

      let res: GameResult = 'draw';
      if (choice === opponentPick) {
        res = 'draw';
      } else if (
        (choice === 'rock' && opponentPick === 'scissors') ||
        (choice === 'paper' && opponentPick === 'rock') ||
        (choice === 'scissors' && opponentPick === 'paper')
      ) {
        res = 'win';
      } else {
        res = 'lose';
      }

      setGameResult(res);
      setPhase('REVEAL');

      if (res === 'win') {
        const winQ = PVP_QUOTES.win;
        setDialogText(winQ[Math.floor(Math.random() * winQ.length)]);
        handlePlaySound('win');

        const newWins = pvpWins + 1;
        setPvpWins(newWins);
        try {
          localStorage.setItem('preplab_lounge_pvp_rps_wins', String(newWins));
        } catch {}

        // Check if 5th win reached!
        if (newWins >= 5 && !isSecretHoleUnlocked) {
          setTimeout(() => {
            if (onUnlockCutscene) onUnlockCutscene();
          }, 1500);
        }
      } else if (res === 'lose') {
        const loseQ = PVP_QUOTES.lose;
        setDialogText(loseQ[Math.floor(Math.random() * loseQ.length)]);
        handlePlaySound('lose');
      } else {
        const drawQ = PVP_QUOTES.draw;
        setDialogText(drawQ[Math.floor(Math.random() * drawQ.length)]);
        handlePlaySound('draw');
      }

      if (onFinishGame) {
        onFinishGame(res, choice, opponentPick);
      }
    }, 1200);
  };

  const handleResetRound = () => {
    handlePlaySound('select');
    setPhase('READY');
    setPlayerChoice(null);
    setOpponentChoice(null);
    setGameResult(null);
    const quotes = PVP_QUOTES.ready;
    setDialogText(quotes[Math.floor(Math.random() * quotes.length)]);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-slate-950 border-2 border-emerald-500/50 text-slate-100 shadow-[0_0_50px_rgba(16,185,129,0.3)] overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-3 border-b border-emerald-500/30 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">✌️</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-400">
                  Duel Suwit K3 Gazebo
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono font-bold border border-emerald-700/60 flex items-center gap-1">
                  <Award className="w-2.5 h-2.5" />
                  Kemenangan: {Math.min(5, pvpWins)} / 5
                </span>
              </div>
              <h3 className="text-sm font-black text-white">
                Batu Limonite, Gunting Sampling & Kertas Sertifikat
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundOn(!soundOn)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title={soundOn ? 'Matikan Suara' : 'Nyalakan Suara'}
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Duel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── BATTLE ARENA (2 PLAYERS) ── */}
        <div className="p-4 sm:p-5 flex flex-col items-center gap-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          
          {/* Opponent & Player Header Arena */}
          <div className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
            {/* Player You */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-center text-lg">
                🧑‍🔬
              </div>
              <div>
                <span className="text-xs font-black text-white block">{playerName}</span>
                <span className="text-[10px] text-emerald-400 font-mono">ANDA</span>
              </div>
            </div>

            <div className="text-center font-mono font-black text-xs text-amber-400 px-3 py-1 bg-amber-950/60 rounded-xl border border-amber-500/40">
              VS
            </div>

            {/* Opponent */}
            <div className="flex items-center gap-2 text-right">
              <div>
                <span className="text-xs font-black text-white block truncate max-w-[120px]">{opponentName}</span>
                <span className="text-[10px] text-slate-400 font-mono">{opponentPangkat}</span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-500/60 flex items-center justify-center text-lg overflow-hidden">
                {renderAvatarNode(opponentAvatar, '👷', 'w-9 h-9')}
              </div>
            </div>
          </div>

          {/* Dialog Bubble */}
          <div className="w-full p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs sm:text-sm font-medium text-center shadow-inner">
            💬 {dialogText}
          </div>

          {/* Reveal Center Stage */}
          <div className="w-full flex items-center justify-center gap-6 sm:gap-10 py-3 min-h-[90px]">
            {/* Player Choice */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono text-slate-400">PILIHAN ANDA</span>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 border-2 border-emerald-400 flex items-center justify-center text-3xl sm:text-4xl shadow-lg">
                {playerChoice ? (
                  CHOICES.find(c => c.id === playerChoice)?.icon
                ) : (
                  <span className="text-slate-600">?</span>
                )}
              </div>
              <span className="text-[11px] font-bold text-emerald-300">
                {playerChoice ? CHOICES.find(c => c.id === playerChoice)?.label.split(' ')[0] : '...'}
              </span>
            </div>

            {/* Center Status / Result Banner */}
            <div className="flex flex-col items-center">
              {phase === 'SUSPENSE' && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xl animate-spin">⚡</span>
                  <span className="text-[10px] font-mono text-amber-300 animate-pulse font-bold">SUWIT!</span>
                </div>
              )}
              {phase === 'REVEAL' && gameResult && (
                <div className="flex flex-col items-center gap-1 animate-in zoom-in-75">
                  <span className={`text-xs sm:text-sm font-black px-3 py-1 rounded-xl border ${
                    gameResult === 'win'
                      ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                      : gameResult === 'lose'
                      ? 'bg-rose-500/30 text-rose-300 border-rose-400'
                      : 'bg-amber-500/30 text-amber-300 border-amber-400'
                  }`}>
                    {gameResult === 'win' ? 'MENANG! 🎉' : gameResult === 'lose' ? 'KALAH! 💥' : 'SERI! 🤝'}
                  </span>
                </div>
              )}
            </div>

            {/* Opponent Choice */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-mono text-slate-400">PILIHAN LAWAN</span>
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 border-2 border-purple-400 flex items-center justify-center text-3xl sm:text-4xl shadow-lg">
                {phase === 'REVEAL' && opponentChoice ? (
                  CHOICES.find(c => c.id === opponentChoice)?.icon
                ) : phase === 'SUSPENSE' ? (
                  <span className="animate-pulse text-purple-300">✊</span>
                ) : (
                  <span className="text-slate-600">?</span>
                )}
              </div>
              <span className="text-[11px] font-bold text-purple-300">
                {phase === 'REVEAL' && opponentChoice
                  ? CHOICES.find(c => c.id === opponentChoice)?.label.split(' ')[0]
                  : '...'}
              </span>
            </div>
          </div>

          {/* Action Choice Buttons */}
          {phase === 'READY' ? (
            <div className="w-full grid grid-cols-3 gap-2 sm:gap-3">
              {CHOICES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectChoice(c.id)}
                  className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 bg-gradient-to-b ${c.color} ${c.border}`}
                >
                  <span className="text-3xl sm:text-4xl">{c.icon}</span>
                  <span className="text-xs font-black text-white">{c.label}</span>
                  <span className="text-[9px] text-slate-300 text-center hidden sm:block">{c.desc}</span>
                </button>
              ))}
            </div>
          ) : phase === 'REVEAL' ? (
            <div className="w-full flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleResetRound}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Tanding Lagi
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Selesai
              </button>
            </div>
          ) : null}

          {/* Secret Trapdoor Unlock Progress Bar */}
          <div className="w-full mt-2 p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span>🪜 Status Pintu Rahasia Lantai:</span>
              {pvpWins >= 5 || isSecretHoleUnlocked ? (
                <span className="text-emerald-400 font-bold">TERBUKA BEBAS!</span>
              ) : (
                <span className="text-amber-400 font-bold">Butuh {Math.max(0, 5 - pvpWins)} Kemenangan Lagi</span>
              )}
            </span>
            <div className="w-24 h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
              <div
                className="h-full bg-emerald-400 transition-all duration-300"
                style={{ width: `${Math.min(100, (pvpWins / 5) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
