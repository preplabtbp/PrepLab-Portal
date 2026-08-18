const { Client } = require('pg');

async function run() {
    const prod = new Client({ connectionString: 'postgresql://postgres:password123@35.232.132.249:5432/appdb' });
    const staging = new Client({ connectionString: 'postgresql://postgres:password123@35.232.132.249:5432/appdb_staging' });
    await prod.connect();
    await staging.connect();

    const res2 = await prod.query("SELECT * FROM employees WHERE nik = '02D25000055'");
    for (let r of res2.rows) {
        const keys = Object.keys(r).filter(k => k !== 'id');
        const vals = keys.map(k => r[k]);
        const placeholders = keys.map((_,i) => '$'+(i+1));
        await staging.query('INSERT INTO employees ("'+keys.join('", "')+'") VALUES ('+placeholders.join(',')+') ON CONFLICT (nik) DO NOTHING', vals);
    }
    console.log('Inserted specific employee 02D25000055');
    await prod.end();
    await staging.end();
}
run().catch(console.error);
