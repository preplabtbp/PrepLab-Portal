import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BriefcaseMedical, 
  Search, 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  FileSpreadsheet, 
  Share2, 
  Printer, 
  Filter, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Check, 
  X, 
  Building2, 
  Activity, 
  HeartPulse, 
  Pill, 
  Stethoscope, 
  Bed, 
  ChevronRight, 
  Edit3, 
  Trash2, 
  Eye, 
  FileText,
  Sparkles,
  ArrowUpDown,
  Download,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

export interface ClinicVisit {
  id: number;
  nik: string;
  name: string;
  section: string | null;
  department: string | null;
  jabatan: string | null;
  pt: string | null;
  visitDate: string;
  visitTime: string;
  category: string | null;
  reason: string;
  diagnosis: string | null;
  actionTaken: string | null;
  recommendation: string | null;
  doctorOrMedicName: string | null;
  reporterNik: string | null;
  reporterName: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ClinicSummary {
  total: number;
  todayCount: number;
  thisMonthCount: number;
  restingCount: number;
  fitCount: number;
  sectionBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  recommendationBreakdown: Record<string, number>;
  todayStr: string;
}

interface EmployeeMaster {
  nik: string;
  name: string;
  section?: string;
  department?: string;
  jabatan?: string;
  pt?: string;
}

interface ClinicScreenProps {
  inspectorName?: string;
  inspectorNik?: string;
  userPt?: string;
  onNav?: (tab: string) => void;
  onBack?: () => void;
}

const SECTION_OPTIONS = [
  'ALL',
  'Preparation',
  'Laboratory',
  'Maintenance',
  'Quality Assurance',
  'General',
  'HSE / Safety',
  'Admin / HR'
];

const CATEGORY_OPTIONS = [
  'ALL',
  'Keluhan Sakit',
  'Pemeriksaan Rutin / Tensi',
  'Rawat Luka / P3K',
  'Konsultasi Dokter',
  'Pengambilan Obat',
  'Surat Sakit / Izin',
  'Darurat / Fatigue'
];

const RECOMMENDATION_OPTIONS = [
  'ALL',
  'Fit to Work',
  'Istirahat di Mess (1 Hari)',
  'Istirahat di Mess (2-3 Hari)',
  'Rujuk ke RS Luar',
  'Bekerja dengan Batasan',
  'Observasi di Klinik'
];

export function ClinicScreen({ inspectorName = '', inspectorNik = '', userPt = 'TBP', onNav, onBack }: ClinicScreenProps) {
  // State: Visits Data & Summary
  const [visits, setVisits] = useState<ClinicVisit[]>([]);
  const [summary, setSummary] = useState<ClinicSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State: Employee master for autocomplete
  const [employees, setEmployees] = useState<EmployeeMaster[]>([]);

  // State: Filters
  const [dateRangePreset, setDateRangePreset] = useState<'today' | '7days' | 'month' | 'all'>('month');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-01`; // Default first day of current month
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, d.getMonth() + 1, 0).getDate();
    return `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
  });
  const [selectedPt, setSelectedPt] = useState<string>('ALL');
  const [selectedSection, setSelectedSection] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedRecommendation, setSelectedRecommendation] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // State: Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [detailModalVisit, setDetailModalVisit] = useState<ClinicVisit | null>(null);
  const [deleteConfirmVisit, setDeleteConfirmVisit] = useState<ClinicVisit | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields State
  const [formNik, setFormNik] = useState('');
  const [formName, setFormName] = useState('');
  const [formSection, setFormSection] = useState('Preparation');
  const [formDepartment, setFormDepartment] = useState('');
  const [formJabatan, setFormJabatan] = useState('');
  const [formPt, setFormPt] = useState(userPt || 'TBP');
  const [formVisitDate, setFormVisitDate] = useState(() => {
    const d = new Date();
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });
  });
  const [formVisitTime, setFormVisitTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [formCategory, setFormCategory] = useState('Keluhan Sakit');
  const [formReason, setFormReason] = useState('');
  const [formDiagnosis, setFormDiagnosis] = useState('');
  const [formActionTaken, setFormActionTaken] = useState('');
  const [formRecommendation, setFormRecommendation] = useState('Fit to Work');
  const [formDoctorOrMedicName, setFormDoctorOrMedicName] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Autocomplete state
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const employeeDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch Employees for Autocomplete
  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEmployees(data);
        }
      })
      .catch(err => console.error('Failed to load employees for clinic:', err));
  }, []);

  // Fetch Clinic Visits Data
  const fetchVisits = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedSection && selectedSection !== 'ALL') params.append('section', selectedSection);
      if (selectedCategory && selectedCategory !== 'ALL') params.append('category', selectedCategory);
      if (selectedRecommendation && selectedRecommendation !== 'ALL') params.append('recommendation', selectedRecommendation);
      if (selectedPt && selectedPt !== 'ALL') params.append('pt', selectedPt);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/clinic-visits?${params.toString()}`);
      const json = await res.json();
      if (json.status === 'success') {
        setVisits(json.data || []);
        setSummary(json.summary || null);
      } else {
        toast.error(json.message || 'Gagal mengambil data kunjungan klinik');
      }
    } catch (e: any) {
      console.error('Fetch clinic visits error:', e);
      toast.error('Gagal terhubung ke server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [startDate, endDate, selectedSection, selectedCategory, selectedRecommendation, selectedPt]);

  // Handle Preset Date Filters
  const handleDatePreset = (preset: 'today' | '7days' | 'month' | 'all') => {
    setDateRangePreset(preset);
    const now = new Date();
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' });

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' }));
      setEndDate(todayStr);
    } else if (preset === 'month') {
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
      setStartDate(`${y}-${m}-01`);
      setEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Close Autocomplete on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (employeeDropdownRef.current && !employeeDropdownRef.current.contains(e.target as Node)) {
        setIsEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filtered employees for autocomplete
  const filteredEmployees = useMemo(() => {
    if (!employeeSearchTerm.trim()) return employees.slice(0, 10);
    const q = employeeSearchTerm.toLowerCase().trim();
    return employees.filter(e => 
      (e.name || '').toLowerCase().includes(q) || 
      (e.nik || '').toLowerCase().includes(q) ||
      (e.section || '').toLowerCase().includes(q)
    ).slice(0, 12);
  }, [employees, employeeSearchTerm]);

  // Select employee from autocomplete -> AUTOFILL all fields
  const handleSelectEmployee = (emp: EmployeeMaster) => {
    setFormNik(emp.nik);
    setFormName(emp.name);
    setFormSection(emp.section || 'Preparation');
    setFormDepartment(emp.department || '');
    setFormJabatan(emp.jabatan || '');
    if (emp.pt) setFormPt(emp.pt);
    setEmployeeSearchTerm(`${emp.name} (${emp.nik})`);
    setIsEmployeeDropdownOpen(false);
    toast.success(`Data karyawan ${emp.name} berhasil di-autofill!`);
  };

  // Open Create Modal
  const openCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormNik('');
    setFormName('');
    setFormSection('Preparation');
    setFormDepartment('');
    setFormJabatan('');
    setFormPt(userPt || 'TBP');
    const now = new Date();
    setFormVisitDate(now.toLocaleDateString('en-CA', { timeZone: 'Asia/Jayapura' }));
    setFormVisitTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    setFormCategory('Keluhan Sakit');
    setFormReason('');
    setFormDiagnosis('');
    setFormActionTaken('');
    setFormRecommendation('Fit to Work');
    setFormDoctorOrMedicName('');
    setFormNotes('');
    setEmployeeSearchTerm('');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (visit: ClinicVisit) => {
    setIsEditing(true);
    setEditingId(visit.id);
    setFormNik(visit.nik);
    setFormName(visit.name);
    setFormSection(visit.section || 'Preparation');
    setFormDepartment(visit.department || '');
    setFormJabatan(visit.jabatan || '');
    setFormPt(visit.pt || 'TBP');
    setFormVisitDate(visit.visitDate);
    setFormVisitTime(visit.visitTime);
    setFormCategory(visit.category || 'Keluhan Sakit');
    setFormReason(visit.reason);
    setFormDiagnosis(visit.diagnosis || '');
    setFormActionTaken(visit.actionTaken || '');
    setFormRecommendation(visit.recommendation || 'Fit to Work');
    setFormDoctorOrMedicName(visit.doctorOrMedicName || '');
    setFormNotes(visit.notes || '');
    setEmployeeSearchTerm(`${visit.name} (${visit.nik})`);
    setIsFormModalOpen(true);
  };

  // Submit Form (Create / Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNik.trim() || !formName.trim() || !formReason.trim()) {
      toast.error('NIK, Nama Karyawan, dan Alasan Berkunjung wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        nik: formNik.trim(),
        name: formName.trim(),
        section: formSection,
        department: formDepartment,
        jabatan: formJabatan,
        pt: formPt,
        visitDate: formVisitDate,
        visitTime: formVisitTime,
        category: formCategory,
        reason: formReason.trim(),
        diagnosis: formDiagnosis.trim() || null,
        actionTaken: formActionTaken.trim() || null,
        recommendation: formRecommendation,
        doctorOrMedicName: formDoctorOrMedicName.trim() || null,
        reporterNik: inspectorNik || null,
        reporterName: inspectorName || null,
        notes: formNotes.trim() || null
      };

      const url = isEditing && editingId ? `/api/clinic-visits/${editingId}` : '/api/clinic-visits';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();

      if (json.status === 'success') {
        toast.success(isEditing ? 'Laporan kunjungan berhasil diperbarui!' : 'Laporan kunjungan klinik berhasil dicatat!');
        setIsFormModalOpen(false);
        fetchVisits();
      } else {
        toast.error(json.message || 'Gagal menyimpan laporan kunjungan');
      }
    } catch (err: any) {
      console.error('Submit clinic visit error:', err);
      toast.error('Terjadi kesalahan koneksi server');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Visit
  const handleDeleteVisit = async () => {
    if (!deleteConfirmVisit) return;
    try {
      const res = await fetch(`/api/clinic-visits/${deleteConfirmVisit.id}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Data kunjungan klinik berhasil dihapus.');
        setDeleteConfirmVisit(null);
        fetchVisits();
      } else {
        toast.error(json.message || 'Gagal menghapus data');
      }
    } catch (e) {
      toast.error('Gagal menghapus data');
    }
  };

  // Filtered Visits based on realtime search query
  const displayedVisits = useMemo(() => {
    if (!searchQuery.trim()) return visits;
    const q = searchQuery.toLowerCase().trim();
    return visits.filter(v => 
      v.name.toLowerCase().includes(q) ||
      v.nik.toLowerCase().includes(q) ||
      (v.section && v.section.toLowerCase().includes(q)) ||
      (v.reason && v.reason.toLowerCase().includes(q)) ||
      (v.recommendation && v.recommendation.toLowerCase().includes(q)) ||
      (v.category && v.category.toLowerCase().includes(q))
    );
  }, [visits, searchQuery]);

  // Export to CSV
  const handleExportCSV = () => {
    if (displayedVisits.length === 0) {
      toast.info('Tidak ada data kunjungan untuk diekspor.');
      return;
    }

    const headers = ['No', 'Tanggal', 'Jam', 'NIK', 'Nama Karyawan', 'Seksi', 'PT', 'Kategori', 'Alasan / Keluhan', 'Diagnosa', 'Tindakan Medis', 'Rekomendasi', 'Tenaga Medis', 'Catatan'];
    const rows = displayedVisits.map((v, i) => [
      i + 1,
      v.visitDate,
      v.visitTime,
      `"${v.nik}"`,
      `"${v.name}"`,
      `"${v.section || ''}"`,
      v.pt || 'TBP',
      `"${v.category || ''}"`,
      `"${(v.reason || '').replace(/"/g, '""')}"`,
      `"${(v.diagnosis || '').replace(/"/g, '""')}"`,
      `"${(v.actionTaken || '').replace(/"/g, '""')}"`,
      `"${v.recommendation || ''}"`,
      `"${v.doctorOrMedicName || ''}"`,
      `"${(v.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Kunjungan_Klinik_${startDate || 'all'}_sd_${endDate || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('File CSV Rekap Kunjungan Klinik berhasil diunduh!');
  };

  // Copy WhatsApp Summary for Management
  const handleCopyWhatsAppReport = () => {
    if (displayedVisits.length === 0) {
      toast.info('Tidak ada data untuk dibagikan.');
      return;
    }

    const todayStr = summary?.todayStr || new Date().toISOString().split('T')[0];
    const total = displayedVisits.length;
    const resting = displayedVisits.filter(v => (v.recommendation || '').toLowerCase().includes('istirahat') || (v.recommendation || '').toLowerCase().includes('rujuk')).length;
    const fit = total - resting;

    let text = `*🏥 REKAP KUNJUNGAN KLINIK KARYAWAN PREP & LAB*\n`;
    text += `📅 *Periode*: ${startDate || 'Awal'} s/d ${endDate || 'Hari Ini'}\n`;
    text += `🏢 *Seksi Filter*: ${selectedSection}\n`;
    text += `📊 *Total Kunjungan*: ${total} orang\n`;
    text += `✅ *Fit to Work*: ${fit} orang\n`;
    text += `🛌 *Istirahat Mess / Rujuk*: ${resting} orang\n\n`;

    text += `*DAFTAR KUNJUNGAN KLINIK:*\n`;
    displayedVisits.forEach((v, idx) => {
      const isRest = (v.recommendation || '').toLowerCase().includes('istirahat') || (v.recommendation || '').toLowerCase().includes('rujuk');
      const badge = isRest ? '🛌' : '✅';
      text += `${idx + 1}. ${badge} *${v.name}* (${v.nik}) - Seksi: ${v.section || 'General'}\n`;
      text += `   - Tanggal & Jam: ${v.visitDate} (${v.visitTime})\n`;
      text += `   - Keluhan/Alasan: ${v.reason}\n`;
      text += `   - Rekomendasi: ${v.recommendation || 'Fit to Work'}\n`;
      if (v.actionTaken) text += `   - Tindakan: ${v.actionTaken}\n`;
      text += `\n`;
    });

    text += `_Laporan resmi dibuat via Prep & Lab Portal - Sistem Kunjungan Klinik_`;

    navigator.clipboard.writeText(text);
    toast.success('Format Rekap Kunjungan Klinik WhatsApp berhasil disalin ke clipboard!');
  };

  // Print Summary
  const handlePrint = () => {
    window.print();
  };

  // Section badge styles helper - high contrast text
  const getSectionBadgeClass = (sec?: string | null) => {
    const s = (sec || '').toLowerCase();
    if (s.includes('prep')) return 'bg-amber-100 text-slate-950 font-bold border border-amber-300';
    if (s.includes('lab')) return 'bg-indigo-100 text-slate-950 font-bold border border-indigo-300';
    if (s.includes('maint')) return 'bg-orange-100 text-slate-950 font-bold border border-orange-300';
    if (s.includes('qa') || s.includes('quality')) return 'bg-cyan-100 text-slate-950 font-bold border border-cyan-300';
    return 'bg-slate-200 text-slate-950 font-bold border border-slate-300';
  };

  // Recommendation badge styles helper - clear black text on soft pastel
  const getRecommendationBadgeClass = (rec?: string | null) => {
    const r = (rec || '').toLowerCase();
    if (r.includes('istirahat')) return 'bg-amber-100 text-slate-950 border border-amber-400 font-bold';
    if (r.includes('rujuk')) return 'bg-rose-100 text-slate-950 border border-rose-400 font-bold';
    if (r.includes('batasan') || r.includes('observasi')) return 'bg-blue-100 text-slate-950 border border-blue-400 font-bold';
    return 'bg-emerald-100 text-slate-950 border border-emerald-400 font-bold';
  };

  return (
    <div className="min-h-screen pb-16 transition-colors duration-200" style={{ backgroundColor: 'var(--bg-main, #f8fafc)' }}>
      {/* 1. Header Toolbar */}
      <div 
        className="sticky top-[57px] z-20 border-b backdrop-blur-md px-4 sm:px-6 py-3.5 transition-colors"
        style={{
          backgroundColor: 'var(--header-bg, rgba(255, 255, 255, 0.95))',
          borderColor: 'var(--border-main, #cbd5e1)'
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3.5">
          {/* Title & Live Counter */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20 shrink-0">
              <BriefcaseMedical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950">
                  Pelaporan Kunjungan Klinik
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-teal-500/15 text-slate-950 border border-teal-500/30">
                  {summary ? `${summary.todayCount} Hari Ini` : 'Enterprise'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700">
                Pencatatan rekap medis, keluhan kesehatan personil & rekomendasi dokter
              </p>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/25 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Lapor Kunjungan</span>
            </button>

            <button
              type="button"
              onClick={handleCopyWhatsAppReport}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100 text-xs font-bold transition-all cursor-pointer shadow-2xs text-slate-950"
              title="Salin rekap format WhatsApp untuk Morning Meeting"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Kirim WA</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer shadow-2xs text-slate-950"
              title="Ekspor data ke file Excel / CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-700" />
              <span className="hidden sm:inline">Ekspor CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer shadow-2xs text-slate-950"
              title="Cetak ringkasan halaman"
            >
              <Printer className="w-3.5 h-3.5 text-slate-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
        {/* 2. Executive KPI & Analytics Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Kunjungan Bulan Ini */}
          <div 
            className="p-4 rounded-2xl border shadow-xs relative overflow-hidden transition-all"
            style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">Kunjungan Bulan Ini</span>
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-700 flex items-center justify-center font-bold">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-950">
                {summary?.thisMonthCount ?? visits.length}
              </span>
              <span className="text-xs font-black text-teal-800">
                ({summary?.todayCount ?? 0} hari ini)
              </span>
            </div>
            <p className="text-[10px] text-slate-600 font-semibold mt-1">Total kunjungan aktif tercatat</p>
          </div>

          {/* Card 2: Status Istirahat di Mess / Rujukan */}
          <div 
            className="p-4 rounded-2xl border shadow-xs relative overflow-hidden transition-all"
            style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900">Istirahat di Mess</span>
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-700 flex items-center justify-center">
                <Bed className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-950">
                {summary?.restingCount ?? 0}
              </span>
              <span className="text-xs font-bold text-slate-800">
                Karyawan Izin
              </span>
            </div>
            <p className="text-[10px] text-slate-600 font-semibold mt-1">Perlu pemantauan & penggantian shift</p>
          </div>

          {/* Card 3: Fit to Work */}
          <div 
            className="p-4 rounded-2xl border shadow-xs relative overflow-hidden transition-all"
            style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900">Fit to Work</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-700 flex items-center justify-center">
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-950">
                {summary?.fitCount ?? 0}
              </span>
              <span className="text-xs font-bold text-slate-800">
                Lanjut Tugas
              </span>
            </div>
            <p className="text-[10px] text-slate-600 font-semibold mt-1">Diberikan obat & kembali bertugas</p>
          </div>

          {/* Card 4: Seksi Terbanyak Berkunjung */}
          <div 
            className="p-4 rounded-2xl border shadow-xs relative overflow-hidden transition-all"
            style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-900">Seksi Teratas</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-700 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-sm font-black truncate max-w-[170px] text-slate-950">
                {summary && Object.keys(summary.sectionBreakdown).length > 0 
                  ? Object.entries(summary.sectionBreakdown).sort((a, b) => b[1] - a[1])[0][0] 
                  : 'Nihil'}
              </span>
              <span className="text-xs font-black text-indigo-800">
                {summary && Object.keys(summary.sectionBreakdown).length > 0 
                  ? `${Object.entries(summary.sectionBreakdown).sort((a, b) => b[1] - a[1])[0][1]}x` 
                  : ''}
              </span>
            </div>
            <p className="text-[10px] text-slate-600 font-semibold mt-1">Konsentrasi kunjungan tertinggi</p>
          </div>
        </div>

        {/* 3. Filter Bar & Search Controls */}
        <div 
          className="p-3.5 rounded-2xl border shadow-xs space-y-3"
          style={{ backgroundColor: 'var(--card-bg, #ffffff)', borderColor: 'var(--border-main, #e2e8f0)' }}
        >
          {/* Quick Preset Pills & Search */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* Date Range Preset Buttons (Clean Light Container with solid black text) */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/80 border border-slate-300 text-xs shrink-0">
              <button
                type="button"
                onClick={() => handleDatePreset('today')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  dateRangePreset === 'today' 
                    ? 'bg-white text-slate-950 shadow-sm border border-slate-200' 
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('7days')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  dateRangePreset === '7days' 
                    ? 'bg-white text-slate-950 shadow-sm border border-slate-200' 
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
                }`}
              >
                7 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('month')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  dateRangePreset === 'month' 
                    ? 'bg-white text-slate-950 shadow-sm border border-slate-200' 
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => handleDatePreset('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  dateRangePreset === 'all' 
                    ? 'bg-white text-slate-950 shadow-sm border border-slate-200' 
                    : 'text-slate-700 hover:text-slate-950 hover:bg-white/60'
                }`}
              >
                Semua
              </button>
            </div>

            {/* Realtime Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari NIK, Nama Karyawan, Seksi, Keluhan..."
                className="w-full pl-9 pr-8 py-1.5 text-xs rounded-xl border border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-semibold"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Secondary Dropdown Filters: Section, Category, Recommendation, Custom Dates */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 text-xs">
            {/* Seksi Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-slate-900">Seksi:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-950 text-xs font-bold outline-none cursor-pointer"
              >
                {SECTION_OPTIONS.map(s => (
                  <option key={s} value={s}>{s === 'ALL' ? 'Semua Seksi' : s}</option>
                ))}
              </select>
            </div>

            {/* PT Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-slate-900">PT:</span>
              <select
                value={selectedPt}
                onChange={(e) => setSelectedPt(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-950 text-xs font-bold outline-none cursor-pointer"
              >
                <option value="ALL">Semua PT</option>
                <option value="TBP">TBP / GPS</option>
                <option value="GTS">GTS</option>
              </select>
            </div>

            {/* Kategori Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-slate-900">Kategori:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-950 text-xs font-bold outline-none cursor-pointer"
              >
                {CATEGORY_OPTIONS.map(c => (
                  <option key={c} value={c}>{c === 'ALL' ? 'Semua Kategori' : c}</option>
                ))}
              </select>
            </div>

            {/* Rekomendasi Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-black text-slate-900">Rekomendasi:</span>
              <select
                value={selectedRecommendation}
                onChange={(e) => setSelectedRecommendation(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-slate-300 bg-white text-slate-950 text-xs font-bold outline-none cursor-pointer"
              >
                {RECOMMENDATION_OPTIONS.map(r => (
                  <option key={r} value={r}>{r === 'ALL' ? 'Semua Rekomendasi' : r}</option>
                ))}
              </select>
            </div>

            {/* Date Pickers (Custom) */}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[11px] font-black text-slate-900">Rentang:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateRangePreset('all');
                }}
                className="px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white text-slate-950 outline-none font-mono font-bold"
              />
              <span className="text-slate-700 font-bold">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateRangePreset('all');
                }}
                className="px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white text-slate-950 outline-none font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* 4. Main Data Presentation Table */}
        <div 
          className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
        >
          {isLoading ? (
            <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
              <RotateCcw className="w-5 h-5 animate-spin text-teal-600" />
              <span className="font-bold text-slate-900">Memuat data kunjungan klinik...</span>
            </div>
          ) : displayedVisits.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
              <BriefcaseMedical className="w-8 h-8 text-slate-400" />
              <span className="font-black text-slate-950 text-sm">Belum ada catatan kunjungan klinik</span>
              <p className="text-[11px] text-slate-600 font-medium max-w-sm">
                Tidak ada data kunjungan pada filter yang dipilih. Klik tombol <strong>+ Lapor Kunjungan</strong> di atas untuk mencatat data baru.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr 
                    className="border-b border-slate-200 bg-slate-100 font-black uppercase tracking-wider text-[11px] text-slate-950"
                  >
                    <th className="py-3 px-4 w-12 text-center text-slate-950">#</th>
                    <th className="py-3 px-4 text-slate-950">Karyawan</th>
                    <th className="py-3 px-4 text-slate-950">Seksi &amp; PT</th>
                    <th className="py-3 px-4 text-slate-950">Waktu Kunjungan</th>
                    <th className="py-3 px-4 text-slate-950">Alasan &amp; Keluhan</th>
                    <th className="py-3 px-4 text-slate-950">Rekomendasi Dokter</th>
                    <th className="py-3 px-4 text-center w-28 text-slate-950">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedVisits.map((visit, index) => {
                    return (
                      <tr 
                        key={visit.id}
                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                        onClick={() => setDetailModalVisit(visit)}
                      >
                        {/* No */}
                        <td className="py-3 px-4 text-center font-mono text-slate-950 font-bold text-xs">
                          {index + 1}
                        </td>

                        {/* Karyawan (Name, NIK, Jabatan) - crisp black */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
                              {visit.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-slate-950 text-sm leading-tight">
                                {visit.name}
                              </p>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-800 font-mono font-semibold mt-0.5">
                                <span>NIK: {visit.nik}</span>
                                {visit.jabatan && (
                                  <>
                                    <span className="text-slate-400">•</span>
                                    <span className="truncate max-w-[130px] text-slate-700">{visit.jabatan}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Seksi & PT */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${getSectionBadgeClass(visit.section)}`}>
                              {visit.section || 'General'}
                            </span>
                            <span className="text-[11px] font-mono font-bold text-slate-900">
                              {visit.pt || 'TBP'}
                            </span>
                          </div>
                        </td>

                        {/* Waktu Kunjungan */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-950 font-bold font-mono text-xs">
                            <Calendar className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                            <span>{visit.visitDate}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-800 font-mono font-semibold text-[11px] mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                            <span>{visit.visitTime} WIT</span>
                          </div>
                        </td>

                        {/* Alasan & Keluhan */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-200 border border-slate-300 text-slate-950">
                              {visit.category || 'Keluhan Sakit'}
                            </span>
                          </div>
                          <p className="text-slate-950 font-medium text-xs line-clamp-2 leading-relaxed">
                            {visit.reason}
                          </p>
                          {visit.diagnosis && (
                            <p className="text-[11px] text-slate-900 font-semibold mt-0.5 truncate">
                              <span className="font-bold text-teal-800">Diagnosa:</span> {visit.diagnosis}
                            </p>
                          )}
                        </td>

                        {/* Rekomendasi Medis */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border ${getRecommendationBadgeClass(visit.recommendation)}`}>
                            {(visit.recommendation || '').toLowerCase().includes('istirahat') ? (
                              <Bed className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            ) : (visit.recommendation || '').toLowerCase().includes('rujuk') ? (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            )}
                            <span>{visit.recommendation || 'Fit to Work'}</span>
                          </span>
                          {visit.doctorOrMedicName && (
                            <div className="text-[11px] text-slate-800 font-semibold mt-0.5 truncate">
                              Oleh: {visit.doctorOrMedicName}
                            </div>
                          )}
                        </td>

                        {/* Aksi */}
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDetailModalVisit(visit)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer"
                              title="Lihat Rincian Lengkap"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(visit)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Edit Data Kunjungan"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmVisit(visit)}
                              className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Hapus Data Kunjungan"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 5. Modal: Form Catat / Edit Kunjungan Klinik */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="w-full max-w-2xl rounded-2xl border border-slate-300 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-teal-700 flex items-center justify-between bg-gradient-to-r from-teal-600 to-emerald-600 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <BriefcaseMedical className="w-5 h-5 text-white" />
                <div>
                  <h3 className="text-sm font-black tracking-tight leading-tight text-white">
                    {isEditing ? 'Edit Laporan Kunjungan Klinik' : 'Form Pelaporan Kunjungan Klinik Baru'}
                  </h3>
                  <p className="text-[11px] text-teal-100 font-medium">
                    Autofill data NIK &amp; Seksi, pilih kalender &amp; detail alasan kunjungan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-lg text-teal-100 hover:text-white hover:bg-teal-700/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitForm} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Autocomplete Employee Search Field */}
              <div className="space-y-1.5" ref={employeeDropdownRef}>
                <label className="text-xs font-black block text-slate-950">
                  Cari Karyawan (Ketik NIK atau Nama) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={employeeSearchTerm}
                    onChange={(e) => {
                      setEmployeeSearchTerm(e.target.value);
                      setIsEmployeeDropdownOpen(true);
                    }}
                    onFocus={() => setIsEmployeeDropdownOpen(true)}
                    placeholder="Ketik NIK atau nama untuk autofill otomatis..."
                    className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 outline-none focus:border-teal-500 font-bold"
                  />
                  {employeeSearchTerm && (
                    <button
                      type="button"
                      onClick={() => {
                        setEmployeeSearchTerm('');
                        setFormNik('');
                        setFormName('');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Autocomplete Dropdown */}
                  {isEmployeeDropdownOpen && (
                    <div 
                      className="absolute left-0 right-0 top-full mt-1.5 rounded-xl border border-slate-300 bg-white shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-150"
                    >
                      {filteredEmployees.length === 0 ? (
                        <div className="p-3 text-center text-xs text-slate-500 italic font-medium">
                          Tidak ditemukan karyawan dengan kata kunci "{employeeSearchTerm}"
                        </div>
                      ) : (
                        filteredEmployees.map(emp => (
                          <div
                            key={emp.nik}
                            onClick={() => handleSelectEmployee(emp)}
                            className="p-2.5 flex items-center justify-between gap-2 cursor-pointer transition-colors hover:bg-teal-50"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-xs text-slate-950 truncate flex items-center gap-1.5">
                                <span>{emp.name}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-900 font-bold">
                                  {emp.nik}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-700 font-medium flex items-center gap-1.5 mt-0.5">
                                <span>{emp.section || 'General'}</span>
                                <span>•</span>
                                <span>{emp.jabatan || 'Personil'}</span>
                                {emp.pt && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono font-bold text-slate-900">{emp.pt}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-teal-700 font-black">Pilih</span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Autofilled Fields: NIK, Nama, Seksi, PT - Clean Light Card with Crisp Black Text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-100 border border-slate-200">
                <div>
                  <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block mb-1">
                    Nama Karyawan
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nama Lengkap"
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-950 font-bold outline-none shadow-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block mb-1">
                    NIK Karyawan
                  </label>
                  <input
                    type="text"
                    value={formNik}
                    onChange={(e) => setFormNik(e.target.value)}
                    placeholder="Contoh: 04D2..."
                    required
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-950 font-mono font-bold outline-none shadow-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block mb-1">
                    Seksi / Section
                  </label>
                  <select
                    value={formSection}
                    onChange={(e) => setFormSection(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-950 font-bold outline-none shadow-xs cursor-pointer"
                  >
                    {SECTION_OPTIONS.filter(s => s !== 'ALL').map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-900 uppercase tracking-wider block mb-1">
                    Universe / PT
                  </label>
                  <select
                    value={formPt}
                    onChange={(e) => setFormPt(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-950 font-bold outline-none shadow-xs cursor-pointer"
                  >
                    <option value="TBP">TBP / GPS</option>
                    <option value="GTS">GTS</option>
                  </select>
                </div>
              </div>

              {/* Tanggal & Jam Kunjungan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black block text-slate-950 mb-1">
                    Hari / Tanggal Kunjungan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formVisitDate}
                    onChange={(e) => setFormVisitDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-950 outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-black block text-slate-950 mb-1">
                    Jam Kunjungan (WIT) <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="time"
                      value={formVisitTime}
                      onChange={(e) => setFormVisitTime(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-950 outline-none font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        setFormVisitTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
                      }}
                      className="px-3 py-2 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-950 text-xs font-bold transition-colors shrink-0 cursor-pointer"
                      title="Set jam saat ini"
                    >
                      Sekarang
                    </button>
                  </div>
                </div>
              </div>

              {/* Kategori Kunjungan - Soft Light Buttons with Crisp Black Text */}
              <div className="space-y-1.5">
                <label className="text-xs font-black block text-slate-950">
                  Kategori Kunjungan
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {CATEGORY_OPTIONS.filter(c => c !== 'ALL').map(cat => {
                    const isSelected = formCategory === cat;
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setFormCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-teal-600 text-white border-teal-700 shadow-sm ring-2 ring-teal-500/30' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-950 border-slate-300'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Alasan Berkunjung / Keluhan Detail */}
              <div className="space-y-1.5">
                <label className="text-xs font-black block text-slate-950">
                  Alasan Berkunjung &amp; Keluhan Kesehatan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="Deskripsikan alasan berkunjung, gejala atau keluhan yang dirasakan personil (misal: pusing, batuk demam, cek tensi rutin, luka gores, dll)..."
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 outline-none focus:border-teal-500 transition-all font-semibold leading-relaxed"
                />
              </div>

              {/* Rekomendasi Dokter & Diagnosa Medis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="text-xs font-black block text-slate-950 mb-1">
                    Rekomendasi Medis
                  </label>
                  <select
                    value={formRecommendation}
                    onChange={(e) => setFormRecommendation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-950 font-bold outline-none cursor-pointer"
                  >
                    {RECOMMENDATION_OPTIONS.filter(r => r !== 'ALL').map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black block text-slate-950 mb-1">
                    Tenaga Medis / Paramedik (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formDoctorOrMedicName}
                    onChange={(e) => setFormDoctorOrMedicName(e.target.value)}
                    placeholder="Nama Dokter / Perawat pemeriksa..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 outline-none font-semibold"
                  />
                </div>
              </div>

              {/* Tindakan / Obat & Catatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black block text-slate-950 mb-1">
                    Tindakan &amp; Obat yang Diberikan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formActionTaken}
                    onChange={(e) => setFormActionTaken(e.target.value)}
                    placeholder="Misal: Paracetamol 3x1, Betadine, Perban..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 outline-none font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-black block text-slate-950 mb-1">
                    Diagnosa Sementara (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formDiagnosis}
                    onChange={(e) => setFormDiagnosis(e.target.value)}
                    placeholder="Misal: Febris, Vulnus Laceratum, Fatigue..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 outline-none font-semibold"
                  />
                </div>
              </div>

              {/* Catatan Tambahan */}
              <div className="space-y-1">
                <label className="text-xs font-black block text-slate-950">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Keterangan pengawasan shift atau follow-up..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 outline-none font-semibold"
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t flex items-center justify-end gap-2.5 border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-950 text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{isEditing ? 'Simpan Perubahan' : 'Catat Kunjungan'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Modal: Detail Kunjungan Klinik */}
      {detailModalVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="w-full max-w-lg rounded-2xl border border-slate-300 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="px-5 py-3.5 border-b border-teal-700 flex items-center justify-between bg-gradient-to-r from-teal-700 to-emerald-700 text-white">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-white" />
                <h3 className="text-sm font-black text-white">Rincian Kunjungan Klinik</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalVisit(null)}
                className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Employee Header - Clean soft background with crisp black text */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-100 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                    {detailModalVisit.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-950 text-sm">
                      {detailModalVisit.name}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-800 font-bold mt-0.5">
                      NIK: {detailModalVisit.nik} • {detailModalVisit.pt || 'TBP'}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${getSectionBadgeClass(detailModalVisit.section)}`}>
                  {detailModalVisit.section || 'General'}
                </span>
              </div>

              {/* Visit Date & Time */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black text-slate-900 block uppercase">Tanggal Kunjungan</span>
                  <p className="font-black text-slate-950 font-mono text-xs mt-1">
                    {detailModalVisit.visitDate}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-black text-slate-900 block uppercase">Jam Kunjungan</span>
                  <p className="font-black text-slate-950 font-mono text-xs mt-1">
                    {detailModalVisit.visitTime} WIT
                  </p>
                </div>
              </div>

              {/* Category & Reason */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">Alasan &amp; Keluhan</span>
                  <span className="px-2 py-0.5 rounded font-black text-[10px] bg-slate-200 border border-slate-300 text-slate-950">
                    {detailModalVisit.category || 'Keluhan Sakit'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-950 leading-relaxed whitespace-pre-wrap">
                  {detailModalVisit.reason}
                </div>
              </div>

              {/* Medical Assessment & Recommendation */}
              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 space-y-2">
                <span className="text-[11px] font-black text-teal-950 uppercase tracking-wider block">
                  Hasil Pemeriksaan &amp; Rekomendasi
                </span>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${getRecommendationBadgeClass(detailModalVisit.recommendation)}`}>
                    {detailModalVisit.recommendation || 'Fit to Work'}
                  </span>
                </div>

                {detailModalVisit.diagnosis && (
                  <p className="text-xs text-slate-950 font-medium">
                    <strong className="font-bold text-slate-950">Diagnosa:</strong> {detailModalVisit.diagnosis}
                  </p>
                )}

                {detailModalVisit.actionTaken && (
                  <p className="text-xs text-slate-950 font-medium">
                    <strong className="font-bold text-slate-950">Tindakan / Obat:</strong> {detailModalVisit.actionTaken}
                  </p>
                )}

                {detailModalVisit.doctorOrMedicName && (
                  <p className="text-[11px] text-slate-800 font-semibold">
                    <strong className="font-bold text-slate-950">Petugas Medis:</strong> {detailModalVisit.doctorOrMedicName}
                  </p>
                )}
              </div>

              {/* Additional Notes */}
              {detailModalVisit.notes && (
                <div className="text-xs text-slate-950 font-medium p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <strong className="font-bold text-slate-950">Catatan Tambahan:</strong> {detailModalVisit.notes}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="px-5 py-3 border-t flex items-center justify-between border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  const visit = detailModalVisit;
                  setDetailModalVisit(null);
                  openEditModal(visit);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Laporan</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailModalVisit(null)}
                className="px-4 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal: Konfirmasi Hapus Kunjungan */}
      {deleteConfirmVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="w-full max-w-sm rounded-2xl border border-slate-300 bg-white shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-950">Hapus Laporan Kunjungan?</h4>
                <p className="text-xs text-slate-600 font-semibold">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-xs text-slate-950 font-medium bg-slate-50 p-3 rounded-xl border border-slate-200">
              Apakah Anda yakin ingin menghapus catatan kunjungan <strong>{deleteConfirmVisit.name}</strong> ({deleteConfirmVisit.nik}) pada tanggal {deleteConfirmVisit.visitDate}?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmVisit(null)}
                className="px-4 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteVisit}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

