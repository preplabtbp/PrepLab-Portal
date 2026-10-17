import { Router } from "express";
import { db } from "../../src/db/index.js";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { employees, inspectionSchedulePlans } from "../../src/db/schema.js";
import { INSPECTION_29_AGENDAS, matchTicketToAgenda, isPicTemuanRole } from "../../src/utils/inspection-pic-matcher.js";
import {
  PlanMember, ShiftGroup, DEFAULT_AGENDA_SHIFT, APD_TEAM_AGENDAS, poolOf, ruleError
} from "../../src/utils/inspection-schedule-rules.js";
import { loadLeaveRoster, isAuthorizedRosterEditor } from "./roster.js";
import { fetchInspectionScheduleFromSheet, invalidateScheduleCache } from "./inspections.js";

// ── JADWAL INSPEKSI PORTAL (acak per shift, edit manual, rekap per karyawan) ──────
export const inspectionPlannerRouter = Router();

const PLAN_GOL = new Set(['II', 'III', 'IV', 'V']);
const WORKING_CODES = new Set(['D', 'N', 'LS']);
const DAY_MS = 86400000;

let planTableEnsured = false;
async function ensurePlanTable() {
  if (planTableEnsured) return;
  await db.execute(sql`CREATE TABLE IF NOT EXISTS inspection_schedule_plans (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    week INTEGER NOT NULL,
    iso_year INTEGER NOT NULL,
    iso_week TEXT NOT NULL,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    members JSON NOT NULL,
    agenda_shifts JSON,
    source TEXT DEFAULT 'random',
    updated_by_nik TEXT,
    updated_by_name TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );`);
  await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_inspection_schedule_plans_week ON inspection_schedule_plans (year, week);`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inspection_schedule_plans_iso ON inspection_schedule_plans (iso_year, iso_week);`);
  planTableEnsured = true;
}

// ── Week rekap (Sabtu – Jumat), sama dengan getRekapWeekRange di layar Rekap KTA/TTA ──
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }
function addDays(iso: string, n: number) { return isoDate(new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS)); }

function isoWeekOf(d: Date): { year: number; week: number } {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dayNr + 3);
  const year = t.getUTCFullYear(); // tahun hari Kamis = tahun ISO
  return { year, week: 1 + Math.floor((t.getTime() - Date.UTC(year, 0, 1)) / DAY_MS / 7) };
}

export function rekapPeriod(year: number, week: number) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday1 = jan4.getTime() - ((jan4.getUTCDay() + 6) % 7) * DAY_MS;
  const start = isoDate(new Date(monday1 + (week - 1) * 7 * DAY_MS + 5 * DAY_MS));
  const end = addDays(start, 6);
  const iso = isoWeekOf(new Date(`${end}T00:00:00Z`));
  return {
    year, week, start, end,
    isoYear: iso.year, isoWeek: `W${iso.week}`,
    rosterDates: [addDays(start, 2), addDays(start, 3), addDays(start, 4)] // Senin – Rabu
  };
}

// Week rekap N minggu sebelumnya
function previousRekapWeek(year: number, week: number, n: number) {
  const { start } = rekapPeriod(year, week);
  const d = new Date(Date.parse(`${addDays(start, -7 * n)}T00:00:00Z`) - 5 * DAY_MS);
  return isoWeekOf(d);
}

// ── Roster → kandidat petugas ────────────────────────────────────────────────
export async function buildRosterMembers(period: ReturnType<typeof rekapPeriod>, force = false): Promise<PlanMember[]> {
  const roster = await loadLeaveRoster(force);
  const list: PlanMember[] = [];
  for (const e of roster) {
    if (!PLAN_GOL.has(e.gol)) continue;
    const codes = period.rosterDates.map(d => (e.days[d] || '').toUpperCase());
    if (codes.every(c => !c || c === '-')) continue; // belum bergabung / tidak ada data roster
    const working = codes.filter(c => WORKING_CODES.has(c));
    const nights = working.filter(c => c === 'N').length;
    const team = /^a$/i.test(e.team) ? 'A' : /^b$/i.test(e.team) ? 'B' : 'Nonshift';
    const isCuti = working.length === 0;
    list.push({
      nik: e.nik, name: e.name, jabatan: e.jabatan, section: e.section, gol: e.gol, team,
      shiftGroup: isCuti ? null : nights > working.length - nights ? 'Malam' : team === 'Nonshift' ? 'Nonshift' : 'Siang',
      agendaId: null, roleIndex: 1, isCuti, codes
    });
  }
  return list;
}

// Shift agenda; agenda APD per tim mengikuti shift tim tsb di roster minggu ini
export function computeAgendaShifts(members: PlanMember[]): Record<number, ShiftGroup> {
  const teamShift = (team: 'A' | 'B'): ShiftGroup | null => {
    const active = members.filter(m => !m.isCuti && m.team === team && m.shiftGroup);
    if (!active.length) return null;
    const nights = active.filter(m => m.shiftGroup === 'Malam').length;
    return nights * 2 >= active.length ? 'Malam' : 'Siang';
  };
  let a = teamShift('A');
  let b = teamShift('B');
  if (!a && b) a = b === 'Malam' ? 'Siang' : 'Malam';
  if (!b && a) b = a === 'Malam' ? 'Siang' : 'Malam';
  const result: Record<number, ShiftGroup> = { ...DEFAULT_AGENDA_SHIFT };
  Object.entries(APD_TEAM_AGENDAS).forEach(([id, team]) => {
    const s = team === 'A' ? a : b;
    if (s) result[Number(id)] = s;
  });
  return result;
}

const memberKey = (m: { nik?: string; name?: string }) => (m.nik || m.name || '').trim().toUpperCase();

// Riwayat agenda 1 & 2 minggu sebelumnya: { NIK: { agendaId: mingguKe } }
async function loadHistory(year: number, week: number): Promise<Record<string, Record<number, number>>> {
  const history: Record<string, Record<number, number>> = {};
  for (const n of [2, 1]) {
    const prev = previousRekapWeek(year, week, n);
    const rows = await db.select().from(inspectionSchedulePlans)
      .where(and(eq(inspectionSchedulePlans.year, prev.year), eq(inspectionSchedulePlans.week, prev.week))).limit(1);
    const members = (rows[0]?.members as PlanMember[]) || [];
    members.forEach(m => {
      if (!m.agendaId) return;
      // Kunci NIK & nama (jadwal Google Sheet hanya memuat nama)
      [memberKey(m), (m.name || '').trim().toUpperCase()].filter(Boolean).forEach(k => {
        history[k] = { ...(history[k] || {}), [m.agendaId!]: n };
      });
    });
  }
  return history;
}

// Acak petugas untuk kelompok shift tertentu (Siang digabung Nonshift)
export function randomizeGroups(
  members: PlanMember[], agendaShifts: Record<number, ShiftGroup>,
  history: Record<string, Record<number, number>>, groups: ShiftGroup[]
) {
  const penalty = (m: PlanMember, agendaId: number) => {
    const ago = history[memberKey(m)]?.[agendaId];
    return (ago === 1 ? 10 : ago === 2 ? 5 : 0) + Math.random();
  };
  for (const g of groups) {
    const people = members.filter(m => !m.isCuti && poolOf(m) === g);
    people.forEach(m => { m.agendaId = null; m.roleIndex = 1; });
    const agendas = INSPECTION_29_AGENDAS.filter(a => agendaShifts[a.id] === g).map(a => a.id);
    const eligible = new Map(agendas.map(id => [id, people.filter(m => !ruleError(m, id))]));
    const count = new Map(agendas.map(id => [id, 0]));

    // 1) Satu inspektor utama per agenda; agenda dengan kandidat paling sedikit diisi dulu
    const order = [...agendas].sort((x, y) => eligible.get(x)!.length - eligible.get(y)!.length || Math.random() - 0.5);
    for (const id of order) {
      const candidates = eligible.get(id)!.filter(m => m.agendaId === null);
      if (!candidates.length) continue;
      const pick = candidates.reduce((best, m) => {
        const p = penalty(m, id);
        return p < best.p ? { m, p } : best;
      }, { m: candidates[0], p: Infinity }).m;
      pick.agendaId = id;
      pick.roleIndex = 1;
      count.set(id, 1);
    }

    // 2) Sisa karyawan menjadi pendamping, merata ke agenda dengan petugas paling sedikit
    const rest = people.filter(m => m.agendaId === null).sort(() => Math.random() - 0.5);
    for (const m of rest) {
      const options = agendas.filter(id => !ruleError(m, id));
      if (!options.length) continue;
      const best = options.reduce((b, id) => {
        const score = count.get(id)! * 100 + penalty(m, id);
        return score < b.score ? { id, score } : b;
      }, { id: options[0], score: Infinity }).id;
      const next = count.get(best)! + 1;
      count.set(best, next);
      m.agendaId = best;
      m.roleIndex = next;
    }
  }
}

function normalizeRoles(members: PlanMember[]) {
  const byAgenda = new Map<number, PlanMember[]>();
  members.forEach(m => {
    if (m.isCuti || !m.agendaId) return;
    byAgenda.set(m.agendaId, [...(byAgenda.get(m.agendaId) || []), m]);
  });
  byAgenda.forEach(list => list.sort((a, b) => a.roleIndex - b.roleIndex).forEach((m, i) => { m.roleIndex = i + 1; }));
}

async function canEditPlan(nik?: string): Promise<boolean> {
  const clean = String(nik || '').trim();
  if (!clean) return false;
  if (await isAuthorizedRosterEditor(clean)) return true;
  try {
    const emp = await db.select({ jabatan: employees.jabatan }).from(employees).where(eq(employees.nik, clean)).limit(1);
    return isPicTemuanRole(emp[0]?.jabatan);
  } catch {
    return false;
  }
}

async function editorName(nik: string): Promise<string> {
  try {
    const emp = await db.select({ name: employees.name }).from(employees).where(eq(employees.nik, nik)).limit(1);
    return emp[0]?.name || nik;
  } catch {
    return nik;
  }
}

async function getPlan(year: number, week: number) {
  const rows = await db.select().from(inspectionSchedulePlans)
    .where(and(eq(inspectionSchedulePlans.year, year), eq(inspectionSchedulePlans.week, week))).limit(1);
  return rows[0] || null;
}

async function savePlan(period: ReturnType<typeof rekapPeriod>, members: PlanMember[], agendaShifts: Record<number, ShiftGroup>, source: string, nik: string) {
  normalizeRoles(members);
  const values = {
    year: period.year, week: period.week, isoYear: period.isoYear, isoWeek: period.isoWeek,
    periodStart: period.start, periodEnd: period.end,
    members, agendaShifts, source,
    updatedByNik: nik, updatedByName: await editorName(nik), updatedAt: new Date()
  };
  await db.insert(inspectionSchedulePlans).values(values)
    .onConflictDoUpdate({ target: [inspectionSchedulePlans.year, inspectionSchedulePlans.week], set: values });
  invalidateScheduleCache();
  return getPlan(period.year, period.week);
}

function parseWeek(q: any) {
  const year = parseInt(String(q.year || ''), 10);
  const week = parseInt(String(q.week || ''), 10);
  if (!year || !week || week < 1 || week > 53) return null;
  return rekapPeriod(year, week);
}

// GET /api/inspection-plan?year=2026&week=42&nik=...
inspectionPlannerRouter.get("/api/inspection-plan", async (req, res) => {
  try {
    await ensurePlanTable();
    const period = parseWeek(req.query);
    if (!period) return res.status(400).json({ success: false, message: 'Parameter year & week wajib' });
    const [plan, history, canEdit] = await Promise.all([
      getPlan(period.year, period.week),
      loadHistory(period.year, period.week),
      canEditPlan(req.query.nik as string)
    ]);
    res.json({ success: true, period, plan, history, canEdit });
  } catch (error: any) {
    console.error('Error inspection-plan:', error);
    res.status(500).json({ success: false, message: error.message || 'Gagal memuat jadwal' });
  }
});

// POST /api/inspection-plan/randomize { year, week, scope: 'ALL' | 'Malam' | 'Siang', editorNik }
inspectionPlannerRouter.post("/api/inspection-plan/randomize", async (req, res) => {
  try {
    await ensurePlanTable();
    const b = req.body || {};
    const period = parseWeek(b);
    if (!period) return res.status(400).json({ success: false, message: 'Parameter year & week wajib' });
    if (!(await canEditPlan(b.editorNik))) return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses mengubah jadwal inspeksi' });
    const scope: 'ALL' | ShiftGroup = b.scope === 'Malam' || b.scope === 'Siang' ? b.scope : 'ALL';

    const [members, history, existing] = await Promise.all([
      buildRosterMembers(period, b.refresh === true),
      loadHistory(period.year, period.week),
      getPlan(period.year, period.week)
    ]);
    if (!members.length) return res.status(422).json({ success: false, message: 'Roster Senin – Rabu week ini belum tersedia di Database Roster' });
    const agendaShifts = computeAgendaShifts(members);

    // Acak sebagian: kelompok shift lain tetap memakai jadwal tersimpan
    if (scope !== 'ALL' && existing) {
      const prev = new Map(((existing.members as PlanMember[]) || []).map(m => [memberKey(m), m]));
      members.forEach(m => {
        const old = prev.get(memberKey(m));
        if (m.isCuti || poolOf(m) === scope || !old?.agendaId) return;
        if (agendaShifts[old.agendaId] === poolOf(m)) {
          m.agendaId = old.agendaId;
          m.roleIndex = old.roleIndex;
        }
      });
    }
    randomizeGroups(members, agendaShifts, history, scope === 'ALL' ? ['Malam', 'Siang'] : [scope]);
    const plan = await savePlan(period, members, agendaShifts, 'random', String(b.editorNik));
    res.json({ success: true, period, plan, history });
  } catch (error: any) {
    console.error('Error randomize inspection-plan:', error);
    res.status(500).json({ success: false, message: error.message || 'Gagal mengacak jadwal' });
  }
});

// POST /api/inspection-plan/from-sheet { year, week, editorNik } — salin jadwal Google Sheet "CurrentWeek" agar bisa diedit
inspectionPlannerRouter.post("/api/inspection-plan/from-sheet", async (req, res) => {
  try {
    await ensurePlanTable();
    const b = req.body || {};
    const period = parseWeek(b);
    if (!period) return res.status(400).json({ success: false, message: 'Parameter year & week wajib' });
    if (!(await canEditPlan(b.editorNik))) return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses mengubah jadwal inspeksi' });

    const [members, sheet] = await Promise.all([
      buildRosterMembers(period),
      fetchInspectionScheduleFromSheet(true, 'CurrentWeek')
    ]);
    const byName = new Map(members.map(m => [m.name.trim().toLowerCase(), m]));
    for (const s of sheet as any[]) {
      const text = (s.inspeksi || '').trim();
      if (s.isCuti || !text) continue;
      const agenda = INSPECTION_29_AGENDAS.find(a => a.name.toLowerCase() === text.toLowerCase()) || matchTicketToAgenda({ category: text });
      if (!agenda) continue;
      const m = byName.get((s.name || '').trim().toLowerCase());
      if (m) {
        m.agendaId = agenda.id;
        m.roleIndex = s.roleIndex || 1;
        if (m.isCuti) { m.isCuti = false; m.shiftGroup = m.team === 'Nonshift' ? 'Nonshift' : 'Siang'; }
      } else {
        const shift = (s.shift || '').toLowerCase();
        members.push({
          nik: '', name: s.name, jabatan: s.jabatan || '', section: '', gol: '', team: shift.includes('shift a') ? 'A' : shift.includes('shift b') ? 'B' : 'Nonshift',
          shiftGroup: shift.includes('malam') ? 'Malam' : shift.includes('siang') ? 'Siang' : 'Nonshift',
          agendaId: agenda.id, roleIndex: s.roleIndex || 1, isCuti: false
        });
      }
    }
    const plan = await savePlan(period, members, computeAgendaShifts(members), 'manual', String(b.editorNik));
    res.json({ success: true, period, plan });
  } catch (error: any) {
    console.error('Error from-sheet inspection-plan:', error);
    res.status(500).json({ success: false, message: error.message || 'Gagal menyalin jadwal Google Sheet' });
  }
});

// PUT /api/inspection-plan { year, week, members, editorNik } — simpan edit manual
inspectionPlannerRouter.put("/api/inspection-plan", async (req, res) => {
  try {
    await ensurePlanTable();
    const b = req.body || {};
    const period = parseWeek(b);
    if (!period) return res.status(400).json({ success: false, message: 'Parameter year & week wajib' });
    if (!(await canEditPlan(b.editorNik))) return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses mengubah jadwal inspeksi' });
    if (!Array.isArray(b.members)) return res.status(400).json({ success: false, message: 'Data petugas tidak valid' });
    const existing = await getPlan(period.year, period.week);
    const members: PlanMember[] = b.members.map((m: any) => ({
      nik: String(m.nik || ''), name: String(m.name || ''), jabatan: String(m.jabatan || ''), section: String(m.section || ''),
      gol: String(m.gol || ''), team: String(m.team || 'Nonshift'),
      shiftGroup: m.shiftGroup === 'Malam' || m.shiftGroup === 'Siang' || m.shiftGroup === 'Nonshift' ? m.shiftGroup : null,
      agendaId: Number.isInteger(m.agendaId) && INSPECTION_29_AGENDAS.some(a => a.id === m.agendaId) ? m.agendaId : null,
      roleIndex: Math.max(1, parseInt(m.roleIndex, 10) || 1), isCuti: !!m.isCuti, codes: Array.isArray(m.codes) ? m.codes : undefined
    }));
    const agendaShifts = (existing?.agendaShifts as Record<number, ShiftGroup>) || computeAgendaShifts(members);
    const plan = await savePlan(period, members, agendaShifts, 'manual', String(b.editorNik));
    res.json({ success: true, period, plan });
  } catch (error: any) {
    console.error('Error save inspection-plan:', error);
    res.status(500).json({ success: false, message: error.message || 'Gagal menyimpan jadwal' });
  }
});

// DELETE /api/inspection-plan?year=&week=&editorNik= — kembali memakai jadwal Google Sheet
inspectionPlannerRouter.delete("/api/inspection-plan", async (req, res) => {
  try {
    await ensurePlanTable();
    const period = parseWeek(req.query);
    if (!period) return res.status(400).json({ success: false, message: 'Parameter year & week wajib' });
    if (!(await canEditPlan(req.query.editorNik as string))) return res.status(403).json({ success: false, message: 'Anda tidak memiliki akses mengubah jadwal inspeksi' });
    await db.delete(inspectionSchedulePlans)
      .where(and(eq(inspectionSchedulePlans.year, period.year), eq(inspectionSchedulePlans.week, period.week)));
    invalidateScheduleCache();
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error delete inspection-plan:', error);
    res.status(500).json({ success: false, message: error.message || 'Gagal menghapus jadwal' });
  }
});

// GET /api/inspection-plan/rekap?year=2026&from=36&to=44 — rekap jadwal per karyawan per week (seperti roster)
inspectionPlannerRouter.get("/api/inspection-plan/rekap", async (req, res) => {
  try {
    await ensurePlanTable();
    const year = parseInt(String(req.query.year || ''), 10);
    const from = parseInt(String(req.query.from || ''), 10);
    const to = parseInt(String(req.query.to || ''), 10);
    if (!year || !from || !to || from > to || to - from > 52) return res.status(400).json({ success: false, message: 'Parameter year, from, to tidak valid' });

    const plans = await db.select().from(inspectionSchedulePlans)
      .where(and(eq(inspectionSchedulePlans.year, year), gte(inspectionSchedulePlans.week, from), lte(inspectionSchedulePlans.week, to)));
    const planByWeek = new Map(plans.map(p => [p.week, p]));
    const weeks = Array.from({ length: to - from + 1 }, (_, i) => {
      const p = rekapPeriod(year, from + i);
      return { week: p.week, start: p.start, end: p.end, hasPlan: planByWeek.has(p.week) };
    });

    const rows = new Map<string, any>();
    plans.forEach(p => (p.members as PlanMember[] || []).forEach(m => {
      const k = memberKey(m);
      if (!k) return;
      const row = rows.get(k) || { nik: m.nik, name: m.name, jabatan: m.jabatan, section: m.section, gol: m.gol, team: m.team, cells: {} };
      row.cells[p.week] = { agendaId: m.agendaId, roleIndex: m.roleIndex, isCuti: m.isCuti, shiftGroup: m.shiftGroup };
      if (p.week >= (row._latest || 0)) Object.assign(row, { jabatan: m.jabatan || row.jabatan, section: m.section || row.section, gol: m.gol || row.gol, team: m.team || row.team, _latest: p.week });
      rows.set(k, row);
    }));
    const golRank: Record<string, number> = { V: 0, IV: 1, III: 2, II: 3 };
    const list = Array.from(rows.values())
      .map(({ _latest, ...r }) => r)
      .sort((a, b) => (golRank[a.gol] ?? 9) - (golRank[b.gol] ?? 9) || (a.section || '').localeCompare(b.section || '') || a.name.localeCompare(b.name));
    res.json({ success: true, year, weeks, rows: list });
  } catch (error: any) {
    console.error('Error rekap inspection-plan:', error);
    res.status(500).json({ success: false, message: error.message || 'Gagal memuat rekap jadwal' });
  }
});
