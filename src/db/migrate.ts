import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log('Running migrations...');
  try {
    await migrate(db, { migrationsFolder: 'drizzle' });
    console.log('Migrations complete!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
