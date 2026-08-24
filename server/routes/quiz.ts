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

router.get("/api/quiz-questions", async (req, res) => {
    try {
      const allQuestions = await db.select().from(quizQuestions);
      res.json(allQuestions);
    } catch (e) {
      console.error("Error fetching quiz questions", e);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

router.post("/api/quiz-questions", async (req, res) => {
    try {
      const newQ = await db.insert(quizQuestions).values(req.body).returning();
      res.json(newQ[0]);
    } catch (e) {
      res.status(500).json({ error: "Failed to create quiz question" });
    }
  });

router.put("/api/quiz-questions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedQ = await db.update(quizQuestions).set(req.body).where(eq(quizQuestions.id, id)).returning();
      res.json(updatedQ[0]);
    } catch (e) {
      res.status(500).json({ error: "Failed to update quiz question" });
    }
  });

router.delete("/api/quiz-questions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete quiz question" });
    }
  });

router.get("/api/quiz-scores", async (req, res) => {
    try {
      const { pt } = req.query;
      let query: any = db.select().from(quizScores);
      if (pt && (pt as string).toUpperCase() === 'GTS') {
        query = query.where(eq(quizScores.pt, 'GTS'));
      } else {
        query = query.where(or(eq(quizScores.pt, 'TBP'), eq(quizScores.pt, 'GPS'), eq(quizScores.pt, 'TBP_GPS'), isNull(quizScores.pt)));
      }
      query = query.orderBy(desc(quizScores.timestamp));
      const scores = await query;
      res.json(scores);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch quiz scores" });
    }
  });

router.post("/api/quiz-scores", async (req, res) => {
    try {
      if (req.body.quizVersion) {
         const existing = await db.select().from(quizScores).where(
            and(eq(quizScores.nik, req.body.nik), eq(quizScores.quizVersion, req.body.quizVersion))
         ).limit(1);
         if (existing.length > 0) {
            return res.status(400).json({ error: "Anda sudah mengerjakan kuis ini" });
         }
      }
      
      const newScoreData = req.body;
      if (!newScoreData.pt) newScoreData.pt = 'TBP';
      
      const newScore = await db.insert(quizScores).values(newScoreData).returning();
      res.json(newScore[0]);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to save score" });
    }
  });

router.delete("/api/quiz-scores/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(quizScores).where(eq(quizScores.id, id));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete score" });
    }
  });
