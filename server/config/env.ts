import dotenv from "dotenv";

dotenv.config();

export const env = {
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'preplab-portal-secure-jwt-secret-key-2026-v2-dev'),
  ENABLE_DEMO_USER: process.env.ENABLE_DEMO_USER === 'true'
};

export function validateEnv() {
  const missing = [];
  if (!env.VAPID_PUBLIC_KEY) missing.push("VAPID_PUBLIC_KEY");
  if (!env.VAPID_PRIVATE_KEY) missing.push("VAPID_PRIVATE_KEY");
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!env.JWT_SECRET || (process.env.NODE_ENV === 'production' && env.JWT_SECRET.length < 32)) {
    missing.push("JWT_SECRET (must be >= 32 characters in production)");
  }
  
  if (missing.length > 0) {
    throw new Error(`MISSING OR INVALID REQUIRED ENVIRONMENT VARIABLES: ${missing.join(", ")}`);
  }
}
