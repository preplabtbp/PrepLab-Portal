import React, { useState, useEffect, useMemo } from 'react';
import { Button, Input, Select } from './ui';
import { 
  X, Save, Palette, Plus, Trash2, Edit3, Copy, Check, 
  Sparkles, RefreshCw, Layers, Eye, CheckCircle2, Sun, 
  Moon, Sunset, SlidersHorizontal, CheckSquare, Square,
  Globe, Users, User, Share2, Search, ArrowUpRight,
  ChevronDown, ChevronUp, Maximize2, Minimize2, Heart
} from 'lucide-react';
import { toast } from 'sonner';

export interface ThemeColors {
  '--bg-main': string;
  '--primary': string;
  '--primary-hover': string;
  '--accent': string;
  '--card-bg': string;
  '--text-main': string;
  '--text-muted': string;
  '--border-main': string;
  '--input-bg': string;
  '--bubble-color': string;
  '--header-bg'?: string;
  '--header-text'?: string;
  '--footer-selected'?: string;
  '--username-color'?: string;
  [key: string]: string | undefined;
}

export interface CustomThemeTemplate {
  id?: number;
  name: string;
  mode?: string;
  colors: ThemeColors;
  isPublished?: boolean;
  authorName?: string;
  publishedAt?: string | Date;
  nik?: string;
  likesCount?: number;
  likedBy?: string[];
  likedByUsers?: any[];
}

export const PRESET_THEMES: Record<string, { name: string; desc: string; colors: ThemeColors }> = {
  preplab_emerald: {
    name: 'PrepLab Classic (Emerald & Amber)',
    desc: 'Tema resmi PrepLab dengan nuansa hijau emerald dan sentuhan aksen amber.',
    colors: {
      '--bg-main': '#F4F7F6',
      '--primary': '#2A9D8F',
      '--primary-hover': '#21867A',
      '--accent': '#E9930D',
      '--card-bg': '#FFFFFF',
      '--text-main': '#1E293B',
      '--text-muted': '#64748B',
      '--border-main': '#DCE8F8',
      '--input-bg': '#FFFFFF',
      '--bubble-color': '#E9930D',
      '--header-bg': '#FFFFFF',
      '--header-text': '#1E293B',
      '--footer-selected': '#2A9D8F',
      '--username-color': '#E9930D'
    }
  },
  midnight_oled: {
    name: 'Midnight OLED (Dark & Cyan)',
    desc: 'Latar gelap pekat hemat daya dengan aksen neon cyan dan kartu slate modern.',
    colors: {
      '--bg-main': '#0A0F1D',
      '--primary': '#06B6D4',
      '--primary-hover': '#0891B2',
      '--accent': '#38BDF8',
      '--card-bg': '#131D31',
      '--text-main': '#F8FAFC',
      '--text-muted': '#94A3B8',
      '--border-main': '#1E293B',
      '--input-bg': '#0B132B',
      '--bubble-color': '#06B6D4',
      '--header-bg': '#131D31',
      '--header-text': '#F8FAFC',
      '--footer-selected': '#06B6D4',
      '--username-color': '#38BDF8'
    }
  },
  sunset_horizon: {
    name: 'Sunset Horizon (Warm Coral)',
    desc: 'Gradasi hangat matahari terbenam dengan nuansa terakota dan oranye cerah.',
    colors: {
      '--bg-main': '#FFFBF5',
      '--primary': '#EA580C',
      '--primary-hover': '#C2410C',
      '--accent': '#F59E0B',
      '--card-bg': '#FFFFFF',
      '--text-main': '#292524',
      '--text-muted': '#78716C',
      '--border-main': '#FED7AA',
      '--input-bg': '#FFF7ED',
      '--bubble-color': '#F97316',
      '--header-bg': '#FFFFFF',
      '--header-text': '#292524',
      '--footer-selected': '#EA580C',
      '--username-color': '#EA580C'
    }
  },
  deep_ocean: {
    name: 'Deep Ocean (Marine Navy)',
    desc: 'Ketenangan samudera dengan latar biru langit cerah dan elemen navy elegan.',
    colors: {
      '--bg-main': '#F0F9FF',
      '--primary': '#0284C7',
      '--primary-hover': '#0369A1',
      '--accent': '#38BDF8',
      '--card-bg': '#FFFFFF',
      '--text-main': '#0F172A',
      '--text-muted': '#64748B',
      '--border-main': '#BAE6FD',
      '--input-bg': '#FFFFFF',
      '--bubble-color': '#0EA5E9',
      '--header-bg': '#FFFFFF',
      '--header-text': '#0F172A',
      '--footer-selected': '#0284C7',
      '--username-color': '#0284C7'
    }
  },
  cyberpunk_neon: {
    name: 'Cyberpunk 2077 (Electric Lime & Violet)',
    desc: 'Nuansa futuristik high-tech dengan latar hitam arang dan aksen hijau neon menyala.',
    colors: {
      '--bg-main': '#09090E',
      '--primary': '#10B981',
      '--primary-hover': '#059669',
      '--accent': '#A855F7',
      '--card-bg': '#12121A',
      '--text-main': '#F1F5F9',
      '--text-muted': '#94A3B8',
      '--border-main': '#27273A',
      '--input-bg': '#0D0D14',
      '--bubble-color': '#10B981',
      '--header-bg': '#12121A',
      '--header-text': '#F1F5F9',
      '--footer-selected': '#10B981',
      '--username-color': '#10B981'
    }
  },
  rose_gold: {
    name: 'Rose Quartz (Soft Blush & Crimson)',
    desc: 'Tampilan lembut dan mewah dengan palet blush rose dan aksen crimson.',
    colors: {
      '--bg-main': '#FFF1F2',
      '--primary': '#E11D48',
      '--primary-hover': '#BE123C',
      '--accent': '#FB7185',
      '--card-bg': '#FFFFFF',
      '--text-main': '#4C0519',
      '--text-muted': '#881337',
      '--border-main': '#FECDD3',
      '--input-bg': '#FFF5F6',
      '--bubble-color': '#F43F5E',
      '--header-bg': '#FFFFFF',
      '--header-text': '#4C0519',
      '--footer-selected': '#E11D48',
      '--username-color': '#E11D48'
    }
  },
  forest_moss: {
    name: 'Emerald Forest (Deep Pine & Lime)',
    desc: 'Nuansa alam rimbun dengan hijau hutan pekat dan aksen daun segar.',
    colors: {
      '--bg-main': '#F2FBF6',
      '--primary': '#059669',
      '--primary-hover': '#047857',
      '--accent': '#84CC16',
      '--card-bg': '#FFFFFF',
      '--text-main': '#064E3B',
      '--text-muted': '#047857',
      '--border-main': '#A7F3D0',
      '--input-bg': '#FFFFFF',
      '--bubble-color': '#10B981',
      '--header-bg': '#FFFFFF',
      '--header-text': '#064E3B',
      '--footer-selected': '#059669',
      '--username-color': '#059669'
    }
  },
  cozy_latte: {
    name: 'Cozy Latte (Warm Sand & Mocha)',
    desc: 'Palet kopi hangat nan tenang dengan latar krem pasir dan cokelat kayu.',
    colors: {
      '--bg-main': '#FBF9F5',
      '--primary': '#78350F',
      '--primary-hover': '#582607',
      '--accent': '#D97706',
      '--card-bg': '#FFFFFF',
      '--text-main': '#292524',
      '--text-muted': '#78716C',
      '--border-main': '#E7E5E4',
      '--input-bg': '#F5F5F4',
      '--bubble-color': '#B45309',
      '--header-bg': '#FFFFFF',
      '--header-text': '#292524',
      '--footer-selected': '#78350F',
      '--username-color': '#D97706'
    }
  },
  monochrome_slate: {
    name: 'Monochrome Slate (Minimalist Carbon)',
    desc: 'Desain minimalis berfokus tinggi dengan kontras tajam hitam, abu-abu slate, dan putih.',
    colors: {
      '--bg-main': '#F8FAFC',
      '--primary': '#0F172A',
      '--primary-hover': '#1E293B',
      '--accent': '#64748B',
      '--card-bg': '#FFFFFF',
      '--text-main': '#0F172A',
      '--text-muted': '#64748B',
      '--border-main': '#E2E8F0',
      '--input-bg': '#FFFFFF',
      '--bubble-color': '#334155',
      '--header-bg': '#FFFFFF',
      '--header-text': '#0F172A',
      '--footer-selected': '#0F172A',
      '--username-color': '#0F172A'
    }
  }
};

const COLOR_DEFINITIONS: Array<{ key: keyof ThemeColors; label: string; group: string; desc: string }> = [
  { key: '--bg-main', label: 'Background Utama', group: 'Latar & Kontainer', desc: 'Warna latar belakang dasar aplikasi' },
  { key: '--card-bg', label: 'Background Kartu & Panel', group: 'Latar & Kontainer', desc: 'Latar kotak konten, kartu dashboard & modal' },
  { key: '--header-bg', label: 'Background Header Atas', group: 'Latar & Kontainer', desc: 'Warna latar bilah header atas aplikasi' },
  { key: '--input-bg', label: 'Background Input Form', group: 'Latar & Kontainer', desc: 'Latar belakang field form, select, dan input teks' },
  { key: '--border-main', label: 'Garis Tepi (Border)', group: 'Latar & Kontainer', desc: 'Warna garis batas pemisah antar elemen' },
  
  { key: '--primary', label: 'Warna Utama (Primary)', group: 'Warna Brand & Aksi', desc: 'Tombol utama, header judul, dan elemen aksi' },
  { key: '--primary-hover', label: 'Warna Hover Primary', group: 'Warna Brand & Aksi', desc: 'Efek saat kursor berada di atas tombol utama' },
  { key: '--accent', label: 'Warna Aksen (Highlight)', group: 'Warna Brand & Aksi', desc: 'Tombol aksi khusus, highlight, dan badge penting' },
  { key: '--footer-selected', label: 'Warna Menu Footer Terpilih', group: 'Warna Brand & Aksi', desc: 'Warna ikon dan teks menu aktif di navigasi bawah (footer)' },
  { key: '--bubble-color', label: 'Warna Bubble & Badge', group: 'Warna Brand & Aksi', desc: 'Indikator notifikasi, bubble chat, dan tag status' },

  { key: '--text-main', label: 'Teks Utama', group: 'Tipografi & Teks', desc: 'Warna teks judul dan konten penting' },
  { key: '--username-color', label: 'Warna Font Username / Panggilan', group: 'Tipografi & Teks', desc: 'Warna teks nama panggilan Anda (contoh: Selamat Pagi, Alvin!)' },
  { key: '--header-text', label: 'Teks Header "Prep & Lab Portal"', group: 'Tipografi & Teks', desc: 'Warna tulisan judul Prep & Lab Portal pada header atas' },
  { key: '--text-muted', label: 'Teks Redup (Muted)', group: 'Tipografi & Teks', desc: 'Warna label bantuan, tanggal, dan teks sekunder' }
];

export default function ThemeModal({ 
  show, 
  onClose, 
  currentMode = 'morning', 
  userThemes = {}, 
  inspectorNik, 
  onThemeUpdated 
}: {
  show: boolean;
  onClose: () => void;
  currentMode: string;
  userThemes: Record<string, ThemeColors>;
  inspectorNik: string | null;
  onThemeUpdated: (mode: string, colors: ThemeColors, applyToAll?: boolean) => void;
}) {
  if (!show) return null;

  const [activeTab, setActiveTab] = useState<'templates' | 'studio' | 'preview'>('templates');
  const [targetMode, setTargetMode] = useState(currentMode || 'morning');
  const [applyToAllModes, setApplyToAllModes] = useState(true);
  
  // Custom templates and Community themes state
  const [customTemplates, setCustomTemplates] = useState<CustomThemeTemplate[]>([]);
  const [communityThemes, setCommunityThemes] = useState<CustomThemeTemplate[]>([]);
  const [themeFilterCategory, setThemeFilterCategory] = useState<'all' | 'community' | 'mine' | 'presets'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [customTemplateName, setCustomTemplateName] = useState('Tema Kustom Saya');
  const [isPublishOnSave, setIsPublishOnSave] = useState(false);
  const [authorNameInput, setAuthorNameInput] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetchingTemplates, setFetchingTemplates] = useState(false);
  const [showStudioPreview, setShowStudioPreview] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);

  // Active color editor state
  const defaultColors = useMemo(() => {
    return userThemes[currentMode] || PRESET_THEMES.preplab_emerald.colors;
  }, [userThemes, currentMode]);

  const [editingColors, setEditingColors] = useState<ThemeColors>(defaultColors);

  // Load custom templates & community themes
  const loadCustomTemplates = async () => {
    setFetchingTemplates(true);
    try {
      const url = inspectorNik ? `/api/themes/templates?nik=${inspectorNik}` : '/api/themes/templates';
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'success') {
        if (Array.isArray(json.customTemplates)) {
          setCustomTemplates(json.customTemplates);
          if (inspectorNik) {
            localStorage.setItem(`preplab_custom_themes_${inspectorNik}`, JSON.stringify(json.customTemplates));
          }
        }
        if (Array.isArray(json.communityThemes)) {
          setCommunityThemes(json.communityThemes);
        } else if (Array.isArray(json.data)) {
          setCommunityThemes(json.data);
        }
      }
    } catch (e) {
      console.error("Gagal mengambil template kustom & komunitas:", e);
      if (inspectorNik) {
        const localCached = localStorage.getItem(`preplab_custom_themes_${inspectorNik}`);
        if (localCached) {
          try { setCustomTemplates(JSON.parse(localCached)); } catch(err) {}
        }
      }
    } finally {
      setFetchingTemplates(false);
    }
  };

  useEffect(() => {
    if (show) {
      loadCustomTemplates();
      setEditingColors(userThemes[targetMode] || defaultColors);
    }
  }, [show, inspectorNik, targetMode]);

  if (!show) return null;

  // Directly apply a theme from presets, community, or custom templates
  const handleApplyThemeDirectly = async (colors: ThemeColors | Record<string, string>, themeName: string = 'Kustom', existingToastId?: string | number) => {
    if (!colors || typeof colors !== 'object') {
      toast.error('Format warna tema tidak valid');
      return;
    }

    const validatedColors = colors as ThemeColors;
    setEditingColors(validatedColors);

    // 1. Immediately apply to DOM
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      if (typeof key === 'string' && key.startsWith('--') && value) {
        root.style.setProperty(key, value as string);
      }
    });

    // 2. Immediately apply to App state
    onThemeUpdated(targetMode, validatedColors, true);
    
    // 3. Persist in local storage immediately across all modes
    const nik = inspectorNik || localStorage.getItem('p2h_inspector_nik');
    const allModes = { morning: colors, afternoon: colors, evening: colors };
    if (nik) {
      localStorage.setItem(`preplab_user_themes_${nik}`, JSON.stringify(allModes));
    }
    localStorage.setItem('preplab_user_themes_guest', JSON.stringify(allModes));
    localStorage.setItem('preplab_active_theme_colors', JSON.stringify(colors));

    if (existingToastId) {
      toast.success(`Tema "${themeName}" aktif diterapkan ke seluruh portal! 🎉`, { id: existingToastId });
    } else {
      toast.success(`Tema "${themeName}" aktif diterapkan ke seluruh portal! 🎉`);
    }

    // 4. Save to server in background
    try {
      await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: nik || 'guest',
          mode: targetMode,
          themeName: themeName,
          colors: colors,
          applyToAll: true
        })
      });
    } catch(e) {
      console.warn("Background theme save notice:", e);
    }
  };

  // Toggle Like on Community Theme
  const handleToggleThemeLike = async (theme: CustomThemeTemplate, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!theme.id) return;
    const nik = inspectorNik || localStorage.getItem('p2h_inspector_nik') || 'guest';
    const profileStr = localStorage.getItem('p2h_inspector_profile');
    let name = 'Personil PrepLab';
    let role = 'Staff';
    if (profileStr) {
      try {
        const p = JSON.parse(profileStr);
        name = p.name || p.nama || name;
        role = p.jabatan || role;
      } catch (err) {}
    }

    const wasLiked = (theme.likedBy || []).includes(nik);
    const newLikesCount = wasLiked ? Math.max(0, (theme.likesCount || 1) - 1) : (theme.likesCount || 0) + 1;
    const newLikedBy = wasLiked ? (theme.likedBy || []).filter(n => n !== nik) : [...(theme.likedBy || []), nik];

    // Optimistic UI update
    setCommunityThemes(prev => prev.map(t => t.id === theme.id ? { ...t, likesCount: newLikesCount, likedBy: newLikedBy } : t));

    try {
      const res = await fetch(`/api/themes/${theme.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik, name, role })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setCommunityThemes(prev => prev.map(t => t.id === theme.id ? { ...t, likesCount: data.likesCount, likedBy: data.likedBy } : t));
        toast.success(data.message || (data.isLiked ? 'Menyukai tema!' : 'Batal menyukai tema.'));
      }
    } catch (err) {
      // Rollback
      setCommunityThemes(prev => prev.map(t => t.id === theme.id ? theme : t));
      toast.error('Gagal memperbarui like tema');
    }
  };

  // Apply a preset template to editor
  const handleSelectPreset = (presetKey: string) => {
    const preset = PRESET_THEMES[presetKey];
    if (!preset) return;
    setEditingColors({ ...preset.colors });
    setCustomTemplateName(preset.name);
    setEditingTemplateId(null);
    setIsPublishOnSave(false);
    handleApplyThemeDirectly(preset.colors, preset.name);
  };

  // Apply custom template to editor
  const handleSelectCustomTemplate = (tmpl: CustomThemeTemplate) => {
    setEditingColors({ ...tmpl.colors });
    setCustomTemplateName(tmpl.name);
    setEditingTemplateId(tmpl.id || null);
    setIsPublishOnSave(Boolean(tmpl.isPublished));
    if (tmpl.authorName) setAuthorNameInput(tmpl.authorName);
    handleApplyThemeDirectly(tmpl.colors, tmpl.name);
  };

  // Save current colors as a NEW or UPDATED Custom Template
  const handleSaveCustomTemplate = async () => {
    if (!customTemplateName.trim()) {
      toast.error('Harap masukkan nama template custom Anda!');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Menyimpan & menerapkan tema...');
    try {
      const payload = {
        nik: inspectorNik || 'guest',
        id: editingTemplateId || undefined,
        name: customTemplateName.trim(),
        colors: editingColors,
        isPublished: isPublishOnSave,
        authorName: authorNameInput.trim() || undefined,
        applyActive: true
      };

      const res = await fetch('/api/themes/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        handleApplyThemeDirectly(editingColors, customTemplateName.trim());
        toast.success(
          isPublishOnSave 
            ? 'Tema kustom disimpan, diterapkan & dipublikasikan ke Komunitas!' 
            : (json.message || 'Tema kustom berhasil disimpan & diterapkan!'), 
          { id: toastId }
        );
        await loadCustomTemplates();
        setActiveTab('templates');
      } else {
        throw new Error(json.message || 'Gagal menyimpan template');
      }
    } catch (e: any) {
      // Fallback local save if offline
      const newTmpl: CustomThemeTemplate = {
        id: editingTemplateId || Date.now(),
        name: customTemplateName.trim(),
        colors: { ...editingColors },
        isPublished: isPublishOnSave,
        authorName: authorNameInput.trim() || 'Saya'
      };
      
      const storageKey = inspectorNik ? `preplab_custom_themes_${inspectorNik}` : 'preplab_guest_custom_themes';
      const updated = editingTemplateId 
        ? customTemplates.map(t => t.id === editingTemplateId ? newTmpl : t)
        : [...customTemplates, newTmpl];
      
      setCustomTemplates(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      handleApplyThemeDirectly(editingColors, customTemplateName.trim());
      toast.success('Tema disimpan & diterapkan secara lokal!', { id: toastId });
      setActiveTab('templates');
    } finally {
      setLoading(false);
    }
  };

  // Toggle publish / unpublish status of a personal template
  const handleTogglePublish = async (tmpl: CustomThemeTemplate) => {
    if (!tmpl.id) return;
    const willPublish = !tmpl.isPublished;
    const toastId = toast.loading(willPublish ? 'Mempublikasikan tema ke komunitas...' : 'Menarik tema dari komunitas...');
    try {
      const res = await fetch(`/api/themes/templates/${tmpl.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: inspectorNik || 'guest',
          isPublished: willPublish,
          authorName: authorNameInput.trim() || undefined
        })
      });
      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toast.success(json.message || 'Status publikasi berhasil diperbarui!', { id: toastId });
        await loadCustomTemplates();
      } else {
        throw new Error(json.message || 'Gagal mengubah status publikasi');
      }
    } catch (e: any) {
      toast.error(e.message || 'Gagal mengubah status publikasi', { id: toastId });
    }
  };

  // Delete a custom template
  const handleDeleteCustomTemplate = async (tmplId?: number) => {
    if (!tmplId) return;
    if (!confirm('Apakah Anda yakin ingin menghapus template custom ini?')) return;

    const toastId = toast.loading('Menghapus template...');
    try {
      const res = await fetch(`/api/themes/templates/${tmplId}?nik=${inspectorNik || 'guest'}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Template kustom berhasil dihapus!', { id: toastId });
        setCustomTemplates(prev => prev.filter(t => t.id !== tmplId));
        setCommunityThemes(prev => prev.filter(t => t.id !== tmplId));
        if (editingTemplateId === tmplId) {
          setEditingTemplateId(null);
        }
      } else {
        throw new Error('Gagal menghapus template dari server');
      }
    } catch (e) {
      // Local fallback
      setCustomTemplates(prev => prev.filter(t => t.id !== tmplId));
      setCommunityThemes(prev => prev.filter(t => t.id !== tmplId));
      const storageKey = inspectorNik ? `preplab_custom_themes_${inspectorNik}` : 'preplab_guest_custom_themes';
      localStorage.setItem(storageKey, JSON.stringify(customTemplates.filter(t => t.id !== tmplId)));
      toast.success('Template dihapus secara lokal!', { id: toastId });
    }
  };

  // Apply colors as active application theme
  const handleApplyAndSaveActiveTheme = async () => {
    setLoading(true);
    const toastId = toast.loading('Menerapkan dan menyimpan tema aktif...');
    try {
      await handleApplyThemeDirectly(editingColors, customTemplateName || targetMode, toastId);
      onClose();
    } catch (e: any) {
      toast.info('Tema diterapkan pada sesi browser ini!', { id: toastId });
      onThemeUpdated(targetMode, editingColors, applyToAllModes);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // Quick smart randomizer / palette generator
  const handleSmartRandomize = () => {
    const randomPresets = Object.values(PRESET_THEMES);
    const chosen = randomPresets[Math.floor(Math.random() * randomPresets.length)];
    setEditingColors({ ...chosen.colors });
    setCustomTemplateName(`Kustom ${chosen.name.split(' ')[0]} ${Math.floor(Math.random() * 900 + 100)}`);
    setEditingTemplateId(null);
    toast.success('Palet acak cantik berhasil dimuat!');
  };

  return (
    <div className={`fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200 ${
      isMaximized ? 'p-0' : 'p-0 sm:p-3 md:p-5'
    }`}>
      <div 
        className={`w-full flex flex-col shadow-2xl transition-all ${
          isMaximized 
            ? 'h-full max-w-full rounded-none border-none' 
            : 'h-full sm:h-[94vh] max-w-6xl sm:rounded-2xl rounded-none border border-slate-700/60'
        }`}
        style={{ 
          backgroundColor: editingColors['--card-bg'] || '#FFFFFF',
          color: editingColors['--text-main'] || '#1E293B'
        }}
      >
        {/* Modal Header */}
        <div 
          className="px-3.5 sm:px-5 py-3 sm:py-3.5 border-b flex justify-between items-center select-none shrink-0"
          style={{ 
            backgroundColor: editingColors['--bg-main'] || '#F8FAFC',
            borderColor: editingColors['--border-main'] || '#E2E8F0'
          }}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div 
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shadow-xs shrink-0"
              style={{ 
                backgroundColor: editingColors['--primary'],
                color: '#FFFFFF'
              }}
            >
              <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base tracking-tight flex items-center gap-2 truncate">
                Studio Tema & Template
                {inspectorNik && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border opacity-75 shrink-0 hidden sm:inline-block" style={{ borderColor: editingColors['--border-main'] }}>
                    NIK: {inspectorNik}
                  </span>
                )}
              </h2>
              <p className="text-[11px] opacity-70 truncate hidden sm:block">
                Kustomisasi warna antarmuka portal dan simpan sebagai template khusus untuk akun Anda.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Toggle Fullscreen / Maximize */}
            <button 
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 rounded-lg transition-colors hover:bg-black/10 opacity-70 hover:opacity-100 cursor-pointer hidden sm:flex items-center justify-center"
              title={isMaximized ? "Kembalikan Ukuran" : "Perbesar Layar Penuh"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button 
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-black/10 opacity-70 hover:opacity-100 cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div 
          className="flex border-b px-3 sm:px-5 pt-2 sm:pt-2.5 gap-2 overflow-x-auto text-xs font-semibold select-none shrink-0 no-scrollbar"
          style={{ 
            backgroundColor: editingColors['--bg-main'] || '#F8FAFC',
            borderColor: editingColors['--border-main'] || '#E2E8F0'
          }}
        >
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-2 px-2.5 sm:px-3 border-b-2 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'templates' 
                ? 'border-current font-bold' 
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{ color: activeTab === 'templates' ? editingColors['--primary'] : 'inherit' }}
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Koleksi Tema ({Object.keys(PRESET_THEMES).length + customTemplates.length + communityThemes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`pb-2 px-2.5 sm:px-3 border-b-2 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'studio' 
                ? 'border-current font-bold' 
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{ color: activeTab === 'studio' ? editingColors['--primary'] : 'inherit' }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Studio Editor Warna</span>
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2 px-2.5 sm:px-3 border-b-2 flex items-center gap-1.5 sm:gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'preview' 
                ? 'border-current font-bold' 
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{ color: activeTab === 'preview' ? editingColors['--primary'] : 'inherit' }}
          >
            <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Simulator UI Penuh</span>
          </button>
        </div>

        {/* Modal Body: Expansive scroll container without rigid height limits */}
        <div className="p-3 sm:p-5 flex-1 overflow-y-auto space-y-5">
          
          {/* TAB 1: TEMPLATE & PRESET DIRECTORY */}
          {activeTab === 'templates' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              
              {/* Category Filter & Search Bar */}
              <div 
                className="p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs"
                style={{ 
                  backgroundColor: editingColors['--bg-main'],
                  borderColor: editingColors['--border-main']
                }}
              >
                {/* Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { key: 'all', label: 'Semua Koleksi', icon: Layers, count: Object.keys(PRESET_THEMES).length + customTemplates.length + communityThemes.length },
                    { key: 'community', label: 'Komunitas & Publik', icon: Globe, count: communityThemes.length },
                    { key: 'mine', label: 'Kustom Saya', icon: Sparkles, count: customTemplates.length },
                    { key: 'presets', label: 'Preset Resmi', icon: Palette, count: Object.keys(PRESET_THEMES).length }
                  ].map(f => {
                    const Icon = f.icon;
                    const isActive = themeFilterCategory === f.key;
                    return (
                      <button
                        key={f.key}
                        onClick={() => setThemeFilterCategory(f.key as any)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isActive ? 'shadow-xs font-bold text-white' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ 
                          backgroundColor: isActive ? editingColors['--primary'] : editingColors['--card-bg'],
                          borderColor: editingColors['--border-main'],
                          color: isActive ? '#FFFFFF' : editingColors['--text-main']
                        }}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{f.label}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-black/10">
                          {f.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Input */}
                <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                  <input
                    type="text"
                    placeholder="Cari tema / nama pembuat..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border outline-none font-medium"
                    style={{ 
                      backgroundColor: editingColors['--input-bg'],
                      borderColor: editingColors['--border-main'],
                      color: editingColors['--text-main']
                    }}
                  />
                </div>
              </div>

              {/* SECTION 1: TEMA KOMUNITAS / PUBLIK (DIBUAT OLEH PERSONIL LAIN / USER) */}
              {(themeFilterCategory === 'all' || themeFilterCategory === 'community') && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Globe className="w-4 h-4 text-teal-500" />
                        Tema Komunitas & Publik (Dibagikan oleh Personil)
                      </h3>
                      <p className="text-xs opacity-75">
                        Koleksi tema custom yang dipublikasikan oleh rekan kerja untuk digunakan bersama.
                      </p>
                    </div>
                  </div>

                  {communityThemes.length === 0 ? (
                    <div 
                      className="p-6 rounded-xl border border-dashed text-center space-y-2"
                      style={{ borderColor: editingColors['--border-main'] }}
                    >
                      <Globe className="w-8 h-8 mx-auto opacity-40 text-teal-500" />
                      <p className="text-xs font-semibold">Belum ada tema yang dipublikasikan ke komunitas.</p>
                      <p className="text-[11px] opacity-70">
                        Buat tema custom di tab <strong>Studio</strong> dan centang <strong>"Publikasikan ke Komunitas"</strong> untuk membagikannya!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {communityThemes
                        .filter(t => {
                          if (!searchQuery.trim()) return true;
                          const q = searchQuery.toLowerCase();
                          return (t.name || '').toLowerCase().includes(q) || (t.authorName || '').toLowerCase().includes(q);
                        })
                        .map(tmpl => {
                          const isOwnTheme = tmpl.nik === inspectorNik;
                          return (
                            <div 
                              key={`comm-${tmpl.id}`}
                              className="p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 shadow-xs hover:shadow-md"
                              style={{ 
                                backgroundColor: tmpl.colors['--card-bg'] || editingColors['--card-bg'],
                                borderColor: tmpl.colors['--border-main'] || editingColors['--border-main'],
                                color: tmpl.colors['--text-main'] || editingColors['--text-main']
                              }}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                  <h4 className="font-bold text-xs truncate" title={tmpl.name}>
                                    {tmpl.name}
                                  </h4>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => handleToggleThemeLike(tmpl, e)}
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                                        (tmpl.likedBy || []).includes(inspectorNik || '')
                                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-500'
                                          : 'bg-black/5 hover:bg-rose-500/10 hover:text-rose-500 border-black/10 opacity-80 hover:opacity-100'
                                      }`}
                                      title={`${tmpl.likesCount || 0} orang menyukai tema ini. Klik untuk menyukai.`}
                                    >
                                      <Heart className={`w-3 h-3 ${((tmpl.likedBy || []).includes(inspectorNik || '')) ? 'fill-rose-500 text-rose-500' : ''}`} />
                                      <span>{tmpl.likesCount || 0}</span>
                                    </button>
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0 flex items-center gap-1">
                                      <Globe className="w-2.5 h-2.5" />
                                      Publik
                                    </span>
                                  </div>
                                </div>

                                {/* Creator Attribution Badge */}
                                <div className="flex items-center gap-1.5 mb-2.5 text-[11px] font-semibold">
                                  <div 
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-2xs shrink-0"
                                    style={{ backgroundColor: tmpl.colors['--primary'] || '#2A9D8F' }}
                                  >
                                    {(tmpl.authorName || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate leading-tight text-[11px]">
                                      Dibuat oleh: <strong className="font-bold">{tmpl.authorName || 'Personil PrepLab'}</strong>
                                    </p>
                                    {tmpl.publishedAt && (
                                      <p className="text-[9px] opacity-60 font-mono">
                                        {new Date(tmpl.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* Color Bar Preview */}
                                <div className="flex h-3.5 rounded-md overflow-hidden border border-black/10 shadow-xs mb-1">
                                  <div style={{ backgroundColor: tmpl.colors['--bg-main'], width: '20%' }} title="Latar Utama" />
                                  <div style={{ backgroundColor: tmpl.colors['--card-bg'], width: '20%' }} title="Latar Kartu" />
                                  <div style={{ backgroundColor: tmpl.colors['--header-bg'] || tmpl.colors['--card-bg'], width: '20%' }} title="Header Atas" />
                                  <div style={{ backgroundColor: tmpl.colors['--footer-selected'] || tmpl.colors['--primary'], width: '20%' }} title="Footer Terpilih" />
                                  <div style={{ backgroundColor: tmpl.colors['--accent'], width: '20%' }} title="Aksen" />
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-black/5 gap-1.5">
                                <button
                                  onClick={() => handleApplyThemeDirectly(tmpl.colors, tmpl.name)}
                                  className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold text-white flex items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer shadow-xs"
                                  style={{ backgroundColor: tmpl.colors['--primary'] }}
                                  title="Pakai tema ini ke seluruh portal"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Pakai Tema
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingColors({ ...tmpl.colors });
                                    setCustomTemplateName(`${tmpl.name} (Salinan)`);
                                    setEditingTemplateId(null);
                                    setIsPublishOnSave(false);
                                    setActiveTab('studio');
                                    toast.success(`Menyalin "${tmpl.name}" ke Studio Anda`);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
                                  title="Salin & Sesuaikan di Studio"
                                >
                                  <Copy className="w-3.5 h-3.5 opacity-80" />
                                </button>

                                {isOwnTheme && (
                                  <button
                                    onClick={() => handleTogglePublish(tmpl)}
                                    className="p-1.5 rounded-lg hover:bg-amber-500/10 text-amber-600 transition-colors cursor-pointer"
                                    title="Tarik dari publik"
                                  >
                                    <Globe className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 2: TEMPLATE KUSTOM PRIBADI */}
              {(themeFilterCategory === 'all' || themeFilterCategory === 'mine') && (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        Template Kustom Pribadi Anda
                      </h3>
                      <p className="text-xs opacity-75">
                        Daftar template warna yang disimpan khusus untuk profil Anda ({inspectorNik || 'Guest'}).
                      </p>
                    </div>
                    <Button 
                      onClick={() => {
                        setEditingTemplateId(null);
                        setCustomTemplateName(`Template Baru ${customTemplates.length + 1}`);
                        setIsPublishOnSave(false);
                        setActiveTab('studio');
                      }}
                      className="!w-auto h-8 text-xs flex items-center gap-1.5 shadow-sm"
                      style={{ backgroundColor: editingColors['--primary'], color: '#FFFFFF' }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Buat Template Baru
                    </Button>
                  </div>

                  {customTemplates.length === 0 ? (
                    <div 
                      className="p-6 rounded-xl border border-dashed text-center space-y-2"
                      style={{ borderColor: editingColors['--border-main'] }}
                    >
                      <Palette className="w-8 h-8 mx-auto opacity-40" />
                      <p className="text-xs font-semibold">Belum ada template kustom yang dibuat.</p>
                      <p className="text-[11px] opacity-70">
                        Klik tombol <strong>"Buat Template Baru"</strong> atau sesuaikan warna di tab <strong>"Studio Editor Warna"</strong> lalu simpan!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {customTemplates
                        .filter(t => {
                          if (!searchQuery.trim()) return true;
                          const q = searchQuery.toLowerCase();
                          return (t.name || '').toLowerCase().includes(q);
                        })
                        .map(tmpl => {
                          const isLoadedInEditor = editingTemplateId === tmpl.id;
                          return (
                            <div 
                              key={tmpl.id || tmpl.name}
                              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 shadow-xs hover:shadow-md ${
                                isLoadedInEditor ? 'ring-2' : ''
                              }`}
                              style={{ 
                                backgroundColor: tmpl.colors['--card-bg'] || editingColors['--card-bg'],
                                borderColor: tmpl.colors['--border-main'] || editingColors['--border-main'],
                                color: tmpl.colors['--text-main'] || editingColors['--text-main'],
                                outlineColor: tmpl.colors['--primary']
                              }}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <h4 className="font-bold text-xs truncate" title={tmpl.name}>
                                    {tmpl.name}
                                  </h4>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {tmpl.isPublished ? (
                                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center gap-1">
                                        <Globe className="w-2.5 h-2.5" />
                                        Publik
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                        Pribadi
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Color Bar Preview */}
                                <div className="flex h-3.5 rounded-md overflow-hidden border border-black/10 shadow-xs mb-2">
                                  <div style={{ backgroundColor: tmpl.colors['--bg-main'], width: '20%' }} title="Latar Utama" />
                                  <div style={{ backgroundColor: tmpl.colors['--card-bg'], width: '20%' }} title="Latar Kartu" />
                                  <div style={{ backgroundColor: tmpl.colors['--header-bg'] || tmpl.colors['--card-bg'], width: '20%' }} title="Header Atas" />
                                  <div style={{ backgroundColor: tmpl.colors['--footer-selected'] || tmpl.colors['--primary'], width: '20%' }} title="Footer Terpilih" />
                                  <div style={{ backgroundColor: tmpl.colors['--accent'], width: '20%' }} title="Aksen" />
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-2 border-t border-black/5 gap-1.5">
                                <button
                                  onClick={() => handleApplyThemeDirectly(tmpl.colors, tmpl.name)}
                                  className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold text-white flex items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer shadow-xs"
                                  style={{ backgroundColor: tmpl.colors['--primary'] }}
                                  title="Pakai tema ini ke seluruh portal"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Pakai Tema
                                </button>

                                <button
                                  onClick={() => handleTogglePublish(tmpl)}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    tmpl.isPublished 
                                      ? 'bg-teal-500/10 text-teal-600 hover:bg-teal-500/20' 
                                      : 'hover:bg-black/10 opacity-70 hover:opacity-100 text-slate-600'
                                  }`}
                                  title={tmpl.isPublished ? "Status: Terpublikasi ke Komunitas (Klik untuk tarik)" : "Publikasikan tema ini ke Komunitas"}
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingColors({ ...tmpl.colors });
                                    setCustomTemplateName(tmpl.name);
                                    setEditingTemplateId(tmpl.id || null);
                                    setIsPublishOnSave(Boolean(tmpl.isPublished));
                                    setActiveTab('studio');
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
                                  title="Edit Warna di Studio"
                                >
                                  <Edit3 className="w-3.5 h-3.5 opacity-80" />
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingColors({ ...tmpl.colors });
                                    setCustomTemplateName(`${tmpl.name} (Salinan)`);
                                    setEditingTemplateId(null);
                                    setIsPublishOnSave(false);
                                    setActiveTab('studio');
                                    toast.success(`Menduplikasi "${tmpl.name}"`);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
                                  title="Duplikat Template Ini"
                                >
                                  <Copy className="w-3.5 h-3.5 opacity-80" />
                                </button>

                                <button
                                  onClick={() => handleDeleteCustomTemplate(tmpl.id)}
                                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-600 transition-colors cursor-pointer"
                                  title="Hapus Template"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: PRESET RESMI PREPLAB */}
              {(themeFilterCategory === 'all' || themeFilterCategory === 'presets') && (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Preset Tema Siap Pakai
                      </h3>
                      <p className="text-xs opacity-75">
                        Kombinasi warna profesional yang dirancang khusus untuk kenyamanan membaca & kerja.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(PRESET_THEMES)
                      .filter(([key, preset]) => {
                        if (!searchQuery.trim()) return true;
                        const q = searchQuery.toLowerCase();
                        return preset.name.toLowerCase().includes(q) || preset.desc.toLowerCase().includes(q);
                      })
                      .map(([key, preset]) => {
                        return (
                          <div 
                            key={key}
                            className="p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 shadow-xs hover:shadow-md cursor-pointer group"
                            style={{ 
                              backgroundColor: preset.colors['--card-bg'],
                              borderColor: preset.colors['--border-main'],
                              color: preset.colors['--text-main']
                            }}
                            onClick={() => handleSelectPreset(key)}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <h4 className="font-bold text-xs truncate">
                                  {preset.name}
                                </h4>
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold bg-slate-500/10 opacity-70">
                                  Preset
                                </span>
                              </div>
                              <p className="text-[11px] opacity-70 line-clamp-2 mb-2.5">
                                {preset.desc}
                              </p>

                              {/* Color Bar Preview */}
                              <div className="flex h-3.5 rounded-md overflow-hidden border border-black/10 shadow-xs">
                                <div style={{ backgroundColor: preset.colors['--bg-main'], width: '20%' }} title="Latar Utama" />
                                <div style={{ backgroundColor: preset.colors['--card-bg'], width: '20%' }} title="Latar Kartu" />
                                <div style={{ backgroundColor: preset.colors['--header-bg'] || preset.colors['--card-bg'], width: '20%' }} title="Header Atas" />
                                <div style={{ backgroundColor: preset.colors['--footer-selected'] || preset.colors['--primary'], width: '20%' }} title="Footer Terpilih" />
                                <div style={{ backgroundColor: preset.colors['--accent'], width: '20%' }} title="Aksen" />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-black/5 gap-2">
                              <span className="text-[10px] opacity-60">Klik untuk menerapkan</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApplyThemeDirectly(preset.colors, preset.name);
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-xs group-hover:scale-105 transition-transform cursor-pointer"
                                style={{ backgroundColor: preset.colors['--primary'] }}
                              >
                                Pakai Preset
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: STUDIO EDITOR WARNA (RESPONSIVE 2-COLUMN ON DESKTOP) */}
          {activeTab === 'studio' && (
            <div className="animate-in fade-in duration-150">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                
                {/* LEFT COLUMN (ON DESKTOP: STICKY PREVIEW & TEMPLATE CONTROLS) */}
                <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-0">
                  
                  {/* REAL-TIME LIVE PREVIEW MOCKUP */}
                  <div 
                    className="p-3.5 sm:p-4 rounded-xl border shadow-xs space-y-3 transition-all"
                    style={{ 
                      backgroundColor: editingColors['--bg-main'],
                      borderColor: editingColors['--border-main'],
                      color: editingColors['--text-main']
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                          <Eye className="w-3.5 h-3.5 text-teal-500" />
                          Pratinjau Langsung
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 font-semibold border border-teal-500/20">
                          Live
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowStudioPreview(!showStudioPreview)}
                        className="text-xs flex items-center gap-1 opacity-70 hover:opacity-100 cursor-pointer font-medium"
                      >
                        {showStudioPreview ? (
                          <>
                            <span>Sembunyikan</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>Tampilkan</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>

                    {showStudioPreview && (
                      <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                        {/* Header Mockup */}
                        <div 
                          className="p-2.5 sm:p-3 rounded-xl border flex items-center justify-between shadow-xs transition-colors"
                          style={{ 
                            backgroundColor: editingColors['--header-bg'] || editingColors['--card-bg'],
                            borderColor: editingColors['--border-main']
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-xs"
                              style={{ backgroundColor: editingColors['--primary'] }}
                            >
                              P
                            </div>
                            <div>
                              <h4 
                                className="font-bold text-xs"
                                style={{ color: editingColors['--header-text'] || editingColors['--text-main'] }}
                              >
                                Prep & Lab Portal
                              </h4>
                              <p className="text-[9px]" style={{ color: editingColors['--text-muted'] }}>
                                Simulasi Header Atas
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span 
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: editingColors['--bubble-color'] }}
                              title="Warna Bubble Notifikasi"
                            />
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-2xs"
                              style={{ backgroundColor: editingColors['--primary'] }}
                            >
                              U
                            </div>
                          </div>
                        </div>

                        {/* Content Card & Buttons */}
                        <div 
                          className="p-3 sm:p-3.5 rounded-xl border shadow-xs space-y-2.5"
                          style={{ 
                            backgroundColor: editingColors['--card-bg'],
                            borderColor: editingColors['--border-main']
                          }}
                        >
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-bold">Contoh Kartu Konten</span>
                            <span 
                              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
                              style={{ 
                                backgroundColor: `${editingColors['--accent']}20`,
                                color: editingColors['--accent'] 
                              }}
                            >
                              AKSEN
                            </span>
                          </div>
                          <p className="text-xs leading-relaxed" style={{ color: editingColors['--text-muted'] }}>
                            Teks sekunder di dalam kartu (<code>--text-muted</code>).
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-xs"
                              style={{ backgroundColor: editingColors['--primary'] }}
                            >
                              Primary
                            </button>
                            <button
                              type="button"
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-xs"
                              style={{ backgroundColor: editingColors['--accent'] }}
                            >
                              Aksen
                            </button>
                            <input
                              type="text"
                              readOnly
                              value="Field Input..."
                              className="px-2 py-1 rounded-lg text-xs border outline-none font-mono text-center flex-1 min-w-[100px]"
                              style={{ 
                                backgroundColor: editingColors['--input-bg'],
                                borderColor: editingColors['--border-main'],
                                color: editingColors['--text-main']
                              }}
                            />
                          </div>
                        </div>

                        {/* Footer Nav Mockup */}
                        <div 
                          className="p-2 rounded-xl border flex items-center justify-around shadow-xs"
                          style={{ 
                            backgroundColor: editingColors['--card-bg'] || editingColors['--bg-main'],
                            borderColor: editingColors['--border-main']
                          }}
                        >
                          <div 
                            className="flex flex-col items-center gap-0.5 font-bold scale-105"
                            style={{ color: editingColors['--footer-selected'] || editingColors['--primary'] }}
                          >
                            <div className="w-3 h-3 rounded bg-current opacity-90" />
                            <span className="text-[8px]">Home (Aktif)</span>
                          </div>
                          <div 
                            className="flex flex-col items-center gap-0.5 opacity-60"
                            style={{ color: editingColors['--text-muted'] }}
                          >
                            <div className="w-3 h-3 rounded border border-current opacity-60" />
                            <span className="text-[8px]">Buletin</span>
                          </div>
                          <div 
                            className="flex flex-col items-center gap-0.5 opacity-60"
                            style={{ color: editingColors['--text-muted'] }}
                          >
                            <div className="w-3 h-3 rounded border border-current opacity-60" />
                            <span className="text-[8px]">Cloud</span>
                          </div>
                          <div 
                            className="flex flex-col items-center gap-0.5 opacity-60"
                            style={{ color: editingColors['--text-muted'] }}
                          >
                            <div className="w-3 h-3 rounded border border-current opacity-60" />
                            <span className="text-[8px]">Settings</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Template Meta & Save Card */}
                  <div 
                    className="p-3.5 sm:p-4 rounded-xl border flex flex-col gap-3 shadow-xs"
                    style={{ 
                      backgroundColor: editingColors['--bg-main'],
                      borderColor: editingColors['--border-main']
                    }}
                  >
                    <div>
                      <label className="text-xs font-bold block mb-1">
                        Nama Template Kustom
                      </label>
                      <input
                        type="text"
                        value={customTemplateName}
                        onChange={e => setCustomTemplateName(e.target.value)}
                        placeholder="Contoh: Tema Favorit Kerja Malam..."
                        className="w-full text-xs font-semibold px-3 py-2 rounded-lg border outline-none focus:ring-2"
                        style={{ 
                          backgroundColor: editingColors['--input-bg'],
                          borderColor: editingColors['--border-main'],
                          color: editingColors['--text-main']
                        }}
                      />
                      {editingTemplateId && (
                        <p className="text-[10px] text-amber-500 font-mono mt-1">
                          Mode: Memperbarui Template ID #{editingTemplateId}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        onClick={handleSmartRandomize}
                        variant="secondary"
                        className="flex-1 h-9 text-xs flex items-center justify-center gap-1.5 cursor-pointer font-semibold"
                        style={{ backgroundColor: editingColors['--card-bg'], color: editingColors['--text-main'] }}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Acak Palet
                      </Button>

                      <Button
                        onClick={handleSaveCustomTemplate}
                        disabled={loading}
                        className="flex-1 h-9 text-xs flex items-center justify-center gap-1.5 shadow-sm text-white font-bold cursor-pointer"
                        style={{ backgroundColor: editingColors['--primary'] }}
                      >
                        <Save className="w-3.5 h-3.5" />
                        {editingTemplateId ? 'Perbarui' : 'Simpan'}
                      </Button>
                    </div>

                    {/* Publish to Community Toggle Box */}
                    <div 
                      className="p-2.5 rounded-lg border flex flex-col gap-2"
                      style={{ 
                        backgroundColor: editingColors['--card-bg'],
                        borderColor: editingColors['--border-main']
                      }}
                    >
                      <div 
                        className="flex items-start gap-2 cursor-pointer select-none"
                        onClick={() => setIsPublishOnSave(!isPublishOnSave)}
                      >
                        {isPublishOnSave ? (
                          <CheckSquare className="w-4 h-4 text-teal-500 mt-0.5 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 opacity-50 mt-0.5 shrink-0" />
                        )}
                        <div>
                          <p className="text-xs font-bold flex items-center gap-1">
                            <Globe className="w-3 h-3 text-teal-500" />
                            Publikasikan ke Komunitas
                          </p>
                          <p className="text-[10px] opacity-70">
                            Bisa dipilih oleh seluruh personil lain.
                          </p>
                        </div>
                      </div>

                      {isPublishOnSave && (
                        <div className="pt-2 border-t flex flex-col gap-1" style={{ borderColor: editingColors['--border-main'] }}>
                          <label className="text-[10px] font-semibold opacity-80">
                            Nama Pembuat (Atribusi):
                          </label>
                          <input
                            type="text"
                            placeholder="Nama atau Panggilan Anda"
                            value={authorNameInput}
                            onChange={e => setAuthorNameInput(e.target.value)}
                            className="text-xs px-2.5 py-1.5 rounded-md border font-semibold outline-none w-full"
                            style={{ 
                              backgroundColor: editingColors['--input-bg'],
                              borderColor: editingColors['--border-main'],
                              color: editingColors['--text-main']
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* RIGHT COLUMN: COLOR PICKER GROUPS */}
                <div className="lg:col-span-7 space-y-4">
                  {['Latar & Kontainer', 'Warna Brand & Aksi', 'Tipografi & Teks'].map(groupTitle => {
                    const groupItems = COLOR_DEFINITIONS.filter(c => c.group === groupTitle);
                    return (
                      <div key={groupTitle} className="space-y-2.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider opacity-75 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: editingColors['--primary'] }} />
                          {groupTitle}
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {groupItems.map(item => {
                            const currentColor = editingColors[item.key] || '#000000';
                            return (
                              <div 
                                key={item.key}
                                className="p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2.5 shadow-xs"
                                style={{ 
                                  backgroundColor: editingColors['--card-bg'],
                                  borderColor: editingColors['--border-main']
                                }}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold truncate">
                                    {item.label}
                                  </p>
                                  <p className="text-[10px] opacity-70 truncate font-mono">
                                    {item.key}
                                  </p>
                                  <p className="text-[10px] opacity-60 truncate">
                                    {item.desc}
                                  </p>
                                </div>

                                {/* Color Picker & Hex Input */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <div 
                                    className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-lg border shadow-xs overflow-hidden cursor-pointer shrink-0"
                                    style={{ borderColor: editingColors['--border-main'] }}
                                  >
                                    <input
                                      type="color"
                                      value={currentColor}
                                      onChange={e => setEditingColors({ ...editingColors, [item.key]: e.target.value })}
                                      className="absolute inset-[-12px] w-16 h-16 cursor-pointer"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    value={currentColor}
                                    onChange={e => setEditingColors({ ...editingColors, [item.key]: e.target.value })}
                                    className="w-18 text-[11px] font-mono uppercase h-8 sm:h-9 px-1.5 rounded-lg border outline-none text-center font-bold"
                                    style={{ 
                                      backgroundColor: editingColors['--input-bg'],
                                      borderColor: editingColors['--border-main'],
                                      color: editingColors['--text-main']
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: LIVE PREVIEW SIMULATOR */}
          {activeTab === 'preview' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Simulasi UI Interaktif
                  </h3>
                  <p className="text-xs opacity-75">
                    Pratinjau langsung bagaimana komponen aplikasi terlihat dengan setelan warna aktif saat ini.
                  </p>
                </div>
              </div>

              {/* Mock Dashboard Frame */}
              <div 
                className="p-5 rounded-2xl border shadow-md space-y-4 transition-all"
                style={{ 
                  backgroundColor: editingColors['--bg-main'],
                  borderColor: editingColors['--border-main'],
                  color: editingColors['--text-main']
                }}
              >
                {/* Mock Header */}
                <div 
                  className="p-3.5 rounded-xl border flex items-center justify-between shadow-xs transition-colors"
                  style={{ 
                    backgroundColor: editingColors['--header-bg'] || editingColors['--card-bg'],
                    borderColor: editingColors['--border-main']
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow-xs"
                      style={{ backgroundColor: editingColors['--primary'] }}
                    >
                      P
                    </div>
                    <div>
                      <h4 
                        className="font-bold text-xs"
                        style={{ color: editingColors['--header-text'] || editingColors['--text-main'] }}
                      >
                        Prep & Lab Portal
                      </h4>
                      <p className="text-[10px]" style={{ color: editingColors['--text-muted'] }}>
                        Simulasi Navigasi & Header Atas
                      </p>
                    </div>
                  </div>

                  <span 
                    className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white shadow-xs"
                    style={{ backgroundColor: editingColors['--accent'] }}
                  >
                    Mode: {targetMode.toUpperCase()}
                  </span>
                </div>

                {/* Mock Widgets Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Card 1 */}
                  <div 
                    className="p-4 rounded-xl border shadow-xs space-y-3"
                    style={{ 
                      backgroundColor: editingColors['--card-bg'],
                      borderColor: editingColors['--border-main']
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Ringkasan P5M & Shift</span>
                      <span 
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: editingColors['--bubble-color'] }}
                      />
                    </div>
                    <p className="text-xs" style={{ color: editingColors['--text-muted'] }}>
                      Ini adalah teks deskripsi standar yang menggunakan variabel warna <code>--text-muted</code>.
                    </p>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-transform active:scale-95"
                        style={{ backgroundColor: editingColors['--primary'] }}
                      >
                        Tombol Utama
                      </button>
                      <button
                        type="button"
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs transition-transform active:scale-95"
                        style={{ backgroundColor: editingColors['--accent'] }}
                      >
                        Tombol Aksi
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Form Input Mockup */}
                  <div 
                    className="p-4 rounded-xl border shadow-xs space-y-3"
                    style={{ 
                      backgroundColor: editingColors['--card-bg'],
                      borderColor: editingColors['--border-main']
                    }}
                  >
                    <span className="text-xs font-bold">Simulasi Formulir Input</span>
                    <input 
                      type="text"
                      readOnly
                      value="Contoh input teks form pengguna..."
                      className="w-full text-xs px-3 py-2 rounded-lg border outline-none"
                      style={{ 
                        backgroundColor: editingColors['--input-bg'],
                        borderColor: editingColors['--border-main'],
                        color: editingColors['--text-main']
                      }}
                    />
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span style={{ color: editingColors['--text-muted'] }}>Status Terverifikasi</span>
                      <span 
                        className="font-bold font-mono px-2 py-0.5 rounded text-[10px]"
                        style={{ 
                          backgroundColor: `${editingColors['--primary']}20`,
                          color: editingColors['--primary']
                        }}
                      >
                        AKTIF & SEHAT
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mock Bottom Footer Nav */}
                <div 
                  className="p-2.5 rounded-xl border flex items-center justify-around shadow-xs"
                  style={{ 
                    backgroundColor: editingColors['--card-bg'] || editingColors['--bg-main'],
                    borderColor: editingColors['--border-main']
                  }}
                >
                  <div 
                    className="flex flex-col items-center gap-0.5 cursor-pointer font-bold scale-105 transition-transform"
                    style={{ color: editingColors['--footer-selected'] || editingColors['--primary'] }}
                  >
                    <div className="w-3.5 h-3.5 rounded bg-current opacity-90" />
                    <span className="text-[9px]">Home (Aktif)</span>
                  </div>
                  <div 
                    className="flex flex-col items-center gap-0.5 opacity-60"
                    style={{ color: editingColors['--text-muted'] }}
                  >
                    <div className="w-3.5 h-3.5 rounded border border-current opacity-60" />
                    <span className="text-[9px]">Buletin</span>
                  </div>
                  <div 
                    className="flex flex-col items-center gap-0.5 opacity-60"
                    style={{ color: editingColors['--text-muted'] }}
                  >
                    <div className="w-3.5 h-3.5 rounded border border-current opacity-60" />
                    <span className="text-[9px]">Cloud</span>
                  </div>
                  <div 
                    className="flex flex-col items-center gap-0.5 opacity-60"
                    style={{ color: editingColors['--text-muted'] }}
                  >
                    <div className="w-3.5 h-3.5 rounded border border-current opacity-60" />
                    <span className="text-[9px]">Settings</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODE ASSIGNMENT & TARGET TIME (ALWAYS VISIBLE AT BOTTOM OF BODY) */}
          <div 
            className="p-4 rounded-xl border space-y-3 shadow-xs"
            style={{ 
              backgroundColor: editingColors['--bg-main'],
              borderColor: editingColors['--border-main']
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold block mb-1">
                  Pilih Waktu Mode yang Dituju
                </label>
                <p className="text-[11px] opacity-70">
                  Tema dapat otomatis berganti mengikuti jam kerja (Pagi, Siang, Malam).
                </p>
              </div>

              {/* Mode Select Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'morning', label: 'Pagi (05:00 - 11:59)', icon: Sun },
                  { key: 'afternoon', label: 'Siang (12:00 - 17:59)', icon: Sunset },
                  { key: 'evening', label: 'Malam (18:00 - 04:59)', icon: Moon }
                ].map(m => {
                  const Icon = m.icon;
                  const isTarget = targetMode === m.key;
                  return (
                    <button
                      key={m.key}
                      onClick={() => setTargetMode(m.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                        isTarget ? 'shadow-xs font-bold text-white' : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ 
                        backgroundColor: isTarget ? editingColors['--primary'] : editingColors['--card-bg'],
                        borderColor: editingColors['--border-main'],
                        color: isTarget ? '#FFFFFF' : editingColors['--text-main']
                      }}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {m.label.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Checkbox Apply to All */}
            <div 
              className="pt-2 border-t flex items-center gap-2 cursor-pointer select-none"
              style={{ borderColor: editingColors['--border-main'] }}
              onClick={() => setApplyToAllModes(!applyToAllModes)}
            >
              {applyToAllModes ? (
                <CheckSquare className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <Square className="w-4 h-4 opacity-50 flex-shrink-0" />
              )}
              <span className="text-xs font-medium">
                Terapkan template ini ke <strong>Semua Waktu Sekaligus</strong> (Pagi, Siang & Malam).
              </span>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div 
          className="p-4 border-t flex flex-wrap gap-2 justify-between items-center"
          style={{ 
            backgroundColor: editingColors['--bg-main'] || '#F8FAFC',
            borderColor: editingColors['--border-main'] || '#E2E8F0'
          }}
        >
          <Button 
            onClick={onClose} 
            variant="secondary" 
            className="!w-auto text-xs"
            style={{ 
              backgroundColor: editingColors['--card-bg'], 
              color: editingColors['--text-main'] 
            }}
          >
            Tutup
          </Button>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleApplyAndSaveActiveTheme}
              disabled={loading}
              className="!w-auto text-xs font-bold text-white shadow-md flex items-center gap-2 px-4 py-2"
              style={{ backgroundColor: editingColors['--primary'] }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Terapkan & Simpan Tema Aktif
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
