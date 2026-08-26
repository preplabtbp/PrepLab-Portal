import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function update84() {
  await pool.query(
    "UPDATE inspections SET pdf_url = $1 WHERE id = 84",
    ["https://drive.google.com/uc?export=view&id=1Wp8rGktumLeY9-bnXu3wPAJYoLlkG9iH"]
  );
  console.log("Updated inspection 84 pdf_url in DB!");
  await pool.end();
}

update84().catch(console.error);
