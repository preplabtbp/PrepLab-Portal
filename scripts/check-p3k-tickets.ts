import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function clean() {
  await pool.query(
    "UPDATE tickets SET description = 'Kotak P3K Preparasi Basah: Lampu senter: Stok Kosong, Obat pembersih mata (Yrins 120ml): Stok Kosong, Pinset: Stok Kosong, Povidon iodin 15ml: Stok Kosong, Silet: Stok Kosong' WHERE id = 546"
  );
  await pool.query(
    "UPDATE tickets SET description = 'Kotak P3K Laboratorium: Alkohol 70% (70ml): Stok Kosong, Aquades (100 ml): Stok Kosong, Gunting: Stok Kosong, Insto 7.5 ml: Stok Kosong, Kasa: Stok Kosong, Lampu senter: Stok Kosong, Obat pembersih mata (Yrins 120ml): Stok Kosong, Pinset: Stok Kosong, Silet: Stok Kosong' WHERE id = 551"
  );
  console.log('Cleaned descriptions');
  const res = await pool.query("SELECT id, ticket_id, description, status FROM tickets WHERE id IN (546, 551)");
  res.rows.forEach(r => console.log(r));
  await pool.end();
}

clean().catch(console.error);
