require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: 'appdb'
});

const isExecute = process.argv.includes('--execute');

function standardizeWoId(oldId, date) {
  if (!oldId) return oldId;
  const raw = oldId.trim();

  // 1. If starts with FWO-YYMMDD-XXX
  // e.g. FWO-260909-770 -> WO-260909-770
  const mFwo = raw.match(/^FWO-(\d{6})-(\d+)$/i);
  if (mFwo) {
    const dStr = mFwo[1];
    let numStr = mFwo[2];
    if (numStr.length > 3) numStr = numStr.slice(0, 3);
    else numStr = numStr.padStart(3, '0');
    return `WO-${dStr}-${numStr}`;
  }

  // 2. If starts with WO-YYYYMMDD-XXXX or WO-YYYYMMDD-XXX or WO-YYYYMMDD-XX
  // e.g. WO-20260708-4167 -> WO-260708-416
  const mWo4 = raw.match(/^WO-(\d{4})(\d{2})(\d{2})-(\d+)$/i);
  if (mWo4) {
    const yy = mWo4[1].slice(2, 4);
    const mm = mWo4[2];
    const dd = mWo4[3];
    let numStr = mWo4[4];
    if (numStr.length > 3) numStr = numStr.slice(0, 3);
    else numStr = numStr.padStart(3, '0');
    return `WO-${yy}${mm}${dd}-${numStr}`;
  }

  // 3. If starts with WO-YYMMDD-XXX
  const mWo2 = raw.match(/^WO-(\d{6})-(\d+)$/i);
  if (mWo2) {
    const dStr = mWo2[1];
    let numStr = mWo2[2];
    if (numStr.length > 3) numStr = numStr.slice(0, 3);
    else numStr = numStr.padStart(3, '0');
    return `WO-${dStr}-${numStr}`;
  }

  // 4. Fallback using date
  if (date) {
    const d = new Date(date);
    const yy = String(d.getFullYear()).slice(2, 4);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const digits = raw.replace(/\D/g, '');
    const numStr = (digits.slice(-3) || '100').padStart(3, '0');
    return `WO-${yy}${mm}${dd}-${numStr}`;
  }

  return raw;
}

async function run() {
  console.log('=== STANDARDIZATION OF WORK ORDER IDs (WO-YYMMDD-XXX) ===');
  console.log('Mode:', isExecute ? 'EXECUTE (Commit to DB)' : 'DRY-RUN (Preview only)');

  const res = await pool.query('SELECT id, wo_id, date FROM work_orders ORDER BY date ASC, id ASC');
  console.log(`Found ${res.rows.length} total work orders.`);

  const newIds = new Map();
  const updates = [];

  for (const r of res.rows) {
    let newId = standardizeWoId(r.wo_id, r.date);

    // Collision resolution
    if (newIds.has(newId)) {
      let base = newId.slice(0, -3);
      let seq = parseInt(newId.slice(-3), 10);
      while (newIds.has(newId)) {
        seq = (seq + 1) % 1000;
        newId = `${base}${String(seq).padStart(3, '0')}`;
      }
    }
    newIds.set(newId, r.id);
    if (newId !== r.wo_id) {
      updates.push({ id: r.id, oldId: r.wo_id, newId });
    }
  }

  console.log(`Work orders needing standardization: ${updates.length} / ${res.rows.length}`);
  console.log('\nSample transformations (first 10):');
  console.table(updates.slice(0, 10));
  console.log('\nSample transformations from later (FWO):');
  console.table(updates.filter(u => u.oldId.startsWith('FWO-')).slice(0, 10));

  if (isExecute) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Temporarily use temporary IDs if needed to avoid unique constraint collision during update
      console.log('\nApplying updates in transaction...');
      for (const u of updates) {
        await client.query('UPDATE work_orders SET wo_id = $1 WHERE id = $2', [
          `TEMP-${u.id}-${u.newId}`,
          u.id
        ]);
      }

      for (const u of updates) {
        await client.query('UPDATE work_orders SET wo_id = $1 WHERE id = $2', [
          u.newId,
          u.id
        ]);
      }

      // Also update notifications table if oldId appears in message
      console.log('Updating notifications message references...');
      for (const u of updates) {
        if (u.oldId.startsWith('FWO-')) {
          await client.query(
            "UPDATE notifications SET message = replace(message, $1, $2) WHERE message LIKE '%' || $1 || '%'",
            [u.oldId, u.newId]
          );
        }
      }

      await client.query('COMMIT');
      console.log('✅ Successfully updated all work orders to standard format!');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Transaction failed and rolled back:', err);
      process.exit(1);
    } finally {
      client.release();
    }
  } else {
    console.log('\n[DRY-RUN] No changes committed. Run with --execute to commit.');
  }

  // Verification
  const verify = await pool.query(`
    SELECT 
      count(*) as total,
      count(case when wo_id ~ '^WO-[0-9]{6}-[0-9]{3}$' then 1 end) as valid_standard_format,
      count(distinct wo_id) as unique_ids
    FROM work_orders
  `);
  console.log('\n=== VERIFICATION ===');
  console.table(verify.rows);

  await pool.end();
}

run().catch(console.error);
