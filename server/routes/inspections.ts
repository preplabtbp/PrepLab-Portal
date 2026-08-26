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

router.post("/api/inspections/universal", async (req, res) => {
    try {
      const { finalData, ttd1, ttd2, ttd3, fotoTemuanArray, fotoProses } = req.body;
      
      let pdfUrl = null;
      let linkPdf2 = null;
      
      // Load GAS URL from settings
      const settingsObj: any = {};
      const allSettings = await db.select().from(appSettings);
      allSettings.forEach((s: any) => { settingsObj[s.settingKey] = s.settingValue || ''; });
      
      const gasUrl = settingsObj['GAS_WEB_APP_URL'] || process.env.GAS_WEB_APP_URL;
      
      let finalTtd1 = ttd1;
      let finalTtd2 = ttd2;
      let finalTtd3 = ttd3;
      let finalFotoProses = fotoProses;
      let finalFotoTemuanArray = fotoTemuanArray;

      if (gasUrl) {
          try {
              console.log("Forwarding to GAS Web App...");
              // We inject devOptions to ensure GAS returns verbose logs or URLs if possible
              const payloadToGas = {
                  action: "submitInspeksiUniversal",
                  finalData: {
                      ...finalData,
                      devOptions: { isDev: true, db: true, pdf: true, verboseLog: true }
                  },
                  ttd1, ttd2, ttd3, fotoTemuanArray, fotoProses
              };

              const gasRes = await fetch(gasUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain' },
                  body: JSON.stringify(payloadToGas)
              });
              
              const gasText = await gasRes.text();
              console.log("GAS Response (Universal):", gasText.substring(0, 200));
              try {
                  const gasData = JSON.parse(gasText);
                  if (gasData.success && gasData.data) {
                     let parsedData = gasData.data;
                     if (typeof parsedData === 'string' && parsedData.startsWith('{')) {
                        parsedData = JSON.parse(parsedData);
                     }
                     
                     if (parsedData.urlTTD1 && parsedData.urlTTD1 !== '-') finalTtd1 = parsedData.urlTTD1;
                     if (parsedData.urlTTD2 && parsedData.urlTTD2 !== '-') finalTtd2 = parsedData.urlTTD2;
                     if (parsedData.urlTTD3 && parsedData.urlTTD3 !== '-') finalTtd3 = parsedData.urlTTD3;
                     if (parsedData.urlFP && parsedData.urlFP !== '-') finalFotoProses = parsedData.urlFP;
                     if (parsedData.urlT1 || parsedData.urlT2 || parsedData.urlT3) {
                         finalFotoTemuanArray = [
                             parsedData.urlT1 && parsedData.urlT1 !== '-' ? parsedData.urlT1 : (fotoTemuanArray?.[0] || ''),
                             parsedData.urlT2 && parsedData.urlT2 !== '-' ? parsedData.urlT2 : (fotoTemuanArray?.[1] || ''),
                             parsedData.urlT3 && parsedData.urlT3 !== '-' ? parsedData.urlT3 : (fotoTemuanArray?.[2] || '')
                         ];
                     }

                     if (parsedData.pdfUrl && parsedData.pdfUrl !== '-') pdfUrl = parsedData.pdfUrl;
                     else if (parsedData.linkPdf1 && parsedData.linkPdf1 !== '-') pdfUrl = parsedData.linkPdf1;
                     else if (parsedData.linkPdf && parsedData.linkPdf !== '-') pdfUrl = parsedData.linkPdf;
                     else if (parsedData.fileUrl && parsedData.fileUrl !== '-') pdfUrl = parsedData.fileUrl;
                     
                     if (parsedData.linkPdf2 && parsedData.linkPdf2 !== '-') linkPdf2 = parsedData.linkPdf2;
                     else if (parsedData.pdfUrl2 && parsedData.pdfUrl2 !== '-') linkPdf2 = parsedData.pdfUrl2;
                     else if (parsedData.gpsUrl && parsedData.gpsUrl !== '-') linkPdf2 = parsedData.gpsUrl;
                     else if (parsedData.linkGps && parsedData.linkGps !== '-') linkPdf2 = parsedData.linkGps;
                     
                     // Fallback grab any HTTP URLs from parsedData
                     let urlsFound = [];
                     function deepFindUrls(obj, arr) {
                         if (typeof obj === 'string') {
                             const matches = obj.match(/https?:\/\/[^\s"',]+/g);
                             if (matches) {
                                 matches.forEach(m => arr.push(m));
                             }
                         } else if (typeof obj === 'object' && obj !== null) {
                             for (let k in obj) {
                                 deepFindUrls(obj[k], arr);
                             }
                         }
                     }
                     deepFindUrls(parsedData, urlsFound);
                     let uniqueUrls = [...new Set(urlsFound)].filter(u => u !== pdfUrl && u !== linkPdf2);
                     
                     if (!pdfUrl && uniqueUrls.length > 0) {
                         pdfUrl = uniqueUrls.shift();
                     }
                     if (!linkPdf2 && uniqueUrls.length > 0) {
                         linkPdf2 = uniqueUrls.shift();
                     }
                     
                     if (!pdfUrl && parsedData.logDetails) {
                        pdfUrl = "GAS_GENERATED";
                     }
                  }
              } catch(e) {}
              
          } catch(e) {
              console.error("Failed forwarding to GAS:", e);
          }
      }

      const result = await db.insert(inspections as any).values({
        type: finalData?.judulForm || 'Mingguan',
        inspectorName: finalData?.insp1 || 'Unknown',
        location: finalData?.lokasiUmum || 'Area',
        notes: finalData?.catatanUmum || '',
        dataF: JSON.stringify(finalData),
        pdfUrl: pdfUrl,
        pt: req.body.pt || 'TBP',
        signature: JSON.stringify({ ttd1: finalTtd1, ttd2: finalTtd2, ttd3: finalTtd3 }),
        photoUrl: JSON.stringify({ fotoTemuanArray: finalFotoTemuanArray, fotoProses: finalFotoProses })
      }).returning();
      
      
      let waMessageText = `*==== LAPORAN INSPEKSI MINGGUAN ====*\n\n`;
      waMessageText += `*Formulir*: ${finalData.judulForm || 'Inspeksi Mingguan'}\n`;
      waMessageText += `*Lokasi/Sub-Area*: ${finalData.lokasiUmum || '-'}\n`;
      waMessageText += `*Inspector Utama*: ${finalData.insp1 || '-'}\n`;
      if (finalData.insp2) waMessageText += `*Inspector Pendamping 1*: ${finalData.insp2}\n`;
      if (finalData.insp3) waMessageText += `*Inspector Pendamping 2*: ${finalData.insp3}\n`;
      
      if (finalData.catatanUmum) {
          waMessageText += `\n*Catatan Keseluruhan*:\n${finalData.catatanUmum}\n`;
      }

      // Helper function to generate standardized Ticket ID: TKT-W<week>Y<yy>-<counter>
      function generateTicketId(offset: number = 0, currentCount: number = 0) {
        const now = new Date();
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        const weekStr = weekNo < 10 ? `0${weekNo}` : `${weekNo}`;
        const yearYY = now.getFullYear().toString().slice(-2);
        
        const counter = currentCount + offset + 1;
        const counterStr = counter.toString().padStart(3, '0');
        
        return `TKT-W${weekStr}Y${yearYY}-${counterStr}`;
      }

      // Collect all temuan items from payload or explicit temuanUmum
      const allTemuan: any[] = [];

      if (finalData.temuanUmum && Array.isArray(finalData.temuanUmum)) {
          finalData.temuanUmum.forEach((t: any, i: number) => {
              if (t && (t.temuan || t.deskripsi || t.pertanyaan)) {
                  let photo = '';
                  if (t.foto && typeof t.foto === 'string' && t.foto !== '-') {
                      photo = t.foto;
                  } else if (fotoTemuanArray && fotoTemuanArray.length > i && fotoTemuanArray[i]) {
                      photo = typeof fotoTemuanArray[i] === 'string' ? fotoTemuanArray[i] : (fotoTemuanArray[i].base64 || '');
                  }

                  allTemuan.push({
                      temuan: t.temuan || t.deskripsi || t.pertanyaan,
                      risiko: t.risiko || t.risk || 'Potensi Bahaya K3',
                      pengendalian: t.pengendalian || t.initialControl || t.tindakLanjut || '-',
                      status: (t.status || 'OPEN').toUpperCase(),
                      foto: photo
                  });
              }
          });
      }

      // Auto-extract findings from specific inspection types if no explicit temuan was provided
      if (allTemuan.length === 0) {
          if (finalData.tipe === "TANGGA" && Array.isArray(finalData.payload)) {
              const p = finalData.payload[0];
              if (p && p.ket && p.ket.trim() !== '' && p.ket !== '-') {
                  allTemuan.push({
                      temuan: `Kerusakan Tangga ${p.reg || ''} (${p.lokasi || finalData.lokasiUmum || 'Area'}): ${p.ket}`,
                      risiko: 'Tergelincir / Jatuh dari Ketinggian',
                      pengendalian: 'Perbaikan / Isolasi Tangga Rusak',
                      status: 'OPEN',
                      foto: finalFotoProses
                  });
              }
          } else if (finalData.tipe === "SARANA" && Array.isArray(finalData.payload)) {
              finalData.payload.forEach((u: any) => {
                  const rusakItems: string[] = [];
                  if (u.checks) {
                      Object.keys(u.checks).forEach(k => {
                          if (u.checks[k] === '❌') rusakItems.push(k);
                      });
                  }
                  if (rusakItems.length > 0 || (u.ket && u.ket !== '-' && u.ket.trim() !== '')) {
                      allTemuan.push({
                          temuan: `Kerusakan Sarana Unit ${u.unit || ''} (${rusakItems.join(', ') || 'Komponen Rusak'}): ${u.ket || 'Perlu perbaikan'}`,
                          risiko: 'Kecelakaan Operasional Unit / Kerusakan Aset',
                          pengendalian: 'Perbaikan Unit / Tag Out',
                          status: 'OPEN',
                          foto: u.foto || finalFotoProses
                      });
                  }
              });
          } else if ((finalData.tipe === "TABUNG_MINGGUAN" || finalData.tipe === "TABUNG") && Array.isArray(finalData.payload)) {
              finalData.payload.filter((item: any) => item.jawaban === 'TIDAK').forEach((item: any) => {
                  allTemuan.push({
                      temuan: `Kendala Tabung Gas ${finalData.tabungMeta?.reg || ''} - ${item.item} (${item.hari || ''}): ${item.keterangan || '-'}`,
                      risiko: 'Kebocoran Gas / Ledakan / Keracunan',
                      pengendalian: 'Penggantian / Penanganan Khusus Tabung Gas',
                      status: 'OPEN',
                      foto: finalFotoProses
                  });
              });
          } else if (finalData.tipe === "PERKAKAS" && Array.isArray(finalData.payload)) {
              finalData.payload.filter((item: any) => {
                  const akt = parseInt(item.aktual);
                  const mx = parseInt(item.max || '4');
                  return (akt < mx && item.keterangan && item.keterangan !== '-');
              }).forEach((item: any) => {
                  allTemuan.push({
                      temuan: `Kerusakan Perkakas ${item.item} (${item.merk || '-'}, Lokasi: ${item.lokasi || '-'}): ${item.keterangan}`,
                      risiko: 'Cedera Fisik / Sengatan Listrik',
                      pengendalian: 'Perbaikan / Penggantian Perkakas',
                      status: 'OPEN',
                      foto: finalFotoProses
                  });
              });
          } else if (finalData.tipe === "P3K" && Array.isArray(finalData.payload)) {
              const p3kFindings = finalData.payload.filter((item: any) => 
                  item.ketersediaan === 'Kosong' || 
                  (item.keterangan && item.keterangan !== '-' && item.keterangan.trim() !== '')
              );
              
              if (p3kFindings.length > 0) {
                  const itemsList = p3kFindings.map((item: any) => {
                      const ket = (item.keterangan && item.keterangan !== '-' && item.keterangan.trim() !== '') 
                          ? ` (${item.keterangan.trim()})` 
                          : '';
                      const stok = item.ketersediaan === 'Kosong' ? 'Stok Kosong' : (item.ketersediaan || 'Stok Kosong');
                      return `${item.item}: ${stok}${ket}`;
                  }).join(', ');

                  const formTitle = finalData.judulForm || 'Kotak P3K';
                  const lokasi = (finalData.lokasiUmum && finalData.lokasiUmum !== '-') ? ` (${finalData.lokasiUmum})` : '';

                  allTemuan.push({
                      temuan: `${formTitle}${lokasi}: ${itemsList}`,
                      risiko: 'Keterlambatan Pertolongan Pertama Medis',
                      pengendalian: 'Restok & Pembaruan Item P3K Sesuai Standar',
                      status: 'OPEN',
                      foto: finalFotoProses
                  });
              }
          }
      }

      if (allTemuan.length > 0) {
          waMessageText += `\n*DAFTAR TEMUAN:*\n`;
          allTemuan.forEach((t: any, i: number) => {
              waMessageText += `${i + 1}. ${t.temuan}\n`;
              if (t.risiko) waMessageText += `   - Risiko: ${t.risiko}\n`;
              if (t.pengendalian) waMessageText += `   - Pengendalian: ${t.pengendalian}\n`;
          });
          
          // --- BEGIN INSERT REKAP TEMUAN KE DATABASE TICKETS ---
          try {
              const allExistingTickets = await db.select().from(tickets);
              const currentTicketCount = allExistingTickets.length;
              const inspNameOnly = (finalData.insp1 || 'Inspector').split(' | ')[0].trim();

              const ticketValues = allTemuan.map((t: any, i: number) => {
                  const isClosed = t.status === 'CLOSED';
                  return {
                      ticketId: generateTicketId(i, currentTicketCount),
                      requestorName: finalData.insp1 || 'Inspector',
                      category: finalData.judulForm || 'Inspeksi Mingguan',
                      location: finalData.lokasiUmum || 'Area',
                      description: t.temuan || 'Temuan Inspeksi',
                      risk: t.risiko || null,
                      initialControl: t.pengendalian || null,
                      source: 'inspeksi',
                      status: isClosed ? 'CLOSED' : 'OPEN',
                      priority: (t.risiko || '').toUpperCase().includes('TINGGI') ? 'High' : 'Medium',
                      pt: req.body.pt || 'TBP',
                      photoUrl: t.foto || null,
                      documentLink: (pdfUrl && pdfUrl !== 'GAS_GENERATED' && pdfUrl !== '-') ? pdfUrl : null,
                      date: new Date(),
                      completionDate: isClosed ? new Date() : null,
                      pic: isClosed ? inspNameOnly : null,
                      actionTaken: isClosed ? (t.pengendalian || '-') : null,
                      closingPhoto: isClosed ? (t.foto || pdfUrl || null) : null
                  };
              });
              
              if (ticketValues.length > 0) {
                  await db.insert(tickets).values(ticketValues);
                  console.log(`Inserted ${ticketValues.length} temuan into tickets table.`);
              }
          } catch(e) {
              console.error("Failed to insert temuan to tickets table:", e);
          }
          // --- END INSERT REKAP TEMUAN KE DATABASE TICKETS ---
          
      } else {
          waMessageText += `\n*DAFTAR TEMUAN*: Nihil\n`;
      }

      if (pdfUrl && pdfUrl !== 'GAS_GENERATED' && pdfUrl !== '-') {
          waMessageText += `\n*Dokumen Laporan TBP*:\n${pdfUrl}\n`;
      } else {
          waMessageText += `\n*Dokumen Laporan TBP*:\n(Tautan PDF akan dikirim menyusul / diproses sistem)\n`;
      }
      
      if (linkPdf2 && linkPdf2 !== 'GAS_GENERATED' && linkPdf2 !== '-') {
          waMessageText += `\n*Dokumen Laporan GPS*:\n${linkPdf2}\n`;
      } else {
          waMessageText += `\n*Dokumen Laporan GPS*:\n(Tautan PDF akan dikirim menyusul / diproses sistem)\n`;
      }
      
      res.json({ success: true, message: 'Inspeksi universal tersimpan', data: result[0], pdfUrl, waMessageText });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to save universal inspection: " + (error.message || String(error)) });
    }
  });

router.post("/api/inspections", async (req, res) => {
    try {
      const { dataF, ttd1, ttd2, ttd3, fotoProses, devOptions } = req.body;
      
      let pdfUrl = null;
      let linkPdf2 = null;
      let judulForm = "Inspeksi Mingguan";
      
      if (dataF && dataF.length > 0 && dataF[0].length > 0) {
         judulForm = dataF[0][0] || "Inspeksi Mingguan";
      }

      // Load GAS URL from settings
      const settingsObj: any = {};
      const allSettings = await db.select().from(appSettings);
      allSettings.forEach((s: any) => { settingsObj[s.settingKey] = s.settingValue || ''; });
      
      const gasUrl = settingsObj['GAS_WEB_APP_URL'] || process.env.GAS_WEB_APP_URL;
      
      let finalTtd1 = ttd1;
      let finalTtd2 = ttd2;
      let finalTtd3 = ttd3;
      let finalFotoProses = fotoProses;
      let finalFotoTemuanArray = req.body.fotoTemuanArray;

      if (gasUrl) {
          try {
              console.log("Forwarding APD to GAS Web App...");
              const payloadToGas = {
                  action: "submitInspeksi",
                  dataF: dataF,
                  devOptions: { isDev: true, db: true, pdf: true, verboseLog: true },
                  ttd1, ttd2, ttd3, fotoProses
              };
              
              const gasRes = await fetch(gasUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'text/plain' },
                  body: JSON.stringify(payloadToGas)
              });
              
              const gasText = await gasRes.text();
              console.log("GAS Response (APD):", gasText.substring(0, 200));
              try {
                  const gasData = JSON.parse(gasText);
                  if (gasData.success && gasData.data) {
                     let parsedData = gasData.data;
                     if (typeof parsedData === 'string' && parsedData.startsWith('{')) {
                        parsedData = JSON.parse(parsedData);
                     }
                     
                     if (parsedData.urlTTD1 && parsedData.urlTTD1 !== '-') finalTtd1 = parsedData.urlTTD1;
                     if (parsedData.urlTTD2 && parsedData.urlTTD2 !== '-') finalTtd2 = parsedData.urlTTD2;
                     if (parsedData.urlTTD3 && parsedData.urlTTD3 !== '-') finalTtd3 = parsedData.urlTTD3;
                     if (parsedData.urlFP && parsedData.urlFP !== '-') finalFotoProses = parsedData.urlFP;

                     if (parsedData.pdfUrl && parsedData.pdfUrl !== '-') pdfUrl = parsedData.pdfUrl;
                     else if (parsedData.linkPdf1 && parsedData.linkPdf1 !== '-') pdfUrl = parsedData.linkPdf1;
                     else if (parsedData.linkPdf && parsedData.linkPdf !== '-') pdfUrl = parsedData.linkPdf;
                     else if (parsedData.fileUrl && parsedData.fileUrl !== '-') pdfUrl = parsedData.fileUrl;
                     
                     if (parsedData.linkPdf2 && parsedData.linkPdf2 !== '-') linkPdf2 = parsedData.linkPdf2;
                     else if (parsedData.pdfUrl2 && parsedData.pdfUrl2 !== '-') linkPdf2 = parsedData.pdfUrl2;
                     else if (parsedData.gpsUrl && parsedData.gpsUrl !== '-') linkPdf2 = parsedData.gpsUrl;
                     else if (parsedData.linkGps && parsedData.linkGps !== '-') linkPdf2 = parsedData.linkGps;
                     
                     // Fallback grab any HTTP URLs from parsedData
                     let urlsFound = [];
                     function deepFindUrls(obj, arr) {
                         if (typeof obj === 'string') {
                             const matches = obj.match(/https?:\/\/[^\s"',]+/g);
                             if (matches) {
                                 matches.forEach(m => arr.push(m));
                             }
                         } else if (typeof obj === 'object' && obj !== null) {
                             for (let k in obj) {
                                 deepFindUrls(obj[k], arr);
                             }
                         }
                     }
                     deepFindUrls(parsedData, urlsFound);
                     let uniqueUrls = [...new Set(urlsFound)].filter(u => u !== pdfUrl && u !== linkPdf2);
                     
                     if (!pdfUrl && uniqueUrls.length > 0) {
                         pdfUrl = uniqueUrls.shift();
                     }
                     if (!linkPdf2 && uniqueUrls.length > 0) {
                         linkPdf2 = uniqueUrls.shift();
                     }
                     
                     if (!pdfUrl && parsedData.logDetails) {
                        pdfUrl = "GAS_GENERATED";
                     }
                  }
              } catch(e) {}
              
          } catch(e) {
              console.error("Failed forwarding APD to GAS:", e);
          }
      }

      const result = await db.insert(inspections as any).values({
          type: 'Kepatuhan APD',
          inspectorName: (dataF && dataF.length > 0 && dataF[0][16]) || 'Unknown',
          location: (dataF && dataF.length > 0 && dataF[0][2]) || 'Area',
          dataF: JSON.stringify(dataF),
          pdfUrl: pdfUrl,
          pt: req.body.pt || 'TBP',
          signature: JSON.stringify({ ttd1: finalTtd1, ttd2: finalTtd2, ttd3: finalTtd3 }),
          photoUrl: JSON.stringify({ fotoProses: finalFotoProses, fotoTemuanArray: finalFotoTemuanArray })
      }).returning();
      
      let waMessageText = `*==== LAPORAN KEPATUHAN APD ====*\n\n`;
      if (dataF && dataF.length > 0) {
          const firstRow = dataF[0];
          const jam = firstRow[0] || '-';
          const tgl = firstRow[1] || '-';
          const area = firstRow[2] || '-';
          const waktuKerja = firstRow[3] || '-';
          const insp = firstRow[16] || '-';

          waMessageText += `*Tanggal*: ${tgl}\n`;
          waMessageText += `*Jam*: ${jam}\n`;
          waMessageText += `*Area*: ${area}\n`;
          waMessageText += `*Waktu Kerja*: ${waktuKerja}\n`;
          waMessageText += `*Inspector*: ${insp}\n\n`;

          let hadir = 0;
          let absen = 0;
          let tidakLengkap = 0;

          dataF.forEach((row: any) => {
              const kehadiran = row[8];
              if (kehadiran === 'Hadir') {
                  hadir++;
                  const apdMarks = [row[9], row[10], row[11], row[12], row[13], row[14]];
                  if (apdMarks.includes('❌')) {
                      tidakLengkap++;
                  }
              } else {
                  absen++;
              }
          });

          waMessageText += `*Ringkasan Kepatuhan*:\n`;
          waMessageText += `- Total Personil: ${dataF.length}\n`;
          waMessageText += `- Hadir (Lengkap): ${hadir - tidakLengkap}\n`;
          waMessageText += `- Hadir (Tidak Lengkap): ${tidakLengkap}\n`;
          waMessageText += `- Tidak Hadir (Cuti/Off dll): ${absen}\n`;

          if (tidakLengkap > 0) {
              waMessageText += `\n*Personil Tidak Lengkap APD*:\n`;
              dataF.filter((r: any) => r[8] === 'Hadir' && [r[9], r[10], r[11], r[12], r[13], r[14]].includes('❌')).forEach((r: any, idx: number) => {
                  waMessageText += `${idx + 1}. ${r[6]} - Ket: ${r[15]}\n`;
              });

              // --- BEGIN INSERT REKAP TEMUAN KE DATABASE TICKETS (APD) ---
              try {
                  const nonCompliant = dataF.filter((r: any) => r[8] === 'Hadir' && [r[9], r[10], r[11], r[12], r[13], r[14]].includes('❌'));
                  if (nonCompliant.length > 0) {
                      const allExistingTickets = await db.select().from(tickets);
                      const currentTicketCount = allExistingTickets.length;
                      const firstRow = dataF[0];
                      const insp = firstRow[16] || 'Inspector';
                      const area = firstRow[2] || 'Area';

                      function generateTicketIdApd(offset: number = 0, currentCount: number = 0) {
                        const now = new Date();
                        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
                        const dayNum = d.getUTCDay() || 7;
                        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
                        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
                        const weekStr = weekNo < 10 ? `0${weekNo}` : `${weekNo}`;
                        const yearYY = now.getFullYear().toString().slice(-2);
                        const counter = currentCount + offset + 1;
                        return `TKT-W${weekStr}Y${yearYY}-${counter.toString().padStart(3, '0')}`;
                      }

                      const ticketValues = nonCompliant.map((r: any, i: number) => {
                          const apdIssues: string[] = [];
                          if (r[9] === '❌') apdIssues.push('Seragam');
                          if (r[10] === '❌') apdIssues.push('Helm');
                          if (r[11] === '❌') apdIssues.push('Sepatu');
                          if (r[12] === '❌') apdIssues.push('Masker');
                          if (r[13] === '❌') apdIssues.push('Ear Plug');
                          if (r[14] === '❌') apdIssues.push('Kacamata');

                          return {
                              ticketId: generateTicketIdApd(i, currentTicketCount),
                              requestorName: insp,
                              category: 'Inspeksi Kepatuhan APD',
                              location: area,
                              description: `Ketidakpatuhan APD: ${r[6]} (${r[7]}) - Tidak lengkap: ${apdIssues.join(', ')}. Ket: ${r[15] || '-'}`,
                              risk: 'Paparan Bahaya K3 / Pelanggaran Prosedur APD',
                              initialControl: 'Teguran Lisan / Pemberian APD yang Sesuai',
                              source: 'inspeksi',
                              status: 'OPEN',
                              priority: 'Medium',
                              pt: req.body.pt || 'TBP',
                              photoUrl: finalFotoProses || null,
                              documentLink: (pdfUrl && pdfUrl !== 'GAS_GENERATED' && pdfUrl !== '-') ? pdfUrl : null,
                              date: new Date()
                          };
                      });

                      if (ticketValues.length > 0) {
                          await db.insert(tickets).values(ticketValues);
                          console.log(`Inserted ${ticketValues.length} APD temuan into tickets table.`);
                      }
                  }
              } catch(e) {
                  console.error("Failed to insert APD temuan to tickets table:", e);
              }
              // --- END INSERT REKAP TEMUAN KE DATABASE TICKETS (APD) ---
          }
      }

      if (pdfUrl && pdfUrl !== 'GAS_GENERATED' && pdfUrl !== '-') {
          waMessageText += `\n*Dokumen Laporan TBP*:\n${pdfUrl}\n`;
      } else {
          waMessageText += `\n*Dokumen Laporan TBP*:\n(Tautan PDF akan dikirim menyusul / diproses sistem)\n`;
      }
      
      if (linkPdf2 && linkPdf2 !== 'GAS_GENERATED' && linkPdf2 !== '-') {
          waMessageText += `\n*Dokumen Laporan GPS*:\n${linkPdf2}\n`;
      } else {
          waMessageText += `\n*Dokumen Laporan GPS*:\n(Tautan PDF akan dikirim menyusul / diproses sistem)\n`;
      }

      res.status(201).json({ ...result[0], pdfUrl, waMessageText });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to save inspection" });
    }
  });

router.post("/api/admin/inspections/:id/regenerate-pdf", async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const recordList = await db.select().from(inspections).where(eq(inspections.id, id));
        if (recordList.length === 0) return res.status(404).json({ error: "Inspection not found" });
        
        const record = recordList[0];
        if (!record.dataF) return res.status(400).json({ error: "No payload data saved for this inspection" });

        const parsedDataF = JSON.parse(record.dataF as string);

        const settingsObj: any = {};
        const allSettings = await db.select().from(appSettings);
        allSettings.forEach((s: any) => { settingsObj[s.settingKey] = s.settingValue || ''; });
        const gasUrl = settingsObj['GAS_WEB_APP_URL'] || process.env.GAS_WEB_APP_URL;

        if (!gasUrl) return res.status(500).json({ error: "GAS_WEB_APP_URL not configured" });

        let parsedSignature: any = { ttd1: "", ttd2: "", ttd3: "" };
        let parsedPhoto: any = { fotoProses: "", fotoTemuanArray: [] };

        if (record.signature) {
            try { parsedSignature = JSON.parse(record.signature); } catch(e) {}
        }
        if (record.photoUrl) {
            try { parsedPhoto = JSON.parse(record.photoUrl); } catch(e) {}
        }

        const isUniversal = Array.isArray(parsedDataF) ? false : true;
        
        const payloadToGas = isUniversal ? {
            action: "submitInspeksiUniversal",
            finalData: { ...parsedDataF, devOptions: { isDev: true, db: false, pdf: true, verboseLog: true } },
            ttd1: parsedSignature.ttd1 || "",
            ttd2: parsedSignature.ttd2 || "",
            ttd3: parsedSignature.ttd3 || "",
            fotoProses: parsedPhoto.fotoProses || "",
            fotoTemuanArray: parsedPhoto.fotoTemuanArray || []
        } : {
            action: "submitInspeksi",
            dataF: parsedDataF,
            devOptions: { isDev: true, db: false, pdf: true, verboseLog: true },
            ttd1: parsedSignature.ttd1 || "",
            ttd2: parsedSignature.ttd2 || "",
            ttd3: parsedSignature.ttd3 || "",
            fotoProses: parsedPhoto.fotoProses || "",
            fotoTemuanArray: parsedPhoto.fotoTemuanArray || []
        };

        const gasRes = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payloadToGas)
        });

        const gasText = await gasRes.text();
        let pdfUrl = '';
        try {
            const gasData = JSON.parse(gasText);
            if (gasData.success && gasData.data) {
                let pd = gasData.data;
                if (typeof pd === 'string' && pd.startsWith('{')) pd = JSON.parse(pd);
                
                pdfUrl = pd.pdfUrl || pd.linkPdf1 || pd.linkPdf || pd.fileUrl || '';
                
                if (!pdfUrl) {
                     let urlsFound = [];
                     function deepFindUrls(obj, arr) {
                         if (typeof obj === 'string') {
                             const matches = obj.match(/https?:\/\/[^\s"',]+/g);
                             if (matches) matches.forEach(m => arr.push(m));
                         } else if (typeof obj === 'object' && obj !== null) {
                             for (let k in obj) deepFindUrls(obj[k], arr);
                         }
                     }
                     deepFindUrls(pd, urlsFound);
                     let uniqueUrls = [...new Set(urlsFound)];
                     if (uniqueUrls.length > 0) pdfUrl = uniqueUrls[0];
                }
            }
        } catch(e) {
            return res.status(500).json({ error: "Failed parsing GAS response", details: gasText });
        }

        if (!pdfUrl || pdfUrl === '-') {
            return res.status(500).json({ error: "GAS did not return a valid PDF URL", details: gasText });
        }

        await db.update(inspections)
            .set({ pdfUrl: pdfUrl })
            .where(eq(inspections.id, id));

        res.json({ success: true, pdfUrl: pdfUrl });

    } catch (error: any) {
        console.error("Regenerate PDF Error:", error);
        res.status(500).json({ error: "Failed to regenerate PDF: " + (error.message || String(error)) });
    }
});

router.post("/api/inspections/bulk-harian", async (req, res) => {
    try {
        const { rows } = req.body;
        if (!rows || !Array.isArray(rows)) {
            return res.status(400).json({ error: "Invalid payload: 'rows' array is required." });
        }

        const inserts = rows.map((row: any) => ({
            type: 'Harian',
            date: row.date ? new Date(row.date) : new Date(),
            equipmentName: row.equipmentName,
            status: row.status,
            inspectorName: row.inspectorName,
            notes: row.notes,
            pt: req.body.pt || 'TBP',
            dataF: JSON.stringify(row)
        }));

        if (inserts.length > 0) {
            await db.insert(inspections as any).values(inserts);
        }

        res.status(201).json({ success: true, message: `Inserted ${inserts.length} inspections` });
    } catch (error: any) {
        console.error("Bulk Harian Error:", error);
        res.status(500).json({ error: "Failed to save bulk harian inspections" });
    }
});

router.post("/api/downtime/bulk", async (req, res) => {
    try {
        const { rows } = req.body;
        if (!rows || !Array.isArray(rows)) {
            return res.status(400).json({ error: "Invalid payload: 'rows' array is required." });
        }

        const inserts = rows.map((row: any) => ({
            id: undefined, // Let DB generate auto-increment
            toolName: row.toolName,
            breakdownTime: row.breakdownTime,
            repairTime: row.repairTime || null,
            notes: row.notes,
            status: row.status
        }));

        if (inserts.length > 0) {
            await db.insert(downtime as any).values(inserts);
        }

        res.status(201).json({ success: true, message: `Inserted ${inserts.length} downtime records` });
    } catch (error: any) {
        console.error("Bulk Downtime Error:", error);
        res.status(500).json({ error: "Failed to save bulk downtime" });
    }
});

router.post("/api/pemantauan/migrate", async (req, res) => {
    try {
      await db.delete(pemantauan);

      const url = "https://docs.google.com/spreadsheets/d/10emSpp75DLItEcdOw9dBGk94lyo3Mo76XdvuerI51Lc/export?format=csv&gid=0";
      const csvRes = await fetch(url);
      if (!csvRes.ok) throw new Error("Gagal mengunduh CSV");
      
      const csvText = await csvRes.text();
      
      const parseCSV = (text) => {
        const result = [];
        let row = [];
        let inQuotes = false;
        let val = '';
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            row.push(val);
            val = '';
          } else if (char === '\n' && !inQuotes) {
            row.push(val);
            result.push(row);
            row = [];
            val = '';
          } else if (char !== '\r') {
            val += char;
          }
        }
        if (val || row.length > 0) {
          row.push(val);
          result.push(row);
        }
        return result;
      };

      const rows = parseCSV(csvText);
      if (!rows || rows.length === 0) return res.json({ success: true, migrated: 0 });
      
      let count = 0;
      for (const r of rows) {
        if (r.length < 14) continue;
        const [_, idStr, kategori, tanggalStr, timeStr, shift, lokasi, suhu, kelembapan, flow, tekananGas, kebocoran, notes, inspector] = r;
        if (idStr === 'ID' || idStr === 'ID_Pemantauan') continue; // header
        
        const photoUrl = r.length > 19 ? r[19] : null;
        
        let dateObj = new Date();
        if (tanggalStr) {
          const parts = tanggalStr.split('-');
          if (parts.length === 3) {
            dateObj = new Date(parts[0], parseInt(parts[1])-1, parts[2]);
          }
        }

        await db.insert(pemantauan).values({
          timestamp: dateObj,
          tanggal: tanggalStr,
          jam: timeStr,
          inspektorPetugas: inspector,
          shift: shift,
          lokasiArea: lokasi,
          kategori: kategori,
          suhuCelcius: suhu,
          kelembapanPersen: kelembapan,
          flowGas: flow,
          tekananGasPsi: tekananGas,
          kebocoranYn: kebocoran,
          catatanRemark: notes,
          foto: photoUrl && photoUrl.startsWith('http') ? photoUrl : null,
          idPemantauan: idStr
        });
        count++;
      }
      
      res.json({ success: true, migrated: count });
    } catch (error) {
      console.error("Error migrating pemantauan:", error);
      res.status(500).json({ error: String(error), stack: error.stack, cause: error.cause ? String(error.cause) : null, original: error });
    }
  });

router.get("/api/pemantauan", async (req, res) => {
    try {
      const { asc, sql } = require("drizzle-orm");
      const data = await db.select().from(pemantauan).orderBy(sql`tanggal ASC, jam ASC, id ASC`);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pemantauan" });
    }
  });

router.post("/api/pemantauan", async (req, res) => {
    try {
      const payload = req.body;
      const ts = new Date();
      const yyyy = ts.getFullYear();
      const mm = String(ts.getMonth() + 1).padStart(2, '0');
      const dd = String(ts.getDate()).padStart(2, '0');
      const tanggalStr = `${yyyy}-${mm}-${dd}`;
      const jamStr = `${ts.getHours()}:${String(ts.getMinutes()).padStart(2, '0')}`;
      const randBase = Math.floor(Math.random() * 90000) + 10000;

      // VALIDASI: cek apakah suhu sudah diinput hari ini
      const hasSuhu = payload.items.some((i: any) => i.kategori === 'SUHU');
      if (hasSuhu) {
        const { and, eq } = require("drizzle-orm");
        const existingSuhu = await db.select().from(pemantauan).where(
          and(
            eq(pemantauan.kategori, 'SUHU'),
            eq(pemantauan.tanggal, tanggalStr)
          )
        ).limit(1);
        
        if (existingSuhu.length > 0) {
          const personil = existingSuhu[0].inspektorPetugas || 'seseorang';
          return res.status(400).json({ error: `Pemantauan suhu sudah dilakukan oleh "${personil}" hari ini` });
        }
      }

      const rowsToInsert = payload.items.map((item: any, idx: number) => ({
        inspektorPetugas: payload.inspektor,
        shift: payload.shift,
        catatanRemark: payload.catatan,
        foto: payload.foto,
        lokasiArea: item.lokasi,
        kategori: item.kategori,
        suhuCelcius: item.suhu,
        kelembapanPersen: item.kelembapan,
        flowGas: item.flow,
        tekananGasPsi: item.tekananGas,
        kebocoranYn: item.kebocoran,
        tanggal: tanggalStr,
        jam: jamStr,
        idPemantauan: `PMT-${randBase}-${idx + 1}`
      }));
      if (rowsToInsert.length > 0) {
        await db.insert(pemantauan).values(rowsToInsert);
      }
      res.status(201).json("Berhasil submit pemantauan!");
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save pemantauan" });
    }
  });

router.get("/api/downtime", async (req, res) => {
    try {
      const data = await db.select().from(downtime);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch downtime" });
    }
  });

router.put("/api/downtime/:id", async (req, res) => {
    try {
      const result = await db.update(downtime).set(req.body).where(eq(downtime.id, parseInt(req.params.id))).returning();
      res.json(result[0] || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to update downtime" });
    }
  });
