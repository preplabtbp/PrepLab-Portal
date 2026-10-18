/**
 * Utilitas Deteksi ID Sampel & Kode Standar Pintar (Smart Sample ID Extractor)
 * Mendukung identifikasi dinamis CRM tanpa hardcoding kaku untuk WDXRF (Supermini 200 & Zetium A/B)
 * dan EDXRF (Epsilon 4 & S2 PUMA).
 */

export interface SmartStandardResult {
  standardCode: string;
  displayName: string;
  originalLabel: string;
  isRecognizedCrm: boolean;
  category: 'BLANK' | 'OREAS' | 'LIMONITE' | 'SAPROLITE' | 'CRM_OTHER' | 'CUSTOM';
}

/**
 * Ekstraksi Pintar: Mengubah label sampel (misal: "VER-OREAS 184 22/09/2026 B" atau "VER-BLANK B")
 * menjadi standardCode bersih (misal: "OREAS184", "BLANK_B") dan label tampilan ("OREAS 184").
 */
export function extractSmartStandardCode(rawLabel: string): SmartStandardResult {
  const original = String(rawLabel || '').trim();
  if (!original) {
    return {
      standardCode: 'UNKNOWN',
      displayName: 'UNKNOWN',
      originalLabel: original,
      isRecognizedCrm: false,
      category: 'CUSTOM',
    };
  }

  // 1. BLANK A
  if (/\bBLANK[\s_]*A\b/i.test(original)) {
    return {
      standardCode: 'BLANK_A',
      displayName: 'BLANK A',
      originalLabel: original,
      isRecognizedCrm: true,
      category: 'BLANK',
    };
  }

  // 2. BLANK B (atau VER-BLANK B)
  if (/\b(VER[\s_-]*)?BLANK[\s_]*B\b/i.test(original)) {
    return {
      standardCode: 'BLANK_B',
      displayName: 'VER-BLANK B',
      originalLabel: original,
      isRecognizedCrm: true,
      category: 'BLANK',
    };
  }

  // Blank generik jika hanya berisi kata "BLANK"
  if (/^BLANK\b/i.test(original) && !/BLANK\s*(WAX|LICO)/i.test(original)) {
    return {
      standardCode: 'BLANK_A',
      displayName: original || 'BLANK',
      originalLabel: original,
      isRecognizedCrm: true,
      category: 'BLANK',
    };
  }

  // 3. Bersihkan prefix operasional standar laboratorium: VER-, CAL-, STD-, QC-, CHECK-
  let cleaned = original.replace(/^(VER|CAL|STD|QC|CHECK)[\s_-]+/i, '').trim();

  // 4. Bersihkan suffix umum:
  // - Tanggal prep (contoh: 22/09/2026, 22-09-2026, 2026-09-22)
  cleaned = cleaned.replace(/\b\d{1,4}[-/]\d{1,2}[-/]\d{2,4}\b/g, '').trim();
  // - Cup / Disc single letter di ujung kata (contoh: " B", " A", " C")
  cleaned = cleaned.replace(/\s+[A-Za-z]$/, '').trim();
  // - Suffix nomor sample prep / aliquot (contoh: "-01", "#1")
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // 5. Cek OREAS (Contoh: "OREAS 184", "OREAS184", "OREAS 186", "OREAS 192", dsb.)
  const oMatch = cleaned.match(/\bOREAS[\s_-]*([0-9]+[a-zA-Z]?)\b/i);
  if (oMatch) {
    const num = oMatch[1].toUpperCase();
    return {
      standardCode: `OREAS${num}`,
      displayName: `OREAS ${num}`,
      originalLabel: original,
      isRecognizedCrm: true,
      category: 'OREAS',
    };
  }

  // 6. Cek Limonite (LIM 01 s/d LIM 05, LIM 13, dsb.)
  const limMatch = cleaned.match(/\bLIM[\s_-]*([0-9]+)\b/i);
  if (limMatch) {
    const rawNum = limMatch[1];
    const padded = rawNum.length === 1 ? `0${rawNum}` : rawNum;
    return {
      standardCode: `LIM${padded}`,
      displayName: `LIM ${padded}`,
      originalLabel: original,
      isRecognizedCrm: true,
      category: 'LIMONITE',
    };
  }

  // 7. Cek Saprolite (SAP 16, SAP 19, SAP 20, dsb.)
  const sapMatch = cleaned.match(/\bSAP[\s_-]*([0-9]+)\b/i);
  if (sapMatch) {
    const num = sapMatch[1];
    return {
      standardCode: `SAP${num}`,
      displayName: `SAP ${num}`,
      originalLabel: original,
      isRecognizedCrm: true,
      category: 'SAPROLITE',
    };
  }

  // 8. Cek BRK (BRK 03, BRK03, BRK)
  const brkMatch = cleaned.match(/\bBRK[\s_-]*([0-9]*)\b/i);
  if (brkMatch) {
    const rawNum = brkMatch[1];
    const num = rawNum ? (rawNum.length === 1 ? `0${rawNum}` : rawNum) : '03';
    return {
      standardCode: `BRK${num}`,
      displayName: `BRK ${num}`,
      originalLabel: original,
      isRecognizedCrm: true,
      category: 'CRM_OTHER',
    };
  }

  // 9. Cek ZBK (ZBK 411, ZBK411, ZBK 412, ZBK412)
  const zbkMatch = cleaned.match(/\bZBK[\s_-]*([0-9]+)\b/i);
  if (zbkMatch) {
    const num = zbkMatch[1];
    return {
      standardCode: `ZBK${num}`,
      displayName: `ZBK ${num}`,
      originalLabel: original,
      isRecognizedCrm: true,
      category: 'CRM_OTHER',
    };
  }

  // 10. Cek NILTRT (NILTRT 11, NILTRT 45, dsb.)
  const nilMatch = cleaned.match(/\bNILTRT[\s_-]*([0-9]+)\b/i);
  if (nilMatch) {
    const num = nilMatch[1];
    return {
      standardCode: `NILTRT${num}`,
      displayName: `NILTRT ${num}`,
      originalLabel: original,
      isRecognizedCrm: true,
      category: 'CRM_OTHER',
    };
  }

  // 11. Cek OB (Overburden CRM standalone)
  if (/^OB\b/i.test(cleaned)) {
    return {
      standardCode: 'OB',
      displayName: 'OB',
      originalLabel: original,
      isRecognizedCrm: true,
      category: 'LIMONITE',
    };
  }

  // 12. Cek Standar CRM Internasional Lain (GBW, NIST, SARM, AMIS, JDO, BCS, BAS)
  const crmMatch = cleaned.match(/\b(GBW|NIST|SARM|AMIS|JDO|BCS|BAS|SY)[\s_-]*([0-9A-Za-z]+)\b/i);
  if (crmMatch) {
    const prefix = crmMatch[1].toUpperCase();
    const id = crmMatch[2].toUpperCase();
    return {
      standardCode: `${prefix}${id}`,
      displayName: `${prefix} ${id}`,
      originalLabel: original,
      isRecognizedCrm: true,
      category: 'CRM_OTHER',
    };
  }

  // 9. Fallback Cerdas: Ambil kata pertama yang tersisa dan sanitasi
  const firstWord = cleaned.split(/[\s,]+/)[0];
  const sanitized = firstWord.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (sanitized.length >= 2) {
    return {
      standardCode: sanitized,
      displayName: firstWord.toUpperCase(),
      originalLabel: original,
      isRecognizedCrm: false,
      category: 'CUSTOM',
    };
  }

  // Fallback absolut
  const fallbackCode = original.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'UNKNOWN';
  return {
    standardCode: fallbackCode,
    displayName: original || 'UNKNOWN',
    originalLabel: original,
    isRecognizedCrm: false,
    category: 'CUSTOM',
  };
}

/**
 * Cek apakah instrumen merupakan WDXRF
 */
export function isWdxrfInstrument(instrumentCode: string): boolean {
  return ['SUPERMINI', 'ZETIUM_A', 'ZETIUM_B'].includes(String(instrumentCode || '').toUpperCase());
}

/**
 * Dapatkan profil WDXRF (Supermini GTS vs Zetium TBP)
 */
export function getWdxrfProfile(instrumentCode: string) {
  const code = String(instrumentCode || '').toUpperCase();
  const isSupermini = code === 'SUPERMINI';
  const isZetiumA = code === 'ZETIUM_A';
  const isZetiumB = code === 'ZETIUM_B';
  const isZetium = isZetiumA || isZetiumB;

  return {
    isWdxrf: isSupermini || isZetium,
    isSupermini,
    isZetium,
    site: isSupermini ? 'GTS' : (isZetium ? 'TBP' : 'TBP'),
    brand: isSupermini ? 'Rigaku Supermini 200' : (isZetium ? 'Malvern PANalytical Zetium' : 'Unknown'),
    label: isSupermini ? 'Supermini 200 (GTS)' : (isZetiumA ? 'Zetium A (TBP)' : (isZetiumB ? 'Zetium B (TBP)' : code)),
    defaultSetCount: 17,
  };
}

/**
 * Format tampilan nama standar yang rapi
 */
export function formatStandardDisplayName(standardCode: string): string {
  const clean = String(standardCode || '').trim();
  if (clean === 'BLANK_A') return 'BLANK A';
  if (clean === 'BLANK_B') return 'VER-BLANK B';
  if (/^LIM0?([1-5]|13)$/i.test(clean)) {
    const num = clean.replace(/LIM0?/i, '');
    return `LIM ${num.padStart(2, '0')}`;
  }
  if (/^OREAS\d+/i.test(clean)) {
    const num = clean.replace(/OREAS/i, '');
    return `OREAS ${num}`;
  }
  if (/^SAP\d+/i.test(clean)) {
    const num = clean.replace(/SAP/i, '');
    return `SAP ${num}`;
  }
  if (/^BRK\d+/i.test(clean)) {
    const num = clean.replace(/BRK0?/i, '');
    return `BRK ${num.padStart(2, '0')}`;
  }
  if (/^ZBK\d+/i.test(clean)) {
    const num = clean.replace(/ZBK/i, '');
    return `ZBK ${num}`;
  }
  if (/^NILTRT\d+/i.test(clean)) {
    const num = clean.replace(/NILTRT/i, '');
    return `NILTRT ${num}`;
  }
  if (clean === 'OB') return 'OB';
  if (clean === 'LIM') return 'LIM';
  if (clean === 'SAP') return 'SAP';
  return clean.replace(/_/g, ' ');
}
