export interface P2HLabTool {
  id: string;
  name: string;
  assetNumber: string;
  room: string;
  hasFilter: boolean;
  defaultCondition?: 'Normal' | 'Standby' | 'Breakdown' | 'Spare' | 'Scrap' | '-';
  defaultNotes?: string;
  defaultElectrical?: 'Normal' | 'Abnormal' | 'N/A' | '-';
}

export interface P2HRoomSection {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon identifier
  tools: P2HLabTool[];
  hasChillerParams?: boolean;
}

export const P2H_LAB_ROOMS: P2HRoomSection[] = [
  {
    id: 'ruang-xrf',
    name: 'Ruang XRF',
    description: '12 Peralatan Spektrometri X-Ray Fluoresensi & Pendukung',
    icon: 'Cpu',
    tools: [
      { id: 'xrf-1', name: 'EPSILON3 C (DY728)', assetNumber: '00/XR-MT-003', room: 'Ruang XRF', hasFilter: true, defaultNotes: 'SPINNER OFF' },
      { id: 'xrf-2', name: 'EPSILON4 E (DY5584)', assetNumber: '23/XRF-PAN/004', room: 'Ruang XRF', hasFilter: true },
      { id: 'xrf-3', name: 'EPSILON4 F (DY5793)', assetNumber: '25/XRF-PAN/001', room: 'Ruang XRF', hasFilter: true },
      { id: 'xrf-4', name: 'EPSILON4 G (DY5781)', assetNumber: '25/XRF-PAN/002', room: 'Ruang XRF', hasFilter: true },
      { id: 'xrf-5', name: 'EPSILON4 H (DY5566)', assetNumber: '26/XRF-PAN/001', room: 'Ruang XRF', hasFilter: true },
      { id: 'xrf-6', name: 'ZETIUM A (DY3521)', assetNumber: '22/WDXRF-PAN/002', room: 'Ruang XRF', hasFilter: true },
      { id: 'xrf-7', name: 'ZETIUM B (DY5420)', assetNumber: '22/WDXRF-PAN/001', room: 'Ruang XRF', hasFilter: true },
      { id: 'xrf-8', name: 'S2 PUMA (S2P-278317)', assetNumber: '26/ER-BK/001', room: 'Ruang XRF', hasFilter: true },
      { id: 'xrf-9', name: 'COMPRESSOR JUN AIR (ZETIUM A)', assetNumber: '22/XRF-PAN/002', room: 'Ruang XRF', hasFilter: true },
      { id: 'xrf-10', name: 'COMPRESSOR JUN AIR (ZETIUM B)', assetNumber: '22/WDXRF-PAN/001', room: 'Ruang XRF', hasFilter: true },
      { id: 'xrf-11', name: 'VACUUM KNF (S2 PUMA)', assetNumber: '26/ER-BK/001', room: 'Ruang XRF', hasFilter: true },
      { id: 'xrf-12', name: 'AIR PURIFIER', assetNumber: '24/APU-GRE/001', room: 'Ruang XRF', hasFilter: true },
    ]
  },
  {
    id: 'ruang-fusion',
    name: 'Ruang Fusion',
    description: '16 Tungku Peleburan, Oven Pengering & Preparasi Manik',
    icon: 'Flame',
    tools: [
      { id: 'fus-1', name: 'MODUTEMP 1', assetNumber: '22/MTP-XRF/001', room: 'Ruang Fusion', hasFilter: false },
      { id: 'fus-2', name: 'MODUTEMP 2', assetNumber: '24/MTP-XRF/002', room: 'Ruang Fusion', hasFilter: false },
      { id: 'fus-3', name: 'LARGE FURNACE 1', assetNumber: '23/MF-THS/001', room: 'Ruang Fusion', hasFilter: false },
      { id: 'fus-4', name: 'LARGE FURNACE 2', assetNumber: '23/MF-THS/002', room: 'Ruang Fusion', hasFilter: false },
      { id: 'fus-5', name: 'LARGE FURNACE 3', assetNumber: '24/MF-THS/003', room: 'Ruang Fusion', hasFilter: false },
      { id: 'fus-6', name: 'LARGE FURNACE 4', assetNumber: '26/MF-THS/001', room: 'Ruang Fusion', hasFilter: false, defaultCondition: 'Spare', defaultNotes: 'SPARE' },
      { id: 'fus-7', name: 'OVEN MILLENIUM 1', assetNumber: '00/OV-MN/011', room: 'Ruang Fusion', hasFilter: false },
      { id: 'fus-8', name: 'OVEN MEMMERT 3', assetNumber: '00/OV-MM/016', room: 'Ruang Fusion', hasFilter: false, defaultCondition: 'Breakdown', defaultNotes: 'BREAKDOWN' },
      { id: 'fus-9', name: 'OVEN MEMMERT 4', assetNumber: '00/OV-MM/017', room: 'Ruang Fusion', hasFilter: false, defaultNotes: 'TUAS BLOWER LEPAS' },
      { id: 'fus-10', name: 'OVEN MEMMERT 5 (UN750)', assetNumber: '23/OV-EV/002', room: 'Ruang Fusion', hasFilter: false },
      { id: 'fus-11', name: 'OVEN MEMMERT 6', assetNumber: '24/OV-ME/007', room: 'Ruang Fusion', hasFilter: false },
      { id: 'fus-12', name: 'OVEN MEMMERT 7', assetNumber: '25-/OV-ME/001', room: 'Ruang Fusion', hasFilter: false },
      { id: 'fus-13', name: 'OVEN MEMMERT 8', assetNumber: '26-/OV-ME/003', room: 'Ruang Fusion', hasFilter: false },
      { id: 'fus-14', name: 'ELMASONIC CLEANER', assetNumber: '-', room: 'Ruang Fusion', hasFilter: false },
      { id: 'fus-15', name: 'PLATINUM POLISHING', assetNumber: '20/PPK-XRF/001', room: 'Ruang Fusion', hasFilter: false },
      { id: 'fus-16', name: 'FUMEHOOD', assetNumber: '23/LA-ELA/001', room: 'Ruang Fusion', hasFilter: true },
    ]
  },
  {
    id: 'ruang-press',
    name: 'Ruang Press',
    description: '8 Mesin Press Pellet & Timbangan Digital Kern',
    icon: 'Minimize2',
    tools: [
      { id: 'prs-1', name: 'MESIN PRESS 1', assetNumber: '00/MP-SP/001', room: 'Ruang Press', hasFilter: false, defaultCondition: 'Breakdown', defaultNotes: 'BREAKDOWN' },
      { id: 'prs-2', name: 'MESIN PRESS 2', assetNumber: '-', room: 'Ruang Press', hasFilter: false },
      { id: 'prs-3', name: 'MESIN PRESS 3', assetNumber: '-', room: 'Ruang Press', hasFilter: false },
      { id: 'prs-4', name: 'MESIN PRESS 4', assetNumber: '-', room: 'Ruang Press', hasFilter: false, defaultCondition: 'Spare', defaultNotes: 'SPARE' },
      { id: 'prs-5', name: 'MESIN PRESS 5', assetNumber: '-', room: 'Ruang Press', hasFilter: false, defaultCondition: 'Spare', defaultNotes: 'SPARE' },
      { id: 'prs-6', name: 'MESIN PRESS 7', assetNumber: '-', room: 'Ruang Press', hasFilter: false },
      { id: 'prs-7', name: 'MESIN PRESS 8', assetNumber: '-', room: 'Ruang Press', hasFilter: false },
      { id: 'prs-8', name: 'LAB- TIMBANGAN DIGITAL 3 KERN', assetNumber: '24/TD-KN/014', room: 'Ruang Press', hasFilter: false },
    ]
  },
  {
    id: 'ruang-timbang',
    name: 'Ruang Timbang',
    description: '7 Timbangan Analitik & Timbangan Digital',
    icon: 'Scale',
    tools: [
      { id: 'tmb-1', name: 'TIMBANGAN ANALITIK 1', assetNumber: '-', room: 'Ruang Timbang', hasFilter: false, defaultCondition: 'Standby', defaultNotes: 'STAND BY ( GUDANG LABORATORIUM)' },
      { id: 'tmb-2', name: 'TIMBANGAN ANALITIK 2', assetNumber: '-', room: 'Ruang Timbang', hasFilter: false },
      { id: 'tmb-3', name: 'TIMBANGAN ANALITIK 3', assetNumber: '-', room: 'Ruang Timbang', hasFilter: false },
      { id: 'tmb-4', name: 'TIMBANGAN ANALITIK 4', assetNumber: '24/TAK/OH/005', room: 'Ruang Timbang', hasFilter: false },
      { id: 'tmb-5', name: 'TIMBANGAN ANALITIK 5', assetNumber: '-', room: 'Ruang Timbang', hasFilter: false },
      { id: 'tmb-6', name: 'LAB- TIMBANGAN DIGITAL 1', assetNumber: '-', room: 'Ruang Timbang', hasFilter: false, defaultCondition: 'Standby', defaultNotes: 'STAND BY ( GUDANG LABORATORIUM)' },
      { id: 'tmb-7', name: 'LAB- TIMBANGAN DIGITAL 2', assetNumber: '-', room: 'Ruang Timbang', hasFilter: false },
    ]
  },
  {
    id: 'ruang-chiller',
    name: 'Ruang Chiller',
    description: '5 Unit Pendingin Air Sirkulasi & Regulator Gas',
    icon: 'Snowflake',
    hasChillerParams: true,
    tools: [
      { id: 'chl-1', name: 'CHILLER A', assetNumber: '19/CH-HY/001', room: 'Ruang Chiller', hasFilter: true },
      { id: 'chl-2', name: 'CHILLER B', assetNumber: '24/WDXRF-PAN/001', room: 'Ruang Chiller', hasFilter: true },
      { id: 'chl-3', name: 'REGULATOR ARGON ZETIUM A', assetNumber: '-', room: 'Ruang Chiller', hasFilter: false },
      { id: 'chl-4', name: 'REGULATOR ARGON ZETIUM B', assetNumber: '-', room: 'Ruang Chiller', hasFilter: false },
      { id: 'chl-5', name: 'REGULATOR HELIUM EPS C', assetNumber: '-', room: 'Ruang Chiller', hasFilter: false },
    ]
  },
  {
    id: 'ruang-ups',
    name: 'Ruang UPS',
    description: '17 Unit Uninterruptible Power Supply (UPS) Cadangan Daya',
    icon: 'Zap',
    tools: [
      { id: 'ups-1', name: 'UPS 1 - CHILLER A', assetNumber: '19/UP-ME/020', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-2', name: 'UPS 2 - ZETIUM A', assetNumber: '19/UP-ME/019', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-3', name: 'UPS 3 - MODUTEMP 1', assetNumber: '22/MTP-XRF/001', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-4', name: 'UPS 4 - JUN AIR & BLOWER', assetNumber: '22/UP-ME/057', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-5', name: 'UPS 5 - MODUTEMP 2', assetNumber: '24/UP-ME/014', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-6', name: 'UPS 6 - CHILLER B', assetNumber: '24/WDXRF-PAN/001', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-7', name: 'UPS 7 - ZETIUM B', assetNumber: '24/WDXRF-PAN/001', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-8', name: 'UPS 8 - EPSILON F', assetNumber: '25/XRF-PAN/001', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-9', name: 'UPS 9 - EPSILON G', assetNumber: '25/XRF-PAN/002', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-10', name: 'UPS 10 - R.Manajer, Timbang, WIFI', assetNumber: '00/UP-AP/012', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-11', name: 'UPS 11 - ADMIN+QAIC', assetNumber: '19/UP-AP/018', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-12', name: 'UPS 12 - EPSILON4 E', assetNumber: '23/XRF-PAN/004', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-13', name: 'UPS 15 - PC ZETIUM A,B, EPSILON A', assetNumber: '22/UP-AP/056', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-14', name: 'UPS 17', assetNumber: '19/UP-AP/017', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-15', name: 'UPS 18 - EPSILON 4D & EPSILON 3C', assetNumber: '23/XRF-PAN/003', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-16', name: 'UPS 19 - OFFICE LAB', assetNumber: '24/UP-EM/049', room: 'Ruang UPS', hasFilter: false },
      { id: 'ups-17', name: 'UPS ALTEC - S2 PUMA', assetNumber: '26/ER-BK/001', room: 'Ruang UPS', hasFilter: false },
    ]
  },
  {
    id: 'ruang-scrubber',
    name: 'Ruang Scrubber',
    description: '1 Unit Scrubber Pembuangan Gas Asam',
    icon: 'Wind',
    tools: [
      { id: 'scrb-1', name: 'SCRUBBER', assetNumber: '-', room: 'Ruang Scrubber', hasFilter: true },
    ]
  }
];

export interface P2HGasInventory {
  helium: {
    krishna: { isi: number; kosong: number };
    logistik: { isi: number; kosong: number };
  };
  argon: {
    krishna: { isi: number; kosong: number };
    logistik: { isi: number; kosong: number };
  };
  trayLoiCount: string;
  rakKayuBeadPellet: string;
  aquadestIsi: string;
  aquadestKosong: string;
}

// Logistics & Consumables list from TBP-FR-PL-LAB-04.01-01
export const P2H_LOGISTICS_ITEMS = [
  { id: 'log-1', name: 'EVACUABLE DISH', unit: 'SET' },
  { id: 'log-2', name: 'BEAKER GLASS', unit: 'PCS' },
  { id: 'log-3', name: 'TRAY SAMPEL', unit: 'PCS' },
  { id: 'log-4', name: 'BULP', unit: 'PCS' },
  { id: 'log-5', name: 'DESIKATOR', unit: 'SET' },
  { id: 'log-6', name: 'PORCELAIN CRUCIBLE 20 ML', unit: 'PCS' },
  { id: 'log-7', name: 'PORCELAIN CRUCIBLE 30 ML', unit: 'PCS' },
  { id: 'log-8', name: 'PINSET KECIL', unit: 'PCS' },
  { id: 'log-9', name: 'PINSET BESAR', unit: 'PCS' },
  { id: 'log-10', name: 'GEGEP BESAR', unit: 'PCS' },
  { id: 'log-11', name: 'GEGEP SEDANG', unit: 'PCS' },
  { id: 'log-12', name: 'GEGEP KECIL', unit: 'PCS' },
  { id: 'log-13', name: 'SARUNG TANGAN CASTONG', unit: 'PCS' },
  { id: 'log-14', name: 'FACESHIELD', unit: 'PCS' },
  { id: 'log-15', name: 'DIGITAL TIMER', unit: 'PCS' },
  { id: 'log-16', name: 'DESIKATOR KABINET', unit: 'PCS' },
  { id: 'log-17', name: 'PENGAIT TRAY LOI', unit: 'PCS' },
];

export const CALIBRATION_WEIGHTS = [
  '0,5 gram', '1 gram', '2 gram', '5 gram', '10 gram', '20 gram', '50 gram', '100 gram', '200 gram'
];
