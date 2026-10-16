import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Save, RefreshCw, Table, Sliders, CheckCircle2, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface XrfMasterReferenceTabProps {
  standards: Array<{ code: string; name: string }>;
}

const MATRIX_ELEMENTS = ['Ni', 'Co', 'Fe', 'CaO', 'SiO2', 'Al2O3', 'MgO', 'Cr2O3', 'MnO'];

// Sub-komponen baris tabel di-memoize untuk mencegah re-render massal seluruh 225 input sel saat mengetik/beralih
interface StandardMatrixRowProps {
  std: { code: string; name: string };
  stdRow: Record<string, { nominalValue: number; stdevFixed: number }>;
  activeMode: 'STDEV' | 'NOMINAL';
  onCellChange: (stdCode: string, el: string, valStr: string) => void;
}

const StandardMatrixRow = React.memo<StandardMatrixRowProps>(({
  std,
  stdRow,
  activeMode,
  onCellChange,
}) => {
  return (
    <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
      <td className="py-2 px-4 font-bold text-slate-900 dark:text-slate-100 bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-700 font-sans">
        {std.name}
      </td>
      {MATRIX_ELEMENTS.map(el => {
        const valObj = stdRow[el] || { nominalValue: 0, stdevFixed: 0 };
        const currentVal = activeMode === 'STDEV' ? valObj.stdevFixed : valObj.nominalValue;

        return (
          <td key={`cell-${std.code}-${el}`} className="py-1 px-1.5 border-r border-slate-200 dark:border-slate-700">
            <input
              type="number"
              step="0.001"
              value={currentVal !== undefined && currentVal > 0 ? currentVal : ''}
              placeholder="0.000"
              onChange={e => onCellChange(std.code, el, e.target.value)}
              className="w-full text-right px-2 py-1 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 border border-transparent focus:border-teal-500 rounded font-mono text-slate-800 dark:text-slate-100 outline-none transition-all"
            />
          </td>
        );
      })}
    </tr>
  );
});
StandardMatrixRow.displayName = 'StandardMatrixRow';

export const XrfMasterReferenceTab: React.FC<XrfMasterReferenceTabProps> = ({
  standards,
}) => {
  // Mode: 'STDEV' (Fixed Standard Deviation dari Gambar 5) vs 'NOMINAL' (Expected Certified Values)
  const [activeMode, setActiveMode] = useState<'STDEV' | 'NOMINAL'>('STDEV');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Matrix: matrix[standardCode][elementName] = { nominalValue, stdevFixed }
  const [matrix, setMatrix] = useState<Record<string, Record<string, { nominalValue: number; stdevFixed: number }>>>({});

  const loadReferences = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/xrf/references');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const map: Record<string, Record<string, any>> = {};
        for (const item of json.data) {
          map[item.standardCode] = map[item.standardCode] || {};
          map[item.standardCode][item.elementName] = {
            nominalValue: item.nominalValue,
            stdevFixed: item.stdevFixed,
          };
        }
        setMatrix(map);
      }
    } catch (err: any) {
      toast.error('Gagal memuat tabel acuan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReferences();
  }, []);

  const handleCellChange = useCallback((stdCode: string, el: string, valStr: string) => {
    const val = parseFloat(valStr) || 0;
    setMatrix(prev => {
      const updatedStd = { ...(prev[stdCode] || {}) };
      const current = updatedStd[el] || { nominalValue: 0, stdevFixed: 0 };
      
      if (activeMode === 'STDEV') {
        updatedStd[el] = { ...current, stdevFixed: val };
      } else {
        updatedStd[el] = { ...current, nominalValue: val };
      }

      return {
        ...prev,
        [stdCode]: updatedStd,
      };
    });
  }, [activeMode]);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const refList: any[] = [];
      for (const std of standards) {
        const stdMap = matrix[std.code] || {};
        for (const el of MATRIX_ELEMENTS) {
          const valObj = stdMap[el] || { nominalValue: 0, stdevFixed: 0 };
          refList.push({
            standardCode: std.code,
            elementName: el,
            nominalValue: valObj.nominalValue || 0,
            stdevFixed: valObj.stdevFixed || 0,
            warningSigma: 2.0,
            actionSigma: 3.0,
          });
        }
      }

      const res = await fetch('/api/xrf/references', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ references: refList }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Perubahan tabel master acuan berhasil disimpan!");
      } else {
        toast.error("Gagal menyimpan: " + json.error);
      }
    } catch (err: any) {
      toast.error("Koneksi gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner / Explainer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Table className="w-5 h-5 text-teal-500" />
            Master Acuan STDEV & Nominal Value (Gambar 5)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tabel acuan tetap (*fixed standard deviation*) dan nilai nominal bersertifikat yang digunakan sistem untuk menghitung batas toleransi ±2σ & ±3σ
          </p>
        </div>

        {/* Mode Selector Toggle */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex items-center text-xs font-bold">
            <button
              onClick={() => setActiveMode('STDEV')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeMode === 'STDEV'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Fixed STDEV (Gambar 5)
            </button>
            <button
              onClick={() => setActiveMode('NOMINAL')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeMode === 'NOMINAL'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Nominal Expected (CL)
            </button>
          </div>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Simpan Acuan
          </button>
        </div>
      </div>

      {/* Spreadsheet Matrix Table (Gambar 5 Replica) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Sheet Matrix: {activeMode === 'STDEV' ? 'Fixed Standard Deviation (σ)' : 'Certified Nominal Expected Values'}
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Edit langsung angka pada sel tabel di bawah ini
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border-b border-slate-300 dark:border-slate-700">
                <th className="py-2.5 px-4 min-w-[120px] border-r border-slate-200 dark:border-slate-700">
                  Standard CRM
                </th>
                {MATRIX_ELEMENTS.map(el => (
                  <th key={`hdr-${el}`} className="py-2.5 px-3 text-right min-w-[85px] border-r border-slate-200 dark:border-slate-700">
                    {el}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
              {standards.map((std, idx) => (
                <StandardMatrixRow
                  key={`std-row-${std.code}-${idx}`}
                  std={std}
                  stdRow={matrix[std.code] || {}}
                  activeMode={activeMode}
                  onCellChange={handleCellChange}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
