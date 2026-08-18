const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
const { pgTable, text, serial } = require('drizzle-orm/pg-core');
const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: 'cloud_sql_development_database'
});
const db = drizzle(pool);
const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  nik: text('nik').notNull().unique(),
  name: text('name').notNull(),
  jabatan: text('jabatan'),
  section: text('section')
});
db.select().from(employees).limit(1).then(res => {
  console.log(res);
  pool.end();
});
