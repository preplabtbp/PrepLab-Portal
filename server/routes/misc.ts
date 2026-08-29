import { Router } from "express";
import { Readable } from "stream";
import { db } from "../../src/db/index.js";
import { eq, desc, or, inArray, isNull, and, gte, lte } from "drizzle-orm";
import { 
  chatMessages, employees, equipments, workOrders, users, tickets, downtime, 
  spareparts, apdSettings, apdHistory, apdDocuments, roster, inspections, 
  pemantauan, questions, agendaEvents, privateNotes, userThemes, bulletinPosts, 
  notifications, bulletinComments, uploadedFiles, appSettings, pelanggaran, 
  mealReports, pushSubscriptions, quizQuestions, preplabCloudLogs, quizScores, induksi,
  developerUsers, communityQuotes
} from "../../src/db/schema.js";
import { generatePdfFromTemplate, drive } from '../../google-services.js';
import { 
  sendWebPush, getUniverse, uploadFileToDrive, syncBulletinToAgenda, 
  getNotificationTargets, getTableObj, sanitizePayload 
} from "../utils.js";
import webpush from 'web-push';
import path from "path";

export const router = Router();

router.get('/api/developers', async (req, res) => {
  try {
    const devs = await db.select().from(developerUsers);
    res.json(devs);
  } catch (err) {
    console.error("Error fetching developers:", err);
    res.json([
      { nik: '02D25000055', name: 'Muhamad Anugrah Ramadhan' },
      { nik: '02D24000043', name: 'Muhamad Alvin Febriansyah' }
    ]);
  }
});

// In-memory fallback array for Group Safety Reports & Feed
const chatMessagesMemory: any[] = [];
const groupReportsMemory: any[] = [];

router.get('/api/chat/:room', async (req, res) => {
  try {
    const room = req.params.room;
    const msgs = chatMessagesMemory.filter(m => m.room === room);
    res.json(msgs);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch messages", details: err.message });
  }
});

function getISOWeekTag(d: Date = new Date()): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `W${weekNum}`;
}

function extractWeekTag(title?: string, fileName?: string, timestamp?: string | Date): string {
  if (timestamp) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return getISOWeekTag(d);
    }
  }
  const combined = `${title || ''} ${fileName || ''}`.toUpperCase();
  const match = combined.match(/W(?:EEK)?\s*(\d+)/i);
  if (match && match[1]) {
    return `W${match[1]}`;
  }
  return getISOWeekTag();
}

const deletedReportIds = new Set<string>();

function parseWeekNumber(weekStr?: string): number {
  if (!weekStr) return 0;
  const match = weekStr.match(/W(?:EEK)?\s*(\d+)/i);
  return match && match[1] ? parseInt(match[1], 10) : 0;
}

function parseInspectionDate(insp: any, dataFObj?: any): Date {
  const userDateFields = [
    dataFObj?.tanggal,
    dataFObj?.date,
    dataFObj?.tgl,
    dataFObj?.tglInspeksi,
    dataFObj?.tanggalInspeksi,
    dataFObj?.tgl_inspeksi,
    dataFObj?.tanggal_inspeksi,
    dataFObj?.payload?.headerInfo?.tanggal,
    dataFObj?.payload?.tanggal,
    dataFObj?.head?.tanggal,
    dataFObj?.headerInfo?.tanggal,
    dataFObj?.infoGeneral?.tanggal,
    insp?.date,
    insp?.tanggal
  ];

  for (const val of userDateFields) {
    if (!val) continue;

    if (val instanceof Date && !isNaN(val.getTime())) {
      return val;
    }
    
    if (typeof val === 'string') {
      const dmYMatch = val.trim().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](20\d{2})/);
      if (dmYMatch) {
        const day = parseInt(dmYMatch[1], 10);
        const month = parseInt(dmYMatch[2], 10) - 1;
        const year = parseInt(dmYMatch[3], 10);
        if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) return d;
        }
      }
      
      const yMdMatch = val.trim().match(/^(20\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (yMdMatch) {
        const year = parseInt(yMdMatch[1], 10);
        const month = parseInt(yMdMatch[2], 10) - 1;
        const day = parseInt(yMdMatch[3], 10);
        if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) return d;
        }
      }

      const parsedDate = new Date(val);
      if (!isNaN(parsedDate.getTime())) return parsedDate;
    }
  }

  return new Date();
}

async function fetchAllGroupReports(filterWeek?: string) {
  const currentWeekTag = getISOWeekTag(new Date());

  const allEmps = await db.select().from(employees);

  const empMapByNik = new Map<string, any>();
  const empMapByName = new Map<string, any>();
  allEmps.forEach(e => {
    if (e.nik) empMapByNik.set(e.nik.trim().toUpperCase(), e);
    if (e.name) empMapByName.set(e.name.trim().toLowerCase(), e);
  });

  const reportsList: any[] = [];
  const seenIds = new Set<string>();
  const seenPdfUrls = new Set<string>();

  const isWeekAllowed = (weekTag: string) => {
    if (!filterWeek || filterWeek === 'ALL') return true;

    // Match exact weekTag (e.g. W35 === W35 or W34 === W34)
    if (weekTag === filterWeek) return true;

    const wNum = parseWeekNumber(weekTag);
    const targetNum = parseWeekNumber(filterWeek);
    if (wNum > 0 && targetNum > 0) {
      return wNum === targetNum;
    }

    return false;
  };

  // 1. Memory reports
  groupReportsMemory.forEach(msg => {
    if (deletedReportIds.has(msg.id)) return;
    const msgWeek = msg.week || extractWeekTag(msg.pdfTitle, msg.pdfFileName, msg.timestamp);
    if (!isWeekAllowed(msgWeek)) return;

    if (msg.id) seenIds.add(msg.id);
    if (msg.pdfUrl) seenPdfUrls.add(msg.pdfUrl);
    reportsList.push(msg);
  });

  // 2. DB inspections
  try {
    const dbInspections = await db.select().from(inspections);
    dbInspections.forEach((insp: any) => {
      const dbMsgId = `insp-db-${insp.id}`;
      if (deletedReportIds.has(dbMsgId)) return;

      let dataFObj: any = {};
      if (insp.dataF && typeof insp.dataF === 'string' && insp.dataF.trim().startsWith('{')) {
        try {
          dataFObj = JSON.parse(insp.dataF);
        } catch (e) {}
      }

      const actualDate = parseInspectionDate(insp, dataFObj);
      const createdIso = actualDate.toISOString();
      const weekTag = getISOWeekTag(actualDate);

      if (!isWeekAllowed(weekTag)) return;

      let rawPdfUrl = insp.pdfUrl;
      let displayPdfUrl: string | null = null;

      if (rawPdfUrl) {
        if (typeof rawPdfUrl === 'string' && rawPdfUrl.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(rawPdfUrl);
            displayPdfUrl = parsed.tbp || parsed.gps || (Object.values(parsed)[0] as string) || null;
          } catch (e) {
            displayPdfUrl = rawPdfUrl;
          }
        } else {
          displayPdfUrl = String(rawPdfUrl);
        }
      }

      if (!displayPdfUrl || displayPdfUrl === 'null' || displayPdfUrl === 'undefined') {
        displayPdfUrl = '#';
      }

      if (seenPdfUrls.has(displayPdfUrl) && displayPdfUrl !== '#') return;
      if (displayPdfUrl !== '#') seenPdfUrls.add(displayPdfUrl);

      const title = insp.type || dataFObj.judulForm || 'Checklist Inspeksi Terpadu';
      const inspRaw = String(insp.inspectorName || insp.inspector || dataFObj.insp1 || 'Inspektor').trim();
      const nikMatch = inspRaw.match(/(?:M\d{9,10}|\d{2,4}D\d{7,10}|\d{10})/i);
      const extractedNik = nikMatch ? nikMatch[0].toUpperCase() : '';
      
      let matchedEmp = extractedNik ? empMapByNik.get(extractedNik) : null;
      if (!matchedEmp) {
        const cleanName = inspRaw.split('|')[0].trim().toLowerCase();
        matchedEmp = empMapByName.get(cleanName);
      }

      const senderNik = matchedEmp ? matchedEmp.nik : (extractedNik || '02D000000');
      const senderName = matchedEmp ? matchedEmp.name : (inspRaw.split('|')[0].trim() || 'Inspektor');
      const senderRole = matchedEmp ? (matchedEmp.jabatan || matchedEmp.position || 'Inspector') : 'Inspector';

      const niksSet = new Set<string>();
      if (senderNik) niksSet.add(senderNik);

      const allInspTexts = [
        inspRaw,
        dataFObj.insp1,
        dataFObj.insp2,
        dataFObj.insp3
      ].filter(Boolean);

      allInspTexts.forEach(t => {
        const textStr = String(t).trim();
        const nm = textStr.match(/(?:M\d{9,10}|\d{2,4}D\d{7,10}|\d{10})/i);
        if (nm) niksSet.add(nm[0].toUpperCase());
        allEmps.forEach(e => {
          if (e.name && textStr.toLowerCase().includes(e.name.toLowerCase().trim())) {
            niksSet.add(e.nik);
          }
        });
      });

      const subTitle = (insp.location && insp.location !== '-') ? `Lokasi: ${insp.location}` : (dataFObj.lokasiUmum ? `Lokasi: ${dataFObj.lokasiUmum}` : 'PDF Terlampir');

      const dbReportMsg = {
        id: dbMsgId,
        senderNik,
        senderName,
        senderRole,
        allInspectorNiks: Array.from(niksSet),
        text: `Formulir Inspeksi ${title} telah selesai dilaksanakan.`,
        type: 'pdf_report',
        pdfTitle: title,
        pdfSubTitle: subTitle,
        pdfUrl: displayPdfUrl,
        pdfFileName: `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
        photos: [],
        week: weekTag,
        timestamp: createdIso
      };

      reportsList.push(dbReportMsg);
    });
  } catch (err) {
    console.error('Error reading DB inspections for group reports:', err);
  }

  reportsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return reportsList;
}

// --- GROUP REPORT & REKAP API ENDPOINTS ---
router.get('/api/group-reports', async (req, res) => {
  try {
    const rawWeek = (req.query.week as string) || '';
    const reports = await fetchAllGroupReports(rawWeek);
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/api/group-reports', async (req, res) => {
  try {
    const { senderNik, senderName, senderRole, text, type, pdfTitle, pdfSubTitle, pdfUrl, pdfFileName, photos, inspectorNiks } = req.body;
    
    // Extract week tag (e.g. W35, W34, etc.)
    const weekTag = extractWeekTag(pdfTitle || text, pdfFileName);
    
    // Consolidate all inspector NIKs (multi-inspector support!)
    const niksSet = new Set<string>();
    if (senderNik) niksSet.add(senderNik);

    // Fetch all employees to match NIKs or names
    const allEmps = await db.select().from(employees);

    if (Array.isArray(inspectorNiks)) {
      inspectorNiks.forEach((item: string) => {
        if (item && typeof item === 'string') {
          const trimmed = item.trim();
          if (trimmed) {
            niksSet.add(trimmed);
            // Also match name if string contains inspector name
            const matchedEmp = allEmps.find(e => 
              e.nik === trimmed || 
              (e.name && (e.name.toLowerCase() === trimmed.toLowerCase() || trimmed.toLowerCase().includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(trimmed.toLowerCase())))
            );
            if (matchedEmp) niksSet.add(matchedEmp.nik);
          }
        }
      });
    }

    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      senderNik: senderNik || '02D000000',
      senderName: senderName || 'Anonim Inspektor',
      senderRole: senderRole || 'Staff',
      allInspectorNiks: Array.from(niksSet),
      text: text || '',
      type: type || (pdfUrl ? 'pdf_report' : 'text'),
      pdfTitle: pdfTitle || 'LAPORAN INSPEKSI TERPADU',
      pdfSubTitle: pdfSubTitle || 'PDF Terlampir',
      pdfUrl: pdfUrl || null,
      pdfFileName: pdfFileName || 'Laporan_Inspeksi_PrepLab.pdf',
      photos: photos || [],
      week: weekTag,
      timestamp: new Date().toISOString()
    };
    groupReportsMemory.unshift(newMsg);
    res.status(201).json(newMsg);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete individual chat message (Developer Action)
router.delete('/api/group-reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    deletedReportIds.add(id);
    const index = groupReportsMemory.findIndex(m => m.id === id);
    if (index !== -1) {
      groupReportsMemory.splice(index, 1);
    }
    res.json({ success: true, message: 'Pesan berhasil dihapus.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset Rekapan & Chat (Developer Action)
router.post('/api/group-reports/reset', async (req, res) => {
  try {
    const { week } = req.body;
    if (week && week !== 'ALL') {
      for (let i = groupReportsMemory.length - 1; i >= 0; i--) {
        const msgWeek = groupReportsMemory[i].week || extractWeekTag(groupReportsMemory[i].pdfTitle, groupReportsMemory[i].pdfFileName, groupReportsMemory[i].timestamp);
        if (msgWeek === week) {
          groupReportsMemory.splice(i, 1);
        }
      }
    } else {
      groupReportsMemory.length = 0;
    }
    res.json({ success: true, message: `Rekapan ${week ? week : 'keseluruhan'} berhasil di-reset!` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export const manualCutiOverridesMap = new Map<string, boolean>();

router.post('/api/rekap-inspeksi/override-cuti', async (req, res) => {
  try {
    const { nik, isCuti } = req.body;
    if (!nik) return res.status(400).json({ error: 'NIK wajib diisi!' });
    
    manualCutiOverridesMap.set(String(nik).trim(), !!isCuti);
    res.json({ 
      success: true, 
      message: `Status personil NIK ${nik} berhasil diubah ke ${isCuti ? 'Cuti' : 'Aktif (Wajib Inspeksi)'}!` 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/rekap-inspeksi', async (req, res) => {
  try {
    const selectedWeek = (req.query.week as string) || getISOWeekTag();
    const allEmployees = await db.select().from(employees);
    const allRoster = await db.select().from(roster);

    // Build Cuti Set for employees on leave based on Roster & Employee profile
    const onCutiSet = new Set<string>();
    
    const rosterMap = new Map<string, any[]>();
    allRoster.forEach(r => {
      if (r.nik) {
        if (!rosterMap.has(r.nik)) rosterMap.set(r.nik, []);
        rosterMap.get(r.nik)!.push(r);
      }
    });

    const isExplicitCutiCode = (st?: string) => {
      if (!st) return false;
      const s = st.trim().toUpperCase();
      // OFF, LS, OS, D, N, NS, WORK, P are NOT Cuti! OFF remains INCLUDED!
      if (s === 'OFF' || s === 'LS' || s === 'OS' || s === 'D' || s === 'N' || s === 'NS' || s === 'WORK' || s === 'P') {
        return false;
      }
      if (
        s === 'C' || s === 'CUTI' || s === 'UL' || s === 'DL' || s === 'CR' || s === 'SL' || s === 'IA' || s === 'IK' || s === 'XP' ||
        s.startsWith('CT') || s.startsWith('CE') || s.startsWith('CI') || s.startsWith('CS') || s.startsWith('TRV')
      ) {
        return true;
      }
      return false;
    };

    const getDateStringsForWeek = (weekTag: string): string[] => {
      let startDay = 0, endDay = 0, monthName = 'Aug';
      if (weekTag === 'W34') { startDay = 18; endDay = 24; monthName = 'Aug'; }
      else if (weekTag === 'W35') { startDay = 25; endDay = 31; monthName = 'Aug'; }
      else if (weekTag === 'W36') { startDay = 1; endDay = 7; monthName = 'Sep'; }
      else if (weekTag === 'W37') { startDay = 8; endDay = 14; monthName = 'Sep'; }

      if (startDay > 0) {
        const list: string[] = [];
        for (let d = startDay; d <= endDay; d++) {
          list.push(`${d} ${monthName} 26`);
          list.push(`${d.toString().padStart(2, '0')} ${monthName} 26`);
        }
        return list;
      }
      return [];
    };

    const targetWeekDates = getDateStringsForWeek(selectedWeek);

    allEmployees.forEach(emp => {
      if (!emp.nik) return;
      
      const cleanNik = emp.nik.trim();

      // 1. Check manual override first
      if (manualCutiOverridesMap.has(cleanNik)) {
        if (manualCutiOverridesMap.get(cleanNik) === true) {
          onCutiSet.add(cleanNik);
        }
        return;
      }

      // 2. Check employee profile status explicitly marked as CUTI
      const sm = (emp.statusMess || '').toString().trim().toUpperCase();
      const sk = (emp.statusKaryawan || '').toString().trim().toUpperCase();
      
      if (sm === 'CUTI' || sk === 'CUTI') {
        onCutiSet.add(cleanNik);
        return;
      }

      // 3. Check roster ONLY for target dates in selectedWeek
      const empRosters = rosterMap.get(cleanNik);
      if (empRosters && empRosters.length > 0 && targetWeekDates.length > 0) {
        const weekEntries = empRosters.filter(r => targetWeekDates.includes((r.date || '').trim()));
        if (weekEntries.length > 0) {
          const cutiDays = weekEntries.filter(r => isExplicitCutiCode(r.status));
          // If employee has ANY cuti day during this week, mark as Cuti!
          if (cutiDays.length > 0) {
            onCutiSet.add(cleanNik);
          }
        }
      }
    });

    const isGolonganI = (emp: any): boolean => {
      const golStr = String(emp.gol || '').trim().toUpperCase();
      const jgStr = String(emp.jobGrade || '').trim().toUpperCase();
      const posStr = String(emp.jabatan || emp.position || '').trim().toLowerCase();

      // 1. Check explicit Golongan I in gol column
      if (
        golStr === 'I' || golStr === '1' ||
        golStr.startsWith('I.') || golStr.startsWith('1.') ||
        golStr.startsWith('I-') || golStr.startsWith('1-') ||
        golStr.startsWith('I/') || golStr.startsWith('1/') ||
        golStr.startsWith('I ') || golStr.startsWith('1 ') ||
        golStr === 'IA' || golStr === 'IB' || golStr === 'IC' || golStr === 'ID' || golStr === 'IE'
      ) {
        return true;
      }

      // 2. Check Job Grade for Crew Golongan I (S1.1, S1.2, S1.3, 1.1, 1.2, 1.3, S1, etc.)
      if (
        jgStr.startsWith('S1') || jgStr.startsWith('1.') || jgStr === '1' || 
        jgStr.startsWith('I.') || jgStr.startsWith('I-')
      ) {
        return true;
      }

      // 3. Crew position without leadership title (Foreman/Supervisor/Admin/Officer/Manager/Superintendent/Specialist)
      const isLeader = 
        posStr.includes('foreman') || posStr.includes('supervisor') || posStr.includes('admin') || 
        posStr.includes('officer') || posStr.includes('manager') || posStr.includes('superintendent') || 
        posStr.includes('specialist') || posStr.includes('analyst') || posStr.includes('technician') || posStr.includes('chemist');

      if (!golStr && !jgStr && !isLeader) {
        return true;
      }

      return false;
    };

    // Filter employees: ONLY GOL II KE ATAS (Exclude Gol I, Exclude GTS, Exclude System Admin, Exclude Cuti)
    const targetEmployees = allEmployees.filter(emp => {
      // 1. Exclude System/Admin accounts
      const nikLower = (emp.nik || '').toString().trim().toLowerCase();
      const nameLower = (emp.name || '').toString().trim().toLowerCase();
      const usernameLower = (emp.username || '').toString().trim().toLowerCase();
      if (nikLower === 'preplabadmin' || nikLower === 'admin' || nikLower === '02d000000' || nikLower.includes('admin') || usernameLower.includes('admin') || nameLower.includes('admin')) {
        return false;
      }

      // 2. Exclude GTS Employees ONLY (pt === GTS or NIK starts with 03 / M03). KEEP M04 / M0 (TBP & GPS)!
      const ptUpper = (emp.pt || '').toString().trim().toUpperCase();
      const nikUpper = (emp.nik || '').toString().trim().toUpperCase();
      if (ptUpper === 'GTS' || nikUpper.startsWith('03') || nikUpper.startsWith('M03')) {
        return false;
      }

      // 3. Exclude Gol I (STRICTLY KEEP GOL II KE ATAS ONLY)
      if (isGolonganI(emp)) {
        return false;
      }

      // 4. Exclude Employees currently ON CUTI / LEAVE
      if (onCutiSet.has(emp.nik)) {
        return false;
      }

      return true;
    });

    // Find all users who completed inspection for the selected week
    const completedSet = new Map<string, any>();
    
    const registerCompletedUser = (key: string, info: any) => {
      if (!key) return;
      const cleanKey = key.toString().trim().toLowerCase();
      if (cleanKey && !completedSet.has(cleanKey)) {
        completedSet.set(cleanKey, info);
      }
    };

    // 1. Scan groupReportsMemory (in-memory group posts)
    groupReportsMemory.forEach(msg => {
      const msgWeek = msg.week || extractWeekTag(msg.pdfTitle, msg.pdfFileName, msg.timestamp);
      
      if (selectedWeek === 'ALL' || msgWeek === selectedWeek) {
        if (msg.type === 'pdf_report') {
          const info = {
            timestamp: msg.timestamp,
            pdfUrl: msg.pdfUrl,
            pdfTitle: msg.pdfTitle,
            week: msgWeek
          };

          if (msg.senderNik) registerCompletedUser(msg.senderNik, info);
          if (msg.senderName) registerCompletedUser(msg.senderName, info);

          if (Array.isArray(msg.allInspectorNiks)) {
            msg.allInspectorNiks.forEach((item: string) => {
              if (item) registerCompletedUser(item, info);
            });
          }
        }
      }
    });

    // 2. Scan DB `inspections` table
    try {
      const dbInspections = await db.select().from(inspections);
      dbInspections.forEach((insp: any) => {
        const inspText = String(insp.inspector || insp.insp1 || '').trim();
        const createdIso = insp.createdAt ? new Date(insp.createdAt).toISOString() : new Date().toISOString();
        const inspWeek = extractWeekTag(insp.judulForm || '', insp.lokasi || '', createdIso);

        if (selectedWeek === 'ALL' || inspWeek === selectedWeek) {
          const info = {
            timestamp: createdIso,
            pdfUrl: insp.pdfUrl,
            pdfTitle: insp.judulForm || 'Laporan Inspeksi',
            week: inspWeek
          };

          if (inspText) registerCompletedUser(inspText, info);

          const nikMatches = inspText.match(/(?:M\d{9,10}|\d{2,4}D\d{7,10}|\d{10})/gi) || [];
          nikMatches.forEach((nik: string) => registerCompletedUser(nik, info));

          allEmployees.forEach(e => {
            if (e.name && inspText.toLowerCase().includes(e.name.toLowerCase().trim())) {
              registerCompletedUser(e.nik, info);
              registerCompletedUser(e.name, info);
            }
          });
        }
      });
    } catch (dbErr) {
      console.error('Error scanning DB inspections for rekap:', dbErr);
    }

    const rekapList = targetEmployees.map(emp => {
      const nikClean = (emp.nik || '').trim().toLowerCase();
      const nameClean = (emp.name || '').trim().toLowerCase();
      const isDone = completedSet.has(nikClean) || completedSet.has(nameClean);
      const info = completedSet.get(nikClean) || completedSet.get(nameClean);
      return {
        nik: emp.nik,
        name: emp.name,
        gol: emp.gol || 'II',
        jobGrade: emp.jobGrade || '-',
        section: emp.section || 'General',
        pt: emp.pt || 'TBP',
        jabatan: emp.jabatan || emp.position || 'Personil',
        shift: emp.shift || 'Nonshift',
        status: isDone ? 'SUDAH' : 'BELUM',
        isCuti: false,
        completedAt: isDone ? info.timestamp : null,
        pdfUrl: isDone ? info.pdfUrl : null,
        pdfTitle: isDone ? info.pdfTitle : null,
        week: isDone ? info.week : selectedWeek
      };
    });

    // Build Cuti list
    const cutiEmployees = allEmployees.filter(emp => {
      const cleanNik = (emp.nik || '').trim();
      if (!cleanNik) return false;
      const nikLower = cleanNik.toLowerCase();
      if (nikLower === 'preplabadmin' || nikLower === 'admin' || nikLower === '02d000000' || nikLower.includes('admin')) return false;
      const ptUpper = (emp.pt || '').toString().trim().toUpperCase();
      if (ptUpper === 'GTS' || cleanNik.toUpperCase().startsWith('03') || cleanNik.toUpperCase().startsWith('M03')) return false;
      if (isGolonganI(emp)) return false;

      return onCutiSet.has(cleanNik);
    });

    const cutiList = cutiEmployees.map(emp => ({
      nik: emp.nik,
      name: emp.name,
      gol: emp.gol || 'II',
      jobGrade: emp.jobGrade || '-',
      section: emp.section || 'General',
      pt: emp.pt || 'TBP',
      jabatan: emp.jabatan || emp.position || 'Personil',
      shift: emp.shift || 'Nonshift',
      status: 'CUTI',
      isCuti: true,
      completedAt: null,
      pdfUrl: null,
      pdfTitle: null,
      week: selectedWeek
    }));

    const total = rekapList.length;
    const sudah = rekapList.filter(r => r.status === 'SUDAH').length;
    const belum = total - sudah;
    const percentage = total > 0 ? Math.round((sudah / total) * 100) : 0;

    res.json({
      summary: { total, sudah, belum, percentage, selectedWeek, cutiCount: cutiList.length },
      rekapList,
      cutiList
    });
  } catch (err: any) {
    console.error('Error fetching rekap:', err);
    res.status(500).json({ error: err.message });
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
        const defaultWeek = availableWeeks[0] || 'Minggu ke-35 (2026)';
        const rawReqWeek = (req.query.week as string) || defaultWeek;
        const isAll = !rawReqWeek || rawReqWeek === 'ALL' || rawReqWeek.toLowerCase().includes('semua');
        const filteredPhotos = isAll ? allGallery : allGallery.filter(p => p.week === rawReqWeek || (p.week && p.week.toLowerCase() === rawReqWeek.toLowerCase()));
        return res.json({
          currentWeek: rawReqWeek,
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

      // 1. Fetch from PostgreSQL inspections table (Dokumentasi Proses Pelaksanaan Inspeksi)
      try {
        const dbInsps = await db.select().from(inspections);
        for (const insp of dbInsps) {
          const dateObj = insp.date ? new Date(insp.date) : new Date();
          const tglFormatted = dateObj.toLocaleDateString('id-ID');
          const weekLabel = getISOWeekLabel(dateObj, insp.type);
          const inspector = insp.inspectorName ? insp.inspectorName.split('|')[0].trim() : 'Inspector';
          const area = insp.location || 'Area Kerja';
          const category = insp.type || 'Inspeksi Terpadu';

          if (insp.photoUrl && insp.photoUrl !== '-') {
            if (insp.photoUrl.startsWith('{')) {
              try {
                const parsedPhoto = JSON.parse(insp.photoUrl);
                // Hanya ambil foto proses dokumentasi inspeksi (bukan foto temuan)
                if (parsedPhoto.fotoProses && parsedPhoto.fotoProses !== '-' && !seenUrls.has(parsedPhoto.fotoProses.trim())) {
                  seenUrls.add(parsedPhoto.fotoProses.trim());
                  allGallery.push({
                    url: parsedPhoto.fotoProses.trim(),
                    week: weekLabel,
                    sumber: `${category}`,
                    area: `${category} - ${area}`,
                    inspektor: inspector,
                    tanggal: tglFormatted,
                    timestamp: dateObj.getTime()
                  });
                }
              } catch(e) {}
            } else if (insp.photoUrl.startsWith('http') && !seenUrls.has(insp.photoUrl.trim())) {
              seenUrls.add(insp.photoUrl.trim());
              allGallery.push({
                url: insp.photoUrl.trim(),
                week: weekLabel,
                sumber: `${category}`,
                area: `${category} - ${area}`,
                inspektor: inspector,
                tanggal: tglFormatted,
                timestamp: dateObj.getTime()
              });
            }
          }
        }
      } catch (err) {
        console.error("Error reading db inspections for gallery:", err);
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

      // 2. Fetch from Google Sheets for all Form Logs (Hanya Foto Proses / Dokumentasi Pelaksanaan)
      const spreadsheetId = '1vG6iSl8uPHhwtH2tGUlyb0l4IK3r3ZhavtkkdHhEmP0';
      const sheetConfigs = [
        { sheet: 'Log_Umum', sumber: 'Inspeksi Umum', photoKeys: ['URL_Foto_Bukti'], areaKey: 'Lokasi_Spesifik', inspKey: 'Nama_Inspektur', dateKey: 'Timestamp', descKey: 'Catatan_Temuan', idKey: 'ID_Inspeksi' },
        { sheet: 'Log_APD', sumber: 'Kepatuhan APD', photoKeys: ['Foto Inspeksi'], areaKey: 'Bagian', inspKey: 'Nama Inspektor 1', dateKey: 'Tanggal', descKey: 'Kategori_Laporan', idKey: 'Kategori_Laporan' },
        { sheet: 'Log_P3K', sumber: 'Kotak P3K', photoKeys: ['Foto Proses'], areaKey: 'Judul Form', inspKey: 'Inspektor 1', dateKey: 'Tanggal', descKey: 'Item P3K', idKey: 'Judul File' },
        { sheet: 'Log_Perkakas', sumber: 'Peralatan & Perkakas', photoKeys: ['Foto_Proses'], areaKey: 'Nama Perkakas', inspKey: 'Inspektor 1', dateKey: 'Tanggal', descKey: 'Catatan', idKey: 'Judul Form' },
        { sheet: 'Log_Tabung', sumber: 'Tabung Gas', photoKeys: ['Foto_Proses'], areaKey: 'Judul Form', inspKey: 'Inspektor 1', dateKey: 'Tanggal', descKey: 'Keterangan', idKey: 'Judul Form' },
        { sheet: 'Log_Sarana', sumber: 'Sarana Unit', photoKeys: ['Foto_Proses'], areaKey: 'Unit Sarana', inspKey: 'Inspektor 1', dateKey: 'Tanggal', descKey: 'Catatan', idKey: 'Judul Form' },
        { sheet: 'Log_Tangga', sumber: 'Tangga Portabel', photoKeys: ['Foto_Proses'], areaKey: 'No Registrasi', inspKey: 'Inspektor 1', dateKey: 'Tanggal', descKey: 'Catatan', idKey: 'Nama File' }
      ];

      await Promise.all(sheetConfigs.map(async (cfg) => {
        try {
          const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${cfg.sheet}`;
          const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
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
      const defaultWeek = availableWeeks[0] || 'Minggu ke-35 (2026)';
      const rawReqWeek = (req.query.week as string) || defaultWeek;
      const isAll = !rawReqWeek || rawReqWeek === 'ALL' || rawReqWeek.toLowerCase().includes('semua');

      const filteredPhotos = isAll ? allGallery : allGallery.filter(p => p.week === rawReqWeek || (p.week && p.week.toLowerCase() === rawReqWeek.toLowerCase()));

      return res.json({
        currentWeek: rawReqWeek,
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

      let likedByUsers: any[] = [];
      try {
        likedByUsers = typeof t.likedByUsers === 'string' ? JSON.parse(t.likedByUsers) : (t.likedByUsers || []);
      } catch (e) {
        likedByUsers = [];
      }

      const item = {
        id: t.id,
        name: t.themeName || 'Tema Kustom',
        mode: t.mode,
        nik: t.nik,
        authorName: t.authorName || t.nik || 'Anggota Lab',
        isPublished: Boolean(t.isPublished),
        publishedAt: t.publishedAt,
        likesCount: t.likesCount || (t.likedBy ? t.likedBy.length : 0),
        likedBy: t.likedBy || [],
        likedByUsers,
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
      const data = await db.select().from(userThemes).where(eq(userThemes.isPublished, true)).orderBy(desc(userThemes.likesCount), desc(userThemes.publishedAt), desc(userThemes.id));
      const communityThemes = data.map(t => {
        let parsedColors = {};
        try {
          parsedColors = typeof t.colors === 'string' ? JSON.parse(t.colors) : (t.colors || {});
        } catch (e) {
          parsedColors = {};
        }

        let likedByUsers: any[] = [];
        try {
          likedByUsers = typeof t.likedByUsers === 'string' ? JSON.parse(t.likedByUsers) : (t.likedByUsers || []);
        } catch (e) {
          likedByUsers = [];
        }

        return {
          id: t.id,
          name: t.themeName || 'Tema Komunitas',
          mode: t.mode,
          nik: t.nik,
          authorName: t.authorName || t.nik || 'Anggota Lab',
          publishedAt: t.publishedAt,
          likesCount: t.likesCount || (t.likedBy ? t.likedBy.length : 0),
          likedBy: t.likedBy || [],
          likedByUsers,
          colors: parsedColors
        };
      });
      res.json({ status: "success", data: communityThemes });
    } catch (error: any) {
      console.warn("Themes community fetch warning:", error.message);
      res.json({ status: "success", data: [] });
    }
  });

router.post(["/api/themes/:id/like", "/api/themes/templates/:id/like"], async (req, res) => {
  try {
    const templateId = parseInt(req.params.id);
    const { nik, name, role } = req.body;
    if (!templateId) return res.status(400).json({ status: "error", message: "ID template tidak valid" });
    if (!nik) return res.status(400).json({ status: "error", message: "NIK is required" });

    const found = await db.select().from(userThemes).where(eq(userThemes.id, templateId)).limit(1);
    if (found.length === 0) {
      return res.status(404).json({ status: "error", message: "Tema tidak ditemukan" });
    }

    const theme = found[0];
    let likedBy: string[] = Array.isArray(theme.likedBy) ? [...theme.likedBy] : [];
    let likedByUsers: any[] = [];
    try {
      likedByUsers = typeof theme.likedByUsers === 'string' ? JSON.parse(theme.likedByUsers) : (theme.likedByUsers || []);
    } catch (e) {
      likedByUsers = [];
    }

    const alreadyLiked = likedBy.includes(nik);
    let isLiked = false;

    if (alreadyLiked) {
      // Unlike
      likedBy = likedBy.filter(n => n !== nik);
      likedByUsers = likedByUsers.filter((u: any) => u.nik !== nik);
      isLiked = false;
    } else {
      // Like
      likedBy.push(nik);
      likedByUsers.push({
        nik,
        name: name || nik,
        role: role || 'Personil',
        likedAt: new Date().toISOString()
      });
      isLiked = true;
    }

    const likesCount = likedBy.length;

    await db.update(userThemes).set({
      likesCount,
      likedBy,
      likedByUsers: JSON.stringify(likedByUsers),
      updatedAt: new Date()
    }).where(eq(userThemes.id, templateId));

    res.json({
      status: "success",
      likesCount,
      likedBy,
      likedByUsers,
      isLiked,
      message: isLiked ? "Menyukai tema!" : "Batal menyukai tema."
    });
  } catch (error: any) {
    console.error("Error toggling theme like:", error);
    res.status(500).json({ status: "error", message: error.message });
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
      const customTemplates: Array<{ id: number; name: string; mode: string; colors: any; isPublished?: boolean; authorName?: string; publishedAt?: any; likesCount?: number; likedBy?: string[] }> = [];
      
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
            likesCount: t.likesCount || 0,
            likedBy: t.likedBy || [],
            colors: parsedColors
          });
        } else {
          themes[t.mode] = { id: t.id, themeName: t.themeName, colors: parsedColors };
        }
      });

      // Also fetch community themes safely
      let communityThemes: any[] = [];
      try {
        const commData = await db.select().from(userThemes).where(eq(userThemes.isPublished, true)).orderBy(desc(userThemes.likesCount), desc(userThemes.publishedAt), desc(userThemes.id));
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
            likesCount: t.likesCount || 0,
            likedBy: t.likedBy || [],
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

// --- COMMUNITY QUOTES POOL ENDPOINTS ---

router.get("/api/quotes", async (req, res) => {
  try {
    const data = await db.select().from(communityQuotes).orderBy(desc(communityQuotes.likesCount), desc(communityQuotes.id));

    const quotes = data.map(q => {
      let likedByUsers: any[] = [];
      try {
        likedByUsers = typeof q.likedByUsers === 'string' ? JSON.parse(q.likedByUsers) : (q.likedByUsers || []);
      } catch (e) {
        likedByUsers = [];
      }
      return {
        id: q.id,
        quote: q.quote,
        authorNik: q.authorNik,
        authorName: q.authorName,
        authorRole: q.authorRole,
        authorSection: q.authorSection,
        category: q.category,
        likesCount: q.likesCount || (q.likedBy ? q.likedBy.length : 0),
        likedBy: q.likedBy || [],
        likedByUsers,
        createdAt: q.createdAt
      };
    });

    res.json({ status: "success", data: quotes });
  } catch (error: any) {
    console.error("Error fetching quotes:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.post("/api/quotes", async (req, res) => {
  try {
    const { quote, authorNik, authorName, authorRole, authorSection, category } = req.body;
    if (!quote || !quote.trim()) {
      return res.status(400).json({ status: "error", message: "Isi quote tidak boleh kosong" });
    }
    if (!authorNik) {
      return res.status(400).json({ status: "error", message: "NIK pembuat quote wajib diisi" });
    }

    let resolvedName = authorName;
    let resolvedRole = authorRole;
    let resolvedSection = authorSection;

    if (!resolvedName || !resolvedRole) {
      try {
        const emp = await db.select().from(employees).where(eq(employees.nik, authorNik)).limit(1);
        if (emp.length > 0) {
          if (!resolvedName) resolvedName = emp[0].nama || emp[0].name;
          if (!resolvedRole) resolvedRole = emp[0].jabatan;
          if (!resolvedSection) resolvedSection = emp[0].section || emp[0].department;
        }
      } catch (e) {}
    }

    const inserted = await db.insert(communityQuotes).values({
      quote: quote.trim(),
      authorNik: authorNik.trim(),
      authorName: resolvedName || 'Personil PrepLab',
      authorRole: resolvedRole || 'Staff',
      authorSection: resolvedSection || 'Prep & Lab',
      category: category || 'Motivasi & Skena',
      likesCount: 0,
      likedBy: [],
      likedByUsers: '[]',
      isApproved: true
    }).returning();

    const formattedQuote = {
      ...inserted[0],
      likedBy: [],
      likedByUsers: []
    };

    res.json({ 
      status: "success", 
      message: "Quote berhasil ditambahkan ke pool quotes bersama!", 
      data: formattedQuote 
    });
  } catch (error: any) {
    console.error("Error creating quote:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.post("/api/quotes/:id/like", async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    const { nik, name, role } = req.body;
    if (!quoteId) return res.status(400).json({ status: "error", message: "ID quote tidak valid" });
    if (!nik) return res.status(400).json({ status: "error", message: "NIK is required" });

    const found = await db.select().from(communityQuotes).where(eq(communityQuotes.id, quoteId)).limit(1);
    if (found.length === 0) {
      return res.status(404).json({ status: "error", message: "Quote tidak ditemukan" });
    }

    const q = found[0];
    let likedBy: string[] = Array.isArray(q.likedBy) ? [...q.likedBy] : [];
    let likedByUsers: any[] = [];
    try {
      likedByUsers = typeof q.likedByUsers === 'string' ? JSON.parse(q.likedByUsers) : (q.likedByUsers || []);
    } catch (e) {
      likedByUsers = [];
    }

    const alreadyLiked = likedBy.includes(nik);
    let isLiked = false;

    if (alreadyLiked) {
      likedBy = likedBy.filter(n => n !== nik);
      likedByUsers = likedByUsers.filter((u: any) => u.nik !== nik);
      isLiked = false;
    } else {
      likedBy.push(nik);
      likedByUsers.push({
        nik,
        name: name || nik,
        role: role || 'Personil',
        likedAt: new Date().toISOString()
      });
      isLiked = true;
    }

    const likesCount = likedBy.length;

    await db.update(communityQuotes).set({
      likesCount,
      likedBy,
      likedByUsers: JSON.stringify(likedByUsers),
      updatedAt: new Date()
    }).where(eq(communityQuotes.id, quoteId));

    res.json({
      status: "success",
      likesCount,
      likedBy,
      likedByUsers,
      isLiked,
      message: isLiked ? "Menyukai quote!" : "Batal menyukai quote."
    });
  } catch (error: any) {
    console.error("Error toggling quote like:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

router.delete("/api/quotes/:id", async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    const { nik } = req.query;
    if (!quoteId) return res.status(400).json({ status: "error", message: "ID quote tidak valid" });

    const existing = await db.select().from(communityQuotes).where(eq(communityQuotes.id, quoteId));
    if (existing.length === 0) {
      return res.status(404).json({ status: "error", message: "Quote tidak ditemukan" });
    }

    const targetQuote = existing[0];
    const devRows = await db.select().from(developerUsers);
    const devNiks = devRows.map(d => d.nik);
    const isAuthor = String(nik) === String(targetQuote.authorNik);

    if (!isAuthor) {
      return res.status(403).json({ status: "error", message: "Anda hanya dapat menghapus quote buatan Anda sendiri." });
    }

    await db.delete(communityQuotes).where(eq(communityQuotes.id, quoteId));
    res.json({ status: "success", message: "Quote berhasil dihapus dari pool." });
  } catch (error: any) {
    console.error("Error deleting quote:", error);
    res.status(500).json({ status: "error", message: error.message });
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
