const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(
  '  app.post("/api/pemantauan"',
  `  app.get("/api/pemantauan", async (req, res) => {
    try {
      const data = await db.select().from(pemantauan);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pemantauan" });
    }
  });

  app.post("/api/pemantauan"`
);
fs.writeFileSync('server.ts', code);
