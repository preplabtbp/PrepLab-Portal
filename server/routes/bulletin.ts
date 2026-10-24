import { Router } from "express";
import { db, isDbCircuitBroken } from "../../src/db/index.js";
import { eq, desc, or, inArray, isNull, and, gte, lte, sql, like, ilike } from "drizzle-orm";
import { 
  chatMessages, employees, equipments, workOrders, users, tickets, downtime, 
  spareparts, apdSettings, apdHistory, apdDocuments, roster, inspections, 
  pemantauan, questions, agendaEvents, privateNotes, userThemes, bulletinPosts, 
  notifications, bulletinComments, uploadedFiles, appSettings, pelanggaran, 
  mealReports, pushSubscriptions, quizQuestions, preplabCloudLogs, quizScores, induksi,
  logbookTasks, bulletinRecycleBin
} from "../../src/db/schema.js";
import { generatePdfFromTemplate, drive } from '../../google-services.js';
import { 
  sendWebPush, getUniverse, uploadFileToDrive, syncBulletinToAgenda, 
  getNotificationTargets, getSectionNotificationTargets, getTableObj, sanitizePayload 
} from "../utils.js";
import webpush from 'web-push';
import path from "path";

export const router = Router();

// In-memory cache for bulletin list queries to ensure instantaneous responses (<5ms)
interface BulletinListCache {
  data: any[];
  timestamp: number;
}
const bulletinListCache = new Map<string, BulletinListCache>();
const BULLETIN_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache TTL for instant responses

export function clearBulletinCache() {
  bulletinListCache.clear();
}

// Background pre-warmer to eliminate cold-start DB latency for all users
export async function warmBulletinCache() {
  try {
    for (const targetPt of ['ALL', 'TBP', 'GTS']) {
      const conditions: any[] = [];
      if (targetPt === 'GTS') {
        conditions.push(eq(bulletinPosts.pt, 'GTS'));
      } else if (targetPt !== 'ALL') {
        conditions.push(or(
          eq(bulletinPosts.pt, 'TBP'),
          eq(bulletinPosts.pt, 'GPS'),
          eq(bulletinPosts.pt, 'TBP_GPS'),
          isNull(bulletinPosts.pt)
        ));
      }
      let baseQuery = db.select().from(bulletinPosts);
      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions)) as any;
      }
      const data = await (baseQuery as any).orderBy(bulletinPosts.createdAt);
      if (Array.isArray(data) && data.length > 0) {
        bulletinListCache.set(`${targetPt}_ALL_ALL`, { data, timestamp: Date.now() });
      }
    }
    console.log('[Bulletin Cache] Pre-warming completed successfully.');
  } catch (err: any) {
    console.warn('[Bulletin Cache] Pre-warming notice:', err?.message);
  }
}

// Warm cache automatically in background shortly after startup
setTimeout(() => {
  warmBulletinCache();
}, 2000);

router.get("/api/bulletin", async (req, res) => {
    try {
      let { pt, nik, page, limit } = req.query as { pt?: string; nik?: string; page?: string; limit?: string };
      
      const isSuperUser = nik === '02D24000043' || nik === '02D25000055' || nik === 'M0403240177' || nik === 'preplabadmin';

      // Normalize effective universe so all users for the same universe share the high-speed cache
      const effectivePt = (pt === 'ALL' || (isSuperUser && !pt)) ? 'ALL' : (pt === 'GTS' ? 'GTS' : 'TBP');
      const cacheKey = `${effectivePt}_${page || 'ALL'}_${limit || 'ALL'}`;
      const cached = bulletinListCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < BULLETIN_CACHE_TTL_MS)) {
        return res.json({ status: "success", data: cached.data });
      }
      
      const conditions: any[] = [];
      
      // If pt === 'ALL', return all bulletin posts across both universes
      if (pt === 'ALL') {
        // unrestricted access
      } else if (pt === 'GTS') {
        conditions.push(eq(bulletinPosts.pt, 'GTS'));
      } else {
        // GPS and TBP share the same universe (TBP & GPS bersamaan)
        conditions.push(or(
          eq(bulletinPosts.pt, 'TBP'),
          eq(bulletinPosts.pt, 'GPS'),
          eq(bulletinPosts.pt, 'TBP_GPS'),
          isNull(bulletinPosts.pt)
        ));
      }
      
      let baseQuery = db.select().from(bulletinPosts);
      if (conditions.length > 0) {
        baseQuery = baseQuery.where(and(...conditions)) as any;
      }
      
      const pageNum = page ? Math.max(1, parseInt(page as string, 10)) : null;
      const limitNum = limit ? Math.max(1, parseInt(limit as string, 10)) : null;

      if (isDbCircuitBroken()) {
        if (pageNum && limitNum) {
          return res.json({
            status: "success",
            data: [],
            pagination: { page: pageNum, limit: limitNum, total: 0, totalPages: 0, hasMore: false }
          });
        }
        return res.json({ status: "success", data: [] });
      }

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 15000));
      if (pageNum && limitNum) {
        const totalQuery = conditions.length > 0 
          ? db.select({ count: sql<number>`count(*)` }).from(bulletinPosts).where(and(...conditions))
          : db.select({ count: sql<number>`count(*)` }).from(bulletinPosts);
        const totalRes: any = await Promise.race([totalQuery, timeoutPromise]);
        const total = Number(totalRes[0]?.count || 0);

        const dataPromise = (baseQuery as any)
          .orderBy(desc(bulletinPosts.createdAt))
          .limit(limitNum)
          .offset((pageNum - 1) * limitNum);
        const data: any = await Promise.race([dataPromise, timeoutPromise]);

        return res.json({
          status: "success",
          data,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
            hasMore: pageNum * limitNum < total
          }
        });
      }
      
      const data = await Promise.race([(baseQuery as any).orderBy(bulletinPosts.createdAt), timeoutPromise]);
      if (Array.isArray(data) && data.length > 0) {
        bulletinListCache.set(cacheKey, { data, timestamp: Date.now() });
      }
      res.json({ status: "success", data });
    } catch (error: any) {
      console.warn('[Bulletin API Notice]:', error?.message);
      const pageNum = req.query.page ? Math.max(1, parseInt(req.query.page as string, 10)) : null;
      const limitNum = req.query.limit ? Math.max(1, parseInt(req.query.limit as string, 10)) : null;
      if (pageNum && limitNum) {
        return res.status(503).json({
          status: "error",
          message: "Database connection temporarily unavailable: " + (error?.message || ''),
          data: [],
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: 0,
            totalPages: 0,
            hasMore: false
          }
        });
      }
      res.status(503).json({ status: "error", message: "Database connection temporarily unavailable: " + (error?.message || ''), data: [] });
    }
  });

router.get("/api/bulletin/search", async (req, res) => {
    try {
      const { q, department, nik } = req.query as { q?: string; department?: string; nik?: string; pt?: string };
      if (!q) {
        return res.json({ status: "success", data: [] });
      }
      
      const qLower = String(q).toLowerCase();
      const pt = req.query.pt as string || 'TBP';
      
      // Get all posts for department and target PT
      let conditions: any[] = [];
      if (pt !== 'ALL') {
        if (pt === 'GTS') {
          conditions.push(eq(bulletinPosts.pt, 'GTS'));
        } else {
          // GPS and TBP share the same universe (TBP & GPS bersamaan)
          conditions.push(or(
            eq(bulletinPosts.pt, 'TBP'),
            eq(bulletinPosts.pt, 'GPS'),
            eq(bulletinPosts.pt, 'TBP_GPS'),
            isNull(bulletinPosts.pt)
          ));
        }
      }
      if (department) {
        conditions.push(eq(bulletinPosts.department, String(department)));
      }
      const allPosts = conditions.length > 0 
        ? await db.select().from(bulletinPosts).where(and(...conditions))
        : await db.select().from(bulletinPosts);
      const postIds = allPosts.map(p => p.id);
      const allComments = postIds.length > 0 ? await db.select().from(bulletinComments).where(inArray(bulletinComments.postId, postIds)) : [];
      
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

// GET /api/search/omni - Global Enterprise Omnisearch for Topics, Attachments, and Tasks
router.get("/api/search/omni", async (req, res) => {
  try {
    const rawQ = String(req.query.q || "").trim();
    if (!rawQ || rawQ.length < 2) {
      return res.json({
        status: "success",
        query: rawQ,
        data: { topics: [], attachments: [], tasks: [] }
      });
    }

    const qLower = rawQ.toLowerCase();
    const ptParam = String(req.query.pt || "TBP").toUpperCase();
    const isGts = ptParam === "GTS";

    // 1. Universe filter conditions for posts
    const postConditions: any[] = [];
    if (ptParam !== "ALL") {
      if (isGts) {
        postConditions.push(eq(bulletinPosts.pt, "GTS"));
      } else {
        postConditions.push(or(
          eq(bulletinPosts.pt, "TBP"),
          eq(bulletinPosts.pt, "GPS"),
          eq(bulletinPosts.pt, "TBP_GPS"),
          isNull(bulletinPosts.pt)
        ));
      }
    }

    const postSearchFilter = or(
      ilike(bulletinPosts.title, `%${rawQ}%`),
      ilike(bulletinPosts.category, `%${rawQ}%`),
      ilike(bulletinPosts.department, `%${rawQ}%`),
      ilike(bulletinPosts.content, `%${rawQ}%`)
    );

    const fullPostQuery = postConditions.length > 0
      ? and(...postConditions, postSearchFilter)
      : postSearchFilter;

    const matchedPosts = await db
      .select({
        id: bulletinPosts.id,
        title: bulletinPosts.title,
        department: bulletinPosts.department,
        category: bulletinPosts.category,
        content: bulletinPosts.content,
        authorName: bulletinPosts.authorName,
        pt: bulletinPosts.pt,
        createdAt: bulletinPosts.createdAt
      })
      .from(bulletinPosts)
      .where(fullPostQuery)
      .limit(30);

    // 2. Search attachments in bulletin comments
    const commentConditions: any[] = [];
    if (ptParam !== "ALL") {
      if (isGts) {
        // Universe GTS: HANYA komentar pada dokumen GTS
        commentConditions.push(
          or(
            eq(bulletinPosts.pt, "GTS"),
            eq(bulletinComments.universe, "GTS")
          )
        );
      } else {
        // Universe TBP / GPS: STRICTLY NON-GTS
        commentConditions.push(
          and(
            or(
              eq(bulletinPosts.pt, "TBP"),
              eq(bulletinPosts.pt, "GPS"),
              eq(bulletinPosts.pt, "TBP_GPS"),
              isNull(bulletinPosts.pt)
            ),
            or(
              eq(bulletinComments.universe, "TBP_GPS"),
              eq(bulletinComments.universe, "TBP"),
              isNull(bulletinComments.universe)
            )
          )
        );
      }
    }

    const commentSearchFilter = or(
      ilike(bulletinComments.fileName, `%${rawQ}%`),
      ilike(bulletinComments.fileUrl, `%${rawQ}%`),
      ilike(bulletinComments.topicTitle, `%${rawQ}%`),
      ilike(bulletinComments.content, `%${rawQ}%`)
    );

    const fullCommentQuery = commentConditions.length > 0
      ? and(...commentConditions, commentSearchFilter)
      : commentSearchFilter;

    const matchedComments = await db
      .select({
        id: bulletinComments.id,
        postId: bulletinComments.postId,
        topicTitle: bulletinComments.topicTitle,
        section: bulletinComments.section,
        authorName: bulletinComments.authorName,
        content: bulletinComments.content,
        fileUrl: bulletinComments.fileUrl,
        fileName: bulletinComments.fileName,
        createdAt: bulletinComments.createdAt,
        postPt: bulletinPosts.pt,
        postTitle: bulletinPosts.title
      })
      .from(bulletinComments)
      .leftJoin(bulletinPosts, eq(bulletinComments.postId, bulletinPosts.id))
      .where(fullCommentQuery)
      .limit(30);

    // Helper: Determine file type
    const getFileType = (nameOrUrl: string) => {
      const lower = nameOrUrl.toLowerCase();
      if (lower.endsWith(".pdf") || lower.includes(".pdf?")) return "pdf";
      if (lower.endsWith(".xlsx") || lower.endsWith(".xls") || lower.endsWith(".csv") || lower.includes("spreadsheet")) return "excel";
      if (lower.endsWith(".docx") || lower.endsWith(".doc")) return "word";
      if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp") || lower.endsWith(".svg")) return "image";
      if (lower.endsWith(".zip") || lower.endsWith(".rar")) return "archive";
      if (lower.includes("drive.google.com")) return "drive";
      return "file";
    };

    // Helper: Context snippet around query match
    const makeSnippet = (text: string, query: string, maxLength = 130) => {
      if (!text) return "";
      const clean = text.replace(/<[^>]+>/g, " ").replace(/[#*`|_\-\[\]]/g, " ").replace(/\s+/g, " ").trim();
      const idx = clean.toLowerCase().indexOf(query.toLowerCase());
      if (idx === -1) return clean.slice(0, maxLength) + (clean.length > maxLength ? "..." : "");
      const start = Math.max(0, idx - 35);
      const end = Math.min(clean.length, idx + query.length + 75);
      return (start > 0 ? "..." : "") + clean.slice(start, end) + (end < clean.length ? "..." : "");
    };

    const topicsResult: any[] = [];
    const tasksResult: any[] = [];
    const attachmentsResult: any[] = [];
    const seenAttachmentUrls = new Set<string>();

    for (const post of matchedPosts) {
      const titleLower = (post.title || "").toLowerCase();
      const isTitleMatch = titleLower.includes(qLower);
      const postUniverse = (post.pt || "TBP").toUpperCase().includes("GTS") ? "GTS" : "TBP";

      // Add to Topics list
      topicsResult.push({
        id: post.id,
        title: post.title || "Untitled Document",
        department: post.department,
        category: post.category,
        authorName: post.authorName,
        pt: postUniverse,
        createdAt: post.createdAt,
        snippet: makeSnippet(post.content || "", rawQ),
        isDirectTitleMatch: isTitleMatch,
        link: `/bulletin/${postUniverse}?postId=${post.id}`
      });

      const contentStr = post.content || "";

      // 2A. Scan content for individual tasks in Markdown tables
      if (contentStr.includes("|")) {
        const lines = contentStr.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line.startsWith("|") || line.includes("---")) continue;
          if (line.toLowerCase().includes(qLower)) {
            const rawCells = line.split("|").map(c => c.trim());
            const cells = rawCells.slice(1, rawCells.length - 1);
            if (cells.length >= 2) {
              const taskTitle = cells[1] || cells[0];
              const desc = cells[2] || "";
              const pic = cells.find(c => c.toLowerCase().includes("pic:") || (c.length > 2 && c.length < 25 && !c.includes("---"))) || cells[3] || "-";
              const status = cells.find(c => ["done", "in progress", "pending", "open", "closed", "selesai"].includes(c.toLowerCase())) || cells[5] || "-";
              const priority = cells.find(c => ["high", "medium", "low", "critical", "tinggi", "sedang"].includes(c.toLowerCase())) || cells[4] || "-";

              const cleanTaskTitle = taskTitle.replace(/<!--.*?-->/g, "").replace(/^[↳\s*]+/, "").trim();
              if (cleanTaskTitle && cleanTaskTitle.length > 2 && !cleanTaskTitle.toLowerCase().includes("jenis kegiatan")) {
                tasksResult.push({
                  id: `task-${post.id}-${i}`,
                  postId: post.id,
                  postTitle: post.title,
                  section: post.category || post.department,
                  pt: postUniverse,
                  taskTitle: cleanTaskTitle,
                  desc: desc.slice(0, 110),
                  pic: pic.replace(/^pic:\s*/i, "").trim(),
                  status,
                  priority,
                  link: `/bulletin/${postUniverse}?postId=${post.id}&topic=${encodeURIComponent(cleanTaskTitle)}`
                });
              }
            }
          }
        }
      }

      // 2B. Scan content for embedded markdown attachment links [FileName](URL)
      const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
      let match;
      while ((match = linkRegex.exec(contentStr)) !== null) {
        const linkName = match[1].trim();
        const linkUrl = match[2].trim();
        const combined = `${linkName} ${linkUrl}`.toLowerCase();
        if (combined.includes(qLower) || getFileType(linkUrl) !== "file") {
          if (!seenAttachmentUrls.has(linkUrl) && (combined.includes(qLower) || linkName.toLowerCase().includes(qLower))) {
            seenAttachmentUrls.add(linkUrl);
            attachmentsResult.push({
              id: `att-post-${post.id}-${attachmentsResult.length}`,
              name: linkName,
              url: linkUrl,
              fileType: getFileType(linkName || linkUrl),
              sourcePostId: post.id,
              sourcePostTitle: post.title,
              sourceSection: post.category || post.department,
              uploader: post.authorName,
              pt: postUniverse,
              createdAt: post.createdAt,
              link: `/bulletin/${postUniverse}?postId=${post.id}`
            });
          }
        }
      }

      // 2C. Scan raw Google Drive Links
      const driveRegex = /(https:\/\/drive\.google\.com\/[^\s\)\"\'\<\>]+)/g;
      while ((match = driveRegex.exec(contentStr)) !== null) {
        const driveUrl = match[1].trim();
        if (!seenAttachmentUrls.has(driveUrl)) {
          if (driveUrl.toLowerCase().includes(qLower) || post.title?.toLowerCase().includes(qLower)) {
            seenAttachmentUrls.add(driveUrl);
            attachmentsResult.push({
              id: `att-drive-${post.id}-${attachmentsResult.length}`,
              name: `Lampiran Dokumen Google Drive (${post.title || "Dokumen"})`,
              url: driveUrl,
              fileType: "drive",
              sourcePostId: post.id,
              sourcePostTitle: post.title,
              sourceSection: post.category || post.department,
              uploader: post.authorName,
              pt: postUniverse,
              createdAt: post.createdAt,
              link: `/bulletin/${postUniverse}?postId=${post.id}`
            });
          }
        }
      }
    }

    // 3. Process Comment Attachments
    for (const c of matchedComments) {
      if (c.fileUrl && !seenAttachmentUrls.has(c.fileUrl)) {
        seenAttachmentUrls.add(c.fileUrl);
        const commentUniverse = (c.postPt || "TBP").toUpperCase().includes("GTS") ? "GTS" : "TBP";
        attachmentsResult.push({
          id: `att-comment-${c.id}`,
          name: c.fileName || `Lampiran: ${c.topicTitle || c.postTitle || "Topik"}`,
          url: c.fileUrl,
          fileType: getFileType(c.fileName || c.fileUrl),
          sourcePostId: c.postId,
          sourcePostTitle: c.postTitle,
          sourceTopic: c.topicTitle,
          sourceSection: c.section,
          uploader: c.authorName,
          pt: commentUniverse,
          createdAt: c.createdAt,
          link: `/bulletin/${commentUniverse}?postId=${c.postId}&topic=${encodeURIComponent(c.topicTitle || "")}`
        });
      }
    }

    // Sort: direct title matches first
    topicsResult.sort((a, b) => (b.isDirectTitleMatch ? 1 : 0) - (a.isDirectTitleMatch ? 1 : 0));

    res.json({
      status: "success",
      query: rawQ,
      data: {
        topics: topicsResult.slice(0, 12),
        attachments: attachmentsResult.slice(0, 12),
        tasks: tasksResult.slice(0, 12)
      }
    });
  } catch (err: any) {
    console.error("[Omnisearch Error]:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// GET Single Post by ID for direct navigation and real-time device sync
router.get("/api/bulletin/:id(\\d+)", async (req, res) => {
  try {
    const rawId = String(req.params.id || '');
    const id = parseInt(rawId, 10);
    if (isNaN(id)) {
      // Graceful handling for non-numeric/virtual IDs (section-*, doc-*, logbook-*)
      if (rawId.startsWith('section-') || rawId.startsWith('doc-') || rawId.startsWith('logbook-')) {
        return res.json({ status: "success", data: null, message: "Virtual section post" });
      }
      return res.status(400).json({ status: "error", message: "Invalid post ID" });
    }

    const [post] = await db
      .select()
      .from(bulletinPosts)
      .where(eq(bulletinPosts.id, id))
      .limit(1);

    if (!post) {
      return res.status(404).json({ status: "error", message: "Post not found" });
    }

    return res.json({ status: "success", data: post });
  } catch (error: any) {
    console.error("[Bulletin API] Failed to fetch post by ID:", error);
    return res.status(500).json({ status: "error", message: error?.message || "Internal server error" });
  }
});

router.post("/api/bulletin", async (req, res) => {
    try {
      const sanitized = sanitizePayload(bulletinPosts, req.body) || {};
      delete sanitized.id;
      if (!sanitized.pt) sanitized.pt = 'TBP';
      sanitized.universe = sanitized.pt === 'GTS' ? 'GTS' : 'TBP_GPS';
      
      const result = await db.insert(bulletinPosts).values(sanitized).returning();
      const post = result[0];
      clearBulletinCache();
      
      // Sync to agenda if there is an agendaDate
      await syncBulletinToAgenda(post);
      
      const dept = post.department || 'General';
      const postUniverse = (post.pt || 'TBP').toUpperCase().includes('GTS') ? 'GTS' : 'TBP';
      const targets = await getSectionNotificationTargets(dept, postUniverse);
      
      const notificationsData = targets
        .filter(t => t.nik !== post.authorNik && t.nik)
        .map(t => ({
          userId: t.nik,
          role: dept,
          title: `📰 Artikel Buletin Baru [${dept}]`,
          message: `${post.authorName || 'Personil'} menerbitkan topik baru: "${post.title || post.category || 'Topik Buletin'}"`,
          type: 'info',
          link: `/bulletin/${postUniverse}?postId=${post.id}`,
          isRead: false
        }));
        
      if (notificationsData.length > 0) {
        const insertedNotifs = await db.insert(notifications).values(notificationsData).returning();
        sendWebPush(insertedNotifs, { universe: postUniverse });
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
      const parsedParam = parseInt(req.params.id, 10);
      const postId = !isNaN(parsedParam) ? parsedParam : null;

      if (!postId) {
        return res.json({ status: "success", data: [] });
      }

      const { topicTitle, topicId, pt: queryPt, section: querySection } = req.query as { 
        topicTitle?: string; 
        topicId?: string; 
        pt?: string; 
        section?: string; 
      };

      // Retrieve post metadata to ensure strict PT universe & section alignment
      const postRows = await db.select().from(bulletinPosts).where(eq(bulletinPosts.id, postId)).limit(1);
      const post = postRows[0];
      const targetUniverse = ((queryPt || post?.pt || 'TBP').toUpperCase().includes('GTS')) ? 'GTS' : 'TBP_GPS';

      const data = await db
        .select({
          id: bulletinComments.id,
          postId: bulletinComments.postId,
          topicTitle: bulletinComments.topicTitle,
          topicId: bulletinComments.topicId,
          section: bulletinComments.section,
          category: bulletinComments.category,
          universe: bulletinComments.universe,
          statusUpdate: bulletinComments.statusUpdate,
          authorNik: bulletinComments.authorNik,
          authorName: bulletinComments.authorName,
          content: bulletinComments.content,
          fileUrl: bulletinComments.fileUrl,
          fileName: bulletinComments.fileName,
          replyToId: bulletinComments.replyToId,
          replyToNik: bulletinComments.replyToNik,
          replyToName: bulletinComments.replyToName,
          replyToContent: bulletinComments.replyToContent,
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

      // Strict Universe Isolation: Do not leak GTS comments into TBP or vice-versa
      result = result.filter(c => {
        if (!c.universe) return true; // legacy unassigned
        return c.universe === targetUniverse;
      });

      if (topicTitle || topicId) {
        const qTitle = (topicTitle || '').toLowerCase().trim();
        const qId = (topicId || '').toLowerCase().trim();
        result = result.filter((c) => {
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
      const parsedParam = parseInt(req.params.id, 10);
      const parsedBody = req.body?.postId ? parseInt(String(req.body.postId), 10) : NaN;
      const postId = !isNaN(parsedParam) ? parsedParam : (!isNaN(parsedBody) ? parsedBody : null);

      if (!postId) {
        return res.status(400).json({ 
          status: "error", 
          message: "ID bulletin post tidak valid atau berupa halaman virtual tanpa dokumen fisik terhubung." 
        });
      }

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
        replyToId,
        replyToNik,
        replyToName,
        replyToContent,
        picNik,
        pt
      } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ status: "error", message: "Komentar tidak boleh kosong" });
      }

      // Pastikan dokumen target ada dan warisi universe dari post induk
      const postArray = await db.select().from(bulletinPosts).where(eq(bulletinPosts.id, postId)).limit(1);
      const post = postArray[0];
      if (!post) {
        return res.status(404).json({ 
          status: "error", 
          message: "Dokumen Labnote tidak ditemukan di database." 
        });
      }

      const postUniverse = (post.pt || pt || 'TBP').toUpperCase().includes('GTS') ? 'GTS' : 'TBP';
      const commentUniverse = postUniverse === 'GTS' ? 'GTS' : 'TBP_GPS';
      const derivedSection = section || post.category || post.department || null;

      const inserted = await db.insert(bulletinComments).values({
        postId,
        topicTitle: topicTitle || null,
        topicId: topicId || null,
        section: derivedSection,
        category: category || post.title || null,
        statusUpdate: statusUpdate || null,
        authorNik: authorNik || null,
        authorName: authorName || 'Seseorang',
        content: content.trim(),
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        replyToId: replyToId ? parseInt(String(replyToId)) : null,
        replyToNik: replyToNik || null,
        replyToName: replyToName || null,
        replyToContent: replyToContent || null,
        universe: commentUniverse,
      }).returning();

      const comment = inserted[0];

      // Notification calculation by Section, PIC, and Reply Target
      const postSection = section || post?.category || post?.department || 'Prep & Lab';

      const topicLabel = topicTitle ? `"${topicTitle.length > 35 ? topicTitle.substring(0, 35) + '...' : topicTitle}"` : (post?.title || 'Topik');
      const notifLink = `/bulletin/${postUniverse}?postId=${postId}&topic=${encodeURIComponent(topicTitle || '')}`;

      const notificationsData: any[] = [];
      const isNestedReply = Boolean(replyToId || replyToNik);

      if (isNestedReply) {
        // HANYA masuk ke orang yang membuat komentar utama yang dibalas
        if (replyToNik && replyToNik !== authorNik) {
          notificationsData.push({
            userId: replyToNik,
            role: null, // Pribadi ke pembuat komentar, tidak disebar ke section
            title: `💬 Balasan Komentar Baru`,
            message: `${authorName || 'Personil'} membalas komentar Anda di topik ${topicLabel}: "${content.length > 60 ? content.substring(0, 60) + '...' : content}"`,
            type: 'info',
            link: notifLink,
            isRead: false,
          });
        }
      } else {
        // Komentar Utama Baru: Notifikasi seksi (broadcast) dan notifikasi personal ke PIC / Pembuat Topik
        const notifTitle = statusUpdate
          ? `⚡ Update Status [${postSection}]: ${statusUpdate}`
          : `💬 Komentar Baru [${postSection}]`;

        const cleanSnippet = (content || '').replace(/\n+/g, ' ').trim();
        const displayContent = cleanSnippet.length > 70 ? cleanSnippet.substring(0, 70) + '...' : cleanSnippet;
        const notifMessage = statusUpdate
          ? `${authorName || 'Personil'} mengupdate status topik ${topicLabel} ke "${statusUpdate}".`
          : `${authorName || 'Personil'} berkomentar di topik ${topicLabel}: "${displayContent}"`;

        // 1. Notifikasi Terarah Seksi (Khusus universe post yang bersangkutan)
        const sectionTargets = await getSectionNotificationTargets(postSection, postUniverse);
        const sectionNotifs = sectionTargets
          .filter(t => t.nik && t.nik !== authorNik && t.nik !== post?.authorNik && t.nik !== picNik)
          .map(t => ({
            userId: t.nik,
            role: postSection,
            title: notifTitle,
            message: notifMessage,
            type: statusUpdate ? 'success' : 'info',
            link: notifLink,
            isRead: false,
          }));
        notificationsData.push(...sectionNotifs);

        // 2. Jika pembuat artikel bukan pengirim komentar, kirimkan notifikasi personal
        if (post?.authorNik && post.authorNik !== authorNik) {
          notificationsData.push({
            userId: post.authorNik,
            role: null,
            title: notifTitle,
            message: notifMessage,
            type: statusUpdate ? 'success' : 'info',
            link: notifLink,
            isRead: false,
          });
        }

        // 3. Jika PIC ditentukan dan bukan pengirim komentar / author artikel, kirimkan notifikasi personal
        if (picNik && picNik !== authorNik && picNik !== post?.authorNik) {
          notificationsData.push({
            userId: picNik,
            role: null,
            title: notifTitle,
            message: notifMessage,
            type: statusUpdate ? 'success' : 'info',
            link: notifLink,
            isRead: false,
          });
        }
      }

      if (notificationsData.length > 0) {
        const insertedNotifs = await db.insert(notifications).values(notificationsData).returning();
        const notifsWithSender = insertedNotifs.map((n: any) => ({ ...n, senderNik: authorNik }));
        sendWebPush(notifsWithSender, { senderNik: authorNik, universe: postUniverse });
      }

      res.json({ status: "success", data: comment });
    } catch (error: any) {
      console.error('[Bulletin Comment POST] Error:', error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.delete("/api/bulletin/comments/:commentId/attachment", async (req, res) => {
    try {
      const commentId = parseInt(req.params.commentId);
      const attachmentUrl = (req.query.attachmentUrl as string) || (req.body?.attachmentUrl as string);
      
      const commentArray = await db.select().from(bulletinComments).where(eq(bulletinComments.id, commentId)).limit(1);
      if (commentArray.length === 0) {
        return res.status(404).json({ status: "error", message: "Comment not found" });
      }
      const comment = commentArray[0];

      // If comment.fileUrl is a JSON array with multiple attachments
      if (comment.fileUrl) {
        try {
          const parsed = JSON.parse(comment.fileUrl);
          if (Array.isArray(parsed) && parsed.length > 1) {
            const filtered = parsed.filter((item: any) => {
              const u = item.directUrl || item.url || item.fileUrl;
              return u !== attachmentUrl && item.name !== attachmentUrl;
            });

            if (filtered.length > 0) {
              await db.update(bulletinComments).set({
                fileUrl: JSON.stringify(filtered),
                fileName: filtered[0]?.name || comment.fileName
              }).where(eq(bulletinComments.id, commentId));

              return res.json({ status: "success", action: "attachment_removed", remaining: filtered.length });
            }
          }
        } catch (e) {}
      }

      // Check if comment has meaningful user text or is just auto-generated attachment link
      const content = (comment.content || '').trim();
      const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
      const isPureAttachment = 
        lines.length === 0 ||
        (lines.length === 1 && lines[0].startsWith('📎')) ||
        (lines.length <= 2 && lines.every(l => l.startsWith('📎') || l.toLowerCase().startsWith('caption:')));

      if (isPureAttachment) {
        // Pure attachment comment: delete the comment record
        await db.delete(bulletinComments).where(eq(bulletinComments.id, commentId));
        return res.json({ status: "success", action: "comment_deleted" });
      } else {
        // Has discussion text: keep comment text intact, remove attachment links
        const cleanedLines = lines.filter(l => !l.startsWith('📎'));
        const newContent = cleanedLines.join('\n').trim() || content;

        await db.update(bulletinComments).set({
          fileUrl: null,
          fileName: null,
          content: newContent
        }).where(eq(bulletinComments.id, commentId));

        return res.json({ status: "success", action: "attachment_detached_text_kept" });
      }
    } catch (error: any) {
      console.error('[Delete Attachment Error]', error);
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

  router.put("/api/bulletin/comments/:commentId", async (req, res) => {
    try {
      const commentId = parseInt(req.params.commentId);
      const { content, authorNik } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ status: "error", message: "Konten komentar tidak boleh kosong" });
      }

      const commentArray = await db.select().from(bulletinComments).where(eq(bulletinComments.id, commentId)).limit(1);
      if (commentArray.length === 0) {
        return res.status(404).json({ status: "error", message: "Komentar tidak ditemukan" });
      }
      const comment = commentArray[0];

      if (authorNik && comment.authorNik && comment.authorNik !== authorNik) {
        return res.status(403).json({ status: "error", message: "Hanya pembuat komentar yang dapat mengedit komentar ini" });
      }

      const [updated] = await db.update(bulletinComments)
        .set({ content: content.trim() })
        .where(eq(bulletinComments.id, commentId))
        .returning();

      res.json({ status: "success", comment: updated });
    } catch (error: any) {
      console.error('[Edit Comment Error]', error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

export async function syncBulletinToLogbook(post: any) {
  try {
    if (!post || !post.id || !post.content || typeof post.content !== 'string') return;
    const { parseMarkdownTableRows } = await import("./logbook.js");
    const parsed = parseMarkdownTableRows(post.content);
    if (!parsed || !parsed.rows || parsed.rows.length === 0) return;

    // Detect default cadence from bulletin post title
    const postTitle = (post.title || '').toLowerCase();
    let defaultCadence = 'Daily';
    if (postTitle.includes('non')) defaultCadence = 'Non Routine';
    else if (postTitle.includes('monthly') || postTitle.includes('bulanan')) defaultCadence = 'Monthly';
    else if (postTitle.includes('weekly') || postTitle.includes('mingguan')) defaultCadence = 'Weekly';
    else if (postTitle.includes('quarterly') || postTitle.includes('triwulan')) defaultCadence = 'Quarterly';
    else if (postTitle.includes('biannual') || postTitle.includes('semester')) defaultCadence = 'Biannual';
    else if (postTitle.includes('yearly') || postTitle.includes('annual') || postTitle.includes('tahunan')) defaultCadence = 'Yearly';

    // Calculate default targetDate based on cadence
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    let defaultTargetDate = todayStr;
    if (defaultCadence === 'Monthly') {
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      defaultTargetDate = `${lastDayOfMonth.getFullYear()}-${String(lastDayOfMonth.getMonth() + 1).padStart(2, '0')}-${String(lastDayOfMonth.getDate()).padStart(2, '0')}`;
    } else if (defaultCadence === 'Weekly') {
      const day = now.getDay() || 7;
      const sunday = new Date(now);
      sunday.setDate(now.getDate() + (7 - day));
      defaultTargetDate = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
    }

    // Find all existing logbook tasks connected to this bulletin post
    const linkedTasks = await db
      .select()
      .from(logbookTasks)
      .where(eq(logbookTasks.bulletinPostId, post.id));

    // Fetch employee lookup list to map rowPic to full name and NIK
    const allEmployees = await db
      .select({ nik: employees.nik, name: employees.name })
      .from(employees);

    const findEmployee = (query: string) => {
      if (!query || query.trim() === '' || query.trim() === '-') return null;
      // Strip academic degrees like , ST or , S.T.
      const cleanQ = query.replace(/,\s*[a-z\.]+$/i, '').trim().toLowerCase();
      const q = query.trim().toLowerCase();
      // Priority 1: Exact NIK match
      const byNik = allEmployees.find(e => e.nik && (e.nik.toLowerCase() === q || e.nik.toLowerCase() === cleanQ));
      if (byNik) return byNik;
      // Priority 2: Exact full name match
      const byExact = allEmployees.find(e => e.name && (e.name.toLowerCase() === q || e.name.toLowerCase() === cleanQ));
      if (byExact) return byExact;
      // Priority 3: Word boundary / startsWith match
      if (cleanQ.length >= 3) {
        return allEmployees.find(e => {
          const name = (e.name || '').toLowerCase();
          const words = name.split(/\s+/);
          return words.includes(cleanQ) || name.startsWith(cleanQ) || cleanQ.startsWith(name);
        });
      }
      return null;
    };

    // Clean up any orphaned subtask rows starting with ↳ for this bulletin post
    try {
      await db.delete(logbookTasks).where(and(eq(logbookTasks.bulletinPostId, post.id), sql`title LIKE '↳%'`));
    } catch (e) {}

    // Cutoff: Hanya sinkronisasikan data di labnote yang dibuat sejak fitur log book dibuat (2026-09-25)
    const LOGBOOK_FEATURE_START_DATE = '2026-09-25';

    // Group rows into parent activities and their nested sub-items
    interface GroupedBulletinRow {
      parentRow: Record<string, string>;
      subRows: Array<Record<string, string>>;
    }
    const groupedRows: GroupedBulletinRow[] = [];
    let currentGroup: GroupedBulletinRow | null = null;

    for (const r of parsed.rows) {
      let rTitle = '';
      Object.keys(r).forEach(k => {
        const kl = k.toLowerCase().trim();
        if (kl.includes('jenis kegiatan') || kl === 'task' || kl === 'judul') {
          rTitle = (r[k] || '').trim();
        }
      });
      const isSub = rTitle.startsWith('↳') || rTitle.startsWith('->') || rTitle.startsWith('↪') || rTitle.startsWith('– ') || rTitle.startsWith('- ') || r['isSubItem'] === 'true' || (r['isSubItem'] as any) === true || r['parentId'];

      if (isSub && currentGroup) {
        currentGroup.subRows.push(r);
      } else if (!isSub && rTitle && rTitle !== '-' && rTitle.length >= 2) {
        currentGroup = {
          parentRow: r,
          subRows: []
        };
        groupedRows.push(currentGroup);
      }
    }

    for (const group of groupedRows) {
      const r = group.parentRow;
      let rTitle = '';
      let rowDesc = '';
      let rowStatus = 'Open';
      let rowPriority = 'Normal';
      let rowPic = '';
      let rowActivity = '';
      let rowPeriod = '';
      let rowKategori = '';
      let rowCreatedTime = '';

      Object.keys(r).forEach(k => {
        const kl = k.toLowerCase().trim();
        if (kl.includes('jenis kegiatan') || kl === 'task' || kl === 'judul') {
          rTitle = (r[k] || '').trim();
        } else if (kl.includes('keterangan') || kl.includes('catatan') || kl.includes('deskripsi')) {
          rowDesc = r[k] || '';
        } else if (kl.includes('status')) {
          rowStatus = r[k] || 'Open';
        } else if (kl.includes('priority') || kl.includes('prioritas')) {
          rowPriority = r[k] || 'Normal';
        } else if (kl === 'pic' || kl.includes('assignee')) {
          rowPic = (r[k] || '').trim();
        } else if (kl.includes('activity') || kl.includes('aktivitas')) {
          rowActivity = (r[k] || '').trim();
        } else if (kl.includes('period') || kl.includes('periode')) {
          rowPeriod = (r[k] || '').trim();
        } else if (kl.includes('kategori') || kl.includes('seksi') || kl.includes('section')) {
          rowKategori = (r[k] || '').trim();
        } else if (kl.includes('created time') || kl === 'created' || kl === 'tanggal' || kl === 'date' || kl.includes('created_time')) {
          rowCreatedTime = (r[k] || '').trim();
        }
      });

      if (!rTitle || rTitle === '-' || rTitle.length < 2) continue;

      // Filter: Hanya sinkronisasikan data yang dibuat sejak fitur log book dibuat
      let rowCreatedDate = '';
      const dateMatch = rowCreatedTime.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatch) {
        rowCreatedDate = dateMatch[1];
      } else if (post.createdAt) {
        try {
          rowCreatedDate = new Date(post.createdAt).toISOString().split('T')[0];
        } catch (e) {}
      }

      // Jika tanggal pembuatan baris/postingan sebelum fitur logbook dibuat, abaikan sinkronisasi
      if (rowCreatedDate && rowCreatedDate < LOGBOOK_FEATURE_START_DATE) {
        continue;
      }

      // Normalize legacy subtask tags in rowDesc to canonical markdown checkboxes
      let cleanDesc = rowDesc;
      if (cleanDesc && (cleanDesc.includes('**(Done)**') || cleanDesc.includes('**(OPEN)**') || cleanDesc.includes('**(Closed)**') || cleanDesc.includes('**(OP)**'))) {
        cleanDesc = cleanDesc
          .replace(/^[-*•]?\s*(.+?)\s*\*\*\(?(Done|Closed|Close|Finish|Selesai|CL)\)?\*\*\s*$/gim, '- [x] $1')
          .replace(/^[-*•]?\s*(.+?)\s*\*\*\(?(Open|OP|Belum|In Progress|Pending)\)?\*\*\s*$/gim, '- [ ] $1');
      }
      cleanDesc = cleanDesc.replace(/^[•*]\s*\[([ xX])\]/gm, '- [$1]');

      // Attach nested sub-items as markdown checklist in description
      if (group.subRows.length > 0) {
        const subtaskList = group.subRows.map(sr => {
          let sTitle = '';
          Object.keys(sr).forEach(k => {
            const kl = k.toLowerCase().trim();
            if (kl.includes('jenis kegiatan') || kl === 'task' || kl === 'judul') {
              sTitle = (sr[k] || '').trim();
            }
          });
          const cleanNoArrow = sTitle.replace(/^↳\s*/, '').trim();
          const isChecked = cleanNoArrow.startsWith('[x]') || cleanNoArrow.startsWith('[X]') || (sr['Status'] || '').toLowerCase() === 'closed';
          const cleanText = cleanNoArrow.replace(/^\[[ xX]\]\s*/, '').trim();
          return `- [${isChecked ? 'x' : ' '}] ${cleanText}`;
        }).join('\n');

        if (cleanDesc && cleanDesc !== '-') {
          cleanDesc = `${cleanDesc}\n${subtaskList}`;
        } else {
          cleanDesc = subtaskList;
        }

        // Auto compute status from subtasks
        const totalSubs = group.subRows.length;
        const closedSubs = group.subRows.filter(sr => {
          const sTitle = (sr['Jenis Kegiatan'] || sr['Jenis kegiatan'] || '').trim();
          return sTitle.includes('[x]') || (sr['Status'] || '').toLowerCase() === 'closed';
        }).length;

        if (closedSubs === totalSubs && totalSubs > 0) {
          rowStatus = 'Closed';
        } else if (closedSubs > 0) {
          rowStatus = 'On Progress';
        }
      }

      // Determine effective cadence - ALWAYS prioritize Non-Routine if specified
      let effectiveCadence = defaultCadence;
      const combinedAct = `${rowActivity} ${rowPeriod}`.toLowerCase();
      if (combinedAct.includes('non') || rowActivity.toLowerCase().includes('non') || defaultCadence === 'Non Routine') {
        effectiveCadence = 'Non Routine';
      } else if (combinedAct.includes('monthly') || combinedAct.includes('bulanan')) {
        effectiveCadence = 'Monthly';
      } else if (combinedAct.includes('weekly') || combinedAct.includes('mingguan')) {
        effectiveCadence = 'Weekly';
      } else if (combinedAct.includes('daily') || combinedAct.includes('harian')) {
        effectiveCadence = 'Daily';
      } else if (combinedAct.includes('quarterly') || combinedAct.includes('triwulan')) {
        effectiveCadence = 'Quarterly';
      } else if (combinedAct.includes('biannual') || combinedAct.includes('semester')) {
        effectiveCadence = 'Biannual';
      } else if (combinedAct.includes('yearly') || combinedAct.includes('tahunan')) {
        effectiveCadence = 'Yearly';
      }

      // Determine effective section
      let rowSection = post.department || 'General';
      const katLower = rowKategori.toLowerCase().trim();
      if (katLower.includes('qa') || katLower.includes('quality') || katLower.includes('mutu') || postTitle.includes('mutu') || postTitle.includes('qa') || postTitle.includes('quality')) {
        rowSection = 'Quality Assurance';
      } else if (katLower.includes('prep') || katLower.includes('preparasi')) {
        rowSection = 'Preparation';
      } else if (katLower.includes('lab')) {
        rowSection = 'Laboratory';
      } else if (katLower.includes('maint')) {
        rowSection = 'Maintenance';
      } else if (rowSection === 'Prep & Lab') {
        if (postTitle.includes('lab')) rowSection = 'Laboratory';
        else if (postTitle.includes('prep')) rowSection = 'Preparation';
      }

      const matchedEmp = findEmployee(rowPic);
      const targetAssigneeNik = matchedEmp ? matchedEmp.nik : (rowPic && rowPic !== '-' ? rowPic : 'ALL');
      const targetAssigneeName = rowPic && rowPic !== '-' ? rowPic : (matchedEmp ? matchedEmp.name : 'Personil');

      const existingTask = linkedTasks.find(t => {
        const taskTopic = (t.bulletinTopicTitle || t.title || '').toLowerCase().trim();
        const cleanR = rTitle.toLowerCase().trim();
        return taskTopic === cleanR || (taskTopic.length >= 4 && cleanR.length >= 4 && (taskTopic.startsWith(cleanR) || cleanR.startsWith(taskTopic)));
      });

      if (existingTask) {
        // Update existing task
        const updatePayload: any = {};
        if (cleanDesc && cleanDesc !== '-' && cleanDesc !== existingTask.description) {
          updatePayload.description = cleanDesc;
        }
        if (rowStatus && rowStatus !== existingTask.status) {
          updatePayload.status = rowStatus;
        }
        if (rowPriority && rowPriority !== existingTask.priority) {
          updatePayload.priority = rowPriority;
        }
        if (effectiveCadence && existingTask.activityType !== effectiveCadence) {
          updatePayload.activityType = effectiveCadence;
        }
        if (rowSection && rowSection !== 'Prep & Lab' && existingTask.section !== rowSection) {
          updatePayload.section = rowSection;
        }
        if (effectiveCadence === 'Non Routine') {
          if (!existingTask.plannedDate) {
            updatePayload.plannedDate = todayStr;
          }
          if (!existingTask.taskDate) {
            updatePayload.taskDate = todayStr;
          }
        }
        if (rowPic && rowPic !== '-' && (existingTask.assigneeName !== targetAssigneeName || existingTask.assigneeNik !== targetAssigneeNik)) {
          updatePayload.assigneeName = targetAssigneeName;
          updatePayload.assigneeNik = targetAssigneeNik;
        }
        if (Object.keys(updatePayload).length > 0) {
          await db
            .update(logbookTasks)
            .set(updatePayload)
            .where(eq(logbookTasks.id, existingTask.id));
          console.log(`[Sync Buletin -> Logbook] Updated task #${existingTask.id} (${existingTask.title}) from bulletin #${post.id}`);
        }
      } else {
        // Auto-create new logbook task for newly added bulletin row
        try {
          const inserted = await db.insert(logbookTasks).values({
            title: rTitle,
            description: cleanDesc || '',
            section: rowSection,
            assigneeNik: targetAssigneeNik,
            assigneeName: targetAssigneeName,
            assignedByNik: post.authorNik || 'SYSTEM',
            assignedByName: post.authorName || 'Buletin',
            priority: rowPriority || 'Normal',
            activityType: effectiveCadence,
            status: rowStatus || 'Open',
            progressPercent: 0,
            taskDate: todayStr,
            plannedDate: effectiveCadence === 'Non Routine' ? todayStr : null,
            targetDate: defaultTargetDate,
            targetTime: '23:59',
            pt: post.pt || 'TBP',
            universe: (post.pt || 'TBP').toUpperCase().includes('GTS') ? 'GTS' : 'TBP_GPS',
            bulletinPostId: post.id,
            bulletinTopicTitle: rTitle
          }).returning();
          console.log(`[Sync Buletin -> Logbook] Auto-created new task #${inserted[0]?.id} (${rTitle}) from bulletin #${post.id}`);
        } catch (insertErr) {
          console.warn(`[Sync Buletin -> Logbook] Failed to insert new task for "${rTitle}":`, insertErr);
        }
      }
    }
  } catch (err) {
    console.warn("[Sync Buletin -> Logbook] Failed to sync:", err);
  }
}

router.put("/api/bulletin/:id", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ status: "error", message: "ID dokumen tidak valid." });
      }
      const sanitized = sanitizePayload(bulletinPosts, req.body) || {};
      delete sanitized.id;
      if (sanitized.pt) {
        sanitized.universe = sanitized.pt === 'GTS' ? 'GTS' : 'TBP_GPS';
      }
      const result = await db.update(bulletinPosts).set(sanitized).where(eq(bulletinPosts.id, postId)).returning();
      const post = result[0];
      clearBulletinCache();
      if (post) {
        await syncBulletinToAgenda(post);
        await syncBulletinToLogbook(post);
      }
      res.json({ status: "success", data: post });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.post("/api/bulletin/move-topic", async (req, res) => {
    try {
      const { fromPostId, toPostId, topicTitle, newTopicTitle, targetCadence, targetSubPeriod } = req.body;
      if (!fromPostId || !toPostId || !topicTitle) {
        return res.status(400).json({ status: "error", message: "Missing required fields (fromPostId, toPostId, topicTitle)" });
      }

      const fromId = parseInt(fromPostId);
      const toId = parseInt(toPostId);
      const cleanTitle = String(topicTitle).trim();
      const targetTitle = String(newTopicTitle || topicTitle).trim();

      // Fetch all comments from this topic to update accurately
      const commentsToMove = await db
        .select()
        .from(bulletinComments)
        .where(
          and(
            eq(bulletinComments.postId, fromId),
            or(
              eq(bulletinComments.topicTitle, cleanTitle),
              like(bulletinComments.topicTitle, `${cleanTitle} - %`)
            )
          )
        );

      for (const c of commentsToMove) {
        let updatedTitle = c.topicTitle;
        if (c.topicTitle === cleanTitle) {
          // No subperiod suffix yet
          if (targetSubPeriod && String(targetSubPeriod).trim()) {
            updatedTitle = `${targetTitle} - ${String(targetSubPeriod).trim()}`;
          } else {
            updatedTitle = targetTitle;
          }
        } else if (c.topicTitle.startsWith(`${cleanTitle} - `)) {
          // Already has a subperiod suffix: replace cleanTitle prefix with targetTitle
          const suffix = c.topicTitle.slice(`${cleanTitle} - `.length);
          updatedTitle = `${targetTitle} - ${suffix}`;
        }
        await db
          .update(bulletinComments)
          .set({ postId: toId, topicTitle: updatedTitle })
          .where(eq(bulletinComments.id, c.id));
      }

      // Repoint connected Logbook tasks so that their bulletin connection follows to the new post
      try {
        const updateTaskPayload: any = {
          bulletinPostId: toId,
          bulletinTopicTitle: targetTitle
        };
        if (targetCadence) {
          updateTaskPayload.activityType = targetCadence;
        }

        await db
          .update(logbookTasks)
          .set(updateTaskPayload)
          .where(
            and(
              eq(logbookTasks.bulletinPostId, fromId),
              or(
                eq(logbookTasks.bulletinTopicTitle, cleanTitle),
                eq(logbookTasks.title, cleanTitle)
              )
            )
          );
      } catch (logbookErr) {
        console.warn("[MoveTopic] Error updating linked logbook tasks:", logbookErr);
      }

      res.json({ status: "success", message: "Topic comments and linked logbook tasks successfully moved" });
    } catch (err: any) {
      console.error("[MoveTopic] Error migrating comments:", err);
      res.status(500).json({ status: "error", message: err.message || "Failed to move topic comments" });
    }
  });

router.post("/api/bulletin/rename-topic", async (req, res) => {
    try {
      const { postId, oldTopicTitle, newTopicTitle, topicId } = req.body;
      if (!oldTopicTitle || !newTopicTitle) {
        return res.status(400).json({ status: "error", message: "Missing oldTopicTitle or newTopicTitle" });
      }

      const cleanOld = String(oldTopicTitle).trim();
      const cleanNew = String(newTopicTitle).trim();
      if (cleanOld.toLowerCase() === cleanNew.toLowerCase()) {
        return res.json({ status: "success", message: "Titles are identical, no update needed", updatedCount: 0 });
      }

      const pId = postId ? parseInt(String(postId), 10) : null;
      const cleanOldBase = cleanOld.replace(/^[↳↪\s]+/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\[[ xX]\]\s*/, '').trim();
      const cleanNewBase = cleanNew.replace(/^[↳↪\s]+/, '').replace(/<!--[\s\S]*?-->/g, '').replace(/\[[ xX]\]\s*/, '').trim();

      const titleOrFilters = [
        eq(bulletinComments.topicTitle, cleanOld),
        eq(bulletinComments.topicTitle, cleanOldBase),
        like(bulletinComments.topicTitle, `${cleanOld} - %`),
        like(bulletinComments.topicTitle, `${cleanOldBase} - %`),
        ilike(bulletinComments.topicTitle, `%${cleanOldBase}%`),
        ilike(bulletinComments.topicTitle, `%${cleanOld}%`),
        ilike(bulletinComments.topicId, `%${cleanOldBase}%`)
      ];
      if (topicId) {
        titleOrFilters.push(eq(bulletinComments.topicId, String(topicId).trim()));
        titleOrFilters.push(ilike(bulletinComments.topicId, `%${String(topicId).trim()}%`));
      }

      const whereClause = pId && !isNaN(pId)
        ? and(eq(bulletinComments.postId, pId), or(...titleOrFilters))
        : or(...titleOrFilters);

      const commentsToUpdate = await db
        .select()
        .from(bulletinComments)
        .where(whereClause);

      for (const c of commentsToUpdate) {
        const rawTitle = c.topicTitle || '';
        // Check if comment title has sub-arrow (↳ or ↪)
        const hasSubArrow = /^[↳↪]\s*/.test(rawTitle);
        // Extract any HTML comments like <!--origin-id:593--> or <!--task-id:...-->
        const htmlCommentsMatch = rawTitle.match(/<!--[\s\S]*?-->/g);
        const metaTags = htmlCommentsMatch ? htmlCommentsMatch.join(' ') : '';
        // Extract any sub-period suffix like " - 15 Okt 2026"
        const cleanCTitle = rawTitle.replace(/^[↳↪\s]+/, '').replace(/<!--[\s\S]*?-->/g, '').trim();
        const suffixMatch = cleanCTitle.match(/\s+-\s+([^-]+)$/);

        let updatedCore = cleanNewBase;
        if (suffixMatch) {
          updatedCore = `${cleanNewBase} - ${suffixMatch[1].trim()}`;
        }
        let updatedTitle = updatedCore;
        if (metaTags) {
          updatedTitle = `${updatedTitle} ${metaTags}`;
        }
        if (hasSubArrow) {
          updatedTitle = `↳ ${updatedTitle}`;
        }

        let updatedTopicId = c.topicId || '';
        const oldSlug = cleanOldBase.toLowerCase().replace(/\s+/g, '-');
        const newSlug = cleanNewBase.toLowerCase().replace(/\s+/g, '-');
        if (oldSlug && updatedTopicId.includes(oldSlug)) {
          updatedTopicId = updatedTopicId.replace(oldSlug, newSlug);
        } else if (!updatedTopicId || updatedTopicId === c.topicTitle) {
          updatedTopicId = updatedTitle.toLowerCase().replace(/\s+/g, '-');
        }

        await db
          .update(bulletinComments)
          .set({
            topicTitle: updatedTitle,
            topicId: updatedTopicId
          })
          .where(eq(bulletinComments.id, c.id));
      }

      // Repoint connected Logbook tasks
      try {
        const logbookConditions = [
          eq(logbookTasks.bulletinTopicTitle, cleanOld),
          eq(logbookTasks.bulletinTopicTitle, cleanOldBase),
          eq(logbookTasks.title, cleanOldBase)
        ];
        const logbookWhere = pId && !isNaN(pId)
          ? and(eq(logbookTasks.bulletinPostId, pId), or(...logbookConditions))
          : or(...logbookConditions);

        await db
          .update(logbookTasks)
          .set({
            bulletinTopicTitle: cleanNewBase,
            title: cleanNewBase
          })
          .where(logbookWhere);
      } catch (lErr) {
        console.warn("[RenameTopic] Error updating logbook tasks:", lErr);
      }

      res.json({
        status: "success",
        message: `Successfully migrated ${commentsToUpdate.length} comments from "${cleanOldBase}" to "${cleanNewBase}"`,
        updatedCount: commentsToUpdate.length
      });
    } catch (err: any) {
      console.error("[RenameTopic] Error migrating comments:", err);
      res.status(500).json({ status: "error", message: err.message || "Failed to rename topic comments" });
    }
  });

router.delete("/api/bulletin/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ status: "error", message: "ID dokumen tidak valid." });
      }
      // Hapus data dependen terlebih dahulu untuk mencegah pelanggaran foreign key constraint
      await db.delete(agendaEvents).where(eq(agendaEvents.bulletinPostId, id));
      await db.delete(bulletinComments).where(eq(bulletinComments.postId, id));
      await db.delete(logbookTasks).where(eq(logbookTasks.bulletinPostId, id));
      await db.delete(bulletinPosts).where(eq(bulletinPosts.id, id));
      clearBulletinCache();
      res.json({ status: "success" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

// Direct streaming proxy for Google Drive files (prevents CORS & broken thumbnails)
router.get("/api/drive/view/:fileId", async (req, res) => {
  try {
    const fileId = req.params.fileId;
    if (!fileId || fileId.length < 5 || !/^[a-zA-Z0-9_\-]+$/.test(fileId)) {
      return res.status(400).send("Invalid file ID format");
    }

    // 1. Try streaming via Drive SDK if OAuth configured
    try {
      let mimeType = 'image/jpeg';
      try {
        const meta = await drive.files.get({ fileId, fields: 'mimeType, name, size', supportsAllDrives: true });
        if (meta?.data?.mimeType) mimeType = meta.data.mimeType;
        if (meta?.data?.name?.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
      } catch (e) {}

      // Auto ensure file is public
      drive.permissions.create({
        fileId,
        supportsAllDrives: true,
        requestBody: { role: 'reader', type: 'anyone' }
      }).catch(() => {});

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

      const streamRes = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' }
      );

      return streamRes.data.pipe(res);
    } catch (sdkErr) {
      // 2. Fallback: Stream directly from Google Drive public CDN
      const publicUrls = [
        `https://lh3.googleusercontent.com/d/${fileId}`,
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`,
        `https://drive.google.com/uc?export=view&id=${fileId}`
      ];

      for (const pUrl of publicUrls) {
        try {
          const fetchRes = await fetch(pUrl);
          if (fetchRes.ok) {
            let contentType = fetchRes.headers.get('content-type') || 'image/jpeg';
            const arrayBuf = await fetchRes.arrayBuffer();
            const buf = Buffer.from(arrayBuf);
            if (buf.subarray(0, 5).toString('ascii') === '%PDF-') {
              contentType = 'application/pdf';
            }
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
            return res.send(buf);
          }
        } catch (e) {}
      }

      throw new Error("All Drive fetch strategies failed");
    }
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

    const customFilename = req.query.filename ? String(req.query.filename).trim() : null;
    let fileName = customFilename || 'laporan-inspeksi.pdf';
    let mimeType = 'application/pdf';

    try {
      const meta = await drive.files.get({ fileId, fields: 'mimeType, name, size', supportsAllDrives: true });
      if (meta?.data?.name && !customFilename) fileName = meta.data.name;
      if (meta?.data?.mimeType) mimeType = meta.data.mimeType;
    } catch (e) {}

    // Ensure filename ends with .pdf if file is PDF or generic binary
    if (!fileName.toLowerCase().endsWith('.pdf') && (mimeType === 'application/pdf' || mimeType === 'application/octet-stream')) {
      fileName += '.pdf';
    }

    const safeAsciiName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${safeAsciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);

    try {
      const streamRes = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' }
      );
      return streamRes.data.pipe(res);
    } catch (sdkErr) {
      // Fallback: Direct download stream from Google Drive public endpoint
      const fetchRes = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
      if (fetchRes.ok) {
        const arrayBuf = await fetchRes.arrayBuffer();
        return res.send(Buffer.from(arrayBuf));
      }
      throw sdkErr;
    }
  } catch (err: any) {
    console.error(`[Drive Proxy Download] Error streaming file ${req.params.fileId}:`, err.message);
    res.status(404).send("File not found or inaccessible");
  }
});

// ----------------------------------------------------
// Recycle Bin & Activity Deletion Audit Trail Endpoints
// ----------------------------------------------------

async function initRecycleBinTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bulletin_recycle_bin (
        id SERIAL PRIMARY KEY,
        post_id INTEGER,
        post_title TEXT,
        section TEXT,
        task_title TEXT NOT NULL,
        row_data TEXT NOT NULL,
        subtasks_data TEXT,
        subtask_count INTEGER DEFAULT 0,
        deleted_by_nik TEXT NOT NULL,
        deleted_by_name TEXT NOT NULL,
        deleted_by_jabatan TEXT,
        deleted_at TIMESTAMP DEFAULT NOW(),
        restore_status TEXT DEFAULT 'DELETED',
        restored_at TIMESTAMP,
        restored_by_nik TEXT,
        restored_by_name TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_bulletin_recycle_post_id ON bulletin_recycle_bin(post_id);
      CREATE INDEX IF NOT EXISTS idx_bulletin_recycle_deleted_at ON bulletin_recycle_bin(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_bulletin_recycle_status ON bulletin_recycle_bin(restore_status);
    `);
  } catch (err: any) {
    console.warn('[RecycleBin] Error initializing table:', err.message);
  }
}
initRecycleBinTable();

export function sanitizeRecycleTaskTitle(title: string): string {
  if (!title) return "Kegiatan Tanpa Judul";
  const cleaned = title
    .replace(/^[↳↪\s]+/, '')
    .replace(/^\[[ xX]\]\s*/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!-?[a-zA-Z0-9_\-\s]+.*?>?/g, '')
    .replace(/<!--.*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || "Kegiatan Tanpa Judul";
}

// 1. POST /api/bulletin/recycle-bin - Log deleted activities
router.post("/api/bulletin/recycle-bin", async (req, res) => {
  try {
    const { items, deletedByNik, deletedByName, deletedByJabatan } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ status: "error", message: "No items provided" });
    }

    const inserted = [];
    for (const item of items) {
      const { postId, postTitle, section, taskTitle, rowData, subtasksData, subtaskCount } = item;
      const resItem = await db.insert(bulletinRecycleBin).values({
        postId: postId ? parseInt(String(postId)) : null,
        postTitle: postTitle || null,
        section: section || null,
        taskTitle: sanitizeRecycleTaskTitle(String(taskTitle || "")),
        rowData: typeof rowData === "string" ? rowData : JSON.stringify(rowData || {}),
        subtasksData: subtasksData ? (typeof subtasksData === "string" ? subtasksData : JSON.stringify(subtasksData)) : null,
        subtaskCount: typeof subtaskCount === "number" ? subtaskCount : (Array.isArray(subtasksData) ? subtasksData.length : 0),
        deletedByNik: String(deletedByNik || "UNKNOWN"),
        deletedByName: String(deletedByName || "Unknown User"),
        deletedByJabatan: deletedByJabatan || null,
        deletedAt: new Date(),
        restoreStatus: "DELETED",
      }).returning();
      if (resItem[0]) inserted.push(resItem[0]);
    }

    res.json({ status: "success", count: inserted.length, data: inserted });
  } catch (err: any) {
    console.error("[RecycleBin] Error logging deleted items:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 2. GET /api/bulletin/recycle-bin - List deleted activities for Developer
router.get("/api/bulletin/recycle-bin", async (req, res) => {
  try {
    const { postId, status, pt } = req.query;
    const conditions = [];
    if (postId) {
      conditions.push(eq(bulletinRecycleBin.postId, parseInt(String(postId))));
    }
    if (status) {
      conditions.push(eq(bulletinRecycleBin.restoreStatus, String(status)));
    }
    if (pt) {
      const ptUpper = String(pt).toUpperCase();
      if (ptUpper === 'GTS') {
        conditions.push(eq(bulletinPosts.pt, 'GTS'));
      } else if (ptUpper === 'TBP' || ptUpper === 'GPS' || ptUpper === 'TBP_GPS') {
        conditions.push(or(
          eq(bulletinPosts.pt, 'TBP'),
          eq(bulletinPosts.pt, 'GPS'),
          eq(bulletinPosts.pt, 'TBP_GPS'),
          isNull(bulletinPosts.pt)
        ));
      }
    }

    const query = db
      .select({
        id: bulletinRecycleBin.id,
        postId: bulletinRecycleBin.postId,
        postTitle: bulletinRecycleBin.postTitle,
        section: bulletinRecycleBin.section,
        taskTitle: bulletinRecycleBin.taskTitle,
        rowData: bulletinRecycleBin.rowData,
        subtasksData: bulletinRecycleBin.subtasksData,
        subtaskCount: bulletinRecycleBin.subtaskCount,
        deletedByNik: bulletinRecycleBin.deletedByNik,
        deletedByName: bulletinRecycleBin.deletedByName,
        deletedByJabatan: bulletinRecycleBin.deletedByJabatan,
        deletedAt: bulletinRecycleBin.deletedAt,
        restoreStatus: bulletinRecycleBin.restoreStatus,
        restoredAt: bulletinRecycleBin.restoredAt,
        restoredByNik: bulletinRecycleBin.restoredByNik,
        restoredByName: bulletinRecycleBin.restoredByName,
      })
      .from(bulletinRecycleBin)
      .leftJoin(bulletinPosts, eq(bulletinRecycleBin.postId, bulletinPosts.id));

    const records = conditions.length > 0 
      ? await query.where(and(...conditions)).orderBy(desc(bulletinRecycleBin.deletedAt)).limit(100)
      : await query.orderBy(desc(bulletinRecycleBin.deletedAt)).limit(100);

    const sanitizedRecords = records.map(r => ({
      ...r,
      taskTitle: sanitizeRecycleTaskTitle(r.taskTitle)
    }));
    res.json({ status: "success", data: sanitizedRecords });
  } catch (err: any) {
    console.error("[RecycleBin] Error fetching recycle bin:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 3. POST /api/bulletin/recycle-bin/:id/restore - Restore an activity back to its post
router.post("/api/bulletin/recycle-bin/:id/restore", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { restoredByNik, restoredByName } = req.body;

    const binItemArr = await db.select().from(bulletinRecycleBin).where(eq(bulletinRecycleBin.id, id)).limit(1);
    if (!binItemArr || binItemArr.length === 0) {
      return res.status(404).json({ status: "error", message: "Item not found in recycle bin" });
    }
    const binItem = binItemArr[0];
    if (binItem.restoreStatus === "RESTORED") {
      return res.status(400).json({ status: "error", message: "Item already restored" });
    }

    if (!binItem.postId) {
      return res.status(400).json({ status: "error", message: "Cannot restore item without postId" });
    }

    const postArr = await db.select().from(bulletinPosts).where(eq(bulletinPosts.id, binItem.postId)).limit(1);
    if (!postArr || postArr.length === 0) {
      return res.status(404).json({ status: "error", message: "Target bulletin post no longer exists" });
    }
    const post = postArr[0];

    const { parseMarkdownTableRows, serializeMarkdownTable } = await import("./logbook.js");
    const parsed = parseMarkdownTableRows(post.content || "");
    if (!parsed) {
      return res.status(400).json({ status: "error", message: "Target post does not contain a valid markdown table" });
    }

    let parsedRow: Record<string, string> = {};
    try {
      parsedRow = JSON.parse(binItem.rowData);
    } catch {}

    let parsedSubtasks: Record<string, string>[] = [];
    if (binItem.subtasksData) {
      try {
        parsedSubtasks = JSON.parse(binItem.subtasksData);
      } catch {}
    }

    // Append parsedRow and parsedSubtasks to the table
    const targetHeaders = parsed.headers;
    const newRows = [...parsed.rows, parsedRow, ...parsedSubtasks];

    // Re-index number column
    const reindexed = newRows.map((r, idx) => ({
      ...r,
      Number: String(idx + 1),
      number: String(idx + 1),
      No: String(idx + 1),
      no: String(idx + 1)
    }));

    const newMarkdown = serializeMarkdownTable(targetHeaders, reindexed, parsed.beforeText, parsed.afterText);

    // Update post content
    await db.update(bulletinPosts).set({ content: newMarkdown }).where(eq(bulletinPosts.id, post.id));

    // Update recycle bin record status
    await db.update(bulletinRecycleBin).set({
      restoreStatus: "RESTORED",
      restoredAt: new Date(),
      restoredByNik: restoredByNik || null,
      restoredByName: restoredByName || null
    }).where(eq(bulletinRecycleBin.id, id));

    res.json({
      status: "success",
      message: `Activity "${binItem.taskTitle}" successfully restored!`,
      restoredPostId: post.id,
      newContent: newMarkdown
    });
  } catch (err: any) {
    console.error("[RecycleBin] Error restoring item:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

