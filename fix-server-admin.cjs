const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const adminCode = `
  // --- ADMIN API ROUTES ---
  app.get("/api/admin/tables", async (req, res) => {
    try {
      res.json(["employees", "equipments", "workOrders", "tickets", "downtime", "spareparts", "apdSettings", "apdHistory", "apdDocuments", "roster", "inspections", "pemantauan", "questions"]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  const getTableObj = (name) => {
    switch (name) {
      case "employees": return employees;
      case "equipments": return equipments;
      case "workOrders": return workOrders;
      case "tickets": return tickets;
      case "downtime": return downtime;
      case "spareparts": return spareparts;
      case "apdSettings": return apdSettings;
      case "apdHistory": return apdHistory;
      case "apdDocuments": return apdDocuments;
      case "roster": return roster;
      case "inspections": return inspections;
      case "pemantauan": return pemantauan;
      case "questions": return questions;
      default: return null;
    }
  };

  app.get("/api/admin/tables/:name", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      const data = await db.select().from(t).limit(500);
      res.json(data);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/admin/tables/:name", async (req, res) => {
    try {
      const t = getTableObj(req.params.name);
      if (!t) return res.status(404).json({error: "Table not found"});
      const result = await db.insert(t).values(req.body).returning();
      res.json(result[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
  });

  // DELETE and PUT if needed...
  
`;

if (!code.includes('/api/admin/tables')) {
  code = code.replace(/\/\/ --- VITE MIDDLEWARE/, adminCode + '\n  // --- VITE MIDDLEWARE');
}

fs.writeFileSync('server.ts', code);
