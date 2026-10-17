import { Router } from "express";
import { db, isDbCircuitBroken } from "../../src/db/index.js";
import { eq, desc, asc, or, inArray, isNull, and, gte, lte, sql } from "drizzle-orm";
import { 
  apdSettings, apdHistory, apdDocuments, employees 
} from "../../src/db/schema.js";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export const router = Router();

const APD_SPREADSHEET_ID = "1rGB-uSSzKcefu6dEd-4pWjDSS7NcWY_2TwLf8Fo4aT4";
const APD_XLSX_URL = `https://docs.google.com/spreadsheets/d/${APD_SPREADSHEET_ID}/export?format=xlsx`;
const APD_SETTINGS_CSV_URL = `https://docs.google.com/spreadsheets/d/${APD_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=apd_settings`;

let lastApdSyncTime = 0;
const APD_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes cache

function parseTimestamp(ts: any): Date {
  if (!ts) return new Date();
  if (typeof ts === 'number') {
    const utc_days = Math.floor(ts - 25569);
    const utc_value = utc_days * 86400;
    return new Date(utc_value * 1000);
  }
  const trimmed = String(ts).trim();
  const parts = trimmed.split(/[/ -]/);
  if (parts.length === 3) {
    let d = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10) - 1;
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
      return new Date(Date.UTC(y, m, d));
    }
  }
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function syncApdDataFromSheet(force: boolean = false) {
  const now = Date.now();
  if (!force && now - lastApdSyncTime < APD_SYNC_INTERVAL_MS) {
    return;
  }

  try {
    // 1. Sync APD Settings
    try {
      const resSettings = await fetch(APD_SETTINGS_CSV_URL);
      if (resSettings.ok) {
        const text = await resSettings.text();
        const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
        for (const row of parsed.data as any[]) {
          const type = (row.ApdType || '').trim();
          const months = parseInt(row.IntervalMonths, 10);
          if (type && !isNaN(months)) {
            await db.insert(apdSettings)
              .values({ itemName: type, intervalMonths: months })
              .onConflictDoUpdate({
                target: apdSettings.itemName,
                set: { intervalMonths: months }
              });
          }
        }
      }
    } catch (e: any) {
      console.warn("Failed to sync APD Settings from sheet:", e.message);
    }

    // 2. Sync APD History using XLSX to preserve rich-text hyperlinks
    try {
      const resHistory = await fetch(APD_XLSX_URL);
      if (resHistory.ok) {
        const buf = await resHistory.arrayBuffer();
        const wb = XLSX.read(Buffer.from(buf), { type: 'buffer' });
        const sheet = wb.Sheets['apd_history'];
        if (sheet && sheet['!ref']) {
          const range = XLSX.utils.decode_range(sheet['!ref']);
          const existingHistory = await db.select().from(apdHistory);
          const existingMap = new Map();
          for (const h of existingHistory) {
            const key = `${(h.nik || '').trim().toLowerCase()}_${(h.itemName || '').trim().toLowerCase()}_${h.dateTaken ? new Date(h.dateTaken).toISOString().slice(0, 10) : ''}`;
            existingMap.set(key, h);
            if (h.originalDateKey) {
              existingMap.set(h.originalDateKey.toLowerCase(), h);
            }
          }

          const toInsert: any[] = [];
          for (let r = 1; r <= range.e.r; r++) {
            const timestamp = sheet[XLSX.utils.encode_cell({ r, c: 0 })]?.v;
            const nik = (sheet[XLSX.utils.encode_cell({ r, c: 1 })]?.v || '').toString().trim();
            const name = (sheet[XLSX.utils.encode_cell({ r, c: 2 })]?.v || '').toString().trim();
            const apdType = (sheet[XLSX.utils.encode_cell({ r, c: 3 })]?.v || '').toString().trim();
            const cellH = sheet[XLSX.utils.encode_cell({ r, c: 7 })];

            if (!nik || !apdType) continue;

            let link = cellH?.l?.Target || '';
            if (!link && typeof cellH?.v === 'string' && cellH.v.startsWith('http')) {
              link = cellH.v.trim();
            }
            if (link && !link.startsWith('http://') && !link.startsWith('https://') && !link.startsWith('/')) {
              link = '';
            }

            const parsedDate = parseTimestamp(timestamp);
            const dateKey = parsedDate.toISOString().slice(0, 10);
            const uniqueKey = `${nik.toLowerCase()}_${apdType.toLowerCase()}_${dateKey}`;

            const existing = existingMap.get(uniqueKey);
            if (existing) {
              if (existing.isDeleted) {
                // Jangan bangkitkan kembali data yang sudah dihapus oleh Section Inventory / Dev / Manager
                continue;
              }
              if (link && (!existing.photoUrl || existing.photoUrl === 'Link form APD' || !existing.photoUrl.startsWith('http'))) {
                await db.update(apdHistory)
                  .set({ photoUrl: link })
                  .where(eq(apdHistory.id, existing.id));
                existing.photoUrl = link;
              }
            } else {
              existingMap.set(uniqueKey, { nik, itemName: apdType, dateTaken: parsedDate, photoUrl: link, isDeleted: false });
              toInsert.push({
                nik,
                name,
                itemName: apdType,
                dateTaken: parsedDate,
                photoUrl: link,
                pt: 'TBP',
                isDeleted: false
              });
            }
          }

          if (toInsert.length > 0) {
            const CHUNK_SIZE = 50;
            for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
              await db.insert(apdHistory).values(toInsert.slice(i, i + CHUNK_SIZE));
            }
            console.log(`[APD Sync] Successfully synced ${toInsert.length} new APD history records from XLSX.`);
          }
        }
      }
    } catch (sheetErr: any) {
      console.warn("Failed to sync APD History from XLSX:", sheetErr.message);
    }

    lastApdSyncTime = now;
  } catch (error: any) {
    console.error("[APD Sync] Error syncing APD data:", error.message);
  }
}

const DEFAULT_APD_SETTINGS: Record<string, number> = {
  "Helm": 24,
  "Sepatu Safety": 12,
  "Kacamata Safety": 6,
  "Rompi Safety": 12,
  "Sarung Tangan": 1,
  "Masker": 1,
  "Earplug": 6,
  "Earmuff": 12,
  "Face Shield": 12
};

// GET /api/apd/settings
router.get("/api/apd/settings", async (req, res) => {
  try {
    syncApdDataFromSheet().catch(() => {});
    const settingsMap: Record<string, number> = { ...DEFAULT_APD_SETTINGS };
    if (!isDbCircuitBroken()) {
      try {
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 15000));
        const data: any = await Promise.race([db.select().from(apdSettings), timeoutPromise]);
        for (const item of data) {
          if (item.itemName) settingsMap[item.itemName] = item.intervalMonths || 0;
        }
      } catch (dbErr: any) {
        console.warn("[APD Settings DB notice]:", dbErr?.message);
      }
    }
    res.json(settingsMap);
  } catch (e: any) {
    res.json(DEFAULT_APD_SETTINGS);
  }
});

router.post("/api/apd/settings", async (req, res) => {
  try {
    const intervals = req.body;
    if (intervals && typeof intervals === 'object') {
      for (const [key, val] of Object.entries(intervals)) {
        await db.insert(apdSettings)
          .values({ itemName: key, intervalMonths: Number(val) || 0 })
          .onConflictDoUpdate({
            target: apdSettings.itemName,
            set: { intervalMonths: Number(val) || 0 }
          });
      }
    }
    res.json({ status: "ok" });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/apd/history
router.get("/api/apd/history", async (req, res) => {
  try {
    const { pt, nik } = req.query;
    syncApdDataFromSheet().catch(() => {});

    // If query by NIK, return formatted history map grouped by APD type
    if (nik && typeof nik === 'string' && nik.trim()) {
      const cleanNik = nik.trim();
      const historyMap: Record<string, Array<{ id?: number; date: string; url?: string }>> = {};
      if (!isDbCircuitBroken()) {
        try {
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 15000));
          const records: any = await Promise.race([
            db.select().from(apdHistory)
              .where(
                and(
                  sql`LOWER(${apdHistory.nik}) = LOWER(${cleanNik})`,
                  or(isNull(apdHistory.isDeleted), eq(apdHistory.isDeleted, false))
                )
              )
              .orderBy(asc(apdHistory.dateTaken), asc(apdHistory.id)),
            timeoutPromise
          ]);
          for (const r of records) {
            const item = r.itemName || 'Lainnya';
            if (!historyMap[item]) historyMap[item] = [];
            historyMap[item].push({
              id: r.id,
              date: r.dateTaken ? new Date(r.dateTaken).toISOString() : new Date().toISOString(),
              url: r.photoUrl || ''
            });
          }
        } catch (dbErr: any) {
          console.warn("[APD History NIK DB notice]:", dbErr?.message);
        }
      }
      return res.json(historyMap);
    }

    // Default list query (e.g. for admin/monitoring table)
    if (isDbCircuitBroken()) {
      return res.json([]);
    }
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('DB_TIMEOUT')), 15000));
      let query: any = db.select().from(apdHistory)
        .where(or(isNull(apdHistory.isDeleted), eq(apdHistory.isDeleted, false)));
      if (pt && (pt as string).toUpperCase() === 'GTS') {
        query = query.where(and(eq(apdHistory.pt, 'GTS'), or(isNull(apdHistory.isDeleted), eq(apdHistory.isDeleted, false))));
      } else {
        query = query.where(and(
          or(eq(apdHistory.pt, 'TBP'), eq(apdHistory.pt, 'GPS'), eq(apdHistory.pt, 'TBP_GPS'), isNull(apdHistory.pt)),
          or(isNull(apdHistory.isDeleted), eq(apdHistory.isDeleted, false))
        ));
      }
      const data = await Promise.race([query, timeoutPromise]);
      res.json(data || []);
    } catch (dbErr: any) {
      console.warn("[APD History list DB notice]:", dbErr?.message);
      res.json([]);
    }
  } catch (e: any) {
    console.warn("[APD History error]:", e?.message);
    res.json([]);
  }
});

// POST /api/apd/history
router.post("/api/apd/history", async (req, res) => {
  try {
    const { nik, nama, entries, pdfUrl, pt } = req.body;
    if (entries && Array.isArray(entries) && entries.length > 0) {
      const toInsert = entries.map((ent: any) => ({
        nik: nik || ent.nik || '',
        name: nama || ent.nama || '',
        itemName: ent.apd || ent.itemName || '',
        dateTaken: ent.tanggal ? new Date(ent.tanggal) : new Date(),
        photoUrl: pdfUrl || ent.pdfUrl || '',
        pt: pt || 'TBP',
        isDeleted: false
      }));

      await db.insert(apdHistory).values(toInsert);
    }
    res.json({ status: "ok" });
  } catch (e: any) {
    console.error("Failed to record APD history:", e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/apd/history - Ganti tanggal atau edit riwayat pengambilan APD
router.put("/api/apd/history", async (req, res) => {
  try {
    const { id, nik, itemName, newDate, oldDate } = req.body;
    if (!newDate) {
      return res.status(400).json({ error: "Tanggal baru wajib diisi" });
    }
    const parsedNewDate = new Date(newDate);
    if (isNaN(parsedNewDate.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }

    if (id) {
      const existing = await db.select().from(apdHistory).where(eq(apdHistory.id, Number(id)));
      let originalDateKey = existing[0]?.originalDateKey;
      if (!originalDateKey && existing[0]?.dateTaken) {
        const origDateStr = new Date(existing[0].dateTaken).toISOString().slice(0, 10);
        originalDateKey = `${(existing[0].nik || '').trim().toLowerCase()}_${(existing[0].itemName || '').trim().toLowerCase()}_${origDateStr}`;
      }

      await db.update(apdHistory)
        .set({ 
          dateTaken: parsedNewDate,
          originalDateKey: originalDateKey || null
        })
        .where(eq(apdHistory.id, Number(id)));
      return res.json({ status: "ok", message: "Tanggal riwayat pengambilan APD berhasil diperbarui" });
    } else if (nik && itemName && oldDate) {
      const parsedOld = new Date(oldDate);
      const startOfDay = new Date(parsedOld.getFullYear(), parsedOld.getMonth(), parsedOld.getDate(), 0, 0, 0);
      const endOfDay = new Date(parsedOld.getFullYear(), parsedOld.getMonth(), parsedOld.getDate(), 23, 59, 59);
      const oldDateStr = parsedOld.toISOString().slice(0, 10);
      const origKey = `${String(nik).trim().toLowerCase()}_${String(itemName).trim().toLowerCase()}_${oldDateStr}`;

      await db.update(apdHistory)
        .set({ 
          dateTaken: parsedNewDate,
          originalDateKey: origKey
        })
        .where(
          and(
            sql`LOWER(${apdHistory.nik}) = LOWER(${String(nik).trim()})`,
            sql`LOWER(${apdHistory.itemName}) = LOWER(${String(itemName).trim()})`,
            gte(apdHistory.dateTaken, startOfDay),
            lte(apdHistory.dateTaken, endOfDay)
          )
        );
      return res.json({ status: "ok", message: "Tanggal riwayat pengambilan APD berhasil diperbarui" });
    }
    return res.status(400).json({ error: "Parameter tidak lengkap untuk update riwayat" });
  } catch (e: any) {
    console.error("Failed to update APD history:", e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/apd/history - Hapus riwayat pengambilan APD
router.delete("/api/apd/history", async (req, res) => {
  try {
    const { id, nik, itemName, date } = req.body;
    if (id) {
      await db.update(apdHistory)
        .set({ isDeleted: true })
        .where(eq(apdHistory.id, Number(id)));
      return res.json({ status: "ok", message: "Riwayat pengambilan APD berhasil dihapus" });
    } else if (nik && itemName && date) {
      const parsedDate = new Date(date);
      const startOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 0, 0, 0);
      const endOfDay = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 23, 59, 59);

      await db.update(apdHistory)
        .set({ isDeleted: true })
        .where(
          and(
            sql`LOWER(${apdHistory.nik}) = LOWER(${String(nik).trim()})`,
            sql`LOWER(${apdHistory.itemName}) = LOWER(${String(itemName).trim()})`,
            gte(apdHistory.dateTaken, startOfDay),
            lte(apdHistory.dateTaken, endOfDay)
          )
        );
      return res.json({ status: "ok", message: "Riwayat pengambilan APD berhasil dihapus" });
    }
    return res.status(400).json({ error: "Parameter tidak lengkap untuk menghapus riwayat" });
  } catch (e: any) {
    console.error("Failed to delete APD history:", e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/apd/history/manual - Tambah riwayat pengambilan APD manual
router.post("/api/apd/history/manual", async (req, res) => {
  try {
    const { nik, nama, itemName, dateTaken, photoUrl } = req.body;
    if (!nik || !itemName || !dateTaken) {
      return res.status(400).json({ error: "NIK, jenis APD, dan tanggal wajib diisi" });
    }
    const parsedDate = new Date(dateTaken);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Format tanggal tidak valid" });
    }
    const inserted = await db.insert(apdHistory).values({
      nik: String(nik).trim(),
      name: String(nama || '').trim(),
      itemName: String(itemName).trim(),
      dateTaken: parsedDate,
      photoUrl: photoUrl || '',
      pt: 'TBP',
      isDeleted: false
    }).returning();
    return res.json({ status: "ok", message: "Riwayat pengambilan berhasil ditambahkan", data: inserted[0] });
  } catch (e: any) {
    console.error("Failed to add manual APD history:", e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/apd/documents
router.get("/api/apd/documents", async (req, res) => {
  try {
    const { pt } = req.query;
    let query: any = db.select().from(apdDocuments);
    if (pt && (pt as string).toUpperCase() === 'GTS') {
      query = query.where(eq(apdDocuments.pt, 'GTS'));
    } else {
      query = query.where(or(eq(apdDocuments.pt, 'TBP'), eq(apdDocuments.pt, 'GPS'), eq(apdDocuments.pt, 'TBP_GPS'), isNull(apdDocuments.pt)));
    }
    const data = await query;
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post("/api/apd/documents", async (req, res) => {
  res.json({ status: "ok" });
});
