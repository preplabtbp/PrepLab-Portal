import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { db } from '../src/db/index.js';
import {
  xrfVerifications,
  xrfVerificationItems,
  xrfStandardReferences,
} from '../src/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { ensureXrfTables } from '../server/routes/xrfCalibration.js';

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

    const dateStr = String(cols[2] || '').trim();
    const rawLabel = String(cols[3] || '').trim();

    let stdCode = 'LIM01';
    if (rawLabel.includes('LIM01')) stdCode = 'LIM01';
    else if (rawLabel.includes('LIM02')) stdCode = 'LIM02';
    else if (rawLabel.includes('LIM03')) stdCode = 'LIM03';
    else if (rawLabel.includes('LIM04')) stdCode = 'LIM04';
    else if (rawLabel.includes('LIM05')) stdCode = 'LIM05';

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

function evaluateItem(item: ParsedItem, references: Record<string, any>) {
  const evaluations: Record<string, any> = {};
  let overallItemStatus = 'PASS';

  const elementsToCheck: Array<{ key: string; val: number }> = [
    { key: 'Ni', val: item.ni },
    { key: 'Co', val: item.co },
    { key: 'Fe', val: item.fe },
    { key: 'CaO', val: item.cao },
    { key: 'SiO2', val: item.sio2 },
    { key: 'Al2O3', val: item.al2o3 },
    { key: 'MgO', val: item.mgo },
    { key: 'P', val: item.p },
    { key: 'S', val: item.s },
    { key: 'Cr2O3', val: item.cr2o3 },
    { key: 'MnO', val: item.mno },
  ];

  for (const el of elementsToCheck) {
    const ref = references[el.key];
    if (ref && ref.nominalValue > 0) {
      const diffPct = Number((((el.val - ref.nominalValue) / ref.nominalValue) * 100).toFixed(2));
      const sigmaDist = ref.stdevFixed > 0 ? Number(((el.val - ref.nominalValue) / ref.stdevFixed).toFixed(2)) : 0;

      let status = 'PASS';
      if (Math.abs(sigmaDist) > (ref.actionSigma || 3.0)) {
        status = 'FAIL';
        overallItemStatus = 'FAIL';
      } else if (Math.abs(sigmaDist) > (ref.warningSigma || 2.0)) {
        status = 'WARNING';
        if (overallItemStatus !== 'FAIL') overallItemStatus = 'WARNING';
      }

      evaluations[el.key] = {
        measured: el.val,
        expected: ref.nominalValue,
        diffPct,
        stdev: ref.stdevFixed,
        sigmaDist,
        status,
        upperAction: Number((ref.nominalValue + (ref.actionSigma || 3.0) * ref.stdevFixed).toFixed(3)),
        lowerAction: Number((ref.nominalValue - (ref.actionSigma || 3.0) * ref.stdevFixed).toFixed(3)),
        upperWarning: Number((ref.nominalValue + (ref.warningSigma || 2.0) * ref.stdevFixed).toFixed(3)),
        lowerWarning: Number((ref.nominalValue - (ref.warningSigma || 2.0) * ref.stdevFixed).toFixed(3)),
      };
    }
  }

  return { evaluations, itemStatus: overallItemStatus };
}

async function runImport() {
  console.log("=== START IMPORT GTS EPSILON A DATA ===");
  await ensureXrfTables();

  const csvFile = path.resolve(process.cwd(), 'scratch/epsilon_a_gts.csv');
  const batches = parseCsv(csvFile);
  console.log(`Parsed ${batches.length} batches from CSV.`);

  // Load all references
  const allRefs = await db.select().from(xrfStandardReferences);
  const refMap: Record<string, Record<string, any>> = {};
  for (const r of allRefs) {
    refMap[r.standardCode] = refMap[r.standardCode] || {};
    refMap[r.standardCode][r.elementName] = r;
  }

  // Delete previous verification data for EPSILON_A to prevent duplicates
  console.log("Cleaning old data for EPSILON_A...");
  const existingBatches = await db.select({ id: xrfVerifications.id })
    .from(xrfVerifications)
    .where(eq(xrfVerifications.instrumentCode, 'EPSILON_A'));

  if (existingBatches.length > 0) {
    const ids = existingBatches.map(b => b.id);
    await db.delete(xrfVerificationItems)
      .where(sql`${xrfVerificationItems.verificationId} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`);
    await db.delete(xrfVerifications)
      .where(eq(xrfVerifications.instrumentCode, 'EPSILON_A'));
    console.log(`Deleted ${existingBatches.length} previous batches for EPSILON_A.`);
  }

  let totalItemsInserted = 0;
  let batchCount = 0;

  for (const batch of batches) {
    batchCount++;
    const dateFormatted = batch.verificationDate.replace(/-/g, '');
    const cleanTime = (batch.verificationTime || '0000').replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4);
    const batchCode = `VRF-${dateFormatted}-EPSA-${cleanTime}-${String(batchCount).padStart(3, '0')}`;

    let overallBatchStatus = 'PASS';
    const processedItems = batch.items.map(it => {
      const stdRefs = refMap[it.stdCode] || {};
      const { evaluations, itemStatus } = evaluateItem(it, stdRefs);

      if (itemStatus === 'FAIL') overallBatchStatus = 'FAIL';
      else if (itemStatus === 'WARNING' && overallBatchStatus !== 'FAIL') overallBatchStatus = 'WARNING';

      return {
        ...it,
        evaluations,
        itemStatus,
      };
    });

    const [insertedHeader] = await db.insert(xrfVerifications).values({
      batchCode,
      instrumentCode: batch.instrumentCode,
      instrumentName: batch.instrumentName,
      verificationDate: batch.verificationDate,
      verificationTime: batch.verificationTime,
      shift: '1',
      weekNo: batch.weekNo,
      operatorNik: 'GTS-OPERATOR',
      operatorName: 'Analis GTS Lab',
      overallStatus: overallBatchStatus,
      notes: 'Import Data Rekap Historis GTS Epsilon A',
    }).returning();

    const itemsToInsert = processedItems.map(p => ({
      verificationId: insertedHeader.id,
      standardCode: p.stdCode,
      sampleLabel: p.sampleLabel,
      sequenceNo: p.seqNo,
      analyzedAt: p.analyzedAt,
      ni: p.ni,
      co: p.co,
      fe: p.fe,
      cao: p.cao,
      sio2: p.sio2,
      al2o3: p.al2o3,
      mgo: p.mgo,
      p: p.p,
      s: p.s,
      cr2o3: p.cr2o3,
      mno: p.mno,
      bc: p.bc,
      feNi: p.feNi,
      sumConc: p.sumConc,
      evaluations: p.evaluations,
      itemStatus: p.itemStatus,
    }));

    await db.insert(xrfVerificationItems).values(itemsToInsert);
    totalItemsInserted += itemsToInsert.length;
  }

  console.log(`\nSUCCESS! Inserted ${batchCount} verification batches (${totalItemsInserted} items) for GTS EPSILON A.`);
  process.exit(0);
}

runImport().catch(err => {
  console.error("Import Error:", err);
  process.exit(1);
});
