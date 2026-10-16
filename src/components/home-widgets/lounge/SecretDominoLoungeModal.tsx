import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Trophy, Volume2, VolumeX, Sparkles, RotateCcw, ArrowLeft, ArrowRight, ShieldAlert, Award } from 'lucide-react';

export interface DominoTile {
  id: string;
  left: number;
  right: number;
}

export interface PlacedChainTile {
  id: string;
  val1: number; // Left/Inward half
  val2: number; // Right/Outward half
  isBalak: boolean;
  playedBy: string;
}

export interface DominoPlayer {
  id: string;
  name: string;
  title: string;
  avatar: string;
  hand: DominoTile[];
  isBot: boolean;
}

interface SecretDominoLoungeModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  soundEnabled?: boolean;
}

// 28 Standard Indonesian Domino (Gaple) Tiles
const ALL_DOMINO_TILES: DominoTile[] = [
  { id: '0-0', left: 0, right: 0 },
  { id: '0-1', left: 0, right: 1 },
  { id: '0-2', left: 0, right: 2 },
  { id: '0-3', left: 0, right: 3 },
  { id: '0-4', left: 0, right: 4 },
  { id: '0-5', left: 0, right: 5 },
  { id: '0-6', left: 0, right: 6 },
  { id: '1-1', left: 1, right: 1 },
  { id: '1-2', left: 1, right: 2 },
  { id: '1-3', left: 1, right: 3 },
  { id: '1-4', left: 1, right: 4 },
  { id: '1-5', left: 1, right: 5 },
  { id: '1-6', left: 1, right: 6 },
  { id: '2-2', left: 2, right: 2 },
  { id: '2-3', left: 2, right: 3 },
  { id: '2-4', left: 2, right: 4 },
  { id: '2-5', left: 2, right: 5 },
  { id: '2-6', left: 2, right: 6 },
  { id: '3-3', left: 3, right: 3 },
  { id: '3-4', left: 3, right: 4 },
  { id: '3-5', left: 3, right: 5 },
  { id: '3-6', left: 3, right: 6 },
  { id: '4-4', left: 4, right: 4 },
  { id: '4-5', left: 4, right: 5 },
  { id: '4-6', left: 4, right: 6 },
  { id: '5-5', left: 5, right: 5 },
  { id: '5-6', left: 5, right: 6 },
  { id: '6-6', left: 6, right: 6 }
];

// Web Audio API Synthesizer for Realistic Domino Tile Sounds
function playDominoAudio(type: 'clack' | 'pass' | 'win' | 'deal' | 'click') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'clack') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.05);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'deal') {
      [420, 520, 620].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.03, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (idx + 1) * 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + (idx + 1) * 0.04);
      });
    } else if (type === 'pass') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'win') {
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, now + i * 0.09);
        gain.gain.setValueAtTime(0.07, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.22);
      });
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch {}
}

// Render Red Domino Pips for One Half (0 to 6 dots)
export const DominoHalfPips: React.FC<{ value: number; size?: 'sm' | 'md' }> = ({ value, size = 'md' }) => {
  const dotSize = size === 'sm' ? 'w-1 h-1' : 'w-1.5 h-1.5';

  return (
    <div className={`relative flex items-center justify-center ${size === 'sm' ? 'w-4 h-4' : 'w-6 h-6'}`}>
      {value === 1 && (
        <div className={`${dotSize} rounded-full bg-red-600 shadow-sm`} />
      )}
      {value === 2 && (
        <>
          <div className={`absolute top-0.5 left-0.5 ${dotSize} rounded-full bg-red-600`} />
          <div className={`absolute bottom-0.5 right-0.5 ${dotSize} rounded-full bg-red-600`} />
        </>
      )}
      {value === 3 && (
        <>
          <div className={`absolute top-0.5 left-0.5 ${dotSize} rounded-full bg-red-600`} />
          <div className={`${dotSize} rounded-full bg-red-600`} />
          <div className={`absolute bottom-0.5 right-0.5 ${dotSize} rounded-full bg-red-600`} />
        </>
      )}
      {value === 4 && (
        <>
          <div className={`absolute top-0.5 left-0.5 ${dotSize} rounded-full bg-red-600`} />
          <div className={`absolute top-0.5 right-0.5 ${dotSize} rounded-full bg-red-600`} />
          <div className={`absolute bottom-0.5 left-0.5 ${dotSize} rounded-full bg-red-600`} />
          <div className={`absolute bottom-0.5 right-0.5 ${dotSize} rounded-full bg-red-600`} />
        </>
      )}
      {value === 5 && (
        <>
          <div className={`absolute top-0.5 left-0.5 ${dotSize} rounded-full bg-red-600`} />
          <div className={`absolute top-0.5 right-0.5 ${dotSize} rounded-full bg-red-600`} />
          <div className={`${dotSize} rounded-full bg-red-600`} />
          <div className={`absolute bottom-0.5 left-0.5 ${dotSize} rounded-full bg-red-600`} />
          <div className={`absolute bottom-0.5 right-0.5 ${dotSize} rounded-full bg-red-600`} />
        </>
      )}
      {value === 6 && (
        <>
          <div className={`absolute top-0.5 left-0.5 ${dotSize} rounded-full bg-red-600`} />
          <div className={`absolute top-0.5 right-0.5 ${dotSize} rounded-full bg-red-600`} />
          <div className={`absolute top-1/2 -translate-y-1/2 left-0.5 ${dotSize} rounded-full bg-red-600`} />
          <div className={`absolute top-1/2 -translate-y-1/2 right-0.5 ${dotSize} rounded-full bg-red-600`} />
          <div className={`absolute bottom-0.5 left-0.5 ${dotSize} rounded-full bg-red-600`} />
          <div className={`absolute bottom-0.5 right-0.5 ${dotSize} rounded-full bg-red-600`} />
        </>
      )}
    </div>
  );
};

export const SecretDominoLoungeModal: React.FC<SecretDominoLoungeModalProps> = ({
  isOpen,
  onClose,
  playerName,
  soundEnabled = true
}) => {
  const [players, setPlayers] = useState<DominoPlayer[]>([]);
  const [boardChain, setBoardChain] = useState<PlacedChainTile[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [consecutivePasses, setConsecutivePasses] = useState<number>(0);
  const [gameAnnouncement, setGameAnnouncement] = useState<string>('Tekan Mulai untuk membagikan kartu Gaple.');
  const [soundOn, setSoundOn] = useState<boolean>(soundEnabled);
  const [pendingChoiceTile, setPendingChoiceTile] = useState<DominoTile | null>(null);

  const playSfx = useCallback((type: 'clack' | 'pass' | 'win' | 'deal' | 'click') => {
    if (soundOn) playDominoAudio(type);
  }, [soundOn]);

  // Open Ends of the chain
  const openEnds = useMemo(() => {
    if (boardChain.length === 0) return null;
    return {
      left: boardChain[0].val1,
      right: boardChain[boardChain.length - 1].val2
    };
  }, [boardChain]);

  // Serpentine Snake Path with authentic 90-degree corner connectors
  const serpentineRows = useMemo(() => {
    if (boardChain.length === 0) return [];

    const MAX_TILES_PER_ROW = 5;
    const rows: {
      direction: 'ltr' | 'rtl';
      tiles: PlacedChainTile[];
      cornerAfter?: PlacedChainTile;
    }[] = [];

    let i = 0;
    let rowCount = 0;

    while (i < boardChain.length) {
      const direction: 'ltr' | 'rtl' = rowCount % 2 === 0 ? 'ltr' : 'rtl';
      const tiles: PlacedChainTile[] = [];

      for (let j = 0; j < MAX_TILES_PER_ROW && i < boardChain.length; j++) {
        tiles.push(boardChain[i]);
        i++;
      }

      let cornerAfter: PlacedChainTile | undefined = undefined;
      // If there are still more tiles, the very next tile acts as the 90° corner bend!
      if (i < boardChain.length) {
        cornerAfter = boardChain[i];
        i++;
      }

      rows.push({ direction, tiles, cornerAfter });
      rowCount++;
    }

    return rows;
  }, [boardChain]);

  // Check if tile is playable on ends
  const getPlayableSides = useCallback((tile: DominoTile, ends: { left: number; right: number } | null) => {
    if (!ends) return { canLeft: true, canRight: true };
    const canLeft = tile.left === ends.left || tile.right === ends.left;
    const canRight = tile.left === ends.right || tile.right === ends.right;
    return { canLeft, canRight };
  }, []);

  // Initialize and Deal Round
  const startNewGame = useCallback(() => {
    playSfx('deal');
    const shuffled = [...ALL_DOMINO_TILES].sort(() => Math.random() - 0.5);

    const initialPlayers: DominoPlayer[] = [
      {
        id: 'p1',
        name: playerName,
        title: 'Ranger',
        avatar: '👷',
        isBot: false,
        hand: shuffled.slice(0, 7)
      },
      {
        id: 'p2',
        name: 'Mba Hantu',
        title: 'Hantu Pojok',
        avatar: '👻',
        isBot: true,
        hand: shuffled.slice(7, 14)
      },
      {
        id: 'p3',
        name: 'Mas Pulverizer',
        title: 'Operator Mill',
        avatar: '🔨',
        isBot: true,
        hand: shuffled.slice(14, 21)
      },
      {
        id: 'p4',
        name: 'Pak Mandor',
        title: 'Pengawas K3',
        avatar: '📋',
        isBot: true,
        hand: shuffled.slice(21, 28)
      }
    ];

    // Find who holds the highest balak (6-6 > 5-5 > 4-4 ...) to start the game
    let starterIdx = 0;
    let highestBalakVal = -1;

    initialPlayers.forEach((p, pIdx) => {
      p.hand.forEach(t => {
        if (t.left === t.right && t.left > highestBalakVal) {
          highestBalakVal = t.left;
          starterIdx = pIdx;
        }
      });
    });

    setPlayers(initialPlayers);
    setBoardChain([]);
    setCurrentTurnIndex(starterIdx);
    setConsecutivePasses(0);
    setRoundWinner(null);
    setPendingChoiceTile(null);
    setIsPlaying(true);

    const starter = initialPlayers[starterIdx];
    if (highestBalakVal >= 0) {
      setGameAnnouncement(`${starter.name} memegang Balak [${highestBalakVal}|${highestBalakVal}] dan berhak membuka putaran!`);
    } else {
      setGameAnnouncement(`Putaran dimulai! Giliran pertama: ${starter.name}`);
    }
  }, [playerName, playSfx]);

  // Execute Placing a Tile on Left or Right
  const placeTileOnChain = useCallback((tile: DominoTile, side: 'left' | 'right', playerIdx: number) => {
    playSfx('clack');
    const isBalak = tile.left === tile.right;
    const player = players[playerIdx];

    setBoardChain(prev => {
      if (prev.length === 0) {
        // First tile placed in center
        return [{
          id: `${tile.id}-${Date.now()}`,
          val1: tile.left,
          val2: tile.right,
          isBalak,
          playedBy: player.name
        }];
      }

      const currentLeft = prev[0].val1;
      const currentRight = prev[prev.length - 1].val2;

      if (side === 'left') {
        // Tile connects to left. The matching half touches currentLeft (becomes val2 of new head)
        let val1 = tile.left;
        let val2 = tile.right;
        if (tile.right === currentLeft) {
          val1 = tile.left;
          val2 = tile.right;
        } else {
          val1 = tile.right;
          val2 = tile.left;
        }
        return [{
          id: `${tile.id}-${Date.now()}`,
          val1,
          val2,
          isBalak,
          playedBy: player.name
        }, ...prev];
      } else {
        // Tile connects to right. The matching half touches currentRight (becomes val1 of new tail)
        let val1 = tile.left;
        let val2 = tile.right;
        if (tile.left === currentRight) {
          val1 = tile.left;
          val2 = tile.right;
        } else {
          val1 = tile.right;
          val2 = tile.left;
        }
        return [...prev, {
          id: `${tile.id}-${Date.now()}`,
          val1,
          val2,
          isBalak,
          playedBy: player.name
        }];
      }
    });

    // Remove tile from player's hand
    const nextHand = player.hand.filter(t => t.id !== tile.id);
    setPlayers(prev => prev.map((p, idx) => idx === playerIdx ? { ...p, hand: nextHand } : p));
    setConsecutivePasses(0);
    setPendingChoiceTile(null);

    // Check GAPLE Win
    if (nextHand.length === 0) {
      playSfx('win');
      setRoundWinner(player.name);
      setIsPlaying(false);
      setGameAnnouncement(`🎉 GAPLEEE! ${player.name} berhasil menghabiskan semua balak dan memenangkan putaran!`);
      return;
    }

    // Advance turn
    setGameAnnouncement(`${player.name} meletakkan balak [${tile.left}|${tile.right}].`);
    setCurrentTurnIndex((playerIdx + 1) % 4);
  }, [players, playSfx]);

  // Player clicks tile in hand
  const handlePlayerTileClick = (tile: DominoTile) => {
    if (currentTurnIndex !== 0 || !isPlaying || roundWinner) return;

    if (boardChain.length === 0) {
      // First card can be placed directly
      placeTileOnChain(tile, 'left', 0);
      return;
    }

    const { canLeft, canRight } = getPlayableSides(tile, openEnds);

    if (canLeft && canRight && openEnds?.left !== openEnds?.right) {
      // Ambiguous: player must choose left or right end
      setPendingChoiceTile(tile);
      playSfx('click');
    } else if (canLeft) {
      placeTileOnChain(tile, 'left', 0);
    } else if (canRight) {
      placeTileOnChain(tile, 'right', 0);
    }
  };

  // Player Passes Turn
  const handlePassTurn = () => {
    if (currentTurnIndex !== 0 || !isPlaying || roundWinner) return;
    playSfx('pass');
    setGameAnnouncement(`${players[0].name} lewat (pass)!`);
    const nextPassCount = consecutivePasses + 1;
    setConsecutivePasses(nextPassCount);

    // If 4 consecutive passes = BUNTU / DEADLOCK!
    if (nextPassCount >= 4) {
      handleDeadlockWin();
      return;
    }

    setCurrentTurnIndex(1);
  };

  // Calculate Deadlock / Buntu Winner (Lowest Pip Total in Hand)
  const handleDeadlockWin = () => {
    playSfx('win');
    setIsPlaying(false);

    let minPips = 999;
    let winPlayer = players[0];

    players.forEach(p => {
      const sum = p.hand.reduce((acc, t) => acc + t.left + t.right, 0);
      if (sum < minPips) {
        minPips = sum;
        winPlayer = p;
      }
    });

    setRoundWinner(winPlayer.name);
    setGameAnnouncement(`⚠️ MEJA BUNTU! Semua pemain lewat berturut-turut. ${winPlayer.name} menang dengan sisa ${minPips} titik merah terendah!`);
  };

  // Bot Turn Automation Engine
  useEffect(() => {
    if (!isPlaying || roundWinner || currentTurnIndex === 0) return;

    const bot = players[currentTurnIndex];
    if (!bot || !bot.isBot) return;

    const timer = setTimeout(() => {
      if (boardChain.length === 0) {
        // Place first tile (prefer balak)
        const highestBalak = bot.hand.filter(t => t.left === t.right).sort((a, b) => b.left - a.left)[0];
        const tileToPlay = highestBalak || bot.hand[0];
        placeTileOnChain(tileToPlay, 'left', currentTurnIndex);
        return;
      }

      // Check for playable tile in bot hand
      let chosenMove: { tile: DominoTile; side: 'left' | 'right' } | null = null;

      for (const t of bot.hand) {
        const { canLeft, canRight } = getPlayableSides(t, openEnds);
        if (canLeft) {
          chosenMove = { tile: t, side: 'left' };
          break;
        }
        if (canRight) {
          chosenMove = { tile: t, side: 'right' };
          break;
        }
      }

      if (chosenMove) {
        placeTileOnChain(chosenMove.tile, chosenMove.side, currentTurnIndex);
      } else {
        // Bot Passes
        playSfx('pass');
        setGameAnnouncement(`${bot.name} tidak memiliki balak yang cocok (Lewat!).`);
        const nextPassCount = consecutivePasses + 1;
        setConsecutivePasses(nextPassCount);

        if (nextPassCount >= 4) {
          handleDeadlockWin();
          return;
        }

        setCurrentTurnIndex((currentTurnIndex + 1) % 4);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentTurnIndex, isPlaying, roundWinner, boardChain, openEnds, players, consecutivePasses, getPlayableSides, placeTileOnChain, playSfx]);

  // Check if player has valid move
  const playerHasMove = useMemo(() => {
    if (!isPlaying || boardChain.length === 0) return true;
    return players[0]?.hand.some(t => {
      const { canLeft, canRight } = getPlayableSides(t, openEnds);
      return canLeft || canRight;
    });
  }, [isPlaying, boardChain, players, openEnds, getPlayableSides]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-300 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-5xl h-[94vh] max-h-[860px] rounded-3xl bg-[#090D16] border-2 border-emerald-500/50 text-slate-100 shadow-[0_0_60px_rgba(16,185,129,0.3)] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3 border-b border-emerald-500/30 bg-slate-950/80 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/90 border border-emerald-400/60 flex items-center justify-center text-xl shadow-inner">
              🀄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-400">
                  Meja Gaple 4 Kursi
                </span>
                <span className="text-[9px] px-1.5 py-0.5 bg-purple-950/90 text-purple-300 font-bold rounded-md border border-purple-800 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> KLUB BAWAH TANAH
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
                Permainan Gaple Indonesia (Domino Titik Merah & Kereta Balak)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundOn(!soundOn)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/50 transition-colors cursor-pointer"
              title={soundOn ? 'Matikan Suara' : 'Nyalakan Suara'}
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Kembali ke Ruang Underground"
            >
              <span>🪜 Kembali ke Bunker</span>
            </button>
          </div>
        </div>

        {/* Ticker Status Bar */}
        <div className="px-5 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono z-10">
          <div className="flex items-center gap-2">
            <span className="animate-pulse text-emerald-400">●</span>
            <span className="text-slate-200 font-bold tracking-wide">
              {gameAnnouncement}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isPlaying ? (
              <button
                type="button"
                onClick={startNewGame}
                className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <span>🀄 Kocok & Bagikan Kartu</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startNewGame}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Ulang Putaran
              </button>
            )}
          </div>
        </div>

        {/* ── MAIN 4-PLAYER GREEN FELT GAPLE TABLE ── */}
        <div className="flex-1 relative flex flex-col justify-between p-3 overflow-hidden bg-[#0A1612]">
          {/* TOP PLAYER: Mas Pulverizer */}
          <div className="flex flex-col items-center z-10">
            <div className={`px-4 py-1.5 rounded-2xl border flex items-center gap-2 shadow-lg transition-all ${
              currentTurnIndex === 2 ? 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-400/50' : 'bg-slate-900/80 border-slate-700'
            }`}>
              <span className="text-lg">🔨</span>
              <div>
                <span className="text-xs font-black text-white">Mas Pulverizer</span>
                <span className="text-[10px] text-slate-400 ml-1.5">({players[2]?.hand.length || 0} kartu)</span>
              </div>
            </div>
            {/* Top Cards Back Cover */}
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: players[2]?.hand.length || 0 }).map((_, i) => (
                <div key={`p2-c-${i}`} className="w-4 h-7 rounded-sm bg-slate-800 border border-slate-600 shadow-sm" />
              ))}
            </div>
          </div>

          {/* MIDDLE ROW: Left Player, Felt Chain Table, Right Player */}
          <div className="flex-1 flex items-center justify-between px-2 gap-2 my-2 min-h-0">
            {/* LEFT PLAYER: Mba Hantu */}
            <div className="flex flex-col items-center w-28 z-10">
              <div className={`px-3 py-1.5 rounded-2xl border flex flex-col items-center gap-1 shadow-lg transition-all ${
                currentTurnIndex === 1 ? 'bg-purple-950/90 border-purple-400 ring-2 ring-purple-400/50' : 'bg-slate-900/80 border-slate-700'
              }`}>
                <span className="text-2xl">👻</span>
                <span className="text-xs font-black text-white text-center">Mba Hantu</span>
                <span className="text-[10px] text-slate-400">({players[1]?.hand.length || 0} kartu)</span>
              </div>
              <div className="flex flex-col gap-0.5 mt-2">
                {Array.from({ length: players[1]?.hand.length || 0 }).map((_, i) => (
                  <div key={`p1-c-${i}`} className="w-7 h-3 rounded-sm bg-slate-800 border border-slate-600" />
                ))}
              </div>
            </div>

            {/* ── THE FELT DOMINO CHAIN BOARD (KERETA BALAK MENYAMBUNG) ── */}
            <div className="flex-1 h-full max-h-[360px] rounded-3xl bg-[#064E3B] border-4 border-[#047857] shadow-inner p-4 flex flex-col justify-center items-center overflow-auto relative">
              {/* Table watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <span className="text-8xl font-black text-emerald-200 font-mono tracking-widest">GAPLE</span>
              </div>

              {boardChain.length === 0 ? (
                <div className="text-center text-emerald-300/70 text-xs font-mono">
                  Menunggu kartu balak pembuka diletakkan di tengah meja...
                </div>
              ) : (
                /* The Continuous Serpentine Train of Connected Domino Tiles with 90° Corner Turns */
                <div className="flex flex-col items-center gap-1.5 max-w-3xl py-2 z-10 w-full">
                  {serpentineRows.map((row, rIdx) => (
                    <React.Fragment key={`serp-row-${rIdx}`}>
                      {/* Horizontal Run */}
                      <div 
                        className={`flex items-center gap-1.5 w-full ${
                          row.direction === 'ltr' ? 'flex-row justify-start pl-6' : 'flex-row-reverse justify-start pr-6'
                        }`}
                      >
                        {row.tiles.map((item) => (
                          <div
                            key={item.id}
                            className={`relative flex rounded-md bg-[#FFFDF7] border-2 border-slate-400 shadow-md ${
                              item.isBalak
                                ? 'flex-col w-7 h-14 items-center justify-between p-1 bg-amber-50 border-amber-500 shrink-0'
                                : 'flex-row w-14 h-7 items-center justify-between p-1 shrink-0'
                            }`}
                            title={`[${item.val1}|${item.val2}] ${item.isBalak ? '(Balak Vertikal)' : '(Horizontal)'} oleh ${item.playedBy}`}
                          >
                            {item.isBalak ? (
                              <>
                                <DominoHalfPips value={item.val1} size="sm" />
                                <div className="w-full h-0.5 bg-red-600" />
                                <DominoHalfPips value={item.val2} size="sm" />
                              </>
                            ) : (
                              <>
                                <DominoHalfPips value={item.val1} size="sm" />
                                <div className="h-full w-0.5 bg-red-600" />
                                <DominoHalfPips value={item.val2} size="sm" />
                              </>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* 90-Degree Corner Turn Connector (Belok Vertikal ke Bawah) */}
                      {row.cornerAfter && (
                        <div 
                          className={`w-full flex ${
                            row.direction === 'ltr' ? 'justify-end pr-8' : 'justify-start pl-8'
                          } my-0.5`}
                        >
                          <div className="relative group/corner flex items-center gap-1.5">
                            {row.direction === 'ltr' && (
                              <span className="text-[10px] text-amber-300 font-mono font-bold animate-pulse">
                                ↷ Belok 90°
                              </span>
                            )}
                            <div
                              className="relative flex flex-col w-7 h-14 items-center justify-between p-1 rounded-md bg-amber-100 border-2 border-amber-600 shadow-lg ring-2 ring-amber-400/50"
                              title={`[${row.cornerAfter.val1}|${row.cornerAfter.val2}] (Sudut 90° Tikungan Kereta)`}
                            >
                              <DominoHalfPips value={row.cornerAfter.val1} size="sm" />
                              <div className="w-full h-0.5 bg-red-600" />
                              <DominoHalfPips value={row.cornerAfter.val2} size="sm" />
                            </div>
                            {row.direction === 'rtl' && (
                              <span className="text-[10px] text-amber-300 font-mono font-bold animate-pulse">
                                ↶ Belok 90°
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Open Ends Indicator */}
              {openEnds && (
                <div className="absolute bottom-2 flex items-center gap-4 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/40 text-[11px] font-mono text-emerald-300">
                  <span>Ujung Kiri: <strong className="text-white text-xs">{openEnds.left}</strong></span>
                  <span>|</span>
                  <span>Ujung Kanan: <strong className="text-white text-xs">{openEnds.right}</strong></span>
                </div>
              )}
            </div>

            {/* RIGHT PLAYER: Pak Mandor */}
            <div className="flex flex-col items-center w-28 z-10">
              <div className={`px-3 py-1.5 rounded-2xl border flex flex-col items-center gap-1 shadow-lg transition-all ${
                currentTurnIndex === 3 ? 'bg-cyan-950/90 border-cyan-400 ring-2 ring-cyan-400/50' : 'bg-slate-900/80 border-slate-700'
              }`}>
                <span className="text-2xl">📋</span>
                <span className="text-xs font-black text-white text-center">Pak Mandor</span>
                <span className="text-[10px] text-slate-400">({players[3]?.hand.length || 0} kartu)</span>
              </div>
              <div className="flex flex-col gap-0.5 mt-2">
                {Array.from({ length: players[3]?.hand.length || 0 }).map((_, i) => (
                  <div key={`p3-c-${i}`} className="w-7 h-3 rounded-sm bg-slate-800 border border-slate-600" />
                ))}
              </div>
            </div>
          </div>

          {/* BOTTOM PLAYER: You (Ranger) */}
          <div className="flex flex-col items-center z-10">
            {/* Ambiguous Choice Modal (Left or Right) */}
            {pendingChoiceTile && openEnds && (
              <div className="mb-2 p-2.5 rounded-2xl bg-slate-900/95 border-2 border-emerald-400 shadow-2xl flex items-center gap-3 animate-in zoom-in-95">
                <span className="text-xs font-bold text-white">Sambung ke ujung mana?</span>
                <button
                  type="button"
                  onClick={() => placeTileOnChain(pendingChoiceTile, 'left', 0)}
                  className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Ujung Kiri ({openEnds.left})
                </button>
                <button
                  type="button"
                  onClick={() => placeTileOnChain(pendingChoiceTile, 'right', 0)}
                  className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md cursor-pointer"
                >
                  Ujung Kanan ({openEnds.right}) <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingChoiceTile(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Hand Tiles Tray */}
            <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-950/90 border border-emerald-500/40 shadow-2xl">
              {players[0]?.hand.map((tile) => {
                const { canLeft, canRight } = getPlayableSides(tile, openEnds);
                const isPlayable = isPlaying && currentTurnIndex === 0 && (canLeft || canRight);
                const isBalak = tile.left === tile.right;

                return (
                  <div
                    key={tile.id}
                    onClick={() => isPlayable && handlePlayerTileClick(tile)}
                    className={`relative w-9 h-18 rounded-lg border-2 flex flex-col items-center justify-between p-1 transition-all ${
                      isPlayable
                        ? 'cursor-pointer hover:-translate-y-2 bg-[#FFFDF7] border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.5)] ring-2 ring-emerald-400/50'
                        : 'opacity-50 bg-[#E2E8F0] border-slate-600 cursor-not-allowed'
                    } ${isBalak ? 'bg-amber-50 border-amber-400' : ''}`}
                    title={`Kartu [${tile.left}|${tile.right}] ${isBalak ? '(Balak Kembar)' : ''}`}
                  >
                    <DominoHalfPips value={tile.left} size="md" />
                    <div className="w-full h-0.5 bg-red-600 my-0.5" />
                    <DominoHalfPips value={tile.right} size="md" />
                  </div>
                );
              })}

              {/* Pass Button when no moves */}
              {isPlaying && currentTurnIndex === 0 && !playerHasMove && (
                <button
                  type="button"
                  onClick={handlePassTurn}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg animate-bounce cursor-pointer"
                >
                  Lewat (Pass)!
                </button>
              )}
            </div>

            {/* Player Info Badge */}
            <div className="mt-1 flex items-center gap-2 text-xs font-black text-emerald-400">
              <span>👷 {playerName} (Anda)</span>
              <span>•</span>
              <span className={currentTurnIndex === 0 ? 'text-amber-400 animate-pulse' : 'text-slate-400'}>
                {currentTurnIndex === 0 ? 'GILIRAN ANDA' : 'Menunggu giliran...'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
