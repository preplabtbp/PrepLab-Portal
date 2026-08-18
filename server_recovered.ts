process.env.TZ = 'Asia/Jayapura';
import PDFDocument from 'pdfkit-table';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';
import express from "express";
import { generatePdfFromTemplate, drive } from './google-services.js';
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index.js";
import { employees, equipments, workOrders, users, tickets, downtime, spareparts, apdSettings, apdHistory, apdDocuments, roster, inspections, pemantauan, questions, agendaEvents, privateNotes, userThemes, bulletinPosts, notifications, bulletinComments, uploadedFiles, appSettings, pelanggaran, mealReports } from "./src/db/schema.js";
import { eq, desc, or } from "drizzle-orm";
import { syncRosterData, initRosterCron } from "./src/syncRoster.js";



async function startServer() {
  
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
  const delimiter = `\r\n--${boundary}\r\n`;
  const close_delim = `\r\n--${boundary}--\r\n`;
  
  const multipartRequestBody = Buffer.concat([
    Buffer.from(delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n'),
    Buffer.from(JSON.stringify(metadata)),
    Buffer.from(delimiter + `Content-Type: ${mimeType}\r\n\r\n`),
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
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json({ limit: '50mb' })); app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // --- API ROUTES ---

  // --- BULLETIN ROUTES ---
  app.get("/api/bulletin", async (req, res) => {
    try {
      const data = await db.select().from(bulletinPosts).orderBy(bulletinPosts.createdAt);
      // We will sort them descending in the frontend or we can use desc() if imported
      res.json({ status: "success", data });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.get("/api/bulletin/search", async (req, res) => {
    try {
      const { q, department } = req.query;
      if (!q) {
        return res.json({ status: "success", data: [] });
      }
      
      const qLower = String(q).toLowerCase();
      
      // Get all posts for department
      let allPosts = await db.select().from(bulletinPosts);
      if (department) {
         allPosts = allPosts.filter(p => p.department === department);
      }
      
      const allComments = await db.select().from(bulletinComments);
      
      const matchedPosts = [];
      
      for (const post of allPosts) {
         let isMatch = false;
         let postContent = {};
         try {
            postContent = JSON.parse(post.content);
         } catch(e){}
         
         const jenisKegiatan = ((postContent as any).jenisKegiatan || "").toLowerCase();
         const keterangan = ((postContent as any).keterangan || "").toLowerCase();
         const pic = ((postContent as any).pic || "").toLowerCase();
         
         if (jenisKegiatan.includes(qLower) || keterangan.includes(qLower) || pic.includes(qLower)) {
            isMatch = true;
         }
         
         const postComments = allComments.filter(c => c.postId === post.id);
         const matchedComments = [];
         
         for (const c of postComments) {
            const content = (c.content || "").toLowerCase();
            const fileName = (c.fileName || "").toLowerCase();
            
            if (content.includes(qLower) || fileName.includes(qLower)) {
               isMatch = true;
               matchedComments.push(c);
            }
         }
         
         if (isMatch) {
            matchedPosts.push({
               ...post,
               parsedContent: postContent,
               matchedComments
            });
         }
      }
      
      res.json({ status: "success", data: matchedPosts });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });
  
  
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

  app.post("/api/bulletin", async (req, res) => {
    try {
      const result = await db.insert(bulletinPosts).values(req.body).returning();
      const post = result[0];
      
      // Sync to agenda if there is an agendaDate
      await syncBulletinToAgenda(post);
      
      const dept = post.department;
      const targets = await getNotificationTargets(dept);
      
      const notificationsData = targets
        .filter(t => t.nik !== post.authorNik && t.nik)
        .map(t => ({
          userId: t.nik,
          title: `New Bulletin (${dept})`,
          message: `${post.authorName || 'Someone'} posted a new topic.`,
          type: 'info',
          link: ''
        }));
        
      if (notificationsData.length > 0) {
        await db.insert(notifications).values(notificationsData);
      }
      
      res.json({ status: "success", data: post });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  

  app.get("/api/bulletin/:id/comments", async (req, res) => {
    try {
      const data = await db.select({
        id: bulletinComments.id,
        postId: bulletinComments.postId,
        authorNik: bulletinComments.authorNik,
        authorName: bulletinComments.authorName,
        content: bulletinComments.content,
        fileUrl: bulletinComments.fileUrl,
        fileName: bulletinComments.fileName,
        createdAt: bulletinComments.createdAt,
        authorAvatar: employees.avatar,
      })
      .from(bulletinComments)
      .leftJoin(employees, eq(bulletinComments.authorNik, employees.nik))
      .where(eq(bulletinComments.postId, parseInt(req.params.id)))
      .orderBy(bulletinComments.createdAt);

      res.json({ status: "success", data });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.post("/api/bulletin/:id/comments", async (req, res) => {
    try {
      const result = await db.insert(bulletinComments).values({ ...req.body, postId: parseInt(req.params.id) }).returning();
      const comment = result[0];
      
      const postArray = await db.select().from(bulletinPosts).where(eq(bulletinPosts.id, comment.postId)).limit(1);
      if (postArray.length > 0) {
        const post = postArray[0];
        const dept = post.department;
        
        const targets = await getNotificationTargets(dept);
        
        const notificationsData = targets
          .filter(t => t.nik !== comment.authorNik && t.nik)
          .map(t => ({
            userId: t.nik,
            title: `New Comment (${dept})`,
            message: `${comment.authorName || 'Someone'} commented on a topic.`,
            type: 'info',
            link: ''
          }));
          
        if (notificationsData.length > 0) {
          await db.insert(notifications).values(notificationsData);
        }
      }
      
      res.json({ status: "success", data: comment });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });


  app.delete("/api/bulletin/comments/:commentId", async (req, res) => {
    try {
      const { deleterNik, deleterName } = req.query;
      const commentId = parseInt(req.params.commentId);
      
      const commentArray = await db.select().from(bulletinComments).where(eq(bulletinComments.id, commentId)).limit(1);
      if (commentArray.length === 0) {
        return res.status(404).json({status: "error", message: "Comment not found"});
      }
      const comment = commentArray[0];
      
      const postArray = await db.select().from(bulletinPosts).where(eq(bulletinPosts.id, comment.postId)).limit(1);
      if (postArray.length > 0) {
        const post = postArray[0];
        const dept = post.department;
        const targets = await getNotificationTargets(dept);
        
        const notificationsData = targets
          .filter(t => t.nik !== deleterNik && t.nik)
          .map(t => ({
            userId: t.nik,
            title: `Update Dihapus (${dept})`,
            message: `${deleterName || 'Seseorang'} menghapus update di topik "${post.category || 'Topic'}"`,
            type: 'warning',
            link: ''
          }));
          
        if (notificationsData.length > 0) {
          await db.insert(notifications).values(notificationsData);
        }
      }
      
      await db.delete(bulletinComments).where(eq(bulletinComments.id, commentId));
      
      res.json({ status: "success" });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.put("/api/bulletin/:id", async (req, res) => {
    try {
      const result = await db.update(bulletinPosts).set(req.body).where(eq(bulletinPosts.id, parseInt(req.params.id))).returning();
      const post = result[0];
      if (post) {
        await syncBulletinToAgenda(post);
      }
      res.json({ status: "success", data: post });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.delete("/api/bulletin/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(agendaEvents).where(eq(agendaEvents.bulletinPostId, id));
      await db.delete(bulletinPosts).where(eq(bulletinPosts.id, id));
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  
  // 1. Health check endpoint
  
  // --- AUTH ENDPOINTS ---
  
  app.post("/api/auth/check-nik", async (req, res) => {
    try {
      const { nik } = req.body;
      const employee = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
      if (employee.length === 0) {
        return res.json({ status: "error", message: "NIK tidak ditemukan" });
      }
      return res.json({ status: "success", firstLoginComplete: employee[0].firstLoginComplete, employee: employee[0] });
    } catch(e) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { nik, password } = req.body;
      const employee = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
      if (employee.length === 0) {
        return res.json({ status: "error", message: "NIK tidak ditemukan" });
      }
      
      const user = employee[0];
      
      if (!user.firstLoginComplete) {
        return res.json({ status: "success", requireSetup: true, employee: user });
      }
      
      const isValid = await bcrypt.compare(password, user.passwordHash || "");
      if (!isValid) {
        return res.status(401).json({ status: "error", message: "Password salah" });
      }
      
      return res.json({ status: "success", requireSetup: false, employee: user });
    } catch(e) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  app.post("/api/auth/setup", async (req, res) => {
    try {
      const { nik, password, email, tanggalLahir } = req.body;
      const hash = await bcrypt.hash(password, 10);
      
      const updateData: any = { passwordHash: hash, email: email, firstLoginComplete: true };
      if (tanggalLahir) {
        updateData.tanggalLahir = tanggalLahir;
      }
      
      const result = await db.update(employees)
        .set(updateData)
        .where(eq(employees.nik, nik))
        .returning();
        
      if(result.length === 0) return res.json({ status: "error", message: "NIK tidak ditemukan" });
      
      return res.json({ status: "success", employee: result[0] });
    } catch(e) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { nik, email, newPassword, adminReset } = req.body;
      
      if (adminReset) {
         // Admin reset
         const hash = await bcrypt.hash(newPassword, 10);
         const result = await db.update(employees).set({ passwordHash: hash }).where(eq(employees.nik, nik)).returning();
         if(result.length === 0) return res.json({ status: "error", message: "NIK tidak ditemukan" });
         return res.json({ status: "success", message: "Password berhasil di-reset oleh Admin" });
      }
      
      
      // Manual reset for user
      const employee = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
      if(employee.length === 0) return res.json({ status: "error", message: "NIK tidak ditemukan" });
      if(employee[0].email !== email) return res.status(400).json({ status: "error", message: "Email tidak cocok dengan data kami" });
      
      const newTempPass = Math.floor(100000 + Math.random() * 900000).toString();
      const hash = await bcrypt.hash(newTempPass, 10);
      await db.update(employees).set({ passwordHash: hash }).where(eq(employees.nik, nik));
      
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || "smtp.gmail.com",
          port: parseInt(process.env.SMTP_PORT || "587"),
          secure: (process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465"),
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"Admin Portal" <prep.lab.tbp@gmail.com>',
          to: email,
          subject: "Reset Password - P2H App",
          text: `Halo ${employee[0].name},\n\nPassword akun P2H Anda telah direset. Password sementara Anda adalah: ${newTempPass}\n\nSilakan login menggunakan password ini dan segera ubah password Anda di menu Pengaturan.\n\nTerima kasih.`,
          html: `<p>Halo <b>${employee[0].name}</b>,</p><p>Password akun P2H Anda telah direset. Password sementara Anda adalah: <b>${newTempPass}</b></p><p>Silakan login menggunakan password ini dan segera ubah password Anda di menu Pengaturan.</p><br><p>Terima kasih.</p>`,
        });

        return res.json({ status: "success", message: "Password sementara telah dikirim ke email Anda." });
      } catch (emailError) {
        console.error("Gagal mengirim email:", emailError);
        return res.status(500).json({ status: "error", message: "Gagal mengirim email. Pastikan konfigurasi SMTP di server sudah benar." });
      }

    } catch(e) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });


  // --- Notifications API ---
  app.get("/api/notifications", async (req, res) => {
    try {
      const { userId } = req.query;
      let data = [];
      
      if (userId) {
        // Quick check if the user is an admin
        let isAdmin = userId === '02D25000055' || userId === 'preplabadmin' || (typeof userId === 'string' && userId.toLowerCase().includes('admin'));
        let isAdministration = false;
        
        const emp = await db.select().from(employees).where(eq(employees.nik, userId as string)).limit(1);
        if (emp.length > 0) {
          const dept = (emp[0].department || '').toLowerCase();
          const sect = (emp[0].section || '').toLowerCase();
          const jab = (emp[0].jabatan || '').toLowerCase();
          
          if (dept.includes('admin') || sect.includes('admin') || jab.includes('admin')) {
             isAdmin = true;
          }
          if (dept.includes('administration') || sect.includes('administration')) {
             isAdministration = true;
          }
        }
        
        let conditions = [eq(notifications.userId, userId as string)];
        if (isAdmin) conditions.push(eq(notifications.role, 'admin'));
        if (isAdministration) conditions.push(eq(notifications.role, 'Administration'));

        data = await db.select().from(notifications)
             .where(or(...conditions))
             .orderBy(desc(notifications.createdAt));
             
      } else {
        data = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
      }
      
      res.json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const result = await db.insert(notifications).values(req.body).returning();
      res.json(result[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  app.put("/api/notifications/read-all", async (req, res) => {
    try {
      const { userId } = req.query;
      if (userId) {
        await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId as string));
      } else {
        await db.update(notifications).set({ isRead: true });
      }
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to mark all as read" });
    }
  });
  app.get("/api/health", (req, res) => {    res.json({ status: "ok", message: "Server is running!" });
  });

  // --- App Settings ---
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await db.select().from(appSettings);
      res.json(settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
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

  // 2. Karyawan (Employees)
  app.get("/api/employees", async (req, res) => {
    try {
      const data = await db.select().from(employees);
      res.json(data);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:nik", async (req, res) => {
    try {
      const { nik } = req.params;
      const data = await db.select().from(employees).where(eq(employees.nik, nik)).limit(1);
      if (data.length > 0) {
        res.json({ status: "success", employee: data[0] });
      } else {
        res.status(404).json({ status: "error", message: "Karyawan tidak ditemukan" });
      }
    } catch (error) {
      console.error("Error fetching employee:", error);
      res.status(500).json({ status: "error", message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const result = await db.insert(employees).values(req.body).returning();
      res.status(201).json(result[0]);
    } catch (error) {
      console.error("Error creating employee:", error);
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  app.post("/api/employees/avatar", async (req, res) => {
    try {
      const { nik, avatar } = req.body;
      if (!nik) {
        return res.status(400).json({ status: "error", message: "NIK required" });
      }
      const result = await db.update(employees)
        .set({ avatar: avatar || null })
        .where(eq(employees.nik, nik))
        .returning();

      return res.json({ status: "success", employee: result[0] || null });
    } catch (error) {
      console.error("Error updating avatar:", error);
      res.status(500).json({ status: "error", message: "Failed to update avatar" });
    }
  });

  // 3. Alat / Unit (Equipments)
  app.get("/api/equipments", async (req, res) => {
    try {
      const data = await db.select().from(equipments);
      res.json(data);
    } catch (error) {
      console.error("Error fetching equipments:", error);
      res.status(500).json({ error: "Failed to fetch equipments" });
    }
  });

  // 4. Work Orders (WO)
  app.get("/api/work-orders", async (req, res) => {
    try {
      const data = await db.select().from(workOrders);
      res.json(data);
    } catch (error) {
      console.error("Error fetching work orders:", error);
      res.status(500).json({ error: "Failed to fetch work orders" });
    }
  });

  app.post("/api/work-orders", async (req, res) => {
    try {
      const newWO = req.body;
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
          
          waMessageText = `==== LAPORAN KERUSAKAN ====\n` +
          `- *Tipe: ${(createdWO.category || 'N/A').toUpperCase()}*\n\n` +
          `- *Pelapor*\n` +
          `Nama   : ${createdWO.requestorName}\n` +
          `Jabatan: ${jabatanUser}\n\n` +
          `- *Detail Barang*\n` +
          `Item     : ${createdWO.equipmentName}\n` +
          `No. Alat : ${createdWO.equipmentCode || '-'}\n` +
          `No. Asset: ${'-'}\n\n` +
          `- *Lokasi*\n` +
          `Posisi : ${createdWO.location || '-'}\n` +
          `Ruangan: ${createdWO.location || '-'}\n\n` +
          `- *Detail Kerusakan*\n` +
          `${createdWO.issueDescription}\n\n` +
          `- *Dokumen Kerusakan*\n` +
          `${pdfRes.pdfUrl}`;
        }
      } catch (pdfErr: any) {
        console.error(`Gagal generate PDF WO for ${createdWO.woId}:`, pdfErr.message);
      }
      
      res.status(201).json({ ...createdWO, pdfUrl, waMessageText });
    } catch (error) {
      console.error("Error creating work order:", error);
      res.status(500).json({ error: "Failed to create work order" });
    }
  });

  app.put("/api/work-orders/:woId", async (req, res) => {
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
         
         waMessageText = `==== WORK ORDER SELESAI [${wo.woId}] ====\n\n` +
         `*Nama Alat:* ${wo.equipmentName || '-'}\n` +
         `*Kode/No Alat:* ${wo.equipmentCode || '-'}\n` +
         `*Lokasi:* ${wo.location || '-'}\n\n` +
         `*PIC Eksekusi:* ${wo.technicianPic || '-'}\n\n` +
         `*Kendala/Kerusakan:*\n${wo.issueDescription || '-'}\n\n` +
         `*Tindakan Perbaikan:*\n${wo.actionTaken || '-'}\n\n` +
         `*Sparepart Digunakan:*\n${sparepartStr}\n\n` +
         `*Selesai Perbaikan:* ${endStr}\n` +
         `*Total Downtime:* ${downtimeText}\n\n` +
         `*Link Foto Penyelesaian:*\n${wo.closingPhoto || '-'}`;
      }
      res.json({ ...result[0], waMessageText });
    } catch (error) {
      console.error("Error updating work order:", error);
      res.status(500).json({ error: "Failed to update work order" });
    }
  });

  // 5. Tickets
  app.get("/api/tickets", async (req, res) => {
    try {
      const dbData = await db.select().from(tickets);
      res.json(dbData);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch tickets" });
    }
  });

  app.get("/api/gallery", async (req, res) => {
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
  
  app.post("/api/tickets", async (req, res) => {
    try {
      const newTicket = req.body;
      if (!newTicket.ticketId) {
        newTicket.ticketId = `RWO-${Date.now()}`;
        newTicket.source = 'internal';
      }
      const result = await db.insert(tickets).values(newTicket).returning();
      const ticket = result[0];
      const tglStr = ticket.date ? new Date(ticket.date).toLocaleDateString('id-ID') : new Date().toLocaleDateString('id-ID');
      
      const waMessageText = `==== WO PERMINTAAN BARU ====\n` +
      `- *Ticket ID: ${ticket.ticketId}*\n\n` +
      `- *Pemohon*\n` +
      `Nama   : ${ticket.requestorName}\n` +
      `Jabatan: ${'-'}\n\n` +
      `📌 *Detail Request*\n` +
      `Tipe   : ${ticket.category || '-'}\n` +
      `Prioritas : ${ticket.priority || '-'}\n` +
      `Target : ${ticket.targetDate || '-'}\n` +
      `Lokasi : ${ticket.location || '-'}\n\n` +
      `- *Deskripsi*\n` +
      `${ticket.description || '-'}\n\n` +
      `- *Lampiran*\n` +
      `${ticket.photoUrl || '-'}`;
      
      res.status(201).json({ ...ticket, waMessageText });
    } catch (error) {
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  app.put("/api/tickets/:id", async (req, res) => {
    try {
      const updateData = req.body;
      if (updateData.completionDate) updateData.completionDate = new Date(updateData.completionDate);
      if (updateData.date) updateData.date = new Date(updateData.date);
      
      const result = await db.update(tickets).set(updateData).where(eq(tickets.ticketId, req.params.id)).returning();
      const ticket = result[0];
      let waMessageText = '';
      if (ticket && req.body.status === 'Closed') {
         const sparepartStr = ticket.sparepartName ? `${ticket.sparepartName} (Qty: ${ticket.sparepartQty || 1})` : '-';
         const dateOpts: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Jayapura', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
         const endStr = ticket.completionDate ? new Date(ticket.completionDate).toLocaleString('id-ID', dateOpts) + ' WIT' : '-';
         
         waMessageText = `==== PERMINTAAN SELESAI [${ticket.ticketId}] ====\n\n` +
         `*PIC Eksekusi:* ${ticket.pic || '-'}\n\n` +
         `*Deskripsi Request:*\n${ticket.description || '-'}\n\n` +
         `*Tindakan Perbaikan:*\n${ticket.actionTaken || '-'}\n\n` +
         `*Sparepart Digunakan:*\n${sparepartStr}\n\n` +
         `*Selesai Perbaikan:* ${endStr}\n\n` +
         `*Link Foto Penyelesaian:*\n${ticket.closingPhoto || '-'}`;
      }
      res.json({ ...(ticket || {}), waMessageText });
    } catch (error) {
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

  // 6. Spareparts
  app.get("/api/spareparts", async (req, res) => {
    try {
      const data = await db.select().from(spareparts);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch spareparts" });
    }
  });


  app.post("/api/spareparts/import", async (req, res) => {
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

  // 7. Generic catch-all endpoints for demo/migration completeness
  app.post("/api/upload", async (req, res) => {
    try {
      const { base64Data, mimeType, filename, folderName } = req.body;
      
      const folderId = '1JJZKj7X1vsNNP5dTWDYJ_-0xYVhU0Bu7'; // Shared Drive folder id

      let finalFolderId = folderId;
      if (folderName === 'Work Orders' || folderName === 'Internal Tickets') {
         finalFolderId = '1V_qxWLDAwcdV6O8Eg723fqMcZSeRIzoe'; // Folder Dokumentasi
      }
      else if (folderName) {
         try {
           const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${folderId}' in parents and trashed=false`;
           const searchRes = await drive.files.list({ q: query, fields: 'files(id, name)', supportsAllDrives: true, includeItemsFromAllDrives: true });
           if (searchRes.data.files && searchRes.data.files.length > 0) {
             finalFolderId = searchRes.data.files[0].id;
           } else {
             const folderMetadata = { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [folderId] };
             const createRes = await drive.files.create({ requestBody: folderMetadata, fields: 'id', supportsAllDrives: true });
             finalFolderId = createRes.data.id;
           }
         } catch(e) {
           console.error("Gagal create folder, pakai folder default", e);
         }
      }
      // 3. Konversi base64 ke stream
      const base64Clean = base64Data.replace(/^data:.*?;base64,/, "");
      const buffer = Buffer.from(base64Clean, 'base64');
      const { Readable } = await import('stream');
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null);

      // 4. Upload ke Drive
      const fileMetadata = {
        name: filename || 'uploaded_file',
        parents: [finalFolderId]
      };
      const media = {
        mimeType: mimeType || 'application/octet-stream',
        body: stream
      };
      
      try {
        const response = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id, webViewLink, webContentLink',
          supportsAllDrives: true // Wajib untuk Shared Drives
        });

        const fileId = response.data.id;

        // 5. Ubah permission file agar bisa diakses publik (Anyone with the link can view)
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
          supportsAllDrives: true
        });

        // Direct link format for image tags
        const directUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
        
        res.json({ url: directUrl, fileId: fileId });
      } catch (driveErr) {
        console.error('Drive upload error, falling back to db:', driveErr.message);
        const result = await db.insert(uploadedFiles).values({
          filename: filename || 'file',
          mimeType: mimeType || 'application/octet-stream',
          base64Data: base64Data
        }).returning();
        return res.json({ url: `/api/files/${result[0].id}` });
      }
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Failed to upload', details: err.message, stack: err.stack });
    }
  });

  app.get("/api/files/:id", async (req, res) => {
    try {
      const file = await db.select().from(uploadedFiles).where(eq(uploadedFiles.id, parseInt(req.params.id))).limit(1);
      if (file.length === 0) return res.status(404).send('Not found');
      
      const f = file[0];
      const buffer = Buffer.from(f.base64Data, 'base64');
      res.setHeader('Content-Type', f.mimeType);
      res.send(buffer);
    } catch (err) {
      console.error(err);
      res.status(500).send('Error retrieving file');
    }
  });

  app.post("/api/inspections/universal", async (req, res) => {
    try {
      const { finalData, ttd1, ttd2, ttd3, fotoTemuanArray, fotoProses } = req.body;
      
      let pdfUrl = null;
      let linkPdf2 = null;
      
      // Load GAS URL from settings
      const settingsObj: any = {};
      const allSettings = await db.select().from(appSettings);
      allSettings.forEach((s: any) => { settingsObj[s.settingKey] = s.settingValue || ''; });
      
      const gasUrl = settingsObj['GAS_WEB_APP_URL'] || process.env.GAS_WEB_APP_URL;
      
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
              console.log("GAS Response:", gasText.substring(0, 200));
              try {
                  const gasData = JSON.parse(gasText);
                  if (gasData.success && gasData.data) {
                     // Check if GAS returned a JSON string or object
                     let parsedData = gasData.data;
                     if (typeof parsedData === 'string' && parsedData.startsWith('{')) {
                        parsedData = JSON.parse(parsedData);
                     }
                     if (parsedData.pdfUrl && parsedData.pdfUrl !== '-') pdfUrl = parsedData.pdfUrl;
                     else if (parsedData.logDetails) {
                        // Some default response format handling
                        pdfUrl = "GAS_GENERATED";
                     }
                  }
              } catch(e) {
                 console.error("Error parsing GAS response", e);
              }
              
          } catch(e) {
              console.error("Failed forwarding to GAS:", e);
          }
      }

      // Save to Postgres
      const result = await db.insert(inspections as any).values({
        type: 'Mingguan',
        location: finalData?.lokasiUmum || 'Area',
        notes: finalData?.catatanUmum || '',
        dataF: JSON.stringify(finalData),
        pdfUrl: pdfUrl
      }).returning();
      
      
      let waMessageText = `*==== LAPORAN INSPEKSI MINGGUAN ====*

`;
      waMessageText += `*Formulir*: ${finalData.judulForm || 'Inspeksi Mingguan'}
`;
      waMessageText += `*Lokasi/Sub-Area*: ${finalData.lokasiUmum || '-'}
`;
      waMessageText += `*Inspector Utama*: ${finalData.insp1 || '-'}
`;
      if (finalData.insp2) waMessageText += `*Inspector Pendamping 1*: ${finalData.insp2}
`;
      if (finalData.insp3) waMessageText += `*Inspector Pendamping 2*: ${finalData.insp3}
`;
      
      if (finalData.catatanUmum) {
          waMessageText += `
*Catatan Keseluruhan*:
${finalData.catatanUmum}
`;
      }

      if (finalData.temuanUmum && finalData.temuanUmum.length > 0) {
          waMessageText += `
*DAFTAR TEMUAN:*
`;
          finalData.temuanUmum.forEach((t: any, i: number) => {
              waMessageText += `${i + 1}. ${t.pertanyaan || t.temuan || 'Temuan'}
`;
              if (t.keterangan) waMessageText += `   - Ket: ${t.keterangan}
`;
              if (t.tindakLanjut) waMessageText += `   - Tindakan: ${t.tindakLanjut}
`;
          });
      } else {
          waMessageText += `
*DAFTAR TEMUAN*: Nihil
`;
      }

      if (pdfUrl && pdfUrl !== 'GAS_GENERATED' && pdfUrl !== '-') {
          waMessageText += `
*Dokumen Laporan*:
${pdfUrl}
`;
      } else {
          waMessageText += `
*Dokumen Laporan*:
(Tautan PDF akan dikirim menyusul / diproses sistem)
`;
      }
      
      res.json({ success: true, message: 'Inspeksi universal tersimpan', data: result[0], pdfUrl, waMessageText });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to save universal inspection" });
    }
  });

  app.post("/api/inspections", async (req, res) => {
    try {
      const { dataF, ttd1, ttd2, ttd3, fotoProses, devOptions } = req.body;
      
      let pdfUrl = null;
      let judulForm = "Inspeksi Mingguan";
      
      if (dataF && dataF.length > 0 && dataF[0].length > 0) {
         judulForm = dataF[0][0] || "Inspeksi Mingguan";
      }

      // Load GAS URL from settings
      const settingsObj: any = {};
      const allSettings = await db.select().from(appSettings);
      allSettings.forEach((s: any) => { settingsObj[s.settingKey] = s.settingValue || ''; });
      
      const gasUrl = settingsObj['GAS_WEB_APP_URL'] || process.env.GAS_WEB_APP_URL;
      
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
                     if (parsedData.pdfUrl && parsedData.pdfUrl !== '-') pdfUrl = parsedData.pdfUrl;
                     else if (parsedData.logDetails) {
                        pdfUrl = "GAS_GENERATED";
                     }
                  }
              } catch(e) {}
              
          } catch(e) {
              console.error("Failed forwarding APD to GAS:", e);
          }
      }

      const result = await db.insert(inspections as any).values({
          type: 'Mingguan',
          dataF: JSON.stringify(dataF),
          pdfUrl: pdfUrl
      }).returning();
      
      let waMessageText = `*==== LAPORAN KEPATUHAN APD ====*

`;
      if (dataF && dataF.length > 0) {
          const firstRow = dataF[0];
          const jam = firstRow[0] || '-';
          const tgl = firstRow[1] || '-';
          const area = firstRow[2] || '-';
          const waktuKerja = firstRow[3] || '-';
          const insp = firstRow[16] || '-';

          waMessageText += `*Tanggal*: ${tgl}
`;
          waMessageText += `*Jam*: ${jam}
`;
          waMessageText += `*Area*: ${area}
`;
          waMessageText += `*Waktu Kerja*: ${waktuKerja}
`;
          waMessageText += `*Inspector*: ${insp}

`;

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

          waMessageText += `*Ringkasan Kepatuhan*:
`;
          waMessageText += `- Total Personil: ${dataF.length}
`;
          waMessageText += `- Hadir (Lengkap): ${hadir - tidakLengkap}
`;
          waMessageText += `- Hadir (Tidak Lengkap): ${tidakLengkap}
`;
          waMessageText += `- Tidak Hadir (Cuti/Off dll): ${absen}
`;

          if (tidakLengkap > 0) {
              waMessageText += `
*Personil Tidak Lengkap APD*:
`;
              dataF.filter((r: any) => r[8] === 'Hadir' && [r[9], r[10], r[11], r[12], r[13], r[14]].includes('❌')).forEach((r: any, idx: number) => {
                  waMessageText += `${idx + 1}. ${r[6]} - Ket: ${r[15]}
`;
              });
          }
      }

      if (pdfUrl && pdfUrl !== 'GAS_GENERATED' && pdfUrl !== '-') {
          waMessageText += `
*Dokumen Laporan*:
${pdfUrl}
`;
      } else {
          waMessageText += `
*Dokumen Laporan*:
(Tautan PDF akan dikirim menyusul / diproses sistem)
`;
      }

      res.status(201).json({ ...result[0], pdfUrl, waMessageText });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: "Failed to save inspection" });
    }
  });

  
  app.post("/api/pdf/generate", async (req, res) => {
    try {
      const { tglMulai, tglAkhir, tipeLaporan } = req.body;
      let data = await db.select().from(pemantauan);
      
      // Filter by date
      if (tglMulai && tglAkhir) {
        const start = new Date(tglMulai);
        const end = new Date(tglAkhir);
        end.setHours(23, 59, 59, 999);
        data = data.filter(d => {
          const dDate = new Date(d.tanggal || d.date);
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
        const loc = row.lokasi || '-';
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
             const dt = new Date(d.tanggal || d.date);
             const m = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
             return dt.getDate() + "-" + m[dt.getMonth()] + "-" + dt.getFullYear().toString().substring(2);
           }).join("\n");
           
           replacements['<<Shift>>'] = rows.map(d => d.shift || "-").join("\n");
           replacements['<<Petugas>>'] = rows.map(d => d.inspectorName || "-").join("\n");
           
           replacements['<<Jam>>'] = rows.map(d => {
             const dt = new Date(d.tanggal || d.date);
             return dt.getHours().toString().padStart(2, '0') + ":" + dt.getMinutes().toString().padStart(2, '0');
           }).join("\n");
           
           replacements['<<Suhu>>'] = rows.map(d => d.suhu || "-").join("\n");
           replacements['<<Kelembapan>>'] = rows.map(d => d.kelembapan ? (d.kelembapan + "") : "-").join("\n");
           replacements['<<TTD>>'] = rows.map(d => "").join("\n");
           
        } else {
           replacements['<<Instrument>>'] = instr;
           replacements['<<TipeGas>>'] = gasType;
           replacements['<<Bulan>>'] = bulanTeks;
           
           replacements['<<No>>'] = rows.map((_, i) => (i+1).toString()).join("\n\n");
           
           replacements['<<Date>>'] = rows.map(d => {
             const dt = new Date(d.tanggal || d.date);
             const m = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
             const dateStr = dt.getDate() + "-" + m[dt.getMonth()] + "-" + dt.getFullYear().toString().substring(2);
             const timeStr = dt.getHours().toString().padStart(2, '0') + ":" + dt.getMinutes().toString().padStart(2, '0');
             return dateStr + "\n" + timeStr;
           }).join("\n");
           
           replacements['<<Flow>>'] = rows.map(d => d.flow || "-").join("\n\n");
           replacements['<<Pressure>>'] = rows.map(d => d.tekananGas || "-").join("\n\n");
           replacements['<<Shift>>'] = rows.map(d => d.shift || "-").join("\n\n");
           replacements['<<PIC>>'] = rows.map(d => d.inspectorName || "-").join("\n\n");
           replacements['<<Remark>>'] = rows.map(d => d.notes || "-").join("\n\n");
           replacements['<<TTD>>'] = rows.map(d => "").join("\n\n");
           
           replacements['<<Y>>'] = rows.map(d => (d.kebocoran === "Y" || d.kebocoran === "Ya") ? "V" : "-").join("\n\n");
           replacements['<<N>>'] = rows.map(d => (d.kebocoran === "N" || d.kebocoran === "Tidak") ? "V" : "-").join("\n\n");
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

  
  app.post("/api/pemantauan/migrate", async (req, res) => {
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
          date: dateObj,
          tanggal: dateObj,
          inspectorName: inspector,
          shift: shift,
          lokasi: lokasi,
          kategori: kategori,
          suhu: suhu,
          kelembapan: kelembapan,
          flow: flow,
          tekananGas: tekananGas,
          kebocoran: kebocoran,
          notes: notes,
          photoUrl: photoUrl && photoUrl.startsWith('http') ? photoUrl : null
        });
        count++;
      }
      
      res.json({ success: true, migrated: count });
    } catch (error) {
      console.error("Error migrating pemantauan:", error);
      res.status(500).json({ error: "Failed to migrate" });
    }
  });

  app.get("/api/pemantauan", async (req, res) => {
    try {
      const data = await db.select().from(pemantauan);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pemantauan" });
    }
  });

    app.post("/api/pemantauan", async (req, res) => {
    try {
      const payload = req.body;
      const rowsToInsert = payload.items.map((item) => ({
        inspectorName: payload.inspektor,
        shift: payload.shift,
        notes: payload.catatan,
        photoUrl: payload.foto,
        lokasi: item.lokasi,
        kategori: item.kategori,
        suhu: item.suhu,
        kelembapan: item.kelembapan,
        flow: item.flow,
        tekananGas: item.tekananGas,
        kebocoran: item.kebocoran
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

  app.get("/api/downtime", async (req, res) => {
    try {
      const data = await db.select().from(downtime);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch downtime" });
    }
  });

  app.put("/api/downtime/:id", async (req, res) => {
    try {
      const result = await db.update(downtime).set(req.body).where(eq(downtime.id, parseInt(req.params.id))).returning();
      res.json(result[0] || {});
    } catch (error) {
      res.status(500).json({ error: "Failed to update downtime" });
    }
  });

  app.get("/api/apd/settings", async (req, res) => {
    const data = await db.select().from(apdSettings);
    res.json(data);
  });
  app.post("/api/apd/settings", async (req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/api/apd/history", async (req, res) => {
    const data = await db.select().from(apdHistory);
    res.json(data);
  });
  app.post("/api/apd/history", async (req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/api/apd/documents", async (req, res) => {
    const data = await db.select().from(apdDocuments);
    res.json(data);
  });
  app.post("/api/apd/documents", async (req, res) => {
    res.json({ status: "ok" });
  });
  
      app.get("/api/roster", async (req, res) => {
    try {
      const allEmps = await db.select().from(employees);
      const allRoster = await db.select().from(roster);
      
      const rosterByNik = {};
      for (const r of allRoster) {
        if (!rosterByNik[r.nik]) rosterByNik[r.nik] = {};
        rosterByNik[r.nik][r.date] = r.status;
      }
      
      const todayDate = new Date();
      todayDate.setHours(0,0,0,0);
      
      const result = allEmps.map(emp => {
        const sched = rosterByNik[emp.nik] || {};
        
        let lastTrvDate = null;
        const sortedDates = Object.keys(sched).sort((a,b) => new Date(b).getTime() - new Date(a).getTime());
        for (const date of sortedDates) {
          if (new Date(date) <= todayDate && (sched[date] === 'TRV' || sched[date] === 'C')) {
            lastTrvDate = date;
            break;
          }
        }
        
        // Generate next 7 days schedule
        const next7Days = [];
        const iterDate = new Date();
        for (let i = 0; i < 7; i++) {
          const dStr = iterDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }); // e.g. "18 Jul 26" format depends, but our csv has "1 Jan 26"
          
          // Let's use a function to format matching CSV date format: D MMM YY
          const parts = iterDate.toDateString().split(' '); // Thu Jul 18 2026 -> ["Thu", "Jul", "18", "2026"]
          const day = parseInt(parts[2], 10);
          const formattedDate = day + ' ' + parts[1] + ' ' + parts[3].substring(2); // "18 Jul 26"
          
          const shiftCode = sched[formattedDate] || '-';
          next7Days.push({
            day: parts[0],
            date: formattedDate,
            shiftCode: shiftCode
          });
          iterDate.setDate(iterDate.getDate() + 1);
        }
        
        return {
          nik: emp.nik,
          name: emp.name,
          jabatan: emp.jabatan,
          department: emp.department || emp.section,
          section: emp.section,
          gol: emp.gol,
          jobGrade: emp.jobGrade,
          shift: emp.shift,
          poh: emp.poh,
          pt: emp.pt,
          statusMess: emp.statusMess,
          rotation: emp.rotation,
          joinDate: emp.tanggalAwalBergabung,
          permanentDate: emp.tanggalBergabungTerbaru,
          statusKontrak: emp.statusKontrak,
          lastTrvDate: lastTrvDate,
          schedule: next7Days,
          fullSchedule: sched
        };
      });
      
      res.json(result);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch roster" });
    }
  });

  app.get("/api/questions", async (req, res) => {
    const data = await db.select().from(questions);
    res.json(data);
  });

  
  // --- ADMIN API ROUTES ---
  app.get("/api/admin/tables", async (req, res) => {
    try {
      res.json(["employees", "equipments", "workOrders", "tickets", "downtime", "spareparts", "apdSettings", "apdHistory", "apdDocuments", "roster", "inspections", "pemantauan", "questions", "agendaEvents", "privateNotes", "userThemes", "pelanggaran"]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

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
      default: return null;
    }
  };

  app.get("/api/admin/tables/:name", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      const data = await db.select().from(t).limit(500);
      res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/tables/:name", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      
      const payload = sanitizePayload(t, req.body);
      
      const result = await db.insert(t as any).values(payload).returning();
      res.json(result[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/tables/:name/bulk", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      
      const payloadArray = req.body;
      if (!Array.isArray(payloadArray)) {
         return res.status(400).json({error: "Expected an array of objects"});
      }

      const results = [];
      for(const row of payloadArray) {
         try {
           const cleanedRow = sanitizePayload(t, row);
           await db.insert(t as any).values(cleanedRow);
           results.push({success: true});
         } catch(e: any) {
           console.error("Bulk insert row error:", e);
           results.push({success: false, error: e.message});
         }
      }
      res.json({ success: true, count: results.filter(r => r.success).length, errors: results.filter(r => !r.success) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
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

  app.put("/api/admin/tables/:name/:id", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      
      let idValue: any = req.params.id;
      if (t.id.dataType === 'number') {
         idValue = parseInt(idValue);
      }
      
      const payload = sanitizePayload(t, req.body);
      
      const result = await db.update(t as any).set(payload).where(eq((t as any).id, idValue)).returning();
      res.json(result[0] || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/tables/:name/:id", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      await db.delete(t).where(eq(t.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/tables/:name", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      await db.delete(t);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  

    app.post("/api/admin/sync-roster", async (req, res) => {
    try {
      await syncRosterData();
      res.json({ message: "Sync berhasil" });
    } catch (e) {
      res.status(500).json({ error: "Gagal sync" });
    }
  });

  // --- AGENDA ROUTES ---
  app.get("/api/agenda", async (req, res) => {
    try {
      const data: any[] = await db.select().from(agendaEvents);
      
      const allEmps = await db.select().from(employees);
      const currentYear = new Date().getFullYear();
      
      allEmps.forEach(emp => {
        if (emp.tanggalLahir && emp.tanggalLahir !== '-') {
          const parts = emp.tanggalLahir.replace(/-/g, ' ').split(' ');
          let birthDate = null;
          if (parts.length >= 3) {
            const mmap = {Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11};
            let year = parseInt(parts[2]);
            if (year < 100) year += (year < 50 ? 2000 : 1900);
            birthDate = new Date(year, mmap[parts[1]] || 0, parseInt(parts[0]));
          } else {
             birthDate = new Date(emp.tanggalLahir);
          }
          
          if (birthDate && !isNaN(birthDate.getTime())) {
             const bdayThisYear = new Date(birthDate);
             bdayThisYear.setFullYear(currentYear);
             
             data.push({
               id: `bday-${emp.nik}-${currentYear}`,
               title: `🎂 Ulang Tahun ${emp.name}`,
               startDate: bdayThisYear,
               endDate: bdayThisYear,
               kategori: 'Private',
               pic: emp.name,
               deskripsi: `Hari Ulang Tahun ${emp.name} (${emp.jabatan || 'Karyawan'})`,
               department: emp.department || 'ALL', 
               isRoutine: false
             });
             
             const bdayNextYear = new Date(birthDate);
             bdayNextYear.setFullYear(currentYear + 1);
             data.push({
               id: `bday-${emp.nik}-${currentYear+1}`,
               title: `🎂 Ulang Tahun ${emp.name}`,
               startDate: bdayNextYear,
               endDate: bdayNextYear,
               kategori: 'Private',
               pic: emp.name,
               deskripsi: `Hari Ulang Tahun ${emp.name} (${emp.jabatan || 'Karyawan'})`,
               department: emp.department || 'ALL',
               isRoutine: false
             });
          }
        }
      });
      
      res.json({ status: "success", data });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });
  
  app.post("/api/agenda", async (req, res) => {
    try {
      const result = await db.insert(agendaEvents).values(req.body).returning();
      res.json({ status: "success", data: result[0] });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.put("/api/agenda/:id", async (req, res) => {
    try {
      const result = await db.update(agendaEvents).set(req.body).where(eq(agendaEvents.id, req.params.id)).returning();
      res.json({ status: "success", data: result[0] });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.delete("/api/agenda/:id", async (req, res) => {
    try {
      await db.delete(agendaEvents).where(eq(agendaEvents.id, req.params.id));
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.delete("/api/agenda/routine/:routineId", async (req, res) => {
    try {
      const { dateStr } = req.query; // to delete future
      // Just delete all matching for simplicity, or add logic to delete > date
      await db.delete(agendaEvents).where(eq(agendaEvents.routineId, req.params.routineId));
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // --- NOTES ROUTES ---
  app.get("/api/notes", async (req, res) => {
    try {
      const data = await db.select().from(privateNotes);
      res.json({ status: "success", data });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  app.post("/api/notes", async (req, res) => {
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

  app.delete("/api/notes/:id", async (req, res) => {
    try {
      await db.delete(privateNotes).where(eq(privateNotes.id, req.params.id));
      res.json({ status: "success" });
    } catch (error) {
      res.status(500).json({ status: "error", message: error.message });
    }
  });

  // --- THEMES ROUTES ---
  app.get("/api/themes/:nik", async (req, res) => {
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

  app.post("/api/meal-reports", async (req, res) => {
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
      await db.insert(notifications).values({
        title: "Pelaporan Status Makan Baru",
        message: `${req.body.name} (${req.body.status}) untuk tanggal ${req.body.reportDate} | Shift: ${req.body.shift}${mealsInfo}`,
        type: 'info',
        role: 'Administration',
        link: '/adm-dashboard'
      });

      res.status(201).json({ status: "success", data: result[0] });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: "error", message: "Failed to create meal report" });
    }
  });

  app.post("/api/themes", async (req, res) => {
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
      res.status(201).json(result[0]);
    } catch (error) {
      console.error("Error creating pelanggaran:", error);
      res.status(500).json({ error: "Failed to create pelanggaran" });
    }
  });


  // --- VITE MIDDLEWARE (Untuk Frontend) ---
  if (process.env.NODE_ENV !== "production") {
    // Mode Development: Vite yang akan melayani file frontend
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


  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server backend siap berjalan di http://localhost:${PORT}`);
  });
}

startServer();
