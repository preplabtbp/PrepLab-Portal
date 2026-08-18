const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('/api/inspections/universal')) {
  code = code.replace(/app\.post\("\/api\/inspections", async \(req, res\) => \{/g, `app.post("/api/inspections/universal", async (req, res) => {
    res.json({ success: true, message: 'Inspeksi universal tersimpan (simulasi)' });
  });

  app.post("/api/inspections", async (req, res) => {`);
}

fs.writeFileSync('server.ts', code);
