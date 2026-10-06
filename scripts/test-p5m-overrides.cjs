async function test() {
  const res = await fetch('http://localhost:3000/api/p5m/pool?userPt=TBP');
  const data = await res.json();
  if (!data.success) {
    console.error('API call failed:', data);
    return;
  }

  const murti = data.pool.find(p => p.nama.toLowerCase().includes('murti'));
  const atha = data.pool.find(p => p.nama.toLowerCase().includes('atha'));
  const djody = data.pool.find(p => p.nama.toLowerCase().includes('djody'));

  console.log('\n--- Testing P5M Placement Overrides ---');
  console.log('Murti in TBP Pool:', murti ? { nama: murti.nama, jabatan: murti.jabatan, divisi: murti.divisi, kelas: murti.kelas } : 'Not in TBP pool');
  console.log('Atha in TBP Pool:', atha ? { nama: atha.nama, jabatan: atha.jabatan, divisi: atha.divisi, kelas: atha.kelas } : 'Not in TBP pool');
  console.log('Djody in TBP Pool:', djody ? { nama: djody.nama, jabatan: djody.jabatan, divisi: djody.divisi, kelas: djody.kelas } : 'Not in TBP pool');

  // Test GPS pool
  const resGps = await fetch('http://localhost:3000/api/p5m/pool?userPt=GPS');
  const dataGps = await resGps.json();
  const djodyGps = dataGps.pool.find(p => p.nama.toLowerCase().includes('djody'));
  console.log('Djody in GPS Pool:', djodyGps ? { nama: djodyGps.nama, jabatan: djodyGps.jabatan, divisi: djodyGps.divisi, kelas: djodyGps.kelas } : 'Not found');
}

test().catch(console.error);
