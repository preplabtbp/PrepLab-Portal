const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Patch Ticket POST
let tPost = `      res.status(201).json({ ...ticket, waMessageText });`;
let tPostRep = `      // Push Notification
      try {
        const _n = await db.insert(notifications).values({
          userId: null,
          role: 'Administration',
          title: 'Ticket Baru',
          message: \`\${ticket.requestorName} membuat tiket \${ticket.ticketId}\`,
          type: 'info',
          link: '/adm-dashboard'
        }).returning();
        sendWebPush(_n);
      } catch(e) { console.error('Ticket push error:', e); }
      res.status(201).json({ ...ticket, waMessageText });`;
code = code.replace(tPost, tPostRep);

// Patch Ticket PUT
let tPut = `      const updated = result[0];
      res.json(updated);`;
let tPutRep = `      const updated = result[0];
      try {
        if (updated.requestorNik && updateData.status) {
          const _n = await db.insert(notifications).values({
            userId: updated.requestorNik,
            title: 'Update Tiket',
            message: \`Tiket \${updated.ticketId} Anda berubah status menjadi \${updated.status}\`,
            type: 'info',
            link: '/tickets'
          }).returning();
          sendWebPush(_n);
        }
      } catch(e) {}
      res.json(updated);`;
code = code.replace(tPut, tPutRep);

fs.writeFileSync('server.ts', code);
console.log("Patched Ticket");
