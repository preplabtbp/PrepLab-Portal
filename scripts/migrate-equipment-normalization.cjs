require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

// Import normalizer logic
function normalizeEquipment(rawName, rawCode, rawCategory) {
  const code = (rawCode || '').trim() || '-';
  const name = (rawName || '').trim();

  if (!name || name === '-') {
    return {
      name: 'Peralatan Non-Instrument Lainnya',
      code,
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  const lower = name.toLowerCase();

  // 1. Check for Test / Dummy entries (must not collide with metallurgical "screen test")
  if (!lower.includes('screen test') && (
    lower === 'test' || 
    lower.startsWith('test ') || 
    lower.startsWith('testing') || 
    lower.includes('dummy') || 
    lower.includes('percobaan') ||
    lower === 'testing wo' ||
    code.toUpperCase() === 'TEST'
  )) {
    return {
      name: 'Test Entry',
      code: 'TEST',
      category: 'Test',
      isInstrument: false,
      isTest: true
    };
  }

  // 2. Misclassified instruments
  if (lower.includes('modutemp') || lower.includes('jaw crusher') || lower.includes('pulverizer')) {
    if (lower.includes('talang') || lower.includes('platform insert')) {
      return {
        name: 'Aksesori Pulverizer (Talang/Platform)',
        code,
        category: 'Non-Instrument (PL)',
        isInstrument: false,
        isTest: false
      };
    }
    if (lower.includes('modutemp')) {
      return {
        name: 'MODUTEMP',
        code: code !== '-' ? code : 'MODUTEMP',
        category: 'Instrument (L)',
        isInstrument: true,
        isTest: false
      };
    }
    if (lower.includes('jaw crusher')) {
      return {
        name: 'BIG JAW CRUSHER',
        code: code !== '-' ? code : 'CRUSHER',
        category: 'Instrument (L)',
        isInstrument: true,
        isTest: false
      };
    }
  }

  // Check if it's Mesin Press
  if (lower.includes('mesin press') || lower.includes('mesjn press')) {
    if (lower.includes('karpet') || lower.includes('gagang cutter')) {
      return {
        name: 'Perlengkapan Ruang Press',
        code,
        category: 'Non-Instrument (PL)',
        isInstrument: false,
        isTest: false
      };
    }
    return {
      name: 'MESIN PRESS',
      code: code !== '-' ? code : 'MP',
      category: 'Instrument (L)',
      isInstrument: true,
      isTest: false
    };
  }

  // 3. Gerobak Arco (arco / argo / arko / artco)
  if (lower.includes('gerobak') || lower.includes('arco') || lower.includes('artco') || lower.includes('argo')) {
    return {
      name: 'Gerobak Arco',
      code: code !== '-' ? code : 'GA',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 4. Sieve Shaker vs Ayakan Screen Test
  if (lower.includes('sieve shaker') || lower.includes('shieve shaker')) {
    return {
      name: 'Sieve Shaker',
      code: code !== '-' ? code : 'SS',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  if (lower.includes('screen test') || lower.includes('ayakan') || lower.includes('mash') || lower.includes('mesh')) {
    return {
      name: 'Ayakan Screen Test 200 Mesh',
      code: code !== '-' ? code : 'AST',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 5. Sekrap
  if (lower.includes('sekrap')) {
    return {
      name: 'Sekrap',
      code,
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 6. Sekop / Skop
  if (lower.includes('skop') || lower.includes('sekop')) {
    if (lower.includes('15') || lower.includes('15d') || lower.includes('15 d')) {
      return {
        name: 'Sekop JIS 15D',
        code: code !== '-' ? code : 'SK-15D',
        category: 'Non-Instrument (PL)',
        isInstrument: false,
        isTest: false
      };
    }
    if (lower.includes('30') || lower.includes('30d') || lower.includes('30 d') || lower.includes('bangunan')) {
      return {
        name: 'Sekop JIS 30D',
        code: code !== '-' ? code : 'SK-30D',
        category: 'Non-Instrument (PL)',
        isInstrument: false,
        isTest: false
      };
    }
    if (lower.includes('mixing')) {
      return {
        name: 'Sekop Mixing',
        code: code !== '-' ? code : 'SK-MIX',
        category: 'Non-Instrument (PL)',
        isInstrument: false,
        isTest: false
      };
    }
    return {
      name: 'Sekop Besar / Ujung Rata',
      code: code !== '-' ? code : 'SK-BSR',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 7. Lampu & Penerangan
  if (lower.includes('lampu') || lower.includes('bohlam') || lower.includes('balon lampu') || lower.includes('saklar')) {
    return {
      name: 'Lampu & Penerangan',
      code: code !== '-' ? code : 'LMP',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 8. Exhaust Fan / Blower
  if (lower.includes('exhaust') || lower.includes('hexos') || lower.includes('blower')) {
    return {
      name: 'Exhaust Fan',
      code: code !== '-' ? code : 'EXH',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 9. Pintu, Handle, Kunci, Roda Pintu
  if (lower.includes('pintu') || lower.includes('door') || lower.includes('kunci') || lower.includes('handle pintu')) {
    return {
      name: 'Pintu & Aksesoris',
      code: code !== '-' ? code : 'PNT',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 10. Kursi & Bangku
  if (lower.includes('kursi') || lower.includes('bangku')) {
    return {
      name: 'Kursi & Bangku',
      code: code !== '-' ? code : 'KRS',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 11. Keran & Pipa Air
  if (lower.includes('keran') || lower.includes('kran') || lower.includes('pipa air')) {
    return {
      name: 'Keran & Pipa Air',
      code: code !== '-' ? code : 'KRN',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 12. Meja Kerja / Workbench
  if (lower.includes('workbench') || lower.includes('workbanch') || lower.includes('meja')) {
    return {
      name: 'Meja Kerja (Workbench)',
      code: code !== '-' ? code : 'WB',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 13. Plafon & Dinding / Partisi
  if (lower.includes('plafon')) {
    return {
      name: 'Plafon',
      code: code !== '-' ? code : 'PLF',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }
  if (lower.includes('dinding') || lower.includes('partisi') || lower.includes('lantai') || lower.includes('roda sekat')) {
    return {
      name: 'Dinding & Partisi Fasilitas',
      code: code !== '-' ? code : 'PRT',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 14. Tropol Sampel
  if (lower.includes('tropol')) {
    return {
      name: 'Tropol Sampel',
      code: code !== '-' ? code : 'TRP',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 15. Evacuable Pellet Disk
  if (lower.includes('evacuable') || lower.includes('pellet disk')) {
    return {
      name: 'Evacuable Pellet Disk',
      code: code !== '-' ? code : 'EPD',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 16. Alat Housekeeping / Sanitasi
  if (
    lower.includes('sapu') || 
    lower.includes('kain pel') || 
    lower.includes('pel lantai') || 
    lower.includes('cukur karet') || 
    lower.includes('tarikan air') || 
    lower.includes('housekeeping')
  ) {
    return {
      name: 'Alat Housekeeping (Sapu / Pel / Karet)',
      code: code !== '-' ? code : 'HK',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 17. Tempat Sampah & Box Limbah
  if (lower.includes('tempat sampah') || lower.includes('box limbah') || lower.includes('limbah')) {
    return {
      name: 'Tempat Sampah & Limbah',
      code: code !== '-' ? code : 'TSP',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 18. Air Conditioner (AC)
  if (lower.includes('air conditioner') || lower.includes('ac ') || lower === 'ac' || lower.includes('swing ac')) {
    return {
      name: 'Air Conditioner (AC)',
      code: code !== '-' ? code : 'AC',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 19. Eye wash
  if (lower.includes('eye wash') || lower.includes('eyewash')) {
    return {
      name: 'Eye Wash',
      code: code !== '-' ? code : 'EW',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 20. Scrubber
  if (lower.includes('scrubber')) {
    return {
      name: 'Scrubber',
      code: code !== '-' ? code : 'SCB',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 21. Kompresor & Selang
  if (lower.includes('kompresor')) {
    return {
      name: 'Kompresor & Selang Udara',
      code: code !== '-' ? code : 'KMP',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }
  if (lower.includes('selang gas') || lower.includes('helium')) {
    return {
      name: 'Selang Gas & Regulator',
      code: code !== '-' ? code : 'SGR',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 22. Papan Informasi & Dokumen
  if (lower.includes('papan informasi') || lower.includes('box dokumen')) {
    return {
      name: 'Papan Informasi & Dokumen',
      code: code !== '-' ? code : 'INF',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 23. Perkakas / Tooling
  if (lower.includes('martil') || lower.includes('cutter')) {
    return {
      name: 'Perkakas / Tooling',
      code: code !== '-' ? code : 'TLS',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 24. IT & Kelistrikan
  if (lower.includes('komputer') || lower.includes('monitor') || lower.includes('cpu') || lower.includes('kabel') || lower.includes('ups')) {
    return {
      name: 'Perangkat IT & Kelistrikan',
      code: code !== '-' ? code : 'IT',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  // 25. Gantungan / Rak Sampel
  if (lower.includes('gantungan') || lower.includes('pengait')) {
    return {
      name: 'Gantungan / Pengait Sampel',
      code: code !== '-' ? code : 'GNT',
      category: 'Non-Instrument (PL)',
      isInstrument: false,
      isTest: false
    };
  }

  const cleanTitle = name.replace(/\s+/g, ' ').trim();
  const isInst = (rawCategory || '').toLowerCase().includes('instrument') && !(rawCategory || '').toLowerCase().includes('non');

  return {
    name: cleanTitle,
    code,
    category: isInst ? 'Instrument (L)' : 'Non-Instrument (PL)',
    isInstrument: isInst,
    isTest: false
  };
}

async function run() {
  const isExecute = process.argv.includes('--execute');
  console.log(`=== MIGRATION WORK ORDERS EQUIPMENT NORMALIZATION ===`);
  console.log(`Mode: ${isExecute ? 'EXECUTE (Updating database)' : 'DRY-RUN (Preview only)'}`);

  const rows = await pool.query(`
    SELECT id, equipment_name, equipment_code, category 
    FROM work_orders
    ORDER BY id ASC;
  `);

  console.log(`Total rows in work_orders: ${rows.rows.length}`);

  let updateCount = 0;
  const updates = [];

  for (const r of rows.rows) {
    const origCat = (r.category || '').toLowerCase();
    const isOrigInstrument = origCat.includes('instrument') && !origCat.includes('non');

    // Only non-instrument or misclassified items need normalization
    const norm = normalizeEquipment(r.equipment_name, r.equipment_code, r.category);

    // If it was an instrument and stays an instrument with the same name, skip
    if (isOrigInstrument && norm.isInstrument && norm.name.toLowerCase() === (r.equipment_name || '').toLowerCase().trim()) {
      continue;
    }

    const needsNameUpdate = r.equipment_name !== norm.name;
    const needsCodeUpdate = (!r.equipment_code || r.equipment_code === '-' || r.equipment_code.trim() === '') && norm.code !== '-';
    const targetCat = norm.isTest ? 'Test' : (norm.isInstrument ? 'Instrument' : 'Non-Instrument');
    const needsCatUpdate = (r.category || '').trim() !== targetCat;

    if (needsNameUpdate || needsCodeUpdate || needsCatUpdate) {
      updateCount++;
      updates.push({
        id: r.id,
        origName: r.equipment_name,
        newName: norm.name,
        origCode: r.equipment_code,
        newCode: needsCodeUpdate ? norm.code : r.equipment_code,
        origCat: r.category,
        newCat: targetCat
      });
    }
  }

  console.log(`Found ${updateCount} rows needing normalization.`);

  // Sample preview of changes
  console.log("\nSample changes (First 25):");
  updates.slice(0, 25).forEach((u, i) => {
    console.log(`${i+1}. [ID: ${u.id}]`);
    console.log(`   Name: "${u.origName}" -> "${u.newName}"`);
    console.log(`   Cat:  "${u.origCat}" -> "${u.newCat}"`);
    if (u.origCode !== u.newCode) {
      console.log(`   Code: "${u.origCode}" -> "${u.newCode}"`);
    }
  });

  if (isExecute) {
    console.log("\nExecuting updates in transaction...");
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const u of updates) {
        await client.query(`
          UPDATE work_orders 
          SET 
            equipment_name = $1,
            equipment_code = $2,
            category = $3
          WHERE id = $4;
        `, [u.newName, u.newCode, u.newCat, u.id]);
      }
      await client.query('COMMIT');
      console.log(`Successfully updated ${updates.length} work orders in database!`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error("Failed to execute updates, rolled back:", err);
    } finally {
      client.release();
    }
  } else {
    console.log(`\nTo execute updates to database, run:\nnode scripts/migrate-equipment-normalization.cjs --execute`);
  }

  await pool.end();
}

run().catch(console.error);
