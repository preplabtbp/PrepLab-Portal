import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  Save, Clipboard, RefreshCw, AlertCircle, CheckCircle2, AlertTriangle, 
  ArrowUp, ArrowDown, Sparkles, FileSpreadsheet, Plus, Printer, Check, X,
  Building2, Cpu, Layers
} from 'lucide-react';
import { toast } from 'sonner';

interface XrfDailyInputTabProps {
  instruments: Array<{ code: string; name: string; site?: string; methodType?: string }>;
  standards: Array<{ code: string; name: string }>;
  assignedSite?: 'GTS' | 'TBP';
  isDevOrManager?: boolean;
  onSuccessSave?: () => void;
}

interface StandardRowInput {
  standardCode: string;
  sampleLabel: string;
  sequenceNo: number;
  analyzedAt: string;
  ni: string;
  co: string;
  fe: string;
  cao: string;
  sio2: string;
  al2o3: string;
  mgo: string;
  p: string;
  s: string;
  cr2o3: string;
  mno: string;
}

// 1. Limonite 5 Standard Rows
const DEFAULT_LIMONITE_ROWS: StandardRowInput[] = [
  { standardCode: 'LIM01', sampleLabel: 'VER-LIM01', sequenceNo: 1, analyzedAt: '00:26', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM02', sampleLabel: 'VER-LIM02', sequenceNo: 2, analyzedAt: '01:01', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM03', sampleLabel: 'VER-LIM03', sequenceNo: 3, analyzedAt: '01:05', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM04', sampleLabel: 'VER-LIM04', sequenceNo: 4, analyzedAt: '01:08', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM05', sampleLabel: 'VER-LIM05', sequenceNo: 5, analyzedAt: '01:11', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
];

// 2. Saprolite 10 Standard Rows in exact sequence
const DEFAULT_SAPROLITE_ROWS: StandardRowInput[] = [
  { standardCode: 'OREAS184', sampleLabel: 'VER-OREAS184', sequenceNo: 1, analyzedAt: '00:15', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS187', sampleLabel: 'VER-OREAS187', sequenceNo: 2, analyzedAt: '00:30', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS189', sampleLabel: 'VER-OREAS189', sequenceNo: 3, analyzedAt: '00:45', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS190', sampleLabel: 'VER-OREAS190', sequenceNo: 4, analyzedAt: '01:00', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM',      sampleLabel: 'VER-LIM',      sequenceNo: 5, analyzedAt: '01:15', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'SAP16',    sampleLabel: 'VER-SAP16',    sequenceNo: 6, analyzedAt: '01:30', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS193', sampleLabel: 'VER-OREAS193', sequenceNo: 7, analyzedAt: '01:45', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'SAP19',    sampleLabel: 'VER-SAP19',    sequenceNo: 8, analyzedAt: '02:00', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS194', sampleLabel: 'VER-OREAS194', sequenceNo: 9, analyzedAt: '02:15', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'SAP',      sampleLabel: 'VER-SAP',      sequenceNo: 10, analyzedAt: '02:30', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
];

export const XrfDailyInputTab: React.FC<XrfDailyInputTabProps> = ({
  instruments,
  standards,
  assignedSite = 'GTS',
  isDevOrManager = false,
  onSuccessSave,
}) => {
  // 1. Matrix Application State: LIMONITE (5 rows) vs SAPROLITE (10 rows)
  const [selectedMatrix, setSelectedMatrix] = useState<'LIMONITE' | 'SAPROLITE'>('LIMONITE');

  // Filter instruments based on user role and assigned site
  const filteredInstruments = useMemo(() => {
    if (isDevOrManager) return instruments;
    return instruments.filter(inst => {
      const site = inst.site || (['EPSILON_A', 'EPSILON_B', 'EPSILON_D', 'SUPERMINI'].includes(inst.code) ? 'GTS' : 'TBP');
      return site === assignedSite;
    });
  }, [instruments, isDevOrManager, assignedSite]);

  // Batch Header State
  const [selectedInstrument, setSelectedInstrument] = useState(
    filteredInstruments[0]?.code || (assignedSite === 'GTS' ? 'EPSILON_A' : 'EPSILON_C')
  );
  const [verificationDate, setVerificationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [verificationTime, setVerificationTime] = useState('00:30');
  const [shift, setShift] = useState('1');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [rawPastedText, setRawPastedText] = useState('');

  // Operator Info
  const userNik = localStorage.getItem('p2h_inspector_nik') || '';
  const userName = localStorage.getItem('p2h_inspector_name') || 'Analis Laboratorium';

  // Master References for Live Auto-Calculation (Expected Values & STDEV)
  const [references, setReferences] = useState<Record<string, Record<string, any>>>({});

  // Form rows
  const [rows, setRows] = useState<StandardRowInput[]>(DEFAULT_LIMONITE_ROWS);

  // Load Reference Table
  useEffect(() => {
    fetch('/api/xrf/references')
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          const map: Record<string, Record<string, any>> = {};
          for (const item of json.data) {
            map[item.standardCode] = map[item.standardCode] || {};
            map[item.standardCode][item.elementName] = item;
          }
          setReferences(map);
        }
      })
      .catch(err => console.warn('Load references error:', err));
  }, []);

  // Update selected instrument if filtered instruments changes
  useEffect(() => {
    if (filteredInstruments.length > 0 && !filteredInstruments.some(i => i.code === selectedInstrument)) {
      setSelectedInstrument(filteredInstruments[0].code);
    }
  }, [filteredInstruments]);

  // Handle matrix application toggle
  const handleMatrixChange = (matrix: 'LIMONITE' | 'SAPROLITE') => {
    setSelectedMatrix(matrix);
    if (matrix === 'LIMONITE') {
      setRows(DEFAULT_LIMONITE_ROWS.map((r, i) => ({
        ...r,
        sampleLabel: `VER-LIM0${i + 1} ${verificationDate}`
      })));
    } else {
      setRows(DEFAULT_SAPROLITE_ROWS.map(r => ({
        ...r,
        sampleLabel: `VER-${r.standardCode} ${verificationDate}`
      })));
    }
    toast.success(`Form dialihkan ke Verifikasi ${matrix} (${matrix === 'LIMONITE' ? '5 Standar' : '10 Standar'}).`);
  };

  // Update specific cell in row
  const handleCellChange = (rowIndex: number, field: keyof StandardRowInput, value: string) => {
    const updated = [...rows];
    updated[rowIndex] = { ...updated[rowIndex], [field]: value };
    setRows(updated);
  };

  // Helper to compute calculated metrics (BC, FeNi, Sum of Conc)
  const computeRowCalculations = (r: StandardRowInput) => {
    const ni = parseFloat(r.ni) || 0;
    const co = parseFloat(r.co) || 0;
    const fe = parseFloat(r.fe) || 0;
    const cao = parseFloat(r.cao) || 0;
    const sio2 = parseFloat(r.sio2) || 0;
    const al2o3 = parseFloat(r.al2o3) || 0;
    const mgo = parseFloat(r.mgo) || 0;
    const p = parseFloat(r.p) || 0;
    const s = parseFloat(r.s) || 0;
    const cr2o3 = parseFloat(r.cr2o3) || 0;
    const mno = parseFloat(r.mno) || 0;

    const bc = sio2 > 0 ? (cao + mgo) / sio2 : 0;
    const feNi = ni > 0 ? fe / ni : 0;
    const sum = ni + co + fe + cao + sio2 + al2o3 + mgo + p + s + cr2o3 + mno;

    return {
      bc: bc > 0 ? bc.toFixed(2) : '-',
      feNi: feNi > 0 ? feNi.toFixed(2) : '-',
      sum: sum > 0 ? sum.toFixed(2) : '-',
    };
  };

  // Evaluate element cell against reference limits
  const evaluateCell = (stdCode: string, elemKey: string, rawVal: string | number | undefined | null) => {
    const val = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal || ''));
    if (isNaN(val) || val <= 0) return { status: 'EMPTY', diffPct: 0, sigmaDist: 0, expected: 0 };

    const ref = references[stdCode]?.[elemKey];
    if (!ref || !ref.nominalValue || ref.nominalValue <= 0) {
      return { status: 'NORMAL', diffPct: 0, sigmaDist: 0, expected: 0 };
    }

    const expected = ref.nominalValue;
    const diffPct = ((val - expected) / expected) * 100;
    const stdev = ref.stdevFixed || 0.05;
    const sigmaDist = Math.abs((val - expected) / stdev);

    const upperAction = ref.upperAction ?? (expected + 3 * stdev);
    const lowerAction = ref.lowerAction ?? (expected - 3 * stdev);
    const upperWarning = ref.upperWarning ?? (expected + 2 * stdev);
    const lowerWarning = ref.lowerWarning ?? (expected - 2 * stdev);

    let status = 'PASS';
    if (val > upperAction || val < lowerAction) {
      status = 'ACTION';
    } else if (val > upperWarning || val < lowerWarning) {
      status = 'WARNING';
    }

    return { status, diffPct, sigmaDist, expected };
  };

  // Evaluate entire row status
  const evaluateRow = (r: StandardRowInput) => {
    const elements = selectedMatrix === 'LIMONITE' 
      ? ['Ni', 'Co', 'Fe', 'CaO', 'SiO2', 'Al2O3', 'MgO', 'P', 'S', 'Cr2O3', 'MnO']
      : ['Ni', 'Co', 'Fe', 'CaO', 'SiO2', 'Al2O3', 'MgO', 'Cr2O3', 'MnO'];

    let hasAction = false;
    let hasWarning = false;
    let hasValues = false;

    for (const el of elements) {
      const field = el.toLowerCase() as keyof StandardRowInput;
      const raw = r[field];
      const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw || ''));
      if (!isNaN(parsed) && parsed > 0) {
        hasValues = true;
        const res = evaluateCell(r.standardCode, el, raw);
        if (res.status === 'ACTION') hasAction = true;
        if (res.status === 'WARNING') hasWarning = true;
      }
    }

    if (!hasValues) return 'EMPTY';
    if (hasAction) return 'ACTION';
    if (hasWarning) return 'WARNING';
    return 'PASS';
  };

  // Overall batch statistics
  const batchStats = useMemo(() => {
    let passCount = 0;
    let warnCount = 0;
    let actionCount = 0;
    let filledCount = 0;

    for (const r of rows) {
      const st = evaluateRow(r);
      if (st !== 'EMPTY') {
        filledCount++;
        if (st === 'PASS') passCount++;
        if (st === 'WARNING') warnCount++;
        if (st === 'ACTION') actionCount++;
      }
    }

    const overallStatus = actionCount > 0 ? 'ACTION' : warnCount > 0 ? 'WARNING' : filledCount > 0 ? 'PASS' : 'EMPTY';
    return { passCount, warnCount, actionCount, filledCount, overallStatus };
  }, [rows, references, selectedMatrix]);

  // Quick Paste from Excel handler (Robust PapaParse with standard mapping & blank filtering)
  const handleApplyPaste = (pastedTextOverride?: string) => {
    const textToProcess = (typeof pastedTextOverride === 'string' ? pastedTextOverride : rawPastedText).trim();
    if (!textToProcess) return;

    try {
      // 1. Parse using PapaParse to seamlessly handle multi-line quoted cells (e.g. "EPSILON F\nLIMONITE - MYLAR 2026")
      const parsed = Papa.parse<string[]>(textToProcess, {
        delimiter: textToProcess.includes('\t') ? '\t' : undefined,
        skipEmptyLines: 'greedy',
      });

      const rawRows = parsed.data || [];
      if (rawRows.length === 0) {
        toast.error("Data clipboard kosong atau tidak dapat dibaca.");
        return;
      }

      // Check if instrument name is present in pasted text
      const fullTextUpper = textToProcess.toUpperCase();
      const detectedInstMatch = fullTextUpper.match(/EPSILON[\s_]+([A-H])/);
      if (detectedInstMatch) {
        const instCode = `EPSILON_${detectedInstMatch[1]}`;
        if (instruments.some(i => i.code === instCode)) {
          setSelectedInstrument(instCode);
        }
      }

      // Detect matrix if present
      let currentMatrix = selectedMatrix;
      if (fullTextUpper.includes('LIMONITE') || fullTextUpper.includes('LIM 0') || fullTextUpper.includes('LIM0')) {
        currentMatrix = 'LIMONITE';
        setSelectedMatrix('LIMONITE');
      } else if (fullTextUpper.includes('SAPROLITE') || fullTextUpper.includes('OREAS')) {
        currentMatrix = 'SAPROLITE';
        setSelectedMatrix('SAPROLITE');
      }

      const targetStandards = currentMatrix === 'LIMONITE' 
        ? ['LIM01', 'LIM02', 'LIM03', 'LIM04', 'LIM05']
        : ['OREAS184', 'OREAS187', 'OREAS189', 'OREAS190', 'LIM', 'SAP16', 'OREAS193', 'SAP19', 'OREAS194', 'SAP'];

      // Helper to clean numeric text (handle comma decimal, strip, N/A)
      const cleanVal = (val: any): string => {
        if (val === undefined || val === null) return '';
        const s = String(val).replace(',', '.').trim();
        if (s === '-' || s === '' || s.toUpperCase() === 'N/A' || s.includes('#')) return '';
        const num = parseFloat(s);
        return isNaN(num) ? '' : s;
      };

      // Map to collect data for each target CRM standard
      const standardDataMap: Record<string, Partial<StandardRowInput>> = {};
      let firstDetectedDate = '';
      let firstDetectedTime = '';

      for (let i = 0; i < rawRows.length; i++) {
        const cols = rawRows[i].map(c => String(c ?? '').trim());
        if (cols.length < 4) continue;

        // Skip header lines
        if (cols.some(c => /Sample Code|Date of|% Ni|Date Analyzed/i.test(c))) {
          continue;
        }

        // Calibration blanks (VER-BLANK WAX, VER-BLANK LICOWAX) are calibration baselines, not CRM standards
        const rowText = cols.join(' ');
        if (/BLANK/i.test(rowText)) {
          continue;
        }

        // Identify Standard Code from label/row content:
        let matchedStdCode = '';
        if (currentMatrix === 'LIMONITE') {
          if (/LIM\s*0?1\b/i.test(rowText)) matchedStdCode = 'LIM01';
          else if (/LIM\s*0?2\b/i.test(rowText)) matchedStdCode = 'LIM02';
          else if (/LIM\s*0?3\b/i.test(rowText)) matchedStdCode = 'LIM03';
          else if (/LIM\s*0?4\b/i.test(rowText)) matchedStdCode = 'LIM04';
          else if (/LIM\s*0?5\b/i.test(rowText)) matchedStdCode = 'LIM05';
        } else {
          if (/OREAS\s*184\b/i.test(rowText)) matchedStdCode = 'OREAS184';
          else if (/OREAS\s*187\b/i.test(rowText)) matchedStdCode = 'OREAS187';
          else if (/OREAS\s*189\b/i.test(rowText)) matchedStdCode = 'OREAS189';
          else if (/OREAS\s*190\b/i.test(rowText)) matchedStdCode = 'OREAS190';
          else if (/SAP\s*16\b/i.test(rowText)) matchedStdCode = 'SAP16';
          else if (/OREAS\s*193\b/i.test(rowText)) matchedStdCode = 'OREAS193';
          else if (/SAP\s*19\b/i.test(rowText)) matchedStdCode = 'SAP19';
          else if (/OREAS\s*194\b/i.test(rowText)) matchedStdCode = 'OREAS194';
          else if (/(^|\b)VER-LIM\b/i.test(rowText) || (/\bLIM\b/i.test(rowText) && !/LIM\s*0?[1-5]/i.test(rowText))) matchedStdCode = 'LIM';
          else if (/(^|\b)VER-SAP\b/i.test(rowText) || (/\bSAP\b/i.test(rowText) && !/SAP\s*(16|19)/i.test(rowText))) matchedStdCode = 'SAP';
        }

        // Find date / time column and label
        let sampleLabel = '';
        let rowTime = '';
        const labelParts: string[] = [];

        for (let c = 0; c < Math.min(cols.length, 6); c++) {
          const val = cols[c];
          if (!val) continue;

          // 1. Ekstrak Waktu JAM murni (Format: HH:mm atau H:mm, cth: 2:19 -> 02:19)
          const timeMatch = val.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
          if (timeMatch && !rowTime) {
            rowTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
          }

          // 2. Ekstrak Tanggal Analisa (bukan tanggal prep dalam label sampel)
          if (!/^(VER-|OREAS|SAP)/i.test(val)) {
            const dateMatch = val.match(/\b(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})\b/);
            if (dateMatch && !firstDetectedDate) {
              firstDetectedDate = dateMatch[0];
            }
          }

          // 3. Bangun Label Sampel lengkap (termasuk huruf Cup/Disc 'B'/'A' dan Tanggal Prep)
          if (/VER-|OREAS|LIM|SAP/i.test(val)) {
            labelParts.push(val);
          } else if (labelParts.length > 0 && (/^[A-Z]$/i.test(val) || /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/.test(val))) {
            labelParts.push(val);
          }
        }

        if (labelParts.length > 0) {
          sampleLabel = labelParts.join(' ');
        }

        // Find the column index of % Ni (first numeric measurement column)
        let numStartIdx = -1;
        for (let c = 2; c < cols.length; c++) {
          const num = parseFloat(cols[c].replace(',', '.'));
          if (!isNaN(num) && !cols[c].includes('/') && !cols[c].includes(':') && c >= 3) {
            numStartIdx = c;
            break;
          }
        }

        if (numStartIdx === -1) continue;

        if (!sampleLabel && numStartIdx > 0) {
          sampleLabel = cols[numStartIdx - 1];
        }

        // If matchedStdCode wasn't identified by regex, fallback to sequential order
        if (!matchedStdCode) {
          const alreadyAssigned = Object.keys(standardDataMap).length;
          if (alreadyAssigned < targetStandards.length) {
            matchedStdCode = targetStandards[alreadyAssigned];
          }
        }

        if (!matchedStdCode) continue;

        if (!firstDetectedTime && rowTime) {
          firstDetectedTime = rowTime;
        }

        // Pastikan rowTime berformat jam valid (HH:mm) dan BUKAN huruf tunggal 'A'/'B'
        const validAnalyzedAt = (/^\d{1,2}:\d{2}$/.test(rowTime) ? rowTime : (firstDetectedTime || verificationTime));

        // Extract element values according to universal XRF export layout:
        // Col 0: Ni, Col 1: Co, Col 2: Fe, Col 3: CaO, Col 4: SiO2, Col 5: Al2O3, Col 6: MgO, Col 7: P, Col 8: S, Col 9: Cr2O3, Col 10: MnO
        const getCol = (offset: number) => cleanVal(cols[numStartIdx + offset]);

        standardDataMap[matchedStdCode] = {
          standardCode: matchedStdCode,
          sampleLabel: sampleLabel || `VER-${matchedStdCode}`,
          analyzedAt: validAnalyzedAt,
          ni: getCol(0),
          co: getCol(1),
          fe: getCol(2),
          cao: getCol(3),
          sio2: getCol(4),
          al2o3: getCol(5),
          mgo: getCol(6),
          p: getCol(7),
          s: getCol(8),
          cr2o3: getCol(9),
          mno: getCol(10),
        };
      }

      // Build updated rows
      const updatedRows: StandardRowInput[] = targetStandards.map((stdCode, idx) => {
        const found = standardDataMap[stdCode];
        if (found) {
          const rowAnalyzedAt = (/^\d{1,2}:\d{2}$/.test(found.analyzedAt || '') ? found.analyzedAt! : (firstDetectedTime || verificationTime));
          return {
            standardCode: stdCode,
            sampleLabel: found.sampleLabel || `VER-${stdCode}`,
            sequenceNo: idx + 1,
            analyzedAt: rowAnalyzedAt,
            ni: found.ni || '',
            co: found.co || '',
            fe: found.fe || '',
            cao: found.cao || '',
            sio2: found.sio2 || '',
            al2o3: found.al2o3 || '',
            mgo: found.mgo || '',
            p: found.p || '',
            s: found.s || '',
            cr2o3: found.cr2o3 || '',
            mno: found.mno || '',
          };
        }
        const existing = rows.find(r => r.standardCode === stdCode);
        return existing || {
          standardCode: stdCode,
          sampleLabel: `VER-${stdCode}`,
          sequenceNo: idx + 1,
          analyzedAt: verificationTime,
          ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: ''
        };
      });

      const filledCount = Object.keys(standardDataMap).length;
      if (filledCount > 0) {
        setRows(updatedRows);
        if (firstDetectedTime && /^\d{1,2}:\d{2}$/.test(firstDetectedTime)) {
          setVerificationTime(firstDetectedTime);
        }
        if (firstDetectedDate) {
          const dParts = firstDetectedDate.split(/[-/]/).map(n => parseInt(n, 10));
          if (dParts.length === 3 && !dParts.some(isNaN)) {
            let year = 0;
            let month = 0;
            let day = 0;
            if (dParts[0] > 1000) {
              [year, month, day] = dParts;
            } else {
              [day, month, year] = dParts;
              if (year < 100) year = 2000 + year;
            }
            setVerificationDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
          }
        }
        setShowPasteModal(false);
        setRawPastedText('');
        toast.success(`Berhasil mem-parsing ${filledCount} standar ${currentMatrix} dari data Excel!`);
      } else {
        toast.error("Gagal mendeteksi standar CRM. Pastikan tabel berisi data VER-LIM / OREAS.");
      }
    } catch (err: any) {
      toast.error("Format data clipboard tidak dapat dibaca: " + err.message);
    }
  };

  // Pre-fill sample values
  const handleFillSampleValues = () => {
    if (selectedMatrix === 'LIMONITE') {
      setRows([
        { standardCode: 'LIM01', sampleLabel: `VER-LIM01 ${verificationDate}`, sequenceNo: 1, analyzedAt: '00:26', ni: '1.109', co: '0.138', fe: '47.52', cao: '0.020', sio2: '6.85', al2o3: '4.45', mgo: '3.18', p: '0.003', s: '0.148', cr2o3: '2.290', mno: '1.080' },
        { standardCode: 'LIM02', sampleLabel: `VER-LIM02 ${verificationDate}`, sequenceNo: 2, analyzedAt: '01:01', ni: '1.201', co: '0.131', fe: '45.60', cao: '0.055', sio2: '8.88', al2o3: '3.52', mgo: '4.95', p: '0.003', s: '0.121', cr2o3: '2.155', mno: '1.012' },
        { standardCode: 'LIM03', sampleLabel: `VER-LIM03 ${verificationDate}`, sequenceNo: 3, analyzedAt: '01:05', ni: '1.290', co: '0.134', fe: '45.22', cao: '0.046', sio2: '8.52', al2o3: '4.19', mgo: '4.82', p: '0.002', s: '0.130', cr2o3: '2.042', mno: '1.005' },
        { standardCode: 'LIM04', sampleLabel: `VER-LIM04 ${verificationDate}`, sequenceNo: 4, analyzedAt: '01:08', ni: '1.405', co: '0.123', fe: '42.61', cao: '0.058', sio2: '10.82', al2o3: '3.85', mgo: '6.90', p: '0.003', s: '0.129', cr2o3: '1.915', mno: '0.865' },
        { standardCode: 'LIM05', sampleLabel: `VER-LIM05 ${verificationDate}`, sequenceNo: 5, analyzedAt: '01:11', ni: '1.495', co: '0.122', fe: '36.95', cao: '0.076', sio2: '15.22', al2o3: '3.53', mgo: '10.91', p: '0.003', s: '0.097', cr2o3: '1.910', mno: '0.850' },
      ]);
    } else {
      setRows([
        { standardCode: 'OREAS184', sampleLabel: `VER-OREAS184 ${verificationDate}`, sequenceNo: 1, analyzedAt: '00:15', ni: '1.018', co: '0.089', fe: '27.48', cao: '0.214', sio2: '42.20', al2o3: '4.61', mgo: '3.04', p: '', s: '', cr2o3: '1.745', mno: '0.674' },
        { standardCode: 'OREAS187', sampleLabel: `VER-OREAS187 ${verificationDate}`, sequenceNo: 2, analyzedAt: '00:30', ni: '1.368', co: '0.063', fe: '13.58', cao: '0.339', sio2: '46.62', al2o3: '2.79', mgo: '17.96', p: '', s: '', cr2o3: '0.985', mno: '0.355' },
        { standardCode: 'OREAS189', sampleLabel: `VER-OREAS189 ${verificationDate}`, sequenceNo: 3, analyzedAt: '00:45', ni: '1.478', co: '0.032', fe: '10.51', cao: '0.328', sio2: '46.18', al2o3: '2.08', mgo: '23.06', p: '', s: '', cr2o3: '0.758', mno: '0.229' },
        { standardCode: 'OREAS190', sampleLabel: `VER-OREAS190 ${verificationDate}`, sequenceNo: 4, analyzedAt: '01:00', ni: '1.638', co: '0.089', fe: '24.81', cao: '0.129', sio2: '38.19', al2o3: '5.98', mgo: '6.89', p: '', s: '', cr2o3: '1.726', mno: '0.578' },
        { standardCode: 'LIM',      sampleLabel: `VER-LIM ${verificationDate}`,      sequenceNo: 5, analyzedAt: '01:15', ni: '1.710', co: '0.244', fe: '23.86', cao: '0.011', sio2: '26.44', al2o3: '1.41', mgo: '20.75', p: '', s: '', cr2o3: '2.288', mno: '0.506' },
        { standardCode: 'SAP16',    sampleLabel: `VER-SAP16 ${verificationDate}`,    sequenceNo: 6, analyzedAt: '01:30', ni: '1.764', co: '0.088', fe: '29.71', cao: '0.079', sio2: '21.46', al2o3: '3.41', mgo: '15.42', p: '', s: '', cr2o3: '2.524', mno: '0.702' },
        { standardCode: 'OREAS193', sampleLabel: `VER-OREAS193 ${verificationDate}`, sequenceNo: 7, analyzedAt: '01:45', ni: '1.928', co: '0.049', fe: '13.64', cao: '0.360', sio2: '42.68', al2o3: '3.07', mgo: '20.22', p: '', s: '', cr2o3: '0.960', mno: '0.316' },
        { standardCode: 'SAP19',    sampleLabel: `VER-SAP19 ${verificationDate}`,    sequenceNo: 8, analyzedAt: '02:00', ni: '2.028', co: '0.065', fe: '17.53', cao: '0.067', sio2: '31.51', al2o3: '1.69', mgo: '25.18', p: '', s: '', cr2o3: '1.162', mno: '0.448' },
        { standardCode: 'OREAS194', sampleLabel: `VER-OREAS194 ${verificationDate}`, sequenceNo: 9, analyzedAt: '02:15', ni: '2.128', co: '0.042', fe: '11.51', cao: '0.309', sio2: '42.98', al2o3: '2.73', mgo: '22.80', p: '', s: '', cr2o3: '0.817', mno: '0.260' },
        { standardCode: 'SAP',      sampleLabel: `VER-SAP ${verificationDate}`,      sequenceNo: 10, analyzedAt: '02:30', ni: '2.298', co: '0.129', fe: '9.89', cao: '0.010', sio2: '36.35', al2o3: '0.96', mgo: '30.38', p: '', s: '', cr2o3: '1.976', mno: '0.219' },
      ]);
    }
    toast.success(`Berhasil memuat contoh data analisa ${selectedMatrix}!`);
  };

  // Submit Batch
  const handleSubmitBatch = async () => {
    const hasAnyValue = rows.some(r => r.ni || r.fe || r.cr2o3);
    if (!hasAnyValue) {
      toast.error("Harap isi hasil analisa sebelum menyimpan.");
      return;
    }

    setLoading(true);
    try {
      const instObj = filteredInstruments.find(i => i.code === selectedInstrument);
      const payload = {
        instrumentCode: selectedInstrument,
        instrumentName: instObj?.name || selectedInstrument,
        verificationDate,
        verificationTime,
        shift,
        notes: notes || `Input Verifikasi Harian ${selectedMatrix}`,
        operatorNik: userNik,
        operatorName: userName,
        items: rows.map(r => ({
          standardCode: r.standardCode,
          sampleLabel: r.sampleLabel,
          sequenceNo: r.sequenceNo,
          analyzedAt: r.analyzedAt,
          ni: r.ni || null,
          co: r.co || null,
          fe: r.fe || null,
          cao: r.cao || null,
          sio2: r.sio2 || null,
          al2o3: r.al2o3 || null,
          mgo: r.mgo || null,
          p: r.p || null,
          s: r.s || null,
          cr2o3: r.cr2o3 || null,
          mno: r.mno || null,
        }))
      };

      const res = await fetch('/api/xrf/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Data verifikasi harian berhasil disimpan ke database!");
        if (onSuccessSave) onSuccessSave();
      } else {
        toast.error(json.error || "Gagal menyimpan data verifikasi");
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeColumns = selectedMatrix === 'LIMONITE'
    ? ['Ni', 'Co', 'Fe', 'CaO', 'SiO2', 'Al2O3', 'MgO', 'P', 'S', 'Cr2O3', 'MnO']
    : ['Ni', 'Co', 'Fe', 'CaO', 'SiO2', 'Al2O3', 'MgO', 'Cr2O3', 'MnO'];

  const companyName = assignedSite === 'GTS' ? 'PT GANE TAMBANG SENTOSA' : 'PT TRIMEGAH BANGUN PERSADA';

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP CONTROL BAR (SCREEN ONLY)                              */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 no-print-area">
        {/* Row 1: Matrix Toggle & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Primary Matrix Tab Toggle */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => handleMatrixChange('LIMONITE')}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  selectedMatrix === 'LIMONITE'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                LIMONITE (5 Standar)
              </button>
              <button
                onClick={() => handleMatrixChange('SAPROLITE')}
                className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  selectedMatrix === 'SAPROLITE'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Layers className="w-4 h-4" />
                SAPROLITE (10 Standar)
              </button>
            </div>

            <span className="text-xs text-slate-500 font-semibold hidden lg:inline">
              {rows.length} Standar Terkonfigurasi
            </span>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleFillSampleValues}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Isi dengan contoh hasil analisa kalibrasi"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Contoh Data
            </button>

            <button
              onClick={() => setShowPasteModal(true)}
              className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Tempelkan baris data dari Excel"
            >
              <Clipboard className="w-3.5 h-3.5" />
              Paste Excel
            </button>

            {/* Print A4 Button */}
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Cetak Formulir Verifikasi ke Kertas A4 (Fit 1 Halaman)"
            >
              <Printer className="w-4 h-4" />
              Cetak A4 (SPV & SPT Sign)
            </button>
          </div>
        </div>

        {/* Row 2: Metadata Fields Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Instrumen XRF</label>
            <select
              value={selectedInstrument}
              onChange={e => setSelectedInstrument(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            >
              {filteredInstruments.map(i => (
                <option key={i.code} value={i.code}>{i.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tanggal Verifikasi</label>
            <input
              type="date"
              value={verificationDate}
              onChange={e => setVerificationDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Jam Analisa</label>
            <input
              type="time"
              value={verificationTime}
              onChange={e => setVerificationTime(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Shift Kerja</label>
            <select
              value={shift}
              onChange={e => setShift(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            >
              <option value="1">Shift 1 (Pagi)</option>
              <option value="2">Shift 2 (Malam)</option>
              <option value="Day">Day Shift</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Operator / Analis</label>
            <div className="bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
              {userName}
            </div>
          </div>
        </div>

        {/* Real-time Evaluation Summary Badge (Screen View) */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs">
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-600 dark:text-slate-400">Status Evaluasi Live:</span>
            {batchStats.overallStatus === 'PASS' && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                PASS (Semua Unsur Sesuai Toleransi ≤ 2σ)
              </span>
            )}
            {batchStats.overallStatus === 'WARNING' && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                WARNING ({batchStats.warnCount} Unsur dalam batas 2σ - 3σ)
              </span>
            )}
            {batchStats.overallStatus === 'ACTION' && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/40 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                ACTION REQUIRED ({batchStats.actionCount} Unsur Melebihi Batas &gt; 3σ)
              </span>
            )}
            {batchStats.overallStatus === 'EMPTY' && (
              <span className="text-slate-400 italic">Menunggu input hasil analisa...</span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
            <span>Pass: <strong className="text-emerald-600">{batchStats.passCount}</strong></span>
            <span>Warning: <strong className="text-amber-600">{batchStats.warnCount}</strong></span>
            <span>Action: <strong className="text-red-600">{batchStats.actionCount}</strong></span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. INTERACTIVE SCREEN TABLE (INTUITIVE & RESPONSIVE)          */}
      {/* ------------------------------------------------------------- */}
      <div 
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (text && (text.includes('\t') || text.includes('\n')) && (text.includes('VER-') || text.includes('LIM') || text.includes('OREAS') || text.includes('SAP') || text.includes('EPSILON'))) {
            e.preventDefault();
            handleApplyPaste(text);
          }
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden no-print-area"
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Tabel Input Hasil Analisa Verifikasi Harian ({selectedMatrix})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            *Nilai acuan nominal CRM ditampilkan 3 angka di belakang koma (Bisa langsung paste Excel dengan Ctrl+V)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-2.5 px-3 w-10 text-center">No</th>
                <th className="py-2.5 px-3 min-w-[120px]">Standar CRM</th>
                <th className="py-2.5 px-3 min-w-[150px]">Label Sample</th>
                <th className="py-2.5 px-3 w-20 text-center">Jam</th>
                {activeColumns.map(col => (
                  <th key={`th-${col}`} className="py-2.5 px-2 text-right min-w-[85px]">{col}</th>
                ))}
                <th className="py-2.5 px-2 text-right min-w-[65px]">BC</th>
                <th className="py-2.5 px-2 text-right min-w-[65px]">Fe/Ni</th>
                <th className="py-2.5 px-2 text-right min-w-[75px]">Sum %</th>
                <th className="py-2.5 px-3 text-center min-w-[95px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {rows.map((r, idx) => {
                const calcs = computeRowCalculations(r);
                const rowStatus = evaluateRow(r);

                return (
                  <tr key={`row-${r.standardCode}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-sans">{idx + 1}</td>
                    <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200 font-sans">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 font-bold">
                        {r.standardCode}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={r.sampleLabel}
                        onChange={e => handleCellChange(idx, 'sampleLabel', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-sans text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-teal-500 outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="text"
                        placeholder="HH:mm"
                        value={r.analyzedAt}
                        onChange={e => handleCellChange(idx, 'analyzedAt', e.target.value)}
                        className="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1 text-xs text-center text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-teal-500 outline-none font-mono"
                      />
                    </td>

                    {/* Element Input Cells with Live Evaluation Highlighting */}
                    {activeColumns.map(elem => {
                      const field = elem.toLowerCase() as keyof StandardRowInput;
                      const val = r[field];
                      const evalResult = evaluateCell(r.standardCode, elem, val);

                      let cellBg = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700';
                      if (evalResult.status === 'ACTION') cellBg = 'bg-red-500/15 border-red-500 text-red-700 dark:text-red-300 font-bold';
                      else if (evalResult.status === 'WARNING') cellBg = 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-bold';
                      else if (evalResult.status === 'PASS') cellBg = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold';

                      return (
                        <td key={`cell-${elem}-${idx}`} className="py-2 px-1 text-right">
                          <input
                            type="text"
                            placeholder={evalResult.expected > 0 ? evalResult.expected.toFixed(3) : '-'}
                            value={val}
                            onChange={e => handleCellChange(idx, field, e.target.value)}
                            className={`w-full text-right border rounded-lg px-2 py-1 text-xs outline-none transition-colors ${cellBg}`}
                            title={evalResult.expected > 0 ? `Nominal Acuan: ${evalResult.expected.toFixed(3)} | Diff: ${evalResult.diffPct.toFixed(2)}% (${evalResult.sigmaDist.toFixed(1)}σ)` : undefined}
                          />
                        </td>
                      );
                    })}

                    {/* Computed Ratios */}
                    <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-300">{calcs.bc}</td>
                    <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-300">{calcs.feNi}</td>
                    <td className="py-2 px-2 text-right font-bold text-slate-800 dark:text-slate-200">{calcs.sum}</td>

                    {/* Status Badge */}
                    <td className="py-2 px-3 text-center font-sans">
                      {rowStatus === 'PASS' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          PASS
                        </span>
                      )}
                      {rowStatus === 'WARNING' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          WARNING
                        </span>
                      )}
                      {rowStatus === 'ACTION' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                          ACTION
                        </span>
                      )}
                      {rowStatus === 'EMPTY' && (
                        <span className="text-slate-300 text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Submit Actions Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Menampilkan formulir untuk {rows.length} sampel acuan kalibrasi ({selectedMatrix}).
          </div>
          <button
            disabled={loading}
            onClick={handleSubmitBatch}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Verifikasi Harian
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. PRINTABLE OFFICIAL DOCUMENT (FIT EXACTLY 1 A4 LANDSCAPE)   */}
      {/* ------------------------------------------------------------- */}
      <div className="xrf-print-only-container">
        <style dangerouslySetInnerHTML={{ __html: `
          @media screen {
            .xrf-print-only-container {
              display: none;
            }
          }
          @media print {
            @page {
              size: A4 landscape;
              margin: 6mm 8mm;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif !important;
              color: #000000 !important;
              background: #ffffff !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print-area, header, aside, nav, button {
              display: none !important;
            }
            .xrf-print-only-container {
              display: block !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
            }
            .print-border-table {
              border-collapse: collapse !important;
              width: 100% !important;
            }
            .print-border-table th, .print-border-table td {
              border: 1px solid #1e293b !important;
              padding: 2.5px 4px !important;
              font-size: 8pt !important;
              line-height: 1.15 !important;
            }
            .print-header-cell {
              background-color: #f1f5f9 !important;
              font-weight: bold !important;
            }
            .print-status-pass {
              background-color: #dcfce7 !important;
              font-weight: bold !important;
            }
            .print-status-warn {
              background-color: #fef3c7 !important;
              font-weight: bold !important;
            }
            .print-status-action {
              background-color: #fee2e2 !important;
              color: #991b1b !important;
              font-weight: bold !important;
            }
            .sign-box {
              height: 48px !important;
            }
          }
        `}} />

        {/* Official Header */}
        <div className="border-b-2 border-slate-900 pb-2 mb-2">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-[13pt] font-black uppercase tracking-wider text-slate-950 leading-none">
                {companyName}
              </h2>
              <div className="text-[8.5pt] font-bold text-slate-700 tracking-wide mt-0.5">
                QUALITY ASSURANCE & QUALITY CONTROL • LABORATORY DEPARTMENT
              </div>
              <h1 className="text-[11pt] font-black text-slate-900 mt-1 uppercase underline underline-offset-2">
                LEMBAR VERIFIKASI HARIAN HASIL ANALISA XRF ({selectedMatrix})
              </h1>
            </div>
            <div className="text-right text-[7.5pt] font-mono leading-tight">
              <div>No. Dokumen: <strong>FRM-LAB-QAQC-014</strong></div>
              <div>Revisi: <strong>03</strong></div>
              <div>Halaman: <strong>1 dari 1 (A4)</strong></div>
            </div>
          </div>
        </div>

        {/* Metadata Table */}
        <table className="w-full text-[8pt] mb-2 print-border-table">
          <tbody>
            <tr>
              <td className="print-header-cell w-[14%]">Instrumen XRF:</td>
              <td className="w-[20%] font-bold">{selectedInstrument} ({filteredInstruments.find(i => i.code === selectedInstrument)?.name})</td>
              <td className="print-header-cell w-[14%]">Tanggal Analisa:</td>
              <td className="w-[18%] font-bold">{verificationDate}</td>
              <td className="print-header-cell w-[14%]">Shift / Jam:</td>
              <td className="w-[20%] font-bold">Shift {shift} ({verificationTime})</td>
            </tr>
            <tr>
              <td className="print-header-cell">Aplikasi / Matriks:</td>
              <td className="font-bold">{selectedMatrix} ({rows.length} CRM Standard)</td>
              <td className="print-header-cell">Analis / Operator:</td>
              <td className="font-bold">{userName} {userNik ? `(${userNik})` : ''}</td>
              <td className="print-header-cell">Status Verifikasi:</td>
              <td className={`font-black ${batchStats.overallStatus === 'PASS' ? 'print-status-pass' : batchStats.overallStatus === 'WARNING' ? 'print-status-warn' : 'print-status-action'}`}>
                {batchStats.overallStatus === 'PASS' ? 'MEMENUHI SYARAT (PASS)' : batchStats.overallStatus === 'WARNING' ? 'PERINGATAN (WARNING)' : 'TIDAK MEMENUHI (ACTION)'}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Dense Printable Results Table */}
        <table className="w-full text-center print-border-table mb-2">
          <thead>
            <tr className="print-header-cell text-[8pt]">
              <th className="w-6">No</th>
              <th className="w-24 text-left">CRM Standar</th>
              <th className="text-left">Label Sampel</th>
              {activeColumns.map(c => (
                <th key={`pr-th-${c}`} className="text-right">{c} (%)</th>
              ))}
              <th className="text-right w-12">BC</th>
              <th className="text-right w-12">Fe/Ni</th>
              <th className="text-right w-12">Sum%</th>
              <th className="w-16">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const calcs = computeRowCalculations(r);
              const rowStatus = evaluateRow(r);
              return (
                <tr key={`pr-row-${idx}`}>
                  <td>{idx + 1}</td>
                  <td className="font-bold text-left">{r.standardCode}</td>
                  <td className="text-left font-mono text-[7pt]">{r.sampleLabel}</td>
                  {activeColumns.map(elem => {
                    const field = elem.toLowerCase() as keyof StandardRowInput;
                    const val = r[field];
                    const evalResult = evaluateCell(r.standardCode, elem, val);
                    const statusClass = evalResult.status === 'ACTION' ? 'print-status-action' : evalResult.status === 'WARNING' ? 'print-status-warn' : '';

                    return (
                      <td key={`pr-cell-${elem}-${idx}`} className={`text-right font-mono ${statusClass}`}>
                        {val ? Number(val).toFixed(elem === 'Ni' || elem === 'Cr2O3' ? 3 : 2) : '-'}
                      </td>
                    );
                  })}
                  <td className="text-right font-mono">{calcs.bc}</td>
                  <td className="text-right font-mono">{calcs.feNi}</td>
                  <td className="text-right font-mono font-bold">{calcs.sum}</td>
                  <td className={`font-bold ${rowStatus === 'PASS' ? 'print-status-pass' : rowStatus === 'WARNING' ? 'print-status-warn' : rowStatus === 'ACTION' ? 'print-status-action' : ''}`}>
                    {rowStatus}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Nominal Reference Guidelines & Standard Notes */}
        <div className="text-[7pt] text-slate-700 leading-tight mb-2 p-1.5 border border-slate-400 bg-slate-50">
          <strong>Kriteria Penerimaan Verifikasi XRF:</strong> 
          (1) Batas Peringatan (Warning) = Nilai Acuan ± 2σ (Perlu pengawasan). 
          (2) Batas Tindakan (Action) = Nilai Acuan ± 3σ. Apabila hasil analisa berada di luar batas ± 3σ, analisa dihentikan untuk kalibrasi ulang atau pelaporan ke SPV Lab.
          (3) Nilai Nominal CRM resmi: LIM01 s/d LIM05 dan OREAS/SAP terkalibrasi sesuai sertifikat CRM resmi terlampir (akurasi 3 desimal).
        </div>

        {/* 3 Signatures Block (Dianalisa Oleh [Operator], Diperiksa Oleh [SPV], Disetujui Oleh [SPT]) */}
        <table className="w-full text-center print-border-table">
          <thead>
            <tr className="print-header-cell text-[8pt]">
              <th className="w-1/3">Dianalisa Oleh (Operator / Analis):</th>
              <th className="w-1/3">Diperiksa Oleh (Supervisor Laboratory):</th>
              <th className="w-1/3">Disetujui Oleh (Superintendent Laboratory):</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="sign-box align-bottom text-[8pt] pb-1">
                <div className="font-bold underline">{userName || 'Analis Laboratorium'}</div>
                <div className="text-[7pt] text-slate-600">NIK: {userNik || '....................................'}</div>
                <div className="text-[7pt] text-slate-500">Tgl: {verificationDate}</div>
              </td>
              <td className="sign-box align-bottom text-[8pt] pb-1">
                <div className="font-bold underline">( .................................................... )</div>
                <div className="text-[7pt] text-slate-600">Supervisor QC / Laboratory</div>
                <div className="text-[7pt] text-slate-500">Tgl: ............................................</div>
              </td>
              <td className="sign-box align-bottom text-[8pt] pb-1">
                <div className="font-bold underline">( .................................................... )</div>
                <div className="text-[7pt] text-slate-600">Superintendent Laboratory</div>
                <div className="text-[7pt] text-slate-500">Tgl: ............................................</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Modal Quick Paste from Excel */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 no-print-area">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clipboard className="w-4 h-4 text-emerald-500" />
                Paste Data Tabel dari Excel untuk {selectedMatrix} (Ctrl + V)
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Salin baris data tabel dari Excel (kolom Ni s/d MnO) lalu tempelkan pada kotak teks di bawah:
            </p>

            <textarea
              rows={8}
              value={rawPastedText}
              onChange={e => setRawPastedText(e.target.value)}
              placeholder="Tempel baris data tabel Excel di sini..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleApplyPaste()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                Terapkan ke Tabel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
