import { Router } from "express";
import { db } from "../../src/db/index.js";
import { appFeedbacks, developerUsers, notifications } from "../../src/db/schema.js";
import { eq, desc, and } from "drizzle-orm";
import { sendWebPush } from "../utils.js";

export const router = Router();

// GET /api/feedbacks
// Query params: ?authorNik=... or ?all=true
router.get("/api/feedbacks", async (req, res) => {
  try {
    const { authorNik, all } = req.query;

    let feedbacks;
    if (all === 'true' || !authorNik) {
      feedbacks = await db
        .select()
        .from(appFeedbacks)
        .orderBy(desc(appFeedbacks.id));
    } else {
      feedbacks = await db
        .select()
        .from(appFeedbacks)
        .where(eq(appFeedbacks.authorNik, String(authorNik)))
        .orderBy(desc(appFeedbacks.id));
    }

    res.json({
      status: "success",
      data: feedbacks
    });
  } catch (error: any) {
    console.error("Error fetching feedbacks:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// POST /api/feedbacks
router.post("/api/feedbacks", async (req, res) => {
  try {
    const {
      type = 'suggestion',
      category,
      module,
      priority = 'medium',
      title,
      description,
      screenshotUrl,
      authorNik,
      authorName,
      authorRole,
      authorSection
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ status: "error", message: "Judul laporan wajib diisi" });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ status: "error", message: "Deskripsi kendala atau masukan wajib diisi" });
    }
    if (!authorNik) {
      return res.status(400).json({ status: "error", message: "NIK pelapor wajib disertakan" });
    }

    const inserted = await db
      .insert(appFeedbacks)
      .values({
        type,
        category: category || 'Umum',
        module: module || 'Umum',
        priority,
        title: title.trim(),
        description: description.trim(),
        screenshotUrl: screenshotUrl || null,
        authorNik: String(authorNik).trim(),
        authorName: authorName ? String(authorName).trim() : 'Personil PrepLab',
        authorRole: authorRole ? String(authorRole).trim() : 'Staff',
        authorSection: authorSection ? String(authorSection).trim() : 'Prep & Lab',
        status: 'PENDING',
      })
      .returning();

    // Buat notifikasi khusus Developer dengan kategori khusus 'dev'
    const cleanTitle = title.trim();
    const cleanDesc = description.trim();
    const cleanAuthor = authorName ? String(authorName).trim() : 'Personil PrepLab';
    const cleanSection = authorSection ? String(authorSection).trim() : 'Prep & Lab';

    let notifPrefix = '💡 [Saran Masuk]';
    if (type === 'bug') notifPrefix = '🐛 [Bug Report]';
    else if (type === 'improvement') notifPrefix = '🚀 [Peningkatan]';
    else if (type === 'question') notifPrefix = '❓ [Pertanyaan]';

    const notifTitle = `${notifPrefix} ${cleanTitle}`;
    const descPreview = cleanDesc.length > 120 ? cleanDesc.slice(0, 117) + '...' : cleanDesc;
    const notifMessage = `${cleanAuthor} (${cleanSection}) - Modul: ${module || 'Umum'}\n"${descPreview}"`;

    try {
      const createdNotif = await db.insert(notifications).values({
        role: 'Developer',
        category: 'dev',
        type: 'dev',
        title: notifTitle,
        message: notifMessage,
        link: '/feedback-support',
        isRead: false
      }).returning();

      if (createdNotif && createdNotif[0]) {
        const hardcodedDevs = ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN'];
        const devUsersList = await db.select({ nik: developerUsers.nik }).from(developerUsers);
        const allDevNiks = Array.from(new Set([...hardcodedDevs, ...devUsersList.map(d => d.nik.trim())]));

        sendWebPush(createdNotif[0], { targetNiks: allDevNiks });
      }
    } catch (notifErr) {
      console.error("Gagal membuat notifikasi dev untuk saran masuk:", notifErr);
    }

    res.json({
      status: "success",
      message: "Laporan masukan / bug berhasil dikirim ke Developer",
      data: inserted[0]
    });
  } catch (error: any) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// PUT /api/feedbacks/:id/status
router.put("/api/feedbacks/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, developerNotes } = req.body;

    if (isNaN(id)) {
      return res.status(400).json({ status: "error", message: "ID tidak valid" });
    }

    const updates: any = {};
    if (status) updates.status = status;
    if (developerNotes !== undefined) updates.developerNotes = developerNotes;
    if (status === 'RESOLVED') {
      updates.resolvedAt = new Date();
    }

    const updated = await db
      .update(appFeedbacks)
      .set(updates)
      .where(eq(appFeedbacks.id, id))
      .returning();

    if (!updated || updated.length === 0) {
      return res.status(404).json({ status: "error", message: "Data laporan tidak ditemukan" });
    }

    // Beri notifikasi ke pelapor saat status diperbarui oleh Developer
    const item = updated[0];
    if (item && item.authorNik && status) {
      try {
        const statusLabel = status === 'RESOLVED' ? 'Telah Diselesaikan ✅' : status === 'IN_PROGRESS' ? 'Sedang Dikerjakan 🛠️' : status;
        const authorNotif = await db.insert(notifications).values({
          userId: item.authorNik,
          category: 'feedback',
          type: 'info',
          title: `Tanggapan Developer: "${item.title.slice(0, 35)}"`,
          message: `Status: ${statusLabel}${developerNotes ? `\nCatatan: "${developerNotes}"` : ''}`,
          link: '/feedback-support',
          isRead: false
        }).returning();

        if (authorNotif && authorNotif[0]) {
          sendWebPush(authorNotif[0], { targetNiks: [item.authorNik] });
        }
      } catch (authNotifErr) {
        console.error("Gagal mengirim notifikasi status feedback ke pelapor:", authNotifErr);
      }
    }

    res.json({
      status: "success",
      message: "Status laporan berhasil diperbarui",
      data: updated[0]
    });
  } catch (error: any) {
    console.error("Error updating feedback status:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// DELETE /api/feedbacks/:id
router.delete("/api/feedbacks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ status: "error", message: "ID tidak valid" });
    }

    await db.delete(appFeedbacks).where(eq(appFeedbacks.id, id));
    res.json({
      status: "success",
      message: "Laporan berhasil dihapus"
    });
  } catch (error: any) {
    console.error("Error deleting feedback:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});
