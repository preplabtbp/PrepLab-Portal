import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Link2, ExternalLink, AlertTriangle, Wrench, Globe, 
  Search, Check, Loader2, MapPin, Tag
} from 'lucide-react';
import { toast } from 'sonner';

export interface LinkedModuleInfo {
  type: 'ticket' | 'wo' | 'route' | 'url';
  id?: string;
  label: string;
  url?: string;
}

interface LinkModuleModalProps {
  isOpen: boolean;
  rowTitle?: string;
  currentLink?: LinkedModuleInfo | null;
  onClose: () => void;
  onSaveLink: (linkInfo: LinkedModuleInfo | null) => void;
}

export function LinkModuleModal({
  isOpen,
  rowTitle = '',
  currentLink,
  onClose,
  onSaveLink
}: LinkModuleModalProps) {
  const [linkType, setLinkType] = useState<'ticket' | 'wo' | 'route' | 'url'>(
    currentLink?.type || 'ticket'
  );

  // Tickets state
  const [ticketsList, setTicketsList] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(false);
  const [ticketSearch, setTicketSearch] = useState<string>('');
  const [selectedTicketId, setSelectedTicketId] = useState<string>(currentLink?.id || '');

  // WO & Custom inputs
  const [customWoId, setCustomWoId] = useState<string>(currentLink?.type === 'wo' ? (currentLink?.id || '') : '');
  const [customUrl, setCustomUrl] = useState<string>(currentLink?.url || '');
  const [customLabel, setCustomLabel] = useState<string>(currentLink?.label || '');

  // Predefined routes
  const PREDEFINED_ROUTES = [
    { path: '/sap-dashboard', label: 'SAP Dashboard (Inspeksi & Temuan)' },
    { path: '/ticket', label: 'Rekapan Temuan Inspeksi K3' },
    { path: '/wo-maintenance-dashboard', label: 'Dashboard Maintenance & WO' },
    { path: '/pemantauan', label: 'Pemantauan Lingkungan & Gas' },
    { path: '/xrf-calibration', label: 'Kalibrasi & QC XRF' },
    { path: '/apd-monitoring', label: 'Monitoring Dokumen APD' },
    { path: '/p5m', label: 'Jadwal & Materi P5M' }
  ];

  useEffect(() => {
    if (isOpen && linkType === 'ticket' && ticketsList.length === 0) {
      setLoadingTickets(true);
      fetch('/api/tickets')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setTicketsList(data);
        })
        .catch(err => console.error("Error loading tickets for link modal:", err))
        .finally(() => setLoadingTickets(false));
    }
  }, [isOpen, linkType, ticketsList.length]);

  const filteredTickets = ticketsList.filter(t => {
    if (!ticketSearch.trim()) return true;
    const q = ticketSearch.toLowerCase();
    return (
      (t.ticketId || '').toLowerCase().includes(q) ||
      (t.location || '').toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.category || '').toLowerCase().includes(q)
    );
  }).slice(0, 30);

  const handleSave = () => {
    if (linkType === 'ticket') {
      if (!selectedTicketId) {
        toast.error("Pilih salah satu tiket temuan untuk ditautkan.");
        return;
      }
      const t = ticketsList.find(x => x.ticketId === selectedTicketId);
      onSaveLink({
        type: 'ticket',
        id: selectedTicketId,
        label: t ? `[${t.ticketId}] ${t.location || ''}` : selectedTicketId,
        url: `/ticket?id=${selectedTicketId}`
      });
      toast.success(`Baris berhasil ditautkan ke Tiket ${selectedTicketId}`);
    } else if (linkType === 'wo') {
      if (!customWoId.trim()) {
        toast.error("Ketik nomor ID Work Order (WO).");
        return;
      }
      onSaveLink({
        type: 'wo',
        id: customWoId.trim(),
        label: customLabel.trim() || `WO #${customWoId.trim()}`,
        url: `/wo-maintenance-dashboard?woId=${customWoId.trim()}`
      });
      toast.success(`Baris berhasil ditautkan ke WO ${customWoId}`);
    } else if (linkType === 'route') {
      if (!customUrl.trim()) {
        toast.error("Pilih atau ketik rute halaman portal.");
        return;
      }
      onSaveLink({
        type: 'route',
        id: customUrl.trim(),
        label: customLabel.trim() || customUrl.trim(),
        url: customUrl.trim()
      });
      toast.success("Baris berhasil ditautkan ke halaman modul.");
    } else if (linkType === 'url') {
      if (!customUrl.trim()) {
        toast.error("Ketik URL tautan eksternal.");
        return;
      }
      onSaveLink({
        type: 'url',
        label: customLabel.trim() || customUrl.trim(),
        url: customUrl.trim()
      });
      toast.success("Tautan URL berhasil disimpan.");
    }
    onClose();
  };

  const handleRemoveLink = () => {
    onSaveLink(null);
    toast.success("Tautan modul berhasil dilepas.");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-slate-950/70 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-lg shadow-sm">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  Tautkan ke Modul Lain
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                  Item: <strong className="text-slate-700 dark:text-slate-200">{rowTitle || 'Kegiatan / Subtask'}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Module Type Selector Tabs */}
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setLinkType('ticket')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                  linkType === 'ticket'
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Tiket K3</span>
              </button>
              <button
                type="button"
                onClick={() => setLinkType('wo')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                  linkType === 'wo'
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Work Order</span>
              </button>
              <button
                type="button"
                onClick={() => setLinkType('route')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                  linkType === 'route'
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Halaman</span>
              </button>
              <button
                type="button"
                onClick={() => setLinkType('url')}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 cursor-pointer ${
                  linkType === 'url'
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>URL Luar</span>
              </button>
            </div>

            {/* Type 1: Tiket Temuan K3 */}
            {linkType === 'ticket' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={ticketSearch}
                    onChange={(e) => setTicketSearch(e.target.value)}
                    placeholder="Cari ID tiket, area, atau deskripsi temuan..."
                    className="w-full text-xs sm:text-sm pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                  {loadingTickets ? (
                    <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin text-teal-600" />
                      <span className="text-xs">Memuat daftar tiket temuan...</span>
                    </div>
                  ) : filteredTickets.length === 0 ? (
                    <p className="text-center py-6 text-xs text-slate-400">
                      Tidak ada tiket yang cocok dengan kata kunci.
                    </p>
                  ) : (
                    filteredTickets.map(t => {
                      const isSel = selectedTicketId === t.ticketId;
                      const isClosed = (t.status || '').toUpperCase() === 'CLOSED';
                      return (
                        <div
                          key={t.ticketId || t.id}
                          onClick={() => setSelectedTicketId(t.ticketId)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            isSel
                              ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-slate-900 dark:text-white shadow-xs'
                              : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-xs text-teal-700 dark:text-teal-400">
                                {t.ticketId}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                isClosed
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              }`}>
                                {t.status || 'OPEN'}
                              </span>
                              {t.category && (
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  {t.category}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                              <span className="truncate">{t.location || 'Area Kerja'}</span>
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {t.description || '-'}
                            </p>
                          </div>

                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                            isSel ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {isSel && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Type 2: Work Order */}
            {linkType === 'wo' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nomor ID Work Order (WO)
                  </label>
                  <input
                    type="text"
                    value={customWoId}
                    onChange={(e) => setCustomWoId(e.target.value)}
                    placeholder="Contoh: WO-2026-001"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Label Keterangan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Contoh: Perbaikan Pulverizer No. 2"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}

            {/* Type 3: Internal Route */}
            {linkType === 'route' && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pilih Halaman Modul Portal
                </label>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {PREDEFINED_ROUTES.map(r => (
                    <div
                      key={r.path}
                      onClick={() => {
                        setCustomUrl(r.path);
                        setCustomLabel(r.label);
                      }}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        customUrl === r.path
                          ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-500 text-teal-900 dark:text-teal-200 font-bold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-xs">{r.label}</span>
                      <span className="text-[10px] font-mono text-slate-400">{r.path}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Type 4: External URL */}
            {linkType === 'url' && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    URL Tautan (https://...)
                  </label>
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Label Teks Tautan
                  </label>
                  <input
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Contoh: Dokumen Standar SOP"
                    className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
            {currentLink ? (
              <button
                type="button"
                onClick={handleRemoveLink}
                className="px-3 py-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              >
                Hapus Tautan
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Tautan Modul</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
