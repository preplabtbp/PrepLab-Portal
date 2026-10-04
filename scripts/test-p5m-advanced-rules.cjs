const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

async function main() {
  const client = await pool.connect();

  console.log('--- TEST 1: Menambahkan Materi Internal Uji Coba ---');
  const insertRes = await client.query(`
    INSERT INTO p5m_materi (judul, kategori, sub_kategori, divisi, is_internal, last_used, file_url)
    VALUES ('[TEST] Prosedur Uji Coba Internal Saturday', 'Teknis', 'Preparation', 'Preparation', TRUE, NULL, 'https://drive.google.com/test')
    RETURNING *;
  `);
  const testMateri = insertRes.rows[0];
  console.log('Materi internal uji coba berhasil ditambahkan:', {
    id: testMateri.id,
    judul: testMateri.judul,
    kategori: testMateri.kategori,
    sub_kategori: testMateri.sub_kategori,
    is_internal: testMateri.is_internal
  });

  console.log('\n--- TEST 2: Memanggil API /api/p5m/randomize ---');
  try {
    const res = await fetch('http://127.0.0.1:3000/api/p5m/randomize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekDate: '2026-08-24',
        userPt: 'TBP'
      })
    });
    const data = await res.json();
    if (data.success) {
      console.log('✓ Randomize API Berhasil!');
      const jdw = data.jadwal;

      // 1. Cek Hari Gabungan (Senin, Kamis, Jumat, Minggu)
      console.log('\n========================================');
      console.log('1. VERIFIKASI HARI GABUNGAN (General Saja)');
      console.log('========================================');
      ['Senin', 'Kamis', 'Jumat', 'Minggu'].forEach(hari => {
        const slotsPagi = jdw[hari]?.pagi?.gabungan || [];
        const slotsMalam = jdw[hari]?.malam?.gabungan || [];
        const allSlots = [...slotsPagi, ...slotsMalam];
        const invalidSlots = allSlots.filter(s => s.subKategori && s.subKategori !== 'General');
        console.log(`- ${hari}: ${allSlots.length} sesi, Non-General Topics = ${invalidSlots.length}`);
        if (invalidSlots.length > 0) {
          console.error(`  ❌ Pelanggaran di ${hari}:`, invalidSlots.map(s => ({ materi: s.materi, subKat: s.subKategori })));
        } else {
          console.log(`  ✅ Semua materi ${hari} adalah GENERAL (universal). Topik contoh: "${allSlots[0]?.materi}"`);
        }
      });

      // 2. Cek Sinkronisasi Pagi dan Malam
      console.log('\n========================================');
      console.log('2. VERIFIKASI SINKRONISASI PAGI & MALAM');
      console.log('========================================');
      ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].forEach(hari => {
        const isGabungan = ['Senin', 'Kamis', 'Jumat'].includes(hari);
        if (isGabungan) {
          const pMateri = (jdw[hari]?.pagi?.gabungan || []).map(s => s.materi);
          const mMateri = (jdw[hari]?.malam?.gabungan || []).map(s => s.materi);
          console.log(`- ${hari} (Gabungan):`);
          console.log(`  Pagi :`, pMateri);
          console.log(`  Malam:`, mMateri);
          const match = JSON.stringify(pMateri.slice(0, mMateri.length)) === JSON.stringify(mMateri);
          console.log(`  👉 Status Sinkronisasi: ${match ? '✅ SAMA PERSIS' : 'ℹ️ Sesuai ketersediaan'}`);
        } else {
          const prepPagi = (jdw[hari]?.pagi?.preparasi || []).map(s => s.materi);
          const prepMalam = (jdw[hari]?.malam?.preparasi || []).map(s => s.materi);
          const labPagi = (jdw[hari]?.pagi?.laboratorium || []).map(s => s.materi);
          const labMalam = (jdw[hari]?.malam?.laboratorium || []).map(s => s.materi);
          console.log(`- ${hari} (Split):`);
          console.log(`  Prep Pagi :`, prepPagi);
          console.log(`  Prep Malam:`, prepMalam);
          console.log(`  Lab Pagi  :`, labPagi);
          console.log(`  Lab Malam :`, labMalam);
        }
      });

      // 3. Cek Penjadwalan Materi Internal di Hari Sabtu
      console.log('\n========================================');
      console.log('3. VERIFIKASI MATERI INTERNAL HARI SABTU');
      console.log('========================================');
      const sabtuPrep = jdw['Sabtu']?.pagi?.preparasi || [];
      const sabtuLab = jdw['Sabtu']?.pagi?.laboratorium || [];
      const sabtuAll = [...sabtuPrep, ...sabtuLab];
      const foundInternal = sabtuAll.find(s => s.materi && s.materi.includes('[TEST] Prosedur Uji Coba'));
      if (foundInternal) {
        console.log(`  ✅ Berhasil! Materi internal dijadwalkan di Sabtu Pagi oleh Presenter: ${foundInternal.nama} (${foundInternal.divisi})`);
        console.log(`     Judul Materi: ${foundInternal.materi}`);
      } else {
        console.log(`  ℹ️ Materi di Sabtu:`, sabtuAll.map(s => s.materi));
      }
    } else {
      console.error('Randomize API error:', data.message);
    }
  } catch (err) {
    console.error('Fetch error:', err.message);
  }

  // Cleanup test record
  await client.query("DELETE FROM p5m_materi WHERE judul LIKE '[TEST]%'");
  console.log('\n✓ Record uji coba berhasil dibersihkan dari database.');

  client.release();
  await pool.end();
}

main().catch(console.error);
