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

router.get("/api/gallery", async (req, res) => {
    try {
      const settingsObj: any = {};
      const allSettings = await db.select().from(appSettings);
      allSettings.forEach((s: any) => { settingsObj[s.settingKey] = s.settingValue || ''; });
      
      const gasUrl = settingsObj['GAS_WEB_APP_URL'] || process.env.GAS_WEB_APP_URL;
      
      if (gasUrl) {
          const payload = { action: "getGalleryPhotos" };
          const gasRes = await fetch(gasUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify(payload)
          });
          const text = await gasRes.text();
          try {
             const json = JSON.parse(text);
             if (json.success && json.data) {
                 return res.json(json.data);
             }
          } catch(e) {}
      }
      res.json([]);
    } catch (error) {
      console.error(error);
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

router.get("/api/themes/:nik", async (req, res) => {
    try {
      const data = await db.select().from(userThemes).where(eq(userThemes.nik, req.params.nik));
      const themes = {};
      data.forEach(t => {
        themes[t.mode] = { themeName: t.themeName, colors: JSON.parse(t.colors) };
      });
      res.json({ status: "success", data: themes });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

router.post("/api/meal-reports", async (req, res) => {
    try {
      const result = await db.insert(mealReports).values(req.body).returning();
      
      let mealsInfo = "";
      if (req.body.meals) {
        try {
           const parsedMeals = JSON.parse(req.body.meals);
           mealsInfo = parsedMeals.length > 0 ? ` [Makan: ${parsedMeals.join(', ')}]` : '';
        } catch(e) {}
      }

      // Also send a notification to the admin/HR about this food report
      const _n = await db.insert(notifications).values({
        title: "Pelaporan Status Makan Baru",
        message: `${req.body.name} (${req.body.status}) untuk tanggal ${req.body.reportDate} | Shift: ${req.body.shift}${mealsInfo}`,
        type: 'info',
        role: 'Administration',
        link: '/adm-dashboard'
      }).returning(); sendWebPush(_n);
      

      res.status(201).json({ status: "success", data: result[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Failed to create meal report" });
    }
  });

router.post("/api/themes", async (req, res) => {
    try {
      const { nik, mode, themeName, colors } = req.body;
      const exists = await db.select().from(userThemes).where(eq(userThemes.nik, nik));
      const match = exists.find(e => e.mode === mode);
      if (match) {
        await db.update(userThemes).set({ themeName, colors: JSON.stringify(colors) }).where(eq(userThemes.id, match.id));
      } else {
        await db.insert(userThemes).values({ nik, mode, themeName, colors: JSON.stringify(colors) });
      }
      res.json({ status: "success" });
    } catch (error) {
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
