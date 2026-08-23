
const DEFAULT_KTA_URL = 'https://docs.google.com/forms/d/1YMympG3aA-8l978aAlRJFSoi-SVQAKiS7KmJjNRfuBI/viewform?edit_requested=true';
export const getKtaUrl = () => { const v = localStorage.getItem('KTA_URL'); return (v && v.startsWith('http')) ? v : DEFAULT_KTA_URL; };
export const setKtaUrl = (url: string) => localStorage.setItem('KTA_URL', url);

export const getEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data.map((d: any) => ({
        nama: d.name,
        jabatan: d.jabatan || d.position,
        divisi: d.section || d.department,
        grup: d.shift || '',
        nik: d.nik
      })).filter((e: any) => e.nama);
    } catch (e) {
      console.error(e); return [];
    }
};


export const addEmployee = async (employee: { nama: string, jabatan: string, divisi: string, grup: string, nik: string }) => {
  const res = await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ` }, body: JSON.stringify({ name: employee.nama, position: employee.jabatan, department: employee.divisi, nik: employee.nik }) });
  const data = await res.json();
  return data.filter((t: any) => t.source === 'internal' || (t.ticketId && t.ticketId.startsWith('RWO-')));
};

export const getMasterPertanyaan = async () => {
  const res = await fetch('/api/questions');
  return await res.json();
};

export const submitInspeksiUniversal = async (finalData: any, ttd1: string, ttd2: string, ttd3: string, fotoTemuanArray: string[], fotoProses: string) => {
  const res = await fetch('/api/inspections/universal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ finalData, ttd1, ttd2, ttd3, fotoTemuanArray, fotoProses }) });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
};

export const submitInspeksi = async (dataF: any[][], ttd1: string, ttd2: string, ttd3: string, fotoProses: string, devOptions: any, temuanUmum?: any[], fotoTemuanArray?: string[]) => {
  const res = await fetch('/api/inspections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataF, ttd1, ttd2, ttd3, fotoProses, devOptions, temuanUmum, fotoTemuanArray }) });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
};

export const triggerReminderManual = async (devOpt: any) => {
  return { status: "ok", message: "Reminder dikirim" };
};

export const triggerRutinitasJumatManual = async (devOpt: any) => {
  return { status: "ok", message: "Rutinitas dikirim" };
};

export interface ToolRecord {
  id: string;
  assetNumber: string;
  name: string;
  location: string;
  description: string;
  photoUrl: string;
  itemCategory: string;
  sheetOrigin: string;
  rowIndex: number;
}

export const getEquipments = async (): Promise<{ category: string, tools: ToolRecord[] }[]> => {
  try {
    const res = await fetch('/api/equipments');
    const data = await res.json();
    
    if (!Array.isArray(data)) return [];

    const grouped = data.reduce((acc: any, tool: any) => {
      const cat = tool.category || 'Asset';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push({
        id: tool.id.toString(),
        assetNumber: tool.assetCode || tool.itemCode || '',
        name: tool.itemName || '',
        location: tool.location || '',
        description: tool.itemDescription || '',
        photoUrl: '',
        itemCategory: cat,
        sheetOrigin: cat,
        rowIndex: tool.id
      });
      return acc;
    }, {});
    
    return Object.keys(grouped).map(cat => ({ category: cat, tools: grouped[cat] }));
  } catch (e) {
    console.error(e); return [];
  }
};

export const appendRowsToSheet = async (sheetName: string, rows: any[][], devOptions?: any) => {
  try {
    if (sheetName === 'Inspections') {
      const payloadRows = rows.map(row => ({
        date: row[0],
        equipmentName: row[1],
        status: row[2],
        inspectorName: row[3],
        notes: row[4]
      }));

      await fetch('/api/inspections/bulk-harian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payloadRows })
      });
    } else if (sheetName === 'Downtime') {
      const payloadRows = rows.map(row => ({
        toolName: row[1],
        breakdownTime: row[2],
        repairTime: row[3],
        notes: row[4],
        status: row[5]
      }));

      await fetch('/api/downtime/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payloadRows })
      });
    }
  } catch(e) {
    console.error(e); return [];
  }
};

export const getTickets = async (statusFilter: string) => {
  const res = await fetch('/api/tickets');
  const data = await res.json();
  const filteredData = data.filter((t: any) => t.source === 'inspeksi' || t.ticketId.startsWith('TKT-'));
  if (statusFilter === 'ALL') return filteredData;
  return filteredData.filter((t: any) => t.status?.toUpperCase() === statusFilter.toUpperCase());
  
};

export const closeTicket = async (ticketId: string, picName: string, photoBase64: string, notes: string, devOptions?: any) => {
  let photoUrl = photoBase64 || '';
  if (photoBase64 && photoBase64.startsWith('data:')) {
     try {
        const base64Data = photoBase64.split(',')[1] || photoBase64;
        const uploaded = await uploadPhotoToDrive(base64Data, 'image/jpeg', `ticket_close_${ticketId}.jpg`, 'Internal Tickets');
        if (uploaded && uploaded.startsWith('http')) {
           photoUrl = uploaded;
        }
     } catch(e) {
        console.error("Gagal upload ke drive", e);
     }
  }
  const res = await fetch(`/api/tickets/${ticketId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      status: 'CLOSED', 
      actionTaken: notes, 
      pic: picName, 
      closingPhoto: photoUrl,
      completionDate: new Date().toISOString()
    })
  });
  return await res.json();
};

export const getGalleryPhotos = async (week?: string, refresh?: boolean) => {
  const params = new URLSearchParams();
  if (week) params.append('week', week);
  if (refresh) params.append('refresh', '1');
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`/api/gallery${query}`);
  return await res.json();
};

export const submitPenggantianTabung = async (data: any) => {
  const res = await fetch('/api/penggantian-tabung', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
  return await res.json();
};

export const getRekapanPenggantianTabung = async () => {
  const res = await fetch('/api/penggantian-tabung');
  return await res.json();
};

export const submitPemantauanBatch = async (data: any) => {
  const items = [];
  
  if (data.suhuData) {
    Object.keys(data.suhuData).forEach(room => {
      const vals = data.suhuData[room];
      if (vals.suhu || vals.kel) {
        items.push({
          kategori: 'SUHU',
          lokasi: room,
          suhu: vals.suhu,
          kelembapan: vals.kel
        });
      }
    });
  }
  
  if (data.gasData) {
    Object.keys(data.gasData).forEach(gas => {
      const vals = data.gasData[gas];
      if (vals.flow || vals.pressure) {
        items.push({
          kategori: 'GAS',
          lokasi: gas,
          flow: vals.flow,
          tekananGas: vals.pressure,
          kebocoran: vals.leak
        });
      }
    });
  }

  const payload = {
    inspektor: data.inspectorName,
    shift: data.shift,
    catatan: data.catatan,
    foto: data.photoUrl || data.sigUrl, // using photoUrl if any, else sigUrl
    items: items
  };

  const res = await fetch('/api/pemantauan', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload) 
  });
  return await res.json();
};

export const getRekapanPemantauan = async (tglMulai: string, tglAkhir: string) => {
  try {
    const res = await fetch('/api/pemantauan');
    const data = await res.json();
    return data;
  } catch (e) {
    console.error(e); return [];
}
};

export const buatPdfRekapan = async (tglMulai: string, tglAkhir: string, tipeLaporan: string) => {
  const res = await fetch('/api/pdf/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tglMulai, tglAkhir, tipeLaporan })
  });
  return await res.json();
};

export const getDowntimeRecords = async () => {
  const res = await fetch('/api/downtime');
  return await res.json();
};

export const updateDowntimeRepair = async (id: string, repairTime: string, notes: string, devOptions?: any) => {
  await fetch(`/api/downtime/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repairTime, notes })
  });
};

export const updateToolPhotoUrl = async (sheetOrigin: string, rowIndex: number, photoUrl: string) => {
  console.log("updateToolPhotoUrl called but ignored (no GAS)");
};

export const uploadPhotoToDrive = async (base64Data: string, mimeType: string, filename: string, folderName?: string): Promise<string> => {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer `
    },
    body: JSON.stringify({ base64Data, mimeType, filename, folderName })
  });
  const data = await res.json();
  return data.url;
};

export const getWOData = async () => {
  try {
    const res = await fetch('/api/work-orders');
    return await res.json();
  } catch (e) {
    console.error(e); return [];
}
};

export const getSpareparts = async (): Promise<string[]> => {
  const res = await fetch('/api/spareparts');
  const data = await res.json();
  return data.map((s: any) => s.item || s.name);
}

export const updateWOStatus = async (wo_id: string, status: string, tindakan: string, teknisi_pic: string, sparepart_name?: string, sparepart_qty?: string, devOptions?: any, photoBase64?: string) => {
  let photoUrl = '';
  if (photoBase64) {
     try {
        const base64Data = photoBase64.split(',')[1] || photoBase64;
        photoUrl = await uploadPhotoToDrive(base64Data, 'image/jpeg', 'wo_close.jpg', 'Work Orders');
     } catch(e) {
        console.error("Gagal upload ke drive", e);
     }
  }
  try {
    const payload = {
      status,
      actionTaken: tindakan,
      technicianPic: teknisi_pic,
      closingPhoto: photoUrl,
      sparepartName: sparepart_name,
      sparepartQty: sparepart_qty,
      repairStart: status === 'In Progress' ? new Date().toISOString() : undefined,
      repairEnd: status === 'Closed' ? new Date().toISOString() : undefined,
    };
    
    // Convert undefined to null if needed or just send what is defined
    const res = await fetch(`/api/work-orders/${wo_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Gagal update status WO');
    return await res.json();
  } catch (e) {
    console.error(e);
    throw e;
  }
};

// --- APD INVENTORY API ---
export const getApdSettings = async () => {
  const res = await fetch('/api/apd/settings');
  return await res.json();
};

export const saveApdSettings = async (intervals: Record<string, number>) => {
  const res = await fetch('/api/apd/settings', { method: 'POST', body: JSON.stringify(intervals) });
  return await res.json();
};

export const getApdHistoryByNik = async (nik: string) => {
  const res = await fetch('/api/apd/history');
  return await res.json();
};

export const recordApdTakes = async (nik: string, nama: string, entries: any[], pdfUrl?: string) => {
  const res = await fetch('/api/apd/history', { method: 'POST', body: JSON.stringify({ entries }) });
  return await res.json();
};



export const getPendingApdDocuments = async () => {
  const res = await fetch('/api/apd/documents');
  return await res.json();
};

export const signApdDocument = async (docId: string, role: 'spt' | 'manager', signatureData: string) => {
  const res = await fetch('/api/apd/documents', { method: 'POST', body: JSON.stringify({ docId, signatureData }) });
  return await res.json();
};

export const generateApdDocument = async (data: any) => {
  return { url: "https://via.placeholder.com/150" };
};


export const uploadApdProof = async (nik: string, apd: string, date: string, base64: string, fileName: string) => {
  return await uploadPhotoToDrive(base64, 'image/jpeg', fileName, 'Downtime & Perkakas');
};

export const uploadDocumentProof = async (docId: string, base64: string, fileName: string) => {
  return await uploadPhotoToDrive(base64, 'image/jpeg', fileName, 'Downtime & Perkakas');
};


export const createInternalTicket = async (data: any) => {
  let photoUrl = data.photoUrl || '';
  if (photoUrl && photoUrl.startsWith('data:image')) {
     try {
        const base64Data = photoUrl.split(',')[1] || photoUrl;
        photoUrl = await uploadPhotoToDrive(base64Data, 'image/jpeg', `WO_Permintaan_${new Date().getTime()}.jpg`, 'Internal Tickets');
        data.photoUrl = photoUrl;
     } catch(e) {
        console.error("Gagal upload ke drive", e);
     }
  }

  const res = await fetch('/api/tickets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await res.json();
};

export const getInternalTicketCategories = async () => {
  return { success: true, data: ['Umum', 'Fasilitas', 'IT', 'Lainnya'] };
};

export const getInternalTickets = async () => {
  const res = await fetch('/api/tickets');
  const data = await res.json();
  return data.filter((t: any) => t.source === 'internal' || (t.ticketId && (t.ticketId.startsWith('RWO-') || t.ticketId.startsWith('RWQ'))));
};

export const resolveInternalTicket = async (data: any) => {
  let photoUrl = '';
  if (data.photoBase64) {
     try {
        const base64Data = data.photoBase64.split(',')[1] || data.photoBase64;
        photoUrl = await uploadPhotoToDrive(base64Data, 'image/jpeg', 'rwo_close.jpg', 'Work Orders');
     } catch(e) {
        console.error("Gagal upload ke drive", e);
     }
  }
  const res = await fetch(`/api/tickets/${data.ticketId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: data.status, actionTaken: data.tindakan, pic: data.pic, closingPhoto: photoUrl, sparepartName: data.sparepart_name, sparepartQty: data.sparepart_qty, completionDate: data.status === 'Closed' ? new Date().toISOString() : undefined })
  });
  return await res.json();
};

// Put back dummy Roster functions
export const getRosterData = async (params: any) => {
  try {
    const res = await fetch('/api/roster');
    if (!res.ok) {
      throw new Error('Failed to fetch roster');
    }
    const data = await res.json();
    return { success: true, roster: Array.isArray(data) ? data : [] };
  } catch(e) {
    console.error(e);
    return { success: false, roster: [] };
  }
};
export const loginEmployee = async (nik: string) => { 
  try {
    const res = await fetch('/api/employees');
    const data = await res.json();
    const employee = data.find((e: any) => e.nik === nik);
    if (employee) {
      return { success: true, employee: { ...employee, name: employee.name || employee.nama, jabatan: employee.position || employee.jabatan } };
    }
    return { success: false, error: 'NIK tidak ditemukan di database.' };
  } catch (err) {
    return { success: false, error: 'Gagal menghubungi server.' };
  }
};




export const getPelanggaranData = async () => {
  const response = await fetch('/api/pelanggaran');
  if (!response.ok) {
    throw new Error(`Failed to fetch from sheet. Status: ${response.status}`);
  }
  const data = await response.json();
  return data.values || [];
};

export const getAppSettings = async () => {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    return { success: true, data };
  } catch (error) {
    console.error('Failed to get app settings', error);
    return { success: false, data: [] };
  }
};

export const addIzin = async (data: { nik: string, date: string, type: string, keterangan?: string }) => {
  try {
    const res = await fetch('/api/roster/izin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  } catch (e) {
    console.error(e);
    return { success: false };
  }
};
