import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, User, MapPin, Briefcase, Calendar, Phone, Activity, FileText, BarChart3, ChevronRight, CheckCircle2, AlertTriangle, Fingerprint, Users, X, Database, RefreshCw } from 'lucide-react';
import { Card, Input, Button } from './ui';
import { motion, AnimatePresence } from 'motion/react';

export function EmployeeDatabaseScreen({ inspectorNik, onBack }: { inspectorNik: string, onBack?: () => void }) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
          <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
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
          className={`w-full rounded-2xl shadow-sm border-slate-200 focus:ring-4 focus:ring-indigo-500/20 bg-white
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
                      <div className="bg-indigo-50 w-10 h-10 rounded-full flex items-center justify-center shrink-0 mr-3 text-indigo-600 font-bold">
                        {emp.name?.charAt(0) || '?'}
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
            <h1 className="text-lg font-bold text-slate-800 hidden sm:block ml-2">
              Database Karyawan
            </h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!selectedEmployee && (
            <Button
              onClick={handleManualSync}
              disabled={isSyncing}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 rounded-xl text-xs font-semibold px-3 py-1.5 shadow-sm transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Menyinkronkan...' : 'Sinkron Google Sheets'}
            </Button>
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
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 z-0">
              {/* Subtle Grid overlay */}
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] [mask-image:linear-gradient(to_bottom,white,transparent)] z-0"></div>
              {/* Glowing orbs */}
              <div className="absolute top-0 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2"></div>
              <div className="absolute bottom-0 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2"></div>
            </div>

            <div className="relative z-10 max-w-4xl mx-auto w-full pt-10 md:pt-32 px-4 pb-20 flex-1 flex flex-col items-center">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-8 w-full"
              >
                <div className="inline-flex items-center justify-center p-3 bg-white/10 backdrop-blur-md rounded-2xl mb-4 md:mb-6 ring-1 ring-white/20 shadow-xl">
                  <Database className="w-6 h-6 md:w-8 md:h-8 text-indigo-300" />
                </div>
                <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-3 md:mb-4 tracking-tight">
                  Employee Intelligence Portal
                </h2>
                <p className="text-indigo-200 text-sm md:text-lg max-w-2xl mx-auto font-light leading-relaxed px-2">
                  Pusat direktori terpadu. Ketik NIK atau nama untuk menelusuri profil karyawan, melacak kehadiran, dan memantau riwayat jabatan secara real-time.
                </p>
              </motion.div>

              {/* Big Search Bar */}
              <div className="w-full max-w-2xl mb-10 md:mb-12 relative group px-2 md:px-0">
                <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full transition-opacity group-hover:opacity-100 opacity-50"></div>
                {renderSearchBar(false)}
              </div>

              {/* Quick Stats Dashboard */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full max-w-3xl px-2"
              >
                <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-4 md:p-5 border border-white/10 text-center hover:bg-white/15 transition-colors">
                  <div className="text-indigo-200 text-[10px] md:text-xs uppercase font-bold tracking-wider mb-1 md:mb-2">Total Data</div>
                  <div className="text-2xl md:text-3xl font-bold text-white">{employees.length}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-4 md:p-5 border border-white/10 text-center hover:bg-white/15 transition-colors">
                  <div className="text-indigo-200 text-[10px] md:text-xs uppercase font-bold tracking-wider mb-1 md:mb-2">Dept. Aktif</div>
                  <div className="text-2xl md:text-3xl font-bold text-white">{new Set(employees.map(e => e.department).filter(Boolean)).size}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-4 md:p-5 border border-white/10 text-center hover:bg-white/15 transition-colors">
                  <div className="text-indigo-200 text-[10px] md:text-xs uppercase font-bold tracking-wider mb-1 md:mb-2">Status PKWTT</div>
                  <div className="text-2xl md:text-3xl font-bold text-emerald-400">
                    {employees.filter(e => e.statusKontrak && e.statusKontrak.toLowerCase().includes('pkwtt')).length}
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl p-4 md:p-5 border border-white/10 text-center hover:bg-white/15 transition-colors">
                  <div className="text-indigo-200 text-[10px] md:text-xs uppercase font-bold tracking-wider mb-1 md:mb-2">Sakit Hari Ini</div>
                  <div className="text-2xl md:text-3xl font-bold text-rose-400">0</div>
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
            {/* SIDEBAR (Profile Info) */}
            <div className="lg:w-80 bg-indigo-900 text-white shrink-0 shadow-xl z-10 p-6 lg:p-8 flex flex-col items-center lg:items-start text-center lg:text-left relative overflow-hidden">
              <div className="absolute top-0 right-0 p-32 bg-indigo-800/50 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
              
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-indigo-200/20 border-2 border-indigo-300/30 overflow-hidden mb-6 flex items-center justify-center shrink-0">
                {/* Placeholder Avatar */}
                <User className="w-16 h-16 text-indigo-200" />
              </div>

              <h2 className="text-xl lg:text-2xl font-bold mb-1 leading-tight">{selectedEmployee.name}</h2>
              <p className="text-indigo-200 mb-6 flex items-center justify-center lg:justify-start bg-indigo-800/50 px-3 py-1 rounded-full text-sm">
                <Fingerprint className="w-4 h-4 mr-1.5" />
                NIK: {selectedEmployee.nik}
              </p>

              <div className="w-full space-y-4 text-sm text-indigo-100/90">
                <div className="border-b border-indigo-700/50 pb-3">
                  <p className="text-indigo-400/80 text-xs font-semibold mb-1 uppercase tracking-wider">Jabatan Baru</p>
                  <p className="font-medium text-white">{selectedEmployee.jabatan || '-'}</p>
                </div>
                
                <div className="border-b border-indigo-700/50 pb-3">
                  <p className="text-indigo-400/80 text-xs font-semibold mb-1 uppercase tracking-wider">Perusahaan</p>
                  <p className="font-medium text-white">{selectedEmployee.pt || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-indigo-700/50 pb-3">
                  <div>
                    <p className="text-indigo-400/80 text-xs font-semibold mb-1 uppercase tracking-wider">Job Grade</p>
                    <p className="font-medium text-white">{selectedEmployee.jobGrade || '-'}</p>
                  </div>
                  <div>
                    <p className="text-indigo-400/80 text-xs font-semibold mb-1 uppercase tracking-wider">Golongan</p>
                    <p className="font-medium text-white">{selectedEmployee.gol || '-'}</p>
                  </div>
                </div>

                <div className="border-b border-indigo-700/50 pb-3">
                  <p className="text-indigo-400/80 text-xs font-semibold mb-1 uppercase tracking-wider">Bagian (Section)</p>
                  <p className="font-medium text-white">{selectedEmployee.section || selectedEmployee.department || '-'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b border-indigo-700/50 pb-3">
                  <div>
                    <p className="text-indigo-400/80 text-xs font-semibold mb-1 uppercase tracking-wider">DOH Awal</p>
                    <p className="font-medium text-white">{selectedEmployee.tanggalAwalBergabung || '-'}</p>
                  </div>
                  <div>
                    <p className="text-indigo-400/80 text-xs font-semibold mb-1 uppercase tracking-wider">Tgl Jabatan Baru</p>
                    <p className="font-medium text-white">{selectedEmployee.tanggalJabatanBaru || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-indigo-400/80 text-xs font-semibold mb-1 uppercase tracking-wider">Masa Kerja</p>
                    <p className="font-medium text-white">{selectedEmployee.masaKerja || '-'}</p>
                  </div>
                  <div>
                    <p className="text-indigo-400/80 text-xs font-semibold mb-1 uppercase tracking-wider">Masa Kerja Jabatan</p>
                    <p className="font-medium text-white">{selectedEmployee.masaKerjaJabatanTerakhir || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 p-4 lg:p-8 overflow-y-auto bg-slate-50 pb-20">
              
              {/* HEADER W/ SPONSOR */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-slate-800">{selectedEmployee.name}</h1>
                  <p className="text-slate-500 mt-1">{selectedEmployee.jabatan || 'Karyawan'}</p>
                </div>
                
                <Card className="p-4 bg-white shadow-sm border-l-4 border-l-indigo-500 min-w-[200px]">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Sponsor</p>
                  <p className="font-bold text-slate-800 text-lg">{selectedEmployee.sponsor || '-'}</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
                {/* STATUS CARDS */}
                <div className="xl:col-span-1 space-y-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <CheckCircle2 className="w-5 h-5 mr-2 text-indigo-500" />
                    Status & Kehadiran
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-md">
                      <p className="text-indigo-100 text-xs uppercase tracking-wider mb-1">Status Karyawan</p>
                      <p className="font-bold">{selectedEmployee.statusKaryawan || '-'}</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-md">
                      <p className="text-purple-100 text-xs uppercase tracking-wider mb-1">Status Kontrak</p>
                      <p className="font-bold">{selectedEmployee.statusKontrak || '-'}</p>
                    </div>
                    <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-xl p-4 text-white shadow-md">
                      <p className="text-teal-100 text-xs uppercase tracking-wider mb-1">Sisa Cuti (CT)</p>
                      <p className="font-bold text-lg">{selectedEmployee.sisaCt || '-'}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-4 text-white shadow-md">
                      <p className="text-emerald-100 text-xs uppercase tracking-wider mb-1">Jatuh Tempo CT</p>
                      <p className="font-bold">{selectedEmployee.jatuhTempoCt || '-'}</p>
                    </div>
                    <div className="col-span-2 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-4 text-white shadow-md flex justify-between items-center">
                      <div>
                        <p className="text-slate-300 text-xs uppercase tracking-wider mb-1">Tanggal Permanen</p>
                        <p className="font-bold">{selectedEmployee.tanggalPermanent || '-'}</p>
                      </div>
                      <Calendar className="w-8 h-8 text-slate-500 opacity-50" />
                    </div>
                  </div>
                </div>

                {/* REKAP ABSENSI */}
                <div className="xl:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* 2026 */}
                    <Card className="p-5 shadow-sm border-slate-200/60">
                      <h4 className="font-bold text-slate-700 mb-4 flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2 text-indigo-500" />
                        Rekap Absensi 2026
                      </h4>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-[10px] md:text-xs uppercase font-bold text-slate-500 mb-1">Izin</p>
                          <p className="font-bold text-slate-800">0</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-[10px] md:text-xs uppercase font-bold text-slate-500 mb-1">I.Khusus</p>
                          <p className="font-bold text-slate-800">0</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-[10px] md:text-xs uppercase font-bold text-slate-500 mb-1">Sakit</p>
                          <p className="font-bold text-slate-800">0</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-rose-50 border border-rose-100">
                          <p className="text-[10px] md:text-xs uppercase font-bold text-rose-500 mb-1">Alpa</p>
                          <p className="font-bold text-rose-700">0</p>
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
                        <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-[10px] md:text-xs uppercase font-bold text-slate-500 mb-1">Izin</p>
                          <p className="font-bold text-slate-700">0</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-[10px] md:text-xs uppercase font-bold text-slate-500 mb-1">I.Khusus</p>
                          <p className="font-bold text-slate-700">0</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-[10px] md:text-xs uppercase font-bold text-slate-500 mb-1">Sakit</p>
                          <p className="font-bold text-slate-700">0</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-rose-50 border border-rose-100">
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
                    <User className="w-5 h-5 mr-2 text-indigo-500" />
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
                      <MapPin className="w-5 h-5 mr-2 text-indigo-500" />
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
                  <Calendar className="w-5 h-5 mr-2 text-indigo-500" />
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
                  {/* Mock Bars */}
                  <div className="flex flex-col items-center w-16">
                    <div className="w-full bg-emerald-400 rounded-t-sm h-[60%] hover:opacity-80 transition-opacity"></div>
                    <span className="text-xs font-bold mt-2 text-slate-600">Izin</span>
                  </div>
                  <div className="flex flex-col items-center w-16">
                    <div className="w-full bg-blue-400 rounded-t-sm h-[10%] hover:opacity-80 transition-opacity"></div>
                    <span className="text-xs font-bold mt-2 text-slate-600">I.Khusus</span>
                  </div>
                  <div className="flex flex-col items-center w-16">
                    <div className="w-full bg-amber-400 rounded-t-sm h-[30%] hover:opacity-80 transition-opacity"></div>
                    <span className="text-xs font-bold mt-2 text-slate-600">Sakit</span>
                  </div>
                  <div className="flex flex-col items-center w-16">
                    <div className="w-full bg-rose-400 rounded-t-sm h-[5%] hover:opacity-80 transition-opacity"></div>
                    <span className="text-xs font-bold mt-2 text-slate-600">Alpa</span>
                  </div>
                </div>
                <p className="text-center text-xs text-slate-400 mt-4 italic">* Data ilustrasi visual (belum terhubung ke database log absen)</p>
              </Card>

            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
