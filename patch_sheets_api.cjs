const fs = require('fs');
let code = fs.readFileSync('src/sheets-api.ts', 'utf8');

const internalTicketFuncs = `
export const createInternalTicket = async (data: any) => {
  return await gasRequestWO('createInternalTicket', data);
};

export const getInternalTicketCategories = async () => {
  return await gasRequestWO('getInternalTicketCategories');
};

export const getInternalTickets = async () => {
  return await gasRequestWO('getInternalTickets');
};

export const resolveInternalTicket = async (data: any) => {
  return await gasRequestWO('resolveInternalTicket', data);
};
`;

code = code + '\n' + internalTicketFuncs;
fs.writeFileSync('src/sheets-api.ts', code);
