/**
 * excelClipboardParser.ts
 * Parser cerdas untuk membaca data tabel Excel Laporan Harian Laboratorium
 * baik yang dipastekan satu per satu tabel maupun sekaligus semua tabel (horizontal/vertikal grid).
 */

export interface StandardTableRow {
  sample: string;
  outstanding: number;
  received: number;
  finished: number;
  balance: number;
}

export interface MonitoringBeadRow {
  sample: string;
  jadi: number;
  reject: number;
  ra: number;
}

export interface ParsedStationData {
  stationKey: 'weighing' | 'fused' | 'wdxrf' | 'qc_data' | 'press' | 'edxrf' | 'monitoring_bead' | 'loi';
  title: string;
  headers: string[];
  rows: (StandardTableRow | MonitoringBeadRow)[];
  totals: {
    outstanding?: number;
    received?: number;
    finished?: number;
    balance?: number;
    jadi?: number;
    reject?: number;
    ra?: number;
  };
  extras?: {
    verStd?: number;
    ra?: number;
    rr?: number;
    raLoi?: number;
    stdBlank?: { jadi: number; reject: number; ra: number };
  };
}

export interface ParsedClipboardResult {
  rawText: string;
  detectedCount: number;
  stations: Record<string, ParsedStationData>;
}

// Keyword pengenal stasiun
const STATION_PATTERNS: Array<{
  key: ParsedStationData['stationKey'];
  title: string;
  matcher: RegExp;
  isBeadMonitoring?: boolean;
}> = [
  { key: 'weighing', title: 'WEIGHING', matcher: /weighing/i },
  { key: 'fused', title: 'FUSED', matcher: /fused|fusion|peleburan/i },
  { key: 'wdxrf', title: 'WD-XRF', matcher: /wd-?xrf|zetium/i },
  { key: 'qc_data', title: 'QC DATA', matcher: /qc\s*data|data\s*qc/i },
  { key: 'press', title: 'PRESS POWDER', matcher: /press\s*powder|serbuk\s*press|press/i },
  { key: 'edxrf', title: 'ED-XRF (EPSILON)', matcher: /ed-?xrf|epsilon/i },
  { key: 'monitoring_bead', title: 'MONITORING BEAD', matcher: /monitoring\s*bead|bead\s*monitoring/i, isBeadMonitoring: true },
  { key: 'loi', title: 'LOI', matcher: /loi|loss\s*on\s*ignition/i }
];

function cleanNum(val: any): number {
  if (val === undefined || val === null) return 0;
  const s = String(val).replace(/,/g, '').replace(/%/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function normalizeSampleName(raw: string): string {
  let s = String(raw || '').trim().toUpperCase();
  s = s.replace(/\s+/g, ' ');
  if (s.includes('TOTAL')) return 'TOTAL';
  if (s.includes('EXPL')) return 'EXPL';
  if (s.includes('SCANDIUM')) return 'SCANDIUM';
  if (s.includes('STD & BLANK') || s.includes('STD&BLANK') || s.includes('BLANK')) return 'STD & BLANK';
  if (s.includes('STANDARD')) return 'STANDARD';
  return s;
}

/**
 * Mencari tahu stasiun berdasarkan sel judul atau header terdekat
 */
function identifyStationKey(text: string): ParsedStationData['stationKey'] | null {
  const t = text.trim();
  for (const p of STATION_PATTERNS) {
    if (p.matcher.test(t)) {
      return p.key;
    }
  }
  return null;
}

/**
 * Parser Utama Clipboard
 * Menangani parsing grid multi-kolom berdampingan maupun tabel individual bertumpuk.
 */
export function parseExcelClipboardData(pastedText: string): ParsedClipboardResult {
  const result: ParsedClipboardResult = {
    rawText: pastedText,
    detectedCount: 0,
    stations: {}
  };

  if (!pastedText || !pastedText.trim()) {
    return result;
  }

  const rawLines = pastedText.split(/\r?\n/);
  // Buat matrix 2D sel (baris x kolom)
  const grid: string[][] = rawLines.map(line => line.split('\t').map(cell => cell.trim()));

  if (grid.length === 0) return result;

  // Temukan semua anchor tabel (lokasi baris & kolom judul stasiun atau header)
  interface TableAnchor {
    stationKey: ParsedStationData['stationKey'];
    title: string;
    titleRow: number;
    colStart: number;
    colEnd: number;
    headerRow: number;
    isBeadMonitoring: boolean;
  }

  const anchors: TableAnchor[] = [];

  // 1. Pindai baris-baris awal (dan sepanjang sheet) untuk mendeteksi judul tabel
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      const cellVal = row[c];
      if (!cellVal) continue;

      const matchedKey = identifyStationKey(cellVal);
      if (matchedKey) {
        // Cek apakah anchor untuk stasiun ini sudah ditemukan di baris yang sama / dekat
        const alreadyFound = anchors.some(a => a.stationKey === matchedKey && Math.abs(a.titleRow - r) < 3);
        if (!alreadyFound) {
          const config = STATION_PATTERNS.find(p => p.key === matchedKey)!;
          
          // Cari baris header di bawahnya (biasanya r+1 atau baris yang mengandung 'SAMPLE')
          let headerR = r + 1;
          for (let hr = r; hr <= Math.min(r + 3, grid.length - 1); hr++) {
            if (grid[hr] && grid[hr][c] && /sample|sampel/i.test(grid[hr][c])) {
              headerR = hr;
              break;
            }
          }

          // Tentukan rentang kolom (standar 5 kolom: Sample, OS, Rec, Fin, Bal; atau 4 kolom untuk Monitoring Bead)
          const span = config.isBeadMonitoring ? 4 : 5;
          const colEnd = c + span - 1;

          anchors.push({
            stationKey: matchedKey,
            title: config.title,
            titleRow: r,
            colStart: c,
            colEnd,
            headerRow: headerR,
            isBeadMonitoring: Boolean(config.isBeadMonitoring)
          });
        }
      }
    }
  }

  // Jika tidak ditemukan judul stasiun explisit (misal user hanya copy baris header dan datanya saja),
  // kita coba tebak berdasarkan header 'SAMPLE', 'OUTSTANDING', 'RECEIVED', dll.
  if (anchors.length === 0) {
    for (let r = 0; r < Math.min(5, grid.length); r++) {
      const row = grid[r];
      for (let c = 0; c < row.length; c++) {
        if (/sample|sampel/i.test(row[c])) {
          const nextCells = row.slice(c, c + 5).map(x => x.toLowerCase());
          const isBead = nextCells.some(x => /jadi|reject/i.test(x));
          const isStandard = nextCells.some(x => /outstanding|received|finished|balance/i.test(x));
          
          if (isStandard || isBead) {
            // Tebak stasiun default jika tidak ada judul
            anchors.push({
              stationKey: isBead ? 'monitoring_bead' : 'weighing',
              title: isBead ? 'MONITORING BEAD' : 'WEIGHING',
              titleRow: r > 0 ? r - 1 : 0,
              colStart: c,
              colEnd: c + (isBead ? 3 : 4),
              headerRow: r,
              isBeadMonitoring: isBead
            });
          }
        }
      }
    }
  }

  // 2. Ekstrak data untuk masing-masing anchor tabel yang ditemukan
  anchors.forEach(anchor => {
    const { stationKey, title, colStart, colEnd, headerRow, isBeadMonitoring } = anchor;
    
    // Header labels
    const headers = grid[headerRow] ? grid[headerRow].slice(colStart, colEnd + 1) : [];

    const rows: (StandardTableRow | MonitoringBeadRow)[] = [];
    const totals: ParsedStationData['totals'] = {};
    const extras: ParsedStationData['extras'] = {};

    let totalRowReached = false;
    let currentRowIdx = headerRow + 1;

    while (currentRowIdx < grid.length) {
      const line = grid[currentRowIdx];
      if (!line || line.length <= colStart) {
        currentRowIdx++;
        continue;
      }

      const sampleNameRaw = line[colStart] || '';
      const sampleName = normalizeSampleName(sampleNameRaw);

      // Cek apakah sudah menemukan judul tabel lain di kolom ini
      if (currentRowIdx > headerRow + 1 && identifyStationKey(sampleNameRaw)) {
        break; // Sudah masuk ke tabel berikutnya di bawahnya
      }

      // Deteksi baris TOTAL
      if (sampleName === 'TOTAL') {
        totalRowReached = true;
        if (isBeadMonitoring) {
          totals.jadi = cleanNum(line[colStart + 1]);
          totals.reject = cleanNum(line[colStart + 2]);
          totals.ra = cleanNum(line[colStart + 3]);
        } else {
          totals.outstanding = cleanNum(line[colStart + 1]);
          totals.received = cleanNum(line[colStart + 2]);
          totals.finished = cleanNum(line[colStart + 3]);
          totals.balance = cleanNum(line[colStart + 4]);
        }
        currentRowIdx++;
        continue;
      }

      // Baris data sebelum TOTAL
      if (!totalRowReached && sampleName) {
        if (isBeadMonitoring) {
          rows.push({
            sample: sampleName,
            jadi: cleanNum(line[colStart + 1]),
            reject: cleanNum(line[colStart + 2]),
            ra: cleanNum(line[colStart + 3])
          });
        } else {
          rows.push({
            sample: sampleName,
            outstanding: cleanNum(line[colStart + 1]),
            received: cleanNum(line[colStart + 2]),
            finished: cleanNum(line[colStart + 3]),
            balance: cleanNum(line[colStart + 4])
          });
        }
      }

      // Baris Ekstra SETELAH Total (seperti VER & STD, RA, RR pada WDXRF, atau RA LOI pada LOI)
      if (totalRowReached && sampleName) {
        const u = sampleName.toUpperCase();
        if (u.includes('VER') || u.includes('STD')) {
          extras.verStd = cleanNum(line[colStart + 1] || line[colStart + 2] || line[colStart + 3] || line[colStart + 4]);
        } else if (u === 'RA' || u.startsWith('RA ')) {
          extras.ra = cleanNum(line[colStart + 1] || line[colStart + 2] || line[colStart + 3] || line[colStart + 4]);
        } else if (u === 'RR' || u.startsWith('RR ')) {
          extras.rr = cleanNum(line[colStart + 1] || line[colStart + 2] || line[colStart + 3] || line[colStart + 4]);
        } else if (u.includes('RA LOI')) {
          extras.raLoi = cleanNum(line[colStart + 1] || line[colStart + 2] || line[colStart + 3] || line[colStart + 4]);
        } else if (u.includes('STD & BLANK') && isBeadMonitoring) {
          extras.stdBlank = {
            jadi: cleanNum(line[colStart + 1]),
            reject: cleanNum(line[colStart + 2]),
            ra: cleanNum(line[colStart + 3])
          };
        }
      }

      // Berhenti jika sudah menemukan 3 baris kosong berturut-turut setelah total
      if (totalRowReached && !sampleName) {
        break;
      }

      currentRowIdx++;
    }

    // Jika totals belum terisi dari baris 'TOTAL', hitung otomatis dari rows
    if (totals.outstanding === undefined && !isBeadMonitoring) {
      let os = 0, rec = 0, fin = 0, bal = 0;
      rows.forEach(r => {
        const sr = r as StandardTableRow;
        os += sr.outstanding || 0;
        rec += sr.received || 0;
        fin += sr.finished || 0;
        bal += sr.balance || 0;
      });
      totals.outstanding = os;
      totals.received = rec;
      totals.finished = fin;
      totals.balance = bal;
    } else if (totals.jadi === undefined && isBeadMonitoring) {
      let jd = 0, rj = 0, ra = 0;
      rows.forEach(r => {
        const br = r as MonitoringBeadRow;
        jd += br.jadi || 0;
        rj += br.reject || 0;
        ra += br.ra || 0;
      });
      totals.jadi = jd;
      totals.reject = rj;
      totals.ra = ra;
    }

    result.stations[stationKey] = {
      stationKey,
      title,
      headers,
      rows,
      totals,
      extras: Object.keys(extras).length > 0 ? extras : undefined
    };
  });

  result.detectedCount = Object.keys(result.stations).length;
  return result;
}
