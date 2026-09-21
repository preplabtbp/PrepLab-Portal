import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, X, Calendar, AlertTriangle, FileText, Utensils, CheckCircle2, 
  Wrench, CheckSquare, ShieldCheck, Eye, Activity, Info, 
  ArrowRight, Clock, ClipboardList, Briefcase, Users,
  Sparkles, ExternalLink, UploadCloud, LayoutGrid, Check, ChevronRight,
  ShieldAlert, BarChart2, MessageSquare
} from 'lucide-react';
import { Button } from './ui';
import { getKtaUrl } from '../sheets-api';
import { FoodReportModal } from './food-report-modal';
import { UsernamePromptModal } from './UsernamePromptModal';
import { getDailySkenaQuote } from '../utils/skena-quotes';
import { DailyGreetingHero } from './DailyGreetingHero';
import { InspectionScheduleCard } from './InspectionScheduleCard';

export function HomeScreen({ inspectorName, inspectorNik, onNav, userPt }: { 
  inspectorName: string, 
  inspectorNik: string, 
  onNav: (tab: any) => void,
  userPt?: string
}) {
  const [showKtaConfirmation, setShowKtaConfirmation] = useState(false);
  const [showFoodReportModal, setShowFoodReportModal] = useState(false);
  const [showGtsIntipModal, setShowGtsIntipModal] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  
  const [currentUsername, setCurrentUsername] = useState(() => {
    try {
      const profile = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
      return profile.username || localStorage.getItem('p2h_inspector_username') || '';
    } catch(e) {
      return '';
    }
  });
  
  const dailyQuote = useMemo(() => {
    return getDailySkenaQuote(inspectorNik || inspectorName || 'user');
  }, [inspectorNik, inspectorName]);

  // Prompt user to set username if not set yet
  useEffect(() => {
    if (inspectorNik && !currentUsername && !sessionStorage.getItem('username_prompted')) {
      sessionStorage.setItem('username_prompted', 'true');
      setShowUsernameModal(true);
    }
  }, [inspectorNik, currentUsername]);
  
  const userJabatan = localStorage.getItem('p2h_inspector_jabatan') || '';
  let userSection = '';
  try {
    const profile = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
    userSection = profile.section || '';
  } catch(e) {}
  
  const [developerList, setDeveloperList] = useState<string[]>([]);
  
  useEffect(() => {
    fetch('/api/developers')
      .then(res => res.json())
      .then(json => {
        const list = Array.isArray(json) ? json : (json?.data || []);
        setDeveloperList(list.map((d: any) => d.nik));
      })
      .catch(() => {});
  }, []);

  const isSuperAdmin = 
    inspectorNik === '02D25000055' || 
    inspectorNik === '02D24000043' || 
    inspectorNik === '04D21001047' || // Sukarman A. Akil, ST
    inspectorNik === '04D24000042';   // Junjunan Muhammad Syukur
  const isDeveloper = isSuperAdmin || inspectorNik === 'preplabadmin' || developerList.includes(inspectorNik);
  const isAdminRole = 
    userJabatan.toLowerCase().includes('admin') || 
    userJabatan.toLowerCase().includes('manager') || 
    userJabatan.toLowerCase().includes('superintendent') || 
    userJabatan.toLowerCase().includes('qa') ||
    userSection.toLowerCase().includes('admin') ||
    userSection.toLowerCase().includes('administrasi') ||
    userSection.toLowerCase().includes('qa') ||
    userSection.toLowerCase().includes('quality assurance');

  const isMaintenance = userSection.toLowerCase().includes('maintenance') || isDeveloper;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }} 
      transition={{ duration: 0.3, ease: "easeOut" }} 
      className="pb-24 px-3 sm:px-6 lg:px-8 w-full h-full max-w-7xl mx-auto space-y-6"
    >
      {/* Dynamic Daily Greeting Hero with Skena Quotes */}
      <DailyGreetingHero 
        inspectorName={inspectorName} 
        inspectorNik={inspectorNik} 
        onOpenUsernameModal={() => setShowUsernameModal(true)} 
      />

      {/* Mobile Quick Action Strip: SAP Management (Admin/Dev) & Chat (All) */}
      <div className="md:hidden flex items-center gap-2.5 p-2 rounded-2xl bg-[var(--card-bg)] border border-[var(--border-main)] shadow-xs">
        {(isDeveloper || isAdminRole) && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-sap-drawer'))}
            className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-orange-500/15 hover:from-amber-500/25 hover:to-orange-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
          >
            <BarChart2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>SAP Management</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('open-chat-drawer'))}
          className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-teal-500/15 via-teal-500/10 to-emerald-500/15 hover:from-teal-500/25 hover:to-emerald-500/25 text-teal-700 dark:text-teal-300 border border-teal-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-2xs"
        >
          <MessageSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>Ruang Chat</span>
        </button>
      </div>

      {/* Primary At-A-Glance Hub: Real-time 5-activity progress monitoring */}
      <section className="w-full">
        <InspectionScheduleCard
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          isAdminOrDeveloper={isDeveloper || isAdminRole}
          onNavigateToInspection={(formId, subArea) => {
            if (formId) sessionStorage.setItem('preselected_form_id', formId);
            if (subArea) sessionStorage.setItem('preselected_sub_area', subArea);
            onNav('weekly-inspection');
          }}
          onNavigateToKta={() => onNav('group-reports')}
          onNavigateToP5m={() => onNav('p5m')}
          onNavigateToP2h={() => onNav('inspect')}
          onNavigateToPemantauan={() => onNav('pemantauan')}
        />
      </section>

      {/* Hall of Fame & Vanguard Rank Quick Banner (Mobile shortcut, moved to Right Rail on Desktop) */}
      <section className="w-full md:hidden">
        <div 
          onClick={() => onNav('leaderboard')}
          className="group relative overflow-hidden rounded-2xl border p-4 sm:p-5 transition-all duration-300 shadow-xs hover:shadow-md hover:border-amber-500/50 cursor-pointer"
          style={{
            backgroundColor: 'var(--card-bg, #FFFFFF)',
            borderColor: 'var(--border-main, #E2E8F0)'
          }}
        >
          {/* Subtle tactical ambient background glow */}
          <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-amber-500/15 via-teal-500/10 to-transparent pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-2 flex items-center justify-center border border-amber-500/30 shadow-md group-hover:scale-105 group-hover:border-amber-400 transition-all shrink-0">
                <img 
                  src="/assets/ranks/rank_01_trainee.svg" 
                  alt="Pangkat Operasional"
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    Tangga Kemahiran Operasional
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Season 1 Aktif
                  </span>
                </div>
                <h3 className="font-display font-black text-base sm:text-lg text-[var(--text-main)] group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-2">
                  <span>PrepLab Hall of Fame &amp; Operational Vanguard</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                  Capai jenjang tertinggi Supreme Vanguard Commander melalui keaktifan inspeksi, pelaporan KTA/TTA, &amp; kontribusi operasional!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 group-hover:translate-x-0.5 transition-all"
              >
                <span>Buka Leaderboard</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Shift Utilities (Non-duplicated) */}
      <section className="space-y-3 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Lapor Makan Personil */}
          <div 
            className="group relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md hover:border-emerald-500/40"
            style={{ 
              backgroundColor: 'var(--card-bg, #ffffff)',
              borderColor: 'var(--border-main, #e2e8f0)' 
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                  <Utensils className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  Konsumsi Shift
                </span>
              </div>
              <h3 className="font-bold text-sm text-[var(--text-main)] mb-1">
                Lapor Makan Personil
              </h3>
              <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3 leading-relaxed">
                Konfirmasi penerimaan konsumsi atau pesanan makan untuk shift kerja Anda.
              </p>
            </div>
            <button
              onClick={() => setShowFoodReportModal(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold hover:bg-emerald-600 hover:text-white transition-colors cursor-pointer"
            >
              <Utensils className="w-3.5 h-3.5" />
              <span>Input Lapor Makan</span>
            </button>
          </div>

          {/* Rekap Tim & Koordinasi */}
          <div 
            className="group relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md hover:border-blue-500/40"
            style={{ 
              backgroundColor: 'var(--card-bg, #ffffff)',
              borderColor: 'var(--border-main, #e2e8f0)' 
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  Koordinasi Tim
                </span>
              </div>
              <h3 className="font-bold text-sm text-[var(--text-main)] mb-1">
                Rekap & Komunikasi Tim
              </h3>
              <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3 leading-relaxed">
                Pantau rekapan kepatuhan divisi, dokumen buletin, dan koordinasi shift kerja.
              </p>
            </div>
            <button
              onClick={() => onNav('group-reports')}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
            >
              <span>Buka Rekap Tim</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Conditional Maintenance Work Order Card */}
          {isMaintenance && (
            <div 
              className="group relative flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200 shadow-xs hover:shadow-md hover:border-rose-500/40 sm:col-span-2 lg:col-span-1"
              style={{ 
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #e2e8f0)' 
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 border border-rose-500/20">
                    Maintenance
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[var(--text-main)] mb-1">
                  Work Order Maintenance
                </h3>
                <p className="text-xs text-[var(--text-muted)] line-clamp-2 mb-3 leading-relaxed">
                  Kelola breakdown mesin, update progress perbaikan, dan tiket kerusakan.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNav('create-wo')}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-xs font-bold hover:bg-rose-600 hover:text-white transition-colors cursor-pointer text-center"
                >
                  + Buat WO
                </button>
                <button
                  onClick={() => onNav('wo-list')}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer text-center"
                >
                  Daftar WO →
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Modals */}
      <FoodReportModal 
        isOpen={showFoodReportModal}
        onClose={() => setShowFoodReportModal(false)}
        userNik={inspectorNik}
        userName={inspectorName}
        userDept="ALL"
      />

      {/* KTA / TTA Confirmation & Routing Modal */}
      {showKtaConfirmation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            <div className="p-6 sm:p-8 text-center">
              <div className="w-16 h-16 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner border border-amber-500/30">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-display font-bold text-slate-800 dark:text-slate-100 mb-2">
                Laporan Observasi (KTA/TTA)
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed text-xs sm:text-sm">
                Laporkan kondisi atau tindakan tidak aman ke formulir Safety, lalu kirimkan bukti screenshot tanggapan formulir per minggu agar otomatis terekap di portal.
              </p>
              
              <div className="space-y-2.5">
                <Button 
                  className="w-full h-11 text-xs sm:text-sm font-bold shadow-md bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white flex items-center justify-center gap-2 cursor-pointer"
                  onClick={() => {
                    setShowKtaConfirmation(false);
                    onNav('group-reports');
                  }}
                >
                  <UploadCloud className="w-4 h-4" />
                  Kirim Bukti SS ke Portal (Terekap)
                </Button>
                <Button 
                  variant="outline"
                  className="w-full h-11 text-xs sm:text-sm font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 flex items-center justify-center gap-2 cursor-pointer"
                  onClick={() => {
                    window.open(getKtaUrl(), '_blank');
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Buka Form KTA/TTA Safety ↗
                </Button>
                <Button 
                  variant="secondary"
                  className="w-full h-10 text-xs font-semibold text-slate-500 border-slate-200 dark:border-slate-800 cursor-pointer"
                  onClick={() => setShowKtaConfirmation(false)}
                >
                  Tutup
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Username / Nama Panggilan Setup Modal */}
      <UsernamePromptModal 
        isOpen={showUsernameModal}
        onClose={() => setShowUsernameModal(false)}
        nik={inspectorNik}
        currentUsername={currentUsername}
        fullName={inspectorName}
        onUsernameUpdated={(newU) => {
          setCurrentUsername(newU);
        }}
      />
    </motion.div>
  );
}
