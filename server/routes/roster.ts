import { Router } from "express";
import { db, isDbCircuitBroken } from "../../src/db/index.js";
import { eq, desc, or, inArray, isNull, and, gte, lte } from "drizzle-orm";
import { 
  chatMessages, employees, equipments, workOrders, users, tickets, downtime, 
  spareparts, apdSettings, apdHistory, apdDocuments, roster, inspections, 
  pemantauan, questions, agendaEvents, privateNotes, userThemes, bulletinPosts, 
  notifications, bulletinComments, uploadedFiles, appSettings, pelanggaran, 
  mealReports, pushSubscriptions, quizQuestions, preplabCloudLogs, quizScores, induksi,
  developerUsers
} from "../../src/db/schema.js";
import { generatePdfFromTemplate, drive } from '../../google-services.js';
import { 
  sendWebPush, getUniverse, uploadFileToDrive, syncBulletinToAgenda, 
  getNotificationTargets, getTableObj, sanitizePayload 
} from "../utils.js";
import webpush from 'web-push';
import path from "path";
import { syncSingleEmployeeMealOrder } from "./mealOrders.js";
import { getCsvEmployees } from "./employees.js";

export const router = Router();

export async function isAuthorizedRosterEditor(editorNik?: string): Promise<boolean> {
  if (!editorNik) return false;
  const nik = String(editorNik).trim();
  if (!nik) return false;

  // Superadmins / Default Developer accounts
  if (nik === '02D25000055' || nik === '02D24000043' || nik === 'M0403240177' || nik === 'preplabadmin') return true;

  // Check Developer Users table
  try {
    const dev = await db.select().from(developerUsers).where(eq(developerUsers.nik, nik)).limit(1);
    if (dev.length > 0) return true;
  } catch (e) {}

  // Check Employees table for Administration section/role
  try {
    const emp = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
    if (emp.length > 0) {
      const e = emp[0];
      const sec = (e.section || '').toLowerCase();
      const dep = (e.department || '').toLowerCase();
      const jab = (e.jabatan || '').toLowerCase();
      if (
        sec.includes('admin') ||
        sec.includes('administrasi') ||
        dep.includes('admin') ||
        dep.includes('administrasi') ||
        jab.includes('admin') ||
        jab.includes('administrasi')
      ) {
        return true;
      }
    }
  } catch (e) {}

  return false;
}

let cachedRosterResult: any[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache

export function invalidateRosterCache() {
  cachedRosterResult = null;
  lastCacheTime = 0;
}

export async function computeRosterData() {
  const rawEmps = await db.select().from(employees);
  const allEmps = rawEmps.filter(emp => {
    const nik = (emp.nik || '').toUpperCase().trim();
    const name = (emp.name || '').toLowerCase().trim();
    const username = (emp.username || '').toLowerCase().trim();
    const sec = (emp.section || '').toUpperCase().trim();
    const st = (emp.statusKaryawan || '').toUpperCase().trim();
    const sm = (emp.statusMess || '').toUpperCase().trim();
    if (
      nik === 'DEMO123' || nik === 'DEMO' || nik.includes('DEMO') ||
      name.includes('user demo') || name.includes('demo staging') || name.includes('staging') ||
      username.includes('demo') || username.includes('staging') ||
      nik === 'PREPLABADMIN' || nik.includes('#N/A') || name.includes('#N/A') ||
      sec.includes('#N/A') || st.includes('RESIGN') || st.includes('PHK') || st.includes('KELUAR') ||
      sm.includes('RESIGN') || [
        '04D24000052', '02D23000050', '04D25000062', '04D25000045', 'M0405240291', 'M0210190719', 'M0506260356',
        'M0206250825', 'M0203220107', 'M0402240107', 'M0402230177', 'M0205250595', 'M0201250027', 'M0206250798', 'M0403240137', 'M0404220419'
      ].includes(nik)
    ) {
      return false;
    }
    return true;
  });

  const allRoster = await db.select({
    nik: roster.nik,
    date: roster.date,
    status: roster.status
  }).from(roster);

  const rosterByNik: Record<string, Record<string, string>> = {};
  for (const r of allRoster) {
    if (!r.nik || !r.date) continue;
    if (!rosterByNik[r.nik]) rosterByNik[r.nik] = {};
    rosterByNik[r.nik][r.date] = r.status || '-';
  }

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayTimestamp = todayDate.getTime();

  const idToEnMonths: Record<string, string> = {
    'mei': 'May', 'agu': 'Aug', 'ags': 'Aug', 'okt': 'Oct', 'des': 'Dec'
  };
  function normalizeDateStr(dStr: string): string {
    if (!dStr) return '';
    let s = String(dStr).trim();
    for (const [idm, enm] of Object.entries(idToEnMonths)) {
      s = s.replace(new RegExp(`\\b${idm}\\b`, 'gi'), enm);
    }
    return s;
  }

  // Fast date timestamp cache to eliminate repeated Date parsing
  const dateTimestampMap = new Map<string, number>();
  function getDateTs(dStr: string): number {
    let ts = dateTimestampMap.get(dStr);
    if (ts === undefined) {
      const norm = normalizeDateStr(dStr);
      ts = new Date(norm).getTime();
      if (isNaN(ts)) ts = 0;
      dateTimestampMap.set(dStr, ts);
    }
    return ts;
  }

  // Pre-generate next 7 days template once
  const next7DaysTemplate: Array<{ day: string; date: string }> = [];
  const iterDate = new Date();
  for (let i = 0; i < 7; i++) {
    const parts = iterDate.toDateString().split(' ');
    const day = parseInt(parts[2], 10);
    const formattedDate = `${day} ${parts[1]} ${parts[3].substring(2)}`;
    next7DaysTemplate.push({
      day: parts[0],
      date: formattedDate
    });
    iterDate.setDate(iterDate.getDate() + 1);
  }

  const trvCodes = new Set(['TRV', 'TV', 'C', 'CR', 'CE', 'CT', 'CI', 'CS', 'XP', 'TT', 'IK', 'I', 'SL', 'SS', 'IA', 'UL', 'DL']);
  function isTrvStatus(status?: string): boolean {
    if (!status) return false;
    const u = status.toUpperCase().trim();
    return trvCodes.has(u) || u.startsWith('CT') || u.startsWith('CE') || u.startsWith('CI') || u.startsWith('CS') || u.startsWith('CR');
  }

  const workCodes = new Set(['D', 'N', 'LS', 'S']);

  function checkIsGolonganI(emp: any): boolean {
    const golUpper = (emp.gol || '').toString().trim().toUpperCase();
    const jobGradeUpper = (emp.jobGrade || '').toString().trim().toUpperCase();
    const jabatanLower = (emp.jabatan || emp.position || '').toString().trim().toLowerCase();
    
    if (golUpper === 'I' || golUpper === '1' || golUpper === 'I.1' || golUpper === '1.1' || golUpper === 'S1.1' || golUpper === 'S1.2') {
      return true;
    }
    if (jobGradeUpper.startsWith('S1') || jobGradeUpper.startsWith('1.') || jobGradeUpper === '1' || jobGradeUpper === 'I') {
      return true;
    }
    if (jabatanLower.includes('crew') || jabatanLower.includes('helper') || jabatanLower.includes('operator')) {
      if (!jabatanLower.includes('foreman') && !jabatanLower.includes('supervisor') && !jabatanLower.includes('admin') && !jabatanLower.includes('superintendent') && !jabatanLower.includes('manager') && !jabatanLower.includes('lead')) {
        return true;
      }
    }
    return false;
  }

  const result = allEmps.map(emp => {
    const sched = rosterByNik[emp.nik] || {};
    const isGol1 = checkIsGolonganI(emp);

    let lastTrvDate: string | null = null;
    let nextTrvDate: string | null = null;
    let nextWorkDate: string | null = null;
    let outsiteDate: string | null = null;
    let onsiteDate: string | null = null;
    let masukKerjaDate: string | null = null;

    const datesAsc = Object.keys(sched).sort((a, b) => getDateTs(a) - getDateTs(b));

    // Find active or upcoming leave block around today
    const todayIndex = datesAsc.findIndex(d => getDateTs(d) >= todayTimestamp);
    let activeLeaveIdx = -1;
    if (todayIndex !== -1) {
      if (isTrvStatus(sched[datesAsc[todayIndex]])) {
        activeLeaveIdx = todayIndex;
        while (activeLeaveIdx > 0 && isTrvStatus(sched[datesAsc[activeLeaveIdx - 1]])) {
          activeLeaveIdx--;
        }
      } else {
        for (let i = todayIndex; i < datesAsc.length; i++) {
          if (isTrvStatus(sched[datesAsc[i]])) {
            activeLeaveIdx = i;
            break;
          }
        }
      }
    }

    if (activeLeaveIdx !== -1) {
      const currentLeaveBlock: string[] = [];
      let i = activeLeaveIdx;
      while (i < datesAsc.length && isTrvStatus(sched[datesAsc[i]])) {
        currentLeaveBlock.push(datesAsc[i]);
        i++;
      }

      if (currentLeaveBlock.length > 0) {
        if (!isGol1) {
          // ── GOLONGAN II KE ATAS ──
          // Outsite: first TRV (or first leave day in block)
          const firstTrv = currentLeaveBlock.find(d => {
            const code = (sched[d] || '').toUpperCase().trim();
            return code === 'TRV' || code === 'TV';
          });
          outsiteDate = firstTrv || currentLeaveBlock[0];

          // Onsite: Returning TRV (TRV at/near the end of leave block, after leave days)
          const firstLeaveDayIdx = currentLeaveBlock.findIndex(d => {
            const code = (sched[d] || '').toUpperCase().trim();
            return code !== 'TRV' && code !== 'TV';
          });

          let returningTrv: string | null = null;
          if (firstLeaveDayIdx !== -1) {
            for (let k = currentLeaveBlock.length - 1; k >= firstLeaveDayIdx; k--) {
              const code = (sched[currentLeaveBlock[k]] || '').toUpperCase().trim();
              if (code === 'TRV' || code === 'TV') {
                returningTrv = currentLeaveBlock[k];
                break;
              }
            }
          }

          onsiteDate = returningTrv || currentLeaveBlock[currentLeaveBlock.length - 1];
        } else {
          // ── GOLONGAN I ──
          // Outsite: first C (or first leave day in block)
          const firstC = currentLeaveBlock.find(d => {
            const code = (sched[d] || '').toUpperCase().trim();
            return code === 'C' || code.startsWith('C') || code.startsWith('CT');
          });
          outsiteDate = firstC || currentLeaveBlock[0];

          // Onsite: C terakhir di dalam blok cuti
          const allC = currentLeaveBlock.filter(d => {
            const code = (sched[d] || '').toUpperCase().trim();
            return code === 'C' || code.startsWith('C') || code.startsWith('CT');
          });
          onsiteDate = allC.length > 0 ? allC[allC.length - 1] : currentLeaveBlock[currentLeaveBlock.length - 1];
        }

        // Masuk Kerja: 1 hari setelah akhir blok cuti atau setelah Onsite
        const lastLeaveDay = currentLeaveBlock[currentLeaveBlock.length - 1];
        const lastLeaveGlobalIdx = datesAsc.indexOf(lastLeaveDay);
        if (lastLeaveGlobalIdx !== -1 && lastLeaveGlobalIdx + 1 < datesAsc.length) {
          masukKerjaDate = datesAsc[lastLeaveGlobalIdx + 1];
        } else if (onsiteDate) {
          const onsiteGlobalIdx = datesAsc.indexOf(onsiteDate);
          if (onsiteGlobalIdx !== -1 && onsiteGlobalIdx + 1 < datesAsc.length) {
            masukKerjaDate = datesAsc[onsiteGlobalIdx + 1];
          } else {
            const norm = normalizeDateStr(onsiteDate);
            const d = new Date(norm);
            if (!isNaN(d.getTime())) {
              d.setDate(d.getDate() + 1);
              const parts = d.toDateString().split(' ');
              if (parts && parts.length >= 4 && parts[3]) {
                const day = parseInt(parts[2], 10);
                masukKerjaDate = `${day} ${parts[1]} ${parts[3].substring(2)}`;
              } else {
                masukKerjaDate = '-';
              }
            } else {
              masukKerjaDate = '-';
            }
          }
        }
      }
    }

    // Search backwards for last TRV/Leave before or on today
    for (let i = datesAsc.length - 1; i >= 0; i--) {
      const date = datesAsc[i];
      if (getDateTs(date) <= todayTimestamp && isTrvStatus(sched[date])) {
        lastTrvDate = date;
        break;
      }
    }

    // Search forwards for next TRV/Leave and next Work date
    for (let i = 0; i < datesAsc.length; i++) {
      const date = datesAsc[i];
      if (getDateTs(date) >= todayTimestamp) {
        if (!nextTrvDate && isTrvStatus(sched[date])) {
          nextTrvDate = date;
        }
        if (!nextWorkDate && workCodes.has(sched[date])) {
          nextWorkDate = date;
        }
        if (nextTrvDate && nextWorkDate) break;
      }
    }

    const next7Days = next7DaysTemplate.map(t => ({
      day: t.day,
      date: t.date,
      shiftCode: sched[t.date] || '-'
    }));

    return {
      nik: emp.nik,
      name: emp.name,
      jabatan: emp.jabatan,
      department: emp.department || emp.section,
      section: emp.section,
      gol: emp.gol,
      jobGrade: emp.jobGrade,
      shift: emp.shift,
      poh: emp.poh,
      pt: emp.pt,
      statusMess: emp.statusMess,
      rotation: emp.rotation,
      joinDate: emp.tanggalAwalBergabung,
      permanentDate: emp.tanggalBergabungTerbaru,
      statusKontrak: emp.statusKontrak,
      lastTrvDate,
      nextTrvDate,
      nextWorkDate,
      outsiteDate,
      onsiteDate,
      masukKerjaDate,
      schedule: next7Days,
      fullSchedule: sched
    };
  });

  return result;
}

export function generateFallbackRosterData(): any[] {
  const emps = getCsvEmployees();
  const today = new Date();
  const next7DaysTemplate: any[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayStr = d.toLocaleDateString('id-ID', { weekday: 'short' });
    const dateStr = d.toISOString().slice(0, 10);
    next7DaysTemplate.push({ day: dayStr, date: dateStr });
  }

  return emps.map(emp => ({
    nik: emp.nik,
    name: emp.name,
    jabatan: emp.jabatan,
    department: emp.department || emp.section,
    section: emp.section,
    gol: emp.gol,
    jobGrade: emp.jobGrade,
    shift: emp.shift || 'Nonshift',
    poh: emp.poh || 'Site',
    pt: emp.pt,
    statusMess: emp.statusMess || 'CR',
    rotation: emp.rotation || '6:2',
    joinDate: emp.dohAwal || '',
    permanentDate: '',
    statusKontrak: 'PKWTT',
    lastTrvDate: null,
    nextTrvDate: null,
    nextWorkDate: null,
    outsiteDate: null,
    onsiteDate: null,
    masukKerjaDate: null,
    schedule: next7DaysTemplate.map(t => ({ day: t.day, date: t.date, shiftCode: 'D' })),
    fullSchedule: {}
  }));
}

router.get("/api/roster", async (req, res) => {
  try {
    const isForceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    if (!cachedRosterResult || isForceRefresh || (Date.now() - lastCacheTime > CACHE_TTL_MS)) {
      if (isDbCircuitBroken()) {
        cachedRosterResult = generateFallbackRosterData();
        lastCacheTime = Date.now();
      } else {
        try {
          cachedRosterResult = await Promise.race([
            computeRosterData(),
            new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Roster DB timeout")), 25000))
          ]);
          lastCacheTime = Date.now();
        } catch (dbErr: any) {
          console.warn("[Roster DB offline/timeout, using fallback]:", dbErr?.message);
          if (!cachedRosterResult) {
            cachedRosterResult = generateFallbackRosterData();
            lastCacheTime = Date.now();
          }
        }
      }
    }
    res.json(cachedRosterResult);
  } catch (e: any) {
    console.warn("Roster error, serving fallback:", e?.message);
    res.json(generateFallbackRosterData());
  }
});

router.post("/api/roster/cell", async (req, res) => {
  try {
    const { nik, date, status, editorNik } = req.body;
    const reqNik = editorNik || req.headers['x-user-nik'] || (req as any).session?.userNik;

    if (reqNik) {
      const isAuth = await isAuthorizedRosterEditor(reqNik as string);
      if (!isAuth) {
        return res.status(403).json({ error: "Akses ditolak: Pengeditan roster hanya dapat dilakukan oleh Tim Administrasi dan Developer." });
      }
    }

    if (!nik || !date) {
      return res.status(400).json({ error: "nik and date are required" });
    }

    let properDate = date;
    if (date.includes('-')) {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        const parts = d.toDateString().split(' ');
        if (parts && parts.length >= 4 && parts[3]) {
          const day = parseInt(parts[2], 10);
          properDate = day + ' ' + parts[1] + ' ' + parts[3].substring(2);
        }
      }
    }

    const existing = await db.select().from(roster).where(and(eq(roster.nik, nik), eq(roster.date, properDate))).limit(1);
    
    if (existing.length > 0) {
      await db.update(roster).set({ status: status || '-' }).where(eq(roster.id, existing[0].id));
    } else {
      await db.insert(roster).values({ nik: nik, date: properDate, status: status || '-' });
    }
    invalidateRosterCache();

    // Otomatis sinkronkan orderan makanan karyawan jika baris order makan tanggal ini sudah ada
    try {
      syncSingleEmployeeMealOrder(nik, properDate, status || '-', reqNik as string);
    } catch (mealErr) {
      console.warn('[Auto-sync Meal Order on Roster Cell Change Warning]:', mealErr);
    }

    res.json({ success: true, nik, date: properDate, status });
  } catch (e: any) {
    console.error("Error updating roster cell:", e);
    res.status(500).json({ error: "Failed to update roster cell" });
  }
});

router.post("/api/roster/izin", async (req, res) => {
    try {
      const { nik, date, type, editorNik } = req.body;
      const reqNik = editorNik || req.headers['x-user-nik'] || (req as any).session?.userNik;

      if (reqNik) {
        const isAuth = await isAuthorizedRosterEditor(reqNik as string);
        if (!isAuth) {
          return res.status(403).json({ error: "Akses ditolak: Pengeditan roster hanya dapat dilakukan oleh Tim Administrasi dan Developer." });
        }
      }

      const formattedDate = new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/,/g, '');
      
      const d = new Date(date);
      let properDate = date;
      if (!isNaN(d.getTime())) {
        const parts = d.toDateString().split(' ');
        if (parts && parts.length >= 4 && parts[3]) {
          const day = parseInt(parts[2], 10);
          properDate = day + ' ' + parts[1] + ' ' + parts[3].substring(2);
        }
      }

      const existing = await db.select().from(roster).where(and(eq(roster.nik, nik), eq(roster.date, properDate))).limit(1);
      
      if (existing.length > 0) {
        await db.update(roster).set({ status: type }).where(eq(roster.id, existing[0].id));
      } else {
        await db.insert(roster).values({ nik: nik, date: properDate, status: type });
      }
      invalidateRosterCache();

      // Otomatis sinkronkan orderan makanan karyawan
      try {
        syncSingleEmployeeMealOrder(nik, properDate, type, reqNik as string);
      } catch (mealErr) {
        console.warn('[Auto-sync Meal Order on Roster Izin Change Warning]:', mealErr);
      }

      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to add izin" });
    }
  });

router.post("/api/roster/import-excel", async (req, res) => {
  try {
    const reqNik = req.body?.editorNik || req.headers['x-user-nik'] || (req as any).session?.userNik;
    if (reqNik) {
      const isAuth = await isAuthorizedRosterEditor(reqNik as string);
      if (!isAuth) {
        return res.status(403).json({ 
          success: false, 
          message: "Akses ditolak: Import roster hanya dapat dilakukan oleh Tim Administrasi dan Developer." 
        });
      }
    }

    const { 
      employees: empList = [], 
      rosters: rosterList = [], 
      cuti: cutiList = [],
      updateEmployees = true,
      updateRosters = true,
      updateCuti = true,
      fileName = "roster.xlsx"
    } = req.body;

    let updatedEmpsCount = 0;
    let updatedRostersCount = 0;
    let updatedCutiCount = 0;

    // 1. Upsert Profil Karyawan (jika dipilih)
    if (updateEmployees && Array.isArray(empList) && empList.length > 0) {
      const uniqueEmpMap = new Map<string, any>();
      for (const emp of empList) {
        if (emp && emp.nik) {
          uniqueEmpMap.set(emp.nik.trim(), emp);
        }
      }

      for (const emp of uniqueEmpMap.values()) {
        // Lindungi foto profil (avatar) dan kredensial akun agar tidak tertimpa NULL saat import roster/excel
        const { avatar, cover, passwordHash, firstLoginComplete, homeTutorialCompleted, equippedFrame, equippedTitle, ...safeFields } = emp;
        const updateSet: any = { ...safeFields };
        if (avatar && typeof avatar === 'string' && avatar.trim() && avatar !== 'null') {
          updateSet.avatar = avatar.trim();
        }
        if (cover && typeof cover === 'string' && cover.trim() && cover !== 'null') {
          updateSet.cover = cover.trim();
        }

        await db.insert(employees)
          .values(emp)
          .onConflictDoUpdate({
            target: employees.nik,
            set: updateSet
          });
        updatedEmpsCount++;
      }
    }

    // 2. Upsert Jadwal Roster (jika dipilih)
    if (updateRosters && Array.isArray(rosterList) && rosterList.length > 0) {
      const targetNiks = Array.from(new Set(rosterList.map((r: any) => r.nik).filter(Boolean)));
      const targetDates = Array.from(new Set(rosterList.map((r: any) => r.date).filter(Boolean)));

      // Hapus entri lama untuk kombinasi NIK dan Tanggal yang diimpor ini (chunked delete)
      if (targetNiks.length > 0 && targetDates.length > 0) {
        const deleteChunkSize = 100;
        for (let k = 0; k < targetNiks.length; k += deleteChunkSize) {
          const chunkNiks = targetNiks.slice(k, k + deleteChunkSize);
          await db.delete(roster).where(
            and(
              inArray(roster.nik, chunkNiks as string[]),
              inArray(roster.date, targetDates as string[])
            )
          );
        }
      }

      // Batch insert entri roster baru (chunk 2000)
      const insertChunkSize = 2000;
      for (let j = 0; j < rosterList.length; j += insertChunkSize) {
        const chunk = rosterList.slice(j, j + insertChunkSize);
        await db.insert(roster).values(chunk);
      }
      updatedRostersCount = rosterList.length;
    }

    // 3. Update Cuti Tahunan (jika ada dan dipilih)
    if (updateCuti && Array.isArray(cutiList) && cutiList.length > 0) {
      const allDbEmp = await db.select({ id: employees.id, nik: employees.nik, name: employees.name }).from(employees);
      const empByNik = new Map<string, number>();
      const empByName = new Map<string, number>();
      allDbEmp.forEach(e => {
        if (e.nik) empByNik.set(e.nik.trim(), e.id);
        if (e.name) empByName.set(e.name.trim().toLowerCase(), e.id);
      });

      for (const item of cutiList) {
        const nik = (item.nik || '').trim();
        const name = (item.name || '').trim();
        let targetId = empByNik.get(nik);
        if (!targetId && name) {
          targetId = empByName.get(name.toLowerCase());
        }
        if (targetId) {
          await db.update(employees)
            .set({ sisaCt: item.sisaCt, jatuhTempoCt: item.jatuhTempoCt })
            .where(eq(employees.id, targetId));
          updatedCutiCount++;
        }
      }
    }

    // Refresh cache roster
    invalidateRosterCache();

    res.json({
      success: true,
      message: `Import Excel (${fileName}) berhasil: ${updatedEmpsCount} profil karyawan, ${updatedRostersCount} jadwal shift, dan ${updatedCutiCount} data cuti diperbarui.`,
      stats: {
        employees: updatedEmpsCount,
        rosters: updatedRostersCount,
        cuti: updatedCutiCount
      }
    });
  } catch (error: any) {
    console.error("Error in roster excel import:", error);
    res.status(500).json({ success: false, message: error.message || "Gagal mengimpor file Excel" });
  }
});

router.post(["/api/roster/sync", "/api/admin/sync-roster"], async (req, res) => {
  try {
    const reqNik = req.body?.editorNik || req.headers['x-user-nik'] || (req as any).session?.userNik;
    if (reqNik) {
      const isAuth = await isAuthorizedRosterEditor(reqNik as string);
      if (!isAuth) {
        return res.status(403).json({ success: false, message: "Akses ditolak: Sinkronisasi roster hanya dapat dilakukan oleh Tim Administrasi dan Developer." });
      }
    }

    const { syncRosterData } = await import("../../src/syncRoster.js");
    const result = await syncRosterData();
    if (result.success) {
      invalidateRosterCache();
      res.json({ success: true, ...result });
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error: any) {
    console.error("Error in roster manual sync:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Pre-warm cache asynchronously on server start
setTimeout(() => {
  computeRosterData().then(res => {
    cachedRosterResult = res;
    lastCacheTime = Date.now();
    console.log(`⚡ Roster cache pre-warmed successfully (${res.length} employees)`);
  }).catch(e => {
    console.warn("Roster cache pre-warm warning:", e.message);
  });
}, 1000);


// ── KONTROL CUTI (Jadwal Inspeksi) ────────────────────────────────────────────
// Dibaca langsung dari Google Sheet "Database Roster Prep & Lab" (tab Rooster_Staff & Rooster_Crew)
const LEAVE_ROSTER_SHEET_ID = "1iijlFReGxHyMiFAbd0J5-yfs1udWvZo4ydrJJKJBCNo";
const LEAVE_ROSTER_TABS = [
  { type: 'Staff', sheet: 'Rooster_Staff', colSection: 5, colGol: 6, colShift: 7, dateStartCol: 15 },
  { type: 'Crew', sheet: 'Rooster_Crew', colSection: 4, colGol: 5, colShift: 6, dateStartCol: 14 }
];
const LEAVE_RESIGNED_NIKS = new Set([
  '04D24000052', '02D23000050', '04D25000062', '04D25000045', 'M0405240291', 'M0210190719', 'M0506260356',
  'M0206250825', 'M0203220107', 'M0402240107', 'M0402230177', 'M0205250595', 'M0201250027', 'M0206250798', 'M0403240137', 'M0404220419'
]);
const ONSITE_CODES = new Set(['D', 'N', 'OFF', 'LS']);
// Kontrol cuti hanya untuk karyawan Gol II – V (crew Gol I tidak termasuk)
const LEAVE_CONTROL_GOL = new Set(['II', 'III', 'IV', 'V']);
const LEAVE_CACHE_TTL = 10 * 60 * 1000;
let leaveRosterCache: { data: any[]; timestamp: number } | null = null;

// Kategori kode roster untuk tampilan Kontrol Cuti
function leaveCategory(code: string): string {
  const c = code.toUpperCase();
  if (!c || c === '-') return 'KOSONG';
  // CS (Cuti Site) tetap di site → tidak dihitung tidak onsite
  if (ONSITE_CODES.has(c) || /^CS\d*$/.test(c)) return 'ONSITE';
  if (c === 'TRV') return 'TRV';
  if (c === 'SS') return 'SS';
  if (c === 'SL') return 'SL';
  if (c === 'I' || c === 'IK') return 'IZIN';
  if (c === 'DL') return 'DINAS';
  if (/^(C|CT|CE|CS|CI)\d*$/.test(c)) return 'CUTI';
  return 'LAINNYA';
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, mei: 4, jun: 5, jul: 6, aug: 7, agu: 7, ags: 7, sep: 8, oct: 9, okt: 9, nov: 10, dec: 11, des: 11
};
// Header tanggal sheet: "17 Oct 26" → "2026-10-17"
function rosterHeaderToIso(h: string): string | null {
  const m = (h || '').trim().match(/^(\d{1,2})\s+([A-Za-z]{3})\w*\s+(\d{2,4})$/);
  if (!m) return null;
  const month = MONTH_INDEX[m[2].toLowerCase()];
  if (month === undefined) return null;
  const year = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(parseInt(m[1], 10)).padStart(2, '0')}`;
}

export async function loadLeaveRoster(force = false): Promise<any[]> {
  if (!force && leaveRosterCache && Date.now() - leaveRosterCache.timestamp < LEAVE_CACHE_TTL) {
    return leaveRosterCache.data;
  }
  const Papa = (await import('papaparse')).default;
  const result: any[] = [];
  for (const tab of LEAVE_ROSTER_TABS) {
    const url = `https://docs.google.com/spreadsheets/d/${LEAVE_ROSTER_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${tab.sheet}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Gagal membaca sheet ${tab.sheet}: ${res.status}`);
    const rows = Papa.parse(await res.text(), { skipEmptyLines: true }).data as string[][];
    if (rows.length < 2) continue;
    const dateCols = rows[0].map((h, i) => (i >= tab.dateStartCol ? rosterHeaderToIso(h) : null));
    for (const r of rows.slice(1)) {
      const nik = (r[2] || '').trim();
      const name = (r[1] || '').trim();
      if (!nik || !name || nik.includes('#') || LEAVE_RESIGNED_NIKS.has(nik.toUpperCase())) continue;
      const days: Record<string, string> = {};
      dateCols.forEach((iso, i) => { if (iso) days[iso] = (r[i] || '').trim().toUpperCase(); });
      result.push({ nik, name, jabatan: (r[3] || '').trim(), section: (r[tab.colSection] || '').trim(), gol: (r[tab.colGol] || '').trim().toUpperCase(), team: (r[tab.colShift] || '').trim(), type: tab.type, days });
    }
  }
  leaveRosterCache = { data: result, timestamp: Date.now() };
  return result;
}

function shiftIsoDate(iso: string, delta: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// GET /api/roster/leave-control?dates=2026-10-19,2026-10-20,2026-10-21
// Karyawan Gol II – V yang tidak onsite (Cuti/Izin/SS/SL/TRV/dll.) pada tanggal-tanggal tsb, beserta awal & akhir cuti.
// Awal = hari pertama blok non-onsite; Akhir = hari terakhir sebelum kode berganti ke D/N/OFF/LS.
router.get("/api/roster/leave-control", async (req, res) => {
  try {
    const dates = String(req.query.dates || '').split(',').map(s => s.trim()).filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s));
    if (dates.length === 0) return res.status(400).json({ success: false, message: 'Parameter dates wajib (YYYY-MM-DD, dipisah koma)' });
    const all = await loadLeaveRoster(req.query.refresh === 'true');

    let onsiteCount = 0;
    const list: any[] = [];
    for (const emp of all) {
      if (!LEAVE_CONTROL_GOL.has(emp.gol)) continue;
      const codes = dates.map(d => emp.days[d] || '');
      if (codes.every(c => !c || c === '-')) continue; // tidak ada data roster (belum bergabung / non-aktif)
      const firstOff = dates.find(d => {
        const cat = leaveCategory(emp.days[d] || '');
        return cat !== 'ONSITE' && cat !== 'KOSONG';
      });
      if (!firstOff) { onsiteCount++; continue; }

      const isOff = (d: string) => {
        const cat = leaveCategory(emp.days[d] || '');
        return cat !== 'ONSITE' && cat !== 'KOSONG';
      };
      let start = firstOff;
      for (let i = 0; i < 120 && isOff(shiftIsoDate(start, -1)); i++) start = shiftIsoDate(start, -1);
      let end = firstOff;
      for (let i = 0; i < 120 && isOff(shiftIsoDate(end, 1)); i++) end = shiftIsoDate(end, 1);
      const nextDay = shiftIsoDate(end, 1);
      const returnCode = emp.days[nextDay] || '';

      // Kategori utama: kode non-onsite yang paling sering di blok (selain TRV), fallback TRV
      const blockCats: Record<string, number> = {};
      for (let d = start; d <= end; d = shiftIsoDate(d, 1)) {
        const cat = leaveCategory(emp.days[d] || '');
        blockCats[cat] = (blockCats[cat] || 0) + 1;
      }
      const main = Object.entries(blockCats).filter(([k]) => k !== 'TRV').sort((a, b) => b[1] - a[1])[0]?.[0] || 'TRV';

      list.push({
        nik: emp.nik, name: emp.name, jabatan: emp.jabatan, section: emp.section, gol: emp.gol, type: emp.type,
        category: main,
        days: dates.map(d => ({ date: d, code: emp.days[d] || '', category: leaveCategory(emp.days[d] || '') })),
        leaveStart: start,
        leaveEnd: end,
        returnDate: leaveCategory(returnCode) === 'ONSITE' ? nextDay : null,
        returnCode: returnCode || null,
        totalDays: Math.round((new Date(`${end}T12:00:00Z`).getTime() - new Date(`${start}T12:00:00Z`).getTime()) / 86400000) + 1
      });
    }
    list.sort((a, b) => a.leaveStart.localeCompare(b.leaveStart) || a.name.localeCompare(b.name));
    res.json({ success: true, dates, onsiteCount, total: list.length, data: list });
  } catch (error: any) {
    console.error('Error leave-control roster:', error);
    res.status(500).json({ success: false, message: error.message || 'Gagal membaca roster' });
  }
});
