import * as XLSX from 'xlsx';
import { P2H_LAB_ROOMS, P2H_LOGISTICS_ITEMS, CALIBRATION_WEIGHTS, P2HGasInventory } from '../data/p2hLaboratoryRooms';

export interface P2HToolRecordStatus {
  bodyDalam: 'Bersih' | 'Kotor' | 'N/A' | '-';
  bodyLuar: 'Bersih' | 'Kotor' | 'N/A' | '-';
  filter: 'Bersih' | 'Kotor' | 'N/A' | '-';
  kondisi: 'Normal' | 'Standby' | 'Breakdown' | 'Spare' | 'Scrap' | '-';
  elektrikal: 'Normal' | 'Abnormal' | 'N/A' | '-';
  keterangan: string;
  chillerTemp?: string;
  chillerWaterLevel?: string;
}

export function exportP2HLaboratoryExcel({
  inspectorName,
  inspectionDate,
  shift,
  toolStatuses,
  logisticsCounts,
  gasInventory,
  calibrationWeightsCounts,
  supervisorName,
  notes,
}: {
  inspectorName: string;
  inspectionDate: string; // YYYY-MM-DD or formatted
  shift: string;
  toolStatuses: Record<string, P2HToolRecordStatus>;
  logisticsCounts: Record<string, string | number>;
  gasInventory: P2HGasInventory;
  calibrationWeightsCounts: Record<string, string | number>;
  supervisorName?: string;
  notes?: string;
}) {
  const wsData: any[][] = [];

  // Header Title
  wsData.push(['FORMULIR']);
  wsData.push(['CEK LIST P2H PERALATAN LABORATORIUM']);
  wsData.push(['No. Dokumen: TBP-FR-PL-LAB-04.01-01', '', '', '', 'Tgl. Berlaku: 12 Desember 2022', '', '', '', 'Revisi: 0.0']);
  wsData.push([]);
  
  // Date & Shift
  const dateObj = new Date(inspectionDate || Date.now());
  const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();
  const dateFormatted = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();

  wsData.push(['HARI / TANGGAL:', `${dayName} / ${dateFormatted}`, '', '', 'SHIFT:', shift || 'SHIFT SIANG', '', '', 'PELAKSANA:', inspectorName]);
  wsData.push([]);

  // Table Column Headers
  wsData.push([
    'NO',
    'RUANGAN / SEKSI',
    'NAMA ALAT',
    'NO. ASSET',
    'BODY DALAM',
    'BODY LUAR',
    'FILTER',
    'KONDISI ALAT',
    'ELEKTRIKAL',
    'KETERANGAN'
  ]);

  let counter = 1;
  // Loop through rooms and tools
  for (const room of P2H_LAB_ROOMS) {
    // Room Header Row
    wsData.push([
      '',
      room.name.toUpperCase(),
      `-- ${room.description} --`,
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ]);

    for (const tool of room.tools) {
      const st = toolStatuses[tool.id] || {
        bodyDalam: 'Bersih',
        bodyLuar: 'Bersih',
        filter: tool.hasFilter ? 'Bersih' : 'N/A',
        kondisi: tool.defaultCondition || 'Normal',
        elektrikal: 'Normal',
        keterangan: tool.defaultNotes || ''
      };

      let finalKet = st.keterangan || '';
      if (room.hasChillerParams && (st.chillerTemp || st.chillerWaterLevel)) {
        const tempStr = st.chillerTemp ? `SUHU: ${st.chillerTemp}°C` : '';
        const waterStr = st.chillerWaterLevel ? `LEVEL AIR: ${st.chillerWaterLevel}` : '';
        finalKet = [tempStr, waterStr, finalKet].filter(Boolean).join(' | ');
      }

      const isSpare = (finalKet || tool.defaultNotes || '').toUpperCase().includes('SPARE') || st.kondisi === 'Spare' || tool.defaultCondition === 'Spare';

      wsData.push([
        counter++,
        room.name,
        tool.name,
        tool.assetNumber,
        isSpare ? '-' : st.bodyDalam,
        isSpare ? '-' : st.bodyLuar,
        isSpare ? '-' : (tool.hasFilter ? st.filter : 'N/A'),
        isSpare ? '-' : st.kondisi,
        isSpare ? '-' : st.elektrikal,
        isSpare ? (st.keterangan || 'SPARE') : finalKet
      ]);
    }
  }

  // Section: Logistics & Consumables
  wsData.push([]);
  wsData.push(['INVENTARIS & ALAT PENDUKUNG LABORATORIUM']);
  wsData.push(['NAMA ALAT PENDUKUNG', 'JUMLAH', 'SATUAN', '', 'LOKASI GAS', 'GAS HELIUM (ISI)', 'GAS HELIUM (KOSONG)', 'GAS ARGON (ISI)', 'GAS ARGON (KOSONG)']);

  const maxLogRows = Math.max(P2H_LOGISTICS_ITEMS.length, 4);
  for (let i = 0; i < maxLogRows; i++) {
    const item = P2H_LOGISTICS_ITEMS[i];
    let colGas1 = '', colGas2 = '', colGas3 = '', colGas4 = '', colGas5 = '';

    if (i === 0) {
      colGas1 = 'LAB KRISHNA';
      colGas2 = String(gasInventory.helium.krishna.isi);
      colGas3 = String(gasInventory.helium.krishna.kosong);
      colGas4 = String(gasInventory.argon.krishna.isi);
      colGas5 = String(gasInventory.argon.krishna.kosong);
    } else if (i === 1) {
      colGas1 = 'LOGISTIK';
      colGas2 = String(gasInventory.helium.logistik.isi);
      colGas3 = String(gasInventory.helium.logistik.kosong);
      colGas4 = String(gasInventory.argon.logistik.isi);
      colGas5 = String(gasInventory.argon.logistik.kosong);
    } else if (i === 2) {
      colGas1 = 'TRAY LOI:';
      colGas2 = gasInventory.trayLoiCount || '0';
    } else if (i === 3) {
      colGas1 = 'RAK BEAD & PELLET:';
      colGas2 = gasInventory.rakKayuBeadPellet || '-';
    }

    const rawCount = item ? logisticsCounts[item.id] : '';
    const cleanCount = (rawCount === undefined || rawCount === null || String(rawCount).trim().toLowerCase() === 'lengkap' || String(rawCount).trim() === '0' || String(rawCount).trim() === '-') ? '' : String(rawCount).trim();

    wsData.push([
      item ? item.name : '',
      cleanCount,
      item ? item.unit : '',
      '',
      colGas1,
      colGas2,
      colGas3,
      colGas4,
      colGas5
    ]);
  }

  // Calibration Weights (Jumlah per Standar)
  wsData.push([]);
  wsData.push(['STANDAR KALIBRASI BATU TIMBANG', ...CALIBRATION_WEIGHTS.map(w => w)]);
  wsData.push([
    'JUMLAH (SET / PCS)',
    ...CALIBRATION_WEIGHTS.map(w => {
      const v = calibrationWeightsCounts[w];
      if (v === undefined || v === null || String(v).trim().toLowerCase() === 'lengkap' || String(v).trim() === '0' || String(v).trim() === '-' || String(v).trim() === '✓') return '';
      return String(v).trim();
    })
  ]);

  // Aquadest & Pendukung
  wsData.push([]);
  wsData.push([
    'STATUS AQUADEST',
    `Aquadest Isi: ${gasInventory.aquadestIsi || '0'}`,
    `Aquadest Kosong: ${gasInventory.aquadestKosong || '0'}`,
    `Tray LOI: ${gasInventory.trayLoiCount || '0'}`,
    `Rak Kayu Bead & Pellet: ${gasInventory.rakKayuBeadPellet || '0'}`
  ]);
  if (notes) {
    wsData.push(['CATATAN UMUM', notes]);
  }

  // Signatures
  wsData.push([]);
  wsData.push([]);
  wsData.push(['Dilaksanakan oleh,', 'Diperiksa oleh,', '', '', 'Diketahui oleh,', '', '', 'Diketahui oleh,']);
  wsData.push([]);
  wsData.push([]);
  wsData.push([]);
  wsData.push([
    inspectorName || 'Foreman',
    supervisorName || 'Laboratorium Supervisor',
    '',
    '',
    'Tigwa Anggawikara',
    '',
    '',
    'Deni Nugraha Perdiana'
  ]);
  wsData.push([
    'Laboratorium Foreman',
    'Laboratorium Supervisor',
    '',
    '',
    'Laboratorium Superintendent',
    '',
    '',
    'Preparation & Laboratorium Manager'
  ]);
  wsData.push([]);
  wsData.push([
    `[ Tervalidasi Digital via PrepLab Portal | Pelaksana: ${inspectorName} | Shift: ${shift || 'SHIFT SIANG'} | Dokumen: TBP-FR-PL-LAB-04.01-01 ]`
  ]);

  // Create Sheet & Workbook
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column width config
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 18 }, // Ruangan
    { wch: 34 }, // Nama Alat
    { wch: 22 }, // No Asset
    { wch: 14 }, // Body Dalam
    { wch: 14 }, // Body Luar
    { wch: 12 }, // Filter
    { wch: 16 }, // Kondisi
    { wch: 14 }, // Elektrikal
    { wch: 36 }, // Keterangan
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'P2H Laboratorium');

  // Trigger File Download
  const safeDate = dateFormatted.replace(/[\s/]/g, '_');
  const filename = `P2H_Laboratorium_TBP-FR-PL-LAB-04.01-01_${safeDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}
