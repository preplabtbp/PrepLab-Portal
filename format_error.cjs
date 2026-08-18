const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /res\.status\(500\)\.json\(\{\s*error:\s*\(e\s*as\s*any\)\.cause\s*\?\s*\(e\s*as\s*any\)\.cause\.detail\s*\|\|\s*\(e\s*as\s*any\)\.cause\.message\s*:\s*e\.message\s*\}\);/g;

const replacement = `
      let errMsg = e.message;
      if ((e as any).cause) {
        errMsg = (e as any).cause.detail || (e as any).cause.message || errMsg;
      }
      res.status(500).json({ error: errMsg });
`;

code = code.replace(regex, replacement);
fs.writeFileSync('server.ts', code);
console.log("Patched error format");
