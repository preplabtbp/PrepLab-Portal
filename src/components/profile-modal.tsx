import React, { useState, useEffect } from 'react';
import { X, LogOut, Loader2, Calendar as CalendarIcon, MapPin, Briefcase, Info } from 'lucide-react';
import { Button } from './ui';
import { getRosterData } from '../sheets-api';

export function ProfileModal({
  inspectorName,
  inspectorNik,
  onClose,
  onLogout
}: {
  inspectorName: string | null;
  inspectorNik: string | null;
  onClose: () => void;
  onLogout: () => void;
}) {
  const [profile, setProfile] = useState<any>(() => {
    const saved = localStorage.getItem('p2h_inspector_profile');
    return saved ? JSON.parse(saved) : null;
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-500 hover:text-slate-700 rounded-full z-10">
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center justify-center pt-2 pb-4">
          <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-3xl font-bold font-display shadow-inner mb-3 border-4 border-white ring-4 ring-teal-50">
            {inspectorName ? inspectorName.charAt(0).toUpperCase() : '?'}
          </div>
          <h2 className="text-xl font-display font-semibold text-slate-800 text-center">{inspectorName}</h2>
          <p className="text-xs text-slate-500 mt-1 font-mono tracking-wide">NIK: {inspectorNik || '-'}</p>
          <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold">On Duty</span>
          </div>
        </div>
        
        {profile ? (
          <div className="py-4 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-semibold mb-1 uppercase tracking-wider">
                  <Briefcase className="w-3 h-3" /> Jabatan
                </div>
                <p className="font-medium text-slate-800 text-sm truncate">{profile.jabatan || '-'}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-semibold mb-1 uppercase tracking-wider">
                  <MapPin className="w-3 h-3" /> Lokasi (POH)
                </div>
                <p className="font-medium text-slate-800 text-sm truncate">{profile.poh || '-'}</p>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-2 flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-teal-600" />
                Jadwal Terdekat (3 Hari)
              </h3>
              <div className="flex gap-2">
                {profile.schedule && profile.schedule.filter((s:any) => new Date(s.date) >= new Date(new Date().setHours(0,0,0,0))).slice(0, 3).map((sched: any, idx: number) => {
                  const isLeave = sched.shiftCode.toLowerCase().includes('cuti') || sched.shiftCode.toLowerCase().includes('off');
                  return (
                    <div key={idx} className={`flex-1 text-center py-2 rounded-xl border ${isLeave ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-teal-50 border-teal-100 text-teal-700'}`}>
                      <div className="text-[10px] uppercase font-bold mb-0.5">{sched.day.substring(0,3)}</div>
                      <div className="text-xs font-bold">{sched.shiftCode || '-'}</div>
                    </div>
                  )
                })}
                {(!profile.schedule || profile.schedule.length === 0) && (
                  <div className="flex-1 text-center py-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-xs text-slate-500">Jadwal kosong</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-4 border-t border-slate-100 text-center">
             <p className="text-slate-500 text-xs">Data roster tidak ditemukan untuk NIK ini.</p>
          </div>
        )}

        <div className="pt-2">
          <Button onClick={onLogout} variant="danger" className="w-full rounded-xl py-3 flex items-center justify-center gap-2">
            <LogOut className="w-4 h-4" /> Keluar Sesi Publik
          </Button>
        </div>
      </div>
    </div>
  );
}
