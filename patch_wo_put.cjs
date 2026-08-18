const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

let woPut = `      res.json({ ...result[0], waMessageText });`;
let woPutRep = `      // Push notification
      try {
        if (result[0].requestorNik && updateData.status) {
          const _n = await db.insert(notifications).values({
            userId: result[0].requestorNik,
            title: 'Update Work Order',
            message: \`Work Order \${result[0].woId} Anda berubah status menjadi \${result[0].status}\`,
            type: 'info',
            link: '/wo-list'
          }).returning();
          sendWebPush(_n);
        }
      } catch(e) {}
      res.json({ ...result[0], waMessageText });`;
code = code.replace(woPut, woPutRep);

fs.writeFileSync('server.ts', code);
console.log("Patched WO PUT");
