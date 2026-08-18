const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('initRosterCron')) {
  code = code.replace(
    'import { eq } from "drizzle-orm";',
    'import { eq } from "drizzle-orm";\nimport { syncRosterData, initRosterCron } from "./src/syncRoster.js";'
  );
  
  code = code.replace(
    '  app.listen(PORT, "0.0.0.0", () => {',
    '  initRosterCron();\n\n  app.post("/api/admin/sync-roster", async (req, res) => {\n    try {\n      await syncRosterData();\n      res.json({ message: "Sync berhasil" });\n    } catch (e) {\n      res.status(500).json({ error: "Gagal sync" });\n    }\n  });\n\n  app.listen(PORT, "0.0.0.0", () => {'
  );
}

fs.writeFileSync('server.ts', code);
