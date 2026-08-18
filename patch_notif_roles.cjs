const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Patch Work Orders Push role to Maintenance
code = code.replace(
/role: 'Administration',\s*title: 'Work Order Baru',/g,
"role: 'Maintenance',\n          title: 'Work Order Baru',"
);

// Patch Ticket Push role to Maintenance
code = code.replace(
/role: 'Administration',\s*title: 'Ticket Baru',/g,
"role: 'Maintenance',\n          title: 'Ticket Baru',"
);

// Patch Notifications API GET
const getNotifOld = `        let isAdmin = userId === '02D25000055' || userId === 'preplabadmin' || (typeof userId === 'string' && userId.toLowerCase().includes('admin'));
        let isAdministration = false;
        
        const emp = await db.select().from(employees).where(eq(employees.nik, userId as string)).limit(1);
        if (emp.length > 0) {
          const dept = (emp[0].department || '').toLowerCase();
          const sect = (emp[0].section || '').toLowerCase();
          const jab = (emp[0].jabatan || '').toLowerCase();
          
          if (dept.includes('admin') || sect.includes('admin') || jab.includes('admin')) {
             isAdmin = true;
          }
          if (dept.includes('administration') || sect.includes('administration')) {
             isAdministration = true;
          }
        }
        
        let conditions = [eq(notifications.userId, userId as string)];
        if (isAdmin) conditions.push(eq(notifications.role, 'admin'));
        if (isAdministration) conditions.push(eq(notifications.role, 'Administration'));

        data = await db.select().from(notifications)
             .where(or(...conditions))
             .orderBy(desc(notifications.createdAt));`;

const getNotifNew = `        const isDeveloper = userId === '02D25000055' || userId === 'preplabadmin';
        
        if (isDeveloper) {
          // Developer gets ALL notifications
          data = await db.select().from(notifications).orderBy(desc(notifications.createdAt));
        } else {
          let roles = [];
          const emp = await db.select().from(employees).where(eq(employees.nik, userId as string)).limit(1);
          if (emp.length > 0) {
            const dept = (emp[0].department || '');
            if (dept) roles.push(dept);
            const sect = (emp[0].section || '');
            if (sect) roles.push(sect);
          }
          
          let conditions = [eq(notifications.userId, userId as string)];
          if (roles.length > 0) {
            conditions.push(inArray(notifications.role, roles));
          }

          data = await db.select().from(notifications)
               .where(or(...conditions))
               .orderBy(desc(notifications.createdAt));
        }`;

code = code.replace(getNotifOld, getNotifNew);

fs.writeFileSync('server.ts', code);
console.log("Patched server.ts for notification roles");
