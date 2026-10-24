import React, { useMemo } from 'react';
import {
  ArrowLeft, Briefcase, Calendar, Clock, FileSpreadsheet, Fingerprint, Sparkles, Utensils, type LucideIcon
} from 'lucide-react';
import { PhoneCarousel, ImageItem } from './ui/phone-mockups-1-utils/phone-carousel';

// Modul-modul yang digabung ke Zona Administrasi (id = route tujuan)
type ZonaModuleId = 'employee-leaves' | 'keterlambatan' | 'rekapan-finger' | 'meal-orders' | 'roster-admin';

interface ZonaModule {
  id: ZonaModuleId;
  title: string;
  desc: string;
  icon: LucideIcon;
  accent: keyof typeof ACCENTS;
}

// Kelas Tailwind ditulis utuh agar ikut ter-generate
const ACCENTS = {
  indigo: { screen: 'bg-indigo-50/60', badge: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
  amber: { screen: 'bg-amber-50/60', badge: 'bg-amber-50 text-amber-600 border-amber-200' },
  teal: { screen: 'bg-teal-50/60', badge: 'bg-teal-50 text-teal-600 border-teal-200' },
  emerald: { screen: 'bg-emerald-50/60', badge: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  rose: { screen: 'bg-rose-50/60', badge: 'bg-rose-50 text-rose-600 border-rose-200' },
} as const;

const ZONA_MODULES: ZonaModule[] = [
  { id: 'employee-leaves', title: 'Rekapan Izin Karyawan', desc: 'Rekapan data izin (Google Sheet)', icon: FileSpreadsheet, accent: 'indigo' },
  { id: 'keterlambatan', title: 'Rekapan Keterlambatan & Pulang Cepat', desc: 'Rekapan keterlambatan (Google Sheet)', icon: Clock, accent: 'amber' },
  { id: 'rekapan-finger', title: 'Rekapan Finger', desc: 'Rekapan data & form tidak finger', icon: Fingerprint, accent: 'teal' },
  { id: 'meal-orders', title: 'Orderan Makanan', desc: 'Order harian Kantin & Lapangan', icon: Utensils, accent: 'emerald' },
  { id: 'roster-admin', title: 'Roster', desc: 'Informasi kehadiran', icon: Calendar, accent: 'rose' },
];

// Modul yang boleh diakses role Crew (selaras dengan allowedCrewPaths di App.tsx)
const CREW_MODULE_IDS: ZonaModuleId[] = ['employee-leaves', 'keterlambatan', 'rekapan-finger'];

// Isi kotak: hanya simbol modul
function PhoneModuleScreen({ mod }: { mod: ZonaModule }) {
  const accent = ACCENTS[mod.accent];
  const Icon = mod.icon;
  return (
    <div className={`flex h-full w-full items-center justify-center ${accent.screen}`}>
      <span className={`flex h-28 w-28 sm:h-36 sm:w-36 items-center justify-center rounded-[2rem] border-2 shadow-sm ${accent.badge}`}>
        <Icon className="h-14 w-14 sm:h-[4.5rem] sm:w-[4.5rem]" strokeWidth={1.75} />
      </span>
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
    <div className="min-h-[calc(100vh-7rem)] pb-24 relative overflow-hidden flex flex-col">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] sm:w-[64rem] h-80 bg-gradient-to-r from-teal-100/60 via-sky-50/50 to-indigo-100/60 rounded-full blur-3xl pointer-events-none" />

      {onBack && (
        <div className="relative z-10 px-3 sm:px-6 pt-3 sm:pt-5">
          <button
            type="button"
            onClick={onBack}
            title="Kembali"
            className="p-2 rounded-xl text-slate-700 hover:text-teal-700 hover:bg-teal-50/70 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Konten di tengah layar */}
      <div className="relative z-10 flex-1 flex flex-col justify-center w-full px-3 sm:px-6 py-6 sm:py-10 space-y-10 sm:space-y-14">
        {/* Judul tanpa kotak, rata tengah */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-sm">
            <Briefcase className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Zona Administrasi</h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md">
            Izin, keterlambatan, finger, orderan makanan & roster dalam satu tempat
          </p>
        </div>

        {/* Carousel kotak lebar, tanpa kontainer */}
        <div>
          <PhoneCarousel images={phones} wide frame="box" />
          <div className="mt-4 flex justify-center px-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold text-slate-500 text-center">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span>Geser atau klik kotak di samping untuk berpindah, klik kotak tengah untuk membuka modul</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
