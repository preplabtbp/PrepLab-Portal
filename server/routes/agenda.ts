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
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.js';

export const router = Router();

router.get("/api/agenda", async (req, res) => {
    try {
      let requesterNik = String(req.query.nik || '').trim();
      if (!requesterNik && (req as any).cookies?.token) {
        try {
          const decoded = jwt.verify((req as any).cookies.token, JWT_SECRET) as any;
          if (decoded?.nik) requesterNik = String(decoded.nik).trim();
        } catch(e) {}
      }

      const allAgenda: any[] = await db.select().from(agendaEvents);
      
      // Filter agenda pribadi: pastikan setiap user HANYA mendapatkan agenda pribadinya masing-masing
      const data: any[] = allAgenda.filter(evt => {
        const kat = (evt.kategori || '').toLowerCase();
        const isPrivate = kat === 'private' || kat === 'personal' || kat === 'pribadi';
        if (isPrivate) {
          if (!requesterNik) return false;
          const creatorNik = String(evt.creatorNik || '').trim().toUpperCase();
          const pic = String(evt.pic || '').trim().toUpperCase();
          const reqUpper = requesterNik.toUpperCase();
          return creatorNik === reqUpper || (pic && pic === reqUpper);
        }
        return true;
      });
      
      const allEmps = await db.select().from(employees);
      const currentYear = new Date().getFullYear();
      
      allEmps.forEach(emp => {
        if (emp.tanggalLahir && emp.tanggalLahir !== '-') {
          const parts = emp.tanggalLahir.replace(/-/g, ' ').split(' ');
          let birthDate = null;
          if (parts.length >= 3) {
            const mmap = {Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11};
            let year = parseInt(parts[2]);
            if (year < 100) year += (year < 50 ? 2000 : 1900);
            birthDate = new Date(year, mmap[parts[1]] || 0, parseInt(parts[0]));
          } else {
             birthDate = new Date(emp.tanggalLahir);
          }
          
          if (birthDate && !isNaN(birthDate.getTime())) {
             const bdayThisYear = new Date(birthDate);
             bdayThisYear.setFullYear(currentYear);
             
             data.push({
               id: `bday-${emp.nik}-${currentYear}`,
               title: `🎂 Ulang Tahun ${emp.name}`,
               startDate: bdayThisYear,
               endDate: bdayThisYear,
               kategori: 'Birthday',
               pic: emp.name,
               deskripsi: `Hari Ulang Tahun ${emp.name} (${emp.jabatan || 'Karyawan'})`,
               department: 'ALL', 
               isRoutine: false,
               isBirthday: true,
             });
             
             const bdayNextYear = new Date(birthDate);
             bdayNextYear.setFullYear(currentYear + 1);
             data.push({
               id: `bday-${emp.nik}-${currentYear+1}`,
               title: `🎂 Ulang Tahun ${emp.name}`,
               startDate: bdayNextYear,
               endDate: bdayNextYear,
               kategori: 'Birthday',
               pic: emp.name,
               deskripsi: `Hari Ulang Tahun ${emp.name} (${emp.jabatan || 'Karyawan'})`,
               department: 'ALL', 
               isRoutine: false,
               isBirthday: true,
             });
          }
        }
      });
      
      res.json({ status: "success", data });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.post("/api/agenda", async (req, res) => {
    try {
      const body = req.body;
      const eventId = body.id || `ag-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const startDate = body.startDate ? new Date(body.startDate) : (body.date ? new Date(body.date) : new Date());
      const endDate = body.endDate ? new Date(body.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);
      const isRoutine = Boolean(body.isRoutine);
      const routineId = isRoutine ? (body.routineId || `routine-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`) : null;
      
      const payload: any = {
        id: eventId,
        title: body.title || "Agenda Baru",
        startDate: startDate,
        endDate: endDate,
        kategori: body.kategori || "General",
        pic: body.pic || "-",
        deskripsi: body.deskripsi || "",
        routineId: routineId,
        creatorNik: body.creatorNik || null,
        isRoutine: isRoutine,
        frekuensi: body.frekuensi || null,
        department: body.department || "ALL",
        bulletinPostId: body.bulletinPostId ? Number(body.bulletinPostId) : null,
      };

      const result = await db.insert(agendaEvents).values(payload).returning();

      // Jika agenda rutin, buat jadwal berulang ke depan secara otomatis
      if (isRoutine && body.frekuensi && routineId) {
        try {
          const count = body.frekuensi === 'harian' ? 14 : (body.frekuensi === 'mingguan' ? 8 : 4);
          const durationMs = endDate.getTime() - startDate.getTime();
          const extraEvents = [];

          for (let i = 1; i <= count; i++) {
            const nextStart = new Date(startDate);
            if (body.frekuensi === 'harian') {
              nextStart.setDate(nextStart.getDate() + i);
            } else if (body.frekuensi === 'mingguan') {
              nextStart.setDate(nextStart.getDate() + (i * 7));
            } else if (body.frekuensi === 'bulanan') {
              nextStart.setMonth(nextStart.getMonth() + i);
            }
            const nextEnd = new Date(nextStart.getTime() + durationMs);
            extraEvents.push({
              ...payload,
              id: `ag-rt-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
              startDate: nextStart,
              endDate: nextEnd,
              routineId
            });
          }

          if (extraEvents.length > 0) {
            await db.insert(agendaEvents).values(extraEvents);
          }
        } catch (rtErr) {
          console.warn('[Agenda Routine Creation Warning]:', rtErr);
        }
      }

      try {
        const _n = await db.insert(notifications).values({
          userId: null,
          role: null,
          title: 'Agenda Baru',
          message: `Event: ${payload.title}`,
          type: 'info',
          link: '/agenda'
        }).returning();
        sendWebPush(_n);
      } catch(e) {}
      res.json({ status: "success", data: result[0] });
    } catch (error: any) {
      console.error("Error creating agenda:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.put("/api/agenda/:id", async (req, res) => {
    try {
      const result = await db.update(agendaEvents).set(req.body).where(eq(agendaEvents.id, req.params.id)).returning();
      res.json({ status: "success", data: result[0] });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.delete("/api/agenda/:id", async (req, res) => {
    try {
      await db.delete(agendaEvents).where(eq(agendaEvents.id, req.params.id));
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.delete("/api/agenda/routine/:routineId", async (req, res) => {
    try {
      const { dateStr } = req.query; // to delete future
      // Just delete all matching for simplicity, or add logic to delete > date
      await db.delete(agendaEvents).where(eq(agendaEvents.routineId, req.params.routineId));
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.all("/api/agenda/cleanup-duplicates", async (req, res) => {
    try {
      const allEvents = await db.select().from(agendaEvents);
      const groups: Record<string, typeof allEvents> = {};

      for (const ev of allEvents) {
        let key = '';
        if (ev.bulletinPostId) {
          key = `bulletin-post-${ev.bulletinPostId}`;
        } else if (ev.id.startsWith('ag-bulletin-')) {
          const parts = ev.id.split('-');
          const postId = parts[2] || 'unknown';
          key = `bulletin-post-${postId}`;
        } else if (ev.title && (ev.title.includes('Weekly') || ev.title.includes('weekly'))) {
          const dStr = ev.startDate ? new Date(ev.startDate).toISOString().slice(0, 10) : 'nodate';
          key = `weekly-title-${ev.title}-${dStr}`;
        } else {
          key = `single-${ev.id}`;
        }

        if (!groups[key]) groups[key] = [];
        groups[key].push(ev);
      }

      const idsToDelete: string[] = [];
      const recordsToKeep: Array<{ key: string; keptId: string; title: string; duplicateCount: number }> = [];

      for (const [key, evList] of Object.entries(groups)) {
        if (evList.length > 1) {
          evList.sort((a, b) => {
            const tA = (a.createdAt ? new Date(a.createdAt).getTime() : 0) || (a.startDate ? new Date(a.startDate).getTime() : 0);
            const tB = (b.createdAt ? new Date(b.createdAt).getTime() : 0) || (b.startDate ? new Date(b.startDate).getTime() : 0);
            return tA - tB;
          });

          const canonical = evList[0];
          recordsToKeep.push({ key, keptId: canonical.id, title: canonical.title, duplicateCount: evList.length - 1 });

          for (let i = 1; i < evList.length; i++) {
            idsToDelete.push(evList[i].id);
          }
        }
      }

      let deletedCount = 0;
      if (idsToDelete.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < idsToDelete.length; i += chunkSize) {
          const chunk = idsToDelete.slice(i, i + chunkSize);
          await db.delete(agendaEvents).where(inArray(agendaEvents.id, chunk));
          deletedCount += chunk.length;
        }
      }

      // Rename kept bulletin event ID to canonical format if needed
      for (const r of recordsToKeep) {
        if (r.key.startsWith('bulletin-post-')) {
          const postId = r.key.replace('bulletin-post-', '');
          const canonicalId = `ag-bulletin-${postId}`;
          if (r.keptId !== canonicalId) {
            try {
              const existing = await db.select().from(agendaEvents).where(eq(agendaEvents.id, canonicalId)).limit(1);
              if (existing.length === 0) {
                await db.update(agendaEvents).set({ id: canonicalId, bulletinPostId: Number(postId) }).where(eq(agendaEvents.id, r.keptId));
              }
            } catch (e) {
              // Ignore rename collision
            }
          }
        }
      }

      const remainingEvents = await db.select().from(agendaEvents);
      console.log(`[Agenda Cleanup] Deleted ${deletedCount} duplicate events. Remaining: ${remainingEvents.length}`);

      res.json({
        status: "success",
        totalBefore: allEvents.length,
        totalAfter: remainingEvents.length,
        deletedCount,
        deduplicatedGroupsCount: recordsToKeep.length
      });
    } catch (error: any) {
      console.error("Cleanup duplicates error:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

