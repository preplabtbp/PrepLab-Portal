import { Router } from "express";
import { db } from "../../src/db/index.js";
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

export const router = Router();

async function isAuthorizedRosterEditor(editorNik?: string): Promise<boolean> {
  if (!editorNik) return false;
  const nik = String(editorNik).trim();
  if (!nik) return false;

  // Superadmins / Default Developer accounts
  if (nik === '02D25000055' || nik === '02D24000043' || nik === 'preplabadmin') return true;

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

async function computeRosterData() {
  const allEmps = await db.select().from(employees);
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

  // Fast date timestamp cache to eliminate repeated Date parsing
  const dateTimestampMap = new Map<string, number>();
  function getDateTs(dStr: string): number {
    let ts = dateTimestampMap.get(dStr);
    if (ts === undefined) {
      ts = new Date(dStr).getTime();
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

  const trvCodes = new Set(['TRV', 'TV', 'C', 'CR', 'CE', 'CT', 'CI', 'XP', 'TT']);
  function isTrvStatus(status?: string): boolean {
    if (!status) return false;
    return trvCodes.has(status) || status.startsWith('CT') || status.startsWith('CE');
  }

  const workCodes = new Set(['D', 'N', 'LS', 'S']);

  const result = allEmps.map(emp => {
    const sched = rosterByNik[emp.nik] || {};

    let lastTrvDate: string | null = null;
    let nextTrvDate: string | null = null;
    let nextWorkDate: string | null = null;

    const datesAsc = Object.keys(sched).sort((a, b) => getDateTs(a) - getDateTs(b));

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
      schedule: next7Days,
      fullSchedule: sched
    };
  });

  return result;
}

router.get("/api/roster", async (req, res) => {
  try {
    const isForceRefresh = req.query.refresh === 'true' || req.query.refresh === '1';
    if (!cachedRosterResult || isForceRefresh || (Date.now() - lastCacheTime > CACHE_TTL_MS)) {
      cachedRosterResult = await computeRosterData();
      lastCacheTime = Date.now();
    }
    res.json(cachedRosterResult);
  } catch (e) {
    console.error("Error fetching roster:", e);
    res.status(500).json({ error: "Failed to fetch roster" });
  }
});

router.post("/api/roster/cell", async (req, res) => {
  try {
    const { nik, date, status, editorNik } = req.body;
    const reqNik = editorNik || req.headers['x-user-nik'] || (req.session as any)?.userNik;

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
      const parts = new Date(date).toDateString().split(' ');
      const day = parseInt(parts[2], 10);
      properDate = day + ' ' + parts[1] + ' ' + parts[3].substring(2);
    }

    const existing = await db.select().from(roster).where(and(eq(roster.nik, nik), eq(roster.date, properDate))).limit(1);
    
    if (existing.length > 0) {
      await db.update(roster).set({ status: status || '-' }).where(eq(roster.id, existing[0].id));
    } else {
      await db.insert(roster).values({ nik: nik, date: properDate, status: status || '-' });
    }
    invalidateRosterCache();
    res.json({ success: true, nik, date: properDate, status });
  } catch (e: any) {
    console.error("Error updating roster cell:", e);
    res.status(500).json({ error: "Failed to update roster cell" });
  }
});

router.post("/api/roster/izin", async (req, res) => {
    try {
      const { nik, date, type, editorNik } = req.body;
      const reqNik = editorNik || req.headers['x-user-nik'] || (req.session as any)?.userNik;

      if (reqNik) {
        const isAuth = await isAuthorizedRosterEditor(reqNik as string);
        if (!isAuth) {
          return res.status(403).json({ error: "Akses ditolak: Pengeditan roster hanya dapat dilakukan oleh Tim Administrasi dan Developer." });
        }
      }

      const formattedDate = new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/,/g, '');
      
      const parts = new Date(date).toDateString().split(' ');
      const day = parseInt(parts[2], 10);
      const properDate = day + ' ' + parts[1] + ' ' + parts[3].substring(2);

      const existing = await db.select().from(roster).where(and(eq(roster.nik, nik), eq(roster.date, properDate))).limit(1);
      
      if (existing.length > 0) {
        await db.update(roster).set({ status: type }).where(eq(roster.id, existing[0].id));
      } else {
        await db.insert(roster).values({ nik: nik, date: properDate, status: type });
      }
      invalidateRosterCache();
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to add izin" });
    }
  });

router.post(["/api/roster/sync", "/api/admin/sync-roster"], async (req, res) => {
  try {
    const reqNik = req.body?.editorNik || req.headers['x-user-nik'] || (req.session as any)?.userNik;
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

