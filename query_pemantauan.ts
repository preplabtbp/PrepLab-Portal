import { db } from "./src/db/index.js";
import { pemantauan } from "./src/db/schema.js";
import { sql } from "drizzle-orm";

async function main() {
    const res = await db.execute(sql`SELECT id FROM pemantauan ORDER BY id ASC LIMIT 500`);
    const ids = res.rows.map(r => r.id as number);
    console.log('Min ID:', Math.min(...ids), 'Max ID:', Math.max(...ids), 'Count:', ids.length);
    for (let i = 1; i < ids.length; i++) {
       if (ids[i] - ids[i-1] > 100) {
           console.log(`Big jump detected between index ${i-1} (id ${ids[i-1]}) and index ${i} (id ${ids[i]})`);
       }
    }
}

main().catch(console.error).then(() => process.exit(0));
