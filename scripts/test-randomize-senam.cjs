require('dotenv').config();

async function testRandomizeSenam() {
  console.log('--- Testing Randomize Schedule Senam Selection ---');
  
  const res = await fetch('http://127.0.0.1:3000/api/p5m/randomize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekDate: '2026-08-25' })
  });
  
  const json = await res.json();
  if (!json.success) {
    console.error('Randomize failed:', json);
    return;
  }

  const sch = json.jadwal;
  const jumatPagi = sch['Jumat']?.pagi?.gabungan || [];
  console.log('\nJumat Pagi Gabungan Slots:');
  jumatPagi.forEach((s, idx) => {
    console.log(`  Slot ${idx+1}: [${s.kategori}] ${s.materi} -> Presenter: ${s.nama} (${s.nik}) | Gol/Jab: ${s.jabatan} | Div: ${s.divisi}`);
  });

  const senamSlot = jumatPagi.find(s => s.isSenam || s.kategori === 'Senam' || s.materi?.toLowerCase().includes('senam'));
  if (senamSlot) {
    console.log(`\n✓ Senam Pagi Terpilih: ${senamSlot.nama} (${senamSlot.nik})`);
  }
}

testRandomizeSenam().catch(console.error);
