export type SupervisorRole = 
  | 'Laboratory Maintenance Supervisor'
  | 'Inventory Control Supervisor'
  | 'Laboratory Supervisor'
  | 'Preparation Supervisor'
  | 'Superintendent'
  | 'Manager'
  | 'Other';

export interface InspectionAgendaItem {
  id: number;
  name: string;
  picRole: 'Laboratory Maintenance Supervisor' | 'Inventory Control Supervisor' | 'Laboratory Supervisor' | 'Preparation Supervisor';
  locKeywords: string[];
  catKeywords: string[];
}

/**
 * 29 Agenda Inspeksi K3 Terencana Laboratorium & Preparasi Beserta PIC Terkait
 */
export const INSPECTION_29_AGENDAS: InspectionAgendaItem[] = [
  // 1-4: Laboratory Maintenance Supervisor (4 Items)
  {
    id: 1,
    name: "Inspeksi Umum Terencana Area Maintenance & Workshop",
    picRole: "Laboratory Maintenance Supervisor",
    locKeywords: ["maintenance & workshop", "workshop", "area maintenance"],
    catKeywords: ["maintenance & workshop"]
  },
  {
    id: 2,
    name: "Kepatuhan Alat Pelindung Diri - Maintenance",
    picRole: "Laboratory Maintenance Supervisor",
    locKeywords: ["maintenance"],
    catKeywords: ["kepatuhan alat pelindung diri - maintenance", "apd - maintenance", "apd maintenance"]
  },
  {
    id: 3,
    name: "Inspeksi Perkakas Tangan Portabel",
    picRole: "Laboratory Maintenance Supervisor",
    locKeywords: ["perkakas"],
    catKeywords: ["perkakas tangan", "perkakas portabel", "inspeksi perkakas"]
  },
  {
    id: 4,
    name: "Inspeksi Bulanan Tangga Portabel",
    picRole: "Laboratory Maintenance Supervisor",
    locKeywords: ["tangga portabel", "tangga portable"],
    catKeywords: ["tangga portabel", "tangga portable", "inspeksi tangga"]
  },

  // 5-9: Inventory Control Supervisor (5 Items)
  {
    id: 5,
    name: "Inspeksi Umum Terencana Gudang Chemical",
    picRole: "Inventory Control Supervisor",
    locKeywords: ["gudang chemical", "chemical"],
    catKeywords: ["gudang chemical"]
  },
  {
    id: 6,
    name: "Inspeksi Umum Terencana Gudang Laboratorium",
    picRole: "Inventory Control Supervisor",
    locKeywords: ["gudang laboratorium", "gudang lab"],
    catKeywords: ["gudang laboratorium"]
  },
  {
    id: 7,
    name: "Inspeksi Umum Terencana Gudang Kontainer A",
    picRole: "Inventory Control Supervisor",
    locKeywords: ["gudang kontainer a", "kontainer a"],
    catKeywords: ["gudang kontainer a"]
  },
  {
    id: 8,
    name: "Inspeksi Umum Terencana Gudang Kontainer B",
    picRole: "Inventory Control Supervisor",
    locKeywords: ["gudang kontainer b", "kontainer b"],
    catKeywords: ["gudang kontainer b"]
  },
  {
    id: 9,
    name: "Inspeksi Umum Terencana Gudang Preparasi A & B",
    picRole: "Inventory Control Supervisor",
    locKeywords: ["gudang preparasi a & b", "gudang preparasi a", "gudang preparasi b", "gudang preparasi"],
    catKeywords: ["gudang preparasi"]
  },

  // 10-18: Laboratory Supervisor (9 Items)
  {
    id: 10,
    name: "Inspeksi Umum Terencana Area Kerja R. Chiller, R. UPS, R. XRF",
    picRole: "Laboratory Supervisor",
    locKeywords: ["chiller", "ups", "xrf", "r. chiller"],
    catKeywords: ["chiller", "xrf"]
  },
  {
    id: 11,
    name: "Inspeksi Umum Terencana Area Kerja R. Fusion, R. Timbang & R. Scrubber",
    picRole: "Laboratory Supervisor",
    locKeywords: ["fusion", "timbang", "scrubber", "r. fusion"],
    catKeywords: ["fusion", "scrubber"]
  },
  {
    id: 12,
    name: "Inspeksi Umum Terencana Area Kerja R. Office-QAIC-Admin-Manager-Meeting",
    picRole: "Laboratory Supervisor",
    locKeywords: ["office-qaic", "office - qaic", "manager-meeting", "manager - meeting", "r. office", "ruang office", "r.office", "qaic"],
    catKeywords: ["office-qaic"]
  },
  {
    id: 13,
    name: "Kepatuhan Alat Pelindung Diri - Shift A Lab",
    picRole: "Laboratory Supervisor",
    locKeywords: ["shift a lab", "lab (shift a)", "laboratorium (shift a)"],
    catKeywords: ["shift a lab", "apd - shift a lab", "apd shift a lab"]
  },
  {
    id: 14,
    name: "Kepatuhan Alat Pelindung Diri - Shift B Lab",
    picRole: "Laboratory Supervisor",
    locKeywords: ["shift b lab", "lab (shift b)", "laboratorium (shift b)"],
    catKeywords: ["shift b lab", "apd - shift b lab", "apd shift b lab"]
  },
  {
    id: 15,
    name: "Inspeksi Umum Terencana Area Kerja R. Press, Koridor & Fasilitas Umum Lab",
    picRole: "Laboratory Supervisor",
    locKeywords: ["r. press", "fasilitas umum lab", "koridor & fasilitas umum lab", "koridor lab"],
    catKeywords: ["r. press", "koridor & fasilitas umum lab"]
  },
  {
    id: 16,
    name: "Checklist Isi Kotak P3K - Lab",
    picRole: "Laboratory Supervisor",
    locKeywords: ["p3k - lab", "p3k lab", "p3k laboratorium"],
    catKeywords: ["kotak p3k laboratorium", "kotak p3k - lab", "p3k laboratorium", "p3k lab"]
  },
  {
    id: 17,
    name: "Formulir Kelengkapan Saranaprasarana Unit",
    picRole: "Laboratory Supervisor",
    locKeywords: ["saranaprasarana unit"],
    catKeywords: ["saranaprasarana unit", "sarana prasarana unit", "kelengkapan saranaprasarana"]
  },
  {
    id: 18,
    name: "Inspeksi Harian Pra Pakai Tabung Gas Bertekanan",
    picRole: "Laboratory Supervisor",
    locKeywords: ["tabung gas"],
    catKeywords: ["tabung gas bertekanan", "tabung gas"]
  },

  // 19-29: Preparation Supervisor, Wet & Preparation Supervisor, Dry (11 Items)
  {
    id: 19,
    name: "Inspeksi Umum Terencana Area Kerja Preparasi Basah (Area Kerja)",
    picRole: "Preparation Supervisor",
    locKeywords: ["preparasi basah (area kerja)", "prep basah (area kerja)"],
    catKeywords: ["preparasi basah (area kerja)"]
  },
  {
    id: 20,
    name: "Inspeksi Umum Terencana Area Kerja Preparasi Basah (Office, Toilet, Loker)",
    picRole: "Preparation Supervisor",
    locKeywords: ["preparasi basah (office", "prep basah (office", "toilet - loker", "toilet, loker"],
    catKeywords: ["preparasi basah (office"]
  },
  {
    id: 21,
    name: "Inspeksi Umum Terencana Area Kerja Preparasi Kering (Area Kerja, Halte, & Parkiran)",
    picRole: "Preparation Supervisor",
    locKeywords: ["preparasi kering (area kerja", "prep kering (area kerja", "halte, & parkiran", "halte - parkiran", "halte, parkiran"],
    catKeywords: ["preparasi kering (area kerja"]
  },
  {
    id: 22,
    name: "Inspeksi Umum Terencana Area Kerja Preparasi Kering (Office, Dust Collector & Kompresor)",
    picRole: "Preparation Supervisor",
    locKeywords: ["preparasi kering (office", "prep kering (office", "dust collector", "kompresor"],
    catKeywords: ["preparasi kering (office"]
  },
  {
    id: 23,
    name: "Kepatuhan Alat Pelindung Diri - Shift A Prep",
    picRole: "Preparation Supervisor",
    locKeywords: ["shift a prep", "preparation (shift a)", "prep (shift a)"],
    catKeywords: ["shift a prep", "apd - shift a prep", "apd shift a prep"]
  },
  {
    id: 24,
    name: "Kepatuhan Alat Pelindung Diri - Shift B Prep",
    picRole: "Preparation Supervisor",
    locKeywords: ["shift b prep", "preparation (shift b)", "prep (shift b)"],
    catKeywords: ["shift b prep", "apd - shift b prep", "apd shift b prep"]
  },
  {
    id: 25,
    name: "Inspeksi Umum Terencana Gudang Arsip",
    picRole: "Preparation Supervisor",
    locKeywords: ["gudang arsip", "arsip"],
    catKeywords: ["gudang arsip"]
  },
  {
    id: 26,
    name: "Inspeksi Umum Terencana Gudang Transit & R. Pantry",
    picRole: "Preparation Supervisor",
    locKeywords: ["gudang transit", "r. pantry", "pantry"],
    catKeywords: ["gudang transit"]
  },
  {
    id: 27,
    name: "Inspeksi Umum Terencana Koridor, Depan Kontainer & Area Carpenter",
    picRole: "Preparation Supervisor",
    locKeywords: ["carpenter", "koridor, depan kontainer", "koridor - depan kontainer", "area carpenter", "depan kontainer"],
    catKeywords: ["carpenter", "koridor, depan kontainer"]
  },
  {
    id: 28,
    name: "Checklist Isi Kotak P3K - Prep Kering",
    picRole: "Preparation Supervisor",
    locKeywords: ["p3k - prep kering", "p3k prep kering"],
    catKeywords: ["kotak p3k preparasi kering", "p3k preparasi kering", "p3k prep kering", "kotak p3k - prep kering"]
  },
  {
    id: 29,
    name: "Checklist Isi Kotak P3K - Prep Basah",
    picRole: "Preparation Supervisor",
    locKeywords: ["p3k - prep basah", "p3k prep basah"],
    catKeywords: ["kotak p3k preparasi basah", "p3k preparasi basah", "p3k prep basah", "kotak p3k - prep basah"]
  }
];

/**
 * Normalisasi jabatan karyawan menjadi salah satu peran PIC supervisor standar
 */
export function normalizeUserRole(jabatan?: string | null): SupervisorRole {
  if (!jabatan) return 'Other';
  const j = jabatan.toLowerCase().trim();

  if (j.includes('maintenance supervisor')) {
    return 'Laboratory Maintenance Supervisor';
  }
  if (j.includes('inventory control supervisor')) {
    return 'Inventory Control Supervisor';
  }
  if (j.includes('laboratory supervisor')) {
    return 'Laboratory Supervisor';
  }
  if (j.includes('preparation supervisor') || j.includes('supervisor, wet') || j.includes('supervisor, dry')) {
    return 'Preparation Supervisor';
  }
  if (j.includes('superintendent')) {
    return 'Superintendent';
  }
  if (j.includes('manager')) {
    return 'Manager';
  }
  return 'Other';
}

/**
 * Mencari agenda inspeksi dan PIC role yang cocok untuk sebuah tiket temuan K3
 */
export function matchTicketToAgenda(ticket: any): InspectionAgendaItem | null {
  const loc = (ticket.location || ticket.area || '').toLowerCase().trim();
  const cat = (ticket.category || '').toLowerCase().trim();
  const desc = (ticket.description || '').toLowerCase().trim();

  // 1. Prioritas Utama: Pencocokan LOKASI spesifik jika ada
  if (loc && loc !== '-' && loc !== 'area') {
    for (const agenda of INSPECTION_29_AGENDAS) {
      for (const kw of agenda.locKeywords) {
        if (loc.includes(kw)) {
          return agenda;
        }
      }
    }
  }

  // 2. Prioritas Kedua: Pencocokan KATEGORI / FORM TITLE
  if (cat && cat !== '-' && cat !== 'inspeksi mingguan') {
    for (const agenda of INSPECTION_29_AGENDAS) {
      for (const kw of agenda.catKeywords) {
        if (cat.includes(kw)) {
          return agenda;
        }
      }
    }
  }

  // 3. Prioritas Ketiga: Pencocokan teks DESKRIPSI temuan
  for (const agenda of INSPECTION_29_AGENDAS) {
    for (const kw of agenda.catKeywords) {
      if (desc.includes(kw)) {
        return agenda;
      }
    }
    for (const kw of agenda.locKeywords) {
      if (desc.includes(kw)) {
        return agenda;
      }
    }
  }

  // 4. Fallback jika masih belum cocok
  if (loc.includes('workshop') || loc.includes('maintenance')) {
    return INSPECTION_29_AGENDAS[0];
  }
  if (loc.includes('chemical') || loc.includes('kontainer') || (loc.includes('gudang') && !loc.includes('arsip') && !loc.includes('transit'))) {
    return INSPECTION_29_AGENDAS[4];
  }
  if (loc.includes('lab') || loc.includes('xrf') || loc.includes('chiller') || loc.includes('fusion') || loc.includes('timbang') || loc.includes('press')) {
    return INSPECTION_29_AGENDAS[9];
  }
  if (loc.includes('prep') || loc.includes('arsip') || loc.includes('transit') || loc.includes('carpenter')) {
    return INSPECTION_29_AGENDAS[18];
  }

  return null;
}

/**
 * Mendapatkan seluruh temuan terbuka (OPEN / PROGRESS) yang berada di bawah wewenang user yang sedang login
 */
export function getOpenFindingsForSupervisor(userJabatan: string | null | undefined, ticketsList: any[]): {
  isSupervisor: boolean;
  userRole: SupervisorRole;
  openFindings: any[];
} {
  const userRole = normalizeUserRole(userJabatan);
  const isSuper = userRole === 'Superintendent' || userRole === 'Manager';
  const isSupervisor = userRole !== 'Other' || isSuper;

  if (!isSupervisor) {
    return { isSupervisor: false, userRole, openFindings: [] };
  }

  // Hanya periksa tiket inspeksi K3 yang belum selesai (OPEN atau PROGRESS)
  const activeTickets = (ticketsList || []).filter(t => {
    if (t.source === 'internal') return false;
    const st = (t.status || '').toUpperCase();
    return st === 'OPEN' || st === 'PROGRESS';
  });

  // Jika Superintendent atau Manager, awasi semua temuan terbuka
  if (isSuper) {
    return {
      isSupervisor: true,
      userRole,
      openFindings: activeTickets
    };
  }

  // Filter temuan yang cocok dengan peran Supervisor ini
  const matchedFindings = activeTickets.filter(t => {
    const agenda = matchTicketToAgenda(t);
    if (!agenda) return false;
    return agenda.picRole === userRole;
  });

  return {
    isSupervisor: true,
    userRole,
    openFindings: matchedFindings
  };
}
