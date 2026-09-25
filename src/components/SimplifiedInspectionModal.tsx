import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardCheck, ClipboardList, Camera, X, Check, 
  Upload, ArrowRight, Loader2, Trash2, Calendar,
  ShieldAlert, CheckCircle2, AlertTriangle, ChevronLeft, ExternalLink, MapPin,
  Sparkles, FileText, Clock, AlertCircle, Eye, Download, ZoomIn, Image as ImageIcon,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { compressImage } from '../features/inspections/hooks/useInspection';
import { triggerExpGain } from '../lib/gamificationEvents';
import { isPicTemuanRole, getOpenFindingsForSupervisor } from '../utils/inspection-pic-matcher';
import { getISOWeekKey } from '../utils/iso-week';

const SAFETY_KTA_FORM_URL = 'https://docs.google.com/forms/d/1YMympG3aA-8l978aAlRJFSoi-SVQAKiS7KmJjNRfuBI/viewform?edit_requested=true';

export function formatProofImageUrl(url?: string | null): string {
  if (!url || url === '-' || url === '#' || url === 'null') return '';
  if (url.startsWith('data:image')) return url;
  if (url.startsWith('/api/')) return url;

  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`;
  }
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`;
  }
  return url;
}

interface SimplifiedInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectorNik: string | null;
  inspectorName: string | null;
  userSection?: string;
  userJabatan?: string | null;
  schedule?: any | null;
  defaultTab?: 'weekly' | 'kta_tta' | 'findings' | 'p2h';
  onNav: (tab: any) => void;
  onSuccess?: () => void;
}

export function SimplifiedInspectionModal({
  isOpen,
  onClose,
  inspectorNik,
  inspectorName,
  userSection = 'Preparasi & Lab',
  userJabatan,
  schedule,
  defaultTab = 'weekly',
  onNav,
  onSuccess
}: SimplifiedInspectionModalProps) {
  const currentJabatan = userJabatan || localStorage.getItem('p2h_inspector_jabatan') || '';
  const isPic = isPicTemuanRole(currentJabatan);

  const [activeTab, setActiveTab] = useState<'weekly' | 'kta_tta' | 'findings' | 'p2h'>(defaultTab);
  
  // Existing Proofs fetched from backend
  const [weeklyProofs, setWeeklyProofs] = useState<any[]>([]);
  const [ktaProofs, setKtaProofs] = useState<any[]>([]);
  const [loadingProofs, setLoadingProofs] = useState(false);
  const [showUploadWeeklyForm, setShowUploadWeeklyForm] = useState(false);
  const [showUploadKtaForm, setShowUploadKtaForm] = useState(false);

  // Lightbox Preview Modal State
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; subtitle?: string } | null>(null);

  // Weekly Inspection SS upload state
  const [weeklyImagePreview, setWeeklyImagePreview] = useState<string | null>(null);
  const [weeklyImageFile, setWeeklyImageFile] = useState<File | null>(null);
  const [submittingWeekly, setSubmittingWeekly] = useState(false);
  const weeklyFileInputRef = useRef<HTMLInputElement>(null);

  // KTA/TTA upload state
  const [selectedKtaType, setSelectedKtaType] = useState<'KTA' | 'TTA' | 'BOTH'>('BOTH');
  const [ktaDescription, setKtaDescription] = useState('');
  const [ktaImagePreview, setKtaImagePreview] = useState<string | null>(null);
  const [ktaImageFile, setKtaImageFile] = useState<File | null>(null);
  const [submittingKta, setSubmittingKta] = useState(false);
  const ktaFileInputRef = useRef<HTMLInputElement>(null);

  // PIC Findings state
  const [openFindings, setOpenFindings] = useState<any[]>([]);
  const [loadingFindings, setLoadingFindings] = useState(false);
  const [closingTicket, setClosingTicket] = useState<any | null>(null);
  const [closingActionTaken, setClosingActionTaken] = useState('');
  const [closingPhotoPreview, setClosingPhotoPreview] = useState<string | null>(null);
  const [closingPhotoFile, setClosingPhotoFile] = useState<File | null>(null);
  const [submittingClose, setSubmittingClose] = useState(false);
  const closingFileInputRef = useRef<HTMLInputElement>(null);

  // Fetch submitted proofs for this user
  const fetchUserProofs = async () => {
    if (!inspectorNik && !inspectorName) return;
    setLoadingProofs(true);
    try {
      const cleanNik = (inspectorNik || '').trim().toLowerCase();
      const cleanName = (inspectorName || '').trim().toLowerCase();

      const isMatch = (item: any) => {
        const itemNik = (item.nik || item.senderNik || '').trim().toLowerCase();
        const itemName = (item.name || item.senderName || '').trim().toLowerCase();
        if (cleanNik && itemNik === cleanNik) return true;
        if (cleanName && (itemName.includes(cleanName) || cleanName.includes(itemName))) return true;
        if (cleanName && itemName) {
          const selfParts = cleanName.split(/\s+/).filter(Boolean);
          const itemParts = itemName.split(/\s+/).filter(Boolean);
          if (selfParts.length >= 2 && itemParts.length >= 2 && selfParts.every(p => itemName.includes(p))) return true;
        }
        return false;
      };

      const [wRes, kRes] = await Promise.allSettled([
        fetch('/api/inspection-proofs?week=ALL'),
        fetch('/api/kta-reports?week=ALL')
      ]);

      if (wRes.status === 'fulfilled' && wRes.value.ok) {
        const allW: any[] = await wRes.value.json();
        const myW = Array.isArray(allW) ? allW.filter(isMatch) : [];
        // Add schedule.ssProofUrl if not in list
        if (schedule?.ssProofUrl && !myW.some(p => p.imageUrl === schedule.ssProofUrl)) {
          myW.unshift({
            id: 'sched-proof',
            imageUrl: schedule.ssProofUrl,
            date: schedule.date || 'Minggu Ini',
            description: `Bukti SS Formulir Inspeksi ${schedule?.area || ''}`
          });
        }
        setWeeklyProofs(myW);
      }

      if (kRes.status === 'fulfilled' && kRes.value.ok) {
        const allK: any[] = await kRes.value.json();
        const myK = Array.isArray(allK) ? allK.filter(isMatch) : [];
        setKtaProofs(myK);
      }
    } catch (e) {
      console.warn('Gagal memuat bukti screenshot:', e);
    } finally {
      setLoadingProofs(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (defaultTab === 'findings' && isPic) {
        setActiveTab('findings');
      } else if (defaultTab) {
        setActiveTab(defaultTab);
      }
      fetchUserProofs();
    }
  }, [isOpen, defaultTab, isPic, inspectorNik, inspectorName, schedule]);

  // Fetch tickets for PIC findings
  const fetchFindings = async () => {
    if (!isPic) return;
    setLoadingFindings(true);
    try {
      const res = await fetch('/api/tickets');
      if (res.ok) {
        const tickets = await res.json();
        const resMatch = getOpenFindingsForSupervisor(currentJabatan, tickets);
        setOpenFindings(resMatch.openFindings || []);
      }
    } catch (err) {
      console.warn('Gagal memuat temuan untuk PIC:', err);
    } finally {
      setLoadingFindings(false);
    }
  };

  useEffect(() => {
    if (isOpen && isPic) {
      fetchFindings();
    }
  }, [isOpen, isPic, currentJabatan]);

  if (!isOpen) return null;

  // Paste handler supporting all tabs
  const handleGlobalPaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            if (activeTab === 'findings' && closingTicket) {
              setClosingPhotoFile(file);
              setClosingPhotoPreview(result);
              toast.success('Foto bukti perbaikan berhasil ditempel!');
            } else if (activeTab === 'kta_tta') {
              setKtaImageFile(file);
              setKtaImagePreview(result);
              toast.success('Screenshot bukti form KTA/TTA ditempel!');
            } else if (activeTab === 'weekly') {
              setWeeklyImageFile(file);
              setWeeklyImagePreview(result);
              toast.success('Screenshot form inspeksi ditempel!');
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    }
  };

  // ── SUBMIT WEEKLY INSPECTION SS PROOF ──
  const handleSubmitWeeklySs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingWeekly) return;

    if (!weeklyImagePreview && !weeklyImageFile) {
      toast.error('Silakan upload bukti tangkapan layar form inspeksi!');
      return;
    }

    setSubmittingWeekly(true);
    toast.loading('Menyimpan bukti SS General Inspeksi...', { id: 'upload-weekly-ss' });

    try {
      let base64Data = weeklyImagePreview || '';
      if (weeklyImageFile) {
        base64Data = await compressImage(weeklyImageFile);
      }

      let uploadedUrl = base64Data;
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            mimeType: 'image/jpeg',
            filename: `SS_INSPEKSI_${inspectorNik || 'user'}_${Date.now()}.jpg`,
            folderName: 'Bukti Screenshot Inspeksi'
          })
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          if (upJson.url) uploadedUrl = upJson.url;
        }
      } catch {
        // fallback to base64
      }

      const todayStr = new Date().toISOString().split('T')[0];

      const res = await fetch('/api/inspection-proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: inspectorNik || 'USER',
          name: inspectorName || 'Personil',
          section: userSection,
          date: todayStr,
          imageUrl: uploadedUrl,
          description: `Bukti Screenshot General Inspeksi Mingguan (${schedule?.formInfo?.formTitle || schedule?.area || 'Area Operasional'})`
        })
      });

      if (res.ok) {
        toast.success('✅ Bukti SS General Inspeksi berhasil disimpan!', { id: 'upload-weekly-ss', duration: 4000 });
        
        const currentWeekKey = getISOWeekKey(new Date());
        const userKey = (inspectorNik || (typeof window !== 'undefined' ? localStorage.getItem('preplab_nik') : null) || inspectorName || 'GUEST').trim().toUpperCase();
        const weeklyQuotaKey = `preplab_insp_exp_week_${userKey}`;
        const lastAwardedWeek = typeof window !== 'undefined' ? localStorage.getItem(weeklyQuotaKey) : null;

        if (lastAwardedWeek === currentWeekKey) {
          toast.info('Bukti SS disimpan! Kuota EXP inspeksi (1x/minggu) sudah terpenuhi untuk minggu ini.', { duration: 4000 });
        } else {
          if (typeof window !== 'undefined') {
            localStorage.setItem(weeklyQuotaKey, currentWeekKey);
          }
          triggerExpGain(50, 'Inspeksi Selesai!', 'Bukti SS General Inspeksi Tersimpan');
        }

        window.dispatchEvent(new Event('gamification_updated'));
        window.dispatchEvent(new CustomEvent('refresh-group-reports'));

        setWeeklyImagePreview(null);
        setWeeklyImageFile(null);
        setShowUploadWeeklyForm(false);
        await fetchUserProofs();

        if (onSuccess) onSuccess();
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Gagal menyimpan bukti inspeksi');
      }
    } catch (err: any) {
      toast.error('Gagal: ' + (err.message || 'Terjadi kesalahan jaringan'), { id: 'upload-weekly-ss' });
    } finally {
      setSubmittingWeekly(false);
    }
  };

  // ── SUBMIT KTA / TTA HARITA PROOF ──
  const handleSubmitKta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingKta) return;

    if (!ktaImagePreview && !ktaImageFile) {
      toast.error('Silakan upload atau foto tangkapan layar bukti form KTA/TTA!');
      return;
    }

    setSubmittingKta(true);
    toast.loading('Mengunggah bukti laporan KTA/TTA...', { id: 'upload-kta' });

    try {
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
            filename: `KTA_TTA_${inspectorNik || 'user'}_${Date.now()}.jpg`,
            folderName: 'Laporan KTA TTA Harita'
          })
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          if (upJson.url) uploadedUrl = upJson.url;
        }
      } catch {
        // fallback to base64
      }

      const typesToSubmit: ('KTA' | 'TTA')[] = 
        selectedKtaType === 'BOTH' ? ['KTA', 'TTA'] : [selectedKtaType];

      const todayStr = new Date().toISOString().split('T')[0];

      for (const t of typesToSubmit) {
        await fetch('/api/kta-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nik: inspectorNik || 'USER',
            name: inspectorName || 'Personil',
            section: userSection,
            reportType: t,
            date: todayStr,
            imageUrl: uploadedUrl,
            description: ktaDescription.trim() || `Laporan bukti formulir ${t} disederhanakan`,
            location: '-'
          })
        });
      }

      const expGain = selectedKtaType === 'BOTH' ? 60 : 35;
      toast.success('✅ Bukti laporan KTA/TTA berhasil dikirim ke Safety!', { id: 'upload-kta', duration: 4000 });
      triggerExpGain(expGain, 'Laporan KTA/TTA Terkirim!', 'Kontribusi K3L Harita Nickel');
      window.dispatchEvent(new Event('gamification_updated'));
      window.dispatchEvent(new CustomEvent('refresh-group-reports'));

      setKtaImagePreview(null);
      setKtaImageFile(null);
      setKtaDescription('');
      setShowUploadKtaForm(false);
      await fetchUserProofs();

      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error('Gagal mengirim: ' + (err.message || 'Terjadi kesalahan jaringan'), { id: 'upload-kta' });
    } finally {
      setSubmittingKta(false);
    }
  };

  // ── SUBMIT CLOSING FINDING (PIC) ──
  const handleCloseTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingTicket || submittingClose) return;
    if (!closingActionTaken.trim()) {
      toast.error('Deskripsi tindakan perbaikan fisik wajib diisi!');
      return;
    }

    setSubmittingClose(true);
    toast.loading(`Menutup tiket ${closingTicket.ticketId}...`, { id: 'closing-ticket' });

    try {
      let photoUrl = '';
      if (closingPhotoFile) {
        const compressedBase64 = await compressImage(closingPhotoFile);
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data: compressedBase64,
            mimeType: 'image/jpeg',
            filename: `CLOSING_${closingTicket.ticketId}_${Date.now()}.jpg`,
            folderName: 'Internal Tickets'
          })
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          photoUrl = upJson.url || compressedBase64;
        } else {
          photoUrl = compressedBase64;
        }
      } else if (closingPhotoPreview) {
        photoUrl = closingPhotoPreview;
      }

      const res = await fetch(`/api/tickets/${closingTicket.ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CLOSED',
          actionTaken: closingActionTaken,
          closingPhoto: photoUrl,
          pic: inspectorName || 'PIC SPV/Specialist',
          completionDate: new Date().toISOString()
        })
      });

      if (res.ok) {
        toast.success(`✅ Tiket ${closingTicket.ticketId} berhasil ditutup! (+60 EXP)`, { id: 'closing-ticket', duration: 4000 });
        triggerExpGain(60, 'Penuntasan Temuan Hasil Inspeksi');
        window.dispatchEvent(new Event('gamification_updated'));
        window.dispatchEvent(new CustomEvent('refresh-tickets'));

        setClosingTicket(null);
        setClosingActionTaken('');
        setClosingPhotoPreview(null);
        setClosingPhotoFile(null);
        await fetchFindings();

        if (onSuccess) onSuccess();
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Gagal menutup tiket');
      }
    } catch (err: any) {
      toast.error('Gagal: ' + (err.message || 'Terjadi kesalahan sistem'), { id: 'closing-ticket' });
    } finally {
      setSubmittingClose(false);
    }
  };

  const isAnySubmitting = submittingWeekly || submittingKta || submittingClose;
  const latestWeeklyProof = weeklyProofs[0] || null;

  return (
    <AnimatePresence>
      <div 
        onPaste={handleGlobalPaste}
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isAnySubmitting && onClose()}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="relative z-10 w-full sm:max-w-lg rounded-t-[28px] sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
          style={{
            backgroundColor: 'var(--card-bg, #FFFFFF)',
            borderColor: 'var(--border-main, #E2E8F0)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                activeTab === 'findings'
                  ? 'bg-rose-500/15 text-rose-600'
                  : activeTab === 'kta_tta'
                  ? 'bg-amber-500/15 text-amber-600'
                  : 'bg-teal-500/15 text-teal-600'
              }`}>
                {activeTab === 'findings' ? (
                  <ShieldAlert className="w-5 h-5" />
                ) : activeTab === 'kta_tta' ? (
                  <Camera className="w-5 h-5" />
                ) : (
                  <ClipboardCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-black text-[var(--text-main)] font-display leading-tight">
                  {activeTab === 'findings'
                    ? 'Manajemen Temuan Inspeksi'
                    : activeTab === 'kta_tta'
                    ? 'Lapor KTA & TTA Harita'
                    : 'Inspeksi Rutin Mingguan'}
                </h3>
                <p className="text-[10.5px] text-[var(--text-muted)]">
                  {activeTab === 'findings'
                    ? `PIC Area: ${inspectorName || 'SPV / Specialist'}`
                    : activeTab === 'kta_tta'
                    ? 'Kondisi & Tindakan Tidak Aman'
                    : 'Pengisian Formulir & Upload Bukti'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchUserProofs}
                disabled={loadingProofs}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] cursor-pointer"
                title="Segarkan data bukti"
              >
                <RefreshCw className={`w-4 h-4 ${loadingProofs ? 'animate-spin text-teal-600' : ''}`} />
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={isAnySubmitting}
                className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className={`p-2.5 border-b border-[var(--border-main)] grid ${
            isPic ? 'grid-cols-3' : 'grid-cols-2'
          } gap-1.5 bg-[var(--input-bg)] shrink-0`}>
            {/* Tab 1: Inspeksi Mingguan */}
            <button
              type="button"
              onClick={() => { setActiveTab('weekly'); setClosingTicket(null); }}
              className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'weekly'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] opacity-80'
              }`}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Inspeksi Rutin</span>
              {weeklyProofs.length > 0 && (
                <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'weekly' ? 'bg-white text-teal-700' : 'bg-emerald-500/20 text-emerald-600'
                }`}>
                  ✓
                </span>
              )}
            </button>

            {/* Tab 2: Lapor KTA & TTA */}
            <button
              type="button"
              onClick={() => { setActiveTab('kta_tta'); setClosingTicket(null); }}
              className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'kta_tta'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)] opacity-80'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>KTA &amp; TTA</span>
              {ktaProofs.length > 0 && (
                <span className={`text-[9.5px] px-1.5 py-0.2 rounded-full font-black ${
                  activeTab === 'kta_tta' ? 'bg-white text-amber-700' : 'bg-amber-500/20 text-amber-600'
                }`}>
                  {ktaProofs.length}
                </span>
              )}
            </button>

            {/* Tab 3: Temuan PIC (Khusus SPV & Specialist) */}
            {isPic && (
              <button
                type="button"
                onClick={() => { setActiveTab('findings'); setClosingTicket(null); }}
                className={`py-2 px-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'findings'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-main)] opacity-80'
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Temuan</span>
                {openFindings.length > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    activeTab === 'findings' ? 'bg-white text-rose-600' : 'bg-rose-500 text-white'
                  }`}>
                    {openFindings.length}
                  </span>
                )}
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {/* ════════ TAB 1: INSPEKSI RUTIN MINGGUAN ════════ */}
            {activeTab === 'weekly' && (
              <div className="p-4 space-y-3.5 text-xs">
                {/* Jadwal Inspeksi Info Card */}
                <div className="p-3.5 rounded-2xl bg-teal-500/10 border border-teal-500/25 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-600 text-white flex items-center gap-1 shadow-2xs">
                      <Sparkles className="w-3 h-3" /> Penugasan Minggu Ini
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      schedule?.isCompleted || weeklyProofs.length > 0
                        ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                        : 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                    }`}>
                      {schedule?.isCompleted || weeklyProofs.length > 0 ? '✓ Sudah Diisi' : '⏳ Belum Diisi'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border-main)]">
                      <span className="text-[10px] text-[var(--text-muted)] block flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-teal-600" /> Area Inspeksi:
                      </span>
                      <strong className="text-[var(--text-main)] block truncate mt-0.5">
                        {schedule?.area || 'Preparasi & Lab'}
                      </strong>
                      <span className="text-[9.5px] text-[var(--text-muted)] block truncate">
                        {schedule?.subArea || schedule?.formInfo?.subArea || 'Semua Sub-Area'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border-main)]">
                      <span className="text-[10px] text-[var(--text-muted)] block flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-teal-600" /> Hari / Tanggal:
                      </span>
                      <strong className="text-[var(--text-main)] block truncate mt-0.5">
                        {schedule?.day || schedule?.dayName || 'Minggu Berjalan'}
                      </strong>
                      <span className="text-[9.5px] text-[var(--text-muted)] block truncate">
                        {schedule?.date || schedule?.assignmentDate || 'Siklus Mingguan'}
                      </span>
                    </div>
                  </div>

                  {/* Form Title */}
                  <div className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-main)] flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-[var(--text-muted)] block">Formulir Sasaran:</span>
                      <h4 className="font-bold text-xs text-[var(--text-main)] truncate">
                        {schedule?.formInfo?.formTitle || schedule?.formName || 'Formulir General Inspeksi Mingguan'}
                      </h4>
                    </div>
                  </div>
                </div>

                {/* ── JIKA SUDAH ADA BUKTI SCREENSHOT INSPEKSI: TAMPILKAN THUMBNAIL & TOMBOL LIHAT BUKTI ── */}
                {latestWeeklyProof && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-xs text-emerald-800 dark:text-emerald-200">
                          Bukti Screenshot Inspeksi Terunggah
                        </span>
                      </div>
                      <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                        ✓ Terverifikasi (+50 EXP)
                      </span>
                    </div>

                    {/* Thumbnail Preview Container */}
                    <div 
                      onClick={() => setLightboxImage({
                        url: latestWeeklyProof.imageUrl,
                        title: 'Bukti Screenshot General Inspeksi',
                        subtitle: `${latestWeeklyProof.name || inspectorName} • ${latestWeeklyProof.date || 'Minggu Ini'}`
                      })}
                      className="group relative rounded-2xl overflow-hidden border-2 border-emerald-500/30 bg-black/5 hover:border-emerald-500 transition-all cursor-pointer shadow-xs aspect-video max-h-48 flex items-center justify-center"
                    >
                      <img
                        src={formatProofImageUrl(latestWeeklyProof.imageUrl)}
                        alt="Thumbnail Bukti Inspeksi"
                        onError={(e) => {
                          const raw = latestWeeklyProof.imageUrl;
                          const driveMatch = raw?.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || raw?.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                          if (driveMatch && !e.currentTarget.src.includes('uc?export=view')) {
                            e.currentTarget.src = `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
                          }
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs">
                        <Eye className="w-5 h-5" />
                        <span>Klik untuk Memperbesar</span>
                      </div>
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-lg bg-black/60 backdrop-blur-xs text-white text-[9.5px] font-medium flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        <span>Pratinjau Screenshot</span>
                      </div>
                    </div>

                    {/* Tombol Aksi Lihat Bukti Screenshot */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setLightboxImage({
                          url: latestWeeklyProof.imageUrl,
                          title: 'Bukti Screenshot General Inspeksi',
                          subtitle: `${latestWeeklyProof.name || inspectorName} • ${latestWeeklyProof.date || 'Minggu Ini'}`
                        })}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Lihat Bukti Screenshot</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setShowUploadWeeklyForm(prev => !prev)}
                        className="py-2 px-3 rounded-xl border border-[var(--border-main)] hover:bg-black/5 text-[var(--text-muted)] hover:text-[var(--text-main)] font-semibold text-xs transition-colors cursor-pointer"
                      >
                        {showUploadWeeklyForm ? 'Tutup Form' : 'Unggah Ulang'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Tombol Utama Buka Form Digital */}
                <button
                  type="button"
                  onClick={() => {
                    const formId = schedule?.formInfo?.formId || schedule?.formId || '';
                    const subArea = schedule?.formInfo?.subArea || schedule?.subArea || '';
                    if (formId) sessionStorage.setItem('preselected_form_id', formId);
                    if (subArea) sessionStorage.setItem('preselected_sub_area', subArea);
                    onClose();
                    onNav('weekly-inspection');
                  }}
                  className="w-full py-3.5 px-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>{schedule?.isCompleted ? 'Buka Kembali Form Digital' : 'Mulai Pengisian Form Inspeksi Digital'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Form Upload Bukti Screenshot (Tampil jika belum ada bukti atau user klik Unggah Ulang) */}
                {(!latestWeeklyProof || showUploadWeeklyForm) && (
                  <div className="pt-2 border-t border-[var(--border-main)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-[var(--text-main)] flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-teal-600" />
                        <span>Unggah Bukti Form Inspeksi (SS)</span>
                      </span>
                      <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400">
                        +50 EXP
                      </span>
                    </div>
                    <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed">
                      Jika Anda mengisi form inspeksi via tautan terpisah / lembar tanggapan, unggah tangkapan layar bukti kirim di bawah ini:
                    </p>

                    <form onSubmit={handleSubmitWeeklySs} className="space-y-3">
                      {weeklyImagePreview ? (
                        <div className="relative rounded-2xl overflow-hidden border border-teal-500/40 bg-black/5 p-2">
                          <img src={weeklyImagePreview} alt="Bukti SS" className="w-full max-h-48 object-contain rounded-xl" />
                          <button
                            type="button"
                            onClick={() => {
                              setWeeklyImagePreview(null);
                              setWeeklyImageFile(null);
                            }}
                            className="absolute top-3 right-3 p-1.5 rounded-full bg-rose-500 text-white shadow-md hover:bg-rose-600 transition-colors"
                            title="Hapus foto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => weeklyFileInputRef.current?.click()}
                          className="rounded-2xl border-2 border-dashed border-[var(--border-main)] hover:border-teal-500/50 p-4 text-center cursor-pointer transition-colors bg-[var(--input-bg)] hover:bg-teal-500/5"
                        >
                          <input
                            ref={weeklyFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 8 * 1024 * 1024) {
                                toast.error('Ukuran file maksimal 8MB');
                                return;
                              }
                              setWeeklyImageFile(file);
                              const reader = new FileReader();
                              reader.onload = () => setWeeklyImagePreview(reader.result as string);
                              reader.readAsDataURL(file);
                            }}
                            className="hidden"
                          />
                          <div className="w-10 h-10 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center mx-auto mb-2">
                            <Upload className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-bold text-[var(--text-main)] block">
                            Pilih Screenshot Formulir Inspeksi
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">
                            Bisa difoto atau tempel (Ctrl+V) langsung
                          </span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={submittingWeekly || (!weeklyImagePreview && !weeklyImageFile)}
                        className="w-full py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 active:scale-95 transition-all cursor-pointer"
                      >
                        {submittingWeekly ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Menyimpan Bukti...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Simpan Bukti SS Form (+50 EXP)</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* ════════ TAB 2: LAPOR KTA & TTA ════════ */}
            {activeTab === 'kta_tta' && (
              <div className="p-4 space-y-3.5 text-xs">
                {/* ── JIKA SUDAH ADA BUKTI KTA/TTA: TAMPILKAN DAFTAR THUMBNAIL & TOMBOL LIHAT BUKTI ── */}
                {ktaProofs.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-[var(--text-main)] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Bukti Laporan KTA/TTA Terkirim ({ktaProofs.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowUploadKtaForm(prev => !prev)}
                        className="text-[11px] font-bold text-amber-600 hover:underline cursor-pointer"
                      >
                        {showUploadKtaForm ? '✕ Tutup Form' : '+ Lapor Lagi'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {ktaProofs.map((report, idx) => (
                        <div key={report.id || idx} className="p-3 rounded-2xl border border-[var(--border-main)] bg-[var(--card-bg)] space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full ${
                              report.reportType === 'TTA' 
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300' 
                                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                            }`}>
                              {report.reportType || 'KTA'}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)]">
                              {report.date || 'Minggu Ini'}
                            </span>
                          </div>

                          {/* Thumbnail Screenshot */}
                          <div 
                            onClick={() => setLightboxImage({
                              url: report.imageUrl,
                              title: `Bukti Form ${report.reportType || 'KTA/TTA'}`,
                              subtitle: `${report.name || inspectorName} • ${report.date || ''}`
                            })}
                            className="group relative rounded-xl overflow-hidden border border-[var(--border-main)] bg-black/5 aspect-video max-h-36 flex items-center justify-center cursor-pointer hover:border-amber-500 transition-colors shadow-2xs"
                          >
                            <img
                              src={formatProofImageUrl(report.imageUrl)}
                              alt="Thumbnail KTA/TTA"
                              onError={(e) => {
                                const raw = report.imageUrl;
                                const driveMatch = raw?.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || raw?.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                                if (driveMatch && !e.currentTarget.src.includes('uc?export=view')) {
                                  e.currentTarget.src = `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
                                }
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1">
                              <Eye className="w-4 h-4" />
                              <span>Perbesar</span>
                            </div>
                          </div>

                          {report.description && (
                            <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                              {report.description}
                            </p>
                          )}

                          {/* Tombol Lihat Bukti Screenshot */}
                          <button
                            type="button"
                            onClick={() => setLightboxImage({
                              url: report.imageUrl,
                              title: `Bukti Form ${report.reportType || 'KTA/TTA'}`,
                              subtitle: `${report.name || inspectorName} • ${report.date || ''}`
                            })}
                            className="w-full py-1.5 px-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/25 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Lihat Bukti Screenshot</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form Pelaporan KTA/TTA (Tampil jika belum pernah lapor atau klik Lapor Lagi) */}
                {(ktaProofs.length === 0 || showUploadKtaForm) && (
                  <form onSubmit={handleSubmitKta} className="space-y-3.5">
                    {/* Banner Google Form KTA / TTA */}
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-800 dark:text-amber-200">
                          Formulir KTA/TTA Safety Harita
                        </span>
                        <span className="text-[9.5px] font-bold text-amber-700 dark:text-amber-300">
                          +30 s/d +60 EXP
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                        Buka dan isi laporan temuan kondisi atau tindakan berbahaya di Google Form resmi Safety Harita Nickel:
                      </p>
                      <a
                        href={SAFETY_KTA_FORM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 px-3 rounded-xl bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-amber-600 transition-colors"
                      >
                        <span>Buka Form KTA/TTA Harita</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>

                    {/* Jenis Laporan */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[var(--text-main)] block">
                        Jenis Laporan yang Diisi:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedKtaType('KTA')}
                          className={`py-2 px-1 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer ${
                            selectedKtaType === 'KTA'
                              ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                              : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border-main)] hover:border-amber-400'
                          }`}
                        >
                          KTA Saja
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedKtaType('TTA')}
                          className={`py-2 px-1 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer ${
                            selectedKtaType === 'TTA'
                              ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                              : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border-main)] hover:border-amber-400'
                          }`}
                        >
                          TTA Saja
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedKtaType('BOTH')}
                          className={`py-2 px-1 rounded-xl text-center font-bold text-xs border transition-all cursor-pointer ${
                            selectedKtaType === 'BOTH'
                              ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                              : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border-main)] hover:border-amber-400'
                          }`}
                        >
                          Keduanya (+60 EXP)
                        </button>
                      </div>
                    </div>

                    {/* Catatan Singkat (Opsional) */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[var(--text-main)] block">
                        Catatan Temuan (Opsional):
                      </label>
                      <input
                        type="text"
                        value={ktaDescription}
                        onChange={(e) => setKtaDescription(e.target.value)}
                        placeholder="Contoh: Oli tumpah dekat pulverizer / APAR terhalang"
                        className="w-full p-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                      />
                    </div>

                    {/* Upload Bukti Screenshot Form KTA/TTA Terkirim */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[var(--text-main)] block">
                        Upload Tangkapan Layar (SS) Bukti Kirim Form *
                      </label>
                      {ktaImagePreview ? (
                        <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 bg-black/5 p-2">
                          <img src={ktaImagePreview} alt="Bukti KTA" className="w-full max-h-44 object-contain rounded-xl" />
                          <button
                            type="button"
                            onClick={() => {
                              setKtaImagePreview(null);
                              setKtaImageFile(null);
                            }}
                            className="absolute top-3 right-3 p-1.5 rounded-full bg-rose-500 text-white shadow-md hover:bg-rose-600 transition-colors"
                            title="Hapus foto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => ktaFileInputRef.current?.click()}
                          className="rounded-2xl border-2 border-dashed border-[var(--border-main)] hover:border-amber-500/50 p-4 text-center cursor-pointer transition-colors bg-[var(--input-bg)] hover:bg-amber-500/5"
                        >
                          <input
                            ref={ktaFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 8 * 1024 * 1024) {
                                toast.error('Ukuran file maksimal 8MB');
                                return;
                              }
                              setKtaImageFile(file);
                              const reader = new FileReader();
                              reader.onload = () => setKtaImagePreview(reader.result as string);
                              reader.readAsDataURL(file);
                            }}
                            className="hidden"
                          />
                          <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-1.5">
                            <Upload className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-[var(--text-main)] block">
                            Upload Screenshot Form KTA/TTA
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] mt-0.5 block">
                            Bisa juga tempel (Ctrl+V) langsung
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submittingKta || (!ktaImagePreview && !ktaImageFile)}
                      className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                      {submittingKta ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Mengirim Laporan...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Kirim Bukti Laporan KTA/TTA</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ════════ TAB 3: TEMUAN INSPEKSI (KHUSUS PIC SPV & SPECIALIST) ════════ */}
            {activeTab === 'findings' && isPic && (
              <div className="p-4 space-y-3.5 text-xs">
                {closingTicket ? (
                  <form onSubmit={handleCloseTicketSubmit} className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
                      <button
                        type="button"
                        onClick={() => {
                          setClosingTicket(null);
                          setClosingActionTaken('');
                          setClosingPhotoPreview(null);
                          setClosingPhotoFile(null);
                        }}
                        className="flex items-center gap-1 text-[11px] font-bold text-teal-600 hover:underline cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Kembali ke Daftar</span>
                      </button>
                      <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[var(--text-main)]">
                        {closingTicket.ticketId}
                      </span>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-500/5 border border-[var(--border-main)] space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)]">
                        <MapPin className="w-3 h-3 text-rose-500" />
                        <span className="truncate">{closingTicket.location || 'Area Kerja'}</span>
                      </div>
                      <p className="text-xs text-[var(--text-main)] font-semibold leading-relaxed">
                        {closingTicket.description || 'Tidak ada rincian deskripsi temuan.'}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[var(--text-main)] block">
                        Tindakan Perbaikan Fisik (Closing) *
                      </label>
                      <textarea
                        value={closingActionTaken}
                        onChange={(e) => setClosingActionTaken(e.target.value)}
                        placeholder="Contoh: Telah diperbaiki, dipasang pelindung baru dan dibersihkan..."
                        rows={3}
                        className="w-full p-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-[var(--text-main)] block">
                        Foto Bukti Selesai Diperbaiki *
                      </label>
                      {closingPhotoPreview ? (
                        <div className="relative rounded-2xl overflow-hidden border border-teal-500/40 bg-black/5 p-2">
                          <img src={closingPhotoPreview} alt="Bukti Closing" className="w-full max-h-40 object-contain rounded-xl" />
                          <button
                            type="button"
                            onClick={() => {
                              setClosingPhotoPreview(null);
                              setClosingPhotoFile(null);
                            }}
                            className="absolute top-3 right-3 p-1.5 rounded-full bg-rose-500 text-white shadow-md hover:bg-rose-600 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => closingFileInputRef.current?.click()}
                          className="rounded-2xl border-2 border-dashed border-[var(--border-main)] hover:border-teal-500/50 p-3 text-center cursor-pointer transition-colors bg-[var(--input-bg)] hover:bg-teal-500/5"
                        >
                          <input
                            ref={closingFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 8 * 1024 * 1024) {
                                toast.error('Ukuran file maksimal 8MB');
                                return;
                              }
                              setClosingPhotoFile(file);
                              const reader = new FileReader();
                              reader.onload = () => setClosingPhotoPreview(reader.result as string);
                              reader.readAsDataURL(file);
                            }}
                            className="hidden"
                          />
                          <div className="w-8 h-8 rounded-full bg-teal-500/10 text-teal-600 flex items-center justify-center mx-auto mb-1">
                            <Upload className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold text-[var(--text-main)] block">
                            Ambil Foto Bukti atau Unggah File
                          </span>
                          <span className="text-[9.5px] text-[var(--text-muted)] block">
                            Atau tempel (Ctrl+V) langsung
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submittingClose || !closingActionTaken.trim()}
                      className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                    >
                      {submittingClose ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Menutup Tiket...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Tutup Tiket Temuan (+60 EXP)</span>
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                        <span>Action Items Area ({openFindings.length})</span>
                      </span>
                      <button
                        type="button"
                        onClick={fetchFindings}
                        disabled={loadingFindings}
                        className="text-[10px] text-teal-600 font-bold hover:underline"
                      >
                        {loadingFindings ? 'Memuat...' : 'Segarkan'}
                      </button>
                    </div>

                    {loadingFindings ? (
                      <div className="py-8 flex flex-col items-center justify-center gap-2 text-center text-[var(--text-muted)]">
                        <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                        <span className="text-xs">Memeriksa temuan inspeksi...</span>
                      </div>
                    ) : openFindings.length === 0 ? (
                      <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-center space-y-1.5">
                        <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto" />
                        <h4 className="font-bold text-xs text-emerald-800 dark:text-emerald-200">
                          Semua Temuan Area Selesai!
                        </h4>
                        <p className="text-[10.5px] text-[var(--text-muted)]">
                          Tidak ada temuan terbuka yang memerlukan tindakan closing dari Anda saat ini.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-0.5">
                        {openFindings.map((item) => {
                          const isHigh = (item.priority || '').toUpperCase() === 'HIGH' || (item.risk || '').toLowerCase().includes('tinggi');
                          return (
                            <div 
                              key={item.ticketId || item.id}
                              className="p-3 rounded-2xl border bg-[var(--card-bg)] space-y-2 text-left shadow-2xs"
                              style={{ borderColor: isHigh ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-main)' }}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${
                                  isHigh 
                                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' 
                                    : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                                }`}>
                                  {isHigh ? '⚠️ Risiko Tinggi' : 'Risiko Sedang'}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-[var(--text-muted)]">
                                  {item.ticketId}
                                </span>
                              </div>

                              <div className="flex items-start gap-1 text-[10px] font-semibold text-[var(--text-muted)]">
                                <MapPin className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                                <span className="line-clamp-1">{item.location || item.area || '-'}</span>
                              </div>

                              <p className="text-[11px] font-medium text-[var(--text-main)] line-clamp-2 leading-snug">
                                {item.description || '-'}
                              </p>

                              <div className="pt-1.5 flex items-center justify-between gap-2 border-t border-[var(--border-main)]/60">
                                <span className="text-[9.5px] text-[var(--text-muted)]">
                                  Reward: <strong className="text-emerald-600">+60 EXP</strong>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setClosingTicket(item);
                                    setClosingActionTaken('');
                                    setClosingPhotoPreview(null);
                                    setClosingPhotoFile(null);
                                  }}
                                  className="px-2.5 py-1 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
                                >
                                  <span>Tuntaskan (Close)</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNav('ticket');
                      }}
                      className="w-full py-2 rounded-xl border border-[var(--border-main)] hover:bg-black/5 dark:hover:bg-white/5 text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>Buka Modul Rekapan Tiket Lengkap</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── HIGH-PRIORITY LIGHTBOX MODAL (PREVIEW BUKTI SCREENSHOT PENUH) ── */}
        {lightboxImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div 
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full bg-[var(--card-bg)] rounded-3xl border border-[var(--border-main)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Lightbox Header */}
              <div className="flex items-center justify-between p-3.5 border-b border-[var(--border-main)]">
                <div className="min-w-0 pr-2">
                  <h4 className="text-xs sm:text-sm font-black text-[var(--text-main)] truncate">
                    {lightboxImage.title}
                  </h4>
                  {lightboxImage.subtitle && (
                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                      {lightboxImage.subtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 rounded-xl hover:bg-black/5 text-[var(--text-muted)] cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Lightbox Image Viewport */}
              <div className="flex-1 bg-black/95 p-2 flex items-center justify-center overflow-auto min-h-[260px] max-h-[70vh]">
                <img
                  src={formatProofImageUrl(lightboxImage.url)}
                  alt="Screenshot Penuh"
                  onError={(e) => {
                    const raw = lightboxImage.url;
                    const driveMatch = raw?.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || raw?.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                    if (driveMatch && !e.currentTarget.src.includes('uc?export=view')) {
                      e.currentTarget.src = `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
                    }
                  }}
                  className="max-w-full max-h-[66vh] object-contain rounded-xl shadow-lg"
                />
              </div>

              {/* Lightbox Footer Actions */}
              <div className="p-3 bg-[var(--input-bg)] border-t border-[var(--border-main)] flex items-center justify-between gap-2 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => window.open(lightboxImage.url, '_blank')}
                  className="px-3 py-1.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-main)] font-bold text-[11px] text-[var(--text-main)] flex items-center gap-1.5 hover:bg-black/5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Gambar Asli</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = lightboxImage.url;
                    a.download = `Bukti_${Date.now()}.jpg`;
                    a.click();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-[11px] flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Gambar</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
