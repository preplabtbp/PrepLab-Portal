import { Router } from "express";
import { db } from "../../src/db/index.js";
import { eq, desc, or, inArray, isNull, and, gte, lte } from "drizzle-orm";
import { 
  chatMessages, employees, equipments, workOrders, users, tickets, downtime, 
  spareparts, apdSettings, apdHistory, apdDocuments, roster, inspections, 
  pemantauan, questions, agendaEvents, privateNotes, userThemes, bulletinPosts, 
  notifications, bulletinComments, uploadedFiles, appSettings, pelanggaran, 
  mealReports, pushSubscriptions, quizQuestions, preplabCloudLogs, quizScores, induksi
} from "../../src/db/schema.js";
import { generatePdfFromTemplate, drive } from '../../google-services.js';
import { 
  sendWebPush, getUniverse, uploadFileToDrive, syncBulletinToAgenda, 
  getNotificationTargets, getTableObj, sanitizePayload 
} from "../utils.js";
import { requireAuth, requireRole, toPublicEmployee } from "../middleware/auth.js";
import webpush from 'web-push';
import path from "path";

export const router = Router();

// ENFORCE AUTHENTICATION & ROLE-BASED ACCESS CONTROL (P0 Security Hardening)
router.use("/api/admin", requireAuth, requireRole(['admin', 'developer']));

const tableCache = new Map<string, { data: any[]; timestamp: number }>();
const CACHE_DURATION = 3 * 60 * 1000; // 3 minutes

export function invalidateAdminTableCache(tableName?: string) {
  if (tableName) {
    tableCache.delete(tableName);
  } else {
    tableCache.clear();
  }
}

router.get("/api/admin/tables", async (req, res) => {
  try {
    res.json([
      "employees", "equipments", "workOrders", "tickets", "downtime", 
      "spareparts", "apdSettings", "apdHistory", "apdDocuments", "roster", 
      "inspections", "pemantauan", "questions", "agendaEvents", "privateNotes", 
      "userThemes", "pelanggaran", "appSettings", "developerUsers"
    ]);
  } catch (e: any) { 
    res.status(500).json({ error: "Gagal memuat daftar tabel" }); 
  }
});

router.get("/api/admin/tables/:name", async (req, res) => {
  try {
    const tableName = req.params.name;
    const t = getTableObj(tableName);
    if (!t) return res.status(404).json({ error: "Tabel tidak ditemukan" });

    const force = req.query.refresh === 'true' || req.query.refresh === '1';
    const cached = tableCache.get(tableName);
    if (!force && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json(cached.data);
    }

    const limit = tableName === 'roster' ? 1000 : 5000;
    let data = await db.select().from(t).orderBy(desc((t as any).id)).limit(limit);

    if (tableName === 'employees') {
      data = data
        .filter((row: any) => {
          const nik = (row.nik || '').toString().toUpperCase();
          const name = (row.name || '').toString().toLowerCase();
          const username = (row.username || '').toString().toLowerCase();
          if (
            nik === 'DEMO123' || nik === 'DEMO' || nik.includes('DEMO') ||
            name.includes('user demo') || name.includes('demo staging') || name.includes('staging') ||
            username.includes('demo') || username.includes('staging') ||
            nik === 'PREPLABADMIN' || nik.includes('#N/A') || name.includes('#N/A')
          ) {
            return false;
          }
          return true;
        })
        .map((row: any) => toPublicEmployee(row)); // Strip passwordHash from employee list
    }

    tableCache.set(tableName, { data, timestamp: Date.now() });
    res.json(data);
  } catch (e: any) { 
    res.status(500).json({ error: "Gagal mengambil data tabel" }); 
  }
});

router.post("/api/admin/tables/:name", async (req, res) => {
  try {
    const t = getTableObj(req.params.name);
    if (!t) return res.status(404).json({ error: "Tabel tidak ditemukan" });
    
    const payload = sanitizePayload(t, req.body);
    
    const result = await db.insert(t as any).values(payload).returning();
    invalidateAdminTableCache(req.params.name);
    res.json(req.params.name === 'employees' ? toPublicEmployee(result[0]) : result[0]);
  } catch (e: any) { 
    console.error("Admin DB Insert Error:", e);
    res.status(500).json({ error: "Gagal menambahkan baris data ke tabel" }); 
  }
});

router.post("/api/admin/tables/:name/bulk", async (req, res) => {
  try {
    const t = getTableObj(req.params.name);
    if (!t) return res.status(404).json({ error: "Tabel tidak ditemukan" });
    
    const payloadArray = req.body;
    if (!Array.isArray(payloadArray)) {
      return res.status(400).json({ error: "Data harus berupa array baris" });
    }

    const results = [];
    for (const row of payloadArray) {
      try {
        const cleanedRow = sanitizePayload(t, row);
        
        if (req.params.name === 'workOrders' && cleanedRow.woId) {
          await db.insert(workOrders).values(cleanedRow).onConflictDoUpdate({
            target: workOrders.woId,
            set: cleanedRow
          });
        } else if (req.params.name === 'pemantauan' && cleanedRow.idPemantauan) {
          await db.insert(pemantauan).values(cleanedRow).onConflictDoUpdate({
            target: pemantauan.idPemantauan,
            set: cleanedRow
          });
        } else if (req.params.name === 'inspections' && cleanedRow.importId) {
          await db.insert(inspections).values(cleanedRow).onConflictDoUpdate({
            target: inspections.importId,
            set: cleanedRow
          });
        } else {
          await db.insert(t as any).values(cleanedRow);
        }
        
        results.push({ success: true });
      } catch(e: any) {
        results.push({ success: false, error: e.message });
      }
    }
    invalidateAdminTableCache(req.params.name);
    res.json({ success: true, count: results.filter(r => r.success).length, errors: results.filter(r => !r.success) });
  } catch (e: any) { 
    res.status(500).json({ error: "Gagal memproses bulk insert" }); 
  }
});

router.put("/api/admin/tables/:name/:id", async (req, res) => {
  try {
    const t = getTableObj(req.params.name);
    if (!t) return res.status(404).json({ error: "Tabel tidak ditemukan" });
    
    let idValue: any = req.params.id;
    if ((t as any).id && (t as any).id.dataType === 'number') {
      idValue = parseInt(idValue);
    }
    
    const payload = sanitizePayload(t, req.body);
    
    const result = await db.update(t as any).set(payload).where(eq((t as any).id, idValue)).returning();
    invalidateAdminTableCache(req.params.name);
    res.json(req.params.name === 'employees' ? toPublicEmployee(result[0] || {}) : (result[0] || {}));
  } catch (e: any) { 
    let errMsg = "Gagal memperbarui data baris";
    res.status(500).json({ error: errMsg });
  }
});

router.delete("/api/admin/tables/:name/:id", async (req, res) => {
  try {
    const t = getTableObj(req.params.name);
    if (!t) return res.status(404).json({ error: "Tabel tidak ditemukan" });
    
    await db.delete(t).where(eq((t as any).id, parseInt(req.params.id)));
    invalidateAdminTableCache(req.params.name);
    res.json({ success: true, message: `Baris ID ${req.params.id} berhasil dihapus` });
  } catch (e: any) { 
    res.status(500).json({ error: "Gagal menghapus baris data" }); 
  }
});

// NOTE: Dangerous TRUNCATE endpoint `DELETE /api/admin/tables/:name` has been PERMANENTLY REMOVED for P0 Security.

router.post("/api/admin/sync-roster", async (req, res) => {
  try {
    const { syncRosterData } = await import("../../src/syncRoster.js");
    await syncRosterData();
    res.json({ message: "Sync berhasil" });
  } catch (e) {
    res.status(500).json({ error: "Gagal sync" });
  }
});
