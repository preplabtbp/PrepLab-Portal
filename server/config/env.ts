import dotenv from "dotenv";

dotenv.config();

export const env = {
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  DATABASE_URL: process.env.DATABASE_URL
};

export function validateEnv() {
  const missing = [];
  if (!env.VAPID_PUBLIC_KEY) missing.push("VAPID_PUBLIC_KEY");
  if (!env.VAPID_PRIVATE_KEY) missing.push("VAPID_PRIVATE_KEY");
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  
  if (missing.length > 0) {
    throw new Error(`MISSING REQUIRED ENVIRONMENT VARIABLES: ${missing.join(", ")}`);
  }
}
