/**
 * equipmentNormalizer.ts
 * Single source of truth for normalizing equipment names, codes, and categories,
 * particularly for Non-Instrument items in PrepLab which historically suffer from
 * varied naming, typos, and fragmented metrics.
 */

export interface NormalizedEquipment {
  name: string;
  code: string;
  category: 'Instrument (L)' | 'Non-Instrument (PL)' | 'Test';
  isInstrument: boolean;
  isTest: boolean;
}

export interface StandardNonInstrumentItem {
  name: string;
  code: string;
  categoryGroup: string;
  description: string;
  keywords: string[];
  detailPlaceholder: string;
}

export const STANDARD_NON_INSTRUMENT_CATALOG: StandardNonInstrumentItem[] = [
  {
    name: 'Perangkat IT & Kelistrikan',
    code: 'IT',
    categoryGroup: 'IT & Kelistrikan',
    description: 'PC, CPU, Monitor, UPS, Printer, Kabel, Jaringan & Kelistrikan',
    keywords: ['pc', 'cpu', 'komputer', 'computer', 'monitor', 'layar monitor', 'keyboard', 'mouse', 'ups', 'kabel', 'colokan', 'stop kontak', 'printer', 'scanner', 'it', 'kelistrikan', 'server', 'jaringan', 'lan', 'wifi', 'adaptor', 'power supply', 'saklar', 'mcb', 'laptop'],
    detailPlaceholder: 'Contoh: PC Desktop Ruang Timbang No. 2, CPU Dell Optiplex, Monitor Samsung...'
  },
  {
    name: 'Air Conditioner (AC)',
    code: 'AC',
    categoryGroup: 'HVAC & Fasilitas',
    description: 'Unit pendingin ruangan AC split, remote, indoor, outdoor',
    keywords: ['ac', 'air conditioner', 'pendingin ruangan', 'hvac', 'daikin', 'panasonic', 'remote ac', 'indoor ac', 'outdoor ac', 'freon', 'swing ac', 'filter ac'],
    detailPlaceholder: 'Contoh: AC Split Daikin 2PK Ruang Prep, AC Panasonic Ruang Timbang...'
  },
  {
    name: 'Exhaust Fan',
    code: 'EXH',
    categoryGroup: 'HVAC & Fasilitas',
    description: 'Exhaust fan, blower udara, ventilasi hisap',
    keywords: ['exhaust', 'exhaust fan', 'blower', 'kipas hisap', 'ventilasi', 'exos', 'sedot udara'],
    detailPlaceholder: 'Contoh: Exhaust Fan Line 1 Area Pulverizer...'
  },
  {
    name: 'Lampu & Penerangan',
    code: 'LMP',
    categoryGroup: 'HVAC & Fasilitas',
    description: 'Lampu penerangan, bohlam, LED, neon, fitting',
    keywords: ['lampu', 'bohlam', 'led', 'penerangan', 'fitting lampu', 'neon', 'lampu tl', 'downlight', 'lampu darurat'],
    detailPlaceholder: 'Contoh: Lampu LED TL Ruang Kimia Baris 2...'
  },
  {
    name: 'Plafon',
    code: 'PLF',
    categoryGroup: 'Fasilitas & Bangunan',
    description: 'Plafon ruangan, langit-langit, gypsum',
    keywords: ['plafon', 'plafon retak', 'atap', 'langit-langit', 'gypsum', 'ceiling'],
    detailPlaceholder: 'Contoh: Plafon Gypsum Retak Area Ruang Timbang...'
  },
  {
    name: 'Dinding & Partisi Fasilitas',
    code: 'PRT',
    categoryGroup: 'Fasilitas & Bangunan',
    description: 'Dinding, partisi ruangan, lantai, sekat ruangan',
    keywords: ['dinding', 'partisi', 'tembok', 'sekat', 'lantai', 'keramik', 'roda sekat', 'cat dinding'],
    detailPlaceholder: 'Contoh: Partisi Geser Ruang Prep, Keramik Lantai Retak...'
  },
  {
    name: 'Pintu & Aksesoris',
    code: 'PNT',
    categoryGroup: 'Fasilitas & Bangunan',
    description: 'Pintu ruangan, handle, kunci, engsel, door closer',
    keywords: ['pintu', 'door', 'gagang pintu', 'handle pintu', 'kunci pintu', 'kunci', 'engsel', 'door closer', 'rel pintu', 'roda pintu'],
    detailPlaceholder: 'Contoh: Handle Pintu Masuk Ruang XRF, Engsel Pintu Utama...'
  },
  {
    name: 'Kursi & Bangku',
    code: 'KRS',
    categoryGroup: 'Fasilitas Kerja & Ergonomi',
    description: 'Kursi kerja teknisi, kursi putar, bangku',
    keywords: ['kursi', 'bangku', 'kursi putar', 'chair', 'stool', 'kursi kerja', 'roda kursi', 'hidrolik kursi'],
    detailPlaceholder: 'Contoh: Kursi Putar Hidrolik Meja Analis 3...'
  },
  {
    name: 'Meja Kerja (Workbench)',
    code: 'WB',
    categoryGroup: 'Fasilitas Kerja & Ergonomi',
    description: 'Meja kerja analisa, workbench, meja preparasi',
    keywords: ['meja', 'meja kerja', 'workbench', 'workbanch', 'meja prep', 'table', 'laci meja'],
    detailPlaceholder: 'Contoh: Meja Kerja Stainless Ruang Preparasi 2...'
  },
  {
    name: 'Papan Informasi & Dokumen',
    code: 'INF',
    categoryGroup: 'Fasilitas Kerja & Ergonomi',
    description: 'Papan mading, whiteboard, box dokumen',
    keywords: ['papan informasi', 'whiteboard', 'papan tulis', 'box dokumen', 'folder dokumen', 'mading'],
    detailPlaceholder: 'Contoh: Whiteboard Jadwal Kerja, Box Dokumen SOP...'
  },
  {
    name: 'Perkakas / Tooling',
    code: 'TLS',
    categoryGroup: 'Fasilitas Kerja & Ergonomi',
    description: 'Toolbox, martil, obeng, tang, kunci pas',
    keywords: ['perkakas', 'tooling', 'martil', 'palu', 'tang', 'obeng', 'kunci inggris', 'kunci pas', 'cutter', 'kunci l'],
    detailPlaceholder: 'Contoh: Kunci Inggris 12 Inch, Martil Karet...'
  },
  {
    name: 'Keran & Pipa Air',
    code: 'KRN',
    categoryGroup: 'Utilitas & Plumbing',
    description: 'Keran air wastafel, pipa instalasi air, saluran pembuangan',
    keywords: ['keran', 'kran', 'pipa', 'pipa air', 'wastafel', 'sink', 'saluran air', 'plumbing', 'valve air', 'selang air', 'bocor air'],
    detailPlaceholder: 'Contoh: Keran Wastafel Ruang Cuci Sampel...'
  },
  {
    name: 'Eye Wash',
    code: 'EW',
    categoryGroup: 'Utilitas & K3',
    description: 'Stasiun pencuci mata darurat dan safety shower',
    keywords: ['eye wash', 'eyewash', 'pencuci mata', 'shower keselamatan', 'safety shower'],
    detailPlaceholder: 'Contoh: Eye Wash Stasiun Dekat Ruang Asam...'
  },
  {
    name: 'Kompresor & Selang Udara',
    code: 'KMP',
    categoryGroup: 'Utilitas & Pneumatik',
    description: 'Kompresor udara, selang angin, nepel, regulator pneumatik',
    keywords: ['kompresor', 'compressor', 'selang kompresor', 'selang angin', 'air hose', 'pressure gauge', 'pneumatik', 'nepel kompresor'],
    detailPlaceholder: 'Contoh: Selang Angin Kompresor Line Crusher...'
  },
  {
    name: 'Selang Gas & Regulator',
    code: 'SGR',
    categoryGroup: 'Utilitas & Gas',
    description: 'Regulator tabung gas, selang gas helium/argon/nitrogen',
    keywords: ['selang gas', 'regulator', 'gas', 'tabung gas', 'helium', 'argon', 'acetylene', 'nitrogen', 'lpg'],
    detailPlaceholder: 'Contoh: Regulator Gas Helium Instrumen ICP...'
  },
  {
    name: 'Scrubber',
    code: 'SCB',
    categoryGroup: 'Utilitas & Lingkungan',
    description: 'Unit scrubber basah, pompa scrubber, saluran sirkulasi',
    keywords: ['scrubber', 'scruber', 'pompa scrubber', 'nozzle scrubber', 'pipa scrubber', 'exhaust scrubber'],
    detailPlaceholder: 'Contoh: Pompa Sirkulasi Wet Scrubber Area Wet Lab...'
  },
  {
    name: 'Gerobak Arco',
    code: 'GA',
    categoryGroup: 'Alat Operasional Preparasi',
    description: 'Gerobak dorong roda satu untuk mobilisasi sampel',
    keywords: ['gerobak', 'arco', 'artco', 'argo', 'arko', 'wheelbarrow', 'ban gerobak', 'roda arco'],
    detailPlaceholder: 'Contoh: Gerobak Arco No. 03 Area Depan Drying...'
  },
  {
    name: 'Sekop JIS 30D',
    code: 'JIS30',
    categoryGroup: 'Alat Operasional Preparasi',
    description: 'Sekop standar JIS 30D preparasi sampel',
    keywords: ['sekop jis 30d', 'jis 30d', 'jis 30', 'sekop 30d', 'shovel 30d'],
    detailPlaceholder: 'Contoh: Sekop JIS 30D Meja Homogenisasi 1...'
  },
  {
    name: 'Sekop JIS 15D',
    code: 'JIS15',
    categoryGroup: 'Alat Operasional Preparasi',
    description: 'Sekop standar JIS 15D preparasi sampel',
    keywords: ['sekop jis 15d', 'jis 15d', 'jis 15', 'sekop 15d', 'shovel 15d'],
    detailPlaceholder: 'Contoh: Sekop JIS 15D Line Sub-Sampling...'
  },
  {
    name: 'Sekop Besar / Ujung Rata',
    code: 'SKP-B',
    categoryGroup: 'Alat Operasional Preparasi',
    description: 'Sekop plat rata / sekop besar mobilisasi material',
    keywords: ['sekop besar', 'sekop rata', 'sekop kotak', 'sekop tanah', 'sekop cor', 'sekop plat'],
    detailPlaceholder: 'Contoh: Sekop Besar Plat No. 2 Area Penumpukan...'
  },
  {
    name: 'Sekop Mixing',
    code: 'SKP-M',
    categoryGroup: 'Alat Operasional Preparasi',
    description: 'Sekop kecil pencampuran sampel (mixing scoop)',
    keywords: ['sekop mixing', 'sekop aduk', 'mixing shovel', 'sendok mixing'],
    detailPlaceholder: 'Contoh: Sekop Mixing Stainless Meja Pembagian...'
  },
  {
    name: 'Sekrap',
    code: 'SKR',
    categoryGroup: 'Alat Operasional Preparasi',
    description: 'Kape / sekrap pembersih baki dan meja preparasi',
    keywords: ['sekrap', 'scrap', 'scraper', 'kape', 'spatula prep', 'kapi'],
    detailPlaceholder: 'Contoh: Sekrap Gagang Kayu 4 Inch Meja 2...'
  },
  {
    name: 'Ayakan Screen Test 200 Mesh',
    code: 'AYK',
    categoryGroup: 'Alat Operasional Preparasi',
    description: 'Ayakan uji metalurgi ukuran 200 mesh',
    keywords: ['ayakan', 'screen test', 'mesh 200', 'ayakan 200', 'sieve 200', 'kasa ayakan'],
    detailPlaceholder: 'Contoh: Ayakan Stainless Mesh 200 No. Seri 04...'
  },
  {
    name: 'Sieve Shaker',
    code: 'SS',
    categoryGroup: 'Alat Operasional Preparasi',
    description: 'Mesin penggetar ayakan mekanikal',
    keywords: ['sieve shaker', 'shaker ayakan', 'mesin getar ayakan'],
    detailPlaceholder: 'Contoh: Sieve Shaker Retsch Meja Pengayakan...'
  },
  {
    name: 'Evacuable Pellet Disk',
    code: 'EPD',
    categoryGroup: 'Alat Operasional Preparasi',
    description: 'Cetakan / die pellet press XRF',
    keywords: ['evacuable', 'pellet disk', 'pelet disk', 'mold press', 'cetakan pellet', 'dies press'],
    detailPlaceholder: 'Contoh: Pellet Disk 40mm Set B Ruang Press...'
  },
  {
    name: 'Aksesori Pulverizer (Talang/Platform)',
    code: 'PLV-ACC',
    categoryGroup: 'Alat Operasional Preparasi',
    description: 'Talang corong insert dan platform dudukan pulverizer',
    keywords: ['talang pulverizer', 'platform insert', 'talang corong', 'aksesori pulverizer', 'corong pulverizer'],
    detailPlaceholder: 'Contoh: Talang Corong Pulverizer Ring Mill Unit 2...'
  },
  {
    name: 'Perlengkapan Ruang Press',
    code: 'PRS-ACC',
    categoryGroup: 'Alat Operasional Preparasi',
    description: 'Karpet peredam, gagang cutter pelindung ruang press',
    keywords: ['ruang press', 'karpet press', 'gagang cutter press', 'perlengkapan press'],
    detailPlaceholder: 'Contoh: Karpet Pelindung Lantai Depan Mesin Press 1...'
  },
  {
    name: 'Tropol Sampel',
    code: 'TRP',
    categoryGroup: 'Alat Operasional Preparasi',
    description: 'Baki / wadah penampung sampel (tropol)',
    keywords: ['tropol', 'tropol sampel', 'tray sampel', 'baki sampel', 'nampan sampel'],
    detailPlaceholder: 'Contoh: Tropol Sampel Stainless No. 12...'
  },
  {
    name: 'Gantungan / Pengait Sampel',
    code: 'GNT',
    categoryGroup: 'Fasilitas Kerja & Ergonomi',
    description: 'Pengait dan rak gantungan kantong sampel',
    keywords: ['gantungan', 'pengait', 'rak gantungan', 'hanger sampel', 'cantolan'],
    detailPlaceholder: 'Contoh: Rak Pengait Sampel Ruang Drying...'
  },
  {
    name: 'Alat Housekeeping (Sapu / Pel / Karet)',
    code: 'HK',
    categoryGroup: 'Sanitasi & Housekeeping',
    description: 'Sapu, kain pel, cukur karet lantai, alat kebersihan',
    keywords: ['sapu', 'sapu lidi', 'sapu ijuk', 'kain pel', 'pel lantai', 'cukur karet', 'tarikan air', 'wiper lantai', 'housekeeping', 'kebersihan'],
    detailPlaceholder: 'Contoh: Tarikan Air Karet Wiper Area Basah, Kain Pel...'
  },
  {
    name: 'Tempat Sampah & Limbah',
    code: 'TSP',
    categoryGroup: 'Sanitasi & Housekeeping',
    description: 'Tempat sampah domestik dan box penampung limbah lab',
    keywords: ['tempat sampah', 'tong sampah', 'box limbah', 'dustbin', 'trash bin', 'bak sampah'],
    detailPlaceholder: 'Contoh: Bak Sampah Tutup Pedal Depan Ruang Kimia...'
  }
];

export const STANDARD_NON_INSTRUMENT_NAMES = STANDARD_NON_INSTRUMENT_CATALOG.map(c => c.name);

/**
 * Smart suggest matching function for equipment categories
 */
export function findSmartSuggest(query: string): { item: StandardNonInstrumentItem; matchType: 'exact-name' | 'keyword' | 'partial'; matchedKeyword?: string; score: number }[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: { item: StandardNonInstrumentItem; matchType: 'exact-name' | 'keyword' | 'partial'; matchedKeyword?: string; score: number }[] = [];

  for (const item of STANDARD_NON_INSTRUMENT_CATALOG) {
    const itemNameLower = item.name.toLowerCase();
    const itemCodeLower = item.code.toLowerCase();

    // 1. Exact or starts-with name or code
    if (itemNameLower === q || itemCodeLower === q) {
      results.push({ item, matchType: 'exact-name', score: 100 });
      continue;
    }

    // 2. Exact keyword match
    const exactKeyword = item.keywords.find(kw => kw.toLowerCase() === q);
    if (exactKeyword) {
      results.push({ item, matchType: 'keyword', matchedKeyword: exactKeyword, score: 90 });
      continue;
    }

    // 3. Name contains query
    if (itemNameLower.includes(q)) {
      results.push({ item, matchType: 'partial', score: 80 });
      continue;
    }

    // 4. Keyword contains query or query contains keyword
    const partialKeyword = item.keywords.find(kw => kw.toLowerCase().includes(q) || q.includes(kw.toLowerCase()));
    if (partialKeyword) {
      results.push({ item, matchType: 'keyword', matchedKeyword: partialKeyword, score: 70 });
      continue;
    }

    // 5. Category group contains query
    if (item.categoryGroup.toLowerCase().includes(q)) {
      results.push({ item, matchType: 'partial', score: 50 });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Normalizes any raw equipment name, code, and category to a consistent, standardized representation.
 * For non-instrument equipment, the code is strictly standardized to avoid fragmented grouping.
 */
export function normalizeEquipment(
  rawName: string | null | undefined,
  rawCode?: string | null | undefined,
  rawCategory?: string | null | undefined
): NormalizedEquipment {
  const code = (rawCode || '').trim() || '-';
  const name = (rawName || '').trim();

  if (!name || name === '-') {
    return {
      name: 'Peralatan Non-Instrument Lainnya',
      code: 'NON-INSTR',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  const lower = name.toLowerCase();

  // 1. Check for Test / Dummy entries (must not collide with metallurgical "screen test")
  if (!lower.includes('screen test') && (
    lower === 'test' || 
    lower.startsWith('test ') || 
    lower.startsWith('testing') || 
    lower.includes('dummy') || 
    lower.includes('percobaan') ||
    lower === 'testing wo' ||
    code.toUpperCase() === 'TEST'
  )) {
    return {
      name: 'Test Entry',
      code: 'TEST',
      category: 'Test',
      isInstrument: false,
      isTest: true
    };
  }

  // 1.5 Direct check against STANDARD_NON_INSTRUMENT_CATALOG
  for (const cat of STANDARD_NON_INSTRUMENT_CATALOG) {
    const catLower = cat.name.toLowerCase();
    if (
      lower === catLower ||
      lower.startsWith(catLower + ' -') ||
      lower.startsWith(catLower + ' (') ||
      lower.startsWith(catLower + ' :') ||
      (code && code !== '-' && code.toUpperCase() === cat.code.toUpperCase())
    ) {
      return {
        name: cat.name,
        code: cat.code,
        category: 'Non-Instrument (PL)',
        isInstrument: false,
        isTest: false
      };
    }
  }

  // 2. Misclassified instruments
  if (lower.includes('modutemp') || lower.includes('jaw crusher') || lower.includes('pulverizer')) {
    if (lower.includes('talang') || lower.includes('platform insert')) {
      return {
        name: 'Aksesori Pulverizer (Talang/Platform)',
        code: 'PLV-ACC',
        category: 'Non-Instrument (PL)',
        isInstrument: false,
        isTest: false
      };
    }
    if (lower.includes('modutemp')) {
      return {
        name: 'MODUTEMP',
        code: code !== '-' ? code : 'MODUTEMP',
        category: 'Instrument (L)',
        isInstrument: true,
        isTest: false
      };
    }
    if (lower.includes('jaw crusher')) {
      return {
        name: 'BIG JAW CRUSHER',
        code: code !== '-' ? code : 'CRUSHER',
        category: 'Instrument (L)',
        isInstrument: true,
        isTest: false
      };
    }
  }

  // Check if it's Mesin Press
  if (lower.includes('mesin press') || lower.includes('mesjn press')) {
    if (lower.includes('karpet') || lower.includes('gagang cutter')) {
      return {
        name: 'Perlengkapan Ruang Press',
        code: 'PRS-ACC',
        category: 'Non-Instrument (PL)',
        isInstrument: false,
        isTest: false
      };
    }
    return {
      name: 'MESIN PRESS',
      code: code !== '-' ? code : 'MP',
      category: 'Instrument (L)',
      isInstrument: true,
      isTest: false
    };
  }

  // 3. Gerobak Arco (arco / argo / arko / artco)
  if (lower.includes('gerobak') || lower.includes('arco') || lower.includes('artco') || lower.includes('argo')) {
    return {
      name: 'Gerobak Arco',
      code: 'GA',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 4. Sieve Shaker vs Ayakan Screen Test
  if (lower.includes('sieve shaker') || lower.includes('shieve shaker')) {
    return {
      name: 'Sieve Shaker',
      code: 'SS',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  if (lower.includes('screen test') || lower.includes('ayakan') || lower.includes('mash') || lower.includes('mesh')) {
    return {
      name: 'Ayakan Screen Test 200 Mesh',
      code: 'AST',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 5. Sekrap
  if (lower.includes('sekrap')) {
    return {
      name: 'Sekrap',
      code: 'SKR',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 6. Sekop / Skop
  if (lower.includes('skop') || lower.includes('sekop')) {
    if (lower.includes('15') || lower.includes('15d') || lower.includes('15 d')) {
      return {
        name: 'Sekop JIS 15D',
        code: 'SK-15D',
        category: 'Non-Instrument (PL)',
        isInstrument: false,
        isTest: false
      };
    }
    if (lower.includes('30') || lower.includes('30d') || lower.includes('30 d') || lower.includes('bangunan')) {
      return {
        name: 'Sekop JIS 30D',
        code: 'SK-30D',
        category: 'Non-Instrument (PL)',
        isInstrument: false,
        isTest: false
      };
    }
    if (lower.includes('mixing')) {
      return {
        name: 'Sekop Mixing',
        code: 'SK-MIX',
        category: 'Non-Instrument (PL)',
        isInstrument: false,
        isTest: false
      };
    }
    return {
      name: 'Sekop Besar / Ujung Rata',
      code: 'SK-BSR',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 7. Lampu & Penerangan
  if (lower.includes('lampu') || lower.includes('bohlam') || lower.includes('balon lampu') || lower.includes('saklar')) {
    return {
      name: 'Lampu & Penerangan',
      code: 'LMP',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 8. Exhaust Fan / Blower
  if (lower.includes('exhaust') || lower.includes('hexos') || lower.includes('blower')) {
    return {
      name: 'Exhaust Fan',
      code: 'EXH',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 9. Pintu, Handle, Kunci, Roda Pintu
  if (lower.includes('pintu') || lower.includes('door') || lower.includes('kunci') || lower.includes('handle pintu')) {
    return {
      name: 'Pintu & Aksesoris',
      code: 'PNT',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 10. Kursi & Bangku
  if (lower.includes('kursi') || lower.includes('bangku')) {
    return {
      name: 'Kursi & Bangku',
      code: 'KRS',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 11. Keran & Pipa Air
  if (lower.includes('keran') || lower.includes('kran') || lower.includes('pipa air')) {
    return {
      name: 'Keran & Pipa Air',
      code: 'KRN',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 12. Meja Kerja / Workbench
  if (lower.includes('workbench') || lower.includes('workbanch') || lower.includes('meja')) {
    return {
      name: 'Meja Kerja (Workbench)',
      code: 'WB',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 13. Plafon & Dinding / Partisi
  if (lower.includes('plafon')) {
    return {
      name: 'Plafon',
      code: 'PLF',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }
  if (lower.includes('dinding') || lower.includes('partisi') || lower.includes('lantai') || lower.includes('roda sekat')) {
    return {
      name: 'Dinding & Partisi Fasilitas',
      code: 'PRT',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 14. Tropol Sampel
  if (lower.includes('tropol')) {
    return {
      name: 'Tropol Sampel',
      code: 'TRP',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 15. Evacuable Pellet Disk
  if (lower.includes('evacuable') || lower.includes('pellet disk')) {
    return {
      name: 'Evacuable Pellet Disk',
      code: 'EPD',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 16. Alat Housekeeping / Sanitasi
  if (
    lower.includes('sapu') || 
    lower.includes('kain pel') || 
    lower.includes('pel lantai') || 
    lower.includes('cukur karet') || 
    lower.includes('tarikan air') || 
    lower.includes('housekeeping')
  ) {
    return {
      name: 'Alat Housekeeping (Sapu / Pel / Karet)',
      code: 'HK',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 17. Tempat Sampah & Box Limbah
  if (lower.includes('tempat sampah') || lower.includes('box limbah') || lower.includes('limbah')) {
    return {
      name: 'Tempat Sampah & Limbah',
      code: 'TSP',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 18. Air Conditioner (AC)
  if (lower.includes('air conditioner') || lower.includes('ac ') || lower === 'ac' || lower.includes('swing ac')) {
    return {
      name: 'Air Conditioner (AC)',
      code: 'AC',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 19. Eye wash
  if (lower.includes('eye wash') || lower.includes('eyewash')) {
    return {
      name: 'Eye Wash',
      code: 'EW',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 20. Scrubber
  if (lower.includes('scrubber')) {
    return {
      name: 'Scrubber',
      code: 'SCB',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 21. Kompresor & Selang
  if (lower.includes('kompresor')) {
    return {
      name: 'Kompresor & Selang Udara',
      code: 'KMP',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }
  if (lower.includes('selang gas') || lower.includes('helium')) {
    return {
      name: 'Selang Gas & Regulator',
      code: 'SGR',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 22. Papan Informasi & Dokumen
  if (lower.includes('papan informasi') || lower.includes('box dokumen')) {
    return {
      name: 'Papan Informasi & Dokumen',
      code: 'INF',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 23. Perkakas / Tooling
  if (lower.includes('martil') || lower.includes('cutter')) {
    return {
      name: 'Perkakas / Tooling',
      code: 'TLS',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 24. IT & Kelistrikan
  if (
    lower.includes('komputer') || 
    lower.includes('monitor') || 
    lower.includes('cpu') || 
    lower.includes('kabel') || 
    lower.includes('ups') || 
    lower.includes('pc') || 
    lower.includes('laptop') || 
    lower.includes('printer') || 
    lower.includes('perangkat it') || 
    lower.includes('kelistrikan')
  ) {
    return {
      name: 'Perangkat IT & Kelistrikan',
      code: 'IT',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 25. Gantungan / Rak Sampel
  if (lower.includes('gantungan') || lower.includes('pengait')) {
    return {
      name: 'Gantungan / Pengait Sampel',
      code: 'GNT',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  const cleanTitle = name.replace(/\s+/g, ' ').trim();
  const isInst = (rawCategory || '').toLowerCase().includes('instrument') && !(rawCategory || '').toLowerCase().includes('non');

  return {
    name: cleanTitle,
    code: isInst ? code : 'NON-INSTR',
    category: isInst ? 'Instrument (L)' : 'Non-Instrument (PL)',
    isInstrument: isInst,
    isTest: false
  };
}
