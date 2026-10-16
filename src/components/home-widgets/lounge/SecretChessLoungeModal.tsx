import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Trophy, Volume2, VolumeX, Sparkles, RotateCcw, Award, UserPlus, LogOut, ArrowUpDown } from 'lucide-react';
import { getGlobalSocket } from '../../../lib/socketClient';

export type PieceColor = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
  hasMoved?: boolean;
}

export type BoardState = (ChessPiece | null)[][];

export interface ChessSeatPlayer {
  nik: string;
  name: string;
  avatar?: string;
  socketId: string;
}

interface SecretChessLoungeModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  playerNik?: string;
  playerAvatar?: string;
  soundEnabled?: boolean;
}

// Initial 8x8 Chess Board Setup
const INITIAL_BOARD: BoardState = [
  [
    { type: 'r', color: 'b' }, { type: 'n', color: 'b' }, { type: 'b', color: 'b' }, { type: 'q', color: 'b' },
    { type: 'k', color: 'b' }, { type: 'b', color: 'b' }, { type: 'n', color: 'b' }, { type: 'r', color: 'b' }
  ],
  [
    { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' },
    { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' }
  ],
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  Array(8).fill(null),
  [
    { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' },
    { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' }
  ],
  [
    { type: 'r', color: 'w' }, { type: 'n', color: 'w' }, { type: 'b', color: 'w' }, { type: 'q', color: 'w' },
    { type: 'k', color: 'w' }, { type: 'b', color: 'w' }, { type: 'n', color: 'w' }, { type: 'r', color: 'w' }
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
  playerNik,
  playerAvatar,
  soundEnabled = true
}) => {
  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('w');
  const [selectedSquare, setSelectedSquare] = useState<{ r: number; c: number } | null>(null);
  const [soundOn, setSoundOn] = useState(soundEnabled);
  const [gameAnnouncement, setGameAnnouncement] = useState('Papan catur siap. Ambil kursi Bidak Putih atau Hitam.');
  const [isCheck, setIsCheck] = useState<PieceColor | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [capturedByWhite, setCapturedByWhite] = useState<ChessPiece[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<ChessPiece[]>([]);
  const [whiteSeat, setWhiteSeat] = useState<ChessSeatPlayer | null>(null);
  const [blackSeat, setBlackSeat] = useState<ChessSeatPlayer | null>(null);
  const [vsAiMode, setVsAiMode] = useState<boolean>(false);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  const effectiveNik = playerNik || playerName;

  const playSfx = useCallback((type: 'move' | 'capture' | 'check' | 'win' | 'click') => {
    if (soundOn) playChessAudio(type);
  }, [soundOn]);

  // Which side is this user seated as?
  const mySide: PieceColor | null = useMemo(() => {
    if (whiteSeat && whiteSeat.nik === effectiveNik) return 'w';
    if (blackSeat && blackSeat.nik === effectiveNik) return 'b';
    return null;
  }, [whiteSeat, blackSeat, effectiveNik]);

  // Auto flip if playing Black
  useEffect(() => {
    if (mySide === 'b') {
      setIsFlipped(true);
    } else if (mySide === 'w') {
      setIsFlipped(false);
    }
  }, [mySide]);

  // ── SOCKET.IO MULTIPLAYER SYNC ──
  useEffect(() => {
    if (!isOpen) return;
    const socket = getGlobalSocket();

    const handleSync = (state: any) => {
      if (state.board) setBoard(state.board);
      if (state.currentTurn) setCurrentTurn(state.currentTurn);
      if (state.isCheck !== undefined) setIsCheck(state.isCheck);
      if (state.winner !== undefined) {
        if (state.winner && !winner) playSfx('win');
        setWinner(state.winner);
      }
      if (state.gameAnnouncement) setGameAnnouncement(state.gameAnnouncement);
      if (state.capturedByWhite) setCapturedByWhite(state.capturedByWhite);
      if (state.capturedByBlack) setCapturedByBlack(state.capturedByBlack);
      if (state.whiteSeat !== undefined) setWhiteSeat(state.whiteSeat);
      if (state.blackSeat !== undefined) setBlackSeat(state.blackSeat);
    };

    socket.on('chess:sync', handleSync);
    socket.emit('chess:get_state');

    return () => {
      socket.off('chess:sync', handleSync);
    };
  }, [isOpen, playSfx, winner]);

  // Handle Seat Taking
  const handleSit = (side: 'w' | 'b') => {
    playSfx('click');
    const socket = getGlobalSocket();
    socket.emit('chess:sit', {
      side,
      nik: effectiveNik,
      name: playerName,
      avatar: playerAvatar
    });
  };

  // Handle Standing Up
  const handleStand = (side: 'w' | 'b') => {
    playSfx('click');
    const socket = getGlobalSocket();
    socket.emit('chess:stand', { side });
  };

  // Handle Reset Game
  const resetGame = () => {
    playSfx('click');
    const socket = getGlobalSocket();
    socket.emit('chess:reset');
    setSelectedSquare(null);
  };

  // Check if a square is under attack
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

    // 4. Rook & Queen straight rays
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

  // Pseudo-legal moves
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

  // Strict Legal Moves
  const getLegalMoves = useCallback((b: BoardState, r: number, c: number): { r: number; c: number; isCapture: boolean }[] => {
    const candidateMoves = getPseudoLegalMoves(b, r, c);
    const piece = b[r][c];
    if (!piece) return [];
    const color = piece.color;
    const enemyColor: PieceColor = color === 'w' ? 'b' : 'w';

    return candidateMoves.filter(m => {
      const simBoard = b.map(row => row.map(cell => cell ? { ...cell } : null));
      simBoard[m.r][m.c] = simBoard[r][c];
      simBoard[r][c] = null;

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
      return !isSquareAttacked(simBoard, kingR, kingC, enemyColor);
    });
  }, [getPseudoLegalMoves, isSquareAttacked]);

  // Available moves for highlighted square
  const highlightedMoves = useMemo(() => {
    if (!selectedSquare) return [];
    return getLegalMoves(board, selectedSquare.r, selectedSquare.c);
  }, [board, selectedSquare, getLegalMoves]);

  // Execute Move & Broadcast via Socket
  const makeMove = useCallback((fromR: number, fromC: number, toR: number, toC: number) => {
    const movingPiece = board[fromR][fromC];
    if (!movingPiece) return;

    const targetPiece = board[toR][toC];
    const isCapture = Boolean(targetPiece);

    const nextBoard = board.map(row => row.map(cell => (cell ? { ...cell } : null)));
    nextBoard[fromR][fromC] = null;

    if (movingPiece.type === 'p' && (toR === 0 || toR === 7)) {
      nextBoard[toR][toC] = { type: 'q', color: movingPiece.color, hasMoved: true };
    } else {
      nextBoard[toR][toC] = { ...movingPiece, hasMoved: true };
    }

    const nextCapturedByWhite = [...capturedByWhite];
    const nextCapturedByBlack = [...capturedByBlack];
    if (targetPiece) {
      if (movingPiece.color === 'w') {
        nextCapturedByWhite.push(targetPiece);
      } else {
        nextCapturedByBlack.push(targetPiece);
      }
    }

    if (isCapture) {
      playSfx('capture');
    } else {
      playSfx('move');
    }

    let nextWinner: string | null = null;
    let announcement = '';

    if (targetPiece && targetPiece.type === 'k') {
      playSfx('win');
      const moverName = movingPiece.color === 'w' ? (whiteSeat?.name || 'Putih') : (blackSeat?.name || 'Hitam');
      nextWinner = moverName;
      announcement = `🏆 SKAKMAT! ${moverName} memenangkan pertandingan catur!`;
    } else {
      const nextTurn = movingPiece.color === 'w' ? 'b' : 'w';
      const moverName = movingPiece.color === 'w' ? (whiteSeat?.name || 'Putih') : (blackSeat?.name || 'Hitam');
      const nextPlayerName = nextTurn === 'w' ? (whiteSeat?.name || 'Putih') : (blackSeat?.name || 'Hitam');
      announcement = `${moverName} melangkah. Giliran: ${nextPlayerName} (${nextTurn === 'w' ? 'Putih' : 'Hitam'}).`;
    }

    const nextTurn = movingPiece.color === 'w' ? 'b' : 'w';
    setSelectedSquare(null);

    // Broadcast move to all lounge clients via Socket.io
    const socket = getGlobalSocket();
    socket.emit('chess:move', {
      board: nextBoard,
      nextTurn,
      winner: nextWinner,
      announcement,
      capturedByWhite: nextCapturedByWhite,
      capturedByBlack: nextCapturedByBlack
    });
  }, [board, capturedByWhite, capturedByBlack, whiteSeat, blackSeat, playSfx]);

  // AI Solo fallback if user turns on AI mode and Black seat is empty
  useEffect(() => {
    if (!vsAiMode || blackSeat || currentTurn !== 'b' || winner || !isOpen) return;

    const timer = setTimeout(() => {
      const allBotMoves: { fromR: number; fromC: number; toR: number; toC: number; score: number }[] = [];

      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.color === 'b') {
            const legals = getLegalMoves(board, r, c);
            legals.forEach(m => {
              const target = board[m.r][m.c];
              let score = 0;
              if (target) score = PIECE_VALUES[target.type] * 10;
              if (m.r >= 3 && m.r <= 4 && m.c >= 3 && m.c <= 4) score += 5;
              allBotMoves.push({ fromR: r, fromC: c, toR: m.r, toC: m.c, score });
            });
          }
        }
      }

      if (allBotMoves.length === 0) {
        playSfx('win');
        const winName = whiteSeat?.name || playerName;
        setWinner(winName);
        return;
      }

      allBotMoves.sort((a, b) => b.score - a.score);
      const topPicks = allBotMoves.filter(m => m.score === allBotMoves[0].score);
      const chosen = topPicks[Math.floor(Math.random() * topPicks.length)] || allBotMoves[0];
      makeMove(chosen.fromR, chosen.fromC, chosen.toR, chosen.toC);
    }, 800);

    return () => clearTimeout(timer);
  }, [vsAiMode, blackSeat, currentTurn, winner, isOpen, board, getLegalMoves, makeMove, whiteSeat, playerName, playSfx]);

  // Click on a square
  const handleSquareClick = (r: number, c: number) => {
    if (winner) return;

    // Permissions check: user can only move their seated color
    // If user is not seated at all, allow spectating only
    if (mySide && mySide !== currentTurn) return;
    if (!mySide) return;

    const clickedPiece = board[r][c];

    // If already have selected square and clicking on a highlighted destination
    if (selectedSquare) {
      const isTargetLegal = highlightedMoves.some(m => m.r === r && m.c === c);
      if (isTargetLegal) {
        makeMove(selectedSquare.r, selectedSquare.c, r, c);
        return;
      }
    }

    // Select piece if matching current turn and user's color
    if (clickedPiece && clickedPiece.color === currentTurn && clickedPiece.color === mySide) {
      setSelectedSquare({ r, c });
      playSfx('click');
    } else {
      setSelectedSquare(null);
    }
  };

  if (!isOpen) return null;

  // Board coordinates according to flip view
  const rowIndices = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const colIndices = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl h-[95vh] max-h-[880px] rounded-3xl bg-[#0F172A] border-2 border-amber-500/50 text-slate-100 shadow-[0_0_60px_rgba(245,158,11,0.25)] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-5 py-3 border-b border-amber-500/30 bg-slate-950/85 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-950/90 border border-amber-400/60 flex items-center justify-center text-2xl shadow-inner">
              ♟️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-amber-400">
                  Meja Catur 2 Pemain
                </span>
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-950/90 text-emerald-300 font-bold rounded-md border border-emerald-800 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> MULTIPLAYER ONLINE REAL-TIME
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
                Duel Catur Bawah Tanah Tambang (Underground Chess)
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFlipped(!isFlipped)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-amber-950/50 transition-colors cursor-pointer"
              title="Balik Posisi Papan (Flip View)"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
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

        {/* Ticker & Status Bar */}
        <div className="px-5 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono z-10 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="animate-pulse text-amber-400">●</span>
            <span className="text-slate-200 font-bold tracking-wide truncate">
              {gameAnnouncement}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={resetGame}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Papan
            </button>
          </div>
        </div>

        {/* ── CHESS ARENA (2 PLAYERS & 8x8 BOARD) ── */}
        <div className="flex-1 p-3 flex flex-col justify-between items-center overflow-hidden bg-[#0A0E1A]">
          {/* BLACK PLAYER BAR (TOP) */}
          <div className="w-full max-w-[480px] flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-md z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-600 flex items-center justify-center text-xl shadow-inner">
                {blackSeat?.avatar || '♟️'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white">
                    {blackSeat ? blackSeat.name : 'Bidak Hitam (Kursi Kosong)'}
                  </span>
                  {blackSeat && blackSeat.nik === effectiveNik && (
                    <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 font-mono rounded">ANDA</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span>Bidak Tereliminasi:</span>
                  <span className="text-slate-200 font-serif">
                    {capturedByWhite.map((p, i) => PIECE_SYMBOLS[p.type].b).join(' ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentTurn === 'b' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse font-mono font-bold">
                  GILIRAN HITAM
                </span>
              )}
              {blackSeat ? (
                blackSeat.nik === effectiveNik && (
                  <button onClick={() => handleStand('b')} className="text-slate-400 hover:text-red-400 text-xs p-1" title="Berdiri">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleSit('b')}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-amber-950/80 border border-slate-600 hover:border-amber-500/60 text-slate-300 hover:text-amber-300 text-xs flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <UserPlus className="w-3 h-3" /> Ambil Hitam
                  </button>
                  <button
                    onClick={() => setVsAiMode(!vsAiMode)}
                    className={`px-2 py-1 rounded-xl border text-[10px] font-mono cursor-pointer transition-all ${
                      vsAiMode ? 'bg-purple-950 border-purple-400 text-purple-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                    title="Aktifkan AI Bunker jika bermain solo"
                  >
                    AI Bot {vsAiMode ? 'ON' : 'OFF'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 8x8 CHESS BOARD */}
          <div className="my-auto relative p-2.5 rounded-3xl bg-[#2D1B10] border-4 border-[#5E3A1E] shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
            <div className="grid grid-cols-8 grid-rows-8 w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] rounded-xl overflow-hidden border border-amber-900/60 shadow-inner">
              {rowIndices.map((r) =>
                colIndices.map((c) => {
                  const piece = board[r][c];
                  const isLight = (r + c) % 2 === 0;
                  const isSelected = selectedSquare?.r === r && selectedSquare?.c === c;
                  const isLegalTarget = highlightedMoves.some(m => m.r === r && m.c === c);
                  const isCheckSquare = piece?.type === 'k' && piece?.color === isCheck;

                  return (
                    <div
                      key={`sq-${r}-${c}`}
                      onClick={() => handleSquareClick(r, c)}
                      className={`relative flex items-center justify-center cursor-pointer transition-all ${
                        isLight ? 'bg-[#F2D7B4]' : 'bg-[#B58863]'
                      } ${isSelected ? 'ring-3 ring-amber-400 bg-amber-300/80 z-10' : ''} ${
                        isCheckSquare ? 'bg-red-600/80 ring-3 ring-red-400 animate-pulse' : ''
                      }`}
                    >
                      {/* Destination Highlight Dot or Ring */}
                      {isLegalTarget && (
                        <div
                          className={`absolute z-10 pointer-events-none rounded-full ${
                            piece
                              ? 'w-full h-full border-4 border-red-500/80 bg-red-500/20'
                              : 'w-3.5 h-3.5 bg-emerald-600/80 shadow-md ring-2 ring-emerald-300'
                          }`}
                        />
                      )}

                      {/* Chess Piece Symbol */}
                      {piece && (
                        <span
                          className={`font-serif text-3xl sm:text-4xl transition-transform select-none ${
                            piece.color === 'w'
                              ? 'text-[#FFFFFF] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]'
                              : 'text-[#1E293B] drop-shadow-[0_2px_4px_rgba(255,255,255,0.4)]'
                          } ${isSelected ? 'scale-115 -translate-y-1' : 'hover:scale-105'}`}
                          title={`${piece.color === 'w' ? 'Putih' : 'Hitam'} ${PIECE_SYMBOLS[piece.type].name}`}
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

          {/* WHITE PLAYER BAR (BOTTOM) */}
          <div className="w-full max-w-[480px] flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-md z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-xl shadow-inner text-slate-900">
                {whiteSeat?.avatar || '♟️'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-white">
                    {whiteSeat ? whiteSeat.name : 'Bidak Putih (Kursi Kosong)'}
                  </span>
                  {whiteSeat && whiteSeat.nik === effectiveNik && (
                    <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 font-mono rounded">ANDA</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span>Bidak Tereliminasi:</span>
                  <span className="text-slate-200 font-serif">
                    {capturedByBlack.map((p, i) => PIECE_SYMBOLS[p.type].w).join(' ')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {currentTurn === 'w' && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse font-mono font-bold">
                  GILIRAN PUTIH
                </span>
              )}
              {whiteSeat ? (
                whiteSeat.nik === effectiveNik && (
                  <button onClick={() => handleStand('w')} className="text-slate-400 hover:text-red-400 text-xs p-1" title="Berdiri">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )
              ) : (
                <button
                  onClick={() => handleSit('w')}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-emerald-950/80 border border-slate-600 hover:border-emerald-500/60 text-slate-300 hover:text-emerald-300 text-xs flex items-center gap-1 cursor-pointer transition-all"
                >
                  <UserPlus className="w-3 h-3" /> Ambil Putih
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
