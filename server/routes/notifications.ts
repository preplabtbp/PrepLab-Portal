import { Router } from "express";
import { db } from "../../src/db/index.js";
import { eq, desc, or, inArray, isNull, and, gte, lte, sql } from "drizzle-orm";
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

router.get("/api/notifications", async (req, res) => {
    try {
      let data = [];
      const userId = req.query.userId as string;
      if (userId) {
        const cleanUserId = userId.trim().toUpperCase();
        const hardcodedDevs = ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN'];
        let isDev = hardcodedDevs.includes(cleanUserId);
        if (!isDev) {
          const devUser = await db.select().from(developerUsers).where(sql`UPPER(${developerUsers.nik}) = ${cleanUserId}`).limit(1);
          isDev = devUser.length > 0;
        }

        // Lounge chats must NEVER appear in notifications
        const loungeFilter = sql`(${notifications.role} IS NULL OR LOWER(${notifications.role}) != 'lounge') AND (${notifications.title} IS NULL OR LOWER(${notifications.title}) NOT LIKE '%lounge%')`;

        if (isDev) {
          data = await db.select().from(notifications)
            .where(loungeFilter)
            .orderBy(desc(notifications.createdAt));
          return res.json(data);
        }

        let roles: string[] = [];
        const emp = await db.select().from(employees).where(eq(employees.nik, userId)).limit(1);
        if (emp.length > 0) {
          const dept = emp[0].department;
          if (dept) {
            roles.push(dept, dept.toLowerCase(), dept.toUpperCase());
          }
          const sect = emp[0].section;
          if (sect) {
            roles.push(sect, sect.toLowerCase(), sect.toUpperCase());
          }
          const pos = emp[0].position || emp[0].jabatan;
          if (pos) {
            roles.push(pos, pos.toLowerCase());
          }

          // Smart detection for SPV Up (Supervisor, Superintendent, Manager, Lead, Admin)
          const posLower = (pos || '').toLowerCase();
          const isSpvUp = posLower.includes('supervisor') || 
            posLower.includes('superintendent') || 
            posLower.includes('manager') || 
            posLower.includes('lead') || 
            posLower.includes('admin') || 
            posLower.includes('foreman');

          if (isSpvUp) {
            roles.push('SPV', 'spv', 'Supervisor');
            // Check specific section implied by job title or employee section
            if (posLower.includes('prep')) roles.push('Preparation', 'preparation', 'Preparasi');
            if (posLower.includes('lab') && !posLower.includes('preplab')) roles.push('Laboratory', 'laboratory', 'Laboratorium');
            if (posLower.includes('maint')) roles.push('Maintenance', 'maintenance');
            if (posLower.includes('qa')) roles.push('QA', 'qa', 'Quality Assurance');
            if (posLower.includes('inv')) roles.push('Inventory Control', 'inventory control', 'Inventory', 'inventory');
            if (posLower.includes('admin')) roles.push('Administration', 'administration', 'admin');

            // Superintendent & Manager oversee all operational sections
            if (posLower.includes('manager') || posLower.includes('superintendent')) {
              roles.push(
                'Preparation', 'preparation',
                'Laboratory', 'laboratory',
                'Maintenance', 'maintenance',
                'QA', 'qa',
                'Administration', 'administration',
                'Inventory Control', 'inventory control', 'Inventory'
              );
            }
          }
        }

        // Direct personal notifications for this user OR broadcast notifications (where userId IS NULL)
        // Ensure non-dev users NEVER receive notifications with role 'Developer' or category 'dev'
        const devFilter = and(
          sql`(${notifications.role} IS NULL OR LOWER(${notifications.role}) NOT IN ('developer', 'dev', 'lounge'))`,
          sql`(${notifications.category} IS NULL OR LOWER(${notifications.category}) NOT IN ('dev', 'developer', 'lounge'))`,
          loungeFilter
        );

        const userCondition = eq(notifications.userId, userId);
        const broadcastCondition = roles.length > 0
          ? and(isNull(notifications.userId), or(inArray(notifications.role, roles), isNull(notifications.role)), devFilter)
          : and(isNull(notifications.userId), devFilter);

        data = await db.select().from(notifications)
             .where(and(or(userCondition, broadcastCondition), loungeFilter))
             .orderBy(desc(notifications.createdAt));
      } else {
        data = await db.select().from(notifications)
          .where(sql`(${notifications.role} IS NULL OR LOWER(${notifications.role}) != 'lounge') AND (${notifications.title} IS NULL OR LOWER(${notifications.title}) NOT LIKE '%lounge%')`)
          .orderBy(desc(notifications.createdAt));
      }
      
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

router.post("/api/notifications", async (req, res) => {
    try {
      const result = await db.insert(notifications).values(req.body).returning();
      sendWebPush(result[0]);
      res.json(result[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

router.put("/api/notifications/:id/read", async (req, res) => {
    try {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

router.put("/api/notifications/read-all", async (req, res) => {
    try {
      const { userId } = req.query;
      if (userId) {
        await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId as string));
      } else {
        await db.update(notifications).set({ isRead: true });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to mark all as read" });
    }
  });
