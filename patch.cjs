const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
const lines = code.split('\n');
lines.splice(747, 0, '  app.get("/api/equipments", async (req, res) => {');
fs.writeFileSync('server.ts', lines.join('\n'));
