const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:password123@34.50.109.113:5432/appdb',
  connectionTimeoutMillis: 10000
});

async function main() {
  console.log('Connecting to database...');
  const client = await pool.connect();
  console.log('Connected!');

  try {
    // 1. Get existing columns in employees
    const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'employees';
    `);
    const existingCols = new Set(res.rows.map(r => r.column_name));
    console.log('Existing columns in employees count:', existingCols.size);

    // List of expected columns from schema.ts
    const expected = [
      { col: 'id', sql: 'SERIAL PRIMARY KEY' },
      { col: 'nik', sql: 'TEXT' },
      { col: 'name', sql: 'TEXT' },
      { col: 'jabatan', sql: 'TEXT' },
      { col: 'job_grade', sql: 'TEXT' },
      { col: 'section', sql: 'TEXT' },
      { col: 'gol', sql: 'TEXT' },
      { col: 'shift', sql: 'TEXT' },
      { col: 'poh', sql: 'TEXT' },
      { col: 'pt', sql: 'TEXT' },
      { col: 'status_mess', sql: 'TEXT' },
      { col: 'rotation', sql: 'TEXT' },
      { col: 'tanggal_awal_bergabung', sql: 'TEXT' },
      { col: 'tanggal_bergabung_terbaru', sql: 'TEXT' },
      { col: 'tanggal_lahir', sql: 'TEXT' },
      { col: 'status_kontrak', sql: 'TEXT' },
      { col: 'department', sql: 'TEXT' },
      { col: 'position', sql: 'TEXT' },
      { col: 'status_karyawan', sql: 'TEXT' },
      { col: 'tanggal_efektif_tidak_bekerja', sql: 'TEXT' },
      { col: 'tanggal_jabatan_baru', sql: 'TEXT' },
      { col: 'masa_kerja', sql: 'TEXT' },
      { col: 'masa_kerja_jabatan_terakhir', sql: 'TEXT' },
      { col: 'masa_kerja_jabatan_sebelumnya', sql: 'TEXT' },
      { col: 'tanggal_permanent', sql: 'TEXT' },
      { col: 'tempat_lahir', sql: 'TEXT' },
      { col: 'phone', sql: 'TEXT' },
      { col: 'keluarga_kandung', sql: 'TEXT' },
      { col: 'phone_keluarga', sql: 'TEXT' },
      { col: 'orang_terdekat', sql: 'TEXT' },
      { col: 'phone_darurat', sql: 'TEXT' },
      { col: 'alamat_ktp', sql: 'TEXT' },
      { col: 'alamat_domisili', sql: 'TEXT' },
      { col: 'ktp', sql: 'TEXT' },
      { col: 'sponsor', sql: 'TEXT' },
      { col: 'email', sql: 'TEXT' },
      { col: 'username', sql: 'TEXT' },
      { col: 'password_hash', sql: 'TEXT' },
      { col: 'avatar', sql: 'TEXT' },
      { col: 'photo', sql: 'TEXT' },
      { col: 'cover', sql: 'TEXT' },
      { col: 'equipped_frame', sql: "TEXT DEFAULT 'default'" },
      { col: 'equipped_title', sql: "TEXT DEFAULT 'Frontline Trainee'" },
      { col: 'sisa_ct', sql: 'TEXT' },
      { col: 'jatuh_tempo_ct', sql: 'TEXT' },
      { col: 'jumlah_cuti_site', sql: 'TEXT' },
      { col: 'attendance_data', sql: 'JSON' },
      { col: 'achievements', sql: 'JSON' },
      { col: 'catatan', sql: 'TEXT' },
      { col: 'first_login_complete', sql: 'BOOLEAN DEFAULT FALSE' },
      { col: 'home_tutorial_completed', sql: 'BOOLEAN DEFAULT FALSE' },
      { col: 'created_at', sql: 'TIMESTAMP DEFAULT NOW()' }
    ];

    for (const item of expected) {
      if (!existingCols.has(item.col)) {
        console.log(`Adding missing column: ${item.col}...`);
        await client.query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS ${item.col} ${item.sql};`);
        console.log(`Column ${item.col} added!`);
      }
    }

    console.log('Semua kolom employees sudah sinkron!');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Database migration error:', err);
  process.exit(1);
});
