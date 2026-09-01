import * as dotenv from 'dotenv';
dotenv.config();
import { Client } from 'pg';

async function tryConnectAndClean() {
  for (let i = 1; i <= 15; i++) {
    const client = new Client({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      port: Number(process.env.SQL_PORT) || 5432,
      connectionTimeoutMillis: 3000,
    });

    try {
      console.log(`[Attempt ${i}/15] Connecting to PostgreSQL...`);
      await client.connect();
      console.log('✅ Connection SUCCESSFUL!');
      
      const termRes = await client.query(`
        SELECT pg_terminate_backend(pid) 
        FROM pg_stat_activity 
        WHERE pid <> pg_backend_pid() 
          AND state = 'idle';
      `);
      console.log('✅ Terminated idle connections:', termRes.rowCount);

      const countRes = await client.query('SELECT count(*) FROM pg_stat_activity');
      console.log('✅ Remaining active connections:', countRes.rows[0].count);
      
      await client.end();
      return true;
    } catch (err) {
      console.log(`❌ Attempt ${i} failed:`, err.message);
      try { await client.end(); } catch (e) {}
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return false;
}

tryConnectAndClean();
