import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, X, Send, Sparkles, Loader2, RefreshCw, Copy, Check, 
  ShieldAlert, BookOpen, Wrench, AlertTriangle, ChevronRight, 
  HelpCircle, MessageSquare, Maximize2, Minimize2, CheckCircle2,
  Info, ShieldCheck, Flame
} from 'lucide-react';
import { Button } from './ui';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { label: '🧪 Tumpahan Asam HF & Kalsium Glukonat', query: 'Bagaimana SOP penanganan jika terjadi tumpahan atau paparan Asam Fluorida (HF) di lab dan cara pakai Kalsium Glukonat?' },
  { label: '⚡ Troubleshooting XRF & Radiasi', query: 'Jelaskan SOP pengoperasian alat XRF Spectrometer, kestabilan gas Helium (flow 1.25 L/min), dan keselamatan radiasi.' },
  { label: '🔨 SOP Pulverizer & Target Mesh', query: 'Berapa target ukuran mesh penggilingan pulverizer untuk sample ore nikel dan bagaimana SOP pembersihan bowl?' },
  { label: '⚖️ Suhu & Kalibrasi Balance Room', query: 'Berapa standar suhu/kelembapan Balance Room dan bagaimana prosedur kalibrasi timbangan analitik 4 desimal?' },
  { label: '🦺 APD Ruang Basah vs Kering', query: 'Jelaskan perbedaan standar APD wajib di ruang preparasi kering (crushing/milling) dan ruang kimia basah (fume hood/asam).' },
  { label: '🔥 Peleburan Sample (Fusion Bead)', query: 'Bagaimana rasio fluks lithium borat dan prosedur pembuatan fusion bead untuk analisis XRF ore nikel?' },
  { label: '🔬 SOP Pengoperasian ICP-OES', query: 'Jelaskan langkah persiapan gas Argon, destruksi sample di lemari asam, dan penyalaan plasma torch pada alat ICP-OES.' },
];

// Rich Text & Markdown Parser Component for Beautiful AI Output
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: { text: string; isNum: boolean; num?: number }[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length === 0) return;
    elements.push(
      <div key={keyPrefix} className="space-y-1.5 my-2 pl-0.5">
        {listItems.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed text-[var(--text-main)]">
            <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
              {item.isNum ? (item.num || idx + 1) : '•'}
            </span>
            <div className="flex-1 min-w-0">{parseInlineFormatting(item.text)}</div>
          </div>
        ))}
      </div>
    );
    listItems = [];
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(`list-${lineIdx}`);
      return;
    }

    // Callout Warning / Danger box (🚨 or ⚠️ or Peringatan)
    if (
      trimmed.startsWith('⚠️') || 
      trimmed.startsWith('🚨') || 
      trimmed.startsWith('> ⚠️') || 
      trimmed.startsWith('> 🚨') ||
      trimmed.toLowerCase().includes('peringatan k3') ||
      trimmed.toLowerCase().includes('bahaya')
    ) {
      flushList(`list-${lineIdx}`);
      const cleanAlertText = trimmed.replace(/^>\s*/, '');
      const isDanger = trimmed.includes('🚨') || cleanAlertText.toLowerCase().includes('bahaya');
      elements.push(
        <div 
          key={`alert-${lineIdx}`} 
          className={`p-3 my-2.5 rounded-xl border text-xs flex items-start gap-2.5 shadow-2xs ${
            isDanger 
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200' 
              : 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
          }`}
        >
          {isDanger ? (
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium leading-relaxed">
            {parseInlineFormatting(cleanAlertText)}
          </div>
        </div>
      );
      return;
    }

    // Markdown Headers (#, ##, ###)
    if (trimmed.startsWith('#')) {
      flushList(`list-${lineIdx}`);
      const headerText = trimmed.replace(/^#+\s*/, '');
      elements.push(
        <div key={`h-${lineIdx}`} className="pt-2 pb-1 my-1 border-b border-[var(--border-main)]">
          <h5 className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {parseInlineFormatting(headerText)}
          </h5>
        </div>
      );
      return;
    }

    // Bullet List Item (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push({ text: trimmed.slice(2), isNum: false });
      return;
    }

    // Numbered List Item (1. 2. 3.)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      listItems.push({ text: numMatch[2], isNum: true, num: parseInt(numMatch[1], 10) });
      return;
    }

    // Standard Paragraph
    flushList(`list-${lineIdx}`);
    elements.push(
      <p key={`p-${lineIdx}`} className="text-xs leading-relaxed text-[var(--text-main)] my-1.5">
        {parseInlineFormatting(trimmed)}
      </p>
    );
  });

  flushList('final-list');

  return <div className="space-y-1">{elements}</div>;
}

// Inline formatting: **bold**, `code`, etc.
function parseInlineFormatting(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-bold text-[var(--text-main)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-[var(--input-bg)] border border-[var(--border-main)] font-mono text-[11px] text-amber-600 dark:text-amber-400 font-bold">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function LabBotWidget({ inspectorName, inspectorNik }: { inspectorName?: string; inspectorNik?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Halo ${inspectorName ? inspectorName.split(' ')[0] : 'Rekan Lab'}! 👋\n\nSaya **LabBot**, asisten cerdas khusus **SOP Laboratorium Preparasi & Keselamatan K3LH** PT Harita Nickel.\n\nAnda dapat menanyakan:\n- 🛠️ **SOP & Troubleshooting Alat** (XRF, ICP, Jaw Crusher, Pulverizer, Oven, Balance)\n- 🧪 **MSDS & Penanganan Bahan Kimia** (HF, HNO3, HCl, Fluks Borat)\n- 🦺 **Standar APD & Prosedur Tanggap Darurat K3**\n\nSilakan pilih topik cepat di atas atau ketik pertanyaan Anda!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen, messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/labbot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history })
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        toast.error(data.error || 'Gagal memuat respon LabBot');
        const errorMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Maaf, terjadi kendala saat menghubungi server AI: ${data.error || 'Silakan coba sesaat lagi.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } catch (err: any) {
      toast.error('Koneksi terputus: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Teks berhasil disalin!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Obrolan di-reset. Ada SOP alat atau panduan K3 lain yang ingin Anda tanyakan? 🧪`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    toast.info('Riwayat obrolan LabBot telah dibersihkan');
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="fixed bottom-20 md:bottom-6 right-5 z-40 flex items-center"
        >
          <button
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 border border-emerald-400/40 cursor-pointer"
            title="Buka Asisten Pintar SOP Lab & K3"
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                <Bot className="w-5 h-5" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 border-2 border-emerald-700 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 border-2 border-emerald-700 rounded-full" />
            </div>

            <div className="text-left hidden sm:block">
              <div className="flex items-center gap-1.5 text-xs font-black tracking-wide">
                <span>LabBot AI</span>
                <span className="text-[9px] bg-amber-400/30 text-amber-200 px-1.5 py-0.2 rounded-full font-bold border border-amber-300/40">
                  SOP & K3
                </span>
              </div>
              <p className="text-[10px] text-emerald-100 opacity-90">Tanya SOP Alat & MSDS</p>
            </div>
          </button>
        </motion.div>
      )}

      {/* Floating Chat Modal / Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed z-50 transition-all duration-300 ${
              isExpanded 
                ? 'inset-3 sm:inset-6 md:inset-10' 
                : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[94vw] sm:w-[480px] md:w-[520px] h-[84vh] sm:h-[660px] max-h-[92vh]'
            }`}
          >
            <div className="flex flex-col h-full bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
              {/* Header */}
              <div className="px-4 py-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white flex items-center justify-between shadow-md shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
                    <Bot className="w-5 h-5 text-white" />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-emerald-700 rounded-full" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm leading-tight text-white flex items-center gap-1.5">
                        LabBot AI
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      </h4>
                      <span className="text-[9px] bg-white/20 text-emerald-100 px-1.5 py-0.2 rounded font-semibold">
                        SOP & K3 Lab
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-100/90 leading-tight">
                      PT Harita Nickel • DeepSeek AI Engine
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-white/90">
                  <button
                    onClick={handleResetChat}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                    title="Bersihkan Obrolan"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors hidden sm:block"
                    title={isExpanded ? 'Perkecil' : 'Perbesar'}
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                    title="Tutup Chat"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Quick Prompts Carousel (Scrollbar cleanly hidden) */}
              <div className="p-2.5 bg-[var(--input-bg)]/60 border-b border-[var(--border-main)] shrink-0 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden flex gap-1.5">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    disabled={isLoading}
                    onClick={() => handleSendMessage(qp.query)}
                    className="px-3 py-1.5 text-[11px] font-medium rounded-full bg-[var(--card-bg)] hover:bg-emerald-500/15 text-[var(--text-main)] hover:text-emerald-600 dark:hover:text-emerald-400 border border-[var(--border-main)] hover:border-emerald-500/40 shrink-0 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
                  >
                    <span>{qp.label}</span>
                  </button>
                ))}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-500/20">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div className={`max-w-[88%] sm:max-w-[84%] space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`p-3.5 rounded-2xl relative group ${
                            isUser
                              ? 'bg-emerald-600 text-white rounded-tr-xs shadow-xs'
                              : 'bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-main)] rounded-tl-xs shadow-2xs'
                          }`}
                        >
                          {/* Rich Formatted Message Content */}
                          {isUser ? (
                            <div className="whitespace-pre-wrap leading-relaxed font-medium">
                              {msg.content}
                            </div>
                          ) : (
                            <FormattedMessage content={msg.content} />
                          )}

                          {/* Copy button for Assistant messages */}
                          {!isUser && (
                            <button
                              onClick={() => handleCopy(msg.id, msg.content)}
                              className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-opacity shadow-2xs cursor-pointer"
                              title="Salin jawaban"
                            >
                              {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>

                        <span className={`text-[10px] text-[var(--text-muted)] block ${isUser ? 'text-right' : 'text-left'} px-1`}>
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-2.5 justify-start animate-in fade-in duration-200">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="p-3.5 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-main)] rounded-tl-xs flex items-center gap-2 shadow-2xs">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                      <span className="text-[11px] text-[var(--text-muted)] font-medium">LabBot sedang memproses SOP & pedoman K3...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area (Proportional, Balanced, Theme-Aligned) */}
              <div className="p-3 bg-[var(--card-bg)] border-t border-[var(--border-main)] shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2 bg-[var(--input-bg)] rounded-xl p-1.5 border border-[var(--border-main)] focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Tanyakan SOP alat, MSDS kimia, atau K3..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-0 outline-hidden text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] px-2.5 py-1.5"
                  />

                  <Button
                    type="submit"
                    disabled={!inputText.trim() || isLoading}
                    className="h-9 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs transition-all disabled:opacity-40 shrink-0 flex items-center justify-center cursor-pointer"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default LabBotWidget;
