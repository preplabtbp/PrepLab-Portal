import { Router } from "express";
import { db } from "../../src/db/index.js";
import { eq, desc, asc, or, inArray, isNull, and, gte, lte, like } from "drizzle-orm";
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
import { normalizeEquipment } from "../../src/lib/equipmentNormalizer.js";
import { parseDowntimeHours, formatDowntimeDuration } from "../../src/lib/downtimeHelper.js";

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

router.get("/api/work-orders/maintenance-summary", async (req, res) => {
  try {
    const { pt, category, equipmentCode, startDate, endDate } = req.query;
    
    // Fetch work orders (TBP and GPS are unified as 1 dataset; only GTS is separate)
    let allWOs = (pt && (pt as string).toUpperCase() === 'GTS')
      ? await db.select().from(workOrders).where(eq(workOrders.pt, 'GTS')).orderBy(asc(workOrders.woId))
      : await db.select().from(workOrders).orderBy(asc(workOrders.woId));

    // Helper to filter out dummy/test entries
    const isDummyOrTestWO = (wo: any): boolean => {
      if (!wo) return false;
      const desc = String(wo.issueDescription || wo.issue_description || '').toLowerCase().trim();
      const action = String(wo.actionTaken || wo.action_taken || '').toLowerCase().trim();
      const eqName = String(wo.equipmentName || wo.equipment_name || '').toLowerCase().trim();
      const woId = String(wo.woId || wo.wo_id || '').toLowerCase().trim();

      const testKeywords = [
        'testing', 'test', 'dummy', 'percobaan', 'coba', 'tes wo', 'testing wo',
        'test wa', 'testing wa', 'trial', 'hanya tes', 'hanya test', 'ujicoba'
      ];

      for (const kw of testKeywords) {
        if (desc.includes(kw) || action.includes(kw) || eqName.includes(kw) || woId.includes(kw)) {
          return true;
        }
      }

      if (/^([a-z0-9])\1{2,}$/i.test(desc) || /^(asdf|qwerty|zxcv|1234)/i.test(desc)) {
        return true;
      }

      return false;
    };

    allWOs = allWOs.filter(wo => !isDummyOrTestWO(wo));

    // Helper to filter out June-July zero-downtime pemutihan work orders
    const isPemutihanZeroDt = (wo: any): boolean => {
      if (!wo || !wo.date) return false;
      const d = new Date(wo.date);
      if (isNaN(d.getTime())) return false;
      const isJuneJuly = d.getFullYear() === 2026 && [5, 6].includes(d.getMonth());
      if (!isJuneJuly) return false;

      const dt = parseDowntimeHours(wo.downtimeDuration ?? (wo as any).downtime_duration, wo.repairStart, wo.repairEnd, wo.date);
      return dt <= 0;
    };

    const hidePemutihan = req.query.hidePemutihan !== 'false';
    if (hidePemutihan) {
      allWOs = allWOs.filter(wo => !isPemutihanZeroDt(wo));
    }

    // Apply date filters if present
    if (startDate) {
      const sDate = new Date(startDate as string);
      allWOs = allWOs.filter(wo => wo.date && new Date(wo.date) >= sDate);
    }
    if (endDate) {
      const eDate = new Date(endDate as string);
      // Include full end of day
      eDate.setHours(23, 59, 59, 999);
      allWOs = allWOs.filter(wo => wo.date && new Date(wo.date) <= eDate);
    }

    // Category mapping & normalization
    const normalizeCategory = (cat: string | null | undefined): 'Instrument (L)' | 'Non-Instrument (PL)' | 'Other' => {
      if (!cat) return 'Non-Instrument (PL)';
      const c = cat.toLowerCase();
      if (c.includes('instrument') && !c.includes('non')) return 'Instrument (L)';
      if (c.includes('non-instrument') || c.includes('non instrument') || c.includes('prep')) return 'Non-Instrument (PL)';
      return 'Non-Instrument (PL)';
    };

    // Calculate aggregated metrics
    let totalDowntimeHours = 0;
    let totalRepairDurationHours = 0;
    let repairCountWithDuration = 0;
    let totalSparepartUnits = 0;

    const equipmentMap: Record<string, {
      equipmentCode: string;
      equipmentName: string;
      category: string;
      woCount: number;
      totalDowntime: number;
      openCount: number;
      inProgressCount: number;
      closedCount: number;
      spareparts: Record<string, number>;
    }> = {};

    const sparepartMap: Record<string, {
      sparepartName: string;
      totalQty: number;
      woCount: number;
      usedInEquipments: Set<string>;
    }> = {};

    const categorySummary: Record<string, { totalDowntime: number; woCount: number }> = {
      'Instrument (L)': { totalDowntime: 0, woCount: 0 },
      'Non-Instrument (PL)': { totalDowntime: 0, woCount: 0 }
    };

    allWOs.forEach(wo => {
      const norm = normalizeEquipment(wo.equipmentName, wo.equipmentCode, wo.category);
      if (norm.isTest) return;

      const normCat = norm.category === 'Instrument (L)' ? 'Instrument (L)' : 'Non-Instrument (PL)';
      const eqName = norm.name;
      const eqCode = norm.code;
      // For non-instrument equipment, group by standard name to unify variations under one asset
      const eqKey = norm.isInstrument ? `${eqCode}___${eqName}` : `NON_INSTR___${eqName}`;

      // Calculate downtime
      const dtHours = parseDowntimeHours(wo.downtimeDuration ?? (wo as any).downtime_duration, wo.repairStart, wo.repairEnd, wo.date);

      totalDowntimeHours += dtHours;
      if (dtHours > 0) {
        totalRepairDurationHours += dtHours;
        repairCountWithDuration++;
      }

      // Category breakdown
      if (categorySummary[normCat]) {
        categorySummary[normCat].totalDowntime += dtHours;
        categorySummary[normCat].woCount += 1;
      }

      // Equipment map
      if (!equipmentMap[eqKey]) {
        equipmentMap[eqKey] = {
          equipmentCode: eqCode,
          equipmentName: eqName,
          category: normCat,
          woCount: 0,
          totalDowntime: 0,
          openCount: 0,
          inProgressCount: 0,
          closedCount: 0,
          spareparts: {}
        };
      }

      equipmentMap[eqKey].woCount += 1;
      equipmentMap[eqKey].totalDowntime += dtHours;
      
      const st = (wo.status || 'Open').toLowerCase();
      if (st === 'closed') equipmentMap[eqKey].closedCount += 1;
      else if (st.includes('progress')) equipmentMap[eqKey].inProgressCount += 1;
      else equipmentMap[eqKey].openCount += 1;

      // Spareparts processing
      if (wo.sparepartName && wo.sparepartName.trim()) {
        const rawNames = wo.sparepartName.split(/[,;\n+]/).map(s => s.trim()).filter(Boolean);
        const qtyVal = parseFloat(String(wo.sparepartQty || '1').replace(',', '.')) || 1;
        const perPartQty = rawNames.length > 0 ? (qtyVal / rawNames.length) : qtyVal;

        rawNames.forEach(spName => {
          const cleanSpName = spName.trim();
          totalSparepartUnits += perPartQty;

          if (!sparepartMap[cleanSpName]) {
            sparepartMap[cleanSpName] = {
              sparepartName: cleanSpName,
              totalQty: 0,
              woCount: 0,
              usedInEquipments: new Set()
            };
          }
          sparepartMap[cleanSpName].totalQty += perPartQty;
          sparepartMap[cleanSpName].woCount += 1;
          sparepartMap[cleanSpName].usedInEquipments.add(eqName);

          // Track in equipment
          equipmentMap[eqKey].spareparts[cleanSpName] = (equipmentMap[eqKey].spareparts[cleanSpName] || 0) + perPartQty;
        });
      }
    });

    const equipmentList = Object.values(equipmentMap).map(eq => ({
      ...eq,
      totalDowntime: Math.round(eq.totalDowntime * 10) / 10,
      mttr: eq.woCount > 0 ? Math.round((eq.totalDowntime / eq.woCount) * 10) / 10 : 0
    }));

    // Find top downtime equipment before alphabetical sorting
    const topDowntimeEquipment = [...equipmentList].sort((a, b) => b.totalDowntime - a.totalDowntime)[0] || null;

    // Sort equipmentList alphabetically (A - Z) by equipmentName, secondary by equipmentCode
    equipmentList.sort((a, b) => {
      const cmp = (a.equipmentName || '').localeCompare(b.equipmentName || '', 'id', { sensitivity: 'base', numeric: true });
      if (cmp !== 0) return cmp;
      return (a.equipmentCode || '').localeCompare(b.equipmentCode || '', 'id', { sensitivity: 'base', numeric: true });
    });

    const sparepartsList = Object.values(sparepartMap).map(sp => ({
      sparepartName: sp.sparepartName,
      totalQty: Math.round(sp.totalQty * 10) / 10,
      woCount: sp.woCount,
      usedInEquipments: Array.from(sp.usedInEquipments)
    })).sort((a, b) => b.totalQty - a.totalQty);

    const mttrOverall = repairCountWithDuration > 0
      ? Math.round((totalRepairDurationHours / repairCountWithDuration) * 10) / 10
      : (allWOs.length > 0 ? Math.round((totalDowntimeHours / allWOs.length) * 10) / 10 : 0);

    res.json({
      status: "success",
      summary: {
        totalWorkOrders: allWOs.length,
        totalDowntimeHours: Math.round(totalDowntimeHours * 100) / 100,
        mttrHours: Math.round(mttrOverall * 100) / 100,
        totalSparepartUnits: Math.round(totalSparepartUnits * 10) / 10,
        totalEquipmentsWithDowntime: equipmentList.length,
        topDowntimeEquipment: topDowntimeEquipment
      },
      categorySummary: {
        'Instrument (L)': {
          totalDowntime: Math.round((categorySummary['Instrument (L)'].totalDowntime) * 100) / 100,
          woCount: categorySummary['Instrument (L)'].woCount
        },
        'Non-Instrument (PL)': {
          totalDowntime: Math.round((categorySummary['Non-Instrument (PL)'].totalDowntime) * 100) / 100,
          woCount: categorySummary['Non-Instrument (PL)'].woCount
        }
      },
      equipmentList,
      sparepartsList,
      rawWorkOrders: allWOs
    });
  } catch (error: any) {
    console.error("Error generating maintenance summary:", error);
    res.status(500).json({ error: "Failed to generate maintenance summary", message: error.message });
  }
});

router.get(["/api/work-orders", "/api/workorders"], async (req, res) => {
    try {
      const { pt } = req.query;
      let query: any = db.select().from(workOrders).orderBy(asc(workOrders.woId));
      if (pt && (pt as string).toUpperCase() === 'GTS') {
        query = query.where(eq(workOrders.pt, 'GTS'));
      }
      // TBP and GPS are unified as 1 dataset: return all records for TBP, GPS, ALL, or no param
      const data = await query;
      
      // Enrich with employee section info for clear section visibility
      try {
        const allEmps = await db.select({ nik: employees.nik, section: employees.section, department: employees.department }).from(employees);
        const empMap = new Map(allEmps.map(e => [e.nik, e.section || e.department || '']));
        const enriched = data.map((item: any) => ({
          ...item,
          section: item.section || (item.requestorNik ? empMap.get(item.requestorNik) || null : null)
        }));
        return res.json(enriched);
      } catch {
        return res.json(data);
      }
    } catch (error) {
      console.error("Error fetching work orders:", error);
      res.status(500).json({ error: "Failed to fetch work orders" });
    }
  });

router.get("/api/work-orders/:woId", async (req, res) => {
    try {
      const { woId } = req.params;
      const data = await db.select().from(workOrders).where(eq(workOrders.woId, woId)).limit(1);
      if (data.length === 0) {
        return res.status(404).json({ error: "Work order not found" });
      }
      const wo = data[0];
      let section = (wo as any).section || null;
      let department = null;
      if (!section && wo.requestorNik) {
        try {
          const emp = await db.select().from(employees).where(eq(employees.nik, wo.requestorNik)).limit(1);
          if (emp.length > 0) {
            section = emp[0].section || emp[0].department || null;
            department = emp[0].department || null;
          }
        } catch (e) {}
      }
      res.json({ ...wo, section, department });
    } catch (error) {
      console.error("Error fetching work order by ID:", error);
      res.status(500).json({ error: "Failed to fetch work order" });
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
        newWO.woId = `WO-${dateStr}-${randomStr}`;
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
      // Push Notification to Maintenance and Requestor Section (SPV Up)
      try {
        const _n = await db.insert(notifications).values({
          userId: null,
          role: 'Maintenance',
          title: 'Work Order Baru',
          message: `${createdWO.requestorName} membuat WO ${createdWO.woId}: ${createdWO.equipmentName || ''}`,
          type: 'info',
          link: `/wo-detail/${createdWO.woId}`
        }).returning();
        sendWebPush(_n);

        // Notify requestor's section so SPV Up and section members are aware
        let requestorSection: string | null = (createdWO as any).section || null;
        if (!requestorSection && createdWO.requestorNik) {
          const empRes = await db.select().from(employees).where(eq(employees.nik, createdWO.requestorNik)).limit(1);
          if (empRes.length > 0) {
            requestorSection = empRes[0].section || empRes[0].department || null;
          }
        }
        if (requestorSection && requestorSection.toLowerCase() !== 'maintenance') {
          const _nSec = await db.insert(notifications).values({
            userId: null,
            role: requestorSection,
            title: `Work Order Baru (${requestorSection})`,
            message: `${createdWO.requestorName} membuat WO ${createdWO.woId}: ${createdWO.equipmentName || ''}`,
            type: 'info',
            link: `/wo-detail/${createdWO.woId}`
          }).returning();
          sendWebPush(_nSec);
        }
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

      // Auto-compute repairStart, repairEnd, and downtimeDuration when status is Closed
      if (updateData.status === 'Closed') {
        const existingRows = await db.select().from(workOrders).where(eq(workOrders.woId, woId)).limit(1);
        if (existingRows.length === 0) {
          return res.status(404).json({ error: "Work order not found" });
        }
        const existingWO = existingRows[0];

        if (!updateData.repairEnd) {
          updateData.repairEnd = new Date();
        }
        if (!updateData.repairStart) {
          updateData.repairStart = existingWO.repairStart || existingWO.date || new Date();
        }

        if (!updateData.downtimeDuration || updateData.downtimeDuration === '0' || updateData.downtimeDuration === '-') {
          updateData.downtimeDuration = formatDowntimeDuration(updateData.repairStart, updateData.repairEnd);
        }
      }
      
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
         
         const downtimeText = wo.downtimeDuration || formatDowntimeDuration(wo.repairStart || wo.date, wo.repairEnd);
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

router.delete("/api/work-orders/:woId", async (req, res) => {
  try {
    const { woId } = req.params;
    const existing = await db.select().from(workOrders).where(eq(workOrders.woId, woId)).limit(1);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Work order tidak ditemukan" });
    }

    // Delete associated notifications to prevent broken links
    try {
      await db.delete(notifications).where(like(notifications.message, `%${woId}%`));
    } catch (e) {
      console.warn("Could not delete related notifications:", e);
    }

    const result = await db.delete(workOrders).where(eq(workOrders.woId, woId)).returning();
    res.json({ success: true, message: `Work Order ${woId} berhasil dihapus`, deleted: result[0] });
  } catch (error) {
    console.error("Error deleting work order:", error);
    res.status(500).json({ error: "Gagal menghapus work order" });
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
