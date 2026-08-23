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
import { workOrderSchema, ticketSchema } from "../../src/lib/zod.js";

export const router = Router();

router.get("/api/equipments", async (req, res) => {
    try {
      const data = await db.select().from(equipments);
      res.json(data);
    } catch (error) {
      console.error("Error fetching equipments:", error);
      res.status(500).json({ error: "Failed to fetch equipments" });
    }
  });

router.get("/api/work-orders", async (req, res) => {
    try {
      const { pt } = req.query;
      let query: any = db.select().from(workOrders);
      if (pt) {
        query = query.where(eq(workOrders.pt, pt as string));
      } else {
        // Default to TBP if no pt provided for backward compatibility
        query = query.where(eq(workOrders.pt, 'TBP'));
      }
      const data = await query;
      res.json(data);
    } catch (error) {
      console.error("Error fetching work orders:", error);
      res.status(500).json({ error: "Failed to fetch work orders" });
    }
  });

router.post("/api/work-orders", async (req, res) => {
    try {
      const validation = workOrderSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.format() });
      }
      const newWO = validation.data as any;
      const ttdUser = newWO.ttdUser;
      delete newWO.ttdUser;

      if (!newWO.woId) {
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const randomStr = Math.floor(100 + Math.random() * 900).toString();
        newWO.woId = `FWO-${dateStr}-${randomStr}`;
      }
      if (newWO.date) newWO.date = new Date(newWO.date);
      if (newWO.repairStart) newWO.repairStart = new Date(newWO.repairStart);
      if (newWO.repairEnd) newWO.repairEnd = new Date(newWO.repairEnd);
      
      // Default PT to TBP if not provided
      if (!newWO.pt) newWO.pt = 'TBP';
      
      const result = await db.insert(workOrders).values(newWO).returning();
      const createdWO = result[0];
      let pdfUrl = null;
      let waMessageText = '';

      // Synchronous PDF Generation so we can return the URL
      try {
        const dateObj = new Date(createdWO.date);
        const tanggalStr = dateObj.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
        const waktuStr = dateObj.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
        
        let jabatanUser = '-';
        if (createdWO.requestorNik) {
          const empRes = await db.select().from(employees).where(eq(employees.nik, createdWO.requestorNik)).limit(1);
          if (empRes.length > 0 && empRes[0].jabatan) {
            jabatanUser = empRes[0].jabatan;
          }
        }
        waMessageText = `==== LAPORAN KERUSAKAN ====\n` +
          `*Tipe:* ${(createdWO.category || 'N/A').toUpperCase()}\n\n` +
          `*Pelapor*\n` +
          `Nama: ${createdWO.requestorName}\n` +
          `Jabatan: ${jabatanUser}\n\n` +
          `*Detail Barang*\n` +
          `Item: ${createdWO.equipmentName}\n` +
          `No. Alat: ${createdWO.equipmentCode || '-'}\n` +
          `No. Asset: -\n\n` +
          `*Lokasi*\n` +
          `Posisi: ${createdWO.location || '-'}\n` +
          `Ruangan: ${createdWO.location || '-'}\n\n` +
          `*Detail Kerusakan*\n` +
          `${createdWO.issueDescription}`;

        const devOptions = newWO.devOptions;
        if (!devOptions || devOptions.pdf !== false) {
          const replacements = {
            '<<NAMA KARYAWAN>>': createdWO.requestorName || '-',
            '<<JABATAN KARYAWAN>>': jabatanUser,
            '<<SHIFT>>': createdWO.shift || '-',
            '<<NAMA ALAT>>': createdWO.equipmentName || '-',
            '<<NO ALAT>>': createdWO.equipmentCode || '-',
            '<<NO ASSET>>': '-', // Not provided in WO form
            '<<POSISI ALAT>>': createdWO.location || '-',
            '<<RUANGAN>>': createdWO.location || '-',
            '<<Tanggal>>': tanggalStr,
            '<<Waktu>>': waktuStr,
            '<<Kerusakan>>': createdWO.issueDescription || '-'
          };
          
          const images: Record<string, string> = {};
          if (createdWO.photoUrl) images['<<FOTOKERUSAKAN>>'] = createdWO.photoUrl;
          if (ttdUser) images['<<TTDUSER>>'] = ttdUser;

          const settingsObj: Record<string, string> = {};
          const allSettings = await db.select().from(appSettings);
          allSettings.forEach(s => {
            settingsObj[s.settingKey] = s.settingValue || '';
          });

          const TEMPLATE_ID = settingsObj['WO_TEMPLATE_DOC_ID'] || '1yechtOPL904YREPCfsxR5AJbyHyfVD9MwORu_ymD7eY';
          const FOLDER_ID = settingsObj['WO_PDF_DRIVE_FOLDER_ID'] || process.env.GOOGLE_DRIVE_FOLDER_ID || '1JJZKj7X1vsNNP5dTWDYJ_-0xYVhU0Bu7';
          
          const pdfRes = await generatePdfFromTemplate(
            TEMPLATE_ID, 
            FOLDER_ID, 
            replacements, 
            createdWO.woId,
            images
          );

          if (pdfRes.success) {
            pdfUrl = pdfRes.pdfUrl;
            await db.update(workOrders)
              .set({ pdfUrl: pdfRes.pdfUrl })
              .where(eq(workOrders.woId, createdWO.woId));
            
            console.log(`PDF WO ${createdWO.woId} generated successfully: ${pdfRes.pdfUrl}`);
            waMessageText += `\n\n*Dokumen Kerusakan*:\n${pdfRes.pdfUrl}`;
          } else {
             waMessageText += `\n\n*Dokumen Kerusakan*:\n(Gagal Generate PDF)`;
          }
        } else {
             waMessageText += `\n\n*Dokumen Kerusakan*:\n(Dilewati / PDF dinonaktifkan)`;
        }
      } catch (pdfErr: any) {
        console.error(`Gagal generate PDF WO for ${createdWO.woId}:`, pdfErr.message);
        waMessageText += `\n\n*Dokumen Kerusakan*:\n(Sedang offline / Kredensial tidak valid)`;
      }
            // Push Notification
      try {
        const _n = await db.insert(notifications).values({
          userId: null,
          role: 'Maintenance',
          title: 'Work Order Baru',
          message: `${createdWO.requestorName} membuat WO ${createdWO.woId}`,
          type: 'info',
          link: '/adm-dashboard'
        }).returning();
        sendWebPush(_n);
      } catch(e) { console.error('WO push error:', e); }
      res.status(201).json({ ...createdWO, pdfUrl, waMessageText });
    } catch (error) {
      console.error("Error creating work order:", error);
      res.status(500).json({ error: "Failed to create work order" });
    }
  });

router.put("/api/work-orders/:woId", async (req, res) => {
    try {
      const { woId } = req.params;
      const updateData = req.body;
      if (updateData.date) updateData.date = new Date(updateData.date);
      if (updateData.repairStart) updateData.repairStart = new Date(updateData.repairStart);
      if (updateData.repairEnd) updateData.repairEnd = new Date(updateData.repairEnd);
      
      const result = await db.update(workOrders)
        .set(updateData)
        .where(eq(workOrders.woId, woId))
        .returning();
      
      if (result.length === 0) {
        return res.status(404).json({ error: "Work order not found" });
      }
      
      let waMessageText = '';
      if (updateData.status === 'Closed') {
         const wo = result[0];
         const dateOpts: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Jayapura', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
         const endStr = wo.repairEnd ? new Date(wo.repairEnd).toLocaleString('id-ID', dateOpts) + ' WIT' : '-';
         
         let downtimeText = '-';
         // Calculate downtime from WO creation date (wo.date) to repairEnd
         if (wo.date && wo.repairEnd) {
             const diffMs = new Date(wo.repairEnd).getTime() - new Date(wo.date).getTime();
             const diffHrs = Math.floor(diffMs / 3600000);
             const diffMins = Math.floor((diffMs % 3600000) / 60000);
             downtimeText = `${diffHrs} jam ${diffMins} menit`;
         }
         
         const sparepartStr = wo.sparepartName ? `${wo.sparepartName} (Qty: ${wo.sparepartQty || 1})` : '-';
         
         waMessageText = `==== WORK ORDER SELESAI [${wo.woId}] ====\n` +
         `*Nama Alat:* ${wo.equipmentName || '-'}\n` +
         `*Kode/No Alat:* ${wo.equipmentCode || '-'}\n` +
         `*Lokasi:* ${wo.location || '-'}\n` +
         `*PIC Eksekusi:* ${wo.technicianPic || '-'}\n\n` +
         `*Kendala/Kerusakan:*\n${wo.issueDescription || '-'}\n\n` +
         `*Tindakan Perbaikan:*\n${wo.actionTaken || '-'}\n\n` +
         `*Sparepart Digunakan:* ${sparepartStr}\n` +
         `*Selesai Perbaikan:* ${endStr}\n` +
         `*Total Downtime:* ${downtimeText}\n\n` +
         `*Link Foto Penyelesaian:*\n${wo.closingPhoto || '-'}`;
      }
      // Push notification
      try {
        if (result[0].requestorNik && updateData.status) {
          const _n = await db.insert(notifications).values({
            userId: result[0].requestorNik,
            title: 'Update Work Order',
            message: `Work Order ${result[0].woId} Anda berubah status menjadi ${result[0].status}`,
            type: 'info',
            link: '/wo-list'
          }).returning();
          sendWebPush(_n);
        }
      } catch(e) {}
      res.json({ ...result[0], waMessageText });
    } catch (error) {
      console.error("Error updating work order:", error);
      res.status(500).json({ error: "Failed to update work order" });
    }
  });

router.get("/api/tickets", async (req, res) => {
    try {
      const dbData = await db.select().from(tickets).orderBy(desc(tickets.id));
      res.json(dbData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

router.post("/api/tickets", async (req, res) => {
    try {
      const validation = ticketSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.format() });
      }
      const newTicket = validation.data as any;
      if (!newTicket.ticketId) {
        newTicket.ticketId = `RWO-${Date.now()}`;
        newTicket.source = 'internal';
      }
      const result = await db.insert(tickets).values(newTicket).returning();
      const ticket = result[0];
      const tglStr = ticket.date ? new Date(ticket.date).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID');
      
      const waMessageText = `==== WO PERMINTAAN BARU ====\n` +
      `*Ticket ID:* ${ticket.ticketId}\n` +
      `*Pemohon:* ${ticket.requestorName}\n\n` +
      `📌 *Detail Request*\n` +
      `Tipe: ${ticket.category || '-'}\n` +
      `Prioritas: ${ticket.priority || '-'}\n` +
      `Target: ${ticket.targetDate || '-'}\n` +
      `Lokasi: ${ticket.location || '-'}\n\n` +
      `*Deskripsi:*\n${ticket.description || '-'}\n\n` +
      `*Lampiran:*\n${ticket.photoUrl && ticket.photoUrl.startsWith('data:image') ? '(Gambar terlampir, tidak dapat disisipkan)' : (ticket.photoUrl || '-')}`;
      
      // Push Notification
      try {
        const _n = await db.insert(notifications).values({
          userId: null,
          role: 'Maintenance',
          title: 'Ticket Baru',
          message: `${ticket.requestorName} membuat tiket ${ticket.ticketId}`,
          type: 'info',
          link: '/adm-dashboard'
        }).returning();
        sendWebPush(_n);
      } catch(e) { console.error('Ticket push error:', e); }
      res.status(201).json({ ...ticket, waMessageText });
    } catch (error) {
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

router.put("/api/tickets/:id", async (req, res) => {
    try {
      const updateData = req.body;
      const isClosedStatus = updateData.status && (updateData.status.toUpperCase() === 'CLOSED' || updateData.status === 'Closed');
      
      if (isClosedStatus) {
        updateData.status = 'CLOSED';
        if (!updateData.completionDate) {
          updateData.completionDate = new Date();
        }
      }
      if (updateData.completionDate && typeof updateData.completionDate === 'string') {
        updateData.completionDate = new Date(updateData.completionDate);
      }
      if (updateData.date && typeof updateData.date === 'string') {
        updateData.date = new Date(updateData.date);
      }
      
      const result = await db.update(tickets).set(updateData).where(eq(tickets.ticketId, req.params.id)).returning();
      const ticket = result[0];
      let waMessageText = '';
      if (ticket && isClosedStatus) {
         const dateOpts: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Jayapura', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
         const endStr = ticket.completionDate ? new Date(ticket.completionDate).toLocaleString('id-ID', dateOpts) + ' WIT' : new Date().toLocaleString('id-ID', dateOpts) + ' WIT';
         
         const isInspeksiTemuan = ticket.source === 'inspeksi' || ticket.ticketId?.startsWith('TKT-');
         if (isInspeksiTemuan) {
            waMessageText = `*==== PENUTUPAN TEMUAN INSPEKSI [${ticket.ticketId}] ====*\n\n` +
            `*Lokasi/Area:* ${ticket.location || '-'}\n` +
            `*Deskripsi Temuan:*\n${ticket.description || '-'}\n\n` +
            `*Tindakan Perbaikan (Closing):*\n${ticket.actionTaken || '-'}\n\n` +
            `*PIC Closing:* ${ticket.pic || '-'}\n` +
            `*Waktu Penyelesaian:* ${endStr}\n` +
            `*Status:* CLOSED (Tuntas)\n` +
            (ticket.closingPhoto && ticket.closingPhoto !== '-' && !ticket.closingPhoto.startsWith('data:') ? `\n*Bukti Selesai:*\n${ticket.closingPhoto}` : '');
         } else {
            const sparepartStr = ticket.sparepartName ? `${ticket.sparepartName} (Qty: ${ticket.sparepartQty || 1})` : '-';
            waMessageText = `==== PERMINTAAN SELESAI [${ticket.ticketId}] ====\n` +
            `*PIC Eksekusi:* ${ticket.pic || '-'}\n\n` +
            `*Deskripsi Request:*\n${ticket.description || '-'}\n\n` +
            `*Tindakan Perbaikan:*\n${ticket.actionTaken || '-'}\n\n` +
            `*Sparepart Digunakan:* ${sparepartStr}\n` +
            `*Selesai Perbaikan:* ${endStr}\n\n` +
            `*Link Foto Penyelesaian:*\n${ticket.closingPhoto || '-'}`;
         }
      }
      res.json({ ...(ticket || {}), waMessageText });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

router.get("/api/spareparts", async (req, res) => {
    try {
      const data = await db.select().from(spareparts);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch spareparts" });
    }
  });

router.post("/api/spareparts/import", async (req, res) => {
    try {
      const parts = req.body;
      if (!Array.isArray(parts)) {
        return res.status(400).json({ error: "Expected an array of spareparts" });
      }
      
      // Clear existing data (optional, or we can just upsert. But since it's an import, let's clear it for simplicity)
      await db.delete(spareparts);
      
      // Insert in chunks to avoid query size limits if it's large
      const chunkSize = 100;
      for (let i = 0; i < parts.length; i += chunkSize) {
        const chunk = parts.slice(i, i + chunkSize);
        await db.insert(spareparts).values(chunk);
      }
      
      res.json({ success: true, count: parts.length });
    } catch (error) {
      console.error("Error importing spareparts:", error);
      res.status(500).json({ error: "Failed to import spareparts" });
    }
  });
