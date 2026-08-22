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
      let { pt } = req.query as { pt?: string };
      
      // GPS and TBP share the same universe (TBP_GPS)
      // so GPS users see TBP data
      if (pt === 'GPS') pt = 'TBP';
      
      console.log('[Bulletin API] GET request, resolved pt:', pt);
      let query: any = db.select().from(bulletinPosts);
      if (pt) {
        query = query.where(eq(bulletinPosts.pt, pt));
      } else {
        query = query.where(eq(bulletinPosts.pt, 'TBP'));
      }
      query = query.orderBy(bulletinPosts.createdAt);
      
      const data = await query;
      console.log('[Bulletin API] Returning', data.length, 'posts for pt:', pt);
      res.json({ status: "success", data });
    } catch (error) {
      console.error('[Bulletin API] Error:', error.message);
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
      
      const pt = req.query.pt as string || 'TBP';
      
      // Get all posts for department
      let allPosts = await db.select().from(bulletinPosts).where(eq(bulletinPosts.pt, pt));
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
      const newPostData = req.body;
      if (!newPostData.pt) newPostData.pt = 'TBP';
      
      const result = await db.insert(bulletinPosts).values(newPostData).returning();
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

router.post("/api/bulletin/migrate-notion", async (req, res) => {
    try {
      const { title, notionId, coverImage, tags, originalCreatedAt, department, category, content, authorNik, authorName, pt } = req.body;
      
      const newPostData = {
        title,
        notionId,
        coverImage,
        tags,
        originalCreatedAt: originalCreatedAt ? new Date(originalCreatedAt) : new Date(),
        department: department || 'General',
        category: category || 'Update',
        content,
        authorNik: authorNik || 'SYSTEM',
        authorName: authorName || 'Notion Import',
        pt: pt || 'TBP',
        createdAt: new Date()
      };
      
      const result = await db.insert(bulletinPosts).values(newPostData).onConflictDoUpdate({
        target: bulletinPosts.notionId,
        set: { content, title, coverImage, tags, originalCreatedAt: newPostData.originalCreatedAt }
      }).returning();
      
      res.json({ status: "success", data: result[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.get("/api/bulletin/:id/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const { topicTitle, topicId } = req.query as { topicTitle?: string; topicId?: string };

      const data = await db
        .select({
          id: bulletinComments.id,
          postId: bulletinComments.postId,
          topicTitle: bulletinComments.topicTitle,
          topicId: bulletinComments.topicId,
          section: bulletinComments.section,
          category: bulletinComments.category,
          statusUpdate: bulletinComments.statusUpdate,
          authorNik: bulletinComments.authorNik,
          authorName: bulletinComments.authorName,
          content: bulletinComments.content,
          fileUrl: bulletinComments.fileUrl,
          fileName: bulletinComments.fileName,
          createdAt: bulletinComments.createdAt,
          authorAvatar: employees.avatar,
          authorJabatan: employees.jabatan,
          authorSection: employees.section,
        })
        .from(bulletinComments)
        .leftJoin(employees, eq(bulletinComments.authorNik, employees.nik))
        .where(eq(bulletinComments.postId, postId))
        .orderBy(desc(bulletinComments.createdAt));

      let result = data;
      if (topicTitle || topicId) {
        const qTitle = (topicTitle || '').toLowerCase().trim();
        const qId = (topicId || '').toLowerCase().trim();
        result = data.filter((c) => {
          const t = (c.topicTitle || '').toLowerCase().trim();
          const id = (c.topicId || '').toLowerCase().trim();
          return (qTitle && t === qTitle) || (qId && id === qId);
        });
      }

      res.json({ status: "success", data: result });
    } catch (error: any) {
      console.error('[Bulletin Comments GET] Error:', error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.post("/api/bulletin/:id/comments", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const {
        content,
        authorNik,
        authorName,
        topicTitle,
        topicId,
        section,
        category,
        statusUpdate,
        fileUrl,
        fileName,
        picNik,
        pt
      } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ status: "error", message: "Komentar tidak boleh kosong" });
      }

      const inserted = await db.insert(bulletinComments).values({
        postId,
        topicTitle: topicTitle || null,
        topicId: topicId || null,
        section: section || null,
        category: category || null,
        statusUpdate: statusUpdate || null,
        authorNik: authorNik || null,
        authorName: authorName || 'Seseorang',
        content: content.trim(),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        universe: pt || 'TBP_GPS',
      }).returning();

      const comment = inserted[0];

      // Notification calculation by Section and PIC
      const postArray = await db.select().from(bulletinPosts).where(eq(bulletinPosts.id, postId)).limit(1);
      const post = postArray[0];
      const postSection = section || post?.category || post?.department || 'Prep & Lab';

      const allEmployees = await db.select().from(employees);
      const targetEmployees = allEmployees.filter((e) => {
        if (!e.nik || e.nik === authorNik) return false;
        
        // If PIC is specified, always include PIC
        if (picNik && e.nik === picNik) return true;

        // Section match (case-insensitive fuzzy match)
        const empSect = (e.section || '').toLowerCase();
        const empDept = (e.department || '').toLowerCase();
        const targetSect = postSection.toLowerCase();

        return (
          empSect.includes(targetSect) ||
          targetSect.includes(empSect) ||
          empDept.includes(targetSect) ||
          targetSect.includes(empDept)
        );
      });

      const topicLabel = topicTitle ? `"${topicTitle.length > 35 ? topicTitle.substring(0, 35) + '...' : topicTitle}"` : (post?.title || 'Topik');
      const notifTitle = statusUpdate
        ? `⚡ Update Status [${postSection}]: ${statusUpdate}`
        : `💬 Update Topik [${postSection}]`;
      const notifMessage = statusUpdate
        ? `${authorName || 'Personil'} mengupdate status topik ${topicLabel} ke "${statusUpdate}".`
        : `${authorName || 'Personil'} mengupdate progress pada topik ${topicLabel}.`;
      const notifLink = `/bulletin/TBP?postId=${postId}&topic=${encodeURIComponent(topicTitle || '')}`;

      const notificationsData = targetEmployees.map((t) => ({
        userId: t.nik,
        role: postSection,
        title: notifTitle,
        message: notifMessage,
        type: statusUpdate ? 'success' : 'info',
        link: notifLink,
        isRead: false,
      }));

      if (notificationsData.length > 0) {
        const insertedNotifs = await db.insert(notifications).values(notificationsData).returning();
        insertedNotifs.forEach((n) => sendWebPush(n));
      }

      res.json({ status: "success", data: comment });
    } catch (error: any) {
      console.error('[Bulletin Comment POST] Error:', error);
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

// Direct streaming proxy for Google Drive files (prevents CORS & broken thumbnails)
router.get("/api/drive/view/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;
    if (!fileId || fileId.length < 5) return res.status(400).send("Invalid file ID");

    // Fetch metadata for mimeType
    let mimeType = 'application/octet-stream';
    try {
      const meta = await drive.files.get({ fileId, fields: 'mimeType, name, size', supportsAllDrives: true });
      if (meta?.data?.mimeType) {
        mimeType = meta.data.mimeType;
      }
    } catch (e) {
      // ignore metadata error
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

    const streamRes = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );

    streamRes.data.pipe(res);
  } catch (err: any) {
    console.error(`[Drive Proxy View] Error streaming file ${req.params.fileId}:`, err.message);
    res.status(404).send("File not found or inaccessible");
  }
});

// Direct download proxy for Google Drive files
router.get("/api/drive/download/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;
    if (!fileId || fileId.length < 5) return res.status(400).send("Invalid file ID");

    let fileName = 'downloaded-file';
    let mimeType = 'application/octet-stream';
    try {
      const meta = await drive.files.get({ fileId, fields: 'mimeType, name, size', supportsAllDrives: true });
      if (meta?.data?.name) fileName = meta.data.name;
      if (meta?.data?.mimeType) mimeType = meta.data.mimeType;
    } catch (e) {
      // ignore metadata error
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    const streamRes = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'stream' }
    );

    streamRes.data.pipe(res);
  } catch (err: any) {
    console.error(`[Drive Proxy Download] Error streaming file ${req.params.fileId}:`, err.message);
    res.status(404).send("File not found or inaccessible");
  }
});

