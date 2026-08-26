import { Router } from "express";
import { db } from "../../src/db/index.js";
import { appFeedbacks, developerUsers } from "../../src/db/schema.js";
import { eq, desc, and } from "drizzle-orm";

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
      type = 'bug',
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
