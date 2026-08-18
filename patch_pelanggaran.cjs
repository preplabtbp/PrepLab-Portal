const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

let pPost = `      const result = await db.insert(pelanggaran).values(req.body).returning();
      res.status(201).json(result[0]);`;
let pPostRep = `      const result = await db.insert(pelanggaran).values(req.body).returning();
      try {
        const _n = await db.insert(notifications).values({
          userId: null,
          role: 'Administration',
          title: 'Laporan Pelanggaran',
          message: \`\${req.body.name} - \${req.body.jenisPelanggaran}\`,
          type: 'warning',
          link: '/pelanggaran'
        }).returning();
        sendWebPush(_n);
      } catch(e) {}
      res.status(201).json(result[0]);`;
code = code.replace(pPost, pPostRep);

fs.writeFileSync('server.ts', code);
console.log("Patched Pelanggaran");
