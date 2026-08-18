const { Client } = require('pg');

async function baseline() {
    const dbs = [
        'postgresql://postgres:password123@35.232.132.249:5432/appdb',
        'postgresql://postgres:password123@35.232.132.249:5432/appdb_staging'
    ];

    for (let url of dbs) {
        const client = new Client({ connectionString: url });
        await client.connect();
        
        // Ensure __drizzle_migrations exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (
                "id" SERIAL PRIMARY KEY,
                "hash" text NOT NULL,
                "created_at" bigint
            )
        `);

        // Check if hash exists
        const res = await client.query('SELECT * FROM "__drizzle_migrations" WHERE hash = $1', ['ce537ff0cff07c4adbf27234b6be5711a5df8243012ccd8dc2a0d91083e4f6d5']);
        
        if (res.rowCount === 0) {
            await client.query('INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2)', ['ce537ff0cff07c4adbf27234b6be5711a5df8243012ccd8dc2a0d91083e4f6d5', Date.now()]);
            console.log('Baselined', url);
        } else {
            console.log('Already baselined', url);
        }
        
        await client.end();
    }
}
baseline().catch(console.error);
