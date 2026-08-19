import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres:password123@35.232.132.249:5432/postgres'; // Connect to 'postgres' db to perform admin actions

async function syncDb() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log("Connected to PostgreSQL.");
    
    // Disconnect other users from appdb_staging
    console.log("Terminating connections to appdb_staging...");
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = 'appdb_staging' AND pid <> pg_backend_pid();
    `);

    console.log("Dropping appdb_staging...");
    await client.query(`DROP DATABASE IF EXISTS appdb_staging`);

    console.log("Cloning appdb to appdb_staging...");
    await client.query(`CREATE DATABASE appdb_staging WITH TEMPLATE appdb`);
    
    console.log("Successfully cloned appdb to appdb_staging!");
  } catch (err) {
    console.error("Error syncing DB:", err);
  } finally {
    await client.end();
  }
}

syncDb();
