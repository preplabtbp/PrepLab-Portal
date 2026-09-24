import { Router } from "express";
import { db } from "../../src/db/index.js";
import { eq, desc, and, or, inArray, gte, lte, sql } from "drizzle-orm";
import { 
  logbookTasks, employees, bulletinPosts, notifications 
} from "../../src/db/schema.js";
import { sendWebPush } from "../utils.js";

export const logbookRouter = Router();

// Helper to get formatted date string YYYY-MM-DD
const formatDateStr = (date: Date): string => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to parse markdown table from bulletin content
function parseMarkdownTableRows(content: string) {
  if (!content || !content.includes("|")) return null;
  const lines = content.split("\n");
  let startIdx = -1;
  let endIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("|") && line.endsWith("|")) {
      if (startIdx === -1) startIdx = i;
      endIdx = i;
    } else if (startIdx !== -1) {
      break;
    }
  }
  if (startIdx === -1 || endIdx - startIdx < 2) return null;

  const headerLine = lines[startIdx];
  const headers = headerLine
    .split("|")
    .map(h => h.trim())
    .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

  const rows: Record<string, string>[] = [];
  for (let i = startIdx + 2; i <= endIdx; i++) {
    const rowLine = lines[i].trim();
    if (!rowLine.startsWith("|")) continue;
    const cells = rowLine
      .split("|")
      .map(c => c.trim())
      .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

    if (cells.length > 0) {
      const rowObj: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cells[idx] || "";
      });
      rows.push(rowObj);
    }
  }

  const beforeText = lines.slice(0, startIdx).join("\n");
  const afterText = lines.slice(endIdx + 1).join("\n");
  return { headers, rows, beforeText, afterText };
}

// Helper to re-serialize markdown table
function serializeMarkdownTable(
  headers: string[],
  rows: Record<string, string>[],
  beforeText: string = '',
  afterText: string = ''
): string {
  if (!headers || headers.length === 0) return '';
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const dataLines = rows.map(r => {
    const rowCells = headers.map(h => {
      let cell = r[h] !== undefined ? r[h] : '';
      cell = String(cell).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br/>');
      return cell;
    });
    return `| ${rowCells.join(' | ')} |`;
  });

  const tableMarkdown = [headerLine, separatorLine, ...dataLines].join('\n');
  let result = '';
  if (beforeText && beforeText.trim()) result += beforeText.trim() + '\n\n';
  result += tableMarkdown;
  if (afterText && afterText.trim()) result += '\n\n' + afterText.trim();
  return result;
}

// 1. GET /api/logbook/tasks - Fetch Yesterday & Today Tasks for Morning Meeting
logbookRouter.get("/api/logbook/tasks", async (req, res) => {
  try {
    const { section, date, pt, assigneeNik, assignedByNik } = req.query as {
      section?: string;
      date?: string;
      pt?: string;
      assigneeNik?: string;
      assignedByNik?: string;
    };

    const targetDateStr = date || formatDateStr(new Date());
    const targetDateObj = new Date(targetDateStr);
    
    // Calculate yesterday date string
    const yesterdayObj = new Date(targetDateObj);
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterdayDateStr = formatDateStr(yesterdayObj);

    // Build base conditions
    const conditions: any[] = [];
    if (pt && pt !== 'ALL') {
      const cleanPt = pt === 'GPS' ? 'TBP' : pt;
      conditions.push(eq(logbookTasks.pt, cleanPt));
    }
    if (section && section !== 'ALL' && section !== 'Semua') {
      conditions.push(eq(logbookTasks.section, section));
    }
    if (assigneeNik) {
      conditions.push(eq(logbookTasks.assigneeNik, assigneeNik));
    }
    if (assignedByNik) {
      conditions.push(eq(logbookTasks.assignedByNik, assignedByNik));
    }

    // Query all relevant tasks
    const allMatching = await db
      .select()
      .from(logbookTasks)
      .where(conditions.length > 0 ? and(...conditions) : sql`1=1`)
      .orderBy(desc(logbookTasks.createdAt));

    // Separate tasks for Today and Yesterday
    // Today tasks:
    // 1) Task with taskDate === targetDateStr
    // 2) Task from previous days that are STILL OPEN / IN PROGRESS (carry-over focus)
    const todayTasks = allMatching.filter(t => {
      if (t.taskDate === targetDateStr) return true;
      if (t.taskDate < targetDateStr && (t.status === 'Open' || t.status === 'In Progress')) return true;
      return false;
    });

    // Yesterday tasks (evaluation of work done on yesterdayDateStr):
    const yesterdayTasks = allMatching.filter(t => {
      return t.taskDate === yesterdayDateStr;
    });

    // Calculate Summary Statistics
    const summary = {
      todayDate: targetDateStr,
      yesterdayDate: yesterdayDateStr,
      totalToday: todayTasks.length,
      openToday: todayTasks.filter(t => t.status === 'Open').length,
      inProgressToday: todayTasks.filter(t => t.status === 'In Progress').length,
      completedToday: todayTasks.filter(t => t.status === 'Resolved' || t.status === 'Done' || t.status === 'Closed').length,
      totalYesterday: yesterdayTasks.length,
      completedYesterday: yesterdayTasks.filter(t => t.status === 'Resolved' || t.status === 'Done' || t.status === 'Closed').length,
      pendingYesterday: yesterdayTasks.filter(t => t.status === 'Open' || t.status === 'In Progress').length,
    };

    res.json({
      status: "success",
      data: {
        summary,
        todayTasks,
        yesterdayTasks,
      }
    });
  } catch (error: any) {
    console.error("[Logbook API GET] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 2. POST /api/logbook/tasks - Atasan Assign Task ke Bawahan (Otomatis Sinkron ke Buletin & Notifikasi)
logbookRouter.post("/api/logbook/tasks", async (req, res) => {
  try {
    const {
      title,
      description,
      section,
      assigneeNik,
      assigneeName,
      assignedByNik,
      assignedByName,
      priority = 'Normal',
      activityType = 'Routine',
      taskDate,
      targetDate,
      pt = 'TBP',
      bulletinPostId,
      bulletinTopicTitle
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ status: "error", message: "Judul kegiatan / tugas tidak boleh kosong" });
    }
    if (!assigneeNik || !assigneeName) {
      return res.status(400).json({ status: "error", message: "PIC bawahan yang ditugaskan harus dipilih" });
    }

    const assignedDate = taskDate || formatDateStr(new Date());

    // Insert into logbook_tasks
    const inserted = await db.insert(logbookTasks).values({
      title: title.trim(),
      description: description ? description.trim() : '',
      section: section || 'General',
      assigneeNik,
      assigneeName,
      assignedByNik: assignedByNik || 'SUPERVISOR',
      assignedByName: assignedByName || 'Atasan / Manajemen',
      priority,
      activityType,
      taskDate: assignedDate,
      targetDate: targetDate || '-',
      status: 'Open',
      progressPercent: 0,
      pt: pt === 'GPS' ? 'TBP' : pt,
      universe: pt === 'GTS' ? 'GTS' : 'TBP_GPS',
      bulletinPostId: bulletinPostId ? parseInt(String(bulletinPostId)) : null,
      bulletinTopicTitle: bulletinTopicTitle || title.trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    const createdTask = inserted[0];

    // Notification: Kirim Notifikasi Instan ke Bawahan yang Ditugaskan
    try {
      const notifData = [{
        userId: assigneeNik,
        role: section || 'Prep & Lab',
        title: `📋 Tugas Baru Ditugaskan (${priority})`,
        message: `${assignedByName || 'Atasan'} menugaskan: "${title}". Target: ${targetDate || 'Hari ini'}`,
        type: priority === 'Urgent' || priority === 'High' ? 'warning' : 'info',
        link: `/logbook?date=${assignedDate}&section=${encodeURIComponent(section || '')}`,
        isRead: false
      }];

      const notifRes = await db.insert(notifications).values(notifData).returning();
      sendWebPush(notifRes);
    } catch (notifErr) {
      console.warn("[Logbook API] Notification error:", notifErr);
    }

    // Auto-Sync: Jika ada bulletinPostId terkait, tambahkan atau perbarui baris di tabel buletin
    if (bulletinPostId) {
      try {
        const postArr = await db.select().from(bulletinPosts).where(eq(bulletinPosts.id, parseInt(String(bulletinPostId)))).limit(1);
        if (postArr.length > 0) {
          const post = postArr[0];
          const parsed = parseMarkdownTableRows(post.content);
          if (parsed && parsed.headers.length > 0) {
            // Check if row already exists
            const existingRowIdx = parsed.rows.findIndex(r => {
              const rTitle = (r['Jenis kegiatan'] || r['task'] || r['judul'] || '').toLowerCase().trim();
              return rTitle === title.toLowerCase().trim();
            });

            if (existingRowIdx === -1) {
              // Construct new row object matching headers
              const newRow: Record<string, string> = {};
              parsed.headers.forEach(h => {
                const hl = h.toLowerCase().trim();
                if (hl === 'number' || hl === 'no' || hl === '#') {
                  newRow[h] = String(parsed.rows.length + 1);
                } else if (hl.includes('jenis kegiatan') || hl === 'task' || hl === 'judul') {
                  newRow[h] = title.trim();
                } else if (hl.includes('keterangan') || hl.includes('catatan') || hl.includes('deskripsi')) {
                  newRow[h] = description ? description.trim() : '-';
                } else if (hl === 'pic' || hl.includes('assignee')) {
                  newRow[h] = assigneeName;
                } else if (hl.includes('status')) {
                  newRow[h] = 'Open';
                } else if (hl.includes('priority')) {
                  newRow[h] = priority;
                } else if (hl.includes('activity')) {
                  newRow[h] = activityType;
                } else if (hl.includes('target') || hl.includes('deadline')) {
                  newRow[h] = targetDate || '-';
                } else if (hl.includes('created')) {
                  newRow[h] = assignedDate;
                } else {
                  newRow[h] = '-';
                }
              });

              parsed.rows.push(newRow);
              const updatedContent = serializeMarkdownTable(parsed.headers, parsed.rows, parsed.beforeText, parsed.afterText);
              await db.update(bulletinPosts).set({ content: updatedContent }).where(eq(bulletinPosts.id, post.id));
              console.log(`[Logbook Sync] Synced new task "${title}" to bulletin post #${post.id}`);
            }
          }
        }
      } catch (syncErr) {
        console.warn("[Logbook Sync] Error appending row to bulletin:", syncErr);
      }
    }

    res.json({
      status: "success",
      message: "Tugas berhasil ditugaskan dan disinkronisasikan ke Buletin",
      data: createdTask
    });
  } catch (error: any) {
    console.error("[Logbook API POST] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 3. PUT /api/logbook/tasks/:id - Bawahan / Atasan Update Progres Task (Auto Sync ke Buletin)
logbookRouter.put("/api/logbook/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existingArr = await db.select().from(logbookTasks).where(eq(logbookTasks.id, id)).limit(1);
    if (existingArr.length === 0) {
      return res.status(404).json({ status: "error", message: "Task tidak ditemukan" });
    }

    const currentTask = existingArr[0];
    const updatePayload: Record<string, any> = { ...req.body, updatedAt: new Date() };

    // Auto set actualCompletedDate if marked as resolved/done
    if (
      updatePayload.status && 
      (updatePayload.status === 'Resolved' || updatePayload.status === 'Done' || updatePayload.status === 'Closed') &&
      !currentTask.actualCompletedDate
    ) {
      updatePayload.actualCompletedDate = new Date();
    } else if (updatePayload.status && (updatePayload.status === 'Open' || updatePayload.status === 'In Progress')) {
      updatePayload.actualCompletedDate = null;
    }

    const updated = await db
      .update(logbookTasks)
      .set(updatePayload)
      .where(eq(logbookTasks.id, id))
      .returning();

    const taskResult = updated[0];

    // Notification to assigner if status changed by assignee
    if (updatePayload.status && updatePayload.status !== currentTask.status) {
      try {
        if (currentTask.assignedByNik && currentTask.assignedByNik !== req.body.updaterNik) {
          const notif = [{
            userId: currentTask.assignedByNik,
            role: currentTask.section,
            title: `🔄 Update Progres Task [${taskResult.status}]`,
            message: `${taskResult.assigneeName} memperbarui status "${taskResult.title}" menjadi "${taskResult.status}" (${taskResult.progressPercent}%)`,
            type: taskResult.status === 'Resolved' || taskResult.status === 'Done' ? 'success' : 'info',
            link: `/logbook?date=${taskResult.taskDate}`,
            isRead: false
          }];
          const nRes = await db.insert(notifications).values(notif).returning();
          sendWebPush(nRes);
        }
      } catch (nErr) {
        console.warn("[Logbook API] Notify assigner error:", nErr);
      }
    }

    // Auto-Sync 2-Arah ke Buletin:
    // Update status dan keterangan di dokumen Buletin terkait
    if (taskResult.bulletinPostId) {
      try {
        const postArr = await db.select().from(bulletinPosts).where(eq(bulletinPosts.id, taskResult.bulletinPostId)).limit(1);
        if (postArr.length > 0) {
          const post = postArr[0];
          const parsed = parseMarkdownTableRows(post.content);
          if (parsed && parsed.headers.length > 0) {
            const targetTitle = (taskResult.bulletinTopicTitle || taskResult.title).toLowerCase().trim();
            let rowFound = false;

            parsed.rows = parsed.rows.map(r => {
              const rTitle = (r['Jenis kegiatan'] || r['task'] || r['judul'] || '').toLowerCase().trim();
              if (rTitle === targetTitle || targetTitle.includes(rTitle) || rTitle.includes(targetTitle)) {
                rowFound = true;
                const newRow = { ...r };
                // Update status
                Object.keys(newRow).forEach(k => {
                  const kl = k.toLowerCase().trim();
                  if (kl.includes('status')) {
                    newRow[k] = taskResult.status || newRow[k];
                  }
                  if (kl.includes('keterangan') && updatePayload.description) {
                    newRow[k] = updatePayload.description;
                  }
                  if (kl.includes('priority') && updatePayload.priority) {
                    newRow[k] = updatePayload.priority;
                  }
                  if (kl.includes('aktual') && (taskResult.status === 'Resolved' || taskResult.status === 'Done')) {
                    newRow[k] = formatDateStr(new Date());
                  }
                });
                return newRow;
              }
              return r;
            });

            if (rowFound) {
              const updatedContent = serializeMarkdownTable(parsed.headers, parsed.rows, parsed.beforeText, parsed.afterText);
              await db.update(bulletinPosts).set({ content: updatedContent }).where(eq(bulletinPosts.id, post.id));
              console.log(`[Logbook Sync] Synced update of task #${taskResult.id} back to bulletin post #${post.id}`);
            }
          }
        }
      } catch (syncErr) {
        console.warn("[Logbook Sync] Error updating bulletin post:", syncErr);
      }
    }

    res.json({
      status: "success",
      message: "Progres tugas berhasil diperbarui dan tersinkronisasi ke Buletin",
      data: taskResult
    });
  } catch (error: any) {
    console.error("[Logbook API PUT] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 4. DELETE /api/logbook/tasks/:id - Hapus Task
logbookRouter.delete("/api/logbook/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(logbookTasks).where(eq(logbookTasks.id, id));
    res.json({ status: "success", message: "Task berhasil dihapus" });
  } catch (error: any) {
    console.error("[Logbook API DELETE] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 5. POST /api/logbook/sync-from-bulletin - Import & Sync Rows from Bulletin Document to Logbook
logbookRouter.post("/api/logbook/sync-from-bulletin", async (req, res) => {
  try {
    const { bulletinPostId, section, userNik, userName } = req.body;
    if (!bulletinPostId) {
      return res.status(400).json({ status: "error", message: "ID Buletin diperlukan" });
    }

    const postArr = await db.select().from(bulletinPosts).where(eq(bulletinPosts.id, parseInt(String(bulletinPostId)))).limit(1);
    if (postArr.length === 0) {
      return res.status(404).json({ status: "error", message: "Dokumen buletin tidak ditemukan" });
    }

    const post = postArr[0];
    const parsed = parseMarkdownTableRows(post.content);
    if (!parsed || parsed.rows.length === 0) {
      return res.json({ status: "success", message: "Tidak ada tabel kegiatan di dokumen ini", importedCount: 0 });
    }

    const todayDateStr = formatDateStr(new Date());
    let importedCount = 0;

    for (const r of parsed.rows) {
      const title = r['Jenis kegiatan'] || r['task'] || r['judul'] || '';
      if (!title || title.trim() === '-' || title.trim().length < 2) continue;

      const picName = r['PIC'] || r['pic'] || r['Assignee'] || '';
      const status = r['Status'] || r['status'] || 'Open';
      const priority = r['Priority'] || r['priority'] || 'Normal';
      const desc = r['Keterangan'] || r['keterangan'] || '';
      const targetDate = r['Target Selesai'] || r['Deadline'] || '-';

      // Check if task already exists
      const existing = await db
        .select()
        .from(logbookTasks)
        .where(
          and(
            eq(logbookTasks.bulletinPostId, post.id),
            eq(logbookTasks.title, title.trim())
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(logbookTasks).values({
          title: title.trim(),
          description: desc.trim(),
          section: section || post.category || post.department || 'General',
          assigneeNik: 'PIC_' + picName.replace(/[^a-zA-Z0-9]/g, '_'),
          assigneeName: picName || 'Personil Section',
          assignedByNik: userNik || post.authorNik || 'SUPERVISOR',
          assignedByName: userName || post.authorName || 'Atasan / Manajemen',
          priority: priority || 'Normal',
          activityType: 'Routine',
          status: status || 'Open',
          progressPercent: 0,
          taskDate: todayDateStr,
          targetDate: targetDate || '-',
          pt: post.pt || 'TBP',
          universe: (post.pt || 'TBP') === 'GTS' ? 'GTS' : 'TBP_GPS',
          bulletinPostId: post.id,
          bulletinTopicTitle: title.trim(),
          createdAt: new Date(),
          updatedAt: new Date()
        });
        importedCount++;
      }
    }

    res.json({
      status: "success",
      message: `Berhasil menyinkronkan ${importedCount} tugas dari Buletin ke Log Book Section`,
      importedCount
    });
  } catch (error: any) {
    console.error("[Logbook Sync Bulletin] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});
