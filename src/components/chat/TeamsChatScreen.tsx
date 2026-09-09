import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare, Users, User, Send, Search, Plus, ArrowLeft,
  Smile, ShieldCheck, Wrench, Layers, FlaskConical, Circle,
  CheckCircle2, Clock, Phone, Video, Info, MoreVertical, RefreshCw
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { NewChatModal } from './NewChatModal';

interface TeamsChatScreenProps {
  inspectorName: string;
  inspectorNik: string;
  inspectorRole?: string;
  inspectorSection?: string;
}

interface ChatMessage {
  id: number;
  room: string;
  senderNik: string;
  senderName: string;
  text: string;
  timestamp: string;
}

interface ConversationItem {
  id: string; // room id, e.g. group_all or direct_123_456
  type: 'group' | 'direct';
  name: string;
  subtitle?: string;
  badge?: string;
  otherNik?: string;
  avatar?: string;
  lastMessage?: {
    text: string;
    senderName: string;
    timestamp: string;
  } | null;
}

export default function TeamsChatScreen({
  inspectorName,
  inspectorNik,
  inspectorRole,
  inspectorSection,
}: TeamsChatScreenProps) {
  const [activeRoom, setActiveRoom] = useState<string>('group_all');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'groups' | 'direct'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);

  // Presence state
  const [onlineNiks, setOnlineNiks] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<{ [room: string]: string[] }>({});

  // Directories & active conversations
  const [chatUsers, setChatUsers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [directConversations, setDirectConversations] = useState<any[]>([]);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Helper for deterministic direct room IDs
  const getDirectRoomId = (nik1: string, nik2: string) => {
    const sorted = [nik1, nik2].sort();
    return `direct_${sorted[0]}_${sorted[1]}`;
  };

  // 1. Initialize Socket.IO connection and global presence listeners
  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Announce online presence to server
      socket.emit('user:online', {
        nik: inspectorNik,
        name: inspectorName,
        jabatan: inspectorRole,
        section: inspectorSection,
      });
    });

    // Listen for presence updates from server
    socket.on('presence:update', ({ onlineNiks: updatedNiks }: { onlineNiks: string[] }) => {
      setOnlineNiks(updatedNiks || []);
    });

    socket.on('presence:sync', ({ onlineNiks: syncedNiks }: { onlineNiks: string[] }) => {
      setOnlineNiks(syncedNiks || []);
    });

    // Handle new incoming messages
    socket.on('new_message', (msg: ChatMessage) => {
      setMessages((prev) => {
        // Prevent duplicate appending if id matches
        if (prev.some((m) => m.id === msg.id)) return prev;
        if (msg.room === activeRoom) {
          return [...prev, msg];
        }
        return prev;
      });

      // Update last message in active list
      loadConversations();
    });

    // Typing notifications
    socket.on('user_typing', ({ room, name, nik }: { room: string; name: string; nik: string }) => {
      if (nik === inspectorNik) return;
      setTypingUsers((prev) => ({
        ...prev,
        [room]: Array.from(new Set([...(prev[room] || []), name])),
      }));
    });

    socket.on('user_stop_typing', ({ room, nik, name }: { room: string; nik: string; name?: string }) => {
      setTypingUsers((prev) => ({
        ...prev,
        [room]: (prev[room] || []).filter((u) => u !== name),
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [inspectorNik, inspectorName, inspectorRole, inspectorSection]);

  // 2. Fetch users directory, groups, and conversation history list
  const loadConversations = () => {
    if (!inspectorNik) return;
    Promise.all([
      fetch('/api/chat/users').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/chat/groups').then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/chat/conversations/${inspectorNik}`).then((r) => (r.ok ? r.json() : { groups: [], activeDirectRooms: [] })),
    ])
      .then(([usersData, groupsData, convData]) => {
        setChatUsers(usersData || []);
        setGroups(convData.groups || groupsData || []);
        setDirectConversations(convData.activeDirectRooms || []);
      })
      .catch((err) => console.error('Error loading conversations:', err));
  };

  useEffect(() => {
    loadConversations();
  }, [inspectorNik]);

  // 3. Switch active room and load message history
  useEffect(() => {
    if (!activeRoom) return;

    if (socketRef.current) {
      socketRef.current.emit('join_room', activeRoom);
    }

    setLoadingMessages(true);
    fetch(`/api/chat/messages/${activeRoom}?limit=100`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setMessages(data || []);
      })
      .catch((err) => console.error('Error loading room messages:', err))
      .finally(() => setLoadingMessages(false));
  }, [activeRoom]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // Send message handler
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputMessage.trim();
    if (!text || !socketRef.current) return;

    // Emit stop typing
    socketRef.current.emit('stop_typing', { room: activeRoom, nik: inspectorNik });

    socketRef.current.emit('send_message', {
      room: activeRoom,
      senderNik: inspectorNik,
      senderName: inspectorName,
      text,
    });

    setInputMessage('');
  };

  // Handle typing indicator trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    if (!socketRef.current) return;

    socketRef.current.emit('typing', {
      room: activeRoom,
      name: inspectorName,
      nik: inspectorNik,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('stop_typing', {
        room: activeRoom,
        nik: inspectorNik,
      });
    }, 1500);
  };

  // Handle quick emoji addition
  const addQuickEmoji = (emoji: string) => {
    setInputMessage((prev) => prev + emoji);
  };

  // Construct active conversation metadata
  const currentConversation = useMemo(() => {
    if (activeRoom.startsWith('group_')) {
      const g = groups.find((grp) => grp.id === activeRoom);
      return {
        type: 'group' as const,
        id: activeRoom,
        name: g?.name || 'Saluran Grup',
        badge: g?.badge || 'Grup',
        description: g?.description || 'Percakapan grup tim PrepLab',
        isOnline: true,
      };
    } else if (activeRoom.startsWith('direct_')) {
      const parts = activeRoom.replace('direct_', '').split('_');
      const otherNik = parts.find((n) => n !== inspectorNik) || parts[0];
      const otherUser = chatUsers.find((u) => u.nik === otherNik);
      const isOnline = onlineNiks.includes(otherNik);

      return {
        type: 'direct' as const,
        id: activeRoom,
        name: otherUser?.name || `Karyawan (${otherNik})`,
        badge: otherUser?.department || otherUser?.section || 'Staff',
        description: otherUser?.jabatan || 'Pesan Pribadi Langsung',
        avatar: otherUser?.avatar,
        otherNik,
        isOnline,
      };
    }
    return null;
  }, [activeRoom, groups, chatUsers, inspectorNik, onlineNiks]);

  // Combine groups and direct chats for the left panel list
  const conversationItems: ConversationItem[] = useMemo(() => {
    const list: ConversationItem[] = [];

    // 1. Add Default / Configured Groups
    groups.forEach((g) => {
      list.push({
        id: g.id,
        type: 'group',
        name: g.name,
        subtitle: g.description,
        badge: g.badge,
        lastMessage: g.lastMessage,
      });
    });

    // 2. Add Direct Chats
    directConversations.forEach((dc) => {
      const user = chatUsers.find((u) => u.nik === dc.otherNik);
      list.push({
        id: dc.roomId,
        type: 'direct',
        name: user?.name || `Karyawan (${dc.otherNik})`,
        subtitle: user?.jabatan || user?.section || `NIK: ${dc.otherNik}`,
        badge: user?.department || 'Direct',
        otherNik: dc.otherNik,
        avatar: user?.avatar,
        lastMessage: dc.lastMessage,
      });
    });

    return list;
  }, [groups, directConversations, chatUsers]);

  // Filter conversations
  const filteredConversations = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    return conversationItems.filter((item) => {
      if (filterTab === 'groups' && item.type !== 'group') return false;
      if (filterTab === 'direct' && item.type !== 'direct') return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        (item.otherNik && item.otherNik.toLowerCase().includes(q))
      );
    });
  }, [conversationItems, filterTab, searchFilter]);

  const selectUserDirectChat = (user: any) => {
    const roomId = getDirectRoomId(inspectorNik, user.nik);
    // Add to direct conversations if not exists
    if (!directConversations.some((c) => c.roomId === roomId)) {
      setDirectConversations((prev) => [
        {
          roomId,
          otherNik: user.nik,
          lastMessage: null,
        },
        ...prev,
      ]);
    }
    setActiveRoom(roomId);
    setIsMobileListVisible(false);
  };

  const selectGroupChat = (group: any) => {
    setActiveRoom(group.id);
    setIsMobileListVisible(false);
  };

  // Helper formatting for timestamps
  const formatTime = (ts: string) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDateLabel = (ts: string) => {
    if (!ts) return '';
    try {
      const d = new Date(ts);
      const today = new Date();
      if (d.toDateString() === today.toDateString()) return 'Hari Ini';
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);
      if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
      return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-slate-100 dark:bg-slate-950 overflow-hidden font-sans">
      {/* 1. Teams Left Icon Rail (Desktop only) */}
      <div className="hidden md:flex flex-col items-center justify-between w-16 bg-[#464EB8] dark:bg-[#333775] text-white py-4 shadow-md z-20 flex-shrink-0">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Teams Logo Icon */}
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white shadow-inner tracking-wider">
            TL
          </div>

          {/* Nav Icons */}
          <button
            title="Obrolan Teams"
            className="w-11 h-11 rounded-xl bg-white/25 flex flex-col items-center justify-center text-xs gap-0.5 relative shadow-sm"
          >
            <MessageSquare className="w-5 h-5 text-white" />
            <span className="text-[9px] font-medium">Obrolan</span>
          </button>

          <button
            onClick={() => setIsNewChatOpen(true)}
            title="Pesan Baru"
            className="w-11 h-11 rounded-xl hover:bg-white/15 flex flex-col items-center justify-center text-xs gap-0.5 text-white/80 hover:text-white transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-[9px] font-medium">Baru</span>
          </button>
        </div>

        {/* User Presence Avatar in Rail */}
        <div className="relative group cursor-pointer" title={`${inspectorName} (Online)`}>
          <div className="w-9 h-9 rounded-full bg-indigo-200 text-indigo-900 font-bold flex items-center justify-center text-sm shadow-sm">
            {(inspectorName || '?').charAt(0).toUpperCase()}
          </div>
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#464EB8] dark:border-[#333775]" />
        </div>
      </div>

      {/* 2. Conversations List Sidebar */}
      <div
        className={`${
          isMobileListVisible ? 'flex' : 'hidden'
        } md:flex flex-col w-full md:w-80 lg:w-96 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-10 flex-shrink-0 h-full`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Obrolan
            </h2>
            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {onlineNiks.length} Online
            </span>
          </div>

          <button
            onClick={() => setIsNewChatOpen(true)}
            title="Mulai Pesan Baru"
            className="p-2 rounded-xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-slate-700 transition-colors shadow-xs"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari obrolan..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-3 pt-2 pb-1 flex gap-1.5 border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              filterTab === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterTab('groups')}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              filterTab === 'groups'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Grup Tim
          </button>
          <button
            onClick={() => setFilterTab('direct')}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              filterTab === 'direct'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Pribadi
          </button>
        </div>

        {/* Conversation Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              Tidak ada percakapan ditemukan.
            </div>
          ) : (
            filteredConversations.map((item) => {
              const isActive = activeRoom === item.id;
              const isDirect = item.type === 'direct';
              const isUserOnline = isDirect && item.otherNik ? onlineNiks.includes(item.otherNik) : false;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveRoom(item.id);
                    setIsMobileListVisible(false);
                  }}
                  className={`w-full p-3 flex items-start gap-3 text-left transition-colors relative ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-600'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {/* Left Avatar / Icon */}
                  <div className="relative flex-shrink-0 mt-0.5">
                    {isDirect ? (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-bold flex items-center justify-center shadow-xs">
                        {item.avatar ? (
                          <img
                            src={item.avatar}
                            alt={item.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span>{(item.name || '?').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
                        {item.badge === 'Preparation' && <Layers className="w-5 h-5 text-amber-500" />}
                        {item.badge === 'Laboratory' && <FlaskConical className="w-5 h-5 text-cyan-500" />}
                        {item.badge === 'Maintenance' && <Wrench className="w-5 h-5 text-emerald-500" />}
                        {item.badge === 'QA/IC' && <ShieldCheck className="w-5 h-5 text-purple-500" />}
                        {!['Preparation', 'Laboratory', 'Maintenance', 'QA/IC'].includes(item.badge || '') && (
                          <Users className="w-5 h-5 text-indigo-600" />
                        )}
                      </div>
                    )}

                    {/* Online indicator dot for direct chats */}
                    {isDirect && (
                      <span
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                          isUserOnline ? 'bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-900' : 'bg-slate-400'
                        }`}
                        title={isUserOnline ? 'Online' : 'Offline'}
                      />
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {item.name}
                      </p>
                      {item.lastMessage?.timestamp && (
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {formatTime(item.lastMessage.timestamp)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      {isDirect && (
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-full font-medium ${
                            isUserOnline
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {isUserOnline ? 'Online' : 'Offline'}
                        </span>
                      )}
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1">
                        {item.lastMessage ? (
                          <span>
                            <strong className="font-medium text-slate-700 dark:text-slate-300">
                              {item.lastMessage.senderName === inspectorName ? 'Anda: ' : `${item.lastMessage.senderName}: `}
                            </strong>
                            {item.lastMessage.text}
                          </span>
                        ) : (
                          item.subtitle || 'Belum ada pesan'
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Main Chat Conversation Panel */}
      <div
        className={`${
          !isMobileListVisible ? 'flex' : 'hidden'
        } md:flex flex-col flex-1 bg-white dark:bg-slate-900 h-full overflow-hidden`}
      >
        {/* Chat Top Header */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shadow-xs z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Back Button */}
            <button
              onClick={() => setIsMobileListVisible(true)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Conversation Avatar */}
            <div className="relative flex-shrink-0">
              {currentConversation?.type === 'direct' ? (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-bold flex items-center justify-center shadow-xs">
                  {currentConversation.avatar ? (
                    <img
                      src={currentConversation.avatar}
                      alt={currentConversation.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span>{(currentConversation.name || '?').charAt(0).toUpperCase()}</span>
                  )}
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Users className="w-5 h-5" />
                </div>
              )}

              {/* Header Online Indicator */}
              {currentConversation?.type === 'direct' && (
                <span
                  className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                    currentConversation.isOnline
                      ? 'bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-900 animate-pulse'
                      : 'bg-slate-400'
                  }`}
                />
              )}
            </div>

            {/* Title & Status */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-slate-800 dark:text-slate-100 truncate">
                  {currentConversation?.name}
                </h3>
                {currentConversation?.type === 'direct' && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      currentConversation.isOnline
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {currentConversation.isOnline ? 'Online' : 'Offline'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {currentConversation?.type === 'direct'
                  ? `${currentConversation.badge} • NIK: ${currentConversation.otherNik}`
                  : currentConversation?.description}
              </p>
            </div>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setLoadingMessages(true);
                fetch(`/api/chat/messages/${activeRoom}?limit=100`)
                  .then((r) => r.json())
                  .then((d) => setMessages(d))
                  .finally(() => setLoadingMessages(false));
              }}
              title="Refresh obrolan"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/60 dark:bg-slate-950/40">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full text-slate-400 text-xs gap-2">
              <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>Memuat riwayat pesan...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 max-w-sm mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center text-indigo-600 mb-3 shadow-sm">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">
                Mulai Percakapan di {currentConversation?.name}
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Ketik pesan pertama Anda di bawah ini untuk memulai koordinasi tim atau obrolan santai.
              </p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = msg.senderNik === inspectorNik;
              const prevMsg = messages[index - 1];
              const showDateSeparator =
                !prevMsg || formatDateLabel(prevMsg.timestamp) !== formatDateLabel(msg.timestamp);

              return (
                <React.Fragment key={msg.id || index}>
                  {showDateSeparator && (
                    <div className="flex items-center justify-center my-4">
                      <span className="px-3 py-1 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-semibold rounded-full shadow-2xs">
                        {formatDateLabel(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  <div className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-2xs">
                        {(msg.senderName || '?').charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div className={`max-w-[85%] sm:max-w-[70%] space-y-1`}>
                      {!isMe && (
                        <div className="flex items-center gap-2 pl-1">
                          <span className="font-semibold text-xs text-indigo-700 dark:text-indigo-400">
                            {msg.senderName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      )}

                      <div
                        className={`p-3 rounded-2xl shadow-xs text-sm leading-relaxed ${
                          isMe
                            ? 'bg-[#5B5FC7] text-white rounded-tr-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700/80 rounded-tl-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        {isMe && (
                          <div className="flex justify-end items-center gap-1 mt-1 text-[10px] text-indigo-200">
                            <span>{formatTime(msg.timestamp)}</span>
                            <CheckCircle2 className="w-3 h-3 text-indigo-200" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}

          {/* Typing Indicator */}
          {typingUsers[activeRoom]?.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pl-1 pt-1 italic">
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                <span
                  className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0.2s' }}
                />
                <span
                  className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce"
                  style={{ animationDelay: '0.4s' }}
                />
              </span>
              <span>
                {typingUsers[activeRoom].join(', ')} sedang mengetik...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box (Teams Style) */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          {/* Quick Reaction Bar */}
          <div className="flex items-center gap-1.5 mb-2 overflow-x-auto pb-1">
            {['👍', '❤️', '👏', '🎉', '🔥', '🙏', '✅', '☕'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => addQuickEmoji(emoji)}
                className="px-2 py-0.5 text-sm rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={`Kirim ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
            <div className="relative flex items-center bg-slate-100 dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
              <textarea
                rows={1}
                placeholder="Ketik pesan baru... (Enter kirim, Shift+Enter baris baru)"
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                className="w-full px-4 py-2.5 bg-transparent border-none text-sm text-slate-800 dark:text-white focus:outline-none resize-none max-h-32"
              />

              <div className="flex items-center gap-1 pr-2 flex-shrink-0">
                <button
                  type="submit"
                  disabled={!inputMessage.trim()}
                  className={`p-2 rounded-lg transition-all ${
                    inputMessage.trim()
                      ? 'bg-[#5B5FC7] hover:bg-[#464EB8] text-white shadow-sm'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                  title="Kirim pesan"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>
                Ruangan: <strong className="text-slate-600 dark:text-slate-300">{currentConversation?.name}</strong>
              </span>
              <span>Tekan Enter untuk kirim</span>
            </div>
          </form>
        </div>
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        currentUserNik={inspectorNik}
        onlineNiks={onlineNiks}
        onSelectUser={selectUserDirectChat}
        onSelectGroup={selectGroupChat}
      />
    </div>
  );
}
