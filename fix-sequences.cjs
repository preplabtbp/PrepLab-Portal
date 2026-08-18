const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function fix() {
  await client.connect();
  const res = await client.query("SELECT table_name FROM information_schema.columns WHERE column_name = 'id' AND table_schema = 'public'");
  
  for (const row of res.rows) {
    const table = row.table_name;
    try {
      // Find the sequence for the 'id' column
      const seqRes = await client.query(`SELECT pg_get_serial_sequence('"${table}"', 'id') as seq`);
      const seq = seqRes.rows[0].seq;
      if (seq) {
        // Reset sequence to max(id) + 1
        await client.query(`SELECT setval('${seq}', coalesce(max(id), 0) + 1, false) FROM "${table}"`);
        console.log('Updated sequence for', table);
      }
    } catch(e) {
      // some tables might not have an integer ID or sequence
      // console.log(`Skipping ${table}:`, e.message);
    }
  }
  
  await client.end();
}

fix();
