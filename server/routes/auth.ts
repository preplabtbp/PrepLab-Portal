import { Router } from "express";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { eq, or, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "../../src/db/index.js";
import { employees } from "../../src/db/schema.js";
import { 
  generateAuthToken, 
  toPublicEmployee, 
  checkIsAdminOrDeveloper, 
  requireAuth,
  JWT_SECRET
} from "../middleware/auth.js";
import { env } from "../config/env.js";

export const authRouter = Router();

// Demo user is regular user only (no admin/developer privileges)
const DEMO_USER = {
  id: 999999,
  nik: 'DEMO123',
  username: 'demo',
  name: 'User Demo Staging',
  jabatan: 'Operator Prep',
  jobGrade: '1.2',
  section: 'Preparation',
  department: 'Preparation & Laboratory',
  gol: 'I',
  pt: 'TBP',
  firstLoginComplete: true,
  isAdmin: false,
  isDeveloper: false
};

// Check NIK / Username (Sanitized: No password hash or full PII leaked)
authRouter.post("/check-nik", async (req, res) => {
  try {
    const { nik, identifier } = req.body;
    const inputVal = (identifier || nik || "").trim();
    if (!inputVal) return res.status(400).json({ status: "error", message: "NIK atau Username tidak boleh kosong" });
    
    const normalized = inputVal.toUpperCase();

    if (env.ENABLE_DEMO_USER && (normalized === 'DEMO123' || normalized === 'DEMO')) {
      return res.json({
        status: "success",
        found: true,
        firstLoginComplete: true,
        name: DEMO_USER.name,
        avatar: null
      });
    }

    const employeeMatches = await db.select().from(employees)
      .where(
        or(
          sql`UPPER(${employees.nik}) = ${normalized}`,
          sql`UPPER(COALESCE(${employees.username}, '')) = ${normalized}`
        )
      )
      .limit(1);

    const employee = employeeMatches[0];
    
    if (!employee) {
      return res.status(404).json({ status: "error", message: `NIK / Username "${inputVal}" tidak ditemukan dalam database.` });
    }
    
    // Return only safe minimal fields necessary for frontend greeting & login flow
    return res.json({ 
      status: "success", 
      found: true,
      firstLoginComplete: Boolean(employee.firstLoginComplete),
      name: employee.name,
      avatar: employee.avatar || null,
      username: employee.username || null
    });
  } catch(e: any) {
    console.error("Check NIK error:", e);
    res.status(500).json({ status: "error", message: "Terjadi kesalahan saat memeriksa identitas pengguna" });
  }
});

// Login Endpoint with JWT Token Issuance & HttpOnly Cookie
authRouter.post("/login", async (req, res) => {
  try {
    const { nik, identifier, password } = req.body;
    const inputVal = (identifier || nik || "").trim();
    if (!inputVal) return res.status(400).json({ status: "error", message: "NIK atau Username tidak boleh kosong" });
    if (!password) return res.status(400).json({ status: "error", message: "Password tidak boleh kosong" });

    const normalized = inputVal.toUpperCase();

    // Demo Account Handler (Only active if explicitly enabled in environment)
    if (env.ENABLE_DEMO_USER && (normalized === 'DEMO123' || normalized === 'DEMO')) {
      if (password === '112233') {
        const token = generateAuthToken(DEMO_USER);
        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        return res.json({
          status: "success",
          requireSetup: false,
          employee: toPublicEmployee(DEMO_USER),
          token
        });
      } else {
        return res.status(401).json({ status: "error", message: "Password salah" });
      }
    }

    const employeeMatches = await db.select().from(employees)
      .where(
        or(
          sql`UPPER(${employees.nik}) = ${normalized}`,
          sql`UPPER(COALESCE(${employees.username}, '')) = ${normalized}`
        )
      )
      .limit(1);

    const user = employeeMatches[0];
    
    if (!user) {
      return res.status(404).json({ status: "error", message: "NIK atau Username tidak ditemukan" });
    }
    
    // First time setup check
    if (!user.firstLoginComplete) {
      return res.json({ 
        status: "success", 
        requireSetup: true, 
        employee: toPublicEmployee(user) 
      });
    }
    
    // Verify password hash
    const isValid = await bcrypt.compare(password, user.passwordHash || "");
    if (!isValid) {
      return res.status(401).json({ status: "error", message: "Password salah" });
    }
    
    // Check role permissions
    const adminInfo = await checkIsAdminOrDeveloper(user.nik, user.section || '', user.jabatan || '');

    const authUser = {
      id: user.id,
      nik: user.nik,
      name: user.name,
      username: user.username,
      role: user.department || user.section || 'User',
      department: user.department,
      section: user.section,
      jabatan: user.jabatan,
      pt: user.pt,
      isAdmin: adminInfo.isAdmin,
      isDeveloper: adminInfo.isDeveloper
    };

    const token = generateAuthToken(authUser);

    // Set secure HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.json({ 
      status: "success", 
      requireSetup: false, 
      employee: toPublicEmployee(user),
      token
    });
  } catch(e: any) {
    console.error("Login error:", e);
    res.status(500).json({ status: "error", message: "Gagal memproses login pengguna" });
  }
});

// Verify Current Session Token
authRouter.get("/me", requireAuth, async (req, res) => {
  try {
    const sessionUser = (req as any).user;
    const employeeMatches = await db.select().from(employees).where(eq(employees.nik, sessionUser.nik)).limit(1);
    
    if (employeeMatches.length > 0) {
      return res.json({
        status: "success",
        user: { ...toPublicEmployee(employeeMatches[0]), ...sessionUser }
      });
    }

    return res.json({
      status: "success",
      user: sessionUser
    });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: "Gagal mengambil data session" });
  }
});

// Logout (Clear Cookie)
authRouter.post("/logout", (req, res) => {
  res.clearCookie('token');
  res.json({ status: "success", message: "Berhasil keluar" });
});

// Update Username (Requires Auth - user can only update their own username unless admin)
authRouter.post("/update-username", requireAuth, async (req: any, res) => {
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
    
    // User can only update their own username unless they have admin privileges
    if (req.user?.nik?.toUpperCase() !== normalizedNik && !req.user?.isAdmin && !req.user?.isDeveloper) {
      return res.status(403).json({ status: "error", message: "Akses ditolak: Anda hanya dapat memperbarui username akun Anda sendiri" });
    }

    const userMatches = await db.select().from(employees).where(eq(employees.nik, normalizedNik)).limit(1);
    const targetUser = userMatches[0];
    if (!targetUser) {
      return res.status(404).json({ status: "error", message: "Data personil tidak ditemukan" });
    }

    // Check if username already used by someone else
    const takenMatches = await db.select().from(employees)
      .where(sql`LOWER(${employees.username}) = ${cleanUsername.toLowerCase()} AND ${employees.id} != ${targetUser.id}`)
      .limit(1);

    if (takenMatches.length > 0) {
      return res.status(400).json({ status: "error", message: `Username "${cleanUsername}" sudah digunakan personil lain. Silakan pilih username lain.` });
    }

    const updated = await db.update(employees)
      .set({ username: cleanUsername })
      .where(eq(employees.id, targetUser.id))
      .returning();

    return res.json({ 
      status: "success", 
      message: "Username berhasil disimpan!", 
      employee: toPublicEmployee(updated[0]) 
    });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: "Gagal memperbarui username" });
  }
});

// First Login Setup (Secured)
authRouter.post("/setup", async (req, res) => {
  try {
    const { nik, password, email, tanggalLahir } = req.body;
    if (!nik || !password) {
      return res.status(400).json({ status: "error", message: "NIK dan password harus diisi" });
    }

    if (password.length < 8) {
      return res.status(400).json({ status: "error", message: "Password minimal 8 karakter" });
    }

    const normalizedNik = nik.trim().toUpperCase();
    const userMatches = await db.select().from(employees).where(eq(employees.nik, normalizedNik)).limit(1);
    const user = userMatches[0];
    
    if (!user) {
      return res.status(404).json({ status: "error", message: "NIK tidak ditemukan" });
    }

    // Critical Security Guard: Reject setup if the account has already completed first login activation
    if (user.firstLoginComplete) {
      return res.status(403).json({ 
        status: "error", 
        code: "ACCOUNT_ALREADY_ACTIVE",
        message: "Akun ini sudah pernah diaktivasi dan aktif. Silakan login atau gunakan menu Lupa Password untuk mereset akun Anda." 
      });
    }

    // Verify birth date: mandatory if user has tanggalLahir in HR database
    if (user.tanggalLahir) {
      if (!tanggalLahir) {
        return res.status(400).json({ 
          status: "error", 
          message: "Tanggal lahir wajib diisi untuk verifikasi aktivasi akun." 
        });
      }
      const dbDate = new Date(user.tanggalLahir).toISOString().split('T')[0];
      const inputDate = new Date(tanggalLahir).toISOString().split('T')[0];
      if (dbDate !== inputDate) {
        return res.status(400).json({ 
          status: "error", 
          message: "Tanggal lahir tidak sesuai dengan data terdaftar di HR." 
        });
      }
    }
    
    const hash = await bcrypt.hash(password, 10);
    
    const updateData: any = { passwordHash: hash, email: email || user.email, firstLoginComplete: true };
    if (tanggalLahir) {
      updateData.tanggalLahir = tanggalLahir;
    }
    
    const result = await db.update(employees)
      .set(updateData)
      .where(eq(employees.id, user.id))
      .returning();
      
    if(result.length === 0) return res.status(500).json({ status: "error", message: "Gagal menyimpan data setup" });
    
    return res.json({ status: "success", employee: toPublicEmployee(result[0]) });
  } catch(e: any) {
    res.status(500).json({ status: "error", message: "Gagal memproses setup akun awal" });
  }
});

// Reset Password (Admin reset secured via Token, User self-reset via Email verification)
authRouter.post("/reset-password", async (req, res) => {
  try {
    const { nik, email, newPassword, adminReset } = req.body;
    const normalizedNik = (nik || '').trim().toUpperCase();
    if (!normalizedNik) {
      return res.status(400).json({ status: "error", message: "NIK harus diisi" });
    }

    const userMatches = await db.select().from(employees).where(eq(employees.nik, normalizedNik)).limit(1);
    const user = userMatches[0];
    if (!user) return res.status(404).json({ status: "error", message: "NIK tidak ditemukan" });

    // Handle Admin Reset: MUST BE PERFORMED BY AN AUTHENTICATED ADMIN ONLY
    if (adminReset) {
      let token = req.cookies?.token;
      if (!token && req.headers.authorization) {
        const parts = req.headers.authorization.split(' ');
        if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') token = parts[1];
      }

      if (!token) {
        return res.status(401).json({ status: "error", message: "Hanya Admin terotentikasi yang berhak mereset password pengguna lain" });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const callerAdmin = await checkIsAdminOrDeveloper(decoded.nik, decoded.section, decoded.jabatan);
        if (!callerAdmin.isAdmin && !callerAdmin.isDeveloper) {
          return res.status(403).json({ status: "error", message: "Akses ditolak: Anda bukan administrator" });
        }
      } catch (err) {
        return res.status(401).json({ status: "error", message: "Sesi admin tidak valid atau telah kadaluarsa" });
      }

      if (!newPassword || newPassword.length < 8) {
        return res.status(400).json({ status: "error", message: "Password baru minimal 8 karakter" });
      }

      const hash = await bcrypt.hash(newPassword, 10);
      await db.update(employees).set({ passwordHash: hash }).where(eq(employees.id, user.id));
      return res.json({ status: "success", message: `Password akun ${user.name} berhasil di-reset oleh Admin` });
    }
    
    // User Self Reset via Email
    if (!email || !user.email || user.email.toLowerCase().trim() !== email.toLowerCase().trim()) {
      return res.status(400).json({ status: "error", message: "Email tidak cocok dengan data terdaftar" });
    }
    
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
        subject: "Reset Password - Prep & Lab Portal",
        text: `Halo ${user.name},
Password akun Portal Anda telah direset. Password sementara Anda adalah: ${newTempPass}
Silakan login menggunakan password ini dan segera ubah password Anda di menu Pengaturan.
Terima kasih.`,
        html: `<p>Halo <b>${user.name}</b>,</p>
<p>Password akun Portal Anda telah direset. Password sementara Anda adalah: <b>${newTempPass}</b></p>
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
