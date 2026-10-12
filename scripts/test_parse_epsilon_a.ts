import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

interface ParsedItem {
  seqNo: number;
  analyzedAt: string;
  sampleLabel: string;
  stdCode: string;
  ni: number;
  co: number;
  fe: number;
  cao: number;
  sio2: number;
  al2o3: number;
  mgo: number;
  p: number;
  s: number;
  cr2o3: number;
  mno: number;
  bc: number;
  feNi: number;
  sumConc: number;
}

interface ParsedBatch {
  instrumentCode: string;
  instrumentName: string;
  verificationDate: string;
  verificationTime: string;
  weekNo: number;
  items: ParsedItem[];
}

function getIsoWeek(d: Date): number {
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function parseCsv(filePath: string): ParsedBatch[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const parsed = Papa.parse<string[]>(content, { skipEmptyLines: false });
  const rows = parsed.data;

  const batches: ParsedBatch[] = [];
  let currentItems: ParsedItem[] = [];
  let currentDate = '';
  let currentTime = '';

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || cols.length < 5) continue;

    const seqStr = String(cols[0] || '').trim();
    const seq = parseInt(seqStr, 10);
    if (isNaN(seq) || seq < 1 || seq > 5) continue;

    // Col 4 is Ni
    const niVal = parseFloat(cols[4]);
    if (isNaN(niVal)) continue;

    const dateStr = String(cols[2] || '').trim(); // e.g. "1/07/2026 0:02"
    const rawLabel = String(cols[3] || '').trim(); // e.g. "VER-LIM01 D 18/02/2025"

    // Parse standard code
    let stdCode = 'LIM01';
    if (rawLabel.includes('LIM01')) stdCode = 'LIM01';
    else if (rawLabel.includes('LIM02')) stdCode = 'LIM02';
    else if (rawLabel.includes('LIM03')) stdCode = 'LIM03';
    else if (rawLabel.includes('LIM04')) stdCode = 'LIM04';
    else if (rawLabel.includes('LIM05')) stdCode = 'LIM05';

    // Parse date: D/M/YYYY H:mm or DD/MM/YYYY H:mm
    const [dPart, tPart] = dateStr.split(' ');
    if (!dPart) continue;

    const [day, month, year] = dPart.split('/').map(n => parseInt(n, 10));
    if (isNaN(day) || isNaN(month) || isNaN(year)) continue;

    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const time = tPart || '00:00';

    const co = parseFloat(cols[5]) || 0;
    const fe = parseFloat(cols[6]) || 0;
    const cao = parseFloat(cols[7]) || 0;
    const sio2 = parseFloat(cols[8]) || 0;
    const al2o3 = parseFloat(cols[9]) || 0;
    const mgo = parseFloat(cols[10]) || 0;
    const p = parseFloat(cols[11]) || 0;
    const s = parseFloat(cols[12]) || 0;
    const cr2o3 = parseFloat(cols[13]) || 0;
    const mno = parseFloat(cols[14]) || 0;
    const bc = parseFloat(cols[15]) || (sio2 > 0 ? Number(((cao + mgo) / sio2).toFixed(2)) : 0);
    const feNi = parseFloat(cols[16]) || (niVal > 0 ? Number((fe / niVal).toFixed(2)) : 0);
    const sumConc = Number((niVal + co + fe + cao + sio2 + al2o3 + mgo + p + s + cr2o3 + mno).toFixed(2));

    const item: ParsedItem = {
      seqNo: seq,
      analyzedAt: dateStr,
      sampleLabel: rawLabel,
      stdCode,
      ni: niVal,
      co,
      fe,
      cao,
      sio2,
      al2o3,
      mgo,
      p,
      s,
      cr2o3,
      mno,
      bc,
      feNi,
      sumConc,
    };

    if (seq === 1) {
      if (currentItems.length > 0 && currentDate) {
        const dObj = new Date(currentDate);
        batches.push({
          instrumentCode: 'EPSILON_A',
          instrumentName: 'EPSILON A',
          verificationDate: currentDate,
          verificationTime: currentTime,
          weekNo: getIsoWeek(dObj),
          items: [...currentItems],
        });
      }
      currentItems = [item];
      currentDate = isoDate;
      currentTime = time;
    } else {
      currentItems.push(item);
    }
  }

  // Push last batch
  if (currentItems.length > 0 && currentDate) {
    const dObj = new Date(currentDate);
    batches.push({
      instrumentCode: 'EPSILON_A',
      instrumentName: 'EPSILON A',
      verificationDate: currentDate,
      verificationTime: currentTime,
      weekNo: getIsoWeek(dObj),
      items: [...currentItems],
    });
  }

  return batches;
}

const csvFile = path.resolve(process.cwd(), 'scratch/epsilon_a_gts.csv');
const batches = parseCsv(csvFile);

console.log(`Parsed ${batches.length} batches for EPSILON A!`);
if (batches.length > 0) {
  console.log(`First batch: ${batches[0].verificationDate} with ${batches[0].items.length} items`);
  console.log(`Last batch: ${batches[batches.length - 1].verificationDate} with ${batches[batches.length - 1].items.length} items`);
  console.log(`Total sample items: ${batches.reduce((a, b) => a + b.items.length, 0)}`);
  console.log("Sample first item:", batches[0].items[0]);
}
