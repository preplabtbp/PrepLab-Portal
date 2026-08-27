import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { 
  FileText, Send, Paperclip, Download, Eye, CheckCircle2, Clock, 
  Users, AlertTriangle, ShieldCheck, Filter, Search, Sparkles, Pin, 
  MessageSquare, ChevronRight, Share2, RefreshCw, ExternalLink, UserCheck, UserX, MessageCircle, X, Trash2, RotateCcw, Calendar
} from 'lucide-react';
import { Card, Button, Input, Select } from './ui';
import { PageHeader } from './PageHeader';

interface GroupReportProps {
  inspectorName: string;
  inspectorNik: string;
  inspectorRole?: string;
  inspectorSection?: string;
  onClose?: () => void;
  isFloating?: boolean;
  isDeveloper?: boolean;
}

export function GroupReportScreen({ inspectorName, inspectorNik, inspectorRole, inspectorSection, onClose, isFloating = false, isDeveloper = false }: GroupReportProps) {
  const [activeTab, setActiveTab] = useState<'feed' | 'rekap'>('feed');
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [textInput, setTextInput] = useState('');
  const [pdfTitleInput, setPdfTitleInput] = useState('');
  const [pdfUrlInput, setPdfUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);

  // Rekap State & Week Filter
  const [selectedWeek, setSelectedWeek] = useState<string>('W35');
  const [rekapSummary, setRekapSummary] = useState<{ total: number; sudah: number; belum: number; percentage: number; selectedWeek?: string }>({ total: 0, sudah: 0, belum: 0, percentage: 0 });
  const [rekapList, setRekapList] = useState<any[]>([]);
  const [loadingRekap, setLoadingRekap] = useState(false);
  const [searchRekap, setSearchRekap] = useState('');
  const [rekapFilterStatus, setRekapFilterStatus] = useState<'ALL' | 'SUDAH' | 'BELUM'>('ALL');

  // Interactive PDF Viewer Modal State
  const [pdfModal, setPdfModal] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    senderName?: string;
  }>({
    isOpen: false,
    url: '',
    title: '',
    senderName: ''
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto detect developer status by NIK pattern if not passed
  const isDevUser = isDeveloper || inspectorNik.startsWith('02D24') || inspectorNik === '02D24000043';

  useEffect(() => {
    fetchGroupFeed();
    fetchRekapData(selectedWeek);
  }, [selectedWeek]);

  const fetchGroupFeed = async () => {
    try {
      setLoadingFeed(true);
      const res = await fetch('/api/group-reports');
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching group feed:', err);
    } finally {
      setLoadingFeed(false);
    }
  };

  const fetchRekapData = async (week: string = selectedWeek) => {
    try {
      setLoadingRekap(true);
      const res = await fetch(`/api/rekap-inspeksi?week=${week}`);
      if (res.ok) {
        const data = await res.json();
        setRekapSummary(data.summary || { total: 0, sudah: 0, belum: 0, percentage: 0 });
        setRekapList(data.rekapList || []);
      }
    } catch (err) {
      console.error('Error fetching rekap data:', err);
    } finally {
      setLoadingRekap(false);
    }
  };

  const openPdfModal = (url: string, title: string, senderName?: string) => {
    if (!url || url === '#') {
      toast.error('Tautan dokumen PDF belum tersedia.');
      return;
    }
    setPdfModal({
      isOpen: true,
      url,
      title: title || 'Dokumen Laporan Inspeksi',
      senderName
    });
  };

  const closePdfModal = () => {
    setPdfModal({ isOpen: false, url: '', title: '', senderName: '' });
  };

  const getPdfEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return '';
    
    // Extract file ID from google drive URLs
    const fileIdMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }

    if (rawUrl.startsWith('http')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`;
    }

    return rawUrl;
  };

  const handlePostReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim() && !pdfUrlInput.trim()) {
      toast.error('Tulis pesan atau cantumkan URL PDF laporan!');
      return;
    }

    try {
      setIsSubmitting(true);
      const titleWithWeek = pdfTitleInput.trim() 
        ? `${pdfTitleInput.trim()} (${selectedWeek})` 
        : `INSPECTION REPORT (${selectedWeek})`;

      const res = await fetch('/api/group-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderNik: inspectorNik,
          senderName: inspectorName,
          senderRole: inspectorRole || inspectorSection || 'Inspector',
          text: textInput,
          type: pdfUrlInput.trim() ? 'pdf_report' : 'text',
          pdfTitle: titleWithWeek,
          pdfSubTitle: `Laporan Inspeksi - ${inspectorName}`,
          pdfUrl: pdfUrlInput.trim() || null,
          pdfFileName: `Laporan_Inspeksi_${selectedWeek}.pdf`,
          week: selectedWeek
        })
      });

      if (res.ok) {
        toast.success('Laporan PDF berhasil dikirim ke grup!');
        setTextInput('');
        setPdfTitleInput('');
        setPdfUrlInput('');
        setShowAttachModal(false);
        fetchGroupFeed();
        fetchRekapData(selectedWeek);
      }
    } catch (err: any) {
      toast.error('Gagal mengirim ke grup: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm('Hapus pesan laporan ini dari grup?')) return;
    try {
      const res = await fetch(`/api/group-reports/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Pesan laporan telah dihapus.');
        fetchGroupFeed();
        fetchRekapData(selectedWeek);
      }
    } catch (err: any) {
      toast.error('Gagal menghapus pesan: ' + err.message);
    }
  };

  const handleResetRekap = async () => {
    if (!window.confirm(`Reset seluruh rekapan & pesan laporan untuk ${selectedWeek}?`)) return;
    try {
      const res = await fetch('/api/group-reports/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week: selectedWeek })
      });
      if (res.ok) {
        toast.success(`Rekapan & pesan grup ${selectedWeek} berhasil di-reset!`);
        fetchGroupFeed();
        fetchRekapData(selectedWeek);
      }
    } catch (err: any) {
      toast.error('Gagal mereset rekapan: ' + err.message);
    }
  };

  const filteredRekap = rekapList.filter(emp => {
    const matchSearch = emp.name.toLowerCase().includes(searchRekap.toLowerCase()) || emp.nik.toLowerCase().includes(searchRekap.toLowerCase());
    const matchStatus = rekapFilterStatus === 'ALL' ? true : emp.status === rekapFilterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className={`flex flex-col text-[var(--text-main)] ${isFloating ? 'h-full' : 'space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 w-full max-w-4xl mx-auto px-2 sm:px-4'}`}>
      
      {/* ── GROUP HEADER BANNER ── */}
      <div className={`bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl p-3.5 sm:p-4 shadow-xl backdrop-blur-md overflow-hidden relative shrink-0 ${isFloating ? 'rounded-b-none border-x-0 border-t-0' : ''}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Group Icon Avatar */}
            <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-emerald-600/20 shrink-0 border border-emerald-400/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black tracking-tight text-[var(--text-main)] font-display truncate">
                Pelaporan Hazard Safety
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => { fetchGroupFeed(); fetchRekapData(selectedWeek); }}
              className="h-8 px-2 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] text-[11px] font-bold flex items-center gap-1 transition-colors"
              title="Segarkan Feed & Rekap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
            
            {isDevUser && (
              <button
                onClick={handleResetRekap}
                className="h-8 px-2 rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/30 hover:bg-rose-500/20 text-[11px] font-bold flex items-center gap-1 transition-colors"
                title="Developer: Reset Rekapan & Chat"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            {isFloating && onClose && (
              <button 
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors font-bold shrink-0"
                title="Tutup Popup"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* PINNED ANNOUNCEMENT BAR */}
        <div className="mt-3 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-2xl p-2.5 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
          <Pin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 leading-tight text-[11px]">
            <span className="font-bold text-amber-600 dark:text-amber-400 mr-1">Pak Aldy:</span>
            <span>Terlampir Jadwal Inspeksi Periode Week 34 &amp; 35. Dimohon untuk unggah PDF hasil inspeksi Anda ke grup ini.</span>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="mt-3 flex items-center bg-[var(--input-bg)] border border-[var(--border-main)] p-1 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'feed'
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Laporan PDF ({messages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rekap')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'rekap'
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Rekap ({rekapSummary.percentage}%)</span>
          </button>
        </div>
      </div>

      {/* ── TAB CONTENT 1: FEED & PDF LAPORAN ── */}
      {activeTab === 'feed' && (
        <div className={`flex flex-col ${isFloating ? 'flex-1 min-h-0 overflow-hidden' : 'space-y-4'}`}>
          
          {/* Messages Feed Container */}
          <div className={`bg-[var(--card-bg)] border border-[var(--border-main)] p-3 sm:p-4 space-y-4 overflow-y-auto ${isFloating ? 'flex-1 rounded-none border-x-0 border-t-0' : 'rounded-3xl shadow-xl min-h-[380px]'}`}>
            <div className="text-center my-1 flex justify-center items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-main)] font-mono">
                Pesan &amp; Laporan PDF
              </span>
            </div>

            {loadingFeed ? (
              <div className="py-12 text-center text-[var(--text-muted)] text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[var(--primary)]" />
                <span>Memuat postingan laporan...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center text-[var(--text-muted)] text-xs">
                Belum ada laporan PDF yang dikirim.
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.senderNik === inspectorNik;
                const isPdf = msg.type === 'pdf_report' || Boolean(msg.pdfUrl);

                return (
                  <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}>
                    
                    <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-[var(--text-muted)]">
                      <span className="text-[var(--primary)] font-bold">{msg.senderName}</span>
                      <span>•</span>
                      <span className="opacity-75">{msg.senderRole}</span>
                      {msg.week && (
                        <span className="ml-1 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30">
                          {msg.week}
                        </span>
                      )}
                    </div>

                    <div className={`max-w-[92%] sm:max-w-md w-full rounded-2xl p-3 shadow-sm border relative group ${
                      isMe 
                        ? 'bg-[var(--card-bg)] border-[var(--primary)]/40 text-[var(--text-main)] rounded-tr-xs' 
                        : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-main)] rounded-tl-xs'
                    }`}>
                      
                      {/* Developer Trash Button */}
                      {isDevUser && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity shadow-md z-10"
                          title="Developer: Hapus Pesan Ini"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}

                      {msg.text && (
                        <p className="text-xs leading-relaxed font-medium mb-2 whitespace-pre-wrap">
                          {msg.text}
                        </p>
                      )}

                      {isPdf && (
                        <div className="bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl p-2.5 space-y-2">
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center justify-center shrink-0 font-bold">
                              <FileText className="w-4 h-4" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-[11px] text-[var(--text-main)] truncate uppercase font-mono">
                                {msg.pdfTitle || 'HAZARD REPORT / INSPEKSI'}
                              </h4>
                              <p className="text-[10px] text-[var(--text-muted)] truncate">
                                {msg.pdfSubTitle || msg.pdfFileName || 'Dokumen PDF Laporan'}
                              </p>
                            </div>
                          </div>

                          {msg.photos && msg.photos.length > 0 && (
                            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                              {msg.photos.map((pUrl: string, pIdx: number) => (
                                <img key={pIdx} src={pUrl} alt="Temuan" className="w-16 h-12 object-cover rounded-lg border border-[var(--border-main)] shrink-0" />
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border-main)]">
                            <button
                              onClick={() => openPdfModal(msg.pdfUrl, msg.pdfTitle, msg.senderName)}
                              className="flex-1 py-1 px-2.5 rounded-lg bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs hover:opacity-90 transition-opacity"
                            >
                              <Eye className="w-3.5 h-3.5" /> Pratinjau PDF
                            </button>

                            {msg.pdfUrl && msg.pdfUrl !== '#' && (
                              <a
                                href={getPdfEmbedUrl(msg.pdfUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 px-2 rounded-lg bg-[var(--input-bg)] text-[var(--text-main)] border border-[var(--border-main)] text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-[var(--bg-main)] transition-colors"
                                title="Buka di Tab Baru (Viewer)"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}

                            <button
                              onClick={() => {
                                const waText = encodeURIComponent(`*${msg.pdfTitle}*\nDikirim oleh: ${msg.senderName}\n${msg.text}\nLink PDF: ${msg.pdfUrl || '-'}`);
                                window.open(`https://wa.me/?text=${waText}`, '_blank');
                              }}
                              className="py-1 px-2.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-700 transition-colors shadow-xs"
                            >
                              <Share2 className="w-3 h-3" /> WA
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1 mt-1.5 text-[9px] text-[var(--text-muted)]">
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Input Bar */}
          <div className={`bg-[var(--card-bg)] border border-[var(--border-main)] p-2.5 sm:p-3 shrink-0 ${isFloating ? 'rounded-b-3xl rounded-t-none border-x-0 border-b-0' : 'rounded-3xl shadow-xl'}`}>
            <form onSubmit={handlePostReport} className="space-y-2">
              
              {showAttachModal && (
                <div className="bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl p-2.5 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[var(--text-main)] flex items-center gap-1">
                      <Paperclip className="w-3.5 h-3.5 text-[var(--primary)]" /> Form PDF Laporan ({selectedWeek})
                    </span>
                    <button type="button" onClick={() => setShowAttachModal(false)} className="text-[10px] text-rose-500 font-bold hover:underline">
                      Tutup
                    </button>
                  </div>
                  <Input 
                    placeholder={`Judul PDF (misal: HAZARD REPORT ${selectedWeek})`} 
                    value={pdfTitleInput}
                    onChange={e => setPdfTitleInput(e.target.value)}
                    className="bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-main)] text-[11px]"
                  />
                  <Input 
                    placeholder="URL Link PDF" 
                    value={pdfUrlInput}
                    onChange={e => setPdfUrlInput(e.target.value)}
                    className="bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-main)] text-[11px] font-mono"
                  />
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowAttachModal(!showAttachModal)}
                  className={`p-2 rounded-xl border transition-all ${
                    showAttachModal 
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-xs' 
                      : 'bg-[var(--input-bg)] text-[var(--text-muted)] border-[var(--border-main)] hover:text-[var(--text-main)]'
                  }`}
                  title="Lampirkan File PDF"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <Input
                  placeholder="Ketik pesan atau hasil inspeksi..."
                  value={textInput}
                  onChange={e => setTextInput(e.target.value)}
                  className="flex-1 bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] text-xs rounded-xl h-9"
                />

                <Button
                  type="submit"
                  disabled={isSubmitting || (!textInput.trim() && !pdfUrlInput.trim())}
                  className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white h-9 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1 shadow-xs shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB CONTENT 2: REKAP KEPATUHAN INSPEKSI ── */}
      {activeTab === 'rekap' && (
        <div className={`flex flex-col ${isFloating ? 'flex-1 min-h-0 overflow-y-auto p-3' : 'space-y-4'}`}>
          
          {/* WEEK SELECTOR DROPDOWN */}
          <div className="bg-[var(--input-bg)] border border-[var(--border-main)] rounded-2xl p-2.5 flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-main)]">
              <Calendar className="w-4 h-4 text-[var(--primary)] shrink-0" />
              <span>Periode Rekap:</span>
            </div>

            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-main)] text-xs font-bold font-mono px-3 py-1.5 rounded-xl shadow-xs focus:ring-2 focus:ring-[var(--primary)] outline-none"
            >
              <option value="W34">Week 34 (18-24 Ags)</option>
              <option value="W35">Week 35 (25-31 Ags) [Aktif]</option>
              <option value="W36">Week 36 (01-07 Sep)</option>
              <option value="W37">Week 37 (08-14 Sep)</option>
              <option value="ALL">Semua Minggu (Kumulatif)</option>
            </select>
          </div>

          {/* Summary Dashboard Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <Card className="p-2.5 bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-main)] text-center">
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Total Personil</p>
              <h3 className="text-lg font-black text-[var(--text-main)]">{rekapSummary.total}</h3>
            </Card>

            <Card className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-center">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-300 font-bold uppercase">Sudah Inspeksi</p>
              <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400">{rekapSummary.sudah}</h3>
            </Card>

            <Card className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-center">
              <p className="text-[10px] text-amber-600 dark:text-amber-300 font-bold uppercase">Belum Inspeksi</p>
              <h3 className="text-lg font-black text-amber-600 dark:text-amber-400">{rekapSummary.belum}</h3>
            </Card>

            <Card className="p-2.5 bg-[var(--card-bg)] border border-[var(--border-main)] text-center">
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">% {selectedWeek}</p>
              <h3 className="text-lg font-black text-[var(--primary)]">{rekapSummary.percentage}%</h3>
            </Card>
          </div>

          {/* Search & Status Filter */}
          <div className="space-y-2 mb-3">
            <Input
              placeholder="Cari nama atau NIK personil..."
              value={searchRekap}
              onChange={e => setSearchRekap(e.target.value)}
              className="bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-main)] text-xs h-9 rounded-xl"
            />

            <div className="flex items-center justify-between gap-1 overflow-x-auto">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setRekapFilterStatus('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                    rekapFilterStatus === 'ALL'
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'
                  }`}
                >
                  Semua ({rekapList.length})
                </button>
                <button
                  onClick={() => setRekapFilterStatus('SUDAH')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                    rekapFilterStatus === 'SUDAH'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'
                  }`}
                >
                  ✅ Sudah ({rekapSummary.sudah})
                </button>
                <button
                  onClick={() => setRekapFilterStatus('BELUM')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                    rekapFilterStatus === 'BELUM'
                      ? 'bg-amber-600 text-white'
                      : 'bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'
                  }`}
                >
                  ⏳ Belum ({rekapSummary.belum})
                </button>
              </div>

              {isDevUser && (
                <button
                  onClick={handleResetRekap}
                  className="px-2 py-1 rounded-lg bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 hover:bg-rose-500/20 shrink-0"
                >
                  <RotateCcw className="w-3 h-3" /> Reset {selectedWeek}
                </button>
              )}
            </div>
          </div>

          {/* Rekap List Cards */}
          <div className="space-y-2">
            {loadingRekap ? (
              <div className="py-8 text-center text-[var(--text-muted)] text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[var(--primary)]" />
                <span>Memuat rekap {selectedWeek}...</span>
              </div>
            ) : filteredRekap.length === 0 ? (
              <div className="py-8 text-center text-[var(--text-muted)] text-xs">
                Tidak ada data personil yang cocok.
              </div>
            ) : (
              filteredRekap.map((emp, i) => {
                const isDone = emp.status === 'SUDAH';
                return (
                  <div 
                    key={emp.nik || i}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 text-xs ${
                      isDone 
                        ? 'bg-emerald-500/5 border-emerald-500/30 text-[var(--text-main)]' 
                        : 'bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-main)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isDone ? 'bg-emerald-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}>
                        {emp.name.charAt(0)}
                      </div>

                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-[var(--text-main)] truncate">{emp.name}</h5>
                        <p className="text-[10px] text-[var(--text-muted)] truncate">
                          {emp.nik} • {emp.section} • <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">Gol {emp.gol}</span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-1">
                      {isDone ? (
                        <>
                          <button
                            onClick={() => openPdfModal(emp.pdfUrl, `Laporan Inspeksi - ${emp.name}`, emp.name)}
                            className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs hover:bg-emerald-700 transition-colors"
                          >
                            <Eye className="w-3 h-3" /> PDF
                          </button>
                          {emp.pdfUrl && emp.pdfUrl !== '#' && (
                            <a
                              href={emp.pdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 rounded-lg bg-[var(--input-bg)] text-[var(--text-main)] border border-[var(--border-main)] text-[10px] font-bold flex items-center justify-center transition-colors"
                              title="Buka di Tab Baru"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            const textWA = encodeURIComponent(`Halo ${emp.name}, pengingat untuk mengunggah PDF Laporan Inspeksi ${selectedWeek} Anda ke Grup Safety PrepLab. Terima kasih!`);
                            window.open(`https://wa.me/?text=${textWA}`, '_blank');
                          }}
                          className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 shadow-xs"
                        >
                          <MessageCircle className="w-3 h-3" /> Ingatkan
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── INTERACTIVE PDF VIEWER MODAL ── */}
      {pdfModal.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="p-3 sm:p-4 border-b border-[var(--border-main)] flex items-center justify-between gap-2 shrink-0 bg-[var(--card-bg)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/30 flex items-center justify-center font-bold shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-[var(--text-main)] truncate uppercase font-mono">
                    {pdfModal.title}
                  </h3>
                  {pdfModal.senderName && (
                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                      Inspektor: {pdfModal.senderName}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={getPdfEmbedUrl(pdfModal.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 px-2.5 rounded-xl bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-main)] text-[11px] font-bold flex items-center gap-1 transition-colors"
                  title="Buka di Tab Baru (Viewer)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tab Baru</span>
                </a>

                <button
                  onClick={closePdfModal}
                  className="w-8 h-8 rounded-xl bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors font-bold shrink-0"
                  title="Tutup Pratinjau PDF"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Embedded Iframe Viewer */}
            <div className="flex-1 bg-slate-900 relative min-h-0 w-full">
              <iframe
                src={getPdfEmbedUrl(pdfModal.url)}
                className="w-full h-full border-0 rounded-b-3xl"
                title="PDF Viewer"
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

{/* ── FLOATING POPUP WIDGET COMPONENT (BOTTOM-RIGHT CORNER) ── */}
export function GroupReportFloatingWidget({ inspectorName, inspectorNik, inspectorRole, inspectorSection, isDeveloper = false }: {
  inspectorName: string;
  inspectorNik: string;
  inspectorRole?: string;
  inspectorSection?: string;
  isDeveloper?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* FLOATING CHAT ICON BUTTON (POSITIONED ABOVE BOTTOM NAVBAR) */}
      <div className="fixed bottom-24 right-4 sm:bottom-24 sm:right-6 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group relative w-13 h-13 sm:w-14 sm:h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 border-2 border-white/30 ring-4 ring-emerald-500/20"
          title="Grup Safety & Rekap PDF"
        >
          {/* Notification Badge */}
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-md animate-bounce">
            •
          </span>

          <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        </button>
      </div>

      {/* FLOATING POPUP DRAWER WINDOW (POSITIONED ABOVE BOTTOM NAVBAR) */}
      {isOpen && (
        <div className="fixed bottom-[6.5rem] right-4 sm:bottom-[6.5rem] sm:right-6 w-[calc(100vw-32px)] sm:w-[420px] h-[540px] z-50 bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 fade-in duration-300">
          <GroupReportScreen
            inspectorName={inspectorName}
            inspectorNik={inspectorNik}
            inspectorRole={inspectorRole}
            inspectorSection={inspectorSection}
            onClose={() => setIsOpen(false)}
            isFloating={true}
            isDeveloper={isDeveloper}
          />
        </div>
      )}
    </>
  );
}
