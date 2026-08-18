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

router.get("/api/roster", async (req, res) => {
    try {
      const allEmps = await db.select().from(employees);
      const allRoster = await db.select().from(roster);
      
      const rosterByNik = {};
      for (const r of allRoster) {
        if (!rosterByNik[r.nik]) rosterByNik[r.nik] = {};
        rosterByNik[r.nik][r.date] = r.status;
      }
      
      const todayDate = new Date();
      todayDate.setHours(0,0,0,0);
      
      const result = allEmps.map(emp => {
        const sched = rosterByNik[emp.nik] || {};
        
        
        let lastTrvDate = null;
        let nextTrvDate = null;
        let nextWorkDate = null;

        const datesAsc = Object.keys(sched).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
        const sortedDates = [...datesAsc].reverse();

        for (const date of sortedDates) {
          if (new Date(date) <= todayDate && (['TRV', 'TV', 'C', 'CR', 'CE', 'CT', 'CI', 'XP', 'TT'].includes(sched[date]) || (sched[date] && (sched[date].startsWith('CT') || sched[date].startsWith('CE'))))) {
            lastTrvDate = date;
            break;
          }
        }
        
        for (const date of datesAsc) {
          if (new Date(date) >= todayDate) {
            if (!nextTrvDate && (['TRV', 'TV', 'C', 'CR', 'CE', 'CT', 'CI', 'XP', 'TT'].includes(sched[date]) || (sched[date] && (sched[date].startsWith('CT') || sched[date].startsWith('CE'))))) {
              nextTrvDate = date;
            }
            if (!nextWorkDate && (sched[date] === 'D' || sched[date] === 'N' || sched[date] === 'LS' || sched[date] === 'S')) {
              nextWorkDate = date;
            }
          }
        }

        
        // Generate next 7 days schedule
        const next7Days = [];
        const iterDate = new Date();
        for (let i = 0; i < 7; i++) {
          const dStr = iterDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }); // e.g. "18 Jul 26" format depends, but our csv has "1 Jan 26"
          
          // Let's use a function to format matching CSV date format: D MMM YY
          const parts = iterDate.toDateString().split(' '); // Thu Jul 18 2026 -> ["Thu", "Jul", "18", "2026"]
          const day = parseInt(parts[2], 10);
          const formattedDate = day + ' ' + parts[1] + ' ' + parts[3].substring(2); // "18 Jul 26"
          
          const shiftCode = sched[formattedDate] || '-';
          next7Days.push({
            day: parts[0],
            date: formattedDate,
            shiftCode: shiftCode
          });
          iterDate.setDate(iterDate.getDate() + 1);
        }
        
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
          lastTrvDate: lastTrvDate,
          nextTrvDate: nextTrvDate,
          nextWorkDate: nextWorkDate,
          schedule: next7Days,
          fullSchedule: sched
        };
      });
      
      res.json(result);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch roster" });
    }
  });

router.post("/api/roster/izin", async (req, res) => {
    try {
      const { nik, date, type } = req.body;
      const formattedDate = new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/,/g, ''); // Fix formatting based on node version
      
      const parts = new Date(date).toDateString().split(' ');
      const day = parseInt(parts[2], 10);
      const properDate = day + ' ' + parts[1] + ' ' + parts[3].substring(2);

      const existing = await db.select().from(roster).where(and(eq(roster.nik, nik), eq(roster.date, properDate))).limit(1);
      
      if (existing.length > 0) {
        await db.update(roster).set({ status: type }).where(eq(roster.id, existing[0].id));
      } else {
        await db.insert(roster).values({ nik: nik, date: properDate, status: type });
      }
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to add izin" });
    }
  });
