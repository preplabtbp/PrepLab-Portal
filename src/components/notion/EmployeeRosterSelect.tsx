import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, User, Check, X, AlertCircle, ShieldCheck, 
  Loader2, ChevronDown, CheckCircle2
} from 'lucide-react';

export interface EmployeeRosterItem {
  nik: string;
  name: string;
  nama?: string;
  jabatan?: string;
  position?: string;
  section?: string;
  department?: string;
  shift?: string;
  pt?: string;
  avatar?: string;
  photo?: string;
  statusKontrak?: string;
  [key: string]: any;
}

export interface EmployeeRosterSelectProps {
  value: string; // The formatted value, e.g. "Muhammad Naufal (04D21001047)" or "Muhammad Naufal"
  onChange: (value: string, employee: EmployeeRosterItem | null) => void;
  employeesList?: EmployeeRosterItem[];
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string | null;
  accentColor?: 'amber' | 'teal' | 'indigo';
  id?: string;
  helperText?: string;
}

const AVATAR_GRADIENTS = [
  'from-teal-600 to-emerald-700',
  'from-indigo-600 to-blue-700',
  'from-purple-600 to-violet-700',
  'from-rose-600 to-pink-700',
  'from-amber-600 to-orange-700',
  'from-cyan-600 to-teal-700',
  'from-blue-600 to-cyan-700',
  'from-slate-700 to-slate-900',
];

function getGradientForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

export function EmployeeRosterSelect({
  value,
  onChange,
  employeesList: propEmployeesList,
  placeholder = 'Cari berdasarkan NIK atau Nama Karyawan di roster...',
  label = 'PIC / Penanggung Jawab Tindak Lanjut',
  required = true,
  disabled = false,
  className = '',
  error: customError,
  accentColor = 'amber',
  id = 'pic-roster-select',
  helperText
}: EmployeeRosterSelectProps) {
  const [internalList, setInternalList] = useState<EmployeeRosterItem[]>(() => {
    if (propEmployeesList && propEmployeesList.length > 0) return propEmployeesList;
    try {
      const cached = sessionStorage.getItem('preplab_roster_cache') || localStorage.getItem('preplab_roster_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [];
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRosterItem | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync propEmployeesList if updated by parent
  useEffect(() => {
    if (propEmployeesList && propEmployeesList.length > 0) {
      setInternalList(propEmployeesList);
    }
  }, [propEmployeesList]);

  // Fetch roster if empty
  useEffect(() => {
    if (internalList.length === 0) {
      let isMounted = true;
      setIsLoading(true);

      // Try /api/roster first, fallback to /api/employees
      fetch('/api/roster')
        .then(res => {
          if (!res.ok) throw new Error('Failed /api/roster');
          return res.json();
        })
        .then(data => {
          if (!isMounted) return;
          const list = Array.isArray(data) ? data : (data.roster || []);
          if (list.length > 0) {
            setInternalList(list);
            try {
              sessionStorage.setItem('preplab_roster_cache', JSON.stringify(list));
            } catch {}
          } else {
            throw new Error('Empty roster');
          }
        })
        .catch(() => {
          // Fallback to /api/employees
          return fetch('/api/employees')
            .then(r => r.json())
            .then(data => {
              if (!isMounted) return;
              if (Array.isArray(data) && data.length > 0) {
                setInternalList(data);
              }
            });
        })
        .catch(err => {
          console.warn('Gagal memuat data roster untuk PIC select:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [internalList.length]);

  // Helper to match an employee from string (either "Name (NIK)", NIK, or exact Name)
  const resolveEmployeeFromString = (val: string, list: EmployeeRosterItem[]): EmployeeRosterItem | null => {
    if (!val || val === '-' || !list || list.length === 0) return null;
    const trimmed = val.trim();

    // Check "Name (NIK)"
    const parenMatch = trimmed.match(/^(.*?)\s*\(([A-Za-z0-9_.-]+)\)$/);
    if (parenMatch) {
      const pName = parenMatch[1].trim().toLowerCase();
      const pNik = parenMatch[2].trim().toUpperCase();
      const byNik = list.find(e => (e.nik || '').toUpperCase() === pNik);
      if (byNik) return byNik;
      const byName = list.find(e => (e.name || e.nama || '').trim().toLowerCase() === pName);
      if (byName) return byName;
    }

    // Check direct NIK
    const byNikDirect = list.find(e => (e.nik || '').toUpperCase() === trimmed.toUpperCase());
    if (byNikDirect) return byNikDirect;

    // Check direct exact Name
    const byNameDirect = list.find(e => (e.name || e.nama || '').trim().toLowerCase() === trimmed.toLowerCase());
    if (byNameDirect) return byNameDirect;

    // Check start of Name
    const byNameStart = list.find(e => (e.name || e.nama || '').trim().toLowerCase().startsWith(trimmed.toLowerCase()));
    if (byNameStart && trimmed.length >= 3) return byNameStart;

    return null;
  };

  // Synchronize value prop with selectedEmployee
  useEffect(() => {
    if (!value || value === '-') {
      setSelectedEmployee(null);
      return;
    }
    if (internalList.length > 0) {
      const found = resolveEmployeeFromString(value, internalList);
      if (found) {
        setSelectedEmployee(found);
        setValidationError(null);
      } else {
        // If not found in roster and value is non-empty, flag as unverified
        setSelectedEmployee(null);
        setValidationError('Personil ini tidak terdaftar dalam data roster aktif.');
      }
    }
  }, [value, internalList]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        // If user typed something but didn't select, attempt auto-match
        if (searchQuery.trim() && !selectedEmployee) {
          const match = resolveEmployeeFromString(searchQuery.trim(), internalList);
          if (match) {
            handleSelectEmployee(match);
          } else {
            setValidationError('Wajib memilih personil yang valid dari data roster!');
          }
        }
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [searchQuery, selectedEmployee, internalList]);

  // Filtered roster suggestions
  const filteredSuggestions = useMemo(() => {
    if (!internalList || internalList.length === 0) return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      // Return first 10 employees as preview
      return internalList.slice(0, 10);
    }

    return internalList
      .filter((emp) => {
        const name = (emp.name || emp.nama || '').toLowerCase();
        const nik = (emp.nik || '').toLowerCase();
        const jab = (emp.jabatan || emp.position || '').toLowerCase();
        const sec = (emp.section || emp.department || '').toLowerCase();
        return name.includes(q) || nik.includes(q) || jab.includes(q) || sec.includes(q);
      })
      .sort((a, b) => {
        const aNik = (a.nik || '').toLowerCase();
        const bNik = (b.nik || '').toLowerCase();
        const aName = (a.name || a.nama || '').toLowerCase();
        const bName = (b.name || b.nama || '').toLowerCase();

        // Exact NIK match priority
        if (aNik === q) return -1;
        if (bNik === q) return 1;

        // NIK starts with query priority
        if (aNik.startsWith(q) && !bNik.startsWith(q)) return -1;
        if (!aNik.startsWith(q) && bNik.startsWith(q)) return 1;

        // Name starts with query priority
        if (aName.startsWith(q) && !bName.startsWith(q)) return -1;
        if (!aName.startsWith(q) && bName.startsWith(q)) return 1;

        return aName.localeCompare(bName);
      })
      .slice(0, 15);
  }, [internalList, searchQuery]);

  const handleSelectEmployee = (emp: EmployeeRosterItem) => {
    setSelectedEmployee(emp);
    setSearchQuery('');
    setIsOpen(false);
    setValidationError(null);
    const empName = emp.name || emp.nama || emp.nik;
    const formatted = emp.nik ? `${empName} (${emp.nik})` : empName;
    onChange(formatted, emp);
  };

  const handleClearSelection = () => {
    setSelectedEmployee(null);
    setSearchQuery('');
    setValidationError(null);
    onChange('', null);
    setTimeout(() => {
      inputRef.current?.focus();
      setIsOpen(true);
    }, 50);
  };

  const displayError = customError || validationError;

  // Accent classes
  const accentRing = accentColor === 'amber' 
    ? 'focus-within:ring-amber-500 focus-within:border-amber-500' 
    : accentColor === 'teal' 
    ? 'focus-within:ring-teal-500 focus-within:border-teal-500' 
    : 'focus-within:ring-indigo-500 focus-within:border-indigo-500';

  const badgeBg = accentColor === 'amber'
    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
    : accentColor === 'teal'
    ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/30'
    : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30';

  return (
    <div ref={containerRef} className={`space-y-1.5 ${className}`}>
      {label && (
        <label 
          htmlFor={id} 
          className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between"
        >
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>{label}</span>
            {required && <span className="text-rose-500 font-extrabold">*</span>}
          </span>
          <span className="text-[10px] text-slate-400 font-normal">
            Validasi Roster: <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{internalList.length > 0 ? `${internalList.length} personil` : 'Memuat...'}</strong>
          </span>
        </label>
      )}

      {/* SELECTED EMPLOYEE CARD */}
      {selectedEmployee ? (
        <div 
          className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
            displayError 
              ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20' 
              : 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-transparent dark:border-emerald-500/30 dark:bg-slate-800/80'
          } shadow-xs group`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar / Photo */}
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-center bg-slate-100 dark:bg-slate-800">
              {selectedEmployee.avatar || selectedEmployee.photo || (selectedEmployee.nik && !brokenImages[selectedEmployee.nik]) ? (
                <img
                  src={selectedEmployee.avatar || selectedEmployee.photo || `/api/employees/photo/${selectedEmployee.nik}`}
                  alt={selectedEmployee.name || selectedEmployee.nama}
                  onError={() => {
                    if (selectedEmployee.nik) {
                      setBrokenImages(prev => ({ ...prev, [selectedEmployee.nik]: true }));
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${getGradientForName(selectedEmployee.name || selectedEmployee.nama || 'A')} text-white font-extrabold flex items-center justify-center text-sm uppercase`}>
                  {(selectedEmployee.name || selectedEmployee.nama || 'P').charAt(0)}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
              </div>
            </div>

            {/* Employee Info */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {selectedEmployee.name || selectedEmployee.nama}
                </h4>
                {selectedEmployee.nik && (
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${badgeBg}`}>
                    {selectedEmployee.nik}
                  </span>
                )}
                {selectedEmployee.shift && (
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {selectedEmployee.shift}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                {selectedEmployee.jabatan || selectedEmployee.position || 'Personil'} 
                {selectedEmployee.section ? ` • ${selectedEmployee.section}` : ''}
              </p>
            </div>
          </div>

          {/* Action: Change or Clear */}
          {!disabled && (
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <button
                type="button"
                onClick={handleClearSelection}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 hover:border-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Ganti atau batalkan pilihan PIC ini"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ganti</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* SEARCH & AUTOCOMPLETE INPUT */
        <div className="relative">
          <div 
            className={`relative flex items-center rounded-xl border bg-white dark:bg-slate-800 transition-all shadow-xs ${accentRing} ${
              displayError 
                ? 'border-rose-500 ring-1 ring-rose-500' 
                : 'border-slate-300 dark:border-slate-700'
            }`}
          >
            <div className="pl-3.5 text-slate-400 pointer-events-none">
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </div>

            <input
              ref={inputRef}
              id={id}
              type="text"
              disabled={disabled}
              value={searchQuery}
              onFocus={() => setIsOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsOpen(true);
                if (validationError) setValidationError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredSuggestions.length > 0) {
                    handleSelectEmployee(filteredSuggestions[0]);
                  }
                } else if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
              placeholder={placeholder}
              className="w-full text-xs sm:text-sm py-2.5 pl-2.5 pr-9 bg-transparent text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
              autoComplete="off"
            />

            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
                className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Buka daftar personil"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* AUTOCOMPLETE POPUP DROPDOWN */}
          {isOpen && (
            <div 
              className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl max-h-64 overflow-y-auto p-1.5 divide-y divide-slate-100 dark:divide-slate-700/60 animate-in fade-in zoom-in-95 duration-150"
            >
              <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Pilih Personil di Roster ({filteredSuggestions.length})</span>
                <span className="text-amber-600 dark:text-amber-400 lowercase font-medium">
                  {searchQuery ? `filter: "${searchQuery}"` : 'ketik NIK / Nama'}
                </span>
              </div>

              {filteredSuggestions.length > 0 ? (
                <div className="pt-1 space-y-1">
                  {filteredSuggestions.map((emp, idx) => {
                    const empName = emp.name || emp.nama || 'Tanpa Nama';
                    const gradient = getGradientForName(empName);
                    const photoUrl = emp.avatar || emp.photo || (emp.nik ? `/api/employees/photo/${emp.nik}` : null);
                    const isBroken = emp.nik ? brokenImages[emp.nik] : false;

                    return (
                      <button
                        key={emp.nik || emp.id || idx}
                        type="button"
                        onClick={() => handleSelectEmployee(emp)}
                        className="w-full text-left p-2 rounded-xl hover:bg-amber-500/10 dark:hover:bg-amber-500/15 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Mini Avatar */}
                          <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 flex items-center justify-center bg-slate-100 dark:bg-slate-900 shadow-2xs">
                            {photoUrl && !isBroken ? (
                              <img
                                src={photoUrl}
                                alt={empName}
                                onError={() => {
                                  if (emp.nik) setBrokenImages(prev => ({ ...prev, [emp.nik]: true }));
                                }}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className={`w-full h-full bg-gradient-to-br ${gradient} text-white font-black flex items-center justify-center text-xs uppercase`}>
                                {empName.charAt(0)}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-amber-700 dark:group-hover:text-amber-400">
                                {empName}
                              </span>
                              {emp.nik && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-semibold shrink-0">
                                  {emp.nik}
                                </span>
                              )}
                            </div>
                            <div className="text-[10.5px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                              <span>{emp.jabatan || emp.position || 'Personil'}</span>
                              {emp.section && <span>• {emp.section}</span>}
                              {emp.shift && <span className="text-teal-600 dark:text-teal-400 font-medium">• Shift {emp.shift}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors ml-2">
                          <CheckCircle2 className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-6 px-3 text-center space-y-1">
                  <AlertCircle className="w-6 h-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Personil Tidak Ditemukan
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Tidak ada karyawan di data roster yang cocok dengan kata kunci &quot;{searchQuery}&quot;. Pastikan NIK atau nama sesuai data resmi.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ERROR OR HELPER TEXT */}
      {displayError ? (
        <div className="flex items-center gap-1 text-[11px] text-rose-500 font-medium mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{displayError}</span>
        </div>
      ) : helperText ? (
        <p className="text-[10.5px] text-slate-400 italic mt-0.5">{helperText}</p>
      ) : (
        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
          <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-500" />
          <span>PIC divalidasi ketat terhadap database roster agar personil dapat dipertanggungjawabkan.</span>
        </div>
      )}
    </div>
  );
}
