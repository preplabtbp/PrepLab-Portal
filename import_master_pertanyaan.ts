import 'dotenv/config';
import { db } from './src/db/index.js';
import { questions } from './src/db/schema.js';
import csv from 'csv-parser';
import { Readable } from 'stream';

async function run() {
  try {
    console.log('Fetching CSV...');
    const res = await fetch('https://docs.google.com/spreadsheets/d/1wk0bXvmbZHZOjTTGDy-5oQrFZJmFjJ1c/export?format=csv&gid=685685374');
    const text = await res.text();
    console.log('Parsing CSV...');
    const results: any[] = [];
    const stream = Readable.from(text);
    await new Promise((resolve, reject) => {
      stream.pipe(csv()).on('data', (data) => results.push(data)).on('end', resolve).on('error', reject);
    });
    console.log(`Found ${results.length} records.`);
    
    console.log('Clearing existing questions...');
    await db.delete(questions);
    
    console.log('Inserting into DB...');
    const BATCH_SIZE = 100;
    let inserted = 0;
    for (let i = 0; i < results.length; i += BATCH_SIZE) {
      const batch = results.slice(i, i + BATCH_SIZE).map(row => ({
        idForm: row.ID_Inspeksi,
        judulForm: row.Judul_Inspeksi,
        kategori: row.Kategori_Pertanyaan,
        tipeInput: row.Tipe_Input,
        item: row.Item_Inspeksi,
        info1: row.Info_1,
        info2: row.Info_2,
        info3: row.Info_3,
        info4: row.Info_4,
        questionText: row.Item_Inspeksi,
        category: row.Kategori_Pertanyaan
      }));
      await db.insert(questions).values(batch);
      inserted += batch.length;
    }
    console.log(`Done! Inserted ${inserted} records.`);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
