const { Client } = require('pg');

async function run() {
    const prod = new Client({ connectionString: 'postgresql://postgres:password123@35.232.132.249:5432/appdb' });
    const staging = new Client({ connectionString: 'postgresql://postgres:password123@35.232.132.249:5432/appdb_staging' });
    await prod.connect();
    await staging.connect();

    const res = await prod.query('SELECT * FROM equipments LIMIT 10');
    for (let r of res.rows) {
        const keys = Object.keys(r).filter(k => k !== 'id');
        const vals = keys.map(k => r[k]);
        const placeholders = keys.map((_,i) => '$'+(i+1));
        await staging.query('INSERT INTO equipments ("'+keys.join('", "')+'") VALUES ('+placeholders.join(',')+')', vals);
    }
    console.log('Inserted ' + res.rowCount + ' equipments');
    await prod.end();
    await staging.end();
}
run().catch(console.error);
