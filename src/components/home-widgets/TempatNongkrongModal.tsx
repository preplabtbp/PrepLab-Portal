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
import { LoungePvPRpsModal } from './lounge/LoungePvPRpsModal';
import { SecretDominoLoungeModal, renderAvatarNode } from './lounge/SecretDominoLoungeModal';
import { SecretChessLoungeModal } from './lounge/SecretChessLoungeModal';

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
  headwearId?: string;
  headwearColor?: string;
  outfitId?: string;
  outfitColor?: string;
  bootsColor?: string;
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

// Helper to extract clean username (NEVER full name, NEVER nugie)
const getCleanUsername = (nik: string, rawName?: string, rawUsername?: string): string => {
  if (nik === '02D25000055' || rawUsername?.toLowerCase() === 'nugie') return 'Anugrah';
  if (rawUsername && rawUsername.trim() && rawUsername.toLowerCase() !== 'nugie') return rawUsername.trim();
  if (rawName) {
    const firstWord = rawName.trim().split(/\s+/)[0];
    if (firstWord && firstWord.length >= 2) return firstWord;
  }
  return nik ? `Ranger-${nik.slice(-3)}` : 'Ranger';
};

// Helper to extract official military/gamification rank & logo icon (NEVER Game Master, filter out 99999 XP dummy)
const getPangkatData = (nik: string, rawPangkat?: string, rawRole?: string): { name: string; icon: string } => {
  if (nik === '02D25000055') {
    return {
      name: 'Principal Staff Specialist (Major)',
      icon: '/assets/ranks/rank_43_major3_2.svg'
    };
  }
  try {
    const gStr = typeof localStorage !== 'undefined' ? localStorage.getItem(`preplab_gamification_${nik}`) : null;
    if (gStr) {
      const g = JSON.parse(gStr);
      // Filter out dummy 99999 XP bypass which produced Supreme Vanguard Commander (Bintang 5)
      if (typeof g?.totalXp === 'number' && g.totalXp > 0 && g.totalXp < 50000) {
        const r = getRankByXp(g.totalXp);
        if (r?.currentRank && !r.currentRank.name.toLowerCase().includes('game master')) {
          return {
            name: r.currentRank.name,
            icon: r.currentRank.icon || '/assets/ranks/rank_01_trainee.svg'
          };
        }
      }
      if (g?.rankInfo?.currentRank && !g.rankInfo.currentRank.name.toLowerCase().includes('game master') && !g.rankInfo.currentRank.name.toLowerCase().includes('supreme vanguard')) {
        return {
          name: g.rankInfo.currentRank.name,
          icon: g.rankInfo.currentRank.icon || '/assets/ranks/rank_01_trainee.svg'
        };
      }
      if (g?.rank?.name && !g.rank.name.toLowerCase().includes('game master') && !g.rank.name.toLowerCase().includes('supreme vanguard')) {
        return {
          name: g.rank.name,
          icon: g.rank.icon || '/assets/ranks/rank_01_trainee.svg'
        };
      }
    }
  } catch {}

  // If explicit rawPangkat provided (filter out Game Master / Supreme Vanguard)
  if (rawPangkat && rawPangkat.trim() && !rawPangkat.toLowerCase().includes('game master') && !rawPangkat.toLowerCase().includes('supreme vanguard')) {
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

/**
 * Authentic GBA Route/Town Location Title Card
 * Slides down smoothly upon entering Gazebo or Underground Bunker
 */
const GbaLocationTitleCard: React.FC<{
  title: string;
  subtitle: string;
  icon?: string;
}> = ({ title, subtitle, icon = '📍' }) => {
  return (
    <div className="absolute top-3 left-3 z-40 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="relative bg-[#0F172A]/90 backdrop-blur-xs border-2 border-[#F59E0B] rounded-lg px-3 py-1.5 shadow-2xl flex items-center gap-2.5 overflow-hidden">
        {/* Decorative hazard stripes on left edge */}
        <div className="w-1.5 self-stretch bg-linear-to-b from-amber-400 via-amber-500 to-amber-600 rounded-xs" />
        
        <div className="w-7 h-7 rounded-md bg-[#1E293B] border border-[#F59E0B]/50 flex items-center justify-center text-sm shadow-inner">
          {icon}
        </div>
        
        <div className="flex flex-col">
          <span className="text-[11px] font-black tracking-wider text-[#FEF08A] font-mono uppercase drop-shadow-xs">
            {title}
          </span>
          <span className="text-[9px] font-bold text-[#CBD5E1] tracking-wide font-sans">
            {subtitle}
          </span>
        </div>

        {/* Diagonal glass glare highlight */}
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/10 to-transparent pointer-events-none -skew-x-12" />
      </div>
    </div>
  );
};

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
  const [showPvPRpsModal, setShowPvPRpsModal] = useState<boolean>(false);
  const [pvpOpponent, setPvpOpponent] = useState<InRoomAvatar | null>(null);
  const [showSecretDominoModal, setShowSecretDominoModal] = useState<boolean>(false);
  const [showSecretChessModal, setShowSecretChessModal] = useState<boolean>(false);
  const [dominoTargetSeat, setDominoTargetSeat] = useState<'top' | 'bottom' | 'left' | 'right' | undefined>(undefined);
  const [chessTargetSeat, setChessTargetSeat] = useState<'left' | 'right' | undefined>(undefined);
  const [currentLoungeArea, setCurrentLoungeArea] = useState<'gazebo' | 'underground'>('gazebo');
  
  // Cutscene state for floor trapdoor opening event
  const [isSecretCutscenePlaying, setIsSecretCutscenePlaying] = useState<boolean>(false);
  const [cutsceneBanner, setCutsceneBanner] = useState<string | null>(null);

  // Developer auto-unlock for Bunker
  const isDevUser = useMemo(() => {
    return ['02D25000055', '02D24000043', 'M0403240177', 'PREPLABADMIN'].includes(userNik) || userRole === 'admin';
  }, [userNik, userRole]);

  const [isSecretHoleUnlocked, setIsSecretHoleUnlocked] = useState<boolean>(() => {
    try {
      const isDev = ['02D25000055', '02D24000043', 'M0403240177', 'PREPLABADMIN'].includes(userNik) || userRole === 'admin';
      if (isDev) return true;
      const scoreStr = localStorage.getItem('preplab_lounge_pvp_rps_wins');
      const wins = scoreStr ? parseInt(scoreStr, 10) || 0 : 0;
      if (wins >= 5) return true;
      return localStorage.getItem('preplab_secret_domino_unlocked') === 'true';
    } catch {}
    return false;
  });

  // Secret trapdoor cutscene sequence trigger
  const triggerSecretUnlockCutscene = useCallback(() => {
    setIsSecretCutscenePlaying(true);
    setIsSecretHoleUnlocked(true);
    try {
      localStorage.setItem('preplab_secret_domino_unlocked', 'true');
    } catch {}

    // Web Audio synthesizer: Heavy metallic gear clanking unlock SFX
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        [180, 240, 160, 320, 140].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + idx * 0.1);
          gain.gain.setValueAtTime(0.12, now + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + (idx + 1) * 0.1);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + idx * 0.1);
          osc.stop(now + (idx + 1) * 0.1);
        });
      }
    } catch {}

    setCutsceneBanner('⚙️ KLIK-KLAANG! Roda gigi besi berderit di lantai gazebo... Pintu rahasia terbuka menyingkap tangga menuju Bunker Terbengkalai!');

    setTimeout(() => {
      setIsSecretCutscenePlaying(false);
      setTimeout(() => {
        setCutsceneBanner(null);
      }, 5000);
    }, 2500);
  }, []);

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

    if (userNik === '02D25000055' || uname.toLowerCase() === 'nugie') {
      uname = 'Anugrah';
    }

    if (!uname || !uname.trim()) {
      const fallback = pObj?.nama || pObj?.name || userName || '';
      uname = fallback.trim().split(/\s+/)[0] || 'Ranger';
    }

    let pgtName = '';
    let pgtIcon = '/assets/ranks/rank_01_trainee.svg';

    if (userNik === '02D25000055') {
      pgtName = 'Principal Staff Specialist (Major)';
      pgtIcon = '/assets/ranks/rank_43_major3_2.svg';
    } else {
      try {
        const gStr = localStorage.getItem(`preplab_gamification_${userNik}`);
      if (gStr) {
        const g = JSON.parse(gStr);
        // Exclude dummy 99999 XP bypass which produced Supreme Vanguard Commander (Bintang 5)
        if (typeof g?.totalXp === 'number' && g.totalXp > 0 && g.totalXp < 50000) {
          const r = getRankByXp(g.totalXp);
          if (r?.currentRank && !r.currentRank.name.toLowerCase().includes('game master')) {
            pgtName = r.currentRank.name;
            pgtIcon = r.currentRank.icon || pgtIcon;
          }
        } else if (g?.rankInfo?.currentRank && !g.rankInfo.currentRank.name.toLowerCase().includes('game master') && !g.rankInfo.currentRank.name.toLowerCase().includes('supreme vanguard')) {
          pgtName = g.rankInfo.currentRank.name;
          pgtIcon = g.rankInfo.currentRank.icon || pgtIcon;
        } else if (g?.rank?.name && !g.rank.name.toLowerCase().includes('game master') && !g.rank.name.toLowerCase().includes('supreme vanguard')) {
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
  }

    return { 
      effectiveUsername: uname.trim(), 
      effectivePangkat: pgtName.trim(),
      effectivePangkatIcon: pgtIcon
    };
  }, [userNik, userName, userRole]);

  // My Avatar In-Room State: Arrive via doorway threshold (Col 1.2, Row 4.2)
  const [myPos, setMyPos] = useState<{ x: number; y: number }>({ x: 1.2, y: 4.2 });
  const [myFacing, setMyFacing] = useState<'down' | 'up' | 'left' | 'right'>('right');
  const [myActionState, setMyActionState] = useState<'idle' | 'walk' | 'coffee' | 'inspect' | 'jump' | 'smoke' | 'sit' | 'smoke_sit' | 'coffee_sit'>('walk');
  const [myWalkFrame, setMyWalkFrame] = useState(0);
  const [mySpeech, setMySpeech] = useState<{ text: string; expiry: number } | null>({
    text: '🚶 Tiba di Gazebo Lounge K3 PrepLab...',
    expiry: Date.now() + 5000
  });

  // Active seat tracking (null upon entry until player selects a chair or clicks to sit)
  const [activeSeatId, setActiveSeatId] = useState<string | null>(null);
  const [locationBanner, setLocationBanner] = useState<{ title: string; subtitle: string; icon: string } | null>(null);

  // Seamless area switcher with authentic entrance positioning and location banner
  const switchLoungeArea = useCallback((newArea: 'gazebo' | 'underground') => {
    setCurrentLoungeArea(newArea);
    if (newArea === 'underground') {
      setMyPos({ x: 1.4, y: 2.8 });
      setMyFacing('down');
      setMyActionState('walk');
      setActiveSeatId(null);
      setMySpeech({ text: '🪜 Turun ke Bunker Bawah Tanah Klub Rahasia...', expiry: Date.now() + 5000 });
      setLocationBanner({
        title: 'BUNKER BAWAH TANAH',
        subtitle: 'Klub Rahasia Gaple & Catur Harita',
        icon: '🕳️'
      });
    } else {
      setMyPos({ x: 2.35, y: 6.2 });
      setMyFacing('up');
      setMyActionState('walk');
      setActiveSeatId(null);
      setMySpeech({ text: '🪜 Kembali ke Gazebo Lounge Atas...', expiry: Date.now() + 5000 });
      setLocationBanner({
        title: 'GAZEBO TAMBANG & LOUNGE K3',
        subtitle: 'Area Istirahat & Sosialisasi K3',
        icon: '🏢'
      });
    }
  }, []);

  // Display location banner on modal open
  useEffect(() => {
    if (isOpen) {
      setLocationBanner({
        title: currentLoungeArea === 'underground' ? 'BUNKER BAWAH TANAH' : 'GAZEBO TAMBANG & LOUNGE K3',
        subtitle: currentLoungeArea === 'underground' ? 'Klub Rahasia Gaple & Catur Harita' : 'Area Istirahat & Sosialisasi K3',
        icon: currentLoungeArea === 'underground' ? '🕳️' : '🏢'
      });
    }
  }, [isOpen, currentLoungeArea]);

  // Auto-dismiss location banner after 3.2s
  useEffect(() => {
    if (!locationBanner) return;
    const t = setTimeout(() => {
      setLocationBanner(null);
    }, 3200);
    return () => clearTimeout(t);
  }, [locationBanner]);

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


  // Real-time bidirectional movement & action callbacks for GbaOverworldMap
  const handlePlayerMove = useCallback((pos: { x: number; y: number; facing: string; actionState: string }) => {
    setMyPos({ x: pos.x, y: pos.y });
    setMyFacing(pos.facing as any);
    setMyActionState('walk');
    const socket = getGlobalSocket();
    if (socket.connected) {
      socket.emit('lounge:move', {
        room: 'lounge',
        nik: userNik,
        username: effectiveUsername,
        pangkat: effectivePangkat,
        x: pos.x,
        y: pos.y,
        facing: pos.facing,
        actionState: 'walk'
      });
    }
  }, [userNik, effectiveUsername, effectivePangkat]);

  const handlePlayerAction = useCallback((act: { actionState: string; facing?: string; speechText?: string; x: number; y: number }) => {
    setMyPos({ x: act.x, y: act.y });
    if (act.facing) setMyFacing(act.facing as any);
    setMyActionState(act.actionState as any);
    if (act.speechText) {
      setMySpeech({ text: act.speechText, expiry: Date.now() + 7500 });
    }
    const socket = getGlobalSocket();
    if (socket.connected) {
      socket.emit('lounge:action', {
        room: 'lounge',
        nik: userNik,
        username: effectiveUsername,
        pangkat: effectivePangkat,
        x: act.x,
        y: act.y,
        facing: act.facing,
        actionState: act.actionState,
        speechText: act.speechText
      });
    }
  }, [userNik, effectiveUsername, effectivePangkat]);

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
      const next = new Map(prev);
      const activeNiks = new Set<string>();

      // ONLY process Lounge Members (Real-time live avatars currently inside lounge)
      rawLounge.forEach((lm: any) => {
        if (!lm || !lm.nik || lm.nik === userNik) return;
        activeNiks.add(lm.nik);
        const existing = prev.get(lm.nik);
        const cleanUname = getCleanUsername(lm.nik, lm.name, lm.username);
        const rankData = getPangkatData(lm.nik, lm.pangkat);
        const rawX = typeof lm.posX === 'number' ? lm.posX : (existing?.posX ?? 3.44);
        const rawY = typeof lm.posY === 'number' ? lm.posY : (existing?.posY ?? 4.75);
        const tileX = rawX > 12 ? (rawX / 100) * 12 : rawX;
        const tileY = rawY > 8 ? (rawY / 100) * 8 : rawY;

        next.set(lm.nik, {
          nik: lm.nik,
          name: cleanUname,
          username: cleanUname,
          pangkat: lm.pangkat || rankData.name,
          pangkatIcon: lm.pangkatIcon || rankData.icon,
          section: lm.section || 'Prep-Lab',
          posX: tileX,
          posY: tileY,
          facing: lm.facing || existing?.facing || 'down',
          actionState: lm.actionState || existing?.actionState || 'sit',
          walkFrame: existing?.walkFrame ?? 0,
          speechText: lm.speechText || existing?.speechText,
          speechExpiry: lm.speechExpiry || existing?.speechExpiry,
          avatarUrl: lm.avatar || existing?.avatarUrl,
          headwearId: lm.headwearId || existing?.headwearId,
          headwearColor: lm.headwearColor || existing?.headwearColor,
          outfitId: lm.outfitId || existing?.outfitId,
          outfitColor: lm.outfitColor || existing?.outfitColor,
          bootsColor: lm.bootsColor || existing?.bootsColor,
          isLive: true
        });
      });

      for (const k of next.keys()) {
        if (!activeNiks.has(k)) {
          next.delete(k);
        }
      }

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

    // Fast initial snapshot bootstrap
    fetchPresenceOnline();

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
      headwearId: myCustomCfg?.headwearId || 'helmet_white',
      headwearColor: myCustomCfg?.headwearColor || '#FFFFFF',
      outfitId: myCustomCfg?.outfitId || 'uniform_tbp',
      outfitColor: myCustomCfg?.outfitColor || '#84CC16',
      bootsColor: myCustomCfg?.bootsColor || '#22C55E',
      posX: myPosRef.current.x,
      posY: myPosRef.current.y,
      facing: myFacingRef.current,
      actionState: myActionStateRef.current
    };

    // Join lounge explicitly (emits chat:join & lounge:join)
    joinLounge(userPayload);

    // Initial lounge avatar snapshot from server (authoritative sync)
    const handleLoungeSync = (avatarList: any[]) => {
      if (Array.isArray(avatarList)) {
        setOtherAvatars(prev => {
          const next = new Map(prev);
          const activeNiks = new Set<string>();
          avatarList.forEach((av: any) => {
            if (!av || !av.nik || av.nik === userNik) return;
            activeNiks.add(av.nik);
            const cleanUname = getCleanUsername(av.nik, av.name, av.username);
            const rankData = getPangkatData(av.nik, av.pangkat);
            const rawX = typeof av.posX === 'number' ? av.posX : 3.44;
            const rawY = typeof av.posY === 'number' ? av.posY : 4.75;
            const tileX = rawX > 12 ? (rawX / 100) * 12 : rawX;
            const tileY = rawY > 8 ? (rawY / 100) * 8 : rawY;

            next.set(av.nik, {
              nik: av.nik,
              name: cleanUname,
              username: cleanUname,
              pangkat: av.pangkat || rankData.name,
              pangkatIcon: av.pangkatIcon || rankData.icon,
              section: av.section || 'Prep-Lab',
              posX: tileX,
              posY: tileY,
              facing: av.facing || 'down',
              actionState: av.actionState || 'sit',
              walkFrame: 0,
              speechText: av.speechText,
              speechExpiry: av.speechExpiry,
              avatarUrl: av.avatar,
              headwearId: av.headwearId,
              headwearColor: av.headwearColor,
              outfitId: av.outfitId,
              outfitColor: av.outfitColor,
              bootsColor: av.bootsColor,
              isLive: true
            });
          });

          for (const k of next.keys()) {
            if (!activeNiks.has(k)) {
              next.delete(k);
            }
          }
          return next;
        });
      }
    };

    // Real-time user joined the lounge
    const handleUserJoined = (data: any) => {
      if (!data || !data.nik || data.nik === userNik) return;
      const cleanUname = getCleanUsername(data.nik, data.name, data.username);
      const rankData = getPangkatData(data.nik, data.pangkat);
      const rawX = typeof data.posX === 'number' ? data.posX : 3.44;
      const rawY = typeof data.posY === 'number' ? data.posY : 4.75;
      const tileX = rawX > 12 ? (rawX / 100) * 12 : rawX;
      const tileY = rawY > 8 ? (rawY / 100) * 8 : rawY;

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
          posX: tileX,
          posY: tileY,
          facing: data.facing || existing?.facing || 'down',
          actionState: data.actionState || existing?.actionState || 'sit',
          walkFrame: 0,
          avatarUrl: data.avatar || existing?.avatarUrl,
          headwearId: data.headwearId || existing?.headwearId,
          headwearColor: data.headwearColor || existing?.headwearColor,
          outfitId: data.outfitId || existing?.outfitId,
          outfitColor: data.outfitColor || existing?.outfitColor,
          bootsColor: data.bootsColor || existing?.bootsColor,
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
        if (!prev.has(data.nik)) return prev;
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
          const rawX = typeof data.x === 'number' ? data.x : existing.posX;
          const rawY = typeof data.y === 'number' ? data.y : existing.posY;
          const tileX = rawX > 12 ? (rawX / 100) * 12 : rawX;
          const tileY = rawY > 8 ? (rawY / 100) * 8 : rawY;

          next.set(data.nik, {
            ...existing,
            posX: tileX,
            posY: tileY,
            facing: data.facing || existing.facing,
            actionState: data.actionState || 'walk',
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
          const rawX = typeof data.x === 'number' ? data.x : existing.posX;
          const rawY = typeof data.y === 'number' ? data.y : existing.posY;
          const tileX = rawX > 12 ? (rawX / 100) * 12 : rawX;
          const tileY = rawY > 8 ? (rawY / 100) * 8 : rawY;

          next.set(data.nik, {
            ...existing,
            posX: tileX,
            posY: tileY,
            facing: data.facing || existing.facing,
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
      socket.off('lounge:sync_state', handleLoungeSync);
      socket.off('lounge:user_joined', handleUserJoined);
      socket.off('lounge:user_left', handleUserLeft);
      socket.off('lounge:user_moved', handleUserMoved);
      socket.off('lounge:user_action', handleUserAction);
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('new_message', handleNewMessage);
      leaveLounge(userNik);
    };
  }, [isOpen, userNik, effectiveUsername, effectivePangkat, effectivePangkatIcon, userSection, avatarUrl, myCustomCfg, fetchPresenceOnline, syncOnlinePresence]);

  // Check if a spot is already occupied by someone else sitting
  const isLoungeSpotTaken = (spot: LoungeSpot): boolean => {
    const tileX = spot.x > 12 ? (spot.x / 100) * 12 : spot.x;
    const tileY = spot.y > 8 ? (spot.y / 100) * 8 : spot.y;
    for (const av of otherAvatars.values()) {
      const isSittingOther = av.actionState === 'sit' || av.actionState === 'smoke_sit' || av.actionState === 'coffee_sit';
      const dist = Math.hypot(av.posX - tileX, av.posY - tileY);
      if (isSittingOther && dist < 0.65) {
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

    const tileX = spot.x > 12 ? (spot.x / 100) * 12 : spot.x;
    const tileY = spot.y > 8 ? (spot.y / 100) * 8 : spot.y;
    setMyPos({ x: tileX, y: tileY });
    setMyFacing(spot.facing || 'down');
    setMyActionState(spot.action);
    setActiveSeatId(spot.id);
    playChime('step');
    setMySpeech({ text: spot.speech, expiry: Date.now() + 6500 });

    handlePlayerAction({
      actionState: spot.action,
      facing: spot.facing || 'down',
      speechText: spot.speech,
      x: tileX,
      y: tileY
    });
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

  // Suwit vs Ghost callback (Shows win/lose overhead bubble reaction & unlocks secret domino hole at 5 wins)
  const handleFinishGhostGame = useCallback((result: 'win' | 'lose' | 'draw', playerChoice: string, ghostChoice: string) => {
    let speechMsg = '';
    if (result === 'win') {
      speechMsg = '😄 Horeee! Menang suwit lawan Hantu Pojok!';
      handleSendMessage(speechMsg, 'jump');
      try {
        const scoreStr = localStorage.getItem('preplab_lounge_ghost_rps_score');
        const score = scoreStr ? JSON.parse(scoreStr) : null;
        if (score && score.wins >= 5) {
          setIsSecretHoleUnlocked(true);
          localStorage.setItem('preplab_secret_domino_unlocked', 'true');
        }
      } catch {}
    } else if (result === 'lose') {
      speechMsg = '😭 Huwaaa... kalah suwit lawan Hantu Pojok!';
      handleSendMessage(speechMsg, 'idle');
    } else {
      speechMsg = '😅 Seri! Pikiran kita seirama...';
      handleSendMessage(speechMsg, 'idle');
    }
  }, [handleSendMessage]);

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
                <span>
                  {currentLoungeArea === 'underground' 
                    ? '🕳️ BUNKER BAWAH TANAH (KLUB GAPLE & CATUR)' 
                    : 'PREPLAB SITE LOUNGE & GAZEBO'}
                </span>
              </h3>

              {currentLoungeArea === 'underground' ? (
                <button
                  type="button"
                  onClick={() => switchLoungeArea('gazebo')}
                  className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer active:scale-95"
                  title="Naik kembali ke Gazebo Atas"
                >
                  <span>🪜 Naik ke Gazebo</span>
                </button>
              ) : (
                isSecretHoleUnlocked && (
                  <button
                    type="button"
                    onClick={() => switchLoungeArea('underground')}
                    className="px-2.5 py-1 rounded-xl bg-purple-900/80 hover:bg-purple-800 text-purple-200 border border-purple-600 font-bold text-xs flex items-center gap-1 shadow-md transition-all cursor-pointer"
                    title="Masuk ke Bunker Bawah Tanah"
                  >
                    <span>🕳️ Bunker Bawah Tanah</span>
                  </button>
                )
              )}

              {/* Online Personil Counter with Tooltip */}
              <div className="relative group/tt">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-black text-xs shadow-xs font-mono flex items-center gap-1.5 cursor-help">
                  <span className="w-2 h-2 rounded-full bg-slate-950 animate-ping" />
                  <span>👥 {allRenderAvatars.length}</span>
                </span>
                <div className="absolute left-0 top-7 z-30 hidden group-hover/tt:block px-2.5 py-1 rounded bg-[#FFFDF0] text-slate-900 text-[10px] font-bold border-2 border-slate-800 shadow-md whitespace-nowrap pointer-events-none">
                  {allRenderAvatars.length} Personil di {currentLoungeArea === 'underground' ? 'Bunker Bawah Tanah' : 'Tempat Nongkrong & Gazebo K3'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick Suwit PvP Button with Tooltip */}
            <div className="relative group/tt">
              <button
                type="button"
                onClick={() => {
                  const candidate = allRenderAvatars.find(a => a.nik !== userNik) || null;
                  setPvpOpponent(candidate);
                  setShowPvPRpsModal(true);
                  if (candidate) {
                    handleSendMessage(`✌️ Mengajak ${candidate.username} tanding Suwit PvP!`, 'jump');
                  }
                }}
                className="h-8 px-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs border border-amber-400 transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1 active:scale-95"
                aria-label="Tantang Suwit PvP"
              >
                <span>✌️ Suwit PvP</span>
              </button>
              <div className="absolute right-0 top-9 z-30 hidden group-hover/tt:block px-2 py-1 rounded bg-[#FFFDF0] text-slate-900 text-[10px] font-bold border-2 border-slate-800 shadow-md whitespace-nowrap pointer-events-none">
                ✌️ Tanding Suwit PvP (5x Win Buka Pintu Rahasia Lantai)
              </div>
            </div>

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
          {/* Authentic Retro GBA Location Plaque Banner */}
          {locationBanner && (
            <GbaLocationTitleCard 
              title={locationBanner.title} 
              subtitle={locationBanner.subtitle} 
              icon={locationBanner.icon} 
            />
          )}

          {/* Interactive Avatar Popover Menu (Direct avatar clicks) */}
          {selectedAvatarForInteract && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-slate-950/95 border-2 border-emerald-500/80 p-3 rounded-2xl shadow-2xl flex flex-col items-center gap-2 max-w-xs animate-in zoom-in-95">
              <div className="flex items-center gap-2 w-full border-b border-slate-800 pb-2">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-lg">
                  {renderAvatarNode(selectedAvatarForInteract.avatarUrl, '👷', 'w-8 h-8')}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-black text-white block truncate">{selectedAvatarForInteract.username}</span>
                  <span className="text-[10px] text-emerald-400 font-mono">{selectedAvatarForInteract.pangkat}</span>
                </div>
                <button onClick={() => setSelectedAvatarForInteract(null)} className="text-slate-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="w-full grid grid-cols-2 gap-1.5 text-xs font-bold">
                <button
                  onClick={() => {
                    setPvpOpponent(selectedAvatarForInteract);
                    setShowPvPRpsModal(true);
                    setSelectedAvatarForInteract(null);
                    handleSendMessage(`✌️ Mengajak ${selectedAvatarForInteract.username} tanding Suwit PvP!`, 'jump');
                  }}
                  className="col-span-2 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                >
                  <span>✌️ Tantang Suwit PvP</span>
                </button>
                <button
                  onClick={() => handleInteractWithAvatar(selectedAvatarForInteract, 'coffee')}
                  className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>☕ Ngopi</span>
                </button>
                <button
                  onClick={() => handleInteractWithAvatar(selectedAvatarForInteract, 'smoke')}
                  className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>🚬 Merokok</span>
                </button>
                <button
                  onClick={() => handleInteractWithAvatar(selectedAvatarForInteract, 'wave')}
                  className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>👋 Sapa</span>
                </button>
                <button
                  onClick={() => handleInteractWithAvatar(selectedAvatarForInteract, 'cheer')}
                  className="py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>👍 Semangat K3</span>
                </button>
              </div>
            </div>
          )}

          {/* Retro GBA Cutscene Narrative Banner */}
          {cutsceneBanner && (
            <div className="absolute bottom-16 left-4 right-4 z-40 bg-slate-950/95 border-3 border-amber-400 p-3 sm:p-4 rounded-2xl shadow-[0_0_35px_rgba(245,158,11,0.6)] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
              <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-400 flex items-center justify-center text-2xl shrink-0 animate-bounce">
                🪜
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-widest block">
                  EVENT: PINTU RAHASIA LANTAI TERBUKA!
                </span>
                <p className="text-xs sm:text-sm font-bold text-white tracking-wide leading-snug">
                  {cutsceneBanner}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCutsceneBanner(null)}
                className="p-1 rounded-lg text-amber-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <GbaOverworldMap
            roomType={currentLoungeArea === 'underground' ? 'underground_lounge' : 'lounge_nickel'}
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
            playerActionState={myActionState === 'smoke_sit' || myActionState === 'coffee_sit' ? 'sit' : (myActionState as any)}
            onPlayerMove={handlePlayerMove}
            onPlayerAction={handlePlayerAction}
            otherPlayers={Array.from(otherAvatars.values()).map(av => {
              const rawX = typeof av.posX === 'number' ? av.posX : 3.44;
              const rawY = typeof av.posY === 'number' ? av.posY : 4.75;
              const tileX = rawX > 12 ? (rawX / 100) * 12 : rawX;
              const tileY = rawY > 8 ? (rawY / 100) * 8 : rawY;
              return {
                id: av.nik,
                name: av.username || av.name,
                nik: av.nik,
                x: tileX,
                y: tileY,
                facing: av.facing || 'down',
                actionState: (av.actionState === 'smoke_sit' || av.actionState === 'coffee_sit') ? 'sit' : ((av.actionState as any) || 'idle'),
                pangkatName: av.pangkat,
                pangkatIcon: av.pangkatIcon,
                headwearId: av.headwearId,
                headwearColor: av.headwearColor,
                outfitId: av.outfitId,
                outfitColor: av.outfitColor,
                message: av.speechText
              };
            })}
            soundEnabled={soundEnabled}
            isCompactDiorama={false}
            onExitLoungeBackToWork={onClose}
            onPlayGhostRps={() => {
              setPvpOpponent(null);
              setShowPvPRpsModal(true);
            }}
            isSecretHoleUnlocked={isSecretHoleUnlocked}
            isSecretCutsceneActive={isSecretCutscenePlaying}
            onEnterSecretDomino={() => switchLoungeArea('underground')}
            onAscendToGazebo={() => switchLoungeArea('gazebo')}
            onOpenDominoGame={(seat) => {
              setDominoTargetSeat(seat);
              setShowSecretDominoModal(true);
            }}
            onOpenChessGame={(seat) => {
              setChessTargetSeat(seat);
              setShowSecretChessModal(true);
            }}
            onSelectPlayer={(p) => {
              const av = otherAvatars.get(p.nik);
              if (av) setSelectedAvatarForInteract(av);
            }}
          />
        </div>

        {/* ── BOTTOM COMMAND DECK (Clean Easter Egg Mode: Chat Bar Only) ── */}
        <div className="p-3 sm:p-3.5 border-t-2 border-emerald-500/50 bg-[#1E293B] flex flex-col z-20 shadow-2xl">
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

      {/* Duel Suwit PvP vs Rekan Gazebo Mini-Game Modal */}
      <LoungePvPRpsModal
        isOpen={showPvPRpsModal}
        onClose={() => setShowPvPRpsModal(false)}
        playerName={effectiveUsername}
        opponentName={pvpOpponent?.username || 'Rekan Shift K3'}
        opponentAvatar={pvpOpponent?.avatarUrl}
        opponentPangkat={pvpOpponent?.pangkat}
        onFinishGame={(result) => {
          if (result === 'win') {
            handleSendMessage('😄 Horeee! Menang duel Suwit!', 'jump');
          }
        }}
        onUnlockCutscene={triggerSecretUnlockCutscene}
        soundEnabled={soundEnabled}
        isSecretHoleUnlocked={isSecretHoleUnlocked}
      />

      {/* Ruang Rahasia Meja Gaple 4 Orang Modal */}
      <SecretDominoLoungeModal
        isOpen={showSecretDominoModal}
        onClose={() => setShowSecretDominoModal(false)}
        playerName={effectiveUsername}
        playerNik={userNik}
        playerAvatar={avatarUrl || undefined}
        soundEnabled={soundEnabled}
        initialSeat={dominoTargetSeat}
      />

      {/* Ruang Rahasia Meja Catur 2 Orang Modal */}
      <SecretChessLoungeModal
        isOpen={showSecretChessModal}
        onClose={() => setShowSecretChessModal(false)}
        playerName={effectiveUsername}
        playerNik={userNik}
        playerAvatar={avatarUrl || undefined}
        soundEnabled={soundEnabled}
        initialSeat={chessTargetSeat}
      />
    </div>
  );
};
