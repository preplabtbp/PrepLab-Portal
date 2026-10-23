import React, { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';
import { 
  Save, Clipboard, RefreshCw, AlertCircle, CheckCircle2, AlertTriangle, 
  ArrowUp, ArrowDown, Sparkles, FileSpreadsheet, Plus, Printer, Check, X, Eye,
  Building2, Cpu, Layers, Trash2, Database, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { extractSmartStandardCode, isWdxrfInstrument, getWdxrfProfile } from '../../utils/xrfStandardDetector';
import { TimeInput24 } from '../ui/TimeInput24';

interface XrfDailyInputTabProps {
  instruments: Array<{ code: string; name: string; site?: string; methodType?: string }>;
  standards: Array<{ code: string; name: string }>;
  assignedSite?: 'GTS' | 'TBP';
  isDevOrManager?: boolean;
  onSuccessSave?: () => void;
}

interface StandardRowInput {
  standardCode: string;
  sampleLabel: string;
  sequenceNo: number;
  analyzedAt: string;
  ni: string;
  co: string;
  fe: string;
  cao: string;
  sio2: string;
  al2o3: string;
  mgo: string;
  p: string;
  s: string;
  cr2o3: string;
  mno: string;
}

// 1. Limonite 5 Standard Rows
const DEFAULT_LIMONITE_ROWS: StandardRowInput[] = [
  { standardCode: 'LIM01', sampleLabel: 'VER-LIM01', sequenceNo: 1, analyzedAt: '00:26', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM02', sampleLabel: 'VER-LIM02', sequenceNo: 2, analyzedAt: '01:01', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM03', sampleLabel: 'VER-LIM03', sequenceNo: 3, analyzedAt: '01:05', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM04', sampleLabel: 'VER-LIM04', sequenceNo: 4, analyzedAt: '01:08', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM05', sampleLabel: 'VER-LIM05', sequenceNo: 5, analyzedAt: '01:11', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
];

// 2. Saprolite 10 Standard Rows in exact sequence (SOP Lab Aktual)
const DEFAULT_SAPROLITE_ROWS: StandardRowInput[] = [
  { standardCode: 'OREAS184', sampleLabel: 'VER-OREAS184', sequenceNo: 1, analyzedAt: '00:15', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS187', sampleLabel: 'VER-OREAS187', sequenceNo: 2, analyzedAt: '00:30', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS189', sampleLabel: 'VER-OREAS189', sequenceNo: 3, analyzedAt: '00:45', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS190', sampleLabel: 'VER-OREAS190', sequenceNo: 4, analyzedAt: '01:00', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS191', sampleLabel: 'VER-OREAS191', sequenceNo: 5, analyzedAt: '01:15', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS192', sampleLabel: 'VER-OREAS192', sequenceNo: 6, analyzedAt: '01:30', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS193', sampleLabel: 'VER-OREAS193', sequenceNo: 7, analyzedAt: '01:45', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'SAP19',    sampleLabel: 'VER-SAP19',    sequenceNo: 8, analyzedAt: '02:00', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS194', sampleLabel: 'VER-OREAS194', sequenceNo: 9, analyzedAt: '02:15', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS195', sampleLabel: 'VER-OREAS195', sequenceNo: 10, analyzedAt: '02:30', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
];

// 3. Supermini 200 (Rigaku WDXRF GTS) 17 Standard Rows in exact sequence
export const DEFAULT_SUPERMINI_ROWS: StandardRowInput[] = [
  { standardCode: 'BLANK_A',  sampleLabel: 'BLANK A',       sequenceNo: 1,  analyzedAt: '00:05', ni: '0.000', co: '0.000', fe: '0.000', cao: '0.000', sio2: '0.00', al2o3: '0.00', mgo: '0.00', p: '0.000', s: '0.000', cr2o3: '0.000', mno: '0.000' },
  { standardCode: 'BLANK_B',  sampleLabel: 'VER-BLANK B',   sequenceNo: 2,  analyzedAt: '00:10', ni: '0.000', co: '0.000', fe: '0.000', cao: '0.000', sio2: '0.00', al2o3: '0.00', mgo: '0.00', p: '0.000', s: '0.000', cr2o3: '0.000', mno: '0.000' },
  { standardCode: 'OREAS184', sampleLabel: 'VER-OREAS184',  sequenceNo: 3,  analyzedAt: '00:15', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM01',    sampleLabel: 'VER-LIM01',     sequenceNo: 4,  analyzedAt: '00:20', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM02',    sampleLabel: 'VER-LIM02',     sequenceNo: 5,  analyzedAt: '00:25', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM03',    sampleLabel: 'VER-LIM03',     sequenceNo: 6,  analyzedAt: '00:30', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS187', sampleLabel: 'VER-OREAS187',  sequenceNo: 7,  analyzedAt: '00:35', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM04',    sampleLabel: 'VER-LIM04',     sequenceNo: 8,  analyzedAt: '00:40', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS189', sampleLabel: 'VER-OREAS189',  sequenceNo: 9,  analyzedAt: '00:45', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM05',    sampleLabel: 'VER-LIM05',     sequenceNo: 10, analyzedAt: '00:50', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS190', sampleLabel: 'VER-OREAS190',  sequenceNo: 11, analyzedAt: '00:55', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS191', sampleLabel: 'VER-OREAS191',  sequenceNo: 12, analyzedAt: '01:00', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS192', sampleLabel: 'VER-OREAS192',  sequenceNo: 13, analyzedAt: '01:05', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS193', sampleLabel: 'VER-OREAS193',  sequenceNo: 14, analyzedAt: '01:10', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'SAP19',    sampleLabel: 'VER-SAP19',     sequenceNo: 15, analyzedAt: '01:15', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS194', sampleLabel: 'VER-OREAS194',  sequenceNo: 16, analyzedAt: '01:20', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS195', sampleLabel: 'VER-OREAS195',  sequenceNo: 17, analyzedAt: '01:25', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
];

// 4. Zetium WDXRF (PANalytical TBP) 22 Standard Rows in verification sequence
export const DEFAULT_ZETIUM_ROWS: StandardRowInput[] = [
  { standardCode: 'OREAS70B', sampleLabel: 'VER-OREAS 70B', sequenceNo: 1,  analyzedAt: '00:05', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'BRK03',    sampleLabel: 'VER-BRK03',     sequenceNo: 2,  analyzedAt: '00:10', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS182', sampleLabel: 'VER-OREAS 182', sequenceNo: 3,  analyzedAt: '00:15', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'NILTRT11', sampleLabel: 'VER-NILTRT 11', sequenceNo: 4,  analyzedAt: '00:20', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS184', sampleLabel: 'VER-OREAS 184', sequenceNo: 5,  analyzedAt: '00:25', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM13',    sampleLabel: 'VER-LIM13',     sequenceNo: 6,  analyzedAt: '00:30', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OB',       sampleLabel: 'VER-OB',        sequenceNo: 7,  analyzedAt: '00:35', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS187', sampleLabel: 'VER-OREAS 187', sequenceNo: 8,  analyzedAt: '00:40', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'NILTRT45', sampleLabel: 'VER-NILTRT 45', sequenceNo: 9,  analyzedAt: '00:45', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS189', sampleLabel: 'VER-OREAS 189', sequenceNo: 10, analyzedAt: '00:50', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS190', sampleLabel: 'VER-OREAS 190', sequenceNo: 11, analyzedAt: '00:55', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'LIM',      sampleLabel: 'VER-LIM',       sequenceNo: 12, analyzedAt: '01:00', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS191', sampleLabel: 'VER-OREAS 191', sequenceNo: 13, analyzedAt: '01:05', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS192', sampleLabel: 'VER-OREAS 192', sequenceNo: 14, analyzedAt: '01:10', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'SAP16',    sampleLabel: 'VER-SAP16',     sequenceNo: 15, analyzedAt: '01:15', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS193', sampleLabel: 'VER-OREAS 193', sequenceNo: 16, analyzedAt: '01:20', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'SAP19',    sampleLabel: 'VER-SAP19',     sequenceNo: 17, analyzedAt: '01:25', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS194', sampleLabel: 'VER-OREAS 194', sequenceNo: 18, analyzedAt: '01:30', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'SAP',      sampleLabel: 'VER-SAP',       sequenceNo: 19, analyzedAt: '01:35', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS72B', sampleLabel: 'VER-OREAS 72B', sequenceNo: 20, analyzedAt: '01:40', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'OREAS185', sampleLabel: 'VER-OREAS 185', sequenceNo: 21, analyzedAt: '01:45', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
  { standardCode: 'ZBK411',   sampleLabel: 'VER-ZBK411',    sequenceNo: 22, analyzedAt: '01:50', ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: '' },
];

export const XrfDailyInputTab: React.FC<XrfDailyInputTabProps> = ({
  instruments,
  standards,
  assignedSite = 'GTS',
  isDevOrManager = false,
  onSuccessSave,
}) => {
  // 1. Matrix Application State: LIMONITE, SAPROLITE, SUPERMINI, ZETIUM, or DYNAMIC
  const [selectedMatrix, setSelectedMatrix] = useState<'LIMONITE' | 'SAPROLITE' | 'SUPERMINI' | 'ZETIUM' | 'DYNAMIC'>('LIMONITE');

  // Active site for instrument filtering (Default: assignedSite)
  const [activeSite, setActiveSite] = useState<'GTS' | 'TBP'>(() => assignedSite);

  useEffect(() => {
    if (assignedSite) setActiveSite(assignedSite);
  }, [assignedSite]);

  // Filter instruments strictly based on active site (prevent GTS instruments on TBP or vice-versa)
  const filteredInstruments = useMemo(() => {
    return instruments.filter(inst => {
      const isKnownGts = ['EPSILON_A', 'EPSILON_B', 'EPSILON_D', 'SUPERMINI'].includes(inst.code);
      const isKnownTbp = ['EPSILON_C', 'EPSILON_E', 'EPSILON_F', 'EPSILON_G', 'EPSILON_H', 'S2_PUMA', 'ZETIUM_A', 'ZETIUM_B'].includes(inst.code);
      const site = isKnownGts ? 'GTS' : (isKnownTbp ? 'TBP' : (inst.site || 'TBP'));
      return site === activeSite;
    });
  }, [instruments, activeSite]);

  // Batch Header State
  const [selectedInstrument, setSelectedInstrument] = useState(
    filteredInstruments[0]?.code || (assignedSite === 'GTS' ? 'EPSILON_A' : 'EPSILON_C')
  );

  useEffect(() => {
    const isCurrentValid = filteredInstruments.some(i => i.code === selectedInstrument);
    if (!isCurrentValid && filteredInstruments.length > 0) {
      setSelectedInstrument(filteredInstruments[0].code);
    }
  }, [filteredInstruments, selectedInstrument]);
  const [verificationDate, setVerificationDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [verificationTime, setVerificationTime] = useState('00:30');
  const [shift, setShift] = useState('1');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState(false);
  const [rawPastedText, setRawPastedText] = useState('');

  // Info Batch Terakhir
  const [latestBatchInfo, setLatestBatchInfo] = useState<{ batchCode?: string; date?: string; count?: number } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Operator Info
  const userNik = localStorage.getItem('p2h_inspector_nik') || '';
  const userName = localStorage.getItem('p2h_inspector_name') || 'Analis Laboratorium';

  // Master References for Live Auto-Calculation (Expected Values & STDEV)
  const [references, setReferences] = useState<Record<string, Record<string, any>>>({});

  // Form rows
  const [rows, setRows] = useState<StandardRowInput[]>(DEFAULT_LIMONITE_ROWS);

  // Load Reference Table
  useEffect(() => {
    fetch('/api/xrf/references')
      .then(res => res.json())
      .then(json => {
        if (json.success && Array.isArray(json.data)) {
          const map: Record<string, Record<string, any>> = {};
          for (const item of json.data) {
            map[item.standardCode] = map[item.standardCode] || {};
            map[item.standardCode][item.elementName] = item;
          }
          setReferences(map);
        }
      })
      .catch(err => console.warn('Load references error:', err));
  }, []);

  // Update selected instrument if filtered instruments changes
  useEffect(() => {
    if (filteredInstruments.length > 0 && !filteredInstruments.some(i => i.code === selectedInstrument)) {
      setSelectedInstrument(filteredInstruments[0].code);
    }
  }, [filteredInstruments]);

  // Muat Profil Standar Dinamis dari Batch Verifikasi Terakhir
  const loadInstrumentProfile = async (instCode: string) => {
    setLoadingProfile(true);
    try {
      const res = await fetch(`/api/xrf/latest-batch-standards?instrumentCode=${instCode}`);
      const json = await res.json();
      if (json.success && json.hasData && Array.isArray(json.items) && json.items.length > 0) {
        const loadedRows: StandardRowInput[] = json.items.map((it: any, idx: number) => ({
          standardCode: it.standardCode,
          sampleLabel: `VER-${it.standardCode} ${verificationDate}`,
          sequenceNo: idx + 1,
          analyzedAt: it.analyzedAt ? (it.analyzedAt.includes(' ') ? it.analyzedAt.split(' ')[1].slice(0, 5) : it.analyzedAt.slice(0, 5)) : '00:00',
          ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: ''
        }));
        setRows(loadedRows);
        setLatestBatchInfo({
          batchCode: json.batch?.batchCode,
          date: json.batch?.verificationDate,
          count: loadedRows.length,
        });

        if (instCode === 'SUPERMINI') setSelectedMatrix('SUPERMINI');
        else if (instCode === 'ZETIUM_A' || instCode === 'ZETIUM_B') setSelectedMatrix('ZETIUM');
        else setSelectedMatrix('DYNAMIC');
        return;
      }
    } catch (err) {
      console.warn("Gagal memuat batch standar terakhir:", err);
    } finally {
      setLoadingProfile(false);
    }

    // Fallback jika belum pernah ada batch di database
    setLatestBatchInfo(null);
    if (instCode === 'SUPERMINI') {
      setSelectedMatrix('SUPERMINI');
      setRows(DEFAULT_SUPERMINI_ROWS.map(r => ({
        ...r,
        sampleLabel: r.standardCode.startsWith('BLANK') ? r.sampleLabel : `VER-${r.standardCode} ${verificationDate}`
      })));
    } else if (instCode === 'ZETIUM_A' || instCode === 'ZETIUM_B') {
      setSelectedMatrix('ZETIUM');
      setRows(DEFAULT_ZETIUM_ROWS.map(r => ({
        ...r,
        sampleLabel: r.standardCode.startsWith('BLANK') ? r.sampleLabel : `VER-${r.standardCode} ${verificationDate}`
      })));
    } else if (selectedMatrix === 'SAPROLITE') {
      setRows(DEFAULT_SAPROLITE_ROWS.map(r => ({ ...r, sampleLabel: `VER-${r.standardCode} ${verificationDate}` })));
    } else {
      setSelectedMatrix('LIMONITE');
      setRows(DEFAULT_LIMONITE_ROWS.map((r, i) => ({ ...r, sampleLabel: `VER-LIM0${i + 1} ${verificationDate}` })));
    }
  };

  // Auto switch matrix dan muat profil standar saat instrumen berubah
  useEffect(() => {
    loadInstrumentProfile(selectedInstrument);
  }, [selectedInstrument]);

  // Handle matrix application toggle manual
  const handleMatrixChange = (matrix: 'LIMONITE' | 'SAPROLITE' | 'SUPERMINI' | 'ZETIUM' | 'DYNAMIC') => {
    setSelectedMatrix(matrix);
    if (matrix === 'LIMONITE') {
      setRows(DEFAULT_LIMONITE_ROWS.map((r, i) => ({
        ...r,
        sampleLabel: `VER-LIM0${i + 1} ${verificationDate}`
      })));
      toast.success("Form dialihkan ke Verifikasi LIMONITE (5 Standar).");
    } else if (matrix === 'SAPROLITE') {
      setRows(DEFAULT_SAPROLITE_ROWS.map(r => ({
        ...r,
        sampleLabel: `VER-${r.standardCode} ${verificationDate}`
      })));
      toast.success("Form dialihkan ke Verifikasi SAPROLITE (10 Standar).");
    } else if (matrix === 'SUPERMINI') {
      setRows(DEFAULT_SUPERMINI_ROWS.map(r => ({
        ...r,
        sampleLabel: r.standardCode.startsWith('BLANK') ? r.sampleLabel : `VER-${r.standardCode} ${verificationDate}`
      })));
      toast.success("Form dialihkan ke Verifikasi SUPERMINI 200 WDXRF GTS (17 Standar).");
    } else if (matrix === 'ZETIUM') {
      setRows(DEFAULT_ZETIUM_ROWS.map(r => ({
        ...r,
        sampleLabel: r.standardCode.startsWith('BLANK') ? r.sampleLabel : `VER-${r.standardCode} ${verificationDate}`
      })));
      toast.success("Form dialihkan ke Verifikasi ZETIUM WDXRF TBP (17 Standar CRM).");
    }
  };

  // Tambah baris standar dinamis secara manual
  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      {
        standardCode: `STD${prev.length + 1}`,
        sampleLabel: `VER-STD${prev.length + 1} ${verificationDate}`,
        sequenceNo: prev.length + 1,
        analyzedAt: verificationTime,
        ni: '', co: '', fe: '', cao: '', sio2: '', al2o3: '', mgo: '', p: '', s: '', cr2o3: '', mno: ''
      }
    ]);
    setSelectedMatrix('DYNAMIC');
    toast.success("Baris standar baru ditambahkan ke tabel.");
  };

  // Hapus baris standar dari tabel
  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
      toast.error("Minimal harus ada 1 baris standar dalam formulir.");
      return;
    }
    setRows(prev => prev.filter((_, i) => i !== index).map((r, idx) => ({ ...r, sequenceNo: idx + 1 })));
    toast.info("Baris standar berhasil dihapus.");
  };

  // Update specific cell in row
  const handleCellChange = (rowIndex: number, field: keyof StandardRowInput, value: string) => {
    const updated = [...rows];
    updated[rowIndex] = { ...updated[rowIndex], [field]: value };
    setRows(updated);
  };

  // Helper to compute calculated metrics (BC, FeNi, Sum of Conc)
  const computeRowCalculations = (r: StandardRowInput) => {
    const ni = parseFloat(r.ni) || 0;
    const co = parseFloat(r.co) || 0;
    const fe = parseFloat(r.fe) || 0;
    const cao = parseFloat(r.cao) || 0;
    const sio2 = parseFloat(r.sio2) || 0;
    const al2o3 = parseFloat(r.al2o3) || 0;
    const mgo = parseFloat(r.mgo) || 0;
    const p = parseFloat(r.p) || 0;
    const s = parseFloat(r.s) || 0;
    const cr2o3 = parseFloat(r.cr2o3) || 0;
    const mno = parseFloat(r.mno) || 0;

    const bc = sio2 > 0 ? (cao + mgo) / sio2 : 0;
    const feNi = ni > 0 ? fe / ni : 0;
    const sum = ni + co + fe + cao + sio2 + al2o3 + mgo + p + s + cr2o3 + mno;

    return {
      bc: bc > 0 ? bc.toFixed(2) : '-',
      feNi: feNi > 0 ? feNi.toFixed(2) : '-',
      sum: sum > 0 ? sum.toFixed(2) : '-',
    };
  };

  // Evaluate element cell against reference limits
  const evaluateCell = (stdCode: string, elemKey: string, rawVal: string | number | undefined | null) => {
    const val = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal || ''));
    if (isNaN(val) || val <= 0) return { status: 'EMPTY', diffPct: 0, sigmaDist: 0, expected: 0 };

    const ref = references[stdCode]?.[elemKey];
    if (!ref || !ref.nominalValue || ref.nominalValue <= 0) {
      return { status: 'NORMAL', diffPct: 0, sigmaDist: 0, expected: 0 };
    }

    const expected = ref.nominalValue;
    const diffPct = ((val - expected) / expected) * 100;
    const stdev = ref.stdevFixed || 0.05;
    const sigmaDist = Math.abs((val - expected) / stdev);

    const upperAction = ref.upperAction ?? (expected + 3 * stdev);
    const lowerAction = ref.lowerAction ?? (expected - 3 * stdev);
    const upperWarning = ref.upperWarning ?? (expected + 2 * stdev);
    const lowerWarning = ref.lowerWarning ?? (expected - 2 * stdev);

    let status = 'PASS';
    if (val > upperAction || val < lowerAction) {
      status = 'ACTION';
    } else if (val > upperWarning || val < lowerWarning) {
      status = 'WARNING';
    }

    return { status, diffPct, sigmaDist, expected };
  };

  // Evaluate entire row status
  const evaluateRow = (r: StandardRowInput) => {
    if (r.standardCode.startsWith('BLANK')) {
      const hasAny = ['ni', 'co', 'fe', 'cao', 'sio2', 'al2o3', 'mgo', 'p', 's', 'cr2o3', 'mno'].some(k => {
        const v = parseFloat(String(r[k as keyof StandardRowInput] ?? ''));
        return !isNaN(v) && v >= 0;
      });
      return hasAny ? 'PASS' : 'EMPTY';
    }

    const elements = (selectedMatrix === 'LIMONITE' || selectedMatrix === 'SUPERMINI') 
      ? ['Ni', 'Co', 'Fe', 'CaO', 'SiO2', 'Al2O3', 'MgO', 'P', 'S', 'Cr2O3', 'MnO']
      : ['Ni', 'Co', 'Fe', 'CaO', 'SiO2', 'Al2O3', 'MgO', 'Cr2O3', 'MnO'];

    let hasAction = false;
    let hasWarning = false;
    let hasValues = false;

    for (const el of elements) {
      const field = el.toLowerCase() as keyof StandardRowInput;
      const raw = r[field];
      const parsed = typeof raw === 'number' ? raw : parseFloat(String(raw || ''));
      if (!isNaN(parsed) && parsed > 0) {
        hasValues = true;
        const res = evaluateCell(r.standardCode, el, raw);
        if (res.status === 'ACTION') hasAction = true;
        if (res.status === 'WARNING') hasWarning = true;
      }
    }

    if (!hasValues) return 'EMPTY';
    if (hasAction) return 'ACTION';
    if (hasWarning) return 'WARNING';
    return 'PASS';
  };

  // Overall batch statistics
  const batchStats = useMemo(() => {
    let passCount = 0;
    let warnCount = 0;
    let actionCount = 0;
    let filledCount = 0;

    for (const r of rows) {
      const st = evaluateRow(r);
      if (st !== 'EMPTY') {
        filledCount++;
        if (st === 'PASS') passCount++;
        if (st === 'WARNING') warnCount++;
        if (st === 'ACTION') actionCount++;
      }
    }

    const overallStatus = actionCount > 0 ? 'ACTION' : warnCount > 0 ? 'WARNING' : filledCount > 0 ? 'PASS' : 'EMPTY';
    return { passCount, warnCount, actionCount, filledCount, overallStatus };
  }, [rows, references, selectedMatrix]);

  // Quick Paste from Excel handler (Robust PapaParse with standard mapping & blank filtering)
  const handleApplyPaste = (pastedTextOverride?: string) => {
    const textToProcess = (typeof pastedTextOverride === 'string' ? pastedTextOverride : rawPastedText).trim();
    if (!textToProcess) return;

    try {
      // 1. Parse using PapaParse to seamlessly handle multi-line quoted cells (e.g. "EPSILON F\nLIMONITE - MYLAR 2026")
      const parsed = Papa.parse<string[]>(textToProcess, {
        delimiter: textToProcess.includes('\t') ? '\t' : undefined,
        skipEmptyLines: 'greedy',
      });

      const rawRows = parsed.data || [];
      if (rawRows.length === 0) {
        toast.error("Data clipboard kosong atau tidak dapat dibaca.");
        return;
      }

      // Check if instrument name is present in pasted text
      const fullTextUpper = textToProcess.toUpperCase();
      const detectedInstMatch = fullTextUpper.match(/EPSILON[\s_]+([A-H])/);
      if (detectedInstMatch) {
        const instCode = `EPSILON_${detectedInstMatch[1]}`;
        if (instruments.some(i => i.code === instCode)) {
          setSelectedInstrument(instCode);
        }
      } else if (fullTextUpper.includes('SUPERMINI') || fullTextUpper.includes('RIGAKU') || fullTextUpper.includes('WDXRF')) {
        if (instruments.some(i => i.code === 'SUPERMINI')) {
          setSelectedInstrument('SUPERMINI');
        }
      }

      // Detect matrix if present
      let currentMatrix = selectedMatrix;
      if (fullTextUpper.includes('SUPERMINI') || fullTextUpper.includes('RIGAKU') || fullTextUpper.includes('BLANK A') || fullTextUpper.includes('OREAS191') || fullTextUpper.includes('OREAS192') || fullTextUpper.includes('OREAS195')) {
        currentMatrix = 'SUPERMINI';
        setSelectedMatrix('SUPERMINI');
      } else if (fullTextUpper.includes('LIMONITE') || fullTextUpper.includes('LIM 0') || fullTextUpper.includes('LIM0')) {
        currentMatrix = 'LIMONITE';
        setSelectedMatrix('LIMONITE');
      } else if (fullTextUpper.includes('SAPROLITE') || fullTextUpper.includes('OREAS')) {
        currentMatrix = 'SAPROLITE';
        setSelectedMatrix('SAPROLITE');
      }

      // Helper to clean numeric text (handle comma decimal, strip, N/A)
      const cleanVal = (val: any): string => {
        if (val === undefined || val === null) return '';
        const s = String(val).replace(',', '.').trim();
        if (s === '-' || s === '' || s.toUpperCase() === 'N/A' || s.includes('#')) return '';
        const num = parseFloat(s);
        return isNaN(num) ? '' : s;
      };

      const parsedPastedRows: StandardRowInput[] = [];
      let firstDetectedDate = '';
      let firstDetectedTime = '';

      for (let i = 0; i < rawRows.length; i++) {
        const cols = rawRows[i].map(c => String(c ?? '').trim());
        if (cols.length < 3) continue;

        // Skip header lines
        if (cols.some(c => /Sample Code|Date of|% Ni|Date Analyzed/i.test(c))) {
          continue;
        }

        // Calibration blanks (skip wax blank)
        const rowText = cols.join(' ');
        if (/BLANK\s*(WAX|LICOWAX)/i.test(rowText)) {
          continue;
        }

        // Find date / time column and label
        let sampleLabel = '';
        let rowTime = '';
        const labelParts: string[] = [];

        for (let c = 0; c < Math.min(cols.length, 6); c++) {
          const val = cols[c];
          if (!val) continue;

          // 1. Ekstrak Waktu JAM murni (Format: HH:mm atau H:mm)
          const timeMatch = val.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
          if (timeMatch && !rowTime) {
            rowTime = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
          }

          // 2. Ekstrak Tanggal Analisa
          if (!/^(VER-|OREAS|SAP|LIM|STD|CRM|BLANK)/i.test(val)) {
            const dateMatch = val.match(/\b(\d{1,4})[-/](\d{1,2})[-/](\d{1,4})\b/);
            if (dateMatch && !firstDetectedDate) {
              firstDetectedDate = dateMatch[0];
            }
          }

          // 3. Bangun Label Sampel lengkap
          if (/VER-|OREAS|LIM|SAP|BLANK|STD|CRM/i.test(val)) {
            labelParts.push(val);
          } else if (labelParts.length > 0 && (/^[A-Z]$/i.test(val) || /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/.test(val))) {
            labelParts.push(val);
          }
        }

        if (labelParts.length > 0) {
          sampleLabel = labelParts.join(' ');
        }

        // Find the column index of % Ni (first numeric measurement column)
        let numStartIdx = -1;
        for (let c = 2; c < cols.length; c++) {
          const num = parseFloat(cols[c].replace(',', '.'));
          if (!isNaN(num) && !cols[c].includes('/') && !cols[c].includes(':') && c >= 2) {
            numStartIdx = c;
            break;
          }
        }

        if (numStartIdx === -1) continue;

        if (!sampleLabel && numStartIdx > 0) {
          sampleLabel = cols[numStartIdx - 1];
        }

        // Deteksi Cerdas ID Sampel / Standar menggunakan extractSmartStandardCode
        const smart = extractSmartStandardCode(sampleLabel || rowText);
        let matchedStdCode = smart.standardCode;
        if (matchedStdCode === 'UNKNOWN') {
          matchedStdCode = `STD${parsedPastedRows.length + 1}`;
        }

        if (!firstDetectedTime && rowTime) {
          firstDetectedTime = rowTime;
        }

        const validAnalyzedAt = (/^\d{1,2}:\d{2}$/.test(rowTime) ? rowTime : (firstDetectedTime || verificationTime));

        // Extract element values: Ni, Co, Fe, CaO, SiO2, Al2O3, MgO, P, S, Cr2O3, MnO
        const getCol = (offset: number) => cleanVal(cols[numStartIdx + offset]);

        parsedPastedRows.push({
          standardCode: matchedStdCode,
          sampleLabel: sampleLabel || `VER-${matchedStdCode}`,
          sequenceNo: parsedPastedRows.length + 1,
          analyzedAt: validAnalyzedAt,
          ni: getCol(0),
          co: getCol(1),
          fe: getCol(2),
          cao: getCol(3),
          sio2: getCol(4),
          al2o3: getCol(5),
          mgo: getCol(6),
          p: getCol(7),
          s: getCol(8),
          cr2o3: getCol(9),
          mno: getCol(10),
        });
      }

      if (parsedPastedRows.length > 0) {
        setRows(parsedPastedRows);
        setSelectedMatrix(
          isWdxrfInstrument(selectedInstrument)
            ? (selectedInstrument === 'SUPERMINI' ? 'SUPERMINI' : 'ZETIUM')
            : 'DYNAMIC'
        );

        if (firstDetectedTime && /^\d{1,2}:\d{2}$/.test(firstDetectedTime)) {
          setVerificationTime(firstDetectedTime);
        }
        if (firstDetectedDate) {
          const dParts = firstDetectedDate.split(/[-/]/).map(n => parseInt(n, 10));
          if (dParts.length === 3 && !dParts.some(isNaN)) {
            let year = 0;
            let month = 0;
            let day = 0;
            if (dParts[0] > 1000) {
              [year, month, day] = dParts;
            } else {
              [day, month, year] = dParts;
              if (year < 100) year = 2000 + year;
            }
            setVerificationDate(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
          }
        }
        setShowPasteModal(false);
        setRawPastedText('');
        toast.success(`Berhasil mendeteksi & memetakan ${parsedPastedRows.length} baris standar dari Excel (Deteksi Cerdas Aktif)!`);
      } else {
        toast.error("Gagal mendeteksi standar CRM. Pastikan tabel berisi data verifikasi.");
      }
    } catch (err: any) {
      toast.error("Format data clipboard tidak dapat dibaca: " + err.message);
    }
  };

  // Pre-fill sample values
  const handleFillSampleValues = () => {
    if (selectedMatrix === 'SUPERMINI') {
      setRows([
        { standardCode: 'BLANK_A',  sampleLabel: 'BLANK A',       sequenceNo: 1,  analyzedAt: '00:05', ni: '0.000', co: '0.000', fe: '0.000', cao: '0.000', sio2: '0.00', al2o3: '0.00', mgo: '0.00', p: '0.000', s: '0.000', cr2o3: '0.000', mno: '0.000' },
        { standardCode: 'BLANK_B',  sampleLabel: 'VER-BLANK B',   sequenceNo: 2,  analyzedAt: '00:10', ni: '0.000', co: '0.000', fe: '0.000', cao: '0.000', sio2: '0.00', al2o3: '0.00', mgo: '0.00', p: '0.000', s: '0.000', cr2o3: '0.000', mno: '0.000' },
        { standardCode: 'OREAS184', sampleLabel: `VER-OREAS184 ${verificationDate}`,  sequenceNo: 3,  analyzedAt: '00:15', ni: '1.018', co: '0.089', fe: '27.48', cao: '0.214', sio2: '42.20', al2o3: '4.61', mgo: '3.04', p: '0.003', s: '0.001', cr2o3: '1.745', mno: '0.674' },
        { standardCode: 'LIM01',    sampleLabel: `VER-LIM01 ${verificationDate}`,     sequenceNo: 4,  analyzedAt: '00:20', ni: '1.112', co: '0.140', fe: '47.55', cao: '0.028', sio2: '6.82', al2o3: '4.43', mgo: '3.16', p: '0.003', s: '0.148', cr2o3: '2.295', mno: '1.072' },
        { standardCode: 'LIM02',    sampleLabel: `VER-LIM02 ${verificationDate}`,     sequenceNo: 5,  analyzedAt: '00:25', ni: '1.202', co: '0.132', fe: '45.61', cao: '0.058', sio2: '8.87', al2o3: '3.51', mgo: '4.96', p: '0.003', s: '0.121', cr2o3: '2.158', mno: '1.011' },
        { standardCode: 'LIM03',    sampleLabel: `VER-LIM03 ${verificationDate}`,     sequenceNo: 6,  analyzedAt: '00:30', ni: '1.291', co: '0.135', fe: '45.25', cao: '0.048', sio2: '8.53', al2o3: '4.19', mgo: '4.83', p: '0.002', s: '0.130', cr2o3: '2.045', mno: '1.008' },
        { standardCode: 'OREAS187', sampleLabel: `VER-OREAS187 ${verificationDate}`,  sequenceNo: 7,  analyzedAt: '00:35', ni: '1.368', co: '0.063', fe: '13.58', cao: '0.339', sio2: '46.62', al2o3: '2.79', mgo: '17.96', p: '0.001', s: '0.001', cr2o3: '0.985', mno: '0.355' },
        { standardCode: 'LIM04',    sampleLabel: `VER-LIM04 ${verificationDate}`,     sequenceNo: 8,  analyzedAt: '00:40', ni: '1.406', co: '0.124', fe: '42.63', cao: '0.059', sio2: '10.83', al2o3: '3.85', mgo: '6.91', p: '0.003', s: '0.129', cr2o3: '1.918', mno: '0.868' },
        { standardCode: 'OREAS189', sampleLabel: `VER-OREAS189 ${verificationDate}`,  sequenceNo: 9,  analyzedAt: '00:45', ni: '1.478', co: '0.032', fe: '10.51', cao: '0.328', sio2: '46.18', al2o3: '2.08', mgo: '23.06', p: '0.001', s: '0.000', cr2o3: '0.758', mno: '0.229' },
        { standardCode: 'LIM05',    sampleLabel: `VER-LIM05 ${verificationDate}`,     sequenceNo: 10, analyzedAt: '00:50', ni: '1.496', co: '0.123', fe: '36.97', cao: '0.078', sio2: '15.25', al2o3: '3.54', mgo: '10.92', p: '0.003', s: '0.097', cr2o3: '1.915', mno: '0.852' },
        { standardCode: 'OREAS190', sampleLabel: `VER-OREAS190 ${verificationDate}`,  sequenceNo: 11, analyzedAt: '00:55', ni: '1.638', co: '0.089', fe: '24.81', cao: '0.129', sio2: '38.19', al2o3: '5.98', mgo: '6.89', p: '0.001', s: '0.000', cr2o3: '1.726', mno: '0.578' },
        { standardCode: 'OREAS191', sampleLabel: `VER-OREAS191 ${verificationDate}`,  sequenceNo: 12, analyzedAt: '01:00', ni: '1.728', co: '0.066', fe: '17.38', cao: '0.258', sio2: '47.12', al2o3: '4.19', mgo: '10.06', p: '0.003', s: '0.000', cr2o3: '1.278', mno: '0.388' },
        { standardCode: 'OREAS192', sampleLabel: `VER-OREAS192 ${verificationDate}`,  sequenceNo: 13, analyzedAt: '01:05', ni: '1.810', co: '0.041', fe: '12.84', cao: '0.279', sio2: '38.34', al2o3: '2.67', mgo: '19.68', p: '0.001', s: '0.002', cr2o3: '0.908', mno: '0.279' },
        { standardCode: 'OREAS193', sampleLabel: `VER-OREAS193 ${verificationDate}`,  sequenceNo: 14, analyzedAt: '01:10', ni: '1.955', co: '0.049', fe: '13.75', cao: '0.338', sio2: '40.35', al2o3: '3.07', mgo: '19.38', p: '0.002', s: '0.001', cr2o3: '1.008', mno: '0.309' },
        { standardCode: 'SAP19',    sampleLabel: `VER-SAP19 ${verificationDate}`,     sequenceNo: 15, analyzedAt: '01:15', ni: '2.022', co: '0.066', fe: '17.36', cao: '0.069', sio2: '30.72', al2o3: '1.91', mgo: '26.02', p: '0.001', s: '0.019', cr2o3: '1.258', mno: '0.448' },
        { standardCode: 'OREAS194', sampleLabel: `VER-OREAS194 ${verificationDate}`,  sequenceNo: 16, analyzedAt: '01:20', ni: '2.148', co: '0.042', fe: '11.67', cao: '0.289', sio2: '40.67', al2o3: '2.69', mgo: '21.78', p: '0.001', s: '0.000', cr2o3: '0.858', mno: '0.259' },
        { standardCode: 'OREAS195', sampleLabel: `VER-OREAS195 ${verificationDate}`,  sequenceNo: 17, analyzedAt: '01:25', ni: '2.924', co: '0.048', fe: '12.73', cao: '0.378', sio2: '43.34', al2o3: '2.84', mgo: '18.06', p: '0.001', s: '0.001', cr2o3: '0.968', mno: '0.279' },
      ]);
    } else if (selectedMatrix === 'LIMONITE') {
      setRows([
        { standardCode: 'LIM01', sampleLabel: `VER-LIM01 ${verificationDate}`, sequenceNo: 1, analyzedAt: '00:26', ni: '1.109', co: '0.138', fe: '47.52', cao: '0.020', sio2: '6.85', al2o3: '4.45', mgo: '3.18', p: '0.003', s: '0.148', cr2o3: '2.290', mno: '1.080' },
        { standardCode: 'LIM02', sampleLabel: `VER-LIM02 ${verificationDate}`, sequenceNo: 2, analyzedAt: '01:01', ni: '1.201', co: '0.131', fe: '45.60', cao: '0.055', sio2: '8.88', al2o3: '3.52', mgo: '4.95', p: '0.003', s: '0.121', cr2o3: '2.155', mno: '1.012' },
        { standardCode: 'LIM03', sampleLabel: `VER-LIM03 ${verificationDate}`, sequenceNo: 3, analyzedAt: '01:05', ni: '1.290', co: '0.134', fe: '45.22', cao: '0.046', sio2: '8.52', al2o3: '4.19', mgo: '4.82', p: '0.002', s: '0.130', cr2o3: '2.042', mno: '1.005' },
        { standardCode: 'LIM04', sampleLabel: `VER-LIM04 ${verificationDate}`, sequenceNo: 4, analyzedAt: '01:08', ni: '1.405', co: '0.123', fe: '42.61', cao: '0.058', sio2: '10.82', al2o3: '3.85', mgo: '6.90', p: '0.003', s: '0.129', cr2o3: '1.915', mno: '0.865' },
        { standardCode: 'LIM05', sampleLabel: `VER-LIM05 ${verificationDate}`, sequenceNo: 5, analyzedAt: '01:11', ni: '1.495', co: '0.122', fe: '36.95', cao: '0.076', sio2: '15.22', al2o3: '3.53', mgo: '10.91', p: '0.003', s: '0.097', cr2o3: '1.910', mno: '0.850' },
      ]);
    } else {
      setRows([
        { standardCode: 'OREAS184', sampleLabel: `VER-OREAS184 ${verificationDate}`, sequenceNo: 1, analyzedAt: '00:15', ni: '1.018', co: '0.089', fe: '27.48', cao: '0.214', sio2: '42.20', al2o3: '4.61', mgo: '3.04', p: '', s: '', cr2o3: '1.745', mno: '0.674' },
        { standardCode: 'OREAS187', sampleLabel: `VER-OREAS187 ${verificationDate}`, sequenceNo: 2, analyzedAt: '00:30', ni: '1.368', co: '0.063', fe: '13.58', cao: '0.339', sio2: '46.62', al2o3: '2.79', mgo: '17.96', p: '', s: '', cr2o3: '0.985', mno: '0.355' },
        { standardCode: 'OREAS189', sampleLabel: `VER-OREAS189 ${verificationDate}`, sequenceNo: 3, analyzedAt: '00:45', ni: '1.478', co: '0.032', fe: '10.51', cao: '0.328', sio2: '46.18', al2o3: '2.08', mgo: '23.06', p: '', s: '', cr2o3: '0.758', mno: '0.229' },
        { standardCode: 'OREAS190', sampleLabel: `VER-OREAS190 ${verificationDate}`, sequenceNo: 4, analyzedAt: '01:00', ni: '1.638', co: '0.089', fe: '24.81', cao: '0.129', sio2: '38.19', al2o3: '5.98', mgo: '6.89', p: '', s: '', cr2o3: '1.726', mno: '0.578' },
        { standardCode: 'OREAS191', sampleLabel: `VER-OREAS191 ${verificationDate}`, sequenceNo: 5, analyzedAt: '01:15', ni: '1.751', co: '0.067', fe: '17.35', cao: '0.281', sio2: '47.92', al2o3: '4.26', mgo: '10.04', p: '', s: '', cr2o3: '1.218', mno: '0.401' },
        { standardCode: 'OREAS192', sampleLabel: `VER-OREAS192 ${verificationDate}`, sequenceNo: 6, analyzedAt: '01:30', ni: '1.770', co: '0.040', fe: '12.64', cao: '0.312', sio2: '43.55', al2o3: '2.75', mgo: '21.30', p: '', s: '', cr2o3: '0.908', mno: '0.279' },
        { standardCode: 'OREAS193', sampleLabel: `VER-OREAS193 ${verificationDate}`, sequenceNo: 7, analyzedAt: '01:45', ni: '1.928', co: '0.049', fe: '13.64', cao: '0.360', sio2: '42.68', al2o3: '3.07', mgo: '20.22', p: '', s: '', cr2o3: '0.960', mno: '0.316' },
        { standardCode: 'SAP19',    sampleLabel: `VER-SAP19 ${verificationDate}`,    sequenceNo: 8, analyzedAt: '02:00', ni: '2.028', co: '0.065', fe: '17.53', cao: '0.067', sio2: '31.51', al2o3: '1.69', mgo: '25.18', p: '', s: '', cr2o3: '1.162', mno: '0.448' },
        { standardCode: 'OREAS194', sampleLabel: `VER-OREAS194 ${verificationDate}`, sequenceNo: 9, analyzedAt: '02:15', ni: '2.128', co: '0.042', fe: '11.51', cao: '0.309', sio2: '42.98', al2o3: '2.73', mgo: '22.80', p: '', s: '', cr2o3: '0.817', mno: '0.260' },
        { standardCode: 'OREAS195', sampleLabel: `VER-OREAS195 ${verificationDate}`, sequenceNo: 10, analyzedAt: '02:30', ni: '2.942', co: '0.048', fe: '12.77', cao: '0.388', sio2: '43.98', al2o3: '3.12', mgo: '18.99', p: '', s: '', cr2o3: '0.958', mno: '0.288' },
      ]);
    }
    toast.success(`Berhasil memuat contoh data analisa ${selectedMatrix}!`);
  };

  // Submit Batch
  const handleSubmitBatch = async () => {
    const hasAnyValue = rows.some(r => r.ni || r.fe || r.cr2o3);
    if (!hasAnyValue) {
      toast.error("Harap isi hasil analisa sebelum menyimpan.");
      return;
    }

    setLoading(true);
    try {
      const instObj = filteredInstruments.find(i => i.code === selectedInstrument);
      const payload = {
        instrumentCode: selectedInstrument,
        instrumentName: instObj?.name || selectedInstrument,
        verificationDate,
        verificationTime,
        shift,
        notes: notes || `Input Verifikasi Harian ${selectedMatrix}`,
        operatorNik: userNik,
        operatorName: userName,
        items: rows.map(r => ({
          standardCode: r.standardCode,
          sampleLabel: r.sampleLabel,
          sequenceNo: r.sequenceNo,
          analyzedAt: r.analyzedAt
            ? (/^\d{1,2}:\d{2}/.test(r.analyzedAt.trim()) ? `${verificationDate} ${r.analyzedAt.trim()}` : r.analyzedAt.trim())
            : `${verificationDate} ${verificationTime || ''}`.trim(),
          ni: r.ni || null,
          co: r.co || null,
          fe: r.fe || null,
          cao: r.cao || null,
          sio2: r.sio2 || null,
          al2o3: r.al2o3 || null,
          mgo: r.mgo || null,
          p: r.p || null,
          s: r.s || null,
          cr2o3: r.cr2o3 || null,
          mno: r.mno || null,
        }))
      };

      const res = await fetch('/api/xrf/verifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Data verifikasi harian berhasil disimpan ke database!");
        if (onSuccessSave) onSuccessSave();
      } else {
        toast.error(json.error || "Gagal menyimpan data verifikasi");
      }
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const activeColumns = selectedMatrix === 'LIMONITE'
    ? ['Ni', 'Co', 'Fe', 'CaO', 'SiO2', 'Al2O3', 'MgO', 'P', 'S', 'Cr2O3', 'MnO']
    : ['Ni', 'Co', 'Fe', 'CaO', 'SiO2', 'Al2O3', 'MgO', 'Cr2O3', 'MnO'];

  const companyName = assignedSite === 'GTS' ? 'PT GANE TAMBANG SENTOSA' : 'PT TRIMEGAH BANGUN PERSADA';

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* 1. TOP CONTROL BAR (SCREEN ONLY)                              */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 no-print-area">
        {/* Row 1: Matrix Toggle & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Primary Matrix Tab Toggle */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 flex-wrap gap-1">
              <button
                onClick={() => handleMatrixChange('LIMONITE')}
                className={`px-3 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedMatrix === 'LIMONITE'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                LIMONITE (5 Std)
              </button>
              <button
                onClick={() => handleMatrixChange('SAPROLITE')}
                className={`px-3 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedMatrix === 'SAPROLITE'
                    ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                SAPROLITE (10 Std)
              </button>
              <button
                onClick={() => handleMatrixChange('SUPERMINI')}
                className={`px-3 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedMatrix === 'SUPERMINI'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                SUPERMINI (17 Std)
              </button>
              <button
                onClick={() => handleMatrixChange('ZETIUM')}
                className={`px-3 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                  selectedMatrix === 'ZETIUM'
                    ? 'bg-white dark:bg-slate-900 text-fuchsia-600 dark:text-fuchsia-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                ZETIUM (17 Std)
              </button>
              {selectedMatrix === 'DYNAMIC' && (
                <span className="px-3 py-2 rounded-lg text-xs font-black bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  DINAMIS ({rows.length} Std)
                </span>
              )}
            </div>

            {latestBatchInfo && (
              <span className="hidden xl:inline-flex items-center gap-1.5 text-xs text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <Database className="w-3.5 h-3.5 text-indigo-500" />
                Baseline Terakhir: {latestBatchInfo.date} ({latestBatchInfo.count} Std)
              </span>
            )}
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => loadInstrumentProfile(selectedInstrument)}
              disabled={loadingProfile}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Muat ulang susunan standar dari batch verifikasi terakhir alat ini"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${loadingProfile ? 'animate-spin' : ''}`} />
              Muat Baseline Alat
            </button>

            <button
              onClick={handleAddRow}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Tambah baris standar baru ke tabel verifikasi"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-500" />
              + Baris Standar
            </button>

            <button
              onClick={handleFillSampleValues}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Isi dengan contoh hasil analisa kalibrasi"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Contoh Data
            </button>

            <button
              onClick={() => setShowPasteModal(true)}
              className="px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              title="Tempelkan baris data dari Excel"
            >
              <Clipboard className="w-3.5 h-3.5" />
              Paste Excel
            </button>

            {/* Preview Template Button */}
            <button
              type="button"
              onClick={() => setShowPrintPreviewModal(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Pratinjau Template Resmi Sesuai Contoh Format"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview Template
            </button>

            {/* Print A4 Button */}
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Cetak Formulir Verifikasi ke Kertas A4 (Fit 1 Halaman)"
            >
              <Printer className="w-4 h-4" />
              Cetak A4 (SPV & SPT Sign)
            </button>
          </div>
        </div>

        {/* Row 2: Metadata Fields Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Instrumen XRF</label>
            <select
              value={selectedInstrument}
              onChange={e => setSelectedInstrument(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            >
              {filteredInstruments.map(i => (
                <option key={i.code} value={i.code}>{i.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Tanggal Verifikasi</label>
            <input
              type="date"
              value={verificationDate}
              onChange={e => setVerificationDate(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Jam Analisa</label>
            <TimeInput24
              value={verificationTime}
              onChange={val => setVerificationTime(val)}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Shift Kerja</label>
            <select
              value={shift}
              onChange={e => setShift(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
            >
              <option value="1">Shift 1 (Pagi)</option>
              <option value="2">Shift 2 (Malam)</option>
              <option value="Day">Day Shift</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Operator / Analis</label>
            <div className="bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
              {userName}
            </div>
          </div>
        </div>

        {/* Real-time Evaluation Summary Badge (Screen View) */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs">
          <div className="flex items-center gap-4">
            <span className="font-bold text-slate-600 dark:text-slate-400">Status Evaluasi Live:</span>
            {batchStats.overallStatus === 'PASS' && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                PASS (Semua Unsur Sesuai Toleransi ≤ 2σ)
              </span>
            )}
            {batchStats.overallStatus === 'WARNING' && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                WARNING ({batchStats.warnCount} Unsur dalam batas 2σ - 3σ)
              </span>
            )}
            {batchStats.overallStatus === 'ACTION' && (
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/40 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                ACTION REQUIRED ({batchStats.actionCount} Unsur Melebihi Batas &gt; 3σ)
              </span>
            )}
            {batchStats.overallStatus === 'EMPTY' && (
              <span className="text-slate-400 italic">Menunggu input hasil analisa...</span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
            <span>Pass: <strong className="text-emerald-600">{batchStats.passCount}</strong></span>
            <span>Warning: <strong className="text-amber-600">{batchStats.warnCount}</strong></span>
            <span>Action: <strong className="text-red-600">{batchStats.actionCount}</strong></span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. INTERACTIVE SCREEN TABLE (INTUITIVE & RESPONSIVE)          */}
      {/* ------------------------------------------------------------- */}
      <div 
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (text && (text.includes('\t') || text.includes('\n')) && (text.includes('VER-') || text.includes('LIM') || text.includes('OREAS') || text.includes('SAP') || text.includes('EPSILON'))) {
            e.preventDefault();
            handleApplyPaste(text);
          }
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden no-print-area"
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Tabel Input Hasil Analisa Verifikasi Harian ({selectedMatrix})
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            *Nilai acuan nominal CRM ditampilkan 3 angka di belakang koma (Bisa langsung paste Excel dengan Ctrl+V)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-2.5 px-3 w-10 text-center">No</th>
                <th className="py-2.5 px-3 min-w-[120px]">Standar CRM</th>
                <th className="py-2.5 px-3 min-w-[150px]">Label Sample</th>
                <th className="py-2.5 px-3 w-20 text-center">Jam</th>
                {activeColumns.map(col => (
                  <th key={`th-${col}`} className="py-2.5 px-2 text-right min-w-[85px]">{col}</th>
                ))}
                <th className="py-2.5 px-2 text-right min-w-[65px]">BC</th>
                <th className="py-2.5 px-2 text-right min-w-[65px]">Fe/Ni</th>
                <th className="py-2.5 px-2 text-right min-w-[75px]">Sum %</th>
                <th className="py-2.5 px-3 text-center min-w-[95px]">Status</th>
                <th className="py-2.5 px-2 text-center w-10 no-print-area" title="Aksi"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {rows.map((r, idx) => {
                const calcs = computeRowCalculations(r);
                const rowStatus = evaluateRow(r);

                return (
                  <tr key={`row-${r.standardCode}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-sans">{idx + 1}</td>
                    <td className="py-2 px-3 font-bold text-slate-800 dark:text-slate-200 font-sans">
                      <input
                        type="text"
                        value={r.standardCode}
                        onChange={e => handleCellChange(idx, 'standardCode', e.target.value.toUpperCase())}
                        className="w-24 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 font-bold font-mono text-xs focus:ring-1 focus:ring-teal-500 outline-none uppercase"
                        title="Kode Standar CRM (bisa disesuaikan)"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={r.sampleLabel}
                        onChange={e => handleCellChange(idx, 'sampleLabel', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-sans text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-teal-500 outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="text"
                        placeholder="HH:mm"
                        value={r.analyzedAt}
                        onChange={e => handleCellChange(idx, 'analyzedAt', e.target.value)}
                        className="w-16 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-1.5 py-1 text-xs text-center text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-teal-500 outline-none font-mono"
                      />
                    </td>

                    {/* Element Input Cells with Live Evaluation Highlighting */}
                    {activeColumns.map(elem => {
                      const field = elem.toLowerCase() as keyof StandardRowInput;
                      const val = r[field];
                      const evalResult = evaluateCell(r.standardCode, elem, val);

                      let cellBg = 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700';
                      if (evalResult.status === 'ACTION') cellBg = 'bg-red-500/15 border-red-500 text-red-700 dark:text-red-300 font-bold';
                      else if (evalResult.status === 'WARNING') cellBg = 'bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-bold';
                      else if (evalResult.status === 'PASS') cellBg = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-800 dark:text-emerald-300 font-bold';

                      return (
                        <td key={`cell-${elem}-${idx}`} className="py-2 px-1 text-right">
                          <input
                            type="text"
                            placeholder={evalResult.expected > 0 ? evalResult.expected.toFixed(3) : '-'}
                            value={val}
                            onChange={e => handleCellChange(idx, field, e.target.value)}
                            className={`w-full text-right border rounded-lg px-2 py-1 text-xs outline-none transition-colors ${cellBg}`}
                            title={evalResult.expected > 0 ? `Nominal Acuan: ${evalResult.expected.toFixed(3)} | Diff: ${evalResult.diffPct.toFixed(2)}% (${evalResult.sigmaDist.toFixed(1)}σ)` : undefined}
                          />
                        </td>
                      );
                    })}

                    {/* Computed Ratios */}
                    <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-300">{calcs.bc}</td>
                    <td className="py-2 px-2 text-right text-slate-600 dark:text-slate-300">{calcs.feNi}</td>
                    <td className="py-2 px-2 text-right font-bold text-slate-800 dark:text-slate-200">{calcs.sum}</td>

                    {/* Status Badge */}
                    <td className="py-2 px-3 text-center font-sans">
                      {rowStatus === 'PASS' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          PASS
                        </span>
                      )}
                      {rowStatus === 'WARNING' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          WARNING
                        </span>
                      )}
                      {rowStatus === 'ACTION' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                          ACTION
                        </span>
                      )}
                      {rowStatus === 'EMPTY' && (
                        <span className="text-slate-300 text-[10px]">-</span>
                      )}
                    </td>
                    <td className="py-2 px-2 text-center no-print-area">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition-colors cursor-pointer"
                        title={`Hapus baris standar ${r.standardCode}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Submit Actions Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Menampilkan formulir untuk {rows.length} sampel acuan kalibrasi ({selectedMatrix}).
          </div>
          <button
            disabled={loading}
            onClick={handleSubmitBatch}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan Verifikasi Harian
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. PRINTABLE OFFICIAL DOCUMENT (FIT EXACTLY 1 A4 LANDSCAPE)   */}
      {/* ------------------------------------------------------------- */}
      {(() => {
        const TBP_LOGO_URI = "data:image/png;base64,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";

        // Helper function to format numbers with comma as decimal separator
        const formatIndoNum = (val: string | number | undefined | null, decimals: number = 2) => {
          if (val === undefined || val === null || val === '' || val === '-') return '-';
          const n = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
          if (isNaN(n)) return '-';
          return n.toFixed(decimals).replace('.', ',');
        };

        // Helper to format Date of Analyzed as DD/MM/YY HH:mm
        const formatDateOfAnalyzed = (dateStr: string, timeStr?: string, idx: number = 0) => {
          const parts = (dateStr || '').split('-');
          let dmy = '';
          if (parts.length === 3) {
            const yy = parts[0].slice(-2);
            const mm = parts[1];
            const dd = parts[2];
            dmy = `${dd}/${mm}/${yy}`;
          } else {
            dmy = '23/10/26';
          }
          let t = timeStr || '';
          if (!t) {
            const baseHour = 8;
            const baseMin = 33 + idx * 3;
            const h = Math.floor(baseMin / 60) + baseHour;
            const m = baseMin % 60;
            t = `${h}:${m < 10 ? '0' : ''}${m}`;
          }
          return `${dmy} ${t}`.trim();
        };

        // 14 standard elements in exact order of the reference example
        const targetElements: Array<{ key: string; label: string; is3Dec: boolean; field?: keyof StandardRowInput }> = [
          { key: 'Ni', label: 'Ni', is3Dec: true, field: 'ni' },
          { key: 'Co', label: 'Co', is3Dec: true, field: 'co' },
          { key: 'Fe', label: 'Fe', is3Dec: false, field: 'fe' },
          { key: 'CaO', label: 'CaO', is3Dec: false, field: 'cao' },
          { key: 'SiO2', label: 'SiO2', is3Dec: false, field: 'sio2' },
          { key: 'Al2O3', label: 'Al2O3', is3Dec: false, field: 'al2o3' },
          { key: 'MgO', label: 'MgO', is3Dec: false, field: 'mgo' },
          { key: 'P', label: 'P', is3Dec: true, field: 'p' },
          { key: 'S', label: 'S', is3Dec: true, field: 's' },
          { key: 'Cr2O3', label: 'Cr2O3', is3Dec: false, field: 'cr2o3' },
          { key: 'MnO', label: 'MnO', is3Dec: false, field: 'mno' },
          { key: 'BC', label: 'BC', is3Dec: false },
          { key: 'FeNi', label: 'FeNi', is3Dec: false },
          { key: 'Sum', label: 'Sum of Conc.', is3Dec: false },
        ];

        // Retrieve actual value of a column for a given row
        const getRowColValue = (r: StandardRowInput, colKey: string) => {
          const calcs = computeRowCalculations(r);
          if (colKey === 'BC') return calcs.bc !== '-' ? parseFloat(calcs.bc) : null;
          if (colKey === 'FeNi') return calcs.feNi !== '-' ? parseFloat(calcs.feNi) : null;
          if (colKey === 'Sum') return calcs.sum !== '-' ? parseFloat(calcs.sum) : null;
          const field = colKey.toLowerCase() as keyof StandardRowInput;
          const raw = r[field];
          if (raw === undefined || raw === null || raw === '') return null;
          const parsed = parseFloat(String(raw).replace(',', '.'));
          return isNaN(parsed) ? null : parsed;
        };

        // Retrieve expected reference value for a column
        const getExpectedColValue = (stdCode: string, colKey: string) => {
          if (colKey === 'BC') {
            const expCao = references[stdCode]?.['CaO']?.nominalValue || 0;
            const expMgo = references[stdCode]?.['MgO']?.nominalValue || 0;
            const expSio2 = references[stdCode]?.['SiO2']?.nominalValue || 0;
            return expSio2 > 0 ? (expCao + expMgo) / expSio2 : 0;
          }
          if (colKey === 'FeNi') {
            const expFe = references[stdCode]?.['Fe']?.nominalValue || 0;
            const expNi = references[stdCode]?.['Ni']?.nominalValue || 0;
            return expNi > 0 ? expFe / expNi : 0;
          }
          if (colKey === 'Sum') {
            let sum = 0;
            ['Ni', 'Co', 'Fe', 'CaO', 'SiO2', 'Al2O3', 'MgO', 'P', 'S', 'Cr2O3', 'MnO'].forEach(el => {
              sum += references[stdCode]?.[el]?.nominalValue || 0;
            });
            return sum;
          }
          return references[stdCode]?.[colKey]?.nominalValue || 0;
        };

        // Compute Diff % between actual and expected
        const getDiffPercentage = (actual: number | null, expected: number) => {
          if (actual === null || expected <= 0) return null;
          return ((actual - expected) / expected) * 100;
        };

        // Non-blank CRM standards list for comparison section
        const crmStandardsList = rows.filter(r => {
          const codeLower = (r.standardCode || '').toLowerCase();
          const labelLower = (r.sampleLabel || '').toLowerCase();
          return !codeLower.includes('blank') && !labelLower.includes('blank');
        });

        // Dynamic compact styles if many standards (e.g. 8+ rows)
        const isDense = crmStandardsList.length >= 7;
        const mainRowPad = isDense ? '1.5px 1px' : '2px 1px';
        const fontSizeMain = isDense ? '7pt' : '7.5pt';
        const compMarginBottom = isDense ? '4px' : '8px';
        const signBoxHeight = isDense ? '48px' : '58px';

        const renderOfficialContent = () => (
          <div
            className="xrf-official-doc-root"
            style={{
              width: '100%',
              maxWidth: '100%',
              margin: '0 auto',
              fontFamily: 'Arial, Helvetica, sans-serif',
              color: '#000000',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box'
            }}
          >
            {/* 1. Header with TBP Logo and Centered Document Title */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                marginBottom: isDense ? '10px' : '14px',
                minHeight: '38px'
              }}
            >
              <div style={{ width: '140px', flexShrink: 0 }}>
                <img
                  src={TBP_LOGO_URI}
                  alt="TBP Logo"
                  style={{ height: isDense ? '32px' : '36px', width: 'auto', objectFit: 'contain', display: 'block' }}
                />
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <h1
                  style={{
                    fontSize: isDense ? '13pt' : '14pt',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    margin: 0,
                    letterSpacing: '0.5px',
                    color: '#000000',
                    fontFamily: 'Arial, sans-serif'
                  }}
                >
                  DAILY VERIFIKASI SAMPLE STANDARD
                </h1>
              </div>
              <div style={{ width: '140px', flexShrink: 0 }} />
            </div>

            {/* 2. Main Daily Results Table */}
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: '1.5px solid #000000',
                tableLayout: 'fixed',
                marginBottom: isDense ? '10px' : '14px'
              }}
            >
              <colgroup>
                <col style={{ width: '3%' }} />
                <col style={{ width: '4.8%' }} />
                <col style={{ width: '10.5%' }} />
                <col style={{ width: '18.7%' }} />
                {targetElements.map(el => (
                  <col key={`col-${el.key}`} style={{ width: `${63 / targetElements.length}%` }} />
                ))}
              </colgroup>
              <thead>
                {/* Header Row 1 */}
                <tr style={{ backgroundColor: '#a6a6a6', color: '#000000' }}>
                  <th rowSpan={2} style={{ border: '1px solid #000000', padding: '2px 1px', fontSize: fontSizeMain, fontWeight: 'bold', textAlign: 'center' }}>
                    NO.
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #000000', padding: '2px 1px', fontSize: fontSizeMain, fontWeight: 'bold', textAlign: 'center' }}>
                    XRF
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #000000', padding: '2px 1px', fontSize: fontSizeMain, fontWeight: 'bold', textAlign: 'center' }}>
                    Date Of Analyzed
                  </th>
                  <th rowSpan={2} style={{ border: '1px solid #000000', padding: '2px 4px', fontSize: fontSizeMain, fontWeight: 'bold', textAlign: 'center' }}>
                    Standard Sample Code
                  </th>
                  {targetElements.map(el => (
                    <th key={`th1-${el.key}`} style={{ border: '1px solid #000000', padding: '2px 1px', fontSize: isDense ? '6.5pt' : '7pt', fontWeight: 'bold', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {el.label}
                    </th>
                  ))}
                </tr>
                {/* Header Row 2: Percentage Units */}
                <tr style={{ backgroundColor: '#a6a6a6', color: '#000000' }}>
                  {targetElements.map(el => (
                    <th key={`th2-${el.key}`} style={{ border: '1px solid #000000', padding: '1px', fontSize: isDense ? '6.5pt' : '7pt', fontWeight: 'bold', textAlign: 'center' }}>
                      %
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const isFirstRow = idx === 0;

                  return (
                    <tr key={`print-main-row-${idx}`}>
                      {/* Column 1: NO. */}
                      <td style={{ border: '1px solid #000000', textAlign: 'center', fontSize: fontSizeMain, padding: mainRowPad }}>
                        {idx + 1}
                      </td>

                      {/* Column 2: Merged Vertical XRF Column */}
                      {isFirstRow && (
                        <td
                          rowSpan={rows.length}
                          style={{
                            border: '1px solid #000000',
                            backgroundColor: '#ffffff',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            padding: '2px 1px'
                          }}
                        >
                          <div
                            style={{
                              writingMode: 'vertical-rl',
                              transform: 'rotate(180deg)',
                              margin: 'auto',
                              fontWeight: 'bold',
                              fontSize: isDense ? '6.5pt' : '7pt',
                              letterSpacing: '0.4px',
                              whiteSpace: 'nowrap',
                              lineHeight: 1.2,
                              color: '#000000'
                            }}
                          >
                            <span style={{ display: 'inline-block', marginBottom: '2px' }}>
                              {selectedInstrument ? selectedInstrument.replace('_', ' ') : 'EPSILON H'}
                            </span>
                            <span style={{ display: 'inline-block', fontSize: isDense ? '6pt' : '6.5pt', opacity: 0.9 }}>
                              {selectedMatrix || 'LIMONITE - MYLAR (2) 2026'}
                            </span>
                          </div>
                        </td>
                      )}

                      {/* Column 3: Date Of Analyzed */}
                      <td style={{ border: '1px solid #000000', textAlign: 'center', fontSize: isDense ? '6.5pt' : '7pt', padding: '1px', whiteSpace: 'nowrap' }}>
                        {formatDateOfAnalyzed(verificationDate, r.analyzedAt, idx)}
                      </td>

                      {/* Column 4: Standard Sample Code */}
                      <td style={{ border: '1px solid #000000', textAlign: 'left', fontSize: fontSizeMain, padding: '1px 6px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.sampleLabel || r.standardCode}
                      </td>

                      {/* Columns 5-18: 14 Results Columns */}
                      {targetElements.map(el => {
                        const valNum = getRowColValue(r, el.key);
                        const evalResult = el.field ? evaluateCell(r.standardCode, el.key, valNum) : { status: 'NORMAL' };
                        
                        // Pink highlight if value is negative (typical in blanks) or action alert
                        const isAlert = (valNum !== null && valNum < 0) || evalResult.status === 'ACTION';

                        return (
                          <td
                            key={`cell-${el.key}-${idx}`}
                            style={{
                              border: '1px solid #000000',
                              textAlign: 'center',
                              fontSize: fontSizeMain,
                              padding: mainRowPad,
                              backgroundColor: isAlert ? '#ffc7ce' : '#ffffff',
                              color: isAlert ? '#9c0006' : '#000000',
                              fontWeight: 'normal',
                              fontFamily: 'Arial, Helvetica, sans-serif'
                            }}
                          >
                            {formatIndoNum(valNum, el.is3Dec ? 3 : 2)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* 3. Detailed Standards Comparison Breakdown (Expected Value & Diff. %) */}
            {/* Exactly aligned with the main table columns */}
            <div style={{ width: '100%', marginBottom: isDense ? '12px' : '18px' }}>
              {crmStandardsList.map((r, sIdx) => {
                return (
                  <div key={`std-comp-${sIdx}`} style={{ width: '100%', marginBottom: compMarginBottom }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        border: 'none',
                        tableLayout: 'fixed',
                        fontSize: isDense ? '6.5pt' : '7pt'
                      }}
                    >
                      <colgroup>
                        <col style={{ width: '3%' }} />
                        <col style={{ width: '4.8%' }} />
                        <col style={{ width: '10.5%' }} />
                        <col style={{ width: '18.7%' }} />
                        {targetElements.map(el => (
                          <col key={`comp-col-${el.key}`} style={{ width: `${63 / targetElements.length}%` }} />
                        ))}
                      </colgroup>
                      <tbody>
                        {/* Row 1: Standard Name + Actual Values */}
                        <tr style={{ height: isDense ? '16px' : '18px' }}>
                          <td style={{ border: 'none', padding: '1px' }}></td>
                          <td style={{ border: 'none', padding: '1px' }}></td>
                          <td style={{ border: 'none', padding: '1px' }}></td>
                          <td style={{ padding: '1px 4px', textAlign: 'left', fontWeight: 'bold', fontSize: isDense ? '7pt' : '7.5pt', border: 'none', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                            <span style={{ display: 'inline-block', width: '24px', height: '9px', backgroundColor: '#64748b', marginRight: '6px', verticalAlign: 'middle' }} />
                            <span style={{ verticalAlign: 'middle' }}>{r.sampleLabel || r.standardCode}</span>
                          </td>
                          {targetElements.map(el => {
                            const valNum = getRowColValue(r, el.key);
                            return (
                              <td key={`act-val-${el.key}`} style={{ textAlign: 'center', fontWeight: 'bold', fontSize: isDense ? '7pt' : '7.5pt', padding: '1px', border: 'none' }}>
                                {formatIndoNum(valNum, el.is3Dec ? 3 : 2)}
                              </td>
                            );
                          })}
                        </tr>

                        {/* Row 2: Expected Value */}
                        <tr style={{ height: isDense ? '15px' : '17px' }}>
                          <td style={{ border: 'none', padding: '1px' }}></td>
                          <td style={{ border: 'none', padding: '1px' }}></td>
                          <td style={{ border: 'none', padding: '1px' }}></td>
                          <td style={{ padding: '1px 4px', textAlign: 'center', border: 'none' }}>
                            <div style={{ backgroundColor: '#e2e8f0', borderRadius: '3px', padding: '1px 6px', fontStyle: 'italic', display: 'inline-block', fontSize: isDense ? '6.5pt' : '7pt', color: '#1e293b' }}>
                              Expected Value
                            </div>
                          </td>
                          {targetElements.map(el => {
                            const expVal = getExpectedColValue(r.standardCode, el.key);
                            return (
                              <td key={`exp-val-${el.key}`} style={{ textAlign: 'center', fontStyle: 'normal', fontSize: isDense ? '6.5pt' : '7pt', padding: '1px', color: '#334155', border: 'none' }}>
                                {expVal > 0 ? formatIndoNum(expVal, el.is3Dec ? 3 : 2) : '-'}
                              </td>
                            );
                          })}
                        </tr>

                        {/* Row 3: Diff. % with Up/Down Indicator */}
                        <tr style={{ height: isDense ? '15px' : '17px' }}>
                          <td style={{ border: 'none', padding: '1px' }}></td>
                          <td style={{ border: 'none', padding: '1px' }}></td>
                          <td style={{ border: 'none', padding: '1px' }}></td>
                          <td style={{ padding: '1px 4px', textAlign: 'center', border: 'none' }}>
                            <div style={{ fontStyle: 'italic', display: 'inline-block', fontSize: isDense ? '6.5pt' : '7pt', color: '#475569' }}>
                              Diff. %
                            </div>
                          </td>
                          {targetElements.map(el => {
                            const actVal = getRowColValue(r, el.key);
                            const expVal = getExpectedColValue(r.standardCode, el.key);
                            const diffPct = getDiffPercentage(actVal, expVal);
                            const isPositive = diffPct !== null && diffPct >= 0;

                            return (
                              <td key={`diff-val-${el.key}`} style={{ textAlign: 'center', fontSize: isDense ? '6.5pt' : '7pt', padding: '1px', border: 'none', whiteSpace: 'nowrap' }}>
                                {diffPct !== null ? (
                                  <span>
                                    <span style={{ color: isPositive ? '#15803d' : '#b91c1c', marginRight: '2px', fontSize: '7pt', verticalAlign: 'middle' }}>
                                      {isPositive ? '▲' : '▼'}
                                    </span>
                                    <span style={{ color: '#000000', fontWeight: 'bold' }}>
                                      {formatIndoNum(diffPct, el.is3Dec ? 3 : 2)}
                                    </span>
                                  </span>
                                ) : (
                                  '-'
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>

            {/* 4. Bottom Signatures Block: Left 2 Boxes & Right 2 Boxes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginTop: isDense ? '12px' : '16px' }}>
              {/* Left Signature Table (Dilaksanakan oleh & Diperiksa oleh) */}
              <table style={{ width: '42%', borderCollapse: 'collapse', border: '1.5px solid #000000' }}>
                <thead>
                  <tr>
                    <th style={{ width: '50%', border: '1px solid #000000', padding: '3px', fontStyle: 'italic', fontSize: '7pt', fontWeight: 'normal', textAlign: 'center' }}>
                      Dilaksanakan oleh,
                    </th>
                    <th style={{ width: '50%', border: '1px solid #000000', padding: '3px', fontStyle: 'italic', fontSize: '7pt', fontWeight: 'normal', textAlign: 'center' }}>
                      Diperiksa oleh,
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #000000', height: signBoxHeight, verticalAlign: 'bottom', textAlign: 'center', paddingBottom: '3px' }}></td>
                    <td style={{ border: '1px solid #000000', height: signBoxHeight, verticalAlign: 'bottom', textAlign: 'center', paddingBottom: '3px' }}></td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000000', padding: '3px', fontSize: '6.5pt', textAlign: 'center', color: '#000000' }}>
                      Foreman Laboratorium
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '3px', fontSize: '6.5pt', textAlign: 'center', color: '#000000' }}>
                      SPV Laboratorium
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Right Signature Table (Disetujui oleh & Diketahui oleh) */}
              <table style={{ width: '42%', borderCollapse: 'collapse', border: '1.5px solid #000000' }}>
                <thead>
                  <tr>
                    <th style={{ width: '50%', border: '1px solid #000000', padding: '3px', fontStyle: 'italic', fontSize: '7pt', fontWeight: 'normal', textAlign: 'center' }}>
                      Disetujui oleh,
                    </th>
                    <th style={{ width: '50%', border: '1px solid #000000', padding: '3px', fontStyle: 'italic', fontSize: '7pt', fontWeight: 'normal', textAlign: 'center' }}>
                      Diketahui oleh,
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #000000', height: signBoxHeight, verticalAlign: 'bottom', textAlign: 'center', paddingBottom: '3px', fontWeight: 'bold', fontSize: '7.5pt', color: '#000000' }}>
                      Tigwa Anggawikara
                    </td>
                    <td style={{ border: '1px solid #000000', height: signBoxHeight, verticalAlign: 'bottom', textAlign: 'center', paddingBottom: '3px', fontWeight: 'bold', fontSize: '7.5pt', color: '#000000' }}>
                      Deni Nugraha Perdiana
                    </td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #000000', padding: '3px', fontSize: '6.5pt', textAlign: 'center', color: '#000000' }}>
                      Sptd. Laboratorium
                    </td>
                    <td style={{ border: '1px solid #000000', padding: '3px', fontSize: '6.5pt', textAlign: 'center', color: '#000000' }}>
                      Preparation & Laboratorium Manager
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );

        return (
          <>
            {/* Absolute Native Print Stylesheet & Container (100% isolates print document) */}
            <div className="xrf-print-only-container">
              <style dangerouslySetInnerHTML={{ __html: `
                @media screen {
                  .xrf-print-only-container {
                    display: none !important;
                  }
                }
                @media print {
                  @page {
                    size: A4 landscape;
                    margin: 8mm 10mm;
                  }
                  html, body {
                    margin: 0 !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                  }
                  /* Remove height & overflow restrictions on SPA root containers so content flows naturally */
                  #root, #root > div, .min-h-screen, div {
                    height: auto !important;
                    min-height: auto !important;
                    overflow: visible !important;
                  }
                  /* Strictly hide UI controls, sidebar, modals, headers & buttons */
                  .no-print-area, header, aside, nav, button, input, select, .lucide, [role="dialog"], .backdrop-blur-xs {
                    display: none !important;
                  }
                  /* Display the official document at 100% full width */
                  .xrf-print-only-container {
                    display: block !important;
                    visibility: visible !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    margin: 0 auto !important;
                    padding: 0 !important;
                    background: #ffffff !important;
                    page-break-inside: avoid !important;
                  }
                  .xrf-print-only-container * {
                    visibility: visible !important;
                  }
                }
              ` }} />

              {renderOfficialContent()}
            </div>

            {/* Interactive On-Screen Print Preview Modal */}
            {showPrintPreviewModal && (
              <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto no-print-area">
                <div className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-3.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-teal-50 dark:bg-teal-950/40 text-teal-600 rounded-xl">
                        <Printer className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          Pratinjau Resmi Lembar Cetak A4 Landscape
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          Template Resmi: DAILY VERIFIKASI SAMPLE STANDARD (TBP / GPS)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setShowPrintPreviewModal(false);
                          setTimeout(() => window.print(), 150);
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <Printer className="w-4 h-4" />
                        Cetak Sekarang (A4 Landscape)
                      </button>
                      <button
                        onClick={() => setShowPrintPreviewModal(false)}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        title="Tutup Pratinjau"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Modal Body: A4 Paper Preview */}
                  <div className="p-4 sm:p-8 overflow-y-auto flex-1 flex justify-center bg-slate-300/80 dark:bg-slate-950">
                    <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-sm shadow-2xl border border-slate-400 w-full max-w-[1050px] min-h-[500px]">
                      {renderOfficialContent()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Modal Quick Paste from Excel */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 no-print-area">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clipboard className="w-4 h-4 text-emerald-500" />
                Paste Data Tabel dari Excel untuk {selectedMatrix} (Ctrl + V)
              </h3>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Salin baris data tabel dari Excel (kolom Ni s/d MnO) lalu tempelkan pada kotak teks di bawah:
            </p>

            <textarea
              rows={8}
              value={rawPastedText}
              onChange={e => setRawPastedText(e.target.value)}
              placeholder="Tempel baris data tabel Excel di sini..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-teal-500 outline-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleApplyPaste()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                Terapkan ke Tabel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
