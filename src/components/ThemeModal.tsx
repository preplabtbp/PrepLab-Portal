import React, { useState, useEffect, useMemo } from 'react';
import { Button, Input, Select } from './ui';
import { 
  X, Save, Palette, Plus, Trash2, Edit3, Copy, Check, 
  Sparkles, RefreshCw, Layers, Eye, CheckCircle2, Sun, 
  Moon, Sunset, SlidersHorizontal, CheckSquare, Square
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
}

export interface CustomThemeTemplate {
  id?: number;
  name: string;
  mode?: string;
  colors: ThemeColors;
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
      '--bubble-color': '#E9930D'
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
      '--bubble-color': '#06B6D4'
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
      '--bubble-color': '#F97316'
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
      '--bubble-color': '#0EA5E9'
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
      '--bubble-color': '#10B981'
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
      '--bubble-color': '#F43F5E'
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
      '--bubble-color': '#10B981'
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
      '--bubble-color': '#B45309'
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
      '--bubble-color': '#334155'
    }
  }
};

const COLOR_DEFINITIONS: Array<{ key: keyof ThemeColors; label: string; group: string; desc: string }> = [
  { key: '--bg-main', label: 'Background Utama', group: 'Latar & Kontainer', desc: 'Warna latar belakang dasar aplikasi' },
  { key: '--card-bg', label: 'Background Kartu & Panel', group: 'Latar & Kontainer', desc: 'Latar kotak konten, kartu dashboard & modal' },
  { key: '--input-bg', label: 'Background Input Form', group: 'Latar & Kontainer', desc: 'Latar belakang field form, select, dan input teks' },
  { key: '--border-main', label: 'Garis Tepi (Border)', group: 'Latar & Kontainer', desc: 'Warna garis batas pemisah antar elemen' },
  
  { key: '--primary', label: 'Warna Utama (Primary)', group: 'Warna Brand & Aksi', desc: 'Tombol utama, header judul, dan navigasi aktif' },
  { key: '--primary-hover', label: 'Warna Hover Primary', group: 'Warna Brand & Aksi', desc: 'Efek saat kursor berada di atas tombol utama' },
  { key: '--accent', label: 'Warna Aksen (Highlight)', group: 'Warna Brand & Aksi', desc: 'Tombol aksi khusus, highlight, dan badge penting' },
  { key: '--bubble-color', label: 'Warna Bubble & Badge', group: 'Warna Brand & Aksi', desc: 'Indikator notifikasi, bubble chat, dan tag status' },

  { key: '--text-main', label: 'Teks Utama', group: 'Tipografi & Teks', desc: 'Warna teks judul dan konten penting' },
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
  const [activeTab, setActiveTab] = useState<'templates' | 'studio' | 'preview'>('templates');
  const [targetMode, setTargetMode] = useState(currentMode || 'morning');
  const [applyToAllModes, setApplyToAllModes] = useState(false);
  
  // Custom templates state
  const [customTemplates, setCustomTemplates] = useState<CustomThemeTemplate[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [customTemplateName, setCustomTemplateName] = useState('Tema Kustom Saya');
  const [loading, setLoading] = useState(false);
  const [fetchingTemplates, setFetchingTemplates] = useState(false);

  // Active color editor state
  const defaultColors = useMemo(() => {
    return userThemes[currentMode] || PRESET_THEMES.preplab_emerald.colors;
  }, [userThemes, currentMode]);

  const [editingColors, setEditingColors] = useState<ThemeColors>(defaultColors);

  // Load custom templates for this specific user
  const loadCustomTemplates = async () => {
    if (!inspectorNik) {
      // Load from local storage fallback
      const localCached = localStorage.getItem('preplab_guest_custom_themes');
      if (localCached) {
        try { setCustomTemplates(JSON.parse(localCached)); } catch(e) {}
      }
      return;
    }

    setFetchingTemplates(true);
    try {
      const res = await fetch(`/api/themes/${inspectorNik}`);
      const json = await res.json();
      if (json.status === 'success') {
        if (Array.isArray(json.customTemplates)) {
          setCustomTemplates(json.customTemplates);
          localStorage.setItem(`preplab_custom_themes_${inspectorNik}`, JSON.stringify(json.customTemplates));
        }
      }
    } catch (e) {
      console.error("Gagal mengambil template kustom:", e);
      const localCached = localStorage.getItem(`preplab_custom_themes_${inspectorNik}`);
      if (localCached) {
        try { setCustomTemplates(JSON.parse(localCached)); } catch(err) {}
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

  // Apply a preset template to editor
  const handleSelectPreset = (presetKey: string) => {
    const preset = PRESET_THEMES[presetKey];
    if (!preset) return;
    setEditingColors({ ...preset.colors });
    setCustomTemplateName(preset.name);
    setEditingTemplateId(null);
    toast.success(`Preset "${preset.name}" dipilih`);
  };

  // Apply custom template to editor
  const handleSelectCustomTemplate = (tmpl: CustomThemeTemplate) => {
    setEditingColors({ ...tmpl.colors });
    setCustomTemplateName(tmpl.name);
    setEditingTemplateId(tmpl.id || null);
    toast.success(`Template kustom "${tmpl.name}" dimuat`);
  };

  // Save current colors as a NEW or UPDATED Custom Template
  const handleSaveCustomTemplate = async () => {
    if (!customTemplateName.trim()) {
      toast.error('Harap masukkan nama template custom Anda!');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Menyimpan template custom...');
    try {
      const payload = {
        nik: inspectorNik || 'guest',
        id: editingTemplateId || undefined,
        name: customTemplateName.trim(),
        colors: editingColors
      };

      const res = await fetch('/api/themes/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (res.ok && json.status === 'success') {
        toast.success(json.message || 'Template kustom berhasil disimpan!', { id: toastId });
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
        colors: { ...editingColors }
      };
      
      const storageKey = inspectorNik ? `preplab_custom_themes_${inspectorNik}` : 'preplab_guest_custom_themes';
      const updated = editingTemplateId 
        ? customTemplates.map(t => t.id === editingTemplateId ? newTmpl : t)
        : [...customTemplates, newTmpl];
      
      setCustomTemplates(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      toast.success('Template disimpan ke memori lokal!', { id: toastId });
      setActiveTab('templates');
    } finally {
      setLoading(false);
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
        if (editingTemplateId === tmplId) {
          setEditingTemplateId(null);
        }
      } else {
        throw new Error('Gagal menghapus template dari server');
      }
    } catch (e) {
      // Local fallback
      setCustomTemplates(prev => prev.filter(t => t.id !== tmplId));
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
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: inspectorNik || 'guest',
          mode: targetMode,
          themeName: customTemplateName || targetMode,
          colors: editingColors,
          applyToAll: applyToAllModes
        })
      });

      if (res.ok) {
        toast.success(applyToAllModes ? 'Tema diterapkan ke semua waktu!' : `Tema berhasil diterapkan untuk waktu ${targetMode}!`, { id: toastId });
        onThemeUpdated(targetMode, editingColors, applyToAllModes);
        onClose();
      } else {
        throw new Error('Gagal menyimpan tema aktif ke server');
      }
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
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[92vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-700/60 transition-all"
        style={{ 
          backgroundColor: editingColors['--card-bg'] || '#FFFFFF',
          color: editingColors['--text-main'] || '#1E293B'
        }}
      >
        {/* Modal Header */}
        <div 
          className="px-5 py-4 border-b flex justify-between items-center select-none"
          style={{ 
            backgroundColor: editingColors['--bg-main'] || '#F8FAFC',
            borderColor: editingColors['--border-main'] || '#E2E8F0'
          }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ 
                backgroundColor: editingColors['--primary'],
                color: '#FFFFFF'
              }}
            >
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base sm:text-lg tracking-tight flex items-center gap-2">
                Studio Tema & Template Kustom
                {inspectorNik && (
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded-full border opacity-80" style={{ borderColor: editingColors['--border-main'] }}>
                    NIK: {inspectorNik}
                  </span>
                )}
              </h2>
              <p className="text-xs opacity-75">
                Kustomisasi warna antarmuka portal dan simpan sebagai template khusus untuk akun Anda.
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 rounded-lg transition-colors hover:bg-black/10 opacity-70 hover:opacity-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div 
          className="flex border-b px-5 pt-3 gap-2 overflow-x-auto text-xs font-semibold select-none"
          style={{ 
            backgroundColor: editingColors['--bg-main'] || '#F8FAFC',
            borderColor: editingColors['--border-main'] || '#E2E8F0'
          }}
        >
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'templates' 
                ? 'border-current font-bold' 
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{ color: activeTab === 'templates' ? editingColors['--primary'] : 'inherit' }}
          >
            <Layers className="w-4 h-4" />
            Koleksi Template & Preset ({Object.keys(PRESET_THEMES).length + customTemplates.length})
          </button>

          <button
            onClick={() => setActiveTab('studio')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'studio' 
                ? 'border-current font-bold' 
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{ color: activeTab === 'studio' ? editingColors['--primary'] : 'inherit' }}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Studio Editor Warna
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-2 transition-all ${
              activeTab === 'preview' 
                ? 'border-current font-bold' 
                : 'border-transparent opacity-60 hover:opacity-100'
            }`}
            style={{ color: activeTab === 'preview' ? editingColors['--primary'] : 'inherit' }}
          >
            <Eye className="w-4 h-4" />
            Simulasi Pratinjau UI
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto max-h-[62vh] space-y-6">
          
          {/* TAB 1: TEMPLATE & PRESET DIRECTORY */}
          {activeTab === 'templates' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* SECTION A: TEMPLATE KUSTOM PENGGUNA */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Template Kustom Tersimpan Anda
                    </h3>
                    <p className="text-xs opacity-75">
                      Daftar template warna yang disimpan khusus untuk profil Anda ({inspectorNik || 'Guest'}).
                    </p>
                  </div>
                  <Button 
                    onClick={() => {
                      setEditingTemplateId(null);
                      setCustomTemplateName(`Template Baru ${customTemplates.length + 1}`);
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
                    {customTemplates.map(tmpl => {
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
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                Kustom
                              </span>
                            </div>

                            {/* Color Bar Preview */}
                            <div className="flex h-3.5 rounded-md overflow-hidden border border-black/10 shadow-xs mb-2">
                              <div style={{ backgroundColor: tmpl.colors['--bg-main'], width: '25%' }} title="Latar Utama" />
                              <div style={{ backgroundColor: tmpl.colors['--card-bg'], width: '25%' }} title="Latar Kartu" />
                              <div style={{ backgroundColor: tmpl.colors['--primary'], width: '25%' }} title="Primary" />
                              <div style={{ backgroundColor: tmpl.colors['--accent'], width: '25%' }} title="Accent" />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-black/5 gap-1.5">
                            <button
                              onClick={() => handleSelectCustomTemplate(tmpl)}
                              className="flex-1 py-1 px-2 rounded text-[11px] font-semibold text-white flex items-center justify-center gap-1 transition-transform active:scale-95"
                              style={{ backgroundColor: tmpl.colors['--primary'] }}
                            >
                              <Check className="w-3 h-3" />
                              Pilih
                            </button>

                            <button
                              onClick={() => {
                                handleSelectCustomTemplate(tmpl);
                                setActiveTab('studio');
                              }}
                              className="p-1.5 rounded hover:bg-black/10 transition-colors"
                              title="Edit Warna di Studio"
                            >
                              <Edit3 className="w-3.5 h-3.5 opacity-80" />
                            </button>

                            <button
                              onClick={() => {
                                setEditingColors({ ...tmpl.colors });
                                setCustomTemplateName(`${tmpl.name} (Salinan)`);
                                setEditingTemplateId(null);
                                setActiveTab('studio');
                                toast.success(`Menduplikasi "${tmpl.name}"`);
                              }}
                              className="p-1.5 rounded hover:bg-black/10 transition-colors"
                              title="Duplikat Template Ini"
                            >
                              <Copy className="w-3.5 h-3.5 opacity-80" />
                            </button>

                            <button
                              onClick={() => handleDeleteCustomTemplate(tmpl.id)}
                              className="p-1.5 rounded hover:bg-rose-500/10 text-rose-600 transition-colors"
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

              {/* SECTION B: PRESET RESMI PREPLAB */}
              <div>
                <div className="flex justify-between items-center mb-3">
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
                  {Object.entries(PRESET_THEMES).map(([key, preset]) => {
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
                            <div style={{ backgroundColor: preset.colors['--bg-main'], width: '25%' }} title="Latar Utama" />
                            <div style={{ backgroundColor: preset.colors['--card-bg'], width: '25%' }} title="Latar Kartu" />
                            <div style={{ backgroundColor: preset.colors['--primary'], width: '25%' }} title="Primary" />
                            <div style={{ backgroundColor: preset.colors['--accent'], width: '25%' }} title="Accent" />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-black/5 gap-2">
                          <span className="text-[10px] opacity-60">Klik untuk memuat</span>
                          <button
                            type="button"
                            className="px-2.5 py-1 rounded text-[11px] font-bold text-white shadow-xs group-hover:scale-105 transition-transform"
                            style={{ backgroundColor: preset.colors['--primary'] }}
                          >
                            Pilih Preset
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: STUDIO EDITOR WARNA */}
          {activeTab === 'studio' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Template Info Card */}
              <div 
                className="p-4 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs"
                style={{ 
                  backgroundColor: editingColors['--bg-main'],
                  borderColor: editingColors['--border-main']
                }}
              >
                <div className="flex-1">
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

                <div className="flex items-end gap-2 shrink-0">
                  <Button
                    onClick={handleSmartRandomize}
                    variant="secondary"
                    className="!w-auto h-9 text-xs flex items-center gap-1.5"
                    style={{ backgroundColor: editingColors['--card-bg'], color: editingColors['--text-main'] }}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Acak Palet
                  </Button>

                  <Button
                    onClick={handleSaveCustomTemplate}
                    disabled={loading}
                    className="!w-auto h-9 text-xs flex items-center gap-1.5 shadow-sm text-white font-bold"
                    style={{ backgroundColor: editingColors['--primary'] }}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {editingTemplateId ? 'Perbarui Template' : 'Simpan Template Kustom'}
                  </Button>
                </div>
              </div>

              {/* Color Groups */}
              {['Latar & Kontainer', 'Warna Brand & Aksi', 'Tipografi & Teks'].map(groupTitle => {
                const groupItems = COLOR_DEFINITIONS.filter(c => c.group === groupTitle);
                return (
                  <div key={groupTitle} className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider opacity-75 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: editingColors['--primary'] }} />
                      {groupTitle}
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {groupItems.map(item => {
                        const currentColor = editingColors[item.key] || '#000000';
                        return (
                          <div 
                            key={item.key}
                            className="p-3 rounded-xl border flex items-center justify-between gap-3 shadow-xs"
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
                            <div className="flex items-center gap-2 shrink-0">
                              <div 
                                className="relative w-9 h-9 rounded-lg border shadow-xs overflow-hidden cursor-pointer"
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
                                className="w-20 text-[11px] font-mono uppercase h-9 px-2 rounded-lg border outline-none text-center font-bold"
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
                  className="p-3.5 rounded-xl border flex items-center justify-between shadow-xs"
                  style={{ 
                    backgroundColor: editingColors['--card-bg'],
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
                      <h4 className="font-bold text-xs">PrepLab Portal Hub</h4>
                      <p className="text-[10px]" style={{ color: editingColors['--text-muted'] }}>
                        Simulasi Navigasi & Header
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
