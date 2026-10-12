import React, { useState, useEffect } from 'react';
import { 
  Save, Clipboard, RefreshCw, AlertCircle, CheckCircle2, AlertTriangle, 
  ArrowUp, ArrowDown, Sparkles, FileSpreadsheet, Plus 
} from 'lucide-react';
import { toast } from 'sonner';

interface XrfDailyInputTabProps {
  instruments: Array<{ code: string; name: string }>;
  standards: Array<{ code: string; name: string }>;
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

const DEFAULT_ELEMENTS = ['Ni', 'Co', 'Fe', 'CaO', 'SiO2', 'Al2O3', 'MgO', 'P', 'S', 'Cr2O3', 'MnO'];

export const XrfDailyInputTab: React.FC<XrfDailyInputTabProps> = ({
  instruments,
  standards,
  onSuccessSave,
}) => {
  // Batch Header State
  const [selectedInstrument, setSelectedInstrument] = useState(instruments[0]?.code || 'EPSILON_B');
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

  // 5 Rows of Standard Samples (Default LIM01 s/d LIM05)
  const [rows, setRows] = useState<StandardRowInput[]>([
    { standardCode: 'LIM01', sampleLabel: 'VER-LIM01 D 18/02/2025', sequenceNo: 1, analyzedAt: '00:26', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
    { standardCode: 'LIM02', sampleLabel: 'VER-LIM02 D 18/02/2025', sequenceNo: 2, analyzedAt: '01:01', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
    { standardCode: 'LIM03', sampleLabel: 'VER-LIM03 D 18/02/2025', sequenceNo: 3, analyzedAt: '01:05', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
    { standardCode: 'LIM04', sampleLabel: 'VER-LIM04 E 18/02/2025', sequenceNo: 4, analyzedAt: '01:08', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
    { standardCode: 'LIM05', sampleLabel: 'VER-LIM05 A 30/01/2025', sequenceNo: 5, analyzedAt: '01:11', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  ]);

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

  // Quick Paste from Excel handler
  const handleApplyPaste = () => {
    if (!rawPastedText.trim()) return;

    try {
      const lines = rawPastedText
        .trim()
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

      const parsedRows: StandardRowInput[] = [];

      for (let i = 0; i < lines.length && i < 10; i++) {
        const parts = lines[i].split('\t').map(p => p.trim());
        // If line is header, skip
        if (parts.some(p => p.toLowerCase().includes('sample code') || p.toLowerCase().includes('date of'))) {
          continue;
        }

        // Typical Excel column index:
        // Col 0: No (1)
        // Col 1: Date of Analyzed (09/10/26 0:26)
        // Col 2: Standard Sample Code (VER-LIM01 D 18/02/2025)
        // Col 3: Ni (1.109)
        // Col 4: Co (0.138)
        // Col 5: Fe (47.52)
        // Col 6: CaO (0.020)
        // Col 7: SiO2 (7.22)
        // Col 8: Al2O3 (4.69)
        // Col 9: MgO (3.51)
        // Col 10: P (0.000)
        // Col 11: S (0.142)
        // Col 12: Cr2O3 (2.290)
        // Col 13: MnO (1.110)

        let offset = 0;
        // Detect where numbers start
        const numStartIdx = parts.findIndex(p => !isNaN(parseFloat(p.replace(',', '.'))) && parseFloat(p.replace(',', '.')) > 0);
        
        let sampleCode = `LIM0${parsedRows.length + 1}`;
        let sampleLabel = `VER-LIM0${parsedRows.length + 1}`;
        let analyzedAt = verificationTime;

        if (numStartIdx >= 2) {
          analyzedAt = parts[numStartIdx - 2] || analyzedAt;
          sampleLabel = parts[numStartIdx - 1] || sampleLabel;
          // extract standard code like LIM01
          const match = sampleLabel.match(/LIM\s*0?(\d)/i) || sampleLabel.match(/OREAS\s*(\d+)/i);
          if (match) {
            sampleCode = sampleLabel.includes('OREAS') ? `OREAS${match[1]}` : `LIM0${match[1]}`;
          }
          offset = numStartIdx;
        } else if (numStartIdx === 1) {
          offset = 1;
        } else {
          offset = 0;
        }

        const getVal = (idx: number) => {
          const raw = parts[offset + idx];
          if (!raw) return '';
          return raw.replace(',', '.');
        };

        parsedRows.push({
          standardCode: sampleCode,
          sampleLabel: sampleLabel,
          sequenceNo: parsedRows.length + 1,
          analyzedAt: analyzedAt,
          ni: getVal(0),
          co: getVal(1),
          fe: getVal(2),
          cao: getVal(3),
          sio2: getVal(4),
          al2o3: getVal(5),
          mgo: getVal(6),
          p: getVal(7),
          s: getVal(8),
          cr2o3: getVal(9),
          mno: getVal(10),
        });
      }

      if (parsedRows.length > 0) {
        setRows(parsedRows);
        setShowPasteModal(false);
        setRawPastedText('');
        toast.success(`Berhasil mem-parsing ${parsedRows.length} baris dari Excel!`);
      } else {
        toast.error("Gagal mendeteksi format data baris. Pastikan meng-copy baris data tabel Excel.");
      }
    } catch (err: any) {
      toast.error("Format data clipboard tidak dapat dibaca: " + err.message);
    }
  };

  // Pre-fill demo sample values (Image 1 replica)
  const handleFillImage1Sample = () => {
    setRows([
      { standardCode: 'LIM01', sampleLabel: 'VER-LIM01 D 18/02/2025', sequenceNo: 1, analyzedAt: '00:26', ni: '1.109', co: '0.138', fe: '47.52', cao: '0.020', sio2: '7.22', al2o3: '4.69', mgo: '3.51', p: '0.000', s: '0.142', cr2o3: '2.290', mno: '1.110' },
      { standardCode: 'LIM02', sampleLabel: 'VER-LIM02 D 18/02/2025', sequenceNo: 2, analyzedAt: '01:01', ni: '1.214', co: '0.129', fe: '46.05', cao: '0.060', sio2: '8.96', al2o3: '3.53', mgo: '5.28', p: '0.000', s: '0.125', cr2o3: '2.220', mno: '1.030' },
      { standardCode: 'LIM03', sampleLabel: 'VER-LIM03 D 18/02/2025', sequenceNo: 3, analyzedAt: '01:05', ni: '1.287', co: '0.134', fe: '45.59', cao: '0.050', sio2: '8.77', al2o3: '4.22', mgo: '5.04', p: '0.000', s: '0.146', cr2o3: '2.100', mno: '1.020' },
      { standardCode: 'LIM04', sampleLabel: 'VER-LIM04 E 18/02/2025', sequenceNo: 4, analyzedAt: '01:08', ni: '1.426', co: '0.121', fe: '43.12', cao: '0.060', sio2: '10.89', al2o3: '3.84', mgo: '7.06', p: '0.001', s: '0.128', cr2o3: '1.960', mno: '0.880' },
      { standardCode: 'LIM05', sampleLabel: 'VER-LIM05 A 30/01/2025', sequenceNo: 5, analyzedAt: '01:11', ni: '1.527', co: '0.117', fe: '37.34', cao: '0.070', sio2: '15.77', al2o3: '3.27', mgo: '11.02', p: '0.006', s: '0.082', cr2o3: '1.830', mno: '0.850' },
    ]);
    toast.success("Berhasil memuat contoh data analisa Gambar 1!");
  };

  // Submit Batch
  const handleSubmitBatch = async () => {
    // Basic validation
    const hasAnyValue = rows.some(r => r.ni || r.fe || r.cr2o3);
    if (!hasAnyValue) {
      toast.error("Harap isi hasil analisa sebelum menyimpan.");
      return;
    }

    setLoading(true);
    try {
      const instObj = instruments.find(i => i.code === selectedInstrument);
      const payload = {
        instrumentCode: selectedInstrument,
        instrumentName: instObj?.name || selectedInstrument,
        verificationDate,
        verificationTime,
        shift,
        operatorNik: userNik,
        operatorName: userName,
        notes,
        items: rows.map(r => ({
          standardCode: r.standardCode,
          sampleLabel: r.sampleLabel,
          sequenceNo: r.sequenceNo,
          analyzedAt: `${verificationDate} ${r.analyzedAt}`.trim(),
          ni: r.ni ? parseFloat(r.ni) : null,
          co: r.co ? parseFloat(r.co) : null,
          fe: r.fe ? parseFloat(r.fe) : null,
          cao: r.cao ? parseFloat(r.cao) : null,
          sio2: r.sio2 ? parseFloat(r.sio2) : null,
          al2o3: r.al2o3 ? parseFloat(r.al2o3) : null,
          mgo: r.mgo ? parseFloat(r.mgo) : null,
          p: r.p ? parseFloat(r.p) : null,
          s: r.s ? parseFloat(r.s) : null,
          cr2o3: r.cr2o3 ? parseFloat(r.cr2o3) : null,
          mno: r.mno ? parseFloat(r.mno) : null,
        }))
      };

      const res = await fetch('/api/xrf/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Data Verifikasi Harian berhasil disimpan ke sistem!");
        if (onSuccessSave) onSuccessSave();
      } else {
        toast.error("Gagal menyimpan: " + (json.error || 'Terjadi kesalahan'));
      }
    } catch (err: any) {
      toast.error("Koneksi gagal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-teal-500" />
              Daily Verifikasi Sample Standard (XRF)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Form penginputan batch verifikasi standar harian dengan kalkulasi deviasi & toleransi otomatis
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowPasteModal(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all"
            >
              <Clipboard className="w-3.5 h-3.5" />
              Paste from Excel
            </button>
            <button
              onClick={handleFillImage1Sample}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Isi Contoh Gambar 1
            </button>
          </div>
        </div>

        {/* Batch Metadata Fields */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3.5 mt-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Alat XRF
            </label>
            <select
              value={selectedInstrument}
              onChange={e => setSelectedInstrument(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            >
              {instruments.map(inst => (
                <option key={inst.code} value={inst.code}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Tanggal Analisa
            </label>
            <input
              type="date"
              value={verificationDate}
              onChange={e => setVerificationDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Shift
            </label>
            <select
              value={shift}
              onChange={e => setShift(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            >
              <option value="1">Shift 1 (Day)</option>
              <option value="2">Shift 2 (Night)</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Operator
            </label>
            <input
              type="text"
              readOnly
              value={userName}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 cursor-not-allowed"
            />
          </div>

          <div className="col-span-2 sm:col-span-4 md:col-span-1">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Catatan / Kondisi
            </label>
            <input
              type="text"
              placeholder="Normal, fluks baru..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Main Verification Input Table (Persis Format Gambar 1) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Tabel Pengukuran Standar Harian (5 Baris)
          </span>
          <span className="text-[11px] text-slate-500">
            Kadar unsur dalam persen (%)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-fuchsia-100/70 dark:bg-fuchsia-950/40 text-fuchsia-900 dark:text-fuchsia-200 border-b border-fuchsia-200 dark:border-fuchsia-800/50 text-[11px] font-bold">
                <th className="py-2.5 px-2 text-center w-8">NO</th>
                <th className="py-2.5 px-3 min-w-[130px]">Standard Sample Code</th>
                <th className="py-2.5 px-2 text-center min-w-[70px]">Time</th>
                <th className="py-2.5 px-2 text-right min-w-[65px] bg-fuchsia-200/50 dark:bg-fuchsia-900/30">Ni %</th>
                <th className="py-2.5 px-2 text-right min-w-[65px]">Co %</th>
                <th className="py-2.5 px-2 text-right min-w-[70px] bg-fuchsia-200/50 dark:bg-fuchsia-900/30">Fe %</th>
                <th className="py-2.5 px-2 text-right min-w-[65px]">CaO %</th>
                <th className="py-2.5 px-2 text-right min-w-[70px] bg-fuchsia-200/50 dark:bg-fuchsia-900/30">SiO2 %</th>
                <th className="py-2.5 px-2 text-right min-w-[65px]">Al2O3 %</th>
                <th className="py-2.5 px-2 text-right min-w-[65px]">MgO %</th>
                <th className="py-2.5 px-2 text-right min-w-[60px]">P %</th>
                <th className="py-2.5 px-2 text-right min-w-[65px]">S %</th>
                <th className="py-2.5 px-2 text-right min-w-[70px] bg-fuchsia-200/50 dark:bg-fuchsia-900/30">Cr2O3 %</th>
                <th className="py-2.5 px-2 text-right min-w-[65px]">MnO %</th>
                <th className="py-2.5 px-2 text-right min-w-[55px] font-extrabold text-blue-700 dark:text-blue-300">BC</th>
                <th className="py-2.5 px-2 text-right min-w-[55px] font-extrabold text-blue-700 dark:text-blue-300">FeNi</th>
                <th className="py-2.5 px-2 text-right min-w-[65px] font-extrabold text-blue-700 dark:text-blue-300">Sum %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {rows.map((row, idx) => {
                const calcs = computeRowCalculations(row);
                return (
                  <tr key={`row-${idx}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-2 text-center font-bold text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={row.sampleLabel}
                        onChange={e => handleCellChange(idx, 'sampleLabel', e.target.value)}
                        className="w-full bg-transparent border-b border-transparent focus:border-teal-500 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={row.analyzedAt}
                        onChange={e => handleCellChange(idx, 'analyzedAt', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-1 text-center text-xs font-mono"
                      />
                    </td>
                    {/* Elements */}
                    <td className="py-1.5 px-1 bg-fuchsia-50/30 dark:bg-fuchsia-950/20">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={row.ni}
                        onChange={e => handleCellChange(idx, 'ni', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-right text-xs font-mono font-medium focus:border-teal-500 outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={row.co}
                        onChange={e => handleCellChange(idx, 'co', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-right text-xs font-mono focus:border-teal-500 outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-1 bg-fuchsia-50/30 dark:bg-fuchsia-950/20">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.fe}
                        onChange={e => handleCellChange(idx, 'fe', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-right text-xs font-mono font-medium focus:border-teal-500 outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={row.cao}
                        onChange={e => handleCellChange(idx, 'cao', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-right text-xs font-mono focus:border-teal-500 outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-1 bg-fuchsia-50/30 dark:bg-fuchsia-950/20">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.sio2}
                        onChange={e => handleCellChange(idx, 'sio2', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-right text-xs font-mono font-medium focus:border-teal-500 outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.al2o3}
                        onChange={e => handleCellChange(idx, 'al2o3', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-right text-xs font-mono focus:border-teal-500 outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={row.mgo}
                        onChange={e => handleCellChange(idx, 'mgo', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-right text-xs font-mono focus:border-teal-500 outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={row.p}
                        onChange={e => handleCellChange(idx, 'p', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-right text-xs font-mono focus:border-teal-500 outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={row.s}
                        onChange={e => handleCellChange(idx, 's', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-right text-xs font-mono focus:border-teal-500 outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-1 bg-fuchsia-50/30 dark:bg-fuchsia-950/20">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={row.cr2o3}
                        onChange={e => handleCellChange(idx, 'cr2o3', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-right text-xs font-mono font-medium focus:border-teal-500 outline-none"
                      />
                    </td>
                    <td className="py-1.5 px-1">
                      <input
                        type="number"
                        step="0.001"
                        placeholder="0.000"
                        value={row.mno}
                        onChange={e => handleCellChange(idx, 'mno', e.target.value)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-right text-xs font-mono focus:border-teal-500 outline-none"
                      />
                    </td>
                    {/* Calculated Columns */}
                    <td className="py-2 px-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40">
                      {calcs.bc}
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40">
                      {calcs.feNi}
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-slate-50 dark:bg-slate-800/40">
                      {calcs.sum}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Deviation Evaluation Blocks (Persis Baris 15-43 di Gambar 1) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Live Evaluasi Deviasi vs Expected Value (Gambar 1)
          </h3>
          <span className="text-[11px] text-slate-500">
            Rumus Diff % = ((Measured - Expected) / Expected) * 100%
          </span>
        </div>

        <div className="space-y-4">
          {rows.map((row, idx) => {
            const stdRefs = references[row.standardCode] || {};
            const elements = [
              { key: 'Ni', val: parseFloat(row.ni) },
              { key: 'Co', val: parseFloat(row.co) },
              { key: 'Fe', val: parseFloat(row.fe) },
              { key: 'CaO', val: parseFloat(row.cao) },
              { key: 'SiO2', val: parseFloat(row.sio2) },
              { key: 'Al2O3', val: parseFloat(row.al2o3) },
              { key: 'MgO', val: parseFloat(row.mgo) },
              { key: 'P', val: parseFloat(row.p) },
              { key: 'S', val: parseFloat(row.s) },
              { key: 'Cr2O3', val: parseFloat(row.cr2o3) },
              { key: 'MnO', val: parseFloat(row.mno) },
            ];

            return (
              <div 
                key={`eval-${idx}`}
                className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs font-mono"
              >
                {/* Header Sub-table */}
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 font-bold flex items-center justify-between text-slate-800 dark:text-slate-200 font-sans">
                  <span>{row.sampleLabel || row.standardCode}</span>
                  <span className="text-[11px] font-mono font-normal text-slate-500">Standar #{idx + 1}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-[11px]">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-500">
                        <th className="py-1 px-3 text-left w-28">Kategori</th>
                        {elements.map(e => (
                          <th key={`th-${e.key}`} className="py-1 px-2 min-w-[55px]">{e.key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {/* 1. Measured Value */}
                      <tr className="bg-white dark:bg-slate-900">
                        <td className="py-1 px-3 text-left font-sans font-semibold text-slate-700 dark:text-slate-300">
                          Measured
                        </td>
                        {elements.map(e => (
                          <td key={`meas-${e.key}`} className="py-1 px-2 font-medium">
                            {!isNaN(e.val) ? e.val.toFixed(e.key === 'Ni' || e.key === 'Cr2O3' ? 3 : 2) : '-'}
                          </td>
                        ))}
                      </tr>

                      {/* 2. Expected Value */}
                      <tr className="bg-slate-50/40 dark:bg-slate-950/30 text-slate-500">
                        <td className="py-1 px-3 text-left font-sans text-slate-500">
                          Expected Value
                        </td>
                        {elements.map(e => {
                          const exp = stdRefs[e.key]?.nominalValue;
                          return (
                            <td key={`exp-${e.key}`} className="py-1 px-2">
                              {exp !== undefined ? exp.toFixed(e.key === 'Ni' || e.key === 'Cr2O3' ? 3 : 2) : '-'}
                            </td>
                          );
                        })}
                      </tr>

                      {/* 3. Diff % */}
                      <tr className="bg-white dark:bg-slate-900">
                        <td className="py-1 px-3 text-left font-sans font-bold text-slate-700 dark:text-slate-300">
                          Diff. %
                        </td>
                        {elements.map(e => {
                          const exp = stdRefs[e.key]?.nominalValue;
                          if (isNaN(e.val) || !exp || exp === 0) {
                            return <td key={`diff-${e.key}`} className="py-1 px-2 text-slate-400">-</td>;
                          }

                          const diffPct = ((e.val - exp) / exp) * 100;
                          const stdev = stdRefs[e.key]?.stdevFixed || 0.05;
                          const sigmaDist = Math.abs((e.val - exp) / stdev);

                          const isOutCritical = sigmaDist > 3.0 || Math.abs(diffPct) > 10;
                          const isWarning = sigmaDist > 2.0;

                          const bgClass = isOutCritical
                            ? 'bg-red-600 text-white font-extrabold px-1 rounded'
                            : isWarning
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold px-1 rounded'
                            : 'text-slate-700 dark:text-slate-300';

                          return (
                            <td key={`diff-${e.key}`} className="py-1 px-1">
                              <span className={`inline-flex items-center justify-end gap-0.5 ${bgClass}`}>
                                {diffPct > 0 ? (
                                  <ArrowUp className="w-2.5 h-2.5 shrink-0 inline text-emerald-500" />
                                ) : (
                                  <ArrowDown className="w-2.5 h-2.5 shrink-0 inline text-red-500" />
                                )}
                                {diffPct.toFixed(2)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Actions */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            disabled={loading}
            onClick={handleSubmitBatch}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Verifikasi Harian
          </button>
        </div>
      </div>

      {/* Modal Quick Paste from Excel */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clipboard className="w-4 h-4 text-emerald-500" />
                Paste Data Tabel dari Excel (Ctrl + V)
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Salin (*copy*) baris data dari Excel (dari kolom Standard Sample Code hingga MnO) lalu tempelkan (*paste*) pada kotak teks di bawah ini:
            </p>

            <textarea
              rows={8}
              value={rawPastedText}
              onChange={e => setRawPastedText(e.target.value)}
              placeholder="Contoh format:&#10;VER-LIM01&#t1.109&#t0.138&#t47.52&#t0.020&#t7.22&#t4.69&#t3.51&#t0.000&#t0.142&#t2.290&#t1.110"
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleApplyPaste}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
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
