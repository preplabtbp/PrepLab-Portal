const { Client } = require('pg');
async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres:password123@35.232.132.249:5432/appdb"
  });
  await client.connect();
  const res = await client.query('SELECT * FROM "appSettings"');
  console.log(res.rows);
  await client.end();
}
run();
