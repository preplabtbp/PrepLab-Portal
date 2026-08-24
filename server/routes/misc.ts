import { Router } from "express";
import { Readable } from "stream";
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

router.get('/api/chat/:room', async (req, res) => {
    console.log("Chat route hit for room", req.params.room);
    try {
      const room = req.params.room;
      const msgs = chatMessagesMemory.filter(m => m.room === room);
      res.json(msgs);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch messages", details: err.message });
    }
  });

router.get('/api/vapid-public-key', (req, res) => {
    res.send(vapidPublicKey);
  });

router.post('/api/push/subscribe', async (req, res) => {
    try {
      const { nik, subscription, userAgent } = req.body;
      if (!nik || !subscription) return res.status(400).json({ error: 'Missing nik or subscription' });
      
      const subscriptionStr = JSON.stringify(subscription);
      
      // Upsert subscription
      const existing = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.subscription, subscriptionStr));
      if (existing.length > 0) {
        await db.update(pushSubscriptions).set({ nik, userAgent, createdAt: new Date() }).where(eq(pushSubscriptions.id, existing[0].id));
      } else {
        await db.insert(pushSubscriptions).values({ nik, subscription: subscriptionStr, userAgent });
      }
      
      res.status(201).json({});
    } catch (error) {
      console.error('Error saving subscription', error);
      res.status(500).json({ error: 'Error saving subscription' });
    }
  });

router.get("/api/health", (req, res) => {    res.json({ status: "ok", message: "Server is running!" });
  });

router.get("/api/settings", async (req, res) => {
    try {
      const settings = await db.select().from(appSettings);
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

router.post("/api/settings", async (req, res) => {
    try {
      const { settingKey, settingValue, description } = req.body;
      
      // Upsert
      const existing = await db.select().from(appSettings).where(eq(appSettings.settingKey, settingKey)).limit(1);
      
      if (existing.length > 0) {
        await db.update(appSettings)
          .set({ settingValue, description, updatedAt: new Date() })
          .where(eq(appSettings.settingKey, settingKey));
      } else {
        await db.insert(appSettings)
          .values({ settingKey, settingValue, description });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving setting:', error);
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

let galleryCache: { data: any[], timestamp: number } = { data: [], timestamp: 0 };

router.get("/api/gallery", async (req, res) => {
    console.log("[Gallery API] GET /api/gallery hit, refresh:", req.query.refresh);
    try {
      const now = Date.now();
      if (galleryCache.data.length > 0 && (now - galleryCache.timestamp) < 180000 && !req.query.refresh) {
        const allGallery = galleryCache.data;
        const weeksSet = new Set<string>();
        allGallery.forEach(p => { if (p.week) weeksSet.add(p.week); });
        const availableWeeks = Array.from(weeksSet).sort((a, b) => b.localeCompare(a));
        const defaultWeek = availableWeeks[0] || 'Minggu ke-34 (2026)';
        const reqWeek = (req.query.week as string) || defaultWeek;
        const filteredPhotos = reqWeek === 'ALL' ? allGallery : allGallery.filter(p => p.week === reqWeek);
        return res.json({
          currentWeek: reqWeek,
          availableWeeks,
          totalPhotos: allGallery.length,
          photos: filteredPhotos
        });
      }

      const { parse } = await import('csv-parse/sync');
      const { getISOWeek, getISOWeekYear } = await import('date-fns');
      const allGallery: any[] = [];
      const seenUrls = new Set<string>();

      function extractWeekFromText(text: string): string | null {
        if (!text) return null;
        const match1 = text.match(/W(\d+)[\-_Y\s](\d{2,4})/i);
        if (match1) {
          const w = match1[1].padStart(2, '0');
          let y = match1[2];
          if (y.length === 2) y = '20' + y;
          return `Minggu ke-${w} (${y})`;
        }
        const match2 = text.match(/W(\d+)/i);
        if (match2) {
          const w = match2[1].padStart(2, '0');
          return `Minggu ke-${w} (2026)`;
        }
        return null;
      }

      function parseCustomDate(dateStr: string): Date {
        if (!dateStr || dateStr.trim() === '' || dateStr === '-') return new Date();
        const clean = dateStr.trim().replace(/"/g, '');
        const parts = clean.split(' ')[0].split(/[\/\-]/);
        if (parts.length === 3) {
          let p0 = parseInt(parts[0], 10);
          let p1 = parseInt(parts[1], 10);
          let year = parseInt(parts[2], 10);
          
          // Case YYYY-MM-DD
          if (p0 > 1000) {
            year = p0;
            const month = p1 - 1;
            const day = parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            if (!isNaN(d.getTime())) return d;
          }
          
          if (year < 100) year = 2000 + year;
          
          let month = 0;
          let day = 1;
          
          if (p0 > 12) {
            day = p0;
            month = p1 - 1;
          } else if (p1 > 12) {
            month = p0 - 1;
            day = p1;
          } else {
            // Both <= 12: In 2026, month cannot exceed August (Month index 7)
            if (p1 - 1 > 7 && p0 - 1 <= 7) {
              month = p0 - 1;
              day = p1;
            } else if (p0 - 1 > 7 && p1 - 1 <= 7) {
              month = p1 - 1;
              day = p0;
            } else {
              month = p0 - 1;
              day = p1;
            }
          }
          
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) return d;
        }
        const direct = new Date(clean);
        return isNaN(direct.getTime()) ? new Date() : direct;
      }

      function getISOWeekLabel(d: Date, fallbackText?: string): string {
        const fromText = extractWeekFromText(fallbackText || '');
        if (fromText) return fromText;
        const weekNum = getISOWeek(d);
        const weekYear = getISOWeekYear(d);
        const weekStr = ("0" + weekNum).slice(-2);
        return `Minggu ke-${weekStr} (${weekYear})`;
      }

      // 1. Fetch from PostgreSQL tickets (Temuan & Closing)
      const allFindingTickets = await db.select().from(tickets).where(eq(tickets.source, 'inspeksi')).orderBy(desc(tickets.id));
      for (const t of allFindingTickets) {
        const dateObj = t.date ? new Date(t.date) : new Date();
        const tglFormatted = dateObj.toLocaleDateString('id-ID');
        let weekLabel = getISOWeekLabel(dateObj, t.ticketId);

        if (t.photoUrl && t.photoUrl !== '-' && !seenUrls.has(t.photoUrl.trim())) {
          seenUrls.add(t.photoUrl.trim());
          allGallery.push({
            url: t.photoUrl.trim(),
            week: weekLabel,
            sumber: 'Temuan K3',
            area: `${t.location || 'Area'} - ${t.description || 'Temuan'}`,
            inspektor: t.requestorName || '-',
            tanggal: tglFormatted,
            ticketId: t.ticketId,
            timestamp: dateObj.getTime()
          });
        }

        if (t.closingPhoto && t.closingPhoto !== '-' && !seenUrls.has(t.closingPhoto.trim())) {
          seenUrls.add(t.closingPhoto.trim());
          allGallery.push({
            url: t.closingPhoto.trim(),
            week: weekLabel,
            sumber: 'Bukti Perbaikan K3',
            area: `[Selesai] ${t.location || 'Area'} - ${t.actionTaken || t.description || 'Telah Diperbaiki'}`,
            inspektor: t.pic || t.requestorName || '-',
            tanggal: t.completionDate ? new Date(t.completionDate).toLocaleDateString('id-ID') : tglFormatted,
            ticketId: t.ticketId,
            timestamp: t.completionDate ? new Date(t.completionDate).getTime() : dateObj.getTime()
          });
        }
      }

      function getSumberCategory(sheetName: string, area: string, defaultSumber: string): string {
        if (sheetName === 'Log_Umum') {
          const a = (area || '').toLowerCase();
          if (a.includes('preparasi') || a.includes('prep')) return 'Inspeksi Prep';
          if (a.includes('gudang')) return 'Inspeksi Gudang';
          if (a.includes('maintenance') || a.includes('workshop') || a.includes('carpenter')) return 'Inspeksi Maintenance';
          if (a.includes('r.') || a.includes('lab') || a.includes('xrf') || a.includes('fusion') || a.includes('press') || a.includes('chiller') || a.includes('office') || a.includes('ruang')) return 'Inspeksi Lab';
          return 'Inspeksi Umum';
        }
        return defaultSumber;
      }

      // 2. Fetch from Google Sheets for all Form Logs
      const spreadsheetId = '1vG6iSl8uPHhwtH2tGUlyb0l4IK3r3ZhavtkkdHhEmP0';
      const sheetConfigs = [
        { sheet: 'Log_Umum', sumber: 'Inspeksi Umum', photoKeys: ['URL_Foto_Bukti'], areaKey: 'Lokasi_Spesifik', inspKey: 'Nama_Inspektur', dateKey: 'Timestamp', descKey: 'Catatan_Temuan', idKey: 'ID_Inspeksi' },
        { sheet: 'Log_APD', sumber: 'Kepatuhan APD', photoKeys: ['Foto Inspeksi'], areaKey: 'Bagian', inspKey: 'Nama Inspektor 1', dateKey: 'Tanggal', descKey: 'Kategori_Laporan', idKey: 'Kategori_Laporan' },
        { sheet: 'Log_P3K', sumber: 'Kotak P3K', photoKeys: ['Foto Proses', 'Foto Temuan 1', 'Foto Temuan 2'], areaKey: 'Judul Form', inspKey: 'Inspektor 1', dateKey: 'Tanggal', descKey: 'Item P3K', idKey: 'Judul File' },
        { sheet: 'Log_Perkakas', sumber: 'Peralatan & Perkakas', photoKeys: ['Foto_Proses', 'Foto_Temuan_1', 'Foto_Temuan_2'], areaKey: 'Nama Perkakas', inspKey: 'Inspektor 1', dateKey: 'Tanggal', descKey: 'Catatan', idKey: 'Judul Form' },
        { sheet: 'Log_Tabung', sumber: 'Tabung Gas', photoKeys: ['Foto_Proses', 'Foto_Temuan_1', 'Foto_Temuan_2'], areaKey: 'Judul Form', inspKey: 'Inspektor 1', dateKey: 'Tanggal', descKey: 'Keterangan', idKey: 'Judul Form' },
        { sheet: 'Log_Sarana', sumber: 'Sarana Unit', photoKeys: ['Foto_Proses', 'Foto_Temuan_1', 'Foto_Temuan_2'], areaKey: 'Unit Sarana', inspKey: 'Inspektor 1', dateKey: 'Tanggal', descKey: 'Catatan', idKey: 'Judul Form' },
        { sheet: 'Log_Tangga', sumber: 'Tangga Portabel', photoKeys: ['Foto_Proses', 'Foto_Temuan_1', 'Foto_Temuan_2'], areaKey: 'No Registrasi', inspKey: 'Inspektor 1', dateKey: 'Tanggal', descKey: 'Catatan', idKey: 'Nama File' }
      ];

      await Promise.all(sheetConfigs.map(async (cfg) => {
        try {
          const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${cfg.sheet}`;
          const res = await fetch(url);
          const text = await res.text();
          const records = parse(text, { columns: true, skip_empty_lines: true });

          records.forEach((r: any) => {
            const idText = (cfg.idKey && r[cfg.idKey]) || r['ID_Inspeksi'] || r['Ticket_ID'] || r['Judul File'] || r['Nama File'] || '';
            const dateStr = r[cfg.dateKey] || r['Tanggal'] || r['Timestamp'] || '';
            const dObj = parseCustomDate(dateStr);
            const weekLabel = getISOWeekLabel(dObj, idText);
            const dateFormatted = dObj.toLocaleDateString('id-ID');
            const inspector = r[cfg.inspKey] || r['Inspektor'] || r['Nama Inspektur'] || 'Inspector';
            const rawArea = r[cfg.areaKey] || r['Area'] || r['Lokasi'] || cfg.sumber;
            const categorySumber = getSumberCategory(cfg.sheet, rawArea, cfg.sumber);
            const deskripsi = r[cfg.descKey] || r['Deskripsi_Temuan'] || r['Catatan'] || '-';

            cfg.photoKeys.forEach(pk => {
              const photoUrl = r[pk];
              if (photoUrl && photoUrl.trim() !== '' && photoUrl !== '-' && !photoUrl.startsWith('GAS_') && !seenUrls.has(photoUrl.trim())) {
                seenUrls.add(photoUrl.trim());
                allGallery.push({
                  url: photoUrl.trim(),
                  week: weekLabel,
                  sumber: categorySumber,
                  area: `${categorySumber}: ${rawArea}${deskripsi && deskripsi !== '-' ? ` (${deskripsi})` : ''}`,
                  inspektor: inspector,
                  tanggal: dateFormatted,
                  timestamp: dObj.getTime()
                });
              }
            });
          });
        } catch(e) {
          console.error(`Gallery error fetching ${cfg.sheet}:`, e);
        }
      }));

      // Sort descending by timestamp
      allGallery.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      // Cache the full aggregated list
      galleryCache = { data: allGallery, timestamp: Date.now() };

      // Compute available weeks
      const weeksSet = new Set<string>();
      allGallery.forEach(p => { if (p.week) weeksSet.add(p.week); });
      const availableWeeks = Array.from(weeksSet).sort((a, b) => b.localeCompare(a));
      const defaultWeek = availableWeeks[0] || 'Minggu ke-34 (2026)';
      const reqWeek = (req.query.week as string) || defaultWeek;

      const filteredPhotos = reqWeek === 'ALL' ? allGallery : allGallery.filter(p => p.week === reqWeek);

      return res.json({
        currentWeek: reqWeek,
        availableWeeks,
        totalPhotos: allGallery.length,
        photos: filteredPhotos
      });
    } catch (error) {
      console.error("Gallery aggregation error:", error);
      res.status(500).json({ error: "Failed to fetch gallery" });
    }
  });

router.post("/api/pdf/generate", async (req, res) => {
    try {
      const { tglMulai, tglAkhir, tipeLaporan } = req.body;
      let data = await db.select().from(pemantauan);
      
      // Filter by date
      if (tglMulai && tglAkhir) {
        const start = new Date(tglMulai);
        const end = new Date(tglAkhir);
        end.setHours(23, 59, 59, 999);
        data = data.filter(d => {
          const dDate = new Date(d.tanggal || (d as any).date);
          return dDate >= start && dDate <= end;
        });
      }
      
      // Filter by type
      if (tipeLaporan === 'SUHU') {
        data = data.filter(d => d.kategori === 'Suhu & Kelembapan');
      } else if (tipeLaporan === 'GAS') {
        data = data.filter(d => d.kategori === 'Gas' || d.kategori === 'Gas Medis');
      }

      if (data.length === 0) {
        return res.status(404).json({ status: "error", message: "Tidak ada data " + tipeLaporan + " pada rentang waktu tersebut." });
      }

      // Group by location
      const dataPerLokasi = {};
      data.forEach(row => {
        const loc = (row as any).lokasi || '-';
        if (!dataPerLokasi[loc]) dataPerLokasi[loc] = [];
        dataPerLokasi[loc].push(row);
      });

      // Fetch settings from DB for Template IDs
      const settingsObj = {};
      const allSettings = await db.select().from(appSettings);
      allSettings.forEach(s => {
        settingsObj[s.settingKey] = s.settingValue || '';
      });

      const TEMPLATE_SUHU_ID = settingsObj['INSPECTION_SUHU_TEMPLATE_DOC_ID'] || '1NEmvv2ZzVICoU_3TZWsdfIQNqc2pq6gLZnJHNFLbezk';
      const TEMPLATE_GAS_ID = settingsObj['INSPECTION_GAS_TEMPLATE_DOC_ID'] || '1EzTAqn_8Xm0zL3Eo9kqMrbWT-GAGDVuwAVXP8kiUY44';
      const FOLDER_ID = settingsObj['INSPECTION_PDF_DRIVE_FOLDER_ID'] || process.env.GOOGLE_DRIVE_FOLDER_ID || '1hRG-NQ5GWCkzHCSjwJw7kIaDcS7l3_ij';

      const pdfLinks = [];
      const parts = tglMulai.split("-");
      const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      const bulanTeks = parts.length === 3 ? (namaBulan[parseInt(parts[1], 10) - 1] + " " + parts[0]) : tglMulai;
      const periodeTeks = tglMulai + " s.d " + tglAkhir;

      for (const lokasi in dataPerLokasi) {
        const rows = dataPerLokasi[lokasi];
        const templateId = (tipeLaporan === "SUHU") ? TEMPLATE_SUHU_ID : TEMPLATE_GAS_ID;
        
        let instr = lokasi;
        let gasType = "-";
        
        if (tipeLaporan === "GAS") {
           if (lokasi.includes("Zetium A")) { instr = 'Zetium "Panalytical" (A)'; gasType = "Argon Mixture Methane 10% P10"; }
           else if (lokasi.includes("Zetium B")) { instr = 'Zetium "Panalytical" (B)'; gasType = "Argon Mixture Methane 10% P10"; }
           else if (lokasi.includes("Epsilon C")) { instr = 'Epsilon "Panalytical" (C)'; gasType = "Helium"; }
           else { instr = lokasi.replace("Tabung Gas", "").trim(); }
        }

        // We join the values with newlines so they look like a table column
        const replacements = {};
        
        if (tipeLaporan === "SUHU") {
           replacements['<<Ruangan>>'] = lokasi;
           replacements['<<Periode>>'] = periodeTeks;
           
           replacements['<<Tanggal>>'] = rows.map(d => {
             const dt = new Date(d.tanggal || (d as any).date);
             const m = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
             return dt.getDate() + "-" + m[dt.getMonth()] + "-" + dt.getFullYear().toString().substring(2);
           }).join("");
           
           replacements['<<Shift>>'] = rows.map(d => d.shift || "-").join("");
           replacements['<<Petugas>>'] = rows.map(d => d.inspectorName || "-").join("");
           
           replacements['<<Jam>>'] = rows.map(d => {
             const dt = new Date(d.tanggal || (d as any).date);
             return dt.getHours().toString().padStart(2, '0') + ":" + dt.getMinutes().toString().padStart(2, '0');
           }).join("");
           
           replacements['<<Suhu>>'] = rows.map(d => d.suhu || "-").join("");
           replacements['<<Kelembapan>>'] = rows.map(d => d.kelembapan ? (d.kelembapan + "") : "-").join("");
           replacements['<<TTD>>'] = rows.map(d => "").join("");
           
        } else {
           replacements['<<Instrument>>'] = instr;
           replacements['<<TipeGas>>'] = gasType;
           replacements['<<Bulan>>'] = bulanTeks;
           
           replacements['<<No>>'] = rows.map((_, i) => (i+1).toString()).join("");
           
           replacements['<<Date>>'] = rows.map(d => {
             const dt = new Date(d.tanggal || (d as any).date);
             const m = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
             const dateStr = dt.getDate() + "-" + m[dt.getMonth()] + "-" + dt.getFullYear().toString().substring(2);
             const timeStr = dt.getHours().toString().padStart(2, '0') + ":" + dt.getMinutes().toString().padStart(2, '0');
             return dateStr + "" + timeStr;
           }).join("");
           
           replacements['<<Flow>>'] = rows.map(d => d.flow || "-").join("");
           replacements['<<Pressure>>'] = rows.map(d => d.tekananGas || "-").join("");
           replacements['<<Shift>>'] = rows.map(d => d.shift || "-").join("");
           replacements['<<PIC>>'] = rows.map(d => d.inspectorName || "-").join("");
           replacements['<<Remark>>'] = rows.map(d => d.notes || "-").join("");
           replacements['<<TTD>>'] = rows.map(d => "").join("");
           
           replacements['<<Y>>'] = rows.map(d => (d.kebocoran === "Y" || d.kebocoran === "Ya") ? "V" : "-").join("");
           replacements['<<N>>'] = rows.map(d => (d.kebocoran === "N" || d.kebocoran === "Tidak") ? "V" : "-").join("");
        }
        
        const safeName = lokasi.replace(/[^a-zA-Z0-9_]/g, '_'); 
        const targetName = "Laporan_Pemantauan_" + tipeLaporan + "_" + safeName;
        
        // Use our google-services function
        const pdfRes = await generatePdfFromTemplate(
           templateId,
           FOLDER_ID,
           replacements,
           targetName
        );
        
        if (pdfRes.success) {
           pdfLinks.push({ name: lokasi, url: pdfRes.pdfUrl });
        }
      }

      res.json({
        status: "success",
        message: "OK",
        links: pdfLinks
      });

    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.get("/api/questions",
 async (req, res) => {
    const data = await db.select().from(questions);
    res.json(data);
  });

router.get("/api/notes", async (req, res) => {
    try {
      const data = await db.select().from(privateNotes);
      res.json({ status: "success", data });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.post("/api/notes", async (req, res) => {
    try {
      if (req.body.id) {
         // upsert behavior
         const exists = await db.select().from(privateNotes).where(eq(privateNotes.id, req.body.id));
         if (exists.length > 0) {
            await db.update(privateNotes).set(req.body).where(eq(privateNotes.id, req.body.id));
         } else {
            await db.insert(privateNotes).values(req.body);
         }
      } else {
        req.body.id = 'note_' + Date.now();
        await db.insert(privateNotes).values(req.body);
      }
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.delete("/api/notes/:id", async (req, res) => {
    try {
      await db.delete(privateNotes).where(eq(privateNotes.id, req.params.id));
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.get("/api/themes/templates", async (req, res) => {
  try {
    const { nik } = req.query;
    const data = await db.select().from(userThemes).orderBy(desc(userThemes.publishedAt), desc(userThemes.id));
    
    const customTemplates: any[] = [];
    const communityThemes: any[] = [];
    
    data.forEach(t => {
      let parsedColors = {};
      try {
        parsedColors = typeof t.colors === 'string' ? JSON.parse(t.colors) : (t.colors || {});
      } catch (e) {
        parsedColors = {};
      }

      const item = {
        id: t.id,
        name: t.themeName || 'Tema Kustom',
        mode: t.mode,
        nik: t.nik,
        authorName: t.authorName || t.nik || 'Anggota Lab',
        isPublished: Boolean(t.isPublished),
        publishedAt: t.publishedAt,
        colors: parsedColors
      };

      if (t.isPublished) {
        communityThemes.push(item);
      }
      
      if (t.mode.startsWith('template:') || t.mode === 'custom_template' || t.mode === 'custom_templates') {
        if (!nik || t.nik === String(nik)) {
          customTemplates.push(item);
        }
      }
    });

    res.json({ status: "success", customTemplates, communityThemes, data: communityThemes });
  } catch (error: any) {
    console.warn("Themes templates fetch warning:", error.message);
    res.json({ status: "success", customTemplates: [], communityThemes: [], data: [] });
  }
});

router.get("/api/themes/community", async (req, res) => {
    try {
      const data = await db.select().from(userThemes).where(eq(userThemes.isPublished, true)).orderBy(desc(userThemes.publishedAt), desc(userThemes.id));
      const communityThemes = data.map(t => {
        let parsedColors = {};
        try {
          parsedColors = typeof t.colors === 'string' ? JSON.parse(t.colors) : (t.colors || {});
        } catch (e) {
          parsedColors = {};
        }
        return {
          id: t.id,
          name: t.themeName || 'Tema Komunitas',
          mode: t.mode,
          nik: t.nik,
          authorName: t.authorName || t.nik || 'Anggota Lab',
          publishedAt: t.publishedAt,
          colors: parsedColors
        };
      });
      res.json({ status: "success", data: communityThemes });
    } catch (error: any) {
      console.warn("Themes community fetch warning:", error.message);
      res.json({ status: "success", data: [] });
    }
  });

router.get("/api/themes/:nik", async (req, res) => {
    try {
      const nikParam = req.params.nik;
      if (!nikParam || nikParam === 'templates') {
        return res.json({ status: "success", data: {}, customTemplates: [], communityThemes: [] });
      }

      const data = await db.select().from(userThemes).where(eq(userThemes.nik, nikParam));
      const themes: Record<string, any> = {};
      const customTemplates: Array<{ id: number; name: string; mode: string; colors: any; isPublished?: boolean; authorName?: string; publishedAt?: any }> = [];
      
      data.forEach(t => {
        let parsedColors = {};
        try {
          parsedColors = typeof t.colors === 'string' ? JSON.parse(t.colors) : (t.colors || {});
        } catch (e) {
          parsedColors = {};
        }

        if (t.mode.startsWith('template:') || t.mode === 'custom_template' || t.mode === 'custom_templates') {
          customTemplates.push({
            id: t.id,
            name: t.themeName || 'Kustom Tema',
            mode: t.mode,
            isPublished: Boolean(t.isPublished),
            authorName: t.authorName || '',
            publishedAt: t.publishedAt,
            colors: parsedColors
          });
        } else {
          themes[t.mode] = { id: t.id, themeName: t.themeName, colors: parsedColors };
        }
      });

      // Also fetch community themes safely
      let communityThemes: any[] = [];
      try {
        const commData = await db.select().from(userThemes).where(eq(userThemes.isPublished, true)).orderBy(desc(userThemes.publishedAt), desc(userThemes.id));
        communityThemes = commData.map(t => {
          let parsedColors = {};
          try {
            parsedColors = typeof t.colors === 'string' ? JSON.parse(t.colors) : (t.colors || {});
          } catch (e) {
            parsedColors = {};
          }
          return {
            id: t.id,
            name: t.themeName || 'Tema Komunitas',
            mode: t.mode,
            nik: t.nik,
            authorName: t.authorName || t.nik || 'Anggota Lab',
            publishedAt: t.publishedAt,
            colors: parsedColors
          };
        });
      } catch (err: any) {
        console.warn("Error fetching community themes:", err.message);
      }

      res.json({ status: "success", data: themes, customTemplates, communityThemes });
    } catch (error: any) {
      console.warn("Themes fetch warning:", error.message);
      res.json({ status: "success", data: {}, customTemplates: [], communityThemes: [] });
    }
  });

router.post("/api/themes", async (req, res) => {
    try {
      const { nik, mode, themeName, colors, applyToAll } = req.body;
      if (!nik) {
        return res.status(400).json({ status: "error", message: "NIK is required" });
      }

      // Always apply to morning, afternoon, evening so active theme is persistent across all hours
      const modes = (applyToAll || applyToAll === undefined) ? ['morning', 'afternoon', 'evening'] : [mode || 'morning'];
      for (const m of modes) {
        const exists = await db.select().from(userThemes).where(and(eq(userThemes.nik, nik), eq(userThemes.mode, m)));
        if (exists.length > 0) {
          await db.update(userThemes).set({ themeName: themeName || m, colors: JSON.stringify(colors), updatedAt: new Date() }).where(eq(userThemes.id, exists[0].id));
        } else {
          await db.insert(userThemes).values({ nik, mode: m, themeName: themeName || m, colors: JSON.stringify(colors) });
        }
      }
      return res.json({ status: "success", message: "Tema berhasil diterapkan dan disimpan!" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.post("/api/themes/templates", async (req, res) => {
    try {
      const { nik, id, name, colors, isPublished, authorName, applyActive } = req.body;
      if (!nik) return res.status(400).json({ status: "error", message: "NIK is required" });

      // Resolve author name
      let resolvedAuthor = authorName;
      if (!resolvedAuthor && nik) {
        try {
          const emp = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
          if (emp.length > 0 && emp[0].nama) {
            resolvedAuthor = emp[0].nama;
          } else {
            const usr = await db.select().from(users).where(eq(users.nik, nik)).limit(1);
            if (usr.length > 0) resolvedAuthor = usr[0].username || usr[0].nama;
          }
        } catch (e) {}
      }
      if (!resolvedAuthor) resolvedAuthor = nik || 'Anggota Lab';
      
      let savedTemplate;
      if (id) {
        // Update existing template
        const updateData: any = {
          themeName: name || 'Kustom Template',
          colors: JSON.stringify(colors),
          updatedAt: new Date()
        };
        if (isPublished !== undefined) {
          updateData.isPublished = Boolean(isPublished);
          updateData.authorName = resolvedAuthor;
          if (isPublished) updateData.publishedAt = new Date();
        }

        await db.update(userThemes).set(updateData).where(and(eq(userThemes.id, id), eq(userThemes.nik, nik)));
      } else {
        // Insert new custom template
        const templateMode = `template:${Date.now()}`;
        const result = await db.insert(userThemes).values({
          nik,
          mode: templateMode,
          themeName: name || 'Template Kustom',
          colors: JSON.stringify(colors),
          isPublished: Boolean(isPublished),
          authorName: Boolean(isPublished) ? resolvedAuthor : null,
          publishedAt: Boolean(isPublished) ? new Date() : null
        }).returning();
        savedTemplate = result[0];
      }

      // Also set as active theme across morning, afternoon, evening
      if (applyActive || applyActive === undefined) {
        const modes = ['morning', 'afternoon', 'evening'];
        for (const m of modes) {
          const exists = await db.select().from(userThemes).where(and(eq(userThemes.nik, nik), eq(userThemes.mode, m)));
          if (exists.length > 0) {
            await db.update(userThemes).set({ themeName: name || m, colors: JSON.stringify(colors), updatedAt: new Date() }).where(eq(userThemes.id, exists[0].id));
          } else {
            await db.insert(userThemes).values({ nik, mode: m, themeName: name || m, colors: JSON.stringify(colors) });
          }
        }
      }

      return res.json({ 
        status: "success", 
        message: isPublished ? "Tema berhasil disimpan dan dipublikasikan ke Komunitas!" : "Template kustom berhasil disimpan!", 
        template: savedTemplate 
      });
    } catch (error: any) {
      console.error("Error saving theme template:", error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.post("/api/themes/templates/:id/publish", async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const { nik, isPublished, authorName } = req.body;
      if (!templateId) return res.status(400).json({ status: "error", message: "ID template tidak valid" });
      if (!nik) return res.status(400).json({ status: "error", message: "NIK is required" });

      let resolvedAuthor = authorName;
      if (!resolvedAuthor && nik) {
        try {
          const emp = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
          if (emp.length > 0 && emp[0].nama) {
            resolvedAuthor = emp[0].nama;
          } else {
            const usr = await db.select().from(users).where(eq(users.nik, nik)).limit(1);
            if (usr.length > 0) resolvedAuthor = usr[0].username || usr[0].nama;
          }
        } catch (e) {}
      }
      if (!resolvedAuthor) resolvedAuthor = nik || 'Anggota Lab';

      const willPublish = isPublished !== undefined ? Boolean(isPublished) : true;
      const updateData: any = {
        isPublished: willPublish,
        authorName: willPublish ? resolvedAuthor : null,
        publishedAt: willPublish ? new Date() : null,
        updatedAt: new Date()
      };

      await db.update(userThemes).set(updateData).where(and(eq(userThemes.id, templateId), eq(userThemes.nik, nik)));
      res.json({ 
        status: "success", 
        message: willPublish 
          ? `Tema berhasil dipublish ke publik atas nama "${resolvedAuthor}"!` 
          : "Tema ditarik dari publik (hanya terlihat oleh Anda)." 
      });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.delete("/api/themes/templates/:id", async (req, res) => {
    try {
      const { nik } = req.query;
      const templateId = parseInt(req.params.id);
      if (!templateId) return res.status(400).json({ status: "error", message: "ID template tidak valid" });
      
      let deleteQuery;
      if (nik) {
        deleteQuery = and(eq(userThemes.id, templateId), eq(userThemes.nik, String(nik)));
      } else {
        deleteQuery = eq(userThemes.id, templateId);
      }
      await db.delete(userThemes).where(deleteQuery);
      res.json({ status: "success", message: "Template berhasil dihapus!" });
    } catch (error: any) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.post('/api/induksi', async (req, res) => {
    try {
      const data = req.body;
      const folderId = '1EbAb6E54BxU52K-lJ1uTS9lwd8l3p8m3';
      
      let templateId = '11tOGmxxLcnhE9WiHzI7O4Qya-iefb04at1ejXsIMPlI'; // TBP
      let awalanFile = "TBP-";
      
      if (data.perusahaan === "PT. GPS") {
        templateId = '1Fq6WUEXW3H1YZFrOAHAu8P_2nc7WJBf8W60iZfyPkDg';
        awalanFile = "GPS-";
      }
      
      const jenisFile = (data.tipe_A === "✔") ? "Karyawan Baru" : "Karyawan Balik Cuti";
      const divisiFile = data.divisi || "General"; 
      const namaBaru = awalanFile + " Induksi " + jenisFile + " " + divisiFile + " " + data.namaPeserta;

      const dateString = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jayapura" }); // WIT

      const replacements = {
        '<<A>>': data.tipe_A || '',
        '<<B>>': data.tipe_B || '',
        '<<Nama Peserta>>': data.namaPeserta || '',
        '<<Nomor ID Card>>': data.nik || '',
        '<<Jabatan>>': data.jabatanPeserta || '',
        '<<Nama Induktor>>': data.namaInduktor || '',
        '<<Jabatan Induktor>>': data.jabatanInduktor || '',
        '<<Timestamp>>': dateString,
      };

      for (let i = 1; i <= 16; i++) {
        replacements['<<' + i + '>>'] = data['m' + i] || '';
      }

      // Upload images temporarily to Google Drive
      const uploadBase64 = async (b64, name) => {
        if (!b64) return null;
        try {
          const base64Clean = b64.replace(/^data:.*?;base64,/, "");
          const buffer = Buffer.from(base64Clean, 'base64');
          
          const stream = new Readable();
          stream.push(buffer);
          stream.push(null);
          
          const fileRes = await drive.files.create({
            requestBody: { name: `temp_${name}` },
            media: { mimeType: 'image/png', body: stream },
            fields: 'id'
          });
          
          const fileId = fileRes.data.id;
          
          await drive.permissions.create({
            fileId: fileId,
            requestBody: { role: 'reader', type: 'anyone' }
          });
          
          return { url: `https://drive.google.com/uc?export=download&id=${fileId}`, id: fileId };
        } catch (err) {
          console.error("Google Drive upload error", err);
          return null;
        }
      };

      const [fotoA, fotoB, fotoDok] = await Promise.all([
        uploadBase64(data.ttdPeserta, 'ttd_peserta.png'),
        uploadBase64(data.ttdInduktor, 'ttd_induktor.png'),
        uploadBase64(data.fotoDokumentasi, 'dokumentasi.png')
      ]);

      const images = {};
      if (fotoA) images['<<FOTOA>>'] = fotoA.url;
      if (fotoB) images['<<FOTOB>>'] = fotoB.url;
      if (fotoDok) images['<<DOKUMENTASI>>'] = fotoDok.url;

      // Generate PDF
      const pdfResult = await generatePdfFromTemplate(templateId, folderId, replacements, namaBaru, images);
      
      // Cleanup temporary images from Google Drive
      const cleanupIds = [fotoA?.id, fotoB?.id, fotoDok?.id].filter(Boolean);
      for (const id of cleanupIds) {
          try {
              await drive.files.delete({ fileId: id });
          } catch(e) {
              console.error("Failed to delete temp image:", id);
          }
      }

      // Save to Database
      const materiData = {};
      for (let i = 1; i <= 16; i++) materiData['m'+i] = data['m'+i] || '';

      await db.insert(induksi).values({
        tipeInduksi: data.tipe_A === "✔" ? "Induksi Lengkap" : "Induksi Singkat",
        perusahaan: data.perusahaan,
        namaPeserta: data.namaPeserta,
        nikPeserta: data.nik,
        jabatanPeserta: data.jabatanPeserta,
        // divisi: data.divisi, // not in schema
        namaInduktor: data.namaInduktor,
        jabatanInduktor: data.jabatanInduktor,
        tanggal: dateString, // explicitly set tanggal to avoid null/default error if any
        materiData: materiData, // Pass the object directly for JSON column
        // fotoDokumentasi: data.fotoDokumentasi ? "Ada" : "Tidak Ada", // not in schema
        pdfUrl: pdfResult.pdfUrl,
        pdfId: pdfResult.pdfId
      });

      // Update Master Karyawan
      if (data.tipe_A === "✔" && data.nik) {
         const existing = await db.select().from(employees).where(eq(employees.nik, data.nik));
         if (existing.length === 0) {
            await db.insert(employees).values({
               name: data.namaPeserta,
               nik: data.nik,
               jabatan: data.jabatanPeserta,
               pt: data.perusahaan,
               section: data.divisi
            });
         }
      }

      // Fonnte Notification
      const jenis = data.tipe_A === "✔" ? "Karyawan Baru" : "Karyawan Balik Cuti";
      const pesan = "*LAPORAN INDUKSI KARYAWAN DITERIMA*\n\n" +
            "*Data Peserta:*\n" +
            "• Nama: " + data.namaPeserta + "\n" +
            "• NIK: " + data.nik + "\n" +
            "• Jabatan: " + data.jabatanPeserta + "\n" +
            "• Perusahaan: " + data.perusahaan + "\n\n" +
            "*Detail Pelaksanaan:*\n" +
            "• Jenis Induksi: " + jenis + "\n" +
            "• Waktu Pelaksanaan: " + dateString + "\n" +
            "• Induktor: " + data.namaInduktor + "\n\n" +
            "*Link Dokumen:* \n" + pdfResult.pdfUrl;

      try {
        const token = process.env.FONNTE_TOKEN || "VAiWtn353aJHVUKYnggW";
        const target = process.env.FONNTE_TARGET || "120363046179027956@g.us";

        await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: {
            "Authorization": token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ target, message: pesan })
        });
      } catch(e) { console.error("Fonnte error", e); }

      res.json({ success: true, pdfUrl: pdfResult.pdfUrl, waMessageText: pesan });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ success: false, error: e.message });
    }
  });
