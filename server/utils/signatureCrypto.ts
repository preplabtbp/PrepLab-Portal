import crypto from 'crypto';

// Master key derived from TTD_ENCRYPTION_KEY, JWT_SECRET, or fallback securely
const MASTER_SECRET = process.env.TTD_ENCRYPTION_KEY || process.env.JWT_SECRET || 'preplab-secure-ttd-master-key-2026-tbp-obi';
// Always produce consistent 32-byte key for AES-256
const ENCRYPTION_KEY = crypto.createHash('sha256').update(MASTER_SECRET).digest();

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
 * Throws an error if the auth tag is invalid (anti-tamper protection).
 */
export function decryptSignature(encrypted: EncryptedSignature): string {
  if (!encrypted.ciphertext || !encrypted.iv || !encrypted.tag) {
    throw new Error('Data enkripsi tanda tangan korup atau tidak lengkap');
  }

  const iv = Buffer.from(encrypted.iv, 'base64');
  const tag = Buffer.from(encrypted.tag, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted.ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
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
