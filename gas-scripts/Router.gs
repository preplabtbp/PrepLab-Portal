/**
 * Router Utama untuk menerima HTTP POST request
 * Salin file ini ke Google Apps Script Anda (misal beri nama Router.gs)
 * File ini bertugas untuk menerima request dari aplikasi React (frontend) dan mengarahkannya ke fungsi yang tepat.
 */

function doPost(e) {
  try {
    if (!e || !e.postData) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "No postData found in request. This script expects an HTTP POST request."
      })).setMimeType(ContentService.MimeType.JSON);
    }

    let rawData = e.postData.contents;
    let payload;
    try {
      payload = JSON.parse(rawData);
    } catch(parseErr) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Failed to parse JSON payload",
        details: String(parseErr)
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (!payload || typeof payload !== "object") {
       return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: "Payload is strictly null or not an object"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const action = payload.action;

    // Pastikan sheetId tersedia di dalam data
    if (!payload.data) payload.data = {};
    if (payload.sheetId) payload.data.sheetId = payload.sheetId;

    let result = {};

    switch (action) {
      
      // ===== MODUL WO PERMINTAAN =====
      case "createInternalTicket": result = submitInternalTicket(payload.data); break;
      case "resolveInternalTicket": result = resolveInternalTicket(payload.data); break;
      case "getInternalTickets": result = handleGetInternalTickets(); break;
      case "getInternalTicketCategories": result = handleGetInternalTicketCategories(); break;

      
      // ===== MODUL ROSTER =====
      case "loginEmployee": result = handleLogin(payload.data); break;
      case "getRosterData": result = handleGetRoster(payload.data); break;

      // ===== MODUL WORK ORDER (WO) =====
      case "createWO":
        result = submitWO(payload.data);
        break;
      case "updateWOStatus":
        result = resolveWO(payload.data);
        break;
      case "getWOData":
        result = handleGetWOData();
        break;
      case "getSpareparts":
        result = handleGetSpareparts();
        break;
        
      // ===== MODUL PEMANTAUAN RUTIN =====
      case "submitPemantauanBatch":
        result = handleSubmitPemantauanBatch(payload.data);
        break;
      case "getRekapanPemantauan":
        result = handleGetRekapanPemantauan(payload.data);
        break;
      case "buatPdfRekapan":
        result = handleBuatPdfRekapan(payload.data);
        break;
      
      // ===== MODUL APD =====
      case "getApdSettings": result = handleGetApdSettings(payload.data); break;
      case "saveApdSettings": result = handleSaveApdSettings(payload.data); break;
      case "getApdHistory": result = handleGetApdHistory(payload.data); break;
      case "recordApdTakes": result = handleRecordApdTakes(payload.data); break;
      case "getPendingApdDocuments": result = handleGetPendingApdDocuments(); break;
      case "signApdDocument": result = handleSignApdDocument(payload.data); break;
      case "uploadApdProof": result = handleUploadApdProof(payload.data); break;
      case "uploadDocumentProof": result = handleUploadDocumentProof(payload.data); break;
      case "generateApdDocument":
        result = handleGenerateApdDocument(payload.data);
        break;
        
      // ===== UTILITY =====
      case "uploadPhoto":
        result = handleUploadPhoto(payload.data);
        break;
      default:
        throw new Error("Action API tidak dikenali");
    }

    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      data: result 
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'error', 
      message: error.toString() 
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// FUNGSI UTILITY GLOBAL
// ==========================================

function handleUploadPhoto(data) {
  var base64Data = data.base64Data;
  var mimeType = data.mimeType || "image/png";
  var filename = data.filename || ("Upload_" + new Date().getTime() + ".png");
  
  var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), mimeType, filename);
  
  var folderName = "App_Uploads";
  var folders = DriveApp.getFoldersByName(folderName);
  var folder;
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }
  
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return { url: file.getUrl(), id: file.getId() };
}

function pancingIzinGoogle() {
  // Hanya fungsi dummy untuk memancing Google Apps Script agar meminta izin (Authorization)
  // Run fungsi ini sekali di editor GAS jika mengalami masalah permission
  DocumentApp.getActiveDocument();
  DriveApp.getFiles();
  SpreadsheetApp.getActiveSpreadsheet();
}
