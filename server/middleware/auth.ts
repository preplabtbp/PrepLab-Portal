import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../../src/db/index.js';
import { employees, developerUsers } from '../../src/db/schema.js';
import { eq } from 'drizzle-orm';
import { env } from '../config/env.js';

export const JWT_SECRET = env.JWT_SECRET;
const TOKEN_EXPIRY = '7d';

export interface AuthUser {
  id?: number;
  nik: string;
  name: string;
  username?: string | null;
  role?: string;
  department?: string | null;
  section?: string | null;
  jabatan?: string | null;
  pt?: string | null;
  isAdmin?: boolean;
  isDeveloper?: boolean;
}

// Helper to sanitize employee object and never leak passwordHash or sensitive internal fields
export function toPublicEmployee(emp: any): any {
  if (!emp) return null;
  const { passwordHash, ...safeEmp } = emp;
  return safeEmp;
}

// Generate signed JWT Token
export function generateAuthToken(user: AuthUser): string {
  const payload = {
    id: user.id,
    nik: user.nik,
    name: user.name,
    username: user.username,
    role: user.role,
    department: user.department,
    section: user.section,
    jabatan: user.jabatan,
    pt: user.pt,
    isAdmin: user.isAdmin,
    isDeveloper: user.isDeveloper
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

// Helper to verify if user has admin/developer role
export async function checkIsAdminOrDeveloper(nik?: string, section?: string, jabatan?: string): Promise<{ isAdmin: boolean; isDeveloper: boolean }> {
  if (!nik) return { isAdmin: false, isDeveloper: false };
  const cleanNik = String(nik).trim().toUpperCase();

  // Superadmins / Default Developer accounts (Explicit production developer NIKs only)
  if (cleanNik === '02D25000055' || cleanNik === '02D24000043' || cleanNik === 'PREPLABADMIN') {
    return { isAdmin: true, isDeveloper: true };
  }

  // Check Developer Users table
  try {
    const dev = await db.select().from(developerUsers).where(eq(developerUsers.nik, cleanNik)).limit(1);
    if (dev.length > 0) return { isAdmin: true, isDeveloper: true };
  } catch (e) {}

  // Check section / department / jabatan for admin roles
  const sec = (section || '').toLowerCase();
  const jab = (jabatan || '').toLowerCase();
  if (
    sec.includes('admin') || sec.includes('administrasi') ||
    jab.includes('admin') || jab.includes('administrasi') ||
    jab.includes('superintendent') || jab.includes('manager')
  ) {
    return { isAdmin: true, isDeveloper: false };
  }

  return { isAdmin: false, isDeveloper: false };
}

// Middleware: Require Authenticated User
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token = req.cookies?.token;

    // Support Bearer header as fallback
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Sesi login telah berakhir atau tidak valid. Silakan login kembali."
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    if (!decoded || !decoded.nik) {
      return res.status(401).json({
        status: "error",
        code: "INVALID_TOKEN",
        message: "Token autentikasi tidak valid."
      });
    }

    // Attach user to request
    (req as any).user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({
      status: "error",
      code: "AUTH_EXPIRED",
      message: "Sesi login kadaluarsa. Silakan login kembali."
    });
  }
}

// Middleware: Require specific role or Admin
export function requireRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) {
      return res.status(401).json({
        status: "error",
        code: "UNAUTHORIZED",
        message: "Autentikasi diperlukan."
      });
    }

    // Admins and Developers always have bypass access
    if (user.isAdmin || user.isDeveloper) {
      return next();
    }

    const userRoles = [
      (user.role || '').toLowerCase(),
      (user.section || '').toLowerCase(),
      (user.jabatan || '').toLowerCase(),
      (user.department || '').toLowerCase()
    ];

    const isAllowed = allowedRoles.some(role => {
      const r = role.toLowerCase();
      return userRoles.some(ur => ur.includes(r));
    });

    if (isAllowed) {
      return next();
    }

    return res.status(403).json({
      status: "error",
      code: "FORBIDDEN",
      message: "Akses ditolak. Anda tidak memiliki izin untuk mengakses resource ini."
    });
  };
}
