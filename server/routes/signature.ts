import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "../../src/db/index.js";
import { employees } from "../../src/db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import {
  encryptSignature,
  decryptSignature,
  generateDigitalAuditStamp,
} from "../utils/signatureCrypto.js";

export const signatureRouter = Router();

// Auto-check and create DB columns if not exists
let isColumnsChecked = false;
async function ensureSignatureColumns() {
  if (isColumnsChecked) return;
  try {
    await pool.query(`
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS signature_encrypted text;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS signature_iv text;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS signature_tag text;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS signature_pin_hash text;
      ALTER TABLE employees ADD COLUMN IF NOT EXISTS signature_updated_at timestamp;
    `);
    isColumnsChecked = true;
  } catch (err: any) {
    console.warn('[Signature DB] Column check note:', err?.message || err);
  }
}

// 1. Get Signature & PIN Status (Protected: requires authentication)
signatureRouter.get("/status", requireAuth, async (req: any, res) => {
  await ensureSignatureColumns();
  try {
    const queryNik = (req.query.nik as string)?.trim();
    const queryName = (req.query.name as string)?.trim();
    const targetNik = queryNik || req.user?.nik;

    let emp: {
      hasSignature: string | null;
      hasPin: string | null;
      updatedAt: Date | null;
      nik: string;
      name: string;
    } | null = null;

    if (targetNik) {
      const [found] = await db
        .select({
          hasSignature: employees.signatureEncrypted,
          hasPin: employees.signaturePinHash,
          updatedAt: employees.signatureUpdatedAt,
          nik: employees.nik,
          name: employees.name,
        })
        .from(employees)
        .where(eq(employees.nik, targetNik))
        .limit(1);
      emp = found || null;
    }

    if (!emp && queryName) {
      const list = await db
        .select({
          hasSignature: employees.signatureEncrypted,
          hasPin: employees.signaturePinHash,
          updatedAt: employees.signatureUpdatedAt,
          nik: employees.nik,
          name: employees.name,
        })
        .from(employees)
        .limit(500);

      const cleanQuery = queryName.toLowerCase().replace(/[^a-z0-9]/g, '');
      emp = list.find(e => {
        const cleanEmpName = (e.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanEmpName.includes(cleanQuery) || cleanQuery.includes(cleanEmpName);
      }) || null;
    }

    if (!emp) {
      return res.json({
        success: true,
        hasSignature: false,
        hasPin: false,
        updatedAt: null,
      });
    }

    return res.json({
      success: true,
      hasSignature: !!(emp.hasSignature && emp.hasPin),
      hasPin: !!emp.hasPin,
      updatedAt: emp.updatedAt || null,
      nik: emp.nik,
      name: emp.name,
    });
  } catch (error: any) {
    console.error("[Signature /status] Error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil status tanda tangan" });
  }
});

// 2. Save Signature & Set/Update PIN (Protected: AES-256-GCM + Bcrypt)
signatureRouter.post("/save", requireAuth, async (req: any, res) => {
  await ensureSignatureColumns();
  try {
    const userNik = req.user?.nik;
    const { signatureData, pin, oldPin, accountPassword } = req.body;

    if (!userNik) {
      return res.status(401).json({ success: false, message: "Sesi tidak valid" });
    }

    if (!signatureData || typeof signatureData !== 'string' || !signatureData.startsWith('data:image/')) {
      return res.status(400).json({ success: false, message: "Format gambar tanda tangan tidak valid" });
    }

    if (!pin || !/^\d{6}$/.test(pin)) {
      return res.status(400).json({ success: false, message: "PIN harus berupa 6 digit angka" });
    }

    const [emp] = await db
      .select({
        id: employees.id,
        passwordHash: employees.passwordHash,
        signaturePinHash: employees.signaturePinHash,
      })
      .from(employees)
      .where(eq(employees.nik, userNik))
      .limit(1);

    if (!emp) {
      return res.status(404).json({ success: false, message: "Karyawan tidak ditemukan" });
    }

    // Jika user sudah memiliki PIN sebelumnya, wajib verifikasi oldPin atau password akun
    if (emp.signaturePinHash) {
      let isVerified = false;

      if (oldPin) {
        isVerified = await bcrypt.compare(oldPin, emp.signaturePinHash);
      } else if (accountPassword && emp.passwordHash) {
        isVerified = await bcrypt.compare(accountPassword, emp.passwordHash);
      }

      if (!isVerified) {
        return res.status(401).json({
          success: false,
          message: "PIN lama atau Password Akun salah. Konfirmasi identitas diperlukan untuk mengubah tanda tangan.",
        });
      }
    }

    // 1. Enkripsi data URL dengan AES-256-GCM
    const encrypted = encryptSignature(signatureData);

    // 2. Hash 6-digit PIN dengan bcrypt
    const hashedPin = await bcrypt.hash(pin, 10);

    // 3. Simpan ke database
    await db
      .update(employees)
      .set({
        signatureEncrypted: encrypted.ciphertext,
        signatureIv: encrypted.iv,
        signatureTag: encrypted.tag,
        signaturePinHash: hashedPin,
        signatureUpdatedAt: new Date(),
      })
      .where(eq(employees.id, emp.id));

    return res.json({
      success: true,
      message: "Tanda tangan dan PIN 6 digit berhasil disimpan dengan enkripsi aman AES-256-GCM.",
    });
  } catch (error: any) {
    console.error("[Signature /save] Error:", error);
    return res.status(500).json({ success: false, message: error?.message || "Gagal menyimpan tanda tangan" });
  }
});

// 3. Unlock / Decrypt Signature using PIN (Protected)
signatureRouter.post("/unlock", requireAuth, async (req: any, res) => {
  await ensureSignatureColumns();
  try {
    const { pin, nik, name } = req.body;
    const targetNik = (nik as string)?.trim() || req.user?.nik;

    if (!pin || !/^\d{6}$/.test(pin)) {
      return res.status(400).json({ success: false, message: "Masukkan 6 digit PIN tanda tangan" });
    }

    let emp: {
      signatureEncrypted: string | null;
      signatureIv: string | null;
      signatureTag: string | null;
      signaturePinHash: string | null;
      signatureUpdatedAt: Date | null;
      nik: string;
      name: string;
    } | null = null;

    if (targetNik) {
      const [found] = await db
        .select({
          signatureEncrypted: employees.signatureEncrypted,
          signatureIv: employees.signatureIv,
          signatureTag: employees.signatureTag,
          signaturePinHash: employees.signaturePinHash,
          signatureUpdatedAt: employees.signatureUpdatedAt,
          nik: employees.nik,
          name: employees.name,
        })
        .from(employees)
        .where(eq(employees.nik, targetNik))
        .limit(1);
      emp = found || null;
    }

    if (!emp && name) {
      const list = await db
        .select({
          signatureEncrypted: employees.signatureEncrypted,
          signatureIv: employees.signatureIv,
          signatureTag: employees.signatureTag,
          signaturePinHash: employees.signaturePinHash,
          signatureUpdatedAt: employees.signatureUpdatedAt,
          nik: employees.nik,
          name: employees.name,
        })
        .from(employees)
        .limit(500);

      const cleanQuery = (name as string).toLowerCase().replace(/[^a-z0-9]/g, '');
      emp = list.find(e => {
        const cleanEmpName = (e.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return cleanEmpName.includes(cleanQuery) || cleanQuery.includes(cleanEmpName);
      }) || null;
    }

    if (!emp || !emp.signaturePinHash || !emp.signatureEncrypted) {
      return res.status(404).json({
        success: false,
        message: "Tanda tangan digital belum diatur di menu Pengaturan. Silakan gunakan canvas goresan tangan.",
      });
    }

    // Verifikasi PIN
    const isPinValid = await bcrypt.compare(pin, emp.signaturePinHash);
    if (!isPinValid) {
      return res.status(401).json({
        success: false,
        message: "PIN Tanda Tangan salah. Silakan coba lagi.",
      });
    }

    // Dekripsi TTD dengan AES-256-GCM
    const decryptedSignature = decryptSignature({
      ciphertext: emp.signatureEncrypted,
      iv: emp.signatureIv || "",
      tag: emp.signatureTag || "",
    });

    return res.json({
      success: true,
      signatureData: decryptedSignature,
      updatedAt: emp.signatureUpdatedAt,
      signerName: emp.name,
      signerNik: emp.nik,
    });
  } catch (error: any) {
    console.error("[Signature /unlock] Error:", error);
    return res.status(500).json({ 
      success: false, 
      message: `Gagal membuka tanda tangan: ${error?.message || error}` 
    });
  }
});

// 4. Reset PIN via Account Password (Lupa PIN)
signatureRouter.post("/reset-pin", requireAuth, async (req: any, res) => {
  await ensureSignatureColumns();
  try {
    const userNik = req.user?.nik;
    const { accountPassword, newPin, newSignatureData } = req.body;

    if (!userNik) {
      return res.status(401).json({ success: false, message: "Sesi tidak valid" });
    }

    if (!accountPassword) {
      return res.status(400).json({ success: false, message: "Password akun portal wajib diisi untuk verifikasi" });
    }

    if (!newPin || !/^\d{6}$/.test(newPin)) {
      return res.status(400).json({ success: false, message: "PIN baru harus berupa 6 digit angka" });
    }

    const [emp] = await db
      .select({
        id: employees.id,
        passwordHash: employees.passwordHash,
        signatureEncrypted: employees.signatureEncrypted,
      })
      .from(employees)
      .where(eq(employees.nik, userNik))
      .limit(1);

    if (!emp || !emp.passwordHash) {
      return res.status(400).json({ success: false, message: "Akun belum memiliki password terdaftar" });
    }

    // Verifikasi password akun portal
    const isPasswordValid = await bcrypt.compare(accountPassword, emp.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Password akun portal yang Anda masukkan salah." });
    }

    const hashedNewPin = await bcrypt.hash(newPin, 10);
    const updateData: any = {
      signaturePinHash: hashedNewPin,
      signatureUpdatedAt: new Date(),
    };

    // Jika pengguna juga memilih untuk menggambar ulang TTD baru
    if (newSignatureData && typeof newSignatureData === 'string' && newSignatureData.startsWith('data:image/')) {
      const encrypted = encryptSignature(newSignatureData);
      updateData.signatureEncrypted = encrypted.ciphertext;
      updateData.signatureIv = encrypted.iv;
      updateData.signatureTag = encrypted.tag;
    }

    await db.update(employees).set(updateData).where(eq(employees.id, emp.id));

    return res.json({
      success: true,
      message: "PIN Tanda Tangan berhasil di-reset dengan aman.",
    });
  } catch (error: any) {
    console.error("[Signature /reset-pin] Error:", error);
    return res.status(500).json({ success: false, message: "Gagal mereset PIN tanda tangan" });
  }
});

// 5. Delete Signature & PIN
signatureRouter.post("/delete", requireAuth, async (req: any, res) => {
  await ensureSignatureColumns();
  try {
    const userNik = req.user?.nik;
    const { pin, accountPassword } = req.body;

    if (!userNik) {
      return res.status(401).json({ success: false, message: "Sesi tidak valid" });
    }

    const [emp] = await db
      .select({
        id: employees.id,
        passwordHash: employees.passwordHash,
        signaturePinHash: employees.signaturePinHash,
      })
      .from(employees)
      .where(eq(employees.nik, userNik))
      .limit(1);

    if (!emp) {
      return res.status(404).json({ success: false, message: "Data karyawan tidak ditemukan" });
    }

    // Verifikasi PIN atau password akun
    let isVerified = false;
    if (pin && emp.signaturePinHash) {
      isVerified = await bcrypt.compare(pin, emp.signaturePinHash);
    } else if (accountPassword && emp.passwordHash) {
      isVerified = await bcrypt.compare(accountPassword, emp.passwordHash);
    }

    if (!isVerified) {
      return res.status(401).json({ success: false, message: "PIN atau Password akun salah. Penghapusan dibatalkan." });
    }

    await db
      .update(employees)
      .set({
        signatureEncrypted: null,
        signatureIv: null,
        signatureTag: null,
        signaturePinHash: null,
        signatureUpdatedAt: null,
      })
      .where(eq(employees.id, emp.id));

    return res.json({
      success: true,
      message: "Tanda tangan tersimpan dan PIN berhasil dihapus secara permanen.",
    });
  } catch (error: any) {
    console.error("[Signature /delete] Error:", error);
    return res.status(500).json({ success: false, message: "Gagal menghapus tanda tangan" });
  }
});

// 6. Generate Cryptographic Audit Verification Stamp (Opsi 3)
signatureRouter.post("/stamp", requireAuth, async (req: any, res) => {
  try {
    const userNik = req.user?.nik;
    const { documentType, documentId } = req.body;

    if (!userNik || !documentType || !documentId) {
      return res.status(400).json({ success: false, message: "Parameter dokumen tidak lengkap" });
    }

    const stamp = generateDigitalAuditStamp(userNik, documentType, documentId);
    return res.json({
      success: true,
      stamp,
    });
  } catch (error: any) {
    console.error("[Signature /stamp] Error:", error);
    return res.status(500).json({ success: false, message: "Gagal membuat audit stamp" });
  }
});
