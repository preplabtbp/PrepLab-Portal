import { db } from './src/db/index.js';
import { employees, roster } from './src/db/schema.js';
import { eq } from 'drizzle-orm';
import fetch from 'node-fetch';
import Papa from 'papaparse';

const ROOSTER_CREW_CSV_URL = "https://docs.google.com/spreadsheets/d/10a2JYxQxEfcMDdl968KUHiC1fVI65vPaWMH7shMv7U0/export?format=csv&gid=170063197";

async function run() {
  const url = ROOSTER_CREW_CSV_URL;
  const type = 'Crew';
  const res = await fetch(url);
  const csvText = await res.text();
  const parsed = Papa.parse(csvText, { skipEmptyLines: true });
  const rows = parsed.data as string[][];

  console.log("Rows length:", rows.length);
  const dateHeaders = rows[0]; 
  const colStartIndex = 14;

  let burhanudinFound = false;

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row[1] || !row[2]) continue;

    const nik = row[2].trim();
    if (nik === 'M0404220418') {
      burhanudinFound = true;
      console.log("Found Burhanudin!");
      const empData = {
        nik,
        name: row[1],
        jabatan: row[3],
        jobGrade: '',
        section: row[4],
        gol: row[5],
        shift: row[6],
        poh: row[7],
        pt: row[8],
        statusMess: row[9],
        rotation: row[10],
        tanggalAwalBergabung: row[11],
        tanggalBergabungTerbaru: row[12],
        statusKontrak: row[13],
      };
      console.log("empData:", empData);
      
      const dRows = [];
      for (let c = colStartIndex; c < row.length; c++) {
        const dateStr = dateHeaders[c]; 
        if (!dateStr) continue;
        const status = row[c];
        if (status) {
          dRows.push({ nik, date: dateStr, status });
        }
      }
      console.log("dRows size:", dRows.length);
    }
  }
  console.log("Was Burhanudin found?", burhanudinFound);
}
run().then(() => console.log('done')).catch(console.error);
