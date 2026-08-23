import { Router } from "express";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { db } from "../../src/db/index.js";
import { eq, desc, sql, and, like, or } from "drizzle-orm";
import { employees, roster, p5mMateri, p5mSchedules } from "../../src/db/schema.js";
import { Client } from "@notionhq/client";
import { drive } from "../../google-services.js";

export const p5mRouter = Router();

// ============================================================
// NOTION DATABASE INTEGRATION (ID: 207d00c5-c809-800c-bf51-ea4e5111bf3f)
// ============================================================
const NOTION_PAGE_ID = "207d00c5-c809-800c-bf51-ea4e5111bf3f";

function classifyTopic(title: string) {
  const t = title.toLowerCase();

  // Non-Teknis topics (Health, Mental, Ramadhan, Habits, Soft Skills, Admin/HR)
  if (
    t.includes("ramadhan") || t.includes("puasa") || t.includes("insomnia") ||
    t.includes("diare") || t.includes("osteoporosis") || t.includes("dehidrasi") ||
    t.includes("hiv") || t.includes("gula") || t.includes("batuk") || t.includes("gigi") ||
    t.includes("hipertensi") || t.includes("jantung") || t.includes("makan") ||
    t.includes("dyspepsia") || t.includes("mcu") || t.includes("tembakau") ||
    t.includes("mental") || t.includes("scabies") || t.includes("pancaroba") ||
    t.includes("nipah") || t.includes("faringitis") || t.includes("flu") ||
    t.includes("sengatan panas") || t.includes("gadget") || t.includes("bercanda") ||
    t.includes("izin & sakit") || t.includes("cuti") || t.includes("spdk") ||
    t.includes("headset") || t.includes("disiplin kerja") || t.includes("cuci sepatu") ||
    t.includes("alat makan")
  ) {
    return { kategori: "Non-Teknis", subKategori: "General", divisi: "All" };
  }

  // Teknis Preparation
  if (
    t.includes("preparasi") || t.includes("prep") || t.includes("jaw crusher") ||
    t.includes("pulverizer") || t.includes("cup mill") || t.includes("drying") ||
    t.includes("moisture") || t.includes("quartering") || t.includes("splitting") ||
    t.includes("ayakan") || t.includes("sieving") || t.includes("artco") ||
    t.includes("kering") || t.includes("basah")
  ) {
    return { kategori: "Teknis", subKategori: "Preparation", divisi: "Preparation" };
  }

  // Teknis Laboratory (including Quality Assurance)
  if (
    t.includes("laboratorium") || t.includes("lab") || t.includes("fusion") ||
    t.includes("xrf") || t.includes("aas") || t.includes("neraca") ||
    t.includes("titrasi") || t.includes("loi") || t.includes("reagen") ||
    t.includes("asam") || t.includes("press/timbang") || t.includes("analitik") ||
    t.includes("kalibrasi") || t.includes("crm") || t.includes("standar baku") ||
    t.includes("quality") || t.includes("qa") || t.includes("qc")
  ) {
    return { kategori: "Teknis", subKategori: "Laboratory", divisi: "Laboratory" };
  }

  // Teknis Maintenance
  if (
    t.includes("maintenance") || t.includes("perawatan") || t.includes("lubrikasi") ||
    t.includes("genset") || t.includes("kompresor") || t.includes("loto") ||
    t.includes("kegagalan rem") || t.includes("alat berat") || t.includes("dashcam") ||
    t.includes("parkir") || t.includes("unit") || t.includes("driving") || t.includes("blind spot")
  ) {
    return { kategori: "Teknis", subKategori: "Maintenance", divisi: "Maintenance" };
  }

  // Teknis General (K3 Umum, APD, APAR, Golden Rules, Bahaya, Emergency)
  return { kategori: "Teknis", subKategori: "General", divisi: "All" };
}

async function syncNotionMateriDatabase() {
  if (!process.env.NOTION_API_KEY) {
    console.warn("NOTION_API_KEY not found in environment.");
    return { success: false, message: "NOTION_API_KEY missing" };
  }

  try {
    const notion = new Client({ auth: process.env.NOTION_API_KEY });
    const blocks = await notion.blocks.children.list({ block_id: NOTION_PAGE_ID });
    const dbBlock = blocks.results.find((b: any) => b.type === "child_database");
    if (!dbBlock) {
      console.warn("Child database not found on Notion page", NOTION_PAGE_ID);
      return { success: false, message: "Child database not found" };
    }

    let hasMore = true;
    let startCursor: string | undefined = undefined;
    const allRows: any[] = [];

    while (hasMore) {
      const res: any = await notion.databases.query({
        database_id: dbBlock.id,
        start_cursor: startCursor,
        page_size: 100
      });
      allRows.push(...res.results);
      hasMore = res.has_more;
      startCursor = res.next_cursor;
    }

    // Delete any old flyerless topics
    await db.execute(sql`DELETE FROM p5m_materi WHERE file_url IS NULL OR length(trim(file_url)) = 0 OR notion_id IS NULL;`);

    // Upsert or refresh database with authentic flyer topics only
    let syncedCount = 0;
    for (const r of allRows) {
      const p = r.properties;
      const name = p.Name?.title?.[0]?.plain_text || p.Judul?.title?.[0]?.plain_text || "";
      if (!name.trim()) continue;

      const file = p.File?.files?.[0]?.file?.url || p.File?.files?.[0]?.external?.url || "";
      // STRICT: Must have flyer / image file
      if (!file || !file.trim()) continue;

      const { kategori, subKategori, divisi } = classifyTopic(name.trim());

      const existing = await db.select().from(p5mMateri).where(eq(p5mMateri.judul, name.trim())).limit(1);
      if (existing.length > 0) {
        await db.update(p5mMateri).set({
          kategori,
          subKategori,
          divisi,
          fileUrl: file,
          notionId: r.id
        }).where(eq(p5mMateri.id, existing[0].id));
      } else {
        await db.insert(p5mMateri).values({
          judul: name.trim(),
          kategori,
          subKategori,
          divisi,
          fileUrl: file,
          notionId: r.id,
          lastUsed: null
        });
      }
      syncedCount++;
    }

    console.log(`Synced ${syncedCount} authentic flyer topics from Notion to p5m_materi.`);
    return { success: true, count: syncedCount };
  } catch (error: any) {
    console.error("Error syncing Notion materi:", error);
    return { success: false, message: error.message };
  }
}

// ============================================================
// HELPER FUNCTIONS: Klasifikasi Golongan, Kelas, Divisi & Tanggal
// ============================================================
function isGolongan2or3(emp: any): boolean {
  const g = (emp.gol || '').toUpperCase().trim();
  const j = (emp.jabatan || '').toLowerCase();

  // Strict: Exclude explicit Golongan 1
  if (g === 'I' || g === '1') return false;

  // Exclude non-presenter crew / operator / helper / sampler / driver roles
  if (j.includes('crew') || j.includes('operator') || j.includes('helper') || j.includes('sampler') || j.includes('driver')) {
    return false;
  }

  // Exclude Manager & Superintendent
  if (j.includes('manager') || j.includes('spt') || j.includes('superintendent')) {
    return false;
  }

  // Explicit Golongan 2 or 3
  if (g === 'II' || g === 'III' || g === '2' || g === '3') return true;

  // Staff roles (Foreman, Officer, Admin, SPV, Specialist, Engineer, Analyst, Planner)
  if (
    j.includes('foreman') || j.includes('officer') || j.includes('admin') ||
    j.includes('supervisor') || j.includes('spv') || j.includes('specialist') ||
    j.includes('engineer') || j.includes('analyst') || j.includes('planner')
  ) {
    return true;
  }

  return false;
}

function tentukanKelas(jabatan: string): string {
  const j = (jabatan || '').toLowerCase();
  if (j.includes('supervisor') || j.includes('specialist') || j.includes('spv') || j.includes('engineer')) return 'SPV';
  if (j.includes('admin') || j.includes('administrator')) return 'Admin';
  if (j.includes('officer') || j.includes('foreman') || j.includes('analyst') || j.includes('planner')) return 'Foreman/Officer';
  return 'Other';
}

function tentukanDivisi(section: string, jabatan: string): string {
  const s = (section || '').toLowerCase();
  const j = (jabatan || '').toLowerCase();

  // 1. Check Section first (Most specific)
  if (s.includes('ic') || s.includes('inventory')) return 'IC';
  if (s.includes('qa') || s.includes('quality')) return 'Quality Assurance';
  if (s.includes('prep')) return 'Preparation';
  if (s.includes('maintenance') || s.includes('mekanik')) return 'Maintenance';
  if (s.includes('lab')) return 'Laboratory';
  if (s.includes('admin') || s.includes('administrator')) return 'Administration';

  // 2. Check Jabatan fallback
  if (j.includes('ic') || j.includes('inventory')) return 'IC';
  if (j.includes('quality') || j.includes('qa') || j.includes('qc')) return 'Quality Assurance';
  if (j.includes('prep')) return 'Preparation';
  if (j.includes('maintenance') || j.includes('mekanik')) return 'Maintenance';
  if (j.includes('lab')) return 'Laboratory';
  if (j.includes('admin') || j.includes('administrator')) return 'Administration';

  return 'All';
}

const URUTAN_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

function getWeekDates(referenceDateStr?: string) {
  let refDate = new Date();
  if (referenceDateStr) {
    if (referenceDateStr.includes('-')) {
      const [y, m, d] = referenceDateStr.split('-').map(Number);
      refDate = new Date(y, m - 1, d);
    } else {
      const parsed = new Date(referenceDateStr);
      if (!isNaN(parsed.getTime())) refDate = parsed;
    }
  }
  
  // Find Monday of the target week (if Sunday, default to next day Monday for upcoming week)
  const day = refDate.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = day === 0 ? 1 : 1 - day;
  const monday = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate() + diffToMonday);

  const dates: Record<string, { iso: string; display: string; dateObj: Date }> = {};
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  URUTAN_HARI.forEach((hari, idx) => {
    const curDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx);
    const yyyy = curDate.getFullYear();
    const mm = String(curDate.getMonth() + 1).padStart(2, '0');
    const dd = String(curDate.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    const display = `${curDate.getDate()} ${monthNames[curDate.getMonth()]} ${yyyy}`;
    dates[hari] = { iso, display, dateObj: curDate };
  });

  return { monday, dates };
}

function getRosterStatusForDate(empRoster: Record<string, string>, dateObj: Date, defaultShift?: string): string {
  const parts = dateObj.toDateString().split(' ');
  const day = parseInt(parts[2], 10);
  const month = parts[1]; // e.g. 'Aug'
  const year2 = parts[3].substring(2); // e.g. '26'
  const formattedDate = `${day} ${month} ${year2}`; // e.g. "17 Aug 26"

  if (empRoster[formattedDate]) return empRoster[formattedDate];

  const paddedDate = `${String(day).padStart(2, '0')} ${month} ${year2}`;
  if (empRoster[paddedDate]) return empRoster[paddedDate];

  const targetKey = formattedDate.toLowerCase();
  for (const [k, v] of Object.entries(empRoster)) {
    if (k.toLowerCase() === targetKey) return v;
  }

  // Fallback: If employee has Shift Group (A, B, Nonshift)
  const base = (defaultShift || '').toUpperCase().trim();
  if (base.includes('NONSHIFT') || base.includes('NON-SHIFT') || base === 'D' || base === 'LS' || base === 'S') {
    return 'D';
  }
  if (base === 'N') {
    return 'N';
  }
  if (base === 'A') return 'D';
  if (base === 'B') return 'N';

  return base || 'D';
}

async function getPresenterHistory(): Promise<Record<string, number>> {
  try {
    const recent = await db.select().from(p5mSchedules).orderBy(desc(p5mSchedules.id)).limit(1);
    const countMap: Record<string, number> = {};
    if (recent.length > 0 && recent[0].scheduleData) {
      const sch = recent[0].scheduleData as Record<string, any>;
      Object.values(sch).forEach((dayData: any) => {
        ['pagi', 'malam'].forEach(shift => {
          if (dayData[shift]) {
            Object.values(dayData[shift]).forEach((slotArr: any) => {
              if (Array.isArray(slotArr)) {
                slotArr.forEach((s: any) => {
                  if (s.nama && !s.nama.includes('KOSONG')) {
                    const cleanName = s.nama.trim();
                    countMap[cleanName] = (countMap[cleanName] || 0) + 1;
                    if (s.nik) countMap[s.nik.trim()] = (countMap[s.nik.trim()] || 0) + 1;
                  }
                });
              }
            });
          }
        });
      });
    }
    return countMap;
  } catch (err) {
    console.error("Error reading presenter history:", err);
    return {};
  }
}

async function getSenamHistory(): Promise<Record<string, number>> {
  try {
    const allSchedules = await db.select().from(p5mSchedules).orderBy(desc(p5mSchedules.id)).limit(15);
    const countMap: Record<string, number> = {};
    allSchedules.forEach(schRow => {
      if (schRow.scheduleData) {
        const sch = schRow.scheduleData as Record<string, any>;
        Object.values(sch).forEach((dayData: any) => {
          ['pagi', 'malam'].forEach(shift => {
            if (dayData[shift]) {
              Object.values(dayData[shift]).forEach((slotArr: any) => {
                if (Array.isArray(slotArr)) {
                  slotArr.forEach((s: any) => {
                    if (s.isSenam || s.kategori === 'Senam' || (s.materi && s.materi.toLowerCase().includes('senam'))) {
                      if (s.nama && !s.nama.includes('KOSONG')) {
                        countMap[s.nama.trim()] = (countMap[s.nama.trim()] || 0) + 1;
                        if (s.nik) countMap[s.nik.trim()] = (countMap[s.nik.trim()] || 0) + 1;
                      }
                    }
                  });
                }
              });
            }
          });
        });
      }
    });
    return countMap;
  } catch (e) {
    return {};
  }
}

// ============================================================
// MATERI ENDPOINTS (CRUD & NOTION SYNC)
// ============================================================
p5mRouter.get("/materi", async (req, res) => {
  try {
    const list = await db.select().from(p5mMateri).orderBy(desc(p5mMateri.id));
    res.json({ success: true, data: list });
  } catch (error: any) {
    console.error("Error fetching P5M materi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

p5mRouter.post("/materi/sync", async (req, res) => {
  try {
    const result = await syncNotionMateriDatabase();
    if (result.success) {
      const list = await db.select().from(p5mMateri).orderBy(desc(p5mMateri.id));
      res.json({ success: true, count: result.count, data: list });
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

p5mRouter.post("/materi", async (req, res) => {
  try {
    const { judul, kategori, subKategori, divisi, fileUrl } = req.body;
    if (!judul) {
      return res.status(400).json({ success: false, message: "Judul materi wajib diisi" });
    }

    const inserted = await db.insert(p5mMateri).values({
      judul,
      kategori: kategori || 'Teknis',
      subKategori: subKategori || 'General',
      divisi: divisi || 'All',
      fileUrl: fileUrl || null,
      lastUsed: null
    }).returning();

    res.json({ success: true, data: inserted[0] });
  } catch (error: any) {
    console.error("Error creating P5M materi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

p5mRouter.put("/materi/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { judul, kategori, subKategori, divisi, fileUrl } = req.body;

    const updated = await db.update(p5mMateri).set({
      judul,
      kategori,
      subKategori: subKategori || 'General',
      divisi: divisi || 'All',
      fileUrl: fileUrl || undefined
    }).where(eq(p5mMateri.id, id)).returning();

    res.json({ success: true, data: updated[0] });
  } catch (error: any) {
    console.error("Error updating P5M materi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

p5mRouter.delete("/materi/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await db.delete(p5mMateri).where(eq(p5mMateri.id, id));
    res.json({ success: true, message: "Materi berhasil dihapus" });
  } catch (error: any) {
    console.error("Error deleting P5M materi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// EMPLOYEE POOL & ROSTER FOR TARGET WEEK (GOLONGAN 2 & 3 + PT FILTER)
// ============================================================
p5mRouter.get("/pool", async (req, res) => {
  try {
    const weekDateStr = (req.query.weekDate as string) || new Date().toISOString().split('T')[0];
    const userPt = ((req.query.userPt || req.query.creatorPt || req.query.pt || 'TBP') as string).toUpperCase();
    const { dates } = getWeekDates(weekDateStr);

    const allEmps = await db.select().from(employees);
    const allRoster = await db.select().from(roster);
    const lastWeekCounts = await getPresenterHistory();
    const senamHistory = await getSenamHistory();

    // Map roster by NIK -> date -> status
    const rosterMap: Record<string, Record<string, string>> = {};
    allRoster.forEach(r => {
      if (!rosterMap[r.nik]) rosterMap[r.nik] = {};
      if (r.date) {
        rosterMap[r.nik][r.date.trim()] = (r.status || '').toUpperCase().trim();
      }
    });

    const shiftValid = ['D', 'N', 'LS', 'S', 'NONSHIFT', 'NON-SHIFT'];

    const pool = allEmps.map(emp => {
      // 1. STRICT: Only Golongan 2 & 3
      if (!isGolongan2or3(emp)) {
        return null;
      }

      // 2. STRICT PT FILTERING RULE:
      const empPt = (emp.pt || '').toUpperCase().trim();
      if (userPt === 'TBP' || userPt === 'GPS' || userPt === 'TBP_GPS') {
        if (empPt === 'GTS') return null;
      } else if (userPt === 'GTS') {
        if (empPt !== 'GTS') return null;
      }

      const jabatan = emp.jabatan || '';
      const nama = emp.name ? emp.name.trim() : '';
      if (!nama) return null;

      const jadwal: Record<string, string> = {};
      const empRoster = rosterMap[emp.nik] || {};

      URUTAN_HARI.forEach(hari => {
        const dateObj = dates[hari].dateObj;
        jadwal[hari] = getRosterStatusForDate(empRoster, dateObj, emp.shift || '');
      });

      const masukSenin = shiftValid.includes(jadwal['Senin']);
      const adaJadwalKerja = URUTAN_HARI.some(h => shiftValid.includes(jadwal[h]));

      if (!masukSenin && !adaJadwalKerja) return null;

      const cutiMingguIni = URUTAN_HARI.some(h => {
        const s = jadwal[h];
        return s === 'C' || s === 'OFF' || s === 'TRV';
      });

      const countLastWeek = lastWeekCounts[nama] || (emp.nik ? lastWeekCounts[emp.nik] : 0) || 0;
      const countSenam = senamHistory[nama] || (emp.nik ? senamHistory[emp.nik] : 0) || 0;

      return {
        nik: emp.nik,
        nama: nama,
        jabatan: jabatan,
        gol: emp.gol || 'II',
        pt: empPt || 'TBP',
        section: emp.section || emp.department || '',
        kelas: tentukanKelas(jabatan),
        divisi: tentukanDivisi(emp.section || emp.department || '', jabatan),
        jadwal: jadwal,
        cutiMingguIni: cutiMingguIni,
        tugasMingguLalu: countLastWeek,
        senamCount: countSenam,
        wajibDapat: countLastWeek === 0, // Belum dapat di periode lalu -> prioritas wajib dapat
        tugasMingguIni: 0,
        hariTerakhirBriefingSesi: -1
      };
    }).filter(Boolean);

    res.json({
      success: true,
      dates: Object.fromEntries(Object.entries(dates).map(([h, d]) => [h, { iso: d.iso, display: d.display }])),
      pool: pool
    });
  } catch (error: any) {
    console.error("Error generating P5M pool:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// RANDOMIZE SCHEDULE ENGINE (GOLONGAN 2 & 3 + SECTION GROUPING RULES)
// ============================================================
p5mRouter.post("/randomize", async (req, res) => {
  try {
    const { uiConfig, weekDate, userPt: reqUserPt, creatorPt } = req.body;
    const userPt = ((creatorPt || reqUserPt || 'TBP') as string).toUpperCase();
    const { dates } = getWeekDates(weekDate);

    // Only select materi that have an actual flyer URL
    const materiDb = await db.select().from(p5mMateri);
    const allEmps = await db.select().from(employees);
    const allRoster = await db.select().from(roster);
    const lastWeekCounts = await getPresenterHistory();
    const senamHistory = await getSenamHistory();

    const rosterMap: Record<string, Record<string, string>> = {};
    allRoster.forEach(r => {
      if (!rosterMap[r.nik]) rosterMap[r.nik] = {};
      if (r.date) {
        rosterMap[r.nik][r.date.trim()] = (r.status || '').toUpperCase().trim();
      }
    });

    const shiftValid = ['D', 'N', 'LS', 'S', 'NONSHIFT', 'NON-SHIFT'];

    // Filter only valid materi with flyers
    const poolMateri = materiDb
      .filter(m => m.fileUrl && m.fileUrl.trim())
      .map(m => ({ ...m }));

    // Prepare qualified Golongan 2 & 3 employee pool
    const poolKaryawan = allEmps.map(emp => {
      // 1. Strict Golongan 2 & 3
      if (!isGolongan2or3(emp)) return null;

      // 2. Strict PT Filter
      const empPt = (emp.pt || '').toUpperCase().trim();
      if (userPt === 'TBP' || userPt === 'GPS' || userPt === 'TBP_GPS') {
        if (empPt === 'GTS') return null;
      } else if (userPt === 'GTS') {
        if (empPt !== 'GTS') return null;
      }

      const jabatan = emp.jabatan || '';
      const nama = emp.name ? emp.name.trim() : '';
      if (!nama) return null;

      const jadwal: Record<string, string> = {};
      const empRoster = rosterMap[emp.nik] || {};

      URUTAN_HARI.forEach(hari => {
        const dateObj = dates[hari].dateObj;
        jadwal[hari] = getRosterStatusForDate(empRoster, dateObj, emp.shift || '');
      });

      const masukSenin = shiftValid.includes(jadwal['Senin']);
      const adaJadwalKerja = URUTAN_HARI.some(h => shiftValid.includes(jadwal[h]));
      if (!masukSenin && !adaJadwalKerja) return null;

      const cutiMingguIni = URUTAN_HARI.some(h => {
        const s = jadwal[h];
        return s === 'C' || s === 'OFF' || s === 'TRV';
      });

      const countLastWeek = lastWeekCounts[nama] || (emp.nik ? lastWeekCounts[emp.nik] : 0) || 0;
      const countSenam = senamHistory[nama] || (emp.nik ? senamHistory[emp.nik] : 0) || 0;

      return {
        nik: emp.nik,
        nama: nama,
        jabatan: jabatan,
        gol: emp.gol || 'II',
        pt: empPt || 'TBP',
        section: emp.section || emp.department || '',
        kelas: tentukanKelas(jabatan),
        divisi: tentukanDivisi(emp.section || emp.department || '', jabatan),
        jadwal: jadwal,
        cutiMingguIni: cutiMingguIni,
        tugasMingguIni: 0,
        tugasMingguLalu: countLastWeek,
        senamCount: countSenam,
        wajibDapat: countLastWeek === 0, // Prioritas regulasi 2 minggu
        hariTerakhirBriefingSesi: -1,
        score: 0
      };
    }).filter(Boolean) as any[];

    // ── Constraint Solver Candidate Selection ────────────────
    function pilihKandidat(hari: string, shift: string, slot: any, sudahDipilihHariIni: Set<string>, subSessionTipe?: string) {
      function filterDasar(k: any, kelasTarget: string) {
        const jdwl = (k.jadwal[hari] || '').toUpperCase();
        let isMasuk = false;
        if (shift === 'pagi' && (jdwl === 'D' || jdwl === 'LS' || jdwl === 'S' || jdwl === 'NONSHIFT')) isMasuk = true;
        if (shift === 'malam' && jdwl === 'N') isMasuk = true;
        if (!isMasuk) return false;

        // STRICT RULE: SPV MAX 1 SLOT PER WEEK
        if (k.kelas === 'SPV' && k.tugasMingguIni >= 1) return false;

        // Non-SPV personnel MAX 2 slots per week
        if (k.tugasMingguIni >= 2) return false;
        if (sudahDipilihHariIni.has(k.nama)) return false;

        // Sub-session grouping rules on Hari Split:
        if (subSessionTipe === 'preparasi') {
          // Preparation sub-session: Preparation AND Maintenance personnel
          const isPrepGroup = k.divisi === 'Preparation' || k.divisi === 'Maintenance';
          if (!isPrepGroup) return false;
        } else if (subSessionTipe === 'laboratorium') {
          // Laboratory sub-session: Laboratory, Quality Assurance, Administration, and IC personnel
          const isLabGroup = k.divisi === 'Laboratory' || k.divisi === 'Quality Assurance' || k.divisi === 'Administration' || k.divisi === 'IC';
          if (!isLabGroup) return false;
        }

        // Exact slot section filter if set (e.g. user explicitly picked 'Maintenance' or 'Preparation' or 'Quality Assurance')
        if (slot.divisi && slot.divisi !== 'All') {
          if (slot.divisi !== k.divisi) return false;
        }

        if (kelasTarget && kelasTarget !== 'All' && kelasTarget !== k.kelas) return false;
        return true;
      }

      let kandidat: any[] = [];

      if (slot.kelas === 'SPV') {
        kandidat = poolKaryawan.filter(k => filterDasar(k, 'SPV'));
        // AUTOMATIC FALLBACK: If no SPV is available / all SPVs already reached 1 slot max, fallback to Foreman/Officer
        if (kandidat.length === 0) {
          kandidat = poolKaryawan.filter(k => filterDasar(k, 'Foreman/Officer'));
          if (kandidat.length > 0) (kandidat as any)._isFallback = true;
        }
      } else if (slot.kelas === 'All') {
        // STRICT RULE: Prioritize Foreman/Officer and Admin over SPV when level is 'All'
        kandidat = poolKaryawan.filter(k => filterDasar(k, 'All') && k.kelas !== 'SPV');
        // Only if NO Foreman/Officer/Admin available, allow SPV
        if (kandidat.length === 0) {
          kandidat = poolKaryawan.filter(k => filterDasar(k, 'All'));
        }
      } else {
        kandidat = poolKaryawan.filter(k => filterDasar(k, slot.kelas));
      }

      // Special handling for SENAM category: Prioritize personnel who have done senam fewest times
      if ((slot.kategori === 'Senam' || slot.isSenam) && kandidat.length > 0) {
        const minSenam = Math.min(...kandidat.map(c => c.senamCount || 0));
        const freshSenam = kandidat.filter(c => (c.senamCount || 0) === minSenam);
        if (freshSenam.length > 0) {
          return freshSenam;
        }
      }

      return kandidat;
    }

    function hitungScore(k: any, indexHariIni: number) {
      let score = 0;

      // ── REGULASI SAFETY 2 MINGGU ──
      // Personil yang belum pernah membawakan materi di periode minggu lalu
      // WAJIB mendapatkan materi di minggu ini (+500 poin prioritas tertinggi)
      if (k.tugasMingguLalu === 0) {
        score += 500;
      } else {
        // Personil yang sudah membawakan materi minggu lalu diberi pendinginan (-200 poin)
        score -= 200;
      }

      // Prioritas jabatan non-SPV agar seluruh staff merata
      if (k.kelas === 'Foreman/Officer') score += 50;
      if (k.kelas === 'Admin') score += 40;

      // Distribusi minggu berjalan
      if (k.tugasMingguIni === 0) {
        score += 100;
        if (k.cutiMingguIni) score += 80; // Segera jadwalkan sebelum masuk jadwal cuti
      } else if (k.tugasMingguIni === 1) {
        score += 10;
      }

      // Penalti jarak hari briefing berturut-turut
      if (k.hariTerakhirBriefingSesi >= 0) {
        const selisih = indexHariIni - k.hariTerakhirBriefingSesi;
        if (selisih === 1) score -= 150;
        else if (selisih === 2) score -= 50;
      }

      return score;
    }

    function pilihDariKandidat(kandidat: any[], indexHariIni: number) {
      if (kandidat.length === 0) return null;
      kandidat.forEach(k => { k.score = hitungScore(k, indexHariIni); });
      kandidat.sort((a, b) => b.score - a.score);
      const highest = kandidat[0].score;
      const topGrup = kandidat.filter(k => k.score === highest);
      return topGrup[Math.floor(Math.random() * topGrup.length)];
    }

    // ── Logika Pemilihan & Daur Ulang Materi ──
    const usedMateriIdsInWeek = new Set<number>();
    const warnings: string[] = [];
    const exhaustedWarningCategories = new Set<string>();

    function pilihMateri(divisiTarget: string, kategoriTarget: string, materiTetap?: string | null, candidateDivision?: string) {
      // Kategori Senam
      if (kategoriTarget === 'Senam' || materiTetap?.toLowerCase().includes('senam')) {
        return {
          judul: "Senam",
          kategori: "Senam",
          subKategori: "General",
          id: null,
          fileUrl: null
        };
      }

      if (materiTetap) {
        return { judul: materiTetap, kategori: kategoriTarget || 'All', subKategori: 'General', id: null, fileUrl: null };
      }

      const effectiveSection = (candidateDivision || divisiTarget || '').toLowerCase();

      function filterPool(pool: typeof poolMateri) {
        return pool.filter(m => {
          const kat = m.kategori || 'Teknis';
          const subKat = m.subKategori || 'General';

          // Category filter (Teknis vs Non-Teknis vs Senam)
          if (kategoriTarget && kategoriTarget !== 'All') {
            if (kat.toLowerCase() !== kategoriTarget.toLowerCase()) return false;
          }

          // If Non-Teknis: All non-teknis topics are General and universal for everyone
          if (kat === 'Non-Teknis') {
            return true;
          }

          // If Teknis: Sub-category match
          // 1. Teknis General: available for all
          if (subKat === 'General') return true;

          // 2. Teknis Laboratory: for Laboratory, Quality Assurance, Admin, IC
          if (effectiveSection.includes('lab') || effectiveSection.includes('quality') || effectiveSection.includes('qa') || effectiveSection.includes('qc') || effectiveSection.includes('admin') || effectiveSection.includes('ic')) {
            return subKat === 'Laboratory' || subKat === 'General';
          }

          // 3. Teknis Preparation: for Preparation
          if (effectiveSection.includes('prep')) {
            return subKat === 'Preparation' || subKat === 'General';
          }

          // 4. Teknis Maintenance: for Maintenance
          if (effectiveSection.includes('maintenance') || effectiveSection.includes('mekanik')) {
            return subKat === 'Maintenance' || subKat === 'General';
          }

          return true;
        });
      }

      const matchingPool = filterPool(poolMateri);

      if (matchingPool.length === 0) {
        return {
          judul: "Briefing Operasional & Keselamatan Kerja Terpadu",
          kategori: kategoriTarget || "Teknis",
          subKategori: "General",
          id: null,
          fileUrl: null
        };
      }

      // Prioritas 1: Materi yang BELUM PERNAH dipakai sama sekali (lastUsed is null) & belum dipakai minggu ini
      const freshCandidates = matchingPool.filter(m => m.lastUsed === null && !usedMateriIdsInWeek.has(m.id));

      let selected: any = null;

      if (freshCandidates.length > 0) {
        // Ambil materi baru yang belum pernah dibawakan
        selected = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
      } else {
        // Prioritas 2: Pool materi baru telah habis! Daur ulang dari siklus rotasi terlama
        const categoryKey = `${kategoriTarget || 'Teknis'}${effectiveSection ? ` (${effectiveSection})` : ''}`;
        if (!exhaustedWarningCategories.has(categoryKey)) {
          exhaustedWarningCategories.add(categoryKey);
          warnings.push(`Pool materi untuk kategori ${categoryKey} telah habis terpakai semua. Sistem mendaur ulang materi dari siklus rotasi terlama.`);
        }

        // Cari kandidat daur ulang (hindari duplikasi dalam 1 minggu yang sama jika memungkinkan)
        let recycleCandidates = matchingPool.filter(m => !usedMateriIdsInWeek.has(m.id));
        if (recycleCandidates.length === 0) {
          recycleCandidates = matchingPool;
        }

        // Urutkan dari lastUsed terlama
        recycleCandidates.sort((a, b) => {
          if (!a.lastUsed && !b.lastUsed) return 0;
          if (!a.lastUsed) return -1;
          if (!b.lastUsed) return 1;
          return new Date(a.lastUsed).getTime() - new Date(b.lastUsed).getTime();
        });

        selected = recycleCandidates[0];
      }

      if (selected && selected.id) {
        usedMateriIdsInWeek.add(selected.id);
      }

      return {
        judul: selected.judul,
        kategori: selected.kategori,
        subKategori: selected.subKategori,
        id: selected.id,
        fileUrl: selected.fileUrl
      };
    }

    // ── Generate Jadwal Per Hari ────────────────────────────
    const jadwalHasil: Record<string, any> = {};
    const HARI_GABUNGAN = ['Senin', 'Kamis', 'Jumat', 'Minggu'];

    URUTAN_HARI.forEach((hari, indexHariIni) => {
      const isGabungan = HARI_GABUNGAN.includes(hari);
      const dayCfg = uiConfig?.[hari] || {};
      const hasilHari: any = { tipe: isGabungan ? 'gabungan' : 'split', pagi: {}, malam: {} };

      // Day Shift
      const sudahDipilihPagi = new Set<string>();
      if (isGabungan) {
        const slots = dayCfg.pagi?.gabungan || [];
        hasilHari.pagi.gabungan = slots.map((sl: any) => {
          const cand = pilihKandidat(hari, 'pagi', sl, sudahDipilihPagi);
          const terpilih = pilihDariKandidat(cand, indexHariIni);
          if (terpilih) {
            sudahDipilihPagi.add(terpilih.nama);
            terpilih.tugasMingguIni++;
            terpilih.hariTerakhirBriefingSesi = indexHariIni;
            if (sl.kategori === 'Senam' || sl.isSenam) {
              terpilih.senamCount = (terpilih.senamCount || 0) + 1;
            }
          }
          const isFallback = Boolean((cand as any)?._isFallback);
          const materiRes = pilihMateri(sl.divisi, sl.kategori, sl.materiTetap, terpilih?.divisi || sl.divisi);
          return {
            nama: terpilih ? terpilih.nama : 'KOSONG (Tdk ada SDM)',
            nik: terpilih ? terpilih.nik : '',
            pt: terpilih ? terpilih.pt : '',
            materi: materiRes.judul,
            kategori: materiRes.kategori,
            subKategori: materiRes.subKategori,
            kelas: sl.kelas,
            divisi: terpilih?.divisi || sl.divisi,
            fileUrl: materiRes.fileUrl,
            isFallback: isFallback,
            isLogbook: Boolean(sl.isLogbook),
            isSenam: sl.kategori === 'Senam' || Boolean(sl.isSenam) || Boolean(sl.materiTetap?.toLowerCase().includes('senam')),
            materiId: materiRes.id
          };
        });
      } else {
        const slotsPrep = dayCfg.pagi?.preparasi || [];
        const slotsLab = dayCfg.pagi?.laboratorium || [];

        // Preparation sub-session: Prep + Maintenance
        hasilHari.pagi.preparasi = slotsPrep.map((sl: any) => {
          const cand = pilihKandidat(hari, 'pagi', sl, sudahDipilihPagi, 'preparasi');
          const terpilih = pilihDariKandidat(cand, indexHariIni);
          if (terpilih) {
            sudahDipilihPagi.add(terpilih.nama);
            terpilih.tugasMingguIni++;
            terpilih.hariTerakhirBriefingSesi = indexHariIni;
            if (sl.kategori === 'Senam' || sl.isSenam) {
              terpilih.senamCount = (terpilih.senamCount || 0) + 1;
            }
          }
          const isFallback = Boolean((cand as any)?._isFallback);
          const materiRes = pilihMateri(sl.divisi || 'Preparation', sl.kategori, sl.materiTetap, terpilih?.divisi || 'Preparation');
          return {
            nama: terpilih ? terpilih.nama : 'KOSONG (Tdk ada SDM)',
            nik: terpilih ? terpilih.nik : '',
            pt: terpilih ? terpilih.pt : '',
            materi: materiRes.judul,
            kategori: materiRes.kategori,
            subKategori: materiRes.subKategori,
            kelas: sl.kelas,
            divisi: terpilih?.divisi || sl.divisi || 'Preparation',
            fileUrl: materiRes.fileUrl,
            isFallback: isFallback,
            isSenam: sl.kategori === 'Senam' || Boolean(sl.isSenam),
            materiId: materiRes.id
          };
        });

        // Laboratory sub-session: Lab + QA + Admin + IC
        hasilHari.pagi.laboratorium = slotsLab.map((sl: any) => {
          const cand = pilihKandidat(hari, 'pagi', sl, sudahDipilihPagi, 'laboratorium');
          const terpilih = pilihDariKandidat(cand, indexHariIni);
          if (terpilih) {
            sudahDipilihPagi.add(terpilih.nama);
            terpilih.tugasMingguIni++;
            terpilih.hariTerakhirBriefingSesi = indexHariIni;
            if (sl.kategori === 'Senam' || sl.isSenam) {
              terpilih.senamCount = (terpilih.senamCount || 0) + 1;
            }
          }
          const isFallback = Boolean((cand as any)?._isFallback);
          const materiRes = pilihMateri(sl.divisi || 'Laboratory', sl.kategori, sl.materiTetap, terpilih?.divisi || 'Laboratory');
          return {
            nama: terpilih ? terpilih.nama : 'KOSONG (Tdk ada SDM)',
            nik: terpilih ? terpilih.nik : '',
            pt: terpilih ? terpilih.pt : '',
            materi: materiRes.judul,
            kategori: materiRes.kategori,
            subKategori: materiRes.subKategori,
            kelas: sl.kelas,
            divisi: terpilih?.divisi || sl.divisi || 'Laboratory',
            fileUrl: materiRes.fileUrl,
            isFallback: isFallback,
            isSenam: sl.kategori === 'Senam' || Boolean(sl.isSenam),
            materiId: materiRes.id
          };
        });
      }

      // Night Shift (except Minggu)
      if (hari !== 'Minggu') {
        const sudahDipilihMalam = new Set<string>();
        if (isGabungan) {
          const slots = dayCfg.malam?.gabungan || [];
          hasilHari.malam.gabungan = slots.map((sl: any) => {
            const cand = pilihKandidat(hari, 'malam', sl, sudahDipilihMalam);
            const terpilih = pilihDariKandidat(cand, indexHariIni);
            if (terpilih) {
              sudahDipilihMalam.add(terpilih.nama);
              terpilih.tugasMingguIni++;
              terpilih.hariTerakhirBriefingSesi = indexHariIni;
            }
            const isFallback = Boolean((cand as any)?._isFallback);
            const materiRes = pilihMateri(sl.divisi, sl.kategori, sl.materiTetap, terpilih?.divisi || sl.divisi);
            return {
              nama: terpilih ? terpilih.nama : 'KOSONG (Tdk ada SDM)',
              nik: terpilih ? terpilih.nik : '',
              pt: terpilih ? terpilih.pt : '',
              materi: materiRes.judul,
              kategori: materiRes.kategori,
              subKategori: materiRes.subKategori,
              kelas: sl.kelas,
              divisi: terpilih?.divisi || sl.divisi,
              fileUrl: materiRes.fileUrl,
              isFallback: isFallback,
              isLogbook: Boolean(sl.isLogbook),
              isSenam: sl.kategori === 'Senam' || Boolean(sl.isSenam) || Boolean(sl.materiTetap?.toLowerCase().includes('senam')),
              materiId: materiRes.id
            };
          });
        } else {
          const slotsPrep = dayCfg.malam?.preparasi || [];
          const slotsLab = dayCfg.malam?.laboratorium || [];

          hasilHari.malam.preparasi = slotsPrep.map((sl: any) => {
            const cand = pilihKandidat(hari, 'malam', sl, sudahDipilihMalam, 'preparasi');
            const terpilih = pilihDariKandidat(cand, indexHariIni);
            if (terpilih) {
              sudahDipilihMalam.add(terpilih.nama);
              terpilih.tugasMingguIni++;
              terpilih.hariTerakhirBriefingSesi = indexHariIni;
            }
            const isFallback = Boolean((cand as any)?._isFallback);
            const materiRes = pilihMateri(sl.divisi || 'Preparation', sl.kategori, sl.materiTetap, terpilih?.divisi || 'Preparation');
            return {
              nama: terpilih ? terpilih.nama : 'KOSONG (Tdk ada SDM)',
              nik: terpilih ? terpilih.nik : '',
              pt: terpilih ? terpilih.pt : '',
              materi: materiRes.judul,
              kategori: materiRes.kategori,
              subKategori: materiRes.subKategori,
              kelas: sl.kelas,
              divisi: terpilih?.divisi || sl.divisi || 'Preparation',
              fileUrl: materiRes.fileUrl,
              isFallback: isFallback,
              isSenam: sl.kategori === 'Senam' || Boolean(sl.isSenam),
              materiId: materiRes.id
            };
          });

          hasilHari.malam.laboratorium = slotsLab.map((sl: any) => {
            const cand = pilihKandidat(hari, 'malam', sl, sudahDipilihMalam, 'laboratorium');
            const terpilih = pilihDariKandidat(cand, indexHariIni);
            if (terpilih) {
              sudahDipilihMalam.add(terpilih.nama);
              terpilih.tugasMingguIni++;
              terpilih.hariTerakhirBriefingSesi = indexHariIni;
            }
            const isFallback = Boolean((cand as any)?._isFallback);
            const materiRes = pilihMateri(sl.divisi || 'Laboratory', sl.kategori, sl.materiTetap, terpilih?.divisi || 'Laboratory');
            return {
              nama: terpilih ? terpilih.nama : 'KOSONG (Tdk ada SDM)',
              nik: terpilih ? terpilih.nik : '',
              pt: terpilih ? terpilih.pt : '',
              materi: materiRes.judul,
              kategori: materiRes.kategori,
              subKategori: materiRes.subKategori,
              kelas: sl.kelas,
              divisi: terpilih?.divisi || sl.divisi || 'Laboratory',
              fileUrl: materiRes.fileUrl,
              isFallback: isFallback,
              isSenam: sl.kategori === 'Senam' || Boolean(sl.isSenam),
              materiId: materiRes.id
            };
          });
        }
      }

      jadwalHasil[hari] = hasilHari;
    });

    res.json({
      success: true,
      poolCount: poolKaryawan.length,
      dates: Object.fromEntries(Object.entries(dates).map(([h, d]) => [h, { iso: d.iso, display: d.display }])),
      jadwal: jadwalHasil,
      warnings: warnings
    });
  } catch (error: any) {
    console.error("Error in P5M randomize:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// COMMIT & PERSISTENCE ENDPOINTS
// ============================================================
p5mRouter.post("/schedules", async (req, res) => {
  try {
    const { dateStart, dateEnd, scheduleData, config, summary, materiItems, createdBy } = req.body;

    const inserted = await db.insert(p5mSchedules).values({
      dateStart,
      dateEnd,
      scheduleData,
      config,
      summary,
      createdBy: createdBy || 'Admin',
    }).returning();

    // Update lastUsed timestamp for presented topics
    if (Array.isArray(materiItems)) {
      for (const item of materiItems) {
        if (item.judul && !item.judul.toLowerCase().includes('senam')) {
          const usedDate = item.isoDate ? new Date(item.isoDate) : new Date();
          await db.update(p5mMateri)
            .set({ lastUsed: usedDate })
            .where(eq(p5mMateri.judul, item.judul));
        }
      }
    }

    res.json({ success: true, data: inserted[0] });
  } catch (error: any) {
    console.error("Error saving P5M schedule:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

p5mRouter.get("/schedules", async (req, res) => {
  try {
    const list = await db.select().from(p5mSchedules).orderBy(desc(p5mSchedules.id)).limit(30);
    res.json({ success: true, data: list });
  } catch (error: any) {
    console.error("Error fetching P5M schedules:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

p5mRouter.get("/schedules/latest", async (req, res) => {
  try {
    const latest = await db.select().from(p5mSchedules).orderBy(desc(p5mSchedules.id)).limit(1);
    res.json({ success: true, data: latest[0] || null });
  } catch (error: any) {
    console.error("Error fetching latest P5M schedule:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// MATERI MANAGEMENT ENDPOINTS (List, Add, Delete)
// ============================================================
p5mRouter.get(["/materi", "/materi-list"], async (req, res) => {
  try {
    const search = (req.query.search as string || '').trim().toLowerCase();
    const kategori = (req.query.kategori as string || '').trim();
    const divisi = (req.query.divisi as string || '').trim();

    let query = db.select().from(p5mMateri);
    const conditions = [];

    if (kategori && kategori !== 'All') {
      conditions.push(eq(p5mMateri.kategori, kategori));
    }
    if (divisi && divisi !== 'All') {
      conditions.push(eq(p5mMateri.divisi, divisi));
    }
    if (search) {
      conditions.push(like(p5mMateri.judul, `%${search}%`));
    }

    let list;
    if (conditions.length > 0) {
      list = await db.select().from(p5mMateri).where(and(...conditions)).orderBy(p5mMateri.judul);
    } else {
      list = await db.select().from(p5mMateri).orderBy(p5mMateri.judul);
    }

    res.json({ success: true, data: list, count: list.length });
  } catch (error: any) {
    console.error("Error fetching materi list:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

p5mRouter.post("/materi", async (req, res) => {
  try {
    const { judul, kategori, subKategori, divisi, base64Data, filename } = req.body;

    if (!judul || !judul.trim()) {
      return res.status(400).json({ success: false, message: "Judul materi wajib diisi." });
    }

    const cleanJudul = judul.trim();
    let finalFileUrl: string | null = null;

    // 1. If image file (base64) provided, upload to Google Drive & save local copy
    if (base64Data) {
      const base64Clean = base64Data.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Clean, 'base64');
      const safeId = Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const localFileName = `p5m_${safeId}.png`;
      const localPath = path.join(process.cwd(), 'public', 'uploads', 'p5m', localFileName);

      // Save local copy
      try {
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'p5m');
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        fs.writeFileSync(localPath, buffer);
      } catch (fErr: any) {
        console.warn("Local cache write failed:", fErr.message);
      }

      // Upload to Google Drive folder P5M_Materi_Flyers
      try {
        const folderId = '1AH151Lrgklv4Q1Ty0vdEgsPES6VcCKps'; // Folder P5M_Materi_Flyers
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);

        const driveRes = await drive.files.create({
          requestBody: {
            name: filename || `P5M_${cleanJudul.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`,
            parents: [folderId]
          },
          media: {
            mimeType: 'image/png',
            body: stream
          },
          fields: 'id, webViewLink',
          supportsAllDrives: true
        });

        const driveFileId = driveRes.data.id;
        if (driveFileId) {
          try {
            await drive.permissions.create({
              fileId: driveFileId,
              requestBody: { role: 'reader', type: 'anyone' },
              supportsAllDrives: true
            });
          } catch (pErr: any) {
            // Permission inherited
          }
          finalFileUrl = `https://drive.google.com/uc?export=view&id=${driveFileId}`;
        }
      } catch (dErr: any) {
        console.warn("Drive upload failed, using local fallback URL:", dErr.message);
        finalFileUrl = `/uploads/p5m/${localFileName}`;
      }
    }

    // Insert into PostgreSQL Cloud SQL
    const inserted = await db.insert(p5mMateri).values({
      judul: cleanJudul,
      kategori: kategori || 'Teknis',
      subKategori: subKategori || 'General',
      divisi: divisi || 'All',
      fileUrl: finalFileUrl,
      lastUsed: null
    }).returning();

    res.json({ success: true, data: inserted[0] });
  } catch (error: any) {
    console.error("Error creating P5M materi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

p5mRouter.delete("/materi/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id || isNaN(id)) {
      return res.status(400).json({ success: false, message: "ID materi tidak valid." });
    }

    await db.delete(p5mMateri).where(eq(p5mMateri.id, id));
    res.json({ success: true, message: "Materi berhasil dihapus." });
  } catch (error: any) {
    console.error("Error deleting P5M materi:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// USER ASSIGNMENT NOTIFICATION (With Past Date Filter)
// ============================================================
p5mRouter.get("/schedules/user-assignment", async (req, res) => {
  try {
    const nik = (req.query.nik as string || '').trim().toLowerCase();
    const name = (req.query.name as string || '').trim().toLowerCase();

    if (!nik && !name) {
      return res.json({ success: true, assignment: null });
    }

    const latest = await db.select().from(p5mSchedules).orderBy(desc(p5mSchedules.id)).limit(1);
    if (latest.length === 0 || !latest[0].scheduleData) {
      return res.json({ success: true, assignment: null });
    }

    const schedule = latest[0];
    const sch = schedule.scheduleData as Record<string, any>;
    const dateStart = schedule.dateStart || '';
    const dateEnd = schedule.dateEnd || '';

    // Calculate current date in WIT (UTC+9)
    const nowUtc = new Date();
    const witTime = new Date(nowUtc.getTime() + (9 * 60 * 60 * 1000));
    const todayIso = witTime.toISOString().split('T')[0]; // "YYYY-MM-DD"

    const URUTAN_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    let foundAssignment: any = null;

    for (const [day, dayData] of Object.entries(sch)) {
      if (!dayData) continue;

      // 1. Calculate specific date for this day
      const dayIdx = URUTAN_HARI.indexOf(day);
      let assignmentDateIso = '';
      if (dayIdx >= 0 && dateStart) {
        const [y, m, d] = dateStart.split('-').map(Number);
        const assignDateObj = new Date(y, m - 1, d + dayIdx);
        const aY = assignDateObj.getFullYear();
        const aM = String(assignDateObj.getMonth() + 1).padStart(2, '0');
        const aD = String(assignDateObj.getDate()).padStart(2, '0');
        assignmentDateIso = `${aY}-${aM}-${aD}`;
      }

      // 2. If the briefing day has already passed today, DO NOT show pop-up notification
      if (assignmentDateIso && todayIso > assignmentDateIso) {
        continue;
      }

      for (const shift of ['pagi', 'malam']) {
        const sData = (dayData as any)[shift];
        if (!sData) continue;

        const slotList: any[] = [];
        if ((dayData as any).tipe === 'gabungan') {
          (sData.gabungan || []).forEach((sl: any) => slotList.push({ ...sl, zone: 'Gabungan' }));
        } else {
          (sData.preparasi || []).forEach((sl: any) => slotList.push({ ...sl, zone: 'Preparasi' }));
          (sData.laboratorium || []).forEach((sl: any) => slotList.push({ ...sl, zone: 'Laboratorium' }));
        }

        for (const slot of slotList) {
          const slotNik = (slot.nik || '').trim().toLowerCase();
          const slotNama = (slot.nama || '').trim().toLowerCase();

          const isMatch = (nik && slotNik === nik) || (name && (slotNama === name || slotNama.includes(name) || name.includes(slotNama)));
          if (isMatch && !slotNama.includes('kosong')) {
            const hasFlyer = !slot.isSenam && slot.materi && !slot.materi.toLowerCase().includes('senam');

            let freshFileUrl: string | null = null;
            if (hasFlyer) {
              const materiRow = await db.select().from(p5mMateri).where(eq(p5mMateri.judul, slot.materi)).limit(1);
              if (materiRow.length > 0 && materiRow[0].fileUrl) {
                freshFileUrl = materiRow[0].fileUrl;
              } else {
                freshFileUrl = `/api/p5m/flyer?title=${encodeURIComponent(slot.materi)}`;
              }
            }

            foundAssignment = {
              scheduleId: schedule.id,
              dateStart,
              dateEnd,
              day,
              assignmentDate: assignmentDateIso,
              shift: shift === 'pagi' ? 'Day Shift (Pagi)' : 'Night Shift (Malam)',
              zone: slot.zone,
              nama: slot.nama,
              nik: slot.nik,
              materi: slot.materi,
              kategori: slot.kategori,
              subKategori: slot.subKategori,
              fileUrl: freshFileUrl,
              isSenam: slot.isSenam
            };
            break;
          }
        }
        if (foundAssignment) break;
      }
      if (foundAssignment) break;
    }

    res.json({ success: true, assignment: foundAssignment });
  } catch (error: any) {
    console.error("Error checking user P5M assignment:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ============================================================
// REAL-TIME / STATIC FLYER SERVING & DOWNLOAD
// ============================================================
p5mRouter.get("/flyer", async (req, res) => {
  try {
    const title = (req.query.title as string || '').trim();
    const notionId = (req.query.notionId as string || '').trim();
    const id = (req.query.id as string || '').trim();
    const isDownload = req.query.download === 'true' || req.query.download === '1';

    let targetFileUrl = '';
    let targetJudul = title || 'Flyer_P5M';

    if (id) {
      const row = await db.select().from(p5mMateri).where(eq(p5mMateri.id, Number(id))).limit(1);
      if (row.length > 0) {
        targetFileUrl = row[0].fileUrl || '';
        targetJudul = row[0].judul || targetJudul;
      }
    } else if (title) {
      const row = await db.select().from(p5mMateri).where(eq(p5mMateri.judul, title)).limit(1);
      if (row.length > 0) {
        targetFileUrl = row[0].fileUrl || '';
        targetJudul = row[0].judul || targetJudul;
      }
    }

    const safeFilename = `Flyer_${targetJudul.replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;

    // 1. If stored locally in /uploads/p5m/..., serve or download directly
    if (targetFileUrl && targetFileUrl.startsWith('/uploads/p5m/')) {
      const cleanPath = targetFileUrl.replace(/^\//, '');
      const localPath = path.join(process.cwd(), 'public', cleanPath);
      if (fs.existsSync(localPath)) {
        if (isDownload) {
          return res.download(localPath, safeFilename);
        }
        return res.sendFile(localPath);
      }
    }

    // 2. If it's a direct Google Drive URL or external image URL
    if (targetFileUrl && targetFileUrl.startsWith('http')) {
      try {
        const fetchRes = await fetch(targetFileUrl);
        if (fetchRes.ok) {
          const contentType = fetchRes.headers.get('content-type') || 'image/png';
          res.setHeader('Content-Type', contentType);
          if (isDownload) {
            res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
          } else {
            res.setHeader('Content-Disposition', 'inline');
          }
          res.setHeader('Cache-Control', 'public, max-age=86400');
          const arrayBuffer = await fetchRes.arrayBuffer();
          return res.send(Buffer.from(arrayBuffer));
        }
      } catch (fErr: any) {
        console.warn("Direct stream failed, attempting redirect:", fErr.message);
        return res.redirect(targetFileUrl);
      }
    }

    return res.status(404).send('Flyer tidak ditemukan');
  } catch (error: any) {
    console.error('Error serving P5M flyer:', error);
    res.status(500).send('Gagal memuat flyer');
  }
});
