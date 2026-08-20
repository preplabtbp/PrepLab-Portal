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

router.get("/api/admin/tables", async (req, res) => {
    try {
      res.json(["employees", "equipments", "workOrders", "tickets", "downtime", "spareparts", "apdSettings", "apdHistory", "apdDocuments", "roster", "inspections", "pemantauan", "questions", "agendaEvents", "privateNotes", "userThemes", "pelanggaran", "appSettings", "developerUsers"]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

router.get("/api/admin/tables/:name", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      const data = await db.select().from(t).orderBy(desc((t as any).id)).limit(5000);
      res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

router.post("/api/admin/tables/:name", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      
      const payload = sanitizePayload(t, req.body);
      
      const result = await db.insert(t as any).values(payload).returning();
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
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

router.delete("/api/admin/tables/:name", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      await db.delete(t);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

router.post("/api/admin/sync-roster", async (req, res) => {
    try {
      await syncRosterData();
      res.json({ message: "Sync berhasil" });
    } catch (e) {
      res.status(500).json({ error: "Gagal sync" });
    }
  });
