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

export const STANDARD_NON_INSTRUMENT_NAMES = [
  'Air Conditioner (AC)',
  'Aksesori Pulverizer (Talang/Platform)',
  'Alat Housekeeping (Sapu / Pel / Karet)',
  'Ayakan Screen Test 200 Mesh',
  'Dinding & Partisi Fasilitas',
  'Evacuable Pellet Disk',
  'Exhaust Fan',
  'Eye Wash',
  'Gantungan / Pengait Sampel',
  'Gerobak Arco',
  'Keran & Pipa Air',
  'Kompresor & Selang Udara',
  'Kursi & Bangku',
  'Lampu & Penerangan',
  'Meja Kerja (Workbench)',
  'Papan Informasi & Dokumen',
  'Perangkat IT & Kelistrikan',
  'Perkakas / Tooling',
  'Perlengkapan Ruang Press',
  'Pintu & Aksesoris',
  'Plafon',
  'Scrubber',
  'Sekop Besar / Ujung Rata',
  'Sekop JIS 15D',
  'Sekop JIS 30D',
  'Sekop Mixing',
  'Sekrap',
  'Selang Gas & Regulator',
  'Sieve Shaker',
  'Tempat Sampah & Limbah',
  'Tropol Sampel'
] as const;

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
  if (lower.includes('komputer') || lower.includes('monitor') || lower.includes('cpu') || lower.includes('kabel') || lower.includes('ups')) {
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
