import React, { useMemo } from 'react';
import { Printer, CheckCircle2, Shield, Calendar, Users, Layers, Flame, Cpu, FileCheck } from 'lucide-react';
import { DailyPerformanceRecord } from './daily-performance-v2-types';
import { formatNumber, formatShiftName } from './daily-performance-v2-utils';

interface DailyPerformanceV2SummarySheetProps {
  records: DailyPerformanceRecord[];
  selectedDate: string;
  inspectorName?: string;
  userPt?: string;
}

export const DailyPerformanceV2SummarySheet: React.FC<DailyPerformanceV2SummarySheetProps> = ({
  records,
  selectedDate,
  inspectorName = 'Supervisor Lab',
  userPt = 'TBP'
}) => {
  const recordsForDate = useMemo(() => {
    return records.filter(r => r.date === selectedDate);
  }, [records, selectedDate]);

  const isLongShift = useMemo(() => {
    return recordsForDate.some(r => r.shiftType === 'LS');
  }, [recordsForDate]);

  const dayRecord = useMemo(() => {
    return recordsForDate.find(r => r.shiftType === 'DAY' || r.shiftType === 'LS');
  }, [recordsForDate]);

  const nightRecord = useMemo(() => {
    if (isLongShift) return null;
    return recordsForDate.find(r => r.shiftType === 'NIGHT');
  }, [recordsForDate, isLongShift]);

  if (!dayRecord) {
    return (
      <div className="p-8 text-center text-slate-500">
        Data tidak ditemukan untuk tanggal {selectedDate}.
      </div>
    );
  }

  const shiftDayName = formatShiftName(dayRecord.regu);
  const shiftNightName = nightRecord ? formatShiftName(nightRecord.regu) : '-';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      
      {/* Action Bar (Hidden in Print) */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 print:hidden shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Lembar Ringkasan Operasional Harian (1-Pager)</h3>
          <p className="text-xs text-slate-500">Tata letak terstandarisasi untuk cetak fisik A4 landscape atau arsip PDF.</p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>Cetak Dokumen (A4)</span>
        </button>
      </div>

      {/* PRINTABLE SHEET CONTAINER */}
      <div className="p-8 sm:p-10 bg-white text-slate-900 rounded-3xl border border-slate-300 shadow-lg print:shadow-none print:border-none print:p-0 max-w-5xl mx-auto space-y-6 font-sans">
        
        {/* HEADER KOP SURAT */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-700 text-white font-black flex items-center justify-center text-sm">
              HARITA
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest text-teal-800 uppercase block">
                DIVISI QUALITY ASSURANCE & LABORATORIUM • PT {userPt}
              </span>
              <h1 className="text-xl font-black tracking-tight text-slate-950 uppercase">
                LAPORAN KINERJA HARIAN (DAILY PERFORMANCE)
              </h1>
              <span className="text-xs font-medium text-slate-600">
                Site Obi • Tanggal: <strong>{selectedDate}</strong> • Minggu ke-<strong>{dayRecord.week}</strong>
              </span>
            </div>
          </div>

          <div className="text-right text-xs">
            <span className="px-2.5 py-1 rounded bg-slate-100 font-bold border border-slate-300 text-slate-800 block text-center mb-1">
              {isLongShift ? `LONG SHIFT (07:00 - 24:00 WITA)` : `2 SHIFT OPERASIONAL (DAY & NIGHT)`}
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Petugas: {shiftDayName} {!isLongShift && `& ${shiftNightName}`}
            </span>
          </div>
        </div>

        {/* SECTION 1: MANPOWER & ATTENDANCE */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-teal-700" />
            1. Sumber Daya Manusia (SDM & Kehadiran Shift)
          </h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="font-bold text-slate-800 block">
                {isLongShift ? `${shiftDayName} (Long Shift)` : `${shiftDayName} (Day Shift 07-19)`}:
              </span>
              <div className="mt-1 flex justify-between font-mono">
                <span>Staff: {dayRecord.manpower.staff.shift}/{dayRecord.manpower.staff.total}</span>
                <span>Crew: {dayRecord.manpower.crew.shift}/{dayRecord.manpower.crew.total}</span>
                <span>Bantuan: +{dayRecord.manpower.crew.bantn}</span>
                <span className="text-rose-600 font-bold">
                  Off: {dayRecord.manpower.staff.cuti + dayRecord.manpower.crew.cuti + dayRecord.manpower.staff.sakit + dayRecord.manpower.crew.sakit}
                </span>
              </div>
            </div>

            {!isLongShift && nightRecord && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-800 block">
                  {shiftNightName} (Night Shift 19-07):
                </span>
                <div className="mt-1 flex justify-between font-mono">
                  <span>Staff: {nightRecord.manpower.staff.shift}/{nightRecord.manpower.staff.total}</span>
                  <span>Crew: {nightRecord.manpower.crew.shift}/{nightRecord.manpower.crew.total}</span>
                  <span>Bantuan: +{nightRecord.manpower.crew.bantn}</span>
                  <span className="text-rose-600 font-bold">
                    Off: {nightRecord.manpower.staff.cuti + nightRecord.manpower.crew.cuti + nightRecord.manpower.staff.sakit + nightRecord.manpower.crew.sakit}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: SAMPLE RECEIVED & PREPARASI TABLE */}
        <div className="space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-teal-700" />
            2. Penerimaan & Neraca Preparasi Fisik
          </h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-left">
                <th className="p-2">Kategori Sampel / Stasiun</th>
                <th className="p-2">Day / LS Shift</th>
                {!isLongShift && <th className="p-2">Night Shift</th>}
                <th className="p-2">Total 24 Jam</th>
                <th className="p-2">Saldo Akhir (Bal)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              <tr>
                <td className="p-2 font-sans font-semibold">Grade Control (GC Pit)</td>
                <td className="p-2">+{dayRecord.sampleReceived.gc.shift}</td>
                {!isLongShift && <td className="p-2">+{nightRecord?.sampleReceived.gc.shift || 0}</td>}
                <td className="p-2 font-bold">+{dayRecord.sampleReceived.gc.day}</td>
                <td className="p-2 text-slate-500">-</td>
              </tr>
              <tr>
                <td className="p-2 font-sans font-semibold">Produksi & RC (Resource Check)</td>
                <td className="p-2">+{dayRecord.sampleReceived.prod.shift}</td>
                {!isLongShift && <td className="p-2">+{nightRecord?.sampleReceived.prod.shift || 0}</td>}
                <td className="p-2 font-bold">+{dayRecord.sampleReceived.prod.day}</td>
                <td className="p-2 text-slate-500">-</td>
              </tr>
              <tr>
                <td className="p-2 font-sans font-semibold">Eksplorasi (EXP Bor)</td>
                <td className="p-2">+{dayRecord.sampleReceived.exp.shift}</td>
                {!isLongShift && <td className="p-2">+{nightRecord?.sampleReceived.exp.shift || 0}</td>}
                <td className="p-2 font-bold">+{dayRecord.sampleReceived.exp.day}</td>
                <td className="p-2 text-slate-500">-</td>
              </tr>
              <tr className="bg-slate-50 font-bold">
                <td className="p-2 font-sans">Press Powder Pellet (Dicetak)</td>
                <td className="p-2">{dayRecord.pressPowder.finish.shift}</td>
                {!isLongShift && <td className="p-2">{nightRecord?.pressPowder.finish.shift || 0}</td>}
                <td className="p-2">{dayRecord.pressPowder.finish.day}</td>
                <td className="p-2 text-teal-700">Lancar</td>
              </tr>
              <tr className="bg-slate-50 font-bold">
                <td className="p-2 font-sans">Fusion Bead Manik Borat (Dilebur)</td>
                <td className="p-2">{dayRecord.fuseBead.finishShift}</td>
                {!isLongShift && <td className="p-2">{nightRecord?.fuseBead.finishShift || 0}</td>}
                <td className="p-2">{dayRecord.fuseBead.finishDay}</td>
                <td className="p-2 text-amber-700">{isLongShift ? dayRecord.fuseBead.balExp : (nightRecord?.fuseBead.balExp || dayRecord.fuseBead.balExp)} spl</td>
              </tr>
              <tr className="bg-slate-50 font-bold">
                <td className="p-2 font-sans">LOI Gravimetri (Furnace W2/W4/W5)</td>
                <td className="p-2">{dayRecord.loi.finLoiShift}</td>
                {!isLongShift && <td className="p-2">{nightRecord?.loi.finLoiShift || 0}</td>}
                <td className="p-2">{dayRecord.loi.finLoiDay}</td>
                <td className="p-2 text-rose-700">{isLongShift ? dayRecord.loi.bal : (nightRecord?.loi.bal || dayRecord.loi.bal)} spl</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* SECTION 3: INSTRUMENT FLEET RUN & QC */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-xl border border-slate-200 space-y-1.5">
            <h4 className="font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-purple-700" />
              Spektrometri XRF Run
            </h4>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div>• EDXRF Epsilon C-H: <strong>{dayRecord.edxrf.shift + (nightRecord?.edxrf.shift || 0)} runs</strong></div>
              <div>• WDXRF Zetium A: <strong>{dayRecord.wdxrf.zetiumA.total} runs</strong></div>
              <div>• WDXRF Zetium B: <strong>{dayRecord.wdxrf.zetiumB.total} runs</strong></div>
              <div>• Sister Site PT GTS: <strong>{(dayRecord.wdxrf.zetiumA.gts || 0) + (dayRecord.wdxrf.zetiumB.gts || 0)} runs</strong></div>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 space-y-1.5">
            <h4 className="font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5 text-emerald-700" />
              Kontrol Mutu & Pelaporan CoA
            </h4>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div>• Selesai QC Verifikasi: <strong>{dayRecord.qc.finishDay} spl</strong></div>
              <div>• CoA Dirilis ke Tambang: <strong>{dayRecord.report.finishReportDay} CoA</strong></div>
              <div>• Sisa Antrean QC: <strong>{isLongShift ? dayRecord.qc.bal : (nightRecord?.qc.bal || dayRecord.qc.bal)} spl</strong></div>
              <div>• Sisa Antrean CoA: <strong>{isLongShift ? dayRecord.report.bal : (nightRecord?.report.bal || dayRecord.report.bal)} spl</strong></div>
            </div>
          </div>
        </div>

        {/* SECTION 4: SIGNATURES */}
        <div className="pt-6 border-t border-slate-200 grid grid-cols-3 text-center text-xs">
          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Dibuat Oleh (SPV Shift)</span>
            <div className="h-14"></div>
            <span className="font-bold border-t border-slate-400 pt-1 block px-4 mx-auto w-fit">
              {inspectorName}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Diperiksa Oleh (QA Lead)</span>
            <div className="h-14"></div>
            <span className="font-bold border-t border-slate-400 pt-1 block px-4 mx-auto w-fit">
              Superintendent QA Lab
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 uppercase block">Disetujui Oleh (Management)</span>
            <div className="h-14"></div>
            <span className="font-bold border-t border-slate-400 pt-1 block px-4 mx-auto w-fit">
              Manager QA & Laboratory
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
