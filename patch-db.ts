import { db } from "./src/db/index.js";
import { inspections } from "./src/db/schema.js";
import { eq } from "drizzle-orm";

async function run() {
    console.log("Starting DB patch for inspections...");
    const allInspections = await db.select().from(inspections);
    let patchedCount = 0;

    for (const record of allInspections) {
        if (!record.dataF) continue;

        let needsUpdate = false;
        let newType = record.type;
        let newInspectorName = record.inspectorName;
        let newLocation = record.location;

        try {
            const parsed = JSON.parse(record.dataF as string);
            
            if (Array.isArray(parsed)) {
                // Kepatuhan APD
                if (parsed.length > 0 && Array.isArray(parsed[0])) {
                    if (!newType || newType === 'Mingguan') { newType = 'Kepatuhan APD'; needsUpdate = true; }
                    if (!newInspectorName && parsed[0][16]) { newInspectorName = parsed[0][16]; needsUpdate = true; }
                    if (!newLocation && parsed[0][2]) { newLocation = parsed[0][2]; needsUpdate = true; }
                }
            } else if (typeof parsed === 'object') {
                // Universal / Mingguan
                if (!newType || newType === 'Mingguan') { 
                    newType = parsed.judulForm || 'Mingguan'; 
                    needsUpdate = true;
                }
                if (!newInspectorName && parsed.insp1) {
                    newInspectorName = parsed.insp1;
                    needsUpdate = true;
                }
                if (!newLocation && parsed.lokasiUmum) {
                    newLocation = parsed.lokasiUmum;
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await db.update(inspections)
                    .set({ 
                        type: newType, 
                        inspectorName: newInspectorName,
                        location: newLocation
                    })
                    .where(eq(inspections.id, record.id));
                patchedCount++;
                console.log(`Patched inspection ID ${record.id} -> Type: ${newType}, Inspector: ${newInspectorName}`);
            }
        } catch (e) {
            console.error(`Error parsing dataF for inspection ID ${record.id}:`, e);
        }
    }

    console.log(`Finished patching. Patched ${patchedCount} records out of ${allInspections.length}.`);
    process.exit(0);
}

run();
