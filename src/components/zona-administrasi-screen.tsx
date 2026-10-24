import React, { useMemo } from 'react';
import {
  ArrowLeft, ArrowRight, Briefcase, Calendar, Clock, FileSpreadsheet, Fingerprint, Sparkles, Utensils
} from 'lucide-react';
import { PhoneCarousel, ImageItem } from './ui/phone-mockups-1-utils/phone-carousel';

// Modul-modul yang digabung ke Zona Administrasi (target = route tujuan)
type ZonaModuleId = 'employee-leaves' | 'keterlambatan' | 'rekapan-finger' | 'meal-orders' | 'roster-admin';

interface ZonaModule {
  id: ZonaModuleId;
  title: string;
  desc: string;
  icon: React.ReactNode;
  accent: keyof typeof ACCENTS;
  features: string[];
}

// Kelas Tailwind ditulis utuh agar ikut ter-generate
const ACCENTS = {
  indigo: { header: 'bg-indigo-600', soft: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', icon: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  amber: { header: 'bg-amber-600', soft: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: 'bg-amber-50 text-amber-600 border-amber-200' },
  teal: { header: 'bg-teal-600', soft: 'bg-teal-50 text-teal-700 border-teal-200', dot: 'bg-teal-500', icon: 'bg-teal-50 text-teal-600 border-teal-200' },
  emerald: { header: 'bg-emerald-600', soft: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', icon: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  rose: { header: 'bg-rose-600', soft: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', icon: 'bg-rose-50 text-rose-600 border-rose-200' },
} as const;

const ZONA_MODULES: ZonaModule[] = [
  {
    id: 'employee-leaves',
    title: 'Rekapan Izin Karyawan',
    desc: 'Rekapan data izin (Google Sheet)',
    icon: <FileSpreadsheet className="w-5 h-5" />,
    accent: 'indigo',
    features: ['Daftar Rekapan Izin', 'Diagram & Analitik Manpower', 'Form Pelaporan Izin', 'Persetujuan Atasan (ACC)'],
  },
  {
    id: 'keterlambatan',
    title: 'Rekapan Keterlambatan & Pulang Cepat',
    desc: 'Rekapan keterlambatan (Google Sheet)',
    icon: <Clock className="w-5 h-5" />,
    accent: 'amber',
    features: ['Rekap Terlambat Masuk', 'Rekap Pulang Cepat', 'Diagram Analitik', 'Form Keterlambatan'],
  },
  {
    id: 'rekapan-finger',
    title: 'Rekapan Finger',
    desc: 'Rekapan data & form tidak finger',
    icon: <Fingerprint className="w-5 h-5" />,
    accent: 'teal',
    features: ['Rekapan Data Finger', 'Form Tidak Finger', 'Pencocokan Roster', 'Export Excel'],
  },
  {
    id: 'meal-orders',
    title: 'Orderan Makanan',
    desc: 'Order harian Kantin & Lapangan',
    icon: <Utensils className="w-5 h-5" />,
    accent: 'emerald',
    features: ['Order Pagi, Siang, Sore & Malam', 'Sahur & Takjil', 'Kantin & Lapangan', 'Rekap Bungkus'],
  },
  {
    id: 'roster-admin',
    title: 'Roster',
    desc: 'Informasi kehadiran',
    icon: <Calendar className="w-5 h-5" />,
    accent: 'rose',
    features: ['Tabel Roster & Jadwal Kerja', 'Jadwal Cuti Karyawan', 'Jadwal Off Karyawan', 'Import Excel Roster'],
  },
];

// Modul yang boleh diakses role Crew (selaras dengan allowedCrewPaths di App.tsx)
const CREW_MODULE_IDS: ZonaModuleId[] = ['employee-leaves', 'keterlambatan', 'rekapan-finger'];

function PhoneModuleScreen({ mod }: { mod: ZonaModule }) {
  const accent = ACCENTS[mod.accent];
  return (
    <div className="flex h-full w-full flex-col bg-[#f8fafc] text-left">
      {/* Status bar */}
      <div className="flex items-center justify-between px-5 pt-2.5 pb-1 text-[9px] font-bold text-[#0f172a]">
        <span>09:41</span>
        <span className="tracking-widest">●●● ▮</span>
      </div>

      {/* App header */}
      <div className={`mx-2.5 mt-3 rounded-2xl ${accent.header} px-3 py-3 text-white shadow-sm`}>
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20">{mod.icon}</span>
          <div className="min-w-0">
            <p className="text-[8px] font-bold uppercase tracking-widest opacity-80">Zona Administrasi</p>
            <p className="text-[11px] sm:text-xs font-black leading-tight line-clamp-2">{mod.title}</p>
          </div>
        </div>
      </div>

      {/* Fitur */}
      <div className="mx-2.5 mt-2.5 flex-1 space-y-1.5 overflow-hidden">
        {mod.features.map(f => (
          <div key={f} className="flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-2.5 py-2 shadow-2xs">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`} />
            <span className="text-[9.5px] sm:text-[10.5px] font-semibold text-[#1e293b] leading-tight">{f}</span>
          </div>
        ))}
        <div className={`rounded-xl border px-2.5 py-1.5 text-[9px] font-semibold ${accent.soft}`}>{mod.desc}</div>
      </div>

      {/* CTA */}
      <div className="px-2.5 pb-5 pt-2">
        <div className={`flex items-center justify-center gap-1.5 rounded-xl ${accent.header} py-2 text-[10px] font-bold text-white`}>
          Buka Modul <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}

interface ZonaAdministrasiScreenProps {
  onNav: (tab: string) => void;
  onBack?: () => void;
  isCrew?: boolean;
}

export function ZonaAdministrasiScreen({ onNav, onBack, isCrew = false }: ZonaAdministrasiScreenProps) {
  const modules = useMemo(
    () => (isCrew ? ZONA_MODULES.filter(m => CREW_MODULE_IDS.includes(m.id)) : ZONA_MODULES),
    [isCrew]
  );

  const phones: ImageItem[] = useMemo(
    () => modules.map(m => ({
      alt: m.title,
      label: m.title,
      description: m.desc,
      content: <PhoneModuleScreen mod={m} />,
      onClick: () => onNav(m.id),
    })),
    [modules, onNav]
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="w-full max-w-6xl mx-auto px-3 sm:px-5 py-3 sm:py-5 space-y-4">
        {/* Header terang */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-4 sm:px-6 py-4 flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title="Kembali"
              className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:text-teal-700 hover:bg-teal-50/60 hover:border-teal-300 transition-all cursor-pointer shadow-2xs shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="w-11 h-11 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900">Zona Administrasi</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Izin, keterlambatan, finger, orderan makanan & roster dalam satu tempat
            </p>
          </div>
        </div>

        {/* Carousel ponsel */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm pt-6 sm:pt-8 pb-6 overflow-hidden relative">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[28rem] sm:w-[40rem] h-64 bg-gradient-to-r from-teal-100/60 via-sky-50/50 to-indigo-100/60 rounded-full blur-3xl pointer-events-none" />
          <PhoneCarousel images={phones} className="relative z-10" />
          <div className="relative z-10 mt-4 flex justify-center px-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200/70 shadow-2xs text-center">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Geser atau klik ponsel di samping untuk berpindah, klik ponsel tengah untuk membuka modul</span>
            </div>
          </div>
        </div>

        {/* Akses cepat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {modules.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => onNav(m.id)}
              className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-left shadow-2xs hover:border-teal-300 hover:shadow-sm transition-all cursor-pointer"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${ACCENTS[m.accent].icon}`}>
                {m.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-slate-900 leading-tight">{m.title}</span>
                <span className="block text-[11px] text-slate-500 truncate">{m.desc}</span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
