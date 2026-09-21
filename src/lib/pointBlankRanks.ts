export interface VanguardRank {
  id: number;
  code: string;
  name: string;
  tier: 'Trainee' | 'Strip' | 'StaffSgt' | 'Sgt1stClass' | 'MasterSgt' | '2ndLt' | '1stLt' | 'Captain' | 'Major' | 'LtColonel' | 'Colonel' | 'General' | 'Commander' | 'GM';
  tierGroup: string;
  icon: string;
  minXp: number;
  maxXp: number;
  badgeColor: string;
  isGM?: boolean;
}

// Backward compatibility alias
export type PBRank = VanguardRank;

// 1-Year Career Progression Curve (0 -> 25,000 EXP) - PrepLab Vanguard Honor Ladder
export const VANGUARD_RANKS: VanguardRank[] = [
  // --- BULAN 1: REKRUT & OPERATOR PRATAMA (0 - 2,000 EXP) ---
  {
    id: 1,
    code: 'TRAINEE',
    name: 'Trainee',
    tier: 'Trainee',
    tierGroup: 'Inisiasi / Trainee',
    icon: '/assets/ranks/rank_01_trainee.svg',
    minXp: 0,
    maxXp: 100,
    badgeColor: 'border-slate-400 bg-slate-500/10 text-slate-300'
  },
  {
    id: 2,
    code: 'JUNIOR_SPEC_1',
    name: 'Junior Specialist I (Strip 1)',
    tier: 'Strip',
    tierGroup: 'Cadet (Strip)',
    icon: '/assets/ranks/rank_02_strip_1.svg',
    minXp: 101,
    maxXp: 250,
    badgeColor: 'border-slate-400 bg-slate-500/10 text-slate-300'
  },
  {
    id: 3,
    code: 'JUNIOR_SPEC_2',
    name: 'Junior Specialist II (Strip 2)',
    tier: 'Strip',
    tierGroup: 'Cadet (Strip)',
    icon: '/assets/ranks/rank_03_strip_2.svg',
    minXp: 251,
    maxXp: 450,
    badgeColor: 'border-slate-400 bg-slate-500/10 text-slate-300'
  },
  {
    id: 4,
    code: 'FIELD_SPEC_1',
    name: 'Field Specialist I (Strip 3)',
    tier: 'Strip',
    tierGroup: 'Cadet (Strip)',
    icon: '/assets/ranks/rank_04_strip_3.svg',
    minXp: 451,
    maxXp: 700,
    badgeColor: 'border-slate-400 bg-slate-500/10 text-slate-300'
  },
  {
    id: 5,
    code: 'FIELD_SPEC_2',
    name: 'Field Specialist II (Strip 4)',
    tier: 'Strip',
    tierGroup: 'Cadet (Strip)',
    icon: '/assets/ranks/rank_05_strip_4.svg',
    minXp: 701,
    maxXp: 1000,
    badgeColor: 'border-slate-400 bg-slate-500/10 text-slate-300'
  },
  {
    id: 6,
    code: 'SENIOR_SPEC_1',
    name: 'Senior Specialist Grade 1 (V1)',
    tier: 'StaffSgt',
    tierGroup: 'Specialist I (V1)',
    icon: '/assets/ranks/rank_06_v1_1.svg',
    minXp: 1001,
    maxXp: 1300,
    badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-400'
  },
  {
    id: 7,
    code: 'SENIOR_SPEC_2',
    name: 'Senior Specialist Grade 2 (V1)',
    tier: 'StaffSgt',
    tierGroup: 'Specialist I (V1)',
    icon: '/assets/ranks/rank_07_v1_2.svg',
    minXp: 1301,
    maxXp: 1650,
    badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-400'
  },
  {
    id: 8,
    code: 'SENIOR_SPEC_EMAS',
    name: 'Senior Specialist Grade 3 (V1 Emas)',
    tier: 'StaffSgt',
    tierGroup: 'Specialist I (V1)',
    icon: '/assets/ranks/rank_08_v1_emas.svg',
    minXp: 1651,
    maxXp: 2000,
    badgeColor: 'border-amber-500 bg-amber-500/20 text-amber-300'
  },

  // --- BULAN 2: TECHNICAL LEAD / V2 (2,001 - 4,000 EXP) ---
  {
    id: 9,
    code: 'TECH_LEAD_1',
    name: 'Technical Lead Grade 1 (V2)',
    tier: 'Sgt1stClass',
    tierGroup: 'Specialist II (V2)',
    icon: '/assets/ranks/rank_09_v2_1.svg',
    minXp: 2001,
    maxXp: 2450,
    badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-400'
  },
  {
    id: 10,
    code: 'TECH_LEAD_2',
    name: 'Technical Lead Grade 2 (V2)',
    tier: 'Sgt1stClass',
    tierGroup: 'Specialist II (V2)',
    icon: '/assets/ranks/rank_10_v2_2.svg',
    minXp: 2451,
    maxXp: 2950,
    badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-400'
  },
  {
    id: 11,
    code: 'TECH_LEAD_3',
    name: 'Technical Lead Grade 3 (V2)',
    tier: 'Sgt1stClass',
    tierGroup: 'Specialist II (V2)',
    icon: '/assets/ranks/rank_11_v2_3.svg',
    minXp: 2951,
    maxXp: 3450,
    badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-400'
  },
  {
    id: 12,
    code: 'TECH_LEAD_EMAS',
    name: 'Technical Lead Grade 4 (V2 Emas)',
    tier: 'Sgt1stClass',
    tierGroup: 'Specialist II (V2)',
    icon: '/assets/ranks/rank_12_v2_emas.svg',
    minXp: 3451,
    maxXp: 4000,
    badgeColor: 'border-amber-500 bg-amber-500/20 text-amber-300'
  },

  // --- BULAN 3: STAFF SPECIALIST / V3 (4,001 - 6,200 EXP) ---
  {
    id: 13,
    code: 'STAFF_SPEC_1',
    name: 'Staff Specialist Grade 1 (V3)',
    tier: 'MasterSgt',
    tierGroup: 'Specialist III (V3)',
    icon: '/assets/ranks/rank_13_v3_1.svg',
    minXp: 4001,
    maxXp: 4400,
    badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-400'
  },
  {
    id: 14,
    code: 'STAFF_SPEC_2',
    name: 'Staff Specialist Grade 2 (V3)',
    tier: 'MasterSgt',
    tierGroup: 'Specialist III (V3)',
    icon: '/assets/ranks/rank_14_v3_2.svg',
    minXp: 4401,
    maxXp: 4850,
    badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-400'
  },
  {
    id: 15,
    code: 'STAFF_SPEC_3',
    name: 'Staff Specialist Grade 3 (V3)',
    tier: 'MasterSgt',
    tierGroup: 'Specialist III (V3)',
    icon: '/assets/ranks/rank_15_v3_3.svg',
    minXp: 4851,
    maxXp: 5300,
    badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-400'
  },
  {
    id: 16,
    code: 'STAFF_SPEC_4',
    name: 'Staff Specialist Grade 4 (V3)',
    tier: 'MasterSgt',
    tierGroup: 'Specialist III (V3)',
    icon: '/assets/ranks/rank_16_v3_4.svg',
    minXp: 5301,
    maxXp: 5750,
    badgeColor: 'border-amber-700/60 bg-amber-900/20 text-amber-400'
  },
  {
    id: 17,
    code: 'STAFF_SPEC_EMAS',
    name: 'Staff Specialist Grade 5 (V3 Emas)',
    tier: 'MasterSgt',
    tierGroup: 'Specialist III (V3)',
    icon: '/assets/ranks/rank_17_v3_emas.svg',
    minXp: 5751,
    maxXp: 6200,
    badgeColor: 'border-amber-500 bg-amber-500/20 text-amber-300'
  },

  // --- BULAN 4: JUNIOR INSPECTOR / DIAMOND 1 (6,201 - 8,400 EXP) ---
  {
    id: 18,
    code: 'JR_INSPECTOR_1',
    name: 'Junior Inspector Grade 1 (Diamond 1)',
    tier: '2ndLt',
    tierGroup: 'Officer I (Diamond 1)',
    icon: '/assets/ranks/rank_18_diamond1_1.svg',
    minXp: 6201,
    maxXp: 6700,
    badgeColor: 'border-blue-500/60 bg-blue-500/15 text-blue-300'
  },
  {
    id: 19,
    code: 'JR_INSPECTOR_2',
    name: 'Junior Inspector Grade 2 (Diamond 1)',
    tier: '2ndLt',
    tierGroup: 'Officer I (Diamond 1)',
    icon: '/assets/ranks/rank_19_diamond1_2.svg',
    minXp: 6701,
    maxXp: 7250,
    badgeColor: 'border-blue-500/60 bg-blue-500/15 text-blue-300'
  },
  {
    id: 20,
    code: 'JR_INSPECTOR_3',
    name: 'Junior Inspector Grade 3 (Diamond 1)',
    tier: '2ndLt',
    tierGroup: 'Officer I (Diamond 1)',
    icon: '/assets/ranks/rank_20_diamond1_3.svg',
    minXp: 7251,
    maxXp: 7800,
    badgeColor: 'border-blue-500/60 bg-blue-500/15 text-blue-300'
  },
  {
    id: 21,
    code: 'JR_INSPECTOR_EMAS',
    name: 'Junior Inspector Grade 4 (Diamond 1 Emas)',
    tier: '2ndLt',
    tierGroup: 'Officer I (Diamond 1)',
    icon: '/assets/ranks/rank_21_diamond1_emas.svg',
    minXp: 7801,
    maxXp: 8400,
    badgeColor: 'border-amber-400 bg-amber-500/20 text-amber-300'
  },

  // --- BULAN 5: SENIOR INSPECTOR / DIAMOND 2 (8,401 - 10,600 EXP) ---
  {
    id: 22,
    code: 'SR_INSPECTOR_1',
    name: 'Senior Inspector Grade 1 (Diamond 2)',
    tier: '1stLt',
    tierGroup: 'Officer II (Diamond 2)',
    icon: '/assets/ranks/rank_22_diamond2_1.svg',
    minXp: 8401,
    maxXp: 8800,
    badgeColor: 'border-blue-500/60 bg-blue-500/15 text-blue-300'
  },
  {
    id: 23,
    code: 'SR_INSPECTOR_2',
    name: 'Senior Inspector Grade 2 (Diamond 2)',
    tier: '1stLt',
    tierGroup: 'Officer II (Diamond 2)',
    icon: '/assets/ranks/rank_23_diamond2_2.svg',
    minXp: 8801,
    maxXp: 9250,
    badgeColor: 'border-blue-500/60 bg-blue-500/15 text-blue-300'
  },
  {
    id: 24,
    code: 'SR_INSPECTOR_3',
    name: 'Senior Inspector Grade 3 (Diamond 2)',
    tier: '1stLt',
    tierGroup: 'Officer II (Diamond 2)',
    icon: '/assets/ranks/rank_24_diamond2_3.svg',
    minXp: 9251,
    maxXp: 9700,
    badgeColor: 'border-blue-500/60 bg-blue-500/15 text-blue-300'
  },
  {
    id: 25,
    code: 'SR_INSPECTOR_4',
    name: 'Senior Inspector Grade 4 (Diamond 2)',
    tier: '1stLt',
    tierGroup: 'Officer II (Diamond 2)',
    icon: '/assets/ranks/rank_25_diamond2_4.svg',
    minXp: 9701,
    maxXp: 10150,
    badgeColor: 'border-blue-500/60 bg-blue-500/15 text-blue-300'
  },
  {
    id: 26,
    code: 'SR_INSPECTOR_EMAS',
    name: 'Senior Inspector Grade 5 (Diamond 2 Emas)',
    tier: '1stLt',
    tierGroup: 'Officer II (Diamond 2)',
    icon: '/assets/ranks/rank_26_diamond2_emas.svg',
    minXp: 10151,
    maxXp: 10600,
    badgeColor: 'border-amber-400 bg-amber-500/20 text-amber-300'
  },

  // --- BULAN 6: CHIEF INSPECTOR / DIAMOND 3 (10,601 - 13,000 EXP) ---
  {
    id: 27,
    code: 'CHIEF_INSPECTOR_1',
    name: 'Chief Inspector Grade 1 (Diamond 3)',
    tier: 'Captain',
    tierGroup: 'Officer III (Diamond 3)',
    icon: '/assets/ranks/rank_27_diamond3_1.svg',
    minXp: 10601,
    maxXp: 11050,
    badgeColor: 'border-blue-500/60 bg-blue-500/15 text-blue-300'
  },
  {
    id: 28,
    code: 'CHIEF_INSPECTOR_2',
    name: 'Chief Inspector Grade 2 (Diamond 3)',
    tier: 'Captain',
    tierGroup: 'Officer III (Diamond 3)',
    icon: '/assets/ranks/rank_28_diamond3_2.svg',
    minXp: 11051,
    maxXp: 11500,
    badgeColor: 'border-blue-500/60 bg-blue-500/15 text-blue-300'
  },
  {
    id: 29,
    code: 'CHIEF_INSPECTOR_3',
    name: 'Chief Inspector Grade 3 (Diamond 3)',
    tier: 'Captain',
    tierGroup: 'Officer III (Diamond 3)',
    icon: '/assets/ranks/rank_29_diamond3_3.svg',
    minXp: 11501,
    maxXp: 12000,
    badgeColor: 'border-blue-500/60 bg-blue-500/15 text-blue-300'
  },
  {
    id: 30,
    code: 'CHIEF_INSPECTOR_4',
    name: 'Chief Inspector Grade 4 (Diamond 3)',
    tier: 'Captain',
    tierGroup: 'Officer III (Diamond 3)',
    icon: '/assets/ranks/rank_30_diamond3_4.svg',
    minXp: 12001,
    maxXp: 12500,
    badgeColor: 'border-blue-500/60 bg-blue-500/15 text-blue-300'
  },
  {
    id: 31,
    code: 'CHIEF_INSPECTOR_EMAS',
    name: 'Chief Inspector Grade 5 (Diamond 3 Emas)',
    tier: 'Captain',
    tierGroup: 'Officer III (Diamond 3)',
    icon: '/assets/ranks/rank_31_diamond3_emas.svg',
    minXp: 12501,
    maxXp: 13000,
    badgeColor: 'border-amber-400 bg-amber-500/20 text-amber-300'
  },

  // --- BULAN 7: SUPERINTENDENT / MAJOR 1 (13,001 - 15,500 EXP) ---
  {
    id: 32,
    code: 'SUPERINTENDENT_1',
    name: 'Superintendent Grade 1 (Major 1)',
    tier: 'Major',
    tierGroup: 'Superintendent (Major 1)',
    icon: '/assets/ranks/rank_32_major1_1.svg',
    minXp: 13001,
    maxXp: 13450,
    badgeColor: 'border-teal-500/60 bg-teal-500/15 text-teal-300'
  },
  {
    id: 33,
    code: 'SUPERINTENDENT_2',
    name: 'Superintendent Grade 2 (Major 1)',
    tier: 'Major',
    tierGroup: 'Superintendent (Major 1)',
    icon: '/assets/ranks/rank_33_major1_2.svg',
    minXp: 13451,
    maxXp: 13950,
    badgeColor: 'border-teal-500/60 bg-teal-500/15 text-teal-300'
  },
  {
    id: 34,
    code: 'SUPERINTENDENT_3',
    name: 'Superintendent Grade 3 (Major 1)',
    tier: 'Major',
    tierGroup: 'Superintendent (Major 1)',
    icon: '/assets/ranks/rank_34_major1_3.svg',
    minXp: 13951,
    maxXp: 14450,
    badgeColor: 'border-teal-500/60 bg-teal-500/15 text-teal-300'
  },
  {
    id: 35,
    code: 'SUPERINTENDENT_4',
    name: 'Superintendent Grade 4 (Major 1)',
    tier: 'Major',
    tierGroup: 'Superintendent (Major 1)',
    icon: '/assets/ranks/rank_35_major1_4.svg',
    minXp: 14451,
    maxXp: 14950,
    badgeColor: 'border-teal-500/60 bg-teal-500/15 text-teal-300'
  },
  {
    id: 36,
    code: 'SUPERINTENDENT_EMAS',
    name: 'Superintendent Grade 5 (Major 1 Emas)',
    tier: 'Major',
    tierGroup: 'Superintendent (Major 1)',
    icon: '/assets/ranks/rank_36_major1_emas.svg',
    minXp: 14951,
    maxXp: 15500,
    badgeColor: 'border-amber-400 bg-amber-500/20 text-amber-300'
  },

  // --- BULAN 8: CHIEF SUPERINTENDENT / MAJOR 2 (15,501 - 18,000 EXP) ---
  {
    id: 37,
    code: 'CHIEF_SUPT_1',
    name: 'Chief Superintendent Grade 1 (Major 2)',
    tier: 'LtColonel',
    tierGroup: 'Commander (Major 2)',
    icon: '/assets/ranks/rank_37_major2_1.svg',
    minXp: 15501,
    maxXp: 15950,
    badgeColor: 'border-teal-500/60 bg-teal-500/15 text-teal-300'
  },
  {
    id: 38,
    code: 'CHIEF_SUPT_2',
    name: 'Chief Superintendent Grade 2 (Major 2)',
    tier: 'LtColonel',
    tierGroup: 'Commander (Major 2)',
    icon: '/assets/ranks/rank_38_major2_2.svg',
    minXp: 15951,
    maxXp: 16450,
    badgeColor: 'border-teal-500/60 bg-teal-500/15 text-teal-300'
  },
  {
    id: 39,
    code: 'CHIEF_SUPT_3',
    name: 'Chief Superintendent Grade 3 (Major 2)',
    tier: 'LtColonel',
    tierGroup: 'Commander (Major 2)',
    icon: '/assets/ranks/rank_39_major2_3.svg',
    minXp: 16451,
    maxXp: 16950,
    badgeColor: 'border-teal-500/60 bg-teal-500/15 text-teal-300'
  },
  {
    id: 40,
    code: 'CHIEF_SUPT_4',
    name: 'Chief Superintendent Grade 4 (Major 2)',
    tier: 'LtColonel',
    tierGroup: 'Commander (Major 2)',
    icon: '/assets/ranks/rank_40_major2_4.svg',
    minXp: 16951,
    maxXp: 17450,
    badgeColor: 'border-teal-500/60 bg-teal-500/15 text-teal-300'
  },
  {
    id: 41,
    code: 'CHIEF_SUPT_EMAS',
    name: 'Chief Superintendent Grade 5 (Major 2 Emas)',
    tier: 'LtColonel',
    tierGroup: 'Commander (Major 2)',
    icon: '/assets/ranks/rank_41_major2_emas.svg',
    minXp: 17451,
    maxXp: 18000,
    badgeColor: 'border-amber-400 bg-amber-500/20 text-amber-300'
  },

  // --- BULAN 9: PRINCIPAL SUPERINTENDENT / MAJOR 3 (18,001 - 20,500 EXP) ---
  {
    id: 42,
    code: 'PRIN_SUPT_1',
    name: 'Principal Superintendent Grade 1 (Major 3)',
    tier: 'Colonel',
    tierGroup: 'High Commander (Major 3)',
    icon: '/assets/ranks/rank_42_major3_1.svg',
    minXp: 18001,
    maxXp: 18450,
    badgeColor: 'border-teal-500/60 bg-teal-500/15 text-teal-300'
  },
  {
    id: 43,
    code: 'PRIN_SUPT_2',
    name: 'Principal Superintendent Grade 2 (Major 3)',
    tier: 'Colonel',
    tierGroup: 'High Commander (Major 3)',
    icon: '/assets/ranks/rank_43_major3_2.svg',
    minXp: 18451,
    maxXp: 18950,
    badgeColor: 'border-teal-500/60 bg-teal-500/15 text-teal-300'
  },
  {
    id: 44,
    code: 'PRIN_SUPT_3',
    name: 'Principal Superintendent Grade 3 (Major 3)',
    tier: 'Colonel',
    tierGroup: 'High Commander (Major 3)',
    icon: '/assets/ranks/rank_44_major3_3.svg',
    minXp: 18951,
    maxXp: 19450,
    badgeColor: 'border-teal-500/60 bg-teal-500/15 text-teal-300'
  },
  {
    id: 45,
    code: 'PRIN_SUPT_4',
    name: 'Principal Superintendent Grade 4 (Major 3)',
    tier: 'Colonel',
    tierGroup: 'High Commander (Major 3)',
    icon: '/assets/ranks/rank_45_major3_4.svg',
    minXp: 19451,
    maxXp: 19950,
    badgeColor: 'border-teal-500/60 bg-teal-500/15 text-teal-300'
  },
  {
    id: 46,
    code: 'PRIN_SUPT_EMAS',
    name: 'Principal Superintendent Grade 5 (Major 3 Emas)',
    tier: 'Colonel',
    tierGroup: 'High Commander (Major 3)',
    icon: '/assets/ranks/rank_46_major3_emas.svg',
    minXp: 19951,
    maxXp: 20500,
    badgeColor: 'border-amber-400 bg-amber-500/20 text-amber-300'
  },

  // --- BULAN 10: BRIGADIER MARSHAL / BINTANG 1 (20,501 - 21,800 EXP) ---
  {
    id: 47,
    code: 'BRIGADIER',
    name: 'Brigadier Marshal (Bintang 1)',
    tier: 'General',
    tierGroup: 'Vanguard Marshal (Bintang)',
    icon: '/assets/ranks/rank_47_bintang_1.svg',
    minXp: 20501,
    maxXp: 21800,
    badgeColor: 'border-rose-600/80 bg-rose-600/20 text-rose-300 shadow-rose-500/20 shadow-md'
  },

  // --- BULAN 11: MAJOR MARSHAL & LT. GENERAL (21,801 - 23,400 EXP) ---
  {
    id: 48,
    code: 'MAJOR_MARSHAL',
    name: 'Major Marshal (Bintang 2)',
    tier: 'General',
    tierGroup: 'Vanguard Marshal (Bintang)',
    icon: '/assets/ranks/rank_48_bintang_2.svg',
    minXp: 21801,
    maxXp: 22600,
    badgeColor: 'border-rose-600/80 bg-rose-600/20 text-rose-300 shadow-rose-500/20 shadow-md'
  },
  {
    id: 49,
    code: 'LT_GENERAL',
    name: 'Lieutenant General (Bintang 3)',
    tier: 'General',
    tierGroup: 'Vanguard Marshal (Bintang)',
    icon: '/assets/ranks/rank_49_bintang_3.svg',
    minXp: 22601,
    maxXp: 23400,
    badgeColor: 'border-rose-600/80 bg-rose-600/20 text-rose-300 shadow-rose-500/20 shadow-md'
  },

  // --- BULAN 12: GENERAL COMMANDER & SUPREME VANGUARD COMMANDER (23,401 - 25,000+ EXP) ---
  {
    id: 50,
    code: 'GENERAL',
    name: 'General Commander (Bintang 4)',
    tier: 'General',
    tierGroup: 'Vanguard Marshal (Bintang)',
    icon: '/assets/ranks/rank_50_bintang_4.svg',
    minXp: 23401,
    maxXp: 24500,
    badgeColor: 'border-rose-600/80 bg-rose-600/20 text-rose-300 shadow-rose-500/20 shadow-md'
  },
  {
    id: 51,
    code: 'COMMANDER',
    name: 'Supreme Vanguard Commander (Bintang 5)',
    tier: 'Commander',
    tierGroup: 'Vanguard Marshal (Bintang)',
    icon: '/assets/ranks/rank_51_bintang_5.svg',
    minXp: 24501,
    maxXp: 999999,
    badgeColor: 'border-amber-400 bg-gradient-to-r from-red-600/30 to-amber-600/30 text-amber-300 shadow-amber-500/40 shadow-lg ring-1 ring-amber-400/50'
  }
];

export const GM_RANK: VanguardRank = {
  id: 0,
  code: 'GAME_MASTER',
  name: 'Game Master (GM)',
  tier: 'GM',
  tierGroup: 'Special Command',
  icon: '/assets/ranks/rank_special_gm.svg',
  minXp: 999999,
  maxXp: 999999,
  badgeColor: 'border-amber-400/80 bg-gradient-to-r from-zinc-950 via-slate-900 to-black text-amber-300 shadow-amber-500/30 shadow-md ring-1 ring-amber-400/40',
  isGM: true
};

export const POINT_BLANK_RANKS: VanguardRank[] = [GM_RANK, ...VANGUARD_RANKS];

export function getRankByXp(totalXp: number = 0): {
  currentRank: VanguardRank;
  nextRank: VanguardRank | null;
  progressPercent: number;
  xpToNext: number;
  currentXp: number;
  neededXp: number;
} {
  const safeXp = Math.max(0, Number(totalXp) || 0);
  const current = VANGUARD_RANKS.slice().reverse().find(r => safeXp >= r.minXp) || VANGUARD_RANKS[0];
  const currentIndex = VANGUARD_RANKS.findIndex(r => r.id === current.id);
  const next = currentIndex < VANGUARD_RANKS.length - 1 ? VANGUARD_RANKS[currentIndex + 1] : null;

  let progressPercent = 100;
  let xpToNext = 0;

  if (next) {
    const range = next.minXp - current.minXp;
    const gained = safeXp - current.minXp;
    progressPercent = Math.min(100, Math.max(0, Math.round((gained / range) * 100)));
    xpToNext = Math.max(0, next.minXp - safeXp);
  }

  return {
    currentRank: current,
    nextRank: next,
    progressPercent,
    xpToNext,
    currentXp: safeXp,
    neededXp: next ? next.minXp : current.maxXp
  };
}
