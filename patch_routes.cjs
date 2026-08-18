const fs = require('fs');
let code = fs.readFileSync('gas-scripts/Code.gs', 'utf8');

const routes = `
      // ===== MODUL JOB TICKET INTERNAL =====
      case "createInternalTicket": result = submitInternalTicket(payload.data); break;
      case "resolveInternalTicket": result = resolveInternalTicket(payload.data); break;
      case "getInternalTickets": result = handleGetInternalTickets(); break;
`;

code = code.replace('// ===== MODUL WORK ORDER (WO) =====', routes + '\n      // ===== MODUL WORK ORDER (WO) =====');

fs.writeFileSync('gas-scripts/Code.gs', code);
