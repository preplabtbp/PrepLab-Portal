import React, { useState } from 'react';
import { 
  X, Check, Sparkles, Users, Layers, Flame, Cpu, 
  FileCheck, ArrowRight, Save 
} from 'lucide-react';
import { toast } from 'sonner';
import { DailyPerformanceRecord, ShiftType, ReguType } from './daily-performance-types';

interface DailyPerformanceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: DailyPerformanceRecord) => void;
  existingRecords: DailyPerformanceRecord[];
}

export const DailyPerformanceInputModal: React.FC<DailyPerformanceInputModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingRecords
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'info' | 'intake' | 'prep' | 'analysis' | 'qc'>('info');

  // Form State
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [week, setWeek] = useState(43);
  const [regu, setRegu] = useState<ReguType>('A');
  const [shiftType, setShiftType] = useState<ShiftType>('DAY');

  // Manpower
  const [staffShift, setStaffShift] = useState(5);
  const [staffCuti, setStaffCuti] = useState(3);
  const [crewShift, setCrewShift] = useState(10);
  const [crewBantn, setCrewBantn] = useState(2);
  const [crewCuti, setCrewCuti] = useState(2);
  const [manpowerNotes, setManpowerNotes] = useState('');

  // Sample Intake
  const [gcShift, setGcShift] = useState(450);
  const [prodShift, setProdShift] = useState(25);
  const [prodRc, setProdRc] = useState(0);
  const [prodRa, setProdRa] = useState(0);
  const [expShift, setExpShift] = useState(120);
  const [smelterShift, setSmelterShift] = useState(0);

  // Press & Bead
  const [pressFinish, setPressFinish] = useState(450);
  const [fuseBeadFinish, setFuseBeadFinish] = useState(150);
  const [fuseBeadOs, setFuseBeadOs] = useState(200);

  // EDXRF
  const [epsC, setEpsC] = useState(60);
  const [epsD, setEpsD] = useState(0);
  const [epsE, setEpsE] = useState(80);
  const [epsF, setEpsF] = useState(75);
  const [epsG, setEpsG] = useState(70);
  const [epsH, setEpsH] = useState(90);
  const [s2Puma, setS2Puma] = useState(40);

  // LOI
  const [loiOs, setLoiOs] = useState(100);
  const [loiW2, setLoiW2] = useState(50);
  const [loiW4, setLoiW4] = useState(100);
  const [loiW5, setLoiW5] = useState(100);

  // WDXRF Zetium A
  const [ztmAPrd, setZtmAPrd] = useState(30);
  const [ztmAExp, setZtmAExp] = useState(40);
  const [ztmASml, setZtmASml] = useState(10);
  const [ztmAGts, setZtmAGts] = useState(0);
  const [ztmARarr, setZtmARarr] = useState(15);
  const [ztmAVer, setZtmAVer] = useState(5);
  const [ztmAStd, setZtmAStd] = useState(10);
  const [ztmABlk, setZtmABlk] = useState(4);

  // WDXRF Zetium B
  const [ztmBPrd, setZtmBPrd] = useState(0);
  const [ztmBExp, setZtmBExp] = useState(80);
  const [ztmBSml, setZtmBSml] = useState(5);
  const [ztmBGts, setZtmBGts] = useState(0);
  const [ztmBRarr, setZtmBRarr] = useState(10);
  const [ztmBVer, setZtmBVer] = useState(5);
  const [ztmBStd, setZtmBStd] = useState(20);
  const [ztmBBlk, setZtmBBlk] = useState(4);
  const [wdxrfOs, setWdxrfOs] = useState(300);

  // QC & Report
  const [qcOs, setQcOs] = useState(150);
  const [qcFinish, setQcFinish] = useState(120);
  const [reportOs, setReportOs] = useState(50);
  const [reportDone, setReportDone] = useState(100);

  // Auto Calculations
  const edxrfTotal = epsC + epsD + epsE + epsF + epsG + epsH + s2Puma;
  const ztmATotal = ztmAPrd + ztmAExp + ztmASml + ztmAGts + ztmARarr + ztmAVer + ztmAStd + ztmABlk;
  const ztmBTotal = ztmBPrd + ztmBExp + ztmBSml + ztmBGts + ztmBRarr + ztmBVer + ztmBStd + ztmBBlk;
  const loiFinish = loiW2 + loiW4 + loiW5;
  const fuseBeadBal = Math.max(0, fuseBeadOs + expShift - fuseBeadFinish);
  const loiBal = Math.max(0, loiOs - loiFinish);
  const wdxrfBal = Math.max(0, wdxrfOs - (ztmAExp + ztmBExp));
  const qcBal = Math.max(0, qcOs - qcFinish);
  const reportBal = Math.max(0, reportOs - reportDone);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = date.split('/');
    const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : date;
    const id = `${isoDate}_${regu}_${shiftType}`;

    const newRec: DailyPerformanceRecord = {
      id,
      no: existingRecords.length + 1,
      date,
      isoDate,
      week: Number(week),
      regu,
      shiftType,
      manpower: {
        staff: { shift: staffShift, cuti: staffCuti, alpa: 0, izin: 0, sakit: 0, total: staffShift + staffCuti },
        crew: { shift: crewShift, bantn: crewBantn, lab: crewShift, cuti: crewCuti, alpa: 0, izin: 0, sakit: 0, total: crewShift + crewBantn + crewCuti }
      },
      sampleReceived: {
        gc: { shift: gcShift, day: gcShift, wkly: gcShift },
        prod: { shift: prodShift, rc: prodRc, ra: prodRa, day: prodShift, wkly: prodShift },
        exp: { shift: expShift, day: expShift, wkly: expShift },
        smelter: { shift: smelterShift, day: smelterShift, wkly: smelterShift }
      },
      pressPowder: {
        received: { shift: gcShift, day: gcShift, wkly: gcShift },
        finish: { shift: pressFinish, day: pressFinish, wkly: pressFinish }
      },
      edxrf: {
        epsC, epsD, epsE, epsF, epsG, epsH, s2Puma,
        shift: edxrfTotal, day: edxrfTotal, wkly: edxrfTotal
      },
      fuseBead: {
        osExp: fuseBeadOs,
        finishShift: fuseBeadFinish,
        finishDay: fuseBeadFinish,
        finishWkly: fuseBeadFinish,
        balExp: fuseBeadBal
      },
      loi: {
        os: loiOs,
        w2: loiW2, w4: loiW4, w5: loiW5,
        finLoiShift: loiFinish, finLoiDay: loiFinish, finLoiWkly: 0,
        bal: loiBal
      },
      wdxrf: {
        osExp: wdxrfOs,
        zetiumA: {
          prod: ztmAPrd, exp: ztmAExp, smelt: ztmASml, gts: ztmAGts, rarr: ztmARarr, ver: ztmAVer, std: ztmAStd, blank: ztmABlk,
          total: ztmATotal, day: ztmATotal, wkly: ztmATotal
        },
        zetiumB: {
          prod: ztmBPrd, exp: ztmBExp, smelt: ztmBSml, gts: ztmBGts, rarr: ztmBRarr, ver: ztmBVer, std: ztmBStd, blank: ztmBBlk,
          total: ztmBTotal, day: ztmBTotal, wkly: ztmBTotal
        },
        bal: wdxrfBal
      },
      qc: {
        os: qcOs, finishShift: qcFinish, finishDay: qcFinish, finishWkly: qcFinish, bal: qcBal
      },
      report: {
        osReport: reportOs, received: expShift, finishReportDay: reportDone, finishReportWkly: reportDone, bal: reportBal
      },
      manpowerNotes: manpowerNotes || undefined,
      updatedAt: new Date().toISOString()
    };

    onSave(newRec);
    toast.success(`Data Daily Performance ${date} (${regu} - ${shiftType}) berhasil disimpan.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              Input Log Daily Performance Shift Baru
            </h3>
            <p className="text-xs text-slate-500">
              Formulir terstruktur per-stasiun dengan kalkulasi saldo otomatis
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 px-4 gap-1 text-xs font-semibold overflow-x-auto scrollbar-none">
          {[
            { id: 'info', label: '1. Shift & Manpower', icon: <Users className="w-3.5 h-3.5" /> },
            { id: 'intake', label: '2. Sampel Masuk', icon: <Layers className="w-3.5 h-3.5" /> },
            { id: 'prep', label: '3. Preparasi Pelet/Bead', icon: <Flame className="w-3.5 h-3.5" /> },
            { id: 'analysis', label: '4. XRF & LOI Run', icon: <Cpu className="w-3.5 h-3.5" /> },
            { id: 'qc', label: '5. QC & Pelaporan', icon: <FileCheck className="w-3.5 h-3.5" /> },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 py-3 px-3 border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* TAB 1: INFO & MANPOWER */}
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Tanggal (DD/MM/YYYY)</label>
                  <input
                    type="text"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    required
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Week</label>
                  <input
                    type="number"
                    value={week}
                    onChange={e => setWeek(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Shift</label>
                  <select
                    value={regu}
                    onChange={e => setRegu(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white cursor-pointer"
                  >
                    <option value="A">Shift A</option>
                    <option value="B">Shift B</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Waktu / Jadwal Shift</label>
                  <select
                    value={shiftType}
                    onChange={e => setShiftType(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white cursor-pointer"
                  >
                    <option value="DAY">DAY (Pagi: 07:00 - 19:00 WITA)</option>
                    <option value="NIGHT">NIGHT (Malam: 19:00 - 07:00 WITA)</option>
                    <option value="LS">LS (Long Shift: 07:00 - 24:00 WITA)</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Kehadiran SDM (Manpower)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500">Staff Hadir</label>
                    <input 
                      type="number" 
                      value={staffShift} 
                      onChange={e => setStaffShift(Number(e.target.value))}
                      className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Staff Cuti</label>
                    <input 
                      type="number" 
                      value={staffCuti} 
                      onChange={e => setStaffCuti(Number(e.target.value))}
                      className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Crew Hadir</label>
                    <input 
                      type="number" 
                      value={crewShift} 
                      onChange={e => setCrewShift(Number(e.target.value))}
                      className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Crew Bantuan</label>
                    <input 
                      type="number" 
                      value={crewBantn} 
                      onChange={e => setCrewBantn(Number(e.target.value))}
                      className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-[10px] text-slate-500 font-semibold block">Catatan Manpower & Perbantuan (misal: Perbantuan dari Prep)</label>
                  <input
                    type="text"
                    value={manpowerNotes}
                    onChange={e => setManpowerNotes(e.target.value)}
                    placeholder="Contoh: 2 operator diperbantukan dari Preparation untuk stasiun Fusion & Weighing"
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTAKE */}
          {activeTab === 'intake' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Penerimaan Sampel Masuk (Shift Ini)</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500">Grade Control (GC)</label>
                  <input 
                    type="number" 
                    value={gcShift} 
                    onChange={e => setGcShift(Number(e.target.value))}
                    className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Produksi (PROD)</label>
                  <input 
                    type="number" 
                    value={prodShift} 
                    onChange={e => setProdShift(Number(e.target.value))}
                    className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Eksplorasi (EXP)</label>
                  <input 
                    type="number" 
                    value={expShift} 
                    onChange={e => setExpShift(Number(e.target.value))}
                    className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Smelter</label>
                  <input 
                    type="number" 
                    value={smelterShift} 
                    onChange={e => setSmelterShift(Number(e.target.value))}
                    className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              {/* Rincian Produksi: RC & RA */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Rincian Tipe Sampel Produksi (RC & RA)</span>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500">Reverse Circulation (RC)</label>
                    <input 
                      type="number" 
                      value={prodRc} 
                      onChange={e => setProdRc(Number(e.target.value))}
                      placeholder="0"
                      className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Resource / Re-Assay (RA)</label>
                    <input 
                      type="number" 
                      value={prodRa} 
                      onChange={e => setProdRa(Number(e.target.value))}
                      placeholder="0"
                      className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-xs text-teal-800 dark:text-teal-300">
                Total Sampel Masuk Shift Ini: <strong>{gcShift + prodShift + expShift + smelterShift} sampel</strong>
              </div>
            </div>
          )}

          {/* TAB 3: PREPARASI */}
          {activeTab === 'prep' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Press Powder & Fusion Bead</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500">Press Powder Finish</label>
                  <input 
                    type="number" 
                    value={pressFinish} 
                    onChange={e => setPressFinish(Number(e.target.value))}
                    className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Fuse Bead O/S Awal</label>
                  <input 
                    type="number" 
                    value={fuseBeadOs} 
                    onChange={e => setFuseBeadOs(Number(e.target.value))}
                    className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Fuse Bead Finish</label>
                  <input 
                    type="number" 
                    value={fuseBeadFinish} 
                    onChange={e => setFuseBeadFinish(Number(e.target.value))}
                    className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300">
                Saldo Sisa Fuse Bead (Bal): <strong>{fuseBeadBal} eksp</strong> (O/S + Exp - Finish)
              </div>
            </div>
          )}

          {/* TAB 4: ANALYSIS (EDXRF & WDXRF) */}
          {activeTab === 'analysis' && (
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Pembacaan EDXRF Per-Mesin</span>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[['EPS C', epsC, setEpsC], ['EPS D', epsD, setEpsD], ['EPS E', epsE, setEpsE], ['EPS F', epsF, setEpsF],
                  ['EPS G', epsG, setEpsG], ['EPS H', epsH, setEpsH], ['S2 Puma', s2Puma, setS2Puma]].map(([name, val, setter]: any) => (
                  <div key={name}>
                    <label className="text-[10px] text-slate-500">{name}</label>
                    <input 
                      type="number" 
                      value={val} 
                      onChange={e => setter(Number(e.target.value))}
                      className="w-full mt-0.5 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-center"
                    />
                  </div>
                ))}
                <div className="flex items-center justify-center p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 font-bold text-teal-700 dark:text-teal-300 text-xs">
                  Total: {edxrfTotal}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">WDXRF Zetium Runs</span>
                <div className="grid grid-cols-2 gap-3 mt-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="font-semibold text-blue-600 block">Zetium A (Total: {ztmATotal})</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>Prod: <input type="number" value={ztmAPrd} onChange={e => setZtmAPrd(Number(e.target.value))} className="w-full px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" /></div>
                      <div>Exp: <input type="number" value={ztmAExp} onChange={e => setZtmAExp(Number(e.target.value))} className="w-full px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" /></div>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                    <span className="font-semibold text-indigo-600 block">Zetium B (Total: {ztmBTotal})</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>Prod: <input type="number" value={ztmBPrd} onChange={e => setZtmBPrd(Number(e.target.value))} className="w-full px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" /></div>
                      <div>Exp: <input type="number" value={ztmBExp} onChange={e => setZtmBExp(Number(e.target.value))} className="w-full px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" /></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: QC & REPORT */}
          {activeTab === 'qc' && (
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Kontrol Mutu (QC) & Laporan CoA</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500">QC O/S</label>
                  <input type="number" value={qcOs} onChange={e => setQcOs(Number(e.target.value))} className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">QC Finish Shift</label>
                  <input type="number" value={qcFinish} onChange={e => setQcFinish(Number(e.target.value))} className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Report O/S</label>
                  <input type="number" value={reportOs} onChange={e => setReportOs(Number(e.target.value))} className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500">Report Done (Rilis)</label>
                  <input type="number" value={reportDone} onChange={e => setReportDone(Number(e.target.value))} className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono" />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300">
                Sisa Saldo Laporan: <strong>{reportBal} pending</strong>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Batal
            </button>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Shift Record</span>
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
