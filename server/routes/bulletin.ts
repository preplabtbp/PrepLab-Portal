import { Router } from "express";
import { db } from "../../src/db/index.js";
import { eq, desc, or, inArray, isNull, and, gte, lte, sql, like } from "drizzle-orm";
import { 
  chatMessages, employees, equipments, workOrders, users, tickets, downtime, 
  spareparts, apdSettings, apdHistory, apdDocuments, roster, inspections, 
  pemantauan, questions, agendaEvents, privateNotes, userThemes, bulletinPosts, 
  notifications, bulletinComments, uploadedFiles, appSettings, pelanggaran, 
  mealReports, pushSubscriptions, quizQuestions, preplabCloudLogs, quizScores, induksi,
  logbookTasks
} from "../../src/db/schema.js";
import { generatePdfFromTemplate, drive } from '../../google-services.js';
import { 
  sendWebPush, getUniverse, uploadFileToDrive, syncBulletinToAgenda, 
  getNotificationTargets, getSectionNotificationTargets, getTableObj, sanitizePayload 
} from "../utils.js";
import webpush from 'web-push';
import path from "path";

export const router = Router();

router.get("/api/bulletin", async (req, res) => {
    try {
      let { pt, nik, page, limit } = req.query as { pt?: string; nik?: string; page?: string; limit?: string };
      
      const isSuperUser = nik === '02D24000043' || nik === '02D25000055' || nik === 'M0403240177' || nik === 'preplabadmin';
      
      const conditions: any[] = [];
      
      // If pt === 'ALL' or (isSuperUser and no pt specified), return all bulletin posts
      if (pt === 'ALL' || (isSuperUser && !pt)) {
        console.log('[Bulletin API] Unrestricted access granted for user:', nik, 'pt:', pt);
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

      if (pageNum && limitNum) {
        const totalQuery = conditions.length > 0 
          ? db.select({ count: sql<number>`count(*)` }).from(bulletinPosts).where(and(...conditions))
          : db.select({ count: sql<number>`count(*)` }).from(bulletinPosts);
        const totalRes = await totalQuery;
        const total = Number(totalRes[0]?.count || 0);

        const data = await (baseQuery as any)
          .orderBy(desc(bulletinPosts.createdAt))
          .limit(limitNum)
          .offset((pageNum - 1) * limitNum);

        console.log('[Bulletin API] Returning paginated', data.length, 'posts of', total, 'for pt:', pt, 'page:', pageNum);
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
      
      const data = await (baseQuery as any).orderBy(bulletinPosts.createdAt);
      console.log('[Bulletin API] Returning', data.length, 'posts for pt:', pt, 'nik:', nik);
      res.json({ status: "success", data });
    } catch (error: any) {
      console.error('[Bulletin API] Error:', error.message);
      res.status(500).json({ status: "error", message: error.message });
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

router.post("/api/bulletin", async (req, res) => {
    try {
      const newPostData = req.body;
      if (!newPostData.pt) newPostData.pt = 'TBP';
      
      const result = await db.insert(bulletinPosts).values(newPostData).returning();
      const post = result[0];
      
      // Sync to agenda if there is an agendaDate
      await syncBulletinToAgenda(post);
      
      const dept = post.department || 'General';
      const postUniverse = (post.pt || 'TBP').toUpperCase().includes('GTS') ? 'GTS' : 'TBP';
      const targets = await getSectionNotificationTargets(dept);
      
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
        sendWebPush(insertedNotifs);
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
        replyToId: replyToId ? parseInt(String(replyToId)) : null,
        replyToNik: replyToNik || null,
        replyToName: replyToName || null,
        replyToContent: replyToContent || null,
        universe: pt || 'TBP_GPS',
      }).returning();

      const comment = inserted[0];

      // Notification calculation by Section, PIC, and Reply Target
      const postArray = await db.select().from(bulletinPosts).where(eq(bulletinPosts.id, postId)).limit(1);
      const post = postArray[0];
      const postSection = section || post?.category || post?.department || 'Prep & Lab';
      const postUniverse = (pt || post?.pt || 'TBP').toUpperCase().includes('GTS') ? 'GTS' : 'TBP';

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
        // Komentar Utama Baru: Masuk ke pembuat artikel DAN personil di section yang relevan
        const allEmployees = await db.select().from(employees);
        const targetEmployees = allEmployees.filter((e) => {
          if (!e.nik || e.nik === authorNik) return false;
          
          // Jika author artikel bukan pengirim komentar, selalu sertakan
          if (post?.authorNik && e.nik === post.authorNik) return true;

          // Jika PIC ditentukan, selalu sertakan
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

        const notifTitle = statusUpdate
          ? `⚡ Update Status [${postSection}]: ${statusUpdate}`
          : `💬 Komentar Baru [${postSection}]`;
        const notifMessage = statusUpdate
          ? `${authorName || 'Personil'} mengupdate status topik ${topicLabel} ke "${statusUpdate}".`
          : `${authorName || 'Personil'} berkomentar di topik ${topicLabel}: "${content.length > 60 ? content.substring(0, 60) + '...' : content}"`;

        targetEmployees.forEach((t) => {
          notificationsData.push({
            userId: t.nik,
            role: postSection,
            title: notifTitle,
            message: notifMessage,
            type: statusUpdate ? 'success' : 'info',
            link: notifLink,
            isRead: false,
          });
        });
      }

      if (notificationsData.length > 0) {
        const insertedNotifs = await db.insert(notifications).values(notificationsData).returning();
        sendWebPush(insertedNotifs);
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
      const q = query.trim().toLowerCase();
      // Priority 1: Exact NIK match
      const byNik = allEmployees.find(e => e.nik && e.nik.toLowerCase() === q);
      if (byNik) return byNik;
      // Priority 2: Exact full name match
      const byExact = allEmployees.find(e => e.name && e.name.toLowerCase() === q);
      if (byExact) return byExact;
      // Priority 3: Word boundary / startsWith match
      if (q.length >= 3) {
        return allEmployees.find(e => {
          const name = (e.name || '').toLowerCase();
          const words = name.split(/\s+/);
          return words.includes(q) || name.startsWith(q);
        });
      }
      return null;
    };

    // Cutoff: Hanya sinkronisasikan data di labnote yang dibuat sejak fitur log book dibuat (2026-09-25)
    const LOGBOOK_FEATURE_START_DATE = '2026-09-25';

    // Group rows hierarchically: Parent Row -> Sub-items
    interface BulletinTaskGroup {
      parentRow: Record<string, string>;
      subItems: Array<{ text: string; checked: boolean; note?: string }>;
    }

    const taskGroups: BulletinTaskGroup[] = [];
    let currentTaskGroup: BulletinTaskGroup | null = null;

    for (const r of parsed.rows) {
      let rTitle = '';
      let rowDesc = '';
      Object.keys(r).forEach(k => {
        const kl = k.toLowerCase().trim();
        if (kl.includes('jenis kegiatan') || kl === 'task' || kl === 'judul') {
          rTitle = (r[k] || '').trim();
        } else if (kl.includes('keterangan') || kl.includes('catatan') || kl.includes('deskripsi')) {
          rowDesc = (r[k] || '').trim();
        }
      });

      const isSub = r.isSubItem === 'true' || (r as any).isSubItem === true || r.parentId ||
        rTitle.startsWith('↳') || rTitle.startsWith('->') || rTitle.startsWith('↪') || rTitle.startsWith('– ') || rTitle.startsWith('- ');

      if (isSub) {
        if (currentTaskGroup) {
          const isChecked = rTitle.startsWith('↳ [x]') || rTitle.startsWith('↳ [X]') || rTitle.startsWith('[x]') || rTitle.startsWith('[X]') ||
            (r['Status'] || '').toLowerCase().includes('close') || (r['Status'] || '').toLowerCase().includes('done') || (r['Status'] || '').toLowerCase().includes('selesai');
          const cleanSubText = rTitle.replace(/^[↳↪\->\s–]+/, '').replace(/^\[[ xX]\]\s*/, '').trim();
          if (cleanSubText) {
            currentTaskGroup.subItems.push({ text: cleanSubText, checked: isChecked, note: rowDesc });
          }
        }
      } else if (rTitle && rTitle !== '-' && rTitle.length >= 2) {
        currentTaskGroup = { parentRow: r, subItems: [] };
        taskGroups.push(currentTaskGroup);
      }
    }

    for (const group of taskGroups) {
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

      // Normalize subtasks: prioritize sub-items from child rows, or inline checklists in rowDesc
      let cleanDesc = rowDesc;
      if (group.subItems.length > 0) {
        const subtaskLines = group.subItems.map(item => `- [${item.checked ? 'x' : ' '}] ${item.text}`);
        const nonChecklistDesc = rowDesc
          ? rowDesc.split(/<br\s*\/?>|\n/).filter(line => !line.match(/^[-*•]?\s*\[[ xX]\]/i) && !line.includes('**(Done)**') && !line.includes('**(OPEN)**')).join('\n').trim()
          : '';
        cleanDesc = nonChecklistDesc ? `${nonChecklistDesc}\n${subtaskLines.join('\n')}` : subtaskLines.join('\n');
      } else if (cleanDesc) {
        cleanDesc = cleanDesc.replace(/<br\s*\/?>/gi, '\n');
        if (cleanDesc.includes('**(Done)**') || cleanDesc.includes('**(OPEN)**') || cleanDesc.includes('**(Closed)**') || cleanDesc.includes('**(OP)**')) {
          cleanDesc = cleanDesc
            .replace(/^[-*•]?\s*(.+?)\s*\*\*\(?(Done|Closed|Close|Finish|Selesai|CL)\)?\*\*\s*$/gim, '- [x] $1')
            .replace(/^[-*•]?\s*(.+?)\s*\*\*\(?(Open|OP|Belum|In Progress|Pending)\)?\*\*\s*$/gim, '- [ ] $1');
        }
        cleanDesc = cleanDesc.replace(/^[•*]\s*\[([ xX])\]/gm, '- [$1]');
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
            description: rowDesc || '',
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
      const result = await db.update(bulletinPosts).set(req.body).where(eq(bulletinPosts.id, parseInt(req.params.id))).returning();
      const post = result[0];
      if (post) {
        await syncBulletinToAgenda(post);
        await syncBulletinToLogbook(post);
      }
      res.json({ status: "success", data: post });
    } catch (error) {
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

    let fileName = 'downloaded-file';
    let mimeType = 'application/octet-stream';
    try {
      const meta = await drive.files.get({ fileId, fields: 'mimeType, name, size', supportsAllDrives: true });
      if (meta?.data?.name) fileName = meta.data.name;
      if (meta?.data?.mimeType) mimeType = meta.data.mimeType;
    } catch (e) {}

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);

    try {
      const streamRes = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'stream' }
      );
      return streamRes.data.pipe(res);
    } catch (sdkErr) {
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

