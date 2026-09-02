import dotenv from "dotenv";

dotenv.config();

export const env = {
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'preplab-portal-secure-jwt-secret-key-2026-v2-production-fallback',
  ENABLE_DEMO_USER: process.env.ENABLE_DEMO_USER === 'true'
};

export function validateEnv() {
  if (!env.VAPID_PUBLIC_KEY) console.warn("[Config Warning] VAPID_PUBLIC_KEY is not configured.");
  if (!env.VAPID_PRIVATE_KEY) console.warn("[Config Warning] VAPID_PRIVATE_KEY is not configured.");
  if (!process.env.SQL_HOST && !env.DATABASE_URL) console.warn("[Config Warning] Neither SQL_HOST nor DATABASE_URL is configured.");
  if (!process.env.JWT_SECRET) console.warn("[Config Warning] JWT_SECRET is using default fallback.");
}
