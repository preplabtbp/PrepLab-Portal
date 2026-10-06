import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Search, User, MapPin, Briefcase, Calendar, Phone, Activity, FileText, BarChart3, ChevronRight, CheckCircle2, AlertTriangle, Fingerprint, Users, X, Database, RefreshCw, FileSpreadsheet, UploadCloud, Camera } from 'lucide-react';
import { Card, Input, Button } from './ui';
import { motion, AnimatePresence } from 'motion/react';
import { EmployeeImportModal } from './EmployeeImportModal';
import { toast } from 'sonner';
import { formatAvatarUrl } from '../lib/avatarUtils';

export function EmployeeDatabaseScreen({ inspectorNik, onBack }: { inspectorNik: string, onBack?: () => void }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [developerList, setDeveloperList] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/developers')
      .then(res => res.json())
      .then(json => {
        const list = Array.isArray(json) ? json : (json?.data || []);
        setDeveloperList(list);
      })
      .catch(() => {});
  }, []);

  // Hanya Section Administration atau Developer yang boleh mengupdate database karyawan
  const canManageDatabase = useMemo(() => {
    const cleanNik = (inspectorNik || '').trim().toUpperCase();
    const HARDCODED_DEVS = ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN'];
    if (HARDCODED_DEVS.includes(cleanNik)) return true;
    if (developerList.some(d => (d.nik || '').toUpperCase() === cleanNik)) return true;

    try {
      const savedProfile = localStorage.getItem('p2h_inspector_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        const sec = (p.section || '').toLowerCase();
        const dept = (p.department || '').toLowerCase();
        const jab = (p.jabatan || '').toLowerCase();
        if (
          sec.includes('administrasi') || sec.includes('administration') ||
          dept.includes('administrasi') || dept.includes('administration') ||
          jab.includes('admin')
        ) {
          return true;
        }
      }
    } catch {}

    const me = employees.find(e => (e.nik || '').toUpperCase() === cleanNik);
    if (me) {
      const sec = (me.section || '').toLowerCase();
      const dept = (me.department || '').toLowerCase();
      const jab = (me.jabatan || '').toLowerCase();
      if (
        sec.includes('administrasi') || sec.includes('administration') ||
        dept.includes('administrasi') || dept.includes('administration') ||
        jab.includes('admin')
      ) {
        return true;
      }
    }

    return false;
  }, [inspectorNik, developerList, employees]);


  const fetchEmployees = async () => {
    try {
      const res = await fetch(`/api/employees/hierarchy/${inspectorNik}`);
      if (!res.ok) throw new Error("Gagal mengambil data karyawan");
      const data = await res.json();
      if (data.status === 'success') {
        setEmployees(data.data || []);
      } else {
        throw new Error(data.message || "Gagal mengambil data karyawan");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [inspectorNik]);

  const handleManualSync = async () => {
    if (!canManageDatabase) {
      toast.error('Akses ditolak: Hanya Section Administration atau Developer yang dapat menyinkronkan database karyawan.');
      return;
    }
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/roster/sync', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-nik': inspectorNik
        },
        body: JSON.stringify({ editorNik: inspectorNik })
      });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback({ type: 'success', message: data.message || 'Sinkronisasi database berhasil!' });
        await fetchEmployees();
      } else {
        setSyncFeedback({ type: 'error', message: data.message || 'Gagal sinkronisasi data dari Google Sheets' });
      }
    } catch (e: any) {
      setSyncFeedback({ type: 'error', message: 'Koneksi gagal: ' + e.message });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canManageDatabase) {
      toast.error('Akses ditolak: Hanya Section Administration atau Developer yang dapat mengubah foto karyawan di database.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file || !selectedEmployee) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Harap pilih file gambar (JPG, PNG, WebP)');
      return;
    }

    setIsUploadingPhoto(true);
    toast.loading('Mengompresi & memperbarui foto...', { id: 'emp-avatar-upload' });

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 320;
            let width = img.width;
            let height = img.height;
            if (width > height) {
              if (width > maxDim) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              }
            } else {
              if (height > maxDim) {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error('Gagal memproses kanvas foto');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);

            const res = await fetch('/api/employees/photo', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-user-nik': inspectorNik
              },
              body: JSON.stringify({ 
                nik: selectedEmployee.nik, 
                photo: compressedDataUrl,
                editorNik: inspectorNik
              })
            });
            const resData = await res.json();
            if (resData.status === 'success') {
              setSelectedEmployee((prev: any) => ({ ...prev, photo: compressedDataUrl }));
              setEmployees((prev: any[]) => prev.map(emp => emp.nik === selectedEmployee.nik ? { ...emp, photo: compressedDataUrl } : emp));
              toast.success(`Foto karyawan ${selectedEmployee.name || ''} berhasil diperbarui di database!`, { id: 'emp-avatar-upload' });
            } else {
              throw new Error(resData.message || 'Gagal menyimpan foto ke server');
            }
          } catch (uploadErr: any) {
            toast.error('Gagal mengunggah foto: ' + uploadErr.message, { id: 'emp-avatar-upload' });
          } finally {
            setIsUploadingPhoto(false);
            if (photoInputRef.current) photoInputRef.current.value = '';
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setIsUploadingPhoto(false);
      toast.error('Gagal memproses gambar: ' + err.message, { id: 'emp-avatar-upload' });
    }
  };

  const filteredSearch = useMemo(() => {
    if (!searchTerm) return [];
    return employees.filter(e => {
      const matchesSearch = (e.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (e.nik || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    }).slice(0, 8);
  }, [employees, searchTerm]);

  if (loading) {
    return (
      <div className="flex-1 p-4 w-full max-w-full px-4 md:px-8 w-full h-full bg-transparent flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#22a7b8] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-500">Memuat database karyawan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-4 w-full max-w-full px-4 md:px-8 w-full h-full bg-transparent flex items-center justify-center text-center">
        <div>
          <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Terjadi Kesalahan</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={onBack}>Kembali</Button>
        </div>
      </div>
    );
  }

  // The Search Input Component that we will share across states via layoutId
  const renderSearchBar = (isSmall: boolean) => (
    <motion.div 
      layoutId="search-container"
      className={`relative z-50 ${isSmall ? 'w-64 md:w-80' : 'w-full max-w-xl mx-auto'}`}
    >
      <div className="relative">
        <Input
          type="text"
          placeholder="Ketik NIK atau Nama..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full rounded-2xl shadow-sm border-slate-200 focus:ring-4 focus:ring-[#22a7b8]/20 focus:border-[#22a7b8] bg-white
            ${isSmall ? 'pl-10 py-2.5 text-sm' : 'pl-12 py-6 text-lg'}`}
        />
        <Search className={`absolute text-slate-400 ${isSmall ? 'left-3 w-5 h-5 top-2.5' : 'left-4 w-6 h-6 top-1/2 -translate-y-1/2'}`} />
        
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')} 
            className={`absolute text-slate-400 hover:text-slate-600 ${isSmall ? 'right-3 top-2.5' : 'right-4 top-1/2 -translate-y-1/2'}`}
          >
            <X className={isSmall ? "w-4 h-4" : "w-5 h-5"} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {searchTerm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`absolute top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden
              ${isSmall ? 'right-0 w-[320px] sm:w-[400px]' : 'left-0 right-0'}`}
          >
            {filteredSearch.length > 0 ? (
              <ul className="py-2 max-h-[60vh] overflow-y-auto">
                {filteredSearch.map(emp => (
                  <li key={emp.nik}>
                    <button
                      onClick={() => {
                        setSelectedEmployee(emp);
                        setSearchTerm('');
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center transition-colors border-b border-slate-50 last:border-0"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mr-3 overflow-hidden bg-[#e6f7f9] text-[#22a7b8] font-bold border border-[#a2e0e8]">
                        {emp.photo ? (
                          <img 
                            src={formatAvatarUrl(emp.photo)} 
                            alt={emp.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{emp.name?.charAt(0) || '?'}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-800 truncate">{emp.name}</h4>
                        <p className="text-sm text-slate-500 truncate">{emp.nik} • {emp.jabatan || 'Tanpa Jabatan'}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-slate-500">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p>Karyawan tidak ditemukan</p>
                <p className="text-sm mt-1">Pastikan NIK atau nama sudah diketik dengan benar.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-slate-100 overflow-hidden relative">
      {/* Top Navigation */}
      <div className="bg-white px-4 py-3 border-b flex items-center justify-between sticky top-0 z-40 shrink-0 shadow-sm min-h-[64px]">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={() => selectedEmployee ? setSelectedEmployee(null) : (onBack && onBack())} className="mr-2">
            <ArrowLeft className="w-5 h-5 mr-1" />
            {selectedEmployee ? 'Kembali' : 'Tutup'}
          </Button>
          {!selectedEmployee && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg bg-[#f09b13] text-white font-bold text-xs uppercase tracking-wider shadow-xs hidden sm:inline-block">
                Manpower
              </span>
              <h1 className="text-lg font-bold text-slate-800 hidden sm:block">
                Database Karyawan
              </h1>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!selectedEmployee && canManageDatabase && (
            <>
              <Button
                onClick={() => setIsImportModalOpen(true)}
                size="sm"
                className="bg-white hover:bg-slate-50 text-[#135e69] border border-[#a2e0e8] flex items-center gap-1.5 rounded-xl text-xs font-bold px-3 py-1.5 shadow-xs transition-all cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-[#22a7b8]" />
                <span>Import CSV / Excel</span>
              </Button>

              <Button
                onClick={handleManualSync}
                disabled={isSyncing}
                size="sm"
                className="bg-[#22a7b8] hover:bg-[#1b8f9e] text-white flex items-center gap-1.5 rounded-xl text-xs font-semibold px-3 py-1.5 shadow-sm transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Menyinkronkan...' : 'Sinkron Google Sheets'}
              </Button>
            </>
          )}

          {/* Small Search Bar (Animated into header) */}
          {selectedEmployee && renderSearchBar(true)}
        </div>
      </div>

      {syncFeedback && (
        <div className={`p-3 mx-4 mt-3 rounded-xl text-xs flex items-center justify-between gap-2 shadow-sm ${
          syncFeedback.type === 'success'
            ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            : 'bg-rose-50 border border-rose-200 text-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span className="font-medium">{syncFeedback.message}</span>
          </div>
          <button 
            onClick={() => setSyncFeedback(null)} 
            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {!selectedEmployee ? (
          /* SEARCH MODE - ENTERPRISE HERO */
          <div className="w-full min-h-full flex flex-col relative overflow-hidden bg-slate-900">
            {/* Enterprise Hero Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#104b50] via-[#1a757e] to-[#32AEB8] z-0">
              {/* Subtle Grid overlay */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] z-0"></div>
              {/* Glowing orbs */}
              <div className="absolute top-0 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-[#f09b13]/25 rounded-full blur-3xl translate-y-1/2"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto w-full pt-10 md:pt-32 px-4 pb-20 flex-1 flex flex-col items-center">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8 w-full"
              >
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f09b13] text-white text-xs font-extrabold uppercase tracking-wider mb-4 shadow-lg ring-2 ring-white/20">
                  <Database className="w-3.5 h-3.5" />
                  <span>Manpower</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black text-white mb-3 md:mb-4 tracking-tight drop-shadow-sm">
                  Laboratory Administration
                </h2>
                <p className="text-white/90 text-sm md:text-lg max-w-2xl mx-auto font-light leading-relaxed px-2 drop-shadow-xs">
                  Manpower Attendance & Database Directory. Ketik NIK atau nama untuk menelusuri profil karyawan, melacak kehadiran, dan memantau riwayat jabatan secara real-time.
                </p>
              </motion.div>

              {/* Big Search Bar */}
              <div className="w-full max-w-2xl mb-10 md:mb-12 relative group px-2 md:px-0">
                <div className="absolute inset-0 bg-white/20 blur-xl rounded-full transition-opacity group-hover:opacity-100 opacity-50"></div>
                {renderSearchBar(false)}
              </div>

              {/* Quick Stats Dashboard */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full max-w-3xl px-2"
              >
                <div className="bg-white/15 backdrop-blur-md rounded-xl md:rounded-2xl p-4 md:p-5 border border-white/20 text-center hover:bg-white/25 transition-colors shadow-lg">
                  <div className="text-white/80 text-[10px] md:text-xs uppercase font-bold tracking-wider mb-1 md:mb-2">Total Data</div>
                  <div className="text-2xl md:text-3xl font-bold text-white">{employees.length}</div>
                </div>
                <div className="bg-white/15 backdrop-blur-md rounded-xl md:rounded-2xl p-4 md:p-5 border border-white/20 text-center hover:bg-white/25 transition-colors shadow-lg">
                  <div className="text-[#fcd99a] text-[10px] md:text-xs uppercase font-bold tracking-wider mb-1 md:mb-2">Dept. Aktif</div>
                  <div className="text-2xl md:text-3xl font-bold text-white">{new Set(employees.map(e => e.department).filter(Boolean)).size}</div>
                </div>
                <div className="bg-white/15 backdrop-blur-md rounded-xl md:rounded-2xl p-4 md:p-5 border border-white/20 text-center hover:bg-white/25 transition-colors shadow-lg">
                  <div className="text-white/80 text-[10px] md:text-xs uppercase font-bold tracking-wider mb-1 md:mb-2">Status PKWTT</div>
                  <div className="text-2xl md:text-3xl font-bold text-white">
                    {employees.filter(e => e.statusKontrak && e.statusKontrak.toLowerCase().includes('pkwtt')).length}
                  </div>
                </div>
                <div className="bg-white/15 backdrop-blur-md rounded-xl md:rounded-2xl p-4 md:p-5 border border-white/20 text-center hover:bg-white/25 transition-colors shadow-lg">
                  <div className="text-rose-200 text-[10px] md:text-xs uppercase font-bold tracking-wider mb-1 md:mb-2">Sakit Hari Ini</div>
                  <div className="text-2xl md:text-3xl font-bold text-rose-300">0</div>
                </div>
              </motion.div>
            </div>
          </div>
        ) : (
          /* PROFILE MODE */
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col lg:flex-row min-h-full"
          >
            {/* SIDEBAR (Profile Info) - PALET #32AEB8 */}
            <div className="lg:w-80 bg-gradient-to-b from-[#32AEB8] via-[#269ca6] to-[#1c7e87] text-white shrink-0 shadow-2xl z-10 p-6 lg:p-8 flex flex-col items-center lg:items-start text-center lg:text-left relative overflow-hidden border-r border-[#32AEB8]/30">
              <div className="absolute top-0 right-0 p-32 bg-white/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
              
              <div className="flex flex-col items-center lg:items-start mb-6 w-full">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-white/20 border-2 border-white/40 overflow-hidden flex items-center justify-center shrink-0 shadow-xl relative backdrop-blur-xs ring-4 ring-black/5 group">
                  {selectedEmployee.photo ? (
                    <img 
                      src={formatAvatarUrl(selectedEmployee.photo)} 
                      alt={selectedEmployee.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <User className="w-16 h-16 text-white" />
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-[#1c7e87]/90 backdrop-blur-xs flex flex-col items-center justify-center text-xs text-white">
                      <RefreshCw className="w-6 h-6 animate-spin text-white mb-1" />
                      <span>Mengunggah...</span>
                    </div>
                  )}
                </div>

                {canManageDatabase && (
                  <>
                    <input 
                      type="file" 
                      ref={photoInputRef} 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handlePhotoUpload} 
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      className="mt-3 text-xs font-bold px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 text-white flex items-center gap-1.5 transition-all shadow-sm border border-white/30 cursor-pointer backdrop-blur-xs"
                      title="Perbarui atau unggah foto karyawan di database (Khusus Administration & Developer)"
                    >
                      <Camera className="w-3.5 h-3.5 text-white" />
                      <span>{selectedEmployee.photo ? 'Ganti Foto' : 'Unggah Foto'}</span>
                    </button>
                  </>
                )}
              </div>

              <h2 className="text-xl lg:text-2xl font-black mb-1 leading-tight text-white drop-shadow-xs">{selectedEmployee.name}</h2>
              <p className="text-white mb-6 flex items-center justify-center lg:justify-start bg-[#f09b13] px-3.5 py-1.5 rounded-full text-xs font-black shadow-md ring-2 ring-white/20">
                <Fingerprint className="w-3.5 h-3.5 mr-1.5" />
                NIK: {selectedEmployee.nik}
              </p>

              <div className="w-full space-y-4 text-sm text-white">
                <div className="border-b border-white/25 pb-3">
                  <p className="text-[#e2f9fb] text-[11px] font-bold mb-1 uppercase tracking-wider">Jabatan Baru</p>
                  <p className="font-bold text-white text-base leading-snug">{selectedEmployee.jabatan || '-'}</p>
                </div>
                
                <div className="border-b border-white/25 pb-3">
                  <p className="text-[#e2f9fb] text-[11px] font-bold mb-1 uppercase tracking-wider">Perusahaan</p>
                  <p className="font-bold text-white">{selectedEmployee.pt || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-white/25 pb-3">
                  <div>
                    <p className="text-[#e2f9fb] text-[11px] font-bold mb-1 uppercase tracking-wider">Job Grade</p>
                    <p className="font-bold text-white">{selectedEmployee.jobGrade || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[#e2f9fb] text-[11px] font-bold mb-1 uppercase tracking-wider">Golongan</p>
                    <p className="font-bold text-white">{selectedEmployee.gol || '-'}</p>
                  </div>
                </div>

                <div className="border-b border-white/25 pb-3">
                  <p className="text-[#e2f9fb] text-[11px] font-bold mb-1 uppercase tracking-wider">Bagian (Section)</p>
                  <p className="font-bold text-white">{selectedEmployee.section || selectedEmployee.department || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-white/25 pb-3">
                  <div>
                    <p className="text-[#e2f9fb] text-[11px] font-bold mb-1 uppercase tracking-wider">DOH Awal</p>
                    <p className="font-bold text-white">{selectedEmployee.tanggalAwalBergabung || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[#e2f9fb] text-[11px] font-bold mb-1 uppercase tracking-wider">Tgl Jabatan Baru</p>
                    <p className="font-bold text-white">{selectedEmployee.tanggalJabatanBaru || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[#e2f9fb] text-[11px] font-bold mb-1 uppercase tracking-wider">Masa Kerja</p>
                    <p className="font-bold text-white">{selectedEmployee.masaKerja || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[#e2f9fb] text-[11px] font-bold mb-1 uppercase tracking-wider">Masa Kerja Jabatan</p>
                    <p className="font-bold text-white">{selectedEmployee.masaKerjaJabatanTerakhir || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-50 pb-20">
              
              {/* HEADER W/ SPONSOR */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold text-slate-900">{selectedEmployee.name}</h1>
                  <p className="text-slate-500 mt-1 font-medium">{selectedEmployee.jabatan || 'Karyawan'}</p>
                </div>
                
                <Card className="p-4 bg-white shadow-sm border-l-4 border-l-[#f09b13] min-w-[200px]">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Sponsor</p>
                  <p className="font-extrabold text-slate-800 text-lg">{selectedEmployee.sponsor || '-'}</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                {/* STATUS CARDS */}
                <div className="xl:col-span-1 space-y-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2 text-[#32AEB8]" />
                    Status & Kehadiran
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Status Karyawan */}
                    <div className="bg-gradient-to-br from-[#38AEB8] via-[#2BA1AA] to-[#1C7F88] rounded-2xl p-4 text-white shadow-md shadow-[#2BA1AA]/20 border border-white/25 relative overflow-hidden group hover:shadow-lg transition-all">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                      <p className="text-[#E2F9FB] text-[11px] uppercase font-extrabold tracking-wider mb-1 relative z-10">Status Karyawan</p>
                      <p className="font-black text-lg text-white drop-shadow-xs relative z-10">{selectedEmployee.statusKaryawan || '-'}</p>
                    </div>

                    {/* Status Kontrak */}
                    <div className="bg-gradient-to-br from-[#F5A623] via-[#E89516] to-[#C97906] rounded-2xl p-4 text-white shadow-md shadow-[#E89516]/20 border border-white/25 relative overflow-hidden group hover:shadow-lg transition-all">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                      <p className="text-[#FEF6E7] text-[11px] uppercase font-extrabold tracking-wider mb-1 relative z-10">Status Kontrak</p>
                      <p className="font-black text-lg text-white drop-shadow-xs relative z-10">{selectedEmployee.statusKontrak || '-'}</p>
                    </div>

                    {/* Tgl Efektif Tidak Bekerja (Conditional) */}
                    {selectedEmployee.tanggalEfektifTidakBekerja && (
                      <div className="col-span-2 bg-gradient-to-br from-[#E13B56] via-[#CB2440] to-[#A8162E] rounded-2xl p-4 text-white shadow-md shadow-[#CB2440]/20 border border-white/25 flex justify-between items-center relative overflow-hidden">
                        <div className="relative z-10">
                          <p className="text-[#FDE8EC] text-[11px] uppercase font-extrabold tracking-wider mb-1">Tgl Efektif Tidak Bekerja</p>
                          <p className="font-black text-base drop-shadow-xs">{selectedEmployee.tanggalEfektifTidakBekerja}</p>
                        </div>
                        <Calendar className="w-6 h-6 text-white/60 relative z-10" />
                      </div>
                    )}

                    {/* Sisa Cuti (CT) */}
                    <div className="bg-gradient-to-br from-[#32A8B2] via-[#24959E] to-[#18757D] rounded-2xl p-4 text-white shadow-md shadow-[#24959E]/20 border border-white/25 relative overflow-hidden group hover:shadow-lg transition-all">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                      <p className="text-[#E2F9FB] text-[11px] uppercase font-extrabold tracking-wider mb-1 relative z-10">Sisa Cuti (CT)</p>
                      <p className="font-black text-2xl text-white drop-shadow-xs relative z-10">{selectedEmployee.sisaCt || '-'}</p>
                    </div>

                    {/* Jatuh Tempo CT */}
                    <div className="bg-gradient-to-br from-[#248D96] via-[#1A7780] to-[#125B63] rounded-2xl p-4 text-white shadow-md shadow-[#1A7780]/20 border border-white/25 relative overflow-hidden group hover:shadow-lg transition-all">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -translate-y-1/2 translate-x-1/2"></div>
                      <p className="text-[#D4F3F5] text-[11px] uppercase font-extrabold tracking-wider mb-1 relative z-10">Jatuh Tempo CT</p>
                      <p className="font-black text-base text-white drop-shadow-xs relative z-10">{selectedEmployee.jatuhTempoCt || '-'}</p>
                    </div>

                    {/* Tanggal Permanen */}
                    <div className="col-span-2 bg-gradient-to-br from-[#5B95DE] via-[#4680C8] to-[#346AAE] rounded-2xl p-4 text-white shadow-md shadow-[#4680C8]/20 border border-white/25 flex justify-between items-center relative overflow-hidden group hover:shadow-lg transition-all">
                      <div className="relative z-10">
                        <p className="text-[#E3EEFF] text-[11px] uppercase font-extrabold tracking-wider mb-1">Tanggal Permanen</p>
                        <p className="font-black text-base drop-shadow-xs">{selectedEmployee.tanggalPermanent || '-'}</p>
                      </div>
                      <Calendar className="w-8 h-8 text-white/50 relative z-10" />
                    </div>
                  </div>
                </div>

                {/* REKAP ABSENSI */}
                <div className="xl:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 2026 */}
                    <Card className="p-5 shadow-sm border-slate-200/60">
                      <h4 className="font-bold text-slate-700 mb-4 flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2 text-[#22a7b8]" />
                        Rekap Absensi 2026
                      </h4>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center p-2.5 rounded-lg bg-[#e6f7f9] border border-[#a2e0e8]">
                          <p className="text-[10px] md:text-xs uppercase font-extrabold text-[#135e69] mb-1">Izin</p>
                          <p className="font-black text-slate-800">0</p>
                        </div>
                        <div className="text-center p-2.5 rounded-lg bg-[#e6f7f9] border border-[#a2e0e8]">
                          <p className="text-[10px] md:text-xs uppercase font-extrabold text-[#22a7b8] mb-1">I.Khusus</p>
                          <p className="font-black text-slate-800">0</p>
                        </div>
                        <div className="text-center p-2.5 rounded-lg bg-[#fef6e7] border border-[#fad79a]">
                          <p className="text-[10px] md:text-xs uppercase font-extrabold text-[#f09b13] mb-1">Sakit</p>
                          <p className="font-black text-slate-800">0</p>
                        </div>
                        <div className="text-center p-2.5 rounded-lg bg-rose-50 border border-rose-200">
                          <p className="text-[10px] md:text-xs uppercase font-extrabold text-rose-600 mb-1">Alpa</p>
                          <p className="font-black text-rose-700">0</p>
                        </div>
                      </div>
                    </Card>
                    {/* 2025 */}
                    <Card className="p-5 shadow-sm border-slate-200/60 opacity-80">
                      <h4 className="font-bold text-slate-600 mb-4 flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2 text-slate-400" />
                        Rekap Absensi 2025
                      </h4>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <p className="text-[10px] md:text-xs uppercase font-bold text-slate-500 mb-1">Izin</p>
                          <p className="font-bold text-slate-700">0</p>
                        </div>
                        <div className="text-center p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <p className="text-[10px] md:text-xs uppercase font-bold text-slate-500 mb-1">I.Khusus</p>
                          <p className="font-bold text-slate-700">0</p>
                        </div>
                        <div className="text-center p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                          <p className="text-[10px] md:text-xs uppercase font-bold text-slate-500 mb-1">Sakit</p>
                          <p className="font-bold text-slate-700">0</p>
                        </div>
                        <div className="text-center p-2.5 rounded-lg bg-rose-50 border border-rose-100">
                          <p className="text-[10px] md:text-xs uppercase font-bold text-rose-500 mb-1">Alpa</p>
                          <p className="font-bold text-rose-600">0</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>

              {/* DATA DIRI & ALAMAT */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card className="p-6 shadow-sm border-slate-200/60">
                  <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center">
                    <User className="w-5 h-5 mr-2 text-[#22a7b8]" />
                    Data Diri (Umum)
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                      <p className="text-sm font-medium text-slate-500 col-span-1">NIK KTP</p>
                      <p className="text-sm font-semibold text-slate-800 col-span-2">{selectedEmployee.ktp || '-'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                      <p className="text-sm font-medium text-slate-500 col-span-1">TTL</p>
                      <p className="text-sm font-semibold text-slate-800 col-span-2">{selectedEmployee.tempatLahir || '-'}, {selectedEmployee.tanggalLahir || '-'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                      <p className="text-sm font-medium text-slate-500 col-span-1">Nomor Telp.</p>
                      <p className="text-sm font-semibold text-slate-800 col-span-2">{selectedEmployee.phone || '-'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                      <p className="text-sm font-medium text-slate-500 col-span-1">Kel. Kandung</p>
                      <p className="text-sm font-semibold text-slate-800 col-span-2">{selectedEmployee.keluargaKandung || '-'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                      <p className="text-sm font-medium text-slate-500 col-span-1">Telp Kel.</p>
                      <p className="text-sm font-semibold text-slate-800 col-span-2">{selectedEmployee.phoneKeluarga || '-'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 pb-3">
                      <p className="text-sm font-medium text-slate-500 col-span-1">Org Terdekat</p>
                      <p className="text-sm font-semibold text-slate-800 col-span-2">{selectedEmployee.orangTerdekat || '-'}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pb-1">
                      <p className="text-sm font-medium text-slate-500 col-span-1">Telp Darurat</p>
                      <p className="text-sm font-semibold text-slate-800 col-span-2">{selectedEmployee.phoneDarurat || '-'}</p>
                    </div>
                  </div>
                </Card>

                <div className="space-y-6">
                  <Card className="p-6 shadow-sm border-slate-200/60 bg-white h-full flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                      <MapPin className="w-5 h-5 mr-2 text-[#22a7b8]" />
                      Alamat KTP & Domisili
                    </h3>
                    <div className="space-y-4 flex-1">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sesuai KTP</p>
                        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                          {selectedEmployee.alamatKtp || 'Tidak ada data alamat KTP.'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Domisili (Tinggal)</p>
                        <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                          {selectedEmployee.alamatDomisili || 'Tidak ada data domisili.'}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>

              {/* SECTION: HISTORI ABSENSI & ALASAN */}
              <div className="mb-8">
                <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-[#22a7b8]" />
                  Tanggal Absensi 2026 & Alasan
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-2 p-0 overflow-hidden border-slate-200/60 shadow-sm flex flex-col">
                    <div className="flex-1 overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                          <tr>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Izin</th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Izin Khusus</th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Sakit Site</th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Sakit Luar</th>
                            <th className="px-4 py-3 font-semibold text-rose-500 whitespace-nowrap">Alpa</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Placeholder Rows */}
                          <tr className="border-b border-slate-50">
                            <td className="px-4 py-3 text-slate-400 italic">-</td>
                            <td className="px-4 py-3 text-slate-400 italic">-</td>
                            <td className="px-4 py-3 text-slate-400 italic">-</td>
                            <td className="px-4 py-3 text-slate-400 italic">-</td>
                            <td className="px-4 py-3 text-slate-400 italic">-</td>
                          </tr>
                          <tr className="border-b border-slate-50 bg-slate-50/50">
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                              Belum ada catatan absensi
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  <div className="lg:col-span-1 space-y-4">
                    <Card className="p-4 shadow-sm border-slate-200/60 bg-white">
                      <p className="text-xs font-bold text-slate-800 uppercase mb-2">Alasan Izin</p>
                      <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-500 border border-slate-100 min-h-[80px]">
                        -
                      </div>
                    </Card>
                    <Card className="p-4 shadow-sm border-slate-200/60 bg-white">
                      <p className="text-xs font-bold text-slate-800 uppercase mb-2">Alasan Sakit (Site & Luar)</p>
                      <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-500 border border-slate-100 min-h-[80px]">
                        -
                      </div>
                    </Card>
                  </div>
                </div>
              </div>

              {/* CHART PLACEHOLDER */}
              <Card className="p-6 shadow-sm border-slate-200/60 bg-white">
                <h3 className="text-lg font-bold text-slate-800 mb-6 text-center">Diagram Absensi Karyawan 2026</h3>
                <div className="h-48 flex items-end justify-center space-x-12 px-8 pb-4 border-b border-slate-200">
                  {/* Mock Bars matching the exact reference palette */}
                  <div className="flex flex-col items-center w-16">
                    <div className="w-full bg-[#22a7b8] rounded-t-sm h-[60%] hover:opacity-80 transition-opacity"></div>
                    <span className="text-xs font-bold mt-2 text-slate-600">%Cuti</span>
                  </div>
                  <div className="flex flex-col items-center w-16">
                    <div className="w-full bg-[#f09b13] rounded-t-sm h-[80%] hover:opacity-80 transition-opacity"></div>
                    <span className="text-xs font-bold mt-2 text-slate-600">%Hadir</span>
                  </div>
                  <div className="flex flex-col items-center w-16">
                    <div className="w-full bg-slate-300 rounded-t-sm h-[10%] hover:opacity-80 transition-opacity"></div>
                    <span className="text-xs font-bold mt-2 text-slate-600">%Izin</span>
                  </div>
                  <div className="flex flex-col items-center w-16">
                    <div className="w-full bg-rose-500 rounded-t-sm h-[5%] hover:opacity-80 transition-opacity"></div>
                    <span className="text-xs font-bold mt-2 text-slate-600">%Alpha</span>
                  </div>
                </div>
                <p className="text-center text-xs text-slate-400 mt-4 italic">* Diagram Absensi Laboratorium (Palet Cyan #22A7B8 & Ochre #F09B13)</p>
              </Card>

            </div>
          </motion.div>
        )}
      </div>

      {/* Modal Import Data Karyawan (CSV & Excel) */}
      <EmployeeImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchEmployees();
        }}
        inspectorNik={inspectorNik}
      />
    </div>
  );
}

