import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Megaphone, 
  Calendar, 
  Clock, 
  BookOpen, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  X, 
  FileText, 
  Sparkles, 
  Eye
} from 'lucide-react';
import { Button } from './ui';
import { getFlyerInfo } from '../lib/p5m-flyer';

interface P5MNotificationModalProps {
  inspectorNik?: string;
  inspectorName?: string;
}

export function P5MNotificationModal({ inspectorNik, inspectorName }: P5MNotificationModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [assignment, setAssignment] = useState<any | null>(null);
  const [previewFlyer, setPreviewFlyer] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    if (!inspectorNik && !inspectorName) return;

    const checkAssignment = async () => {
      try {
        const queryParams = new URLSearchParams();
        if (inspectorNik) queryParams.set('nik', inspectorNik);
        if (inspectorName) queryParams.set('name', inspectorName);

        const res = await fetch(`/api/p5m/schedules/user-assignment?${queryParams.toString()}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.success && data.assignment) {
          const ass = data.assignment;
          const storageKey = `p5m_ack_${ass.scheduleId}_${ass.nik || ass.nama}`;
          const isAcknowledged = localStorage.getItem(storageKey);

          if (!isAcknowledged) {
            setAssignment(ass);
            setIsOpen(true);
          }
        }
      } catch (err) {
        console.error('Error checking P5M assignment:', err);
      }
    };

    // Small timeout so it opens smoothly after portal load
    const timer = setTimeout(checkAssignment, 1200);
    return () => clearTimeout(timer);
  }, [inspectorNik, inspectorName]);

  const handleAcknowledge = () => {
    if (assignment) {
      const storageKey = `p5m_ack_${assignment.scheduleId}_${assignment.nik || assignment.nama}`;
      localStorage.setItem(storageKey, new Date().toISOString());
    }
    setIsOpen(false);
  };

  const handleDownloadFlyer = () => {
    if (!assignment?.fileUrl && !assignment?.materi) return;
    const downloadUrl = `/api/p5m/flyer?download=true&title=${encodeURIComponent(assignment.materi)}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', `Flyer_P5M_${(assignment.materi || '').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!assignment || !isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-lg bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl shadow-2xl overflow-hidden relative text-[var(--text-main)]"
          >
            {/* Top decorative glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-20 bg-gradient-to-b from-amber-500/15 to-transparent blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="relative p-6 pb-4 flex items-start justify-between border-b border-[var(--border-main)]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
                  <Megaphone className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> P5M Briefing Alert
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-main)] mt-1">
                    Jadwal Pembawa Materi P5M
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--input-bg)] transition-colors"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                Halo <span className="font-bold text-amber-600 dark:text-amber-400">{assignment.nama}</span>, Anda telah dijadwalkan sebagai <span className="font-semibold text-[var(--text-main)]">pembawa materi briefing keselamatan kerja P5M</span> minggu ini:
              </p>

              {/* Assignment Details Card */}
              <div className="bg-[var(--input-bg)] border border-[var(--border-main)] rounded-2xl p-4 space-y-3 shadow-xs">
                {/* Hari & Shift */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--border-main)] flex items-start gap-2.5 min-w-0 shadow-xs">
                    <Calendar className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] uppercase font-mono text-[var(--text-muted)] font-semibold tracking-wider">Hari Briefing</div>
                      <div className="text-xs font-bold text-[var(--text-main)] leading-snug">{assignment.day}</div>
                    </div>
                  </div>

                  <div className="bg-[var(--card-bg)] p-3 rounded-xl border border-[var(--border-main)] flex items-start gap-2.5 min-w-0 shadow-xs">
                    <Clock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[9px] uppercase font-mono text-[var(--text-muted)] font-semibold tracking-wider">Shift &amp; Zona</div>
                      <div className="text-xs font-bold text-[var(--text-main)] leading-snug break-words">{assignment.shift} • {assignment.zone}</div>
                    </div>
                  </div>
                </div>

                {/* Judul Materi */}
                <div className="bg-[var(--card-bg)] p-3.5 rounded-xl border border-amber-500/30 space-y-1 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-mono font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> Judul Materi
                    </span>
                    {assignment.kategori && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-main)] font-semibold">
                        {assignment.kategori}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-extrabold text-[var(--text-main)] leading-snug break-words">
                    {assignment.materi || 'Briefing Standar Operasional'}
                  </div>
                </div>
              </div>

              {/* Flyer Download Action if Available */}
              {assignment.fileUrl ? (
                <div className="bg-emerald-500/10 p-3.5 rounded-2xl border border-emerald-500/30 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">Flyer / Modul Materi Tersedia</div>
                      <div className="text-[10px] text-[var(--text-muted)]">Unduh atau buka materi untuk persiapan briefing.</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      onClick={() => setPreviewFlyer({ url: assignment.fileUrl, title: assignment.materi })}
                      size="sm"
                      className="bg-[var(--card-bg)] hover:bg-[var(--input-bg)] text-[var(--text-main)] text-xs px-2.5 py-1.5 rounded-xl border border-[var(--border-main)] flex items-center gap-1 shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" /> Lihat
                    </Button>
                    <Button
                      onClick={handleDownloadFlyer}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold shadow-md flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Buka / Unduh
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] text-[11px] text-[var(--text-muted)] text-center italic">
                  — Tidak ada lampiran flyer untuk topik ini (Gunakan materi briefing standar) —
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-[var(--card-bg)] border-t border-[var(--border-main)] flex items-center justify-end gap-3 flex-wrap sm:flex-nowrap">
              <Button
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs px-3 py-2"
              >
                Nanti Saja
              </Button>
              <Button
                onClick={handleAcknowledge}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-md flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <CheckCircle2 className="w-4 h-4 text-slate-950 shrink-0" />
                <span>Saya Sudah Paham &amp; Siap</span>
              </Button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Optional Flyer / Document Modal */}
      {previewFlyer && (() => {
        const info = getFlyerInfo(previewFlyer.url, previewFlyer.title);

        return (
          <div 
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={() => setPreviewFlyer(null)}
          >
            <div 
              className={`w-full bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-main)] rounded-2xl overflow-hidden shadow-2xl p-4 space-y-3 ${info.isPdf ? 'max-w-4xl max-h-[90vh]' : 'max-w-2xl'}`}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-2">
                <div className="flex items-center gap-2 min-w-0 pr-3">
                  {info.isPdf ? (
                    <FileText className="w-4 h-4 text-orange-500 shrink-0" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <h4 className="text-xs font-bold text-[var(--text-main)] truncate max-w-md">{previewFlyer.title}</h4>
                </div>
                <button 
                  onClick={() => setPreviewFlyer(null)} 
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {info.isPdf ? (
                <div className="bg-[var(--input-bg)] rounded-xl overflow-hidden flex flex-col items-center justify-center h-[65vh] border border-[var(--border-main)] relative">
                  <iframe 
                    src={info.embedUrl} 
                    title={previewFlyer.title}
                    className="w-full h-full rounded-lg"
                    allow="autoplay"
                  />
                </div>
              ) : (
                <div className="max-h-[70vh] overflow-y-auto flex items-center justify-center bg-[var(--input-bg)] rounded-xl p-2 min-h-[220px] border border-[var(--border-main)]">
                  <img 
                    src={info.imageUrl} 
                    alt={previewFlyer.title} 
                    onError={(e) => {
                      if (e.currentTarget.src !== info.streamUrl) {
                        e.currentTarget.src = info.streamUrl;
                      }
                    }}
                    className="max-w-full max-h-[65vh] object-contain rounded-lg shadow"
                    loading="eager" 
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--border-main)] flex-wrap">
                <div className="text-[10px] text-[var(--text-muted)] font-mono">
                  {info.isPdf ? '📄 Dokumen Prosedur Standar (IK/SOP)' : '🖼️ Flyer Briefing Keselamatan'}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => window.open(info.viewUrl, '_blank')}
                    className="bg-[var(--input-bg)] hover:bg-[var(--card-bg)] text-[var(--text-main)] text-xs font-semibold px-3 py-1.5 rounded-xl border border-[var(--border-main)] flex items-center gap-1 shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Buka Tab Baru
                  </Button>
                  <Button
                    onClick={handleDownloadFlyer}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" /> Unduh
                  </Button>
                  <Button
                    onClick={() => setPreviewFlyer(null)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-xl"
                  >
                    Tutup
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
