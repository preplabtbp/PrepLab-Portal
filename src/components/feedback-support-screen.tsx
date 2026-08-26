import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bug, Lightbulb, MessageSquarePlus, ArrowLeft, Send, CheckCircle2, 
  Clock, AlertCircle, Sparkles, Filter, Search, Trash2, 
  MessageSquare, ShieldCheck, HelpCircle, Layers, Image as ImageIcon,
  ExternalLink, ChevronRight, RefreshCw, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from './PageHeader';
import { uploadPhotoToDrive } from '../sheets-api';

interface FeedbackItem {
  id: number;
  type: 'bug' | 'suggestion' | 'improvement' | 'question';
  category?: string;
  module?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  screenshotUrl?: string | null;
  authorNik: string;
  authorName: string;
  authorRole?: string;
  authorSection?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';
  developerNotes?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
}

const MODULE_OPTIONS = [
  'Umum / Portal',
  'Roster & Cuti',
  'Inspeksi Harian (P2H)',
  'P5M Schedule',
  'Work Orders & Downtime',
  'Sistem APD',
  'Buletin & Pengumuman',
  'Quotes Motivasi',
  'Database Karyawan',
  'Cloud & Google Drive',
  'Quiz & Edukasi',
  'Induksi Internal',
  'Lainnya'
];

export function FeedbackSupportScreen({
  inspectorNik,
  inspectorName,
  onBack
}: {
  inspectorNik: string;
  inspectorName: string;
  onBack?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'create' | 'my-reports' | 'dev-board'>('create');
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [type, setType] = useState<'bug' | 'suggestion' | 'improvement' | 'question'>('bug');
  const [description, setDescription] = useState('');
  const [screenshotBase64, setScreenshotBase64] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Developer list & access
  const [developerList, setDeveloperList] = useState<string[]>([]);
  useEffect(() => {
    fetch('/api/developers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDeveloperList(data.map((d: any) => d.nik));
      })
      .catch(() => {});
  }, []);

  const isDeveloper = inspectorNik === '02D25000055' || inspectorNik === '02D24000043' || inspectorNik === 'preplabadmin' || developerList.includes(inspectorNik);

  // User Profile
  const profile = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
    } catch (e) {
      return {};
    }
  }, []);
  const authorRole = profile.jabatan || 'Staff';
  const authorSection = profile.section || profile.department || 'Prep & Lab';

  // Dev Board Filters & Actions
  const [devStatusFilter, setDevStatusFilter] = useState<string>('all');
  const [devTypeFilter, setDevTypeFilter] = useState<string>('all');
  const [devSearch, setDevSearch] = useState('');
  const [selectedReportForNotes, setSelectedReportForNotes] = useState<FeedbackItem | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Load feedbacks
  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const url = isDeveloper ? '/api/feedbacks?all=true' : `/api/feedbacks?authorNik=${inspectorNik}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        setFeedbacks(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeedbacks();
  }, [isDeveloper]);

  // Handle Image Upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Feedback Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Deskripsi kendala atau masukan wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      let finalScreenshotUrl = null;
      if (screenshotBase64) {
        try {
          toast.loading('Mengunggah screenshot...', { id: 'upload-ss' });
          finalScreenshotUrl = await uploadPhotoToDrive(
            screenshotBase64,
            'image/jpeg',
            `Bug_Report_${inspectorNik}_${Date.now()}.jpg`,
            'Bug Reports & Feedback'
          );
          toast.dismiss('upload-ss');
        } catch (uploadErr) {
          console.warn('Drive upload fallback:', uploadErr);
          finalScreenshotUrl = screenshotBase64;
        }
      }

      // Auto title from first line of description
      const firstLine = description.trim().split('\n')[0];
      const autoTitle = firstLine.length > 70 ? firstLine.slice(0, 70) + '...' : firstLine;

      const payload = {
        type,
        category: type === 'bug' ? 'Laporan Bug' : type === 'suggestion' ? 'Saran Fitur' : type === 'improvement' ? 'Peningkatan' : 'Pertanyaan',
        module: 'Umum / Portal',
        priority: 'medium',
        title: autoTitle,
        description: description.trim(),
        screenshotUrl: finalScreenshotUrl,
        authorNik: inspectorNik,
        authorName: inspectorName || profile.name || 'Personil PrepLab',
        authorRole,
        authorSection
      };

      const res = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.status !== 'success') {
        throw new Error(json.message || 'Gagal mengirim laporan');
      }

      toast.success('Laporan berhasil dikirim ke tim Developer!');
      setSubmitSuccess(true);
      setDescription('');
      setScreenshotBase64(null);
      loadFeedbacks();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  // Developer Update Status
  const handleUpdateStatus = async (id: number, newStatus: string, notes?: string) => {
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/feedbacks/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          developerNotes: notes !== undefined ? notes : undefined
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success(`Status diperbarui menjadi: ${newStatus}`);
        setSelectedReportForNotes(null);
        setNotesInput('');
        loadFeedbacks();
      } else {
        throw new Error(json.message);
      }
    } catch (e: any) {
      toast.error(e.message || 'Gagal memperbarui status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Delete Feedback
  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus laporan ini?')) return;
    try {
      const res = await fetch(`/api/feedbacks/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Laporan berhasil dihapus');
        loadFeedbacks();
      }
    } catch (e) {
      toast.error('Gagal menghapus');
    }
  };

  const myReports = useMemo(() => {
    return feedbacks.filter(f => f.authorNik === inspectorNik);
  }, [feedbacks, inspectorNik]);

  const filteredDevFeedbacks = useMemo(() => {
    return feedbacks.filter(f => {
      const matchesStatus = devStatusFilter === 'all' || f.status === devStatusFilter;
      const matchesType = devTypeFilter === 'all' || f.type === devTypeFilter;
      const matchesSearch = !devSearch.trim() || 
        f.title.toLowerCase().includes(devSearch.toLowerCase()) || 
        f.description.toLowerCase().includes(devSearch.toLowerCase()) ||
        f.authorName.toLowerCase().includes(devSearch.toLowerCase()) ||
        f.authorNik.toLowerCase().includes(devSearch.toLowerCase()) ||
        (f.module && f.module.toLowerCase().includes(devSearch.toLowerCase()));
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [feedbacks, devStatusFilter, devTypeFilter, devSearch]);

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-500 border border-rose-500/30">🔴 Kritis</span>;
      case 'high':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-500 border border-orange-500/30">🟠 Tinggi</span>;
      case 'medium':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">🟡 Sedang</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">🟢 Rendah</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'RESOLVED':
        return <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/20 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">✅ Selesai</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-blue-500/20 text-blue-600 border border-blue-500/30 flex items-center gap-1">🔍 Dalam Proses</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-500/20 text-slate-600 border border-slate-500/30 flex items-center gap-1">❌ Ditutup</span>;
      default:
        return <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-amber-500/20 text-amber-600 border border-amber-500/30 flex items-center gap-1">⏳ Menunggu Review</span>;
    }
  };

  const getTypeIcon = (t: string) => {
    switch (t) {
      case 'bug':
        return <Bug className="w-4 h-4 text-rose-500" />;
      case 'suggestion':
        return <Lightbulb className="w-4 h-4 text-amber-500" />;
      case 'improvement':
        return <Sparkles className="w-4 h-4 text-teal-500" />;
      default:
        return <HelpCircle className="w-4 h-4 text-indigo-500" />;
    }
  };

  return (
    <div className="pb-24 px-3 sm:px-6 lg:px-8 w-full h-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <PageHeader
        title="Masukan & Lapor Bug"
        description="Sampaikan kendala sistem, saran pengembangan, atau ide fitur baru untuk PrepLab Portal."
        icon={<MessageSquarePlus className="w-6 h-6 text-teal-500" />}
      >
        <button
          type="button"
          onClick={() => {
            if (onBack) {
              onBack();
            } else if (window.history.length > 1) {
              window.history.back();
            } else {
              window.location.href = '/';
            }
          }}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all shadow-2xs hover:opacity-85 cursor-pointer"
          style={{
            backgroundColor: 'var(--input-bg, #ffffff)',
            borderColor: 'var(--border-main, #e2e8f0)',
            color: 'var(--text-main, #1e293b)'
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>
      </PageHeader>

      {/* Navigation Tabs */}
      <div 
        className="p-1.5 rounded-2xl border flex items-center gap-1.5 overflow-x-auto shadow-xs"
        style={{
          backgroundColor: 'var(--card-bg, #ffffff)',
          borderColor: 'var(--border-main, #e2e8f0)'
        }}
      >
        <button
          type="button"
          onClick={() => { setActiveTab('create'); setSubmitSuccess(false); }}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'create' 
              ? 'text-white shadow-sm' 
              : 'opacity-70 hover:opacity-100 hover:bg-slate-100/50'
          }`}
          style={{
            backgroundColor: activeTab === 'create' ? 'var(--primary, #0D9488)' : 'transparent',
            color: activeTab === 'create' ? '#ffffff' : 'var(--text-main, #1e293b)'
          }}
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Kirim Laporan / Ide</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my-reports')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'my-reports' 
              ? 'text-white shadow-sm' 
              : 'opacity-70 hover:opacity-100 hover:bg-slate-100/50'
          }`}
          style={{
            backgroundColor: activeTab === 'my-reports' ? 'var(--primary, #0D9488)' : 'transparent',
            color: activeTab === 'my-reports' ? '#ffffff' : 'var(--text-main, #1e293b)'
          }}
        >
          <Clock className="w-4 h-4" />
          <span>Laporan Saya ({myReports.length})</span>
        </button>

        {isDeveloper && (
          <button
            type="button"
            onClick={() => setActiveTab('dev-board')}
            className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer border ${
              activeTab === 'dev-board' 
                ? 'bg-purple-600 text-white border-purple-500 shadow-sm' 
                : 'border-purple-500/20 text-purple-600 hover:bg-purple-50'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Developer Board ({feedbacks.length})</span>
          </button>
        )}
      </div>

      {/* TAB 1: FORM INPUT */}
      {activeTab === 'create' && (
        <div className="max-w-3xl mx-auto">
          {submitSuccess ? (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-8 sm:p-12 rounded-3xl border text-center space-y-4 shadow-sm"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #e2e8f0)'
              }}
            >
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold" style={{ color: 'var(--text-main, #1e293b)' }}>
                Terima Kasih Atas Masukan Anda! 🎉
              </h3>
              <p className="text-sm opacity-75 max-w-md mx-auto leading-relaxed">
                Laporan kendala / saran Anda telah berhasil tersimpan dan diterima langsung oleh tim pengembang (Developer).
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setSubmitSuccess(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer transition-all active:scale-95"
                  style={{ backgroundColor: 'var(--primary, #0D9488)' }}
                >
                  Kirim Laporan Lainnya
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('my-reports')}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold border transition-all hover:bg-slate-100/50 cursor-pointer"
                  style={{
                    backgroundColor: 'var(--input-bg, #ffffff)',
                    borderColor: 'var(--border-main, #e2e8f0)',
                    color: 'var(--text-main, #1e293b)'
                  }}
                >
                  Lihat Status Laporan Saya
                </button>
              </div>
            </motion.div>
          ) : (
            <form 
              onSubmit={handleSubmit}
              className="p-6 sm:p-8 rounded-3xl border shadow-sm space-y-6"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #e2e8f0)'
              }}
            >
              {/* Type Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Jenis Laporan / Masukan
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'bug', label: 'Lapor Bug', icon: <Bug className="w-4 h-4 text-rose-500" />, desc: 'Fitur error / rusak' },
                    { id: 'suggestion', label: 'Saran Fitur', icon: <Lightbulb className="w-4 h-4 text-amber-500" />, desc: 'Ide menu / opsi baru' },
                    { id: 'improvement', label: 'Peningkatan UI', icon: <Sparkles className="w-4 h-4 text-teal-500" />, desc: 'Tampilan & responsivitas' },
                    { id: 'question', label: 'Pertanyaan', icon: <HelpCircle className="w-4 h-4 text-indigo-500" />, desc: 'Bantuan penggunaan' },
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id as any)}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                        type === t.id 
                          ? 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-500/5 font-bold shadow-xs' 
                          : 'opacity-70 hover:opacity-100 hover:bg-slate-50'
                      }`}
                      style={{
                        borderColor: type === t.id ? 'var(--primary, #0D9488)' : 'var(--border-main, #e2e8f0)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        {t.icon}
                        {type === t.id && <div className="w-2 h-2 rounded-full bg-teal-500" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{t.label}</p>
                        <p className="text-[10px] opacity-60 leading-tight">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold opacity-80">
                  Deskripsi Kendala / Masukan / Ide Fitur *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Tuliskan secara jelas kendala yang dialami, saran perbaikan, atau ide fitur yang Anda inginkan..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border text-xs font-medium outline-none focus:ring-2 focus:ring-teal-500/20 leading-relaxed"
                  style={{
                    backgroundColor: 'var(--input-bg, #ffffff)',
                    borderColor: 'var(--border-main, #e2e8f0)',
                    color: 'var(--text-main, #1e293b)'
                  }}
                />
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold opacity-80 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-teal-500" />
                  <span>Lampirkan Screenshot / Foto (Opsional)</span>
                </label>
                
                {screenshotBase64 ? (
                  <div className="relative p-2 rounded-2xl border flex items-center gap-3" style={{ borderColor: 'var(--border-main)' }}>
                    <img 
                      src={screenshotBase64} 
                      alt="Preview" 
                      className="w-16 h-16 object-cover rounded-xl border shadow-2xs" 
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-bold truncate">Screenshot siap dikirim</p>
                      <p className="opacity-60 text-[11px]">Akan diunggah otomatis ke Google Drive sistem</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setScreenshotBase64(null)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                ) : (
                  <label 
                    className="p-4 rounded-2xl border border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50 transition-colors text-center"
                    style={{ borderColor: 'var(--border-main)' }}
                  >
                    <ImageIcon className="w-6 h-6 opacity-40 text-teal-600" />
                    <span className="text-xs font-semibold opacity-80">Klik untuk memilih screenshot gambar</span>
                    <span className="text-[10px] opacity-50">PNG, JPG, JPEG (Maks. 5MB)</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="hidden" 
                    />
                  </label>
                )}
              </div>

              {/* Reporter Info Preview */}
              <div 
                className="p-3.5 rounded-2xl border text-xs flex flex-wrap items-center justify-between gap-2"
                style={{
                  backgroundColor: 'var(--input-bg, #f8fafc)',
                  borderColor: 'var(--border-main, #e2e8f0)'
                }}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-500 text-white flex items-center justify-center font-bold text-xs">
                    {(inspectorName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-bold block leading-tight">{inspectorName || 'Personil PrepLab'}</span>
                    <span className="opacity-65 text-[10px]">NIK: {inspectorNik} • {authorRole} ({authorSection})</span>
                  </div>
                </div>
                <span className="text-[10px] opacity-50 font-mono">
                  Info perangkat terlampir otomatis
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: 'var(--primary, #0D9488)' }}
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengirim Laporan ke Tim Developer...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Kirim Masukan / Lapor Bug Sekarang</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: MY REPORTS */}
      {activeTab === 'my-reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-500" />
              <span>Daftar Masukan & Laporan Saya ({myReports.length})</span>
            </h3>
            <button
              onClick={loadFeedbacks}
              className="p-2 rounded-xl border text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-1"
              style={{ borderColor: 'var(--border-main)' }}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
          </div>

          {myReports.length === 0 ? (
            <div 
              className="p-12 rounded-3xl border border-dashed text-center space-y-3"
              style={{ borderColor: 'var(--border-main)' }}
            >
              <MessageSquarePlus className="w-10 h-10 mx-auto opacity-30 text-teal-500" />
              <p className="text-sm font-semibold">Anda belum pernah mengirimkan laporan atau masukan.</p>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs"
                style={{ backgroundColor: 'var(--primary, #0D9488)' }}
              >
                Buat Laporan Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myReports.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-3xl border shadow-2xs space-y-3.5 transition-all hover:border-teal-500/40"
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    borderColor: 'var(--border-main, #e2e8f0)'
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-slate-100">
                        {getTypeIcon(item.type)}
                      </div>
                      <div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border">
                          {item.module || 'Umum'}
                        </span>
                        <h4 className="font-bold text-sm mt-1" style={{ color: 'var(--text-main)' }}>
                          {item.title}
                        </h4>
                      </div>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>

                  <p className="text-xs opacity-80 leading-relaxed whitespace-pre-wrap">
                    {item.description}
                  </p>

                  {item.screenshotUrl && (
                    <div>
                      <a
                        href={item.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 font-semibold underline"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Lihat Lampiran Screenshot</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Developer Response Notes */}
                  {item.developerNotes && (
                    <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200/60 text-xs space-y-1">
                      <p className="font-bold text-purple-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>Tanggapan Tim Developer:</span>
                      </p>
                      <p className="text-purple-800 leading-relaxed">
                        {item.developerNotes}
                      </p>
                      {item.resolvedAt && (
                        <p className="text-[10px] text-purple-600 font-mono pt-1">
                          Diselesaikan pada: {new Date(item.resolvedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t flex items-center justify-between text-[11px] opacity-60" style={{ borderColor: 'var(--border-main)' }}>
                    <span>{getPriorityBadge(item.priority)}</span>
                    <span className="font-mono">
                      {new Date(item.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DEVELOPER BOARD (EXCLUSIVE FOR DEV) */}
      {isDeveloper && activeTab === 'dev-board' && (
        <div className="space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Laporan', count: feedbacks.length, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Menunggu (Open)', count: feedbacks.filter(f => f.status === 'PENDING').length, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Dalam Pengerjaan', count: feedbacks.filter(f => f.status === 'IN_PROGRESS').length, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Selesai (Resolved)', count: feedbacks.filter(f => f.status === 'RESOLVED').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map((stat, i) => (
              <div key={i} className={`p-4 rounded-2xl border ${stat.bg} space-y-1 shadow-2xs`}>
                <p className="text-xs font-semibold opacity-70">{stat.label}</p>
                <p className={`text-2xl font-black ${stat.color}`}>{stat.count}</p>
              </div>
            ))}
          </div>

          {/* Filters Bar */}
          <div 
            className="p-3.5 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs"
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              borderColor: 'var(--border-main, #e2e8f0)'
            }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={devStatusFilter}
                onChange={(e) => setDevStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-main)' }}
              >
                <option value="all">Semua Status</option>
                <option value="PENDING">⏳ Menunggu</option>
                <option value="IN_PROGRESS">🔍 Dalam Pengerjaan</option>
                <option value="RESOLVED">✅ Selesai</option>
                <option value="REJECTED">❌ Ditutup</option>
              </select>

              <select
                value={devTypeFilter}
                onChange={(e) => setDevTypeFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-main)' }}
              >
                <option value="all">Semua Jenis</option>
                <option value="bug">🐛 Bug</option>
                <option value="suggestion">💡 Saran</option>
                <option value="improvement">⚡ Peningkatan</option>
                <option value="question">❓ Pertanyaan</option>
              </select>
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="text"
                placeholder="Cari pelapor / judul / NIK..."
                value={devSearch}
                onChange={(e) => setDevSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none"
                style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-main)' }}
              />
            </div>
          </div>

          {/* Dev Reports Grid */}
          <div className="space-y-3">
            {filteredDevFeedbacks.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-3xl border shadow-2xs flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all"
                style={{
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  borderColor: 'var(--border-main, #e2e8f0)'
                }}
              >
                <div className="space-y-2.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-slate-100">
                      {getTypeIcon(item.type)}
                    </div>
                    <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                      {item.title}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 border">
                      {item.module || 'Umum'}
                    </span>
                    {getPriorityBadge(item.priority)}
                    {getStatusBadge(item.status)}
                  </div>

                  <p className="text-xs opacity-80 leading-relaxed whitespace-pre-wrap">
                    {item.description}
                  </p>

                  {/* Reporter details */}
                  <div className="flex flex-wrap items-center gap-3 text-[11px] opacity-70">
                    <span className="font-semibold">👤 {item.authorName} ({item.authorNik})</span>
                    <span>•</span>
                    <span>💼 {item.authorRole || 'Staff'} - {item.authorSection || 'Prep & Lab'}</span>
                    <span>•</span>
                    <span className="font-mono">📅 {new Date(item.createdAt).toLocaleString('id-ID')}</span>
                  </div>

                  {item.screenshotUrl && (
                    <a
                      href={item.screenshotUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-teal-600 font-semibold underline pt-1"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Lampiran Screenshot</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {item.developerNotes && (
                    <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-xs">
                      <strong className="text-purple-900 block mb-0.5">💬 Catatan Developer:</strong>
                      <p className="text-purple-800">{item.developerNotes}</p>
                    </div>
                  )}
                </div>

                {/* Developer Actions */}
                <div className="flex flex-row md:flex-col items-end gap-2 shrink-0 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4" style={{ borderColor: 'var(--border-main)' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReportForNotes(item);
                      setNotesInput(item.developerNotes || '');
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Beri Catatan</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {item.status !== 'RESOLVED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(item.id, 'RESOLVED')}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer"
                        title="Tandai Selesai"
                      >
                        ✅ Selesai
                      </button>
                    )}
                    {item.status !== 'IN_PROGRESS' && item.status !== 'RESOLVED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(item.id, 'IN_PROGRESS')}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer"
                        title="Kerjakan"
                      >
                        🔍 Kerjakan
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 border border-rose-200 cursor-pointer"
                      title="Hapus Laporan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Modal Catatan Developer */}
          {selectedReportForNotes && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <div 
                className="w-full max-w-lg p-6 rounded-3xl border shadow-2xl space-y-4"
                style={{
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  borderColor: 'var(--border-main, #e2e8f0)'
                }}
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>Catatan Developer untuk Pelapor</span>
                  </h4>
                  <button 
                    onClick={() => setSelectedReportForNotes(null)}
                    className="text-xs opacity-60 hover:opacity-100"
                  >
                    ✕ Tutup
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border text-xs">
                  <p className="font-bold">{selectedReportForNotes.title}</p>
                  <p className="opacity-70 truncate">{selectedReportForNotes.authorName} ({selectedReportForNotes.authorNik})</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold opacity-80">Catatan / Jawaban Solusi Developer:</label>
                  <textarea
                    rows={4}
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    placeholder="Tuliskan respon, perbaikan yang telah dilakukan, atau penjelasan ke karyawan..."
                    className="w-full p-3 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-purple-500/20"
                    style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-main)' }}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedReportForNotes(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold border"
                    style={{ borderColor: 'var(--border-main)' }}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={updatingStatus}
                    onClick={() => handleUpdateStatus(selectedReportForNotes.id, selectedReportForNotes.status, notesInput)}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-sm cursor-pointer"
                  >
                    {updatingStatus ? 'Menyimpan...' : 'Simpan Catatan'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
