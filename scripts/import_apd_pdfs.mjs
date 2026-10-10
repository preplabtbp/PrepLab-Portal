import fs from 'fs';
import { db } from './src/db/index.js';
import { employees, apdHistory } from './src/db/schema.js';
import { eq, sql } from 'drizzle-orm';

function normalizeStr(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[._\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const ALIASES = {
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
  'rizal rajab': 'rizal zaelani'
};

function parseFilename(fileName, fullPath) {
  if (!fileName.toLowerCase().endsWith('.pdf')) return null;

  const baseName = fileName.replace(/\.pdf$/i, '').trim();
  // Skip scanned bulk binders
  if (/^(januari|februari|februar|maret|april|mei|juni|juli|agustus|september|oktober|november|desember)\s+\d+/i.test(baseName)) return null;
  if (/^april\s+lanjutan/i.test(baseName)) return null;

  const dateRegex = /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})(?:-(\d))?/;
  const match = baseName.match(dateRegex);

  let employeeNamePart = '';
  let parsedDate = null;
  let apdCodePart = '';

  if (match) {
    employeeNamePart = baseName.substring(0, match.index).trim();
    const dateStr = match[0];
    apdCodePart = baseName.substring(match.index + dateStr.length).trim();

    let day = parseInt(match[1], 10);
    let month = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    if (year === 20 && match[4]) {
      year = 2020 + parseInt(match[4], 10);
    }
    if (month > 12 && day <= 12) {
      const tmp = day; day = month; month = tmp;
    }
    parsedDate = new Date(Date.UTC(year, month - 1, day));
  } else {
    const apdEndRegex = /(Earmuff|Earmuf|Earplug|Stagen|SG|JL|SS|MM|FM|Filter)$/i;
    const endMatch = baseName.match(apdEndRegex);
    if (endMatch) {
      employeeNamePart = baseName.substring(0, endMatch.index).trim();
      apdCodePart = endMatch[0];
    } else {
      employeeNamePart = baseName;
      apdCodePart = '';
    }

    const folderYearMatch = fullPath.match(/APD\s+(\d{4})/i);
    const folderMonthMatch = fullPath.match(/(\d{2})\.\s*([a-zA-Z]+)/);
    const yr = folderYearMatch ? parseInt(folderYearMatch[1], 10) : 2024;
    const mo = folderMonthMatch ? parseInt(folderMonthMatch[1], 10) : 6;
    parsedDate = new Date(Date.UTC(yr, mo - 1, 15));
  }

  employeeNamePart = employeeNamePart.replace(/[-_.]+$/, '').trim();

  // APD Mapping rules:
  // MM = Masker Moncong (3M)
  // SG = Safety Glass
  // JL = Jas Lab
  // FM = Filter Masker
  // SS = Sandal Safety
  const cleanApd = apdCodePart.replace(/^[-_\s]+/, '').trim();
  const apdItems = [];
  const parts = cleanApd.split(/[-+/&]/).map(p => p.trim()).filter(Boolean);

  for (const p of parts) {
    const up = p.toUpperCase();
    if (up === 'MM' || up === 'M') {
      apdItems.push('Masker Moncong (3M)');
    } else if (up === 'FM' || up === 'F' || up === 'FF' || up === 'FILTER') {
      apdItems.push('Filter Masker Moncong (3M)');
    } else if (up === 'SG') {
      apdItems.push('Safety Glass');
    } else if (up === 'JL' || up === 'JS' || up === 'JAS' || up.includes('LAB')) {
      apdItems.push('Jas Laboratorium');
    } else if (up === 'SS' || up === 'SANDAL') {
      apdItems.push('Sandal Safety');
    } else if (up.includes('EARMUF') || up.includes('ERAMUFF')) {
      apdItems.push('Earmuff');
    } else if (up.includes('EARPLUG') || up === 'E' || up === 'EP') {
      apdItems.push('Earplug');
    } else if (up.includes('STAGEN')) {
      apdItems.push('Stagen');
    } else if (up.includes('ROMPI') || up.includes('VEST')) {
      apdItems.push('Safety Vest (Rompi)');
    } else if (up.includes('SEPATU')) {
      apdItems.push('Sepatu Safety');
    } else if (p) {
      apdItems.push(p);
    }
  }

  // Fallback if no APD code identified but folder has hints, or default to Masker Moncong / Safety Glass
  if (apdItems.length === 0) {
    apdItems.push('Safety Glass');
  }

  return {
    rawName: fileName,
    employeeNamePart,
    parsedDate,
    apdItems
  };
}

async function runImport(isDryRun = true) {
  const allEmps = await db.select().from(employees);
  const files = JSON.parse(fs.readFileSync('all_apd_files.json', 'utf8'));
  const existingHistory = await db.select().from(apdHistory);

  console.log(`Starting APD PDF Import (DryRun=${isDryRun})`);
  console.log(`Total files: ${files.length}, Total employees: ${allEmps.length}, Existing history records: ${existingHistory.length}`);

  const existingMap = new Map();
  for (const h of existingHistory) {
    const dateStr = h.dateTaken ? new Date(h.dateTaken).toISOString().slice(0, 10) : '';
    const key = `${(h.nik || '').trim().toLowerCase()}_${(h.itemName || '').trim().toLowerCase()}_${dateStr}`;
    existingMap.set(key, h);
  }

  let totalMatchedFiles = 0;
  let totalInsertedEntries = 0;
  let totalUpdatedEntries = 0;
  const skippedFiles = [];
  const unmatchedFiles = [];
  const toInsert = [];
  const toUpdate = [];

  for (const file of files) {
    const parsed = parseFilename(file.name, file.fullPath);
    if (!parsed) {
      skippedFiles.push(file.name);
      continue;
    }

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
        return ne.includes(norm) || norm.includes(ne);
      });
    }

    if (!emp) {
      const targetWords = norm.split(' ').filter(w => w.length > 2);
      if (targetWords.length >= 2) {
        emp = allEmps.find(e => {
          const ne = normalizeStr(e.name);
          return targetWords.every(w => ne.includes(w));
        });
      }
    }

    if (!emp) {
      unmatchedFiles.push({ fileName: file.name, parsedName: parsed.employeeNamePart });
      continue;
    }

    totalMatchedFiles++;
    const driveUrl = file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`;
    const dateStr = parsed.parsedDate.toISOString().slice(0, 10);

    for (const item of parsed.apdItems) {
      const key = `${emp.nik.trim().toLowerCase()}_${item.trim().toLowerCase()}_${dateStr}`;
      const existing = existingMap.get(key);

      if (existing) {
        if (!existing.photoUrl || existing.photoUrl !== driveUrl) {
          toUpdate.push({ id: existing.id, photoUrl: driveUrl });
          totalUpdatedEntries++;
        }
      } else {
        toInsert.push({
          nik: emp.nik,
          name: emp.name,
          itemName: item,
          dateTaken: parsed.parsedDate,
          photoUrl: driveUrl,
          pt: emp.pt || 'TBP'
        });
        existingMap.set(key, { nik: emp.nik, itemName: item, dateTaken: parsed.parsedDate, photoUrl: driveUrl });
        totalInsertedEntries++;
      }
    }
  }

  console.log(`\n=== IMPORT SUMMARY ===`);
  console.log(`Matched Files: ${totalMatchedFiles}/${files.length}`);
  console.log(`Skipped Binder/Non-PDF: ${skippedFiles.length}`);
  console.log(`Unmatched Files: ${unmatchedFiles.length}`);
  console.log(`Entries to Insert: ${toInsert.length}`);
  console.log(`Entries to Update: ${toUpdate.length}`);

  if (unmatchedFiles.length > 0) {
    console.log(`Unmatched Files list:`, unmatchedFiles);
  }

  if (!isDryRun) {
    console.log(`Executing database updates and inserts...`);
    for (const u of toUpdate) {
      await db.update(apdHistory).set({ photoUrl: u.photoUrl }).where(eq(apdHistory.id, u.id));
    }

    const CHUNK_SIZE = 50;
    for (let i = 0; i < toInsert.length; i += CHUNK_SIZE) {
      await db.insert(apdHistory).values(toInsert.slice(i, i + CHUNK_SIZE));
    }
    console.log(`Database write complete!`);
  }
}

const isDryRun = process.argv.includes('--dry-run');
runImport(isDryRun).catch(console.error);
