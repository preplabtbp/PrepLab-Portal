import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  X, 
  Search, 
  User, 
  ClipboardList, 
  LayoutGrid, 
  PlusCircle,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
  position?: 'bottom' | 'top';
}

interface HomeWalkthroughTourProps {
  userNik?: string | null;
  userName?: string | null;
  userRole?: string | null;
  userSection?: string | null;
}

export function HomeWalkthroughTour({ 
  userNik, 
  userName,
  userRole,
  userSection
}: HomeWalkthroughTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Dynamic role-tailored steps
  const tourSteps: TourStep[] = useMemo(() => {
    const roleLower = (userRole || localStorage.getItem('p2h_inspector_jabatan') || '').toLowerCase();
    const secLower = (userSection || localStorage.getItem('p2h_inspector_section') || '').toLowerCase();

    const isManager = roleLower.includes('manager') || roleLower.includes('head') || roleLower.includes('ktt');
    const isSpt = roleLower.includes('superintendent') || roleLower.includes('spt');
    const isSpv = roleLower.includes('supervisor') || roleLower.includes('spv') || roleLower.includes('foreman') || roleLower.includes('lead');
    const isMaintenance = secLower.includes('maint') || secLower.includes('pemeliharaan') || roleLower.includes('workshop');
    const isLab = secLower.includes('lab') || secLower.includes('chemist') || roleLower.includes('quality') || secLower.includes('qa');

    // Tailored Action Center description based on available modules
    let actionCenterBadge = 'Tugas Operasional';
    let actionCenterTitle = 'Action Center: Pusat Tugas Operasional';
    let actionCenterDesc = '';

    if (isSpt) {
      actionCenterBadge = 'Action Center • Mode Superintendent (SPT)';
      actionCenterTitle = 'Action Center: Pemantauan Tugas & Pengawasan SPT';
      actionCenterDesc = 
`Pusat kendali operasional harian dengan badge merah berkedip sebagai penanda tugas pending.

📌 Cara Menggunakan:
• Klik bar untuk membuka rincian accordion kategori tugas.
• Klik item tugas untuk langsung menuju formulir atau modul terkait.
• Tombol Refresh di kanan atas untuk menyinkronkan status tugas terkini.

⭐ Modul Khusus Superintendent (SPT):
Selain memantau jadwal inspeksi & target KTA/TTA tim, Anda memiliki modul pengawasan temuan K3 terbuka lintas seksi, validasi laporan, serta integrasi langsung ke Leadership Dashboard Eksekutif.`;
    } else if (isManager) {
      actionCenterBadge = 'Action Center • Mode Manajemen';
      actionCenterTitle = 'Action Center: Pengawasan Eksekutif & Kepatuhan K3';
      actionCenterDesc = 
`Pusat monitoring kepatuhan dan tugas operasional terpadu laboratorium & preparasi.

📌 Cara Menggunakan:
• Klik bar untuk membuka rincian kategori tugas dan status pending.
• Klik pada kategori tugas untuk langsung meninjau modul terkait.
• Tombol Refresh untuk memperbarui rekapan data secara langsung.

⭐ Modul Khusus Manager:
Memantau rekapitulasi kepatuhan K3 seluruh departemen, mengawasi status resolusi temuan hazard terbuka dari semua seksi, serta akses cepat ke Dashboard Kepemimpinan Eksekutif.`;
    } else if (isSpv) {
      actionCenterBadge = 'Action Center • Mode Supervisor (SPV)';
      actionCenterTitle = 'Action Center: Tugas Operasional & Modul Khusus SPV';
      actionCenterDesc = 
`Pusat kendali tugas operasional harian & mingguan dengan indikator angka merah penanda tugas yang belum diselesaikan.

📌 Cara Menggunakan:
• Klik bar untuk membuka rincian accordion kategori tugas.
• Klik item tugas untuk langsung menuju formulir pengerjaan (Inspeksi, KTA/TTA, P5M, P2H).
• Tombol Refresh di kanan atas untuk memperbarui status terkini.

⭐ Modul Tambahan Khusus SPV:
Sebagai Supervisor, Anda memiliki modul tambahan "Temuan Inspeksi K3 Terbuka" untuk menindaklanjuti hazard di seksi pengawasan Anda${isMaintenance ? ', serta modul "Kerusakan Unit LV" untuk monitoring tiket perbaikan unit workshop' : ''}.`;
    } else {
      actionCenterBadge = 'Action Center • Tugas Operasional';
      actionCenterTitle = 'Action Center: Monitoring Tugas Operasional Anda';
      actionCenterDesc = 
`Pusat kendali tugas rutin dengan indikator merah berkedip jika ada tugas yang perlu diselesaikan hari ini atau minggu ini.

📌 Cara Menggunakan:
• Klik bar untuk membuka atau menutup rincian daftar tugas.
• Klik salah satu item untuk langsung diarahkan membuka modul (Inspeksi Mingguan, Input KTA/TTA, Materi P5M, Checklist P2H${isLab ? ', Pemantauan Suhu & Gas' : ''}).
• Tombol Refresh di kanan atas rincian untuk menyinkronkan status tugas terkini.`;
    }

    return [
      {
        targetId: 'header-module-search',
        title: 'Pencarian Modul Terpusat di Header',
        description: 'Cari modul operasional, logbook, inspeksi, atau tiket langsung dari header di bagian tengah layar. Anda juga bisa menekan tombol pintas Ctrl+K.',
        badge: 'Fitur Baru Header',
        icon: <Search className="w-4 h-4 text-teal-400" />,
        position: 'bottom'
      },
      {
        targetId: 'home-profile-card',
        title: 'Kartu Identitas & Skena Quotes',
        description: 'Pantau informasi shift kerja, seksi, serta quote inspirasi harian yang diperbarui setiap hari untuk membangkitkan semangat kerja.',
        badge: 'Profil Pengguna',
        icon: <User className="w-4 h-4 text-sky-400" />,
        position: 'bottom'
      },
      {
        targetId: 'home-action-center-bar',
        title: actionCenterTitle,
        description: actionCenterDesc,
        badge: actionCenterBadge,
        icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
        position: 'bottom'
      },
      {
        targetId: 'home-logbook-bar',
        title: 'Alur Kerja & Log Book Seksi',
        description: 'Akses tugas rutin harian, mingguan, dan bulanan serta briefing shift secara langsung dari beranda portal tanpa berpindah halaman.',
        badge: 'Log Book Terpadu',
        icon: <ClipboardList className="w-4 h-4 text-emerald-400" />,
        position: 'top'
      },
      {
        targetId: 'home-widgets-container',
        title: 'Dashboard Widget Kustomisasi',
        description: 'Ruang kerja personal Anda: pantau jam operasional, kalender shift, cuaca site, catatan cepat, dan menu kantin dalam satu komposisi enterprise.',
        badge: 'Widget Dashboard',
        icon: <LayoutGrid className="w-4 h-4 text-amber-400" />,
        position: 'top'
      },
      {
        targetId: 'home-add-widget-btn',
        title: 'Atur & Tambah Widget Sesuai Kebutuhan',
        description: 'Klik tombol "+ Tambah Widget" untuk memilih widget baru, menghapus yang tidak diperlukan, atau menyesuaikan tata letak agar sesuai kenyamanan Anda.',
        badge: 'Personalisasi Bebas',
        icon: <PlusCircle className="w-4 h-4 text-indigo-400" />,
        position: 'top'
      }
    ];
  }, [userRole, userSection]);

  // Check tutorial status on load
  useEffect(() => {
    const nikKey = userNik || localStorage.getItem('p2h_inspector_nik') || '';
    if (!nikKey) return;

    fetch(`/api/user/tutorial-status?nik=${encodeURIComponent(nikKey)}`)
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success' && !json.completed) {
          // Give UI 800ms to settle then start tour
          const timer = setTimeout(() => {
            setIsActive(true);
            setCurrentStepIndex(0);
          }, 800);
          return () => clearTimeout(timer);
        }
      })
      .catch(err => {
        console.warn('Tutorial status check error:', err);
      });
  }, [userNik]);

  // Global manual listener to re-trigger tutorial
  useEffect(() => {
    const handleStart = () => {
      setIsActive(true);
      setCurrentStepIndex(0);
    };
    window.addEventListener('preplab:start_home_tutorial', handleStart);
    return () => window.removeEventListener('preplab:start_home_tutorial', handleStart);
  }, []);

  // Update target rect when step changes or window resizes
  useEffect(() => {
    if (!isActive) return;

    const updateRect = () => {
      const step = tourSteps[currentStepIndex];
      if (!step) return;

      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        // Scroll into view gently if outside visible viewport
        if (rect.top < 80 || rect.bottom > window.innerHeight - 80) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else {
        setTargetRect(null);
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    const timer = setTimeout(updateRect, 300);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      clearTimeout(timer);
    };
  }, [isActive, currentStepIndex, tourSteps]);

  const handleFinish = (isSkipped = false) => {
    setIsActive(false);
    const nikKey = userNik || localStorage.getItem('p2h_inspector_nik') || '';
    if (nikKey) {
      fetch('/api/user/tutorial-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik: nikKey })
      }).catch(() => {});
    }
  };

  const handleNext = () => {
    if (currentStepIndex < tourSteps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleFinish(false);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  if (!isActive) return null;

  const currentStep = tourSteps[currentStepIndex];

  return (
    <div className="fixed inset-0 z-[150] pointer-events-auto">
      {/* Dark overlay backdrop with subtle blur */}
      <div 
        onClick={() => handleFinish(true)}
        className="fixed inset-0 bg-black/65 backdrop-blur-[2px] transition-all duration-300"
      />

      {/* Target Element Spotlight Highlight */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: `${Math.max(8, targetRect.top - 6)}px`,
            left: `${Math.max(8, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            borderRadius: '16px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.65), 0 0 25px rgba(20, 184, 166, 0.6)',
            border: '2px solid rgba(45, 212, 191, 0.8)',
            pointerEvents: 'none',
            zIndex: 151,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        />
      )}

      {/* Floating Dialog Card */}
      <div 
        className="fixed z-[160] w-[94%] sm:w-[90%] max-w-lg pointer-events-auto transition-all duration-300"
        style={{
          top: targetRect 
            ? currentStep.position === 'top' || (targetRect.bottom + 260 > window.innerHeight)
              ? `${Math.max(16, targetRect.top - 240)}px`
              : `${Math.min(window.innerHeight - 260, targetRect.bottom + 16)}px`
            : '50%',
          left: targetRect
            ? `${Math.min(window.innerWidth - 32 - 460, Math.max(16, targetRect.left + (targetRect.width / 2) - 230))}px`
            : '50%',
          transform: targetRect ? 'none' : 'translate(-50%, -50%)'
        }}
      >
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 text-slate-800 dark:text-slate-100 flex flex-col gap-3.5 max-h-[85vh] overflow-y-auto"
        >
          {/* Top Bar: Badge & Skip */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-[11px] font-semibold">
              {currentStep.icon}
              <span>{currentStep.badge}</span>
            </div>

            <button
              type="button"
              onClick={() => handleFinish(true)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Lewati</span>
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
              {currentStep.title}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {currentStep.description}
            </p>
          </div>

          {/* Bottom Bar: Pagination Dots & Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            {/* Step Indicators */}
            <div className="flex items-center gap-1">
              {tourSteps.map((_, sIdx) => (
                <div
                  key={sIdx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    sIdx === currentStepIndex
                      ? 'w-5 bg-teal-600 dark:bg-teal-400'
                      : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
              <span className="text-[10px] text-slate-400 ml-1.5 font-mono font-medium">
                {currentStepIndex + 1}/{tourSteps.length}
              </span>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Kembali</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                className="px-3.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span>{currentStepIndex === tourSteps.length - 1 ? 'Selesai' : 'Lanjut'}</span>
                {currentStepIndex === tourSteps.length - 1 ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
