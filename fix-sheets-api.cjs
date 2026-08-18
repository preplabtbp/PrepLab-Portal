const fs = require('fs');

let code = fs.readFileSync('src/sheets-api.ts', 'utf8');

// Remove GAS URLs and related functions
code = code.replace(/const DEFAULT_.*?_GAS_URL.*?;\n?/g, '');
code = code.replace(/export const get.*?GasUrl = \(\) => .*?;\n?/g, '');
code = code.replace(/export const set.*?GasUrl = \(url: string\) => .*?;\n?/g, '');

fs.writeFileSync('src/sheets-api.ts', code);
