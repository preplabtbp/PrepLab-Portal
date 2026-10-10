import * as dotenv from 'dotenv';
dotenv.config();
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const createPool = () => {
  const poolConfig: any = {
    connectionTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10,
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
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });
