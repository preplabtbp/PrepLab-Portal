require('dotenv').config();

async function testSenamHistory() {
  console.log('--- Testing Senam History Baseline & Pool ---');
  
  const res = await fetch('http://127.0.0.1:3000/api/p5m/pool?weekDate=2026-08-25');
  const json = await res.json();

  if (!json.success) {
    console.error('Failed to get pool:', json);
    return;
  }

  const pool = json.pool;
  console.log(`Pool total employees: ${pool.length}`);

  const senamRecords = pool.filter(p => p.senamCount > 0);
  console.log(`\nEmployees with senamCount > 0 (${senamRecords.length}):`);
  senamRecords.forEach(p => {
    console.log(`  ✓ [Count: ${p.senamCount}] ${p.nama} (${p.nik}) - ${p.jabatan} - Divisi: ${p.divisi}`);
  });

  const freshSenam = pool.filter(p => p.senamCount === 0);
  console.log(`\nRemaining employees with senamCount === 0 (Fresh candidates for upcoming Jumat morning senam): ${freshSenam.length}`);
  freshSenam.slice(0, 10).forEach(p => {
    console.log(`  • ${p.nama} (${p.nik}) - ${p.jabatan} - Divisi: ${p.divisi}`);
  });
}

testSenamHistory().catch(console.error);
