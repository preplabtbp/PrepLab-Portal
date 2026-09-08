import { Router } from "express";
import { db } from "../../src/db/index.js";
import { eq, desc, or, inArray, isNull, and, gte, lte, sql } from "drizzle-orm";
import { 
  apdSettings, apdHistory, apdDocuments, employees 
} from "../../src/db/schema.js";
import Papa from "papaparse";

export const router = Router();

const APD_SPREADSHEET_ID = "1rGB-uSSzKcefu6dEd-4pWjDSS7NcWY_2TwLf8Fo4aT4";
const APD_HISTORY_CSV_URL = `https://docs.google.com/spreadsheets/d/${APD_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=apd_history`;
const APD_SETTINGS_CSV_URL = `https://docs.google.com/spreadsheets/d/${APD_SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=apd_settings`;

let lastApdSyncTime = 0;
const APD_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes cache

function parseTimestamp(ts: string): Date {
  if (!ts) return new Date();
  const trimmed = ts.trim();
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

    // 2. Sync APD History
    const resHistory = await fetch(APD_HISTORY_CSV_URL);
    if (!resHistory.ok) {
      console.warn("Failed to fetch APD history CSV, status:", resHistory.status);
      return;
    }

    const textHistory = await resHistory.text();
    const parsedHistory = Papa.parse(textHistory, { header: true, skipEmptyLines: true });
    const rows = (parsedHistory.data as any[]).filter(r => r.NIK && r.NIK.trim() && r.ApdType && r.ApdType.trim());

    if (rows.length > 0) {
      const existingHistory = await db.select().from(apdHistory);
      const existingKeys = new Set(
        existingHistory.map(h => `${(h.nik || '').trim().toLowerCase()}_${(h.itemName || '').trim().toLowerCase()}_${h.dateTaken ? new Date(h.dateTaken).toISOString().slice(0, 10) : ''}`)
      );

      const toInsert: any[] = [];
      for (const r of rows) {
        const nik = (r.NIK || '').trim();
        const apdType = (r.ApdType || '').trim();
        const name = (r.NAMA || '').trim();
        const parsedDate = parseTimestamp(r.Timestamp);
        const dateKey = parsedDate.toISOString().slice(0, 10);
        const link = (r['Link form APD'] || r.Link || '').trim();
        const uniqueKey = `${nik.toLowerCase()}_${apdType.toLowerCase()}_${dateKey}`;

        if (!existingKeys.has(uniqueKey)) {
          existingKeys.add(uniqueKey);
          toInsert.push({
            nik: nik,
            name: name,
            itemName: apdType,
            dateTaken: parsedDate,
            photoUrl: link,
            pt: 'TBP'
          });
        }
      }

      if (toInsert.length > 0) {
        const CHUNK_SIZE = 50;
        for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
          await db.insert(apdHistory).values(toInsert.slice(i, i + CHUNK_SIZE));
        }
        console.log(`[APD Sync] Successfully synced ${toInsert.length} new APD history records from sheet.`);
      }
    }

    lastApdSyncTime = now;
  } catch (error: any) {
    console.error("[APD Sync] Error syncing APD data:", error.message);
  }
}

// GET /api/apd/settings
router.get("/api/apd/settings", async (req, res) => {
  try {
    await syncApdDataFromSheet();
    const data = await db.select().from(apdSettings);
    // Return record dictionary expected by useApdInput and apd-settings-screen
    const settingsMap: Record<string, number> = {};
    for (const item of data) {
      settingsMap[item.itemName] = item.intervalMonths || 0;
    }
    res.json(settingsMap);
  } catch (e: any) {
    console.error(e);
    res.json({});
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
    await syncApdDataFromSheet();

    // If query by NIK, return formatted history map grouped by APD type
    if (nik && typeof nik === 'string' && nik.trim()) {
      const cleanNik = nik.trim();
      const records = await db.select().from(apdHistory).where(
        sql`LOWER(${apdHistory.nik}) = LOWER(${cleanNik})`
      );

      const historyMap: Record<string, Array<{ date: string; url?: string }>> = {};
      for (const r of records) {
        const item = r.itemName || 'Lainnya';
        if (!historyMap[item]) historyMap[item] = [];
        historyMap[item].push({
          date: r.dateTaken ? new Date(r.dateTaken).toISOString() : new Date().toISOString(),
          url: r.photoUrl || ''
        });
      }
      return res.json(historyMap);
    }

    // Default list query (e.g. for admin/monitoring table)
    let query: any = db.select().from(apdHistory);
    if (pt && (pt as string).toUpperCase() === 'GTS') {
      query = query.where(eq(apdHistory.pt, 'GTS'));
    } else {
      query = query.where(or(eq(apdHistory.pt, 'TBP'), eq(apdHistory.pt, 'GPS'), eq(apdHistory.pt, 'TBP_GPS'), isNull(apdHistory.pt)));
    }
    const data = await query;
    res.json(data);
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
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
        pt: pt || 'TBP'
      }));

      await db.insert(apdHistory).values(toInsert);
    }
    res.json({ status: "ok" });
  } catch (e: any) {
    console.error("Failed to record APD history:", e);
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
