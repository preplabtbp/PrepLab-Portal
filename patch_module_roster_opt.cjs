const fs = require('fs');
let code = fs.readFileSync('ModuleRoster.gs', 'utf8');

const optRoster = `function getRosterFromSheet(sheetName, requestorNik, requestorRole, requestorSection) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 3) return [];
  
  // Baca header saja dulu untuk cari tahu indeks kolom hari ini
  var headers = sheet.getRange(1, 1, 2, lastCol).getValues();
  var datesRow = headers[0];
  var daysRow = headers[1];
  
  var today = new Date();
  today.setHours(0,0,0,0);
  
  var todayColIdx = -1;
  for (var col = 15; col < datesRow.length; col++) {
    if (datesRow[col]) {
      var d = new Date(datesRow[col]);
      d.setHours(0,0,0,0);
      if (d.getTime() === today.getTime() || d > today) {
         if (todayColIdx === -1) todayColIdx = col;
         if (d.getTime() === today.getTime()) break;
      }
    }
  }
  
  if (todayColIdx === -1) todayColIdx = 15; // fallback
  
  // Kita butuh ngecek riwayat Cuti (C/CS/TRV), jadi kita perlu baca ke belakang beberapa kolom. 
  // Untuk amannya, kita baca misal 60 hari ke belakang dari todayColIdx, 
  // atau kalau mau lebih aman, dari awal tahun (kolom 15).
  // Karena masalah performa, kita baca dari kolom 15 sampai todayColIdx + 14.
  // Ini jauh lebih ringan dari baca seluruh tahun (365+ kolom).
  
  var startCol = 1;
  var numCols = Math.min(todayColIdx + 14, lastCol); 
  
  var dataRange = sheet.getRange(3, startCol, lastRow - 2, numCols).getValues();
  
  var golColIdx = getColumnIndex(datesRow, "GOL");
  if (golColIdx === -1) golColIdx = getColumnIndex(daysRow, "GOL");
  
  var joinDateColIdx = (sheetName === "Rooster_Staff") ? 12 : 11;
  
  var role = String(requestorRole).toLowerCase();
  var isSupervisor = role.indexOf("supervisor") > -1 || role.indexOf("spv") > -1;
  var isSuperintendent = role.indexOf("superintendent") > -1 || role.indexOf("supt") > -1;
  var isManager = role.indexOf("manager") > -1 || role.indexOf("mgr") > -1;
  var isAdmin = role === "admin, preparation & laboratory" || role === "sistem admin";
  
  var roster = [];
  
  for (var i = 0; i < dataRange.length; i++) {
    var row = dataRange[i];
    if (!row[2]) continue; // Skip jika NIK kosong
    
    var empNik = String(row[2]).trim();
    var empSection = String(row[5]);
    
    var canView = false;
    if (isAdmin || isSuperintendent || isManager) {
       canView = true;
    } else if (isSupervisor) {
       if (empSection === requestorSection || empNik === requestorNik) {
          canView = true;
       }
    } else {
       if (empNik === requestorNik) {
          canView = true;
       }
    }
    
    if (!canView) continue;
    
    var gol = (golColIdx !== -1 && golColIdx < numCols) ? String(row[golColIdx] || "") : "";
    
    var joinDateStr = "";
    if (joinDateColIdx < numCols && row[joinDateColIdx]) {
      try {
        joinDateStr = Utilities.formatDate(new Date(row[joinDateColIdx]), Session.getScriptTimeZone(), "yyyy-MM-dd");
      } catch(e) {
        joinDateStr = String(row[joinDateColIdx]);
      }
    }
    
    var employee = {
      name: row[1],
      nik: empNik,
      jabatan: row[3],
      jobGrade: String(row[4] || ""),
      gol: gol,
      section: row[5],
      poh: row[8],
      joinDate: joinDateStr,
      schedule: [],
      lastTrvDate: null
    };
    
    var lastC_Date = null;
    var lastTRV_Date = null;
    
    if (todayColIdx !== -1 && todayColIdx < numCols) {
      for (var c = todayColIdx; c >= 15; c--) {
        if (c >= numCols) continue; // Out of bounds safety
        var val = String(row[c]).toUpperCase().trim();
        if ((val === "C" || val === "CS") && !lastC_Date) {
          if (datesRow[c]) lastC_Date = new Date(datesRow[c]);
        }
        if (val === "TRV" && !lastTRV_Date) {
          if (datesRow[c]) lastTRV_Date = new Date(datesRow[c]);
        }
        if (lastC_Date && lastTRV_Date) break;
      }
    }
    
    var anchorDate = null;
    if (lastC_Date) {
      if (lastTRV_Date && lastTRV_Date > lastC_Date) {
        anchorDate = lastTRV_Date;
      } else {
        anchorDate = new Date(lastC_Date.getTime() + 24 * 60 * 60 * 1000);
      }
    } else if (lastTRV_Date) {
      anchorDate = lastTRV_Date;
    }
    
    if (anchorDate) {
      employee.lastTrvDate = Utilities.formatDate(anchorDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
    }
    
    var count = 0;
    for (var col = 15; col < numCols; col++) {
      if (datesRow[col]) {
        var dateVal = new Date(datesRow[col]);
        if (dateVal >= today && count < 7) {
          employee.schedule.push({
            date: Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd"),
            day: String(daysRow[col] || ""),
            shiftCode: String(row[col] || "")
          });
          count++;
        }
      }
    }
    roster.push(employee);
  }
  return roster;
}`;

// We need to replace getRosterFromSheet in the file.
const startIndex = code.indexOf('function getRosterFromSheet');
const endIndex = code.indexOf('function handleGetRoster');
if (startIndex !== -1 && endIndex !== -1) {
   code = code.substring(0, startIndex) + optRoster + "\n\n" + code.substring(endIndex);
   fs.writeFileSync('ModuleRoster.gs', code);
   console.log("Replaced getRosterFromSheet");
} else {
   console.log("Could not find getRosterFromSheet");
}
