require('dotenv').config();
const { Pool } = require('pg');

const poolProd = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: 'appdb'
});

const poolStaging = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: 'appdb_staging'
});

const isExecute = process.argv.includes('--execute');

async function main() {
  console.log('=== RESTORE DOWNTIME FOR PREVIOUSLY CLOSED WORK ORDERS (JUNE-JULY) ===');
  console.log('Mode:', isExecute ? 'EXECUTE (Commit to DB)' : 'DRY-RUN (Preview only)');

  // 1. Fetch 94 original closed WOs from appdb_staging
  const stagingClosed = await poolStaging.query(`
    SELECT 
      wo_id, 
      date, 
      equipment_name, 
      downtime_duration, 
      repair_start, 
      repair_end, 
      action_taken, 
      status
    FROM work_orders
    WHERE status = 'Closed' AND to_char(date, 'YYYY-MM') IN ('2026-06', '2026-07')
    ORDER BY date ASC
  `);

  console.log(`\nFound ${stagingClosed.rows.length} previously closed work orders in staging.`);

  if (isExecute) {
    const client = await poolProd.connect();
    try {
      await client.query('BEGIN');

      let updatedCount = 0;
      for (const row of stagingClosed.rows) {
        const res = await client.query(`
          UPDATE work_orders
          SET 
            downtime_duration = $1,
            repair_start = $2,
            repair_end = $3,
            action_taken = $4,
            status = 'Closed'
          WHERE wo_id = $5
        `, [
          row.downtime_duration,
          row.repair_start,
          row.repair_end,
          row.action_taken,
          row.wo_id
        ]);
        if (res.rowCount > 0) updatedCount++;
      }

      await client.query('COMMIT');
      console.log(`\n✅ Successfully restored downtime & repair info for ${updatedCount} work orders in appdb.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Error restoring downtime:', err);
      process.exit(1);
    } finally {
      client.release();
    }
  } else {
    console.log('\n[DRY-RUN] No changes made. Pass --execute to commit.');
  }

  // 2. Verify summary in appdb
  const summary = await poolProd.query(`
    SELECT 
      to_char(date, 'YYYY-MM') as month,
      status,
      count(*) as count,
      count(case when downtime_duration IS NOT NULL AND downtime_duration != '' AND downtime_duration != '0' AND downtime_duration != '0 Jam 0 Menit' then 1 end) as count_with_downtime,
      count(case when action_taken = 'Pemutihan laporan WO (Closed)' then 1 end) as count_pemutihan
    FROM work_orders
    GROUP BY to_char(date, 'YYYY-MM'), status
    ORDER BY month, status
  `);

  console.log('\n=== APPDB WORK ORDERS SUMMARY ===');
  console.table(summary.rows);

  await poolProd.end();
  await poolStaging.end();
}

main().catch(console.error);
