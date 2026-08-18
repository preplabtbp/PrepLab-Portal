import fetch from 'node-fetch';
import Papa from 'papaparse';

const url = "https://docs.google.com/spreadsheets/d/10a2JYxQxEfcMDdl968KUHiC1fVI65vPaWMH7shMv7U0/export?format=csv&gid=170063197";

async function run() {
  const res = await fetch(url);
  const text = await res.text();
  const parsed = Papa.parse(text, { skipEmptyLines: true });
  const rows = parsed.data as string[][];
  
  console.log("Row 0:", rows[0].slice(0, 20));
  console.log("Row 1:", rows[1].slice(0, 20));
  console.log("Row 2:", rows[2].slice(0, 20));
}
run();
