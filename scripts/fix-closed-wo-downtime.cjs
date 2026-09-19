require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: 'appdb'
});

const isExecute = process.argv.includes('--execute');

async function main() {
  console.log('=== FIX CLOSED WORK ORDERS DOWNTIME (AUG - SEP 2026) ===');
  console.log('Mode:', isExecute ? 'EXECUTE (Commit changes to DB)' : 'DRY-RUN (Preview only)');

  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT 
        wo_id,
        date,
        repair_start,
        repair_end,
        downtime_duration,
        equipment_name,
        equipment_code,
        technician_pic,
        action_taken,
        status
      FROM work_orders
      WHERE status = 'Closed'
        AND (downtime_duration IS NULL OR downtime_duration = '' OR downtime_duration = '0' OR downtime_duration = '0 Jam 0 Menit')
        AND to_char(date, 'YYYY-MM') >= '2026-08'
      ORDER BY date ASC
    `);

    console.log(`\nFound ${res.rows.length} closed work orders needing downtime duration.`);

    const updates = [];
    for (const r of res.rows) {
      const startDate = r.repair_start || r.date;
      const endDate = r.repair_end || new Date();

      const startMs = new Date(startDate).getTime();
      const endMs = new Date(endDate).getTime();

      let diffMs = endMs - startMs;
      if (isNaN(diffMs) || diffMs <= 0) {
        // If instantaneous or end <= start, default to 5 minutes
        diffMs = 5 * 60 * 1000;
      }

      const diffHrs = Math.floor(diffMs / 3600000);
      const diffMins = Math.round((diffMs % 3600000) / 60000);
      const durationStr = `${diffHrs} Jam ${diffMins} Menit`;
      const decimalHours = Math.round((diffMs / 3600000) * 10) / 10;

      updates.push({
        wo_id: r.wo_id,
        equipment_name: r.equipment_name,
        repair_start: startDate,
        repair_end: endDate,
        downtime_duration: durationStr,
        hours: decimalHours
      });
    }

    console.log(`Prepared ${updates.length} updates.\n`);
    console.log('Preview first 10 records:');
    console.table(updates.slice(0, 10).map(u => ({
      wo_id: u.wo_id,
      equipment: u.equipment_name,
      start: new Date(u.repair_start).toISOString().slice(0, 16),
      end: new Date(u.repair_end).toISOString().slice(0, 16),
      duration: u.downtime_duration,
      hours: u.hours
    })));

    const targetWos = ['WO-260913-420', 'WO-260915-282', 'WO-260916-668', 'WO-260916-971'];
    console.log('\nPreview WOs from user screenshot:');
    console.table(updates.filter(u => targetWos.includes(u.wo_id)).map(u => ({
      wo_id: u.wo_id,
      equipment: u.equipment_name,
      duration: u.downtime_duration,
      hours: u.hours
    })));

    if (isExecute) {
      await client.query('BEGIN');
      let count = 0;
      for (const u of updates) {
        const updateRes = await client.query(`
          UPDATE work_orders
          SET 
            repair_start = COALESCE(repair_start, $1),
            repair_end = $2,
            downtime_duration = $3
          WHERE wo_id = $4
        `, [u.repair_start, u.repair_end, u.downtime_duration, u.wo_id]);
        if (updateRes.rowCount > 0) count++;
      }

      await client.query('COMMIT');
      console.log(`\n Successfully updated ${count} work orders in appdb.`);
    } else {
      console.log('\n[DRY-RUN] No changes committed. Run with --execute to commit.');
    }

    // Post check summary
    const summary = await client.query(`
      SELECT 
        to_char(date, 'YYYY-MM') as month,
        status,
        count(*) as total,
        count(case when downtime_duration is not null and downtime_duration != '' and downtime_duration != '0' and downtime_duration != '0 Jam 0 Menit' then 1 end) as with_dt,
        count(case when downtime_duration is null or downtime_duration = '' or downtime_duration = '0' or downtime_duration = '0 Jam 0 Menit' then 1 end) as without_dt
      FROM work_orders
      GROUP BY to_char(date, 'YYYY-MM'), status
      ORDER BY month, status
    `);
    console.log('\n=== CURRENT DB SUMMARY ===');
    console.table(summary.rows);

  } catch (err) {
    if (isExecute) {
      await client.query('ROLLBACK');
    }
    console.error('Error during execution:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
