const fs = require('fs');

let code = fs.readFileSync('src/sheets-api.ts', 'utf8');

const regex = /^const DEFAULT_P2H_SPREADSHEET_ID[\s\S]*?(?=export const getEmployees)/m;
code = code.replace(regex, `const DEFAULT_KTA_URL = 'https://docs.google.com/forms/d/1YMympG3aA-8l978aAlRJFSoi-SVQAKiS7KmJjNRfuBI/viewform?edit_requested=true';
export const getKtaUrl = () => { const v = localStorage.getItem('KTA_URL'); return (v && v.startsWith('http')) ? v : DEFAULT_KTA_URL; };
export const setKtaUrl = (url: string) => localStorage.setItem('KTA_URL', url);

`);

fs.writeFileSync('src/sheets-api.ts', code);
