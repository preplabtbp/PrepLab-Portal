const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

let aPost = `      const result = await db.insert(agendaEvents).values(req.body).returning();
      res.json({ status: "success", data: result[0] });`;
let aPostRep = `      const result = await db.insert(agendaEvents).values(req.body).returning();
      try {
        const _n = await db.insert(notifications).values({
          userId: null,
          role: null, // Send to all? Or to assigned dept?
          title: 'Agenda Baru',
          message: \`Event: \${req.body.title} - \${req.body.date}\`,
          type: 'info',
          link: '/agenda'
        }).returning();
        sendWebPush(_n);
      } catch(e) {}
      res.json({ status: "success", data: result[0] });`;
code = code.replace(aPost, aPostRep);

fs.writeFileSync('server.ts', code);
console.log("Patched Agenda");
