import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Plus, 
  Search, 
  Filter, 
  User, 
  Share2, 
  Copy, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp,
  Trash2, 
  Edit3, 
  CheckSquare, 
  Square, 
  RefreshCw, 
  SlidersHorizontal, 
  Check, 
  X, 
  TrendingUp, 
  Briefcase, 
  Building2, 
  Flame, 
  Send,
  Users,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Monitor,
  GripVertical,
  Bookmark,
  Save,
  Lock,
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui';
import { 
  parseTasklist, 
  toggleTasklistItem, 
  markdownToVisualHtml, 
  reorderTasklistItems, 
  updateTasklistItemNote,
  addSubtaskNote,
  removeSubtaskNote,
  SubtaskNote
} from './notion/tasklist-utils';
import { NotionDropdownCell, DropdownOption } from './notion/NotionDropdownCell';
import { EnterpriseWysiwygEditor } from './notion/EnterpriseWysiwygEditor';
import {
  getNextSubPeriod,
  getNextDefaultTargetDate,
  resetAllTasklistItems,
  normalizeCadence
} from './notion/period-utils';

interface LogbookTask {
  id: number;
  universe: string;
  pt: string;
  section: string;
  bulletinPostId: number | null;
  bulletinTopicTitle: string | null;
  title: string;
  description: string;
  assignedByNik: string;
  assignedByName: string;
  assigneeNik: string;
  assigneeName: string;
  status: string;
  priority: string;
  activityType: string;
  progressPercent: number;
  taskDate: string;
  targetDate: string;
  targetTime?: string | null;
  actualCompletedDate: string | null;
  yesterdayNotes: string | null;
  todayNotes: string | null;
  isPending?: boolean;
  pendingPicNik?: string | null;
  pendingPicName?: string | null;
  pendingReason?: string | null;
  draftChange?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  section: string;
  title: string;
  description: string;
  priority: string;
  activityType: string;
  targetTime?: string;
  isDefault?: boolean;
}

export const DEFAULT_TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'tmpl-aas-kalibrasi',
    name: 'Kalibrasi AAS & Standar',
    section: 'Laboratory',
    title: 'Kalibrasi Harian Spektrofotometer AAS & Standar Reagen',
    description: '- [ ] Pengecekan tekanan gas asetilen & nitrous oxide\n- [ ] Kalibrasi kurva standar konsentrasi Ni & Fe\n- [ ] Pengujian larutan blanko & CRM standard reference material\n- [ ] Pencatatan absorbansi & verifikasi logging instrumen',
    priority: 'High',
    activityType: 'Routine',
    targetTime: '12:00',
    isDefault: true
  },
  {
    id: 'tmpl-dryer-prep',
    name: 'Pembersihan & Flushing Dryer',
    section: 'Preparation',
    title: 'Pembersihan Chamber Dryer & Inspeksi Suhu Pengeringan',
    description: '- [ ] Pengecekan burner & exhaust fan oven dryer\n- [ ] Pembersihan sisa residu sampel di nampan pengering\n- [ ] Verifikasi kalibrasi termometer oven 105°C\n- [ ] Dokumentasi log suhu harian preparasi',
    priority: 'Normal',
    activityType: 'Routine',
    targetTime: '17:00',
    isDefault: true
  },
  {
    id: 'tmpl-p2h-prep',
    name: 'P2H & Housekeeping Shift Preparasi',
    section: 'Preparation',
    title: 'P2H Rutin Jaw Crusher, Pulverizer, & Housekeeping Shift',
    description: '- [ ] Pemeriksaan baut jaw crusher & rotary splitter\n- [ ] Pengecekan getaran & ring mill pulverizer\n- [ ] Pengosongan kantong dust collector\n- [ ] Pembersihan lantai kerja & pembuangan reject sampel',
    priority: 'Normal',
    activityType: 'Routine',
    targetTime: '18:00',
    isDefault: true
  },
  {
    id: 'tmpl-stock-opname',
    name: 'Stock Opname Reagen & APD Gudang',
    section: 'Inventory Control',
    title: 'Stock Opname Reagen Kimia, Cupel, & APD Gudang Lab',
    description: '- [ ] Penghitungan fisik asam nitrat (HNO3) & HCl\n- [ ] Pengecekan stok cupel & crucible keramik\n- [ ] Pengecekan persediaan masker respirator & sarung tangan nitril\n- [ ] Input rekap saldo di kartu kontrol inventory',
    priority: 'Normal',
    activityType: 'Routine',
    targetTime: '16:00',
    isDefault: true
  },
  {
    id: 'tmpl-qa-duplicate',
    name: 'Analisa Duplicate Sample & QA/QC',
    section: 'Quality Assurance',
    title: 'Pengujian Duplicate Sample & Verifikasi Batas Presisi QA/QC',
    description: '- [ ] Pengambilan 5% duplicate batch sampel harian\n- [ ] Analisa split pulverize vs split crush\n- [ ] Perhitungan RPD (Relative Percent Difference)\n- [ ] Input data control chart shewhart',
    priority: 'High',
    activityType: 'Daily',
    targetTime: '15:00',
    isDefault: true
  },
  {
    id: 'tmpl-handover-shift',
    name: 'Handover & Laporan Tutup Shift',
    section: 'Semua Seksi',
    title: 'Handover Antar Shift, Laporan Hasil Analisa, & Status Alat',
    description: '- [ ] Rekap jumlah sampel terselesaikan vs pending\n- [ ] Catatan kendala alat atau downtime\n- [ ] Serah terima sampel prioritas ke pengawas shift berikutnya\n- [ ] Tandatangan berita acara serah terima shift',
    priority: 'Urgent',
    activityType: 'Daily',
    targetTime: '19:00',
    isDefault: true
  }
];

interface LogbookScreenProps {
  inspectorNik: string;
  inspectorName: string;
  userPt?: string;
  onNav?: (tab: string) => void;
  onBack?: () => void;
}

const SECTION_OPTIONS = [
  'Semua Seksi',
  'Preparation',
  'Laboratory',
  'Maintenance',
  'Quality Assurance',
  'Sampling',
  'General'
];

const PRIORITY_OPTIONS = ['Normal', 'High', 'Urgent', 'Low'];

// Helper to format date string cleanly in Indonesian
function formatDisplayTargetDate(dateStr?: string | null): string {
  if (!dateStr || dateStr === '-') return 'Hari ini';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (dateStr === todayStr) return 'Hari Ini';
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
  return dateStr;
}

const formatDateDisplay = formatDisplayTargetDate;

// Helper to check if task deadline (date + time) has passed
function isTaskOverdue(targetDate?: string | null, targetTime?: string | null, status?: string): boolean {
  if (!targetDate || targetDate === '-') return false;
  if (status === 'Resolved' || status === 'Done' || status === 'Closed') return false;
  try {
    const time = targetTime && targetTime.trim() ? targetTime.trim() : '23:59';
    const [hhStr, mmStr] = time.split(':');
    const hh = parseInt(hhStr || '23', 10);
    const mm = parseInt(mmStr || '59', 10);
    const parts = targetDate.split('-');
    if (parts.length < 3) return false;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const deadline = new Date(y, m, d, hh, mm, 59);
    return new Date().getTime() > deadline.getTime();
  } catch (e) {
    return false;
  }
}
// Helper to split comma-separated PICs
function parsePicList(nikStr?: string | null, nameStr?: string | null): Array<{ nik: string; name: string }> {
  if (!nameStr && !nikStr) return [];
  const names = (nameStr || '').split(',').map(s => s.trim()).filter(Boolean);
  const niks = (nikStr || '').split(',').map(s => s.trim()).filter(Boolean);
  const len = Math.max(names.length, niks.length);
  const list: Array<{ nik: string; name: string }> = [];
  for (let i = 0; i < len; i++) {
    list.push({
      nik: niks[i] || '',
      name: names[i] || niks[i] || 'Personil'
    });
  }
  return list;
}

// ============================================================================
// 1. Searchable Multi-PIC Select Component (Bisa tambah lebih dari 1 PIC)
// ============================================================================
interface SearchableMultiPicSelectProps {
  selectedNiks?: string[];
  selectedNames?: string[];
  onChange: (niks: string[], names: string[]) => void;
  employees?: any[];
  defaultSection?: string;
  label?: string;
  required?: boolean;
}

function SearchableMultiPicSelect({
  selectedNiks = [],
  selectedNames = [],
  onChange,
  employees = [],
  defaultSection,
  label = 'Pilih PIC Bawahan (Bisa lebih dari 1) *',
  required = true
}: SearchableMultiPicSelectProps) {
  const safeNiks = useMemo(() => Array.isArray(selectedNiks) ? selectedNiks : [], [selectedNiks]);
  const safeNames = useMemo(() => Array.isArray(selectedNames) ? selectedNames : [], [selectedNames]);
  const safeEmployees = useMemo(() => Array.isArray(employees) ? employees : [], [employees]);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return safeEmployees.slice(0, 50);
    const q = searchTerm.toLowerCase();
    return safeEmployees.filter(emp => {
      const name = (emp.name || '').toLowerCase();
      const nik = (emp.nik || '').toLowerCase();
      const sec = (emp.section || emp.department || emp.jabatan || '').toLowerCase();
      return name.includes(q) || nik.includes(q) || sec.includes(q);
    }).slice(0, 50);
  }, [safeEmployees, searchTerm]);

  const addPic = (emp: any) => {
    if (!emp || !emp.nik) return;
    if (safeNiks.includes(emp.nik)) return;
    onChange([...safeNiks, emp.nik], [...safeNames, emp.name || emp.nik]);
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const removePic = (nik: string) => {
    const idx = safeNiks.indexOf(nik);
    if (idx !== -1) {
      const newNiks = [...safeNiks];
      const newNames = [...safeNames];
      newNiks.splice(idx, 1);
      newNames.splice(idx, 1);
      onChange(newNiks, newNames);
    }
  };

  return (
    <div ref={wrapperRef} className="relative space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold block">{label}</label>
        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">
          {safeNiks.length} PIC Dipilih
        </span>
      </div>

      {/* Selected PIC Badges Box + Input Field */}
      <div 
        onClick={() => { setIsOpen(true); inputRef.current?.focus(); }}
        className="min-h-10 w-full p-1.5 rounded-xl border flex flex-wrap items-center gap-1.5 cursor-text transition-all focus-within:border-teal-500"
        style={{
          backgroundColor: 'var(--input-bg, #f8fafc)',
          borderColor: safeNiks.length === 0 && required ? 'var(--border-main, #cbd5e1)' : 'var(--border-main, #cbd5e1)'
        }}
      >
        {safeNiks.map((nik, idx) => (
          <span 
            key={nik}
            className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-200 text-xs font-bold animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center text-[9px] font-black">
              {((safeNames[idx] || nik || 'P')).charAt(0).toUpperCase()}
            </div>
            <span className="truncate max-w-[130px]">{safeNames[idx] || nik}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removePic(nik);
              }}
              className="p-0.5 rounded hover:bg-teal-500/30 text-teal-700 dark:text-teal-300 transition-colors"
              title="Hapus PIC"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <div className="flex-1 min-w-[140px] flex items-center gap-1.5 px-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={safeNiks.length === 0 ? "Ketik nama / NIK untuk menambah PIC..." : "Tambah PIC lain..."}
            className="w-full bg-transparent outline-none text-xs font-medium placeholder:text-slate-400 py-1"
          />
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div 
          className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border shadow-2xl z-50 max-h-56 overflow-y-auto divide-y animate-in fade-in zoom-in-95 duration-150"
          style={{
            backgroundColor: 'var(--card-bg, #ffffff)',
            borderColor: 'var(--border-main, #cbd5e1)'
          }}
        >
          {filteredEmployees.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 italic">
              Tidak ditemukan karyawan dengan kata kunci "{searchTerm}"
            </div>
          ) : (
            filteredEmployees.map(emp => {
              const isSelected = safeNiks.includes(emp.nik);
              return (
                <div
                  key={emp.nik}
                  onClick={() => {
                    if (isSelected) {
                      removePic(emp.nik);
                    } else {
                      addPic(emp);
                    }
                  }}
                  className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors hover:bg-teal-500/10 ${
                    isSelected ? 'bg-teal-500/15' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate flex items-center gap-1.5">
                      <span>{emp.name}</span>
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-teal-600 text-white">
                          Dipilih
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono">NIK: {emp.nik}</span>
                      <span>•</span>
                      <span className="truncate">{emp.section || emp.department || emp.jabatan || 'Personil'}</span>
                    </div>
                  </div>
                  {isSelected ? (
                    <Check className="w-4 h-4 text-teal-600 shrink-0" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. Searchable Single-PIC Select Component (Khusus PIC Job Pending)
// ============================================================================
interface SearchableSinglePicSelectProps {
  valueNik?: string;
  valueName?: string;
  onChange: (nik: string, name: string) => void;
  employees?: any[];
  label?: string;
  placeholder?: string;
}

function SearchableSinglePicSelect({ 
  valueNik = '', 
  valueName = '', 
  onChange, 
  employees = [],
  label = 'Pilih PIC Job Pending *',
  placeholder = 'Ketik nama / NIK penanggung jawab pending...'
}: SearchableSinglePicSelectProps) {
  const safeEmployees = useMemo(() => Array.isArray(employees) ? employees : [], [employees]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return safeEmployees.slice(0, 50);
    const q = searchTerm.toLowerCase();
    return safeEmployees.filter(emp => {
      const name = (emp.name || '').toLowerCase();
      const nik = (emp.nik || '').toLowerCase();
      const sec = (emp.section || emp.department || emp.jabatan || '').toLowerCase();
      return name.includes(q) || nik.includes(q) || sec.includes(q);
    }).slice(0, 50);
  }, [safeEmployees, searchTerm]);

  return (
    <div ref={wrapperRef} className="relative space-y-1">
      <label className="text-xs font-bold block flex items-center justify-between">
        <span>{label}</span>
        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">Penerima Handover</span>
      </label>

      {valueNik && !isOpen ? (
        <div 
          onClick={() => { setIsOpen(true); setSearchTerm(''); }}
          className="w-full flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer hover:border-amber-500/80 group"
          style={{
            backgroundColor: 'var(--input-bg, #f8fafc)',
            borderColor: 'var(--border-main, #cbd5e1)'
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-xs shrink-0">
              {(valueName || 'P').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs truncate text-slate-900 dark:text-slate-100 group-hover:text-amber-600 transition-colors">
                {valueName}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                NIK: {valueNik}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('', '');
              setSearchTerm('');
              setIsOpen(true);
            }}
            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
            title="Ganti PIC"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              autoFocus={isOpen}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="w-full pl-8 pr-8 py-2 rounded-xl border outline-none text-xs font-medium focus:border-amber-500 transition-all"
              style={{
                backgroundColor: 'var(--input-bg, #f8fafc)',
                borderColor: 'var(--border-main, #cbd5e1)'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 p-0.5 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isOpen && (
            <div 
              className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border shadow-xl z-50 max-h-56 overflow-y-auto divide-y animate-in fade-in zoom-in-95 duration-150"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #cbd5e1)'
              }}
            >
              {filteredEmployees.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 italic">
                  Tidak ditemukan karyawan dengan kata kunci "{searchTerm}"
                </div>
              ) : (
                filteredEmployees.map(emp => {
                  const isSelected = emp.nik === valueNik;
                  return (
                    <div
                      key={emp.nik}
                      onClick={() => {
                        onChange(emp.nik, emp.name);
                        setIsOpen(false);
                        setSearchTerm('');
                      }}
                      className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors hover:bg-amber-500/10 ${
                        isSelected ? 'bg-amber-500/15' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                          {emp.name}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">NIK: {emp.nik}</span>
                          <span>•</span>
                          <span className="truncate">{emp.section || emp.department || emp.jabatan || 'Personil'}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. Searchable Combobox for Bulletin Post Linking
// ============================================================================
interface SearchableBulletinSelectProps {
  selectedId?: string;
  bulletinList?: any[];
  onSelect: (postId: string) => void;
}

function SearchableBulletinSelect({ selectedId = '', bulletinList = [], onSelect }: SearchableBulletinSelectProps) {
  const safeBulletins = useMemo(() => Array.isArray(bulletinList) ? bulletinList : [], [bulletinList]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedPost = useMemo(() => {
    if (!selectedId) return null;
    return safeBulletins.find(b => String(b.id) === String(selectedId));
  }, [selectedId, safeBulletins]);

  const filteredBulletins = useMemo(() => {
    if (!searchTerm.trim()) return safeBulletins.slice(0, 40);
    const q = searchTerm.toLowerCase();
    return safeBulletins.filter(b => {
      const title = (b.title || '').toLowerCase();
      const category = (b.category || '').toLowerCase();
      const dept = (b.department || '').toLowerCase();
      const idStr = String(b.id || '');
      return title.includes(q) || category.includes(q) || dept.includes(q) || idStr.includes(q);
    }).slice(0, 40);
  }, [safeBulletins, searchTerm]);

  return (
    <div ref={wrapperRef} className="relative space-y-1">
      <label className="text-xs font-bold block flex items-center justify-between">
        <span>Hubungkan ke Tabel Buletin (Opsional)</span>
        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">Sinkronisasi 2 arah</span>
      </label>

      {selectedPost && !isOpen ? (
        <div 
          onClick={() => { setIsOpen(true); setSearchTerm(''); }}
          className="w-full flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer hover:border-teal-500/80 group"
          style={{
            backgroundColor: 'var(--input-bg, #f8fafc)',
            borderColor: 'var(--border-main, #cbd5e1)'
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 shrink-0">
              #{selectedPost.id}
            </span>
            <div className="min-w-0">
              <div className="font-bold text-xs truncate text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition-colors">
                {selectedPost.title || selectedPost.category}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                {selectedPost.department || 'General'} • Universe {selectedPost.pt || 'TBP'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect('');
            }}
            className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors"
            title="Lepas tautan buletin"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              autoFocus={isOpen}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Ketik judul buletin untuk mencari & menautkan..."
              className="w-full pl-8 pr-8 py-2 rounded-xl border outline-none text-xs font-medium focus:border-teal-500 transition-all"
              style={{
                backgroundColor: 'var(--input-bg, #f8fafc)',
                borderColor: 'var(--border-main, #cbd5e1)'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 p-0.5 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isOpen && (
            <div 
              className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border shadow-xl z-50 max-h-56 overflow-y-auto divide-y animate-in fade-in zoom-in-95 duration-150"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #cbd5e1)'
              }}
            >
              <div
                onClick={() => {
                  onSelect('');
                  setIsOpen(false);
                }}
                className="p-2.5 flex items-center justify-between text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <span>-- Simpan di Log Book Saja (Tanpa Buletin) --</span>
                {!selectedId && <Check className="w-4 h-4 text-teal-600 shrink-0" />}
              </div>

              {filteredBulletins.map(b => {
                const isSelected = String(b.id) === String(selectedId);
                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      onSelect(String(b.id));
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors hover:bg-teal-500/10 ${
                      isSelected ? 'bg-teal-500/15' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-500/10 text-slate-600 dark:text-slate-300">
                          #{b.id}
                        </span>
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">
                          {b.title || b.category}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {b.department || 'General'} • Universe {b.pt || 'TBP'}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-teal-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <p className="text-[10px]" style={{ color: 'var(--text-muted, #64748b)' }}>
        Jika ditautkan, update progress subtask & status akan otomatis tersinkronisasi ke tabel dokumen buletin tersebut.
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT: LogbookScreen
// ============================================================================
export function LogbookScreen({
  inspectorNik,
  inspectorName,
  userPt = 'TBP',
  onNav,
  onBack
}: LogbookScreenProps) {
  // Current active date (YYYY-MM-DD)
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // User profile & section
  const userProfile = useMemo(() => {
    try {
      const p = localStorage.getItem('p2h_inspector_profile');
      return p ? JSON.parse(p) : null;
    } catch (e) {
      return null;
    }
  }, [inspectorNik]);

  const isSuperAdmin = 
    inspectorNik === '02D25000055' || 
    inspectorNik === '02D24000043' || 
    inspectorNik === '04D21001047' || 
    inspectorNik === '04D24000042' ||
    inspectorNik === 'M0403240177' ||
    inspectorNik === 'preplabadmin';

  const isMeetingRoom = useMemo(() => {
    const nik = (inspectorNik || '').toUpperCase().trim();
    const name = (inspectorName || '').toUpperCase().trim();
    return nik === 'MEETINGROOM' || nik === 'MEETING' || name.includes('MEETING ROOM') || name.includes('MEETING');
  }, [inspectorNik, inspectorName]);

  const isSupervisor = useMemo(() => {
    if (isMeetingRoom) return true;
    if (isSuperAdmin) return true;
    if (!userProfile) return false;
    const j = (userProfile.jabatan || '').toLowerCase();
    const r = (userProfile.role || '').toLowerCase();
    const s = (userProfile.section || '').toLowerCase();
    return (
      j.includes('supervisor') ||
      j.includes('spv') ||
      j.includes('superintendent') ||
      j.includes('manager') ||
      j.includes('lead') ||
      j.includes('kepala') ||
      r.includes('supervisor') ||
      r.includes('spv') ||
      r.includes('admin') ||
      s.includes('supervisor')
    );
  }, [isMeetingRoom, isSuperAdmin, userProfile]);

  const userSection = useMemo(() => {
    const raw = (userProfile?.section || '').trim();
    if (!raw) return 'Preparation';
    if (raw.toLowerCase().includes('preparation') || raw.toLowerCase().includes('prep')) return 'Preparation';
    if (raw.toLowerCase().includes('laboratory') || raw.toLowerCase().includes('lab')) return 'Laboratory';
    if (raw.toLowerCase().includes('maintenance')) return 'Maintenance';
    if (raw.toLowerCase().includes('qa') || raw.toLowerCase().includes('quality')) return 'Quality Assurance';
    return raw;
  }, [userProfile]);

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [selectedSection, setSelectedSection] = useState<string>(userSection);
  const [selectedPt, setSelectedPt] = useState<string>(userPt === 'GTS' ? 'GTS' : 'TBP');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [picFilter, setPicFilter] = useState<string>('ALL');
  // Header Module Mode Switcher: 'ALL' | 'ROUTINE' | 'NON_ROUTINE'
  const [moduleMode, setModuleMode] = useState<'ALL' | 'ROUTINE' | 'NON_ROUTINE'>('ALL');
  const [activityFilter, setActivityFilter] = useState<string>('ALL');

  // Helper to determine if a task is routine
  const isTaskRoutine = (task: LogbookTask) => {
    const act = (task.activityType || 'Routine').toLowerCase().trim();
    return !act.includes('non');
  };

  // Helper to resolve cadence info & D-day appearance for a task
  const getTaskRoutineInfo = (task: LogbookTask, referenceDateStr?: string) => {
    const act = (task.activityType || '').toLowerCase().trim();
    const isNon = act.includes('non');
    if (isNon) {
      return {
        isRoutine: false,
        cadence: 'Non Routine',
        label: '⚡ Non Routine',
        color: 'bg-slate-100 text-slate-700 border-slate-300',
        windowDesc: 'Harian (Ad-hoc)',
        dDayText: null
      };
    }

    let cadence = task.activityType || 'Daily';
    if (cadence.toLowerCase() === 'routine' || !cadence) {
      const bTitle = (task.bulletinTopicTitle || '').toLowerCase();
      const tTitle = (task.title || '').toLowerCase();
      const combined = `${bTitle} ${tTitle}`;
      if (combined.includes('weekly') || combined.includes('mingguan')) cadence = 'Weekly';
      else if (combined.includes('quarterly') || combined.includes('triwulan')) cadence = 'Quarterly';
      else if (combined.includes('biannual') || combined.includes('semester')) cadence = 'Biannual';
      else if (combined.includes('yearly') || combined.includes('annual') || combined.includes('tahunan')) cadence = 'Yearly';
      else if (combined.includes('monthly') || combined.includes('bulanan')) cadence = 'Monthly';
      else cadence = 'Daily';
    }

    const cLower = cadence.toLowerCase();
    let label = '🔁 Routine';
    let color = 'bg-teal-50 text-teal-800 border-teal-300';
    let windowDesc = 'Harian';

    if (cLower.includes('daily')) {
      label = '🔁 Daily';
      color = 'bg-teal-50 text-teal-800 border-teal-300';
      windowDesc = 'Muncul Tiap Hari';
    } else if (cLower.includes('weekly')) {
      label = '📅 Weekly';
      color = 'bg-blue-50 text-blue-800 border-blue-300';
      windowDesc = 'Muncul Mulai D-3';
    } else if (cLower.includes('monthly')) {
      label = '🗓️ Monthly';
      color = 'bg-indigo-50 text-indigo-800 border-indigo-300';
      windowDesc = 'Muncul Mulai D-7';
    } else if (cLower.includes('quarterly')) {
      label = '📊 Quarterly';
      color = 'bg-purple-50 text-purple-800 border-purple-300';
      windowDesc = 'Muncul Mulai M-1';
    } else if (cLower.includes('biannual')) {
      label = '⏳ Biannual';
      color = 'bg-amber-50 text-amber-900 border-amber-300';
      windowDesc = 'Muncul Mulai M-2';
    } else if (cLower.includes('yearly')) {
      label = '🎯 Yearly';
      color = 'bg-rose-50 text-rose-800 border-rose-300';
      windowDesc = 'Muncul Mulai M-3';
    }

    // Calculate D-Day if targetDate exists
    let dDayText: string | null = null;
    const deadlineStr = task.targetDate || task.taskDate;
    if (deadlineStr && referenceDateStr) {
      const diff = Math.ceil((new Date(deadlineStr).getTime() - new Date(referenceDateStr).getTime()) / (1000 * 60 * 60 * 24));
      if (diff === 0) dDayText = 'Target: Hari Ini!';
      else if (diff > 0) dDayText = `H-${diff}`;
      else dDayText = `Lewat ${Math.abs(diff)} hr`;
    }

    return {
      isRoutine: true,
      cadence,
      label,
      color,
      windowDesc,
      dDayText
    };
  };

  const matchesModuleMode = (task: LogbookTask, mode: 'ALL' | 'ROUTINE' | 'NON_ROUTINE') => {
    if (mode === 'ALL') return true;
    const isRoutine = isTaskRoutine(task);
    if (mode === 'ROUTINE') return isRoutine;
    if (mode === 'NON_ROUTINE') return !isRoutine;
    return true;
  };

  const matchesActivityFilter = (task: LogbookTask, filter: string) => {
    if (filter === 'ALL') return true;
    const act = (task.activityType || 'Routine').toLowerCase().trim();
    const isNonRoutine = act.includes('non');
    if (filter === 'Non Routine') return isNonRoutine;
    if (isNonRoutine) return false;

    const info = getTaskRoutineInfo(task);
    const c = info.cadence.toLowerCase();
    const f = filter.toLowerCase();

    if (f === 'routine') return true;
    if (f === 'daily') return c.includes('daily');
    if (f === 'weekly') return c.includes('week');
    if (f === 'monthly') return c.includes('month') && !c.includes('biannual');
    if (f === 'quarterly') return c.includes('quarter') || c.includes('triwulan');
    if (f === 'biannual') return c.includes('biannual') || c.includes('semester');
    if (f === 'yearly') return c.includes('year') || c.includes('annual');
    return true;
  };

  // Keep selectedSection in sync if userSection resolves after boot
  useEffect(() => {
    if (userSection) setSelectedSection(userSection);
  }, [userSection]);

  // Loading & Data states
  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState<LogbookTask[]>([]);
  const [yesterdayTasks, setYesterdayTasks] = useState<LogbookTask[]>([]);
  const [carryOverTasks, setCarryOverTasks] = useState<LogbookTask[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Expanded card state (accordion per-task in Carry Over & Today)
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());

  const toggleExpand = (taskId: number) => {
    setExpandedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  // Delete confirmation modal state
  const [taskToDelete, setTaskToDelete] = useState<LogbookTask | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Job Pending handover modal state
  const [pendingModalTask, setPendingModalTask] = useState<LogbookTask | null>(null);
  const [modalPendingPicNik, setModalPendingPicNik] = useState('');
  const [modalPendingPicName, setModalPendingPicName] = useState('');
  const [modalPendingReason, setModalPendingReason] = useState('');
  const [isSavingPending, setIsSavingPending] = useState(false);

  // Employees master list for PIC dropdown
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  // Bulletin posts list for link sync
  const [bulletinList, setBulletinList] = useState<any[]>([]);

  // Quick Assign Task State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newAssigneeNiks, setNewAssigneeNiks] = useState<string[]>([]);
  const [newAssigneeNames, setNewAssigneeNames] = useState<string[]>([]);
  const [newPriority, setNewPriority] = useState('Normal');
  const [newActivityType, setNewActivityType] = useState('Routine');
  const [newTaskDate, setNewTaskDate] = useState(getTodayStr());
  const [newTargetDate, setNewTargetDate] = useState(getTodayStr());
  const [newTargetTime, setNewTargetTime] = useState('');
  const [selectedBulletinPostId, setSelectedBulletinPostId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // In Assign Modal: Job Pending Options
  const [isAssignPending, setIsAssignPending] = useState(false);
  const [newPendingPicNik, setNewPendingPicNik] = useState('');
  const [newPendingPicName, setNewPendingPicName] = useState('');
  const [newPendingReason, setNewPendingReason] = useState('');

  const openAssignModal = () => {
    setNewTitle('');
    setNewTaskDescription('');
    setNewAssigneeNiks([]);
    setNewAssigneeNames([]);
    setNewPriority('Normal');
    setNewActivityType('Routine');
    setNewTaskDate(selectedDate || getTodayStr());
    setNewTargetDate(selectedDate || getTodayStr());
    setNewTargetTime('');
    setSelectedBulletinPostId('');
    setIsAssignPending(false);
    setNewPendingPicNik('');
    setNewPendingPicName('');
    setNewPendingReason('');
    setShowAssignModal(true);
  };

  // Task Templates State
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('logbook_task_templates');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return DEFAULT_TASK_TEMPLATES;
  });
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateFilterSection, setTemplateFilterSection] = useState('Semua Seksi');
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Handle Copy to New Task
  const handleCopyToNewTask = (task: LogbookTask) => {
    setNewTitle(task.title || '');
    setNewTaskDescription(task.description || '');
    setNewPriority(task.priority || 'Normal');
    setNewActivityType(task.activityType || 'Routine');
    setNewTaskDate(task.taskDate || selectedDate || getTodayStr());
    setNewTargetDate(task.targetDate || selectedDate || getTodayStr());
    setNewTargetTime(task.targetTime || '23:59');
    setSelectedBulletinPostId(task.bulletinPostId ? String(task.bulletinPostId) : '');
    if (task.assigneeNik) {
      const niks = task.assigneeNik.split(',').map(s => s.trim()).filter(Boolean);
      const names = (task.assigneeName || '').split(',').map(s => s.trim()).filter(Boolean);
      setNewAssigneeNiks(niks);
      setNewAssigneeNames(names);
    } else {
      setNewAssigneeNiks([]);
      setNewAssigneeNames([]);
    }
    setIsAssignPending(false);
    setNewPendingPicNik('');
    setNewPendingPicName('');
    setNewPendingReason('');
    setShowAssignModal(true);
    toast.success('Data kegiatan berhasil disalin ke form penugasan baru', { id: 'copy-task' });
  };

  // Apply template into assign form
  const applyTemplate = (template: TaskTemplate) => {
    setNewTitle(template.title);
    setNewTaskDescription(template.description);
    setNewPriority(template.priority || 'Normal');
    setNewActivityType(template.activityType || 'Routine');
    if (template.targetTime) setNewTargetTime(template.targetTime);
    toast.success(`Template "${template.name}" berhasil diterapkan`, { id: 'template-applied' });
  };

  // Save new custom template
  const handleSaveAsTemplate = (name: string) => {
    if (!name.trim()) {
      toast.error('Masukkan nama template tugas');
      return;
    }
    const newTmpl: TaskTemplate = {
      id: `tmpl-custom-${Date.now()}`,
      name: name.trim(),
      section: selectedSection !== 'Semua Seksi' ? selectedSection : 'Semua Seksi',
      title: newTitle.trim() || name.trim(),
      description: newTaskDescription.trim(),
      priority: newPriority,
      activityType: newActivityType,
      targetTime: newTargetTime || '23:59',
      isDefault: false
    };
    const updated = [newTmpl, ...taskTemplates];
    setTaskTemplates(updated);
    try {
      localStorage.setItem('logbook_task_templates', JSON.stringify(updated));
    } catch (e) {}
    setShowSaveTemplateDialog(false);
    setNewTemplateName('');
    toast.success(`Template "${newTmpl.name}" berhasil disimpan!`);
  };

  // Delete custom template
  const handleDeleteTemplate = (templateId: string) => {
    const updated = taskTemplates.filter(t => t.id !== templateId);
    setTaskTemplates(updated);
    try {
      localStorage.setItem('logbook_task_templates', JSON.stringify(updated));
    } catch (e) {}
    toast.success('Template berhasil dihapus');
  };

  // State: Edit Task & Draft Proposal (Role-Based)
  const [editingTask, setEditingTask] = useState<LogbookTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('Normal');
  const [editActivityType, setEditActivityType] = useState('Daily');
  const [editTaskDate, setEditTaskDate] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editTargetTime, setEditTargetTime] = useState('');
  const [editAssigneeNik, setEditAssigneeNik] = useState('');
  const [editAssigneeName, setEditAssigneeName] = useState('');
  const [editChangeReason, setEditChangeReason] = useState('');
  const [editBulletinPostId, setEditBulletinPostId] = useState<string>('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // State: Review Draft Modal (for Task Creator)
  const [reviewingTask, setReviewingTask] = useState<LogbookTask | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // State: Card Checklist Drag-and-Drop
  const [cardDragIdx, setCardDragIdx] = useState<{ taskId: number; itemIdx: number } | null>(null);
  const [cardDragOverIdx, setCardDragOverIdx] = useState<{ taskId: number; itemIdx: number } | null>(null);

  const openEditModal = (task: LogbookTask) => {
    setEditingTask(task);
    setEditTitle(task.title || '');
    setEditDescription(task.description || '');
    setEditPriority(task.priority || 'Normal');
    setEditActivityType(task.activityType || 'Daily');
    setEditTaskDate(task.taskDate || selectedDate || getTodayStr());
    setEditTargetDate(task.targetDate || selectedDate || getTodayStr());
    setEditTargetTime(task.targetTime || '23:59');
    setEditAssigneeNik(task.assigneeNik || '');
    setEditAssigneeName(task.assigneeName || '');
    setEditBulletinPostId(task.bulletinPostId ? String(task.bulletinPostId) : '');
    setEditChangeReason('');
  };

  // State: Subtask Note Modal (Icon !)
  const [subtaskNoteModal, setSubtaskNoteModal] = useState<{
    task: LogbookTask;
    itemIndex: number;
    itemText: string;
    notes: SubtaskNote[];
    isReadOnly: boolean;
  } | null>(null);
  const [newSubtaskNoteInput, setNewSubtaskNoteInput] = useState('');
  const [isSavingSubtaskNote, setIsSavingSubtaskNote] = useState(false);

  // Subtask Note Bubble Chat State (for popover to the right in yesterday / read-only module)
  const [activeNoteBubbleKey, setActiveNoteBubbleKey] = useState<string | null>(null);

  useEffect(() => {
    if (!activeNoteBubbleKey) return;
    const handleOutsideClick = () => {
      setActiveNoteBubbleKey(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [activeNoteBubbleKey]);

  // Routine Task Completion & Next Period Rollover Modal State
  const [routineCompletionModal, setRoutineCompletionModal] = useState<{
    task: LogbookTask;
    currentPeriod: string;
    nextPeriod: string;
    nextTargetDate: string;
    resetDescription: string;
  } | null>(null);

  const handleConfirmLogbookNextPeriod = async () => {
    if (!routineCompletionModal) return;
    const { task, nextPeriod, nextTargetDate, resetDescription } = routineCompletionModal;
    
    try {
      let newBulletinTopicTitle = task.bulletinTopicTitle;
      if (task.bulletinTopicTitle) {
        const base = task.bulletinTopicTitle.includes(' - ') 
          ? task.bulletinTopicTitle.split(' - ')[0].trim() 
          : task.bulletinTopicTitle.trim();
        newBulletinTopicTitle = `${base} - ${nextPeriod}`;
      }

      const res = await fetch('/api/logbook/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: resetDescription,
          section: task.section,
          assigneeNik: task.assigneeNik,
          assigneeName: task.assigneeName,
          assignedByNik: task.assignedByNik || inspectorNik || 'SUPERVISOR',
          assignedByName: task.assignedByName || inspectorName || 'Atasan / Manajemen',
          priority: task.priority || 'Normal',
          activityType: task.activityType || 'Daily',
          taskDate: selectedDate || getTodayStr(),
          targetDate: nextTargetDate,
          targetTime: task.targetTime || '23:59',
          status: 'Open',
          progressPercent: 0,
          pt: task.pt || selectedPt,
          bulletinPostId: task.bulletinPostId,
          bulletinTopicTitle: newBulletinTopicTitle
        })
      });

      const json = await res.json();
      if (json.status === 'success') {
        toast.success(`🎉 Task routine untuk periode selanjutnya (${nextPeriod}) berhasil dibuat! Target selesai: ${nextTargetDate}`);
        fetchTasks();
      } else {
        toast.error(json.message || 'Gagal membuat task periode selanjutnya');
      }
    } catch (err: any) {
      toast.error('Gagal membuat task periode selanjutnya: ' + (err.message || err));
    } finally {
      setRoutineCompletionModal(null);
    }
  };

  const openSubtaskNoteModal = (task: LogbookTask, itemIndex: number, itemText: string, notes: SubtaskNote[], isReadOnly: boolean) => {
    setSubtaskNoteModal({ task, itemIndex, itemText, notes, isReadOnly });
    setNewSubtaskNoteInput('');
  };

  const handleAddSubtaskNote = async () => {
    if (!subtaskNoteModal) return;
    const { task, itemIndex } = subtaskNoteModal;
    const noteText = newSubtaskNoteInput.trim();
    if (!noteText) {
      toast.error('Catatan tidak boleh kosong');
      return;
    }
    const now = new Date();
    const actionDate = selectedDate || getTodayStr();
    const actionTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const updatedDesc = addSubtaskNote(task.description || '', itemIndex, noteText, actionDate, actionTime, inspectorName);

    let updatedStatus = task.status;
    if (task.status === 'Open') {
      updatedStatus = 'On Progress';
    }

    // Optimistic update
    setTodayTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: updatedDesc, status: updatedStatus } : t));
    setYesterdayTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: updatedDesc, status: updatedStatus } : t));
    setCarryOverTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: updatedDesc, status: updatedStatus } : t));

    const parsed = parseTasklist(updatedDesc);
    const updatedItem = parsed.items.find(it => it.index === itemIndex);
    setSubtaskNoteModal(prev => prev ? { ...prev, notes: updatedItem?.notes || [] } : null);
    setNewSubtaskNoteInput('');

    try {
      setIsSavingSubtaskNote(true);
      await fetch(`/api/logbook/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: updatedDesc,
          status: updatedStatus,
          updaterNik: inspectorNik
        })
      });
      toast.success('Catatan berhasil ditambahkan!');
    } catch (e) {
      console.error('Failed to add note:', e);
      toast.error('Gagal menambahkan catatan');
    } finally {
      setIsSavingSubtaskNote(false);
    }
  };

  const handleDeleteSubtaskNote = async (noteId: string) => {
    if (!subtaskNoteModal) return;
    const { task, itemIndex } = subtaskNoteModal;
    
    const updatedDesc = removeSubtaskNote(task.description || '', itemIndex, noteId);

    // Optimistic update
    setTodayTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: updatedDesc, status: updatedStatusOrDefault(t.status) } : t));
    setYesterdayTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: updatedDesc, status: updatedStatusOrDefault(t.status) } : t));
    setCarryOverTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: updatedDesc, status: updatedStatusOrDefault(t.status) } : t));

    const parsed = parseTasklist(updatedDesc);
    const updatedItem = parsed.items.find(it => it.index === itemIndex);
    setSubtaskNoteModal(prev => prev ? { ...prev, notes: updatedItem?.notes || [] } : null);

    try {
      await fetch(`/api/logbook/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: updatedDesc,
          updaterNik: inspectorNik
        })
      });
      toast.success('Catatan berhasil dihapus');
    } catch (e) {
      console.error('Failed to delete note:', e);
      toast.error('Gagal menghapus catatan');
    }
  };

  function updatedStatusOrDefault(s: string) {
    return s;
  }

  const openReviewModal = (task: LogbookTask) => {
    setReviewingTask(task);
    setRejectReason('');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;

    const isCreator = editingTask.assignedByNik === inspectorNik || isSupervisor;
    const isAssignee = String(editingTask.assigneeNik || '').split(',').map(s => s.trim()).includes(inspectorNik) || editingTask.pendingPicNik === inspectorNik;

    if (!isCreator && !isAssignee) {
      toast.error('Anda tidak memiliki izin untuk mengedit tugas ini.');
      return;
    }

    if (!editTitle.trim()) {
      toast.error('Judul tugas tidak boleh kosong.');
      return;
    }

    if (!isCreator && !editChangeReason.trim()) {
      toast.error('Mohon isi alasan / keterangan penyesuaian untuk direview pemberi tugas.');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      if (isCreator) {
        // Direct Edit by Task Creator
        const res = await fetch(`/api/logbook/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isDirectEdit: true,
            clearDraft: true,
            updaterNik: inspectorNik,
            title: editTitle.trim(),
            description: editDescription.trim(),
            priority: editPriority,
            activityType: editActivityType,
            taskDate: editTaskDate || editingTask.taskDate,
            targetDate: editTargetDate,
            targetTime: editTargetTime || '23:59',
            assigneeNik: editAssigneeNik,
            assigneeName: editAssigneeName,
            bulletinPostId: editBulletinPostId ? parseInt(editBulletinPostId, 10) : null,
            bulletinTopicTitle: editBulletinPostId ? editTitle.trim() : null
          })
        });
        const json = await res.json();
        if (json.status === 'success') {
          toast.success('Tugas berhasil diperbarui dan disinkronkan ke Buletin');
          setEditingTask(null);
          fetchTasks();
        } else {
          toast.error(json.message || 'Gagal memperbarui tugas');
        }
      } else {
        // Draft Proposal by PIC
        const draftPayload = {
          proposedByNik: inspectorNik,
          proposedByName: inspectorName,
          proposedAt: new Date().toISOString(),
          title: editTitle.trim(),
          description: editDescription.trim(),
          priority: editPriority,
          activityType: editActivityType,
          taskDate: editTaskDate || editingTask.taskDate,
          targetDate: editTargetDate,
          targetTime: editTargetTime || '23:59',
          assigneeNik: editAssigneeNik,
          assigneeName: editAssigneeName,
          bulletinPostId: editBulletinPostId ? parseInt(editBulletinPostId, 10) : null,
          bulletinTopicTitle: editBulletinPostId ? editTitle.trim() : null,
          changeReason: editChangeReason.trim()
        };

        const res = await fetch(`/api/logbook/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isDraftProposal: true,
            proposerName: inspectorName,
            draftChange: JSON.stringify(draftPayload)
          })
        });
        const json = await res.json();
        if (json.status === 'success') {
          toast.success('Draft perubahan berhasil diajukan ke pemberi tugas!');
          setEditingTask(null);
          fetchTasks();
        } else {
          toast.error(json.message || 'Gagal mengajukan draft');
        }
      }
    } catch (err: any) {
      console.error('Error submitting edit:', err);
      toast.error('Terjadi kesalahan saat memproses perubahan tugas');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleReviewDraft = async (action: 'approve' | 'reject') => {
    if (!reviewingTask) return;
    try {
      setIsSubmittingReview(true);
      const res = await fetch(`/api/logbook/tasks/${reviewingTask.id}/review-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          reviewerNik: inspectorNik,
          reviewerName: inspectorName,
          reviewNotes: rejectReason.trim()
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success(action === 'approve' ? 'Draft perubahan disetujui & diterapkan!' : 'Draft perubahan telah ditolak.');
        setReviewingTask(null);
        fetchTasks();
      } else {
        toast.error(json.message || 'Gagal memproses review draft');
      }
    } catch (e: any) {
      console.error('Error reviewing draft:', e);
      toast.error('Terjadi kesalahan saat review draft');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDropCardSubtask = (task: LogbookTask, targetIdx: number) => {
    if (!cardDragIdx || cardDragIdx.taskId !== task.id || cardDragIdx.itemIdx === targetIdx) {
      setCardDragIdx(null);
      setCardDragOverIdx(null);
      return;
    }
    const parsed = parseTasklist(task.description || '');
    const reordered = [...parsed.items];
    const [moved] = reordered.splice(cardDragIdx.itemIdx, 1);
    reordered.splice(targetIdx, 0, moved);
    const newDesc = reorderTasklistItems(task.description || '', reordered);

    // Optimistic update
    setTodayTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: newDesc } : t));
    setYesterdayTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: newDesc } : t));
    setCarryOverTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: newDesc } : t));

    // Send update to server
    fetch(`/api/logbook/tasks/${task.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: newDesc, updaterNik: inspectorNik })
    }).catch(e => console.warn('Failed to save subtask order:', e));

    setCardDragIdx(null);
    setCardDragOverIdx(null);
  };

  // Fetch employees list
  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEmployeesList(data);
      })
      .catch(err => console.error('Failed to load employees:', err));
  }, []);

  // Fetch bulletin posts for linking
  useEffect(() => {
    fetch(`/api/bulletin?pt=${selectedPt}`)
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success' && Array.isArray(json.data)) {
          setBulletinList(json.data);
        }
      })
      .catch(err => console.error('Failed to load bulletin posts for linking:', err));
  }, [selectedPt]);

  // Fetch Logbook tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.set('date', selectedDate);
      if (selectedSection !== 'Semua Seksi') queryParams.set('section', selectedSection);
      if (selectedPt !== 'ALL') queryParams.set('pt', selectedPt);

      const res = await fetch(`/api/logbook/tasks?${queryParams.toString()}`);
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        setTodayTasks(json.data.todayTasks || []);
        setYesterdayTasks(json.data.yesterdayTasks || []);
        setCarryOverTasks(json.data.carryOverTasks || []);
        setSummaryData(json.data.summary || null);
      }
    } catch (e) {
      console.error('Failed to fetch logbook tasks:', e);
      toast.error('Gagal memuat daftar kegiatan log book');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedSection, selectedPt]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Date Shift Helpers (-1 day, +1 day)
  const shiftDate = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  // Handle Quick Assign Task Submit (Supports Multi-PIC & PIC Job Pending)
  const handleAssignTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Judul tugas / arahan kegiatan tidak boleh kosong');
      return;
    }
    if (newAssigneeNiks.length === 0) {
      toast.error('Harap pilih minimal 1 personil PIC yang ditugaskan');
      return;
    }

    try {
      setIsSubmitting(true);
      toast.loading('Menugaskan arahan kegiatan & menyinkronkan ke Buletin...', { id: 'assign-task' });

      // Auto compute initial status if subtask mode is used
      const parsedNew = parseTasklist(newTaskDescription);
      let initStatus = isAssignPending ? 'Pending' : 'Open';
      let initPercent = 0;
      if (parsedNew.hasTasklist && parsedNew.total > 0 && !isAssignPending) {
        if (parsedNew.completed === 0) initStatus = 'Open';
        else if (parsedNew.completed === parsedNew.total) initStatus = 'Closed';
        else initStatus = 'On Progress';
        initPercent = parsedNew.percentage;
      }

      const res = await fetch('/api/logbook/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newTaskDescription.trim(),
          section: userSection,
          assigneeNik: newAssigneeNiks.join(', '),
          assigneeName: newAssigneeNames.join(', '),
          assignedByNik: inspectorNik || 'SUPERVISOR',
          assignedByName: inspectorName || 'Atasan / Manajemen',
          priority: newPriority,
          activityType: newActivityType,
          taskDate: newTaskDate || selectedDate || getTodayStr(),
          targetDate: newTargetDate || selectedDate,
          targetTime: newTargetTime.trim() || '23:59',
          status: initStatus,
          progressPercent: initPercent,
          pt: selectedPt,
          bulletinPostId: selectedBulletinPostId ? parseInt(selectedBulletinPostId) : null,
          isPending: isAssignPending,
          pendingPicNik: isAssignPending ? newPendingPicNik : null,
          pendingPicName: isAssignPending ? newPendingPicName : null,
          pendingReason: isAssignPending ? newPendingReason.trim() : null
        })
      });

      const json = await res.json();
      if (json.status === 'success') {
        toast.success(`Tugas berhasil ditugaskan ke ${newAssigneeNames.join(', ')}!`, { id: 'assign-task' });
        setShowAssignModal(false);
        setNewTitle('');
        setNewTaskDescription('');
        setNewAssigneeNiks([]);
        setNewAssigneeNames([]);
        fetchTasks();
      } else {
        toast.error(json.message || 'Gagal menugaskan task', { id: 'assign-task' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim tugas', { id: 'assign-task' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Subtask Checklist in Description
  const handleToggleSubtask = async (task: LogbookTask, itemIndex: number) => {
    const prevProg = parseTasklist(task.description || '');
    const updatedDesc = toggleTasklistItem(task.description || '', itemIndex, selectedDate);
    const progress = parseTasklist(updatedDesc);

    // Automation: if task has subtasks, auto update status:
    // 0 checked -> 'Open', 1..total-1 checked -> 'On Progress', all checked -> 'Closed'
    let autoStatus = task.status;
    if (progress.hasTasklist && progress.total > 0) {
      if (progress.completed === 0) {
        autoStatus = 'Open';
      } else if (progress.completed === progress.total) {
        autoStatus = 'Closed';
      } else {
        autoStatus = 'On Progress';
      }
    }

    // Auto-prompt routine task completion & create next period
    if (progress.hasTasklist && progress.total > 0 && progress.completed === progress.total && prevProg.completed < prevProg.total) {
      const actType = task.activityType || 'Routine';
      const isRoutine = !actType.toLowerCase().includes('non');
      if (isRoutine) {
        const normCad = normalizeCadence(actType) || 'Daily';
        const curPeriod = task.bulletinTopicTitle?.split(' - ')[1] || (normCad === 'Yearly' ? String(new Date().getFullYear()) : task.targetDate || selectedDate);
        const nextPeriod = getNextSubPeriod(curPeriod, normCad);
        const nextTargetDate = getNextDefaultTargetDate(normCad, task.targetDate || selectedDate);
        const resetDesc = resetAllTasklistItems(updatedDesc);

        setRoutineCompletionModal({
          task,
          currentPeriod: curPeriod,
          nextPeriod,
          nextTargetDate,
          resetDescription: resetDesc
        });
      }
    }

    // Optimistic UI Update
    setTodayTasks(prev => prev.map(t => t.id === task.id ? { 
      ...t, 
      description: updatedDesc, 
      progressPercent: progress.percentage,
      status: autoStatus 
    } : t));
    setYesterdayTasks(prev => prev.map(t => t.id === task.id ? { 
      ...t, 
      description: updatedDesc, 
      progressPercent: progress.percentage,
      status: autoStatus 
    } : t));
    setCarryOverTasks(prev => prev.map(t => t.id === task.id ? { 
      ...t, 
      description: updatedDesc, 
      progressPercent: progress.percentage,
      status: autoStatus 
    } : t));

    try {
      await fetch(`/api/logbook/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: updatedDesc,
          progressPercent: progress.percentage,
          status: autoStatus,
          updaterNik: inspectorNik
        })
      });

      if (autoStatus === 'Closed' && task.status !== 'Closed') {
        toast.success(`Checklist 100% selesai! Status otomatis menjadi [Closed]`);
      } else if (autoStatus === 'On Progress' && task.status !== 'On Progress') {
        toast.info(`Subtask dicentang (${progress.completed}/${progress.total}), status otomatis [On Progress]`);
      } else if (autoStatus === 'Open' && task.status !== 'Open') {
        toast.info(`Semua subtask belum dicentang, status otomatis [Open]`);
      }
    } catch (e) {
      console.error('Failed to sync checklist update:', e);
      toast.error('Gagal menyinkronkan checklist ke server');
      fetchTasks();
    }
  };

  // Update Status Directly
  const handleStatusChange = async (taskId: number, newStatus: string) => {
    // Optimistic Update
    setTodayTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    setYesterdayTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    setCarryOverTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      const res = await fetch(`/api/logbook/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          updaterNik: inspectorNik
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success(`Status diubah menjadi [${newStatus}] & tersinkron ke Buletin!`);
      }
    } catch (e) {
      toast.error('Gagal memperbarui status');
      fetchTasks();
    }
  };

  // Carry Over Task to Today
  const handleCarryOverTask = async (task: LogbookTask) => {
    try {
      toast.loading(`Memindahkan fokus "${task.title}" ke hari ini...`, { id: 'carry-over' });
      const res = await fetch('/api/logbook/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          section: task.section,
          assigneeNik: task.assigneeNik,
          assigneeName: task.assigneeName,
          assignedByNik: inspectorNik || 'SUPERVISOR',
          assignedByName: inspectorName || 'Atasan / Manajemen',
          priority: task.priority,
          activityType: task.activityType,
          taskDate: selectedDate,
          targetDate: task.targetDate || selectedDate,
          targetTime: task.targetTime || '23:59',
          pt: task.pt,
          bulletinPostId: task.bulletinPostId,
          isPending: task.isPending || false,
          pendingPicNik: task.pendingPicNik,
          pendingPicName: task.pendingPicName,
          pendingReason: task.pendingReason
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Tugas berhasil dimasukkan ke daftar fokus hari ini!', { id: 'carry-over' });
        fetchTasks();
        setActiveSection('today');
      }
    } catch (e) {
      toast.error('Gagal carry-over tugas', { id: 'carry-over' });
    }
  };

  // Delete Task with Realtime Bulletin Synchronization
  const handleDeleteTask = async (task: LogbookTask) => {
    try {
      setIsDeleting(true);
      toast.loading(`Menghapus kegiatan "${task.title}"...`, { id: 'delete-task' });

      const res = await fetch(`/api/logbook/tasks/${task.id}`, {
        method: 'DELETE'
      });
      const json = await res.json();

      if (json.status === 'success') {
        setTodayTasks(prev => prev.filter(t => t.id !== task.id));
        setYesterdayTasks(prev => prev.filter(t => t.id !== task.id));
        setCarryOverTasks(prev => prev.filter(t => t.id !== task.id));
        setTaskToDelete(null);
        toast.success(task.bulletinPostId ? 'Kegiatan berhasil dihapus dan baris buletin tersinkronkan!' : 'Kegiatan berhasil dihapus!', { id: 'delete-task' });
      } else {
        toast.error(json.message || 'Gagal menghapus kegiatan', { id: 'delete-task' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus kegiatan', { id: 'delete-task' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Handover / Job Pending Modal
  const openJobPendingModal = (task: LogbookTask) => {
    setPendingModalTask(task);
    setModalPendingPicNik(task.pendingPicNik || '');
    setModalPendingPicName(task.pendingPicName || '');
    setModalPendingReason(task.pendingReason || '');
  };

  // Save Job Pending Handover
  const handleSaveJobPending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingModalTask) return;
    if (!modalPendingPicNik || !modalPendingPicName) {
      toast.error('Harap pilih personil PIC Job Pending');
      return;
    }

    try {
      setIsSavingPending(true);
      toast.loading('Menetapkan PIC Job Pending...', { id: 'save-pending' });

      const res = await fetch(`/api/logbook/tasks/${pendingModalTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Pending',
          isPending: true,
          pendingPicNik: modalPendingPicNik,
          pendingPicName: modalPendingPicName,
          pendingReason: modalPendingReason.trim(),
          updaterNik: inspectorNik
        })
      });

      const json = await res.json();
      if (json.status === 'success') {
        toast.success(`Job Pending berhasil dialihkan ke ${modalPendingPicName}!`, { id: 'save-pending' });
        setPendingModalTask(null);
        fetchTasks();
      } else {
        toast.error(json.message || 'Gagal menyimpan status pending', { id: 'save-pending' });
      }
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan', { id: 'save-pending' });
    } finally {
      setIsSavingPending(false);
    }
  };

  // Copy Meeting & Operational Summary to WhatsApp / Clipboard (Section Centric)
  const handleCopyMeetingSummary = () => {
    const formattedDate = new Date(selectedDate).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let text = `*📋 NOTULENSI MORNING BRIEFING & LOG BOOK SEKSI*\n`;
    text += `*Tanggal*: ${formattedDate}\n`;
    text += `*Seksi*: ${selectedSection} (${selectedPt})\n`;
    text += `*Dipimpin Oleh*: ${inspectorName || 'Supervisor / Atasan'}\n\n`;

    text += `*1️⃣ EVALUASI & PROGRES TUGAS KEMARIN:*\n`;
    if (yesterdayTasks.length === 0) {
      text += `- Tidak ada catatan kegiatan dari shift/hari kemarin.\n`;
    } else {
      yesterdayTasks.forEach((t, i) => {
        const isDone = t.status === 'Resolved' || t.status === 'Done' || t.status === 'Closed';
        const statusBadge = isDone ? '✅ [SELESAI]' : '⏳ [CARRY-OVER]';
        const pendingInfo = t.isPending ? ` [PENDING: ${t.pendingPicName || 'Job Pending'} - ${t.pendingReason || ''}]` : '';
        text += `${i + 1}. ${statusBadge} ${t.title} - PIC: ${t.assigneeName}${pendingInfo}\n`;
        const parsed = parseTasklist(t.description || '');
        if (parsed.hasTasklist) {
          parsed.items.forEach(item => {
            text += `   ${item.checked ? '✅' : '◻️'} ${item.text}\n`;
          });
        }
      });
    }

    text += `\n*2️⃣ PLANNING & PENUGASAN KERJA HARI INI:*\n`;
    if (todayTasks.length === 0) {
      text += `- Belum ada tugas/planning yang ditugaskan untuk hari ini.\n`;
    } else {
      todayTasks.forEach((t, i) => {
        const pendingInfo = t.isPending ? ` [Job Pending: ${t.pendingPicName || ''}]` : '';
        text += `${i + 1}. [${t.priority}] ${t.title} (PIC: ${t.assigneeName}${pendingInfo}) - Target: ${t.targetDate || 'Hari ini'} [${t.status}]\n`;
        const parsed = parseTasklist(t.description || '');
        if (parsed.hasTasklist) {
          parsed.items.forEach(item => {
            text += `   ${item.checked ? '✅' : '◻️'} ${item.text}\n`;
          });
        }
      });
    }

    text += `\n_Disampaikan saat Morning Briefing Seksi - Prep & Lab Portal_`;

    navigator.clipboard.writeText(text);
    toast.success('Notulensi Morning Briefing berhasil disalin ke clipboard! Siap dibagikan ke WhatsApp.');
  };

  // Priority / Urgency ranking: Urgent (1) > High (2) > Normal/Medium (3) > Low (4) > Other (5)
  const getPriorityWeight = (priority: string) => {
    const p = (priority || '').toLowerCase().trim();
    if (p === 'urgent') return 1;
    if (p === 'high') return 2;
    if (p === 'normal' || p === 'medium' || p === 'sedang') return 3;
    if (p === 'low' || p === 'rendah') return 4;
    return 5;
  };

  // Sort tasks by Urgency first (Urgent > High > Normal > Low), then FIFO (earliest created / lowest id first)
  const sortTasksByUrgencyAndFifo = (a: LogbookTask, b: LogbookTask) => {
    const weightA = getPriorityWeight(a.priority);
    const weightB = getPriorityWeight(b.priority);
    if (weightA !== weightB) {
      return weightA - weightB; // Lower weight = more urgent
    }
    // FIFO: earliest created first (oldest task first)
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : a.id;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : b.id;
    if (timeA !== timeB) {
      return timeA - timeB;
    }
    return a.id - b.id;
  };

  // Calculate task progress percentage helper
  const calculateTaskProgress = (task: LogbookTask) => {
    const parsed = parseTasklist(task.description || '');
    if (parsed.hasTasklist && parsed.total > 0) {
      return parsed.percentage;
    }
    const isDone = task.status === 'Resolved' || task.status === 'Done' || task.status === 'Closed';
    if (isDone) return 100;
    if (task.status === 'In Progress') {
      return task.progressPercent && task.progressPercent > 0 ? task.progressPercent : 50;
    }
    return task.progressPercent || 0;
  };

  // Task classification counters for Header Module Switcher
  const routineCountToday = useMemo(() => todayTasks.filter(t => isTaskRoutine(t)).length, [todayTasks]);
  const nonRoutineCountToday = useMemo(() => todayTasks.filter(t => !isTaskRoutine(t)).length, [todayTasks]);

  // Filtered Today & Yesterday Lists (Sorted by Urgency then FIFO)
  const filteredToday = useMemo(() => {
    return todayTasks
      .filter(t => {
        // Enforce: Non-routine tasks in today's column must strictly be for selectedDate
        const isRoutine = isTaskRoutine(t);
        if (!isRoutine && t.taskDate !== selectedDate) {
          return false;
        }

        const matchSearch = !searchQuery || 
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          t.assigneeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.pendingPicName && t.pendingPicName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchPic = picFilter === 'ALL' || t.assigneeNik.includes(picFilter) || t.assigneeName.includes(picFilter) || (t.pendingPicNik && t.pendingPicNik.includes(picFilter));
        const matchModule = matchesModuleMode(t, moduleMode);
        const matchActivity = matchesActivityFilter(t, activityFilter);
        return matchSearch && matchPic && matchModule && matchActivity;
      })
      .sort(sortTasksByUrgencyAndFifo);
  }, [todayTasks, searchQuery, picFilter, moduleMode, activityFilter, selectedDate]);

  // Scope selector for Evaluation Column: 'yesterday' (strict H-1) vs 'all_carryover' (all historical carry overs)
  const [evalScope, setEvalScope] = useState<'yesterday' | 'all_carryover'>('yesterday');

  const evalSourceTasks = useMemo(() => {
    return evalScope === 'yesterday' ? yesterdayTasks : carryOverTasks;
  }, [evalScope, yesterdayTasks, carryOverTasks]);

  const filteredYesterday = useMemo(() => {
    return evalSourceTasks
      .filter(t => {
        const matchSearch = !searchQuery || 
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
          t.assigneeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (t.pendingPicName && t.pendingPicName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchPic = picFilter === 'ALL' || t.assigneeNik.includes(picFilter) || t.assigneeName.includes(picFilter) || (t.pendingPicNik && t.pendingPicNik.includes(picFilter));
        const matchModule = matchesModuleMode(t, moduleMode);
        const matchActivity = matchesActivityFilter(t, activityFilter);
        return matchSearch && matchPic && matchModule && matchActivity;
      })
      .sort(sortTasksByUrgencyAndFifo);
  }, [evalSourceTasks, searchQuery, picFilter, moduleMode, activityFilter]);

  // Active Section for Presentation Focus Highlight ('yesterday' | 'today')
  const [activeSection, setActiveSection] = useState<'yesterday' | 'today'>('yesterday');

  const displayedYesterdayTasks = useMemo(() => {
    return filteredYesterday;
  }, [filteredYesterday]);

  const yesterdayCompletedCount = useMemo(() => {
    return filteredYesterday.filter(t => t.status === 'Resolved' || t.status === 'Done' || t.status === 'Closed').length;
  }, [filteredYesterday]);

  const yesterdayPendingCount = useMemo(() => {
    return filteredYesterday.filter(t => t.status !== 'Resolved' && t.status !== 'Done' && t.status !== 'Closed').length;
  }, [filteredYesterday]);

  // Copy Yesterday Progress Report specifically tailored for Management
  const handleCopyYesterdayManagementReport = () => {
    const yDate = summaryData?.yesterdayDate || '';
    const formattedYDate = yDate ? formatDisplayTargetDate(yDate) : 'Hari Kemarin (H-1)';
    const total = yesterdayTasks.length;
    const completed = yesterdayTasks.filter(t => t.status === 'Resolved' || t.status === 'Done' || t.status === 'Closed');
    const inProgress = yesterdayTasks.filter(t => t.status === 'In Progress' || t.status === 'On Progress');
    const pending = yesterdayTasks.filter(t => t.isPending || t.status === 'Pending');
    const unfinished = yesterdayTasks.filter(t => t.status !== 'Resolved' && t.status !== 'Done' && t.status !== 'Closed');
    const percent = summaryData?.yesterdayProgressPercent ?? (total > 0 ? Math.round((completed.length / total) * 100) : 0);

    let report = `*📊 REKAP PROGRESS PEKERJAAN KEMARIN (H-1)*\n`;
    report += `📅 *Hari/Tanggal*: ${formattedYDate}\n`;
    report += `🏢 *Seksi*: ${selectedSection} (${selectedPt})\n`;
    report += `📈 *Capaian Progres Kemarin*: ${percent}% (${completed.length} dari ${total} kegiatan terselesaikan)\n\n`;

    report += `*RINGKASAN STATUS KEMARIN:*\n`;
    report += `• Selesai (Closed/Done): ${completed.length} kegiatan\n`;
    report += `• On Progress: ${inProgress.length} kegiatan\n`;
    report += `• Pending (Job Pending): ${pending.length} kegiatan\n\n`;

    report += `✅ *DAFTAR TUGAS SELESAI (${completed.length}):*\n`;
    if (completed.length === 0) {
      report += `- Tidak ada tugas yang diselesaikan kemarin.\n`;
    } else {
      completed.forEach((t, i) => {
        report += `${i + 1}. [${t.priority}] ${t.title} [100%]\n   - PIC: ${t.assigneeName}\n`;
      });
    }

    report += `\n⏳ *DAFTAR TUGAS ON PROGRESS / CARRY-OVER (${unfinished.length}):*\n`;
    if (unfinished.length === 0) {
      report += `- Nihil (Semua tugas kemarin telah tuntas 100%).\n`;
    } else {
      unfinished.forEach((t, i) => {
        const prog = calculateTaskProgress(t);
        const pendingNote = t.isPending ? ` [Job Pending: ${t.pendingPicName || ''} - ${t.pendingReason || ''}]` : '';
        report += `${i + 1}. [${t.priority}] ${t.title} [Progres: ${prog}% - Status: ${t.status}]${pendingNote}\n   - PIC: ${t.assigneeName}\n   - Target: ${formatDisplayTargetDate(t.targetDate)} (${t.targetTime || '23:59'})\n`;
      });
    }

    if (carryOverTasks.length > unfinished.length) {
      const olderCount = carryOverTasks.length - unfinished.length;
      report += `\n📌 *Catatan*: Terdapat ${olderCount} carry-over tambahan dari hari sebelumnya yang masih aktif berjalan.\n`;
    }

    report += `\n_Laporan resmi dibuat via Prep & Lab Portal Log Book_`;

    navigator.clipboard.writeText(report);
    toast.success('Laporan Progress Kemarin untuk Manajemen berhasil disalin ke clipboard! Siap kirim via WhatsApp.');
  };

  // Unique PICs in current tasks for the filter dropdown
  const uniquePics = useMemo(() => {
    const map = new Map<string, string>();
    [...todayTasks, ...yesterdayTasks, ...carryOverTasks].forEach(t => {
      const pics = parsePicList(t.assigneeNik, t.assigneeName);
      pics.forEach(p => {
        if (p.nik && p.name) map.set(p.nik, p.name);
      });
      if (t.pendingPicNik && t.pendingPicName) {
        map.set(t.pendingPicNik, `${t.pendingPicName} (Pending)`);
      }
    });
    return Array.from(map.entries()).map(([nik, name]) => ({ nik, name }));
  }, [todayTasks, yesterdayTasks, carryOverTasks]);

  const expandAllTasks = () => {
    const allIds = new Set<number>([
      ...filteredYesterday.map(t => t.id),
      ...filteredToday.map(t => t.id)
    ]);
    setExpandedTaskIds(allIds);
  };

  const collapseAllTasks = () => {
    setExpandedTaskIds(new Set());
  };

  // Enterprise Minimalist Task Row Renderer with Click-to-Expand Details
  const renderTaskCard = (task: LogbookTask, isCarryOver: boolean, isReadOnly: boolean = false) => {
    const parsed = parseTasklist(task.description || '');
    const hasSubtasks = parsed.hasTasklist && parsed.total > 0;
    const isDone = task.status === 'Resolved' || task.status === 'Done' || task.status === 'Closed';
    const isPending = task.isPending || task.status === 'Pending';
    const isInProgress = task.status === 'In Progress' || task.status === 'On Progress';
    const isExpanded = expandedTaskIds.has(task.id);
    const picList = parsePicList(task.assigneeNik, task.assigneeName);
    const isOverdue = isTaskOverdue(task.targetDate, task.targetTime, task.status);
    const progressPercent = calculateTaskProgress(task);
    const routineInfo = getTaskRoutineInfo(task, selectedDate);

    // Mode Subtask Status Automation:
    // Jika ada subtask: otomatis Open (0 ceklis), On Progress (1..N-1 ceklis), Closed (full ceklis), dengan pilihan khusus Canceled.
    // Jika tanpa subtask: full manual (Open, On Progress, Closed, Canceled).
    const autoStatus = parsed.completed === 0 ? 'Open' : parsed.completed === parsed.total ? 'Closed' : 'On Progress';
    const isCanceled = (task.status || '').toLowerCase() === 'canceled';

    const statusOptionsOverride: DropdownOption[] | undefined = hasSubtasks
      ? isCanceled
        ? [
            {
              value: autoStatus,
              label: `Pulihkan ke [${autoStatus}]`,
              badgeClass: autoStatus === 'Closed' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/40' : autoStatus === 'On Progress' ? 'bg-amber-500/15 text-amber-600 border-amber-500/40' : 'bg-blue-500/15 text-blue-500 border-blue-500/40',
              icon: <RotateCcw className="w-2.5 h-2.5" />
            },
            {
              value: 'Canceled',
              label: 'Canceled (Batal)',
              badgeClass: 'bg-rose-500/15 text-rose-600 border-rose-500/40',
              icon: <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
            }
          ]
        : [
            {
              value: autoStatus,
              label: `${autoStatus} (Auto Checklist: ${parsed.completed}/${parsed.total})`,
              badgeClass: autoStatus === 'Closed' ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/40' : autoStatus === 'On Progress' ? 'bg-amber-500/15 text-amber-600 border-amber-500/40' : 'bg-blue-500/15 text-blue-500 border-blue-500/40',
              icon: autoStatus === 'Closed' ? <CheckCircle2 className="w-2.5 h-2.5" /> : autoStatus === 'On Progress' ? <RotateCcw className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />
            },
            {
              value: 'Canceled',
              label: 'Canceled (Batalkan)',
              badgeClass: 'bg-rose-500/15 text-rose-600 border-rose-500/40',
              icon: <AlertCircle className="w-2.5 h-2.5 text-rose-600" />
            }
          ]
      : undefined;

    // Dynamic Section Badge Palette (Masculine Pastel High Contrast)
    const sectionBadgeClass = 
      task.section.includes('Prep') ? 'bg-amber-100 text-amber-950 border border-amber-300' :
      task.section.includes('Lab') ? 'bg-indigo-100 text-indigo-950 border border-indigo-300' :
      task.section.includes('Maint') ? 'bg-orange-100 text-orange-950 border border-orange-300' :
      task.section.includes('QA') || task.section.includes('Quality') ? 'bg-cyan-100 text-cyan-950 border border-cyan-300' :
      'bg-slate-200 text-slate-800 border border-slate-300';

    return (
      <div 
        key={task.id}
        className={`rounded-xl border transition-all duration-200 ${isExpanded ? 'overflow-visible' : 'overflow-hidden'} ${
          isExpanded 
            ? 'border-teal-400 bg-white shadow-md ring-2 ring-teal-500/10' 
            : isDone 
            ? 'border-emerald-200 bg-emerald-50/20 hover:border-emerald-300 hover:bg-emerald-50/40' 
            : isPending
            ? 'border-amber-200 bg-amber-50/20 hover:border-amber-300 hover:bg-amber-50/40' 
            : isInProgress
            ? 'border-sky-200 bg-sky-50/20 hover:border-sky-300 hover:bg-sky-50/40' 
            : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50/50 shadow-2xs'
        }`}
      >
        {/* Minimalist Baris Header (Clickable anywhere to expand/collapse) */}
        <div 
          onClick={() => toggleExpand(task.id)}
          className="p-3 sm:px-4 sm:py-2.5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors group"
        >
          {/* Left: Chevron + Priority Badge + Judul Utama Task */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {/* Expand indicator icon */}
            <div className={`p-1 rounded-md text-slate-400 group-hover:text-teal-700 transition-transform duration-200 shrink-0 ${
              isExpanded ? 'rotate-90 text-teal-700 bg-teal-50' : 'hover:bg-slate-100'
            }`}>
              <ChevronRight className="w-4 h-4" />
            </div>

            {/* Urgency Badge */}
            <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 shadow-2xs ${
              task.priority === 'Urgent' 
                ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse' :
              task.priority === 'High' 
                ? 'bg-amber-100 text-amber-900 border border-amber-300' :
              task.priority === 'Low'
                ? 'bg-slate-100 text-slate-500 border border-slate-200' :
                'bg-slate-100 text-slate-700 border border-slate-300 font-bold'
            }`}>
              {task.priority}
            </span>

            {/* Routine Cadence Badge */}
            <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md border shrink-0 shadow-2xs ${routineInfo.color}`}>
              {routineInfo.label}
            </span>
            {routineInfo.dDayText && !isDone && (
              <span className="hidden sm:inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300 shrink-0">
                {routineInfo.dDayText}
              </span>
            )}

            {/* Judul Utama Task */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <h3 className={`font-bold leading-snug text-slate-900 tracking-tight text-sm sm:text-base truncate ${
                isDone ? 'line-through text-slate-400 font-normal' : ''
              }`}>
                {task.title}
              </h3>

              {/* Notice indicators on collapsed row */}
              {task.draftChange && (
                <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                  Draft Usulan
                </span>
              )}
              {isOverdue && !isDone && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  Lewat Batas
                </span>
              )}
            </div>
          </div>

          {/* Right: Status Dropdown, Copy Button & Mini Progress Bar */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="flex flex-col items-end gap-1 shrink-0"
          >
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyToNewTask(task);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Salin kegiatan ini ke tugas baru"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {/* Status Dropdown: Static Badge if isReadOnly, Interactive Dropdown if active */}
              {isReadOnly ? (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border ${
                  isDone 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : isInProgress 
                    ? 'bg-amber-100 text-amber-900 border-amber-300' 
                    : 'bg-slate-100 text-slate-700 border-slate-300'
                }`}>
                  {isDone ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Clock className="w-3 h-3 text-amber-600" />}
                  <span>{task.status}</span>
                </span>
              ) : (
                <NotionDropdownCell
                  type="status"
                  value={task.status}
                  onChange={(newVal) => handleStatusChange(task.id, newVal)}
                  optionsOverride={statusOptionsOverride}
                />
              )}
            </div>

            {/* Progress bar kecil di ujung kanan di bagian bawah status */}
            <div className="flex items-center justify-end gap-1.5 w-24 sm:w-28 mt-0.5">
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    isDone 
                      ? 'bg-emerald-500' 
                      : isInProgress 
                      ? 'bg-teal-600' 
                      : progressPercent > 0 
                      ? 'bg-sky-500' 
                      : 'bg-slate-300'
                  }`}
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-600 min-w-[28px] text-right">
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Expandable Details (Hanya muncul saat task diklik) */}
        {isExpanded && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/50 space-y-4 animate-in fade-in duration-150">
            {/* Badges Bar (Seksi, Tanggal Target / Asal, Overdue, Buletin) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-lg font-mono font-bold shadow-2xs tracking-wide ${sectionBadgeClass}`}>
                {task.section}
              </span>

              {/* Routine Cadence Detail Badge */}
              <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1.5 shadow-2xs ${routineInfo.color}`}>
                <span>{routineInfo.label}</span>
                <span className="opacity-50">•</span>
                <span>{routineInfo.windowDesc}</span>
                {routineInfo.dDayText && (
                  <span className="font-mono font-black text-[11px] bg-white/80 dark:bg-slate-900/80 px-1.5 py-0.5 rounded shadow-2xs border border-current">
                    {routineInfo.dDayText}
                  </span>
                )}
              </span>

              {/* Tanggal Dimulai (Start Date) Badge */}
              <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1 shadow-2xs" title="Tanggal Dimulai (Start Date)">
                <Calendar className="w-3.5 h-3.5 text-slate-600" />
                <span>Mulai: {formatDisplayTargetDate(task.taskDate)}</span>
              </span>

              {/* Target Selesai (Deadline) Badge */}
              <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1.5 shadow-2xs ${
                isOverdue 
                  ? 'bg-rose-50 text-rose-900 border-rose-300' 
                  : 'bg-sky-50 text-sky-900 border-sky-200'
              }`}>
                <Calendar className={`w-3.5 h-3.5 ${isOverdue ? 'text-rose-600' : 'text-sky-600'}`} />
                <span>Target: {formatDisplayTargetDate(task.targetDate)}</span>
                <span className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                  isOverdue ? 'bg-rose-200/80 text-rose-950' : 'bg-sky-200/70 text-sky-950'
                }`}>
                  <Clock className="w-3 h-3 text-slate-700" />
                  {task.targetTime && task.targetTime !== '23:59' ? `${task.targetTime} WIB` : '12 Malam (23:59)'}
                </span>
              </span>

              {isOverdue && !isDone && (
                <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-lg font-black bg-rose-600 text-white shadow-2xs animate-pulse flex items-center gap-1 uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Lewat Batas Jam</span>
                </span>
              )}

              {task.bulletinPostId ? (
                <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg shadow-2xs">
                  <FileText className="w-3.5 h-3.5 text-teal-600" />
                  <span>Buletin #{task.bulletinPostId}</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(task);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-300 border-dashed px-2 py-0.5 rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Klik untuk menghubungkan tugas ini ke dokumen Buletin Harian"
                >
                  <FileText className="w-3 h-3 text-teal-600" />
                  <span>+ Tautkan ke Buletin</span>
                </button>
              )}
            </div>

            {/* Draft Change Notice Banner (If PIC submitted a draft change) */}
            {(() => {
              let draftData: any = null;
              if (task.draftChange) {
                try {
                  draftData = typeof task.draftChange === 'string' ? JSON.parse(task.draftChange) : task.draftChange;
                } catch (e) {
                  draftData = null;
                }
              }
              if (!draftData) return null;

              const isCreator = task.assignedByNik === inspectorNik || isSupervisor;
              return (
                <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5">
                    <span className="p-1 px-2 rounded-lg bg-amber-500 text-white font-black text-[10px] tracking-wider uppercase shadow-2xs">
                      DRAFT PERUBAHAN
                    </span>
                    <div>
                      <p className="text-xs font-black text-amber-950">
                        Diajukan oleh {draftData.proposedByName || 'PIC'}
                      </p>
                      {draftData.changeReason && (
                        <p className="text-[11px] text-amber-900 font-medium line-clamp-1">
                          <strong>Alasan:</strong> {draftData.changeReason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {isCreator ? (
                      <button
                        type="button"
                        onClick={() => openReviewModal(task)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Review & Setujui</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200">
                        ⏳ Menunggu Review Pemberi Tugas
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* PIC Pelaksana Box */}
            <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-wrap items-center gap-2 shadow-2xs">
              <span className="text-slate-800 font-bold text-xs flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-teal-700" />
                PIC Pelaksana:
              </span>
              {picList.map((p, pIdx) => (
                <span 
                  key={pIdx} 
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-700 text-white font-black text-xs shadow-xs"
                >
                  <span>{p.name}</span>
                  {p.nik && <span className="text-[10px] opacity-80 font-mono">({p.nik})</span>}
                </span>
              ))}
            </div>

            {/* Job Pending Note Banner */}
            {task.isPending && (
              <div className="p-3 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs space-y-1">
                <div className="font-black text-sm flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Status Job Pending: Dialihkan ke {task.pendingPicName}</span>
                </div>
                {task.pendingReason && (
                  <p className="text-xs text-amber-900 font-medium">
                    <strong>Alasan Handover:</strong> {task.pendingReason}
                  </p>
                )}
              </div>
            )}

            {/* Subtasks Checklist with HTML5 Drag & Drop */}
            {parsed.hasTasklist && (
              <div className="space-y-2 bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between text-xs sm:text-sm font-black text-slate-900 pb-1 border-b border-slate-100">
                  <span className="flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-teal-600" />
                    <span>Checklist Subtask ({parsed.completed}/{parsed.total})</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">Geser ikon titik untuk atur posisi</span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {parsed.items.map((item, idx) => (
                    <div
                      key={item.index}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', String(idx));
                        setCardDragIdx({ taskId: task.id, itemIdx: idx });
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (cardDragOverIdx?.taskId === task.id && cardDragOverIdx?.itemIdx !== idx) {
                          setCardDragOverIdx({ taskId: task.id, itemIdx: idx });
                        }
                      }}
                      onDragLeave={() => {
                        if (cardDragOverIdx?.taskId === task.id && cardDragOverIdx?.itemIdx === idx) {
                          setCardDragOverIdx(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleDropCardSubtask(task, idx);
                      }}
                      onDragEnd={() => {
                        setCardDragIdx(null);
                        setCardDragOverIdx(null);
                      }}
                      className={`flex items-start gap-2 p-2 rounded-xl border transition-all select-none ${
                        cardDragIdx?.taskId === task.id && cardDragIdx?.itemIdx === idx
                          ? 'opacity-40 border-2 border-dashed border-teal-500 bg-teal-50/50'
                          : item.checked
                          ? 'bg-slate-50 border-slate-200'
                          : 'bg-white border-slate-300 hover:border-teal-500 hover:shadow-xs'
                      } ${
                        cardDragOverIdx?.taskId === task.id && cardDragOverIdx?.itemIdx === idx && cardDragIdx?.itemIdx !== idx
                          ? 'border-t-2 border-teal-600 bg-teal-50/40'
                          : ''
                      }`}
                    >
                      {!isReadOnly && (
                        <div 
                          className="cursor-grab active:cursor-grabbing p-0.5 text-slate-400 hover:text-teal-600 transition-colors shrink-0 mt-0.5"
                          title="Geser untuk mengatur urutan subtask (Drag & Drop)"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>
                      )}
                      <input
                        type="checkbox"
                        checked={item.checked}
                        disabled={isReadOnly}
                        onChange={() => {
                          if (isReadOnly) {
                            toast.warning('🔒 Laporan Kemarin bersifat Read-Only. Untuk menceklis tugas yang terlewat, silakan geser tanggal log book ke kemarin.');
                            return;
                          }
                          handleToggleSubtask(task, item.index);
                        }}
                        className={`mt-0.5 w-4 h-4 rounded border-2 border-slate-400 text-teal-600 focus:ring-teal-500 shrink-0 ${
                          isReadOnly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                        }`}
                      />
                      <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1">
                        <span className={`text-xs sm:text-sm leading-snug break-words ${
                          item.checked 
                            ? 'line-through text-slate-400 font-normal' 
                            : 'font-bold text-slate-900'
                        }`}>
                          {item.text}
                        </span>
                        {item.checkedDate && (
                          <span 
                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold border inline-flex items-center gap-0.5 w-fit ${
                              item.checkedDate === summaryData?.yesterdayDate
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                            title={`Diceklis pada: ${item.checkedDate}`}
                          >
                            {item.checkedDate === summaryData?.yesterdayDate ? '✅ Diceklis Kemarin' : `Diceklis: ${item.checkedDate}`}
                          </span>
                        )}
                      </div>

                      {/* Icon (!) Catatan Subtask & Bubble Chat ke Kanan */}
                      {(() => {
                        const bubbleKey = `${task.id}-${item.index}`;
                        const isBubbleOpen = activeNoteBubbleKey === bubbleKey;
                        const rawNotes: SubtaskNote[] = (item.notes && item.notes.length > 0)
                          ? item.notes
                          : (item.note ? [{ id: 'legacy-1', text: item.note, date: item.noteDate || '', time: '', author: '' }] : []);
                        const notesList: SubtaskNote[] = [...rawNotes].sort((a, b) => {
                          const dtA = `${a.date || ''} ${a.time || ''}`;
                          const dtB = `${b.date || ''} ${b.time || ''}`;
                          return dtB.localeCompare(dtA);
                        });
                        const noteCount = notesList.length;

                        return (
                          <div className="relative inline-flex items-center shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isReadOnly) {
                                  if (noteCount > 0) {
                                    setActiveNoteBubbleKey(prev => prev === bubbleKey ? null : bubbleKey);
                                  } else {
                                    toast.info('Tidak ada catatan pada subtask ini.');
                                  }
                                } else {
                                  openSubtaskNoteModal(task, item.index, item.text, notesList, isReadOnly);
                                }
                              }}
                              title={noteCount > 0 ? `${noteCount} Catatan Subtask (Klik untuk lihat)` : isReadOnly ? 'Tidak ada catatan' : 'Tambah catatan subtask (Icon !)'}
                              className={`relative p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                                noteCount > 0
                                  ? 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 shadow-2xs'
                                  : isReadOnly
                                  ? 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                                  : 'text-slate-400 hover:text-teal-700 hover:bg-teal-50 hover:border hover:border-teal-200'
                              }`}
                            >
                              <AlertCircle className={`w-3.5 h-3.5 ${noteCount > 0 ? 'text-amber-600' : ''}`} />

                              {/* Angka Badge Menggantikan Dot Merah */}
                              {noteCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white font-mono text-[9px] font-black flex items-center justify-center border-2 border-white shadow-xs">
                                  {noteCount}
                                </span>
                              )}
                            </button>

                            {/* Bubble Chat ke Kanan untuk Modul Kemarin (isReadOnly) */}
                            {isReadOnly && isBubbleOpen && noteCount > 0 && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 sm:right-auto sm:left-full sm:ml-3 top-full sm:top-1/2 mt-2 sm:mt-0 sm:-translate-y-1/2 z-[100] w-72 sm:w-80 max-w-[85vw] bg-slate-900 text-slate-100 rounded-2xl p-3.5 shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-150"
                              >
                                {/* Speech Bubble Tail pointing left on desktop, up on mobile */}
                                <div className="hidden sm:block absolute -left-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-slate-900 border-l border-b border-slate-700 rotate-45 pointer-events-none" />
                                <div className="sm:hidden absolute -top-1.5 right-3 w-3 h-3 bg-slate-900 border-t border-l border-slate-700 rotate-45 pointer-events-none" />

                                <div className="relative flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                                  <div className="flex items-center gap-1.5">
                                    <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
                                    <span className="text-[11px] font-black uppercase tracking-wider text-teal-400">
                                      Catatan Subtask ({noteCount})
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setActiveNoteBubbleKey(null)}
                                    className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                    title="Tutup"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="relative mb-2.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300 font-medium line-clamp-2">
                                  <span className="text-slate-400 font-normal">Subtask: </span>{item.text}
                                </div>

                                <div className="relative space-y-2 max-h-56 overflow-y-auto pr-1">
                                  {notesList.map((nt, nIdx) => (
                                    <div key={nt.id || nIdx} className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs text-slate-100 space-y-1">
                                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                                        <span className="text-teal-300 font-bold">{nt.author || 'PIC'}</span>
                                        <span>📅 {nt.date}{nt.time ? ` ⏰ ${nt.time}` : ''}</span>
                                      </div>
                                      <div className="whitespace-pre-wrap leading-relaxed font-medium text-slate-200">
                                        {nt.text}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clean description text (if task has checklist and clean text) */}
            {parsed.hasTasklist && parsed.cleanText && (
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div 
                  className="text-xs sm:text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: markdownToVisualHtml(parsed.cleanText) }}
                />
              </div>
            )}

            {/* If task has no checklist but has description */}
            {!parsed.hasTasklist && task.description && (
              <div className="p-3 rounded-xl bg-white border border-slate-200">
                <div 
                  className="text-xs sm:text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: markdownToVisualHtml(task.description) }}
                />
              </div>
            )}

            {/* Action Buttons Toolbar in Expanded View */}
            <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-2.5 border-slate-200">
              {isReadOnly ? (
                <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 px-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>Laporan Progres Kemarin (Read-Only). Geser tanggal log book ke kemarin jika perlu pembaruan data.</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyToNewTask(task)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-200 text-indigo-700 border border-slate-300 transition-all cursor-pointer shadow-2xs self-start sm:self-auto shrink-0"
                    title="Salin tugas ini ke form penugasan baru"
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Salin ke Tugas Baru</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => openJobPendingModal(task)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition-all cursor-pointer shadow-xs"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>{task.isPending ? 'Ubah PIC Pending' : 'Set Job Pending'}</span>
                  </button>

                  {(task.assignedByNik === inspectorNik || isSupervisor || String(task.assigneeNik || '').split(',').map(s => s.trim()).includes(inspectorNik) || task.pendingPicNik === inspectorNik) && (
                    <button
                      type="button"
                      onClick={() => openEditModal(task)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-all cursor-pointer shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                      <span>{(task.assignedByNik === inspectorNik || isSupervisor) ? 'Edit Tugas' : 'Ajukan Perubahan'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleCopyToNewTask(task)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Salin tugas ini ke form penugasan baru"
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Salin ke Tugas Baru</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTaskToDelete(task)}
                    title="Hapus kegiatan ini"
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!isReadOnly && isCarryOver && !isDone && (
                <button
                  type="button"
                  onClick={() => handleCarryOverTask(task)}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>Lanjutkan ke Fokus Hari Ini</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen pb-24 font-sans text-xs sm:text-sm" style={{ backgroundColor: 'var(--bg-main, #f8fafc)', color: 'var(--text-main, #0f172a)' }}>
      {/* Top Banner Navigation Header */}
      <div 
        className="sticky top-0 z-30 border-b shadow-xs transition-colors backdrop-blur-md"
        style={{ 
          backgroundColor: 'var(--header-bg, var(--card-bg, #ffffff))',
          borderColor: 'var(--border-main, #e2e8f0)'
        }}
      >
        <div className="w-full px-4 sm:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Title & Back */}
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                title="Kembali ke Dashboard"
              >
                <ArrowLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  <ClipboardCheck className="w-4 h-4" />
                </span>
                <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>Log Book Section & Morning Briefing Hub</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                    Section Log Book
                  </span>
                </h1>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                Carry Over Task, Fokus Kegiatan Hari Ini, Multi-PIC, dan Penugasan Terintegrasi Buletin
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMeetingSummary}
              title="Salin notulensi log book dan briefing ke WhatsApp"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #cbd5e1)'
              }}
            >
              <Copy className="w-3.5 h-3.5 text-teal-500" />
              <span className="hidden sm:inline">Salin Notulensi Seksi</span>
            </button>

            <button
              type="button"
              onClick={() => setShowTemplateModal(true)}
              title="Kelola & gunakan template kegiatan"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #cbd5e1)'
              }}
            >
              <Bookmark className="w-3.5 h-3.5 text-teal-600" />
              <span className="hidden sm:inline">Template Tugas</span>
            </button>

            <button
              onClick={openAssignModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Arahan Kegiatan Baru</span>
            </button>
          </div>
        </div>

        {/* Date Selector & Filters Bar */}
        <div 
          className="border-t px-4 py-2 bg-slate-500/5"
          style={{ borderColor: 'var(--border-main, #e2e8f0)' }}
        >
          <div className="w-full px-4 sm:px-8 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Date Selector Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => shiftDate(-1)}
                className="p-1 rounded-lg border hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                title="Hari Sebelumnya"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>

              <div 
                className="flex items-center gap-2 px-3 py-1 rounded-xl border shadow-xs"
                style={{
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  borderColor: 'var(--border-main, #cbd5e1)'
                }}
              >
                <Calendar className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent outline-none font-bold text-xs cursor-pointer"
                  style={{ color: 'var(--text-main, #0f172a)' }}
                />
              </div>

              <button
                onClick={() => shiftDate(1)}
                className="p-1 rounded-lg border hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                title="Hari Berikutnya"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {selectedDate !== getTodayStr() && (
                <button
                  onClick={() => setSelectedDate(getTodayStr())}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 transition-colors cursor-pointer"
                >
                  Kembali ke Hari Ini
                </button>
              )}
            </div>

            {/* Header Module Mode Switcher: Semua Modul | Modul Routine | Modul Non Routine */}
            <div className="flex items-center p-1 rounded-2xl border bg-slate-100/90 dark:bg-slate-800/80 shadow-2xs gap-1">
              <button
                type="button"
                onClick={() => setModuleMode('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  moduleMode === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs border border-slate-200/80 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title="Tampilkan seluruh modul kegiatan (Routine & Non Routine)"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>Semua Modul</span>
              </button>

              <button
                type="button"
                onClick={() => setModuleMode('ROUTINE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  moduleMode === 'ROUTINE'
                    ? 'bg-teal-700 text-white shadow-xs ring-2 ring-teal-400/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-teal-700 dark:hover:text-teal-300'
                }`}
                title="Khusus memantau tugas Routine: Daily, Weekly (D-3), Monthly (D-7), Quarterly (M-1), Biannual (M-2), Yearly (M-3)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Modul Routine</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  moduleMode === 'ROUTINE' ? 'bg-teal-900/60 text-teal-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {routineCountToday}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModuleMode('NON_ROUTINE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  moduleMode === 'NON_ROUTINE'
                    ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-400/40'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-700 dark:hover:text-amber-300'
                }`}
                title="Khusus memantau instruksi operasional non rutin / penugasan harian"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Modul Non Routine</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  moduleMode === 'NON_ROUTINE' ? 'bg-amber-800/60 text-amber-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {nonRoutineCountToday}
                </span>
              </button>
            </div>

            {/* Section & Universe Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Section Filter / Display */}
              {isSuperAdmin ? (
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border text-xs font-semibold outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    borderColor: 'var(--border-main, #cbd5e1)',
                    color: 'var(--text-main, #0f172a)'
                  }}
                >
                  {SECTION_OPTIONS.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <div 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    borderColor: 'var(--border-main, #cbd5e1)',
                    color: 'var(--text-main, #0f172a)'
                  }}
                  title="Seksi Anda otomatis terdeteksi dari profil"
                >
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  <span>Seksi: {userSection}</span>
                </div>
              )}

              {/* PT / Universe Filter */}
              <select
                value={selectedPt}
                onChange={(e) => setSelectedPt(e.target.value)}
                className="px-2.5 py-1 rounded-xl border text-xs font-semibold outline-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  borderColor: 'var(--border-main, #cbd5e1)',
                  color: 'var(--text-main, #0f172a)'
                }}
              >
                <option value="TBP">Universe TBP / GPS</option>
                <option value="GTS">Universe GTS</option>
                <option value="ALL">Semua Universe</option>
              </select>

              {/* Activity / Routine Cadence Filter */}
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="px-2.5 py-1 rounded-xl border text-xs font-semibold outline-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  borderColor: 'var(--border-main, #cbd5e1)',
                  color: 'var(--text-main, #0f172a)'
                }}
              >
                <option value="ALL">Semua Frekuensi</option>
                <option value="Daily">🔁 Daily (Tiap Hari)</option>
                <option value="Weekly">📅 Weekly (D-3)</option>
                <option value="Monthly">🗓️ Monthly (D-7)</option>
                <option value="Quarterly">📊 Quarterly (M-1)</option>
                <option value="Biannual">⏳ Biannual (M-2)</option>
                <option value="Yearly">🎯 Yearly (M-3)</option>
                <option value="Non Routine">⚡ Non Routine</option>
              </select>

              {/* PIC Filter (if tasks available) */}
              {uniquePics.length > 0 && (
                <select
                  value={picFilter}
                  onChange={(e) => setPicFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border text-xs font-semibold outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    borderColor: 'var(--border-main, #cbd5e1)',
                    color: 'var(--text-main, #0f172a)'
                  }}
                >
                  <option value="ALL">Semua PIC ({uniquePics.length})</option>
                  {uniquePics.map(p => (
                    <option key={p.nik} value={p.nik}>{p.name}</option>
                  ))}
                </select>
              )}

              {/* Search Bar */}
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border"
                style={{
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  borderColor: 'var(--border-main, #cbd5e1)'
                }}
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kegiatan / PIC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none text-xs w-28 sm:w-36 font-medium"
                  style={{ color: 'var(--text-main, #0f172a)' }}
                />
              </div>

              {/* Quick Expand / Collapse All Checklists */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={expandAllTasks}
                  className="px-2 py-1 rounded-xl border text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                  title="Buka semua rincian subtask checklist untuk briefing"
                >
                  <ChevronDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span className="hidden sm:inline">Buka Semua</span>
                </button>
                <button
                  type="button"
                  onClick={collapseAllTasks}
                  className="px-2 py-1 rounded-xl border text-[11px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                  style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                  title="Tutup semua rincian subtask checklist"
                >
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                  <span className="hidden sm:inline">Tutup Semua</span>
                </button>
              </div>

              <button
                onClick={fetchTasks}
                className="p-1 rounded-xl border hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                title="Muat ulang data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="w-full px-4 sm:px-8 lg:px-10 py-5 sm:py-6 space-y-6 transition-all duration-300">
        {/* Enterprise KPI Summary Cards */}
        {summaryData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Card 1: Fokus Hari Ini */}
            <div 
              onClick={() => setActiveSection('today')}
              title="Klik untuk menyorot bagian Hari Ini"
              className={`p-4 rounded-2xl border-2 border-t-4 border-t-sky-700 bg-gradient-to-b from-sky-50/60 to-white shadow-xs transition-all cursor-pointer ${
                activeSection === 'today' ? 'border-sky-400 ring-2 ring-sky-400/40 shadow-md scale-[1.01]' : 'border-sky-200 hover:border-sky-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-slate-700">
                  Fokus Hari Ini
                </span>
                <span className="p-2 rounded-xl bg-sky-100 text-sky-800">
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2 text-slate-900">
                {summaryData.totalToday} <span className="text-xs font-bold text-slate-500">kegiatan</span>
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-sky-600" />
                <p className="text-xs text-sky-900 font-bold">
                  {summaryData.openToday} Open • {summaryData.inProgressToday} In Progress
                </p>
              </div>
            </div>

            {/* Card 2: Selesai Hari Ini */}
            <div 
              onClick={() => setActiveSection('today')}
              title="Klik untuk menyorot bagian Hari Ini"
              className={`p-4 rounded-2xl border-2 border-t-4 border-t-teal-700 bg-gradient-to-b from-teal-50/60 to-white shadow-xs transition-all cursor-pointer ${
                activeSection === 'today' ? 'border-teal-400 ring-2 ring-teal-400/40 shadow-md scale-[1.01]' : 'border-teal-200 hover:border-teal-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-slate-700">
                  Selesai Hari Ini
                </span>
                <span className="p-2 rounded-xl bg-teal-100 text-teal-800">
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2 text-teal-800">
                {summaryData.completedToday}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-teal-600" />
                <p className="text-xs text-teal-900 font-bold">
                  Resolved & Closed
                </p>
              </div>
            </div>

            {/* Card 3: Progres Kemarin (H-1) & Carry Over */}
            <div 
              onClick={() => {
                setActiveSection('yesterday');
                setEvalScope('yesterday');
              }}
              title="Klik untuk menyorot capaian progres pekerjaan kemarin"
              className={`p-4 rounded-2xl border-2 border-t-4 border-t-amber-600 bg-gradient-to-b from-amber-50/60 to-white shadow-xs transition-all cursor-pointer ${
                activeSection === 'yesterday' ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-md scale-[1.01]' : 'border-amber-200 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-slate-700">
                  Progres Kemarin (H-1)
                </span>
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-2xl sm:text-3xl font-black text-slate-900">
                  {summaryData?.completedYesterday || 0} / {summaryData?.totalYesterday || 0}
                </p>
                <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  {summaryData?.yesterdayProgressPercent || 0}% Selesai
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                <p className="text-xs text-amber-900 font-bold">
                  {summaryData?.totalCarryOver || 0} total carry-over berjalan
                </p>
              </div>
            </div>

            {/* Card 4: Target Penyelesaian */}
            <div 
              onClick={() => setActiveSection('today')}
              title="Klik untuk menyorot target hari ini"
              className="p-4 rounded-2xl border-2 border-slate-300 border-t-4 border-t-slate-700 bg-gradient-to-b from-slate-100/70 to-white shadow-xs transition-all cursor-pointer hover:border-slate-400"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-slate-700">
                  Target Penyelesaian
                </span>
                <span className="p-2 rounded-xl bg-slate-200 text-slate-800">
                  <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2 text-slate-900">
                {summaryData.totalToday > 0 ? Math.round((summaryData.completedToday / summaryData.totalToday) * 100) : 0}%
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-slate-600" />
                <p className="text-xs text-slate-700 font-bold">
                  Target Kegiatan Seksi
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TWO-COLUMN DUAL VIEW WITH ENTERPRISE INTERACTIVE SECTION HIGHLIGHT        */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* 1. COLUMN KIRI: PROGRES & EVALUASI */}
          <div 
            onClick={() => setActiveSection('yesterday')}
            className={`rounded-3xl p-5 space-y-4 transition-all duration-300 cursor-pointer ${
              activeSection === 'yesterday'
                ? 'border-2 border-amber-500 bg-gradient-to-b from-amber-50/30 via-white to-white shadow-xl ring-4 ring-amber-400/25'
                : 'border-2 border-slate-200 bg-white shadow-xs opacity-70 hover:opacity-100 hover:border-amber-300'
            }`}
          >
            {/* Header Kolom 1 */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-slate-100 pb-4 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-black text-base sm:text-lg flex items-center gap-2 text-slate-900">
                    <span className={`w-3 h-3 rounded-full transition-all ${
                      activeSection === 'yesterday'
                        ? 'bg-amber-500 animate-pulse ring-4 ring-amber-500/30'
                        : 'bg-slate-400'
                    }`} />
                    <span>1. Progres & Evaluasi</span>
                  </h2>

                  {/* Enterprise Active Badge or Focus Indicator */}
                  {activeSection === 'yesterday' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 shadow-xs ring-2 ring-amber-300 animate-in fade-in">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                      Active Focus
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">
                      Klik untuk fokus
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Review pencapaian tugas kemarin, progres checklist subtask, kendala, & status carry-over
                </p>
              </div>

              {/* Scope Switcher: Kemarin (H-1) vs Semua Carry-Over */}
              <div 
                onClick={(e) => e.stopPropagation()} 
                className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto bg-slate-100 p-1 rounded-xl border border-slate-200"
              >
                <button
                  type="button"
                  onClick={() => setEvalScope('yesterday')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    evalScope === 'yesterday'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Tampilkan khusus pekerjaan shift/hari kemarin (H-1)"
                >
                  📅 Kemarin ({yesterdayTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setEvalScope('all_carryover')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    evalScope === 'all_carryover'
                      ? 'bg-slate-800 text-white font-black shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Tampilkan seluruh akumulasi carry-over / backlog dari hari-hari sebelumnya"
                >
                  ⏳ Semua Backlog ({carryOverTasks.length})
                </button>
              </div>
            </div>

            {/* Executive Recap Banner for Management */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className="p-3.5 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 via-orange-50/50 to-white shadow-2xs space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500 text-white">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">
                      Rekap Progress Kemarin ({summaryData?.yesterdayDate ? formatDisplayTargetDate(summaryData.yesterdayDate) : 'H-1'})
                    </h3>
                    <p className="text-[11px] font-semibold text-amber-900/80">
                      Laporan transparan saat manajemen menanyakan progres pekerjaan kemarin
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyYesterdayManagementReport}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
                  title="Salin ringkasan progres kemarin dalam format chat resmi untuk WhatsApp Management"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Laporan Manajemen</span>
                </button>
              </div>

              {/* Progress Bar & Badges */}
              <div className="space-y-1.5 pt-1 border-t border-amber-200/60">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">Tingkat Capaian Kemarin:</span>
                  <span className="text-amber-950 font-black font-mono">
                    {summaryData?.yesterdayProgressPercent || 0}% Tercapai
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-600 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, summaryData?.yesterdayProgressPercent || 0))}%` }}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold pt-1">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                    ✅ {summaryData?.completedYesterday || 0} Selesai
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-300">
                    🔄 {summaryData?.inProgressYesterday || 0} On Progress
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                    ⏳ {summaryData?.pendingYesterday || 0} Carry-Over
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300 font-mono">
                    Total {summaryData?.totalYesterday || 0} Kegiatan
                  </span>
                </div>
              </div>
            </div>

            {/* Task List (Evaluasi & Progres Kemarin) */}
            {displayedYesterdayTasks.length === 0 ? (
              <div className="py-14 text-center border-2 border-dashed border-amber-200 rounded-2xl bg-amber-50/40 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-sm font-bold text-slate-900">
                  Tidak ada tugas dalam kategori ini
                </p>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Belum ada data kegiatan atau progres tugas yang tercatat untuk periode kemarin yang dipilih.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayedYesterdayTasks.map((task) => renderTaskCard(task, true, evalScope === 'yesterday'))}
              </div>
            )}
          </div>

          {/* 2. COLUMN KANAN: PLANNING & ARAHAN HARI INI */}
          <div 
            onClick={() => setActiveSection('today')}
            className={`rounded-3xl p-5 space-y-4 transition-all duration-300 cursor-pointer ${
              activeSection === 'today'
                ? 'border-2 border-teal-500 bg-gradient-to-b from-teal-50/30 via-white to-white shadow-xl ring-4 ring-teal-400/25'
                : 'border-2 border-slate-200 bg-white shadow-xs opacity-70 hover:opacity-100 hover:border-teal-300'
            }`}
          >
            {/* Header Kolom 2 */}
            <div className="flex items-center justify-between border-b-2 border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-black text-base sm:text-lg flex items-center gap-2 text-slate-900">
                    <span className={`w-3 h-3 rounded-full transition-all ${
                      activeSection === 'today'
                        ? 'bg-teal-600 animate-pulse ring-4 ring-teal-600/30'
                        : 'bg-slate-400'
                    }`} />
                    <span>2. Planning & Arahan Hari Ini</span>
                  </h2>

                  {/* Enterprise Active Badge or Focus Indicator */}
                  {activeSection === 'today' ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-700 text-white shadow-xs ring-2 ring-teal-400 animate-in fade-in">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-200 animate-pulse" />
                      Active Focus
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-slate-400">
                      Klik untuk fokus
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-500 mt-1">
                  Penjabaran arahan kerja shift hari ini, penugasan Multi-PIC, target deadline, & checklist eksekusi
                </p>
              </div>

              <div 
                onClick={(e) => e.stopPropagation()} 
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={handleCopyMeetingSummary}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Salin notulensi meeting ke WhatsApp"
                >
                  <Copy className="w-3.5 h-3.5 text-teal-600" />
                  <span>Salin WA</span>
                </button>

                <button
                  onClick={openAssignModal}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
                  title="Tambah arahan kegiatan baru"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Tambah</span>
                </button>
              </div>
            </div>

            {/* Today Task List */}
            {filteredToday.length === 0 ? (
              <div className="py-14 text-center border-2 border-dashed border-teal-200 rounded-2xl bg-teal-50/40 space-y-3">
                <Briefcase className="w-8 h-8 text-teal-600 mx-auto" />
                <p className="text-sm font-bold text-slate-900">
                  Belum ada tugas khusus untuk hari ini
                </p>
                <p className="text-xs text-slate-600 max-w-sm mx-auto">
                  Tambahkan penugasan dan arahan kegiatan shift hari ini agar PIC dapat segera memulai eksekusi.
                </p>
                <button
                  type="button"
                  onClick={openAssignModal}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat Arahan Kegiatan Baru</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredToday.map((task) => renderTaskCard(task, false, false))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN NEW TASK (Mendukung Multi-PIC & PIC Job Pending)             */}
      {/* ========================================================================= */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              borderColor: 'var(--border-main, #cbd5e1)',
              color: 'var(--text-main, #0f172a)'
            }}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Briefcase className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base">Assign Tugas / Arahan Kegiatan Seksi</h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                    Tugaskan kegiatan ke satu atau lebih PIC & otomatis sinkronkan ke dokumen Buletin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAssignTaskSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Quick Template Selector Bar */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent border border-teal-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800 dark:text-teal-200">
                    <Bookmark className="w-3.5 h-3.5 text-teal-600" />
                    <span>Template Tugas Siap Pakai:</span>
                  </div>
                  {newTitle.trim() && (
                    <button
                      type="button"
                      onClick={() => setShowSaveTemplateDialog(true)}
                      className="text-[11px] font-bold text-teal-700 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      <span>Simpan Isian sbg Template</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <select
                    onChange={(e) => {
                      const selected = taskTemplates.find(t => t.id === e.target.value);
                      if (selected) applyTemplate(selected);
                      e.target.value = '';
                    }}
                    defaultValue=""
                    className="flex-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium cursor-pointer outline-none focus:border-teal-500"
                    style={{
                      backgroundColor: 'var(--card-bg, #ffffff)',
                      borderColor: 'var(--border-main, #cbd5e1)'
                    }}
                  >
                    <option value="" disabled>-- Pilih Template Tugas Siap Pakai --</option>
                    {taskTemplates.map(t => (
                      <option key={t.id} value={t.id}>
                        [{t.section}] {t.name}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(true)}
                    className="px-2.5 py-1.5 rounded-xl border text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                  >
                    Kelola
                  </button>
                </div>
              </div>

              {/* Judul Kegiatan */}
              <div className="space-y-1">
                <label className="text-xs font-bold block">Judul Kegiatan / Arahan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kalibrasi Furnace & Pembuatan Reagen Baru..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-medium focus:border-teal-500"
                  style={{
                    backgroundColor: 'var(--input-bg, #f8fafc)',
                    borderColor: 'var(--border-main, #cbd5e1)'
                  }}
                />
              </div>

              {/* Seksi Pelaksana (Auto-Locked ke Seksi User) */}
              <div 
                className="p-3 rounded-2xl border flex items-center justify-between"
                style={{
                  backgroundColor: 'var(--input-bg, #f8fafc)',
                  borderColor: 'var(--border-main, #cbd5e1)'
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                  <span className="text-xs font-bold">Seksi Pelaksana:</span>
                  <span className="text-xs font-extrabold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded-md border border-teal-500/20">
                    {userSection}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 italic">Otomatis terkunci</span>
              </div>

              {/* Pilih PIC Bawahan (Multi-PIC Searchable Select) */}
              <SearchableMultiPicSelect
                selectedNiks={newAssigneeNiks}
                selectedNames={newAssigneeNames}
                onChange={(niks, names) => {
                  setNewAssigneeNiks(niks);
                  setNewAssigneeNames(names);
                }}
                employees={employeesList}
                defaultSection={userSection}
              />

              {/* Toggle Opsi PIC Job Pending */}
              <div className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-3">
                <label className="flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-200 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAssignPending}
                    onChange={(e) => setIsAssignPending(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span>Tandai sebagai PIC Job Pending (Pekerjaan Tertunda / Handover)</span>
                </label>

                {isAssignPending && (
                  <div className="space-y-3 pt-1 border-t border-amber-500/20">
                    <SearchableSinglePicSelect
                      valueNik={newPendingPicNik}
                      valueName={newPendingPicName}
                      onChange={(nik, name) => {
                        setNewPendingPicNik(nik);
                        setNewPendingPicName(name);
                      }}
                      employees={employeesList}
                      label="Pilih PIC Job Pending (Penerima Handover) *"
                    />

                    <div className="space-y-1">
                      <label className="text-xs font-bold block text-slate-700 dark:text-slate-300">
                        Alasan / Kendala Pending *
                      </label>
                      <input
                        type="text"
                        required={isAssignPending}
                        placeholder="Contoh: Menunggu sampel batch sore, spare part reagen belum tiba..."
                        value={newPendingReason}
                        onChange={(e) => setNewPendingReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-medium focus:border-amber-500"
                        style={{
                          backgroundColor: 'var(--input-bg, #f8fafc)',
                          borderColor: 'var(--border-main, #cbd5e1)'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Klasifikasi Kegiatan, Prioritas, Target Tanggal, & Target Jam Selesai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold block">Klasifikasi</label>
                  <select
                    value={newActivityType}
                    onChange={(e) => setNewActivityType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: 'var(--input-bg, #f8fafc)',
                      borderColor: 'var(--border-main, #cbd5e1)'
                    }}
                  >
                    <option value="Daily">🔁 Daily (Muncul Setiap Hari)</option>
                    <option value="Weekly">📅 Weekly (Muncul Mulai D-3)</option>
                    <option value="Monthly">🗓️ Monthly (Muncul Mulai D-7)</option>
                    <option value="Quarterly">📊 Quarterly (Muncul Mulai M-1)</option>
                    <option value="Biannual">⏳ Biannual (Muncul Mulai M-2)</option>
                    <option value="Yearly">🎯 Yearly (Muncul Mulai M-3)</option>
                    <option value="Non Routine">⚡ Non Routine (Penugasan Harian)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold block">Prioritas</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: 'var(--input-bg, #f8fafc)',
                      borderColor: 'var(--border-main, #cbd5e1)'
                    }}
                  >
                    {PRIORITY_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold block text-slate-800 dark:text-slate-200">Tanggal Dimulai</label>
                    <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold">Bisa tgl lampau</span>
                  </div>
                  <input
                    type="date"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-bold cursor-pointer focus:border-teal-500"
                    style={{
                      backgroundColor: 'var(--input-bg, #f8fafc)',
                      borderColor: 'var(--border-main, #cbd5e1)',
                      color: 'var(--text-main, #0f172a)'
                    }}
                  />
                  <p className="text-[10px] text-slate-500">
                    Bisa dipilih tanggal lampau jika project sudah on-going.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold block">Target Selesai (Deadline)</label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-bold cursor-pointer focus:border-teal-500"
                    style={{
                      backgroundColor: 'var(--input-bg, #f8fafc)',
                      borderColor: 'var(--border-main, #cbd5e1)',
                      color: 'var(--text-main, #0f172a)'
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold block">Target Jam (Opsional)</label>
                    <span className="text-[10px] text-teal-700 font-bold">Default: 23:59</span>
                  </div>
                  <input
                    type="time"
                    value={newTargetTime}
                    onChange={(e) => setNewTargetTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-bold cursor-pointer focus:border-teal-500 font-mono"
                    style={{
                      backgroundColor: 'var(--input-bg, #f8fafc)',
                      borderColor: 'var(--border-main, #cbd5e1)',
                      color: 'var(--text-main, #0f172a)'
                    }}
                  />
                  <p className="text-[10px] text-slate-500">
                    Bila kosong: otomatis 23:59.
                  </p>
                </div>
              </div>

              {/* Enterprise WYSIWYG Editor */}
              <div>
                <EnterpriseWysiwygEditor
                  value={newTaskDescription}
                  onChange={setNewTaskDescription}
                  label="Rincian Tugas & Subtask"
                  placeholder="Tulis arahan kegiatan... (Beralih ke 'Checklist Subtask' jika ingin membuat poin-poin ceklis)"
                  allowModeSwitch={true}
                  defaultMode="text"
                  rows={4}
                />
              </div>

              {/* Hubungkan ke Dokumen Buletin (Searchable Combobox) */}
              <SearchableBulletinSelect
                selectedId={selectedBulletinPostId}
                bulletinList={bulletinList}
                onSelect={setSelectedBulletinPostId}
              />

              {/* Modal Buttons */}
              <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Menugaskan...' : 'Tugaskan & Terbitkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KONFIRMASI HAPUS KEGIATAN & SINKRONISASI BULETIN                   */}
      {/* ========================================================================= */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-100"
            style={{ 
              backgroundColor: 'var(--card-bg, #ffffff)', 
              borderColor: 'var(--border-main, #e2e8f0)',
              color: 'var(--text-main, #0f172a)'
            }}
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-base">Hapus Kegiatan Log Book?</h3>
                <p className="text-xs text-slate-500">Tindakan ini permanen dan akan menghapus kegiatan dari log book</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
              <p className="font-bold text-slate-900 dark:text-slate-100">{taskToDelete.title}</p>
              <p className="text-slate-500">
                Seksi: <strong className="text-slate-700 dark:text-slate-300">{taskToDelete.section}</strong> • PIC: <strong className="text-slate-700 dark:text-slate-300">{taskToDelete.assigneeName}</strong>
              </p>
              {taskToDelete.bulletinPostId && (
                <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 font-semibold flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>Baris kegiatan pada Dokumen Buletin #{taskToDelete.bulletinPostId} juga akan otomatis terhapus secara tersinkronisasi.</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTask(taskToDelete)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Menghapus...' : 'Hapus Kegiatan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SET / UBAH PIC JOB PENDING                                        */}
      {/* ========================================================================= */}
      {pendingModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-100"
            style={{ 
              backgroundColor: 'var(--card-bg, #ffffff)', 
              borderColor: 'var(--border-main, #e2e8f0)',
              color: 'var(--text-main, #0f172a)'
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 shrink-0">
                  <Clock className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base">Atur PIC Job Pending</h3>
                  <p className="text-xs text-slate-500">Tetapkan penerima handover pekerjaan tertunda</p>
                </div>
              </div>
              <button 
                onClick={() => setPendingModalTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 text-xs">
              <p className="font-bold text-slate-900 dark:text-slate-100">{pendingModalTask.title}</p>
              <p className="text-slate-500 mt-0.5">PIC Saat Ini: {pendingModalTask.assigneeName}</p>
            </div>

            <form onSubmit={handleSaveJobPending} className="space-y-3.5">
              <SearchableSinglePicSelect
                valueNik={modalPendingPicNik}
                valueName={modalPendingPicName}
                onChange={(nik, name) => {
                  setModalPendingPicNik(nik);
                  setModalPendingPicName(name);
                }}
                employees={employeesList}
                label="Pilih PIC Job Pending (Penerima Handover) *"
              />

              <div className="space-y-1">
                <label className="text-xs font-bold block">Alasan / Kendala Job Pending *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: Menunggu sampel batch sore, spare part reagen belum tiba, dialihkan ke shift berikutnya..."
                  value={modalPendingReason}
                  onChange={(e) => setModalPendingReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-medium focus:border-amber-500"
                  style={{
                    backgroundColor: 'var(--input-bg, #f8fafc)',
                    borderColor: 'var(--border-main, #cbd5e1)'
                  }}
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
                {pendingModalTask.isPending ? (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        toast.loading('Mencabut status pending...', { id: 'clear-pending' });
                        await fetch(`/api/logbook/tasks/${pendingModalTask.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            status: 'In Progress',
                            isPending: false,
                            pendingPicNik: null,
                            pendingPicName: null,
                            pendingReason: null,
                            updaterNik: inspectorNik
                          })
                        });
                        toast.success('Status Job Pending dicabut, kembali In Progress', { id: 'clear-pending' });
                        setPendingModalTask(null);
                        fetchTasks();
                      } catch (e: any) {
                        toast.error('Gagal mencabut pending');
                      }
                    }}
                    className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer"
                  >
                    Lepas Status Pending
                  </button>
                ) : <span />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingModalTask(null)}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPending}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {isSavingPending ? 'Menyimpan...' : 'Simpan Job Pending'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT TASK & DRAFT PERUBAHAN (ROLE-BASED PERMISSION)              */}
      {/* ========================================================================= */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              borderColor: 'var(--border-main, #cbd5e1)',
              color: 'var(--text-main, #0f172a)'
            }}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Edit3 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <span>
                      {(editingTask.assignedByNik === inspectorNik || isSupervisor)
                        ? 'Edit & Penyesuaian Tugas'
                        : 'Ajukan Draft Perubahan Tugas'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-teal-100 text-teal-800 border border-teal-300">
                      {(editingTask.assignedByNik === inspectorNik || isSupervisor) ? 'Pemberi Tugas' : 'Role: PIC'}
                    </span>
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                    {(editingTask.assignedByNik === inspectorNik || isSupervisor)
                      ? 'Perubahan akan langsung diperbarui dan disinkronkan ke dokumen Buletin'
                      : 'Perubahan akan disimpan sebagai draft dan dikirim ke pemberi tugas untuk di-review & approve'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* If PIC: notice banner */}
              {!(editingTask.assignedByNik === inspectorNik || isSupervisor) && (
                <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Mode Pengajuan PIC (Draft Perubahan):</p>
                    <p className="text-slate-600 text-[11px]">
                      Sebagai PIC, Anda dapat menyesuaikan rincian, checklist, atau target. Draft penyesuaian akan dikirim untuk direview dan disetujui dengan 1-klik approval.
                    </p>
                  </div>
                </div>
              )}

              {/* Judul Kegiatan */}
              <div className="space-y-1">
                <label className="text-xs font-bold block">Judul Kegiatan / Arahan *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-medium focus:border-teal-500"
                  style={{
                    backgroundColor: 'var(--input-bg, #f8fafc)',
                    borderColor: 'var(--border-main, #cbd5e1)'
                  }}
                />
              </div>

              {/* PIC Selection: editable if creator, read-only if PIC */}
              {(editingTask.assignedByNik === inspectorNik || isSupervisor) ? (
                <SearchableMultiPicSelect
                  selectedNiks={String(editAssigneeNik || '').split(',').map(s => s.trim()).filter(Boolean)}
                  selectedNames={String(editAssigneeName || '').split(',').map(s => s.trim()).filter(Boolean)}
                  onChange={(niks, names) => {
                    setEditAssigneeNik(niks.join(', '));
                    setEditAssigneeName(names.join(', '));
                  }}
                  employees={employeesList}
                  label="PIC Pelaksana (Dapat Memilih Lebih Dari 1 Personil) *"
                />
              ) : (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block">PIC Pelaksana Saat Ini:</span>
                  <span className="font-extrabold text-teal-800">{editAssigneeName || '-'}</span>
                </div>
              )}

              {/* Klasifikasi, Prioritas & Target Selesai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold block">Klasifikasi</label>
                  <select
                    value={editActivityType}
                    onChange={(e) => setEditActivityType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-bold cursor-pointer focus:border-teal-500"
                    style={{
                      backgroundColor: 'var(--input-bg, #f8fafc)',
                      borderColor: 'var(--border-main, #cbd5e1)',
                      color: 'var(--text-main, #0f172a)'
                    }}
                  >
                    <option value="Daily">🔁 Daily (Muncul Setiap Hari)</option>
                    <option value="Weekly">📅 Weekly (Muncul Mulai D-3)</option>
                    <option value="Monthly">🗓️ Monthly (Muncul Mulai D-7)</option>
                    <option value="Quarterly">📊 Quarterly (Muncul Mulai M-1)</option>
                    <option value="Biannual">⏳ Biannual (Muncul Mulai M-2)</option>
                    <option value="Yearly">🎯 Yearly (Muncul Mulai M-3)</option>
                    <option value="Non Routine">⚡ Non Routine (Penugasan Harian)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold block">Prioritas</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-bold cursor-pointer focus:border-teal-500"
                    style={{
                      backgroundColor: 'var(--input-bg, #f8fafc)',
                      borderColor: 'var(--border-main, #cbd5e1)',
                      color: 'var(--text-main, #0f172a)'
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold block text-slate-800 dark:text-slate-200">Tanggal Dimulai</label>
                    <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold">Bisa tgl lampau</span>
                  </div>
                  <input
                    type="date"
                    value={editTaskDate}
                    onChange={(e) => setEditTaskDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-bold cursor-pointer focus:border-teal-500"
                    style={{
                      backgroundColor: 'var(--input-bg, #f8fafc)',
                      borderColor: 'var(--border-main, #cbd5e1)',
                      color: 'var(--text-main, #0f172a)'
                    }}
                  />
                  <p className="text-[10px] text-slate-500">
                    Ubah tgl mulai jika project sudah on-going sejak lampau.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold block">Target Tanggal Selesai</label>
                  <input
                    type="date"
                    value={editTargetDate}
                    onChange={(e) => setEditTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-bold cursor-pointer focus:border-teal-500"
                    style={{
                      backgroundColor: 'var(--input-bg, #f8fafc)',
                      borderColor: 'var(--border-main, #cbd5e1)',
                      color: 'var(--text-main, #0f172a)'
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold block">Target Jam</label>
                    <span className="text-[10px] text-teal-700 font-bold">Default: 23:59</span>
                  </div>
                  <input
                    type="time"
                    value={editTargetTime}
                    onChange={(e) => setEditTargetTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-bold cursor-pointer focus:border-teal-500 font-mono"
                    style={{
                      backgroundColor: 'var(--input-bg, #f8fafc)',
                      borderColor: 'var(--border-main, #cbd5e1)',
                      color: 'var(--text-main, #0f172a)'
                    }}
                  />
                </div>
              </div>

              {/* Enterprise WYSIWYG Editor with Drag & Drop Checklist */}
              <div>
                <EnterpriseWysiwygEditor
                  value={editDescription}
                  onChange={setEditDescription}
                  label="Rincian Tugas & Checklist Subtask (Drag & drop untuk urutan)"
                  placeholder="Sesuaikan petunjuk kerja atau urutan checklist..."
                  allowModeSwitch={true}
                  defaultMode={(editDescription || '').includes('- [') ? 'checklist' : 'text'}
                  rows={4}
                />
              </div>

              {/* Hubungkan / Pindahkan Sinkronisasi ke Buletin */}
              <div className="space-y-1">
                <SearchableBulletinSelect
                  selectedId={editBulletinPostId}
                  bulletinList={bulletinList}
                  onSelect={setEditBulletinPostId}
                />
                <p className="text-[10px] text-slate-500">
                  {editingTask.bulletinPostId 
                    ? `Saat ini terhubung ke Buletin #${editingTask.bulletinPostId}. Anda dapat memindahkan atau melepaskan tautan sinkronisasi.` 
                    : 'Tugas ini belum terkoneksi ke Buletin. Pilih dokumen buletin jika ingin menyinkronkan tugas ini.'}
                </p>
              </div>

              {/* If PIC: Required Alasan Perubahan */}
              {!(editingTask.assignedByNik === inspectorNik || isSupervisor) && (
                <div className="space-y-1">
                  <label className="text-xs font-bold block text-amber-900">
                    Alasan / Keterangan Penyesuaian (Wajib untuk Pemberi Tugas) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Perubahan sampel batch, reagen kalibrasi diganti, jadwal diundur 1 jam..."
                    value={editChangeReason}
                    onChange={(e) => setEditChangeReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-amber-300 outline-none text-xs font-medium focus:border-amber-500 bg-amber-50/50"
                  />
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit
                    ? 'Menyimpan...'
                    : (editingTask.assignedByNik === inspectorNik || isSupervisor)
                    ? 'Simpan Perubahan Langsung'
                    : 'Ajukan Draft Perubahan ke Pemberi Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: REVIEW DRAFT PERUBAHAN (UNTUK PEMBERI TUGAS / ATASAN)             */}
      {/* ========================================================================= */}
      {reviewingTask && (() => {
        let draftObj: any = null;
        try {
          draftObj = typeof reviewingTask.draftChange === 'string' ? JSON.parse(reviewingTask.draftChange) : reviewingTask.draftChange;
        } catch (e) {
          draftObj = null;
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div 
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #cbd5e1)',
                color: 'var(--text-main, #0f172a)'
              }}
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b flex items-center justify-between bg-amber-50/70" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-amber-500 text-white">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-black text-base text-amber-950 flex items-center gap-2">
                      <span>Review Pengajuan Draft Perubahan</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-200 text-amber-900 border border-amber-400">
                        Persetujuan Atasan
                      </span>
                    </h3>
                    <p className="text-[11px] text-amber-800">
                      Diajukan oleh: <strong>{draftObj?.proposedByName || 'PIC'}</strong>
                      {draftObj?.proposedAt && ` • ${formatDateDisplay(draftObj.proposedAt)}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewingTask(null)}
                  className="p-1.5 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-amber-900" />
                </button>
              </div>

              {/* Body Comparison */}
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                {/* Alasan Perubahan */}
                <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                    Alasan / Keterangan Penyesuaian oleh PIC:
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-amber-950">
                    "{draftObj?.changeReason || 'Tidak ada catatan tambahan'}"
                  </p>
                </div>

                {/* Perbandingan Data: Saat Ini vs Draft Baru */}
                <div className="space-y-3">
                  <h4 className="font-black text-xs uppercase tracking-wider text-slate-500">
                    Rincian Perbandingan (Sebelum vs Sesudah):
                  </h4>

                  {/* Judul Perbandingan */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 block mb-1">Judul Saat Ini:</span>
                      <p className="font-bold text-slate-800">{reviewingTask.title}</p>
                    </div>
                    <div className={`p-3 rounded-xl border ${
                      draftObj?.title !== reviewingTask.title
                        ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-300/40'
                        : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className="text-[10px] font-bold text-emerald-800 block mb-1">
                        Judul Diajukan: {draftObj?.title !== reviewingTask.title && '(Berubah)'}
                      </span>
                      <p className="font-bold text-emerald-950">{draftObj?.title || reviewingTask.title}</p>
                    </div>
                  </div>

                  {/* Prioritas & Target Perbandingan */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 block">Target & Prioritas Saat Ini:</span>
                      <p className="font-semibold text-slate-800">
                        {reviewingTask.priority} • Target: {reviewingTask.targetDate} ({reviewingTask.targetTime || '23:59'})
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-800 block">Target & Prioritas Diajukan:</span>
                      <p className="font-bold text-emerald-950">
                        {draftObj?.priority || reviewingTask.priority} • Target: {draftObj?.targetDate || reviewingTask.targetDate} ({draftObj?.targetTime || reviewingTask.targetTime || '23:59'})
                      </p>
                    </div>
                  </div>

                  {/* Keterangan & Checklist Perbandingan */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-slate-500 block">Perubahan Keterangan / Checklist:</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 max-h-[220px] overflow-y-auto">
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">Versi Saat Ini:</span>
                        <div 
                          className="text-xs leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: markdownToVisualHtml(reviewingTask.description) }}
                        />
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 max-h-[220px] overflow-y-auto">
                        <span className="text-[10px] font-bold text-emerald-800 block mb-1">Versi Draft Diajukan:</span>
                        <div 
                          className="text-xs leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: markdownToVisualHtml(draftObj?.description) }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Catatan Penolakan (Opsional jika ingin menolak) */}
                <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
                  <label className="text-[11px] font-bold block text-slate-700">
                    Catatan Penolakan (Hanya diisi jika menolak draft):
                  </label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Contoh: Tolong pertahankan target jam 15:00 karena ada inspeksi sore..."
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs focus:border-rose-400 bg-slate-50"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 sm:p-5 border-t flex flex-wrap items-center justify-between gap-2" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
                <button
                  type="button"
                  onClick={() => setReviewingTask(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                >
                  Tutup
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmittingReview}
                    onClick={() => handleReviewDraft('reject')}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingReview ? 'Memproses...' : '❌ Tolak Draft'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingReview}
                    onClick={() => handleReviewDraft('approve')}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{isSubmittingReview ? 'Memproses...' : '✅ Setujui & Terapkan Perubahan'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* ========================================================================= */}
      {/* MODAL: KELOLA & PILIH TEMPLATE TUGAS LOG BOOK                            */}
      {/* ========================================================================= */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 flex flex-col max-h-[85vh]"
            style={{ 
              backgroundColor: 'var(--card-bg, #ffffff)', 
              borderColor: 'var(--border-main, #e2e8f0)',
              color: 'var(--text-main, #0f172a)'
            }}
          >
            {/* Modal Header */}
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center">
                  <Bookmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Daftar Template Tugas Log Book</h3>
                  <p className="text-[11px] text-slate-500">Pilih template untuk langsung mengisi arahan tugas secara instan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Section */}
            <div className="p-3 border-b flex items-center justify-between gap-2 flex-wrap" style={{ borderColor: 'var(--border-main, #e2e8f0)', backgroundColor: 'var(--input-bg, #f8fafc)' }}>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {['Semua Seksi', 'Laboratory', 'Preparation', 'Inventory Control', 'Quality Control (QA)'].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setTemplateFilterSection(sec)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      templateFilterSection === sec
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-white border text-slate-600 hover:bg-slate-50'
                    }`}
                    style={{ borderColor: templateFilterSection === sec ? undefined : 'var(--border-main, #cbd5e1)' }}
                  >
                    {sec}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowTemplateModal(false);
                  openAssignModal();
                }}
                className="text-xs font-bold text-teal-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Buat Template Baru</span>
              </button>
            </div>

            {/* Template List Cards */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {taskTemplates
                .filter(t => templateFilterSection === 'Semua Seksi' || t.section === templateFilterSection || t.section === 'Semua Seksi')
                .map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-3.5 rounded-xl border hover:border-teal-500/70 transition-all space-y-2 bg-white shadow-2xs group"
                    style={{ borderColor: 'var(--border-main, #e2e8f0)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200">
                            {tmpl.section}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                            tmpl.priority === 'High' ? 'bg-rose-50 text-rose-700' : (tmpl.priority === 'Urgent' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-700')
                          }`}>
                            {tmpl.priority}
                          </span>
                          {tmpl.targetTime && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              Jam: {tmpl.targetTime}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-teal-700 transition-colors">
                          {tmpl.name}
                        </h4>
                        <p className="text-xs text-slate-600 line-clamp-1 mt-0.5 font-medium">
                          {tmpl.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!tmpl.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(tmpl.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus template kustom ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            applyTemplate(tmpl);
                            setShowTemplateModal(false);
                            setShowAssignModal(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                        >
                          <span>Pakai Template</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {tmpl.description && (
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-mono whitespace-pre-wrap line-clamp-3">
                        {tmpl.description}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SIMPAN SEBAGAI TEMPLATE BARU                                       */}
      {/* ========================================================================= */}
      {showSaveTemplateDialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-100">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border shadow-2xl p-4 space-y-3"
            style={{ 
              backgroundColor: 'var(--card-bg, #ffffff)', 
              borderColor: 'var(--border-main, #e2e8f0)',
              color: 'var(--text-main, #0f172a)'
            }}
          >
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-teal-600" />
              <h4 className="font-bold text-sm">Simpan sebagai Template</h4>
            </div>
            <p className="text-xs text-slate-500">
              Beri nama template untuk arahan kegiatan ini agar dapat digunakan kembali di kemudian hari.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold block">Nama Template *</label>
              <input
                type="text"
                autoFocus
                placeholder="Contoh: Kalibrasi Flame AAS Pagi"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none focus:border-teal-500"
                style={{
                  backgroundColor: 'var(--input-bg, #f8fafc)',
                  borderColor: 'var(--border-main, #cbd5e1)'
                }}
              />
            </div>

            <div className="pt-2 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
              <button
                type="button"
                onClick={() => {
                  setShowSaveTemplateDialog(false);
                  setNewTemplateName('');
                }}
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveAsTemplate(newTemplateName)}
                className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs cursor-pointer"
              >
                Simpan Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: KETERANGAN TAMBAHAN SUBTASK (ICON !)                              */}
      {/* ========================================================================= */}
      {subtaskNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150"
            style={{ 
              backgroundColor: 'var(--card-bg, #ffffff)', 
              borderColor: 'var(--border-main, #e2e8f0)',
              color: 'var(--text-main, #0f172a)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">Catatan Subtask ({subtaskNoteModal.notes.length})</h4>
                  <p className="text-[11px] text-teal-700 font-bold">
                    {subtaskNoteModal.isReadOnly ? 'Mode Baca Saja (Laporan Kemarin)' : '✨ Urutan catatan terbaru tampil di paling atas'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSubtaskNoteModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subtask Context */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Item Subtask:</span>
              <p className="text-xs font-semibold text-slate-800 line-clamp-3">
                {subtaskNoteModal.itemText}
              </p>
            </div>

            {/* Existing Notes List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold block text-slate-700">Daftar Catatan Tersimpan:</label>
                <span className="text-[10px] text-slate-400 font-medium italic">Terbaru di atas</span>
              </div>
              {subtaskNoteModal.notes.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 border border-dashed rounded-xl bg-slate-50">
                  Belum ada catatan untuk subtask ini.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {[...subtaskNoteModal.notes]
                    .sort((a, b) => (`${b.date || ''} ${b.time || ''}`).localeCompare(`${a.date || ''} ${a.time || ''}`))
                    .map((note) => (
                    <div 
                      key={note.id} 
                      className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-1 flex items-start justify-between gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono font-bold">
                          {note.author && <span className="text-teal-700">{note.author}</span>}
                          <span>📅 {note.date}{note.time ? ` ⏰ ${note.time}` : ''}</span>
                        </div>
                        <p className="text-xs text-slate-800 font-medium whitespace-pre-wrap leading-relaxed mt-0.5">
                          {note.text}
                        </p>
                      </div>
                      {!subtaskNoteModal.isReadOnly && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSubtaskNote(note.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                          title="Hapus catatan ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Note Section (If not read-only) */}
            {!subtaskNoteModal.isReadOnly && (
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold block text-slate-700">Tambah Catatan Baru:</label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {newSubtaskNoteInput.length}/300
                  </span>
                </div>
                <textarea
                  rows={2}
                  maxLength={300}
                  placeholder="Ketik catatan progres atau kendala baru..."
                  value={newSubtaskNoteInput}
                  onChange={(e) => setNewSubtaskNoteInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none focus:border-teal-500 transition-colors resize-none leading-relaxed"
                  style={{
                    backgroundColor: 'var(--input-bg, #f8fafc)',
                    borderColor: 'var(--border-main, #cbd5e1)'
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] text-teal-700 font-medium">
                    ✨ Tiap catatan memiliki time tag dan tercatat sebagai progres kegiatan.
                  </p>
                  <button
                    type="button"
                    disabled={isSavingSubtaskNote || !newSubtaskNoteInput.trim()}
                    onClick={handleAddSubtaskNote}
                    className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shrink-0"
                  >
                    {isSavingSubtaskNote ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>Tambah Catatan</span>
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-2 border-t flex items-center justify-end" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
              <button
                type="button"
                onClick={() => setSubtaskNoteModal(null)}
                className="px-4 py-1.5 rounded-xl border text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Routine Task Completed -> Rollover Confirmation */}
      {routineCompletionModal && (
        <div 
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setRoutineCompletionModal(null)}
        >
          <div 
            className="w-full max-w-lg bg-white dark:bg-slate-900 border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b flex items-center justify-between bg-teal-50 dark:bg-teal-950/40" style={{ borderColor: 'var(--border-main, #cbd5e1)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                    <span>Routine Task Selesai!</span>
                    <span className="text-sm">🎉</span>
                  </h3>
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                    Semua subtask telah 100% selesai dikerjakan
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setRoutineCompletionModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/30 space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 tracking-wider block">
                  Tugas Rutin Selesai
                </span>
                <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                  {routineCompletionModal.task.title}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-teal-200">
                  <span>Klasifikasi: <strong>{routineCompletionModal.task.activityType || 'Routine'}</strong></span>
                  <span>•</span>
                  <span>Target Selesai: <strong>{routineCompletionModal.task.targetDate || selectedDate}</strong></span>
                </div>
              </div>

              <div className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                Apakah Anda ingin membuat kembali task routine ini untuk periode selanjutnya?
              </div>

              {/* Next Period Preview Card */}
              <div className="p-3.5 rounded-2xl border bg-slate-50 dark:bg-slate-800/60 space-y-2" style={{ borderColor: 'var(--border-main, #cbd5e1)' }}>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                  Rencana Periode Baru
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Periode / Sub-Topik:</span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">
                      {routineCompletionModal.nextPeriod}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Target Selesai Default:</span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-300 text-sm">
                      {routineCompletionModal.nextTargetDate}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t text-[11px] text-slate-500 space-y-1" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
                  <div>✓ Daftar subtask akan diduplikasi dengan status belum dicentang (0%)</div>
                  <div>✓ Target selesai disesuaikan otomatis untuk periode berikutnya</div>
                  <div>✓ Status awal otomatis menjadi [Open]</div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t flex items-center justify-end gap-2.5 bg-slate-50 dark:bg-slate-900/60" style={{ borderColor: 'var(--border-main, #cbd5e1)' }}>
              <button
                type="button"
                onClick={() => setRoutineCompletionModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
              >
                Tidak, Selesai
              </button>
              <button
                type="button"
                onClick={handleConfirmLogbookNextPeriod}
                className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-900/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ya, Buka Periode {routineCompletionModal.nextPeriod}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
