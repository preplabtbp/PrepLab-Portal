import express from "express";
import { db } from "../../src/db/index.js";
import { tickets, notifications } from "../../src/db/schema.js";
import { ticketSchema } from "../../src/lib/zod.js";
import { eq, desc } from "drizzle-orm";
import { sendWebPush } from "../utils.js";

export const router = express.Router();

// GET all inspection finding tickets
router.get("/api/tickets", async (req, res) => {
  try {
    const dbData = await db.select().from(tickets).orderBy(desc(tickets.id));

    // Group / Consolidate APD tickets that belong to the same inspection
    const consolidated: any[] = [];
    const seenApdGroup = new Map<string, any>();

    for (const t of dbData) {
      const isApdTicket = (t.category || '').toLowerCase().includes('apd') || 
                          (t.description || '').toLowerCase().includes('ketidakpatuhan apd') ||
                          (t.risk || '').toLowerCase().includes('pelanggaran prosedur apd');

      if (isApdTicket && t.photoUrl && t.photoUrl !== '-') {
        // Group key by photoUrl + location
        const groupKey = `${t.location || 'Area'}_${t.photoUrl}`;
        if (seenApdGroup.has(groupKey)) {
          const parent = seenApdGroup.get(groupKey);
          // Combine descriptions cleanly
          if (!parent.description.includes(t.description)) {
            parent.description = `${parent.description}\n${t.description}`;
          }
          // If any ticket in the group is OPEN, the merged ticket remains OPEN
          if (t.status === 'OPEN') {
            parent.status = 'OPEN';
          }
          continue; // Skip adding redundant separate card
        } else {
          // Clone ticket object so we don't mutate in place
          const cloned = { ...t };
          seenApdGroup.set(groupKey, cloned);
          consolidated.push(cloned);
        }
      } else {
        consolidated.push(t);
      }
    }

    res.json(consolidated);
  } catch (error) {
    console.error("Error fetching inspection tickets:", error);
    res.status(500).json({ error: "Failed to fetch tickets" });
  }
});

// POST new inspection finding ticket
router.post("/api/tickets", async (req, res) => {
  try {
    const validation = ticketSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.format() });
    }
    const newTicket = validation.data as any;
    if (!newTicket.ticketId) {
      newTicket.ticketId = `TKT-${Date.now()}`;
      newTicket.source = 'inspeksi';
    }
    const result = await db.insert(tickets).values(newTicket).returning();
    const ticket = result[0];
    
    const waMessageText = `*==== TEMUAN INSPEKSI K3 BARU ====*\n\n` +
      `*Ticket ID:* ${ticket.ticketId}\n` +
      `*Pelapor:* ${ticket.requestorName}\n` +
      `*Area/Lokasi:* ${ticket.location || '-'}\n` +
      `*Kategori:* ${ticket.category || '-'}\n` +
      `*Tingkat Risiko:* ${ticket.risk || ticket.priority || 'Medium'}\n\n` +
      `*Deskripsi Temuan:*\n${ticket.description || '-'}\n\n` +
      `*Saran Tindakan/Pengendalian:*\n${ticket.initialControl || '-'}\n\n` +
      `*Lampiran:*\n${ticket.photoUrl && ticket.photoUrl.startsWith('data:image') ? '(Gambar terlampir di sistem)' : (ticket.photoUrl || '-')}`;
    
    // Push Notification to Safety / QA / Maintenance if needed
    try {
      const _n = await db.insert(notifications).values({
        userId: null,
        role: 'Safety',
        title: 'Temuan Inspeksi Baru',
        message: `${ticket.requestorName} mencatat temuan di ${ticket.location}`,
        type: 'warning',
        link: '/ticket'
      }).returning();
      sendWebPush(_n);
    } catch(e) { console.error('Ticket push error:', e); }

    res.status(201).json({ ...ticket, waMessageText });
  } catch (error) {
    console.error("Error creating ticket:", error);
    res.status(500).json({ error: "Failed to create ticket" });
  }
});

// PUT / Update ticket (e.g. closing an inspection finding)
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
      const dateOpts: Intl.DateTimeFormatOptions = { 
        timeZone: 'Asia/Jayapura', 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      };
      const endStr = ticket.completionDate ? new Date(ticket.completionDate).toLocaleString('id-ID', dateOpts) + ' WIT' : new Date().toLocaleString('id-ID', dateOpts) + ' WIT';
      
      waMessageText = `*==== PENUTUPAN TEMUAN INSPEKSI [${ticket.ticketId}] ====*\n\n` +
        `*Lokasi/Area:* ${ticket.location || '-'}\n` +
        `*Deskripsi Temuan:*\n${ticket.description || '-'}\n\n` +
        `*Tindakan Perbaikan (Closing):*\n${ticket.actionTaken || '-'}\n\n` +
        `*PIC Closing:* ${ticket.pic || '-'}\n` +
        `*Waktu Penyelesaian:* ${endStr}\n` +
        `*Status:* CLOSED (Tuntas)\n` +
        (ticket.closingPhoto && ticket.closingPhoto !== '-' && !ticket.closingPhoto.startsWith('data:') ? `\n*Bukti Selesai:*\n${ticket.closingPhoto}` : '');
    }

    res.json({ ...(ticket || {}), waMessageText });
  } catch (error) {
    console.error("Error updating inspection ticket:", error);
    res.status(500).json({ error: "Failed to update ticket" });
  }
});

// Helper date parser for Google Sheet date formats
function parseCustomDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '' || dateStr === '-') return null;
  const parts = dateStr.trim().split(' ');
  const dmy = parts[0].split('/');
  if (dmy.length === 3) {
    const day = parseInt(dmy[0], 10);
    const month = parseInt(dmy[1], 10) - 1;
    const year = parseInt(dmy[2], 10);
    let hours = 0;
    let mins = 0;
    if (parts[1]) {
      const hm = parts[1].split(':');
      hours = parseInt(hm[0], 10) || 0;
      mins = parseInt(hm[1], 10) || 0;
    }
    const d = new Date(year, month, day, hours, mins);
    if (!isNaN(d.getTime())) return d;
  }
  const directDate = new Date(dateStr);
  return isNaN(directDate.getTime()) ? null : directDate;
}

// POST sync tickets directly from official Google Sheets Rekap_Temuan
router.post("/api/tickets/sync-sheet", async (req, res) => {
  try {
    const { parse } = await import('csv-parse/sync');
    const spreadsheetId = '1vG6iSl8uPHhwtH2tGUlyb0l4IK3r3ZhavtkkdHhEmP0';
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Rekap_Temuan`;
    
    const fetchRes = await fetch(url);
    const csvData = await fetchRes.text();
    const records = parse(csvData, { columns: true, skip_empty_lines: true });

    const validRows = records.filter((r: any) => r['Ticket_ID'] && r['Ticket_ID'].trim() !== '');

    const ticketValues = validRows.map((r: any) => {
      const tglTemuan = parseCustomDate(r['Tanggal_Temuan']) || parseCustomDate(r['Timestamp']) || new Date();
      const tglSelesai = parseCustomDate(r['Tanggal_Selesai']);
      const isClosed = (r['Status'] || '').trim().toUpperCase() === 'CLOSED';
      
      const risiko = r['Risiko'] || '';
      let priority = 'Medium';
      if (risiko.toLowerCase().includes('tinggi') || risiko.toLowerCase().includes('fatality') || risiko.toLowerCase().includes('jatuh') || risiko.toLowerCase().includes('roboh')) {
        priority = 'High';
      } else if (risiko.toLowerCase().includes('rendah')) {
        priority = 'Low';
      }

      return {
        ticketId: r['Ticket_ID'].trim(),
        date: tglTemuan,
        requestorName: r['Inspektor'] || 'Inspector',
        category: 'Inspeksi Mingguan',
        location: r['Area'] || 'Area',
        description: r['Deskripsi_Temuan'] || 'Temuan Inspeksi',
        risk: r['Risiko'] || null,
        initialControl: r['Pengendalian_Awal'] || null,
        status: isClosed ? 'CLOSED' : 'OPEN',
        priority: priority,
        photoUrl: (r['Foto_Temuan'] && r['Foto_Temuan'] !== '-') ? r['Foto_Temuan'].trim() : null,
        closingPhoto: (r['Bukti_Selesai'] && r['Bukti_Selesai'] !== '-') ? r['Bukti_Selesai'].trim() : null,
        pic: (r['PIC_Closing'] && r['PIC_Closing'] !== '-') ? r['PIC_Closing'].trim() : null,
        actionTaken: (r['Pengendalian'] && r['Pengendalian'] !== '-') ? r['Pengendalian'].trim() : null,
        documentLink: (r['Link_Dokumen'] && r['Link_Dokumen'] !== '-') ? r['Link_Dokumen'].trim() : null,
        completionDate: tglSelesai,
        source: 'inspeksi',
        pt: 'TBP'
      };
    });

    await db.delete(tickets).where(eq(tickets.source, 'inspeksi'));
    for (let i = 0; i < ticketValues.length; i += 50) {
      const chunk = ticketValues.slice(i, i + 50);
      await db.insert(tickets).values(chunk);
    }

    res.json({ success: true, count: ticketValues.length, message: `Berhasil menyinkronkan ${ticketValues.length} data temuan dari Google Sheets.` });
  } catch (error: any) {
    console.error("Sync sheet error:", error);
    res.status(500).json({ error: "Gagal sinkronisasi data sheet: " + (error.message || String(error)) });
  }
});
