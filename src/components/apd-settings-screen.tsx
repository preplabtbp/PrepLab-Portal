import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { Settings2, Save, AlertCircle, Clock, ArrowLeft } from 'lucide-react';
import { Button, Input } from './ui';
import { PageHeader } from './PageHeader';
import { getApdSettings, saveApdSettings } from '../sheets-api';

const APD_TYPES = [
  "Earplug",
  "Stagen",
  "Safety Glass",
  "Filter Masker Moncong (3M)",
  "Masker Moncong (3M)",
  "Earmuff",
  "Sandal Safety",
  "Jas Laboratorium",
  "Safety Vest (Rompi)",
  "Rompi Hijau",
  "Sepatu Safety"
];

export interface ApdSettingsScreenProps {
  onBack?: () => void;
  onNav?: (tab: string) => void;
}

export function ApdSettingsScreen({ onBack, onNav }: ApdSettingsScreenProps = {}) {
  const [intervals, setIntervals] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const data = await getApdSettings();
      // Use fetched data, or default if not set
      const initialSettings: Record<string, number> = {};
      APD_TYPES.forEach(apd => {
        initialSettings[apd] = data[apd] !== undefined ? data[apd] : 0;
      });
      setIntervals(initialSettings);
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil pengaturan interval');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveApdSettings(intervals);
      toast.success('Pengaturan interval APD berhasil disimpan!');
    } catch (err) {
      console.error(err);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setSaving(false);
    }
  };


  const handleIntervalChange = (apd: string, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 0) {
      setIntervals(prev => ({ ...prev, [apd]: num }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-12 max-w-5xl mx-auto px-2 sm:px-4">
      {/* Sub-module Navigation Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="py-2 px-3 rounded-xl border border-[var(--border-main)] bg-[var(--card-bg)] text-[var(--text-main)] text-xs font-bold hover:bg-[var(--input-bg)] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-purple-600" />
              <span>Kembali</span>
            </button>
          )}
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider hidden sm:inline">
            Modul APD
          </span>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center p-1 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] gap-1">
          <button
            type="button"
            onClick={() => onNav ? onNav('apd-input') : window.location.assign('/apd-input')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            Distribusi APD
          </button>
          <button
            type="button"
            onClick={() => onNav ? onNav('apd-monitoring') : window.location.assign('/apd-monitoring')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            Monitoring Dokumen
          </button>
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-xs"
          >
            Pengaturan Interval
          </button>
        </div>
      </div>

      <PageHeader 
        title="Pengaturan Interval APD"
        description="Atur batas waktu interval pengambilan (dalam bulan) untuk setiap jenis APD."
        icon={<Settings2 />}
      />

      <form onSubmit={handleSave} className="space-y-4">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="font-semibold text-slate-700">Daftar Interval (Bulan)</h3>
          </div>
          
          <div className="divide-y divide-slate-100">
            {APD_TYPES.map(apd => (
              <div key={apd} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <span className="font-medium text-slate-700 text-sm">{apd}</span>
                <div className="flex items-center gap-2">
                  <Input 
                    type="number" 
                    min="0"
                    value={intervals[apd]?.toString() || "0"}
                    onChange={(e) => handleIntervalChange(apd, e.target.value)}
                    className="w-20 text-center font-mono"
                    containerClassName="!mb-0"
                  />
                  <span className="text-xs text-slate-500 font-medium">Bulan</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Perubahan ini akan langsung berlaku pada validasi input pengambilan APD selanjutnya.
            Batas waktu dihitung dari tanggal pengambilan terakhir jenis APD yang sama.
          </p>
        </div>

        <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 py-4 rounded-2xl flex items-center justify-center gap-2" disabled={saving}>
          {saving ? 'Menyimpan...' : <><Save className="w-5 h-5" /> Simpan Pengaturan</>}
        </Button>
      </form>
    </div>
  );
}
