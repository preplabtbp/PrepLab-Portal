import Papa from 'papaparse';
import { db } from './db/index.js';
import { employees, roster } from './db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import cron from 'node-cron';

// Official Database Roster Google Spreadsheet ID: 1iijlFReGxHyMiFAbd0J5-yfs1udWvZo4ydrJJKJBCNo
const SPREADSHEET_ID = "1iijlFReGxHyMiFAbd0J5-yfs1udWvZo4ydrJJKJBCNo";

const ROOSTER_STAFF_CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Rooster_Staff`;
const ROOSTER_CREW_CSV_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=Rooster_Crew`;

// Fallback jika CSV GTS ditaruh di Google Sheets
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
    colJobGrade: -1, // Crew tidak ada kolom Job Grade
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
  }
];

export async function syncRosterData(): Promise<{ success: boolean; staffCount: number; crewCount: number; totalRosterEntries: number; message: string }> {
  console.log("Memulai sinkronisasi Roster dari Google Spreadsheet...");
  let totalStaff = 0;
  let totalCrew = 0;
  let totalRoster = 0;

  try {
    for (const conf of CONFIGS) {
      if (conf.url) {
        const res = await fetchAndSync(conf);
        if (conf.type === 'Staff') totalStaff = res.empCount;
        if (conf.type === 'Crew') totalCrew = res.empCount;
        totalRoster += res.rosterCount;
      }
    }
    const msg = `Sinkronisasi Roster berhasil: ${totalStaff} Staff, ${totalCrew} Crew, ${totalRoster} entri tanggal roster.`;
    console.log(msg);
    return { success: true, staffCount: totalStaff, crewCount: totalCrew, totalRosterEntries: totalRoster, message: msg };
  } catch (err: any) {
    console.error("Gagal sinkronisasi roster:", err);
    return { success: false, staffCount: 0, crewCount: 0, totalRosterEntries: 0, message: err.message || "Gagal sinkronisasi roster" };
  }
}

// Fungsi untuk menormalisasi format tanggal "1/01/2026" atau "1 Jan 2026" menjadi "1 Jan 26"
function normalizeDateStr(d: string): string {
  if (!d) return d;
  const trimmed = d.trim();
  
  // Format 1/01/2026 or 01/01/2026
  let parts = trimmed.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    const dateObj = new Date(year, month, day);
    const p = dateObj.toDateString().split(' '); // e.g., "Thu Jan 01 2026"
    return parseInt(p[2], 10) + ' ' + p[1] + ' ' + p[3].substring(2); // "1 Jan 26"
  }
  
  // Format 1 Jan 2026 -> 1 Jan 26
  parts = trimmed.split(' ');
  if (parts.length === 3 && parts[2].length === 4) {
    return parseInt(parts[0], 10) + ' ' + parts[1] + ' ' + parts[2].substring(2);
  }
  
  return trimmed;
}

async function fetchAndSync(config: RosterConfig): Promise<{ empCount: number; rosterCount: number }> {
  console.log(`Fetching roster for ${config.type}...`);
  const res = await fetch(config.url);
  if (!res.ok) {
    console.error(`Gagal fetch CSV untuk ${config.type}: ${res.statusText}`);
    return { empCount: 0, rosterCount: 0 };
  }
  const csvText = await res.text();
  
  const parsed = Papa.parse(csvText, { skipEmptyLines: true });
  const rows = parsed.data as string[][];
  
  if (rows.length < 2) return { empCount: 0, rosterCount: 0 };
  
  const dateHeaders = rows[config.dateRowIndex];
  
  const allEmpData: any[] = [];
  const allRosterData: any[] = [];
  
  let currentSection = "";

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    
    const rawNik = config.colNik !== -1 ? row[config.colNik] : "";
    const nik = rawNik ? rawNik.trim() : "";
    
    // Identifikasi baris yang tidak memiliki NIK valid
    if (!nik || nik.length < 3) {
      const possibleSection = (row[1] || row[0] || row[2] || "").trim();
      if (possibleSection && possibleSection.length > 2 && !possibleSection.match(/^[0-9]+$/)) {
        currentSection = possibleSection;
      }
      continue;
    }

    const rawName = row[config.colName];
    if (!rawName || !rawName.trim()) continue;
    
    const empData = {
      nik,
      name: rawName.trim(),
      jabatan: config.colJabatan !== -1 ? (row[config.colJabatan] || '').trim() : '',
      jobGrade: config.colJobGrade !== -1 ? (row[config.colJobGrade] || '').trim() : '',
      section: config.colSection !== -1 ? (row[config.colSection] || '').trim() || currentSection : currentSection,
      gol: config.colGol !== -1 ? (row[config.colGol] || '').trim() : '',
      shift: config.colShift !== -1 ? (row[config.colShift] || '').trim() : '',
      poh: config.colPoh !== -1 ? (row[config.colPoh] || '').trim() : '',
      pt: config.colPt !== -1 ? (row[config.colPt] || '').trim() || 'TBP' : 'TBP',
      statusMess: config.colStatusMess !== -1 ? (row[config.colStatusMess] || '').trim() : '',
      rotation: config.colRotation !== -1 ? (row[config.colRotation] || '').trim() : '',
      tanggalAwalBergabung: config.colTanggalAwalBergabung !== -1 ? (row[config.colTanggalAwalBergabung] || '').trim() : '',
      tanggalBergabungTerbaru: config.colTanggalBergabungTerbaru !== -1 ? (row[config.colTanggalBergabungTerbaru] || '').trim() : '',
      statusKontrak: config.colStatusKontrak !== -1 ? (row[config.colStatusKontrak] || '').trim() : '',
      department: config.colSection !== -1 ? (row[config.colSection] || '').trim() || currentSection : currentSection, 
      position: config.colJabatan !== -1 ? (row[config.colJabatan] || '').trim() : '',
    };
    
    allEmpData.push(empData);
    
    for (let c = config.dateStartCol; c < row.length; c++) {
      const rawDateStr = dateHeaders[c]; 
      if (!rawDateStr || !rawDateStr.trim()) continue;
      
      const dateStr = normalizeDateStr(rawDateStr);
      const status = (row[c] || '').trim();
      
      if (status) {
        allRosterData.push({
          nik,
          date: dateStr,
          status
        });
      }
    }
  }

  // Deduplicate employees by NIK
  const uniqueEmpMap = new Map<string, any>();
  for (const emp of allEmpData) {
    if (emp.nik) uniqueEmpMap.set(emp.nik, emp);
  }
  const uniqueEmps = Array.from(uniqueEmpMap.values());

  // Upsert employees
  for (const emp of uniqueEmps) {
    await db.insert(employees)
      .values(emp)
      .onConflictDoUpdate({
        target: employees.nik,
        set: emp
      });
  }

  // Fast Bulk Delete existing rosters for these NIKs
  const allNiks = Array.from(uniqueEmpMap.keys());
  if (allNiks.length > 0) {
    const deleteChunkSize = 200;
    for (let k = 0; k < allNiks.length; k += deleteChunkSize) {
      const chunkNiks = allNiks.slice(k, k + deleteChunkSize);
      await db.delete(roster).where(inArray(roster.nik, chunkNiks));
    }
  }

  // Fast Batch insert new rosters in chunks
  const chunkSize = 2000;
  for (let j = 0; j < allRosterData.length; j += chunkSize) {
    await db.insert(roster).values(allRosterData.slice(j, j + chunkSize));
  }

  console.log(`Synced ${uniqueEmps.length} employees and ${allRosterData.length} roster entries for ${config.type}.`);
  return { empCount: uniqueEmps.length, rosterCount: allRosterData.length };
}

export function initRosterCron() {
  // Update otomatis setiap jam 5 sore WIT (17:00 WIT)
  cron.schedule('0 17 * * *', () => {
    console.log("⏰ Menjalankan sinkronisasi Roster terjadwal jam 17:00 WIT...");
    syncRosterData();
  }, {
    timezone: "Asia/Jayapura"
  });
  console.log("Cron job untuk sinkronisasi Roster dijadwalkan pada jam 5 sore WIT (17:00 WIT / 08:00 UTC).");
}
