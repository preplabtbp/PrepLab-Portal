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

router.get("/api/bulletin", async (req, res) => {
    try {
      const data = await db.select().from(bulletinPosts).orderBy(bulletinPosts.createdAt);
      // We will sort them descending in the frontend or we can use desc() if imported
      res.json({ status: "success", data });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.get("/api/bulletin/search", async (req, res) => {
    try {
      const { q, department } = req.query;
      if (!q) {
        return res.json({ status: "success", data: [] });
      }
      
      const qLower = String(q).toLowerCase();
      
      // Get all posts for department
      let allPosts = await db.select().from(bulletinPosts);
      if (department) {
         allPosts = allPosts.filter(p => p.department === department);
      }
      
      const allComments = await db.select().from(bulletinComments);
      
      const matchedPosts = [];
      
      for (const post of allPosts) {
         let isMatch = false;
         let postContent = {};
         try {
            postContent = JSON.parse(post.content);
         } catch(e){}
         
         const jenisKegiatan = ((postContent as any).jenisKegiatan || "").toLowerCase();
         const keterangan = ((postContent as any).keterangan || "").toLowerCase();
         const pic = ((postContent as any).pic || "").toLowerCase();
         
         if (jenisKegiatan.includes(qLower) || keterangan.includes(qLower) || pic.includes(qLower)) {
            isMatch = true;
         }
         
         const postComments = allComments.filter(c => c.postId === post.id);
         const matchedComments = [];
         
         for (const c of postComments) {
            const content = (c.content || "").toLowerCase();
            const fileName = (c.fileName || "").toLowerCase();
            
            if (content.includes(qLower) || fileName.includes(qLower)) {
               isMatch = true;
               matchedComments.push(c);
            }
         }
         
         if (isMatch) {
            matchedPosts.push({
               ...post,
               parsedContent: postContent,
               matchedComments
            });
         }
      }
      
      res.json({ status: "success", data: matchedPosts });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.post("/api/bulletin", async (req, res) => {
    try {
      const result = await db.insert(bulletinPosts).values(req.body).returning();
      const post = result[0];
      
      // Sync to agenda if there is an agendaDate
      await syncBulletinToAgenda(post);
      
      const dept = post.department;
      const targets = await getNotificationTargets(dept);
      
      const notificationsData = targets
        .filter(t => t.nik !== post.authorNik && t.nik)
        .map(t => ({
          userId: t.nik,
          title: `New Bulletin (${dept})`,
          message: `${post.authorName || 'Someone'} posted a new topic.`,
          type: 'info',
          link: ''
        }));
        
      if (notificationsData.length > 0) {
        const __notif = await db.insert(notifications).values(notificationsData).returning(); sendWebPush(__notif);
      }
      
      res.json({ status: "success", data: post });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.get("/api/bulletin/:id/comments", async (req, res) => {
    try {
      const data = await db.select({
        id: bulletinComments.id,
        postId: bulletinComments.postId,
        authorNik: bulletinComments.authorNik,
        authorName: bulletinComments.authorName,
        content: bulletinComments.content,
        fileUrl: bulletinComments.fileUrl,
        fileName: bulletinComments.fileName,
        createdAt: bulletinComments.createdAt,
        authorAvatar: employees.avatar,
      })
      .from(bulletinComments)
      .leftJoin(employees, eq(bulletinComments.authorNik, employees.nik))
      .where(eq(bulletinComments.postId, parseInt(req.params.id)))
      .orderBy(bulletinComments.createdAt);

      res.json({ status: "success", data });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.post("/api/bulletin/:id/comments", async (req, res) => {
    try {
      const result = await db.insert(bulletinComments).values({ ...req.body, postId: parseInt(req.params.id) }).returning();
      const comment = result[0];
      
      const postArray = await db.select().from(bulletinPosts).where(eq(bulletinPosts.id, comment.postId)).limit(1);
      if (postArray.length > 0) {
        const post = postArray[0];
        const dept = post.department;
        
        const targets = await getNotificationTargets(dept);
        
        const notificationsData = targets
          .filter(t => t.nik !== comment.authorNik && t.nik)
          .map(t => ({
            userId: t.nik,
            title: `New Comment (${dept})`,
            message: `${comment.authorName || 'Someone'} commented on a topic.`,
            type: 'info',
            link: ''
          }));
          
        if (notificationsData.length > 0) {
          const __notif = await db.insert(notifications).values(notificationsData).returning(); sendWebPush(__notif);
        }
      }
      
      res.json({ status: "success", data: comment });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.delete("/api/bulletin/comments/:commentId", async (req, res) => {
    try {
      const { deleterNik, deleterName } = req.query;
      const commentId = parseInt(req.params.commentId);
      
      const commentArray = await db.select().from(bulletinComments).where(eq(bulletinComments.id, commentId)).limit(1);
      if (commentArray.length === 0) {
        return res.status(404).json({status: "error", message: "Comment not found"});
      }
      const comment = commentArray[0];
      
      const postArray = await db.select().from(bulletinPosts).where(eq(bulletinPosts.id, comment.postId)).limit(1);
      if (postArray.length > 0) {
        const post = postArray[0];
        const dept = post.department;
        const targets = await getNotificationTargets(dept);
        
        const notificationsData = targets
          .filter(t => t.nik !== deleterNik && t.nik)
          .map(t => ({
            userId: t.nik,
            title: `Update Dihapus (${dept})`,
            message: `${deleterName || 'Seseorang'} menghapus update di topik "${post.category || 'Topic'}"`,
            type: 'warning',
            link: ''
          }));
          
        if (notificationsData.length > 0) {
          const __notif = await db.insert(notifications).values(notificationsData).returning(); sendWebPush(__notif);
        }
      }
      
      await db.delete(bulletinComments).where(eq(bulletinComments.id, commentId));
      
      res.json({ status: "success" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.put("/api/bulletin/:id", async (req, res) => {
    try {
      const result = await db.update(bulletinPosts).set(req.body).where(eq(bulletinPosts.id, parseInt(req.params.id))).returning();
      const post = result[0];
      if (post) {
        await syncBulletinToAgenda(post);
      }
      res.json({ status: "success", data: post });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.delete("/api/bulletin/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(agendaEvents).where(eq(agendaEvents.bulletinPostId, id));
      await db.delete(bulletinPosts).where(eq(bulletinPosts.id, id));
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });
