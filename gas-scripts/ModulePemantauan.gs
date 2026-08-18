/**
 * MODUL PEMANTAUAN RUTIN HARIAN
 * Salin file ini ke Google Apps Script Anda jika Anda menggunakan fitur pemantauan (Log Pemantauan & Cetak PDF Pemantauan)
 */

function handleSubmitPemantauanBatch(payload) {
  try {
    var ss = payload.sheetId ? SpreadsheetApp.openById(payload.sheetId) : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Log_Pemantauan");
    if (!sheet) throw new Error("Sheet bernama 'Log_Pemantauan' belum dibuat di spreadsheet Pemantauan!");

    var FOLDER_ID = "1hRG-NQ5GWCkzHCSjwJw7kIaDcS7l3_ij"; // Sesuaikan dengan folder ID untuk lampiran foto
    var folder = DriveApp.getFolderById(FOLDER_ID); 
    var fotoUrl = "-";
    var ttdUrl = "-";

    if (payload.foto && payload.foto.length > 100) {
      var splitBase = payload.foto.split(',');
      var type = splitBase[0].split(';')[0].replace('data:', '');
      var blob = Utilities.newBlob(Utilities.base64Decode(splitBase[1]), type, "FOTO_" + new Date().getTime() + ".png");
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      fotoUrl = "https://drive.google.com/uc?export=view&id=" + file.getId();
    }

    if (payload.ttd && payload.ttd.length > 100) {
      var splitTtd = payload.ttd.split(',');
      var blobTtd = Utilities.newBlob(Utilities.base64Decode(splitTtd[1]), "image/png", "TTD_" + new Date().getTime() + ".png");
      var fileTtd = folder.createFile(blobTtd);
      fileTtd.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      ttdUrl = "https://drive.google.com/uc?export=view&id=" + fileTtd.getId();
    }

    var now = new Date();
    var tgl = Utilities.formatDate(now, "Asia/Jayapura", "yyyy-MM-dd");
    var jam = Utilities.formatDate(now, "Asia/Jayapura", "HH:mm");
    var timestampId = now.getTime().toString().slice(-5);

    var rowsToInsert = [];
    
    for (var i = 0; i < payload.items.length; i++) {
      var item = payload.items[i];
      var idPemantauan = "PMT-" + timestampId + "-" + (i+1);
      
      var simpanKelembapan = item.kelembapan ? (parseFloat(item.kelembapan) / 100) : "-";
      
      rowsToInsert.push([
        now,                        
        idPemantauan,               
        item.kategori,              
        tgl,                        
        jam,                        
        payload.shift,              
        item.lokasi,                
        item.suhu || "-",           
        simpanKelembapan,           
        item.flow || "-",           
        item.tekananGas || "-",     
        item.kebocoran || "-",      
        payload.catatan || "-",     
        payload.inspektor || "-",   
        fotoUrl,                    
        "",                         
        "",                         
        "",                         
        "",                         
        ttdUrl,                     
        payload.ttd || ""           
      ]);
    }

    if (rowsToInsert.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToInsert.length, rowsToInsert[0].length).setValues(rowsToInsert);
      sheet.getRange(sheet.getLastRow() - rowsToInsert.length + 1, 9, rowsToInsert.length, 1).setNumberFormat("0%");
    }

    return "Berhasil menyimpan " + rowsToInsert.length + " data pemantauan!";
  } catch (e) {
    throw new Error(e.message);
  }
}

function handleGetRekapanPemantauan(payload) {
  var tglMulai = payload.tglMulai;
  var tglAkhir = payload.tglAkhir;
  var ss = payload.sheetId ? SpreadsheetApp.openById(payload.sheetId) : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Log_Pemantauan"); 
  if (!sheet) return [];
  
  var data = sheet.getDataRange().getValues();
  var hasil = [];
  
  for (var i = 1; i < data.length; i++) {
    var tglRowStr = data[i][3]; 
    if (!tglRowStr) continue; 
    
    var strTglDB = "";
    
    if (Object.prototype.toString.call(tglRowStr) === "[object Date]") {
      strTglDB = Utilities.formatDate(tglRowStr, "Asia/Jayapura", "yyyy-MM-dd");
    } else {
      strTglDB = tglRowStr.toString().substring(0, 10);
    }
    
    if (strTglDB >= tglMulai && strTglDB <= tglAkhir) {
      hasil.push({
        tanggal: strTglDB, 
        kategori: data[i][2],
        lokasi: data[i][6],
        suhu: data[i][7] === "-" ? 0 : parseFloat(data[i][7]) || 0,
        kelembapan: data[i][8] === "-" ? 0 : (parseFloat(data[i][8]) * 100) || 0,
        flow: data[i][9] === "-" ? 0 : parseFloat(data[i][9]) || 0,
        tekananGas: data[i][10] === "-" ? 0 : parseFloat(data[i][10]) || 0,
        suhu_up: (data[i][15] === "-" || data[i][15] === "" || data[i][15] == null) ? null : parseFloat(data[i][15]),
        suhu_low: (data[i][16] === "-" || data[i][16] === "" || data[i][16] == null) ? null : parseFloat(data[i][16]),
        kel_up: (data[i][17] === "-" || data[i][17] === "" || data[i][17] == null) ? null : (parseFloat(data[i][17]) * 100),
        kel_low: (data[i][18] === "-" || data[i][18] === "" || data[i][18] == null) ? null : (parseFloat(data[i][18]) * 100)
      });
    }
  }
  
  return hasil;
}

function handleBuatPdfRekapan(payload) {
  var tglMulai = payload.tglMulai;
  var tglAkhir = payload.tglAkhir;
  var tipeLaporan = payload.tipeLaporan;

  var TEMPLATE_SUHU_ID = "1NEmvv2ZzVICoU_3TZWsdfIQNqc2pq6gLZnJHNFLbezk"; 
  var TEMPLATE_GAS_ID = "1EzTAqn_8Xm0zL3Eo9kqMrbWT-GAGDVuwAVXP8kiUY44"; 
  var FOLDER_ID = "1hRG-NQ5GWCkzHCSjwJw7kIaDcS7l3_ij"; 

  try {
    var ss = payload.sheetId ? SpreadsheetApp.openById(payload.sheetId) : SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Log_Pemantauan");
    if (!sheet) throw new Error("Sheet Log_Pemantauan not found");
    var data = sheet.getDataRange().getValues();
    var folder = DriveApp.getFolderById(FOLDER_ID);
    
    var filteredData = [];
    
    for (var i = 1; i < data.length; i++) {
      var tglRowStr = data[i][3]; 
      if (!tglRowStr) continue; 
      
      var strTglDB = "";
      if (Object.prototype.toString.call(tglRowStr) === "[object Date]") {
        strTglDB = Utilities.formatDate(tglRowStr, "Asia/Jayapura", "yyyy-MM-dd");
      } else {
        strTglDB = tglRowStr.toString().substring(0, 10);
      }

      var rawJam = data[i][4];
      var strJam = "-";
      if (rawJam) {
        if (Object.prototype.toString.call(rawJam) === "[object Date]") {
          strJam = Utilities.formatDate(rawJam, "Asia/Jayapura", "HH:mm");
        } else {
          strJam = rawJam.toString().substring(0, 5);
        }
      }

      if (strTglDB >= tglMulai && strTglDB <= tglAkhir && data[i][2] === tipeLaporan) {
        filteredData.push({
          tanggal: strTglDB, 
          jam: strJam, 
          shift: data[i][5] ? data[i][5].toString() : "-",
          inspektor: data[i][13] ? data[i][13].toString() : "-",
          lokasi: data[i][6] ? data[i][6].toString() : "-",
          suhu: (data[i][7] !== "-" && data[i][7] !== "") ? data[i][7].toString() : "-",
          kel: (data[i][8] !== "-" && data[i][8] !== "") ? (parseFloat(data[i][8]) * 100).toFixed(0).toString() : "-",
          flow: (data[i][9] !== "-" && data[i][9] !== "") ? data[i][9].toString() : "-",
          pressure: (data[i][10] !== "-" && data[i][10] !== "") ? data[i][10].toString() : "-",
          leak: data[i][11] ? data[i][11].toString() : "-",
          catatan: data[i][12] ? data[i][12].toString() : "-",
          ttdBase64: data[i][20] || "" 
        });
      }
    }

    if (filteredData.length === 0) return { status: "error", message: "Tidak ada data " + tipeLaporan + " pada rentang waktu tersebut." };

    var dataPerLokasi = {};
    filteredData.forEach(function(row) {
      if (!dataPerLokasi[row.lokasi]) dataPerLokasi[row.lokasi] = [];
      dataPerLokasi[row.lokasi].push(row);
    });

    var pdfLinks = [];
    var parts = tglMulai.split("-");
    var namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    var bulanTeks = parts.length === 3 ? (namaBulan[parseInt(parts[1], 10) - 1] + " " + parts[0]) : tglMulai;
    var periodeTeks = tglMulai + " s.d " + tglAkhir;

    for (var lokasi in dataPerLokasi) {
      var rows = dataPerLokasi[lokasi];
      var templateId = (tipeLaporan === "SUHU") ? TEMPLATE_SUHU_ID : TEMPLATE_GAS_ID;
      
      var fileTemp = DriveApp.getFileById(templateId).makeCopy("Temp_" + tipeLaporan + "_" + lokasi, folder);
      var doc = DocumentApp.openById(fileTemp.getId());
      var body = doc.getBody();

      if (tipeLaporan === "SUHU") {
        body.replaceText("(?i)<<Ruangan>>", lokasi);
        body.replaceText("(?i)<<Periode>>", periodeTeks);
      } else {
        var instr = lokasi; 
        var gasType = "-";
        if (lokasi.indexOf("Zetium A") > -1) { instr = 'Zetium "Panalytical" (A)'; gasType = "Argon Mixture Methane 10% P10"; } 
        else if (lokasi.indexOf("Zetium B") > -1) { instr = 'Zetium "Panalytical" (B)'; gasType = "Argon Mixture Methane 10% P10"; } 
        else if (lokasi.indexOf("Epsilon C") > -1) { instr = 'Epsilon "Panalytical" (C)'; gasType = "Helium"; } 
        else { instr = lokasi.replace("Tabung Gas", "").trim(); }

        body.replaceText("(?i)<<Instrument>>", instr);
        body.replaceText("(?i)<<TipeGas>>", gasType);
        body.replaceText("(?i)<<Bulan>>", bulanTeks);
      }

      var tables = body.getTables();
      var targetTable = null;
      var templateRowIndex = -1;
      var templateRow = null;

      for (var t = 0; t < tables.length; t++) {
        var currentTable = tables[t];
        for (var r = 0; r < currentTable.getNumRows(); r++) {
          var rowText = currentTable.getRow(r).getText().toUpperCase(); 
          if (rowText.indexOf("<<DATE>>") > -1 || rowText.indexOf("<<TANGGAL>>") > -1 || rowText.indexOf("<<NO>>") > -1) {
            targetTable = currentTable;
            templateRowIndex = r;
            templateRow = currentTable.getRow(r);
            break; 
          }
        }
        if (targetTable) break; 
      }

      if (targetTable && templateRow) {
        for (var x = 0; x < rows.length; x++) {
          var newRow = targetTable.insertTableRow(templateRowIndex + x + 1, templateRow.copy());
          var d = rows[x];
          
          var dParts = d.tanggal.split("-");
          var dateStr = d.tanggal;
          if (dParts.length === 3) {
             var bulanSingkat = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
             dateStr = dParts[2] + "-" + bulanSingkat[parseInt(dParts[1], 10) - 1] + "-" + dParts[0].substring(2,4);
          }
          
          for (var col = 0; col < newRow.getNumCells(); col++) {
            var cell = newRow.getCell(col);
            
            if (tipeLaporan === "SUHU") {
               cell.replaceText("(?i)<<Tanggal>>", dateStr);
               cell.replaceText("(?i)<<Shift>>", d.shift);
               cell.replaceText("(?i)<<Petugas>>", d.inspektor);
               cell.replaceText("(?i)<<Jam>>", d.jam);
               cell.replaceText("(?i)<<Suhu>>", d.suhu);
               cell.replaceText("(?i)<<Kelembapan>>", d.kel);
               cell.replaceText("(?i)<<TTD>>", ""); 
            } 
            else if (tipeLaporan === "GAS") {
               cell.replaceText("(?i)<<No>>", (x + 1).toString());
               cell.replaceText("(?i)<<Date>>", dateStr + "\\r" + d.jam); 
               cell.replaceText("(?i)<<Flow>>", d.flow);
               cell.replaceText("(?i)<<Pressure>>", d.pressure);
               cell.replaceText("(?i)<<Shift>>", d.shift);
               cell.replaceText("(?i)<<PIC>>", d.inspektor);
               cell.replaceText("(?i)<<Remark>>", d.catatan);
               cell.replaceText("(?i)<<TTD>>", "");
               
               if (d.leak === "Y") {
                 cell.replaceText("(?i)<<Y>>", "V"); cell.replaceText("(?i)<<N>>", "-");
               } else if (d.leak === "N") {
                 cell.replaceText("(?i)<<Y>>", "-"); cell.replaceText("(?i)<<N>>", "V");
               } else {
                 cell.replaceText("(?i)<<Y>>", "-"); cell.replaceText("(?i)<<N>>", "-");
               }
            }
          }

          if (d.ttdBase64 && d.ttdBase64.length > 50) {
            try {
              var lastCell = newRow.getCell(newRow.getNumCells() - 1);
              lastCell.setText(""); 
              var blobTTD = Utilities.newBlob(Utilities.base64Decode(d.ttdBase64.split(',')[1]), "image/png");
              var para = lastCell.getChild(0).asParagraph();
              var img = para.appendInlineImage(blobTTD);
              img.setWidth(45).setHeight(25); 
            } catch(e) {}
          }
        }
        targetTable.removeRow(templateRowIndex);
      }

      doc.saveAndClose();

      var pdfBlob = fileTemp.getAs('application/pdf');
      var safeName = lokasi.replace(/[^a-zA-Z0-9_]/g, '_'); 
      var targetName = "Laporan_Pemantauan_" + tipeLaporan + "_" + safeName + ".pdf";
      pdfBlob.setName(targetName);
      
      var existingFiles = folder.searchFiles('title = "' + targetName + '"');
      while (existingFiles.hasNext()) {
        existingFiles.next().setTrashed(true);
      }

      var newPdf = folder.createFile(pdfBlob);
      newPdf.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      pdfLinks.push({ nama: lokasi, url: newPdf.getUrl() });
      fileTemp.setTrashed(true);
    }

    return { status: "success", links: pdfLinks };

  } catch (err) {
    return { status: "error", message: err.toString() };
  }
}
