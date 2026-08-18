const fs = require('fs');
let code = fs.readFileSync('src/sheets-api.ts', 'utf8');
code = code.replace(
  "export const getRosterData = async (params: any) => { return { success: true, roster: [] }; };",
  `export const getRosterData = async (params: any) => {
  try {
    const res = await fetch('/api/roster');
    const data = await res.json();
    return { success: true, roster: data };
  } catch(e) {
    console.error(e);
    return { success: false, roster: [] };
  }
};`
);
fs.writeFileSync('src/sheets-api.ts', code);
