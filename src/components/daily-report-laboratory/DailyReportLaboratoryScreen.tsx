import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, Calendar, Users, Layers, Flame, Cpu, 
  FileCheck, FileSpreadsheet, Save, Sparkles, Building2, 
  CheckSquare, Square, Plus, AlertCircle, Stethoscope, 
  Send, X, CheckCircle2, ChevronRight, BarChart3, RefreshCw,
  Clock, Shield, Beaker, Check, HelpCircle, Trash2, Info,
  Tag, Compass, Factory, Mountain, GitFork, ChevronDown,
  ChevronUp, Lock, SlidersHorizontal, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { getRosterData } from '../../sheets-api';
import { 
  DailyPerformanceRecord, 
  ShiftType, 
  ReguType 
} from '../daily-performance/daily-performance-types';
import { 
  getStoredRecords, 
  saveStoredRecords 
} from '../daily-performance/daily-performance-utils';
import { 
  getStoredSampleBatches, 
  saveStoredSampleBatches,
  getStoredDirectSampleIntakes,
  saveStoredDirectSampleIntakes,
  getPreviousShiftRecord,
  getStoredBalanceAuditLogs
} from '../daily-performance-v2/daily-performance-v2-utils';
import { 
  SampleBatchRecord, 
  WEIGHING_SAMPLE_CATEGORIES, 
  getSampleGroup, 
  SampleGroupType,
  DirectSampleIntakeRecord,
  BalanceOverrideAuditLog,
  StationTracebackContext,
  DiscrepancyRootCauseType
} from '../daily-performance-v2/daily-performance-v2-types';
import { BalanceOverrideModal } from './BalanceOverrideModal';
import { TracebackSchemeModal } from './TracebackSchemeModal';
import { ExcelClipboardPasteModal } from './ExcelClipboardPasteModal';
import { ParsedClipboardResult, StandardTableRow } from './excelClipboardParser';

export type LabReportSubMenu = 'weighing_fuse_loi' | 'press_edxrf' | 'wdxrf' | 'qc_data' | 'reporting';

interface DailyReportLaboratoryScreenProps {
  inspectorName?: string;
  inspectorNik?: string;
  userPt?: string;
  onBack: () => void;
  onNavigateToDailyPerformance?: () => void;
}

export const DailyReportLaboratoryScreen: React.FC<DailyReportLaboratoryScreenProps> = ({
  inspectorName = 'Foreman On Duty',
  inspectorNik = 'guest',
  userPt = 'TBP',
  onBack,
  onNavigateToDailyPerformance
}) => {
  // Navigation Sub-menu
  const [activeSubMenu, setActiveSubMenu] = useState<LabReportSubMenu>('weighing_fuse_loi');

  // Header Shift State
  const [date, setDate] = useState(() => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  });
  const [week, setWeek] = useState(43);
  const [regu, setRegu] = useState<ReguType>('A');
  const [shiftType, setShiftType] = useState<ShiftType>('DAY');

  // Existing Records Store & Previous Shift Reference
  const [allRecords, setAllRecords] = useState<DailyPerformanceRecord[]>(() => getStoredRecords([]));

  const previousShiftRecord = useMemo(() => {
    return getPreviousShiftRecord(allRecords, date, shiftType);
  }, [allRecords, date, shiftType]);

  // Track station balance overrides
  const [overriddenStations, setOverriddenStations] = useState<Record<string, { value: number; by: string; time: string; rootCause?: DiscrepancyRootCauseType; isReconciled?: boolean }>>({});

  // Override Modal State
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [overrideStationKey, setOverrideStationKey] = useState<'press' | 'edxrf' | 'fusion' | 'loi' | 'wdxrf' | 'qc' | 'report'>('press');
  const [overrideStationName, setOverrideStationName] = useState('Meja Press Pellet');
  const [overrideCurrentValue, setOverrideCurrentValue] = useState(0);
  const [overrideSetter, setOverrideSetter] = useState<((val: number) => void) | null>(null);

  // Traceback Scheme Modal
  const [tracebackModalOpen, setTracebackModalOpen] = useState(false);

  // Excel Smart Paste Modal
  const [isExcelPasteModalOpen, setIsExcelPasteModalOpen] = useState(false);

  // Manpower State
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

  // Quick Absence Dialog
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

  // ==================== SUB-MENU 1: WEIGHING, FUSE & LOI ====================
  // Mode Pendaftaran Sampel: Eksplorasi (Dengan Batching) vs Non-Eksplorasi (Direct Intake)
  const [sampleIntakeMode, setSampleIntakeMode] = useState<'exploration' | 'non_exploration'>('exploration');

  // Direct Intakes (Non-Exploration: Smelter, Production, Khusus)
  const [directIntakes, setDirectIntakes] = useState<DirectSampleIntakeRecord[]>(() => getStoredDirectSampleIntakes());
  const [directPtCode, setDirectPtCode] = useState('SMELTER MSP');
  const [directCount, setDirectCount] = useState<number>(40);
  const [directNotes, setDirectNotes] = useState<string>('');

  // Batch Management di Weighing (Khusus Eksplorasi)
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

  // Accordion state for WDXRF Outstanding Batches
  const [expandedWdxrfGroups, setExpandedWdxrfGroups] = useState<Record<string, boolean>>({});
  const toggleWdxrfGroup = (key: string) => {
    setExpandedWdxrfGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ==================== SUB-MENU 2: PRESS & EDXRF ====================
  // Press Pellet
  const [pressOsAwal, setPressOsAwal] = useState(0);
  const [pulpDryReceived, setPulpDryReceived] = useState(450); // Dari Prep Kering ke Lab
  const [pressFinish, setPressFinish] = useState(450); // Selesai dipress

  // EDXRF
  const [edxrfOsAwal, setEdxrfOsAwal] = useState(0); // Pelet sisa shift lalu
  const [epsC, setEpsC] = useState(60);
  const [epsD, setEpsD] = useState(0);
  const [epsE, setEpsE] = useState(80);
  const [epsF, setEpsF] = useState(75);
  const [epsG, setEpsG] = useState(70);
  const [epsH, setEpsH] = useState(90);
  const [s2Puma, setS2Puma] = useState(40);

  // ==================== SUB-MENU 3: WDXRF ====================
  // Zetium A
  const [ztmAPrd, setZtmAPrd] = useState(30);
  const [ztmAExp, setZtmAExp] = useState(40);
  const [ztASml, setZtmASml] = useState(10);
  const [ztmAGts, setZtmAGts] = useState(0);
  const [ztmARarr, setZtmARarr] = useState(15);
  const [ztmAVer, setZtmAVer] = useState(5);
  const [ztmAStd, setZtmAStd] = useState(10);
  const [ztmABlk, setZtmABlk] = useState(4);

  // Zetium B
  const [ztmBPrd, setZtmBPrd] = useState(0);
  const [ztmBExp, setZtmBExp] = useState(80);
  const [ztmBSml, setZtmBSml] = useState(5);
  const [ztmBGts, setZtmBGts] = useState(0);
  const [ztmBRarr, setZtmBRarr] = useState(10);
  const [ztmBVer, setZtmBVer] = useState(5);
  const [ztmBStd, setZtmBStd] = useState(20);
  const [ztmBBlk, setZtmBBlk] = useState(4);

  // ==================== SUB-MENU 4: QC DATA ====================
  const [qcOs, setQcOs] = useState(0);
  const [qcFinish, setQcFinish] = useState(0);

  // ==================== SUB-MENU 5: REPORTING ====================
  const [reportOs, setReportOs] = useState(0);
  const [reportDone, setReportDone] = useState(0);

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

  // Adjust custom sizes
  useEffect(() => {
    const count = Math.max(1, Math.min(20, newBatchCount || 1));
    setNewBatchCustomSizes(prev => {
      if (prev.length === count) return prev;
      const next = [...prev];
      while (next.length < count) next.push(newBatchSplPerBatch || 24);
      return next.slice(0, count);
    });
  }, [newBatchCount, newBatchSplPerBatch]);

  // ==================== STATISTIK SAMPEL TERDAFTAR (ANTI-DUPLIKASI) ====================
  // Mengelompokkan riwayat sampel yang sudah terdaftar berdasarkan 4 Kategori Resmi:
  // 1. Exploration: TBP, GPS, JMP, GTS, BJM, OAM, SCANDIUM
  // 2. Smelter: SMELTER MSP, SMELTER HPL, SMELTER HJF, SMELTER ONC, SMELTER KPS
  // 3. Production: QC LIM, QC SAP, QC BLD, QC BOULDER
  // 4. Khusus: KHUSUS (Sample Accidental)
  const registeredStats = useMemo(() => {
    const summaryByPt: Record<string, { batchCount: number; sampleCount: number; group: SampleGroupType }> = {};
    let expBatches = 0, expSamples = 0;
    let smelterBatches = 0, smelterSamples = 0;
    let prodBatches = 0, prodSamples = 0;
    let khususBatches = 0, khususSamples = 0;

    batches.forEach(b => {
      const ptKey = String(b.pt || '').trim().toUpperCase();
      const grp = b.sampleGroup || getSampleGroup(ptKey);
      if (!summaryByPt[ptKey]) {
        summaryByPt[ptKey] = { batchCount: 0, sampleCount: 0, group: grp };
      }
      summaryByPt[ptKey].batchCount += 1;
      summaryByPt[ptKey].sampleCount += (b.sampleCount || 24);

      if (grp === 'Exploration') {
        expBatches += 1;
        expSamples += (b.sampleCount || 24);
      } else if (grp === 'Smelter') {
        smelterBatches += 1;
        smelterSamples += (b.sampleCount || 24);
      } else if (grp === 'Production') {
        prodBatches += 1;
        prodSamples += (b.sampleCount || 24);
      } else if (grp === 'Khusus') {
        khususBatches += 1;
        khususSamples += (b.sampleCount || 24);
      }
    });

    return {
      summaryByPt,
      expBatches, expSamples,
      smelterBatches, smelterSamples,
      prodBatches, prodSamples,
      khususBatches, khususSamples,
      totalBatches: batches.length,
      totalSamples: batches.reduce((acc, b) => acc + (b.sampleCount || 24), 0)
    };
  }, [batches]);

  // Auto-sync initial balances from previous shift record
  useEffect(() => {
    if (previousShiftRecord) {
      if (!overriddenStations['press']) {
        setPressOsAwal(previousShiftRecord.pressPowder?.bal ?? 0);
      }
      if (!overriddenStations['edxrf']) {
        setEdxrfOsAwal(previousShiftRecord.edxrf?.bal ?? 0);
      }
      if (!overriddenStations['loi']) {
        setLoiOs(previousShiftRecord.loi?.bal ?? 100);
      }
      if (!overriddenStations['qc']) {
        setQcOs(previousShiftRecord.qc?.bal ?? 0);
      }
      if (!overriddenStations['report']) {
        setReportOs(previousShiftRecord.report?.bal ?? 0);
      }
    }
  }, [previousShiftRecord, overriddenStations]);

  // Sample intake values auto-sum from registered batches + direct intakes (Non-Exploration)
  const directSmelterCount = useMemo(() => {
    return directIntakes
      .filter(d => d.group === 'Smelter')
      .reduce((acc, d) => acc + d.sampleCount, 0);
  }, [directIntakes]);

  const directProdCount = useMemo(() => {
    return directIntakes
      .filter(d => d.group === 'Production')
      .reduce((acc, d) => acc + d.sampleCount, 0);
  }, [directIntakes]);

  const directKhususCount = useMemo(() => {
    return directIntakes
      .filter(d => d.group === 'Khusus')
      .reduce((acc, d) => acc + d.sampleCount, 0);
  }, [directIntakes]);

  const expShift = registeredStats.expSamples;
  const smelterShift = registeredStats.smelterSamples + directSmelterCount;
  const prodShift = registeredStats.prodSamples + directProdCount;
  const khususShift = registeredStats.khususSamples + directKhususCount;

  // ==================== CALCULATIONS & AUTO CASCADING ====================
  // 1. Press & EDXRF
  const totalPressLoad = pressOsAwal + pulpDryReceived;
  const osPress = Math.max(0, totalPressLoad - pressFinish);

  const edxrfReceived = pressFinish; // HANYA yang finished di press yang masuk EDXRF
  const totalEdxrfLoad = edxrfOsAwal + edxrfReceived;
  const edxrfTotal = epsC + epsD + epsE + epsF + epsG + epsH + s2Puma;
  const osEdxrf = Math.max(0, totalEdxrfLoad - edxrfTotal);

  // 2. Weighing & Fusion
  const finishedBatches = batches.filter(b => b.isFinished || b.fusionFinished);
  const outstandingBatches = batches.filter(b => !b.isFinished && !b.fusionFinished);
  const fusionFinishCount = finishedBatches.reduce((acc, b) => acc + b.sampleCount, 0);
  const fusionOsCount = outstandingBatches.reduce((acc, b) => acc + b.sampleCount, 0);

  // LOI
  const loiFinish = loiW2 + loiW4 + loiW5;
  const loiBal = Math.max(0, loiOs - loiFinish);

  // 3. WDXRF Zetium
  const ztmATotal = ztmAPrd + ztmAExp + ztASml + ztmAGts + ztmARarr + ztmAVer + ztmAStd + ztmABlk;
  const ztmBTotal = ztmBPrd + ztmBExp + ztmBSml + ztmBGts + ztmBRarr + ztmBVer + ztmBStd + ztmBBlk;
  const wdxrfManualTotal = ztmATotal + ztmBTotal;

  // WDXRF Candidate Batches (Hasil Finish Fusion)
  const candidateFusionBatches = useMemo(() => {
    return batches.filter(b => b.isFinished || b.fusionFinished);
  }, [batches]);

  const wdxrfGroupedBatches = useMemo(() => {
    const map = new Map<string, {
      pt: string;
      group: SampleGroupType;
      totalBatches: number;
      totalSamples: number;
      finishedBatches: number;
      finishedSamples: number;
      outstandingBatches: number;
      outstandingSamples: number;
      batchList: SampleBatchRecord[];
    }>();

    candidateFusionBatches.forEach(b => {
      const ptKey = b.pt.toUpperCase().trim();
      const grp = b.sampleGroup || getSampleGroup(ptKey);
      const isWdxrfDone = Boolean(b.wdxrfFinished);
      const cur = map.get(ptKey) || {
        pt: ptKey,
        group: grp,
        totalBatches: 0,
        totalSamples: 0,
        finishedBatches: 0,
        finishedSamples: 0,
        outstandingBatches: 0,
        outstandingSamples: 0,
        batchList: []
      };

      cur.totalBatches += 1;
      cur.totalSamples += b.sampleCount;
      if (isWdxrfDone) {
        cur.finishedBatches += 1;
        cur.finishedSamples += b.sampleCount;
      } else {
        cur.outstandingBatches += 1;
        cur.outstandingSamples += b.sampleCount;
      }
      cur.batchList.push(b);
      map.set(ptKey, cur);
    });

    return Array.from(map.values());
  }, [candidateFusionBatches]);

  const wdxrfBatchFinishCount = useMemo(() => {
    return candidateFusionBatches
      .filter(b => b.wdxrfFinished)
      .reduce((acc, b) => acc + b.sampleCount, 0);
  }, [candidateFusionBatches]);

  // Total WDXRF Total: Gunakan manual run jika ada, atau batch checklist jika dipilih
  const wdxrfTotal = Math.max(wdxrfManualTotal, wdxrfBatchFinishCount);
  const wdxrfBal = Math.max(0, fusionFinishCount - wdxrfTotal);

  // 4. QC Data (Cascading dari WDXRF Total)
  const qcReceived = wdxrfTotal;
  const totalQcLoad = qcOs + qcReceived;
  useEffect(() => {
    if (qcFinish === 0 && qcReceived > 0) {
      setQcFinish(qcReceived);
    }
  }, [qcReceived]);
  const qcBal = Math.max(0, totalQcLoad - qcFinish);

  // 5. Reporting (Cascading dari QC Finish)
  const reportReceived = qcFinish;
  const totalReportLoad = reportOs + reportReceived;
  useEffect(() => {
    if (reportDone === 0 && reportReceived > 0) {
      setReportDone(reportReceived);
    }
  }, [reportReceived]);
  const reportBal = Math.max(0, totalReportLoad - reportDone);

  // Helper info untuk PT yang sedang dipilih
  const currentSelectedPtInfo = useMemo(() => {
    const ptKey = newBatchPt.toUpperCase().trim();
    const existing = registeredStats.summaryByPt[ptKey];
    const group = getSampleGroup(ptKey);
    return {
      ptKey,
      group,
      batchCount: existing?.batchCount || 0,
      sampleCount: existing?.sampleCount || 0,
      nextBatchNumber: (existing?.batchCount || 0) + 1
    };
  }, [newBatchPt, registeredStats]);

  // Batch actions
  const handleAddBatch = () => {
    const count = Math.max(1, Math.min(20, newBatchCount || 1));
    const nowIso = new Date().toISOString();
    const created: SampleBatchRecord[] = [];
    const group = getSampleGroup(newBatchPt);

    const existingCount = batches.filter(b => b.pt.toUpperCase() === newBatchPt.toUpperCase()).length;

    for (let i = 0; i < count; i++) {
      const splCount = newBatchUniformSize ? newBatchSplPerBatch : (newBatchCustomSizes[i] || newBatchSplPerBatch);
      const batchNo = existingCount + i + 1;
      created.push({
        id: `batch_${Date.now()}_${newBatchPt}_${batchNo}_${Math.random().toString(36).substring(2, 6)}`,
        batchName: `Batch ${batchNo} - ${newBatchPt}`,
        pt: newBatchPt,
        sampleGroup: group,
        batchNumber: batchNo,
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
    window.dispatchEvent(new CustomEvent('preplab-batches-updated'));
    toast.success(`${count} batch untuk ${newBatchPt} (${count * newBatchSplPerBatch} spl) [${group}] berhasil didaftarkan!`);
  };

  const handleToggleBatchFinish = (id: string) => {
    const updated = batches.map(b => b.id === id ? { ...b, isFinished: !b.isFinished } : b);
    setBatches(updated);
    saveStoredSampleBatches(updated);
    window.dispatchEvent(new CustomEvent('preplab-batches-updated'));
  };

  const handleDeleteBatch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = batches.filter(b => b.id !== id);
    setBatches(updated);
    saveStoredSampleBatches(updated);
    window.dispatchEvent(new CustomEvent('preplab-batches-updated'));
    toast.info('Batch berhasil dihapus dari antrean.');
  };

  // Toggle finish WDXRF per batch
  const handleToggleBatchWdxrfFinish = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = batches.map(b => {
      if (b.id === id) {
        return { ...b, wdxrfFinished: !b.wdxrfFinished };
      }
      return b;
    });
    setBatches(updated);
    saveStoredSampleBatches(updated);
    window.dispatchEvent(new CustomEvent('preplab-batches-updated'));
  };

  // Direct Intake Handlers (Non-Exploration: Smelter, Production, Khusus)
  const handleAddDirectIntake = () => {
    if (directCount <= 0 || isNaN(directCount)) {
      toast.error('Jumlah sampel harus lebih besar dari 0');
      return;
    }
    const group = getSampleGroup(directPtCode);
    const nowIso = new Date().toISOString();
    const newRecord: DirectSampleIntakeRecord = {
      id: `direct_${Date.now()}_${directPtCode}_${Math.random().toString(36).substring(2, 6)}`,
      code: directPtCode,
      group,
      sampleCount: directCount,
      shift: shiftType,
      date,
      createdAt: nowIso,
      notes: directNotes.trim()
    };

    const updated = [...directIntakes, newRecord];
    setDirectIntakes(updated);
    saveStoredDirectSampleIntakes(updated);
    window.dispatchEvent(new CustomEvent('preplab-batches-updated'));
    toast.success(`Berhasil mencatat ${directCount} sampel masuk untuk ${directPtCode} [${group}]!`);
    setDirectCount(40);
    setDirectNotes('');
  };

  const handleDeleteDirectIntake = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = directIntakes.filter(d => d.id !== id);
    setDirectIntakes(updated);
    saveStoredDirectSampleIntakes(updated);
    window.dispatchEvent(new CustomEvent('preplab-batches-updated'));
    toast.info('Penerimaan sampel non-eksplorasi berhasil dihapus.');
  };

  // Smart Paste Handler from Excel Clipboard
  const handleApplyExcelData = (result: ParsedClipboardResult, selectedStations: string[]) => {
    let appliedCount = 0;
    let batchAddedCount = 0;
    let directIntakeAddedCount = 0;

    // 1. WEIGHING
    if (selectedStations.includes('weighing') && result.stations.weighing) {
      const st = result.stations.weighing;
      appliedCount++;
      const nowIso = new Date().toISOString();
      const newBatches: SampleBatchRecord[] = [];
      const newDirects: DirectSampleIntakeRecord[] = [];

      st.rows.forEach(r => {
        const row = r as StandardTableRow;
        if (!row.sample || row.sample.toUpperCase().includes('TOTAL')) return;
        const sampleName = row.sample.trim();
        const group = getSampleGroup(sampleName);

        // Eksplorasi -> daftarkan batch jika received > 0
        if (group === 'Exploration' && row.received > 0) {
          const splPerBatch = 24;
          const batchCount = Math.max(1, Math.ceil(row.received / splPerBatch));
          const existingCount = batches.filter(b => b.pt.toUpperCase() === sampleName.toUpperCase()).length;

          let remainingSpl = row.received;
          for (let i = 0; i < batchCount; i++) {
            const thisCount = i === batchCount - 1 ? remainingSpl : Math.min(splPerBatch, remainingSpl);
            remainingSpl -= thisCount;
            const batchNo = existingCount + i + 1;
            newBatches.push({
              id: `batch_${Date.now()}_${sampleName}_${batchNo}_${Math.random().toString(36).substring(2, 6)}`,
              batchName: `Batch ${batchNo} - ${sampleName}`,
              pt: sampleName,
              sampleGroup: group,
              batchNumber: batchNo,
              sampleCount: thisCount,
              receivedShift: shiftType,
              receivedDate: date,
              station: 'Weighing',
              isFinished: false,
              createdAt: nowIso
            });
          }
        } else if (row.received > 0) {
          // Non-eksplorasi -> direct intake
          newDirects.push({
            id: `direct_${Date.now()}_${sampleName}_${Math.random().toString(36).substring(2, 6)}`,
            code: sampleName,
            group,
            sampleCount: row.received,
            shift: shiftType,
            date,
            createdAt: nowIso,
            notes: `Imported via Excel Paste (OS: ${row.outstanding}, Fin: ${row.finished}, Bal: ${row.balance})`
          });
        }
      });

      if (newBatches.length > 0) {
        const updatedBatches = [...batches, ...newBatches];
        setBatches(updatedBatches);
        saveStoredSampleBatches(updatedBatches);
        batchAddedCount += newBatches.length;
      }

      if (newDirects.length > 0) {
        const updatedDirects = [...directIntakes, ...newDirects];
        setDirectIntakes(updatedDirects);
        saveStoredDirectSampleIntakes(updatedDirects);
        directIntakeAddedCount += newDirects.length;
      }

      if (newBatches.length > 0 || newDirects.length > 0) {
        window.dispatchEvent(new CustomEvent('preplab-batches-updated'));
      }
    }

    // 2. FUSED
    if (selectedStations.includes('fused') && result.stations.fused) {
      const st = result.stations.fused;
      appliedCount++;
      const totalFin = st.totals.finished ?? 0;
      if (totalFin > 0) {
        let remainingToMark = totalFin;
        let modified = false;
        const updated = batches.map(b => {
          if (!b.isFinished && remainingToMark >= b.sampleCount) {
            remainingToMark -= b.sampleCount;
            modified = true;
            return { ...b, isFinished: true };
          }
          return b;
        });
        if (modified) {
          setBatches(updated);
          saveStoredSampleBatches(updated);
          window.dispatchEvent(new CustomEvent('preplab-batches-updated'));
        }
      }
    }

    // 3. WD-XRF
    if (selectedStations.includes('wdxrf') && result.stations.wdxrf) {
      const st = result.stations.wdxrf;
      appliedCount++;
      if (st.extras?.ra !== undefined) setZtmARarr(st.extras.ra);
      if (st.extras?.verStd !== undefined) setZtmAVer(st.extras.verStd);
      if (st.extras?.rr !== undefined) setZtmBRarr(st.extras.rr);

      st.rows.forEach(r => {
        const row = r as StandardTableRow;
        const s = row.sample.toUpperCase();
        if (s.includes('PROD')) setZtmAPrd(row.finished);
        else if (s.includes('EXPL')) setZtmBExp(row.finished);
        else if (s.includes('SMELTER')) setZtmASml(row.finished);
        else if (s.includes('GTS')) setZtmAGts(row.finished);
      });
    }

    // 4. QC DATA
    if (selectedStations.includes('qc_data') && result.stations.qc_data) {
      const st = result.stations.qc_data;
      appliedCount++;
      if (st.totals.outstanding !== undefined) setQcOs(st.totals.outstanding);
      if (st.totals.finished !== undefined) setQcFinish(st.totals.finished);
    }

    // 5. PRESS POWDER
    if (selectedStations.includes('press') && result.stations.press) {
      const st = result.stations.press;
      appliedCount++;
      if (st.totals.outstanding !== undefined) setPressOsAwal(st.totals.outstanding);
      if (st.totals.received !== undefined) setPulpDryReceived(st.totals.received);
      if (st.totals.finished !== undefined) setPressFinish(st.totals.finished);
    }

    // 6. ED-XRF
    if (selectedStations.includes('edxrf') && result.stations.edxrf) {
      const st = result.stations.edxrf;
      appliedCount++;
      if (st.totals.outstanding !== undefined) setEdxrfOsAwal(st.totals.outstanding);
      const fin = st.totals.finished ?? 0;
      if (fin > 0) {
        const base = Math.floor(fin / 6);
        const rem = fin % 6;
        setEpsC(base + (rem > 0 ? 1 : 0));
        setEpsD(0);
        setEpsE(base + (rem > 1 ? 1 : 0));
        setEpsF(base + (rem > 2 ? 1 : 0));
        setEpsG(base + (rem > 3 ? 1 : 0));
        setEpsH(base + (rem > 4 ? 1 : 0));
        setS2Puma(base);
      }
    }

    // 7. MONITORING BEAD
    if (selectedStations.includes('monitoring_bead') && result.stations.monitoring_bead) {
      const st = result.stations.monitoring_bead;
      appliedCount++;
      if (st.extras?.stdBlank) {
        setZtmAStd(st.extras.stdBlank.jadi);
        setZtmABlk(st.extras.stdBlank.reject);
      }
    }

    // 8. LOI
    if (selectedStations.includes('loi') && result.stations.loi) {
      const st = result.stations.loi;
      appliedCount++;
      if (st.totals.outstanding !== undefined) setLoiOs(st.totals.outstanding);
      const fin = st.totals.finished ?? 0;
      if (fin > 0) {
        const part = Math.floor(fin / 3);
        const rem = fin % 3;
        setLoiW2(part + (rem > 0 ? 1 : 0));
        setLoiW4(part + (rem > 1 ? 1 : 0));
        setLoiW5(part);
      }
    }

    toast.success(
      `Berhasil menerapkan data ${appliedCount} stasiun dari Excel!` +
      (batchAddedCount > 0 ? ` ${batchAddedCount} batch antrean eksplorasi dibuat.` : '') +
      (directIntakeAddedCount > 0 ? ` ${directIntakeAddedCount} sampel direct intake dicatat.` : '')
    );
  };

  // Memoized Traceback Context for the opened station
  const currentStationTracebackContext = useMemo((): StationTracebackContext => {
    const prev = previousShiftRecord;
    const key = overrideStationKey;

    let upstream = 'Stasiun Hulu';
    let initialBal = 0;
    let received = 0;
    let finished = 0;
    let officialOs = overrideCurrentValue;
    let toolBreakdown: Record<string, number> | undefined = undefined;

    if (key === 'press') {
      upstream = 'Preparasi Kering (Pulverizer Serbuk)';
      initialBal = prev?.pressPowder?.os ?? 0;
      received = prev?.pressPowder?.received?.shift ?? 0;
      finished = prev?.pressPowder?.finish?.shift ?? 0;
      officialOs = prev?.pressPowder?.bal ?? Math.max(0, initialBal + received - finished);
    } else if (key === 'edxrf') {
      upstream = 'Meja Press Pellet (Pelet Selesai Press)';
      initialBal = prev?.edxrf?.os ?? 0;
      received = prev?.edxrf?.received ?? (prev?.pressPowder?.finish?.shift ?? 0);
      const epsTotal = (prev?.edxrf?.epsC || 0) + (prev?.edxrf?.epsD || 0) + (prev?.edxrf?.epsE || 0) + 
                       (prev?.edxrf?.epsF || 0) + (prev?.edxrf?.epsG || 0) + (prev?.edxrf?.epsH || 0) + (prev?.edxrf?.s2Puma || 0);
      finished = prev?.edxrf?.shift ?? epsTotal;
      officialOs = prev?.edxrf?.bal ?? Math.max(0, initialBal + received - finished);
      toolBreakdown = {
        epsC: prev?.edxrf?.epsC ?? 0,
        epsD: prev?.edxrf?.epsD ?? 0,
        epsE: prev?.edxrf?.epsE ?? 0,
        epsF: prev?.edxrf?.epsF ?? 0,
        epsG: prev?.edxrf?.epsG ?? 0,
        epsH: prev?.edxrf?.epsH ?? 0,
        s2Puma: prev?.edxrf?.s2Puma ?? 0
      };
    } else if (key === 'fusion') {
      upstream = 'Stasiun Weighing (Penimbangan Sampel)';
      initialBal = prev?.fuseBead?.osExp ?? 0;
      received = prev?.sampleReceived?.exp?.shift ?? 0;
      finished = prev?.fuseBead?.finishShift ?? 0;
      officialOs = prev?.fuseBead?.balExp ?? Math.max(0, initialBal + received - finished);
    } else if (key === 'loi') {
      upstream = 'Furnace Pembakaran LOI';
      initialBal = prev?.loi?.os ?? 100;
      received = 0;
      const wFin = (prev?.loi?.w2 || 0) + (prev?.loi?.w4 || 0) + (prev?.loi?.w5 || 0);
      finished = prev?.loi?.finLoiShift ?? wFin;
      officialOs = prev?.loi?.bal ?? Math.max(0, initialBal - finished);
      toolBreakdown = {
        w2: prev?.loi?.w2 ?? 0,
        w4: prev?.loi?.w4 ?? 0,
        w5: prev?.loi?.w5 ?? 0
      };
    } else if (key === 'wdxrf') {
      upstream = 'Meja Bead Fusion (Peleburan Borat)';
      initialBal = prev?.wdxrf?.osExp ?? 0;
      received = prev?.fuseBead?.finishShift ?? 0;
      const zTotal = (prev?.wdxrf?.zetiumA?.total || 0) + (prev?.wdxrf?.zetiumB?.total || 0);
      finished = zTotal;
      officialOs = prev?.wdxrf?.bal ?? Math.max(0, received - finished);
      toolBreakdown = {
        zetiumA: prev?.wdxrf?.zetiumA?.total ?? 0,
        zetiumB: prev?.wdxrf?.zetiumB?.total ?? 0
      };
    } else if (key === 'qc') {
      upstream = 'Spektrometer WDXRF (Hasil Scan Zetium)';
      initialBal = prev?.qc?.os ?? 0;
      received = prev?.qc?.received ?? ((prev?.wdxrf?.zetiumA?.total || 0) + (prev?.wdxrf?.zetiumB?.total || 0));
      finished = prev?.qc?.finishShift ?? 0;
      officialOs = prev?.qc?.bal ?? Math.max(0, initialBal + received - finished);
    } else if (key === 'report') {
      upstream = 'QC Data Validasi (Hasil Lolos QC)';
      initialBal = prev?.report?.osReport ?? 0;
      received = prev?.report?.received ?? (prev?.qc?.finishShift ?? 0);
      finished = prev?.report?.finishReportDay ?? 0;
      officialOs = prev?.report?.bal ?? Math.max(0, initialBal + received - finished);
    }

    return {
      stationKey: key,
      stationName: overrideStationName,
      upstreamStationName: upstream,
      date: prev?.date || 'Shift Lalu',
      shift: prev?.shiftType || 'NIGHT',
      regu: prev?.regu || 'B',
      foreman: `Foreman Shift ${prev?.regu || 'Lalu'}`,
      initialBalance: initialBal,
      receivedCount: received,
      finishedCount: finished,
      officialOs: officialOs,
      toolBreakdown,
      recordId: prev?.id
    };
  }, [previousShiftRecord, overrideStationKey, overrideStationName, overrideCurrentValue]);

  // Handler buka modal koreksi saldo awal (Traceback Investigation)
  const handleOpenOverride = (
    stationKey: 'press' | 'edxrf' | 'fusion' | 'loi' | 'wdxrf' | 'qc' | 'report',
    stationName: string,
    currentVal: number,
    setter: (val: number) => void
  ) => {
    setOverrideStationKey(stationKey);
    setOverrideStationName(stationName);
    setOverrideCurrentValue(currentVal);
    setOverrideSetter(() => setter);
    setOverrideModalOpen(true);
  };

  const handleApplyOverride = (newVal: number, log: BalanceOverrideAuditLog) => {
    if (overrideSetter) {
      overrideSetter(newVal);
    }
    setOverriddenStations(prev => ({
      ...prev,
      [log.stationKey]: {
        value: newVal,
        by: log.modifiedBy,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      }
    }));
  };

  // Handler terintegrasi: Koreksi Saldo Awal + Rekonsiliasi Mundur ke Shift Sebelumnya
  const handleApplyReconciliation = (
    newVal: number,
    reconciliationData: {
      log: BalanceOverrideAuditLog;
      rootCause: DiscrepancyRootCauseType;
      reconcilePreviousShift: boolean;
      newPreviousFinished?: number;
      newPreviousReceived?: number;
      newPreviousOs: number;
    }
  ) => {
    // 1. Terapkan nilai baru ke state saldo awal shift aktif
    if (overrideSetter) {
      overrideSetter(newVal);
    }

    // 2. Berikan penanda visual status rekonsiliasi pada stasiun
    setOverriddenStations(prev => ({
      ...prev,
      [overrideStationKey]: {
        value: newVal,
        by: reconciliationData.log.modifiedBy,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        rootCause: reconciliationData.rootCause,
        isReconciled: reconciliationData.reconcilePreviousShift
      }
    }));

    // 3. Rekonsiliasi Mundur ke data record laporan shift sebelumnya (jika opsi aktif)
    if (reconciliationData.reconcilePreviousShift && previousShiftRecord) {
      const targetId = previousShiftRecord.id;
      const key = overrideStationKey;

      const updatedAll = allRecords.map(rec => {
        if (rec.id !== targetId) return rec;

        const updated = { ...rec };
        if (key === 'press') {
          const prevFinish = reconciliationData.newPreviousFinished ?? updated.pressPowder?.finish?.shift ?? 0;
          const prevRec = reconciliationData.newPreviousReceived ?? updated.pressPowder?.received?.shift ?? 0;
          updated.pressPowder = {
            ...updated.pressPowder,
            received: { ...updated.pressPowder.received, shift: prevRec },
            finish: { ...updated.pressPowder.finish, shift: prevFinish },
            bal: reconciliationData.newPreviousOs
          };
        } else if (key === 'edxrf') {
          const prevFinish = reconciliationData.newPreviousFinished ?? updated.edxrf?.shift ?? 0;
          const prevRec = reconciliationData.newPreviousReceived ?? updated.edxrf?.received ?? 0;
          updated.edxrf = {
            ...updated.edxrf,
            received: prevRec,
            shift: prevFinish,
            bal: reconciliationData.newPreviousOs
          };
        } else if (key === 'fusion') {
          const prevFinish = reconciliationData.newPreviousFinished ?? updated.fuseBead?.finishShift ?? 0;
          const prevRec = reconciliationData.newPreviousReceived ?? updated.sampleReceived?.exp?.shift ?? 0;
          updated.sampleReceived = {
            ...updated.sampleReceived,
            exp: { ...updated.sampleReceived.exp, shift: prevRec }
          };
          updated.fuseBead = {
            ...updated.fuseBead,
            finishShift: prevFinish,
            balExp: reconciliationData.newPreviousOs
          };
        } else if (key === 'loi') {
          const prevFinish = reconciliationData.newPreviousFinished ?? updated.loi?.finLoiShift ?? 0;
          updated.loi = {
            ...updated.loi,
            finLoiShift: prevFinish,
            bal: reconciliationData.newPreviousOs
          };
        } else if (key === 'wdxrf') {
          updated.wdxrf = {
            ...updated.wdxrf,
            bal: reconciliationData.newPreviousOs
          };
        } else if (key === 'qc') {
          const prevFinish = reconciliationData.newPreviousFinished ?? updated.qc?.finishShift ?? 0;
          const prevRec = reconciliationData.newPreviousReceived ?? updated.qc?.received ?? 0;
          updated.qc = {
            ...updated.qc,
            received: prevRec,
            finishShift: prevFinish,
            bal: reconciliationData.newPreviousOs
          };
        } else if (key === 'report') {
          const prevFinish = reconciliationData.newPreviousFinished ?? updated.report?.finishReportDay ?? 0;
          const prevRec = reconciliationData.newPreviousReceived ?? updated.report?.received ?? 0;
          updated.report = {
            ...updated.report,
            received: prevRec,
            finishReportDay: prevFinish,
            bal: reconciliationData.newPreviousOs
          };
        }
        return updated;
      });

      setAllRecords(updatedAll);
      saveStoredRecords(updatedAll);
      window.dispatchEvent(new CustomEvent('preplab-records-updated'));
    }
  };

  // Reusable Component untuk Saldo Awal Terkunci + Ikon Tanda Seru Abu-abu
  const renderLockedBalanceField = (
    label: string,
    value: number,
    stationKey: 'press' | 'edxrf' | 'fusion' | 'loi' | 'wdxrf' | 'qc' | 'report',
    stationName: string,
    setter: (val: number) => void
  ) => {
    const overrideInfo = overriddenStations[stationKey];
    const isOverridden = Boolean(overrideInfo);
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-slate-500 font-medium">{label}</label>
          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
            isOverridden 
              ? overrideInfo?.isReconciled
                ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' 
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            {isOverridden 
              ? overrideInfo?.isReconciled 
                ? 'Direkonsiliasi (Sinkron)' 
                : 'Terkoreksi Fisik' 
              : 'Auto Shift Lalu'}
          </span>
        </div>
        <div className="relative flex items-center">
          <input 
            type="number"
            readOnly
            value={value}
            className={`w-full px-3 py-1.5 pr-8 rounded-xl border font-mono text-center font-bold cursor-not-allowed select-none text-xs ${
              isOverridden
                ? overrideInfo?.isReconciled
                  ? 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-300 dark:border-teal-700 text-teal-900 dark:text-teal-200'
                  : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                : 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            }`}
            title="Saldo awal otomatis ditarik dari hasil shift sebelumnya. Klik tanda seru di samping kanan untuk investigasi & rekonsiliasi akar masalah."
          />
          <button
            type="button"
            onClick={() => handleOpenOverride(stationKey, stationName, value, setter)}
            className="absolute right-1.5 p-1 rounded-lg text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-all cursor-pointer"
            title="Klik untuk membuka dialog investigasi & rekonsiliasi saldo awal (Traceback System)"
          >
            <AlertCircle className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Submit Quick Absence to ADM
  const handleQuickAbsenceSubmit = async () => {
    if (!selectedEmpNik) {
      toast.error('Pilih nama anggota regu terlebih dahulu.');
      return;
    }
    const emp = currentReguEmployees.find(e => String(e.nik || e.NIK).trim() === selectedEmpNik.trim());
    if (!emp) {
      toast.error('Karyawan tidak ditemukan di roster.');
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
        alasanAbsensi: absenceReason || `${absenceCategory} shift ${shiftType} (Dilaporkan oleh Foreman di Daily Report Laboratory)`,
        pengawasMengetahui: inspectorName,
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

  // Sync / Save Full Record to LocalStorage & Central Store
  const handleSaveAllRecord = () => {
    const parts = date.split('/');
    const isoDate = parts.length === 3 ? `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}` : date;
    const id = `${isoDate}_${regu}_${shiftType}`;

    const newRec: DailyPerformanceRecord = {
      id,
      no: allRecords.length + 1,
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
        prod: { shift: prodShift, rc: prodShift, ra: 0, day: prodShift, wkly: prodShift },
        exp: { shift: expShift, day: expShift, wkly: expShift },
        smelter: { shift: smelterShift, day: smelterShift, wkly: smelterShift }
      },
      pressPowder: {
        os: pressOsAwal,
        received: { shift: pulpDryReceived, day: pulpDryReceived, wkly: pulpDryReceived },
        finish: { shift: pressFinish, day: pressFinish, wkly: pressFinish },
        bal: osPress
      },
      edxrf: {
        os: edxrfOsAwal,
        received: edxrfReceived,
        epsC, epsD, epsE, epsF, epsG, epsH, s2Puma,
        shift: edxrfTotal, day: edxrfTotal, wkly: edxrfTotal,
        bal: osEdxrf
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
        os: qcOs,
        received: qcReceived,
        finishShift: qcFinish, 
        finishDay: qcFinish, 
        finishWkly: qcFinish, 
        bal: qcBal
      },
      report: {
        osReport: reportOs, 
        received: reportReceived, 
        finishReportDay: reportDone, 
        finishReportWkly: reportDone, 
        bal: reportBal
      },
      manpowerNotes: manpowerNotes || undefined,
      updatedAt: new Date().toISOString()
    };

    // Replace or append
    const idx = allRecords.findIndex(r => r.id === id);
    let updatedList: DailyPerformanceRecord[];
    if (idx !== -1) {
      updatedList = [...allRecords];
      updatedList[idx] = newRec;
    } else {
      updatedList = [...allRecords, newRec];
    }

    setAllRecords(updatedList);
    saveStoredRecords(updatedList);
    saveStoredSampleBatches(batches);

    // Dispatch global events for instant dashboard reflection
    window.dispatchEvent(new CustomEvent('preplab-daily-performance-updated'));
    window.dispatchEvent(new CustomEvent('preplab-batches-updated'));

    toast.success(`Data Daily Report Lab ${date} (${regu} - ${shiftType}) tersimpan & tersinkronisasi ke Daily Performance!`);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans pb-24">
      
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                <Beaker className="w-4 h-4" />
              </span>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Daily Report Laboratory
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Workstation Foreman
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Penginputan data operasional terstruktur per-stasiun dengan otomasi antrean bersambung
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTracebackModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30 text-indigo-800 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer transition-all"
            title="Lihat Skema Alur Telusur Sampel & Jejak Audit Saldo"
          >
            <GitFork className="w-3.5 h-3.5 text-indigo-600" />
            <span className="hidden md:inline">Skema Traceback & Audit</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExcelPasteModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 cursor-pointer shadow-xs transition-all"
            title="Smart Paste: Baca & terapkan data tabel Excel (satu per satu atau sekaligus seluruh stasiun)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Smart Paste dari Excel</span>
          </button>

          {onNavigateToDailyPerformance && (
            <button
              onClick={onNavigateToDailyPerformance}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50/60 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300 text-xs font-semibold hover:bg-teal-100 dark:hover:bg-teal-900/40 cursor-pointer transition-all"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Lihat Rekap Dashboard</span>
            </button>
          )}

          <button
            onClick={handleSaveAllRecord}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Shift</span>
          </button>
        </div>
      </header>

      {/* SHIFT & MANPOWER ROSTER BAR */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3.5">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Shift Context Fields */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[11px] text-slate-500 font-medium">Tanggal:</span>
                <input
                  type="text"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-24 bg-transparent font-bold text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 font-medium">Wk:</span>
                <input
                  type="number"
                  value={week}
                  onChange={e => setWeek(Number(e.target.value))}
                  className="w-10 bg-transparent font-bold text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 font-medium">Regu:</span>
                <select
                  value={regu}
                  onChange={e => setRegu(e.target.value as any)}
                  className="bg-transparent font-bold text-teal-600 dark:text-teal-400 outline-none cursor-pointer"
                >
                  <option value="A">Shift A</option>
                  <option value="B">Shift B</option>
                  <option value="C">Shift C</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={shiftType}
                  onChange={e => setShiftType(e.target.value as any)}
                  className="bg-transparent font-bold text-slate-800 dark:text-white outline-none cursor-pointer"
                >
                  <option value="DAY">DAY (07:00 - 19:00 WIT)</option>
                  <option value="NIGHT">NIGHT (19:00 - 07:00 WIT)</option>
                  <option value="LS">LS (07:00 - 24:00 WIT)</option>
                </select>
              </div>
            </div>

            {/* Quick Absence Button */}
            <button
              onClick={() => setShowAbsenceDialog(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm cursor-pointer transition-all"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>+ Catat Izin / Sakit (Review ADM)</span>
            </button>
          </div>

          {/* Manpower Counters Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500">SDM Shift:</span>
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-slate-700 dark:text-slate-300">
                Staff Hadir: <strong className="font-mono">{staffShift}</strong>
              </span>
              <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                Crew Hadir: <strong className="font-mono font-bold">{crewShift}</strong>
              </span>
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg text-slate-600 dark:text-slate-400">
                Cuti: <strong className="font-mono">{staffCuti + crewCuti}</strong>
              </span>
              {crewSakit > 0 && (
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-lg font-bold">
                  Sakit: {crewSakit}
                </span>
              )}
              {crewIzin > 0 && (
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-lg font-bold">
                  Izin: {crewIzin}
                </span>
              )}
            </div>

            <div className="text-[11px] text-slate-500">
              Roster Regu {regu}: {isRosterLoading ? 'Memuat...' : `${currentReguEmployees.length} terdaftar`}
            </div>
          </div>

          {/* Quick Absence Modal */}
          {showAbsenceDialog && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Pelaporan Izin/Sakit Anggota Shift (Diteruskan ke Review Administrasi)
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
                    placeholder="Contoh: Demam, izin keperluan keluarga mendesak"
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
                  <span>{isSubmittingAbsence ? 'Mengirim...' : 'Kirim Tiket ke Tim Administrasi'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5 SUB-MENUS TAB NAVIGATION */}
      <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 py-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-none text-xs font-semibold">
            {[
              { id: 'weighing_fuse_loi', label: '1. Weighing, Fuse & LOI', icon: <Flame className="w-4 h-4" />, count: `${batches.length} batch` },
              { id: 'press_edxrf', label: '2. Press & EDXRF', icon: <Layers className="w-4 h-4" />, count: `${edxrfTotal} scan` },
              { id: 'wdxrf', label: '3. WDXRF', icon: <Cpu className="w-4 h-4" />, count: `${wdxrfTotal} run` },
              { id: 'qc_data', label: '4. QC Data', icon: <Shield className="w-4 h-4" />, count: `${qcFinish} lolos` },
              { id: 'reporting', label: '5. Reporting', icon: <FileCheck className="w-4 h-4" />, count: `${reportDone} CoA` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubMenu(tab.id as any)}
                className={`flex items-center gap-2 py-2 px-3.5 rounded-xl cursor-pointer transition-all whitespace-nowrap ${
                  activeSubMenu === tab.id
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeSubMenu === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsExcelPasteModalOpen(true)}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 cursor-pointer transition-all whitespace-nowrap shadow-xs"
            title="Tempel tabel dari Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Paste dari Excel</span>
          </button>
        </div>
      </nav>

      {/* WORKSTATION CONTENT BODY */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6">
        
        {/* ========================================================================= */}
        {/* SUB-MENU 1: WEIGHING, FUSE & LOI */}
        {/* ========================================================================= */}
        {activeSubMenu === 'weighing_fuse_loi' && (
          <div className="space-y-6">
            
            {/* Banner Guide */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-blue-600" />
                  Stasiun Weighing, Peleburan Fusion & Pembakaran LOI
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Daftarkan batch di stasiun Weighing (1x entry hulu). Foreman Fusion cukup mencentang batch selesai lebur.
                </p>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-500 block">Selesai Lebur:</span>
                <span className="font-mono font-bold text-emerald-600 text-base">{fusionFinishCount} spl</span>
              </div>
            </div>

            {/* PANEL INFORMASI: SAMPEL APA SAJA YANG SUDAH DIDAFTARKAN (ANTI-DUPLIKASI) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                    Ringkasan Sampel Terdaftar di Weighing Shift Ini (Anti-Duplikasi)
                  </h4>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  Total: <strong className="text-emerald-600 font-mono">{registeredStats.totalBatches} Batch ({registeredStats.totalSamples} spl)</strong>
                </span>
              </div>

              {/* 4 Kategori Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {/* 1. Exploration */}
                <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-blue-600" />
                      Exploration
                    </span>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                      {registeredStats.expBatches} B
                    </span>
                  </div>
                  <div className="text-[11px] text-blue-700 dark:text-blue-400">
                    Total: <strong className="font-mono">{registeredStats.expSamples} spl</strong>
                  </div>
                  <div className="text-[9px] text-blue-500 truncate">
                    TBP, GPS, JMP, GTS, BJM, OAM, SCANDIUM
                  </div>
                </div>

                {/* 2. Smelter */}
                <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                      <Factory className="w-3.5 h-3.5 text-purple-600" />
                      Smelter
                    </span>
                    <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                      {registeredStats.smelterBatches} B
                    </span>
                  </div>
                  <div className="text-[11px] text-purple-700 dark:text-purple-400">
                    Total: <strong className="font-mono">{registeredStats.smelterSamples} spl</strong>
                  </div>
                  <div className="text-[9px] text-purple-500 truncate">
                    MSP, HPL, HJF, ONC, KPS
                  </div>
                </div>

                {/* 3. Production */}
                <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                      <Mountain className="w-3.5 h-3.5 text-emerald-600" />
                      Production
                    </span>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      {registeredStats.prodBatches} B
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                    Total: <strong className="font-mono">{registeredStats.prodSamples} spl</strong>
                  </div>
                  <div className="text-[9px] text-emerald-500 truncate">
                    QC LIM, SAP, BLD, BOULDER
                  </div>
                </div>

                {/* 4. Khusus (Accidental) */}
                <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      Khusus
                    </span>
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-300">
                      {registeredStats.khususBatches} B
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-700 dark:text-amber-400">
                    Total: <strong className="font-mono">{registeredStats.khususSamples} spl</strong>
                  </div>
                  <div className="text-[9px] text-amber-500 truncate">
                    Sample Accidental / Urgent
                  </div>
                </div>
              </div>

              {/* Rincian per Jenis Sampel (Chips) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Daftar Sampel yang Sudah Terdaftar Sebelumnya:
                </span>
                {Object.keys(registeredStats.summaryByPt).length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-1">
                    Belum ada sampel yang didaftarkan pada shift ini.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(registeredStats.summaryByPt).map(([ptKey, stat]) => {
                      const colorClass = 
                        stat.group === 'Exploration' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' :
                        stat.group === 'Smelter' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' :
                        stat.group === 'Production' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' :
                        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';

                      return (
                        <div key={ptKey} className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-semibold ${colorClass}`}>
                          <span>{ptKey}:</span>
                          <span className="font-mono font-bold">{stat.batchCount} Batch ({stat.sampleCount} spl)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Bagian A: Pendaftaran Sampel Masuk Stasiun Weighing (Pilihan Jenis Sampel Lebih Dulu) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                    Penerimaan Sampel Masuk Stasiun Weighing (1x Input Hulu)
                  </h4>
                </div>

                {/* SWITCHER JENIS SAMPEL: BATCHING KHUSUS EKSPLORASI */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setSampleIntakeMode('exploration')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      sampleIntakeMode === 'exploration'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>1. Eksplorasi (Dengan Batching)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSampleIntakeMode('non_exploration')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      sampleIntakeMode === 'non_exploration'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>2. Smelter / Prod / Khusus (Direct Input)</span>
                  </button>
                </div>
              </div>

              {/* MODE 1: EKSPLORASI (DENGAN SISTEM BATCHING) */}
              {sampleIntakeMode === 'exploration' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 flex items-center justify-between text-xs">
                    <span className="text-blue-900 dark:text-blue-200 font-semibold flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-blue-600" />
                      Mode Batching Aktif khusus Sampel Eksplorasi (TBP, GPS, JMP, GTS, BJM, OAM, SCANDIUM).
                    </span>
                    <span className="text-blue-700 dark:text-blue-300 font-mono font-bold">
                      {registeredStats.expBatches} Batch ({registeredStats.expSamples} spl)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Pilih Kode Sampel Eksplorasi
                      </label>
                      <select
                        value={newBatchPt}
                        onChange={e => setNewBatchPt(e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
                      >
                        <option value="TBP">TBP</option>
                        <option value="GPS">GPS</option>
                        <option value="JMP">JMP</option>
                        <option value="GTS">GTS</option>
                        <option value="BJM">BJM</option>
                        <option value="OAM">OAM</option>
                        <option value="SCANDIUM">SCANDIUM</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">Jumlah Batch Masuk</label>
                      <input 
                        type="number" 
                        min={1} 
                        max={20}
                        value={newBatchCount} 
                        onChange={e => setNewBatchCount(Number(e.target.value))}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-center font-bold"
                      />
                    </div>

                    <div className="sm:col-span-2 flex flex-col justify-center">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300 mt-3">
                        <input 
                          type="checkbox"
                          checked={newBatchUniformSize}
                          onChange={e => setNewBatchUniformSize(e.target.checked)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer w-4 h-4"
                        />
                        <span>Jumlah sampel per batch seragam ({newBatchSplPerBatch} spl/batch)</span>
                      </label>
                    </div>
                  </div>

                  {/* LIVE HELPER INFO KETIKA MEMILIH PT (MENCEGAH INPUT 2x) */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <div>
                        {currentSelectedPtInfo.batchCount > 0 ? (
                          <span className="text-slate-700 dark:text-slate-300">
                            Sampel <strong className="text-teal-700 dark:text-teal-400">{currentSelectedPtInfo.ptKey}</strong> sudah terdaftar sebanyak <strong className="font-mono text-teal-700 dark:text-teal-400">{currentSelectedPtInfo.batchCount} Batch ({currentSelectedPtInfo.sampleCount} spl)</strong>. Pendaftaran baru ini otomatis dicatat sebagai <strong>Batch #{currentSelectedPtInfo.nextBatchNumber} s/d #{currentSelectedPtInfo.nextBatchNumber + newBatchCount - 1}</strong>.
                          </span>
                        ) : (
                          <span className="text-slate-700 dark:text-slate-300">
                            Sampel <strong className="text-emerald-700 dark:text-emerald-400">{currentSelectedPtInfo.ptKey}</strong> <span className="text-emerald-600 font-semibold">belum pernah didaftarkan</span> pada shift ini. Pendaftaran akan dimulai dari <strong>Batch #1</strong>.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {!newBatchUniformSize && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                      <span className="text-[11px] text-slate-500 font-semibold block">Tentukan Ukuran Sampel Masing-Masing Batch:</span>
                      <div className="flex flex-wrap gap-2">
                        {newBatchCustomSizes.map((sz, idx) => (
                          <div key={idx} className="flex items-center gap-1 text-xs">
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
                              className="w-16 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-center font-mono font-bold"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddBatch}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Daftarkan {newBatchCount} Batch {newBatchPt} ke Stasiun Weighing</span>
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 2: NON-EKSPLORASI (DIRECT INTAKE - TANPA BATCHING) */}
              {sampleIntakeMode === 'non_exploration' && (
                <div className="space-y-4">
                  <div className="p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 flex items-center justify-between text-xs">
                    <span className="text-purple-900 dark:text-purple-200 font-semibold flex items-center gap-1.5">
                      <SlidersHorizontal className="w-4 h-4 text-purple-600" />
                      Mode Input Langsung (Direct Intake): Cukup masukkan total sampel masuk tanpa sistem batching.
                    </span>
                    <span className="text-purple-700 dark:text-purple-300 font-mono font-bold">
                      Total Non-Exp: {directSmelterCount + directProdCount + directKhususCount} spl
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Kategori Sampel Masuk
                      </label>
                      <select
                        value={directPtCode}
                        onChange={e => setDirectPtCode(e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold cursor-pointer"
                      >
                        <optgroup label="1. Smelter">
                          <option value="SMELTER MSP">SMELTER MSP</option>
                          <option value="SMELTER HPL">SMELTER HPL</option>
                          <option value="SMELTER HJF">SMELTER HJF</option>
                          <option value="SMELTER ONC">SMELTER ONC</option>
                          <option value="SMELTER KPS">SMELTER KPS</option>
                        </optgroup>
                        <optgroup label="2. Production (PROD)">
                          <option value="QC LIM">QC LIM (Limonite)</option>
                          <option value="QC SAP">QC SAP (Saprolite)</option>
                          <option value="QC BLD">QC BLD (Boulder)</option>
                          <option value="QC BOULDER">QC BOULDER</option>
                        </optgroup>
                        <optgroup label="3. Khusus (Accidental)">
                          <option value="KHUSUS">KHUSUS (Accidental / Urgent)</option>
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Jumlah Sampel Masuk (Langsung)
                      </label>
                      <input 
                        type="number"
                        min={1}
                        value={directCount}
                        onChange={e => setDirectCount(Math.max(1, Number(e.target.value)))}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-center font-bold text-slate-900 dark:text-white"
                        placeholder="Contoh: 40"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Catatan / Asal Pit <span className="text-slate-400">(Opsional)</span>
                      </label>
                      <input 
                        type="text"
                        placeholder="Contoh: Ritase pagi Pit Barat..."
                        value={directNotes}
                        onChange={e => setDirectNotes(e.target.value)}
                        className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleAddDirectIntake}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-sm cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Catat Penerimaan {directCount} Sampel {directPtCode}</span>
                    </button>
                  </div>

                  {/* List Penerimaan Non-Eksplorasi */}
                  {directIntakes.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <span className="text-[11px] font-semibold text-slate-500 block">
                        Riwayat Penerimaan Sampel Non-Eksplorasi Shift Ini:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {directIntakes.map(d => (
                          <div 
                            key={d.id} 
                            className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-1.5">
                                <strong className="text-slate-800 dark:text-slate-200">{d.code}</strong>
                                <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                                  {d.group}
                                </span>
                              </div>
                              <span className="text-slate-500 text-[11px] block">
                                <strong className="font-mono text-slate-800 dark:text-slate-200">{d.sampleCount}</strong> sampel {d.notes ? `• ${d.notes}` : ''}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteDirectIntake(d.id, e)}
                              className="text-slate-300 hover:text-red-500 p-1.5 rounded-lg transition-colors"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bagian B: Checklist Finish Stasiun Fusion */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                    Checklist Batch Selesai Dilebur (Fusion Bead)
                  </h4>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-600 font-bold">Finished: {fusionFinishCount} spl</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-amber-600 font-bold">OS Sisa: {fusionOsCount} spl</span>
                </div>
              </div>

              {batches.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">
                  Belum ada batch terdaftar di stasiun Weighing. Daftarkan batch di atas terlebih dahulu.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {batches.map(b => {
                    const group = b.sampleGroup || getSampleGroup(b.pt);
                    const badgeColor = 
                      group === 'Exploration' ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/40' :
                      group === 'Smelter' ? 'text-purple-600 bg-purple-100 dark:bg-purple-900/40' :
                      group === 'Production' ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40' :
                      'text-amber-600 bg-amber-100 dark:bg-amber-900/40';

                    return (
                      <div 
                        key={b.id}
                        onClick={() => handleToggleBatchFinish(b.id)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between text-xs relative group ${
                          b.isFinished 
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-sm' 
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-teal-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {b.isFinished ? (
                            <CheckSquare className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm leading-tight">{b.batchName}</span>
                              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${badgeColor}`}>
                                {group}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {b.sampleCount} sampel • {b.pt}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            b.isFinished ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {b.isFinished ? 'FINISHED' : 'ANTREAN'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteBatch(b.id, e)}
                            className="text-slate-300 hover:text-red-500 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                            title="Hapus Batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bagian C: Pembakaran Stasiun LOI */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-600" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                    Pembakaran Muffle Furnace (Stasiun LOI)
                  </h4>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-600 font-bold">Finish LOI: {loiFinish} spl</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-amber-600 font-bold">Saldo Sisa LOI: {loiBal} spl</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {renderLockedBalanceField('LOI Saldo Awal (OS)', loiOs, 'loi', 'Stasiun LOI Furnace', setLoiOs)}
                <div>
                  <label className="text-[10px] text-slate-500 font-medium">Furnace W2</label>
                  <input 
                    type="number" 
                    value={loiW2} 
                    onChange={e => setLoiW2(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-medium">Furnace W4</label>
                  <input 
                    type="number" 
                    value={loiW4} 
                    onChange={e => setLoiW4(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-center font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-medium">Furnace W5</label>
                  <input 
                    type="number" 
                    value={loiW5} 
                    onChange={e => setLoiW5(Number(e.target.value))}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-center font-bold"
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-MENU 2: PRESS & EDXRF */}
        {/* ========================================================================= */}
        {activeSubMenu === 'press_edxrf' && (
          <div className="space-y-6">
            
            {/* Banner Guide */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 border border-teal-200/80 dark:border-teal-900/60 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-teal-900 dark:text-teal-200 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  Jalur Grade Control: Press Pellet & Meja Spektrometer EDXRF
                </h3>
                <p className="text-xs text-teal-700 dark:text-teal-400">
                  Pulp kering masuk lab dari prep kering. Pelet selesai dipress otomatis menjadi antrean meja EDXRF.
                </p>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-500 block">Total Scan EDXRF:</span>
                <span className="font-mono font-bold text-teal-600 text-base">{edxrfTotal} spl</span>
              </div>
            </div>

            {/* Tahap 1: Stasiun Press Pellet */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-teal-600" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                    Tahap 1: Pengepresan Bubuk Padat (Press Pellet)
                  </h4>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">Beban Press: <strong>{totalPressLoad} spl</strong></span>
                  <span className="text-slate-300">|</span>
                  <span className="text-amber-600 font-bold">OS Press: {osPress} spl</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {renderLockedBalanceField('OS Press Awal (Sisa Serbuk Shift Sebelumnya)', pressOsAwal, 'press', 'Meja Press Pellet', setPressOsAwal)}

                <div>
                  <label className="text-[11px] font-bold text-teal-700 dark:text-teal-400">
                    Pulp Kering Masuk Lab dari Prep Kering (1x Entry)
                  </label>
                  <input 
                    type="number" 
                    value={pulpDryReceived} 
                    onChange={e => {
                      const val = Number(e.target.value);
                      setPulpDryReceived(val);
                      setPressFinish(val); // default sync
                    }}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-300 dark:border-teal-700 font-mono text-center font-bold text-teal-700 dark:text-teal-300"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    Press Selesai (Finished Press)
                  </label>
                  <input 
                    type="number" 
                    value={pressFinish} 
                    onChange={e => setPressFinish(Number(e.target.value))}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 font-mono text-center font-bold text-emerald-700 dark:text-emerald-300"
                  />
                </div>
              </div>

              {osPress > 0 && (
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                  <span>⚠️ Terdapat sisa serbuk belum dipress (Finished di bawah Received):</span>
                  <strong className="font-mono">{totalPressLoad} total serbuk − {pressFinish} pelet selesai = {osPress} spl OS Press</strong>
                </div>
              )}
            </div>

            {/* Tahap 2: Stasiun EDXRF */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                    Tahap 2: Pembacaan Spektrometer EDXRF
                  </h4>
                  <span className="text-[10px] bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded font-bold">
                    Antrean Pelet: {edxrfReceived} spl (dari Finish Press)
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">Scan Selesai: <strong>{edxrfTotal} spl</strong></span>
                  <span className="text-slate-300">|</span>
                  <span className="text-blue-600 font-bold">OS EDXRF: {osEdxrf} pelet</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {renderLockedBalanceField('OS Pelet Awal', edxrfOsAwal, 'edxrf', 'Spektrometer EDXRF', setEdxrfOsAwal)}

                {[
                  ['Epsilon C', epsC, setEpsC], 
                  ['Epsilon D', epsD, setEpsD], 
                  ['Epsilon E', epsE, setEpsE], 
                  ['Epsilon F', epsF, setEpsF],
                  ['Epsilon G', epsG, setEpsG], 
                  ['Epsilon H', epsH, setEpsH], 
                  ['S2 Puma', s2Puma, setS2Puma]
                ].map(([name, val, setter]: any) => (
                  <div key={name} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] text-slate-500 font-medium block">{name}</label>
                    <input 
                      type="number" 
                      value={val} 
                      onChange={e => setter(Number(e.target.value))}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-center font-bold"
                    />
                  </div>
                ))}
              </div>

              {/* Rincian Dual OS Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-amber-800 dark:text-amber-300 block text-sm">1. OS Press (Serbuk Belum Dipress):</span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400">
                      {totalPressLoad} total beban serbuk − {pressFinish} pelet selesai
                    </span>
                  </div>
                  <span className="text-xl font-extrabold text-amber-700 dark:text-amber-300 font-mono">
                    {osPress} spl
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-blue-800 dark:text-blue-300 block text-sm">2. OS EDXRF (Pelet Selesai Belum Discan):</span>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400">
                      {totalEdxrfLoad} total pelet − {edxrfTotal} selesai scan
                    </span>
                  </div>
                  <span className="text-xl font-extrabold text-blue-700 dark:text-blue-300 font-mono">
                    {osEdxrf} pelet
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-MENU 3: WDXRF */}
        {/* ========================================================================= */}
        {activeSubMenu === 'wdxrf' && (
          <div className="space-y-6">
            
            {/* Banner Guide */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-200/80 dark:border-indigo-900/60 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  Stasiun Spektrometri WDXRF (Zetium A & B)
                </h3>
                <p className="text-xs text-indigo-700 dark:text-indigo-400">
                  Antrean manik kaca (*glass bead*) otomatis diterima dari hasil checklist Stasiun Fusion ({fusionFinishCount} bead).
                </p>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-500 block">Total Run Spektrometri:</span>
                <span className="font-mono font-bold text-indigo-600 text-base">{wdxrfTotal} run</span>
              </div>
            </div>

            {/* DAFTAR ANTREAN BATCH MASUK WDXRF (HASIL FINISH FUSION DENGAN CATEGORIZING & ACCORDION) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  <div>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                      Daftar Antrean Batch Masuk WDXRF (Hasil Finish Fusion)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Dikelompokkan per jenis sampel. Klik kategori untuk membuka rincian batch & memilih yang selesai scan.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">Total Bead Masuk: <strong>{fusionFinishCount} bead</strong></span>
                  <span className="text-slate-300">|</span>
                  <span className="text-emerald-600 font-bold">Selesai Scan: {wdxrfBatchFinishCount} bead</span>
                  <span className="text-slate-300">|</span>
                  <span className="text-amber-600 font-bold">OS Sisa: {fusionFinishCount - wdxrfBatchFinishCount} bead</span>
                </div>
              </div>

              {wdxrfGroupedBatches.length === 0 ? (
                <div className="p-6 text-center space-y-1.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 font-medium">
                    Belum ada batch yang selesai dilebur di Stasiun Fusion.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Silakan buka sub-menu <strong>Weighing, Fuse & LOI</strong> lalu checklist batch yang sudah selesai dibuat menjadi manik kaca (*glass bead*).
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {wdxrfGroupedBatches.map(group => {
                    const isExpanded = Boolean(expandedWdxrfGroups[group.pt]);
                    const badgeColor = 
                      group.group === 'Exploration' ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/40' :
                      group.group === 'Smelter' ? 'text-purple-600 bg-purple-100 dark:bg-purple-900/40' :
                      group.group === 'Production' ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40' :
                      'text-amber-600 bg-amber-100 dark:bg-amber-900/40';

                    return (
                      <div 
                        key={group.pt}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/60 shadow-xs"
                      >
                        {/* Accordion Header (Categorizing per PT) */}
                        <div 
                          onClick={() => toggleWdxrfGroup(group.pt)}
                          className="p-3.5 bg-slate-50/80 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {group.pt}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${badgeColor}`}>
                              {group.group}
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              • <strong className="font-mono text-slate-700 dark:text-slate-300">{group.totalBatches} Batch</strong> ({group.totalSamples} bead)
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-[11px] text-emerald-600 font-semibold hidden sm:inline">
                              {group.finishedBatches} Selesai
                            </span>
                            <span className="text-[11px] text-amber-600 font-semibold hidden sm:inline">
                              {group.outstandingBatches} Antrean
                            </span>
                            <div className="p-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </div>
                          </div>
                        </div>

                        {/* Accordion Body (List Batch dalam Kategori ini) */}
                        {isExpanded && (
                          <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            {group.batchList.map(b => {
                              const isDone = Boolean(b.wdxrfFinished);
                              return (
                                <div 
                                  key={b.id}
                                  onClick={(e) => handleToggleBatchWdxrfFinish(b.id, e)}
                                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                                    isDone 
                                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
                                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    {isDone ? (
                                      <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                    ) : (
                                      <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    )}
                                    <div>
                                      <strong className="block text-xs leading-tight">{b.batchName}</strong>
                                      <span className="text-[10px] text-slate-500">
                                        {b.sampleCount} bead manik kaca
                                      </span>
                                    </div>
                                  </div>

                                  <span className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                                    isDone ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                  }`}>
                                    {isDone ? 'SCAN SELESAI' : 'ANTREAN'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                  Pengukuran Instrumen Zetium A & Zetium B
                </h4>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">Antrean Bead: <strong>{fusionFinishCount} bead</strong></span>
                  <span className="text-slate-300">|</span>
                  <span className="text-indigo-600 font-bold">OS Bead (Bal): {wdxrfBal} bead</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Zetium A */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-blue-600">Instrumen Zetium A</span>
                    <span className="font-mono font-bold text-blue-700 dark:text-blue-300 text-sm">Total: {ztmATotal}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                    <div>
                      <label className="text-slate-500">Produksi</label>
                      <input type="number" value={ztmAPrd} onChange={e => setZtmAPrd(Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                    </div>
                    <div>
                      <label className="text-slate-500">Eksplorasi</label>
                      <input type="number" value={ztmAExp} onChange={e => setZtmAExp(Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                    </div>
                    <div>
                      <label className="text-slate-500">Smelter</label>
                      <input type="number" value={ztASml} onChange={e => setZtmASml(Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                    </div>
                    <div>
                      <label className="text-slate-500">GTS</label>
                      <input type="number" value={ztmAGts} onChange={e => setZtmAGts(Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                    </div>
                  </div>
                </div>

                {/* Zetium B */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-indigo-600">Instrumen Zetium B</span>
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300 text-sm">Total: {ztmBTotal}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                    <div>
                      <label className="text-slate-500">Produksi</label>
                      <input type="number" value={ztmBPrd} onChange={e => setZtmBPrd(Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                    </div>
                    <div>
                      <label className="text-slate-500">Eksplorasi</label>
                      <input type="number" value={ztmBExp} onChange={e => setZtmBExp(Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                    </div>
                    <div>
                      <label className="text-slate-500">Smelter</label>
                      <input type="number" value={ztmBSml} onChange={e => setZtmBSml(Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                    </div>
                    <div>
                      <label className="text-slate-500">GTS</label>
                      <input type="number" value={ztmBGts} onChange={e => setZtmBGts(Number(e.target.value))} className="w-full mt-1 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono text-center font-bold" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Saldo Antrean Bead */}
              <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-xs text-indigo-800 dark:text-indigo-300 flex items-center justify-between">
                <span>Saldo Sisa Manik Kaca Belum Terukur (OS WDXRF):</span>
                <strong className="font-mono text-base">{fusionFinishCount} selesai fusion − {wdxrfTotal} selesai WDXRF = {wdxrfBal} bead</strong>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-MENU 4: QC DATA */}
        {/* ========================================================================= */}
        {activeSubMenu === 'qc_data' && (
          <div className="space-y-6">
            
            {/* Banner Guide */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 border border-blue-200/80 dark:border-blue-900/60 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Stasiun Validasi Quality Control (QC Data)
                </h3>
                <p className="text-xs text-blue-700 dark:text-blue-400">
                  Data <strong>Received QC otomatis masuk</strong> dari hasil selesai scan WDXRF ({qcReceived} spl). Lolos validasi akan otomatis diteruskan ke Pelaporan.
                </p>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-500 block">Lolos QC:</span>
                <span className="font-mono font-bold text-teal-600 text-base">{qcFinish} spl</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                  Pencatatan Validasi QC Shift
                </h4>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">Total Beban QC: <strong>{totalQcLoad} spl</strong></span>
                  <span className="text-slate-300">|</span>
                  <span className="text-amber-600 font-bold">OS QC Sisa: {qcBal} spl</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {renderLockedBalanceField('QC Saldo Awal (OS Shift Lalu)', qcOs, 'qc', 'Stasiun Validasi QC', setQcOs)}

                <div>
                  <label className="text-[11px] font-bold text-blue-700 dark:text-blue-400">
                    Received QC (Otomatis dari Finished WDXRF)
                  </label>
                  <div className="w-full mt-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 font-mono text-center font-bold text-blue-700 dark:text-blue-300">
                    {qcReceived} sampel
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    Finished QC (Lolos Validasi & Kriteria Mutu)
                  </label>
                  <input 
                    type="number" 
                    value={qcFinish} 
                    onChange={e => setQcFinish(Number(e.target.value))}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-700 font-mono text-center font-bold text-emerald-700 dark:text-emerald-300"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span>Status Saldo Antrean QC:</span>
                <strong className="font-mono">{totalQcLoad} beban QC − {qcFinish} lolos validasi = {qcBal} spl OS QC</strong>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* SUB-MENU 5: REPORTING */}
        {/* ========================================================================= */}
        {activeSubMenu === 'reporting' && (
          <div className="space-y-6">
            
            {/* Banner Guide */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Stasiun Pelaporan & Penerbitan Sertifikat Analisis (CoA Release)
                </h3>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Data <strong>Received Pelaporan otomatis masuk</strong> dari hasil selesai QC ({reportReceived} spl). Selesai dicetak dan dirilis ke klien/tambang.
                </p>
              </div>
              <div className="text-right text-xs">
                <span className="text-slate-500 block">CoA Selesai Rilis:</span>
                <span className="font-mono font-bold text-emerald-600 text-base">{reportDone} CoA</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h4 className="font-bold text-sm text-slate-800 dark:text-white">
                  Penerbitan Laporan / CoA Shift
                </h4>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-slate-500">Total Beban Laporan: <strong>{totalReportLoad} CoA</strong></span>
                  <span className="text-slate-300">|</span>
                  <span className="text-amber-600 font-bold">Pending CoA: {reportBal} CoA</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {renderLockedBalanceField('Report Saldo Awal (Pending Shift Lalu)', reportOs, 'report', 'Stasiun Pelaporan & Pelepasan CoA', setReportOs)}

                <div>
                  <label className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                    Received Pelaporan (Otomatis dari Finished QC)
                  </label>
                  <div className="w-full mt-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 font-mono text-center font-bold text-emerald-700 dark:text-emerald-300">
                    {reportReceived} sampel lolos
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-teal-700 dark:text-teal-400">
                    CoA Selesai Rilis (Done Released)
                  </label>
                  <input 
                    type="number" 
                    value={reportDone} 
                    onChange={e => setReportDone(Number(e.target.value))}
                    className="w-full mt-1.5 px-3 py-2 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-300 dark:border-teal-700 font-mono text-center font-bold text-teal-700 dark:text-teal-300"
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                <span>Status Saldo Pending Rilis:</span>
                <strong className="font-mono">{totalReportLoad} beban laporan − {reportDone} rilis = {reportBal} CoA pending</strong>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* FLOATING ACTION BOTTOM BAR */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-3 text-slate-500 hidden sm:flex">
            <span>Ringkasan Shift {regu}:</span>
            <span className="font-mono text-slate-800 dark:text-white">Press Finish: <strong>{pressFinish}</strong></span>
            <span>•</span>
            <span className="font-mono text-slate-800 dark:text-white">EDXRF: <strong>{edxrfTotal}</strong></span>
            <span>•</span>
            <span className="font-mono text-slate-800 dark:text-white">Fusion: <strong>{fusionFinishCount}</strong></span>
            <span>•</span>
            <span className="font-mono text-slate-800 dark:text-white">WDXRF: <strong>{wdxrfTotal}</strong></span>
            <span>•</span>
            <span className="font-mono text-slate-800 dark:text-white">CoA Done: <strong>{reportDone}</strong></span>
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 hidden sm:inline flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Tersambung ke Daily Performance
            </span>
            <button
              onClick={handleSaveAllRecord}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-500/25 cursor-pointer transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan & Sinkronkan Laporan Shift</span>
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL KOREKSI SALDO AWAL (TRACEBACK AUDIT OVERRIDE & RECONCILIATION) */}
      <BalanceOverrideModal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        stationKey={overrideStationKey}
        stationName={overrideStationName}
        currentValue={overrideCurrentValue}
        tracebackContext={currentStationTracebackContext}
        previousShiftInfo={{
          date: currentStationTracebackContext.date,
          shift: currentStationTracebackContext.shift,
          regu: currentStationTracebackContext.regu,
          foreman: currentStationTracebackContext.foreman,
          originalBalance: currentStationTracebackContext.officialOs,
          intake: currentStationTracebackContext.receivedCount,
          finished: currentStationTracebackContext.finishedCount,
          stationName: overrideStationName,
          upstreamStation: currentStationTracebackContext.upstreamStationName
        }}
        currentDate={date}
        currentShift={shiftType}
        currentRegu={regu}
        availableEmployees={currentReguEmployees.map(e => ({
          nik: String(e.nik || e.NIK || ''),
          name: String(e.nama || e.name || e.Nama || 'Operator')
        }))}
        onApplyOverride={handleApplyOverride}
        onApplyReconciliation={handleApplyReconciliation}
      />

      {/* MODAL SKEMA TRACEBACK & AUDIT TRAIL LENGKAP */}
      <TracebackSchemeModal
        isOpen={tracebackModalOpen}
        onClose={() => setTracebackModalOpen(false)}
      />

      {/* MODAL SMART PASTE CLIPBOARD EXCEL */}
      <ExcelClipboardPasteModal
        isOpen={isExcelPasteModalOpen}
        onClose={() => setIsExcelPasteModalOpen(false)}
        onApplyData={handleApplyExcelData}
      />

    </div>
  );
};
