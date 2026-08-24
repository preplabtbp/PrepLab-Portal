import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect, useMemo } from 'react';
import { Cloud,  
  User, X, Calendar, AlertTriangle, FileText, Utensils, CheckCircle2, 
  ThermometerSun, LineChart, LayoutDashboard, Wrench, CheckSquare, 
  ShieldCheck, Eye, Activity, Folder, Info, Package, History, 
  PlusCircle, Settings, ArrowRight, Clock, Box, ClipboardList, Briefcase, Users,
  BookOpen, Sparkles, Edit2, ClipboardCheck } from 'lucide-react';
import { Button } from './ui';
import { getKtaUrl } from '../sheets-api';
import { FoodReportModal } from './food-report-modal';
import { UsernamePromptModal } from './UsernamePromptModal';
import { getDailySkenaQuote } from '../utils/skena-quotes';
import { DailyGreetingHero } from './DailyGreetingHero';

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
  const [activeTab, setActiveTab] = useState('all');
  
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
    fetch('/api/developers').then(res => res.json()).then(data => setDeveloperList(data.map((d: any) => d.nik))).catch(() => {});
  }, []);

  const isSuperAdmin = inspectorNik === '02D25000055';
  const isDeveloper = isSuperAdmin || inspectorNik === 'preplabadmin' || developerList.includes(inspectorNik);

  const isLab = userSection.toLowerCase().includes('laboratory') || isDeveloper;
  const isMaintenance = userSection.toLowerCase().includes('maintenance') || isDeveloper;
  const hasInventoryAccess = userSection.toLowerCase().includes('inventory control') || isDeveloper;
  const isQA = userSection.toLowerCase().includes('qa') || userSection.toLowerCase().includes('quality assurance') || isDeveloper;
  const isCrew = userJabatan.toLowerCase().includes('crew');

  const [greeting, setGreeting] = useState('');
  
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 11) setGreeting('Selamat Pagi');
    else if (hour < 15) setGreeting('Selamat Siang');
    else if (hour < 18) setGreeting('Selamat Sore');
    else setGreeting('Selamat Malam');
  }, []);

  const sections = [
    {
      id: 'operational',
      title: 'Operasional & Maintenance',
      icon: <Activity className="w-5 h-5" />,
      color: 'teal' as const,
      bgIcon: 'bg-teal-100 text-teal-600',
      items: [
        { id: 'inspect', title: "Inspeksi Harian", desc: "Checklist P2H harian", icon: <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'teal', action: () => onNav('inspect') },
        ...(isLab ? [{ id: 'pemantauan', title: "Pantau Parameter", desc: "Suhu, kelembapan & gas", icon: <ThermometerSun className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'teal', action: () => onNav('pemantauan') }] : []),
        ...(isMaintenance ? [{ id: 'wo-list', title: "Daftar Work Order", desc: "Status & riwayat WO", icon: <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'blue', action: () => onNav('wo-list') }] : []),
        { id: 'create-wo', title: "Buat Work Order", desc: "Form temuan kerusakan", icon: <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'blue', action: () => onNav('create-wo') },
        { id: 'wo-dashboard', title: "Dashboard Maintenance", desc: "Rekap downtime & sparepart", icon: <LineChart className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'teal', action: () => onNav('wo-maintenance-dashboard') },
      ]
    },
    {
      id: 'reporting',
      title: 'Observasi & Pelaporan',
      icon: <ShieldCheck className="w-5 h-5" />,
      color: 'amber' as const,
      bgIcon: 'bg-amber-100 text-amber-600',
      items: [
        { id: 'weekly-inspection', title: "Inspeksi Mingguan", desc: "Area & kelengkapan", icon: <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'amber', action: () => onNav('weekly-inspection') },
        { id: 'ticket', title: "Rekapan Temuan Inspeksi", desc: "Laporan temuan unsafe", icon: <Eye className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'amber', action: () => onNav('ticket') },
        { id: 'kta', title: "KTA / TTA", desc: "Laporan KTA & TTA", icon: <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'rose', action: () => setShowKtaConfirmation(true) },
        { id: 'general-inspection', title: "Submit General Inspection", desc: "Form inspeksi tim safety", icon: <ClipboardCheck className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'teal', action: () => window.open('https://docs.google.com/forms/d/e/1FAIpQLScOJSC6wcLsJ26YcmwWndj0Hb9x5V48XHTdHWkPzbH2XwN8ww/viewform', '_blank', 'noopener,noreferrer') },
      ]
    },
    ...(hasInventoryAccess ? [{
      id: 'inventory',
      title: 'Inventory Control (APD)',
      icon: <Package className="w-5 h-5" />,
      color: 'purple' as const,
      bgIcon: 'bg-purple-100 text-purple-600',
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
      bgIcon: 'bg-blue-100 text-blue-600',
      items: [
        { id: 'quiz', title: "Quiz Safety & SOP", desc: "Uji pemahaman prosedur", icon: <BookOpen className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'blue', action: () => onNav('quiz') },
        { id: 'manual', title: "Buku Panduan", desc: "User Manual Sistem", icon: <Info className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'blue', action: () => onNav('manual') },
        ...(isQA ? [{ id: 'quiz-admin', title: "Manajemen Quiz", desc: "Tambah, Edit & Hapus Soal", icon: <Settings className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'slate', action: () => onNav('quiz-admin') }] : []),
      ]
    },
    {
      id: 'admin',
      title: 'Administrasi & HR',
      icon: <Briefcase className="w-5 h-5" />,
      color: 'slate' as const,
      bgIcon: 'bg-slate-200 text-slate-700',
      items: [
        { id: 'induksi', title: "Induksi Internal", desc: "Form & Laporan Induksi", icon: <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'slate', action: () => onNav('induksi') },
        { id: 'employee-database', title: "Database Karyawan", desc: "Data karyawan & struktur", icon: <Users className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'slate', action: () => onNav('employee-database') },
        { id: 'p5m', title: "P5M Schedule", desc: "Pembuat jadwal P5M", icon: <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'slate', action: () => onNav('p5m') },
        { id: 'agenda', title: "Agenda Personal", desc: "Jadwal & kegiatan", icon: <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'slate', action: () => onNav('agenda') },
        { id: 'roster-admin', title: "Roster & Cuti", desc: "Informasi kehadiran", icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'slate', action: () => onNav('roster-admin') },
        { id: 'food-report', title: "Lapor Makan", desc: "Status konsumsi", icon: <Utensils className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'orange', action: () => setShowFoodReportModal(true), highlight: true },
      ]
    },
    {
      id: 'dashboard',
      title: 'Dashboards',
      icon: <LayoutDashboard className="w-5 h-5" />,
      color: 'indigo' as const,
      bgIcon: 'bg-indigo-100 text-indigo-600',
      items: [
        { id: 'wo-maintenance-dashboard', title: "WO Maintenance", desc: "Downtime & sparepart", icon: <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'teal', action: () => onNav('wo-maintenance-dashboard') },
        { id: 'adm-dashboard', title: "Administrasi", desc: "Kehadiran personel", icon: <User className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'indigo', action: () => onNav('adm-dashboard') },
        { id: 'pelanggaran-dashboard', title: "Pelanggaran", desc: "SP & Konseling aktif", icon: <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'rose', action: () => onNav('pelanggaran-dashboard') },
        { id: 'sap-dashboard', title: "SAP Dashboard", desc: "Inspeksi & Temuan", icon: <LineChart className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'indigo', action: () => onNav('sap-dashboard') },
        { id: 'monitoring', title: "Pemantauan", desc: "Suhu, Kelembapan, Gas", icon: <Activity className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'indigo', action: () => onNav('monitoring') },
        ...(isDeveloper ? [
          { id: 'admin-dashboard', title: "Developer", desc: "Manajemen Database", icon: <Settings className="w-5 h-5 sm:w-6 sm:h-6" />, color: 'slate', action: () => onNav('admin-dashboard') }
        ] : [])
      ]
    }
  ];

  let tabs = [
    { id: 'all', label: 'Semua Menu' },
    { id: 'operational', label: 'Operasional' },
    { id: 'reporting', label: 'Pelaporan' },
    ...(hasInventoryAccess ? [{ id: 'inventory', label: 'Inventory' }] : []),
    { id: 'education', label: 'Edukasi' },
    { id: 'admin', label: 'HR & Admin' },
    { id: 'dashboard', label: 'Dashboard' }
  ];

  let allowedSections = sections;
  if (isCrew) {

    allowedSections = sections.map(s => {
      let allowedItemIds = ['quiz', 'food-report', 'manual'];
      if (isQA) {
        allowedItemIds.push('quiz-admin');
      }
      if (isMaintenance) {
        allowedItemIds.push('create-wo', 'wo-list', 'wo-dashboard', 'wo-maintenance-dashboard');
      }
      const allowedItems = s.items.filter(item => allowedItemIds.includes(item.id));
      return { ...s, items: allowedItems };
    }).filter(s => s.items.length > 0);
  }

  const filteredSections = activeTab === 'all' 
    ? allowedSections 
    : allowedSections.filter(s => s.id === activeTab);


  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }} 
      transition={{ duration: 0.4, ease: "easeOut" }} 
      className="pb-24 px-4 sm:px-6 lg:px-8 w-full h-full max-w-5xl mx-auto space-y-6"
    >
      
      {/* Dynamic Daily Greeting Hero with Skena Quotes & Splash Morphing */}
      <DailyGreetingHero 
        inspectorName={inspectorName} 
        inspectorNik={inspectorNik} 
        onOpenUsernameModal={() => setShowUsernameModal(true)} 
      />

      {/* Sticky Tabs for Mobile/Desktop */}
      <div 
        className="sticky top-[56px] sm:top-[70px] z-30 -mx-4 px-4 py-3 sm:mx-0 sm:px-0 backdrop-blur-md sm:backdrop-blur-none sm:py-0 border-b sm:border-none transition-colors"
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
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 border ${
                activeTab === tab.id 
                  ? 'shadow-md font-bold' 
                  : 'hover:opacity-90'
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--primary, #0f172a)' : 'var(--card-bg, #ffffff)',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-main, #475569)',
                borderColor: activeTab === tab.id ? 'var(--primary, #0f172a)' : 'var(--border-main, #e2e8f0)'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Content */}
      <div className="space-y-8 pt-2 sm:pt-0 relative z-10">
        <AnimatePresence mode="popLayout">
          {filteredSections.map((section) => (
            <motion.section 
              key={section.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="scroll-mt-24"
            >
              <div className="flex items-center gap-3 mb-4 px-1">
                <div className={`p-2 rounded-lg ${section.bgIcon}`}>
                  {section.icon}
                </div>
                <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-main, #1e293b)' }}>
                  {section.title}
                </h2>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {section.items.map(item => (
                  <ActionCard key={item.id} {...item} />
                ))}
              </div>
            </motion.section>
          ))}
        </AnimatePresence>
      </div>

      <FoodReportModal 
        isOpen={showFoodReportModal}
        onClose={() => setShowFoodReportModal(false)}
        userNik={inspectorNik}
        userName={inspectorName}
        userDept="ALL"
      />

      {/* KTA Modal */}
            {showGtsIntipModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
          >
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-500 shadow-inner border border-slate-100">
                <Eye className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Intip Portal</h3>
              <p className="text-slate-600 mb-8 leading-relaxed">
                Fitur ini hanya tersedia untuk personil TBP/GPS untuk saat ini.
              </p>
              <button 
                onClick={() => setShowGtsIntipModal(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-2xl transition-all shadow-md active:scale-[0.98]"
              >
                Tutup
              </button>
            </div>
          </motion.div>
        </div>
      )}
      
      {showKtaConfirmation && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
          >
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500 shadow-inner">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-display font-bold text-slate-800 mb-3">Konfirmasi Pengalihan</h3>
              <p className="text-slate-500 mb-8 leading-relaxed text-sm">
                Anda akan dialihkan ke tab baru untuk mengisi formulir Laporan KTA / TTA milik Tim Safety.
              </p>
              
              <div className="space-y-3">
                <Button 
                  className="w-full h-12 text-base font-semibold shadow-md bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => {
                    setShowKtaConfirmation(false);
                    window.open(getKtaUrl(), '_blank');
                  }}
                >
                  Lanjutkan ke Form
                </Button>
                <Button 
                  variant="secondary"
                  className="w-full h-12 text-base font-semibold text-slate-600 border-slate-200"
                  onClick={() => setShowKtaConfirmation(false)}
                >
                  Batal
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
      className={`group relative flex flex-col p-4 border rounded-2xl shadow-xs hover:shadow-md transition-all text-left overflow-hidden ${
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
        className="font-bold text-[13px] sm:text-[15px] mb-1 leading-tight pr-2 truncate w-full"
        style={{ color: 'var(--text-main, #1e293b)' }}
      >
        {title}
      </h4>
      <p 
        className="text-[11px] sm:text-[13px] line-clamp-2"
        style={{ color: 'var(--text-muted, #64748b)' }}
      >
        {desc}
      </p>
      
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
        <ArrowRight className="w-4 h-4 opacity-50 group-hover:opacity-100" style={{ color: 'var(--primary, #0f172a)' }} />
      </div>
    </motion.button>
  );
}
