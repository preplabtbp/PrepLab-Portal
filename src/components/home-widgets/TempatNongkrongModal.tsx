import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Coffee, Send, Users, X, Sparkles, Smile, RefreshCw, 
  ShieldCheck, Flame, Volume2, VolumeX, MapPin, Footprints,
  Cigarette, Sun, Compass, Armchair, ChevronRight
} from 'lucide-react';
import { getGlobalSocket, joinRoom, leaveRoom } from '../../lib/socketClient';
import { getRankByXp } from '../../lib/pointBlankRanks';
import { TbpAvatarCharacter } from '../avatar/TbpAvatarCharacter';
import { SKIN_TONES } from './Avatar3DWidget';
import { 
  TeakParkBench, 
  StandingAshtray, 
  RoundCoffeeTable, 
  WoodenDiningChair, 
  ModularLoungeSofa, 
  BeverageBarCounter 
} from './lounge/LoungeFurnitureSvg';

interface TempatNongkrongModalProps {
  isOpen: boolean;
  onClose: () => void;
  userNik: string;
  userName: string;
  userSection: string;
  userRole?: string;
  avatarUrl?: string;
}

interface InRoomAvatar {
  nik: string;
  name: string;
  username: string;
  pangkat: string;
  pangkatIcon?: string;
  section: string;
  posX: number;
  posY: number;
  facing: 'left' | 'right';
  actionState: 'idle' | 'walk' | 'coffee' | 'inspect' | 'jump' | 'smoke' | 'sit' | 'smoke_sit' | 'coffee_sit';
  walkFrame: number;
  speechText?: string;
  speechExpiry?: number;
  avatarUrl?: string;
  isMe?: boolean;
}

interface LoungeSpot {
  id: string;
  name: string;
  zoneTitle: string;
  x: number; // Percentage width
  y: number; // Percentage height (exact ground baseline)
  facing: 'left' | 'right';
  action: 'smoke_sit' | 'sit' | 'coffee' | 'coffee_sit';
  speech: string;
  icon: string;
}

// Helper to extract clean username (NEVER full name)
const getCleanUsername = (nik: string, rawName?: string, rawUsername?: string): string => {
  if (rawUsername && rawUsername.trim()) return rawUsername.trim();
  if (rawName) {
    const firstWord = rawName.trim().split(/\s+/)[0];
    if (firstWord && firstWord.length >= 2) return firstWord;
  }
  return nik ? `Ranger-${nik.slice(-3)}` : 'Ranger';
};

// Helper to extract official military/gamification rank & logo icon (NEVER Game Master)
const getPangkatData = (nik: string, rawPangkat?: string, rawRole?: string): { name: string; icon: string } => {
  try {
    const gStr = typeof localStorage !== 'undefined' ? localStorage.getItem(`preplab_gamification_${nik}`) : null;
    if (gStr) {
      const g = JSON.parse(gStr);
      if (typeof g?.totalXp === 'number') {
        const r = getRankByXp(g.totalXp);
        if (r?.currentRank) {
          return {
            name: r.currentRank.name,
            icon: r.currentRank.icon || '/assets/ranks/rank_01_trainee.svg'
          };
        }
      }
      if (g?.rankInfo?.currentRank) {
        return {
          name: g.rankInfo.currentRank.name,
          icon: g.rankInfo.currentRank.icon || '/assets/ranks/rank_01_trainee.svg'
        };
      }
      if (g?.rank?.name) {
        return {
          name: g.rank.name,
          icon: g.rank.icon || '/assets/ranks/rank_01_trainee.svg'
        };
      }
    }
  } catch {}

  // If explicit rawPangkat provided (filter out Game Master)
  if (rawPangkat && rawPangkat.trim() && !rawPangkat.toLowerCase().includes('game master')) {
    return {
      name: rawPangkat.trim(),
      icon: '/assets/ranks/rank_01_trainee.svg'
    };
  }

  // Fallback to role / jabatan (filter out Game Master)
  if (rawRole && rawRole.trim() && !rawRole.toLowerCase().includes('game master')) {
    return {
      name: rawRole.trim(),
      icon: '/assets/ranks/rank_01_trainee.svg'
    };
  }

  const defaultRank = getRankByXp(0).currentRank;
  return {
    name: defaultRank.name || 'Trainee',
    icon: defaultRank.icon || '/assets/ranks/rank_01_trainee.svg'
  };
};

// EXACT MATCH: Furniture anchors & Avatar sitting spots share the exact same ground coordinates!
const LOUNGE_SEATS: LoungeSpot[] = [
  {
    id: 'bench_1',
    name: 'Bangku Gazebo 1 (Kiri)',
    zoneTitle: 'Area Merokok K3',
    x: 13,
    y: 79,
    facing: 'right',
    action: 'smoke_sit',
    speech: '🚬 Menikmati hisapan rokok santai di Gazebo K3...',
    icon: '🚬'
  },
  {
    id: 'bench_2',
    name: 'Bangku Gazebo 2 (Kanan)',
    zoneTitle: 'Area Merokok K3',
    x: 31,
    y: 79,
    facing: 'left',
    action: 'smoke_sit',
    speech: '🚬 Duduk merokok santai sambil obrol shift preparasi!',
    icon: '🚬'
  },
  {
    id: 'chair_coffee_1',
    name: 'Kursi Kopi Kiri',
    zoneTitle: 'Meja Santai Shift',
    x: 44,
    y: 78,
    facing: 'right',
    action: 'coffee_sit', // Sit down with coffee mug!
    speech: '☕ Duduk santai seruput kopi hangat di meja shift...',
    icon: '☕'
  },
  {
    id: 'chair_coffee_2',
    name: 'Kursi Kopi Kanan',
    zoneTitle: 'Meja Santai Shift',
    x: 60,
    y: 78,
    facing: 'left',
    action: 'coffee_sit', // Sit down with coffee mug!
    speech: '☕ Ngopi hangat sambil santai nikmati pisang goreng!',
    icon: '☕'
  },
  {
    id: 'sofa_left',
    name: 'Sofa Rehat (Kiri)',
    zoneTitle: 'Sofa Rehat Lab',
    x: 74,
    y: 78,
    facing: 'right',
    action: 'sit',
    speech: '🛋️ Duduk selonjoran santai rehat di sofa lab...',
    icon: '🛋️'
  },
  {
    id: 'sofa_right',
    name: 'Sofa Rehat (Kanan)',
    zoneTitle: 'Sofa Rehat Lab',
    x: 84,
    y: 78,
    facing: 'left',
    action: 'sit',
    speech: '🛋️ Rehat sejenak sebelum inspeksi alat berikutnya.',
    icon: '🛋️'
  },
  {
    id: 'bar_refreshment',
    name: 'Bar Minuman',
    zoneTitle: 'Stasiun Dispenser',
    x: 38,
    y: 64,
    facing: 'right',
    action: 'coffee',
    speech: '🫖 Seduh kopi & teh hangat di dispenser bar...',
    icon: '🫖'
  }
];

export const TempatNongkrongModal: React.FC<TempatNongkrongModalProps> = ({
  isOpen,
  onClose,
  userNik,
  userName,
  userSection,
  userRole,
  avatarUrl
}) => {
  const [inputText, setInputText] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedAvatarForInteract, setSelectedAvatarForInteract] = useState<InRoomAvatar | null>(null);
  const [hoveredFurniture, setHoveredFurniture] = useState<string | null>(null);

  // Load user's saved avatar customization (skin tone, face expression, clothes)
  const myCustomCfg = useMemo(() => {
    try {
      const saved = localStorage.getItem(`preplab_pixel_fullbody_cfg_${userNik}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
  }, [userNik, isOpen]);

  // Resolve Username & Pangkat for current user (NEVER display full name, NEVER Game Master)
  const { effectiveUsername, effectivePangkat, effectivePangkatIcon } = useMemo(() => {
    let uname = '';
    let pObj: any = null;
    try {
      uname = localStorage.getItem('p2h_inspector_username') || '';
      const pStr = localStorage.getItem('p2h_inspector_profile');
      if (pStr) pObj = JSON.parse(pStr);
      if (!uname && pObj?.username) uname = pObj.username;
    } catch {}

    if (!uname || !uname.trim()) {
      const fallback = pObj?.nama || pObj?.name || userName || '';
      uname = fallback.trim().split(/\s+/)[0] || 'Ranger';
    }

    let pgtName = '';
    let pgtIcon = '/assets/ranks/rank_01_trainee.svg';

    try {
      const gStr = localStorage.getItem(`preplab_gamification_${userNik}`);
      if (gStr) {
        const g = JSON.parse(gStr);
        if (typeof g?.totalXp === 'number') {
          const r = getRankByXp(g.totalXp);
          if (r?.currentRank) {
            pgtName = r.currentRank.name;
            pgtIcon = r.currentRank.icon || pgtIcon;
          }
        } else if (g?.rankInfo?.currentRank) {
          pgtName = g.rankInfo.currentRank.name;
          pgtIcon = g.rankInfo.currentRank.icon || pgtIcon;
        } else if (g?.rank?.name) {
          pgtName = g.rank.name;
          pgtIcon = g.rank.icon || pgtIcon;
        }
      }
    } catch {}

    if (!pgtName) {
      const fallbackP = pObj?.pangkat || pObj?.jabatan || userRole || pObj?.role || 
                        localStorage.getItem('p2h_inspector_jabatan') || 
                        localStorage.getItem('user_role');
      if (fallbackP && !fallbackP.toLowerCase().includes('game master')) {
        pgtName = fallbackP;
      } else {
        const r0 = getRankByXp(0).currentRank;
        pgtName = r0.name || 'Trainee';
        pgtIcon = r0.icon || pgtIcon;
      }
    }

    return { 
      effectiveUsername: uname.trim(), 
      effectivePangkat: pgtName.trim(),
      effectivePangkatIcon: pgtIcon
    };
  }, [userNik, userName, userRole]);

  // My Avatar In-Room State: Start seated at Bangku Gazebo 1 (Exactly centered on bench)
  const [myPos, setMyPos] = useState<{ x: number; y: number }>({ x: 13, y: 79 });
  const [myTargetPos, setMyTargetPos] = useState<{ x: number; y: number }>({ x: 13, y: 79 });
  const [myFacing, setMyFacing] = useState<'left' | 'right'>('right');
  const [myActionState, setMyActionState] = useState<'idle' | 'walk' | 'coffee' | 'inspect' | 'jump' | 'smoke' | 'sit' | 'smoke_sit' | 'coffee_sit'>('smoke_sit');
  const [pendingActionOnArrival, setPendingActionOnArrival] = useState<'idle' | 'walk' | 'coffee' | 'inspect' | 'jump' | 'smoke' | 'sit' | 'smoke_sit' | 'coffee_sit' | null>('smoke_sit');
  const [myWalkFrame, setMyWalkFrame] = useState(0);
  const [mySpeech, setMySpeech] = useState<{ text: string; expiry: number } | null>({
    text: '🚬 Santai sejenak merokok di Gazebo K3 PrepLab Obi!',
    expiry: Date.now() + 6500
  });

  // Active seat tracking
  const [activeSeatId, setActiveSeatId] = useState<string | null>('bench_1');

  // Other In-Room Avatars
  const [otherAvatars, setOtherAvatars] = useState<Map<string, InRoomAvatar>>(new Map());

  // Click target beacon ripple on floor
  const [clickBeacon, setClickBeacon] = useState<{ x: number; y: number } | null>(null);

  const roomStageRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Audio chimes
  const playChime = (type: 'msg' | 'step' | 'cheer' = 'msg') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'cheer') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      } else if (type === 'step') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      }
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  };

  // Movement loop for My Avatar
  useEffect(() => {
    const moveTimer = setInterval(() => {
      setMyPos(curr => {
        const dx = myTargetPos.x - curr.x;
        const dy = myTargetPos.y - curr.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1.4) {
          if (pendingActionOnArrival) {
            setMyActionState(pendingActionOnArrival);
            setPendingActionOnArrival(null);

            const socket = getGlobalSocket();
            if (socket.connected) {
              socket.emit('lounge:action', {
                room: 'lounge',
                nik: userNik,
                username: effectiveUsername,
                pangkat: effectivePangkat,
                actionState: pendingActionOnArrival
              });
            }
          } else if (myActionState === 'walk') {
            setMyActionState('idle');
          }
          setClickBeacon(null);
          return curr;
        }

        setMyActionState('walk');
        setMyWalkFrame(f => (f + 1) % 4);
        setMyFacing(dx >= 0 ? 'right' : 'left');

        const stepSpeed = 1.4;
        const nextX = curr.x + (dx / dist) * stepSpeed;
        const nextY = curr.y + (dy / dist) * stepSpeed;

        const boundedX = Math.max(12, Math.min(88, nextX));
        const boundedY = Math.max(50, Math.min(86, nextY));

        return { x: boundedX, y: boundedY };
      });
    }, 85);

    return () => clearInterval(moveTimer);
  }, [myTargetPos, myActionState, pendingActionOnArrival, userNik, effectiveUsername, effectivePangkat]);

  // Clean up expired speech bubbles (Live overhead balloons fade away after 7.5s)
  useEffect(() => {
    const speechCleaner = setInterval(() => {
      const now = Date.now();
      if (mySpeech && mySpeech.expiry < now) {
        setMySpeech(null);
      }
      setOtherAvatars(prev => {
        let changed = false;
        const next = new Map(prev);
        for (const [nik, av] of next.entries()) {
          if (av.speechExpiry && av.speechExpiry < now) {
            next.set(nik, { ...av, speechText: undefined, speechExpiry: undefined });
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(speechCleaner);
  }, [mySpeech]);

  // Socket.IO Listeners (Live presence & overhead speech balloons only)
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/presence/online')
      .then(res => res.json())
      .then(data => {
        if (data?.onlineUsers && Array.isArray(data.onlineUsers)) {
          const others = data.onlineUsers.filter((u: any) => u.nik && u.nik !== userNik);
          setOtherAvatars(prev => {
            const next = new Map(prev);
            others.forEach((u: any, idx: number) => {
              if (!next.has(u.nik)) {
                const spot = LOUNGE_SEATS[(idx + 1) % LOUNGE_SEATS.length];
                const cleanUname = getCleanUsername(u.nik, u.name, u.username);
                const rankData = getPangkatData(u.nik, u.pangkat, u.role || u.jabatan);
                next.set(u.nik, {
                  nik: u.nik,
                  name: cleanUname,
                  username: cleanUname,
                  pangkat: rankData.name,
                  pangkatIcon: rankData.icon,
                  section: u.section || u.department || 'Prep-Lab',
                  posX: spot.x,
                  posY: spot.y,
                  facing: spot.facing,
                  actionState: spot.action,
                  walkFrame: 0,
                  avatarUrl: u.avatar
                });
              }
            });
            return next;
          });
        }
      })
      .catch(() => {});

    const socket = getGlobalSocket();
    const userPayload = {
      room: 'lounge',
      nik: userNik,
      name: effectiveUsername,
      username: effectiveUsername,
      pangkat: effectivePangkat,
      pangkatIcon: effectivePangkatIcon,
      section: userSection,
      avatar: avatarUrl || null,
      posX: myPos.x,
      posY: myPos.y
    };

    joinRoom('lounge', userPayload);

    // Incoming Live Overhead Speech
    const handleNewMessage = (msg: any) => {
      if (msg.room === 'lounge') {
        const isFromMe = msg.senderNik === userNik;
        if (isFromMe) {
          setMySpeech({ text: msg.text, expiry: Date.now() + 7500 });
        } else {
          setOtherAvatars(prev => {
            const next = new Map(prev);
            const existing = next.get(msg.senderNik);
            const senderUname = getCleanUsername(msg.senderNik, msg.senderName, msg.senderUsername);
            const senderRank = getPangkatData(msg.senderNik, msg.senderPangkat);
            if (existing) {
              next.set(msg.senderNik, {
                ...existing,
                username: existing.username || senderUname,
                pangkat: existing.pangkat || senderRank.name,
                pangkatIcon: existing.pangkatIcon || msg.senderPangkatIcon || senderRank.icon,
                speechText: msg.text,
                speechExpiry: Date.now() + 7500
              });
            } else {
              const spot = LOUNGE_SEATS[next.size % LOUNGE_SEATS.length];
              next.set(msg.senderNik, {
                nik: msg.senderNik,
                name: senderUname,
                username: senderUname,
                pangkat: senderRank.name,
                pangkatIcon: msg.senderPangkatIcon || senderRank.icon,
                section: msg.senderSection || 'Prep-Lab',
                posX: spot.x,
                posY: spot.y,
                facing: spot.facing,
                actionState: spot.action,
                walkFrame: 0,
                avatarUrl: msg.senderAvatar,
                speechText: msg.text,
                speechExpiry: Date.now() + 7500
              });
            }
            return next;
          });
          playChime('msg');
        }
      }
    };

    const handleUserMoved = (data: any) => {
      if (data && data.nik && data.nik !== userNik) {
        setOtherAvatars(prev => {
          const next = new Map(prev);
          const existing = next.get(data.nik);
          const movedUname = getCleanUsername(data.nik, data.name, data.username);
          const movedRank = getPangkatData(data.nik, data.pangkat);
          if (existing) {
            next.set(data.nik, {
              ...existing,
              username: data.username || existing.username || movedUname,
              pangkat: data.pangkat || existing.pangkat || movedRank.name,
              pangkatIcon: data.pangkatIcon || existing.pangkatIcon || movedRank.icon,
              posX: data.x,
              posY: data.y,
              facing: data.facing || existing.facing,
              actionState: data.actionState || 'idle'
            });
          }
          return next;
        });
      }
    };

    const handleUserAction = (data: any) => {
      if (data && data.nik && data.nik !== userNik) {
        setOtherAvatars(prev => {
          const next = new Map(prev);
          const existing = next.get(data.nik);
          const actionUname = getCleanUsername(data.nik, data.name, data.username);
          const actionRank = getPangkatData(data.nik, data.pangkat);
          if (existing) {
            next.set(data.nik, {
              ...existing,
              username: data.username || existing.username || actionUname,
              pangkat: data.pangkat || existing.pangkat || actionRank.name,
              pangkatIcon: data.pangkatIcon || existing.pangkatIcon || actionRank.icon,
              actionState: data.actionState || existing.actionState,
              speechText: data.speechText || existing.speechText,
              speechExpiry: data.speechText ? Date.now() + 7500 : existing.speechExpiry
            });
          }
          return next;
        });
        playChime('cheer');
      }
    };

    socket.on('new_message', handleNewMessage);
    socket.on('lounge:user_moved', handleUserMoved);
    socket.on('lounge:user_action', handleUserAction);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('lounge:user_moved', handleUserMoved);
      socket.off('lounge:user_action', handleUserAction);
      leaveRoom();
    };
  }, [isOpen, userNik, effectiveUsername, effectivePangkat, userSection, avatarUrl]);

  // Click on open floor to walk freely
  const handleFloorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!roomStageRef.current) return;
    const rect = roomStageRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const percentX = Math.max(14, Math.min(86, (clickX / rect.width) * 100));
    const percentY = Math.max(52, Math.min(85, (clickY / rect.height) * 100));

    setMyTargetPos({ x: percentX, y: percentY });
    setPendingActionOnArrival('idle');
    setActiveSeatId(null);
    setClickBeacon({ x: percentX, y: percentY });
    playChime('step');

    const socket = getGlobalSocket();
    if (socket.connected) {
      socket.emit('lounge:move', {
        room: 'lounge',
        nik: userNik,
        username: effectiveUsername,
        pangkat: effectivePangkat,
        x: percentX,
        y: percentY,
        facing: percentX >= myPos.x ? 'right' : 'left',
        actionState: 'walk'
      });
    }
  };

  // Click on a piece of furniture to sit directly on it
  const handleSitAtSpot = (spot: LoungeSpot) => {
    setMyTargetPos({ x: spot.x, y: spot.y });
    setMyFacing(spot.facing);
    setPendingActionOnArrival(spot.action);
    setActiveSeatId(spot.id);
    setClickBeacon({ x: spot.x, y: spot.y });
    playChime('step');

    setMySpeech({ text: spot.speech, expiry: Date.now() + 6500 });

    const socket = getGlobalSocket();
    if (socket.connected) {
      socket.emit('lounge:move', {
        room: 'lounge',
        nik: userNik,
        username: effectiveUsername,
        pangkat: effectivePangkat,
        x: spot.x,
        y: spot.y,
        facing: spot.facing,
        actionState: 'walk'
      });
      socket.emit('send_message', {
        room: 'lounge',
        senderNik: userNik,
        senderName: effectiveUsername,
        senderUsername: effectiveUsername,
        senderPangkat: effectivePangkat,
        senderSection: userSection,
        senderAvatar: avatarUrl,
        text: spot.speech,
        timestamp: new Date().toISOString()
      });
    }
  };

  // Send live overhead speech (No history recorded)
  const handleSendMessage = (customText?: string, customAction?: 'idle' | 'walk' | 'coffee' | 'inspect' | 'jump' | 'smoke' | 'sit' | 'smoke_sit' | 'coffee_sit') => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend && !customAction) return;

    const isSittingNow = myActionState === 'sit' || myActionState === 'smoke_sit' || myActionState === 'coffee_sit';
    let targetAction = customAction || myActionState;

    if (customAction === 'smoke') {
      targetAction = isSittingNow ? 'smoke_sit' : 'smoke';
    } else if (customAction === 'coffee') {
      targetAction = isSittingNow ? 'coffee_sit' : 'coffee';
    } else if (customAction === 'sit') {
      targetAction = 'sit';
    }

    setMyActionState(targetAction);
    setMySpeech({ text: textToSend, expiry: Date.now() + 7500 });
    playChime('msg');

    if (!customText) {
      setInputText('');
    }

    const socket = getGlobalSocket();
    if (socket.connected) {
      socket.emit('send_message', {
        room: 'lounge',
        senderNik: userNik,
        senderName: effectiveUsername,
        senderUsername: effectiveUsername,
        senderPangkat: effectivePangkat,
        senderSection: userSection,
        senderAvatar: avatarUrl,
        text: textToSend,
        timestamp: new Date().toISOString()
      });
      socket.emit('lounge:action', {
        room: 'lounge',
        nik: userNik,
        username: effectiveUsername,
        pangkat: effectivePangkat,
        actionState: targetAction,
        speechText: textToSend
      });
    }
  };

  // Direct interaction with another avatar
  const handleInteractWithAvatar = (target: InRoomAvatar, type: 'smoke' | 'coffee' | 'wave' | 'cheer') => {
    let interactionText = '';
    let actionType: 'smoke' | 'coffee' | 'jump' = 'coffee';

    if (type === 'smoke') {
      interactionText = `🚬 Mengajak ${target.username} merokok bareng di Gazebo K3!`;
      actionType = 'smoke';
    } else if (type === 'coffee') {
      interactionText = `☕ Mengajak ${target.username} seruput kopi hangat bareng!`;
      actionType = 'coffee';
    } else if (type === 'wave') {
      interactionText = `👋 Melambaikan tangan hangat ke ${target.username}!`;
      actionType = 'jump';
    } else {
      interactionText = `👍 Memberikan jempol semangat K3 Zero Accident untuk ${target.username}!`;
      actionType = 'jump';
    }
    handleSendMessage(interactionText, actionType);
    setSelectedAvatarForInteract(null);
  };

  // Combine and sort avatars for 2.5D visual depth (higher Y = in front)
  const allRenderAvatars = useMemo(() => {
    const list: InRoomAvatar[] = [
      {
        nik: userNik,
        name: effectiveUsername,
        username: effectiveUsername,
        pangkat: effectivePangkat,
        pangkatIcon: effectivePangkatIcon,
        section: userSection,
        posX: myPos.x,
        posY: myPos.y,
        facing: myFacing,
        actionState: myActionState,
        walkFrame: myWalkFrame,
        speechText: mySpeech?.text,
        speechExpiry: mySpeech?.expiry,
        avatarUrl,
        isMe: true
      },
      ...Array.from(otherAvatars.values())
    ];

    return list.sort((a, b) => a.posY - b.posY);
  }, [userNik, effectiveUsername, effectivePangkat, effectivePangkatIcon, userSection, myPos, myFacing, myActionState, myWalkFrame, mySpeech, avatarUrl, otherAvatars]);

  if (!isOpen) return null;

  const isCurrentSitting = myActionState === 'sit' || myActionState === 'smoke_sit' || myActionState === 'coffee_sit';
  const activeSpot = LOUNGE_SEATS.find(s => s.id === activeSeatId);

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200 select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-5xl h-[94vh] max-h-[880px] bg-slate-900 rounded-3xl shadow-2xl border-2 border-amber-500/40 flex flex-col overflow-hidden relative"
        onClick={e => e.stopPropagation()}
      >
        {/* CSS KEYFRAME ANIMATIONS FOR SMOKE, STEAM & WARM EDISON LIGHTING */}
        <style>{`
          @keyframes smokeAsbakFloatA {
            0% { transform: translateY(0) scale(0.6); opacity: 0.85; }
            50% { transform: translate(-3px, -20px) scale(1.1); opacity: 0.55; }
            100% { transform: translate(2px, -42px) scale(1.8); opacity: 0; }
          }
          @keyframes smokeAsbakFloatB {
            0% { transform: translateY(0) scale(0.5); opacity: 0.75; }
            50% { transform: translate(4px, -24px) scale(1.2); opacity: 0.45; }
            100% { transform: translate(-2px, -48px) scale(2.0); opacity: 0; }
          }
          @keyframes steamCoffeeFloat {
            0% { transform: translateY(0) scale(0.6); opacity: 0.75; }
            50% { transform: translate(2px, -12px) scale(1.0); opacity: 0.45; }
            100% { transform: translate(-1px, -24px) scale(1.5); opacity: 0; }
          }
          @keyframes lanternFlicker {
            0%, 100% { opacity: 0.9; filter: drop-shadow(0 0 12px rgba(251, 191, 36, 0.85)); }
            50% { opacity: 1; filter: drop-shadow(0 0 20px rgba(245, 158, 11, 1)); }
          }
          .smoke-asbak-a { animation: smokeAsbakFloatA 2.4s infinite cubic-bezier(0.4, 0, 0.2, 1); }
          .smoke-asbak-b { animation: smokeAsbakFloatB 3.0s infinite 1.0s cubic-bezier(0.4, 0, 0.2, 1); }
          .steam-coffee { animation: steamCoffeeFloat 2.0s infinite ease-out; }
          .lantern-glow { animation: lanternFlicker 2.5s infinite ease-in-out; }
        `}</style>

        {/* ── TOP HEADER BAR (Crisp, High-Contrast & Enterprise Grade) ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-amber-500/30 bg-slate-900/95 text-white z-20 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shadow-lg font-black text-xl">
              🚬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white font-display flex items-center gap-2">
                  <span>Tempat Nongkrong &amp; Gazebo Merokok PrepLab</span>
                </h3>
                <span className="px-3 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black text-xs shadow-md font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                  <span>{allRenderAvatars.length} Personil Online</span>
                </span>
              </div>
              <p className="text-xs text-slate-200 flex items-center gap-2 mt-0.5 font-medium">
                <span className="text-amber-300 font-bold flex items-center gap-1">
                  <span>🚬 Gazebo Merokok K3</span>
                </span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-emerald-300 font-bold flex items-center gap-1">
                  <span>☕ Meja Ngopi &amp; Cemilan</span>
                </span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-cyan-300 font-bold flex items-center gap-1">
                  <span>🛋️ Sofa Rehat Lab</span>
                </span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-amber-200 bg-amber-500/20 px-2 py-0.5 rounded-md font-bold">
                  Klik langsung furnitur bangku / kursi / sofa untuk duduk!
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2.5 rounded-xl bg-white/10 text-slate-200 hover:text-white hover:bg-white/20 transition-all cursor-pointer shadow-sm"
              title={soundEnabled ? 'Suara Aktif' : 'Bisu'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5 text-amber-400" /> : <VolumeX className="w-5 h-5 opacity-40" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-rose-500/20 text-rose-300 hover:text-white hover:bg-rose-500 transition-all cursor-pointer shadow-sm"
              title="Keluar dari Tempat Nongkrong"
            >
              <X className="w-5 h-5 font-bold" />
            </button>
          </div>
        </div>

        {/* ── MAIN VIBRANT ARCHITECTURAL STAGE ── */}
        <div 
          ref={roomStageRef}
          onClick={handleFloorClick}
          className="w-full flex-1 relative overflow-hidden cursor-crosshair group shadow-inner"
          style={{
            background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 45%, #020617 100%)'
          }}
        >
          {/* 1. ROOM ENVIRONMENT: PANORAMA WINDOW & ARCHITECTURAL FLOORING */}
          <div className="absolute inset-0 pointer-events-none select-none">
            {/* Bright Daytime Panorama Glass Wall overlooking Pulau Obi Nickel Hills */}
            <div 
              className="absolute top-2 left-1/2 -translate-x-1/2 w-[76%] max-w-[660px] h-34 rounded-2xl border-4 border-slate-700/80 overflow-hidden shadow-2xl flex flex-col justify-between p-2"
              style={{
                background: 'linear-gradient(180deg, #38BDF8 0%, #BAE6FD 45%, #FEF08A 75%, #FDE047 100%)'
              }}
            >
              {/* Window Header Banner */}
              <div className="flex items-center justify-between text-[10px] font-black text-slate-900 bg-white/75 backdrop-blur-xs px-3 py-1 rounded-lg shadow-sm">
                <span className="flex items-center gap-1.5 tracking-wider">
                  <Sun className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                  <span>PULAU OBI NICKEL CONCESSION &bull; PT TRIMEGAH BANGUN PERSADA (HARITA NICKEL)</span>
                </span>
                <span className="font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md font-bold">
                  TERAS PREPLAB &bull; 29°C CERAH
                </span>
              </div>

              {/* Nickel Hills Silhouettes in Perspective */}
              <div className="relative h-14 w-full overflow-hidden">
                <svg viewBox="0 0 500 60" className="w-full h-full preserve-3d">
                  <path d="M 0 50 Q 80 15 160 40 Q 240 10 320 35 Q 410 15 500 45 L 500 60 L 0 60 Z" fill="#15803D" opacity="0.8" />
                  <path d="M 0 45 Q 60 25 130 50 Q 220 20 300 45 Q 400 25 500 48 L 500 60 L 0 60 Z" fill="#166534" opacity="0.9" />
                  <path d="M 50 48 L 70 38 L 90 48 Z" fill="#D97706" opacity="0.7" />
                  <path d="M 280 44 L 305 34 L 330 44 Z" fill="#B45309" opacity="0.7" />
                </svg>
              </div>

              {/* Steel Mullion Panes Grid */}
              <div className="absolute inset-0 border-r-2 border-l-2 border-white/25 grid grid-cols-4 pointer-events-none" />
            </div>

            {/* Warm Architectural Hardwood Chevron / Parquet Flooring */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-[56%] border-t-2 border-amber-500/50"
              style={{
                background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 40px), linear-gradient(180deg, #451A03 0%, #78350F 40%, #291202 100%)'
              }}
            />

            {/* K3 High-Visibility Safety Hazard Transition Stripe */}
            <div 
              className="absolute bottom-[55%] left-0 right-0 h-1.5 opacity-90 shadow-md"
              style={{
                background: 'repeating-linear-gradient(45deg, #FACC15, #FACC15 10px, #0F172A 10px, #0F172A 20px)'
              }}
            />
          </div>

          {/* ======================================================== */}
          {/* ZONE 1: GAZEBO & AREA MEROKOK K3 (PERGOLA FRAMEWORK)     */}
          {/* ======================================================== */}
          {/* Architectural Pergola Canopy Roof Structure across Left Terrace */}
          <div className="absolute bottom-[20%] left-[4%] w-[33%] max-w-[340px] pointer-events-none z-5">
            {/* Pergola Timber Rafters */}
            <div className="relative w-full h-8 flex justify-between items-center px-4 -mb-3 z-10">
              <div className="w-3.5 h-8 bg-amber-900 rounded-t-sm border-b-2 border-amber-700 shadow-md" />
              <div className="w-3.5 h-8 bg-amber-900 rounded-t-sm border-b-2 border-amber-700 shadow-md" />
              <div className="w-3.5 h-8 bg-amber-900 rounded-t-sm border-b-2 border-amber-700 shadow-md" />
              <div className="w-3.5 h-8 bg-amber-900 rounded-t-sm border-b-2 border-amber-700 shadow-md" />
            </div>
            {/* Horizontal Heavy Lintel Beam */}
            <div className="w-full h-4.5 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-900 rounded-sm border-b-2 border-amber-950 shadow-xl flex items-center justify-around px-6">
              {/* 3 Industrial Cage Edison Pendant Lights */}
              <div className="w-5 h-7 rounded-full bg-amber-400 lantern-glow flex items-center justify-center text-[10px] shadow-lg mt-5">💡</div>
              <div className="w-5 h-7 rounded-full bg-amber-300 lantern-glow flex items-center justify-center text-[10px] shadow-lg mt-5">💡</div>
              <div className="w-5 h-7 rounded-full bg-amber-400 lantern-glow flex items-center justify-center text-[10px] shadow-lg mt-5">💡</div>
            </div>

            {/* Official Harita TBP Enamel Green K3 Signboard */}
            <div className="mt-3 mx-auto w-[94%] px-3 py-1.5 rounded-xl bg-emerald-600 text-white border-2 border-emerald-300 flex items-center justify-between shadow-2xl">
              <div className="flex items-center gap-2">
                <span className="text-base">🚬</span>
                <div className="leading-tight">
                  <div className="text-[10px] font-black tracking-wider uppercase">AREA MEROKOK RESMI K3</div>
                  <div className="text-[7.5px] font-bold text-emerald-100 font-mono">SITE PULAU OBI &bull; PREPLAB HARITA TBP</div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-white text-emerald-800 font-black text-[8px] shadow-xs">
                K3 ZERO ACCIDENT
              </span>
            </div>

            {/* Subtle Protective Railing behind benches */}
            <div className="w-full h-8 border-b border-t border-slate-600/40 mt-1 flex justify-around items-center px-4 opacity-40">
              <div className="w-1 h-full bg-slate-500" />
              <div className="w-1 h-full bg-slate-500" />
              <div className="w-1 h-full bg-slate-500" />
              <div className="w-1 h-full bg-slate-500" />
            </div>
          </div>

          {/* ── UNIFIED PERSPECTIVE 2.5D FURNITURE MODELS ── */}
          {/* 1. Bangku Merokok 1 (Left Bench) - Exactly anchored at x: 13%, y: 79% */}
          <div 
            className="absolute -translate-x-1/2 -translate-y-full cursor-pointer group/bench1"
            style={{ 
              left: '13%', 
              top: '79%', 
              width: 136, 
              zIndex: 790 
            }}
            onMouseEnter={() => setHoveredFurniture('bench_1')}
            onMouseLeave={() => setHoveredFurniture(null)}
            onClick={(e) => {
              e.stopPropagation();
              handleSitAtSpot(LOUNGE_SEATS[0]);
            }}
          >
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/bench1:opacity-100 transition-opacity bg-amber-400 text-slate-950 font-black text-[9px] px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap pointer-events-none flex items-center gap-1 z-50">
              <span>🚬</span>
              <span>Bangku 1 &bull; Klik Duduk &amp; Merokok</span>
            </div>
            <TeakParkBench facing="right" isHovered={hoveredFurniture === 'bench_1' || activeSeatId === 'bench_1'} />
          </div>

          {/* 2. Standing Stainless Ashtray - Anchored at x: 22%, y: 80% */}
          <div 
            className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
            style={{ 
              left: '22%', 
              top: '80%', 
              width: 36, 
              zIndex: 800 
            }}
          >
            <StandingAshtray />
          </div>

          {/* 3. Bangku Merokok 2 (Right Bench) - Exactly anchored at x: 31%, y: 79% */}
          <div 
            className="absolute -translate-x-1/2 -translate-y-full cursor-pointer group/bench2"
            style={{ 
              left: '31%', 
              top: '79%', 
              width: 136, 
              zIndex: 790 
            }}
            onMouseEnter={() => setHoveredFurniture('bench_2')}
            onMouseLeave={() => setHoveredFurniture(null)}
            onClick={(e) => {
              e.stopPropagation();
              handleSitAtSpot(LOUNGE_SEATS[1]);
            }}
          >
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/bench2:opacity-100 transition-opacity bg-amber-400 text-slate-950 font-black text-[9px] px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap pointer-events-none flex items-center gap-1 z-50">
              <span>🚬</span>
              <span>Bangku 2 &bull; Klik Duduk &amp; Merokok</span>
            </div>
            <TeakParkBench facing="left" isHovered={hoveredFurniture === 'bench_2' || activeSeatId === 'bench_2'} />
          </div>

          {/* 4. Bar Minuman & Dispenser - Anchored at x: 38%, y: 64% */}
          <div 
            className="absolute -translate-x-1/2 -translate-y-full cursor-pointer group/bar"
            style={{ 
              left: '38%', 
              top: '64%', 
              width: 120, 
              zIndex: 640 
            }}
            onMouseEnter={() => setHoveredFurniture('bar_refreshment')}
            onMouseLeave={() => setHoveredFurniture(null)}
            onClick={(e) => {
              e.stopPropagation();
              handleSitAtSpot(LOUNGE_SEATS[6]);
            }}
          >
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/bar:opacity-100 transition-opacity bg-purple-400 text-slate-950 font-black text-[9px] px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap pointer-events-none flex items-center gap-1 z-50">
              <span>🫖</span>
              <span>Bar Minuman &bull; Ambil Kopi/Teh</span>
            </div>
            <BeverageBarCounter isHovered={hoveredFurniture === 'bar_refreshment' || activeSeatId === 'bar_refreshment'} />
          </div>

          {/* 5. Kursi Kopi 1 (Left Chair) - Anchored at x: 44%, y: 78% */}
          <div 
            className="absolute -translate-x-1/2 -translate-y-full cursor-pointer group/chair1"
            style={{ 
              left: '44%', 
              top: '78%', 
              width: 70, 
              zIndex: 780 
            }}
            onMouseEnter={() => setHoveredFurniture('chair_coffee_1')}
            onMouseLeave={() => setHoveredFurniture(null)}
            onClick={(e) => {
              e.stopPropagation();
              handleSitAtSpot(LOUNGE_SEATS[2]);
            }}
          >
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/chair1:opacity-100 transition-opacity bg-emerald-400 text-slate-950 font-black text-[9px] px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap pointer-events-none flex items-center gap-1 z-50">
              <span>☕</span>
              <span>Kursi Kopi 1 &bull; Klik Duduk</span>
            </div>
            <WoodenDiningChair facing="right" isHovered={hoveredFurniture === 'chair_coffee_1' || activeSeatId === 'chair_coffee_1'} />
          </div>

          {/* 6. Round Teak Coffee Table - Anchored at x: 52%, y: 82% (In front of chairs) */}
          <div 
            className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
            style={{ 
              left: '52%', 
              top: '82%', 
              width: 145, 
              zIndex: 820 
            }}
          >
            <RoundCoffeeTable />
          </div>

          {/* 7. Kursi Kopi 2 (Right Chair) - Anchored at x: 60%, y: 78% */}
          <div 
            className="absolute -translate-x-1/2 -translate-y-full cursor-pointer group/chair2"
            style={{ 
              left: '60%', 
              top: '78%', 
              width: 70, 
              zIndex: 780 
            }}
            onMouseEnter={() => setHoveredFurniture('chair_coffee_2')}
            onMouseLeave={() => setHoveredFurniture(null)}
            onClick={(e) => {
              e.stopPropagation();
              handleSitAtSpot(LOUNGE_SEATS[3]);
            }}
          >
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/chair2:opacity-100 transition-opacity bg-emerald-400 text-slate-950 font-black text-[9px] px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap pointer-events-none flex items-center gap-1 z-50">
              <span>☕</span>
              <span>Kursi Kopi 2 &bull; Klik Duduk</span>
            </div>
            <WoodenDiningChair facing="left" isHovered={hoveredFurniture === 'chair_coffee_2' || activeSeatId === 'chair_coffee_2'} />
          </div>

          {/* 8. Modular Lounge Sofa - Anchored at x: 79%, y: 78% */}
          <div 
            className="absolute -translate-x-1/2 -translate-y-full cursor-pointer group/sofa"
            style={{ 
              left: '79%', 
              top: '78%', 
              width: 200, 
              zIndex: 780 
            }}
            onMouseEnter={() => setHoveredFurniture('sofa_left')}
            onMouseLeave={() => setHoveredFurniture(null)}
            onClick={(e) => {
              e.stopPropagation();
              handleSitAtSpot(LOUNGE_SEATS[4]);
            }}
          >
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 opacity-0 group-hover/sofa:opacity-100 transition-opacity bg-cyan-400 text-slate-950 font-black text-[9px] px-2.5 py-1 rounded-lg shadow-xl whitespace-nowrap pointer-events-none flex items-center gap-1 z-50">
              <span>🛋️</span>
              <span>Sofa Rehat Lab &bull; Klik Duduk Selonjoran</span>
            </div>
            <ModularLoungeSofa isHovered={hoveredFurniture === 'sofa_left' || activeSeatId === 'sofa_left' || activeSeatId === 'sofa_right'} />
          </div>

          {/* Click Destination Beacon Ripple on Floor */}
          {clickBeacon !== null && (
            <div 
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-ping z-10"
              style={{ left: `${clickBeacon.x}%`, top: `${clickBeacon.y}%` }}
            >
              <div className="w-10 h-5 rounded-full border-2 border-amber-400 bg-amber-400/50 shadow-xl" />
            </div>
          )}

          {/* ── 9. IN-WORLD GATHERED AVATARS (2.5D visual depth sorting) ── */}
          {allRenderAvatars.map((av) => {
            const isMe = av.isMe;

            return (
              <div
                key={av.nik}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isMe) {
                    setSelectedAvatarForInteract(av);
                  }
                }}
                className={`absolute -translate-x-1/2 -translate-y-full flex flex-col items-center transition-all duration-75 cursor-pointer group/avatar ${
                  isMe ? 'z-30' : 'z-20'
                }`}
                style={{
                  left: `${av.posX}%`,
                  top: `${av.posY}%`,
                  // Seated avatar sits with z-index slightly above the furniture (+2) so it rests on cushion!
                  zIndex: Math.floor(av.posY * 10) + 2
                }}
                title={isMe ? `${effectiveUsername} • ${effectivePangkat}` : `Klik untuk interaksi dengan ${av.username} • ${av.pangkat}`}
              >
                {/* Floating Overhead Speech Balloon (Pure Live Dialogue - Fades away) */}
                {av.speechText && (
                  <div className="mb-1 max-w-[220px] sm:max-w-[260px] px-3.5 py-2 rounded-2xl bg-white text-slate-950 text-[11px] font-bold shadow-2xl border-2 border-amber-500 text-center relative animate-in fade-in zoom-in-95 leading-snug">
                    <p className="break-words">
                      {av.speechText}
                    </p>
                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-b-2 border-r-2 border-amber-500 rotate-45" />
                  </div>
                )}

                {/* Overhead Username & Logo Pangkat Badge Pill (Hanya Username & Logo Pangkat Saja) */}
                <div className="mb-0.5 px-2 py-0.5 rounded-full bg-slate-950/95 backdrop-blur-md text-white text-[9px] font-bold flex items-center gap-1.5 shadow-xl border border-white/20 whitespace-nowrap">
                  <span className={isMe ? 'text-amber-400 font-black' : 'text-slate-100 font-bold'}>
                    {av.username}
                  </span>
                  <span 
                    className="p-0.5 rounded-md bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-xs"
                    title={av.pangkat}
                  >
                    <img
                      src={av.pangkatIcon || '/assets/ranks/rank_01_trainee.svg'}
                      alt={av.pangkat}
                      className="w-4 h-4 object-contain inline-block shrink-0"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  </span>
                  {(av.actionState === 'smoke' || av.actionState === 'smoke_sit') && (
                    <span title="Sedang Merokok" className="text-xs">🚬</span>
                  )}
                  {(av.actionState === 'coffee' || av.actionState === 'coffee_sit') && (
                    <span title="Sedang Ngopi" className="text-xs">☕</span>
                  )}
                  {av.actionState === 'sit' && (
                    <span title="Sedang Duduk" className="text-xs">🪑</span>
                  )}
                </div>

                {/* CRISP HIGH-DEFINITION TBP UNIFORM AVATAR */}
                <div className="relative group/sprite hover:scale-105 transition-transform">
                  {(() => {
                    const skinToneObj = myCustomCfg?.skinId === 'custom' 
                      ? { skin: myCustomCfg.customSkinColor, skinShadow: myCustomCfg.customSkinShadow }
                      : (SKIN_TONES.find(s => s.id === myCustomCfg?.skinId) || null);

                    return (
                      <TbpAvatarCharacter
                        actionState={av.actionState}
                        walkFrame={av.walkFrame}
                        facing={av.facing}
                        skinColor={isMe && skinToneObj ? skinToneObj.skin : undefined}
                        skinShadow={isMe && skinToneObj ? skinToneObj.skinShadow : undefined}
                        eyeId={isMe && myCustomCfg?.eyesId ? myCustomCfg.eyesId : undefined}
                        headwearId={isMe && myCustomCfg?.headwearId ? myCustomCfg.headwearId : undefined}
                        outfitId={isMe && myCustomCfg?.outfitId ? myCustomCfg.outfitId : undefined}
                        accessoryId={isMe && myCustomCfg?.accessoryId ? myCustomCfg.accessoryId : undefined}
                        bootsId={isMe && myCustomCfg?.bootsId ? myCustomCfg.bootsId : undefined}
                        userName={av.username}
                        userNik={av.nik}
                        width={84}
                        height={116}
                      />
                    );
                  })()}

                  {!isMe && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 opacity-0 group-hover/sprite:opacity-100 transition-opacity px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black whitespace-nowrap shadow-xl">
                      👋 Klik Sapa!
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Interactive Popover Menu when Clicking Another Avatar */}
          {selectedAvatarForInteract && (
            <div 
              className="absolute z-50 p-3.5 rounded-2xl bg-slate-950 text-white shadow-2xl border-2 border-amber-500 flex flex-col gap-2 min-w-[230px] animate-in fade-in zoom-in-95 -translate-x-1/2"
              style={{
                left: `${selectedAvatarForInteract.posX}%`,
                top: `${Math.max(20, selectedAvatarForInteract.posY - 40)}%`
              }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-black text-amber-400">{selectedAvatarForInteract.username}</div>
                  <img
                    src={selectedAvatarForInteract.pangkatIcon || '/assets/ranks/rank_01_trainee.svg'}
                    alt={selectedAvatarForInteract.pangkat}
                    title={selectedAvatarForInteract.pangkat}
                    className="w-4 h-4 object-contain inline-block shrink-0"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedAvatarForInteract(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4 font-bold" />
                </button>
              </div>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleInteractWithAvatar(selectedAvatarForInteract, 'smoke')}
                  className="w-full px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-400 hover:text-slate-950 text-amber-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-left"
                >
                  <span className="text-sm">🚬</span>
                  <span>Ajak Merokok di Gazebo</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInteractWithAvatar(selectedAvatarForInteract, 'coffee')}
                  className="w-full px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-400 hover:text-slate-950 text-emerald-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-left"
                >
                  <Coffee className="w-4 h-4" />
                  <span>☕ Tos Kopi Bareng</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInteractWithAvatar(selectedAvatarForInteract, 'wave')}
                  className="w-full px-3 py-2 rounded-xl bg-teal-500/20 hover:bg-teal-400 hover:text-slate-950 text-teal-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-left"
                >
                  <span className="text-sm">👋</span>
                  <span>Lambaikan Tangan</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleInteractWithAvatar(selectedAvatarForInteract, 'cheer')}
                  className="w-full px-3 py-2 rounded-xl bg-lime-500/20 hover:bg-lime-400 hover:text-slate-950 text-lime-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer text-left"
                >
                  <span className="text-sm">👍</span>
                  <span>Beri Jempol K3</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Tip on Floor */}
          <div className="absolute bottom-2 left-4 pointer-events-none text-[10px] font-mono text-amber-300 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-amber-500/40 shadow-lg">
            💡 Klik langsung model bangku, kursi, atau sofa untuk duduk &bull; Klik lantai terbuka untuk berjalan bebas!
          </div>
        </div>

        {/* ── BOTTOM COMMAND DECK & ENTERPRISE CONTROLS ── */}
        <div className="p-3.5 border-t-2 border-amber-500/30 bg-slate-950 flex flex-col gap-2.5 z-20 shadow-2xl">
          {/* Active Status Pill & Quick Furniture Jump Bar */}
          <div className="flex items-center justify-between text-xs pb-1 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Anda:</span>
              <span className="px-3 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                <span>{isCurrentSitting ? (myActionState === 'smoke_sit' ? '🚬' : (myActionState === 'coffee_sit' ? '☕' : '🪑')) : '🚶'}</span>
                <span>
                  {isCurrentSitting 
                    ? (activeSpot ? `Duduk di ${activeSpot.name} (${activeSpot.zoneTitle})` : 'Sedang Duduk Santai')
                    : 'Siaga K3 &bull; Berdiri / Patroli Keliling'}
                </span>
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-400">Pindah Duduk:</span>
              <button
                type="button"
                onClick={() => handleSitAtSpot(LOUNGE_SEATS[0])}
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] transition-all cursor-pointer shadow-sm ${
                  activeSeatId === 'bench_1'
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-white'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                Gazebo 1
              </button>
              <button
                type="button"
                onClick={() => handleSitAtSpot(LOUNGE_SEATS[1])}
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] transition-all cursor-pointer shadow-sm ${
                  activeSeatId === 'bench_2'
                    ? 'bg-amber-400 text-slate-950 ring-2 ring-white'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                Gazebo 2
              </button>
              <button
                type="button"
                onClick={() => handleSitAtSpot(LOUNGE_SEATS[2])}
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] transition-all cursor-pointer shadow-sm ${
                  activeSeatId === 'chair_coffee_1' || activeSeatId === 'chair_coffee_2'
                    ? 'bg-emerald-400 text-slate-950 ring-2 ring-white'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                Meja Kopi
              </button>
              <button
                type="button"
                onClick={() => handleSitAtSpot(LOUNGE_SEATS[4])}
                className={`px-2.5 py-1 rounded-lg font-black text-[10px] transition-all cursor-pointer shadow-sm ${
                  activeSeatId === 'sofa_left' || activeSeatId === 'sofa_right'
                    ? 'bg-cyan-400 text-slate-950 ring-2 ring-white'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                Sofa Lab
              </button>
            </div>
          </div>

          {/* Quick Avatar Actions Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-xs font-black text-amber-400 whitespace-nowrap pl-1 pr-1 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Aksi Langsung:</span>
            </span>

            {/* Quick action: Duduk / Berdiri toggle */}
            <button
              type="button"
              onClick={() => {
                if (isCurrentSitting) {
                  setMyActionState('idle');
                  setActiveSeatId(null);
                } else {
                  handleSitAtSpot(LOUNGE_SEATS[0]);
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 ${
                isCurrentSitting 
                  ? 'bg-amber-400 text-slate-950 border-amber-300' 
                  : 'bg-slate-800 text-slate-100 border-white/20 hover:bg-slate-700'
              }`}
            >
              <span>{isCurrentSitting ? '🚶' : '🪑'}</span>
              <span>{isCurrentSitting ? 'Berdiri' : 'Duduk Santai'}</span>
            </button>

            {/* Quick action: Merokok */}
            <button
              type="button"
              onClick={() => handleSendMessage('🚬 Santai sejenak hisap rokok di Gazebo K3...', 'smoke')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 ${
                myActionState === 'smoke' || myActionState === 'smoke_sit'
                  ? 'bg-amber-400 text-slate-950 border-amber-300' 
                  : 'bg-slate-800 text-slate-100 border-white/20 hover:bg-slate-700'
              }`}
            >
              <span>🚬</span>
              <span>Merokok Santai</span>
            </button>

            {/* Other Quick Actions */}
            <button
              type="button"
              onClick={() => handleSendMessage('☕ Seruput kopi hitam hangat sambil rehat sejenak!', 'coffee')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95 ${
                myActionState === 'coffee' || myActionState === 'coffee_sit'
                  ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-black'
                  : 'bg-slate-800 text-slate-100 border-white/20 hover:bg-slate-700'
              }`}
            >
              <span>☕</span>
              <span>Seruput Kopi</span>
            </button>

            <button
              type="button"
              onClick={() => handleSendMessage('🥪 Menaruh pisang goreng & snack hangat di meja!', 'coffee')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <span>🥪</span>
              <span>Bagi Pisang Goreng</span>
            </button>

            <button
              type="button"
              onClick={() => handleSendMessage('👋 Halo rekan shift Preparasi & Lab Nikel TBP!', 'jump')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <span>👋</span>
              <span>Sapa Rekan</span>
            </button>

            <button
              type="button"
              onClick={() => handleSendMessage('👍 Zero Accident harga mati di site TBP!', 'jump')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <span>👍</span>
              <span>Mantap K3</span>
            </button>

            <button
              type="button"
              onClick={() => handleSendMessage('🪨 Sample saprolite & limonite shift ini mantap!', 'inspect')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-white/20 transition-all cursor-pointer flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <span>🪨</span>
              <span>Bahas Sample</span>
            </button>
          </div>

          {/* Live Speech Input & Send (Pure live speech - No persistent history log) */}
          <div className="flex items-center gap-2.5">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Ketik obrolan langsung (balon percakapan muncul di atas kepala avatar)..."
              className="flex-1 px-4 py-2.5 rounded-2xl bg-slate-900 border-2 border-white/20 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-hidden focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-all"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className="px-5 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-xl transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4 font-bold" />
              <span>Kirim</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
