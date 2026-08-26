import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  const host = process.env.SQL_HOST || '35.232.132.249';
  const user = process.env.SQL_USER || 'postgres';
  const password = process.env.SQL_PASSWORD || 'password123';

  const poolStaging = new Pool({
    host,
    user,
    password,
    database: 'appdb_staging',
    port: 5432,
    ssl: false
  });

  console.log('Finalizing staging sync...');

  await poolStaging.query('ALTER TABLE developer_users ADD COLUMN IF NOT EXISTS role text');
  await poolStaging.query('ALTER TABLE developer_users ADD COLUMN IF NOT EXISTS added_at timestamp DEFAULT now()');

  await poolStaging.query(`
    INSERT INTO developer_users (nik, name) 
    VALUES ('02D24000043', 'Muhamad Alvin Febriansyah') 
    ON CONFLICT (nik) DO UPDATE SET name = EXCLUDED.name
  `);
  await poolStaging.query(`
    INSERT INTO developer_users (nik, name) 
    VALUES ('02D25000055', 'Muhamad Anugrah Ramadhan') 
    ON CONFLICT (nik) DO UPDATE SET name = EXCLUDED.name
  `);

  console.log('Creating roster indexes in staging...');
  try {
    await poolStaging.query('CREATE INDEX IF NOT EXISTS idx_roster_nik ON roster(nik)');
    await poolStaging.query('CREATE INDEX IF NOT EXISTS idx_roster_nik_date ON roster(nik, date)');
    await poolStaging.query('CREATE INDEX IF NOT EXISTS idx_roster_date ON roster(date)');
  } catch (e: any) {
    console.warn(e.message);
  }

  // Verify NIK 02D24000043 in staging employees
  const empCheck = await poolStaging.query("SELECT nik, name, jabatan, section FROM employees WHERE nik = '02D24000043'");
  console.log('Employee in Staging:', empCheck.rows);

  await poolStaging.end();
  console.log('✅ ALL STAGING DATABASE FIXES COMPLETED!');
}

main().catch(console.error);
