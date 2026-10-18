import React, { useState, useEffect } from 'react';
import { X, Award, RotateCcw, Volume2, VolumeX, ShieldAlert, Users, Clock } from 'lucide-react';
import { renderAvatarNode } from './SecretDominoLoungeModal';
import { getGlobalSocket } from '../../../lib/socketClient';

export type RpsChoice = 'rock' | 'paper' | 'scissors';
export type GameResult = 'win' | 'lose' | 'draw';

export interface LoungePvPRpsModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchId: string | null;
  playerNik: string;
  playerName: string;
  playerAvatar?: string;
  playerPangkat?: string;
  opponentNik?: string;
  opponentName?: string;
  opponentAvatar?: string;
  opponentPangkat?: string;
  isHost?: boolean;
  initialRound?: number;
  initialP1Score?: number;
  initialP2Score?: number;
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
    'Ayo Ranger! Tunjukkan insting sampling terbaikmu melawan rekanmu!',
    'Duel online Suwit K3 Gazebo! Siapa kalah seduh kopi shift berikutnya!',
    'Pikiran tajam, konsentrasi K3 Zero Accident... pilih senjatamu!',
    'Malam santai di Gazebo K3 paling pas adu taktik Suwit antar rekan!',
    'Buktikan siapa juara Suwit Gazebo PrepLab sesungguhnya!'
  ],
  waiting: [
    'Pilihanmu tersimpan! Menunggu rekan menyelesaikan pilihannya... ⏳',
    'Strategi terkunci rapi di amplop tertutup! Menunggu lawan...',
    'Taktik sudah dipasang! Siapakah yang instingnya paling jitu?!'
  ],
  win: [
    'Luar biasa! Pilihanmu tepat sasaran mengalahkan lawan! 🎉',
    'Hebat, Ranger! Poin kemenangan duel online berhasil kau rebut!',
    'Insting samplingmu sungguh presisi malam ini!',
    'Kombinasi mantap! Satu langkah lebih dekat membuka rahasia bunker!'
  ],
  lose: [
    'Hahaha kena deh! Taktik lawan lebih unggul, ayo balas di ronde berikutnya!',
    'Strategi lawan ternyata lebih unggul! Rematch!',
    'Lawan membaca gerakanmu! Coba ubah pola di ronde berikutnya!'
  ],
  draw: [
    'Loh?! Pilihan kalian sama persis! Seirama seperti SOP Lab! 🤝',
    'Seri! Tidak ada yang kalah dan menang, ayo duel ronde lagi!',
    'Pikiran rekan satu shift memang selalu kompak! Seri!'
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
  matchId,
  playerNik,
  playerName,
  playerAvatar,
  playerPangkat = 'Personnel',
  opponentNik,
  opponentName = 'Rekan Online',
  opponentAvatar,
  opponentPangkat = 'Personnel',
  isHost = true,
  initialRound = 1,
  initialP1Score = 0,
  initialP2Score = 0,
  onFinishGame,
  onUnlockCutscene,
  soundEnabled = true,
  isSecretHoleUnlocked = false
}) => {
  const [phase, setPhase] = useState<'READY' | 'WAITING' | 'REVEAL'>('READY');
  const [playerChoice, setPlayerChoice] = useState<RpsChoice | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<RpsChoice | null>(null);
  const [opponentHasChosen, setOpponentHasChosen] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [dialogText, setDialogText] = useState<string>('');
  const [soundOn, setSoundOn] = useState<boolean>(soundEnabled);
  const [currentRound, setCurrentRound] = useState<number>(initialRound);
  const [myScore, setMyScore] = useState<number>(isHost ? initialP1Score : initialP2Score);
  const [oppScore, setOppScore] = useState<number>(isHost ? initialP2Score : initialP1Score);
  const [matchEndedReason, setMatchEndedReason] = useState<string | null>(null);

  // Persistent PvP Wins Tracking (accumulated from real online victories)
  const [pvpWins, setPvpWins] = useState<number>(() => {
    try {
      const val = localStorage.getItem('preplab_lounge_pvp_rps_wins');
      return val ? Math.max(0, parseInt(val, 10) || 0) : 0;
    } catch {}
    return 0;
  });

  const handlePlaySound = (type: 'select' | 'suspense' | 'win' | 'lose' | 'draw') => {
    if (soundOn) playRpsAudio(type);
  };

  // Reset initial modal state when opening
  useEffect(() => {
    if (isOpen) {
      setPhase('READY');
      setPlayerChoice(null);
      setOpponentChoice(null);
      setOpponentHasChosen(false);
      setGameResult(null);
      setMatchEndedReason(null);
      setCurrentRound(initialRound);
      setMyScore(isHost ? initialP1Score : initialP2Score);
      setOppScore(isHost ? initialP2Score : initialP1Score);
      const quotes = PVP_QUOTES.ready;
      setDialogText(quotes[Math.floor(Math.random() * quotes.length)]);
    }
  }, [isOpen, matchId, initialRound, initialP1Score, initialP2Score, isHost]);

  // Socket.IO event subscribers for multiplayer synchronization
  useEffect(() => {
    if (!isOpen || !matchId) return;

    const socket = getGlobalSocket();

    const handleOpponentChose = (data: { matchId: string }) => {
      if (data.matchId !== matchId) return;
      setOpponentHasChosen(true);
      if (playerChoice) {
        setDialogText('Kedua pemain telah menentukan pilihan! Menghitung pemenang... ⚡');
      } else {
        setDialogText(`${opponentName} sudah menentukan pilihannya! Ayo giliranmu menentukan pilihan! ⚡`);
      }
    };

    const handleRoundResult = (data: {
      matchId: string;
      player1Choice: RpsChoice;
      player2Choice: RpsChoice;
      winner: 'player1' | 'player2' | 'draw';
      p1Score: number;
      p2Score: number;
      round: number;
    }) => {
      if (data.matchId !== matchId) return;

      const myPick = isHost ? data.player1Choice : data.player2Choice;
      const oppPick = isHost ? data.player2Choice : data.player1Choice;
      const newMyScore = isHost ? data.p1Score : data.p2Score;
      const newOppScore = isHost ? data.p2Score : data.p1Score;

      setPlayerChoice(myPick);
      setOpponentChoice(oppPick);
      setMyScore(newMyScore);
      setOppScore(newOppScore);
      setCurrentRound(data.round);

      let result: GameResult = 'draw';
      if (data.winner === 'draw') {
        result = 'draw';
      } else if ((isHost && data.winner === 'player1') || (!isHost && data.winner === 'player2')) {
        result = 'win';
      } else {
        result = 'lose';
      }

      setGameResult(result);
      setPhase('REVEAL');

      if (result === 'win') {
        const winQ = PVP_QUOTES.win;
        setDialogText(winQ[Math.floor(Math.random() * winQ.length)]);
        handlePlaySound('win');

        const newWins = pvpWins + 1;
        setPvpWins(newWins);
        try {
          localStorage.setItem('preplab_lounge_pvp_rps_wins', String(newWins));
        } catch {}

        if (newWins >= 5 && !isSecretHoleUnlocked) {
          setTimeout(() => {
            if (onUnlockCutscene) onUnlockCutscene();
          }, 1500);
        }
      } else if (result === 'lose') {
        const loseQ = PVP_QUOTES.lose;
        setDialogText(loseQ[Math.floor(Math.random() * loseQ.length)]);
        handlePlaySound('lose');
      } else {
        const drawQ = PVP_QUOTES.draw;
        setDialogText(drawQ[Math.floor(Math.random() * drawQ.length)]);
        handlePlaySound('draw');
      }

      if (onFinishGame) {
        onFinishGame(result, myPick, oppPick);
      }
    };

    const handleRoundStarted = (data: {
      matchId: string;
      round: number;
      p1Score: number;
      p2Score: number;
    }) => {
      if (data.matchId !== matchId) return;
      setPhase('READY');
      setPlayerChoice(null);
      setOpponentChoice(null);
      setOpponentHasChosen(false);
      setGameResult(null);
      setCurrentRound(data.round);
      setMyScore(isHost ? data.p1Score : data.p2Score);
      setOppScore(isHost ? data.p2Score : data.p1Score);
      const quotes = PVP_QUOTES.ready;
      setDialogText(quotes[Math.floor(Math.random() * quotes.length)]);
      handlePlaySound('select');
    };

    const handleMatchEnded = (data: { reason?: string }) => {
      setMatchEndedReason(data.reason || 'Pertandingan telah selesai.');
      setDialogText(data.reason || 'Rekan telah meninggalkan duel.');
    };

    socket.on('rps:opponent_chose', handleOpponentChose);
    socket.on('rps:round_result', handleRoundResult);
    socket.on('rps:round_started', handleRoundStarted);
    socket.on('rps:match_ended', handleMatchEnded);

    return () => {
      socket.off('rps:opponent_chose', handleOpponentChose);
      socket.off('rps:round_result', handleRoundResult);
      socket.off('rps:round_started', handleRoundStarted);
      socket.off('rps:match_ended', handleMatchEnded);
    };
  }, [isOpen, matchId, isHost, opponentName, playerChoice, pvpWins, isSecretHoleUnlocked, onUnlockCutscene, onFinishGame]);

  const handleSelectChoice = (choice: RpsChoice) => {
    if (phase !== 'READY' || !matchId) return;

    setPlayerChoice(choice);
    setPhase('WAITING');
    handlePlaySound('select');

    if (opponentHasChosen) {
      setDialogText('Pilihanmu tersimpan! Menghitung pemenang... ⚡');
    } else {
      const waitQuotes = PVP_QUOTES.waiting;
      setDialogText(waitQuotes[Math.floor(Math.random() * waitQuotes.length)]);
    }

    const socket = getGlobalSocket();
    if (socket.connected) {
      socket.emit('rps:make_choice', {
        matchId,
        nik: playerNik,
        choice
      });
    }
  };

  const handleRequestNextRound = () => {
    if (!matchId) return;
    handlePlaySound('select');
    setDialogText('Mengajak rekan untuk ronde berikutnya... ⏳');
    const socket = getGlobalSocket();
    if (socket.connected) {
      socket.emit('rps:next_round', { matchId });
    }
  };

  const handleLeaveMatch = () => {
    if (matchId) {
      const socket = getGlobalSocket();
      if (socket.connected) {
        socket.emit('rps:leave', { matchId });
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  // Strict Online Enforcement Barrier
  if (!matchId) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in">
        <div className="w-full max-w-md rounded-3xl bg-slate-950 border-2 border-rose-500/60 p-6 text-center text-slate-100 shadow-[0_0_40px_rgba(244,63,94,0.3)]">
          <div className="w-14 h-14 rounded-2xl bg-rose-950 border border-rose-500/50 flex items-center justify-center text-3xl mx-auto mb-3">
            <ShieldAlert className="w-8 h-8 text-rose-400" />
          </div>
          <h3 className="text-base font-black text-white mb-2">Suwit Hanya Antar User Online</h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-5">
            Permainan Suwit tidak dapat dimainkan secara offline atau melawan bot. Anda harus menantang rekan yang sedang aktif online di Tempat Nongkrong & Gazebo K3!
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Kembali ke Gazebo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-200"
      onClick={handleLeaveMatch}
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
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <Users className="w-3 h-3 text-emerald-400" /> Duel Online Suwit K3 Gazebo
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono font-bold border border-emerald-700/60 flex items-center gap-1">
                  <Award className="w-2.5 h-2.5" />
                  Kemenangan Total: {Math.min(5, pvpWins)} / 5
                </span>
              </div>
              <h3 className="text-sm font-black text-white">
                Ronde #{currentRound} &bull; Batu Limonite, Gunting Sampling & Kertas Sertifikat
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
              onClick={handleLeaveMatch}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Keluar Duel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── BATTLE ARENA (2 PLAYERS ONLINE) ── */}
        <div className="p-4 sm:p-5 flex flex-col items-center gap-4 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          
          {/* Opponent & Player Header Arena with Live Scores */}
          <div className="w-full flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-inner">
            {/* Player (You) */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/60 flex items-center justify-center text-lg overflow-hidden">
                {renderAvatarNode(playerAvatar, '🧑‍🔬', 'w-10 h-10')}
              </div>
              <div>
                <span className="text-xs font-black text-white block">{playerName}</span>
                <span className="text-[10px] text-emerald-400 font-mono">ANDA ({playerPangkat})</span>
                <div className="text-[11px] font-mono font-bold text-emerald-300">Skor: {myScore}</div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-0.5">
              <span className="text-center font-mono font-black text-xs text-amber-400 px-3 py-1 bg-amber-950/60 rounded-xl border border-amber-500/40">
                VS
              </span>
              <span className="text-[9px] font-mono text-slate-400">Ronde {currentRound}</span>
            </div>

            {/* Opponent (Real Online Peer) */}
            <div className="flex items-center gap-2.5 text-right">
              <div>
                <span className="text-xs font-black text-white block truncate max-w-[130px]">{opponentName}</span>
                <span className="text-[10px] text-purple-300 font-mono">{opponentPangkat}</span>
                <div className="text-[11px] font-mono font-bold text-purple-300">Skor: {oppScore}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-500/60 flex items-center justify-center text-lg overflow-hidden">
                {renderAvatarNode(opponentAvatar, '👷', 'w-10 h-10')}
              </div>
            </div>
          </div>

          {/* Match Disconnect Notice (if opponent left) */}
          {matchEndedReason && (
            <div className="w-full p-2.5 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs font-bold text-center">
              ⚠️ {matchEndedReason}
            </div>
          )}

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
              {phase === 'WAITING' && (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xl animate-spin">⚡</span>
                  <span className="text-[10px] font-mono text-amber-300 animate-pulse font-bold">
                    {opponentHasChosen ? 'MENGHITUNG...' : 'MENUNGGU REKAN...'}
                  </span>
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
                ) : opponentHasChosen ? (
                  <span className="text-emerald-400 text-2xl font-black">✓</span>
                ) : (
                  <span className="text-slate-600">?</span>
                )}
              </div>
              <span className="text-[11px] font-bold text-purple-300">
                {phase === 'REVEAL' && opponentChoice
                  ? CHOICES.find(c => c.id === opponentChoice)?.label.split(' ')[0]
                  : opponentHasChosen
                  ? 'Sudah Memilih'
                  : 'Memilih...'}
              </span>
            </div>
          </div>

          {/* Action Choice Buttons */}
          {phase === 'READY' && !matchEndedReason ? (
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
          ) : phase === 'REVEAL' && !matchEndedReason ? (
            <div className="w-full flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleRequestNextRound}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" /> Tanding Ronde Berikutnya
              </button>
              <button
                type="button"
                onClick={handleLeaveMatch}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Selesai
              </button>
            </div>
          ) : matchEndedReason ? (
            <div className="w-full flex items-center justify-center">
              <button
                type="button"
                onClick={handleLeaveMatch}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs sm:text-sm transition-colors cursor-pointer"
              >
                Tutup Pertandingan
              </button>
            </div>
          ) : null}

          {/* Secret Trapdoor Unlock Progress Bar (Earned from real online matches) */}
          <div className="w-full mt-2 p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 flex items-center gap-1.5">
              <span>🪜 Status Pintu Rahasia Lantai:</span>
              {pvpWins >= 5 || isSecretHoleUnlocked ? (
                <span className="text-emerald-400 font-bold">TERBUKA BEBAS!</span>
              ) : (
                <span className="text-amber-400 font-bold">Butuh {Math.max(0, 5 - pvpWins)} Kemenangan Online Lagi</span>
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
