import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, X, Clock, MapPin, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { getOpenFindingsForSupervisor, normalizeUserRole } from '../utils/inspection-pic-matcher';

interface OpenFindingsReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToFindings: () => void;
  inspectorName?: string | null;
  inspectorNik?: string | null;
  inspectorJabatan?: string | null;
  openFindings: any[];
}

export function OpenFindingsReminderModal({
  isOpen,
  onClose,
  onNavigateToFindings,
  inspectorName,
  inspectorNik,
  inspectorJabatan,
  openFindings
}: OpenFindingsReminderModalProps) {
  if (!isOpen || !openFindings || openFindings.length === 0) return null;

  const totalItems = openFindings.length;
  const highPriorityCount = openFindings.filter(
    (t: any) => (t.priority || '').toUpperCase() === 'HIGH' || (t.risk || '').toLowerCase().includes('tinggi')
  ).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md sm:max-w-lg bg-[var(--card-bg,#ffffff)] text-[var(--text-main,#0f172a)] rounded-3xl shadow-2xl border border-[var(--border-main,#e2e8f0)] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Top Gradient Warning Bar */}
        <div className="h-2.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-600" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Tutup Pengingat"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-7 space-y-4">
          {/* Header Info */}
          <div className="flex items-start gap-3.5 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/15 to-amber-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-extrabold uppercase tracking-wider border border-rose-500/20">
                  <AlertTriangle className="w-3 h-3" />
                  Action Items K3
                </span>
                {highPriorityCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-extrabold uppercase">
                    {highPriorityCount} Risiko Tinggi
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-snug">
                Pengingat Temuan Terbuka (Open)
              </h3>
              <p className="text-xs text-[var(--text-muted,#64748b)]">
                Terdapat <strong className="text-rose-600 dark:text-rose-400 font-bold">{totalItems} temuan inspeksi</strong> yang memerlukan tindakan dan penutupan tiket di area tanggung jawab Anda.
              </p>
            </div>
          </div>

          {/* User / PIC Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-500/5 border border-[var(--border-main,#e2e8f0)] flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <span className="text-[10px] text-[var(--text-muted,#64748b)] uppercase font-bold tracking-wider block">
                Penanggung Jawab (PIC Area):
              </span>
              <span className="font-extrabold truncate block text-slate-800 dark:text-slate-100">
                {inspectorName || 'Supervisor PIC'}
              </span>
              <span className="text-[11px] font-medium text-teal-600 dark:text-teal-400 truncate block">
                {inspectorJabatan || 'Supervisor Area'}
              </span>
            </div>
            <span className="px-3 py-1 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-black text-xs shrink-0 border border-rose-200 dark:border-rose-900">
              {totalItems} Open
            </span>
          </div>

          {/* Scrollable Findings Items List */}
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {openFindings.slice(0, 5).map((item: any, idx: number) => {
              let formattedDate = '-';
              if (item.date) {
                try {
                  formattedDate = format(new Date(item.date), 'dd MMM yyyy, HH:mm');
                } catch (e) {
                  formattedDate = String(item.date).slice(0, 10);
                }
              }

              const isHigh = (item.priority || '').toUpperCase() === 'HIGH' || (item.risk || '').toLowerCase().includes('tinggi');

              return (
                <div
                  key={item.id || item.ticketId || idx}
                  className="p-3 rounded-xl bg-[var(--card-bg,#ffffff)] border border-[var(--border-main,#e2e8f0)] hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-1.5 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {item.ticketId || `TKT-${idx+1}`}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      isHigh ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    }`}>
                      {item.risk || item.priority || 'Medium'}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-snug">
                    {item.description || item.finding || 'Temuan ketidaksesuaian inspeksi'}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted,#64748b)] pt-0.5">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                      <span className="truncate">{item.location || item.area || 'Area Inspeksi'}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0 ml-auto">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      {formattedDate}
                    </span>
                  </div>
                </div>
              );
            })}

            {totalItems > 5 && (
              <p className="text-[11px] text-center text-slate-500 italic pt-1">
                ... dan {totalItems - 5} temuan lainnya di area Anda
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-[var(--border-main,#e2e8f0)]">
            <button
              type="button"
              onClick={onNavigateToFindings}
              className="w-full h-11 bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 hover:from-rose-500 hover:to-rose-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all text-xs sm:text-sm cursor-pointer whitespace-nowrap"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Lihat & Tangani Temuan Sekarang</span>
              <ArrowUpRight className="w-4 h-4 shrink-0" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full h-9 text-xs text-[var(--text-muted,#64748b)] hover:text-[var(--text-main,#0f172a)] hover:bg-slate-500/10 font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Nanti Saja (Tutup Pengingat)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface GlobalOpenFindingsReminderProps {
  inspectorNik?: string | null;
  inspectorName?: string | null;
  inspectorJabatan?: string | null;
  onNavigateToDashboard: () => void;
}

export function GlobalOpenFindingsReminder({
  inspectorNik,
  inspectorName,
  inspectorJabatan,
  onNavigateToDashboard
}: GlobalOpenFindingsReminderProps) {
  const location = useLocation();
  const [openFindings, setOpenFindings] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!inspectorNik) return;
    const role = normalizeUserRole(inspectorJabatan);
    if (role === 'Other') return;

    // Do not show global modal if already on sap-dashboard (sap-dashboard has its own targeted modal)
    if (location.pathname === '/sap-dashboard') {
      setIsOpen(false);
      return;
    }

    let isMounted = true;
    fetch('/api/tickets')
      .then(res => res.ok ? res.json() : [])
      .then(tickets => {
        if (!isMounted || !Array.isArray(tickets)) return;
        const res = getOpenFindingsForSupervisor(inspectorJabatan, tickets);
        if (res.openFindings.length > 0) {
          setOpenFindings(res.openFindings);
          const cleanNik = inspectorNik.trim();
          const dismissedKey = `dismissed_global_findings_${cleanNik}_${res.openFindings.length}`;
          const isDismissed = sessionStorage.getItem(dismissedKey);
          if (!isDismissed) {
            setIsOpen(true);
          }
        } else {
          setOpenFindings([]);
          setIsOpen(false);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [inspectorNik, inspectorJabatan, location.pathname]);

  if (!isOpen || openFindings.length === 0) return null;

  return (
    <OpenFindingsReminderModal
      isOpen={isOpen}
      onClose={() => {
        setIsOpen(false);
        if (inspectorNik) {
          const cleanNik = inspectorNik.trim();
          sessionStorage.setItem(`dismissed_global_findings_${cleanNik}_${openFindings.length}`, 'true');
        }
      }}
      onNavigateToFindings={() => {
        setIsOpen(false);
        onNavigateToDashboard();
      }}
      inspectorName={inspectorName}
      inspectorNik={inspectorNik}
      inspectorJabatan={inspectorJabatan}
      openFindings={openFindings}
    />
  );
}

