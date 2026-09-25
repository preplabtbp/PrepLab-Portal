import { Router } from "express";
import { db } from "../../src/db/index.js";
import { eq, desc, and, or, inArray, gte, lte, sql, isNull } from "drizzle-orm";
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
      if (pt === 'GTS') {
        conditions.push(eq(logbookTasks.pt, 'GTS'));
      } else {
        // TBP and GPS are unified
        conditions.push(or(
          eq(logbookTasks.pt, 'TBP'),
          eq(logbookTasks.pt, 'GPS'),
          isNull(logbookTasks.pt)
        ));
      }
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

    // STRICT SEPARATION:
    // 1. Today tasks: ONLY tasks for targetDateStr
    const todayTasks = allMatching.filter(t => t.taskDate === targetDateStr);

    // 2. Carry Over tasks:
    // Past unfinished tasks (Open, In Progress, Pending) from earlier dates,
    // plus tasks from yesterdayDateStr for evaluation.
    const carryOverTasks = allMatching.filter(t => {
      if (t.taskDate === targetDateStr) return false;
      if (t.taskDate === yesterdayDateStr) return true;
      if (t.taskDate < targetDateStr && t.status !== 'Resolved' && t.status !== 'Done' && t.status !== 'Closed') return true;
      return false;
    });

    // Calculate Summary Statistics
    const summary = {
      todayDate: targetDateStr,
      yesterdayDate: yesterdayDateStr,
      totalToday: todayTasks.length,
      openToday: todayTasks.filter(t => t.status === 'Open').length,
      inProgressToday: todayTasks.filter(t => t.status === 'In Progress').length,
      completedToday: todayTasks.filter(t => t.status === 'Resolved' || t.status === 'Done' || t.status === 'Closed').length,
      totalCarryOver: carryOverTasks.length,
      completedCarryOver: carryOverTasks.filter(t => t.status === 'Resolved' || t.status === 'Done' || t.status === 'Closed').length,
      pendingCarryOver: carryOverTasks.filter(t => t.status !== 'Resolved' && t.status !== 'Done' && t.status !== 'Closed').length,
      // Backwards compatibility for UI reading yesterday properties
      totalYesterday: carryOverTasks.length,
      completedYesterday: carryOverTasks.filter(t => t.status === 'Resolved' || t.status === 'Done' || t.status === 'Closed').length,
      pendingYesterday: carryOverTasks.filter(t => t.status !== 'Resolved' && t.status !== 'Done' && t.status !== 'Closed').length,
    };

    res.json({
      status: "success",
      data: {
        summary,
        todayTasks,
        yesterdayTasks: carryOverTasks,
        carryOverTasks
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
      targetTime,
      pt = 'TBP',
      bulletinPostId,
      bulletinTopicTitle,
      isPending = false,
      pendingPicNik,
      pendingPicName,
      pendingReason
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ status: "error", message: "Judul kegiatan / tugas tidak boleh kosong" });
    }
    if (!assigneeNik || !assigneeName) {
      return res.status(400).json({ status: "error", message: "PIC bawahan yang ditugaskan harus dipilih" });
    }

    const assignedDate = taskDate || formatDateStr(new Date());
    const finalTargetTime = targetTime && targetTime.trim() ? targetTime.trim() : '23:59';

    // Subtask Mode Automation for Status & Progress
    const cleanDesc = description ? description.trim() : '';
    const descLines = cleanDesc.split('\n');
    let initTotal = 0;
    let initCompleted = 0;
    descLines.forEach((line: string) => {
      const match = line.match(/^(\s*[-*]\s*\[([ xX])\]\s+)(.*)$/);
      if (match) {
        initTotal++;
        if (match[2].toLowerCase() === 'x') initCompleted++;
      }
    });

    let initialStatus = isPending ? 'Pending' : (req.body.status || 'Open');
    let initialProgress = 0;
    if (initTotal > 0 && !isPending && String(initialStatus).toLowerCase() !== 'canceled') {
      if (initCompleted === 0) {
        initialStatus = 'Open';
      } else if (initCompleted === initTotal) {
        initialStatus = 'Closed';
      } else {
        initialStatus = 'On Progress';
      }
      initialProgress = Math.round((initCompleted / initTotal) * 100);
    }

    // Insert into logbook_tasks
    const inserted = await db.insert(logbookTasks).values({
      title: title.trim(),
      description: cleanDesc,
      section: section || 'General',
      assigneeNik,
      assigneeName,
      assignedByNik: assignedByNik || 'SUPERVISOR',
      assignedByName: assignedByName || 'Atasan / Manajemen',
      priority,
      activityType,
      taskDate: assignedDate,
      targetDate: targetDate || '-',
      targetTime: finalTargetTime,
      status: initialStatus,
      progressPercent: initialProgress,
      pt: pt === 'GPS' ? 'TBP' : pt,
      universe: pt === 'GTS' ? 'GTS' : 'TBP_GPS',
      bulletinPostId: bulletinPostId ? parseInt(String(bulletinPostId)) : null,
      bulletinTopicTitle: bulletinTopicTitle || title.trim(),
      isPending: Boolean(isPending),
      pendingPicNik: pendingPicNik || null,
      pendingPicName: pendingPicName || null,
      pendingReason: pendingReason || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    const createdTask = inserted[0];

    // Notification: Kirim Notifikasi Instan ke Bawahan yang Ditugaskan (Mendukung Multi-PIC)
    try {
      const nikList = String(assigneeNik).split(',').map(s => s.trim()).filter(Boolean);
      const timeLabel = finalTargetTime !== '23:59' ? ` pukul ${finalTargetTime}` : ' (Batas 23:59)';
      const notifData: any[] = nikList.map(nik => ({
        userId: nik,
        role: section || 'Prep & Lab',
        title: `📋 Tugas Baru Ditugaskan (${priority})`,
        message: `${assignedByName || 'Atasan'} menugaskan: "${title}". Target: ${targetDate || 'Hari ini'}${timeLabel}`,
        type: priority === 'Urgent' || priority === 'High' ? 'warning' : 'info',
        link: `/logbook?date=${assignedDate}&section=${encodeURIComponent(section || '')}`,
        isRead: false
      }));

      // Jika ada PIC Job Pending yang berbeda, kirim notifikasi khusus kepadanya
      if (isPending && pendingPicNik && !nikList.includes(pendingPicNik)) {
        notifData.push({
          userId: pendingPicNik,
          role: section || 'Prep & Lab',
          title: `⏳ Penugasan Job Pending (${title})`,
          message: `${assignedByName || 'Atasan'} menugaskan Anda sebagai PIC Job Pending untuk "${title}". Alasan: ${pendingReason || '-'}`,
          type: 'warning',
          link: `/logbook?date=${assignedDate}&section=${encodeURIComponent(section || '')}`,
          isRead: false
        });
      }

      if (notifData.length > 0) {
        const notifRes = await db.insert(notifications).values(notifData).returning();
        sendWebPush(notifRes);
      }
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
              const rTitle = Object.keys(r).reduce((acc, k) => {
                const kl = k.toLowerCase().trim();
                if (kl.includes('jenis kegiatan') || kl === 'task' || kl === 'judul') return (r[k] || '').toLowerCase().trim();
                return acc;
              }, '');
              return rTitle && rTitle === title.toLowerCase().trim();
            });

            if (existingRowIdx === -1) {
              // Construct new row object matching headers
              const newRow: Record<string, string> = {};
              parsed.headers.forEach(h => {
                const hl = h.toLowerCase().trim();
                if (hl === 'number' || hl === 'no' || hl === '#') {
                  newRow[h] = '1';
                } else if (hl.includes('jenis kegiatan') || hl === 'task' || hl === 'judul') {
                  newRow[h] = title.trim();
                } else if (hl.includes('keterangan') || hl.includes('catatan') || hl.includes('deskripsi')) {
                  newRow[h] = description ? description.trim() : '-';
                } else if (hl === 'pic' || hl.includes('assignee')) {
                  newRow[h] = assigneeName;
                } else if (hl.includes('status')) {
                  newRow[h] = 'Open';
                } else if (hl.includes('priority') || hl.includes('prioritas')) {
                  newRow[h] = priority;
                } else if (hl.includes('activity') || hl.includes('aktivitas')) {
                  newRow[h] = activityType;
                } else if (hl.includes('target') || hl.includes('deadline')) {
                  newRow[h] = targetDate || '-';
                } else if (hl.includes('created')) {
                  newRow[h] = assignedDate;
                } else if (hl.includes('group')) {
                  newRow[h] = section || '-';
                } else if (hl.includes('aktual')) {
                  newRow[h] = '-';
                } else {
                  newRow[h] = '-';
                }
              });

              // Prepend at the TOP so it appears immediately on newest-first view
              parsed.rows.unshift(newRow);

              // Re-index number column if present
              parsed.rows.forEach((r, idx) => {
                Object.keys(r).forEach(k => {
                  const kl = k.toLowerCase().trim();
                  if (kl === 'number' || kl === 'no' || kl === '#') {
                    r[k] = String(idx + 1);
                  }
                });
              });

              const updatedContent = serializeMarkdownTable(parsed.headers, parsed.rows, parsed.beforeText, parsed.afterText);
              await db.update(bulletinPosts).set({ content: updatedContent }).where(eq(bulletinPosts.id, post.id));
              console.log(`[Logbook Sync] Synced new task "${title}" to top of bulletin post #${post.id}`);
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
    // 1. Handled separately: If PIC submits a Draft Proposal
    if (req.body.isDraftProposal) {
      const draftObj = typeof req.body.draftChange === 'string' 
        ? req.body.draftChange 
        : JSON.stringify(req.body.draftChange);

      const updated = await db
        .update(logbookTasks)
        .set({ draftChange: draftObj, updatedAt: new Date() })
        .where(eq(logbookTasks.id, id))
        .returning();

      const taskResult = updated[0];

      // Notify task creator (pemberi tugas)
      if (currentTask.assignedByNik) {
        try {
          const proposerName = req.body.proposerName || 'PIC';
          const notif = [{
            userId: currentTask.assignedByNik,
            role: currentTask.section,
            title: `📝 Draft Perubahan Tugas Diajukan`,
            message: `${proposerName} mengajukan draft penyesuaian untuk tugas "${currentTask.title}". Silakan review dan setujui.`,
            type: 'info',
            link: `/logbook?date=${currentTask.taskDate}`,
            isRead: false
          }];
          const nRes = await db.insert(notifications).values(notif).returning();
          sendWebPush(nRes);
        } catch (nErr) {
          console.warn("[Draft Proposal] Notification error:", nErr);
        }
      }

      return res.json({
        status: "success",
        message: "Draft perubahan berhasil diajukan dan dikirim ke pembuat tugas untuk di-review",
        data: taskResult
      });
    }

    const updatePayload: Record<string, any> = { ...req.body, updatedAt: new Date() };
    if (req.body.clearDraft) {
      updatePayload.draftChange = null;
    }

    // Subtask Mode Automation on update:
    // If task has subtasks: auto-compute Open, On Progress, Closed (with special option Canceled)
    const targetDesc = updatePayload.description !== undefined ? updatePayload.description : currentTask.description;
    const descLines = (targetDesc || '').split('\n');
    let subtaskTotal = 0;
    let subtaskCompleted = 0;
    descLines.forEach((line: string) => {
      const match = line.match(/^(\s*[-*]\s*\[([ xX])\]\s+)(.*)$/);
      if (match) {
        subtaskTotal++;
        if (match[2].toLowerCase() === 'x') subtaskCompleted++;
      }
    });

    if (subtaskTotal > 0) {
      const requestedStatus = updatePayload.status ? String(updatePayload.status).toLowerCase() : '';
      const isCanceled = requestedStatus === 'canceled' || (requestedStatus === '' && String(currentTask.status).toLowerCase() === 'canceled' && updatePayload.description === undefined);

      if (requestedStatus === 'canceled') {
        updatePayload.status = 'Canceled';
      } else if (!isCanceled) {
        if (subtaskCompleted === 0) {
          updatePayload.status = 'Open';
        } else if (subtaskCompleted === subtaskTotal) {
          updatePayload.status = 'Closed';
        } else {
          updatePayload.status = 'On Progress';
        }
      }
      updatePayload.progressPercent = Math.round((subtaskCompleted / subtaskTotal) * 100);
    }

    // Auto set actualCompletedDate and pending status flags
    if (
      updatePayload.status && 
      (updatePayload.status === 'Resolved' || updatePayload.status === 'Done' || updatePayload.status === 'Closed')
    ) {
      if (!currentTask.actualCompletedDate) updatePayload.actualCompletedDate = new Date();
      updatePayload.isPending = false;
    } else if (updatePayload.status && (updatePayload.status === 'Open' || updatePayload.status === 'In Progress' || updatePayload.status === 'On Progress')) {
      updatePayload.actualCompletedDate = null;
      if (updatePayload.isPending === undefined && !updatePayload.pendingPicNik) {
        updatePayload.isPending = false;
      }
    } else if (updatePayload.status === 'Pending' || updatePayload.pendingPicNik) {
      updatePayload.isPending = true;
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

    // Notification to PIC if directly edited by creator
    if (req.body.isDirectEdit) {
      try {
        const nikList = String(taskResult.assigneeNik || '').split(',').map(s => s.trim()).filter(Boolean);
        const notifData: any[] = nikList
          .filter(nik => nik !== req.body.updaterNik)
          .map(nik => ({
            userId: nik,
            role: taskResult.section,
            title: `✏️ Tugas Diperbarui Atasan`,
            message: `${currentTask.assignedByName} telah memperbarui rincian tugas "${taskResult.title}".`,
            type: 'info',
            link: `/logbook?date=${taskResult.taskDate}`,
            isRead: false
          }));

        if (notifData.length > 0) {
          const nRes = await db.insert(notifications).values(notifData).returning();
          sendWebPush(nRes);
        }
      } catch (e) {
        console.warn("[Logbook Direct Edit] Notify assignee error:", e);
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
            const targetTitle = (taskResult.bulletinTopicTitle || currentTask.title || '').toLowerCase().trim();
            if (targetTitle && targetTitle.length >= 2) {
              const targetIdx = parsed.rows.findIndex(r => {
                const rTitle = Object.keys(r).reduce((acc, k) => {
                  const kl = k.toLowerCase().trim();
                  if (kl.includes('jenis kegiatan') || kl === 'task' || kl === 'judul') {
                    return (r[k] || '').toLowerCase().trim();
                  }
                  return acc;
                }, '');
                if (!rTitle || rTitle.length < 2) return false;
                return rTitle === targetTitle || (rTitle.length >= 4 && targetTitle.length >= 4 && (rTitle.startsWith(targetTitle) || targetTitle.startsWith(rTitle)));
              });

              if (targetIdx !== -1) {
                const targetRow = { ...parsed.rows[targetIdx] };
                Object.keys(targetRow).forEach(k => {
                  const kl = k.toLowerCase().trim();
                  if (kl.includes('status')) {
                    targetRow[k] = taskResult.status || targetRow[k];
                  }
                  if (kl.includes('jenis kegiatan') || kl === 'task' || kl === 'judul') {
                    if (updatePayload.title) targetRow[k] = updatePayload.title;
                  }
                  if (kl.includes('keterangan') && updatePayload.description !== undefined) {
                    targetRow[k] = updatePayload.description;
                  }
                  if ((kl.includes('priority') || kl.includes('prioritas')) && updatePayload.priority) {
                    targetRow[k] = updatePayload.priority;
                  }
                  if (kl.includes('pic') && updatePayload.assigneeName) {
                    targetRow[k] = updatePayload.assigneeName;
                  }
                  if (kl.includes('target') && updatePayload.targetDate) {
                    targetRow[k] = updatePayload.targetDate;
                  }
                  if (kl.includes('aktual') && (taskResult.status === 'Resolved' || taskResult.status === 'Done')) {
                    targetRow[k] = formatDateStr(new Date());
                  }
                });
                parsed.rows[targetIdx] = targetRow;

                const updatedContent = serializeMarkdownTable(parsed.headers, parsed.rows, parsed.beforeText, parsed.afterText);
                await db.update(bulletinPosts).set({ content: updatedContent }).where(eq(bulletinPosts.id, post.id));
                console.log(`[Logbook Sync] Synced update of task #${taskResult.id} strictly to row #${targetIdx} of bulletin post #${post.id}`);
              }
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

// 3b. POST /api/logbook/tasks/:id/review-draft - Pemberi Tugas Review & Approve / Reject Draft Perubahan
logbookRouter.post("/api/logbook/tasks/:id/review-draft", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { action, reviewerNik, reviewerName, reviewNotes } = req.body;
    // action: 'approve' | 'reject'

    const existingArr = await db.select().from(logbookTasks).where(eq(logbookTasks.id, id)).limit(1);
    if (existingArr.length === 0) {
      return res.status(404).json({ status: "error", message: "Tugas tidak ditemukan" });
    }

    const currentTask = existingArr[0];
    if (!currentTask.draftChange) {
      return res.status(400).json({ status: "error", message: "Tidak ada draft perubahan yang menunggu review" });
    }

    let draftObj: any = null;
    try {
      draftObj = typeof currentTask.draftChange === 'string' ? JSON.parse(currentTask.draftChange) : currentTask.draftChange;
    } catch (e) {
      return res.status(400).json({ status: "error", message: "Format draft perubahan tidak valid" });
    }

    if (action === 'approve') {
      const applyPayload: Record<string, any> = {
        updatedAt: new Date(),
        draftChange: null
      };

      if (draftObj.title) applyPayload.title = draftObj.title;
      if (draftObj.description !== undefined) applyPayload.description = draftObj.description;
      if (draftObj.priority) applyPayload.priority = draftObj.priority;
      if (draftObj.activityType) applyPayload.activityType = draftObj.activityType;
      if (draftObj.targetDate) applyPayload.targetDate = draftObj.targetDate;
      if (draftObj.targetTime) applyPayload.targetTime = draftObj.targetTime;
      if (draftObj.assigneeNik) applyPayload.assigneeNik = draftObj.assigneeNik;
      if (draftObj.assigneeName) applyPayload.assigneeName = draftObj.assigneeName;

      const updated = await db
        .update(logbookTasks)
        .set(applyPayload)
        .where(eq(logbookTasks.id, id))
        .returning();

      const taskResult = updated[0];

      // Notify proposer that draft was approved
      if (draftObj.proposedByNik) {
        try {
          const notif = [{
            userId: draftObj.proposedByNik,
            role: currentTask.section,
            title: `✅ Draft Perubahan Disetujui!`,
            message: `${reviewerName || 'Pemberi Tugas'} telah menyetujui perubahan untuk "${taskResult.title}".`,
            type: 'success',
            link: `/logbook?date=${taskResult.taskDate}`,
            isRead: false
          }];
          const nRes = await db.insert(notifications).values(notif).returning();
          sendWebPush(nRes);
        } catch (nErr) {
          console.warn("[Review Draft] Notify proposer error:", nErr);
        }
      }

      // Sync updated title/description to bulletin if linked
      if (taskResult.bulletinPostId) {
        try {
          const postArr = await db.select().from(bulletinPosts).where(eq(bulletinPosts.id, taskResult.bulletinPostId)).limit(1);
          if (postArr.length > 0) {
            const post = postArr[0];
            const parsed = parseMarkdownTableRows(post.content);
            if (parsed && parsed.headers.length > 0) {
              const targetTitle = (currentTask.bulletinTopicTitle || currentTask.title || '').toLowerCase().trim();
              const targetIdx = parsed.rows.findIndex(r => {
                const rTitle = Object.keys(r).reduce((acc, k) => {
                  const kl = k.toLowerCase().trim();
                  if (kl.includes('jenis kegiatan') || kl === 'task' || kl === 'judul') return (r[k] || '').toLowerCase().trim();
                  return acc;
                }, '');
                return rTitle && (rTitle === targetTitle || rTitle.startsWith(targetTitle) || targetTitle.startsWith(rTitle));
              });

              if (targetIdx !== -1) {
                parsed.headers.forEach(h => {
                  const hl = h.toLowerCase().trim();
                  if (hl.includes('jenis kegiatan') || hl === 'task' || hl === 'judul') {
                    if (taskResult.title) parsed.rows[targetIdx][h] = taskResult.title;
                  } else if (hl.includes('keterangan') || hl.includes('catatan') || hl.includes('deskripsi')) {
                    if (taskResult.description) parsed.rows[targetIdx][h] = taskResult.description;
                  } else if (hl.includes('priority') || hl.includes('prioritas')) {
                    if (taskResult.priority) parsed.rows[targetIdx][h] = taskResult.priority;
                  } else if (hl.includes('target') || hl.includes('deadline')) {
                    if (taskResult.targetDate) parsed.rows[targetIdx][h] = taskResult.targetDate;
                  }
                });
                const updatedContent = serializeMarkdownTable(parsed.headers, parsed.rows, parsed.beforeText, parsed.afterText);
                await db.update(bulletinPosts).set({ content: updatedContent }).where(eq(bulletinPosts.id, post.id));
              }
            }
          }
        } catch (syncErr) {
          console.warn("[Review Draft] Bulletin sync error:", syncErr);
        }
      }

      return res.json({
        status: "success",
        message: "Draft perubahan berhasil disetujui dan diterapkan ke tugas",
        data: taskResult
      });
    } else {
      // Action === 'reject'
      const updated = await db
        .update(logbookTasks)
        .set({ draftChange: null, updatedAt: new Date() })
        .where(eq(logbookTasks.id, id))
        .returning();

      // Notify proposer that draft was rejected
      if (draftObj.proposedByNik) {
        try {
          const notif = [{
            userId: draftObj.proposedByNik,
            role: currentTask.section,
            title: `❌ Draft Perubahan Ditolak`,
            message: `${reviewerName || 'Pemberi Tugas'} menolak draft perubahan untuk "${currentTask.title}". Catatan: ${reviewNotes || '-'}`,
            type: 'warning',
            link: `/logbook?date=${currentTask.taskDate}`,
            isRead: false
          }];
          const nRes = await db.insert(notifications).values(notif).returning();
          sendWebPush(nRes);
        } catch (nErr) {
          console.warn("[Review Draft] Notify proposer error:", nErr);
        }
      }

      return res.json({
        status: "success",
        message: "Draft perubahan telah ditolak",
        data: updated[0]
      });
    }
  } catch (error: any) {
    console.error("[Review Draft API] Error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 4. DELETE /api/logbook/tasks/:id - Hapus Task (Sinkronisasi Otomatis ke Dokumen Buletin)
logbookRouter.delete("/api/logbook/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const existingArr = await db.select().from(logbookTasks).where(eq(logbookTasks.id, id)).limit(1);
    if (existingArr.length === 0) {
      return res.status(404).json({ status: "error", message: "Kegiatan logbook tidak ditemukan" });
    }

    const task = existingArr[0];

    // Auto-Sync Hapus Baris di Dokumen Buletin Terkait
    if (task.bulletinPostId) {
      try {
        const postArr = await db.select().from(bulletinPosts).where(eq(bulletinPosts.id, task.bulletinPostId)).limit(1);
        if (postArr.length > 0) {
          const post = postArr[0];
          const parsed = parseMarkdownTableRows(post.content);
          if (parsed && parsed.headers.length > 0) {
            const targetTitle = (task.bulletinTopicTitle || task.title || '').toLowerCase().trim();
            if (targetTitle && targetTitle.length >= 2) {
              const targetIdx = parsed.rows.findIndex(r => {
                const rTitle = Object.keys(r).reduce((acc, k) => {
                  const kl = k.toLowerCase().trim();
                  if (kl.includes('jenis kegiatan') || kl === 'task' || kl === 'judul') {
                    return (r[k] || '').toLowerCase().trim();
                  }
                  return acc;
                }, '');
                if (!rTitle || rTitle.length < 2) return false;
                return rTitle === targetTitle || (rTitle.length >= 4 && targetTitle.length >= 4 && (rTitle.startsWith(targetTitle) || targetTitle.startsWith(rTitle)));
              });

              if (targetIdx !== -1) {
                // Hapus baris dari tabel
                parsed.rows.splice(targetIdx, 1);

                // Urutkan kembali nomor (# / no / number)
                parsed.rows.forEach((r, idx) => {
                  Object.keys(r).forEach(k => {
                    const kl = k.toLowerCase().trim();
                    if (kl === 'number' || kl === 'no' || kl === '#') {
                      r[k] = String(idx + 1);
                    }
                  });
                });

                const updatedContent = serializeMarkdownTable(parsed.headers, parsed.rows, parsed.beforeText, parsed.afterText);
                await db.update(bulletinPosts).set({ content: updatedContent }).where(eq(bulletinPosts.id, post.id));
                console.log(`[Logbook Delete Sync] Berhasil menghapus baris "${task.title}" dari Buletin #${post.id}`);
              }
            }
          }
        }
      } catch (syncErr) {
        console.warn("[Logbook Delete Sync] Error deleting row from bulletin:", syncErr);
      }
    }

    await db.delete(logbookTasks).where(eq(logbookTasks.id, id));
    res.json({ status: "success", message: "Kegiatan berhasil dihapus dan disinkronkan ke Buletin" });
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
