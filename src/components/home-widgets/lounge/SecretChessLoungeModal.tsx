import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Trophy, Volume2, VolumeX, Sparkles, RotateCcw, UserPlus, LogOut, ArrowUpDown, AlertTriangle, Clock, Zap, ShieldCheck } from 'lucide-react';
import { getGlobalSocket } from '../../../lib/socketClient';
import { renderAvatarNode } from './SecretDominoLoungeModal';

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
  initialSeat?: 'left' | 'right';
}

// Initial 8x8 Chess Board Setup (Rank 8 at index 0, Rank 1 at index 7)
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

// High-contrast, solid Unicode Chess Symbols (looks clean across all OSes)
const PIECE_SYMBOLS: Record<PieceType, { symbol: string; name: string }> = {
  p: { symbol: '♟', name: 'Pion' },
  n: { symbol: '♞', name: 'Kuda' },
  b: { symbol: '♝', name: 'Gajah' },
  r: { symbol: '♜', name: 'Benteng' },
  q: { symbol: '♛', name: 'Ratu' },
  k: { symbol: '♚', name: 'Raja' }
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
function playChessAudio(type: 'move' | 'capture' | 'check' | 'win' | 'click' | 'premove') {
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
      gain.gain.setValueAtTime(0.12, now);
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
      gain.gain.setValueAtTime(0.1, now);
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
        gain.gain.setValueAtTime(0.07, now + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.09);
        osc.stop(now + i * 0.09 + 0.22);
      });
    } else if (type === 'premove') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
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
  soundEnabled = true,
  initialSeat
}) => {
  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD);
  const [currentTurn, setCurrentTurn] = useState<PieceColor>('w');
  const [selectedSquare, setSelectedSquare] = useState<{ r: number; c: number } | null>(null);
  const [soundOn, setSoundOn] = useState(soundEnabled);
  const [gameAnnouncement, setGameAnnouncement] = useState('Papan catur siap. Ambil kursi Bidak Putih atau Hitam.');
  const [isCheck, setIsCheck] = useState<PieceColor | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ fromR: number; fromC: number; toR: number; toC: number } | null>(null);
  const [capturedByWhite, setCapturedByWhite] = useState<ChessPiece[]>([]);
  const [capturedByBlack, setCapturedByBlack] = useState<ChessPiece[]>([]);
  const [whiteSeat, setWhiteSeat] = useState<ChessSeatPlayer | null>(null);
  const [blackSeat, setBlackSeat] = useState<ChessSeatPlayer | null>(null);
  const [vsAiMode, setVsAiMode] = useState<boolean>(false);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);

  // Chess.com Features: Premove & Clocks & Promotion
  const [premove, setPremove] = useState<{ fromR: number; fromC: number; toR: number; toC: number } | null>(null);
  const [whiteTime, setWhiteTime] = useState<number>(600); // 10 minutes default
  const [blackTime, setBlackTime] = useState<number>(600);
  const [timerMode, setTimerMode] = useState<'10m' | '5m' | 'none'>('10m');
  const [halfMoveClock, setHalfMoveClock] = useState<number>(0);
  const [positionHistory, setPositionHistory] = useState<string[]>([]);
  const [promotionPending, setPromotionPending] = useState<{ fromR: number; fromC: number; toR: number; toC: number } | null>(null);

  const effectiveNik = playerNik || playerName;

  const playSfx = useCallback((type: 'move' | 'capture' | 'check' | 'win' | 'click' | 'premove') => {
    if (soundOn) playChessAudio(type);
  }, [soundOn]);

  // Determine if a seat corresponds to the current local player
  const isSeatMe = useCallback((seat: ChessSeatPlayer | null): boolean => {
    if (!seat) return false;
    const socket = getGlobalSocket();
    return Boolean(
      (effectiveNik && seat.nik === effectiveNik) ||
      (playerName && seat.name === playerName) ||
      (socket && seat.socketId === socket.id)
    );
  }, [effectiveNik, playerName]);

  // Which side is this user seated as?
  const mySide: PieceColor | null = useMemo(() => {
    if (isSeatMe(whiteSeat)) return 'w';
    if (isSeatMe(blackSeat)) return 'b';
    return null;
  }, [whiteSeat, blackSeat, isSeatMe]);

  // Can the current user control pieces for this color?
  // (Prevents freeze if playing solo / AI or if opponent seat is empty!)
  const canControlSide = useCallback((side: PieceColor): boolean => {
    const seat = side === 'w' ? whiteSeat : blackSeat;
    // 1. If this seat belongs to me, YES
    if (isSeatMe(seat)) return true;
    // 2. If this seat is empty, YES (local player can play/take turn)
    if (!seat) return true;
    // 3. In AI mode, White is controlled by user
    if (vsAiMode && side === 'w') return true;
    // 4. If opponent seat is filled by another player, NO (lock to that player)
    return false;
  }, [whiteSeat, blackSeat, isSeatMe, vsAiMode]);

  // Auto flip board if seated as Black
  useEffect(() => {
    if (mySide === 'b') {
      setIsFlipped(true);
    } else if (mySide === 'w') {
      setIsFlipped(false);
    }
  }, [mySide]);

  // Auto-sit if initialSeat is provided from overworld interaction
  const hasAutoSatChessRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      hasAutoSatChessRef.current = false;
      return;
    }
    if (initialSeat && !hasAutoSatChessRef.current && !mySide) {
      const targetSide: PieceColor = initialSeat === 'left' ? 'w' : 'b';
      const targetSeat = targetSide === 'w' ? whiteSeat : blackSeat;
      if (!targetSeat) {
        hasAutoSatChessRef.current = true;
        handleSit(targetSide);
      }
    }
  }, [isOpen, initialSeat, mySide, whiteSeat, blackSeat]);

  // ── SOCKET.IO MULTIPLAYER SYNC ──
  useEffect(() => {
    if (!isOpen) return;
    const socket = getGlobalSocket();

    const handleSync = (state: any) => {
      if (state.board) setBoard(state.board);
      if (state.currentTurn) setCurrentTurn(state.currentTurn);
      if (state.isCheck !== undefined) setIsCheck(state.isCheck);
      if (state.lastMove !== undefined) setLastMove(state.lastMove);
      if (state.winner !== undefined) {
        if (state.winner && !winner) playSfx('win');
        setWinner(state.winner);
      }
      if (state.gameAnnouncement) setGameAnnouncement(state.gameAnnouncement);
      if (state.capturedByWhite) setCapturedByWhite(state.capturedByWhite);
      if (state.capturedByBlack) setCapturedByBlack(state.capturedByBlack);
      if (state.whiteSeat !== undefined) setWhiteSeat(state.whiteSeat);
      if (state.blackSeat !== undefined) setBlackSeat(state.blackSeat);
      if (typeof state.whiteTime === 'number') setWhiteTime(state.whiteTime);
      if (typeof state.blackTime === 'number') setBlackTime(state.blackTime);
      if (typeof state.halfMoveClock === 'number') setHalfMoveClock(state.halfMoveClock);
      if (state.positionHistory) setPositionHistory(state.positionHistory);
    };

    const handleClockSync = (data: { whiteTime: number; blackTime: number }) => {
      if (typeof data.whiteTime === 'number') setWhiteTime(data.whiteTime);
      if (typeof data.blackTime === 'number') setBlackTime(data.blackTime);
    };

    socket.on('chess:sync', handleSync);
    socket.on('chess:clock_sync', handleClockSync);
    socket.emit('chess:get_state');

    return () => {
      socket.off('chess:sync', handleSync);
      socket.off('chess:clock_sync', handleClockSync);
    };
  }, [isOpen, playSfx, winner]);

  // Handle Seat Taking (auto-unseat from previous seat if switching)
  const handleSit = useCallback((side: 'w' | 'b') => {
    playSfx('click');
    const socket = getGlobalSocket();
    if (mySide && mySide !== side) {
      socket.emit('chess:stand', { side: mySide });
    }
    socket.emit('chess:sit', {
      side,
      nik: effectiveNik,
      name: playerName,
      avatar: playerAvatar
    });
  }, [effectiveNik, playerName, playerAvatar, playSfx, mySide]);

  // Handle Standing Up
  const handleStand = useCallback((side: 'w' | 'b') => {
    playSfx('click');
    const socket = getGlobalSocket();
    socket.emit('chess:stand', { side });
  }, [playSfx]);

  // Unseat on modal close or unmount
  const handleCloseModal = useCallback(() => {
    if (mySide) {
      handleStand(mySide);
    }
    onClose();
  }, [mySide, handleStand, onClose]);

  // Handle Reset Game
  const resetGame = useCallback(() => {
    playSfx('click');
    setBoard(INITIAL_BOARD);
    setCurrentTurn('w');
    setIsCheck(null);
    setWinner(null);
    setLastMove(null);
    setPremove(null);
    setPromotionPending(null);
    setCapturedByWhite([]);
    setCapturedByBlack([]);
    setHalfMoveClock(0);
    setPositionHistory([]);
    const initialTime = timerMode === '5m' ? 300 : timerMode === '10m' ? 600 : 99999;
    setWhiteTime(initialTime);
    setBlackTime(initialTime);
    setGameAnnouncement('Papan catur direset. Siap untuk pertandingan baru!');
    const socket = getGlobalSocket();
    socket.emit('chess:reset');
    setSelectedSquare(null);
  }, [playSfx, timerMode]);

  // ── CLOCK TIMER COUNTDOWN (Chess.com Clock Rules) ──
  useEffect(() => {
    if (!isOpen || winner || timerMode === 'none') return;

    const interval = setInterval(() => {
      if (currentTurn === 'w') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            playSfx('win');
            const oppName = blackSeat?.name || 'Hitam';
            setWinner(oppName);
            setGameAnnouncement(`⏱️ WAKTU HABIS! ${oppName} menang karena Putih kehabisan waktu (Flagged)!`);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            playSfx('win');
            const oppName = whiteSeat?.name || 'Putih';
            setWinner(oppName);
            setGameAnnouncement(`⏱️ WAKTU HABIS! ${oppName} menang karena Hitam kehabisan waktu (Flagged)!`);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, winner, timerMode, currentTurn, blackSeat, whiteSeat, playSfx]);

  // Helper: Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    if (seconds >= 9999) return '∞';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Helper: Check if a square is attacked by attackerColor
  const isSquareAttacked = useCallback((b: BoardState, tr: number, tc: number, attackerColor: PieceColor): boolean => {
    const isInside = (nr: number, nc: number) => nr >= 0 && nr < 8 && nc >= 0 && nc < 8;

    // 1. Pawn attacks (White pawn attacks moving up: row + 1; Black pawn attacks moving down: row - 1)
    const pawnRow = attackerColor === 'w' ? tr + 1 : tr - 1;
    if (isInside(pawnRow, tc - 1) && b[pawnRow][tc - 1]?.color === attackerColor && b[pawnRow][tc - 1]?.type === 'p') return true;
    if (isInside(pawnRow, tc + 1) && b[pawnRow][tc + 1]?.color === attackerColor && b[pawnRow][tc + 1]?.type === 'p') return true;

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

  // Generate Pseudo-legal moves for a piece (including En Passant & Castling)
  const getPseudoLegalMoves = useCallback((b: BoardState, r: number, c: number, activeLastMove = lastMove): { r: number; c: number; isCapture: boolean; isCastling?: boolean; rookFromC?: number; rookToC?: number; isEnPassant?: boolean }[] => {
    const piece = b[r][c];
    if (!piece) return [];
    const color = piece.color;
    const enemyColor: PieceColor = color === 'w' ? 'b' : 'w';
    const moves: { r: number; c: number; isCapture: boolean; isCastling?: boolean; rookFromC?: number; rookToC?: number; isEnPassant?: boolean }[] = [];
    const isInside = (nr: number, nc: number) => nr >= 0 && nr < 8 && nc >= 0 && nc < 8;

    if (piece.type === 'p') {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;

      // 1 square forward
      const f1 = r + dir;
      if (isInside(f1, c) && !b[f1][c]) {
        moves.push({ r: f1, c, isCapture: false });
        // 2 squares forward from start rank
        const f2 = r + 2 * dir;
        if (r === startRow && isInside(f2, c) && !b[f2][c]) {
          moves.push({ r: f2, c, isCapture: false });
        }
      }

      // Diagonal captures
      [-1, 1].forEach(dc => {
        const nr = r + dir;
        const nc = c + dc;
        if (isInside(nr, nc)) {
          const target = b[nr][nc];
          if (target && target.color === enemyColor) {
            moves.push({ r: nr, c: nc, isCapture: true });
          } else if (!target && activeLastMove) {
            // En Passant check
            if (activeLastMove.toR === r && activeLastMove.toC === nc) {
              const enemyPawn = b[r][nc];
              if (enemyPawn && enemyPawn.type === 'p' && enemyPawn.color === enemyColor && Math.abs(activeLastMove.fromR - activeLastMove.toR) === 2) {
                moves.push({ r: nr, c: nc, isCapture: true, isEnPassant: true });
              }
            }
          }
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
          } else if (target.color === enemyColor) {
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
            if (target.color === enemyColor) {
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
          } else if (target.color === enemyColor) {
            moves.push({ r: nr, c: nc, isCapture: true });
          }
        }
      });

      // Castling (Rokade)
      if (!piece.hasMoved && !isSquareAttacked(b, r, c, enemyColor)) {
        // Kingside (O-O) -> target col 6, rook at col 7
        const rookKingside = b[r][7];
        if (rookKingside && rookKingside.type === 'r' && rookKingside.color === color && !rookKingside.hasMoved) {
          if (!b[r][5] && !b[r][6] && !isSquareAttacked(b, r, 5, enemyColor) && !isSquareAttacked(b, r, 6, enemyColor)) {
            moves.push({ r, c: 6, isCapture: false, isCastling: true, rookFromC: 7, rookToC: 5 });
          }
        }
        // Queenside (O-O-O) -> target col 2, rook at col 0
        const rookQueenside = b[r][0];
        if (rookQueenside && rookQueenside.type === 'r' && rookQueenside.color === color && !rookQueenside.hasMoved) {
          if (!b[r][1] && !b[r][2] && !b[r][3] && !isSquareAttacked(b, r, 2, enemyColor) && !isSquareAttacked(b, r, 3, enemyColor)) {
            moves.push({ r, c: 2, isCapture: false, isCastling: true, rookFromC: 0, rookToC: 3 });
          }
        }
      }
    }

    return moves;
  }, [lastMove, isSquareAttacked]);

  // Strict Legal Moves: Simulates move and verifies that own King is NOT in check!
  const getLegalMoves = useCallback((b: BoardState, r: number, c: number): { r: number; c: number; isCapture: boolean; isCastling?: boolean; rookFromC?: number; rookToC?: number; isEnPassant?: boolean }[] => {
    const candidateMoves = getPseudoLegalMoves(b, r, c);
    const piece = b[r][c];
    if (!piece) return [];
    const color = piece.color;
    const enemyColor: PieceColor = color === 'w' ? 'b' : 'w';

    return candidateMoves.filter(m => {
      const simBoard = b.map(row => row.map(cell => cell ? { ...cell } : null));
      simBoard[m.r][m.c] = simBoard[r][c];
      simBoard[r][c] = null;

      // Handle castling rook movement in simulation
      if (m.isCastling && typeof m.rookFromC === 'number' && typeof m.rookToC === 'number') {
        simBoard[r][m.rookToC] = simBoard[r][m.rookFromC];
        simBoard[r][m.rookFromC] = null;
      }

      // Handle En Passant capture removal in simulation
      if (m.isEnPassant) {
        simBoard[r][m.c] = null;
      }

      // Find moving side's King
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

  // Helper: Insufficient Material Detection
  const isInsufficientMaterial = (b: BoardState): boolean => {
    const pieces: ChessPiece[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c]) pieces.push(b[r][c]!);
      }
    }
    // Only 2 kings left
    if (pieces.length === 2) return true;
    // King + 1 knight or 1 bishop vs King
    if (pieces.length === 3) {
      const nonKings = pieces.filter(p => p.type !== 'k');
      if (nonKings.length === 1 && (nonKings[0].type === 'b' || nonKings[0].type === 'n')) {
        return true;
      }
    }
    return false;
  };

  // Helper: Generate board signature string for Threefold Repetition tracking
  const getBoardSignature = (b: BoardState, turn: PieceColor): string => {
    let sig = `${turn}:`;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = b[r][c];
        sig += p ? `${p.color}${p.type}` : '.';
      }
    }
    return sig;
  };

  // Execute Move & Broadcast via Socket
  const makeMove = useCallback((fromR: number, fromC: number, toR: number, toC: number, promotionChoice: PieceType = 'q') => {
    const movingPiece = board[fromR][fromC];
    if (!movingPiece) return;

    // Check if auto-sitting is needed to reserve the side on the server
    if (!whiteSeat && movingPiece.color === 'w') handleSit('w');
    if (!blackSeat && movingPiece.color === 'b') handleSit('b');

    const targetPiece = board[toR][toC];
    const isPawn = movingPiece.type === 'p';
    const isCapture = Boolean(targetPiece);

    const nextBoard = board.map(row => row.map(cell => (cell ? { ...cell } : null)));
    nextBoard[fromR][fromC] = null;

    // En Passant capture execution
    let capturedPiece = targetPiece;
    if (isPawn && !targetPiece && fromC !== toC) {
      capturedPiece = nextBoard[fromR][toC];
      nextBoard[fromR][toC] = null;
    }

    // Pawn Promotion (Queen by default or chosen piece)
    if (isPawn && (toR === 0 || toR === 7)) {
      nextBoard[toR][toC] = { type: promotionChoice, color: movingPiece.color, hasMoved: true };
    } else {
      nextBoard[toR][toC] = { ...movingPiece, hasMoved: true };
    }

    // Castling rook jump execution
    if (movingPiece.type === 'k' && Math.abs(fromC - toC) === 2) {
      if (toC === 6) {
        // Kingside: move rook from 7 to 5
        nextBoard[fromR][5] = { ...nextBoard[fromR][7]!, hasMoved: true };
        nextBoard[fromR][7] = null;
      } else if (toC === 2) {
        // Queenside: move rook from 0 to 3
        nextBoard[fromR][3] = { ...nextBoard[fromR][0]!, hasMoved: true };
        nextBoard[fromR][0] = null;
      }
    }

    const nextCapturedByWhite = [...capturedByWhite];
    const nextCapturedByBlack = [...capturedByBlack];
    if (capturedPiece) {
      if (movingPiece.color === 'w') {
        nextCapturedByWhite.push(capturedPiece);
      } else {
        nextCapturedByBlack.push(capturedPiece);
      }
    }

    const nextTurn: PieceColor = movingPiece.color === 'w' ? 'b' : 'w';
    const moveInfo = { fromR, fromC, toR, toC };

    // 50-Move Rule Clock tracking (resets on pawn advance or capture)
    const nextHalfMoveClock = (isPawn || isCapture) ? 0 : halfMoveClock + 1;
    setHalfMoveClock(nextHalfMoveClock);

    // Threefold Repetition tracking
    const sig = getBoardSignature(nextBoard, nextTurn);
    const nextPositionHistory = [...positionHistory, sig];
    setPositionHistory(nextPositionHistory);
    const repetitions = nextPositionHistory.filter(s => s === sig).length;

    // 1. Optimistic Local State Updates
    setBoard(nextBoard);
    setCurrentTurn(nextTurn);
    setCapturedByWhite(nextCapturedByWhite);
    setCapturedByBlack(nextCapturedByBlack);
    setLastMove(moveInfo);

    // 2. Check Detection on next player's King
    let oppKingR = -1;
    let oppKingC = -1;
    for (let kr = 0; kr < 8; kr++) {
      for (let kc = 0; kc < 8; kc++) {
        const p = nextBoard[kr][kc];
        if (p && p.color === nextTurn && p.type === 'k') {
          oppKingR = kr;
          oppKingC = kc;
          break;
        }
      }
      if (oppKingR !== -1) break;
    }

    const kingInCheck = oppKingR !== -1 && isSquareAttacked(nextBoard, oppKingR, oppKingC, movingPiece.color);
    const nextCheckState: PieceColor | null = kingInCheck ? nextTurn : null;
    setIsCheck(nextCheckState);

    // 3. Count Opponent's Legal Moves to determine Checkmate vs Stalemate
    let oppLegalCount = 0;
    for (let kr = 0; kr < 8; kr++) {
      for (let kc = 0; kc < 8; kc++) {
        const p = nextBoard[kr][kc];
        if (p && p.color === nextTurn) {
          const legals = getLegalMoves(nextBoard, kr, kc);
          oppLegalCount += legals.length;
          if (oppLegalCount > 0) break;
        }
      }
      if (oppLegalCount > 0) break;
    }

    let nextWinner: string | null = null;
    let announcement = '';
    const moverName = movingPiece.color === 'w' ? (whiteSeat?.name || 'Putih') : (blackSeat?.name || 'Hitam');
    const nextPlayerName = nextTurn === 'w' ? (whiteSeat?.name || 'Putih') : (blackSeat?.name || 'Hitam');

    if (oppLegalCount === 0) {
      playSfx('win');
      if (kingInCheck) {
        nextWinner = moverName;
        announcement = `🏆 SKAKMAT! ${moverName} memenangkan pertandingan catur!`;
      } else {
        nextWinner = 'Remis';
        announcement = `🤝 REMIS (Stalemate)! ${nextPlayerName} tidak memiliki langkah sah tersisa.`;
      }
    } else if (repetitions >= 3) {
      playSfx('win');
      nextWinner = 'Remis';
      announcement = `🤝 REMIS (Threefold Repetition)! Posisi yang sama terulang 3 kali berturut-turut.`;
    } else if (nextHalfMoveClock >= 100) {
      playSfx('win');
      nextWinner = 'Remis';
      announcement = `🤝 REMIS (Aturan 50 Langkah)! 50 langkah berlalu tanpa pemakanan atau gerakan pion.`;
    } else if (isInsufficientMaterial(nextBoard)) {
      playSfx('win');
      nextWinner = 'Remis';
      announcement = `🤝 REMIS (Materi Tidak Cukup)! Sisa bidak tidak cukup untuk melakukan skakmat.`;
    } else {
      if (kingInCheck) {
        playSfx('check');
        announcement = `⚠️ SKAK! Raja ${nextTurn === 'w' ? 'Putih' : 'Hitam'} (${nextPlayerName}) sedang dalam ancaman!`;
      } else if (isCapture) {
        playSfx('capture');
        announcement = `${moverName} memakan bidak lawan! Giliran: ${nextPlayerName} (${nextTurn === 'w' ? 'Putih' : 'Hitam'}).`;
      } else {
        playSfx('move');
        announcement = `${moverName} melangkah. Giliran: ${nextPlayerName} (${nextTurn === 'w' ? 'Putih' : 'Hitam'}).`;
      }
    }

    if (nextWinner) {
      setWinner(nextWinner);
    }
    setGameAnnouncement(announcement);
    setSelectedSquare(null);
    setPromotionPending(null);

    // Broadcast move to all lounge clients via Socket.io
    const socket = getGlobalSocket();
    socket.emit('chess:move', {
      board: nextBoard,
      nextTurn,
      winner: nextWinner,
      isCheck: nextCheckState,
      lastMove: moveInfo,
      whiteTime,
      blackTime,
      halfMoveClock: nextHalfMoveClock,
      positionHistory: nextPositionHistory,
      announcement,
      capturedByWhite: nextCapturedByWhite,
      capturedByBlack: nextCapturedByBlack
    });
  }, [board, capturedByWhite, capturedByBlack, whiteSeat, blackSeat, playSfx, isSquareAttacked, getLegalMoves, halfMoveClock, positionHistory, whiteTime, blackTime, handleSit]);

  // ── PREMOVE EXECUTION (Chess.com Automatic Execution) ──
  useEffect(() => {
    if (!premove || winner || !isOpen) return;

    // Execute premove as soon as current turn reaches user's side
    if (currentTurn === mySide) {
      const timer = setTimeout(() => {
        const piece = board[premove.fromR][premove.fromC];
        if (piece && piece.color === currentTurn) {
          const legals = getLegalMoves(board, premove.fromR, premove.fromC);
          const isStillLegal = legals.some(m => m.r === premove.toR && m.c === premove.toC);
          if (isStillLegal) {
            makeMove(premove.fromR, premove.fromC, premove.toR, premove.toC);
          }
        }
        setPremove(null);
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [currentTurn, mySide, premove, board, winner, isOpen, getLegalMoves, makeMove]);

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
    }, 700);

    return () => clearTimeout(timer);
  }, [vsAiMode, blackSeat, currentTurn, winner, isOpen, board, getLegalMoves, makeMove, whiteSeat, playerName, playSfx]);

  // Click on a board square (Supports standard moves, Chess.com Touch-move & Premoves)
  const handleSquareClick = (r: number, c: number) => {
    if (winner) return;

    const clickedPiece = board[r][c];
    const isMyTurn = canControlSide(currentTurn);

    // ── SCENARIO A: NORMAL MOVE DURING USER'S TURN ──
    if (isMyTurn) {
      if (selectedSquare) {
        // If clicking another piece of the current turn color, seamlessly switch selection
        if (clickedPiece && clickedPiece.color === currentTurn && (selectedSquare.r !== r || selectedSquare.c !== c)) {
          setSelectedSquare({ r, c });
          playSfx('click');
          return;
        }

        // Check if destination is a valid legal move
        const isTargetLegal = highlightedMoves.some(m => m.r === r && m.c === c);
        if (isTargetLegal) {
          const selectedPiece = board[selectedSquare.r][selectedSquare.c];
          // Check for Pawn Promotion
          if (selectedPiece && selectedPiece.type === 'p' && (r === 0 || r === 7)) {
            setPromotionPending({ fromR: selectedSquare.r, fromC: selectedSquare.c, toR: r, toC: c });
            return;
          }
          makeMove(selectedSquare.r, selectedSquare.c, r, c);
          return;
        }
      }

      // Select piece of current turn
      if (clickedPiece && clickedPiece.color === currentTurn) {
        setSelectedSquare({ r, c });
        playSfx('click');
      } else {
        setSelectedSquare(null);
      }
      return;
    }

    // ── SCENARIO B: CHESS.COM PREMOVE (DURING OPPONENT'S TURN) ──
    if (mySide && currentTurn !== mySide) {
      if (selectedSquare) {
        // If clicking another of own pieces, switch selection
        if (clickedPiece && clickedPiece.color === mySide && (selectedSquare.r !== r || selectedSquare.c !== c)) {
          setSelectedSquare({ r, c });
          playSfx('click');
          return;
        }

        // Set premove to clicked destination square!
        setPremove({ fromR: selectedSquare.r, fromC: selectedSquare.c, toR: r, toC: c });
        playSfx('premove');
        setSelectedSquare(null);
        return;
      }

      if (clickedPiece && clickedPiece.color === mySide) {
        setSelectedSquare({ r, c });
        playSfx('click');
      } else {
        setSelectedSquare(null);
      }
    }
  };

  if (!isOpen) return null;

  // Board coordinates according to flip view
  const rowIndices = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const colIndices = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const renderBlackPlayerBar = () => (
    <div className="w-full max-w-[480px] flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-md z-10 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-slate-950 border border-slate-600 flex items-center justify-center text-xl shadow-inner overflow-hidden">
          {renderAvatarNode(blackSeat?.avatar, '♟️', 'w-8 h-8')}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-white">
              {blackSeat ? blackSeat.name : 'Bidak Hitam (Kursi Kosong)'}
            </span>
            {isSeatMe(blackSeat) && (
              <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 font-mono rounded">ANDA</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <span>Eliminasi:</span>
            <span className="text-slate-200 font-serif">
              {capturedByWhite.map((p) => PIECE_SYMBOLS[p.type].symbol).join(' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className={`px-2.5 py-1 rounded-xl font-mono font-black text-xs flex items-center gap-1 border ${
          currentTurn === 'b' && !winner
            ? 'bg-amber-500/20 border-amber-400 text-amber-300 animate-pulse'
            : 'bg-slate-950 border-slate-800 text-slate-400'
        }`}>
          <Clock className="w-3 h-3" />
          <span>{formatTime(blackTime)}</span>
        </div>

        {blackSeat ? (
          isSeatMe(blackSeat) && (
            <button onClick={() => handleStand('b')} className="text-slate-400 hover:text-red-400 text-xs p-1 cursor-pointer" title="Berdiri">
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
              AI {vsAiMode ? 'ON' : 'OFF'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderWhitePlayerBar = () => (
    <div className="w-full max-w-[480px] flex items-center justify-between px-3 py-2 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-md z-10 shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center text-xl shadow-inner text-slate-900 overflow-hidden">
          {renderAvatarNode(whiteSeat?.avatar, '♟️', 'w-8 h-8')}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-white">
              {whiteSeat ? whiteSeat.name : 'Bidak Putih (Kursi Kosong)'}
            </span>
            {isSeatMe(whiteSeat) && (
              <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 font-mono rounded">ANDA</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <span>Eliminasi:</span>
            <span className="text-slate-200 font-serif">
              {capturedByBlack.map((p) => PIECE_SYMBOLS[p.type].symbol).join(' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div className={`px-2.5 py-1 rounded-xl font-mono font-black text-xs flex items-center gap-1 border ${
          currentTurn === 'w' && !winner
            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 animate-pulse'
            : 'bg-slate-950 border-slate-800 text-slate-400'
        }`}>
          <Clock className="w-3 h-3" />
          <span>{formatTime(whiteTime)}</span>
        </div>

        {whiteSeat ? (
          isSeatMe(whiteSeat) && (
            <button onClick={() => handleStand('w')} className="text-slate-400 hover:text-red-400 text-xs p-1 cursor-pointer" title="Berdiri">
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
  );

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300 select-none"
      onClick={handleCloseModal}
    >
      <div 
        className="w-full max-w-4xl h-[95vh] max-h-[890px] rounded-3xl bg-[#0F172A] border-2 border-amber-500/50 text-slate-100 shadow-[0_0_60px_rgba(245,158,11,0.25)] flex flex-col overflow-hidden relative"
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
            {mySide && (
              <button
                type="button"
                onClick={() => handleStand(mySide)}
                className="px-2.5 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900 border border-red-700/80 text-red-300 hover:text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Berdiri dan tinggalkan kursi"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Tinggalkan Kursi</span>
              </button>
            )}

            <button
              type="button"
              onClick={resetGame}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Reset papan catur ke awal"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

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
              onClick={handleCloseModal}
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
            {isCheck ? (
              <span className="px-2 py-0.5 rounded-full bg-red-600/30 text-red-300 border border-red-500/60 font-mono font-bold animate-pulse flex items-center gap-1 text-[10px]">
                <AlertTriangle className="w-3 h-3 text-red-400" /> SKAK ({isCheck === 'w' ? 'PUTIH' : 'HITAM'})
              </span>
            ) : premove ? (
              <span className="px-2 py-0.5 rounded-full bg-cyan-600/30 text-cyan-300 border border-cyan-500/60 font-mono font-bold flex items-center gap-1 text-[10px]">
                <Zap className="w-3 h-3 text-cyan-400" /> PREMOVE AKTIF
              </span>
            ) : (
              <span className="animate-pulse text-amber-400">●</span>
            )}
            <span className="text-slate-200 font-bold tracking-wide truncate">
              {gameAnnouncement}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {premove && (
              <button
                type="button"
                onClick={() => setPremove(null)}
                className="px-2 py-0.5 rounded-md bg-cyan-950 border border-cyan-600 text-cyan-300 font-mono text-[10px] hover:bg-cyan-900 cursor-pointer"
                title="Batalkan Premove"
              >
                Batal Premove
              </button>
            )}
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
        <div className="flex-1 p-3 flex flex-col justify-between items-center overflow-hidden bg-[#0A0E1A] relative">
          
          {/* TOP PLAYER BAR (Opponent Perspective) */}
          {isFlipped ? renderWhitePlayerBar() : renderBlackPlayerBar()}

          {/* 8x8 CHESS BOARD CONTAINER */}
          <div className="my-auto relative p-2.5 rounded-3xl bg-[#2D1B10] border-4 border-[#5E3A1E] shadow-[0_12px_40px_rgba(0,0,0,0.6)]">
            <div className="grid grid-cols-8 grid-rows-8 w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] rounded-xl overflow-hidden border border-amber-900/60 shadow-inner">
              {rowIndices.map((r) =>
                colIndices.map((c) => {
                  const piece = board[r][c];
                  const isLight = (r + c) % 2 === 0;
                  const isSelected = selectedSquare?.r === r && selectedSquare?.c === c;
                  const isLegalTarget = highlightedMoves.some(m => m.r === r && m.c === c);
                  const isCheckSquare = piece?.type === 'k' && piece?.color === isCheck;
                  const isLastMoveSquare = Boolean(
                    lastMove && (
                      (lastMove.fromR === r && lastMove.fromC === c) ||
                      (lastMove.toR === r && lastMove.toC === c)
                    )
                  );
                  const isPremoveSquare = Boolean(
                    premove && (
                      (premove.fromR === r && premove.fromC === c) ||
                      (premove.toR === r && premove.toC === c)
                    )
                  );

                  return (
                    <div
                      key={`sq-${r}-${c}`}
                      onClick={() => handleSquareClick(r, c)}
                      className={`relative flex items-center justify-center cursor-pointer transition-all select-none ${
                        isLight ? 'bg-[#F2D7B4]' : 'bg-[#B58863]'
                      } ${
                        isLastMoveSquare ? '!bg-amber-300/40 ring-2 ring-inset ring-amber-400/80' : ''
                      } ${
                        isPremoveSquare ? '!bg-cyan-500/35 ring-2 ring-inset ring-cyan-400' : ''
                      } ${
                        isSelected ? '!bg-amber-300/80 ring-3 ring-amber-400 z-10' : ''
                      } ${
                        isCheckSquare ? '!bg-red-600/85 ring-4 ring-red-400 animate-pulse z-20 shadow-[0_0_20px_rgba(239,68,68,0.9)]' : ''
                      }`}
                    >
                      {/* Destination Highlight Indicator (Dot for empty, Red Ring for capture) */}
                      {isLegalTarget && (
                        <div
                          className={`absolute z-10 pointer-events-none rounded-full transition-all ${
                            piece
                              ? 'w-full h-full border-4 border-red-500/85 bg-red-500/25 ring-2 ring-red-400/50'
                              : 'w-3.5 h-3.5 bg-emerald-500/85 shadow-md ring-2 ring-emerald-300'
                          }`}
                        />
                      )}

                      {/* Chess Piece Symbol */}
                      {piece && (
                        <span
                          className={`font-serif text-3xl sm:text-4xl transition-transform select-none ${
                            piece.color === 'w'
                              ? 'text-amber-50 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]'
                              : 'text-slate-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.45)]'
                          } ${isSelected ? 'scale-115 -translate-y-1' : 'hover:scale-105'}`}
                          title={`${piece.color === 'w' ? 'Putih' : 'Hitam'} ${PIECE_SYMBOLS[piece.type].name}`}
                        >
                          {PIECE_SYMBOLS[piece.type].symbol}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* PAWN PROMOTION POPUP MODAL */}
            {promotionPending && (
              <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 rounded-3xl animate-in zoom-in-95">
                <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl p-4 shadow-2xl flex flex-col items-center gap-3">
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Promosi Pion! Pilih Bidak:
                  </div>
                  <div className="flex items-center gap-2">
                    {[
                      { type: 'q' as PieceType, label: 'Ratu' },
                      { type: 'n' as PieceType, label: 'Kuda' },
                      { type: 'r' as PieceType, label: 'Benteng' },
                      { type: 'b' as PieceType, label: 'Gajah' }
                    ].map(p => (
                      <button
                        key={p.type}
                        onClick={() => {
                          makeMove(promotionPending.fromR, promotionPending.fromC, promotionPending.toR, promotionPending.toC, p.type);
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 border border-slate-700 hover:border-amber-400 flex flex-col items-center gap-1 transition-all cursor-pointer shadow-md"
                      >
                        <span className="text-3xl font-serif text-white">{PIECE_SYMBOLS[p.type].symbol}</span>
                        <span className="text-[10px] font-bold">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM PLAYER BAR (Player Perspective) */}
          {isFlipped ? renderBlackPlayerBar() : renderWhitePlayerBar()}
        </div>
      </div>
    </div>
  );
};
