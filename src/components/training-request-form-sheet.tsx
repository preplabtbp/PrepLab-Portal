import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Users,
  Download,
  Check,
  X,
  Search,
  Building2,
  Sparkles,
  RefreshCw,
  CheckSquare,
  Square,
  Printer,
  ShieldCheck,
  UserCheck,
  FileText,
  BadgeCheck,
  Award,
  Layers,
  ChevronDown,
  LayoutGrid,
  FileCheck,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

export interface RequestParticipant {
  id: string;
  nama: string;
  nik: string;
  pt: string;
  dept: string;
  jabatan: string;
  gol: string;
}

export interface TrainingRequestSession {
  id: string;
  trainingName: string;
  trainingCategory?: string;
  date: string; // YYYY-MM-DD
  location?: string;
  instructor?: string;
  participants: RequestParticipant[];
}

export interface TrainingRequestSheetData {
  title: string;
  department: string;
  week: string;
  docNumber: string;
  requestDate: string;
  preparedBy: string;
  checkedBy: string;
  approvedBy: string;
  sessions: TrainingRequestSession[];
}

export interface EmployeeOption {
  nik: string;
  name: string;
  nama?: string;
  jabatan?: string;
  section?: string;
  bagian?: string;
  dept?: string;
  pt?: string;
  gol?: string;
}

interface TrainingRequestFormSheetProps {
  employees?: EmployeeOption[];
  canManage?: boolean;
}

const STORAGE_KEY = 'training_form_permintaan_sheet_v2';

export const TRAINING_DROPDOWN_OPTIONS = [
  {
    category: 'Training SAP (Internal)',
    items: [
      { id: 'bfa', name: 'Basic First Aid (BFA)', desc: 'Pertolongan Pertama Pada Kecelakaan' },
      { id: 'bs', name: 'Basic Safety (BS)', desc: 'Keselamatan Dasar Tambang & Pabrik' },
      { id: 'hazid', name: 'Hazard Identification (HAZID / HIRA)', desc: 'Identifikasi Bahaya & Penilaian Risiko' },
      { id: 'jsa', name: 'Job Safety Analysis (JSA)', desc: 'Analisis Keselamatan Pekerjaan' },
      { id: 'iut_ott', name: 'Inspeksi Terencana (IUT OTT)', desc: 'Inspeksi & Observasi Tugas Terencana' },
      { id: 'iai', name: 'Incident & Accident Investigation (IAI)', desc: 'Investigasi Insiden & Kecelakaan' },
    ],
  },
  {
    category: 'Training K3 (Internal)',
    items: [
      { id: 'wah', name: 'Working at Height (WAH)', desc: 'Bekerja pada Ketinggian' },
      { id: 'loto', name: 'Lock Out Tag Out (LOTO)', desc: 'Isolasi Energi Berbahaya' },
      { id: 'confined_space', name: 'Confined Space Entry', desc: 'Bekerja di Ruang Terbatas' },
      { id: 'fire_fighting', name: 'Basic Fire Fighting', desc: 'Pemadaman Kebakaran Dasar' },
    ],
  },
  {
    category: 'Sertifikasi & Pengawas',
    items: [
      { id: 'pra_pop', name: 'Training Pra POP (Internal)', desc: 'Persiapan Pengawas Operasional Pertama' },
      { id: 'pop', name: 'Pengawas Operasional Pertama (POP)', desc: 'Sertifikasi Pengawas Pertama BNSP/KESDM' },
      { id: 'pom', name: 'Pengawas Operasional Madya (POM)', desc: 'Sertifikasi Pengawas Madya BNSP/KESDM' },
      { id: 'k3_kimia', name: 'K3 Kimia (Ahli / Petugas)', desc: 'Keselamatan Bahan Kimia Laboratorium' },
      { id: 'k3_listrik', name: 'Teknisi K3 Listrik', desc: 'Sertifikasi K3 Kelistrikan' },
      { id: 'iso_17025', name: 'ISO/IEC 17025 : 2017', desc: 'Kompetensi Laboratorium Pengujian & Kalibrasi' },
      { id: 'proteksi_radiasi', name: 'Petugas Proteksi Radiasi (PPR)', desc: 'Sertifikasi Keselamatan Radiasi BAPETEN' },
      { id: 'juru_las', name: 'Juru Las Kelas 3', desc: 'Sertifikasi Pengelasan Kemnaker' },
    ],
  },
];

export const PHOTO_FORMAT_TEMPLATE: TrainingRequestSheetData = {
  title: 'LIST PESERTA TRAINING 2026',
  department: 'PREPARATION & LABORATORY',
  week: 'WEEK 21',
  docNumber: 'TBP-PL-TRN-FRM-021',
  requestDate: '2026-05-25',
  preparedBy: 'Admin / Section Head Prep & Lab',
  checkedBy: 'HSE Training Officer',
  approvedBy: 'Superintendent Preparation & Laboratory',
  sessions: [
    {
      id: 'session-photo-bfa',
      trainingName: 'Basic First Aid (BFA)',
      trainingCategory: 'Training SAP (Internal)',
      date: '2026-05-30',
      location: 'Training Room Prep & Lab',
      instructor: 'Internal Trainer HSE',
      participants: [
        {
          id: 'p-1',
          nama: 'Ardila Rusli',
          nik: 'M0407230672',
          pt: 'TBP',
          dept: 'Prep & Lab',
          jabatan: 'Crew, Preparation & Laboratory',
          gol: 'I',
        },
        {
          id: 'p-2',
          nama: 'Dulmihdat Tomayou',
          nik: 'M0401230050',
          pt: 'TBP',
          dept: 'Prep & Lab',
          jabatan: 'Crew, Preparation & Laboratory',
          gol: 'I',
        },
        {
          id: 'p-3',
          nama: 'Suryadi La Samusu',
          nik: 'M0412221652',
          pt: 'TBP',
          dept: 'Prep & Lab',
          jabatan: 'Crew, Preparation & Laboratory',
          gol: 'I',
        },
        {
          id: 'p-4',
          nama: 'Abdul Manan R. Day',
          nik: 'M0407221074',
          pt: 'TBP',
          dept: 'Prep & Lab',
          jabatan: 'Crew, Preparation & Laboratory',
          gol: 'I',
        },
      ],
    },
  ],
};

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr || !dateStr.includes('-')) return dateStr || '-';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length !== 3) return dateStr;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  const dt = new Date(y, m - 1, d);
  const dayName = INDO_DAYS[dt.getDay()] || '';
  const monthName = INDO_MONTHS[m - 1] || '';
  return `${dayName}, ${d} ${monthName} ${y}`;
}
export function TrainingRequestFormSheet({ employees = [], canManage = true }: TrainingRequestFormSheetProps) {
  const [sheetData, setSheetData] = useState<TrainingRequestSheetData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.sessions)) return parsed;
      }
    } catch {}
    return PHOTO_FORMAT_TEMPLATE;
  });

  // Tampilan: 'official' (Formulir Resmi Eksekutif) atau 'matrix' (Matriks Tabel Lapangan Sesuai Foto)
  const [viewMode, setViewMode] = useState<'official' | 'matrix'>('official');

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sheetData));
    } catch {}
  }, [sheetData]);

  // Session Modal State
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionFormTraining, setSessionFormTraining] = useState('Basic First Aid (BFA)');
  const [sessionFormCustomTraining, setSessionFormCustomTraining] = useState('');
  const [sessionFormDate, setSessionFormDate] = useState('2026-05-30');
  const [sessionFormLocation, setSessionFormLocation] = useState('Training Room Prep & Lab');
  const [sessionFormInstructor, setSessionFormInstructor] = useState('Internal Trainer HSE');

  // Single Participant Modal State
  const [participantModalOpen, setParticipantModalOpen] = useState(false);
  const [targetSessionIdForParticipant, setTargetSessionIdForParticipant] = useState<string | null>(null);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [pFormNama, setPFormNama] = useState('');
  const [pFormNik, setPFormNik] = useState('');
  const [pFormPt, setPFormPt] = useState('TBP');
  const [pFormDept, setPFormDept] = useState('Prep & Lab');
  const [pFormJabatan, setPFormJabatan] = useState('Crew, Preparation & Laboratory');
  const [pFormGol, setPFormGol] = useState('I');

  // Autocomplete search
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);

  // Batch Select Modal
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchTargetSessionId, setBatchTargetSessionId] = useState<string | null>(null);
  const [batchSearch, setBatchSearch] = useState('');
  const [selectedNiks, setSelectedNiks] = useState<Set<string>>(new Set());

  // Quick edit modal for Document Control
  const [docControlModalOpen, setDocControlModalOpen] = useState(false);
  const [tempTitle, setTempTitle] = useState(sheetData.title);
  const [tempDept, setTempDept] = useState(sheetData.department);
  const [tempWeek, setTempWeek] = useState(sheetData.week);
  const [tempDocNumber, setTempDocNumber] = useState(sheetData.docNumber);
  const [tempRequestDate, setTempRequestDate] = useState(sheetData.requestDate);
  const [tempPreparedBy, setTempPreparedBy] = useState(sheetData.preparedBy);
  const [tempCheckedBy, setTempCheckedBy] = useState(sheetData.checkedBy);
  const [tempApprovedBy, setTempApprovedBy] = useState(sheetData.approvedBy);

  const totalSessions = sheetData.sessions.length;
  const totalParticipants = useMemo(() => {
    return sheetData.sessions.reduce((acc, s) => acc + s.participants.length, 0);
  }, [sheetData.sessions]);

  const normalizedEmployees = useMemo(() => {
    const list: EmployeeOption[] = [];
    const seen = new Set<string>();
    employees.forEach(e => {
      const nik = (e.nik || '').trim().toUpperCase();
      if (!nik || seen.has(nik)) return;
      seen.add(nik);
      list.push({
        nik,
        name: e.name || e.nama || '',
        jabatan: e.jabatan || 'Crew, Preparation & Laboratory',
        section: e.section || e.bagian || e.dept || 'Prep & Lab',
        dept: e.dept || e.section || e.bagian || 'Prep & Lab',
        pt: e.pt || 'TBP',
        gol: e.gol || 'I',
      });
    });
    return list;
  }, [employees]);

  const employeeSuggestions = useMemo(() => {
    if (!employeeSearchQuery.trim()) return [];
    const q = employeeSearchQuery.toLowerCase();
    return normalizedEmployees
      .filter(e => e.name.toLowerCase().includes(q) || e.nik.toLowerCase().includes(q))
      .slice(0, 8);
  }, [normalizedEmployees, employeeSearchQuery]);

  const filteredBatchEmployees = useMemo(() => {
    if (!batchSearch.trim()) return normalizedEmployees.slice(0, 60);
    const q = batchSearch.toLowerCase();
    return normalizedEmployees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.nik.toLowerCase().includes(q) ||
      (e.jabatan && e.jabatan.toLowerCase().includes(q)) ||
      (e.section && e.section.toLowerCase().includes(q))
    ).slice(0, 60);
  }, [normalizedEmployees, batchSearch]);

  const openSessionModal = (sessionId?: string) => {
    if (sessionId) {
      const s = sheetData.sessions.find(x => x.id === sessionId);
      if (s) {
        setEditingSessionId(s.id);
        const isStandard = TRAINING_DROPDOWN_OPTIONS.some(cat => cat.items.some(i => i.name === s.trainingName));
        if (isStandard) {
          setSessionFormTraining(s.trainingName);
          setSessionFormCustomTraining('');
        } else {
          setSessionFormTraining('__CUSTOM__');
          setSessionFormCustomTraining(s.trainingName);
        }
        setSessionFormDate(s.date || '2026-05-30');
        setSessionFormLocation(s.location || 'Training Room Prep & Lab');
        setSessionFormInstructor(s.instructor || 'Internal Trainer HSE');
      }
    } else {
      setEditingSessionId(null);
      setSessionFormTraining('Basic First Aid (BFA)');
      setSessionFormCustomTraining('');
      setSessionFormDate(new Date().toLocaleDateString('en-CA'));
      setSessionFormLocation('Training Room Prep & Lab');
      setSessionFormInstructor('Internal Trainer HSE');
    }
    setSessionModalOpen(true);
  };

  const handleSaveSession = () => {
    const finalName = sessionFormTraining === '__CUSTOM__'
      ? sessionFormCustomTraining.trim()
      : sessionFormTraining;

    if (!finalName) {
      toast.error('Pilih atau masukkan nama training');
      return;
    }
    if (!sessionFormDate) {
      toast.error('Tentukan tanggal training');
      return;
    }

    if (editingSessionId) {
      setSheetData(prev => ({
        ...prev,
        sessions: prev.sessions.map(s => {
          if (s.id !== editingSessionId) return s;
          return {
            ...s,
            trainingName: finalName,
            date: sessionFormDate,
            location: sessionFormLocation.trim(),
            instructor: sessionFormInstructor.trim(),
          };
        }),
      }));
      toast.success('Sesi training diperbarui');
    } else {
      const newSession: TrainingRequestSession = {
        id: 'session-' + Date.now(),
        trainingName: finalName,
        date: sessionFormDate,
        location: sessionFormLocation.trim(),
        instructor: sessionFormInstructor.trim(),
        participants: [],
      };
      setSheetData(prev => ({
        ...prev,
        sessions: [...prev.sessions, newSession],
      }));
      toast.success('Sesi training baru ditambahkan');
    }
    setSessionModalOpen(false);
  };

  const handleDeleteSession = (sessionId: string) => {
    if (!confirm('Hapus sesi training ini beserta seluruh peserta yang terdaftar?')) return;
    setSheetData(prev => ({
      ...prev,
      sessions: prev.sessions.filter(s => s.id !== sessionId),
    }));
    toast.success('Sesi training dihapus');
  };

  const handleUpdateSessionDate = (sessionId: string, newDate: string) => {
    setSheetData(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => s.id === sessionId ? { ...s, date: newDate } : s),
    }));
    toast.success(`Tanggal training diperbarui: ${formatIndonesianDate(newDate)}`);
  };
  const openParticipantModal = (sessionId: string, participantId?: string) => {
    setTargetSessionIdForParticipant(sessionId);
    setEmployeeSearchQuery('');
    setShowEmployeeSuggestions(false);

    if (participantId) {
      const session = sheetData.sessions.find(s => s.id === sessionId);
      const p = session?.participants.find(x => x.id === participantId);
      if (p) {
        setEditingParticipantId(p.id);
        setPFormNama(p.nama);
        setPFormNik(p.nik);
        setPFormPt(p.pt);
        setPFormDept(p.dept);
        setPFormJabatan(p.jabatan);
        setPFormGol(p.gol);
      }
    } else {
      setEditingParticipantId(null);
      setPFormNama('');
      setPFormNik('');
      setPFormPt('TBP');
      setPFormDept(sheetData.department || 'Prep & Lab');
      setPFormJabatan('Crew, Preparation & Laboratory');
      setPFormGol('I');
    }
    setParticipantModalOpen(true);
  };

  const handleSelectEmployeeAutocomplete = (emp: EmployeeOption) => {
    setPFormNama(emp.name);
    setPFormNik(emp.nik);
    setPFormPt(emp.pt || 'TBP');
    setPFormDept(emp.dept || emp.section || 'Prep & Lab');
    setPFormJabatan(emp.jabatan || 'Crew, Preparation & Laboratory');
    setPFormGol(emp.gol || 'I');
    setShowEmployeeSuggestions(false);
    setEmployeeSearchQuery('');
  };

  const handleSaveParticipant = () => {
    if (!targetSessionIdForParticipant) return;
    if (!pFormNama.trim()) {
      toast.error('Nama peserta wajib diisi');
      return;
    }

    if (editingParticipantId) {
      setSheetData(prev => ({
        ...prev,
        sessions: prev.sessions.map(s => {
          if (s.id !== targetSessionIdForParticipant) return s;
          return {
            ...s,
            participants: s.participants.map(p => {
              if (p.id !== editingParticipantId) return p;
              return {
                ...p,
                nama: pFormNama.trim(),
                nik: pFormNik.trim().toUpperCase(),
                pt: pFormPt.trim().toUpperCase() || 'TBP',
                dept: pFormDept.trim() || 'Prep & Lab',
                jabatan: pFormJabatan.trim() || 'Crew, Preparation & Laboratory',
                gol: pFormGol.trim() || 'I',
              };
            }),
          };
        }),
      }));
      toast.success('Data peserta diperbarui');
    } else {
      const newParticipant: RequestParticipant = {
        id: 'p-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        nama: pFormNama.trim(),
        nik: pFormNik.trim().toUpperCase(),
        pt: pFormPt.trim().toUpperCase() || 'TBP',
        dept: pFormDept.trim() || 'Prep & Lab',
        jabatan: pFormJabatan.trim() || 'Crew, Preparation & Laboratory',
        gol: pFormGol.trim() || 'I',
      };
      setSheetData(prev => ({
        ...prev,
        sessions: prev.sessions.map(s => {
          if (s.id !== targetSessionIdForParticipant) return s;
          return {
            ...s,
            participants: [...s.participants, newParticipant],
          };
        }),
      }));
      toast.success('Peserta ditambahkan');
    }
    setParticipantModalOpen(false);
  };

  const handleDeleteParticipant = (sessionId: string, participantId: string) => {
    setSheetData(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          participants: s.participants.filter(p => p.id !== participantId),
        };
      }),
    }));
    toast.success('Peserta dihapus dari daftar');
  };

  const openBatchModal = (sessionId: string) => {
    setBatchTargetSessionId(sessionId);
    setBatchSearch('');
    setSelectedNiks(new Set());
    setBatchModalOpen(true);
  };

  const toggleSelectNik = (nik: string) => {
    setSelectedNiks(prev => {
      const next = new Set(prev);
      if (next.has(nik)) next.delete(nik);
      else next.add(nik);
      return next;
    });
  };

  const handleSaveBatchParticipants = () => {
    if (!batchTargetSessionId) return;
    if (selectedNiks.size === 0) {
      toast.error('Pilih setidaknya satu karyawan');
      return;
    }

    const session = sheetData.sessions.find(s => s.id === batchTargetSessionId);
    if (!session) return;

    const existingNiks = new Set(session.participants.map(p => p.nik.toUpperCase()));
    const newParticipants: RequestParticipant[] = [];

    normalizedEmployees.forEach(emp => {
      if (selectedNiks.has(emp.nik) && !existingNiks.has(emp.nik)) {
        newParticipants.push({
          id: 'p-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          nama: emp.name,
          nik: emp.nik,
          pt: emp.pt || 'TBP',
          dept: emp.dept || emp.section || 'Prep & Lab',
          jabatan: emp.jabatan || 'Crew, Preparation & Laboratory',
          gol: emp.gol || 'I',
        });
      }
    });

    setSheetData(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => {
        if (s.id !== batchTargetSessionId) return s;
        return {
          ...s,
          participants: [...s.participants, ...newParticipants],
        };
      }),
    }));

    toast.success(`${newParticipants.length} peserta ditambahkan sekaligus`);
    setBatchModalOpen(false);
  };

  const handleResetToPhotoTemplate = () => {
    if (!confirm('Muat ulang format dan data sesuai foto contoh (Basic First Aid - Week 21)?')) return;
    setSheetData(PHOTO_FORMAT_TEMPLATE);
    toast.success('Format sesuai foto berhasil dimuat!');
  };

  const openDocControlModal = () => {
    setTempTitle(sheetData.title);
    setTempDept(sheetData.department);
    setTempWeek(sheetData.week);
    setTempDocNumber(sheetData.docNumber);
    setTempRequestDate(sheetData.requestDate);
    setTempPreparedBy(sheetData.preparedBy);
    setTempCheckedBy(sheetData.checkedBy);
    setTempApprovedBy(sheetData.approvedBy);
    setDocControlModalOpen(true);
  };

  const handleSaveDocControl = () => {
    setSheetData(prev => ({
      ...prev,
      title: tempTitle.trim() || 'LIST PESERTA TRAINING 2026',
      department: tempDept.trim() || 'PREPARATION & LABORATORY',
      week: tempWeek.trim() || 'WEEK 21',
      docNumber: tempDocNumber.trim() || 'TBP-PL-TRN-FRM-021',
      requestDate: tempRequestDate.trim() || new Date().toISOString().split('T')[0],
      preparedBy: tempPreparedBy.trim() || 'Admin / Section Head Prep & Lab',
      checkedBy: tempCheckedBy.trim() || 'HSE Training Officer',
      approvedBy: tempApprovedBy.trim() || 'Superintendent Preparation & Laboratory',
    }));
    setDocControlModalOpen(false);
    toast.success('Pengaturan & Informasi Dokumen diperbarui!');
  };

  const handlePrint = () => {
    window.print();
  };
  const handleExportXLSX = () => {
    if (sheetData.sessions.length === 0) {
      toast.error('Belum ada sesi training untuk diekspor');
      return;
    }

    const wb = XLSX.utils.book_new();
    const aoa: any[][] = [];

    // Header Formal Dokumen
    aoa.push(['PT TRIMEGAH BANGUN PERSADA Tbk - HARITA NICKEL']);
    aoa.push([sheetData.title]);
    aoa.push([`No. Dokumen: ${sheetData.docNumber}`, '', '', '', `Tanggal Pengajuan: ${formatIndonesianDate(sheetData.requestDate)}`]);
    aoa.push(['']);
    aoa.push([`DEPARTEMEN: ${sheetData.department}`, '', '', `PERIODE: ${sheetData.week}`, '', '', '', '', '']);
    aoa.push(['']);

    // Header Tabel
    aoa.push([
      'JENIS TRAINING',
      'TANGGAL',
      'NO',
      'NAMA PESERTA',
      'NIK',
      'PT',
      'DEPARTEMEN',
      'JABATAN',
      'GOL'
    ]);

    const merges: XLSX.Range[] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // PT name
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Title
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, // Doc No
      { s: { r: 2, c: 4 }, e: { r: 2, c: 8 } }, // Date
      { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } }, // Dept
      { s: { r: 4, c: 3 }, e: { r: 4, c: 8 } }, // Week
    ];

    let currentRow = 7;

    sheetData.sessions.forEach(session => {
      const count = session.participants.length > 0 ? session.participants.length : 1;
      const startRow = currentRow;
      const endRow = currentRow + count - 1;

      if (count > 1) {
        merges.push({ s: { r: startRow, c: 0 }, e: { r: endRow, c: 0 } });
        merges.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } });
      }

      if (session.participants.length === 0) {
        aoa.push([
          session.trainingName,
          formatIndonesianDate(session.date),
          '-',
          '(Belum ada peserta)',
          '-',
          '-',
          '-',
          '-',
          '-'
        ]);
        currentRow++;
      } else {
        session.participants.forEach((p, idx) => {
          aoa.push([
            idx === 0 ? session.trainingName : '',
            idx === 0 ? formatIndonesianDate(session.date) : '',
            idx + 1,
            p.nama,
            p.nik,
            p.pt,
            p.dept,
            p.jabatan,
            p.gol
          ]);
          currentRow++;
        });
      }
    });

    // Formal Approval Block in Excel
    aoa.push(['']);
    aoa.push(['']);
    const signRow = currentRow + 2;
    aoa.push(['LEMBAR PERSETUJUAN & OTORISASI']);
    aoa.push(['Diajukan Oleh (Pemohon):', '', 'Diperiksa Oleh (HSE/K3):', '', '', 'Disetujui Oleh (Superintendent):', '', '', '']);
    aoa.push(['']);
    aoa.push(['']);
    aoa.push([sheetData.preparedBy, '', sheetData.checkedBy, '', '', sheetData.approvedBy, '', '', '']);
    aoa.push(['Tgl: ' + formatIndonesianDate(sheetData.requestDate), '', 'Tgl: ........................', '', '', 'Tgl: ........................', '', '', '']);

    merges.push(
      { s: { r: signRow, c: 0 }, e: { r: signRow, c: 8 } },
      { s: { r: signRow + 1, c: 0 }, e: { r: signRow + 1, c: 1 } },
      { s: { r: signRow + 1, c: 2 }, e: { r: signRow + 1, c: 4 } },
      { s: { r: signRow + 1, c: 5 }, e: { r: signRow + 1, c: 8 } },
      { s: { r: signRow + 4, c: 0 }, e: { r: signRow + 4, c: 1 } },
      { s: { r: signRow + 4, c: 2 }, e: { r: signRow + 4, c: 4 } },
      { s: { r: signRow + 4, c: 5 }, e: { r: signRow + 4, c: 8 } },
      { s: { r: signRow + 5, c: 0 }, e: { r: signRow + 5, c: 1 } },
      { s: { r: signRow + 5, c: 2 }, e: { r: signRow + 5, c: 4 } },
      { s: { r: signRow + 5, c: 5 }, e: { r: signRow + 5, c: 8 } }
    );

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 30 }, // JENIS TRAINING
      { wch: 24 }, // TANGGAL
      { wch: 6 },  // NO
      { wch: 28 }, // NAMA
      { wch: 16 }, // NIK
      { wch: 10 }, // PT
      { wch: 18 }, // Dept
      { wch: 34 }, // JABATAN
      { wch: 8 },  // GOL
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'PERMINTAAN TRAINING');
    const fileName = `Form_Permintaan_Training_${sheetData.department.replace(/[^a-zA-Z0-9]/g, '_')}_${sheetData.week.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success('File Excel Resmi (.xlsx) berhasil diunduh!');
  };

  const handleExportStyledExcel = () => {
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; }
          .corp-title { font-size: 11pt; color: #555555; text-align: center; font-weight: bold; }
          .title { font-size: 16pt; font-weight: bold; text-align: center; height: 35px; color: #1E293B; }
          .meta-info { font-size: 9pt; color: #64748B; padding: 4px; }
          .dept-banner { background-color: #005FA3; color: #FFFFFF; font-weight: bold; font-size: 12pt; text-align: center; height: 32px; vertical-align: middle; }
          .week-banner { background-color: #CFD5DB; color: #000000; font-weight: bold; font-size: 12pt; text-align: center; height: 32px; vertical-align: middle; }
          .tbl-header { background-color: #A6D785; color: #000000; font-weight: bold; font-style: italic; text-align: center; border: 1px solid #7FA860; height: 28px; }
          .cell-data { border: 1px solid #D0D0D0; padding: 6px 8px; font-size: 10pt; }
          .cell-center { text-align: center; }
          .cell-bold { font-weight: bold; }
          .training-col { font-weight: bold; vertical-align: middle; text-align: center; background-color: #FAFAFA; }
          .date-col { vertical-align: middle; text-align: center; background-color: #FAFAFA; }
          .sign-box { border: 1px solid #CBD5E1; padding: 12px; text-align: center; height: 70px; vertical-align: top; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="9" class="corp-title">PT TRIMEGAH BANGUN PERSADA Tbk - HARITA NICKEL</td></tr>
          <tr><td colspan="9" class="title">${sheetData.title}</td></tr>
          <tr>
            <td colspan="4" class="meta-info">No. Dokumen: <b>${sheetData.docNumber}</b></td>
            <td colspan="5" class="meta-info" style="text-align: right;">Tanggal: <b>${formatIndonesianDate(sheetData.requestDate)}</b></td>
          </tr>
          <tr><td colspan="9" style="height: 6px;"></td></tr>
          <tr>
            <td colspan="3" class="dept-banner">${sheetData.department}</td>
            <td colspan="6" class="week-banner">${sheetData.week}</td>
          </tr>
          <tr>
            <th class="tbl-header" style="width: 220px;">JENIS TRAINING</th>
            <th class="tbl-header" style="width: 180px;">TANGGAL</th>
            <th class="tbl-header" style="width: 45px;">NO</th>
            <th class="tbl-header" style="width: 200px;">NAMA</th>
            <th class="tbl-header" style="width: 120px;">NIK</th>
            <th class="tbl-header" style="width: 80px;">PT</th>
            <th class="tbl-header" style="width: 120px;">Dept</th>
            <th class="tbl-header" style="width: 240px;">JABATAN</th>
            <th class="tbl-header" style="width: 60px;">GOL</th>
          </tr>
    `;

    sheetData.sessions.forEach(session => {
      const pList = session.participants;
      const count = pList.length > 0 ? pList.length : 1;

      if (pList.length === 0) {
        html += `
          <tr>
            <td class="cell-data training-col">${session.trainingName}</td>
            <td class="cell-data date-col">${formatIndonesianDate(session.date)}</td>
            <td class="cell-data cell-center">-</td>
            <td class="cell-data cell-center">(Belum ada peserta)</td>
            <td class="cell-data cell-center">-</td>
            <td class="cell-data cell-center">-</td>
            <td class="cell-data cell-center">-</td>
            <td class="cell-data">-</td>
            <td class="cell-data cell-center">-</td>
          </tr>
        `;
      } else {
        pList.forEach((p, idx) => {
          html += '<tr>';
          if (idx === 0) {
            html += `<td rowspan="${count}" class="cell-data training-col">${session.trainingName}</td>`;
            html += `<td rowspan="${count}" class="cell-data date-col">${formatIndonesianDate(session.date)}</td>`;
          }
          html += `
            <td class="cell-data cell-center">${idx + 1}</td>
            <td class="cell-data cell-bold">${p.nama}</td>
            <td class="cell-data cell-center">${p.nik}</td>
            <td class="cell-data cell-center">${p.pt}</td>
            <td class="cell-data cell-center">${p.dept}</td>
            <td class="cell-data">${p.jabatan}</td>
            <td class="cell-data cell-center cell-bold">${p.gol}</td>
          </tr>`;
        });
      }
    });

    html += `
          <tr><td colspan="9" style="height: 20px;"></td></tr>
          <tr><td colspan="9" style="font-weight: bold; font-size: 11pt; border-bottom: 2px solid #005FA3;">LEMBAR OTORISASI & PERSETUJUAN</td></tr>
          <tr>
            <td colspan="3" class="sign-box"><b>Diajukan Oleh:</b><br><br><br><b>${sheetData.preparedBy}</b><br><span style="font-size: 8pt; color: #64748B;">Pemohon / Section Head</span></td>
            <td colspan="3" class="sign-box"><b>Diperiksa Oleh:</b><br><br><br><b>${sheetData.checkedBy}</b><br><span style="font-size: 8pt; color: #64748B;">HSE / Training Specialist</span></td>
            <td colspan="3" class="sign-box"><b>Disetujui Oleh:</b><br><br><br><b>${sheetData.approvedBy}</b><br><span style="font-size: 8pt; color: #64748B;">Superintendent Preparation & Lab</span></td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Form_Permintaan_Training_Resmi_${Date.now()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Excel Terformat Warna (.xls) berhasil diunduh!');
  };

  return (
    <div className="space-y-6 pb-20 print:p-0 print:space-y-4 print:pb-0 font-sans">
      {/* Print-specific CSS */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-border { border: 1px solid #94A3B8 !important; }
          .print-shadow-none { box-shadow: none !important; }
        }
      `}</style>

      {/* TOP CONTROLS & ACTION BAR (NO-PRINT) */}
      <div className="no-print bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Form Permintaan Training</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200">
                ENTERPRISE SHEET
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {sheetData.sessions.length} Sesi Training &bull; {totalParticipants} Total Peserta &bull; {sheetData.week}
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setViewMode('official')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'official'
                ? 'bg-white text-sky-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>Formulir Resmi</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              viewMode === 'matrix'
                ? 'bg-white text-sky-700 shadow-sm border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Format Matriks Foto</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          <button
            type="button"
            onClick={() => openSessionModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Sesi Training</span>
          </button>

          <button
            type="button"
            onClick={openDocControlModal}
            title="Ubah No Dokumen & Otorisasi"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-300 transition-all"
          >
            <ShieldCheck className="w-4 h-4 text-sky-600" />
            <span>Pengaturan Dokumen</span>
          </button>

          <button
            type="button"
            onClick={handleResetToPhotoTemplate}
            title="Kembalikan ke Contoh Format Foto"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border border-slate-200 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handlePrint}
            title="Cetak Formulir / Simpan PDF"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print PDF</span>
          </button>

          {/* Export Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleExportXLSX}
              title="Download Excel Standard (.xlsx)"
              className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={handleExportStyledExcel}
              title="Download Excel Berwarna Lengkap Tanda Tangan (.xls)"
              className="flex items-center gap-1 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Excel Warna</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN DOCUMENT CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm print:shadow-none print:border-none p-6 md:p-8 space-y-6">
        
        {/* FORMAL CORPORATE LETTERHEAD & DOCUMENT CONTROL BOX */}
        <div className="border-b-2 border-slate-800 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Logo / Company Info */}
            <div className="md:col-span-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-900 to-sky-900 flex items-center justify-center text-white font-black text-lg shadow-md tracking-wider">
                TBP
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 tracking-tight leading-tight">
                  PT TRIMEGAH BANGUN PERSADA TBK
                </h3>
                <p className="text-[11px] font-semibold text-sky-700 tracking-wide uppercase">
                  Harita Nickel &bull; Mineral & Lab Div
                </p>
                <p className="text-[10px] text-slate-500">
                  Site Pulau Obi, Halmahera Selatan
                </p>
              </div>
            </div>

            {/* Document Title Center */}
            <div className="md:col-span-5 text-center">
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase">
                {sheetData.title}
              </h1>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                DEPARTEMEN: <span className="text-sky-800 font-bold">{sheetData.department.toUpperCase()}</span> &bull; <span className="text-emerald-700 font-bold">{sheetData.week.toUpperCase()}</span>
              </p>
            </div>

            {/* Document Control Box */}
            <div className="md:col-span-3">
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-[11px] space-y-1 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">No. Dokumen:</span>
                  <span className="font-bold text-slate-800 font-mono text-[10px]">{sheetData.docNumber}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Tgl Pengajuan:</span>
                  <span className="font-semibold text-slate-700">{formatIndonesianDate(sheetData.requestDate)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-[10px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    TEREGISTRASI
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VIEW MODE 1: OFFICIAL FORM VIEW */}
        {viewMode === 'official' && (
          <div className="space-y-8">
            {sheetData.sessions.map((session, sIdx) => (
              <div
                key={session.id}
                className="border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white"
              >
                {/* Session Header Bar */}
                <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-300 font-extrabold text-xs flex items-center justify-center">
                      #{sIdx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-base tracking-wide text-white">
                          {session.trainingName}
                        </h3>
                        <button
                          type="button"
                          onClick={() => openSessionModal(session.id)}
                          className="no-print p-1 text-slate-400 hover:text-white rounded transition-colors"
                          title="Edit Info Sesi"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-sky-400" />
                          {session.location || 'Training Room Prep & Lab'}
                        </span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Award className="w-3.5 h-3.5 text-teal-400" />
                          Instruktur: {session.instructor || 'HSE Internal'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Date Control & Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/20 px-3 py-1.5 rounded-lg text-xs">
                      <Calendar className="w-4 h-4 text-sky-300" />
                      <span className="font-semibold text-white">{formatIndonesianDate(session.date)}</span>
                      <input
                        type="date"
                        value={session.date}
                        onChange={(e) => handleUpdateSessionDate(session.id, e.target.value)}
                        className="no-print ml-1 bg-transparent text-white border-b border-white/40 focus:border-white focus:outline-none text-[11px] cursor-pointer"
                        title="Klik untuk ubah tanggal training"
                      />
                    </div>

                    <div className="no-print flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openParticipantModal(session.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Peserta</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openBatchModal(session.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
                        title="Pilih banyak dari database karyawan"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Database</span>
                      </button>
                      {sheetData.sessions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(session.id)}
                          className="p-1.5 text-red-400 hover:text-red-200 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Hapus Sesi Training"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Participants Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <th className="py-2.5 px-3 text-center w-12">NO</th>
                        <th className="py-2.5 px-4">NAMA PESERTA</th>
                        <th className="py-2.5 px-3 font-mono">NIK</th>
                        <th className="py-2.5 px-3 text-center">PT</th>
                        <th className="py-2.5 px-3">DEPT</th>
                        <th className="py-2.5 px-4">JABATAN</th>
                        <th className="py-2.5 px-3 text-center">GOL</th>
                        <th className="no-print py-2.5 px-3 text-center w-20">AKSI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {session.participants.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400">
                            <p className="font-medium text-xs">Belum ada peserta terdaftar untuk sesi training ini.</p>
                            <button
                              type="button"
                              onClick={() => openParticipantModal(session.id)}
                              className="mt-2 text-sky-600 hover:text-sky-700 font-bold text-xs underline"
                            >
                              + Daftarkan Peserta Pertama
                            </button>
                          </td>
                        </tr>
                      ) : (
                        session.participants.map((p, idx) => (
                          <tr key={p.id} className="hover:bg-sky-50/50 transition-colors group">
                            <td className="py-2.5 px-3 text-center font-bold text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {p.nama.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-bold text-slate-900 group-hover:text-sky-900">
                                  {p.nama}
                                </span>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 font-semibold">{p.nik}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">{p.pt}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-600">{p.dept}</td>
                            <td className="py-2.5 px-4 text-slate-700">{p.jabatan}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                                {p.gol}
                              </span>
                            </td>
                            <td className="no-print py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openParticipantModal(session.id, p.id)}
                                  className="p-1 text-slate-400 hover:text-sky-600 rounded transition-colors"
                                  title="Edit Data Peserta"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteParticipant(session.id, p.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                  title="Hapus Peserta"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Inline Add Footer */}
                <div className="no-print bg-slate-50 px-4 py-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => openParticipantModal(session.id)}
                    className="flex items-center gap-1.5 font-bold text-sky-700 hover:text-sky-900 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris Peserta</span>
                  </button>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Total: {session.participants.length} Peserta
                  </span>
                </div>
              </div>
            ))}

            {/* Add Session Button */}
            <div className="no-print pt-2">
              <button
                type="button"
                onClick={() => openSessionModal()}
                className="w-full py-3 border-2 border-dashed border-sky-300 hover:border-sky-500 rounded-2xl bg-sky-50/50 hover:bg-sky-50 text-sky-700 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>+ Daftarkan Training Lainnya Sekaligus (Multi-Training Session)</span>
              </button>
            </div>

            {/* FORMAL SIGNATURE / AUTHORIZATION BLOCK */}
            <div className="border border-slate-300 rounded-2xl p-5 bg-slate-50/80">
              <h4 className="text-xs font-extrabold uppercase text-slate-700 tracking-wider mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-700" />
                <span>Lembar Otorisasi & Persetujuan Form Permintaan Training</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Diajukan */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Diajukan Oleh:</p>
                  <div className="my-6">
                    <span className="inline-block px-3 py-1 bg-sky-50 text-sky-700 rounded-full text-[10px] font-bold border border-sky-200">
                      Pemohon / Section Head
                    </span>
                  </div>
                  <p className="font-extrabold text-sm text-slate-900 underline decoration-slate-300 decoration-2 underline-offset-4">
                    {sheetData.preparedBy}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Section Head Preparation & Lab</p>
                </div>

                {/* 2. Diperiksa */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Diperiksa Oleh:</p>
                  <div className="my-6">
                    <span className="inline-block px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-[10px] font-bold border border-amber-200">
                      Training Specialist / HSE
                    </span>
                  </div>
                  <p className="font-extrabold text-sm text-slate-900 underline decoration-slate-300 decoration-2 underline-offset-4">
                    {sheetData.checkedBy}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">HSE Training & Development</p>
                </div>

                {/* 3. Disetujui */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Disetujui Oleh:</p>
                  <div className="my-6">
                    <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold border border-emerald-200">
                      Superintendent
                    </span>
                  </div>
                  <p className="font-extrabold text-sm text-slate-900 underline decoration-slate-300 decoration-2 underline-offset-4">
                    {sheetData.approvedBy}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Superintendent Prep & Lab</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW MODE 2: MATRIX TABLE VIEW (EXACT ENHANCED REPLICA OF USER PHOTO) */}
        {viewMode === 'matrix' && (
          <div className="space-y-6">
            <div className="border border-slate-300 rounded-xl overflow-hidden shadow-sm bg-white">
              {/* Photo Title Header */}
              <div className="py-3 text-center bg-white border-b border-slate-300">
                <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-wider uppercase">
                  {sheetData.title}
                </h2>
              </div>

              {/* Subheader: Preparation & Laboratory (Deep Blue) + Week (Silver) */}
              <div className="grid grid-cols-1 md:grid-cols-12 text-sm font-black uppercase tracking-wider">
                <div className="md:col-span-8 bg-[#005FA3] text-white py-2.5 px-4 flex items-center justify-between">
                  <span>{sheetData.department}</span>
                </div>
                <div className="md:col-span-4 bg-[#CFD5DB] text-slate-800 py-2.5 px-4 flex items-center justify-center border-l md:border-l-2 border-white">
                  <span>{sheetData.week}</span>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#A6D785] text-slate-900 font-extrabold uppercase text-[11px] tracking-wide border-b-2 border-slate-400">
                      <th className="py-2.5 px-3 text-center border-r border-slate-300 w-44">JENIS TRAINING</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-300 w-40">TANGGAL</th>
                      <th className="py-2.5 px-2 text-center border-r border-slate-300 w-10">NO</th>
                      <th className="py-2.5 px-3 border-r border-slate-300">NAMA</th>
                      <th className="py-2.5 px-3 text-center border-r border-slate-300 font-mono">NIK</th>
                      <th className="py-2.5 px-2 text-center border-r border-slate-300">PT</th>
                      <th className="py-2.5 px-3 border-r border-slate-300">Dept</th>
                      <th className="py-2.5 px-3 border-r border-slate-300">JABATAN</th>
                      <th className="py-2.5 px-2 text-center border-r border-slate-300">GOL</th>
                      <th className="no-print py-2.5 px-2 text-center w-16">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {sheetData.sessions.map((session, sIdx) => {
                      const rowCount = Math.max(session.participants.length, 1);
                      return session.participants.length === 0 ? (
                        <tr key={session.id} className="hover:bg-slate-50">
                          {/* Training Name Merged */}
                          <td className="p-3 font-bold text-center border-r border-slate-300 align-middle">
                            <p className="font-extrabold text-slate-900">{session.trainingName}</p>
                            <div className="no-print mt-2 flex justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => openSessionModal(session.id)}
                                className="p-1 text-slate-400 hover:text-sky-600 rounded"
                                title="Edit Sesi"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              {sheetData.sessions.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSession(session.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded"
                                  title="Hapus Sesi"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                          {/* Date Merged */}
                          <td className="p-3 text-center border-r border-slate-300 align-middle">
                            <span className="font-bold text-slate-800 text-[11px] block">
                              {formatIndonesianDate(session.date)}
                            </span>
                            <input
                              type="date"
                              value={session.date}
                              onChange={(e) => handleUpdateSessionDate(session.id, e.target.value)}
                              className="no-print mt-1.5 text-[10px] border border-slate-300 rounded px-1.5 py-0.5 bg-white text-slate-700 mx-auto block cursor-pointer"
                            />
                          </td>
                          <td colSpan={8} className="p-4 text-center text-slate-400 italic">
                            Belum ada peserta terdaftar.
                            <button
                              type="button"
                              onClick={() => openParticipantModal(session.id)}
                              className="no-print ml-2 text-sky-600 font-bold hover:underline"
                            >
                              + Tambah Peserta
                            </button>
                          </td>
                        </tr>
                      ) : (
                        session.participants.map((p, pIdx) => (
                          <tr key={p.id} className="hover:bg-sky-50/40 transition-colors">
                            {/* Merged Training Cell */}
                            {pIdx === 0 && (
                              <td
                                rowSpan={rowCount}
                                className="p-3 font-bold text-center border-r border-slate-300 bg-white align-middle"
                              >
                                <p className="font-extrabold text-slate-900 text-xs">{session.trainingName}</p>
                                <div className="no-print mt-2 flex justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openSessionModal(session.id)}
                                    className="p-1 text-slate-400 hover:text-sky-600 rounded transition-colors"
                                    title="Edit Sesi Training"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  {sheetData.sessions.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSession(session.id)}
                                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                      title="Hapus Sesi Training"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}

                            {/* Merged Date Cell */}
                            {pIdx === 0 && (
                              <td
                                rowSpan={rowCount}
                                className="p-3 text-center border-r border-slate-300 bg-white align-middle"
                              >
                                <span className="font-bold text-slate-800 text-[11px] block">
                                  {formatIndonesianDate(session.date)}
                                </span>
                                <input
                                  type="date"
                                  value={session.date}
                                  onChange={(e) => handleUpdateSessionDate(session.id, e.target.value)}
                                  className="no-print mt-1.5 text-[10px] border border-slate-300 rounded px-1.5 py-0.5 bg-white text-slate-700 mx-auto block cursor-pointer"
                                />
                              </td>
                            )}

                            {/* Participant Columns */}
                            <td className="py-2.5 px-2 text-center font-bold text-slate-600 border-r border-slate-200">
                              {pIdx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-200">
                              {p.nama}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600 font-semibold border-r border-slate-200">
                              {p.nik}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-slate-700 border-r border-slate-200">
                              {p.pt}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 border-r border-slate-200">
                              {p.dept}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">
                              {p.jabatan}
                            </td>
                            <td className="py-2.5 px-2 text-center font-bold text-slate-700 border-r border-slate-200">
                              {p.gol}
                            </td>
                            <td className="no-print py-2.5 px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openParticipantModal(session.id, p.id)}
                                  className="p-1 text-slate-400 hover:text-sky-600 rounded transition-colors"
                                  title="Edit Peserta"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteParticipant(session.id, p.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                  title="Hapus Peserta"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      );
                    })}

                    {/* Bottom Inline Action Row */}
                    <tr className="no-print bg-slate-50 border-t-2 border-slate-200 font-medium">
                      <td colSpan={2} className="py-2.5 px-3 border-r border-slate-300 text-center">
                        <span className="text-[11px] text-slate-500 font-bold uppercase">Aksi Tabel</span>
                      </td>
                      <td colSpan={8} className="py-2.5 px-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => openParticipantModal(sheetData.sessions[0]?.id || '')}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Tambah Kolom Peserta</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openBatchModal(sheetData.sessions[0]?.id || '')}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold transition-all shadow-sm"
                          >
                            <Users className="w-3.5 h-3.5 text-sky-600" />
                            <span>Pilih Banyak dari Database Karyawan</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Multi-Training Button */}
            <div className="no-print flex justify-end">
              <button
                type="button"
                onClick={() => openSessionModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Daftarkan Training Lainnya Sekaligus</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER NOTIFICATION (NO-PRINT) */}
      <div className="no-print flex items-center justify-between text-xs text-slate-500 px-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Perubahan otomatis tersimpan ke browser (Local Storage)</span>
        </div>
        <div>
          <span>Formulir Terstandarisasi Sistem PrepLab</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT TRAINING SESSION                      */}
      {/* ======================================================== */}
      {sessionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/20 rounded-lg text-sky-300">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {editingSessionId ? 'Edit Sesi Training' : 'Tambah Sesi Training Baru'}
                  </h3>
                  <p className="text-xs text-slate-300">Konfigurasi materi & jadwal pelaksanaan training</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSessionModalOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Pilih Program Training <span className="text-red-500">*</span>
                </label>
                <select
                  value={sessionFormTraining}
                  onChange={(e) => setSessionFormTraining(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {TRAINING_DROPDOWN_OPTIONS.map((cat, i) => (
                    <optgroup key={i} label={cat.category}>
                      {cat.items.map((item, j) => (
                        <option key={j} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="__CUSTOM__">-- Tulis Judul Training Lainnya (Kustom) --</option>
                </select>
              </div>

              {sessionFormTraining === '__CUSTOM__' && (
                <div className="animate-in fade-in duration-150">
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                    Nama Training Kustom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Refreshment SOP XRF Automation"
                    value={sessionFormCustomTraining}
                    onChange={(e) => setSessionFormCustomTraining(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Tanggal Pelaksanaan <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={sessionFormDate}
                  onChange={(e) => setSessionFormDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Format tampilan: <span className="font-bold text-sky-700">{formatIndonesianDate(sessionFormDate)}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Lokasi Training</label>
                  <input
                    type="text"
                    value={sessionFormLocation}
                    onChange={(e) => setSessionFormLocation(e.target.value)}
                    placeholder="Ruang Training Lab"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Instruktur / Trainer</label>
                  <input
                    type="text"
                    value={sessionFormInstructor}
                    onChange={(e) => setSessionFormInstructor(e.target.value)}
                    placeholder="Trainer Internal"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSessionModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSession}
                className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                {editingSessionId ? 'Simpan Perubahan' : 'Tambahkan Sesi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: ADD / EDIT PARTICIPANT                           */}
      {/* ======================================================== */}
      {participantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-200">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    {editingParticipantId ? 'Edit Data Peserta' : 'Tambah Peserta Training'}
                  </h3>
                  <p className="text-xs text-emerald-200">Ketik nama/NIK untuk autofill data karyawan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setParticipantModalOpen(false)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Autocomplete Search */}
              <div className="relative">
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1.5">
                  Cari Karyawan dari Database (Opsional)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Ketik nama atau NIK karyawan..."
                    value={employeeSearchQuery}
                    onChange={(e) => {
                      setEmployeeSearchQuery(e.target.value);
                      setShowEmployeeSuggestions(true);
                    }}
                    onFocus={() => setShowEmployeeSuggestions(true)}
                    className="w-full pl-9 pr-3 py-2 bg-sky-50/50 border border-sky-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {showEmployeeSuggestions && employeeSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {employeeSuggestions.map((emp) => (
                      <div
                        key={emp.nik}
                        onClick={() => handleSelectEmployeeAutocomplete(emp)}
                        className="p-2.5 hover:bg-sky-50 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">{emp.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            NIK: {emp.nik} &bull; {emp.section}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                          PILIH
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pFormNama}
                    onChange={(e) => setPFormNama(e.target.value)}
                    placeholder="Nama peserta..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                    NIK <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={pFormNik}
                    onChange={(e) => setPFormNik(e.target.value)}
                    placeholder="M04..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Perusahaan (PT)</label>
                  <input
                    type="text"
                    value={pFormPt}
                    onChange={(e) => setPFormPt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Departemen</label>
                  <input
                    type="text"
                    value={pFormDept}
                    onChange={(e) => setPFormDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Golongan (GOL)</label>
                  <input
                    type="text"
                    value={pFormGol}
                    onChange={(e) => setPFormGol(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-center font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Jabatan</label>
                  <input
                    type="text"
                    value={pFormJabatan}
                    onChange={(e) => setPFormJabatan(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setParticipantModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveParticipant}
                className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                {editingParticipantId ? 'Simpan Data' : 'Tambah Peserta'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: BATCH EMPLOYEE SELECT FROM DATABASE              */}
      {/* ======================================================== */}
      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-sky-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/20 rounded-lg text-sky-200">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">
                    Pilih Peserta Sekaligus dari Database Karyawan
                  </h3>
                  <p className="text-xs text-sky-200">Centang beberapa karyawan untuk didaftarkan langsung</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBatchModalOpen(false)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter & Batch Controls */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama, NIK, seksi..."
                  value={batchSearch}
                  onChange={(e) => setBatchSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    const allNiks = new Set<string>();
                    filteredBatchEmployees.forEach(e => allNiks.add(e.nik));
                    setSelectedNiks(allNiks);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200"
                >
                  Pilih Semua ({filteredBatchEmployees.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNiks(new Set())}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Employee List */}
            <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 max-h-96">
              {filteredBatchEmployees.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Tidak ada karyawan yang cocok dengan pencarian "{batchSearch}".
                </div>
              ) : (
                filteredBatchEmployees.map((emp) => {
                  const isChecked = selectedNiks.has(emp.nik);
                  return (
                    <div
                      key={emp.nik}
                      onClick={() => {
                        const next = new Set(selectedNiks);
                        if (isChecked) next.delete(emp.nik);
                        else next.add(emp.nik);
                        setSelectedNiks(next);
                      }}
                      className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                        isChecked ? 'bg-sky-50/80 border border-sky-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sky-600">
                          {isChecked ? (
                            <CheckSquare className="w-5 h-5 text-sky-600" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{emp.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            NIK: {emp.nik} &bull; {emp.section || 'Prep & Lab'} &bull; GOL: {emp.gol || 'I'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {emp.jabatan || 'Crew'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                {selectedNiks.size} Karyawan Dipilih
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBatchModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={selectedNiks.size === 0}
                  onClick={handleSaveBatchParticipants}
                  className="px-5 py-2 bg-sky-700 hover:bg-sky-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  Tambahkan {selectedNiks.size} Peserta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: DOCUMENT CONTROL & AUTHORIZATIONS                */}
      {/* ======================================================== */}
      {docControlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/20 rounded-lg text-sky-200">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight">Pengaturan Dokumen & Otorisasi</h3>
                  <p className="text-xs text-sky-200">Atur nomor dokumen, periode, dan pihak penandatangan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDocControlModalOpen(false)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Judul Formulir</label>
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => setTempTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Departemen</label>
                  <input
                    type="text"
                    value={tempDept}
                    onChange={(e) => setTempDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Week / Periode</label>
                  <input
                    type="text"
                    value={tempWeek}
                    onChange={(e) => setTempWeek(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Nomor Dokumen</label>
                  <input
                    type="text"
                    value={tempDocNumber}
                    onChange={(e) => setTempDocNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Tanggal Pengajuan</label>
                  <input
                    type="date"
                    value={tempRequestDate}
                    onChange={(e) => setTempRequestDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3 space-y-3">
                <p className="text-xs font-extrabold uppercase text-slate-800 tracking-wider">
                  Daftar Pihak Pengesahan (Otorisasi)
                </p>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    1. Diajukan Oleh (Pemohon / Section Head)
                  </label>
                  <input
                    type="text"
                    value={tempPreparedBy}
                    onChange={(e) => setTempPreparedBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    2. Diperiksa Oleh (Training Specialist / HSE)
                  </label>
                  <input
                    type="text"
                    value={tempCheckedBy}
                    onChange={(e) => setTempCheckedBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    3. Disetujui Oleh (Superintendent Prep & Lab)
                  </label>
                  <input
                    type="text"
                    value={tempApprovedBy}
                    onChange={(e) => setTempApprovedBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDocControlModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveDocControl}
                className="px-5 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Simpan Konfigurasi
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TrainingRequestFormSheet;
