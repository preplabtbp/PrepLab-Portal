import { Client } from 'pg'; 
async function run() { 
  const client = new Client({ 
    host: '35.232.132.249', 
    user: 'postgres', 
    password: 'password123', 
    database: 'appdb_staging' 
  }); 
  await client.connect(); 
  await client.query('CREATE TABLE IF NOT EXISTS easter_egg_progress (nik text PRIMARY KEY NOT NULL, node integer DEFAULT 0 NOT NULL, last_updated timestamp DEFAULT now());'); 
  console.log('Table created on appdb_staging!'); 
  await client.end(); 
} 
run().catch(console.error);
