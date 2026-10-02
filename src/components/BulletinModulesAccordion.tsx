import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  ShieldCheck, 
  Package, 
  BookOpen, 
  Briefcase, 
  LayoutDashboard, 
  ChevronDown, 
  CheckSquare, 
  ClipboardList, 
  ThermometerSun, 
  Wrench, 
  PlusCircle, 
  LineChart, 
  BriefcaseMedical, 
  Eye, 
  AlertTriangle, 
  ClipboardCheck, 
  Box, 
  FileText, 
  Settings, 
  Info, 
  Users, 
  Calendar, 
  Clock, 
  Trophy, 
  User, 
  ExternalLink, 
  UploadCloud,
  X
} from 'lucide-react';
import { getKtaUrl } from '../sheets-api';

interface BulletinModulesAccordionProps {
  onNav?: (route: string) => void;
}

export function BulletinModulesAccordion({ onNav }: BulletinModulesAccordionProps) {
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [showKtaConfirmation, setShowKtaConfirmation] = useState(false);

  const handleNavigate = (route: string) => {
    if (onNav) {
      onNav(route);
    } else {
      navigate('/' + route.replace(/^\//, ''));
    }
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const sections = useMemo(() => [
    {
      id: 'operational',
      title: 'Operasional & Maintenance',
      icon: <Activity className="w-5 h-5" />,
      color: 'teal' as const,
      bgIcon: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
      pillColor: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200/60 dark:border-teal-800/60',
      items: [
        { id: 'inspect', title: "Inspeksi Harian", desc: "Checklist P2H harian", icon: <CheckSquare className="w-5 h-5" />, color: 'teal', action: () => handleNavigate('inspect') },
        { id: 'logbook', title: "Log Book Section", desc: "Briefing P5M & Evaluasi Task Harian", icon: <ClipboardList className="w-5 h-5" />, color: 'teal', action: () => handleNavigate('logbook') },
        { id: 'pemantauan', title: "Pantau Parameter", desc: "Suhu, kelembapan & gas", icon: <ThermometerSun className="w-5 h-5" />, color: 'teal', action: () => handleNavigate('pemantauan') },
        { id: 'wo-list', title: "Daftar Work Order", desc: "Status & riwayat WO", icon: <Wrench className="w-5 h-5" />, color: 'teal', action: () => handleNavigate('wo-list') },
        { id: 'create-wo', title: "Buat Work Order", desc: "Form temuan kerusakan", icon: <PlusCircle className="w-5 h-5" />, color: 'teal', action: () => handleNavigate('create-wo') },
        { id: 'wo-dashboard', title: "Dashboard Maintenance", desc: "Rekap downtime & sparepart", icon: <LineChart className="w-5 h-5" />, color: 'teal', action: () => handleNavigate('wo-maintenance-dashboard') },
      ]
    },
    {
      id: 'reporting',
      title: 'Observasi & Pelaporan',
      icon: <ShieldCheck className="w-5 h-5" />,
      color: 'amber' as const,
      bgIcon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      pillColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60',
      items: [
        { id: 'weekly-inspection', title: "Inspeksi Mingguan", desc: "Area & kelengkapan", icon: <CheckSquare className="w-5 h-5" />, color: 'amber', action: () => handleNavigate('weekly-inspection') },
        { id: 'clinic', title: "Kunjungan Klinik", desc: "Pelaporan & Rekap Kunjungan Klinik", icon: <BriefcaseMedical className="w-5 h-5" />, color: 'amber', action: () => handleNavigate('clinic') },
        { id: 'ticket', title: "Rekapan Temuan Inspeksi", desc: "Laporan temuan unsafe", icon: <Eye className="w-5 h-5" />, color: 'amber', action: () => handleNavigate('ticket') },
        { id: 'kta', title: "KTA / TTA", desc: "Laporan Observasi KTA & TTA", icon: <AlertTriangle className="w-5 h-5" />, color: 'amber', action: () => setShowKtaConfirmation(true) },
        { id: 'general-inspection', title: "Submit General Inspection", desc: "Form inspeksi tim safety", icon: <ClipboardCheck className="w-5 h-5" />, color: 'amber', action: () => window.open('https://docs.google.com/forms/d/e/1FAIpQLScOJSC6wcLsJ26YcmwWndj0Hb9x5V48XHTdHWkPzbH2XwN8ww/viewform', '_blank', 'noopener,noreferrer') },
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory Control (APD)',
      icon: <Package className="w-5 h-5" />,
      color: 'purple' as const,
      bgIcon: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
      pillColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/60',
      items: [
        { id: 'apd-input', title: "Distribusi APD", desc: "Riwayat & input", icon: <Box className="w-5 h-5" />, color: 'purple', action: () => handleNavigate('apd-input') },
        { id: 'apd-monitoring', title: "Monitoring Dokumen", desc: "Status tanda tangan", icon: <FileText className="w-5 h-5" />, color: 'purple', action: () => handleNavigate('apd-monitoring') },
        { id: 'apd-settings', title: "Pengaturan APD", desc: "Interval & master data", icon: <Settings className="w-5 h-5" />, color: 'purple', action: () => handleNavigate('apd-settings') },
      ]
    },
    {
      id: 'education',
      title: 'Pelatihan & Edukasi',
      icon: <BookOpen className="w-5 h-5" />,
      color: 'emerald' as const,
      bgIcon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      pillColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
      items: [
        { id: 'quiz', title: "Quiz Safety & SOP", desc: "Uji pemahaman prosedur", icon: <BookOpen className="w-5 h-5" />, color: 'emerald', action: () => handleNavigate('quiz') },
        { id: 'manual', title: "Buku Panduan", desc: "User Manual Sistem", icon: <Info className="w-5 h-5" />, color: 'emerald', action: () => handleNavigate('manual') },
        { id: 'quiz-admin', title: "Manajemen Quiz", desc: "Tambah, Edit & Hapus Soal", icon: <Settings className="w-5 h-5" />, color: 'emerald', action: () => handleNavigate('quiz-admin') },
      ]
    },
    {
      id: 'admin',
      title: 'Administrasi & HR',
      icon: <Briefcase className="w-5 h-5" />,
      color: 'indigo' as const,
      bgIcon: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
      pillColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60',
      items: [
        { id: 'induksi', title: "Induksi Internal", desc: "Form & Laporan Induksi", icon: <ShieldCheck className="w-5 h-5" />, color: 'indigo', action: () => handleNavigate('induksi') },
        { id: 'employee-database', title: "Database Karyawan", desc: "Data karyawan & struktur", icon: <Users className="w-5 h-5" />, color: 'indigo', action: () => handleNavigate('employee-database') },
        { id: 'p5m', title: "P5M Schedule", desc: "Jadwal & materi briefing", icon: <Calendar className="w-5 h-5" />, color: 'indigo', action: () => handleNavigate('p5m') },
        { id: 'agenda', title: "Agenda Personal", desc: "Jadwal & kegiatan", icon: <Calendar className="w-5 h-5" />, color: 'indigo', action: () => handleNavigate('agenda') },
        { id: 'roster-admin', title: "Roster & Cuti", desc: "Informasi kehadiran", icon: <Clock className="w-5 h-5" />, color: 'indigo', action: () => handleNavigate('roster-admin') },
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboards',
      icon: <LayoutDashboard className="w-5 h-5" />,
      color: 'rose' as const,
      bgIcon: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
      pillColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200/60 dark:border-rose-800/60',
      items: [
        { id: 'leaderboard', title: "Hall of Fame & Rank", desc: "Pangkat Kehormatan & Prestasi", icon: <Trophy className="w-5 h-5" />, color: 'rose', action: () => handleNavigate('leaderboard') },
        { id: 'wo-maintenance-dashboard', title: "WO Maintenance", desc: "Downtime & sparepart", icon: <Wrench className="w-5 h-5" />, color: 'rose', action: () => handleNavigate('wo-maintenance-dashboard') },
        { id: 'adm-dashboard', title: "Administrasi", desc: "Kehadiran personel", icon: <User className="w-5 h-5" />, color: 'rose', action: () => handleNavigate('adm-dashboard') },
        { id: 'pelanggaran-dashboard', title: "Pelanggaran", desc: "SP & Konseling aktif", icon: <AlertTriangle className="w-5 h-5" />, color: 'rose', action: () => handleNavigate('pelanggaran-dashboard') },
        { id: 'sap-dashboard', title: "SAP Dashboard", desc: "Inspeksi & Temuan", icon: <LineChart className="w-5 h-5" />, color: 'rose', action: () => handleNavigate('sap-dashboard') },
        { id: 'monitoring', title: "Pemantauan", desc: "Suhu, Kelembapan, Gas", icon: <Activity className="w-5 h-5" />, color: 'rose', action: () => handleNavigate('monitoring') },
        { id: 'admin-dashboard', title: "Developer", desc: "Manajemen Database", icon: <Settings className="w-5 h-5" />, color: 'rose', action: () => handleNavigate('admin-dashboard') }
      ]
    }
  ], []);

  return (
    <div className="space-y-3 pt-1">
      {sections.map(section => {
        const isExpanded = !!openSections[section.id];
        return (
          <div 
            key={section.id} 
            className="rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:border-slate-300 dark:hover:border-slate-700 backdrop-blur-md"
            style={{
              backgroundColor: 'var(--card-bg, rgba(255, 255, 255, 0.85))',
              borderColor: 'var(--border-main, rgba(148, 163, 184, 0.25))'
            }}
          >
            {/* Accordion Header Button */}
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full px-4 py-3 sm:px-4.5 sm:py-3.5 flex items-center justify-between text-left transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105 shadow-2xs ${section.bgIcon}`}>
                  {section.icon}
                </div>
                <span 
                  className="text-sm sm:text-base font-bold tracking-tight truncate"
                  style={{ color: 'var(--text-main, #0f172a)' }}
                >
                  {section.title}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full shrink-0 border ${section.pillColor}`}>
                  {section.items.length}
                </span>
              </div>
              <div className="p-1 rounded-lg text-slate-400 dark:text-slate-500 transition-colors shrink-0">
                <ChevronDown className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-teal-600 dark:text-teal-400' : ''}`} />
              </div>
            </button>

            {/* Accordion Body Content */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: "easeInOut" }}
                  className="overflow-hidden border-t"
                  style={{ borderColor: 'var(--border-main, rgba(148, 163, 184, 0.18))' }}
                >
                  <div 
                    className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5"
                    style={{ backgroundColor: 'var(--bg-main, rgba(248, 250, 252, 0.65))' }}
                  >
                    {section.items.map(item => (
                      <ActionItemCard key={item.id} {...item} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* KTA / TTA Confirmation Modal */}
      {showKtaConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-4"
            style={{
              backgroundColor: 'var(--card-bg, #FFFFFF)',
              borderColor: 'var(--border-main, #CBD5E1)'
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Pilih Alur Laporan KTA / TTA</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Harap pilih media pelaporan</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowKtaConfirmation(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                className="w-full h-10 px-4 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-95"
                onClick={() => {
                  setShowKtaConfirmation(false);
                  handleNavigate('group-reports');
                }}
              >
                <UploadCloud className="w-4 h-4" />
                Kirim Bukti SS ke Portal (Terekap)
              </button>
              <button
                type="button"
                className="w-full h-10 px-4 text-xs font-bold rounded-xl border border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
                onClick={() => {
                  window.open(getKtaUrl(), '_blank');
                  setShowKtaConfirmation(false);
                }}
              >
                <ExternalLink className="w-4 h-4" />
                Buka Form KTA/TTA Safety ↗
              </button>
              <button
                type="button"
                className="w-full h-9 px-4 text-xs font-semibold rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-800 cursor-pointer transition-colors"
                onClick={() => setShowKtaConfirmation(false)}
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ActionItemCard({ title, desc, icon, color, action }: any) {
  const colorStyles: Record<string, string> = {
    teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 group-hover:bg-teal-500 group-hover:text-white',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 group-hover:bg-purple-500 group-hover:text-white',
    slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20 group-hover:bg-slate-600 group-hover:text-white',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white',
  };

  return (
    <button 
      onClick={action}
      className="group relative flex items-center gap-3 p-3 rounded-xl border shadow-2xs hover:shadow-sm transition-all text-left overflow-hidden cursor-pointer active:scale-[0.99]"
      style={{ 
        backgroundColor: 'var(--card-bg, #FFFFFF)',
        borderColor: 'var(--border-main, rgba(148, 163, 184, 0.25))',
      }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 border ${colorStyles[color] || colorStyles.slate}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-xs sm:text-sm leading-tight truncate text-[var(--text-main, #1E293B)] group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
          {title}
        </h4>
        <p className="text-[11px] leading-snug truncate text-[var(--text-muted, #64748B)] mt-0.5">
          {desc}
        </p>
      </div>
    </button>
  );
}
