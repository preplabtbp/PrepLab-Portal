import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, FileSpreadsheet, Download, CheckCircle2, 
  AlertTriangle, RefreshCw, FileText, ArrowRight, Check, Eye, Image as ImageIcon
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';

function formatExcelDate(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const num = Number(val);
  if (!isNaN(num) && num > 20000 && num < 70000 && Number.isInteger(num)) {
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }
  return String(val).trim();
}

async function extractImagesFromXlsx(data: ArrayBuffer | Uint8Array): Promise<{
  cellImageMap: Map<string, string>;
  sortedPhotos: string[];
}> {
  const cellImageMap = new Map<string, string>();
  const rawList: { row: number; col: number; dataUrl: string }[] = [];

  try {
    const zip = await JSZip.loadAsync(data);
    const fileNames = Object.keys(zip.files);

    // 1. Drawings
    const drawingFiles = fileNames.filter(f => f.startsWith('xl/drawings/drawing') && f.endsWith('.xml'));
    for (const dFile of drawingFiles) {
      const relsFile = dFile.replace('xl/drawings/', 'xl/drawings/_rels/') + '.rels';
      const relsZip = zip.file(relsFile);
      const drawingZip = zip.file(dFile);
      if (!drawingZip) continue;

      const drawingXml = await drawingZip.async('string');
      const relsXml = relsZip ? await relsZip.async('string') : '';

      const relsMap = new Map<string, string>();
      if (relsXml) {
        const relMatches = relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g);
        for (const match of relMatches) {
          let target = match[2];
          if (target.startsWith('../')) target = 'xl/' + target.replace(/^\.\.\//, '');
          else if (!target.startsWith('xl/')) target = 'xl/drawings/' + target;
          relsMap.set(match[1], target);
        }
      }

      const anchorRegex = /<xdr:(?:twoCellAnchor|oneCellAnchor|absoluteAnchor)[^>]*>([\s\S]*?)<\/xdr:(?:twoCellAnchor|oneCellAnchor|absoluteAnchor)>/g;
      let anchorMatch;
      while ((anchorMatch = anchorRegex.exec(drawingXml)) !== null) {
        const anchorContent = anchorMatch[1];
        const fromBlock = anchorContent.match(/<xdr:from>([\s\S]*?)<\/xdr:from>/i)?.[1] || anchorContent;
        const colMatch = fromBlock.match(/<xdr:col>(\d+)<\/xdr:col>/i);
        const rowMatch = fromBlock.match(/<xdr:row>(\d+)<\/xdr:row>/i);
        const blipMatch = anchorContent.match(/r:embed="([^"]+)"/i) || anchorContent.match(/embed="([^"]+)"/i);

        if (blipMatch) {
          const rId = blipMatch[1];
          const mediaPath = relsMap.get(rId);

          if (mediaPath && zip.file(mediaPath)) {
            const mediaZip = zip.file(mediaPath);
            if (mediaZip) {
              const base64 = await mediaZip.async('base64');
              const ext = mediaPath.split('.').pop()?.toLowerCase() || 'png';
              const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/webp';
              const dataUrl = `data:${mime};base64,${base64}`;

              const col = colMatch ? parseInt(colMatch[1], 10) : 29;
              const row = rowMatch ? parseInt(rowMatch[1], 10) : rawList.length;

              cellImageMap.set(`${row}_${col}`, dataUrl);
              cellImageMap.set(`row_${row}`, dataUrl);

              // If top-left anchored in row 0 (or header row), also map to row 1 (first data row)
              if (row === 0) {
                cellImageMap.set(`1_${col}`, dataUrl);
                cellImageMap.set(`row_1`, dataUrl);
              }

              rawList.push({ row, col, dataUrl });
            }
          }
        }
      }
    }

    // 2. Modern cell images (cellimages.xml)
    if (zip.file('xl/cellimages.xml')) {
      const cellImgXml = await zip.file('xl/cellimages.xml')!.async('string');
      const relsFile = 'xl/_rels/cellimages.xml.rels';
      const relsZip = zip.file(relsFile);
      const relsXml = relsZip ? await relsZip.async('string') : '';

      const relsMap = new Map<string, string>();
      if (relsXml) {
        const relMatches = relsXml.matchAll(/<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g);
        for (const match of relMatches) {
          let target = match[2];
          if (target.startsWith('../')) target = 'xl/' + target.replace(/^\.\.\//, '');
          else if (!target.startsWith('xl/')) target = 'xl/' + target;
          relsMap.set(match[1], target);
        }
      }

      const cellImgMatches = cellImgXml.matchAll(/<etc:cellImage[^>]*>[\s\S]*?<a:blip[^>]*r:embed="([^"]+)"/g);
      let imgIdx = 0;
      for (const m of cellImgMatches) {
        const rId = m[1];
        const mediaPath = relsMap.get(rId);
        if (mediaPath && zip.file(mediaPath)) {
          const mediaZip = zip.file(mediaPath);
          if (mediaZip) {
            const base64 = await mediaZip.async('base64');
            const ext = mediaPath.split('.').pop()?.toLowerCase() || 'png';
            const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'png' ? 'image/png' : 'image/webp';
            const dataUrl = `data:${mime};base64,${base64}`;
            cellImageMap.set(`seq_${imgIdx}`, dataUrl);
            rawList.push({ row: imgIdx, col: 29, dataUrl });
            imgIdx++;
          }
        }
      }
    }
  } catch (e) {
    console.warn('Error extracting images from xlsx zip archive:', e);
  }

  // Sort rawList by row index ascending to guarantee sequential order alignment
  rawList.sort((a, b) => a.row - b.row);
  const sortedPhotos = rawList.map(item => item.dataUrl);

  return { cellImageMap, sortedPhotos };
}

async function compressImageBase64(dataUrl: string, maxDimension = 450, quality = 0.8): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}

export const MASTER_EMPLOYEE_COLUMNS = [
  "No.",
  "Nama",
  "NIK",
  "No.KTP",
  "PT",
  "POH",
  "Sponsor",
  "Status Karyawan",
  "Tanggal Efektif Tidak Bekerja",
  "DOH Awal",
  "Tanggal Jabatan Baru",
  "Masa Kerja",
  "Masa Kerja Jabatan Terakhir",
  "Departemen",
  "Bagian",
  "Job Grade",
  "Gol",
  "Jabatan Baru",
  "Status Kontrak",
  "Tanggal Permanent",
  "Tempat Lahir",
  "Tanggal Lahir",
  "Nomor Telp. Pribadi",
  "Keluarga Kandung yang Bisa Dihubungi",
  "No.Telephone Keluarga Kandung",
  "Orang terdekat yang bisa dihubungi",
  "No.Telephone darurat Orang Terdekat",
  "Alamat Sesuai KTP",
  "Alamat Domisili",
  "Foto"
];

export const ABSENSI_EMPLOYEE_COLUMNS = [
  "NO",
  "Employee Name",
  "Izin",
  "Izin Khusus",
  "Sakit",
  "Alpa",
  "Tanggal Izin",
  "Izin Khusus (Tanggal)",
  "Sakit Site (SS)",
  "Sakit Luar (SL)",
  "Alpa (Tanggal)",
  "Alasan Izin",
  "Alasan Izin Khusus",
  "Alasan Sakit Site (SS)",
  "Alasan Sakit Luar (SL)"
];

export const KONSELING_SPDK_COLUMNS = [
  "NO",
  "Nama Karyawan",
  "Jabatan",
  "PT",
  "NIK",
  "Total SP",
  "Bulan Konseling",
  "Konseling I",
  "Konseling II",
  "Konseling III",
  "ST",
  "SP I",
  "SP II",
  "SP III",
  "SPPT",
  "PHK",
  "Masa Berlaku Sanksi",
  "Masa Pemulihan I",
  "Masa Pemulihan II",
  "Alasan Konseling",
  "Alasan Surat Peringatan",
  "Keterangan SP",
  "Pernah SP/ST Sebelumnya",
  "Pernah Terlibat SPDK",
  "Kronologi Kejadian SPDK",
  "Kategori Sanksi SPDK",
  "Tindakan Disiplin SPDK"
];

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  inspectorNik: string;
}

export function EmployeeImportModal({ isOpen, onClose, onSuccess, inspectorNik }: EmployeeImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [parsedAttendanceRows, setParsedAttendanceRows] = useState<any[]>([]);
  const [parsedCounselingRows, setParsedCounselingRows] = useState<any[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [detectedAttendanceHeaders, setDetectedAttendanceHeaders] = useState<string[]>([]);
  const [detectedCounselingHeaders, setDetectedCounselingHeaders] = useState<string[]>([]);
  const [detectedSheets, setDetectedSheets] = useState<string[]>([]);
  const [activePreviewTab, setActivePreviewTab] = useState<'master' | 'absensi' | 'konseling'>('master');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; percent: number; message: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    status: 'success' | 'error';
    message: string;
    stats?: {
      total: number;
      updated: number;
      inserted: number;
      attendanceUpdated?: number;
      counselingUpdated?: number;
      errors: number;
      errorList?: string[];
    };
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplateCsv = () => {
    const sampleRow: Record<string, string> = {
      "No.": "1",
      "Nama": "Contoh Nama Karyawan",
      "NIK": "02D25000001",
      "No.KTP": "7172080508950004",
      "PT": "TBP",
      "POH": "Kawasi",
      "Sponsor": "Thisi Tuwaidan (HR Comben)",
      "Status Karyawan": "Active",
      "Tanggal Efektif Tidak Bekerja": "-",
      "DOH Awal": "26-Agu-2016",
      "Tanggal Jabatan Baru": "17-Des-2018",
      "Masa Kerja": "9 Tahun 11 Bulan",
      "Masa Kerja Jabatan Terakhir": "7 Tahun 8 Bulan",
      "Departemen": "Preparation & Laboratory",
      "Bagian": "Preparation",
      "Job Grade": "M2.8",
      "Gol": "II",
      "Jabatan Baru": "Preparation Foreman",
      "Status Kontrak": "Permanent",
      "Tanggal Permanent": "26-May-19",
      "Tempat Lahir": "Desa LoLeo",
      "Tanggal Lahir": "21-Aug-80",
      "Nomor Telp. Pribadi": "082196661254",
      "Keluarga Kandung yang Bisa Dihubungi": "Istri",
      "No.Telephone Keluarga Kandung": "081380569187",
      "Orang terdekat yang bisa dihubungi": "Adik",
      "No.Telephone darurat Orang Terdekat": "082269972377",
      "Alamat Sesuai KTP": "Desa loleo kec Obi selatan",
      "Alamat Domisili": "Desa loleo kec Obi selatan",
      "Foto": "https://drive.google.com/file/d/contoh_id/view"
    };

    const csvContent = Papa.unparse({
      fields: MASTER_EMPLOYEE_COLUMNS,
      data: [sampleRow]
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `template_database_karyawan_30kolom_preplab.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadTemplateExcel = () => {
    // Sheet 1: Master Data Karyawan
    const masterData = [
      MASTER_EMPLOYEE_COLUMNS,
      [
        "1",
        "Deni Nugraha Perdana",
        "02D25000001",
        "7172080508950004",
        "TBP",
        "Kawasi",
        "Thisi Tuwaidan (HR Comben)",
        "Active",
        "-",
        "26-Agu-2016",
        "17-Des-2018",
        "9 Tahun 11 Bulan",
        "7 Tahun 8 Bulan",
        "Preparation & Laboratory",
        "Preparation",
        "M2.8",
        "II",
        "Preparation Foreman",
        "Permanent",
        "26-May-19",
        "Desa LoLeo",
        "21-Aug-80",
        "082196661254",
        "Istri",
        "081380569187",
        "Adik",
        "082269972377",
        "Desa loleo kec Obi selatan",
        "Desa loleo kec Obi selatan",
        "https://drive.google.com/file/d/contoh_id/view"
      ],
      [
        "2",
        "Arif Maulana Leway",
        "02D24000012",
        "7172080508950005",
        "TBP",
        "Kawasi",
        "Thisi Tuwaidan (HR Comben)",
        "Active",
        "-",
        "15-Jan-2018",
        "01-Feb-2020",
        "6 Tahun 7 Bulan",
        "4 Tahun 6 Bulan",
        "Preparation & Laboratory",
        "Laboratory",
        "M2.7",
        "II",
        "Laboratory Analyst",
        "Permanent",
        "15-Jan-21",
        "Ambon",
        "10-May-92",
        "081234567890",
        "Orang Tua",
        "081298765432",
        "Kakak",
        "081298765433",
        "Kota Ambon",
        "Kawasi Obi",
        ""
      ],
      [
        "3",
        "Donald Febri Andriano Taweli",
        "02D23000045",
        "7172080508950006",
        "TBP",
        "Kawasi",
        "Thisi Tuwaidan (HR Comben)",
        "Active",
        "-",
        "10-Mar-2019",
        "01-Jul-2021",
        "5 Tahun 5 Bulan",
        "3 Tahun 1 Bulan",
        "Preparation & Laboratory",
        "Preparation",
        "M2.6",
        "I",
        "Preparation Crew",
        "Permanent",
        "10-Mar-22",
        "Manado",
        "14-Feb-95",
        "082187654321",
        "Ibu",
        "082143218765",
        "Paman",
        "082143218766",
        "Manado",
        "Kawasi Obi",
        ""
      ]
    ];

    // Sheet 2: Absensi Karyawan
    const absensiData = [
      ABSENSI_EMPLOYEE_COLUMNS,
      [
        "1",
        "Deni Nugraha Perdana",
        "", "", "", "", "", "", "", "", "", "", "", "", ""
      ],
      [
        "2",
        "Arif Maulana Leway",
        "3", "", "", "", "15-Agu-2026\n16-Agu-2026\n17-Agu-2026", "", "", "", "", "15-Aug-26 s/d 17-Aug-26 (3 Hari) - Acara Keluarga", "", "", ""
      ],
      [
        "3",
        "Donald Febri Andriano Taweli",
        "2", "", "9", "", "16-Apr-2026\n17-Apr-2025", "", "07-Jan-2026\n08-Jan-2026\n09-Jan-2026\n10-Jan-2026\n11-Jan-2026\n12-Jan-2026\n13-Jan-2026\n14-Jan-2026\n02-Agu-2026", "", "", "", "", "1. 07-Jan-26 s/d 14-Jan-26 (8 Hari) - Ispa & asma\n2. 02-Aug-26 s/d 02-Aug-26 (1 Hari) - Sakit", ""
      ],
      [
        "4",
        "Murti Tamraun Harun",
        "6", "5", "1", "", "08-Mei-2026\n16-Jul-2026\n17-Jul-2026\n02-Okt-2026\n03-Okt-2026\n04-Okt-2026", "13-Feb-2026 s/d 17-Feb-2026", "23-Agu-2026", "", "", "1. 08-May-26 s/d 08-May-26 (1 Hari) - Sakit\n2. 16-Jul-26 s/d 17-Jul-26 (2 Hari) - Antar Orang Tua(Mama Berobat)\n3. 02-Okt-26 s/d 04-Okt-26 (3 Hari) - Rawat Ibu di rumah sakit", "1. 13-Feb-26 s/d 17-Feb-26 (5 Hari) - Menikah\n2. 07-May-26 s/d 07-May-26 (1 Hari) - Wisuda", "23-Aug-26 s/d 23-Aug-26 (1 Hari) - Sakit", ""
      ]
    ];

    // Sheet 3: Konseling & SPDK
    const konselingData = [
      KONSELING_SPDK_COLUMNS,
      [
        "1", "Deni Nugraha Perdana", "Preparation Foreman", "TBP", "02D25000001", "0", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Tidak", "Tidak", "", "", ""
      ],
      [
        "2", "Arif Maulana Leway", "Laboratory Analyst", "TBP", "02D24000012", "1", "Februari 2026", "05-Feb-2026", "", "", "12-Feb-2026", "", "", "", "", "12-Agu-2026", "12-Mei-2026", "12-Agu-2026", "Briefing kedisiplinan jam kedatangan shift", "Terlambat Masuk Kerja Lebih Dari 3 Kali", "Konseling dan ST diberikan oleh Foreman", "Tidak", "Tidak", "", "", "Teguran Tertulis"
      ],
      [
        "3", "Donald Febri Andriano Taweli", "Preparation Crew", "TBP", "02D23000045", "2", "Januari 2026", "10-Jan-2026", "24-Jan-2026", "", "", "28-Jan-2026", "", "", "", "28-Jul-2026", "28-Apr-2026", "28-Jul-2026", "Pembinaan absensi dan kehadiran kerja", "Alpa berturut-turut tanpa keterangan", "Surat Peringatan I (SP 1)", "Ya", "Ya", "Kronologi insiden ketidakhadiran kerja tanpa izin", "Pelanggaran Disiplin Sedang", "Penerbitan SP I & Evaluasi Kerja"
      ]
    ];

    const wb = XLSX.utils.book_new();

    const ws1 = XLSX.utils.aoa_to_sheet(masterData);
    XLSX.utils.book_append_sheet(wb, ws1, "DataBase Karyawan");

    const ws2 = XLSX.utils.aoa_to_sheet(absensiData);
    XLSX.utils.book_append_sheet(wb, ws2, "Absensi karyawan");

    const ws3 = XLSX.utils.aoa_to_sheet(konselingData);
    XLSX.utils.book_append_sheet(wb, ws3, "Konseling & SPDK");

    XLSX.writeFile(wb, "template_database_karyawan_absensi_konseling_preplab.xlsx");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const parseCounselingWorksheet = (worksheet: XLSX.WorkSheet) => {
    if (!worksheet || !worksheet['!ref']) return { rows: [], headers: KONSELING_SPDK_COLUMNS };
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    // Find header row (check row 0, 1, 2, 3, 4)
    let headerRowIdx = 0;
    for (let r = 0; r <= Math.min(4, range.e.r); r++) {
      let rowCells: string[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.v !== undefined) {
          rowCells.push(String(cell.v).toLowerCase().trim());
        }
      }
      const rowText = rowCells.join(' ');
      if (
        rowText.includes('konseling') || rowText.includes('spdk') ||
        rowText.includes('total sp') || rowText.includes('sanksi') || (rowText.includes('nama') && rowText.includes('nik'))
      ) {
        headerRowIdx = r;
        break;
      }
    }

    const headers: { colIdx: number; name: string; clean: string }[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: headerRowIdx, c })];
      let headerName = cell && cell.v !== undefined ? String(cell.v).trim() : '';

      if (!headerName && c < KONSELING_SPDK_COLUMNS.length) {
        headerName = KONSELING_SPDK_COLUMNS[c];
      } else if (!headerName) {
        headerName = `Col_${XLSX.utils.encode_col(c)}`;
      }

      const clean = headerName.toLowerCase().replace(/[^a-z0-9]/g, '');
      headers.push({ colIdx: c, name: headerName, clean });
    }

    const rows: any[] = [];
    for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
      const rowObj: Record<string, any> = {};
      let hasAnyData = false;

      for (const h of headers) {
        const cellAddr = XLSX.utils.encode_cell({ r, c: h.colIdx });
        const cell = worksheet[cellAddr];
        let val: any = '';

        if (cell) {
          const isDateCol = h.clean.includes('tanggal') || h.clean.includes('tgl') || h.clean.includes('masa') || h.clean.includes('berlaku') || h.clean.includes('pemulihan');
          if (isDateCol) {
            val = formatExcelDate(cell.v !== undefined ? cell.v : cell.w);
          } else {
            val = cell.w !== undefined ? String(cell.w).trim() : cell.v !== undefined ? String(cell.v).trim() : '';
          }
        }

        if (val !== undefined && val !== null && val !== '') {
          hasAnyData = true;
        }

        rowObj[h.name] = val;
        if (h.clean === 'nik' || h.clean === 'id' || h.clean === 'noid') rowObj['NIK'] = val;
        if (h.clean === 'namakaryawan' || h.clean === 'nama' || h.clean === 'name' || h.clean === 'employeename') rowObj['Nama Karyawan'] = val;
        if (h.clean === 'jabatan' || h.clean === 'posisi' || h.clean === 'jabatanbaru') rowObj['Jabatan'] = val;
        if (h.clean === 'pt' || h.clean === 'perusahaan') rowObj['PT'] = val;
        if (h.clean === 'totalsp' || h.clean === 'totalsanksi' || h.clean === 'total') rowObj['Total SP'] = val;
        if (h.clean === 'bulankonseling' || h.clean === 'bulansanksi' || h.clean === 'bulan' || h.clean === 'periode') rowObj['Bulan Konseling'] = val;
        if (h.clean === 'konselingi' || h.clean === 'konseling1' || h.clean === 'konselingpertama' || h.clean === 'tanggalkonseling1' || h.clean === 'tanggalkonselingi') {
          if (!rowObj['Konseling I'] || val.includes('-') || val.includes('/')) rowObj['Konseling I'] = val;
        }
        if (h.clean === 'konselingii' || h.clean === 'konseling2' || h.clean === 'konselingkedua' || h.clean === 'tanggalkonseling2' || h.clean === 'tanggalkonselingii') {
          if (!rowObj['Konseling II'] || val.includes('-') || val.includes('/')) rowObj['Konseling II'] = val;
        }
        if (h.clean === 'konselingiii' || h.clean === 'konseling3' || h.clean === 'konselingketiga' || h.clean === 'tanggalkonseling3' || h.clean === 'tanggalkonselingiii') {
          if (!rowObj['Konseling III'] || val.includes('-') || val.includes('/')) rowObj['Konseling III'] = val;
        }
        if (h.clean === 'st' || h.clean === 'suratteguran' || h.clean === 'teguran' || h.clean === 'tanggalsuratteguran' || h.clean === 'tanggalst') {
          if (!rowObj['ST'] || val.includes('-') || val.includes('/')) rowObj['ST'] = val;
        }
        if (h.clean === 'spi' || h.clean === 'sp1' || h.clean === 'suratperingatan1' || h.clean === 'suratperingatani' || h.clean === 'tanggalsp1' || h.clean === 'tanggalspi') {
          if (!rowObj['SP I'] || val.includes('-') || val.includes('/')) rowObj['SP I'] = val;
        }
        if (h.clean === 'spii' || h.clean === 'sp2' || h.clean === 'suratperingatan2' || h.clean === 'suratperingatanii' || h.clean === 'tanggalsp2' || h.clean === 'tanggalspii') {
          if (!rowObj['SP II'] || val.includes('-') || val.includes('/')) rowObj['SP II'] = val;
        }
        if (h.clean === 'spiii' || h.clean === 'sp3' || h.clean === 'suratperingatan3' || h.clean === 'suratperingataniii' || h.clean === 'tanggalsp3' || h.clean === 'tanggalspiii') {
          if (!rowObj['SP III'] || val.includes('-') || val.includes('/')) rowObj['SP III'] = val;
        }
        if (h.clean === 'sppt' || h.clean === 'sp1sppt' || h.clean === 'sppertamadanterakhir' || h.clean === 'spterakhir' || h.clean === 'spptsp3' || h.clean === 'tanggalsppt') {
          if (!rowObj['SPPT'] || val.includes('-') || val.includes('/')) rowObj['SPPT'] = val;
        }
        if (h.clean === 'tanggalsp' || h.clean === 'tglsp' || h.clean === 'tanggalperingatan' || h.clean === 'tglperingatan') rowObj['Tanggal SP'] = val;
        if (h.clean === 'phk') rowObj['PHK'] = val;
        if (h.clean === 'masaberlakusanksi' || h.clean === 'masaberlaku' || h.clean === 'periodeberlaku' || h.clean === 'tglberlaku' || h.clean === 'tanggalberlaku') rowObj['Masa Berlaku Sanksi'] = val;
        if (h.clean === 'masapemulihani' || h.clean === 'masapemulihan1' || h.clean === 'pemulihani' || h.clean === 'pemulihan1') rowObj['Masa Pemulihan I'] = val;
        if (h.clean === 'masapemulihanii' || h.clean === 'masapemulihan2' || h.clean === 'pemulihanii' || h.clean === 'pemulihan2') rowObj['Masa Pemulihan II'] = val;
        if (h.clean === 'alasankonseling' || h.clean === 'alasankonselingpembinaan' || h.clean === 'alasanpembinaan' || h.clean === 'topikkonseling' || h.clean === 'catatankonseling' || h.clean === 'konselingalasan' || h.clean === 'alasankonseling1' || h.clean === 'alasankonselingi' || h.clean === 'alasankonseling2' || h.clean === 'alasankonselingii' || h.clean === 'alasankonseling3' || h.clean === 'alasankonselingiii') {
          rowObj['Alasan Konseling'] = rowObj['Alasan Konseling'] ? `${rowObj['Alasan Konseling']}\n${val}` : val;
        }
        if (
          h.clean === 'alasansuratperingatan' || 
          h.clean === 'alasansp' || 
          h.clean === 'alasanspdk' || 
          h.clean === 'alasansanksispdk' || 
          h.clean === 'alasansanksi' || 
          h.clean === 'alasanpelanggaran' || 
          h.clean === 'alasanst' || 
          h.clean === 'alasansuratteguran' || 
          h.clean === 'alasansp1' || 
          h.clean === 'alasansp2' || 
          h.clean === 'alasansp3' || 
          h.clean === 'alasansppt' || 
          h.clean === 'pelanggaran' || 
          h.clean === 'kasus' || 
          h.clean === 'uraianpelanggaran' || 
          h.clean === 'uraianmasalah' || 
          h.clean === 'deskripsimasalah' || 
          h.clean === 'alasansanksidisiplin' || 
          h.clean === 'alasanperingatan' || 
          h.clean === 'alasan'
        ) {
          rowObj['Alasan Surat Peringatan'] = rowObj['Alasan Surat Peringatan'] ? `${rowObj['Alasan Surat Peringatan']}\n${val}` : val;
        }
        if (h.clean === 'keterangansp' || h.clean === 'keterangan' || h.clean === 'catatan') rowObj['Keterangan SP'] = val;
        if (h.clean === 'pernahspstsebelumnya' || h.clean === 'pernahspsebelumnya' || h.clean === 'pernahspst' || h.clean === 'pernahsp' || h.clean === 'riwayatsp') rowObj['Pernah SP/ST Sebelumnya'] = val;
        if (h.clean === 'pernahterlibatspdk' || h.clean === 'terlibatspdk' || h.clean === 'spdk' || h.clean === 'statusspdk') rowObj['Pernah Terlibat SPDK'] = val;
        if (h.clean === 'kronologikejadianspdk' || h.clean === 'kronologikejadian' || h.clean === 'kronologispdk' || h.clean === 'kronologi' || h.clean === 'riwayatkejadian') rowObj['Kronologi Kejadian SPDK'] = val;
        if (h.clean === 'kategorisanksispdk' || h.clean === 'kategorispdk' || h.clean === 'kategorisanksi' || h.clean === 'kategoripelanggaran' || h.clean === 'jenispelanggaran') rowObj['Kategori Sanksi SPDK'] = val;
        if (h.clean === 'tindakandisiplinspdk' || h.clean === 'tindakandisiplin' || h.clean === 'tindakanspdk' || h.clean === 'sanksispdk' || h.clean === 'tindakan') rowObj['Tindakan Disiplin SPDK'] = val;
      }

      const hasNameOrNik = rowObj['Nama Karyawan'] || rowObj['Nama'] || rowObj['NIK'];
      if (hasAnyData && hasNameOrNik && String(rowObj['NIK'] || '').toUpperCase() !== 'NIK') {
        rows.push(rowObj);
      }
    }

    return { rows, headers: KONSELING_SPDK_COLUMNS };
  };

  const parseAttendanceWorksheet = (worksheet: XLSX.WorkSheet) => {
    if (!worksheet || !worksheet['!ref']) return { rows: [], headers: ABSENSI_EMPLOYEE_COLUMNS };
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    // Find header row (check row 0, 1, 2, 3, 4)
    let headerRowIdx = 0;
    for (let r = 0; r <= Math.min(4, range.e.r); r++) {
      let rowCells: string[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.v !== undefined) {
          rowCells.push(String(cell.v).toLowerCase().trim());
        }
      }
      const rowText = rowCells.join(' ');
      if (
        rowText.includes('employee name') || rowText.includes('nama') ||
        rowText.includes('izin') || rowText.includes('sakit') || rowText.includes('alpa')
      ) {
        headerRowIdx = r;
        break;
      }
    }

    // Determine column keys based on header name & column index
    const colMap: { colIdx: number; key: string; label: string }[] = [];

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: headerRowIdx, c })];
      const rawHeader = cell && cell.v !== undefined ? String(cell.v).trim() : '';
      const clean = rawHeader.toLowerCase().replace(/[^a-z0-9]/g, '');

      let key = '';
      let label = rawHeader;

      if (clean === 'no' || clean === 'nomor' || c === 0) {
        key = 'no';
        label = 'NO';
      } else if (clean.includes('employeename') || clean.includes('nama') || clean === 'name' || c === 1) {
        key = 'employeeName';
        label = 'Employee Name';
      } else if (c === 2 || (clean === 'izin' && c < 6)) {
        key = 'izin';
        label = 'Izin';
      } else if (c === 3 || (clean.includes('izinkhusus') && c < 6)) {
        key = 'izinKhusus';
        label = 'Izin Khusus';
      } else if (c === 4 || (clean === 'sakit' && c < 6)) {
        key = 'sakit';
        label = 'Sakit';
      } else if (c === 5 || ((clean === 'alpa' || clean === 'alpha') && c < 6)) {
        key = 'alpa';
        label = 'Alpa';
      } else if (c === 6 || (clean.includes('tanggal') && clean.includes('izin') && !clean.includes('khusus')) || clean === 'tglizin') {
        key = 'tanggalIzin';
        label = 'Tanggal Izin';
      } else if (c === 7 || (clean.includes('izinkhusus') && !clean.includes('alasan') && c >= 6)) {
        key = 'tanggalIzinKhusus';
        label = 'Izin Khusus (Tanggal)';
      } else if (c === 8 || ((clean.includes('sakitsitess') || clean.includes('sakitsite') || clean.includes('ss')) && !clean.includes('alasan') && c >= 6)) {
        key = 'tanggalSakitSite';
        label = 'Sakit Site (SS)';
      } else if (c === 9 || ((clean.includes('sakitluarsl') || clean.includes('sakitluar') || clean.includes('sl')) && !clean.includes('alasan') && c >= 6)) {
        key = 'tanggalSakitLuar';
        label = 'Sakit Luar (SL)';
      } else if (c === 10 || ((clean.includes('alpa') || clean.includes('alpha')) && c >= 6)) {
        key = 'tanggalAlpa';
        label = 'Alpa (Tanggal)';
      } else if (c === 11 || (clean.includes('alasan') && clean.includes('izin') && !clean.includes('khusus')) || clean === 'alasanizin' || (clean === 'alasan' && c === 11)) {
        key = 'alasanIzin';
        label = 'Alasan Izin';
      } else if (c === 12 || (clean.includes('alasan') && clean.includes('khusus')) || clean.includes('alasanizinkhusus')) {
        key = 'alasanIzinKhusus';
        label = 'Alasan Izin Khusus';
      } else if (c === 13 || (clean.includes('alasan') && (clean.includes('sakitsite') || clean.includes('site') || clean.includes('ss')))) {
        key = 'alasanSakitSite';
        label = 'Alasan Sakit Site (SS)';
      } else if (c === 14 || (clean.includes('alasan') && (clean.includes('sakitluar') || clean.includes('luar') || clean.includes('sl')))) {
        key = 'alasanSakitLuar';
        label = 'Alasan Sakit Luar (SL)';
      } else if (clean.includes('alasan')) {
        key = 'alasanIzin';
        label = rawHeader || 'Alasan Izin';
      } else {
        key = `col_${c}`;
        label = rawHeader || `Col_${c}`;
      }

      colMap.push({ colIdx: c, key, label });
    }

    const rows: any[] = [];
    for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
      const rowObj: Record<string, any> = {};
      let hasAnyData = false;

      for (const col of colMap) {
        const cellAddr = XLSX.utils.encode_cell({ r, c: col.colIdx });
        const cell = worksheet[cellAddr];
        let val = '';

        if (cell) {
          if (cell.w !== undefined && String(cell.w).trim()) {
            val = String(cell.w).trim();
          } else if (cell.v !== undefined && cell.v !== null) {
            val = cell.v instanceof Date ? formatExcelDate(cell.v) : String(cell.v).trim();
          }
        }

        if (val !== undefined && val !== null && val !== '' && val !== '-') {
          hasAnyData = true;
        }

        rowObj[col.label] = val;
        if (col.key === 'employeeName') {
          rowObj['Employee Name'] = val;
          rowObj['Nama'] = val;
        } else if (col.key === 'izin') {
          rowObj['Izin'] = val;
        } else if (col.key === 'izinKhusus') {
          rowObj['Izin Khusus'] = val;
        } else if (col.key === 'sakit') {
          rowObj['Sakit'] = val;
        } else if (col.key === 'alpa') {
          rowObj['Alpa'] = val;
          rowObj['Alpha'] = val;
        } else if (col.key === 'tanggalIzin') {
          rowObj['Tanggal Izin'] = val;
        } else if (col.key === 'tanggalIzinKhusus') {
          rowObj['Izin Khusus (Tanggal)'] = val;
          rowObj['Tanggal Izin Khusus'] = val;
        } else if (col.key === 'tanggalSakitSite') {
          rowObj['Sakit Site (SS)'] = val;
          rowObj['Tanggal Sakit Site'] = val;
        } else if (col.key === 'tanggalSakitLuar') {
          rowObj['Sakit Luar (SL)'] = val;
          rowObj['Tanggal Sakit Luar'] = val;
        } else if (col.key === 'tanggalAlpa') {
          rowObj['Alpa (Tanggal)'] = val;
          rowObj['Tanggal Alpa'] = val;
          rowObj['Alpha (Tanggal)'] = val;
          rowObj['Tanggal Alpha'] = val;
        } else if (col.key === 'alasanIzin') {
          rowObj['Alasan Izin'] = val;
          rowObj['Alasan'] = val;
        } else if (col.key === 'alasanIzinKhusus') {
          rowObj['Alasan Izin Khusus'] = val;
        } else if (col.key === 'alasanSakitSite') {
          rowObj['Alasan Sakit Site (SS)'] = val;
          rowObj['Alasan Sakit Site'] = val;
        } else if (col.key === 'alasanSakitLuar') {
          rowObj['Alasan Sakit Luar (SL)'] = val;
          rowObj['Alasan Sakit Luar'] = val;
        }
      }

      const empName = rowObj['Employee Name'] || rowObj['Nama'];
      if (hasAnyData && empName && String(empName).toLowerCase() !== 'employee name' && String(empName).toLowerCase() !== 'nama') {
        rows.push(rowObj);
      }
    }

    return { rows, headers: ABSENSI_EMPLOYEE_COLUMNS };
  };

  const parseWorksheetGeneric = (worksheet: XLSX.WorkSheet, defaultCols: string[]) => {
    if (!worksheet || !worksheet['!ref']) return { rows: [], headers: [] };
    const range = XLSX.utils.decode_range(worksheet['!ref']);

    // Find header row (check row 0, 1, 2, 3)
    let headerRowIdx = 0;
    for (let r = 0; r <= Math.min(4, range.e.r); r++) {
      let rowCells: string[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.v !== undefined) {
          rowCells.push(String(cell.v).toLowerCase().trim());
        }
      }
      const rowText = rowCells.join(' ');
      if (
        rowText.includes('nik') || rowText.includes('nama') || rowText.includes('employee name') ||
        rowText.includes('ktp') || rowText.includes('status') || rowText.includes('izin') || rowText.includes('sakit')
      ) {
        headerRowIdx = r;
        break;
      }
    }

    const headers: { colIdx: number; name: string; clean: string }[] = [];
    const detectedHeaderNames: string[] = [];

    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: headerRowIdx, c })];
      let headerName = cell && cell.v !== undefined ? String(cell.v).trim() : '';

      if (!headerName && c < defaultCols.length) {
        headerName = defaultCols[c];
      } else if (!headerName) {
        if (c === 29 && defaultCols === MASTER_EMPLOYEE_COLUMNS) {
          headerName = 'Foto';
        } else {
          headerName = `Col_${XLSX.utils.encode_col(c)}`;
        }
      }

      const clean = headerName.toLowerCase().replace(/[^a-z0-9]/g, '');
      headers.push({ colIdx: c, name: headerName, clean });
      detectedHeaderNames.push(headerName);
    }

    const rows: any[] = [];
    for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
      const rowObj: Record<string, any> = {};
      let hasAnyData = false;

      for (const h of headers) {
        const cellAddr = XLSX.utils.encode_cell({ r, c: h.colIdx });
        const cell = worksheet[cellAddr];
        let val: any = '';

        if (cell) {
          const isDateCol = h.clean.includes('tanggal') || h.clean.includes('tgl') || h.clean === 'dohawal' || h.clean === 'doh';
          if (isDateCol) {
            val = formatExcelDate(cell.v !== undefined ? cell.v : cell.w);
          } else {
            val = cell.w !== undefined ? String(cell.w).trim() : cell.v !== undefined ? String(cell.v).trim() : '';
          }
        }

        if (val !== undefined && val !== null && val !== '') {
          hasAnyData = true;
        }
        rowObj[h.name] = val;
      }

      if (hasAnyData) {
        rows.push(rowObj);
      }
    }

    return { rows, headers: detectedHeaderNames };
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setErrorMsg(null);
    setImportResult(null);
    setParsedRows([]);
    setParsedAttendanceRows([]);
    setParsedCounselingRows([]);
    setDetectedHeaders([]);
    setDetectedAttendanceHeaders([]);
    setDetectedCounselingHeaders([]);
    setDetectedSheets([]);

    const fileName = selectedFile.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setIsParsing(false);
          if (results.data && results.data.length > 0) {
            const rawFields = results.meta?.fields || Object.keys(results.data[0] || {});
            const cleanFields = rawFields.map(f => String(f).toLowerCase().replace(/[^a-z0-9]/g, ''));

            const isCounseling = cleanFields.some(f => 
              f.includes('konseling') || f.includes('spdk') || f.includes('totalsp') || 
              f.includes('masaberlaku') || f.includes('masapemulihan') || 
              f.includes('alasansp') || f.includes('alasansuratperingatan') || 
              f.includes('kronologi') || f.includes('tindakanspdk') || f.includes('kategorispdk') ||
              f === 'st' || f === 'spi' || f === 'sp1' || f === 'spii' || f === 'sp2' || f === 'spiii' || f === 'sp3' || f === 'phk'
            );

            const isAttendance = cleanFields.some(f => 
              f.includes('izin') || f.includes('sakitsite') || f.includes('sakitluar') || 
              f.includes('alpa') || f.includes('alpha') || f.includes('alasanizin') || f.includes('alasansakit')
            );

            const isMaster = cleanFields.some(f => 
              f.includes('noktp') || f.includes('dohawal') || f.includes('doh') || 
              f.includes('poh') || f.includes('sponsor') || f.includes('statuskaryawan') || 
              f.includes('jobgrade') || f.includes('gol') || f.includes('tanggallahir') || 
              f.includes('alamatsesuaiktp') || f.includes('alamatdomisili') || f === 'foto'
            );

            if (isCounseling && !isMaster) {
              const mappedCounseling = results.data.map((r: any) => {
                const rowObj: Record<string, any> = { ...r };
                for (const [k, v] of Object.entries(r)) {
                  const clean = String(k).toLowerCase().replace(/[^a-z0-9]/g, '');
                  if (clean === 'nik' || clean === 'id' || clean === 'noid') rowObj['NIK'] = v;
                  if (clean === 'namakaryawan' || clean === 'nama' || clean === 'name' || clean === 'employeename') rowObj['Nama Karyawan'] = v;
                  if (clean === 'jabatan' || clean === 'posisi' || clean === 'jabatanbaru') rowObj['Jabatan'] = v;
                  if (clean === 'pt' || clean === 'perusahaan') rowObj['PT'] = v;
                  if (clean === 'totalsp' || clean === 'totalsanksi' || clean === 'total') rowObj['Total SP'] = v;
                  if (clean === 'bulankonseling' || clean === 'bulansanksi' || clean === 'bulan' || clean === 'periode') rowObj['Bulan Konseling'] = v;
                  if (clean === 'konselingi' || clean === 'konseling1' || clean === 'konselingpertama') rowObj['Konseling I'] = v;
                  if (clean === 'konselingii' || clean === 'konseling2' || clean === 'konselingkedua') rowObj['Konseling II'] = v;
                  if (clean === 'konselingiii' || clean === 'konseling3' || clean === 'konselingketiga') rowObj['Konseling III'] = v;
                  if (clean === 'st' || clean === 'suratteguran' || clean === 'teguran') rowObj['ST'] = v;
                  if (clean === 'spi' || clean === 'sp1' || clean === 'suratperingatan1' || clean === 'suratperingatani') rowObj['SP I'] = v;
                  if (clean === 'spii' || clean === 'sp2' || clean === 'suratperingatan2' || clean === 'suratperingatanii') rowObj['SP II'] = v;
                  if (clean === 'spiii' || clean === 'sp3' || clean === 'suratperingatan3' || clean === 'suratperingataniii') rowObj['SP III'] = v;
                  if (clean === 'sppt' || clean === 'sp1sppt' || clean === 'sppertamadanterakhir' || clean === 'spterakhir' || clean === 'spptsp3') rowObj['SPPT'] = v;
                  if (clean === 'tanggalsp' || clean === 'tglsp' || clean === 'tanggalperingatan' || clean === 'tglperingatan') rowObj['Tanggal SP'] = v;
                  if (clean === 'phk') rowObj['PHK'] = v;
                  if (clean === 'masaberlakusanksi' || clean === 'masaberlaku' || clean === 'periodeberlaku' || clean === 'tglberlaku' || clean === 'tanggalberlaku') rowObj['Masa Berlaku Sanksi'] = v;
                  if (clean === 'masapemulihani' || clean === 'masapemulihan1' || clean === 'pemulihani' || clean === 'pemulihan1') rowObj['Masa Pemulihan I'] = v;
                  if (clean === 'masapemulihanii' || clean === 'masapemulihan2' || clean === 'pemulihanii' || clean === 'pemulihan2') rowObj['Masa Pemulihan II'] = v;
                  if (clean === 'alasankonseling' || clean === 'alasankonselingpembinaan' || clean === 'alasanpembinaan' || clean === 'topikkonseling' || clean === 'catatankonseling' || clean === 'konselingalasan' || clean === 'alasankonseling1' || clean === 'alasankonselingi') rowObj['Alasan Konseling'] = v;
                  if (
                    clean === 'alasansuratperingatan' || 
                    clean === 'alasansp' || 
                    clean === 'alasanspdk' || 
                    clean === 'alasansanksispdk' || 
                    clean === 'alasansanksi' || 
                    clean === 'alasanpelanggaran' || 
                    clean === 'alasanst' || 
                    clean === 'alasansuratteguran' || 
                    clean === 'alasansp1' || 
                    clean === 'alasansp2' || 
                    clean === 'alasansp3' || 
                    clean === 'alasansppt' || 
                    clean === 'pelanggaran' || 
                    clean === 'kasus' || 
                    clean === 'uraianpelanggaran' || 
                    clean === 'uraianmasalah' || 
                    clean === 'deskripsimasalah' || 
                    clean === 'alasansanksidisiplin' || 
                    clean === 'alasanperingatan' || 
                    clean === 'alasan'
                  ) rowObj['Alasan Surat Peringatan'] = v;
                  if (clean === 'keterangansp' || clean === 'keterangan' || clean === 'catatan') rowObj['Keterangan SP'] = v;
                  if (clean === 'pernahspstsebelumnya' || clean === 'pernahspsebelumnya' || clean === 'pernahspst' || clean === 'pernahsp' || clean === 'riwayatsp') rowObj['Pernah SP/ST Sebelumnya'] = v;
                  if (clean === 'pernahterlibatspdk' || clean === 'terlibatspdk' || clean === 'spdk' || clean === 'statusspdk') rowObj['Pernah Terlibat SPDK'] = v;
                  if (clean === 'kronologikejadianspdk' || clean === 'kronologikejadian' || clean === 'kronologispdk' || clean === 'kronologi' || clean === 'riwayatkejadian') rowObj['Kronologi Kejadian SPDK'] = v;
                  if (clean === 'kategorisanksispdk' || clean === 'kategorispdk' || clean === 'kategorisanksi' || clean === 'kategoripelanggaran' || clean === 'jenispelanggaran') rowObj['Kategori Sanksi SPDK'] = v;
                  if (clean === 'tindakandisiplinspdk' || clean === 'tindakandisiplin' || clean === 'tindakanspdk' || clean === 'sanksispdk' || clean === 'tindakan') rowObj['Tindakan Disiplin SPDK'] = v;
                }
                return rowObj;
              });
              setParsedCounselingRows(mappedCounseling);
              setDetectedCounselingHeaders(rawFields);
              setParsedRows([]);
              setParsedAttendanceRows([]);
              setActivePreviewTab('konseling');
            } else if (isAttendance && !isMaster) {
              setParsedAttendanceRows(results.data);
              setDetectedAttendanceHeaders(rawFields);
              setParsedRows([]);
              setParsedCounselingRows([]);
              setActivePreviewTab('absensi');
            } else {
              setParsedRows(results.data);
              setDetectedHeaders(rawFields);
              if (isCounseling) {
                setParsedCounselingRows(results.data);
                setDetectedCounselingHeaders(rawFields);
              }
              if (isAttendance) {
                setParsedAttendanceRows(results.data);
                setDetectedAttendanceHeaders(rawFields);
              }
              setActivePreviewTab('master');
            }
          } else {
            setErrorMsg("File CSV kosong atau tidak memiliki format baris yang valid.");
          }
        },
        error: (err) => {
          setIsParsing(false);
          setErrorMsg("Gagal membaca CSV: " + err.message);
        }
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      try {
        const buffer = await selectedFile.arrayBuffer();
        const data = new Uint8Array(buffer);

        // 1. Extract embedded images if .xlsx
        let cellImageMap = new Map<string, string>();
        let sortedPhotos: string[] = [];
        if (fileName.endsWith('.xlsx')) {
          const imgResult = await extractImagesFromXlsx(data);
          cellImageMap = imgResult.cellImageMap;
          sortedPhotos = imgResult.sortedPhotos;
        }

        // 2. Read workbook with full attributes
        const workbook = XLSX.read(data, { 
          type: 'array',
          cellDates: true,
          cellFormula: true,
          cellStyles: true
        });

        const sheetNames = workbook.SheetNames || [];
        setDetectedSheets(sheetNames);

        // Check each sheet to determine its role
        let masterSheetName: string | undefined;
        let attendanceSheetName: string | undefined;
        let counselingSheetName: string | undefined;

        for (const sName of sheetNames) {
          const l = sName.toLowerCase();
          const ws = workbook.Sheets[sName];
          if (!ws || !ws['!ref']) continue;

          if (l.includes('konseling') || l.includes('spdk') || l.includes('sanksi') || l.includes('disiplin')) {
            counselingSheetName = sName;
          } else if (l.includes('absen') || l.includes('absensi') || l.includes('attendance') || l.includes('kehadiran')) {
            attendanceSheetName = sName;
          } else if (l.includes('database') || l.includes('master') || l.includes('karyawan')) {
            masterSheetName = sName;
          }
        }

        // If not found by name, check content of sheets
        if (sheetNames.length === 1) {
          const singleWs = workbook.Sheets[sheetNames[0]];
          const ref = singleWs ? singleWs['!ref'] : '';
          let sampleText = '';
          if (ref) {
            const range = XLSX.utils.decode_range(ref);
            for (let r = 0; r <= Math.min(3, range.e.r); r++) {
              for (let c = range.s.c; c <= range.e.c; c++) {
                const cell = singleWs[XLSX.utils.encode_cell({ r, c })];
                if (cell && cell.v !== undefined) {
                  sampleText += ' ' + String(cell.v).toLowerCase();
                }
              }
            }
          }

          if (sampleText.includes('konseling') || sampleText.includes('spdk') || sampleText.includes('total sp') || sampleText.includes('sanksi')) {
            counselingSheetName = sheetNames[0];
          } else if (sampleText.includes('izin') || sampleText.includes('sakit site') || sampleText.includes('sakit luar') || sampleText.includes('alpa')) {
            attendanceSheetName = sheetNames[0];
          } else {
            masterSheetName = sheetNames[0];
          }
        } else {
          if (!masterSheetName) masterSheetName = sheetNames[0];
          if (!attendanceSheetName && sheetNames.length > 1) {
            attendanceSheetName = sheetNames.find(s => s !== masterSheetName && s !== counselingSheetName);
          }
          if (!counselingSheetName && sheetNames.length > 2) {
            counselingSheetName = sheetNames.find(s => s !== masterSheetName && s !== attendanceSheetName);
          }
        }

        let masterRows: any[] = [];
        let masterHeaders: string[] = [];
        let attRows: any[] = [];
        let attHeaders: string[] = [];
        let counselRows: any[] = [];
        let counselHeaders: string[] = [];

        // Parse Master Sheet
        if (masterSheetName && workbook.Sheets[masterSheetName]) {
          const wsMaster = workbook.Sheets[masterSheetName];
          if (wsMaster && wsMaster['!ref']) {
            const range = XLSX.utils.decode_range(wsMaster['!ref']);
            
            // Find header row
            let headerRowIdx = 0;
            for (let r = 0; r <= Math.min(3, range.e.r); r++) {
              let rowCells: string[] = [];
              for (let c = range.s.c; c <= range.e.c; c++) {
                const cell = wsMaster[XLSX.utils.encode_cell({ r, c })];
                if (cell && cell.v !== undefined) {
                  rowCells.push(String(cell.v).toLowerCase().trim());
                }
              }
              const rowText = rowCells.join(' ');
              if (rowText.includes('nik') || rowText.includes('nama') || rowText.includes('ktp') || rowText.includes('status')) {
                headerRowIdx = r;
                break;
              }
            }

            const headers: { colIdx: number; name: string; clean: string }[] = [];
            for (let c = range.s.c; c <= range.e.c; c++) {
              const cell = wsMaster[XLSX.utils.encode_cell({ r: headerRowIdx, c })];
              let headerName = cell && cell.v !== undefined ? String(cell.v).trim() : '';

              if (!headerName && c < MASTER_EMPLOYEE_COLUMNS.length) {
                headerName = MASTER_EMPLOYEE_COLUMNS[c];
              } else if (!headerName) {
                if (c === 29) {
                  headerName = 'Foto';
                } else {
                  headerName = `Col_${XLSX.utils.encode_col(c)}`;
                }
              }

              const clean = headerName.toLowerCase().replace(/[^a-z0-9]/g, '');
              headers.push({ colIdx: c, name: headerName, clean });
              masterHeaders.push(headerName);
            }

            let rowCounter = 0;
            for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
              const rowObj: Record<string, any> = {};
              let hasAnyData = false;

              for (const h of headers) {
                const cellAddr = XLSX.utils.encode_cell({ r, c: h.colIdx });
                const cell = wsMaster[cellAddr];
                const isFotoCol = h.clean === 'foto' || h.clean === 'photo' || h.clean === 'avatar' || h.clean === 'gambar' || h.clean === 'image' || h.colIdx === 29;
                const isDateCol = h.clean.includes('tanggal') || h.clean.includes('tgl') || h.clean === 'dohawal' || h.clean === 'doh';

                let val: any = '';

                // Embedded image check
                const imgKey = `${r}_${h.colIdx}`;
                if (cellImageMap.has(imgKey)) {
                  val = cellImageMap.get(imgKey);
                } else if (isFotoCol && cellImageMap.has(`row_${r}`)) {
                  val = cellImageMap.get(`row_${r}`);
                } else if (isFotoCol && rowCounter === 0 && (cellImageMap.has('1_29') || cellImageMap.has('0_29') || cellImageMap.has('row_1') || cellImageMap.has('row_0'))) {
                  val = cellImageMap.get('1_29') || cellImageMap.get('0_29') || cellImageMap.get('row_1') || cellImageMap.get('row_0');
                } else if (isFotoCol && cellImageMap.has(`seq_${rowCounter}`)) {
                  val = cellImageMap.get(`seq_${rowCounter}`);
                } else if (isFotoCol && sortedPhotos[rowCounter]) {
                  val = sortedPhotos[rowCounter];
                } else if (cell && cell.l && cell.l.Target) {
                  val = cell.l.Target;
                } else if (cell && cell.f) {
                  const fStr = String(cell.f);
                  const linkMatch = fStr.match(/HYPERLINK\s*\(\s*["']([^"']+)["']/i) || fStr.match(/IMAGE\s*\(\s*["']([^"']+)["']/i);
                  if (linkMatch && linkMatch[1]) {
                    val = linkMatch[1];
                  } else {
                    val = cell.w !== undefined ? cell.w : cell.v !== undefined ? cell.v : '';
                  }
                } else if (cell) {
                  if (isDateCol) {
                    val = formatExcelDate(cell.v !== undefined ? cell.v : cell.w);
                  } else {
                    val = cell.w !== undefined ? String(cell.w).trim() : cell.v !== undefined ? String(cell.v).trim() : '';
                  }
                }

                if (isDateCol && typeof val === 'string' && /^\d{5}$/.test(val)) {
                  val = formatExcelDate(Number(val));
                }

                if (val !== undefined && val !== null && val !== '') {
                  hasAnyData = true;
                }

                rowObj[h.name] = val;
                if (h.clean === 'nik') rowObj['NIK'] = val;
                if (h.clean === 'nama' || h.clean === 'name') rowObj['Nama'] = val;
                if (h.clean === 'jabatanbaru' || h.clean === 'jabatan') rowObj['Jabatan Baru'] = val;
                if (h.clean === 'statuskaryawan' || h.clean === 'status') rowObj['Status Karyawan'] = val;
                if (h.clean === 'tanggalefektiftidakbekerja' || h.clean === 'tgleftidakbekerja') rowObj['Tanggal Efektif Tidak Bekerja'] = val;
                if (h.clean === 'sponsor') rowObj['Sponsor'] = val;
                if (isFotoCol) rowObj['Foto'] = val;
              }

              // Fallback for Foto if missing
              if (!rowObj['Foto'] || rowObj['Foto'] === '-') {
                if (cellImageMap.has(`${r}_29`)) {
                  rowObj['Foto'] = cellImageMap.get(`${r}_29`);
                } else if (cellImageMap.has(`row_${r}`)) {
                  rowObj['Foto'] = cellImageMap.get(`row_${r}`);
                } else if (rowCounter === 0 && (cellImageMap.has('1_29') || cellImageMap.has('0_29') || cellImageMap.has('row_1') || cellImageMap.has('row_0'))) {
                  rowObj['Foto'] = cellImageMap.get('1_29') || cellImageMap.get('0_29') || cellImageMap.get('row_1') || cellImageMap.get('row_0');
                } else if (sortedPhotos[rowCounter]) {
                  rowObj['Foto'] = sortedPhotos[rowCounter];
                }
              }

              const hasNikOrName = rowObj['NIK'] || rowObj['Nama'] || (headers[1] && rowObj[headers[1].name]);
              if (hasAnyData && hasNikOrName && String(rowObj['NIK'] || '').toUpperCase() !== 'NIK') {
                masterRows.push(rowObj);
                rowCounter++;
              }
            }
          }
        }

        // Parse Attendance Sheet if present with specialized parser
        if (attendanceSheetName && attendanceSheetName !== masterSheetName && workbook.Sheets[attendanceSheetName]) {
          const wsAtt = workbook.Sheets[attendanceSheetName];
          const attParsed = parseAttendanceWorksheet(wsAtt);
          attRows = attParsed.rows;
          attHeaders = attParsed.headers;
        }

        // Parse Counseling & SPDK Sheet if present
        if (counselingSheetName && counselingSheetName !== masterSheetName && workbook.Sheets[counselingSheetName]) {
          const wsCounsel = workbook.Sheets[counselingSheetName];
          const counselParsed = parseCounselingWorksheet(wsCounsel);
          counselRows = counselParsed.rows;
          counselHeaders = counselParsed.headers;
        }

        setParsedRows(masterRows);
        setDetectedHeaders(masterHeaders);
        setParsedAttendanceRows(attRows);
        setDetectedAttendanceHeaders(attHeaders);
        setParsedCounselingRows(counselRows);
        setDetectedCounselingHeaders(counselHeaders);
        setIsParsing(false);

        if (masterRows.length === 0 && attRows.length === 0 && counselRows.length === 0) {
          setErrorMsg("Tidak ada data karyawan, data absensi, atau data konseling/SPDK yang valid ditemukan di file Excel.");
        }
      } catch (err: any) {
        setIsParsing(false);
        setErrorMsg("Gagal membaca Excel: " + err.message);
      }
    } else {
      setIsParsing(false);
      setErrorMsg("Format file tidak didukung. Harap gunakan .csv, .xlsx, atau .xls");
    }
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0 && parsedAttendanceRows.length === 0 && parsedCounselingRows.length === 0) return;
    setIsImporting(true);
    setErrorMsg(null);
    setImportResult(null);

    const BATCH_SIZE = 20;
    const totalMasterRows = parsedRows.length;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalAttUpdated = 0;
    let totalCounselUpdated = 0;
    let totalErrors = 0;
    const allErrors: string[] = [];

    try {
      if (totalMasterRows > 0) {
        for (let i = 0; i < totalMasterRows; i += BATCH_SIZE) {
          const batch = parsedRows.slice(i, i + BATCH_SIZE);
          const currentProcessed = Math.min(i + batch.length, totalMasterRows);
          const percent = Math.round((currentProcessed / totalMasterRows) * 100);

          setImportProgress({
            current: currentProcessed,
            total: totalMasterRows,
            percent,
            message: `Mengunggah data master & foto ${currentProcessed} dari ${totalMasterRows} karyawan (${percent}%)...`
          });

          // Compress images client-side before sending over the network
          const processedBatch = await Promise.all(
            batch.map(async (row) => {
              const foto = row['Foto'] || row['foto'];
              if (foto && typeof foto === 'string' && foto.startsWith('data:image')) {
                try {
                  const compressed = await compressImageBase64(foto, 450, 0.82);
                  return { ...row, Foto: compressed };
                } catch {
                  return row;
                }
              }
              return row;
            })
          );

          // On the first batch, also pass attendanceRows and counselingRows to sync all in one shot!
          const isFirstBatch = i === 0;
          const res = await fetch('/api/employees/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-nik': inspectorNik
            },
            body: JSON.stringify({
              rows: processedBatch,
              attendanceRows: isFirstBatch ? parsedAttendanceRows : undefined,
              counselingRows: isFirstBatch ? parsedCounselingRows : undefined,
              editorNik: inspectorNik
            })
          });

          if (!res.ok) {
            const textErr = await res.text();
            throw new Error(`Server error (${res.status}): ${textErr.slice(0, 120)}`);
          }

          const data = await res.json();
          if (data.stats) {
            totalInserted += data.stats.inserted || 0;
            totalUpdated += data.stats.updated || 0;
            totalErrors += data.stats.errors || 0;
            if (data.stats.attendanceUpdated) {
              totalAttUpdated += data.stats.attendanceUpdated;
            }
            if (data.stats.counselingUpdated) {
              totalCounselUpdated += data.stats.counselingUpdated;
            }
            if (Array.isArray(data.stats.errorList)) {
              allErrors.push(...data.stats.errorList);
            }
          }
        }
      } else {
        // Only attendance or counseling rows
        setImportProgress({
          current: parsedAttendanceRows.length + parsedCounselingRows.length,
          total: parsedAttendanceRows.length + parsedCounselingRows.length,
          percent: 100,
          message: `Menyinkronkan rekap absensi & konseling/SPDK...`
        });

        const res = await fetch('/api/employees/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-nik': inspectorNik
          },
          body: JSON.stringify({
            attendanceRows: parsedAttendanceRows.length > 0 ? parsedAttendanceRows : undefined,
            counselingRows: parsedCounselingRows.length > 0 ? parsedCounselingRows : undefined,
            editorNik: inspectorNik
          })
        });

        if (!res.ok) {
          const textErr = await res.text();
          throw new Error(`Server error (${res.status}): ${textErr.slice(0, 120)}`);
        }

        const data = await res.json();
        if (data.stats) {
          totalAttUpdated += data.stats.attendanceUpdated || 0;
          totalCounselUpdated += data.stats.counselingUpdated || 0;
          totalErrors += data.stats.errors || 0;
        }
      }

      setImportResult({
        status: 'success',
        message: `Import & Sinkronisasi berhasil selesai! ${totalUpdated} master diperbarui, ${totalInserted} ditambah, ${totalAttUpdated || parsedAttendanceRows.length} absensi & ${totalCounselUpdated || parsedCounselingRows.length} data konseling/SPDK disinkronkan.`,
        stats: {
          total: totalMasterRows + parsedAttendanceRows.length + parsedCounselingRows.length,
          updated: totalUpdated,
          inserted: totalInserted,
          attendanceUpdated: totalAttUpdated || parsedAttendanceRows.length,
          counselingUpdated: totalCounselUpdated || parsedCounselingRows.length,
          errors: totalErrors,
          errorList: allErrors.slice(0, 10)
        }
      });
      onSuccess();
    } catch (err: any) {
      setImportResult({
        status: 'error',
        message: "Proses import terhenti: " + (err.message || 'Koneksi terputus.')
      });
    } finally {
      setIsImporting(false);
      setImportProgress(null);
    }
  };

  const hasNikHeader = detectedHeaders.some(h => {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean === 'nik';
  });

  const hasNameHeader = detectedHeaders.some(h => {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean === 'nama' || clean === 'name' || clean === 'employeename';
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white rounded-3xl border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900"
      >
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-[#e6f7f9] via-[#fef6e7]/40 to-white">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-[#22a7b8] text-white shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2 flex-wrap">
                <span>Import &amp; Update Database, Absensi &amp; Konseling SPDK</span>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold bg-[#e6f7f9] text-[#135e69] border border-[#a2e0e8]">
                  Multi-Sheet Excel
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Mendukung 1 workbook berisi Sheet <strong>DataBase Karyawan</strong>, Sheet <strong>Absensi karyawan</strong> &amp; Sheet <strong>Konseling &amp; SPDK</strong>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* Download Template Strip */}
          <div className="p-4 rounded-2xl bg-[#e6f7f9] border border-[#a2e0e8] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-[#135e69] flex items-center gap-1.5">
                <Download className="w-4 h-4 text-[#22a7b8]" />
                Template Excel Multi-Sheet (Master, Absensi, Konseling &amp; SPDK)
              </h4>
              <p className="text-[11px] text-[#18535a] mt-0.5">
                Template ini mencakup <strong>Sheet 1: DataBase Karyawan</strong>, <strong>Sheet 2: Absensi karyawan</strong> &amp; <strong>Sheet 3: Konseling &amp; SPDK</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadTemplateCsv}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-white border border-[#a2e0e8] hover:bg-[#e6f7f9] text-[#135e69] font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-[#22a7b8]" />
                Download CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplateExcel}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-[#22a7b8] hover:bg-[#1b8f9e] text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Download Template Excel (.xlsx)
              </button>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
              file 
                ? 'border-[#22a7b8] bg-[#e6f7f9]/60' 
                : 'border-slate-300 hover:border-[#22a7b8] hover:bg-[#e6f7f9]/30 bg-white'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv, .xlsx, .xls"
              className="hidden"
            />
            
            <div className="flex flex-col items-center justify-center">
              <span className={`p-3.5 rounded-2xl mb-3 shadow-xs ${
                file ? 'bg-[#22a7b8] text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <UploadCloud className="w-7 h-7" />
              </span>

              {file ? (
                <div>
                  <p className="font-bold text-sm text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Ukuran: {(file.size / 1024).toFixed(1)} KB • Klik atau seret file lain untuk mengganti
                  </p>
                  {detectedSheets.length > 0 && (
                    <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-slate-500 font-semibold">Sheet Terdeteksi:</span>
                      {detectedSheets.map((s, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-white text-[#135e69] border border-[#a2e0e8]">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <p className="font-bold text-sm text-slate-800">
                    Klik atau Seret file Excel (.xlsx / .xls) ke sini
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Mendukung 1 file dengan <strong>Sheet Database Karyawan</strong>, <strong>Sheet Absensi karyawan</strong> &amp; <strong>Sheet Konseling &amp; SPDK</strong>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center flex items-center justify-center gap-3">
              <RefreshCw className="w-5 h-5 text-[#22a7b8] animate-spin" />
              <span className="text-xs font-semibold text-slate-700">Sedang membaca sheet dan memvalidasi file Excel...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {/* Import Result Feedback */}
          {importResult && (
            <div className={`p-4 rounded-2xl text-xs border ${
              importResult.status === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                {importResult.status === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                )}
                <span>{importResult.message}</span>
              </div>
              {importResult.stats && (
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-emerald-200/60 font-semibold">
                  <div className="p-2 rounded-xl bg-white/80 border border-emerald-200/60 text-center">
                    <p className="text-[10px] uppercase text-slate-500">Total Baris</p>
                    <p className="text-sm font-extrabold text-slate-800">{importResult.stats.total}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 border border-emerald-200/60 text-center">
                    <p className="text-[10px] uppercase text-emerald-600">Diperbarui</p>
                    <p className="text-sm font-extrabold text-emerald-700">{importResult.stats.updated}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 border border-emerald-200/60 text-center">
                    <p className="text-[10px] uppercase text-[#22a7b8]">Absensi</p>
                    <p className="text-sm font-extrabold text-[#135e69]">{importResult.stats.attendanceUpdated || 0}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 border border-emerald-200/60 text-center">
                    <p className="text-[10px] uppercase text-purple-600">Konseling &amp; SPDK</p>
                    <p className="text-sm font-extrabold text-purple-700">{importResult.stats.counselingUpdated || 0}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 border border-emerald-200/60 text-center">
                    <p className="text-[10px] uppercase text-rose-600">Gagal / Skip</p>
                    <p className="text-sm font-extrabold text-rose-700">{importResult.stats.errors}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parsed Preview Section */}
          {(parsedRows.length > 0 || parsedAttendanceRows.length > 0 || parsedCounselingRows.length > 0) && (
            <div className="space-y-3">
              {/* Tab Selector for Multi-Sheet Preview */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {parsedRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('master')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activePreviewTab === 'master'
                          ? 'bg-[#22a7b8] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Sheet Data Karyawan ({parsedRows.length})</span>
                    </button>
                  )}
                  {parsedAttendanceRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('absensi')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activePreviewTab === 'absensi'
                          ? 'bg-[#f09b13] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Sheet Absensi ({parsedAttendanceRows.length})</span>
                    </button>
                  )}
                  {parsedCounselingRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setActivePreviewTab('konseling')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        activePreviewTab === 'konseling'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Sheet Konseling &amp; SPDK ({parsedCounselingRows.length})</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                  {parsedRows.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full font-bold bg-[#e6f7f9] text-[#135e69] border border-[#a2e0e8]">
                      ✓ {parsedRows.length} Karyawan
                    </span>
                  )}
                  {parsedAttendanceRows.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full font-bold bg-[#fef6e7] text-[#9a5b02] border border-[#fad79a]">
                      ✓ {parsedAttendanceRows.length} Absensi
                    </span>
                  )}
                  {parsedCounselingRows.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      ✓ {parsedCounselingRows.length} Konseling/SPDK
                    </span>
                  )}
                </div>
              </div>

              {/* Master Sheet Preview Table */}
              {activePreviewTab === 'master' && parsedRows.length > 0 && (
                <div className="rounded-2xl border border-slate-300 overflow-hidden bg-white shadow-xs max-h-60 overflow-x-auto overflow-y-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 sticky top-0 z-10 text-[11px]">
                      <tr>
                        <th className="p-2.5 whitespace-nowrap">No</th>
                        <th className="p-2.5 whitespace-nowrap">NIK</th>
                        <th className="p-2.5 whitespace-nowrap">Nama</th>
                        <th className="p-2.5 whitespace-nowrap">Jabatan</th>
                        <th className="p-2.5 whitespace-nowrap">Status</th>
                        <th className="p-2.5 whitespace-nowrap">Tgl Efektif Tidak Bekerja</th>
                        <th className="p-2.5 whitespace-nowrap">Sponsor</th>
                        <th className="p-2.5 whitespace-nowrap">Foto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {parsedRows.slice(0, 5).map((row, idx) => {
                        const nik = row['NIK'] || row['nik'] || row['Nik'] || '-';
                        const name = row['Nama'] || row['nama'] || row['Name'] || '-';
                        const jabatan = row['Jabatan Baru'] || row['Jabatan'] || row['jabatan'] || '-';
                        const status = row['Status Karyawan'] || row['Status'] || row['status'] || '-';
                        const tglOff = row['Tanggal Efektif Tidak Bekerja'] || row['tanggalEfektifTidakBekerja'] || '-';
                        const sponsor = row['Sponsor'] || row['sponsor'] || '-';
                        const foto = row['Foto'] || row['foto'] || row['Photo'] || row['avatar'] || '';

                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-extrabold font-mono text-[#135e69]">{nik}</td>
                            <td className="p-2.5 font-bold text-slate-900">{name}</td>
                            <td className="p-2.5 text-slate-600">{jabatan}</td>
                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                {status}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600 font-mono text-[11px]">{tglOff || '-'}</td>
                            <td className="p-2.5 text-slate-600">{sponsor}</td>
                            <td className="p-2.5">
                              {foto && foto !== '-' ? (
                                <div className="flex items-center gap-1.5">
                                  {foto.startsWith('data:image') || foto.startsWith('http') ? (
                                    <img 
                                      src={foto} 
                                      alt="Avatar" 
                                      className="w-6 h-6 rounded-full object-cover border border-[#a2e0e8] shadow-xs shrink-0" 
                                    />
                                  ) : (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#e6f7f9] text-[#22a7b8] border border-[#a2e0e8]">
                                      Link
                                    </span>
                                  )}
                                  <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Ada
                                  </span>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[10px]">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Attendance Sheet Preview Table */}
              {(activePreviewTab === 'absensi' || (parsedRows.length === 0 && parsedAttendanceRows.length > 0 && activePreviewTab !== 'konseling')) && (
                <div className="rounded-2xl border border-slate-300 overflow-hidden bg-white shadow-xs max-h-60 overflow-x-auto overflow-y-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#fef6e7] text-[#9a5b02] font-bold border-b border-[#fad79a] sticky top-0 z-10 text-[11px]">
                      <tr>
                        <th className="p-2.5 whitespace-nowrap">No</th>
                        <th className="p-2.5 whitespace-nowrap">Employee Name</th>
                        <th className="p-2.5 whitespace-nowrap text-center">Izin</th>
                        <th className="p-2.5 whitespace-nowrap text-center">Izin Khusus</th>
                        <th className="p-2.5 whitespace-nowrap text-center">Sakit</th>
                        <th className="p-2.5 whitespace-nowrap text-center text-rose-600">Alpa</th>
                        <th className="p-2.5 whitespace-nowrap">Tanggal Izin</th>
                        <th className="p-2.5 whitespace-nowrap">Izin Khusus (Tgl)</th>
                        <th className="p-2.5 whitespace-nowrap">Sakit Site (SS)</th>
                        <th className="p-2.5 whitespace-nowrap">Sakit Luar (SL)</th>
                        <th className="p-2.5 whitespace-nowrap">Alpa (Tgl)</th>
                        <th className="p-2.5 whitespace-nowrap">Alasan Izin</th>
                        <th className="p-2.5 whitespace-nowrap">Alasan Izin Khusus</th>
                        <th className="p-2.5 whitespace-nowrap">Alasan Sakit Site</th>
                        <th className="p-2.5 whitespace-nowrap">Alasan Sakit Luar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                      {parsedAttendanceRows.slice(0, 5).map((row, idx) => {
                        const name = row['Employee Name'] || row['Nama'] || row['name'] || '-';
                        const izin = row['Izin'] || row['izin'] || '-';
                        const izinKhusus = row['Izin Khusus'] || row['izinkhusus'] || '-';
                        const sakit = row['Sakit'] || row['sakit'] || '-';
                        const alpa = row['Alpa'] || row['alpa'] || '-';
                        const tglIzin = row['Tanggal Izin'] || row['tanggalizin'] || '-';
                        const tglIzinKhusus = row['Izin Khusus (Tanggal)'] || row['Tanggal Izin Khusus'] || row['tanggalizinkhusus'] || '-';
                        const ss = row['Sakit Site (SS)'] || row['Sakit Site'] || row['sakitsitess'] || '-';
                        const sl = row['Sakit Luar (SL)'] || row['Sakit Luar'] || row['sakitluarsl'] || '-';
                        const tglAlpa = row['Alpa (Tanggal)'] || row['Tanggal Alpa'] || row['tanggalalpa'] || '-';
                        const alasanIzin = row['Alasan Izin'] || row['Alasan'] || row['alasanizin'] || '-';
                        const alasanIzinKhusus = row['Alasan Izin Khusus'] || row['alasanizinkhusus'] || '-';
                        const alasanSakitSite = row['Alasan Sakit Site (SS)'] || row['Alasan Sakit Site'] || row['alasansakitsite'] || '-';
                        const alasanSakitLuar = row['Alasan Sakit Luar (SL)'] || row['Alasan Sakit Luar'] || row['alasansakitluar'] || '-';

                        return (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-900">{name}</td>
                            <td className="p-2.5 text-center font-extrabold text-[#135e69]">{izin}</td>
                            <td className="p-2.5 text-center font-bold text-slate-700">{izinKhusus}</td>
                            <td className="p-2.5 text-center font-extrabold text-[#f09b13]">{sakit}</td>
                            <td className="p-2.5 text-center font-bold text-rose-600">{alpa}</td>
                            <td className="p-2.5 text-slate-600 font-mono text-[11px] max-w-[120px] truncate" title={tglIzin}>{tglIzin}</td>
                            <td className="p-2.5 text-slate-600 font-mono text-[11px] max-w-[120px] truncate" title={tglIzinKhusus}>{tglIzinKhusus}</td>
                            <td className="p-2.5 text-slate-600 font-mono text-[11px] max-w-[120px] truncate" title={ss}>{ss}</td>
                            <td className="p-2.5 text-slate-600 font-mono text-[11px] max-w-[120px] truncate" title={sl}>{sl}</td>
                            <td className="p-2.5 text-slate-600 font-mono text-[11px] max-w-[120px] truncate" title={tglAlpa}>{tglAlpa}</td>
                            <td className="p-2.5 text-slate-600 text-[11px] max-w-[140px] truncate" title={alasanIzin}>{alasanIzin}</td>
                            <td className="p-2.5 text-slate-600 text-[11px] max-w-[140px] truncate" title={alasanIzinKhusus}>{alasanIzinKhusus}</td>
                            <td className="p-2.5 text-slate-600 text-[11px] max-w-[140px] truncate" title={alasanSakitSite}>{alasanSakitSite}</td>
                            <td className="p-2.5 text-slate-600 text-[11px] max-w-[140px] truncate" title={alasanSakitLuar}>{alasanSakitLuar}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Counseling & SPDK Preview Table */}
              {(activePreviewTab === 'konseling' || (parsedRows.length === 0 && parsedAttendanceRows.length === 0 && parsedCounselingRows.length > 0)) && (
                <div className="rounded-2xl border border-purple-200 overflow-hidden bg-white shadow-xs max-h-60 overflow-x-auto overflow-y-auto text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-purple-50 text-purple-900 font-bold border-b border-purple-200 sticky top-0 z-10 text-[11px]">
                      <tr>
                        <th className="p-2.5 whitespace-nowrap">No</th>
                        <th className="p-2.5 whitespace-nowrap">NIK</th>
                        <th className="p-2.5 whitespace-nowrap">Nama Karyawan</th>
                        <th className="p-2.5 whitespace-nowrap text-center">Total SP</th>
                        <th className="p-2.5 whitespace-nowrap">Bulan Konseling</th>
                        <th className="p-2.5 whitespace-nowrap">ST</th>
                        <th className="p-2.5 whitespace-nowrap">SP I</th>
                        <th className="p-2.5 whitespace-nowrap">SP II</th>
                        <th className="p-2.5 whitespace-nowrap">SP III</th>
                        <th className="p-2.5 whitespace-nowrap">SPPT</th>
                        <th className="p-2.5 whitespace-nowrap">Masa Berlaku</th>
                        <th className="p-2.5 whitespace-nowrap">Pemulihan I &amp; II</th>
                        <th className="p-2.5 whitespace-nowrap">Alasan Konseling</th>
                        <th className="p-2.5 whitespace-nowrap">Alasan SP</th>
                        <th className="p-2.5 whitespace-nowrap">SPDK &amp; Kronologi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-purple-100 font-medium text-slate-800">
                      {parsedCounselingRows.slice(0, 5).map((row, idx) => {
                        const nik = row['NIK'] || row['nik'] || '-';
                        const name = row['Nama Karyawan'] || row['Nama'] || row['nama'] || '-';
                        const totalSp = row['Total SP'] || row['totalSp'] || '0';
                        const bln = row['Bulan Konseling'] || row['bulanKonseling'] || '-';
                        const st = row['ST'] || row['st'] || '-';
                        const sp1 = row['SP I'] || row['SP 1'] || row['sp1'] || '-';
                        const sp2 = row['SP II'] || row['SP 2'] || row['sp2'] || '-';
                        const sp3 = row['SP III'] || row['SP 3'] || row['sp3'] || '-';
                        const sppt = row['SPPT'] || row['sppt'] || row['sp1sppt'] || '-';
                        const masa = row['Masa Berlaku Sanksi'] || row['masaBerlakuSanksi'] || '-';
                        const p1 = row['Masa Pemulihan I'] || row['masaPemulihan1'] || '-';
                        const p2 = row['Masa Pemulihan II'] || row['masaPemulihan2'] || '-';
                        const alasanKonseling = row['Alasan Konseling'] || row['alasanKonseling'] || row['alasanPembinaan'] || '-';
                        const alasan = row['Alasan Surat Peringatan'] || row['Alasan SP'] || row['alasanSp'] || '-';
                        const spdk = row['Kronologi Kejadian SPDK'] || row['kronologiSpdk'] || row['Pernah Terlibat SPDK'] || '-';

                        return (
                          <tr key={idx} className="hover:bg-purple-50/50 transition-colors">
                            <td className="p-2.5 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-2.5 font-extrabold font-mono text-purple-700">{nik}</td>
                            <td className="p-2.5 font-bold text-slate-900">{name}</td>
                            <td className="p-2.5 text-center font-extrabold text-rose-600">{totalSp}</td>
                            <td className="p-2.5 text-slate-600 font-mono text-[11px]">{bln}</td>
                            <td className="p-2.5 text-slate-700 text-[11px]">{st}</td>
                            <td className="p-2.5 text-amber-700 font-semibold text-[11px]">{sp1}</td>
                            <td className="p-2.5 text-orange-700 font-semibold text-[11px]">{sp2}</td>
                            <td className="p-2.5 text-rose-700 font-semibold text-[11px]">{sp3}</td>
                            <td className="p-2.5 text-rose-900 font-bold text-[11px]">{sppt}</td>
                            <td className="p-2.5 text-slate-600 font-mono text-[11px]">{masa}</td>
                            <td className="p-2.5 text-slate-600 font-mono text-[11px]">{p1 !== '-' ? `${p1} / ${p2}` : '-'}</td>
                            <td className="p-2.5 text-teal-700 text-[11px] max-w-[140px] truncate" title={alasanKonseling}>{alasanKonseling}</td>
                            <td className="p-2.5 text-slate-600 text-[11px] max-w-[140px] truncate" title={alasan}>{alasan}</td>
                            <td className="p-2.5 text-slate-600 text-[11px] max-w-[140px] truncate" title={spdk}>{spdk}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <p className="text-[11px] text-slate-500 text-right">
                Menampilkan 5 baris pertama dari sheet yang dipilih.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white">
          <div className="flex-1">
            {isImporting && importProgress && (
              <div className="space-y-1.5 mr-0 sm:mr-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#22a7b8] flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {importProgress.message}
                  </span>
                  <span className="text-slate-500 font-mono">{importProgress.percent}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-[#22a7b8] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${importProgress.percent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              disabled={isImporting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
            >
              Tutup
            </button>

            <button
              type="button"
              disabled={(parsedRows.length === 0 && parsedAttendanceRows.length === 0 && parsedCounselingRows.length === 0) || isImporting || isParsing}
              onClick={handleExecuteImport}
              className="px-5 py-2.5 rounded-xl bg-[#22a7b8] hover:bg-[#1b8f9e] text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>
                    Proses ({importProgress ? `${importProgress.current}/${importProgress.total}` : 'Memulai...'})
                  </span>
                </>
              ) : (
                <>
                  <span>Mulai Import &amp; Sinkronkan Data</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
