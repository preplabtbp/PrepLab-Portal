import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Trash2, 
  Plus, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpDown, 
  CheckCircle2, 
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { ScreenTestRecord } from './screen-test-types';
import { exportToExcel } from './screen-test-utils';

interface ScreenTestTableProps {
  records: ScreenTestRecord[];
  onDeleteRecord: (id: string) => void;
  onClearAll: () => void;
  onAddRecord: (record: ScreenTestRecord) => void;
  specLimit?: number;
}

export const ScreenTestTable: React.FC<ScreenTestTableProps> = ({
  records,
  onDeleteRecord,
  onClearAll,
  onAddRecord,
  specLimit = 95.00,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'fail'>('all');
  const [operatorFilter, setOperatorFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof ScreenTestRecord>('no');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [showAddModal, setShowAddModal] = useState(false);

  // Unique operators for dropdown filter
  const operators = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.operator) set.add(r.operator.toUpperCase());
    });
    return Array.from(set).sort();
  }, [records]);

  // Filtered and sorted records
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchSample = r.sampleId.toLowerCase().includes(q);
          const matchOperator = r.operator.toLowerCase().includes(q);
          const matchDate = r.date.toLowerCase().includes(q);
          if (!matchSample && !matchOperator && !matchDate) return false;
        }

        if (statusFilter === 'pass' && !r.isPass) return false;
        if (statusFilter === 'fail' && r.isPass) return false;

        if (operatorFilter !== 'all' && r.operator.toUpperCase() !== operatorFilter) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortAsc ? valA - valB : valB - valA;
        }
        return sortAsc 
          ? String(valA).localeCompare(String(valB)) 
          : String(valB).localeCompare(String(valA));
      });
  }, [records, searchQuery, statusFilter, operatorFilter, sortField, sortAsc]);

  // Pagination slice
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  const handleSort = (field: keyof ScreenTestRecord) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Add Manual Sample State
  const [newNo, setNewNo] = useState<number>(records.length + 1);
  const [newDate, setNewDate] = useState<string>(new Date().toLocaleDateString('id-ID'));
  const [newSampleId, setNewSampleId] = useState<string>('');
  const [newOrig, setNewOrig] = useState<number>(20.00);
  const [newUnpassed, setNewUnpassed] = useState<number>(0.50);
  const [newOperator, setNewOperator] = useState<string>('ARDILA');

  const handleSaveNewSample = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSampleId.trim()) return;

    const orig = Number(newOrig) || 20.00;
    const unpassed = Number(newUnpassed) || 0;
    const passed = +(orig - unpassed).toFixed(2);
    const pct = +((passed / orig) * 100).toFixed(2);
    const isPass = pct >= specLimit;

    onAddRecord({
      id: `manual-${Date.now()}`,
      no: newNo,
      date: newDate,
      sampleId: newSampleId.trim().toUpperCase(),
      originalWeight: orig,
      unpassedWeight: unpassed,
      passedWeight: passed,
      passedPercentage: pct,
      minPassed: specLimit,
      operator: newOperator.trim().toUpperCase(),
      isPass,
    });

    setShowAddModal(false);
    setNewSampleId('');
    setNewNo(records.length + 2);
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-300 shadow-sm p-4 sm:p-5 text-slate-900 transition-all">
      {/* Title & Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Screen Test Sample Smelter HPL
            </h3>
            <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-md">
              {filteredRecords.length} Baris Data
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Tabel rekapitulasi pengujian ayakan 200 mesh (standar kelulusan min: {specLimit.toFixed(2)}%)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportToExcel(filteredRecords)}
            disabled={filteredRecords.length === 0}
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNewNo(records.length + 1);
              setShowAddModal(true);
            }}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Sampel</span>
          </button>

          {records.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus Semua</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          {/* Search box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Cari ID Sampel, Analis, atau Tanggal..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-300">
            <button
              type="button"
              onClick={() => { setStatusFilter('all'); setPage(1); }}
              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                statusFilter === 'all' ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({records.length})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('pass'); setPage(1); }}
              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                statusFilter === 'pass' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Lolos ({records.filter(r => r.isPass).length})
            </button>
            <button
              type="button"
              onClick={() => { setStatusFilter('fail'); setPage(1); }}
              className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-all ${
                statusFilter === 'fail' ? 'bg-rose-100 text-rose-800 font-bold' : 'text-slate-600 hover:text-rose-700'
              }`}
            >
              Out of Spec ({records.filter(r => !r.isPass).length})
            </button>
          </div>

          {/* Operator filter */}
          {operators.length > 0 && (
            <select
              value={operatorFilter}
              onChange={(e) => {
                setOperatorFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-600"
            >
              <option value="all">Semua Analis ({operators.length})</option>
              {operators.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          )}
        </div>

        {/* Rows per page */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <span>Baris:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Main Table - Exact Excel Visual Style (Yellow Header & Rose Highlighting) */}
      <div className="mt-3 border-2 border-slate-400 rounded-lg overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            {/* Row 1 Header - Bright Excel Yellow */}
            <tr className="bg-yellow-300 text-slate-900 font-bold font-sans text-xs border-b border-slate-400">
              <th rowSpan={2} className="p-2.5 border-r border-slate-400 text-center cursor-pointer hover:bg-yellow-400" onClick={() => handleSort('no')}>
                <div className="flex items-center justify-center gap-1">
                  <span>No</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th rowSpan={2} className="p-2.5 border-r border-slate-400 text-center cursor-pointer hover:bg-yellow-400" onClick={() => handleSort('date')}>
                <div className="flex items-center justify-center gap-1">
                  <span>Date</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th rowSpan={2} className="p-2.5 border-r border-slate-400 text-center cursor-pointer hover:bg-yellow-400" onClick={() => handleSort('sampleId')}>
                <div className="flex items-center justify-center gap-1">
                  <span>ID Sample</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th rowSpan={2} className="p-2.5 border-r border-slate-400 text-center">
                <div>Original Weight (gr)</div>
                <div className="text-[11px] font-black text-slate-800 mt-0.5">A</div>
              </th>
              <th colSpan={2} className="p-2 border-r border-slate-400 text-center bg-yellow-300 font-bold">
                Screen Test 200 mesh (Sample Weight)
              </th>
              <th rowSpan={2} className="p-2.5 border-r border-slate-400 text-center cursor-pointer hover:bg-yellow-400" onClick={() => handleSort('passedPercentage')}>
                <div>Passed (%)</div>
                <div className="text-[11px] font-black text-slate-800 mt-0.5">% = C / A &times; 100</div>
              </th>
              <th rowSpan={2} className="p-2.5 border-r border-slate-400 text-center">Min Passed</th>
              <th rowSpan={2} className="p-2.5 border-r border-slate-400 text-center cursor-pointer hover:bg-yellow-400" onClick={() => handleSort('operator')}>
                <div className="flex items-center justify-center gap-1">
                  <span>By</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-600" />
                </div>
              </th>
              <th rowSpan={2} className="p-2.5 text-center">Aksi</th>
            </tr>

            {/* Row 2 Subheader - B and C columns */}
            <tr className="bg-yellow-300 text-slate-900 font-bold text-[11px] border-b border-slate-400">
              <th className="p-2 border-r border-slate-400 text-center">
                Unpassed (gr)<br /><span className="text-xs font-black">B</span>
              </th>
              <th className="p-2 border-r border-slate-400 text-center">
                Passed (gr)<br /><span className="text-xs font-black">C = (A - B)</span>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-300 font-mono text-xs text-slate-900">
            {paginatedRecords.length === 0 ? (
              <tr>
                <td colSpan={10} className="p-8 text-center text-slate-500 font-sans">
                  Tidak ada data sampel yang cocok dengan pencarian / filter.
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, index) => {
                const isOutOfSpec = !r.isPass;
                return (
                  <tr 
                    key={r.id || index}
                    className={`transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                    } hover:bg-blue-50/50`}
                  >
                    <td className="p-2.5 border-r border-slate-300 text-center text-slate-700">{r.no ?? (page - 1) * pageSize + index + 1}</td>
                    <td className="p-2.5 border-r border-slate-300 text-center text-slate-800">{r.date}</td>
                    <td className="p-2.5 border-r border-slate-300 text-left font-bold text-slate-900 tracking-tight font-mono">{r.sampleId}</td>
                    <td className="p-2.5 border-r border-slate-300 text-right text-slate-900">{r.originalWeight.toFixed(2)}</td>
                    <td className="p-2.5 border-r border-slate-300 text-right text-slate-900">{r.unpassedWeight.toFixed(2)}</td>
                    <td className="p-2.5 border-r border-slate-300 text-right text-slate-900">{r.passedWeight.toFixed(2)}</td>
                    
                    {/* PASSED % CELL - EXACT EXCEL RED SHADING WHEN OUT OF SPEC */}
                    <td className={`p-2.5 border-r border-slate-300 text-right font-black text-xs ${
                      isOutOfSpec 
                        ? 'bg-[#FCA5A5]/80 text-[#991B1B] font-bold' 
                        : 'text-slate-900'
                    }`}>
                      {r.passedPercentage.toFixed(2)}%
                    </td>

                    <td className="p-2.5 border-r border-slate-300 text-center text-slate-700">{r.minPassed.toFixed(2)}%</td>
                    <td className="p-2.5 border-r border-slate-300 text-center font-bold text-slate-800">{r.operator}</td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => onDeleteRecord(r.id)}
                        title="Hapus Baris Ini"
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div>
          Menampilkan {filteredRecords.length > 0 ? (page - 1) * pageSize + 1 : 0} -{' '}
          {Math.min(page * pageSize, filteredRecords.length)} dari {filteredRecords.length} sampel
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <span className="px-3 py-1 font-mono text-slate-700 font-semibold">
            Halaman {page} dari {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Manual Add Sample Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white border border-slate-300 rounded-2xl shadow-xl p-5 text-slate-900">
            <h4 className="text-base font-bold text-slate-900 mb-3">Tambah Sampel Screen Test Manual</h4>
            <form onSubmit={handleSaveNewSample} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1">Nomor (No):</label>
                  <input
                    type="number"
                    value={newNo}
                    onChange={(e) => setNewNo(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">Tanggal:</label>
                  <input
                    type="text"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1">ID Sample:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: TBP20261025-A1"
                  value={newSampleId}
                  onChange={(e) => setNewSampleId(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-600 block mb-1">Original Weight [A] (gr):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrig}
                    onChange={(e) => setNewOrig(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-600 block mb-1">Tertahan 200 Mesh [B] (gr):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newUnpassed}
                    onChange={(e) => setNewUnpassed(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-600 block mb-1">Operator / Analis (By):</label>
                <input
                  type="text"
                  value={newOperator}
                  onChange={(e) => setNewOperator(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 uppercase"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg"
                >
                  Simpan Sampel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
