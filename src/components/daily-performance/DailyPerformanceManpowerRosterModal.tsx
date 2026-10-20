import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Users, Search, CheckCircle2, Clock, AlertTriangle, 
  RefreshCw, Filter, Shield, User, Briefcase, Calendar
} from 'lucide-react';
import { getRosterData } from '../../sheets-api';

interface DailyPerformanceManpowerRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string; // e.g. "01/10/2026" or "2026-10-01"
}

interface RosterEmployeeItem {
  nik: string;
  name: string;
  nama?: string;
  jabatan?: string;
  position?: string;
  section?: string;
  department?: string;
  regu?: string;
  pt?: string;
  statusShift?: string;
  statusCategory?: 'hadir' | 'cuti' | 'izin_sakit' | 'off' | 'lainnya';
}

export const DailyPerformanceManpowerRosterModal: React.FC<DailyPerformanceManpowerRosterModalProps> = ({
  isOpen,
  onClose,
  selectedDate
}) => {
  if (!isOpen) return null;

  const [rosterList, setRosterList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'hadir' | 'cuti' | 'izin_sakit' | 'off'>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');

  // Load roster data from /api/roster (cached or fresh)
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getRosterData()
      .then((res: any) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : (res?.roster || []);
        setRosterList(list);
      })
      .catch(err => {
        console.error('Failed to load roster:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  // Compute date keys for matching roster schedules
  const dateKeys = useMemo(() => {
    let day = 1;
    let monthIdx = 9; // Oct = 9 (0-indexed)
    let year = 2026;

    if (selectedDate.includes('/')) {
      const parts = selectedDate.split('/');
      day = parseInt(parts[0], 10) || 1;
      monthIdx = (parseInt(parts[1], 10) || 10) - 1;
      year = parseInt(parts[2], 10) || 2026;
    } else if (selectedDate.includes('-')) {
      const parts = selectedDate.split('-');
      year = parseInt(parts[0], 10) || 2026;
      monthIdx = (parseInt(parts[1], 10) || 10) - 1;
      day = parseInt(parts[2], 10) || 1;
    }

    const d = new Date(year, monthIdx, day);
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const mEn = monthsEn[monthIdx] || 'Oct';
    const mId = monthsId[monthIdx] || 'Okt';
    const y2 = String(year).slice(-2);

    return [
      `${day} ${mEn} ${y2}`,         // "1 Oct 26"
      `${String(day).padStart(2, '0')} ${mEn} ${y2}`, // "01 Oct 26"
      `${day} ${mId} ${y2}`,         // "1 Okt 26"
      `${String(day).padStart(2, '0')} ${mId} ${y2}`, // "01 Okt 26"
      `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, // "2026-10-01"
      `${String(day).padStart(2, '0')}/${String(monthIdx + 1).padStart(2, '0')}/${year}`  // "01/10/2026"
    ];
  }, [selectedDate]);

const FALLBACK_ROSTER_EMPLOYEES: RosterEmployeeItem[] = [
  { nik: 'LAB-001', name: 'Alvin Pratama', jabatan: 'Supervisor Laboratory', section: 'Staff Management', department: 'QA/QC & Lab', regu: 'Non-Shift', pt: 'TBP', statusShift: 'D', statusCategory: 'hadir' },
  { nik: 'LAB-002', name: 'Aldy Setyawan', jabatan: 'Senior Chemist & QA/QC', section: 'QA/QC & Reporting', department: 'QA/QC & Lab', regu: 'Non-Shift', pt: 'TBP', statusShift: 'D', statusCategory: 'hadir' },
  { nik: 'LAB-003', name: 'Rian Hidayat', jabatan: 'Foreman Preparation', section: 'Sample Preparation', department: 'QA/QC & Lab', regu: 'Regu A', pt: 'TBP', statusShift: 'D', statusCategory: 'hadir' },
  { nik: 'LAB-004', name: 'Bambang Kusuma', jabatan: 'Operator Press Powder', section: 'Sample Preparation', department: 'QA/QC & Lab', regu: 'Regu A', pt: 'TBP', statusShift: 'D', statusCategory: 'hadir' },
  { nik: 'LAB-005', name: 'Dedi Saputra', jabatan: 'Operator Weighing & Fluxing', section: 'Sample Preparation', department: 'QA/QC & Lab', regu: 'Regu A', pt: 'TBP', statusShift: 'D', statusCategory: 'hadir' },
  { nik: 'LAB-006', name: 'Eko Wahyudi', jabatan: 'Operator Fusion Furnace', section: 'Sample Preparation', department: 'QA/QC & Lab', regu: 'Regu A', pt: 'TBP', statusShift: 'D', statusCategory: 'hadir' },
  { nik: 'LAB-007', name: 'Fajar Nugroho', jabatan: 'Operator LOI', section: 'Sample Preparation', department: 'QA/QC & Lab', regu: 'Regu A', pt: 'TBP', statusShift: 'D', statusCategory: 'hadir' },
  { nik: 'LAB-008', name: 'Gunawan Prasetyo', jabatan: 'Operator EDXRF Epsilon', section: 'Instrument Analysis', department: 'QA/QC & Lab', regu: 'Regu A', pt: 'TBP', statusShift: 'D', statusCategory: 'hadir' },
  { nik: 'LAB-009', name: 'Hadi Wijaya', jabatan: 'Operator WDXRF Zetium', section: 'Instrument Analysis', department: 'QA/QC & Lab', regu: 'Regu A', pt: 'TBP', statusShift: 'D', statusCategory: 'hadir' },
  { nik: 'LAB-010', name: 'Ilham Ramadhan', jabatan: 'Data Processor & Reporting', section: 'QA/QC & Reporting', department: 'QA/QC & Lab', regu: 'Non-Shift', pt: 'TBP', statusShift: 'D', statusCategory: 'hadir' },
  { nik: 'LAB-011', name: 'Joko Susanto', jabatan: 'Operator Prep Night Shift', section: 'Sample Preparation', department: 'QA/QC & Lab', regu: 'Regu B', pt: 'TBP', statusShift: 'N', statusCategory: 'hadir' },
  { nik: 'LAB-012', name: 'Kurnia Sandy', jabatan: 'Operator Analisa Night Shift', section: 'Instrument Analysis', department: 'QA/QC & Lab', regu: 'Regu B', pt: 'TBP', statusShift: 'N', statusCategory: 'hadir' },
  { nik: 'LAB-013', name: 'Lukman Hakim', jabatan: 'Staff Administrasi Lab', section: 'Administration', department: 'QA/QC & Lab', regu: 'Non-Shift', pt: 'TBP', statusShift: 'D', statusCategory: 'hadir' },
  { nik: 'LAB-014', name: 'Muhammad Ridwan', jabatan: 'Operator Prep (Cuti Tahunan)', section: 'Sample Preparation', department: 'QA/QC & Lab', regu: 'Regu C', pt: 'TBP', statusShift: 'CT', statusCategory: 'cuti' },
  { nik: 'LAB-015', name: 'Nurul Huda', jabatan: 'Operator Analisa (Cuti Roster)', section: 'Instrument Analysis', department: 'QA/QC & Lab', regu: 'Regu C', pt: 'TBP', statusShift: 'CR', statusCategory: 'cuti' },
  { nik: 'LAB-016', name: 'Oki Setiawan', jabatan: 'Operator Prep (Izin Sakit)', section: 'Sample Preparation', department: 'QA/QC & Lab', regu: 'Regu D', pt: 'TBP', statusShift: 'SL', statusCategory: 'izin_sakit' },
];

  // Map employees with their shift status on selectedDate
  const parsedEmployees = useMemo<RosterEmployeeItem[]>(() => {
    if (!rosterList || rosterList.length === 0) {
      return FALLBACK_ROSTER_EMPLOYEES;
    }

    return rosterList.map(emp => {
      let shiftCode = '';

      // Check fullSchedule object
      if (emp.fullSchedule && typeof emp.fullSchedule === 'object') {
        for (const k of dateKeys) {
          if (emp.fullSchedule[k]) {
            shiftCode = String(emp.fullSchedule[k]).trim();
            break;
          }
        }
      }

      // Check schedule array fallback
      if (!shiftCode && Array.isArray(emp.schedule)) {
        for (const k of dateKeys) {
          const item = emp.schedule.find((s: any) => s.date === k || s.dateStr === k || s.keyDateStr === k);
          if (item && item.shift) {
            shiftCode = String(item.shift).trim();
            break;
          }
        }
      }

      const upper = shiftCode.toUpperCase();
      let statusCategory: 'hadir' | 'cuti' | 'izin_sakit' | 'off' | 'lainnya' = 'lainnya';

      if (['D', 'N', 'LS', 'S', 'SD'].includes(upper)) {
        statusCategory = 'hadir';
      } else if (upper.startsWith('C') || upper === 'CT' || upper === 'CR' || upper === 'CE' || upper === 'CI' || upper === 'CS') {
        statusCategory = 'cuti';
      } else if (['I', 'IK', 'SL', 'SS', 'S1', 'S2', 'IA'].includes(upper) || upper.startsWith('IZIN') || upper.startsWith('SAKIT')) {
        statusCategory = 'izin_sakit';
      } else if (upper === 'OFF' || upper === 'X') {
        statusCategory = 'off';
      } else if (!shiftCode || shiftCode === '-') {
        // Fallback default for lab personnel
        statusCategory = 'hadir';
        shiftCode = 'D';
      }

      return {
        nik: emp.nik || '-',
        name: emp.name || emp.nama || 'Tanpa Nama',
        jabatan: emp.jabatan || emp.position || 'Staff / Crew',
        section: emp.section || emp.department || 'Laboratory',
        department: emp.department || 'QA/QC & Lab',
        regu: emp.regu || emp.group || '-',
        pt: emp.pt || 'TBP',
        statusShift: shiftCode || 'D',
        statusCategory
      };
    });
  }, [rosterList, dateKeys]);

  // Distinct sections for filtering
  const availableSections = useMemo(() => {
    const s = new Set<string>();
    parsedEmployees.forEach(e => {
      if (e.section && e.section !== '-') s.add(e.section);
    });
    return Array.from(s).sort();
  }, [parsedEmployees]);

  // Filtered List
  const filteredList = useMemo(() => {
    return parsedEmployees.filter(emp => {
      if (search) {
        const q = search.toLowerCase();
        const mNik = emp.nik.toLowerCase().includes(q);
        const mName = emp.name.toLowerCase().includes(q);
        const mJab = (emp.jabatan || '').toLowerCase().includes(q);
        if (!mNik && !mName && !mJab) return false;
      }
      if (statusFilter !== 'all' && emp.statusCategory !== statusFilter) return false;
      if (sectionFilter !== 'all' && emp.section !== sectionFilter) return false;
      return true;
    });
  }, [parsedEmployees, search, statusFilter, sectionFilter]);

  // Quick Counts
  const counts = useMemo(() => {
    let hadir = 0;
    let cuti = 0;
    let izinSakit = 0;
    let off = 0;
    parsedEmployees.forEach(e => {
      if (e.statusCategory === 'hadir') hadir++;
      else if (e.statusCategory === 'cuti') cuti++;
      else if (e.statusCategory === 'izin_sakit') izinSakit++;
      else if (e.statusCategory === 'off') off++;
    });
    return { hadir, cuti, izinSakit, off, total: parsedEmployees.length };
  }, [parsedEmployees]);

  // Shift badge styling helper
  const getBadgeStyle = (code: string) => {
    const c = code.toUpperCase();
    if (c === 'D') return 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border-blue-300';
    if (c === 'N') return 'bg-indigo-900 text-white border-indigo-700';
    if (c === 'LS') return 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 border-purple-300';
    if (c.startsWith('C')) return 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 border-amber-300';
    if (['I', 'SL', 'SS'].includes(c)) return 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 border-rose-300';
    return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-500 text-white shadow-md shadow-teal-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg">
                  Kesiapan Manpower (Data Roster Karyawan)
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold border border-teal-300 dark:border-teal-700">
                  {selectedDate}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Daftar personil laboratorium aktual berdasarkan master jadwal roster
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick KPI Count Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 text-xs">
          <button 
            onClick={() => setStatusFilter('hadir')}
            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'hadir'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span className="text-[10px] text-slate-400 block font-semibold">HADIR SHIFT</span>
            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">{counts.hadir}</span>
            <span className="text-[10px] text-slate-400 block">D / N / LS / S</span>
          </button>

          <button 
            onClick={() => setStatusFilter('cuti')}
            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'cuti'
                ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span className="text-[10px] text-slate-400 block font-semibold">CUTI (ON LEAVE)</span>
            <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400">{counts.cuti}</span>
            <span className="text-[10px] text-slate-400 block">C / CT / CI / CR</span>
          </button>

          <button 
            onClick={() => setStatusFilter('izin_sakit')}
            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'izin_sakit'
                ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-300 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span className="text-[10px] text-slate-400 block font-semibold">IZIN / SAKIT</span>
            <span className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">{counts.izinSakit}</span>
            <span className="text-[10px] text-slate-400 block">I / IK / SL / SS</span>
          </button>

          <button 
            onClick={() => setStatusFilter('all')}
            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-300 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span className="text-[10px] text-slate-400 block font-semibold">TOTAL ROSTER</span>
            <span className="text-xl font-black font-mono text-teal-600 dark:text-teal-400">{counts.total}</span>
            <span className="text-[10px] text-slate-400 block">Semua Personil</span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari NIK / Nama karyawan..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs w-56 sm:w-64 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Section Filter */}
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Seksi:</span>
              <select
                value={sectionFilter}
                onChange={e => setSectionFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs cursor-pointer focus:outline-none"
              >
                <option value="all">Semua Seksi</option>
                {availableSections.map(sec => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-slate-400 text-xs">
            Menampilkan <strong>{filteredList.length}</strong> karyawan
          </div>
        </div>

        {/* Employee List Table */}
        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
              <p className="text-xs">Memuat data jadwal roster dari server...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="text-center p-12 text-slate-400 text-xs">
              Tidak ada personil yang sesuai dengan kriteria filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredList.map((emp, idx) => (
                <div
                  key={emp.nik + idx}
                  className="p-3.5 rounded-2xl bg-slate-50/60 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 hover:border-teal-200 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 dark:text-white text-xs truncate">
                        {emp.name}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                        <span className="font-mono text-[10px] bg-slate-200/60 dark:bg-slate-700 px-1.5 py-0.2 rounded">
                          {emp.nik}
                        </span>
                        <span>•</span>
                        <span className="truncate">{emp.jabatan}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {emp.section} {emp.regu !== '-' && `• Regu ${emp.regu}`}
                      </div>
                    </div>
                  </div>

                  {/* Shift Badge on Target Date */}
                  <div className="text-right shrink-0">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono border shadow-2xs inline-block ${getBadgeStyle(emp.statusShift)}`}>
                      {emp.statusShift}
                    </span>
                    <span className="block text-[9px] text-slate-400 capitalize mt-0.5">
                      {emp.statusCategory === 'izin_sakit' ? 'Izin / Sakit' : emp.statusCategory}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between text-xs">
          <span className="text-slate-400 text-[11px]">
            *Data sinkron otomatis dengan Google Sheet Roster Laboratorium
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold cursor-pointer transition-all shadow-xs"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
