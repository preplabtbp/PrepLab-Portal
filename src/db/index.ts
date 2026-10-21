import * as dotenv from 'dotenv';
dotenv.config();
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Circuit breaker state for offline/firewalled database protection
let lastFailureTimestamp = 0;
let consecutiveErrors = 0;
const CIRCUIT_RESET_MS = process.env.NODE_ENV === 'production' ? 20000 : 60000;

export function isDbCircuitBroken(): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  if (consecutiveErrors < 2) return false;
  if (Date.now() - lastFailureTimestamp > CIRCUIT_RESET_MS) {
    // Try probing again after recovery window
    consecutiveErrors = 1; // probe mode
    return false;
  }
  return true;
}

export function reportDbError(err?: any) {
  lastFailureTimestamp = Date.now();
  consecutiveErrors++;
}

export function reportDbSuccess() {
  consecutiveErrors = 0;
}

/**
 * Execute a database query with tight timeout protection and automatic circuit breaker.
 * When DB is offline or firewalled, returns fallbackFn() after timeoutMs.
 */
export async function withDbFallback<T>(
  queryFn: () => Promise<T>,
  fallbackFn: () => T | Promise<T>,
  timeoutMs = 4000
): Promise<T> {
  if (isDbCircuitBroken()) {
    return fallbackFn();
  }
  try {
    const res = await Promise.race([
      queryFn(),
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("DB timeout")), timeoutMs))
    ]);
    reportDbSuccess();
    return res;
  } catch (err: any) {
    reportDbError(err);
    return fallbackFn();
  }
}

export const createPool = () => {
  const isProd = process.env.NODE_ENV === 'production';
  // Use a lean pool size (max 5) to prevent exhausting PostgreSQL max_connections (Error 53300) across Cloud Run & dev instances
  const defaultMax = isProd ? 5 : 4;
  const poolConfig: any = {
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 10000,
    max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : defaultMax,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    allowExitOnIdle: true,
  };

  if (process.env.DATABASE_URL) {
    poolConfig.connectionString = process.env.DATABASE_URL;
  } else {
    poolConfig.host = process.env.SQL_HOST;
    poolConfig.user = process.env.SQL_USER;
    poolConfig.password = process.env.SQL_PASSWORD;
    poolConfig.database = process.env.SQL_DB_NAME;
  }

  return new Pool(poolConfig);
};

export const pool = createPool();

pool.on('error', (err) => {
  console.warn('⚠️ [DB Pool] Idle client reset/closed:', err?.message || err);
});

// Clean up pool connections when server process shuts down or restarts
const gracefulPoolExit = async () => {
  try {
    await pool.end();
  } catch {}
};
process.once('SIGINT', gracefulPoolExit);
process.once('SIGTERM', gracefulPoolExit);

export const db = drizzle(pool, { schema });
