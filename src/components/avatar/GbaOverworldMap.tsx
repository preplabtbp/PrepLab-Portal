import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  GbaGrassTile, GbaDarkGrassTile, GbaFlowerTile, GbaSignpostTile,
  GbaNickelDrumTile, GbaBenchTiles, GbaCoffeeMachineTile, GbaAshtrayTile,
  GbaPokemonCenterBuilding, GbaBirchLabBuilding, GbaTerracottaRoofBuilding, GbaTreeTile 
} from './GbaTileData';
import {
  GbaLabWallTile, GbaLabFloorTile, GbaPrepWallTile, GbaPrepFloorTile,
  GbaWorkshopFloorTile, GbaWarehouseFloorTile, GbaWoodFloorTile,
  GbaXrfSpectrometer, GbaFusionFurnace, GbaAnalyticalBalance, GbaFumeHood,
  GbaJawCrusher, GbaPulverizerMill, GbaDryingOven, GbaJonesSplitter,
  GbaWorkshopBench, GbaLotoStation, GbaWarehouseRack, GbaQaWorkstation, GbaIsoPlaque,
  GbaMineVistaPanorama, GbaMineVistaTile, GbaGazeboPillarTile, GbaGazeboTerraceTile, 
  GbaGazeboNBench, GbaGazeboBench, GbaGazeboLowBench,
  GbaPrepLabBanner, GbaGazeboTable, GbaWaterCooler, GbaShiftBoard,
  GbaNickelAshtray, GbaCoffeeUrn, GBA_GAZEBO_PAVING_BASE64
} from './GbaSectionRooms';
import { GbaCharacterSprite } from './GbaCharacterSprite';
import { 
  GbaLoungeGhostNpc, 
  GbaUndergroundDominoTable, 
  GbaUndergroundChessTable, 
  GbaUndergroundLadder, 
  GbaUndergroundLantern 
} from '../home-widgets/lounge/LoungeFurnitureSvg';

export type GbaRoomType = 'laboratory' | 'preparation' | 'maintenance' | 'warehouse' | 'qa' | 'lounge_nickel' | 'underground_lounge';

export interface GbaInteractivePlayer {
  id: string;
  name: string;
  nik: string;
  x: number;
  y: number;
  facing: 'down' | 'up' | 'left' | 'right';
  actionState?: 'idle' | 'walk' | 'sit' | 'coffee' | 'smoke';
  pangkatName?: string;
  pangkatIcon?: string;
  headwearId?: string;
  headwearColor?: string;
  outfitId?: string;
  outfitColor?: string;
  message?: string;
}

export interface GbaOverworldMapProps {
  roomType?: GbaRoomType;
  playerNik: string;
  playerName: string;
  playerRankName?: string;
  playerRankIcon?: string;
  headwearId?: string;
  headwearColor?: string;
  outfitId?: string;
  outfitColor?: string;
  bootsColor?: string;
  playerMessage?: string;
  playerActionState?: 'idle' | 'walk' | 'sit' | 'coffee' | 'smoke';
  otherPlayers?: GbaInteractivePlayer[];
  soundEnabled?: boolean;
  onOpenWardrobe?: () => void;
  onSyncProfile?: () => void;
  onOpenFullLounge?: () => void;
  onPlayerMove?: (pos: { x: number; y: number; facing: 'down' | 'up' | 'left' | 'right'; actionState: string }) => void;
  onPlayerAction?: (action: { actionState: string; facing?: 'down' | 'up' | 'left' | 'right'; speechText?: string; x: number; y: number }) => void;
  onPlayGhostRps?: () => void;
  isSecretHoleUnlocked?: boolean;
  onEnterSecretDomino?: () => void;
  onAscendToGazebo?: () => void;
  onOpenDominoGame?: (seat?: 'top' | 'bottom' | 'left' | 'right') => void;
  onOpenChessGame?: (seat?: 'left' | 'right') => void;
  className?: string;
  isCompactDiorama?: boolean;
}

/**
 * Authentic Web Audio GBA synth sound synthesizer
 */
function playGbaSound(type: 'beep' | 'step' | 'confirm' | 'item') {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'step') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.035);
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.start(now);
      osc.stop(now + 0.035);
    } else if (type === 'beep') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'confirm') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(523, now);
      osc.frequency.setValueAtTime(659, now + 0.05);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'item') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.06);
      osc.frequency.setValueAtTime(659, now + 0.12);
      osc.frequency.setValueAtTime(880, now + 0.18);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {}
}

/**
 * Dynamic Content-Hugging Overhead Speech Bubble
 * Perfectly sizes to fit short or long text with zero bloated margins
 */
const GbaOverheadSpeechBubble: React.FC<{
  x: number;
  y: number;
  text: string;
  maxWidth?: number;
}> = ({ x, y, text, maxWidth = 90 }) => {
  if (!text || !text.trim()) return null;

  const clean = text.trim();
  const words = clean.split(' ');
  const line1Words: string[] = [];
  const line2Words: string[] = [];

  let len = 0;
  for (const w of words) {
    if (len + w.length <= 18 || line1Words.length === 0) {
      line1Words.push(w);
      len += w.length + 1;
    } else if (line2Words.join(' ').length + w.length <= 19) {
      line2Words.push(w);
    } else {
      break;
    }
  }

  const line1 = line1Words.join(' ');
  const line2 = line2Words.join(' ');
  const isTwoLines = line2.length > 0;

  // Precision hugging: ~2.15px per monospace character + 5px horizontal padding
  const maxChars = Math.max(line1.length, line2.length);
  const calculatedW = maxChars * 2.2 + 5.5;
  const bubbleW = Math.max(13, Math.min(maxWidth, calculatedW));
  const bubbleH = isTwoLines ? 12 : 7.5;
  const bubbleX = -bubbleW / 2;
  const bubbleY = -bubbleH - 5;

  return (
    <g transform={`translate(${x}, ${y})`} pointerEvents="none">
      {/* Drop shadow */}
      <rect
        x={bubbleX + 0.5}
        y={bubbleY + 0.5}
        width={bubbleW}
        height={bubbleH}
        rx={1.5}
        fill="#000000"
        opacity={0.35}
      />

      {/* Bubble Body */}
      <rect
        x={bubbleX}
        y={bubbleY}
        width={bubbleW}
        height={bubbleH}
        rx={1.5}
        fill="#FFFFFF"
        stroke="#10141C"
        strokeWidth={0.7}
      />

      {/* Downward Pointer Tail */}
      <polygon points="-2,-5 2,-5 0,-1.5" fill="#FFFFFF" />
      <polygon points="-2,-5 2,-5 0,-1.5" fill="none" stroke="#10141C" strokeWidth={0.7} />

      {/* Text Lines */}
      {isTwoLines ? (
        <>
          <text
            x={0}
            y={bubbleY + 4.2}
            textAnchor="middle"
            fontSize="3.1"
            fontFamily="monospace"
            fontWeight="900"
            fill="#0F172A"
          >
            {line1}
          </text>
          <text
            x={0}
            y={bubbleY + 8.8}
            textAnchor="middle"
            fontSize="3.1"
            fontFamily="monospace"
            fontWeight="900"
            fill="#0F172A"
          >
            {line2}
          </text>
        </>
      ) : (
        <text
          x={0}
          y={bubbleY + 4.8}
          textAnchor="middle"
          fontSize="3.2"
          fontFamily="monospace"
          fontWeight="900"
          fill="#0F172A"
        >
          {line1}
        </text>
      )}
    </g>
  );
};

export const GbaOverworldMap: React.FC<GbaOverworldMapProps> = ({
  roomType = 'preparation',
  playerNik,
  playerName,
  playerRankName = 'Trainee',
  playerRankIcon = '/assets/ranks/rank_01_trainee.svg',
  headwearId = 'helmet_white',
  headwearColor = '#FFFFFF',
  outfitId = 'uniform_tbp',
  outfitColor = '#84CC16',
  bootsColor = '#22C55E',
  playerMessage,
  playerActionState,
  otherPlayers = [],
  soundEnabled = true,
  onOpenWardrobe,
  onSyncProfile,
  onOpenFullLounge,
  onPlayerMove,
  onPlayerAction,
  onPlayGhostRps,
  isSecretHoleUnlocked = false,
  onEnterSecretDomino,
  onAscendToGazebo,
  onOpenDominoGame,
  onOpenChessGame,
  className = '',
  isCompactDiorama = false
}) => {
  // ── HARVEST MOON: BACK TO NATURE COZY INTIMATE PROPORTIONS ──
  // Interior Rooms: 11 cols x 8 rows = 176x128 pixels (Zoomed-in intimate workshop/lab)
  // Lounge Gazebo & Underground Bunker: 12 cols x 8 rows = 192x128 pixels (Cozy rest shelter)
  const isLounge = roomType === 'lounge_nickel' || roomType === 'underground_lounge';
  const MAP_COLS = isLounge ? 12 : 11;
  const MAP_ROWS = 8;
  const MAP_WIDTH = MAP_COLS * 16;
  const MAP_HEIGHT = MAP_ROWS * 16;

  // Real-time multi-client callback refs
  const onPlayerMoveRef = useRef(onPlayerMove);
  onPlayerMoveRef.current = onPlayerMove;
  const onPlayerActionRef = useRef(onPlayerAction);
  onPlayerActionRef.current = onPlayerAction;

  // Initial Player Coordinates: Centered on the floor
  const [posX, setPosX] = useState(() => (roomType === 'underground_lounge' ? 1.5 : (isLounge ? 3.44 : 5)));
  const [posY, setPosY] = useState(() => (roomType === 'underground_lounge' ? 2.4 : (isLounge ? 4.75 : 4.5)));
  const [facing, setFacing] = useState<'down' | 'up' | 'left' | 'right'>(() => (roomType === 'underground_lounge' ? 'down' : 'right'));
  const [walkFrame, setWalkFrame] = useState(0);
  const [actionState, setActionState] = useState<'idle' | 'walk' | 'sit' | 'coffee' | 'smoke'>(
    () => (roomType === 'underground_lounge' ? 'idle' : (isLounge ? 'sit' : 'idle'))
  );

  // Transition coordinates between Gazebo and Underground Lounge
  useEffect(() => {
    if (roomType === 'underground_lounge') {
      setPosX(1.5);
      setPosY(2.4);
      setFacing('down');
      setActionState('idle');
      movementRef.current.currentX = 1.5;
      movementRef.current.currentY = 2.4;
      movementRef.current.targetX = 1.5;
      movementRef.current.targetY = 2.4;
      movementRef.current.facing = 'down';
    } else if (roomType === 'lounge_nickel') {
      setPosX(2.35);
      setPosY(6.2);
      setFacing('up');
      setActionState('idle');
      movementRef.current.currentX = 2.35;
      movementRef.current.currentY = 6.2;
      movementRef.current.targetX = 2.35;
      movementRef.current.targetY = 6.2;
      movementRef.current.facing = 'up';
    }
  }, [roomType]);

  // Sync external playerActionState if provided
  useEffect(() => {
    if (playerActionState) {
      setActionState(playerActionState);
    }
  }, [playerActionState]);

  // Smooth Movement Destination & Target Beacon
  const [clickTarget, setClickTarget] = useState<{ x: number; y: number } | null>(null);

  // Local speech bubble triggered by user interactions
  const [localSpeech, setLocalSpeech] = useState<string | null>(null);
  const speechTimerRef = useRef<any>(null);

  // START Menu state
  const [showStartMenu, setShowStartMenu] = useState(false);

  const playSfx = useCallback((type: 'beep' | 'step' | 'confirm' | 'item') => {
    if (soundEnabled) playGbaSound(type);
  }, [soundEnabled]);

  const triggerOverheadSpeech = useCallback((text: string) => {
    setLocalSpeech(text);
    if (speechTimerRef.current) clearTimeout(speechTimerRef.current);
    speechTimerRef.current = setTimeout(() => {
      setLocalSpeech(null);
    }, 5500);
  }, []);

  // Sync external playerMessage if changed
  useEffect(() => {
    if (playerMessage && playerMessage.trim()) {
      triggerOverheadSpeech(playerMessage);
    }
  }, [playerMessage, triggerOverheadSpeech]);

  // -------------------------------------------------------------
  // ULTRA-SMOOTH CONTINUOUS MOVEMENT ENGINE (REQUESTANIMATIONFRAME)
  // -------------------------------------------------------------
  const movementRef = useRef<{
    currentX: number;
    currentY: number;
    targetX: number | null;
    targetY: number | null;
    facing: 'down' | 'up' | 'left' | 'right';
    walkDistance: number;
    pendingAction: 'idle' | 'sit' | 'smoke' | 'coffee' | null;
    pendingSpeech: string | null;
    pendingFacing: 'down' | 'up' | 'left' | 'right' | null;
    pendingCallback: (() => void) | null;
  }>({
    currentX: isLounge ? 3 : 5,
    currentY: isLounge ? 4.8 : 4.5,
    targetX: null,
    targetY: null,
    facing: 'down',
    walkDistance: 0,
    pendingAction: null,
    pendingSpeech: null,
    pendingFacing: null,
    pendingCallback: null
  });

  // Keep ref synchronized with position
  useEffect(() => {
    movementRef.current.currentX = posX;
    movementRef.current.currentY = posY;
    movementRef.current.facing = facing;
  }, [posX, posY, facing]);

  // Continuous 60fps Game Loop for silky smooth walking
  useEffect(() => {
    let animId: number;
    let lastStepSoundTime = 0;
    let lastMoveEmitTime = 0;

    const gameLoop = () => {
      const state = movementRef.current;

      if (state.targetX !== null && state.targetY !== null) {
        const dx = state.targetX - state.currentX;
        const dy = state.targetY - state.currentY;
        const dist = Math.hypot(dx, dy);

        // Arrival threshold (snap exactly to destination)
        if (dist < 0.08) {
          state.currentX = state.targetX;
          state.currentY = state.targetY;
          state.targetX = null;
          state.targetY = null;
          setPosX(state.currentX);
          setPosY(state.currentY);
          setClickTarget(null);

          // Execute contextual action upon arrival
          const finalAction = state.pendingAction || 'idle';
          setActionState(finalAction);
          let finalFacing = state.facing;
          if (state.pendingFacing) {
            finalFacing = state.pendingFacing;
            state.facing = finalFacing;
            setFacing(finalFacing);
          } else if (state.pendingAction === 'sit') {
            finalFacing = 'down';
            state.facing = finalFacing;
            setFacing(finalFacing);
          }

          const finalSpeech = state.pendingSpeech || undefined;
          if (state.pendingSpeech) {
            triggerOverheadSpeech(state.pendingSpeech);
            state.pendingSpeech = null;
          }
          state.pendingAction = null;
          state.pendingFacing = null;

          const onArriveCb = state.pendingCallback;
          state.pendingCallback = null;
          if (onArriveCb) {
            onArriveCb();
          }

          // Broadcast arrival & final action state to all players in lounge
          onPlayerActionRef.current?.({
            actionState: finalAction,
            facing: finalFacing,
            speechText: finalSpeech,
            x: Number(state.currentX.toFixed(2)),
            y: Number(state.currentY.toFixed(2))
          });
        } else {
          // Move towards target smoothly at 0.07 tiles per frame (~4.2 tiles/sec)
          const speed = 0.07;
          let nextX = state.currentX;
          let nextY = state.currentY;
          let newFacing = state.facing;

          if (Math.abs(dx) > 0.05) {
            const step = Math.sign(dx) * Math.min(speed, Math.abs(dx));
            nextX += step;
            newFacing = dx > 0 ? 'right' : 'left';
          } else if (Math.abs(dy) > 0.05) {
            const step = Math.sign(dy) * Math.min(speed, Math.abs(dy));
            nextY += step;
            newFacing = dy > 0 ? 'down' : 'up';
          }

          state.currentX = nextX;
          state.currentY = nextY;
          state.facing = newFacing;
          state.walkDistance += speed;

          setPosX(nextX);
          setPosY(nextY);
          setFacing(newFacing);
          setWalkFrame(Math.floor(state.walkDistance * 3.5) % 4);

          const now = Date.now();
          // Subtle retro footstep sound every 250ms while walking
          if (now - lastStepSoundTime > 240) {
            playSfx('step');
            lastStepSoundTime = now;
          }

          // Broadcast real-time walking coordinate stream to other lounge players (every 120ms)
          if (now - lastMoveEmitTime > 120) {
            lastMoveEmitTime = now;
            onPlayerMoveRef.current?.({
              x: Number(nextX.toFixed(2)),
              y: Number(nextY.toFixed(2)),
              facing: newFacing,
              actionState: 'walk'
            });
          }
        }
      }

      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [playSfx, triggerOverheadSpeech]);

  // Command Avatar to Move to Target Location
  const startMoveTo = useCallback((targetTileX: number, targetTileY: number, onArrival?: {
    action?: 'idle' | 'sit' | 'smoke' | 'coffee';
    speech?: string;
    facing?: 'down' | 'up' | 'left' | 'right';
    callback?: () => void;
  }) => {
    // Clamp inside walkable floor boundaries
    const minX = isLounge ? 0.8 : 1.2;
    const maxX = isLounge ? MAP_COLS - 1.2 : MAP_COLS - 1.5;
    const minY = isLounge ? 3.0 : 2.8;
    const maxY = MAP_ROWS - 1.5;

    const clampX = Math.max(minX, Math.min(maxX, targetTileX));
    const clampY = Math.max(minY, Math.min(maxY, targetTileY));

    // Place tactical golden reticle EXACTLY where clicked
    setClickTarget({ x: clampX, y: clampY });
    setActionState('walk');

    movementRef.current.targetX = clampX;
    movementRef.current.targetY = clampY;
    movementRef.current.pendingAction = onArrival?.action || null;
    movementRef.current.pendingSpeech = onArrival?.speech || null;
    movementRef.current.pendingFacing = onArrival?.facing || null;
    movementRef.current.pendingCallback = onArrival?.callback || null;

    // Immediately inform other lounge members of walking intent and destination
    onPlayerMoveRef.current?.({
      x: clampX,
      y: clampY,
      facing: movementRef.current.facing,
      actionState: 'walk'
    });

    playSfx('beep');
  }, [isLounge, MAP_COLS, MAP_ROWS, playSfx]);

  // Check if a seat slot is already occupied by another player
  const isSeatSlotOccupied = useCallback((slotX: number, slotY: number): boolean => {
    if (!otherPlayers || otherPlayers.length === 0) return false;
    return otherPlayers.some(p => {
      const isSittingOther = p.actionState === 'sit';
      const dist = Math.hypot(p.x - slotX, p.y - slotY);
      return isSittingOther && dist < 0.65;
    });
  }, [otherPlayers]);

  // Direct Tap Interaction Handler (With 100% Precise SVG Coordinates)
  const handleDirectTap = useCallback((tx: number, ty: number) => {
    // 1. Lounge Door (Col 8.5..10.5, Row 4.8..6.5 in interior rooms)
    if (!isLounge && tx >= 8.5 && tx <= 10.5 && ty >= 4.8 && ty <= 6.5) {
      startMoveTo(9, 5.5, {
        action: 'idle',
        speech: '🚪 Masuk ke Gazebo Lounge Tambang...'
      });
      setTimeout(() => {
        if (onOpenFullLounge) onOpenFullLounge();
      }, 700);
      return;
    }

    // 2. Specific Objects per Room
    if (roomType === 'lounge_nickel') {
      // 1. Communal Snack & Coffee Table in Center: (x: 4.5..7.5, y: 4.4..5.8)
      if (tx >= 4.5 && tx <= 7.5 && ty >= 4.4 && ty <= 5.8) {
        startMoveTo(6.0, 5.8, { action: 'coffee', speech: '☕ Mencicipi pisang goreng hangat & ngopi bareng rekan di meja tengah!' });
        return;
      }

      // 2. Bangku Panjang Berbentuk 'n' - SISI KIRI (Kapasitas Maksimal 3 Orang, Menghadap ke KANAN): (x: 2.6..4.4, y: 3.4..6.5)
      if (tx >= 2.6 && tx <= 4.4 && ty >= 3.4 && ty <= 6.5) {
        const leftSlots = [
          { x: 3.44, y: 4.05 },
          { x: 3.44, y: 4.75 },
          { x: 3.44, y: 5.45 }
        ];
        // Pilih slot terdekat yang masih kosong
        const sortedSlots = [...leftSlots].sort((a, b) => 
          Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty)
        );
        const availableSlot = sortedSlots.find(s => !isSeatSlotOccupied(s.x, s.y));

        if (availableSlot) {
          startMoveTo(availableSlot.x, availableSlot.y, { 
            action: 'sit', 
            facing: 'right'
          });
          return;
        } else {
          // Bangku sisi kiri penuh (kapasitas 3 orang sudah terisi semua!)
          playSfx('beep');
          triggerOverheadSpeech('⚠️ Bangku sisi kiri sudah penuh (maksimal 3 orang)! Silakan pilih sisi lain.');
          return;
        }
      }

      // 3. Bangku Panjang Berbentuk 'n' - SISI ATAS (Kapasitas Maksimal 3 Orang, Menghadap ke BAWAH): (x: 4.0..7.2, y: 2.9..4.3)
      if (tx >= 4.0 && tx <= 7.2 && ty >= 2.9 && ty <= 4.3) {
        const topSlots = [
          { x: 4.5, y: 3.45 },
          { x: 5.5, y: 3.45 },
          { x: 6.5, y: 3.45 }
        ];
        // Pilih slot terdekat yang masih kosong
        const sortedSlots = [...topSlots].sort((a, b) => 
          Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty)
        );
        const availableSlot = sortedSlots.find(s => !isSeatSlotOccupied(s.x, s.y));

        if (availableSlot) {
          startMoveTo(availableSlot.x, availableSlot.y, { 
            action: 'sit', 
            facing: 'down'
          });
          return;
        } else {
          // Bangku sisi atas penuh (kapasitas 3 orang sudah terisi semua!)
          playSfx('beep');
          triggerOverheadSpeech('⚠️ Bangku sisi atas sudah penuh (maksimal 3 orang)! Silakan pilih sisi lain.');
          return;
        }
      }

      // 4. Bangku Panjang Berbentuk 'n' - SISI KANAN (Kapasitas Maksimal 3 Orang, Menghadap ke KIRI): (x: 7.6..9.4, y: 3.4..6.5)
      if (tx >= 7.6 && tx <= 9.4 && ty >= 3.4 && ty <= 6.5) {
        const rightSlots = [
          { x: 7.56, y: 4.05 },
          { x: 7.56, y: 4.75 },
          { x: 7.56, y: 5.45 }
        ];
        // Pilih slot terdekat yang masih kosong
        const sortedSlots = [...rightSlots].sort((a, b) => 
          Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty)
        );
        const availableSlot = sortedSlots.find(s => !isSeatSlotOccupied(s.x, s.y));

        if (availableSlot) {
          startMoveTo(availableSlot.x, availableSlot.y, { 
            action: 'sit', 
            facing: 'left'
          });
          return;
        } else {
          // Bangku sisi kanan penuh (kapasitas 3 orang sudah terisi semua!)
          playSfx('beep');
          triggerOverheadSpeech('⚠️ Bangku sisi kanan sudah penuh (maksimal 3 orang)! Silakan pilih sisi lain.');
          return;
        }
      }

      // "PREPARATION & LABORATORY" Plaque Banner: (x: 2.6..9.2, y: 1.4..2.8)
      if (tx >= 2.6 && tx <= 9.2 && ty >= 1.4 && ty <= 2.8) {
        startMoveTo(5.8, 3.8, { speech: '🏆 Gazebo K3 Departemen PREPARATION & LABORATORY' });
        return;
      }
      // K3 Safety Notice & Shift Schedule Board (Menempel di Dinding/Pagar Pilar Kiri): (x: 0.0..1.4, y: 1.8..3.6)
      if (tx >= 0.0 && tx <= 1.4 && ty >= 1.8 && ty <= 3.6) {
        startMoveTo(1.2, 3.6, { speech: '📋 Target K3 Shift: Zero Accident & Safety First!' });
        return;
      }
      // K3 Drinking Water Gallon Dispenser: (x: 10.0..11.6, y: 3.5..5.0)
      if (tx >= 10.0 && tx <= 11.6 && ty >= 3.5 && ty <= 5.0) {
        startMoveTo(9.8, 4.6, { speech: '💧 Isi tumbler air minum dingin segar K3' });
        return;
      }
      // Stainless Steel Ashtray: (x: 9.8..11.4, y: 5.2..6.6)
      if (tx >= 9.8 && tx <= 11.4 && ty >= 5.2 && ty <= 6.6) {
        startMoveTo(9.8, 5.8, { action: 'smoke', speech: '🚬 Santai sejenak merokok di Gazebo K3' });
        return;
      }
      // Sample Ore Drum: (x: 0.2..1.5, y: 4.2..5.2)
      if (tx >= 0.2 && tx <= 1.5 && ty >= 4.2 && ty <= 5.2) {
        startMoveTo(1.4, 4.8, { speech: '🪨 Sampel bijih ore limonite dari tambang' });
        return;
      }
    } else if (roomType === 'underground_lounge') {
      // 1. Tangga Naik ke Gazebo: (x: 0.5..2.2, y: 1.0..3.2)
      if (tx >= 0.5 && tx <= 2.2 && ty >= 1.0 && ty <= 3.2) {
        startMoveTo(1.5, 2.4, {
          action: 'idle',
          facing: 'up',
          speech: '🪜 Menaiki tangga kembali ke Gazebo...',
          callback: () => {
            if (onAscendToGazebo) onAscendToGazebo();
          }
        });
        return;
      }

      // 2. Meja Gaple 4 Kursi: (x: 2.0..5.8, y: 3.2..6.2)
      if (tx >= 2.0 && tx <= 5.8 && ty >= 3.2 && ty <= 6.2) {
        const dominoSlots = [
          { x: 3.8, y: 3.45, facing: 'down' as const, seat: 'top' as const },
          { x: 3.8, y: 5.75, facing: 'up' as const, seat: 'bottom' as const },
          { x: 2.2, y: 4.6, facing: 'right' as const, seat: 'left' as const },
          { x: 5.4, y: 4.6, facing: 'left' as const, seat: 'right' as const }
        ];
        const sortedSlots = [...dominoSlots].sort((a, b) => 
          Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty)
        );
        const chosen = sortedSlots[0];
        startMoveTo(chosen.x, chosen.y, {
          action: 'sit',
          facing: chosen.facing,
          speech: `🀄 Duduk di Kursi ${chosen.seat.toUpperCase()} Meja Gaple...`,
          callback: () => {
            if (onOpenDominoGame) onOpenDominoGame(chosen.seat);
          }
        });
        return;
      }

      // 3. Meja Catur 2 Kursi: (x: 7.2..10.6, y: 3.2..6.2)
      if (tx >= 7.2 && tx <= 10.6 && ty >= 3.2 && ty <= 6.2) {
        const chessSlots = [
          { x: 7.4, y: 4.6, facing: 'right' as const, seat: 'left' as const },
          { x: 10.2, y: 4.6, facing: 'left' as const, seat: 'right' as const }
        ];
        const sortedSlots = [...chessSlots].sort((a, b) => 
          Math.hypot(a.x - tx, a.y - ty) - Math.hypot(b.x - tx, b.y - ty)
        );
        const chosen = sortedSlots[0];
        startMoveTo(chosen.x, chosen.y, {
          action: 'sit',
          facing: chosen.facing,
          speech: `♟️ Duduk di Kursi ${chosen.seat === 'left' ? 'Putih' : 'Hitam'} Meja Catur...`,
          callback: () => {
            if (onOpenChessGame) onOpenChessGame(chosen.seat);
          }
        });
        return;
      }

      // 4. Peti Sampel Kayu Bawah Kiri: (x: 0.4..2.0, y: 5.5..7.5)
      if (tx >= 0.4 && tx <= 2.0 && ty >= 5.5 && ty <= 7.5) {
        startMoveTo(1.6, 6.2, { speech: '📦 Peti perlengkapan & sampel limonite tambang rahasia' });
        return;
      }

      // 5. Drum Bahan Bakar Cadangan Bawah Kanan: (x: 9.8..11.6, y: 5.5..7.5)
      if (tx >= 9.8 && tx <= 11.6 && ty >= 5.5 && ty <= 7.5) {
        startMoveTo(9.8, 6.2, { speech: '🛢️ Drum cadangan bahan bakar & solar bunker K3' });
        return;
      }
    } else {
      // Specific Machine Clicks in Interior Rooms
      if (roomType === 'laboratory') {
        if (tx >= 1 && tx <= 3 && ty >= 1 && ty <= 2.8) {
          startMoveTo(2, 3.2, { speech: '🧪 Spektrometri XRF Ni/Fe Siaga' });
          return;
        }
        if (tx >= 4 && tx <= 6 && ty >= 1 && ty <= 2.8) {
          startMoveTo(5, 3.2, { speech: '🔥 Fusion Furnace 1050°C Siaga' });
          return;
        }
        if (tx >= 7 && tx <= 9 && ty >= 1 && ty <= 2.8) {
          startMoveTo(8, 3.2, { speech: '⚗️ Fume Hood Lemari Asam Aktif' });
          return;
        }
        if (tx >= 8.8 && tx <= 10.2 && ty >= 2.8 && ty <= 4.2) {
          startMoveTo(8.5, 3.8, { speech: '⚖️ Timbangan 4 Desimal Kalibrasi' });
          return;
        }
      } else if (roomType === 'preparation') {
        if (tx >= 1 && tx <= 3 && ty >= 1 && ty <= 2.8) {
          startMoveTo(2, 3.2, { speech: '🔨 Jaw Crusher Bijih Ore Siaga' });
          return;
        }
        if (tx >= 4 && tx <= 6 && ty >= 1 && ty <= 2.8) {
          startMoveTo(5, 3.2, { speech: '⚡ Pulverizer 200 Mesh Siaga' });
          return;
        }
        if (tx >= 7 && tx <= 9 && ty >= 1 && ty <= 2.8) {
          startMoveTo(8, 3.2, { speech: '🌡️ Drying Oven 105°C Menyala' });
          return;
        }
        if (tx >= 8.8 && tx <= 10.2 && ty >= 2.8 && ty <= 4.2) {
          startMoveTo(8.5, 3.8, { speech: '📐 Jones Riffle Splitter' });
          return;
        }
        if (tx >= 0.5 && tx <= 2.2 && ty >= 4.5 && ty <= 6.0) {
          startMoveTo(1.5, 5.2, { speech: '🛢️ Sample Limonite & Saprolite' });
          return;
        }
      } else if (roomType === 'maintenance') {
        if (tx >= 1 && tx <= 3.2 && ty >= 1 && ty <= 2.8) {
          startMoveTo(2, 3.2, { speech: '🔧 Meja Kerja Ragum & Tools' });
          return;
        }
        if (tx >= 4 && tx <= 5.5 && ty >= 1 && ty <= 2.8) {
          startMoveTo(4.5, 3.2, { speech: '🔒 Panel K3 LOTO Lockout' });
          return;
        }
        if (tx >= 6 && tx <= 8.5 && ty >= 1 && ty <= 2.8) {
          startMoveTo(7, 3.2, { speech: '⚙️ Suku Cadang Motor & V-Belt' });
          return;
        }
      } else if (roomType === 'warehouse') {
        if (tx >= 1 && tx <= 3.5 && ty >= 1 && ty <= 2.8) {
          startMoveTo(2, 3.2, { speech: '📦 Stok Flux Litium Tetraborat' });
          return;
        }
        if (tx >= 4 && tx <= 6.5 && ty >= 1 && ty <= 2.8) {
          startMoveTo(5, 3.2, { speech: '📦 Stok XRF Cups & Binder' });
          return;
        }
        if (tx >= 7 && tx <= 9.5 && ty >= 1 && ty <= 2.8) {
          startMoveTo(8, 3.2, { speech: '📦 Stok Reagen Kimia Analisis' });
          return;
        }
      } else if (roomType === 'qa') {
        if (tx >= 3 && tx <= 6.5 && ty >= 1 && ty <= 2.8) {
          startMoveTo(4.5, 3.2, { speech: '💻 Sistem LIMS & Kurva 2-Sigma' });
          return;
        }
        if (tx >= 0.8 && tx <= 2.5 && ty >= 0.8 && ty <= 2.5) {
          startMoveTo(2, 3.2, { speech: '🏆 Akreditasi ISO/IEC 17025' });
          return;
        }
      }
    }

    // Default: WALK PRECISELY TO WHERE CLICKED ON THE FLOOR (With Anti-Overlap)
    let finalTx = tx;
    let finalTy = ty;
    if (otherPlayers && otherPlayers.length > 0) {
      for (const p of otherPlayers) {
        if (Math.hypot(p.x - finalTx, p.y - finalTy) < 0.45) {
          finalTx += 0.55;
          if (finalTx > MAP_COLS - 1.5) finalTx -= 1.1;
        }
      }
    }
    startMoveTo(finalTx, finalTy);
  }, [isLounge, roomType, startMoveTo, onOpenFullLounge, isSeatSlotOccupied, otherPlayers, MAP_COLS, playSfx, triggerOverheadSpeech]);

  // Pixel-Perfect Mathematical SVG Coordinate Transformation
  const handleMapClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    if (!svg.createSVGPoint) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    // Direct inverse matrix transform: 100% accurate down to subpixel level!
    const svgP = pt.matrixTransform(ctm.inverse());

    const clickTileX = svgP.x / 16;
    const clickTileY = svgP.y / 16;

    handleDirectTap(clickTileX, clickTileY);
  };

  // Get Room Title for Header
  const getRoomHeader = () => {
    switch (roomType) {
      case 'laboratory': return { name: 'LABORATORIUM KIMIA & XRF', icon: '🧪' };
      case 'preparation': return { name: 'RUANG PREPARASI SAMPEL', icon: '⚡' };
      case 'maintenance': return { name: 'WORKSHOP & BENGKEL PEMELIHARAAN', icon: '🔧' };
      case 'warehouse': return { name: 'GUDANG IC & LOGISTIK BAHAN', icon: '📦' };
      case 'qa': return { name: 'RUANG KERJA QA/QC & LIMS', icon: '📊' };
      case 'lounge_nickel':
      default: return { name: 'GAZEBO TAMBANG NIKEL HARITA', icon: '🚬' };
    }
  };

  const headerInfo = getRoomHeader();
  const activeDisplaySpeech = localSpeech || playerMessage || null;

  // Dynamic Nametag pill: snug fit to name + rank logo, centered over 16px avatar (center = 8)
  const renderNametag = (nameStr: string, rankIcon?: string, isMainPlayer = true) => {
    const shortName = (nameStr || 'User').trim().split(/\s+/)[0];
    const charCount = shortName.length;
    // In font-size 2.8 monospace, each char is ~1.85px wide
    const textWidth = Math.max(6, charCount * 1.85);
    const hasIcon = Boolean(rankIcon);
    const iconSize = 3;
    const gap = 1;
    const padX = 2.2;
    
    const contentWidth = (hasIcon ? iconSize + gap : 0) + textWidth;
    const innerW = Math.max(12, Math.round(contentWidth + padX * 2));
    const outerW = innerW + 1.6;
    const barHeight = 5.2;
    const outerX = 8 - outerW / 2;
    const innerX = outerX + 0.8;
    const barY = -7;
    
    const iconX = innerX + padX;
    const iconY = barY + 1.1;
    const textX = hasIcon ? (iconX + iconSize + gap + textWidth / 2) : (innerX + innerW / 2);
    const textY = barY + 3.7;

    return (
      <g pointerEvents="none">
        {/* Outer border */}
        <rect 
          x={outerX} 
          y={barY - 0.4} 
          width={outerW} 
          height={barHeight + 0.8} 
          fill="#10141C" 
          rx="1" 
        />
        {/* Inner fill */}
        <rect 
          x={innerX} 
          y={barY} 
          width={innerW} 
          height={barHeight} 
          fill={isMainPlayer ? "#15803D" : "#334155"} 
          rx="0.5" 
        />
        {/* Rank Icon if available */}
        {hasIcon && (
          <image 
            href={rankIcon} 
            x={iconX} 
            y={iconY} 
            width={iconSize} 
            height={iconSize} 
            preserveAspectRatio="xMidYMid meet"
          />
        )}
        {/* Short Name Text */}
        <text 
          x={textX} 
          y={textY} 
          textAnchor="middle" 
          fontSize="2.8" 
          fontFamily="monospace" 
          fontWeight="900" 
          fill="#FFFFFF"
        >
          {shortName}
        </text>
      </g>
    );
  };

  return (
    <div className={`relative w-full h-full flex flex-col select-none overflow-hidden bg-[#181820] font-sans ${className}`}>
      {/* ── TOP GBA RETRO BAR: SLEEK RETRO ICONS ── */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#202838] border-b-2 border-[#10141C] text-white z-20 shadow-md">
        {/* Left: Player Name & Exact Rank Icon Right Beside It (Zero Extra Descriptions) */}
        <div className="flex items-center gap-1.5 bg-[#10141C]/80 px-2 py-0.5 rounded-md border border-[#384860]">
          <span className="text-[12px] font-black font-mono text-[#FFF8B0] tracking-wider">
            {playerName.split(' ')[0]}
          </span>
          {playerRankIcon && (
            <img 
              src={playerRankIcon} 
              alt="Pangkat" 
              className="w-4 h-4 object-contain filter drop-shadow-xs" 
            />
          )}
        </div>

        {/* Right: Retro Action Icons (Logos with tooltips) */}
        <div className="flex items-center gap-1">
          {/* Wardrobe Button */}
          {onOpenWardrobe && (
            <div className="relative group/tt">
              <button
                type="button"
                onClick={() => {
                  playSfx('confirm');
                  onOpenWardrobe();
                }}
                className="w-6 h-6 rounded bg-[#2D3748] hover:bg-[#4A5568] border border-[#4A5568] flex items-center justify-center text-xs transition-all cursor-pointer"
                aria-label="Wardrobe"
              >
                🎒
              </button>
              <div className="absolute right-0 top-7 z-30 hidden group-hover/tt:block px-2 py-0.5 rounded bg-[#FFFDF0] text-[#181820] text-[9px] font-bold font-mono border border-[#181820] shadow-md whitespace-nowrap pointer-events-none">
                Wardrobe APD TBP
              </div>
            </div>
          )}

          {/* Lounge Button */}
          {onOpenFullLounge && !isLounge && (
            <div className="relative group/tt">
              <button
                type="button"
                onClick={() => {
                  playSfx('confirm');
                  onOpenFullLounge();
                }}
                className="w-6 h-6 rounded bg-[#15803D] hover:bg-[#16A34A] border border-[#22C55E] flex items-center justify-center text-xs transition-all cursor-pointer"
                aria-label="Buka Gazebo Lounge"
              >
                ☕
              </button>
              <div className="absolute right-0 top-7 z-30 hidden group-hover/tt:block px-2 py-0.5 rounded bg-[#FFFDF0] text-[#181820] text-[9px] font-bold font-mono border border-[#181820] shadow-md whitespace-nowrap pointer-events-none">
                Pondok Gazebo K3 Tambang
              </div>
            </div>
          )}

          {/* START Menu Button */}
          <div className="relative group/tt">
            <button
              type="button"
              onClick={() => {
                playSfx('beep');
                setShowStartMenu(!showStartMenu);
              }}
              className="px-1.5 h-6 rounded bg-[#3A4A62] hover:bg-[#4E6282] border border-[#5A7298] flex items-center justify-center text-[9px] font-mono font-black text-[#FFF8B0] transition-all cursor-pointer"
              aria-label="Start Menu"
            >
              START
            </button>
            <div className="absolute right-0 top-7 z-30 hidden group-hover/tt:block px-2 py-0.5 rounded bg-[#FFFDF0] text-[#181820] text-[9px] font-bold font-mono border border-[#181820] shadow-md whitespace-nowrap pointer-events-none">
              Menu Game (START)
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN FULL-HEIGHT GBA CANVAS: ZERO RESIZING, 100% UNCONSTRAINED ── */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-[#10141C] flex items-center justify-center">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="w-full h-full object-contain cursor-crosshair"
          style={{ 
            shapeRendering: 'crispEdges', 
            imageRendering: 'pixelated',
            touchAction: 'none'
          }}
          onClick={handleMapClick}
        >
          {/* Global Definitions for Pixel-Perfect Repeating Textures */}
          <defs>
            <pattern
              id="gba-gazebo-paving-pattern"
              width="16"
              height="16"
              patternUnits="userSpaceOnUse"
            >
              <image
                href={GBA_GAZEBO_PAVING_BASE64}
                width="16"
                height="16"
                preserveAspectRatio="none"
                style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}
              />
            </pattern>
          </defs>

          {/* ========================================================= */}
          {/* 1. COZY LABORATORY ROOM (11 cols x 8 rows)                */}
          {/* ========================================================= */}
          {roomType === 'laboratory' && (
            <g>
              {/* Sterile Cleanroom Wall (Rows 0, 1) */}
              {Array.from({ length: MAP_COLS }).map((_, c) => (
                <g key={`lab-wall-${c}`}>
                  <GbaLabWallTile x={c} y={0} isTop />
                  <GbaLabWallTile x={c} y={1} />
                </g>
              ))}

              {/* Polished Lab Checkerboard Floor (Rows 2..7) */}
              {Array.from({ length: MAP_ROWS - 2 }).map((_, r) => (
                <g key={`lab-floor-${r}`}>
                  {Array.from({ length: MAP_COLS }).map((_, c) => (
                    <GbaLabFloorTile 
                      key={`lab-tile-${c}-${r}`} 
                      x={c} 
                      y={r + 2} 
                      alt={(c + r) % 2 === 0} 
                    />
                  ))}
                </g>
              ))}

              {/* XRF Spectrometer (Col 1, Row 1..2) */}
              <GbaXrfSpectrometer x={1} y={1.2} />

              {/* Fusion Furnace 1050°C (Col 4, Row 1..2) */}
              <GbaFusionFurnace x={4} y={1.2} />

              {/* Fume Hood (Col 7, Row 1..2) */}
              <GbaFumeHood x={7} y={1.2} />

              {/* Analytical Balance (Col 9, Row 3) */}
              <GbaAnalyticalBalance x={9} y={3} />

              {/* Lounge Exit Door (Col 9, Row 5..6) */}
              <g>
                <rect x={9 * 16} y={5 * 16} width={30} height={30} fill="#1E293B" />
                <rect x={9 * 16 + 2} y={5 * 16 + 2} width={26} height={26} fill="#0F172A" />
                <rect x={9 * 16 + 5} y={5 * 16 + 5} width={20} height={20} fill="#10B981" opacity="0.3" />
                <text x={9 * 16 + 15} y={5 * 16 + 17} textAnchor="middle" fontSize="5" fontWeight="900" fill="#E2E8F0" fontFamily="monospace">
                  LOUNGE
                </text>
              </g>
            </g>
          )}

          {/* ========================================================= */}
          {/* 2. COZY PREPARATION ROOM (11 cols x 8 rows)               */}
          {/* ========================================================= */}
          {roomType === 'preparation' && (
            <g>
              {/* Industrial Wall with Conduit (Rows 0, 1) */}
              {Array.from({ length: MAP_COLS }).map((_, c) => (
                <g key={`prep-wall-${c}`}>
                  <GbaPrepWallTile x={c} y={0} isTop hasPipe={c % 3 === 0} />
                  <GbaPrepWallTile x={c} y={1} hasPipe={c % 3 === 0} />
                </g>
              ))}

              {/* Heavy Concrete Floor with Hazard Marking (Rows 2..7) */}
              {Array.from({ length: MAP_ROWS - 2 }).map((_, r) => (
                <g key={`prep-floor-${r}`}>
                  {Array.from({ length: MAP_COLS }).map((_, c) => (
                    <GbaPrepFloorTile 
                      key={`prep-tile-${c}-${r}`} 
                      x={c} 
                      y={r + 2} 
                      hasHazardBorder={r === 0 ? 'top' : undefined}
                      hasDrain={c === 5 && r === 4}
                    />
                  ))}
                </g>
              ))}

              {/* Jaw Crusher (Col 1, Row 1..2) */}
              <GbaJawCrusher x={1} y={1.2} />

              {/* Pulverizer Ring Mill 200 Mesh (Col 4, Row 1..2) */}
              <GbaPulverizerMill x={4} y={1.2} />

              {/* Drying Oven 105°C (Col 7, Row 1..2) */}
              <GbaDryingOven x={7} y={1.2} />

              {/* Jones Riffle Splitter (Col 9, Row 3) */}
              <GbaJonesSplitter x={9} y={3} />

              {/* Sample Ore Drums (Col 1, Row 5) */}
              <GbaNickelDrumTile x={0.8} y={5} type="limonite" />
              <GbaNickelDrumTile x={1.8} y={5} type="saprolite" />

              {/* Lounge Exit Door (Col 9, Row 5..6) */}
              <g>
                <rect x={9 * 16} y={5 * 16} width={30} height={30} fill="#1E293B" />
                <rect x={9 * 16 + 2} y={5 * 16 + 2} width={26} height={26} fill="#0F172A" />
                <rect x={9 * 16 + 5} y={5 * 16 + 5} width={20} height={20} fill="#EAB308" opacity="0.3" />
                <text x={9 * 16 + 15} y={5 * 16 + 17} textAnchor="middle" fontSize="5" fontWeight="900" fill="#E2E8F0" fontFamily="monospace">
                  LOUNGE
                </text>
              </g>
            </g>
          )}

          {/* ========================================================= */}
          {/* 3. COZY MAINTENANCE WORKSHOP (11 cols x 8 rows)           */}
          {/* ========================================================= */}
          {roomType === 'maintenance' && (
            <g>
              {Array.from({ length: MAP_COLS }).map((_, c) => (
                <g key={`maint-wall-${c}`}>
                  <GbaPrepWallTile x={c} y={0} isTop hasPipe={c % 2 === 0} />
                  <GbaPrepWallTile x={c} y={1} hasPipe={c % 2 === 0} />
                </g>
              ))}

              {Array.from({ length: MAP_ROWS - 2 }).map((_, r) => (
                <g key={`maint-floor-${r}`}>
                  {Array.from({ length: MAP_COLS }).map((_, c) => (
                    <GbaWorkshopFloorTile key={`maint-tile-${c}-${r}`} x={c} y={r + 2} />
                  ))}
                </g>
              ))}

              <GbaWorkshopBench x={1.2} y={1.2} />
              <GbaLotoStation x={4.5} y={1.5} />
              <GbaWorkshopBench x={6.5} y={1.2} />
              <GbaNickelDrumTile x={1} y={5} type="limonite" />

              <g>
                <rect x={9 * 16} y={5 * 16} width={30} height={30} fill="#1E293B" />
                <rect x={9 * 16 + 2} y={5 * 16 + 2} width={26} height={26} fill="#0F172A" />
                <rect x={9 * 16 + 5} y={5 * 16 + 5} width={20} height={20} fill="#3B82F6" opacity="0.3" />
                <text x={9 * 16 + 15} y={5 * 16 + 17} textAnchor="middle" fontSize="5" fontWeight="900" fill="#E2E8F0" fontFamily="monospace">
                  LOUNGE
                </text>
              </g>
            </g>
          )}

          {/* ========================================================= */}
          {/* 4. COZY WAREHOUSE / GUDANG IC (11 cols x 8 rows)          */}
          {/* ========================================================= */}
          {roomType === 'warehouse' && (
            <g>
              {Array.from({ length: MAP_COLS }).map((_, c) => (
                <g key={`wh-wall-${c}`}>
                  <GbaPrepWallTile x={c} y={0} isTop />
                  <GbaPrepWallTile x={c} y={1} />
                </g>
              ))}

              {Array.from({ length: MAP_ROWS - 2 }).map((_, r) => (
                <g key={`wh-floor-${r}`}>
                  {Array.from({ length: MAP_COLS }).map((_, c) => (
                    <GbaWarehouseFloorTile 
                      key={`wh-tile-${c}-${r}`} 
                      x={c} 
                      y={r + 2} 
                      isLine={r === 3}
                    />
                  ))}
                </g>
              ))}

              <GbaWarehouseRack x={1.2} y={1.2} />
              <GbaWarehouseRack x={4.5} y={1.2} />
              <GbaWarehouseRack x={7.2} y={1.2} />

              <g>
                <rect x={9 * 16} y={5 * 16} width={30} height={30} fill="#1E293B" />
                <rect x={9 * 16 + 2} y={5 * 16 + 2} width={26} height={26} fill="#0F172A" />
                <rect x={9 * 16 + 5} y={5 * 16 + 5} width={20} height={20} fill="#F97316" opacity="0.3" />
                <text x={9 * 16 + 15} y={5 * 16 + 17} textAnchor="middle" fontSize="5" fontWeight="900" fill="#E2E8F0" fontFamily="monospace">
                  LOUNGE
                </text>
              </g>
            </g>
          )}

          {/* ========================================================= */}
          {/* 5. COZY QA / ADMIN OFFICE (11 cols x 8 rows)              */}
          {/* ========================================================= */}
          {roomType === 'qa' && (
            <g>
              {Array.from({ length: MAP_COLS }).map((_, c) => (
                <g key={`qa-wall-${c}`}>
                  <GbaLabWallTile x={c} y={0} isTop />
                  <GbaLabWallTile x={c} y={1} />
                </g>
              ))}

              {Array.from({ length: MAP_ROWS - 2 }).map((_, r) => (
                <g key={`qa-floor-${r}`}>
                  {Array.from({ length: MAP_COLS }).map((_, c) => (
                    <GbaWoodFloorTile 
                      key={`qa-tile-${c}-${r}`} 
                      x={c} 
                      y={r + 2} 
                      alt={(c + r) % 2 === 0} 
                    />
                  ))}
                </g>
              ))}

              <GbaIsoPlaque x={1} y={1} />
              <GbaQaWorkstation x={3.5} y={1.2} />
              <GbaQaWorkstation x={7} y={1.2} />

              <g>
                <rect x={9 * 16} y={5 * 16} width={30} height={30} fill="#1E293B" />
                <rect x={9 * 16 + 2} y={5 * 16 + 2} width={26} height={26} fill="#0F172A" />
                <rect x={9 * 16 + 5} y={5 * 16 + 5} width={20} height={20} fill="#8B5CF6" opacity="0.3" />
                <text x={9 * 16 + 15} y={5 * 16 + 17} textAnchor="middle" fontSize="5" fontWeight="900" fill="#E2E8F0" fontFamily="monospace">
                  LOUNGE
                </text>
              </g>
            </g>
          )}

          {/* ========================================================= */}
          {/* 6. COZY GAZEBO TAMBANG NIKEL (12 cols x 8 rows)           */}
          {/* ========================================================= */}
          {roomType === 'lounge_nickel' && (
            <g>
              {/* 1. Distant Tropical Mountain & Nickel Pit Panorama (Smooth continuous landscape) */}
              <GbaMineVistaPanorama width={MAP_WIDTH} height={34} />

              {/* 2. Gazebo Timber Roof Rafters & Zinc Trim (Rows 2, 3) */}
              {Array.from({ length: MAP_COLS }).map((_, c) => (
                <g key={`gazebo-roof-${c}`}>
                  <GbaGazeboPillarTile x={c} y={2} isTop />
                  {(c === 0 || c === 5 || c === 11) && <GbaGazeboPillarTile x={c} y={3} />}
                </g>
              ))}

              {/* 3. Decorative Signboard Plaque: PREPARATION & LABORATORY on Top Gazebo Beam */}
              <GbaPrepLabBanner x={2.8} y={1.8} />

              {/* 4. Clean Porcelain Terrace Paving Ground (1:1 Seamless Image 2 Paving Pattern) */}
              <rect
                x={0}
                y={3 * 16}
                width={MAP_WIDTH}
                height={(MAP_ROWS - 3) * 16}
                fill="url(#gba-gazebo-paving-pattern)"
              />

              {/* 5. Left Pillar Corner: K3 Notice Board mounted to wall/fence & Sample Drums */}
              <GbaShiftBoard x={0.08} y={2.4} />
              <GbaNickelDrumTile x={0.4} y={4.5} type="limonite" />

              {/* 6. Communal 'n'-Shaped Continuous Long Bench (Exact Compact Scale) surrounding Center Table */}
              <GbaGazeboNBench x={3.625} y={3.4} />
              <GbaGazeboTable x={4.875} y={4.6} />

              {/* 7. Right Pillar Corner: K3 Water Cooler & Proportional Stainless Ashtray */}
              <GbaWaterCooler x={10.4} y={4.2} />
              <GbaNickelAshtray x={10.4} y={5.8} />

              {/* 8. Bottom-Left Corner: Mysterious Gazebo Ghost NPC (Pure Easter Egg, No Floating Labels) */}
              <g 
                transform="translate(18, 98)" 
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  playSfx('confirm');

                  // Player approaches ghost (tile x: 2.1, y: 6.2) and faces left towards ghost
                  const distToGhost = Math.hypot(posX - 2.1, posY - 6.2);
                  if (distToGhost < 0.7) {
                    setFacing('left');
                    movementRef.current.facing = 'left';
                    onPlayerActionRef.current?.({
                      actionState: 'idle',
                      facing: 'left',
                      x: Number(posX.toFixed(2)),
                      y: Number(posY.toFixed(2))
                    });
                    if (onPlayGhostRps) onPlayGhostRps();
                  } else {
                    startMoveTo(2.1, 6.2, {
                      facing: 'left',
                      action: 'idle',
                      callback: () => {
                        if (onPlayGhostRps) onPlayGhostRps();
                      }
                    });
                  }
                }}
              >
                {/* Pure pixel art ghost sprite without labels/nametag */}
                <GbaLoungeGhostNpc 
                  width={14}
                  height={18}
                  className="hover:scale-115 transition-transform duration-200" 
                />
              </g>

              {/* 9. Secret Underground Domino Hole (Appears after 5 wins vs Ghost) */}
              {isSecretHoleUnlocked && (
                <g 
                  transform="translate(36, 102)" 
                  className="cursor-pointer group"
                  onClick={(e) => {
                    e.stopPropagation();
                    playSfx('confirm');
                    // Player walks onto the secret hole then enters
                    startMoveTo(2.35, 6.35, {
                      facing: 'down',
                      action: 'idle',
                      callback: () => {
                        if (onEnterSecretDomino) onEnterSecretDomino();
                      }
                    });
                  }}
                >
                  <title>🕳️ Lubang Rahasia (Klik untuk masuk ke Bunker Bawah Tanah)</title>
                  {/* Outer Pit Rim */}
                  <ellipse cx="8" cy="6" rx="8" ry="4.5" fill="#090518" stroke="#6B21A8" strokeWidth="0.8" />
                  <ellipse cx="8" cy="6" rx="6.5" ry="3.5" fill="#1E0E45" />
                  {/* Swirling Deep Void */}
                  <ellipse cx="8" cy="6" rx="4.5" ry="2.2" fill="#3B0764" />
                  <ellipse cx="8" cy="6" rx="3" ry="1.4" fill="#A855F7" opacity="0.85">
                    <animate attributeName="rx" values="3;4.2;3" dur="1.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.85;0.35;0.85" dur="1.8s" repeatCount="indefinite" />
                  </ellipse>
                  {/* Floating Mystical Glow Sparks */}
                  <circle cx="5" cy="4" r="0.6" fill="#F3E8FF" opacity="0.8">
                    <animate attributeName="cy" values="4;1.5;4" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="11" cy="5" r="0.6" fill="#C084FC" opacity="0.8">
                    <animate attributeName="cy" values="5;2.5;5" dur="2.2s" repeatCount="indefinite" />
                  </circle>
                </g>
              )}
            </g>
          )}

          {/* ========================================================= */}
          {/* 7. SECRET UNDERGROUND LOUNGE & BUNKER (12 cols x 8 rows)  */}
          {/* ========================================================= */}
          {roomType === 'underground_lounge' && (
            <g>
              {/* 1. Deep Cavern Stone Wall with Timber Support Beams (Rows 0, 1) */}
              {Array.from({ length: MAP_COLS }).map((_, c) => (
                <g key={`ug-wall-${c}`}>
                  {/* Dark Cavern Stone Tile */}
                  <rect x={c * 16} y={0} width={16} height={16} fill="#18122B" stroke="#0F0A1C" strokeWidth="0.5" />
                  <rect x={c * 16 + 2} y={2} width={12} height={12} fill="#231942" />
                  <rect x={c * 16} y={16} width={16} height={16} fill="#18122B" stroke="#0F0A1C" strokeWidth="0.5" />
                  <rect x={c * 16 + 1} y={17} width={14} height={13} fill="#231942" />
                  {/* Timber Beams at columns 0, 3, 6, 9, 11 */}
                  {(c === 0 || c === 3 || c === 6 || c === 9 || c === 11) && (
                    <rect x={c * 16 + 4} y={0} width={8} height={32} fill="#78350F" stroke="#451A03" strokeWidth="0.6" />
                  )}
                </g>
              ))}

              {/* Horizontal Timber Header Beam across entire cavern wall */}
              <rect x={0} y={28} width={MAP_WIDTH} height={5} fill="#5C2B09" stroke="#3B1A04" strokeWidth="0.7" />
              <rect x={0} y={29} width={MAP_WIDTH} height={1.5} fill="#92400E" opacity="0.6" />

              {/* Center Banner Plaque: PREPLAB SECRET UNDERGROUND CLUB */}
              <g transform="translate(68, 6)">
                <rect x={0} y={0} width={56} height={16} rx={2} fill="#451A03" stroke="#F59E0B" strokeWidth="0.8" />
                <rect x={2} y={2} width={52} height={12} fill="#78350F" />
                <text x={28} y={7.5} textAnchor="middle" fontSize="3.8" fontWeight="900" fill="#FEF08A" fontFamily="monospace">
                  PREPLAB SECRET CLUB
                </text>
                <text x={28} y={12} textAnchor="middle" fontSize="3" fontWeight="bold" fill="#FDE047" fontFamily="monospace">
                  GAPLE & CHESS BUNKER
                </text>
              </g>

              {/* 2. Cozy Underground Rustic Wood Flooring (Rows 2..7) */}
              {Array.from({ length: MAP_ROWS - 2 }).map((_, r) => (
                <g key={`ug-floor-${r}`}>
                  {Array.from({ length: MAP_COLS }).map((_, c) => (
                    <GbaWoodFloorTile 
                      key={`ug-tile-${c}-${r}`} 
                      x={c} 
                      y={r + 2} 
                      alt={(c + r) % 2 === 0} 
                    />
                  ))}
                </g>
              ))}

              {/* 3. Hanging Miner Lanterns with Warm Flickering Light */}
              <GbaUndergroundLantern x={54} y={24} />
              <GbaUndergroundLantern x={126} y={24} />

              {/* 4. Top-Left Corner: Wooden Mine Ladder to Gazebo */}
              <g transform="translate(14, 18)">
                <GbaUndergroundLadder 
                  onClick={() => {
                    if (onAscendToGazebo) onAscendToGazebo();
                  }}
                />
              </g>

              {/* 5. Center-Left: 4-Seater Domino (Gaple) Table */}
              <g transform="translate(36, 52)">
                <GbaUndergroundDominoTable 
                  onClick={() => {
                    if (onOpenDominoGame) onOpenDominoGame('bottom');
                  }}
                  onSeatClick={(seat) => {
                    if (onOpenDominoGame) onOpenDominoGame(seat);
                  }}
                />
              </g>

              {/* 6. Center-Right: 2-Seater Chess Table */}
              <g transform="translate(122, 56)">
                <GbaUndergroundChessTable 
                  onClick={() => {
                    if (onOpenChessGame) onOpenChessGame('left');
                  }}
                  onSeatClick={(seat) => {
                    if (onOpenChessGame) onOpenChessGame(seat);
                  }}
                />
              </g>

              {/* 7. Bottom Corners: Sample Crates & Reserve Fuel Drums */}
              <g transform="translate(10, 102)">
                <rect x={0} y={0} width={14} height={14} rx={1} fill="#78350F" stroke="#451A03" strokeWidth="0.6" />
                <line x1={0} y1={0} x2={14} y2={14} stroke="#451A03" strokeWidth="0.5" />
                <line x1={14} y1={0} x2={0} y2={14} stroke="#451A03" strokeWidth="0.5" />
                <text x={7} y={8.5} textAnchor="middle" fontSize="3" fontWeight="900" fill="#FDE047" fontFamily="monospace">
                  K3
                </text>
              </g>

              <GbaNickelDrumTile x={10.4} y={6.2} type="limonite" />
            </g>
          )}

          {/* ========================================================= */}
          {/* ANIMATED DESTINATION RETICLE (EXACT TARGET LOCATION)      */}
          {/* ========================================================= */}
          {clickTarget && (
            <g transform={`translate(${clickTarget.x * 16 - 8}, ${clickTarget.y * 16 - 8})`} pointerEvents="none">
              <rect x="2" y="2" width="3" height="1" fill="#FACC15" />
              <rect x="2" y="2" width="1" height="3" fill="#FACC15" />

              <rect x="11" y="2" width="3" height="1" fill="#FACC15" />
              <rect x="13" y="2" width="1" height="3" fill="#FACC15" />

              <rect x="2" y="13" width="3" height="1" fill="#FACC15" />
              <rect x="2" y="11" width="1" height="3" fill="#FACC15" />

              <rect x="11" y="13" width="3" height="1" fill="#FACC15" />
              <rect x="13" y="11" width="1" height="3" fill="#FACC15" />

              <circle cx="8" cy="8" r="1.5" fill="#EF4444" />
            </g>
          )}

          {/* ========================================================= */}
          {/* OTHER MULTIPLAYER PLAYERS (IN LOUNGE)                     */}
          {/* ========================================================= */}
          {otherPlayers.map((other) => (
            <g
              key={other.id}
              transform={`translate(${other.x * 16}, ${other.y * 16 - 5})`}
              style={{
                transition: 'transform 0.16s linear',
                willChange: 'transform'
              }}
            >
              {/* Dynamic Compact Nametag Pill with Exact Rank Icon Beside Name */}
              {renderNametag(other.name, other.pangkatIcon, false)}

              <GbaCharacterSprite
                direction={other.facing}
                actionState={other.actionState}
                headwearId={other.headwearId}
                headwearColor={other.headwearColor}
                outfitId={other.outfitId}
                outfitColor={other.outfitColor}
                width={16}
                height={21}
              />

              {/* OTHER PLAYER'S PROMINENT OVERHEAD CHAT BUBBLE */}
              {other.message && (
                <GbaOverheadSpeechBubble x={8} y={-8} text={other.message} />
              )}
            </g>
          ))}

          {/* ========================================================= */}
          {/* MAIN PLAYER AVATAR CHARACTER                              */}
          {/* ========================================================= */}
          <g transform={`translate(${posX * 16}, ${posY * 16 - 5})`}>
            {/* Dynamic Compact Nametag Pill with Exact Rank Icon Beside Name */}
            {renderNametag(playerName, playerRankIcon, true)}

            <GbaCharacterSprite
              direction={facing}
              walkFrame={walkFrame}
              actionState={actionState}
              headwearId={headwearId}
              headwearColor={headwearColor}
              outfitId={outfitId}
              outfitColor={outfitColor}
              bootsColor={bootsColor}
              width={16}
              height={21}
            />

            {/* MAIN PLAYER'S PROMINENT OVERHEAD SPEECH BUBBLE */}
            {activeDisplaySpeech && (
              <GbaOverheadSpeechBubble x={8} y={-8} text={activeDisplaySpeech} />
            )}
          </g>
        </svg>

        {/* ── 1:1 AUTHENTIC GBA START MENU ── */}
        {showStartMenu && (
          <div className="absolute right-2 top-2 z-40 w-36 bg-[#FFFDF0] border-4 border-[#283040] shadow-2xl p-1 text-[#181820] font-mono text-[10px]">
            <div className="border-2 border-[#8098B8] p-1.5 space-y-1">
              <div 
                onClick={() => {
                  playSfx('confirm');
                  setShowStartMenu(false);
                  if (onOpenWardrobe) onOpenWardrobe();
                }}
                className="flex items-center gap-1.5 p-1 hover:bg-[#D8E0F0] cursor-pointer font-bold"
              >
                <span>▶</span>
                <span>🎒 WARDROBE</span>
              </div>

              <div 
                onClick={() => {
                  playSfx('confirm');
                  const nextAct = actionState === 'sit' ? 'idle' : 'sit';
                  setActionState(nextAct);
                  setShowStartMenu(false);
                  onPlayerActionRef.current?.({
                    actionState: nextAct,
                    facing,
                    x: Number(posX.toFixed(2)),
                    y: Number(posY.toFixed(2))
                  });
                }}
                className="flex items-center gap-1.5 p-1 hover:bg-[#D8E0F0] cursor-pointer font-bold"
              >
                <span>▶</span>
                <span>🪑 POSE DUDUK</span>
              </div>

              <div 
                onClick={() => {
                  playSfx('confirm');
                  const nextAct = actionState === 'coffee' ? 'idle' : 'coffee';
                  setActionState(nextAct);
                  setShowStartMenu(false);
                  onPlayerActionRef.current?.({
                    actionState: nextAct,
                    facing,
                    x: Number(posX.toFixed(2)),
                    y: Number(posY.toFixed(2))
                  });
                }}
                className="flex items-center gap-1.5 p-1 hover:bg-[#D8E0F0] cursor-pointer font-bold"
              >
                <span>▶</span>
                <span>☕ NGOPI SANTAY</span>
              </div>

              {onSyncProfile && (
                <div 
                  onClick={() => {
                    playSfx('item');
                    setShowStartMenu(false);
                    onSyncProfile();
                  }}
                  className="flex items-center gap-1.5 p-1 hover:bg-[#D8E0F0] cursor-pointer font-bold"
                >
                  <span>▶</span>
                  <span>📸 FOTO PROFIL</span>
                </div>
              )}

              {onOpenFullLounge && !isLounge && (
                <div 
                  onClick={() => {
                    playSfx('confirm');
                    setShowStartMenu(false);
                    onOpenFullLounge();
                  }}
                  className="flex items-center gap-1.5 p-1 hover:bg-[#D8E0F0] cursor-pointer font-bold text-[#15803D]"
                >
                  <span>▶</span>
                  <span>🚪 MASUK GAZEBO</span>
                </div>
              )}

              <div 
                onClick={() => {
                  playSfx('beep');
                  setShowStartMenu(false);
                }}
                className="flex items-center gap-1.5 p-1 hover:bg-[#D8E0F0] cursor-pointer font-bold text-[#DC2626]"
              >
                <span>▶</span>
                <span>❌ TUTUP</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
