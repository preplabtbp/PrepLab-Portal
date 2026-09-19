require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME
});

const isExecute = process.argv.includes('--execute');

async function main() {
  console.log('=== PEMUTIHAN WORK ORDERS JUNI - JULI 2026 ===');
  console.log('Mode:', isExecute ? 'EXECUTE (Commit changes to DB)' : 'DRY-RUN (Preview only)');

  const client = await pool.connect();
  try {
    if (isExecute) {
      await client.query('BEGIN');
    }

    // 1. Check Open WOs in June-July
    const openRes = await client.query(`
      SELECT id, wo_id, date, equipment_name, status, downtime_duration, action_taken
      FROM work_orders
      WHERE status = 'Open' AND to_char(date, 'YYYY-MM') IN ('2026-06', '2026-07')
      ORDER BY date ASC
    `);

    // 2. Check already Closed WOs in June-July
    const closedRes = await client.query(`
      SELECT id, wo_id, date, equipment_name, status, downtime_duration, action_taken
      FROM work_orders
      WHERE status = 'Closed' AND to_char(date, 'YYYY-MM') IN ('2026-06', '2026-07')
      ORDER BY date ASC
    `);

    console.log(`\nFound ${openRes.rows.length} Open work orders to be closed with 0 downtime.`);
    console.log(`Found ${closedRes.rows.length} existing Closed work orders to have downtime zeroed out.`);

    if (isExecute) {
      // 1. Update Open WOs: Set to Closed, downtime 0, action_taken pemutihan, repair dates null
      const updateOpen = await client.query(`
        UPDATE work_orders
        SET 
          status = 'Closed',
          downtime_duration = '0 Jam 0 Menit',
          action_taken = CASE 
            WHEN action_taken IS NULL OR trim(action_taken) = '' OR action_taken = '-' 
            THEN 'Pemutihan laporan WO (Closed)' 
            ELSE action_taken 
          END,
          repair_start = NULL,
          repair_end = NULL
        WHERE status = 'Open' AND to_char(date, 'YYYY-MM') IN ('2026-06', '2026-07')
      `);
      console.log(`\n✅ Updated ${updateOpen.rowCount} Open work orders to Closed.`);

      // 2. Update existing Closed WOs: Zero out downtime
      const updateClosed = await client.query(`
        UPDATE work_orders
        SET 
          downtime_duration = '0 Jam 0 Menit',
          repair_start = NULL,
          repair_end = NULL
        WHERE status = 'Closed' AND to_char(date, 'YYYY-MM') IN ('2026-06', '2026-07')
      `);
      console.log(`✅ Zeroed downtime for ${updateClosed.rowCount} previously Closed work orders.`);

      await client.query('COMMIT');
      console.log('\nTransaction committed successfully.');
    } else {
      console.log('\n[DRY-RUN] No changes were written. Run with --execute to commit.');
    }

    // 3. Post-check summary
    const summaryRes = await client.query(`
      SELECT 
        to_char(date, 'YYYY-MM') as month,
        status,
        count(*) as total_count,
        count(case when downtime_duration IS NOT NULL AND downtime_duration != '' AND downtime_duration != '0' AND downtime_duration != '0 Jam 0 Menit' then 1 end) as count_with_downtime
      FROM work_orders
      GROUP BY to_char(date, 'YYYY-MM'), status
      ORDER BY month, status
    `);
    console.log('\n=== CURRENT DATABASE STATE ===');
    console.table(summaryRes.rows);

  } catch (err) {
    if (isExecute) {
      await client.query('ROLLBACK');
      console.error('Transaction rolled back due to error:', err);
    } else {
      console.error('Error during dry-run:', err);
    }
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
