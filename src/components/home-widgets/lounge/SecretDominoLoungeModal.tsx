import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { X, Trophy, Volume2, VolumeX, Sparkles, RotateCcw, ArrowLeft, ArrowRight, UserPlus, LogOut } from 'lucide-react';
import { getGlobalSocket } from '../../../lib/socketClient';

export interface DominoTile {
  id: string;
  left: number;
  right: number;
}

export interface PlacedChainTile {
  id: string;
  val1: number;
  val2: number;
  isBalak: boolean;
  playedBy: string;
  isOrigin?: boolean;
}

export interface DominoSeatPlayer {
  seatIdx: number;
  nik: string;
  name: string;
  avatar?: string;
  socketId: string;
  isBot?: boolean;
  handCount: number;
}

interface SecretDominoLoungeModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  playerNik?: string;
  playerAvatar?: string;
  soundEnabled?: boolean;
  initialSeat?: 'top' | 'bottom' | 'left' | 'right';
}

// 28 Standard Indonesian Domino (Gaple) Tiles
const ALL_DOMINO_TILES: DominoTile[] = [
  { id: '0-0', left: 0, right: 0 }, { id: '0-1', left: 0, right: 1 }, { id: '0-2', left: 0, right: 2 },
  { id: '0-3', left: 0, right: 3 }, { id: '0-4', left: 0, right: 4 }, { id: '0-5', left: 0, right: 5 },
  { id: '0-6', left: 0, right: 6 }, { id: '1-1', left: 1, right: 1 }, { id: '1-2', left: 1, right: 2 },
  { id: '1-3', left: 1, right: 3 }, { id: '1-4', left: 1, right: 4 }, { id: '1-5', left: 1, right: 5 },
  { id: '1-6', left: 1, right: 6 }, { id: '2-2', left: 2, right: 2 }, { id: '2-3', left: 2, right: 3 },
  { id: '2-4', left: 2, right: 4 }, { id: '2-5', left: 2, right: 5 }, { id: '2-6', left: 2, right: 6 },
  { id: '3-3', left: 3, right: 3 }, { id: '3-4', left: 3, right: 4 }, { id: '3-5', left: 3, right: 5 },
  { id: '3-6', left: 3, right: 6 }, { id: '4-4', left: 4, right: 4 }, { id: '4-5', left: 4, right: 5 },
  { id: '4-6', left: 4, right: 6 }, { id: '5-5', left: 5, right: 5 }, { id: '5-6', left: 5, right: 6 },
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

// Render Red Domino Pips for One Half (0 to 6 dots) for DOM elements
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

// Safe Avatar Renderer (handles base64 image data URLs, web URLs, or emoji icons)
export const renderAvatarNode = (avatar?: string | null, fallback: string = '👤', sizeClass = 'w-6 h-6') => {
  if (!avatar) return <span className="inline-block text-base">{fallback}</span>;
  if (avatar.startsWith('data:') || avatar.startsWith('http') || avatar.startsWith('/')) {
    return <img src={avatar} alt="Avatar" className={`${sizeClass} rounded-full object-cover inline-block shadow-xs border border-emerald-400/40`} />;
  }
  return <span className="inline-block text-base">{avatar}</span>;
};

// ── SVG PIP RENDERER FOR 2D SERPENTINE BOARD ──
function renderSvgPips(val: number, cx: number, cy: number, spanX: number, spanY: number) {
  const r = 2.1;
  const color = '#DC2626';
  const dx = spanX * 0.32;
  const dy = spanY * 0.32;

  switch (val) {
    case 1:
      return [<circle key="c1" cx={cx} cy={cy} r={r} fill={color} />];
    case 2:
      return [
        <circle key="c1" cx={cx - dx} cy={cy - dy} r={r} fill={color} />,
        <circle key="c2" cx={cx + dx} cy={cy + dy} r={r} fill={color} />
      ];
    case 3:
      return [
        <circle key="c1" cx={cx - dx} cy={cy - dy} r={r} fill={color} />,
        <circle key="c2" cx={cx} cy={cy} r={r} fill={color} />,
        <circle key="c3" cx={cx + dx} cy={cy + dy} r={r} fill={color} />
      ];
    case 4:
      return [
        <circle key="c1" cx={cx - dx} cy={cy - dy} r={r} fill={color} />,
        <circle key="c2" cx={cx + dx} cy={cy - dy} r={r} fill={color} />,
        <circle key="c3" cx={cx - dx} cy={cy + dy} r={r} fill={color} />,
        <circle key="c4" cx={cx + dx} cy={cy + dy} r={r} fill={color} />
      ];
    case 5:
      return [
        <circle key="c1" cx={cx - dx} cy={cy - dy} r={r} fill={color} />,
        <circle key="c2" cx={cx + dx} cy={cy - dy} r={r} fill={color} />,
        <circle key="c3" cx={cx} cy={cy} r={r} fill={color} />,
        <circle key="c4" cx={cx - dx} cy={cy + dy} r={r} fill={color} />,
        <circle key="c5" cx={cx + dx} cy={cy + dy} r={r} fill={color} />
      ];
    case 6:
      // If horizontal half vs vertical half
      if (spanX > spanY) {
        return [
          <circle key="c1" cx={cx - dx} cy={cy - dy} r={r} fill={color} />,
          <circle key="c2" cx={cx} cy={cy - dy} r={r} fill={color} />,
          <circle key="c3" cx={cx + dx} cy={cy - dy} r={r} fill={color} />,
          <circle key="c4" cx={cx - dx} cy={cy + dy} r={r} fill={color} />,
          <circle key="c5" cx={cx} cy={cy + dy} r={r} fill={color} />,
          <circle key="c6" cx={cx + dx} cy={cy + dy} r={r} fill={color} />
        ];
      } else {
        return [
          <circle key="c1" cx={cx - dx} cy={cy - dy} r={r} fill={color} />,
          <circle key="c2" cx={cx + dx} cy={cy - dy} r={r} fill={color} />,
          <circle key="c3" cx={cx - dx} cy={cy} r={r} fill={color} />,
          <circle key="c4" cx={cx + dx} cy={cy} r={r} fill={color} />,
          <circle key="c5" cx={cx - dx} cy={cy + dy} r={r} fill={color} />,
          <circle key="c6" cx={cx + dx} cy={cy + dy} r={r} fill={color} />
        ];
      }
    default:
      return [];
  }
}

// ── SERPENTINE DOMINO LAYOUT COMPUTATION (MATCHING IMAGE 2) ──
interface LayoutTile {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  val1: number;
  val2: number;
  pip1Val: number;
  pip1Cx: number;
  pip1Cy: number;
  pip2Val: number;
  pip2Cx: number;
  pip2Cy: number;
  isBalak: boolean;
  playedBy: string;
  isVertical: boolean;
  isLeftEnd: boolean;
  isRightEnd: boolean;
}

function computeSerpentineLayout(boardChain: PlacedChainTile[]): LayoutTile[] {
  if (boardChain.length === 0) return [];

  // Table boundaries in SVG coords (740 x 250)
  const MID_Y = 125;
  const TOP_Y = 46;
  const BOT_Y = 204;
  const MAX_RIGHT = 660;
  const MIN_LEFT = 80;
  const GAP = 2;

  const NORM_LONG = 46;
  const NORM_SHORT = 23;

  // Find origin tile
  let originIdx = boardChain.findIndex(t => t.isOrigin);
  if (originIdx === -1) originIdx = Math.floor(boardChain.length / 2);

  const result: (LayoutTile | null)[] = Array(boardChain.length).fill(null);

  // 1. Layout Origin Tile at center
  const orig = boardChain[originIdx];
  const origIsVert = orig.isBalak;
  const origW = origIsVert ? NORM_SHORT : NORM_LONG;
  const origH = origIsVert ? NORM_LONG : NORM_SHORT;
  const origX = 370;
  const origY = MID_Y;

  const origPip1Cx = origIsVert ? origX : origX - origW / 4;
  const origPip1Cy = origIsVert ? origY - origH / 4 : origY;
  const origPip2Cx = origIsVert ? origX : origX + origW / 4;
  const origPip2Cy = origIsVert ? origY + origH / 4 : origY;

  result[originIdx] = {
    id: orig.id,
    x: origX,
    y: origY,
    w: origW,
    h: origH,
    val1: orig.val1,
    val2: orig.val2,
    pip1Val: orig.val1,
    pip1Cx: origPip1Cx,
    pip1Cy: origPip1Cy,
    pip2Val: orig.val2,
    pip2Cx: origPip2Cx,
    pip2Cy: origPip2Cy,
    isBalak: orig.isBalak,
    playedBy: orig.playedBy,
    isVertical: origIsVert,
    isLeftEnd: originIdx === 0,
    isRightEnd: originIdx === boardChain.length - 1
  };

  // 2. Right Branch (from originIdx + 1 to boardChain.length - 1)
  let prevTile = result[originIdx]!;
  let headingRight: 'EAST' | 'SOUTH' | 'WEST' = 'EAST';

  for (let i = originIdx + 1; i < boardChain.length; i++) {
    const tile = boardChain[i];
    let isVert = false;
    if (headingRight === 'EAST' || headingRight === 'WEST') {
      isVert = tile.isBalak;
    } else {
      isVert = !tile.isBalak;
    }

    let w = isVert ? NORM_SHORT : NORM_LONG;
    let h = isVert ? NORM_LONG : NORM_SHORT;
    let x = prevTile.x;
    let y = prevTile.y;

    if (headingRight === 'EAST') {
      const nextRightX = prevTile.x + prevTile.w / 2 + GAP + w / 2;
      if (nextRightX > MAX_RIGHT) {
        // TURN SOUTH
        headingRight = 'SOUTH';
        isVert = !tile.isBalak;
        w = isVert ? NORM_SHORT : NORM_LONG;
        h = isVert ? NORM_LONG : NORM_SHORT;
        x = prevTile.x;
        y = prevTile.y + prevTile.h / 2 + GAP + h / 2;
      } else {
        x = nextRightX;
        y = MID_Y;
      }
    } else if (headingRight === 'SOUTH') {
      const nextBottomY = prevTile.y + prevTile.h / 2 + GAP + h / 2;
      if (nextBottomY > BOT_Y) {
        // TURN WEST
        headingRight = 'WEST';
        isVert = tile.isBalak;
        w = isVert ? NORM_SHORT : NORM_LONG;
        h = isVert ? NORM_LONG : NORM_SHORT;
        y = BOT_Y;
        x = prevTile.x - prevTile.w / 2 - GAP - w / 2;
      } else {
        x = prevTile.x;
        y = nextBottomY;
      }
    } else if (headingRight === 'WEST') {
      isVert = tile.isBalak;
      w = isVert ? NORM_SHORT : NORM_LONG;
      h = isVert ? NORM_LONG : NORM_SHORT;
      x = prevTile.x - prevTile.w / 2 - GAP - w / 2;
      y = BOT_Y;
    }

    // In Right Branch: tile.val1 connects to prevTile, tile.val2 is open
    let pip1Val = tile.val1;
    let pip1Cx = x;
    let pip1Cy = y;
    let pip2Val = tile.val2;
    let pip2Cx = x;
    let pip2Cy = y;

    if (isVert) {
      const topDist = Math.hypot(x - prevTile.x, (y - h / 4) - prevTile.y);
      const botDist = Math.hypot(x - prevTile.x, (y + h / 4) - prevTile.y);
      if (topDist <= botDist) {
        // Top half touches prevTile -> val1
        pip1Cx = x; pip1Cy = y - h / 4; pip1Val = tile.val1;
        pip2Cx = x; pip2Cy = y + h / 4; pip2Val = tile.val2;
      } else {
        // Bottom half touches prevTile -> val1
        pip1Cx = x; pip1Cy = y + h / 4; pip1Val = tile.val1;
        pip2Cx = x; pip2Cy = y - h / 4; pip2Val = tile.val2;
      }
    } else {
      const leftDist = Math.hypot((x - w / 4) - prevTile.x, y - prevTile.y);
      const rightDist = Math.hypot((x + w / 4) - prevTile.x, y - prevTile.y);
      if (leftDist <= rightDist) {
        // Left half touches prevTile -> val1
        pip1Cx = x - w / 4; pip1Cy = y; pip1Val = tile.val1;
        pip2Cx = x + w / 4; pip2Cy = y; pip2Val = tile.val2;
      } else {
        // Right half touches prevTile -> val1
        pip1Cx = x + w / 4; pip1Cy = y; pip1Val = tile.val1;
        pip2Cx = x - w / 4; pip2Cy = y; pip2Val = tile.val2;
      }
    }

    const item: LayoutTile = {
      id: tile.id,
      x,
      y,
      w,
      h,
      val1: tile.val1,
      val2: tile.val2,
      pip1Val,
      pip1Cx,
      pip1Cy,
      pip2Val,
      pip2Cx,
      pip2Cy,
      isBalak: tile.isBalak,
      playedBy: tile.playedBy,
      isVertical: isVert,
      isLeftEnd: i === 0,
      isRightEnd: i === boardChain.length - 1
    };
    result[i] = item;
    prevTile = item;
  }

  // 3. Left Branch (from originIdx - 1 down to 0)
  prevTile = result[originIdx]!;
  let headingLeft: 'WEST' | 'NORTH' | 'EAST' = 'WEST';

  for (let i = originIdx - 1; i >= 0; i--) {
    const tile = boardChain[i];
    let isVert = false;
    if (headingLeft === 'WEST' || headingLeft === 'EAST') {
      isVert = tile.isBalak;
    } else {
      isVert = !tile.isBalak;
    }

    let w = isVert ? NORM_SHORT : NORM_LONG;
    let h = isVert ? NORM_LONG : NORM_SHORT;
    let x = prevTile.x;
    let y = prevTile.y;

    if (headingLeft === 'WEST') {
      const nextLeftX = prevTile.x - prevTile.w / 2 - GAP - w / 2;
      if (nextLeftX < MIN_LEFT) {
        // TURN NORTH
        headingLeft = 'NORTH';
        isVert = !tile.isBalak;
        w = isVert ? NORM_SHORT : NORM_LONG;
        h = isVert ? NORM_LONG : NORM_SHORT;
        x = prevTile.x;
        y = prevTile.y - prevTile.h / 2 - GAP - h / 2;
      } else {
        x = nextLeftX;
        y = MID_Y;
      }
    } else if (headingLeft === 'NORTH') {
      const nextTopY = prevTile.y - prevTile.h / 2 - GAP - h / 2;
      if (nextTopY < TOP_Y) {
        // TURN EAST
        headingLeft = 'EAST';
        isVert = tile.isBalak;
        w = isVert ? NORM_SHORT : NORM_LONG;
        h = isVert ? NORM_LONG : NORM_SHORT;
        y = TOP_Y;
        x = prevTile.x + prevTile.w / 2 + GAP + w / 2;
      } else {
        x = prevTile.x;
        y = nextTopY;
      }
    } else if (headingLeft === 'EAST') {
      isVert = tile.isBalak;
      w = isVert ? NORM_SHORT : NORM_LONG;
      h = isVert ? NORM_LONG : NORM_SHORT;
      x = prevTile.x + prevTile.w / 2 + GAP + w / 2;
      y = TOP_Y;
    }

    // In Left Branch: tile.val2 connects to prevTile, tile.val1 is open
    let pip1Val = tile.val1;
    let pip1Cx = x;
    let pip1Cy = y;
    let pip2Val = tile.val2;
    let pip2Cx = x;
    let pip2Cy = y;

    if (isVert) {
      const topDist = Math.hypot(x - prevTile.x, (y - h / 4) - prevTile.y);
      const botDist = Math.hypot(x - prevTile.x, (y + h / 4) - prevTile.y);
      if (topDist <= botDist) {
        // Top half touches prevTile -> val2
        pip2Cx = x; pip2Cy = y - h / 4; pip2Val = tile.val2;
        pip1Cx = x; pip1Cy = y + h / 4; pip1Val = tile.val1;
      } else {
        // Bottom half touches prevTile -> val2
        pip2Cx = x; pip2Cy = y + h / 4; pip2Val = tile.val2;
        pip1Cx = x; pip1Cy = y - h / 4; pip1Val = tile.val1;
      }
    } else {
      const leftDist = Math.hypot((x - w / 4) - prevTile.x, y - prevTile.y);
      const rightDist = Math.hypot((x + w / 4) - prevTile.x, y - prevTile.y);
      if (leftDist <= rightDist) {
        // Left half touches prevTile -> val2
        pip2Cx = x - w / 4; pip2Cy = y; pip2Val = tile.val2;
        pip1Cx = x + w / 4; pip1Cy = y; pip1Val = tile.val1;
      } else {
        // Right half touches prevTile -> val2
        pip2Cx = x + w / 4; pip2Cy = y; pip2Val = tile.val2;
        pip1Cx = x - w / 4; pip1Cy = y; pip1Val = tile.val1;
      }
    }

    const item: LayoutTile = {
      id: tile.id,
      x,
      y,
      w,
      h,
      val1: tile.val1,
      val2: tile.val2,
      pip1Val,
      pip1Cx,
      pip1Cy,
      pip2Val,
      pip2Cx,
      pip2Cy,
      isBalak: tile.isBalak,
      playedBy: tile.playedBy,
      isVertical: isVert,
      isLeftEnd: i === 0,
      isRightEnd: i === boardChain.length - 1
    };
    result[i] = item;
    prevTile = item;
  }

  return result.filter(Boolean) as LayoutTile[];
}

export const SecretDominoLoungeModal: React.FC<SecretDominoLoungeModalProps> = ({
  isOpen,
  onClose,
  playerName,
  playerNik,
  playerAvatar,
  soundEnabled = true,
  initialSeat
}) => {
  const [seats, setSeats] = useState<(DominoSeatPlayer | null)[]>([null, null, null, null]);
  const [boardChain, setBoardChain] = useState<PlacedChainTile[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [roundWinner, setRoundWinner] = useState<string | null>(null);
  const [consecutivePasses, setConsecutivePasses] = useState<number>(0);
  const [gameAnnouncement, setGameAnnouncement] = useState<string>('Menunggu pemain mengambil kursi dan menekan Mulai...');
  const [myHand, setMyHand] = useState<DominoTile[]>([]);
  const [soundOn, setSoundOn] = useState<boolean>(soundEnabled);
  const [pendingChoiceTile, setPendingChoiceTile] = useState<DominoTile | null>(null);

  const effectiveNik = playerNik || playerName;

  const playSfx = useCallback((type: 'clack' | 'pass' | 'win' | 'deal' | 'click') => {
    if (soundOn) playDominoAudio(type);
  }, [soundOn]);

  // Which seat does current user occupy (if any)?
  const mySeatIdx = useMemo(() => {
    return seats.findIndex(s => s && s.nik === effectiveNik);
  }, [seats, effectiveNik]);

  // Open ends of the chain
  const openEnds = useMemo(() => {
    if (boardChain.length === 0) return null;
    return {
      left: boardChain[0].val1,
      right: boardChain[boardChain.length - 1].val2
    };
  }, [boardChain]);

  // Check playable sides
  const getPlayableSides = useCallback((tile: DominoTile, ends: { left: number; right: number } | null) => {
    if (!ends) return { canLeft: true, canRight: true };
    const canLeft = tile.left === ends.left || tile.right === ends.left;
    const canRight = tile.left === ends.right || tile.right === ends.right;
    return { canLeft, canRight };
  }, []);

  // ── SOCKET.IO MULTIPLAYER EVENT LISTENERS ──
  useEffect(() => {
    if (!isOpen) return;
    const socket = getGlobalSocket();

    const handleSync = (state: any) => {
      if (state.seats) setSeats(state.seats);
      if (state.boardChain) {
        setBoardChain(prev => {
          if (prev.length !== state.boardChain.length && state.boardChain.length > 0) {
            playSfx('clack');
          }
          return state.boardChain;
        });
      }
      if (typeof state.currentTurnIndex === 'number') setCurrentTurnIndex(state.currentTurnIndex);
      if (typeof state.isPlaying === 'boolean') setIsPlaying(state.isPlaying);
      if (state.roundWinner !== undefined) {
        if (state.roundWinner && !roundWinner) playSfx('win');
        setRoundWinner(state.roundWinner);
      }
      if (typeof state.consecutivePasses === 'number') setConsecutivePasses(state.consecutivePasses);
      if (state.gameAnnouncement) setGameAnnouncement(state.gameAnnouncement);
    };

    const handleYourHand = (hand: DominoTile[]) => {
      setMyHand(hand || []);
      playSfx('deal');
    };

    socket.on('domino:sync', handleSync);
    socket.on('domino:your_hand', handleYourHand);

    // Initial state request
    socket.emit('domino:get_state', { nik: effectiveNik });

    return () => {
      socket.off('domino:sync', handleSync);
      socket.off('domino:your_hand', handleYourHand);
    };
  }, [isOpen, effectiveNik, playSfx, roundWinner]);

  // Handle user sitting at seat
  const handleSit = (seatIdx: number) => {
    playSfx('click');
    const socket = getGlobalSocket();
    socket.emit('domino:sit', {
      seatIdx,
      nik: effectiveNik,
      name: playerName,
      avatar: playerAvatar
    });
  };

  // Auto-sit if initialSeat is provided from overworld interaction
  const hasAutoSatRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      hasAutoSatRef.current = false;
      return;
    }
    if (initialSeat && !hasAutoSatRef.current && mySeatIdx === -1) {
      const targetIdx = initialSeat === 'bottom' ? 0 : initialSeat === 'left' ? 1 : initialSeat === 'top' ? 2 : 3;
      if (!seats[targetIdx]) {
        hasAutoSatRef.current = true;
        handleSit(targetIdx);
      }
    }
  }, [isOpen, initialSeat, mySeatIdx, seats]);

  // Relative POV mapping: if player is seated at mySeatIdx, rotate so player is ALWAYS at bottom!
  const getSeatAtScreenPos = useCallback((pos: 'bottom' | 'left' | 'top' | 'right') => {
    const baseIdx = mySeatIdx >= 0 ? mySeatIdx : 0;
    let actualIdx = 0;
    let label = '';
    let defaultAvatar = '👤';
    if (pos === 'bottom') {
      actualIdx = (baseIdx + 0) % 4;
      label = 'Selatan';
      defaultAvatar = '☕';
    } else if (pos === 'left') {
      actualIdx = (baseIdx + 1) % 4;
      label = 'Barat';
      defaultAvatar = '👻';
    } else if (pos === 'top') {
      actualIdx = (baseIdx + 2) % 4;
      label = 'Utara';
      defaultAvatar = '🔨';
    } else if (pos === 'right') {
      actualIdx = (baseIdx + 3) % 4;
      label = 'Timur';
      defaultAvatar = '📋';
    }
    const seatPlayer = seats[actualIdx];
    return {
      seat: seatPlayer,
      actualIdx,
      label,
      defaultAvatar,
      isCurrentTurn: currentTurnIndex === actualIdx,
      isMe: seatPlayer ? seatPlayer.nik === effectiveNik : false
    };
  }, [mySeatIdx, seats, currentTurnIndex, effectiveNik]);

  // Handle user standing up
  const handleStand = (seatIdx: number) => {
    playSfx('click');
    const socket = getGlobalSocket();
    socket.emit('domino:stand', { seatIdx });
  };

  // Start round
  const handleStartRound = () => {
    playSfx('click');
    const socket = getGlobalSocket();
    socket.emit('domino:start_round');
  };

  // Reset table
  const handleResetTable = () => {
    playSfx('click');
    const socket = getGlobalSocket();
    socket.emit('domino:reset');
    setMyHand([]);
  };

  // Play tile
  const handleTileClick = (tile: DominoTile) => {
    if (mySeatIdx === -1 || currentTurnIndex !== mySeatIdx || !isPlaying || roundWinner) return;

    if (boardChain.length === 0) {
      const socket = getGlobalSocket();
      socket.emit('domino:play_tile', { tileId: tile.id, side: 'left', nik: effectiveNik });
      return;
    }

    const { canLeft, canRight } = getPlayableSides(tile, openEnds);

    // If card can connect to BOTH ends, ALWAYS let player choose (even if both ends share the same number!)
    if (canLeft && canRight) {
      setPendingChoiceTile(tile);
      playSfx('click');
    } else if (canLeft) {
      const socket = getGlobalSocket();
      socket.emit('domino:play_tile', { tileId: tile.id, side: 'left', nik: effectiveNik });
    } else if (canRight) {
      const socket = getGlobalSocket();
      socket.emit('domino:play_tile', { tileId: tile.id, side: 'right', nik: effectiveNik });
    }
  };

  // Confirm tile side choice
  const handleConfirmChoice = (side: 'left' | 'right') => {
    if (!pendingChoiceTile) return;
    const socket = getGlobalSocket();
    socket.emit('domino:play_tile', { tileId: pendingChoiceTile.id, side, nik: effectiveNik });
    setPendingChoiceTile(null);
  };

  // Pass turn
  const handlePass = () => {
    if (mySeatIdx === -1 || currentTurnIndex !== mySeatIdx || !isPlaying || roundWinner) return;
    playSfx('pass');
    const socket = getGlobalSocket();
    socket.emit('domino:pass', { nik: effectiveNik });
  };

  // Check if player has moves in hand
  const playerHasMove = useMemo(() => {
    if (!isPlaying || boardChain.length === 0) return true;
    return myHand.some(t => {
      const { canLeft, canRight } = getPlayableSides(t, openEnds);
      return canLeft || canRight;
    });
  }, [isPlaying, boardChain, myHand, openEnds, getPlayableSides]);

  // Compute 2D serpentine SVG layout
  const layoutTiles = useMemo(() => {
    return computeSerpentineLayout(boardChain);
  }, [boardChain]);

  if (!isOpen) return null;

  const activeTurnPlayer = seats[currentTurnIndex];
  const isMyTurn = mySeatIdx !== -1 && currentTurnIndex === mySeatIdx;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-300 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-6xl h-[95vh] max-h-[890px] rounded-3xl bg-[#090D16] border-2 border-emerald-500/50 text-slate-100 shadow-[0_0_60px_rgba(16,185,129,0.3)] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-5 py-3 border-b border-emerald-500/30 bg-slate-950/85 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-950/90 border border-emerald-400/60 flex items-center justify-center text-2xl shadow-inner">
              🀄
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-black uppercase tracking-wider text-emerald-400">
                  Meja Gaple 4 Kursi
                </span>
                <span className="text-[9px] px-1.5 py-0.5 bg-purple-950/90 text-purple-300 font-bold rounded-md border border-purple-800 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> MULTIPLAYER ONLINE REAL-TIME
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide">
                Permainan Gaple Indonesia (Domino Serpentine 2D Titik Merah)
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
        <div className="px-5 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs font-mono z-10 shrink-0">
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
                onClick={handleStartRound}
                className="px-3.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer active:scale-95"
              >
                <span>🀄 Mulai / Kocok Kartu</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleResetTable}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Reset Meja
              </button>
            )}
          </div>
        </div>

        {/* ── MAIN 4-PLAYER GREEN FELT GAPLE TABLE ── */}
        <div className="flex-1 relative flex flex-col justify-between p-2 sm:p-3 overflow-hidden bg-[#0A1612]">
          {/* TOP SEAT (Screen North) */}
          {(() => {
            const topPos = getSeatAtScreenPos('top');
            return (
              <div className="flex flex-col items-center z-10 shrink-0">
                {topPos.seat ? (
                  <div className={`px-4 py-1.5 rounded-2xl border flex items-center gap-2 shadow-lg transition-all ${
                    topPos.isCurrentTurn ? 'bg-amber-950/90 border-amber-400 ring-2 ring-amber-400/50' : 'bg-slate-900/80 border-slate-700'
                  }`}>
                    {renderAvatarNode(topPos.seat.avatar, topPos.defaultAvatar, 'w-6 h-6')}
                    <div>
                      <span className="text-xs font-black text-white">{topPos.seat.name}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">({topPos.seat.handCount || 0} kartu)</span>
                      {topPos.seat.isBot && <span className="text-[9px] text-purple-400 ml-1 font-mono">[BOT]</span>}
                    </div>
                    {topPos.isMe && (
                      <button onClick={() => handleStand(topPos.actualIdx)} className="ml-2 text-slate-400 hover:text-red-400 text-[10px]" title="Berdiri">
                        <LogOut className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ) : (
                  (!isPlaying || roundWinner) && (
                    <div className="flex items-center gap-1.5">
                      {mySeatIdx === -1 && (
                        <button
                          onClick={() => handleSit(topPos.actualIdx)}
                          className="px-3 py-1 rounded-xl bg-slate-900/60 hover:bg-emerald-950/80 border border-slate-700 hover:border-emerald-500/60 text-slate-400 hover:text-emerald-300 text-xs flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Duduk ({topPos.label})
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const socket = getGlobalSocket();
                          socket.emit('domino:sit', { seatIdx: topPos.actualIdx, nik: `bot_${topPos.actualIdx}`, name: `Bot ${topPos.label}`, avatar: '🤖' });
                        }}
                        className="px-2 py-0.5 rounded-lg bg-slate-900/60 hover:bg-purple-950/80 border border-slate-700 hover:border-purple-500 text-purple-300 text-[10px] font-mono cursor-pointer"
                        title="Tambah Bot di kursi ini"
                      >
                        + Bot
                      </button>
                    </div>
                  )
                )}
                {/* Top Cards Back Cover */}
                <div className="flex items-center gap-1 mt-1">
                  {Array.from({ length: topPos.seat?.handCount || 0 }).map((_, i) => (
                    <div key={`ptop-c-${i}`} className="w-3.5 h-6 rounded-xs bg-slate-800 border border-slate-600 shadow-xs" />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* MIDDLE ROW: West Seat (Left), 2D Serpentine Felt Table, East Seat (Right) */}
          <div className="flex-1 flex items-center justify-between px-1 gap-2 my-1 min-h-0">
            {/* LEFT SEAT (Screen West) */}
            {(() => {
              const leftPos = getSeatAtScreenPos('left');
              return (
                <div className="flex flex-col items-center w-28 z-10 shrink-0">
                  {leftPos.seat ? (
                    <div className={`px-3 py-1.5 rounded-2xl border flex flex-col items-center gap-1 shadow-lg transition-all ${
                      leftPos.isCurrentTurn ? 'bg-purple-950/90 border-purple-400 ring-2 ring-purple-400/50' : 'bg-slate-900/80 border-slate-700'
                    }`}>
                      {renderAvatarNode(leftPos.seat.avatar, leftPos.defaultAvatar, 'w-8 h-8')}
                      <span className="text-xs font-black text-white text-center truncate max-w-[90px]">{leftPos.seat.name}</span>
                      <span className="text-[10px] text-slate-400">({leftPos.seat.handCount || 0} kartu)</span>
                      {leftPos.seat.isBot && <span className="text-[9px] text-purple-400 font-mono">[BOT]</span>}
                      {leftPos.isMe && (
                        <button onClick={() => handleStand(leftPos.actualIdx)} className="text-slate-400 hover:text-red-400 text-[10px] mt-0.5" title="Berdiri">
                          <LogOut className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    (!isPlaying || roundWinner) && (
                      <div className="flex flex-col items-center gap-1">
                        {mySeatIdx === -1 && (
                          <button
                            onClick={() => handleSit(leftPos.actualIdx)}
                            className="px-2.5 py-1 rounded-xl bg-slate-900/60 hover:bg-emerald-950/80 border border-slate-700 hover:border-emerald-500/60 text-slate-400 hover:text-emerald-300 text-xs flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Duduk ({leftPos.label})
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const socket = getGlobalSocket();
                            socket.emit('domino:sit', { seatIdx: leftPos.actualIdx, nik: `bot_${leftPos.actualIdx}`, name: `Bot ${leftPos.label}`, avatar: '🤖' });
                          }}
                          className="px-2 py-0.5 rounded-lg bg-slate-900/60 hover:bg-purple-950/80 border border-slate-700 hover:border-purple-500 text-purple-300 text-[10px] font-mono cursor-pointer"
                        >
                          + Bot
                        </button>
                      </div>
                    )
                  )}
                  <div className="flex flex-col gap-0.5 mt-2">
                    {Array.from({ length: leftPos.seat?.handCount || 0 }).map((_, i) => (
                      <div key={`pleft-c-${i}`} className="w-6 h-3 rounded-xs bg-slate-800 border border-slate-600" />
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* ── THE 2D SERPENTINE FELT DOMINO BOARD (CONTOH GAMBAR 2) ── */}
            <div className="flex-1 h-full min-h-[220px] max-h-[460px] rounded-3xl bg-[#064E3B] border-4 border-[#047857] shadow-[inset_0_4px_30px_rgba(0,0,0,0.5)] p-1 flex items-center justify-center relative overflow-hidden">
              {/* Felt watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none select-none">
                <span className="text-7xl sm:text-8xl font-black text-emerald-200 font-mono tracking-widest">GAPLE</span>
              </div>

              {boardChain.length === 0 ? (
                <div className="text-center text-emerald-300/80 text-xs font-mono py-12 flex flex-col items-center gap-2 z-10">
                  <span className="text-3xl animate-bounce">🀄</span>
                  <span>Meja bersih. Tekan "Mulai / Kocok Kartu" untuk membuka putaran balak.</span>
                </div>
              ) : (
                /* High-fidelity 2D Vector Serpentine SVG Canvas matching Image 2 */
                <svg
                  viewBox="0 0 740 250"
                  className="w-full h-full max-h-full z-10 drop-shadow-md select-none"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <filter id="tile-shadow" x="-10%" y="-10%" width="125%" height="125%">
                      <feDropShadow dx="1" dy="1.5" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.45" />
                    </filter>
                    <linearGradient id="tile-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFC" />
                      <stop offset="100%" stopColor="#F5F2EB" />
                    </linearGradient>
                    <linearGradient id="balak-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFDF0" />
                      <stop offset="100%" stopColor="#F9F5DE" />
                    </linearGradient>
                  </defs>

                  {/* Serpentine Connected Tiles */}
                  {layoutTiles.map((t) => {
                    const halfW = t.isVertical ? t.w : t.w / 2;
                    const halfH = t.isVertical ? t.h / 2 : t.h;
                    const cx1 = t.isVertical ? t.x : t.x - t.w / 4;
                    const cy1 = t.isVertical ? t.y - t.h / 4 : t.y;
                    const cx2 = t.isVertical ? t.x : t.x + t.w / 4;
                    const cy2 = t.isVertical ? t.y + t.h / 4 : t.y;

                    return (
                      <g key={t.id} className="transition-transform duration-300">
                        {/* Tile Body */}
                        <rect
                          x={t.x - t.w / 2}
                          y={t.y - t.h / 2}
                          width={t.w}
                          height={t.h}
                          rx={3}
                          fill={t.isBalak ? 'url(#balak-grad)' : 'url(#tile-grad)'}
                          stroke={t.isBalak ? '#B45309' : '#9CA3AF'}
                          strokeWidth={t.isBalak ? '1.2' : '0.8'}
                          filter="url(#tile-shadow)"
                        />

                        {/* Dividing Line */}
                        {t.isVertical ? (
                          <line
                            x1={t.x - t.w / 2 + 1.5}
                            y1={t.y}
                            x2={t.x + t.w / 2 - 1.5}
                            y2={t.y}
                            stroke="#DC2626"
                            strokeWidth={1.4}
                            strokeLinecap="round"
                          />
                        ) : (
                          <line
                            x1={t.x}
                            y1={t.y - t.h / 2 + 1.5}
                            x2={t.x}
                            y2={t.y + t.h / 2 - 1.5}
                            stroke="#DC2626"
                            strokeWidth={1.4}
                            strokeLinecap="round"
                          />
                        )}

                        {/* Red Pips (Half 1 & Half 2) */}
                        {renderSvgPips(t.pip1Val, t.pip1Cx, t.pip1Cy, halfW, halfH)}
                        {renderSvgPips(t.pip2Val, t.pip2Cx, t.pip2Cy, halfW, halfH)}

                        {/* Interactive Clickable Target Rings when choosing which end to attach */}
                        {pendingChoiceTile && t.isLeftEnd && (
                          <g
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmChoice('left');
                            }}
                            className="cursor-pointer group animate-pulse"
                          >
                            <circle
                              cx={t.x}
                              cy={t.y}
                              r={Math.max(t.w, t.h) * 0.7}
                              fill="rgba(245, 158, 11, 0.25)"
                              stroke="#F59E0B"
                              strokeWidth="2.5"
                              strokeDasharray="4 2"
                            />
                            <text
                              x={t.x}
                              y={t.y - t.h / 2 - 4}
                              textAnchor="middle"
                              fontSize="7.5"
                              fontWeight="bold"
                              fill="#FDE68A"
                              className="pointer-events-none drop-shadow-md select-none"
                            >
                              Sambung Sini ({openEnds?.left})
                            </text>
                          </g>
                        )}
                        {pendingChoiceTile && t.isRightEnd && (
                          <g
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmChoice('right');
                            }}
                            className="cursor-pointer group animate-pulse"
                          >
                            <circle
                              cx={t.x}
                              cy={t.y}
                              r={Math.max(t.w, t.h) * 0.7}
                              fill="rgba(16, 185, 129, 0.25)"
                              stroke="#10B981"
                              strokeWidth="2.5"
                              strokeDasharray="4 2"
                            />
                            <text
                              x={t.x}
                              y={t.y + t.h / 2 + 10}
                              textAnchor="middle"
                              fontSize="7.5"
                              fontWeight="bold"
                              fill="#A7F3D0"
                              className="pointer-events-none drop-shadow-md select-none"
                            >
                              Sambung Sini ({openEnds?.right})
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            {/* RIGHT SEAT (Screen East) */}
            {(() => {
              const rightPos = getSeatAtScreenPos('right');
              return (
                <div className="flex flex-col items-center w-28 z-10 shrink-0">
                  {rightPos.seat ? (
                    <div className={`px-3 py-1.5 rounded-2xl border flex flex-col items-center gap-1 shadow-lg transition-all ${
                      rightPos.isCurrentTurn ? 'bg-blue-950/90 border-blue-400 ring-2 ring-blue-400/50' : 'bg-slate-900/80 border-slate-700'
                    }`}>
                      {renderAvatarNode(rightPos.seat.avatar, rightPos.defaultAvatar, 'w-8 h-8')}
                      <span className="text-xs font-black text-white text-center truncate max-w-[90px]">{rightPos.seat.name}</span>
                      <span className="text-[10px] text-slate-400">({rightPos.seat.handCount || 0} kartu)</span>
                      {rightPos.seat.isBot && <span className="text-[9px] text-purple-400 font-mono">[BOT]</span>}
                      {rightPos.isMe && (
                        <button onClick={() => handleStand(rightPos.actualIdx)} className="text-slate-400 hover:text-red-400 text-[10px] mt-0.5" title="Berdiri">
                          <LogOut className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : (
                    (!isPlaying || roundWinner) && (
                      <div className="flex flex-col items-center gap-1">
                        {mySeatIdx === -1 && (
                          <button
                            onClick={() => handleSit(rightPos.actualIdx)}
                            className="px-2.5 py-1 rounded-xl bg-slate-900/60 hover:bg-emerald-950/80 border border-slate-700 hover:border-emerald-500/60 text-slate-400 hover:text-emerald-300 text-xs flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Duduk ({rightPos.label})
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const socket = getGlobalSocket();
                            socket.emit('domino:sit', { seatIdx: rightPos.actualIdx, nik: `bot_${rightPos.actualIdx}`, name: `Bot ${rightPos.label}`, avatar: '🤖' });
                          }}
                          className="px-2 py-0.5 rounded-lg bg-slate-900/60 hover:bg-purple-950/80 border border-slate-700 hover:border-purple-500 text-purple-300 text-[10px] font-mono cursor-pointer"
                        >
                          + Bot
                        </button>
                      </div>
                    )
                  )}
                  <div className="flex flex-col gap-0.5 mt-2">
                    {Array.from({ length: rightPos.seat?.handCount || 0 }).map((_, i) => (
                      <div key={`pright-c-${i}`} className="w-6 h-3 rounded-xs bg-slate-800 border border-slate-600" />
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* BOTTOM SEAT & PLAYER CONTROLS (Screen South - Player Perspective) */}
          <div className="flex flex-col items-center z-10 shrink-0 mt-1">
            {/* If player is not seated at all */}
            {mySeatIdx === -1 ? (
              (() => {
                const bottomPos = getSeatAtScreenPos('bottom');
                return (
                  <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-900/90 border border-emerald-500/30">
                    <span className="text-xs text-slate-300 font-bold">
                      {bottomPos.seat ? `${bottomPos.seat.name} duduk di Kursi Bawah` : 'Kursi Bawah kosong:'}
                    </span>
                    {!bottomPos.seat && (
                      <button
                        onClick={() => handleSit(bottomPos.actualIdx)}
                        className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-md"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Ambil Kursi ({bottomPos.label})
                      </button>
                    )}
                  </div>
                );
              })()
            ) : (
              <>
                {/* User Player Pill at Bottom of Table */}
                <div className="flex items-center gap-2 mb-1 px-3 py-1 rounded-xl bg-slate-900/95 border border-emerald-500/50 shadow-md">
                  {renderAvatarNode(playerAvatar, '☕', 'w-6 h-6')}
                  <span className="text-xs font-black text-white">{playerName} (Anda)</span>
                  <span className="text-[10px] text-emerald-300 font-bold ml-1">({myHand.length} kartu)</span>
                  {isPlaying && isMyTurn && (
                    <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/30 text-emerald-300 font-mono font-bold rounded animate-pulse border border-emerald-400/50">
                      GILIRAN ANDA
                    </span>
                  )}
                </div>

                {/* Ambiguous Choice Modal (Left or Right) */}
                {pendingChoiceTile && openEnds && (
                  <div className="mb-2 p-2.5 rounded-2xl bg-slate-900/95 border-2 border-emerald-400 shadow-2xl flex flex-wrap items-center justify-between gap-3 animate-in zoom-in-95">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Sambung Kartu <strong>[{pendingChoiceTile.left}|{pendingChoiceTile.right}]</strong> ke mana?</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmChoice('left')}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Ujung Kiri ({openEnds.left})
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmChoice('right')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95"
                      >
                        Ujung Kanan ({openEnds.right}) <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingChoiceTile(null)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Batal"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Hand Tiles Tray */}
                <div className="flex items-center gap-2 p-2 rounded-2xl bg-slate-950/90 border border-emerald-500/40 shadow-2xl overflow-x-auto max-w-full">
                  {myHand.map((tile) => {
                    const { canLeft, canRight } = getPlayableSides(tile, openEnds);
                    const isPlayable = isPlaying && isMyTurn && (canLeft || canRight);
                    const isBalak = tile.left === tile.right;

                    return (
                      <div
                        key={tile.id}
                        onClick={() => isPlayable && handleTileClick(tile)}
                        className={`relative w-9 h-18 rounded-lg border-2 flex flex-col items-center justify-between p-1 transition-all shrink-0 ${
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
                  {isPlaying && isMyTurn && !playerHasMove && (
                    <button
                      type="button"
                      onClick={handlePass}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg animate-bounce cursor-pointer shrink-0"
                    >
                      Lewat (Pass)!
                    </button>
                  )}
                </div>

                {/* Player Info Badge */}
                <div className="mt-1 flex items-center gap-2 text-xs font-black text-emerald-400">
                  <div className="flex items-center gap-1.5">
                    {renderAvatarNode(playerAvatar, '👷', 'w-5 h-5')}
                    <span>{playerName} (Anda - Kursi {mySeatIdx === 0 ? 'Selatan' : mySeatIdx === 1 ? 'Barat' : mySeatIdx === 2 ? 'Utara' : 'Timur'})</span>
                  </div>
                  <span>•</span>
                  <span className={isMyTurn ? 'text-amber-400 animate-pulse' : 'text-slate-400'}>
                    {isMyTurn ? 'GILIRAN ANDA' : `Giliran: ${activeTurnPlayer?.name || 'Menunggu...'}`}
                  </span>
                  <button
                    onClick={() => handleStand(mySeatIdx)}
                    className="ml-3 text-[10px] text-slate-400 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3 h-3" /> Berdiri
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
