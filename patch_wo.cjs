const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Patch WO POST
let woPost = `      res.status(201).json({ ...createdWO, pdfUrl, waMessageText });`;
let woPostRep = `      // Push Notification
      try {
        const _n = await db.insert(notifications).values({
          userId: null,
          role: 'Administration',
          title: 'Work Order Baru',
          message: \`\${createdWO.requestorName} membuat WO \${createdWO.woId}\`,
          type: 'info',
          link: '/adm-dashboard'
        }).returning();
        sendWebPush(_n);
      } catch(e) { console.error('WO push error:', e); }
      res.status(201).json({ ...createdWO, pdfUrl, waMessageText });`;
code = code.replace(woPost, woPostRep);

fs.writeFileSync('server.ts', code);
console.log("Patched WO");
