import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Users, User, Shield, Layers, FlaskConical, Wrench, ShieldCheck, CheckCircle, Radio } from 'lucide-react';

interface ChatUser {
  nik: string;
  name: string;
  jabatan?: string;
  section?: string;
  department?: string;
  avatar?: string;
}

interface ChatGroup {
  id: string;
  name: string;
  description: string;
  badge: string;
  icon?: string;
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserNik: string;
  onlineNiks: string[];
  onSelectUser: (user: ChatUser) => void;
  onSelectGroup: (group: ChatGroup) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  currentUserNik,
  onlineNiks,
  onSelectUser,
  onSelectGroup,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([
      fetch('/api/chat/users').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/chat/groups').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([usersData, groupsData]) => {
        setUsers(usersData || []);
        setGroups(groupsData || []);
      })
      .catch((err) => console.error('Failed to load chat users/groups:', err))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => u.nik !== currentUserNik)
      .filter(
        (u) =>
          !q ||
          u.name?.toLowerCase().includes(q) ||
          u.nik?.toLowerCase().includes(q) ||
          u.jabatan?.toLowerCase().includes(q) ||
          u.department?.toLowerCase().includes(q) ||
          u.section?.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        // Sort online first, then alphabetically
        const aOnline = onlineNiks.includes(a.nik) ? 1 : 0;
        const bOnline = onlineNiks.includes(b.nik) ? 1 : 0;
        if (aOnline !== bOnline) return bOnline - aOnline;
        return (a.name || '').localeCompare(b.name || '');
      });
  }, [users, search, currentUserNik, onlineNiks]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter(
      (g) =>
        !q ||
        g.name.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.badge.toLowerCase().includes(q)
    );
  }, [groups, search]);

  const renderGroupIcon = (badge: string) => {
    switch (badge) {
      case 'Preparation':
        return <Layers className="w-5 h-5 text-amber-500" />;
      case 'Laboratory':
        return <FlaskConical className="w-5 h-5 text-cyan-500" />;
      case 'Maintenance':
        return <Wrench className="w-5 h-5 text-emerald-500" />;
      case 'QA/IC':
        return <ShieldCheck className="w-5 h-5 text-purple-500" />;
      default:
        return <Users className="w-5 h-5 text-indigo-500" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-t-2xl">
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <span className="p-1.5 bg-white/20 rounded-lg">
                <Users className="w-4 h-4 text-white" />
              </span>
              Mulai Percakapan Baru
            </h3>
            <p className="text-xs text-indigo-100 mt-0.5">
              Pilih rekan kerja untuk pesan pribadi atau gabung ke grup divisi
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-1.5 gap-1.5">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'users'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            Pribadi ({filteredUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'groups'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200/80 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            Grup Tim ({filteredGroups.length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeTab === 'users' ? 'Cari nama, NIK, jabatan, atau divisi...' : 'Cari grup divisi...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60 min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
              <div className="w-7 h-7 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Memuat direktori...</span>
            </div>
          ) : activeTab === 'users' ? (
            filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Tidak ada rekan kerja yang cocok dengan pencarian "{search}"
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isOnline = onlineNiks.includes(user.nik);
                return (
                  <button
                    key={user.nik}
                    onClick={() => {
                      onSelectUser(user);
                      onClose();
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-indigo-50/70 dark:hover:bg-slate-800/80 flex items-center gap-3 transition-colors text-left group"
                  >
                    {/* Avatar with Live Online Badge */}
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-700 text-white font-bold flex items-center justify-center shadow-sm">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <span>{(user.name || '?').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                          isOnline ? 'bg-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-900 animate-pulse' : 'bg-slate-400'
                        }`}
                        title={isOnline ? 'Online sekarang' : 'Offline'}
                      />
                    </div>

                    {/* Information */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {user.name}
                        </p>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                            isOnline
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        <span className="font-mono text-[11px] text-slate-400">#{user.nik}</span>
                        <span>•</span>
                        <span className="truncate">{user.jabatan || user.section || 'Staff'}</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )
          ) : filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Tidak ada grup tim yang cocok dengan pencarian
            </div>
          ) : (
            filteredGroups.map((group) => (
              <button
                key={group.id}
                onClick={() => {
                  onSelectGroup(group);
                  onClose();
                }}
                className="w-full p-3 rounded-xl hover:bg-indigo-50/70 dark:hover:bg-slate-800/80 flex items-center gap-3.5 transition-colors text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                  {renderGroupIcon(group.badge)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {group.name}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-medium">
                      {group.badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {group.description}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {onlineNiks.length} personel online saat ini
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 font-medium text-slate-600 dark:text-slate-300"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
};
