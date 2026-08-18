const fs = require('fs');
let code = fs.readFileSync('gas-scripts/Router.gs', 'utf8');

const internalRoutes = `
      // ===== MODUL JOB TICKET INTERNAL =====
      case "createInternalTicket": result = submitInternalTicket(payload.data); break;
      case "resolveInternalTicket": result = resolveInternalTicket(payload.data); break;
      case "getInternalTickets": result = handleGetInternalTickets(); break;
      case "getInternalTicketCategories": result = handleGetInternalTicketCategories(); break;
`;

code = code.replace('// ===== MODUL WORK ORDER (WO) =====', internalRoutes + '\n      // ===== MODUL WORK ORDER (WO) =====');
fs.writeFileSync('gas-scripts/Router.gs', code);
