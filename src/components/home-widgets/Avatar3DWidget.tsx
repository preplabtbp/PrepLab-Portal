import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Sparkles, ShieldAlert, BookOpen, CheckSquare, 
  RefreshCw, Smile, Heart, Zap, Volume2, VolumeX,
  Palette, Dices, X, Check, Lock, Unlock, Trophy,
  Coffee, Search, MapPin, Footprints, Flame, Play,
  ChevronRight, Award, Shield, UserCheck, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { WidgetSize } from './types';

interface Avatar3DWidgetProps {
  size: WidgetSize;
  userNik?: string;
  userName?: string;
}

// -------------------------------------------------------------
// PALETTE & ITEM DEFINITIONS (STARTERS & UNLOCKABLES)
// -------------------------------------------------------------
export interface AvatarItem {
  id: string;
  name: string;
  isUnlockedDefault: boolean;
  unlockReq: string;
  hex?: string;
  shadow?: string;
  accent?: string;
  details?: any;
}

export const HEADWEAR_ITEMS: AvatarItem[] = [
  // 4 Starters
  { id: 'helmet_yellow', name: 'Helm Safety Kuning (K3)', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#FACC15', shadow: '#CA8A04' },
  { id: 'cap_navy', name: 'Topi Proyek Navy', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#1E3A8A', shadow: '#172554' },
  { id: 'hair_spiky', name: 'Rambut Spiky Hitam', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#18181B', shadow: '#09090B' },
  { id: 'hijab_k3', name: 'Hijab Syari K3 Kuning', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#EAB308', shadow: '#A16207' },
  // Unlockables
  { id: 'helmet_white', name: 'Helm Putih Pengawas', isUnlockedDefault: false, unlockReq: 'Buka di Level 2 (100 XP)', hex: '#F8FAFC', shadow: '#CBD5E1' },
  { id: 'helmet_red', name: 'Helm Merah HSE & Safety', isUnlockedDefault: false, unlockReq: 'Buka di Level 3 (250 XP)', hex: '#DC2626', shadow: '#991B1B' },
  { id: 'helmet_blue', name: 'Helm Biru Teknisi Prep', isUnlockedDefault: false, unlockReq: 'Streak 3 Hari Kerja', hex: '#2563EB', shadow: '#1D4ED8' },
  { id: 'crown_champion', name: 'Mahkota Analis Teladan', isUnlockedDefault: false, unlockReq: 'Buka di Level 5 (500 XP)', hex: '#F59E0B', shadow: '#B45309' }
];

export const OUTFIT_ITEMS: AvatarItem[] = [
  // 4 Starters
  { id: 'vest_orange', name: 'Rompi K3 Orange Standar', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#EA580C', shadow: '#9A3412', accent: '#F8FAFC' },
  { id: 'vest_green', name: 'Rompi K3 Hijau HSE', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#16A34A', shadow: '#166534', accent: '#F8FAFC' },
  { id: 'lab_coat', name: 'Jas Laboratorium Kimia', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#F8FAFC', shadow: '#CBD5E1', accent: '#0D9488' },
  { id: 'wearpack_navy', name: 'Wearpack Lapangan Navy', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#1E3A8A', shadow: '#172554', accent: '#F97316' },
  // Unlockables
  { id: 'wearpack_red', name: 'Wearpack Fire & Rescue', isUnlockedDefault: false, unlockReq: 'Buka di Level 2 (100 XP)', hex: '#DC2626', shadow: '#991B1B', accent: '#FACC15' },
  { id: 'suit_spv', name: 'Setelan Jas Formal SPV', isUnlockedDefault: false, unlockReq: 'Buka di Level 3 (250 XP)', hex: '#334155', shadow: '#0F172A', accent: '#EF4444' },
  { id: 'hoodie_cyber', name: 'Hoodie Developer PrepLab', isUnlockedDefault: false, unlockReq: 'Streak 5 Hari Kerja', hex: '#0F172A', shadow: '#020617', accent: '#06B6D4' },
  { id: 'vest_gold', name: 'Rompi Emas Zero Accident', isUnlockedDefault: false, unlockReq: 'Buka di Level 5 (500 XP)', hex: '#EAB308', shadow: '#854D0E', accent: '#FEF08A' }
];

export const EYE_ITEMS: AvatarItem[] = [
  // 4 Starters
  { id: 'normal', name: 'Mata Pixel Ramah', isUnlockedDefault: true, unlockReq: 'Starter Gratis' },
  { id: 'glasses_k3', name: 'Kacamata K3 Bening Anti-Debu', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#0284C7' },
  { id: 'happy', name: 'Mata Senyum Happy (^ ^)', isUnlockedDefault: true, unlockReq: 'Starter Gratis' },
  { id: 'wink', name: 'Kedip Mata Ceria ;)', isUnlockedDefault: true, unlockReq: 'Starter Gratis' },
  // Unlockables
  { id: 'sunglasses', name: 'Kacamata Hitam Cool', isUnlockedDefault: false, unlockReq: 'Buka di Level 2 (100 XP)', hex: '#0F172A' },
  { id: 'goggles_furnace', name: 'Goggles Furnace 815°C', isUnlockedDefault: false, unlockReq: 'Buka di Level 3 (250 XP)', hex: '#EA580C' },
  { id: 'cyber_visor', name: 'Digital AR Visor Sensor', isUnlockedDefault: false, unlockReq: 'Streak 7 Hari Kerja', hex: '#06B6D4' }
];

export const ACCESSORY_ITEMS: AvatarItem[] = [
  // 4 Starters
  { id: 'lanyard', name: 'Lanyard ID Card PrepLab', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#EF4444' },
  { id: 'mask_k3', name: 'Masker Debu N95 K3', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#06B6D4' },
  { id: 'none', name: 'Tanpa Aksesoris', isUnlockedDefault: true, unlockReq: 'Starter Gratis' },
  { id: 'radio_ht', name: 'Handy Talky (HT) K3', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#475569' },
  // Unlockables
  { id: 'ear_muff', name: 'Safety Ear Muff Crusher', isUnlockedDefault: false, unlockReq: 'Buka di Level 2 (100 XP)', hex: '#F97316' },
  { id: 'coffee_mug', name: 'Tumbler Kopi PrepLab', isUnlockedDefault: false, unlockReq: 'Streak 3 Hari Kerja', hex: '#8B5CF6' },
  { id: 'badge_star', name: 'Pin Bintang Teladan K3', isUnlockedDefault: false, unlockReq: 'Buka di Level 4 (400 XP)', hex: '#FACC15' }
];

export const BOOTS_ITEMS: AvatarItem[] = [
  // 3 Starters
  { id: 'boots_black', name: 'Safety Boots Hitam Steel-Toe', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#1E293B', shadow: '#0F172A' },
  { id: 'boots_brown', name: 'Safety Boots Cokelat Kulit', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#78350F', shadow: '#451A03' },
  { id: 'boots_grey', name: 'Sepatu Lab Anti-Static', isUnlockedDefault: true, unlockReq: 'Starter Gratis', hex: '#64748B', shadow: '#334155' },
  // Unlockables
  { id: 'boots_yellow', name: 'Boots K3 High-Vis Kuning', isUnlockedDefault: false, unlockReq: 'Buka di Level 2 (100 XP)', hex: '#EAB308', shadow: '#A16207' },
  { id: 'boots_cyber', name: 'Mag-Boots Cyber Tech', isUnlockedDefault: false, unlockReq: 'Streak 5 Hari Kerja', hex: '#06B6D4', shadow: '#0E7490' }
];

export const SKIN_TONES = [
  { id: 'fair', name: 'Kuning Langsat', skin: '#F1C27D', skinShadow: '#C68642' },
  { id: 'tan', name: 'Sawo Matang', skin: '#E0AC69', skinShadow: '#8D5524' },
  { id: 'light', name: 'Putih Cerah', skin: '#FFDBAC', skinShadow: '#E0AC69' },
  { id: 'bronze', name: 'Tan Bronze', skin: '#C68642', skinShadow: '#5C3A21' },
  { id: 'dark', name: 'Eksotis Gelap', skin: '#8D5524', skinShadow: '#3A2010' }
];

const DIALOGUES = [
  { cat: 'p5m', title: 'P5M: K3 Laboratorium', text: 'Safety glasses & masker selalu terpasang sebelum crusher berputar. Zero accident!' },
  { cat: 'p5m', title: 'P5M: Suhu Furnace Panas', text: 'Suhu furnace bisa 815°C! Gunakan penjepit crucible dan sarung tangan tebal.' },
  { cat: 'labnote', title: 'Labnote: Kalibrasi Timbangan', text: 'Timbangan 4 desimal harus di-zeroing dan dicek anak timbang sebelum batch pagi!' },
  { cat: 'labnote', title: 'Labnote: Total Moisture', text: 'Patuhi waktu pengeringan oven ASTM D3302 agar hasil analisa kadar air presisi.' },
  { cat: 'logbook', title: 'Logbook: Ceklis Subtask', text: 'Ada task logbook yang belum dicentang? Klik judul task di beranda untuk expand!' },
  { cat: 'quotes', title: 'Motivasi Site Prep', text: 'Batubara boleh hitam pekat, tapi hasil analisa lab kita harus secerah masa depan!' },
  { cat: 'quotes', title: 'Humor Anak Prep', text: 'Kopi boleh pahit, tapi sample batubara jangan sampai gosong. Semangat shift!' }
];

export const Avatar3DWidget: React.FC<Avatar3DWidgetProps> = ({ 
  size, 
  userNik = 'default',
  userName = 'Ranger' 
}) => {
  const unlockedStorageKey = `preplab_pixel_unlocked_items_${userNik}`;
  const configStorageKey = `preplab_pixel_fullbody_cfg_${userNik}`;

  // -------------------------------------------------------------
  // UNLOCKED ITEMS STATE
  // -------------------------------------------------------------
  const [unlockedIds, setUnlockedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(unlockedStorageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Default unlocked items
    return [
      ...HEADWEAR_ITEMS.filter(i => i.isUnlockedDefault).map(i => i.id),
      ...OUTFIT_ITEMS.filter(i => i.isUnlockedDefault).map(i => i.id),
      ...EYE_ITEMS.filter(i => i.isUnlockedDefault).map(i => i.id),
      ...ACCESSORY_ITEMS.filter(i => i.isUnlockedDefault).map(i => i.id),
      ...BOOTS_ITEMS.filter(i => i.isUnlockedDefault).map(i => i.id)
    ];
  });

  const isUnlocked = (itemId: string) => unlockedIds.includes(itemId);

  const handleUnlockItem = (item: AvatarItem) => {
    if (unlockedIds.includes(item.id)) return;
    const next = [...unlockedIds, item.id];
    setUnlockedIds(next);
    try {
      localStorage.setItem(unlockedStorageKey, JSON.stringify(next));
    } catch {}
    playRetroSound('happy');
    toast.success(`🎉 Selamat! Item "${item.name}" berhasil dibuka!`);
  };

  // -------------------------------------------------------------
  // AVATAR EQUIPMENT STATE
  // -------------------------------------------------------------
  const [skin, setSkin] = useState(SKIN_TONES[1]); // tan
  const [headwear, setHeadwear] = useState(HEADWEAR_ITEMS[0]); // helmet_yellow
  const [outfit, setOutfit] = useState(OUTFIT_ITEMS[0]); // vest_orange
  const [eyes, setEyes] = useState(EYE_ITEMS[1]); // glasses_k3
  const [accessory, setAccessory] = useState(ACCESSORY_ITEMS[0]); // lanyard
  const [boots, setBoots] = useState(BOOTS_ITEMS[0]); // boots_black
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load saved appearance
  useEffect(() => {
    try {
      const saved = localStorage.getItem(configStorageKey);
      if (saved) {
        const p = JSON.parse(saved);
        if (p.skinId) setSkin(SKIN_TONES.find(s => s.id === p.skinId) || skin);
        if (p.headwearId) setHeadwear(HEADWEAR_ITEMS.find(h => h.id === p.headwearId) || headwear);
        if (p.outfitId) setOutfit(OUTFIT_ITEMS.find(o => o.id === p.outfitId) || outfit);
        if (p.eyesId) setEyes(EYE_ITEMS.find(e => e.id === p.eyesId) || eyes);
        if (p.accessoryId) setAccessory(ACCESSORY_ITEMS.find(a => a.id === p.accessoryId) || accessory);
        if (p.bootsId) setBoots(BOOTS_ITEMS.find(b => b.id === p.bootsId) || boots);
      }
    } catch {}
  }, [configStorageKey]);

  const saveAppearance = (updates: any = {}) => {
    try {
      const data = {
        skinId: skin.id,
        headwearId: headwear.id,
        outfitId: outfit.id,
        eyesId: eyes.id,
        accessoryId: accessory.id,
        bootsId: boots.id,
        ...updates
      };
      localStorage.setItem(configStorageKey, JSON.stringify(data));
    } catch {}
  };

  // -------------------------------------------------------------
  // LIVING WALKING & INTERACTION ENGINE
  // -------------------------------------------------------------
  // Position as percentage across the floor (10% to 90%)
  const [posX, setPosX] = useState<number>(35);
  const [targetX, setTargetX] = useState<number>(35);
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [walkFrame, setWalkFrame] = useState<number>(0);
  const [isWalking, setIsWalking] = useState<boolean>(false);
  const [actionState, setActionState] = useState<'idle' | 'walk' | 'coffee' | 'inspect' | 'jump'>('idle');
  const [clickTargetMarker, setClickTargetMarker] = useState<number | null>(null);

  // Floating dialogue bubble
  const [speechText, setSpeechText] = useState<string>('Selamat bertugas di Shift Laboratorium!');
  const [speechVisible, setSpeechVisible] = useState<boolean>(true);
  const [dialogueIdx, setDialogueIdx] = useState<number>(0);

  // Wardrobe / Customization Modal State
  const [showWardrobe, setShowWardrobe] = useState<boolean>(false);
  const [wardrobeTab, setWardrobeTab] = useState<'head' | 'outfit' | 'eyes' | 'acc' | 'boots' | 'skin'>('head');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wardrobeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Play retro audio chime
  const playRetroSound = (type: 'beep' | 'happy' | 'walk' = 'beep') => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (type === 'happy') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      } else if (type === 'walk') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, ctx.currentTime);
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      }
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  };

  // Movement Loop: Step towards targetX
  useEffect(() => {
    const moveTimer = setInterval(() => {
      setPosX(current => {
        const diff = targetX - current;
        if (Math.abs(diff) < 1.5) {
          setIsWalking(false);
          setClickTargetMarker(null);
          if (actionState === 'walk') setActionState('idle');
          return current;
        }

        setIsWalking(true);
        setWalkFrame(f => (f + 1) % 4);
        const step = diff > 0 ? 1.4 : -1.4;
        setFacing(diff > 0 ? 'right' : 'left');
        return Math.max(10, Math.min(90, current + step));
      });
    }, 90);

    return () => clearInterval(moveTimer);
  }, [targetX, actionState]);

  // Autonomous Wander Routine: Avatar periodically decides to walk & do site activities
  useEffect(() => {
    const wanderTimer = setInterval(() => {
      // If currently idle, 55% chance to wander to a new floor position
      if (!isWalking && actionState === 'idle') {
        const rand = Math.random();
        if (rand < 0.6) {
          // Wander to random spot
          const newTarget = 15 + Math.floor(Math.random() * 70);
          setTargetX(newTarget);
          setActionState('walk');
        } else if (rand < 0.8) {
          // Do quick inspection
          setActionState('inspect');
          setSpeechText('🔍 Memeriksa kerapian area sampling & sieve...');
          setSpeechVisible(true);
          setTimeout(() => setActionState('idle'), 4000);
        } else {
          // Sip coffee break
          setActionState('coffee');
          setSpeechText('☕ Istirahat sejenak seruput kopi hangat!');
          setSpeechVisible(true);
          setTimeout(() => setActionState('idle'), 4000);
        }
      }
    }, 7500);

    return () => clearInterval(wanderTimer);
  }, [isWalking, actionState]);

  // User Click on Floor: Avatar walks to that spot!
  const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(12, Math.min(88, (clickX / rect.width) * 100));

    setTargetX(percent);
    setClickTargetMarker(percent);
    setActionState('walk');
    playRetroSound('beep');
  };

  // User Tap on Avatar: Interacts & cheers up!
  const handleAvatarDirectClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActionState('jump');
    playRetroSound('happy');

    // Cycle friendly reaction
    const quotes = [
      'Siap komandan! Ranger PrepLab selalu siaga K3!',
      'Zero Accident adalah harga mati di laboratorium!',
      'Area crusher aman, alat pelindung diri lengkap!',
      'Jangan lupa ceklis subtask logbook hari ini ya kawan!',
      'P2H alat preparasi batubara beroperasi 100% prima!'
    ];
    const picked = quotes[Math.floor(Math.random() * quotes.length)];
    setSpeechText(picked);
    setSpeechVisible(true);

    setTimeout(() => {
      setActionState('idle');
    }, 1200);
  };

  // Next Message button
  const handleNextDialogue = () => {
    const nextIdx = (dialogueIdx + 1) % DIALOGUES.length;
    setDialogueIdx(nextIdx);
    setSpeechText(DIALOGUES[nextIdx].text);
    setSpeechVisible(true);
    playRetroSound('beep');
  };

  // -------------------------------------------------------------
  // FULL BODY PIXEL CANVAS RENDERING ENGINE
  // -------------------------------------------------------------
  const drawFullBodyPixel = (
    canvas: HTMLCanvasElement, 
    frame: number, 
    faceDir: 'left' | 'right', 
    state: typeof actionState
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // 24x32 grid coordinate space
    const p = Math.floor(W / 24);

    const rect = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x * p), Math.round(y * p), Math.round(w * p), Math.round(h * p));
    };

    // Flip horizontally if facing left
    ctx.save();
    if (faceDir === 'left') {
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
    }

    // Walking animation offsets
    let legOffsetL = 0;
    let legOffsetR = 0;
    let armOffsetL = 0;
    let armOffsetR = 0;
    let bodyBob = 0;

    if (state === 'walk') {
      if (frame === 0) {
        legOffsetL = -2; legOffsetR = 2;
        armOffsetL = 2; armOffsetR = -2;
      } else if (frame === 1) {
        bodyBob = -1;
      } else if (frame === 2) {
        legOffsetL = 2; legOffsetR = -2;
        armOffsetL = -2; armOffsetR = 2;
      } else if (frame === 3) {
        bodyBob = -1;
      }
    } else if (state === 'jump') {
      bodyBob = -4;
    } else if (state === 'coffee' || state === 'inspect') {
      bodyBob = (frame % 2 === 0) ? -1 : 0;
    }

    // 1. FEET SHADOW
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(12 * p, 31 * p, 7 * p, 2 * p, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. LEGS & SAFETY BOOTS K3 (Y: 22 to 30)
    const pantsCol = outfit.id.includes('wearpack') ? outfit.hex! : '#1E293B';
    const bCol = boots.hex || '#1E293B';
    const bShad = boots.shadow || '#0F172A';

    // Left Leg & Boot
    rect(8, 22 + bodyBob, 3, 5 + legOffsetL, pantsCol);
    rect(7, 27 + bodyBob + legOffsetL, 4, 3, bCol); // Boot base
    rect(6, 29 + bodyBob + legOffsetL, 5, 2, bShad); // Steel-toe sole

    // Right Leg & Boot
    rect(13, 22 + bodyBob, 3, 5 + legOffsetR, pantsCol);
    rect(13, 27 + bodyBob + legOffsetR, 4, 3, bCol);
    rect(13, 29 + bodyBob + legOffsetR, 5, 2, bShad);

    // 3. TORSO & APD OUTFIT (Y: 13 to 22)
    const oBase = outfit.hex || '#EA580C';
    const oStripe = outfit.accent || '#F8FAFC';
    const oCollar = outfit.shadow || '#9A3412';

    // Main torso
    rect(7, 14 + bodyBob, 10, 8, oBase);
    rect(8, 13 + bodyBob, 8, 1, oBase); // Shoulders

    // Reflective Safety Stripes or Lapel
    if (outfit.id.includes('vest')) {
      rect(8, 16 + bodyBob, 2, 5, oStripe);
      rect(14, 16 + bodyBob, 2, 5, oStripe);
      rect(7, 19 + bodyBob, 10, 1, oStripe); // Horizontal stripe
    } else if (outfit.id === 'lab_coat') {
      rect(11, 14 + bodyBob, 2, 7, '#0D9488'); // PrepLab Tie/Pen
      rect(8, 15 + bodyBob, 1, 6, oStripe);
      rect(15, 15 + bodyBob, 1, 6, oStripe);
    }

    // Belt / Waistline
    rect(7, 21 + bodyBob, 10, 1, '#0F172A');
    rect(11, 21 + bodyBob, 2, 1, '#FACC15'); // Belt Buckle

    // 4. ARMS & HANDS (Y: 14 to 21)
    // Left Arm (Back)
    rect(5, 14 + bodyBob + armOffsetL, 2, 6, oBase);
    rect(5, 19 + bodyBob + armOffsetL, 2, 2, skin.skin); // Hand

    // Right Arm (Front)
    if (state === 'coffee') {
      // Holding coffee mug up
      rect(17, 14 + bodyBob, 2, 4, oBase);
      rect(18, 16 + bodyBob, 3, 2, skin.skin);
      rect(19, 14 + bodyBob, 3, 3, '#8B5CF6'); // Coffee mug
      rect(20, 12 + bodyBob, 1, 2, 'rgba(255,255,255,0.7)'); // Steam
    } else if (state === 'inspect') {
      // Holding magnifying tool
      rect(17, 14 + bodyBob, 2, 4, oBase);
      rect(18, 17 + bodyBob, 3, 2, skin.skin);
      rect(20, 15 + bodyBob, 3, 3, '#0284C7'); // Lens tool
    } else {
      rect(17, 14 + bodyBob + armOffsetR, 2, 6, oBase);
      rect(17, 19 + bodyBob + armOffsetR, 2, 2, skin.skin);
    }

    // 5. HEAD & FACE (Y: 5 to 13)
    // Neck
    rect(10, 12 + bodyBob, 4, 2, skin.skinShadow);

    // Head base
    rect(7, 5 + bodyBob, 10, 8, skin.skin);
    rect(6, 6 + bodyBob, 12, 6, skin.skin);

    // Cheeks
    rect(7, 9 + bodyBob, 2, 1, 'rgba(244, 63, 94, 0.45)');
    rect(15, 9 + bodyBob, 2, 1, 'rgba(244, 63, 94, 0.45)');

    // 6. HEADWEAR (Helmet K3 / Cap / Hair / Hijab)
    const hwCol = headwear.hex || '#FACC15';
    const hwShad = headwear.shadow || '#CA8A04';

    if (headwear.id.includes('helmet')) {
      rect(6, 3 + bodyBob, 12, 4, hwCol);
      rect(5, 6 + bodyBob, 14, 2, hwShad); // Visor brim
      rect(10, 4 + bodyBob, 4, 2, '#FFFFFF'); // K3 Emblem
      rect(11, 4 + bodyBob, 2, 2, '#16A34A');
    } else if (headwear.id.includes('cap')) {
      rect(6, 3 + bodyBob, 12, 4, hwCol);
      rect(5, 6 + bodyBob, 15, 1, hwShad);
      rect(14, 6 + bodyBob, 5, 1, hwShad); // Cap beak
    } else if (headwear.id === 'hijab_k3') {
      rect(5, 3 + bodyBob, 14, 4, hwCol);
      rect(5, 7 + bodyBob, 3, 7, hwCol);
      rect(16, 7 + bodyBob, 3, 7, hwCol);
      rect(6, 12 + bodyBob, 12, 2, hwShad);
    } else if (headwear.id === 'crown_champion') {
      rect(7, 2 + bodyBob, 10, 4, hwCol);
      rect(7, 1 + bodyBob, 2, 2, hwShad);
      rect(11, 1 + bodyBob, 2, 2, hwShad);
      rect(15, 1 + bodyBob, 2, 2, hwShad);
      rect(11, 3 + bodyBob, 2, 1, '#EF4444'); // Ruby gem
    } else {
      // Hair Spiky
      rect(6, 2 + bodyBob, 12, 4, hwCol);
      rect(5, 4 + bodyBob, 14, 3, hwCol);
      rect(7, 1 + bodyBob, 3, 2, hwCol);
      rect(12, 1 + bodyBob, 3, 2, hwCol);
    }

    // 7. EYES & EXPRESSION
    const eyeCol = '#0F172A';
    if (eyes.id === 'happy' || state === 'jump') {
      rect(8, 8 + bodyBob, 2, 1, eyeCol);
      rect(7, 9 + bodyBob, 1, 1, eyeCol);
      rect(14, 8 + bodyBob, 2, 1, eyeCol);
      rect(16, 9 + bodyBob, 1, 1, eyeCol);
    } else if (eyes.id === 'wink') {
      rect(8, 8 + bodyBob, 2, 2, eyeCol);
      rect(8, 8 + bodyBob, 1, 1, '#FFFFFF');
      rect(14, 9 + bodyBob, 2, 1, eyeCol);
    } else if (eyes.id === 'glasses_k3') {
      rect(8, 8 + bodyBob, 2, 2, eyeCol);
      rect(14, 8 + bodyBob, 2, 2, eyeCol);
      // Clear glasses frame
      rect(6, 7 + bodyBob, 5, 4, 'rgba(56, 189, 248, 0.45)');
      rect(13, 7 + bodyBob, 5, 4, 'rgba(56, 189, 248, 0.45)');
      rect(6, 7 + bodyBob, 12, 1, '#0284C7');
    } else if (eyes.id === 'sunglasses') {
      rect(6, 7 + bodyBob, 5, 4, '#0F172A');
      rect(13, 7 + bodyBob, 5, 4, '#0F172A');
      rect(6, 7 + bodyBob, 12, 1, '#334155');
    } else {
      rect(8, 8 + bodyBob, 2, 2, eyeCol);
      rect(14, 8 + bodyBob, 2, 2, eyeCol);
      rect(8, 8 + bodyBob, 1, 1, '#FFFFFF');
      rect(14, 8 + bodyBob, 1, 1, '#FFFFFF');
    }

    // Smile
    rect(11, 11 + bodyBob, 2, 1, '#8D5524');

    // 8. ACCESSORIES
    if (accessory.id === 'lanyard') {
      rect(10, 14 + bodyBob, 1, 6, '#EF4444');
      rect(13, 14 + bodyBob, 1, 6, '#EF4444');
      rect(11, 18 + bodyBob, 2, 2, '#F8FAFC'); // ID Badge
    } else if (accessory.id === 'mask_k3') {
      rect(8, 10 + bodyBob, 8, 3, '#06B6D4');
      rect(9, 11 + bodyBob, 6, 1, '#ECFEFF');
    } else if (accessory.id === 'ear_muff') {
      rect(5, 5 + bodyBob, 3, 5, '#F97316');
      rect(16, 5 + bodyBob, 3, 5, '#F97316');
      rect(6, 3 + bodyBob, 12, 1, '#1E293B');
    } else if (accessory.id === 'radio_ht') {
      rect(16, 15 + bodyBob, 2, 4, '#334155');
      rect(17, 13 + bodyBob, 1, 2, '#0F172A'); // Antenna
    }

    ctx.restore();
  };

  // Render main stage canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    drawFullBodyPixel(canvasRef.current, walkFrame, facing, actionState);
  }, [walkFrame, facing, actionState, headwear, outfit, eyes, accessory, boots, skin]);

  // Render wardrobe preview canvas (idle standing)
  useEffect(() => {
    if (!showWardrobe || !wardrobeCanvasRef.current) return;
    drawFullBodyPixel(wardrobeCanvasRef.current, 0, 'right', 'idle');
  }, [showWardrobe, headwear, outfit, eyes, accessory, boots, skin]);

  // Sync to main portal profile
  const handleSyncToProfile = async () => {
    if (!canvasRef.current) return;
    try {
      const dataUrl = canvasRef.current.toDataURL('image/png', 0.95);
      if (userNik && userNik !== 'default') {
        localStorage.setItem(`p2h_inspector_avatar_${userNik}`, dataUrl);
        try {
          await fetch('/api/employees/avatar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nik: userNik, avatar: dataUrl })
          });
        } catch {}
      }
      playRetroSound('happy');
      toast.success('Avatar Full-Body berhasil disinkronkan ke Foto Profil Portal Anda!');
    } catch {
      toast.error('Gagal sinkronisasi');
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between select-none relative overflow-hidden">
      {/* ----------------- TOP CONTROLS BAR ----------------- */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-main)]/60 pb-2 mb-1.5 z-10">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-xs">
            <Footprints className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-[var(--text-main)] flex items-center gap-1.5">
              <span>Ranger PrepLab</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20 font-mono">
                {isWalking ? '🚶 Patroli' : actionState === 'coffee' ? '☕ Coffee Break' : '🛡️ Siaga K3'}
              </span>
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1">
          {/* Mute button */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title={soundEnabled ? 'Suara Aktif' : 'Bisu'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-teal-600" /> : <VolumeX className="w-3.5 h-3.5 opacity-40" />}
          </button>

          {/* Quick Call Button */}
          <button
            type="button"
            onClick={() => {
              setTargetX(50);
              setActionState('walk');
              playRetroSound('beep');
              toast.info('Ranger dipanggil ke tengah ruang!');
            }}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-all cursor-pointer"
            title="Panggil Ranger ke Tengah"
          >
            <MapPin className="w-3.5 h-3.5" />
          </button>

          {/* Wardrobe Modal Button */}
          <button
            type="button"
            onClick={() => setShowWardrobe(true)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1 shadow-xs transition-all cursor-pointer"
          >
            <Palette className="w-3 h-3" />
            <span>Kustomisasi &amp; Unlock</span>
          </button>
        </div>
      </div>

      {/* ----------------- INTERACTIVE SITE ROOM STAGE ----------------- */}
      <div 
        onClick={handleStageClick}
        className="w-full flex-1 min-h-[160px] relative rounded-2xl border border-[var(--border-main)] overflow-hidden cursor-crosshair group shadow-inner transition-all"
        style={{
          background: 'linear-gradient(180deg, #09131B 0%, #0F2027 60%, #172D38 100%)'
        }}
        title="Klik lantai untuk memerintahkan Ranger berjalan ke sana!"
      >
        {/* Background Room Details: Safety Poster, Control Panel, Floor Grid */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Safety Banner on Wall */}
          <div className="absolute top-2 left-3 px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-[8px] font-mono font-bold text-amber-300 flex items-center gap-1">
            <ShieldAlert className="w-2.5 h-2.5 text-amber-400" />
            <span>SAFETY FIRST &bull; PREPLAB ZERO ACCIDENT</span>
          </div>

          {/* Lab Equipment Silhouette (Right Corner) */}
          <div className="absolute top-4 right-3 text-right opacity-30 text-[8px] font-mono text-cyan-400">
            <div>CRUSHER-01: READY</div>
            <div>TEMP: 815°C [FURNACE]</div>
          </div>

          {/* Industrial Epoxy Floor Tiles Line */}
          <div 
            className="absolute bottom-0 left-0 right-0 h-10 border-t border-cyan-500/20"
            style={{
              background: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 24px), linear-gradient(180deg, rgba(13,148,136,0.15) 0%, rgba(15,23,42,0.6) 100%)'
            }}
          />

          {/* Yellow Safety Warning Strip on Floor Edge */}
          <div 
            className="absolute bottom-9 left-0 right-0 h-1 opacity-40"
            style={{
              background: 'repeating-linear-gradient(45deg, #EAB308, #EAB308 6px, #0F172A 6px, #0F172A 12px)'
            }}
          />
        </div>

        {/* Click Destination Target Ripple Beacon */}
        {clickTargetMarker !== null && (
          <div 
            className="absolute bottom-4 pointer-events-none -translate-x-1/2 animate-ping"
            style={{ left: `${clickTargetMarker}%` }}
          >
            <div className="w-5 h-2 rounded-full border-2 border-teal-400 bg-teal-400/30" />
          </div>
        )}

        {/* ----------------- LIVING AVATAR & SPEECH BUBBLE ----------------- */}
        <div 
          className="absolute bottom-2 -translate-x-1/2 transition-all duration-75 flex flex-col items-center cursor-pointer"
          style={{ left: `${posX}%` }}
          onClick={handleAvatarDirectClick}
          title="Klik Ranger untuk berinteraksi!"
        >
          {/* Floating Speech Bubble Above Avatar Head */}
          {speechVisible && (
            <div 
              className="mb-1 max-w-[200px] sm:max-w-[240px] px-2.5 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 text-[10px] font-medium text-[var(--text-main)] shadow-lg border border-teal-500/30 text-center relative animate-in fade-in zoom-in-95"
              onClick={(e) => {
                e.stopPropagation();
                handleNextDialogue();
              }}
            >
              <span>{speechText}</span>
              {/* Bubble pointer tail */}
              <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-inherit border-b border-r border-teal-500/30 rotate-45" />
            </div>
          )}

          {/* Full Body Canvas Sprite */}
          <div className="relative group">
            <canvas
              ref={canvasRef}
              width={72}
              height={96}
              className="w-14 h-18 sm:w-16 sm:h-22 block"
              style={{
                imageRendering: 'pixelated'
              }}
            />

            {/* Tap hint emote on hover */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white px-1 py-0.2 rounded text-[8px] font-mono whitespace-nowrap">
              👋 Klik Saya!
            </div>
          </div>
        </div>

        {/* Floor Click Instruction overlay */}
        <div className="absolute bottom-1 right-2 pointer-events-none opacity-40 text-[9px] font-mono text-slate-300">
          Klik lantai untuk berjalan ➔
        </div>
      </div>

      {/* ----------------- BOTTOM COMMAND ACTION DECK ----------------- */}
      <div className="flex items-center justify-between gap-1.5 pt-2 mt-1 border-t border-[var(--border-main)]/50">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Action 1: Patrol / Auto-walk */}
          <button
            type="button"
            onClick={() => {
              const nextTarget = posX > 50 ? 20 : 80;
              setTargetX(nextTarget);
              setActionState('walk');
              playRetroSound('beep');
            }}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-[var(--text-main)] hover:bg-teal-500/10 hover:text-teal-600 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Footprints className="w-3 h-3 text-teal-600" />
            <span>Patroli</span>
          </button>

          {/* Action 2: Inspect K3 */}
          <button
            type="button"
            onClick={() => {
              setActionState('inspect');
              setSpeechText('🔍 Memeriksa kerapian crusher & ventilasi lab...');
              setSpeechVisible(true);
              playRetroSound('beep');
              setTimeout(() => setActionState('idle'), 4000);
            }}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-[var(--text-main)] hover:bg-amber-500/10 hover:text-amber-600 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Search className="w-3 h-3 text-amber-500" />
            <span>Cek APD</span>
          </button>

          {/* Action 3: Coffee Break */}
          <button
            type="button"
            onClick={() => {
              setActionState('coffee');
              setSpeechText('☕ Istirahat kopi 5 menit, segarkan pikiran!');
              setSpeechVisible(true);
              playRetroSound('beep');
              setTimeout(() => setActionState('idle'), 4000);
            }}
            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-[var(--text-main)] hover:bg-purple-500/10 hover:text-purple-600 transition-all flex items-center gap-1 cursor-pointer"
          >
            <Coffee className="w-3 h-3 text-purple-500" />
            <span>Ngopi</span>
          </button>
        </div>

        {/* Change Message Button */}
        <button
          type="button"
          onClick={handleNextDialogue}
          className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 transition-all flex items-center gap-1 cursor-pointer active:scale-95"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Ganti Pesan</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL KUSTOMISASI: STARTER GRATIS VS UNLOCKABLES              */}
      {/* ------------------------------------------------------------- */}
      {showWardrobe && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setShowWardrobe(false)}
        >
          <div 
            className="w-full max-w-2xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-[var(--border-main)] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-main)] bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                    <span>Wardrobe &amp; Kustomisasi Avatar Full-Body</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                      Starter + Unlockables
                    </span>
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Pilih 3-4 perlengkapan starter gratis atau buka perlengkapan eksklusif K3!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowWardrobe(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4">
              {/* Preview Box */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-[var(--border-main)]">
                {/* Full Body Canvas Preview */}
                <div className="p-2 rounded-2xl bg-slate-900 shadow-md border border-white/10 flex-shrink-0">
                  <canvas
                    ref={wardrobeCanvasRef}
                    width={96}
                    height={128}
                    className="w-20 h-28 sm:w-24 sm:h-32 block"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="text-xs font-bold text-[var(--text-main)]">
                    {headwear.name}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Seragam: <span className="font-semibold text-teal-600">{outfit.name}</span> &bull; {boots.name}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-600 font-bold border border-teal-500/20">
                      Terbuka: {unlockedIds.length} / {HEADWEAR_ITEMS.length + OUTFIT_ITEMS.length + EYE_ITEMS.length + ACCESSORY_ITEMS.length + BOOTS_ITEMS.length} Item
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[var(--border-main)] text-xs font-bold">
                {[
                  { id: 'head', label: 'Pelindung / Helm', count: HEADWEAR_ITEMS.length },
                  { id: 'outfit', label: 'Seragam / APD', count: OUTFIT_ITEMS.length },
                  { id: 'eyes', label: 'Mata / Kacamata', count: EYE_ITEMS.length },
                  { id: 'acc', label: 'Aksesoris K3', count: ACCESSORY_ITEMS.length },
                  { id: 'boots', label: 'Safety Boots', count: BOOTS_ITEMS.length },
                  { id: 'skin', label: 'Warna Kulit', count: SKIN_TONES.length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setWardrobeTab(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-all ${
                      wardrobeTab === tab.id
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-[var(--text-muted)] hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Item Grid (Split into Starters & Unlockables) */}
              <div className="space-y-4">
                {/* 1. HEADWEAR */}
                {wardrobeTab === 'head' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {HEADWEAR_ITEMS.map(item => {
                      const unlocked = isUnlocked(item.id);
                      const isSelected = headwear.id === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                            isSelected 
                              ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-1 ring-teal-500' 
                              : 'border-[var(--border-main)] bg-white dark:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div 
                              className="w-5 h-5 rounded-lg border border-black/20 flex-shrink-0"
                              style={{ backgroundColor: item.hex }}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[var(--text-main)] truncate">{item.name}</div>
                              <div className="text-[10px] text-[var(--text-muted)] truncate flex items-center gap-1">
                                {unlocked ? (
                                  <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Terbuka
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" /> {item.unlockReq}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setHeadwear(item);
                                saveAppearance({ headwearId: item.id });
                                playRetroSound('beep');
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-teal-600 text-white' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-main)] hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? 'Dipakai' : 'Pakai'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnlockItem(item)}
                              className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Buka Item</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. OUTFIT */}
                {wardrobeTab === 'outfit' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {OUTFIT_ITEMS.map(item => {
                      const unlocked = isUnlocked(item.id);
                      const isSelected = outfit.id === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                            isSelected 
                              ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-1 ring-teal-500' 
                              : 'border-[var(--border-main)] bg-white dark:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div 
                              className="w-5 h-5 rounded-lg border border-black/20 flex-shrink-0"
                              style={{ backgroundColor: item.hex }}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[var(--text-main)] truncate">{item.name}</div>
                              <div className="text-[10px] text-[var(--text-muted)] truncate">
                                {unlocked ? (
                                  <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Terbuka
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" /> {item.unlockReq}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setOutfit(item);
                                saveAppearance({ outfitId: item.id });
                                playRetroSound('beep');
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-teal-600 text-white' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-main)] hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? 'Dipakai' : 'Pakai'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnlockItem(item)}
                              className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Buka Item</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. EYES & GLASSES */}
                {wardrobeTab === 'eyes' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {EYE_ITEMS.map(item => {
                      const unlocked = isUnlocked(item.id);
                      const isSelected = eyes.id === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                            isSelected 
                              ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-1 ring-teal-500' 
                              : 'border-[var(--border-main)] bg-white dark:bg-slate-900/60'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[var(--text-main)] truncate">{item.name}</div>
                            <div className="text-[10px] text-[var(--text-muted)] truncate">
                              {unlocked ? (
                                <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Terbuka
                                </span>
                              ) : (
                                <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" /> {item.unlockReq}
                                </span>
                              )}
                            </div>
                          </div>

                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setEyes(item);
                                saveAppearance({ eyesId: item.id });
                                playRetroSound('beep');
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-teal-600 text-white' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-main)] hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? 'Dipakai' : 'Pakai'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnlockItem(item)}
                              className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Buka Item</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 4. ACCESSORIES */}
                {wardrobeTab === 'acc' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {ACCESSORY_ITEMS.map(item => {
                      const unlocked = isUnlocked(item.id);
                      const isSelected = accessory.id === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                            isSelected 
                              ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-1 ring-teal-500' 
                              : 'border-[var(--border-main)] bg-white dark:bg-slate-900/60'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-[var(--text-main)] truncate">{item.name}</div>
                            <div className="text-[10px] text-[var(--text-muted)] truncate">
                              {unlocked ? (
                                <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                  <Check className="w-2.5 h-2.5" /> Terbuka
                                </span>
                              ) : (
                                <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" /> {item.unlockReq}
                                </span>
                              )}
                            </div>
                          </div>

                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setAccessory(item);
                                saveAppearance({ accessoryId: item.id });
                                playRetroSound('beep');
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-teal-600 text-white' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-main)] hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? 'Dipakai' : 'Pakai'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnlockItem(item)}
                              className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Buka Item</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 5. BOOTS */}
                {wardrobeTab === 'boots' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {BOOTS_ITEMS.map(item => {
                      const unlocked = isUnlocked(item.id);
                      const isSelected = boots.id === item.id;

                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                            isSelected 
                              ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-1 ring-teal-500' 
                              : 'border-[var(--border-main)] bg-white dark:bg-slate-900/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div 
                              className="w-5 h-5 rounded-lg border border-black/20 flex-shrink-0"
                              style={{ backgroundColor: item.hex }}
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-[var(--text-main)] truncate">{item.name}</div>
                              <div className="text-[10px] text-[var(--text-muted)] truncate">
                                {unlocked ? (
                                  <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Terbuka
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-semibold flex items-center gap-0.5">
                                    <Lock className="w-2.5 h-2.5" /> {item.unlockReq}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {unlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setBoots(item);
                                saveAppearance({ bootsId: item.id });
                                playRetroSound('beep');
                              }}
                              className={`px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                isSelected 
                                  ? 'bg-teal-600 text-white' 
                                  : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-main)] hover:bg-slate-200'
                              }`}
                            >
                              {isSelected ? 'Dipakai' : 'Pakai'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnlockItem(item)}
                              className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Buka Item</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 6. SKIN TONES */}
                {wardrobeTab === 'skin' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {SKIN_TONES.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSkin(s);
                          saveAppearance({ skinId: s.id });
                          playRetroSound('beep');
                        }}
                        className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all text-left ${
                          skin.id === s.id 
                            ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 ring-1 ring-teal-500' 
                            : 'border-[var(--border-main)] hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div 
                          className="w-5 h-5 rounded-full border border-black/20 shadow-xs flex-shrink-0"
                          style={{ backgroundColor: s.skin }}
                        />
                        <span className="text-xs font-semibold text-[var(--text-main)]">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-[var(--border-main)] bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSyncToProfile}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Jadikan Foto Profil Portal</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  saveAppearance();
                  setShowWardrobe(false);
                  playRetroSound('happy');
                  toast.success('Peralatan avatar tersimpan!');
                }}
                className="px-5 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Selesai</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
