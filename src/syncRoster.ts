import fetch from 'node-fetch'; // wait, node 22 has global fetch
import Papa from 'papaparse';
import { db } from './db/index.js';
import { employees, roster } from './db/schema.js';
import { eq, and } from 'drizzle-orm';
import cron from 'node-cron';

const ROOSTER_STAFF_CSV_URL = "https://docs.google.com/spreadsheets/d/10a2JYxQxEfcMDdl968KUHiC1fVI65vPaWMH7shMv7U0/export?format=csv&gid=0";
const ROOSTER_CREW_CSV_URL = "https://docs.google.com/spreadsheets/d/10a2JYxQxEfcMDdl968KUHiC1fVI65vPaWMH7shMv7U0/export?format=csv&gid=170063197";

// Jika CSV GTS ditaruh di Google Sheets, tambahkan URL exportnya di sini.
const ROOSTER_GTS_CSV_URL = "https://drive.usercontent.google.com/download?id=17DPii_qPB8UNcrwMbRJqcMz5-1WHRVdC&export=download";

interface RosterConfig {
  type: string;
  url: string;
  colNik: number;
  colName: number;
  colJabatan: number;
  colJobGrade: number;
  colSection: number;
  colGol: number;
  colShift: number;
  colPoh: number;
  colPt: number;
  colStatusMess: number;
  colRotation: number;
  colTanggalAwalBergabung: number;
  colTanggalBergabungTerbaru: number;
  colStatusKontrak: number;
  dateStartCol: number;
  dateRowIndex: number;
}

const CONFIGS: RosterConfig[] = [
  {
    type: 'Staff',
    url: ROOSTER_STAFF_CSV_URL,
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
    dateRowIndex: 0
  },
  {
    type: 'Crew',
    url: ROOSTER_CREW_CSV_URL,
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
    dateRowIndex: 0
  },
  {
    type: 'GTS',
    url: ROOSTER_GTS_CSV_URL, 
    colNik: 6,
    colName: 1,
    colJabatan: 2,
    colJobGrade: -1,
    colSection: -1, // -1 menandakan tidak ada kolom khusus, ambil dari merged row
    colGol: -1,
    colShift: 4,
    colPoh: 5,
    colPt: 7,
    colStatusMess: 8,
    colRotation: 9,
    colTanggalAwalBergabung: 10,
    colTanggalBergabungTerbaru: 11,
    colStatusKontrak: 12,
    dateStartCol: 13,
    dateRowIndex: 0
  }
];

export async function syncRosterData() {
  console.log("Memulai sinkronisasi Roster otomatis...");
  try {
    for (const conf of CONFIGS) {
      if (conf.url) {
        await fetchAndSync(conf);
      }
    }
    console.log("Sinkronisasi Roster selesai.");
  } catch (err) {
    console.error("Gagal sinkronisasi roster:", err);
  }
}

// Fungsi untuk menormalisasi format tanggal "1/01/2026" atau "1 Jan 2026" menjadi "1 Jan 26"
function normalizeDateStr(d: string): string {
  if (!d) return d;
  
  // Format 1/01/2026
  let parts = d.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    const dateObj = new Date(year, month, day);
    const p = dateObj.toDateString().split(' '); // e.g., "Thu Jan 01 2026"
    return parseInt(p[2], 10) + ' ' + p[1] + ' ' + p[3].substring(2); // "1 Jan 26"
  }
  
  // Format 1 Jan 2026
  parts = d.split(' ');
  if (parts.length === 3 && parts[2].length === 4) {
    return parseInt(parts[0], 10) + ' ' + parts[1] + ' ' + parts[2].substring(2);
  }
  
  return d;
}

async function fetchAndSync(config: RosterConfig) {
  console.log(`Fetching roster for ${config.type}...`);
  const res = await fetch(config.url);
  if (!res.ok) {
    console.error(`Gagal fetch CSV untuk ${config.type}: ${res.statusText}`);
    return;
  }
  const csvText = await res.text();
  
  const parsed = Papa.parse(csvText, { skipEmptyLines: true });
  const rows = parsed.data as string[][];
  
  if (rows.length < 2) return;
  
  const dateHeaders = rows[config.dateRowIndex];
  
  const allEmpData = [];
  const allRosterData = [];
  
  let currentSection = "";

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    
    const nik = config.colNik !== -1 ? row[config.colNik]?.trim() : "";
    
    // Identifikasi baris yang tidak memiliki NIK valid
    if (!nik || nik.length < 3) {
      // Kemungkinan ini adalah baris section yang di-merge (contoh: "LABORATORY")
      const possibleSection = (row[1] || row[0] || row[2] || "").trim();
      if (possibleSection && possibleSection.length > 2 && !possibleSection.match(/^[0-9]+$/)) {
        currentSection = possibleSection;
      }
      continue;
    }

    if (!row[config.colName]) continue;
    
    const empData = {
      nik,
      name: row[config.colName],
      jabatan: config.colJabatan !== -1 ? row[config.colJabatan] : '',
      jobGrade: config.colJobGrade !== -1 ? row[config.colJobGrade] : '',
      section: config.colSection !== -1 ? row[config.colSection] : currentSection,
      gol: config.colGol !== -1 ? row[config.colGol] : '',
      shift: config.colShift !== -1 ? row[config.colShift] : '',
      poh: config.colPoh !== -1 ? row[config.colPoh] : '',
      pt: config.colPt !== -1 ? row[config.colPt] : config.type,
      statusMess: config.colStatusMess !== -1 ? row[config.colStatusMess] : '',
      rotation: config.colRotation !== -1 ? row[config.colRotation] : '',
      tanggalAwalBergabung: config.colTanggalAwalBergabung !== -1 ? row[config.colTanggalAwalBergabung] : '',
      tanggalBergabungTerbaru: config.colTanggalBergabungTerbaru !== -1 ? row[config.colTanggalBergabungTerbaru] : '',
      statusKontrak: config.colStatusKontrak !== -1 ? row[config.colStatusKontrak] : '',
      department: config.colSection !== -1 ? row[config.colSection] : currentSection, 
      position: config.colJabatan !== -1 ? row[config.colJabatan] : '',
    };
    
    allEmpData.push(empData);
    
    for (let c = config.dateStartCol; c < row.length; c++) {
      const rawDateStr = dateHeaders[c]; 
      if (!rawDateStr) continue;
      
      const dateStr = normalizeDateStr(rawDateStr);
      const status = row[c];
      
      if (status) {
        allRosterData.push({
          nik,
          date: dateStr,
          status
        });
      }
    }
  }

  // Insert/Update employees
  for (const emp of allEmpData) {
    await db.insert(employees)
      .values(emp)
      .onConflictDoUpdate({
        target: employees.nik,
        set: emp
      });
  }

  // Delete existing rosters for these NIKs
  for (const emp of allEmpData) {
    await db.delete(roster).where(eq(roster.nik, emp.nik));
  }

  // Batch insert new rosters
  const chunkSize = 1000;
  for (let j = 0; j < allRosterData.length; j += chunkSize) {
    await db.insert(roster).values(allRosterData.slice(j, j + chunkSize));
  }
}

export function initRosterCron() {
  cron.schedule('0 0 * * *', () => {
    syncRosterData();
  }, {
    timezone: "Asia/Jayapura"
  });
  console.log("Cron job untuk sinkronisasi Roster dijadwalkan pada jam 12 malam WIT.");
}
