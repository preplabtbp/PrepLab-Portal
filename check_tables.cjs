const { Client } = require('pg');
async function query() {
    const stagingClient = new Client({ connectionString: 'postgresql://postgres:password123@35.232.132.249:5432/appdb_staging' });
    await stagingClient.connect();
    
    // Seed this specific NIK just in case it wasn't in the 50
    const prodClient = new Client({ connectionString: 'postgresql://postgres:password123@35.232.132.249:5432/appdb' });
    await prodClient.connect();
    const specificEmp = await prodClient.query("SELECT * FROM employees WHERE nik = '02D25000055'");
    if(specificEmp.rows.length > 0) {
        const row = specificEmp.rows[0];
        const cols = Object.keys(row);
        const values = cols.map(c => row[c]);
        const placeholders = cols.map((_, i) => '$'+(i+1)).join(', ');
        await stagingClient.query('INSERT INTO employees ('+cols.join(', ')+') VALUES ('+placeholders+') ON CONFLICT DO NOTHING', values);
        console.log('Seeded NIK 02D25000055');
    } else {
        console.log('NIK 02D25000055 not found in Prod!');
    }
    
    await stagingClient.end();
    await prodClient.end();
}
query().catch(console.error);
