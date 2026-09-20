import * as XLSX from 'xlsx';

export interface ParsedEmployee {
  nik: string;
  name: string;
  jabatan: string;
  jobGrade: string;
  section: string;
  gol: string;
  shift: string;
  poh: string;
  pt: string;
  statusMess: string;
  rotation: string;
  tanggalAwalBergabung: string;
  tanggalBergabungTerbaru: string;
  statusKontrak: string;
  department: string;
  position: string;
  statusKaryawan: string;
}

export interface ParsedRosterEntry {
  nik: string;
  date: string; // Format: "1 Jan 26"
  status: string; // D, N, OFF, CT, TRV, etc.
}

export interface ParsedCutiEntry {
  nik?: string;
  name?: string;
  sisaCt: string;
  jatuhTempoCt: string;
}

export interface ParsedRosterResult {
  sheetNames: string[];
  processedSheets: string[];
  employees: ParsedEmployee[];
  rosters: ParsedRosterEntry[];
  cuti: ParsedCutiEntry[];
  dateRange: {
    minDate: string;
    maxDate: string;
    datesCount: number;
    sampleDates: string[];
  };
  stats: {
    staffCount: number;
    crewCount: number;
    totalEmployees: number;
    totalRosterEntries: number;
    cutiEntriesCount: number;
  };
  warnings: string[];
}

const KNOWN_RESIGNED_NIKS = new Set([
  '04D24000052', '02D23000050', '04D25000062', '04D25000045', 'M0405240291',
  'M0210190719', 'M0506260356', 'M0206250825', 'M0203220107', 'M0402240107',
  'M0402230177', 'M0205250595', 'M0201250027', 'M0206250798', 'M0403240137',
  'M0404220419'
]);

/**
 * Normalisasi nilai tanggal ke format portal: "D MMM YY" (misal: "1 Jan 26", "20 Sep 26")
 */
export function formatToPortalDate(raw: any): string | null {
  if (raw === null || raw === undefined) return null;

  // Jika input adalah Date instance
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const p = raw.toDateString().split(' ');
    if (p.length >= 4) {
      const day = parseInt(p[2], 10);
      return `${day} ${p[1]} ${p[3].substring(2)}`;
    }
  }

  // Jika input adalah serial number Excel (contoh: 46000)
  if (typeof raw === 'number' && raw > 20000 && raw < 80000) {
    try {
      const parsedDate = XLSX.SSF.parse_date_code(raw);
      if (parsedDate && parsedDate.y && parsedDate.m && parsedDate.d) {
        const d = new Date(parsedDate.y, parsedDate.m - 1, parsedDate.d);
        const p = d.toDateString().split(' ');
        const day = parseInt(p[2], 10);
        return `${day} ${p[1]} ${p[3].substring(2)}`;
      }
    } catch (e) {}
  }

  const str = String(raw).trim();
  if (!str || str === '-' || str.toLowerCase() === 'tanggal') return null;

  // Format "D/M/YYYY" atau "DD/MM/YYYY" atau "DD-MM-YYYY"
  const slashParts = str.replace(/-/g, '/').split('/');
  if (slashParts.length === 3) {
    const day = parseInt(slashParts[0], 10);
    const month = parseInt(slashParts[1], 10) - 1;
    let year = parseInt(slashParts[2], 10);
    if (year < 100) year += 2000;
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const dateObj = new Date(year, month, day);
      if (!isNaN(dateObj.getTime())) {
        const p = dateObj.toDateString().split(' ');
        return `${parseInt(p[2], 10)} ${p[1]} ${p[3].substring(2)}`;
      }
    }
  }

  // Format "D MMM YYYY" (misal "1 Jan 2026") -> ubah ke "1 Jan 26"
  const spaceParts = str.split(' ');
  if (spaceParts.length === 3 && spaceParts[2].length === 4) {
    const day = parseInt(spaceParts[0], 10);
    const yr = spaceParts[2].substring(2);
    if (!isNaN(day)) {
      return `${day} ${spaceParts[1]} ${yr}`;
    }
  }

  // Jika sudah format "1 Jan 26"
  if (spaceParts.length === 3 && spaceParts[2].length === 2) {
    return str;
  }

  // Fallback standar new Date(str)
  try {
    const fallbackD = new Date(str);
    if (!isNaN(fallbackD.getTime())) {
      const p = fallbackD.toDateString().split(' ');
      return `${parseInt(p[2], 10)} ${p[1]} ${p[3].substring(2)}`;
    }
  } catch (e) {}

  return null;
}

/**
 * Membaca daftar sheet dari file Excel
 */
export function getExcelSheetNames(fileBuffer: ArrayBuffer): string[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  return workbook.SheetNames || [];
}

/**
 * Parsing data Roster dari file Excel PC
 */
export function parseRosterExcel(
  fileBuffer: ArrayBuffer,
  options?: {
    targetSheets?: string[];
  }
): ParsedRosterResult {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const sheetNames = workbook.SheetNames || [];
  const warnings: string[] = [];

  const employeesMap = new Map<string, ParsedEmployee>();
  const rosters: ParsedRosterEntry[] = [];
  const cutiList: ParsedCutiEntry[] = [];
  const uniqueDates = new Set<string>();

  let staffCount = 0;
  let crewCount = 0;
  const processedSheets: string[] = [];

  const sheetsToProcess = options?.targetSheets && options.targetSheets.length > 0
    ? options.targetSheets
    : sheetNames;

  for (const sName of sheetsToProcess) {
    const worksheet = workbook.Sheets[sName];
    if (!worksheet) continue;

    const lowerName = sName.toLowerCase().trim();
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

    if (!rows || rows.length < 2) {
      continue;
    }

    // 1. Cek apakah ini Sheet Cuti Tahunan
    if (lowerName.includes('cuti')) {
      processedSheets.push(sName);
      const headers = (rows[0] || []).map((h: any) => String(h || '').trim().toLowerCase());
      let nikCol = headers.findIndex(h => h.includes('nik'));
      let nameCol = headers.findIndex(h => h.includes('employee name') || h.includes('nama'));
      let tempoCol = headers.findIndex(h => h.includes('tempo') || h.includes('jatuh'));
      let sisaCol = headers.findIndex(h => h.includes('sisa'));

      if (nikCol === -1) nikCol = 2;
      if (nameCol === -1) nameCol = 1;
      if (tempoCol === -1) tempoCol = 6;
      if (sisaCol === -1) sisaCol = 7;

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const nik = String(row[nikCol] || '').trim();
        const name = String(row[nameCol] || '').trim();
        const jatuhTempoCt = String(row[tempoCol] || '').trim();
        const sisaCt = String(row[sisaCol] || '').trim();

        if (nik || name) {
          cutiList.push({ nik, name, sisaCt, jatuhTempoCt });
        }
      }
      continue;
    }

    // 2. Deteksi apakah Sheet Staff atau Sheet Crew
    const isStaffSheet = lowerName.includes('staff') || (!lowerName.includes('crew') && rows[0]?.some((c: any) => String(c).toLowerCase().includes('job grade')));
    const sheetType = isStaffSheet ? 'Staff' : 'Crew';

    // Konfigurasi kolom Staff vs Crew sesuai cetak biru official
    const config = isStaffSheet
      ? {
          colNik: 2,
          colName: 1,
          colJabatan: 3,
          colJobGrade: 4,
          colSection: 5,
          colGol: 6,
          colShift: 7,
          colPoh: 8,
          colPt: 9,
          colStatusMess: 10,
          colRotation: 11,
          colTanggalAwalBergabung: 12,
          colTanggalBergabungTerbaru: 13,
          colStatusKontrak: 14,
          dateStartCol: 15,
        }
      : {
          colNik: 2,
          colName: 1,
          colJabatan: 3,
          colJobGrade: -1,
          colSection: 4,
          colGol: 5,
          colShift: 6,
          colPoh: 7,
          colPt: 8,
          colStatusMess: 9,
          colRotation: 10,
          colTanggalAwalBergabung: 11,
          colTanggalBergabungTerbaru: 12,
          colStatusKontrak: 13,
          dateStartCol: 14,
        };

    // Cari baris header tanggal (biasanya baris 0 atau 1)
    let dateRowIndex = 0;
    for (let r = 0; r < Math.min(rows.length, 3); r++) {
      const testRow = rows[r];
      let validDateCount = 0;
      for (let c = 10; c < Math.min(testRow.length, 30); c++) {
        if (formatToPortalDate(testRow[c])) validDateCount++;
      }
      if (validDateCount >= 3) {
        dateRowIndex = r;
        break;
      }
    }

    const dateHeaders = rows[dateRowIndex] || [];
    let currentSection = '';
    processedSheets.push(sName);

    // Iterasi baris karyawan
    for (let r = dateRowIndex + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || row.length === 0) continue;

      const rawNik = config.colNik !== -1 ? String(row[config.colNik] || '').trim() : '';
      const rawName = String(row[config.colName] || '').trim();

      // Jika NIK kosong / pendek, kemungkinan baris nama Section pemisah (e.g. "PREPARATION", "LABORATORY")
      if (!rawNik || rawNik.length < 3) {
        const possibleSec = String(row[1] || row[0] || row[2] || '').trim();
        if (possibleSec && possibleSec.length > 2 && !possibleSec.match(/^[0-9]+$/)) {
          currentSection = possibleSec;
        }
        continue;
      }

      if (!rawName) continue;

      // Filter Resign / PHK / #N/A
      const rawSection = config.colSection !== -1 ? String(row[config.colSection] || '').trim() : '';
      const rawStatusKontrak = config.colStatusKontrak !== -1 ? String(row[config.colStatusKontrak] || '').trim().toUpperCase() : '';
      const rawStatusMess = config.colStatusMess !== -1 ? String(row[config.colStatusMess] || '').trim().toUpperCase() : '';

      const isResigned =
        rawSection.includes('#N/A') ||
        rawName.includes('#N/A') ||
        rawStatusKontrak.includes('RESIGN') ||
        rawStatusKontrak.includes('PHK') ||
        rawStatusKontrak.includes('KELUAR') ||
        rawStatusMess.includes('RESIGN') ||
        KNOWN_RESIGNED_NIKS.has(rawNik);

      if (isResigned) {
        continue;
      }

      const emp: ParsedEmployee = {
        nik: rawNik,
        name: rawName,
        jabatan: config.colJabatan !== -1 ? String(row[config.colJabatan] || '').trim() : '',
        jobGrade: config.colJobGrade !== -1 ? String(row[config.colJobGrade] || '').trim() : '',
        section: rawSection || currentSection,
        gol: config.colGol !== -1 ? String(row[config.colGol] || '').trim() : '',
        shift: config.colShift !== -1 ? String(row[config.colShift] || '').trim() : '',
        poh: config.colPoh !== -1 ? String(row[config.colPoh] || '').trim() : '',
        pt: config.colPt !== -1 ? String(row[config.colPt] || '').trim() || 'TBP' : 'TBP',
        statusMess: config.colStatusMess !== -1 ? String(row[config.colStatusMess] || '').trim() : '',
        rotation: config.colRotation !== -1 ? String(row[config.colRotation] || '').trim() : '',
        tanggalAwalBergabung: config.colTanggalAwalBergabung !== -1 ? String(row[config.colTanggalAwalBergabung] || '').trim() : '',
        tanggalBergabungTerbaru: config.colTanggalBergabungTerbaru !== -1 ? String(row[config.colTanggalBergabungTerbaru] || '').trim() : '',
        statusKontrak: config.colStatusKontrak !== -1 ? String(row[config.colStatusKontrak] || '').trim() : '',
        department: rawSection || currentSection,
        position: config.colJabatan !== -1 ? String(row[config.colJabatan] || '').trim() : '',
        statusKaryawan: 'Active'
      };

      if (!employeesMap.has(emp.nik)) {
        employeesMap.set(emp.nik, emp);
        if (sheetType === 'Staff') staffCount++;
        else crewCount++;
      }

      // Baca kolom tanggal roster
      for (let c = config.dateStartCol; c < row.length; c++) {
        const rawDateHeader = dateHeaders[c];
        if (!rawDateHeader) continue;

        const dateStr = formatToPortalDate(rawDateHeader);
        if (!dateStr) continue;

        const status = String(row[c] || '').trim();
        if (status) {
          rosters.push({
            nik: emp.nik,
            date: dateStr,
            status
          });
          uniqueDates.add(dateStr);
        }
      }
    }
  }

  const sortedDates = Array.from(uniqueDates);
  const sampleDates = sortedDates.slice(0, 5);

  return {
    sheetNames,
    processedSheets,
    employees: Array.from(employeesMap.values()),
    rosters,
    cuti: cutiList,
    dateRange: {
      minDate: sortedDates[0] || '-',
      maxDate: sortedDates[sortedDates.length - 1] || '-',
      datesCount: sortedDates.length,
      sampleDates
    },
    stats: {
      staffCount,
      crewCount,
      totalEmployees: employeesMap.size,
      totalRosterEntries: rosters.length,
      cutiEntriesCount: cutiList.length
    },
    warnings
  };
}
