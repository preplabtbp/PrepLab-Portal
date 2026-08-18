const { Client } = require('pg');

async function run() {
    const prod = new Client({ connectionString: 'postgresql://postgres:password123@35.232.132.249:5432/appdb' });
    const staging = new Client({ connectionString: 'postgresql://postgres:password123@35.232.132.249:5432/appdb_staging' });
    await prod.connect();
    await staging.connect();
    console.log('Connected');

    const res = await prod.query('SELECT * FROM employees LIMIT 10');
    console.log('Got ' + res.rowCount + ' employees');
    for (let r of res.rows) {
        const keys = Object.keys(r).filter(k => k !== 'id');
        const vals = keys.map(k => r[k]);
        const placeholders = keys.map((_,i) => '$'+(i+1));
        await staging.query('INSERT INTO employees ("'+keys.join('", "')+'") VALUES ('+placeholders.join(',')+') ON CONFLICT (nik) DO NOTHING', vals);
    }
    console.log('Inserted employees');
    
    const res2 = await prod.query("SELECT * FROM employees WHERE nik = '82D25888855'");
    for (let r of res2.rows) {
        const keys = Object.keys(r).filter(k => k !== 'id');
        const vals = keys.map(k => r[k]);
        const placeholders = keys.map((_,i) => '$'+(i+1));
        await staging.query('INSERT INTO employees ("'+keys.join('", "')+'") VALUES ('+placeholders.join(',')+') ON CONFLICT (nik) DO NOTHING', vals);
    }
    console.log('Inserted specific employee');

    await prod.end();
    await staging.end();
}
run().catch(console.error);
