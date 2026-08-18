const fs = require('fs');
let code = fs.readFileSync('gas-scripts/Code.gs', 'utf8');

const getCategoriesFunc = `
function handleGetInternalTicketCategories() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Category_Internal_Master");
  if (!sheet) {
    sheet = ss.insertSheet("Category_Internal_Master");
    sheet.appendRow(["Kategori"]);
    sheet.appendRow(["Rekayasa Engineering"]);
    sheet.appendRow(["Pembuatan Alat Bantu Kerja"]);
    sheet.appendRow(["Modifikasi Fasilitas"]);
  }
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(r => r[0]).filter(String);
}

function saveInternalTicketCategory(kategori) {
  if (!kategori || kategori === "-" || kategori === "Lainnya") return;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("Category_Internal_Master");
  if (!sheet) {
    sheet = ss.insertSheet("Category_Internal_Master");
    sheet.appendRow(["Kategori"]);
  }
  const data = sheet.getDataRange().getValues();
  const exists = data.some(row => String(row[0]).trim().toLowerCase() === String(kategori).trim().toLowerCase());
  if (!exists) {
    sheet.appendRow([kategori]);
  }
}
`;

const routes = `
      // ===== MODUL JOB TICKET INTERNAL =====
      case "getInternalTicketCategories": result = handleGetInternalTicketCategories(); break;
`;

code = code.replace('// ===== MODUL JOB TICKET INTERNAL =====', routes);
code = code.replace('function handleGetInternalTickets() {', getCategoriesFunc + '\nfunction handleGetInternalTickets() {');

// Add save to submitInternalTicket
const insertSave = `
    // Save category if it doesn't exist
    saveInternalTicketCategory(formData.tipeRequest);
    
    // WA Notification
`;
code = code.replace('    // WA Notification', insertSave);

fs.writeFileSync('gas-scripts/Code.gs', code);
