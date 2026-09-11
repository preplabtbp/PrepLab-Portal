import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, Clock, ShieldCheck, UserCheck, ChevronRight, 
  ExternalLink, Search, X, RefreshCw, Sparkles, CheckCircle2, AlertCircle, 
  Users, Camera, ShieldAlert, AlertTriangle, Image as ImageIcon, Send, Trash2, Check,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { Button } from './ui';
import { toast } from 'sonner';
import { compressImage } from '../features/inspections/hooks/useInspection';
import { getKtaObligation, formatKtaImageUrl } from './GroupReportScreen';

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
  isCompleted?: boolean;
  completedAt?: string;
  completedPdfUrl?: string;
  completedInspector?: string;
  completedFormTitle?: string;
  completedLocation?: string;
  hasSsProof?: boolean;
  ssProofUrl?: string | null;
  ssProofDate?: string | null;
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
  onNavigateToKta?: () => void;
}

function getLocalISOWeekTag(d: Date = new Date()): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `W${weekNum}`;
}

const GENERAL_INSPECTION_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLScOJSC6wcLsJ26YcmwWndj0Hb9x5V48XHTdHWkPzbH2XwN8ww/viewform';
const SAFETY_KTA_FORM_URL = 'https://docs.google.com/forms/d/1YMympG3aA-8l978aAlRJFSoi-SVQAKiS7KmJjNRfuBI/viewform?edit_requested=true';

export function InspectionScheduleCard({ 
  inspectorName, 
  inspectorNik, 
  isAdminOrDeveloper, 
  onNavigateToInspection,
  onNavigateToKta 
}: InspectionScheduleCardProps) {
  const currentWeekTag = useMemo(() => getLocalISOWeekTag(new Date()), []);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mySchedule, setMySchedule] = useState<ScheduleItem | null>(null);
  const [allSchedules, setAllSchedules] = useState<ScheduleItem[]>([]);
  const [showFullScheduleModal, setShowFullScheduleModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterShift, setFilterShift] = useState<string>('all');

  // Status Bukti SS General Inspeksi
  const [hasSsProof, setHasSsProof] = useState<boolean>(false);
  const [ssProofUrl, setSsProofUrl] = useState<string | null>(null);

  // Status Rekap KTA / TTA
  const [ktaLoading, setKtaLoading] = useState(true);
  const [myKtaRecord, setMyKtaRecord] = useState<any | null>(null);

  // Modal Upload Bukti SS State
  const [showSsModal, setShowSsModal] = useState(false);
  const [ssImageFile, setSsImageFile] = useState<File | null>(null);
  const [ssImagePreview, setSsImagePreview] = useState<string | null>(null);
  const [isSubmittingSs, setIsSubmittingSs] = useState(false);

  // Modal Upload Bukti KTA State
  const [showKtaModal, setShowKtaModal] = useState(false);
  const [selectedKtaChecklist, setSelectedKtaChecklist] = useState<string[]>([]);
  const [ktaImageFile, setKtaImageFile] = useState<File | null>(null);
  const [ktaImagePreview, setKtaImagePreview] = useState<string | null>(null);
  const [isSubmittingKta, setIsSubmittingKta] = useState(false);

  // Minimize / Compact Mode States (Persisted in localStorage, default: ringkas / true)
  const [isScheduleMinimized, setIsScheduleMinimized] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('p2h_schedule_card_minimized');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [isKtaMinimized, setIsKtaMinimized] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('p2h_kta_card_minimized');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleScheduleMinimize = () => {
    setIsScheduleMinimized(prev => {
      const next = !prev;
      try { localStorage.setItem('p2h_schedule_card_minimized', String(next)); } catch {}
      return next;
    });
  };

  const toggleKtaMinimize = () => {
    setIsKtaMinimized(prev => {
      const next = !prev;
      try { localStorage.setItem('p2h_kta_card_minimized', String(next)); } catch {}
      return next;
    });
  };

  // Lightbox Preview
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // User Obligation
  const userRole = useMemo(() => {
    try {
      const p = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
      return p.jabatan || localStorage.getItem('p2h_inspector_jabatan') || '';
    } catch {
      return '';
    }
  }, []);

  const userSection = useMemo(() => {
    try {
      const p = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
      return p.section || '';
    } catch {
      return '';
    }
  }, []);

  const myObligation = useMemo(() => {
    return getKtaObligation(inspectorNik, userRole, userSection);
  }, [inspectorNik, userRole, userSection]);

  // Admin / Dev Access check
  const hasAdminAccess = useMemo(() => {
    if (typeof isAdminOrDeveloper === 'boolean') return isAdminOrDeveloper;
    try {
      const profile = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
      const jab = (profile.jabatan || localStorage.getItem('p2h_inspector_jabatan') || '').toLowerCase();
      const sec = (profile.section || '').toLowerCase();
      const nik = (inspectorNik || '').toUpperCase();
      const isDev = nik === '02D25000055' || nik === '02D24000043' || nik === 'PREPLABADMIN' || nik === 'SPVDEMO';
      const isAdmin = jab.includes('admin') || jab.includes('manager') || jab.includes('superintendent') || sec.includes('admin') || sec.includes('administrasi');
      return isDev || isAdmin;
    } catch {
      return false;
    }
  }, [isAdminOrDeveloper, inspectorNik]);

  // Fetch SS Proof directly from /api/inspection-proofs
  const fetchSsProof = async () => {
    if (!inspectorNik && !inspectorName) return;
    try {
      const res = await fetch(`/api/inspection-proofs?week=${currentWeekTag}`);
      if (res.ok) {
        const proofs: any[] = await res.json();
        const cleanNik = (inspectorNik || '').trim().toLowerCase();
        const cleanName = (inspectorName || '').trim().toLowerCase();
        const found = proofs.find(p => {
          const pNik = (p.nik || '').trim().toLowerCase();
          const pName = (p.name || '').trim().toLowerCase();
          return (cleanNik && pNik === cleanNik) || (cleanName && (pName.includes(cleanName) || cleanName.includes(pName)));
        });

        if (found) {
          setHasSsProof(true);
          setSsProofUrl(found.imageUrl || null);
        } else {
          setHasSsProof(false);
          setSsProofUrl(null);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch inspection proofs:', e);
    }
  };

  // Fetch KTA Status from /api/rekap-kta
  const fetchKtaStatus = async () => {
    setKtaLoading(true);
    try {
      const res = await fetch(`/api/rekap-kta?week=${currentWeekTag}`);
      if (res.ok) {
        const json = await res.json();
        const cleanNik = (inspectorNik || '').trim().toLowerCase();
        const cleanName = (inspectorName || '').trim().toLowerCase();

        const match = (json.rekapList || []).find((r: any) => {
          const rNik = (r.nik || '').trim().toLowerCase();
          const rName = (r.name || '').trim().toLowerCase();
          return (cleanNik && rNik === cleanNik) || (cleanName && (rName.includes(cleanName) || cleanName.includes(rName)));
        });

        const cutiMatch = (json.cutiList || []).find((c: any) => {
          const cNik = (c.nik || '').trim().toLowerCase();
          const cName = (c.name || '').trim().toLowerCase();
          return (cleanNik && cNik === cleanNik) || (cleanName && (cName.includes(cleanName) || cleanName.includes(cName)));
        });

        if (cutiMatch) {
          setMyKtaRecord({ ...cutiMatch, isCuti: true, status: 'CUTI' });
        } else if (match) {
          setMyKtaRecord(match);
        } else {
          setMyKtaRecord(null);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch KTA status:', e);
    } finally {
      setKtaLoading(false);
    }
  };

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
          if (json.schedule.hasSsProof) {
            setHasSsProof(true);
            if (json.schedule.ssProofUrl) setSsProofUrl(json.schedule.ssProofUrl);
          }
        } else {
          setMySchedule(null);
        }
      }

      // Pre-fetch all schedules for modal viewer if user is admin or dev
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

  const handleRefreshAll = () => {
    fetchSchedule(true);
    fetchSsProof();
    fetchKtaStatus();
  };

  useEffect(() => {
    fetchSchedule();
    fetchSsProof();
    fetchKtaStatus();
  }, [inspectorName, inspectorNik, currentWeekTag]);

  // Handle global paste event when modals are open
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            if (showSsModal) {
              setSsImageFile(file);
              const reader = new FileReader();
              reader.onload = (ev) => setSsImagePreview(ev.target?.result as string);
              reader.readAsDataURL(file);
              toast.success('Screenshot General Inspeksi berhasil ditempel dari clipboard!');
            } else if (showKtaModal) {
              setKtaImageFile(file);
              const reader = new FileReader();
              reader.onload = (ev) => setKtaImagePreview(ev.target?.result as string);
              reader.readAsDataURL(file);
              toast.success('Screenshot KTA/TTA berhasil ditempel dari clipboard!');
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showSsModal, showKtaModal]);

  // Set default checklist when KTA modal opens
  useEffect(() => {
    if (showKtaModal) {
      if (myObligation.type === '1_KTA_OR_TTA') {
        setSelectedKtaChecklist(['KTA']);
      } else if (myObligation.type === '2_TTA') {
        const c1 = myKtaRecord?.checkDetails?.check1Done;
        const c2 = myKtaRecord?.checkDetails?.check2Done;
        if (!c1 && !c2) setSelectedKtaChecklist(['TTA_1', 'TTA_2']);
        else if (!c1) setSelectedKtaChecklist(['TTA_1']);
        else if (!c2) setSelectedKtaChecklist(['TTA_2']);
        else setSelectedKtaChecklist(['TTA_1']);
      } else {
        const hasK = myKtaRecord?.checkDetails?.check1Done;
        const hasT = myKtaRecord?.checkDetails?.check2Done;
        if (!hasK && !hasT) setSelectedKtaChecklist(['KTA', 'TTA']);
        else if (!hasK) setSelectedKtaChecklist(['KTA']);
        else if (!hasT) setSelectedKtaChecklist(['TTA']);
        else setSelectedKtaChecklist(['KTA']);
      }
    }
  }, [showKtaModal, myObligation.type, myKtaRecord]);

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

  // Submit Screenshot Form General Inspeksi
  const handleSubmitSsReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ssImageFile && !ssImagePreview) {
      toast.error('Silakan pilih atau tempel (Ctrl+V) bukti screenshot form!');
      return;
    }

    try {
      setIsSubmittingSs(true);
      toast.loading('Mengunggah screenshot bukti General Inspeksi...', { id: 'upload-ss' });

      let base64Data = ssImagePreview || '';
      if (ssImageFile) {
        base64Data = await compressImage(ssImageFile);
      }

      let uploadedUrl = base64Data;
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            mimeType: 'image/jpeg',
            filename: `SS_INSPEKSI_${inspectorNik || 'user'}_${currentWeekTag}_${Date.now()}.jpg`,
            folderName: 'Pelaporan SS General Inspeksi'
          })
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          if (upJson.url) uploadedUrl = upJson.url;
        }
      } catch (uErr) {
        console.warn('Fallback to direct base64 storage:', uErr);
      }

      const res = await fetch('/api/inspection-proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: inspectorNik || 'USER',
          name: inspectorName,
          section: userSection || 'Preparasi & Lab',
          date: new Date().toISOString().split('T')[0],
          week: currentWeekTag,
          imageUrl: uploadedUrl,
          description: 'Bukti Screenshot Form General Inspeksi'
        })
      });

      if (res.ok) {
        toast.success(`✅ Bukti Screenshot General Inspeksi (${currentWeekTag}) berhasil disimpan!`, { id: 'upload-ss', duration: 5000 });
        setShowSsModal(false);
        setSsImageFile(null);
        setSsImagePreview(null);
        setHasSsProof(true);
        setSsProofUrl(uploadedUrl);
        // Refresh state
        fetchSchedule(true);
        fetchSsProof();
        window.dispatchEvent(new CustomEvent('refresh-group-reports'));
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Gagal menyimpan bukti SS Inspeksi', { id: 'upload-ss' });
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + err.message, { id: 'upload-ss' });
    } finally {
      setIsSubmittingSs(false);
    }
  };

  // Submit KTA / TTA Report
  const handleSubmitKtaReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ktaImageFile && !ktaImagePreview) {
      toast.error('Silakan pilih atau tempel (Ctrl+V) tangkapan layar form KTA/TTA!');
      return;
    }
    if (selectedKtaChecklist.length === 0) {
      toast.error('Pilih minimal satu ceklis kewajiban!');
      return;
    }

    try {
      setIsSubmittingKta(true);
      toast.loading('Mengunggah bukti formulir KTA/TTA...', { id: 'upload-kta' });

      let base64Data = ktaImagePreview || '';
      if (ktaImageFile) {
        base64Data = await compressImage(ktaImageFile);
      }

      let uploadedUrl = base64Data;
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            mimeType: 'image/jpeg',
            filename: `KTA_TTA_${inspectorNik || 'user'}_${currentWeekTag}_${Date.now()}.jpg`,
            folderName: 'Laporan KTA TTA Harita'
          })
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          if (upJson.url) uploadedUrl = upJson.url;
        }
      } catch (uErr) {
        console.warn('Fallback to direct base64 storage:', uErr);
      }

      // Submit reports for all selected checklist items
      for (const item of selectedKtaChecklist) {
        const reportType = item.startsWith('TTA') ? 'TTA' : 'KTA';
        const labelItem = item === 'TTA_1' ? 'TTA 1' : item === 'TTA_2' ? 'TTA 2' : reportType;

        await fetch('/api/kta-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nik: inspectorNik || 'USER',
            name: inspectorName,
            section: userSection || 'Preparasi & Lab',
            reportType,
            date: new Date().toISOString().split('T')[0],
            week: currentWeekTag,
            imageUrl: uploadedUrl,
            description: `Bukti Screenshot ${labelItem} (${currentWeekTag})`,
            location: '-'
          })
        });
      }

      toast.success(`✅ Bukti KTA/TTA (${currentWeekTag}) berhasil diunggah!`, { id: 'upload-kta', duration: 5000 });
      setShowKtaModal(false);
      setKtaImageFile(null);
      setKtaImagePreview(null);
      // Refresh status
      fetchKtaStatus();
      window.dispatchEvent(new CustomEvent('refresh-group-reports'));
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + err.message, { id: 'upload-kta' });
    } finally {
      setIsSubmittingKta(false);
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
      {/* ═══════════════════════════════════════════════════════════════
          DUAL PANEL DASHBOARD CONTAINER (TERBAGI 2: INSPEKSI & KTA/TTA)
         ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 w-full">
        
        {/* ─────────────────────────────────────────────────────────────
            PANEL 1 (KIRI): JADWAL INSPEKSI & BUKTI SS GENERAL INSPEKSI
           ───────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border-main)] bg-gradient-to-br from-[var(--card-bg)] via-[var(--card-bg)] to-emerald-500/5 shadow-md p-4 sm:p-5 transition-all flex flex-col justify-between">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header Panel 1 */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[var(--border-main)] pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-black text-[var(--text-main)] tracking-tight">
                      Jadwal Inspeksi Terjadwal Saya
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                      Live Sync
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    Penugasan mingguan terpadu Prep & Lab
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <button
                  onClick={toggleScheduleMinimize}
                  className="p-1.5 px-2 rounded-xl border border-[var(--border-main)] hover:bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer text-xs flex items-center gap-1 shadow-2xs"
                  title={isScheduleMinimized ? "Perluas Tampilan (Detail)" : "Perkecil Tampilan (Ringkas)"}
                >
                  {isScheduleMinimized ? (
                    <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[10px] font-medium hidden sm:inline">
                    {isScheduleMinimized ? 'Detail' : 'Ringkas'}
                  </span>
                </button>
                <button
                  onClick={handleRefreshAll}
                  disabled={refreshing}
                  className="p-1.5 px-2 rounded-xl border border-[var(--border-main)] hover:bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer text-xs flex items-center gap-1"
                  title="Perbarui data jadwal & status"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-500' : ''}`} />
                  <span className="text-[10px] font-medium hidden sm:inline">Refresh</span>
                </button>
                {hasAdminAccess && (
                  <button
                    onClick={() => setShowFullScheduleModal(true)}
                    className="px-2.5 py-1.5 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--card-bg)] text-[var(--text-main)] font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  >
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Jadwal Tim ({allSchedules.length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Schedule Body */}
            <div className="pt-3.5 space-y-3">
              {loading ? (
                <div className="py-7 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                  <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                  Menghubungkan & membaca data jadwal...
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
                ) : isScheduleMinimized ? (
                  /* ── COMPACT / MINIMIZED ESTHETIC VIEW (TETAP MENAMPILKAN INFO PENTING) ── */
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <div className="p-2.5 px-3 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {mySchedule.isCompleted ? (
                          <span className="w-6 h-6 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="w-6 h-6 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold text-[10px]">
                            ⏳
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-extrabold text-xs text-[var(--text-main)] truncate max-w-[280px]">
                              {mySchedule.inspeksi}
                            </h5>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase ${
                              mySchedule.isCompleted 
                                ? 'bg-emerald-500/20 text-emerald-700' 
                                : 'bg-amber-500/20 text-amber-700'
                            }`}>
                              {mySchedule.isCompleted ? '✓ Selesai' : mySchedule.shift}
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                            Peran {mySchedule.roleIndex} {mySchedule.partners && mySchedule.partners.length > 0 ? `• Rekan: ${mySchedule.partners[0].name}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {mySchedule.isCompleted && mySchedule.completedPdfUrl && mySchedule.completedPdfUrl !== '#' && (
                          <button
                            onClick={() => {
                              const rawUrl = mySchedule.completedPdfUrl!;
                              const fileIdMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                              const viewUrl = fileIdMatch && fileIdMatch[1]
                                ? `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`
                                : rawUrl;
                              window.open(viewUrl, '_blank');
                            }}
                            className="h-7 px-2.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border-main)] hover:bg-[var(--input-bg)] text-[var(--text-main)] text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            title="Lihat Laporan PDF"
                          >
                            <ExternalLink className="w-3 h-3 text-emerald-600" />
                            <span>PDF Laporan</span>
                          </button>
                        )}
                        {!mySchedule.isCompleted && (
                          <button
                            onClick={handleStartInspection}
                            className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                          >
                            <span>Isi Form</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Compact Bar Status Bukti SS General */}
                    <div className="p-2 px-3 rounded-xl bg-[var(--card-bg)] border border-[var(--border-main)] flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {hasSsProof ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                        <span className="text-[10.5px] font-semibold text-[var(--text-main)] truncate">
                          {hasSsProof ? '✓ Bukti SS General Terunggah' : '⚠️ Belum Upload Bukti SS General'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {hasSsProof ? (
                          ssProofUrl && (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(formatKtaImageUrl(ssProofUrl))}
                              className="text-[10px] text-emerald-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>Lihat</span>
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowSsModal(true)}
                            className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Camera className="w-3 h-3" />
                            <span>Upload SS</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Detail Card Jadwal */}
                    <div className={`p-3.5 rounded-2xl border transition-all ${
                      mySchedule.isCompleted
                        ? 'bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50'
                        : 'bg-[var(--input-bg)] border-[var(--border-main)] hover:border-emerald-500/40'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {mySchedule.isCompleted ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                                <span>SUDAH DIINSPEKSI (SELESAI)</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white shadow-2xs">
                                {mySchedule.shift}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-main)]">
                              Peran: Inspektor {mySchedule.roleIndex} {mySchedule.roleIndex === 1 ? '(Utama)' : '(Pendamping)'}
                            </span>
                          </div>

                          <h4 className="font-black text-xs sm:text-sm text-[var(--text-main)] leading-snug break-words flex items-center gap-1.5">
                            {mySchedule.isCompleted && <span className="text-emerald-600">✓</span>}
                            <span>{mySchedule.inspeksi}</span>
                          </h4>

                          <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1.5 flex-wrap">
                            {mySchedule.isCompleted ? (
                              <>
                                <span className="font-semibold text-emerald-600">Status:</span>
                                <span className="text-emerald-600 font-bold">Laporan Terkirim & Terverifikasi</span>
                                {mySchedule.completedInspector && (
                                  <span className="opacity-80">• Petugas: {mySchedule.completedInspector.split('|')[0].trim()}</span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="font-semibold text-emerald-600">Petugas:</span> {mySchedule.name} • <span className="opacity-80">{mySchedule.jabatan}</span>
                              </>
                            )}
                          </p>

                          {/* Pasangan / Rekan */}
                          {mySchedule.partners && mySchedule.partners.length > 0 && (
                            <div className="pt-2 mt-1 border-t border-[var(--border-main)]/70 flex flex-wrap items-center gap-1.5 text-xs">
                              <span className="inline-flex items-center gap-1 font-extrabold text-teal-600 bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 rounded-lg text-[10px]">
                                <Users className="w-3 h-3 text-teal-600" />
                                {mySchedule.partners.length === 1 ? 'Pasangan:' : 'Rekan:'}
                              </span>
                              {mySchedule.partners.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-1 text-[var(--text-main)] font-semibold text-[10.5px]">
                                  <span className="text-teal-600 font-bold">{p.name}</span>
                                  <span className="text-[10px] text-[var(--text-muted)]">({p.roleLabel || (p.roleIndex === 1 ? 'Utama' : 'Pendamping')})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons Right */}
                        <div className="shrink-0 flex flex-row sm:flex-col items-stretch sm:items-end justify-between gap-2">
                          {mySchedule.isCompleted ? (
                            <>
                              {mySchedule.completedPdfUrl && mySchedule.completedPdfUrl !== '#' && (
                                <Button
                                  onClick={() => {
                                    const rawUrl = mySchedule.completedPdfUrl!;
                                    const fileIdMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                                    const viewUrl = fileIdMatch && fileIdMatch[1]
                                      ? `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`
                                      : rawUrl;
                                    window.open(viewUrl, '_blank');
                                  }}
                                  className="h-9 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  <span>Lihat Laporan PDF</span>
                                </Button>
                              )}
                              <button
                                onClick={handleStartInspection}
                                className="text-[10.5px] text-[var(--text-muted)] hover:text-emerald-600 underline text-right py-0.5 transition-colors cursor-pointer"
                                title="Klik jika perlu mengisi ulang checklist inspeksi"
                              >
                                Isi Ulang Form
                              </button>
                            </>
                          ) : (
                            <Button
                              onClick={handleStartInspection}
                              className="h-9 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <span>Isi Form Sekarang</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ─────────────────────────────────────────────────────────────
                        STATUS BUKTI SS GENERAL INSPEKSI (SESUAI REQUEST USER)
                        - JIKA BELUM: ADA PENGINGAT UNGGAH BUKTI SS
                        - JIKA SUDAH: TIDAK ADA PENGINGAT, HANYA CEKLIS SAJA
                       ───────────────────────────────────────────────────────────── */}
                    {!hasSsProof ? (
                      /* PENGINGAT: Belum Upload Bukti SS */
                      <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in duration-200">
                        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                            <Camera className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-[11px] text-[var(--text-main)]">
                                ⚠️ Belum Upload Bukti SS General Inspeksi
                              </span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/35 font-bold text-amber-700">
                                Syarat Rekap
                              </span>
                            </div>
                            <p className="text-[10.5px] text-[var(--text-muted)] leading-snug mt-0.5">
                              Setelah inspeksi, silakan unggah tangkapan layar form general inspeksi untuk melengkapi rekapan Anda.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <a
                            href={GENERAL_INSPECTION_FORM_URL}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 px-2.5 rounded-xl border border-amber-500/30 bg-[var(--card-bg)] text-amber-600 hover:bg-amber-500/10 text-[10.5px] font-bold flex items-center gap-1 transition-colors"
                            title="Buka Formulir General Inspeksi"
                          >
                            <span>Buka Form</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          <button
                            type="button"
                            onClick={() => setShowSsModal(true)}
                            className="p-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-sm shadow-amber-600/20 transition-all cursor-pointer transform active:scale-95"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Upload Bukti SS</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* SUDAH UPLOAD: "Cuman Ceklis Saja" Tanpa Pengingat Apapun */
                      <div className="p-2.5 px-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3 text-xs transition-all">
                        <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-bold text-xs text-[var(--text-main)] truncate">
                            ✓ Bukti SS General Inspeksi Terunggah
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">
                            (Rekap Lengkap)
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {ssProofUrl && (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(formatKtaImageUrl(ssProofUrl))}
                              className="text-[10.5px] font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>Lihat SS</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowSsModal(true)}
                            className="text-[10.5px] text-[var(--text-muted)] hover:text-[var(--text-main)] underline cursor-pointer"
                          >
                            Ganti SS
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-600 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold">Nama Anda belum terjadwal di draft minggu ini.</span>
                      <p className="text-[11px] text-amber-600">
                        Silakan hubungi Admin atau pastikan nama profil Anda sesuai dengan daftar roster.
                      </p>
                    </div>
                  </div>
                  {hasAdminAccess && (
                    <button
                      onClick={() => setShowFullScheduleModal(true)}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 font-bold text-[11px] transition-colors cursor-pointer"
                    >
                      Cek Tabel
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            PANEL 2 (KANAN): PENGINGAT KEWAJIBAN KTA / TTA MINGGU INI
           ───────────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border-main)] bg-gradient-to-br from-[var(--card-bg)] via-[var(--card-bg)] to-amber-500/5 shadow-md p-4 sm:p-5 transition-all flex flex-col justify-between">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header Panel 2 */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-[var(--border-main)] pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xs sm:text-sm font-black text-[var(--text-main)] tracking-tight">
                      Kewajiban KTA / TTA Minggu Ini
                    </h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                      🎯 {myObligation.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] truncate">
                    Kepatuhan Keselamatan Kerja • Periode {currentWeekTag}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <button
                  onClick={toggleKtaMinimize}
                  className="p-1.5 px-2 rounded-xl border border-[var(--border-main)] hover:bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer text-xs flex items-center gap-1 shadow-2xs"
                  title={isKtaMinimized ? "Perluas Tampilan (Detail)" : "Perkecil Tampilan (Ringkas)"}
                >
                  {isKtaMinimized ? (
                    <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
                  ) : (
                    <ChevronUp className="w-3.5 h-3.5" />
                  )}
                  <span className="text-[10px] font-medium hidden sm:inline">
                    {isKtaMinimized ? 'Detail' : 'Ringkas'}
                  </span>
                </button>
                <a
                  href={SAFETY_KTA_FORM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--card-bg)] text-[var(--text-main)] font-bold text-[11px] flex items-center gap-1 transition-all shadow-2xs"
                  title="Buka Formulir Safety KTA/TTA"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                  <span>Form Safety</span>
                </a>
              </div>
            </div>

            {/* KTA Body */}
            <div className="pt-3.5 space-y-3">
              {ktaLoading ? (
                <div className="py-7 flex items-center justify-center gap-2 text-xs text-[var(--text-muted)]">
                  <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                  Mengecek status KTA/TTA Anda...
                </div>
              ) : myKtaRecord?.isCuti ? (
                <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/25 text-sky-900 dark:text-sky-200 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🏖️</span>
                    <div>
                      <h4 className="font-bold">Status: Cuti Aktif</h4>
                      <p className="text-[11px] text-sky-800/80 dark:text-sky-300">
                        Anda tercatat Cuti minggu ini. Bebas dari kewajiban pelaporan KTA/TTA.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-lg bg-sky-500/20 font-bold shrink-0">
                    Bebas Laporan
                  </span>
                </div>
              ) : isKtaMinimized ? (
                /* ── COMPACT / MINIMIZED ESTHETIC VIEW (KTA/TTA) ── */
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="p-2.5 px-3 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {myKtaRecord?.status === 'SUDAH' ? (
                        <span className="w-6 h-6 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="w-6 h-6 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                          <AlertTriangle className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="font-extrabold text-xs text-[var(--text-main)] truncate max-w-[280px]">
                            {myKtaRecord?.status === 'SUDAH' ? 'Target K3L Terpenuhi' : `Kewajiban: ${myObligation.label}`}
                          </h5>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md uppercase ${
                            myKtaRecord?.status === 'SUDAH'
                              ? 'bg-emerald-500/20 text-emerald-700'
                              : 'bg-rose-500/20 text-rose-700'
                          }`}>
                            {myKtaRecord?.status === 'SUDAH'
                              ? `✓ Lengkap (${myKtaRecord.checkDetails?.summaryProgress || '2/2'})`
                              : `⏳ Belum (${myKtaRecord?.checkDetails?.summaryProgress || '0/2'})`}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                          {myKtaRecord?.status === 'SUDAH'
                            ? `Seluruh laporan ${myObligation.label} minggu ${currentWeekTag} selesai`
                            : `Harap laporkan ${myObligation.label} untuk periode minggu ${currentWeekTag}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => setShowKtaModal(true)}
                        className={`h-7 px-2.5 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                          myKtaRecord?.status === 'SUDAH'
                            ? 'bg-[var(--card-bg)] border border-[var(--border-main)] hover:bg-[var(--input-bg)] text-emerald-600'
                            : 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white'
                        }`}
                      >
                        <Camera className="w-3 h-3" />
                        <span>{myKtaRecord?.status === 'SUDAH' ? '+ Lapor Lagi' : 'Laporkan KTA/TTA'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Compact Bar Status Breakdown KTA / TTA */}
                  <div className="p-2 px-3 rounded-xl bg-[var(--card-bg)] border border-[var(--border-main)] flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                      {myObligation.type === '1_KTA_OR_TTA' ? (
                        <div className="flex items-center gap-1 text-[10.5px]">
                          {myKtaRecord?.checkDetails?.check1Done ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-amber-500 shrink-0 inline-block" />
                          )}
                          <span className={myKtaRecord?.checkDetails?.check1Done ? "text-emerald-700 font-bold" : "text-[var(--text-muted)] font-medium"}>
                            1 Laporan KTA/TTA: {myKtaRecord?.checkDetails?.check1Done ? '✓ Ada' : 'Belum'}
                          </span>
                        </div>
                      ) : myObligation.type === '2_TTA' ? (
                        <>
                          <div className="flex items-center gap-1 text-[10.5px]">
                            {myKtaRecord?.checkDetails?.check1Done ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 rounded-full border border-amber-500 shrink-0 inline-block" />
                            )}
                            <span className={myKtaRecord?.checkDetails?.check1Done ? "text-emerald-700 font-bold" : "text-[var(--text-muted)] font-medium"}>
                              TTA 1: {myKtaRecord?.checkDetails?.check1Done ? '✓ Ada' : 'Belum'}
                            </span>
                          </div>
                          <span className="text-[var(--border-main)]">•</span>
                          <div className="flex items-center gap-1 text-[10.5px]">
                            {myKtaRecord?.checkDetails?.check2Done ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 rounded-full border border-amber-500 shrink-0 inline-block" />
                            )}
                            <span className={myKtaRecord?.checkDetails?.check2Done ? "text-emerald-700 font-bold" : "text-[var(--text-muted)] font-medium"}>
                              TTA 2: {myKtaRecord?.checkDetails?.check2Done ? '✓ Ada' : 'Belum'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 text-[10.5px]">
                            {myKtaRecord?.checkDetails?.check1Done ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 rounded-full border border-amber-500 shrink-0 inline-block" />
                            )}
                            <span className={myKtaRecord?.checkDetails?.check1Done ? "text-emerald-700 font-bold" : "text-[var(--text-muted)] font-medium"}>
                              KTA: {myKtaRecord?.checkDetails?.check1Done ? '✓ Ada' : 'Belum'}
                            </span>
                          </div>
                          <span className="text-[var(--border-main)]">•</span>
                          <div className="flex items-center gap-1 text-[10.5px]">
                            {myKtaRecord?.checkDetails?.check2Done ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : (
                              <span className="w-3.5 h-3.5 rounded-full border border-amber-500 shrink-0 inline-block" />
                            )}
                            <span className={myKtaRecord?.checkDetails?.check2Done ? "text-emerald-700 font-bold" : "text-[var(--text-muted)] font-medium"}>
                              TTA: {myKtaRecord?.checkDetails?.check2Done ? '✓ Ada' : 'Belum'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <a
                      href={SAFETY_KTA_FORM_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-[var(--text-muted)] hover:text-amber-600 underline font-semibold shrink-0"
                    >
                      Form Safety ↗
                    </a>
                  </div>
                </div>
              ) : myKtaRecord?.status === 'SUDAH' ? (
                /* SUDAH LENGKAP: Tampilan Sukses & Ceklis Tenang */
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                        <span>KEWAJIBAN LENGKAP ({myKtaRecord.checkDetails?.summaryProgress || '2/2'})</span>
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-bold">
                      ✓ Target K3L Terpenuhi
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-main)] leading-relaxed">
                    Terima kasih! Seluruh laporan <strong>{myObligation.label}</strong> Anda untuk minggu <strong>{currentWeekTag}</strong> telah lengkap diunggah dan terverifikasi.
                  </p>

                  {/* Checklist Summary */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {myObligation.type === '1_KTA_OR_TTA' ? (
                      <div className="col-span-2 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-600 font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          1 Laporan KTA / TTA
                        </span>
                        <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-md">✓ Lengkap (1/1)</span>
                      </div>
                    ) : myObligation.type === '2_TTA' ? (
                      <>
                        <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-600 font-bold">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            TTA 1
                          </span>
                          <span className="text-[10px]">✓ Ada</span>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-600 font-bold">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            TTA 2
                          </span>
                          <span className="text-[10px]">✓ Ada</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-600 font-bold">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            1 KTA
                          </span>
                          <span className="text-[10px]">✓ Ada</span>
                        </div>
                        <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-600 font-bold">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            1 TTA
                          </span>
                          <span className="text-[10px]">✓ Ada</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Tambah Laporan Lagi */}
                  <div className="pt-2 border-t border-[var(--border-main)]/60 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowKtaModal(true)}
                      className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>+ Tambah Laporan Lagi</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* BELUM LENGKAP: PENGINGAT BAHWA BELUM MELAKUKAN KTA/TTA */
                <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white flex items-center gap-1 shadow-xs">
                        <AlertTriangle className="w-3 h-3 text-white" />
                        <span>BELUM LENGKAP ({myKtaRecord?.checkDetails?.summaryProgress || '0/2'})</span>
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-600 font-bold">
                      ⚠️ Segera Lengkapi
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-main)] leading-relaxed">
                    Anda belum menyelesaikan kewajiban <strong>{myObligation.label}</strong> pada periode minggu ini (<strong>{currentWeekTag}</strong>). Mohon segera laporkan temuan KTA/TTA Anda.
                  </p>

                  {/* Checklist Status Per-Item */}
                  <div className="grid grid-cols-2 gap-2">
                    {myObligation.type === '1_KTA_OR_TTA' ? (
                      <div className={`col-span-2 p-2 rounded-xl border flex items-center justify-between text-xs ${
                        myKtaRecord?.checkDetails?.check1Done
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 font-bold'
                          : 'bg-[var(--card-bg)] border-amber-500/30 text-[var(--text-main)]'
                      }`}>
                        <span className="flex items-center gap-1.5 font-bold">
                          {myKtaRecord?.checkDetails?.check1Done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-amber-500 inline-block" />}
                          1 Laporan KTA / TTA
                        </span>
                        <span className="text-[10px] font-bold">
                          {myKtaRecord?.checkDetails?.check1Done ? '✓ Selesai' : '⏳ Belum Diunggah'}
                        </span>
                      </div>
                    ) : myObligation.type === '2_TTA' ? (
                      <>
                        <div className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                          myKtaRecord?.checkDetails?.check1Done
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 font-bold'
                            : 'bg-[var(--card-bg)] border-amber-500/30 text-[var(--text-main)]'
                        }`}>
                          <span className="flex items-center gap-1.5 font-bold">
                            {myKtaRecord?.checkDetails?.check1Done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-amber-500 inline-block" />}
                            TTA 1
                          </span>
                          <span className="text-[10px] font-bold">
                            {myKtaRecord?.checkDetails?.check1Done ? '✓ Ada' : '⏳ Belum'}
                          </span>
                        </div>

                        <div className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                          myKtaRecord?.checkDetails?.check2Done
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 font-bold'
                            : 'bg-[var(--card-bg)] border-amber-500/30 text-[var(--text-main)]'
                        }`}>
                          <span className="flex items-center gap-1.5 font-bold">
                            {myKtaRecord?.checkDetails?.check2Done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-amber-500 inline-block" />}
                            TTA 2
                          </span>
                          <span className="text-[10px] font-bold">
                            {myKtaRecord?.checkDetails?.check2Done ? '✓ Ada' : '⏳ Belum'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                          myKtaRecord?.checkDetails?.check1Done
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 font-bold'
                            : 'bg-[var(--card-bg)] border-amber-500/30 text-[var(--text-main)]'
                        }`}>
                          <span className="flex items-center gap-1.5 font-bold">
                            {myKtaRecord?.checkDetails?.check1Done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-amber-500 inline-block" />}
                            1 KTA
                          </span>
                          <span className="text-[10px] font-bold">
                            {myKtaRecord?.checkDetails?.check1Done ? '✓ Ada' : '⏳ Belum'}
                          </span>
                        </div>

                        <div className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                          myKtaRecord?.checkDetails?.check2Done
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 font-bold'
                            : 'bg-[var(--card-bg)] border-amber-500/30 text-[var(--text-main)]'
                        }`}>
                          <span className="flex items-center gap-1.5 font-bold">
                            {myKtaRecord?.checkDetails?.check2Done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-amber-500 inline-block" />}
                            1 TTA
                          </span>
                          <span className="text-[10px] font-bold">
                            {myKtaRecord?.checkDetails?.check2Done ? '✓ Ada' : '⏳ Belum'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Action Button: Laporkan KTA/TTA Sekarang */}
                  <div className="pt-2 border-t border-[var(--border-main)]/60 flex items-center justify-between gap-2">
                    <a
                      href={SAFETY_KTA_FORM_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[var(--text-muted)] hover:text-amber-600 underline font-medium flex items-center gap-1"
                    >
                      <span>Buka Form Safety ↗</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setShowKtaModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer transform active:scale-95"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Laporkan KTA / TTA Sekarang</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 1: UPLOAD BUKTI SS GENERAL INSPEKSI
         ═══════════════════════════════════════════════════════════════ */}
      {showSsModal && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-main)] flex items-center justify-between bg-gradient-to-r from-blue-600/15 via-blue-500/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[var(--text-main)]">
                    Upload Bukti Screenshot General Inspeksi
                  </h3>
                  <p className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                    Syarat Wajib Rekapan Inspeksi • <span className="font-bold text-blue-600">{currentWeekTag}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowSsModal(false); setSsImageFile(null); setSsImagePreview(null); }}
                className="w-8 h-8 rounded-full bg-[var(--input-bg)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitSsReport} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              {/* Info Box */}
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                <div className="text-[11px] leading-relaxed text-blue-600 min-w-0">
                  <p className="font-bold">Ketentuan Rekap Status Inspeksi:</p>
                  <p className="text-[10px] opacity-90 mt-0.5">
                    Screenshot bukti pengisian formulir general inspeksi wajib diunggah agar status rekapan Anda dinyatakan <strong>SUDAH</strong>.
                  </p>
                </div>
                <a
                  href={GENERAL_INSPECTION_FORM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-center shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Form</span>
                </a>
              </div>

              {/* Data Pelapor */}
              <div className="p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Pelapor:</span>
                  <p className="font-bold text-[var(--text-main)] truncate">{inspectorName} ({inspectorNik || '-'})</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Periode:</span>
                  <span className="font-mono font-bold text-blue-600">{currentWeekTag}</span>
                </div>
              </div>

              {/* Dropzone / Paste Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[var(--text-main)]">
                    Lampirkan Bukti Tangkapan Layar (Screenshot):
                  </label>
                  <span className="text-[10px] text-blue-600 font-semibold">
                    💡 Bisa langsung Paste (Ctrl+V)
                  </span>
                </div>

                {ssImagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-black/40 group aspect-video max-h-56 flex items-center justify-center shadow-md">
                    <img
                      src={ssImagePreview}
                      alt="Pratinjau Screenshot Form General Inspeksi"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => { setSsImageFile(null); setSsImagePreview(null); }}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-rose-500 text-white text-[10px] font-bold shadow-md hover:bg-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus / Ganti
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[var(--border-main)] hover:border-blue-500 bg-[var(--input-bg)] rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-main)]">
                      Klik untuk pilih gambar atau tekan Ctrl + V
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-1">
                      Mendukung tangkapan layar (PNG, JPG, WebP)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSsImageFile(file);
                          const reader = new FileReader();
                          reader.onload = (re) => setSsImagePreview(re.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowSsModal(false); setSsImageFile(null); setSsImagePreview(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs font-bold hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingSs || (!ssImageFile && !ssImagePreview)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmittingSs ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Simpan Bukti Screenshot</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 2: UPLOAD BUKTI FORMULIR KTA / TTA
         ═══════════════════════════════════════════════════════════════ */}
      {showKtaModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl w-full max-w-sm sm:max-w-md flex flex-col overflow-hidden shadow-2xl relative max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-[var(--border-main)] flex items-center justify-between gap-2 shrink-0 bg-gradient-to-r from-amber-500/10 to-transparent">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-amber-500/20 shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-[var(--text-main)]">
                    Kirim Bukti KTA / TTA
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] truncate">
                    Pelapor: {inspectorName} • {currentWeekTag}
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setShowKtaModal(false); setKtaImageFile(null); setKtaImagePreview(null); }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors font-bold shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmitKtaReport} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              
              {/* GOOGLE FORM HELPER BANNER */}
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-2.5 px-3 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] text-[var(--text-main)] font-medium truncate">
                    Belum isi formulir Safety?
                  </span>
                </div>

                <a
                  href={SAFETY_KTA_FORM_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shrink-0 flex items-center gap-1 shadow-xs transition-colors"
                >
                  <span>Buka Form</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* PILIHAN CEKLIS KEWAJIBAN */}
              <div className="bg-[var(--input-bg)] border border-[var(--border-main)] rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Pilih Ceklis yang Dilaporkan:
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 font-extrabold text-[11px] border border-amber-500/30">
                    🎯 {myObligation.label}
                  </span>
                </div>

                {myObligation.type === '1_KTA_AND_1_TTA' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div 
                      onClick={() => {
                        setSelectedKtaChecklist(prev => 
                          prev.includes('KTA') ? prev.filter(x => x !== 'KTA') : [...prev, 'KTA']
                        );
                      }}
                      className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedKtaChecklist.includes('KTA')
                          ? 'bg-amber-500/20 border-amber-500 text-amber-600 ring-2 ring-amber-500/30 shadow-xs'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)] opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center font-bold text-xs shrink-0 ${
                          selectedKtaChecklist.includes('KTA') ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-400'
                        }`}>
                          {selectedKtaChecklist.includes('KTA') && <Check className="w-3 h-3" />}
                        </div>
                        <span className="font-bold text-xs">1 KTA</span>
                      </div>
                      {myKtaRecord?.checkDetails?.check1Done && <span className="text-[9px] text-emerald-600 font-bold">✓ Ada</span>}
                    </div>

                    <div 
                      onClick={() => {
                        setSelectedKtaChecklist(prev => 
                          prev.includes('TTA') ? prev.filter(x => x !== 'TTA') : [...prev, 'TTA']
                        );
                      }}
                      className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedKtaChecklist.includes('TTA')
                          ? 'bg-rose-500/20 border-rose-500 text-rose-600 ring-2 ring-rose-500/30 shadow-xs'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)] opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center font-bold text-xs shrink-0 ${
                          selectedKtaChecklist.includes('TTA') ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-400'
                        }`}>
                          {selectedKtaChecklist.includes('TTA') && <Check className="w-3 h-3" />}
                        </div>
                        <span className="font-bold text-xs">1 TTA</span>
                      </div>
                      {myKtaRecord?.checkDetails?.check2Done && <span className="text-[9px] text-emerald-600 font-bold">✓ Ada</span>}
                    </div>
                  </div>
                )}

                {myObligation.type === '2_TTA' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div 
                      onClick={() => {
                        setSelectedKtaChecklist(prev => 
                          prev.includes('TTA_1') ? prev.filter(x => x !== 'TTA_1') : [...prev, 'TTA_1']
                        );
                      }}
                      className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedKtaChecklist.includes('TTA_1')
                          ? 'bg-rose-500/20 border-rose-500 text-rose-600 ring-2 ring-rose-500/30 shadow-xs'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)] opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center font-bold text-xs shrink-0 ${
                          selectedKtaChecklist.includes('TTA_1') ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-400'
                        }`}>
                          {selectedKtaChecklist.includes('TTA_1') && <Check className="w-3 h-3" />}
                        </div>
                        <span className="font-bold text-xs">TTA 1</span>
                      </div>
                      {myKtaRecord?.checkDetails?.check1Done && <span className="text-[9px] text-emerald-600 font-bold">✓ Ada</span>}
                    </div>

                    <div 
                      onClick={() => {
                        setSelectedKtaChecklist(prev => 
                          prev.includes('TTA_2') ? prev.filter(x => x !== 'TTA_2') : [...prev, 'TTA_2']
                        );
                      }}
                      className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedKtaChecklist.includes('TTA_2')
                          ? 'bg-rose-500/20 border-rose-500 text-rose-600 ring-2 ring-rose-500/30 shadow-xs'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)] opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center font-bold text-xs shrink-0 ${
                          selectedKtaChecklist.includes('TTA_2') ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-400'
                        }`}>
                          {selectedKtaChecklist.includes('TTA_2') && <Check className="w-3 h-3" />}
                        </div>
                        <span className="font-bold text-xs">TTA 2</span>
                      </div>
                      {myKtaRecord?.checkDetails?.check2Done && <span className="text-[9px] text-emerald-600 font-bold">✓ Ada</span>}
                    </div>
                  </div>
                )}

                {myObligation.type === '1_KTA_OR_TTA' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedKtaChecklist(['KTA'])}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        selectedKtaChecklist.includes('KTA')
                          ? 'bg-amber-500/20 border-amber-500 text-amber-600 ring-2 ring-amber-500/40 shadow-xs'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)]'
                      }`}
                    >
                      <span>KTA</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedKtaChecklist(['TTA'])}
                      className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        selectedKtaChecklist.includes('TTA')
                          ? 'bg-rose-500/20 border-rose-500 text-rose-600 ring-2 ring-rose-500/40 shadow-xs'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)]'
                      }`}
                    >
                      <span>TTA</span>
                    </button>
                  </div>
                )}
              </div>

              {/* DROPZONE BUKTI SCREENSHOT */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[var(--text-main)]">
                    Bukti Screenshot Form KTA/TTA:
                  </label>
                  <span className="text-[10px] text-[var(--primary)] font-semibold">
                    💡 Bisa Paste (Ctrl+V)
                  </span>
                </div>

                {ktaImagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-black/40 group aspect-video max-h-52 flex items-center justify-center shadow-md">
                    <img
                      src={ktaImagePreview}
                      alt="Pratinjau Screenshot"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => { setKtaImageFile(null); setKtaImagePreview(null); }}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-rose-500 text-white text-[10px] font-bold shadow-md hover:bg-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[var(--border-main)] hover:border-[var(--primary)] bg-[var(--input-bg)] rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-main)]">
                      Klik untuk pilih gambar atau tekan Ctrl + V
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setKtaImageFile(file);
                          const reader = new FileReader();
                          reader.onload = (re) => setKtaImagePreview(re.target?.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowKtaModal(false); setKtaImageFile(null); setKtaImagePreview(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs font-bold hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingKta || (!ktaImageFile && !ktaImagePreview) || selectedKtaChecklist.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmittingKta ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Bukti ({selectedKtaChecklist.length} Ceklis)</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 3: LIGHTBOX PREVIEW BUKTI SS
         ═══════════════════════════════════════════════════════════════ */}
      {lightboxUrl && (
        <div 
          onClick={() => setLightboxUrl(null)}
          className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <img
              src={lightboxUrl}
              alt="Bukti Screenshot General Inspeksi"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-white/20"
            />
            <button
              onClick={() => setLightboxUrl(null)}
              className="mt-3 px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Tutup Pratinjau</span>
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL 4: SELURUH JADWAL TIM (GOOGLE SHEET VIEWER) - ADMIN ONLY
         ═══════════════════════════════════════════════════════════════ */}
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
            <div className="p-3 sm:p-4 border-b border-[var(--border-main)] bg-slate-50/80 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama personil, jabatan, atau area inspeksi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                      filterShift === tab.id
                        ? 'bg-emerald-600 text-white shadow-xs font-bold'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-2 bg-slate-50/40 dark:bg-slate-950/20">
              {filteredAll.length === 0 ? (
                <div className="py-16 text-center text-xs sm:text-sm text-slate-400 flex flex-col items-center gap-2">
                  <Search className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                  <span>Tidak ada jadwal personil yang cocok dengan pencarian "{searchQuery}"</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                  {filteredAll.map((item, idx) => {
                    const isCurrentUser = 
                      inspectorName && item.name.toLowerCase().includes(inspectorName.toLowerCase());

                    const shiftLower = (item.shift || '').toLowerCase();
                    let shiftBadgeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
                    if (item.isCuti) {
                      shiftBadgeClass = 'bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800';
                    } else if (shiftLower.includes('malam') || shiftLower.includes('shift a') || shiftLower.includes('shift b')) {
                      shiftBadgeClass = 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800';
                    } else if (shiftLower.includes('siang') || shiftLower.includes('shift r')) {
                      shiftBadgeClass = 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800';
                    }

                    return (
                      <div
                        key={idx}
                        className={`p-3.5 sm:p-4 transition-all ${
                          isCurrentUser 
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-l-4 border-l-emerald-600 dark:border-l-emerald-400' 
                            : 'hover:bg-slate-50/90 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          {/* Left Details */}
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                              {item.no}
                            </span>

                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <h5 className="text-sm font-bold text-slate-600 flex items-center gap-1.5">
                                  {item.name}
                                  {isCurrentUser && (
                                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                                      Anda
                                    </span>
                                  )}
                                  {item.isCompleted && (
                                    <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                                      ✓ Selesai
                                    </span>
                                  )}
                                </h5>
                                {item.jabatan && (
                                  <span className="text-xs text-slate-600 font-medium">
                                    • {item.jabatan}
                                  </span>
                                )}
                              </div>

                              {item.isCuti ? (
                                <div className="inline-flex items-center gap-1.5 text-xs text-sky-700 dark:text-sky-300 font-semibold bg-sky-50 dark:bg-sky-950/40 px-2.5 py-1 rounded-lg border border-sky-200/60 dark:border-sky-800/50 mt-1">
                                  <span>🏖️</span>
                                  <span>Sedang Cuti / Bebas Tugas</span>
                                </div>
                              ) : (
                                <div className="space-y-1 mt-0.5">
                                  <p className="text-xs sm:text-sm font-semibold text-slate-600 leading-snug">
                                    {item.inspeksi}
                                  </p>

                                  {item.partners && item.partners.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 pt-0.5">
                                      <span className="font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5" />
                                        {item.partners.length === 1 ? 'Pasangan:' : 'Rekan Tim:'}
                                      </span>
                                      <span className="text-slate-600">
                                        {item.partners.map(p => `${p.name} (${p.roleIndex === 1 ? 'Inspektor 1' : `Inspektor ${p.roleIndex}`})`).join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right Badges */}
                          <div className="flex items-center gap-2 self-start sm:self-center shrink-0 pl-10 sm:pl-0">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${shiftBadgeClass}`}>
                              {item.shift}
                            </span>

                            {!item.isCuti && (
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                                item.roleIndex === 1
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              }`}>
                                Peran {item.roleIndex}
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

            {/* Footer */}
            <div className="p-3.5 sm:p-4 border-t border-[var(--border-main)] bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
              <span className="font-medium">
                Menampilkan <strong className="text-slate-600">{filteredAll.length}</strong> dari <strong>{allSchedules.length}</strong> personil
              </span>
              <button
                onClick={() => setShowFullScheduleModal(false)}
                className="h-9 px-5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 transition-colors shadow-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
