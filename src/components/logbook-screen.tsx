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
  Monitor
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui';
import { parseTasklist, toggleTasklistItem, markdownToVisualHtml } from './notion/tasklist-utils';
import { NotionDropdownCell } from './notion/NotionDropdownCell';
import { EnterpriseWysiwygEditor } from './notion/EnterpriseWysiwygEditor';

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
  createdAt: string;
  updatedAt: string;
}

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
  'Quality Control (QA)',
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
  selectedNiks: string[];
  selectedNames: string[];
  onChange: (niks: string[], names: string[]) => void;
  employees: any[];
  defaultSection?: string;
  label?: string;
  required?: boolean;
}

function SearchableMultiPicSelect({
  selectedNiks,
  selectedNames,
  onChange,
  employees,
  defaultSection,
  label = 'Pilih PIC Bawahan (Bisa lebih dari 1) *',
  required = true
}: SearchableMultiPicSelectProps) {
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
    if (!searchTerm.trim()) return employees.slice(0, 50);
    const q = searchTerm.toLowerCase();
    return employees.filter(emp => {
      const name = (emp.name || '').toLowerCase();
      const nik = (emp.nik || '').toLowerCase();
      const sec = (emp.section || emp.department || emp.jabatan || '').toLowerCase();
      return name.includes(q) || nik.includes(q) || sec.includes(q);
    }).slice(0, 50);
  }, [employees, searchTerm]);

  const addPic = (emp: any) => {
    if (selectedNiks.includes(emp.nik)) return;
    onChange([...selectedNiks, emp.nik], [...selectedNames, emp.name]);
    setSearchTerm('');
    inputRef.current?.focus();
  };

  const removePic = (nik: string) => {
    const idx = selectedNiks.indexOf(nik);
    if (idx !== -1) {
      const newNiks = [...selectedNiks];
      const newNames = [...selectedNames];
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
          {selectedNiks.length} PIC Dipilih
        </span>
      </div>

      {/* Selected PIC Badges Box + Input Field */}
      <div 
        onClick={() => { setIsOpen(true); inputRef.current?.focus(); }}
        className="min-h-10 w-full p-1.5 rounded-xl border flex flex-wrap items-center gap-1.5 cursor-text transition-all focus-within:border-teal-500"
        style={{
          backgroundColor: 'var(--input-bg, #f8fafc)',
          borderColor: selectedNiks.length === 0 && required ? 'var(--border-main, #cbd5e1)' : 'var(--border-main, #cbd5e1)'
        }}
      >
        {selectedNiks.map((nik, idx) => (
          <span 
            key={nik}
            className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg bg-teal-500/15 border border-teal-500/30 text-teal-800 dark:text-teal-200 text-xs font-bold animate-in fade-in zoom-in-95 duration-100"
          >
            <div className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center text-[9px] font-black">
              {(selectedNames[idx] || 'P').charAt(0).toUpperCase()}
            </div>
            <span className="truncate max-w-[130px]">{selectedNames[idx] || nik}</span>
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
            placeholder={selectedNiks.length === 0 ? "Ketik nama / NIK untuk menambah PIC..." : "Tambah PIC lain..."}
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
              const isSelected = selectedNiks.includes(emp.nik);
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
  valueNik: string;
  valueName: string;
  onChange: (nik: string, name: string) => void;
  employees: any[];
  label?: string;
  placeholder?: string;
}

function SearchableSinglePicSelect({ 
  valueNik, 
  valueName, 
  onChange, 
  employees,
  label = 'Pilih PIC Job Pending *',
  placeholder = 'Ketik nama / NIK penanggung jawab pending...'
}: SearchableSinglePicSelectProps) {
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
    if (!searchTerm.trim()) return employees.slice(0, 50);
    const q = searchTerm.toLowerCase();
    return employees.filter(emp => {
      const name = (emp.name || '').toLowerCase();
      const nik = (emp.nik || '').toLowerCase();
      const sec = (emp.section || emp.department || emp.jabatan || '').toLowerCase();
      return name.includes(q) || nik.includes(q) || sec.includes(q);
    }).slice(0, 50);
  }, [employees, searchTerm]);

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
              {valueName.charAt(0).toUpperCase()}
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
  selectedId: string;
  bulletinList: any[];
  onSelect: (postId: string) => void;
}

function SearchableBulletinSelect({ selectedId, bulletinList, onSelect }: SearchableBulletinSelectProps) {
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
    return bulletinList.find(b => String(b.id) === String(selectedId));
  }, [selectedId, bulletinList]);

  const filteredBulletins = useMemo(() => {
    if (!searchTerm.trim()) return bulletinList.slice(0, 40);
    const q = searchTerm.toLowerCase();
    return bulletinList.filter(b => {
      const title = (b.title || '').toLowerCase();
      const category = (b.category || '').toLowerCase();
      const dept = (b.department || '').toLowerCase();
      const idStr = String(b.id || '');
      return title.includes(q) || category.includes(q) || dept.includes(q) || idStr.includes(q);
    }).slice(0, 40);
  }, [bulletinList, searchTerm]);

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
    inspectorNik === 'preplabadmin';

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

  // Keep selectedSection in sync if userSection resolves after boot
  useEffect(() => {
    if (userSection) setSelectedSection(userSection);
  }, [userSection]);

  // Loading & Data states
  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState<LogbookTask[]>([]);
  const [yesterdayTasks, setYesterdayTasks] = useState<LogbookTask[]>([]);
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
    setNewTargetDate(selectedDate || getTodayStr());
    setNewTargetTime('');
    setSelectedBulletinPostId('');
    setIsAssignPending(false);
    setNewPendingPicNik('');
    setNewPendingPicName('');
    setNewPendingReason('');
    setShowAssignModal(true);
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
        setYesterdayTasks(json.data.yesterdayTasks || json.data.carryOverTasks || []);
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
          taskDate: selectedDate,
          targetDate: newTargetDate || selectedDate,
          targetTime: newTargetTime.trim() || '23:59',
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
    const updatedDesc = toggleTasklistItem(task.description || '', itemIndex);
    const progress = parseTasklist(updatedDesc);

    // Optimistic UI Update
    setTodayTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: updatedDesc, progressPercent: progress.percentage } : t));
    setYesterdayTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: updatedDesc, progressPercent: progress.percentage } : t));

    try {
      await fetch(`/api/logbook/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: updatedDesc,
          progressPercent: progress.percentage,
          updaterNik: inspectorNik
        })
      });
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

  // Filtered Today & Yesterday Lists
  const filteredToday = useMemo(() => {
    return todayTasks.filter(t => {
      const matchSearch = !searchQuery || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.assigneeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.pendingPicName && t.pendingPicName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPic = picFilter === 'ALL' || t.assigneeNik.includes(picFilter) || t.assigneeName.includes(picFilter) || (t.pendingPicNik && t.pendingPicNik.includes(picFilter));
      return matchSearch && matchPic;
    });
  }, [todayTasks, searchQuery, picFilter]);

  const filteredYesterday = useMemo(() => {
    return yesterdayTasks.filter(t => {
      const matchSearch = !searchQuery || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.assigneeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.pendingPicName && t.pendingPicName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPic = picFilter === 'ALL' || t.assigneeNik.includes(picFilter) || t.assigneeName.includes(picFilter) || (t.pendingPicNik && t.pendingPicNik.includes(picFilter));
      return matchSearch && matchPic;
    });
  }, [yesterdayTasks, searchQuery, picFilter]);

  // Active Section for Presentation Focus Highlight ('yesterday' | 'today')
  const [activeSection, setActiveSection] = useState<'yesterday' | 'today'>('yesterday');
  const [yesterdaySubFilter, setYesterdaySubFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const displayedYesterdayTasks = useMemo(() => {
    return filteredYesterday.filter(t => {
      const isDone = t.status === 'Resolved' || t.status === 'Done' || t.status === 'Closed';
      if (yesterdaySubFilter === 'pending') return !isDone;
      if (yesterdaySubFilter === 'completed') return isDone;
      return true;
    });
  }, [filteredYesterday, yesterdaySubFilter]);

  const yesterdayCompletedCount = useMemo(() => {
    return filteredYesterday.filter(t => t.status === 'Resolved' || t.status === 'Done' || t.status === 'Closed').length;
  }, [filteredYesterday]);

  const yesterdayPendingCount = useMemo(() => {
    return filteredYesterday.filter(t => t.status !== 'Resolved' && t.status !== 'Done' && t.status !== 'Closed').length;
  }, [filteredYesterday]);

  // Unique PICs in current tasks for the filter dropdown
  const uniquePics = useMemo(() => {
    const map = new Map<string, string>();
    [...todayTasks, ...yesterdayTasks].forEach(t => {
      const pics = parsePicList(t.assigneeNik, t.assigneeName);
      pics.forEach(p => {
        if (p.nik && p.name) map.set(p.nik, p.name);
      });
      if (t.pendingPicNik && t.pendingPicName) {
        map.set(t.pendingPicNik, `${t.pendingPicName} (Pending)`);
      }
    });
    return Array.from(map.entries()).map(([nik, name]) => ({ nik, name }));
  }, [todayTasks, yesterdayTasks]);

  // Enterprise Morning Briefing & Projector Presentation Mode (Default ON as requested)
  const [isProjectorMode, setIsProjectorMode] = useState<boolean>(true);

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

  const toggleProjectorMode = () => {
    setIsProjectorMode(prev => {
      const nextVal = !prev;
      if (nextVal) {
        // Auto-expand all tasks when entering projector mode
        const allIds = new Set<number>([
          ...filteredYesterday.map(t => t.id),
          ...filteredToday.map(t => t.id)
        ]);
        setExpandedTaskIds(allIds);
      }
      return nextVal;
    });
  };

  // Enterprise Task Card Renderer with Projector High-Contrast Readability
  const renderTaskCard = (task: LogbookTask, isCarryOver: boolean) => {
    const parsed = parseTasklist(task.description || '');
    const isDone = task.status === 'Resolved' || task.status === 'Done' || task.status === 'Closed';
    const isPending = task.isPending || task.status === 'Pending';
    const isInProgress = task.status === 'In Progress';
    const isExpanded = expandedTaskIds.has(task.id);
    const picList = parsePicList(task.assigneeNik, task.assigneeName);

    // Dynamic Section Badge Palette (Masculine Pastel High Contrast)
    const sectionBadgeClass = 
      task.section.includes('Prep') ? 'bg-amber-100 text-amber-950 border border-amber-300' :
      task.section.includes('Lab') ? 'bg-indigo-100 text-indigo-950 border border-indigo-300' :
      task.section.includes('Maint') ? 'bg-orange-100 text-orange-950 border border-orange-300' :
      task.section.includes('QA') || task.section.includes('Quality') ? 'bg-cyan-100 text-cyan-950 border border-cyan-300' :
      'bg-slate-200 text-slate-800 border border-slate-300';

    const isOverdue = isTaskOverdue(task.targetDate, task.targetTime, task.status);

    return (
      <div 
        key={task.id}
        className={`rounded-2xl border-2 transition-all duration-200 shadow-xs hover:shadow-md overflow-hidden ${
          isDone 
            ? 'border-emerald-300 bg-emerald-50/50' 
            : isPending
            ? 'border-amber-300 bg-amber-50/50'
            : isInProgress
            ? 'border-sky-300 bg-sky-50/50'
            : 'border-slate-300 bg-white'
        }`}
      >
        {/* Card Header Top */}
        <div className={`p-4 space-y-3 ${isProjectorMode ? 'sm:p-5 sm:space-y-4' : ''}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              {/* Badges Bar (Masculine Pastel) */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-lg font-mono font-bold shadow-2xs tracking-wide ${sectionBadgeClass}`}>
                  {task.section}
                </span>

                <span className={`text-xs px-2.5 py-1 rounded-lg font-black shadow-2xs ${
                  task.priority === 'Urgent' 
                    ? 'bg-rose-100 text-rose-800 border-2 border-rose-300 uppercase tracking-wider animate-pulse' :
                  task.priority === 'High' 
                    ? 'bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wider' :
                    'bg-slate-100 text-slate-700 border border-slate-300 font-bold'
                }`}>
                  {task.priority}
                </span>

                {isCarryOver ? (
                  <span className="text-xs px-2.5 py-1 rounded-lg font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 flex items-center gap-1 shadow-2xs">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Asal: {formatDisplayTargetDate(task.taskDate)}</span>
                  </span>
                ) : (
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
                )}

                {isOverdue && !isDone && (
                  <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-lg font-black bg-rose-600 text-white shadow-2xs animate-pulse flex items-center gap-1 uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Lewat Batas Jam</span>
                  </span>
                )}

                {task.isPending && (
                  <span className="text-xs px-2.5 py-1 rounded-lg font-black bg-amber-100 text-amber-950 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Job Pending: {task.pendingPicName || 'Pending'}</span>
                  </span>
                )}

                {task.bulletinPostId && (
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg shadow-2xs">
                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                    <span>Buletin #{task.bulletinPostId}</span>
                  </span>
                )}
              </div>

              {/* Task Title (Deep Black on Pastel Background for Maximum Readability) */}
              <h3 className={`font-black leading-snug text-slate-900 tracking-tight ${
                isProjectorMode ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
              }`}>
                {task.title}
              </h3>
            </div>

            {/* Status Notion Dropdown + Delete Button */}
            <div className="flex items-center gap-2 shrink-0">
              <NotionDropdownCell
                type="status"
                value={task.status}
                onChange={(newVal) => handleStatusChange(task.id, newVal)}
              />
              <button
                type="button"
                onClick={() => setTaskToDelete(task)}
                title="Hapus kegiatan ini (sinkron ke Buletin)"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* PIC & Delegator Box (Masculine Pastel Eucalyptus) */}
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
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
            <span className="text-slate-600 text-xs font-semibold ml-auto flex items-center gap-1">
              <span>Oleh:</span>
              <strong className="text-slate-900 font-bold">{task.assignedByName}</strong>
            </span>
          </div>

          {/* Subtask Progress Summary & Expand Button */}
          {parsed.hasTasklist ? (
            <div className="pt-2.5 border-t flex items-center justify-between gap-3 border-slate-200">
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm font-mono">
                  <span className="font-bold text-slate-700">Progress Checklist:</span>
                  <span className="font-black text-teal-700 text-sm sm:text-base">
                    {parsed.completed}/{parsed.total} ({parsed.percentage}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300 shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-600 to-emerald-600 rounded-full transition-all duration-300 shadow-xs" 
                    style={{ width: `${parsed.percentage}%` }} 
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleExpand(task.id)}
                className="px-3.5 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs sm:text-sm font-bold text-slate-800 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95"
              >
                <span>{isExpanded ? 'Tutup Checklist' : `Lihat Checklist (${parsed.total})`}</span>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-teal-600" /> : <ChevronDown className="w-4 h-4 text-teal-600" />}
              </button>
            </div>
          ) : task.description ? (
            <div className="pt-2 border-t flex items-center justify-between border-slate-200">
              <span className="text-xs text-slate-500 italic">Rincian petunjuk kerja</span>
              <button
                type="button"
                onClick={() => toggleExpand(task.id)}
                className="px-3 py-1 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-teal-700 flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <span>{isExpanded ? 'Tutup Rincian' : 'Buka Rincian'}</span>
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : null}
        </div>

        {/* Expandable Body: Subtask Checklist & Job Pending Note */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-3 border-t space-y-3 bg-white border-slate-200 animate-in fade-in duration-150">
            {/* If Job Pending: Show explanation banner */}
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

            {/* Subtasks Checklist */}
            {parsed.hasTasklist && (
              <div className="space-y-2">
                <div className="text-xs sm:text-sm font-black text-slate-900">
                  Checklist Subtask (Klik checkbox untuk update langsung):
                </div>
                <div className="space-y-1.5">
                  {parsed.items.map((item) => (
                    <label
                      key={item.index}
                      onClick={(e) => e.stopPropagation()}
                      className={`flex items-start gap-3 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                        item.checked
                          ? 'bg-slate-100 border-slate-200'
                          : 'bg-white border-slate-300 hover:border-teal-500 hover:shadow-xs'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => handleToggleSubtask(task, item.index)}
                        className="mt-0.5 w-5 h-5 rounded border-2 border-slate-400 text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0"
                      />
                      <span className={`flex-1 text-sm sm:text-base leading-snug ${
                        item.checked 
                          ? 'line-through text-slate-400 font-normal' 
                          : 'font-bold text-slate-900'
                      }`}>
                        {item.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {/* If task has checklist and clean description text */}
            {parsed.hasTasklist && parsed.cleanText && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div 
                  className="text-xs sm:text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: markdownToVisualHtml(parsed.cleanText) }}
                />
              </div>
            )}

            {/* If task has no checklist but has description */}
            {!parsed.hasTasklist && task.description && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div 
                  className="text-xs sm:text-sm font-medium text-slate-800 whitespace-pre-wrap leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: markdownToVisualHtml(task.description) }}
                />
              </div>
            )}

            {/* Action Buttons in Expanded View */}
            <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-2.5 border-slate-200">
              <button
                type="button"
                onClick={() => openJobPendingModal(task)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition-all cursor-pointer shadow-xs"
              >
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>{task.isPending ? 'Ubah PIC Job Pending' : 'Set PIC Job Pending'}</span>
              </button>

              {isCarryOver && !isDone && (
                <button
                  type="button"
                  onClick={() => handleCarryOverTask(task)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-600 hover:to-emerald-600 text-white transition-all cursor-pointer shadow-sm active:scale-95"
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
              type="button"
              onClick={toggleProjectorMode}
              title="Aktifkan Mode Proyektor Rapat (Tampilan kontras tinggi & font diperbesar untuk presentasi)"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isProjectorMode
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white border-indigo-700 ring-2 ring-indigo-400 shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600'
              }`}
            >
              <span className="text-sm">📽️</span>
              <span>{isProjectorMode ? 'Mode Proyektor: ON' : 'Mode Proyektor'}</span>
            </button>

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

      {/* Main Content Body - Full Screen Projector Optimized (No cramped centering) */}
      <div className="w-full px-4 sm:px-8 lg:px-10 py-5 sm:py-6 space-y-6 transition-all duration-300">
        {/* Projector Mode Live Meeting Room Banner */}
        {isProjectorMode && (
          <div className="bg-gradient-to-r from-slate-100 via-sky-50 to-slate-100 border-2 border-slate-300 rounded-3xl p-4 sm:p-5 shadow-xs text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                  Live Meeting Projector Mode
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-lg bg-sky-100 border border-sky-300 font-mono font-bold text-sky-900">
                  {selectedSection}
                </span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  📅 {formatDateDisplay(selectedDate)}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <span>Morning Briefing & Operational Handover</span>
              </h2>
              <p className="text-xs text-slate-600 font-semibold">
                Mode layar lebar dengan kontras tinggi dioptimalkan untuk proyektor meeting room, evaluasi carry-over, serta checklist progres harian.
              </p>
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto">
              <button
                type="button"
                onClick={expandAllTasks}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <ChevronDown className="w-4 h-4 text-teal-700 stroke-[3]" />
                <span>Buka Semua Checklist</span>
              </button>
              <button
                type="button"
                onClick={toggleProjectorMode}
                className="px-3.5 py-2 rounded-xl text-xs font-black bg-slate-800 hover:bg-slate-900 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Keluar Mode Layar</span>
              </button>
            </div>
          </div>
        )}

        {/* Enterprise KPI Summary Cards */}
        {summaryData && (
          <div className={`grid grid-cols-2 md:grid-cols-4 ${isProjectorMode ? 'gap-5' : 'gap-3.5'}`}>
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

            {/* Card 3: Carry Over Task */}
            <div 
              onClick={() => setActiveSection('yesterday')}
              title="Klik untuk menyorot bagian Evaluasi & Progres Kemarin"
              className={`p-4 rounded-2xl border-2 border-t-4 border-t-amber-600 bg-gradient-to-b from-amber-50/60 to-white shadow-xs transition-all cursor-pointer ${
                activeSection === 'yesterday' ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-md scale-[1.01]' : 'border-amber-200 hover:border-amber-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider uppercase text-slate-700">
                  Carry Over Task
                </span>
                <span className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <RotateCcw className="w-4 h-4 stroke-[2.5]" />
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-black mt-2 text-slate-900">
                {summaryData.completedCarryOver || summaryData.completedYesterday || 0} / {summaryData.totalCarryOver || summaryData.totalYesterday || 0}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                <p className="text-xs text-amber-900 font-bold">
                  {summaryData.pendingCarryOver || summaryData.pendingYesterday || 0} tugas carry-over
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
        <div className={`grid grid-cols-1 lg:grid-cols-2 ${isProjectorMode ? 'gap-8' : 'gap-6'} items-start`}>
          {/* 1. COLUMN KIRI: EVALUASI & PROGRES KEMARIN */}
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
                    <span>1. Evaluasi & Progres Kemarin</span>
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

              {/* Sub-Filters for Step 1 */}
              <div 
                onClick={(e) => e.stopPropagation()} 
                className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <button
                  type="button"
                  onClick={() => setYesterdaySubFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    yesterdaySubFilter === 'all'
                      ? 'bg-slate-800 text-white font-black'
                      : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  Semua ({filteredYesterday.length})
                </button>
                <button
                  type="button"
                  onClick={() => setYesterdaySubFilter('pending')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    yesterdaySubFilter === 'pending'
                      ? 'bg-amber-500 text-white font-black shadow-xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  ⏳ Carry-Over ({yesterdayPendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setYesterdaySubFilter('completed')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    yesterdaySubFilter === 'completed'
                      ? 'bg-teal-700 text-white font-black shadow-xs'
                      : 'bg-teal-50 text-teal-900 border border-teal-300 hover:bg-teal-100'
                  }`}
                >
                  ✅ Selesai ({yesterdayCompletedCount})
                </button>
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
                  {yesterdaySubFilter === 'pending'
                    ? 'Semua kegiatan dari shift kemarin telah terselesaikan dengan baik (tuntas 100%).'
                    : 'Belum ada data tugas untuk filter yang dipilih.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedYesterdayTasks.map((task) => renderTaskCard(task, true))}
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
              <div className="space-y-4">
                {filteredToday.map((task) => renderTaskCard(task, false))}
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

              {/* Prioritas, Target Tanggal, & Target Jam Selesai */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <label className="text-xs font-bold block">Target Tanggal</label>
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
                    Bila kosong: otomatis jam 12 malam hari (23:59).
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
    </div>
  );
}
