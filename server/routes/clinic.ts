import { Router } from "express";
import { db } from "../../src/db/index.js";
import { eq, desc, and, or, gte, lte, ilike, sql } from "drizzle-orm";
import { clinicVisits } from "../../src/db/schema.js";

export const clinicRouter = Router();

let clinicTableEnsured = false;
export async function ensureClinicVisitsTable() {
  if (clinicTableEnsured) return;
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS clinic_visits (
      id SERIAL PRIMARY KEY,
      nik TEXT NOT NULL,
      name TEXT NOT NULL,
      section TEXT,
      department TEXT,
      jabatan TEXT,
      pt TEXT DEFAULT 'TBP',
      visit_date TEXT NOT NULL,
      visit_time TEXT NOT NULL,
      category TEXT DEFAULT 'Keluhan Sakit',
      reason TEXT NOT NULL,
      diagnosis TEXT,
      action_taken TEXT,
      recommendation TEXT DEFAULT 'Fit to Work',
      doctor_or_medic_name TEXT,
      reporter_nik TEXT,
      reporter_name TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_clinic_visits_date ON clinic_visits(visit_date);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_clinic_visits_nik ON clinic_visits(nik);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_clinic_visits_section ON clinic_visits(section);`);
    clinicTableEnsured = true;
  } catch (e: any) {
    console.error("[Clinic] Ensure table failed:", e.message);
  }
}

// Helper to get today's date string YYYY-MM-DD in Asia/Jayapura
const getTodayDateStr = (): string => {
  const d = new Date();
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });
};

// 1. GET /api/clinic-visits - Fetch all visits with filtering and enterprise summary
clinicRouter.get("/api/clinic-visits", async (req, res) => {
  try {
    await ensureClinicVisitsTable();

    const { startDate, endDate, section, pt, search, category, recommendation } = req.query as {
      startDate?: string;
      endDate?: string;
      section?: string;
      pt?: string;
      search?: string;
      category?: string;
      recommendation?: string;
    };

    const conditions: any[] = [];

    if (startDate && startDate.trim()) {
      conditions.push(gte(clinicVisits.visitDate, startDate.trim()));
    }
    if (endDate && endDate.trim()) {
      conditions.push(lte(clinicVisits.visitDate, endDate.trim()));
    }
    if (section && section !== 'ALL' && section.trim()) {
      conditions.push(ilike(clinicVisits.section, `%${section.trim()}%`));
    }
    if (pt && pt !== 'ALL' && pt.trim()) {
      const ptUpper = pt.trim().toUpperCase();
      if (ptUpper === 'TBP' || ptUpper === 'GPS') {
        conditions.push(or(eq(clinicVisits.pt, 'TBP'), eq(clinicVisits.pt, 'GPS')));
      } else {
        conditions.push(eq(clinicVisits.pt, ptUpper));
      }
    }
    if (category && category !== 'ALL' && category.trim()) {
      conditions.push(eq(clinicVisits.category, category.trim()));
    }
    if (recommendation && recommendation !== 'ALL' && recommendation.trim()) {
      conditions.push(eq(clinicVisits.recommendation, recommendation.trim()));
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(clinicVisits.name, q),
          ilike(clinicVisits.nik, q),
          ilike(clinicVisits.reason, q),
          ilike(clinicVisits.diagnosis, q),
          ilike(clinicVisits.doctorOrMedicName, q)
        )
      );
    }

    const query = conditions.length > 0 ? and(...conditions) : undefined;
    const visits = await db
      .select()
      .from(clinicVisits)
      .where(query)
      .orderBy(desc(clinicVisits.visitDate), desc(clinicVisits.visitTime), desc(clinicVisits.id));

    // Calculate Enterprise Summary Metrics
    const todayStr = getTodayDateStr();
    const currentMonthPrefix = todayStr.substring(0, 7); // 'YYYY-MM'

    let todayCount = 0;
    let thisMonthCount = 0;
    let restingCount = 0;
    let fitCount = 0;
    const sectionBreakdown: Record<string, number> = {};
    const categoryBreakdown: Record<string, number> = {};
    const recommendationBreakdown: Record<string, number> = {};

    visits.forEach((v) => {
      // Date counters
      if (v.visitDate === todayStr) todayCount++;
      if (v.visitDate && v.visitDate.startsWith(currentMonthPrefix)) thisMonthCount++;

      // Recommendation counters
      const rec = (v.recommendation || '').toLowerCase();
      if (rec.includes('istirahat') || rec.includes('rujuk') || rec.includes('observasi')) {
        restingCount++;
      } else {
        fitCount++;
      }

      // Breakdown by section
      const sec = v.section || 'Lainnya';
      sectionBreakdown[sec] = (sectionBreakdown[sec] || 0) + 1;

      // Breakdown by category
      const cat = v.category || 'Keluhan Sakit';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;

      // Breakdown by recommendation
      const recLabel = v.recommendation || 'Fit to Work';
      recommendationBreakdown[recLabel] = (recommendationBreakdown[recLabel] || 0) + 1;
    });

    const summary = {
      total: visits.length,
      todayCount,
      thisMonthCount,
      restingCount,
      fitCount,
      sectionBreakdown,
      categoryBreakdown,
      recommendationBreakdown,
      todayStr
    };

    res.json({
      status: "success",
      data: visits,
      summary
    });
  } catch (error: any) {
    console.error("[Clinic Visits GET] Error:", error);
    // Self-healing: if query failed due to unmigrated table or connection glitch, ensure table and retry
    try {
      clinicTableEnsured = false;
      await ensureClinicVisitsTable();
      const retryVisits = await db
        .select()
        .from(clinicVisits)
        .orderBy(desc(clinicVisits.visitDate), desc(clinicVisits.visitTime), desc(clinicVisits.id));

      return res.json({
        status: "success",
        data: retryVisits,
        summary: {
          total: retryVisits.length,
          todayCount: 0,
          thisMonthCount: 0,
          restingCount: 0,
          fitCount: 0,
          sectionBreakdown: {},
          categoryBreakdown: {},
          recommendationBreakdown: {},
          todayStr: getTodayDateStr()
        }
      });
    } catch (fallbackErr: any) {
      console.error("[Clinic Visits GET] Fallback recovery error:", fallbackErr);
      return res.json({
        status: "success",
        data: [],
        summary: {
          total: 0,
          todayCount: 0,
          thisMonthCount: 0,
          restingCount: 0,
          fitCount: 0,
          sectionBreakdown: {},
          categoryBreakdown: {},
          recommendationBreakdown: {},
          todayStr: getTodayDateStr()
        }
      });
    }
  }
});

// 2. POST /api/clinic-visits - Create a new clinic visit report
clinicRouter.post("/api/clinic-visits", async (req, res) => {
  try {
    await ensureClinicVisitsTable();
    const {
      nik,
      name,
      section,
      department,
      jabatan,
      pt,
      visitDate,
      visitTime,
      category,
      reason,
      diagnosis,
      actionTaken,
      recommendation,
      doctorOrMedicName,
      reporterNik,
      reporterName,
      notes
    } = req.body;

    if (!nik || !name || !reason) {
      return res.status(400).json({
        status: "error",
        message: "NIK, Nama Karyawan, dan Alasan Berkunjung wajib diisi."
      });
    }

    const todayStr = getTodayDateStr();
    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const [newVisit] = await db
      .insert(clinicVisits)
      .values({
        nik: String(nik).trim().toUpperCase(),
        name: String(name).trim(),
        section: section ? String(section).trim() : 'Preparation',
        department: department ? String(department).trim() : null,
        jabatan: jabatan ? String(jabatan).trim() : null,
        pt: pt ? String(pt).trim().toUpperCase() : 'TBP',
        visitDate: visitDate ? String(visitDate).trim() : todayStr,
        visitTime: visitTime ? String(visitTime).trim() : defaultTime,
        category: category ? String(category).trim() : 'Keluhan Sakit',
        reason: String(reason).trim(),
        diagnosis: diagnosis ? String(diagnosis).trim() : null,
        actionTaken: actionTaken ? String(actionTaken).trim() : null,
        recommendation: recommendation ? String(recommendation).trim() : 'Fit to Work',
        doctorOrMedicName: doctorOrMedicName ? String(doctorOrMedicName).trim() : null,
        reporterNik: reporterNik ? String(reporterNik).trim() : null,
        reporterName: reporterName ? String(reporterName).trim() : null,
        notes: notes ? String(notes).trim() : null,
      })
      .returning();

    res.status(201).json({
      status: "success",
      message: "Data kunjungan klinik berhasil dicatat.",
      data: newVisit
    });
  } catch (error: any) {
    console.error("[Clinic Visits POST] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 3. PUT /api/clinic-visits/:id - Update an existing clinic visit report
clinicRouter.put("/api/clinic-visits/:id", async (req, res) => {
  try {
    await ensureClinicVisitsTable();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ status: "error", message: "ID tidak valid" });
    }

    const {
      nik,
      name,
      section,
      department,
      jabatan,
      pt,
      visitDate,
      visitTime,
      category,
      reason,
      diagnosis,
      actionTaken,
      recommendation,
      doctorOrMedicName,
      reporterNik,
      reporterName,
      notes
    } = req.body;

    const [updated] = await db
      .update(clinicVisits)
      .set({
        ...(nik ? { nik: String(nik).trim().toUpperCase() } : {}),
        ...(name ? { name: String(name).trim() } : {}),
        ...(section !== undefined ? { section: String(section).trim() } : {}),
        ...(department !== undefined ? { department: String(department).trim() } : {}),
        ...(jabatan !== undefined ? { jabatan: String(jabatan).trim() } : {}),
        ...(pt !== undefined ? { pt: String(pt).trim().toUpperCase() } : {}),
        ...(visitDate ? { visitDate: String(visitDate).trim() } : {}),
        ...(visitTime ? { visitTime: String(visitTime).trim() } : {}),
        ...(category !== undefined ? { category: String(category).trim() } : {}),
        ...(reason ? { reason: String(reason).trim() } : {}),
        ...(diagnosis !== undefined ? { diagnosis: String(diagnosis).trim() } : {}),
        ...(actionTaken !== undefined ? { actionTaken: String(actionTaken).trim() } : {}),
        ...(recommendation !== undefined ? { recommendation: String(recommendation).trim() } : {}),
        ...(doctorOrMedicName !== undefined ? { doctorOrMedicName: String(doctorOrMedicName).trim() } : {}),
        ...(reporterNik !== undefined ? { reporterNik: String(reporterNik).trim() } : {}),
        ...(reporterName !== undefined ? { reporterName: String(reporterName).trim() } : {}),
        ...(notes !== undefined ? { notes: String(notes).trim() } : {}),
        updatedAt: new Date()
      })
      .where(eq(clinicVisits.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ status: "error", message: "Data kunjungan klinik tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Data kunjungan klinik berhasil diperbarui",
      data: updated
    });
  } catch (error: any) {
    console.error("[Clinic Visits PUT] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 4. DELETE /api/clinic-visits/:id - Delete a clinic visit report
clinicRouter.delete("/api/clinic-visits/:id", async (req, res) => {
  try {
    await ensureClinicVisitsTable();
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ status: "error", message: "ID tidak valid" });
    }

    const [deleted] = await db
      .delete(clinicVisits)
      .where(eq(clinicVisits.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ status: "error", message: "Data kunjungan tidak ditemukan" });
    }

    res.json({
      status: "success",
      message: "Data kunjungan klinik berhasil dihapus",
      data: deleted
    });
  } catch (error: any) {
    console.error("[Clinic Visits DELETE] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});
