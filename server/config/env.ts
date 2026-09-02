import dotenv from "dotenv";

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export const env = {
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || (isProduction ? '' : 'dev-only-secret-not-for-production-use'),
  ENABLE_DEMO_USER: process.env.ENABLE_DEMO_USER === 'true'
};

export function validateEnv() {
  // Warning saja — tidak fatal
  if (!env.VAPID_PUBLIC_KEY) console.warn("[Config] VAPID_PUBLIC_KEY belum diset.");
  if (!env.VAPID_PRIVATE_KEY) console.warn("[Config] VAPID_PRIVATE_KEY belum diset.");
  if (!process.env.SQL_HOST && !env.DATABASE_URL) console.warn("[Config] SQL_HOST / DATABASE_URL belum diset.");

  // JWT_SECRET tetap fatal di production — tidak boleh ada fallback
  if (isProduction && (!env.JWT_SECRET || env.JWT_SECRET.length < 32)) {
    throw new Error(
      "JWT_SECRET tidak diset atau kurang dari 32 karakter. " +
      "Server tidak boleh berjalan tanpa ini — token bisa dipalsukan. " +
      "Pasang dengan: gcloud run services update <service> --region <region> " +
      "--update-secrets JWT_SECRET=JWT_SECRET:latest"
    );
  }
}
