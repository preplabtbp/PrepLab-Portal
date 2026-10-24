import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardCheck, Send, CheckCircle2, AlertTriangle, 
  Copy, Check, Wrench, Shield, MessageSquare, Clock, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { DailyPerformanceRecord, ShiftHandoverNote } from './daily-performance-v2-types';
import { 
  formatShiftName, 
  getStoredHandoverNotes, 
  saveStoredHandoverNote,
  formatNumber
} from './daily-performance-v2-utils';

interface DailyPerformanceV2HandoverProps {
  records: DailyPerformanceRecord[];
  selectedDate: string;
  inspectorName?: string;
  userPt?: string;
}

export const DailyPerformanceV2Handover: React.FC<DailyPerformanceV2HandoverProps> = ({
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

  const activeRecord = dayRecord;

  // Handover state
  const noteId = `${selectedDate}_${activeRecord?.shiftType || 'DAY'}`;
  const [copied, setCopied] = useState(false);

  const [handoverData, setHandoverData] = useState<ShiftHandoverNote>(() => {
    const stored = getStoredHandoverNotes();
    if (stored[noteId]) {
      return stored[noteId];
    }
    return {
      id: noteId,
      date: selectedDate,
      isoDate: activeRecord?.isoDate || '2026-10-01',
      shiftType: activeRecord?.shiftType || 'DAY',
      shiftName: formatShiftName(activeRecord?.regu),
      spvName: inspectorName,
      handoverTo: isLongShift ? 'Shift Pagi Berikutnya' : 'Shift Malam',
      criticalIssues: [],
      equipmentStatus: {
        furnaceW2: 'NORMAL',
        furnaceW4: 'NORMAL',
        furnaceW5: 'NORMAL',
        zetiumA: 'NORMAL',
        zetiumB: 'NORMAL',
        pelletPress: 'NORMAL',
        beadFusion: 'NORMAL'
      },
      samplePriorities: 'Prioritas Sampel Grade Control (GC) Pit Timur & Resource Check (RC)',
      notes: activeRecord?.manpowerNotes || 'Operasional berjalan lancar tanpa kendala kritikal pada instrumen utama.',
      updatedAt: new Date().toISOString()
    };
  });

  // Keep state updated if selected date changes
  useEffect(() => {
    const stored = getStoredHandoverNotes();
    if (stored[noteId]) {
      setHandoverData(stored[noteId]);
    } else {
      setHandoverData({
        id: noteId,
        date: selectedDate,
        isoDate: activeRecord?.isoDate || '2026-10-01',
        shiftType: activeRecord?.shiftType || 'DAY',
        shiftName: formatShiftName(activeRecord?.regu),
        spvName: inspectorName,
        handoverTo: isLongShift ? 'Shift Pagi Berikutnya' : 'Shift Malam',
        criticalIssues: [],
        equipmentStatus: {
          furnaceW2: 'NORMAL',
          furnaceW4: 'NORMAL',
          furnaceW5: 'NORMAL',
          zetiumA: 'NORMAL',
          zetiumB: 'NORMAL',
          pelletPress: 'NORMAL',
          beadFusion: 'NORMAL'
        },
        samplePriorities: 'Prioritas Sampel Grade Control (GC) Pit Timur & Resource Check (RC)',
        notes: activeRecord?.manpowerNotes || 'Operasional shift berjalan stabil.',
        updatedAt: new Date().toISOString()
      });
    }
  }, [noteId, selectedDate, activeRecord, inspectorName, isLongShift]);

  const handleSave = () => {
    const updated = {
      ...handoverData,
      updatedAt: new Date().toISOString()
    };
    saveStoredHandoverNote(updated);
    toast.success('Catatan serah terima shift (handover) berhasil disimpan!');
  };

  const generateWhatsAppMessage = () => {
    const shiftLabel = isLongShift 
      ? `LONG SHIFT (07:00 - 24:00 WITA) - ${handoverData.shiftName}`
      : `DAY SHIFT (07:00 - 19:00 WITA) - ${handoverData.shiftName}`;

    const totalRec = activeRecord 
      ? (activeRecord.sampleReceived.gc.shift + activeRecord.sampleReceived.prod.shift + activeRecord.sampleReceived.exp.shift + activeRecord.sampleReceived.smelter.shift)
      : 0;

    const totalFinPellet = activeRecord?.pressPowder.finish.shift || 0;
    const totalFinFusion = activeRecord?.fuseBead.finishShift || 0;
    const totalZetium = activeRecord ? (activeRecord.wdxrf.zetiumA.total + activeRecord.wdxrf.zetiumB.total) : 0;
    const totalCoA = activeRecord?.report.finishReportDay || 0;

    return `*LAPORAN HANDOVER SHIFT LAB ${userPt}*
*Tanggal:* ${selectedDate}
⏰ *Shift:* ${shiftLabel}
*SPV/Mandor:* ${handoverData.spvName} → Handover ke: *${handoverData.handoverTo}*

*RINGKASAN THROUGHPUT:*
• Penerimaan Sampel: +${formatNumber(totalRec)} spl (GC: ${activeRecord?.sampleReceived.gc.shift || 0}, Prod: ${activeRecord?.sampleReceived.prod.shift || 0}, Exp: ${activeRecord?.sampleReceived.exp.shift || 0})
• Pellet Selesai: ${formatNumber(totalFinPellet)} spl
• Fusion Bead Selesai: ${formatNumber(totalFinFusion)} spl (Bal Sisa: ${activeRecord?.fuseBead.balExp || 0})
• Zetium XRF Total Runs: ${formatNumber(totalZetium)} runs
• CoA Rilis: ${formatNumber(totalCoA)} sertifikat

*STATUS INSTRUMEN & ASSET:*
• Furnace W2/W4/W5: ${handoverData.equipmentStatus.furnaceW2} / ${handoverData.equipmentStatus.furnaceW4} / ${handoverData.equipmentStatus.furnaceW5}
• Zetium A & B: ${handoverData.equipmentStatus.zetiumA} & ${handoverData.equipmentStatus.zetiumB}
• Mesin Press Pellet: ${handoverData.equipmentStatus.pelletPress}
• Mesin Automatic Bead Fusion: ${handoverData.equipmentStatus.beadFusion}

*PRIORITAS SHIFT BERIKUTNYA:*
${handoverData.samplePriorities}

*CATATAN SPV:*
${handoverData.notes}

_Dilaporkan via Portal Daily Performance Laboratory Harita Nickel_`;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Format WhatsApp Laporan Handover berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* HEADER BANNER */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
              Shift Handover & Mandor Log
            </span>
            <span className="text-xs text-slate-400">• Tanggal {selectedDate}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
            Serah Terima Tugas Shift (Shift Changeover)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Pencatatan kondisi alat, prioritas sampel antrean, dan catatan kritis antar regu kerja.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCopyWhatsApp}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Tersalin!' : 'Salin Format WA'}</span>
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Simpan Log Handover</span>
          </button>
        </div>
      </div>

      {/* FORM INPUT & CHECKLIST */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Metadata Shift */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Informasi Shift & Penanggung Jawab
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Shift Bertugas</label>
                <input
                  type="text"
                  value={handoverData.shiftName}
                  disabled
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Nama SPV / Mandor</label>
                <input
                  type="text"
                  value={handoverData.spvName}
                  onChange={e => setHandoverData({ ...handoverData, spvName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Diserahkan Kepada</label>
                <input
                  type="text"
                  value={handoverData.handoverTo}
                  onChange={e => setHandoverData({ ...handoverData, handoverTo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Asset Health Checklist */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-600" />
              Status Kelaikan Instrumen & Furnace
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {[
                { key: 'furnaceW2', label: 'Furnace W2 (LOI)' },
                { key: 'furnaceW4', label: 'Furnace W4 (LOI)' },
                { key: 'furnaceW5', label: 'Furnace W5 (LOI)' },
                { key: 'zetiumA', label: 'WDXRF Zetium A' },
                { key: 'zetiumB', label: 'WDXRF Zetium B' },
                { key: 'pelletPress', label: 'Mesin Press Pellet' },
                { key: 'beadFusion', label: 'Mesin Bead Fusion' },
              ].map(item => {
                const currentStatus = (handoverData.equipmentStatus as any)[item.key] || 'NORMAL';
                return (
                  <div key={item.key} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 block truncate">{item.label}</span>
                    <select
                      value={currentStatus}
                      onChange={e => setHandoverData({
                        ...handoverData,
                        equipmentStatus: {
                          ...handoverData.equipmentStatus,
                          [item.key]: e.target.value as any
                        }
                      })}
                      className={`w-full px-2 py-1 rounded-lg text-xs font-bold cursor-pointer focus:outline-none ${
                        currentStatus === 'NORMAL'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                          : currentStatus === 'ISSUE'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                      }`}
                    >
                      <option value="NORMAL">NORMAL</option>
                      <option value="ISSUE">PERHATIAN</option>
                      <option value="OFF">DOWN / OFF</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sample Priorities & Notes */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              Prioritas Sampel & Catatan Khusus Shift
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Prioritas Sampel (Mining / Pit Rush)
                </label>
                <input
                  type="text"
                  value={handoverData.samplePriorities}
                  onChange={e => setHandoverData({ ...handoverData, samplePriorities: e.target.value })}
                  placeholder="Contoh: Dahulukan 80 sampel GC Pit Timur & 12 RC Smelter..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Catatan Serah Terima untuk Shift Penerima
                </label>
                <textarea
                  rows={4}
                  value={handoverData.notes}
                  onChange={e => setHandoverData({ ...handoverData, notes: e.target.value })}
                  placeholder="Catatan kendala reagen, pasokan argon, koordinasi dengan mandor tambang..."
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Right 1 Col: Live WhatsApp Broadcast Preview */}
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-slate-900 text-white shadow-xl space-y-3 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Preview WhatsApp Broadcast
              </span>
              <button
                onClick={handleCopyWhatsApp}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin</span>
              </button>
            </div>

            <pre className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[480px] overflow-y-auto">
              {generateWhatsAppMessage()}
            </pre>

            <button
              onClick={handleCopyWhatsApp}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Teks Berhasil Disalin!' : 'Salin Laporan WhatsApp'}</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
