import { toast } from 'sonner';
import React, { useState } from 'react';
import { Card } from './ui';
import { Server, ChevronDown, ChevronUp } from 'lucide-react';
import { triggerReminderManual, triggerRutinitasJumatManual } from '../sheets-api';

interface DevModeOptions {
  db: boolean;
  pdf: boolean;
  waTesting: boolean;
  bypassVal: boolean;
  verboseLog: boolean;
  simFailWa: boolean;
}

interface DevModeAccordionProps {
  inspectorNik: string | null;
  devOptions: DevModeOptions;
  setDevOptions: React.Dispatch<React.SetStateAction<DevModeOptions>>;
}

export function DevModeAccordion({ inspectorNik, devOptions, setDevOptions }: DevModeAccordionProps) {
  const isDevUser = inspectorNik === '02D25000055' || inspectorNik === '02D24000043' || inspectorNik === 'preplabadmin';
  const [isOpen, setIsOpen] = useState(false);

  if (!isDevUser) return null;

  return (
    <Card className="border-t-4 border-t-red-500 bg-red-50/50 mb-4 overflow-hidden">
      <div 
        className="p-4 cursor-pointer flex justify-between items-center select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-red-600" />
          <h3 className="text-sm font-bold text-red-700">Developer Mode</h3>
        </div>
        <div>
          {isOpen ? <ChevronUp className="w-5 h-5 text-red-600" /> : <ChevronDown className="w-5 h-5 text-red-600" />}
        </div>
      </div>
      
      {isOpen && (
        <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
          <p className="text-xs text-slate-600 mb-4">Opsi Testing. Matikan parameter untuk bypass.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-semibold">
             <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-red-500 rounded border-slate-300" checked={devOptions.db} onChange={e => setDevOptions(p => ({...p, db: e.target.checked}))} />
                Isi Database ke Sheet
             </label>
             <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-red-500 rounded border-slate-300" checked={devOptions.pdf} onChange={e => setDevOptions(p => ({...p, pdf: e.target.checked}))} />
                Buat Dokumen PDF
             </label>
             <label className="flex items-center gap-2 text-red-700 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-red-500 rounded border-slate-300" checked={devOptions.waTesting} onChange={e => setDevOptions(p => ({...p, waTesting: e.target.checked}))} />
                Kirim WA ke Grup Testing (Bypass)
             </label>
             <label className="flex items-center gap-2 text-yellow-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-yellow-500 rounded border-slate-300" checked={devOptions.bypassVal} onChange={e => setDevOptions(p => ({...p, bypassVal: e.target.checked}))} />
                Bypass Validasi Wajib (God Mode)
             </label>
             <label className="flex items-center gap-2 text-blue-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-blue-500 rounded border-slate-300" checked={devOptions.verboseLog} onChange={e => setDevOptions(p => ({...p, verboseLog: e.target.checked}))} />
                Tampilkan Debug Log JSON (Verbose)
             </label>
             <label className="flex items-center gap-2 text-slate-800 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-slate-500 rounded border-slate-300" checked={devOptions.simFailWa} onChange={e => setDevOptions(p => ({...p, simFailWa: e.target.checked}))} />
                Simulasi Error Fonnte (Stress Test)
             </label>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
             <button 
                className="w-full font-bold text-yellow-600 border border-yellow-500/50 hover:bg-yellow-100/50 rounded flex justify-center items-center py-2 transition-colors text-xs"
                onClick={async () => {
                  if (!confirm("Tembak Reminder Harian?")) return;
                  try {
                    const parsed = {
                      isDev: true,
                      ...devOptions,
                      waGroupTestId: '120363404074689680@g.us'
                    };
                    const res = await triggerReminderManual(parsed);
                    if (res?.status === 'success') toast(res.message);
                    else toast.error('Error: ' + res?.message);
                  } catch (e: any) { toast.error("Error: " + e.message); }
                }}
             >
                🚀 Tembak Reminder Harian
             </button>
             <button
                className="w-full font-bold text-emerald-600 border border-emerald-500/50 hover:bg-emerald-100/50 rounded flex justify-center items-center py-2 transition-colors text-xs"
                onClick={async () => {
                  if (!confirm("Tembak Rapor Jumat Pagi?")) return;
                  try {
                    const parsed = {
                      isDev: true,
                      ...devOptions,
                      waGroupTestId: '120363404074689680@g.us'
                    };
                    const res = await triggerRutinitasJumatManual(parsed);
                    if (res?.status === 'success') toast(res.message);
                    else toast.error('Error: ' + res?.message);
                  } catch (e: any) { toast.error("Error: " + e.message); }
                }}
             >
                📊 Tembak Rapor Jumat Pagi
             </button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function useDevOptions(inspectorNik: string | null) {
  const isDevUser = inspectorNik === '02D25000055' || inspectorNik === '02D24000043' || inspectorNik === 'preplabadmin';
  const [devOptions, setDevOptions] = useState({
    db: true,
    pdf: true,
    waTesting: false,
    bypassVal: false,
    verboseLog: false,
    simFailWa: false,
  });

  const parsedDevOptions = isDevUser ? {
    isDev: true,
    ...devOptions,
    waGroupTestId: '120363404074689680@g.us'
  } : {
    isDev: false,
    db: true,
    pdf: true,
    waTesting: false,
    bypassVal: false,
    verboseLog: false,
    simFailWa: false,
  };

  return { devOptions, setDevOptions, parsedDevOptions };
}
