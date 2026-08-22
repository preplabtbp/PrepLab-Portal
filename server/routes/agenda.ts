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

router.get("/api/agenda", async (req, res) => {
    try {
      const data: any[] = await db.select().from(agendaEvents);
      
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
               kategori: 'Quality Assurance',
               pic: emp.name,
               deskripsi: `Hari Ulang Tahun ${emp.name} (${emp.jabatan || 'Karyawan'})`,
               department: 'Quality Assurance', 
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
               kategori: 'Quality Assurance',
               pic: emp.name,
               deskripsi: `Hari Ulang Tahun ${emp.name} (${emp.jabatan || 'Karyawan'})`,
               department: 'Quality Assurance',
               isRoutine: false,
               isBirthday: true,
             });
          }
        }
      });
      
      res.json({ status: "success", data });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.post("/api/agenda", async (req, res) => {
    try {
      const body = req.body;
      const eventId = body.id || `ag-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const startDate = body.startDate ? new Date(body.startDate) : (body.date ? new Date(body.date) : new Date());
      const endDate = body.endDate ? new Date(body.endDate) : new Date(startDate.getTime() + 60 * 60 * 1000);
      
      const payload: any = {
        id: eventId,
        title: body.title || "Agenda Baru",
        startDate: startDate,
        endDate: endDate,
        kategori: body.kategori || "General",
        pic: body.pic || "-",
        deskripsi: body.deskripsi || "",
        routineId: body.routineId || null,
        creatorNik: body.creatorNik || null,
        isRoutine: Boolean(body.isRoutine),
        frekuensi: body.frekuensi || null,
        department: body.department || "ALL",
        bulletinPostId: body.bulletinPostId ? Number(body.bulletinPostId) : null,
      };

      const result = await db.insert(agendaEvents).values(payload).returning();
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
