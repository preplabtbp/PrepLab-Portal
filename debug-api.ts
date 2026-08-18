import { db } from './src/db/index.js';
import { employees, roster } from './src/db/schema.js';

async function run() {
  const allEmps = await db.select().from(employees);
  const allRoster = await db.select().from(roster);
  
  const rosterByNik: any = {};
  for (const r of allRoster) {
    if (!rosterByNik[r.nik!]) rosterByNik[r.nik!] = {};
    rosterByNik[r.nik!][r.date!] = r.status;
  }
  
  const burhanudin = allEmps.find(e => e.name?.includes('Burhanudin'));
  console.log("Burhanudin:", burhanudin?.nik);
  console.log("Burhanudin Roster Size:", Object.keys(rosterByNik[burhanudin?.nik || '']).length);
}
run();
