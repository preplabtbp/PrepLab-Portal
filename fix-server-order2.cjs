const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const route = `  app.post("/api/admin/sync-roster", async (req, res) => {
    try {
      await syncRosterData();
      res.json({ message: "Sync berhasil" });
    } catch (e) {
      res.status(500).json({ error: "Gagal sync" });
    }
  });`;

code = code.replace(route, '');
code = code.replace(
  '// --- VITE MIDDLEWARE (Untuk Frontend) ---',
  route + '\n\n  // --- VITE MIDDLEWARE (Untuk Frontend) ---'
);

fs.writeFileSync('server.ts', code);
