import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

function mapDataType(col: any): string {
  const dt = col.data_type.toLowerCase();
  const udt = (col.udt_name || '').toLowerCase();

  if (dt === 'array' || udt.startsWith('_')) {
    if (udt === '_text' || udt === '_varchar') return 'text[]';
    if (udt === '_int4' || udt === '_int8') return 'integer[]';
    return 'text[]';
  }
  if (dt === 'user-defined') return 'text';
  if (dt.includes('timestamp')) return 'timestamp';
  if (dt.includes('character varying') || dt === 'varchar') return 'text';
  return col.data_type;
}

async function syncStagingDb() {
  const host = process.env.SQL_HOST || '35.232.132.249';
  const user = process.env.SQL_USER || 'postgres';
  const password = process.env.SQL_PASSWORD || 'password123';

  const poolProd = new Pool({
    host,
    user,
    password,
    database: 'appdb',
    port: 5432,
    ssl: false
  });

  const poolStaging = new Pool({
    host,
    user,
    password,
    database: 'appdb_staging',
    port: 5432,
    ssl: false
  });

  console.log('Connecting to appdb (Prod) and appdb_staging (Staging)...');

  // 1. Get all tables in prod
  const tablesRes = await poolProd.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const tableNames = tablesRes.rows.map(r => r.table_name);
  console.log('Tables in Prod:', tableNames);

  // 2. Check and sync each table's columns to staging
  for (const tableName of tableNames) {
    const tableExists = await poolStaging.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      )
    `, [tableName]);

    if (!tableExists.rows[0].exists) {
      console.log(`Table ${tableName} does not exist in staging. Creating...`);
      const colsProd = await poolProd.query(`
        SELECT column_name, data_type, udt_name, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      const colDefs = colsProd.rows.map(col => {
        const typeStr = mapDataType(col);
        let def = `"${col.column_name}" ${typeStr}`;
        if (col.column_name === 'id' && col.column_default?.includes('nextval')) {
          def = `"${col.column_name}" SERIAL PRIMARY KEY`;
        } else if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }
        return def;
      });

      const createSql = `CREATE TABLE IF NOT EXISTS "${tableName}" (${colDefs.join(', ')});`;
      await poolStaging.query(createSql);
      console.log(`✅ Table ${tableName} created in staging.`);
    } else {
      const prodCols = await poolProd.query(`
        SELECT column_name, data_type, udt_name, column_default
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [tableName]);

      const stagingCols = await poolStaging.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [tableName]);

      const stagingColSet = new Set(stagingCols.rows.map(r => r.column_name));

      for (const pCol of prodCols.rows) {
        if (!stagingColSet.has(pCol.column_name)) {
          const typeStr = mapDataType(pCol);
          console.log(`Adding missing column "${pCol.column_name}" (${typeStr}) to table "${tableName}" in staging...`);
          let alterSql = `ALTER TABLE "${tableName}" ADD COLUMN "${pCol.column_name}" ${typeStr}`;
          if (pCol.column_default) {
            alterSql += ` DEFAULT ${pCol.column_default}`;
          }
          try {
            await poolStaging.query(alterSql);
            console.log(`✅ Added column "${pCol.column_name}" to "${tableName}".`);
          } catch (e: any) {
            console.warn(`Warning adding column ${pCol.column_name}:`, e.message);
          }
        }
      }
    }
  }

  // 3. Sync employees data if staging employees is empty or missing rows
  const prodEmpCount = await poolProd.query('SELECT count(*) FROM employees');
  const stagingEmpCount = await poolStaging.query('SELECT count(*) FROM employees');
  console.log(`Employees Count -> Prod: ${prodEmpCount.rows[0].count}, Staging: ${stagingEmpCount.rows[0].count}`);

  if (parseInt(stagingEmpCount.rows[0].count, 10) === 0 || parseInt(stagingEmpCount.rows[0].count, 10) < parseInt(prodEmpCount.rows[0].count, 10)) {
    console.log('Copying employees from prod to staging...');
    const allProdEmps = await poolProd.query('SELECT * FROM employees');
    for (const emp of allProdEmps.rows) {
      const keys = Object.keys(emp).filter(k => emp[k] !== undefined && k !== 'id');
      const cols = keys.map(k => `"${k}"`).join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map(k => emp[k]);

      const upsertSql = `
        INSERT INTO employees (${cols}) 
        VALUES (${placeholders}) 
        ON CONFLICT (nik) DO NOTHING
      `;
      try {
        await poolStaging.query(upsertSql, values);
      } catch (e: any) {}
    }
    const newStagingCount = await poolStaging.query('SELECT count(*) FROM employees');
    console.log(`✅ Staging now has ${newStagingCount.rows[0].count} employees.`);
  }

  // 4. Copy community_quotes from prod to staging
  const stagingQuotesCount = await poolStaging.query('SELECT count(*) FROM community_quotes');
  if (parseInt(stagingQuotesCount.rows[0].count, 10) === 0) {
    console.log('Copying community_quotes from prod to staging...');
    const prodQuotes = await poolProd.query('SELECT * FROM community_quotes');
    for (const q of prodQuotes.rows) {
      await poolStaging.query(`
        INSERT INTO community_quotes (quote, author_nik, author_name, author_role, author_section, category, likes_count, liked_by, liked_by_users)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [q.quote, q.author_nik, q.author_name, q.author_role, q.author_section, q.category, q.likes_count, q.liked_by, q.liked_by_users]);
    }
    console.log(`✅ Seeded ${prodQuotes.rows.length} community_quotes into staging.`);
  }

  // 5. Ensure developer_users table exists and has Alvin & Anugrah
  await poolStaging.query(`
    CREATE TABLE IF NOT EXISTS developer_users (
      nik text PRIMARY KEY,
      name text,
      role text,
      added_at timestamp DEFAULT now()
    )
  `);
  await poolStaging.query(`
    INSERT INTO developer_users (nik, name, role) 
    VALUES ('02D24000043', 'Muhamad Alvin Febriansyah', 'Developer') 
    ON CONFLICT (nik) DO NOTHING
  `);
  await poolStaging.query(`
    INSERT INTO developer_users (nik, name, role) 
    VALUES ('02D25000055', 'Muhamad Anugrah Ramadhan', 'Developer') 
    ON CONFLICT (nik) DO NOTHING
  `);
  console.log('✅ Developer accounts verified on staging.');

  // 6. Create indexes on roster in staging
  try {
    await poolStaging.query('CREATE INDEX IF NOT EXISTS idx_roster_nik ON roster(nik)');
    await poolStaging.query('CREATE INDEX IF NOT EXISTS idx_roster_nik_date ON roster(nik, date)');
    await poolStaging.query('CREATE INDEX IF NOT EXISTS idx_roster_date ON roster(date)');
    console.log('✅ Roster indexes created on staging.');
  } catch (e: any) {
    console.warn('Index notice:', e.message);
  }

  await poolProd.end();
  await poolStaging.end();
  console.log('🎉 Staging Database Synchronized Successfully!');
}

syncStagingDb().catch(console.error);
