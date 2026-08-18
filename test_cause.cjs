const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/res\.status\(500\)\.json\(\{\s*error:\s*e\.detail\s*\|\|\s*e\.message\s*\}\);/g, `res.status(500).json({ error: (e as any).cause ? (e as any).cause.detail || (e as any).cause.message : e.message });`);

fs.writeFileSync('server.ts', code);
console.log("Patched all error handling cause");
