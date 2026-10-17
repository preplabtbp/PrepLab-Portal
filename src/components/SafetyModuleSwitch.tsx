import React from 'react';
import { useNavigate } from 'react-router-dom';

// Pintasan antar modul Safety (gaya sama dengan switch Training Internal / Sertifikasi)
const MODULES = [
  { key: 'jadwal', label: 'Jadwal Inspeksi', path: '/inspection-schedule' },
  { key: 'rekap', label: 'Rekap KTA/TTA & Inspeksi', path: '/safety-rekap' }
] as const;

export function SafetyModuleSwitch({ active }: { active: 'jadwal' | 'rekap' }) {
  const navigate = useNavigate();
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-white/10 border border-white/15 shadow-2xs align-middle">
      {MODULES.map(m => (
        <button
          key={m.key}
          type="button"
          onClick={() => m.key !== active && navigate(m.path)}
          className={`px-3 py-1 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${m.key === active ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'}`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
