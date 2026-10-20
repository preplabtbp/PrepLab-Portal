import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  ClipboardPaste, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, 
  Save, Eye, Trash2, ArrowUp, ArrowDown, FileText, Sparkles, Filter, 
  ChevronDown, ChevronRight, Layers, Check, Info, ShieldCheck, Database
} from 'lucide-react';
import { toast } from 'sonner';

interface XrfDirectPasteTabProps {
  instruments: Array<{ code: string; name: string; site?: string }>;
  standards: Array<{ code: string; name: string }>;
  assignedSite?: 'GTS' | 'TBP';
  isDevOrManager?: boolean;
  onSuccessSave?: () => void;
}

export interface ParsedItem {
  sequenceNo: number;
  sampleLabel: string;
  standardCode: string;
  displayName: string;
  analyzedAt: string;
  ni: number;
  co: number;
  fe: number;
  cao: number;
  sio2: number;
  al2o3: number;
  mgo: number;
  p: number;
  s: number;
  cr2o3: number;
  mno: number;
  bc: number;
  feNi: number;
  sumConc: number;
  evaluations: Record<string, {
    measured: number;
    expected?: number;
    diffPct?: number;
    sigmaDist?: number;
    status: 'PASS' | 'WARNING' | 'FAIL';
  }>;
  itemStatus: 'PASS' | 'WARNING' | 'FAIL';
}

export interface ParsedBatch {
  batchIndex: number;
  batchCode: string;
  instrumentCode: string;
  instrumentName: string;
  verificationDate: string;
  verificationTime: string;
  weekNo: number;
  matrixType: 'SAPROLITE' | 'LIMONITE' | 'SUPERMINI';
  overallStatus: 'PASS' | 'WARNING' | 'FAIL';
  isComplete: boolean;
  notes?: string;
  items: ParsedItem[];
}

// Helper ISO Week
function getIsoWeek(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 1;
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

import { extractSmartStandardCode } from '../../utils/xrfStandardDetector';

// Regex Standard Extractor Pintar untuk Saprolite, Limonite, Supermini 200, dan Zetium A/B
function extractStandardName(rawLabel: string, _matrixHint?: 'SAPROLITE' | 'LIMONITE' | 'SUPERMINI' | 'AUTO'): { standardCode: string; displayName: string } {
  const res = extractSmartStandardCode(rawLabel);
  return {
    standardCode: res.standardCode,
    displayName: res.displayName,
  };
}

export const XrfDirectPasteTab: React.FC<XrfDirectPasteTabProps> = ({
  instruments,
  standards,
  assignedSite = 'GTS',
  isDevOrManager = false,
  onSuccessSave,
}) => {
  // Active site for instrument filtering (Default: assignedSite)
  const [activeSite, setActiveSite] = useState<'GTS' | 'TBP'>(() => assignedSite);

  useEffect(() => {
    if (assignedSite) {
      setActiveSite(assignedSite);
    }
  }, [assignedSite]);

  // Strictly filter instruments to the active site (prevent GTS instruments on TBP or vice-versa)
  const siteInstruments = useMemo(() => {
    return instruments.filter(inst => {
      const isKnownGts = ['EPSILON_A', 'EPSILON_B', 'EPSILON_D', 'SUPERMINI'].includes(inst.code);
      const isKnownTbp = ['EPSILON_C', 'EPSILON_E', 'EPSILON_F', 'EPSILON_G', 'EPSILON_H', 'S2_PUMA', 'ZETIUM_A', 'ZETIUM_B'].includes(inst.code);
      const site = isKnownGts ? 'GTS' : (isKnownTbp ? 'TBP' : (inst.site || 'TBP'));
      return site === activeSite;
    });
  }, [instruments, activeSite]);

  // Determine default instrument based on activeSite
  const defaultInst = useMemo(() => {
    if (activeSite === 'TBP') {
      const found = siteInstruments.find(i => i.code === 'EPSILON_G' || i.code === 'EPSILON_H' || i.code === 'EPSILON_C');
      return found ? found.code : (siteInstruments[0]?.code || 'EPSILON_G');
    }
    const found = siteInstruments.find(i => i.code === 'SUPERMINI' || i.code === 'EPSILON_D' || i.code === 'EPSILON_A');
    return found ? found.code : (siteInstruments[0]?.code || 'EPSILON_D');
  }, [activeSite, siteInstruments]);

  // Configuration State
  const [selectedInstrument, setSelectedInstrument] = useState<string>(defaultInst);

  useEffect(() => {
    const isCurrentValid = siteInstruments.some(i => i.code === selectedInstrument);
    if (!isCurrentValid && siteInstruments.length > 0) {
      setSelectedInstrument(defaultInst);
    }
  }, [siteInstruments, defaultInst, selectedInstrument]);

  const [autoDetectInstrument, setAutoDetectInstrument] = useState<boolean>(true);
  const [matrixMode, setMatrixMode] = useState<'AUTO' | 'SUPERMINI' | 'SAPROLITE' | 'LIMONITE'>('AUTO');
  const [rawText, setRawText] = useState<string>('');
  
  // Inspection & Parsing State
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [parsedBatches, setParsedBatches] = useState<ParsedBatch[]>([]);
  const [selectedBatchIdx, setSelectedBatchIdx] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PASS' | 'WARNING' | 'FAIL'>('ALL');
  const [searchFilter, setSearchFilter] = useState<string>('');
  
  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitProgress, setSubmitProgress] = useState<{ current: number; total: number } | null>(null);

  // References Cache for Live Calculation
  const [refMap, setRefMap] = useState<Record<string, Record<string, any>>>({});

  // Operator
  const operatorNik = localStorage.getItem('p2h_inspector_nik') || (assignedSite === 'TBP' ? 'TBP-OPERATOR' : 'GTS-OPERATOR');
  const operatorName = localStorage.getItem('p2h_inspector_name') || (assignedSite === 'TBP' ? 'Analis TBP Lab' : 'Analis GTS Lab');

  // Load standard references from backend
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
          setRefMap(map);
        }
      })
      .catch(err => console.warn('Gagal memuat master references:', err));
  }, []);

  // -------------------------------------------------------------
  // PARSER ENGINE: DELIMITER ROW KOSONG & NORMALISASI DATA (A-Q)
  // -------------------------------------------------------------
  const parseRawPastedData = (textToParse: string) => {
    if (!textToParse.trim()) {
      setParsedBatches([]);
      setSelectedBatchIdx(null);
      return;
    }

    setIsInspecting(true);

    try {
      // 1. Bersihkan baris kosong berlebih di ujung bawah (menghindari 1 juta trailing rows Excel)
      const rawLines = textToParse.split(/\r?\n/);
      let lastNonEmpty = rawLines.length - 1;
      while (lastNonEmpty >= 0) {
        const line = rawLines[lastNonEmpty].trim().replace(/,/g, '').replace(/\t/g, '');
        if (line.length > 0) break;
        lastNonEmpty--;
      }
      const cleanedText = lastNonEmpty >= 0 ? rawLines.slice(0, lastNonEmpty + 1).join('\n') : '';

      const parsedData = Papa.parse<string[]>(cleanedText, {
        delimiter: cleanedText.includes('\t') ? '\t' : undefined,
        skipEmptyLines: false,
      }).data || [];

      const batches: ParsedBatch[] = [];
      let currentItems: ParsedItem[] = [];
      let currentInstCode = selectedInstrument;
      let currentInstName = instruments.find(i => i.code === selectedInstrument)?.name || selectedInstrument.replace('_', ' ');
      let currentDate = '';
      let currentTime = '08:00';
      let detectedMatrix: 'SAPROLITE' | 'LIMONITE' | 'SUPERMINI' = 
        matrixMode === 'AUTO' 
          ? (selectedInstrument === 'SUPERMINI' ? 'SUPERMINI' : assignedSite === 'TBP' ? 'LIMONITE' : 'SAPROLITE') 
          : matrixMode;

      const finishCurrentSet = () => {
        if (currentItems.length === 0) return;

        const actualDate = currentDate || new Date().toISOString().slice(0, 10);
        const actualTime = currentTime || '08:00';

        const dateFormatted = actualDate.replace(/[^0-9]/g, '');
        const cleanTime = actualTime.replace(/[^0-9]/g, '').padEnd(4, '0').slice(0, 4);
        const batchIdx = batches.length + 1;
        const batchCode = `VRF-${dateFormatted}-${currentInstCode.replace('_', '')}-${cleanTime}-${String(batchIdx).padStart(3, '0')}`;
        
        // Cek kelengkapan set (Supermini = 17, Saprolite = 10, Limonite = 5)
        const expectedCount = detectedMatrix === 'SUPERMINI' ? 17 : detectedMatrix === 'SAPROLITE' ? 10 : 5;
        const isComplete = currentItems.length === expectedCount;

        // Evaluasi status keseluruhan batch
        let overallStatus: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
        for (const it of currentItems) {
          if (it.itemStatus === 'FAIL') {
            overallStatus = 'FAIL';
            break;
          } else if (it.itemStatus === 'WARNING') {
            overallStatus = 'WARNING';
          }
        }

        batches.push({
          batchIndex: batchIdx,
          batchCode,
          instrumentCode: currentInstCode,
          instrumentName: currentInstName,
          verificationDate: actualDate,
          verificationTime: actualTime,
          weekNo: getIsoWeek(actualDate),
          matrixType: detectedMatrix,
          overallStatus,
          isComplete,
          items: [...currentItems],
        });

        currentItems = [];
      };

      for (let i = 0; i < parsedData.length; i++) {
        const cols = (parsedData[i] || []).map(c => String(c ?? '').trim());
        
        // Deteksi baris kosong total
        if (cols.length === 0 || cols.every(c => c === '')) {
          finishCurrentSet();
          continue;
        }

        const col0 = String(cols[0] || '').trim();

        // Jika Kolom 0 kosong dan sisa kolom kosong -> pembatas set
        if (col0 === '' && cols.slice(1).every(c => c === '')) {
          finishCurrentSet();
          continue;
        }

        let seqNo = parseInt(col0, 10);
        let sampleLabel = '';
        let valOffset = 4; // default Excel A-Q: [0]=No, [1]=Inst, [2]=Date, [3]=Sample, [4]=Ni...
        let rawDateStr = '';
        let xrfCol = '';

        if (isNaN(seqNo)) {
          // Kolom 0 bukan angka. Cek apakah ini label sampel verifikasi langsung
          if (/BLANK|OREAS|LIM|SAP/i.test(col0)) {
            sampleLabel = col0;
            // Jika label adalah BLANK A dan sudah ada sampel terkumpul, ini awal set baru
            if (/BLANK\s*A\b/i.test(sampleLabel) && currentItems.length >= 10) {
              finishCurrentSet();
            }
            seqNo = currentItems.length + 1;
            valOffset = 1; // Kolom 1 adalah Ni
          } else {
            // Header baris teks dilewati
            continue;
          }
        } else {
          // Kolom 0 adalah angka urut (1, 2, 3...)
          xrfCol = String(cols[1] || '').trim().toUpperCase();
          rawDateStr = String(cols[2] || '').trim();
          
          if (cols[3] && /BLANK|OREAS|LIM|SAP/i.test(cols[3])) {
            sampleLabel = cols[3];
            valOffset = 4;
          } else if (cols[1] && /BLANK|OREAS|LIM|SAP/i.test(cols[1])) {
            sampleLabel = cols[1];
            valOffset = 2;
          } else {
            sampleLabel = cols[3] || cols[1] || `STD-${seqNo}`;
            valOffset = 4;
          }
        }

        // 1. Pembatas Set Baru jika seqNo === 1
        if (seqNo === 1) {
          finishCurrentSet();
        }

        // 2. Auto-detect Instrument dari teks Kolom B (atau kolom alat)
        if (xrfCol && autoDetectInstrument) {
          const matchEpsilon = xrfCol.match(/EPSILON[\s_]*4?[\s_]*([A-H])/i);
          if (matchEpsilon) {
            const letter = matchEpsilon[1].toUpperCase();
            currentInstCode = `EPSILON_${letter}`;
            currentInstName = `EPSILON ${letter}`;
          } else if (xrfCol.includes('SUPERMINI') || xrfCol.includes('SUPER MINI') || xrfCol.includes('RIGAKU')) {
            currentInstCode = 'SUPERMINI';
            currentInstName = 'Supermini 200';
            detectedMatrix = 'SUPERMINI';
          } else if (xrfCol.includes('PUMA') || xrfCol.includes('S2')) {
            currentInstCode = 'S2_PUMA';
            currentInstName = 'S2 PUMA';
          } else if (xrfCol.includes('ZETIUM A') || xrfCol.includes('ZETIUM_A')) {
            currentInstCode = 'ZETIUM_A';
            currentInstName = 'Zetium A';
          } else if (xrfCol.includes('ZETIUM B') || xrfCol.includes('ZETIUM_B')) {
            currentInstCode = 'ZETIUM_B';
            currentInstName = 'Zetium B';
          }
        }

        // 3. Parse Date & Time
        let parsedIsoDate = currentDate || new Date().toISOString().slice(0, 10);
        let parsedTime = currentTime || '08:00';

        if (rawDateStr) {
          const [dPart, tPart] = rawDateStr.split(' ');
          if (dPart) {
            const dateParts = dPart.split(/[-/]/).map(n => parseInt(n, 10));
            if (dateParts.length === 3 && !dateParts.some(isNaN)) {
              let [day, month, year] = dateParts;
              if (year < 100) year = 2000 + year;
              parsedIsoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              currentDate = parsedIsoDate;
            }
          }
          if (tPart) {
            parsedTime = tPart.slice(0, 5);
            currentTime = parsedTime;
          }
        }

        // 4. Deteksi Matriks jika mode AUTO
        if (matrixMode === 'AUTO') {
          if (currentInstCode === 'SUPERMINI' || xrfCol.includes('SUPERMINI') || /BLANK\s*[AB]/i.test(sampleLabel)) {
            detectedMatrix = 'SUPERMINI';
          } else if (xrfCol.includes('LIMONITE') || /LIM/i.test(sampleLabel) || xrfCol.includes('LIM')) {
            if (detectedMatrix !== 'SUPERMINI') detectedMatrix = 'LIMONITE';
          } else if (xrfCol.includes('SAPROLITE') || /OREAS|SAP/i.test(sampleLabel) || xrfCol.includes('SAP')) {
            if (detectedMatrix !== 'SUPERMINI') detectedMatrix = 'SAPROLITE';
          }
        } else {
          detectedMatrix = matrixMode;
        }

        // 5. Skip calibration blanks (seperti VER-BLANK WAX & LICOWAX) KECUALI Supermini BLANK A / VER-BLANK B
        if (/BLANK\s*(WAX|LICO)/i.test(sampleLabel)) {
          continue;
        }
        if (/BLANK/i.test(sampleLabel) && !/BLANK\s*[AB]/i.test(sampleLabel) && detectedMatrix !== 'SUPERMINI') {
          continue;
        }

        // Normalisasi nama standar (misal BLANK A -> BLANK_A, LIM01 -> LIM01, OREAS184 -> OREAS184)
        const { standardCode, displayName } = extractStandardName(sampleLabel, detectedMatrix);

        // Helper konversi float aman (handle koma, strip, #DIV/0!)
        const parseNum = (valStr: any) => {
          if (!valStr) return 0;
          const cleanVal = String(valStr).replace(',', '.').trim();
          if (cleanVal.includes('#') || cleanVal === '-' || cleanVal.toUpperCase() === 'N/A') return 0;
          const n = parseFloat(cleanVal);
          return isNaN(n) ? 0 : n;
        };

        const ni = parseNum(cols[valOffset]);
        const co = parseNum(cols[valOffset + 1]);
        const fe = parseNum(cols[valOffset + 2]);
        const cao = parseNum(cols[valOffset + 3]);
        const sio2 = parseNum(cols[valOffset + 4]);
        const al2o3 = parseNum(cols[valOffset + 5]);
        const mgo = parseNum(cols[valOffset + 6]);
        const p = parseNum(cols[valOffset + 7]);
        const s = parseNum(cols[valOffset + 8]);
        const cr2o3 = parseNum(cols[valOffset + 9]);
        const mno = parseNum(cols[valOffset + 10]);

        // Abaikan baris kosong template tanpa hasil analisa
        if (standardCode === 'UNKNOWN' && ni === 0 && fe === 0 && sio2 === 0) {
          continue;
        }

        // BC dan FeNi
        let bc = parseNum(cols[valOffset + 11]);
        if (bc === 0 && sio2 > 0) {
          bc = Number(((cao + mgo) / sio2).toFixed(2));
        }

        let feNi = parseNum(cols[valOffset + 12]);
        if (feNi === 0 && ni > 0) {
          feNi = Number((fe / ni).toFixed(2));
        }

        const sumConc = Number((ni + co + fe + cao + sio2 + al2o3 + mgo + p + s + cr2o3 + mno).toFixed(2));

        // Evaluasi Deviasi Sigma terhadap Master Reference
        const stdRefs = refMap[standardCode] || {};
        const elementsToCheck: Array<{ key: string; val: number }> = [
          { key: 'Ni', val: ni },
          { key: 'Co', val: co },
          { key: 'Fe', val: fe },
          { key: 'CaO', val: cao },
          { key: 'SiO2', val: sio2 },
          { key: 'Al2O3', val: al2o3 },
          { key: 'MgO', val: mgo },
          { key: 'P', val: p },
          { key: 'S', val: s },
          { key: 'Cr2O3', val: cr2o3 },
          { key: 'MnO', val: mno },
        ];

        const evaluations: Record<string, any> = {};
        let itemStatus: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';

        // Untuk Blank (BLANK A / VER-BLANK B), evaluasi selalu PASS
        const isBlankSample = standardCode === 'BLANK_A' || standardCode === 'BLANK_B';

        for (const el of elementsToCheck) {
          const ref = stdRefs[el.key];
          if (!isBlankSample && ref && ref.nominalValue > 0) {
            const exp = ref.nominalValue;
            const stdev = ref.stdevFixed || 0.05;
            const diffPct = Number((((el.val - exp) / exp) * 100).toFixed(2));
            const sigmaDist = stdev > 0 ? Number(((el.val - exp) / stdev).toFixed(2)) : 0;

            let elStatus: 'PASS' | 'WARNING' | 'FAIL' = 'PASS';
            if (Math.abs(sigmaDist) > (ref.actionSigma || 3.0)) {
              elStatus = 'FAIL';
              itemStatus = 'FAIL';
            } else if (Math.abs(sigmaDist) > (ref.warningSigma || 2.0)) {
              elStatus = 'WARNING';
              if (itemStatus !== 'FAIL') itemStatus = 'WARNING';
            }

            evaluations[el.key] = {
              measured: el.val,
              expected: exp,
              diffPct,
              sigmaDist,
              status: elStatus,
            };
          } else {
            evaluations[el.key] = {
              measured: el.val,
              status: 'PASS',
            };
          }
        }

        const item: ParsedItem = {
          sequenceNo: currentItems.length + 1,
          sampleLabel,
          standardCode,
          displayName,
          analyzedAt: rawDateStr || `${parsedIsoDate} ${parsedTime}`,
          ni,
          co,
          fe,
          cao,
          sio2,
          al2o3,
          mgo,
          p,
          s,
          cr2o3,
          mno,
          bc,
          feNi,
          sumConc,
          evaluations,
          itemStatus,
        };

        currentItems.push(item);
      }

      // Flush sisa set terakhir jika ada
      finishCurrentSet();

      setParsedBatches(batches);
      if (batches.length > 0 && selectedBatchIdx === null) {
        setSelectedBatchIdx(0);
      }

      toast.success(`Berhasil mem-parsing ${batches.length} set verifikasi dari data Excel!`);
    } catch (err: any) {
      console.error('Parse error:', err);
      toast.error('Gagal mem-parsing teks: ' + err.message);
    } finally {
      setIsInspecting(false);
    }
  };

  // -------------------------------------------------------------
  // PRESET CONTOH DATA (UNTUK UJI COBA CEPAT)
  // -------------------------------------------------------------
  const handleCopySuperminiTemplate = () => {
    const header = "No\tInstrument\tDate\tSample\tNi\tCo\tFe\tCaO\tSiO2\tAl2O3\tMgO\tP\tS\tCr2O3\tMnO\tBC\tFeNi";
    const rows = [
      "1\tSUPERMINI 200 GTS\t16/10/26 08:00\tBLANK A\t0.000\t0.000\t0.000\t0.000\t0.00\t0.00\t0.00\t0.000\t0.000\t0.000\t0.000\t0.00\t0.00",
      "2\tSUPERMINI 200 GTS\t16/10/26 08:03\tVER-BLANK B\t0.000\t0.000\t0.000\t0.000\t0.00\t0.00\t0.00\t0.000\t0.000\t0.000\t0.000\t0.00\t0.00",
      "3\tSUPERMINI 200 GTS\t16/10/26 08:06\tVER-OREAS184\t1.014\t0.095\t27.170\t0.230\t41.99\t4.92\t3.18\t0.015\t0.000\t1.680\t0.660\t0.08\t26.79",
      "4\tSUPERMINI 200 GTS\t16/10/26 08:09\tVER-LIM01\t1.128\t0.150\t48.660\t0.020\t6.84\t4.47\t2.69\t0.000\t0.160\t2.350\t1.100\t0.40\t43.14",
      "5\tSUPERMINI 200 GTS\t16/10/26 08:12\tVER-LIM02\t1.228\t0.140\t46.920\t0.060\t8.70\t3.44\t4.62\t0.000\t0.120\t2.310\t1.030\t0.54\t38.21",
      "6\tSUPERMINI 200 GTS\t16/10/26 08:15\tVER-LIM03\t1.318\t0.150\t46.490\t0.050\t8.74\t4.12\t4.56\t0.000\t0.150\t2.190\t1.020\t0.53\t35.27",
      "7\tSUPERMINI 200 GTS\t16/10/26 08:18\tVER-OREAS187\t1.379\t0.060\t13.650\t0.340\t45.94\t3.01\t18.50\t0.000\t0.001\t1.040\t0.350\t0.41\t9.90",
      "8\tSUPERMINI 200 GTS\t16/10/26 08:21\tVER-LIM04\t1.435\t0.130\t43.680\t0.070\t10.98\t3.93\t6.64\t0.000\t0.120\t2.050\t0.870\t0.61\t30.44",
      "9\tSUPERMINI 200 GTS\t16/10/26 08:24\tVER-OREAS189\t1.496\t0.032\t10.580\t0.310\t44.26\t2.17\t22.73\t0.000\t0.000\t0.830\t0.230\t0.52\t7.07",
      "10\tSUPERMINI 200 GTS\t16/10/26 08:27\tVER-LIM05\t1.503\t0.140\t37.820\t0.090\t16.05\t3.26\t10.72\t0.000\t0.040\t2.020\t0.870\t0.67\t25.16",
      "11\tSUPERMINI 200 GTS\t16/10/26 08:30\tVER-OREAS190\t1.624\t0.095\t25.000\t0.120\t39.77\t5.94\t7.22\t0.000\t0.000\t1.760\t0.570\t0.18\t15.39",
      "12\tSUPERMINI 200 GTS\t16/10/26 08:33\tVER-OREAS191\t1.730\t0.067\t17.390\t0.260\t47.15\t4.20\t10.08\t0.000\t0.000\t1.280\t0.390\t0.22\t10.05",
      "13\tSUPERMINI 200 GTS\t16/10/26 08:36\tVER-OREAS192\t1.812\t0.042\t12.850\t0.280\t38.36\t2.68\t19.72\t0.000\t0.002\t0.910\t0.280\t0.52\t7.09",
      "14\tSUPERMINI 200 GTS\t16/10/26 08:39\tVER-OREAS193\t1.957\t0.050\t13.760\t0.340\t40.37\t3.08\t19.40\t0.000\t0.002\t1.010\t0.310\t0.49\t7.03",
      "15\tSUPERMINI 200 GTS\t16/10/26 08:42\tVER-SAP19\t2.023\t0.067\t17.370\t0.070\t30.73\t1.92\t26.05\t0.000\t0.020\t1.260\t0.450\t0.85\t8.59",
      "16\tSUPERMINI 200 GTS\t16/10/26 08:45\tVER-OREAS194\t2.147\t0.043\t11.680\t0.290\t40.68\t2.70\t21.79\t0.000\t0.000\t0.860\t0.260\t0.54\t5.44",
      "17\tSUPERMINI 200 GTS\t16/10/26 08:48\tVER-OREAS195\t2.925\t0.049\t12.740\t0.380\t43.35\t2.85\t18.08\t0.000\t0.001\t0.970\t0.280\t0.43\t4.36",
    ];
    const text = [header, ...rows].join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Skema template 17 standar Supermini 200 telah disalin ke clipboard! Silakan paste (Ctrl+V) ke Excel.');
  };

  const handleLoadSampleSupermini = () => {
    const sample = `1\tSUPERMINI 200 GTS\t16/10/26 08:00\tBLANK A\t0.001\t0.000\t0.010\t0.000\t0.02\t0.01\t0.00\t0.000\t0.000\t0.000\t0.000\t0.00\t0.00
2\t\t16/10/26 08:03\tVER-BLANK B\t0.001\t0.000\t0.010\t0.000\t0.02\t0.01\t0.00\t0.000\t0.000\t0.000\t0.000\t0.00\t0.00
3\t\t16/10/26 08:06\tVER-OREAS184\t1.014\t0.095\t27.170\t0.230\t41.99\t4.92\t3.18\t0.015\t0.000\t1.680\t0.660\t0.08\t26.79
4\t\t16/10/26 08:09\tVER-LIM01\t1.128\t0.150\t48.660\t0.020\t6.84\t4.47\t2.69\t0.000\t0.160\t2.350\t1.100\t0.40\t43.14
5\t\t16/10/26 08:12\tVER-LIM02\t1.228\t0.140\t46.920\t0.060\t8.70\t3.44\t4.62\t0.000\t0.120\t2.310\t1.030\t0.54\t38.21
6\t\t16/10/26 08:15\tVER-LIM03\t1.318\t0.150\t46.490\t0.050\t8.74\t4.12\t4.56\t0.000\t0.150\t2.190\t1.020\t0.53\t35.27
7\t\t16/10/26 08:18\tVER-OREAS187\t1.379\t0.060\t13.650\t0.340\t45.94\t3.01\t18.50\t0.000\t0.001\t1.040\t0.350\t0.41\t9.90
8\t\t16/10/26 08:21\tVER-LIM04\t1.435\t0.130\t43.680\t0.070\t10.98\t3.93\t6.64\t0.000\t0.120\t2.050\t0.870\t0.61\t30.44
9\t\t16/10/26 08:24\tVER-OREAS189\t1.496\t0.032\t10.580\t0.310\t44.26\t2.17\t22.73\t0.000\t0.000\t0.830\t0.230\t0.52\t7.07
10\t\t16/10/26 08:27\tVER-LIM05\t1.503\t0.140\t37.820\t0.090\t16.05\t3.26\t10.72\t0.000\t0.040\t2.020\t0.870\t0.67\t25.16
11\t\t16/10/26 08:30\tVER-OREAS190\t1.624\t0.095\t25.000\t0.120\t39.77\t5.94\t7.22\t0.000\t0.000\t1.760\t0.570\t0.18\t15.39
12\t\t16/10/26 08:33\tVER-OREAS191\t1.730\t0.067\t17.390\t0.260\t47.15\t4.20\t10.08\t0.000\t0.000\t1.280\t0.390\t0.22\t10.05
13\t\t16/10/26 08:36\tVER-OREAS192\t1.812\t0.042\t12.850\t0.280\t38.36\t2.68\t19.72\t0.000\t0.002\t0.910\t0.280\t0.52\t7.09
14\t\t16/10/26 08:39\tVER-OREAS193\t1.957\t0.050\t13.760\t0.340\t40.37\t3.08\t19.40\t0.000\t0.002\t1.010\t0.310\t0.49\t7.03
15\t\t16/10/26 08:42\tVER-SAP19\t2.023\t0.067\t17.370\t0.070\t30.73\t1.92\t26.05\t0.000\t0.020\t1.260\t0.450\t0.85\t8.59
16\t\t16/10/26 08:45\tVER-OREAS194\t2.147\t0.043\t11.680\t0.290\t40.68\t2.70\t21.79\t0.000\t0.000\t0.860\t0.260\t0.54\t5.44
17\t\t16/10/26 08:48\tVER-OREAS195\t2.925\t0.049\t12.740\t0.380\t43.35\t2.85\t18.08\t0.000\t0.001\t0.970\t0.280\t0.43\t4.36`;
    setRawText(sample);
    setSelectedInstrument('SUPERMINI');
    setMatrixMode('SUPERMINI');
    parseRawPastedData(sample);
  };

  const handleLoadSampleSaprolite = () => {
    // Replica Gambar 2 & 3
    const sample = `1\tEPSILON B SAP 04 (MYLAR)\t01/07/26 0:15\tSTD-OREAS184 B1 08/02/2026\t1.014\t0.095\t27.170\t0.230\t41.99\t4.92\t3.18\t0.015\t0.000\t1.680\t0.660\t0.08\t26.79
2\t\t01/07/26 0:18\tVER-OREAS 187 22/05/2024\t1.379\t0.060\t13.650\t0.340\t45.94\t3.01\t18.50\t0.000\t0.001\t1.040\t0.350\t0.41\t9.90
3\t\t01/07/26 0:21\tVER-OREAS 189 23/05/2024\t1.496\t0.032\t10.580\t0.310\t44.26\t2.17\t22.73\t0.000\t0.000\t0.830\t0.230\t0.52\t7.07
4\t\t01/07/26 0:24\tSTD-OREAS190 A2 08/02/2026\t1.624\t0.095\t25.000\t0.120\t39.77\t5.94\t7.22\t0.000\t0.000\t1.760\t0.570\t0.18\t15.39
5\t\t01/07/26 0:27\tVER-OREAS 191 23/05/2024\t1.730\t0.067\t17.390\t0.260\t47.15\t4.20\t10.08\t0.000\t0.000\t1.280\t0.390\t0.22\t10.05
6\t\t01/07/26 0:29\tVER-OREAS 192 23/05/2024\t1.812\t0.042\t12.850\t0.280\t38.36\t2.68\t19.72\t0.000\t0.002\t0.910\t0.280\t0.52\t7.09
7\t\t01/07/26 0:32\tVER-OREAS 193 23/05/2024\t1.957\t0.050\t13.760\t0.340\t40.37\t3.08\t19.40\t0.000\t0.002\t1.010\t0.310\t0.49\t7.03
8\t\t01/07/26 0:35\tVER-SAP19 24/05/2024\t2.023\t0.067\t17.370\t0.070\t30.73\t1.92\t26.05\t0.000\t0.020\t1.260\t0.450\t0.85\t8.59
9\t\t01/07/26 0:38\tVER-OREAS 194 23/05/2024\t2.147\t0.043\t11.680\t0.290\t40.68\t2.70\t21.79\t0.000\t0.000\t0.860\t0.260\t0.54\t5.44
10\t\t01/07/26 0:41\tVER-OREAS 195 23/05/2024\t2.925\t0.049\t12.740\t0.380\t43.35\t2.85\t18.08\t0.000\t0.001\t0.970\t0.280\t0.43\t4.36

1\tEPSILON B SAP 04 (MYLAR)\t01/07/26 23:59\tSTD-OREAS184 B1 08/02/2026\t1.012\t0.094\t27.190\t0.230\t41.95\t4.93\t3.14\t0.014\t0.000\t1.690\t0.660\t0.08\t26.87
2\t\t02/07/26 0:02\tVER-OREAS 187 22/05/2024\t1.379\t0.059\t13.650\t0.340\t45.91\t2.97\t18.31\t0.000\t0.001\t1.040\t0.350\t0.41\t9.90
3\t\t02/07/26 0:05\tVER-OREAS 189 23/05/2024\t1.495\t0.032\t10.590\t0.310\t44.40\t2.12\t22.62\t0.000\t0.000\t0.830\t0.230\t0.52\t7.08
4\t\t02/07/26 0:07\tSTD-OREAS190 A2 08/02/2026\t1.621\t0.094\t25.020\t0.110\t39.88\t6.01\t7.24\t0.000\t0.000\t1.750\t0.570\t0.18\t15.43
5\t\t02/07/26 0:10\tVER-OREAS 191 23/05/2024\t1.730\t0.067\t17.380\t0.260\t46.98\t4.13\t10.05\t0.003\t0.000\t1.280\t0.390\t0.22\t10.05
6\t\t02/07/26 0:13\tVER-OREAS 192 23/05/2024\t1.814\t0.041\t12.860\t0.280\t38.33\t2.66\t19.44\t0.000\t0.001\t0.910\t0.280\t0.51\t7.09
7\t\t02/07/26 0:16\tVER-OREAS 193 23/05/2024\t1.956\t0.049\t13.760\t0.330\t40.47\t3.08\t19.50\t0.003\t0.000\t1.010\t0.310\t0.49\t7.03
8\t\t02/07/26 0:19\tVER-SAP19 24/05/2024\t2.023\t0.066\t17.370\t0.070\t30.70\t1.88\t25.94\t0.000\t0.019\t1.260\t0.440\t0.85\t8.59
9\t\t02/07/26 0:22\tVER-OREAS 194 23/05/2024\t2.150\t0.043\t11.690\t0.290\t40.84\t2.68\t22.05\t0.001\t0.000\t0.860\t0.260\t0.55\t5.44
10\t\t02/07/26 0:25\tVER-OREAS 195 23/05/2024\t2.927\t0.049\t12.750\t0.380\t43.43\t2.87\t18.20\t0.000\t0.000\t0.970\t0.280\t0.43\t4.36`;

    setRawText(sample);
    setMatrixMode('SAPROLITE');
    parseRawPastedData(sample);
  };

  const handleLoadSampleLimonite = () => {
    // Replica Gambar 4
    const sample = `1\tEPSILON A LIM 02\t01/07/26 0:02\tVER-LIM01 C 30/01/2025\t1.128\t0.150\t48.66\t0.020\t6.84\t4.47\t2.69\t0.000\t0.160\t2.350\t1.100\t0.40\t43.14
2\t\t01/07/26 0:05\tVER-LIM02 D 18/02/2025\t1.228\t0.140\t46.92\t0.060\t8.70\t3.44\t4.62\t0.000\t0.120\t2.310\t1.030\t0.54\t38.21
3\t\t01/07/26 0:09\tVER-LIM03 D 18/02/2025\t1.318\t0.150\t46.49\t0.050\t8.74\t4.12\t4.56\t0.000\t0.150\t2.190\t1.020\t0.53\t35.27
4\t\t01/07/26 0:12\tVER-LIM04 E 18/02/2025\t1.435\t0.130\t43.68\t0.070\t10.98\t3.93\t6.64\t0.000\t0.120\t2.050\t0.870\t0.61\t30.44
5\t\t01/07/26 0:15\tVER-LIM05 A 30/01/2025\t1.503\t0.140\t37.82\t0.090\t16.05\t3.26\t10.72\t0.000\t0.040\t2.020\t0.870\t0.67\t25.16

1\tEPSILON A LIM 02\t02/07/26 0:01\tVER-LIM01 C 30/01/2025\t1.131\t0.150\t48.65\t0.030\t6.86\t4.52\t2.56\t0.000\t0.160\t2.350\t1.100\t0.38\t43.02
2\t\t02/07/26 0:05\tVER-LIM02 D 18/02/2025\t1.218\t0.140\t46.79\t0.050\t8.71\t3.47\t4.74\t0.000\t0.120\t2.310\t1.030\t0.55\t38.42
3\t\t02/07/26 0:08\tVER-LIM03 D 18/02/2025\t1.318\t0.150\t46.48\t0.050\t8.72\t4.20\t4.30\t0.000\t0.150\t2.190\t1.010\t0.50\t35.27
4\t\t02/07/26 0:11\tVER-LIM04 E 18/02/2025\t1.430\t0.140\t43.64\t0.070\t11.00\t3.88\t6.75\t0.000\t0.120\t2.050\t0.860\t0.62\t30.52
5\t\t02/07/26 0:15\tVER-LIM05 A 30/01/2025\t1.493\t0.130\t37.69\t0.090\t16.07\t3.26\t10.95\t0.000\t0.040\t2.010\t0.870\t0.69\t25.24`;

    setRawText(sample);
    setMatrixMode('LIMONITE');
    parseRawPastedData(sample);
  };

  // -------------------------------------------------------------
  // STATISTIK PRE-CHECK SUMMARY
  // -------------------------------------------------------------
  const summary = useMemo(() => {
    let totalItems = 0;
    let passBatches = 0;
    let warningBatches = 0;
    let failBatches = 0;
    let incompleteBatches = 0;

    for (const b of parsedBatches) {
      totalItems += b.items.length;
      if (!b.isComplete) incompleteBatches++;
      if (b.overallStatus === 'PASS') passBatches++;
      else if (b.overallStatus === 'WARNING') warningBatches++;
      else if (b.overallStatus === 'FAIL') failBatches++;
    }

    return {
      totalBatches: parsedBatches.length,
      totalItems,
      passBatches,
      warningBatches,
      failBatches,
      incompleteBatches,
    };
  }, [parsedBatches]);

  // Filtered Batches
  const filteredBatches = useMemo(() => {
    return parsedBatches.filter(b => {
      if (statusFilter !== 'ALL' && b.overallStatus !== statusFilter) return false;
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        return (
          b.verificationDate.includes(q) ||
          b.batchCode.toLowerCase().includes(q) ||
          b.instrumentName.toLowerCase().includes(q) ||
          b.items.some(it => it.displayName.toLowerCase().includes(q) || it.sampleLabel.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [parsedBatches, statusFilter, searchFilter]);

  // -------------------------------------------------------------
  // SUBMIT KE SERVER (CHUNKED UNTUK RIBUAN BARIS DATA)
  // -------------------------------------------------------------
  const handleSaveToServer = async () => {
    if (parsedBatches.length === 0) {
      toast.error('Tidak ada data batch verifikasi yang siap disimpan.');
      return;
    }

    setIsSubmitting(true);
    const CHUNK_SIZE = 25; // kirim 25 batch per request agar stabil dan cepat
    const totalChunks = Math.ceil(parsedBatches.length / CHUNK_SIZE);
    let totalSuccessBatches = 0;
    let totalSuccessItems = 0;

    try {
      for (let c = 0; c < totalChunks; c++) {
        setSubmitProgress({ current: c + 1, total: totalChunks });
        const chunkBatches = parsedBatches.slice(c * CHUNK_SIZE, (c + 1) * CHUNK_SIZE);

        const res = await fetch('/api/xrf/bulk-import-paste', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batches: chunkBatches,
            targetInstrumentCode: selectedInstrument,
            matrixType: matrixMode,
            operatorNik,
            operatorName,
          }),
        });

        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || `Gagal menyimpan batch chunk ${c + 1}`);
        }

        totalSuccessBatches += data.batchCount || chunkBatches.length;
        totalSuccessItems += data.itemCount || 0;
      }

      toast.success(`Berhasil menyimpan ${totalSuccessBatches} batch verifikasi (${totalSuccessItems} sampel standar) ke server!`);
      if (onSuccessSave) onSuccessSave();
    } catch (err: any) {
      console.error('Submit error:', err);
      toast.error('Terjadi kesalahan saat menyimpan data ke server: ' + err.message);
    } finally {
      setIsSubmitting(false);
      setSubmitProgress(null);
    }
  };

  const activeBatch = selectedBatchIdx !== null ? parsedBatches[selectedBatchIdx] : null;

  return (
    <div className="space-y-6">
      {/* Configuration & Paste Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardPaste className="w-5 h-5 text-teal-500" />
              Direct Paste Data Verifikasi Excel (Supermini, Saprolite & Limonite)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Salin (*Ctrl+C*) tabel data dari Excel dari Kolom A (No) hingga Q (FeNi) lalu tempelkan (*Ctrl+V*) langsung ke sini. Pemisah antar set verifikasi otomatis dideteksi dari baris kosong (Kolom A kosong).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCopySuperminiTemplate}
              className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Salin skema 17 standar Supermini 200 ke clipboard untuk dipaste di Excel"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              📋 Salin Skema Supermini 200
            </button>
            <button
              onClick={handleLoadSampleSupermini}
              className="px-3 py-1.5 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-500" />
              Contoh Supermini (17 Std)
            </button>
            <button
              onClick={handleLoadSampleSaprolite}
              className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-500" />
              Contoh Saprolite (10 Std)
            </button>
            <button
              onClick={handleLoadSampleLimonite}
              className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Contoh Limonite (5 Std)
            </button>
            {rawText && (
              <button
                onClick={() => {
                  setRawText('');
                  setParsedBatches([]);
                  setSelectedBatchIdx(null);
                }}
                className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Setting Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. Target Instrument */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Instrumen Target ({activeSite})
              </label>
              {isDevOrManager && (
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setActiveSite('TBP')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      activeSite === 'TBP'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    TBP
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSite('GTS')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                      activeSite === 'GTS'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    GTS
                  </button>
                </div>
              )}
            </div>
            <select
              value={selectedInstrument}
              onChange={e => {
                const val = e.target.value;
                setSelectedInstrument(val);
                if (val === 'SUPERMINI') {
                  setMatrixMode('SUPERMINI');
                }
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 outline-none"
            >
              {siteInstruments.map(inst => (
                <option key={inst.code} value={inst.code}>
                  {inst.name} ({inst.code})
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={autoDetectInstrument}
                onChange={e => setAutoDetectInstrument(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500"
              />
              Auto-detect dari Kolom B (jika ada nama alat)
            </label>
          </div>

          {/* 2. Matrix Application Mode */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Aplikasi / Channel Matriks
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setMatrixMode('AUTO');
                  if (rawText) parseRawPastedData(rawText);
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  matrixMode === 'AUTO'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Auto
              </button>
              <button
                type="button"
                onClick={() => {
                  setMatrixMode('SUPERMINI');
                  if (rawText) parseRawPastedData(rawText);
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  matrixMode === 'SUPERMINI'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Supermini (17)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMatrixMode('SAPROLITE');
                  if (rawText) parseRawPastedData(rawText);
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  matrixMode === 'SAPROLITE'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Saprolite (10)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMatrixMode('LIMONITE');
                  if (rawText) parseRawPastedData(rawText);
                }}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  matrixMode === 'LIMONITE'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                Limonite (5)
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {matrixMode === 'SUPERMINI' && '17 Standar GTS: BLANK A, VER-BLANK B, OREAS184, LIM01..05, OREAS187..195, SAP19'}
              {matrixMode === 'SAPROLITE' && '10 Standar: OREAS 184..195 & SAP 19'}
              {matrixMode === 'LIMONITE' && '5 Standar: LIM 01 s/d LIM 05'}
              {matrixMode === 'AUTO' && 'Otomatis mendeteksi urutan Supermini (17), OREAS/SAP (10) vs LIM (5)'}
            </p>
          </div>

          {/* 3. Operator Info */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Petugas / Operator Analis
            </label>
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{operatorName}</span>
              <span className="text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded font-mono shrink-0 ml-2">
                {operatorNik}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Dicatat sebagai riwayat migrasi dan audit QA/QC
            </p>
          </div>
        </div>

        {/* Textarea Paste Box */}
        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center justify-between">
            <span>Area Paste Data Excel (TSV / CSV)</span>
            <span className="text-[10px] text-slate-400 font-normal">
              {rawText ? `${rawText.split('\n').length} baris teks terdeteksi` : 'Siap menerima ribuan baris'}
            </span>
          </label>
          <textarea
            rows={7}
            value={rawText}
            onChange={e => {
              const val = e.target.value;
              setRawText(val);
              parseRawPastedData(val);
            }}
            placeholder="Paste (Ctrl + V) data dari Excel di sini...&#10;Kolom A (No), B (XRF), C (Date Analyzed), D (Standard Code), E..O (% Ni s/d % MnO), P (BC), Q (FeNi)&#10;Tiap set dipisahkan dengan baris kosong (Kolom A kosong)."
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 outline-none resize-y"
          />
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="w-4 h-4 text-teal-500 shrink-0" />
            <span>Format otomatis menormalkan spasi nama standar (misal <strong className="text-slate-700 dark:text-slate-300">LIM01</strong> menjadi <strong className="text-slate-700 dark:text-slate-300">LIM 01</strong>).</span>
          </div>

          <button
            onClick={() => parseRawPastedData(rawText)}
            disabled={!rawText.trim() || isInspecting}
            className="px-5 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
          >
            {isInspecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Periksa & Analisis Ulang
          </button>
        </div>
      </div>

      {/* Pre-Check Summary Metric Cards */}
      {parsedBatches.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Batches */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Set Batch</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 dark:text-white">{summary.totalBatches}</span>
                <span className="text-xs text-slate-400">set ({summary.totalItems} sampel)</span>
              </div>
            </div>

            {/* PASS Batches */}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Toleransi Normal (PASS)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{summary.passBatches}</span>
                <span className="text-xs text-emerald-600/70">batch (≤ 2σ)</span>
              </div>
            </div>

            {/* WARNING Batches */}
            <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Peringatan (WARNING)</span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-700 dark:text-amber-300">{summary.warningBatches}</span>
                <span className="text-xs text-amber-600/70">batch (2σ - 3σ)</span>
              </div>
            </div>

            {/* FAIL Batches */}
            <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Di Luar Batas (FAIL)</span>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl font-black text-rose-700 dark:text-rose-300">{summary.failBatches}</span>
                <span className="text-xs text-rose-600/70">batch (&gt; 3σ)</span>
              </div>
            </div>
          </div>

          {/* Historical Data Safe Notice */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200 space-y-0.5">
              <span className="font-bold">Kebijakan Data Historis Aktif:</span>
              <p className="text-blue-700 dark:text-blue-300 leading-relaxed">
                Batch dengan status <strong className="text-rose-600 dark:text-rose-400 font-semibold">FAIL (&gt; 3σ)</strong> tetap diizinkan dan akan disimpan lengkap ke database. Data ini sangat penting untuk membentuk baseline historis dan melacak grafik tren kontrol QC mesin di masa lalu.
              </p>
            </div>
          </div>

          {/* Batch List & Inspection Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            {/* Header Toolbar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Daftar Set Batch ({filteredBatches.length} dari {parsedBatches.length})
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <div className="flex items-center gap-1">
                  {(['ALL', 'PASS', 'WARNING', 'FAIL'] as const).map(st => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        statusFilter === st
                          ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Cari tanggal / kode..."
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none w-48"
                />

                <button
                  disabled={isSubmitting}
                  onClick={handleSaveToServer}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan ({submitProgress?.current}/{submitProgress?.total})...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Simpan Semua ({parsedBatches.length} Batch) ke Server</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Split View: List Batches on Left, Detailed Table on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 min-h-[400px]">
              {/* Left Column: Batches List */}
              <div className="lg:col-span-4 max-h-[550px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-2 space-y-1">
                {filteredBatches.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Tidak ada batch yang sesuai dengan filter.
                  </div>
                ) : (
                  filteredBatches.map((b) => {
                    const isSelected = selectedBatchIdx === b.batchIndex - 1;
                    return (
                      <div
                        key={b.batchCode}
                        onClick={() => setSelectedBatchIdx(b.batchIndex - 1)}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-700/60 shadow-xs'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              Set #{b.batchIndex}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {b.verificationDate} {b.verificationTime}
                            </span>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              b.overallStatus === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                : b.overallStatus === 'WARNING'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                            }`}
                          >
                            {b.overallStatus}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{b.instrumentName}</span>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {b.matrixType} • {b.items.length} sampel
                          </span>
                        </div>

                        {!b.isComplete && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            Jumlah item tidak standar ({b.items.length} dari {b.matrixType === 'SUPERMINI' ? 17 : b.matrixType === 'SAPROLITE' ? 10 : 5})
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Right Column: Active Batch Detailed 17-Column Table */}
              <div className="lg:col-span-8 p-4 overflow-x-auto space-y-4">
                {activeBatch ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            Pratinjau Data Set #{activeBatch.batchIndex}: {activeBatch.instrumentName}
                          </span>
                          <span className="text-xs font-mono bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                            {activeBatch.batchCode}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tanggal Analisa: <strong className="text-slate-700 dark:text-slate-300">{activeBatch.verificationDate} {activeBatch.verificationTime}</strong> • Matriks: {activeBatch.matrixType} ({activeBatch.items.length} sampel)
                        </p>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block px-3 py-1 rounded-xl text-xs font-black ${
                            activeBatch.overallStatus === 'PASS'
                              ? 'bg-emerald-500 text-white'
                              : activeBatch.overallStatus === 'WARNING'
                              ? 'bg-amber-500 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          Status: {activeBatch.overallStatus}
                        </span>
                      </div>
                    </div>

                    {/* Table 17 Kolom (A - Q) */}
                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                      <table className="w-full text-left text-xs font-mono">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-600 dark:text-slate-300 divide-x divide-slate-200 dark:divide-slate-700">
                          <tr>
                            <th className="py-2 px-2 text-center">No</th>
                            <th className="py-2 px-3">Standar / Sample</th>
                            <th className="py-2 px-2 text-right">% Ni</th>
                            <th className="py-2 px-2 text-right">% Co</th>
                            <th className="py-2 px-2 text-right">% Fe</th>
                            <th className="py-2 px-2 text-right">% CaO</th>
                            <th className="py-2 px-2 text-right">% SiO2</th>
                            <th className="py-2 px-2 text-right">% Al2O3</th>
                            <th className="py-2 px-2 text-right">% MgO</th>
                            <th className="py-2 px-2 text-right">% P</th>
                            <th className="py-2 px-2 text-right">% S</th>
                            <th className="py-2 px-2 text-right">% Cr2O3</th>
                            <th className="py-2 px-2 text-right">% MnO</th>
                            <th className="py-2 px-2 text-right bg-slate-200/50 dark:bg-slate-700/50">BC</th>
                            <th className="py-2 px-2 text-right bg-slate-200/50 dark:bg-slate-700/50">FeNi</th>
                            <th className="py-2 px-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                          {activeBatch.items.map((it, idx) => (
                            <tr
                              key={`${it.standardCode}-${idx}`}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/40 divide-x divide-slate-100 dark:divide-slate-800"
                            >
                              <td className="py-1.5 px-2 text-center font-bold text-slate-500">{it.sequenceNo}</td>
                              <td className="py-1.5 px-3 font-sans">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{it.displayName}</span>
                                  {it.standardCode !== it.displayName && (
                                    <span className="text-[10px] text-slate-400 font-mono">({it.standardCode})</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono truncate max-w-[200px]" title={it.sampleLabel}>
                                  {it.sampleLabel}
                                </div>
                              </td>
                              <td className="py-1.5 px-2 text-right font-medium">{it.ni.toFixed(3)}</td>
                              <td className="py-1.5 px-2 text-right">{it.co.toFixed(3)}</td>
                              <td className="py-1.5 px-2 text-right font-medium">{it.fe.toFixed(2)}</td>
                              <td className="py-1.5 px-2 text-right">{it.cao.toFixed(3)}</td>
                              <td className="py-1.5 px-2 text-right font-medium">{it.sio2.toFixed(2)}</td>
                              <td className="py-1.5 px-2 text-right">{it.al2o3.toFixed(2)}</td>
                              <td className="py-1.5 px-2 text-right">{it.mgo.toFixed(2)}</td>
                              <td className="py-1.5 px-2 text-right">{it.p.toFixed(3)}</td>
                              <td className="py-1.5 px-2 text-right">{it.s.toFixed(3)}</td>
                              <td className="py-1.5 px-2 text-right">{it.cr2o3.toFixed(3)}</td>
                              <td className="py-1.5 px-2 text-right">{it.mno.toFixed(3)}</td>
                              <td className="py-1.5 px-2 text-right bg-slate-50/50 dark:bg-slate-900/50 font-bold">{it.bc.toFixed(2)}</td>
                              <td className="py-1.5 px-2 text-right bg-slate-50/50 dark:bg-slate-900/50 font-bold">{it.feNi.toFixed(2)}</td>
                              <td className="py-1.5 px-2 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    it.itemStatus === 'PASS'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                      : it.itemStatus === 'WARNING'
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                                      : 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                                  }`}
                                >
                                  {it.itemStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Pilih salah satu set batch di sebelah kiri untuk melihat rincian tabel 17 kolom.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
