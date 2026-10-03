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
  MessageSquare,
  Table as TableIcon,
  Kanban,
  LayoutList,
  ZoomIn,
  ZoomOut,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  Sun,
  Moon
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
import { SharedSubtaskManager } from './notion/SharedSubtaskManager';
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
  plannedDate?: string | null;
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
        className="min-h-10 w-full p-1.5 rounded-xl border-2 flex flex-wrap items-center gap-1.5 cursor-text transition-all bg-white border-slate-400 focus-within:border-teal-500 shadow-2xs"
      >
        {safeNiks.map((nik, idx) => (
          <span 
            key={nik}
            className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-teal-100 border border-teal-300 text-teal-950 text-xs font-black animate-in fade-in zoom-in-95 duration-100 shadow-2xs"
          >
            <div className="w-4 h-4 rounded-full bg-teal-700 text-white flex items-center justify-center text-[9px] font-black">
              {((safeNames[idx] || nik || 'P')).charAt(0).toUpperCase()}
            </div>
            <span className="truncate max-w-[130px]">{safeNames[idx] || nik}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removePic(nik);
              }}
              className="p-0.5 rounded hover:bg-teal-200 text-teal-800 transition-colors"
              title="Hapus PIC"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <div className="flex-1 min-w-[140px] flex items-center gap-1.5 px-1.5">
          <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
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
            className="w-full bg-transparent outline-none text-xs font-bold text-black placeholder:text-slate-500 py-1"
          />
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div 
          className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border-2 shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-200 animate-in fade-in zoom-in-95 duration-150 bg-white border-slate-300"
        >
          {filteredEmployees.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-600 font-bold italic">
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
                  className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors hover:bg-teal-50 ${
                    isSelected ? 'bg-teal-100/60' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-xs text-black truncate flex items-center gap-1.5">
                      <span>{emp.name}</span>
                      {isSelected && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-black bg-teal-700 text-white">
                          Dipilih
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-bold text-slate-600 flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono">NIK: {emp.nik}</span>
                      <span>•</span>
                      <span className="truncate">{emp.section || emp.department || emp.jabatan || 'Personil'}</span>
                    </div>
                  </div>
                  {isSelected ? (
                    <Check className="w-4 h-4 text-teal-700 shrink-0" />
                  ) : (
                    <Plus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
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
          className="w-full flex items-center justify-between p-2.5 rounded-xl border-2 transition-all cursor-pointer hover:border-amber-500/80 group bg-white border-slate-400 shadow-2xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-950 font-black flex items-center justify-center text-xs shrink-0 border border-amber-300">
              {(valueName || 'P').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-black text-xs truncate text-black group-hover:text-amber-700 transition-colors">
                {valueName}
              </div>
              <div className="text-[10px] text-slate-600 font-mono font-bold">
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
            className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-black transition-colors"
            title="Ganti PIC"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-500 pointer-events-none" />
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
              className="w-full pl-8 pr-8 py-2 rounded-xl border-2 outline-none text-xs font-bold text-black focus:border-amber-500 transition-all bg-white border-slate-400 placeholder:text-slate-500 shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 p-0.5 rounded text-slate-500 hover:text-black"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isOpen && (
            <div 
              className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border-2 shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-200 animate-in fade-in zoom-in-95 duration-150 bg-white border-slate-300"
            >
              {filteredEmployees.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-600 font-bold italic">
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
                      className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors hover:bg-amber-50 ${
                        isSelected ? 'bg-amber-100/60' : ''
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-xs text-black truncate">
                          {emp.name}
                        </div>
                        <div className="text-[10px] text-slate-600 font-bold flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono">NIK: {emp.nik}</span>
                          <span>•</span>
                          <span className="truncate">{emp.section || emp.department || emp.jabatan || 'Personil'}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-amber-700 shrink-0" />
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
          className="w-full flex items-center justify-between p-2.5 rounded-xl border-2 transition-all cursor-pointer hover:border-teal-500/80 group bg-white border-slate-400 shadow-2xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[10px] px-2 py-0.5 rounded-md font-mono font-black bg-teal-100 text-teal-950 border border-teal-300 shrink-0">
              #{selectedPost.id}
            </span>
            <div className="min-w-0">
              <div className="font-black text-xs truncate text-black group-hover:text-teal-700 transition-colors">
                {selectedPost.title || selectedPost.category}
              </div>
              <div className="text-[10px] text-slate-600 font-bold truncate">
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
            className="p-1 rounded-md hover:bg-slate-200 text-slate-500 hover:text-black transition-colors"
            title="Lepas tautan buletin"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-slate-500 pointer-events-none" />
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
              className="w-full pl-8 pr-8 py-2 rounded-xl border-2 outline-none text-xs font-bold text-black focus:border-teal-500 transition-all bg-white border-slate-400 placeholder:text-slate-500 shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 p-0.5 rounded text-slate-500 hover:text-black"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isOpen && (
            <div 
              className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border-2 shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-200 animate-in fade-in zoom-in-95 duration-150 bg-white border-slate-300"
            >
              <div
                onClick={() => {
                  onSelect('');
                  setIsOpen(false);
                }}
                className="p-2.5 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <span>-- Simpan di Log Book Saja (Tanpa Buletin) --</span>
                {!selectedId && <Check className="w-4 h-4 text-teal-700 shrink-0" />}
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
                    className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors hover:bg-teal-50 ${
                      isSelected ? 'bg-teal-100/60' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-slate-200 text-slate-800">
                          #{b.id}
                        </span>
                        <span className="font-black text-xs text-black truncate">
                          {b.title || b.category}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-600 font-bold mt-0.5">
                        {b.department || 'General'} • Universe {b.pt || 'TBP'}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-teal-700 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <p className="text-[10px] font-bold text-slate-600">
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
  const [selectedSection, setSelectedSection] = useState<string>(() => {
    if (isMeetingRoom || userSection === 'ALL') return 'Semua Seksi';
    return userSection;
  });
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
        color: 'bg-slate-100 text-slate-950 border-slate-300 font-black',
        windowDesc: 'Harian (Ad-hoc)',
        dDayText: null
      };
    }

    let cadence = task.activityType || 'Daily';
    const cActLower = (task.activityType || '').toLowerCase().trim();
    if (cActLower.includes('monthly') || cActLower.includes('bulanan')) {
      cadence = 'Monthly';
    } else if (cActLower.includes('weekly') || cActLower.includes('mingguan')) {
      cadence = 'Weekly';
    } else if (cActLower.includes('daily') || cActLower.includes('harian')) {
      cadence = 'Daily';
    } else if (cActLower.includes('quarterly') || cActLower.includes('triwulan')) {
      cadence = 'Quarterly';
    } else if (cActLower.includes('biannual') || cActLower.includes('semester')) {
      cadence = 'Biannual';
    } else if (cActLower.includes('yearly') || cActLower.includes('annual') || cActLower.includes('tahunan')) {
      cadence = 'Yearly';
    } else if (cadence.toLowerCase() === 'routine' || !cadence) {
      const bTitle = (task.bulletinTopicTitle || '').toLowerCase();
      const tTitle = (task.title || '').toLowerCase();
      const combined = `${bTitle} ${tTitle}`;
      if (combined.includes('monthly') || combined.includes('bulanan')) cadence = 'Monthly';
      else if (combined.includes('weekly') || combined.includes('mingguan')) cadence = 'Weekly';
      else if (combined.includes('quarterly') || combined.includes('triwulan')) cadence = 'Quarterly';
      else if (combined.includes('biannual') || combined.includes('semester')) cadence = 'Biannual';
      else if (combined.includes('yearly') || combined.includes('annual') || combined.includes('tahunan')) cadence = 'Yearly';
      else cadence = 'Daily';
    }

    const cLower = cadence.toLowerCase();
    let label = '🔁 Routine';
    let color = 'bg-teal-100 text-teal-950 border-teal-400 font-black';
    let windowDesc = 'Harian';

    if (cLower.includes('daily')) {
      label = '🔁 Daily';
      color = 'bg-teal-100 text-teal-950 border-teal-400 font-black';
      windowDesc = 'Muncul Tiap Hari';
    } else if (cLower.includes('weekly')) {
      label = '📅 Weekly';
      color = 'bg-blue-100 text-blue-950 border-blue-400 font-black';
      windowDesc = 'Muncul Mulai D-3';
    } else if (cLower.includes('monthly')) {
      label = '🗓️ Monthly';
      color = 'bg-indigo-100 text-indigo-950 border-indigo-400 font-black';
      windowDesc = 'Muncul Mulai D-7';
    } else if (cLower.includes('quarterly')) {
      label = '📊 Quarterly';
      color = 'bg-purple-100 text-purple-950 border-purple-400 font-black';
      windowDesc = 'Muncul Mulai M-1';
    } else if (cLower.includes('biannual')) {
      label = '⏳ Biannual';
      color = 'bg-amber-100 text-amber-950 border-amber-400 font-black';
      windowDesc = 'Muncul Mulai M-2';
    } else if (cLower.includes('yearly')) {
      label = '🎯 Yearly';
      color = 'bg-rose-100 text-rose-950 border-rose-400 font-black';
      windowDesc = 'Muncul Mulai M-3';
    }

    return {
      isRoutine: true,
      cadence,
      label,
      color,
      windowDesc
    };
  };

  // Helper to calculate start date and elapsed duration of a project/task for management
  const getTaskDurationInfo = (task: LogbookTask, referenceDateStr?: string) => {
    const startStr = task.taskDate || (task.createdAt ? task.createdAt.split('T')[0] : getTodayStr());
    const refStr = referenceDateStr || selectedDate || getTodayStr();

    const isDone = task.status === 'Resolved' || task.status === 'Done' || task.status === 'Closed';
    let endStr = refStr;
    if (isDone) {
      if (task.actualCompletedDate) {
        try {
          const d = new Date(task.actualCompletedDate);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            endStr = `${year}-${month}-${day}`;
          }
        } catch (e) {
          endStr = refStr;
        }
      } else {
        // Fallback: check subtask checkedDate
        const parsed = parseTasklist(task.description || '');
        if (parsed.items.length > 0) {
          const dates = parsed.items.map(i => i.checkedDate).filter((d): d is string => Boolean(d)).sort();
          if (dates.length > 0) {
            endStr = dates[dates.length - 1];
          }
        }
      }
    }

    const parseCalendarDate = (str: string) => {
      const parts = str.split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
      return new Date(str);
    };

    const startDate = parseCalendarDate(startStr);
    const endDate = parseCalendarDate(endStr);
    const diffTime = endDate.getTime() - startDate.getTime();
    const rawDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const dayCount = Math.max(1, rawDays + 1);

    let durationLabel = '';
    let durationShort = '';
    let badgeClass = 'bg-teal-100 text-teal-950 border-teal-300 font-bold';

    if (isDone) {
      if (rawDays <= 0) {
        durationLabel = 'Selesai di Hari yang Sama';
        durationShort = '1 Hari';
      } else {
        durationLabel = `Tuntas dalam ${dayCount} Hari`;
        durationShort = `${dayCount} Hari`;
      }
      badgeClass = 'bg-emerald-100 text-emerald-950 border-emerald-400 font-black';
    } else {
      if (rawDays <= 0) {
        durationLabel = 'Hari ke-1 (Mulai Hari Ini)';
        durationShort = 'Hari ke-1';
        badgeClass = 'bg-sky-100 text-sky-950 border-sky-400 font-black';
      } else {
        durationLabel = `Berjalan ${dayCount} Hari`;
        durationShort = `Hari ke-${dayCount}`;
        badgeClass = dayCount > 14 
          ? 'bg-amber-100 text-amber-950 border-amber-400 font-black' 
          : 'bg-teal-100 text-teal-950 border-teal-400 font-black';
      }
    }

    return {
      startDateStr: startStr,
      displayStartDate: formatDisplayTargetDate(startStr),
      dayCount,
      durationLabel,
      durationShort,
      badgeClass,
      isDone
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
    if (userSection && !isMeetingRoom && userSection !== 'ALL') {
      setSelectedSection(userSection);
    }
  }, [userSection, isMeetingRoom]);

  // Loading & Data states
  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState<LogbookTask[]>([]);
  const [yesterdayTasks, setYesterdayTasks] = useState<LogbookTask[]>([]);
  const [carryOverTasks, setCarryOverTasks] = useState<LogbookTask[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Drag & Drop State for moving tasks between Progress & Planning
  const [draggedLogbookTaskId, setDraggedLogbookTaskId] = useState<number | null>(null);
  const [dragSourceColumn, setDragSourceColumn] = useState<'progress' | 'planning' | null>(null);
  const [isDragOverToday, setIsDragOverToday] = useState(false);
  const [isDragOverYesterday, setIsDragOverYesterday] = useState(false);

  const yesterdayDateStr = useMemo(() => {
    if (summaryData?.yesterdayDate) return summaryData.yesterdayDate;
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, [summaryData?.yesterdayDate, selectedDate]);

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
  const [targetTaskSection, setTargetTaskSection] = useState<string>('Preparation');
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
    setTargetTaskSection(
      selectedSection && selectedSection !== 'Semua Seksi' && selectedSection !== 'ALL'
        ? selectedSection
        : (userSection !== 'ALL' ? userSection : 'Preparation')
    );
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
    const noteText = newSubtaskNoteInput.replace(/[\r\n]+/g, ' ').trim();
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

      const finalSection = (isSuperAdmin || isMeetingRoom || userSection === 'ALL')
        ? targetTaskSection
        : userSection;

      const res = await fetch('/api/logbook/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newTaskDescription.trim(),
          section: finalSection,
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

    const compDateVal = autoStatus === 'Closed' ? selectedDate : (autoStatus === 'Open' || autoStatus === 'On Progress' ? null : task.actualCompletedDate);

    // Optimistic UI Update
    setTodayTasks(prev => prev.map(t => t.id === task.id ? { 
      ...t, 
      description: updatedDesc, 
      progressPercent: progress.percentage,
      status: autoStatus,
      actualCompletedDate: compDateVal
    } : t));
    setYesterdayTasks(prev => prev.map(t => t.id === task.id ? { 
      ...t, 
      description: updatedDesc, 
      progressPercent: progress.percentage,
      status: autoStatus,
      actualCompletedDate: compDateVal
    } : t));
    setCarryOverTasks(prev => prev.map(t => t.id === task.id ? { 
      ...t, 
      description: updatedDesc, 
      progressPercent: progress.percentage,
      status: autoStatus,
      actualCompletedDate: compDateVal
    } : t));

    try {
      await fetch(`/api/logbook/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: updatedDesc,
          progressPercent: progress.percentage,
          status: autoStatus,
          selectedDate: selectedDate,
          actualCompletedDate: autoStatus === 'Closed' ? selectedDate : (autoStatus === 'Open' || autoStatus === 'On Progress' ? null : undefined),
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
    const isClosing = newStatus === 'Closed' || newStatus === 'Done' || newStatus === 'Resolved';
    const isReopening = newStatus === 'Open' || newStatus === 'On Progress' || newStatus === 'In Progress';
    const compDateVal = isClosing ? selectedDate : (isReopening ? null : undefined);

    // Optimistic Update
    setTodayTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, ...(compDateVal !== undefined ? { actualCompletedDate: compDateVal } : {}) } : t));
    setYesterdayTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, ...(compDateVal !== undefined ? { actualCompletedDate: compDateVal } : {}) } : t));
    setCarryOverTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus, ...(compDateVal !== undefined ? { actualCompletedDate: compDateVal } : {}) } : t));

    try {
      const res = await fetch(`/api/logbook/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          selectedDate: selectedDate,
          actualCompletedDate: isClosing ? selectedDate : (isReopening ? null : undefined),
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

  // Drag & Drop Moving Tasks Between Progres & Evaluasi <--> Planning & Arahan Hari Ini
  const handleMoveTaskToToday = async (taskId: number) => {
    const taskToSchedule = carryOverTasks.find(t => t.id === taskId) || yesterdayTasks.find(t => t.id === taskId) || todayTasks.find(t => t.id === taskId);
    if (!taskToSchedule) return;

    // Check if already in today's planning
    const existingDates = (taskToSchedule.plannedDate || '').split(',').map(d => d.trim()).filter(Boolean);
    const isAlreadyPlanned = taskToSchedule.taskDate === selectedDate || existingDates.includes(selectedDate);
    if (isAlreadyPlanned && todayTasks.some(t => t.id === taskId)) {
      toast.info(`"${taskToSchedule.title}" sudah ada di Planning Hari Ini`, { icon: 'ℹ️' });
      return;
    }

    const updatedDates = Array.from(new Set([...existingDates, selectedDate])).join(',');
    const updatedTask: LogbookTask = { ...taskToSchedule, plannedDate: updatedDates };

    // Optimistic UI update:
    // 1. Add to todayTasks (Planning & Arahan Hari Ini)
    setTodayTasks(prev => {
      const exists = prev.some(t => t.id === taskId);
      if (exists) {
        return prev.map(t => t.id === taskId ? updatedTask : t);
      }
      return [updatedTask, ...prev];
    });

    // 2. KEEP in carryOverTasks and yesterdayTasks, but update plannedDate on them
    setCarryOverTasks(prev => prev.map(t => t.id === taskId ? { ...t, plannedDate: updatedDates } : t));
    setYesterdayTasks(prev => prev.map(t => t.id === taskId ? { ...t, plannedDate: updatedDates } : t));

    toast.success(`"${taskToSchedule.title}" dijadwalkan ke Planning Hari Ini!`, {
      icon: '📋'
    });

    try {
      const res = await fetch(`/api/logbook/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plannedDate: updatedDates,
          updaterNik: inspectorNik || 'system'
        })
      });
      const json = await res.json();
      if (json.status !== 'success') {
        toast.error(json.message || 'Gagal menjadwalkan tugas');
        fetchTasks();
      }
    } catch (err) {
      toast.error('Gagal terhubung ke server');
      fetchTasks();
    }
  };

  const handleMoveTaskToBacklog = async (taskId: number) => {
    const taskToRemove = todayTasks.find(t => t.id === taskId) || carryOverTasks.find(t => t.id === taskId) || yesterdayTasks.find(t => t.id === taskId);
    if (!taskToRemove) return;

    // If task was originally created today (taskDate === selectedDate):
    // Move its taskDate to yesterdayDateStr so it becomes a backlog item
    if (taskToRemove.taskDate === selectedDate) {
      const yDate = yesterdayDateStr;
      const updatedTask: LogbookTask = { ...taskToRemove, taskDate: yDate, plannedDate: null };

      setTodayTasks(prev => prev.filter(t => t.id !== taskId));
      setCarryOverTasks(prev => [updatedTask, ...prev.filter(t => t.id !== taskId)]);
      setYesterdayTasks(prev => [updatedTask, ...prev.filter(t => t.id !== taskId)]);

      toast.info(`"${taskToRemove.title}" batal diprogress hari ini (dipindahkan ke Backlog)`, {
        icon: '⏳'
      });

      try {
        const res = await fetch(`/api/logbook/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskDate: yDate,
            plannedDate: null,
            updaterNik: inspectorNik || 'system'
          })
        });
        const json = await res.json();
        if (json.status !== 'success') {
          toast.error(json.message || 'Gagal membatalkan tugas');
          fetchTasks();
        }
      } catch (err) {
        toast.error('Gagal terhubung ke server');
        fetchTasks();
      }
      return;
    }

    // If task was from yesterday/backlog (taskDate !== selectedDate):
    // Simply remove selectedDate from plannedDate! Task stays in yesterday / backlog untouched!
    const existingDates = (taskToRemove.plannedDate || '').split(',').map(d => d.trim()).filter(Boolean);
    const remainingDates = existingDates.filter(d => d !== selectedDate).join(',') || null;

    setTodayTasks(prev => prev.filter(t => t.id !== taskId));
    setCarryOverTasks(prev => prev.map(t => t.id === taskId ? { ...t, plannedDate: remainingDates } : t));
    setYesterdayTasks(prev => prev.map(t => t.id === taskId ? { ...t, plannedDate: remainingDates } : t));

    toast.info(`"${taskToRemove.title}" batal diprogress hari ini (tetap ada di Progres & Evaluasi)`, {
      icon: '⏳'
    });

    try {
      const res = await fetch(`/api/logbook/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plannedDate: remainingDates,
          updaterNik: inspectorNik || 'system'
        })
      });
      const json = await res.json();
      if (json.status !== 'success') {
        toast.error(json.message || 'Gagal membatalkan tugas dari planning');
        fetchTasks();
      }
    } catch (err) {
      toast.error('Gagal terhubung ke server');
      fetchTasks();
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
          const targetYDate = summaryData?.yesterdayDate || yesterdayDateStr;
          const yesterdayItems = parsed.items.filter(item => {
            const isCheckedYesterday = item.checked && (item.checkedDate === targetYDate);
            const rawNotes: SubtaskNote[] = (item.notes && item.notes.length > 0)
              ? item.notes
              : (item.note ? [{ id: 'legacy-1', text: item.note, date: item.noteDate || '', time: '', author: '' }] : []);
            const hasNoteYesterday = rawNotes.some(n => n.date === targetYDate);
            return isCheckedYesterday || hasNoteYesterday;
          });

          if (yesterdayItems.length > 0) {
            yesterdayItems.forEach(item => {
              const rawNotes: SubtaskNote[] = (item.notes && item.notes.length > 0)
                ? item.notes
                : (item.note ? [{ id: 'legacy-1', text: item.note, date: item.noteDate || '', time: '', author: '' }] : []);
              const yesterdayNotes = rawNotes.filter(n => n.date === targetYDate);
              const noteText = yesterdayNotes.length > 0 ? ` (Catatan: ${yesterdayNotes.map(n => n.text).join('; ')})` : '';
              text += `   ${item.checked ? '✅' : '◻️'} ${item.text}${noteText}\n`;
            });
          }
        }
      });
    }

    text += `\n*2️⃣ PLANNING & PENUGASAN KERJA HARI INI:*\n`;
    if (todayTasks.length === 0) {
      text += `- Belum ada tugas/planning yang ditugaskan untuk hari ini.\n`;
    } else {
      todayTasks.forEach((t, i) => {
        const dur = getTaskDurationInfo(t, selectedDate);
        const pendingInfo = t.isPending ? ` [Job Pending: ${t.pendingPicName || ''}]` : '';
        text += `${i + 1}. [${t.priority}] ${t.title} (PIC: ${t.assigneeName}${pendingInfo}) [Mulai: ${dur.displayStartDate} • ${dur.durationLabel}] [${t.status}]\n`;
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
  // Count across today + active pending/carry-over tasks in the log book
  const routineCount = useMemo(() => {
    const taskMap = new Map<number, LogbookTask>();
    todayTasks.filter(t => isTaskRoutine(t)).forEach(t => taskMap.set(t.id, t));
    carryOverTasks.filter(t => isTaskRoutine(t) && t.status !== 'Resolved' && t.status !== 'Done' && t.status !== 'Closed').forEach(t => taskMap.set(t.id, t));
    yesterdayTasks.filter(t => isTaskRoutine(t) && (t.isPending || t.status === 'Pending' || (t.status !== 'Resolved' && t.status !== 'Done' && t.status !== 'Closed'))).forEach(t => taskMap.set(t.id, t));
    return taskMap.size;
  }, [todayTasks, carryOverTasks, yesterdayTasks]);

  const nonRoutineCount = useMemo(() => {
    const taskMap = new Map<number, LogbookTask>();
    todayTasks.filter(t => !isTaskRoutine(t)).forEach(t => taskMap.set(t.id, t));
    carryOverTasks.filter(t => !isTaskRoutine(t) && t.status !== 'Resolved' && t.status !== 'Done' && t.status !== 'Closed').forEach(t => taskMap.set(t.id, t));
    yesterdayTasks.filter(t => !isTaskRoutine(t) && (t.isPending || t.status === 'Pending' || (t.status !== 'Resolved' && t.status !== 'Done' && t.status !== 'Closed'))).forEach(t => taskMap.set(t.id, t));
    return taskMap.size;
  }, [todayTasks, carryOverTasks, yesterdayTasks]);

  const allTasksCount = useMemo(() => {
    const taskMap = new Map<number, LogbookTask>();
    todayTasks.forEach(t => taskMap.set(t.id, t));
    carryOverTasks.filter(t => t.status !== 'Resolved' && t.status !== 'Done' && t.status !== 'Closed').forEach(t => taskMap.set(t.id, t));
    yesterdayTasks.filter(t => t.isPending || t.status === 'Pending' || (t.status !== 'Resolved' && t.status !== 'Done' && t.status !== 'Closed')).forEach(t => taskMap.set(t.id, t));
    return taskMap.size;
  }, [todayTasks, carryOverTasks, yesterdayTasks]);

  // Filtered Today & Yesterday Lists (Sorted by Urgency then FIFO)
  const filteredToday = useMemo(() => {
    return todayTasks
      .filter(t => {
        // Enforce: tasks in today's column must strictly be planned for selectedDate
        const isPlanned = t.taskDate === selectedDate || Boolean(t.plannedDate && t.plannedDate.split(',').map((d: string) => d.trim()).includes(selectedDate));
        if (!isPlanned) {
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
        const dur = getTaskDurationInfo(t, summaryData?.yesterdayDate || yesterdayDateStr);
        report += `${i + 1}. [${t.priority}] ${t.title} [100%]\n   - PIC: ${t.assigneeName}\n   - Waktu Pengerjaan: Mulai ${dur.displayStartDate} • ${dur.durationLabel}\n`;
      });
    }

    report += `\n⏳ *DAFTAR TUGAS ON PROGRESS / CARRY-OVER (${unfinished.length}):*\n`;
    if (unfinished.length === 0) {
      report += `- Nihil (Semua tugas kemarin telah tuntas 100%).\n`;
    } else {
      unfinished.forEach((t, i) => {
        const dur = getTaskDurationInfo(t, summaryData?.yesterdayDate || yesterdayDateStr);
        const prog = calculateTaskProgress(t);
        const pendingNote = t.isPending ? ` [Job Pending: ${t.pendingPicName || ''} - ${t.pendingReason || ''}]` : '';
        report += `${i + 1}. [${t.priority}] ${t.title} [Progres: ${prog}% - Status: ${t.status}]${pendingNote}\n   - PIC: ${t.assigneeName}\n   - Durasi: Mulai ${dur.displayStartDate} • ${dur.durationLabel}\n`;
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

  // Notion Database Table System State (Identical aesthetic & ergonomics to NotionDatabaseTable)
  const [viewMode, setViewMode] = useState<'table' | 'board' | 'list'>('table');
  const [themeMode, setThemeMode] = useState<'notion-light' | 'dark-studio'>('notion-light');
  const isNotionLight = themeMode === 'notion-light';
  const [fitPageMode, setFitPageMode] = useState<boolean>(false);
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    today: false,
    yesterday: false
  });
  const toggleGroup = (grp: string) => {
    setCollapsedGroups(prev => ({ ...prev, [grp]: !prev[grp] }));
  };
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<LogbookTask | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (colKey: string) => {
    if (sortColumn === colKey) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(colKey);
      setSortDirection('asc');
    }
  };

  const filterByNotionFilters = useCallback((taskList: LogbookTask[]) => {
    return taskList.filter(t => {
      if (statusFilter !== 'ALL') {
        const s = (t.status || '').toUpperCase();
        const isDone = s === 'CLOSED' || s === 'RESOLVED' || s === 'DONE';
        const isProg = s === 'IN PROGRESS' || s === 'ON PROGRESS';
        const isOpen = s === 'OPEN';
        const isPend = Boolean(t.isPending || s === 'PENDING');
        const isCanc = s === 'CANCELED';

        if (statusFilter === 'ACTIVE' && (isDone || isCanc)) return false;
        if (statusFilter === 'ON PROGRESS' && !isProg) return false;
        if (statusFilter === 'OPEN' && !isOpen) return false;
        if (statusFilter === 'PENDING' && !isPend) return false;
        if (statusFilter === 'CLOSE' && !isDone) return false;
        if (statusFilter === 'CANCELED' && !isCanc) return false;
      }
      if (priorityFilter !== 'ALL') {
        const p = (t.priority || '').toUpperCase();
        if (priorityFilter === 'URGENT' && p !== 'URGENT' && p !== 'CRITICAL') return false;
        if (priorityFilter === 'HIGH' && p !== 'HIGH') return false;
        if (priorityFilter === 'MEDIUM' && p !== 'MEDIUM') return false;
        if (priorityFilter === 'NORMAL' && p !== 'NORMAL' && p !== 'MEDIUM') return false;
        if (priorityFilter === 'LOW' && p !== 'LOW') return false;
      }
      return true;
    });
  }, [statusFilter, priorityFilter]);

  const sortTasks = useCallback((taskList: LogbookTask[]) => {
    if (!sortColumn) return taskList;
    return [...taskList].sort((a, b) => {
      let valA: any = '';
      let valB: any = '';

      if (sortColumn === 'title') {
        valA = a.title || '';
        valB = b.title || '';
      } else if (sortColumn === 'status') {
        valA = a.status || '';
        valB = b.status || '';
      } else if (sortColumn === 'priority') {
        const pOrder: Record<string, number> = { Urgent: 4, High: 3, Medium: 2, Normal: 2, Low: 1 };
        valA = pOrder[a.priority] || 0;
        valB = pOrder[b.priority] || 0;
      } else if (sortColumn === 'pic') {
        valA = a.assigneeName || '';
        valB = b.assigneeName || '';
      } else if (sortColumn === 'cadence') {
        valA = a.activityType || '';
        valB = b.activityType || '';
      } else if (sortColumn === 'progress') {
        valA = calculateTaskProgress(a);
        valB = calculateTaskProgress(b);
      } else if (sortColumn === 'date') {
        valA = a.createdAt || '';
        valB = b.createdAt || '';
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      return sortDirection === 'asc' 
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [sortColumn, sortDirection]);

  const tableTodayTasks = useMemo(() => {
    return sortTasks(filterByNotionFilters(filteredToday));
  }, [sortTasks, filterByNotionFilters, filteredToday]);

  const tableYesterdayTasks = useMemo(() => {
    return sortTasks(filterByNotionFilters(displayedYesterdayTasks));
  }, [sortTasks, filterByNotionFilters, displayedYesterdayTasks]);

  // Enterprise Minimalist Task Row Renderer with Click-to-Expand Details
  const renderTaskCard = (task: LogbookTask, isYesterday: boolean, isReadOnly: boolean = false, currentEvalScope?: 'yesterday' | 'all_carryover') => {
    const parsed = parseTasklist(task.description || '');
    const hasSubtasks = parsed.hasTasklist && parsed.total > 0;
    const isDone = task.status === 'Resolved' || task.status === 'Done' || task.status === 'Closed';
    const isPending = task.isPending || task.status === 'Pending';
    const isInProgress = task.status === 'In Progress' || task.status === 'On Progress';
    const isExpanded = expandedTaskIds.has(task.id);
    const picList = parsePicList(task.assigneeNik, task.assigneeName);
    const durationInfo = getTaskDurationInfo(task, selectedDate);
    const progressPercent = calculateTaskProgress(task);
    const routineInfo = getTaskRoutineInfo(task, selectedDate);

    // Deteksi mode evaluasi:
    // isYesterdayMode = true jika di bagian "Kemarin" (evalScope === 'yesterday').
    // isYesterdayMode = false jika di bagian "Semua Backlog" (evalScope === 'all_carryover') atau "Planning Hari Ini".
    const isYesterdayMode = isYesterday && (currentEvalScope ? currentEvalScope === 'yesterday' : isReadOnly);
    const targetYDate = summaryData?.yesterdayDate || yesterdayDateStr;

    // Filter Subtask:
    // - Bagian Kemarin: HANYA subtask yang mengalami perubahan kemarin (baik diceklis kemarin, ATAU memiliki catatan baru kemarin).
    // - Bagian Semua Backlog: Tampilkan SEMUA subtask (baik yang sudah diceklis maupun yang belum diceklis).
    const displayedItems = (() => {
      if (!parsed.hasTasklist || !parsed.items) return [];
      if (!isYesterdayMode) {
        return parsed.items;
      }
      return parsed.items.filter(item => {
        const isCheckedYesterday = item.checked && (item.checkedDate === targetYDate);
        const rawNotes: SubtaskNote[] = (item.notes && item.notes.length > 0)
          ? item.notes
          : (item.note ? [{ id: 'legacy-1', text: item.note, date: item.noteDate || '', time: '', author: '' }] : []);
        const hasNoteYesterday = rawNotes.some(n => n.date === targetYDate);
        return isCheckedYesterday || hasNoteYesterday;
      });
    })();

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
              badgeClass: autoStatus === 'Closed' ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold' : autoStatus === 'On Progress' ? 'bg-amber-100 text-amber-950 border-amber-400 font-bold' : 'bg-blue-100 text-blue-950 border-blue-400 font-bold',
              icon: <RotateCcw className="w-2.5 h-2.5 text-slate-800" />
            },
            {
              value: 'Canceled',
              label: 'Canceled (Batal)',
              badgeClass: 'bg-rose-100 text-rose-950 border-rose-400 font-bold',
              icon: <AlertCircle className="w-2.5 h-2.5 text-rose-800" />
            }
          ]
        : [
            {
              value: autoStatus,
              label: `${autoStatus} (Auto Checklist: ${parsed.completed}/${parsed.total})`,
              badgeClass: autoStatus === 'Closed' ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold' : autoStatus === 'On Progress' ? 'bg-amber-100 text-amber-950 border-amber-400 font-bold' : 'bg-blue-100 text-blue-950 border-blue-400 font-bold',
              icon: autoStatus === 'Closed' ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-800" /> : autoStatus === 'On Progress' ? <RotateCcw className="w-2.5 h-2.5 text-amber-800" /> : <Clock className="w-2.5 h-2.5 text-blue-800" />
            },
            {
              value: 'Canceled',
              label: 'Canceled (Batalkan)',
              badgeClass: 'bg-rose-100 text-rose-950 border-rose-400 font-bold',
              icon: <AlertCircle className="w-2.5 h-2.5 text-rose-800" />
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
        draggable={true}
        onDragStart={(e) => {
          const fromCol = isYesterday ? 'progress' : 'planning';
          e.dataTransfer.setData('text/plain', JSON.stringify({ taskId: task.id, fromColumn: fromCol }));
          setDraggedLogbookTaskId(task.id);
          setDragSourceColumn(fromCol);
        }}
        onDragEnd={() => {
          setDraggedLogbookTaskId(null);
          setDragSourceColumn(null);
          setIsDragOverToday(false);
          setIsDragOverYesterday(false);
        }}
        className={`rounded-xl border transition-all duration-200 cursor-grab active:cursor-grabbing ${
          draggedLogbookTaskId === task.id ? 'opacity-40 scale-[0.98] border-2 border-dashed border-teal-500 bg-teal-50/50 shadow-inner' : ''
        } ${isExpanded ? 'overflow-visible' : 'overflow-hidden'} ${
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
          className="p-3 sm:px-4 sm:py-2.5 flex items-start sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors group"
        >
          {/* Left: Drag Grip + Chevron + Content (Metadata Badges & Judul Utama) */}
          <div className="flex items-start gap-2 sm:gap-2.5 min-w-0 flex-1">
            {/* Drag Handle & Chevron */}
            <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
              <div 
                className="p-1 text-slate-300 group-hover:text-teal-600 transition-colors"
                title={isYesterday ? "Tarik (Drag) ke Planning & Arahan untuk diprogress hari ini" : "Tarik (Drag) kembali ke Progres & Evaluasi jika tidak jadi diprogress"}
              >
                <GripVertical className="w-3.5 h-3.5" />
              </div>

              {/* Expand indicator icon */}
              <div className={`p-1 rounded-md text-slate-400 group-hover:text-teal-700 transition-transform duration-200 ${
                isExpanded ? 'rotate-90 text-teal-700 bg-teal-50' : 'hover:bg-slate-100'
              }`}>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* Content Container: Baris 1 Badges Metadata + Baris 2 Judul Utama Full Width */}
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              {/* Baris 1: Badges Metadata (Priority, Routine, Waktu Mulai & Durasi Pengerjaan, Notices) */}
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                {/* Urgency Badge */}
                <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0 shadow-2xs ${
                  task.priority === 'Urgent' 
                    ? 'bg-rose-100 text-rose-950 border border-rose-400 animate-pulse' :
                  task.priority === 'High' 
                    ? 'bg-amber-100 text-amber-950 border border-amber-400' :
                  task.priority === 'Low'
                    ? 'bg-slate-100 text-slate-900 border border-slate-300' :
                    'bg-slate-100 text-slate-900 border border-slate-300 font-black'
                }`}>
                  {task.priority}
                </span>

                {/* Routine Cadence Badge */}
                <span className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md border shrink-0 shadow-2xs ${routineInfo.color}`}>
                  {routineInfo.label}
                </span>

                {/* Waktu Mulai & Lama Pengerjaan Badge (Pengganti Deadline) */}
                <span 
                  className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-md border shrink-0 shadow-2xs ${durationInfo.badgeClass}`}
                  title={`Waktu Mulai: ${durationInfo.displayStartDate} • Lama Pengerjaan: ${durationInfo.durationLabel}`}
                >
                  <Clock className="w-3 h-3 opacity-70" />
                  <span>{durationInfo.durationLabel}</span>
                  <span className="opacity-70 hidden md:inline">• Mulai {durationInfo.displayStartDate}</span>
                </span>

                {/* Notice indicators on collapsed row */}
                {isYesterday && Boolean(todayTasks.some(t => t.id === task.id) || (task.plannedDate && task.plannedDate.split(',').map(d => d.trim()).includes(selectedDate))) && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-950 border border-teal-300 shrink-0" title="Tugas ini telah dijadwalkan ke Planning Hari Ini">
                    <Bookmark className="w-2.5 h-2.5 fill-teal-800 text-teal-800" />
                    <span>Di Planning</span>
                  </span>
                )}
                {task.draftChange && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-950 border border-amber-400 shrink-0">
                    Draft Usulan
                  </span>
                )}
              </div>

              {/* Baris 2: Judul Utama Task (Tidak terpotong, full width, word-break natural) */}
              <h3 className={`font-black leading-snug tracking-tight text-sm sm:text-base break-words ${
                isDone ? 'line-through text-slate-800 font-bold opacity-80' : 'text-black'
              }`}>
                {task.title}
              </h3>
            </div>
          </div>

          {/* Right: Status Dropdown, Copy Button & Mini Progress Bar */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="flex flex-col items-end gap-1 shrink-0 self-start sm:self-center"
          >
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyToNewTask(task);
                }}
                className="p-1 rounded-lg text-slate-500 hover:text-black hover:bg-slate-100 transition-colors cursor-pointer"
                title="Salin kegiatan ini ke tugas baru"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {/* Status Dropdown: Static Badge if isReadOnly, Interactive Dropdown if active */}
              {isReadOnly ? (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border ${
                  isDone 
                    ? 'bg-emerald-100 text-emerald-950 border-emerald-400' 
                    : isInProgress 
                    ? 'bg-amber-100 text-amber-950 border-amber-400' 
                    : 'bg-slate-100 text-slate-900 border-slate-300'
                }`}>
                  {isDone ? <CheckCircle2 className="w-3 h-3 text-emerald-700" /> : <Clock className="w-3 h-3 text-amber-700" />}
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

            {/* Progress bar kecil di ujung kanan / Lama tugas berakhir jika Closed/Done */}
            {isDone ? (
              <div 
                className="inline-flex items-center justify-end gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs mt-0.5 select-none shrink-0"
                title={`Mulai: ${durationInfo.displayStartDate || durationInfo.startDateStr} (${durationInfo.durationLabel})`}
              >
                <Clock className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                <span>{durationInfo.durationLabel}</span>
              </div>
            ) : (
              <div className="flex items-center justify-end gap-1.5 w-24 sm:w-28 mt-0.5">
                <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full rounded-full transition-all duration-300 ${
                      isInProgress 
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
            )}
          </div>
        </div>

        {/* Expandable Details (Hanya muncul saat task diklik) */}
        {isExpanded && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/50 space-y-4 animate-in fade-in duration-150">
            {/* Badges Bar (Seksi, Routine Info, Waktu Mulai, Lama Pengerjaan, Buletin) */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-lg font-mono font-bold shadow-2xs tracking-wide ${sectionBadgeClass}`}>
                {task.section}
              </span>

              {/* Routine Cadence Detail Badge */}
              <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1.5 shadow-2xs ${routineInfo.color}`}>
                <span>{routineInfo.label}</span>
                <span className="opacity-50">•</span>
                <span>{routineInfo.windowDesc}</span>
              </span>

              {/* Tanggal Dimulai (Start Date) Badge */}
              <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-slate-100 text-slate-800 border border-slate-300 flex items-center gap-1.5 shadow-2xs" title="Tanggal Dimulai (Start Date)">
                <Calendar className="w-3.5 h-3.5 text-slate-600" />
                <span>Mulai: {durationInfo.displayStartDate}</span>
              </span>

              {/* Lama Pengerjaan (Duration) Badge */}
              <span className={`text-xs px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1.5 shadow-2xs ${durationInfo.badgeClass}`} title="Lama Pengerjaan Task">
                <Clock className="w-3.5 h-3.5" />
                <span>Lama Pengerjaan: {durationInfo.durationLabel}</span>
              </span>

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
                    <span>
                      {isYesterdayMode 
                        ? `Subtask Diperbarui Kemarin (${displayedItems.length})` 
                        : `Checklist Subtask (${parsed.completed}/${parsed.total})`}
                    </span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {isYesterdayMode 
                      ? 'Hanya subtask & catatan yang diupdate kemarin' 
                      : !isReadOnly 
                      ? 'Geser ikon titik untuk atur posisi' 
                      : 'Menampilkan semua subtask & seluruh riwayat catatan'}
                  </span>
                </div>

                {isYesterdayMode && displayedItems.length === 0 ? (
                  <div className="py-2.5 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Nihil perubahan subtask pada hari kemarin ({formatDisplayTargetDate(targetYDate)}).</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Tidak ada subtask yang diceklis atau mendapat catatan baru pada tanggal kemarin. Seluruh {parsed.total} subtask & riwayat lengkap dapat dilihat di tab <strong>Semua Backlog</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    {displayedItems.map((item, idx) => {
                      // Subtask note handling
                      const rawNotes: SubtaskNote[] = (item.notes && item.notes.length > 0)
                        ? item.notes
                        : (item.note ? [{ id: 'legacy-1', text: item.note, date: item.noteDate || '', time: '', author: '' }] : []);

                      // Filter jika isYesterdayMode: HANYA catatan yang ditulis kemarin yang ditampilkan!
                      const displayedNotes: SubtaskNote[] = isYesterdayMode
                        ? rawNotes.filter(n => n.date === targetYDate)
                        : rawNotes;

                      const notesList: SubtaskNote[] = [...displayedNotes].sort((a, b) => {
                        const dtA = `${a.date || ''} ${a.time || ''}`;
                        const dtB = `${b.date || ''} ${b.time || ''}`;
                        return dtB.localeCompare(dtA);
                      });
                      const noteCount = notesList.length;

                      return (
                        <div
                          key={item.index}
                          draggable={!isReadOnly}
                          onDragStart={(e) => {
                            if (isReadOnly) return;
                            e.dataTransfer.setData('text/plain', String(idx));
                            setCardDragIdx({ taskId: task.id, itemIdx: idx });
                          }}
                          onDragOver={(e) => {
                            if (isReadOnly) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (cardDragOverIdx?.taskId === task.id && cardDragOverIdx?.itemIdx !== idx) {
                              setCardDragOverIdx({ taskId: task.id, itemIdx: idx });
                            }
                          }}
                          onDragLeave={() => {
                            if (isReadOnly) return;
                            if (cardDragOverIdx?.taskId === task.id && cardDragOverIdx?.itemIdx === idx) {
                              setCardDragOverIdx(null);
                            }
                          }}
                          onDrop={(e) => {
                            if (isReadOnly) return;
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
                                ? 'line-through text-slate-800 font-bold opacity-80' 
                                : 'font-black text-black'
                            }`}>
                              {item.text}
                            </span>
                            {item.checkedDate && (
                              <span 
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-black border inline-flex items-center gap-0.5 w-fit ${
                                  item.checkedDate === summaryData?.yesterdayDate
                                    ? 'bg-emerald-100 text-emerald-950 border-emerald-400'
                                    : 'bg-slate-200 text-slate-900 border-slate-300'
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
                                        toast.info(isYesterdayMode ? 'Tidak ada catatan baru yang dibuat kemarin pada subtask ini.' : 'Tidak ada catatan pada subtask ini.');
                                      }
                                    } else {
                                      openSubtaskNoteModal(task, item.index, item.text, displayedNotes, isReadOnly);
                                    }
                                  }}
                                  title={noteCount > 0 ? `${noteCount} Catatan ${isYesterdayMode ? 'Kemarin' : 'Subtask'} (Klik untuk lihat)` : isReadOnly ? 'Tidak ada catatan' : 'Tambah catatan subtask (Icon !)'}
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
                                          {isYesterdayMode ? `Catatan Kemarin (${noteCount})` : `Catatan Subtask (${noteCount})`}
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
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Clean description text (if task has checklist and clean text) */}
            {parsed.hasTasklist && parsed.cleanText && (
              <div className="p-3 rounded-xl bg-white border border-slate-300">
                <div 
                  className="text-xs sm:text-sm font-bold text-black whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: markdownToVisualHtml(parsed.cleanText) }}
                />
              </div>
            )}

            {/* If task has no checklist but has description */}
            {!parsed.hasTasklist && task.description && (
              <div className="p-3 rounded-xl bg-white border border-slate-300">
                <div 
                  className="text-xs sm:text-sm font-bold text-black whitespace-pre-wrap leading-relaxed"
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

            {/* Header Module Mode Switcher: Log Book All Task | Log Book Routine | Log Book Non Routine */}
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
                <span>Log Book All Task</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  moduleMode === 'ALL' ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200' : 'bg-slate-200/60 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400'
                }`}>
                  {allTasksCount}
                </span>
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
                <span>Log Book Routine</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  moduleMode === 'ROUTINE' ? 'bg-teal-900/60 text-teal-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {routineCount}
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
                <span>Log Book Non Routine</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  moduleMode === 'NON_ROUTINE' ? 'bg-amber-800/60 text-amber-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  {nonRoutineCount}
                </span>
              </button>
            </div>

            {/* Section & Universe Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Section Filter / Display */}
              {(isSuperAdmin || isMeetingRoom || userSection === 'ALL') ? (
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
              className={`p-4 rounded-2xl border-2 border-t-4 border-t-sky-700 bg-gradient-to-b from-sky-50/80 to-white shadow-xs transition-all cursor-pointer ${
                activeSection === 'today' ? 'border-sky-500 ring-2 ring-sky-400/40 shadow-md scale-[1.01]' : 'border-sky-300 hover:border-sky-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-black">
                  Fokus Hari Ini
                </span>
                <span className="p-2 rounded-xl bg-sky-200 text-sky-900 border border-sky-300">
                  <Clock className="w-4 h-4 stroke-[2.5]" />
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2 text-black">
                {summaryData.totalToday} <span className="text-xs font-black text-slate-800">kegiatan</span>
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-600" />
                <p className="text-xs text-black font-bold">
                  {summaryData.openToday} Open • {summaryData.inProgressToday} In Progress
                </p>
              </div>
            </div>

            {/* Card 2: Selesai Hari Ini */}
            <div 
              onClick={() => setActiveSection('today')}
              title="Klik untuk menyorot bagian Hari Ini"
              className={`p-4 rounded-2xl border-2 border-t-4 border-t-teal-700 bg-gradient-to-b from-teal-50/80 to-white shadow-xs transition-all cursor-pointer ${
                activeSection === 'today' ? 'border-teal-500 ring-2 ring-teal-400/40 shadow-md scale-[1.01]' : 'border-teal-300 hover:border-teal-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-black">
                  Selesai Hari Ini
                </span>
                <span className="p-2 rounded-xl bg-teal-200 text-teal-900 border border-teal-300">
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2 text-black">
                {summaryData.completedToday}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-teal-600" />
                <p className="text-xs text-black font-bold">
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
              className={`p-4 rounded-2xl border-2 border-t-4 border-t-amber-600 bg-gradient-to-b from-amber-50/80 to-white shadow-xs transition-all cursor-pointer ${
                activeSection === 'yesterday' ? 'border-amber-500 ring-2 ring-amber-400/40 shadow-md scale-[1.01]' : 'border-amber-300 hover:border-amber-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-black">
                  Progres Kemarin (H-1)
                </span>
                <span className="p-2 rounded-xl bg-amber-200 text-amber-950 border border-amber-300">
                  <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <p className="text-2xl sm:text-3xl font-black text-black">
                  {summaryData?.completedYesterday || 0} / {summaryData?.totalYesterday || 0}
                </p>
                <span className="text-xs font-black text-emerald-950 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-400">
                  {summaryData?.yesterdayProgressPercent || 0}% Selesai
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                <p className="text-xs text-black font-bold">
                  {summaryData?.totalCarryOver || 0} total carry-over berjalan
                </p>
              </div>
            </div>

            {/* Card 4: Target Penyelesaian */}
            <div 
              onClick={() => setActiveSection('today')}
              title="Klik untuk menyorot target hari ini"
              className="p-4 rounded-2xl border-2 border-slate-300 border-t-4 border-t-slate-800 bg-gradient-to-b from-slate-100 to-white shadow-xs transition-all cursor-pointer hover:border-slate-400"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-black">
                  Target Penyelesaian
                </span>
                <span className="p-2 rounded-xl bg-slate-200 text-slate-900 border border-slate-300">
                  <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2 text-black">
                {summaryData.totalToday > 0 ? Math.round((summaryData.completedToday / summaryData.totalToday) * 100) : 0}%
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-700" />
                <p className="text-xs text-black font-bold">
                  Target Kegiatan Seksi
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* NOTION DATABASE TOOLBAR & CONTROLS (Identical to NotionDatabaseTable)      */}
        {/* ========================================================================= */}
        <div 
          className={`p-3 rounded-2xl border shadow-xs transition-colors flex flex-col gap-3 ${
            isNotionLight ? 'bg-white border-slate-200' : 'bg-[#1e1e1e] border-[#334155]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Left: View Switcher (Table / Board / Cards) */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? isNotionLight
                      ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                      : 'bg-slate-900 text-teal-300 shadow-xs border border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title="Tampilan Tabel Database Notion (Grid Ringkas)"
              >
                <TableIcon className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Table</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'board'
                    ? isNotionLight
                      ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                      : 'bg-slate-900 text-teal-300 shadow-xs border border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title="Tampilan Papan Kanban Berdasarkan Status"
              >
                <Kanban className="w-3.5 h-3.5 text-amber-500" />
                <span>Board</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? isNotionLight
                      ? 'bg-white text-teal-800 shadow-xs border border-slate-200'
                      : 'bg-slate-900 text-teal-300 shadow-xs border border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title="Tampilan Kartu Ringkas (2 Kolom)"
              >
                <LayoutList className="w-3.5 h-3.5 text-indigo-500" />
                <span>Cards</span>
              </button>
            </div>

            {/* Right: Zoom & View Controls */}
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setZoomPercent(prev => Math.max(70, prev - 10))}
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Perkecil Tampilan (Zoom Out)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono font-bold px-1 min-w-[36px] text-center text-slate-700 dark:text-slate-300">
                  {zoomPercent}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomPercent(prev => Math.min(130, prev + 10))}
                  className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Perbesar Tampilan (Zoom In)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Fit Screen Toggle */}
              <button
                type="button"
                onClick={() => setFitPageMode(!fitPageMode)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  fitPageMode
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : isNotionLight
                    ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title="Sesuaikan lebar tabel dengan resolusi layar penuh (Fit Page)"
              >
                {fitPageMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{fitPageMode ? 'Reset Lebar' : 'Fit Screen'}</span>
              </button>

              {/* Notion Theme Mode Toggle */}
              <button
                type="button"
                onClick={() => setThemeMode(isNotionLight ? 'dark-studio' : 'notion-light')}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                  isNotionLight
                    ? 'bg-white hover:bg-slate-100 text-amber-600 border-slate-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-teal-400 border-slate-700'
                }`}
                title={isNotionLight ? 'Ganti ke Dark Studio Theme' : 'Ganti ke Notion Clean Light Theme'}
              >
                {isNotionLight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Bottom Filter Pills: Status & Priority */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            {[
              { key: 'ALL', label: 'Semua Status', count: (summaryData?.totalToday || 0) + displayedYesterdayTasks.length },
              { key: 'ACTIVE', label: 'Sedang Aktif', count: (summaryData?.openToday || 0) + (summaryData?.inProgressToday || 0) + displayedYesterdayTasks.filter(t => t.status !== 'Closed' && t.status !== 'Resolved' && t.status !== 'Done' && t.status !== 'Canceled').length },
              { key: 'ON PROGRESS', label: 'On Progress', count: (summaryData?.inProgressToday || 0) + displayedYesterdayTasks.filter(t => t.status === 'In Progress' || t.status === 'On Progress').length },
              { key: 'OPEN', label: 'Open', count: (summaryData?.openToday || 0) + displayedYesterdayTasks.filter(t => t.status === 'Open').length },
              { key: 'PENDING', label: 'Job Pending', count: (summaryData?.pendingYesterday || 0) + displayedYesterdayTasks.filter(t => t.isPending || t.status === 'Pending').length },
              { key: 'CLOSE', label: 'Closed / Selesai', count: (summaryData?.completedToday || 0) + displayedYesterdayTasks.filter(t => t.status === 'Closed' || t.status === 'Resolved' || t.status === 'Done').length },
              { key: 'CANCELED', label: 'Canceled', count: displayedYesterdayTasks.filter(t => (t.status || '').toLowerCase() === 'canceled').length + filteredToday.filter(t => (t.status || '').toLowerCase() === 'canceled').length },
            ].map((st) => {
              const isActive = statusFilter === st.key;
              return (
                <button
                  key={st.key}
                  type="button"
                  onClick={() => setStatusFilter(st.key)}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 border cursor-pointer shrink-0 ${
                    isActive
                      ? isNotionLight
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-teal-500/20 text-teal-300 border-teal-500'
                      : isNotionLight
                      ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-[#262626] hover:bg-[#333333] text-slate-400 border-slate-700'
                  }`}
                >
                  <span>{st.label}</span>
                  {st.count !== undefined && st.count > 0 && (
                    <span 
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                        isActive
                          ? isNotionLight ? 'bg-slate-700 text-white' : 'bg-teal-500/30 text-teal-200'
                          : isNotionLight ? 'bg-slate-100 text-slate-600' : 'bg-[#1e293b] text-slate-400'
                      }`}
                    >
                      {st.count}
                    </span>
                  )}
                </button>
              );
            })}

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold outline-none cursor-pointer transition-colors ${
                isNotionLight
                  ? 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                  : 'bg-[#262626] border-[#334155] text-[#cbd5e1]'
              }`}
            >
              <option value="ALL">Semua Prioritas</option>
              <option value="URGENT">🚨 Urgent / Critical</option>
              <option value="HIGH">🔴 High Priority</option>
              <option value="MEDIUM">🔵 Medium Priority</option>
              <option value="NORMAL">🟢 Normal Priority</option>
              <option value="LOW">⚪ Low Priority</option>
            </select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. NOTION DATABASE TABLE VIEW (Default & Parity with NotionDatabaseTable)  */}
        {/* ========================================================================= */}
        {viewMode === 'table' && (
          <div 
            className={`overflow-x-auto transition-all rounded-2xl border shadow-xs ${
              isNotionLight ? 'bg-white border-slate-200' : 'bg-[#191919] border-[#334155]'
            }`}
            style={{ zoom: zoomPercent !== 100 ? `${zoomPercent}%` : undefined }}
          >
            <table className={`w-full text-left border-collapse ${fitPageMode ? 'table-fixed text-[11px]' : 'text-xs'}`}>
              {/* Sticky Column Headers */}
              <thead>
                <tr 
                  className={`border-b select-none transition-colors ${
                    isNotionLight
                      ? 'bg-[#fbfbfa] border-slate-200 text-slate-600'
                      : 'bg-[#242424] border-[#303030] text-slate-400'
                  }`}
                >
                  <th className={`text-center ${fitPageMode ? 'w-[3%] px-1 py-2.5' : 'w-10 px-2 py-3'}`}>
                    <GripVertical className="w-3.5 h-3.5 text-slate-400 mx-auto" />
                  </th>

                  <th 
                    onClick={() => handleSort('date')}
                    className={`font-bold cursor-pointer hover:opacity-80 transition-opacity ${
                      fitPageMode ? 'w-[4%] text-center px-1 py-2.5' : 'w-14 text-center px-2 py-3'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>#</span>
                      {sortColumn === 'date' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-500" /> : <ArrowDown className="w-3 h-3 text-teal-500" />)}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('title')}
                    className={`font-bold cursor-pointer hover:opacity-80 transition-opacity ${
                      fitPageMode ? 'w-[28%] px-2.5 py-2.5' : 'min-w-[280px] px-3.5 py-3'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Kegiatan / Arahan Tugas</span>
                      {sortColumn === 'title' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-500" /> : <ArrowDown className="w-3 h-3 text-teal-500" />)}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('cadence')}
                    className={`font-bold cursor-pointer hover:opacity-80 transition-opacity ${
                      fitPageMode ? 'w-[10%] px-1.5 py-2.5' : 'min-w-[120px] px-3 py-3'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      <span>Frekuensi</span>
                      {sortColumn === 'cadence' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-500" /> : <ArrowDown className="w-3 h-3 text-teal-500" />)}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('status')}
                    className={`font-bold cursor-pointer hover:opacity-80 transition-opacity ${
                      fitPageMode ? 'w-[12%] px-1.5 py-2.5' : 'min-w-[140px] px-3 py-3'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Status</span>
                      {sortColumn === 'status' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-500" /> : <ArrowDown className="w-3 h-3 text-teal-500" />)}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('priority')}
                    className={`font-bold cursor-pointer hover:opacity-80 transition-opacity ${
                      fitPageMode ? 'w-[9%] px-1.5 py-2.5' : 'min-w-[110px] px-3 py-3'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                      <span>Prioritas</span>
                      {sortColumn === 'priority' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-500" /> : <ArrowDown className="w-3 h-3 text-teal-500" />)}
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('pic')}
                    className={`font-bold cursor-pointer hover:opacity-80 transition-opacity ${
                      fitPageMode ? 'w-[13%] px-2 py-2.5' : 'min-w-[150px] px-3 py-3'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>PIC Pelaksana</span>
                      {sortColumn === 'pic' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-500" /> : <ArrowDown className="w-3 h-3 text-teal-500" />)}
                    </div>
                  </th>

                  <th className={`font-bold ${fitPageMode ? 'w-[10%] px-1.5 py-2.5' : 'min-w-[130px] px-3 py-3'}`}>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Mulai & Durasi</span>
                    </div>
                  </th>

                  <th 
                    onClick={() => handleSort('progress')}
                    className={`font-bold cursor-pointer hover:opacity-80 transition-opacity ${
                      fitPageMode ? 'w-[9%] px-1.5 py-2.5' : 'min-w-[120px] px-3 py-3'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                      <span>Progress</span>
                      {sortColumn === 'progress' && (sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-500" /> : <ArrowDown className="w-3 h-3 text-teal-500" />)}
                    </div>
                  </th>

                  <th className={`text-center font-bold ${fitPageMode ? 'w-[8%] px-1 py-2.5' : 'w-24 px-3 py-3'}`}>
                    Aksi
                  </th>
                </tr>
              </thead>

              {/* Table Body with Notion Collapsible Section Groups */}
              <tbody className={`divide-y transition-colors ${
                isNotionLight ? 'bg-white divide-slate-100' : 'bg-[#191919] divide-[#292929]'
              }`}>
                {/* ------------------------------------------------------------- */}
                {/* GROUP 1: PLANNING & ARAHAN HARI INI                           */}
                {/* ------------------------------------------------------------- */}
                <tr
                  onClick={() => toggleGroup('today')}
                  onDragOver={(e) => {
                    if (dragSourceColumn === 'progress') {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (!isDragOverToday) setIsDragOverToday(true);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setIsDragOverToday(false);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverToday(false);
                    const data = e.dataTransfer.getData('text/plain');
                    try {
                      const parsed = JSON.parse(data);
                      if (parsed.taskId && parsed.fromColumn === 'progress') {
                        handleMoveTaskToToday(parsed.taskId);
                      }
                    } catch (err) {
                      if (draggedLogbookTaskId && dragSourceColumn === 'progress') {
                        handleMoveTaskToToday(draggedLogbookTaskId);
                      }
                    }
                  }}
                  className={`cursor-pointer select-none transition-colors border-y font-medium text-xs ${
                    isDragOverToday
                      ? 'bg-teal-500/20 border-teal-500 ring-2 ring-teal-400'
                      : isNotionLight
                      ? 'bg-teal-50/70 hover:bg-teal-100/60 text-teal-950 border-teal-200'
                      : 'bg-teal-950/40 hover:bg-teal-950/70 text-teal-300 border-teal-800'
                  }`}
                >
                  <td colSpan={10} className="px-3.5 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] text-teal-600 dark:text-teal-400 select-none">
                          {collapsedGroups.today ? '▶' : '▼'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
                          <span className="font-black text-sm tracking-tight text-teal-950 dark:text-teal-200">
                            📌 1. PLANNING & ARAHAN HARI INI
                          </span>
                        </div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-black ${
                          isNotionLight ? 'bg-teal-200/80 text-teal-950' : 'bg-teal-900 text-teal-200'
                        }`}>
                          {tableTodayTasks.length} kegiatan
                        </span>
                        {isDragOverToday && (
                          <span className="text-xs font-black text-teal-700 dark:text-teal-300 animate-pulse pl-2">
                            ← Lepaskan di sini untuk masukkan ke Planning Hari Ini
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={openAssignModal}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                          title="Tambah kegiatan baru ke planning hari ini"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>+ Tambah Kegiatan</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Rows under Group 1 */}
                {!collapsedGroups.today && (
                  tableTodayTasks.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-xs text-slate-500 italic bg-teal-50/10">
                        Belum ada tugas yang diprogress hari ini. Tarik (drag) dari Backlog atau klik "+ Tambah Kegiatan".
                      </td>
                    </tr>
                  ) : (
                    tableTodayTasks.map((task, idx) => {
                      const parsed = parseTasklist(task.description || '');
                      const hasSubtasks = parsed.hasTasklist && parsed.total > 0;
                      const isDone = task.status === 'Resolved' || task.status === 'Done' || task.status === 'Closed';
                      const isPending = task.isPending || task.status === 'Pending';
                      const isInProgress = task.status === 'In Progress' || task.status === 'On Progress';
                      const isExpanded = expandedTaskIds.has(task.id);
                      const picList = parsePicList(task.assigneeNik, task.assigneeName);
                      const durationInfo = getTaskDurationInfo(task, selectedDate);
                      const progressPercent = calculateTaskProgress(task);
                      const routineInfo = getTaskRoutineInfo(task, selectedDate);
                      const autoStatus = parsed.completed === 0 ? 'Open' : parsed.completed === parsed.total ? 'Closed' : 'On Progress';
                      const isCanceled = (task.status || '').toLowerCase() === 'canceled';

                      const statusOptionsOverride: DropdownOption[] | undefined = hasSubtasks
                        ? isCanceled
                          ? [
                              {
                                value: autoStatus,
                                label: `Pulihkan ke [${autoStatus}]`,
                                badgeClass: autoStatus === 'Closed' ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold' : autoStatus === 'On Progress' ? 'bg-amber-100 text-amber-950 border-amber-400 font-bold' : 'bg-blue-100 text-blue-950 border-blue-400 font-bold',
                                icon: <RotateCcw className="w-2.5 h-2.5 text-slate-800" />
                              },
                              {
                                value: 'Canceled',
                                label: 'Canceled (Batal)',
                                badgeClass: 'bg-rose-100 text-rose-950 border-rose-400 font-bold',
                                icon: <AlertCircle className="w-2.5 h-2.5 text-rose-800" />
                              }
                            ]
                          : [
                              {
                                value: autoStatus,
                                label: `${autoStatus} (Auto Checklist: ${parsed.completed}/${parsed.total})`,
                                badgeClass: autoStatus === 'Closed' ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-bold' : autoStatus === 'On Progress' ? 'bg-amber-100 text-amber-950 border-amber-400 font-bold' : 'bg-blue-100 text-blue-950 border-blue-400 font-bold',
                                icon: autoStatus === 'Closed' ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-800" /> : autoStatus === 'On Progress' ? <RotateCcw className="w-2.5 h-2.5 text-amber-800" /> : <Clock className="w-2.5 h-2.5 text-blue-800" />
                              },
                              {
                                value: 'Canceled',
                                label: 'Canceled (Batalkan)',
                                badgeClass: 'bg-rose-100 text-rose-950 border-rose-400 font-bold',
                                icon: <AlertCircle className="w-2.5 h-2.5 text-rose-800" />
                              }
                            ]
                        : undefined;

                      return (
                        <React.Fragment key={task.id}>
                          <tr
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', JSON.stringify({ taskId: task.id, fromColumn: 'planning' }));
                              setDraggedLogbookTaskId(task.id);
                              setDragSourceColumn('planning');
                            }}
                            onDragEnd={() => {
                              setDraggedLogbookTaskId(null);
                              setDragSourceColumn(null);
                              setIsDragOverToday(false);
                              setIsDragOverYesterday(false);
                            }}
                            className={`transition-colors group ${
                              draggedLogbookTaskId === task.id ? 'opacity-40 bg-teal-50/50' : ''
                            } ${
                              isDone 
                                ? isNotionLight ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : 'bg-emerald-950/10 hover:bg-emerald-950/20'
                                : isPending
                                ? isNotionLight ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'bg-amber-950/10 hover:bg-amber-950/20'
                                : isNotionLight
                                ? 'bg-white hover:bg-slate-50'
                                : 'bg-[#191919] hover:bg-[#202020]'
                            }`}
                          >
                            {/* Drag Handle */}
                            <td className="text-center px-1 py-2 cursor-grab active:cursor-grabbing text-slate-400 hover:text-teal-600">
                              <GripVertical className="w-3.5 h-3.5 mx-auto" />
                            </td>

                            {/* No */}
                            <td className="text-center font-mono text-[11px] px-2 py-2.5 text-slate-500">
                              {idx + 1}
                            </td>

                            {/* Kegiatan / Arahan Tugas */}
                            <td className="px-3.5 py-2.5">
                              <div className="flex items-start gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(task.id);
                                  }}
                                  className={`p-0.5 rounded transition-transform mt-0.5 cursor-pointer ${
                                    isExpanded ? 'rotate-90 text-teal-600' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                  }`}
                                  title={isExpanded ? 'Tutup subtask checklist' : 'Buka subtask checklist'}
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>

                                <div className="min-w-0 flex-1">
                                  <div 
                                    onClick={() => setSelectedTaskDetail(task)}
                                    className="font-bold text-xs sm:text-sm cursor-pointer hover:text-teal-600 dark:hover:text-teal-400 hover:underline transition-colors flex items-center gap-1.5 flex-wrap"
                                    style={{ color: isDone ? '#64748b' : isNotionLight ? '#0f172a' : '#f8fafc' }}
                                  >
                                    <span className={isDone ? 'line-through opacity-75' : ''}>{task.title}</span>
                                    {hasSubtasks && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 font-bold shrink-0">
                                        ✓ {parsed.completed}/{parsed.total}
                                      </span>
                                    )}
                                    {task.bulletinPostId && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 shrink-0">
                                        Buletin #{task.bulletinPostId}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Frekuensi / Cadence */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-2xs ${routineInfo.color}`}>
                                {routineInfo.label}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <NotionDropdownCell
                                type="status"
                                value={task.status}
                                onChange={(newVal) => handleStatusChange(task.id, newVal)}
                                optionsOverride={statusOptionsOverride}
                              />
                            </td>

                            {/* Prioritas */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                task.priority === 'Urgent'
                                  ? 'bg-rose-100 text-rose-950 border border-rose-400 animate-pulse'
                                  : task.priority === 'High'
                                  ? 'bg-amber-100 text-amber-950 border border-amber-400'
                                  : task.priority === 'Low'
                                  ? 'bg-slate-100 text-slate-800 border border-slate-300'
                                  : 'bg-blue-100 text-blue-950 border border-blue-300'
                              }`}>
                                {task.priority}
                              </span>
                            </td>

                            {/* PIC Pelaksana */}
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1 items-center max-w-[180px]">
                                {picList.map((p, pIdx) => (
                                  <span 
                                    key={pIdx}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 truncate"
                                    title={`${p.name} (${p.nik || '-'})`}
                                  >
                                    <span className="w-3.5 h-3.5 rounded-full bg-teal-600 text-white text-[9px] flex items-center justify-center font-mono font-bold shrink-0">
                                      {p.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="truncate max-w-[90px]">{p.name}</span>
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* Mulai & Durasi */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="text-[11px] font-medium" title={`Mulai: ${durationInfo.displayStartDate}`}>
                                <p className="font-bold text-slate-700 dark:text-slate-300">{durationInfo.durationLabel}</p>
                                <p className="text-[10px] text-slate-500">Mulai: {durationInfo.displayStartDate}</p>
                              </div>
                            </td>

                            {/* Progress */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 w-24">
                                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      isDone ? 'bg-emerald-500' : isInProgress ? 'bg-teal-600' : progressPercent > 0 ? 'bg-sky-500' : 'bg-slate-400'
                                    }`}
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 min-w-[28px] text-right">
                                  {progressPercent}%
                                </span>
                              </div>
                            </td>

                            {/* Aksi */}
                            <td className="text-center px-2 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveTaskToBacklog(task.id)}
                                  className="p-1 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
                                  title="Kembalikan kegiatan ini ke Evaluasi & Backlog Kemarin"
                                >
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openJobPendingModal(task)}
                                  className="p-1 rounded-lg text-slate-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer"
                                  title="Alihkan PIC / Set Job Pending"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyToNewTask(task)}
                                  className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                                  title="Salin tugas ini ke penugasan baru"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(task)}
                                  className="p-1 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors cursor-pointer"
                                  title="Edit Rincian Tugas"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTaskToDelete(task)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  title="Hapus Tugas"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Nested Subtask Checklist Dropdown Row */}
                          {isExpanded && (
                            <tr className={`${isNotionLight ? 'bg-slate-50/70' : 'bg-black/30'}`}>
                              <td colSpan={10} className="px-6 py-3 border-b border-slate-200 dark:border-slate-800">
                                <div className="space-y-2 max-w-4xl">
                                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                      <CheckSquare className="w-3.5 h-3.5 text-teal-600" />
                                      <span>Rincian Subtask ({parsed.completed}/{parsed.total})</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTaskDetail(task)}
                                      className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                                    >
                                      <span>Buka Panel Detail Notion</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  </div>

                                  {parsed.items && parsed.items.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {parsed.items.map((item, itmIdx) => {
                                        const rawNotes: SubtaskNote[] = (item.notes && item.notes.length > 0)
                                          ? item.notes
                                          : (item.note ? [{ id: 'legacy-1', text: item.note, date: item.noteDate || '', time: '', author: '' }] : []);
                                        const noteCount = rawNotes.length;

                                        return (
                                          <div
                                            key={item.index}
                                            draggable={true}
                                            onDragStart={(e) => {
                                              e.dataTransfer.setData('text/plain', String(itmIdx));
                                              setCardDragIdx({ taskId: task.id, itemIdx: itmIdx });
                                            }}
                                            onDragOver={(e) => {
                                              e.preventDefault();
                                              e.dataTransfer.dropEffect = 'move';
                                              if (cardDragOverIdx?.taskId === task.id && cardDragOverIdx?.itemIdx !== itmIdx) {
                                                setCardDragOverIdx({ taskId: task.id, itemIdx: itmIdx });
                                              }
                                            }}
                                            onDragLeave={() => {
                                              if (cardDragOverIdx?.taskId === task.id && cardDragOverIdx?.itemIdx === itmIdx) {
                                                setCardDragOverIdx(null);
                                              }
                                            }}
                                            onDrop={(e) => {
                                              e.preventDefault();
                                              handleDropCardSubtask(task, itmIdx);
                                            }}
                                            onDragEnd={() => {
                                              setCardDragIdx(null);
                                              setCardDragOverIdx(null);
                                            }}
                                            className={`flex items-center gap-2 p-1.5 px-2.5 rounded-lg border text-xs transition-all ${
                                              cardDragIdx?.taskId === task.id && cardDragIdx?.itemIdx === itmIdx
                                                ? 'opacity-40 border-2 border-dashed border-teal-500 bg-teal-50/50'
                                                : item.checked
                                                ? 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                                                : isNotionLight
                                                ? 'bg-white border-slate-300 hover:border-teal-500'
                                                : 'bg-[#202020] border-slate-700 hover:border-teal-500'
                                            }`}
                                          >
                                            <div className="cursor-grab active:cursor-grabbing p-0.5 text-slate-400 hover:text-teal-600">
                                              <GripVertical className="w-3.5 h-3.5" />
                                            </div>

                                            <input
                                              type="checkbox"
                                              checked={item.checked}
                                              onChange={() => handleToggleSubtask(task, item.index)}
                                              className="w-3.5 h-3.5 rounded border-slate-400 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                            />

                                            <span className={`flex-1 break-words ${item.checked ? 'line-through text-slate-400' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
                                              {item.text}
                                            </span>

                                            {item.checkedDate && (
                                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                {item.checkedDate}
                                              </span>
                                            )}

                                            <button
                                              type="button"
                                              onClick={() => openSubtaskNoteModal(task, item.index, item.text, rawNotes, false)}
                                              className={`relative p-1 rounded-md transition-colors cursor-pointer ${
                                                noteCount > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                              }`}
                                              title={noteCount > 0 ? `${noteCount} Catatan Subtask` : 'Tambah Catatan Subtask'}
                                            >
                                              <AlertCircle className="w-3.5 h-3.5" />
                                              {noteCount > 0 && (
                                                <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 rounded-full bg-rose-600 text-white font-mono text-[8px] font-black flex items-center justify-center">
                                                  {noteCount}
                                                </span>
                                              )}
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-500 italic">Tidak ada checklist terdaftar pada tugas ini.</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )
                )}

                {/* ------------------------------------------------------------- */}
                {/* GROUP 2: EVALUASI & PROGRES KEMARIN / BACKLOG                */}
                {/* ------------------------------------------------------------- */}
                <tr
                  onClick={() => toggleGroup('yesterday')}
                  onDragOver={(e) => {
                    if (dragSourceColumn === 'planning') {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (!isDragOverYesterday) setIsDragOverYesterday(true);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setIsDragOverYesterday(false);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOverYesterday(false);
                    const data = e.dataTransfer.getData('text/plain');
                    try {
                      const parsed = JSON.parse(data);
                      if (parsed.taskId && parsed.fromColumn === 'planning') {
                        handleMoveTaskToBacklog(parsed.taskId);
                      }
                    } catch (err) {
                      if (draggedLogbookTaskId && dragSourceColumn === 'planning') {
                        handleMoveTaskToBacklog(draggedLogbookTaskId);
                      }
                    }
                  }}
                  className={`cursor-pointer select-none transition-colors border-y font-medium text-xs ${
                    isDragOverYesterday
                      ? 'bg-amber-500/20 border-amber-500 ring-2 ring-amber-400'
                      : isNotionLight
                      ? 'bg-amber-50/70 hover:bg-amber-100/60 text-amber-950 border-amber-200'
                      : 'bg-amber-950/40 hover:bg-amber-950/70 text-amber-300 border-amber-800'
                  }`}
                >
                  <td colSpan={10} className="px-3.5 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-[11px] text-amber-600 dark:text-amber-400 select-none">
                          {collapsedGroups.yesterday ? '▶' : '▼'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                          <span className="font-black text-sm tracking-tight text-amber-950 dark:text-amber-200">
                            ⏳ 2. EVALUASI & PROGRES KEMARIN / BACKLOG
                          </span>
                        </div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono font-black ${
                          isNotionLight ? 'bg-amber-200/80 text-amber-950' : 'bg-amber-900 text-amber-200'
                        }`}>
                          {tableYesterdayTasks.length} kegiatan
                        </span>
                        {isDragOverYesterday && (
                          <span className="text-xs font-black text-amber-700 dark:text-amber-300 animate-pulse pl-2">
                            ← Lepaskan di sini untuk kembalikan ke Backlog Kemarin
                          </span>
                        )}
                      </div>

                      {/* Scope Switcher & Management Report Copy */}
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center bg-white/80 dark:bg-slate-900 p-0.5 rounded-xl border border-amber-300 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setEvalScope('yesterday')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              evalScope === 'yesterday'
                                ? 'bg-amber-500 text-black font-black shadow-xs'
                                : 'text-slate-700 dark:text-slate-300 hover:text-black'
                            }`}
                            title="Tampilkan khusus pekerjaan shift/hari kemarin (H-1)"
                          >
                            📅 Kemarin ({yesterdayTasks.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setEvalScope('all_carryover')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              evalScope === 'all_carryover'
                                ? 'bg-slate-900 text-white font-black shadow-xs'
                                : 'text-slate-700 dark:text-slate-300 hover:text-black'
                            }`}
                            title="Tampilkan seluruh akumulasi carry-over / backlog dari hari-hari sebelumnya"
                          >
                            ⏳ Semua Backlog ({carryOverTasks.length})
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleCopyYesterdayManagementReport}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
                          title="Salin rekap capaian kemarin untuk dikirim ke WhatsApp Manajemen"
                        >
                          <Copy className="w-3 h-3" />
                          <span className="hidden sm:inline">Salin Laporan Manajemen</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* Rows under Group 2 */}
                {!collapsedGroups.yesterday && (
                  tableYesterdayTasks.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-xs text-slate-500 italic bg-amber-50/10">
                        Nihil tugas dalam kategori ini. Semua pekerjaan kemarin telah selesai atau tidak ada backlog aktif.
                      </td>
                    </tr>
                  ) : (
                    tableYesterdayTasks.map((task, idx) => {
                      const parsed = parseTasklist(task.description || '');
                      const hasSubtasks = parsed.hasTasklist && parsed.total > 0;
                      const isDone = task.status === 'Resolved' || task.status === 'Done' || task.status === 'Closed';
                      const isPending = task.isPending || task.status === 'Pending';
                      const isInProgress = task.status === 'In Progress' || task.status === 'On Progress';
                      const isExpanded = expandedTaskIds.has(task.id);
                      const picList = parsePicList(task.assigneeNik, task.assigneeName);
                      const durationInfo = getTaskDurationInfo(task, selectedDate);
                      const progressPercent = calculateTaskProgress(task);
                      const routineInfo = getTaskRoutineInfo(task, selectedDate);

                      return (
                        <React.Fragment key={task.id}>
                          <tr
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', JSON.stringify({ taskId: task.id, fromColumn: 'progress' }));
                              setDraggedLogbookTaskId(task.id);
                              setDragSourceColumn('progress');
                            }}
                            onDragEnd={() => {
                              setDraggedLogbookTaskId(null);
                              setDragSourceColumn(null);
                              setIsDragOverToday(false);
                              setIsDragOverYesterday(false);
                            }}
                            className={`transition-colors group ${
                              draggedLogbookTaskId === task.id ? 'opacity-40 bg-amber-50/50' : ''
                            } ${
                              isDone 
                                ? isNotionLight ? 'bg-emerald-50/20 hover:bg-emerald-50/40' : 'bg-emerald-950/10 hover:bg-emerald-950/20'
                                : isPending
                                ? isNotionLight ? 'bg-amber-50/30 hover:bg-amber-50/50' : 'bg-amber-950/10 hover:bg-amber-950/20'
                                : isNotionLight
                                ? 'bg-white hover:bg-slate-50'
                                : 'bg-[#191919] hover:bg-[#202020]'
                            }`}
                          >
                            {/* Drag Handle */}
                            <td className="text-center px-1 py-2 cursor-grab active:cursor-grabbing text-slate-400 hover:text-amber-600">
                              <GripVertical className="w-3.5 h-3.5 mx-auto" />
                            </td>

                            {/* No */}
                            <td className="text-center font-mono text-[11px] px-2 py-2.5 text-slate-500">
                              {idx + 1}
                            </td>

                            {/* Kegiatan / Arahan Tugas */}
                            <td className="px-3.5 py-2.5">
                              <div className="flex items-start gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(task.id);
                                  }}
                                  className={`p-0.5 rounded transition-transform mt-0.5 cursor-pointer ${
                                    isExpanded ? 'rotate-90 text-amber-600' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                  }`}
                                  title={isExpanded ? 'Tutup subtask checklist' : 'Buka subtask checklist'}
                                >
                                  <ChevronRight className="w-3.5 h-3.5" />
                                </button>

                                <div className="min-w-0 flex-1">
                                  <div 
                                    onClick={() => setSelectedTaskDetail(task)}
                                    className="font-bold text-xs sm:text-sm cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 hover:underline transition-colors flex items-center gap-1.5 flex-wrap"
                                    style={{ color: isDone ? '#64748b' : isNotionLight ? '#0f172a' : '#f8fafc' }}
                                  >
                                    <span className={isDone ? 'line-through opacity-75' : ''}>{task.title}</span>
                                    {hasSubtasks && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 font-bold shrink-0">
                                        ✓ {parsed.completed}/{parsed.total}
                                      </span>
                                    )}
                                    {task.bulletinPostId && (
                                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 shrink-0">
                                        Buletin #{task.bulletinPostId}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Frekuensi / Cadence */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-2xs ${routineInfo.color}`}>
                                {routineInfo.label}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="px-3 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${
                                isDone 
                                  ? 'bg-emerald-100 text-emerald-950 border-emerald-400' 
                                  : isInProgress 
                                  ? 'bg-amber-100 text-amber-950 border-amber-400' 
                                  : 'bg-slate-100 text-slate-900 border-slate-300'
                              }`}>
                                {isDone ? <CheckCircle2 className="w-3 h-3 text-emerald-700" /> : <Clock className="w-3 h-3 text-amber-700" />}
                                <span>{task.status}</span>
                              </span>
                            </td>

                            {/* Prioritas */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                                task.priority === 'Urgent'
                                  ? 'bg-rose-100 text-rose-950 border border-rose-400 animate-pulse'
                                  : task.priority === 'High'
                                  ? 'bg-amber-100 text-amber-950 border border-amber-400'
                                  : task.priority === 'Low'
                                  ? 'bg-slate-100 text-slate-800 border border-slate-300'
                                  : 'bg-blue-100 text-blue-950 border border-blue-300'
                              }`}>
                                {task.priority}
                              </span>
                            </td>

                            {/* PIC Pelaksana */}
                            <td className="px-3 py-2.5">
                              <div className="flex flex-wrap gap-1 items-center max-w-[180px]">
                                {picList.map((p, pIdx) => (
                                  <span 
                                    key={pIdx}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 truncate"
                                    title={`${p.name} (${p.nik || '-'})`}
                                  >
                                    <span className="w-3.5 h-3.5 rounded-full bg-amber-600 text-white text-[9px] flex items-center justify-center font-mono font-bold shrink-0">
                                      {p.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="truncate max-w-[90px]">{p.name}</span>
                                  </span>
                                ))}
                              </div>
                            </td>

                            {/* Mulai & Durasi */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="text-[11px] font-medium" title={`Mulai: ${durationInfo.displayStartDate}`}>
                                <p className="font-bold text-slate-700 dark:text-slate-300">{durationInfo.durationLabel}</p>
                                <p className="text-[10px] text-slate-500">Mulai: {durationInfo.displayStartDate}</p>
                              </div>
                            </td>

                            {/* Progress */}
                            <td className="px-3 py-2.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 w-24">
                                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      isDone ? 'bg-emerald-500' : isInProgress ? 'bg-amber-500' : progressPercent > 0 ? 'bg-sky-500' : 'bg-slate-400'
                                    }`}
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 min-w-[28px] text-right">
                                  {progressPercent}%
                                </span>
                              </div>
                            </td>

                            {/* Aksi */}
                            <td className="text-center px-2 py-2.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveTaskToToday(task.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-all cursor-pointer shadow-2xs"
                                  title="Jadwalkan kegiatan ini ke Planning Hari Ini"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                  <span>Planning</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleCopyToNewTask(task)}
                                  className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
                                  title="Salin tugas ini ke penugasan baru"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setTaskToDelete(task)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                  title="Hapus Tugas"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Nested Subtask Checklist Dropdown Row */}
                          {isExpanded && (
                            <tr className={`${isNotionLight ? 'bg-slate-50/70' : 'bg-black/30'}`}>
                              <td colSpan={10} className="px-6 py-3 border-b border-slate-200 dark:border-slate-800">
                                <div className="space-y-2 max-w-4xl">
                                  <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
                                    <span className="font-bold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                      <CheckSquare className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Rincian Subtask ({parsed.completed}/{parsed.total})</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedTaskDetail(task)}
                                      className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                                    >
                                      <span>Buka Panel Detail Notion</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </button>
                                  </div>

                                  {parsed.items && parsed.items.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {parsed.items.map((item) => {
                                        const rawNotes: SubtaskNote[] = (item.notes && item.notes.length > 0)
                                          ? item.notes
                                          : (item.note ? [{ id: 'legacy-1', text: item.note, date: item.noteDate || '', time: '', author: '' }] : []);
                                        const noteCount = rawNotes.length;

                                        return (
                                          <div
                                            key={item.index}
                                            className={`flex items-center gap-2 p-1.5 px-2.5 rounded-lg border text-xs ${
                                              item.checked
                                                ? 'bg-slate-100/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                                                : isNotionLight
                                                ? 'bg-white border-slate-300'
                                                : 'bg-[#202020] border-slate-700'
                                            }`}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={item.checked}
                                              disabled={true}
                                              className="w-3.5 h-3.5 rounded border-slate-400 text-teal-600 cursor-not-allowed opacity-75"
                                            />

                                            <span className={`flex-1 break-words ${item.checked ? 'line-through text-slate-400' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
                                              {item.text}
                                            </span>

                                            {item.checkedDate && (
                                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                {item.checkedDate}
                                              </span>
                                            )}

                                            {noteCount > 0 && (
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                                {noteCount} Catatan
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-500 italic">Tidak ada checklist terdaftar pada tugas ini.</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. NOTION KANBAN BOARD VIEW (`viewMode === 'board'`)                      */}
        {/* ========================================================================= */}
        {viewMode === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
            {[
              { statusKey: 'OPEN', label: 'Open', colorClass: 'border-t-sky-500 bg-sky-50/30 dark:bg-sky-950/10' },
              { statusKey: 'ON PROGRESS', label: 'On Progress', colorClass: 'border-t-amber-500 bg-amber-50/30 dark:bg-amber-950/10' },
              { statusKey: 'PENDING', label: 'Pending / Job Handover', colorClass: 'border-t-purple-500 bg-purple-50/30 dark:bg-purple-950/10' },
              { statusKey: 'CLOSED', label: 'Closed / Selesai', colorClass: 'border-t-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/10' },
            ].map(({ statusKey, label, colorClass }) => {
              const allBoardTasks = [...filteredToday, ...displayedYesterdayTasks];
              const colTasks = allBoardTasks.filter(t => {
                const s = (t.status || '').toUpperCase();
                if (statusKey === 'OPEN') return s === 'OPEN';
                if (statusKey === 'ON PROGRESS') return s === 'IN PROGRESS' || s === 'ON PROGRESS';
                if (statusKey === 'PENDING') return t.isPending || s === 'PENDING';
                if (statusKey === 'CLOSED') return s === 'CLOSED' || s === 'RESOLVED' || s === 'DONE';
                return false;
              });

              return (
                <div 
                  key={statusKey}
                  className={`rounded-2xl border border-t-4 p-3.5 space-y-3 shadow-xs ${colorClass} ${
                    isNotionLight ? 'bg-white border-slate-200' : 'bg-[#191919] border-[#334155]'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-xs tracking-tight text-slate-800 dark:text-slate-200 uppercase">
                      {label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                    {colTasks.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 italic">
                        Tidak ada kegiatan
                      </div>
                    ) : (
                      colTasks.map((task) => {
                        const parsed = parseTasklist(task.description || '');
                        const hasSub = parsed.hasTasklist && parsed.total > 0;
                        const durationInfo = getTaskDurationInfo(task, selectedDate);
                        const isDone = task.status === 'Resolved' || task.status === 'Done' || task.status === 'Closed';

                        return (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTaskDetail(task)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer shadow-2xs hover:shadow-md hover:scale-[1.01] space-y-2 ${
                              isNotionLight ? 'bg-white border-slate-200 hover:border-teal-500' : 'bg-[#222222] border-slate-700 hover:border-teal-500'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-[10px] font-black px-1.5 py-0.2 rounded uppercase ${
                                task.priority === 'Urgent' ? 'bg-rose-100 text-rose-950 border border-rose-300' :
                                task.priority === 'High' ? 'bg-amber-100 text-amber-950 border border-amber-300' :
                                'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                              }`}>
                                {task.priority}
                              </span>
                              <span className="text-[10px] font-mono text-slate-500">
                                {task.section}
                              </span>
                            </div>

                            <p className={`font-bold text-xs leading-snug line-clamp-2 ${isDone ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                              {task.title}
                            </p>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500">
                              <span>PIC: {task.assigneeName.split(' ')[0]}</span>
                              {hasSub && (
                                <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                                  ✓ {parsed.completed}/{parsed.total}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. NOTION CARDS LIST VIEW (`viewMode === 'list'`)                         */}
        {/* ========================================================================= */}
        {viewMode === 'list' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Column Kiri: Progres & Evaluasi Kemarin */}
            <div className={`rounded-3xl p-5 space-y-4 border ${isNotionLight ? 'bg-white border-slate-200' : 'bg-[#191919] border-[#334155]'}`}>
              <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>1. Progres & Evaluasi Kemarin ({displayedYesterdayTasks.length})</span>
                </h3>
              </div>
              <div className="space-y-2.5">
                {displayedYesterdayTasks.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-8 text-center">Nihil kegiatan.</p>
                ) : (
                  displayedYesterdayTasks.map(task => renderTaskCard(task, true, evalScope === 'yesterday', evalScope))
                )}
              </div>
            </div>

            {/* Column Kanan: Planning & Arahan Hari Ini */}
            <div className={`rounded-3xl p-5 space-y-4 border ${isNotionLight ? 'bg-white border-slate-200' : 'bg-[#191919] border-[#334155]'}`}>
              <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
                <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                  <span>2. Planning & Arahan Hari Ini ({filteredToday.length})</span>
                </h3>
                <button
                  type="button"
                  onClick={openAssignModal}
                  className="px-3 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>
              <div className="space-y-2.5">
                {filteredToday.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-8 text-center">Belum ada tugas hari ini.</p>
                ) : (
                  filteredToday.map(task => renderTaskCard(task, false, false))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SLIDE-OVER DETAIL DRAWER (Exact Notion Page View Experience)              */}
        {/* ========================================================================= */}
        {selectedTaskDetail && (
          <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
            {/* Backdrop */}
            <div 
              onClick={() => setSelectedTaskDetail(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
            />

            {/* Drawer Panel */}
            <div 
              onClick={(e) => e.stopPropagation()}
              className={`relative z-10 w-full max-w-2xl h-full shadow-2xl border-l flex flex-col overflow-hidden animate-in slide-in-from-right duration-250 ${
                isNotionLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#191919] border-[#334155] text-slate-100'
              }`}
            >
              {/* Drawer Top Navigation & Actions */}
              <div className="p-4 border-b flex items-center justify-between border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                    <ClipboardCheck className="w-4 h-4" />
                  </span>
                  <span>Log Book</span>
                  <span>/</span>
                  <span className="text-teal-600 dark:text-teal-400 font-bold">{selectedTaskDetail.section}</span>
                  <span>/</span>
                  <span>{selectedTaskDetail.pt}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyToNewTask(selectedTaskDetail)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                    title="Salin tugas ini ke penugasan baru"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const t = selectedTaskDetail;
                      setSelectedTaskDetail(null);
                      openEditModal(t);
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-teal-600 transition-colors cursor-pointer"
                    title="Edit Tugas"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTaskDetail(null)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Drawer Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                {/* Title */}
                <div>
                  <h2 className="text-xl sm:text-2xl font-black leading-snug tracking-tight text-slate-900 dark:text-slate-100">
                    {selectedTaskDetail.title}
                  </h2>
                </div>

                {/* Notion 2-Column Key-Value Properties Table */}
                <div className="rounded-2xl border divide-y border-slate-200 dark:border-slate-800 divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {/* Status */}
                  <div className="grid grid-cols-3 p-3 items-center">
                    <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                      Status
                    </span>
                    <div className="col-span-2">
                      <NotionDropdownCell
                        type="status"
                        value={selectedTaskDetail.status}
                        onChange={(newVal) => {
                          handleStatusChange(selectedTaskDetail.id, newVal);
                          setSelectedTaskDetail(prev => prev ? { ...prev, status: newVal } : null);
                        }}
                      />
                    </div>
                  </div>

                  {/* Prioritas */}
                  <div className="grid grid-cols-3 p-3 items-center">
                    <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                      Prioritas
                    </span>
                    <div className="col-span-2">
                      <span className={`text-[11px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${
                        selectedTaskDetail.priority === 'Urgent'
                          ? 'bg-rose-100 text-rose-950 border border-rose-400'
                          : selectedTaskDetail.priority === 'High'
                          ? 'bg-amber-100 text-amber-950 border border-amber-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                      }`}>
                        {selectedTaskDetail.priority}
                      </span>
                    </div>
                  </div>

                  {/* PIC Pelaksana */}
                  <div className="grid grid-cols-3 p-3 items-center">
                    <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      PIC Pelaksana
                    </span>
                    <div className="col-span-2 flex flex-wrap gap-1.5">
                      {parsePicList(selectedTaskDetail.assigneeNik, selectedTaskDetail.assigneeName).map((p, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 font-bold text-xs">
                          <span>{p.name}</span>
                          {p.nik && <span className="opacity-75 font-mono text-[10px]">({p.nik})</span>}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Frekuensi Cadence */}
                  <div className="grid grid-cols-3 p-3 items-center">
                    <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                      Frekuensi
                    </span>
                    <div className="col-span-2">
                      {(() => {
                        const rInfo = getTaskRoutineInfo(selectedTaskDetail, selectedDate);
                        return (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${rInfo.color}`}>
                            {rInfo.label} • {rInfo.windowDesc}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Mulai & Durasi */}
                  <div className="grid grid-cols-3 p-3 items-center">
                    <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Mulai & Durasi
                    </span>
                    <div className="col-span-2 text-xs font-semibold">
                      {(() => {
                        const dur = getTaskDurationInfo(selectedTaskDetail, selectedDate);
                        return (
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-800 dark:text-slate-200">{dur.durationLabel}</p>
                            <p className="text-[11px] text-slate-500">Mulai: {dur.displayStartDate}</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Dokumen Buletin */}
                  <div className="grid grid-cols-3 p-3 items-center">
                    <span className="font-semibold text-slate-500 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      Buletin
                    </span>
                    <div className="col-span-2">
                      {selectedTaskDetail.bulletinPostId ? (
                        <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-teal-700 bg-teal-50 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-700 px-2 py-0.5 rounded-lg">
                          Buletin #{selectedTaskDetail.bulletinPostId}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Belum terhubung ke dokumen Buletin</span>
                      )}
                    </div>
                  </div>

                  {/* Job Pending Handover */}
                  {selectedTaskDetail.isPending && (
                    <div className="grid grid-cols-3 p-3 items-center bg-amber-500/10">
                      <span className="font-semibold text-amber-700 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Job Pending
                      </span>
                      <div className="col-span-2 text-xs text-amber-900 dark:text-amber-200">
                        <p className="font-bold">Dialihkan ke: {selectedTaskDetail.pendingPicName || '-'}</p>
                        {selectedTaskDetail.pendingReason && <p className="text-[11px]">Alasan: {selectedTaskDetail.pendingReason}</p>}
                      </div>
                    </div>
                  )}
                </div>

                {/* Subtask Checklist Section */}
                {(() => {
                  const parsed = parseTasklist(selectedTaskDetail.description || '');
                  if (!parsed.hasTasklist || !parsed.items) return null;

                  return (
                    <div className="space-y-3 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-4 h-4 text-teal-600" />
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                            Checklist Subtask ({parsed.completed}/{parsed.total})
                          </h4>
                        </div>
                        <span className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400">
                          {Math.round((parsed.completed / parsed.total) * 100)}% Selesai
                        </span>
                      </div>

                      <div className="space-y-2">
                        {parsed.items.map((item) => {
                          const rawNotes: SubtaskNote[] = (item.notes && item.notes.length > 0)
                            ? item.notes
                            : (item.note ? [{ id: 'legacy-1', text: item.note, date: item.noteDate || '', time: '', author: '' }] : []);

                          return (
                            <div
                              key={item.index}
                              className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-colors ${
                                item.checked
                                  ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                                  : 'bg-white dark:bg-[#222222] border-slate-300 dark:border-slate-700 shadow-2xs'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={() => handleToggleSubtask(selectedTaskDetail, item.index)}
                                className="w-4 h-4 rounded border-slate-400 text-teal-600 focus:ring-teal-500 cursor-pointer"
                              />
                              <span className={`flex-1 text-xs break-words ${item.checked ? 'line-through text-slate-400' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
                                {item.text}
                              </span>
                              {item.checkedDate && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 shrink-0">
                                  {item.checkedDate}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => openSubtaskNoteModal(selectedTaskDetail, item.index, item.text, rawNotes, false)}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                                  rawNotes.length > 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                                title="Catatan Subtask"
                              >
                                <AlertCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Deskripsi & Notulensi Tambahan */}
                {selectedTaskDetail.description && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">Deskripsi / Notulensi</h4>
                    <div 
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#202020] text-xs leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: markdownToVisualHtml(selectedTaskDetail.description) }}
                    />
                  </div>
                )}
              </div>

              {/* Drawer Bottom Actions */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 bg-slate-50 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => {
                    const isToday = filteredToday.some(t => t.id === selectedTaskDetail.id);
                    if (isToday) {
                      handleMoveTaskToBacklog(selectedTaskDetail.id);
                    } else {
                      handleMoveTaskToToday(selectedTaskDetail.id);
                    }
                    setSelectedTaskDetail(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {filteredToday.some(t => t.id === selectedTaskDetail.id) ? (
                    <>
                      <ArrowLeft className="w-4 h-4" />
                      <span>Kembalikan ke Backlog</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>Jadwalkan ke Planning Hari Ini</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const t = selectedTaskDetail;
                      setSelectedTaskDetail(null);
                      openEditModal(t);
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const t = selectedTaskDetail;
                      setSelectedTaskDetail(null);
                      setTaskToDelete(t);
                    }}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                    title="Hapus Kegiatan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN NEW TASK (Mendukung Multi-PIC & PIC Job Pending)             */}
      {/* ========================================================================= */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-3xl rounded-3xl border-2 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 bg-white text-black border-slate-300"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b flex items-center justify-between border-slate-200">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-teal-100 text-teal-900 border border-teal-300">
                  <Briefcase className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-base text-black">Assign Tugas / Arahan Kegiatan Seksi</h3>
                  <p className="text-[11px] font-bold text-slate-700">
                    Tugaskan kegiatan ke satu atau lebih PIC & otomatis sinkronkan ke dokumen Buletin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-black transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAssignTaskSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Quick Template Selector Bar */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-teal-50 via-emerald-50/50 to-white border-2 border-teal-300 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-teal-950">
                    <Bookmark className="w-3.5 h-3.5 text-teal-700" />
                    <span>Template Tugas Siap Pakai:</span>
                  </div>
                  {newTitle.trim() && (
                    <button
                      type="button"
                      onClick={() => setShowSaveTemplateDialog(true)}
                      className="text-[11px] font-black text-teal-800 hover:text-teal-950 hover:underline cursor-pointer flex items-center gap-1"
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
                    className="flex-1 px-2.5 py-1.5 rounded-xl border-2 text-xs font-bold cursor-pointer outline-none focus:border-teal-500 bg-white text-black border-slate-400"
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
                    className="px-2.5 py-1.5 rounded-xl border-2 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer bg-white text-black border-slate-400"
                  >
                    Kelola
                  </button>
                </div>
              </div>

              {/* Judul Kegiatan */}
              <div className="space-y-1">
                <label className="text-xs font-black block text-black">Judul Kegiatan / Arahan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kalibrasi Furnace & Pembuatan Reagen Baru..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 outline-none text-xs font-bold focus:border-teal-500 bg-white text-black border-slate-400 placeholder:text-slate-500 shadow-2xs"
                />
              </div>

              {/* Seksi Pelaksana */}
              {(isSuperAdmin || isMeetingRoom || userSection === 'ALL') ? (
                <div className="space-y-1.5 p-3 rounded-2xl border-2 bg-slate-50 border-teal-300">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-black flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600 animate-pulse" />
                      <span>Seksi Pelaksana Tugas *</span>
                    </label>
                    <span className="text-[10px] text-teal-800 font-bold bg-teal-100 px-2 py-0.5 rounded-full border border-teal-300">
                      Pilihan Semua Seksi
                    </span>
                  </div>
                  <select
                    value={targetTaskSection}
                    onChange={(e) => setTargetTaskSection(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 text-xs font-bold bg-white text-black border-slate-400 outline-none focus:border-teal-500 cursor-pointer shadow-2xs"
                  >
                    <option value="Preparation">Preparation</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Quality Assurance">Quality Assurance</option>
                    <option value="Inventory Control">Inventory Control</option>
                    <option value="Administration">Administration</option>
                  </select>
                </div>
              ) : (
                <div 
                  className="p-3 rounded-2xl border-2 flex items-center justify-between bg-slate-50 border-slate-300"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                    <span className="text-xs font-black text-black">Seksi Pelaksana:</span>
                    <span className="text-xs font-black text-teal-950 bg-teal-100 px-2.5 py-0.5 rounded-md border border-teal-300">
                      {userSection}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-600 font-bold italic">Otomatis terkunci</span>
                </div>
              )}

              {/* Pilih PIC Bawahan (Multi-PIC Searchable Select) */}
              <SearchableMultiPicSelect
                selectedNiks={newAssigneeNiks}
                selectedNames={newAssigneeNames}
                onChange={(niks, names) => {
                  setNewAssigneeNiks(niks);
                  setNewAssigneeNames(names);
                }}
                employees={employeesList}
                defaultSection={(isSuperAdmin || isMeetingRoom || userSection === 'ALL') ? targetTaskSection : userSection}
              />

              {/* Toggle Opsi PIC Job Pending */}
              <div className="p-3 rounded-2xl border-2 border-amber-300 bg-amber-50/60 space-y-3">
                <label className="flex items-center gap-2 text-xs font-black text-amber-950 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isAssignPending}
                    onChange={(e) => setIsAssignPending(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span>Tandai sebagai PIC Job Pending (Pekerjaan Tertunda / Handover)</span>
                </label>

                {isAssignPending && (
                  <div className="space-y-3 pt-1 border-t border-amber-300">
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
                      <label className="text-xs font-black block text-black">
                        Alasan / Kendala Pending *
                      </label>
                      <input
                        type="text"
                        required={isAssignPending}
                        placeholder="Contoh: Menunggu sampel batch sore, spare part reagen belum tiba..."
                        value={newPendingReason}
                        onChange={(e) => setNewPendingReason(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border-2 outline-none text-xs font-bold focus:border-amber-500 bg-white text-black border-amber-400 shadow-2xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Klasifikasi Kegiatan, Prioritas, & Target Jam Selesai (Target Tanggal Selesai Dihilangkan) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black block text-black">Klasifikasi</label>
                  <select
                    value={newActivityType}
                    onChange={(e) => setNewActivityType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 outline-none text-xs font-bold cursor-pointer bg-white text-black border-slate-400 focus:border-teal-500 shadow-2xs"
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
                  <label className="text-xs font-black block text-black">Prioritas</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 outline-none text-xs font-bold cursor-pointer bg-white text-black border-slate-400 focus:border-teal-500 shadow-2xs"
                  >
                    {PRIORITY_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black block text-black">Tanggal Dimulai</label>
                    <span className="text-[10px] text-teal-800 font-black">Bisa tgl lampau</span>
                  </div>
                  <input
                    type="date"
                    value={newTaskDate}
                    onChange={(e) => {
                      setNewTaskDate(e.target.value);
                      if (!newTargetDate) setNewTargetDate(e.target.value);
                    }}
                    className="w-full px-3 py-2 rounded-xl border-2 outline-none text-xs font-bold cursor-pointer focus:border-teal-500 bg-white text-black border-slate-400 shadow-2xs"
                  />
                  <p className="text-[10px] font-bold text-slate-600">
                    Bisa dipilih tanggal lampau jika project sudah on-going.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black block text-black">Target Jam (Opsional)</label>
                    <span className="text-[10px] text-teal-800 font-bold">Default: 23:59</span>
                  </div>
                  <input
                    type="time"
                    value={newTargetTime}
                    onChange={(e) => setNewTargetTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 outline-none text-xs font-bold cursor-pointer focus:border-teal-500 font-mono bg-white text-black border-slate-400 shadow-2xs"
                  />
                  <p className="text-[10px] font-bold text-slate-600">
                    Bila kosong: otomatis 23:59.
                  </p>
                </div>
              </div>

              {/* Shared Subtask Manager (Sinergi Log Book & Buletin) */}
              <div>
                <SharedSubtaskManager
                  value={newTaskDescription}
                  onChange={setNewTaskDescription}
                  label="Rincian Tugas & Checklist Subtask"
                  placeholder="Ketik butir subtask baru lalu tekan Enter..."
                  allowModeSwitch={true}
                  defaultMode="checklist"
                  currentUser={{ nik: inspectorNik, name: inspectorName }}
                  selectedDate={newTaskDate || selectedDate}
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
            className="w-full max-w-md rounded-2xl border-2 border-slate-300 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-100 bg-white text-black"
          >
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <Trash2 className="w-5 h-5 stroke-[2.5]" />
              </span>
              <div>
                <h3 className="font-black text-base text-black">Hapus Kegiatan Log Book?</h3>
                <p className="text-xs font-bold text-slate-600">Tindakan ini permanen dan akan menghapus kegiatan dari log book</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-100 border-2 border-slate-300 text-xs space-y-1.5">
              <p className="font-black text-black text-sm">{taskToDelete.title}</p>
              <p className="text-slate-800 font-bold">
                Seksi: <strong className="text-black font-black">{taskToDelete.section}</strong> • PIC: <strong className="text-black font-black">{taskToDelete.assigneeName}</strong>
              </p>
              {taskToDelete.bulletinPostId && (
                <div className="pt-2 border-t-2 border-slate-200 text-amber-900 font-black flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                  <span>Baris kegiatan pada Dokumen Buletin #{taskToDelete.bulletinPostId} juga akan otomatis terhapus secara tersinkronisasi.</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 rounded-xl border-2 border-slate-300 text-xs font-black text-black hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTask(taskToDelete)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
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
            className="w-full max-w-md rounded-2xl border-2 border-slate-300 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-100 bg-white text-black"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                  <Clock className="w-5 h-5 stroke-[2.5]" />
                </span>
                <div>
                  <h3 className="font-black text-base text-black">Atur PIC Job Pending</h3>
                  <p className="text-xs font-bold text-slate-600">Tetapkan penerima handover pekerjaan tertunda</p>
                </div>
              </div>
              <button 
                onClick={() => setPendingModalTask(null)}
                className="p-1 rounded-lg text-slate-500 hover:text-black hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-100 border-2 border-slate-300 text-xs">
              <p className="font-black text-black text-sm">{pendingModalTask.title}</p>
              <p className="text-slate-700 font-bold mt-1">PIC Saat Ini: <strong className="text-black font-black">{pendingModalTask.assigneeName}</strong></p>
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
                <label className="text-xs font-black block text-black">Alasan / Kendala Job Pending *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Contoh: Menunggu sampel batch sore, spare part reagen belum tiba, dialihkan ke shift berikutnya..."
                  value={modalPendingReason}
                  onChange={(e) => setModalPendingReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-400 bg-white text-black font-bold outline-none text-xs focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
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
                    className="text-xs text-rose-700 hover:underline font-black cursor-pointer"
                  >
                    Lepas Status Pending
                  </button>
                ) : <span />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingModalTask(null)}
                    className="px-3.5 py-1.5 rounded-xl border-2 border-slate-300 text-xs font-black text-black hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPending}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
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
            className="w-full max-w-3xl rounded-3xl border-2 border-slate-300 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] bg-white text-black"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-teal-100 text-teal-900">
                  <Edit3 className="w-5 h-5 stroke-[2.5]" />
                </span>
                <div>
                  <h3 className="font-black text-base flex items-center gap-2 text-black">
                    <span>
                      {(editingTask.assignedByNik === inspectorNik || isSupervisor)
                        ? 'Edit & Penyesuaian Tugas'
                        : 'Ajukan Draft Perubahan Tugas'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-black bg-teal-100 text-teal-950 border border-teal-400">
                      {(editingTask.assignedByNik === inspectorNik || isSupervisor) ? 'Pemberi Tugas' : 'Role: PIC'}
                    </span>
                  </h3>
                  <p className="text-[11px] font-bold text-slate-700">
                    {(editingTask.assignedByNik === inspectorNik || isSupervisor)
                      ? 'Perubahan akan langsung diperbarui dan disinkronkan ke dokumen Buletin'
                      : 'Perubahan akan disimpan sebagai draft dan dikirim ke pemberi tugas untuk di-review & approve'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-700 hover:text-black transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleEditSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 bg-white text-black">
              {/* If PIC: notice banner */}
              {!(editingTask.assignedByNik === inspectorNik || isSupervisor) && (
                <div className="p-3 rounded-2xl bg-sky-50 border-2 border-sky-300 text-sky-950 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-black text-black">Mode Pengajuan PIC (Draft Perubahan):</p>
                    <p className="text-slate-800 text-[11px] font-bold">
                      Sebagai PIC, Anda dapat menyesuaikan rincian, checklist, atau target. Draft penyesuaian akan dikirim untuk direview dan disetujui dengan 1-klik approval.
                    </p>
                  </div>
                </div>
              )}

              {/* Judul Kegiatan */}
              <div className="space-y-1">
                <label className="text-xs font-black block text-black">Judul Kegiatan / Arahan *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border-2 border-slate-400 bg-white text-black font-bold outline-none text-xs focus:border-teal-500"
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
                <div className="p-3 rounded-2xl bg-slate-100 border-2 border-slate-300 text-xs">
                  <span className="font-black text-black block">PIC Pelaksana Saat Ini:</span>
                  <span className="font-black text-teal-900">{editAssigneeName || '-'}</span>
                </div>
              )}

              {/* Klasifikasi, Prioritas, Tanggal Dimulai & Target Jam (Grid 4 Kolom, Target Tanggal Selesai Dihapus) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black block text-black">Klasifikasi</label>
                  <select
                    value={editActivityType}
                    onChange={(e) => setEditActivityType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-slate-400 bg-white text-black outline-none text-xs font-black cursor-pointer focus:border-teal-500"
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
                  <label className="text-xs font-black block text-black">Prioritas</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-slate-400 bg-white text-black outline-none text-xs font-black cursor-pointer focus:border-teal-500"
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
                    <label className="text-xs font-black block text-black">Tanggal Dimulai</label>
                    <span className="text-[10px] text-teal-800 font-black">Bisa tgl lampau</span>
                  </div>
                  <input
                    type="date"
                    value={editTaskDate}
                    onChange={(e) => setEditTaskDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-slate-400 bg-white text-black outline-none text-xs font-bold cursor-pointer focus:border-teal-500"
                  />
                  <p className="text-[10px] text-slate-700 font-bold">
                    Ubah tgl mulai jika project sudah on-going sejak lampau.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black block text-black">Target Jam</label>
                    <span className="text-[10px] text-teal-800 font-black">Default: 23:59</span>
                  </div>
                  <input
                    type="time"
                    value={editTargetTime}
                    onChange={(e) => setEditTargetTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-slate-400 bg-white text-black outline-none text-xs font-bold cursor-pointer focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              {/* Shared Subtask Manager (Sinergi Log Book & Buletin) */}
              <div>
                <SharedSubtaskManager
                  value={editDescription}
                  onChange={setEditDescription}
                  label="Rincian Tugas & Checklist Subtask"
                  placeholder="Sesuaikan petunjuk kerja atau urutan checklist..."
                  allowModeSwitch={true}
                  defaultMode={(editDescription || '').includes('- [') ? 'checklist' : 'checklist'}
                  currentUser={{ nik: inspectorNik, name: inspectorName }}
                  selectedDate={editTaskDate || editingTask.taskDate}
                />
              </div>

              {/* Hubungkan / Pindahkan Sinkronisasi ke Buletin */}
              <div className="space-y-1">
                <SearchableBulletinSelect
                  selectedId={editBulletinPostId}
                  bulletinList={bulletinList}
                  onSelect={setEditBulletinPostId}
                />
                <p className="text-[10px] text-slate-700 font-bold">
                  {editingTask.bulletinPostId 
                    ? `Saat ini terhubung ke Buletin #${editingTask.bulletinPostId}. Anda dapat memindahkan atau melepaskan tautan sinkronisasi.` 
                    : 'Tugas ini belum terkoneksi ke Buletin. Pilih dokumen buletin jika ingin menyinkronkan tugas ini.'}
                </p>
              </div>

              {/* If PIC: Required Alasan Perubahan */}
              {!(editingTask.assignedByNik === inspectorNik || isSupervisor) && (
                <div className="space-y-1">
                  <label className="text-xs font-black block text-amber-950">
                    Alasan / Keterangan Penyesuaian (Wajib untuk Pemberi Tugas) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Perubahan sampel batch, reagen kalibrasi diganti, jadwal diundur 1 jam..."
                    value={editChangeReason}
                    onChange={(e) => setEditChangeReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border-2 border-amber-400 outline-none text-xs font-bold focus:border-amber-600 bg-amber-50 text-black"
                  />
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2 rounded-xl border-2 border-slate-300 text-xs font-black text-black hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
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
              className="w-full max-w-3xl rounded-3xl border-2 border-slate-300 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh] bg-white text-black"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 border-b border-amber-200 flex items-center justify-between bg-amber-50">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-amber-500 text-white">
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  </span>
                  <div>
                    <h3 className="font-black text-base text-amber-950 flex items-center gap-2">
                      <span>Review Pengajuan Draft Perubahan</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-black bg-amber-200 text-amber-950 border border-amber-400">
                        Persetujuan Atasan
                      </span>
                    </h3>
                    <p className="text-[11px] font-bold text-amber-900">
                      Diajukan oleh: <strong className="text-black font-black">{draftObj?.proposedByName || 'PIC'}</strong>
                      {draftObj?.proposedAt && ` • ${formatDateDisplay(draftObj.proposedAt)}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewingTask(null)}
                  className="p-1.5 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer text-amber-950"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Comparison */}
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs bg-white text-black">
                {/* Alasan Perubahan */}
                <div className="p-3.5 rounded-2xl bg-amber-50 border-2 border-amber-300 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">
                    Alasan / Keterangan Penyesuaian oleh PIC:
                  </span>
                  <p className="text-xs sm:text-sm font-black text-amber-950">
                    "{draftObj?.changeReason || 'Tidak ada catatan tambahan'}"
                  </p>
                </div>

                {/* Perbandingan Data: Saat Ini vs Draft Baru */}
                <div className="space-y-3">
                  <h4 className="font-black text-xs uppercase tracking-wider text-black">
                    Rincian Perbandingan (Sebelum vs Sesudah):
                  </h4>

                  {/* Judul Perbandingan */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-100 border-2 border-slate-300">
                      <span className="text-[10px] font-black text-slate-700 block mb-1">Judul Saat Ini:</span>
                      <p className="font-black text-black">{reviewingTask.title}</p>
                    </div>
                    <div className={`p-3 rounded-xl border-2 ${
                      draftObj?.title !== reviewingTask.title
                        ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300/40'
                        : 'bg-slate-50 border-slate-300'
                    }`}>
                      <span className="text-[10px] font-black text-emerald-900 block mb-1">
                        Judul Diajukan: {draftObj?.title !== reviewingTask.title && '(Berubah)'}
                      </span>
                      <p className="font-black text-emerald-950">{draftObj?.title || reviewingTask.title}</p>
                    </div>
                  </div>

                  {/* Prioritas & Target Perbandingan */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-100 border-2 border-slate-300 space-y-1">
                      <span className="text-[10px] font-black text-slate-700 block">Target & Prioritas Saat Ini:</span>
                      <p className="font-black text-black">
                        {reviewingTask.priority} • Target: {reviewingTask.targetDate} ({reviewingTask.targetTime || '23:59'})
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-400 space-y-1">
                      <span className="text-[10px] font-black text-emerald-900 block">Target & Prioritas Diajukan:</span>
                      <p className="font-black text-emerald-950">
                        {draftObj?.priority || reviewingTask.priority} • Target: {draftObj?.targetDate || reviewingTask.targetDate} ({draftObj?.targetTime || reviewingTask.targetTime || '23:59'})
                      </p>
                    </div>
                  </div>

                  {/* Keterangan & Checklist Perbandingan */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-black text-black block">Perubahan Keterangan / Checklist:</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-slate-100 border-2 border-slate-300 max-h-[220px] overflow-y-auto text-black font-medium">
                        <span className="text-[10px] font-black text-slate-700 block mb-1">Versi Saat Ini:</span>
                        <div 
                          className="text-xs leading-relaxed text-black"
                          dangerouslySetInnerHTML={{ __html: markdownToVisualHtml(reviewingTask.description) }}
                        />
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 border-2 border-emerald-400 max-h-[220px] overflow-y-auto text-emerald-950 font-medium">
                        <span className="text-[10px] font-black text-emerald-900 block mb-1">Versi Draft Diajukan:</span>
                        <div 
                          className="text-xs leading-relaxed text-emerald-950"
                          dangerouslySetInnerHTML={{ __html: markdownToVisualHtml(draftObj?.description) }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Catatan Penolakan (Opsional jika ingin menolak) */}
                <div className="pt-2 border-t border-slate-200 space-y-1">
                  <label className="text-[11px] font-black block text-black">
                    Catatan Penolakan (Hanya diisi jika menolak draft):
                  </label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Contoh: Tolong pertahankan target jam 15:00 karena ada inspeksi sore..."
                    className="w-full px-3 py-2 rounded-xl border-2 border-slate-400 bg-white text-black font-bold outline-none text-xs focus:border-rose-400"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 sm:p-5 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setReviewingTask(null)}
                  className="px-4 py-2 rounded-xl border-2 border-slate-300 text-xs font-black text-black hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Tutup
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSubmittingReview}
                    onClick={() => handleReviewDraft('reject')}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-300 font-black text-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingReview ? 'Memproses...' : '❌ Tolak Draft'}
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingReview}
                    onClick={() => handleReviewDraft('approve')}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[2.5]" />
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
                  placeholder="Ketik catatan progres atau kendala baru (tekan Enter untuk simpan)..."
                  value={newSubtaskNoteInput}
                  onChange={(e) => setNewSubtaskNoteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (!isSavingSubtaskNote && newSubtaskNoteInput.trim()) {
                        handleAddSubtaskNote();
                      }
                    }
                  }}
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
            className="w-full max-w-lg bg-white border-2 border-slate-300 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 text-black"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-teal-200 flex items-center justify-between bg-teal-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 border border-teal-300 text-teal-800 flex items-center justify-center shadow-xs">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg flex items-center gap-2 text-black">
                    <span>Routine Task Selesai!</span>
                    <span className="text-sm">🎉</span>
                  </h3>
                  <p className="text-xs text-teal-900 font-bold">
                    Semua subtask telah 100% selesai dikerjakan
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setRoutineCompletionModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-600 hover:text-black transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs bg-white text-black">
              <div className="p-3.5 rounded-2xl bg-teal-50 border-2 border-teal-300 space-y-1.5">
                <span className="text-[10px] uppercase font-black text-teal-900 tracking-wider block">
                  Tugas Rutin Selesai
                </span>
                <h4 className="font-black text-sm sm:text-base text-black">
                  {routineCompletionModal.task.title}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-slate-800 font-bold">
                  <span>Klasifikasi: <strong className="text-black font-black">{routineCompletionModal.task.activityType || 'Routine'}</strong></span>
                  <span>•</span>
                  <span>Target Selesai: <strong className="text-black font-black">{routineCompletionModal.task.targetDate || selectedDate}</strong></span>
                </div>
              </div>

              <div className="text-xs sm:text-sm leading-relaxed text-black font-bold">
                Apakah Anda ingin membuat kembali task routine ini untuk periode selanjutnya?
              </div>

              {/* Next Period Preview Card */}
              <div className="p-3.5 rounded-2xl border-2 border-slate-300 bg-slate-100 space-y-2 text-black">
                <span className="text-[10px] uppercase font-black text-slate-700 tracking-wider block">
                  Rencana Periode Baru
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold block">Periode / Sub-Topik:</span>
                    <span className="font-mono font-black text-teal-950 text-sm">
                      {routineCompletionModal.nextPeriod}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-600 font-bold block">Target Selesai Default:</span>
                    <span className="font-mono font-black text-teal-950 text-sm">
                      {routineCompletionModal.nextTargetDate}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-700 font-bold space-y-1">
                  <div>✓ Daftar subtask akan diduplikasi dengan status belum dicentang (0%)</div>
                  <div>✓ Target selesai disesuaikan otomatis untuk periode berikutnya</div>
                  <div>✓ Status awal otomatis menjadi [Open]</div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2.5 bg-slate-50">
              <button
                type="button"
                onClick={() => setRoutineCompletionModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-black border-2 border-slate-300 bg-white hover:bg-slate-100 text-black transition-all cursor-pointer"
              >
                Tidak, Selesai
              </button>
              <button
                type="button"
                onClick={handleConfirmLogbookNextPeriod}
                className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-900/30 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <Sparkles className="w-4 h-4 stroke-[2.5]" />
                <span>Ya, Buka Periode {routineCompletionModal.nextPeriod}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
