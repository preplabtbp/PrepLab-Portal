const fs = require('fs');
let code = fs.readFileSync('src/sheets-api.ts', 'utf8');

const newFunc = `export const appendRowsToSheet = async (sheetName: string, rows: any[][], devOptions?: any) => {
  try {
    if (sheetName === 'Inspections') {
      for (const row of rows) {
        await fetch('/api/inspections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: row[0],
            equipmentName: row[1],
            status: row[2],
            inspectorName: row[3],
            notes: row[4],
            type: 'Harian'
          })
        });
      }
    } else if (sheetName === 'Downtime') {
      for (const row of rows) {
        // [dtId, tool.name, bTimeIso, '', s.notes, 'Breakdown']
        await fetch('/api/admin/tables/downtime', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolName: row[1],
            breakdownTime: row[2],
            repairTime: row[3],
            notes: row[4],
            status: row[5]
          })
        });
      }
    }
  } catch(e) {
    console.error(e);
  }
};`;

code = code.replace(
  /export const appendRowsToSheet = async \(sheetName: string, rows: any\[\]\[\], devOptions\?: any\) => \{\n  console\.log\("appendRowsToSheet called but ignored \(no GAS\)"\);\n\};/,
  newFunc
);

fs.writeFileSync('src/sheets-api.ts', code);
