export interface AchievementTier {
  tierLevel: 1 | 2 | 3 | 4;
  tierName: string; // 'Tier I (Bronze)', 'Tier II (Silver)', 'Tier III (Gold)', 'Tier IV (Master)'
  requiredCount: number;
  xpReward: number;
  titleReward: string; // e.g. '[Frontline Scout]'
  badgeColor: string;
}

export interface AchievementBranch {
  id: string;
  code: string;
  name: string;
  category: 'safety' | 'operational' | 'community' | 'special';
  icon: string;
  unit: string; // e.g. 'Laporan', 'Inspeksi', 'Status CS', 'Saran'
  description: string;
  tiers: AchievementTier[];
}

export const TIERED_ACHIEVEMENTS: AchievementBranch[] = [
  // 1. Pengintaian Bahaya K3 (kta_reports)
  {
    id: 'ach_kta',
    code: 'BRANCH_KTA',
    name: 'Hazard Recon Operative',
    category: 'safety',
    icon: '🛡️',
    unit: 'Laporan KTA/TTA',
    description: 'Konsistensi mendeteksi dan melaporkan potensi bahaya KTA/TTA di area kerja.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 5, xpReward: 150, titleReward: 'Frontline Scout', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 25, xpReward: 350, titleReward: 'Hazard Observer', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 60, xpReward: 750, titleReward: 'Vanguard Sentinel', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 120, xpReward: 1500, titleReward: 'Supreme Hazard Hunter', badgeColor: 'border-cyan-400 bg-cyan-500/30 text-cyan-200 shadow-cyan-500/40 animate-pulse' }
    ]
  },

  // 2. Inspeksi & Patroli Rutin (inspections)
  {
    id: 'ach_inspection',
    code: 'BRANCH_INSPECTION',
    name: 'Field Inspection Protocol',
    category: 'operational',
    icon: '📋',
    unit: 'Formulir Inspeksi',
    description: 'Menyelesaikan checklist inspeksi keselamatan rutin (APD, Umum, Tangga, P3K).',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 10, xpReward: 200, titleReward: 'Patrol Officer', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 30, xpReward: 450, titleReward: 'Chief Inspector', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 60, xpReward: 850, titleReward: 'Master of Inspection', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 100, xpReward: 1800, titleReward: 'Grand Field Marshal', badgeColor: 'border-rose-400 bg-rose-500/30 text-rose-200 shadow-rose-500/40 animate-pulse' }
    ]
  },

  // 3. Dedikasi Cuti Site / Menjual Cuti Roster (roster status CS)
  {
    id: 'ach_cs',
    code: 'BRANCH_CS',
    name: 'Site Guardian (Cuti Site)',
    category: 'special',
    icon: '⛺',
    unit: 'Status CS Roster',
    description: 'Penghormatan tertinggi bagi personil yang menjual hak cuti roster demi menjaga site.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 1, xpReward: 300, titleReward: 'Site Guardian', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 3, xpReward: 600, titleReward: 'Iron Defender', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 6, xpReward: 1200, titleReward: 'Unwavering Stalwart', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 10, xpReward: 2500, titleReward: 'Living Bastion', badgeColor: 'border-indigo-400 bg-indigo-500/30 text-indigo-200 shadow-indigo-500/40 animate-pulse' }
    ]
  },

  // 4. Inovasi & Masukan Pengembangan Portal (app_feedbacks)
  {
    id: 'ach_feedback',
    code: 'BRANCH_FEEDBACK',
    name: 'Portal Innovation Strategist',
    category: 'community',
    icon: '💡',
    unit: 'Saran & Masukan',
    description: 'Mengirimkan ide, feedback, dan usulan penyempurnaan sistem PrepLab Portal.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 1, xpReward: 150, titleReward: 'System Contributor', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 5, xpReward: 350, titleReward: 'System Strategist', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 15, xpReward: 750, titleReward: 'Chief Innovation Officer', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 30, xpReward: 1500, titleReward: 'Supreme Architect', badgeColor: 'border-emerald-400 bg-emerald-500/30 text-emerald-200 shadow-emerald-500/40 animate-pulse' }
    ]
  },

  // 5. Quotes Komunitas & Semangat Kerja (community_quotes)
  {
    id: 'ach_quotes',
    code: 'BRANCH_QUOTES',
    name: 'Voice of the Legion',
    category: 'community',
    icon: '💬',
    unit: 'Quotes Inspiratif',
    description: 'Menerbitkan kata-kata motivasi dan inspirasi keselamatan untuk rekan tim.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 1, xpReward: 120, titleReward: 'Morale Officer', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 5, xpReward: 300, titleReward: 'Propaganda Commander', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 15, xpReward: 650, titleReward: 'Voice of the Legion', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 30, xpReward: 1400, titleReward: 'Grand Philosopher', badgeColor: 'border-fuchsia-400 bg-fuchsia-500/30 text-fuchsia-200 shadow-fuchsia-500/40 animate-pulse' }
    ]
  },

  // 6. Pembuat Tema Portal (user_themes)
  {
    id: 'ach_themes',
    code: 'BRANCH_THEMES',
    name: 'Camouflage Architect',
    category: 'community',
    icon: '🎨',
    unit: 'Tema Kustom',
    description: 'Merancang dan membagikan tema palet warna tampilan portal sendiri.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 1, xpReward: 150, titleReward: 'Camouflage Specialist', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 3, xpReward: 350, titleReward: 'Visual Architect', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 8, xpReward: 700, titleReward: 'Chromatic Artisan', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 15, xpReward: 1500, titleReward: 'Aesthetic Warlord', badgeColor: 'border-violet-400 bg-violet-500/30 text-violet-200 shadow-violet-500/40 animate-pulse' }
    ]
  },

  // 7. Komunikasi & Buletin Kerja (bulletin_comments & posts)
  {
    id: 'ach_bulletin',
    code: 'BRANCH_BULLETIN',
    name: 'Field Intelligence & Bulletin',
    category: 'community',
    icon: '📰',
    unit: 'Aksi Diskusi Buletin',
    description: 'Menerbitkan topik buletin atau mengirimkan komentar pembaruan progres kerja.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 5, xpReward: 150, titleReward: 'Field Correspondent', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 25, xpReward: 400, titleReward: 'Intelligence Operative', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 75, xpReward: 800, titleReward: 'Communications Chief', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 150, xpReward: 1600, titleReward: 'Information Warlord', badgeColor: 'border-sky-400 bg-sky-500/30 text-sky-200 shadow-sky-500/40 animate-pulse' }
    ]
  },

  // 8. Pemateri Safety Briefing P5M (p5m_schedules speaker)
  {
    id: 'ach_p5m_speaker',
    code: 'BRANCH_P5M_SPEAKER',
    name: 'Briefing Oratory Leader',
    category: 'operational',
    icon: '🎤',
    unit: 'Sesi Briefing',
    description: 'Membawakan materi safety talk P5M di hadapan rekan regu shift.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 3, xpReward: 200, titleReward: 'Briefing Officer', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 10, xpReward: 450, titleReward: 'Briefing Commander', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 25, xpReward: 900, titleReward: 'Supreme Orator', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 50, xpReward: 1800, titleReward: 'Voice of Command', badgeColor: 'border-teal-400 bg-teal-500/30 text-teal-200 shadow-teal-500/40 animate-pulse' }
    ]
  },

  // 9. Temuan Kritis Inspeksi (inspections with findings/defects)
  {
    id: 'ach_defects',
    code: 'BRANCH_DEFECTS',
    name: 'Eagle Eye Spotter',
    category: 'safety',
    icon: '🔍',
    unit: 'Temuan Tidak Aman',
    description: 'Menemukan dan mencatat ketidaksesuaian kritis alat saat inspeksi (bukan centang hijau kosong).',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 3, xpReward: 200, titleReward: 'Eagle Eye Scout', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 10, xpReward: 450, titleReward: 'Vigilant Hawkeye', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 25, xpReward: 900, titleReward: 'Master Auditor', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 50, xpReward: 1800, titleReward: 'Omnipresent Watcher', badgeColor: 'border-yellow-400 bg-yellow-500/30 text-yellow-200 shadow-yellow-500/40 animate-pulse' }
    ]
  },

  // 10. Kuis K3 Sempurna (quiz_scores nilai 100)
  {
    id: 'ach_quiz',
    code: 'BRANCH_QUIZ',
    name: 'Tactical Marksman of Safety',
    category: 'operational',
    icon: '🎯',
    unit: 'Kuis Nilai 100',
    description: 'Meraih skor sempurna 100% pada evaluasi berkala pemahaman SOP dan K3.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 1, xpReward: 250, titleReward: 'Tactical Marksman', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 3, xpReward: 500, titleReward: 'Sharpshooter', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 6, xpReward: 1000, titleReward: 'Elite Sniper of Safety', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 12, xpReward: 2000, titleReward: 'Flawless Strategist', badgeColor: 'border-rose-400 bg-rose-500/30 text-rose-200 shadow-rose-500/40 animate-pulse' }
    ]
  },

  // 11. Operasi Khusus Shift Malam (Shift 3 pukul 01:00 - 04:00)
  {
    id: 'ach_night',
    code: 'BRANCH_NIGHT',
    name: 'Night Recon Operative',
    category: 'special',
    icon: '🦉',
    unit: 'Tugas Shift Malam',
    description: 'Dedikasi tinggi menjalankan dan menyelesaikan tugas di shift malam rawan lelah (01:00 - 04:00).',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 5, xpReward: 250, titleReward: 'Night Recon', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 20, xpReward: 550, titleReward: 'Shadow Operative', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 50, xpReward: 1100, titleReward: 'Phantom Sentinel', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 100, xpReward: 2200, titleReward: 'Lord of the Eclipse', badgeColor: 'border-purple-400 bg-purple-500/30 text-purple-200 shadow-purple-500/40 animate-pulse' }
    ]
  },

  // 12. Juara Musim Leaderboard (Peringkat 1 Bulanan)
  {
    id: 'ach_season',
    code: 'BRANCH_SEASON',
    name: 'Hall of Fame Champion',
    category: 'special',
    icon: '👑',
    unit: 'Juara 1 Musim',
    description: 'Menutup musim bulanan di Peringkat #1 tertinggi klasemen poin PrepLab Hall of Fame.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 1, xpReward: 1000, titleReward: 'Brigade Commander', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 3, xpReward: 2000, titleReward: 'Legion Warlord', badgeColor: 'border-rose-500 bg-rose-500/30 text-rose-200 shadow-rose-500/40' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 6, xpReward: 3500, titleReward: 'Undefeated Overlord', badgeColor: 'border-amber-300 bg-gradient-to-r from-red-600/30 to-amber-500/30 text-amber-200 shadow-amber-400/50 animate-pulse' }
    ]
  }
];

// Helper: Calculate progress and unlocked tiers for a branch given current count
export function calculateBranchProgress(branch: AchievementBranch, currentCount: number): {
  currentTier: AchievementTier | null;
  nextTier: AchievementTier | null;
  progressCount: number;
  targetCount: number;
  progressPercent: number;
  unlockedTitles: string[];
} {
  const unlocked = branch.tiers.filter(t => currentCount >= t.requiredCount);
  const currentTier = unlocked.length > 0 ? unlocked[unlocked.length - 1] : null;
  const nextTier = branch.tiers.find(t => currentCount < t.requiredCount) || null;

  let progressCount = currentCount;
  let targetCount = nextTier ? nextTier.requiredCount : branch.tiers[branch.tiers.length - 1].requiredCount;
  let progressPercent = nextTier ? Math.min(100, Math.round((currentCount / nextTier.requiredCount) * 100)) : 100;

  return {
    currentTier,
    nextTier,
    progressCount,
    targetCount,
    progressPercent,
    unlockedTitles: unlocked.map(t => t.titleReward)
  };
}

// Available Dynamic Avatar Frames & Exclusive Achievement Cosmetics
export interface CustomAvatarFrame {
  id: string;
  label: string;
  ringColor: string;
  effect: string;
  sourceAchId?: string; // ID cabang achievement yang membuka bingkai ini
  sourceAchName?: string;
  isExclusive?: boolean;
}

export const AVAILABLE_FRAMES: CustomAvatarFrame[] = [
  // Standar / Bebas Dipakai
  { id: 'default', label: 'Default Minimalist', ringColor: 'border-slate-300 dark:border-slate-700', effect: '' },
  { id: 'golden_halo', label: 'Golden Flame Halo', ringColor: 'border-amber-400 ring-4 ring-amber-400/50 shadow-lg shadow-amber-500/30', effect: 'animate-pulse' },
  { id: 'cyber_neon', label: 'Cyber Teal Neon', ringColor: 'border-teal-400 ring-4 ring-teal-400/50 shadow-lg shadow-teal-500/40', effect: '' },
  { id: 'emerald_aurora', label: 'Emerald Aurora', ringColor: 'border-emerald-400 ring-4 ring-emerald-400/40 shadow-lg shadow-emerald-500/30', effect: '' },
  { id: 'obsidian_dark', label: 'Obsidian Stealth', ringColor: 'border-slate-900 dark:border-white/80 ring-2 ring-slate-500/30', effect: '' },
  { id: 'commander_crimson', label: 'Commander Crimson', ringColor: 'border-rose-500 ring-4 ring-rose-500/50 shadow-xl shadow-rose-600/40', effect: 'animate-pulse' },

  // Kosmetik Eksklusif Cabang Achievement (Hanya Terbuka Saat Achievement Diungkap)
  { 
    id: 'frame_biohazard_neon', 
    label: 'Biohazard Warning Ring', 
    ringColor: 'border-yellow-400 ring-4 ring-yellow-400/60 shadow-[0_0_18px_rgba(250,204,21,0.6)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_kta',
    sourceAchName: 'Hazard Recon Operative',
    isExclusive: true
  },
  { 
    id: 'frame_grand_marshal', 
    label: 'Grand Field Marshal Laurel', 
    ringColor: 'border-amber-400 ring-4 ring-amber-400/60 shadow-[0_0_18px_rgba(251,191,36,0.6)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_inspection',
    sourceAchName: 'Field Inspection Protocol',
    isExclusive: true
  },
  { 
    id: 'frame_living_bastion', 
    label: 'Heavy Armored Bastion', 
    ringColor: 'border-indigo-400 ring-4 ring-indigo-500/60 shadow-[0_0_18px_rgba(99,102,241,0.6)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_cs',
    sourceAchName: 'Site Guardian (Cuti Site)',
    isExclusive: true
  },
  { 
    id: 'frame_cyber_matrix', 
    label: 'Holographic Matrix Cyber', 
    ringColor: 'border-emerald-400 ring-4 ring-emerald-400/60 shadow-[0_0_18px_rgba(52,211,153,0.6)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_feedback',
    sourceAchName: 'Portal Innovation Strategist',
    isExclusive: true
  },
  { 
    id: 'frame_cosmic_nebula', 
    label: 'Cosmic Violet Nebula', 
    ringColor: 'border-fuchsia-400 ring-4 ring-fuchsia-500/60 shadow-[0_0_18px_rgba(217,70,239,0.6)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_quotes',
    sourceAchName: 'Voice of the Legion',
    isExclusive: true
  },
  { 
    id: 'frame_prismatic_rgb', 
    label: 'Prismatic Chroma RGB', 
    ringColor: 'border-pink-400 ring-4 ring-violet-500/60 shadow-[0_0_20px_rgba(236,72,153,0.6)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_themes',
    sourceAchName: 'Camouflage Architect',
    isExclusive: true
  },
  { 
    id: 'frame_tactical_radar', 
    label: 'Tactical Radar Scanner', 
    ringColor: 'border-sky-400 ring-4 ring-sky-400/60 shadow-[0_0_18px_rgba(56,189,248,0.6)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_bulletin',
    sourceAchName: 'Field Intelligence & Bulletin',
    isExclusive: true
  },
  { 
    id: 'frame_sonic_wave', 
    label: 'Sonic Pulse Orator', 
    ringColor: 'border-teal-400 ring-4 ring-teal-400/60 shadow-[0_0_18px_rgba(45,212,191,0.6)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_p5m_speaker',
    sourceAchName: 'Briefing Oratory Leader',
    isExclusive: true
  },
  { 
    id: 'frame_eagle_target', 
    label: 'Eagle Eye Golden Scope', 
    ringColor: 'border-amber-300 ring-4 ring-amber-400/70 shadow-[0_0_20px_rgba(245,158,11,0.7)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_defects',
    sourceAchName: 'Eagle Eye Spotter',
    isExclusive: true
  },
  { 
    id: 'frame_laser_crosshair', 
    label: 'Precision Laser Marksman', 
    ringColor: 'border-rose-500 ring-4 ring-rose-500/70 shadow-[0_0_20px_rgba(244,63,94,0.7)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_quiz',
    sourceAchName: 'Tactical Marksman of Safety',
    isExclusive: true
  },
  { 
    id: 'frame_shadow_eclipse', 
    label: 'Abyssal Void Eclipse', 
    ringColor: 'border-purple-600 ring-4 ring-indigo-900/80 shadow-[0_0_20px_rgba(147,51,234,0.7)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_night',
    sourceAchName: 'Night Recon Operative',
    isExclusive: true
  },
  { 
    id: 'frame_mythic_crown', 
    label: 'Mythic Flaming Crown', 
    ringColor: 'border-yellow-300 ring-4 ring-amber-500/90 shadow-[0_0_25px_rgba(251,191,36,0.9)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_season',
    sourceAchName: 'Hall of Fame Champion',
    isExclusive: true
  }
];

export function getFrameById(frameId?: string | null): CustomAvatarFrame {
  const found = AVAILABLE_FRAMES.find(f => f.id === frameId);
  return found || AVAILABLE_FRAMES[0];
}
