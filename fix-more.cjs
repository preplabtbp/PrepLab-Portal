const fs = require('fs');

let code = fs.readFileSync('src/sheets-api.ts', 'utf8');

code = code.replace(/export const loginEmployee = async \(nik: string\) => \{ return \{ success: true, employee: null \}; \};/m, `export const loginEmployee = async (nik: string) => { return { success: true, employee: null, error: undefined }; };`);

code = code.replace(/export const getRosterData = async \(params: any\) => \[\];/m, `export const getRosterData = async (params: any) => { return { success: true, roster: [] }; };`);

fs.writeFileSync('src/sheets-api.ts', code);
