const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /async function sendWebPush\(notif: any\) \{[\s\S]*?\} catch\(err\) \{ console\.error\('Push error:', err\); \}\n\}/;
const replacement = `async function sendWebPush(notifs: any | any[]) {
  try {
    const notificationsArray = Array.isArray(notifs) ? notifs : [notifs];
    for (const notif of notificationsArray) {
      let subs: any[] = [];
      if (notif.userId) {
         subs = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.nik, notif.userId));
      } else if (notif.role) {
         const targetEmployees = await db.select().from(employees).where(eq(employees.department, notif.role));
         const niks = targetEmployees.map((e: any) => e.nik);
         if (niks.length > 0) {
            subs = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.nik, niks));
         }
      } else {
         subs = await db.select().from(pushSubscriptions);
      }
      
      for (const sub of subs) {
        try {
          const pushSub = JSON.parse(sub.subscription);
          await webpush.sendNotification(pushSub, JSON.stringify({
            title: notif.title,
            body: notif.message,
            url: notif.link || '/'
          }));
        } catch (e: any) {
          if (e.statusCode === 410) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, sub.id));
          }
        }
      }
    }
  } catch(err) { console.error('Push error:', err); }
}`;
if (code.match(regex)) {
  fs.writeFileSync('server.ts', code.replace(regex, replacement));
  console.log("Replaced successfully!");
} else {
  console.log("Not matched!");
}
