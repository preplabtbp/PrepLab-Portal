import { Readable } from 'stream';
process.env.TZ = 'Asia/Jayapura';
import PDFDocument from 'pdfkit-table';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import express from "express";
import { env, validateEnv } from "./server/config/env.js";
validateEnv();
import { router as miscRouter } from "./server/routes/misc.js";
import { router as bulletinRouter } from "./server/routes/bulletin.js";
import { router as quizRouter } from "./server/routes/quiz.js";
import { router as notificationsRouter } from "./server/routes/notifications.js";
import { router as workOrdersRouter } from "./server/routes/workOrders.js";
import { router as cloudRouter } from "./server/routes/cloud.js";
import { router as inspectionsRouter } from "./server/routes/inspections.js";
import { router as ticketsRouter } from "./server/routes/tickets.js";
import { router as apdRouter } from "./server/routes/apd.js";
import { router as rosterRouter } from "./server/routes/roster.js";
import { router as adminRouter } from "./server/routes/admin.js";
import { router as agendaRouter } from "./server/routes/agenda.js";
import webpush from 'web-push';
import { generatePdfFromTemplate, drive } from './google-services.js';
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { db, pool } from "./src/db/index.js";
import { chatMessages, employees, equipments, workOrders, users, tickets, downtime, spareparts, apdSettings, apdHistory, apdDocuments, roster, inspections, pemantauan, questions, agendaEvents, privateNotes, userThemes, bulletinPosts, notifications, bulletinComments, uploadedFiles, appSettings, pelanggaran, mealReports, pushSubscriptions, quizQuestions, preplabCloudLogs, quizScores, easterEggProgress, induksi, developerUsers } from "./src/db/schema.js";

// Initialize web-push
// We generate keys if they are not in the environment
const vapidPublicKey = env.VAPID_PUBLIC_KEY as string;
const vapidPrivateKey = env.VAPID_PRIVATE_KEY as string;
webpush.setVapidDetails(
  'mailto:prep.lab.tbp@gmail.com',
  vapidPublicKey,
  vapidPrivateKey
);
import { ticketSchema, workOrderSchema } from "./src/lib/zod.js";
import { eq, desc, or, inArray, isNull, and, gte, lte, sql } from "drizzle-orm";
import { authRouter } from "./server/routes/auth.js";
import { debugRouter } from "./server/routes/debug.js";
import { employeesRouter } from "./server/routes/employees.js";
import { p5mRouter } from "./server/routes/p5m.js";
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
  await initDbSchema();
  
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
  const PORT = process.env.PORT || 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  // Socket.IO logic
  const onlineUsers = new Map(); // socket.id -> { nik, name, department, room }

  io.on('connection', (socket) => {
    socket.on('join', (user) => {
      // user: { nik, name, department, room }
      const room = user.room || 'global';
      socket.join(room);
      onlineUsers.set(socket.id, { ...user, room });
      
      const usersInRoom = Array.from(onlineUsers.values()).filter(u => u.room === room);
      io.to(room).emit('online_users', usersInRoom);
    });

    socket.on('send_message', async (msg) => {
      try {
        const room = msg.room || 'global';
        const newMsg = {
          id: Date.now(),
          room,
          senderNik: msg.senderNik,
          senderName: msg.senderName,
          text: msg.text,
          timestamp: new Date().toISOString()
        };
        chatMessagesMemory.push(newMsg);
        io.to(room).emit('new_message', newMsg);
        
        // Push notification
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
      const player = { ...playerInfo, node: 0, isQuiz: true };
      socket.join('quiz_room');
      onlineUsers.set(socket.id, player);
      const quizPlayers = Array.from(onlineUsers.values()).filter(u => u.isQuiz);
      io.to('quiz_room').emit('quiz:state', quizPlayers);
    });

    socket.on('quiz:progress', async (nodeIndex) => {
      const user = onlineUsers.get(socket.id);
      if (user && user.isQuiz) {
        user.node = nodeIndex;
        onlineUsers.set(socket.id, user);

        // Update progress in database if user has NIK
        if (user.nik) {
          try {
            await db.insert(easterEggProgress).values({
              nik: user.nik,
              node: nodeIndex,
            }).onConflictDoUpdate({
              target: easterEggProgress.nik,
              set: { node: nodeIndex, lastUpdated: new Date() }
            });
          } catch (e) {
            console.error('Failed to update easter egg progress', e);
          }
        }

        const quizPlayers = Array.from(onlineUsers.values()).filter(u => u.isQuiz);
        io.to('quiz_room').emit('quiz:state', quizPlayers);
      }
    });

    socket.on('quiz:leave', () => {
      socket.leave('quiz_room');
      const user = onlineUsers.get(socket.id);
      if (user) {
        user.isQuiz = false;
        onlineUsers.set(socket.id, user);
        const quizPlayers = Array.from(onlineUsers.values()).filter(u => u.isQuiz);
        io.to('quiz_room').emit('quiz:state', quizPlayers);
      }
    });

    socket.on('disconnect', () => {
      const user = onlineUsers.get(socket.id);
      if (user) {
        onlineUsers.delete(socket.id);
        if (user.room) {
          const usersInRoom = Array.from(onlineUsers.values()).filter(u => u.room === user.room);
          io.to(user.room).emit('online_users', usersInRoom);
        }
        if (user.isQuiz) {
          const quizPlayers = Array.from(onlineUsers.values()).filter(u => u.isQuiz);
          io.to('quiz_room').emit('quiz:state', quizPlayers);
        }
      }
    });
  });

  // Middleware to parse JSON bodies
  app.use(express.json({ limit: '50mb' })); 
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Static files in public directory (including favicon, logo, etc.)
  app.use(express.static(path.join(process.cwd(), "public")));
  app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "favicon.ico"));
  });

  // Mount modular routers
  app.use("/api/auth", authRouter);
  app.use("/api/debug", debugRouter);
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

  // In-memory chat storage as fallback since DB is disconnected
  const chatMessagesMemory: any[] = [];
  
  // --- CHAT ROUTES ---

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

  app.get('/api/quiz/quest-leaderboard', async (req, res) => {
    try {
      const records = await db.select({
        nik: easterEggProgress.nik,
        node: easterEggProgress.node,
        name: employees.name,
        lastUpdated: easterEggProgress.lastUpdated,
      })
      .from(easterEggProgress)
      .innerJoin(employees, eq(easterEggProgress.nik, employees.nik))
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

async function syncBulletinToAgenda(post: any) {
  try {
    let contentData: any = {};
    try {
      contentData = JSON.parse(post.content);
    } catch (e) {
      console.error("Failed to parse content for agenda sync", e);
      return;
    }

    const agendaId = `bulletin_${post.id}`;

    if (contentData.agendaDate) {
      const startD = new Date(contentData.agendaDate);
      if (isNaN(startD.getTime())) {
        console.error("Invalid agendaDate", contentData.agendaDate);
        return;
      }

      // Check if agenda item already exists
      const existing = await db.select().from(agendaEvents).where(eq(agendaEvents.id, agendaId)).limit(1);

      const agendaData = {
        id: agendaId,
        title: (contentData as any).jenisKegiatan || "Bulletin Event",
        startDate: startD,
        endDate: (contentData as any).endDate ? new Date((contentData as any).endDate) : null,
        kategori: "SPV UP", // Maps to 'Section' in frontend
        pic: (contentData as any).pic || post.authorName || "",
        deskripsi: (contentData as any).keterangan || "",
        creatorNik: post.authorNik,
        department: post.department,
        bulletinPostId: post.id,
      };

      if (existing.length > 0) {
        await db.update(agendaEvents).set(agendaData).where(eq(agendaEvents.id, agendaId));
      } else {
        await db.insert(agendaEvents).values(agendaData);
      }
    } else {
      // If no agendaDate is provided (or if it was deleted), make sure we delete the corresponding agenda event if it existed!
      await db.delete(agendaEvents).where(eq(agendaEvents.id, agendaId));
    }
  } catch (error) {
    console.error("Failed in syncBulletinToAgenda:", error);
  }
}


  







  
  // 1. Health check endpoint
  
  
  // --- QUIZ QUESTIONS ENDPOINTS ---






  // --- AUTH ENDPOINTS ---
  
  app.use("/api/auth", authRouter);
app.use("/", miscRouter);
app.use("/", bulletinRouter);
app.use("/", quizRouter);
app.use("/", notificationsRouter);
app.use("/", workOrdersRouter);
app.use("/", cloudRouter);
app.use("/", inspectionsRouter);
app.use("/", ticketsRouter);
app.use("/", apdRouter);
app.use("/", rosterRouter);
app.use("/", adminRouter);
app.use("/", agendaRouter);
app.use("/api/debug", debugRouter);




  // --- App Settings ---


  // 2. Karyawan (Employees)
  app.use("/api/employees", employeesRouter);

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
      // Clear existing records before migrating
      await db.delete(pelanggaran);

      const url = "https://docs.google.com/spreadsheets/d/17bU5vvVD9O8g-KATgGf1ZNDI1B8_EwS-r3xNtEPaw3s/export?format=csv&sheet=Rekapan";
      const csvRes = await fetch(url);
      if (!csvRes.ok) throw new Error("Gagal mengunduh CSV dari Google Sheets.");
      
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
          } else if (char === '' && !inQuotes) {
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
      if (!rows || rows.length < 2) return res.json({ success: true, migrated: 0 });
      
      const statuses = [
        { index: 11, label: 'Konseling 1' },
        { index: 12, label: 'Konseling 2' },
        { index: 13, label: 'Konseling 3' },
        { index: 14, label: 'Surat Teguran' },
        { index: 15, label: 'SP 1' },
        { index: 16, label: 'SP 2' },
        { index: 17, label: 'SP 3' },
        { index: 18, label: 'SPPT' }
      ];

      let count = 0;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 2) continue;
        const nama = row[1] ? row[1].trim() : '';
        if (!nama || nama === '-') continue;

        for (const statusObj of statuses) {
          const tanggalStr = row[statusObj.index];
          if (!tanggalStr || tanggalStr.trim() === '') continue;

          let tgl = new Date(tanggalStr.trim());
          if (isNaN(tgl.getTime())) {
            let normalizedDate = tanggalStr.toLowerCase();
            for (const [id, en] of Object.entries({
              'januari': '01', 'jan': '01',
              'februari': '02', 'feb': '02',
              'maret': '03', 'mar': '03',
              'april': '04', 'apr': '04',
              'mei': '05',
              'juni': '06', 'jun': '06',
              'juli': '07', 'jul': '07',
              'agustus': '08', 'agu': '08',
              'september': '09', 'sep': '09',
              'oktober': '10', 'okt': '10',
              'november': '11', 'nov': '11',
              'desember': '12', 'des': '12'
            })) {
              if (normalizedDate.includes(id)) {
                normalizedDate = normalizedDate.replace(id, en);
                break;
              }
            }

            const parts = normalizedDate.trim().split(/[\/\- ]/).filter(Boolean);
            if (parts.length === 3) {
              let day = parts[0];
              let month = parts[1];
              let year = parts[2];
              
              if (year.length === 2) year = '20' + year;
              if (day.length === 4) {
                 let temp = day;
                 day = year;
                 year = temp;
              }
              
              tgl = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`);
            }
          }
          
          if (!isNaN(tgl.getTime())) {
            const penjelasan = row[statusObj.index + 8] ? row[statusObj.index + 8].trim() : null;
            await db.insert(pelanggaran).values({
              nama,
              status: statusObj.label,
              tanggal: tgl.toISOString(),
              penjelasan
            });
            count++;
          }
        }
      }
      
      res.json({ success: true, migrated: count });
    } catch (error) {
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
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Mulai pelayan (server) di port 3000
  initRosterCron();


  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server backend siap berjalan di http://localhost:${PORT}`);
  });
}

startServer();
