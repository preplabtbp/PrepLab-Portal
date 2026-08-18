const fs = require('fs');
let code = fs.readFileSync('src/components/create-internal-ticket-screen.tsx', 'utf8');

code = code.replace("import { gasRequest } from '../sheets-api';", "import { createInternalTicket, getInternalTicketCategories } from '../sheets-api';");

code = code.replace("gasRequest('getInternalTicketCategories')", "getInternalTicketCategories()");

code = code.replace("const res = await gasRequest('createInternalTicket', payload);", "const res = await createInternalTicket(payload);");

fs.writeFileSync('src/components/create-internal-ticket-screen.tsx', code);
