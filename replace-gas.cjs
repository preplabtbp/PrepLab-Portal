const fs = require('fs');
let code = fs.readFileSync('src/sheets-api.ts', 'utf8');

// Replace uploadPhotoToDrive
code = code.replace(/export const uploadPhotoToDrive[\s\S]*?^\}/m, `export const uploadPhotoToDrive = async (base64Data: string, mimeType: string, filename: string): Promise<string> => {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Data, mimeType, filename })
  });
  const data = await res.json();
  return data.url;
}`);

code = code.replace(/export const getInternalTickets[\s\S]*?^\}/m, `export const getInternalTickets = async () => {
  const res = await fetch('/api/tickets');
  return await res.json();
}`);

code = code.replace(/export const resolveInternalTicket[\s\S]*?^\}/m, `export const resolveInternalTicket = async (data: any) => {
  const res = await fetch(\`/api/tickets/\${data.ticketId}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: data.status, actionTaken: data.tindakan, pic: data.pic })
  });
  return await res.json();
}`);

code = code.replace(/export const createInternalTicket[\s\S]*?^\}/m, `export const createInternalTicket = async (data: any) => {
  const res = await fetch('/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
}`);

code = code.replace(/export const getInternalTicketCategories[\s\S]*?^\}/m, `export const getInternalTicketCategories = async () => {
  return ['Umum', 'Fasilitas', 'IT', 'Lainnya'];
}`);

code = code.replace(/export const getSpareparts[\s\S]*?^\}/m, `export const getSpareparts = async (): Promise<string[]> => {
  const res = await fetch('/api/spareparts');
  const data = await res.json();
  return data.map((s: any) => s.name);
}`);

code = code.replace(/export const getDowntimeRecords[\s\S]*?^\}/m, `export const getDowntimeRecords = async () => {
  const res = await fetch('/api/downtime');
  return await res.json();
}`);

code = code.replace(/export const updateDowntimeRepair[\s\S]*?^\}/m, `export const updateDowntimeRepair = async (id: string, repairTime: string, notes: string, devOptions?: any) => {
  await fetch(\`/api/downtime/\${id}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repairTime, notes })
  });
}`);

code = code.replace(/export const getTickets[\s\S]*?^\}/m, `export const getTickets = async (statusFilter: string) => {
  const res = await fetch('/api/tickets');
  const data = await res.json();
  if (statusFilter === 'ALL') return data;
  return data.filter((t: any) => t.status === statusFilter);
}`);

code = code.replace(/export const closeTicket[\s\S]*?^\}/m, `export const closeTicket = async (ticketId: string, picName: string, photoBase64: string, notes: string, devOptions?: any) => {
  await fetch(\`/api/tickets/\${ticketId}\`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'CLOSED', actionTaken: notes, pic: picName })
  });
}`);

fs.writeFileSync('src/sheets-api.ts', code);
