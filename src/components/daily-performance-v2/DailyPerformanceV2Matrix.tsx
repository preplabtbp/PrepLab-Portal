import React, { useState, useMemo } from 'react';
import { 
  Users, Layers, Flame, Cpu, FileCheck, CheckCircle2, 
  AlertTriangle, ChevronDown, ChevronRight, Eye, 
  Sparkles, Filter, ArrowRight, Zap, RefreshCw, BarChart2
} from 'lucide-react';
import { DailyPerformanceRecord, ShiftType } from './daily-performance-v2-types';
import { 
  formatNumber, 
  formatShiftName, 
  getShiftScheduleLabel, 
  calculateMonthlyPeaks 
} from './daily-performance-v2-utils';
import { DailyPerformanceV2InBarCell } from './DailyPerformanceV2InBarCell';

interface DailyPerformanceV2MatrixProps {
  records: DailyPerformanceRecord[];
  selectedDate: string;
  userPt?: string;
}

export const DailyPerformanceV2Matrix: React.FC<DailyPerformanceV2MatrixProps> = ({
  records,
  selectedDate,
  userPt = 'TBP'
}) => {
  // Filter records for the selected date
  const recordsForDate = useMemo(() => {
    return records.filter(r => r.date === selectedDate);
  }, [records, selectedDate]);

  // Check if it's Long Shift (Sunday)
  const isLongShift = useMemo(() => {
    return recordsForDate.some(r => r.shiftType === 'LS');
  }, [recordsForDate]);

  // Primary records for Day / Night or LS
  const dayRecord = useMemo(() => {
    return recordsForDate.find(r => r.shiftType === 'DAY' || r.shiftType === 'LS');
  }, [recordsForDate]);

  const nightRecord = useMemo(() => {
    if (isLongShift) return null;
    return recordsForDate.find(r => r.shiftType === 'NIGHT');
  }, [recordsForDate, isLongShift]);

  // Monthly peaks for in-bar micro metrics
  const peaks = useMemo(() => {
    const isoDate = dayRecord?.isoDate || '2026-10-01';
    return calculateMonthlyPeaks(records, isoDate);
  }, [records, dayRecord]);

  // State to toggle clusters (all expanded by default)
  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({
    manpower: true,
    received: true,
    prep: true,
    edxrf: true,
    wdxrf: true,
    qc_report: true
  });

  const toggleCluster = (key: string) => {
    setExpandedClusters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    setExpandedClusters({
      manpower: true,
      received: true,
      prep: true,
      edxrf: true,
      wdxrf: true,
      qc_report: true
    });
  };

  const collapseAll = () => {
    setExpandedClusters({
      manpower: false,
      received: false,
      prep: false,
      edxrf: false,
      wdxrf: false,
      qc_report: false
    });
  };

  if (!dayRecord) {
    return (
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-white">Data Belum Tersedia</h3>
        <p className="text-xs text-slate-500">
          Tidak ditemukan logbook kinerja untuk tanggal {selectedDate}. Silakan pilih tanggal lain dari pemilih tanggal di atas.
        </p>
      </div>
    );
  }

  const shiftDayName = formatShiftName(dayRecord.regu);
  const shiftNightName = nightRecord ? formatShiftName(nightRecord.regu) : '-';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER BANNER & CONTROLS */}
      <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
              Matriks Neraca 360° (Smart Cockpit)
            </span>
            {isLongShift ? (
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                HARI MINGGU • 1 TABEL TUNGGAL LONG SHIFT (07:00 - 24:00 WITA)
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Mode Komparasi 2 Shift (Day 07-19 vs Night 19-07)
              </span>
            )}
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1 flex items-center gap-2">
            Neraca Komprehensif Operasional Laboratorium
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Solusi cerdas pengganti scroll 80 kolom Excel: Semua stasiun terstruktur vertikal dengan micro visual progress bar volume bulanan.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Buka Semua
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
          >
            Tutup Semua
          </button>
        </div>
      </div>

      {/* CLUSTER 1: MANPOWER & SDM */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
        <button
          onClick={() => toggleCluster('manpower')}
          className="w-full px-5 py-4 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">Kluster 1</span>
                <span className="text-xs text-slate-400">• Total Personil Bertugas</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                SDM, Kehadiran Staff & Crew Shift
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              {dayRecord.manpower.staff.shift + dayRecord.manpower.crew.shift + (nightRecord ? nightRecord.manpower.staff.shift + nightRecord.manpower.crew.shift : 0)} Hadir
            </span>
            {expandedClusters.manpower ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
          </div>
        </button>

        {expandedClusters.manpower && (
          <div className="p-5 space-y-4">
            <div className={`grid gap-4 ${isLongShift ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
              
              {/* Card Shift Pagi (atau Long Shift) */}
              <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">
                      {isLongShift ? `${shiftDayName} • LONG SHIFT (07:00 - 24:00 WITA)` : `${shiftDayName} • DAY (07:00 - 19:00 WITA)`}
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50">
                    {dayRecord.manpower.staff.shift + dayRecord.manpower.crew.shift} / {dayRecord.manpower.staff.total + dayRecord.manpower.crew.total} Orang
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Staff Hadir</span>
                    <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-100">{dayRecord.manpower.staff.shift}</span>
                    <span className="text-[9px] text-slate-400 block">dari {dayRecord.manpower.staff.total}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Crew Hadir</span>
                    <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-100">{dayRecord.manpower.crew.shift}</span>
                    <span className="text-[9px] text-slate-400 block">dari {dayRecord.manpower.crew.total}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Bantuan / Lab</span>
                    <span className="text-sm font-black font-mono text-teal-600 dark:text-teal-400">+{dayRecord.manpower.crew.bantn || 0}</span>
                    <span className="text-[9px] text-slate-400 block">{dayRecord.manpower.crew.lab || 0} lab</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-medium">Cuti / Izin / Sakit</span>
                    <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">
                      {dayRecord.manpower.staff.cuti + dayRecord.manpower.crew.cuti + 
                       dayRecord.manpower.staff.izin + dayRecord.manpower.crew.izin + 
                       dayRecord.manpower.staff.sakit + dayRecord.manpower.crew.sakit}
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      C:{dayRecord.manpower.staff.cuti + dayRecord.manpower.crew.cuti} • I:{dayRecord.manpower.staff.izin + dayRecord.manpower.crew.izin} • S:{dayRecord.manpower.staff.sakit + dayRecord.manpower.crew.sakit}
                    </span>
                  </div>
                </div>

                {/* Keterangan nama personel yang tidak masuk jika ada */}
                {dayRecord.manpowerNotes && (
                  <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/50 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-amber-800 dark:text-amber-400">Keterangan Personel: </span>
                    {dayRecord.manpowerNotes}
                  </div>
                )}
              </div>

              {/* Card Shift Malam: HANYA DITAMPILKAN JIKA BUKAN HARI LONG SHIFT */}
              {!isLongShift && nightRecord && (
                <div className="p-4 rounded-2xl bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-200/70 dark:border-indigo-900/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 dark:text-indigo-200">
                        {shiftNightName} • NIGHT (19:00 - 07:00 WITA)
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50">
                      {nightRecord.manpower.staff.shift + nightRecord.manpower.crew.shift} / {nightRecord.manpower.staff.total + nightRecord.manpower.crew.total} Orang
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Staff Hadir</span>
                      <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-100">{nightRecord.manpower.staff.shift}</span>
                      <span className="text-[9px] text-slate-400 block">dari {nightRecord.manpower.staff.total}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Crew Hadir</span>
                      <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-100">{nightRecord.manpower.crew.shift}</span>
                      <span className="text-[9px] text-slate-400 block">dari {nightRecord.manpower.crew.total}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Bantuan / Lab</span>
                      <span className="text-sm font-black font-mono text-teal-600 dark:text-teal-400">+{nightRecord.manpower.crew.bantn || 0}</span>
                      <span className="text-[9px] text-slate-400 block">{nightRecord.manpower.crew.lab || 0} lab</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400 block font-medium">Cuti / Izin / Sakit</span>
                      <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400">
                        {nightRecord.manpower.staff.cuti + nightRecord.manpower.crew.cuti + 
                         nightRecord.manpower.staff.izin + nightRecord.manpower.crew.izin + 
                         nightRecord.manpower.staff.sakit + nightRecord.manpower.crew.sakit}
                      </span>
                      <span className="text-[9px] text-slate-400 block">
                        C:{nightRecord.manpower.staff.cuti + nightRecord.manpower.crew.cuti} • I:{nightRecord.manpower.staff.izin + nightRecord.manpower.crew.izin} • S:{nightRecord.manpower.staff.sakit + nightRecord.manpower.crew.sakit}
                      </span>
                    </div>
                  </div>

                  {nightRecord.manpowerNotes && (
                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-indigo-200/50 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                      <span className="font-bold text-indigo-800 dark:text-indigo-400">Keterangan Personel: </span>
                      {nightRecord.manpowerNotes}
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* CLUSTER 2: PENERIMAAN SAMPEL (SAMPLE RECEIVED) */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
        <button
          onClick={() => toggleCluster('received')}
          className="w-full px-5 py-4 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Kluster 2</span>
                <span className="text-xs text-slate-400">• Hulu Alur Proses</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Penerimaan Sampel (Sample Received by Source)
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-sky-700 dark:text-sky-300 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 font-mono">
              +{formatNumber(dayRecord.sampleReceived.gc.shift + dayRecord.sampleReceived.prod.shift + dayRecord.sampleReceived.exp.shift + dayRecord.sampleReceived.smelter.shift + (nightRecord ? nightRecord.sampleReceived.gc.shift + nightRecord.sampleReceived.prod.shift + nightRecord.sampleReceived.exp.shift + nightRecord.sampleReceived.smelter.shift : 0))} Sampel
            </span>
            {expandedClusters.received ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
          </div>
        </button>

        {expandedClusters.received && (
          <div className="p-5 space-y-4">
            {/* Table Matrix Header */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Kategori Sumber Sampel</th>
                    <th className="py-2.5 px-3">
                      {isLongShift ? `Long Shift (07:00 - 24:00 WITA)` : `Day Shift (${shiftDayName})`}
                    </th>
                    {!isLongShift && (
                      <th className="py-2.5 px-3">
                        Night Shift ({shiftNightName})
                      </th>
                    )}
                    <th className="py-2.5 px-3">Total 24 Jam (Hari Ini)</th>
                    <th className="py-2.5 px-3">Akumulasi Mingguan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {/* GC */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2"></span>
                      Grade Control (GC - Pit Tambang)
                    </td>
                    <td className="py-3 px-3">
                      <DailyPerformanceV2InBarCell
                        value={dayRecord.sampleReceived.gc.shift}
                        maxValue={peaks.maxReceivedGc}
                        colorVariant="emerald"
                        unit="spl"
                        size="sm"
                      />
                    </td>
                    {!isLongShift && (
                      <td className="py-3 px-3">
                        <DailyPerformanceV2InBarCell
                          value={nightRecord?.sampleReceived.gc.shift || 0}
                          maxValue={peaks.maxReceivedGc}
                          colorVariant="indigo"
                          unit="spl"
                          size="sm"
                        />
                      </td>
                    )}
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      +{formatNumber(dayRecord.sampleReceived.gc.day)} spl
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                      {formatNumber(dayRecord.sampleReceived.gc.wkly)} spl
                    </td>
                  </tr>

                  {/* PROD */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-sky-500 mr-2"></span>
                      Produksi & RC (Resource / Check)
                    </td>
                    <td className="py-3 px-3">
                      <DailyPerformanceV2InBarCell
                        value={dayRecord.sampleReceived.prod.shift}
                        maxValue={peaks.maxReceivedProd}
                        colorVariant="sky"
                        unit="spl"
                        size="sm"
                      />
                    </td>
                    {!isLongShift && (
                      <td className="py-3 px-3">
                        <DailyPerformanceV2InBarCell
                          value={nightRecord?.sampleReceived.prod.shift || 0}
                          maxValue={peaks.maxReceivedProd}
                          colorVariant="indigo"
                          unit="spl"
                          size="sm"
                        />
                      </td>
                    )}
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      +{formatNumber(dayRecord.sampleReceived.prod.day)} spl
                      {dayRecord.sampleReceived.prod.rc > 0 && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] bg-sky-100 text-sky-800 font-bold">
                          {dayRecord.sampleReceived.prod.rc} RC
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                      {formatNumber(dayRecord.sampleReceived.prod.wkly)} spl
                    </td>
                  </tr>

                  {/* EXP */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500 mr-2"></span>
                      Eksplorasi (EXP Bor)
                    </td>
                    <td className="py-3 px-3">
                      <DailyPerformanceV2InBarCell
                        value={dayRecord.sampleReceived.exp.shift}
                        maxValue={peaks.maxReceivedExp}
                        colorVariant="amber"
                        unit="spl"
                        size="sm"
                      />
                    </td>
                    {!isLongShift && (
                      <td className="py-3 px-3">
                        <DailyPerformanceV2InBarCell
                          value={nightRecord?.sampleReceived.exp.shift || 0}
                          maxValue={peaks.maxReceivedExp}
                          colorVariant="indigo"
                          unit="spl"
                          size="sm"
                        />
                      </td>
                    )}
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      +{formatNumber(dayRecord.sampleReceived.exp.day)} spl
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                      {formatNumber(dayRecord.sampleReceived.exp.wkly)} spl
                    </td>
                  </tr>

                  {/* SMELTER */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-purple-500 mr-2"></span>
                      Smelter HPL
                    </td>
                    <td className="py-3 px-3">
                      <DailyPerformanceV2InBarCell
                        value={dayRecord.sampleReceived.smelter.shift}
                        maxValue={peaks.maxReceivedSmelter}
                        colorVariant="purple"
                        unit="spl"
                        size="sm"
                      />
                    </td>
                    {!isLongShift && (
                      <td className="py-3 px-3">
                        <DailyPerformanceV2InBarCell
                          value={nightRecord?.sampleReceived.smelter.shift || 0}
                          maxValue={peaks.maxReceivedSmelter}
                          colorVariant="indigo"
                          unit="spl"
                          size="sm"
                        />
                      </td>
                    )}
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                      +{formatNumber(dayRecord.sampleReceived.smelter.day)} spl
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                      {formatNumber(dayRecord.sampleReceived.smelter.wkly)} spl
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* CLUSTER 3: PREPARASI FISIK & PRODUKTIVITAS */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
        <button
          onClick={() => toggleCluster('prep')}
          className="w-full px-5 py-4 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Kluster 3</span>
                <span className="text-xs text-slate-400">• Inti Pengolahan Fisik</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Produktivitas Preparasi (Press Powder, Fusion Bead & LOI)
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 font-mono">
              {formatNumber(dayRecord.pressPowder.finish.shift + (nightRecord?.pressPowder.finish.shift || 0))} Pellet Diselesaikan
            </span>
            {expandedClusters.prep ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
          </div>
        </button>

        {expandedClusters.prep && (
          <div className="p-5 space-y-6">
            
            {/* Sub-Stasiun 1: Press Powder Pellet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                  1. Press Powder Pellet (Sampel Bubuk Padat)
                </span>
                <span className="font-mono text-slate-400">
                  Total Hari Ini: {formatNumber(dayRecord.pressPowder.finish.day)} Selesai
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Penerimaan Pellet</span>
                  <div className="mt-1">
                    <DailyPerformanceV2InBarCell
                      value={dayRecord.pressPowder.received.shift + (nightRecord?.pressPowder.received.shift || 0)}
                      maxValue={peaks.maxReceived}
                      colorVariant="sky"
                      prefix="+"
                      unit="spl"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                    <span>{isLongShift ? `LS: +${dayRecord.pressPowder.received.shift}` : `D: +${dayRecord.pressPowder.received.shift} • N: +${nightRecord?.pressPowder.received.shift || 0}`}</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Selesai Dicetak (Finish)</span>
                  <div className="mt-1">
                    <DailyPerformanceV2InBarCell
                      value={dayRecord.pressPowder.finish.shift + (nightRecord?.pressPowder.finish.shift || 0)}
                      maxValue={peaks.maxPressFinish}
                      colorVariant="emerald"
                      unit="spl"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[9px] text-emerald-700 dark:text-emerald-400 font-mono">
                    <span>{isLongShift ? `LS: ${dayRecord.pressPowder.finish.shift}` : `D: ${dayRecord.pressPowder.finish.shift} • N: ${nightRecord?.pressPowder.finish.shift || 0}`}</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Akumulasi Mingguan</span>
                  <div className="mt-1">
                    <DailyPerformanceV2InBarCell
                      value={dayRecord.pressPowder.finish.wkly}
                      maxValue={peaks.maxPressFinish * 7}
                      colorVariant="slate"
                      unit="spl"
                    />
                  </div>
                  <div className="mt-1 text-[9px] text-slate-400 font-mono">Minggu ke-{dayRecord.week}</div>
                </div>

                <div className="p-3 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-900/40 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider block">Status Stasiun Press</span>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1 block">
                      {(dayRecord.pressPowder.finish.shift + (nightRecord?.pressPowder.finish.shift || 0)) >= (dayRecord.pressPowder.received.shift + (nightRecord?.pressPowder.received.shift || 0)) ? 'Melampaui Target' : 'Dalam Pengendalian'}
                    </span>
                  </div>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium mt-1">
                    Throughput: {Math.round(((dayRecord.pressPowder.finish.shift + (nightRecord?.pressPowder.finish.shift || 0)) / Math.max(1, (dayRecord.pressPowder.received.shift + (nightRecord?.pressPowder.received.shift || 0)))) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-Stasiun 2: Weighing & Fusion Bead */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  2. Weighing Borat Flux & Fusion Bead (Manik Kaca)
                </span>
                <span className="font-mono text-slate-400">
                  Saldo Akhir (Bal): {isLongShift ? dayRecord.fuseBead.balExp : (nightRecord?.fuseBead.balExp || dayRecord.fuseBead.balExp)} spl
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Awal (O/S EXP)</span>
                  <div className="mt-1">
                    <DailyPerformanceV2InBarCell
                      value={dayRecord.fuseBead.osExp}
                      maxValue={peaks.maxFusionFinish * 2}
                      colorVariant="amber"
                      unit="spl"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Selesai Dilebur (Finish)</span>
                  <div className="mt-1">
                    <DailyPerformanceV2InBarCell
                      value={dayRecord.fuseBead.finishShift + (nightRecord?.fuseBead.finishShift || 0)}
                      maxValue={peaks.maxFusionFinish}
                      colorVariant="emerald"
                      unit="spl"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[9px] text-emerald-700 dark:text-emerald-400 font-mono">
                    <span>{isLongShift ? `LS: ${dayRecord.fuseBead.finishShift}` : `D: ${dayRecord.fuseBead.finishShift} • N: ${nightRecord?.fuseBead.finishShift || 0}`}</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Finish 24 Jam & Mingguan</span>
                  <div className="mt-1">
                    <DailyPerformanceV2InBarCell
                      value={dayRecord.fuseBead.finishDay}
                      maxValue={peaks.maxFusionFinish * 1.5}
                      colorVariant="slate"
                      unit="spl"
                    />
                  </div>
                  <div className="mt-1 text-[9px] text-slate-400 font-mono">Wkly: {formatNumber(dayRecord.fuseBead.finishWkly)} spl</div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">Sisa Saldo (Bal EXP)</span>
                    <span className="text-base font-black font-mono text-amber-900 dark:text-amber-200 mt-1 block">
                      {formatNumber(isLongShift ? dayRecord.fuseBead.balExp : (nightRecord?.fuseBead.balExp || dayRecord.fuseBead.balExp))} spl
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-1">
                    {dayRecord.fuseBead.balExp > 150 ? 'Antrean Cukup Tinggi' : 'Antrean Terkendali'}
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-Stasiun 3: LOI Gravimetri (Furnace W2, W4, W5) */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  3. LOI Gravimetri (Loss On Ignition • Muffle Furnace)
                </span>
                <span className="font-mono text-slate-400">
                  Furnace W2: {dayRecord.loi.w2} • W4: {dayRecord.loi.w4} • W5: {dayRecord.loi.w5}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Awal (O/S LOI)</span>
                  <div className="mt-1">
                    <DailyPerformanceV2InBarCell
                      value={dayRecord.loi.os}
                      maxValue={peaks.maxLoiFinish * 2}
                      colorVariant="rose"
                      unit="spl"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40">
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Selesai LOI (Finish)</span>
                  <div className="mt-1">
                    <DailyPerformanceV2InBarCell
                      value={dayRecord.loi.finLoiShift + (nightRecord?.loi.finLoiShift || 0)}
                      maxValue={peaks.maxLoiFinish}
                      colorVariant="emerald"
                      unit="spl"
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[9px] text-emerald-700 dark:text-emerald-400 font-mono">
                    <span>{isLongShift ? `LS: ${dayRecord.loi.finLoiShift}` : `D: ${dayRecord.loi.finLoiShift} • N: ${nightRecord?.loi.finLoiShift || 0}`}</span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Akumulasi 24 Jam & Mingguan</span>
                  <div className="mt-1">
                    <DailyPerformanceV2InBarCell
                      value={dayRecord.loi.finLoiDay}
                      maxValue={peaks.maxLoiFinish * 1.5}
                      colorVariant="slate"
                      unit="spl"
                    />
                  </div>
                  <div className="mt-1 text-[9px] text-slate-400 font-mono">Wkly: {formatNumber(dayRecord.loi.finLoiWkly)} spl</div>
                </div>

                <div className="p-3 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">Sisa Saldo LOI (Bal)</span>
                    <span className="text-base font-black font-mono text-rose-900 dark:text-rose-200 mt-1 block">
                      {formatNumber(isLongShift ? dayRecord.loi.bal : (nightRecord?.loi.bal || dayRecord.loi.bal))} spl
                    </span>
                  </div>
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-1">
                    {dayRecord.loi.bal > 150 ? 'Perhatian Kapasitas Furnace' : 'Kapasitas Furnace Normal'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* CLUSTER 4 & 5: SPEKTROMETRI INSTRUMEN (EDXRF & WDXRF) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* EDXRF */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Kluster 4</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">EDXRF Fleet (6 Mesin Epsilon + Puma)</h3>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800">
              {dayRecord.edxrf.shift + (nightRecord?.edxrf.shift || 0)} Runs
            </span>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Epsilon C</span>
                <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">{dayRecord.edxrf.epsC || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Epsilon D</span>
                <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">{dayRecord.edxrf.epsD || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Epsilon E</span>
                <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">{dayRecord.edxrf.epsE || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Epsilon F</span>
                <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">{dayRecord.edxrf.epsF || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Epsilon G</span>
                <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">{dayRecord.edxrf.epsG || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">Epsilon H</span>
                <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">{dayRecord.edxrf.epsH || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 block font-medium">S2 Puma</span>
                <span className="text-xs font-bold font-mono text-slate-800 dark:text-slate-100">{dayRecord.edxrf.s2Puma || 0}</span>
              </div>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 font-bold">
                <span className="text-[10px] text-purple-600 dark:text-purple-400 block">Total Shift</span>
                <span className="text-xs font-black font-mono text-purple-800 dark:text-purple-200">{dayRecord.edxrf.shift}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Total 24 Jam (Hari Ini):</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{formatNumber(dayRecord.edxrf.day)} runs</span>
            </div>
          </div>
        </div>

        {/* WDXRF */}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Kluster 5</span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">WDXRF (Zetium A & B • Manik Borat)</h3>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
              {(dayRecord.wdxrf.zetiumA.total || 0) + (dayRecord.wdxrf.zetiumB.total || 0)} Runs
            </span>
          </div>

          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              
              {/* Zetium A */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-indigo-900 dark:text-indigo-200">
                  <span>Zetium A (Utama)</span>
                  <span className="font-mono">{dayRecord.wdxrf.zetiumA.total || 0} spl</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between"><span>Produksi:</span><span className="font-mono font-bold">{dayRecord.wdxrf.zetiumA.prod || 0}</span></div>
                  <div className="flex justify-between"><span>Eksplorasi:</span><span className="font-mono font-bold">{dayRecord.wdxrf.zetiumA.exp || 0}</span></div>
                  <div className="flex justify-between"><span>Smelter:</span><span className="font-mono font-bold">{dayRecord.wdxrf.zetiumA.smelt || 0}</span></div>
                  <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-bold">
                    <span>PT GTS (Sister Site):</span>
                    <span className="font-mono">{dayRecord.wdxrf.zetiumA.gts || 0}</span>
                  </div>
                </div>
              </div>

              {/* Zetium B */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between font-bold text-indigo-900 dark:text-indigo-200">
                  <span>Zetium B (Cadangan/Parallel)</span>
                  <span className="font-mono">{dayRecord.wdxrf.zetiumB.total || 0} spl</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex justify-between"><span>Produksi:</span><span className="font-mono font-bold">{dayRecord.wdxrf.zetiumB.prod || 0}</span></div>
                  <div className="flex justify-between"><span>Eksplorasi:</span><span className="font-mono font-bold">{dayRecord.wdxrf.zetiumB.exp || 0}</span></div>
                  <div className="flex justify-between"><span>Smelter:</span><span className="font-mono font-bold">{dayRecord.wdxrf.zetiumB.smelt || 0}</span></div>
                  <div className="flex justify-between text-indigo-600 dark:text-indigo-400 font-bold">
                    <span>PT GTS (Sister Site):</span>
                    <span className="font-mono">{dayRecord.wdxrf.zetiumB.gts || 0}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Saldo Akhir WDXRF (Bal):</span>
              <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                {formatNumber(isLongShift ? dayRecord.wdxrf.bal : (nightRecord?.wdxrf.bal || dayRecord.wdxrf.bal))} spl
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* CLUSTER 6: QC DATA & PELAPORAN COA */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-all">
        <button
          onClick={() => toggleCluster('qc_report')}
          className="w-full px-5 py-4 bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100/70 dark:hover:bg-slate-800 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between text-left transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Kluster 6</span>
                <span className="text-xs text-slate-400">• Hilir & Pelepasan Resmi</span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Kontrol Mutu (QC) & Pelepasan CoA ke Tambang/KSO
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 font-mono">
              {formatNumber(dayRecord.report.finishReportDay)} CoA Dirilis Hari Ini
            </span>
            {expandedClusters.qc_report ? <ChevronDown className="w-5 h-5 text-slate-400" /> : <ChevronRight className="w-5 h-5 text-slate-400" />}
          </div>
        </button>

        {expandedClusters.qc_report && (
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* QC Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Verifikasi Data & Standar Mutu (QC)
                </h4>
                <span className="text-[10px] text-slate-400 font-mono">O/S: {dayRecord.qc.os}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-medium">Selesai QC Shift</span>
                  <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {dayRecord.qc.finishShift + (nightRecord?.qc.finishShift || 0)}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-medium">Finish 24 Jam</span>
                  <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-100 mt-0.5 block">
                    {dayRecord.qc.finishDay}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 block font-medium">Sisa Saldo (Bal)</span>
                  <span className="text-sm font-black font-mono text-amber-600 dark:text-amber-400 mt-0.5 block">
                    {isLongShift ? dayRecord.qc.bal : (nightRecord?.qc.bal || dayRecord.qc.bal)}
                  </span>
                </div>
              </div>
            </div>

            {/* CoA Report Card */}
            <div className="p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Sertifikat Analisis Resmi (CoA Report Released)
                </h4>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono">O/S Report: {dayRecord.report.osReport}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Masuk Hari Ini</span>
                  <span className="text-sm font-black font-mono text-sky-600 dark:text-sky-400 mt-0.5 block">
                    +{dayRecord.report.received}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">CoA Dirilis</span>
                  <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {dayRecord.report.finishReportDay}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block font-medium">Sisa Antrean Bal</span>
                  <span className="text-sm font-black font-mono text-slate-700 dark:text-slate-300 mt-0.5 block">
                    {isLongShift ? dayRecord.report.bal : (nightRecord?.report.bal || dayRecord.report.bal)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};
