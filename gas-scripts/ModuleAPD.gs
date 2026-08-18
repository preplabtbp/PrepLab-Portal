
function handleGenerateApdDocument(data) {
  var templateId = "10KALVJB6fbRbrhG7B29u0OgMwKyGnTcn5bKtZGdeBLg";
  var documentName = "Berita_Acara_APD_" + data.NAMA + "_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd");
  
  var folderName = "App_Uploads"; 
  var folders = DriveApp.getFoldersByName(folderName);
  var folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }
  
  var templateFile = DriveApp.getFileById(templateId);
  var copiedFile = templateFile.makeCopy(documentName, folder);
  var copiedId = copiedFile.getId();
  
  var doc = DocumentApp.openById(copiedId);
  var body = doc.getBody();
  
  // Replace simple tags
  body.replaceText("<<NAMA>>", data.NAMA || "");
  body.replaceText("<<DEPT>>", data.DEPT || "Preparation & Laboratory");
  body.replaceText("<<JABATAN>>", data.JABATAN || "");
  body.replaceText("<<NIK>>", data.NIK || "");
  body.replaceText("<<PERNYATAAN>>", data.PERNYATAAN || "");
  body.replaceText("<<TANGGALTTD>>", data.TANGGALTTD || "");
  body.replaceText("<<NAMASPT>>", data.NAMASPT || "");
  body.replaceText("<<JABATANSPT>>", data.JABATANSPT || "");
  

  if (data.HISTORIS && data.HISTORIS.length > 0) {
    var tables = body.getTables();
    var histTable = null;
    var histTemplateRow = null;
    var histTemplateRowIndex = -1;
    
    // Find the table and row containing <<PENGAMBILAN>>
    for (var i = 0; i < tables.length; i++) {
      var table = tables[i];
      for (var r = 0; r < table.getNumRows(); r++) {
        var row = table.getRow(r);
        if (row.getText().indexOf("<<PENGAMBILAN>>") !== -1) {
          histTable = table;
          histTemplateRow = row;
          histTemplateRowIndex = r;
          break;
        }
      }
      if (histTable) break;
    }
    
    if (histTable && histTemplateRow) {
      var histTemplateRowCopy = histTemplateRow.copy();
      replaceHistorisTags(histTemplateRow, data.HISTORIS[0]);
      for (var i = 1; i < data.HISTORIS.length; i++) {
        var newRow = histTable.insertTableRow(histTemplateRowIndex + i, histTemplateRowCopy.copy());
        replaceHistorisTags(newRow, data.HISTORIS[i]);
      }
    }
    } else {
    body.replaceText("<<PENGAMBILAN>>", "1");
    body.replaceText("<<EARPLUG>>", "");
    body.replaceText("<<STAGEN>>", "");
    body.replaceText("<<SAFETYGLASS>>", "");
    body.replaceText("<<MONCONG>>", "");
    body.replaceText("<<FILTER>>", "");
    body.replaceText("<<EARMUFF>>", "");
    body.replaceText("<<SANDAL>>", "");
    body.replaceText("<<JASLAB>>", "");
    body.replaceText("<<ROMPI1>>", "");
    body.replaceText("<<ROMPI2>>", "");
    body.replaceText("<<SEPATU>>", "");
    body.replaceText("<<REMARKS>>", "");
  }

  // Handle items table
  if (data.ITEMS && data.ITEMS.length > 0) {
    var tables = body.getTables();
    var itemTable = null;
    var templateRow = null;
    var templateRowIndex = -1;
    
    // Find the table and row containing <<NO>>
    for (var i = 0; i < tables.length; i++) {
      var table = tables[i];
      for (var r = 0; r < table.getNumRows(); r++) {
        var row = table.getRow(r);
        if (row.getText().indexOf("<<NO>>") !== -1) {
          itemTable = table;
          templateRow = row;
          templateRowIndex = r;
          break;
        }
      }
      if (itemTable) break;
    }
    
    if (itemTable && templateRow) {
      var templateRowCopy = templateRow.copy();
      
      // First item uses the template row directly
      replaceItemTags(templateRow, data.ITEMS[0]);
      
      // Subsequent items clone the original template row copy
      for (var i = 1; i < data.ITEMS.length; i++) {
        var newRow = itemTable.insertTableRow(templateRowIndex + i, templateRowCopy.copy());
        replaceItemTags(newRow, data.ITEMS[i]);
      }
    }
  } else {
    // If no items but somehow the document has the tags, replace them with empty string
    body.replaceText("<<NO>>", "1");
    body.replaceText("<<NAMA_APD>>", "");
    body.replaceText("<<UKURAN>>", "");
    body.replaceText("<<JUMLAH>>", "");
    body.replaceText("<<TANGGALBEFORE>>", "-");
    body.replaceText("<<EXPIRED>>", "-");
    body.replaceText("<<JENIS>>", "");
    body.replaceText("<<KETERANGAN>>", "");
  }

  // Handle TTD image
  if (data.TTD) {
    replaceTextWithImage(body, "<<TTD>>", data.TTD);
  } else {
    body.replaceText("<<TTD>>", "");
  }
  
  doc.saveAndClose();
  
  var pdfBlob = copiedFile.getAs("application/pdf");
  var pdfFile = folder.createFile(pdfBlob);
  pdfFile.setName(documentName + ".pdf");
  
  pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  var sheet = getApdSheet('apd_pending_documents');
  // Store docId in the row so we can update it later! 
  // Let's store copiedId as DocId, and also we need pdfId.
  // Actually, sheet columns: Timestamp, DocId, PdfUrl, Nama, Status, SptSignature, ManagerSignature, PdfFileId
  // Wait, if we change columns, it might break existing data.
  // We can just store copiedId + "|||" + pdfFile.getId() in DocId column to be safe, or just append to end of row.
  sheet.appendRow([new Date(), copiedId, pdfFile.getUrl(), data.NAMA, 'Menunggu TTD', '', '', pdfFile.getId()]);
  
  return { 
    success: true,
    pdfUrl: pdfFile.getUrl(),
    pdfId: pdfFile.getId()
  };
}

function replaceItemTags(row, item) {
  row.replaceText("<<NO>>", item.NO || "");
  row.replaceText("<<NAMA_APD>>", item.NAMA_APD || "");
  row.replaceText("<<UKURAN>>", item.UKURAN || "");
  row.replaceText("<<JUMLAH>>", item.JUMLAH || "");
  row.replaceText("<<TANGGALBEFORE>>", item.TANGGALBEFORE || "");
  row.replaceText("<<EXPIRED>>", item.EXPIRED || "");
  row.replaceText("<<JENIS>>", item.JENIS || "");
  row.replaceText("<<KETERANGAN>>", item.KETERANGAN || "");
}

function replaceTextWithImage(body, placeholder, base64Data) {
  var b64String = base64Data;
  if (!b64String) return;
  if (b64String.indexOf("base64,") !== -1) {
    b64String = b64String.split("base64,")[1];
  }
  
  var blob = null;
  try {
    blob = Utilities.newBlob(Utilities.base64Decode(b64String), "image/png");
  } catch(e) {
    body.replaceText(placeholder, "");
    return;
  }

  var rangeElement = body.findText(placeholder);
  while (rangeElement !== null) {
    var element = rangeElement.getElement();
    if (element.getType() === DocumentApp.ElementType.TEXT) {
      var textObj = element.asText();
      var offset = rangeElement.getStartOffset();
      var parent = element.getParent();
      
      if (parent.getType() === DocumentApp.ElementType.PARAGRAPH) {
        var p = parent.asParagraph();
        
        try {
          // Clear the placeholder text
          textObj.replaceText(placeholder, "");
          
          // Try inserting image at the start of paragraph
          var inlineImg = p.insertInlineImage(0, blob);
          
          // Adjust size
          var origW = inlineImg.getWidth();
          var origH = inlineImg.getHeight();
          var newW = 180;
          var newH = Math.round((origH * newW) / origW);
          if (newH > 0 && newW > 0) {
            inlineImg.setWidth(newW);
            inlineImg.setHeight(newH);
          }
        } catch(e) {
          // ignore error
        }
      } else {
        textObj.replaceText(placeholder, "");
      }
    }
    // Find next occurrence just in case
    rangeElement = body.findText(placeholder, rangeElement);
  }
}

// ==========================================
// MODUL APD INVENTORY
// ==========================================

function getApdSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === 'apd_settings') {
      sheet.appendRow(['ApdType', 'IntervalMonths']);
    } else if (sheetName === 'apd_history') {
      sheet.appendRow(['Timestamp', 'NIK', 'Nama', 'ApdType', 'Ukuran', 'Jumlah', 'Keterangan']);
    } else if (sheetName === 'apd_pending_documents') {
      sheet.appendRow(['Timestamp', 'DocId', 'PdfUrl', 'Nama', 'Status', 'SptSignature', 'ManagerSignature', 'PdfFileId']);
    }
  }
  return sheet;
}

function handleGetApdSettings(data) {
  var sheet = getApdSheet('apd_settings');
  var dataRange = sheet.getDataRange().getValues();
  var settings = {};
  for (var i = 1; i < dataRange.length; i++) {
    settings[dataRange[i][0]] = parseInt(dataRange[i][1]) || 0;
  }
  return settings;
}

function handleSaveApdSettings(data) {
  var intervals = data.intervals;
  var sheet = getApdSheet('apd_settings');
  sheet.clear();
  sheet.appendRow(['ApdType', 'IntervalMonths']);
  for (var key in intervals) {
    sheet.appendRow([key, intervals[key]]);
  }
  return { success: true };
}

function handleGetApdHistory(data) {
  var nik = data.nik;
  var sheet = getApdSheet('apd_history');
  var dataRange = sheet.getDataRange().getValues();
  var history = {};
  for (var i = 1; i < dataRange.length; i++) {
    if (String(dataRange[i][1]) === String(nik)) {
      var apd = dataRange[i][3];
      var rawDate = dataRange[i][0];\n      var dateStr = typeof rawDate === 'object' ? rawDate.toISOString() : String(rawDate);
      var url = dataRange[i][7] || "";
      if (!history[apd]) history[apd] = [];
      history[apd].push({ date: dateStr, url: url });
    }
  }
  return history;
}

function handleRecordApdTakes(data) {
  var nik = data.nik;
  var nama = data.nama;
  var entries = data.entries;
  var pdfUrl = data.pdfUrl || "";
  var sheet = getApdSheet('apd_history');
  var timestamp = new Date();
  for (var i = 0; i < entries.length; i++) {
    sheet.appendRow([timestamp, nik, nama, entries[i].apd, entries[i].ukuran || '-', entries[i].jumlah || '1', entries[i].keterangan || '-', pdfUrl]);
  }
  return { success: true };
}

function handleGetPendingApdDocuments() {
  var sheet = getApdSheet('apd_pending_documents');
  var dataRange = sheet.getDataRange().getValues();
  var pending = [];
  for (var i = 1; i < dataRange.length; i++) {
    pending.push({
      timestamp: dataRange[i][0],
      id: dataRange[i][1], // This is now docId
      pdfUrl: dataRange[i][2],
      nama: dataRange[i][3],
      status: dataRange[i][4],
      sptSignature: dataRange[i][5] || null,
      managerSignature: dataRange[i][6] || null
    });
  }
  return pending.reverse();
}

function handleSignApdDocument(data) {
  var docId = data.docId;
  var role = data.role;
  var signatureData = data.signatureData;
  var sheet = getApdSheet('apd_pending_documents');
  var dataRange = sheet.getDataRange().getValues();
  
  for (var i = 1; i < dataRange.length; i++) {
    if (String(dataRange[i][1]) === String(docId)) {
      var rowPdfUrl = dataRange[i][2];
      var rowPdfId = dataRange[i][7]; // PdfFileId
      
      // Update the Doc
      try {
        var doc = DocumentApp.openById(docId);
        var body = doc.getBody();
        if (role === 'spt') {
          replaceTextWithImage(body, "<<TTDSPT>>", signatureData);
        } else if (role === 'manager') {
          replaceTextWithImage(body, "<<TTDMGR>>", signatureData);
        }
        doc.saveAndClose();
        
        // Re-generate PDF
        if (rowPdfId) {
          var folderName = "App_Uploads"; 
          var folders = DriveApp.getFoldersByName(folderName);
          var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
          
          var file = DriveApp.getFileById(docId);
          var pdfBlob = file.getAs("application/pdf");
          
          // Delete old PDF if possible
          try { DriveApp.getFileById(rowPdfId).setTrashed(true); } catch(e) {}
          
          // Create new PDF
          var newPdf = folder.createFile(pdfBlob);
          newPdf.setName(file.getName() + ".pdf");
          newPdf.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          
          // Update sheet with new PDF URL and ID
          sheet.getRange(i + 1, 3).setValue(newPdf.getUrl());
          sheet.getRange(i + 1, 8).setValue(newPdf.getId());
        }
      } catch(e) { 
        // Doc might be deleted or not found
      }

      if (role === 'spt') {
        sheet.getRange(i + 1, 6).setValue(signatureData);
      } else if (role === 'manager') {
        sheet.getRange(i + 1, 7).setValue(signatureData);
      }
      
      var sptSig = sheet.getRange(i + 1, 6).getValue();
      var mgrSig = sheet.getRange(i + 1, 7).getValue();
      
      if (sptSig && mgrSig) {
        sheet.getRange(i + 1, 5).setValue('Selesai');
      } else if (sptSig) {
        sheet.getRange(i + 1, 5).setValue('Menunggu Manager');
      } else if (mgrSig) {
        sheet.getRange(i + 1, 5).setValue('Menunggu SPT');
      }
      return { success: true };
    }
  }
  return { success: false, error: 'Document not found' };
}


function handleUploadApdProof(data) {
  var nik = data.nik;
  var apd = data.apd;
  var dateStr = data.date;
  var base64File = data.base64;
  var fileName = data.fileName || "Proof.pdf";

  var folderName = "App_Uploads"; 
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  
  var b64String = base64File;
  if (b64String.indexOf("base64,") !== -1) {
    b64String = b64String.split("base64,")[1];
  }
  
  var blob = Utilities.newBlob(Utilities.base64Decode(b64String), "application/pdf", fileName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  var fileUrl = file.getUrl();

  var sheet = getApdSheet('apd_history');
  var dataRange = sheet.getDataRange().getValues();
  for (var i = dataRange.length - 1; i >= 1; i--) {
    var rNik = String(dataRange[i][1]);
    var rApd = dataRange[i][3];
    var rDateStr = typeof dataRange[i][0] === 'object' ? Utilities.formatDate(dataRange[i][0], Session.getScriptTimeZone(), "yyyy-MM-dd") : dataRange[i][0];
    
    if (rNik === String(nik) && rApd === apd && rDateStr.indexOf(dateStr) !== -1) {
      sheet.getRange(i + 1, 8).setValue(fileUrl);
      return { success: true, url: fileUrl };
    }
  }
  return { success: false, error: "History not found" };
}

function handleUploadDocumentProof(data) {
  var docId = data.docId;
  var base64File = data.base64;
  var fileName = data.fileName || "Proof.pdf";

  var folderName = "App_Uploads"; 
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  
  var b64String = base64File;
  if (b64String.indexOf("base64,") !== -1) {
    b64String = b64String.split("base64,")[1];
  }
  
  var blob = Utilities.newBlob(Utilities.base64Decode(b64String), "application/pdf", fileName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  var fileUrl = file.getUrl();

  var sheet = getApdSheet('apd_pending_documents');
  var dataRange = sheet.getDataRange().getValues();
  for (var i = 1; i < dataRange.length; i++) {
    if (String(dataRange[i][1]) === String(docId)) {
      sheet.getRange(i + 1, 3).setValue(fileUrl);
      sheet.getRange(i + 1, 5).setValue("Selesai");
      return { success: true, url: fileUrl };
    }
  }
  return { success: false, error: "Document not found" };
}

function replaceHistorisTags(row, item) {
  row.replaceText("<<PENGAMBILAN>>", item.PENGAMBILAN || "");
  row.replaceText("<<EARPLUG>>", item.EARPLUG || "");
  row.replaceText("<<STAGEN>>", item.STAGEN || "");
  row.replaceText("<<SAFETYGLASS>>", item.SAFETYGLASS || "");
  row.replaceText("<<MONCONG>>", item.MONCONG || "");
  row.replaceText("<<FILTER>>", item.FILTER || "");
  row.replaceText("<<EARMUFF>>", item.EARMUFF || "");
  row.replaceText("<<SANDAL>>", item.SANDAL || "");
  row.replaceText("<<JASLAB>>", item.JASLAB || "");
  row.replaceText("<<ROMPI1>>", item.ROMPI1 || "");
  row.replaceText("<<ROMPI2>>", item.ROMPI2 || "");
  row.replaceText("<<SEPATU>>", item.SEPATU || "");
  row.replaceText("<<REMARKS>>", item.REMARKS || "");
}
