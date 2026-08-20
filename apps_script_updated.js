// =========================================================================
// KONFIGURASI UTAMA (MESIN CETAK GANDA & DUAL OUTPUT)
// =========================================================================
var TEMPLATE_APD = ["1Hq8638jws03Ce6H-0I_JDQJx-56Q4S-s0B0xI4YqsOg", "1zmWawSUGNKSnTkCCWHoKuYjnsj3xFheqGzv8U3jg0Y0"]; 
var TEMPLATE_UMUM = ["1nF2lMiS1aWw5Y9KuB3WHG3DVbMfP06akFBn1xwGd-lI", "18O5S17Bdz75WljpseVZy9hfp-nRbNbfJc76iebk-PBo"];
var TEMPLATE_P3K = ["1lKgdnCLdz61chswn1UC_8BR3S2gIFU_mUzNVmWEG3_c", "1g_2js9cGcDCNY06m2benyqXU_eEDDQZHOhtiYh6GHtU"]; 
var TEMPLATE_PERKAKAS = ["1bUmgV9luewjESQfYLq5pJA88Bh_-oKuwU_xLxTPW1hE", "1hR1qMbGtApjHW9fBPN0dByFcFEKOpl_z0jIIetJsJxM"];
var TEMPLATE_TABUNG = ["1v0wA0WZTaylkPDYRVQ-NxphT_KzZGu869WBrqUh1KGs", "1p8FdM0YS6a_6RlC1yV6j4md9dfBJKpDqssOv-Iosw6o"];
var TEMPLATE_SARANA = ["1Xge72qbSeOp9dmOW7xnfDnxv6TEnL9E8QLhuM7ms-6s", "15G8qNx19iTp3IKWQ8DMKLxrdkTvBLJLXWLGrZhMFk1c"];
var TEMPLATE_TANGGA = ["1ZSWNbcSEwCVXZybe_7ejYA0_SD1DnCqVQKMpQaCRWLs", "1cawvrsJwQ14P8d6_S5K_i-mMJyrwpfZ-OjNVH_hCWc4"];

var LOG_SPREADSHEET_ID = "1wk0bXvmbZHZOjTTGDy-5oQrFZJmFjJ1c";
var ROOSTER_SPREADSHEET_ID = "10a2JYxQxEfcMDdl968KUHiC1fVI65vPaWMH7shMv7U0";
var FOLDER_ID = "1frVInpNKg6ikZSEWG4PQ-3XNnJNgHjox";
var FOLDER_FOTO_PROSES = "13YlIQ3CpGXAkWpC9yz2GHkU-VRaEtqVo";
var FOLDER_FOTO_TEMUAN = "1gJAKjbb_6-DrEqc3SLPEOxBUObSb0ZBC";
var FOLDER_TTD = "1nJ3HJXLvXKTBu85CiE0-RT4f14N2EDwS";
var NAMA_PERUSAHAAN = ["_PT_TBP", "_PT_GPS"];

function doPost(e) {
  try {
    var raw = e.postData.contents;
    var payload = JSON.parse(raw);

    if (payload.action === "submitInspeksiUniversal") {
      var finalData = payload.finalData;
      var r = submitInspeksiUniversal(finalData, payload.ttd1, payload.ttd2, payload.ttd3, payload.fotoTemuanArray, payload.fotoProses);
      var resultObj = (typeof r === "string") ? JSON.parse(r) : r;
      if (resultObj.status === "error") {
          return ContentService.createTextOutput(JSON.stringify({ success: false, message: resultObj.message, logDetails: resultObj.logDetails })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: resultObj
      })).setMimeType(ContentService.MimeType.JSON);
    } 
    else if (payload.action === "submitInspeksi") {
      var r = submitInspeksi(payload.dataF || payload.finalData, payload.ttd1, payload.ttd2, payload.ttd3, payload.fotoProses, payload.devOptions);
      var resultObj = (typeof r === "string") ? JSON.parse(r) : r;
      if (resultObj.status === "error") {
          return ContentService.createTextOutput(JSON.stringify({ success: false, message: resultObj.message, logDetails: resultObj.logDetails })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: resultObj
      })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) { addLog("TRACE", "Error occurred at stack: " + err.stack);
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: err.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.page === 'tiket') {
    return HtmlService.createHtmlOutputFromFile('DashboardTiket')
      .setTitle('Dashboard Job Ticket K3')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Inspeksi Harian Terpadu') 
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getKaryawan() { return getKaryawanRooster(); }

function getKaryawanRooster() {
  var ss = SpreadsheetApp.openById(ROOSTER_SPREADSHEET_ID);
  var hasil = [["Nama", "Jabatan", "Divisi", "Shift", "NIK"]];
  hasil = hasil.concat(bacaRosterSheet(ss, "Rooster_Staff", { nama: 1, nik: 2, jabatan: 3, section: 5, shift: 7 }));
  hasil = hasil.concat(bacaRosterSheet(ss, "Rooster_Crew", { nama: 1, nik: 2, jabatan: 3, section: 4, shift: 6 }));
  return hasil;
}

function bacaRosterSheet(ss, sheetName, kolom) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var hasil = [];
  for (var r = 2; r < data.length; r++) {
    var nama = data[r][kolom.nama];
    var nik = data[r][kolom.nik];
    if (!nama || !nik) continue; 
    hasil.push([
      nama.toString().trim(),
      data[r][kolom.jabatan] || "-",
      data[r][kolom.section] || "-",
      data[r][kolom.shift] || "-",
      nik.toString().trim()
    ]);
  }
  return hasil;
}

function getMasterPertanyaan() {
  var data = SpreadsheetApp.openById(LOG_SPREADSHEET_ID).getSheetByName("Master_Pertanyaan").getDataRange().getValues();
  var listPertanyaan = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) { 
      listPertanyaan.push({
        idForm: data[i][0].toString(), judulForm: data[i][1], kategori: data[i][2] || "General",
        tipeInput: data[i][3], item: data[i][4], info1: data[i][5], info2: data[i][6], info3: data[i][7], info4: data[i][8]
      });
    }
  }
  return listPertanyaan; 
}

// =========================================================================
// FUNGSI UTILITIES GLOBAL
// =========================================================================
function getISOWeekNumber(d) {
  var date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  var week1 = new Date(date.getFullYear(), 0, 4);
  var weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return { year: date.getFullYear(), week: ("0" + weekNum).slice(-2) };
}

function sisipkanGambarCerdasGlobal(body, tag, base64Data, maxW, maxH) {
  var searchResult = body.findText(tag);
  if (!searchResult) return;
  var textElement = searchResult.getElement().asText();
  if (!base64Data || typeof base64Data !== 'string' || base64Data.length < 5 || base64Data === "-") { 
    textElement.setText(textElement.getText().replace(tag, ""));
    return; 
  }
  try {
    var blob;
    if (base64Data.indexOf("http") === 0) {
      var fileIdMatch = base64Data.match(/id=([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        blob = DriveApp.getFileById(fileIdMatch[1]).getBlob();
      } else {
        blob = UrlFetchApp.fetch(base64Data).getBlob();
      }
    } else {
      var b64str = base64Data; var type = "image/png";
      if (b64str.indexOf(",") !== -1) { type = b64str.split(';')[0].replace('data:', ''); b64str = b64str.split(',')[1]; }
      blob = Utilities.newBlob(Utilities.base64Decode(b64str), type);
    }
    textElement.setText(textElement.getText().replace(tag, ""));
    var img = textElement.getParent().asParagraph().appendInlineImage(blob);
    var scaleFactor = Math.min(maxW / img.getWidth(), maxH / img.getHeight(), 1);
    img.setWidth(img.getWidth() * scaleFactor); img.setHeight(img.getHeight() * scaleFactor);
  } catch (e) { textElement.setText(textElement.getText().replace(tag, "")); }
}

function sisipkanBanyakGambarGlobal(body, tag, base64Data, maxW, maxH) {
  if (!base64Data || typeof base64Data !== 'string' || base64Data.length < 5 || base64Data === "-") { var el; while(el = body.findText(tag)) { el.getElement().asText().setText(el.getElement().asText().getText().replace(tag, "")); } return; }
  
  var parts = [];
  if (base64Data.indexOf("http") === 0) {
      parts = [base64Data];
  } else if (base64Data.indexOf("[") === 0) {
      try { parts = JSON.parse(base64Data); } catch(e) {}
  } else if (base64Data.indexOf(",") !== -1 && base64Data.indexOf("data:") === -1) {
      parts = base64Data.split(",");
  } else {
      parts = [base64Data];
  }

  var searchResult = body.findText(tag);
  if (!searchResult) return;
  var textElement = searchResult.getElement().asText();
  textElement.setText(textElement.getText().replace(tag, ""));
  var parent = textElement.getParent().asParagraph();
  
  for (var i=0; i<parts.length; i++) {
    var b = parts[i].trim();
    if (b.length > 5) {
      try {
        var blob;
        if (b.indexOf("http") === 0) {
          var fileIdMatch = b.match(/id=([a-zA-Z0-9_-]+)/);
          if (fileIdMatch && fileIdMatch[1]) {
            blob = DriveApp.getFileById(fileIdMatch[1]).getBlob();
          } else {
            blob = UrlFetchApp.fetch(b).getBlob();
          }
        } else {
          var b64str = b; var type = "image/png";
          if (b64str.indexOf(",") !== -1) { type = b64str.split(';')[0].replace('data:', ''); b64str = b64str.split(',')[1]; }
          blob = Utilities.newBlob(Utilities.base64Decode(b64str), type);
        }
        var img = parent.appendInlineImage(blob);
        var scaleFactor = Math.min(maxW / img.getWidth(), maxH / img.getHeight(), 1);
        img.setWidth(img.getWidth() * scaleFactor); img.setHeight(img.getHeight() * scaleFactor);
        parent.appendText(" "); 
      } catch(e) {}
    }
  }
  
  var el2; while(el2 = body.findText(tag)) { el2.getElement().asText().setText(el2.getElement().asText().getText().replace(tag, "")); }
}

// =========================================================================
// FUNGSI PENERIMA DATA APD (DENGAN DEV MODE)
// =========================================================================
function submitInspeksi(dataF, ttd1, ttd2, ttd3, fotoProses, devOptions) {
  var startTime = new Date().getTime();
  var devOpt = devOptions || { isDev: false, db: true, pdf: true, waTesting: false, verboseLog: false, simFailWa: false };
  var logs = { steps: [], timings: {}, status: "success" };

  function addLog(action, detail) {
      if(devOpt.verboseLog) logs.steps.push({ time: (new Date().getTime() - startTime) + "ms", action: action, info: detail });
  }

  try {
    try {
      addLog("INIT", "Memulai proses submit APD");
      var ss = SpreadsheetApp.openById(LOG_SPREADSHEET_ID);
      var sheet = ss.getSheetByName("Log_APD"); 
      var folder = DriveApp.getFolderById(FOLDER_ID);
      
      var header = dataF[0];
      var rawTgl = header[1];
      if (rawTgl instanceof Date) rawTgl = Utilities.formatDate(rawTgl, "Asia/Jayapura", "dd/MM/yyyy");
      var tglString = rawTgl ? rawTgl.toString() : "-";
      var bagianString = header[2] ? header[2].toString() : "-";
      var bagian = bagianString.replace(/\//g, "-");
      var isoWeek = getISOWeekNumber(new Date());
      var prefixWeek = "W" + isoWeek.week + "_" + isoWeek.year;
      var namaFileJadi = prefixWeek + "_APD_" + bagian;
      
      var urlFP = saveBase64ToDrive(fotoProses, namaFileJadi + " - Foto Proses.jpg", FOLDER_FOTO_PROSES) || "-";
      var urlTTD1 = saveBase64ToDrive(ttd1, namaFileJadi + " - TTD1.png", FOLDER_TTD) || "-";
      var urlTTD2 = saveBase64ToDrive(ttd2, namaFileJadi + " - TTD2.png", FOLDER_TTD) || "-";
      var urlTTD3 = saveBase64ToDrive(ttd3, namaFileJadi + " - TTD3.png", FOLDER_TTD) || "-";
      
      if (urlFP !== "-") addLog("UPLOAD", "Foto APD berhasil disimpan di Drive");
  
      for(var j = 0; j < dataF.length; j++) {
        dataF[j][16] = dataF[j][16] || "-";
        dataF[j][17] = dataF[j][17] || "-"; dataF[j][18] = dataF[j][18] || "-"; 
        dataF[j][19] = dataF[j][19] || "-"; dataF[j][20] = dataF[j][20] || "-";
        dataF[j][21] = dataF[j][21] || "-"; 
      }
  
      var linkPdf1 = "-"; var linkPdf2 = "-";
    } catch(e) { addLog("ERR_SETUP", e.message); }
    
    if (devOpt.pdf === false) {
        addLog("PDF_BYPASS", "Pembuatan PDF dilewati karena Dev Mode");
    } else {
        addLog("PDF_START", "Memulai pembuatan PDF APD TBP & GPS");
        try { linkPdf1 = buatPDFOtomatis(dataF, folder, urlTTD1 !== "-" ? urlTTD1 : ttd1, urlTTD2 !== "-" ? urlTTD2 : ttd2, urlTTD3 !== "-" ? urlTTD3 : ttd3, urlFP, TEMPLATE_APD[0], NAMA_PERUSAHAAN[0]); } catch(e){ addLog("PDF_ERR", e.message); }
        try { linkPdf2 = buatPDFOtomatis(dataF, folder, urlTTD1 !== "-" ? urlTTD1 : ttd1, urlTTD2 !== "-" ? urlTTD2 : ttd2, urlTTD3 !== "-" ? urlTTD3 : ttd3, urlFP, TEMPLATE_APD[1], NAMA_PERUSAHAAN[1]); } catch(e){ addLog("PDF_ERR", e.message); }
    }

    for(var i = 0; i < dataF.length; i++) {
      dataF[i][22] = ttd1;
      dataF[i][23] = ttd2; dataF[i][24] = ttd3; dataF[i][25] = urlFP; dataF[i][26] = linkPdf1; dataF[i][27] = linkPdf2;
    }

    if (devOpt.db === false) {
        addLog("DB_BYPASS", "Simpan Database dilewati karena Dev Mode");
    } else {
        addLog("DB_START", "Menyimpan ke Spreadsheet Log_APD");
        if(sheet) {
          sheet.getRange(sheet.getLastRow() + 1, 1, dataF.length, dataF[0].length).setValues(dataF);
        }
    }

    logs.timings.totalExecutionTime = (new Date().getTime() - startTime) + "ms";
    var resOutput = { status: "success", pdfUrl: linkPdf1, linkPdf2: linkPdf2, urlFP: urlFP, urlTTD1: urlTTD1, urlTTD2: urlTTD2, urlTTD3: urlTTD3, logDetails: logs };
    return devOpt.verboseLog ? resOutput : JSON.stringify(resOutput);
  } catch(err) { addLog("TRACE", "Error occurred at stack: " + err.stack);
      if (devOpt.verboseLog) {
          logs.status = "error";
          logs.errorMessage = err.message;
          return { isVerbose: true, status: "error", logDetails: logs };
      }
      return JSON.stringify({ status: "error", message: err.message });
  }
}

// =========================================================================
// FUNGSI PENERIMA DATA FORM DINAMIS (DENGAN DEV MODE)
// =========================================================================
function submitInspeksiUniversal(finalData, ttd1, ttd2, ttd3, fotoTemuanArray, fotoProses) {
  var startTime = new Date().getTime();
  var devOpt = finalData.devOptions || { isDev: false, db: true, pdf: true, waTesting: false, verboseLog: false, simFailWa: false };
  var logs = { steps: [], timings: {}, status: "success" };

  function addLog(action, detail) {
      if(devOpt.verboseLog) logs.steps.push({ time: (new Date().getTime() - startTime) + "ms", action: action, info: detail });
  }

  try { 
    addLog("INIT", "Memulai submitInspeksiUniversal. Tipe: " + finalData.tipe);
    var ss = SpreadsheetApp.openById(LOG_SPREADSHEET_ID);
    var folder = DriveApp.getFolderById(FOLDER_ID); 
    var timestampStr = new Date().getTime(); var now = new Date();
    var tgl = Utilities.formatDate(now, "Asia/Jayapura", "dd/MM/yyyy");
    var jam = Utilities.formatDate(now, "Asia/Jayapura", "HH:mm") + " WIT";
    
    var isoWeek = getISOWeekNumber(now);
    var prefixWeek = "W" + isoWeek.week + "_" + isoWeek.year;
    
    var judulMulaiInspeksi = finalData.judulForm;
    var matchInspeksi = judulMulaiInspeksi.match(/Inspeksi.*/i);
    if (matchInspeksi) judulMulaiInspeksi = matchInspeksi[0];
    
    if (finalData.tipe === "UMUM" && finalData.lokasiUmum && finalData.lokasiUmum !== "-") {
      judulMulaiInspeksi = finalData.lokasiUmum;
    }
    
    var namaFileJadi = prefixWeek + "_" + judulMulaiInspeksi;
    addLog("SETUP", "Nama File Disiapkan: " + namaFileJadi);
    
    addLog("UPLOAD_START", "Mengekstrak data foto");
    var fT1 = "-", fT2 = "-", fT3 = "-";
    if (fotoTemuanArray && Array.isArray(fotoTemuanArray)) { fT1 = fotoTemuanArray[0] || "-"; fT2 = fotoTemuanArray[1] || "-"; fT3 = fotoTemuanArray[2] || "-";
    } 
    else if (typeof fotoTemuanArray === "string") { fT1 = fotoTemuanArray;
    }
    var urlFP = saveBase64ToDrive(fotoProses, namaFileJadi + " - Foto Proses.jpg", FOLDER_FOTO_PROSES) || "-";
    var urlT1 = saveBase64ToDrive(fT1, namaFileJadi + " - Foto Temuan 1.jpg", FOLDER_FOTO_TEMUAN) || "-";
    var urlT2 = saveBase64ToDrive(fT2, namaFileJadi + " - Foto Temuan 2.jpg", FOLDER_FOTO_TEMUAN) || "-";
    var urlT3 = saveBase64ToDrive(fT3, namaFileJadi + " - Foto Temuan 3.jpg", FOLDER_FOTO_TEMUAN) || "-";
    var urlTTD1 = saveBase64ToDrive(ttd1, namaFileJadi + " - TTD1.png", FOLDER_TTD) || "-";
    var urlTTD2 = saveBase64ToDrive(ttd2, namaFileJadi + " - TTD2.png", FOLDER_TTD) || "-";
    var urlTTD3 = saveBase64ToDrive(ttd3, namaFileJadi + " - TTD3.png", FOLDER_TTD) || "-";
    // Simpan base64 asli untuk embedding gambar langsung ke dokumen
    var fFP = fotoProses || "-";
    addLog("UPLOAD_END", "Ekstraksi foto selesai");
    
    function parseInsp(val) { if(!val || typeof val !== 'string' || val.trim() === "") return { n: "", j: "" };
      var p = val.split(" | "); return { n: p[0] || "", j: p[1] || "" };
    }
    var insp1 = parseInsp(finalData.insp1); var insp2 = parseInsp(finalData.insp2); var insp3 = parseInsp(finalData.insp3);

    var judulBersihPDF = finalData.judulForm || "";
    var matchKerja = judulBersihPDF.split(/Kerja\s+/i);
    if (matchKerja.length > 1) judulBersihPDF = (matchKerja[1] || "").trim();
    else {
        var matchArea = judulBersihPDF.split(/Area\s+/i);
        if (matchArea.length > 1) judulBersihPDF = (matchArea[1] || "").trim();
        else {
            var matchTerencana = judulBersihPDF.split(/Terencana\s+/i);
            if (matchTerencana.length > 1) judulBersihPDF = (matchTerencana[1] || "").trim();
        }
    }
    
    var targetTemplates = [];
    if(finalData.tipe === "UMUM") targetTemplates = TEMPLATE_UMUM;
    else if(finalData.tipe === "TANGGA") targetTemplates = TEMPLATE_TANGGA;
    else if(finalData.tipe === "SARANA") targetTemplates = TEMPLATE_SARANA;
    else if(finalData.tipe === "P3K") targetTemplates = TEMPLATE_P3K;
    else if(finalData.tipe === "PERKAKAS") targetTemplates = TEMPLATE_PERKAKAS;
    else if(finalData.tipe === "TABUNG_MINGGUAN" || finalData.tipe === "TABUNG") targetTemplates = TEMPLATE_TABUNG;
    
    var linksPDF = [];

    // ===========================================================
    // 1. LOOPING CETAK PDF (DENGAN DEV BYPASS)
    // ===========================================================
    if (devOpt.pdf === false) {
        addLog("PDF_BYPASS", "Sistem melewati proses manipulasi Document API karena Dev Mode aktif.");
        linksPDF = [{pdf: "-", word: "-"}, {pdf: "-", word: "-"}];
    } else {
        addLog("PDF_START", "Memulai injeksi data ke " + targetTemplates.length + " Template Dokumen");
        for (var loopX = 0; loopX < targetTemplates.length; loopX++) {
          var currentTemplateID = targetTemplates[loopX];
          if(!currentTemplateID || currentTemplateID === "MASUKAN_ID_...") { linksPDF.push({pdf: "-", word: "-"}); continue; }
          
          var currentSuffix = NAMA_PERUSAHAAN[loopX] || "";
          var currentNamaFile = namaFileJadi + currentSuffix; 
          var currentLinkObj = { pdf: "-", word: "-" }; 
          var docFile = null;
          
          try {
            if(finalData.tipe === "UMUM") {
              docFile = DriveApp.getFileById(currentTemplateID).makeCopy(currentNamaFile, folder);
              Utilities.sleep(2000);
              var doc = null;
              var lastErr = "";
              for(var rt = 0; rt < 6; rt++) {
                  try { doc = DocumentApp.openById(docFile.getId()); break; }
                  catch(e) { lastErr = e.message; Utilities.sleep(3000); }
              }
              if (!doc) throw new Error("Gagal membuka dokumen " + currentNamaFile + " setelah dicopy. Error: " + lastErr);
              var body = doc.getBody();
              
              var judulUpper = finalData.judulForm ? finalData.judulForm.toString().toUpperCase() : "";
              var teksArea = "-"; 
              var teksNoDok = "-"; 
              
              var prefixDok = (loopX === 0) ? "TBP" : "GPS";
              
              if (judulUpper.indexOf("PREP") !== -1 || judulUpper.indexOf("BASAH") !== -1 || judulUpper.indexOf("KERING") !== -1) {
                  teksArea = "PREPARASI";
                  teksNoDok = prefixDok + "-FR-SFT-05.07-54"; 
              } else if (judulUpper.indexOf("LAB") !== -1 || judulUpper.indexOf("XRF") !== -1 || judulUpper.indexOf("FUSION") !== -1 || judulUpper.indexOf("PRESS") !== -1 || judulUpper.indexOf("QAIC") !== -1) {
                  teksArea = "LABORATORIUM";
                  teksNoDok = prefixDok + "-FR-SFT-05.07-55"; 
              } else if (judulUpper.indexOf("GUDANG") !== -1 || judulUpper.indexOf("TRANSIT") !== -1 || judulUpper.indexOf("KONTAINER") !== -1) {
                  teksArea = "GUDANG DAN FASILITAS PENUNJANG";
                  teksNoDok = prefixDok + "-FR-SFT-05.07-53"; 
              } else {
                  teksArea = judulBersihPDF.toUpperCase(); 
              }

              body.replaceText("<<Area>>", teksArea);
              body.replaceText("<<AREA>>", teksArea);
              body.replaceText("<<No Dokumen>>", teksNoDok);
              body.replaceText("<<NO DOKUMEN>>", teksNoDok);
              
              var docHeader = doc.getHeader();
              if (docHeader) {
                  docHeader.replaceText("<<Area>>", teksArea);
                  docHeader.replaceText("<<AREA>>", teksArea);
                  docHeader.replaceText("<<No Dokumen>>", teksNoDok);
                  docHeader.replaceText("<<NO DOKUMEN>>", teksNoDok);
              }

              body.replaceText("<<Judul Form>>", judulBersihPDF);
              body.replaceText("<<Tanggal>>", tgl); 
              body.replaceText("<<Jam>>", jam); body.replaceText("<<Lokasi>>", finalData.lokasiUmum || "-"); 

              var tables = body.getTables(); 
              var targetTable = null; var rowKategoriTemplate = null; var rowPertanyaanTemplate = null; 
              var indexTemplateKategori = -1; var indexTemplatePertanyaan = -1;
              
              var tableTemuan = null; var rowTemuanTemplate = null; var indexRowTemuan = -1;

              for (var t = 0; t < tables.length; t++) {
                var textTabel = tables[t].getText();
                
                if (textTabel.indexOf("<<Pertanyaan>>") !== -1 && textTabel.indexOf("<<NAMA KATEGORI>>") !== -1) {
                  targetTable = tables[t];
                  for(var r = 0; r < targetTable.getNumRows(); r++){
                    if(targetTable.getRow(r).getText().indexOf("<<NAMA KATEGORI>>") !== -1) { rowKategoriTemplate = targetTable.getRow(r); indexTemplateKategori = r; }
                    if(targetTable.getRow(r).getText().indexOf("<<Pertanyaan>>") !== -1) { rowPertanyaanTemplate = targetTable.getRow(r); indexTemplatePertanyaan = r; }
                  }
                }
                
                if (textTabel.indexOf("<<Temuan>>") !== -1 && textTabel.indexOf("<<Risiko>>") !== -1) {
                  tableTemuan = tables[t];
                  for(var r = 0; r < tableTemuan.getNumRows(); r++){
                    if(tableTemuan.getRow(r).getText().indexOf("<<Temuan>>") !== -1) { rowTemuanTemplate = tableTemuan.getRow(r); indexRowTemuan = r; break; }
                  }
                }
              }

              if (targetTable && rowKategoriTemplate && rowPertanyaanTemplate) {
                var currentKategori = "";
                var insertIndex = indexTemplatePertanyaan + 1; var nomorUrut = 1;
                
                var pArr = finalData.payload || [];
                if (pArr.length > 0) {
                  pArr.sort(function(a, b) { return (a.kategori || "").localeCompare(b.kategori || ""); });
                }

                for (var i = 0; i < pArr.length; i++) {
                  var item = pArr[i];
                  if (item.kategori !== currentKategori) {
                      var newKatRow = rowKategoriTemplate.copy();
                      newKatRow.replaceText("<<NAMA KATEGORI>>", (item.kategori || "").toUpperCase()); 
                      targetTable.insertTableRow(insertIndex, newKatRow); insertIndex++; currentKategori = item.kategori; nomorUrut = 1;
                  }
                  var newQRow = rowPertanyaanTemplate.copy();
                  newQRow.replaceText("<<No>>", nomorUrut.toString());
                  newQRow.replaceText("<<Pertanyaan>>", (item.pertanyaan || "").toString().replace(/^\d+\.\s*/, ""));
                  
                  if (item.jawaban === "N/A" || !item.jawaban) {
                      newQRow.replaceText("<<Y>>", ""); newQRow.replaceText("<<N>>", ""); newQRow.replaceText("<<NA>>", "N/A"); 
                  } else {
                      newQRow.replaceText("<<Y>>", item.jawaban === "YA" ? "✔" : "");
                      newQRow.replaceText("<<N>>", item.jawaban === "TIDAK" ? "✔" : "");
                      newQRow.replaceText("<<NA>>", "");
                  }
                  
                  newQRow.replaceText("<<Ket>>", (item.keterangan || "-").toString());
                  targetTable.insertTableRow(insertIndex, newQRow); insertIndex++; nomorUrut++;
                }
                var maxIdx = Math.max(indexTemplatePertanyaan, indexTemplateKategori);
                var minIdx = Math.min(indexTemplatePertanyaan, indexTemplateKategori);
                if (maxIdx > -1) targetTable.removeRow(maxIdx);
                if (minIdx > -1 && minIdx !== maxIdx) targetTable.removeRow(minIdx);
              }

              if (tableTemuan && rowTemuanTemplate) {
                var temuanArr = finalData.temuanUmum || [];
                if (temuanArr.length > 0) {
                  for(var x = 0; x < temuanArr.length; x++) {
                    var newTRow = rowTemuanTemplate.copy();
                    newTRow.replaceText("<<Nomor>>", (x + 1).toString());
                    newTRow.replaceText("<<Temuan>>", temuanArr[x].temuan || "-");
                    newTRow.replaceText("<<Risiko>>", temuanArr[x].risiko || "-");
                    newTRow.replaceText("<<Pengendalian>>", temuanArr[x].pengendalian || "-");
                    
                    var st = temuanArr[x].status || "Open"; 
                    var teksStatus = st.toUpperCase(); 
                    newTRow.replaceText("<<Status>>", teksStatus);
                    
                    var stSearch = newTRow.findText(teksStatus);
                    if(stSearch) {
                      var textEl = stSearch.getElement().asText();
                      var startOff = stSearch.getStartOffset();
                      var endOff = stSearch.getEndOffsetInclusive();
                      
                      textEl.setBold(startOff, endOff, true); 
                      if(st === "Open") {
                          textEl.setForegroundColor(startOff, endOff, "#FF0000"); 
                      } else {
                          textEl.setForegroundColor(startOff, endOff, "#009900"); 
                      }
                    }
                    
                    tableTemuan.insertTableRow(indexRowTemuan + 1 + x, newTRow);
                  }
                  if (indexRowTemuan > -1) tableTemuan.removeRow(indexRowTemuan); 
                } else {
                  rowTemuanTemplate.replaceText("<<Nomor>>", "-");
                  rowTemuanTemplate.replaceText("<<Temuan>>", "-");
                  rowTemuanTemplate.replaceText("<<Risiko>>", "-");
                  rowTemuanTemplate.replaceText("<<Pengendalian>>", "-");
                  rowTemuanTemplate.replaceText("<<Status>>", "-");
                }
              }
              
              body.replaceText("<<Nama Insp 1>>", (insp1.n || "").toString()); body.replaceText("<<Jabatan Insp 1>>", (insp1.j || "").toString());
              body.replaceText("<<Nama Insp 2>>", (insp2.n || "").toString()); body.replaceText("<<Jabatan Insp 2>>", (insp2.j || "").toString());
              body.replaceText("<<Nama Insp 3>>", (insp3.n || "").toString()); body.replaceText("<<Jabatan Insp 3>>", (insp3.j || "").toString());
              
              sisipkanGambarCerdasGlobal(body, "<<TTD 1>>", ttd1, 150, 100); sisipkanGambarCerdasGlobal(body, "<<TTD 2>>", ttd2, 150, 100);
              sisipkanGambarCerdasGlobal(body, "<<TTD 3>>", ttd3, 150, 100);
              // Embed foto temuan langsung sebagai gambar
              sisipkanGambarCerdasGlobal(body, "<<Foto T1>>", fT1, 350, 250);
              sisipkanGambarCerdasGlobal(body, "<<Foto T2>>", fT2, 350, 250);
              sisipkanGambarCerdasGlobal(body, "<<Foto T3>>", fT3, 350, 250);
              // Embed foto proses langsung sebagai gambar
              sisipkanBanyakGambarGlobal(body, "<<Foto Proses>>", fFP, 400, 300);
              sisipkanBanyakGambarGlobal(body, "<<Foto Proses Inspeksi>>", fFP, 400, 300);
              sisipkanBanyakGambarGlobal(body, "<<Proses Inspeksi>>", fFP, 400, 300);

              doc.saveAndClose();
            }

            else if(finalData.tipe === "TANGGA") {
              docFile = DriveApp.getFileById(currentTemplateID).makeCopy(currentNamaFile, folder);
              Utilities.sleep(2000);
              var doc = null;
              var lastErr = "";
              for(var rt = 0; rt < 6; rt++) {
                  try { doc = DocumentApp.openById(docFile.getId()); break; }
                  catch(e) { lastErr = e.message; Utilities.sleep(3000); }
              }
              if (!doc) throw new Error("Gagal membuka dokumen " + currentNamaFile + " setelah dicopy. Error: " + lastErr);
              var body = doc.getBody();
              body.replaceText("<<Tanggal>>", (tgl || "").toString()); body.replaceText("<<Jam>>", (jam || "").toString());
              var pData = (finalData.payload && finalData.payload[0]) ? finalData.payload[0] : { checks: [] }; 
              var total = 0;
              for(var z=0; z<11; z++){ total += Number(pData.checks[z]) || 0; }
              var persentase = total > 0 ? (total/44)*100 : 0;
              body.replaceText("<<Lokasi>>", (pData.lokasi || "-").toString()); body.replaceText("<<Total>>", total.toString()); body.replaceText("<<Persentase>>", persentase.toFixed(0) + " %");
              for(var q=1; q<=11; q++){ body.replaceText("<<Aktual " + q + ">>", pData.checks[q-1] !== undefined ? pData.checks[q-1].toString() : "0");
              }
              body.replaceText("<<Nama Insp 1>>", (insp1.n || "").toString()); body.replaceText("<<Jabatan Insp 1>>", (insp1.j || "").toString());
              body.replaceText("<<Nama Insp 2>>", (insp2.n || "").toString()); body.replaceText("<<Jabatan Insp 2>>", (insp2.j || "").toString()); body.replaceText("<<Nama Insp 3>>", (insp3.n || "").toString()); body.replaceText("<<Jabatan Insp 3>>", (insp3.j || "").toString());
              sisipkanGambarCerdasGlobal(body, "<<TTD Insp 1>>", ttd1, 150, 100); sisipkanGambarCerdasGlobal(body, "<<TTD Insp 2>>", ttd2, 150, 100);
              sisipkanGambarCerdasGlobal(body, "<<TTD Insp 3>>", ttd3, 150, 100); 
              // Embed foto proses langsung sebagai gambar
              sisipkanBanyakGambarGlobal(body, "<<Foto Proses Inspeksi>>", fFP, 400, 300);
              sisipkanBanyakGambarGlobal(body, "<<Foto Proses>>", fFP, 400, 300);
              
              doc.saveAndClose();
            }

            else if (finalData.tipe === "SARANA") {
              docFile = DriveApp.getFileById(currentTemplateID).makeCopy(currentNamaFile, folder);
              Utilities.sleep(2000);
              var doc = null;
              var lastErr = "";
              for(var rt = 0; rt < 6; rt++) {
                  try { doc = DocumentApp.openById(docFile.getId()); break; }
                  catch(e) { lastErr = e.message; Utilities.sleep(3000); }
              }
              if (!doc) throw new Error("Gagal membuka dokumen " + currentNamaFile + " setelah dicopy. Error: " + lastErr);
              var body = doc.getBody();
              body.replaceText("<<Tanggal>>", tgl); body.replaceText("<<Jam>>", jam);
              var tables = body.getTables(); var targetTable = null;
              var templateRow = null; var templateRowIndex = -1;
              for (var t = 0; t < tables.length; t++) {
                if (tables[t].getText().indexOf("<<UNIT>>") !== -1) { targetTable = tables[t];
                for(var r = 0; r < targetTable.getNumRows(); r++){ if(targetTable.getRow(r).getText().indexOf("<<UNIT>>") !== -1){ templateRow = targetTable.getRow(r); templateRowIndex = r; break;
                } } break; }
              }
              if (targetTable && templateRow) {
                var pArr = finalData.payload || [];
                for (var i = 0; i < pArr.length; i++) {
                  var uData = pArr[i];
                  var checks = uData.checks || {};
                  var newRow = templateRow.copy();
                  newRow.replaceText("<<No>>", (i + 1).toString()); newRow.replaceText("<<UNIT>>", (uData.unit || "").toString()); newRow.replaceText("<<Rotary>>", (checks.Rotary || "").toString()); newRow.replaceText("<<Depan>>", (checks.Depan || "").toString()); newRow.replaceText("<<Belakang>>", (checks.Belakang || "").toString()); newRow.replaceText("<<Rem>>", (checks.Rem || "").toString()); newRow.replaceText("<<Sign>>", (checks.Sign || "").toString());
                  newRow.replaceText("<<Seatbelt>>", (checks.Seatbelt || "").toString()); newRow.replaceText("<<Kaca>>", (checks.Kaca || "").toString()); newRow.replaceText("<<Wiper>>", (checks.Wiper || "").toString()); newRow.replaceText("<<Band>>", (checks.Band || "").toString()); newRow.replaceText("<<Banb>>", (checks.Banb || "").toString()); newRow.replaceText("<<Ket>>", (uData.ket || "-").toString());
                  targetTable.insertTableRow(templateRowIndex + 1 + i, newRow);
                } 
                if (templateRowIndex > -1) targetTable.removeRow(templateRowIndex); 
              }
              for(var u=0; u<3; u++) { var uName = (finalData.payload && finalData.payload[u]) ?
                finalData.payload[u].unit : "-"; body.replaceText("<<UNIT " + (u+1) + ">>", (uName || "").toString()); var fLabel = (finalData.payload && finalData.payload[u]) ?
                "Foto Inspeksi " + uName : ""; body.replaceText("Foto Inspeksi <<UNIT " + (u+1) + ">>", fLabel);
              }
              body.replaceText("<<Nama Insp 1>>", (insp1.n || "").toString()); body.replaceText("<<Jabatan Insp 1>>", (insp1.j || "").toString());
              body.replaceText("<<Nama Insp 2>>", (insp2.n || "").toString()); body.replaceText("<<Jabatan Insp 2>>", (insp2.j || "").toString()); body.replaceText("<<Nama Insp 3>>", (insp3.n || "").toString()); body.replaceText("<<Jabatan Insp 3>>", (insp3.j || "").toString());
              sisipkanGambarCerdasGlobal(body, "<<TTD 1>>", ttd1, 90, 60); sisipkanGambarCerdasGlobal(body, "<<TTD 2>>", ttd2, 90, 60); sisipkanGambarCerdasGlobal(body, "<<TTD 3>>", ttd3, 90, 60);
              for(var u=0; u<3; u++) { var fData = finalData.payload[u] ? finalData.payload[u].foto : "-";
              sisipkanGambarCerdasGlobal(body, "<<Foto Unit " + (u+1) + ">>", fData, 200, 200);
              }
              doc.saveAndClose();
            }

            else if(finalData.tipe === "P3K") {
              docFile = DriveApp.getFileById(currentTemplateID).makeCopy(currentNamaFile, folder);
              Utilities.sleep(2000);
              var doc = null;
              var lastErr = "";
              for(var rt = 0; rt < 6; rt++) {
                  try { doc = DocumentApp.openById(docFile.getId()); break; }
                  catch(e) { lastErr = e.message; Utilities.sleep(3000); }
              }
              if (!doc) throw new Error("Gagal membuka dokumen " + currentNamaFile + " setelah dicopy. Error: " + lastErr);
              var body = doc.getBody();
              var judulP3K = finalData.judulForm; var matchP3K = judulP3K.match(/P3K\s*(.*)/i);
              if (matchP3K && matchP3K[1]) judulP3K = matchP3K[1].trim();
              var noBox = "-"; var judulLower = finalData.judulForm.toLowerCase();
              if (judulLower.indexOf("preparasi kering") !== -1) noBox = "36"; else if (judulLower.indexOf("preparasi basah") !== -1) noBox = "46";
              else if (judulLower.indexOf("laboratorium") !== -1 || judulLower.indexOf("lab") !== -1) noBox = "47";
              body.replaceText("<<Judul Form>>", judulP3K); body.replaceText("<<No Box>>", noBox); body.replaceText("<<Tanggal>>", tgl);
              body.replaceText("<<Jam>>", jam); body.replaceText("<<jam>>", jam); 
              var tables = body.getTables(); var targetTable = null; var templateRow = null; var templateRowIndex = -1;
              for (var t = 0; t < tables.length; t++) {
                if (tables[t].getText().indexOf("<<Item>>") !== -1) { targetTable = tables[t];
                for(var r = 0; r < targetTable.getNumRows(); r++){ if(targetTable.getRow(r).getText().indexOf("<<Item>>") !== -1){ templateRow = targetTable.getRow(r); templateRowIndex = r; break;
                } } break; }
              }
              if (targetTable && templateRow) {
                var pArr = finalData.payload || [];
                for (var i = 0; i < pArr.length; i++) {
                  var item = pArr[i];
                  var newRow = templateRow.copy();
                  newRow.replaceText("<<No>>", (i + 1).toString()); newRow.replaceText("<<Item>>", (item.item || "").toString().replace(/^\d+\.\s*/, "")); newRow.replaceText("<<Standar>>", (item.standar || "-").toString()); newRow.replaceText("<<Ketersediaan>>", (item.ketersediaan || "-").toString());
                  newRow.replaceText("<<Aktual>>", (item.jumlah || "-").toString()); newRow.replaceText("<<Jumlah>>", (item.jumlah || "-").toString()); newRow.replaceText("<<Satuan>>", (item.satuan || "-").toString());
                  var expText = "-";
                  if(item.expDate) { var expSplit = item.expDate.split("-"); expText = (expSplit[1] || "") + "/" + (expSplit[0] || "");
                  }
                  newRow.replaceText("<<Exp Date>>", expText);
                  newRow.replaceText("<<Ket>>", (item.keterangan || "-").toString()); targetTable.insertTableRow(templateRowIndex + 1 + i, newRow);
                } 
                if (templateRowIndex > -1) targetTable.removeRow(templateRowIndex);
              }
              body.replaceText("<<Nama Insp 1>>", (insp1.n || "").toString()); body.replaceText("<<Jabatan Insp 1>>", (insp1.j || "").toString());
              body.replaceText("<<Nama Insp 2>>", (insp2.n || "").toString()); body.replaceText("<<Jabatan Insp 2>>", (insp2.j || "").toString()); body.replaceText("<<Nama Insp 3>>", (insp3.n || "").toString()); body.replaceText("<<Jabatan Insp 3>>", (insp3.j || "").toString());
              sisipkanGambarCerdasGlobal(body, "<<TTD 1>>", ttd1, 150, 100); sisipkanGambarCerdasGlobal(body, "<<TTD 2>>", ttd2, 150, 100); sisipkanGambarCerdasGlobal(body, "<<TTD 3>>", ttd3, 150, 100);
              // Embed foto proses langsung sebagai gambar
              sisipkanBanyakGambarGlobal(body, "<<Proses Inspeksi>>", fFP, 400, 300);
              sisipkanBanyakGambarGlobal(body, "<<Foto Proses Inspeksi>>", fFP, 400, 300);
              
              doc.saveAndClose(); 
            }

            else if(finalData.tipe === "PERKAKAS") {
              docFile = DriveApp.getFileById(currentTemplateID).makeCopy(currentNamaFile, folder);
              Utilities.sleep(2000);
              var doc = null;
              var lastErr = "";
              for(var rt = 0; rt < 6; rt++) {
                  try { doc = DocumentApp.openById(docFile.getId()); break; }
                  catch(e) { lastErr = e.message; Utilities.sleep(3000); }
              }
              if (!doc) throw new Error("Gagal membuka dokumen " + currentNamaFile + " setelah dicopy. Error: " + lastErr);
              var body = doc.getBody();
              body.replaceText("<<Judul Form>>", judulBersihPDF); body.replaceText("<<Tanggal>>", tgl); body.replaceText("<<Jam>>", jam);
              var tables = body.getTables();
              var targetTable = null; var templateRow = null; var templateRowIndex = -1;
              for (var t = 0; t < tables.length; t++) {
                if (tables[t].getText().indexOf("<<Item>>") !== -1) { targetTable = tables[t];
                for(var r = 0; r < targetTable.getNumRows(); r++){ if(targetTable.getRow(r).getText().indexOf("<<Item>>") !== -1){ templateRow = targetTable.getRow(r); templateRowIndex = r; break;
                } } break; }
              }
              var totalAktual = 0;
              var totalMax = 0;
              if (targetTable && templateRow) {
                var pArr = finalData.payload || [];
                for (var i = 0; i < pArr.length; i++) {
                  var item = pArr[i];
                  var newRow = templateRow.copy();
                  var nilaiAktual = parseInt(item.aktual) || 0; var nilaiMax = parseInt(item.max) || 4; totalAktual += nilaiAktual;
                  totalMax += nilaiMax;
                  newRow.replaceText("<<No>>", (i + 1).toString()); newRow.replaceText("<<Item>>", (item.item || "").toString()); newRow.replaceText("<<Merk>>", (item.merk || "").toString()); newRow.replaceText("<<Asset>>", (item.asset || "").toString()); newRow.replaceText("<<Lokasi>>", (item.lokasi || "").toString()); newRow.replaceText("<<Aktual>>", (item.aktual || "0").toString()); newRow.replaceText("<<Max>>", (item.max || "4").toString());
                  newRow.replaceText("<<Ket>>", (item.keterangan || "-").toString()); targetTable.insertTableRow(templateRowIndex + 1 + i, newRow);
                } 
                if (templateRowIndex > -1) targetTable.removeRow(templateRowIndex);
              }
              var persentaseAngka = 0;
              if (totalMax > 0) persentaseAngka = (totalAktual / totalMax) * 100; var persentaseTeks = persentaseAngka.toFixed(1).replace(".0", "") + " %";
              body.replaceText("<<Total>>", totalAktual.toString()); body.replaceText("<<Persentase>>", persentaseTeks);
              body.replaceText("<<Nama Insp 1>>", (insp1.n || "").toString()); body.replaceText("<<Jabatan Insp 1>>", (insp1.j || "").toString()); body.replaceText("<<Nama Insp 2>>", (insp2.n || "").toString()); body.replaceText("<<Jabatan Insp 2>>", (insp2.j || "").toString());
              body.replaceText("<<Nama Insp 3>>", (insp3.n || "").toString()); body.replaceText("<<Jabatan Insp 3>>", (insp3.j || "").toString());
              sisipkanGambarCerdasGlobal(body, "<<TTD 1>>", ttd1, 150, 100); sisipkanGambarCerdasGlobal(body, "<<TTD 2>>", ttd2, 150, 100);
              sisipkanGambarCerdasGlobal(body, "<<TTD 3>>", ttd3, 150, 100); 
              // Embed foto proses langsung sebagai gambar
              sisipkanBanyakGambarGlobal(body, "<<Foto Proses Inspeksi>>", fFP, 400, 300);
              sisipkanBanyakGambarGlobal(body, "<<Foto Proses>>", fFP, 400, 300);
              doc.saveAndClose();
            }

            else if(finalData.tipe === "TABUNG_MINGGUAN" || finalData.tipe === "TABUNG") {
              docFile = DriveApp.getFileById(currentTemplateID).makeCopy(currentNamaFile, folder);
              Utilities.sleep(2000);
              var doc = null;
              for(var rt = 0; rt < 4; rt++) {
                  try { doc = DocumentApp.openById(docFile.getId()); break; }
                  catch(e) { Utilities.sleep(2000); }
              }
              if (!doc) throw new Error("Gagal membuka dokumen " + currentNamaFile + " setelah dicopy.");
              var body = doc.getBody();
              var today = new Date(); var dayOfWeek = today.getDay();
              var diffToFriday = (dayOfWeek >= 5) ? dayOfWeek - 5 : dayOfWeek + 2;
              var startFriday = new Date(today.getTime() - (diffToFriday * 24 * 60 * 60 * 1000)); var dates = [];
              for(var d=0; d<7; d++) { var tDate = new Date(startFriday.getTime() + (d * 24 * 60 * 60 * 1000));
              dates.push(Utilities.formatDate(tDate, "Asia/Jayapura", "dd/MM/yyyy")); }
              body.replaceText("<<Jumat>>", dates[0]); body.replaceText("<<Sabtu>>", dates[1]); body.replaceText("<<Minggu>>", dates[2]);
              body.replaceText("<<Senin>>", dates[3]); body.replaceText("<<Selasa>>", dates[4]); body.replaceText("<<Rabu>>", dates[5]); body.replaceText("<<Kamis>>", dates[6]);
              var meta = finalData.tabungMeta || { atasan: "", reg: "", nik: "" };
              var namaAtasanBersih = (meta.atasan || "").split(" | ")[0] || "-";
              body.replaceText("<<No. Registrasi>>", (meta.reg || "-").toString()); body.replaceText("<<NIK>>", (meta.nik || "-").toString());
              body.replaceText("<<Nama Atasan>>", namaAtasanBersih); body.replaceText("<<Nama Insp 1>>", (insp1.n || "").toString()); body.replaceText("<<Jabatan Insp 1>>", (insp1.j || "").toString()); body.replaceText("<<Catatan>>", (finalData.catatanUmum || "-").toString());
              var tables = body.getTables();
              var targetTable = null; var templateRow = null; var templateRowIndex = -1;
              for (var t = 0; t < tables.length; t++) {
                if (tables[t].getText().indexOf("<<J1>>") !== -1) { targetTable = tables[t];
                for(var r = 0; r < targetTable.getNumRows(); r++){ if(targetTable.getRow(r).getText().indexOf("<<J1>>") !== -1){ templateRow = targetTable.getRow(r); templateRowIndex = r; break;
                } } break; }
              }
              if (targetTable && templateRow) {
                var pArr = finalData.payload || [];
                for (var i = 0; i < pArr.length; i++) {
                  var itemData = pArr[i];
                  var newRow = templateRow.copy();
                  newRow.replaceText("<<Pertanyaan>>", (itemData.item || "").toString()); newRow.replaceText("<<Ket>>", (itemData.keterangan || "-").toString());
                  var ans = ["✔","✔","✔","✔","✔","✔","✔"];
                  if(itemData.jawaban === "TIDAK"){
                     var hariMap = {"Jumat":0, "Sabtu":1, "Minggu":2, "Senin":3, "Selasa":4, "Rabu":5, "Kamis":6};
                     var hariArray = (itemData.hari || "").split(", ");
                     for (var h = 0; h < hariArray.length; h++) { var idxHari = hariMap[hariArray[h]];
                     if(idxHari !== undefined) ans[idxHari] = "❌"; }
                  }
                  newRow.replaceText("<<J1>>", ans[0]);
                  newRow.replaceText("<<J2>>", ans[1]); newRow.replaceText("<<J3>>", ans[2]); newRow.replaceText("<<J4>>", ans[3]); newRow.replaceText("<<J5>>", ans[4]); newRow.replaceText("<<J6>>", ans[5]); newRow.replaceText("<<J7>>", ans[6]);
                  targetTable.insertTableRow(templateRowIndex + 1 + i, newRow);
                } 
                if (templateRowIndex > -1) targetTable.removeRow(templateRowIndex);
              }
              sisipkanBanyakGambarGlobal(body, "<<TTD 1>>", ttd1, 90, 60);
              
              sisipkanGambarCerdasGlobal(body, "<<INSPEKSI>>", fotoProses, 350, 350);
              body.replaceText("<<Foto Proses Inspeksi>>", urlFP !== "-" ? "Lihat Lampiran: " + urlFP : "-");
              
              doc.saveAndClose(); 
            }

            if (docFile) {
                var pdfBlob = null;
                var maxRetries = 3;
                for (var r = 0; r < maxRetries; r++) {
                    Utilities.sleep(4000);
                    try {
                        pdfBlob = docFile.getAs("application/pdf");
                        break; 
                    } catch(e) {
                        addLog("PDF_RETRY", "Percobaan " + (r+1) + " gagal: " + e.message);
                        if (r === maxRetries - 1) {
                            try {
                                addLog("PDF_FETCH", "Mencoba UrlFetchApp fallback...");
                                var url = "https://docs.google.com/document/d/" + docFile.getId() + "/export?format=pdf";
                                var token = ScriptApp.getOAuthToken();
                                var response = UrlFetchApp.fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
                                pdfBlob = response.getBlob();
                            } catch(err2) {
                                throw new Error("Gagal konversi ke PDF: " + err2.message);
                            }
                        }
                    }
                }
                
                var pdfFile = folder.createFile(pdfBlob).setName(currentNamaFile + ".pdf");

                var linkPdfOutput = "https://drive.google.com/uc?export=view&id=" + pdfFile.getId();
                
                try { docFile.setTrashed(true); } catch(e) {}
                currentLinkObj = { pdf: linkPdfOutput, word: "-" };
            }

          } catch(err) { addLog("TRACE", "Error occurred at stack: " + err.stack);
            addLog("PDF_ERR", "Error di loop " + currentSuffix + ": " + err.message);
            try { folder.createFile("ERROR_LOG_" + currentSuffix + ".txt", "Error: " + err.message + "\nStack: " + err.stack); } catch(e) {}
            if(docFile) { try { docFile.setTrashed(true); } catch(e) {} }
          }
          linksPDF.push(currentLinkObj);
        }
        addLog("PDF_END", "Injeksi PDF Selesai");
    }

    var linkPdf1 = (linksPDF[0] && linksPDF[0].pdf) ? linksPDF[0].pdf : "-";
    var linkPdf2 = (linksPDF[1] && linksPDF[1].pdf) ? linksPDF[1].pdf : "-";
    var linkWord1 = "-"; var linkWord2 = "-";

    // ===========================================================
    // 3. PENDISTRIBUSIAN (PDF KE SHEET & WA DENGAN DEV BYPASS)
    // ===========================================================
    if (devOpt.db === false) {
        addLog("DB_BYPASS", "Proses simpan ke Spreadsheet dilewati (Dev Mode)");
    } else {
        addLog("DB_START", "Mulai distribusi data ke Sheet: Log_" + finalData.tipe);
        if(finalData.tipe === "UMUM") {
          var sheetUmum = ss.getSheetByName("Log_Umum");
          var sheetMaster = ss.getSheetByName("Master_Pertanyaan");
          if(sheetUmum && sheetMaster) {
              var headersUmum = sheetUmum.getRange(1, 1, 1, sheetUmum.getLastColumn()).getValues()[0];
              var mapHeaderToIndex = {};
              for(var h = 0; h < headersUmum.length; h++) {
                  if(headersUmum[h]) mapHeaderToIndex[headersUmum[h].toString().trim()] = h;
              }

              var dataMaster = sheetMaster.getDataRange().getValues();
              var mapPertanyaanKeKolom = {};
              for(var m = 1; m < dataMaster.length; m++) {
                  var soalMaster = dataMaster[m][4] ?
                  dataMaster[m][4].toString().replace(/^\d+\.\s*/, "").trim().toLowerCase() : "";
                  var kodeKolom = dataMaster[m][9] ? dataMaster[m][9].toString().trim() : ""; 
                  if(soalMaster && kodeKolom) mapPertanyaanKeKolom[soalMaster] = kodeKolom;
              }

              var rowData = new Array(headersUmum.length).fill("N/A");
              function setVal(colName, val) {
                  if(mapHeaderToIndex[colName] !== undefined) rowData[mapHeaderToIndex[colName]] = val;
              }

              setVal("Timestamp", now);
              setVal("ID_Inspeksi", namaFileJadi);
              setVal("Tipe_Form", finalData.judulForm);
              setVal("Nama_Inspektur", insp1.n);
              setVal("Lokasi_Spesifik", finalData.lokasiUmum || "-");
              for(var i = 0; i < finalData.payload.length; i++) {
                var item = finalData.payload[i];
                var teksJawaban = item.jawaban; 
                if(item.keterangan && item.keterangan !== "-" && item.keterangan !== "") teksJawaban += " (" + item.keterangan + ")";
                var soalWeb = item.pertanyaan ? item.pertanyaan.replace(/^\d+\.\s*/, "").trim().toLowerCase() : "";
                var targetKolom = mapPertanyaanKeKolom[soalWeb];
                if(targetKolom) {
                    setVal(targetKolom, teksJawaban);
                }
              }

              var catUmum = finalData.catatanUmum || "-";
              setVal("Catatan_Temuan", catUmum);
              setVal("URL_Foto_Bukti", urlFP);
              
              setVal("URL_PDF_TBP", linkPdf1);
              setVal("URL_PDF_GPS", linkPdf2); 
              setVal("URL_WORD_TBP", linkWord1);
              setVal("URL_WORD_GPS", linkWord2);
              
              sheetUmum.getRange(sheetUmum.getLastRow() + 1, 1, 1, rowData.length).setValues([rowData]);
          }
        }
    }
    
    // WA is handled by backend, but we need to return the PDF URLs
    var resOutput = { status: "success", pdfUrl: linkPdf1, linkPdf2: linkPdf2, urlFP: urlFP, urlT1: urlT1, urlT2: urlT2, urlT3: urlT3, urlTTD1: urlTTD1, urlTTD2: urlTTD2, urlTTD3: urlTTD3, logDetails: logs };
    return devOpt.verboseLog ? resOutput : JSON.stringify(resOutput);

  } catch(errorUtama) {
    if (devOpt.verboseLog) {
        logs.status = "error";
        logs.errorMessage = errorUtama.message;
        return { isVerbose: true, status: "error", logDetails: logs };
    }
    return JSON.stringify({ status: "error", message: errorUtama.message });
  }
}

// =========================================================================
// FUNGSI PENDUKUNG (PDF APD)
// =========================================================================
function buatPDFOtomatis(data, folder, ttd1, ttd2, ttd3, urlFP, templateId, suffixNama) {
  var header = data[0];
  var rawJam = header[0]; var rawTgl = header[1];
  
  if (rawJam instanceof Date) rawJam = Utilities.formatDate(rawJam, "Asia/Jayapura", "HH:mm");
  if (rawTgl instanceof Date) rawTgl = Utilities.formatDate(rawTgl, "Asia/Jayapura", "dd/MM/yyyy");
  
  var jamString = rawJam ? rawJam.toString() : "-";
  var tglString = rawTgl ? rawTgl.toString() : "-";
  var bagianString = header[2] ? header[2].toString() : "-";
  var bagian = bagianString.replace(/\//g, "-");
  
  var isoWeek = getISOWeekNumber(new Date());
  var prefixWeek = "W" + isoWeek.week + "_" + isoWeek.year;
  var namaFileBaru = prefixWeek + "_APD_" + bagian + suffixNama;

  var docFile = DriveApp.getFileById(templateId).makeCopy(namaFileBaru, folder);
  
  var doc = null;
  var maxRetriesOpen = 4;
  for (var ro = 0; ro < maxRetriesOpen; ro++) {
      try {
          doc = DocumentApp.openById(docFile.getId());
          break;
      } catch (e) {
          if (ro === maxRetriesOpen - 1) throw new Error("Gagal membuka dokumen APD: " + e.message);
          Utilities.sleep(3000);
      }
  }
  
  var body = doc.getBody();

  body.replaceText("<<Jam>>", jamString); body.replaceText("<<Tanggal>>", tglString);
  body.replaceText("<<Bagian>>", bagianString); body.replaceText("<<Waktu Shift>>", header[3] || "-");
  body.replaceText("<<Nama Insp 1>>", header[16] || "-"); body.replaceText("<<Jabatan Insp 1>>", header[17] || "-");
  body.replaceText("<<Nama Insp 2>>", header[18] || "-");
  body.replaceText("<<Jabatan Insp 2>>", header[19] || "-");
  body.replaceText("<<Nama Insp 3>>", header[20] || "-"); body.replaceText("<<Jabatan Insp 3>>", header[21] || "-");
  var tables = body.getTables();
  if(tables.length > 0) {
    var mainTable = tables[0]; var barisTag = mainTable.getRow(1).copy(); mainTable.removeRow(1);
    for(var i = 0; i < data.length; i++) {
      var rowData = data[i];
      var newRow = barisTag.copy();
      newRow.replaceText("<<No>>", rowData[5]); newRow.replaceText("<<Nama>>", rowData[6]); newRow.replaceText("<<Jabatan>>", rowData[7]);
      newRow.replaceText("<<Kehadiran>>", rowData[8]); newRow.replaceText("<<Seragam>>", rowData[9]); newRow.replaceText("<<Helm>>", rowData[10]);
      newRow.replaceText("<<Sepatu>>", rowData[11]); newRow.replaceText("<<Masker>>", rowData[12]);
      newRow.replaceText("<<Ear Plug>>", rowData[13]);
      newRow.replaceText("<<Kacamata>>", rowData[14]); newRow.replaceText("<<Keterangan>>", rowData[15]); mainTable.appendTableRow(newRow); 
    }
  }

  sisipkanGambarCerdasGlobal(body, "<<TTD 1>>", ttd1, 150, 100);
  sisipkanGambarCerdasGlobal(body, "<<TTD 2>>", ttd2, 150, 100);
  sisipkanGambarCerdasGlobal(body, "<<TTD 3>>", ttd3, 150, 100); 
  
  sisipkanBanyakGambarGlobal(body, "<<Foto Proses Inspeksi>>", urlFP, 400, 300);
  sisipkanBanyakGambarGlobal(body, "<<Foto Proses>>", urlFP, 400, 300);

  doc.saveAndClose();

  var pdfBlob = null;
  var maxRetries = 3;
  for (var r = 0; r < maxRetries; r++) {
      Utilities.sleep(4000);
      try {
          pdfBlob = doc.getAs("application/pdf");
          break; 
      } catch(e) {
          if (r === maxRetries - 1) {
              try {
                  var url = "https://docs.google.com/document/d/" + docFile.getId() + "/export?format=pdf";
                  var token = ScriptApp.getOAuthToken();
                  var response = UrlFetchApp.fetch(url, { headers: { 'Authorization': 'Bearer ' + token } });
                  pdfBlob = response.getBlob();
              } catch(err2) {
                  throw new Error("Gagal konversi ke PDF: " + err2.message);
              }
          }
      }
  }

  var pdfFile = folder.createFile(pdfBlob).setName(namaFileBaru + ".pdf");

  try { docFile.setTrashed(true); } catch(e) {}
  return "https://drive.google.com/uc?export=view&id=" + pdfFile.getId();
}

function saveBase64ToDrive(base64Str, namaFile, folderId) {
  if (!base64Str || typeof base64Str !== 'string' || base64Str.length < 5 || base64Str === "-") return null;
  if (base64Str.indexOf("http") === 0) return base64Str;
  try {
    var parts = base64Str.split(',');
    if (parts.length > 1) {
      var mime = parts[0].match(/:(.*?);/)[1];
      var data = parts[1];
      var blob = Utilities.newBlob(Utilities.base64Decode(data), mime, namaFile);
      var folder = DriveApp.getFolderById(folderId);
      var file = folder.createFile(blob);

      return "https://drive.google.com/uc?export=view&id=" + file.getId();
    }
  } catch (e) {
    return null;
  }
  return null;
}

function extractBlobFromBase64(base64Str) {
  if (!base64Str || typeof base64Str !== 'string') return null;
  var parts = base64Str.split(',');
  if (parts.length > 1) {
    var mime = parts[0].match(/:(.*?);/)[1];
    var data = parts[1];
    return Utilities.newBlob(Utilities.base64Decode(data), mime);
  } else {
    return Utilities.newBlob(Utilities.base64Decode(base64Str), "image/png");
  }
}
