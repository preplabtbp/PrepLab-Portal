const fs = require('fs');
const path = require('path');

function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      row.push(current.trim());
      current = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(current.trim());
      current = '';
      if (row.some(c => c !== '')) {
        lines.push(row);
      }
      row = [];
    } else {
      current += char;
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.some(c => c !== '')) {
      lines.push(row);
    }
  }
  return lines;
}

function parseNum(val) {
  if (!val || val === '' || val === '-') return 0;
  // Replace thousand dot (e.g. 1.001 -> 1001)
  const cleaned = String(val).replace(/\./g, '').trim();
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
}

// 1. Read existing seed and extract September records
const seedFile = fs.readFileSync('src/components/daily-performance/daily-performance-seed.ts', 'utf8');

// Parse raw records from TS file by evaluating or parsing JSON-like structures
const arrayMatch = seedFile.match(/export const INITIAL_DAILY_PERFORMANCE_RECORDS: DailyPerformanceRecord\[\] = (\[[\s\S]*?\]);/);
if (!arrayMatch) {
  console.error('Could not find INITIAL_DAILY_PERFORMANCE_RECORDS in seed file');
  process.exit(1);
}

const allExisting = JSON.parse(arrayMatch[1]);
const septemberRecords = allExisting.filter(r => r.date && r.date.includes('/09/2026'));
console.log(`Found ${septemberRecords.length} September records to preserve.`);

// 2. Parse October CSV
const rawCsv = fs.readFileSync('scripts/raw-daily-october.csv', 'utf8');
const rows = parseCSV(rawCsv);

console.log(`Total CSV rows: ${rows.length}`);

// Data rows start around row index 5
// Let's identify rows that represent shifts
let lastNo = 1;
let lastDate = '01/10/2026';
let lastWeek = 40;

const octoberRecords = [];

for (let rIdx = 5; rIdx < rows.length; rIdx++) {
  const r = rows[rIdx];

  // Stop if we hit summary rows (MIN, MAX, AVERAGE, TOTAL)
  const firstCol = (r[0] || '').toUpperCase();
  const secondCol = (r[1] || '').toUpperCase();
  if (['MIN', 'MAX', 'AVERAGE', 'TOTAL'].includes(firstCol) || ['MIN', 'MAX', 'AVERAGE', 'TOTAL'].includes(secondCol)) {
    console.log(`Hit summary row at index ${rIdx} (${firstCol || secondCol}), stopping parsing.`);
    break;
  }

  // Row format check:
  // Daytime row: r[1] = no (e.g. "1"), r[2] = date (e.g. "01/10/2026"), r[3] = week ("40"), r[4] = regu ("A"), r[5] = shift ("DAY" / "LS")
  // Nighttime row: r[1] = "", r[2] = "", r[3] = "", r[4] = regu ("B"), r[5] = shift ("NIGHT")
  let no = parseNum(r[1]);
  let date = r[2] || '';
  let week = parseNum(r[3]);
  let regu = (r[4] || '').toUpperCase().trim();
  let shiftType = (r[5] || '').toUpperCase().trim();

  // If row has no valid shift type, check if it's shifted or empty
  if (!['DAY', 'NIGHT', 'LS'].includes(shiftType)) {
    // Check if r[5] is shift
    continue;
  }

  if (no > 0) {
    lastNo = no;
  } else {
    no = lastNo;
  }

  if (date && date.includes('/')) {
    lastDate = date;
  } else {
    date = lastDate;
  }

  if (week > 0) {
    lastWeek = week;
  } else {
    week = lastWeek;
  }

  // Calculate isoDate
  const [d, m, y] = date.split('/');
  const isoDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  const id = `${isoDate}_${regu}_${shiftType}`;

  const record = {
    id,
    no,
    date,
    isoDate,
    week,
    regu,
    shiftType,
    manpower: {
      staff: {
        shift: parseNum(r[6]),
        cuti: parseNum(r[7]),
        alpa: parseNum(r[8]),
        izin: parseNum(r[9]),
        sakit: parseNum(r[10]),
        total: parseNum(r[11])
      },
      crew: {
        shift: parseNum(r[12]),
        bantn: parseNum(r[13]),
        lab: parseNum(r[14]),
        cuti: parseNum(r[15]),
        alpa: parseNum(r[16]),
        izin: parseNum(r[17]),
        sakit: parseNum(r[18]),
        total: parseNum(r[19])
      }
    },
    sampleReceived: {
      gc: {
        shift: parseNum(r[20]),
        day: parseNum(r[21]),
        wkly: parseNum(r[22])
      },
      prod: {
        shift: parseNum(r[23]),
        rc: parseNum(r[24]),
        day: parseNum(r[25]),
        wkly: parseNum(r[26])
      },
      exp: {
        shift: parseNum(r[27]),
        day: parseNum(r[28]),
        wkly: parseNum(r[29])
      },
      smelter: {
        shift: parseNum(r[30]),
        day: parseNum(r[31]),
        wkly: parseNum(r[32])
      }
    },
    pressPowder: {
      received: {
        shift: parseNum(r[33]),
        day: parseNum(r[34]),
        wkly: parseNum(r[35])
      },
      finish: {
        shift: parseNum(r[43]),
        day: parseNum(r[44]),
        wkly: parseNum(r[45])
      }
    },
    edxrf: {
      epsC: parseNum(r[36]),
      epsD: parseNum(r[37]),
      epsE: parseNum(r[38]),
      epsF: parseNum(r[39]),
      epsG: parseNum(r[40]),
      epsH: parseNum(r[41]),
      s2Puma: parseNum(r[42]),
      shift: parseNum(r[43]),
      day: parseNum(r[44]),
      wkly: parseNum(r[45])
    },
    fuseBead: {
      osExp: parseNum(r[46]),
      finishShift: parseNum(r[47]),
      finishDay: parseNum(r[48]),
      finishWkly: parseNum(r[49]),
      balExp: parseNum(r[50])
    },
    loi: {
      os: parseNum(r[51]),
      w2: parseNum(r[52]),
      w4: parseNum(r[53]),
      w5: parseNum(r[54]),
      finLoiShift: parseNum(r[52]) + parseNum(r[53]) + parseNum(r[54]), // Sum of W2, W4, W5 or shift output
      finLoiDay: parseNum(r[55]),
      finLoiWkly: parseNum(r[56]),
      bal: parseNum(r[57])
    },
    wdxrf: {
      osExp: parseNum(r[58]),
      zetiumA: {
        prod: parseNum(r[59]),
        exp: parseNum(r[60]),
        smelt: parseNum(r[61]),
        gts: parseNum(r[62]),
        rarr: parseNum(r[63]),
        ver: parseNum(r[64]),
        std: parseNum(r[65]),
        blank: parseNum(r[66]),
        total: parseNum(r[67]),
        day: parseNum(r[68]),
        wkly: parseNum(r[69])
      },
      zetiumB: {
        prod: parseNum(r[70]),
        exp: parseNum(r[71]),
        smelt: parseNum(r[72]),
        gts: parseNum(r[73]),
        rarr: parseNum(r[74]),
        ver: parseNum(r[75]),
        std: parseNum(r[76]),
        blank: parseNum(r[77]),
        total: parseNum(r[78]),
        day: parseNum(r[79]),
        wkly: parseNum(r[80])
      },
      bal: parseNum(r[81])
    },
    qc: {
      os: parseNum(r[82]),
      finishShift: parseNum(r[83]),
      finishDay: parseNum(r[84]),
      finishWkly: parseNum(r[85]),
      bal: parseNum(r[86])
    },
    report: {
      osReport: parseNum(r[87]),
      received: parseNum(r[88]),
      finishReportDay: parseNum(r[89]),
      finishReportWkly: parseNum(r[90]),
      bal: parseNum(r[91])
    }
  };

  octoberRecords.push(record);
}

console.log(`Successfully parsed ${octoberRecords.length} October records.`);
console.log('Sample parsed October records:');
console.log('First:', octoberRecords[0].id, octoberRecords[0].date, octoberRecords[0].shiftType);
console.log('Record on 22/10/2026:');
const oct22 = octoberRecords.filter(r => r.date === '22/10/2026');
console.log(oct22.map(r => ({ id: r.id, gcReceived: r.sampleReceived.gc.shift, edxrf: r.edxrf.shift, wdxrfA: r.wdxrf.zetiumA.total })));

// Combine September + October
const completeRecords = [...septemberRecords, ...octoberRecords];
console.log(`Total combined records: ${completeRecords.length}`);

// Generate TypeScript seed file
const outputTs = `import { DailyPerformanceRecord } from './daily-performance-types';\n\nexport const INITIAL_DAILY_PERFORMANCE_RECORDS: DailyPerformanceRecord[] = ${JSON.stringify(completeRecords, null, 2)};\n`;

fs.writeFileSync('src/components/daily-performance/daily-performance-seed.ts', outputTs, 'utf8');
console.log('Successfully updated src/components/daily-performance/daily-performance-seed.ts!');
