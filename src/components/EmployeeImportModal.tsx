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

interface EmployeeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  inspectorNik: string;
}

export function EmployeeImportModal({ isOpen, onClose, onSuccess, inspectorNik }: EmployeeImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
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
    const sampleRow = [
      MASTER_EMPLOYEE_COLUMNS,
      [
        "1",
        "Contoh Nama Karyawan",
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
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet(sampleRow);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database Karyawan");
    XLSX.writeFile(wb, "template_database_karyawan_30kolom_preplab.xlsx");
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

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setErrorMsg(null);
    setImportResult(null);
    setParsedRows([]);
    setDetectedHeaders([]);

    const fileName = selectedFile.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setIsParsing(false);
          if (results.data && results.data.length > 0) {
            setParsedRows(results.data);
            if (results.meta && results.meta.fields) {
              setDetectedHeaders(results.meta.fields);
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

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet || !worksheet['!ref']) {
          setIsParsing(false);
          setErrorMsg("Sheet Excel kosong.");
          return;
        }

        const range = XLSX.utils.decode_range(worksheet['!ref']);

        // Find header row (check row 0, 1, 2)
        let headerRowIdx = 0;
        for (let r = 0; r <= Math.min(3, range.e.r); r++) {
          let rowCells: string[] = [];
          for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
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

        // Build header mapping: colIndex -> headerName
        const headers: { colIdx: number; name: string; clean: string }[] = [];
        const detectedHeaderNames: string[] = [];

        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = worksheet[XLSX.utils.encode_cell({ r: headerRowIdx, c })];
          let headerName = cell && cell.v !== undefined ? String(cell.v).trim() : '';

          // Fallback to MASTER_EMPLOYEE_COLUMNS if header text is blank
          if (!headerName && c < MASTER_EMPLOYEE_COLUMNS.length) {
            headerName = MASTER_EMPLOYEE_COLUMNS[c];
          } else if (!headerName) {
            // Column AD is index 29 (30th column)
            if (c === 29) {
              headerName = 'Foto';
            } else {
              headerName = `Col_${XLSX.utils.encode_col(c)}`;
            }
          }

          const clean = headerName.toLowerCase().replace(/[^a-z0-9]/g, '');
          headers.push({ colIdx: c, name: headerName, clean });
          detectedHeaderNames.push(headerName);
        }

        // Ensure "Foto" is recognized if column AD (index 29) exists
        if (headers.some(h => h.colIdx === 29) && !headers.some(h => h.clean === 'foto' || h.clean === 'photo')) {
          const col29 = headers.find(h => h.colIdx === 29);
          if (col29) {
            col29.name = 'Foto';
            col29.clean = 'foto';
          }
        }

        setDetectedHeaders(detectedHeaderNames);

        // Process data rows
        const rows: any[] = [];
        let rowCounter = 0;

        for (let r = headerRowIdx + 1; r <= range.e.r; r++) {
          const rowObj: Record<string, any> = {};
          let hasAnyData = false;

          for (const h of headers) {
            const cellAddr = XLSX.utils.encode_cell({ r, c: h.colIdx });
            const cell = worksheet[cellAddr];
            const isFotoCol = h.clean === 'foto' || h.clean === 'photo' || h.clean === 'avatar' || h.clean === 'gambar' || h.clean === 'image' || h.colIdx === 29;
            const isDateCol = h.clean.includes('tanggal') || h.clean.includes('tgl') || h.clean === 'dohawal' || h.clean === 'doh';

            let val: any = '';

            // 1. Check embedded image in xlsx zip
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
            }
            // 2. Check hyperlink Target
            else if (cell && cell.l && cell.l.Target) {
              val = cell.l.Target;
            }
            // 3. Check formula
            else if (cell && cell.f) {
              const fStr = String(cell.f);
              const linkMatch = fStr.match(/HYPERLINK\s*\(\s*["']([^"']+)["']/i) || fStr.match(/IMAGE\s*\(\s*["']([^"']+)["']/i);
              if (linkMatch && linkMatch[1]) {
                val = linkMatch[1];
              } else {
                val = cell.w !== undefined ? cell.w : cell.v !== undefined ? cell.v : '';
              }
            }
            // 4. Check formatted date or standard value
            else if (cell) {
              if (isDateCol) {
                val = formatExcelDate(cell.v !== undefined ? cell.v : cell.w);
              } else {
                val = cell.w !== undefined ? String(cell.w).trim() : cell.v !== undefined ? String(cell.v).trim() : '';
              }
            }

            // Also format any date serial number in 'tanggal_efektif_tidak_bekerja' or date columns
            if (isDateCol && typeof val === 'string' && /^\d{5}$/.test(val)) {
              val = formatExcelDate(Number(val));
            }

            if (val !== undefined && val !== null && val !== '') {
              hasAnyData = true;
            }

            rowObj[h.name] = val;

            // Normalize standard key access
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
            rows.push(rowObj);
            rowCounter++;
          }
        }

        setIsParsing(false);
        if (rows.length > 0) {
          setParsedRows(rows);
        } else {
          setErrorMsg("Tidak ada data karyawan yang valid ditemukan di sheet Excel.");
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
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    setErrorMsg(null);
    setImportResult(null);

    const BATCH_SIZE = 20;
    const totalRows = parsedRows.length;
    let totalInserted = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    const allErrors: string[] = [];

    try {
      for (let i = 0; i < totalRows; i += BATCH_SIZE) {
        const batch = parsedRows.slice(i, i + BATCH_SIZE);
        const currentProcessed = Math.min(i + batch.length, totalRows);
        const percent = Math.round((currentProcessed / totalRows) * 100);

        setImportProgress({
          current: currentProcessed,
          total: totalRows,
          percent,
          message: `Mengunggah data & foto ${currentProcessed} dari ${totalRows} karyawan (${percent}%)...`
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

        const res = await fetch('/api/employees/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-nik': inspectorNik
          },
          body: JSON.stringify({
            rows: processedBatch,
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
          if (Array.isArray(data.stats.errorList)) {
            allErrors.push(...data.stats.errorList);
          }
        }
      }

      setImportResult({
        status: 'success',
        message: `Import berhasil selesai! ${totalUpdated} diperbarui, ${totalInserted} ditambahkan ke sistem.`,
        stats: {
          total: totalRows,
          updated: totalUpdated,
          inserted: totalInserted,
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
    return clean === 'nama' || clean === 'name';
  });

  const hasFotoHeader = detectedHeaders.some(h => {
    const clean = h.toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean === 'foto' || clean === 'photo' || clean === 'avatar';
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-white rounded-3xl border border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900"
      >
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </span>
            <div>
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <span>Import & Update Database Karyawan</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  30 Kolom Master
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Struktur kolom lengkap termasuk <strong>Tanggal Efektif Tidak Bekerja</strong> dan upload <strong>Foto ke Google Drive</strong>.
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
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-indigo-600" />
                Template Master Kolom Data Karyawan (30 Kolom Resmi)
              </h4>
              <p className="text-[11px] text-indigo-800/80 mt-0.5">
                Gunakan template ini untuk update data karyawan, tanggal efektif tidak bekerja, dan foto profil.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadTemplateCsv}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-white border border-indigo-300 hover:bg-indigo-100/50 text-indigo-900 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600" />
                Download CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadTemplateExcel}
                className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Download Excel (.xlsx)
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
                ? 'border-indigo-400 bg-indigo-50/30' 
                : 'border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20 bg-white'
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
                file ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                <UploadCloud className="w-7 h-7" />
              </span>

              {file ? (
                <div>
                  <p className="font-bold text-sm text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Ukuran: {(file.size / 1024).toFixed(1)} KB • Klik atau seret file lain untuk mengganti
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-sm text-slate-800">
                    Klik atau Seret file CSV / Excel ke sini
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Mendukung format file <strong>.csv</strong>, <strong>.xlsx</strong>, atau <strong>.xls</strong> (30 Kolom)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Drive Photo Auto-upload Note */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-2.5">
            <span className="p-1 rounded-lg bg-amber-200 text-amber-900 shrink-0 mt-0.5">
              <ImageIcon className="w-3.5 h-3.5" />
            </span>
            <div className="leading-relaxed">
              <strong>Otomatisasi Google Drive untuk Foto:</strong> Kolom <code>Foto</code> dapat diisi dengan Link Google Drive, URL gambar, atau Base64 Image. Sistem akan otomatis memproses dan menyimpannya di Google Drive Shared Storage PrepLab.
            </div>
          </div>

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center flex items-center justify-center gap-3">
              <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
              <span className="text-xs font-semibold text-slate-700">Sedang membaca dan memvalidasi file...</span>
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
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200/60 font-semibold">
                  <div className="p-2 rounded-xl bg-white/80 border border-emerald-200/60 text-center">
                    <p className="text-[10px] uppercase text-slate-500">Total Baris</p>
                    <p className="text-sm font-extrabold text-slate-800">{importResult.stats.total}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 border border-emerald-200/60 text-center">
                    <p className="text-[10px] uppercase text-emerald-600">Diperbarui</p>
                    <p className="text-sm font-extrabold text-emerald-700">{importResult.stats.updated}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-white/80 border border-emerald-200/60 text-center">
                    <p className="text-[10px] uppercase text-indigo-600">Ditambahkan</p>
                    <p className="text-sm font-extrabold text-indigo-700">{importResult.stats.inserted}</p>
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
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>Preview Data ({parsedRows.length} Baris Terdeteksi)</span>
                </h4>
                <div className="flex items-center gap-2 text-[11px] flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    hasNikHeader ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {hasNikHeader ? <Check className="w-3 h-3" /> : '✕'} NIK
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    hasNameHeader ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {hasNameHeader ? <Check className="w-3 h-3" /> : '✕'} Nama
                  </span>
                  {(() => {
                    const fotoCount = parsedRows.filter(r => {
                      const f = r['Foto'] || r['foto'] || r['Photo'] || r['avatar'] || '';
                      return Boolean(f && String(f).trim() && String(f).trim() !== '-');
                    }).length;
                    return (
                      <span className={`px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                        fotoCount > 0 || hasFotoHeader ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        <ImageIcon className="w-3 h-3" /> Kolom Foto ({fotoCount} Terdeteksi)
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Table Preview */}
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
                          <td className="p-2.5 font-bold font-mono text-indigo-700">{nik}</td>
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
                                    className="w-6 h-6 rounded-full object-cover border border-indigo-300 shadow-xs shrink-0" 
                                  />
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
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
              {parsedRows.length > 5 && (
                <p className="text-[11px] text-slate-500 text-right">
                  + Menampilkan 5 baris pertama dari total {parsedRows.length} baris.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white">
          <div className="flex-1">
            {isImporting && importProgress && (
              <div className="space-y-1.5 mr-0 sm:mr-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-indigo-700 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {importProgress.message}
                  </span>
                  <span className="text-slate-500 font-mono">{importProgress.percent}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
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
              disabled={parsedRows.length === 0 || isImporting || isParsing || !hasNikHeader}
              onClick={handleExecuteImport}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-2"
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
                  <span>Mulai Import & Update Database</span>
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
