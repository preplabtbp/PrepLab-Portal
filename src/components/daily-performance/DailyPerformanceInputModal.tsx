import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Check, Sparkles, Users, Layers, Flame, Cpu, 
  FileCheck, ArrowRight, Save, UserCheck, AlertCircle, 
  Plus, RefreshCw, Filter, Shield, Clock, ChevronDown, 
  CheckSquare, Square, Building2, Beaker, FileSpreadsheet,
  Send, UserX, Stethoscope
} from 'lucide-react';
import { toast } from 'sonner';
import { DailyPerformanceRecord, ShiftType, ReguType } from './daily-performance-types';
import { getRosterData } from '../../sheets-api';
import { 
  getStoredSampleBatches, 
  saveStoredSampleBatches 
} from '../daily-performance-v2/daily-performance-v2-utils';
import { SampleBatchRecord } from '../daily-performance-v2/daily-performance-v2-types';

export type ForemanRoleMode = 'all' | 'foreman_gc' | 'foreman_weighing' | 'foreman_wdxrf';

interface DailyPerformanceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: DailyPerformanceRecord) => void;
  existingRecords: DailyPerformanceRecord[];
  initialRole?: ForemanRoleMode;
}

export const DailyPerformanceInputModal: React.FC<DailyPerformanceInputModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingRecords,
  initialRole = 'all'
}) => {
  if (!isOpen) return null;

  // Role mode selection
  const [roleMode, setRoleMode] = useState<ForemanRoleMode>(initialRole);
  const [activeTab, setActiveTab] = useState<'info' | 'gc_edxrf' | 'weighing_loi' | 'fusion_wdxrf' | 'qc'>('info');

  // Form State Header
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [week, setWeek] = useState(43);
  const [regu, setRegu] = useState<ReguType>('A');
  const [shiftType, setShiftType] = useState<ShiftType>('DAY');

  // Roster & Manpower
  const [rosterRaw, setRosterRaw] = useState<any[]>([]);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [staffShift, setStaffShift] = useState(5);
  const [staffCuti, setStaffCuti] = useState(3);
  const [crewShift, setCrewShift] = useState(10);
  const [crewBantn, setCrewBantn] = useState(2);
  const [crewCuti, setCrewCuti] = useState(2);
  const [crewIzin, setCrewIzin] = useState(0);
  const [crewSakit, setCrewSakit] = useState(0);
  const [manpowerNotes, setManpowerNotes] = useState('');

  // Quick Absence Dialog State (Izin / Sakit ke Review Administrasi)
  const [showAbsenceDialog, setShowAbsenceDialog] = useState(false);
  const [selectedEmpNik, setSelectedEmpNik] = useState('');
  const [absenceCategory, setAbsenceCategory] = useState<'SAKIT' | 'IZIN'>('SAKIT');
  const [absenceReason, setAbsenceReason] = useState('');
  const [isSubmittingAbsence, setIsSubmittingAbsence] = useState(false);
  const [reportedAbsences, setReportedAbsences] = useState<Array<{
    nik: string;
    name: string;
    category: string;
    reason: string;
    status: string;
  }>>([]);

  // JALUR 1: GC & EDXRF (Single Entry di Press Pellet)
  // Input 1x: Sampel masuk dari Preparasi Kering ke Lab
  const [pulpDryReceived, setPulpDryReceived] = useState(450);
  const [pressFinish, setPressFinish] = useState(450);
  // Scan EDXRF per alat
  const [epsC, setEpsC] = useState(60);
  const [epsD, setEpsD] = useState(0);
  const [epsE, setEpsE] = useState(80);
  const [epsF, setEpsF] = useState(75);
  const [epsG, setEpsG] = useState(70);
  const [epsH, setEpsH] = useState(90);
  const [s2Puma, setS2Puma] = useState(40);

  // JALUR 2: WEIGHING, FUSION, WDXRF & LOI
  // Sample Intake Lainnya
  const [prodShift, setProdShift] = useState(25);
  const [prodRc, setProdRc] = useState(0);
  const [prodRa, setProdRa] = useState(0);
  const [expShift, setExpShift] = useState(120);
  const [smelterShift, setSmelterShift] = useState(0);

  // Stasiun Weighing (Pendaftaran Batch Masuk 1x)
  const [batches, setBatches] = useState<SampleBatchRecord[]>(() => getStoredSampleBatches());
  const [newBatchPt, setNewBatchPt] = useState('TBP');
  const [newBatchCount, setNewBatchCount] = useState<number>(3);
  const [newBatchUniformSize, setNewBatchUniformSize] = useState<boolean>(true);
  const [newBatchSplPerBatch, setNewBatchSplPerBatch] = useState<number>(24);
  const [newBatchCustomSizes, setNewBatchCustomSizes] = useState<number[]>([24, 24, 24]);

  // LOI
  const [loiOs, setLoiOs] = useState(100);
  const [loiW2, setLoiW2] = useState(50);
  const [loiW4, setLoiW4] = useState(100);
  const [loiW5, setLoiW5] = useState(100);

  // WDXRF Zetium A
  const [ztmAPrd, setZtmAPrd] = useState(30);
  const [ztmAExp, setZtmAExp] = useState(40);
  const [ztASml, setZtmASml] = useState(10);
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

  // QC & Report
  const [qcOs, setQcOs] = useState(150);
  const [qcFinish, setQcFinish] = useState(120);
  const [reportOs, setReportOs] = useState(50);
  const [reportDone, setReportDone] = useState(100);

  // Load Roster Live
  useEffect(() => {
    let isMounted = true;
    setIsRosterLoading(true);
    getRosterData()
      .then((res: any) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : (res?.roster || []);
        setRosterRaw(list);
      })
      .catch(err => {
        console.error('Failed to load roster:', err);
      })
      .finally(() => {
        if (isMounted) setIsRosterLoading(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Filter roster by Regu & Shift
  const currentReguEmployees = useMemo(() => {
    if (!rosterRaw.length) return [];
    return rosterRaw.filter(emp => {
      const empRegu = String(emp.regu || emp.Regu || '').trim().toUpperCase();
      return empRegu === regu.toUpperCase();
    });
  }, [rosterRaw, regu]);

  // Adjust custom sizes when batch count changes
  useEffect(() => {
    const count = Math.max(1, Math.min(20, newBatchCount || 1));
    setNewBatchCustomSizes(prev => {
      if (prev.length === count) return prev;
      const next = [...prev];
      while (next.length < count) next.push(newBatchSplPerBatch || 24);
      return next.slice(0, count);
    });
  }, [newBatchCount, newBatchSplPerBatch]);

  // Save batches helper
  const handleAddBatch = () => {
    const count = Math.max(1, Math.min(20, newBatchCount || 1));
    const nowIso = new Date().toISOString();
    const created: SampleBatchRecord[] = [];

    for (let i = 0; i < count; i++) {
      const splCount = newBatchUniformSize ? newBatchSplPerBatch : (newBatchCustomSizes[i] || newBatchSplPerBatch);
      const batchNo = batches.filter(b => b.pt === newBatchPt).length + i + 1;
      created.push({
        id: `batch_${Date.now()}_${newBatchPt}_${batchNo}_${Math.random().toString(36).substring(2, 6)}`,
        batchName: `Batch ${batchNo} - ${newBatchPt}`,
        pt: newBatchPt,
        sampleCount: splCount,
        receivedShift: shiftType,
        receivedDate: date,
        station: 'Weighing',
        isFinished: false,
        createdAt: nowIso
      });
    }

    const updated = [...batches, ...created];
    setBatches(updated);
    saveStoredSampleBatches(updated);
    toast.success(`${count} batch untuk ${newBatchPt} berhasil didaftarkan di Weighing!`);
  };

  const handleToggleBatchFinish = (id: string) => {
    const updated = batches.map(b => b.id === id ? { ...b, isFinished: !b.isFinished } : b);
    setBatches(updated);
    saveStoredSampleBatches(updated);
  };

  // Auto Calculations
  // Jalur 1: Press Pellet ➔ EDXRF
  const edxrfTotal = epsC + epsD + epsE + epsF + epsG + epsH + s2Puma;
  const osEdxrf = Math.max(0, pressFinish - edxrfTotal);

  // Jalur 2: Weighing ➔ Fusion ➔ WDXRF
  const finishedBatches = batches.filter(b => b.isFinished);
  const outstandingBatches = batches.filter(b => !b.isFinished);
  const fusionFinishCount = finishedBatches.reduce((acc, b) => acc + b.sampleCount, 0);
  const fusionOsCount = outstandingBatches.reduce((acc, b) => acc + b.sampleCount, 0);

  // LOI
  const loiFinish = loiW2 + loiW4 + loiW5;
  const loiBal = Math.max(0, loiOs - loiFinish);

  // WDXRF
  const ztmATotal = ztmAPrd + ztmAExp + ztASml + ztmAGts + ztmARarr + ztmAVer + ztmAStd + ztmABlk;
  const ztmBTotal = ztmBPrd + ztmBExp + ztmBSml + ztmBGts + ztmBRarr + ztmBVer + ztmBStd + ztmBBlk;
  const wdxrfTotal = ztmATotal + ztmBTotal;
  const wdxrfBal = Math.max(0, fusionFinishCount - wdxrfTotal);

  // QC & Report
  const qcBal = Math.max(0, qcOs - qcFinish);
  const reportBal = Math.max(0, reportOs - reportDone);

  // Submit Quick Absence (Izin / Sakit) to /api/employee-leaves for Administrative Review
  const handleQuickAbsenceSubmit = async () => {
    if (!selectedEmpNik) {
      toast.error('Pilih nama karyawan yang izin/sakit terlebih dahulu.');
      return;
    }
    const emp = currentReguEmployees.find(e => String(e.nik || e.NIK).trim() === selectedEmpNik.trim());
    if (!emp) {
      toast.error('Data karyawan tidak ditemukan dalam daftar roster.');
      return;
    }

    const empName = emp.nama || emp.name || emp.Nama || 'Karyawan';
    setIsSubmittingAbsence(true);

    try {
      const parts = date.split('/');
      const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : date;

      const payload = {
        nik: selectedEmpNik,
        name: empName,
        jabatan: emp.jabatan || emp.position || 'Operator Preparation',
        section: emp.section || 'Preparation Laboratory',
        penempatan: 'Site Tanjung Buli',
        shift: `${regu} - ${shiftType}`,
        jamShift: shiftType === 'DAY' ? '07:00 - 19:00 WITA' : '19:00 - 07:00 WITA',
        awalAbsensi: isoDate,
        akhirAbsensi: isoDate,
        jumlah: 1,
        lamanyaIzin: '1 Hari Shift',
        kategoriIzin: absenceCategory,
        alasanAbsensi: absenceReason || `${absenceCategory} pada shift ${shiftType} (Dilaporkan oleh Foreman via Daily Performance)`,
        pengawasMengetahui: 'Foreman On Duty',
        acc: 'PENDING'
      };

      const res = await fetch('/api/employee-leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Gagal menyimpan izin ke database.');
      }

      // Auto update manpower counts
      if (absenceCategory === 'SAKIT') {
        setCrewSakit(prev => prev + 1);
        setCrewShift(prev => Math.max(0, prev - 1));
      } else {
        setCrewIzin(prev => prev + 1);
        setCrewShift(prev => Math.max(0, prev - 1));
      }

      setReportedAbsences(prev => [
        ...prev,
        {
          nik: selectedEmpNik,
          name: empName,
          category: absenceCategory,
          reason: absenceReason || `Dilaporkan shift ${shiftType}`,
          status: 'PENDING REVIEW ADM'
        }
      ]);

      toast.success(`Tiket ${absenceCategory} untuk ${empName} berhasil dikirim ke Tim Administrasi untuk direview!`);
      setSelectedEmpNik('');
      setAbsenceReason('');
      setShowAbsenceDialog(false);
    } catch (err: any) {
      console.error('Error submitting absence:', err);
      toast.error(`Gagal mencatat izin: ${err.message}`);
    } finally {
      setIsSubmittingAbsence(false);
    }
  };

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
        crew: { 
          shift: crewShift, 
          bantn: crewBantn, 
          lab: crewShift, 
          cuti: crewCuti, 
          alpa: 0, 
          izin: crewIzin, 
          sakit: crewSakit, 
          total: crewShift + crewBantn + crewCuti + crewIzin + crewSakit 
        }
      },
      sampleReceived: {
        gc: { shift: pulpDryReceived, day: pulpDryReceived, wkly: pulpDryReceived },
        prod: { shift: prodShift, rc: prodRc, ra: prodRa, day: prodShift, wkly: prodShift },
        exp: { shift: expShift, day: expShift, wkly: expShift },
        smelter: { shift: smelterShift, day: smelterShift, wkly: smelterShift }
      },
      pressPowder: {
        received: { shift: pulpDryReceived, day: pulpDryReceived, wkly: pulpDryReceived },
        finish: { shift: pressFinish, day: pressFinish, wkly: pressFinish }
      },
      edxrf: {
        epsC, epsD, epsE, epsF, epsG, epsH, s2Puma,
        shift: edxrfTotal, day: edxrfTotal, wkly: edxrfTotal
      },
      fuseBead: {
        osExp: fusionOsCount,
        finishShift: fusionFinishCount,
        finishDay: fusionFinishCount,
        finishWkly: fusionFinishCount,
        balExp: fusionOsCount
      },
      loi: {
        os: loiOs,
        w2: loiW2, w4: loiW4, w5: loiW5,
        finLoiShift: loiFinish, finLoiDay: loiFinish, finLoiWkly: 0,
        bal: loiBal
      },
      wdxrf: {
        osExp: wdxrfBal,
        zetiumA: {
          prod: ztmAPrd, exp: ztmAExp, smelt: ztASml, gts: ztmAGts, rarr: ztmARarr, ver: ztmAVer, std: ztmAStd, blank: ztmABlk,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600" />
              Input Log Daily Performance Shift Baru
            </h3>
            <p className="text-xs text-slate-500">
              Penginputan terstruktur per-stasiun oleh Foreman dengan otomasi antrean & sinkronisasi roster
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ROLE SELECTOR BAR (Persona Pengawas) */}
        <div className="px-5 py-2.5 bg-teal-50/50 dark:bg-teal-950/20 border-b border-teal-100 dark:border-teal-900/40 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-800 dark:text-teal-300">
            <Shield className="w-3.5 h-3.5" />
            <span>Pilih Tanggung Jawab / Peran Anda:</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-teal-200/60 dark:border-teal-800 text-xs">
            {[
              { id: 'all', label: 'Semua Stasiun (Admin/Spv)' },
              { id: 'foreman_gc', label: '1. GC & EDXRF' },
              { id: 'foreman_weighing', label: '2. Monitoring & Weighing/LOI' },
              { id: 'foreman_wdxrf', label: '3. Fusion & WDXRF' },
            ].map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRoleMode(r.id as any);
                  if (r.id === 'foreman_gc') setActiveTab('gc_edxrf');
                  else if (r.id === 'foreman_weighing') setActiveTab('weighing_loi');
                  else if (r.id === 'foreman_wdxrf') setActiveTab('fusion_wdxrf');
                }}
                className={`px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-all ${
                  roleMode === r.id
                    ? 'bg-teal-600 text-white shadow-sm font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20 px-4 gap-1 text-xs font-semibold overflow-x-auto scrollbar-none">
          {[
            { id: 'info', label: '1. Shift & Manpower Roster', icon: <Users className="w-3.5 h-3.5" />, visible: true },
            { id: 'gc_edxrf', label: '2. Jalur 1: Press Pellet & EDXRF', icon: <Layers className="w-3.5 h-3.5" />, visible: roleMode === 'all' || roleMode === 'foreman_gc' },
            { id: 'weighing_loi', label: '3. Jalur 2: Weighing (Batch) & LOI', icon: <Flame className="w-3.5 h-3.5" />, visible: roleMode === 'all' || roleMode === 'foreman_weighing' },
            { id: 'fusion_wdxrf', label: '4. Jalur 2: Fusion Bead & WDXRF', icon: <Cpu className="w-3.5 h-3.5" />, visible: roleMode === 'all' || roleMode === 'foreman_wdxrf' },
            { id: 'qc', label: '5. QC & Pelaporan CoA', icon: <FileCheck className="w-3.5 h-3.5" />, visible: roleMode === 'all' },
          ].filter(t => t.visible).map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-1.5 py-3 px-3 border-b-2 cursor-pointer transition-all whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* TAB 1: SHIFT & MANPOWER ROSTER */}
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
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Shift / Regu</label>
                  <select
                    value={regu}
                    onChange={e => setRegu(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white cursor-pointer font-bold"
                  >
                    <option value="A">Shift A</option>
                    <option value="B">Shift B</option>
                    <option value="C">Shift C</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Waktu Shift</label>
                  <select
                    value={shiftType}
                    onChange={e => setShiftType(e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-white cursor-pointer"
                  >
                    <option value="DAY">DAY (Pagi: 07:00 - 19:00 WIT)</option>
                    <option value="NIGHT">NIGHT (Malam: 19:00 - 07:00 WIT)</option>
                    <option value="LS">LS (Long Shift: 07:00 - 24:00 WIT)</option>
                  </select>
                </div>
              </div>

              {/* Roster Live Sync Banner */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="w-4 h-4 text-teal-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-white">
                      Sinkronisasi Roster Regu {regu}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {isRosterLoading ? 'Memuat data roster...' : `Terdata ${currentReguEmployees.length} karyawan terdaftar di Regu ${regu}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAbsenceDialog(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm cursor-pointer transition-all"
                >
                  <Stethoscope className="w-3.5 h-3.5" />
                  <span>+ Catat Izin / Sakit (Review ADM)</span>
                </button>
              </div>

              {/* Quick Absence Dialog */}
              {showAbsenceDialog && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Pelaporan Izin/Sakit Karyawan (Diteruskan ke Tim Administrasi)
                    </span>
                    <button 
                      type="button"
                      onClick={() => setShowAbsenceDialog(false)}
                      className="text-amber-700 hover:text-amber-900 dark:text-amber-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="text-[10px] font-semibold text-amber-900 dark:text-amber-200">Pilih Anggota Regu {regu}</label>
                      <select
                        value={selectedEmpNik}
                        onChange={e => setSelectedEmpNik(e.target.value)}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-xs"
                      >
                        <option value="">-- Pilih Karyawan --</option>
                        {currentReguEmployees.map(emp => (
                          <option key={emp.nik || emp.NIK} value={emp.nik || emp.NIK}>
                            {emp.nama || emp.name || emp.Nama} ({emp.nik || emp.NIK}) - {emp.jabatan || 'Crew'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-amber-900 dark:text-amber-200">Kategori Absensi</label>
                      <select
                        value={absenceCategory}
                        onChange={e => setAbsenceCategory(e.target.value as any)}
                        className="w-full mt-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-xs font-bold"
                      >
                        <option value="SAKIT">Sakit (Dengan/Tanpa Surat Dokter)</option>
                        <option value="IZIN">Izin Keperluan Pribadi / Mendesak</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-amber-900 dark:text-amber-200">Keterangan / Alasan</label>
                      <input
                        type="text"
                        value={absenceReason}
                        onChange={e => setAbsenceReason(e.target.value)}
                        placeholder="Contoh: Demam tinggi, izin keperluan keluarga mendesak"
                        className="w-full mt-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={isSubmittingAbsence}
                      onClick={handleQuickAbsenceSubmit}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingAbsence ? 'Mengirim...' : 'Kirim Tiket ke Administrasi'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Reported Absences List */}
              {reportedAbsences.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Tiket Izin/Sakit Shift Ini (Pending Review ADM):
                  </span>
                  <div className="space-y-1">
                    {reportedAbsences.map((ab, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {ab.name} ({ab.nik})
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ab.category === 'SAKIT' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {ab.category}
                          </span>
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded">
                            {ab.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SDM Counts */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Rekapitulasi SDM (Manpower) Shift</span>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium">Staff Hadir</label>
                    <input 
                      type="number" 
                      value={staffShift} 
                      onChange={e => setStaffShift(Number(e.target.value))}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium">Staff Cuti</label>
                    <input 
                      type="number" 
                      value={staffCuti} 
                      onChange={e => setStaffCuti(Number(e.target.value))}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium text-emerald-600 font-bold">Crew Hadir</label>
                    <input 
                      type="number" 
                      value={crewShift} 
                      onChange={e => setCrewShift(Number(e.target.value))}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 font-mono font-bold text-emerald-800 dark:text-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium">Crew Bantuan</label>
                    <input 
                      type="number" 
                      value={crewBantn} 
                      onChange={e => setCrewBantn(Number(e.target.value))}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium text-amber-600">Crew Izin</label>
                    <input 
                      type="number" 
                      value={crewIzin} 
                      onChange={e => setCrewIzin(Number(e.target.value))}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 font-mono text-amber-800 dark:text-amber-300"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium text-red-600">Crew Sakit</label>
                    <input 
                      type="number" 
                      value={crewSakit} 
                      onChange={e => setCrewSakit(Number(e.target.value))}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-300 dark:border-red-800 font-mono text-red-800 dark:text-red-300"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="text-[10px] text-slate-500 font-semibold block">Catatan Manpower & Perbantuan</label>
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

          {/* TAB 2: JALUR 1 - GC & EDXRF (SINGLE ENTRY DI PRESS PELLET) */}
          {activeTab === 'gc_edxrf' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60">
                <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-teal-600" />
                  Jalur 1: Grade Control Pit (Press Pellet ➔ Antrean EDXRF)
                </span>
                <p className="text-[11px] text-teal-700 dark:text-teal-400 mt-0.5">
                  Input 1x di stasiun Press Pellet (dari preparasi kering ke lab). Pelet selesai dipress otomatis menjadi antrean EDXRF dan dikurangi hasil finish scan per unit.
                </p>
              </div>

              {/* Input 1x: Masuk ke Press Pellet */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    1. Pulp Masuk Lab dari Prep Kering (1x Entry)
                  </label>
                  <p className="text-[10px] text-slate-500">Jumlah kantong sampel serbuk kering diserahterimakan ke lab</p>
                  <input 
                    type="number" 
                    value={pulpDryReceived} 
                    onChange={e => {
                      const val = Number(e.target.value);
                      setPulpDryReceived(val);
                      setPressFinish(val); // default sync
                    }}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono font-bold text-slate-800 dark:text-white"
                  />
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                    2. Press Powder Selesai Dipress (Finish Press)
                  </label>
                  <p className="text-[10px] text-slate-500">Otomatis menjadi antrean masuk instrumen EDXRF</p>
                  <input 
                    type="number" 
                    value={pressFinish} 
                    onChange={e => setPressFinish(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 font-mono font-bold text-teal-600 dark:text-teal-400"
                  />
                </div>
              </div>

              {/* EDXRF Run Per Mesin */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    3. Hasil Scan Selesai per Mesin EDXRF
                  </span>
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-300">
                    Total Finish EDXRF: {edxrfTotal} sampel
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {[
                    ['Epsilon C', epsC, setEpsC], 
                    ['Epsilon D', epsD, setEpsD], 
                    ['Epsilon E', epsE, setEpsE], 
                    ['Epsilon F', epsF, setEpsF],
                    ['Epsilon G', epsG, setEpsG], 
                    ['Epsilon H', epsH, setEpsH], 
                    ['S2 Puma', s2Puma, setS2Puma]
                  ].map(([name, val, setter]: any) => (
                    <div key={name} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                      <label className="text-[10px] text-slate-500 block font-medium">{name}</label>
                      <input 
                        type="number" 
                        value={val} 
                        onChange={e => setter(Number(e.target.value))}
                        className="w-full mt-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-center font-bold"
                      />
                    </div>
                  ))}

                  {/* Summary Box OS EDXRF */}
                  <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex flex-col justify-center items-center text-center">
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">OS EDXRF Sisa</span>
                    <span className="text-base font-extrabold text-teal-700 dark:text-teal-300 font-mono">
                      {osEdxrf} spl
                    </span>
                    <span className="text-[9px] text-teal-500">(Pelet belum dirun)</span>
                  </div>
                </div>
              </div>

              {/* Formula Explanation Callout */}
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
                <span>Kalkulasi Otomatis Saldo Antrean:</span>
                <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                  {pressFinish} pelet selesai dipress − {edxrfTotal} selesai scan = {osEdxrf} pelet OS
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: JALUR 2 HULU - MONITORING, WEIGHING & LOI */}
          {activeTab === 'weighing_loi' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60">
                <span className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-blue-600" />
                  Jalur 2 Hulu: Monitoring Sampel Masuk, Pendaftaran Batch Weighing & LOI
                </span>
                <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                  Pendaftaran identitas batch (PT, jumlah batch, ukuran sampel) hanya dilakukan 1x di stasiun Weighing.
                </p>
              </div>

              {/* Sample Intake Section */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Penerimaan Sampel Masuk (Intake)</span>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium">Eksplorasi (EXP Bor)</label>
                    <input 
                      type="number" 
                      value={expShift} 
                      onChange={e => setExpShift(Number(e.target.value))}
                      className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium">Produksi Tambang (RC/RA)</label>
                    <input 
                      type="number" 
                      value={prodShift} 
                      onChange={e => setProdShift(Number(e.target.value))}
                      className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium">Smelter Samples</label>
                    <input 
                      type="number" 
                      value={smelterShift} 
                      onChange={e => setSmelterShift(Number(e.target.value))}
                      className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* 1x Entry Batch Pendaftaran Stasiun Weighing */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-teal-600" />
                    Pendaftaran Batch Masuk Stasiun Weighing (1x Input Hulu)
                  </span>
                  <span className="text-[11px] text-teal-700 dark:text-teal-400 font-bold">
                    Terdaftar: {batches.length} batch ({batches.reduce((a, b) => a + b.sampleCount, 0)} spl)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium">Asal PT / Unit</label>
                    <select
                      value={newBatchPt}
                      onChange={e => setNewBatchPt(e.target.value)}
                      className="w-full mt-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold cursor-pointer"
                    >
                      <option value="TBP">PT TBP (Trimegah)</option>
                      <option value="GPS">PT GPS (Gane Permai)</option>
                      <option value="MMP">PT MMP (Megah Mulia)</option>
                      <option value="KPS">PT KPS (Karya Prima)</option>
                      <option value="EXP">Eksplorasi (EXP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-medium">Jumlah Batch Masuk</label>
                    <input 
                      type="number" 
                      min={1} 
                      max={20}
                      value={newBatchCount} 
                      onChange={e => setNewBatchCount(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-center font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2 flex flex-col justify-center">
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-2">
                      <input 
                        type="checkbox"
                        checked={newBatchUniformSize}
                        onChange={e => setNewBatchUniformSize(e.target.checked)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer w-4 h-4"
                      />
                      <span>Jumlah sampel tiap batch sama ({newBatchSplPerBatch} spl/batch)</span>
                    </label>
                  </div>
                </div>

                {!newBatchUniformSize && (
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <span className="text-[10px] text-slate-500 font-semibold block">Tentukan Ukuran Sampel Tiap Batch:</span>
                    <div className="flex flex-wrap gap-2">
                      {newBatchCustomSizes.map((sz, idx) => (
                        <div key={idx} className="flex items-center gap-1 text-[11px]">
                          <span className="text-slate-400">B#{idx+1}:</span>
                          <input 
                            type="number"
                            value={sz}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setNewBatchCustomSizes(prev => {
                                const next = [...prev];
                                next[idx] = val;
                                return next;
                              });
                            }}
                            className="w-14 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-center font-mono font-bold"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddBatch}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-sm cursor-pointer transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Daftarkan {newBatchCount} Batch ke Stasiun Weighing</span>
                  </button>
                </div>
              </div>

              {/* LOI Furnace Section */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pembakaran Stasiun LOI (Loss on Ignition)
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-500">LOI Saldo Awal (OS)</label>
                    <input 
                      type="number" 
                      value={loiOs} 
                      onChange={e => setLoiOs(Number(e.target.value))}
                      className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Furnace W2</label>
                    <input 
                      type="number" 
                      value={loiW2} 
                      onChange={e => setLoiW2(Number(e.target.value))}
                      className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Furnace W4</label>
                    <input 
                      type="number" 
                      value={loiW4} 
                      onChange={e => setLoiW4(Number(e.target.value))}
                      className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Furnace W5</label>
                    <input 
                      type="number" 
                      value={loiW5} 
                      onChange={e => setLoiW5(Number(e.target.value))}
                      className="w-full mt-0.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                  <span>Hasil Selesai LOI: <strong>{loiFinish} sampel</strong></span>
                  <span>Saldo Sisa LOI (Bal): <strong>{loiBal} sampel</strong></span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: JALUR 2 HILIR - FUSION & WDXRF */}
          {activeTab === 'fusion_wdxrf' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  Jalur 2 Hilir: Checklist Finish Fusion & Spektrometri WDXRF
                </span>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">
                  Foreman WDXRF cukup mencentang batch yang selesai dilebur di Fusion. Sisa batch yang belum dicentang otomatis menjadi OS Fusion & Balance.
                </p>
              </div>

              {/* Checklist Batch Fusion */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-teal-600" />
                    Checklist Penyelesaian Batch di Stasiun Fusion
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-600 font-bold">Finish: {fusionFinishCount} spl</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-amber-600 font-bold">OS Sisa: {fusionOsCount} spl</span>
                  </div>
                </div>

                {batches.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-3 text-center">
                    Belum ada batch yang didaftarkan di stasiun Weighing.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {batches.map(b => (
                      <div 
                        key={b.id}
                        onClick={() => handleToggleBatchFinish(b.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                          b.isFinished 
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-teal-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {b.isFinished ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          )}
                          <div>
                            <span className="font-bold block leading-tight">{b.batchName}</span>
                            <span className="text-[10px] text-slate-500">{b.sampleCount} sampel • PT {b.pt}</span>
                          </div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          b.isFinished ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {b.isFinished ? 'FINISHED' : 'ANTREAN'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* WDXRF Runs: Zetium A & B */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pengukuran Spektrometri WDXRF (Zetium A & B)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Zetium A */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-600">Zetium A</span>
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-300">Total: {ztmATotal}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                      <div>
                        <label className="text-slate-500">Produksi</label>
                        <input type="number" value={ztmAPrd} onChange={e => setZtmAPrd(Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                      </div>
                      <div>
                        <label className="text-slate-500">Eksplorasi</label>
                        <input type="number" value={ztmAExp} onChange={e => setZtmAExp(Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                      </div>
                      <div>
                        <label className="text-slate-500">Smelter</label>
                        <input type="number" value={ztASml} onChange={e => setZtmASml(Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                      </div>
                      <div>
                        <label className="text-slate-500">GTS</label>
                        <input type="number" value={ztmAGts} onChange={e => setZtmAGts(Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                      </div>
                    </div>
                  </div>

                  {/* Zetium B */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-600">Zetium B</span>
                      <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">Total: {ztmBTotal}</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                      <div>
                        <label className="text-slate-500">Produksi</label>
                        <input type="number" value={ztmBPrd} onChange={e => setZtmBPrd(Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                      </div>
                      <div>
                        <label className="text-slate-500">Eksplorasi</label>
                        <input type="number" value={ztmBExp} onChange={e => setZtmBExp(Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                      </div>
                      <div>
                        <label className="text-slate-500">Smelter</label>
                        <input type="number" value={ztmBSml} onChange={e => setZtmBSml(Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                      </div>
                      <div>
                        <label className="text-slate-500">GTS</label>
                        <input type="number" value={ztmBGts} onChange={e => setZtmBGts(Number(e.target.value))} className="w-full mt-0.5 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Balance WDXRF */}
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-xs text-teal-800 dark:text-teal-300 flex items-center justify-between">
                  <span>Total Finish Spektrometri WDXRF: <strong>{wdxrfTotal} run</strong></span>
                  <span>Saldo Sisa Bead Antrean (Bal): <strong>{wdxrfBal} bead</strong></span>
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
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-500/20 cursor-pointer transition-all"
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
