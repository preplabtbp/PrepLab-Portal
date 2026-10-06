const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

const URUTAN_HARI = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

function buildDefaultConfig() {
  const slot = (divisi, kelas, kategori, extra) => ({
    divisi,
    kelas,
    kategori,
    ...(extra || {})
  });

  const cfg = {};

  // SENIN (Gabungan)
  cfg['Senin'] = {
    pagi: {
      gabungan: [
        slot('Preparation', 'SPV', 'Non-Teknis'),
        slot('Laboratory', 'SPV', 'Teknis'),
        slot('Administration', 'Admin', 'Teknis')
      ]
    },
    malam: {
      gabungan: [
        slot('Preparation', 'SPV', 'Non-Teknis'),
        slot('Laboratory', 'SPV', 'Teknis'),
        slot('All', 'Foreman/Officer', 'Teknis')
      ]
    }
  };

  // SELASA (Split)
  cfg['Selasa'] = {
    pagi: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Teknis'),
        slot('Maintenance', 'Foreman/Officer', 'Teknis')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('IC', 'Admin', 'Teknis')
      ]
    },
    malam: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Teknis'),
        slot('Maintenance', 'Foreman/Officer', 'Teknis')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('Laboratory', 'Foreman/Officer', 'Teknis')
      ]
    }
  };

  // RABU (Split)
  cfg['Rabu'] = {
    pagi: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Teknis'),
        slot('Preparation', 'All', 'Teknis')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('Administration', 'Admin', 'Teknis')
      ]
    },
    malam: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Teknis'),
        slot('Preparation', 'Foreman/Officer', 'Teknis')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('Laboratory', 'Foreman/Officer', 'Teknis')
      ]
    }
  };

  // KAMIS (Gabungan)
  cfg['Kamis'] = {
    pagi: {
      gabungan: [
        slot('Preparation', 'SPV', 'Teknis'),
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('All', 'Foreman/Officer', 'Teknis')
      ]
    },
    malam: {
      gabungan: [
        slot('Preparation', 'SPV', 'Teknis'),
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('All', 'Foreman/Officer', 'Teknis')
      ]
    }
  };

  // JUMAT (Gabungan)
  cfg['Jumat'] = {
    pagi: {
      gabungan: [
        slot('All', 'Foreman/Officer', 'Senam', { isSenam: true }),
        slot('Preparation', 'SPV', 'Non-Teknis'),
        slot('Laboratory', 'SPV', 'Non-Teknis')
      ]
    },
    malam: {
      gabungan: [
        slot('All', 'Foreman/Officer', 'Teknis', { isLogbook: true, materiTetap: 'Briefing Evaluasi Logbook Shift & Operasional Mingguan' }),
        slot('Preparation', 'Foreman/Officer', 'Non-Teknis'),
        slot('Laboratory', 'Foreman/Officer', 'Non-Teknis')
      ]
    }
  };

  // SABTU (Split)
  cfg['Sabtu'] = {
    pagi: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Teknis'),
        slot('Preparation', 'Foreman/Officer', 'Teknis')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('Quality Assurance', 'Foreman/Officer', 'Teknis')
      ]
    },
    malam: {
      preparasi: [
        slot('Preparation', 'Foreman/Officer', 'Teknis'),
        slot('Preparation', 'Foreman/Officer', 'Teknis')
      ],
      laboratorium: [
        slot('Laboratory', 'Foreman/Officer', 'Teknis'),
        slot('Laboratory', 'Foreman/Officer', 'Teknis')
      ]
    }
  };

  // MINGGU (Gabungan)
  cfg['Minggu'] = {
    pagi: {
      gabungan: [
        slot('All', 'SPV', 'Teknis'),
        slot('All', 'SPV', 'Teknis'),
        slot('All', 'All', 'Teknis')
      ]
    },
    malam: {
      gabungan: []
    }
  };

  return cfg;
}

function tentukanKelas(jabatan) {
  const j = (jabatan || '').toLowerCase();
  if (j.includes('supervisor') || j.includes('spv')) return 'SPV';
  if (j.includes('admin') || j.includes('administrator')) return 'Admin';
  if (j.includes('officer') || j.includes('foreman') || j.includes('analyst') || j.includes('planner')) return 'Foreman/Officer';
  return 'Other';
}

function tentukanDivisi(section, jabatan, name, nik) {
  const n = (name || '').toLowerCase();
  const k = (nik || '').toLowerCase();

  if (n.includes('murti') || k === 'm0403190701') return 'Laboratory';
  if (n.includes('atha') || k === '04d25000053') return 'Laboratory';
  if (n.includes('djody') || n.includes('jody') || k === '02d24000045') return 'Preparation';

  const s = (section || '').toLowerCase();
  const j = (jabatan || '').toLowerCase();

  if (s.includes('ic') || s.includes('inventory')) return 'IC';
  if (s.includes('qa') || s.includes('quality')) return 'Quality Assurance';
  if (s.includes('prep')) return 'Preparation';
  if (s.includes('maintenance') || s.includes('mekanik')) return 'Maintenance';
  if (s.includes('lab')) return 'Laboratory';
  if (s.includes('admin') || s.includes('administrator')) return 'Administration';

  if (j.includes('ic') || j.includes('inventory')) return 'IC';
  if (j.includes('quality') || j.includes('qa') || j.includes('qc')) return 'Quality Assurance';
  if (j.includes('prep')) return 'Preparation';
  if (j.includes('maintenance') || j.includes('mekanik')) return 'Maintenance';
  if (j.includes('lab')) return 'Laboratory';
  if (j.includes('admin') || j.includes('administrator')) return 'Administration';

  return 'All';
}

async function main() {
  const client = await pool.connect();

  console.log('--- TEST 1: Menambahkan Materi Internal Uji Coba ---');
  const insertRes = await client.query(`
    INSERT INTO p5m_materi (judul, kategori, sub_kategori, divisi, is_internal, last_used, file_url)
    VALUES ('[TEST] Uji Coba Prosedur Safety Internal Saturday', 'Teknis', 'Preparation', 'Preparation', TRUE, NULL, 'https://drive.google.com/test')
    RETURNING *;
  `);
  const testMateri = insertRes.rows[0];

  const poolMateri = (await client.query('SELECT * FROM p5m_materi')).rows;
  const allEmps = (await client.query('SELECT * FROM employees')).rows;

  console.log(`Database loaded: ${poolMateri.length} materi, ${allEmps.length} employees`);

  // Logika Pemilihan & Daur Ulang Materi
  const usedMateriIdsInWeek = new Set();
  const warnings = [];
  const exhaustedWarningCategories = new Set();

  const pendingInternalMaterials = poolMateri.filter(m => m.is_internal && m.last_used === null);
  const assignedInternalIds = new Set();

  function pickInternalForSaturday(kategoriTarget, subSessionTipe) {
    const candidates = pendingInternalMaterials.filter(m => {
      if (assignedInternalIds.has(m.id)) return false;
      if (usedMateriIdsInWeek.has(m.id)) return false;

      if (kategoriTarget && kategoriTarget !== 'All') {
        if ((m.kategori || 'Teknis').toLowerCase() !== kategoriTarget.toLowerCase()) return false;
      }

      if ((m.kategori || 'Teknis') === 'Teknis') {
        const subKat = m.sub_kategori || 'General';
        if (subKat === 'General') return true;
        if (subSessionTipe === 'preparasi') return subKat === 'Preparation';
        if (subSessionTipe === 'laboratorium') return subKat === 'Laboratory';
      }
      return true;
    });

    if (candidates.length > 0) {
      const chosen = candidates[0];
      assignedInternalIds.add(chosen.id);
      usedMateriIdsInWeek.add(chosen.id);
      return {
        judul: chosen.judul,
        kategori: chosen.kategori,
        subKategori: chosen.sub_kategori,
        id: chosen.id,
        fileUrl: chosen.file_url
      };
    }
    return null;
  }

  function pilihMateri(divisiTarget, kategoriTarget, materiTetap, candidateDivision, isGabunganSession) {
    if (kategoriTarget === 'Senam' || materiTetap?.toLowerCase().includes('senam')) {
      return { judul: "Senam", kategori: "Senam", subKategori: "General", id: null, fileUrl: null };
    }

    if (materiTetap) {
      return { judul: materiTetap, kategori: kategoriTarget || 'All', subKategori: 'General', id: null, fileUrl: null };
    }

    const effectiveSection = (candidateDivision || divisiTarget || '').toLowerCase();

    function filterPool(pool) {
      return pool.filter(m => {
        const kat = m.kategori || 'Teknis';
        const subKat = m.sub_kategori || 'General';

        if (kategoriTarget && kategoriTarget !== 'All') {
          if (kat.toLowerCase() !== kategoriTarget.toLowerCase()) return false;
        }

        // ATURAN P5M GABUNGAN: Hanya materi General (universal)
        if (isGabunganSession) {
          return subKat === 'General';
        }

        if (kat === 'Non-Teknis') return true;

        if (subKat === 'General') return true;

        if (effectiveSection.includes('lab') || effectiveSection.includes('quality') || effectiveSection.includes('qa') || effectiveSection.includes('qc') || effectiveSection.includes('admin') || effectiveSection.includes('ic')) {
          return subKat === 'Laboratory' || subKat === 'General';
        }

        if (effectiveSection.includes('prep')) {
          return subKat === 'Preparation' || subKat === 'General';
        }

        if (effectiveSection.includes('maintenance') || effectiveSection.includes('mekanik')) {
          return subKat === 'Maintenance' || subKat === 'General';
        }

        return true;
      });
    }

    const matchingPool = filterPool(poolMateri);
    if (matchingPool.length === 0) {
      return {
        judul: isGabunganSession ? "Briefing Operasional & Keselamatan Kerja Terpadu" : "Briefing Teknis Operasional",
        kategori: kategoriTarget || "Teknis",
        subKategori: "General",
        id: null,
        fileUrl: null
      };
    }

    const freshCandidates = matchingPool.filter(m => m.last_used === null && !usedMateriIdsInWeek.has(m.id));
    let selected = null;
    if (freshCandidates.length > 0) {
      selected = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];
    } else {
      let recycleCandidates = matchingPool.filter(m => !usedMateriIdsInWeek.has(m.id));
      if (recycleCandidates.length === 0) recycleCandidates = matchingPool;
      selected = recycleCandidates[0];
    }

    if (selected && selected.id) {
      usedMateriIdsInWeek.add(selected.id);
    }

    return {
      judul: selected.judul,
      kategori: selected.kategori,
      subKategori: selected.sub_kategori,
      id: selected.id,
      fileUrl: selected.file_url
    };
  }

  const uiConfig = buildDefaultConfig();
  const jadwalHasil = {};
  const HARI_GABUNGAN = ['Senin', 'Kamis', 'Jumat', 'Minggu'];

  URUTAN_HARI.forEach((hari, indexHariIni) => {
    const isGabungan = HARI_GABUNGAN.includes(hari);
    const dayCfg = uiConfig[hari] || {};
    const hasilHari = { tipe: isGabungan ? 'gabungan' : 'split', pagi: {}, malam: {} };

    // Pagi
    if (isGabungan) {
      const slots = dayCfg.pagi?.gabungan || [];
      hasilHari.pagi.gabungan = slots.map(sl => {
        let materiRes = (hari === 'Sabtu' && !sl.isSenam && sl.kategori !== 'Senam') ? pickInternalForSaturday(sl.kategori) : null;
        if (!materiRes) {
          materiRes = pilihMateri(sl.divisi, sl.kategori, sl.materiTetap, sl.divisi, true);
        }
        return {
          nama: 'Personil Pagi',
          materi: materiRes.judul,
          kategori: materiRes.kategori,
          subKategori: materiRes.subKategori,
          isSenam: sl.kategori === 'Senam' || Boolean(sl.isSenam),
          materiId: materiRes.id
        };
      });
    } else {
      const slotsPrep = dayCfg.pagi?.preparasi || [];
      const slotsLab = dayCfg.pagi?.laboratorium || [];

      hasilHari.pagi.preparasi = slotsPrep.map(sl => {
        let materiRes = (hari === 'Sabtu' && !sl.isSenam && sl.kategori !== 'Senam') ? pickInternalForSaturday(sl.kategori, 'preparasi') : null;
        if (!materiRes) {
          materiRes = pilihMateri(sl.divisi || 'Preparation', sl.kategori, sl.materiTetap, 'Preparation', false);
        }
        return {
          nama: 'Personil Prep Pagi',
          materi: materiRes.judul,
          kategori: materiRes.kategori,
          subKategori: materiRes.subKategori,
          isSenam: sl.kategori === 'Senam' || Boolean(sl.isSenam),
          materiId: materiRes.id
        };
      });

      hasilHari.pagi.laboratorium = slotsLab.map(sl => {
        let materiRes = (hari === 'Sabtu' && !sl.isSenam && sl.kategori !== 'Senam') ? pickInternalForSaturday(sl.kategori, 'laboratorium') : null;
        if (!materiRes) {
          materiRes = pilihMateri(sl.divisi || 'Laboratory', sl.kategori, sl.materiTetap, 'Laboratory', false);
        }
        return {
          nama: 'Personil Lab Pagi',
          materi: materiRes.judul,
          kategori: materiRes.kategori,
          subKategori: materiRes.subKategori,
          isSenam: sl.kategori === 'Senam' || Boolean(sl.isSenam),
          materiId: materiRes.id
        };
      });
    }

    // Malam
    if (hari !== 'Minggu') {
      if (isGabungan) {
        const slots = dayCfg.malam?.gabungan || [];
        const morningSlots = hasilHari.pagi.gabungan || [];

        hasilHari.malam.gabungan = slots.map((sl, slotIdx) => {
          let materiRes = null;
          if (sl.materiTetap) {
            materiRes = { judul: sl.materiTetap, kategori: sl.kategori || 'All', subKategori: 'General', id: null, fileUrl: null };
          } else if (morningSlots[slotIdx] && morningSlots[slotIdx].materi && !morningSlots[slotIdx].isSenam && !morningSlots[slotIdx].isLogbook) {
            const mSlot = morningSlots[slotIdx];
            materiRes = { judul: mSlot.materi, kategori: mSlot.kategori, subKategori: mSlot.subKategori, id: mSlot.materiId, fileUrl: mSlot.fileUrl };
          } else {
            const matchMorning = morningSlots.find(m => m.kategori === sl.kategori && !m.isSenam && !m.isLogbook);
            if (matchMorning) {
              materiRes = { judul: matchMorning.materi, kategori: matchMorning.kategori, subKategori: matchMorning.subKategori, id: matchMorning.materiId, fileUrl: matchMorning.fileUrl };
            } else {
              materiRes = pilihMateri(sl.divisi, sl.kategori, sl.materiTetap, sl.divisi, true);
            }
          }

          return {
            nama: 'Personil Malam',
            materi: materiRes.judul,
            kategori: materiRes.kategori,
            subKategori: materiRes.subKategori,
            isSenam: sl.kategori === 'Senam' || Boolean(sl.isSenam),
            materiId: materiRes.id
          };
        });
      } else {
        const slotsPrep = dayCfg.malam?.preparasi || [];
        const slotsLab = dayCfg.malam?.laboratorium || [];
        const morningPrep = hasilHari.pagi.preparasi || [];
        const morningLab = hasilHari.pagi.laboratorium || [];

        hasilHari.malam.preparasi = slotsPrep.map((sl, slotIdx) => {
          let materiRes = null;
          if (sl.materiTetap) {
            materiRes = { judul: sl.materiTetap, kategori: sl.kategori || 'All', subKategori: 'General', id: null, fileUrl: null };
          } else if (morningPrep[slotIdx] && morningPrep[slotIdx].materi && !morningPrep[slotIdx].isSenam) {
            const mSlot = morningPrep[slotIdx];
            materiRes = { judul: mSlot.materi, kategori: mSlot.kategori, subKategori: mSlot.subKategori, id: mSlot.materiId, fileUrl: mSlot.fileUrl };
          } else {
            const matchMorning = morningPrep.find(m => m.kategori === sl.kategori && !m.isSenam);
            if (matchMorning) {
              materiRes = { judul: matchMorning.materi, kategori: matchMorning.kategori, subKategori: matchMorning.subKategori, id: matchMorning.materiId, fileUrl: matchMorning.fileUrl };
            } else {
              materiRes = pilihMateri(sl.divisi || 'Preparation', sl.kategori, sl.materiTetap, 'Preparation', false);
            }
          }

          return {
            nama: 'Personil Prep Malam',
            materi: materiRes.judul,
            kategori: materiRes.kategori,
            subKategori: materiRes.subKategori,
            isSenam: sl.kategori === 'Senam' || Boolean(sl.isSenam),
            materiId: materiRes.id
          };
        });

        hasilHari.malam.laboratorium = slotsLab.map((sl, slotIdx) => {
          let materiRes = null;
          if (sl.materiTetap) {
            materiRes = { judul: sl.materiTetap, kategori: sl.kategori || 'All', subKategori: 'General', id: null, fileUrl: null };
          } else if (morningLab[slotIdx] && morningLab[slotIdx].materi && !morningLab[slotIdx].isSenam) {
            const mSlot = morningLab[slotIdx];
            materiRes = { judul: mSlot.materi, kategori: mSlot.kategori, subKategori: mSlot.subKategori, id: mSlot.materiId, fileUrl: mSlot.fileUrl };
          } else {
            const matchMorning = morningLab.find(m => m.kategori === sl.kategori && !m.isSenam);
            if (matchMorning) {
              materiRes = { judul: matchMorning.materi, kategori: matchMorning.kategori, subKategori: matchMorning.subKategori, id: matchMorning.materiId, fileUrl: matchMorning.fileUrl };
            } else {
              materiRes = pilihMateri(sl.divisi || 'Laboratory', sl.kategori, sl.materiTetap, 'Laboratory', false);
            }
          }

          return {
            nama: 'Personil Lab Malam',
            materi: materiRes.judul,
            kategori: materiRes.kategori,
            subKategori: materiRes.subKategori,
            isSenam: sl.kategori === 'Senam' || Boolean(sl.isSenam),
            materiId: materiRes.id
          };
        });
      }
    }

    jadwalHasil[hari] = hasilHari;
  });

  console.log('\n========================================');
  console.log('1. VERIFIKASI HARI GABUNGAN (General Saja)');
  console.log('========================================');
  ['Senin', 'Kamis', 'Jumat', 'Minggu'].forEach(hari => {
    const slotsPagi = jadwalHasil[hari]?.pagi?.gabungan || [];
    const slotsMalam = jadwalHasil[hari]?.malam?.gabungan || [];
    const allSlots = [...slotsPagi, ...slotsMalam];
    const invalidSlots = allSlots.filter(s => s.subKategori && s.subKategori !== 'General');
    console.log(`- ${hari}: ${allSlots.length} sesi, Non-General Topics = ${invalidSlots.length}`);
    if (invalidSlots.length > 0) {
      console.error(`  ❌ Pelanggaran di ${hari}:`, invalidSlots.map(s => ({ materi: s.materi, subKat: s.subKategori })));
    } else {
      console.log(`  ✅ Semua materi ${hari} adalah GENERAL (universal).`);
    }
  });

  console.log('\n========================================');
  console.log('2. VERIFIKASI SINKRONISASI PAGI & MALAM');
  console.log('========================================');
  ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'].forEach(hari => {
    const isGabungan = ['Senin', 'Kamis', 'Jumat'].includes(hari);
    if (isGabungan) {
      const pMateri = (jadwalHasil[hari]?.pagi?.gabungan || []).map(s => s.materi);
      const mMateri = (jadwalHasil[hari]?.malam?.gabungan || []).map(s => s.materi);
      console.log(`- ${hari} (Gabungan):`);
      console.log(`  Pagi :`, pMateri);
      console.log(`  Malam:`, mMateri);
      const match = JSON.stringify(pMateri.slice(0, mMateri.length)) === JSON.stringify(mMateri);
      console.log(`  👉 Status Sinkronisasi: ${match ? '✅ SAMA PERSIS' : 'ℹ️ Sesuai ketersediaan'}`);
    } else {
      const prepPagi = (jadwalHasil[hari]?.pagi?.preparasi || []).map(s => s.materi);
      const prepMalam = (jadwalHasil[hari]?.malam?.preparasi || []).map(s => s.materi);
      const labPagi = (jadwalHasil[hari]?.pagi?.laboratorium || []).map(s => s.materi);
      const labMalam = (jadwalHasil[hari]?.malam?.laboratorium || []).map(s => s.materi);
      console.log(`- ${hari} (Split):`);
      console.log(`  Prep Pagi :`, prepPagi);
      console.log(`  Prep Malam:`, prepMalam);
      console.log(`  Lab Pagi  :`, labPagi);
      console.log(`  Lab Malam :`, labMalam);
      const matchPrep = JSON.stringify(prepPagi.slice(0, prepMalam.length)) === JSON.stringify(prepMalam);
      const matchLab = JSON.stringify(labPagi.slice(0, labMalam.length)) === JSON.stringify(labMalam);
      console.log(`  👉 Status Sinkronisasi Prep: ${matchPrep ? '✅ SAMA PERSIS' : 'ℹ️ Berbeda'}`);
      console.log(`  👉 Status Sinkronisasi Lab : ${matchLab ? '✅ SAMA PERSIS' : 'ℹ️ Berbeda'}`);
    }
  });

  console.log('\n========================================');
  console.log('3. VERIFIKASI MATERI INTERNAL HARI SABTU');
  console.log('========================================');
  const sabtuPrep = jadwalHasil['Sabtu']?.pagi?.preparasi || [];
  const sabtuLab = jadwalHasil['Sabtu']?.pagi?.laboratorium || [];
  const sabtuAll = [...sabtuPrep, ...sabtuLab];
  const foundInternal = sabtuAll.find(s => s.materi && s.materi.includes('[TEST] Uji Coba'));
  if (foundInternal) {
    console.log(`  ✅ Berhasil! Materi internal dijadwalkan di Sabtu Pagi: "${foundInternal.materi}" (Kategori: ${foundInternal.kategori}, Sub: ${foundInternal.subKategori})`);
  } else {
    console.log(`  ℹ️ Materi di Sabtu:`, sabtuAll.map(s => s.materi));
  }

  // Cleanup test record
  await client.query("DELETE FROM p5m_materi WHERE judul LIKE '[TEST]%'");
  console.log('\n✓ Record uji coba berhasil dibersihkan dari database.');

  client.release();
  await pool.end();
}

main().catch(console.error);
