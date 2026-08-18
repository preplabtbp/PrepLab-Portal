const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const crudCode = `
  app.put("/api/admin/tables/:name/:id", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      const result = await db.update(t).set(req.body).where(eq(t.id, parseInt(req.params.id))).returning();
      res.json(result[0] || {});
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.delete("/api/admin/tables/:name/:id", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      await db.delete(t).where(eq(t.id, parseInt(req.params.id)));
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
  });
`;

if (!code.includes('/api/admin/tables/:name/:id')) {
  code = code.replace(/\/\/ DELETE and PUT if needed\.\.\./, crudCode);
  fs.writeFileSync('server.ts', code);
}
