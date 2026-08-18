const { Client } = require('pg');

async function dropAndMigrate() {
    const staging = new Client({ connectionString: 'postgresql://postgres:password123@35.232.132.249:5432/appdb_staging' });
    await staging.connect();
    console.log('Dropping public schema in staging...');
    await staging.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    console.log('Staging DB cleared.');
    await staging.end();
}
dropAndMigrate().catch(console.error);
