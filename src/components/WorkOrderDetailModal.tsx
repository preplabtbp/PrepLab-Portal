import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, Input, Textarea } from './ui';
import { 
  X, Wrench, CheckCircle2, Clock, Users, Camera, Upload, 
  Trash2, FileText, Check, AlertCircle, ExternalLink, MapPin, 
  Tag, User, ChevronDown, ChevronUp, Loader2, Sparkles, Send
} from 'lucide-react';
import { toast } from 'sonner';
import { updateWOStatus, getSpareparts } from '../sheets-api';
import { WhatsAppModal } from './whatsapp-modal';

interface WorkOrderDetailModalProps {
  woId: string | null;
  isOpen: boolean;
  onClose: () => void;
  inspectorName?: string;
  inspectorNik?: string;
  onResolved?: () => void;
}

export function WorkOrderDetailModal({
  woId,
  isOpen,
  onClose,
  inspectorName = 'Personil PrepLab',
  inspectorNik,
  onResolved
}: WorkOrderDetailModalProps) {
  const [wo, setWo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolution form states
  const [isResolving, setIsResolving] = useState(false);
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolutionPhoto, setResolutionPhoto] = useState('');
  const [useSparepart, setUseSparepart] = useState(false);
  const [spareparts, setSpareparts] = useState<{ name: string; qty: string }[]>([{ name: '', qty: '1' }]);
  const [availableSpareparts, setAvailableSpareparts] = useState<string[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedTechs, setSelectedTechs] = useState<{ nik: string; nama: string }[]>([]);
  const [techSearch, setTechSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [waMessageToModal, setWaMessageToModal] = useState('');

  // Fetch WO details
  useEffect(() => {
    if (isOpen && woId) {
      fetchWorkOrder(woId);
      loadEmployeesAndSpareparts();
      setIsResolving(false);
      resetResolutionForm();
    }
  }, [isOpen, woId]);

  const resetResolutionForm = () => {
    setResolveNotes('');
    setResolutionPhoto('');
    setUseSparepart(false);
    setSpareparts([{ name: '', qty: '1' }]);
    setSelectedTechs([]);
    setTechSearch('');
  };

  const loadEmployeesAndSpareparts = async () => {
    try {
      getSpareparts().then(res => setAvailableSpareparts(res || [])).catch(() => {});
      fetch('/api/employees')
        .then(res => res.json())
        .then(data => setEmployees(data || []))
        .catch(() => {});
    } catch (e) {}
  };

  const fetchWorkOrder = async (id: string) => {
    setLoading(true);
    setError(null);
    const cleanId = id.trim().replace(/[.,;:!?)]+$/, '');
    try {
      // 1. Fetch full list of work orders safely first
      const listRes = await fetch('/api/work-orders');
      if (listRes.ok) {
        const ct = listRes.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const list = await listRes.json();
          if (Array.isArray(list) && list.length > 0) {
            if (cleanId === 'LATEST_OPEN_WO' || cleanId.toLowerCase() === 'wo' || cleanId.toLowerCase() === 'fwo') {
              const latest = list.find((item: any) => item.status !== 'Closed') || list[0];
              if (latest) {
                setWo(latest);
                return;
              }
            }

            const q = cleanId.toLowerCase();
            const found = list.find((item: any) => 
              (item.woId && item.woId.toLowerCase() === q) ||
              String(item.id) === cleanId ||
              (item.woId && item.woId.toLowerCase().includes(q)) ||
              (item.equipmentCode && item.equipmentCode.toLowerCase().includes(q)) ||
              (item.equipmentName && item.equipmentName.toLowerCase().includes(q))
            );
            if (found) {
              setWo(found);
              return;
            }
          }
        }
      }

      // 2. Try single endpoint if not in list
      if (cleanId !== 'LATEST_OPEN_WO') {
        const res = await fetch(`/api/work-orders/${encodeURIComponent(cleanId)}`);
        if (res.ok) {
          const ct = res.headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const data = await res.json();
            if (data && (data.woId || data.id)) {
              setWo(data);
              return;
            }
          }
        }
      }
      
      setError(`Work Order [${cleanId === 'LATEST_OPEN_WO' ? 'Terbaru' : cleanId}] belum tercatat atau telah diselesaikan.`);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat data Work Order.');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteWO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wo) return;
    if (!resolveNotes.trim()) {
      return toast.error('Wajib mengisi Catatan Tindakan / Perbaikan yang dilakukan.');
    }

    setIsSubmitting(true);
    toast.loading('Menyimpan penyelesaian Work Order...', { id: 'wo-resolve' });

    try {
      const teknisiString = selectedTechs.length > 0
        ? selectedTechs.map(t => t.nama).join(', ')
        : inspectorName;

      const sparepartNameString = useSparepart && spareparts.filter(s => s.name.trim()).length > 0
        ? spareparts.filter(s => s.name.trim()).map(s => s.name).join(', ')
        : undefined;

      const sparepartQtyString = useSparepart && spareparts.filter(s => s.name.trim()).length > 0
        ? spareparts.filter(s => s.name.trim()).map(s => s.qty || '1').join(', ')
        : undefined;

      const updated = await updateWOStatus(
        wo.woId,
        'Closed',
        resolveNotes,
        teknisiString,
        sparepartNameString,
        sparepartQtyString,
        undefined,
        resolutionPhoto
      );

      toast.success(`Work Order ${wo.woId} berhasil diselesaikan!`, { id: 'wo-resolve' });

      // Update local state to Closed
      setWo((prev: any) => ({
        ...prev,
        status: 'Closed',
        actionTaken: resolveNotes,
        technicianPic: teknisiString,
        sparepartName: sparepartNameString,
        sparepartQty: sparepartQtyString,
        repairEnd: new Date().toISOString(),
        closingPhoto: updated?.closingPhoto || resolutionPhoto
      }));

      setIsResolving(false);

      if (updated && updated.waMessageText) {
        setWaMessageToModal(updated.waMessageText);
      }

      if (onResolved) {
        onResolved();
      }
    } catch (err: any) {
      toast.error(`Gagal menyelesaikan WO: ${err.message}`, { id: 'wo-resolve' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isClosed = wo?.status === 'Closed' || wo?.status === 'Resolved';

  return createPortal(
    <>
      <div 
        className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-2xl max-h-[90vh] my-auto rounded-3xl shadow-2xl border flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
          style={{
            backgroundColor: 'var(--card-bg, #FFFFFF)',
            borderColor: 'var(--border-main, #E2E8F0)',
            color: 'var(--text-main, #1E293B)'
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div 
            className="p-4 border-b flex items-center justify-between shrink-0 select-none"
            style={{
              backgroundColor: 'var(--bg-main, #F8FAFC)',
              borderColor: 'var(--border-main, #E2E8F0)'
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0"
                style={{ backgroundColor: isClosed ? '#10B981' : 'var(--primary, #2A9D8F)' }}
              >
                {isClosed ? <CheckCircle2 className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base sm:text-lg font-display truncate">
                    Detail Work Order
                  </h3>
                  {wo?.woId && (
                    <span 
                      className="font-mono text-xs font-bold px-2 py-0.5 rounded border"
                      style={{ 
                        backgroundColor: 'var(--input-bg, #FFFFFF)',
                        borderColor: 'var(--border-main, #E2E8F0)',
                        color: 'var(--text-main, #1E293B)'
                      }}
                    >
                      {wo.woId}
                    </span>
                  )}
                </div>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted, #64748B)' }}>
                  Informasi kerusakan, aset, pelapor, dan tindak lanjut perbaikan
                </p>
              </div>
            </div>

            <button 
              onClick={onClose}
              className="p-2 rounded-full border shadow-xs transition-transform active:scale-95 cursor-pointer opacity-70 hover:opacity-100"
              style={{
                backgroundColor: 'var(--input-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)',
                color: 'var(--text-muted, #64748B)'
              }}
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Content / Scroll Container */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
            {loading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary, #2A9D8F)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-muted, #64748B)' }}>
                  Memuat data Work Order...
                </p>
              </div>
            ) : error ? (
              <div 
                className="p-5 rounded-2xl border text-center space-y-3"
                style={{
                  backgroundColor: 'var(--input-bg, #FFFFFF)',
                  borderColor: 'var(--border-main, #E2E8F0)'
                }}
              >
                <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
                <h4 className="font-bold text-base">Tidak Dapat Menemukan Work Order</h4>
                <p className="text-xs" style={{ color: 'var(--text-muted, #64748B)' }}>
                  {error}
                </p>
                <Button 
                  onClick={() => woId && fetchWorkOrder(woId)} 
                  variant="secondary"
                  className="!w-auto text-xs mx-auto"
                >
                  Coba Muat Ulang
                </Button>
              </div>
            ) : wo ? (
              <>
                {/* Status & Equipment Hero Card */}
                <div 
                  className="p-4 rounded-2xl border shadow-xs space-y-3"
                  style={{
                    backgroundColor: 'var(--input-bg, #FFFFFF)',
                    borderColor: 'var(--border-main, #E2E8F0)'
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span 
                        className={`text-xs font-bold px-3 py-1 rounded-full border shadow-2xs ${
                          isClosed 
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                            : wo.status === 'In Progress'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                        }`}
                      >
                        ● Status: {wo.status || 'Open'}
                      </span>
                      {wo.category && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase font-mono opacity-75 border" style={{ borderColor: 'var(--border-main)' }}>
                          {wo.category}
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-mono opacity-70 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <Clock className="w-3.5 h-3.5" />
                      {wo.date ? new Date(wo.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                    </div>
                  </div>

                  <div className="pt-1">
                    <h2 className="text-lg sm:text-xl font-bold font-display" style={{ color: 'var(--text-main)' }}>
                      {wo.equipmentName || 'Nama Alat Belum Terisi'}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1 font-semibold">
                        <Tag className="w-3.5 h-3.5 opacity-60" /> No. Alat: {wo.equipmentCode || '-'}
                      </span>
                      <span className="flex items-center gap-1 font-semibold">
                        <MapPin className="w-3.5 h-3.5 opacity-60" /> Lokasi: {wo.location || '-'}
                      </span>
                      <span className="flex items-center gap-1 font-semibold">
                        <User className="w-3.5 h-3.5 opacity-60" /> Pelapor: {wo.requestorName || '-'} {wo.shift ? `(Shift ${wo.shift})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Deskripsi Masalah */}
                <div 
                  className="p-4 rounded-xl border space-y-1.5 shadow-xs"
                  style={{
                    backgroundColor: 'var(--card-bg, #FFFFFF)',
                    borderColor: 'var(--border-main, #E2E8F0)'
                  }}
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--primary)' }}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    Deskripsi Kerusakan / Temuan
                  </h4>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium" style={{ color: 'var(--text-main)' }}>
                    {wo.issueDescription || 'Tidak ada deskripsi kerusakan tertulis.'}
                  </p>
                </div>

                {/* Foto / Dokumen Kerusakan Awal */}
                {(wo.photoUrl || wo.pdfUrl) && (
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    {wo.photoUrl && (
                      <a 
                        href={wo.photoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--border-main)',
                          color: 'var(--primary)'
                        }}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Lihat Foto Kerusakan Awal
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    )}
                    {wo.pdfUrl && (
                      <a 
                        href={wo.pdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 text-rose-500 hover:opacity-80 transition-opacity"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--border-main)'
                        }}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Unduh Dokumen PDF WO
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </a>
                    )}
                  </div>
                )}

                {/* Status Selesai / Resolution Summary */}
                {isClosed && (
                  <div 
                    className="p-4 rounded-2xl border-2 space-y-3 animate-in fade-in"
                    style={{
                      backgroundColor: 'var(--input-bg, #FFFFFF)',
                      borderColor: '#10B981'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Telah Diselesaikan (Closed)
                      </span>
                      {wo.repairEnd && (
                        <span className="text-[11px] font-mono opacity-70" style={{ color: 'var(--text-muted)' }}>
                          Selesai: {new Date(wo.repairEnd).toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold opacity-75" style={{ color: 'var(--text-muted)' }}>
                        Tindakan Perbaikan yang Dilakukan:
                      </p>
                      <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-main)' }}>
                        {wo.actionTaken || '-'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t text-xs" style={{ borderColor: 'var(--border-main)' }}>
                      <div>
                        <span className="opacity-70" style={{ color: 'var(--text-muted)' }}>Teknisi PIC:</span>{' '}
                        <strong className="font-bold">{wo.technicianPic || '-'}</strong>
                      </div>
                      {wo.sparepartName && wo.sparepartName !== '-' && (
                        <div>
                          <span className="opacity-70" style={{ color: 'var(--text-muted)' }}>Sparepart:</span>{' '}
                          <strong className="font-bold">{wo.sparepartName} (Qty: {wo.sparepartQty || 1})</strong>
                        </div>
                      )}
                    </div>

                    {wo.closingPhoto && (
                      <div className="pt-2">
                        <a 
                          href={wo.closingPhoto} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Lihat Foto Bukti Penyelesaian &rarr;
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Form Selesaikan Work Order (Jika status belum Closed) */}
                {!isClosed && (
                  <div className="pt-2">
                    {!isResolving ? (
                      <Button
                        onClick={() => setIsResolving(true)}
                        className="w-full py-3.5 text-sm font-bold text-white shadow-md flex items-center justify-center gap-2 cursor-pointer"
                        style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
                      >
                        <Wrench className="w-4 h-4" />
                        Selesaikan Work Order Ini
                      </Button>
                    ) : (
                      <form 
                        onSubmit={handleCompleteWO}
                        className="p-4 sm:p-5 rounded-2xl border-2 space-y-4 animate-in fade-in zoom-in-95"
                        style={{
                          backgroundColor: 'var(--card-bg)',
                          borderColor: '#10B981'
                        }}
                      >
                        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-main)' }}>
                          <h4 className="font-bold text-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <Wrench className="w-4 h-4" />
                            Form Penyelesaian Work Order
                          </h4>
                          <button
                            type="button"
                            onClick={() => setIsResolving(false)}
                            className="text-xs opacity-70 hover:opacity-100 font-semibold cursor-pointer"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            Batal
                          </button>
                        </div>

                        {/* Foto Bukti Penyelesaian */}
                        <div>
                          <label className="block text-xs font-bold mb-1.5" style={{ color: 'var(--text-main)' }}>
                            Bukti Foto Penyelesaian (Opsional / Dianjurkan)
                          </label>
                          <div className="flex items-center gap-3">
                            <label 
                              className="px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer hover:opacity-90 shadow-2xs"
                              style={{
                                backgroundColor: 'var(--input-bg)',
                                borderColor: 'var(--border-main)',
                                color: 'var(--text-main)'
                              }}
                            >
                              <Camera className="w-4 h-4" />
                              <span>{resolutionPhoto ? 'Ganti Foto' : 'Ambil / Upload Foto'}</span>
                              <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => setResolutionPhoto(reader.result as string);
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            {resolutionPhoto && (
                              <div className="relative w-12 h-12 rounded-lg overflow-hidden border shadow-xs" style={{ borderColor: 'var(--border-main)' }}>
                                <img src={resolutionPhoto} alt="Preview" className="w-full h-full object-cover" />
                                <button 
                                  type="button" 
                                  onClick={() => setResolutionPhoto('')} 
                                  className="absolute top-0 right-0 bg-black/60 text-white p-0.5 hover:bg-rose-500 rounded-bl"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Catatan Tindakan */}
                        <div>
                          <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-main)' }}>
                            Catatan Tindakan / Perbaikan <span className="text-rose-500">*</span>
                          </label>
                          <Textarea 
                            rows={3}
                            placeholder="Contoh: Mengganti bearing yang aus, membersihkan filter udara, dan mengkalibrasi ulang unit..."
                            value={resolveNotes}
                            onChange={e => setResolveNotes(e.target.value)}
                            required
                          />
                        </div>

                        {/* Personil / Teknisi PIC */}
                        <div 
                          className="p-3 rounded-xl border space-y-2"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border-main)'
                          }}
                        >
                          <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                            <Users className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                            Personil / Teknisi yang Mengerjakan
                          </label>
                          
                          <div className="relative">
                            <input 
                              list="modal-employees-list"
                              type="text"
                              placeholder="Ketik nama personil atau default Anda..."
                              value={techSearch}
                              onChange={(e) => {
                                setTechSearch(e.target.value);
                                const match = employees.find(emp => emp.nama === e.target.value || `${emp.nik} - ${emp.nama}` === e.target.value);
                                if (match && !selectedTechs.some(t => t.nik === match.nik)) {
                                  setSelectedTechs([...selectedTechs, match]);
                                  setTechSearch('');
                                }
                              }}
                              className="w-full px-3 py-2 text-xs rounded-lg border outline-none font-semibold"
                              style={{
                                backgroundColor: 'var(--card-bg)',
                                borderColor: 'var(--border-main)',
                                color: 'var(--text-main)'
                              }}
                            />
                            <datalist id="modal-employees-list">
                              {employees.map((emp) => (
                                <option key={emp.nik} value={`${emp.nik} - ${emp.nama}`}>
                                  {emp.jabatan || 'Crew'}
                                </option>
                              ))}
                            </datalist>
                          </div>

                          {selectedTechs.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {selectedTechs.map(t => (
                                <span 
                                  key={t.nik} 
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-white shadow-2xs"
                                  style={{ backgroundColor: 'var(--primary)' }}
                                >
                                  {t.nama}
                                  <X 
                                    className="w-3 h-3 cursor-pointer hover:text-rose-200" 
                                    onClick={() => setSelectedTechs(selectedTechs.filter(x => x.nik !== t.nik))} 
                                  />
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] opacity-70" style={{ color: 'var(--text-muted)' }}>
                              Default: <strong>{inspectorName}</strong>
                            </p>
                          )}
                        </div>

                        {/* Penggunaan Sparepart */}
                        <div 
                          className="p-3 rounded-xl border space-y-2.5"
                          style={{
                            backgroundColor: 'var(--input-bg)',
                            borderColor: 'var(--border-main)'
                          }}
                        >
                          <div 
                            className="flex items-center justify-between cursor-pointer select-none"
                            onClick={() => setUseSparepart(!useSparepart)}
                          >
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              ⚙️ Penggunaan Sparepart
                            </span>
                            <input 
                              type="checkbox"
                              checked={useSparepart}
                              onChange={e => setUseSparepart(e.target.checked)}
                              className="w-4 h-4 cursor-pointer"
                              style={{ accentColor: 'var(--primary)' }}
                            />
                          </div>

                          {useSparepart && (
                            <div className="space-y-2 pt-1 border-t" style={{ borderColor: 'var(--border-main)' }}>
                              {spareparts.map((sp, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                  <input 
                                    list="modal-spareparts-list"
                                    type="text"
                                    placeholder="Pilih / ketik nama sparepart..."
                                    value={sp.name}
                                    onChange={e => {
                                      const updated = [...spareparts];
                                      updated[idx].name = e.target.value;
                                      setSpareparts(updated);
                                    }}
                                    className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border outline-none font-medium"
                                    style={{
                                      backgroundColor: 'var(--card-bg)',
                                      borderColor: 'var(--border-main)',
                                      color: 'var(--text-main)'
                                    }}
                                  />
                                  <datalist id="modal-spareparts-list">
                                    {availableSpareparts.map((item, i) => (
                                      <option key={i} value={item} />
                                    ))}
                                  </datalist>
                                  <input 
                                    type="number"
                                    min="1"
                                    placeholder="Qty"
                                    value={sp.qty}
                                    onChange={e => {
                                      const updated = [...spareparts];
                                      updated[idx].qty = e.target.value;
                                      setSpareparts(updated);
                                    }}
                                    className="w-16 px-2 py-1.5 text-xs rounded-lg border outline-none text-center font-bold"
                                    style={{
                                      backgroundColor: 'var(--card-bg)',
                                      borderColor: 'var(--border-main)',
                                      color: 'var(--text-main)'
                                    }}
                                  />
                                  {spareparts.length > 1 && (
                                    <button 
                                      type="button" 
                                      onClick={() => setSpareparts(spareparts.filter((_, i) => i !== idx))} 
                                      className="p-1 text-rose-500 hover:text-rose-700"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              <button 
                                type="button" 
                                onClick={() => setSpareparts([...spareparts, { name: '', qty: '1' }])}
                                className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline"
                              >
                                + Tambah Sparepart Lain
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Submit button */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsResolving(false)}
                            className="flex-1 text-xs"
                          >
                            Batal
                          </Button>
                          <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-2 text-xs font-bold text-white shadow-md flex items-center justify-center gap-2"
                            style={{ backgroundColor: '#10B981', borderColor: '#10B981' }}
                          >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            Simpan & Selesaikan WO
                          </Button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Modal Footer */}
          <div 
            className="p-3.5 sm:p-4 border-t flex items-center justify-between shrink-0"
            style={{
              backgroundColor: 'var(--bg-main, #F8FAFC)',
              borderColor: 'var(--border-main, #E2E8F0)'
            }}
          >
            <span className="text-[11px] opacity-70" style={{ color: 'var(--text-muted)' }}>
              {wo?.woId ? `ID: ${wo.woId}` : 'Prep & Lab Portal'}
            </span>
            <Button
              onClick={onClose}
              variant="secondary"
              className="!w-auto text-xs px-4 py-2"
              style={{
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-main)'
              }}
            >
              Tutup
            </Button>
          </div>
        </div>
      </div>

      {/* WhatsApp Modal Notification */}
      {waMessageToModal && (
        <WhatsAppModal 
          isOpen={!!waMessageToModal}
          message={waMessageToModal}
          onClose={() => setWaMessageToModal('')}
        />
      )}
    </>,
    document.body
  );
}
