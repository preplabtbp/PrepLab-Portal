import React, { useState } from 'react';
import { UserCheck, Shield, ChevronDown, ChevronUp, RefreshCw, Sparkles, X, Check, Eye } from 'lucide-react';
import { toast } from 'sonner';

export interface SimulatedProfile {
  id: string;
  name: string; // User's own real name
  role: string; // Simulated role / jabatan
  section: string; // Simulated section
  nik: string; // User's own real NIK
  badge: string;
  color: string;
}

export interface RoleplayPersona {
  id: string;
  roleTitle: string;
  section: string;
  jabatan: string;
  badge: string;
  color: string;
  description: string;
}

// 10 Operational Roles Sesuai Struktur Portal (Simulasi Peran pada Akun Sendiri tanpa menggunakan akun orang lain)
export const ROLEPLAY_PERSONAS: RoleplayPersona[] = [
  {
    id: 'crew',
    roleTitle: 'Crew',
    section: 'Preparation',
    jabatan: 'Crew, Preparation & Laboratory',
    badge: '👷 Crew',
    color: 'emerald',
    description: 'P2H Alat, KTA/TTA, WO, Briefing P5M'
  },
  {
    id: 'lab_foreman',
    roleTitle: 'Laboratory Foreman',
    section: 'Laboratory',
    jabatan: 'Laboratory Foreman',
    badge: '🔬 Lab Foreman',
    color: 'sky',
    description: 'Pemantauan Lab, P2H Instrumen, Briefing P5M, K3'
  },
  {
    id: 'prep_foreman',
    roleTitle: 'Preparation Foreman',
    section: 'Preparation',
    jabatan: 'Preparation Foreman',
    badge: '🚜 Prep Foreman',
    color: 'teal',
    description: 'P2H Preparasi, Pengawasan Crusher, P5M, WO'
  },
  {
    id: 'administration',
    roleTitle: 'Administration',
    section: 'Administration',
    jabatan: 'Admin, Preparation & Laboratory',
    badge: '📋 Administration',
    color: 'indigo',
    description: 'Update Roster Harian, SAP Management Mingguan'
  },
  {
    id: 'inventory_control',
    roleTitle: 'Inventory Control',
    section: 'Inventory Control',
    jabatan: 'Inventory Control',
    badge: '📦 Inventory Control',
    color: 'amber',
    description: 'Distribusi APD, Monitoring Dokumen, Stok, P5M'
  },
  {
    id: 'spv_lab',
    roleTitle: 'SPV Laboratory',
    section: 'Laboratory',
    jabatan: 'Laboratory Supervisor',
    badge: '🧪 SPV Laboratory',
    color: 'purple',
    description: 'PIC Temuan Area Lab, Pemantauan Harian, Instrumen'
  },
  {
    id: 'spv_prep',
    roleTitle: 'SPV Preparation',
    section: 'Preparation',
    jabatan: 'Preparation Supervisor',
    badge: '⚙️ SPV Preparation',
    color: 'rose',
    description: 'PIC Temuan Area Prep, Kesiapan Unit, P2H'
  },
  {
    id: 'spt_prep',
    roleTitle: 'SPT Prep',
    section: 'Preparation',
    jabatan: 'Preparation Superintendent',
    badge: '📊 SPT Prep',
    color: 'emerald',
    description: 'Dashboard SPT: Kesiapan Alat & K3 Preparasi'
  },
  {
    id: 'spt_lab',
    roleTitle: 'SPT Lab',
    section: 'Laboratory',
    jabatan: 'Laboratory Superintendent',
    badge: '🔬 SPT Lab',
    color: 'violet',
    description: 'Dashboard SPT: Instrumen, Suhu/RH & Temuan Lab'
  },
  {
    id: 'manager',
    roleTitle: 'Manager',
    section: 'Manager',
    jabatan: 'Preparation & Laboratory Manager',
    badge: '👑 Manager',
    color: 'amber',
    description: 'Executive Dashboard: Helicopter View Seluruh Seksi'
  }
];

export function getSimulatedProfile(): SimulatedProfile | null {
  try {
    const raw = sessionStorage.getItem('dev_roleplay_profile');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

interface DevRoleplaySwitcherProps {
  onProfileChange?: (sim: SimulatedProfile | null) => void;
}

export function DevRoleplaySwitcher({ onProfileChange }: DevRoleplaySwitcherProps) {
  const [activeSim, setActiveSim] = useState<SimulatedProfile | null>(() => getSimulatedProfile());
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectPersona = (persona: RoleplayPersona | null) => {
    if (persona) {
      // Use the CURRENT logged-in user's own identity (ethical, transparent, no account hijacking)
      const currentRealName = localStorage.getItem('p2h_inspector_name') || 'Muhammad Naufalsar';
      const currentRealNik = localStorage.getItem('p2h_inspector_nik') || '02D25000055';

      const sim: SimulatedProfile = {
        id: persona.id,
        name: currentRealName,
        nik: currentRealNik,
        role: persona.jabatan,
        section: persona.section,
        badge: persona.badge,
        color: persona.color
      };

      sessionStorage.setItem('dev_roleplay_profile', JSON.stringify(sim));
      setActiveSim(sim);
      toast.success(`Mode Simulasi Aktif: ${persona.badge} pada Akun Anda`);
    } else {
      sessionStorage.removeItem('dev_roleplay_profile');
      setActiveSim(null);
      toast.info('Kembali ke Tampilan Akun Asli');
    }
    setIsOpen(false);
    const updated = persona ? getSimulatedProfile() : null;
    window.dispatchEvent(new CustomEvent('dev-roleplay-changed', { detail: updated }));
    if (onProfileChange) onProfileChange(updated);
  };

  return (
    <div className="w-full">
      {/* Trigger Bar */}
      <div 
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between p-2 px-3 rounded-xl bg-slate-900/90 text-white border border-amber-500/30 text-xs shadow-md cursor-pointer hover:bg-slate-800 transition-all select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 shrink-0">
              Simulasi Peran:
            </span>
            <span className="font-semibold text-slate-100 truncate text-[11px]">
              {activeSim ? `${activeSim.badge} (Akun Anda)` : 'Akun Asli (Normal)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 text-slate-400 shrink-0">
          <span className="text-[10px] hidden sm:inline text-amber-300">Uji Tampilan Role</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </div>

      {/* Expanded Presets Drawer */}
      {isOpen && (
        <div className="mt-2 p-3 rounded-2xl bg-[var(--card-bg,white)] border border-amber-500/30 shadow-xl space-y-2 text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-1 border-b border-[var(--border-main)]">
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-[var(--text-main)]">Simulasi Peran Operasional (View As Role)</span>
            </div>
            {activeSim && (
              <button
                type="button"
                onClick={() => handleSelectPersona(null)}
                className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[10px] font-bold hover:bg-rose-500/20 cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-2.5 h-2.5" />
                <span>Reset Akun Asli</span>
              </button>
            )}
          </div>

          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
            Pilih peran di bawah ini untuk menguji hak akses dan tata letak menu. <strong>Identitas akun dan NIK Anda tetap akun pribadi Anda</strong> (tidak meminjam akun orang lain).
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
            {ROLEPLAY_PERSONAS.map((persona) => {
              const isSelected = activeSim?.id === persona.id;
              return (
                <button
                  key={persona.id}
                  type="button"
                  onClick={() => handleSelectPersona(persona)}
                  className={`p-2 rounded-xl border text-left transition-all active:scale-95 cursor-pointer flex flex-col justify-between min-h-[68px] ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10 shadow-xs'
                      : 'border-[var(--border-main)] hover:border-slate-400 bg-[var(--input-bg,white)]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[11px] font-bold text-[var(--text-main)] leading-tight">
                      {persona.badge}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                  </div>
                  <div className="mt-1">
                    <p className="text-[9.5px] font-semibold text-slate-700 dark:text-slate-200 truncate">{persona.section}</p>
                    <p className="text-[8.5px] text-[var(--text-muted)] truncate">{persona.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
