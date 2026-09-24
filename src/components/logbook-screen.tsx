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
  Send 
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui';
import { parseTasklist, toggleTasklistItem } from './notion/tasklist-utils';
import { NotionDropdownCell } from './notion/NotionDropdownCell';

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
  actualCompletedDate: string | null;
  yesterdayNotes: string | null;
  todayNotes: string | null;
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
  if (!dateStr) return 'Hari ini';
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

interface SubtaskDraft {
  id: string;
  text: string;
  checked: boolean;
}

// 1. Searchable Combobox for Employee / PIC
interface SearchablePicSelectProps {
  valueNik: string;
  valueName: string;
  onChange: (nik: string, name: string) => void;
  employees: any[];
}

function SearchablePicSelect({ valueNik, valueName, onChange, employees }: SearchablePicSelectProps) {
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
        <span>Pilih PIC Bawahan *</span>
        <span className="text-[10px] text-teal-600 dark:text-teal-400 font-normal">Cari cepat nama/NIK</span>
      </label>

      {valueNik && !isOpen ? (
        <div 
          onClick={() => { setIsOpen(true); setSearchTerm(''); }}
          className="w-full flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer hover:border-teal-500/80 group"
          style={{
            backgroundColor: 'var(--input-bg, #f8fafc)',
            borderColor: 'var(--border-main, #cbd5e1)'
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 font-bold flex items-center justify-center text-xs shrink-0">
              {valueName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs truncate text-slate-900 dark:text-slate-100 group-hover:text-teal-600 transition-colors">
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
              placeholder="Ketik nama atau NIK karyawan..."
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

          {/* Autocomplete Dropdown */}
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
                      className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors hover:bg-teal-500/10 ${
                        isSelected ? 'bg-teal-500/15' : ''
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
                        <Check className="w-4 h-4 text-teal-600 shrink-0" />
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

// 2. Searchable Combobox for Bulletin Post Linking
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

// 3. WYSIWYG Subtask Checklist Builder
interface WysiwygChecklistBuilderProps {
  items: SubtaskDraft[];
  onChange: (items: SubtaskDraft[]) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

function WysiwygChecklistBuilder({ items, onChange, notes, onNotesChange }: WysiwygChecklistBuilderProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleTextChange = (index: number, newText: string) => {
    const updated = items.map((it, idx) => idx === index ? { ...it, text: newText } : it);
    onChange(updated);
  };

  const handleToggleCheck = (index: number) => {
    const updated = items.map((it, idx) => idx === index ? { ...it, checked: !it.checked } : it);
    onChange(updated);
  };

  const handleAddItem = (initialText = '', focusIndex?: number) => {
    const newItem: SubtaskDraft = {
      id: Math.random().toString(36).substring(2, 9),
      text: initialText,
      checked: false
    };
    const nextItems = [...items, newItem];
    onChange(nextItems);
    setTimeout(() => {
      const idx = focusIndex !== undefined ? focusIndex : nextItems.length - 1;
      inputRefs.current[idx]?.focus();
    }, 50);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      onChange([{ id: Math.random().toString(36).substring(2, 9), text: '', checked: false }]);
      return;
    }
    const updated = items.filter((_, idx) => idx !== index);
    onChange(updated);
    setTimeout(() => {
      const prevIdx = Math.max(0, index - 1);
      inputRefs.current[prevIdx]?.focus();
    }, 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newItem: SubtaskDraft = {
        id: Math.random().toString(36).substring(2, 9),
        text: '',
        checked: false
      };
      const updated = [...items.slice(0, index + 1), newItem, ...items.slice(index + 1)];
      onChange(updated);
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus();
      }, 50);
    } else if (e.key === 'Backspace' && items[index].text === '' && items.length > 1) {
      e.preventDefault();
      handleRemoveItem(index);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold flex items-center gap-1.5">
          <CheckSquare className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Subtask Checklist (WYSIWYG)</span>
        </label>
        <span className="text-[10px] text-slate-500 font-medium">
          Tekan <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[9px] font-mono">Enter</kbd> untuk baris baru
        </span>
      </div>

      <div 
        className="rounded-2xl border p-2.5 sm:p-3 space-y-1.5 shadow-2xs"
        style={{
          backgroundColor: 'var(--input-bg, #f8fafc)',
          borderColor: 'var(--border-main, #cbd5e1)'
        }}
      >
        {items.map((item, idx) => (
          <div 
            key={item.id}
            className="flex items-center gap-2 group/item transition-colors px-1.5 py-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
          >
            <button
              type="button"
              onClick={() => handleToggleCheck(idx)}
              className="text-slate-400 hover:text-teal-600 transition-colors shrink-0 cursor-pointer"
              title={item.checked ? "Tandai belum selesai" : "Tandai selesai"}
            >
              {item.checked ? (
                <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>

            <input
              ref={el => inputRefs.current[idx] = el}
              type="text"
              value={item.text}
              placeholder={`Langkah subtask ${idx + 1}...`}
              onChange={(e) => handleTextChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`flex-1 bg-transparent border-none outline-none text-xs ${
                item.checked ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200 font-medium'
              }`}
            />

            <button
              type="button"
              onClick={() => handleRemoveItem(idx)}
              className="opacity-0 group-hover/item:opacity-100 p-1 text-slate-400 hover:text-rose-500 rounded transition-all cursor-pointer"
              title="Hapus baris subtask"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => handleAddItem()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-bold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Item Subtask</span>
          </button>

          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-slate-400 hidden sm:inline">Template:</span>
            <button
              type="button"
              onClick={() => {
                onChange([
                  { id: '1', text: 'Persiapan alat & APD lengkap', checked: false },
                  { id: '2', text: 'Eksekusi operasional sesuai SOP', checked: false },
                  { id: '3', text: 'Pencatatan data & pelaporan ke atasan', checked: false },
                ]);
              }}
              className="px-2 py-0.5 rounded-md border border-dashed border-teal-500/40 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 cursor-pointer"
            >
              + 3 Tahapan Standar
            </button>
          </div>
        </div>
      </div>

      {/* Catatan Tambahan (Opsional) */}
      <div className="pt-1">
        <label className="text-[11px] font-semibold text-slate-500 block mb-1">
          Catatan Tambahan / Instruksi Khusus (Opsional)
        </label>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Catatan tambahan bila diperlukan..."
          className="w-full px-3 py-1.5 rounded-xl border outline-none text-xs focus:border-teal-500"
          style={{
            backgroundColor: 'var(--input-bg, #f8fafc)',
            borderColor: 'var(--border-main, #cbd5e1)'
          }}
        />
      </div>
    </div>
  );
}

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

  // Employees master list for PIC dropdown
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  // Bulletin posts list for link sync
  const [bulletinList, setBulletinList] = useState<any[]>([]);

  // Quick Assign Task State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [checklistDrafts, setChecklistDrafts] = useState<SubtaskDraft[]>([
    { id: '1', text: '', checked: false }
  ]);
  const [newNotes, setNewNotes] = useState('');
  const [newAssigneeNik, setNewAssigneeNik] = useState('');
  const [newAssigneeName, setNewAssigneeName] = useState('');
  const [newPriority, setNewPriority] = useState('Normal');
  const [newActivityType, setNewActivityType] = useState('Routine');
  const [newTargetDate, setNewTargetDate] = useState(getTodayStr());
  const [selectedBulletinPostId, setSelectedBulletinPostId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const openAssignModal = () => {
    setNewTitle('');
    setChecklistDrafts([
      { id: '1', text: '', checked: false }
    ]);
    setNewNotes('');
    setNewAssigneeNik('');
    setNewAssigneeName('');
    setNewPriority('Normal');
    setNewActivityType('Routine');
    setNewTargetDate(selectedDate || getTodayStr());
    setSelectedBulletinPostId('');
    setShowAssignModal(true);
  };

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

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
        setSummaryData(json.data.summary || null);
      }
    } catch (e) {
      console.error('Failed to fetch logbook tasks:', e);
      toast.error('Gagal memuat daftar tugas meeting pagi');
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

  // Handle Quick Assign Task Submit
  const handleAssignTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Judul tugas / arahan kegiatan tidak boleh kosong');
      return;
    }
    if (!newAssigneeNik || !newAssigneeName) {
      toast.error('Harap pilih personil bawahan (PIC) yang ditugaskan');
      return;
    }

    const checklistMarkdown = checklistDrafts
      .filter(item => item.text.trim())
      .map(item => `- [${item.checked ? 'x' : ' '}] ${item.text.trim()}`)
      .join('\n');

    const finalDescription = newNotes.trim()
      ? (checklistMarkdown ? `${newNotes.trim()}\n\n${checklistMarkdown}` : newNotes.trim())
      : checklistMarkdown;

    try {
      setIsSubmitting(true);
      toast.loading('Menugaskan arahan kegiatan & menyinkronkan ke Buletin...', { id: 'assign-task' });

      const res = await fetch('/api/logbook/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: finalDescription,
          section: userSection, // Locked automatically to user's section
          assigneeNik: newAssigneeNik,
          assigneeName: newAssigneeName,
          assignedByNik: inspectorNik || 'SUPERVISOR',
          assignedByName: inspectorName || 'Atasan / Manajemen',
          priority: newPriority,
          activityType: newActivityType,
          taskDate: selectedDate,
          targetDate: newTargetDate || selectedDate,
          pt: selectedPt,
          bulletinPostId: selectedBulletinPostId ? parseInt(selectedBulletinPostId) : null
        })
      });

      const json = await res.json();
      if (json.status === 'success') {
        toast.success(`Tugas berhasil ditugaskan ke ${newAssigneeName}!`, { id: 'assign-task' });
        setShowAssignModal(false);
        setNewTitle('');
        setChecklistDrafts([{ id: '1', text: '', checked: false }]);
        setNewNotes('');
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

  // Carry Over Yesterday Task to Today
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
          assignedByNik: inspectorNik,
          assignedByName: inspectorName,
          priority: task.priority,
          activityType: task.activityType,
          taskDate: selectedDate,
          targetDate: task.targetDate,
          pt: task.pt,
          bulletinPostId: task.bulletinPostId
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Tugas berhasil dimasukkan ke daftar fokus hari ini!', { id: 'carry-over' });
        fetchTasks();
      }
    } catch (e) {
      toast.error('Gagal carry-over tugas', { id: 'carry-over' });
    }
  };

  // Copy P5M Meeting Summary to WhatsApp / Clipboard
  const handleCopyMeetingSummary = () => {
    const formattedDate = new Date(selectedDate).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let text = `*📋 NOTULENSI MEETING PAGI / P5M SECTION*\n`;
    text += `*Tanggal*: ${formattedDate}\n`;
    text += `*Seksi*: ${selectedSection} (${selectedPt})\n`;
    text += `*Pimpinan Rapat*: ${inspectorName || 'Supervisor'}\n\n`;

    text += `*1️⃣ EVALUASI PEKERJAAN KEMARIN:*\n`;
    if (yesterdayTasks.length === 0) {
      text += `- Belum ada catatan evaluasi kemarin.\n`;
    } else {
      yesterdayTasks.forEach((t, i) => {
        text += `${i + 1}. [${t.status.toUpperCase()}] ${t.title} - PIC: ${t.assigneeName}\n`;
        if (t.yesterdayNotes) text += `   _Catatan_: ${t.yesterdayNotes}\n`;
      });
    }

    text += `\n*2️⃣ FOKUS & ON-GOING TASK HARI INI:*\n`;
    if (todayTasks.length === 0) {
      text += `- Tidak ada task aktif hari ini.\n`;
    } else {
      todayTasks.forEach((t, i) => {
        text += `${i + 1}. [${t.priority}] ${t.title} (PIC: ${t.assigneeName}) - Target: ${t.targetDate || 'Hari ini'} [${t.status}]\n`;
        const parsed = parseTasklist(t.description || '');
        if (parsed.hasTasklist) {
          parsed.items.forEach(item => {
            text += `   ${item.completed ? '✅' : '◻️'} ${item.text}\n`;
          });
        }
      });
    }

    text += `\n_Generated via Prep & Lab Portal Log Book Hub_`;

    navigator.clipboard.writeText(text);
    toast.success('Notulensi meeting pagi berhasil disalin ke clipboard! Siap dikirim ke WhatsApp.');
  };

  // Filtered Today & Yesterday Lists
  const filteredToday = useMemo(() => {
    return todayTasks.filter(t => {
      const matchSearch = !searchQuery || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.assigneeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPic = picFilter === 'ALL' || t.assigneeNik === picFilter || t.assigneeName === picFilter;
      return matchSearch && matchPic;
    });
  }, [todayTasks, searchQuery, picFilter]);

  const filteredYesterday = useMemo(() => {
    return yesterdayTasks.filter(t => {
      const matchSearch = !searchQuery || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.assigneeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPic = picFilter === 'ALL' || t.assigneeNik === picFilter || t.assigneeName === picFilter;
      return matchSearch && matchPic;
    });
  }, [yesterdayTasks, searchQuery, picFilter]);

  // Unique PICs in current tasks
  const uniquePics = useMemo(() => {
    const map = new Map<string, string>();
    [...todayTasks, ...yesterdayTasks].forEach(t => {
      if (t.assigneeNik && t.assigneeName) map.set(t.assigneeNik, t.assigneeName);
    });
    return Array.from(map.entries()).map(([nik, name]) => ({ nik, name }));
  }, [todayTasks, yesterdayTasks]);

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
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
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
                    P5M Pagi
                  </span>
                </h1>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                Tinjauan Tugas Kemarin, Fokus Hari Ini, dan Penugasan Terintegrasi Buletin
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMeetingSummary}
              title="Salin notulensi meeting pagi ke WhatsApp"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #cbd5e1)'
              }}
            >
              <Copy className="w-3.5 h-3.5 text-teal-500" />
              <span className="hidden sm:inline">Salin Notulensi P5M</span>
            </button>

            <button
              onClick={openAssignModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Arahan Tugas Baru</span>
            </button>
          </div>
        </div>

        {/* Date Selector & Filters Bar */}
        <div 
          className="border-t px-4 py-2 bg-slate-500/5"
          style={{ borderColor: 'var(--border-main, #e2e8f0)' }}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
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
                  placeholder="Cari kegiatan/PIC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none text-xs w-28 sm:w-36 font-medium"
                  style={{ color: 'var(--text-main, #0f172a)' }}
                />
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
      <div className="max-w-7xl mx-auto px-4 py-5 space-y-6">
        {/* KPI Summary Cards */}
        {summaryData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div 
              className="p-3 rounded-2xl border shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #e2e8f0)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted, #64748b)' }}>Fokus Hari Ini</span>
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Clock className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xl font-black mt-1">{summaryData.totalToday} <span className="text-xs font-normal font-sans text-slate-400">task</span></p>
              <p className="text-[10px] text-blue-500 font-medium mt-0.5">{summaryData.openToday} Open • {summaryData.inProgressToday} In Progress</p>
            </div>

            <div 
              className="p-3 rounded-2xl border shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #e2e8f0)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted, #64748b)' }}>Selesai Hari Ini</span>
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{summaryData.completedToday}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Resolved & Closed</p>
            </div>

            <div 
              className="p-3 rounded-2xl border shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #e2e8f0)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted, #64748b)' }}>Evaluasi Kemarin</span>
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <RotateCcw className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xl font-black mt-1">{summaryData.completedYesterday} / {summaryData.totalYesterday}</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">{summaryData.pendingYesterday} pending carry-over</p>
            </div>

            <div 
              className="p-3 rounded-2xl border shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #e2e8f0)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted, #64748b)' }}>Penyelesaian</span>
                <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xl font-black mt-1 text-teal-600 dark:text-teal-400">
                {summaryData.totalToday > 0 ? Math.round((summaryData.completedToday / summaryData.totalToday) * 100) : 0}%
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Target harian P5M</p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TWO-COLUMN LAYOUT: YESTERDAY EVALUATION vs TODAY ON-GOING FOCUS           */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* 1. COLUMN KIRI: EVALUASI PEKERJAAN KEMARIN */}
          <div 
            className="rounded-3xl border shadow-sm p-4 space-y-4"
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              borderColor: 'var(--border-main, #e2e8f0)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
              <div>
                <h2 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>1. Evaluasi Tugas Kemarin</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    {summaryData?.yesterdayDate || 'Kemarin'}
                  </span>
                </h2>
                <p className="text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                  Evaluasi hasil kerja, hambatan di lapangan, dan penyelesaian tugas
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                {filteredYesterday.length} Task
              </span>
            </div>

            {/* Yesterday Task List */}
            {filteredYesterday.length === 0 ? (
              <div className="py-12 text-center text-xs italic" style={{ color: 'var(--text-muted, #64748b)' }}>
                Tidak ada data tugas yang tercatat pada hari kemarin.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredYesterday.map((task) => {
                  const parsed = parseTasklist(task.description || '');
                  const isDone = task.status === 'Resolved' || task.status === 'Done' || task.status === 'Closed';

                  return (
                    <div 
                      key={task.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isDone 
                          ? 'border-emerald-500/30 bg-emerald-500/5' 
                          : 'border-amber-500/30 bg-amber-500/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold font-mono border bg-slate-500/10 text-slate-600 dark:text-slate-300">
                              {task.section}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              task.priority === 'Urgent' ? 'bg-rose-500/15 text-rose-600' :
                              task.priority === 'High' ? 'bg-amber-500/15 text-amber-600' :
                              'bg-slate-500/10 text-slate-500'
                            }`}>
                              {task.priority}
                            </span>
                            {task.targetDate && (
                              <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-blue-500/10 text-blue-600">
                                Target: {formatDisplayTargetDate(task.targetDate)}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-xs sm:text-sm leading-tight text-slate-900 dark:text-slate-100">
                            {task.title}
                          </h3>
                        </div>

                        {/* Dropdown Status */}
                        <div className="shrink-0">
                          <NotionDropdownCell
                            type="status"
                            value={task.status}
                            onChange={(newVal) => handleStatusChange(task.id, newVal)}
                          />
                        </div>
                      </div>

                      {/* PIC & Assigner Details */}
                      <div className="mt-2.5 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px]" style={{ borderColor: 'var(--border-main, #e2e8f0)', color: 'var(--text-muted, #64748b)' }}>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-teal-500" />
                          <span>PIC: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{task.assigneeName}</strong></span>
                        </div>
                        <div>
                          <span>Arahan: <em className="italic">{task.assignedByName}</em></span>
                        </div>
                      </div>

                      {/* Subtasks Progress if any */}
                      {parsed.hasTasklist && (
                        <div className="mt-2 pt-2 border-t space-y-1.5" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span style={{ color: 'var(--text-muted, #64748b)' }}>Subtask Checklist:</span>
                            <span className="font-bold">{parsed.completed}/{parsed.total} ({parsed.percent}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${parsed.percent}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Carry over action if not yet done */}
                      {!isDone && (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleCarryOverTask(task)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
                          >
                            <ArrowRight className="w-3 h-3" />
                            <span>Lanjutkan ke Fokus Hari Ini</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. COLUMN KANAN: FOKUS & ON-GOING HARI INI */}
          <div 
            className="rounded-3xl border shadow-sm p-4 space-y-4"
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              borderColor: 'var(--border-main, #e2e8f0)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
              <div>
                <h2 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
                  <span>2. Fokus & On-Going Task Hari Ini</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                    {summaryData?.todayDate || 'Hari Ini'}
                  </span>
                </h2>
                <p className="text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                  Daftar arahan kegiatan yang dieksekusi hari ini oleh bawahan & PIC
                </p>
              </div>
              <button
                onClick={openAssignModal}
                className="p-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Tambah arahan tugas baru"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tambah</span>
              </button>
            </div>

            {/* Today Task List */}
            {filteredToday.length === 0 ? (
              <div className="py-12 text-center text-xs italic" style={{ color: 'var(--text-muted, #64748b)' }}>
                Belum ada tugas yang ditugaskan untuk hari ini. Klik <strong className="text-teal-600 cursor-pointer" onClick={openAssignModal}>+ Arahan Tugas Baru</strong> untuk menambahkan.
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredToday.map((task) => {
                  const parsed = parseTasklist(task.description || '');
                  const isDone = task.status === 'Resolved' || task.status === 'Done' || task.status === 'Closed';

                  return (
                    <div 
                      key={task.id}
                      className="p-4 rounded-2xl border shadow-xs transition-all hover:border-teal-500/50"
                      style={{
                        backgroundColor: 'var(--input-bg, #f8fafc)',
                        borderColor: 'var(--border-main, #e2e8f0)'
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold font-mono border bg-slate-500/10 text-slate-700 dark:text-slate-300">
                              {task.section}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              task.priority === 'Urgent' ? 'bg-rose-500/15 text-rose-600 animate-pulse' :
                              task.priority === 'High' ? 'bg-amber-500/15 text-amber-600' :
                              'bg-slate-500/10 text-slate-500'
                            }`}>
                              {task.priority}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-blue-500/10 text-blue-600">
                              Target: {formatDisplayTargetDate(task.targetDate)}
                            </span>
                          </div>
                          
                          <h3 className="font-bold text-sm sm:text-base leading-snug text-slate-900 dark:text-slate-100">
                            {task.title}
                          </h3>
                        </div>

                        {/* Dropdown Status Selector (Realtime Sync to Bulletin) */}
                        <div className="shrink-0">
                          <NotionDropdownCell
                            type="status"
                            value={task.status}
                            onChange={(newVal) => handleStatusChange(task.id, newVal)}
                          />
                        </div>
                      </div>

                      {/* Interactive Subtask Checklist Items (Direct Checkable in Log Book) */}
                      {parsed.hasTasklist && (
                        <div className="mt-3 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="font-semibold text-slate-500">Progress Checklist:</span>
                            <span className="font-bold text-teal-600 dark:text-teal-400">{parsed.completed}/{parsed.total} ({parsed.percentage}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${parsed.percentage}%` }} />
                          </div>

                          <div className="space-y-1.5 pt-1">
                            {parsed.items.map((item) => (
                              <label
                                key={item.index}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-start gap-2 text-xs cursor-pointer select-none group/item hover:text-teal-600 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={() => handleToggleSubtask(task, item.index)}
                                  className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                                />
                                <span className={`flex-1 ${item.checked ? 'line-through opacity-50' : 'font-medium'}`}>
                                  {item.text}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* PIC & Assigner Footer */}
                      <div className="mt-3 pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-[11px]" style={{ borderColor: 'var(--border-main, #e2e8f0)', color: 'var(--text-muted, #64748b)' }}>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-teal-500" />
                          <span>PIC: <strong className="text-slate-800 dark:text-slate-200 font-bold">{task.assigneeName}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Ditugaskan oleh: <strong className="text-slate-600 dark:text-slate-400">{task.assignedByName}</strong></span>
                          {task.bulletinPostId && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-teal-600 dark:text-teal-400">
                              <FileText className="w-3 h-3" />
                              <span>Synced</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN NEW TASK / ARAHAN MEETING PAGI                              */}
      {/* ========================================================================= */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
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
                  <h3 className="font-bold text-base">Assign Tugas / Arahan Meeting Pagi</h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                    Tugaskan kegiatan ke bawahan & otomatis sinkronkan ke dokumen Buletin
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

              {/* Pilih PIC Bawahan (Searchable Combobox) */}
              <SearchablePicSelect
                valueNik={newAssigneeNik}
                valueName={newAssigneeName}
                onChange={(nik, name) => {
                  setNewAssigneeNik(nik);
                  setNewAssigneeName(name);
                }}
                employees={employeesList}
                defaultSection={userSection}
              />

              {/* Prioritas & Target Tanggal Selesai */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <label className="text-xs font-bold block">Target Tanggal Selesai</label>
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
                  <p className="text-[10px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                    Bebas pilih tanggal target penyelesaian
                  </p>
                </div>
              </div>

              {/* WYSIWYG Interactive Checklist Builder */}
              <WysiwygChecklistBuilder
                items={checklistDrafts}
                onChange={setChecklistDrafts}
                notes={newNotes}
                onNotesChange={setNewNotes}
              />

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
    </div>
  );
}
