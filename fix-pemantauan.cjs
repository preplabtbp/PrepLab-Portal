const fs = require('fs');
let code = fs.readFileSync('src/sheets-api.ts', 'utf8');
code = code.replace(
  "export const getRekapanPemantauan = async (tglMulai: string, tglAkhir: string) => {\n  return [];\n};",
  `export const getRekapanPemantauan = async (tglMulai: string, tglAkhir: string) => {
  try {
    const res = await fetch('/api/pemantauan');
    const data = await res.json();
    return data;
  } catch (e) {
    console.error(e);
    return [];
  }
};`
);
fs.writeFileSync('src/sheets-api.ts', code);
