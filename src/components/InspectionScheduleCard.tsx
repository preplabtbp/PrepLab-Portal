import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Clock, ShieldCheck, UserCheck, ChevronRight, 
  ExternalLink, Search, X, RefreshCw, Sparkles, CheckCircle2, AlertCircle, Users
} from 'lucide-react';
import { Button } from './ui';

interface SchedulePartner {
  no?: number;
  name: string;
  jabatan: string;
  shift?: string;
  roleIndex: number;
  roleLabel?: string;
}

interface ScheduleItem {
  no: number;
  name: string;
  jabatan: string;
  shift: string;
  roleIndex: number;
  inspeksi: string;
  isCuti: boolean;
  partners?: SchedulePartner[];
  formInfo?: {
    formId: string;
    tipe: string;
    formTitle: string;
    subArea?: string;
  } | null;
}

interface InspectionScheduleCardProps {
  inspectorName: string;
  inspectorNik?: string;
  isAdminOrDeveloper?: boolean;
  onNavigateToInspection?: (formId?: string, subArea?: string) => void;
}

export function InspectionScheduleCard({ inspectorName, inspectorNik, isAdminOrDeveloper, onNavigateToInspection }: InspectionScheduleCardProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mySchedule, setMySchedule] = useState<ScheduleItem | null>(null);
  const [allSchedules, setAllSchedules] = useState<ScheduleItem[]>([]);
  const [showFullScheduleModal, setShowFullScheduleModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterShift, setFilterShift] = useState<string>('all');

  // Verify Admin / Developer Access for Full Team Schedule Modal
  const hasAdminAccess = React.useMemo(() => {
    if (typeof isAdminOrDeveloper === 'boolean') return isAdminOrDeveloper;
    try {
      const profile = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
      const jab = (profile.jabatan || localStorage.getItem('p2h_inspector_jabatan') || '').toLowerCase();
      const sec = (profile.section || '').toLowerCase();
      const nik = (inspectorNik || '').toUpperCase();
      const isDev = nik === '02D25000055' || nik === '02D24000043' || nik === 'PREPLABADMIN';
      const isAdmin = jab.includes('admin') || jab.includes('manager') || jab.includes('superintendent') || sec.includes('admin') || sec.includes('administrasi');
      return isDev || isAdmin;
    } catch {
      return false;
    }
  }, [isAdminOrDeveloper, inspectorNik]);

  const fetchSchedule = async (forceRefresh = false) => {
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const q = new URLSearchParams();
      if (inspectorName) q.append('name', inspectorName);
      if (inspectorNik) q.append('nik', inspectorNik);
      if (forceRefresh) q.append('refresh', 'true');

      // Fetch personal schedule
      const res = await fetch(`/api/inspection-schedule?${q.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.found && json.schedule) {
          setMySchedule(json.schedule);
        } else {
          setMySchedule(null);
        }
      }

      // Pre-fetch all schedules for modal viewer ONLY if user is admin or developer
      if (hasAdminAccess) {
        const resAll = await fetch(`/api/inspection-schedule${forceRefresh ? '?refresh=true' : ''}`);
        if (resAll.ok) {
          const jsonAll = await resAll.json();
          if (jsonAll.data) {
            setAllSchedules(jsonAll.data);
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch inspection schedule:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [inspectorName, inspectorNik]);

  const handleStartInspection = () => {
    if (!mySchedule || mySchedule.isCuti) return;
    const formId = mySchedule.formInfo?.formId || '';
    const subArea = mySchedule.formInfo?.subArea || '';
    if (onNavigateToInspection) {
      onNavigateToInspection(formId, subArea);
    } else {
      window.location.href = `/weekly-inspection${formId ? `?formId=${encodeURIComponent(formId)}` : ''}`;
    }
  };

  // Filtered list for full schedule modal
  const filteredAll = allSchedules.filter(item => {
    const matchSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.inspeksi.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.jabatan.toLowerCase().includes(searchQuery.toLowerCase());
    const matchShift = 
      filterShift === 'all' || 
      (filterShift === 'siang' && item.shift.toLowerCase().includes('siang')) ||
      (filterShift === 'malam' && item.shift.toLowerCase().includes('malam')) ||
      (filterShift === 'nonshift' && item.shift.toLowerCase().includes('nonshift')) ||
      (filterShift === 'cuti' && item.isCuti);
    return matchSearch && matchShift;
  });

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border-main)] bg-gradient-to-br from-[var(--card-bg)] via-[var(--card-bg)] to-emerald-500/5 shadow-md p-4 sm:p-5 transition-all">
        {/* Subtle accent corner glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-main)] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-black text-[var(--text-main)] tracking-tight flex items-center gap-1.5">
                  Jadwal Inspeksi Terjadwal Saya
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    Live Sync Google Sheet
                  </span>
                </h3>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Penugasan inspeksi mingguan terpadu Preparation & Laboratory
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <button
              onClick={() => fetchSchedule(true)}
              disabled={refreshing}
              className="p-1.5 rounded-xl border border-[var(--border-main)] hover:bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer text-xs flex items-center gap-1"
              title="Perbarui data dari Google Sheet"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
              <span className="text-[10px] font-medium hidden sm:inline">Refresh</span>
            </button>
            {hasAdminAccess && (
              <button
                onClick={() => setShowFullScheduleModal(true)}
                className="px-2.5 py-1.5 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--card-bg)] text-[var(--text-main)] font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
              >
                <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Jadwal Tim ({allSchedules.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Schedule Body */}
        <div className="pt-3.5">
          {loading ? (
            <div className="py-5 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
              <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              Menghubungkan & membaca data Google Sheet...
            </div>
          ) : mySchedule ? (
            mySchedule.isCuti ? (
              <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/25 text-sky-900 dark:text-sky-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🏖️</span>
                  <div>
                    <h4 className="font-bold text-xs">Status: Cuti Aktif</h4>
                    <p className="text-[11px] text-sky-800/80 dark:text-sky-300">
                      Anda tercatat sedang Cuti pada jadwal minggu ini. Selamat beristirahat!
                    </p>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-lg bg-sky-500/20 font-bold">
                  Bebas Tugas
                </span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] hover:border-emerald-500/40 transition-all">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white shadow-2xs">
                      {mySchedule.shift}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-main)]">
                      Peran: Inspektor {mySchedule.roleIndex} {mySchedule.roleIndex === 1 ? '(Utama)' : '(Pendamping)'}
                    </span>
                  </div>

                  <h4 className="font-black text-sm sm:text-base text-[var(--text-main)] leading-snug break-words">
                    {mySchedule.inspeksi}
                  </h4>

                  <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Petugas:</span> {mySchedule.name} • <span className="opacity-80">{mySchedule.jabatan}</span>
                  </p>

                  {mySchedule.partners && mySchedule.partners.length > 0 && (
                    <div className="pt-2 mt-1.5 border-t border-[var(--border-main)] flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 font-extrabold text-teal-700 dark:text-teal-300 bg-teal-500/15 border border-teal-500/30 px-2.5 py-1 rounded-xl text-[11px]">
                        <Users className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                        {mySchedule.partners.length === 1 ? 'Pasangan Tugas:' : 'Rekan Tim Tugas:'}
                      </span>
                      {mySchedule.partners.map((p, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[var(--text-main)] font-bold text-xs bg-[var(--card-bg)] border border-[var(--border-main)] px-2.5 py-0.5 rounded-lg shadow-2xs">
                          <span className="text-teal-600 dark:text-teal-400">{p.name}</span>
                          <span className="text-[10px] text-[var(--text-muted)] font-medium">
                            ({p.roleIndex === 1 ? 'Inspektor 1 - Utama' : `Inspektor ${p.roleIndex} - Pendamping`} • {p.jabatan})
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  <Button
                    onClick={handleStartInspection}
                    className="w-full sm:w-auto h-10 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer"
                  >
                    <span>Isi Form Sekarang</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          ) : (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold">Nama Anda belum terjadwal di draft minggu ini.</span>
                  <p className="text-[11px] text-amber-800/80 dark:text-amber-300">
                    Silakan hubungi Admin atau pastikan nama profil Anda sesuai dengan daftar roster.
                  </p>
                </div>
              </div>
              {hasAdminAccess && (
                <button
                  onClick={() => setShowFullScheduleModal(true)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 font-bold text-[11px] transition-colors cursor-pointer"
                >
                  Cek Tabel
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: SELURUH JADWAL TIM (GOOGLE SHEET VIEWER) - ADMIN & DEVELOPER ONLY */}
      {hasAdminAccess && showFullScheduleModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-main)] bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
                  <ClipboardCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black leading-tight flex items-center gap-2">
                    Matriks Jadwal Inspeksi Terpadu
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-emerald-100">
                      Google Sheet Live
                    </span>
                  </h3>
                  <p className="text-xs text-emerald-100/90 leading-tight">
                    Total {allSchedules.length} Personil Terdaftar • PT Harita Nickel
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <a
                  href="https://docs.google.com/spreadsheets/d/1hEcUnXhqvsKsIYxqfzZxIqiVaonshL-pSstEh2DdmIY/edit?gid=0#gid=0"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors text-xs font-bold flex items-center gap-1"
                  title="Buka Spreadsheet di Google Sheets"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="hidden sm:inline">Buka Sheet</span>
                </a>
                <button
                  onClick={() => setShowFullScheduleModal(false)}
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 sm:p-4 border-b border-[var(--border-main)] bg-[var(--input-bg)] flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Cari nama, jabatan, atau jenis inspeksi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--card-bg)] border border-[var(--border-main)] rounded-xl text-[var(--text-main)] placeholder-[var(--text-muted)] outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'siang', label: 'Shift Siang' },
                  { id: 'malam', label: 'Shift Malam' },
                  { id: 'nonshift', label: 'Nonshift' },
                  { id: 'cuti', label: 'Cuti' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterShift(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      filterShift === tab.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-2">
              {filteredAll.length === 0 ? (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  Tidak ada jadwal yang cocok dengan filter pencarian.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-main)] rounded-2xl border border-[var(--border-main)] overflow-hidden bg-[var(--card-bg)]">
                  {filteredAll.map((item, idx) => {
                    const isCurrentUser = 
                      inspectorName && item.name.toLowerCase().includes(inspectorName.toLowerCase());

                    return (
                      <div
                        key={idx}
                        className={`p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                          isCurrentUser 
                            ? 'bg-emerald-500/10 border-l-4 border-l-emerald-500' 
                            : 'hover:bg-[var(--input-bg)]'
                        }`}
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] w-5 text-center">
                              {item.no}
                            </span>
                            <h5 className="text-xs sm:text-sm font-black text-[var(--text-main)] flex items-center gap-2 truncate">
                              {item.name}
                              {isCurrentUser && (
                                <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded-full">
                                  Anda
                                </span>
                              )}
                            </h5>
                            <span className="text-[10px] text-[var(--text-muted)] truncate hidden sm:inline">
                              • {item.jabatan}
                            </span>
                          </div>

                          <div className="pl-7">
                            {item.isCuti ? (
                              <span className="text-xs text-sky-600 dark:text-sky-400 font-bold flex items-center gap-1">
                                🏖️ Sedang Cuti
                              </span>
                            ) : (
                              <div>
                                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 leading-tight">
                                  {item.inspeksi}
                                </p>
                                {item.partners && item.partners.length > 0 && (
                                  <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                                    <span className="font-semibold text-teal-600 dark:text-teal-400">
                                      {item.partners.length === 1 ? 'Pasangan:' : 'Rekan Tim:'}
                                    </span>{' '}
                                    <span>
                                      {item.partners.map(p => `${p.name} (${p.roleIndex === 1 ? 'Inspektor 1' : `Inspektor ${p.roleIndex}`})`).join(', ')}
                                    </span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pl-7 sm:pl-0 shrink-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            item.isCuti 
                              ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                              : item.shift.toLowerCase().includes('malam')
                              ? 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300'
                              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          }`}>
                            {item.shift}
                          </span>

                          {!item.isCuti && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[var(--input-bg)] border border-[var(--border-main)] text-[var(--text-main)]">
                              Peran {item.roleIndex}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-[var(--border-main)] bg-[var(--card-bg)] flex items-center justify-between text-xs text-[var(--text-muted)] shrink-0">
              <span>Menampilkan {filteredAll.length} dari {allSchedules.length} personil</span>
              <Button
                onClick={() => setShowFullScheduleModal(false)}
                className="h-8 px-4 text-xs font-bold rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] text-[var(--text-main)] hover:bg-[var(--border-main)] transition-colors cursor-pointer"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
