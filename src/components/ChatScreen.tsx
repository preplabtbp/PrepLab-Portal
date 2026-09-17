import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Send, User, Users, Globe, Building2, X, Sparkles, 
  ShieldCheck, CheckCheck, MessageSquare, Flame, Filter, ChevronDown, AtSign
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

const SECTIONS_LIST = [
  { id: 'preparation', name: 'Preparation', label: 'Prep' },
  { id: 'laboratory', name: 'Laboratory', label: 'Lab' },
  { id: 'maintenance', name: 'Maintenance', label: 'Maint' },
  { id: 'quality_assurance', name: 'Quality Assurance', label: 'QA' },
  { id: 'administration', name: 'Administration', label: 'Admin' },
  { id: 'inventory_control', name: 'Inventory Control', label: 'Inventory' },
];

function normalizeSection(rawSection?: string): string {
  const s = (rawSection || '').toLowerCase();
  if (s.includes('prep') || s.includes('preparasi')) return 'preparation';
  if (s.includes('lab') || s.includes('laboratorium')) return 'laboratory';
  if (s.includes('maint') || s.includes('pemeliharaan')) return 'maintenance';
  if (s.includes('qa') || s.includes('quality')) return 'quality_assurance';
  if (s.includes('admin') || s.includes('adm')) return 'administration';
  if (s.includes('inv') || s.includes('inventory') || s.includes('gudang')) return 'inventory_control';
  return 'preparation';
}

function getSectionDisplayName(sectionId: string): string {
  const found = SECTIONS_LIST.find(s => s.id === sectionId);
  return found ? found.name : 'General';
}

interface ChatScreenProps {
  inspectorName: string;
  inspectorNik: string;
  userProfile?: any;
  isDeveloper?: boolean;
  onClose?: () => void;
}

export default function ChatScreen({
  inspectorName,
  inspectorNik,
  userProfile,
  isDeveloper = false,
  onClose
}: ChatScreenProps) {
  const [activeTab, setActiveTab] = useState<'global' | 'section'>('global');
  
  // User's own section
  const userSectionId = useMemo(() => {
    return normalizeSection(userProfile?.section || userProfile?.department);
  }, [userProfile]);

  // Selected section for section chat (Developer can change, regular locked to userSectionId)
  const [selectedSectionId, setSelectedSectionId] = useState<string>(userSectionId);

  // Active room computed
  const activeRoom = useMemo(() => {
    if (activeTab === 'global') return 'global';
    return `section_${selectedSectionId}`;
  }, [activeTab, selectedSectionId]);

  const [messages, setMessages] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [mentionedNiks, setMentionedNiks] = useState<Set<string>>(new Set());

  // Autocomplete / Mention state
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionCursorIndex, setMentionCursorIndex] = useState(-1);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch employees list for mention candidates
  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEmployeesList(data);
        }
      })
      .catch(err => {
        console.error('Failed to load employees for mention:', err);
      });
  }, []);

  // Connect socket once
  useEffect(() => {
    const socket = io();
    socketRef.current = socket;

    socket.on('online_users', (users) => {
      setOnlineUsers(users || []);
    });

    socket.on('new_message', (msg) => {
      if (msg && msg.room === activeRoom) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    });

    socket.on('chat:mention', (data) => {
      toast.info(`💬 ${data.senderName} menyebut Anda di chat: "${data.text?.slice(0, 80)}"`, {
        duration: 4500
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [activeRoom]);

  // Handle room changes & load chat history
  useEffect(() => {
    setLoadingHistory(true);
    fetch(`/api/chat/${activeRoom}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
        } else {
          setMessages([]);
        }
      })
      .catch(err => {
        console.error('Failed to load chat history:', err);
        setMessages([]);
      })
      .finally(() => setLoadingHistory(false));

    // Emit join room
    if (socketRef.current) {
      socketRef.current.emit('join', {
        nik: inspectorNik,
        name: inspectorName,
        department: userProfile?.section || 'General',
        room: activeRoom
      });
    }
  }, [activeRoom, inspectorNik, inspectorName, userProfile]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter mention candidates based on mentionQuery
  const filteredMentionCandidates = useMemo(() => {
    const q = mentionQuery.toLowerCase().trim();
    const results: any[] = [];

    // '@All' option
    if (!q || 'all'.includes(q) || 'semua'.includes(q)) {
      results.push({
        name: 'Semua (All)',
        nik: 'all',
        isAll: true,
        department: activeTab === 'global' ? 'Global' : getSectionDisplayName(selectedSectionId)
      });
    }

    const matches = employeesList.filter(emp => {
      const name = (emp.name || emp.nama || '').toLowerCase();
      const nik = (emp.nik || '').toLowerCase();
      const dept = (emp.department || emp.section || emp.divisi || '').toLowerCase();
      if (emp.nik === inspectorNik) return false;
      if (!q) return true;
      return name.includes(q) || nik.includes(q) || dept.includes(q);
    });

    matches.sort((a, b) => {
      if (activeTab === 'section') {
        const aSec = normalizeSection(a.department || a.section);
        const bSec = normalizeSection(b.department || b.section);
        if (aSec === selectedSectionId && bSec !== selectedSectionId) return -1;
        if (bSec === selectedSectionId && aSec !== selectedSectionId) return 1;
      }
      return (a.name || a.nama || '').localeCompare(b.name || b.nama || '');
    });

    results.push(...matches.slice(0, 8).map(emp => ({
      name: emp.name || emp.nama,
      nik: emp.nik,
      department: emp.department || emp.section || emp.divisi,
      jabatan: emp.jabatan || emp.position
    })));

    return results;
  }, [employeesList, mentionQuery, activeTab, selectedSectionId, inspectorNik]);

  // Input change handler detecting '@'
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart || val.length;
    setText(val);

    const textBeforeCursor = val.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1) {
      const query = textBeforeCursor.slice(atIndex + 1);
      // Allow mention query if no newline and doesn't contain space before cursor
      if (!query.includes('\n') && !query.includes(' ') && query.length < 25) {
        setMentionQuery(query);
        setMentionCursorIndex(atIndex);
        setShowMentionPopup(true);
        setMentionSelectedIndex(0);
        return;
      }
    }
    setShowMentionPopup(false);
  };

  // Keyboard navigation on mention popup
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showMentionPopup || filteredMentionCandidates.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionSelectedIndex(prev => (prev + 1) % filteredMentionCandidates.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionSelectedIndex(prev => (prev - 1 + filteredMentionCandidates.length) % filteredMentionCandidates.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (filteredMentionCandidates[mentionSelectedIndex]) {
        e.preventDefault();
        handleSelectMention(filteredMentionCandidates[mentionSelectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowMentionPopup(false);
    }
  };

  // Insert mention into input text
  const handleSelectMention = (cand: { name: string; nik: string; isAll?: boolean }) => {
    const atPos = mentionCursorIndex !== -1 ? mentionCursorIndex : text.lastIndexOf('@');
    const textBeforeAt = atPos >= 0 ? text.slice(0, atPos) : text;
    const textAfterAt = atPos >= 0 ? text.slice(atPos + 1) : '';
    const spaceIndex = textAfterAt.indexOf(' ');
    const textRest = spaceIndex !== -1 ? textAfterAt.slice(spaceIndex) : '';

    const mentionTag = `@${cand.name} `;
    const nextText = `${textBeforeAt}${mentionTag}${textRest}`;

    setText(nextText);
    if (cand.nik && !cand.isAll) {
      setMentionedNiks(prev => new Set(prev).add(cand.nik));
    }
    setShowMentionPopup(false);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = (textBeforeAt + mentionTag).length;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };

  // Click '@' quick button
  const triggerMention = () => {
    setText(prev => {
      const prefix = prev.endsWith(' ') || prev.length === 0 ? prev : `${prev} `;
      return `${prefix}@`;
    });
    setMentionQuery('');
    setMentionCursorIndex(text.length + (text.endsWith(' ') || text.length === 0 ? 0 : 1));
    setShowMentionPopup(true);
    setMentionSelectedIndex(0);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  // Click user name to mention
  const handleMentionUser = (targetName: string, targetNik?: string) => {
    setText(prev => {
      const prefix = prev.endsWith(' ') || prev.length === 0 ? prev : `${prev} `;
      return `${prefix}@${targetName} `;
    });
    if (targetNik) {
      setMentionedNiks(prev => new Set(prev).add(targetNik));
    }
    inputRef.current?.focus();
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !socketRef.current) return;

    socketRef.current.emit('send_message', {
      room: activeRoom,
      senderNik: inspectorNik,
      senderName: inspectorName,
      text: text.trim(),
      mentionedNiks: Array.from(mentionedNiks)
    });
    setText('');
    setMentionedNiks(new Set());
    setShowMentionPopup(false);
  };

  // Helper to render text with formatted mention pills
  const renderFormattedText = (content: string, currentName: string, currentNik: string, isMeMessage: boolean) => {
    if (!content) return null;

    const parts = content.split(/(@[a-zA-Z0-9_\u00C0-\u017F]+(?:\s+[a-zA-Z0-9_\u00C0-\u017F]+)?)/g);

    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const rawTarget = part.slice(1).trim().toLowerCase();
        const isAll = rawTarget === 'all' || rawTarget === 'semua';
        const isMeTarget = isAll || 
          rawTarget === currentNik.toLowerCase() || 
          (currentName && rawTarget.includes(currentName.toLowerCase().split(' ')[0])) ||
          (currentName && currentName.toLowerCase().includes(rawTarget));

        return (
          <span
            key={i}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 mx-0.5 rounded-md font-bold text-[11px] sm:text-xs transition-all ${
              isMeMessage
                ? 'bg-white/25 text-white border border-white/40 shadow-2xs'
                : isMeTarget
                ? 'bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/50 shadow-2xs font-black'
                : 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-500/30'
            }`}
          >
            <AtSign className="w-2.5 h-2.5 inline shrink-0 opacity-80" />
            <span>{part.slice(1)}</span>
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div 
      className="flex flex-col h-full w-full select-none"
      style={{
        backgroundColor: 'var(--bg-main, #F8FAFC)',
        color: 'var(--text-main, #1E293B)'
      }}
    >
      {/* ── HEADER ── */}
      <div 
        className="px-4 sm:px-6 py-3.5 border-b shrink-0 flex flex-col gap-3 shadow-xs"
        style={{
          backgroundColor: 'var(--card-bg, #FFFFFF)',
          borderColor: 'var(--border-main, #E2E8F0)'
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 text-white flex items-center justify-center shadow-md shadow-teal-500/25">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold font-display tracking-tight text-[var(--text-main)]">
                  PrepLab Chat Room
                </h2>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                {onlineUsers.length} pengguna online di room ini
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-[var(--border-main)] hover:bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              title="Tutup Chat"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ── CHAT CHANNEL TABS (GLOBAL VS SECTION) ── */}
        <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)]">
          <button
            type="button"
            onClick={() => setActiveTab('global')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'global'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Global Chat</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('section')}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'section'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>
              Section Chat {!isDeveloper && `(${getSectionDisplayName(userSectionId)})`}
            </span>
          </button>
        </div>

        {/* ── DEVELOPER SECTION SWITCHER (Only visible in Section Chat for Dev) ── */}
        {activeTab === 'section' && (
          <div className="pt-1">
            {isDeveloper ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Dev Switcher: Pilih Section
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Aktif: <strong>{getSectionDisplayName(selectedSectionId)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {SECTIONS_LIST.map((sec) => {
                    const isSelected = selectedSectionId === sec.id;
                    return (
                      <button
                        key={sec.id}
                        type="button"
                        onClick={() => setSelectedSectionId(sec.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all border cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 shadow-2xs scale-105'
                            : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border-main)] hover:text-[var(--text-main)] hover:border-slate-300'
                        }`}
                      >
                        {sec.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-800 dark:text-teal-300 text-xs">
                <Users className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="font-semibold truncate">
                  Ruang Obrolan Section <strong>{getSectionDisplayName(userSectionId)}</strong>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── ONLINE USERS BAR (Click to Mention) ── */}
      {onlineUsers.length > 0 && (
        <div 
          className="px-4 sm:px-6 py-2 border-b flex items-center gap-2 overflow-x-auto scrollbar-hide text-xs"
          style={{
            backgroundColor: 'var(--card-bg, #FFFFFF)',
            borderColor: 'var(--border-main, #E2E8F0)'
          }}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] shrink-0 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Online:
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {onlineUsers.slice(0, 10).map((u, idx) => (
              <button
                key={`${u.nik}-${idx}`}
                type="button"
                onClick={() => handleMentionUser(u.name || u.nik, u.nik)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[var(--input-bg)] hover:bg-teal-500/15 border border-[var(--border-main)] hover:border-teal-500/40 text-[11px] font-medium transition-colors cursor-pointer"
                title={`Klik untuk mention ${u.name || u.nik} (${u.department || 'User'})`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate max-w-[80px]">{u.name?.split(' ')[0] || u.nik}</span>
              </button>
            ))}
            {onlineUsers.length > 10 && (
              <span className="text-[10px] font-bold text-[var(--text-muted)]">
                +{onlineUsers.length - 10} lainnya
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── MESSAGES FEED ── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5">
        {loadingHistory ? (
          <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] text-xs gap-2">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span>Memuat pesan riwayat...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-[var(--text-muted)] p-6">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center mb-2">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-[var(--text-main)]">Belum ada percakapan</p>
            <p className="text-xs mt-0.5">
              Ketik @ untuk menyebut personil atau jadilah yang pertama mengirimkan pesan!
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.senderNik === inspectorNik;
            const timeStr = msg.timestamp
              ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            const isMentioned = !isMe && (
              (msg.mentionedNiks && msg.mentionedNiks.includes(inspectorNik)) ||
              (msg.text && (
                msg.text.toLowerCase().includes(`@${inspectorName.toLowerCase()}`) ||
                (userProfile?.name && msg.text.toLowerCase().includes(`@${userProfile.name.toLowerCase()}`)) ||
                msg.text.toLowerCase().includes(`@${inspectorNik.toLowerCase()}`) ||
                msg.text.toLowerCase().includes('@all') ||
                msg.text.toLowerCase().includes('@semua')
              ))
            );

            return (
              <motion.div
                key={msg.id || idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                {!isMe && (
                  <div className="flex items-center gap-1.5 mb-1 px-1">
                    <button
                      type="button"
                      onClick={() => handleMentionUser(msg.senderName || msg.senderNik, msg.senderNik)}
                      className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                      title={`Klik untuk mention ${msg.senderName || msg.senderNik}`}
                    >
                      <span>{msg.senderName || msg.senderNik}</span>
                    </button>
                    {msg.senderNik === '02D25000055' || msg.senderNik === '02D24000043' || msg.senderNik === 'preplabadmin' ? (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        DEV
                      </span>
                    ) : null}
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed shadow-xs transition-all ${
                    isMe
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-br-xs'
                      : isMentioned
                      ? 'bg-amber-500/10 border-2 border-amber-500/50 text-[var(--text-main)] rounded-bl-xs ring-2 ring-amber-500/20 shadow-md'
                      : 'bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-main)] rounded-bl-xs'
                  }`}
                >
                  {isMentioned && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 mb-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Menyebut Anda</span>
                    </div>
                  )}

                  <p className="whitespace-pre-wrap break-words">
                    {renderFormattedText(msg.text, inspectorName, inspectorNik, isMe)}
                  </p>

                  <div
                    className={`text-[9px] mt-1 text-right font-mono select-none ${
                      isMe ? 'text-teal-100/80' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {timeStr}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT BAR WITH AUTOCOMPLETE MENTION DROPDOWN ── */}
      <div 
        className="p-3 sm:p-4 border-t shrink-0 relative"
        style={{
          backgroundColor: 'var(--card-bg, #FFFFFF)',
          borderColor: 'var(--border-main, #E2E8F0)'
        }}
      >
        {/* Floating Mention Autocomplete Popup */}
        <AnimatePresence>
          {showMentionPopup && filteredMentionCandidates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-3 right-3 sm:left-4 sm:right-4 mb-2 max-h-60 overflow-y-auto rounded-2xl border shadow-2xl p-1.5 space-y-1 z-30"
              style={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)'
              }}
            >
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between border-b border-[var(--border-main)]">
                <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                  <AtSign className="w-3 h-3" />
                  Sebut Personil (Mention)
                </span>
                <span className="text-[9px] font-normal text-[var(--text-muted)]">
                  Gunakan ↑ ↓ dan Enter
                </span>
              </div>

              {filteredMentionCandidates.map((cand, idx) => (
                <button
                  key={cand.nik || idx}
                  type="button"
                  onClick={() => handleSelectMention(cand)}
                  onMouseEnter={() => setMentionSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-left transition-colors cursor-pointer ${
                    mentionSelectedIndex === idx
                      ? 'bg-teal-500/15 text-teal-900 dark:text-teal-100 font-bold'
                      : 'hover:bg-[var(--input-bg)] text-[var(--text-main)]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-xl bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center text-xs shrink-0">
                      {cand.isAll ? <Users className="w-3.5 h-3.5" /> : (cand.name ? cand.name.charAt(0).toUpperCase() : '?')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate leading-tight">
                        {cand.name}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] truncate">
                        {cand.isAll ? 'Semua anggota dalam room ini' : `${cand.nik} • ${cand.jabatan || cand.department || 'Personil'}`}
                      </p>
                    </div>
                  </div>

                  {cand.department && !cand.isAll && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-main)] shrink-0">
                      {cand.department}
                    </span>
                  )}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSend} className="flex items-center gap-2">
          {/* Quick @ Button */}
          <button
            type="button"
            onClick={triggerMention}
            className="p-2.5 rounded-2xl border border-[var(--border-main)] hover:border-teal-500 hover:text-teal-600 text-[var(--text-muted)] transition-colors cursor-pointer shrink-0 bg-[var(--input-bg)]"
            title="Sebut / Mention Personil (@)"
          >
            <AtSign className="w-4 h-4" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Ketik pesan di ${activeTab === 'global' ? 'Global Chat' : getSectionDisplayName(selectedSectionId)} (ketik @ untuk mention)...`}
            className="flex-1 rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 border transition-all"
            style={{
              backgroundColor: 'var(--input-bg, #FFFFFF)',
              borderColor: 'var(--border-main, #E2E8F0)',
              color: 'var(--text-main, #1E293B)'
            }}
          />

          <button
            type="submit"
            disabled={!text.trim()}
            className="p-2.5 rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white disabled:opacity-40 disabled:hover:scale-100 active:scale-95 transition-all shadow-md shadow-teal-500/25 cursor-pointer shrink-0"
            title="Kirim Pesan"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
