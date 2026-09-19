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
  isHidden?: boolean; // True untuk pencapaian rahasia (Cuti Site, Shift Malam, Juara Season)
  hiddenHint?: string; // Petunjuk saat pencapaian masih terenkripsi/terkunci
  howToGet?: string; // Kriteria & langkah task rutin di portal untuk non-hidden achievements
  tiers: AchievementTier[];
}

export interface ExpSourceDefinition {
  key: string;
  name: string;
  category: 'safety' | 'operational' | 'community' | 'special';
  icon: string;
  unit: string;
  weight: number;
  description: string;
}

export const ACTION_XP_WEIGHTS = {
  KTA: 35,
  INSPECTION: 50,
  DEFECTS: 60, // Penuntasan Temuan Hasil Inspeksi
  WO_CREATE: 40,
  WO_RESOLVE: 60,
  CS: 0, // Cuti Site gives 0 EXP (pure hidden achievement & titles)
  FEEDBACK: 100,
  QUOTES: 100,
  THEMES: 100,
  BULLETIN: 10,
  P5M_SPEAKER: 60,
  QUIZ_100: 250,
  NIGHT_SHIFT: 50,
  DAWN_SHIFT: 50,
  WEEKEND_SHIFT: 50
};

export const EXP_SOURCES_CONFIG: ExpSourceDefinition[] = [
  {
    key: 'KTA',
    name: 'Pelaporan Bahaya KTA / TTA',
    category: 'safety',
    icon: '🛡️',
    unit: 'Laporan',
    weight: 35,
    description: 'Pelaporan temuan Kondisi / Tindakan Tidak Aman di area kerja'
  },
  {
    key: 'INSPECTION',
    name: 'Inspeksi & Patroli Rutin K3',
    category: 'safety',
    icon: '📋',
    unit: 'Inspeksi',
    weight: 50,
    description: 'Pengisian formulir checklist inspeksi APD, Kotak P3K, Tangga, dll.'
  },
  {
    key: 'DEFECTS',
    name: 'Penuntasan Temuan Hasil Inspeksi',
    category: 'safety',
    icon: '🎯',
    unit: 'Temuan Tuntas',
    weight: 60,
    description: 'Closing tiket temuan hasil inspeksi dengan bukti foto perbaikan fisik'
  },
  {
    key: 'WO_CREATE',
    name: 'Pembuatan Tiket Work Order',
    category: 'operational',
    icon: '📝',
    unit: 'Tiket WO',
    weight: 40,
    description: 'Pengajuan tiket perawatan dan perbaikan peralatan/mesin operasional'
  },
  {
    key: 'WO_RESOLVE',
    name: 'Penyelesaian Work Order (Teknisi)',
    category: 'operational',
    icon: '⚙️',
    unit: 'WO Selesai',
    weight: 60,
    description: 'Tindakan perbaikan dan penuntasan work order oleh teknisi lapangan'
  },
  {
    key: 'FEEDBACK',
    name: 'Ide Inovasi & Masukan Sistem',
    category: 'community',
    icon: '💡',
    unit: 'Masukan',
    weight: 100,
    description: 'Pengiriman evaluasi, saran penyempurnaan, dan ide inovasi portal'
  },
  {
    key: 'QUOTES',
    name: 'Safety Quotes & Motivasi Harian',
    category: 'community',
    icon: '💬',
    unit: 'Quotes',
    weight: 100,
    description: 'Penyusunan kata mutiara motivasi dan pesan keselamatan harian'
  },
  {
    key: 'THEMES',
    name: 'Pengajuan Tema K3 Bulanan',
    category: 'community',
    icon: '🎨',
    unit: 'Tema K3',
    weight: 100,
    description: 'Partisipasi pengajuan tema kampanye keselamatan kerja bulanan'
  },
  {
    key: 'BULLETIN',
    name: 'Diskusi & Baca Buletin K3',
    category: 'community',
    icon: '📰',
    unit: 'Komentar',
    weight: 10,
    description: 'Membaca dan berdiskusi pada papan artikel buletin K3'
  },
  {
    key: 'P5M_SPEAKER',
    name: 'Pemateri Briefing P5M',
    category: 'operational',
    icon: '🎙️',
    unit: 'Sesi P5M',
    weight: 60,
    description: 'Menjadi narasumber/pemateri pada sesi Pembicaraan 5 Menit (P5M)'
  },
  {
    key: 'QUIZ_100',
    name: 'Kuis K3 Nilai Sempurna (100%)',
    category: 'safety',
    icon: '🎓',
    unit: 'Kuis 100%',
    weight: 250,
    description: 'Menyelesaikan kuis evaluasi pemahaman SOP K3 dengan skor 100%'
  },
  {
    key: 'NIGHT_SHIFT',
    name: 'Operasional Shift Malam (22:00-06:00)',
    category: 'special',
    icon: '🌙',
    unit: 'Shift Malam',
    weight: 50,
    description: 'Aktivitas operasional / inspeksi di jam hening malam hari'
  },
  {
    key: 'DAWN_SHIFT',
    name: 'Patroli Subuh / Fajar (04:00-07:00)',
    category: 'special',
    icon: '🌅',
    unit: 'Patroli Subuh',
    weight: 50,
    description: 'Aktivitas pengawasan keselamatan fajar menjelang pergantian shift'
  },
  {
    key: 'WEEKEND_SHIFT',
    name: 'Dedikasi Akhir Pekan (Sabtu & Minggu)',
    category: 'special',
    icon: '⚡',
    unit: 'Tugas Weekend',
    weight: 50,
    description: 'Menjalankan inspeksi atau tugas operasional di hari libur akhir pekan'
  }
];

export const TIERED_ACHIEVEMENTS: AchievementBranch[] = [
  // 1. Pengintaian Bahaya K3 (kta_reports) - NON-HIDDEN TASK RUTIN
  {
    id: 'ach_kta',
    code: 'BRANCH_KTA',
    name: 'Hazard Recon Operative',
    category: 'safety',
    icon: '🛡️',
    unit: 'Laporan KTA/TTA',
    description: 'Konsistensi mendeteksi dan melaporkan potensi bahaya KTA/TTA di area kerja.',
    isHidden: false,
    howToGet: 'Buka menu K3 > Laporan Bahaya, lalu laporkan temuan Kondisi Tidak Aman (KTA) atau Tindakan Tidak Aman (TTA) di area operasional.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 5, xpReward: 150, titleReward: 'Frontline Scout', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 25, xpReward: 350, titleReward: 'Hazard Observer', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 60, xpReward: 750, titleReward: 'Vanguard Sentinel', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 120, xpReward: 1500, titleReward: 'Supreme Hazard Hunter', badgeColor: 'border-cyan-400 bg-cyan-500/30 text-cyan-200 shadow-cyan-500/40 animate-pulse' }
    ]
  },

  // 2. Inspeksi & Patroli Rutin (inspections) - NON-HIDDEN TASK RUTIN
  {
    id: 'ach_inspection',
    code: 'BRANCH_INSPECTION',
    name: 'Field Inspection Protocol',
    category: 'operational',
    icon: '📋',
    unit: 'Formulir Inspeksi',
    description: 'Menyelesaikan checklist inspeksi keselamatan rutin (APD, Umum, Tangga, P3K).',
    isHidden: false,
    howToGet: 'Buka menu K3 > Inspeksi Keselamatan, pilih jenis inspeksi (APD, Umum, Tangga, Kotak P3K), lalu isi dan kirimkan checklist.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 10, xpReward: 200, titleReward: 'Patrol Officer', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 30, xpReward: 450, titleReward: 'Chief Inspector', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 60, xpReward: 850, titleReward: 'Master of Inspection', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 100, xpReward: 1800, titleReward: 'Grand Field Marshal', badgeColor: 'border-rose-400 bg-rose-500/30 text-rose-200 shadow-rose-500/40 animate-pulse' }
    ]
  },

  // 3. Penuntasan Temuan Hasil Inspeksi (tickets with status CLOSED) - NON-HIDDEN TASK RUTIN
  {
    id: 'ach_defects',
    code: 'BRANCH_DEFECTS',
    name: 'Inspection Finding Resolver',
    category: 'safety',
    icon: '🎯',
    unit: 'Temuan Tuntas',
    description: 'Menyelesaikan dan menuntaskan tindakan perbaikan (closing) atas temuan hasil inspeksi K3 di area kerja.',
    isHidden: false,
    howToGet: 'Buka menu Tiket / Temuan Inspeksi di portal, pilih temuan hasil inspeksi yang ditugaskan kepada Anda atau tim Anda, lakukan perbaikan fisik di lapangan, unggah foto bukti closing, dan ubah status tiket menjadi CLOSED.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 1, xpReward: 150, titleReward: 'Remediation Specialist', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 5, xpReward: 350, titleReward: 'Hazard Neutralizer', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 15, xpReward: 800, titleReward: 'Corrective Action Master', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 30, xpReward: 1600, titleReward: 'Zero Defect Guardian', badgeColor: 'border-emerald-400 bg-emerald-500/30 text-emerald-200 shadow-emerald-500/40 animate-pulse' }
    ]
  },

  // 4. Dedikasi Cuti Site / Menjual Cuti Roster (roster status CS) - HIDDEN ACHIEVEMENT (0 EXP REWARD)
  {
    id: 'ach_cs',
    code: 'BRANCH_CS',
    name: 'Site Guardian (Cuti Site)',
    category: 'special',
    icon: '⛺',
    unit: 'Status CS Roster',
    description: 'Penghormatan tertinggi bagi personil yang membaktikan diri menjaga operasional site saat hak cuti tiba (Status CS).',
    isHidden: true,
    hiddenHint: 'Pencapaian rahasia pengabdian operasional: Membaktikan diri menjaga site saat giliran cuti tiba.',
    howToGet: 'Pencapaian rahasia pengabdian: Terbuka saat personil tercatat berstatus CS (Cuti Site) pada data roster operasional.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 1, xpReward: 0, titleReward: 'Site Guardian', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 3, xpReward: 0, titleReward: 'Iron Defender', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 6, xpReward: 0, titleReward: 'Unwavering Stalwart', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 10, xpReward: 0, titleReward: 'Living Bastion', badgeColor: 'border-indigo-400 bg-indigo-500/30 text-indigo-200 shadow-indigo-500/40 animate-pulse' }
    ]
  },

  // 4. Inovasi & Masukan Pengembangan Portal (app_feedbacks) - NON-HIDDEN TASK RUTIN
  {
    id: 'ach_feedback',
    code: 'BRANCH_FEEDBACK',
    name: 'Portal Innovation Strategist',
    category: 'community',
    icon: '💡',
    unit: 'Saran & Masukan',
    description: 'Mengirimkan ide, feedback, dan usulan penyempurnaan sistem PrepLab Portal.',
    isHidden: false,
    howToGet: 'Buka menu Bantuan & Saran (pada sidebar atau profil), tuliskan masukan, ide inovasi fitur, atau evaluasi sistem portal.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 1, xpReward: 150, titleReward: 'System Contributor', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 5, xpReward: 350, titleReward: 'System Strategist', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 15, xpReward: 750, titleReward: 'Chief Innovation Officer', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 30, xpReward: 1500, titleReward: 'Supreme Architect', badgeColor: 'border-emerald-400 bg-emerald-500/30 text-emerald-200 shadow-emerald-500/40 animate-pulse' }
    ]
  },

  // 5. Quotes Komunitas & Semangat Kerja (community_quotes) - NON-HIDDEN TASK RUTIN
  {
    id: 'ach_quotes',
    code: 'BRANCH_QUOTES',
    name: 'Voice of the Legion',
    category: 'community',
    icon: '💬',
    unit: 'Quotes Inspiratif',
    description: 'Menerbitkan kata-kata motivasi dan inspirasi keselamatan untuk rekan tim.',
    isHidden: false,
    howToGet: 'Buka menu Komunitas > Quotes Motivasi di halaman depan, lalu buat dan bagikan kata-kata motivasi atau inspirasi kerja.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 1, xpReward: 120, titleReward: 'Morale Officer', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 5, xpReward: 300, titleReward: 'Propaganda Commander', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 15, xpReward: 650, titleReward: 'Voice of the Legion', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 30, xpReward: 1400, titleReward: 'Grand Philosopher', badgeColor: 'border-fuchsia-400 bg-fuchsia-500/30 text-fuchsia-200 shadow-fuchsia-500/40 animate-pulse' }
    ]
  },

  // 6. Pembuat Tema Portal (user_themes) - NON-HIDDEN TASK RUTIN
  {
    id: 'ach_themes',
    code: 'BRANCH_THEMES',
    name: 'Camouflage Architect',
    category: 'community',
    icon: '🎨',
    unit: 'Tema Kustom',
    description: 'Merancang dan membagikan tema palet warna tampilan portal sendiri.',
    isHidden: false,
    howToGet: 'Buka Pengaturan Tema (ikon kuas palet warna di navbar atas), buat tema kustom Anda sendiri, lalu simpan preset.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 1, xpReward: 150, titleReward: 'Camouflage Specialist', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 3, xpReward: 350, titleReward: 'Visual Architect', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 8, xpReward: 700, titleReward: 'Chromatic Artisan', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 15, xpReward: 1500, titleReward: 'Aesthetic Warlord', badgeColor: 'border-violet-400 bg-violet-500/30 text-violet-200 shadow-violet-500/40 animate-pulse' }
    ]
  },

  // 7. Komunikasi & Buletin Kerja (bulletin_comments & posts) - NON-HIDDEN TASK RUTIN
  {
    id: 'ach_bulletin',
    code: 'BRANCH_BULLETIN',
    name: 'Field Intelligence & Bulletin',
    category: 'community',
    icon: '📰',
    unit: 'Aksi Diskusi Buletin',
    description: 'Menerbitkan topik buletin atau mengirimkan komentar pembaruan progres kerja.',
    isHidden: false,
    howToGet: 'Buka menu Papan Buletin, kirimkan komentar tanggapan, konfirmasi pekerjaan, atau update informasi pada postingan buletin.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 5, xpReward: 100, titleReward: 'Field Correspondent', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 25, xpReward: 250, titleReward: 'Intelligence Operative', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 75, xpReward: 600, titleReward: 'Communications Chief', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 150, xpReward: 1200, titleReward: 'Information Warlord', badgeColor: 'border-sky-400 bg-sky-500/30 text-sky-200 shadow-sky-500/40 animate-pulse' }
    ]
  },

  // 8. Pemateri Safety Briefing P5M (p5m_schedules speaker) - NON-HIDDEN TASK RUTIN
  {
    id: 'ach_p5m_speaker',
    code: 'BRANCH_P5M_SPEAKER',
    name: 'Briefing Oratory Leader',
    category: 'operational',
    icon: '🎤',
    unit: 'Sesi Briefing',
    description: 'Membawakan materi safety talk P5M di hadapan rekan regu shift.',
    isHidden: false,
    howToGet: 'Bertindak sebagai pemateri atau pembawa safety talk harian pada jadwal briefing P5M regu shift Anda.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 3, xpReward: 200, titleReward: 'Briefing Officer', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 10, xpReward: 450, titleReward: 'Briefing Commander', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 25, xpReward: 900, titleReward: 'Supreme Orator', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 50, xpReward: 1800, titleReward: 'Voice of Command', badgeColor: 'border-teal-400 bg-teal-500/30 text-teal-200 shadow-teal-500/40 animate-pulse' }
    ]
  },

  // 9. Pembuatan Work Order Perbaikan (work_orders created) - NON-HIDDEN TASK RUTIN
  {
    id: 'ach_wo_create',
    code: 'BRANCH_WO_CREATE',
    name: 'Work Order Dispatcher',
    category: 'operational',
    icon: '🛠️',
    unit: 'Laporan WO Dibuat',
    description: 'Mengidentifikasi kendala kerusakan alat atau fasilitas dan menerbitkan tiket Work Order perbaikan.',
    isHidden: false,
    howToGet: 'Buka menu Work Order > Buat Laporan Kerusakan, lengkapi identitas alat dan deskripsi kerusakan, lalu submit laporan perbaikan.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 3, xpReward: 150, titleReward: 'Maintenance Dispatcher', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 10, xpReward: 350, titleReward: 'Operational Herald', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 25, xpReward: 800, titleReward: 'Equipment Overseer', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 50, xpReward: 1600, titleReward: 'Supreme Dispatcher', badgeColor: 'border-orange-400 bg-orange-500/30 text-orange-200 shadow-orange-500/40 animate-pulse' }
    ]
  },

  // 10. Penyelesaian & Penuntasan Work Order (work_orders status Closed) - NON-HIDDEN TASK RUTIN
  {
    id: 'ach_wo_resolve',
    code: 'BRANCH_WO_RESOLVE',
    name: 'Maintenance Vanguard',
    category: 'operational',
    icon: '⚙️',
    unit: 'WO Selesai (Closed)',
    description: 'Melakukan tindakan penanganan teknis dan menuntaskan status Work Order hingga Closed.',
    isHidden: false,
    howToGet: 'Lakukan perbaikan pada alat yang mengalami kendala, lalu selesaikan Work Order dengan status Closed beserta tindakan perbaikan.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 3, xpReward: 200, titleReward: 'Fixer Specialist', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 10, xpReward: 500, titleReward: 'Master Technician', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 25, xpReward: 1100, titleReward: 'Restoration Champion', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 50, xpReward: 2200, titleReward: 'Apex Engineer', badgeColor: 'border-cyan-400 bg-cyan-500/30 text-cyan-200 shadow-cyan-500/40 animate-pulse' }
    ]
  },

  // 11. Kuis K3 Sempurna (quiz_scores nilai 100) - NON-HIDDEN TASK RUTIN
  {
    id: 'ach_quiz',
    code: 'BRANCH_QUIZ',
    name: 'Tactical Marksman of Safety',
    category: 'operational',
    icon: '🎯',
    unit: 'Kuis Nilai 100',
    description: 'Meraih skor sempurna 100% pada evaluasi berkala pemahaman SOP dan K3.',
    isHidden: false,
    howToGet: 'Buka menu Kuis K3, kerjakan tes pemahaman SOP & keselamatan berkala, dan selesaikan dengan nilai sempurna 100%.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 1, xpReward: 250, titleReward: 'Tactical Marksman', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 3, xpReward: 500, titleReward: 'Sharpshooter', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 6, xpReward: 1000, titleReward: 'Elite Sniper of Safety', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 12, xpReward: 2000, titleReward: 'Flawless Strategist', badgeColor: 'border-rose-400 bg-rose-500/30 text-rose-200 shadow-rose-500/40 animate-pulse' }
    ]
  },

  // 12. Kehadiran Berturut-turut Portal Login Streak (7 hari, 30 hari, 90 hari, 365 hari) - HIDDEN ACHIEVEMENT
  {
    id: 'ach_login_streak',
    code: 'BRANCH_LOGIN_STREAK',
    name: 'The Eternal Sentinel',
    category: 'special',
    icon: '🔥',
    unit: 'Hari Berturut-turut',
    description: 'Kedisiplinan baja mengakses dan aktif di portal operasional PrepLab tanpa pernah terputus.',
    isHidden: true,
    hiddenHint: 'Pencapaian rahasia disiplin baja: Kehadiran operasional di portal berturut-turut setiap hari tanpa pernah terputus satu hari pun.',
    howToGet: 'Pencapaian rahasia: Buka dan aktif di portal PrepLab setiap hari berturut-turut tanpa jeda: Tier I (7 hari / 1 minggu), Tier II (30 hari / 1 bulan), Tier III (90 hari / 3 bulan), Tier IV (365 hari / 1 tahun penuh).',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 7, xpReward: 150, titleReward: 'Weekly Vigilant', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 30, xpReward: 500, titleReward: 'Monthly Ironclad', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 90, xpReward: 1200, titleReward: 'Centurion Sentinel', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 365, xpReward: 3000, titleReward: 'The Eternal Sentinel', badgeColor: 'border-red-500 bg-red-600/30 text-red-200 shadow-red-500/50 animate-pulse' }
    ]
  },

  // 13. Operasi Khusus Shift Malam (Shift 3 pukul 01:00 - 04:00) - HIDDEN ACHIEVEMENT
  {
    id: 'ach_night',
    code: 'BRANCH_NIGHT',
    name: 'Night Recon Operative',
    category: 'special',
    icon: '🦉',
    unit: 'Tugas Shift Malam',
    description: 'Dedikasi tinggi menjalankan dan menyelesaikan inspeksi pada shift malam rawan lelah (01:00 - 04:00).',
    isHidden: true,
    hiddenHint: 'Pencapaian rahasia waktu operasional: Menjalankan tugas pengawasan pada jam-jam hening dini hari.',
    howToGet: 'Pencapaian rahasia: Selesaikan dan kirimkan formulir inspeksi pada rentang waktu dini hari (pukul 01:00 hingga 04:00).',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 5, xpReward: 250, titleReward: 'Night Recon', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 20, xpReward: 550, titleReward: 'Shadow Operative', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 50, xpReward: 1100, titleReward: 'Phantom Sentinel', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 100, xpReward: 2200, titleReward: 'Lord of the Eclipse', badgeColor: 'border-purple-400 bg-purple-500/30 text-purple-200 shadow-purple-500/40 animate-pulse' }
    ]
  },

  // 14. Penjaga Fajar Subuh (Inspeksi/KTA Subuh 04:30 - 06:30) - HIDDEN ACHIEVEMENT
  {
    id: 'ach_dawn',
    code: 'BRANCH_DAWN',
    name: 'Dawn Patrol Vanguard',
    category: 'special',
    icon: '🌅',
    unit: 'Tugas Waktu Subuh',
    description: 'Melaksanakan pengawasan inspeksi atau pelaporan keselamatan di waktu fajar subuh menjelang pergantian shift (04:30 - 06:30).',
    isHidden: true,
    hiddenHint: 'Pencapaian rahasia penjaga fajar: Menjalankan tugas pengawasan di waktu subuh menjelang pergantian shift pagi.',
    howToGet: 'Pencapaian rahasia: Selesaikan dan kirimkan inspeksi atau pelaporan keselamatan pada waktu subuh (pukul 04:30 hingga 06:30).',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 3, xpReward: 200, titleReward: 'Dawn Patrol', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 10, xpReward: 500, titleReward: 'Morning Glory', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 25, xpReward: 1000, titleReward: 'Solar Harbinger', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 50, xpReward: 2000, titleReward: 'Master of Aurora', badgeColor: 'border-amber-300 bg-amber-400/30 text-amber-100 shadow-amber-400/50 animate-pulse' }
    ]
  },

  // 15. Penjelajah Simulator Mini-Game Retro - HIDDEN ACHIEVEMENT
  {
    id: 'ach_easter_egg',
    code: 'BRANCH_EASTER_EGG',
    name: 'Retro Arcade Sleuth',
    category: 'special',
    icon: '🕹️',
    unit: 'Node Simulator',
    description: 'Menemukan dan menaklukkan protokol rahasia simulator mini-game retro PrepLab.',
    isHidden: true,
    hiddenHint: 'Pencapaian rahasia penjelajah sistem: Menemukan dan menembus protokol mini-game retro rahasia PrepLab.',
    howToGet: 'Pencapaian rahasia: Temukan akses tersembunyi retro mini-game PrepLab dan selesaikan tantangan simulator hingga tuntas.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 1, xpReward: 250, titleReward: 'Arcade Sleuth', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 3, xpReward: 600, titleReward: 'Retro Hacker', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 5, xpReward: 1200, titleReward: 'Cyber Challenger', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 10, xpReward: 2500, titleReward: 'Virtual Overlord', badgeColor: 'border-lime-400 bg-lime-500/30 text-lime-200 shadow-lime-500/40 animate-pulse' }
    ]
  },

  // 16. Juara Musim Leaderboard (Peringkat 1 Bulanan) - NON-HIDDEN TASK
  {
    id: 'ach_season',
    code: 'BRANCH_SEASON',
    name: 'Hall of Fame Champion',
    category: 'special',
    icon: '👑',
    unit: 'Juara 1 Musim',
    description: 'Menutup musim bulanan di Peringkat #1 tertinggi klasemen poin PrepLab Hall of Fame.',
    isHidden: false,
    howToGet: 'Kumpulkan perolehan EXP bulanan (Season XP) tertinggi dan raih Peringkat #1 pada penutupan klasemen musim bulanan PrepLab.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 1, xpReward: 1000, titleReward: 'Brigade Commander', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 3, xpReward: 2000, titleReward: 'Legion Warlord', badgeColor: 'border-rose-500 bg-rose-500/30 text-rose-200 shadow-rose-500/40' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 6, xpReward: 3500, titleReward: 'Undefeated Overlord', badgeColor: 'border-amber-300 bg-gradient-to-r from-red-600/30 to-amber-500/30 text-amber-200 shadow-amber-400/50 animate-pulse' }
    ]
  },

  // 17. Dedikasi Akhir Pekan (Sabtu & Minggu) - HIDDEN ACHIEVEMENT
  {
    id: 'ach_weekend',
    code: 'BRANCH_WEEKEND',
    name: 'The Restless Sentinel',
    category: 'special',
    icon: '⚡',
    unit: 'Tugas Akhir Pekan',
    description: 'Melaksanakan tugas pengawasan keselamatan atau aktivitas lapangan di hari Sabtu dan Minggu (hari libur akhir pekan).',
    isHidden: true,
    hiddenHint: 'Di saat roda dunia melambat dan gemuruh hening, ada kesatria yang tetap menjaga mesin menyala di hari perhentian.',
    howToGet: 'Pencapaian rahasia: Selesaikan inspeksi lapangan, pelaporan KTA, atau penutupan Work Order di hari Sabtu atau Minggu.',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 3, xpReward: 200, titleReward: 'Weekend Vigilante', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 10, xpReward: 500, titleReward: 'Saturday Ironclad', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 25, xpReward: 1200, titleReward: 'Sunday Vanguard', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 50, xpReward: 2500, titleReward: 'The Restless Sentinel', badgeColor: 'border-yellow-300 bg-yellow-500/30 text-yellow-200 shadow-yellow-500/40 animate-pulse' }
    ]
  },

  // 18. Master Segala Lini (Omni-Discipline Polymath) - HIDDEN ACHIEVEMENT
  {
    id: 'ach_polymath',
    code: 'BRANCH_POLYMATH',
    name: 'Omni-Discipline Polymath',
    category: 'special',
    icon: '🌐',
    unit: 'Bidang Aktif',
    description: 'Membuktikan kepiawaian serba bisa dengan aktif berkontribusi di berbagai modul portal yang berbeda.',
    isHidden: true,
    hiddenHint: 'Seorang komandan sejati tidak hanya menguasai satu bilah senjata, melainkan memahami denyut nadi di setiap penjuru benteng komando.',
    howToGet: 'Pencapaian rahasia: Miliki kontribusi aktif minimal di 3, 5, 8, hingga 10 modul berbeda dari total 13 modul operasional PrepLab (KTA, Inspeksi, Penuntasan Temuan, Buat WO, Selesai WO, Cuti Site, Feedback, Quotes, Tema K3, Buletin, P5M, Kuis 100, Login Streak).',
    tiers: [
      { tierLevel: 1, tierName: 'Tier I (Bronze)', requiredCount: 3, xpReward: 300, titleReward: 'Versatile Operator', badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-300' },
      { tierLevel: 2, tierName: 'Tier II (Silver)', requiredCount: 5, xpReward: 750, titleReward: 'Tactical Polymath', badgeColor: 'border-slate-300 bg-slate-500/20 text-slate-100' },
      { tierLevel: 3, tierName: 'Tier III (Gold)', requiredCount: 8, xpReward: 1600, titleReward: 'Omni-Discipline Specialist', badgeColor: 'border-amber-400 bg-amber-500/25 text-amber-300 shadow-amber-500/30' },
      { tierLevel: 4, tierName: 'Tier IV (Master)', requiredCount: 10, xpReward: 3000, titleReward: 'Apex PrepLab Polymath', badgeColor: 'border-fuchsia-400 bg-fuchsia-500/30 text-fuchsia-200 shadow-fuchsia-500/40 animate-pulse' }
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

// Visual configuration and border styling hierarchy for progressive achievement tiers
export interface TierVisualConfig {
  tierLevel: number;
  tierName: string;
  metalLabel: string;
  badgeEmoji: string;
  borderThicknessPx: number;
  cardBorder: string;
  cardShadow: string;
  cardGlowAura: string;
  badgePill: string;
  iconRing: string;
  modalRowBorder: string;
  modalRowGlow: string;
  cornerShine: string;
  ribbonGradient: string;
  progressBarGradient: string;
  flairIcon: string;
  glowFilter: string;
}

export function getAchievementTierStyle(tierLevel?: number | null): TierVisualConfig {
  switch (tierLevel) {
    case 1:
      return {
        tierLevel: 1,
        tierName: 'Tier I (Bronze)',
        metalLabel: 'BRONZE',
        badgeEmoji: '🥉',
        flairIcon: '🛡️',
        borderThicknessPx: 2,
        cardBorder: 'border-2 border-[#B45309] dark:border-[#D97706]',
        cardShadow: 'shadow-[0_4px_22px_rgba(180,83,9,0.28)] hover:shadow-[0_8px_32px_rgba(180,83,9,0.42)]',
        cardGlowAura: 'from-amber-700/20 via-amber-800/5 to-transparent',
        badgePill: 'border-2 border-amber-600/80 bg-gradient-to-r from-amber-950/90 via-amber-900/90 to-amber-950/90 text-amber-200 font-bold shadow-xs',
        iconRing: 'border-2 border-[#B45309] dark:border-[#D97706] bg-amber-950/30 text-amber-300 shadow-inner',
        modalRowBorder: 'border-2 border-amber-600/80 bg-gradient-to-r from-amber-950/20 to-amber-900/10',
        modalRowGlow: 'shadow-[0_2px_14px_rgba(180,83,9,0.28)]',
        cornerShine: 'bg-amber-600/15',
        ribbonGradient: 'from-amber-800 via-amber-700 to-amber-900 text-amber-100',
        progressBarGradient: 'from-amber-700 via-amber-600 to-amber-500',
        glowFilter: 'drop-shadow(0 2px 8px rgba(180,83,9,0.4))'
      };
    case 2:
      return {
        tierLevel: 2,
        tierName: 'Tier II (Silver)',
        metalLabel: 'SILVER',
        badgeEmoji: '🥈',
        flairIcon: '⚡',
        borderThicknessPx: 3,
        cardBorder: 'border-[3px] border-slate-300 dark:border-slate-100 ring-1 ring-slate-300/40',
        cardShadow: 'shadow-[0_6px_30px_rgba(148,163,184,0.45)] dark:shadow-[0_6px_34px_rgba(255,255,255,0.22)] hover:shadow-[0_10px_40px_rgba(148,163,184,0.65)]',
        cardGlowAura: 'from-slate-300/30 via-slate-400/10 to-transparent',
        badgePill: 'border-2 border-white dark:border-slate-300 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-300 text-slate-900 font-black shadow-md shadow-slate-400/30',
        iconRing: 'border-[3px] border-slate-300 dark:border-slate-100 bg-slate-100 dark:bg-slate-800/90 text-slate-100 shadow-md',
        modalRowBorder: 'border-[3px] border-slate-300 dark:border-slate-200 bg-gradient-to-r from-slate-200/20 to-slate-400/10',
        modalRowGlow: 'shadow-[0_4px_20px_rgba(148,163,184,0.4)]',
        cornerShine: 'bg-slate-200/25',
        ribbonGradient: 'from-slate-300 via-slate-100 to-slate-300 text-slate-950 font-black',
        progressBarGradient: 'from-slate-400 via-slate-200 to-slate-100',
        glowFilter: 'drop-shadow(0 4px 12px rgba(203,213,225,0.6))'
      };
    case 3:
      return {
        tierLevel: 3,
        tierName: 'Tier III (Gold)',
        metalLabel: 'GOLD',
        badgeEmoji: '🥇',
        flairIcon: '✨',
        borderThicknessPx: 4,
        cardBorder: 'border-4 border-amber-400 dark:border-yellow-400 ring-2 ring-amber-400/50 shadow-amber-500/20',
        cardShadow: 'shadow-[0_8px_38px_rgba(245,158,11,0.55)] dark:shadow-[0_8px_44px_rgba(251,191,36,0.5)] hover:shadow-[0_12px_48px_rgba(245,158,11,0.75)]',
        cardGlowAura: 'from-amber-400/35 via-yellow-500/15 to-transparent',
        badgePill: 'border-2 border-yellow-200 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/50',
        iconRing: 'border-4 border-amber-400 bg-amber-500/20 text-amber-300 shadow-lg shadow-amber-500/50',
        modalRowBorder: 'border-4 border-amber-400 bg-gradient-to-r from-amber-500/25 to-yellow-500/15',
        modalRowGlow: 'shadow-[0_6px_26px_rgba(245,158,11,0.5)]',
        cornerShine: 'bg-amber-400/30',
        ribbonGradient: 'from-yellow-400 via-amber-400 to-yellow-500 text-slate-950 font-black',
        progressBarGradient: 'from-amber-500 via-yellow-400 to-amber-300',
        glowFilter: 'drop-shadow(0 4px 16px rgba(245,158,11,0.7))'
      };
    case 4:
      return {
        tierLevel: 4,
        tierName: 'Tier IV (Master)',
        metalLabel: 'MASTER',
        badgeEmoji: '👑',
        flairIcon: '💎',
        borderThicknessPx: 5,
        cardBorder: 'border-[5px] border-cyan-400 dark:border-cyan-300 ring-2 ring-fuchsia-500/70 ring-offset-2 ring-offset-slate-950 animate-pulse',
        cardShadow: 'shadow-[0_10px_52px_rgba(6,182,212,0.7)] dark:shadow-[0_10px_60px_rgba(34,211,238,0.75)] hover:shadow-[0_16px_68px_rgba(6,182,212,0.95)]',
        cardGlowAura: 'from-cyan-400/40 via-fuchsia-500/25 to-transparent',
        badgePill: 'border-2 border-white bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-300 text-slate-950 font-black shadow-xl shadow-cyan-400/60',
        iconRing: 'border-4 border-cyan-300 ring-2 ring-purple-500 bg-cyan-500/30 text-cyan-200 shadow-xl shadow-cyan-500/70',
        modalRowBorder: 'border-[5px] border-cyan-400 bg-gradient-to-r from-cyan-500/30 via-fuchsia-500/20 to-purple-500/25 ring-2 ring-fuchsia-500/50',
        modalRowGlow: 'shadow-[0_8px_32px_rgba(6,182,212,0.65)]',
        cornerShine: 'bg-cyan-400/40',
        ribbonGradient: 'from-cyan-400 via-fuchsia-500 to-amber-300 text-slate-950 font-black',
        progressBarGradient: 'from-cyan-400 via-fuchsia-500 to-amber-300',
        glowFilter: 'drop-shadow(0 6px 20px rgba(6,182,212,0.9))'
      };
    default:
      return {
        tierLevel: 0,
        tierName: 'Terkunci',
        metalLabel: 'LOCKED',
        badgeEmoji: '🔒',
        flairIcon: '🔒',
        borderThicknessPx: 2,
        cardBorder: 'border-2 border-dashed border-amber-500/30 text-white',
        cardShadow: 'shadow-xs',
        cardGlowAura: 'from-amber-500/5 via-transparent to-transparent',
        badgePill: 'border border-amber-500/30 text-amber-400 bg-amber-500/10',
        iconRing: 'border border-amber-500/25 bg-amber-500/10 text-amber-400',
        modalRowBorder: 'border border-slate-700/60 bg-slate-800/40',
        modalRowGlow: '',
        cornerShine: 'bg-transparent',
        ribbonGradient: 'from-slate-700 to-slate-800 text-slate-400',
        progressBarGradient: 'from-slate-700 to-slate-600',
        glowFilter: 'none'
      };
  }
}

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
    id: 'frame_hazard_aegis', 
    label: 'Hazard Remediation Aegis', 
    ringColor: 'border-emerald-400 ring-4 ring-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.7)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_defects',
    sourceAchName: 'Inspection Finding Resolver',
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
    id: 'frame_wo_dispatcher', 
    label: 'Tactical Dispatch Shield', 
    ringColor: 'border-orange-400 ring-4 ring-orange-500/70 shadow-[0_0_20px_rgba(249,115,22,0.7)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_wo_create',
    sourceAchName: 'Work Order Dispatcher',
    isExclusive: true
  },
  { 
    id: 'frame_apex_engineer', 
    label: 'Heavy Apex Core Scope', 
    ringColor: 'border-cyan-400 ring-4 ring-cyan-500/70 shadow-[0_0_20px_rgba(6,182,212,0.7)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_wo_resolve',
    sourceAchName: 'Maintenance Vanguard',
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
    id: 'frame_eternal_sentinel', 
    label: 'Eternal Flaming Vanguard', 
    ringColor: 'border-red-500 ring-4 ring-red-600/80 shadow-[0_0_22px_rgba(239,68,68,0.8)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_login_streak',
    sourceAchName: 'The Eternal Sentinel',
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
    id: 'frame_dawn_aurora', 
    label: 'Solar Sunrise Halo', 
    ringColor: 'border-amber-300 ring-4 ring-orange-400/70 shadow-[0_0_20px_rgba(251,146,60,0.7)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_dawn',
    sourceAchName: 'Dawn Patrol Vanguard',
    isExclusive: true
  },
  { 
    id: 'frame_arcade_neon', 
    label: 'Cyberpunk Arcade Glitch', 
    ringColor: 'border-lime-400 ring-4 ring-emerald-500/70 shadow-[0_0_20px_rgba(132,204,22,0.7)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_easter_egg',
    sourceAchName: 'Retro Arcade Sleuth',
    isExclusive: true
  },
  { 
    id: 'frame_weekend_sentinel', 
    label: 'Solar Aegis Cog', 
    ringColor: 'border-amber-400 ring-4 ring-yellow-500/70 shadow-[0_0_20px_rgba(251,191,36,0.7)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_weekend',
    sourceAchName: 'The Restless Sentinel',
    isExclusive: true
  },
  { 
    id: 'frame_omni_polymath', 
    label: 'Prismatic Tetrahedron Core', 
    ringColor: 'border-fuchsia-400 ring-4 ring-cyan-400/70 shadow-[0_0_22px_rgba(192,38,211,0.75)]', 
    effect: 'animate-pulse',
    sourceAchId: 'ach_polymath',
    sourceAchName: 'Omni-Discipline Polymath',
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
