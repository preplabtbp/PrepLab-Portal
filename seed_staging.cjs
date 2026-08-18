const { Client } = require('pg');

async function seed() {
    console.log('Connecting to Production...');
    const prodClient = new Client({ connectionString: 'postgresql://postgres:password123@35.232.132.249:5432/appdb' });
    await prodClient.connect();

    console.log('Connecting to Staging...');
    const stagingClient = new Client({ connectionString: 'postgresql://postgres:password123@35.232.132.249:5432/appdb_staging' });
    await stagingClient.connect();

    try {
        // Seed Developer Users (Copy All)
        const devUsersRes = await prodClient.query('SELECT * FROM developer_users');
        if (devUsersRes.rows.length > 0) {
            console.log(`Seeding ${devUsersRes.rows.length} developer_users...`);
            for (const row of devUsersRes.rows) {
                await stagingClient.query(
                    'INSERT INTO developer_users (nik, name, added_at) VALUES ($1, $2, $3) ON CONFLICT (nik) DO NOTHING',
                    [row.nik, row.name, row.added_at]
                );
            }
        }

        // Seed Employees (Copy a few, but include 02D25000055)
        const employeesRes = await prodClient.query("SELECT * FROM employees WHERE nik = '02D25000055' OR id < 100 LIMIT 50");
        if (employeesRes.rows.length > 0) {
            console.log(`Seeding ${employeesRes.rows.length} employees...`);
            const cols = Object.keys(employeesRes.rows[0]);
            
            for (const row of employeesRes.rows) {
                const values = cols.map(c => row[c]);
                const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
                await stagingClient.query(
                    `INSERT INTO employees (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
                    values
                );
            }
        }

        // Seed Users (Copy all matching UIDs? Wait, users doesn't have NIK. We just copy a sample and ensure role is maintained)
        const usersRes = await prodClient.query("SELECT * FROM users LIMIT 50");
        if (usersRes.rows.length > 0) {
            console.log(`Seeding ${usersRes.rows.length} users...`);
            const cols = Object.keys(usersRes.rows[0]);
            
            for (const row of usersRes.rows) {
                const values = cols.map(c => row[c]);
                const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
                await stagingClient.query(
                    `INSERT INTO users (${cols.join(', ')}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
                    values
                );
            }
        }
        
        console.log('Seeding completed successfully!');
    } catch (err) {
        console.error('Error seeding:', err);
    } finally {
        await prodClient.end();
        await stagingClient.end();
    }
}

seed();
