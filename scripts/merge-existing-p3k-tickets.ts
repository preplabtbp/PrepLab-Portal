import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

async function mergeForDb(connectionString: string, dbName: string) {
  const pool = new Pool({ connectionString });
  console.log(`\n--- Merging P3K tickets in ${dbName} ---`);

  // Find all P3K finding tickets generated from inspections
  const res = await pool.query(`
    SELECT id, ticket_id, requestor_name, category, location, description, date, photo_url, document_link, pt, status
    FROM tickets
    WHERE description ILIKE 'Kotak P3K (%):%'
    ORDER BY date ASC, id ASC
  `);

  console.log(`Found ${res.rows.length} individual P3K item tickets.`);

  // Group by same inspection (same date within 1 minute and same requestor / category / photo)
  const groups: Record<string, any[]> = {};
  for (const row of res.rows) {
    const d = new Date(row.date);
    // Group key with minute precision
    const timeKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}_${d.getHours()}:${d.getMinutes()}`;
    const groupKey = `${row.requestor_name}_${timeKey}_${row.category}`;
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(row);
  }

  for (const [key, rows] of Object.entries(groups)) {
    if (rows.length > 1) {
      console.log(`\nGroup [${key}] has ${rows.length} tickets to merge:`);
      const firstTicket = rows[0];
      const otherIds = rows.slice(1).map(r => r.id);

      // Extract item names and statuses
      const items = rows.map(r => {
        // e.g. "Kotak P3K (Silet): Stok Kosong," -> "Silet: Stok Kosong"
        const match = r.description.match(/Kotak P3K \(([^)]+)\):\s*([^,]+)/i);
        if (match) {
          return `${match[1]}: ${match[2].trim()}`;
        }
        return r.description.replace(/^Kotak P3K \(([^)]+)\):\s*/i, '$1: ');
      }).join(', ');

      const mergedDescription = `Kotak P3K (${firstTicket.location || 'Area'}): ${items}`;
      console.log(`Updating Ticket ID ${firstTicket.ticket_id} (id: ${firstTicket.id}) -> "${mergedDescription}"`);

      await pool.query(`
        UPDATE tickets
        SET description = $1
        WHERE id = $2
      `, [mergedDescription, firstTicket.id]);

      console.log(`Deleting duplicate ticket ids: ${otherIds.join(', ')}`);
      await pool.query(`
        DELETE FROM tickets
        WHERE id = ANY($1::int[])
      `, [otherIds]);
    }
  }

  console.log(`Finished merge for ${dbName}`);
  await pool.end();
}

async function run() {
  const prodUrl = process.env.DATABASE_URL!;
  const stagingUrl = prodUrl.replace('/appdb', '/appdb_staging');

  await mergeForDb(prodUrl, 'appdb (Local / Prod)');
  await mergeForDb(stagingUrl, 'appdb_staging (Staging)');
  process.exit(0);
}

run().catch(console.error);
