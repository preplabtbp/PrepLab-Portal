const fs = require('fs');
let code = fs.readFileSync('src/sheets-api.ts', 'utf8');

code = code.replace(
  "export async function gasRequestRoster(action: string, data: any = {}) {\n  try {\n    const url = getRosterGasUrl();\n    const response = await fetch(url, {\n      method: 'POST',\n      body: JSON.stringify({ action, ...data }),\n      headers: { 'Content-Type': 'text/plain;charset=utf-8' }\n    });",
  "export async function gasRequestRoster(action: string, data: any = {}) {\n  try {\n    const url = getRosterGasUrl();\n    const response = await fetch(url, {\n      method: 'POST',\n      redirect: 'follow',\n      body: JSON.stringify({ action, ...data }),\n      headers: { 'Content-Type': 'text/plain;charset=utf-8' }\n    });"
);

fs.writeFileSync('src/sheets-api.ts', code);
