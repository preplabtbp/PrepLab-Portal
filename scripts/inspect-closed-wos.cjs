require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: 'appdb'
});

async function main() {
  console.log('=== CHECK CLOSED WORK ORDERS MISSING DOWNTIME ===\n');

  // Fetch closed WOs from August & September (and beyond) where downtime_duration is missing
  const res = await pool.query(`
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

  console.log(`Found ${res.rows.length} closed work orders in Aug-Sep without downtime duration.\n`);

  let validToUpdate = [];
  for (const r of res.rows) {
    const startDate = r.repair_start || r.date;
    const endDate = r.repair_end;

    if (!startDate || !endDate) {
      console.warn(`[SKIP] ${r.wo_id}: Missing startDate or endDate`);
      continue;
    }

    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();

    if (endMs <= startMs) {
      console.warn(`[WARN] ${r.wo_id}: endDate <= startDate (End: ${endDate}, Start: ${startDate})`);
      // Minimum 5 minutes if instantaneous
      const durStr = '0 Jam 5 Menit';
      validToUpdate.push({
        wo_id: r.wo_id,
        repair_start: startDate,
        repair_end: endDate,
        downtime_duration: durStr,
        hours: 0.1
      });
      continue;
    }

    const diffMs = endMs - startMs;
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffMins = Math.round((diffMs % 3600000) / 60000);
    const durStr = `${diffHrs} Jam ${diffMins} Menit`;
    const hours = Math.round((diffMs / 3600000) * 10) / 10;

    validToUpdate.push({
      wo_id: r.wo_id,
      equipment_name: r.equipment_name,
      repair_start: r.repair_start || r.date,
      repair_end: r.repair_end,
      downtime_duration: durStr,
      hours
    });
  }

  console.log(`Ready to update ${validToUpdate.length} work orders.`);
  console.log('\nSample calculations:');
  console.table(validToUpdate.slice(0, 15).map(v => ({
    wo_id: v.wo_id,
    equipment: v.equipment_name,
    start: v.repair_start ? new Date(v.repair_start).toISOString().slice(0,16) : null,
    end: v.repair_end ? new Date(v.repair_end).toISOString().slice(0,16) : null,
    duration: v.downtime_duration,
    hours: v.hours
  })));

  // Specifically check the 4 WOs from the user's screenshot
  const targetIds = ['WO-260913-420', 'WO-260915-282', 'WO-260916-668', 'WO-260916-971'];
  console.log('\n--- TARGET WOS FROM USER SCREENSHOT ---');
  const targetUpdates = validToUpdate.filter(v => targetIds.includes(v.wo_id));
  console.table(targetUpdates.map(v => ({
    wo_id: v.wo_id,
    equipment: v.equipment_name,
    duration: v.downtime_duration,
    hours: v.hours
  })));

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
