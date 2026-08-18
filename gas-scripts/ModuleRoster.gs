function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    
    if (action === "loginEmployee") {
       return ContentService.createTextOutput(JSON.stringify(handleLogin(data))).setMimeType(ContentService.MimeType.JSON);
    }
    if (action === "getRosterData") {
       return ContentService.createTextOutput(JSON.stringify(handleGetRoster(data))).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Action not found" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.message,
      stack: error.stack
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function getColumnIndex(headerRow, columnName) {
  for (var i = 0; i < headerRow.length; i++) {
    if (String(headerRow[i]).toUpperCase().trim() === columnName.toUpperCase()) {
      return i;
    }
  }
  return -1;
}

function findEmployeeInSheet(sheetName, nikToFind) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return null;
  
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 3) return null;
  
  var nikValues = sheet.getRange(3, 3, lastRow - 2, 1).getValues();
  var foundRowIdx = -1;
  for (var i = 0; i < nikValues.length; i++) {
    if (String(nikValues[i][0]).trim() === nikToFind) {
      foundRowIdx = i + 3;
      break;
    }
  }
  
  if (foundRowIdx === -1) return null;
  
  var headers = sheet.getRange(1, 1, 2, lastCol).getValues();
  var datesRow = headers[0]; 
  var daysRow = headers[1];  
  
  var golColIdx = getColumnIndex(datesRow, "GOL");
  if (golColIdx === -1) golColIdx = getColumnIndex(daysRow, "GOL");
  
  var isStaff = (sheetName === "Rooster_Staff");
  var joinDateColIdx = isStaff ? 12 : 12; 
  
  var row = sheet.getRange(foundRowIdx, 1, 1, lastCol).getValues()[0];
  
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
  
  var gol = "";
  if (golColIdx !== -1) {
    gol = String(row[golColIdx] || "");
  } else if (!isStaff) {
    gol = String(row[5] || "");
  }
  
  var joinDateStr = "";
  if (row[joinDateColIdx]) {
    try {
      joinDateStr = Utilities.formatDate(new Date(row[joinDateColIdx]), Session.getScriptTimeZone(), "yyyy-MM-dd");
    } catch(e) {
      joinDateStr = String(row[joinDateColIdx]);
    }
  }
  
  var employee = {
    name: row[1],
    nik: String(row[2]),
    jabatan: row[3],
    jobGrade: isStaff ? String(row[4] || "") : "",
    gol: gol,
    section: isStaff ? row[5] : row[4],
    poh: isStaff ? row[8] : row[7],
    joinDate: joinDateStr,
    schedule: [],
    lastTrvDate: null 
  };
  
  var lastC_Date = null;
  var lastTRV_Date = null;
  
  if (todayColIdx !== -1) {
    for (var c = todayColIdx; c >= 15; c--) {
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
  for (var col = 15; col < datesRow.length; col++) {
    if (datesRow[col]) {
      var dateVal = new Date(datesRow[col]);
      if (dateVal >= today && count < 14) {
        employee.schedule.push({
          date: Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd"),
          day: String(daysRow[col] || ""),
          shiftCode: String(row[col] || "")
        });
        count++;
      }
    }
  }
  return employee;
}

function handleLogin(data) {
  var nikToFind = String(data.nik).trim();
  
  var employee = findEmployeeInSheet("Rooster_Staff", nikToFind);
  if (!employee) {
    employee = findEmployeeInSheet("Rooster_Crew", nikToFind);
  }
  
  if (employee) {
    return { success: true, employee: employee };
  }
  
  return { success: false, error: "NIK tidak ditemukan di database." };
}

function getRosterFromSheet(sheetName, requestorNik, requestorRole, requestorSection) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 3) return [];
  
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
  
  if (todayColIdx === -1) todayColIdx = 15; 
  
  var startCol = 1;
  var numCols = Math.min(todayColIdx + 14, lastCol); 
  
  var dataRange = sheet.getRange(3, startCol, lastRow - 2, numCols).getValues();
  
  var golColIdx = getColumnIndex(datesRow, "GOL");
  if (golColIdx === -1) golColIdx = getColumnIndex(daysRow, "GOL");
  
  var isStaff = (sheetName === "Rooster_Staff");
  var joinDateColIdx = isStaff ? 12 : 12; // Crew M (12)
  
  var role = String(requestorRole).toLowerCase();
  var isSupervisor = role.indexOf("supervisor") > -1 || role.indexOf("spv") > -1;
  var isSuperintendent = role.indexOf("superintendent") > -1 || role.indexOf("supt") > -1;
  var isManager = role.indexOf("manager") > -1 || role.indexOf("mgr") > -1;
  var isAdmin = role === "admin, preparation & laboratory" || role === "sistem admin";
  
  var roster = [];
  
  for (var i = 0; i < dataRange.length; i++) {
    var row = dataRange[i];
    if (!row[2]) continue; 
    
    var empNik = String(row[2]).trim();
    var empSection = isStaff ? String(row[5]) : String(row[4]);
    
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
    
    var gol = "";
    if (golColIdx !== -1 && golColIdx < numCols) {
      gol = String(row[golColIdx] || "");
    } else if (!isStaff) {
      gol = String(row[5] || "");
    }
    
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
      jobGrade: isStaff ? String(row[4] || "") : "",
      gol: gol,
      section: isStaff ? row[5] : row[4],
      poh: isStaff ? row[8] : row[7],
      joinDate: joinDateStr,
      schedule: [],
      lastTrvDate: null
    };
    
    var lastC_Date = null;
    var lastTRV_Date = null;
    
    if (todayColIdx !== -1 && todayColIdx < numCols) {
      for (var c = todayColIdx; c >= 15; c--) {
        if (c >= numCols) continue; 
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
}

function handleGetRoster(data) {
  var requestorNik = data.requestorNik || '';
  var requestorRole = data.requestorRole || '';
  var requestorSection = data.requestorSection || '';
  
  var rosterStaff = getRosterFromSheet("Rooster_Staff", requestorNik, requestorRole, requestorSection);
  var rosterCrew = getRosterFromSheet("Rooster_Crew", requestorNik, requestorRole, requestorSection);
  
  var combined = rosterStaff.concat(rosterCrew);
  
  return { success: true, roster: combined };
}
