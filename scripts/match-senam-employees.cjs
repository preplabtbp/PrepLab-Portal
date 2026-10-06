const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

const searchNames = [
  'herwin', 'Rusli Rorano', 'Iqbal', 'Derald', 'Jusma', 'Valdi', 
  'Anugrah', 'Murti', 'Raldy', 'Alvin', 'Ridhan', 'Djody', 
  'Taufikir', 'Fandy', 'Agung', 'Reza', 'Khakim'
];

async function main() {
  const client = await pool.connect();
  const allEmps = (await client.query('SELECT nik, name, jabatan, department, section, pt FROM employees')).rows;

  console.log(`Total employees in DB: ${allEmps.length}`);
  console.log('--- Matching Names ---');

  for (const q of searchNames) {
    const qLower = q.toLowerCase();
    const matches = allEmps.filter(e => (e.name || '').toLowerCase().includes(qLower));
    console.log(`\nQuery "${q}" (${matches.length} matches):`);
    matches.forEach(m => {
      console.log(`  - NIK: ${m.nik} | Name: ${m.name} | Jabatan: ${m.jabatan} | Dept/Sec: ${m.department || m.section} | PT: ${m.pt}`);
    });
  }

  client.release();
  await pool.end();
}

main().catch(console.error);
