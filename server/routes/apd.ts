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

router.get("/api/apd/settings", async (req, res) => {
    const data = await db.select().from(apdSettings);
    res.json(data);
  });

router.post("/api/apd/settings", async (req, res) => {
    res.json({ status: "ok" });
  });

router.get("/api/apd/history", async (req, res) => {
    const data = await db.select().from(apdHistory);
    res.json(data);
  });

router.post("/api/apd/history", async (req, res) => {
    res.json({ status: "ok" });
  });

router.get("/api/apd/documents", async (req, res) => {
    const data = await db.select().from(apdDocuments);
    res.json(data);
  });

router.post("/api/apd/documents", async (req, res) => {
    res.json({ status: "ok" });
  });
