import { db } from "./src/db/index.js";
import { inspections } from "./src/db/schema.js";

async function main() {
  try {
    const result = await db.insert(inspections as any).values({
      type: 'Mingguan',
      location: 'Test',
      notes: 'Test',
      dataF: JSON.stringify({ test: 1 }),
      pdfUrl: null
    }).returning();
    console.log("Success:", result);
  } catch (e) {
    console.error("DB Error:", e);
  }
  process.exit(0);
}
main();
