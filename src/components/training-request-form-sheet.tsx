import React, { useState, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  ArrowLeft,
  FileSpreadsheet,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  Users,
  Download,
  X,
  Search,
  RefreshCw,
  CheckSquare,
  Square,
  Printer,
  ShieldCheck,
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

const STORAGE_KEY = 'training_form_permintaan_sheet_v3';

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
    category: 'Training External & Pengawas',
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

function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  } catch (e) {
    // fallback
  }
  return dateStr;
}

export function TrainingRequestFormSheet({ employees = [], canManage = true }: TrainingRequestFormSheetProps) {
  const [sheetData, setSheetData] = useState<TrainingRequestSheetData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.sessions) && parsed.sessions.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load training form sheet data:', e);
    }
    return PHOTO_FORMAT_TEMPLATE;
  });

  // Persist to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sheetData));
    } catch (e) {
      console.warn('Failed to save training form sheet data:', e);
    }
  }, [sheetData]);

  // Session Modal State
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [sessionFormTraining, setSessionFormTraining] = useState('Basic First Aid (BFA)');
  const [sessionFormCustomTraining, setSessionFormCustomTraining] = useState('');
  const [sessionFormDate, setSessionFormDate] = useState('2026-05-30');
  const [sessionFormLocation, setSessionFormLocation] = useState('Training Room Prep & Lab');
  const [sessionFormInstructor, setSessionFormInstructor] = useState('Internal Trainer HSE');

  // Participant Modal State
  const [participantModalOpen, setParticipantModalOpen] = useState(false);
  const [targetSessionIdForParticipant, setTargetSessionIdForParticipant] = useState<string | null>(null);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [pFormNama, setPFormNama] = useState('');
  const [pFormNik, setPFormNik] = useState('');
  const [pFormPt, setPFormPt] = useState('TBP');
  const [pFormDept, setPFormDept] = useState('Prep & Lab');
  const [pFormJabatan, setPFormJabatan] = useState('Crew, Preparation & Laboratory');
  const [pFormGol, setPFormGol] = useState('I');

  // Employee Autocomplete Search
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState('');
  const [showEmployeeSuggestions, setShowEmployeeSuggestions] = useState(false);

  // Batch Select Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchTargetSessionId, setBatchTargetSessionId] = useState<string | null>(null);
  const [batchSearch, setBatchSearch] = useState('');
  const [selectedNiks, setSelectedNiks] = useState<Set<string>>(new Set());

  // Document Control Modal State
  const [docControlModalOpen, setDocControlModalOpen] = useState(false);
  const [tempTitle, setTempTitle] = useState(sheetData.title);
  const [tempDept, setTempDept] = useState(sheetData.department);
  const [tempWeek, setTempWeek] = useState(sheetData.week);
  const [tempDocNumber, setTempDocNumber] = useState(sheetData.docNumber);
  const [tempRequestDate, setTempRequestDate] = useState(sheetData.requestDate);

  // Return to Labnote URL detection
  const returnToUrl = useMemo(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const r = searchParams.get('returnTo');
      return r ? decodeURIComponent(r) : null;
    } catch {
      return null;
    }
  }, []);

  // Compute total participants across all sessions
  const totalParticipants = useMemo(() => {
    return sheetData.sessions.reduce((acc, s) => acc + s.participants.length, 0);
  }, [sheetData.sessions]);

﻿  // Master employees normalized list
  const normalizedEmployees = useMemo(() => {
    const list: EmployeeOption[] = [];
    const seen = new Set<string>();

    if (Array.isArray(employees)) {
      employees.forEach(emp => {
        const nik = (emp.nik || '').trim();
        const name = (emp.name || emp.nama || '').trim();
        if (nik && name && !seen.has(nik)) {
          seen.add(nik);
          list.push({
            nik,
            name,
            jabatan: emp.jabatan || 'Crew, Preparation & Laboratory',
            section: emp.section || emp.bagian || 'Prep & Lab',
            dept: emp.dept || 'Prep & Lab',
            pt: emp.pt || 'TBP',
            gol: emp.gol || 'I',
          });
        }
      });
    }

    if (list.length === 0) {
      return [
        { nik: 'M0407230672', name: 'Ardila Rusli', jabatan: 'Crew, Preparation & Laboratory', section: 'Prep & Lab', dept: 'Prep & Lab', pt: 'TBP', gol: 'I' },
        { nik: 'M0401230050', name: 'Dulmihdat Tomayou', jabatan: 'Crew, Preparation & Laboratory', section: 'Prep & Lab', dept: 'Prep & Lab', pt: 'TBP', gol: 'I' },
        { nik: 'M0412221652', name: 'Suryadi La Samusu', jabatan: 'Crew, Preparation & Laboratory', section: 'Prep & Lab', dept: 'Prep & Lab', pt: 'TBP', gol: 'I' },
        { nik: 'M0407221074', name: 'Abdul Manan R. Day', jabatan: 'Crew, Preparation & Laboratory', section: 'Prep & Lab', dept: 'Prep & Lab', pt: 'TBP', gol: 'I' },
        { nik: 'M0408221190', name: 'Irfan Hidayat', jabatan: 'Operator Crusher', section: 'Crushing Plant', dept: 'Prep & Lab', pt: 'TBP', gol: 'I' },
        { nik: 'M0409221345', name: 'Rahmat Basuki', jabatan: 'Analyst XRF', section: 'Laboratorium', dept: 'Prep & Lab', pt: 'TBP', gol: 'II' },
      ];
    }
    return list;
  }, [employees]);

  // Autocomplete suggestions
  const employeeSuggestions = useMemo(() => {
    if (!employeeSearchQuery.trim()) return [];
    const q = employeeSearchQuery.toLowerCase();
    return normalizedEmployees
      .filter(e => e.name.toLowerCase().includes(q) || e.nik.toLowerCase().includes(q))
      .slice(0, 8);
  }, [normalizedEmployees, employeeSearchQuery]);

  // Filtered employees for batch selector
  const filteredBatchEmployees = useMemo(() => {
    if (!batchSearch.trim()) return normalizedEmployees.slice(0, 60);
    const q = batchSearch.toLowerCase();
    return normalizedEmployees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.nik.toLowerCase().includes(q) ||
      (e.section && e.section.toLowerCase().includes(q))
    ).slice(0, 60);
  }, [normalizedEmployees, batchSearch]);

  // Open Session Modal
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
        setSessionFormDate(s.date || new Date().toISOString().split('T')[0]);
        setSessionFormLocation(s.location || 'Training Room Prep & Lab');
        setSessionFormInstructor(s.instructor || 'Internal Trainer HSE');
        setSessionModalOpen(true);
        return;
      }
    }
    setEditingSessionId(null);
    setSessionFormTraining('Basic First Aid (BFA)');
    setSessionFormCustomTraining('');
    setSessionFormDate(new Date().toISOString().split('T')[0]);
    setSessionFormLocation('Training Room Prep & Lab');
    setSessionFormInstructor('Internal Trainer HSE');
    setSessionModalOpen(true);
  };

  // Save Session
  const handleSaveSession = () => {
    const finalName = sessionFormTraining === '__CUSTOM__'
      ? (sessionFormCustomTraining.trim() || 'Training Kustom')
      : sessionFormTraining;

    if (!finalName) {
      toast.error('Nama program training tidak boleh kosong');
      return;
    }

    if (editingSessionId) {
      setSheetData(prev => ({
        ...prev,
        sessions: prev.sessions.map(s => {
          if (s.id === editingSessionId) {
            return {
              ...s,
              trainingName: finalName,
              date: sessionFormDate,
              location: sessionFormLocation,
              instructor: sessionFormInstructor,
            };
          }
          return s;
        }),
      }));
      toast.success('Sesi training berhasil diperbarui');
    } else {
      const newSession: TrainingRequestSession = {
        id: 'session-' + Date.now(),
        trainingName: finalName,
        date: sessionFormDate,
        location: sessionFormLocation,
        instructor: sessionFormInstructor,
        participants: [],
      };
      setSheetData(prev => ({
        ...prev,
        sessions: [...prev.sessions, newSession],
      }));
      toast.success(`Sesi training "${finalName}" berhasil ditambahkan`);
    }
    setSessionModalOpen(false);
  };

  // Delete Session
  const handleDeleteSession = (sessionId: string) => {
    if (sheetData.sessions.length <= 1) {
      toast.error('Minimal harus ada 1 sesi training di dalam tabel');
      return;
    }
    if (!confirm('Hapus sesi training ini beserta seluruh peserta yang terdaftar?')) return;

    setSheetData(prev => ({
      ...prev,
      sessions: prev.sessions.filter(s => s.id !== sessionId),
    }));
    toast.success('Sesi training telah dihapus');
  };

  // Update session date directly inline
  const handleUpdateSessionDate = (sessionId: string, newDate: string) => {
    setSheetData(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => (s.id === sessionId ? { ...s, date: newDate } : s)),
    }));
    toast.success(`Tanggal training diperbarui: ${formatIndonesianDate(newDate)}`);
  };

  // Open Participant Modal
  const openParticipantModal = (sessionId: string, participantId?: string) => {
    const targetSession = sheetData.sessions.find(s => s.id === sessionId) || sheetData.sessions[0];
    if (!targetSession) {
      toast.error('Sesi training tidak ditemukan');
      return;
    }
    setTargetSessionIdForParticipant(targetSession.id);
    setEmployeeSearchQuery('');
    setShowEmployeeSuggestions(false);

    if (participantId) {
      const p = targetSession.participants.find(x => x.id === participantId);
      if (p) {
        setEditingParticipantId(p.id);
        setPFormNama(p.nama);
        setPFormNik(p.nik);
        setPFormPt(p.pt);
        setPFormDept(p.dept);
        setPFormJabatan(p.jabatan);
        setPFormGol(p.gol);
        setParticipantModalOpen(true);
        return;
      }
    }

    setEditingParticipantId(null);
    setPFormNama('');
    setPFormNik('');
    setPFormPt('TBP');
    setPFormDept('Prep & Lab');
    setPFormJabatan('Crew, Preparation & Laboratory');
    setPFormGol('I');
    setParticipantModalOpen(true);
  };

  // Handle Autocomplete Select
  const handleSelectEmployeeAutocomplete = (emp: EmployeeOption) => {
    setPFormNama(emp.name);
    setPFormNik(emp.nik);
    setPFormPt(emp.pt || 'TBP');
    setPFormDept(emp.dept || 'Prep & Lab');
    setPFormJabatan(emp.jabatan || 'Crew, Preparation & Laboratory');
    setPFormGol(emp.gol || 'I');
    setShowEmployeeSuggestions(false);
    setEmployeeSearchQuery('');
  };

  // Save Participant
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
          if (s.id === targetSessionIdForParticipant) {
            return {
              ...s,
              participants: s.participants.map(p => {
                if (p.id === editingParticipantId) {
                  return {
                    ...p,
                    nama: pFormNama.trim(),
                    nik: pFormNik.trim() || '-',
                    pt: pFormPt.trim() || 'TBP',
                    dept: pFormDept.trim() || 'Prep & Lab',
                    jabatan: pFormJabatan.trim() || 'Crew, Preparation & Laboratory',
                    gol: pFormGol.trim() || 'I',
                  };
                }
                return p;
              }),
            };
          }
          return s;
        }),
      }));
      toast.success('Data peserta berhasil diperbarui');
    } else {
      const newParticipant: RequestParticipant = {
        id: 'p-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        nama: pFormNama.trim(),
        nik: pFormNik.trim() || '-',
        pt: pFormPt.trim() || 'TBP',
        dept: pFormDept.trim() || 'Prep & Lab',
        jabatan: pFormJabatan.trim() || 'Crew, Preparation & Laboratory',
        gol: pFormGol.trim() || 'I',
      };

      setSheetData(prev => ({
        ...prev,
        sessions: prev.sessions.map(s => {
          if (s.id === targetSessionIdForParticipant) {
            return {
              ...s,
              participants: [...s.participants, newParticipant],
            };
          }
          return s;
        }),
      }));
      toast.success(`Peserta "${pFormNama}" berhasil ditambahkan`);
    }

    setParticipantModalOpen(false);
  };

  // Delete Participant
  const handleDeleteParticipant = (sessionId: string, participantId: string) => {
    setSheetData(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => {
        if (s.id === sessionId) {
          return {
            ...s,
            participants: s.participants.filter(p => p.id !== participantId),
          };
        }
        return s;
      }),
    }));
    toast.success('Peserta telah dihapus dari daftar');
  };

  // Open Batch Select Modal
  const openBatchModal = (sessionId: string) => {
    const targetSession = sheetData.sessions.find(s => s.id === sessionId) || sheetData.sessions[0];
    setBatchTargetSessionId(targetSession ? targetSession.id : null);
    setBatchSearch('');
    setSelectedNiks(new Set());
    setBatchModalOpen(true);
  };

  // Save Batch Participants
  const handleSaveBatchParticipants = () => {
    if (!batchTargetSessionId) return;
    if (selectedNiks.size === 0) {
      toast.error('Pilih minimal satu karyawan dari daftar');
      return;
    }

    const currentSession = sheetData.sessions.find(s => s.id === batchTargetSessionId);
    const existingNiks = new Set(currentSession?.participants.map(p => p.nik) || []);

    const newParticipants: RequestParticipant[] = [];
    normalizedEmployees.forEach(emp => {
      if (selectedNiks.has(emp.nik) && !existingNiks.has(emp.nik)) {
        newParticipants.push({
          id: 'p-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
          nama: emp.name,
          nik: emp.nik,
          pt: emp.pt || 'TBP',
          dept: emp.dept || 'Prep & Lab',
          jabatan: emp.jabatan || 'Crew, Preparation & Laboratory',
          gol: emp.gol || 'I',
        });
      }
    });

    if (newParticipants.length === 0) {
      toast.info('Seluruh karyawan yang dipilih sudah terdaftar di sesi training ini');
      setBatchModalOpen(false);
      return;
    }

    setSheetData(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => {
        if (s.id === batchTargetSessionId) {
          return {
            ...s,
            participants: [...s.participants, ...newParticipants],
          };
        }
        return s;
      }),
    }));

    toast.success(`Berhasil menambahkan ${newParticipants.length} peserta ke sesi training`);
    setBatchModalOpen(false);
  };

  // Reset to original Photo Template
  const handleResetToPhotoTemplate = () => {
    if (!confirm('Muat ulang format dan data sesuai contoh tabel foto (Basic First Aid - Week 21)?')) return;
    setSheetData(PHOTO_FORMAT_TEMPLATE);
    toast.success('Format tabel berhasil direset ke contoh foto');
  };

  // Open Document Control Modal
  const openDocControlModal = () => {
    setTempTitle(sheetData.title);
    setTempDept(sheetData.department);
    setTempWeek(sheetData.week);
    setTempDocNumber(sheetData.docNumber);
    setTempRequestDate(sheetData.requestDate);
    setDocControlModalOpen(true);
  };

  // Save Document Control
  const handleSaveDocControl = () => {
    setSheetData(prev => ({
      ...prev,
      title: tempTitle.trim() || 'LIST PESERTA TRAINING 2026',
      department: tempDept.trim() || 'PREPARATION & LABORATORY',
      week: tempWeek.trim() || 'WEEK 21',
      docNumber: tempDocNumber.trim() || 'TBP-PL-TRN-FRM-021',
      requestDate: tempRequestDate.trim() || new Date().toISOString().split('T')[0],
    }));
    setDocControlModalOpen(false);
    toast.success('Pengaturan dokumen berhasil disimpan');
  };

  // Print PDF
  const handlePrint = () => {
    window.print();
  };

  // =========================================================================
  // EXCEL EXPORT 1: ULTRA-PROFESSIONAL EXCEL (.xlsx) WITH MERGES & AUTO-WIDTHS
  // =========================================================================
  const handleExportXLSX = () => {
    if (sheetData.sessions.length === 0) {
      toast.error('Belum ada sesi training untuk diekspor');
      return;
    }

    const wb = XLSX.utils.book_new();
    const aoa: any[][] = [];
    const merges: XLSX.Range[] = [];

    // Row 0: Document Number at Top Right
    aoa.push(['', '', '', '', '', '', '', `No: ${sheetData.docNumber}`, '']);
    merges.push({ s: { r: 0, c: 7 }, e: { r: 0, c: 8 } });

    // Row 1: Document Title (Centered)
    aoa.push([sheetData.title, '', '', '', '', '', '', '', '']);
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } });

    // Row 2: Subheader Banner (Prep & Lab in A3:F3 [6 cols], Week in G3:I3 [3 cols])
    aoa.push([sheetData.department, '', '', '', '', '', sheetData.week, '', '']);
    merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 5 } });
    merges.push({ s: { r: 2, c: 6 }, e: { r: 2, c: 8 } });

    // Row 3: Table Header
    aoa.push([
      'JENIS TRAINING',
      'TANGGAL',
      'NO',
      'NAMA',
      'NIK',
      'PT',
      'DEPT',
      'JABATAN',
      'GOL',
    ]);

    let currentRow = 4;

    sheetData.sessions.forEach(session => {
      const pCount = session.participants.length;
      const formattedDate = formatIndonesianDate(session.date);

      if (pCount === 0) {
        aoa.push([
          session.trainingName,
          formattedDate,
          '-',
          '(Belum ada peserta)',
          '-',
          '-',
          '-',
          '-',
          '-',
        ]);
        currentRow++;
      } else {
        const startR = currentRow;
        session.participants.forEach((p, idx) => {
          aoa.push([
            session.trainingName,
            formattedDate,
            idx + 1,
            p.nama,
            p.nik,
            p.pt,
            p.dept,
            p.jabatan,
            p.gol,
          ]);
          currentRow++;
        });
        const endR = currentRow - 1;

        if (endR > startR) {
          merges.push({ s: { r: startR, c: 0 }, e: { r: endR, c: 0 } });
          merges.push({ s: { r: startR, c: 1 }, e: { r: endR, c: 1 } });
        }
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!merges'] = merges;
    ws['!cols'] = [
      { wch: 26 }, // JENIS TRAINING
      { wch: 22 }, // TANGGAL
      { wch: 6 },  // NO
      { wch: 28 }, // NAMA
      { wch: 16 }, // NIK
      { wch: 8 },  // PT
      { wch: 16 }, // DEPT
      { wch: 34 }, // JABATAN
      { wch: 8 },  // GOL
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'List Peserta Training');
    const safeName = (sheetData.title || 'List_Peserta_Training').replace(/[^a-zA-Z0-9_-]/g, '_');
    XLSX.writeFile(wb, `${safeName}_${Date.now()}.xlsx`);
    toast.success('Excel Standar (.xlsx) berhasil diunduh!');
  };

  // =========================================================================
  // EXCEL EXPORT 2: EXECUTIVE FORMATTED EXCEL WITH EXACT ON-SCREEN STYLING
  // =========================================================================
  const handleExportStyledExcel = () => {
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>List Peserta Training</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                  <x:Print>
                    <x:ValidPrinterInfo/>
                    <x:Orientation>Landscape</x:Orientation>
                  </x:Print>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          .doc-number {
            font-family: Consolas, 'Courier New', monospace;
            font-size: 9pt;
            font-weight: bold;
            color: #64748B;
            text-align: right;
            height: 24px;
            vertical-align: middle;
            padding-right: 6px;
          }
          .main-title {
            font-size: 16pt;
            font-weight: 900;
            text-align: center !important;
            vertical-align: middle !important;
            height: 44px;
            color: #0F172A;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            font-family: Arial, 'Segoe UI', sans-serif;
          }
          .dept-banner {
            background-color: #005FA3 !important;
            color: #FFFFFF !important;
            font-weight: 900;
            font-size: 12pt;
            text-align: center !important;
            vertical-align: middle !important;
            height: 38px;
            border: 1px solid #004578;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .week-banner {
            background-color: #CFD5DB !important;
            color: #0F172A !important;
            font-weight: 900;
            font-size: 12pt;
            text-align: center !important;
            vertical-align: middle !important;
            height: 38px;
            border: 1px solid #94A3B8;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .tbl-header {
            background-color: #A6D785 !important;
            color: #0F172A !important;
            font-weight: 900;
            text-align: center !important;
            vertical-align: middle !important;
            border: 1px solid #475569;
            border-bottom: 2.5px solid #334155;
            height: 36px;
            font-size: 10pt;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .training-col {
            font-weight: 900;
            vertical-align: middle;
            text-align: center;
            background-color: #FFFFFF;
            border: 1px solid #CBD5E1;
            padding: 10px 8px;
            font-size: 10pt;
            color: #0F172A;
          }
          .date-col {
            font-weight: 700;
            vertical-align: middle;
            text-align: center;
            background-color: #FFFFFF;
            border: 1px solid #CBD5E1;
            padding: 10px 8px;
            font-size: 9.5pt;
            color: #1E293B;
          }
          .cell-center {
            text-align: center;
            vertical-align: middle;
            border: 1px solid #CBD5E1;
            padding: 7px 4px;
            font-size: 9.5pt;
            color: #334155;
          }
          .cell-left {
            text-align: left;
            vertical-align: middle;
            border: 1px solid #CBD5E1;
            padding: 7px 10px;
            font-size: 9.5pt;
            color: #0F172A;
          }
          .cell-mono {
            font-family: Consolas, monospace;
            text-align: center;
            vertical-align: middle;
            border: 1px solid #CBD5E1;
            padding: 7px 4px;
            font-size: 9.5pt;
            color: #334155;
            mso-number-format: "\\@";
          }
          .session-border-bottom {
            border-bottom: 2.5px solid #475569 !important;
          }
        </style>
      </head>
      <body>
        <table>
          <!-- ROW 0: DOCUMENT NUMBER -->
          <tr>
            <td colspan="7" style="border: none;"></td>
            <td colspan="2" class="doc-number">No: ${sheetData.docNumber}</td>
          </tr>

          <!-- ROW 1: TITLE BANNER -->
          <tr>
            <td colspan="9" class="main-title">${sheetData.title}</td>
          </tr>
          
          <!-- ROW 2: DEPT & WEEK BANNER (6 cols + 3 cols = 9 cols) -->
          <tr>
            <td colspan="6" class="dept-banner">${sheetData.department}</td>
            <td colspan="3" class="week-banner">${sheetData.week}</td>
          </tr>

          <!-- ROW 3: TABLE HEADERS -->
          <tr>
            <th class="tbl-header" style="width: 170px;">JENIS TRAINING</th>
            <th class="tbl-header" style="width: 145px;">TANGGAL</th>
            <th class="tbl-header" style="width: 45px;">NO</th>
            <th class="tbl-header" style="width: 210px;">NAMA</th>
            <th class="tbl-header" style="width: 115px;">NIK</th>
            <th class="tbl-header" style="width: 60px;">PT</th>
            <th class="tbl-header" style="width: 110px;">DEPT</th>
            <th class="tbl-header" style="width: 250px;">JABATAN</th>
            <th class="tbl-header" style="width: 55px;">GOL</th>
          </tr>
    `;

    sheetData.sessions.forEach(session => {
      const rowCount = Math.max(session.participants.length, 1);
      const formattedDate = formatIndonesianDate(session.date);

      if (session.participants.length === 0) {
        html += `
          <tr>
            <td class="training-col session-border-bottom"><b>${session.trainingName}</b></td>
            <td class="date-col session-border-bottom"><b>${formattedDate}</b></td>
            <td class="cell-center session-border-bottom">-</td>
            <td class="cell-left session-border-bottom" colspan="6" style="color: #64748B; font-style: italic;">Belum ada peserta terdaftar</td>
          </tr>
        `;
      } else {
        session.participants.forEach((p, idx) => {
          const isLastInSession = idx === session.participants.length - 1;
          const borderClass = isLastInSession ? 'session-border-bottom' : '';
          html += `<tr>`;

          if (idx === 0) {
            html += `
              <td rowspan="${rowCount}" class="training-col session-border-bottom"><b>${session.trainingName}</b></td>
              <td rowspan="${rowCount}" class="date-col session-border-bottom"><b>${formattedDate}</b></td>
            `;
          }

          html += `
            <td class="cell-center ${borderClass}"><b>${idx + 1}</b></td>
            <td class="cell-left ${borderClass}"><b>${p.nama}</b></td>
            <td class="cell-mono ${borderClass}">${p.nik}</td>
            <td class="cell-center ${borderClass}"><b>${p.pt}</b></td>
            <td class="cell-left ${borderClass}">${p.dept}</td>
            <td class="cell-left ${borderClass}">${p.jabatan}</td>
            <td class="cell-center ${borderClass}"><b>${p.gol}</b></td>
          </tr>`;
        });
      }
    });

    html += `
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (sheetData.title || 'List_Peserta_Training').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `${safeName}_${Date.now()}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Excel Terformat Resmi (.xls) berhasil diunduh!');
  };

﻿  return (
    <div className="space-y-6 pb-20 print:p-0 print:space-y-4 print:pb-0 font-sans">
      {/* Print CSS */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-border { border: 1px solid #94A3B8 !important; }
          .print-shadow-none { box-shadow: none !important; }
        }
      `}</style>

      {/* TOP CONTROL BAR (NO-PRINT) */}
      <div className="no-print bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full lg:w-auto">
          {returnToUrl && (
            <button
              type="button"
              onClick={() => {
                window.location.href = returnToUrl;
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer mr-1 animate-pulse"
              title="Kembali ke Modul Labnote"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Labnote</span>
            </button>
          )}
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Form Permintaan Training</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                OFFICIAL SHEET
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {sheetData.sessions.length} Sesi Training &bull; {totalParticipants} Total Peserta &bull; {sheetData.week}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
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
            title="Ubah Judul, Departemen, & No. Dokumen"
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

          {/* Single Unified Download Excel Button */}
          <button
            type="button"
            onClick={handleExportStyledExcel}
            title="Download Excel Resmi (Sesuai Tampilan Formulir)"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Excel</span>
          </button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* MAIN DOCUMENT PAPER (CLEAN & TIDY REPLICA OF THE USER PHOTO)      */}
      {/* ================================================================ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm print:shadow-none print:border-none p-6 md:p-8 space-y-6">
        
        {/* Document Title Header */}
        <div className="text-center py-2 relative">
          <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-wider uppercase">
            {sheetData.title}
          </h1>
          <div className="no-print md:absolute md:right-0 md:top-2 text-right mt-1 md:mt-0">
            <span className="text-[11px] font-mono text-slate-500 font-medium">
              No: {sheetData.docNumber}
            </span>
          </div>
        </div>

        {/* The Two-Tone Banner: Preparation & Laboratory (Deep Blue) + Week (Silver) */}
        <div className="rounded-t-xl overflow-hidden border border-slate-300">
          <div className="grid grid-cols-1 md:grid-cols-12 text-sm font-black uppercase tracking-wider">
            <div className="md:col-span-8 bg-[#005FA3] text-white py-3 px-5 flex items-center justify-center text-center shadow-inner">
              <span className="text-sm md:text-base font-black tracking-wide">{sheetData.department}</span>
            </div>
            <div className="md:col-span-4 bg-[#CFD5DB] text-slate-800 py-3 px-5 flex items-center justify-center text-center border-l md:border-l-2 border-white shadow-inner">
              <span className="text-sm md:text-base font-black tracking-wide">{sheetData.week}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#A6D785] text-slate-900 font-extrabold uppercase text-[11px] tracking-wide border-b-2 border-slate-400">
                  <th className="py-3 px-3 text-center align-middle border-r border-slate-300 w-44">JENIS TRAINING</th>
                  <th className="py-3 px-3 text-center align-middle border-r border-slate-300 w-44">TANGGAL</th>
                  <th className="py-3 px-2 text-center align-middle border-r border-slate-300 w-12">NO</th>
                  <th className="py-3 px-4 text-center align-middle border-r border-slate-300">NAMA</th>
                  <th className="py-3 px-3 text-center align-middle border-r border-slate-300 font-mono">NIK</th>
                  <th className="py-3 px-2 text-center align-middle border-r border-slate-300 w-14">PT</th>
                  <th className="py-3 px-3 text-center align-middle border-r border-slate-300">DEPT</th>
                  <th className="py-3 px-4 text-center align-middle border-r border-slate-300">JABATAN</th>
                  <th className="py-3 px-2 text-center align-middle border-r border-slate-300 w-14">GOL</th>
                  <th className="no-print py-3 px-2 text-center align-middle w-16">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 bg-white">
                {sheetData.sessions.map((session) => {
                  const rowCount = Math.max(session.participants.length, 1);
                  return session.participants.length === 0 ? (
                    <tr key={session.id} className="hover:bg-slate-50">
                      {/* Training Name Merged */}
                      <td className="p-4 font-bold text-center border-r border-slate-300 align-middle bg-[#F8FAFC]">
                        <p className="font-extrabold text-slate-900 text-xs">{session.trainingName}</p>
                        <div className="no-print mt-2 flex justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openSessionModal(session.id)}
                            className="p-1 text-slate-400 hover:text-sky-600 rounded transition-colors"
                            title="Edit Sesi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {sheetData.sessions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSession(session.id)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                              title="Hapus Sesi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Tombol Tambah Karyawan Khusus Sesi Ini */}
                        <div className="no-print mt-3 pt-2.5 border-t border-slate-200/90 flex flex-col items-center gap-1.5 w-full">
                          <button
                            type="button"
                            onClick={() => openParticipantModal(session.id)}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-[11px] font-bold shadow-xs hover:shadow transition-all"
                            title={`Tambah Karyawan untuk ${session.trainingName}`}
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>+ Tambah Karyawan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openBatchModal(session.id)}
                            className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1 bg-sky-50 hover:bg-sky-100 active:scale-95 text-sky-700 border border-sky-200/80 rounded-lg text-[10.5px] font-semibold transition-all"
                            title={`Pilih Banyak Karyawan dari Database untuk ${session.trainingName}`}
                          >
                            <Users className="w-3.5 h-3.5 text-sky-600" />
                            <span>Pilih dari Database</span>
                          </button>
                        </div>
                      </td>
                      {/* Date Merged */}
                      <td className="p-4 text-center border-r border-slate-300 align-middle bg-[#F8FAFC]">
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
                      <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                          <span>Belum ada peserta terdaftar untuk sesi ini.</span>
                          <div className="no-print flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openParticipantModal(session.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-bold transition-all"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Tambah Peserta</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openBatchModal(session.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 rounded-lg text-xs font-bold transition-all"
                            >
                              <Users className="w-3.5 h-3.5 text-sky-600" />
                              <span>Pilih Database</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    session.participants.map((p, pIdx) => {
                      const isLastInSession = pIdx === session.participants.length - 1;
                      return (
                      <tr
                        key={p.id}
                        className={`hover:bg-sky-50/40 transition-colors ${isLastInSession ? 'border-b-2 border-slate-300' : ''}`}
                      >
                        {/* Merged Training Cell */}
                        {pIdx === 0 && (
                          <td
                            rowSpan={rowCount}
                            className="p-4 font-bold text-center border-r border-slate-300 bg-white align-middle"
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

                            {/* Tombol Tambahan Karyawan untuk Tiap Training */}
                            <div className="no-print mt-3 pt-2.5 border-t border-slate-200/90 flex flex-col items-center gap-1.5 w-full">
                              <button
                                type="button"
                                onClick={() => openParticipantModal(session.id)}
                                className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg text-[11px] font-bold shadow-xs hover:shadow transition-all"
                                title={`Tambah Karyawan untuk ${session.trainingName}`}
                              >
                                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>+ Tambah Karyawan</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openBatchModal(session.id)}
                                className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1 bg-sky-50 hover:bg-sky-100 active:scale-95 text-sky-700 border border-sky-200/80 rounded-lg text-[10.5px] font-semibold transition-all"
                                title={`Pilih Banyak Karyawan dari Database untuk ${session.trainingName}`}
                              >
                                <Users className="w-3.5 h-3.5 text-sky-600" />
                                <span>Pilih dari Database</span>
                              </button>
                            </div>
                          </td>
                        )}

                        {/* Merged Date Cell */}
                        {pIdx === 0 && (
                          <td
                            rowSpan={rowCount}
                            className="p-4 text-center border-r border-slate-300 bg-white align-middle"
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
                        <td className="py-2.5 px-4 font-bold text-slate-900 border-r border-slate-200">
                          {p.nama}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-700 font-semibold border-r border-slate-200">
                          {p.nik}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-slate-700 border-r border-slate-200">
                          {p.pt}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 border-r border-slate-200">
                          {p.dept}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700 border-r border-slate-200">
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
                    );
                  })
                  );
                })}

              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Multi-Training Button */}
        <div className="no-print flex justify-end">
          <button
            type="button"
            onClick={() => openSessionModal()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Daftarkan Training Lainnya Sekaligus</span>
          </button>
        </div>

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

﻿      {/* ======================================================== */}
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
                  <p className="text-xs text-emerald-200">
                    {sheetData.sessions.find(s => s.id === targetSessionIdForParticipant)?.trainingName ? (
                      <>Untuk Sesi: <span className="font-bold underline text-white">{sheetData.sessions.find(s => s.id === targetSessionIdForParticipant)?.trainingName}</span></>
                    ) : (
                      'Ketik nama/NIK untuk autofill data karyawan'
                    )}
                  </p>
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
              {/* Target Training Session Selection */}
              {sheetData.sessions.length > 1 && (
                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-200">
                  <label className="block text-xs font-bold uppercase text-emerald-900 mb-1">
                    Sesi Training Tujuan
                  </label>
                  <select
                    value={targetSessionIdForParticipant || ''}
                    onChange={(e) => setTargetSessionIdForParticipant(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {sheetData.sessions.map((sess) => (
                      <option key={sess.id} value={sess.id}>
                        {sess.trainingName} ({formatIndonesianDate(sess.date)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                  <p className="text-xs text-sky-200">
                    {sheetData.sessions.find(s => s.id === batchTargetSessionId)?.trainingName ? (
                      <>Untuk Sesi: <span className="font-bold underline text-white">{sheetData.sessions.find(s => s.id === batchTargetSessionId)?.trainingName}</span></>
                    ) : (
                      'Centang beberapa karyawan untuk didaftarkan langsung'
                    )}
                  </p>
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
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto flex-1">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama, NIK, seksi..."
                    value={batchSearch}
                    onChange={(e) => setBatchSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {sheetData.sessions.length > 1 && (
                  <div className="w-full sm:w-auto flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-600 whitespace-nowrap">Training:</span>
                    <select
                      value={batchTargetSessionId || ''}
                      onChange={(e) => setBatchTargetSessionId(e.target.value)}
                      className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 max-w-[200px]"
                    >
                      {sheetData.sessions.map((sess) => (
                        <option key={sess.id} value={sess.id}>
                          {sess.trainingName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
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
      {/* MODAL 4: DOCUMENT SETTINGS (NO SIGNATURES)                */}
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
                  <h3 className="font-bold text-base leading-tight">Pengaturan Dokumen</h3>
                  <p className="text-xs text-sky-200">Atur judul dokumen, departemen, dan periode training</p>
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

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Judul Dokumen</label>
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
                  <label className="block text-xs font-bold uppercase text-slate-700 mb-1">Tanggal Dokumen</label>
                  <input
                    type="date"
                    value={tempRequestDate}
                    onChange={(e) => setTempRequestDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
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
}

export default TrainingRequestFormSheet;
