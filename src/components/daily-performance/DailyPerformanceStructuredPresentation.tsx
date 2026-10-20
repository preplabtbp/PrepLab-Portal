import React, { useState, useEffect } from 'react';
import { 
  Users, Layers, Flame, Cpu, FileCheck, ArrowRight, ArrowLeft, 
  CheckCircle2, AlertTriangle, TrendingUp, Sparkles, BarChart2,
  ChevronRight, Calendar, ShieldCheck, Clock, Gauge
} from 'lucide-react';
import { DailyPerformanceRecord } from './daily-performance-types';
import { formatNumber } from './daily-performance-utils';
import { DailyPerformanceManpowerRosterModal } from './DailyPerformanceManpowerRosterModal';
import { 
  ManpowerTrendChart, 
  SampleReceivedTrendChart, 
  ProductivityPrepTrendChart, 
  XrfInstrumentsTrendChart, 
  QcReportingTrendChart 
} from './DailyPerformanceCharts';

interface DailyPerformanceStructuredPresentationProps {
  records: DailyPerformanceRecord[];
  selectedDate: string;
  isPresentationMode?: boolean;
}

export const DailyPerformanceStructuredPresentation: React.FC<DailyPerformanceStructuredPresentationProps> = ({
  records,
  selectedDate,
  isPresentationMode = false
}) => {
  // 5 sequential steps: 1=Manpower, 2=Sample Received, 3=Productivity Prep, 4=Instruments, 5=QC & Report
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showAllSections, setShowAllSections] = useState<boolean>(false);

  // Modal and Chart states
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showChart1, setShowChart1] = useState(false);
  const [showChart2, setShowChart2] = useState(false);
  const [showChart3, setShowChart3] = useState(false);
  const [showChart4, setShowChart4] = useState(false);
  const [showChart5, setShowChart5] = useState(false);

  // Keyboard navigation for presentation (Left / Right arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showAllSections) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        setCurrentStep(prev => Math.min(5, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setCurrentStep(prev => Math.max(1, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAllSections]);

  // Filter records for selected date
  const dayRecords = records.filter(r => r.date === selectedDate || r.isoDate === selectedDate);
  const dayShift = dayRecords.find(r => r.shiftType === 'DAY' || r.shiftType === 'LS');
  const nightShift = dayRecords.find(r => r.shiftType === 'NIGHT');

  // STEP 1: MANPOWER CALCULATIONS
  const staffPresent = dayRecords.reduce((acc, r) => acc + r.manpower.staff.shift, 0);
  const staffCuti = dayRecords.reduce((acc, r) => acc + r.manpower.staff.cuti, 0);
  const staffIzinSakit = dayRecords.reduce((acc, r) => acc + r.manpower.staff.izin + r.manpower.staff.sakit + r.manpower.staff.alpa, 0);
  const staffTotal = dayRecords.reduce((acc, r) => acc + r.manpower.staff.total, 0);

  const crewPresent = dayRecords.reduce((acc, r) => acc + r.manpower.crew.shift, 0);
  const crewBantuan = dayRecords.reduce((acc, r) => acc + r.manpower.crew.bantn, 0);
  const crewCuti = dayRecords.reduce((acc, r) => acc + r.manpower.crew.cuti, 0);
  const crewIzinSakit = dayRecords.reduce((acc, r) => acc + r.manpower.crew.izin + r.manpower.crew.sakit + r.manpower.crew.alpa, 0);
  const crewTotal = dayRecords.reduce((acc, r) => acc + r.manpower.crew.total, 0);

  // STEP 2: SAMPLE RECEIVED PER SECTION
  const gcShift = dayRecords.reduce((acc, r) => acc + r.sampleReceived.gc.shift, 0);
  const gcDay = dayRecords[dayRecords.length - 1]?.sampleReceived.gc.day || gcShift;
  const gcWkly = dayRecords[dayRecords.length - 1]?.sampleReceived.gc.wkly || 0;

  const prodShift = dayRecords.reduce((acc, r) => acc + r.sampleReceived.prod.shift, 0);
  const prodRc = dayRecords.reduce((acc, r) => acc + r.sampleReceived.prod.rc, 0);
  const prodDay = dayRecords[dayRecords.length - 1]?.sampleReceived.prod.day || prodShift;
  const prodWkly = dayRecords[dayRecords.length - 1]?.sampleReceived.prod.wkly || 0;

  const expShift = dayRecords.reduce((acc, r) => acc + r.sampleReceived.exp.shift, 0);
  const expDay = dayRecords[dayRecords.length - 1]?.sampleReceived.exp.day || expShift;
  const expWkly = dayRecords[dayRecords.length - 1]?.sampleReceived.exp.wkly || 0;

  const smelterShift = dayRecords.reduce((acc, r) => acc + r.sampleReceived.smelter.shift, 0);
  const smelterDay = dayRecords[dayRecords.length - 1]?.sampleReceived.smelter.day || smelterShift;
  const smelterWkly = dayRecords[dayRecords.length - 1]?.sampleReceived.smelter.wkly || 0;

  const totalReceivedShift = gcShift + prodShift + expShift + smelterShift;

  // STEP 3: PRODUCTIVITY PREPARASI (Balance, Received, Finished, Outstanding)
  // 3a. Press Powder
  const pressRecv = dayRecords.reduce((acc, r) => acc + r.pressPowder.received.shift, 0);
  const pressFin = dayRecords.reduce((acc, r) => acc + r.pressPowder.finish.shift, 0);
  const pressBal = Math.max(0, pressRecv - pressFin);

  // 3b. Weighing (Fuse Bead Weighing)
  const weighOs = dayRecords[0]?.fuseBead.osExp || 0;
  const weighRecv = expShift;
  const weighFin = dayRecords.reduce((acc, r) => acc + r.fuseBead.finishShift, 0);
  const weighBal = dayRecords[dayRecords.length - 1]?.fuseBead.balExp || 0;

  // 3c. Fusion (Fuse Bead Formation)
  const fusionBalAwal = weighOs;
  const fusionRecv = expShift;
  const fusionFin = weighFin;
  const fusionBalAkhir = weighBal;

  // 3d. LOI (Loss on Ignition)
  const loiOs = dayRecords[0]?.loi.os || 0;
  const loiW2 = dayRecords.reduce((acc, r) => acc + r.loi.w2, 0);
  const loiW4 = dayRecords.reduce((acc, r) => acc + r.loi.w4, 0);
  const loiW5 = dayRecords.reduce((acc, r) => acc + r.loi.w5, 0);
  const loiFin = dayRecords.reduce((acc, r) => acc + r.loi.finLoiShift, 0);
  const loiBal = dayRecords[dayRecords.length - 1]?.loi.bal || 0;

  // STEP 4: INSTRUMEN (EDXRF 6 alat & WDXRF 2 alat)
  // 4a. EDXRF 6 alat Epsilon (C, D, E, F, G, H) + S2 Puma
  const epsC = dayRecords.reduce((acc, r) => acc + r.edxrf.epsC, 0);
  const epsD = dayRecords.reduce((acc, r) => acc + r.edxrf.epsD, 0);
  const epsE = dayRecords.reduce((acc, r) => acc + r.edxrf.epsE, 0);
  const epsF = dayRecords.reduce((acc, r) => acc + r.edxrf.epsF, 0);
  const epsG = dayRecords.reduce((acc, r) => acc + r.edxrf.epsG, 0);
  const epsH = dayRecords.reduce((acc, r) => acc + r.edxrf.epsH, 0);
  const s2Puma = dayRecords.reduce((acc, r) => acc + r.edxrf.s2Puma, 0);
  const edxrfTotalFin = epsC + epsD + epsE + epsF + epsG + epsH + s2Puma;
  const edxrfBalAwal = pressFin;
  const edxrfRecv = pressRecv;
  const edxrfOutstanding = Math.max(0, edxrfRecv - edxrfTotalFin);

  // 4b. WDXRF 2 alat (Zetium A & Zetium B)
  const wdxrfBalAwal = dayRecords[0]?.wdxrf.osExp || 0;
  const wdxrfRecv = fusionFin;
  const ztmATotal = dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.total, 0);
  const ztmBTotal = dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.total, 0);
  const wdxrfTotalFin = ztmATotal + ztmBTotal;
  const wdxrfBalAkhir = dayRecords[dayRecords.length - 1]?.wdxrf.bal || 0;

  const ztmABreakdown = {
    prod: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.prod, 0),
    exp: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.exp, 0),
    smelt: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.smelt, 0),
    gts: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.gts, 0),
    rarr: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.rarr, 0),
    ver: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.ver, 0),
    std: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.std, 0),
    blank: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumA.blank, 0),
  };

  const ztmBBreakdown = {
    prod: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.prod, 0),
    exp: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.exp, 0),
    smelt: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.smelt, 0),
    gts: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.gts, 0),
    rarr: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.rarr, 0),
    ver: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.ver, 0),
    std: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.std, 0),
    blank: dayRecords.reduce((acc, r) => acc + r.wdxrf.zetiumB.blank, 0),
  };

  // STEP 5: QC DATA & REPORTING
  const qcBalAwal = dayRecords[0]?.qc.os || 0;
  const qcRecv = wdxrfTotalFin;
  const qcFin = dayRecords.reduce((acc, r) => acc + r.qc.finishShift, 0);
  const qcBalAkhir = dayRecords[dayRecords.length - 1]?.qc.bal || 0;

  const reportBalAwal = dayRecords[0]?.report.osReport || 0;
  const reportRecv = dayRecords.reduce((acc, r) => acc + r.report.received, 0);
  const reportFin = dayRecords.reduce((acc, r) => acc + r.report.finishReportDay, 0);
  const reportBalAkhir = dayRecords[dayRecords.length - 1]?.report.bal || 0;

  // Component Helper for Standardized 4-Pillar Card
  const StandardProductivityCard = ({
    title,
    subtitle,
    balance,
    received,
    finished,
    outstanding,
    icon: Icon,
    color = 'teal',
    detailSnippet
  }: {
    title: string;
    subtitle: string;
    balance: number;
    received: number;
    finished: number;
    outstanding: number;
    icon: any;
    color?: string;
    detailSnippet?: React.ReactNode;
  }) => {
    const isBottleneck = outstanding > 200;
    return (
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl bg-${color}-50 dark:bg-${color}-950/60 text-${color}-600 dark:text-${color}-400 border border-${color}-200/50`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight">{title}</h4>
              <p className="text-[11px] text-slate-500">{subtitle}</p>
            </div>
          </div>
          {isBottleneck ? (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-800 animate-pulse flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Backlog Tinggi
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Normal
            </span>
          )}
        </div>

        {/* 4 Standardized Metric Pillars */}
        <div className="grid grid-cols-4 gap-2 text-center">
          {/* 1. Balance Awal */}
          <div className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">Balance</span>
            <span className="text-base sm:text-lg font-black font-mono text-slate-700 dark:text-slate-300 mt-0.5 block">
              {formatNumber(balance)}
            </span>
            <span className="text-[9px] text-slate-400">Saldo Awal</span>
          </div>

          {/* 2. Received */}
          <div className="p-2.5 rounded-2xl bg-sky-50/50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40">
            <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 block uppercase tracking-wider">Received</span>
            <span className="text-base sm:text-lg font-black font-mono text-sky-700 dark:text-sky-300 mt-0.5 block">
              +{formatNumber(received)}
            </span>
            <span className="text-[9px] text-sky-500/70">Sampel Masuk</span>
          </div>

          {/* 3. Finished */}
          <div className="p-2.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider">Finished</span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-300 mt-0.5 block">
              {formatNumber(finished)}
            </span>
            <span className="text-[9px] text-emerald-500/70">Diselesaikan</span>
          </div>

          {/* 4. Outstanding (Balance Akhir) */}
          <div className={`p-2.5 rounded-2xl border ${
            isBottleneck 
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50' 
              : 'bg-teal-50/50 dark:bg-teal-950/30 border-teal-100 dark:border-teal-900/40'
          }`}>
            <span className={`text-[10px] font-semibold block uppercase tracking-wider ${isBottleneck ? 'text-rose-600 dark:text-rose-400' : 'text-teal-600 dark:text-teal-400'}`}>
              Outstanding
            </span>
            <span className={`text-base sm:text-lg font-black font-mono mt-0.5 block ${isBottleneck ? 'text-rose-700 dark:text-rose-300' : 'text-teal-700 dark:text-teal-300'}`}>
              {formatNumber(outstanding)}
            </span>
            <span className="text-[9px] text-slate-400">Sisa Saldo</span>
          </div>
        </div>

        {/* Optional Detail Snippet */}
        {detailSnippet && (
          <div className="pt-2 text-xs text-slate-500">
            {detailSnippet}
          </div>
        )}
      </div>
    );
  };

  const steps = [
    { num: 1, title: 'Manpower & SDM', desc: 'Kehadiran Staff & Crew', icon: Users },
    { num: 2, title: 'Sample Received', desc: 'GC, Prod, Exp, Smelter', icon: Layers },
    { num: 3, title: 'Productivity Preparasi', desc: 'Press, Weighing, Fusion, LOI', icon: Flame },
    { num: 4, title: 'Instrumen ED & WD', desc: '6 EDXRF + 2 WDXRF Zetium', icon: Cpu },
    { num: 5, title: 'QC & Pelaporan', desc: 'Kontrol Mutu & Rilis CoA', icon: FileCheck },
  ];

  return (
    <div className="space-y-6">
      
      {/* STEP PROGRESSION BAR */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                Alur Presentasi Terstruktur
              </span>
              <span className="text-xs text-slate-400">• Tanggal {selectedDate}</span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
              Rapat Harian Laboratorium (Storyline Runtun)
            </h3>
          </div>

          {/* Prev / Next & View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAllSections(!showAllSections)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showAllSections 
                  ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              {showAllSections ? 'Mode Slide Berurutan' : 'Lihat Semua 5 Babak Sekaligus'}
            </button>

            {!showAllSections && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  disabled={currentStep === 1}
                  onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                  title="Kembali ke langkah sebelumnya (Panah Kiri)"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold px-2 text-slate-700 dark:text-slate-200">
                  {currentStep} / 5
                </span>
                <button
                  disabled={currentStep === 5}
                  onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
                  title="Lanjut ke langkah berikutnya (Panah Kanan)"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 5 Step Indicator Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {steps.map(s => {
            const Icon = s.icon;
            const isActive = currentStep === s.num && !showAllSections;
            const isCompleted = currentStep > s.num && !showAllSections;
            return (
              <button
                key={s.num}
                onClick={() => {
                  setCurrentStep(s.num);
                  setShowAllSections(false);
                }}
                className={`p-2.5 rounded-2xl text-left border transition-all cursor-pointer flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20'
                    : isCompleted
                    ? 'bg-teal-50/60 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 border-teal-200 dark:border-teal-800'
                    : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className={`p-1.5 rounded-xl text-xs font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200/60 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">
                    {s.num}. {s.title}
                  </div>
                  <div className={`text-[10px] truncate ${isActive ? 'text-teal-100' : 'text-slate-400'}`}>
                    {s.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: MANPOWER & KESIAPAN SDM */}
      {/* ========================================================================= */}
      {(showAllSections || currentStep === 1) && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-teal-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                Kesiapan Manpower (Staff & Crew Teknisi Lab)
              </h3>
              <span className="text-xs text-slate-500">
                Total Personil: <strong>{staffPresent + crewPresent} Hadir</strong> / {staffTotal + crewTotal} Terdaftar
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRosterModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 text-xs font-bold cursor-pointer transition-all shadow-xs"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Detail Personil Roster</span>
              </button>
              <button
                onClick={() => setShowChart1(!showChart1)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  showChart1 
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>{showChart1 ? 'Tutup Grafik' : 'Grafik Tren Manpower'}</span>
              </button>
            </div>
          </div>

          {showChart1 && <ManpowerTrendChart records={records} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Staff Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Manpower Staff Laboratorium</h4>
                    <p className="text-xs text-slate-400">Chemist, Supervisor, QA Officer</p>
                  </div>
                </div>
                <span className="text-xl font-black font-mono text-teal-600 dark:text-teal-400">
                  {staffPresent} Hadir
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[10px] text-slate-500 block">Hadir Shift</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-base">{staffPresent}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                  <span className="text-[10px] text-slate-500 block">Cuti</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-base">{staffCuti}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                  <span className="text-[10px] text-slate-500 block">Izin / Sakit</span>
                  <span className="font-mono font-bold text-rose-700 dark:text-rose-400 text-base">{staffIzinSakit}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Total Staff</span>
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-base">{staffTotal}</span>
                </div>
              </div>
            </div>

            {/* Crew Card */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">Crew & Operator Teknis</h4>
                    <p className="text-xs text-slate-400">Preparator, Fusion Operator, Instrument Runner</p>
                  </div>
                </div>
                <span className="text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
                  {crewPresent} Hadir
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[10px] text-slate-500 block">Hadir Shift</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-base">{crewPresent}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40">
                  <span className="text-[10px] text-slate-500 block">Bantuan</span>
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-400 text-base">{crewBantuan}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40">
                  <span className="text-[10px] text-slate-500 block">Cuti</span>
                  <span className="font-mono font-bold text-amber-700 dark:text-amber-400 text-base">{crewCuti}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40">
                  <span className="text-[10px] text-slate-500 block">Izin / Sakit</span>
                  <span className="font-mono font-bold text-rose-700 dark:text-rose-400 text-base">{crewIzinSakit}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: SAMPLE RECEIVED PER SECTION */}
      {/* ========================================================================= */}
      {(showAllSections || currentStep === 2) && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                Sample Received Per Section (Penerimaan Sampel Masuk)
              </h3>
              <span className="text-xs text-slate-500">
                Total Masuk Hari Ini: <strong className="text-blue-600 font-mono text-sm">{formatNumber(totalReceivedShift)}</strong> sampel
              </span>
            </div>

            <button
              onClick={() => setShowChart2(!showChart2)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showChart2 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{showChart2 ? 'Tutup Grafik' : 'Grafik Tren Penerimaan'}</span>
            </button>
          </div>

          {showChart2 && <SampleReceivedTrendChart records={records} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Grade Control */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                  Grade Control (GC)
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {formatNumber(gcShift)}
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500">
                <span>Akumulasi Day: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(gcDay)}</strong></span>
                <span>Wkly: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(gcWkly)}</strong></span>
              </div>
            </div>

            {/* Production */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Production (PROD)
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                  {formatNumber(prodShift)}
                </span>
                {prodRc > 0 && (
                  <span className="text-xs text-amber-600 font-semibold">(+{prodRc} RC)</span>
                )}
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500">
                <span>Akumulasi Day: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(prodDay)}</strong></span>
                <span>Wkly: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(prodWkly)}</strong></span>
              </div>
            </div>

            {/* Exploration */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                  Exploration (EXP)
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {formatNumber(expShift)}
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500">
                <span>Akumulasi Day: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(expDay)}</strong></span>
                <span>Wkly: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(expWkly)}</strong></span>
              </div>
            </div>

            {/* Smelter */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                  Smelter
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              </div>
              <div className="text-2xl sm:text-3xl font-black font-mono text-slate-900 dark:text-white">
                {formatNumber(smelterShift)}
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between text-xs text-slate-500">
                <span>Akumulasi Day: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(smelterDay)}</strong></span>
                <span>Wkly: <strong className="font-mono text-slate-700 dark:text-slate-300">{formatNumber(smelterWkly)}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: PRODUCTIVITY PREPARASI (Standardized 4 Pillars) */}
      {/* ========================================================================= */}
      {(showAllSections || currentStep === 3) && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                Productivity Section Preparasi (Press Powder, Weighing, Fusion, LOI)
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Skema: Balance ➔ Received ➔ Finished ➔ Outstanding
              </span>
            </div>

            <button
              onClick={() => setShowChart3(!showChart3)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showChart3 
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{showChart3 ? 'Tutup Grafik' : 'Grafik Tren Preparasi & Backlog'}</span>
            </button>
          </div>

          {showChart3 && <ProductivityPrepTrendChart records={records} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 3a. Press Powder */}
            <StandardProductivityCard
              title="Press Powder (Pellet)"
              subtitle="Pencetakan pelet serbuk untuk instrumen EDXRF cepat"
              balance={0}
              received={pressRecv}
              finished={pressFin}
              outstanding={pressBal}
              icon={Flame}
              color="sky"
              detailSnippet={
                <span>Rata-rata throughput pelet tercapai {pressFin} unit per shift.</span>
              }
            />

            {/* 3b. Weighing */}
            <StandardProductivityCard
              title="Weighing (Penimbangan)"
              subtitle="Penimbangan akurat sampel eksplorasi untuk peleburan"
              balance={weighOs}
              received={weighRecv}
              finished={weighFin}
              outstanding={weighBal}
              icon={Gauge}
              color="amber"
              detailSnippet={
                <span>Antrean penimbangan berkurang menjadi <strong>{weighBal}</strong> sampel eksplorasi.</span>
              }
            />

            {/* 3c. Fusion (Fuse Bead) */}
            <StandardProductivityCard
              title="Fusion (Bead Peleburan)"
              subtitle="Peleburan manik borat kaca suhu tinggi untuk WDXRF presisi"
              balance={fusionBalAwal}
              received={fusionRecv}
              finished={fusionFin}
              outstanding={fusionBalAkhir}
              icon={Flame}
              color="orange"
              detailSnippet={
                <span>Kecepatan fusion menyeimbangi output penimbangan ({fusionFin} manik selesai).</span>
              }
            />

            {/* 3d. LOI (Loss on Ignition) */}
            <StandardProductivityCard
              title="LOI (Loss on Ignition)"
              subtitle="Pengabuan suhu tinggi furnace workstation W2, W4, W5"
              balance={loiOs}
              received={expShift}
              finished={loiFin}
              outstanding={loiBal}
              icon={Flame}
              color="purple"
              detailSnippet={
                <div className="flex gap-4 pt-1 font-mono text-[11px]">
                  <span>W2: <strong>{loiW2}</strong></span>
                  <span>W4: <strong>{loiW4}</strong></span>
                  <span>W5: <strong>{loiW5}</strong></span>
                  <span className="text-slate-400">| Sisa Saldo: <strong>{loiBal}</strong></span>
                </div>
              }
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 4: INSTRUMEN EDXRF (6 ALAT) & WDXRF (2 ALAT) */}
      {/* ========================================================================= */}
      {(showAllSections || currentStep === 4) && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-xs font-bold">4</span>
                Penjabaran Instrumen (EDXRF 6 Alat & WDXRF 2 Alat)
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Skema: Balance ➔ Received ➔ Finished ➔ Outstanding
              </span>
            </div>

            <button
              onClick={() => setShowChart4(!showChart4)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showChart4 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{showChart4 ? 'Tutup Grafik' : 'Grafik Tren Spektrometri XRF'}</span>
            </button>
          </div>

          {showChart4 && <XrfInstrumentsTrendChart records={records} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 4a. EDXRF (6 Alat Epsilon C-H + S2 Puma) */}
            <div className="space-y-4">
              <StandardProductivityCard
                title="EDXRF Group (6 Unit Mesin)"
                subtitle="Energy Dispersive XRF: Epsilon C, D, E, F, G, H (+ Bruker Puma)"
                balance={edxrfBalAwal}
                received={edxrfRecv}
                finished={edxrfTotalFin}
                outstanding={edxrfOutstanding}
                icon={Cpu}
                color="teal"
              />

              {/* Rincian 6 Alat Epsilon */}
              <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  Rincian Pembacaan Per-Mesin EDXRF:
                </span>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">EPS C</span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">{epsC}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">EPS D</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-sm">{epsD}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">EPS E</span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">{epsE}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">EPS F</span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">{epsF}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">EPS G</span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">{epsG}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">EPS H</span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-sm">{epsH}</span>
                  </div>
                </div>
                {s2Puma > 0 && (
                  <div className="text-[11px] text-slate-500 flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>Bruker S2 PUMA:</span>
                    <span className="font-mono font-bold text-amber-600">{s2Puma} run</span>
                  </div>
                )}
              </div>
            </div>

            {/* 4b. WDXRF (2 Alat: Zetium A & Zetium B) */}
            <div className="space-y-4">
              <StandardProductivityCard
                title="WDXRF Group (2 Unit Zetium)"
                subtitle="Wavelength Dispersive XRF: Zetium A & Zetium B"
                balance={wdxrfBalAwal}
                received={wdxrfRecv}
                finished={wdxrfTotalFin}
                outstanding={wdxrfBalAkhir}
                icon={Cpu}
                color="indigo"
              />

              {/* Rincian 2 Alat Zetium A & B */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Zetium A */}
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Zetium A</span>
                    <span className="text-sm font-black font-mono text-slate-800 dark:text-white">{ztmATotal} run</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="flex justify-between"><span>Prod:</span><strong className="font-mono">{ztmABreakdown.prod}</strong></div>
                    <div className="flex justify-between"><span>Exp:</span><strong className="font-mono text-purple-600">{ztmABreakdown.exp}</strong></div>
                    <div className="flex justify-between"><span>Smelt:</span><strong className="font-mono">{ztmABreakdown.smelt}</strong></div>
                    <div className="flex justify-between"><span>RA/RR:</span><strong className="font-mono text-amber-600">{ztmABreakdown.rarr}</strong></div>
                    <div className="flex justify-between"><span>Ver:</span><strong className="font-mono text-emerald-600">{ztmABreakdown.ver}</strong></div>
                    <div className="flex justify-between"><span>Std/Blk:</span><strong className="font-mono">{ztmABreakdown.std + ztmABreakdown.blank}</strong></div>
                  </div>
                </div>

                {/* Zetium B */}
                <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Zetium B</span>
                    <span className="text-sm font-black font-mono text-slate-800 dark:text-white">{ztmBTotal} run</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    <div className="flex justify-between"><span>Prod:</span><strong className="font-mono">{ztmBBreakdown.prod}</strong></div>
                    <div className="flex justify-between"><span>Exp:</span><strong className="font-mono text-purple-600">{ztmBBreakdown.exp}</strong></div>
                    <div className="flex justify-between"><span>Smelt:</span><strong className="font-mono">{ztmBBreakdown.smelt}</strong></div>
                    <div className="flex justify-between"><span>RA/RR:</span><strong className="font-mono text-amber-600">{ztmBBreakdown.rarr}</strong></div>
                    <div className="flex justify-between"><span>Ver:</span><strong className="font-mono text-emerald-600">{ztmBBreakdown.ver}</strong></div>
                    <div className="flex justify-between"><span>Std/Blk:</span><strong className="font-mono">{ztmBBreakdown.std + ztmBBreakdown.blank}</strong></div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 5: QC DATA & REPORTING (Standardized 4 Pillars) */}
      {/* ========================================================================= */}
      {(showAllSections || currentStep === 5) && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">5</span>
                QC Data & Reporting (Kontrol Mutu & Rilis CoA Eksplorasi)
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Skema: Balance ➔ Received ➔ Finished ➔ Outstanding
              </span>
            </div>

            <button
              onClick={() => setShowChart5(!showChart5)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                showChart5 
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{showChart5 ? 'Tutup Grafik' : 'Grafik Tren QC & CoA'}</span>
            </button>
          </div>

          {showChart5 && <QcReportingTrendChart records={records} />}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 5a. QC Data */}
            <StandardProductivityCard
              title="QC Data (Exploration Quality Check)"
              subtitle="Verifikasi validasi kalibrasi & duplicate check spektrometri"
              balance={qcBalAwal}
              received={qcRecv}
              finished={qcFin}
              outstanding={qcBalAkhir}
              icon={ShieldCheck}
              color="teal"
              detailSnippet={
                <span>Total verifikasi selesai: <strong>{qcFin} sampel</strong>. Sisa saldo verifikasi: <strong>{qcBalAkhir}</strong>.</span>
              }
            />

            {/* 5b. Reporting */}
            <StandardProductivityCard
              title="Reporting (Penerbitan Hasil / CoA)"
              subtitle="Pelepasan resmi laporan analisis Certificate of Analysis"
              balance={reportBalAwal}
              received={reportRecv}
              finished={reportFin}
              outstanding={reportBalAkhir}
              icon={FileCheck}
              color="emerald"
              detailSnippet={
                <div className="flex items-center justify-between pt-1">
                  <span>Hasil Selesai Dirilis: <strong className="text-emerald-600 font-mono">{reportFin}</strong></span>
                  <span>Sisa Pending: <strong className="font-mono">{reportBalAkhir}</strong></span>
                </div>
              }
            />
          </div>
        </div>
      )}

      {/* Bottom Floating Navigation for Slide Flow */}
      {!showAllSections && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <button
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer shadow-xs transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Babak Sebelumnya</span>
          </button>

          <span className="text-xs text-slate-400 font-medium">
            Gunakan tombol panah keyboard ◄ ► untuk beralih babak presentasi
          </span>

          <button
            disabled={currentStep === 5}
            onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
            className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed shadow-md shadow-teal-500/20 cursor-pointer transition-all"
          >
            <span>Lanjut ke Babak {currentStep < 5 ? currentStep + 1 : 5}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Manpower Roster Detailed List Modal */}
      <DailyPerformanceManpowerRosterModal
        isOpen={showRosterModal}
        onClose={() => setShowRosterModal(false)}
        selectedDate={selectedDate}
      />
    </div>
  );
};
