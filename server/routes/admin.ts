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
import webpush from 'web-push';
import path from "path";

export const router = Router();

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
      res.json(["employees", "equipments", "workOrders", "tickets", "downtime", "spareparts", "apdSettings", "apdHistory", "apdDocuments", "roster", "inspections", "pemantauan", "questions", "agendaEvents", "privateNotes", "userThemes", "pelanggaran", "appSettings", "developerUsers"]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

router.get("/api/admin/tables/:name", async (req, res) => {
    try {
      const tableName = req.params.name;
      const t = getTableObj(tableName);
      if (!t) return res.status(404).json({error: "Table not found"});

      const force = req.query.refresh === 'true' || req.query.refresh === '1';
      const cached = tableCache.get(tableName);
      if (!force && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return res.json(cached.data);
      }

      const limit = tableName === 'roster' ? 1000 : 5000;
      let data = await db.select().from(t).orderBy(desc((t as any).id)).limit(limit);

      if (tableName === 'employees') {
        data = data.filter((row: any) => {
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
        });
      }

      tableCache.set(tableName, { data, timestamp: Date.now() });
      res.json(data);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

router.post("/api/admin/tables/:name", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      
      const payload = sanitizePayload(t, req.body);
      
      const result = await db.insert(t as any).values(payload).returning();
      invalidateAdminTableCache(req.params.name);
      res.json(result[0]);
    } catch (e: any) { 
       console.error("DB Error:", e);
       res.status(500).json({ error: e.message + (e.cause ? ' - ' + e.cause.message : '') }); 
    }
  });

router.post("/api/admin/tables/:name/bulk", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      
      const payloadArray = req.body;
      if (!Array.isArray(payloadArray)) {
         return res.status(400).json({error: "Expected an array of objects"});
      }

      const results = [];
      for(const row of payloadArray) {
         try {
           const cleanedRow = sanitizePayload(t, row);
           
           if (req.params.name === 'workOrders' && cleanedRow.woId) {
             await db.insert(t as any).values(cleanedRow).onConflictDoUpdate({
               target: t.woId,
               set: cleanedRow
             });
           } else if (req.params.name === 'pemantauan' && cleanedRow.idPemantauan) {
             await db.insert(t as any).values(cleanedRow).onConflictDoUpdate({
               target: t.idPemantauan,
               set: cleanedRow
             });
           } else if (req.params.name === 'inspections' && cleanedRow.importId) {
             await db.insert(t as any).values(cleanedRow).onConflictDoUpdate({
               target: t.importId,
               set: cleanedRow
             });
           } else {
             await db.insert(t as any).values(cleanedRow);
           }
           
           results.push({success: true});
         } catch(e: any) {
           console.error("Bulk insert row error:", e);
           results.push({success: false, error: e.message});
         }
      }
      invalidateAdminTableCache(req.params.name);
      res.json({ success: true, count: results.filter(r => r.success).length, errors: results.filter(r => !r.success) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

router.put("/api/admin/tables/:name/:id", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      
      let idValue: any = req.params.id;
      if (t.id.dataType === 'number') {
         idValue = parseInt(idValue);
      }
      
      const payload = sanitizePayload(t, req.body);
      
      const result = await db.update(t as any).set(payload).where(eq((t as any).id, idValue)).returning();
      invalidateAdminTableCache(req.params.name);
      res.json(result[0] || {});
    } catch (e: any) { 
      let errMsg = e.message;
      if ((e as any).cause) {
        errMsg = (e as any).cause.detail || (e as any).cause.message || errMsg;
      }
      res.status(500).json({ error: errMsg });
 }
  });

router.delete("/api/admin/tables/:name/:id", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      await db.delete(t).where(eq(t.id, parseInt(req.params.id)));
      invalidateAdminTableCache(req.params.name);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

router.delete("/api/admin/tables/:name", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      await db.delete(t);
      invalidateAdminTableCache(req.params.name);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

router.post("/api/admin/sync-roster", async (req, res) => {
    try {
      await syncRosterData();
      res.json({ message: "Sync berhasil" });
    } catch (e) {
      res.status(500).json({ error: "Gagal sync" });
    }
  });
