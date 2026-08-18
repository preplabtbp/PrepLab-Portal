const fs = require('fs');
let code = fs.readFileSync('src/components/notification-bell.tsx', 'utf8');

const filterLogicOld = `  const filteredNotifs = notifications.filter(n => {
    if (activeTab === 'Semua') return true;
    if (activeTab === 'Maintenance') return n.role === 'Maintenance';
    if (activeTab === 'Administration') return n.role === 'Administration' || n.role === 'admin';
    if (activeTab === 'Sistem') return !n.role || (n.role !== 'Maintenance' && n.role !== 'Administration' && n.role !== 'admin');
    return true;
  });`;

const filterLogicNew = `  const filteredNotifs = notifications.filter(n => {
    if (activeTab === 'Semua') return true;
    if (activeTab === 'Maintenance') return n.role === 'Maintenance';
    if (activeTab === 'Administration') return n.role === 'Administration' || n.role === 'admin';
    if (activeTab === 'Laboratory') return n.role === 'Laboratory';
    if (activeTab === 'Preparation') return n.role === 'Preparation';
    if (activeTab === 'QA') return n.role === 'QA';
    if (activeTab === 'Inventory Control') return n.role === 'Inventory Control';
    if (activeTab === 'Sistem') return !n.role || (!['Maintenance', 'Administration', 'admin', 'Laboratory', 'Preparation', 'QA', 'Inventory Control'].includes(n.role));
    return true;
  });`;

code = code.replace(filterLogicOld, filterLogicNew);

const tabsOld = `['Semua', 'Maintenance', 'Administration', 'Sistem']`;
const tabsNew = `['Semua', 'Laboratory', 'Preparation', 'QA', 'Inventory Control', 'Maintenance', 'Administration', 'Sistem']`;

code = code.replace(tabsOld, tabsNew);

fs.writeFileSync('src/components/notification-bell.tsx', code);
console.log("Patched tabs");
