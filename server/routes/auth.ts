import { Router } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { eq } from "drizzle-orm";
import { db } from "../../src/db/index.js";
import { employees } from "../../src/db/schema.js";

export const authRouter = Router();

authRouter.post("/check-nik", async (req, res) => {
  try {
    const { nik, identifier } = req.body;
    const inputVal = (identifier || nik || "").trim();
    if (!inputVal) return res.json({ status: "error", message: "NIK atau Username tidak boleh kosong" });
    
    const normalized = inputVal.toUpperCase();
    const employeeList = await db.select().from(employees);
    let employee = employeeList.find(e => 
      e.nik.toUpperCase() === normalized || 
      (e.username && e.username.trim().toUpperCase() === normalized)
    );

    if (!employee && (normalized === 'DEMO123' || normalized === 'DEMO')) {
      const hash = await bcrypt.hash('112233', 10);
      try {
        const insertedList = await db.insert(employees).values({
          nik: 'DEMO123',
          username: 'demo',
          name: 'User Demo Staging',
          jabatan: 'Laboratory Supervisor',
          section: 'Preparation & Laboratory',
          pt: 'TBP',
          gol: 'II',
          jobGrade: '2.1',
          passwordHash: hash,
          firstLoginComplete: true
        }).returning();
        employee = insertedList[0];
      } catch (err) {
        console.error("Demo seed notice in check-nik:", err);
      }
    }
    
    if (!employee) {
      return res.json({ status: "error", message: `NIK / Username "${inputVal}" tidak ditemukan dalam database.` });
    }
    
    return res.json({ 
      status: "success", 
      firstLoginComplete: employee.nik === 'DEMO123' ? true : employee.firstLoginComplete, 
      employee: employee 
    });
  } catch(e: any) {
    res.status(500).json({ status: "error", message: "Database Error: " + e.message });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const { nik, identifier, password } = req.body;
    const inputVal = (identifier || nik || "").trim();
    if (!inputVal) return res.status(400).json({ status: "error", message: "NIK atau Username tidak boleh kosong" });

    const normalized = inputVal.toUpperCase();
    const employeeList = await db.select().from(employees);
    let user = employeeList.find(e => 
      e.nik.toUpperCase() === normalized || 
      (e.username && e.username.trim().toUpperCase() === normalized)
    );
    
    // Auto-create/seed Demo account if login with DEMO123 or demo
    if (!user && (normalized === 'DEMO123' || normalized === 'DEMO')) {
      const hash = await bcrypt.hash('112233', 10);
      try {
        const insertedList = await db.insert(employees).values({
          nik: 'DEMO123',
          username: 'demo',
          name: 'User Demo Staging',
          jabatan: 'Laboratory Supervisor',
          section: 'Preparation & Laboratory',
          pt: 'TBP',
          gol: 'II',
          jobGrade: '2.1',
          passwordHash: hash,
          firstLoginComplete: true
        }).returning();
        user = insertedList[0];
      } catch (err) {
        console.error("Demo seed notice:", err);
      }
    }

    if (!user) {
      return res.json({ status: "error", message: "NIK atau Username tidak ditemukan" });
    }
    
    if (!user.firstLoginComplete && user.nik !== 'DEMO123') {
      return res.json({ status: "success", requireSetup: true, employee: user });
    }
    
    // Special check for demo password or standard bcrypt
    const isValid = (user.nik === 'DEMO123' && password === '112233') || await bcrypt.compare(password, user.passwordHash || "");
    if (!isValid) {
      return res.status(401).json({ status: "error", message: "Password salah" });
    }
    
    return res.json({ status: "success", requireSetup: false, employee: user });
  } catch(e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

authRouter.post("/update-username", async (req, res) => {
  try {
    const { nik, username } = req.body;
    if (!nik || !username) {
      return res.status(400).json({ status: "error", message: "NIK dan Username harus diisi" });
    }
    const cleanUsername = username.trim();
    if (cleanUsername.length < 2 || cleanUsername.length > 30) {
      return res.status(400).json({ status: "error", message: "Username harus 2 - 30 karakter" });
    }
    
    // Allowed characters: alphanumeric, spaces, dot, underscore, dash
    if (!/^[a-zA-Z0-9_.\- ]+$/.test(cleanUsername)) {
      return res.status(400).json({ status: "error", message: "Username hanya boleh mengandung huruf, angka, spasi, titik, dash, dan underscore" });
    }

    const normalizedNik = nik.trim().toUpperCase();
    const employeeList = await db.select().from(employees);
    const targetUser = employeeList.find(e => e.nik.toUpperCase() === normalizedNik);
    if (!targetUser) {
      return res.status(404).json({ status: "error", message: "Data personil tidak ditemukan" });
    }

    // Check if username already used by someone else
    const isTaken = employeeList.some(e => 
      e.id !== targetUser.id && 
      e.username && 
      e.username.trim().toLowerCase() === cleanUsername.toLowerCase()
    );
    if (isTaken) {
      return res.status(400).json({ status: "error", message: `Username "${cleanUsername}" sudah digunakan personil lain. Silakan pilih username lain.` });
    }

    const updated = await db.update(employees)
      .set({ username: cleanUsername })
      .where(eq(employees.id, targetUser.id))
      .returning();

    return res.json({ 
      status: "success", 
      message: "Username berhasil disimpan!", 
      employee: updated[0] 
    });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

authRouter.post("/setup", async (req, res) => {
  try {
    const { nik, password, email, tanggalLahir } = req.body;
    const normalizedNik = nik.trim().toUpperCase();
    
    const employeeList = await db.select().from(employees);
    const user = employeeList.find(e => e.nik.toUpperCase() === normalizedNik);
    
    if (!user) {
      return res.json({ status: "error", message: "NIK tidak ditemukan" });
    }
    
    const hash = await bcrypt.hash(password, 10);
    
    const updateData: any = { passwordHash: hash, email: email, firstLoginComplete: true };
    if (tanggalLahir) {
      updateData.tanggalLahir = tanggalLahir;
    }
    
    const result = await db.update(employees)
      .set(updateData)
      .where(eq(employees.id, user.id))
      .returning();
      
    if(result.length === 0) return res.json({ status: "error", message: "Gagal menyimpan data setup" });
    
    return res.json({ status: "success", employee: result[0] });
  } catch(e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

authRouter.post("/reset-password", async (req, res) => {
  try {
    const { nik, email, newPassword, adminReset } = req.body;
    const normalizedNik = nik.trim().toUpperCase();
    
    if (adminReset) {
       const hash = await bcrypt.hash(newPassword, 10);
       const employeeList = await db.select().from(employees);
       const user = employeeList.find(e => e.nik.toUpperCase() === normalizedNik);
       if (!user) return res.json({ status: "error", message: "NIK tidak ditemukan" });
       await db.update(employees).set({ passwordHash: hash }).where(eq(employees.id, user.id));
       return res.json({ status: "success", message: "Password berhasil di-reset oleh Admin" });
    }
    
    const employeeList = await db.select().from(employees);
    const user = employeeList.find(e => e.nik.toUpperCase() === normalizedNik);
    
    if(!user) return res.json({ status: "error", message: "NIK tidak ditemukan" });
    if(user.email !== email) return res.status(400).json({ status: "error", message: "Email tidak cocok dengan data kami" });
    
    const newTempPass = Math.floor(100000 + Math.random() * 900000).toString();
    const hash = await bcrypt.hash(newTempPass, 10);
    await db.update(employees).set({ passwordHash: hash }).where(eq(employees.id, user.id));
    
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
        text: `Halo ${user.name},
Password akun P2H Anda telah direset. Password sementara Anda adalah: ${newTempPass}
Silakan login menggunakan password ini dan segera ubah password Anda di menu Pengaturan.
Terima kasih.`,
        html: `<p>Halo <b>${user.name}</b>,</p>
<p>Password akun P2H Anda telah direset. Password sementara Anda adalah: <b>${newTempPass}</b></p>
<p>Silakan login menggunakan password ini dan segera ubah password Anda di menu Pengaturan.</p>
<br>
<p>Terima kasih.</p>`,
      });
      return res.json({ status: "success", message: "Password sementara telah dikirim ke email Anda." });
    } catch (emailError) {
      console.error("Gagal mengirim email:", emailError);
      return res.status(500).json({ status: "error", message: "Gagal mengirim email. Pastikan konfigurasi SMTP di server sudah benar." });
    }
  } catch(e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});
