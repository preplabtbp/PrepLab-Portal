const fs = require('fs');
let code = fs.readFileSync('src/components/admin-dashboard.tsx', 'utf8');

code = code.replace(
  ".then(setTables)",
  ".then(json => Array.isArray(json) ? setTables(json) : setTables([]))"
);

code = code.replace(
  "setData(json);",
  "setData(Array.isArray(json) ? json : []);"
);

fs.writeFileSync('src/components/admin-dashboard.tsx', code);
