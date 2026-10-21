import { Readable } from 'stream';
process.env.TZ = 'Asia/Jayapura';

// Guard against unhandled DB errors / transient connection spikes crashing the whole server
process.on('unhandledRejection', (reason: any) => {
  console.error('⚠️ [Server Safety] Unhandled Rejection captured:', reason?.message || reason);
});
process.on('uncaughtException', (err: any) => {
  console.error('⚠️ [Server Safety] Uncaught Exception captured:', err?.message || err);
});
import PDFDocument from 'pdfkit-table';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env, validateEnv } from "./server/config/env.js";
try {
  validateEnv();
} catch (e: any) {
  console.error('❌ STARTUP GAGAL — konfigurasi environment tidak lengkap:');
  console.error(`   ${e.message}`);
  console.error('   Container akan berhenti. Periksa --set-secrets / --update-secrets di Cloud Run.');
  process.exit(1);
}
import jwt from 'jsonwebtoken';
import { requireAuth, optionalAuth, JWT_SECRET } from "./server/middleware/auth.js";
import { router as miscRouter, syncMasterQuestionsFromSheet } from "./server/routes/misc.js";
import { router as bulletinRouter } from "./server/routes/bulletin.js";
import { router as quizRouter } from "./server/routes/quiz.js";
import { router as notificationsRouter } from "./server/routes/notifications.js";
import { router as workOrdersRouter } from "./server/routes/workOrders.js";
import { router as cloudRouter } from "./server/routes/cloud.js";
import { router as inspectionsRouter } from "./server/routes/inspections.js";
import { router as ticketsRouter } from "./server/routes/tickets.js";
import { router as apdRouter, syncApdDataFromSheet } from "./server/routes/apd.js";
import { router as rosterRouter } from "./server/routes/roster.js";
import { router as adminRouter } from "./server/routes/admin.js";
import { router as agendaRouter } from "./server/routes/agenda.js";
import { router as feedbackRouter } from "./server/routes/feedback.js";
import { router as changelogRouter } from "./server/routes/changelog.js";
import webpush from 'web-push';
import { generatePdfFromTemplate, drive } from './google-services.js';
import path from "path";
import * as fs from "fs";
import Papa from "papaparse";
import { createServer } from "http";
import { Server } from "socket.io";
import { setIoInstance } from "./server/utils.js";
import { db, pool } from "./src/db/index.js";
import { chatMessages, employees, equipments, workOrders, users, tickets, downtime, spareparts, apdSettings, apdHistory, apdDocuments, roster, inspections, pemantauan, questions, agendaEvents, privateNotes, userThemes, bulletinPosts, notifications, bulletinComments, uploadedFiles, appSettings, pelanggaran, mealReports, pushSubscriptions, quizQuestions, preplabCloudLogs, quizScores, easterEggProgress, induksi, developerUsers, portalLogins } from "./src/db/schema.js";

// Initialize web-push safely
const vapidPublicKey = env.VAPID_PUBLIC_KEY as string;
const vapidPrivateKey = env.VAPID_PRIVATE_KEY as string;
if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:prep.lab.tbp@gmail.com',
      vapidPublicKey,
      vapidPrivateKey
    );
  } catch (err) {
    console.warn('Warning: Failed to initialize web-push:', err);
  }
}
import { ticketSchema, workOrderSchema } from "./src/lib/zod.js";
import { eq, desc, asc, or, inArray, isNull, and, gte, lte, sql } from "drizzle-orm";
import { authRouter } from "./server/routes/auth.js";
import { debugRouter } from "./server/routes/debug.js";
import { employeesRouter } from "./server/routes/employees.js";
import { p5mRouter } from "./server/routes/p5m.js";
import { financeRouter } from "./server/routes/finance.js";
import { labbotRouter } from "./server/routes/labbot.js";
import { kbbiRouter } from "./server/routes/kbbi.js";
import { gamificationRouter } from "./server/routes/gamification.js";
import { logbookRouter } from "./server/routes/logbook.js";
import { clinicRouter } from "./server/routes/clinic.js";
import { employeeLeavesRouter } from "./server/routes/employeeLeaves.js";
import { safetyRekapRouter } from "./server/routes/safetyRekap.js";
import { inspectionPlannerRouter } from "./server/routes/inspectionPlanner.js";
import { trainingRouter, ensureTrainingRecordsTable, initTrainingNotificationCron } from "./server/routes/training.js";
import { mealOrdersRouter, ensureMealOrdersTable } from "./server/routes/mealOrders.js";
import { trainingCertificationsRouter } from "./server/routes/trainingCertifications.js";
import { userPreferencesRouter } from "./server/routes/userPreferences.js";
import { galleryRouter } from "./server/routes/gallery.js";
import { xrfRouter, ensureXrfTables } from "./server/routes/xrfCalibration.js";
import { signatureRouter } from "./server/routes/signature.js";
import { syncRosterData, initRosterCron } from "./src/syncRoster.js";

async function initDbSchema() {
  try {
    await db.execute(sql`CREATE TABLE IF NOT EXISTS user_themes (
      id SERIAL PRIMARY KEY,
      nik TEXT NOT NULL,
      mode TEXT NOT NULL,
      theme_name TEXT,
      colors TEXT,
      is_published BOOLEAN DEFAULT false,
      author_name TEXT,
      published_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`ALTER TABLE user_themes ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;`);
    await db.execute(sql`ALTER TABLE user_themes ADD COLUMN IF NOT EXISTS author_name TEXT;`);
    await db.execute(sql`ALTER TABLE user_themes ADD COLUMN IF NOT EXISTS published_at TIMESTAMP;`);
    await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS cover TEXT;`);
    await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS avatar TEXT;`);
    await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS sisa_ct TEXT;`);
    await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS jatuh_tempo_ct TEXT;`);
    await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS first_login_complete BOOLEAN DEFAULT false;`);
    await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS masa_kerja_jabatan_sebelumnya TEXT;`);
    await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS achievements JSONB;`);
    await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS catatan TEXT;`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS employee_achievements (
      id SERIAL PRIMARY KEY,
      nik TEXT NOT NULL,
      name TEXT,
      title TEXT NOT NULL,
      category TEXT,
      date TEXT,
      description TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_employee_achievements_nik ON employee_achievements(nik);`);
    await db.execute(sql`ALTER TABLE bulletin_comments ADD COLUMN IF NOT EXISTS reply_to_id INTEGER;`);
    await db.execute(sql`ALTER TABLE bulletin_comments ADD COLUMN IF NOT EXISTS reply_to_nik TEXT;`);
    await db.execute(sql`ALTER TABLE bulletin_comments ADD COLUMN IF NOT EXISTS reply_to_name TEXT;`);
    await db.execute(sql`ALTER TABLE bulletin_comments ADD COLUMN IF NOT EXISTS reply_to_content TEXT;`);
    
    await db.execute(sql`CREATE TABLE IF NOT EXISTS employee_attendance (
      id SERIAL PRIMARY KEY,
      nik TEXT NOT NULL,
      name TEXT,
      year INTEGER DEFAULT 2026 NOT NULL,
      izin INTEGER DEFAULT 0,
      izin_khusus INTEGER DEFAULT 0,
      sakit INTEGER DEFAULT 0,
      sakit_site_count INTEGER DEFAULT 0,
      sakit_luar_count INTEGER DEFAULT 0,
      alpa INTEGER DEFAULT 0,
      tanggal_izin TEXT,
      tanggal_izin_khusus TEXT,
      tanggal_sakit_site TEXT,
      tanggal_sakit_luar TEXT,
      tanggal_alpa TEXT,
      alasan_izin TEXT,
      alasan_izin_khusus TEXT,
      alasan_sakit_site TEXT,
      alasan_sakit_luar TEXT,
      alasan_sakit TEXT,
      details JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_attendance_nik_year ON employee_attendance(nik, year);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_employee_attendance_nik ON employee_attendance(nik);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_employee_attendance_year ON employee_attendance(year);`);
    await db.execute(sql`ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS alasan_izin_khusus TEXT;`);
    await db.execute(sql`ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS alasan_sakit_site TEXT;`);
    await db.execute(sql`ALTER TABLE employee_attendance ADD COLUMN IF NOT EXISTS alasan_sakit_luar TEXT;`);
    await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS attendance_data JSONB;`);
    await db.execute(sql`ALTER TABLE apd_history ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;`);
    await db.execute(sql`ALTER TABLE apd_history ADD COLUMN IF NOT EXISTS original_date_key TEXT;`);

    await db.execute(sql`CREATE TABLE IF NOT EXISTS rekap_manual_overrides (
      id SERIAL PRIMARY KEY,
      week TEXT NOT NULL,
      nik TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      pdf_url TEXT,
      pdf_title TEXT,
      updated_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`);

    await db.execute(sql`CREATE TABLE IF NOT EXISTS finance_transactions (
      id SERIAL PRIMARY KEY,
      transaction_code TEXT,
      date TEXT NOT NULL,
      item_title TEXT NOT NULL,
      merchant_name TEXT DEFAULT 'Rahmatika Freshmart',
      category TEXT DEFAULT '#Makanan',
      payment_method TEXT DEFAULT 'Tunai',
      amount INTEGER NOT NULL DEFAULT 0,
      qty INTEGER DEFAULT 1,
      notes TEXT,
      receipt_photo_url TEXT,
      created_by_nik TEXT,
      created_by_name TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`);

    await db.execute(sql`CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      room TEXT NOT NULL,
      sender_nik TEXT NOT NULL,
      sender_name TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room);`);

    await db.execute(sql`CREATE TABLE IF NOT EXISTS kta_reports (
      id SERIAL PRIMARY KEY,
      nik TEXT NOT NULL,
      name TEXT NOT NULL,
      section TEXT,
      report_type TEXT NOT NULL DEFAULT 'KTA',
      date TEXT,
      week TEXT NOT NULL,
      image_url TEXT NOT NULL,
      description TEXT,
      location TEXT,
      status TEXT DEFAULT 'SUBMITTED',
      verified_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kta_reports_week ON kta_reports(week);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kta_reports_nik ON kta_reports(nik);`);

    await db.execute(sql`CREATE TABLE IF NOT EXISTS inspection_proofs (
      id SERIAL PRIMARY KEY,
      nik TEXT NOT NULL,
      name TEXT NOT NULL,
      section TEXT,
      date TEXT,
      week TEXT NOT NULL,
      image_url TEXT NOT NULL,
      description TEXT DEFAULT 'Bukti Screenshot Form General Inspeksi',
      status TEXT DEFAULT 'SUBMITTED',
      verified_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inspection_proofs_week ON inspection_proofs(week);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_inspection_proofs_nik ON inspection_proofs(nik);`);
    
    // Gamification Customization Columns & Milestone Tracking Table
    await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS equipped_frame TEXT DEFAULT 'default';`);
    await db.execute(sql`ALTER TABLE employees ADD COLUMN IF NOT EXISTS equipped_title TEXT DEFAULT 'Frontline Trainee';`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS gamification_milestones (
      id SERIAL PRIMARY KEY,
      nik TEXT NOT NULL,
      milestone_type TEXT NOT NULL,
      milestone_key TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_gamification_milestones_nik_key ON gamification_milestones(nik, milestone_key);`);
    await db.execute(sql`CREATE TABLE IF NOT EXISTS portal_logins (
      id SERIAL PRIMARY KEY,
      nik TEXT NOT NULL,
      login_date TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_logins_nik_date ON portal_logins(nik, login_date);`);

    // Logbook & Meeting Pagi Section Tasks Table
    await db.execute(sql`CREATE TABLE IF NOT EXISTS logbook_tasks (
      id SERIAL PRIMARY KEY,
      universe TEXT DEFAULT 'TBP_GPS',
      pt TEXT DEFAULT 'TBP',
      section TEXT NOT NULL DEFAULT 'General',
      bulletin_post_id INTEGER,
      bulletin_topic_title TEXT,
      title TEXT NOT NULL,
      description TEXT,
      assigned_by_nik TEXT NOT NULL,
      assigned_by_name TEXT NOT NULL,
      assignee_nik TEXT NOT NULL,
      assignee_name TEXT NOT NULL,
      status TEXT DEFAULT 'Open',
      priority TEXT DEFAULT 'Normal',
      activity_type TEXT DEFAULT 'Routine',
      progress_percent INTEGER DEFAULT 0,
      task_date TEXT NOT NULL,
      target_date TEXT,
      actual_completed_date TIMESTAMP,
      yesterday_notes TEXT,
      today_notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_logbook_tasks_date ON logbook_tasks(task_date);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_logbook_tasks_assignee ON logbook_tasks(assignee_nik);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_logbook_tasks_section ON logbook_tasks(section);`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_logbook_tasks_bulletin ON logbook_tasks(bulletin_post_id);`);
    await db.execute(sql`ALTER TABLE logbook_tasks ADD COLUMN IF NOT EXISTS target_time TEXT DEFAULT '23:59';`);
    await db.execute(sql`ALTER TABLE logbook_tasks ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT false;`);
    await db.execute(sql`ALTER TABLE logbook_tasks ADD COLUMN IF NOT EXISTS pending_pic_nik TEXT;`);
    await db.execute(sql`ALTER TABLE logbook_tasks ADD COLUMN IF NOT EXISTS pending_pic_name TEXT;`);
    await db.execute(sql`ALTER TABLE logbook_tasks ADD COLUMN IF NOT EXISTS pending_reason TEXT;`);
    await db.execute(sql`ALTER TABLE logbook_tasks ADD COLUMN IF NOT EXISTS draft_change TEXT;`);
    await db.execute(sql`ALTER TABLE logbook_tasks ADD COLUMN IF NOT EXISTS task_code TEXT;`);

    // Clinic Visits Table (Pelaporan Kunjungan Klinik)
    try {
      await db.execute(sql`CREATE TABLE IF NOT EXISTS clinic_visits (
        id SERIAL PRIMARY KEY,
        nik TEXT NOT NULL,
        name TEXT NOT NULL,
        section TEXT,
        department TEXT,
        jabatan TEXT,
        pt TEXT DEFAULT 'TBP',
        visit_date TEXT NOT NULL,
        visit_time TEXT NOT NULL,
        category TEXT DEFAULT 'Keluhan Sakit',
        reason TEXT NOT NULL,
        diagnosis TEXT,
        action_taken TEXT,
        recommendation TEXT DEFAULT 'Fit to Work',
        doctor_or_medic_name TEXT,
        reporter_nik TEXT,
        reporter_name TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_clinic_visits_date ON clinic_visits(visit_date);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_clinic_visits_nik ON clinic_visits(nik);`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_clinic_visits_section ON clinic_visits(section);`);
    } catch (clinicInitErr: any) {
      console.warn("Clinic visits table init warning:", clinicInitErr.message);
    }

    // Auto seed questions if table is empty
    const qCount = await db.select().from(questions).limit(1);
    if (!qCount || qCount.length === 0) {
      syncMasterQuestionsFromSheet().catch(e => console.warn('Questions auto-seed notice:', e.message));
    }

    // Auto seed APD data from spreadsheet
    syncApdDataFromSheet().catch(e => console.warn('APD auto-seed notice:', e.message));

    // Siapkan tabel & seed Database Training di background agar request pertama tidak menunggu
    ensureTrainingRecordsTable().catch(e => console.warn('Training init notice:', e.message));
    ensureMealOrdersTable().catch(e => console.warn('Meal orders init notice:', e.message));

    // Ensure XRF Calibration & QC tables and seed initial data
    try {
      await ensureXrfTables();
    } catch (xrfErr: any) {
      console.warn('XRF tables init notice:', xrfErr.message);
    }
  } catch (e: any) {
    console.warn("DB schema init warning:", e.message);
  }
}

async function sendWebPush(notifs: any | any[]) {
  try {
    const notificationsArray = Array.isArray(notifs) ? notifs : [notifs];
    for (const notif of notificationsArray) {
      let subs: any[] = [];
      if (notif.userId) {
         subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.nik, notif.userId));
      } else if (notif.role) {
         const targetEmployees = await db.select().from(employees).where(eq(employees.department, notif.role));
         const niks = targetEmployees.map((e: any) => e.nik);
         if (niks.length > 0) {
            subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.nik, niks));
         }
      } else {
         subs = await db.select().from(pushSubscriptions);
      }
      
      for (const sub of subs) {
        try {
          const pushSub = JSON.parse(sub.subscription);
          await webpush.sendNotification(pushSub, JSON.stringify({
            title: notif.title,
            body: notif.message,
            url: notif.link || '/'
          }));
        } catch (e: any) {
          if (e.statusCode === 410) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
          }
        }
      }
    }
  } catch(err) { console.error('Push error:', err); }
}




// --- Multi-Tenancy (Universe) Helper ---
function getUniverse(pt) {
  if (!pt) return 'TBP_GPS';
  const ptUpper = pt.toUpperCase();
  if (ptUpper.includes('GTS')) return 'GTS';
  return 'TBP_GPS';
}

async function startServer() {
  initDbSchema().catch(e => console.warn('Schema init non-fatal:', e.message));
  
// --- Google Drive Helper Functions ---


async function uploadFileToDrive(token, base64Data, mimeType, filename, folderId) {
  // Convert base64 to buffer
  const base64Clean = base64Data.replace(/^data:.*?;base64,/, "");
  const buffer = Buffer.from(base64Clean, 'base64');
  
  // Create metadata
  const metadata = {
    name: filename,
    parents: [folderId]
  };
  
  // We use multipart upload
  const boundary = '-------314159265358979323846';
  const delimiter = `\r--${boundary}\r`;
  const close_delim = `\r--${boundary}--\r`;
  
  const multipartRequestBody = Buffer.concat([
    Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\r'),
    Buffer.from(JSON.stringify(metadata)),
    Buffer.from(delimiter + `Content-Type: ${mimeType}\r\r`),
    buffer,
    Buffer.from(close_delim)
  ]);
  
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartRequestBody
  });
  
  const data = await res.json();
  
  // Make it readable to anyone with the link to avoid permission issues if they open it
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${data.id}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
    });
  } catch(e) {
    console.error('Failed to set permissions:', e);
  }
  
  return data.webViewLink;
}


const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const httpServer = createServer(app);
  const allowedSocketOrigins = [
    'https://portal.preplabtbp.com',
    'https://preplab-portal-scgudezxqq-et.a.run.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ];

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedSocketOrigins.includes(origin) || origin.endsWith('.preplabtbp.com')) {
          callback(null, true);
        } else {
          console.warn(`[Socket.IO CORS] Rejected connection from unauthorized origin: ${origin}`);
          callback(new Error('CORS not allowed for Socket.IO origin: ' + origin));
        }
      },
      credentials: true
    }
  });
  setIoInstance(io);

  // AUTH MIDDLEWARE FOR SOCKET.IO (Temuan #1)
  io.use((socket, next) => {
    const token = (socket.handshake.auth && socket.handshake.auth.token) ||
                  (socket.handshake.query && socket.handshake.query.token) ||
                  (socket.handshake.headers && socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, ''));

    if (!token) {
      console.warn(`[Socket ${socket.id}] Rejected: no auth token provided`);
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token as string, JWT_SECRET) as any;
      socket.data.nik = decoded.nik;
      socket.data.name = decoded.name;
      socket.data.userId = decoded.id;
      socket.data.role = decoded.role;
      next();
    } catch (err: any) {
      console.warn(`[Socket ${socket.id}] Rejected: invalid token (${err.message})`);
      return next(new Error('Invalid token'));
    }
  });

  // Teams Chat & System Socket.IO state
  const onlineSockets = new Map(); // socket.id -> { socketId, nik, name, department, section, avatar, room, isQuiz, node, lastActive }
  const chatMessagesMemory: any[] = [];

  // --- TEMPAT NONGKRONG / LOUNGE REAL-TIME STATE ---
  interface LoungeAvatarState {
    socketId: string;
    nik: string;
    name: string;
    username: string;
    pangkat: string;
    pangkatIcon?: string;
    section: string;
    avatar?: string;
    headwearId?: string;
    headwearColor?: string;
    outfitId?: string;
    outfitColor?: string;
    bootsColor?: string;
    posX: number;
    posY: number;
    facing: 'down' | 'up' | 'left' | 'right';
    actionState: string;
    speechText?: string;
    speechExpiry?: number;
    lastActive: number;
  }
  const loungeAvatars = new Map<string, LoungeAvatarState>(); // nik -> LoungeAvatarState

  const getUniqueOnlineUsers = () => {
    const userMap = new Map<string, any>();
    for (const u of onlineSockets.values()) {
      if (u && u.nik) {
        if (!userMap.has(u.nik)) {
          userMap.set(u.nik, {
            nik: u.nik,
            name: u.name || u.nik,
            department: u.department || 'General',
            section: u.section || u.department || 'General',
            avatar: u.avatar || null,
            room: u.room || null,
            lastActive: u.lastActive || Date.now()
          });
        } else {
          const existing = userMap.get(u.nik);
          if (u.room && (!existing.room || existing.room === 'global')) {
            existing.room = u.room;
          }
        }
      }
    }
    return Array.from(userMap.values());
  };

  // --- REAL-TIME UNDERGROUND BUNKER LOUNGE GAMES (GAPLE 4-PLAYER & CATUR 2-PLAYER) ---
  interface DominoSeatPlayer {
    seatIdx: number; // 0: Bottom, 1: Left, 2: Top, 3: Right
    nik: string;
    name: string;
    avatar?: string;
    socketId: string;
    isBot?: boolean;
    handCount: number;
  }

  interface DominoChainTileState {
    id: string;
    val1: number;
    val2: number;
    isBalak: boolean;
    playedBy: string;
    isOrigin?: boolean;
  }

  const ALL_DOMINO_CARDS = [
    { id: '0-0', left: 0, right: 0 }, { id: '0-1', left: 0, right: 1 }, { id: '0-2', left: 0, right: 2 },
    { id: '0-3', left: 0, right: 3 }, { id: '0-4', left: 0, right: 4 }, { id: '0-5', left: 0, right: 5 },
    { id: '0-6', left: 0, right: 6 }, { id: '1-1', left: 1, right: 1 }, { id: '1-2', left: 1, right: 2 },
    { id: '1-3', left: 1, right: 3 }, { id: '1-4', left: 1, right: 4 }, { id: '1-5', left: 1, right: 5 },
    { id: '1-6', left: 1, right: 6 }, { id: '2-2', left: 2, right: 2 }, { id: '2-3', left: 2, right: 3 },
    { id: '2-4', left: 2, right: 4 }, { id: '2-5', left: 2, right: 5 }, { id: '2-6', left: 2, right: 6 },
    { id: '3-3', left: 3, right: 3 }, { id: '3-4', left: 3, right: 4 }, { id: '3-5', left: 3, right: 5 },
    { id: '3-6', left: 3, right: 6 }, { id: '4-4', left: 4, right: 4 }, { id: '4-5', left: 4, right: 5 },
    { id: '4-6', left: 4, right: 6 }, { id: '5-5', left: 5, right: 5 }, { id: '5-6', left: 5, right: 6 },
    { id: '6-6', left: 6, right: 6 }
  ];

  const dominoLoungeState = {
    seats: (Array(4).fill(null) as (DominoSeatPlayer | null)[]),
    boardChain: [] as DominoChainTileState[],
    currentTurnIndex: 0,
    isPlaying: false,
    roundWinner: null as string | null,
    consecutivePasses: 0,
    gameAnnouncement: 'Menunggu pemain mengambil kursi dan menekan Mulai Permainan...',
    hands: new Map<string, { id: string; left: number; right: number }[]>()
  };

  const getPublicDominoState = () => {
    return {
      seats: dominoLoungeState.seats,
      boardChain: dominoLoungeState.boardChain,
      currentTurnIndex: dominoLoungeState.currentTurnIndex,
      isPlaying: dominoLoungeState.isPlaying,
      roundWinner: dominoLoungeState.roundWinner,
      consecutivePasses: dominoLoungeState.consecutivePasses,
      gameAnnouncement: dominoLoungeState.gameAnnouncement,
      openEnds: dominoLoungeState.boardChain.length === 0 ? null : {
        left: dominoLoungeState.boardChain[0].val1,
        right: dominoLoungeState.boardChain[dominoLoungeState.boardChain.length - 1].val2
      }
    };
  };

  // CHESS REAL-TIME STATE
  interface ChessSeatPlayer {
    nik: string;
    name: string;
    avatar?: string;
    socketId: string;
  }

  const INITIAL_SERVER_CHESS_BOARD = [
    [
      { type: 'r', color: 'b' }, { type: 'n', color: 'b' }, { type: 'b', color: 'b' },
      { type: 'q', color: 'b' }, { type: 'k', color: 'b' }, { type: 'b', color: 'b' },
      { type: 'n', color: 'b' }, { type: 'r', color: 'b' }
    ],
    [
      { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' },
      { type: 'p', color: 'b' }, { type: 'p', color: 'b' }, { type: 'p', color: 'b' },
      { type: 'p', color: 'b' }, { type: 'p', color: 'b' }
    ],
    Array(8).fill(null), Array(8).fill(null), Array(8).fill(null), Array(8).fill(null),
    [
      { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' },
      { type: 'p', color: 'w' }, { type: 'p', color: 'w' }, { type: 'p', color: 'w' },
      { type: 'p', color: 'w' }, { type: 'p', color: 'w' }
    ],
    [
      { type: 'r', color: 'w' }, { type: 'n', color: 'w' }, { type: 'b', color: 'w' },
      { type: 'q', color: 'w' }, { type: 'k', color: 'w' }, { type: 'b', color: 'w' },
      { type: 'n', color: 'w' }, { type: 'r', color: 'w' }
    ]
  ];

  const chessLoungeState = {
    whiteSeat: null as ChessSeatPlayer | null,
    blackSeat: null as ChessSeatPlayer | null,
    board: JSON.parse(JSON.stringify(INITIAL_SERVER_CHESS_BOARD)),
    currentTurn: 'w' as 'w' | 'b',
    isCheck: null as 'w' | 'b' | null,
    winner: null as string | null,
    lastMove: null as { fromR: number; fromC: number; toR: number; toC: number } | null,
    capturedByWhite: [] as any[],
    capturedByBlack: [] as any[],
    whiteTime: 600,
    blackTime: 600,
    halfMoveClock: 0,
    positionHistory: [] as string[],
    gameAnnouncement: 'Menunggu pemain mengambil posisi Putih & Hitam...'
  };

  const resetDominoGame = () => {
    dominoLoungeState.seats = [null, null, null, null];
    dominoLoungeState.boardChain = [];
    dominoLoungeState.currentTurnIndex = 0;
    dominoLoungeState.isPlaying = false;
    dominoLoungeState.roundWinner = null;
    dominoLoungeState.consecutivePasses = 0;
    dominoLoungeState.gameAnnouncement = 'Meja Gaple kosong. Permainan direset dan siap untuk putaran baru!';
    dominoLoungeState.hands.clear();
  };

  const resetChessGame = () => {
    chessLoungeState.board = JSON.parse(JSON.stringify(INITIAL_SERVER_CHESS_BOARD));
    chessLoungeState.currentTurn = 'w';
    chessLoungeState.isCheck = null;
    chessLoungeState.winner = null;
    chessLoungeState.lastMove = null;
    chessLoungeState.whiteTime = 600;
    chessLoungeState.blackTime = 600;
    chessLoungeState.halfMoveClock = 0;
    chessLoungeState.positionHistory = [];
    chessLoungeState.capturedByWhite = [];
    chessLoungeState.capturedByBlack = [];
    chessLoungeState.gameAnnouncement = 'Meja catur kosong. Papan dan waktu otomatis direset!';
  };

  // --- REAL-TIME MULTIPLAYER SUWIT (RPS) 1V1 PVP STATE ---
  interface RpsPlayer {
    nik: string;
    name: string;
    avatar?: string;
    pangkat?: string;
    socketId: string;
    choice: 'rock' | 'paper' | 'scissors' | null;
    score: number;
  }

  interface RpsMatch {
    id: string;
    player1: RpsPlayer;
    player2: RpsPlayer;
    status: 'INVITING' | 'PLAYING' | 'REVEALED';
    round: number;
  }

  const rpsMatches = new Map<string, RpsMatch>();


  const cleanupStaleLoungeAvatars = () => {
    const activeSocketIds = new Set(onlineSockets.keys());
    for (const [nik, avatar] of loungeAvatars.entries()) {
      if (!activeSocketIds.has(avatar.socketId)) {
        loungeAvatars.delete(nik);
        io.to('lounge').emit('lounge:user_left', { nik, name: avatar.name, username: avatar.username });
      }
    }
  };

  const broadcastPresence = () => {
    cleanupStaleLoungeAvatars();
    const onlineUsers = getUniqueOnlineUsers();
    const onlineNiks = onlineUsers.map((u: any) => u.nik);
    io.emit("presence:update", { 
      onlineNiks, 
      onlineUsers, 
      totalOnline: onlineUsers.length,
      loungeMembers: Array.from(loungeAvatars.values())
    });
  };

  const emitRoomUsers = (room: string) => {
    if (!room) return;
    const usersInRoom = Array.from(onlineSockets.values()).filter((u: any) => u.room === room && u.nik);
    const uniqueMap = new Map<string, any>();
    for (const u of usersInRoom) {
      if (!uniqueMap.has(u.nik)) {
        uniqueMap.set(u.nik, {
          nik: u.nik,
          name: u.name || u.nik,
          department: u.department || 'General',
          section: u.section || u.department || 'General',
          avatar: u.avatar || null,
          room: u.room
        });
      }
    }
    io.to(room).emit('online_users', Array.from(uniqueMap.values()));
  };

  io.on('connection', (socket) => {
    // Send immediate presence snapshot to newly connected socket
    socket.emit('presence:init', { 
      onlineUsers: getUniqueOnlineUsers(), 
      totalOnline: getUniqueOnlineUsers().length 
    });

    // Register user presence across the portal
    socket.on('presence:join', (user) => {
      if (!user || !user.nik) {
        console.warn(`[Socket ${socket.id}] presence:join rejected: missing nik`);
        return;
      }

      // Security validation: payload NIK must match decoded JWT NIK
      if (socket.data.nik && user.nik !== socket.data.nik) {
        console.warn(`[Socket ${socket.id}] presence:join rejected: NIK mismatch! payload=${user.nik}, jwt=${socket.data.nik}`);
        socket.disconnect(true);
        return;
      }

      const existing = onlineSockets.get(socket.id) || {};
      onlineSockets.set(socket.id, {
        ...existing,
        ...user,
        nik: socket.data.nik || user.nik,
        socketId: socket.id,
        lastActive: Date.now()
      });
      broadcastPresence();
    });

    socket.on('presence:ping', () => {
      const user = onlineSockets.get(socket.id);
      if (user) {
        user.lastActive = Date.now();
      }
    });

    socket.on('presence:leave', () => {
      onlineSockets.delete(socket.id);
      broadcastPresence();
    });

    // User joins/switches chat room
    const handleChatJoin = (user: any) => {
      if (!user) return;
      const room = user.room || 'global';
      const existing = onlineSockets.get(socket.id) || {};
      const oldRoom = existing.room;

      if (oldRoom && oldRoom !== room) {
        socket.leave(oldRoom);
        onlineSockets.set(socket.id, {
          ...existing,
          ...user,
          room,
          socketId: socket.id,
          lastActive: Date.now()
        });
        emitRoomUsers(oldRoom);
      } else {
        onlineSockets.set(socket.id, {
          ...existing,
          ...user,
          room,
          socketId: socket.id,
          lastActive: Date.now()
        });
      }

      socket.join(room);
      emitRoomUsers(room);
      broadcastPresence();
    };

    socket.on('chat:join', handleChatJoin);
    socket.on('join', handleChatJoin);

    socket.on('chat:leave', () => {
      const existing = onlineSockets.get(socket.id);
      if (existing && existing.room) {
        const oldRoom = existing.room;
        socket.leave(oldRoom);
        existing.room = null;
        emitRoomUsers(oldRoom);
        broadcastPresence();
      }
    });

    // --- REAL-TIME TEMPAT NONGKRONG AVATAR LOUNGE SYNC ---
    socket.on('lounge:join', (data) => {
      if (!data || !data.nik) return;
      if (socket.data.nik && data.nik !== socket.data.nik) {
        data.nik = socket.data.nik;
        if (socket.data.name) data.name = socket.data.name;
      }
      socket.join('lounge');

      // Default spawn positions on gazebo benches (authentic GBA tile coords)
      const defaultSpawnPositions: { x: number; y: number; facing: 'down' | 'up' | 'left' | 'right' }[] = [
        { x: 3.44, y: 4.05, facing: 'right' },
        { x: 3.44, y: 4.75, facing: 'right' },
        { x: 3.44, y: 5.45, facing: 'right' },
        { x: 4.5, y: 3.45, facing: 'down' },
        { x: 5.5, y: 3.45, facing: 'down' },
        { x: 6.5, y: 3.45, facing: 'down' },
        { x: 7.56, y: 4.05, facing: 'left' },
        { x: 7.56, y: 4.75, facing: 'left' },
        { x: 7.56, y: 5.45, facing: 'left' },
      ];
      const spawnSlot = defaultSpawnPositions[loungeAvatars.size % defaultSpawnPositions.length];

      const rawX = typeof data.posX === 'number' ? data.posX : spawnSlot.x;
      const rawY = typeof data.posY === 'number' ? data.posY : spawnSlot.y;
      // Convert legacy percentages (>12 cols or >8 rows) to GBA tile coordinates
      const posX = rawX > 12 ? (rawX / 100) * 12 : rawX;
      const posY = rawY > 8 ? (rawY / 100) * 8 : rawY;

      const avatarState: LoungeAvatarState = {
        socketId: socket.id,
        nik: data.nik,
        name: data.name || data.nik,
        username: data.username || data.name || data.nik,
        pangkat: data.pangkat || 'Frontline Trainee',
        pangkatIcon: data.pangkatIcon || '/assets/ranks/rank_01_trainee.svg',
        section: data.section || 'Prep-Lab',
        avatar: data.avatar || null,
        headwearId: data.headwearId,
        headwearColor: data.headwearColor,
        outfitId: data.outfitId,
        outfitColor: data.outfitColor,
        bootsColor: data.bootsColor,
        posX,
        posY,
        facing: data.facing || spawnSlot.facing,
        actionState: data.actionState || 'sit',
        speechText: data.speechText,
        speechExpiry: data.speechExpiry,
        lastActive: Date.now()
      };

      loungeAvatars.set(data.nik, avatarState);

      // 1. Immediately send current lounge avatar snapshot to joining client
      socket.emit('lounge:sync_state', Array.from(loungeAvatars.values()));

      // 2. Broadcast to all other lounge members that someone joined
      socket.to('lounge').emit('lounge:user_joined', avatarState);

      emitRoomUsers('lounge');
      broadcastPresence();
    });

    socket.on('lounge:move', (data) => {
      const room = data?.room || 'lounge';
      if (data?.nik && loungeAvatars.has(data.nik)) {
        const current = loungeAvatars.get(data.nik)!;
        const rawX = typeof data.x === 'number' ? data.x : current.posX;
        const rawY = typeof data.y === 'number' ? data.y : current.posY;
        current.posX = rawX > 12 ? (rawX / 100) * 12 : rawX;
        current.posY = rawY > 8 ? (rawY / 100) * 8 : rawY;
        current.facing = data.facing || current.facing;
        current.actionState = data.actionState || 'walk';
        current.lastActive = Date.now();
      }
      socket.to(room).emit('lounge:user_moved', data);
    });

    socket.on('lounge:action', (data) => {
      const room = data?.room || 'lounge';
      if (data?.nik && loungeAvatars.has(data.nik)) {
        const current = loungeAvatars.get(data.nik)!;
        if (typeof data.x === 'number') current.posX = data.x > 12 ? (data.x / 100) * 12 : data.x;
        if (typeof data.y === 'number') current.posY = data.y > 8 ? (data.y / 100) * 8 : data.y;
        if (data.facing) current.facing = data.facing;
        current.actionState = data.actionState || current.actionState;
        if (data.speechText) {
          current.speechText = data.speechText;
          current.speechExpiry = Date.now() + 7500;
        }
        current.lastActive = Date.now();
      }
      socket.to(room).emit('lounge:user_action', data);
    });

    socket.on('lounge:leave', (data) => {
      const nik = data?.nik;
      for (const [lNik, avatar] of loungeAvatars.entries()) {
        if ((nik && lNik === nik) || avatar.socketId === socket.id) {
          loungeAvatars.delete(lNik);
          socket.leave('lounge');
          io.to('lounge').emit('lounge:user_left', { nik: lNik, name: avatar.name, username: avatar.username });
        }
      }
      emitRoomUsers('lounge');
      broadcastPresence();
    });

    // ==========================================
    // DOMINO / GAPLE MULTIPLAYER SOCKET EVENTS
    // ==========================================
    socket.on('domino:get_state', (data?: { nik?: string }) => {
      if (data?.nik) socket.data.nik = data.nik;
      socket.emit('domino:sync', getPublicDominoState());
      const myNik = socket.data.nik || data?.nik;
      if (myNik && dominoLoungeState.hands.has(myNik)) {
        socket.emit('domino:your_hand', dominoLoungeState.hands.get(myNik) || []);
      }
    });

    socket.on('domino:sit', (data: { seatIdx: number; nik: string; name: string; avatar?: string }) => {
      if (typeof data.seatIdx !== 'number' || data.seatIdx < 0 || data.seatIdx > 3) return;
      if (data.nik) socket.data.nik = data.nik;
      if (data.name) socket.data.name = data.name;
      const playerNik = socket.data.nik || data.nik;
      const playerName = socket.data.name || data.name || playerNik;

      // Guard: If game is actively playing, don't allow changing seats unless reconnecting to same seat
      if (dominoLoungeState.isPlaying && !dominoLoungeState.roundWinner) {
        const curSeat = dominoLoungeState.seats[data.seatIdx];
        if (!curSeat || (curSeat.nik !== playerNik && !curSeat.isBot)) {
          socket.emit('domino:sync', getPublicDominoState());
          return;
        }
      }

      // Guard: Seat already occupied by another human player
      const targetSeat = dominoLoungeState.seats[data.seatIdx];
      if (targetSeat && !targetSeat.isBot && targetSeat.nik !== playerNik) {
        socket.emit('domino:sync', getPublicDominoState());
        return;
      }

      // Unseat from other seats if already seated elsewhere
      for (let i = 0; i < 4; i++) {
        if (i !== data.seatIdx && dominoLoungeState.seats[i]?.nik === playerNik) {
          dominoLoungeState.seats[i] = null;
        }
      }

      dominoLoungeState.seats[data.seatIdx] = {
        seatIdx: data.seatIdx,
        nik: playerNik,
        name: playerName,
        avatar: data.avatar,
        socketId: socket.id,
        isBot: false,
        handCount: (dominoLoungeState.hands.get(playerNik) || []).length
      };

      io.to('lounge').emit('domino:sync', getPublicDominoState());
    });

    socket.on('domino:stand', (data: { seatIdx: number }) => {
      if (typeof data.seatIdx === 'number' && data.seatIdx >= 0 && data.seatIdx < 4) {
        // Check if other real human players remain at the table
        const hasOtherHuman = dominoLoungeState.seats.some((s, idx) => idx !== data.seatIdx && s && !s.isBot);

        if (!hasOtherHuman) {
          // If no other human players remain at the table, reset immediately
          resetDominoGame();
        } else if (dominoLoungeState.isPlaying && !dominoLoungeState.roundWinner) {
          // If active game is in progress and other humans are still playing, replace with bot so table does not freeze
          const botNames = [
            { nik: 'bot_budi', name: 'Budi (Bot)', avatar: '🤖' },
            { nik: 'bot_siti', name: 'Siti (Bot)', avatar: '👾' },
            { nik: 'bot_agus', name: 'Agus (Bot)', avatar: '🦾' },
            { nik: 'bot_dewi', name: 'Dewi (Bot)', avatar: '🦿' }
          ];
          const prevPlayer = dominoLoungeState.seats[data.seatIdx];
          const botInfo = botNames[data.seatIdx];
          if (prevPlayer && dominoLoungeState.hands.has(prevPlayer.nik)) {
            const hand = dominoLoungeState.hands.get(prevPlayer.nik)!;
            dominoLoungeState.hands.delete(prevPlayer.nik);
            dominoLoungeState.hands.set(botInfo.nik, hand);
          }
          dominoLoungeState.seats[data.seatIdx] = {
            seatIdx: data.seatIdx,
            nik: botInfo.nik,
            name: botInfo.name,
            avatar: botInfo.avatar,
            socketId: 'bot',
            isBot: true,
            handCount: (dominoLoungeState.hands.get(botInfo.nik) || []).length
          };
          if (dominoLoungeState.currentTurnIndex === data.seatIdx) {
            triggerDominoBotTurn();
          }
        } else {
          dominoLoungeState.seats[data.seatIdx] = null;
        }
        io.to('lounge').emit('domino:sync', getPublicDominoState());
      }
    });

    const triggerDominoBotTurn = () => {
      setTimeout(() => {
        if (!dominoLoungeState.isPlaying || dominoLoungeState.roundWinner) return;
        const curPlayer = dominoLoungeState.seats[dominoLoungeState.currentTurnIndex];
        if (!curPlayer || !curPlayer.isBot) return;

        const hand = dominoLoungeState.hands.get(curPlayer.nik) || [];
        if (hand.length === 0) return;

        // If board is empty
        if (dominoLoungeState.boardChain.length === 0) {
          const highestBalak = hand.filter(t => t.left === t.right).sort((a, b) => b.left - a.left)[0];
          const tileToPlay = highestBalak || hand[0];
          executePlayTile(curPlayer, tileToPlay, 'left');
          return;
        }

        const openLeft = dominoLoungeState.boardChain[0].val1;
        const openRight = dominoLoungeState.boardChain[dominoLoungeState.boardChain.length - 1].val2;

        let chosenMove: { tile: typeof hand[0]; side: 'left' | 'right' } | null = null;
        for (const t of hand) {
          if (t.left === openLeft || t.right === openLeft) {
            chosenMove = { tile: t, side: 'left' };
            break;
          }
          if (t.left === openRight || t.right === openRight) {
            chosenMove = { tile: t, side: 'right' };
            break;
          }
        }

        if (chosenMove) {
          executePlayTile(curPlayer, chosenMove.tile, chosenMove.side);
        } else {
          executePassTurn(curPlayer);
        }
      }, 1000);
    };

    const executePlayTile = (player: DominoSeatPlayer, tile: { id: string; left: number; right: number }, side: 'left' | 'right') => {
      const hand = dominoLoungeState.hands.get(player.nik) || [];
      const tileIdx = hand.findIndex(t => t.id === tile.id);
      if (tileIdx === -1 && !player.isBot) return;

      const isBalak = tile.left === tile.right;
      let newTile: DominoChainTileState;

      if (dominoLoungeState.boardChain.length === 0) {
        newTile = {
          id: `${tile.id}-${Date.now()}`,
          val1: tile.left,
          val2: tile.right,
          isBalak,
          playedBy: player.name,
          isOrigin: true
        };
        dominoLoungeState.boardChain = [newTile];
      } else {
        const curLeft = dominoLoungeState.boardChain[0].val1;
        const curRight = dominoLoungeState.boardChain[dominoLoungeState.boardChain.length - 1].val2;

        if (side === 'left') {
          // Strictly validate that tile has curLeft
          if (tile.left !== curLeft && tile.right !== curLeft) {
            console.warn(`[Domino] Invalid move for left end (${curLeft}): tile is [${tile.left}|${tile.right}]`);
            return;
          }
          let val1 = tile.left;
          let val2 = tile.right;
          // For prepending on the left: val2 connects to curLeft, val1 becomes new openLeft
          if (tile.right === curLeft) {
            val1 = tile.left;
            val2 = tile.right;
          } else {
            val1 = tile.right;
            val2 = tile.left;
          }
          newTile = {
            id: `${tile.id}-${Date.now()}`,
            val1,
            val2,
            isBalak,
            playedBy: player.name
          };
          dominoLoungeState.boardChain.unshift(newTile);
        } else {
          // Strictly validate that tile has curRight
          if (tile.left !== curRight && tile.right !== curRight) {
            console.warn(`[Domino] Invalid move for right end (${curRight}): tile is [${tile.left}|${tile.right}]`);
            return;
          }
          let val1 = tile.left;
          let val2 = tile.right;
          // For appending on the right: val1 connects to curRight, val2 becomes new openRight
          if (tile.left === curRight) {
            val1 = tile.left;
            val2 = tile.right;
          } else {
            val1 = tile.right;
            val2 = tile.left;
          }
          newTile = {
            id: `${tile.id}-${Date.now()}`,
            val1,
            val2,
            isBalak,
            playedBy: player.name
          };
          dominoLoungeState.boardChain.push(newTile);
        }
      }

      // Remove from hand
      const nextHand = hand.filter(t => t.id !== tile.id);
      dominoLoungeState.hands.set(player.nik, nextHand);
      player.handCount = nextHand.length;
      dominoLoungeState.consecutivePasses = 0;

      // Check win
      if (nextHand.length === 0) {
        dominoLoungeState.roundWinner = player.name;
        dominoLoungeState.isPlaying = false;
        dominoLoungeState.gameAnnouncement = `🎉 GAPLEEE! ${player.name} berhasil menghabiskan semua balak dan memenangkan putaran!`;
      } else {
        dominoLoungeState.currentTurnIndex = (dominoLoungeState.currentTurnIndex + 1) % 4;
        const nextPlayer = dominoLoungeState.seats[dominoLoungeState.currentTurnIndex]!;
        dominoLoungeState.gameAnnouncement = `${player.name} meletakkan balak [${tile.left}|${tile.right}]. Giliran: ${nextPlayer.name}`;
      }

      // Notify the player with updated private hand
      if (!player.isBot) {
        const targetSocket = io.sockets.sockets.get(player.socketId);
        if (targetSocket) targetSocket.emit('domino:your_hand', nextHand);
      }

      io.to('lounge').emit('domino:sync', getPublicDominoState());

      // If next player is bot, trigger bot move
      const nextP = dominoLoungeState.seats[dominoLoungeState.currentTurnIndex];
      if (dominoLoungeState.isPlaying && nextP && nextP.isBot) {
        triggerDominoBotTurn();
      }
    };

    const executePassTurn = (player: DominoSeatPlayer) => {
      dominoLoungeState.consecutivePasses += 1;
      if (dominoLoungeState.consecutivePasses >= 4) {
        // DEADLOCK / GAPLE TUTUP
        dominoLoungeState.isPlaying = false;
        let minPips = 999;
        let winner = player;

        for (const p of dominoLoungeState.seats) {
          if (!p) continue;
          const pHand = dominoLoungeState.hands.get(p.nik) || [];
          const sum = pHand.reduce((acc, t) => acc + t.left + t.right, 0);
          if (sum < minPips) {
            minPips = sum;
            winner = p;
          }
        }

        dominoLoungeState.roundWinner = winner.name;
        dominoLoungeState.gameAnnouncement = `🔒 GAPLE TUTUP (BUNTU)! ${winner.name} menang dengan sisa nilai balak terendah (${minPips} titik)!`;
      } else {
        dominoLoungeState.currentTurnIndex = (dominoLoungeState.currentTurnIndex + 1) % 4;
        const nextPlayer = dominoLoungeState.seats[dominoLoungeState.currentTurnIndex]!;
        dominoLoungeState.gameAnnouncement = `${player.name} tidak memiliki balak yang cocok (Lewat!). Giliran: ${nextPlayer.name}`;
      }

      io.to('lounge').emit('domino:sync', getPublicDominoState());

      const nextP = dominoLoungeState.seats[dominoLoungeState.currentTurnIndex];
      if (dominoLoungeState.isPlaying && nextP && nextP.isBot) {
        triggerDominoBotTurn();
      }
    };

    socket.on('domino:start_round', () => {
      const botNames = [
        { name: 'Ranger Tamu', avatar: '👷' },
        { name: 'Mba Hantu', avatar: '👻' },
        { name: 'Mas Pulverizer', avatar: '🔨' },
        { name: 'Pak Mandor', avatar: '📋' }
      ];

      for (let i = 0; i < 4; i++) {
        if (!dominoLoungeState.seats[i]) {
          const botId = `bot_${i}`;
          dominoLoungeState.seats[i] = {
            seatIdx: i,
            nik: botId,
            name: botNames[i].name,
            avatar: botNames[i].avatar,
            socketId: 'bot',
            isBot: true,
            handCount: 7
          };
        }
      }

      const shuffled = [...ALL_DOMINO_CARDS].sort(() => Math.random() - 0.5);
      dominoLoungeState.hands.clear();

      let starterIdx = 0;
      let highestBalak = -1;

      for (let i = 0; i < 4; i++) {
        const hand = shuffled.slice(i * 7, (i + 1) * 7);
        const player = dominoLoungeState.seats[i]!;
        dominoLoungeState.hands.set(player.nik, hand);
        player.handCount = 7;

        hand.forEach(t => {
          if (t.left === t.right && t.left > highestBalak) {
            highestBalak = t.left;
            starterIdx = i;
          }
        });

        if (!player.isBot) {
          const targetSocket = io.sockets.sockets.get(player.socketId);
          if (targetSocket) {
            targetSocket.emit('domino:your_hand', hand);
          }
        }
      }

      dominoLoungeState.boardChain = [];
      dominoLoungeState.currentTurnIndex = starterIdx;
      dominoLoungeState.isPlaying = true;
      dominoLoungeState.roundWinner = null;
      dominoLoungeState.consecutivePasses = 0;

      const starter = dominoLoungeState.seats[starterIdx]!;
      dominoLoungeState.gameAnnouncement = highestBalak >= 0
        ? `${starter.name} memegang Balak [${highestBalak}|${highestBalak}] dan berhak membuka putaran!`
        : `Putaran dimulai! Giliran pertama: ${starter.name}`;

      io.to('lounge').emit('domino:sync', getPublicDominoState());

      if (starter.isBot) {
        triggerDominoBotTurn();
      }
    });

    socket.on('domino:play_tile', (data: { tileId: string; side: 'left' | 'right'; nik?: string }) => {
      if (!dominoLoungeState.isPlaying || dominoLoungeState.roundWinner) return;
      const curPlayer = dominoLoungeState.seats[dominoLoungeState.currentTurnIndex];
      const playerNik = socket.data.nik || data.nik;
      if (!curPlayer || curPlayer.nik !== playerNik) return;

      const hand = dominoLoungeState.hands.get(playerNik) || [];
      const targetTile = hand.find(t => t.id === data.tileId);
      if (!targetTile) return;

      executePlayTile(curPlayer, targetTile, data.side);
    });

    socket.on('domino:pass', (data?: { nik?: string }) => {
      if (!dominoLoungeState.isPlaying || dominoLoungeState.roundWinner) return;
      const curPlayer = dominoLoungeState.seats[dominoLoungeState.currentTurnIndex];
      const playerNik = socket.data.nik || data?.nik;
      if (!curPlayer || curPlayer.nik !== playerNik) return;

      executePassTurn(curPlayer);
    });

    socket.on('domino:reset', () => {
      dominoLoungeState.boardChain = [];
      dominoLoungeState.isPlaying = false;
      dominoLoungeState.roundWinner = null;
      dominoLoungeState.consecutivePasses = 0;
      dominoLoungeState.gameAnnouncement = 'Meja Gaple direset. Siap untuk putaran baru!';
      dominoLoungeState.hands.clear();
      dominoLoungeState.seats.forEach(s => { if (s) s.handCount = 0; });
      io.to('lounge').emit('domino:sync', getPublicDominoState());
    });

    // ==========================================
    // CHESS MULTIPLAYER SOCKET EVENTS
    // ==========================================
    socket.on('chess:get_state', () => {
      socket.join('lounge');
      socket.emit('chess:sync', chessLoungeState);
    });

    socket.on('chess:sit', (data: { side: 'w' | 'b'; nik: string; name: string; avatar?: string }) => {
      socket.join('lounge');
      const playerNik = socket.data.nik || data.nik;
      const playerName = socket.data.name || data.name || playerNik;

      if (data.side === 'w') {
        // Clear black seat if player was sitting there
        if (chessLoungeState.blackSeat && (chessLoungeState.blackSeat.nik === playerNik || chessLoungeState.blackSeat.socketId === socket.id)) {
          chessLoungeState.blackSeat = null;
        }
        chessLoungeState.whiteSeat = { nik: playerNik, name: playerName, avatar: data.avatar, socketId: socket.id };
      } else {
        // Clear white seat if player was sitting there
        if (chessLoungeState.whiteSeat && (chessLoungeState.whiteSeat.nik === playerNik || chessLoungeState.whiteSeat.socketId === socket.id)) {
          chessLoungeState.whiteSeat = null;
        }
        chessLoungeState.blackSeat = { nik: playerNik, name: playerName, avatar: data.avatar, socketId: socket.id };
      }

      chessLoungeState.gameAnnouncement = `${playerName} mengambil posisi bidak ${data.side === 'w' ? 'PUTIH' : 'HITAM'}.`;
      io.to('lounge').emit('chess:sync', chessLoungeState);
      socket.emit('chess:sync', chessLoungeState);
    });

    socket.on('chess:stand', (data: { side: 'w' | 'b' }) => {
      socket.join('lounge');
      if (data.side === 'w') chessLoungeState.whiteSeat = null;
      if (data.side === 'b') chessLoungeState.blackSeat = null;
      if (!chessLoungeState.whiteSeat && !chessLoungeState.blackSeat) {
        resetChessGame();
      }
      io.to('lounge').emit('chess:sync', chessLoungeState);
      socket.emit('chess:sync', chessLoungeState);
    });

    socket.on('chess:move', (data: {
      board: any;
      nextTurn: 'w' | 'b';
      isCheck?: any;
      winner?: any;
      announcement?: string;
      capturedByWhite?: any[];
      capturedByBlack?: any[];
      lastMove?: { fromR: number; fromC: number; toR: number; toC: number } | null;
      whiteTime?: number;
      blackTime?: number;
      halfMoveClock?: number;
      positionHistory?: string[];
    }) => {
      socket.join('lounge');
      chessLoungeState.board = data.board;
      chessLoungeState.currentTurn = data.nextTurn;
      chessLoungeState.isCheck = data.isCheck || null;
      chessLoungeState.winner = data.winner || null;
      chessLoungeState.lastMove = data.lastMove || null;
      if (typeof data.whiteTime === 'number') chessLoungeState.whiteTime = data.whiteTime;
      if (typeof data.blackTime === 'number') chessLoungeState.blackTime = data.blackTime;
      if (typeof data.halfMoveClock === 'number') chessLoungeState.halfMoveClock = data.halfMoveClock;
      if (data.positionHistory) chessLoungeState.positionHistory = data.positionHistory;
      if (data.announcement) chessLoungeState.gameAnnouncement = data.announcement;
      if (data.capturedByWhite) chessLoungeState.capturedByWhite = data.capturedByWhite;
      if (data.capturedByBlack) chessLoungeState.capturedByBlack = data.capturedByBlack;

      io.to('lounge').emit('chess:sync', chessLoungeState);
      socket.emit('chess:sync', chessLoungeState);
    });

    socket.on('chess:clock_tick', (data: { whiteTime: number; blackTime: number }) => {
      if (typeof data.whiteTime === 'number') chessLoungeState.whiteTime = data.whiteTime;
      if (typeof data.blackTime === 'number') chessLoungeState.blackTime = data.blackTime;
      socket.to('lounge').emit('chess:clock_sync', { whiteTime: chessLoungeState.whiteTime, blackTime: chessLoungeState.blackTime });
    });

    socket.on('chess:reset', () => {
      socket.join('lounge');
      chessLoungeState.board = JSON.parse(JSON.stringify(INITIAL_SERVER_CHESS_BOARD));
      chessLoungeState.currentTurn = 'w';
      chessLoungeState.isCheck = null;
      chessLoungeState.winner = null;
      chessLoungeState.lastMove = null;
      chessLoungeState.whiteTime = 600;
      chessLoungeState.blackTime = 600;
      chessLoungeState.halfMoveClock = 0;
      chessLoungeState.positionHistory = [];
      chessLoungeState.capturedByWhite = [];
      chessLoungeState.capturedByBlack = [];
      chessLoungeState.gameAnnouncement = 'Papan catur direset. Siap untuk pertandingan baru!';
      io.to('lounge').emit('chess:sync', chessLoungeState);
      socket.emit('chess:sync', chessLoungeState);
    });

    // ==========================================
    // MULTIPLAYER SUWIT (RPS) 1V1 PVP SOCKET EVENTS
    // ==========================================
    socket.on('rps:challenge', (data: {
      toNik: string;
      fromNik: string;
      fromName: string;
      fromAvatar?: string;
      fromPangkat?: string;
    }) => {
      // Find target socket
      let targetSocketId: string | null = null;
      let targetUser: any = null;
      for (const [sId, sUser] of onlineSockets.entries()) {
        if (sUser.nik === data.toNik) {
          targetSocketId = sId;
          targetUser = sUser;
          break;
        }
      }

      if (!targetSocketId) {
        socket.emit('rps:challenge_failed', { message: 'Rekan tidak sedang online.' });
        return;
      }

      const matchId = `rps-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const match: RpsMatch = {
        id: matchId,
        player1: {
          nik: data.fromNik,
          name: data.fromName,
          avatar: data.fromAvatar,
          pangkat: data.fromPangkat,
          socketId: socket.id,
          choice: null,
          score: 0
        },
        player2: {
          nik: data.toNik,
          name: targetUser.name || targetUser.username || data.toNik,
          avatar: targetUser.avatar,
          pangkat: targetUser.pangkat,
          socketId: targetSocketId,
          choice: null,
          score: 0
        },
        status: 'INVITING',
        round: 1
      };

      rpsMatches.set(matchId, match);

      // Notify target player of the challenge
      io.to(targetSocketId).emit('rps:invite_received', {
        matchId,
        fromNik: data.fromNik,
        fromName: data.fromName,
        fromAvatar: data.fromAvatar,
        fromPangkat: data.fromPangkat
      });

      socket.emit('rps:challenge_sent', { matchId, toNik: data.toNik });
    });

    socket.on('rps:accept', (data: { matchId: string }) => {
      const match = rpsMatches.get(data.matchId);
      if (!match) {
        socket.emit('rps:error', { message: 'Tantangan sudah kadaluarsa.' });
        return;
      }

      match.status = 'PLAYING';
      const p1Socket = io.sockets.sockets.get(match.player1.socketId);
      const p2Socket = io.sockets.sockets.get(match.player2.socketId);

      if (p1Socket) p1Socket.join(`rps:${match.id}`);
      if (p2Socket) p2Socket.join(`rps:${match.id}`);

      io.to(`rps:${match.id}`).emit('rps:game_start', {
        matchId: match.id,
        player1: match.player1,
        player2: match.player2,
        round: match.round,
        p1Score: match.player1.score,
        p2Score: match.player2.score
      });
    });

    socket.on('rps:decline', (data: { matchId: string }) => {
      const match = rpsMatches.get(data.matchId);
      if (match) {
        io.to(match.player1.socketId).emit('rps:challenge_declined', {
          matchId: match.id,
          fromName: match.player2.name
        });
        rpsMatches.delete(match.id);
      }
    });

    socket.on('rps:make_choice', (data: { matchId: string; nik: string; choice: 'rock' | 'paper' | 'scissors' }) => {
      const match = rpsMatches.get(data.matchId);
      if (!match || match.status !== 'PLAYING') return;

      const isP1 = match.player1.nik === data.nik || match.player1.socketId === socket.id;
      const isP2 = match.player2.nik === data.nik || match.player2.socketId === socket.id;

      if (isP1) {
        match.player1.choice = data.choice;
        io.to(match.player2.socketId).emit('rps:opponent_chose', { matchId: match.id });
      } else if (isP2) {
        match.player2.choice = data.choice;
        io.to(match.player1.socketId).emit('rps:opponent_chose', { matchId: match.id });
      }

      // Check if both players have chosen
      if (match.player1.choice && match.player2.choice) {
        const c1 = match.player1.choice;
        const c2 = match.player2.choice;
        let winner: 'player1' | 'player2' | 'draw' = 'draw';

        if (c1 === c2) {
          winner = 'draw';
        } else if (
          (c1 === 'rock' && c2 === 'scissors') ||
          (c1 === 'paper' && c2 === 'rock') ||
          (c1 === 'scissors' && c2 === 'paper')
        ) {
          winner = 'player1';
          match.player1.score++;
        } else {
          winner = 'player2';
          match.player2.score++;
        }

        match.status = 'REVEALED';

        io.to(`rps:${match.id}`).emit('rps:round_result', {
          matchId: match.id,
          player1Choice: c1,
          player2Choice: c2,
          winner,
          p1Score: match.player1.score,
          p2Score: match.player2.score,
          round: match.round
        });
      }
    });

    socket.on('rps:next_round', (data: { matchId: string }) => {
      const match = rpsMatches.get(data.matchId);
      if (!match) return;

      match.round++;
      match.player1.choice = null;
      match.player2.choice = null;
      match.status = 'PLAYING';

      io.to(`rps:${match.id}`).emit('rps:round_started', {
        matchId: match.id,
        round: match.round,
        p1Score: match.player1.score,
        p2Score: match.player2.score
      });
    });

    socket.on('rps:leave', (data: { matchId: string }) => {
      const match = rpsMatches.get(data?.matchId);
      if (match) {
        io.to(`rps:${match.id}`).emit('rps:match_ended', {
          reason: 'Pertandingan telah diakhiri.'
        });
        rpsMatches.delete(match.id);
      }
    });


    socket.on('chat:clear', async (data) => {
      try {
        const room = data?.room || 'global';
        if (room === 'all') {
          await db.delete(chatMessages);
          chatMessagesMemory.length = 0;
        } else {
          await db.delete(chatMessages).where(eq(chatMessages.room, room));
          const kept = chatMessagesMemory.filter(m => m.room !== room);
          chatMessagesMemory.length = 0;
          chatMessagesMemory.push(...kept);
        }
        io.to(room).emit('chat_cleared', { room });
        io.emit('chat_cleared', { room });
      } catch (clearErr) {
        console.error('Socket chat:clear error:', clearErr);
      }
    });

    socket.on('send_message', async (msg) => {
      try {
        const room = msg.room || 'global';

        // Persist to database if available and get real database record
        let savedDbMsg: any = null;
        try {
          const inserted = await db.insert(chatMessages).values({
            room,
            senderNik: msg.senderNik,
            senderName: msg.senderName,
            text: msg.text
          }).returning();
          if (inserted && inserted.length > 0) {
            savedDbMsg = inserted[0];
          }
        } catch (dbErr) {
          console.warn('Chat DB insert error, fallback to memory:', dbErr);
        }

        const msgId = savedDbMsg ? savedDbMsg.id : Date.now();
        const msgTimestamp = savedDbMsg?.timestamp 
          ? new Date(savedDbMsg.timestamp).toISOString() 
          : (msg.timestamp || new Date().toISOString());

        const confirmedMsg = {
          id: msgId,
          clientMsgId: msg.clientMsgId || msg.id,
          room,
          senderNik: msg.senderNik,
          senderName: msg.senderName,
          senderTitle: msg.senderTitle,
          senderFrame: msg.senderFrame,
          senderAvatar: msg.senderAvatar,
          text: msg.text,
          timestamp: msgTimestamp,
          mentionedNiks: msg.mentionedNiks || []
        };

        chatMessagesMemory.push(confirmedMsg);
        if (chatMessagesMemory.length > 250) chatMessagesMemory.shift();

        // Emit single canonical message event to room members (no duplicate broadcast)
        io.to(room).emit('new_message', confirmedMsg);
        
        // PENTING: Chat di Tempat Nongkrong (room === 'lounge') HANYA untuk interaksi visual lokal
        // di Tempat Nongkrong. JANGAN PERNAH dibuat notifikasi lonceng, push notification, atau mention apapun!
        if (room === 'lounge') {
          return;
        }

        // --- PROCESS MENTIONS ---
        const targetMentionNiks = new Set<string>();
        if (Array.isArray(msg.mentionedNiks)) {
          msg.mentionedNiks.forEach((n: string) => {
            if (n && n !== msg.senderNik && n !== 'all') targetMentionNiks.add(n);
          });
        }

        const textContent = (msg.text || '').toLowerCase();
        try {
          const allEmps = await db.select({ nik: employees.nik, name: employees.name }).from(employees);
          for (const emp of allEmps) {
            if (emp.nik && emp.nik !== msg.senderNik) {
              const empName = (emp.name || '').toLowerCase();
              const empNik = (emp.nik || '').toLowerCase();
              if (empName && (textContent.includes(`@${empName}`) || (empName.split(' ')[0].length >= 3 && textContent.includes(`@${empName.split(' ')[0]}`)))) {
                targetMentionNiks.add(emp.nik);
              } else if (empNik && textContent.includes(`@${empNik}`)) {
                targetMentionNiks.add(emp.nik);
              }
            }
          }
        } catch (scanErr) {
          console.warn('Mention auto-discovery error:', scanErr);
        }

        // Targeted notification & web push for mentioned personnel
        for (const targetNik of targetMentionNiks) {
          try {
            const _mentionNotif = await db.insert(notifications).values({
              userId: targetNik,
              role: null,
              title: `💬 ${msg.senderName} menyebut Anda`,
              message: `${msg.text.slice(0, 120)}`,
              type: 'info',
              link: '/chat'
            }).returning();
            sendWebPush(_mentionNotif);
          } catch(e) { console.error('Mention push error:', e); }

          // Emit direct socket event if target is online
          for (const [sockId, sockUser] of onlineSockets.entries()) {
            if (sockUser.nik === targetNik) {
              io.to(sockId).emit('chat:mention', {
                senderName: msg.senderName,
                senderNik: msg.senderNik,
                text: msg.text,
                room
              });
            }
          }
        }

        // General push notification for room members
        const title = room === 'global' ? 'Global Chat' : `Chat - ${room}`;
        try {
          const _n = await db.insert(notifications).values({
            userId: null,
            role: room === 'global' ? null : room,
            title,
            message: `${msg.senderName}: ${msg.text}`,
            type: 'info',
            link: '/chat'
          }).returning();
          sendWebPush(_n);
        } catch(e) { console.error('Chat push error:', e); }
      } catch (err) {
        console.error("Chat save error:", err);
      }
    });

    // --- QUIZ GAME LOGIC ---
    socket.on('quiz:join', (playerInfo) => {
      const existing = onlineSockets.get(socket.id) || {};
      const player = { ...existing, ...playerInfo, node: 0, isQuiz: true };
      socket.join('quiz_room');
      onlineSockets.set(socket.id, player);
      const quizPlayers = Array.from(onlineSockets.values()).filter((u: any) => u.isQuiz);
      io.to('quiz_room').emit('quiz:state', quizPlayers);
    });

    socket.on('quiz:progress', async (payload) => {
      const user = onlineSockets.get(socket.id);
      if (user && user.isQuiz) {
        let nodeIndex = 0;
        let targetNik = user.nik;
        if (typeof payload === 'object' && payload !== null) {
          nodeIndex = Number(payload.node) || 0;
          if (payload.nik) targetNik = payload.nik;
        } else {
          nodeIndex = Number(payload) || 0;
        }

        user.node = nodeIndex;
        if (targetNik) user.nik = targetNik;
        onlineSockets.set(socket.id, user);

        // Update progress in database if user has NIK
        if (targetNik) {
          try {
            await db.insert(easterEggProgress).values({
              nik: targetNik,
              node: nodeIndex,
              lastUpdated: new Date(),
            }).onConflictDoUpdate({
              target: easterEggProgress.nik,
              set: { node: nodeIndex, lastUpdated: new Date() }
            });
          } catch (e) {
            console.error('Failed to update easter egg progress', e);
          }
        }

        const quizPlayers = Array.from(onlineSockets.values()).filter((u: any) => u.isQuiz);
        io.to('quiz_room').emit('quiz:state', quizPlayers);
      }
    });

    socket.on('quiz:leave', () => {
      socket.leave('quiz_room');
      const user = onlineSockets.get(socket.id);
      if (user) {
        user.isQuiz = false;
        onlineSockets.set(socket.id, user);
        const quizPlayers = Array.from(onlineSockets.values()).filter((u: any) => u.isQuiz);
        io.to('quiz_room').emit('quiz:state', quizPlayers);
      }
    });

    socket.on('disconnect', () => {
      const user = onlineSockets.get(socket.id);
      if (user) {
        onlineSockets.delete(socket.id);
        broadcastPresence();
        if (user.room) {
          emitRoomUsers(user.room);
        }
        if (user.isQuiz) {
          const quizPlayers = Array.from(onlineSockets.values()).filter((u: any) => u.isQuiz);
          io.to('quiz_room').emit('quiz:state', quizPlayers);
        }
      }

      // Clean up from loungeAvatars if matching socketId or user.nik
      for (const [nik, avatar] of loungeAvatars.entries()) {
        if (avatar.socketId === socket.id || (user?.nik && nik === user.nik)) {
          loungeAvatars.delete(nik);
          io.to('lounge').emit('lounge:user_left', { nik, name: avatar.name, username: avatar.username });
        }
      }
      emitRoomUsers('lounge');

      // Clean up domino seats if matching socket or nik
      let dominoSeatChanged = false;
      for (let i = 0; i < 4; i++) {
        const s = dominoLoungeState.seats[i];
        if (s && !s.isBot && (s.socketId === socket.id || (user?.nik && s.nik === user.nik) || (socket.data.nik && s.nik === socket.data.nik))) {
          dominoLoungeState.seats[i] = null;
          dominoSeatChanged = true;
        }
      }
      if (dominoSeatChanged) {
        if (dominoLoungeState.seats.every(s => !s || s.isBot)) {
          resetDominoGame();
        }
        io.to('lounge').emit('domino:sync', getPublicDominoState());
      }

      // Clean up chess seats if matching socket or nik
      let chessSeatChanged = false;
      if (chessLoungeState.whiteSeat && (chessLoungeState.whiteSeat.socketId === socket.id || (user?.nik && chessLoungeState.whiteSeat.nik === user.nik) || (socket.data.nik && chessLoungeState.whiteSeat.nik === socket.data.nik))) {
        chessLoungeState.whiteSeat = null;
        chessSeatChanged = true;
      }
      if (chessLoungeState.blackSeat && (chessLoungeState.blackSeat.socketId === socket.id || (user?.nik && chessLoungeState.blackSeat.nik === user.nik) || (socket.data.nik && chessLoungeState.blackSeat.nik === socket.data.nik))) {
        chessLoungeState.blackSeat = null;
        chessSeatChanged = true;
      }
      if (chessSeatChanged) {
        if (!chessLoungeState.whiteSeat && !chessLoungeState.blackSeat) {
          resetChessGame();
        }
        io.to('lounge').emit('chess:sync', chessLoungeState);
      }

      // Clean up RPS matches if player disconnects
      for (const [mId, match] of rpsMatches.entries()) {
        if (match.player1.socketId === socket.id || match.player2.socketId === socket.id || (user?.nik && (match.player1.nik === user.nik || match.player2.nik === user.nik))) {
          io.to(`rps:${mId}`).emit('rps:match_ended', { reason: 'Lawan terputus dari jaringan.' });
          rpsMatches.delete(mId);
        }
      }

    });
  });

  // HTTP Compression (B1 Perf Optimization - saves ~70% network payload on JS/CSS/JSON)
  app.use(compression());

  // Security Headers (P1 Hardening)
  app.use(helmet({
    contentSecurityPolicy: false, // Managed by Vite in client development/production
    crossOriginEmbedderPolicy: false,
  }));

  // Middleware to parse JSON bodies & Cookies (Support large multi-employee photo imports & base64)
  app.use(express.json({ limit: '150mb' })); 
  app.use(express.urlencoded({ limit: '150mb', extended: true }));
  app.use(cookieParser());

  // Rate Limiting (P1 Hardening)
  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // max 50 auth requests per 15 minutes per IP
    message: { status: "error", code: "TOO_MANY_REQUESTS", message: "Terlalu banyak percobaan autentikasi. Silakan coba lagi setelah 15 menit." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const apiGeneralLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 800, // max 800 API requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Apply general API rate limiter
  app.use("/api", apiGeneralLimiter);

  // Static files in public directory (including favicon, logo, etc.)
  app.use(express.static(path.join(process.cwd(), "public")));
  app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "favicon.ico"));
  });

  // Centralized API Authentication Guard (P0 Hardening)
  const PUBLIC_API_PREFIXES = [
    '/api/auth/login',
    '/api/auth/check-nik',
    '/api/auth/setup',
    '/api/auth/reset-password',
    '/api/config/env',
    '/api/health',
    '/api/drive/view',
    '/api/labbot/chat',
    '/api/p5m/flyer',
    '/api/p5m/schedules/user-assignment',
    '/api/inspection-schedule',
    '/api/daily-tasks-status',
    '/api/induksi',
    '/api/changelog',
    '/api/gamification',
    '/api/developers',
    '/api/kbbi',
    '/api/chat',
    '/api/presence',
    '/api/pdf',
    '/api/user',
    '/api/gallery',
    '/api/portal-gallery',
    '/api/xrf',
    '/api/employees/photo',
    '/api/inspections/p2h-lab'
  ];

  // Populate req.user if token valid on all /api routes
  app.use('/api', optionalAuth);

  app.use('/api', (req, res, next) => {
    const url = req.originalUrl.split('?')[0];
    const isPublic = PUBLIC_API_PREFIXES.some(prefix => url === prefix || url.startsWith(prefix + '/'));
    if (isPublic) {
      return next();
    }
    // Allow public read-only (GET) access to P5M schedules, pool, materi, bulletin posts, agenda, APD, and training database
    if (req.method === 'GET' && (
      url.startsWith('/api/p5m/materi') || 
      url.startsWith('/api/p5m/schedules') || 
      url.startsWith('/api/p5m/pool') ||
      url.startsWith('/api/bulletin') ||
      url.startsWith('/api/agenda') ||
      url.startsWith('/api/apd') ||
      url.startsWith('/api/logbook') ||
      url.startsWith('/api/clinic') ||
      url.startsWith('/api/employee-leaves') ||
      url.startsWith('/api/xrf') ||
      url.startsWith('/api/training-records') ||
      url.startsWith('/api/training-certifications') ||
      url.startsWith('/api/employees')
    )) {
      return next();
    }
    return requireAuth(req, res, next);
  });

  // Mount modular routers
  app.use("/api/auth", authRateLimiter, authRouter);

  // Debug router only available in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    app.use("/api/debug", debugRouter);
  }
  app.use("/api/employees", employeesRouter);
  app.use("/api/p5m", p5mRouter);
  app.use(miscRouter);
  app.use(bulletinRouter);
  app.use(quizRouter);
  app.use(notificationsRouter);
  app.use(workOrdersRouter); // Mount workOrders router with maintenance summary
  app.use(cloudRouter);
  app.use(inspectionsRouter);
  app.use(ticketsRouter);
  app.use(apdRouter);
  app.use(rosterRouter);
  app.use(adminRouter);
  app.use(agendaRouter);
  app.use(feedbackRouter);
  app.use(financeRouter);
  app.use(labbotRouter);
  app.use(kbbiRouter);
  app.use(changelogRouter);
  app.use("/api/gamification", gamificationRouter);
  app.use(logbookRouter);
  app.use(clinicRouter);
  app.use(employeeLeavesRouter);
  app.use(safetyRekapRouter);
  app.use(inspectionPlannerRouter);
  app.use(trainingRouter);
  app.use(trainingCertificationsRouter);
  app.use(mealOrdersRouter);
  app.use("/api/xrf", xrfRouter);
  app.use("/api/user", userPreferencesRouter);
  app.use(galleryRouter);
  app.use("/api/signature", signatureRouter);

  // --- PRESENCE ROUTES ---
  app.get('/api/presence/online', async (req, res) => {
    try {
      cleanupStaleLoungeAvatars();
      const liveSockets = getUniqueOnlineUsers().map(u => ({ ...u, isLive: true }));
      res.json({
        success: true,
        onlineUsers: liveSockets,
        totalOnline: liveSockets.length,
        totalLive: liveSockets.length,
        loungeMembers: Array.from(loungeAvatars.values())
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // --- CHAT ROUTES ---
  app.get('/api/chat/:room', async (req, res) => {
    try {
      const room = req.params.room || 'global';
      try {
        const msgs = await db.select().from(chatMessages).where(eq(chatMessages.room, room)).orderBy(asc(chatMessages.id)).limit(100);
        if (msgs && msgs.length > 0) {
          return res.json(msgs.map(m => ({
            id: m.id,
            room: m.room,
            senderNik: m.senderNik,
            senderName: m.senderName,
            text: m.text,
            timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString()
          })));
        }
      } catch (e) {
        console.warn('Chat DB query fallback to memory:', e);
      }
      const filtered = chatMessagesMemory.filter(m => m.room === room);
      res.json(filtered);
    } catch (err) {
      console.error('Failed to get chat messages:', err);
      res.status(500).json({ error: 'Failed to fetch chat messages' });
    }
  });

  app.delete('/api/chat/:room', async (req, res) => {
    try {
      const room = req.params.room || 'global';
      if (room === 'all') {
        await db.delete(chatMessages);
        chatMessagesMemory.length = 0;
      } else {
        await db.delete(chatMessages).where(eq(chatMessages.room, room));
        const kept = chatMessagesMemory.filter(m => m.room !== room);
        chatMessagesMemory.length = 0;
        chatMessagesMemory.push(...kept);
      }
      io.to(room).emit('chat_cleared', { room });
      io.emit('chat_cleared', { room });
      res.json({ success: true, message: `Pesan chat room ${room} berhasil dibersihkan` });
    } catch (err: any) {
      console.error('Failed to clear chat:', err);
      res.status(500).json({ error: 'Gagal membersihkan chat: ' + err.message });
    }
  });

  app.post('/api/chat/clear', async (req, res) => {
    try {
      const { room = 'global' } = req.body || {};
      if (room === 'all') {
        await db.delete(chatMessages);
        chatMessagesMemory.length = 0;
      } else {
        await db.delete(chatMessages).where(eq(chatMessages.room, room));
        const kept = chatMessagesMemory.filter(m => m.room !== room);
        chatMessagesMemory.length = 0;
        chatMessagesMemory.push(...kept);
      }
      io.to(room).emit('chat_cleared', { room });
      io.emit('chat_cleared', { room });
      res.json({ success: true, message: `Pesan chat room ${room} berhasil dibersihkan` });
    } catch (err: any) {
      console.error('Failed to clear chat:', err);
      res.status(500).json({ error: 'Gagal membersihkan chat: ' + err.message });
    }
  });

  // --- WEB PUSH ROUTES ---


  // --- API ROUTES ---
  app.get('/api/quiz/quest-questions', async (req, res) => {
    try {
      // Get all questions for the full RPG adventure
      const qs = await db.select().from(quizQuestions);
      // Map to required format
      const formattedQs = qs.map((q, idx) => ({
        id: q.id,
        title: `Node ${idx + 1}`,
        question: q.text,
        options: q.options,
        correctIndex: q.correctAnswerIndex,
        explanation: 'Lihat buku saku K3LH untuk penjelasan lebih detail.'
      }));
      res.json(formattedQs);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error');
    }
  });

  app.post('/api/quiz/quest-progress', async (req, res) => {
    try {
      const { nik, node } = req.body;
      if (!nik) return res.status(400).json({ error: 'NIK is required' });
      const nodeIndex = Number(node) || 0;
      await db.insert(easterEggProgress).values({
        nik: String(nik).trim(),
        node: nodeIndex,
        lastUpdated: new Date(),
      }).onConflictDoUpdate({
        target: easterEggProgress.nik,
        set: { node: nodeIndex, lastUpdated: new Date() }
      });
      res.json({ success: true, nik, node: nodeIndex });
    } catch (err) {
      console.error('Failed to save quest progress:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/quiz/quest-leaderboard', async (req, res) => {
    try {
      const records = await db.select({
        nik: easterEggProgress.nik,
        node: easterEggProgress.node,
        name: sql<string>`COALESCE(${employees.name}, ${easterEggProgress.nik})`.as('name'),
        lastUpdated: easterEggProgress.lastUpdated,
      })
      .from(easterEggProgress)
      .leftJoin(employees, eq(easterEggProgress.nik, employees.nik))
      .orderBy(desc(easterEggProgress.node), desc(easterEggProgress.lastUpdated));
      res.json(records);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error');
    }
  });

  // --- BULLETIN ROUTES ---

  
  
async function getNotificationTargets(dept) {
  const allEmployees = await db.select().from(employees);
  if (dept === 'Prep & Lab') {
    return allEmployees;
  }
  
  return allEmployees.filter(emp => {
    const s = (emp.section || "").toLowerCase();
    const j = (emp.jabatan || "").toLowerCase();
    
    // QA and Manager can see all, so they should get notifications for all too?
    // Let's assume they get notified for everything if they can see everything.
    if (s.includes("qa") || s.includes("quality assurance") || j.includes("manager") || j.includes("qa")) {
      return true;
    }
    
    if (dept === 'Preparation' && (s.includes('preparation') || s.includes('dry') || s.includes('wet'))) return true;
    if (dept === 'Laboratory' && (s.includes('laboratory') || s.includes('lab'))) return true;
    if (dept === 'Maintenance' && (s.includes('maintenance'))) return true;
    if (dept === 'Administration' && (s.includes('administration') || s.includes('admin'))) return true;
    if (dept === 'Inventory Control' && (s.includes('inventory') || s.includes('inv'))) return true;
    
    return false;
  });
}

// Note: Canonical syncBulletinToAgenda is exported from ./server/utils.ts and used across bulletin routes.



  







  
  // 1. Health check endpoint
  
  
  // --- QUIZ QUESTIONS ENDPOINTS ---






  // --- Modular Routers mounted centrally at server startup ---

  // 4. Work Orders (WO)



  // 5. Tickets

  


  // 6. Spareparts



  // 7. Generic catch-all endpoints for demo/migration completeness




  

  





  

  


  
  // --- ADMIN API ROUTES ---

  const getTableObj = (name) => {
    switch (name) {
      case "employees": return employees;
      case "equipments": return equipments;
      case "workOrders": return workOrders;
      case "tickets": return tickets;
      case "downtime": return downtime;
      case "spareparts": return spareparts;
      case "apdSettings": return apdSettings;
      case "apdHistory": return apdHistory;
      case "apdDocuments": return apdDocuments;
      case "roster": return roster;
      case "inspections": return inspections;
      case "pemantauan": return pemantauan;
      case "questions": return questions;
      case "agendaEvents": return agendaEvents;
      case "privateNotes": return privateNotes;
      case "userThemes": return userThemes;
      case "pelanggaran": return pelanggaran;
      case "appSettings": return appSettings;
      case "developerUsers": return developerUsers;
      default: return null;
    }
  };

  app.get("/api/questions", async (req, res) => {
    try {
      const data = await db.select().from(questions);
      res.json(data);
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  });

  app.get("/api/config/env", (req, res) => {
    res.json({
      env: process.env.APP_ENV || 'production'
    });
  });

  const sanitizePayload = (t: any, payload: any): any => {
    const cleaned: any = {};
    for (const key of Object.keys(payload)) {
      if (!t[key]) continue;
      const col = t[key];
      let val = payload[key];
      
      if (val === '' || val === null) {
        cleaned[key] = null;
        continue;
      }
      
      if (col.dataType === 'date') {
        if (typeof val === 'string') {
          cleaned[key] = new Date(val);
        } else {
          cleaned[key] = val;
        }
      } else if (col.dataType === 'boolean') {
        cleaned[key] = val === 'true' || val === true || val === '1';
      } else if (col.dataType === 'number') {
        cleaned[key] = Number(val);
      } else {
        cleaned[key] = val;
      }
    }
    delete cleaned.id;
    return cleaned;
  };




  


  // --- AGENDA ROUTES ---
  




  // --- NOTES ROUTES ---



  // --- THEMES ROUTES ---




  
  app.post("/api/pelanggaran/migrate", async (req, res) => {
    try {
      await db.delete(pelanggaran);

      let csvText = '';
      const localCsvPath = path.join(process.cwd(), 'scripts', 'counseling_spdk_data.csv');
      if (fs.existsSync(localCsvPath)) {
        csvText = fs.readFileSync(localCsvPath, 'utf8');
      } else {
        const url = "https://docs.google.com/spreadsheets/d/17bU5vvVD9O8g-KATgGf1ZNDI1B8_EwS-r3xNtEPaw3s/export?format=csv&sheet=Rekapan";
        const csvRes = await fetch(url);
        if (csvRes.ok) {
          csvText = await csvRes.text();
        }
      }

      if (!csvText) {
        return res.status(500).json({ error: "Data CSV konseling tidak ditemukan" });
      }

      const parseIndoDate = (str: string): Date | null => {
        if (!str) return null;
        const monthMap: Record<string, number> = {
          jan: 0, januari: 0,
          feb: 1, februari: 1,
          mar: 2, maret: 2,
          apr: 3, april: 3,
          mei: 4, may: 4,
          jun: 5, juni: 5,
          jul: 6, juli: 6,
          agu: 7, agt: 7, agustus: 7, aug: 7,
          sep: 8, september: 8,
          okt: 9, oktober: 9, oct: 9,
          nov: 10, november: 10,
          des: 11, desember: 11, dec: 11
        };
        const clean = str.trim().toLowerCase();
        const parts = clean.split(/[\/\-\s]+/).filter(Boolean);
        if (parts.length === 3) {
          let day = parseInt(parts[0], 10);
          let monthName = parts[1];
          let year = parseInt(parts[2], 10);
          if (year < 100) year += 2000;
          const month = monthMap[monthName] ?? (parseInt(monthName, 10) - 1);
          if (!isNaN(day) && month !== undefined && !isNaN(year)) {
            return new Date(Date.UTC(year, month, day));
          }
        }
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
      };

      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      const rows = parsed.data as Record<string, string>[];

      const cols = [
        { tglKey: ' Tanggal Konseling \n1', rKey: 'Alasan Konseling 1', status: 'Konseling 1' },
        { tglKey: ' Tanggal Konseling \n2', rKey: 'Alasan Konseling 2', status: 'Konseling 2' },
        { tglKey: ' Tanggal Konseling \n3', rKey: 'Alasan Konseling 3', status: 'Konseling 3' },
        { tglKey: ' Tanggal Surat Teguran', rKey: 'Alasan Surat Teguran', status: 'Surat Teguran' },
        { tglKey: ' Tanggal SP 1', rKey: 'Alasan SP 1', status: 'SP 1' },
        { tglKey: ' Tanggal SP 2', rKey: 'Alasan SP 2', status: 'SP 2' },
        { tglKey: ' Tanggal SP 3', rKey: 'Alasan SP 3', status: 'SP 3' },
        { tglKey: 'Tanggal SPPT', rKey: 'Alasan SPPT', status: 'SPPT' },
      ];

      const insertData: any[] = [];
      for (const r of rows) {
        const nama = r['Nama Karyawan'] || r['Nama'] || '';
        if (!nama || nama.trim() === '-') continue;

        for (const c of cols) {
          let rawDates = r[c.tglKey] || '';
          let rawReasons = r[c.rKey] || '';

          if (!rawDates) {
            for (const [k, v] of Object.entries(r)) {
              const cleanK = k.replace(/[\r\n\s]/g, '').toLowerCase();
              const targetK = c.tglKey.replace(/[\r\n\s]/g, '').toLowerCase();
              if (cleanK === targetK) {
                rawDates = v || '';
                break;
              }
            }
          }

          if (!rawReasons) {
            for (const [k, v] of Object.entries(r)) {
              const cleanK = k.replace(/[\r\n\s]/g, '').toLowerCase();
              const targetK = c.rKey.replace(/[\r\n\s]/g, '').toLowerCase();
              if (cleanK === targetK) {
                rawReasons = v || '';
                break;
              }
            }
          }

          if (!rawDates || !rawDates.trim()) continue;

          const dateLines = rawDates.split('\n').map(s => s.trim()).filter(Boolean);
          const reasonLines = rawReasons.split('\n').map(s => s.trim()).filter(Boolean);

          for (let i = 0; i < dateLines.length; i++) {
            const d = parseIndoDate(dateLines[i]);
            if (d) {
              const reason = reasonLines[i] || reasonLines.join('; ') || rawReasons.trim() || null;
              insertData.push({
                nama: nama.trim(),
                status: c.status,
                tanggal: d.toISOString(),
                penjelasan: reason
              });
            }
          }
        }
      }

      for (let i = 0; i < insertData.length; i += 50) {
        await db.insert(pelanggaran).values(insertData.slice(i, i + 50));
      }

      res.json({ success: true, migrated: insertData.length });
    } catch (error: any) {
      console.error("Error migrating:", error.message || error);
      res.status(500).json({ error: error.message || "Failed to migrate" });
    }
  });

  
  app.delete("/api/pelanggaran/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(pelanggaran).where(eq(pelanggaran.id, parseInt(id, 10)));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting pelanggaran:", error);
      res.status(500).json({ error: "Failed to delete" });
    }
  });

  app.get("/api/pelanggaran", async (req, res) => {
    try {
      const data = await db.select().from(pelanggaran).orderBy(desc(pelanggaran.createdAt));
      res.json(data);
    } catch (error) {
      console.error("Error fetching pelanggaran:", error);
      res.status(500).json({ error: "Failed to fetch pelanggaran" });
    }
  });

  
  app.post("/api/pelanggaran/bulk", async (req, res) => {
    try {
      const records = req.body.records;
      if (!records || records.length === 0) return res.json({ success: true, count: 0 });
      
      // Clear existing records
      await db.delete(pelanggaran);

      await db.insert(pelanggaran).values(records);
      
      res.json({ success: true, count: records.length });
    } catch (error) {
      console.error("Error bulk insert:", error);
      res.status(500).json({ error: "Failed to bulk insert" });
    }
  });

  app.post("/api/pelanggaran", async (req, res) => {
    try {
      const result = await db.insert(pelanggaran).values(req.body).returning();
      try {
        const _n = await db.insert(notifications).values({
          userId: null,
          role: 'Administration',
          title: 'Laporan Pelanggaran',
          message: `${req.body.name} - ${req.body.jenisPelanggaran}`,
          type: 'warning',
          link: '/pelanggaran'
        }).returning();
        sendWebPush(_n);
      } catch(e) {}
      res.status(201).json(result[0]);
    } catch (error) {
      console.error("Error creating pelanggaran:", error);
      res.status(500).json({ error: "Failed to create pelanggaran" });
    }
  });


  


  




  
  // --- INDUKSI K3LH ---



  

  // --- VITE MIDDLEWARE (Untuk Frontend) ---
  if (process.env.NODE_ENV !== "production") {
    // Mode Development: Vite yang akan melayani file frontend
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Mode Production: Express langsung melayani file statis dari folder dist/
    const distPath = path.join(process.cwd(), "dist");

    // Explicit root routes for critical PWA files to guarantee correct MIME types and cache headers
    app.get('/manifest.json', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'application/manifest+json');
      res.sendFile(path.join(distPath, 'manifest.json'));
    });
    app.get('/favicon.ico', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'image/x-icon');
      res.sendFile(path.join(distPath, 'favicon.ico'));
    });
    app.get('/logo.png', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'image/png');
      res.sendFile(path.join(distPath, 'logo.png'));
    });
    app.get('/preplab-logo.png', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'image/png');
      res.sendFile(path.join(distPath, 'preplab-logo.png'));
    });
    app.get('/icon-192.png', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'image/png');
      res.sendFile(path.join(distPath, 'icon-192.png'));
    });
    app.get('/icon-512.png', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'image/png');
      res.sendFile(path.join(distPath, 'icon-512.png'));
    });
    app.get('/sw.js', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Content-Type', 'application/javascript');
      res.sendFile(path.join(distPath, 'sw.js'));
    });

    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        const normalized = filePath.replace(/\\/g, '/');
        // Only hashed files in /assets/ get 1y cache. Root HTML, json, icons, and sw get no-cache
        if (
          !normalized.includes('/assets/') ||
          normalized.endsWith('.html') ||
          normalized.endsWith('.json') ||
          normalized.endsWith('sw.js') ||
          normalized.endsWith('.ico') ||
          normalized.endsWith('.png')
        ) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));
    app.get("*", (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Centralized Error Handling Middleware (Always return JSON for API errors instead of HTML)
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }
    console.error("Express uncaught error:", err);
    if (err.type === 'entity.too.large' || err.status === 413) {
      return res.status(413).json({
        success: false,
        error: "Ukuran payload/foto terlalu besar (maksimal 25MB). Silakan gunakan foto yang telah dikompres."
      });
    }
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Terjadi kesalahan internal pada server."
    });
  });

  // Ensure critical DB columns exist in background
  pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS tanggal_efektif_tidak_bekerja text;').catch(() => {});
  pool.query('ALTER TABLE employees ADD COLUMN IF NOT EXISTS masa_kerja_jabatan_sebelumnya text;').catch(() => {});

  // Mulai pelayan (server) di port 3000
  initRosterCron();
  initTrainingNotificationCron();

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server backend siap berjalan di http://localhost:${PORT} (http://127.0.0.1:${PORT})`);
  });
}

startServer();

