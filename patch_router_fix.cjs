const fs = require('fs');
let code = fs.readFileSync('gas-scripts/Router.gs', 'utf8');

const missingRoutes = `
      // ===== MODUL ROSTER =====
      case "loginEmployee": result = handleLogin(payload.data); break;
      case "getRosterData": result = handleGetRoster(payload.data); break;
`;

code = code.replace('// ===== MODUL WORK ORDER (WO) =====', missingRoutes + '\n      // ===== MODUL WORK ORDER (WO) =====');
fs.writeFileSync('gas-scripts/Router.gs', code);
