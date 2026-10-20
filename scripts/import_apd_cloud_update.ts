import fs from 'fs';
import { db, pool } from '../src/db/index.js';
import { employees, apdHistory } from '../src/db/schema.js';
import { eq } from 'drizzle-orm';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  webViewLink?: string;
  fullPath: string;
}

function normalizeStr(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/['’`"]/g, '')
    .replace(/[._\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ALIASES: Record<string, string> = {
  'muhammad alif': 'M0402240078',
  'muh alif': 'M0402240078',
  'm tarmmizi': 'M0404220419',
  'm tarmizi': 'M0404220419',
  'fahdin s kadin': 'M0402240108',
  'risaldi i arifin': 'M0202220068',
  'rifandi samsudin': 'M0202220068',
  'hadi muabarak': 'M0204250504',
  'nyong dokulamo': 'nyong dokolamo',
  'muhammad nof nurleti': 'muhamad nof nurleti',
  'firmansyah tueka': 'firmansya tueka',
  'm nasir': 'muhammad nasir',
  'nazar': 'nezar',
  'm ficky aciman': 'm fiky aciman',
  'harji la illa': 'harji la ila',
  'darno la bunghari': 'darno la bungahari',
  'dulmihdad': 'dulmihdat tomayou',
  'darmin wabula': 'muslim wabula',
  'harji la ila': 'harji la ila',
  'la ode ali wara': 'la ode ali wara',
  'la ode aliwara': 'la ode ali wara',
  'buce bobrikit': 'buce',
  'muhammad fandy': 'muhammad fandy septiawan',
  'muhammad reza satria': 'muhammad reza satria',
  'karlos yafet': 'karlos yafet',
  'saman la bunga': 'sarman la bunga',
  'karolus megawanto': 'karlos yafet',
  'muh dirgahayu risaldi': 'muh dirgahayu risaldi',
  'muh dirgahayu': 'muh dirgahayu risaldi',
  'm dirgahayu': 'muh dirgahayu risaldi',
  'muh ikbal': 'muhammad iqbal',
  'muh iqbal': 'muhammad iqbal',
  'agim mailana': 'agim maulana',
  'agim': 'agim maulana',
  'agim maulana bamawi': 'agim maulana',
  'agim maulana barmawi': 'agim maulana',
  'jasrijaya ikram': 'jasri',
  'jasri wijaya ikram': 'jasri',
  'jasri wijaya': 'jasri',
  'suryadi lasamusu': 'suryadi la samusu',
  'ahma jusma': 'ahmad jusma azhari annur',
  'la juanda la ce': 'la juanda',
  'lajojo': 'la jojo',
  'suryadi la junaidi': 'suryadi la samusu',
  'moh irsan': 'moh. irsan lajunaidi',
  'h hendra alfons': 'hendra alfons',
  'salim h hasan': 'salim hi. hasan',
  'alfris': 'alfris badaruni',
  'arland': 'arlan',
  'kardi tamsil': 'kardi tamsil',
  'robinson': 'robinson sumtaki',
  'jarfin': 'jarfin saharudin',
  'jarfin sahrudin': 'jarfin saharudin',
  'randi nasardudin': 'randi nasarudin',
  'muhammad syaifuddin z': 'muhamad syaifuddin z',
  'marlon tukan': 'marlon tukan',
  'samuel skiffer': 'samuel skiffer',
  'azzam zufri': 'azzam jufri',
  'azzam jufri': 'azzam jufri',
  'sirajudin': 'sirajuddin',
  'marlin hayati': 'marlin muhammad',
  'andi haji': 'andi haji',
  'anggi': 'anggi',
  'ryan tiarna': 'ryan tiarna',
  'muhammad alfin': 'muhamad alvin febriansyah',
  'arif m lessy': 'arif maulana lessy',
  'rizal rajab': 'rizal zaelani',
  'sardin la harmoto': 'sardin',
  'sardin la harmono': 'sardin',
  'sumarlin muhammad': 'marlin muhammad',
  'saman dokulamo': 'nyong dokolamo',
  'muh yusi mubarak': 'M0407250859',
  'muh. yusi mubarak': 'M0407250859',
  'm hadi muabarak': 'M0204250504',
  'm. hadi muabarak': 'M0204250504',
  'dulhmidat tomayou': 'M0401230050',
  'janter jaya barimbig': '04D19000564',
  'muhammad alvin febriansyah': '02D24000043',
  'samuel skifer kella': 'samuel skiffer',
  'kevin gibran momoto': 'kevin gibran',
  'kevin tandayu': 'kevin',
  'galih ingkang rahayu': 'galih',
  'muhammad imam perdana': 'imam perdana'
};

function parseApdFromFolderOrName(fileName: string, fullPath: string): string[] {
  const normPath = fullPath.toLowerCase();
  const normName = fileName.toLowerCase();

  // Deteksi jenis APD dari path folder
  if (normPath.includes('/jas laboratorium') || normPath.includes('/jas lab')) {
    return ['Jas Laboratorium'];
  }
  if (normPath.includes('/filter masker moncong') || normPath.includes('/filter')) {
    return ['Filter Masker Moncong (3M)'];
  }
  if (normPath.includes('/masker moncong') || normPath.includes('/masker 3m')) {
    return ['Masker Moncong (3M)'];
  }
  if (normPath.includes('/safety glass') || normPath.includes('/kacamata')) {
    return ['Safety Glass'];
  }
  if (normPath.includes('/sandal safety') || normPath.includes('/sendal safety')) {
    return ['Sandal Safety'];
  }
  if (normPath.includes('/earmuff')) {
    return ['Earmuff'];
  }
  if (normPath.includes('/earplug')) {
    return ['Earplug'];
  }
  if (normPath.includes('/stagen')) {
    return ['Stagen'];
  }
  if (normPath.includes('/safety vest') || normPath.includes('/rompi')) {
    return ['Safety Vest (Rompi)'];
  }
  if (normPath.includes('/sepatu safety')) {
    return ['Sepatu Safety'];
  }

  // Jika tidak di folder khusus, deteksi dari suffix nama file
  const baseName = fileName.replace(/\.pdf$/i, '').trim();
  const apdItems: string[] = [];
  if (/safety glass|kacamata|sg/i.test(baseName)) apdItems.push('Safety Glass');
  if (/masker moncong|mm/i.test(baseName)) apdItems.push('Masker Moncong (3M)');
  if (/filter/i.test(baseName)) apdItems.push('Filter Masker Moncong (3M)');
  if (/jas lab|jl/i.test(baseName)) apdItems.push('Jas Laboratorium');
  if (/sandal|sendal|ss/i.test(baseName)) apdItems.push('Sandal Safety');
  if (/earmuff/i.test(baseName)) apdItems.push('Earmuff');
  if (/earplug/i.test(baseName)) apdItems.push('Earplug');
  if (/stagen/i.test(baseName)) apdItems.push('Stagen');

  return apdItems.length > 0 ? apdItems : ['Safety Glass'];
}

function parseFileDateAndName(fileName: string, fullPath: string) {
  if (!fileName.toLowerCase().endsWith('.pdf')) return null;

  let baseName = fileName.replace(/\.pdf$/i, '').trim();

  // Bersihkan penulisan tanggal seperti 12-04-25 yang menempel di nama (contoh: Artini12-04-25)
  baseName = baseName.replace(/([a-zA-Z])(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/, '$1 $2');

  // Coba match tanggal format DD-MM-YY atau DD-MM-YYYY atau DD-MM-X-YY (typo)
  const dateRegex = /(\d{1,2})[-/](\d{1,2})[-/](\d{1,2}[-/])?(\d{2,4})(?:-(\d))?/;
  const match = baseName.match(dateRegex);

  let employeeNamePart = '';
  let parsedDate: Date | null = null;

  if (match) {
    employeeNamePart = baseName.substring(0, match.index).trim();
    let day = parseInt(match[1], 10);
    let month = parseInt(match[2], 10);
    let year = parseInt(match[4] || match[3] || '2024', 10);
    if (year < 100) year += 2000;
    if (year === 20 && match[5]) {
      year = 2020 + parseInt(match[5], 10);
    }
    if (month > 12 && day <= 12) {
      const tmp = day; day = month; month = tmp;
    }
    parsedDate = new Date(Date.UTC(year, month - 1, day));
  } else {
    // Ambil tahun dari folder (mis. APD 2024 -> 2024-06-15)
    const folderYearMatch = fullPath.match(/APD\s+(\d{4})/i);
    const yr = folderYearMatch ? parseInt(folderYearMatch[1], 10) : 2024;
    parsedDate = new Date(Date.UTC(yr, 5, 15)); // Default Juni
    employeeNamePart = baseName.replace(/Safety Glass|Masker|Filter|Jas Lab|Sandal|Earmuff|Earplug|Stagen/gi, '').trim();
  }

  // Bersihkan kode SG/MM/FM di belakang nama
  employeeNamePart = employeeNamePart.replace(/\s+(SG|MM|FM|JL|SS)$/i, '').replace(/[-_.]+$/, '').trim();
  const apdItems = parseApdFromFolderOrName(fileName, fullPath);

  return {
    rawName: fileName,
    employeeNamePart,
    parsedDate,
    apdItems
  };
}

async function run() {
  const isExecute = process.argv.includes('--execute');
  console.log(`=== SINKRONISASI DATA DISTRIBUSI APD DARI PREPLAB CLOUD ===`);
  console.log(`Target: Folder 'Inventory Control/ History Pengambilan APD (Update)'`);
  console.log(`Mode: ${isExecute ? 'EXECUTE (PENYIMPANAN DATABASE POSTGRESQL)' : 'DRY-RUN (SIMULASI VALIDASI)'}`);

  const raw = fs.readFileSync('C:/Users/Meida/.gemini/antigravity-ide/brain/ca63af03-09f2-47b0-9656-b207af752648/scratch/update_apd_files.json', 'utf8');
  const files: DriveFile[] = JSON.parse(raw);
  console.log(`Total file terdeteksi di Cloud: ${files.length}`);

  const allEmps = await db.select().from(employees);
  const existingHistory = await db.select().from(apdHistory);

  console.log(`Total Master Karyawan di DB: ${allEmps.length}`);
  console.log(`Total Riwayat APD yang sudah ada di DB: ${existingHistory.length}`);

  const existingMap = new Map<string, any>();
  for (const h of existingHistory) {
    const dStr = h.dateTaken ? new Date(h.dateTaken).toISOString().slice(0, 10) : '';
    const key = `${(h.nik || '').trim().toLowerCase()}_${(h.itemName || '').trim().toLowerCase()}_${dStr}`;
    existingMap.set(key, h);
  }

  const toInsert: any[] = [];
  const toUpdate: any[] = [];
  const unmatched: any[] = [];

  for (const file of files) {
    const parsed = parseFileDateAndName(file.name, file.fullPath);
    if (!parsed) continue;

    const norm = normalizeStr(parsed.employeeNamePart);
    let emp = allEmps.find(e => normalizeStr(e.name) === norm);

    if (!emp && ALIASES[norm]) {
      const aliasTarget = ALIASES[norm];
      emp = allEmps.find(e => e.nik.toLowerCase() === aliasTarget.toLowerCase());
      if (!emp) {
        emp = allEmps.find(e => normalizeStr(e.name).includes(aliasTarget.toLowerCase()) || aliasTarget.toLowerCase().includes(normalizeStr(e.name)));
      }
    }

    if (!emp) {
      emp = allEmps.find(e => {
        const ne = normalizeStr(e.name);
        return ne === norm || ne.includes(norm) || norm.includes(ne);
      });
    }

    if (!emp) {
      const parts = norm.split(' ').filter(w => w.length > 2);
      for (const p of parts) {
        emp = allEmps.find(e => normalizeStr(e.name).includes(p));
        if (emp) break;
      }
    }

    if (!emp) {
      unmatched.push({ file: file.name, parsedName: parsed.employeeNamePart, fullPath: file.fullPath });
      emp = { nik: '-', name: parsed.employeeNamePart, pt: 'TBP' } as any;
    }

    const driveUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
    const dateStr = parsed.parsedDate ? parsed.parsedDate.toISOString().slice(0, 10) : '';

    for (const item of parsed.apdItems) {
      const key = `${emp.nik.trim().toLowerCase()}_${item.trim().toLowerCase()}_${dateStr}`;
      const existing = existingMap.get(key);

      if (existing) {
        if (!existing.photoUrl || existing.photoUrl !== driveUrl) {
          toUpdate.push({ id: existing.id, photoUrl: driveUrl, name: emp.name, item, dateStr });
        }
      } else {
        const newEntry = {
          nik: emp.nik,
          name: emp.name,
          itemName: item,
          dateTaken: parsed.parsedDate || new Date(),
          photoUrl: driveUrl,
          pt: emp.pt || 'TBP',
          isDeleted: false
        };
        toInsert.push(newEntry);
        existingMap.set(key, newEntry);
      }
    }
  }

  console.log(`\n--- HASIL ANALISIS & PENCOCOKAN ---`);
  console.log(`Matched Files: ${files.length - unmatched.length} / ${files.length} (${(((files.length - unmatched.length) / files.length) * 100).toFixed(1)}%)`);
  console.log(`Unmatched Files: ${unmatched.length}`);
  console.log(`Data Baru yang Siap Ditambahkan ke DB (toInsert): ${toInsert.length}`);
  console.log(`Data Yang Diperbarui Link Dokumennya (toUpdate): ${toUpdate.length}`);

  if (unmatched.length > 0) {
    console.log(`\nDaftar file yang belum match:`);
    console.log(JSON.stringify(unmatched, null, 2));
  }

  if (isExecute) {
    console.log(`\n[DATABASE WRITE] Menyimpan pembaruan ke tabel PostgreSQL apd_history...`);
    // 1. Update existing photo URLs
    let updatedCount = 0;
    for (const u of toUpdate) {
      await db.update(apdHistory).set({ photoUrl: u.photoUrl }).where(eq(apdHistory.id, u.id));
      updatedCount++;
    }
    console.log(`✅ Berhasil memperbarui ${updatedCount} link dokumen PDF yang sudah ada.`);

    // 2. Insert new records in safe chunks
    let insertedCount = 0;
    const CHUNK_SIZE = 50;
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      const chunk = toInsert.slice(i, i + CHUNK_SIZE);
      await db.insert(apdHistory).values(chunk);
      insertedCount += chunk.length;
    }
    console.log(`✅ Berhasil memasukkan ${insertedCount} data riwayat baru ke tabel apd_history!`);
    console.log(`🎉 SELURUH DATA DISTRIBUSI APD DARI CLOUD SELESAI DIPERBARUI!`);
  }
}

run()
  .then(() => pool.end())
  .catch(err => {
    console.error(err);
    pool.end();
  });
