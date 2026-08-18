/**
 * MODUL WORK ORDER (WO)
 * Salin file ini ke Google Apps Script Anda jika Anda menggunakan fitur Work Order (Pembuatan WO & Update Status WO)
 */

const WO_SHEET_NAME = "WO_Master";
const TEMPLATE_ID = '1TIKVnEaYWjPOR4VaU7IFjUuvTMoeZ3jiIKU94XJbw48'; // Template Doc untuk WO
const FOLDER_ID = '1OskSglYtnB4JEP8aaRvfn3qdPKG3JQ__'; // Folder ID Arsip PDF WO

function formatTanggalGAS(dateString) {
  if (!dateString || dateString === "-") return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return Utilities.formatDate(d, "GMT+7", "dd MMMM yyyy");
  } catch (e) {
    return dateString;
  }
}

function submitWO(formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let masterSheet = ss.getSheetByName(WO_SHEET_NAME);
    if (!masterSheet) {
      masterSheet = ss.insertSheet(WO_SHEET_NAME);
      masterSheet.appendRow([
        "WO_ID", "Timestamp", "Status", "Priority", "Pelapor_NIK", "Pelapor_Nama", "Shift", 
        "Alat_ID", "Nama_Alat", "Lokasi_Ruangan", "Kategori_Kerusakan", "Deskripsi_Masalah", 
        "Bukti_Foto_URL", "Teknisi_PIC", "Mulai_Perbaikan", "Selesai_Perbaikan", "Hasil_Tindakan", "Durasi_Downtime"
      ]);
      masterSheet.getRange(1, 1, 1, 18).setFontWeight("bold").setBackground("#f3f4f6");
      masterSheet.setFrozenRows(1);
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const data = masterSheet.getDataRange().getValues();
    let countThisYear = 0;
    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][1]);
      if (!isNaN(rowDate.getTime()) && rowDate.getFullYear() === currentYear) {
        countThisYear++;
      }
    }
    const seq = countThisYear + 1;

    const tanggalStr = Utilities.formatDate(now, "GMT+9", "dd/MM/yyyy");
    const waktuStr = Utilities.formatDate(now, "GMT+9", "HH:mm");
    const dateSign = Utilities.formatDate(now, "GMT+9", "yyMMdd");
    const woId = "FWO-" + dateSign + "-" + seq;
    
    // Proses Dokumen PDF
    const templateFile = DriveApp.getFileById(TEMPLATE_ID);
    const newDocFile = templateFile.makeCopy(`Temp_${woId}`);
    const docId = newDocFile.getId();
    const doc = DocumentApp.openById(docId);
    const body = doc.getBody();
    
    body.replaceText('<<NAMA KARYAWAN>>', formData.namaKaryawan || '-');
    body.replaceText('<<JABATAN KARYAWAN>>', formData.jabatanKaryawan || '-');
    body.replaceText('<<SHIFT>>', formData.shift || '-');
    body.replaceText('<<NAMA ALAT>>', formData.namaAlat || '-');
    body.replaceText('<<NO ALAT>>', formData.noAlat || '-');
    body.replaceText('<<NO ASSET>>', formData.noAsset || '-');
    body.replaceText('<<POSISI ALAT>>', formData.posisiAlat || '-');
    body.replaceText('<<RUANGAN>>', formData.ruangan || '-');
    body.replaceText('<<Tanggal>>', tanggalStr);
    body.replaceText('<<Waktu>>', waktuStr);
    body.replaceText('<<Kerusakan>>', formData.kerusakan || '-');
    
    if (formData.fotoKerusakan && formData.fotoKerusakan.startsWith('data:')) {
      const fotoBlob = convertBase64ToBlob(formData.fotoKerusakan, 'Foto_Kerusakan.png');
      replaceTagWithImage(body, '<<FOTOKERUSAKAN>>', fotoBlob, 280);
    } else {
      body.replaceText('<<FOTOKERUSAKAN>>', '(Tidak Ada Foto)');
    }
    
    if (formData.ttdUser && formData.ttdUser.startsWith('data:')) {
      const ttdBlob = convertBase64ToBlob(formData.ttdUser, 'TTD_User.png');
      replaceTagWithImage(body, '<<TTDUSER>>', ttdBlob, 130);
    } else {
      body.replaceText('<<TTDUSER>>', '(Belum Ditandatangani)');
    }
    
    doc.saveAndClose();
    const pdfBlob = newDocFile.getAs(MimeType.PDF).setName(`${woId}.pdf`);
    
    // Simpan file PDF langsung ke dalam folder khusus
    const folderArsip = DriveApp.getFolderById(FOLDER_ID);
    const pdfFile = folderArsip.createFile(pdfBlob);
    
    newDocFile.setTrashed(true);
    
    const validPosisi = (formData.posisiAlat && formData.posisiAlat !== '-');
    const gabungLokasiRuangan = validPosisi ? `${formData.posisiAlat} - ${formData.ruangan}` : formData.ruangan;
    const alatId = formData.noAlat || formData.noAsset || '-';
    
    masterSheet.appendRow([
      woId, now, "Open", formData.priority || "Medium", formData.nik || "-", formData.namaKaryawan || "-", formData.shift || "-", 
      alatId, formData.namaAlat || "-", gabungLokasiRuangan, formData.kategori || "-", formData.kerusakan || "-", 
      pdfFile.getUrl(), "", "", "", "", ""
    ]);
    
    // Format WA Khusus Pembuatan WO
    const waMessageOpen = 
      `⚠️ *LAPORAN KERUSAKAN DITERIMA*\n` +
      `🏷️ *Tipe: ${(formData.jenisWO || 'N/A').toUpperCase()}*\n\n` +
      `👤 *Pelapor*\n` +
      `Nama   : ${formData.namaKaryawan}\n` +
      `Jabatan: ${formData.jabatanKaryawan}\n\n` +
      `🔧 *Detail Barang*\n` +
      `Item     : ${formData.namaAlat}\n` +
      `No. Alat : ${formData.noAlat || '-'}\n` +
      `No. Asset: ${formData.noAsset || '-'}\n\n` +
      `📍 *Lokasi*\n` +
      `Posisi : ${formData.posisiAlat || '-'}\n` +
      `Ruangan: ${formData.ruangan || '-'}\n\n` +
      `📝 *Detail Kerusakan*\n` +
      `${formData.kerusakan}\n\n` +
      `📄 *Dokumen Kerusakan*\n` +
      `${pdfFile.getUrl()}`;
      
    if(typeof kirimNotifikasiWA === 'function') {
      kirimNotifikasiWA(waMessageOpen);
    }
    
    return { success: true, pdfUrl: pdfFile.getUrl(), woId: woId, insertedId: woId };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function resolveWO(updateData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(WO_SHEET_NAME);
    if (!sheet) return { success: false, message: 'Sheet WO_Master tidak ditemukan.' };
    
    const data = sheet.getDataRange().getValues();
    let targetRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() === updateData.woId.toString().trim()) {
        targetRow = i + 1;
        break;
      }
    }
    
    if (targetRow === -1) return { success: false, message: 'ID Work Order tidak ditemukan.' };
    
    const startTimestamp = data[targetRow - 1][1];
    const endTimestamp = new Date();
    
    let downtimeText = "-";
    if (startTimestamp && endTimestamp) {
      const start = new Date(startTimestamp);
      const end = endTimestamp;
      const diffMs = end - start;
      if (diffMs > 0) {
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        downtimeText = `${diffHrs} Jam ${diffMins} Menit`;
      }
    }
    
    sheet.getRange(targetRow, 3).setValue(updateData.status);
    sheet.getRange(targetRow, 14).setValue(updateData.teknisi);
    sheet.getRange(targetRow, 15).setValue(new Date(startTimestamp));
    sheet.getRange(targetRow, 16).setValue(endTimestamp);
    sheet.getRange(targetRow, 17).setValue(updateData.tindakan || "-");
    sheet.getRange(targetRow, 18).setValue(downtimeText);
    
    if(updateData.sparepart_name) {
      sheet.getRange(targetRow, 19).setValue(updateData.sparepart_name);
      sheet.getRange(targetRow, 20).setValue(updateData.sparepart_qty || 1);
      if(typeof saveToSparepartMaster === 'function') {
        saveToSparepartMaster(updateData.sparepart_name);
      }
    }
    
    const idAlat = data[targetRow - 1][7] || '-';
    const namaAlat = data[targetRow - 1][8] || '-';
    
    // Format WA Khusus Update Penyelesaian
    const waMessageResolve = 
      `✅ *WORK ORDER UPDATE*\n` +
      `🏷️ *ID WO: ${updateData.woId}*\n\n` +
      `🔧 *Alat Rusak: ${namaAlat} (${idAlat})*\n\n` +
      `👨🔧 *Penanganan*\n` +
      `Status Akhir: ${updateData.status}\n` +
      `Teknisi PIC : ${updateData.teknisi}\n\n` +
      `🛠️ *Hasil Tindakan*\n` +
      `${updateData.tindakan}\n\n` +
      `⏱️ *Durasi Downtime*\n` +
      `${downtimeText}`;
      
    if(typeof kirimNotifikasiWA === 'function') {
      kirimNotifikasiWA(waMessageResolve);
    }
    
    return { success: true };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function handleGetWOData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(WO_SHEET_NAME);
  if (!sheet) return [];

  const [headers, ...dataRows] = sheet.getDataRange().getValues();
  
  return dataRows.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header] = row[i];
    });
    return obj;
  });
}

function handleGetSpareparts() {
  const SPAREPART_SHEET_NAME = "Sparepart_Master";
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SPAREPART_SHEET_NAME);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  return rows.slice(1).map(r => r[0]); 
}

function saveToSparepartMaster(namesString) {
  if (!namesString) return;
  const names = String(namesString).split(',').map(n => n.trim()).filter(Boolean);

  const SPAREPART_SHEET_NAME = "Sparepart_Master";
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SPAREPART_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SPAREPART_SHEET_NAME);
    sheet.appendRow(["Nama Sparepart", "Terakhir Digunakan"]);
  }
  
  names.forEach(name => {
    const rows = sheet.getDataRange().getValues();
    const foundIdx = rows.findIndex(r => String(r[0]).trim().toLowerCase() === String(name).trim().toLowerCase());
    
    if (foundIdx === -1) {
      sheet.appendRow([name, new Date()]);
    } else {
      sheet.getRange(foundIdx + 1, 2).setValue(new Date());
    }
  });
}

// ==========================================
// UTILITY FUNCTIONS BANTUAN UNTUK MODUL WO
// ==========================================

function convertBase64ToBlob(base64String, filename) {
  const parts = base64String.split(',');
  const contentType = parts[0].match(/:(.*?);/)[1];
  const decoded = Utilities.base64Decode(parts[1]);
  return Utilities.newBlob(decoded, contentType, filename);
}

function replaceTagWithImage(body, tag, imageBlob, maxWidth) {
  const element = body.findText(tag);
  if (!element) return;
  const textElement = element.getElement();
  const containerParagraph = textElement.getParent();
  if (containerParagraph.getType() === DocumentApp.ElementType.PARAGRAPH || containerParagraph.getType() === DocumentApp.ElementType.TABLE_CELL) {
    const imgElement = containerParagraph.asParagraph().appendInlineImage(imageBlob);
    if (maxWidth && imgElement.getWidth() > maxWidth) {
      const currentWidth = imgElement.getWidth();
      const currentHeight = imgElement.getHeight();
      imgElement.setWidth(maxWidth);
      imgElement.setHeight((currentHeight * maxWidth) / currentWidth);
    }
    textElement.setText(textElement.getText().replace(tag, ""));
  }
}

function kirimNotifikasiWA(pesan, targetGroupId) {
  const token = "VAiWtn353aJHVUKYnggW"; // Ganti dengan token Fonnte Anda
  const targetGroup = targetGroupId || "6281287904230-1569907296@g.us"; // Ganti dengan target WhatsApp Group / Nomor Anda
  const url = "https://api.fonnte.com/send";
  
  const options = {
    method: "post",
    headers: {
      "Authorization": token
    },
    payload: {
      "target": targetGroup,
      "message": pesan,
      "countryCode": "62"
    },
    muteHttpExceptions: true
  };
  
  try {
    UrlFetchApp.fetch(url, options);
  } catch (err) {
    console.error("Gagal kirim WA ke Fonnte: " + err.toString());
  }
}

// ===== MODUL WO PERMINTAAN =====
function submitInternalTicket(formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetName = "Ticket_Internal_Master";
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow([
        "Ticket_ID", "Timestamp", "Status", "Priority", "Pelapor_NIK", "Pelapor_Nama", "Shift", 
        "Tipe_Request", "Deskripsi_Request", "Lokasi_Area", "Target_Waktu", "Bukti_Foto_URL", "PIC_Tugas", "Mulai_Pekerjaan", "Selesai_Pekerjaan", "Hasil_Tindakan", "Sparepart_Digunakan", "Jumlah_Sparepart"
      ]);
      sheet.getRange(1, 1, 1, 18).setFontWeight("bold").setBackground("#e0e7ff");
      sheet.setFrozenRows(1);
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const data = sheet.getDataRange().getValues();
    let countThisYear = 0;
    for (let i = 1; i < data.length; i++) {
      const rowDate = new Date(data[i][1]);
      if (!isNaN(rowDate.getTime()) && rowDate.getFullYear() === currentYear) {
        countThisYear++;
      }
    }
    const seq = countThisYear + 1;
    
    const dateSign = Utilities.formatDate(now, "GMT+9", "yyMMdd");
    const ticketId = "RWO-" + dateSign + "-" + seq;
    
    let photoUrl = "-";
    if (formData.fotoBukti && formData.fotoBukti.startsWith('data:')) {
      const parts = formData.fotoBukti.split(',');
      const contentType = parts[0].match(/:(.*?);/)[1];
      const decoded = Utilities.base64Decode(parts[1]);
      const blob = Utilities.newBlob(decoded, contentType, 'InternalTicket_' + ticketId + '.png');
      
      let folderName = "App_Uploads";
      let folders = DriveApp.getFoldersByName(folderName);
      let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
      let file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      photoUrl = file.getUrl();
    }
    
    sheet.appendRow([
      ticketId, now, "Open", formData.priority || "Medium", formData.nik || "-", formData.namaKaryawan || "-", formData.shift || "-",
      formData.tipeRequest || "-", formData.deskripsi || "-", formData.lokasi || "-", formatTanggalGAS(formData.targetWaktu) || "-", photoUrl,
      "", "", "", "", "", ""
    ]);
    
    // Save category if it doesn't exist
    saveInternalTicketCategory(formData.tipeRequest);
    
    // WA Notification
    const waMessageOpen = 
      `📝 *WO PERMINTAAN BARU*\n` +
      `🏷️ *Ticket ID: ${ticketId}*\n\n` +
      `👤 *Pemohon*\n` +
      `Nama   : ${formData.namaKaryawan}\n` +
      `Jabatan: ${formData.jabatanKaryawan}\n\n` +
      `📌 *Detail Request*\n` +
      `Tipe   : ${formData.tipeRequest}\n` +
      `Prioritas : ${formData.priority}\n` +
      `Target : ${formatTanggalGAS(formData.targetWaktu)}\n` +
      `Lokasi : ${formData.lokasi}\n\n` +
      `📝 *Deskripsi*\n` +
      `${formData.deskripsi}\n\n` +
      `🖼️ *Lampiran*\n` +
      `${photoUrl}`;
      
    if(typeof kirimNotifikasiWA === 'function') {
      kirimNotifikasiWA(waMessageOpen, "120363022108329054@g.us");
    }
    
    return { success: true, ticketId: ticketId, photoUrl: photoUrl };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

function resolveInternalTicket(updateData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Ticket_Internal_Master");
    if (!sheet) return { success: false, message: 'Sheet Ticket_Internal_Master tidak ditemukan.' };
    
    const data = sheet.getDataRange().getValues();
    let targetRow = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0].toString().trim() === updateData.ticketId.toString().trim()) {
        targetRow = i + 1;
        break;
      }
    }
    
    if (targetRow === -1) return { success: false, message: 'ID WO Permintaan tidak ditemukan.' };
    
    const startTimestamp = data[targetRow - 1][1];
    const endTimestamp = new Date();
    
    sheet.getRange(targetRow, 3).setValue(updateData.status); // Status
    sheet.getRange(targetRow, 13).setValue(updateData.pic); // PIC
    sheet.getRange(targetRow, 14).setValue(new Date(startTimestamp)); // Mulai
    sheet.getRange(targetRow, 15).setValue(endTimestamp); // Selesai
    sheet.getRange(targetRow, 16).setValue(updateData.tindakan || "-"); // Tindakan
    
    if (updateData.sparepart_name) {
      sheet.getRange(targetRow, 17).setValue(updateData.sparepart_name);
      sheet.getRange(targetRow, 18).setValue(updateData.sparepart_qty || 1);
      if (typeof saveToSparepartMaster === 'function') {
        saveToSparepartMaster(updateData.sparepart_name);
      }
    }
    
    // WA Update
    const waMessageResolve = 
      `✅ *UPDATE WO PERMINTAAN*\n` +
      `🏷️ *Ticket ID: ${updateData.ticketId}*\n\n` +
      `👨🔧 *Penanganan*\n` +
      `Status Akhir: ${updateData.status}\n` +
      `PIC Tugas : ${updateData.pic}\n\n` +
      `🛠️ *Hasil / Tindakan*\n` +
      `${updateData.tindakan}`;
      
    if(typeof kirimNotifikasiWA === 'function') {
      kirimNotifikasiWA(waMessageResolve, "120363022108329054@g.us");
    }
    
    return { success: true };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

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
  if (!kategori || kategori === "-" || kategori === "Lainnya" || kategori === "Lainnya...") return;
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

function handleGetInternalTickets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Ticket_Internal_Master");
  if (!sheet) return [];
  const [headers, ...dataRows] = sheet.getDataRange().getValues();
  return dataRows.map(row => {
    let obj = {};
    headers.forEach((header, i) => { obj[header] = row[i]; });
    return obj;
  });
}
