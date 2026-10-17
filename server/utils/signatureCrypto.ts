import crypto from 'crypto';

// Master key derived from dedicated TTD_ENCRYPTION_KEY or stable system master key
// NOTE: Must include the verified seed key (7f8b9e1c...) so signatures registered locally
// or on Cloud Run can be decrypted across both environments seamlessly.
const STABLE_DEFAULT_SECRET = '7f8b9e1c3a5d7e9f0b2d4f6a8c0e2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f';
const FALLBACK_SECRET_OBI = 'preplab-secure-ttd-master-key-2026-tbp-obi';
const PRIMARY_SECRET = process.env.TTD_ENCRYPTION_KEY || STABLE_DEFAULT_SECRET;
const ENCRYPTION_KEY = crypto.createHash('sha256').update(PRIMARY_SECRET).digest();

export interface EncryptedSignature {
  ciphertext: string;
  iv: string;
  tag: string;
}

/**
 * Encrypts a signature DataURL using AES-256-GCM
 */
export function encryptSignature(plainTextDataUrl: string): EncryptedSignature {
  if (!plainTextDataUrl || typeof plainTextDataUrl !== 'string') {
    throw new Error('Data tanda tangan tidak valid untuk dienkripsi');
  }

  // 12 bytes IV is standard and recommended for GCM
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  let ciphertext = cipher.update(plainTextDataUrl, 'utf8', 'base64');
  ciphertext += cipher.final('base64');
  const tag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

/**
 * Decrypts an encrypted signature using AES-256-GCM.
 * Supports multi-key fallback (stable default, TTD_ENCRYPTION_KEY, and JWT_SECRET)
 * so signatures registered on localhost or production can always be opened.
 */
export function decryptSignature(encrypted: EncryptedSignature): string {
  if (!encrypted.ciphertext || !encrypted.iv || !encrypted.tag) {
    throw new Error('Data enkripsi tanda tangan korup atau tidak lengkap');
  }

  const iv = Buffer.from(encrypted.iv, 'base64');
  const tag = Buffer.from(encrypted.tag, 'base64');

  const candidateSecrets = [
    PRIMARY_SECRET,
    STABLE_DEFAULT_SECRET,
    FALLBACK_SECRET_OBI,
    process.env.TTD_ENCRYPTION_KEY,
    process.env.JWT_SECRET,
  ].filter((s): s is string => typeof s === 'string' && s.length > 0);

  const uniqueSecrets = Array.from(new Set(candidateSecrets));

  let lastError: any = null;
  for (const secret of uniqueSecrets) {
    try {
      const key = crypto.createHash('sha256').update(secret).digest();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Gagal mendekripsi tanda tangan');
}

/**
 * Generates a cryptographic digital audit stamp (Opsi 3) for signed documents
 */
export function generateDigitalAuditStamp(nik: string, docType: string, docId: string, timestamp: string = new Date().toISOString()): {
  auditToken: string;
  hash: string;
  timestamp: string;
} {
  const payload = `${nik.trim().toUpperCase()}|${docType}|${docId}|${timestamp}`;
  const hash = crypto.createHmac('sha256', ENCRYPTION_KEY).update(payload).digest('hex').substring(0, 16).toUpperCase();
  return {
    auditToken: `PREPLAB-DOC-${hash}`,
    hash,
    timestamp
  };
}
