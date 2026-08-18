const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldDevQuery = `        if (isDeveloper) {
          // Developer gets ALL notifications
          data = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
        }`;

const newDevQuery = `        if (isDeveloper) {
          // Developer gets their own notifications, plus all role-based and global notifications (userId IS NULL)
          // This prevents them from seeing thousands of duplicate notifications targeted at individual other users
          const { isNull } = require('drizzle-orm');
          data = await db.select().from(notifications)
               .where(or(eq(notifications.userId, userId as string), isNull(notifications.userId)))
               .orderBy(desc(notifications.createdAt));
        }`;

code = code.replace(oldDevQuery, newDevQuery);
fs.writeFileSync('server.ts', code);
console.log("Patched dev notif query");
