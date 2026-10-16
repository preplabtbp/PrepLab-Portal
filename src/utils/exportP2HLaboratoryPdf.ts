import { P2H_LOGISTICS_ITEMS, P2HGasInventory } from '../data/p2hLaboratoryRooms';
import { P2HToolRecordStatus } from './exportP2HLaboratoryExcel';
import { TBP_HEADER_LOGO_BASE64 } from './tbpLogoBase64';
import { ensureSignatureIsBlack } from './signatureUtils';

export interface ExportP2HLaboratoryPdfParams {
  inspectorName: string;
  inspectorNik?: string;
  inspectionDate?: string;
  shift: string;
  toolStatuses: Record<string, P2HToolRecordStatus>;
  logisticsCounts: Record<string, string | number>;
  gasInventory: P2HGasInventory;
  calibrationWeightsCounts: Record<string, string | number>;
  supervisorName?: string;
  signatureUrl?: string | null;
  spvSignatureUrl?: string | null;
  sptSignatureUrl?: string | null;
  managerSignatureUrl?: string | null;
  spvNotes?: string;
  sptNotes?: string;
  managerNotes?: string;
  notes?: string;
  pageMode?: string;
}

export interface OfficialToolItem {
  no: number;
  id: string;
  name: string;
  assetNumber: string;
  hasFilter: boolean;
  defaultNotes?: string;
}

// Master ordered list of all 67 Laboratory Tools matching TBP-FR-PL-LAB-04.01-01
export const OFFICIAL_67_LAB_TOOLS: OfficialToolItem[] = [
  { no: 1, id: 'xrf-1', name: 'EPSILON3 C (DY728)', assetNumber: '00/XR-MT-003', hasFilter: true, defaultNotes: 'SPINNER OFF' },
  { no: 2, id: 'xrf-2', name: 'EPSILON4 E (DY5584)', assetNumber: '23/XRF-PAN/004', hasFilter: true },
  { no: 3, id: 'xrf-3', name: 'EPSILON4 F (DY5793)', assetNumber: '25/XRF-PAN/001', hasFilter: true },
  { no: 4, id: 'xrf-4', name: 'EPSILON4 G (DY5781)', assetNumber: '25/XRF-PAN/002', hasFilter: true },
  { no: 5, id: 'xrf-5', name: 'EPSILON4 H (DY5566)', assetNumber: '26/XRF-PAN/001', hasFilter: true },
  { no: 6, id: 'xrf-6', name: 'ZETIUM A (DY3521)', assetNumber: '22/WDXRF-PAN/002', hasFilter: true },
  { no: 7, id: 'xrf-7', name: 'ZETIUM B (DY5420)', assetNumber: '22/WDXRF-PAN/001', hasFilter: true },
  { no: 8, id: 'xrf-8', name: 'S2 PUMA (S2P-278317)', assetNumber: '26/ER-BK/001', hasFilter: true },
  { no: 9, id: 'xrf-9', name: 'COMPRESSOR JUN AIR (ZETIUM A)', assetNumber: '22/XRF-PAN/002', hasFilter: true },
  { no: 10, id: 'xrf-10', name: 'COMPRESSOR JUN AIR (ZETIUM B)', assetNumber: '22/WDXRF-PAN/001', hasFilter: true },
  { no: 11, id: 'xrf-11', name: 'VACUUM KNF(S2 PUMA)', assetNumber: '26/ER-BK/001', hasFilter: true },
  { no: 12, id: 'xrf-12', name: 'AIR PURIFIER', assetNumber: '24/APU-GRE/001', hasFilter: true },
  { no: 13, id: 'fus-1', name: 'MODUTEMP 1', assetNumber: '22/MTP-XRF/001', hasFilter: false },
  { no: 14, id: 'fus-2', name: 'MODUTEMP 2', assetNumber: '24/MTP-XRF/002', hasFilter: false },
  { no: 15, id: 'fus-3', name: 'LARGE FURNACE 1', assetNumber: '23/MF-THS/001', hasFilter: false },
  { no: 16, id: 'fus-4', name: 'LARGE FURNACE 2', assetNumber: '23/MF-THS/002', hasFilter: false },
  { no: 17, id: 'fus-5', name: 'LARGE FURNACE 3', assetNumber: '24/MF-THS/003', hasFilter: false },
  { no: 18, id: 'fus-6', name: 'LARGE FURNACE 4', assetNumber: '26/MF-THS/001', hasFilter: false, defaultNotes: 'SPARE' },
  { no: 19, id: 'fus-7', name: 'OVEN MILLENIUM 1', assetNumber: '00/OV-MN/011', hasFilter: false },
  { no: 20, id: 'fus-8', name: 'OVEN MEMMERT 3', assetNumber: '00/OV-MM/016', hasFilter: false, defaultNotes: 'BREAKDOWN' },
  { no: 21, id: 'fus-9', name: 'OVEN MEMMERT 4', assetNumber: '00/OV-MM/017', hasFilter: false, defaultNotes: 'TUAS BLOWER LEPAS' },
  { no: 22, id: 'fus-x', name: 'OVEN MEMMERT 3', assetNumber: 'LI06', hasFilter: false, defaultNotes: 'SCRAP' },
  { no: 23, id: 'fus-10', name: 'OVEN MEMMERT 5 (UN750)', assetNumber: '23/OV-EV/002', hasFilter: false },
  { no: 24, id: 'fus-11', name: 'OVEN MEMMERT 6', assetNumber: '24/OV-ME/007', hasFilter: false },
  { no: 25, id: 'fus-12', name: 'OVEN MEMMERT 7', assetNumber: '25-/OV-ME/001', hasFilter: false },
  { no: 26, id: 'fus-13', name: 'OVEN MEMMERT 8', assetNumber: '26-/OV-ME/003', hasFilter: false },
  { no: 27, id: 'prs-1', name: 'MESIN PRESS 1', assetNumber: '00/MP-SP/001', hasFilter: false, defaultNotes: 'BREAKDOWN' },
  { no: 28, id: 'prs-2', name: 'MESIN PRESS 2', assetNumber: '-', hasFilter: false },
  { no: 29, id: 'prs-3', name: 'MESIN PRESS 3', assetNumber: '-', hasFilter: false },
  { no: 30, id: 'prs-4', name: 'MESIN PRESS 4', assetNumber: '-', hasFilter: false, defaultNotes: 'SPARE' },
  { no: 31, id: 'prs-5', name: 'MESIN PRESS 5', assetNumber: '-', hasFilter: false, defaultNotes: 'SPARE' },
  { no: 32, id: 'prs-6', name: 'MESIN PRESS 7', assetNumber: '-', hasFilter: false },
  { no: 33, id: 'prs-7', name: 'MESIN PRESS 8', assetNumber: '-', hasFilter: false },
  { no: 34, id: 'tmb-1', name: 'TIMBANGAN ANALITIK 1', assetNumber: '-', hasFilter: false, defaultNotes: 'STAND BY ( GUDANG LABORATORIUM)' },
  { no: 35, id: 'tmb-2', name: 'TIMBANGAN ANALITIK 2', assetNumber: '-', hasFilter: false },
  { no: 36, id: 'tmb-3', name: 'TIMBANGAN ANALITIK 3', assetNumber: '-', hasFilter: false },
  { no: 37, id: 'tmb-4', name: 'TIMBANGAN ANALITIK 4', assetNumber: '24/TAK/OH/005', hasFilter: false },
  { no: 38, id: 'tmb-5', name: 'TIMBANGAN ANALITIK 5', assetNumber: '-', hasFilter: false },
  { no: 39, id: 'tmb-6', name: 'LAB- TIMBANGAN DIGITAL 1', assetNumber: '-', hasFilter: false, defaultNotes: 'STAND BY ( GUDANG LABORATORIUM)' },
  { no: 40, id: 'tmb-7', name: 'LAB- TIMBANGAN DIGITAL 2', assetNumber: '-', hasFilter: false },
  { no: 41, id: 'prs-8', name: 'LAB- TIMBANGAN DIGITAL 3 KERN', assetNumber: '24/TD-KN/014', hasFilter: false },
  { no: 42, id: 'chl-1', name: 'CHILLER A', assetNumber: '19/CH-HY/001', hasFilter: true },
  { no: 43, id: 'chl-2', name: 'CHILLER B', assetNumber: '24/WDXRF-PAN/001', hasFilter: true },
  { no: 44, id: 'ups-1', name: 'UPS 1  -  CHILLER A', assetNumber: '19/UP-ME/020', hasFilter: false },
  { no: 45, id: 'ups-2', name: 'UPS 2  -  ZETIUM A', assetNumber: '19/UP-ME/019', hasFilter: false },
  { no: 46, id: 'ups-3', name: 'UPS 3  -  MODUTEMP 1', assetNumber: '22/MTP-XRF/001', hasFilter: false },
  { no: 47, id: 'ups-4', name: 'UPS 4  -  JUN AIR & BLOWER', assetNumber: '22/UP-ME/057', hasFilter: false },
  { no: 48, id: 'ups-5', name: 'UPS 5  -  MODUTEMP 2', assetNumber: '24/UP-ME/014', hasFilter: false },
  { no: 49, id: 'ups-6', name: 'UPS 6-CHILLER B', assetNumber: '24/WDXRF-PAN/001', hasFilter: false },
  { no: 50, id: 'ups-7', name: 'UPS 7-ZETIUM B', assetNumber: '24/WDXRF-PAN/001', hasFilter: false },
  { no: 51, id: 'ups-8', name: 'UPS 8-EPSILON F', assetNumber: '25/XRF-PAN/001', hasFilter: false },
  { no: 52, id: 'ups-9', name: 'UPS 9-EPSILON G', assetNumber: '25/XRF-PAN/002', hasFilter: false },
  { no: 53, id: 'ups-10', name: 'UPS 10-R.Manajer,Timbang,WIFI', assetNumber: '00/UP-AP/012', hasFilter: false },
  { no: 54, id: 'ups-11', name: 'UPS 11  -  ADMIN+QAIC', assetNumber: '19/UP-AP/018', hasFilter: false },
  { no: 55, id: 'ups-12', name: 'UPS 12 - EPSILON4 E', assetNumber: '23/XRF-PAN/004', hasFilter: false },
  { no: 56, id: 'ups-13', name: 'UPS 15- PC ZETIUM A,B,EPSILON A', assetNumber: '22/UP-AP/056', hasFilter: false },
  { no: 57, id: 'ups-14', name: 'UPS 17', assetNumber: '19/UP-AP/017', hasFilter: false },
  { no: 58, id: 'ups-15', name: 'UPS 18-EPSILON 4D& EPSILON 3C', assetNumber: '23/XRF-PAN/003', hasFilter: false },
  { no: 59, id: 'ups-16', name: 'UPS 19- OFFICE LAB', assetNumber: '24/UP-EM/049', hasFilter: false },
  { no: 60, id: 'ups-17', name: 'UPS ALTEC - S2 PUMA', assetNumber: '26/ER-BK/001', hasFilter: false },
  { no: 61, id: 'fus-14', name: 'ELMASONIC CLEANER', assetNumber: '-', hasFilter: false },
  { no: 62, id: 'fus-15', name: 'PLATINUM POLISHING', assetNumber: '20/PPK-XRF/001', hasFilter: false },
  { no: 63, id: 'chl-3', name: 'REGULATOR ARGON ZETIUM A', assetNumber: '-', hasFilter: false },
  { no: 64, id: 'chl-4', name: 'REGULATOR ARGON ZETIUM B', assetNumber: '-', hasFilter: false },
  { no: 65, id: 'chl-5', name: 'REGULATOR HELIUM EPS C', assetNumber: '-', hasFilter: false },
  { no: 66, id: 'fus-16', name: 'FUMEHOOD', assetNumber: '23/LA-ELA/001', hasFilter: true },
  { no: 67, id: 'scrb-1', name: 'SCRUBBER', assetNumber: '-', hasFilter: true },
];

// Helper: Format cell as a neat solid black checkmark if Bersih/Normal matching Excel
function formatCheckmark(val?: string): string {
  if (!val || val === 'N/A' || val === '-') {
    return '<span style="color: #000000; font-size: 8px;">-</span>';
  }
  const lower = val.toLowerCase().trim();
  if (lower === 'bersih' || lower === 'normal' || lower === 'ok' || lower === 'baik') {
    return '<span style="color: #000000; font-weight: bold; font-size: 9.5px; font-family: Arial, sans-serif; line-height: 1; display: inline-block;">✓</span>';
  }
  if (lower === 'kotor') {
    return '<span style="color: #000000; font-weight: bold; font-size: 8px;">KOTOR</span>';
  }
  if (lower === 'abnormal') {
    return '<span style="color: #000000; font-weight: bold; font-size: 8px;">ABNORMAL</span>';
  }
  if (lower === 'breakdown') {
    return '<span style="color: #000000; font-weight: bold; font-size: 8px;">BREAKDOWN</span>';
  }
  if (lower === 'standby' || lower === 'stand by') {
    return '<span style="color: #000000; font-weight: bold; font-size: 8px;">STANDBY</span>';
  }
  if (lower === 'spare') {
    return '<span style="color: #000000; font-weight: bold; font-size: 8px;">SPARE</span>';
  }
  if (lower === 'scrap') {
    return '<span style="color: #000000; font-weight: bold; font-size: 8px;">SCRAP</span>';
  }
  return `<span style="color: #000000; font-size: 8px;">${val}</span>`;
}

function renderToolRow(tool: OfficialToolItem, toolStatuses: Record<string, P2HToolRecordStatus>): string {
  const s = toolStatuses[tool.id] || {
    bodyDalam: 'Bersih',
    bodyLuar: 'Bersih',
    filter: tool.hasFilter ? 'Bersih' : 'N/A',
    kondisi: 'Normal',
    elektrikal: 'Normal',
    keterangan: tool.defaultNotes || ''
  };

  let notesText = s.keterangan || tool.defaultNotes || '';
  if (tool.id === 'chl-1' || tool.id === 'chl-2') {
    const temp = s.chillerTemp || '20';
    const lvl = s.chillerWaterLevel || 'Normal';
    notesText = `SUHU : ${temp} OC | LEVEL AIR : ${lvl.toUpperCase()}`;
  }

  const isBreakdown = s.kondisi === 'Breakdown';
  const isSpare = (notesText || tool.defaultNotes || '').toUpperCase().includes('SPARE') || s.kondisi === 'Spare';

  const dashSpan = '<span style="color: #000000; font-size: 8px;">-</span>';
  const bDalam = isSpare ? dashSpan : formatCheckmark(s.bodyDalam);
  const bLuar = isSpare ? dashSpan : formatCheckmark(s.bodyLuar);
  const filter = isSpare ? dashSpan : (tool.hasFilter ? formatCheckmark(s.filter) : dashSpan);
  const kondisi = isSpare ? dashSpan : formatCheckmark(s.kondisi);
  const elek = isSpare ? dashSpan : formatCheckmark(s.elektrikal);
  if (isSpare && !notesText) notesText = 'SPARE';

  return `
    <tr style="height: 14.8px; font-size: 8px; line-height: 1.15; color: #000000; ${isBreakdown ? 'background-color: #fef2f2;' : ''}">
      <td style="border: 1px solid #000000; text-align: center; font-weight: bold; padding: 1px 2px;">${tool.no}</td>
      <td style="border: 1px solid #000000; text-align: left; padding: 1px 4px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${tool.name}</td>
      <td style="border: 1px solid #000000; text-align: center; padding: 1px 2px; white-space: nowrap; overflow: hidden;">${tool.assetNumber}</td>
      <td style="border: 1px solid #000000; text-align: center; padding: 1px 2px;">${bDalam}</td>
      <td style="border: 1px solid #000000; text-align: center; padding: 1px 2px;">${bLuar}</td>
      <td style="border: 1px solid #000000; text-align: center; padding: 1px 2px;">${filter}</td>
      <td style="border: 1px solid #000000; text-align: center; padding: 1px 2px;">${kondisi}</td>
      <td style="border: 1px solid #000000; text-align: center; padding: 1px 2px;">${elek}</td>
      <td style="border: 1px solid #000000; text-align: left; padding: 1px 4px; font-size: 7.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; ${isBreakdown ? 'font-weight: bold;' : ''}">${notesText || '-'}</td>
    </tr>
  `;
}

export async function exportP2HLaboratoryPdf(params: ExportP2HLaboratoryPdfParams): Promise<void> {
  const {
    inspectorName,
    inspectionDate,
    shift,
    toolStatuses,
    logisticsCounts,
    gasInventory,
    calibrationWeightsCounts,
    supervisorName,
    signatureUrl,
    spvSignatureUrl,
    sptSignatureUrl,
    managerSignatureUrl,
    spvNotes,
    sptNotes,
    managerNotes,
    notes,
  } = params;

  const dateObj = new Date(inspectionDate || Date.now());
  const dayName = dateObj.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();
  const dateFormatted = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();

  // Convert all signatures to pure black (#000000) for clean official document print
  const [
    blackSignatureUrl,
    blackSpvSignatureUrl,
    blackSptSignatureUrl,
    blackManagerSignatureUrl
  ] = await Promise.all([
    ensureSignatureIsBlack(signatureUrl),
    ensureSignatureIsBlack(spvSignatureUrl),
    ensureSignatureIsBlack(sptSignatureUrl),
    ensureSignatureIsBlack(managerSignatureUrl),
  ]);

  // Create an off-screen render container attached to DOM
  // Width 960px, Height 1498px corresponds exactly to printable F4 (205 mm x 320 mm)
  const container = document.createElement('div');
  container.id = 'p2h-lab-pdf-container';
  container.style.position = 'absolute';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '960px';
  container.style.zIndex = '-9999';
  container.style.opacity = '0';
  container.style.pointerEvents = 'none';
  container.style.overflow = 'visible';

  const pageDiv = document.createElement('div');
  pageDiv.id = 'p2h-lab-single-page';
  pageDiv.style.width = '960px';
  pageDiv.style.height = '1498px';
  pageDiv.style.boxSizing = 'border-box';
  pageDiv.style.backgroundColor = '#ffffff';
  pageDiv.style.fontFamily = 'Arial, sans-serif';
  pageDiv.style.color = '#000000';
  pageDiv.style.padding = '0';
  pageDiv.style.display = 'flex';
  pageDiv.style.flexDirection = 'column';
  pageDiv.style.justifyContent = 'space-between';

  pageDiv.innerHTML = generateSinglePageF4Html({
    inspectorName,
    dayName,
    dateFormatted,
    shift: shift || 'SHIFT SIANG',
    tools: OFFICIAL_67_LAB_TOOLS,
    toolStatuses,
    logisticsCounts,
    gasInventory,
    calibrationWeightsCounts,
    supervisorName: supervisorName || 'Laboratorium Supervisor',
    signatureUrl: blackSignatureUrl,
    spvSignatureUrl: blackSpvSignatureUrl,
    sptSignatureUrl: blackSptSignatureUrl,
    managerSignatureUrl: blackManagerSignatureUrl,
    spvNotes,
    sptNotes,
    managerNotes,
    notes,
  });

  container.appendChild(pageDiv);
  document.body.appendChild(container);

  try {
    // Wait for fonts & DOM layout to fully settle
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    await new Promise(r => setTimeout(r, 120));

    let imgData = '';
    // Prefer html-to-image (SVG ForeignObject) for native browser font and border rendering
    try {
      const { toPng } = await import('html-to-image');
      imgData = await toPng(pageDiv, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: false,
        skipFonts: false,
      });
    } catch (renderErr) {
      console.warn('html-to-image failed, falling back to html2canvas:', renderErr);
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(pageDiv, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 960,
      });
      imgData = canvas.toDataURL('image/png');
    }

    const { jsPDF } = await import('jspdf');

    // Format kertas F4 / Folio standar Indonesia (215 mm x 330 mm)
    // Margin disetiap sisi tepat 0.5 cm (5 mm):
    // Left: 5 mm, Top: 5 mm, Width: 205 mm, Height: 320 mm
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [215, 330]
    });

    pdf.addImage(imgData, 'PNG', 5, 5, 205, 320, undefined, 'FAST');

    pdf.setProperties({
      title: `P2H Laboratorium TBP-FR-PL-LAB-04.01-01 (1 Halaman F4) - ${dateFormatted}`,
      subject: 'Cek List P2H Peralatan Laboratorium Harita Nickel PT Trimegah Bangun Persada (1 Halaman F4)',
      author: inspectorName,
      creator: 'PrepLab Portal'
    });

    const safeDate = dateFormatted.replace(/[\s/]/g, '_');
    pdf.save(`P2H_Laboratorium_TBP-FR-PL-LAB-04.01-01_${safeDate}_F4.pdf`);
  } finally {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

// ================= SINGLE-PAGE F4 HTML =================
function generateSinglePageF4Html(data: {
  inspectorName: string;
  dayName: string;
  dateFormatted: string;
  shift: string;
  tools: OfficialToolItem[];
  toolStatuses: Record<string, P2HToolRecordStatus>;
  logisticsCounts: Record<string, string | number>;
  gasInventory: P2HGasInventory;
  calibrationWeightsCounts: Record<string, string | number>;
  supervisorName: string;
  signatureUrl?: string | null;
  spvSignatureUrl?: string | null;
  sptSignatureUrl?: string | null;
  managerSignatureUrl?: string | null;
  spvNotes?: string;
  sptNotes?: string;
  managerNotes?: string;
  notes?: string;
}): string {
  const {
    inspectorName,
    dayName,
    dateFormatted,
    shift,
    tools,
    toolStatuses,
    logisticsCounts,
    gasInventory,
    calibrationWeightsCounts,
    supervisorName,
    signatureUrl,
    spvSignatureUrl,
    sptSignatureUrl,
    managerSignatureUrl,
    spvNotes,
    sptNotes,
    managerNotes,
    notes,
  } = data;

  const toolRows = tools.map(t => renderToolRow(t, toolStatuses)).join('');

// Helper: Format consumable count. If empty, "-", 0, or "Lengkap", return "" (kosong)
function formatConsumableCount(val?: string | number): string {
  if (val === undefined || val === null) return '';
  const s = String(val).trim();
  if (s === '' || s === '-' || s === '0' || s.toLowerCase() === 'lengkap' || s.toLowerCase() === 'kosong') {
    return '';
  }
  return s;
}

// Helper: Format batu timbang value. Never output checkmark ✓! If empty, 0, or "Lengkap", return "" (kosong)
function formatBatuTimbangValue(val?: string | number): string {
  if (val === undefined || val === null) return '';
  const s = String(val).trim();
  if (s === '' || s === '-' || s === '0' || s.toLowerCase() === 'lengkap' || s.toLowerCase() === 'kosong' || s === '✓' || s === '✔') {
    return '';
  }
  return s;
}

  // Consumables items (Col 1 & Col 2) matching Excel
  const leftConsumables = [
    { name: 'EVACUABLE DISH', count: formatConsumableCount(logisticsCounts['log-1']), unit: 'SET' },
    { name: 'BEAKER GLASS', count: formatConsumableCount(logisticsCounts['log-2']), unit: 'PCS' },
    { name: 'TRAY SAMPEL', count: formatConsumableCount(logisticsCounts['log-3']), unit: 'PCS' },
    { name: 'BULP', count: formatConsumableCount(logisticsCounts['log-4']), unit: 'PCS' },
    { name: 'DESIKATOR', count: formatConsumableCount(logisticsCounts['log-5']), unit: 'SET' },
    { name: 'PORCELAIN CRUCIBLE 20 ML', count: formatConsumableCount(logisticsCounts['log-6']), unit: 'PCS' },
    { name: 'PORCELAIN CRUCIBLE 30 ML', count: formatConsumableCount(logisticsCounts['log-7']), unit: 'PCS' },
    { name: 'DIGITAL TIMER', count: formatConsumableCount(logisticsCounts['log-15']), unit: 'PCS' },
    { name: 'DESIKATOR KABINET', count: formatConsumableCount(logisticsCounts['log-16']), unit: 'PCS' },
    { name: 'PENGAIT TRAY LOI', count: formatConsumableCount(logisticsCounts['log-17']), unit: 'PCS' },
  ];

  const middleConsumables = [
    { name: 'PINSET KECIL', count: formatConsumableCount(logisticsCounts['log-8']), unit: 'PCS' },
    { name: 'PINSET BESAR', count: formatConsumableCount(logisticsCounts['log-9']), unit: 'PCS' },
    { name: 'GEGEP BESAR', count: formatConsumableCount(logisticsCounts['log-10']), unit: 'PCS' },
    { name: 'GEGEP SEDANG', count: formatConsumableCount(logisticsCounts['log-11']), unit: 'PCS' },
    { name: 'GEGEP KECIL', count: formatConsumableCount(logisticsCounts['log-12']), unit: 'PCS' },
    { name: 'SARUNG TANGAN CASTONG', count: formatConsumableCount(logisticsCounts['log-13']), unit: 'PCS' },
    { name: 'FACESHIELD', count: formatConsumableCount(logisticsCounts['log-14']), unit: 'PCS' },
  ];

  const consumablesHtml = leftConsumables.map((item, idx) => {
    const mid = middleConsumables[idx] || null;
    return `
      <tr style="height: 12.5px; font-size: 7.5px; line-height: 1.15; color: #000000;">
        <td style="border: 1px solid #000000; padding: 1px 3px; font-weight: bold; text-align: left; white-space: nowrap;">${item.name}</td>
        <td style="border: 1px solid #000000; padding: 1px 2px; text-align: center; font-weight: bold; width: 28px;">${item.count}</td>
        <td style="border: 1px solid #000000; padding: 1px 2px; text-align: center; width: 26px;">${item.unit}</td>
        <td style="border: none; width: 5px;"></td>
        ${mid ? `
          <td style="border: 1px solid #000000; padding: 1px 3px; font-weight: bold; text-align: left; white-space: nowrap;">${mid.name}</td>
          <td style="border: 1px solid #000000; padding: 1px 2px; text-align: center; font-weight: bold; width: 28px;">${mid.count}</td>
          <td style="border: 1px solid #000000; padding: 1px 2px; text-align: center; width: 26px;">${mid.unit}</td>
        ` : `
          <td style="border: 1px solid #000000; padding: 1px 2px;" colspan="3"></td>
        `}
      </tr>
    `;
  }).join('');

  return `
    <div style="width: 960px; height: 1498px; box-sizing: border-box; font-family: Arial, sans-serif; color: #000000; display: flex; flex-direction: column; justify-content: space-between;">
      
      <!-- TOP SECTION: HEADER + SUBHEADER + MAIN TABLE -->
      <div>
        <!-- 1. OFFICIAL HEADER BLOCK -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; margin-bottom: 3px;">
          <tr>
            <!-- LOGO CELL -->
            <td style="width: 160px; border-right: 1px solid #000000; padding: 4px 8px; text-align: center; vertical-align: middle;">
              <img src="${TBP_HEADER_LOGO_BASE64}" alt="Harita Nickel PT TBP" style="max-width: 145px; max-height: 42px; object-fit: contain; display: block; margin: 0 auto;" />
            </td>

            <!-- TITLE CELL -->
            <td style="width: 560px; border-right: 1px solid #000000; text-align: center; vertical-align: middle; padding: 4px 8px;">
              <div style="font-family: Arial, sans-serif; font-size: 10px; font-style: italic; font-weight: bold; letter-spacing: 0.5px; margin-bottom: 2px;">
                FORMULIR / FORM
              </div>
              <div style="font-size: 14px; font-weight: bold; letter-spacing: 0.3px; color: #000000;">
                CEK LIST P2H PERALATAN LABORATORIUM
              </div>
            </td>

            <!-- METADATA BOX CELL -->
            <td style="width: 240px; vertical-align: middle; padding: 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 8px; line-height: 1.2;">
                <tr>
                  <td style="padding: 2px 5px; font-weight: bold; width: 95px; border-right: 1px solid #000000; border-bottom: 1px solid #000000; background-color: #f2f2f2;">No. Dokumen</td>
                  <td style="padding: 2px 5px; font-weight: bold; border-bottom: 1px solid #000000;">TBP-FR-PL-LAB-04.01-01</td>
                </tr>
                <tr>
                  <td style="padding: 2px 5px; font-weight: bold; border-right: 1px solid #000000; border-bottom: 1px solid #000000; background-color: #f2f2f2;">Tanggal Efektif</td>
                  <td style="padding: 2px 5px; border-bottom: 1px solid #000000;">12 Desember 2022</td>
                </tr>
                <tr>
                  <td style="padding: 2px 5px; font-weight: bold; border-right: 1px solid #000000; border-bottom: 1px solid #000000; background-color: #f2f2f2;">Revisi</td>
                  <td style="padding: 2px 5px; border-bottom: 1px solid #000000;">0.0</td>
                </tr>
                <tr>
                  <td style="padding: 2px 5px; font-weight: bold; border-right: 1px solid #000000; background-color: #f2f2f2;">Halaman</td>
                  <td style="padding: 2px 5px; font-weight: bold; color: #000000;">1 dari 1</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- 2. INSPECTION METADATA ROW -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px; font-size: 8px; line-height: 1.2; border: 1px solid #000000; background-color: #ffffff;">
          <tr>
            <td style="width: 105px; font-weight: bold; padding: 2px 5px; border-right: 1px solid #000000; background-color: #f2f2f2;">HARI / TANGGAL</td>
            <td style="width: 300px; padding: 2px 5px; font-weight: bold; border-right: 1px solid #000000;">: ${dayName} / ${dateFormatted}</td>
            <td style="width: 50px; font-weight: bold; padding: 2px 5px; border-right: 1px solid #000000; background-color: #f2f2f2;">SHIFT</td>
            <td style="width: 125px; padding: 2px 5px; font-weight: bold; border-right: 1px solid #000000;">: ${shift.toUpperCase()}</td>
            <td style="width: 90px; font-weight: bold; padding: 2px 5px; border-right: 1px solid #000000; background-color: #f2f2f2;">PELAKSANA</td>
            <td style="width: 290px; padding: 2px 5px; font-weight: bold;">: ${inspectorName}</td>
          </tr>
        </table>

        <!-- 3. ALL 67 TOOLS MASTER TABLE -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; table-layout: fixed; margin-bottom: 3px;">
          <thead>
            <tr style="background-color: #f2f2f2; font-size: 8px; font-weight: bold; text-align: center; height: 18px; color: #000000;">
              <th rowspan="2" style="border: 1px solid #000000; width: 30px; padding: 2px;">NO</th>
              <th rowspan="2" style="border: 1px solid #000000; width: 215px; text-align: left; padding: 2px 4px;">NAMA ALAT</th>
              <th rowspan="2" style="border: 1px solid #000000; width: 120px; padding: 2px;">NO. ASSET</th>
              <th colspan="5" style="border: 1px solid #000000; padding: 2px;">KRITERIA PEMERIKSAAN</th>
              <th rowspan="2" style="border: 1px solid #000000; width: 285px; text-align: left; padding: 2px 4px;">KETERANGAN</th>
            </tr>
            <tr style="background-color: #f2f2f2; font-size: 7.5px; font-weight: bold; text-align: center; height: 16px; color: #000000;">
              <th style="border: 1px solid #000000; width: 58px; padding: 2px;">BODY DALAM</th>
              <th style="border: 1px solid #000000; width: 58px; padding: 2px;">BODY LUAR</th>
              <th style="border: 1px solid #000000; width: 50px; padding: 2px;">FILTER</th>
              <th style="border: 1px solid #000000; width: 72px; padding: 2px;">KONDISI ALAT</th>
              <th style="border: 1px solid #000000; width: 72px; padding: 2px;">ELEKTRIKAL</th>
            </tr>
          </thead>
          <tbody>
            <!-- Standard normal reference row matching Excel Row 23 -->
            <tr style="background-color: #ffffff; font-size: 7.5px; font-weight: bold; text-align: center; height: 13px; color: #000000;">
              <td style="border: 1px solid #000000;"></td>
              <td style="border: 1px solid #000000; font-size: 7.5px; font-style: italic; text-align: left; padding-left: 4px;">Standar Kondisi Normal</td>
              <td style="border: 1px solid #000000;"></td>
              <td style="border: 1px solid #000000;">✓ BERSIH</td>
              <td style="border: 1px solid #000000;">✓ BERSIH</td>
              <td style="border: 1px solid #000000;">✓ BERSIH</td>
              <td style="border: 1px solid #000000;">✓ NORMAL</td>
              <td style="border: 1px solid #000000;">✓ NORMAL</td>
              <td style="border: 1px solid #000000;"></td>
            </tr>
            ${toolRows}
          </tbody>
        </table>
      </div>

      <!-- BOTTOM SECTION: SUMMARY + SIGNATURES + FOOTER -->
      <div>
        <!-- SUMMARY SECTION: LOGISTICS, BATU TIMBANG, GAS, NOTES -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
          <tr style="vertical-align: top;">
            
            <!-- CONSUMABLES & BATU TIMBANG (LEFT 510px) -->
            <td style="width: 510px; padding-right: 6px;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
                <thead>
                  <tr style="background-color: #f2f2f2; height: 14px; font-size: 8px; font-weight: bold; color: #000000;">
                    <th colspan="7" style="border: 1px solid #000000; padding: 2px; text-align: center;">JUMLAH ALAT &amp; BAHAN HABIS PAKAI</th>
                  </tr>
                </thead>
                <tbody>
                  ${consumablesHtml}
                </tbody>
              </table>

              <!-- BATU TIMBANG (STANDAR KALIBRASI) -->
              <table style="width: 100%; border-collapse: collapse; font-size: 7.5px; text-align: center;">
                <tr style="background-color: #f2f2f2; font-weight: bold; height: 13px; color: #000000;">
                  <td colspan="9" style="border: 1px solid #000000; padding: 1px;">BATU TIMBANG (STANDAR KALIBRASI)</td>
                </tr>
                <tr style="background-color: #fafafa; font-weight: bold; height: 12px; color: #000000;">
                  <td style="border: 1px solid #000000; padding: 1px; width: 11.1%;">0,5 g</td>
                  <td style="border: 1px solid #000000; padding: 1px; width: 11.1%;">1 g</td>
                  <td style="border: 1px solid #000000; padding: 1px; width: 11.1%;">2 g</td>
                  <td style="border: 1px solid #000000; padding: 1px; width: 11.1%;">5 g</td>
                  <td style="border: 1px solid #000000; padding: 1px; width: 11.1%;">10 g</td>
                  <td style="border: 1px solid #000000; padding: 1px; width: 11.1%;">20 g</td>
                  <td style="border: 1px solid #000000; padding: 1px; width: 11.1%;">50 g</td>
                  <td style="border: 1px solid #000000; padding: 1px; width: 11.1%;">100 g</td>
                  <td style="border: 1px solid #000000; padding: 1px; width: 11.1%;">200 g</td>
                </tr>
                <tr style="font-weight: bold; height: 13px; color: #000000; text-align: center;">
                  <td style="border: 1px solid #000000; padding: 1px; font-size: 8px;">${formatBatuTimbangValue(calibrationWeightsCounts['0,5 gram'])}</td>
                  <td style="border: 1px solid #000000; padding: 1px; font-size: 8px;">${formatBatuTimbangValue(calibrationWeightsCounts['1 gram'])}</td>
                  <td style="border: 1px solid #000000; padding: 1px; font-size: 8px;">${formatBatuTimbangValue(calibrationWeightsCounts['2 gram'])}</td>
                  <td style="border: 1px solid #000000; padding: 1px; font-size: 8px;">${formatBatuTimbangValue(calibrationWeightsCounts['5 gram'])}</td>
                  <td style="border: 1px solid #000000; padding: 1px; font-size: 8px;">${formatBatuTimbangValue(calibrationWeightsCounts['10 gram'])}</td>
                  <td style="border: 1px solid #000000; padding: 1px; font-size: 8px;">${formatBatuTimbangValue(calibrationWeightsCounts['20 gram'])}</td>
                  <td style="border: 1px solid #000000; padding: 1px; font-size: 8px;">${formatBatuTimbangValue(calibrationWeightsCounts['50 gram'])}</td>
                  <td style="border: 1px solid #000000; padding: 1px; font-size: 8px;">${formatBatuTimbangValue(calibrationWeightsCounts['100 gram'])}</td>
                  <td style="border: 1px solid #000000; padding: 1px; font-size: 8px;">${formatBatuTimbangValue(calibrationWeightsCounts['200 gram'])}</td>
                </tr>
              </table>
            </td>

            <!-- GAS INVENTORY & NOTES (RIGHT 440px) -->
            <td style="width: 440px; vertical-align: top;">
              <!-- GAS TABLE -->
              <table style="width: 100%; border-collapse: collapse; font-size: 7.5px; text-align: center; margin-bottom: 3px;">
                <thead>
                  <tr style="background-color: #f2f2f2; font-weight: bold; color: #000000; height: 14px;">
                    <th rowspan="2" style="border: 1px solid #000000; padding: 2px; text-align: left; width: 36%;">LOKASI</th>
                    <th colspan="2" style="border: 1px solid #000000; padding: 1px;">HELIUM</th>
                    <th colspan="2" style="border: 1px solid #000000; padding: 1px;">ARGON</th>
                  </tr>
                  <tr style="background-color: #fafafa; font-weight: bold; font-size: 7.2px; color: #000000; height: 13px;">
                    <th style="border: 1px solid #000000; padding: 1px; width: 16%;">ISI</th>
                    <th style="border: 1px solid #000000; padding: 1px; width: 16%;">KOSONG</th>
                    <th style="border: 1px solid #000000; padding: 1px; width: 16%;">ISI</th>
                    <th style="border: 1px solid #000000; padding: 1px; width: 16%;">KOSONG</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="height: 13px; color: #000000;">
                    <td style="border: 1px solid #000000; padding: 1px 5px; text-align: left; font-weight: bold;">LAB KRISHNA</td>
                    <td style="border: 1px solid #000000; padding: 1px; font-weight: bold;">${gasInventory?.helium?.krishna?.isi ?? 0}</td>
                    <td style="border: 1px solid #000000; padding: 1px;">${gasInventory?.helium?.krishna?.kosong ?? 0}</td>
                    <td style="border: 1px solid #000000; padding: 1px; font-weight: bold;">${gasInventory?.argon?.krishna?.isi ?? 0}</td>
                    <td style="border: 1px solid #000000; padding: 1px;">${gasInventory?.argon?.krishna?.kosong ?? 0}</td>
                  </tr>
                  <tr style="height: 13px; color: #000000;">
                    <td style="border: 1px solid #000000; padding: 1px 5px; text-align: left; font-weight: bold;">LOGISTIK</td>
                    <td style="border: 1px solid #000000; padding: 1px; font-weight: bold;">${gasInventory?.helium?.logistik?.isi ?? 0}</td>
                    <td style="border: 1px solid #000000; padding: 1px;">${gasInventory?.helium?.logistik?.kosong ?? 0}</td>
                    <td style="border: 1px solid #000000; padding: 1px; font-weight: bold;">${gasInventory?.argon?.logistik?.isi ?? 0}</td>
                    <td style="border: 1px solid #000000; padding: 1px;">${gasInventory?.argon?.logistik?.kosong ?? 0}</td>
                  </tr>
                </tbody>
              </table>

              <!-- INVENTORY NOTES TABLE -->
              <table style="width: 100%; border-collapse: collapse; font-size: 7.2px; line-height: 1.2; border: 1px solid #000000;">
                <tr style="background-color: #f2f2f2; font-weight: bold; color: #000000;">
                  <td colspan="2" style="border: 1px solid #000000; padding: 2px 5px;">INVENTARIS PENDUKUNG &amp; CATATAN:</td>
                </tr>
                <tr style="color: #000000;">
                  <td style="width: 55%; padding: 1.5px 5px; border: 1px solid #000000;">• TRAY LOI</td>
                  <td style="padding: 1.5px 5px; font-weight: bold; border: 1px solid #000000;">: ${gasInventory?.trayLoiCount || '-'} PCS</td>
                </tr>
                <tr style="color: #000000;">
                  <td style="padding: 1.5px 5px; border: 1px solid #000000;">• RAK KAYU BEAD &amp; PELLET</td>
                  <td style="padding: 1.5px 5px; font-weight: bold; border: 1px solid #000000;">: ${gasInventory?.rakKayuBeadPellet || '-'} RAK</td>
                </tr>
                <tr style="color: #000000;">
                  <td style="padding: 1.5px 5px; border: 1px solid #000000;">• AQUADEST ISI / KOSONG</td>
                  <td style="padding: 1.5px 5px; font-weight: bold; border: 1px solid #000000;">: ${gasInventory?.aquadestIsi || '0'} ISI / ${gasInventory?.aquadestKosong || '0'} KOSONG</td>
                </tr>
                ${notes ? `
                  <tr style="color: #000000;">
                    <td style="padding: 1.5px 5px; font-weight: bold; border: 1px solid #000000;" colspan="2">• CATATAN PELAKSANA: ${notes}</td>
                  </tr>
                ` : ''}
                ${spvNotes ? `
                  <tr style="color: #000000;">
                    <td style="padding: 1.5px 5px; font-weight: bold; border: 1px solid #000000;" colspan="2">• CATATAN SPV: ${spvNotes}</td>
                  </tr>
                ` : ''}
                ${sptNotes ? `
                  <tr style="color: #000000;">
                    <td style="padding: 1.5px 5px; font-weight: bold; border: 1px solid #000000;" colspan="2">• CATATAN SPT: ${sptNotes}</td>
                  </tr>
                ` : ''}
                ${managerNotes ? `
                  <tr style="color: #000000;">
                    <td style="padding: 1.5px 5px; font-weight: bold; border: 1px solid #000000;" colspan="2">• CATATAN MANAGER: ${managerNotes}</td>
                  </tr>
                ` : ''}
              </table>
            </td>
          </tr>
        </table>

        <!-- 4. OFFICIAL SIGNATURES BLOCK (4 COLUMNS - EXACT MATCH TO EXCEL) -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; text-align: center; margin-bottom: 3px;">
          <tr style="height: 15px; font-size: 8px; font-weight: bold; background-color: #f2f2f2; color: #000000;">
            <td style="width: 25%; border: 1px solid #000000; padding: 2px;">Dilaksanakan oleh,</td>
            <td style="width: 25%; border: 1px solid #000000; padding: 2px;">Diperiksa oleh,</td>
            <td style="width: 25%; border: 1px solid #000000; padding: 2px;">Diketahui oleh,</td>
            <td style="width: 25%; border: 1px solid #000000; padding: 2px;">Diketahui oleh,</td>
          </tr>
          <tr style="height: 42px; vertical-align: middle;">
            <!-- 1. ANALIS / FOREMAN TTD -->
            <td style="border: 1px solid #000000; padding: 2px; text-align: center;">
              ${signatureUrl ? `
                <img src="${signatureUrl}" alt="TTD Foreman" style="max-height: 38px; max-width: 140px; object-fit: contain; display: block; margin: 0 auto; filter: brightness(0);" />
              ` : `
                <div style="font-size: 7.5px; color: #000000; font-style: italic;">[ Tervalidasi Sistem ]</div>
              `}
            </td>
            <!-- 2. SPV LAB TTD SPACE -->
            <td style="border: 1px solid #000000; padding: 2px; text-align: center;">
              ${spvSignatureUrl ? `
                <img src="${spvSignatureUrl}" alt="TTD SPV" style="max-height: 38px; max-width: 140px; object-fit: contain; display: block; margin: 0 auto; filter: brightness(0);" />
              ` : `
                <div style="font-size: 7.5px; color: #000000; font-style: italic;">-</div>
              `}
            </td>
            <!-- 3. SUPERINTENDENT TTD SPACE -->
            <td style="border: 1px solid #000000; padding: 2px; text-align: center;">
              ${sptSignatureUrl ? `
                <img src="${sptSignatureUrl}" alt="TTD SPT" style="max-height: 38px; max-width: 140px; object-fit: contain; display: block; margin: 0 auto; filter: brightness(0);" />
              ` : `
                <div style="font-size: 7.5px; color: #000000; font-style: italic;">-</div>
              `}
            </td>
            <!-- 4. MANAGER TTD SPACE -->
            <td style="border: 1px solid #000000; padding: 2px; text-align: center;">
              ${managerSignatureUrl ? `
                <img src="${managerSignatureUrl}" alt="TTD Manager" style="max-height: 38px; max-width: 140px; object-fit: contain; display: block; margin: 0 auto; filter: brightness(0);" />
              ` : `
                <div style="font-size: 7.5px; color: #000000; font-style: italic;">-</div>
              `}
            </td>
          </tr>
          <tr style="height: 15px; font-size: 8px; font-weight: bold; background-color: #ffffff; color: #000000;">
            <td style="border: 1px solid #000000; padding: 2px;">${inspectorName}</td>
            <td style="border: 1px solid #000000; padding: 2px;">${supervisorName}</td>
            <td style="border: 1px solid #000000; padding: 2px;">Tigwa Anggawikara</td>
            <td style="border: 1px solid #000000; padding: 2px;">Deni Nugraha Perdiana</td>
          </tr>
          <tr style="height: 13px; font-size: 7.2px; color: #000000; background-color: #fafafa;">
            <td style="border: 1px solid #000000; padding: 1.5px;">Laboratorium Foreman</td>
            <td style="border: 1px solid #000000; padding: 1.5px;">Laboratorium Supervisor</td>
            <td style="border: 1px solid #000000; padding: 1.5px;">Laboratorium Superintendent</td>
            <td style="border: 1px solid #000000; padding: 1.5px;">Preparation &amp; Laboratorium Manager</td>
          </tr>
        </table>

        <!-- FOOTER BAR -->
        <div style="display: flex; justify-content: space-between; font-size: 7px; color: #000000; padding-top: 1px; border-top: 0.5px solid #000000;">
          <div>Dokumen Resmi PrepLab Portal • PT Trimegah Bangun Persada Tbk • Format F4 (Folio 215 × 330 mm)</div>
          <div>Halaman 1 dari 1</div>
        </div>
      </div>

    </div>
  `;
}
