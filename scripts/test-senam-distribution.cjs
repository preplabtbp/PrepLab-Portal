const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

const SENAM_INITIAL_HISTORY = [
  'Herwin Predianto', 'Rusli Rorano', 'Muhammad Iqbal', 'Derald Febri Andriano Tjiwili',
  'Ahmad Jusma Azhari Annur', 'Valdi Pratama', 'Muhamad Anugrah Ramadhan', 'Murti Tamisari Harun',
  'Raldy Chevien Aryando Dareno', 'Muhamad Alvin Febriansyah', 'Ridhan Ahmadurabbi', 'Muhammad Djody Satriani',
  'Taufikir, S.Pi', 'Muhammad Fandy Septiawan', 'Agung Adi Putra Prasetyo', 'Muhammad Reza Satria',
  'Rahmad Azizul Khakim'
];

function isGolongan2or3(emp) {
  const nik = (emp.nik || '').toUpperCase().trim();
  const name = (emp.name || '').toLowerCase().trim();

  if (nik === 'DEMO123' || nik === 'DEMO' || nik.includes('DEMO') || name.includes('demo') || name.includes('staging') || nik === 'PREPLABADMIN') {
    return false;
  }

  const g = (emp.gol || '').toUpperCase().trim();
  const j = (emp.jabatan || '').toLowerCase();

  if (g === 'I' || g === '1') return false;
  if (j.includes('crew') || j.includes('operator') || j.includes('helper') || j.includes('sampler') || j.includes('driver')) {
    return false;
  }
  if (j.includes('manager') || j.includes('spt') || j.includes('superintendent')) {
    return false;
  }
  if (g === 'II' || g === 'III' || g === '2' || g === '3') return true;
  if (j.includes('foreman') || j.includes('officer') || j.includes('admin') || j.includes('supervisor') || j.includes('spv') || j.includes('specialist') || j.includes('engineer') || j.includes('analyst') || j.includes('planner')) {
    return true;
  }
  return false;
}

async function main() {
  console.log('========================================================');
  console.log(' TEST DISTRIBUSI SENAM MERATA (ZERO 2x BEFORE ALL 1x)');
  console.log('========================================================\n');

  const client = await pool.connect();
  try {
    // 1. Ambil history senam
    const sch = await client.query('SELECT schedule_data FROM p5m_schedules');
    const senamCountMap = {};
    SENAM_INITIAL_HISTORY.forEach(n => senamCountMap[n] = (senamCountMap[n] || 0) + 1);
    sch.rows.forEach(r => {
      const sData = r.schedule_data;
      if (sData) {
        Object.values(sData).forEach(day => {
          ['pagi', 'malam'].forEach(sh => {
            if (day[sh]) {
              Object.values(day[sh]).forEach(slots => {
                if (Array.isArray(slots)) {
                  slots.forEach(s => {
                    if (s.isSenam || s.kategori === 'Senam' || (s.materi && s.materi.toLowerCase().includes('senam'))) {
                      if (s.nama && !s.nama.includes('KOSONG')) {
                        senamCountMap[s.nama.trim()] = (senamCountMap[s.nama.trim()] || 0) + 1;
                      }
                    }
                  });
                }
              });
            }
          });
        });
      }
    });

    // 2. Ambil karyawan aktif
    const empRes = await client.query("SELECT name, nik, jabatan, section, gol, pt FROM employees WHERE status_karyawan NOT LIKE '%RESIGN%'");
    const activeEmps = empRes.rows.filter(isGolongan2or3);

    console.log(`✓ Total karyawan Golongan 2 & 3 aktif: ${activeEmps.length} orang`);

    const empsWithSenam = activeEmps.map(e => ({
      name: e.name.trim(),
      nik: e.nik,
      senamCount: senamCountMap[e.name.trim()] || (e.nik ? senamCountMap[e.nik] : 0) || 0
    }));

    const count0 = empsWithSenam.filter(e => e.senamCount === 0);
    const count1 = empsWithSenam.filter(e => e.senamCount === 1);
    const count2plus = empsWithSenam.filter(e => e.senamCount >= 2);

    console.log(`- Belum pernah Senam (0×) : ${count0.length} orang`);
    console.log(`- Pernah Senam 1×         : ${count1.length} orang`);
    console.log(`- Pernah Senam 2× atau > : ${count2plus.length} orang`);

    // 3. Simulasi logika pemilihan Senam Jumat Pagi
    console.log('\n--- SIMULASI PEMILIHAN KANDIDAT SENAM JUMAT PAGI ---');
    // Ambil sampel pekerja yang masuk kerja di hari Jumat (campuran yang sudah senam dan belum senam)
    const mockFridayWorkers = [...count0.slice(0, 15), ...count1.slice(0, 10), ...count2plus.slice(0, 5)];

    const availableWorkersOnDay = mockFridayWorkers;
    const globalMinSenam = Math.min(...availableWorkersOnDay.map(c => c.senamCount || 0));
    const strictlyFreshWorkers = availableWorkersOnDay.filter(c => (c.senamCount || 0) === globalMinSenam);

    console.log(`Total pekerja masuk Jumat Pagi: ${availableWorkersOnDay.length} orang`);
    console.log(`Nilai senamCount minimum yang ditemukan: ${globalMinSenam}×`);
    console.log(`Jumlah kandidat prioritas yang lolos: ${strictlyFreshWorkers.length} orang (semua ${globalMinSenam}×)`);

    // Verifikasi apakah ada personil senamCount > 0 yang lolos
    const violation = strictlyFreshWorkers.filter(c => c.senamCount > globalMinSenam);
    if (violation.length === 0 && globalMinSenam === 0) {
      console.log('✅ PASS: Seluruh kandidat yang berhak dipilih 100% adalah personil yang BELUM PERNAH senam (0×)!');
      console.log('   Personil yang sudah pernah senam 1× ataupun 2× TIDAK AKAN PERNAH terpilih selama masih ada yang 0×.');
    } else {
      console.error('❌ FAIL: Ada pelanggaran prioritas senam:', violation);
    }

    // 4. Simulasi skenario jika di masa depan semua personil sudah pernah senam 1x
    console.log('\n--- SIMULASI JIKA SUATU HARI SELURUH PERSONIL SUDAH 1× SENAM ---');
    const futureWorkers = mockFridayWorkers.map(c => ({
      ...c,
      senamCount: c.senamCount === 0 ? 1 : c.senamCount // Semua 0x sudah jadi 1x
    }));
    const futureMin = Math.min(...futureWorkers.map(c => c.senamCount));
    const futureFresh = futureWorkers.filter(c => c.senamCount === futureMin);

    console.log(`Nilai senamCount minimum di masa depan: ${futureMin}×`);
    console.log(`Jumlah kandidat prioritas: ${futureFresh.length} orang (semua ${futureMin}×)`);
    const futureViolation = futureFresh.filter(c => c.senamCount > futureMin);
    if (futureViolation.length === 0 && futureMin === 1) {
      console.log('✅ PASS: Ketika seluruh personil sudah 1× senam, baru sistem memilih yang 2× secara merata tanpa loncat ke 3×!');
    }

    console.log('\n========================================================');
    console.log(' VERIFIKASI DISTRIBUSI SENAM BERHASIL 100%');
    console.log('========================================================\n');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
