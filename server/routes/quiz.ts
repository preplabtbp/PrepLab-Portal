import { Router } from "express";
import { db } from "../../src/db/index.js";
import { eq, desc, or, inArray, isNull, and, gte, lte, sql } from "drizzle-orm";
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

// Ensure quiz_questions columns exist
db.execute(sql`ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS image_url TEXT;`).catch(err => {
  console.warn("quiz_questions image_url column check:", err.message);
});
db.execute(sql`ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS option_images TEXT[];`).catch(err => {
  console.warn("quiz_questions option_images column check:", err.message);
});

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
      const { category, text, imageUrl, options, optionImages, correctAnswerIndex } = req.body;
      const cleanOptions = Array.isArray(options) ? options.map(o => String(o || '')) : [];
      const cleanOptionImages = Array.isArray(optionImages) ? optionImages.map(img => img ? String(img).trim() : null) : null;

      const newQ = await db.insert(quizQuestions).values({
        category: String(category || '').trim(),
        text: String(text || '').trim(),
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
        options: cleanOptions,
        optionImages: cleanOptionImages,
        correctAnswerIndex: Number(correctAnswerIndex) || 0
      }).returning();
      res.json(newQ[0]);
    } catch (e: any) {
      console.error("Failed to create quiz question:", e);
      res.status(500).json({ error: "Failed to create quiz question", details: e?.message });
    }
  });

router.put("/api/quiz-questions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid question ID" });
      }
      const { category, text, imageUrl, options, optionImages, correctAnswerIndex } = req.body;
      const cleanOptions = Array.isArray(options) ? options.map(o => String(o || '')) : [];
      const cleanOptionImages = Array.isArray(optionImages) ? optionImages.map(img => img ? String(img).trim() : null) : null;

      const updatedQ = await db.update(quizQuestions).set({
        category: String(category || '').trim(),
        text: String(text || '').trim(),
        imageUrl: imageUrl ? String(imageUrl).trim() : null,
        options: cleanOptions,
        optionImages: cleanOptionImages,
        correctAnswerIndex: Number(correctAnswerIndex) || 0
      }).where(eq(quizQuestions.id, id)).returning();

      if (!updatedQ || updatedQ.length === 0) {
        return res.status(404).json({ error: "Question not found" });
      }
      res.json(updatedQ[0]);
    } catch (e: any) {
      console.error("Failed to update quiz question:", e);
      res.status(500).json({ error: "Failed to update quiz question", details: e?.message });
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
