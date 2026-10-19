import React, { useState, useEffect, useRef } from 'react';
import { 
  Pin, 
  GripVertical, 
  Check, 
  Plus, 
  Palette, 
  Bell, 
  UserPlus, 
  Image as ImageIcon, 
  Archive, 
  MoreVertical, 
  Undo2, 
  Redo2, 
  Trash2, 
  X, 
  ChevronDown, 
  ChevronRight,
  ListTodo,
  FileText,
  Clock,
  Sparkles,
  Copy,
  CheckCheck
} from 'lucide-react';
import { StickyNotesSettings, WidgetSize } from './types';
import { getGlobalSocket } from '../../lib/socketClient';

// ==========================================
// GOOGLE KEEP AUTHENTIC COLOR PALETTE
// ==========================================
export interface KeepColorDef {
  id: string;
  name: string;
  bgLight: string;
  bgDark: string;
  borderLight: string;
  borderDark: string;
  textLight: string;
  textDark: string;
  dotClass: string;
}

export const KEEP_COLORS: Record<string, KeepColorDef> = {
  default: {
    id: 'default',
    name: 'Putih (Default)',
    bgLight: 'bg-white',
    bgDark: 'dark:bg-[#202124]',
    borderLight: 'border-slate-200',
    borderDark: 'dark:border-[#5f6368]',
    textLight: 'text-slate-900',
    textDark: 'dark:text-[#e8eaed]',
    dotClass: 'bg-white border border-slate-300'
  },
  coral: {
    id: 'coral',
    name: 'Karang (Coral)',
    bgLight: 'bg-[#faafa8]',
    bgDark: 'dark:bg-[#77172e]',
    borderLight: 'border-[#f3958c]',
    borderDark: 'dark:border-[#962640]',
    textLight: 'text-slate-900',
    textDark: 'dark:text-[#fce8e6]',
    dotClass: 'bg-[#faafa8]'
  },
  peach: {
    id: 'peach',
    name: 'Persik (Peach)',
    bgLight: 'bg-[#f39f76]',
    bgDark: 'dark:bg-[#692b17]',
    borderLight: 'border-[#e8885a]',
    borderDark: 'dark:border-[#85371e]',
    textLight: 'text-slate-900',
    textDark: 'dark:text-[#feefe3]',
    dotClass: 'bg-[#f39f76]'
  },
  sand: {
    id: 'sand',
    name: 'Pasir (Sand/Yellow)',
    bgLight: 'bg-[#fff8b8]',
    bgDark: 'dark:bg-[#7c4a03]',
    borderLight: 'border-[#ede38b]',
    borderDark: 'dark:border-[#995d08]',
    textLight: 'text-slate-900',
    textDark: 'dark:text-[#fef7e0]',
    dotClass: 'bg-[#fff8b8]'
  },
  mint: {
    id: 'mint',
    name: 'Mint (Hijau Lembut)',
    bgLight: 'bg-[#e2f6d3]',
    bgDark: 'dark:bg-[#264d3b]',
    borderLight: 'border-[#c6e8b2]',
    borderDark: 'dark:border-[#33634d]',
    textLight: 'text-slate-900',
    textDark: 'dark:text-[#e6f4ea]',
    dotClass: 'bg-[#e2f6d3]'
  },
  sage: {
    id: 'sage',
    name: 'Sage (Teal Muda)',
    bgLight: 'bg-[#b4ddd3]',
    bgDark: 'dark:bg-[#0c625d]',
    borderLight: 'border-[#9ec9bf]',
    borderDark: 'dark:border-[#137a74]',
    textLight: 'text-slate-900',
    textDark: 'dark:text-[#e0f2f1]',
    dotClass: 'bg-[#b4ddd3]'
  },
  fog: {
    id: 'fog',
    name: 'Kabut (Cerulean)',
    bgLight: 'bg-[#d4e4ed]',
    bgDark: 'dark:bg-[#256377]',
    borderLight: 'border-[#bed4df]',
    borderDark: 'dark:border-[#2f7891]',
    textLight: 'text-slate-900',
    textDark: 'dark:text-[#e8f0fe]',
    dotClass: 'bg-[#d4e4ed]'
  },
  storm: {
    id: 'storm',
    name: 'Badai (Biru Tua)',
    bgLight: 'bg-[#aeccdc]',
    bgDark: 'dark:bg-[#284255]',
    borderLight: 'border-[#97b8ca]',
    borderDark: 'dark:border-[#35536b]',
    textLight: 'text-slate-900',
    textDark: 'dark:text-[#e3f2fd]',
    dotClass: 'bg-[#aeccdc]'
  },
  dusk: {
    id: 'dusk',
    name: 'Senja (Violet)',
    bgLight: 'bg-[#d3bfdb]',
    bgDark: 'dark:bg-[#472e5b]',
    borderLight: 'border-[#bfa7c9]',
    borderDark: 'dark:border-[#5a3a73]',
    textLight: 'text-slate-900',
    textDark: 'dark:text-[#f3e8fd]',
    dotClass: 'bg-[#d3bfdb]'
  },
  blossom: {
    id: 'blossom',
    name: 'Bunga (Pink Muda)',
    bgLight: 'bg-[#f6e2dd]',
    bgDark: 'dark:bg-[#6c394f]',
    borderLight: 'border-[#e4c9c3]',
    borderDark: 'dark:border-[#854762]',
    textLight: 'text-slate-900',
    textDark: 'dark:text-[#fce8e6]',
    dotClass: 'bg-[#f6e2dd]'
  },
  clay: {
    id: 'clay',
    name: 'Lempung (Clay/Cokelat)',
    bgLight: 'bg-[#e9e3d4]',
    bgDark: 'dark:bg-[#4b443a]',
    borderLight: 'border-[#d4cca2]',
    borderDark: 'dark:border-[#61574a]',
    textLight: 'text-slate-900',
    textDark: 'dark:text-[#f1f3f4]',
    dotClass: 'bg-[#e9e3d4]'
  },
  chalk: {
    id: 'chalk',
    name: 'Kapur (Abu Lembut)',
    bgLight: 'bg-[#efeff1]',
    bgDark: 'dark:bg-[#2d2e30]',
    borderLight: 'border-[#dcdce0]',
    borderDark: 'dark:border-[#444746]',
    textLight: 'text-slate-900',
    textDark: 'dark:text-[#e8eaed]',
    dotClass: 'bg-[#efeff1]'
  }
};

// Aliases for legacy color settings
const LEGACY_COLOR_ALIAS: Record<string, string> = {
  amber: 'sand',
  emerald: 'mint',
  blue: 'fog',
  purple: 'dusk',
  rose: 'blossom'
};

export interface KeepChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface GoogleKeepNote {
  id: string;
  title: string;
  content: string; // for plain text mode
  items: KeepChecklistItem[];
  mode: 'checklist' | 'text';
  color: string;
  isPinned: boolean;
  reminder?: {
    label: string;
    time: string;
  } | null;
  collaborator?: string | null;
  imageUrl?: string | null;
  fontStyle?: 'normal' | 'bold' | 'mono';
  updatedAt: string;
}

interface StickyNotesWidgetProps {
  size: WidgetSize;
  userNik?: string;
  settings?: StickyNotesSettings;
  onUpdateSettings?: (settings: StickyNotesSettings) => void;
}

const TIP_KEY = 'preplab_keep_pin_tip_dismissed';
const LEGACY_STORAGE_KEY = 'preplab_home_sticky_note';

export const StickyNotesWidget: React.FC<StickyNotesWidgetProps> = ({
  size,
  userNik = 'default',
  settings,
  onUpdateSettings
}) => {
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const effectiveNik = userNik && userNik !== 'default' ? userNik : (localStorage.getItem('p2h_inspector_nik') || 'default');
  const userStorageKey = `preplab_keep_notes_v3_${effectiveNik}`;

  // 1. Initial State & Data Migration per-user
  const [notes, setNotes] = useState<GoogleKeepNote[]>(() => {
    try {
      const savedUserNotes = localStorage.getItem(userStorageKey);
      if (savedUserNotes) {
        const parsed = JSON.parse(savedUserNotes);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }

      // Check legacy note
      const legacyNote = localStorage.getItem(LEGACY_STORAGE_KEY);
      const defaultItems: KeepChecklistItem[] = [
        { id: '1', text: 'Cek ketersediaan reagen lab', completed: false },
        { id: '2', text: 'Konfirmasi handover shift', completed: false },
        { id: '3', text: 'Periksa kalibrasi XRF harian', completed: true }
      ];

      if (legacyNote && legacyNote.trim()) {
        const lines = legacyNote.split('\n').filter(l => l.trim().length > 0);
        const parsedItems: KeepChecklistItem[] = lines.map((l, idx) => ({
          id: String(idx + 1),
          text: l.replace(/^[•\-\*📌\s]+/, '').trim(),
          completed: false
        }));

        return [
          {
            id: 'note-1',
            title: 'Catatan Kerja PrepLab',
            content: legacyNote,
            items: parsedItems.length > 0 ? parsedItems : defaultItems,
            mode: 'checklist',
            color: 'sand',
            isPinned: true,
            reminder: { label: 'Shift Handover', time: '18:00 WIT' },
            collaborator: 'Lab Prep Team',
            updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          }
        ];
      }

      return [
        {
          id: 'note-1',
          title: 'Daftar Pemeriksaan PrepLab',
          content: '',
          items: defaultItems,
          mode: 'checklist',
          color: 'sand',
          isPinned: true,
          reminder: { label: 'Handover Shift', time: '18:00 WIT' },
          collaborator: 'Foreman Lab',
          updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
      ];
    } catch {
      return [
        {
          id: 'note-1',
          title: 'Catatan Pribadi',
          content: '',
          items: [{ id: '1', text: 'List item', completed: false }],
          mode: 'checklist',
          color: 'sand',
          isPinned: true,
          updatedAt: '10:37 AM'
        }
      ];
    }
  });

  const [activeNoteId, setActiveNoteId] = useState<string>(() => notes[0]?.id || 'note-1');
  const [showBlueTip, setShowBlueTip] = useState<boolean>(() => {
    try {
      return localStorage.getItem(TIP_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  // UI Popovers
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showReminderPicker, setShowReminderPicker] = useState<boolean>(false);
  const [showCollaboratorPicker, setShowCollaboratorPicker] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [showCompletedItems, setShowCompletedItems] = useState<boolean>(false);
  const [savedStatus, setSavedStatus] = useState<boolean>(false);
  const [newChecklistText, setNewChecklistText] = useState<string>('');

  // Undo/Redo history stack
  const [history, setHistory] = useState<GoogleKeepNote[][]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const newItemInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active note lookup
  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0] || {
    id: 'note-fallback',
    title: '',
    content: '',
    items: [],
    mode: 'checklist',
    color: 'sand',
    isPinned: false,
    updatedAt: ''
  };

  // Color theme calculation
  const rawColor = activeNote.color || settings?.color || 'sand';
  const resolvedColorKey = LEGACY_COLOR_ALIAS[rawColor] || rawColor;
  const currentTheme = KEEP_COLORS[resolvedColorKey] || KEEP_COLORS.sand;

  // Sync notes from server per-user
  useEffect(() => {
    let isMounted = true;

    const fetchRemoteNotes = async () => {
      try {
        const res = await fetch(`/api/widgets/notes?nik=${encodeURIComponent(effectiveNik)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;

        if (data.success && Array.isArray(data.notes) && data.notes.length > 0) {
          setNotes(data.notes);
          try {
            localStorage.setItem(userStorageKey, JSON.stringify(data.notes));
          } catch {}
          // Keep active note ID valid
          setActiveNoteId((currentId) => {
            if (data.notes.some((n: any) => n.id === currentId)) return currentId;
            return data.notes[0].id;
          });
        } else {
          // If server has no notes yet for this user, push current local notes to server
          const currentNotes = notes.length > 0 ? notes : [];
          if (currentNotes.length > 0 && effectiveNik !== 'default') {
            fetch('/api/widgets/notes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ notes: currentNotes, nik: effectiveNik })
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Could not fetch remote sticky notes:', err);
      }
    };

    fetchRemoteNotes();

    return () => {
      isMounted = false;
    };
  }, [effectiveNik, userStorageKey]);

  // Save to localStorage & synchronize with backend privately
  const saveNotes = (updated: GoogleKeepNote[], immediate = false) => {
    setNotes(updated);
    try {
      localStorage.setItem(userStorageKey, JSON.stringify(updated));
      setSavedStatus(true);
      setTimeout(() => setSavedStatus(false), 1400);
    } catch (e) {
      console.warn('Failed saving keep notes to localStorage', e);
    }

    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current);
    }

    const doSync = () => {
      fetch('/api/widgets/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: updated, nik: effectiveNik })
      }).catch((err) => console.warn('Failed syncing notes to server:', err));
    };

    if (immediate) {
      doSync();
    } else {
      syncTimerRef.current = setTimeout(doSync, 500);
    }
  };

  // Push state to undo stack
  const pushHistory = (newNotes: GoogleKeepNote[]) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(JSON.parse(JSON.stringify(newNotes)));
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const updateActiveNote = (updater: (prev: GoogleKeepNote) => GoogleKeepNote, immediate = false) => {
    const updated = notes.map((n) => {
      if (n.id === activeNote.id) {
        const modified = updater({ ...n });
        modified.updatedAt = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        return modified;
      }
      return n;
    });
    pushHistory(updated);
    saveNotes(updated, immediate);
  };

  // Dismiss blue banner
  const handleDismissBlueTip = () => {
    setShowBlueTip(false);
    try {
      localStorage.setItem(TIP_KEY, 'true');
    } catch {}
  };

  // Toggle Pin
  const handleTogglePin = () => {
    updateActiveNote((prev) => ({
      ...prev,
      isPinned: !prev.isPinned
    }), true);
  };

  // Checklist Item Actions
  const handleToggleCheckItem = (itemId: string) => {
    updateActiveNote((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    }), true);
  };

  const handleUpdateItemText = (itemId: string, text: string) => {
    updateActiveNote((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === itemId ? { ...item, text } : item))
    }), false);
  };

  const handleDeleteItem = (itemId: string) => {
    updateActiveNote((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== itemId)
    }), true);
  };

  const handleAddNewItem = () => {
    if (!newChecklistText.trim()) return;
    const newItem: KeepChecklistItem = {
      id: Date.now().toString(),
      text: newChecklistText.trim(),
      completed: false
    };
    updateActiveNote((prev) => ({
      ...prev,
      items: [...prev.items, newItem]
    }), true);
    setNewChecklistText('');
    setTimeout(() => newItemInputRef.current?.focus(), 50);
  };

  const handleItemKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    isCompletedList: boolean
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newItem: KeepChecklistItem = {
        id: Date.now().toString(),
        text: '',
        completed: isCompletedList
      };
      const list = isCompletedList ? completedItems : uncompletedItems;
      const targetIndex = list.findIndex((_, idx) => idx === index);
      
      const newItems = [...activeNote.items];
      newItems.splice(targetIndex + 1, 0, newItem);

      updateActiveNote((prev) => ({
        ...prev,
        items: newItems
      }), false);
    } else if (e.key === 'Backspace' && (e.target as HTMLInputElement).value === '') {
      e.preventDefault();
      const list = isCompletedList ? completedItems : uncompletedItems;
      const targetItem = list[index];
      if (targetItem) {
        handleDeleteItem(targetItem.id);
      }
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevState = history[prevIndex];
      setHistoryIndex(prevIndex);
      saveNotes(prevState, true);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextState = history[nextIndex];
      setHistoryIndex(nextIndex);
      saveNotes(nextState, true);
    }
  };

  // Switch between Checklist & Plain Text
  const handleToggleMode = () => {
    updateActiveNote((prev) => {
      if (prev.mode === 'checklist') {
        // Convert checklist items to bullet text
        const textLines = prev.items
          .map((i) => `${i.completed ? '✓' : '-'} ${i.text}`)
          .join('\n');
        return {
          ...prev,
          mode: 'text',
          content: prev.content ? `${prev.content}\n${textLines}` : textLines
        };
      } else {
        // Convert text lines to checklist
        const lines = prev.content.split('\n').filter((l) => l.trim().length > 0);
        const newItems: KeepChecklistItem[] = lines.map((l, idx) => ({
          id: String(idx + 1),
          text: l.replace(/^[✓•\-\*📌\s]+/, '').trim(),
          completed: l.trim().startsWith('✓')
        }));
        return {
          ...prev,
          mode: 'checklist',
          items: newItems.length > 0 ? newItems : [{ id: '1', text: '', completed: false }]
        };
      }
    }, true);
    setShowMoreMenu(false);
  };

  // Color change
  const handleSelectColor = (colorKey: string) => {
    updateActiveNote((prev) => ({ ...prev, color: colorKey }), true);
    onUpdateSettings?.({ color: colorKey });
    setShowColorPicker(false);
  };

  // Add new note tab
  const handleCreateNewNote = () => {
    const newNote: GoogleKeepNote = {
      id: `note-${Date.now()}`,
      title: '',
      content: '',
      items: [{ id: Date.now().toString(), text: '', completed: false }],
      mode: 'checklist',
      color: 'default',
      isPinned: false,
      updatedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
    const updated = [newNote, ...notes];
    saveNotes(updated, true);
    setActiveNoteId(newNote.id);
  };

  // Delete current note
  const handleDeleteCurrentNote = () => {
    if (notes.length <= 1) {
      // Just clear
      updateActiveNote((prev) => ({
        ...prev,
        title: '',
        content: '',
        items: [{ id: '1', text: '', completed: false }],
        reminder: null,
        collaborator: null,
        imageUrl: null
      }), true);
    } else {
      const remaining = notes.filter((n) => n.id !== activeNote.id);
      saveNotes(remaining, true);
      setActiveNoteId(remaining[0].id);
    }
    setShowMoreMenu(false);
  };

  // Copy note to clipboard
  const handleCopyNote = () => {
    const textToCopy = `📌 ${activeNote.title || 'Catatan'}\n` +
      (activeNote.mode === 'checklist'
        ? activeNote.items.map((i) => `[${i.completed ? 'x' : ' '}] ${i.text}`).join('\n')
        : activeNote.content);
    navigator.clipboard?.writeText(textToCopy);
    setSavedStatus(true);
    setTimeout(() => setSavedStatus(false), 1500);
    setShowMoreMenu(false);
  };

  // Process and compress image file to data URL
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Silakan pilih file gambar yang valid (PNG, JPG, JPEG, WEBP, GIF)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      if (!src) return;

      // Compress using canvas to ensure it fits comfortably in localStorage
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1200;
        const maxHeight = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          updateActiveNote((prev) => ({ ...prev, imageUrl: compressed }));
        } else {
          updateActiveNote((prev) => ({ ...prev, imageUrl: src }));
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // Reset value so user can upload the same file again if needed
    e.target.value = '';
  };

  // Attach / Pick Image from local device
  const handleAttachImage = () => {
    fileInputRef.current?.click();
  };

  // Support pasting image directly from clipboard (e.g. Snipping tool / screenshot)
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const uncompletedItems = activeNote.items.filter((i) => !i.completed);
  const completedItems = activeNote.items.filter((i) => i.completed);

  return (
    <div className="relative w-full h-full flex flex-col justify-between font-sans select-text">
      {/* 1. BLUE BANNER: "Pin your important notes to the top." (Google Keep Original Tip) */}
      {showBlueTip && (
        <div className="mb-2 bg-[#1a73e8] text-white px-3 py-1.5 rounded-lg flex items-center justify-between text-xs shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 font-medium truncate">
            <span>Pin your important notes to the top.</span>
            <span className="text-[10px] opacity-80 hidden sm:inline">(Sematkan catatan penting ke atas)</span>
          </div>
          <button
            type="button"
            onClick={handleDismissBlueTip}
            className="text-xs font-bold px-2 py-0.5 rounded hover:bg-white/20 transition-colors uppercase tracking-wider shrink-0 ml-2"
          >
            Got it
          </button>
        </div>
      )}

      {/* 2. MULTI-NOTE TABS BAR (If multiple notes exist or for quick switching) */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5 px-0.5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {notes.map((note) => {
            const isActive = note.id === activeNote.id;
            return (
              <button
                key={note.id}
                type="button"
                onClick={() => setActiveNoteId(note.id)}
                className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full transition-all shrink-0 ${
                  isActive
                    ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-black/10'
                }`}
                title={note.title || 'Catatan Tanpa Judul'}
              >
                {note.isPinned && <Pin className="w-2.5 h-2.5 fill-current rotate-45" />}
                <span className="max-w-[100px] truncate">{note.title || 'Catatan'}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleCreateNewNote}
            className="p-1 rounded-full text-slate-500 hover:text-slate-900 hover:bg-black/5 dark:text-slate-400 dark:hover:text-white transition-colors"
            title="Tambah Catatan Keep Baru"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {savedStatus && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium shrink-0 animate-in fade-in">
            <CheckCheck className="w-3 h-3" />
            <span>Tersimpan</span>
          </div>
        )}
      </div>

      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* 3. GOOGLE KEEP MAIN CARD CONTAINER */}
      <div
        onPaste={handlePaste}
        className={`flex-1 rounded-2xl border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs relative ${currentTheme.bgLight} ${currentTheme.bgDark} ${currentTheme.borderLight} ${currentTheme.borderDark} ${currentTheme.textLight} ${currentTheme.textDark}`}
        style={{
          fontFamily: "'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        }}
      >
        {/* Optional Header Image Preview */}
        {activeNote.imageUrl && (
          <div className="relative w-full h-28 sm:h-36 overflow-hidden group bg-black/5">
            <img
              src={activeNote.imageUrl}
              alt="Lampiran Catatan"
              className="w-full h-full object-cover"
            />
            {/* Quick Actions overlay */}
            <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 rounded-md bg-black/70 hover:bg-black/90 text-white text-[10px] font-semibold flex items-center gap-1 shadow-xs"
                title="Ganti gambar dari perangkat"
              >
                <ImageIcon className="w-3 h-3" />
                <span>Ganti</span>
              </button>
              <button
                type="button"
                onClick={() => updateActiveNote((prev) => ({ ...prev, imageUrl: null }))}
                className="p-1 rounded-md bg-black/70 hover:bg-red-600 text-white shadow-xs transition-colors"
                title="Hapus gambar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Card Header: Title + Pin Button */}
        <div className="p-3 pb-1 flex items-start justify-between gap-2">
          <input
            type="text"
            value={activeNote.title}
            onChange={(e) => updateActiveNote((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Title"
            className="w-full bg-transparent text-sm sm:text-base font-semibold focus:outline-hidden placeholder:text-slate-400 dark:placeholder:text-slate-500 tracking-tight"
          />
          <button
            type="button"
            onClick={handleTogglePin}
            className={`p-1.5 rounded-full transition-transform hover:scale-110 shrink-0 ${
              activeNote.isPinned
                ? 'text-amber-500 fill-amber-500 bg-amber-500/10'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            title={activeNote.isPinned ? 'Lepaskan sematan' : 'Sematkan catatan'}
          >
            <Pin className={`w-4 h-4 ${activeNote.isPinned ? 'fill-current rotate-45' : ''}`} />
          </button>
        </div>

        {/* Badges / Chips Row (Reminder, Collaborator) */}
        {(activeNote.reminder || activeNote.collaborator) && (
          <div className="px-3 py-1 flex items-center gap-1.5 flex-wrap">
            {activeNote.reminder && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200">
                <Clock className="w-2.5 h-2.5" />
                <span>{activeNote.reminder.label} ({activeNote.reminder.time})</span>
                <button
                  type="button"
                  onClick={() => updateActiveNote((prev) => ({ ...prev, reminder: null }))}
                  className="hover:text-red-500 ml-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
            {activeNote.collaborator && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200">
                <UserPlus className="w-2.5 h-2.5" />
                <span>{activeNote.collaborator}</span>
                <button
                  type="button"
                  onClick={() => updateActiveNote((prev) => ({ ...prev, collaborator: null }))}
                  className="hover:text-red-500 ml-0.5"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Card Body: Interactive Checklist OR Plain Text Memo */}
        <div className="p-3 pt-1 flex-1 overflow-y-auto max-h-[220px] no-scrollbar">
          {activeNote.mode === 'checklist' ? (
            <div className="space-y-1">
              {/* Uncompleted Items */}
              {uncompletedItems.map((item, index) => (
                <div
                  key={item.id}
                  className="group/item flex items-center gap-1.5 py-0.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md px-1 transition-colors"
                >
                  <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-30 group-hover/item:opacity-100 cursor-grab shrink-0" />
                  
                  {/* Google Keep style square checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggleCheckItem(item.id)}
                    className="w-4 h-4 rounded-xs border border-slate-400 dark:border-slate-500 flex items-center justify-center shrink-0 hover:border-slate-700 dark:hover:border-slate-300 transition-colors"
                  >
                    {item.completed && <Check className="w-3 h-3 text-slate-700 dark:text-slate-200 stroke-[3]" />}
                  </button>

                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => handleUpdateItemText(item.id, e.target.value)}
                    onKeyDown={(e) => handleItemKeyDown(e, index, false)}
                    placeholder="List item"
                    className="w-full bg-transparent text-xs sm:text-[13px] focus:outline-hidden placeholder:text-slate-400 dark:placeholder:text-slate-500 leading-normal"
                  />

                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-500 p-0.5 transition-opacity shrink-0"
                    title="Hapus baris"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {/* + List item input row (Exact match to Google Keep) */}
              <div className="flex items-center gap-1.5 py-1 px-1">
                <Plus className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0 ml-4.5" />
                <input
                  ref={newItemInputRef}
                  type="text"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddNewItem();
                    }
                  }}
                  placeholder="List item"
                  className="w-full bg-transparent text-xs sm:text-[13px] focus:outline-hidden placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
                {newChecklistText.trim() && (
                  <button
                    type="button"
                    onClick={handleAddNewItem}
                    className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-white dark:bg-white dark:text-slate-900 shrink-0 shadow-2xs"
                  >
                    Tambah
                  </button>
                )}
              </div>

              {/* Completed items accordion (Google Keep style) */}
              {completedItems.length > 0 && (
                <div className="pt-2 border-t border-black/5 dark:border-white/10 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowCompletedItems(!showCompletedItems)}
                    className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-1"
                  >
                    {showCompletedItems ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                    <span>{completedItems.length} item dicentang</span>
                  </button>

                  {showCompletedItems && (
                    <div className="space-y-0.5 pl-1 animate-in fade-in duration-150">
                      {completedItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="group/item flex items-center gap-1.5 py-0.5 rounded-md px-1"
                        >
                          <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-20 shrink-0" />
                          <button
                            type="button"
                            onClick={() => handleToggleCheckItem(item.id)}
                            className="w-4 h-4 rounded-xs border border-slate-500 dark:border-slate-400 bg-slate-500/20 flex items-center justify-center shrink-0"
                          >
                            <Check className="w-3 h-3 text-slate-600 dark:text-slate-300 stroke-[3]" />
                          </button>
                          <input
                            type="text"
                            value={item.text}
                            onChange={(e) => handleUpdateItemText(item.id, e.target.value)}
                            onKeyDown={(e) => handleItemKeyDown(e, index, true)}
                            className="w-full bg-transparent text-xs sm:text-[13px] line-through text-slate-400 dark:text-slate-500 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-500 p-0.5 transition-opacity shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Plain Text Mode */
            <textarea
              value={activeNote.content}
              onChange={(e) => updateActiveNote((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="Tulis catatan di sini..."
              rows={size === '2x' ? 5 : 4}
              className={`w-full h-full bg-transparent text-xs sm:text-[13px] leading-relaxed resize-none focus:outline-hidden placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                activeNote.fontStyle === 'mono'
                  ? 'font-mono'
                  : activeNote.fontStyle === 'bold'
                  ? 'font-semibold'
                  : ''
              }`}
            />
          )}
        </div>

        {/* 4. FOOTER STATUS & BOTTOM ACTIONS BAR (Exact Replica of Screenshot 1) */}
        <div className="pt-1 pb-1.5 px-2 border-t border-black/5 dark:border-white/10 flex flex-col gap-1">
          {/* Edited Timestamp (Right aligned above icons) */}
          <div className="text-[10px] text-right text-slate-500 dark:text-slate-400 pr-1">
            Edited {activeNote.updatedAt || '10:37 AM'}
          </div>

          {/* Action Icons Row */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-0.5 sm:gap-1 text-slate-600 dark:text-slate-300">
              {/* 1. Format Style (A with underline) */}
              <button
                type="button"
                onClick={() => {
                  updateActiveNote((prev) => ({
                    ...prev,
                    fontStyle:
                      prev.fontStyle === 'bold'
                        ? 'mono'
                        : prev.fontStyle === 'mono'
                        ? 'normal'
                        : 'bold'
                  }));
                }}
                className={`p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
                  activeNote.fontStyle && activeNote.fontStyle !== 'normal'
                    ? 'text-teal-600 dark:text-teal-400 font-bold'
                    : ''
                }`}
                title="Format Font (Normal / Tebal / Monospace)"
              >
                <span className="font-serif font-bold text-xs underline decoration-2 underline-offset-2">
                  A
                </span>
              </button>

              {/* 2. Color Palette */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Warna Latar Belakang Catatan"
                >
                  <Palette className="w-3.5 h-3.5" />
                </button>

                {showColorPicker && (
                  <div className="absolute bottom-8 left-0 z-50 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl grid grid-cols-6 gap-1.5 w-48 animate-in fade-in zoom-in-95 duration-100">
                    {Object.values(KEEP_COLORS).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectColor(c.id)}
                        className={`w-6 h-6 rounded-full ${c.dotClass} ${
                          activeNote.color === c.id
                            ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white scale-110'
                            : ''
                        } transition-transform hover:scale-115`}
                        title={c.name}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Reminder Bell */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowReminderPicker(!showReminderPicker)}
                  className={`p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
                    activeNote.reminder ? 'text-amber-500 fill-amber-500' : ''
                  }`}
                  title="Setel Pengingat"
                >
                  <Bell className="w-3.5 h-3.5" />
                </button>

                {showReminderPicker && (
                  <div className="absolute bottom-8 left-0 z-50 p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl w-48 space-y-1 text-xs animate-in fade-in duration-100">
                    <div className="text-[10px] font-bold text-slate-400 px-2 py-0.5 uppercase tracking-wider">
                      Pilih Pengingat
                    </div>
                    {[
                      { label: 'Nanti Sore', time: '18:00 WIT' },
                      { label: 'Besok Pagi', time: '07:00 WIT' },
                      { label: 'Handover Shift', time: '19:00 WIT' }
                    ].map((opt) => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          updateActiveNote((prev) => ({ ...prev, reminder: opt }));
                          setShowReminderPicker(false);
                        }}
                        className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between"
                      >
                        <span>{opt.label}</span>
                        <span className="text-[10px] text-slate-400">{opt.time}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 4. Collaborator (User+) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCollaboratorPicker(!showCollaboratorPicker)}
                  className={`p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
                    activeNote.collaborator ? 'text-teal-600 dark:text-teal-400' : ''
                  }`}
                  title="Tag Rekan / Shift"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                </button>

                {showCollaboratorPicker && (
                  <div className="absolute bottom-8 left-0 z-50 p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl w-44 space-y-1 text-xs animate-in fade-in duration-100">
                    <div className="text-[10px] font-bold text-slate-400 px-1 py-0.5 uppercase tracking-wider">
                      Label Kolaborator
                    </div>
                    {['Pribadi', 'Foreman Lab', 'SPV QA/QC', 'Tim Preparasi', 'Handover'].map(
                      (role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            updateActiveNote((prev) => ({
                              ...prev,
                              collaborator: prev.collaborator === role ? null : role
                            }));
                            setShowCollaboratorPicker(false);
                          }}
                          className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          {role}
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* 5. Image Attachment */}
              <button
                type="button"
                onClick={handleAttachImage}
                className={`p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${
                  activeNote.imageUrl ? 'text-teal-600 dark:text-teal-400' : ''
                }`}
                title={activeNote.imageUrl ? 'Ganti Gambar dari Perangkat' : 'Upload Gambar dari Komputer (atau Paste / Ctrl+V)'}
              >
                <ImageIcon className="w-3.5 h-3.5" />
              </button>

              {/* 6. Archive */}
              <button
                type="button"
                onClick={() => {
                  if (confirm('Arsipkan catatan ini ke memori lokal?')) {
                    handleDeleteCurrentNote();
                  }
                }}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Arsipkan Catatan"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>

              {/* 7. More Options (Three Dots) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  title="Menu Lainnya"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {showMoreMenu && (
                  <div className="absolute bottom-8 left-0 z-50 p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl w-52 space-y-1 text-xs animate-in fade-in duration-100">
                    <button
                      type="button"
                      onClick={handleToggleMode}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      {activeNote.mode === 'checklist' ? (
                        <>
                          <FileText className="w-3.5 h-3.5" />
                          <span>Ubah ke Catatan Teks</span>
                        </>
                      ) : (
                        <>
                          <ListTodo className="w-3.5 h-3.5" />
                          <span>Ubah ke Kotak Centang</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyNote}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Semua Catatan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowBlueTip(true);
                        setShowMoreMenu(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Tampilkan Banner Keep</span>
                    </button>

                    <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />

                    <button
                      type="button"
                      onClick={handleDeleteCurrentNote}
                      className="w-full text-left px-2 py-1.5 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Catatan</span>
                    </button>
                  </div>
                )}
              </div>

              {/* 8. Undo */}
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                title="Urungkan (Undo)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>

              {/* 9. Redo */}
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                title="Ulangi (Redo)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 10. "Close" Button (Google Keep Signature button on right) */}
            <button
              type="button"
              onClick={() => {
                setSavedStatus(true);
                setTimeout(() => setSavedStatus(false), 1200);
              }}
              className="text-xs font-semibold px-3 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors tracking-wide text-slate-800 dark:text-slate-100"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
