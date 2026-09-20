import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, ThermometerSun, Wrench, PlusCircle, LineChart, ShieldCheck, 
  CheckSquare, Eye, AlertTriangle, ClipboardCheck, Package, Box, FileText, 
  Settings, BookOpen, Info, Briefcase, Users, Calendar, Clock, Utensils, 
  Receipt, LayoutDashboard, User, Search, X, ArrowRight, LayoutGrid, UploadCloud, ExternalLink, Sparkles
} from 'lucide-react';
import { Button } from './ui';
import { FoodReportModal } from './food-report-modal';
import { getKtaUrl } from '../sheets-api';
import { MeetingRoomDevModal } from './MeetingRoomDevModal';

interface ModulesScreenProps {
  onNav: (tab: any) => void;
  inspectorNik?: string;
  inspectorName?: string;
  userPt?: string;
}

export function ModulesScreen({ onNav, inspectorNik = '', inspectorName = '', userPt }: ModulesScreenProps) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showKtaConfirmation, setShowKtaConfirmation] = useState(false);
  const [showFoodReportModal, setShowFoodReportModal] = useState(false);
  const [showDevAuthModal, setShowDevAuthModal] = useState(false);

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

  const isMeetingRoom = inspectorNik?.toUpperCase() === 'MEETINGROOM' || inspectorNik?.toUpperCase() === 'MEETING';
  const isSuperAdmin = inspectorNik === '02D25000055' || inspectorNik === '02D24000043';
  const isDeveloper = isSuperAdmin || inspectorNik === 'preplabadmin' || developerList.includes(inspectorNik);
  const isLab = isMeetingRoom || userSection.toLowerCase().includes('laboratory') || isDeveloper;
  const isMaintenance = isMeetingRoom || userSection.toLowerCase().includes('maintenance') || isDeveloper;
  const hasInventoryAccess = isMeetingRoom || userSection.toLowerCase().includes('inventory control') || isDeveloper;
  const isQA = isMeetingRoom || userSection.toLowerCase().includes('qa') || userSection.toLowerCase().includes('quality assurance') || isDeveloper;
  const isCrew = isMeetingRoom ? false : userJabatan.toLowerCase().includes('crew');

  const sections = useMemo(() => [
    {
      id: 'operational',
      title: 'Operasional & Maintenance',
      icon: <Activity className="w-5 h-5" />,
      color: 'teal' as const,
      bgIcon: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
      items: [
        { id: 'inspect', title: "Inspeksi Harian", desc: "Checklist P2H harian", icon: <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'teal', action: () => onNav('inspect') },
        ...(isLab ? [{ id: 'pemantauan', title: "Pantau Parameter", desc: "Suhu, kelembapan & gas", icon: <ThermometerSun className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'teal', action: () => onNav('pemantauan') }] : []),
        ...(isMaintenance ? [{ id: 'wo-list', title: "Daftar Work Order", desc: "Status & riwayat WO", icon: <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'teal', action: () => onNav('wo-list') }] : []),
        { id: 'create-wo', title: "Buat Work Order", desc: "Form temuan kerusakan", icon: <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'teal', action: () => onNav('create-wo') },
        { id: 'wo-dashboard', title: "Dashboard Maintenance", desc: "Rekap downtime & sparepart", icon: <LineChart className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'teal', action: () => onNav('wo-maintenance-dashboard') },
      ]
    },
    {
      id: 'reporting',
      title: 'Observasi & Pelaporan',
      icon: <ShieldCheck className="w-5 h-5" />,
      color: 'amber' as const,
      bgIcon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      items: [
        { id: 'weekly-inspection', title: "Inspeksi Mingguan", desc: "Area & kelengkapan", icon: <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'amber', action: () => onNav('weekly-inspection') },
        { id: 'ticket', title: "Rekapan Temuan Inspeksi", desc: "Laporan temuan unsafe", icon: <Eye className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'amber', action: () => onNav('ticket') },
        { id: 'kta', title: "KTA / TTA", desc: "Laporan Observasi KTA & TTA", icon: <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'amber', action: () => setShowKtaConfirmation(true) },
        { id: 'general-inspection', title: "Submit General Inspection", desc: "Form inspeksi tim safety", icon: <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'amber', action: () => window.open('https://docs.google.com/forms/d/e/1FAIpQLScOJSC6wcLsJ26YcmwWndj0Hb9x5V48XHTdHWkPzbH2XwN8ww/viewform', '_blank', 'noopener,noreferrer') },
      ]
    },
    ...(hasInventoryAccess ? [{
      id: 'inventory',
      title: 'Inventory Control (APD)',
      icon: <Package className="w-5 h-5" />,
      color: 'purple' as const,
      bgIcon: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20',
      items: [
        { id: 'apd-input', title: "Distribusi APD", desc: "Riwayat & input", icon: <Box className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'purple', action: () => onNav('apd-input') },
        { id: 'apd-monitoring', title: "Monitoring Dokumen", desc: "Status tanda tangan", icon: <FileText className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'purple', action: () => onNav('apd-monitoring') },
        { id: 'apd-settings', title: "Pengaturan APD", desc: "Interval & master data", icon: <Settings className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'purple', action: () => onNav('apd-settings') },
      ]
    }] : []),
    {
      id: 'education',
      title: 'Pelatihan & Edukasi',
      icon: <BookOpen className="w-5 h-5" />,
      color: 'blue' as const,
      bgIcon: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      items: [
        { id: 'quiz', title: "Quiz Safety & SOP", desc: "Uji pemahaman prosedur", icon: <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'blue', action: () => onNav('quiz') },
        { id: 'manual', title: "Buku Panduan", desc: "User Manual Sistem", icon: <Info className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'blue', action: () => onNav('manual') },
        ...(isQA ? [{ id: 'quiz-admin', title: "Manajemen Quiz", desc: "Tambah, Edit & Hapus Soal", icon: <Settings className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'blue', action: () => onNav('quiz-admin') }] : []),
      ]
    },
    {
      id: 'admin',
      title: 'Administrasi & HR',
      icon: <Briefcase className="w-5 h-5" />,
      color: 'indigo' as const,
      bgIcon: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
      items: [
        { id: 'induksi', title: "Induksi Internal", desc: "Form & Laporan Induksi", icon: <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'indigo', action: () => onNav('induksi') },
        { id: 'employee-database', title: "Database Karyawan", desc: "Data karyawan & struktur", icon: <Users className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'indigo', action: () => onNav('employee-database') },
        ...(isQA ? [{ id: 'p5m', title: "P5M Schedule", desc: "Jadwal & materi briefing", icon: <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'indigo', action: () => onNav('p5m') }] : []),
        { id: 'agenda', title: "Agenda Personal", desc: "Jadwal & kegiatan", icon: <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'indigo', action: () => onNav('agenda') },
        { id: 'roster-admin', title: "Roster & Cuti", desc: "Informasi kehadiran", icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'indigo', action: () => onNav('roster-admin') },
        { id: 'food-report', title: "Lapor Makan", desc: "Status konsumsi", icon: <Utensils className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'indigo', action: () => setShowFoodReportModal(true) },
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboards',
      icon: <LayoutDashboard className="w-5 h-5" />,
      color: 'rose' as const,
      bgIcon: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
      items: [
        { id: 'wo-maintenance-dashboard', title: "WO Maintenance", desc: "Downtime & sparepart", icon: <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'rose', action: () => onNav('wo-maintenance-dashboard') },
        { id: 'adm-dashboard', title: "Administrasi", desc: "Kehadiran personel", icon: <User className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'rose', action: () => onNav('adm-dashboard') },
        { id: 'pelanggaran-dashboard', title: "Pelanggaran", desc: "SP & Konseling aktif", icon: <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'rose', action: () => onNav('pelanggaran-dashboard') },
        { id: 'sap-dashboard', title: "SAP Dashboard", desc: "Inspeksi & Temuan", icon: <LineChart className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'rose', action: () => onNav('sap-dashboard') },
        { id: 'monitoring', title: "Pemantauan", desc: "Suhu, Kelembapan, Gas", icon: <Activity className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'rose', action: () => onNav('monitoring') },
        ...((isDeveloper || isMeetingRoom) ? [
          { 
            id: 'admin-dashboard', 
            title: "Developer", 
            desc: "Manajemen Database", 
            icon: <Settings className="w-5 h-5 sm:w-6 sm:h-6" />, 
            color: 'rose', 
            action: () => {
              if (isMeetingRoom && !isDeveloper) {
                setShowDevAuthModal(true);
              } else {
                onNav('admin-dashboard');
              }
            } 
          }
        ] : [])
      ]
    }
  ], [isLab, isMaintenance, hasInventoryAccess, isQA, isDeveloper, isMeetingRoom, onNav]);

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
        const allowedItemIds = ['quiz', 'food-report', 'manual'];
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
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }} 
      transition={{ duration: 0.35, ease: "easeOut" }} 
      className="pb-24 px-3 sm:px-6 lg:px-8 w-full h-full max-w-7xl mx-auto space-y-6 pt-3"
    >
      {/* Header Banner */}
      <div className="p-5 sm:p-6 rounded-3xl border bg-[var(--card-bg)] border-[var(--border-main)] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black text-[var(--text-main)] tracking-tight">
                Menu Modul &amp; Layanan Portal
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 border border-teal-500/30">
                {totalModulesCount} Modul
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Akses cepat seluruh formulir teknis, instrumen laboratorium, checklist K3, dan administrasi.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Cari modul atau formulir..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-9 py-2 rounded-xl text-xs font-semibold bg-[var(--input-bg)] border border-[var(--border-main)] text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-teal-500 transition-all shadow-2xs"
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
      </div>

      {/* Sticky Category Tabs */}
      <div 
        className="sticky top-[56px] sm:top-[70px] z-30 -mx-3 px-3 py-2.5 sm:mx-0 sm:px-0 backdrop-blur-md sm:backdrop-blur-none border-b sm:border-none transition-colors"
        style={{ 
          backgroundColor: 'var(--bg-main, #F4F7F6)', 
          borderColor: 'var(--border-main, #e2e8f0)' 
        }}
      >
        <div className="flex overflow-x-auto gap-2 pb-1 sm:pb-0 sm:flex-wrap [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 border cursor-pointer ${
                activeTab === tab.id 
                  ? 'shadow-xs font-bold text-white bg-teal-600 border-teal-600' 
                  : 'bg-[var(--card-bg)] text-[var(--text-main)] border-[var(--border-main)] hover:border-teal-500/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Modules Grid Content */}
      <div className="space-y-7 pt-1 relative z-10">
        <AnimatePresence mode="popLayout">
          {filteredSections.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-dashed border-[var(--border-main)] bg-[var(--card-bg)]">
              <p className="text-sm font-bold text-[var(--text-main)] mb-1">Tidak Ada Modul yang Cocok</p>
              <p className="text-xs text-[var(--text-muted)]">
                Coba gunakan kata kunci lain seperti <em>"inspeksi"</em>, <em>"wo"</em>, atau <em>"apd"</em>.
              </p>
            </div>
          ) : (
            filteredSections.map((section) => (
              <motion.section 
                key={section.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="scroll-mt-24"
              >
                <div className="flex items-center gap-3 mb-3 px-1">
                  <div className={`p-2 rounded-xl ${section.bgIcon}`}>
                    {section.icon}
                  </div>
                  <h2 className="text-sm sm:text-base font-bold tracking-tight text-[var(--text-main)]">
                    {section.title}
                  </h2>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                    ({section.items.length})
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                  {section.items.map(item => (
                    <ActionCard key={item.id} {...item} />
                  ))}
                </div>
              </motion.section>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Food Report Modal */}
      <FoodReportModal 
        isOpen={showFoodReportModal}
        onClose={() => setShowFoodReportModal(false)}
        userNik={inspectorNik}
        userName={inspectorName}
        userDept="ALL"
      />

      {/* KTA Modal */}
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
              <h3 className="text-lg sm:text-xl font-display font-bold text-slate-800 dark:text-slate-100 mb-2">Laporan Observasi (KTA/TTA)</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed text-xs sm:text-sm">
                Laporkan kondisi atau tindakan tidak aman ke form Safety, lalu kirimkan bukti screenshot tanggapan formulir per minggu agar otomatis terekap di portal.
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

      {/* Meeting Room Developer Auth Modal */}
      <MeetingRoomDevModal
        isOpen={showDevAuthModal}
        onClose={() => setShowDevAuthModal(false)}
        onSuccess={() => {
          setShowDevAuthModal(false);
          onNav('admin-dashboard');
        }}
      />
    </motion.div>
  );
}

function ActionCard({ title, desc, icon, color, action, highlight }: any) {
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
    <motion.button 
      whileHover={{ y: -2 }} 
      whileTap={{ scale: 0.98 }} 
      onClick={action}
      className={`group relative flex flex-col p-4 border rounded-2xl shadow-xs hover:shadow-md transition-all text-left overflow-hidden cursor-pointer ${
        highlight ? 'ring-1 ring-orange-400' : ''
      }`}
      style={{ 
        backgroundColor: 'var(--card-bg, #ffffff)',
        borderColor: 'var(--border-main, #e2e8f0)',
      }}
    >
      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center mb-3 transition-colors duration-300 border ${colorStyles[color] || colorStyles.slate}`}>
        {icon}
      </div>
      <h4 
        className="font-bold text-[13px] sm:text-[15px] mb-1 leading-tight pr-2 truncate w-full text-[var(--text-main, #1e293b)]"
      >
        {title}
      </h4>
      <p 
        className="text-[11px] sm:text-[12px] line-clamp-2 text-[var(--text-muted, #64748b)]"
      >
        {desc}
      </p>
      
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
        <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100 text-[var(--primary, #0f172a)]" />
      </div>
    </motion.button>
  );
}
