import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Coffee, Send, Users, X, Sparkles, Smile, RefreshCw, 
  ShieldCheck, Flame, Volume2, VolumeX, MapPin, Footprints,
  Cigarette, Sun, Compass, Armchair, ChevronRight
} from 'lucide-react';
import { getGlobalSocket, joinLounge, leaveLounge } from '../../lib/socketClient';
import { getRankByXp } from '../../lib/pointBlankRanks';
import { TbpAvatarCharacter } from '../avatar/TbpAvatarCharacter';
import { GbaCharacterSprite } from '../avatar/GbaCharacterSprite';
import { GbaOverworldMap } from '../avatar/GbaOverworldMap';
import { SKIN_TONES } from './Avatar3DWidget';
import { 
  TeakParkBench, 
  StandingAshtray, 
  RoundCoffeeTable, 
  WoodenDiningChair, 
  ModularLoungeSofa, 
  BeverageBarCounter,
  GbaNickelSampleDrums,
  GbaK3SignPost
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
  facing: 'down' | 'up' | 'left' | 'right';
  actionState: 'idle' | 'walk' | 'coffee' | 'inspect' | 'jump' | 'smoke' | 'sit' | 'smoke_sit' | 'coffee_sit';
  walkFrame: number;
  speechText?: string;
  speechExpiry?: number;
  avatarUrl?: string;
  isMe?: boolean;
  isLive?: boolean;
  isDuty?: boolean;
}

interface LoungeSpot {
  id: string;
  name: string;
  zoneTitle: string;
  x: number; // Percentage width
  y: number; // Percentage height (exact ground baseline)
  facing: 'down' | 'up' | 'left' | 'right';
  action: 'smoke_sit' | 'sit' | 'coffee' | 'coffee_sit' | 'smoke' | 'idle' | 'inspect';
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

// EXACT MATCH: Comprehensive distributed seating & relaxation spots across the 2.5D Lounge
const LOUNGE_SEATS: LoungeSpot[] = [
  // 1-5: Gazebo & Smoking Zone (All sitting avatars face forward: 'down')
  {
    id: 'bench_1',
    name: 'Bangku Gazebo 1 (Sisi Kiri)',
    zoneTitle: 'Area Merokok K3',
    x: 13,
    y: 79,
    facing: 'down',
    action: 'smoke_sit',
    speech: '🚬 Menikmati hisapan rokok santai di Gazebo K3...',
    icon: '🚬'
  },
  {
    id: 'bench_1_b',
    name: 'Bangku Gazebo 1 (Sisi Kanan)',
    zoneTitle: 'Area Merokok K3',
    x: 17,
    y: 79,
    facing: 'down',
    action: 'smoke_sit',
    speech: '🚬 Ngobrol santai sambil merokok bareng rekan shift...',
    icon: '🚬'
  },
  {
    id: 'ashtray_stand',
    name: 'Asbak Berdiri Gazebo',
    zoneTitle: 'Area Merokok K3',
    x: 22,
    y: 83,
    facing: 'down',
    action: 'smoke',
    speech: '🚬 Berdiri santai di asbak stainless buang puntung aman K3.',
    icon: '🚬'
  },
  {
    id: 'bench_2_b',
    name: 'Bangku Gazebo 2 (Sisi Kiri)',
    zoneTitle: 'Area Merokok K3',
    x: 27,
    y: 79,
    facing: 'down',
    action: 'smoke_sit',
    speech: '🚬 Rehat sejenak sebelum inspeksi crush & pulverize.',
    icon: '🚬'
  },
  {
    id: 'bench_2',
    name: 'Bangku Gazebo 2 (Sisi Kanan)',
    zoneTitle: 'Area Merokok K3',
    x: 31,
    y: 79,
    facing: 'down',
    action: 'smoke_sit',
    speech: '🚬 Duduk merokok santai sambil obrol shift preparasi!',
    icon: '🚬'
  },

  // 6-7: Beverage Station Bar
  {
    id: 'bar_refreshment',
    name: 'Bar Minuman Dispenser',
    zoneTitle: 'Stasiun Minuman',
    x: 36,
    y: 64,
    facing: 'right',
    action: 'coffee',
    speech: '🫖 Seduh kopi & teh hangat di dispenser bar...',
    icon: '🫖'
  },
  {
    id: 'bar_counter_right',
    name: 'Sisi Kanan Bar Minuman',
    zoneTitle: 'Stasiun Minuman',
    x: 41,
    y: 64,
    facing: 'left',
    action: 'coffee',
    speech: '☕ Siapin gelas kopi hangat buat rekan-rekan shift.',
    icon: '☕'
  },

  // 8-11: Coffee Table & Dining Chairs
  {
    id: 'chair_coffee_1',
    name: 'Kursi Kopi Kiri',
    zoneTitle: 'Meja Santai Shift',
    x: 44,
    y: 78,
    facing: 'right',
    action: 'coffee_sit',
    speech: '☕ Duduk santai seruput kopi hangat di meja shift...',
    icon: '☕'
  },
  {
    id: 'table_coffee_back',
    name: 'Belakang Meja Kopi',
    zoneTitle: 'Meja Santai Shift',
    x: 52,
    y: 72,
    facing: 'right',
    action: 'coffee',
    speech: '☕ Santai sejenak ngopi sambil pantau koordinasi tim.',
    icon: '☕'
  },
  {
    id: 'table_coffee_front',
    name: 'Depan Meja Kopi',
    zoneTitle: 'Meja Santai Shift',
    x: 52,
    y: 84,
    facing: 'left',
    action: 'coffee_sit',
    speech: '🥪 Ambil pisang goreng hangat di piring meja.',
    icon: '🥪'
  },
  {
    id: 'chair_coffee_2',
    name: 'Kursi Kopi Kanan',
    zoneTitle: 'Meja Santai Shift',
    x: 60,
    y: 78,
    facing: 'left',
    action: 'coffee_sit',
    speech: '☕ Ngopi hangat sambil santai nikmati pisang goreng!',
    icon: '☕'
  },

  // 12-15: Modular Lab Lounge Sofas
  {
    id: 'sofa_left',
    name: 'Sofa Rehat (Kiri)',
    zoneTitle: 'Sofa Rehat Lab',
    x: 73,
    y: 78,
    facing: 'right',
    action: 'sit',
    speech: '🛋️ Duduk selonjoran santai rehat di sofa lab...',
    icon: '🛋️'
  },
  {
    id: 'sofa_center',
    name: 'Sofa Rehat (Tengah)',
    zoneTitle: 'Sofa Rehat Lab',
    x: 79,
    y: 78,
    facing: 'left',
    action: 'sit',
    speech: '🛋️ Rehat sejenak sebelum inspeksi alat berikutnya.',
    icon: '🛋️'
  },
  {
    id: 'sofa_right',
    name: 'Sofa Rehat (Kanan)',
    zoneTitle: 'Sofa Rehat Lab',
    x: 85,
    y: 78,
    facing: 'left',
    action: 'sit',
    speech: '🛋️ Santai selonjoran rehat kaki setelah keliling area.',
    icon: '🛋️'
  },
  {
    id: 'sofa_front_rug',
    name: 'Karpet Depan Sofa',
    zoneTitle: 'Sofa Rehat Lab',
    x: 77,
    y: 84,
    facing: 'right',
    action: 'coffee_sit',
    speech: '☕ Duduk santai dekat sofa sambil obrol santai.',
    icon: '☕'
  },

  // 16-18: Panorama Window Deck Overlooking Pulau Obi Nickel
  {
    id: 'window_terrace_left',
    name: 'Jendela Kaca Kiri',
    zoneTitle: 'Panorama Pulau Obi',
    x: 25,
    y: 62,
    facing: 'right',
    action: 'inspect',
    speech: '☀️ Memandang bukit nikel Pulau Obi dari teras kaca.',
    icon: '☀️'
  },
  {
    id: 'window_terrace_center',
    name: 'Jendela Kaca Tengah',
    zoneTitle: 'Panorama Pulau Obi',
    x: 50,
    y: 62,
    facing: 'left',
    action: 'inspect',
    speech: '🏔️ Udara Obi cerah hari ini, semangat target shift!',
    icon: '🏔️'
  },
  {
    id: 'window_terrace_right',
    name: 'Jendela Kaca Kanan',
    zoneTitle: 'Panorama Pulau Obi',
    x: 68,
    y: 62,
    facing: 'right',
    action: 'inspect',
    speech: '🔭 Pantau suasana pit dan crushing plant dari jauh.',
    icon: '🔭'
  },

  // 19-20: Terrace Walkways
  {
    id: 'terrace_walkway_left',
    name: 'Selasar Depan Kiri',
    zoneTitle: 'Selasar Teras',
    x: 38,
    y: 85,
    facing: 'right',
    action: 'idle',
    speech: '🚶 Patroli keliling area teras memastikan K3 aman.',
    icon: '🚶'
  },
  {
    id: 'terrace_walkway_right',
    name: 'Selasar Depan Kanan',
    zoneTitle: 'Selasar Teras',
    x: 88,
    y: 85,
    facing: 'left',
    action: 'idle',
    speech: '🚶 Santai berdiri dekat pintu teras rehat lab.',
    icon: '🚶'
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
  const [myFacing, setMyFacing] = useState<'down' | 'up' | 'left' | 'right'>('down');
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
  const [isSyncing, setIsSyncing] = useState(false);

  // Click target beacon ripple on floor
  const [clickBeacon, setClickBeacon] = useState<{ x: number; y: number } | null>(null);

  const roomStageRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Decoupled refs to eliminate re-triggering socket subscriptions during movement
  const myPosRef = useRef(myPos);
  myPosRef.current = myPos;
  const myFacingRef = useRef(myFacing);
  myFacingRef.current = myFacing;
  const myActionStateRef = useRef(myActionState);
  myActionStateRef.current = myActionState;

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

  // Synchronize presence data from server (STRICTLY real-time live users inside lounge)
  const syncOnlinePresence = useCallback((data: any) => {
    if (!data) return;
    const rawLounge = Array.isArray(data.loungeMembers) ? data.loungeMembers : [];

    setOtherAvatars(prev => {
      const next = new Map<string, InRoomAvatar>();

      // ONLY process Lounge Members (Real-time live avatars currently inside lounge)
      rawLounge.forEach((lm: any) => {
        if (!lm.nik || lm.nik === userNik) return;
        const existing = prev.get(lm.nik);
        const cleanUname = getCleanUsername(lm.nik, lm.name, lm.username);
        const rankData = getPangkatData(lm.nik, lm.pangkat);
        next.set(lm.nik, {
          nik: lm.nik,
          name: cleanUname,
          username: cleanUname,
          pangkat: lm.pangkat || rankData.name,
          pangkatIcon: lm.pangkatIcon || rankData.icon,
          section: lm.section || 'Prep-Lab',
          posX: typeof lm.posX === 'number' ? lm.posX : (existing?.posX ?? 13),
          posY: typeof lm.posY === 'number' ? lm.posY : (existing?.posY ?? 79),
          facing: lm.facing || existing?.facing || 'right',
          actionState: lm.actionState || existing?.actionState || 'idle',
          walkFrame: existing?.walkFrame ?? 0,
          speechText: lm.speechText || existing?.speechText,
          speechExpiry: lm.speechExpiry || existing?.speechExpiry,
          avatarUrl: lm.avatar || existing?.avatarUrl,
          isLive: true
        });
      });

      return next;
    });
  }, [userNik]);

  const fetchPresenceOnline = useCallback(async () => {
    try {
      const res = await fetch('/api/presence/online');
      if (!res.ok) return;
      const data = await res.json();
      syncOnlinePresence(data);
    } catch (err) {
      console.warn('Failed to fetch online presence:', err);
    }
  }, [syncOnlinePresence]);

  const handleManualSync = useCallback(async () => {
    try {
      setIsSyncing(true);
      await fetchPresenceOnline();
    } finally {
      setTimeout(() => setIsSyncing(false), 600);
    }
  }, [fetchPresenceOnline]);

  // Socket.IO Real-time Synchronization & Presence Listeners
  useEffect(() => {
    if (!isOpen) return;

    // 1. Initial snapshot fetch
    fetchPresenceOnline();

    // 2. Periodic background refresh fallback (every 8s) to ensure zero desync
    const pollingTimer = setInterval(fetchPresenceOnline, 8000);

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
      posX: myPosRef.current.x,
      posY: myPosRef.current.y,
      facing: myFacingRef.current,
      actionState: myActionStateRef.current
    };

    // Join lounge explicitly (emits chat:join & lounge:join)
    joinLounge(userPayload);

    // Initial lounge avatar snapshot from server
    // Initial lounge avatar snapshot from server (authoritative sync)
    const handleLoungeSync = (avatarList: any[]) => {
      if (Array.isArray(avatarList)) {
        setOtherAvatars(() => {
          const next = new Map<string, InRoomAvatar>();
          avatarList.forEach((av: any) => {
            if (!av || !av.nik || av.nik === userNik) return;
            const cleanUname = getCleanUsername(av.nik, av.name, av.username);
            const rankData = getPangkatData(av.nik, av.pangkat);
            next.set(av.nik, {
              nik: av.nik,
              name: cleanUname,
              username: cleanUname,
              pangkat: av.pangkat || rankData.name,
              pangkatIcon: av.pangkatIcon || rankData.icon,
              section: av.section || 'Prep-Lab',
              posX: typeof av.posX === 'number' ? av.posX : 13,
              posY: typeof av.posY === 'number' ? av.posY : 79,
              facing: av.facing || 'right',
              actionState: av.actionState || 'idle',
              walkFrame: 0,
              speechText: av.speechText,
              speechExpiry: av.speechExpiry,
              avatarUrl: av.avatar,
              isLive: true
            });
          });
          return next;
        });
      }
    };

    // Real-time user joined the lounge
    const handleUserJoined = (data: any) => {
      if (!data || !data.nik || data.nik === userNik) return;
      const cleanUname = getCleanUsername(data.nik, data.name, data.username);
      const rankData = getPangkatData(data.nik, data.pangkat);
      setOtherAvatars(prev => {
        const next = new Map(prev);
        const existing = next.get(data.nik);
        next.set(data.nik, {
          nik: data.nik,
          name: cleanUname,
          username: cleanUname,
          pangkat: data.pangkat || rankData.name,
          pangkatIcon: data.pangkatIcon || rankData.icon,
          section: data.section || 'Prep-Lab',
          posX: typeof data.posX === 'number' ? data.posX : (existing?.posX ?? 13),
          posY: typeof data.posY === 'number' ? data.posY : (existing?.posY ?? 79),
          facing: data.facing || existing?.facing || 'right',
          actionState: data.actionState || existing?.actionState || 'idle',
          walkFrame: 0,
          avatarUrl: data.avatar || existing?.avatarUrl,
          isLive: true
        });
        return next;
      });
      playChime('cheer');
    };

    // Real-time user left the lounge
    const handleUserLeft = (data: any) => {
      if (!data || !data.nik) return;
      setOtherAvatars(prev => {
        const next = new Map(prev);
        next.delete(data.nik);
        return next;
      });
    };

    // Incoming Live Overhead Speech
    const handleNewMessage = (msg: any) => {
      if (msg.room === 'lounge') {
        const isFromMe = msg.senderNik === userNik;
        if (isFromMe) {
          setMySpeech({ text: msg.text, expiry: Date.now() + 7500 });
        } else {
          setOtherAvatars(prev => {
            const existing = prev.get(msg.senderNik);
            if (!existing) {
              // Sender is not in the lounge - do not spawn a phantom avatar!
              return prev;
            }
            const next = new Map(prev);
            const senderUname = getCleanUsername(msg.senderNik, msg.senderName, msg.senderUsername);
            const senderRank = getPangkatData(msg.senderNik, msg.senderPangkat);
            next.set(msg.senderNik, {
              ...existing,
              username: existing.username || senderUname,
              pangkat: existing.pangkat || senderRank.name,
              pangkatIcon: existing.pangkatIcon || msg.senderPangkatIcon || senderRank.icon,
              speechText: msg.text,
              speechExpiry: Date.now() + 7500,
              isLive: true
            });
            return next;
          });
          playChime('msg');
        }
      }
    };

    const handleUserMoved = (data: any) => {
      if (data && data.nik && data.nik !== userNik) {
        setOtherAvatars(prev => {
          const existing = prev.get(data.nik);
          if (!existing) return prev;
          const next = new Map(prev);
          const movedUname = getCleanUsername(data.nik, data.name, data.username);
          const movedRank = getPangkatData(data.nik, data.pangkat);
          next.set(data.nik, {
            ...existing,
            username: data.username || existing.username || movedUname,
            pangkat: data.pangkat || existing.pangkat || movedRank.name,
            pangkatIcon: data.pangkatIcon || existing.pangkatIcon || movedRank.icon,
            posX: data.x,
            posY: data.y,
            facing: data.facing || existing.facing,
            actionState: data.actionState || 'idle',
            isLive: true
          });
          return next;
        });
      }
    };

    const handleUserAction = (data: any) => {
      if (data && data.nik && data.nik !== userNik) {
        setOtherAvatars(prev => {
          const existing = prev.get(data.nik);
          if (!existing) return prev;
          const next = new Map(prev);
          const actionUname = getCleanUsername(data.nik, data.name, data.username);
          const actionRank = getPangkatData(data.nik, data.pangkat);
          next.set(data.nik, {
            ...existing,
            username: data.username || existing.username || actionUname,
            pangkat: data.pangkat || existing.pangkat || actionRank.name,
            pangkatIcon: data.pangkatIcon || existing.pangkatIcon || actionRank.icon,
            actionState: data.actionState || existing.actionState,
            speechText: data.speechText || existing.speechText,
            speechExpiry: data.speechText ? Date.now() + 7500 : existing.speechExpiry,
            isLive: true
          });
          return next;
        });
        playChime('cheer');
      }
    };

    const handlePresenceUpdate = (data: any) => {
      if (data && Array.isArray(data.loungeMembers)) {
        syncOnlinePresence({ loungeMembers: data.loungeMembers });
      }
    };

    socket.on('lounge:sync_state', handleLoungeSync);
    socket.on('lounge:user_joined', handleUserJoined);
    socket.on('lounge:user_left', handleUserLeft);
    socket.on('lounge:user_moved', handleUserMoved);
    socket.on('lounge:user_action', handleUserAction);
    socket.on('presence:update', handlePresenceUpdate);
    socket.on('new_message', handleNewMessage);

    return () => {
      clearInterval(pollingTimer);
      socket.off('lounge:sync_state', handleLoungeSync);
      socket.off('lounge:user_joined', handleUserJoined);
      socket.off('lounge:user_left', handleUserLeft);
      socket.off('lounge:user_moved', handleUserMoved);
      socket.off('lounge:user_action', handleUserAction);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('new_message', handleNewMessage);
      leaveLounge(userNik);
    };
  }, [isOpen, userNik, effectiveUsername, effectivePangkat, effectivePangkatIcon, userSection, avatarUrl, fetchPresenceOnline]);

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

  // Check if a spot is already occupied by someone else sitting
  const isLoungeSpotTaken = (spot: LoungeSpot): boolean => {
    for (const av of otherAvatars.values()) {
      const isSittingOther = av.actionState === 'sit' || av.actionState === 'smoke_sit' || av.actionState === 'coffee_sit';
      const dist = Math.hypot(av.posX - spot.x, av.posY - spot.y);
      if (isSittingOther && dist < 5.5) {
        return true;
      }
    }
    return false;
  };

  // Click on a piece of furniture to sit directly on it
  const handleSitAtSpot = (spot: LoungeSpot) => {
    if (isLoungeSpotTaken(spot)) {
      playChime('msg');
      setMySpeech({ text: '⚠️ Kursi ini sudah ditempati rekan lain!', expiry: Date.now() + 4500 });
      return;
    }

    setMyTargetPos({ x: spot.x, y: spot.y });
    setMyFacing('down');
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
        facing: 'down',
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

  // Real-time live count
  const liveCount = useMemo(() => {
    let count = 1; // Current user is live
    for (const av of otherAvatars.values()) {
      if (av.isLive) count++;
    }
    return count;
  }, [otherAvatars]);

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

        {/* ── TOP HEADER BAR (Minimalist GBA Retro Title Bar) ── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b-2 border-emerald-900/40 bg-slate-900 text-white z-20 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md font-black text-lg border-2 border-emerald-800">
              🏢
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-emerald-300 font-display tracking-tight flex items-center gap-1.5">
                <span>PREPLAB SITE LOUNGE &amp; GAZEBO</span>
              </h3>

              {/* Online Personil Counter with Tooltip */}
              <div className="relative group/tt">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black text-xs shadow-xs font-mono flex items-center gap-1.5 cursor-help">
                  <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                  <span>👥 {allRenderAvatars.length}</span>
                </span>
                <div className="absolute left-0 top-7 z-30 hidden group-hover/tt:block px-2.5 py-1 rounded bg-[#FFFDF0] text-slate-900 text-[10px] font-bold border-2 border-slate-800 shadow-md whitespace-nowrap pointer-events-none">
                  {allRenderAvatars.length} Personil di Tempat Nongkrong &amp; Gazebo K3
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Manual Sync Button with Tooltip */}
            <div className="relative group/tt">
              <button
                type="button"
                onClick={() => handleManualSync()}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-xs flex items-center justify-center active:scale-95"
                aria-label="Sinkronisasi Presensi"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-cyan-300 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
              <div className="absolute right-0 top-9 z-30 hidden group-hover/tt:block px-2 py-1 rounded bg-[#FFFDF0] text-slate-900 text-[10px] font-bold border-2 border-slate-800 shadow-md whitespace-nowrap pointer-events-none">
                🔄 Sinkronisasi Presensi Realtime
              </div>
            </div>

            {/* Audio Toggle with Tooltip */}
            <div className="relative group/tt">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all cursor-pointer shadow-xs flex items-center justify-center active:scale-95"
                aria-label="Toggle Suara"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 opacity-40" />}
              </button>
              <div className="absolute right-0 top-9 z-30 hidden group-hover/tt:block px-2 py-1 rounded bg-[#FFFDF0] text-slate-900 text-[10px] font-bold border-2 border-slate-800 shadow-md whitespace-nowrap pointer-events-none">
                {soundEnabled ? '🔊 Suara Retro: Aktif' : '🔇 Suara Retro: Bisu'}
              </div>
            </div>

            {/* Close Button with Tooltip */}
            <div className="relative group/tt">
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white border border-rose-500/40 transition-all cursor-pointer shadow-xs flex items-center justify-center active:scale-95"
                aria-label="Tutup Lounge"
              >
                <X className="w-4 h-4 font-bold" />
              </button>
              <div className="absolute right-0 top-9 z-30 hidden group-hover/tt:block px-2 py-1 rounded bg-[#FFFDF0] text-slate-900 text-[10px] font-bold border-2 border-slate-800 shadow-md whitespace-nowrap pointer-events-none">
                ❌ Keluar dari Tempat Nongkrong
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN 1:1 POKÉMON GBA OVERWORLD MULTIPLAYER STAGE ── */}
        <div className="w-full flex-1 relative overflow-hidden bg-[#181820] flex flex-col">
          <GbaOverworldMap
            roomType="lounge_nickel"
            playerNik={userNik}
            playerName={effectiveUsername}
            playerRankName={effectivePangkat}
            playerRankIcon={effectivePangkatIcon}
            headwearId={myCustomCfg?.headwearId || 'helmet_white'}
            headwearColor={myCustomCfg?.headwearColor || '#FFFFFF'}
            outfitId={myCustomCfg?.outfitId || 'uniform_tbp'}
            outfitColor={myCustomCfg?.outfitColor || '#84CC16'}
            bootsColor={myCustomCfg?.bootsColor || '#22C55E'}
            playerMessage={mySpeech?.text}
            otherPlayers={Array.from(otherAvatars.values()).map(av => ({
              id: av.nik,
              name: av.username || av.name,
              nik: av.nik,
              x: Math.max(1.2, Math.min(10.5, (av.posX / 100) * 12)),
              y: Math.max(3.8, Math.min(6.2, (av.posY / 100) * 8)),
              facing: av.facing || 'down',
              actionState: (av.actionState === 'smoke_sit' || av.actionState === 'coffee_sit') ? 'sit' : ((av.actionState as any) || 'idle'),
              pangkatName: av.pangkat,
              pangkatIcon: av.pangkatIcon,
              message: av.speechText
            }))}
            soundEnabled={soundEnabled}
            isCompactDiorama={false}
          />
        </div>

        {/* ── BOTTOM COMMAND DECK (High-Contrast, Crisp & Ultra-Visible Chat Bar) ── */}
        <div className="p-3 sm:p-3.5 border-t-2 border-emerald-500/50 bg-[#1E293B] flex flex-col gap-2.5 z-20 shadow-2xl">
          {/* Quick Action Icons Bar with Hover Tooltips */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5">
            <div className="flex items-center gap-1.5">
              {/* Sit / Stand Toggle */}
              <div className="relative group/tt">
                <button
                  type="button"
                  onClick={() => {
                    if (isCurrentSitting) {
                      setMyActionState('idle');
                      setActiveSeatId(null);
                    } else {
                      // Find first available bench slot (2 persons per bench)
                      const availableSpot = LOUNGE_SEATS.find(s => s.action.includes('sit') && !isLoungeSpotTaken(s));
                      if (availableSpot) {
                        handleSitAtSpot(availableSpot);
                      } else {
                        playChime('msg');
                        setMySpeech({ text: '⚠️ Semua bangku gazebo sedang penuh (2 orang per bangku)!', expiry: Date.now() + 4500 });
                      }
                    }
                  }}
                  className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 border ${
                    isCurrentSitting 
                      ? 'bg-amber-400 text-slate-950 border-amber-300' 
                      : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                  }`}
                  aria-label="Duduk atau Berdiri"
                >
                  <span>{isCurrentSitting ? '🚶' : '🪑'}</span>
                </button>
                <div className="absolute left-0 bottom-9 z-30 hidden group-hover/tt:block px-2 py-1 rounded bg-[#FFFDF0] text-slate-900 text-[10px] font-bold border-2 border-slate-800 shadow-md whitespace-nowrap pointer-events-none">
                  {isCurrentSitting ? '🚶 Berdiri Santai' : '🪑 Duduk di Bangku Gazebo'}
                </div>
              </div>

              {/* Smoke Action */}
              <div className="relative group/tt">
                <button
                  type="button"
                  onClick={() => handleSendMessage('🚬 Santai sejenak hisap rokok di Gazebo K3...', 'smoke')}
                  className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 border ${
                    myActionState === 'smoke' || myActionState === 'smoke_sit'
                      ? 'bg-amber-400 text-slate-950 border-amber-300' 
                      : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                  }`}
                  aria-label="Merokok Santai"
                >
                  <span>🚬</span>
                </button>
                <div className="absolute left-0 bottom-9 z-30 hidden group-hover/tt:block px-2 py-1 rounded bg-[#FFFDF0] text-slate-900 text-[10px] font-bold border-2 border-slate-800 shadow-md whitespace-nowrap pointer-events-none">
                  🚬 Merokok Santai di Gazebo K3
                </div>
              </div>

              {/* Coffee Action */}
              <div className="relative group/tt">
                <button
                  type="button"
                  onClick={() => handleSendMessage('☕ Seruput kopi hitam hangat sambil rehat sejenak!', 'coffee')}
                  className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95 border ${
                    myActionState === 'coffee' || myActionState === 'coffee_sit'
                      ? 'bg-emerald-400 text-slate-950 border-emerald-300' 
                      : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                  }`}
                  aria-label="Seruput Kopi"
                >
                  <span>☕</span>
                </button>
                <div className="absolute left-0 bottom-9 z-30 hidden group-hover/tt:block px-2 py-1 rounded bg-[#FFFDF0] text-slate-900 text-[10px] font-bold border-2 border-slate-800 shadow-md whitespace-nowrap pointer-events-none">
                  ☕ Seruput Kopi Hitam Hangat
                </div>
              </div>

              {/* Snack Action */}
              <div className="relative group/tt">
                <button
                  type="button"
                  onClick={() => handleSendMessage('🥪 Menaruh pisang goreng & snack hangat di meja!', 'coffee')}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                  aria-label="Bagi Pisang Goreng"
                >
                  <span>🥪</span>
                </button>
                <div className="absolute left-0 bottom-9 z-30 hidden group-hover/tt:block px-2 py-1 rounded bg-[#FFFDF0] text-slate-900 text-[10px] font-bold border-2 border-slate-800 shadow-md whitespace-nowrap pointer-events-none">
                  🥪 Bagi Pisang Goreng &amp; Cemilan
                </div>
              </div>

              {/* Wave Greeting */}
              <div className="relative group/tt">
                <button
                  type="button"
                  onClick={() => handleSendMessage('👋 Halo rekan shift Preparasi & Lab Nikel TBP!', 'jump')}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                  aria-label="Sapa Rekan"
                >
                  <span>👋</span>
                </button>
                <div className="absolute left-0 bottom-9 z-30 hidden group-hover/tt:block px-2 py-1 rounded bg-[#FFFDF0] text-slate-900 text-[10px] font-bold border-2 border-slate-800 shadow-md whitespace-nowrap pointer-events-none">
                  👋 Sapa Semua Rekan Shift
                </div>
              </div>

              {/* Safety K3 Cheers */}
              <div className="relative group/tt">
                <button
                  type="button"
                  onClick={() => handleSendMessage('👍 Zero Accident harga mati di site TBP!', 'jump')}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                  aria-label="Semangat K3"
                >
                  <span>👍</span>
                </button>
                <div className="absolute left-0 bottom-9 z-30 hidden group-hover/tt:block px-2 py-1 rounded bg-[#FFFDF0] text-slate-900 text-[10px] font-bold border-2 border-slate-800 shadow-md whitespace-nowrap pointer-events-none">
                  👍 Semangat K3 Zero Accident!
                </div>
              </div>

              {/* Sample Ore Discuss */}
              <div className="relative group/tt">
                <button
                  type="button"
                  onClick={() => handleSendMessage('🪨 Sample saprolite & limonite shift ini representatif & homogen!', 'inspect')}
                  className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
                  aria-label="Bahas Sampel"
                >
                  <span>🪨</span>
                </button>
                <div className="absolute left-0 bottom-9 z-30 hidden group-hover/tt:block px-2 py-1 rounded bg-[#FFFDF0] text-slate-900 text-[10px] font-bold border-2 border-slate-800 shadow-md whitespace-nowrap pointer-events-none">
                  🪨 Bahas Sampel Saprolite &amp; Limonite
                </div>
              </div>
            </div>

            {/* Current Active Location Pill */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-[11px] font-mono border border-slate-600 shadow-xs">
              <span className="text-emerald-400">●</span>
              <span>{isCurrentSitting ? (activeSpot ? activeSpot.name : 'Duduk Santai') : 'Patroli Siaga K3'}</span>
            </div>
          </div>

          {/* ULTRA-VISIBLE, CRISP & HIGH-CONTRAST CHAT INPUT BAR */}
          <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-900/90 border border-slate-700 shadow-inner">
            <div className="flex-1 relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 text-base select-none pointer-events-none">
                💬
              </span>
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
                placeholder="Ketik obrolan langsung di sini... (teks langsung muncul di atas kepala avatar)"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs sm:text-sm placeholder:text-slate-400 border-2 border-emerald-500 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-400/50 focus:outline-hidden transition-all shadow-md caret-slate-950"
              />
            </div>

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim()}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-lg transition-all cursor-pointer active:scale-95 border-2 border-emerald-400 whitespace-nowrap"
            >
              <Send className="w-4 h-4 font-black" />
              <span>Kirim</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
