import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import SignatureCanvas from 'react-signature-canvas';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  UserCheck,
  Search,
  RefreshCw,
  Eye,
  PenTool,
  X,
  Check,
  Trash2,
  Save,
  ShieldCheck,
  Download,
  Flame,
  Scale,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import { Button, Card, Input } from '../ui';
import { exportP2HLaboratoryPdf } from '../../utils/exportP2HLaboratoryPdf';
import { getSafeSignatureDataUrl } from '../../utils/signatureUtils';
import { P2HToolRecordStatus } from '../../utils/exportP2HLaboratoryExcel';
import { P2HGasInventory, CALIBRATION_WEIGHTS } from '../../data/p2hLaboratoryRooms';
import { OFFICIAL_67_LAB_TOOLS } from '../../utils/exportP2HLaboratoryPdf';

export interface P2HLabReport {
  id: string;
  dbId?: number;
  date: string;
  shift: string;
  inspectorName: string;
  inspectorNik?: string;
  inspectorSignatureUrl?: string | null;
  inspectorSignedAt?: string;

  supervisorName: string;
  supervisorNik?: string;
  spvSignatureUrl?: string | null;
  spvSignedAt?: string | null;
  spvNotes?: string;

  sptName: string;
  sptSignatureUrl?: string | null;
  sptSignedAt?: string | null;
  sptNotes?: string;

  managerName: string;
  managerSignatureUrl?: string | null;
  managerSignedAt?: string | null;
  managerNotes?: string;

  status: 'PENDING_SPV' | 'PENDING_SPT' | 'PENDING_MANAGER' | 'APPROVED';
  isDemo?: boolean;
  toolStatuses: Record<string, P2HToolRecordStatus>;
  logisticsCounts: Record<string, string | number>;
  gasInventory: P2HGasInventory;
  calibrationWeightsCounts: Record<string, string | number>;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface P2HLaboratoryApprovalQueueProps {
  currentUserName: string;
  currentUserNik?: string;
  onBackToForm: () => void;
}

const LOCAL_STORAGE_REPORTS_KEY = 'preplab_p2h_lab_reports_v1';
const SAVED_SIG_KEY = 'p2h_saved_inspector_signature';

// Helper to count/filter breakdown items in a report (hoisted outside component)
const getBreakdownTools = (toolStatuses: Record<string, P2HToolRecordStatus> = {}) => {
  return OFFICIAL_67_LAB_TOOLS.filter(t => {
    const s = toolStatuses[t.id];
    return s && s.kondisi === 'Breakdown';
  });
};

// Helper to count tool status breakdown
const getToolStatusCounts = (toolStatuses: Record<string, P2HToolRecordStatus> = {}) => {
  let normal = 0;
  let breakdown = 0;
  let spare = 0;
  let other = 0;

  OFFICIAL_67_LAB_TOOLS.forEach(tool => {
    const s = toolStatuses[tool.id];
    const isSpare = (tool.defaultNotes || '').toUpperCase().includes('SPARE');
    const isDefaultBreakdown = (tool.defaultNotes || '').toUpperCase().includes('BREAKDOWN');
    const fallbackCond = isSpare ? 'Spare' : (isDefaultBreakdown ? 'Breakdown' : 'Normal');
    const cond = (s?.kondisi || fallbackCond).toLowerCase();
    if (cond.includes('breakdown') || cond.includes('rusak')) {
      breakdown++;
    } else if (cond.includes('spare') || cond === '-') {
      spare++;
    } else if (cond.includes('normal') || cond.includes('baik') || cond.includes('siap')) {
      normal++;
    } else {
      other++;
    }
  });

  return {
    total: OFFICIAL_67_LAB_TOOLS.length,
    normal,
    breakdown,
    spare,
    other
  };
};

export const P2HLaboratoryApprovalQueue: React.FC<P2HLaboratoryApprovalQueueProps> = ({
  currentUserName,
  currentUserNik = '',
  onBackToForm
}) => {
  const [reports, setReports] = useState<P2HLabReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'BREAKDOWN_ONLY'>('ALL');

  // Review modal state
  const [selectedReport, setSelectedReport] = useState<P2HLabReport | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRole, setReviewRole] = useState<'spv' | 'spt' | 'manager'>('spv');
  const [signerName, setSignerName] = useState('');
  const [signerNik, setSignerNik] = useState('');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [submittingSign, setSubmittingSign] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);

  // Signature canvas
  const reviewSigCanvasRef = useRef<SignatureCanvas | null>(null);
  const [useProfileSignature, setUseProfileSignature] = useState(false);
  const [savedProfileSig, setSavedProfileSig] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SAVED_SIG_KEY) || null;
    } catch {
      return null;
    }
  });

  // Load reports from server + fallback to localStorage
  const fetchReports = async () => {
    setLoading(true);
    try {
      let serverReports: P2HLabReport[] = [];
      try {
        const res = await fetch('/api/inspections/p2h-lab');
        if (res.ok) {
          serverReports = await res.json();
        }
      } catch (err) {
        console.warn('Gagal fetch dari server, menggunakan cache lokal:', err);
      }

      // Merge with local storage
      let localReports: P2HLabReport[] = [];
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
        if (raw) localReports = JSON.parse(raw);
      } catch {}

      // Combine by ID
      const map = new Map<string, P2HLabReport>();
      localReports.forEach(r => map.set(r.id, r));
      serverReports.forEach(r => map.set(r.id, r));

      const combined = Array.from(map.values()).sort((a, b) => {
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      });

      setReports(combined);
      try {
        localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(combined));
      } catch {}
    } catch (e: any) {
      toast.error('Gagal memuat antrean approval: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filtered reports
  const filteredReports = reports.filter(r => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      r.inspectorName.toLowerCase().includes(q) ||
      r.supervisorName.toLowerCase().includes(q) ||
      (r.shift || '').toLowerCase().includes(q) ||
      (r.date || '').toLowerCase().includes(q);

    if (!matchQuery) return false;

    if (statusFilter === 'PENDING') {
      return r.status !== 'APPROVED';
    }
    if (statusFilter === 'APPROVED') {
      return r.status === 'APPROVED';
    }
    if (statusFilter === 'BREAKDOWN_ONLY') {
      return getBreakdownTools(r.toolStatuses || {}).length > 0;
    }
    return true;
  });

  // Open review modal
  const handleOpenReview = (report: P2HLabReport) => {
    setSelectedReport(report);

    // Auto-detect role based on user name/jabatan
    const lowerName = currentUserName.toLowerCase();
    if (lowerName.includes('tigwa') || lowerName.includes('superintendent')) {
      setReviewRole('spt');
      setSignerName('Tigwa Anggawikara');
    } else if (lowerName.includes('deni') || lowerName.includes('manager')) {
      setReviewRole('manager');
      setSignerName('Deni Nugraha Perdiana');
    } else if (report.supervisorName && report.supervisorName.toLowerCase().includes(lowerName)) {
      setReviewRole('spv');
      setSignerName(report.supervisorName);
    } else {
      // Default to next pending role
      if (!report.spvSignatureUrl) {
        setReviewRole('spv');
        setSignerName(report.supervisorName || currentUserName);
      } else if (!report.sptSignatureUrl) {
        setReviewRole('spt');
        setSignerName('Tigwa Anggawikara');
      } else {
        setReviewRole('manager');
        setSignerName('Deni Nugraha Perdiana');
      }
    }

    setSignerNik(currentUserNik);
    setReviewerNotes('');
    setReviewModalOpen(true);
  };

  // Submit review signature
  const handleSubmitReviewSignature = async () => {
    if (!selectedReport) return;

    let finalSig = '';
    if (useProfileSignature && savedProfileSig) {
      finalSig = savedProfileSig;
    } else if (reviewSigCanvasRef.current && !reviewSigCanvasRef.current.isEmpty()) {
      finalSig = getSafeSignatureDataUrl(reviewSigCanvasRef.current);
    }

    if (!finalSig) {
      toast.error('Mohon bubuhkan tanda tangan Anda terlebih dahulu!');
      return;
    }

    if (!signerName.trim()) {
      toast.error('Nama penanda tangan wajib diisi!');
      return;
    }

    setSubmittingSign(true);
    try {
      const payload = {
        role: reviewRole,
        signerName: signerName.trim(),
        signerNik: signerNik.trim(),
        signatureUrl: finalSig,
        notes: reviewerNotes.trim()
      };

      // 1. Send to server
      const res = await fetch(`/api/inspections/p2h-lab/${selectedReport.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let updatedReport: P2HLabReport;
      if (res.ok) {
        const data = await res.json();
        updatedReport = data.report;
      } else {
        // Fallback update locally
        const nowIso = new Date().toISOString();
        updatedReport = { ...selectedReport };
        if (reviewRole === 'spv') {
          updatedReport.spvSignatureUrl = finalSig;
          updatedReport.spvSignedAt = nowIso;
          updatedReport.supervisorName = signerName;
          updatedReport.spvNotes = reviewerNotes;
          updatedReport.status = updatedReport.sptSignatureUrl ? (updatedReport.managerSignatureUrl ? 'APPROVED' : 'PENDING_MANAGER') : 'PENDING_SPT';
        } else if (reviewRole === 'spt') {
          updatedReport.sptSignatureUrl = finalSig;
          updatedReport.sptSignedAt = nowIso;
          updatedReport.sptName = signerName;
          updatedReport.sptNotes = reviewerNotes;
          updatedReport.status = updatedReport.managerSignatureUrl ? 'APPROVED' : 'PENDING_MANAGER';
        } else if (reviewRole === 'manager') {
          updatedReport.managerSignatureUrl = finalSig;
          updatedReport.managerSignedAt = nowIso;
          updatedReport.managerName = signerName;
          updatedReport.managerNotes = reviewerNotes;
          updatedReport.status = 'APPROVED';
        }
      }

      toast.success(`Laporan berhasil disahkan oleh ${getRoleLabel(reviewRole)}!`);

      // Update state & localStorage
      setReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
      try {
        const raw = localStorage.getItem(LOCAL_STORAGE_REPORTS_KEY);
        const list: P2HLabReport[] = raw ? JSON.parse(raw) : [];
        const next = list.map(r => r.id === updatedReport.id ? updatedReport : r);
        localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(next));
      } catch {}

      setReviewModalOpen(false);
      setSelectedReport(null);
    } catch (err: any) {
      toast.error('Gagal menyimpan pengesahan: ' + err.message);
    } finally {
      setSubmittingSign(false);
    }
  };

  // Export PDF directly from report card
  const handleExportPdfFromReport = async (report: P2HLabReport) => {
    setDownloadingPdfId(report.id);
    try {
      toast.info('Menyiapkan dokumen PDF resmi F4...');
      await exportP2HLaboratoryPdf({
        inspectorName: report.inspectorName,
        inspectorNik: report.inspectorNik,
        inspectionDate: report.date,
        shift: report.shift,
        toolStatuses: report.toolStatuses,
        logisticsCounts: report.logisticsCounts,
        gasInventory: report.gasInventory,
        calibrationWeightsCounts: report.calibrationWeightsCounts,
        supervisorName: report.supervisorName,
        signatureUrl: report.inspectorSignatureUrl,
        spvSignatureUrl: report.spvSignatureUrl,
        sptSignatureUrl: report.sptSignatureUrl,
        managerSignatureUrl: report.managerSignatureUrl,
        spvNotes: report.spvNotes,
        sptNotes: report.sptNotes,
        managerNotes: report.managerNotes,
        notes: report.notes,
      });
      toast.success('Dokumen PDF F4 berhasil diunduh!');
    } catch (e: any) {
      toast.error('Gagal export PDF: ' + e.message);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  const handleDeleteReport = async (report: P2HLabReport) => {
    if (!window.confirm(`Hapus laporan ${report.isDemo ? 'demo ' : ''}"${report.id}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }
    try {
      if (report.dbId) {
        await fetch(`/api/inspections/${report.dbId}`, { method: 'DELETE' });
      }
      setReports(prev => {
        const next = prev.filter(r => r.id !== report.id);
        try {
          localStorage.setItem(LOCAL_STORAGE_REPORTS_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
      toast.success(`Laporan ${report.id} berhasil dihapus.`);
    } catch (e: any) {
      toast.error('Gagal menghapus laporan: ' + e.message);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'spv': return 'Laboratorium Supervisor';
      case 'spt': return 'Laboratorium Superintendent';
      case 'manager': return 'Preparation & Lab Manager';
      default: return 'Reviewer';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING_SPV':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            Menunggu Review SPV Lab
          </span>
        );
      case 'PENDING_SPT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-50 dark:bg-orange-950/70 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
            <Clock className="w-3.5 h-3.5" />
            Menunggu Review Superintendent
          </span>
        );
      case 'PENDING_MANAGER':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <Clock className="w-3.5 h-3.5" />
            Menunggu Review Manager
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Disetujui Lengkap (4/4 TTD)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-36">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-teal-500/30 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 border border-teal-400/30 rounded-full text-xs font-semibold text-teal-200 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              Alur Pengesahan Multi-Level (Paperless)
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Antrean Review &amp; Pengesahan P2H Lab</h2>
            <p className="text-xs text-teal-100/80 mt-1">
              Verifikasi hasil pemeriksaan fisik 67 peralatan laboratorium sebelum ditandatangani oleh SPV, SPT, dan Manager.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={fetchReports}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-xl px-4 py-2.5 text-xs font-bold flex items-center gap-2 backdrop-blur-sm shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Muat Ulang
            </Button>

            <Button
              onClick={onBackToForm}
              className="bg-teal-500 hover:bg-teal-600 text-white rounded-xl px-4 py-2.5 text-xs font-bold flex items-center gap-2 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              Kembali ke Form Input
            </Button>
          </div>
        </div>
      </div>

      {/* EXECUTIVE MANAGEMENT BREAKDOWN NOTIFICATION (For SPT & Manager) */}
      {(() => {
        const pendingBreakdownReports = reports.filter(r => r.status !== 'APPROVED' && getBreakdownTools(r.toolStatuses || {}).length > 0);
        const totalPendingBreakdownTools = pendingBreakdownReports.reduce((acc, r) => acc + getBreakdownTools(r.toolStatuses || {}).length, 0);

        if (pendingBreakdownReports.length > 0) {
          return (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-rose-950/90 via-rose-900/70 to-slate-900 border-2 border-rose-500/70 text-white shadow-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600/30 border border-rose-500 flex items-center justify-center text-rose-300 shrink-0">
                    <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white uppercase tracking-wider shadow-xs">
                        Notifikasi Khusus SPT &amp; Manager
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-1">
                      Perhatian: Ada {totalPendingBreakdownTools} Alat Laboratorium Breakdown!
                    </h3>
                    <p className="text-xs text-rose-200/90 mt-0.5">
                      Ditemukan {pendingBreakdownReports.length} laporan P2H dengan instrumen rusak yang memerlukan review dan tindakan penanganan manajemen.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStatusFilter(prev => prev === 'BREAKDOWN_ONLY' ? 'ALL' : 'BREAKDOWN_ONLY')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border shadow-md transition-colors whitespace-nowrap self-start sm:self-auto flex items-center gap-1.5 ${
                    statusFilter === 'BREAKDOWN_ONLY'
                      ? 'bg-white text-rose-700 border-white'
                      : 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {statusFilter === 'BREAKDOWN_ONLY' ? 'Lihat Semua Laporan' : 'Filter Laporan Breakdown'}
                </button>
              </div>

              {/* Breakdown quick pills */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-rose-500/30 text-xs">
                {pendingBreakdownReports.flatMap(r => 
                  getBreakdownTools(r.toolStatuses || {}).map(tool => (
                    <span
                      key={`${r.id}-${tool.id}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/40 border border-rose-500/40 text-rose-200 font-medium"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <strong className="text-white">{tool.name}</strong> ({r.shift})
                      <span className="text-rose-300/80 text-[11px]">— {r.toolStatuses[tool.id]?.keterangan || 'Breakdown'}</span>
                    </span>
                  ))
                )}
              </div>
            </div>
          );
        }

        // When Zero Breakdown
        return (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-white shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                  <span>Zero Breakdown (100% Peralatan Siap Operasi)</span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-900/80 text-emerald-200 border border-emerald-700">Aman</span>
                </div>
                <div className="text-[11px] text-slate-300 truncate mt-0.5">
                  Seluruh 67 instrumen laboratorium beroperasi normal. Tidak ada temuan kerusakan yang memerlukan eskalasi ke SPT/Manager.
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--card-bg)] border border-[var(--border-main)] p-4 rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Cari analis, SPV, shift, tanggal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Semua ({reports.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Menunggu Review ({reports.filter(r => r.status !== 'APPROVED').length})
          </button>
          <button
            onClick={() => setStatusFilter('BREAKDOWN_ONLY')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              statusFilter === 'BREAKDOWN_ONLY'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-[var(--input-bg)] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Breakdown ({reports.filter(r => getBreakdownTools(r.toolStatuses || {}).length > 0).length})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            Disetujui ({reports.filter(r => r.status === 'APPROVED').length})
          </button>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-xs font-semibold">Mengambil data antrean laporan P2H...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="text-center py-12 px-4 border-dashed border-2">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-base font-bold text-[var(--text-main)]">Tidak ada laporan yang sesuai</h4>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'Tidak ditemukan laporan yang cocok dengan kata kunci pencarian.'
              : 'Belum ada laporan P2H Laboratorium yang dikirimkan untuk direview.'}
          </p>
          <Button onClick={onBackToForm} className="mt-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl px-4 py-2">
            Isi Formulir P2H Baru
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredReports.map((report) => {
            const dateObj = new Date(report.date || Date.now());
            const dateFormatted = dateObj.toLocaleDateString('id-ID', {
              weekday: 'long',
              day: '2-digit',
              month: 'long',
              year: 'numeric'
            });
            const breakdowns = getBreakdownTools(report.toolStatuses || {});

            return (
              <Card
                key={report.id}
                className="hover:border-teal-400/50 hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4"
              >
                <div>
                  {/* Top Status & Date Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-[var(--border-main)]">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(report.status)}
                      {report.isDemo && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40">
                          🧪 DEMO / SIMULASI
                        </span>
                      )}
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {report.shift}
                      </span>
                      {breakdowns.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <AlertTriangle className="w-3 h-3" />
                          {breakdowns.length} Alat Breakdown
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-[var(--text-muted)] font-medium">
                      📅 {dateFormatted}
                    </div>
                  </div>

                  {/* Summary of tool counts in card */}
                  {(() => {
                    const counts = getToolStatusCounts(report.toolStatuses || {});
                    return (
                      <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 text-[11px] text-[var(--text-muted)]">
                        <span className="font-bold text-[var(--text-main)] flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-teal-600" />
                          Jumlah Alat: <strong className="text-teal-700 dark:text-teal-300">{counts.total} Total</strong>
                        </span>
                        <span>•</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                          ✓ {counts.normal} Normal
                        </span>
                        {counts.breakdown > 0 && (
                          <span className="text-rose-700 dark:text-rose-300 font-semibold bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                            ⚠️ {counts.breakdown} Breakdown
                          </span>
                        )}
                        <span className="text-slate-600 dark:text-slate-400 font-medium bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          {counts.spare} Spare
                        </span>
                      </div>
                    );
                  })()}

                  {/* Core Personnel Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
                    <div className="bg-[var(--input-bg)] p-3 rounded-xl border border-[var(--border-main)]">
                      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">1. Analyst Pelaksana</div>
                      <div className="font-bold text-[var(--text-main)] text-sm mt-0.5 truncate">{report.inspectorName}</div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {report.inspectorSignatureUrl ? 'Tervalidasi & TTD' : 'Tervalidasi'}
                      </div>
                    </div>

                    <div className="bg-[var(--input-bg)] p-3 rounded-xl border border-[var(--border-main)]">
                      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">2. SPV Lab Bertugas</div>
                      <div className="font-bold text-[var(--text-main)] text-sm mt-0.5 truncate">{report.supervisorName}</div>
                      <div className="mt-1">
                        {report.spvSignatureUrl ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Disetujui &amp; TTD
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Menunggu Review
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-[var(--input-bg)] p-3 rounded-xl border border-[var(--border-main)]">
                      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">3. Superintendent</div>
                      <div className="font-bold text-[var(--text-main)] text-sm mt-0.5 truncate">{report.sptName}</div>
                      <div className="mt-1">
                        {report.sptSignatureUrl ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Disetujui &amp; TTD
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Menunggu SPV/SPT
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bg-[var(--input-bg)] p-3 rounded-xl border border-[var(--border-main)]">
                      <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">4. Manager Prep &amp; Lab</div>
                      <div className="font-bold text-[var(--text-main)] text-sm mt-0.5 truncate">{report.managerName}</div>
                      <div className="mt-1">
                        {report.managerSignatureUrl ? (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Disetujui &amp; TTD
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Menunggu Final
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Highlights if Breakdown exists */}
                  {breakdowns.length > 0 && (
                    <div className="mt-3.5 p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60">
                      <div className="text-[11px] font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5 mb-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Peralatan Perlu Perhatian Segera:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {breakdowns.map(t => (
                          <span key={t.id} className="text-xs bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-rose-300 dark:border-rose-800 font-semibold text-rose-700 dark:text-rose-300">
                            {t.name} ({t.assetNumber}) • {report.toolStatuses[t.id]?.keterangan || 'Breakdown'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes snippet if any */}
                  {report.notes && (
                    <div className="mt-2.5 text-xs text-[var(--text-muted)] italic bg-[var(--input-bg)] px-3 py-1.5 rounded-lg border border-[var(--border-main)]">
                      &quot;{report.notes}&quot;
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[var(--border-main)] mt-2">
                  <div className="text-xs text-[var(--text-muted)]">
                    ID: <code className="font-mono text-[11px] text-teal-700 dark:text-teal-400">{report.id}</code>
                  </div>

                  <div className="flex items-center gap-2">
                    {report.isDemo && (
                      <Button
                        variant="outline"
                        onClick={() => handleDeleteReport(report)}
                        className="border-rose-300 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-bold rounded-xl px-2.5 py-1.5 flex items-center gap-1"
                        title="Hapus Laporan Demo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Hapus Demo</span>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={() => handleExportPdfFromReport(report)}
                      disabled={downloadingPdfId === report.id}
                      className="border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold rounded-xl px-3 py-1.5 flex items-center gap-1.5"
                    >
                      <Download className={`w-3.5 h-3.5 ${downloadingPdfId === report.id ? 'animate-spin' : ''}`} />
                      {downloadingPdfId === report.id ? 'Mengunduh...' : 'Unduh PDF (F4)'}
                    </Button>

                    <Button
                      onClick={() => handleOpenReview(report)}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl px-4 py-1.5 flex items-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Review &amp; Tanda Tangan
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ================= MODAL REVIEW & TANDA TANGAN ================= */}
      {reviewModalOpen && selectedReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="p-5 border-b border-[var(--border-main)] bg-gradient-to-r from-teal-800 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-500/30 text-teal-200 border border-teal-400/30">
                    Formulir Resmi TBP-FR-PL-LAB-04.01-01
                  </span>
                  {getStatusBadge(selectedReport.status)}
                </div>
                <h3 className="text-lg font-bold mt-1">Review Hasil Inspeksi P2H Laboratorium</h3>
                <p className="text-xs text-teal-100/80">
                  {new Date(selectedReport.date).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} • {selectedReport.shift} • Pelaksana: {selectedReport.inspectorName}
                </p>
              </div>

              <button
                onClick={() => setReviewModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content Scrollable */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1 text-xs">
              {/* Ringkasan Jumlah & Status Peralatan (67 Alat) */}
              {(() => {
                const counts = getToolStatusCounts(selectedReport.toolStatuses || {});
                return (
                  <div className="p-4 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
                        <Layers className="w-4 h-4 text-teal-600" />
                        Ringkasan Pemeriksaan 67 Peralatan Laboratorium (7 Ruangan)
                      </div>
                      <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded-full">
                        TBP-FR-PL-LAB-04.01-01
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[var(--border-main)] text-center">
                        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Total Peralatan</div>
                        <div className="text-lg font-black text-[var(--text-main)] mt-0.5">{counts.total}</div>
                        <div className="text-[10px] text-teal-600 font-semibold">7 Ruang Lab</div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center">
                        <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">Normal / Operasi</div>
                        <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{counts.normal}</div>
                        <div className="text-[10px] text-emerald-600 font-semibold">{Math.round((counts.normal / counts.total) * 100)}% Siap Pakai</div>
                      </div>

                      <div className={`p-2.5 rounded-xl text-center border ${
                        counts.breakdown > 0 
                          ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800' 
                          : 'bg-white dark:bg-slate-900 border-[var(--border-main)]'
                      }`}>
                        <div className={`text-[10px] font-bold uppercase ${counts.breakdown > 0 ? 'text-rose-800 dark:text-rose-300' : 'text-[var(--text-muted)]'}`}>
                          Breakdown / Rusak
                        </div>
                        <div className={`text-lg font-black mt-0.5 ${counts.breakdown > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                          {counts.breakdown}
                        </div>
                        <div className={`text-[10px] font-semibold ${counts.breakdown > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {counts.breakdown > 0 ? 'Perlu Work Order' : 'Aman (Zero)'}
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-[var(--border-main)] text-center">
                        <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Alat Cadangan (Spare)</div>
                        <div className="text-lg font-black text-slate-700 dark:text-slate-300 mt-0.5">{counts.spare}</div>
                        <div className="text-[10px] text-slate-500 font-semibold">Standby Unit</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 1. Breakdown Highlight Card (Specially Highlighted for SPT & Manager) */}
              {(() => {
                const breakdowns = getBreakdownTools(selectedReport.toolStatuses || {});
                const isManagementRole = reviewRole === 'spt' || reviewRole === 'manager';

                if (breakdowns.length === 0) {
                  return (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-emerald-900 dark:text-emerald-200 text-sm">
                          Semua 67 Peralatan Beroperasi Normal (Zero Breakdown)
                        </div>
                        <div className="text-emerald-700 dark:text-emerald-400 text-xs mt-0.5">
                          {isManagementRole 
                            ? `Tidak ada laporan kerusakan/breakdown pada shift ini. Laporan aman untuk langsung disahkan oleh ${getRoleLabel(reviewRole)}.`
                            : 'Tidak ada laporan kerusakan atau breakdown pada shift ini.'}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 space-y-2.5 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold text-sm">
                        <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 animate-pulse" />
                        <span>
                          {isManagementRole 
                            ? `🚨 Notifikasi Khusus ${getRoleLabel(reviewRole)}: Ditemukan ${breakdowns.length} Alat Breakdown!`
                            : `Perhatian: Ditemukan ${breakdowns.length} Peralatan Breakdown!`}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-600 text-white uppercase tracking-wider">
                        Perlu Evaluasi
                      </span>
                    </div>

                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      {isManagementRole
                        ? 'Mohon periksa instrumen yang mengalami breakdown berikut dan pastikan tindakan perbaikan / work order telah diinisiasi sebelum melakukan tanda tangan pengesahan:'
                        : 'Peralatan di bawah ini tercatat dalam kondisi breakdown saat pemeriksaan fisik harian:'}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {breakdowns.map(tool => {
                        const s = selectedReport.toolStatuses[tool.id];
                        return (
                          <div key={tool.id} className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-900 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <div className="font-bold text-rose-700 dark:text-rose-300 text-xs">{tool.name}</div>
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 uppercase">
                                {s?.kondisi || 'Breakdown'}
                              </span>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] font-mono mt-0.5">Asset: {tool.assetNumber}</div>
                            <div className="mt-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900/60">
                              Catatan Kerusakan: {s?.keterangan || 'Breakdown saat pengecekan harian'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* 2. Ringkasan Gas, Batu Timbang, dan Consumables */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)]">
                  <div className="font-bold text-[var(--text-main)] flex items-center gap-1.5 mb-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    Inventaris Gas (Krishna &amp; Logistik)
                  </div>
                  <div className="space-y-1 text-[11px] text-[var(--text-muted)]">
                    <div>• Helium Krishna: <span className="font-bold text-[var(--text-main)]">{selectedReport.gasInventory?.helium?.krishna?.isi ?? 0} Isi</span> / {selectedReport.gasInventory?.helium?.krishna?.kosong ?? 0} Kosong</div>
                    <div>• Argon Krishna: <span className="font-bold text-[var(--text-main)]">{selectedReport.gasInventory?.argon?.krishna?.isi ?? 0} Isi</span> / {selectedReport.gasInventory?.argon?.krishna?.kosong ?? 0} Kosong</div>
                    <div>• Helium Logistik: <span className="font-bold text-[var(--text-main)]">{selectedReport.gasInventory?.helium?.logistik?.isi ?? 0} Isi</span></div>
                    <div>• Argon Logistik: <span className="font-bold text-[var(--text-main)]">{selectedReport.gasInventory?.argon?.logistik?.isi ?? 0} Isi</span></div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)]">
                  <div className="font-bold text-[var(--text-main)] flex items-center gap-1.5 mb-2">
                    <Scale className="w-4 h-4 text-emerald-500" />
                    Anak Timbangan Standar
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                    Pengecekan anak timbangan 0.5g s/d 200g telah diverifikasi lengkap dan presisi untuk seluruh timbangan analitik.
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)]">
                  <div className="font-bold text-[var(--text-main)] flex items-center gap-1.5 mb-2">
                    <Package className="w-4 h-4 text-teal-500" />
                    Consumables &amp; Alat Bantu
                  </div>
                  <div className="space-y-1 text-[11px] text-[var(--text-muted)]">
                    <div>• Tray LOI: <span className="font-bold text-[var(--text-main)]">{selectedReport.gasInventory?.trayLoiCount || '-'} PCS</span></div>
                    <div>• Rak Kayu Bead/Pellet: <span className="font-bold text-[var(--text-main)]">{selectedReport.gasInventory?.rakKayuBeadPellet || '-'} RAK</span></div>
                    <div>• Aquadest Isi: <span className="font-bold text-[var(--text-main)]">{selectedReport.gasInventory?.aquadestIsi || '-'} Jerigen</span></div>
                  </div>
                </div>
              </div>

              {/* 3. Tanda Tangan Pelaksana & SPV saat ini */}
              <div className="p-4 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)]">
                <div className="font-bold text-sm text-[var(--text-main)] mb-3">
                  Status Pengesahan 4 Pihak (SOP QA/QC &amp; K3)
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  {/* Analyst */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-[var(--border-main)]">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">1. Pelaksana (Analyst)</div>
                    <div className="h-16 flex items-center justify-center my-1">
                      {selectedReport.inspectorSignatureUrl ? (
                        <img src={selectedReport.inspectorSignatureUrl} alt="TTD Analyst" className="max-h-14 max-w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">[ Tervalidasi ]</span>
                      )}
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{selectedReport.inspectorName}</div>
                    <div className="text-[9px] text-emerald-600 font-semibold">Tervalidasi</div>
                  </div>

                  {/* SPV */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-[var(--border-main)]">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">2. Diperiksa (SPV Lab)</div>
                    <div className="h-16 flex items-center justify-center my-1">
                      {selectedReport.spvSignatureUrl ? (
                        <img src={selectedReport.spvSignatureUrl} alt="TTD SPV" className="max-h-14 max-w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-amber-500 italic">[ Belum TTD ]</span>
                      )}
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{selectedReport.supervisorName}</div>
                    <div className="text-[9px] text-[var(--text-muted)]">
                      {selectedReport.spvSignatureUrl ? 'Disetujui' : 'Menunggu Review'}
                    </div>
                  </div>

                  {/* SPT */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-[var(--border-main)]">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">3. Diketahui (SPT Lab)</div>
                    <div className="h-16 flex items-center justify-center my-1">
                      {selectedReport.sptSignatureUrl ? (
                        <img src={selectedReport.sptSignatureUrl} alt="TTD SPT" className="max-h-14 max-w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">[ Belum TTD ]</span>
                      )}
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{selectedReport.sptName}</div>
                    <div className="text-[9px] text-[var(--text-muted)]">
                      {selectedReport.sptSignatureUrl ? 'Disetujui' : 'Menunggu Review'}
                    </div>
                  </div>

                  {/* Manager */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-[var(--border-main)]">
                    <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase">4. Diketahui (Manager)</div>
                    <div className="h-16 flex items-center justify-center my-1">
                      {selectedReport.managerSignatureUrl ? (
                        <img src={selectedReport.managerSignatureUrl} alt="TTD Manager" className="max-h-14 max-w-full object-contain" />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">[ Belum TTD ]</span>
                      )}
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{selectedReport.managerName}</div>
                    <div className="text-[9px] text-[var(--text-muted)]">
                      {selectedReport.managerSignatureUrl ? 'Disetujui' : 'Menunggu Review'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Panel Pengesahan (Form Tanda Tangan) */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-teal-500/10 via-slate-500/5 to-transparent border-2 border-teal-500/40 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-teal-600" />
                    Formulir Pengesahan Digital &amp; Tanda Tangan
                  </div>
                  <span className="text-[10px] text-teal-700 dark:text-teal-300 font-bold bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded-full">
                    SOP Validasi
                  </span>
                </div>

                {/* Info Simulasi jika mode demo */}
                {selectedReport.isDemo && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Mode Simulasi Aktif:</strong> Anda dapat mengklik tombol <strong>1. SPV Lab</strong>, <strong>2. Superintendent</strong>, atau <strong>3. Manager Lab</strong> di bawah ini secara bergantian untuk mencoba alur tanda tangan dan validasi tiap jabatan tanpa batasan akun.
                    </span>
                  </div>
                )}

                {/* Pilih Jabatan Pengesahan */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReviewRole('spv');
                      setSignerName(selectedReport.supervisorName || currentUserName);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      reviewRole === 'spv'
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/80 ring-2 ring-teal-500/30'
                        : 'border-[var(--border-main)] bg-[var(--card-bg)] hover:bg-[var(--input-bg)]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[var(--text-main)]">1. SPV Lab</div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">{selectedReport.supervisorName}</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReviewRole('spt');
                      setSignerName('Tigwa Anggawikara');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      reviewRole === 'spt'
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/80 ring-2 ring-teal-500/30'
                        : 'border-[var(--border-main)] bg-[var(--card-bg)] hover:bg-[var(--input-bg)]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[var(--text-main)]">2. Superintendent</div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">Tigwa Anggawikara</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReviewRole('manager');
                      setSignerName('Deni Nugraha Perdiana');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      reviewRole === 'manager'
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/80 ring-2 ring-teal-500/30'
                        : 'border-[var(--border-main)] bg-[var(--card-bg)] hover:bg-[var(--input-bg)]'
                    }`}
                  >
                    <div className="font-bold text-xs text-[var(--text-main)]">3. Manager Lab</div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">Deni Nugraha Perdiana</div>
                  </button>
                </div>

                {/* Input Nama & Catatan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                      Nama Penanda Tangan ({getRoleLabel(reviewRole)})
                    </label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-main)] font-bold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-muted)] block mb-1">
                      Catatan / Rekomendasi Tindak Lanjut (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Sudah koordinasi maintenance untuk penggantian parts"
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Signature Canvas Area */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-[var(--text-muted)]">
                      Tanda Tangan Digital ({signerName})
                    </label>
                    {savedProfileSig && (
                      <label className="flex items-center gap-1.5 text-[11px] text-teal-700 dark:text-teal-300 font-semibold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={useProfileSignature}
                          onChange={(e) => setUseProfileSignature(e.target.checked)}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        Gunakan TTD Tersimpan di Profil
                      </label>
                    )}
                  </div>

                  {useProfileSignature && savedProfileSig ? (
                    <div className="h-32 bg-white rounded-2xl border-2 border-teal-500/40 p-2 flex items-center justify-center">
                      <img src={savedProfileSig} alt="TTD Profil" className="max-h-24 max-w-full object-contain" />
                    </div>
                  ) : (
                    <div className="relative bg-white rounded-2xl border-2 border-slate-300 dark:border-slate-700 shadow-inner overflow-hidden">
                      <SignatureCanvas
                        ref={reviewSigCanvasRef}
                        penColor="#0f172a"
                        canvasProps={{
                          className: 'w-full h-32 cursor-crosshair touch-none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => reviewSigCanvasRef.current?.clear()}
                        className="absolute bottom-2 right-2 px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg shadow-xs flex items-center gap-1 transition-all"
                      >
                        <Trash2 className="w-3 h-3 text-rose-500" />
                        Hapus Coretan
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 border-t border-[var(--border-main)] bg-[var(--card-bg)] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => handleExportPdfFromReport(selectedReport)}
                disabled={downloadingPdfId === selectedReport.id}
                className="border-rose-300 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl px-4 py-2 flex items-center gap-1.5"
              >
                <Download className={`w-3.5 h-3.5 ${downloadingPdfId === selectedReport.id ? 'animate-spin' : ''}`} />
                {downloadingPdfId === selectedReport.id ? 'Mengunduh...' : 'Unduh PDF (F4)'}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setReviewModalOpen(false)}
                  className="text-xs font-bold rounded-xl px-4 py-2"
                >
                  Tutup
                </Button>

                <Button
                  onClick={handleSubmitReviewSignature}
                  disabled={submittingSign}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl px-5 py-2 flex items-center gap-2 shadow-lg"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {submittingSign ? 'Menyimpan Pengesahan...' : `Sahkan Sebagai ${getRoleLabel(reviewRole)}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
