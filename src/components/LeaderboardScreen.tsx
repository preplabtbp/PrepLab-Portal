import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, Award, Crown, Star, Sparkles, Shield, Flame, CheckCircle2, 
  Lock, ArrowLeft, Users, Filter, ChevronRight, Info, Zap, Gift, 
  Layers, MapPin, Search, Eye, AlertTriangle, HelpCircle, Check
} from 'lucide-react';
import { PageHeader } from './PageHeader';
import { Button, Card } from './ui';
import { toast } from 'sonner';

export interface LeaderboardUser {
  rank: number;
  nik: string;
  name: string;
  section: string;
  pt: string;
  avatar?: string;
  title: string;
  frame: string;
  seasonXp: number;
  totalXp: number;
  level: number;
  badgesCount: number;
  inspectionCount: number;
  ktaCount: number;
  p5mStreak: number;
}

export interface SectionScore {
  rank: number;
  name: string;
  totalPersonnel: number;
  avgXp: number;
  safetyCompliance: number; // percentage
  totalInspections: number;
  totalKta: number;
  color: string;
}

export interface BadgeItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: 'safety' | 'operational' | 'learning' | 'special';
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  icon: string;
  xpReward: number;
  criteria: string;
  isUnlocked: boolean;
  unlockedAt?: string;
}

// Preset Badges Collection
export const PRESET_BADGES: BadgeItem[] = [
  {
    id: 'b1',
    code: 'SAFETY_SENTINEL',
    title: 'Hazard Sentinel',
    description: 'Konsisten melaporkan potensi bahaya KTA/TTA di area kerja.',
    category: 'safety',
    rarity: 'Rare',
    icon: '🛡️',
    xpReward: 150,
    criteria: 'Laporkan minimal 10 KTA/TTA terverifikasi',
    isUnlocked: true,
    unlockedAt: '12 Sep 2026'
  },
  {
    id: 'b2',
    code: 'PRECISION_MASTER',
    title: 'Master of Precision',
    description: 'Menyelesaikan formulir inspeksi dengan ketelitian tinggi tanpa cacat data.',
    category: 'operational',
    rarity: 'Epic',
    icon: '🔬',
    xpReward: 300,
    criteria: 'Tuntaskan 50 inspeksi mingguan/harian',
    isUnlocked: true,
    unlockedAt: '05 Sep 2026'
  },
  {
    id: 'b3',
    code: 'DAWN_PATROL',
    title: 'The Dawn Patrol',
    description: 'Ketepatan waktu dan komitmen penuh pada safety briefing P5M pagi.',
    category: 'safety',
    rarity: 'Rare',
    icon: '🌅',
    xpReward: 200,
    criteria: 'Check-in P5M tepat waktu 14 hari berturut-turut',
    isUnlocked: true,
    unlockedAt: '15 Sep 2026'
  },
  {
    id: 'b4',
    code: 'SAFETY_SCHOLAR',
    title: 'Safety Scholar',
    description: 'Pemahaman mendalam mengenai standar K3 & prosedur laboratorium.',
    category: 'learning',
    rarity: 'Rare',
    icon: '🧠',
    xpReward: 180,
    criteria: 'Raih nilai 100 pada 4 kuis safety berkala',
    isUnlocked: false
  },
  {
    id: 'b5',
    code: 'ZERO_DOWNTIME',
    title: 'Zero Downtime Hero',
    description: 'Respon cepat penanganan perbaikan unit & instrumen laboratorium.',
    category: 'operational',
    rarity: 'Epic',
    icon: '⚡',
    xpReward: 350,
    criteria: 'Tuntaskan 20 Work Order maintenance tepat target',
    isUnlocked: false
  },
  {
    id: 'b6',
    code: 'PREPLAB_CHAMPION',
    title: 'PrepLab Champion',
    description: 'Peringkat #1 tertinggi klasemen poin operasional dan safety bulanan.',
    category: 'special',
    rarity: 'Legendary',
    icon: '👑',
    xpReward: 1000,
    criteria: 'Raih peringkat 1 di penutupan musim (Season)',
    isUnlocked: false
  },
  {
    id: 'b7',
    code: 'CARTOGRAPHER',
    title: 'Portal Explorer',
    description: 'Menjelajahi seluruh fitur dan modul dalam portal PrepLab.',
    category: 'special',
    rarity: 'Common',
    icon: '🗺️',
    xpReward: 100,
    criteria: 'Buka dan jelajahi seluruh menu portal',
    isUnlocked: true,
    unlockedAt: '01 Sep 2026'
  },
  {
    id: 'b8',
    code: 'NOCTURNAL_OPERATOR',
    title: 'Nocturnal Analyst',
    description: 'Dedikasi tinggi menjaga kelancaran analisa dan sampling di shift malam.',
    category: 'special',
    rarity: 'Epic',
    icon: '🦉',
    xpReward: 250,
    criteria: 'Submit inspeksi / tugas pada shift 3 (pukul 01:00 - 03:00)',
    isUnlocked: false
  }
];

export const AVAILABLE_TITLES = [
  { id: 'none', label: 'Tanpa Gelar', desc: 'Standar' },
  { id: 'safety_vanguard', label: 'Safety Vanguard', desc: 'Lencana Kepatuhan K3' },
  { id: 'hazard_hunter', label: 'Hazard Hunter', desc: 'Pelapor KTA Teraktif' },
  { id: 'precision_analyst', label: 'Precision Analyst', desc: 'Inspektur Teliti Lab' },
  { id: 'night_operator', label: 'Nocturnal Operator', desc: 'Pahlawan Shift Malam (Hidden)' },
  { id: 'master_technician', label: 'Master Technician', desc: 'Spesialis Maintenance Handal' }
];

export const AVAILABLE_FRAMES = [
  { id: 'default', label: 'Default', ringColor: 'border-slate-300 dark:border-slate-700', effect: '' },
  { id: 'golden_halo', label: 'Golden Flame Halo', ringColor: 'border-amber-400 ring-4 ring-amber-400/40 shadow-lg shadow-amber-500/30', effect: 'animate-pulse' },
  { id: 'cyber_neon', label: 'Cyber Teal Neon', ringColor: 'border-teal-400 ring-4 ring-teal-400/50 shadow-lg shadow-teal-500/40', effect: '' },
  { id: 'emerald_aurora', label: 'Emerald Aurora', ringColor: 'border-emerald-400 ring-4 ring-emerald-400/40 shadow-lg shadow-emerald-500/30', effect: '' },
  { id: 'obsidian_dark', label: 'Obsidian Minimal', ringColor: 'border-slate-900 dark:border-white/80 ring-2 ring-slate-500/30', effect: '' }
];

export function LeaderboardScreen({
  onBack,
  inspectorNik,
  inspectorName,
  userProfile
}: {
  onBack: () => void;
  inspectorNik: string | null;
  inspectorName: string | null;
  userProfile?: any;
}) {
  const [activeTab, setActiveTab] = useState<'individual' | 'sections' | 'badges' | 'customization'>('individual');
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);

  // User Equipped Customization (Synced with LocalStorage for immediate persistence)
  const [userTitle, setUserTitle] = useState(() => localStorage.getItem('preplab_equipped_title') || 'Safety Vanguard');
  const [userFrame, setUserFrame] = useState(() => localStorage.getItem('preplab_equipped_frame') || 'golden_halo');
  const [hasUnlockedEasterEgg, setHasUnlockedEasterEgg] = useState(() => localStorage.getItem('preplab_easter_unlocked') === '1');
  const [showCelebration, setShowCelebration] = useState(false);

  // Realistic sample leaderboard data for presentation
  const mockLeaderboard: LeaderboardUser[] = [
    {
      rank: 1,
      nik: '02D24000043',
      name: 'Rahmat Hidayat',
      section: 'Laboratory',
      pt: 'TBP',
      title: 'PrepLab Champion',
      frame: 'golden_halo',
      seasonXp: 1420,
      totalXp: 5850,
      level: 24,
      badgesCount: 14,
      inspectionCount: 42,
      ktaCount: 18,
      p5mStreak: 26
    },
    {
      rank: 2,
      nik: '02D24000088',
      name: 'Bayu Pratama',
      section: 'Preparation',
      pt: 'TBP',
      title: 'Hazard Hunter',
      frame: 'cyber_neon',
      seasonXp: 1340,
      totalXp: 5120,
      level: 21,
      badgesCount: 12,
      inspectionCount: 38,
      ktaCount: 22,
      p5mStreak: 21
    },
    {
      rank: 3,
      nik: '02D25000012',
      name: 'Dewi Lestari',
      section: 'Laboratory',
      pt: 'GTS',
      title: 'Precision Analyst',
      frame: 'emerald_aurora',
      seasonXp: 1280,
      totalXp: 4890,
      level: 19,
      badgesCount: 11,
      inspectionCount: 40,
      ktaCount: 15,
      p5mStreak: 25
    },
    {
      rank: 4,
      nik: inspectorNik || '02D25000055',
      name: inspectorName || 'Ahmad Fauzi (Anda)',
      section: userProfile?.section || 'Laboratory',
      pt: userProfile?.pt || 'TBP',
      title: userTitle,
      frame: userFrame,
      seasonXp: 1190,
      totalXp: 4450,
      level: 18,
      badgesCount: 9,
      inspectionCount: 35,
      ktaCount: 14,
      p5mStreak: 19
    },
    {
      rank: 5,
      nik: '02D24000115',
      name: 'Hendra Gunawan',
      section: 'Maintenance',
      pt: 'TBP',
      title: 'Master Technician',
      frame: 'default',
      seasonXp: 1120,
      totalXp: 4100,
      level: 17,
      badgesCount: 8,
      inspectionCount: 28,
      ktaCount: 12,
      p5mStreak: 22
    },
    {
      rank: 6,
      nik: '02D23000072',
      name: 'Siti Nurhaliza',
      section: 'Quality Assurance',
      pt: 'TBP',
      title: 'Safety Vanguard',
      frame: 'default',
      seasonXp: 1040,
      totalXp: 3950,
      level: 16,
      badgesCount: 7,
      inspectionCount: 31,
      ktaCount: 10,
      p5mStreak: 18
    },
    {
      rank: 7,
      nik: '02D24000204',
      name: 'Agus Setiawan',
      section: 'Preparation',
      pt: 'GTS',
      title: 'Tanpa Gelar',
      frame: 'default',
      seasonXp: 980,
      totalXp: 3600,
      level: 15,
      badgesCount: 6,
      inspectionCount: 25,
      ktaCount: 9,
      p5mStreak: 14
    },
    {
      rank: 8,
      nik: '02D25000089',
      name: 'Faisal Basri',
      section: 'Inventory Control',
      pt: 'TBP',
      title: 'Tanpa Gelar',
      frame: 'default',
      seasonXp: 890,
      totalXp: 3200,
      level: 13,
      badgesCount: 5,
      inspectionCount: 22,
      ktaCount: 8,
      p5mStreak: 12
    }
  ];

  const mockSections: SectionScore[] = [
    {
      rank: 1,
      name: 'Laboratory',
      totalPersonnel: 28,
      avgXp: 1250,
      safetyCompliance: 98.4,
      totalInspections: 245,
      totalKta: 84,
      color: 'teal'
    },
    {
      rank: 2,
      name: 'Preparation',
      totalPersonnel: 42,
      avgXp: 1180,
      safetyCompliance: 96.8,
      totalInspections: 310,
      totalKta: 112,
      color: 'amber'
    },
    {
      rank: 3,
      name: 'Maintenance',
      totalPersonnel: 18,
      avgXp: 1140,
      safetyCompliance: 97.2,
      totalInspections: 160,
      totalKta: 65,
      color: 'indigo'
    },
    {
      rank: 4,
      name: 'Quality Assurance (QA)',
      totalPersonnel: 12,
      avgXp: 1090,
      safetyCompliance: 99.1,
      totalInspections: 140,
      totalKta: 38,
      color: 'rose'
    },
    {
      rank: 5,
      name: 'Administration & HR',
      totalPersonnel: 8,
      avgXp: 920,
      safetyCompliance: 95.0,
      totalInspections: 75,
      totalKta: 22,
      color: 'purple'
    }
  ];

  const handleSaveCustomization = (newTitle: string, newFrame: string) => {
    setUserTitle(newTitle);
    setUserFrame(newFrame);
    localStorage.setItem('preplab_equipped_title', newTitle);
    localStorage.setItem('preplab_equipped_frame', newFrame);
    toast.success('Kustomisasi berhasil diterapkan ke profil!');
  };

  const handleUnlockEasterEgg = () => {
    setHasUnlockedEasterEgg(true);
    localStorage.setItem('preplab_easter_unlocked', '1');
    setShowCelebration(true);
    toast.success('🎉 SELAMAT! Anda menemukan Hidden Item: Gelar "Nocturnal Operator" & Bingkai Rahasia!');
    setTimeout(() => setShowCelebration(false), 4000);
  };

  const top3 = mockLeaderboard.slice(0, 3);
  const restUsers = mockLeaderboard.slice(3);

  const filteredBadges = PRESET_BADGES.filter(b => {
    if (badgeFilter === 'unlocked') return b.isUnlocked;
    if (badgeFilter === 'locked') return !b.isUnlocked;
    return true;
  });

  return (
    <div className="w-full min-h-[100dvh] pb-24 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <PageHeader 
        title="Hall of Fame & Leaderboard" 
        subtitle="Papan Peringkat Kepatuhan K3 & Keunggulan Operasional PrepLab"
        onBack={onBack}
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-bounce" /> Season 1 · Sep 2026
            </span>
          </div>
        }
      />

      {/* Hero Presentation Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-teal-900 via-slate-900 to-indigo-950 text-white shadow-2xl border border-white/10">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-teal-300 text-xs font-bold tracking-wide uppercase border border-white/15">
              <Trophy className="w-3.5 h-3.5 text-amber-400" /> Executive Showcase Mockup
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display tracking-tight text-white">
              Sistem Penghargaan & Prestasi Karyawan
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Mendorong keunggulan budaya K3 (Inspeksi, KTA, P5M) melalui gamifikasi interaktif, lencana penghargaan tertagih (*collectible badges*), serta item kustomisasi profil karyawan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 text-center min-w-[100px]">
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Status Musim</span>
              <span className="text-lg font-black text-amber-400">Aktif</span>
              <span className="text-[10px] text-teal-300 block">Sisa 13 Hari</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/15 text-center min-w-[100px]">
              <span className="text-[10px] uppercase font-bold text-slate-300 block">Poin Anda</span>
              <span className="text-lg font-black text-teal-300">1,190 XP</span>
              <span className="text-[10px] text-amber-300 block">Rank #4 (Top 5%)</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation Strip */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => setActiveTab('individual')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'individual'
                ? 'bg-white text-slate-900 shadow-lg scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            Peringkat Individu
          </button>
          <button
            onClick={() => setActiveTab('sections')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'sections'
                ? 'bg-white text-slate-900 shadow-lg scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Users className="w-4 h-4 text-teal-400" />
            Peringkat Section
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'badges'
                ? 'bg-white text-slate-900 shadow-lg scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Award className="w-4 h-4 text-rose-400" />
            Galeri Lencana ({PRESET_BADGES.length})
          </button>
          <button
            onClick={() => setActiveTab('customization')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'customization'
                ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-black shadow-lg scale-105'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
            Kustomisasi & Hidden Item
          </button>
        </div>
      </div>

      {/* TAB 1: INDIVIDUAL LEADERBOARD */}
      {activeTab === 'individual' && (
        <div className="space-y-6">
          {/* Top 3 Podium Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {/* RANK 2 (Silver) */}
            <div className="order-2 md:order-1 flex flex-col justify-end">
              <div 
                className="relative rounded-3xl p-5 border shadow-xl flex flex-col items-center text-center transition-transform hover:-translate-y-1"
                style={{
                  backgroundColor: 'var(--card-bg, #FFFFFF)',
                  borderColor: 'var(--border-main, #E2E8F0)'
                }}
              >
                <div className="w-10 h-10 rounded-full bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black text-sm flex items-center justify-center -mt-9 shadow-md border-2 border-white dark:border-slate-800">
                  #2
                </div>
                <div className="w-20 h-20 rounded-full my-3 p-1 border-4 border-slate-300 dark:border-slate-600 shadow-md bg-gradient-to-tr from-slate-200 to-slate-400 flex items-center justify-center text-2xl font-black text-slate-700">
                  BP
                </div>
                <h3 className="font-bold text-base font-display text-[var(--text-main)]">{top3[1].name}</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 mt-1 border border-teal-500/20">
                  {top3[1].title}
                </span>
                <span className="text-xs text-[var(--text-muted)] mt-1 font-semibold">{top3[1].section} ({top3[1].pt})</span>
                <div className="mt-4 pt-3 border-t border-[var(--border-main)] w-full flex justify-around text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Season XP</span>
                    <span className="font-black text-sm text-[var(--text-main)]">{top3[1].seasonXp}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">KTA</span>
                    <span className="font-black text-sm text-emerald-600">{top3[1].ktaCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Lencana</span>
                    <span className="font-black text-sm text-amber-500">{top3[1].badgesCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RANK 1 (Gold - Center & Elevated) */}
            <div className="order-1 md:order-2 flex flex-col justify-end">
              <div 
                className="relative rounded-3xl p-6 border-2 border-amber-500/60 shadow-2xl flex flex-col items-center text-center bg-gradient-to-b from-amber-500/10 via-[var(--card-bg)] to-[var(--card-bg)] transition-transform hover:-translate-y-1.5"
              >
                {/* Crown badge */}
                <div className="absolute -top-6 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-950 font-black text-base flex items-center justify-center shadow-xl shadow-amber-500/40 border-2 border-white">
                    <Crown className="w-6 h-6 text-slate-950" />
                  </div>
                </div>
                
                <div className="w-24 h-24 rounded-full my-4 p-1.5 border-4 border-amber-400 shadow-xl shadow-amber-500/30 bg-gradient-to-tr from-amber-300 via-amber-400 to-orange-500 flex items-center justify-center text-3xl font-black text-slate-950 ring-4 ring-amber-400/30">
                  RH
                </div>
                <h3 className="font-black text-lg font-display text-[var(--text-main)]">{top3[0].name}</h3>
                <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-500 text-slate-950 mt-1 shadow-xs uppercase tracking-wider">
                  {top3[0].title}
                </span>
                <span className="text-xs text-[var(--text-muted)] mt-1 font-semibold">{top3[0].section} ({top3[0].pt})</span>
                
                <div className="mt-4 pt-3 border-t border-[var(--border-main)] w-full flex justify-around text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Season XP</span>
                    <span className="font-black text-base text-amber-600 dark:text-amber-400">{top3[0].seasonXp}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Inspeksi</span>
                    <span className="font-black text-base text-teal-600">{top3[0].inspectionCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Lencana</span>
                    <span className="font-black text-base text-amber-500">{top3[0].badgesCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RANK 3 (Bronze) */}
            <div className="order-3 flex flex-col justify-end">
              <div 
                className="relative rounded-3xl p-5 border shadow-xl flex flex-col items-center text-center transition-transform hover:-translate-y-1"
                style={{
                  backgroundColor: 'var(--card-bg, #FFFFFF)',
                  borderColor: 'var(--border-main, #E2E8F0)'
                }}
              >
                <div className="w-10 h-10 rounded-full bg-amber-700/80 text-white font-black text-sm flex items-center justify-center -mt-9 shadow-md border-2 border-white dark:border-slate-800">
                  #3
                </div>
                <div className="w-20 h-20 rounded-full my-3 p-1 border-4 border-amber-600/50 shadow-md bg-gradient-to-tr from-amber-700/40 to-amber-900/60 flex items-center justify-center text-2xl font-black text-amber-700 dark:text-amber-300">
                  DL
                </div>
                <h3 className="font-bold text-base font-display text-[var(--text-main)]">{top3[2].name}</h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 mt-1 border border-teal-500/20">
                  {top3[2].title}
                </span>
                <span className="text-xs text-[var(--text-muted)] mt-1 font-semibold">{top3[2].section} ({top3[2].pt})</span>
                <div className="mt-4 pt-3 border-t border-[var(--border-main)] w-full flex justify-around text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Season XP</span>
                    <span className="font-black text-sm text-[var(--text-main)]">{top3[2].seasonXp}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">KTA</span>
                    <span className="font-black text-sm text-emerald-600">{top3[2].ktaCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Lencana</span>
                    <span className="font-black text-sm text-amber-500">{top3[2].badgesCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Ranks 4 to 10 Table / Cards */}
          <div 
            className="rounded-3xl border shadow-md overflow-hidden transition-colors"
            style={{
              backgroundColor: 'var(--card-bg, #FFFFFF)',
              borderColor: 'var(--border-main, #E2E8F0)'
            }}
          >
            <div className="p-4 border-b border-[var(--border-main)] flex items-center justify-between">
              <h3 className="font-bold text-sm font-display flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <Users className="w-4 h-4 text-teal-500" />
                Klasemen Personil Lainnya
              </h3>
              <span className="text-xs text-[var(--text-muted)]">Diperbarui real-time</span>
            </div>

            <div className="divide-y divide-[var(--border-main)]">
              {restUsers.map(user => {
                const isCurrentUser = user.rank === 4;
                return (
                  <div 
                    key={user.rank}
                    className={`flex items-center justify-between p-4 transition-colors ${
                      isCurrentUser 
                        ? 'bg-teal-500/10 border-l-4 border-teal-500 font-medium' 
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-7 text-center font-black text-sm text-[var(--text-muted)]">
                        #{user.rank}
                      </span>
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-[var(--text-main)] border border-[var(--border-main)]">
                          {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        {user.frame === 'golden_halo' && (
                          <div className="absolute -inset-0.5 rounded-full border-2 border-amber-400 ring-2 ring-amber-400/40" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm truncate" style={{ color: 'var(--text-main)' }}>
                            {user.name}
                          </span>
                          {isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-teal-500 text-white leading-tight">
                              Anda
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                          <span>{user.section}</span>
                          <span>•</span>
                          <span className="text-teal-600 dark:text-teal-400 font-semibold">{user.title}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-4">
                      <div className="hidden sm:block text-xs">
                        <span className="text-[10px] text-[var(--text-muted)] block">Inspeksi / KTA</span>
                        <span className="font-semibold" style={{ color: 'var(--text-main)' }}>
                          {user.inspectionCount} / {user.ktaCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-base font-black text-teal-600 dark:text-teal-400 block font-display leading-tight">
                          {user.seasonXp} XP
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] block">
                          Level {user.level}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SECTIONS LEADERBOARD */}
      {activeTab === 'sections' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-800 dark:text-teal-200 flex items-center gap-3">
            <Info className="w-5 h-5 shrink-0 text-teal-600 dark:text-teal-400" />
            <span>
              Peringkat section dihitung berdasarkan <strong>Rata-rata Poin XP per Karyawan</strong> dan <strong>Persentase Kepatuhan K3 & Inspeksi</strong> untuk menjaga keadilan antar divisi besar dan kecil.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {mockSections.map(sec => (
              <div 
                key={sec.rank}
                className="p-5 rounded-3xl border shadow-md transition-all hover:shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                style={{
                  backgroundColor: 'var(--card-bg, #FFFFFF)',
                  borderColor: 'var(--border-main, #E2E8F0)'
                }}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-inner ${
                    sec.rank === 1 
                      ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-400/30' 
                      : sec.rank === 2
                      ? 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
                      : 'bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)]'
                  }`}>
                    #{sec.rank}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base font-display" style={{ color: 'var(--text-main)' }}>
                        {sec.name}
                      </h3>
                      {sec.rank === 1 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          Juara Bertahan
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      {sec.totalPersonnel} Personil Aktif · {sec.totalInspections} Formulir Inspeksi · {sec.totalKta} Temuan KTA
                    </span>
                  </div>
                </div>

                <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-[var(--border-main)]">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Kepatuhan K3</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="w-24 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full rounded-full" 
                          style={{ width: `${sec.safetyCompliance}%` }} 
                        />
                      </div>
                      <span className="text-xs font-black text-emerald-600">{sec.safetyCompliance}%</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-bold block">Rata-rata XP</span>
                    <span className="text-lg font-black text-teal-600 dark:text-teal-400 font-display">
                      {sec.avgXp} XP
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BADGES SHOWCASE */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          {/* Badge Filter Controls */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBadgeFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  badgeFilter === 'all'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'
                }`}
              >
                Semua Lencana ({PRESET_BADGES.length})
              </button>
              <button
                onClick={() => setBadgeFilter('unlocked')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  badgeFilter === 'unlocked'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'
                }`}
              >
                Terkoleksi ({PRESET_BADGES.filter(b => b.isUnlocked).length})
              </button>
              <button
                onClick={() => setBadgeFilter('locked')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  badgeFilter === 'locked'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'
                }`}
              >
                Belum Terbuka ({PRESET_BADGES.filter(b => !b.isUnlocked).length})
              </button>
            </div>
          </div>

          {/* Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredBadges.map(badge => {
              const rarityColor = {
                Common: 'text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800',
                Rare: 'text-blue-600 dark:text-blue-300 border-blue-400 bg-blue-500/10',
                Epic: 'text-purple-600 dark:text-purple-300 border-purple-400 bg-purple-500/10',
                Legendary: 'text-amber-500 border-amber-400 bg-amber-500/15 shadow-md shadow-amber-500/20'
              }[badge.rarity];

              return (
                <div
                  key={badge.id}
                  onClick={() => setSelectedBadge(badge)}
                  className={`p-5 rounded-3xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    badge.isUnlocked 
                      ? 'shadow-md hover:scale-[1.02] hover:shadow-xl' 
                      : 'opacity-65 grayscale hover:grayscale-0'
                  }`}
                  style={{
                    backgroundColor: 'var(--card-bg, #FFFFFF)',
                    borderColor: badge.isUnlocked ? 'var(--border-main, #E2E8F0)' : 'var(--border-main, #CBD5E1)'
                  }}
                >
                  {badge.isUnlocked && (
                    <div className="absolute top-3 right-3 text-emerald-500">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  )}
                  {!badge.isUnlocked && (
                    <div className="absolute top-3 right-3 text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}

                  <div>
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner bg-slate-100 dark:bg-slate-800/80 mb-3">
                      {badge.icon}
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${rarityColor}`}>
                        {badge.rarity}
                      </span>
                      <span className="text-[10px] font-bold text-amber-500">+{badge.xpReward} XP</span>
                    </div>
                    <h4 className="font-bold text-sm font-display leading-snug" style={{ color: 'var(--text-main)' }}>
                      {badge.title}
                    </h4>
                    <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
                      {badge.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-main)] text-[11px] text-[var(--text-muted)]">
                    <span className="font-semibold block text-[10px] uppercase text-teal-600 dark:text-teal-400">Kriteria:</span>
                    <span className="truncate block">{badge.criteria}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMIZATION & HIDDEN ITEMS PLAYGROUND */}
      {activeTab === 'customization' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-3">
            <Sparkles className="w-5 h-5 shrink-0 text-amber-600" />
            <span>
              <strong>Fitur Interaktif Presentasi:</strong> Pilih gelar dan bingkai avatar di bawah ini, lalu terapkan untuk melihat perubahannya langsung pada kartu identitas profil karyawan Anda!
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Real-time Preview Card */}
            <div 
              className="lg:col-span-1 rounded-3xl p-6 border shadow-xl flex flex-col items-center text-center space-y-4 relative overflow-hidden"
              style={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)'
              }}
            >
              <div className="w-full h-24 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-700 p-3 flex items-start justify-between text-white shadow-inner">
                <span className="text-[10px] font-black uppercase tracking-wider bg-black/30 px-2 py-0.5 rounded backdrop-blur-xs">
                  Pratinjau Profil
                </span>
                <Crown className="w-4 h-4 text-amber-300" />
              </div>

              {/* Avatar with selected frame */}
              <div className="relative -mt-12">
                <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xl text-[var(--text-main)] shadow-xl overflow-hidden border-2 border-white dark:border-slate-800">
                  {inspectorName ? inspectorName.slice(0, 2).toUpperCase() : 'AF'}
                </div>
                {userFrame === 'golden_halo' && (
                  <div className="absolute -inset-1 rounded-full border-2 border-amber-400 ring-4 ring-amber-400/40 animate-pulse pointer-events-none" />
                )}
                {userFrame === 'cyber_neon' && (
                  <div className="absolute -inset-1 rounded-full border-2 border-teal-400 ring-4 ring-teal-400/50 pointer-events-none" />
                )}
                {userFrame === 'emerald_aurora' && (
                  <div className="absolute -inset-1 rounded-full border-2 border-emerald-400 ring-4 ring-emerald-400/40 pointer-events-none" />
                )}
              </div>

              <div>
                <h3 className="font-bold text-lg font-display" style={{ color: 'var(--text-main)' }}>
                  {inspectorName || 'Ahmad Fauzi'}
                </h3>
                <div className="mt-1">
                  <span className="text-xs font-black px-3 py-1 rounded-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-xs">
                    {userTitle}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">
                  NIK: {inspectorNik || '02D25000055'} · {userProfile?.section || 'Laboratory'} ({userProfile?.pt || 'TBP'})
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border-main)] w-full flex justify-around text-xs">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Tingkat Level</span>
                  <span className="font-black text-sm text-[var(--text-main)]">Level 18</span>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block">Total Lencana</span>
                  <span className="font-black text-sm text-amber-500">9 Badge</span>
                </div>
              </div>
            </div>

            {/* Customization Controls */}
            <div 
              className="lg:col-span-2 rounded-3xl p-6 border shadow-xl space-y-6"
              style={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)'
              }}
            >
              {/* 1. Pilih Gelar */}
              <div>
                <h4 className="font-bold text-sm font-display mb-3 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                  <Award className="w-4 h-4 text-teal-500" />
                  1. Pilih Gelar Prestasi (Title)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_TITLES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => handleSaveCustomization(t.label, userFrame)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        userTitle === t.label
                          ? 'border-teal-500 bg-teal-500/10 ring-2 ring-teal-500/20'
                          : 'border-[var(--border-main)] hover:border-teal-500/50'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs block text-[var(--text-main)]">{t.label}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">{t.desc}</span>
                      </div>
                      {userTitle === t.label && <Check className="w-4 h-4 text-teal-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Pilih Bingkai Avatar */}
              <div>
                <h4 className="font-bold text-sm font-display mb-3 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                  <Crown className="w-4 h-4 text-amber-500" />
                  2. Pilih Bingkai Avatar (Frame)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_FRAMES.map(f => (
                    <button
                      key={f.id}
                      onClick={() => handleSaveCustomization(userTitle, f.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        userFrame === f.id
                          ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/20'
                          : 'border-[var(--border-main)] hover:border-amber-500/50'
                      }`}
                    >
                      <div>
                        <span className="font-bold text-xs block text-[var(--text-main)]">{f.label}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">Efek visual aktif</span>
                      </div>
                      {userFrame === f.id && <Check className="w-4 h-4 text-amber-600" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Hidden Item Demo Launcher */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="font-bold text-xs text-[var(--text-main)]">Simulasi Hidden Item (Easter Egg)</span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    Uji coba bagaimana karyawan menemukan rahasia dan membuka item langka.
                  </p>
                </div>
                <Button
                  onClick={handleUnlockEasterEgg}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 py-2 rounded-xl shrink-0 cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Trigger Temukan Rahasia
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Badge Detail Modal */}
      <AnimatePresence>
        {selectedBadge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl p-6 border shadow-2xl relative"
              style={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)'
              }}
            >
              <div className="text-center space-y-3">
                <div className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-4xl shadow-lg bg-slate-100 dark:bg-slate-800">
                  {selectedBadge.icon}
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600">
                    {selectedBadge.rarity} · +{selectedBadge.xpReward} XP
                  </span>
                  <h3 className="text-xl font-bold font-display mt-2" style={{ color: 'var(--text-main)' }}>
                    {selectedBadge.title}
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {selectedBadge.description}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-[var(--border-main)] text-left text-xs space-y-1">
                  <span className="font-bold text-teal-600 dark:text-teal-400 block text-[10px] uppercase">
                    Syarat Pencapaian:
                  </span>
                  <p className="text-[var(--text-main)] font-medium">
                    {selectedBadge.criteria}
                  </p>
                  {selectedBadge.isUnlocked && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block pt-1">
                      ✓ Telah terbuka pada {selectedBadge.unlockedAt}
                    </span>
                  )}
                </div>

                <Button
                  onClick={() => setSelectedBadge(null)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Tutup Detail Lencana
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Easter Egg Celebration Toast Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed inset-x-4 top-20 z-[90] max-w-md mx-auto p-4 rounded-3xl bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 text-white shadow-2xl border-2 border-white/40 flex items-center gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl shrink-0 shadow-inner animate-bounce">
              🦉
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
                Hidden Item Unlocked!
              </span>
              <h4 className="font-black text-sm">Gelar: "Nocturnal Operator"</h4>
              <p className="text-[11px] text-purple-100">Item rahasia kini tersedia di menu kustomisasi!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
