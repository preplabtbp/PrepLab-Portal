import { VerifiedBadge } from '../VerifiedBadge';
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import SignatureCanvas from 'react-signature-canvas';
import {
  ChevronDown,
  ChevronUp,
  Cpu,
  Flame,
  Minimize2,
  Scale,
  Snowflake,
  Zap,
  Wind,
  Package,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Sparkles,
  Check,
  Wrench,
  Thermometer,
  Droplets,
  RotateCcw,
  Layers,
  Send,
  SlidersHorizontal,
  Info,
  PenTool,
  Trash2,
  ShieldCheck,
  Save,
  X,
  UserCheck,
  RefreshCw,
  FileText,
  KeyRound,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button, Card, Input } from '../ui';
import {
  P2H_LAB_ROOMS,
  P2H_LOGISTICS_ITEMS,
  CALIBRATION_WEIGHTS,
  P2HRoomSection,
  P2HLabTool,
  P2HGasInventory
} from '../../data/p2hLaboratoryRooms';
import { exportP2HLaboratoryExcel, P2HToolRecordStatus } from '../../utils/exportP2HLaboratoryExcel';
import { exportP2HLaboratoryPdf } from '../../utils/exportP2HLaboratoryPdf';
import { getSafeSignatureDataUrl } from '../../utils/signatureUtils';
import { appendRowsToSheet, getRosterData } from '../../sheets-api';
import { P2HLaboratoryApprovalQueue, P2HLabReport } from './P2HLaboratoryApprovalQueue';

interface SpvLabOption {
  nik: string;
  name: string;
  jabatan: string;
  section: string;
  pt?: string;
  shiftCode: string;
  shiftDesc: string;
  isOnDuty: boolean;
  isCurrentShiftMatch: boolean;
}

function parseSpvShift(shiftCodeRaw: string, currentFormShift: string) {
  const code = (shiftCodeRaw || '-').toUpperCase().trim();
  let shiftDesc = code;
  let isOnDuty = false;

  if (code === 'D') {
    shiftDesc = 'Shift Siang';
    isOnDuty = true;
  } else if (code === 'N') {
    shiftDesc = 'Shift Malam';
    isOnDuty = true;
  } else if (code === 'LS' || code === 'S') {
    shiftDesc = 'Standby';
    isOnDuty = true;
  } else if (code === 'OFF') {
    shiftDesc = 'Off / Libur';
  } else if (code.startsWith('C') || code === 'CT' || code === 'CE' || code === 'CI' || code === 'CS' || code === 'CR') {
    shiftDesc = 'Cuti';
  } else if (code === 'TRV' || code === 'TV') {
    shiftDesc = 'Travel';
  } else if (code === '-' || !code) {
    shiftDesc = 'Tidak Ada Jadwal';
  }

  const isCurrentShiftMatch =
    (currentFormShift === 'Shift Siang' && code === 'D') ||
    (currentFormShift === 'Shift Malam' && code === 'N') ||
    code === 'LS' || code === 'S';

  return { code, shiftDesc, isOnDuty, isCurrentShiftMatch };
}

interface P2HLaboratoryAccordionFormProps {
  inspectorName: string;
  inspectorNik: string;
  onBack: () => void;
  devOptions?: any;
}

export function P2HLaboratoryAccordionForm({
  inspectorName,
  inspectorNik,
  onBack,
  devOptions
}: P2HLaboratoryAccordionFormProps) {
  // LocalStorage draft key
  const DRAFT_KEY = `p2h_lab_draft_${inspectorNik || 'user'}`;

  // Active accordion open states (map of room id -> boolean)
  // By default, open the first room (Ruang XRF)
  const [openRooms, setOpenRooms] = useState<Record<string, boolean>>({
    'ruang-xrf': true,
    'ruang-fusion': false,
    'ruang-press': false,
    'ruang-timbang': false,
    'ruang-chiller': false,
    'ruang-ups': false,
    'ruang-scrubber': false,
    'logistik': false,
  });

  // Selected Room in Dropdown ('all' or specific room id)
  const [selectedDropdownRoom, setSelectedDropdownRoom] = useState<string>('all');

  // Tool statuses state
  const [toolStatuses, setToolStatuses] = useState<Record<string, P2HToolRecordStatus>>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.toolStatuses) {
          // Sanitize any legacy '-' values into 'N/A'
          Object.keys(parsed.toolStatuses).forEach(k => {
            const s = parsed.toolStatuses[k];
            if (s.bodyDalam === '-') s.bodyDalam = 'N/A';
            if (s.bodyLuar === '-') s.bodyLuar = 'N/A';
            if (s.filter === '-') s.filter = 'N/A';
            if (s.elektrikal === '-') s.elektrikal = 'N/A';
          });
          return parsed.toolStatuses;
        }
      }
    } catch (e) {
      console.warn('Gagal membaca draft P2H Lab', e);
    }

    // Default statuses based on official template presets
    const initial: Record<string, P2HToolRecordStatus> = {};
    for (const room of P2H_LAB_ROOMS) {
      for (const tool of room.tools) {
        const isSpare = (tool.defaultNotes || '').toUpperCase().includes('SPARE') || tool.defaultCondition === 'Spare';
        initial[tool.id] = isSpare ? {
          bodyDalam: 'N/A',
          bodyLuar: 'N/A',
          filter: 'N/A',
          kondisi: 'Spare',
          elektrikal: 'N/A',
          keterangan: 'SPARE'
        } : {
          bodyDalam: 'Bersih',
          bodyLuar: 'Bersih',
          filter: tool.hasFilter ? 'Bersih' : 'N/A',
          kondisi: tool.defaultCondition || 'Normal',
          elektrikal: tool.defaultElectrical || 'Normal',
          keterangan: tool.defaultNotes || ''
        };
      }
    }
    return initial;
  });

  // Logistics & Consumables counts (Jumlah)
  const [logisticsCounts, setLogisticsCounts] = useState<Record<string, string | number>>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.logisticsCounts) return parsed.logisticsCounts;
      }
    } catch {}
    const init: Record<string, string | number> = {};
    P2H_LOGISTICS_ITEMS.forEach(item => {
      init[item.id] = '';
    });
    return init;
  });

  // Gas & Support params
  const [gasInventory, setGasInventory] = useState<P2HGasInventory>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.gasInventory) return parsed.gasInventory;
      }
    } catch {}
    return {
      helium: {
        krishna: { isi: 0, kosong: 0 },
        logistik: { isi: 0, kosong: 0 }
      },
      argon: {
        krishna: { isi: 0, kosong: 0 },
        logistik: { isi: 0, kosong: 0 }
      },
      trayLoiCount: '',
      rakKayuBeadPellet: '',
      aquadestIsi: '',
      aquadestKosong: ''
    };
  });

  // Calibration Weights (Jumlah per standar)
  const [calibrationWeights, setCalibrationWeights] = useState<Record<string, string | number>>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.calibrationWeights) return parsed.calibrationWeights;
      }
    } catch {}
    const init: Record<string, string | number> = {};
    CALIBRATION_WEIGHTS.forEach(w => {
      init[w] = '';
    });
    return init;
  });

  // Hanya 2 Shift: Shift Siang & Shift Malam
  const [shift, setShift] = useState<string>('Shift Siang');
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Signature and Supervisor states
  const SAVED_SIG_KEY = `p2h_saved_signature_${inspectorNik || 'user'}`;
  const [supervisorName, setSupervisorName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.supervisorName) return parsed.supervisorName;
      }
    } catch {}
    return 'Laboratorium Supervisor';
  });
  const [selectedSpvNik, setSelectedSpvNik] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.selectedSpvNik) return parsed.selectedSpvNik;
      }
    } catch {}
    return '';
  });
  const [spvList, setSpvList] = useState<SpvLabOption[]>([]);
  const [loadingSpv, setLoadingSpv] = useState<boolean>(false);
  const [showSignModal, setShowSignModal] = useState<boolean>(false);
  const [declarationChecked, setDeclarationChecked] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [savedSignatureUrl, setSavedSignatureUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SAVED_SIG_KEY) || null;
    } catch {
      return null;
    }
  });
  const [useSavedSignature, setUseSavedSignature] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem(SAVED_SIG_KEY);
    } catch {
      return false;
    }
  });
  const [saveSignatureToProfile, setSaveSignatureToProfile] = useState<boolean>(true);
  const [activeMainTab, setActiveMainTab] = useState<'form' | 'approval'>('form');
  const sigCanvasRef = useRef<SignatureCanvas | null>(null);

  // Encrypted Server Signature Integration
  const [hasServerSignature, setHasServerSignature] = useState(false);
  const [manualCanvasMode, setManualCanvasMode] = useState(false);
  const [unlockPinModalOpen, setUnlockPinModalOpen] = useState(false);
  const [pinUnlockInput, setPinUnlockInput] = useState('');
  const [showUnlockPin, setShowUnlockPin] = useState(false);
  const [unlockingPin, setUnlockingPin] = useState(false);

  useEffect(() => {
    const checkServerSig = async () => {
      try {
        const token = localStorage.getItem('p2h_token') || localStorage.getItem('token') || '';
        const res = await fetch('/api/signature/status', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await res.json();
        if (data.success && data.hasSignature && data.hasPin) {
          setHasServerSignature(true);
        }
      } catch (e) {}
    };
    checkServerSig();
  }, []);

  const handleUnlockServerSignature = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pinUnlockInput || !/^\d{6}$/.test(pinUnlockInput)) {
      return toast.error('Masukkan 6 digit PIN tanda tangan Anda');
    }
    setUnlockingPin(true);
    try {
      const token = localStorage.getItem('p2h_token') || localStorage.getItem('token') || '';
      const res = await fetch('/api/signature/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          pin: pinUnlockInput,
          nik: inspectorNik,
          name: inspectorName 
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'PIN tanda tangan salah');

      setSavedSignatureUrl(data.signatureData);
      setUseSavedSignature(true);
      setManualCanvasMode(false);
      setUnlockPinModalOpen(false);
      setPinUnlockInput('');
      toast.success('Tanda tangan profil dari Pengaturan berhasil diterapkan!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal membuka tanda tangan');
    } finally {
      setUnlockingPin(false);
    }
  };

  // References to scroll targets
  const roomRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch SPV list from Roster
  const loadSpvFromRoster = async (forceRefresh = false) => {
    try {
      setLoadingSpv(true);
      const res: any = await getRosterData({ force: forceRefresh });
      const rawList: any[] = Array.isArray(res) ? res : (res?.roster || []);

      // Filter for Laboratory Supervisor strictly for TBP / GPS (exclude GTS and exclude maintenance)
      const filtered = rawList.filter((e: any) => {
        const pos = (e.jabatan || '').toLowerCase();
        const sec = (e.section || e.department || '').toLowerCase();
        const pt = (e.pt || '').toUpperCase().trim();
        const nik = (e.nik || '').toUpperCase().trim();

        // 1. Must be Laboratory Supervisor
        const isLabSupervisor = (pos.includes('supervisor') || pos.includes('spv')) && 
                                (pos.includes('lab') || sec.includes('lab'));

        // 2. EXCLUDE Maintenance
        const isMaintenance = pos.includes('maintenance') || sec.includes('maintenance');

        // 3. EXCLUDE Preparation
        const isPrep = pos.includes('preparation') || pos.includes('prep') || sec.includes('prep');

        // 4. EXCLUDE GTS employees (NIK prefix 03D or PT GTS)
        const isGts = pt === 'GTS' || pt.includes('GTS') || pos.includes('gts') || nik.startsWith('03D');

        // 5. ONLY include TBP or GPS
        const isTbpOrGps = pt.includes('TBP') || pt.includes('GPS') || nik.startsWith('04D') || nik.startsWith('02D');

        return isLabSupervisor && !isMaintenance && !isPrep && !isGts && isTbpOrGps;
      });

      const mapped: SpvLabOption[] = filtered.map((e: any) => {
        const shiftCodeRaw = e.schedule?.[0]?.shiftCode || '-';
        const { code, shiftDesc, isOnDuty, isCurrentShiftMatch } = parseSpvShift(shiftCodeRaw, shift);
        const ptName = e.pt ? e.pt.toUpperCase() : (e.nik?.startsWith('04D') ? 'TBP' : 'GPS');
        return {
          nik: e.nik,
          name: e.name,
          jabatan: e.jabatan,
          section: e.section || e.department || '',
          pt: ptName,
          shiftCode: code,
          shiftDesc,
          isOnDuty,
          isCurrentShiftMatch
        };
      });

      // Sort: Current shift match first, then On Duty, then Laboratory Supervisor, then Alphabetical
      mapped.sort((a, b) => {
        if (a.isCurrentShiftMatch !== b.isCurrentShiftMatch) return a.isCurrentShiftMatch ? -1 : 1;
        if (a.isOnDuty !== b.isOnDuty) return a.isOnDuty ? -1 : 1;
        const aIsLab = a.jabatan.toLowerCase().includes('laboratory supervisor');
        const bIsLab = b.jabatan.toLowerCase().includes('laboratory supervisor');
        if (aIsLab !== bIsLab) return aIsLab ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      setSpvList(mapped);

      // Auto-select if currently default placeholder or empty
      if ((!supervisorName || supervisorName === 'Laboratorium Supervisor') && mapped.length > 0) {
        const defaultSpv = mapped.find(s => s.isCurrentShiftMatch) || mapped.find(s => s.isOnDuty) || mapped[0];
        if (defaultSpv) {
          setSupervisorName(defaultSpv.name);
          setSelectedSpvNik(defaultSpv.nik);
        }
      } else if (supervisorName && !selectedSpvNik) {
        const matched = mapped.find(s => s.name.toLowerCase() === supervisorName.toLowerCase());
        if (matched) {
          setSelectedSpvNik(matched.nik);
        } else {
          setSelectedSpvNik('custom');
        }
      }
    } catch (err) {
      console.error('Gagal memuat SPV dari roster:', err);
    } finally {
      setLoadingSpv(false);
    }
  };

  useEffect(() => {
    loadSpvFromRoster();
  }, []);

  // Update shift matching when form shift changes
  useEffect(() => {
    if (spvList.length > 0) {
      setSpvList(prev => {
        const updated = prev.map(s => {
          const { isCurrentShiftMatch } = parseSpvShift(s.shiftCode, shift);
          return { ...s, isCurrentShiftMatch };
        });
        updated.sort((a, b) => {
          if (a.isCurrentShiftMatch !== b.isCurrentShiftMatch) return a.isCurrentShiftMatch ? -1 : 1;
          if (a.isOnDuty !== b.isOnDuty) return a.isOnDuty ? -1 : 1;
          const aIsLab = a.jabatan.toLowerCase().includes('laboratory supervisor');
          const bIsLab = b.jabatan.toLowerCase().includes('laboratory supervisor');
          if (aIsLab !== bIsLab) return aIsLab ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        return updated;
      });
    }
  }, [shift]);

  // Auto-save draft to localStorage
  useEffect(() => {
    try {
      const draft = {
        toolStatuses,
        logisticsCounts,
        gasInventory,
        calibrationWeights,
        shift,
        supervisorName,
        selectedSpvNik,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Gagal menyimpan draft P2H Lab', e);
    }
  }, [toolStatuses, logisticsCounts, gasInventory, calibrationWeights, shift, supervisorName, selectedSpvNik]);

  // Handle dropdown selection (Quick-jump & auto expand target)
  const handleDropdownSelect = (roomId: string) => {
    setSelectedDropdownRoom(roomId);
    if (roomId === 'all') {
      // Expand all rooms
      setOpenRooms({
        'ruang-xrf': true,
        'ruang-fusion': true,
        'ruang-press': true,
        'ruang-timbang': true,
        'ruang-chiller': true,
        'ruang-ups': true,
        'ruang-scrubber': true,
        'logistik': true,
      });
    } else if (roomId === 'pengesahan') {
      setTimeout(() => {
        const targetEl = roomRefs.current['pengesahan'];
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      // Accordion mode: open ONLY selected room and collapse others to save vertical scroll
      setOpenRooms(prev => {
        const next: Record<string, boolean> = {};
        Object.keys(prev).forEach(k => {
          next[k] = k === roomId;
        });
        next[roomId] = true;
        return next;
      });

      // Smooth scroll to the selected section
      setTimeout(() => {
        const targetEl = roomRefs.current[roomId];
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const toggleRoomAccordion = (roomId: string) => {
    setOpenRooms(prev => ({
      ...prev,
      [roomId]: !prev[roomId]
    }));
  };

  const toggleAllAccordions = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    P2H_LAB_ROOMS.forEach(r => {
      next[r.id] = expand;
    });
    next['logistik'] = expand;
    setOpenRooms(next);
    if (expand) setSelectedDropdownRoom('all');
  };

  // Quick action: Mark all tools in 1 room as Clean & Normal (Spare tools retain '-')
  const handleQuickMarkRoomNormal = (room: P2HRoomSection) => {
    setToolStatuses(prev => {
      const next = { ...prev };
      for (const tool of room.tools) {
        const isSpare = (tool.defaultNotes || '').toUpperCase().includes('SPARE') || tool.defaultCondition === 'Spare';
        if (isSpare) {
          next[tool.id] = {
            bodyDalam: 'N/A',
            bodyLuar: 'N/A',
            filter: 'N/A',
            kondisi: 'Spare',
            elektrikal: 'N/A',
            keterangan: 'SPARE'
          };
        } else {
          next[tool.id] = {
            bodyDalam: 'Bersih',
            bodyLuar: 'Bersih',
            filter: tool.hasFilter ? 'Bersih' : 'N/A',
            kondisi: tool.defaultCondition || 'Normal',
            elektrikal: 'Normal',
            keterangan: tool.defaultNotes || '',
            chillerTemp: next[tool.id]?.chillerTemp || (room.hasChillerParams ? '20' : undefined),
            chillerWaterLevel: next[tool.id]?.chillerWaterLevel || (room.hasChillerParams ? 'Normal' : undefined)
          };
        }
      }
      return next;
    });
    toast.success(`Semua alat di ${room.name} ditandai Bersih & Normal!`);
  };

  // Update single tool status field (Auto '-' if Spare)
  const updateToolStatus = (toolId: string, field: keyof P2HToolRecordStatus, value: any) => {
    setToolStatuses(prev => {
      const current = prev[toolId] || {
        bodyDalam: 'Bersih',
        bodyLuar: 'Bersih',
        filter: 'Bersih',
        kondisi: 'Normal',
        elektrikal: 'Normal',
        keterangan: ''
      };
      const updated = { ...current, [field]: value };

      // Jika kondisi diubah jadi 'Spare' atau keterangan mengandung 'SPARE', otomatis set semua kategori 'N/A'
      if ((field === 'kondisi' && (value === 'Spare')) || 
          (field === 'keterangan' && typeof value === 'string' && value.toUpperCase().includes('SPARE'))) {
        updated.bodyDalam = 'N/A';
        updated.bodyLuar = 'N/A';
        updated.filter = 'N/A';
        updated.elektrikal = 'N/A';
        if (!updated.keterangan || updated.keterangan === '') {
          updated.keterangan = 'SPARE';
        }
      }

      return {
        ...prev,
        [toolId]: updated
      };
    });
  };

  // Count progress
  const allLabTools = P2H_LAB_ROOMS.flatMap(r => r.tools);
  const checkedCount = allLabTools.filter(t => toolStatuses[t.id]?.kondisi).length;
  const totalCount = allLabTools.length;
  const progressPercent = Math.round((checkedCount / totalCount) * 100);

  // Submit with Foreman signature validation (Directly from form)
  const handleSubmit = async () => {
    let finalSignatureUrl = savedSignatureUrl;
    const hasCanvasDrawn = sigCanvasRef.current && !sigCanvasRef.current.isEmpty();

    if (!finalSignatureUrl) {
      if (manualCanvasMode && hasCanvasDrawn && sigCanvasRef.current) {
        finalSignatureUrl = getSafeSignatureDataUrl(sigCanvasRef.current);
      } else if (hasServerSignature) {
        const signEl = roomRefs.current['pengesahan'];
        if (signEl) signEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setUnlockPinModalOpen(true);
        return toast.info('Silakan masukkan 6 digit PIN Tanda Tangan Anda untuk mengesahkan formulir');
      } else if (hasCanvasDrawn && sigCanvasRef.current) {
        finalSignatureUrl = getSafeSignatureDataUrl(sigCanvasRef.current);
      } else {
        const signEl = roomRefs.current['pengesahan'];
        if (signEl) signEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return toast.error('Silakan bubuhkan tanda tangan Foreman / Analis pada kolom TTD di bawah!');
      }
    }

    if (!declarationChecked) {
      const signEl = roomRefs.current['pengesahan'];
      if (signEl) signEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return toast.error('Silakan centang pernyataan keabsahan pemeriksaan terlebih dahulu!');
    }

    if (submitting) return;
    try {
      setSubmitting(true);
      const timestamp = new Date().toISOString();
      const inspectionRows: any[][] = [];
      const downtimeRows: any[][] = [];

      for (const room of P2H_LAB_ROOMS) {
        for (const tool of room.tools) {
          const s = toolStatuses[tool.id];
          const criteriaNote = `[Body Dalam: ${s.bodyDalam}, Body Luar: ${s.bodyLuar}, Filter: ${s.filter}, Elektrikal: ${s.elektrikal}]`;
          const fullNotes = [criteriaNote, s.keterangan].filter(Boolean).join(' - ');

          inspectionRows.push([
            timestamp,
            `${tool.name} (${room.name})`,
            s.kondisi,
            inspectorName,
            fullNotes
          ]);

          if (s.kondisi === 'Breakdown') {
            const dtId = crypto.randomUUID();
            downtimeRows.push([
              dtId,
              tool.name,
              timestamp,
              '',
              `[P2H Lab ${room.name}] ${s.keterangan || 'Breakdown saat pengecekan harian'}`,
              'Breakdown'
            ]);
          }
        }
      }

      if (!isDemoMode) {
        await appendRowsToSheet('Inspections', inspectionRows, devOptions);
        if (downtimeRows.length > 0) {
          await appendRowsToSheet('Downtime', downtimeRows, devOptions);
        }
      } else {
        console.log('[P2H LAB] Mode simulasi aktif - Pengiriman ke sheet Inspections & Downtime dilewati');
      }

      // Simpan structured report ke backend & local cache untuk alur Approval SPV/SPT/Manager
      const reportId = `P2H-LAB-${isDemoMode ? 'DEMO-' : ''}${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${shift.replace(/\s+/g, '_')}-${inspectorNik || 'ANALYST'}`;
      const reportPayload: P2HLabReport = {
        id: reportId,
        date: new Date().toISOString(),
        shift,
        inspectorName,
        inspectorNik,
        inspectorSignatureUrl: finalSignatureUrl,
        signatureUrl: finalSignatureUrl,
        inspectorSignedAt: new Date().toISOString(),
        supervisorName,
        supervisorNik: selectedSpvNik,
        sptName: 'Tigwa Anggawikara',
        managerName: 'Deni Nugraha Perdiana',
        toolStatuses,
        logisticsCounts,
        gasInventory,
        calibrationWeightsCounts: calibrationWeights,
        notes: isDemoMode ? '[DEMO SIMULASI]' : '',
        status: 'PENDING_SPV',
        isDemo: isDemoMode
      };

      try {
        await fetch('/api/inspections/p2h-lab', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reportPayload)
        });
      } catch (err) {
        console.warn('Gagal sync ke server P2H Lab approval:', err);
      }

      try {
        const raw = localStorage.getItem('preplab_p2h_lab_reports_v1');
        const list: P2HLabReport[] = raw ? JSON.parse(raw) : [];
        const next = [reportPayload, ...list.filter(r => r.id !== reportPayload.id)];
        localStorage.setItem('preplab_p2h_lab_reports_v1', JSON.stringify(next));
      } catch {}

      toast.success(isDemoMode 
        ? 'Laporan Mode Simulasi P2H berhasil dibuat! Notifikasi ke SPV telah dinonaktifkan.' 
        : 'Laporan P2H Laboratorium berhasil dikirim! Menunggu review SPV Lab.'
      );
      localStorage.removeItem(DRAFT_KEY);
      setActiveMainTab('approval');
    } catch (err: any) {
      toast.error('Gagal menyimpan laporan: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    try {
      exportP2HLaboratoryExcel({
        inspectorName,
        inspectionDate: new Date().toISOString(),
        shift,
        toolStatuses,
        logisticsCounts,
        gasInventory,
        calibrationWeightsCounts: calibrationWeights,
        supervisorName,
      });
      toast.success('File Excel TBP-FR-PL-LAB-04.01-01 berhasil di-download!');
    } catch (err: any) {
      toast.error('Gagal mengekspor Excel: ' + err.message);
    }
  };

  // Export PDF (Sesuai Template Resmi TBP-FR-PL-LAB-04.01-01)
  const handleExportPdf = async () => {
    let finalSignatureUrl = savedSignatureUrl;
    if (sigCanvasRef.current && !sigCanvasRef.current.isEmpty()) {
      finalSignatureUrl = getSafeSignatureDataUrl(sigCanvasRef.current);
    }

    try {
      setDownloadingPdf(true);
      toast.info('Menyiapkan dokumen PDF resmi sesuai template...');
      await exportP2HLaboratoryPdf({
        inspectorName,
        inspectorNik,
        inspectionDate: new Date().toISOString(),
        shift,
        toolStatuses,
        logisticsCounts,
        gasInventory,
        calibrationWeightsCounts: calibrationWeights,
        supervisorName,
        signatureUrl: finalSignatureUrl,
        pageMode: '1-page',
      });
      toast.success('Dokumen PDF TBP-FR-PL-LAB-04.01-01 berhasil di-download!');
    } catch (err: any) {
      console.error('Gagal export PDF:', err);
      toast.error('Gagal mengekspor PDF: ' + (err?.message || err));
    } finally {
      setDownloadingPdf(false);
    }
  };

  // Icon selector helper
  const renderRoomIcon = (iconName: string) => {
    switch (iconName) {
      case 'Cpu': return <Cpu className="w-5 h-5 text-sky-500" />;
      case 'Flame': return <Flame className="w-5 h-5 text-amber-500" />;
      case 'Minimize2': return <Minimize2 className="w-5 h-5 text-indigo-500" />;
      case 'Scale': return <Scale className="w-5 h-5 text-emerald-500" />;
      case 'Snowflake': return <Snowflake className="w-5 h-5 text-cyan-500" />;
      case 'Zap': return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'Wind': return <Wind className="w-5 h-5 text-teal-500" />;
      default: return <Package className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-4 pb-36 sm:pb-24 animate-in fade-in duration-300">
      {/* Top Header Card - Compact, Interactive & Proportional */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-md relative overflow-hidden border border-slate-800">
        <div className="relative z-10 space-y-3">
          {/* Top Row: Badge & Back button */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/90 border border-slate-700 rounded-full text-xs font-medium text-teal-400 shadow-xs">
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
              <span className="font-semibold text-slate-200">TBP-FR-PL-LAB-04.01-01</span>
              <span className="text-slate-400">• Rev 0.0</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={downloadingPdf}
                title="Cetak Dokumen PDF 1 Halaman F4"
                className="bg-rose-950/80 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 rounded-xl px-2.5 py-1 text-xs font-semibold h-7 transition-colors shadow-xs flex items-center gap-1"
              >
                <FileText className={`w-3 h-3 text-rose-400 ${downloadingPdf ? 'animate-spin' : ''}`} />
                <span>PDF (F4)</span>
              </button>

              <button
                type="button"
                onClick={onBack}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl px-3 py-1 text-xs font-semibold h-7 transition-colors shadow-xs"
              >
                Kembali
              </button>
            </div>
          </div>

          {/* Title & Inspector */}
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white leading-snug">
              Cek List P2H Peralatan Laboratorium
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Inspektor: <span className="font-semibold text-white">{inspectorName}</span> <span className="text-slate-500">•</span> Edisi 12 Des 2022
            </p>
          </div>

          {/* Stats Bar & Shift Selector */}
          <div className="pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className="px-2 py-0.5 rounded-lg bg-teal-950/70 border border-teal-500/40 flex items-center justify-center font-bold text-teal-400 text-xs">
                {progressPercent}%
              </div>
              <div className="text-xs">
                <span className="text-slate-400 font-normal">Progres: </span>
                <span className="font-bold text-white">{checkedCount}/{totalCount} Alat</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-normal">Shift:</span>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-teal-400 cursor-pointer h-7"
              >
                <option value="Shift Siang" className="bg-slate-900 text-white">Shift Siang</option>
                <option value="Shift Malam" className="bg-slate-900 text-white">Shift Malam</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW SWITCHER: FORM CHECKLIST VS ANTREAN APPROVAL */}
      <div className="flex items-center gap-1.5 p-1 bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl shadow-xs">
        <button
          type="button"
          onClick={() => setActiveMainTab('form')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeMainTab === 'form'
              ? 'bg-teal-600 text-white shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-bg)]'
          }`}
        >
          <FileText className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">Form Checklist P2H</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('approval')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            activeMainTab === 'approval'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-bg)]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">Review &amp; TTD SPV/SPT</span>
        </button>
      </div>

      {activeMainTab === 'approval' ? (
        <P2HLaboratoryApprovalQueue
          currentUserName={inspectorName}
          currentUserNik={inspectorNik}
          onBackToForm={() => setActiveMainTab('form')}
        />
      ) : (
        <>
          {/* RUANGAN SELECTOR CARD (STICKY DROPDOWN ONLY) */}
          <div className="sticky top-14 sm:top-16 z-30 p-2 sm:p-2.5 bg-[var(--card-bg)]/95 backdrop-blur-md border border-[var(--border-main)] rounded-2xl shadow-sm transition-all">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <select
                  value={selectedDropdownRoom}
                  onChange={(e) => handleDropdownSelect(e.target.value)}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-teal-500/40 cursor-pointer shadow-xs truncate"
                >
                  <option value="all">📋 Semua Ruangan ({checkedCount}/{totalCount} Alat)</option>
                  
                  <optgroup label="Ruangan Laboratorium">
                    {P2H_LAB_ROOMS.map(r => {
                      const roomChecked = r.tools.filter(t => toolStatuses[t.id]?.kondisi).length;
                      const roomDone = roomChecked === r.tools.length;
                      return (
                        <option key={r.id} value={r.id}>
                          {roomDone ? '✓ ' : ''}{r.name} ({roomChecked}/{r.tools.length} alat)
                        </option>
                      );
                    })}
                  </optgroup>

                  <optgroup label="Bagian Lainnya">
                    <option value="logistik">📦 Logistik, Reagent & Gas</option>
                    <option value="pengesahan">✍️ Pengesahan & TTD Digital</option>
                  </optgroup>
                </select>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleAllAccordions(true)}
                  className="text-[11px] font-semibold h-8 px-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--card-bg)] text-[var(--text-main)] transition-colors shadow-xs"
                  title="Buka semua seksi"
                >
                  Buka
                </button>
                <button
                  type="button"
                  onClick={() => toggleAllAccordions(false)}
                  className="text-[11px] font-semibold h-8 px-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--card-bg)] text-[var(--text-main)] transition-colors shadow-xs"
                  title="Tutup semua seksi"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>

      {/* ACCORDION ROOM SECTIONS */}
      <div className="space-y-4">
        {P2H_LAB_ROOMS.map((room) => {
          const isOpen = !!openRooms[room.id];
          const roomTools = room.tools;
          const roomChecked = roomTools.filter(t => toolStatuses[t.id]?.kondisi).length;
          const isRoomComplete = roomChecked === roomTools.length;

          return (
            <div
              key={room.id}
              ref={el => { roomRefs.current[room.id] = el; }}
              className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-[var(--border-main)] bg-[var(--card-bg)] shadow-sm transition-all overflow-hidden"
            >
              {/* Accordion Header */}
              <div
                className={`p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                  isOpen ? 'bg-[var(--input-bg)]/60' : 'hover:bg-[var(--input-bg)]/40'
                }`}
                onClick={() => toggleRoomAccordion(room.id)}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-[200px]">
                  <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-[var(--border-main)] flex items-center justify-center shadow-sm shrink-0">
                    {renderRoomIcon(room.icon)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-[var(--text-main)] tracking-tight">
                        {room.name}
                      </h3>
                      {isRoomComplete ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Lengkap
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {roomChecked}/{roomTools.length} Alat
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                      {room.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickMarkRoomNormal(room);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors shadow-sm"
                    title="Tandai semua alat di ruangan ini Bersih & Normal"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                    <span className="hidden sm:inline">Tandai</span> Semua Normal
                  </button>

                  <div className="w-8 h-8 rounded-xl bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-muted)]">
                    {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Accordion Body */}
              {isOpen && (
                <div className="p-4 sm:p-5 border-t border-[var(--border-main)] space-y-4 animate-in slide-in-from-top-1 duration-200">
                  {/* Chiller Special Parameters */}
                  {room.hasChillerParams && (
                    <div className="p-4 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300 font-bold text-xs uppercase tracking-wider">
                        <Thermometer className="w-4 h-4" /> Parameter Khusus Sirkulasi Air Chiller
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {roomTools.filter(t => t.name.startsWith('CHILLER')).map(chl => {
                          const st: P2HToolRecordStatus | undefined = toolStatuses[chl.id];
                          return (
                            <div key={`param-${chl.id}`} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-cyan-100 dark:border-cyan-900/50 space-y-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{chl.name}</span>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] text-slate-500 uppercase font-bold">Suhu (°C)</label>
                                  <Input
                                    type="number"
                                    placeholder="Contoh: 20"
                                    value={st?.chillerTemp || ''}
                                    onChange={(e) => updateToolStatus(chl.id, 'chillerTemp', e.target.value)}
                                    className="h-8 text-xs font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] text-slate-500 uppercase font-bold">Level Air</label>
                                  <select
                                    value={st?.chillerWaterLevel || 'Normal'}
                                    onChange={(e) => updateToolStatus(chl.id, 'chillerWaterLevel', e.target.value)}
                                    className="w-full h-8 text-xs font-bold bg-[var(--input-bg)] border border-[var(--border-main)] rounded-lg px-2"
                                  >
                                    <option value="Normal">Normal</option>
                                    <option value="Rendah">Rendah (Tambah)</option>
                                    <option value="Tinggi">Tinggi</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tools List */}
                  <div className="space-y-3">
                    {roomTools.map((tool, idx) => {
                      const st = toolStatuses[tool.id] || {
                        bodyDalam: 'Bersih',
                        bodyLuar: 'Bersih',
                        filter: tool.hasFilter ? 'Bersih' : 'N/A',
                        kondisi: tool.defaultCondition || 'Normal',
                        elektrikal: 'Normal',
                        keterangan: tool.defaultNotes || ''
                      };

                      const isAbnormal = st.kondisi === 'Breakdown' || st.kondisi === 'Scrap' || st.elektrikal === 'Abnormal';
                      const isSpare = st.kondisi === 'Spare' || (st.keterangan || tool.defaultNotes || '').toUpperCase().includes('SPARE');

                      return (
                        <div
                          key={tool.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            isAbnormal
                              ? 'border-rose-300 dark:border-rose-900/80 bg-rose-50/40 dark:bg-rose-950/20'
                              : isSpare
                              ? 'border-slate-300 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 opacity-90'
                              : 'border-[var(--border-main)] bg-[var(--card-bg)] hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Tool Details */}
                            <div className="space-y-1 min-w-[220px]">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                                <h4 className="font-bold text-sm text-[var(--text-main)]">{tool.name}</h4>
                                {isSpare && (
                                  <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                    SPARE (Tidak Dicek)
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="px-2 py-0.5 rounded-md font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px]">
                                  {tool.assetNumber && tool.assetNumber !== '-' ? `Asset: ${tool.assetNumber}` : 'Non-Asset'}
                                </span>
                                {!tool.hasFilter && (
                                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                    • Tanpa Filter
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Inspection Criteria Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 flex-1 max-w-2xl">
                              {/* Body Dalam */}
                              <div>
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">
                                  Body Dalam
                                </label>
                                <select
                                  value={st.bodyDalam}
                                  onChange={(e) => updateToolStatus(tool.id, 'bodyDalam', e.target.value)}
                                  className={`w-full py-1.5 px-2 rounded-xl text-xs font-bold border transition-colors ${
                                    st.bodyDalam === 'Bersih'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                      : st.bodyDalam === 'N/A'
                                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                                  }`}
                                >
                                  <option value="Bersih">Bersih</option>
                                  <option value="Kotor">Kotor</option>
                                  <option value="N/A">N/A</option>
                                </select>
                              </div>

                              {/* Body Luar */}
                              <div>
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">
                                  Body Luar
                                </label>
                                <select
                                  value={st.bodyLuar}
                                  onChange={(e) => updateToolStatus(tool.id, 'bodyLuar', e.target.value)}
                                  className={`w-full py-1.5 px-2 rounded-xl text-xs font-bold border transition-colors ${
                                    st.bodyLuar === 'Bersih'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                      : st.bodyLuar === 'N/A'
                                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                                  }`}
                                >
                                  <option value="Bersih">Bersih</option>
                                  <option value="Kotor">Kotor</option>
                                  <option value="N/A">N/A</option>
                                </select>
                              </div>

                              {/* Filter */}
                              <div>
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">
                                  Filter
                                </label>
                                <select
                                  disabled={!tool.hasFilter && st.filter !== 'N/A'}
                                  value={st.filter}
                                  onChange={(e) => updateToolStatus(tool.id, 'filter', e.target.value)}
                                  className={`w-full py-1.5 px-2 rounded-xl text-xs font-bold border transition-colors ${
                                    st.filter === 'N/A' || !tool.hasFilter
                                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                                      : st.filter === 'Bersih'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                                  }`}
                                >
                                  <option value="Bersih">Bersih</option>
                                  <option value="Kotor">Kotor</option>
                                  <option value="N/A">N/A</option>
                                </select>
                              </div>

                              {/* Kondisi Alat */}
                              <div>
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">
                                  Kondisi Alat
                                </label>
                                <select
                                  value={st.kondisi}
                                  onChange={(e) => updateToolStatus(tool.id, 'kondisi', e.target.value)}
                                  className={`w-full py-1.5 px-2 rounded-xl text-xs font-bold border transition-colors ${
                                    st.kondisi === 'Normal'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                      : st.kondisi === 'Breakdown'
                                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                                      : st.kondisi === 'Spare'
                                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                      : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                                  }`}
                                >
                                  <option value="Normal">Normal</option>
                                  <option value="Standby">Standby</option>
                                  <option value="Breakdown">Breakdown</option>
                                  <option value="Spare">Spare</option>
                                  <option value="Scrap">Scrap</option>
                                </select>
                              </div>

                              {/* Elektrikal */}
                              <div>
                                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block mb-1">
                                  Elektrikal
                                </label>
                                <select
                                  value={st.elektrikal}
                                  onChange={(e) => updateToolStatus(tool.id, 'elektrikal', e.target.value)}
                                  className={`w-full py-1.5 px-2 rounded-xl text-xs font-bold border transition-colors ${
                                    st.elektrikal === 'Normal'
                                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                      : st.elektrikal === 'Abnormal'
                                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                  }`}
                                >
                                  <option value="Normal">Normal</option>
                                  <option value="Abnormal">Abnormal</option>
                                  <option value="N/A">N/A</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Keterangan Row */}
                          <div className="mt-3 pt-2.5 border-t border-[var(--border-main)]/60 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase shrink-0">
                              Keterangan:
                            </span>
                            <input
                              type="text"
                              placeholder="Catatan kondisi (opsional, contoh: tuas blower lepas, getaran halus, dsb)"
                              value={st.keterangan || ''}
                              onChange={(e) => updateToolStatus(tool.id, 'keterangan', e.target.value)}
                              className="w-full text-xs font-medium bg-[var(--input-bg)] border border-[var(--border-main)] rounded-lg px-2.5 py-1 text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* LOGISTIK, GAS & BATU TIMBANG SECTION */}
        <div
          ref={el => { roomRefs.current['logistik'] = el; }}
          className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border border-[var(--border-main)] bg-[var(--card-bg)] shadow-sm transition-all overflow-hidden"
        >
          {/* Header */}
          <div
            className={`p-4 sm:p-5 flex items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
              openRooms['logistik'] ? 'bg-[var(--input-bg)]/60' : 'hover:bg-[var(--input-bg)]/40'
            }`}
            onClick={() => toggleRoomAccordion('logistik')}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center shadow-sm shrink-0">
                <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[var(--text-main)] tracking-tight">
                  Logistik, Gas & Batu Timbang
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Inventaris peralatan gelas, sarung tangan, tabung gas Helium/Argon & standar kalibrasi
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-xl bg-[var(--input-bg)] flex items-center justify-center text-[var(--text-muted)]">
              {openRooms['logistik'] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>

          {/* Body */}
          {openRooms['logistik'] && (
            <div className="p-4 sm:p-5 border-t border-[var(--border-main)] space-y-6 animate-in slide-in-from-top-1 duration-200">
              {/* Gas Inventory Matrix */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" /> Stok Tabung Gas (Helium & Argon)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Lab Krishna */}
                  <div className="p-3.5 rounded-2xl border border-[var(--border-main)] bg-[var(--card-bg)] shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[var(--border-main)]/60 pb-2">
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-300">Lokasi: LAB KRISHNA</span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Stok Tabung</span>
                    </div>

                    {/* Helium */}
                    <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-[var(--input-bg)]/60 border border-[var(--border-main)]/50">
                      <div className="w-16 shrink-0">
                        <span className="text-xs font-bold text-[var(--text-main)] block">Helium</span>
                        <span className="text-[10px] text-slate-400">Gas XRF</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <label className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block text-center uppercase mb-0.5">
                            Isi
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={gasInventory.helium.krishna.isi || ''}
                            onChange={(e) => setGasInventory(prev => ({
                              ...prev,
                              helium: { ...prev.helium, krishna: { ...prev.helium.krishna, isi: Number(e.target.value) || 0 } }
                            }))}
                            className="h-8 text-xs font-bold text-center text-emerald-700 dark:text-emerald-300 w-full px-1"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="text-[9px] font-bold text-slate-500 uppercase block text-center mb-0.5">
                            Kosong
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={gasInventory.helium.krishna.kosong || ''}
                            onChange={(e) => setGasInventory(prev => ({
                              ...prev,
                              helium: { ...prev.helium, krishna: { ...prev.helium.krishna, kosong: Number(e.target.value) || 0 } }
                            }))}
                            className="h-8 text-xs font-bold text-center text-slate-600 dark:text-slate-400 w-full px-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Argon */}
                    <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-[var(--input-bg)]/60 border border-[var(--border-main)]/50">
                      <div className="w-16 shrink-0">
                        <span className="text-xs font-bold text-[var(--text-main)] block">Argon</span>
                        <span className="text-[10px] text-slate-400">Gas XRF</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <label className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block text-center uppercase mb-0.5">
                            Isi
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={gasInventory.argon.krishna.isi || ''}
                            onChange={(e) => setGasInventory(prev => ({
                              ...prev,
                              argon: { ...prev.argon, krishna: { ...prev.argon.krishna, isi: Number(e.target.value) || 0 } }
                            }))}
                            className="h-8 text-xs font-bold text-center text-emerald-700 dark:text-emerald-300 w-full px-1"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="text-[9px] font-bold text-slate-500 uppercase block text-center mb-0.5">
                            Kosong
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={gasInventory.argon.krishna.kosong || ''}
                            onChange={(e) => setGasInventory(prev => ({
                              ...prev,
                              argon: { ...prev.argon, krishna: { ...prev.argon.krishna, kosong: Number(e.target.value) || 0 } }
                            }))}
                            className="h-8 text-xs font-bold text-center text-slate-600 dark:text-slate-400 w-full px-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Logistik */}
                  <div className="p-3.5 rounded-2xl border border-[var(--border-main)] bg-[var(--card-bg)] shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[var(--border-main)]/60 pb-2">
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-300">Lokasi: LOGISTIK</span>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">Stok Tabung</span>
                    </div>

                    {/* Helium */}
                    <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-[var(--input-bg)]/60 border border-[var(--border-main)]/50">
                      <div className="w-16 shrink-0">
                        <span className="text-xs font-bold text-[var(--text-main)] block">Helium</span>
                        <span className="text-[10px] text-slate-400">Gas XRF</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <label className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block text-center uppercase mb-0.5">
                            Isi
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={gasInventory.helium.logistik.isi || ''}
                            onChange={(e) => setGasInventory(prev => ({
                              ...prev,
                              helium: { ...prev.helium, logistik: { ...prev.helium.logistik, isi: Number(e.target.value) || 0 } }
                            }))}
                            className="h-8 text-xs font-bold text-center text-emerald-700 dark:text-emerald-300 w-full px-1"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="text-[9px] font-bold text-slate-500 uppercase block text-center mb-0.5">
                            Kosong
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={gasInventory.helium.logistik.kosong || ''}
                            onChange={(e) => setGasInventory(prev => ({
                              ...prev,
                              helium: { ...prev.helium, logistik: { ...prev.helium.logistik, kosong: Number(e.target.value) || 0 } }
                            }))}
                            className="h-8 text-xs font-bold text-center text-slate-600 dark:text-slate-400 w-full px-1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Argon */}
                    <div className="flex items-center justify-between gap-2.5 p-2 rounded-xl bg-[var(--input-bg)]/60 border border-[var(--border-main)]/50">
                      <div className="w-16 shrink-0">
                        <span className="text-xs font-bold text-[var(--text-main)] block">Argon</span>
                        <span className="text-[10px] text-slate-400">Gas XRF</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <label className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block text-center uppercase mb-0.5">
                            Isi
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={gasInventory.argon.logistik.isi || ''}
                            onChange={(e) => setGasInventory(prev => ({
                              ...prev,
                              argon: { ...prev.argon, logistik: { ...prev.argon.logistik, isi: Number(e.target.value) || 0 } }
                            }))}
                            className="h-8 text-xs font-bold text-center text-emerald-700 dark:text-emerald-300 w-full px-1"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="text-[9px] font-bold text-slate-500 uppercase block text-center mb-0.5">
                            Kosong
                          </label>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={gasInventory.argon.logistik.kosong || ''}
                            onChange={(e) => setGasInventory(prev => ({
                              ...prev,
                              argon: { ...prev.argon, logistik: { ...prev.argon.logistik, kosong: Number(e.target.value) || 0 } }
                            }))}
                            className="h-8 text-xs font-bold text-center text-slate-600 dark:text-slate-400 w-full px-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional inputs: Tray LOI, Rak Kayu, Aquadest (Semua Jumlah) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3">
                  <div className="p-3 rounded-xl border border-[var(--border-main)] bg-[var(--card-bg)] space-y-1.5">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">
                      Tray LOI (Jumlah)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={gasInventory.trayLoiCount}
                      onChange={(e) => setGasInventory(prev => ({ ...prev, trayLoiCount: e.target.value }))}
                      className="h-8 text-xs font-bold text-center"
                    />
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border-main)] bg-[var(--card-bg)] space-y-1.5">
                    <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase block">
                      Rak Kayu Bead & Pellet (Jumlah)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={gasInventory.rakKayuBeadPellet}
                      onChange={(e) => setGasInventory(prev => ({ ...prev, rakKayuBeadPellet: e.target.value }))}
                      className="h-8 text-xs font-bold text-center"
                    />
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border-main)] bg-[var(--card-bg)] space-y-1.5">
                    <label className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase block">
                      Aquadest Isi (Jumlah)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={gasInventory.aquadestIsi}
                      onChange={(e) => setGasInventory(prev => ({ ...prev, aquadestIsi: e.target.value }))}
                      className="h-8 text-xs font-bold text-center text-emerald-700 dark:text-emerald-300"
                    />
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--border-main)] bg-[var(--card-bg)] space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">
                      Aquadest Kosong (Jumlah)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={gasInventory.aquadestKosong}
                      onChange={(e) => setGasInventory(prev => ({ ...prev, aquadestKosong: e.target.value }))}
                      className="h-8 text-xs font-bold text-center text-slate-600 dark:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Calibration Weights (Jumlah per Standar) */}
              <div className="space-y-3 pt-4 border-t border-[var(--border-main)]">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-500" /> Standar Kalibrasi Batu Timbang (Jumlah Pcs)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultCounts: Record<string, string | number> = {};
                      CALIBRATION_WEIGHTS.forEach(w => { defaultCounts[w] = '1'; });
                      setCalibrationWeights(defaultCounts);
                    }}
                    className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline"
                  >
                    Set Semua 1 Pcs
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
                  {CALIBRATION_WEIGHTS.map(w => (
                    <div
                      key={w}
                      className="p-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--card-bg)] text-center shadow-xs space-y-1"
                    >
                      <span className="text-xs font-bold text-[var(--text-main)] block">{w}</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={calibrationWeights[w] ?? ''}
                        onChange={(e) => setCalibrationWeights(prev => ({ ...prev, [w]: e.target.value }))}
                        className="h-7 text-xs font-bold text-center px-1"
                      />
                      <span className="text-[10px] block text-slate-400">Pcs</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consumables (Jumlah) */}
              <div className="space-y-3 pt-4 border-t border-[var(--border-main)]">
                <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-500" /> Peralatan Habis Pakai & Pendukung (Jumlah)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {P2H_LOGISTICS_ITEMS.map(item => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl border border-[var(--border-main)] bg-[var(--card-bg)] flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-[var(--text-main)] block truncate">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-slate-400">Satuan: {item.unit}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={logisticsCounts[item.id] ?? ''}
                          onChange={(e) => setLogisticsCounts(prev => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-20 text-center text-xs font-bold h-8"
                        />
                        <span className="text-[11px] font-semibold text-slate-400 w-8">{item.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        {/* PENGESAHAN & TANDA TANGAN (FOREMAN / ANALIS, SUPERVISOR & MANAJEMEN) */}
        <div
          ref={el => { roomRefs.current['pengesahan'] = el; }}
          className="scroll-mt-24 sm:scroll-mt-28 rounded-2xl border-2 border-teal-500/40 bg-[var(--card-bg)] shadow-md overflow-hidden p-4 sm:p-6 space-y-5"
        >
          {/* Section Header */}
          <div className="flex items-center gap-3 border-b border-[var(--border-main)] pb-3.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text-main)] tracking-tight">
                Pengesahan &amp; Tanda Tangan Foreman / Analis
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Dokumen Resmi P2H: <span className="font-semibold text-teal-600 dark:text-teal-400">TBP-FR-PL-LAB-04.01-01</span>
              </p>
            </div>
          </div>

          {/* 1. DILAKSANAKAN OLEH (FOREMAN / ANALIS) */}
          <div className="space-y-3 p-4 rounded-2xl border border-[var(--border-main)] bg-[var(--input-bg)]/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                  Dilaksanakan Oleh (Foreman / Analis)
                </span>
              </div>
              <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                Otomatis Akun Login
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-main)]">
                <div className="text-[10px] text-[var(--text-muted)] font-medium">Nama Lengkap</div>
                <div className="font-bold text-[var(--text-main)] text-sm">{inspectorName}</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--card-bg)] border border-[var(--border-main)]">
                <div className="text-[10px] text-[var(--text-muted)] font-medium">NIK / Akun</div>
                <div className="font-bold text-[var(--text-main)] text-sm">{inspectorNik || 'LAB-STAFF'}</div>
              </div>
            </div>

            {/* Tanda Tangan Canvas / Saved Profile Signature */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-[var(--text-main)] flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-teal-500" /> Tanda Tangan Digital Foreman / Analis
                </label>

                {savedSignatureUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setSavedSignatureUrl(null);
                      setManualCanvasMode(false);
                      setPinUnlockInput('');
                    }}
                    className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                  >
                    Kunci Kembali TTD
                  </button>
                )}
              </div>

              {savedSignatureUrl ? (
                /* TTD Sudah Terbuka / Diterapkan */
                <div className="p-3.5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-950/20 flex flex-wrap items-center justify-between gap-4 shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-36 h-20 bg-white dark:bg-slate-900 rounded-xl border border-emerald-300 dark:border-emerald-800 flex items-center justify-center p-1.5 overflow-hidden shadow-inner">
                      <img src={savedSignatureUrl} alt="TTD Resmi Akun" className="max-h-full max-w-full object-contain" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-sky-800 dark:text-sky-200 flex items-center gap-1.5">
                        <VerifiedBadge size="sm" /> TTD Resmi Terverifikasi
                      </div>
                      <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                        Tanda tangan resmi dari Pengaturan Akun siap disematkan.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSavedSignatureUrl(null);
                      setManualCanvasMode(true);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold px-2.5 py-1.5 rounded-lg border border-[var(--border-main)] hover:bg-[var(--card-bg)] transition-colors"
                  >
                    Ganti Gambar Manual
                  </button>
                </div>
              ) : hasServerSignature && !manualCanvasMode ? (
                /* TTD Terdaftar di Setting Tapi Belum Masukkan PIN -> Tampilkan Box PIN Langsung */
                <div className="p-4 rounded-2xl border-2 border-teal-500/40 bg-teal-50/40 dark:bg-teal-950/20 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-900/60 flex items-center justify-center text-teal-700 dark:text-teal-300">
                        <KeyRound className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-teal-950 dark:text-teal-200">
                        Tanda Tangan Terdaftar (Pengaturan Akun)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      Terenkripsi AES-256
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    Tanda tangan Anda telah terdaftar di Pengaturan. Masukkan <strong>6 Digit PIN</strong> Anda untuk membubuhkan tanda tangan resmi ke laporan P2H ini:
                  </p>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showUnlockPin ? 'text' : 'password'}
                        inputMode="numeric"
                        maxLength={6}
                        value={pinUnlockInput}
                        onChange={(e) => setPinUnlockInput(e.target.value.replace(/\D/g, ''))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleUnlockServerSignature();
                          }
                        }}
                        placeholder="Ketik 6 Digit PIN Tanda Tangan"
                        className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl px-3.5 py-2.5 text-center text-sm font-mono tracking-widest font-black text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-teal-500/40 shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUnlockPin(!showUnlockPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showUnlockPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <Button
                      type="button"
                      disabled={unlockingPin || pinUnlockInput.length !== 6}
                      onClick={() => handleUnlockServerSignature()}
                      className="px-4 py-2.5 text-xs font-bold shadow-xs shrink-0 cursor-pointer"
                      style={{ backgroundColor: 'var(--primary, #2A9D8F)', color: '#FFFFFF' }}
                    >
                      {unlockingPin ? 'Membuka...' : 'Terapkan TTD'}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px]">
                    <span className="text-slate-400">
                      🔒 Terproteksi PIN pribadi
                    </span>
                    <button
                      type="button"
                      onClick={() => setManualCanvasMode(true)}
                      className="text-teal-600 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
                    >
                      Atau gambar manual di canvas
                    </button>
                  </div>
                </div>
              ) : (
                /* Fallback Manual Canvas Mode */
                <div className="space-y-2">
                  {hasServerSignature && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setManualCanvasMode(false)}
                        className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                      >
                        <KeyRound className="w-3 h-3" /> Kembali ke TTD Terdaftar (PIN)
                      </button>
                    </div>
                  )}

                  {!hasServerSignature && (
                    <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                      Anda belum mendaftarkan tanda tangan di menu Pengaturan. Silakan gambar di canvas bawah ini, atau atur di menu Pengaturan agar tidak perlu gambar ulang setiap hari.
                    </div>
                  )}

                  <div className="border border-[var(--border-main)] rounded-xl overflow-hidden bg-white dark:bg-slate-900 relative">
                    <SignatureCanvas
                      ref={sigCanvasRef}
                      penColor="#000000"
                      canvasProps={{
                        className: 'w-full h-36 cursor-crosshair'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => sigCanvasRef.current?.clear()}
                      className="absolute top-2 right-2 text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-md font-semibold transition-colors flex items-center gap-1 shadow-xs"
                    >
                      <RotateCcw className="w-3 h-3" /> Bersihkan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. DIPERIKSA OLEH (SUPERVISOR LABORATORIUM) */}
          <div className="space-y-3 p-4 rounded-2xl border border-[var(--border-main)] bg-[var(--input-bg)]/40 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-main)]">
                  Diperiksa Oleh (Supervisor Laboratorium)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadSpvFromRoster(true)}
                  disabled={loadingSpv}
                  title="Muat ulang status supervisor dari data Roster"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-100/60 dark:bg-teal-900/40 hover:bg-teal-200/70 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingSpv ? 'animate-spin' : ''}`} />
                  {loadingSpv ? 'Memuat...' : 'Sync Roster'}
                </button>
                <span className="text-[10px] text-slate-400">Tercetak di Excel</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {/* Supervisor Dropdown Selector */}
              <div className="relative">
                <select
                  value={selectedSpvNik || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedSpvNik(val);
                    if (val === 'custom') {
                      if (supervisorName === 'Laboratorium Supervisor') {
                        setSupervisorName('');
                      }
                    } else {
                      const found = spvList.find(s => s.nik === val);
                      if (found) {
                        setSupervisorName(found.name);
                      }
                    }
                  }}
                  className="w-full bg-[var(--card-bg)] border border-[var(--border-main)] rounded-xl px-3 py-2.5 text-xs font-bold text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition-all cursor-pointer shadow-xs"
                >
                  <option value="" disabled>-- Pilih Supervisor Laboratorium --</option>
                  
                  {/* On Duty SPVs */}
                  {spvList.filter(s => s.isOnDuty).length > 0 && (
                    <optgroup label="🟢 Supervisor On Duty (TBP / GPS)">
                      {spvList.filter(s => s.isOnDuty).map(s => (
                        <option key={s.nik} value={s.nik}>
                          {s.name} [{s.pt}] — On Duty ({s.shiftDesc})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Off / Cuti SPVs */}
                  {spvList.filter(s => !s.isOnDuty).length > 0 && (
                    <optgroup label="⚪ Supervisor Sedang Off / Cuti">
                      {spvList.filter(s => !s.isOnDuty).map(s => (
                        <option key={s.nik} value={s.nik}>
                          {s.name} [{s.pt}] — ({s.shiftDesc})
                        </option>
                      ))}
                    </optgroup>
                  )}

                  {/* Custom / Manual Input */}
                  <optgroup label="Pilihan Lain">
                    <option value="custom">✍️ Masukkan Nama SPV Manual / Lainnya...</option>
                  </optgroup>
                </select>
              </div>

              {/* Status details badge for selected supervisor */}
              {selectedSpvNik && selectedSpvNik !== 'custom' && (() => {
                const currentSpv = spvList.find(s => s.nik === selectedSpvNik);
                if (!currentSpv) return null;
                return (
                  <div className="flex items-center justify-between px-3 py-2 bg-[var(--card-bg)] border border-[var(--border-main)] rounded-xl text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${currentSpv.isOnDuty ? 'bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-900' : 'bg-slate-400'}`} />
                      <div className="truncate">
                        <span className="font-bold text-[var(--text-main)]">{currentSpv.name}</span>
                        <span className="text-[10px] text-[var(--text-muted)] ml-2">
                          {currentSpv.isOnDuty ? '🟢 On Duty' : '⚪ Off/Cuti'} • {currentSpv.shiftDesc} • {currentSpv.pt}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800 shrink-0">
                      NIK: {currentSpv.nik}
                    </span>
                  </div>
                );
              })()}

              {/* Custom Name Input if manual selected */}
              {(selectedSpvNik === 'custom' || spvList.length === 0) && (
                <div className="space-y-1.5 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="text-[11px] text-[var(--text-muted)] font-medium">Ketik Nama Supervisor Laboratorium:</div>
                  <Input
                    value={supervisorName}
                    onChange={(e) => setSupervisorName(e.target.value)}
                    placeholder="Contoh: Muhammad Amran Selang"
                    className="font-bold text-xs h-9 bg-[var(--card-bg)]"
                    autoFocus={selectedSpvNik === 'custom'}
                  />
                </div>
              )}
            </div>
          </div>

          {/* 3. DIKETAHUI OLEH (MANAJEMEN) */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] block">
              Diketahui Oleh (Manajemen Laboratorium)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl border border-[var(--border-main)] bg-[var(--card-bg)] flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Superintendent Prep &amp; Lab</div>
                  <div className="text-xs font-bold text-[var(--text-main)]">Tigwa Anggawikara</div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                  Tervalidasi
                </span>
              </div>

              <div className="p-3 rounded-2xl border border-[var(--border-main)] bg-[var(--card-bg)] flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Manager QA / QC</div>
                  <div className="text-xs font-bold text-[var(--text-main)]">Deni Nugraha Perdiana</div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                  Tervalidasi
                </span>
              </div>
            </div>
          </div>

          {/* 4. PERNYATAAN KEABSAHAN */}
          <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/60 flex items-start gap-3">
            <input
              type="checkbox"
              id="declaration_checkbox_page"
              checked={declarationChecked}
              onChange={(e) => setDeclarationChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-slate-700 shrink-0 cursor-pointer"
            />
            <label htmlFor="declaration_checkbox_page" className="text-xs text-[var(--text-main)] leading-relaxed cursor-pointer select-none">
              Saya menyatakan bahwa pemeriksaan fisik, kebersihan, visual, dan kelistrikan pada seluruh peralatan laboratorium untuk <span className="font-bold text-teal-700 dark:text-teal-300">{shift}</span> ini telah dilaksanakan dengan sebenar-benarnya sesuai standar SOP K3 &amp; QA/QC.
            </label>
          </div>

          {/* 5. MODE SIMULASI / DEMO TOGGLE */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            isDemoMode 
              ? 'bg-amber-500/10 border-amber-500/50 text-amber-900 dark:text-amber-200 shadow-sm' 
              : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-main)]'
          }`}>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="demo_mode_checkbox"
                checked={isDemoMode}
                onChange={(e) => setIsDemoMode(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 dark:border-slate-700 shrink-0 cursor-pointer"
              />
              <div className="flex-1">
                <label htmlFor="demo_mode_checkbox" className="text-xs font-bold flex items-center gap-1.5 cursor-pointer select-none">
                  <span>🧪 Mode Simulasi / Demo (Tanpa Notifikasi ke SPV / Atasan)</span>
                  {isDemoMode && (
                    <span className="px-2 py-0.5 text-[10px] bg-amber-500 text-white font-extrabold rounded-full">
                      AKTIF
                    </span>
                  )}
                </label>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">
                  Gunakan opsi ini saat demonstrasi/belajar alur. Sistem <strong className="text-amber-600 dark:text-amber-400">TIDAK akan mengirimkan Web Push / Notifikasi</strong> ke SPV, SPT, maupun Manager, dan data dapat dihapus kembali dengan tombol &quot;Hapus Demo&quot; di antrean review.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Action Island (Proportional, Elevated Above Mobile Nav, With Both PDF & Excel) */}
      <div className="fixed bottom-[5.5rem] sm:bottom-4 left-0 right-0 z-40 px-3 sm:px-6 pointer-events-none">
        <div className="max-w-4xl mx-auto bg-[var(--card-bg)]/95 backdrop-blur-md border border-[var(--border-main)] rounded-2xl p-2 sm:p-2.5 shadow-2xl pointer-events-auto flex items-center justify-between gap-2">
          {/* Progress Pill */}
          <div className="flex items-center gap-2 pl-1 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 flex items-center justify-center font-bold text-teal-600 dark:text-teal-400 text-xs">
              {progressPercent}%
            </div>
            <div className="hidden sm:block text-xs">
              <span className="text-[var(--text-muted)]">Diperiksa: </span>
              <span className="font-bold text-[var(--text-main)]">{checkedCount}/{totalCount}</span>
            </div>
          </div>

          {/* Action Buttons: Native buttons with explicit sizing for true proportionality */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Export PDF Button */}
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={downloadingPdf}
              title="Unduh Formulir PDF 1 Halaman F4"
              className="h-9 px-2.5 sm:px-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0 disabled:opacity-50"
            >
              <FileText className={`w-3.5 h-3.5 text-rose-600 shrink-0 ${downloadingPdf ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Cetak PDF (F4)</span>
              <span className="sm:hidden">PDF</span>
            </button>

            {/* Export Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              title="Download File Excel TBP-FR-PL-LAB-04.01-01"
              className="h-9 px-2.5 sm:px-3 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span className="hidden sm:inline">Download Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>

            {/* Submit Report Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={`h-9 px-3.5 sm:px-5 rounded-xl text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-md transition-colors shrink-0 disabled:opacity-50 ${
                isDemoMode ? 'bg-amber-600 hover:bg-amber-700' : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              <Send className="w-3.5 h-3.5 shrink-0" />
              <span>{submitting ? 'Menyimpan...' : (isDemoMode ? 'Kirim (Demo)' : 'Kirim')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* PIN Unlock Modal for Encrypted Signature */}
      {unlockPinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-xl overflow-hidden p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-sm">
                <KeyRound className="w-4 h-4" /> Buka Tanda Tangan Terenkripsi
              </div>
              <button
                type="button"
                onClick={() => setUnlockPinModalOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUnlockServerSignature} className="space-y-4">
              <p className="text-xs text-[var(--text-muted)] text-center">
                Masukkan 6 digit PIN tanda tangan Anda untuk memuat tanda tangan terenkripsi AES-256 dari profil akun:
              </p>

              <div>
                <input
                  type={showUnlockPin ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={6}
                  autoFocus
                  value={pinUnlockInput}
                  onChange={(e) => setPinUnlockInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  className="w-full bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl py-2.5 text-center text-xl font-mono tracking-widest font-black text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
                <div className="flex justify-between items-center mt-2 px-1">
                  <button
                    type="button"
                    onClick={() => setShowUnlockPin(!showUnlockPin)}
                    className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] font-semibold flex items-center gap-1"
                  >
                    {showUnlockPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showUnlockPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setUnlockPinModalOpen(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--input-bg)] border border-[var(--border-main)]"
                >
                  Batal
                </button>
                <Button
                  type="submit"
                  disabled={unlockingPin || pinUnlockInput.length !== 6}
                  className="flex-1 text-xs font-bold py-2 shadow-xs cursor-pointer"
                  style={{ backgroundColor: 'var(--primary, #2A9D8F)', color: '#FFFFFF' }}
                >
                  {unlockingPin ? 'Membuka...' : 'Buka TTD'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
