import React, { useState } from 'react';
import { Button, Input, Select } from './ui';
import { X, Save, Palette } from 'lucide-react';
import { toast } from 'sonner';

const PRESET_THEMES = {
  default: { '--bg-main': '#FFFFFF', '--primary': '#2A9D8F', '--primary-hover': '#23A3B4', '--accent': '#E9930D', '--card-bg': '#FFFFFF', '--text-main': '#333333', '--text-muted': '#4A4A4A', '--border-main': '#DCE8F8', '--input-bg': '#FFFFFF', '--bubble-color': '#E9930D' },
  morning: { '--bg-main': '#FFFFFF', '--primary': '#2A9D8F', '--primary-hover': '#23A3B4', '--accent': '#E9930D', '--card-bg': '#FFFFFF', '--text-main': '#333333', '--text-muted': '#4A4A4A', '--border-main': '#DCE8F8', '--input-bg': '#FFFFFF', '--bubble-color': '#E9930D' },
  afternoon: { '--bg-main': '#FFFFFF', '--primary': '#2A9D8F', '--primary-hover': '#23A3B4', '--accent': '#E9930D', '--card-bg': '#FFFFFF', '--text-main': '#333333', '--text-muted': '#4A4A4A', '--border-main': '#DCE8F8', '--input-bg': '#FFFFFF', '--bubble-color': '#E9930D' },
  evening: { '--bg-main': '#0F172A', '--primary': '#2A9D8F', '--primary-hover': '#23A3B4', '--accent': '#E9930D', '--card-bg': '#1E293B', '--text-main': '#F8FAFC', '--text-muted': '#94A3B8', '--border-main': '#334155', '--input-bg': '#0F172A', '--bubble-color': '#E9930D' },
  ocean: { '--bg-main': '#E0F2FE', '--primary': '#0284C7', '--primary-hover': '#0369A1', '--accent': '#38BDF8', '--card-bg': '#FFFFFF', '--text-main': '#0F172A', '--text-muted': '#64748B', '--border-main': '#BAE6FD', '--input-bg': '#FFFFFF', '--bubble-color': '#0EA5E9' },
  monochrome: { '--bg-main': '#F8FAFC', '--primary': '#1E293B', '--primary-hover': '#0F172A', '--accent': '#64748B', '--card-bg': '#FFFFFF', '--text-main': '#0F172A', '--text-muted': '#64748B', '--border-main': '#E2E8F0', '--input-bg': '#FFFFFF', '--bubble-color': '#475569' }
};

export default function ThemeModal({ show, onClose, currentMode, userThemes, inspectorNik, onThemeUpdated }: any) {
  const [editThemeMode, setEditThemeMode] = useState(currentMode);
  const [editingColors, setEditingColors] = useState(userThemes[currentMode]);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    setEditingColors(userThemes[editThemeMode]);
  }, [editThemeMode, userThemes]);

  if (!show) return null;

  const saveTheme = async () => {
    setLoading(true);
    toast.loading('Menyimpan tema...', { id: 'saveTheme' });
    try {
      const res = await fetch('/api/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik: inspectorNik || 'unknown', mode: editThemeMode, themeName: editThemeMode, colors: editingColors })
      });
      if (res.ok) {
        toast.success('Tema berhasil disimpan!', { id: 'saveTheme' });
        onThemeUpdated(editThemeMode, editingColors);
        onClose();
      } else {
        throw new Error('Gagal menyimpan tema');
      }
    } catch (e: any) {
      toast.error(e.message, { id: 'saveTheme' });
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (presetKey: keyof typeof PRESET_THEMES) => {
    setEditingColors({ ...PRESET_THEMES[presetKey] });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl flex flex-col" style={{ backgroundColor: 'var(--card-bg, #fff)', borderColor: 'var(--border-main, #e2e8f0)', borderWidth: 1 }}>
        <div className="p-4 border-b flex justify-between items-center" style={{ backgroundColor: 'var(--bg-main, #f8fafc)', borderColor: 'var(--border-main, #e2e8f0)' }}>
          <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--primary, #0f172a)' }}>Pengaturan Tema</h2>
          <button onClick={onClose}><X className="w-5 h-5 opacity-50 hover:opacity-100" style={{ color: 'var(--text-main, #333)' }}/></button>
        </div>
        <div className="p-5 flex flex-col md:flex-row gap-6 max-h-[70vh] overflow-y-auto">
          <div className="flex-1 space-y-4">
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted, #64748b)' }}>Pilih Waktu/Mode yang Akan Diedit</label>
                <Select 
                  value={editThemeMode} 
                  onChange={e => setEditThemeMode(e.target.value)} 
                  options={[
                    {label: 'Pagi (05:00 - 11:59)', value: 'morning'},
                    {label: 'Siang (12:00 - 17:59)', value: 'afternoon'},
                    {label: 'Malam (18:00 - 04:59)', value: 'evening'}
                  ]} 
                  style={{ backgroundColor: 'var(--input-bg, #fff)', color: 'var(--text-main, #333)', borderColor: 'var(--border-main, #e2e8f0)' }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted, #64748b)' }}>Preset Cepat</label>
                <div className="flex flex-wrap gap-2">
                   {Object.keys(PRESET_THEMES).map(k => (
                       <button 
                         key={k} 
                         onClick={() => applyPreset(k as any)}
                         className="px-3 py-1.5 text-xs font-semibold rounded-md border shadow-sm capitalize hover:scale-105 transition-transform"
                         style={{ 
                            backgroundColor: PRESET_THEMES[k as keyof typeof PRESET_THEMES]['--card-bg'], 
                            color: PRESET_THEMES[k as keyof typeof PRESET_THEMES]['--primary'],
                            borderColor: PRESET_THEMES[k as keyof typeof PRESET_THEMES]['--primary']
                         }}
                       >
                         {k}
                       </button>
                   ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-dashed" style={{ borderColor: 'var(--border-main)', backgroundColor: 'var(--bg-main)' }}>
                 <p className="text-sm font-bold mb-2" style={{ color: 'var(--primary)' }}>Preview Warn</p>
                 <div className="flex gap-2 mb-2">
                    <Button style={{ backgroundColor: editingColors['--primary'], color: '#fff' }} className="!w-auto h-8 text-xs border-0">Primary</Button>
                    <Button style={{ backgroundColor: editingColors['--accent'], color: editingColors['--text-main'] }} className="!w-auto h-8 text-xs border-0">Accent</Button>
                 </div>
                 <div className="p-3 rounded-lg shadow-sm border" style={{ backgroundColor: editingColors['--card-bg'], borderColor: editingColors['--border-main'] }}>
                    <p className="text-sm font-bold" style={{ color: editingColors['--text-main'] }}>Card Title</p>
                    <p className="text-xs" style={{ color: editingColors['--text-muted'] }}>Card description text goes here.</p>
                 </div>
              </div>
          </div>

          <div className="flex-1 space-y-3">
            <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted, #64748b)' }}>Kustomisasi Warna</label>
            {Object.keys(editingColors).map(key => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-semibold w-1/2 truncate" style={{ color: 'var(--text-main, #333)' }}>{key.replace('--', '')}</span>
                <div className="flex items-center gap-1 w-1/2 justify-end">
                  <div className="relative w-8 h-8 rounded border shadow-sm overflow-hidden" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
                     <input 
                       type="color" 
                       value={editingColors[key] || '#000000'} 
                       onChange={e => setEditingColors({...editingColors, [key]: e.target.value})}
                       className="absolute inset-[-10px] w-12 h-12 cursor-pointer"
                     />
                  </div>
                  <Input 
                    type="text" 
                    value={editingColors[key]} 
                    onChange={e => setEditingColors({...editingColors, [key]: e.target.value})} 
                    className="w-20 text-[10px] h-8 px-1"
                    style={{ backgroundColor: 'var(--input-bg, #fff)', color: 'var(--text-main, #333)', borderColor: 'var(--border-main, #e2e8f0)' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 border-t flex flex-wrap gap-2 justify-end bg-black/5" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
          <Button onClick={onClose} variant="secondary" className="flex-1 md:flex-none md:!w-auto" style={{ backgroundColor: 'var(--card-bg, #fff)', color: 'var(--text-main, #333)' }}>Batal</Button>
          <Button onClick={saveTheme} disabled={loading} className="flex-1 md:flex-none md:!w-auto" style={{ backgroundColor: 'var(--primary, #0f172a)', color: '#fff' }}><Save className="w-4 h-4 mr-2" /> Simpan Tema</Button>
        </div>
      </div>
    </div>
  );
}
