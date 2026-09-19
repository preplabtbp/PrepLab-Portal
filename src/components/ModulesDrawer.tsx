import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, ThermometerSun, Wrench, PlusCircle, LineChart, ShieldCheck, 
  CheckSquare, Eye, AlertTriangle, ClipboardCheck, Package, Box, FileText, 
  Settings, BookOpen, Info, Briefcase, Users, Calendar, Clock, Utensils, 
  LayoutDashboard, User, Search, X, ArrowRight, LayoutGrid, UploadCloud, ExternalLink,
  Trophy
} from 'lucide-react';
import { Button } from './ui';
import { FoodReportModal } from './food-report-modal';
import { getKtaUrl } from '../sheets-api';

interface ModulesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNav: (tab: any) => void;
  inspectorNik?: string;
  inspectorName?: string;
  userPt?: string;
}

export function ModulesDrawer({
  isOpen,
  onClose,
  onNav,
  inspectorNik = '',
  inspectorName = '',
  userPt
}: ModulesDrawerProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showKtaConfirmation, setShowKtaConfirmation] = useState(false);
  const [showFoodReportModal, setShowFoodReportModal] = useState(false);

  // Close drawer on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const userJabatan = localStorage.getItem('p2h_inspector_jabatan') || '';
  let userSection = '';
  try {
    const profile = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
    userSection = profile.section || '';
  } catch (e) {}

  const [developerList, setDeveloperList] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/developers')
      .then(res => res.json())
      .then(data => setDeveloperList(data.map((d: any) => d.nik)))
      .catch(() => {});
  }, []);

  const isSuperAdmin = inspectorNik === '02D25000055' || inspectorNik === '02D24000043';
  const isDeveloper = isSuperAdmin || inspectorNik === 'preplabadmin' || developerList.includes(inspectorNik);
  const isLab = userSection.toLowerCase().includes('laboratory') || isDeveloper;
  const isMaintenance = userSection.toLowerCase().includes('maintenance') || isDeveloper;
  const hasInventoryAccess = userSection.toLowerCase().includes('inventory control') || isDeveloper;
  const isQA = userSection.toLowerCase().includes('qa') || userSection.toLowerCase().includes('quality assurance') || isDeveloper;
  const isCrew = userJabatan.toLowerCase().includes('crew');

  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  const sections = useMemo(() => [
    {
      id: 'operational',
      title: 'Operasional & Maintenance',
      icon: <Activity className="w-5 h-5" />,
      color: 'teal' as const,
      bgIcon: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
      items: [
        { id: 'inspect', title: "Inspeksi Harian", desc: "Checklist P2H harian", icon: <CheckSquare className="w-5 h-5" />, color: 'teal', action: () => handleItemClick(() => onNav('inspect')) },
        ...(isLab ? [{ id: 'pemantauan', title: "Pantau Parameter", desc: "Suhu, kelembapan & gas", icon: <ThermometerSun className="w-5 h-5" />, color: 'teal', action: () => handleItemClick(() => onNav('pemantauan')) }] : []),
        ...(isMaintenance ? [{ id: 'wo-list', title: "Daftar Work Order", desc: "Status & riwayat WO", icon: <Wrench className="w-5 h-5" />, color: 'teal', action: () => handleItemClick(() => onNav('wo-list')) }] : []),
        { id: 'create-wo', title: "Buat Work Order", desc: "Form temuan kerusakan", icon: <PlusCircle className="w-5 h-5" />, color: 'teal', action: () => handleItemClick(() => onNav('create-wo')) },
        { id: 'wo-dashboard', title: "Dashboard Maintenance", desc: "Rekap downtime & sparepart", icon: <LineChart className="w-5 h-5" />, color: 'teal', action: () => handleItemClick(() => onNav('wo-maintenance-dashboard')) },
      ]
    },
    {
      id: 'reporting',
      title: 'Observasi & Pelaporan',
      icon: <ShieldCheck className="w-5 h-5" />,
      color: 'amber' as const,
      bgIcon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      items: [
        { id: 'weekly-inspection', title: "Inspeksi Mingguan", desc: "Area & kelengkapan", icon: <CheckSquare className="w-5 h-5" />, color: 'amber', action: () => handleItemClick(() => onNav('weekly-inspection')) },
        { id: 'ticket', title: "Rekapan Temuan Inspeksi", desc: "Laporan temuan unsafe", icon: <Eye className="w-5 h-5" />, color: 'amber', action: () => handleItemClick(() => onNav('ticket')) },
        { id: 'kta', title: "KTA / TTA", desc: "Laporan Observasi KTA & TTA", icon: <AlertTriangle className="w-5 h-5" />, color: 'amber', action: () => setShowKtaConfirmation(true) },
        { id: 'general-inspection', title: "Submit General Inspection", desc: "Form inspeksi tim safety", icon: <ClipboardCheck className="w-5 h-5" />, color: 'amber', action: () => window.open('https://docs.google.com/forms/d/e/1FAIpQLScOJSC6wcLsJ26YcmwWndj0Hb9x5V48XHTdHWkPzbH2XwN8ww/viewform', '_blank', 'noopener,noreferrer') },
      ]
    },
    ...(hasInventoryAccess ? [{
      id: 'inventory',
      title: 'Inventory Control (APD)',
      icon: <Package className="w-5 h-5" />,
      color: 'purple' as const,
      bgIcon: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
      items: [
        { id: 'apd-input', title: "Distribusi APD", desc: "Riwayat & input", icon: <Box className="w-5 h-5" />, color: 'purple', action: () => handleItemClick(() => onNav('apd-input')) },
        { id: 'apd-monitoring', title: "Monitoring Dokumen", desc: "Status tanda tangan", icon: <FileText className="w-5 h-5" />, color: 'purple', action: () => handleItemClick(() => onNav('apd-monitoring')) },
        { id: 'apd-settings', title: "Pengaturan APD", desc: "Interval & master data", icon: <Settings className="w-5 h-5" />, color: 'purple', action: () => handleItemClick(() => onNav('apd-settings')) },
      ]
    }] : []),
    {
      id: 'education',
      title: 'Pelatihan & Edukasi',
      icon: <BookOpen className="w-5 h-5" />,
      color: 'blue' as const,
      bgIcon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      items: [
        { id: 'quiz', title: "Quiz Safety & SOP", desc: "Uji pemahaman prosedur", icon: <BookOpen className="w-5 h-5" />, color: 'blue', action: () => handleItemClick(() => onNav('quiz')) },
        { id: 'manual', title: "Buku Panduan", desc: "User Manual Sistem", icon: <Info className="w-5 h-5" />, color: 'blue', action: () => handleItemClick(() => onNav('manual')) },
        ...(isQA ? [{ id: 'quiz-admin', title: "Manajemen Quiz", desc: "Tambah, Edit & Hapus Soal", icon: <Settings className="w-5 h-5" />, color: 'blue', action: () => handleItemClick(() => onNav('quiz-admin')) }] : []),
      ]
    },
    {
      id: 'admin',
      title: 'Administrasi & HR',
      icon: <Briefcase className="w-5 h-5" />,
      color: 'indigo' as const,
      bgIcon: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
      items: [
        { id: 'induksi', title: "Induksi Internal", desc: "Form & Laporan Induksi", icon: <ShieldCheck className="w-5 h-5" />, color: 'indigo', action: () => handleItemClick(() => onNav('induksi')) },
        { id: 'employee-database', title: "Database Karyawan", desc: "Data karyawan & struktur", icon: <Users className="w-5 h-5" />, color: 'indigo', action: () => handleItemClick(() => onNav('employee-database')) },
        ...(isQA ? [{ id: 'p5m', title: "P5M Schedule", desc: "Jadwal & materi briefing", icon: <Calendar className="w-5 h-5" />, color: 'indigo', action: () => handleItemClick(() => onNav('p5m')) }] : []),
        { id: 'agenda', title: "Agenda Personal", desc: "Jadwal & kegiatan", icon: <Calendar className="w-5 h-5" />, color: 'indigo', action: () => handleItemClick(() => onNav('agenda')) },
        { id: 'roster-admin', title: "Roster & Cuti", desc: "Informasi kehadiran", icon: <Clock className="w-5 h-5" />, color: 'indigo', action: () => handleItemClick(() => onNav('roster-admin')) },
        { id: 'food-report', title: "Lapor Makan", desc: "Status konsumsi", icon: <Utensils className="w-5 h-5" />, color: 'indigo', action: () => setShowFoodReportModal(true) },
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboards',
      icon: <LayoutDashboard className="w-5 h-5" />,
      color: 'rose' as const,
      bgIcon: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
      items: [
        { id: 'leaderboard', title: "Hall of Fame & Rank", desc: "Pangkat Kehormatan & Prestasi", icon: <Trophy className="w-5 h-5" />, color: 'rose', action: () => handleItemClick(() => onNav('leaderboard')) },
        { id: 'wo-maintenance-dashboard', title: "WO Maintenance", desc: "Downtime & sparepart", icon: <Wrench className="w-5 h-5" />, color: 'rose', action: () => handleItemClick(() => onNav('wo-maintenance-dashboard')) },
        { id: 'adm-dashboard', title: "Administrasi", desc: "Kehadiran personel", icon: <User className="w-5 h-5" />, color: 'rose', action: () => handleItemClick(() => onNav('adm-dashboard')) },
        { id: 'pelanggaran-dashboard', title: "Pelanggaran", desc: "SP & Konseling aktif", icon: <AlertTriangle className="w-5 h-5" />, color: 'rose', action: () => handleItemClick(() => onNav('pelanggaran-dashboard')) },
        { id: 'sap-dashboard', title: "SAP Dashboard", desc: "Inspeksi & Temuan", icon: <LineChart className="w-5 h-5" />, color: 'rose', action: () => handleItemClick(() => onNav('sap-dashboard')) },
        { id: 'monitoring', title: "Pemantauan", desc: "Suhu, Kelembapan, Gas", icon: <Activity className="w-5 h-5" />, color: 'rose', action: () => handleItemClick(() => onNav('monitoring')) },
        ...(isDeveloper ? [
          { id: 'admin-dashboard', title: "Developer", desc: "Manajemen Database", icon: <Settings className="w-5 h-5" />, color: 'rose', action: () => handleItemClick(() => onNav('admin-dashboard')) }
        ] : [])
      ]
    }
  ], [isLab, isMaintenance, hasInventoryAccess, isQA, isDeveloper, onNav]);

  const tabs = useMemo(() => [
    { id: 'all', label: 'Semua Menu' },
    { id: 'operational', label: 'Operasional' },
    { id: 'reporting', label: 'Pelaporan' },
    ...(hasInventoryAccess ? [{ id: 'inventory', label: 'Inventory' }] : []),
    { id: 'education', label: 'Edukasi' },
    { id: 'admin', label: 'HR & Admin' },
    { id: 'dashboard', label: 'Dashboard' }
  ], [hasInventoryAccess]);

  const allowedSections = useMemo(() => {
    if (isCrew) {
      return sections.map(s => {
        const allowedItemIds = ['quiz', 'food-report', 'manual', 'leaderboard'];
        if (isQA) allowedItemIds.push('quiz-admin');
        if (isMaintenance) allowedItemIds.push('create-wo', 'wo-list', 'wo-dashboard', 'wo-maintenance-dashboard');
        const allowedItems = s.items.filter(item => allowedItemIds.includes(item.id));
        return { ...s, items: allowedItems };
      }).filter(s => s.items.length > 0);
    }
    return sections;
  }, [sections, isCrew, isQA, isMaintenance]);

  const filteredSections = useMemo(() => {
    let result = activeTab === 'all' 
      ? allowedSections 
      : allowedSections.filter(s => s.id === activeTab);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.map(s => ({
        ...s,
        items: s.items.filter(item => 
          item.title.toLowerCase().includes(q) || 
          item.desc.toLowerCase().includes(q)
        )
      })).filter(s => s.items.length > 0);
    }

    return result;
  }, [allowedSections, activeTab, searchQuery]);

  const totalModulesCount = useMemo(() => {
    return allowedSections.reduce((acc, s) => acc + s.items.length, 0);
  }, [allowedSections]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] overflow-hidden">
          {/* Backdrop Blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer Panel - Slides in from the LEFT on desktop view (wider than profile drawer) */}
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-[70] w-full sm:w-[540px] md:w-[620px] lg:w-[680px] xl:w-[740px] h-[100dvh] shadow-2xl border-r flex flex-col overflow-hidden transition-colors"
            style={{
              backgroundColor: 'var(--bg-main, #F8FAFC)',
              borderColor: 'var(--border-main, #E2E8F0)',
              color: 'var(--text-main, #1E293B)'
            }}
          >
            {/* Header Bar */}
            <div 
              className="sticky top-0 z-20 backdrop-blur-md px-5 sm:px-6 py-4 flex items-center justify-between border-b shrink-0 select-none transition-colors"
              style={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
                  <LayoutGrid className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black font-display tracking-tight text-[var(--text-main)]">
                      Semua Menu &amp; Modul
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 border border-teal-500/30">
                      {totalModulesCount} Modul
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    Akses cepat seluruh layanan Prep &amp; Lab Portal
                  </p>
                </div>
              </div>

              <button 
                onClick={onClose}
                className="p-2 rounded-xl border transition-all active:scale-95 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                style={{
                  backgroundColor: 'var(--input-bg, #FFFFFF)',
                  borderColor: 'var(--border-main, #E2E8F0)',
                  color: 'var(--text-muted, #64748B)'
                }}
                title="Tutup Menu (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar & Category Filter */}
            <div 
              className="px-5 sm:px-6 py-3 border-b shrink-0 space-y-3"
              style={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)'
              }}
            >
              {/* Search input */}
              <div className="relative w-full">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari modul atau formulir (misal: P2H, APD, WO, Roster)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9.5 pr-9 py-2 rounded-xl text-xs font-semibold bg-[var(--input-bg)] border border-[var(--border-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-teal-500 transition-all shadow-2xs"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-md cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Horizontal Scrollable Category Pills */}
              <div className="flex overflow-x-auto gap-1.5 pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 border cursor-pointer ${
                      activeTab === tab.id 
                        ? 'shadow-xs font-bold text-white bg-teal-600 border-teal-600' 
                        : 'bg-[var(--bg-main)] text-[var(--text-main)] border-[var(--border-main)] hover:border-teal-500/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:px-6 space-y-6">
              <AnimatePresence mode="popLayout">
                {filteredSections.length === 0 ? (
                  <div className="p-10 text-center rounded-2xl border border-dashed border-[var(--border-main)] bg-[var(--card-bg)]">
                    <p className="text-sm font-bold text-[var(--text-main)] mb-1">Modul Tidak Ditemukan</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      Coba gunakan kata kunci lain seperti <em>"inspeksi"</em>, <em>"wo"</em>, atau <em>"apd"</em>.
                    </p>
                  </div>
                ) : (
                  filteredSections.map((section) => (
                    <div key={section.id} className="space-y-2.5">
                      <div className="flex items-center gap-2 px-1">
                        <div className={`p-1.5 rounded-lg ${section.bgIcon}`}>
                          {section.icon}
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold tracking-tight text-[var(--text-main)]">
                          {section.title}
                        </h3>
                        <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                          ({section.items.length})
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {section.items.map(item => (
                          <DrawerActionCard key={item.id} {...item} />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Footer Info */}
            <div 
              className="p-3.5 px-6 border-t shrink-0 flex items-center justify-between text-[11px] select-none"
              style={{
                backgroundColor: 'var(--card-bg, #FFFFFF)',
                borderColor: 'var(--border-main, #E2E8F0)',
                color: 'var(--text-muted, #64748B)'
              }}
            >
              <div className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Prep &amp; Lab Harita Nickel</span>
              </div>
              <span className="text-[10px] opacity-70">Tekan <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[9px]">Esc</kbd> untuk menutup</span>
            </div>
          </motion.div>

          {/* Sub-modals if triggered inside drawer */}
          <FoodReportModal 
            isOpen={showFoodReportModal}
            onClose={() => setShowFoodReportModal(false)}
            userNik={inspectorNik}
            userName={inspectorName}
            userDept="ALL"
          />

          {showKtaConfirmation && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800"
              >
                <div className="p-6 sm:p-8 text-center">
                  <div className="w-16 h-16 bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner border border-amber-500/30">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-display font-bold text-slate-800 dark:text-slate-100 mb-2">
                    Laporan Observasi (KTA/TTA)
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed text-xs">
                    Laporkan kondisi atau tindakan tidak aman ke formulir Safety, lalu kirimkan bukti screenshot tanggapan formulir per minggu agar otomatis terekap di portal.
                  </p>
                  
                  <div className="space-y-2.5">
                    <Button 
                      className="w-full h-10 text-xs font-bold shadow-md bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white flex items-center justify-center gap-2 cursor-pointer"
                      onClick={() => {
                        setShowKtaConfirmation(false);
                        onClose();
                        onNav('group-reports');
                      }}
                    >
                      <UploadCloud className="w-4 h-4" />
                      Kirim Bukti SS ke Portal (Terekap)
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full h-10 text-xs font-bold border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 flex items-center justify-center gap-2 cursor-pointer"
                      onClick={() => {
                        window.open(getKtaUrl(), '_blank');
                      }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Buka Form KTA/TTA Safety ↗
                    </Button>
                    <Button 
                      variant="secondary"
                      className="w-full h-9 text-xs font-semibold text-slate-500 border-slate-200 dark:border-slate-800 cursor-pointer"
                      onClick={() => setShowKtaConfirmation(false)}
                    >
                      Tutup
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      )}
    </AnimatePresence>
  );
}

function DrawerActionCard({ title, desc, icon, color, action }: any) {
  const colorStyles: Record<string, string> = {
    teal: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20 group-hover:bg-teal-500 group-hover:text-white',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 group-hover:bg-purple-500 group-hover:text-white',
    slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/20 group-hover:bg-slate-600 group-hover:text-white',
    orange: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 group-hover:bg-orange-500 group-hover:text-white',
    indigo: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white',
  };

  return (
    <button 
      onClick={action}
      className="group relative flex items-center gap-3 p-3 rounded-xl border shadow-2xs hover:shadow-sm transition-all text-left overflow-hidden cursor-pointer active:scale-[0.99]"
      style={{ 
        backgroundColor: 'var(--card-bg, #FFFFFF)',
        borderColor: 'var(--border-main, #E2E8F0)',
      }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200 border ${colorStyles[color] || colorStyles.slate}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-xs sm:text-sm leading-tight truncate text-[var(--text-main, #1E293B)] group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
          {title}
        </h4>
        <p className="text-[11px] truncate text-[var(--text-muted, #64748B)] mt-0.5">
          {desc}
        </p>
      </div>
      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-teal-600 dark:text-teal-400 transition-all shrink-0 -translate-x-1 group-hover:translate-x-0" />
    </button>
  );
}

export default ModulesDrawer;
