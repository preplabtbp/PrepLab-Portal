import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { Settings2, Save, AlertCircle, Clock } from 'lucide-react';
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

export function ApdSettingsScreen() {
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
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
