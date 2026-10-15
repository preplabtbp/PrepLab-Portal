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
 * When DB is offline or firewalled, returns fallbackFn() in 0 ms.
 */
export async function withDbFallback<T>(
  queryFn: () => Promise<T>,
  fallbackFn: () => T | Promise<T>,
  timeoutMs = 600
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
  const poolConfig: any = {
    connectionTimeoutMillis: 2000, // 2s fast fail instead of 15s freeze
    idleTimeoutMillis: 10000,
    max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 6,
    keepAlive: true,
    keepAliveInitialDelayMillis: 5000,
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
  console.error('Unexpected error on idle SQL pool client:', err?.message || err);
  reportDbError(err);
});

export const db = drizzle(pool, { schema });
