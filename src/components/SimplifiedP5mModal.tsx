import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Megaphone, Calendar, Clock, BookOpen, 
  Download, Eye, ExternalLink, X, FileText, 
  Sparkles, CheckCircle2, AlertCircle, RefreshCw, Loader2
} from 'lucide-react';
import { getFlyerInfo, FlyerInfo } from '../lib/p5m-flyer';

interface SimplifiedP5mModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectorNik: string | null;
  inspectorName: string | null;
  p5mAssignment?: any | null;
  onNav?: (tab: any) => void;
}

export function SimplifiedP5mModal({
  isOpen,
  onClose,
  inspectorNik,
  inspectorName,
  p5mAssignment: initialAssignment,
  onNav
}: SimplifiedP5mModalProps) {
  const [assignment, setAssignment] = useState<any | null>(initialAssignment || null);
  const [loading, setLoading] = useState(false);
  const [showViewer, setShowViewer] = useState(false);
  const [viewerMode, setViewerMode] = useState<'stream' | 'drive'>('stream');

  useEffect(() => {
    if (initialAssignment) {
      setAssignment(initialAssignment);
    }
  }, [initialAssignment]);

  // Fetch assignment if modal opens and no assignment yet
  useEffect(() => {
    if (!isOpen) return;

    if (!assignment && (inspectorNik || inspectorName)) {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (inspectorNik) queryParams.set('nik', inspectorNik);
      if (inspectorName) queryParams.set('name', inspectorName);
      queryParams.set('includePast', 'true');

      fetch(`/api/p5m/schedules/user-assignment?${queryParams.toString()}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.success && data?.assignment) {
            setAssignment(data.assignment);
          }
        })
        .catch(err => {
          console.warn('Gagal memuat jadwal P5M:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, inspectorNik, inspectorName, assignment]);

  if (!isOpen) return null;

  const topicTitle = assignment?.materi || 'Briefing Keselamatan Kerja Terencana';
  const flyerTargetUrl = assignment?.fileUrl || `/api/p5m/flyer?title=${encodeURIComponent(topicTitle)}`;
  const flyerInfo: FlyerInfo = getFlyerInfo(flyerTargetUrl, topicTitle);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = flyerInfo.downloadUrl;
    link.setAttribute('download', `P5M_${topicTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}${flyerInfo.isPdf ? '.pdf' : '.png'}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Sheet */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="relative z-10 w-full sm:max-w-md rounded-t-[28px] sm:rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92dvh]"
          style={{
            backgroundColor: 'var(--card-bg, #FFFFFF)',
            borderColor: 'var(--border-main, #E2E8F0)'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-main)] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-[var(--text-main)] font-display leading-tight">
                  Jadwal Briefing P5M
                </h3>
                <p className="text-[10.5px] text-[var(--text-muted)]">
                  Pertemuan 5 Menit Keselamatan Kerja
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-muted)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-4 space-y-3.5 text-xs">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-[var(--text-muted)]">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                <span className="text-xs">Memeriksa jadwal briefing Anda...</span>
              </div>
            ) : assignment ? (
              /* User memiliki jadwal sebagai PEMATERI */
              <div className="space-y-3.5">
                {/* Status Badge & Sapaan */}
                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/25 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-600 text-white flex items-center gap-1 shadow-2xs">
                      <Sparkles className="w-3 h-3" /> Pemateri Terjadwal
                    </span>
                    <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300">
                      Reward: +60 EXP
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-main)] font-medium leading-relaxed pt-0.5">
                    Halo <strong className="font-bold text-purple-700 dark:text-purple-300">{assignment.nama || inspectorName}</strong>, Anda terjadwal membawakan materi P5M pada sesi berikut:
                  </p>
                </div>

                {/* Detail Penjadwalan */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-2xl border border-[var(--border-main)] bg-[var(--input-bg)] space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)]">
                      <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      <span>Hari / Tanggal</span>
                    </div>
                    <span className="text-xs font-black text-[var(--text-main)] block">
                      {assignment.day}
                    </span>
                    {assignment.assignmentDate && (
                      <span className="text-[10px] text-[var(--text-muted)] block">
                        {assignment.assignmentDate}
                      </span>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl border border-[var(--border-main)] bg-[var(--input-bg)] space-y-0.5">
                    <div className="flex items-center gap-1 text-[10px] font-bold text-[var(--text-muted)]">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>Shift &amp; Area</span>
                    </div>
                    <span className="text-xs font-black text-[var(--text-main)] block">
                      {assignment.shift}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] block truncate">
                      {assignment.zone || 'Semua Area'}
                    </span>
                  </div>
                </div>

                {/* Materi Box */}
                <div className="p-3.5 rounded-2xl border border-[var(--border-main)] bg-[var(--card-bg)] space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[var(--text-muted)] flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                      <span>Topik Materi P5M</span>
                    </span>
                    {assignment.kategori && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[var(--text-muted)]">
                        {assignment.kategori}
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-black text-[var(--text-main)] leading-snug">
                    {topicTitle}
                  </h4>
                </div>

                {/* Aksi View & Download Materi */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/25 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-bold text-xs text-emerald-800 dark:text-emerald-200 leading-tight">
                        Flyer / Dokumen Materi
                      </h5>
                      <span className="text-[10px] text-[var(--text-muted)] block truncate">
                        Format: {flyerInfo.isPdf ? 'PDF / Dokumen' : 'Flyer Gambar'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowViewer(true)}
                      className="py-2.5 px-3 rounded-xl bg-[var(--card-bg)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-main)] border border-[var(--border-main)] font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer"
                    >
                      <Eye className="w-4 h-4 text-purple-600" />
                      <span>Lihat Materi</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownload}
                      className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Unduh Materi</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* User sebagai PESERTA (Belum Terjadwal Jadi Pemateri) */
              <div className="space-y-3.5">
                <div className="p-4 rounded-2xl bg-slate-500/10 border border-[var(--border-main)] space-y-2 text-center">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 flex items-center justify-center mx-auto">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-[var(--text-main)]">
                      Peserta Briefing Shift
                    </span>
                    <h4 className="text-xs font-black text-[var(--text-main)] mt-1.5">
                      Jadwal Pembawa Materi Nihil Minggu Ini
                    </h4>
                    <p className="text-[10.5px] text-[var(--text-muted)] leading-relaxed mt-1">
                      Anda belum dijadwalkan sebagai pembawa materi P5M minggu ini. Silakan hadir 15 menit sebelum pergantian shift untuk mengikuti safety talk regu.
                    </p>
                  </div>
                </div>

                {/* Materi Acuan Mingguan */}
                <div className="p-3.5 rounded-2xl border border-[var(--border-main)] bg-[var(--card-bg)] space-y-2.5">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-[var(--text-main)]">
                      Materi Briefing K3 Terkini
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                    Pelajari materi keselamatan kerja mingguan untuk menambah wawasan operasional.
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowViewer(true)}
                      className="py-2 px-2.5 rounded-xl bg-[var(--input-bg)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--text-main)] border border-[var(--border-main)] font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-purple-600" />
                      <span>Lihat Materi</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownload}
                      className="py-2 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh Materi</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* In-Modal Viewer Screen (Jika User Mengklik "Lihat Materi") */}
            {showViewer && (
              <div className="pt-2 border-t border-[var(--border-main)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--text-main)] flex items-center gap-1.5 truncate pr-2">
                    <FileText className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="truncate">{topicTitle}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowViewer(false)}
                    className="text-[10.5px] font-bold text-rose-500 hover:underline shrink-0 cursor-pointer"
                  >
                    Tutup Preview ✕
                  </button>
                </div>

                {flyerInfo.isPdf ? (
                  <div className="bg-[var(--input-bg)] rounded-2xl overflow-hidden border border-[var(--border-main)] h-[48vh] relative">
                    <iframe
                      src={viewerMode === 'stream' ? flyerInfo.streamUrl : flyerInfo.embedUrl}
                      title={topicTitle}
                      className="w-full h-full rounded-2xl"
                      allow="autoplay"
                    />
                  </div>
                ) : (
                  <div className="bg-[var(--input-bg)] rounded-2xl p-2 border border-[var(--border-main)] max-h-[48vh] overflow-y-auto flex items-center justify-center">
                    <img
                      src={flyerInfo.imageUrl}
                      alt={topicTitle}
                      onError={(e) => {
                        if (e.currentTarget.src !== flyerInfo.streamUrl) {
                          e.currentTarget.src = flyerInfo.streamUrl;
                        }
                      }}
                      className="max-w-full max-h-[44vh] object-contain rounded-xl shadow-xs"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => window.open(flyerInfo.viewUrl, '_blank')}
                    className="text-purple-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Buka Tab Penuh</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownload}
                    className="text-emerald-600 hover:underline flex items-center gap-1 font-bold"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download File</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Optional Footer Link */}
          {onNav && (
            <div className="p-3 bg-[var(--input-bg)] border-t border-[var(--border-main)] flex items-center justify-between text-xs shrink-0">
              <span className="text-[10.5px] text-[var(--text-muted)]">
                Ingin melihat jadwal seluruh regu?
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNav('p5m');
                }}
                className="text-purple-600 dark:text-purple-400 font-bold text-[11px] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Tabel Lengkap</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
