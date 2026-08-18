const fs = require('fs');
let code = fs.readFileSync('src/components/admin-dashboard.tsx', 'utf8');

code = code.replace(/Database Admin/, 'Developer Panel');
fs.writeFileSync('src/components/admin-dashboard.tsx', code);
console.log("Patched Admin Dashboard");
