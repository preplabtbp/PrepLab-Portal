import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Trophy, Volume2, VolumeX, Sparkles, RotateCcw, Award } from 'lucide-react';

export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
  hasMoved?: boolean;
}

export type BoardState = (ChessPiece | null)[][];

interface SecretChessLoungeModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  soundEnabled?: boolean;
}

// Initial 8x8 Chess Board Setup
const INITIAL_BOARD: BoardState = [
  [
    { type: 'r', color: 'b' },
    { type: 'n', color: 'b' },
    { type: 'b', color: 'b' },
    { type: 'q', color: 'b' },
    { type: 'k', color: 'b' },
    { type: 'b', color: 'b' },
    { type: 'n', color: 'b' },
    { type: 'r', color: 'b' }
  ],
  [
    { type: 'p', color: 'b' },
    { type: 'p', color: 'b' },
    { type: 'p', color: 'b' },
    { type: 'p', color: 'b' },
    { type: 'p', color: 'b' },
    { type: 'p', color: 'b' },
    { type: 'p', color: 'b' },
    { type: 'p', color: 'b' }
  ],
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  [
    { type: 'p', color: 'w' },
    { type: 'p', color: 'w' },
    { type: 'p', color: 'w' },
    { type: 'p', color: 'w' },
    { type: 'p', color: 'w' },
    { type: 'p', color: 'w' },
    { type: 'p', color: 'w' },
    { type: 'p', color: 'w' }
  ],
  [
    { type: 'r', color: 'w' },
    { type: 'n', color: 'w' },
    { type: 'b', color: 'w' },
    { type: 'q', color: 'w' },
    { type: 'k', color: 'w' },
    { type: 'b', color: 'w' },
    { type: 'n', color: 'w' },
    { type: 'r', color: 'w' }
  ]
];

const PIECE_SYMBOLS: Record<PieceType, { w: string; b: string; name: string }> = {
  p: { w: '♟', b: '♙', name: 'Pion' },
  n: { w: '♞', b: '♘', name: 'Kuda' },
  b: { w: '♝', b: '♗', name: 'Gajah' },
  r: { w: '♜', b: '♖', name: 'Benteng' },
  q: { w: '♛', b: '♕', name: 'Ratu' },
  k: { w: '♚', b: '♔', name: 'Raja' }
};

const PIECE_VALUES: Record<PieceType, number> = {
  p: 10,
  n: 30,
  b: 30,
  r: 50,
  q: 90,
  k: 1000
};

// Web Audio API Synthesizer for Chess Sound Effects
function playChessAudio(type: 'move' | 'capture' | 'check' | 'win' | 'click') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'move') {
      // Wood piece knock
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.06);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'capture') {
      // Snappy resonant wood slam
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'check') {
      // Alert ding
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(880, now + 0.08);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'win') {
      // Fanfare
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
    } else if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch {}
}

export const SecretChessLoungeModal: React.FC<SecretChessLoungeModalProps> = ({
  isOpen,
  onClose,
  playerName,
  soundEnabled = true
}) => {
  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('w'); // 'w' = Player, 'b' = Bot
  const [selectedSquare, setSelectedSquare] = useState<{ r: number; c: number } | null>(null);
  const [soundOn, setSoundOn] = useState(soundEnabled);
  const [gameAnnouncement, setGameAnnouncement] = useState('Giliran Anda (Bidak Putih) melangkah.');
  const [isCheck, setIsCheck] = useState<PieceColor | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [capturedByWhite, setCapturedByWhite] = useState<ChessPiece[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<ChessPiece[]>([]);

  const playSfx = useCallback((type: 'move' | 'capture' | 'check' | 'win' | 'click') => {
    if (soundOn) playChessAudio(type);
  }, [soundOn]);

  const resetGame = () => {
    setBoard(INITIAL_BOARD.map(row => row.map(cell => cell ? { ...cell } : null)));
    setCurrentTurn('w');
    setSelectedSquare(null);
    setIsCheck(null);
    setWinner(null);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setGameAnnouncement('Permainan catur baru dimulai! Giliran Anda (Putih).');
    playSfx('click');
  };

  // Check if a square (targetR, targetC) is under attack by any piece of attackerColor
  const isSquareAttacked = useCallback((b: BoardState, tr: number, tc: number, attackerColor: PieceColor): boolean => {
    const isInside = (nr: number, nc: number) => nr >= 0 && nr < 8 && nc >= 0 && nc < 8;

    // 1. Pawn attacks
    const pawnDir = attackerColor === 'w' ? -1 : 1;
    const p1R = tr - pawnDir;
    if (isInside(p1R, tc - 1) && b[p1R][tc - 1]?.color === attackerColor && b[p1R][tc - 1]?.type === 'p') return true;
    if (isInside(p1R, tc + 1) && b[p1R][tc + 1]?.color === attackerColor && b[p1R][tc + 1]?.type === 'p') return true;

    // 2. Knight attacks
    const knightOffsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of knightOffsets) {
      const nr = tr + dr;
      const nc = tc + dc;
      if (isInside(nr, nc)) {
        const p = b[nr][nc];
        if (p && p.color === attackerColor && p.type === 'n') return true;
      }
    }

    // 3. Bishop & Queen diagonal rays
    const diagDirs: [number, number][] = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagDirs) {
      let step = 1;
      while (true) {
        const nr = tr + dr * step;
        const nc = tc + dc * step;
        if (!isInside(nr, nc)) break;
        const p = b[nr][nc];
        if (p) {
          if (p.color === attackerColor && (p.type === 'b' || p.type === 'q')) return true;
          break;
        }
        step++;
      }
    }

    // 4. Rook & Queen straight rays (Fix: prevents King moving into line of fire of enemy Rook!)
    const straightDirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of straightDirs) {
      let step = 1;
      while (true) {
        const nr = tr + dr * step;
        const nc = tc + dc * step;
        if (!isInside(nr, nc)) break;
        const p = b[nr][nc];
        if (p) {
          if (p.color === attackerColor && (p.type === 'r' || p.type === 'q')) return true;
          break;
        }
        step++;
      }
    }

    // 5. King adjacent
    const kingOffsets = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    for (const [dr, dc] of kingOffsets) {
      const nr = tr + dr;
      const nc = tc + dc;
      if (isInside(nr, nc)) {
        const p = b[nr][nc];
        if (p && p.color === attackerColor && p.type === 'k') return true;
      }
    }

    return false;
  }, []);

  // Calculate Candidate Moves for a given piece at (row, col)
  const getPseudoLegalMoves = useCallback((b: BoardState, r: number, c: number): { r: number; c: number; isCapture: boolean }[] => {
    const piece = b[r][c];
    if (!piece) return [];
    const color = piece.color;
    const moves: { r: number; c: number; isCapture: boolean }[] = [];

    const isInside = (nr: number, nc: number) => nr >= 0 && nr < 8 && nc >= 0 && nc < 8;

    if (piece.type === 'p') {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;

      // 1 square forward
      const f1 = r + dir;
      if (isInside(f1, c) && !b[f1][c]) {
        moves.push({ r: f1, c, isCapture: false });
        // 2 squares forward from start
        const f2 = r + 2 * dir;
        if (r === startRow && isInside(f2, c) && !b[f2][c]) {
          moves.push({ r: f2, c, isCapture: false });
        }
      }

      // Diagonal captures
      [-1, 1].forEach(dc => {
        const nr = r + dir;
        const nc = c + dc;
        if (isInside(nr, nc) && b[nr][nc] && b[nr][nc]?.color !== color) {
          moves.push({ r: nr, c: nc, isCapture: true });
        }
      });
    } else if (piece.type === 'n') {
      const knightOffsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
      ];
      knightOffsets.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (isInside(nr, nc)) {
          const target = b[nr][nc];
          if (!target) {
            moves.push({ r: nr, c: nc, isCapture: false });
          } else if (target.color !== color) {
            moves.push({ r: nr, c: nc, isCapture: true });
          }
        }
      });
    } else if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
      const directions: [number, number][] = [];
      if (piece.type === 'b' || piece.type === 'q') {
        directions.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
      }
      if (piece.type === 'r' || piece.type === 'q') {
        directions.push([-1, 0], [1, 0], [0, -1], [0, 1]);
      }

      directions.forEach(([dr, dc]) => {
        let step = 1;
        while (true) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          if (!isInside(nr, nc)) break;
          const target = b[nr][nc];
          if (!target) {
            moves.push({ r: nr, c: nc, isCapture: false });
          } else {
            if (target.color !== color) {
              moves.push({ r: nr, c: nc, isCapture: true });
            }
            break;
          }
          step++;
        }
      });
    } else if (piece.type === 'k') {
      const kingOffsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1],           [0, 1],
        [1, -1],  [1, 0],  [1, 1]
      ];
      kingOffsets.forEach(([dr, dc]) => {
        const nr = r + dr;
        const nc = c + dc;
        if (isInside(nr, nc)) {
          const target = b[nr][nc];
          if (!target) {
            moves.push({ r: nr, c: nc, isCapture: false });
          } else if (target.color !== color) {
            moves.push({ r: nr, c: nc, isCapture: true });
          }
        }
      });
    }

    return moves;
  }, []);

  // Strict Legal Moves: Filters out moves that leave or put the King under check/attack
  const getLegalMoves = useCallback((b: BoardState, r: number, c: number): { r: number; c: number; isCapture: boolean }[] => {
    const candidateMoves = getPseudoLegalMoves(b, r, c);
    const piece = b[r][c];
    if (!piece) return [];
    const color = piece.color;
    const enemyColor: PieceColor = color === 'w' ? 'b' : 'w';

    return candidateMoves.filter(m => {
      // Simulate move on cloned board
      const simBoard = b.map(row => row.map(cell => cell ? { ...cell } : null));
      simBoard[m.r][m.c] = simBoard[r][c];
      simBoard[r][c] = null;

      // Locate our King's position
      let kingR = -1;
      let kingC = -1;
      for (let kr = 0; kr < 8; kr++) {
        for (let kc = 0; kc < 8; kc++) {
          const p = simBoard[kr][kc];
          if (p && p.color === color && p.type === 'k') {
            kingR = kr;
            kingC = kc;
            break;
          }
        }
        if (kingR !== -1) break;
      }

      if (kingR === -1) return false;
      // If King would be attacked by any enemy piece (e.g. Rook), the move is ILLEGAL!
      return !isSquareAttacked(simBoard, kingR, kingC, enemyColor);
    });
  }, [getPseudoLegalMoves, isSquareAttacked]);

  // Currently available moves for highlighted square
  const highlightedMoves = useMemo(() => {
    if (!selectedSquare) return [];
    return getLegalMoves(board, selectedSquare.r, selectedSquare.c);
  }, [board, selectedSquare, getLegalMoves]);

  // Execute Move
  const makeMove = useCallback((fromR: number, fromC: number, toR: number, toC: number) => {
    const movingPiece = board[fromR][fromC];
    if (!movingPiece) return;

    const targetPiece = board[toR][toC];
    const isCapture = Boolean(targetPiece);

    // Create next board
    const nextBoard = board.map(row => row.map(cell => (cell ? { ...cell } : null)));
    nextBoard[fromR][fromC] = null;

    // Pawn Promotion to Queen
    if (movingPiece.type === 'p' && (toR === 0 || toR === 7)) {
      nextBoard[toR][toC] = { type: 'q', color: movingPiece.color, hasMoved: true };
    } else {
      nextBoard[toR][toC] = { ...movingPiece, hasMoved: true };
    }

    // Update captured pieces
    if (targetPiece) {
      if (movingPiece.color === 'w') {
        setCapturedByWhite(prev => [...prev, targetPiece]);
      } else {
        setCapturedByBlack(prev => [...prev, targetPiece]);
      }
    }

    setBoard(nextBoard);
    setSelectedSquare(null);

    // Audio SFX
    if (isCapture) {
      playSfx('capture');
    } else {
      playSfx('move');
    }

    // Check Win (King Capture)
    if (targetPiece && targetPiece.type === 'k') {
      playSfx('win');
      const winName = movingPiece.color === 'w' ? playerName : 'Master Catur Tambang';
      setWinner(winName);
      setGameAnnouncement(`🏆 SKAKMAT! ${winName} memenangkan duel catur!`);
      return;
    }

    // Switch Turn
    const nextTurn = movingPiece.color === 'w' ? 'b' : 'w';
    setCurrentTurn(nextTurn);

    if (nextTurn === 'b') {
      setGameAnnouncement('Master Catur Tambang (Hitam) sedang berpikir...');
    } else {
      setGameAnnouncement('Giliran Anda (Putih) melangkah.');
    }
  }, [board, playerName, playSfx]);

  // AI Bot (Black) Movement Engine
  useEffect(() => {
    if (currentTurn !== 'b' || winner || !isOpen) return;

    const timer = setTimeout(() => {
      // Collect all legal moves for all Black pieces
      const allBotMoves: { fromR: number; fromC: number; toR: number; toC: number; score: number }[] = [];

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.color === 'b') {
            const legals = getLegalMoves(board, r, c);
            legals.forEach(m => {
              const target = board[m.r][m.c];
              let score = 0;
              if (target) {
                score = PIECE_VALUES[target.type] * 10;
              }
              // Center control bias
              if (m.r >= 3 && m.r <= 4 && m.c >= 3 && m.c <= 4) {
                score += 5;
              }
              allBotMoves.push({
                fromR: r,
                fromC: c,
                toR: m.r,
                toC: m.c,
                score
              });
            });
          }
        }
      }

      if (allBotMoves.length === 0) {
        // Stalemate / Win
        playSfx('win');
        setWinner(playerName);
        setGameAnnouncement(`🏆 SKAKMAT! ${playerName} memenangkan duel catur!`);
        return;
      }

      // Sort by score descending and add slight randomness for variety
      allBotMoves.sort((a, b) => b.score - a.score);
      const topPicks = allBotMoves.filter(m => m.score === allBotMoves[0].score);
      const chosen = topPicks[Math.floor(Math.random() * topPicks.length)] || allBotMoves[0];

      makeMove(chosen.fromR, chosen.fromC, chosen.toR, chosen.toC);
    }, 700);

    return () => clearTimeout(timer);
  }, [currentTurn, winner, isOpen, board, getLegalMoves, makeMove, playSfx, playerName]);

  // Square Click Handler for Player (White)
  const handleSquareClick = (r: number, c: number) => {
    if (currentTurn !== 'w' || winner) return;

    const clickedPiece = board[r][c];

    // If already selected, check if clicked square is a valid target move
    if (selectedSquare) {
      const isTargetMove = highlightedMoves.some(m => m.r === r && m.c === c);
      if (isTargetMove) {
        makeMove(selectedSquare.r, selectedSquare.c, r, c);
        return;
      }
    }

    // Select White piece
    if (clickedPiece && clickedPiece.color === 'w') {
      setSelectedSquare({ r, c });
      playSfx('click');
    } else {
      setSelectedSquare(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-300 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl max-h-[92vh] rounded-3xl bg-[#090D16] border-2 border-amber-500/50 text-slate-100 shadow-[0_0_60px_rgba(245,158,11,0.25)] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3 border-b border-amber-500/30 bg-slate-950/80 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-950/90 border border-amber-400/60 flex items-center justify-center text-xl shadow-inner">
              ♟️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-400">
                  Meja Catur 2 Kursi
                </span>
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950/90 text-emerald-300 font-bold rounded-md border border-emerald-800 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> UNDERGROUND BUNKER
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
                Duel Catur PrepLab ({playerName} vs Master Catur Tambang)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundOn(!soundOn)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-950/50 transition-colors cursor-pointer"
              title={soundOn ? 'Matikan Suara' : 'Nyalakan Suara'}
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
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
            <span className={`w-2 h-2 rounded-full ${currentTurn === 'w' ? 'bg-amber-400 animate-pulse' : 'bg-purple-400'}`} />
            <span className="text-slate-200 font-bold tracking-wide">
              {gameAnnouncement}
            </span>
          </div>

          <button
            type="button"
            onClick={resetGame}
            className="text-[11px] text-slate-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Ulang Pertandingan
          </button>
        </div>

        {/* Opponent Info (Top) */}
        <div className="px-5 py-1.5 bg-slate-900/60 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">🤖</span>
            <span className="font-bold text-purple-300">Master Catur Tambang (Hitam)</span>
          </div>
          {/* Captured pieces by Black */}
          <div className="flex items-center gap-1 text-slate-200 text-sm">
            {capturedByBlack.map((p, i) => (
              <span key={`cb-${i}`} title={PIECE_SYMBOLS[p.type].name}>
                {PIECE_SYMBOLS[p.type].w}
              </span>
            ))}
          </div>
        </div>

        {/* Main Chess Board Area */}
        <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
          <div className="relative p-2 rounded-2xl bg-amber-950/80 border-4 border-amber-800/80 shadow-2xl">
            {/* 8x8 Grid */}
            <div className="grid grid-cols-8 grid-rows-8 w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] border border-amber-900">
              {board.map((row, r) =>
                row.map((piece, c) => {
                  const isDark = (r + c) % 2 === 1;
                  const isSelected = selectedSquare?.r === r && selectedSquare?.c === c;
                  const isLegalTarget = highlightedMoves.some(m => m.r === r && m.c === c);
                  const isCaptureTarget = isLegalTarget && Boolean(piece);

                  return (
                    <div
                      key={`sq-${r}-${c}`}
                      onClick={() => handleSquareClick(r, c)}
                      className={`relative flex items-center justify-center cursor-pointer transition-all ${
                        isDark ? 'bg-[#78350F]' : 'bg-[#F3E8D2]'
                      } ${isSelected ? 'ring-4 ring-amber-400 z-10' : ''}`}
                    >
                      {/* Legal Move Dot Marker */}
                      {isLegalTarget && !isCaptureTarget && (
                        <div className="w-3 h-3 rounded-full bg-emerald-400 opacity-80 animate-pulse pointer-events-none" />
                      )}

                      {/* Capture Target Marker */}
                      {isCaptureTarget && (
                        <div className="absolute inset-1 rounded-full border-2 border-red-500 bg-red-500/20 animate-pulse pointer-events-none" />
                      )}

                      {/* Piece Character */}
                      {piece && (
                        <span
                          className={`text-2xl sm:text-3xl font-black select-none transition-transform hover:scale-110 ${
                            piece.color === 'w'
                              ? 'text-amber-100 drop-shadow-[0_2px_3px_rgba(0,0,0,0.8)]'
                              : 'text-slate-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.4)]'
                          }`}
                        >
                          {piece.color === 'w' ? PIECE_SYMBOLS[piece.type].w : PIECE_SYMBOLS[piece.type].b}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Player Info (Bottom) */}
        <div className="px-5 py-2 bg-slate-900/80 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">👷</span>
            <span className="font-bold text-amber-300">{playerName} (Putih - Giliran Anda)</span>
          </div>
          {/* Captured pieces by White */}
          <div className="flex items-center gap-1 text-slate-200 text-sm">
            {capturedByWhite.map((p, i) => (
              <span key={`cw-${i}`} title={PIECE_SYMBOLS[p.type].name}>
                {PIECE_SYMBOLS[p.type].b}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
