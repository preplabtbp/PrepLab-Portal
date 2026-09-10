import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  FileText, Send, Paperclip, Download, Eye, CheckCircle2, Clock,
  Users, AlertTriangle, ShieldCheck, ShieldAlert, Filter, Search, Sparkles, Pin, 
  MessageSquare, ChevronRight, Share2, RefreshCw, ExternalLink, UserCheck, UserX, MessageCircle, X, Trash2, RotateCcw, Calendar, Bell, Check,
  Camera, UploadCloud, Image as ImageIcon, Plus, ZoomIn, ArrowRight, Layers
} from 'lucide-react';
import { Card, Button, Input, Select } from './ui';
import { PageHeader } from './PageHeader';
import { getKtaUrl } from '../sheets-api';

interface GroupReportProps {
  inspectorName: string;
  inspectorNik: string;
  inspectorRole?: string;
  inspectorSection?: string;
  onClose?: () => void;
  isFloating?: boolean;
  isDeveloper?: boolean;
}

function getCurrentISOWeekTag(d: Date = new Date()): string {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  return `W${weekNum}`;
}

function generateWeekOptions(activeWeekTag: string, year: number = 2026) {
  const activeNum = parseInt(activeWeekTag.replace(/\D/g, ''), 10) || 36;
  const startNum = Math.max(1, activeNum - 3);
  const endNum = Math.min(52, activeNum + 4);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  const options: { value: string; label: string; isCurrent: boolean }[] = [];

  for (let w = startNum; w <= endNum; w++) {
    const simple = new Date(year, 0, 4);
    const dayOfWeek = (simple.getDay() + 6) % 7;
    const week1Monday = new Date(year, 0, 4 - dayOfWeek);
    
    const monday = new Date(week1Monday.getTime() + (w - 1) * 7 * 86400000);
    const sunday = new Date(monday.getTime() + 6 * 86400000);

    const startStr = `${monday.getDate().toString().padStart(2, '0')}-${sunday.getDate().toString().padStart(2, '0')} ${monthNames[sunday.getMonth()]}`;
    const isCurrent = `W${w}` === activeWeekTag;
    
    options.push({
      value: `W${w}`,
      label: `Week ${w} (${startStr})${isCurrent ? ' [Aktif]' : ''}`,
      isCurrent
    });
  }

  return options;
}

export const formatKtaImageUrl = (url?: string | null): string => {
  if (!url || url === '-' || url === '#' || url === 'null') return '';
  if (url.startsWith('data:image')) return url;
  if (url.startsWith('/api/')) return url;

  let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`;
  }
  match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`;
  }
  return url;
};

export const getDriveFileId = (url?: string | null): string | null => {
  if (!url || url === '-' || url === '#') return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

export const getDriveOpenUrl = (url?: string | null): string => {
  if (!url || url === '-' || url === '#') return '#';
  const fileId = getDriveFileId(url);
  if (fileId) {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }
  return url;
};

export function getKtaObligation(nikRaw?: string | null, jabatanRaw?: string | null, sectionRaw?: string | null) {
  const cleanNik = (nikRaw || '').trim().toUpperCase();
  // Khusus NIK revisi: 02D24000043 & M0403190701 diwajibkan 2 TTA
  if (cleanNik === '02D24000043' || cleanNik === 'M0403190701') {
    return { type: '2_TTA' as const, label: '2 TTA', targetCount: 2, desc: 'Wajib 2 Laporan TTA' };
  }
  const j = (jabatanRaw || sectionRaw || '').toLowerCase().trim();
  // Kategori 1: 1 KTA/TTA (Manager & Superintendent)
  if (j.includes('manager') || j.includes('superintendent')) {
    return { type: '1_KTA_OR_TTA' as const, label: '1 KTA/TTA', targetCount: 1, desc: 'Wajib 1 Laporan (Bebas KTA atau TTA)' };
  }
  // Kategori 3: 2 TTA (Maintenance, QA, Admin, Inventory Control)
  if (
    j.includes('maintenance') || 
    j.includes('assurance') || 
    j.includes('quality') || 
    j.includes('quaility') || 
    j.includes('admin') || 
    j.includes('inventory control')
  ) {
    return { type: '2_TTA' as const, label: '2 TTA', targetCount: 2, desc: 'Wajib 2 Laporan TTA' };
  }
  // Kategori 2: 1 KTA & 1 TTA (Laboratory & Preparation Foremen & Supervisors)
  return { type: '1_KTA_AND_1_TTA' as const, label: '1 KTA & 1 TTA', targetCount: 2, desc: 'Wajib 1 KTA & 1 TTA' };
}

export function GroupReportScreen({ inspectorName, inspectorNik, inspectorRole, inspectorSection, onClose, isFloating = false, isDeveloper = false }: GroupReportProps) {
  // Main view state: 'feed' or 'rekap'
  const [activeTab, setActiveTab] = useState<'feed' | 'rekap'>('feed');
  // Category filter for feed: 'ALL' | 'INSPEKSI' | 'KTA_TTA'
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'INSPEKSI' | 'KTA_TTA'>('ALL');
  // Sub-tab for Rekap: 'INSPEKSI' | 'KTA_TTA'
  const [rekapSubTab, setRekapSubTab] = useState<'INSPEKSI' | 'KTA_TTA'>('INSPEKSI');

  const [messages, setMessages] = useState<any[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [textInput, setTextInput] = useState('');
  const [pdfTitleInput, setPdfTitleInput] = useState('');
  const [pdfUrlInput, setPdfUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);

  // Rekap Inspeksi State & Week Filter
  const currentActiveWeek = useMemo(() => getCurrentISOWeekTag(new Date()), []);
  const [selectedWeek, setSelectedWeek] = useState<string>(currentActiveWeek);
  const weekOptions = useMemo(() => generateWeekOptions(currentActiveWeek), [currentActiveWeek]);
  const [rekapSummary, setRekapSummary] = useState<{ total: number; sudah: number; belum: number; percentage: number; cutiCount?: number; selectedWeek?: string }>({ total: 0, sudah: 0, belum: 0, percentage: 0, cutiCount: 0 });
  const [rekapList, setRekapList] = useState<any[]>([]);
  const [cutiList, setCutiList] = useState<any[]>([]);
  const [loadingRekap, setLoadingRekap] = useState(false);
  const [searchRekap, setSearchRekap] = useState('');
  const [rekapFilterStatus, setRekapFilterStatus] = useState<'ALL' | 'SUDAH' | 'BELUM' | 'CUTI'>('ALL');

  // Rekap KTA / TTA State
  const [rekapKtaSummary, setRekapKtaSummary] = useState<{ total: number; sudah: number; belum: number; percentage: number; cutiCount?: number; selectedWeek?: string }>({ total: 0, sudah: 0, belum: 0, percentage: 0, cutiCount: 0 });
  const [rekapKtaList, setRekapKtaList] = useState<any[]>([]);
  const [cutiKtaList, setCutiKtaList] = useState<any[]>([]);
  const [loadingRekapKta, setLoadingRekapKta] = useState(false);
  const [searchRekapKta, setSearchRekapKta] = useState('');
  const [rekapKtaFilterStatus, setRekapKtaFilterStatus] = useState<'ALL' | 'SUDAH' | 'BELUM' | 'CUTI'>('ALL');

  // Modal Kirim Bukti KTA / TTA State (Instan & Otomatis)
  const [showKtaModal, setShowKtaModal] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<string[]>([]);
  const [ktaImageFile, setKtaImageFile] = useState<File | null>(null);
  const [ktaImagePreview, setKtaImagePreview] = useState<string | null>(null);
  const [isSubmittingKta, setIsSubmittingKta] = useState(false);
  const [showSingleUploadReminderModal, setShowSingleUploadReminderModal] = useState(false);
  const [singleUploadObligationLabel, setSingleUploadObligationLabel] = useState('');

  // Modal Kirim Bukti SS Form General Inspeksi State
  const [showSsModal, setShowSsModal] = useState(false);
  const [ssImageFile, setSsImageFile] = useState<File | null>(null);
  const [ssImagePreview, setSsImagePreview] = useState<string | null>(null);
  const [isSubmittingSs, setIsSubmittingSs] = useState(false);

  // User Obligation Calculation
  const myObligation = useMemo(() => {
    return getKtaObligation(inspectorNik, inspectorRole, inspectorSection);
  }, [inspectorNik, inspectorRole, inspectorSection]);

  useEffect(() => {
    const handleOpenKta = () => setShowKtaModal(true);
    const handleOpenSs = () => setShowSsModal(true);
    window.addEventListener('open-kta-upload-modal', handleOpenKta);
    window.addEventListener('open-ss-inspeksi-modal', handleOpenSs);

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'upload-kta') {
      setShowKtaModal(true);
    }
    if (urlParams.get('action') === 'upload-ss-inspeksi') {
      setShowSsModal(true);
    }

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            if (showKtaModal) {
              setKtaImageFile(file);
              const reader = new FileReader();
              reader.onload = (ev) => setKtaImagePreview(ev.target?.result as string);
              reader.readAsDataURL(file);
              toast.success('Screenshot KTA berhasil ditempel dari clipboard!');
            } else if (showSsModal) {
              setSsImageFile(file);
              const reader = new FileReader();
              reader.onload = (ev) => setSsImagePreview(ev.target?.result as string);
              reader.readAsDataURL(file);
              toast.success('Screenshot General Inspeksi berhasil ditempel dari clipboard!');
            }
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('open-kta-upload-modal', handleOpenKta);
      window.removeEventListener('open-ss-inspeksi-modal', handleOpenSs);
      window.removeEventListener('paste', handlePaste);
    };
  }, [showKtaModal, showSsModal]);

  const myKtaRecord = useMemo(() => {
    const nikClean = (inspectorNik || '').toLowerCase().trim();
    const nameClean = (inspectorName || '').toLowerCase().trim();
    return rekapKtaList.find(
      (r) =>
        (r.nik && r.nik.toLowerCase().trim() === nikClean) ||
        (r.name && r.name.toLowerCase().trim() === nameClean)
    );
  }, [rekapKtaList, inspectorNik, inspectorName]);

  const myInspectionRecord = useMemo(() => {
    const nikClean = (inspectorNik || '').toLowerCase().trim();
    const nameClean = (inspectorName || '').toLowerCase().trim();
    return rekapList.find(
      (r) =>
        (r.nik && r.nik.toLowerCase().trim() === nikClean) ||
        (r.name && r.name.toLowerCase().trim() === nameClean)
    );
  }, [rekapList, inspectorNik, inspectorName]);

  // Pre-select checklist checkboxes based on obligation & what's already uploaded (Default: 1 item only, do not auto check 2)
  useEffect(() => {
    if (showKtaModal) {
      fetchRekapKtaData(currentActiveWeek);
      if (myObligation.type === '2_TTA') {
        const hasTta1 = myKtaRecord?.checkDetails?.check1Done;
        const hasTta2 = myKtaRecord?.checkDetails?.check2Done;
        if (hasTta1 && !hasTta2) {
          setSelectedChecklist(['TTA_2']);
        } else if (!hasTta1 && hasTta2) {
          setSelectedChecklist(['TTA_1']);
        } else {
          // Default to only 1 item (TTA 1) - do NOT auto check 2!
          setSelectedChecklist(['TTA_1']);
        }
      } else if (myObligation.type === '1_KTA_AND_1_TTA') {
        const hasKta = myKtaRecord?.checkDetails?.check1Done;
        const hasTta = myKtaRecord?.checkDetails?.check2Done;
        if (hasKta && !hasTta) {
          setSelectedChecklist(['TTA']);
        } else if (!hasKta && hasTta) {
          setSelectedChecklist(['KTA']);
        } else {
          // Default to only 1 item (KTA) - do NOT auto check 2!
          setSelectedChecklist(['KTA']);
        }
      } else {
        setSelectedChecklist(['KTA']);
      }
    }
  }, [showKtaModal, myObligation.type, myKtaRecord, currentActiveWeek]);

  const toggleChecklist = (itemKey: string) => {
    setSelectedChecklist(prev => {
      if (prev.includes(itemKey)) {
        if (prev.length === 1) {
          toast.info('Pilih minimal 1 ceklis yang ingin dipenuhi!');
          return prev;
        }
        return prev.filter(k => k !== itemKey);
      } else {
        return [...prev, itemKey];
      }
    });
  };

  // Interactive PDF Viewer Modal State
  const [pdfModal, setPdfModal] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    senderName?: string;
  }>({
    isOpen: false,
    url: '',
    title: '',
    senderName: ''
  });

  // Lightbox Image Preview Modal (untuk bukti screenshot KTA/TTA)
  const [imageLightbox, setImageLightbox] = useState<{
    isOpen: boolean;
    url: string;
    rawUrl?: string;
    title: string;
    senderName?: string;
    reportType?: string;
    week?: string;
    timestamp?: string;
    description?: string;
  }>({
    isOpen: false,
    url: '',
    rawUrl: '',
    title: '',
    senderName: '',
    reportType: 'KTA',
    week: '',
    timestamp: '',
    description: ''
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto detect developer / Admin Lab status
  const isDevUser = isDeveloper || inspectorNik.startsWith('02D24') || inspectorNik === '02D24000043' || inspectorNik === '02D25000055' || inspectorNik === 'preplabadmin';
  const isAdminLab = isDevUser || 
                     (inspectorRole && (
                       inspectorRole.toLowerCase().includes('admin') || 
                       inspectorRole.toLowerCase().includes('laboratory') || 
                       inspectorRole.toLowerCase().includes('superintendent') || 
                       inspectorRole.toLowerCase().includes('manager')
                     )) || 
                     (inspectorSection && (
                       inspectorSection.toLowerCase().includes('admin') || 
                       inspectorSection.toLowerCase().includes('laboratory')
                     ));
  const canRemind = isDevUser || isAdminLab;

  const [remindedNiks, setRemindedNiks] = useState<Set<string>>(new Set());
  const [remindedKtaNiks, setRemindedKtaNiks] = useState<Set<string>>(new Set());

  // Listen for Clipboard Paste (Ctrl+V) when KTA modal is open
  useEffect(() => {
    if (!showKtaModal) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            setKtaImageFile(file);
            const reader = new FileReader();
            reader.onload = (re) => {
              setKtaImagePreview(re.target?.result as string);
            };
            reader.readAsDataURL(file);
            toast.success('Screenshot berhasil ditempel (paste) dari clipboard!');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showKtaModal]);

  // Handle Paste (Ctrl + V) from clipboard for SS Inspeksi Modal
  useEffect(() => {
    if (!showSsModal) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            setSsImageFile(file);
            const reader = new FileReader();
            reader.onload = (re) => {
              setSsImagePreview(re.target?.result as string);
            };
            reader.readAsDataURL(file);
            toast.success('Screenshot SS General berhasil ditempel dari clipboard!');
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [showSsModal]);

  const handleSendReminder = async (emp: any) => {
    if (remindedNiks.has(emp.nik)) return;
    try {
      const hasPdf = emp.checkDetails?.pdfDone;
      const hasSs = emp.checkDetails?.ssDone;
      let reminderTitle = '🔔 Pengingat Inspeksi Terpadu Mingguan';
      let reminderMessage = `Halo ${emp.name}, Anda diingatkan oleh ${inspectorName || 'Admin Lab'} untuk segera melaksanakan dan mengisi Laporan Inspeksi Terpadu Mingguan (${selectedWeek}).`;

      if (hasPdf && !hasSs) {
        reminderTitle = '⚠️ Pengingat: Unggah Bukti SS Form General Inspeksi';
        reminderMessage = `Halo ${emp.name}, formulir inspeksi (PDF) Anda telah terekap di server, namun bukti screenshot form general inspeksi belum diunggah (${selectedWeek}). Mohon segera unggah screenshot bukti agar status inspeksi Anda lengkap terpenuhi.`;
      } else if (!hasPdf && hasSs) {
        reminderTitle = '⚠️ Pengingat: Dokumen PDF Inspeksi Belum Terekap';
        reminderMessage = `Halo ${emp.name}, bukti SS general inspeksi Anda telah tercatat, namun formulir inspeksi (PDF) belum terkirim di server (${selectedWeek}). Mohon segera melengkapi pengisian inspeksi mingguan Anda.`;
      }

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: emp.nik,
          title: reminderTitle,
          message: reminderMessage,
          type: 'REMINDER_INSPECTION',
          role: null,
          isRead: false
        })
      });

      if (res.ok) {
        setRemindedNiks(prev => new Set(prev).add(emp.nik));
        toast.success(`Push notifikasi pengingat berhasil dikirim ke ${emp.name}!`);
      } else {
        toast.error('Gagal mengirimkan notifikasi pengingat.');
      }
    } catch (err) {
      console.error('Failed to send reminder:', err);
      toast.error('Gagal terhubung ke server pengingat.');
    }
  };

  const handleSendKtaReminder = async (emp: any) => {
    if (remindedKtaNiks.has(emp.nik)) return;
    try {
      const obligation = emp.obligation || getKtaObligation(emp.nik, emp.jabatan, emp.section);
      const isManagerOrSuperintendent = obligation.type === '1_KTA_OR_TTA';
      const isPartial = !isManagerOrSuperintendent && (emp.checkDetails?.summaryProgress === '1/2' || emp.checkDetails?.check1Done || emp.checkDetails?.check2Done);

      let reminderTitle = '⚠️ Pengingat Laporan KTA / TTA Mingguan';
      let reminderMessage = `Halo ${emp.name}, Anda diingatkan oleh ${inspectorName || 'Admin Safety'} untuk segera mengisi formulir KTA/TTA dan mengunggah screenshot buktinya di portal (${selectedWeek}). Target kewajiban Anda: ${obligation.label}.`;

      if (isPartial) {
        reminderTitle = '⚠️ Pengingat: Baru 1x Unggah KTA / TTA';
        reminderMessage = `Halo ${emp.name}, Anda baru mengunggah 1x laporan dari kewajiban ${obligation.label} pada ${selectedWeek}. Mohon segera melengkapi 1 laporan lagi agar target kepatuhan keselamatan kerja Anda lengkap terpenuhi.`;
      }

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: emp.nik,
          title: reminderTitle,
          message: reminderMessage,
          type: 'REMINDER_KTA',
          role: null,
          isRead: false
        })
      });

      if (res.ok) {
        setRemindedKtaNiks(prev => new Set(prev).add(emp.nik));
        toast.success(
          isPartial 
            ? `Pengingat (baru 1x unggah dari ${obligation.label}) berhasil dikirim ke ${emp.name}!` 
            : `Push notifikasi pengingat KTA/TTA berhasil dikirim ke ${emp.name}!`
        );
      } else {
        toast.error('Gagal mengirimkan notifikasi pengingat.');
      }
    } catch (err) {
      console.error('Failed to send KTA reminder:', err);
      toast.error('Gagal terhubung ke server pengingat.');
    }
  };

  useEffect(() => {
    setSelectedWeek(currentActiveWeek);
  }, [currentActiveWeek]);

  useEffect(() => {
    fetchGroupFeed(selectedWeek);
    fetchRekapData(selectedWeek);
    fetchRekapKtaData(selectedWeek);
  }, [selectedWeek]);

  const fetchGroupFeed = async (week: string = selectedWeek) => {
    try {
      setLoadingFeed(true);
      const res = await fetch(`/api/group-reports?week=${week}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching group feed:', err);
    } finally {
      setLoadingFeed(false);
    }
  };

  const fetchRekapData = async (week: string = selectedWeek) => {
    try {
      setLoadingRekap(true);
      const res = await fetch(`/api/rekap-inspeksi?week=${week}`);
      if (res.ok) {
        const data = await res.json();
        setRekapSummary(data.summary || { total: 0, sudah: 0, belum: 0, percentage: 0, cutiCount: 0 });
        setRekapList(data.rekapList || []);
        setCutiList(data.cutiList || []);
      }
    } catch (err) {
      console.error('Error fetching rekap data:', err);
    } finally {
      setLoadingRekap(false);
    }
  };

  const fetchRekapKtaData = async (week: string = selectedWeek) => {
    try {
      setLoadingRekapKta(true);
      const res = await fetch(`/api/rekap-kta?week=${week}`);
      if (res.ok) {
        const data = await res.json();
        setRekapKtaSummary(data.summary || { total: 0, sudah: 0, belum: 0, percentage: 0, cutiCount: 0 });
        setRekapKtaList(data.rekapList || []);
        setCutiKtaList(data.cutiList || []);
      }
    } catch (err) {
      console.error('Error fetching rekap KTA data:', err);
    } finally {
      setLoadingRekapKta(false);
    }
  };

  const handleToggleCuti = async (empNik: string, currentIsCuti: boolean) => {
    try {
      const res = await fetch('/api/rekap-inspeksi/override-cuti', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nik: empNik, isCuti: !currentIsCuti, week: selectedWeek })
      });
      if (res.ok) {
        toast.success(`Status personil ${empNik} berhasil diubah ke ${!currentIsCuti ? 'Cuti' : 'Aktif (Wajib Inspeksi)'}!`);
        fetchRekapData(selectedWeek);
        fetchRekapKtaData(selectedWeek);
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Gagal mengubah status Cuti');
      }
    } catch (err: any) {
      toast.error('Gagal mengubah status: ' + err.message);
    }
  };

  const handleToggleSudah = async (empNik: string, currentStatus: string, isManual?: boolean) => {
    try {
      const nextStatus = currentStatus === 'SUDAH' ? (isManual ? 'RESET' : 'BELUM') : 'SUDAH';
      const res = await fetch('/api/rekap-inspeksi/override-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week: selectedWeek,
          nik: empNik,
          status: nextStatus,
          updatedBy: inspectorName
        })
      });
      if (res.ok) {
        toast.success(`Status personil ${empNik} pada ${selectedWeek} berhasil diubah ke ${nextStatus === 'RESET' ? 'Otomatis' : nextStatus}!`);
        fetchRekapData(selectedWeek);
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Gagal mengubah status Inspeksi');
      }
    } catch (err: any) {
      toast.error('Gagal mengubah status: ' + err.message);
    }
  };

  const handleToggleSudahKta = async (empNik: string, currentStatus: string, isManual?: boolean) => {
    try {
      const nextStatus = currentStatus === 'SUDAH' ? (isManual ? 'RESET' : 'BELUM') : 'SUDAH';
      const res = await fetch('/api/rekap-kta/override-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week: selectedWeek,
          nik: empNik,
          status: nextStatus,
          updatedBy: inspectorName
        })
      });
      if (res.ok) {
        toast.success(`Status KTA personil ${empNik} (${selectedWeek}) berhasil diubah ke ${nextStatus === 'RESET' ? 'Otomatis' : nextStatus}!`);
        fetchRekapKtaData(selectedWeek);
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Gagal mengubah status KTA');
      }
    } catch (err: any) {
      toast.error('Gagal mengubah status: ' + err.message);
    }
  };

  const openPdfModal = (url: string, title: string, senderName?: string) => {
    if (!url || url === '#') {
      toast.error('Tautan dokumen PDF belum tersedia.');
      return;
    }
    setPdfModal({
      isOpen: true,
      url,
      title: title || 'Dokumen Laporan Inspeksi',
      senderName
    });
  };

  const closePdfModal = () => {
    setPdfModal({ isOpen: false, url: '', title: '', senderName: '' });
  };

  const openImageLightbox = (url: string, title: string, senderName?: string, reportType?: string, week?: string, timestamp?: string, description?: string, rawUrl?: string) => {
    if (!url || url === '#' || url === 'null') {
      toast.error('Gambar bukti belum tersedia.');
      return;
    }
    setImageLightbox({
      isOpen: true,
      url: formatKtaImageUrl(url),
      rawUrl: rawUrl || url,
      title: title || 'Bukti Screenshot Formulir',
      senderName,
      reportType: reportType || 'KTA',
      week: week || selectedWeek,
      timestamp,
      description
    });
  };

  const closeImageLightbox = () => {
    setImageLightbox({ isOpen: false, url: '', rawUrl: '', title: '', senderName: '', reportType: 'KTA', week: '', timestamp: '', description: '' });
  };

  const [regeneratingPdfId, setRegeneratingPdfId] = useState<string | null>(null);

  const handleRegeneratePdf = async (msgId: string) => {
    const inspId = msgId.replace('db-', '');
    try {
      setRegeneratingPdfId(msgId);
      toast.loading('Sedang membuat dokumen PDF di Google Drive (memerlukan ~30 detik)...', { id: 'regen-pdf' });
      const res = await fetch(`/api/inspections/${inspId}/regenerate-pdf`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.pdfUrl) {
        toast.success('PDF berhasil dibuat dan disimpan!', { id: 'regen-pdf' });
        await fetchGroupFeed(selectedWeek);
      } else {
        toast.error(data.error || 'Gagal membuat PDF.', { id: 'regen-pdf' });
      }
    } catch (err: any) {
      toast.error('Gagal terhubung ke server: ' + err.message, { id: 'regen-pdf' });
    } finally {
      setRegeneratingPdfId(null);
    }
  };

  const getPdfEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return '';
    const fileIdMatch = rawUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || rawUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
    }
    if (rawUrl.startsWith('http')) {
      return `https://docs.google.com/viewer?url=${encodeURIComponent(rawUrl)}&embedded=true`;
    }
    return rawUrl;
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (ev) => {
        const img = new Image();
        img.src = ev.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1400;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            resolve(ev.target?.result as string);
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleSubmitKtaReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ktaImageFile && !ktaImagePreview) {
      toast.error('Wajib melampirkan screenshot bukti pengisian form!');
      return;
    }

    if (selectedChecklist.length === 0) {
      toast.error('Centang minimal 1 ceklis laporan yang ingin dipenuhi!');
      return;
    }

    const autoDate = new Date().toISOString().split('T')[0];
    const autoWeek = currentActiveWeek;

    try {
      setIsSubmittingKta(true);
      toast.loading('Mengunggah bukti screenshot form...', { id: 'upload-kta' });

      let base64Data = ktaImagePreview;
      if (ktaImageFile) {
        base64Data = await compressImage(ktaImageFile);
      }

      // Upload via /api/upload (1 single upload for all checked items)
      let uploadedUrl = base64Data;
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            mimeType: 'image/jpeg',
            filename: `KTA_${inspectorNik}_${autoWeek}_${Date.now()}.jpg`,
            folderName: 'Pelaporan Hazard KTA'
          })
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          if (upJson.url) uploadedUrl = upJson.url;
        }
      } catch (uErr) {
        console.warn('Fallback to direct base64 storage:', uErr);
      }

      // Submit to /api/kta-reports for each checked checklist item
      const promises = selectedChecklist.map(item => {
        const itemType = item.includes('TTA') ? 'TTA' : 'KTA';
        const itemDesc = item === 'TTA_1' ? 'Bukti Formulir TTA (Laporan ke-1)'
                       : item === 'TTA_2' ? 'Bukti Formulir TTA (Laporan ke-2)'
                       : `Bukti Tanggapan Google Form ${itemType}`;

        return fetch('/api/kta-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nik: inspectorNik,
            name: inspectorName,
            section: inspectorSection || inspectorRole || 'Preparasi & Lab',
            reportType: itemType,
            date: autoDate,
            week: autoWeek,
            imageUrl: uploadedUrl,
            description: itemDesc,
            location: ''
          })
        });
      });

      const responses = await Promise.all(promises);
      const allSuccess = responses.every(r => r.ok);

      if (allSuccess) {
        setShowKtaModal(false);
        setKtaImageFile(null);
        setKtaImagePreview(null);
        // Refresh feeds & rekaps
        fetchGroupFeed(selectedWeek);
        fetchRekapData(selectedWeek);
        fetchRekapKtaData(selectedWeek);

        const isManagerOrSuper = myObligation.type === '1_KTA_OR_TTA';
        if (isManagerOrSuper) {
          toast.success(`✅ Bukti laporan KTA/TTA (${autoWeek}) berhasil disimpan. Kewajiban mingguan Anda telah LENGKAP terpenuhi (1/1)!`, { id: 'upload-kta', duration: 5000 });
        } else {
          // If only 1 was selected (and obligation is 2 items), show warning toast AND trigger dedicated popup dialog!
          if (selectedChecklist.length === 1) {
            toast.warning(
              `⚠️ Pengingat: Anda baru mengunggah 1x laporan dari kewajiban Anda (${myObligation.label}) untuk ${autoWeek}.`, 
              { id: 'upload-kta', duration: 6000 }
            );
            setSingleUploadObligationLabel(myObligation.label);
            setShowSingleUploadReminderModal(true);
          } else {
            toast.success(`🎉 Selamat! Kewajiban ${myObligation.label} Anda untuk ${autoWeek} telah LENGKAP terpenuhi (2/2)!`, { id: 'upload-kta', duration: 5000 });
          }
        }
      } else {
        toast.error('Beberapa data laporan gagal disimpan', { id: 'upload-kta' });
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + err.message, { id: 'upload-kta' });
    } finally {
      setIsSubmittingKta(false);
    }
  };

  const handleSubmitSsReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ssImageFile && !ssImagePreview) {
      toast.error('Wajib melampirkan screenshot bukti pengisian form general inspeksi!');
      return;
    }

    const autoDate = new Date().toISOString().split('T')[0];
    const autoWeek = currentActiveWeek;

    try {
      setIsSubmittingSs(true);
      toast.loading('Mengunggah bukti screenshot form general inspeksi...', { id: 'upload-ss' });

      let base64Data = ssImagePreview;
      if (ssImageFile) {
        base64Data = await compressImage(ssImageFile);
      }

      let uploadedUrl = base64Data;
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            mimeType: 'image/jpeg',
            filename: `SS_INSPEKSI_${inspectorNik}_${autoWeek}_${Date.now()}.jpg`,
            folderName: 'Pelaporan SS General Inspeksi'
          })
        });
        if (upRes.ok) {
          const upJson = await upRes.json();
          if (upJson.url) uploadedUrl = upJson.url;
        }
      } catch (uErr) {
        console.warn('Fallback to direct base64 storage:', uErr);
      }

      const res = await fetch('/api/inspection-proofs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: inspectorNik,
          name: inspectorName,
          section: inspectorSection || inspectorRole || 'Preparasi & Lab',
          date: autoDate,
          week: autoWeek,
          imageUrl: uploadedUrl,
          description: 'Bukti Screenshot Form General Inspeksi'
        })
      });

      if (res.ok) {
        setShowSsModal(false);
        setSsImageFile(null);
        setSsImagePreview(null);
        toast.success(`✅ Bukti screenshot Form General Inspeksi (${autoWeek}) berhasil disimpan!`, { id: 'upload-ss', duration: 5000 });
        fetchGroupFeed(selectedWeek);
        fetchRekapData(selectedWeek);
      } else {
        const errData = await res.json();
        toast.error(errData.error || 'Gagal menyimpan bukti SS Inspeksi', { id: 'upload-ss' });
      }
    } catch (err: any) {
      toast.error('Terjadi kesalahan: ' + err.message, { id: 'upload-ss' });
    } finally {
      setIsSubmittingSs(false);
    }
  };

  const handlePostReport = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!textInput.trim() && !pdfUrlInput.trim()) {
      toast.error('Tulis pesan atau cantumkan URL PDF laporan!');
      return;
    }

    try {
      setIsSubmitting(true);
      const titleWithWeek = pdfTitleInput.trim() 
        ? `${pdfTitleInput.trim()} (${selectedWeek})` 
        : `INSPECTION REPORT (${selectedWeek})`;

      const res = await fetch('/api/group-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderNik: inspectorNik,
          senderName: inspectorName,
          senderRole: inspectorRole || inspectorSection || 'Inspector',
          text: textInput,
          category: 'inspeksi',
          type: pdfUrlInput.trim() ? 'pdf_report' : 'text',
          pdfTitle: titleWithWeek,
          pdfSubTitle: `Laporan Inspeksi - ${inspectorName}`,
          pdfUrl: pdfUrlInput.trim() || null,
          pdfFileName: `Laporan_Inspeksi_${selectedWeek}.pdf`,
          week: selectedWeek
        })
      });

      if (res.ok) {
        toast.success('Laporan PDF berhasil dikirim ke grup!');
        setTextInput('');
        setPdfTitleInput('');
        setPdfUrlInput('');
        setShowAttachModal(false);
        fetchGroupFeed();
        fetchRekapData(selectedWeek);
      }
    } catch (err: any) {
      toast.error('Gagal mengirim ke grup: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!window.confirm('Hapus pesan laporan ini dari grup?')) return;
    try {
      const isKta = id.startsWith('kta-db-');
      const endpoint = isKta ? `/api/kta-reports/${id.replace('kta-db-', '')}` : `/api/group-reports/${id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Pesan laporan telah dihapus.');
        fetchGroupFeed();
        fetchRekapData(selectedWeek);
        fetchRekapKtaData(selectedWeek);
      }
    } catch (err: any) {
      toast.error('Gagal menghapus pesan: ' + err.message);
    }
  };

  const handleResetRekap = async () => {
    if (!window.confirm(`Reset seluruh rekapan & pesan laporan untuk ${selectedWeek}?`)) return;
    try {
      const res = await fetch('/api/group-reports/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week: selectedWeek })
      });
      if (res.ok) {
        toast.success(`Rekapan & pesan grup ${selectedWeek} berhasil di-reset!`);
        fetchGroupFeed();
        fetchRekapData(selectedWeek);
        fetchRekapKtaData(selectedWeek);
      }
    } catch (err: any) {
      toast.error('Gagal mereset rekapan: ' + err.message);
    }
  };

  // Filter messages based on categoryFilter
  const filteredMessages = messages.filter(msg => {
    const isKta = msg.category === 'kta_tta' || msg.type === 'kta_tta' || Boolean(msg.imageUrl);
    const isInspeksi = msg.category === 'inspeksi' || msg.type === 'pdf_report' || Boolean(msg.pdfUrl);

    if (categoryFilter === 'ALL') return true;
    if (categoryFilter === 'INSPEKSI') return isInspeksi && !isKta;
    if (categoryFilter === 'KTA_TTA') return isKta;
    return true;
  });

  const inspectionCount = messages.filter(m => (m.category === 'inspeksi' || m.type === 'pdf_report' || Boolean(m.pdfUrl)) && m.category !== 'kta_tta').length;
  const ktaCount = messages.filter(m => m.category === 'kta_tta' || m.type === 'kta_tta' || Boolean(m.imageUrl)).length;

  // Filter Rekap Inspeksi
  const sourceList = rekapFilterStatus === 'CUTI' 
    ? cutiList 
    : (rekapFilterStatus === 'ALL' ? [...rekapList, ...cutiList] : rekapList);

  const filteredRekap = sourceList.filter(emp => {
    const rawNik = (emp.nik || '').toString().trim();
    const rawName = (emp.name || '').toString().trim();
    const rawSection = (emp.section || '').toString().trim();
    const rawStatus = (emp.statusKaryawan || '').toString().trim().toUpperCase();
    if (!rawNik || rawNik.includes('#N/A') || rawNik.toUpperCase() === 'N/A' || rawName.includes('#N/A')) return false;
    if (rawSection.includes('#N/A') || rawSection.toUpperCase() === 'N/A') return false;
    if (rawStatus.includes('RESIGN') || rawStatus.includes('PHK') || rawStatus.includes('KELUAR') || rawStatus.includes('INACTIVE')) return false;
    if (['04D24000052', '02D23000050', '04D25000062', '04D25000045', 'M0405240291', 'M0210190719'].includes(rawNik)) return false;

    const nikLower = rawNik.toLowerCase();
    const nameLower = rawName.toLowerCase();
    if (
      nikLower === 'demo123' || nikLower === 'demo' || nikLower.includes('demo') ||
      nameLower.includes('demo') || nameLower.includes('staging') || nameLower.includes('test') ||
      nikLower.includes('admin') || nameLower.includes('admin')
    ) {
      return false;
    }

    const matchSearch = nameLower.includes(searchRekap.toLowerCase()) || nikLower.includes(searchRekap.toLowerCase());
    const matchStatus = rekapFilterStatus === 'ALL' 
      ? true 
      : (rekapFilterStatus === 'CUTI' ? emp.isCuti : emp.status === rekapFilterStatus);
    return matchSearch && matchStatus;
  });

  // Filter Rekap KTA / TTA
  const sourceKtaList = rekapKtaFilterStatus === 'CUTI' 
    ? cutiKtaList 
    : (rekapKtaFilterStatus === 'ALL' ? [...rekapKtaList, ...cutiKtaList] : rekapKtaList);

  const filteredRekapKta = sourceKtaList.filter(emp => {
    const rawNik = (emp.nik || '').toString().trim();
    const rawName = (emp.name || '').toString().trim();
    const rawSection = (emp.section || '').toString().trim();
    const rawStatus = (emp.statusKaryawan || '').toString().trim().toUpperCase();
    if (!rawNik || rawNik.includes('#N/A') || rawNik.toUpperCase() === 'N/A' || rawName.includes('#N/A')) return false;
    if (rawSection.includes('#N/A') || rawSection.toUpperCase() === 'N/A') return false;
    if (rawStatus.includes('RESIGN') || rawStatus.includes('PHK') || rawStatus.includes('KELUAR') || rawStatus.includes('INACTIVE')) return false;
    if (['04D24000052', '02D23000050', '04D25000062', '04D25000045', 'M0405240291', 'M0210190719'].includes(rawNik)) return false;

    const nikLower = rawNik.toLowerCase();
    const nameLower = rawName.toLowerCase();
    if (
      nikLower === 'demo123' || nikLower === 'demo' || nikLower.includes('demo') ||
      nameLower.includes('demo') || nameLower.includes('staging') || nameLower.includes('test') ||
      nikLower.includes('admin') || nameLower.includes('admin')
    ) {
      return false;
    }

    const matchSearch = nameLower.includes(searchRekapKta.toLowerCase()) || nikLower.includes(searchRekapKta.toLowerCase());
    const matchStatus = rekapKtaFilterStatus === 'ALL' 
      ? true 
      : (rekapKtaFilterStatus === 'CUTI' ? emp.isCuti : emp.status === rekapKtaFilterStatus);
    return matchSearch && matchStatus;
  });

  return (
    <div className={`flex flex-col text-[var(--text-main)] ${isFloating ? 'h-full' : 'space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 w-full max-w-4xl mx-auto px-2 sm:px-4'}`}>
      
      {/* ── GROUP HEADER BANNER ── */}
      <div className={`bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl p-3.5 sm:p-4 shadow-xl backdrop-blur-md overflow-hidden relative shrink-0 z-10 ${isFloating ? 'rounded-b-none border-x-0 border-t-0 border-b shadow-sm' : ''}`}>
        <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Group Icon Avatar */}
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-emerald-600/20 shrink-0 border border-emerald-400/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-[var(--text-main)] font-display truncate">
                Pelaporan Hazard Report Safety
              </h1>
              <p className="text-[11px] text-[var(--text-muted)] font-medium truncate">
                Inspeksi K3 & Laporan KTA/TTA Prep & Lab ({selectedWeek})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              onClick={() => { fetchGroupFeed(); fetchRekapData(selectedWeek); fetchRekapKtaData(selectedWeek); }}
              className="h-8 w-8 sm:w-auto sm:px-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
              title="Segarkan Feed & Rekap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
            
            {isDevUser && (
              <button
                onClick={handleResetRekap}
                className="h-8 w-8 sm:w-auto sm:px-2 rounded-xl bg-rose-500/15 text-rose-500 border border-rose-500/30 text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-rose-500/20 transition-colors cursor-pointer"
                title={`Reset Rekapan ${selectedWeek}`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            {isFloating && onClose && (
              <button 
                onClick={onClose}
                className="h-8 w-8 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] flex items-center justify-center transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* NAVIGATION TABS (FEED VS REKAP) */}
        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-[var(--border-main)]">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'feed'
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Laporan & Feed ({messages.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rekap')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'rekap'
                ? 'bg-[var(--primary)] text-white shadow-md'
                : 'bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Rekap Status Laporan</span>
          </button>
        </div>
      </div>

      {/* ── TAB CONTENT 1: FEED & LAPORAN SAFETY (DENGAN FILTER KATEGORI) ── */}
      {activeTab === 'feed' && (
        <div className={`flex flex-col ${isFloating ? 'flex-1 min-h-0' : 'space-y-4'}`}>
          
          {/* CATEGORY SWITCHER SEGMENTS (SEMUA / INSPEKSI / KTA-TTA) - PROPOSIONAL GRID 3 KOLOM */}
          <div className="grid grid-cols-3 gap-1 bg-[var(--input-bg)] p-1 rounded-2xl border border-[var(--border-main)]">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`py-1.5 px-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                categoryFilter === 'ALL'
                  ? 'bg-[var(--card-bg)] text-[var(--text-main)] shadow-xs border border-[var(--border-main)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span className="truncate">Semua ({messages.length})</span>
            </button>

            <button
              onClick={() => setCategoryFilter('INSPEKSI')}
              className={`py-1.5 px-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                categoryFilter === 'INSPEKSI'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0 opacity-80" />
              <span className="truncate">Inspeksi ({inspectionCount})</span>
            </button>

            <button
              onClick={() => setCategoryFilter('KTA_TTA')}
              className={`py-1.5 px-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                categoryFilter === 'KTA_TTA'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 opacity-80" />
              <span className="truncate">KTA/TTA ({ktaCount})</span>
            </button>
          </div>

          {/* UPLOAD ACTION BAR KHUSUS KTA / TTA */}
          {categoryFilter === 'KTA_TTA' && (
            <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 bg-amber-500/10 border border-amber-500/25 rounded-2xl animate-in fade-in">
              <div className="flex items-center gap-2 text-xs text-amber-600 font-semibold min-w-0">
                <Camera className="w-4 h-4 shrink-0 text-amber-600" />
                <span className="truncate text-[11px]">Formulir KTA/TTA {selectedWeek}</span>
              </div>
              <button
                onClick={() => setShowKtaModal(true)}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Bukti</span>
              </button>
            </div>
          )}

          {/* UPLOAD ACTION BAR KHUSUS GENERAL INSPEKSI */}
          {categoryFilter === 'INSPEKSI' && (
            <div className="flex items-center justify-between gap-2 p-2 sm:p-2.5 bg-blue-500/10 border border-blue-500/25 rounded-2xl animate-in fade-in">
              <div className="flex items-center gap-2 text-xs text-blue-600 font-bold min-w-0">
                <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600" />
                <span className="truncate text-[11px]">Form General Inspeksi {selectedWeek}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLScOJSC6wcLsJ26YcmwWndj0Hb9x5V48XHTdHWkPzbH2XwN8ww/viewform"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 bg-[var(--card-bg)] hover:bg-[var(--input-bg)] text-[var(--text-main)] border border-[var(--border-main)] text-xs font-bold rounded-xl shadow-xs shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Buka Google Form General Inspeksi di Tab Baru"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  <span className="hidden sm:inline">Isi Form</span>
                </a>
                <button
                  onClick={() => setShowSsModal(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Upload Screenshot</span>
                </button>
              </div>
            </div>
          )}

          {/* Messages Feed Container */}
          <div className={`space-y-3.5 ${isFloating ? 'flex-1 overflow-y-auto p-3' : ''}`}>
            
            {/* PINNED ANNOUNCEMENT */}
            <div className="bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-2xl p-2.5 text-xs flex items-start gap-2 shadow-xs">
              <Pin className="w-3.5 h-3.5 text-[var(--primary)] shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed">
                <span className="font-bold text-[var(--primary)] mr-1">Info Keselamatan Kerja:</span>
                <span className="text-[var(--text-main)] font-medium">
                  Pelaporan mingguan K3 & KTA/TTA. Pilih filter <strong>KTA/TTA</strong> untuk melampirkan screenshot tanggapan formulir agar otomatis terekap.
                </span>
              </div>
            </div>

            {loadingFeed ? (
              <div className="py-12 text-center text-[var(--text-muted)] text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[var(--primary)]" />
                <span>Memuat postingan laporan safety...</span>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="py-10 text-center text-[var(--text-muted)] text-xs bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-5">
                <AlertTriangle className="w-7 h-7 text-amber-500/40 mx-auto mb-2" />
                <p className="font-semibold text-[var(--text-main)]">
                  Belum ada laporan {categoryFilter === 'INSPEKSI' ? 'Inspeksi K3' : categoryFilter === 'KTA_TTA' ? 'KTA / TTA' : ''} pada {selectedWeek}.
                </p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">
                  Tekan tombol "Upload Bukti" di atas untuk melampirkan screenshot form tanggapan Anda.
                </p>
              </div>
            ) : (
              filteredMessages.map((msg, i) => {
                const isMe = msg.senderNik === inspectorNik;
                const isKta = msg.category === 'kta_tta' || msg.type === 'kta_tta' || Boolean(msg.imageUrl);
                const isPdf = msg.type === 'pdf_report' || Boolean(msg.pdfUrl);

                return (
                  <div key={msg.id || i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}>
                    
                    <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold text-[var(--text-muted)]">
                      <span className="text-[var(--primary)] font-bold">{msg.senderName}</span>
                      <span>•</span>
                      <span className="opacity-75">{msg.senderRole}</span>
                      {msg.week && (
                        <span className="ml-1 text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/30">
                          {msg.week}
                        </span>
                      )}
                    </div>

                    <div className={`max-w-[92%] sm:max-w-md w-full rounded-2xl p-3 shadow-sm border relative group ${
                      isMe 
                        ? 'bg-[var(--card-bg)] border-[var(--primary)]/40 text-[var(--text-main)] rounded-tr-xs' 
                        : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-main)] rounded-tl-xs'
                    }`}>
                      
                      {/* Developer / Admin Trash Button */}
                      {(isDevUser || isMe) && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity shadow-md z-10 cursor-pointer"
                          title="Hapus Laporan Ini"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}

                      {/* POST BODY: KTA/TTA CARD */}
                      {isKta ? (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                              msg.reportType === 'TTA'
                                ? 'bg-rose-500/15 text-rose-600 border-rose-500/30'
                                : 'bg-amber-500/15 text-amber-600 border-amber-500/30'
                            }`}>
                              {msg.reportType === 'TTA' ? '⚠️ TTA (Tindakan Tidak Aman)' : '⚠️ KTA (Kondisi Tidak Aman)'}
                            </span>
                            {msg.location && msg.location !== '-' && (
                              <span className="text-[10px] text-[var(--text-muted)] font-medium flex items-center gap-0.5">
                                📍 {msg.location}
                              </span>
                            )}
                          </div>

                          {msg.text && (
                            <p className="text-xs leading-relaxed font-medium whitespace-pre-wrap text-[var(--text-main)]">
                              {msg.text}
                            </p>
                          )}

                          {/* BUKTI SCREENSHOT FORM CARD (TIDAK ADA PREVIEW GAMBAR BESAR, HANYA KARTU TOMBOL LIHAT) */}
                          {msg.imageUrl && msg.imageUrl !== '#' && (
                            <div className="bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl p-2.5 space-y-2">
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 border border-amber-500/30 flex items-center justify-center shrink-0 font-bold">
                                  <Camera className="w-4 h-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-[11px] text-[var(--text-main)] truncate uppercase font-mono">
                                    BUKTI SCREENSHOT {msg.reportType || 'KTA / TTA'}
                                  </h4>
                                  <p className="text-[10px] text-[var(--text-muted)] truncate">
                                    Formulir {msg.week || selectedWeek} - {msg.senderName}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border-main)]">
                                <button
                                  type="button"
                                  onClick={() => openImageLightbox(msg.imageUrl, `Bukti Form ${msg.reportType || 'KTA'} - ${msg.senderName}`, msg.senderName, msg.reportType, msg.week, msg.timestamp, msg.text, msg.imageUrl)}
                                  className="flex-1 py-1.5 px-2.5 rounded-lg bg-[var(--primary)] text-white text-[11px] font-bold flex items-center justify-center gap-1.5 shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Lihat Bukti Formulir</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const driveLink = getDriveOpenUrl(msg.imageUrl);
                                    const waText = encodeURIComponent(`*${msg.reportType || 'KTA'} REPORT (${msg.week || selectedWeek})*\nPelapor: ${msg.senderName}\nKeterangan: ${msg.text || '-'}\nBukti Formulir: ${driveLink}`);
                                    window.open(`https://wa.me/?text=${waText}`, '_blank');
                                  }}
                                  className="py-1.5 px-3 rounded-lg bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-700 transition-colors shadow-xs cursor-pointer"
                                  title="Kirim ke WhatsApp"
                                >
                                  <Share2 className="w-3.5 h-3.5" />
                                  <span>WA</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        /* POST BODY: INSPEKSI PDF REPORT CARD */
                        <div>
                          {msg.text && (
                            <p className="text-xs leading-relaxed font-medium mb-2 whitespace-pre-wrap">
                              {msg.text}
                            </p>
                          )}

                          {isPdf && (
                            <div className="bg-[var(--input-bg)] border border-[var(--border-main)] rounded-xl p-2.5 space-y-2">
                              <div className="flex items-start gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-500/15 text-blue-500 border border-blue-500/30 flex items-center justify-center shrink-0 font-bold">
                                  <FileText className="w-4 h-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-[11px] text-[var(--text-main)] truncate uppercase font-mono">
                                    {msg.pdfTitle || 'CHECKLIST INSPEKSI TERPADU'}
                                  </h4>
                                  <p className="text-[10px] text-[var(--text-muted)] truncate">
                                    {msg.pdfSubTitle || msg.pdfFileName || 'Dokumen PDF Laporan'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--border-main)]">
                                {(!msg.pdfUrl || msg.pdfUrl === '#' || msg.pdfUrl === 'null') && msg.id?.startsWith('insp-db-') ? (
                                  <button
                                    disabled={regeneratingPdfId === msg.id}
                                    onClick={() => handleRegeneratePdf(msg.id)}
                                    className="flex-1 py-1 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                    title="Buat ulang dokumen PDF via Google Apps Script"
                                  >
                                    <RefreshCw className={`w-3.5 h-3.5 ${regeneratingPdfId === msg.id ? 'animate-spin' : ''}`} />
                                    <span>{regeneratingPdfId === msg.id ? 'Memproses PDF...' : 'Buat Ulang PDF'}</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => openPdfModal(msg.pdfUrl, msg.pdfTitle, msg.senderName)}
                                    className="flex-1 py-1 px-2.5 rounded-lg bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Pratinjau PDF
                                  </button>
                                )}

                                {msg.pdfUrl && msg.pdfUrl !== '#' && (
                                  <a
                                    href={getPdfEmbedUrl(msg.pdfUrl)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1 px-2 rounded-lg bg-[var(--input-bg)] text-[var(--text-main)] border border-[var(--border-main)] text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-[var(--bg-main)] transition-colors"
                                    title="Buka di Tab Baru (Viewer)"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}

                                <button
                                  onClick={() => {
                                    const waText = encodeURIComponent(`*${msg.pdfTitle}*\nDikirim oleh: ${msg.senderName}\n${msg.text}\nLink PDF: ${msg.pdfUrl || '-'}`);
                                    window.open(`https://wa.me/?text=${waText}`, '_blank');
                                  }}
                                  className="py-1 px-2.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-emerald-700 transition-colors shadow-xs"
                                >
                                  <Share2 className="w-3 h-3" /> WA
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-1 mt-1.5 text-[9px] text-[var(--text-muted)]">
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* ── TAB CONTENT 2: REKAP KEPATUHAN (DENGAN PILIHAN INSPEKSI VS KTA/TTA) ── */}
      {activeTab === 'rekap' && (
        <div className={`flex flex-col ${isFloating ? 'flex-1 min-h-0 overflow-y-auto p-3 space-y-3' : 'space-y-4'}`}>
          
          {/* REKAP SUB-TAB SELECTOR & WEEK SELECTOR */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-2.5 space-y-2.5 shadow-sm shrink-0">
            
            {/* TOGGLE SUB-TAB: REKAP INSPEKSI VS REKAP KTA/TTA */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRekapSubTab('INSPEKSI')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  rekapSubTab === 'INSPEKSI'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Rekap Inspeksi ({rekapSummary.percentage}%)</span>
              </button>

              <button
                onClick={() => setRekapSubTab('KTA_TTA')}
                className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  rekapSubTab === 'KTA_TTA'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Rekap KTA / TTA ({rekapKtaSummary.percentage}%)</span>
              </button>
            </div>

            {/* WEEK SELECTOR DROPDOWN */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-main)]">
              <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-main)]">
                <Calendar className="w-4 h-4 text-[var(--primary)] shrink-0" />
                <span>Periode Rekap:</span>
              </div>

              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="bg-[var(--input-bg)] border border-[var(--border-main)] text-[var(--text-main)] text-xs font-bold font-mono px-3 py-1.5 rounded-xl shadow-xs focus:ring-2 focus:ring-[var(--primary)] outline-none cursor-pointer"
              >
                {weekOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
                <option value="ALL">Semua Minggu (Kumulatif)</option>
              </select>
            </div>
          </div>

          {/* ── SUB-VIEW A: REKAP KEPATUHAN INSPEKSI K3 ── */}
          {rekapSubTab === 'INSPEKSI' && (
            <div className="space-y-3">
              {/* Summary Dashboard Cards */}
              <div className={`grid ${isFloating ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-5'} gap-2`}>
                <Card className="p-2.5 bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-main)] text-center">
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Total Wajib</p>
                  {loadingRekap ? (
                    <div className="py-1"><RefreshCw className="w-4 h-4 animate-spin mx-auto text-[var(--primary)]" /></div>
                  ) : (
                    <h3 className="text-lg font-black text-[var(--text-main)]">{rekapSummary.total}</h3>
                  )}
                </Card>

                <Card className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">Sudah</p>
                  {loadingRekap ? (
                    <div className="py-1"><RefreshCw className="w-4 h-4 animate-spin mx-auto text-emerald-500" /></div>
                  ) : (
                    <h3 className="text-lg font-black text-emerald-600">{rekapSummary.sudah}</h3>
                  )}
                </Card>

                <Card className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-center">
                  <p className="text-[10px] text-amber-600 font-bold uppercase">Belum</p>
                  {loadingRekap ? (
                    <div className="py-1"><RefreshCw className="w-4 h-4 animate-spin mx-auto text-amber-500" /></div>
                  ) : (
                    <h3 className="text-lg font-black text-amber-600">{rekapSummary.belum}</h3>
                  )}
                </Card>

                <Card className="p-2.5 bg-purple-500/10 border border-purple-500/30 text-center">
                  <p className="text-[10px] text-purple-600 font-bold uppercase">Sedang Cuti</p>
                  {loadingRekap ? (
                    <div className="py-1"><RefreshCw className="w-4 h-4 animate-spin mx-auto text-purple-500" /></div>
                  ) : (
                    <h3 className="text-lg font-black text-purple-600">{rekapSummary.cutiCount || 0}</h3>
                  )}
                </Card>

                <Card className={`p-2.5 bg-[var(--card-bg)] border border-[var(--border-main)] text-center ${isFloating ? 'col-span-2' : 'col-span-2 sm:col-span-1'}`}>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">% {selectedWeek}</p>
                  {loadingRekap ? (
                    <div className="py-1"><RefreshCw className="w-4 h-4 animate-spin mx-auto text-[var(--primary)]" /></div>
                  ) : (
                    <h3 className="text-lg font-black text-blue-600">{rekapSummary.percentage}%</h3>
                  )}
                </Card>
              </div>

              {/* Personal Inspection Status Banner */}
              {myInspectionRecord && !myInspectionRecord.isCuti && (
                <div className={`p-3.5 rounded-2xl border transition-all ${
                  myInspectionRecord.status === 'SUDAH'
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : myInspectionRecord.checkDetails?.pdfDone && !myInspectionRecord.checkDetails?.ssDone
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-blue-500/10 border-blue-500/30'
                }`}>
                  {/* Top Bar: Icon + Header + Solid Contrast Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-[var(--border-main)]/60">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-xs text-white ${
                        myInspectionRecord.status === 'SUDAH'
                          ? 'bg-emerald-600'
                          : myInspectionRecord.checkDetails?.pdfDone && !myInspectionRecord.checkDetails?.ssDone
                          ? 'bg-amber-600'
                          : 'bg-blue-600'
                      }`}>
                        {myInspectionRecord.status === 'SUDAH' ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>
                      <span className="font-bold text-xs text-[var(--text-main)] truncate">
                        Status Inspeksi Anda ({selectedWeek})
                      </span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider shrink-0 shadow-xs text-white ${
                      myInspectionRecord.status === 'SUDAH'
                        ? 'bg-emerald-600'
                        : myInspectionRecord.checkDetails?.pdfDone && !myInspectionRecord.checkDetails?.ssDone
                        ? 'bg-amber-600'
                        : !myInspectionRecord.checkDetails?.pdfDone && myInspectionRecord.checkDetails?.ssDone
                        ? 'bg-amber-600'
                        : 'bg-rose-600'
                    }`}>
                      {myInspectionRecord.status === 'SUDAH'
                        ? '✓ LENGKAP (2/2)'
                        : myInspectionRecord.checkDetails?.pdfDone && !myInspectionRecord.checkDetails?.ssDone
                        ? '⚠️ KURANG SCREENSHOT (1/2)'
                        : !myInspectionRecord.checkDetails?.pdfDone && myInspectionRecord.checkDetails?.ssDone
                        ? '⚠️ KURANG PDF (1/2)'
                        : 'BELUM LAPOR (0/2)'}
                    </span>
                  </div>

                  {/* Dual Checklist Status Pills */}
                  <div className="grid grid-cols-2 gap-2 mb-2.5">
                    {/* Syarat 1 (PDF) */}
                    <div className={`p-2 rounded-xl border flex items-center gap-2 text-xs ${
                      myInspectionRecord.checkDetails?.pdfDone
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-[var(--text-main)]'
                        : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)]'
                    }`}>
                      {myInspectionRecord.checkDetails?.pdfDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full border border-[var(--text-muted)] shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-semibold leading-none mb-0.5">Syarat 1 (PDF)</p>
                        <p className={`truncate text-[11px] font-bold leading-tight ${
                          myInspectionRecord.checkDetails?.pdfDone ? 'text-emerald-600' : 'text-[var(--text-muted)]'
                        }`}>
                          {myInspectionRecord.checkDetails?.pdfDone ? '✓ Terekap Server' : '○ Belum Terekap'}
                        </p>
                      </div>
                    </div>

                    {/* Syarat 2 (Bukti Screenshot) */}
                    <div className={`p-2 rounded-xl border flex items-center gap-2 text-xs ${
                      myInspectionRecord.checkDetails?.ssDone
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-[var(--text-main)]'
                        : 'bg-amber-500/15 border-amber-500/30 text-[var(--text-main)]'
                    }`}>
                      {myInspectionRecord.checkDetails?.ssDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-semibold leading-none mb-0.5">Syarat 2 (Screenshot)</p>
                        <p className={`truncate text-[11px] font-bold leading-tight ${
                          myInspectionRecord.checkDetails?.ssDone ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {myInspectionRecord.checkDetails?.ssDone ? '✓ Sudah Upload' : '⚠️ Wajib Upload'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Clean Theme Explanation Text */}
                  <p className="text-xs text-[var(--text-main)] leading-relaxed font-normal mb-3">
                    {myInspectionRecord.status === 'SUDAH'
                      ? 'Dokumen PDF inspeksi Anda telah terekap dan bukti tangkapan layar form general inspeksi telah lengkap.'
                      : myInspectionRecord.checkDetails?.pdfDone && !myInspectionRecord.checkDetails?.ssDone
                      ? 'Formulir inspeksi (PDF) Anda telah terekap otomatis di server. Wajib mengunggah screenshot pengisian form general inspeksi agar status Anda dinyatakan SUDAH.'
                      : !myInspectionRecord.checkDetails?.pdfDone && myInspectionRecord.checkDetails?.ssDone
                      ? 'Bukti screenshot telah tersimpan, namun formulir inspeksi (PDF) belum terkirim ke server.'
                      : 'Wajib mengisi Formulir General Inspeksi dan melampirkan screenshot bukti pengisian.'}
                  </p>

                  {/* Proportional Action Buttons Bar */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border-main)]/60">
                    <a
                      href="https://docs.google.com/forms/d/e/1FAIpQLScOJSC6wcLsJ26YcmwWndj0Hb9x5V48XHTdHWkPzbH2XwN8ww/viewform"
                      target="_blank"
                      rel="noreferrer"
                      className="py-2 px-3 rounded-xl bg-[var(--card-bg)] hover:bg-[var(--input-bg)] text-[var(--text-main)] border border-[var(--border-main)] text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                      <span>Buka Form ↗</span>
                    </a>

                    {(!myInspectionRecord.checkDetails?.ssDone || myInspectionRecord.status !== 'SUDAH') ? (
                      <button
                        type="button"
                        onClick={() => setShowSsModal(true)}
                        className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Upload Screenshot</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowSsModal(true)}
                        className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Ganti Screenshot</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Search & Status Filter */}
              <div className="space-y-2">
                <Input
                  placeholder="Cari nama atau NIK personil inspeksi..."
                  value={searchRekap}
                  onChange={e => setSearchRekap(e.target.value)}
                  className="bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-main)] text-xs h-9 rounded-xl"
                />

                <div className="flex items-center gap-1 overflow-x-auto">
                  <button
                    onClick={() => setRekapFilterStatus('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                      rekapFilterStatus === 'ALL'
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'
                    }`}
                  >
                    Semua ({rekapList.length + cutiList.length})
                  </button>
                  <button
                    onClick={() => setRekapFilterStatus('SUDAH')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                      rekapFilterStatus === 'SUDAH'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'
                    }`}
                  >
                    ✅ Sudah ({rekapSummary.sudah})
                  </button>
                  <button
                    onClick={() => setRekapFilterStatus('BELUM')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                      rekapFilterStatus === 'BELUM'
                        ? 'bg-amber-600 text-white'
                        : 'bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'
                    }`}
                  >
                    ⏳ Belum ({rekapSummary.belum})
                  </button>
                  <button
                    onClick={() => setRekapFilterStatus('CUTI')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                      rekapFilterStatus === 'CUTI'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'
                    }`}
                  >
                    🏖️ Cuti ({rekapSummary.cutiCount || 0})
                  </button>
                </div>
              </div>

              {/* Rekap List Cards */}
              <div className="space-y-2">
                {loadingRekap ? (
                  <div className="py-8 text-center text-[var(--text-muted)] text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[var(--primary)]" />
                    <span>Memuat rekap inspeksi {selectedWeek}...</span>
                  </div>
                ) : filteredRekap.length === 0 ? (
                  <div className="py-8 text-center text-[var(--text-muted)] text-xs">
                    Tidak ada data personil yang cocok.
                  </div>
                ) : (
                  filteredRekap.map((emp, i) => {
                    const isDone = emp.status === 'SUDAH';
                    const isCutiPerson = emp.isCuti;
                    const checkDetails = emp.checkDetails || {
                      pdfDone: isDone,
                      pdfUrl: emp.pdfUrl,
                      pdfTitle: emp.pdfTitle,
                      ssDone: isDone,
                      ssUrl: emp.ssUrl,
                      ssProof: emp.ssUrl,
                      summaryProgress: isDone ? '2/2' : '0/2'
                    };

                    const isPartial = !isDone && !isCutiPerson && (checkDetails.pdfDone !== checkDetails.ssDone);

                    // Gaya tombol aksi seragam mengikuti token tema portal
                    const btnBase = 'px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-colors cursor-pointer whitespace-nowrap';
                    const btnPrimary = `${btnBase} bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white border-transparent shadow-xs`;
                    const btnNeutral = `${btnBase} bg-[var(--input-bg)] hover:bg-[var(--card-bg)] text-[var(--text-main)] border-[var(--border-main)] hover:border-[var(--primary)]`;
                    const btnMuted = `${btnBase} bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border-main)] opacity-80 cursor-default`;

                    return (
                      <div 
                        key={emp.nik || i}
                        className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex flex-col gap-2 text-xs ${isFloating ? '' : 'sm:flex-row sm:items-center sm:justify-between sm:gap-3'} ${
                          isCutiPerson
                            ? 'bg-purple-500/5 border-purple-500/25 text-[var(--text-main)]'
                            : isDone 
                            ? 'bg-emerald-500/5 border-emerald-500/25 text-[var(--text-main)]' 
                            : isPartial
                            ? 'bg-amber-500/5 border-amber-500/25 text-[var(--text-main)]'
                            : 'bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-main)]'
                        }`}
                      >
                        {/* Left: Avatar & Info */}
                        <div className="flex items-start gap-2.5 min-w-0 w-full sm:flex-1">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                            isCutiPerson 
                              ? 'bg-purple-600 text-white' 
                              : isDone 
                              ? 'bg-emerald-600 text-white' 
                              : isPartial 
                              ? 'bg-amber-600 text-white' 
                              : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}>
                            {emp.name.charAt(0)}
                          </div>

                          <div className="min-w-0 flex-1 space-y-0.5">
                            {/* Line 1: Nama personil (selalu utuh, boleh turun baris) */}
                            <h5 className="font-bold text-xs text-[var(--text-main)] leading-snug break-words">{emp.name}</h5>

                            {/* Line 2: Badge status & penanda verifikasi manual */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider border shrink-0 ${
                                isCutiPerson
                                  ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-950 dark:text-purple-200 border-purple-300 dark:border-purple-700'
                                  : isDone
                                  ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                  : checkDetails.pdfDone && !checkDetails.ssDone
                                  ? 'bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                              }`}>
                                {isCutiPerson 
                                  ? '🏖️ CUTI' 
                                  : isDone 
                                  ? '✓ LENGKAP (2/2)' 
                                  : checkDetails.pdfDone && !checkDetails.ssDone 
                                  ? '⚠️ KURANG SCREENSHOT (1/2)' 
                                  : !checkDetails.pdfDone && checkDetails.ssDone 
                                  ? '⚠️ KURANG PDF (1/2)' 
                                  : 'BELUM LAPOR (0/2)'}
                              </span>

                              {emp.isManualOverride && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-950 dark:text-blue-200 border border-blue-300 shrink-0" title={`Diverifikasi Manual oleh Admin pada ${selectedWeek}`}>
                                  Manual
                                </span>
                              )}
                            </div>

                            {/* Line 3: Jabatan */}
                            <p className="text-[10px] text-[var(--text-muted)] break-words font-medium">
                              {emp.jabatan || 'Personil'}
                            </p>

                            {/* Line 4: Ceklis interaktif (PDF & Screenshot) */}
                            {!isCutiPerson && (
                              <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                                {/* Checklist 1: Dokumen PDF Inspeksi */}
                                {checkDetails.pdfDone ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (checkDetails.pdfUrl) {
                                        openPdfModal(checkDetails.pdfUrl, checkDetails.pdfTitle || `Laporan Inspeksi - ${emp.name}`, emp.name);
                                      } else {
                                        toast.info(`Dokumen PDF inspeksi untuk ${emp.name} telah terekap.`);
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                    title="Klik untuk membuka dokumen PDF Inspeksi"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>PDF Inspeksi</span>
                                    {checkDetails.pdfUrl && <Eye className="w-2.5 h-2.5 opacity-60 ml-0.5" />}
                                  </button>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-muted)] font-medium text-[10px] flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full border border-slate-400 shrink-0" />
                                    <span>PDF Belum</span>
                                  </span>
                                )}

                                {/* Checklist 2: Bukti Screenshot Form General Inspeksi */}
                                {checkDetails.ssDone ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (checkDetails.ssUrl) {
                                        openImageLightbox(
                                          checkDetails.ssUrl,
                                          `Bukti Screenshot Form General Inspeksi - ${emp.name}`,
                                          emp.name,
                                          'INSPEKSI',
                                          emp.week || selectedWeek,
                                          emp.completedAt,
                                          'Bukti Screenshot Form General Inspeksi',
                                          checkDetails.ssUrl
                                        );
                                      } else {
                                        toast.info(`Bukti screenshot inspeksi untuk ${emp.name} telah terverifikasi.`);
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                    title="Klik untuk melihat bukti screenshot form general inspeksi"
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>Screenshot Form</span>
                                    {checkDetails.ssUrl && <Eye className="w-2.5 h-2.5 opacity-60 ml-0.5" />}
                                  </button>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 font-bold text-[10px] flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full border border-amber-500 shrink-0" />
                                    <span>Screenshot Belum</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Baris aksi: turun ke bawah kartu di drawer sempit, sejajar kanan di layar lebar */}
                        <div className={`flex items-center gap-1.5 flex-wrap w-full justify-start pt-2 border-t border-[var(--border-main)]/50 ${isFloating ? '' : 'sm:w-auto sm:shrink-0 sm:justify-end sm:pt-0 sm:border-t-0'}`}>
                          {/* Set Sudah / Reset Button */}
                          {isDevUser && !isCutiPerson && (!isDone || emp.isManualOverride) && (
                            <button
                              onClick={() => handleToggleSudah(emp.nik, emp.status, emp.isManualOverride)}
                              className={isDone && emp.isManualOverride ? btnNeutral : btnPrimary}
                              title={isDone && emp.isManualOverride ? `Kembalikan ke Deteksi Otomatis (${selectedWeek})` : `Tandai Sudah Inspeksi Secara Manual (${selectedWeek})`}
                            >
                              {isDone && emp.isManualOverride ? (
                                <><RotateCcw className="w-3 h-3 shrink-0" /> Reset</>
                              ) : (
                                <><Check className="w-3 h-3 shrink-0" /> Set Sudah</>
                              )}
                            </button>
                          )}

                          {/* Set Cuti Button */}
                          {isDevUser && (
                            <button
                              onClick={() => handleToggleCuti(emp.nik, !!isCutiPerson)}
                              className={btnNeutral}
                              title={isCutiPerson ? "Kembalikan ke Status Wajib Inspeksi" : "Tandai Karyawan Sedang Cuti"}
                            >
                              {isCutiPerson ? (
                                <><UserCheck className="w-3 h-3 shrink-0 text-[var(--primary)]" /> Set Wajib</>
                              ) : (
                                <><UserX className="w-3 h-3 shrink-0 text-[var(--text-muted)]" /> Set Cuti</>
                              )}
                            </button>
                          )}

                          {isCutiPerson ? (
                            <span className="px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-950 dark:text-purple-200 border border-purple-300 text-[10px] font-bold">
                              CUTI
                            </span>
                          ) : isDone ? (
                            <>
                              {checkDetails.pdfUrl && checkDetails.pdfUrl !== '#' && (
                                <button
                                  onClick={() => openPdfModal(checkDetails.pdfUrl, `Laporan Inspeksi - ${emp.name}`, emp.name)}
                                  className={btnNeutral}
                                  title="Lihat Dokumen PDF Inspeksi"
                                >
                                  <Eye className="w-3 h-3 shrink-0 text-[var(--primary)]" /> PDF
                                </button>
                              )}
                              {checkDetails.ssUrl && checkDetails.ssUrl !== '#' && (
                                <button
                                  onClick={() => openImageLightbox(
                                    checkDetails.ssUrl,
                                    `Bukti Screenshot Form General Inspeksi - ${emp.name}`,
                                    emp.name,
                                    'INSPEKSI',
                                    emp.week || selectedWeek,
                                    emp.completedAt,
                                    'Bukti Screenshot Form General Inspeksi',
                                    checkDetails.ssUrl
                                  )}
                                  className={btnNeutral}
                                  title="Lihat Bukti Screenshot"
                                >
                                  <Camera className="w-3 h-3 shrink-0 text-[var(--primary)]" /> Screenshot
                                </button>
                              )}
                            </>
                          ) : canRemind ? (
                            <button
                              onClick={() => handleSendReminder(emp)}
                              disabled={remindedNiks.has(emp.nik)}
                              className={remindedNiks.has(emp.nik) ? btnMuted : btnNeutral}
                              title={`Kirim Push Notifikasi Pengingat ke akun ${emp.name}`}
                            >
                              {remindedNiks.has(emp.nik) ? (
                                <>
                                  <Check className="w-3 h-3 shrink-0 text-[var(--primary)]" /> Diingatkan
                                </>
                              ) : (
                                <>
                                  <Bell className="w-3 h-3 shrink-0 text-amber-500" /> {checkDetails.pdfDone && !checkDetails.ssDone ? 'Ingatkan (Kurang Screenshot)' : 'Ingatkan'}
                                </>
                              )}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ── SUB-VIEW B: REKAP KEPATUHAN KTA / TTA ── */}
          {rekapSubTab === 'KTA_TTA' && (
            <div className="space-y-3">
              {/* Summary Dashboard Cards KTA */}
              <div className={`grid ${isFloating ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-5'} gap-2`}>
                <Card className="p-2.5 bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-main)] text-center">
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Total Wajib</p>
                  {loadingRekapKta ? (
                    <div className="py-1"><RefreshCw className="w-4 h-4 animate-spin mx-auto text-[var(--primary)]" /></div>
                  ) : (
                    <h3 className="text-lg font-black text-[var(--text-main)]">{rekapKtaSummary.total}</h3>
                  )}
                </Card>

                <Card className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">Sudah</p>
                  {loadingRekapKta ? (
                    <div className="py-1"><RefreshCw className="w-4 h-4 animate-spin mx-auto text-emerald-500" /></div>
                  ) : (
                    <h3 className="text-lg font-black text-emerald-600">{rekapKtaSummary.sudah}</h3>
                  )}
                </Card>

                <Card className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-center">
                  <p className="text-[10px] text-amber-600 font-bold uppercase">Belum</p>
                  {loadingRekapKta ? (
                    <div className="py-1"><RefreshCw className="w-4 h-4 animate-spin mx-auto text-amber-500" /></div>
                  ) : (
                    <h3 className="text-lg font-black text-amber-600">{rekapKtaSummary.belum}</h3>
                  )}
                </Card>

                <Card className="p-2.5 bg-purple-500/10 border border-purple-500/30 text-center">
                  <p className="text-[10px] text-purple-600 font-bold uppercase">Sedang Cuti</p>
                  {loadingRekapKta ? (
                    <div className="py-1"><RefreshCw className="w-4 h-4 animate-spin mx-auto text-purple-500" /></div>
                  ) : (
                    <h3 className="text-lg font-black text-purple-600">{rekapKtaSummary.cutiCount || 0}</h3>
                  )}
                </Card>

                <Card className={`p-2.5 bg-[var(--card-bg)] border border-[var(--border-main)] text-center ${isFloating ? 'col-span-2' : 'col-span-2 sm:col-span-1'}`}>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">% {selectedWeek}</p>
                  {loadingRekapKta ? (
                    <div className="py-1"><RefreshCw className="w-4 h-4 animate-spin mx-auto text-amber-500" /></div>
                  ) : (
                    <h3 className="text-lg font-black text-amber-600">{rekapKtaSummary.percentage}%</h3>
                  )}
                </Card>
              </div>

              {/* Search & Status Filter KTA */}
              <div className="space-y-2">
                <Input
                  placeholder="Cari nama atau NIK personil KTA/TTA..."
                  value={searchRekapKta}
                  onChange={e => setSearchRekapKta(e.target.value)}
                  className="bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-main)] text-xs h-9 rounded-xl"
                />

                <div className="flex items-center gap-1 overflow-x-auto">
                  <button
                    onClick={() => setRekapKtaFilterStatus('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                      rekapKtaFilterStatus === 'ALL'
                        ? 'bg-amber-600 text-white'
                        : 'bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'
                    }`}
                  >
                    Semua ({rekapKtaList.length + cutiKtaList.length})
                  </button>
                  <button
                    onClick={() => setRekapKtaFilterStatus('SUDAH')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                      rekapKtaFilterStatus === 'SUDAH'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'
                    }`}
                  >
                    ✅ Sudah ({rekapKtaSummary.sudah})
                  </button>
                  <button
                    onClick={() => setRekapKtaFilterStatus('BELUM')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                      rekapKtaFilterStatus === 'BELUM'
                        ? 'bg-amber-600 text-white'
                        : 'bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'
                    }`}
                  >
                    ⏳ Belum ({rekapKtaSummary.belum})
                  </button>
                  <button
                    onClick={() => setRekapKtaFilterStatus('CUTI')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 ${
                      rekapKtaFilterStatus === 'CUTI'
                        ? 'bg-purple-600 text-white'
                        : 'bg-[var(--input-bg)] text-[var(--text-muted)] border border-[var(--border-main)]'
                    }`}
                  >
                    🏖️ Cuti ({rekapKtaSummary.cutiCount || 0})
                  </button>
                </div>
              </div>

              {/* Rekap KTA List Cards */}
              <div className="space-y-2">
                {loadingRekapKta ? (
                  <div className="py-8 text-center text-[var(--text-muted)] text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                    <span>Memuat rekap KTA/TTA {selectedWeek}...</span>
                  </div>
                ) : filteredRekapKta.length === 0 ? (
                  <div className="py-8 text-center text-[var(--text-muted)] text-xs">
                    Tidak ada data personil KTA yang cocok.
                  </div>
                ) : (
                  filteredRekapKta.map((emp, i) => {
                    const obligation = emp.obligation || getKtaObligation(emp.nik, emp.jabatan, emp.section);
                    const checkDetails = emp.checkDetails || {
                      check1Label: obligation.type === '2_TTA' ? 'TTA 1' : (obligation.type === '1_KTA_OR_TTA' ? 'KTA/TTA' : 'KTA'),
                      check1Done: emp.status === 'SUDAH',
                      check1Proof: emp.imageUrl,
                      check2Label: obligation.type === '2_TTA' ? 'TTA 2' : 'TTA',
                      check2Done: emp.status === 'SUDAH' && obligation.type !== '1_KTA_OR_TTA',
                      check2Proof: emp.imageUrl,
                      summaryProgress: emp.status === 'SUDAH' ? (obligation.type === '1_KTA_OR_TTA' ? '1/1' : '2/2') : (obligation.type === '1_KTA_OR_TTA' ? '0/1' : '0/2')
                    };
                    const isDone = emp.status === 'SUDAH';
                    const isCutiPerson = emp.isCuti;
                    const isManagerOrSuper = obligation.type === '1_KTA_OR_TTA';
                    const isPartial = !isDone && !isCutiPerson && !isManagerOrSuper && (
                      checkDetails.summaryProgress === '1/2' ||
                      (obligation.type === '2_TTA' && (checkDetails.check1Done !== checkDetails.check2Done)) ||
                      (obligation.type === '1_KTA_AND_1_TTA' && (checkDetails.check1Done !== checkDetails.check2Done))
                    );

                    // Gaya tombol aksi seragam mengikuti token tema portal
                    const btnBase = 'px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-colors cursor-pointer whitespace-nowrap';
                    const btnPrimary = `${btnBase} bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white border-transparent shadow-xs`;
                    const btnNeutral = `${btnBase} bg-[var(--input-bg)] hover:bg-[var(--card-bg)] text-[var(--text-main)] border-[var(--border-main)] hover:border-[var(--primary)]`;
                    const btnMuted = `${btnBase} bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--border-main)] opacity-80 cursor-default`;

                    return (
                      <div 
                        key={emp.nik || i}
                        className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex flex-col gap-2 text-xs ${isFloating ? '' : 'sm:flex-row sm:items-center sm:justify-between sm:gap-3'} ${
                          isCutiPerson
                            ? 'bg-purple-500/5 border-purple-500/25 text-[var(--text-main)]'
                            : isDone 
                            ? 'bg-emerald-500/5 border-emerald-500/25 text-[var(--text-main)]' 
                            : isPartial
                            ? 'bg-amber-500/5 border-amber-500/25 text-[var(--text-main)]'
                            : 'bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-main)]'
                        }`}
                      >
                        {/* Left: Avatar & Info */}
                        <div className="flex items-start gap-2.5 min-w-0 w-full sm:flex-1">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                            isCutiPerson ? 'bg-purple-600 text-white' : isDone ? 'bg-emerald-600 text-white' : isPartial ? 'bg-amber-600 text-white' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                          }`}>
                            {emp.name.charAt(0)}
                          </div>

                          <div className="min-w-0 flex-1 space-y-0.5">
                            {/* Line 1: Nama personil (selalu utuh, boleh turun baris) */}
                            <h5 className="font-bold text-xs text-[var(--text-main)] leading-snug break-words">{emp.name}</h5>

                            {/* Line 2: Badge target kewajiban & penanda verifikasi manual */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Obligation Tag Badge */}
                              <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase tracking-wider border shrink-0 ${
                                obligation.type === '2_TTA'
                                  ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-950 dark:text-rose-200 border-rose-300 dark:border-rose-700'
                                  : obligation.type === '1_KTA_OR_TTA'
                                  ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-950 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                                  : 'bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                              }`}>
                                🎯 {obligation.label}
                              </span>

                              {emp.isManualOverride && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 dark:bg-blue-950/70 text-blue-950 dark:text-blue-200 border border-blue-300 shrink-0" title={`Diverifikasi Manual pada ${selectedWeek}`}>
                                  Manual
                                </span>
                              )}
                            </div>

                            {/* Line 3: Jabatan */}
                            <p className="text-[10px] text-[var(--text-muted)] break-words font-medium">
                              {emp.jabatan || 'Personil'}
                            </p>

                            {/* Line 4: Ceklis interaktif kewajiban KTA/TTA */}
                            {!isCutiPerson && (
                              <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                                {/* Item 1 */}
                                {checkDetails.check1Done ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (checkDetails.check1Proof) {
                                        openImageLightbox(
                                          checkDetails.check1Proof,
                                          `Bukti ${checkDetails.check1Label || 'KTA'} - ${emp.name}`,
                                          emp.name,
                                          checkDetails.check1Label?.includes('TTA') ? 'TTA' : 'KTA',
                                          emp.week || selectedWeek,
                                          emp.completedAt,
                                          undefined,
                                          checkDetails.check1Proof
                                        );
                                      } else {
                                        toast.info(`Laporan ${checkDetails.check1Label} telah tercatat.`);
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                    title={`Klik untuk melihat bukti screenshot ${checkDetails.check1Label}`}
                                  >
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                    <span>{checkDetails.check1Label || 'Check 1'}</span>
                                    {checkDetails.check1Proof && <Eye className="w-2.5 h-2.5 opacity-60 ml-0.5" />}
                                  </button>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-muted)] font-medium text-[10px] flex items-center gap-1">
                                    <span className="w-2.5 h-2.5 rounded-full border border-slate-400 dark:border-slate-500 inline-block" />
                                    <span>{checkDetails.check1Label || 'Check 1'} Belum</span>
                                  </span>
                                )}

                                {/* Item 2 (for 1 KTA & 1 TTA or 2 TTA) */}
                                {(obligation.type === '1_KTA_AND_1_TTA' || obligation.type === '2_TTA') && (
                                  checkDetails.check2Done ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (checkDetails.check2Proof) {
                                          openImageLightbox(
                                            checkDetails.check2Proof,
                                            `Bukti ${checkDetails.check2Label || 'TTA'} - ${emp.name}`,
                                            emp.name,
                                            checkDetails.check2Label?.includes('KTA') ? 'KTA' : 'TTA',
                                            emp.week || selectedWeek,
                                            emp.completedAt,
                                            undefined,
                                            checkDetails.check2Proof
                                          );
                                        } else {
                                          toast.info(`Laporan ${checkDetails.check2Label} telah tercatat.`);
                                        }
                                      }}
                                      className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 border border-emerald-300 dark:border-emerald-700 text-emerald-950 dark:text-emerald-200 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                      title={`Klik untuk melihat bukti screenshot ${checkDetails.check2Label}`}
                                    >
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span>{checkDetails.check2Label || 'Check 2'}</span>
                                      {checkDetails.check2Proof && <Eye className="w-2.5 h-2.5 opacity-60 ml-0.5" />}
                                    </button>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-lg bg-[var(--card-bg)] border border-[var(--border-main)] text-[var(--text-muted)] font-medium text-[10px] flex items-center gap-1">
                                      <span className="w-2.5 h-2.5 rounded-full border border-slate-400 dark:border-slate-500 inline-block" />
                                      <span>{checkDetails.check2Label || 'Check 2'} Belum</span>
                                    </span>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Baris aksi: turun ke bawah kartu di drawer sempit, sejajar kanan di layar lebar */}
                        <div className={`flex items-center gap-1.5 flex-wrap w-full justify-start pt-2 border-t border-[var(--border-main)]/50 ${isFloating ? '' : 'sm:w-auto sm:shrink-0 sm:justify-end sm:pt-0 sm:border-t-0'}`}>
                          {/* Set Sudah / Reset Button KTA */}
                          {isDevUser && !isCutiPerson && (!isDone || emp.isManualOverride) && (
                            <button
                              onClick={() => handleToggleSudahKta(emp.nik, emp.status, emp.isManualOverride)}
                              className={isDone && emp.isManualOverride ? btnNeutral : btnPrimary}
                              title={isDone && emp.isManualOverride ? `Kembalikan ke Deteksi Otomatis (${selectedWeek})` : `Tandai Sudah KTA Secara Manual (${selectedWeek})`}
                            >
                              {isDone && emp.isManualOverride ? (
                                <><RotateCcw className="w-3 h-3 shrink-0" /> Reset</>
                              ) : (
                                <><Check className="w-3 h-3 shrink-0" /> Set Sudah</>
                              )}
                            </button>
                          )}

                          {/* Set Cuti Button */}
                          {isDevUser && (
                            <button
                              onClick={() => handleToggleCuti(emp.nik, !!isCutiPerson)}
                              className={btnNeutral}
                              title={isCutiPerson ? "Kembalikan ke Status Wajib KTA/TTA" : "Tandai Karyawan Sedang Cuti"}
                            >
                              {isCutiPerson ? (
                                <><UserCheck className="w-3 h-3 shrink-0 text-[var(--primary)]" /> Set Wajib</>
                              ) : (
                                <><UserX className="w-3 h-3 shrink-0 text-[var(--text-muted)]" /> Set Cuti</>
                              )}
                            </button>
                          )}

                          {isCutiPerson ? (
                            <span className="px-2 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-950 dark:text-purple-200 border border-purple-300 text-[10px] font-bold">
                              CUTI
                            </span>
                          ) : isDone ? (
                            <span className="px-2 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 border border-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                              ✓ LENGKAP ({checkDetails.summaryProgress})
                            </span>
                          ) : (
                            <>
                              {isPartial && (
                                <span className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border border-amber-300 text-[10px] font-extrabold">
                                  ⚠️ Kurang 1
                                </span>
                              )}

                              {canRemind ? (
                                <button
                                  onClick={() => handleSendKtaReminder(emp)}
                                  disabled={remindedKtaNiks.has(emp.nik)}
                                  className={remindedKtaNiks.has(emp.nik) ? btnMuted : btnNeutral}
                                  title={`Kirim Push Notifikasi Pengingat KTA ke akun ${emp.name}`}
                                >
                                  {remindedKtaNiks.has(emp.nik) ? (
                                    <>
                                      <Check className="w-3 h-3 shrink-0 text-[var(--primary)]" /> Diingatkan
                                    </>
                                  ) : (
                                    <>
                                      <Bell className="w-3 h-3 shrink-0 text-amber-500" /> {isPartial ? 'Ingatkan (Baru 1x)' : 'Ingatkan'}
                                    </>
                                  )}
                                </button>
                              ) : (
                                <span className="px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-950 dark:text-amber-200 border border-amber-300 text-[10px] font-bold">
                                  BELUM
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── MODAL 1: INTERACTIVE PDF VIEWER ── */}
      {pdfModal.isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="p-3 sm:p-4 border-b border-[var(--border-main)] flex items-center justify-between gap-2 shrink-0 bg-[var(--card-bg)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-500 border border-blue-500/30 flex items-center justify-center font-bold shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-[var(--text-main)] truncate uppercase font-mono">
                    {pdfModal.title}
                  </h3>
                  {pdfModal.senderName && (
                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                      Inspektor: {pdfModal.senderName}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={getPdfEmbedUrl(pdfModal.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 px-2.5 rounded-xl bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-main)] text-[11px] font-bold flex items-center gap-1 transition-colors"
                  title="Buka di Tab Baru (Viewer)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tab Baru</span>
                </a>

                <button
                  onClick={closePdfModal}
                  className="w-8 h-8 rounded-xl bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors font-bold shrink-0 cursor-pointer"
                  title="Tutup Pratinjau PDF"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body / Embedded Iframe Viewer */}
            <div className="flex-1 bg-slate-900 relative min-h-0 w-full">
              <iframe
                src={getPdfEmbedUrl(pdfModal.url)}
                className="w-full h-full border-0 rounded-b-3xl"
                title="PDF Viewer"
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: LIGHTBOX SCREENSHOT PREVIEW MODAL ── */}
      {imageLightbox.isOpen && (
        <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Lightbox Header */}
            <div className="p-3.5 sm:p-4 border-b border-[var(--border-main)] flex items-center justify-between gap-2 shrink-0 bg-[var(--card-bg)]">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 border border-amber-500/30 flex items-center justify-center font-bold shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-xs sm:text-sm text-[var(--text-main)] truncate">
                      {imageLightbox.title}
                    </h3>
                    {imageLightbox.reportType && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/20 text-amber-600 border border-amber-500/40">
                        {imageLightbox.reportType}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] truncate">
                    Pelapor: {imageLightbox.senderName || 'Staff'} • Periode {imageLightbox.week || selectedWeek}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={getDriveOpenUrl(imageLightbox.rawUrl || imageLightbox.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="h-8 px-2.5 rounded-xl bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] border border-[var(--border-main)] text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Buka File di Google Drive"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Buka Drive</span>
                </a>

                <button
                  onClick={closeImageLightbox}
                  className="w-8 h-8 rounded-xl bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors font-bold shrink-0 cursor-pointer"
                  title="Tutup Pratinjau"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lightbox Body: Image */}
            <div className="flex-1 bg-black/90 relative min-h-0 w-full flex items-center justify-center p-3 overflow-auto">
              <img 
                src={formatKtaImageUrl(imageLightbox.url)} 
                alt="Bukti Screenshot KTA/TTA"
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-lg"
                onError={(e) => {
                  const driveId = getDriveFileId(imageLightbox.rawUrl || imageLightbox.url);
                  if (driveId && !(e.currentTarget.src.includes('/api/drive/view/'))) {
                    e.currentTarget.src = `/api/drive/view/${driveId}`;
                  }
                }}
              />
            </div>

            {/* Lightbox Footer Notes (if any) */}
            {imageLightbox.description && (
              <div className="p-3 border-t border-[var(--border-main)] bg-[var(--card-bg)] text-xs text-[var(--text-main)] leading-relaxed">
                <span className="font-bold text-[var(--primary)] mr-1">Temuan Bahaya / Keterangan:</span>
                {imageLightbox.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 3: KIRIM BUKTI LAPORAN KTA / TTA (SEDERHANA & PROPOSIONAL) ── */}
      {showKtaModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl w-full max-w-sm sm:max-w-md flex flex-col overflow-hidden shadow-2xl relative">
            
            {/* Modal Header */}
            <div className="p-3.5 sm:p-4 border-b border-[var(--border-main)] flex items-center justify-between gap-2 shrink-0 bg-gradient-to-r from-amber-500/10 to-transparent">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center font-bold text-base shadow-md shadow-amber-500/20 shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-xs sm:text-sm text-[var(--text-main)]">
                    Kirim Bukti KTA / TTA
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] truncate">
                    Pelapor: {inspectorName} ({inspectorNik}) • {currentActiveWeek}
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setShowKtaModal(false); setKtaImageFile(null); setKtaImagePreview(null); }}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--input-bg)] text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors font-bold shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmitKtaReport} className="p-4 sm:p-5 space-y-3.5">
              
              {/* GOOGLE FORM HELPER BANNER */}
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-2.5 px-3 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] text-[var(--text-main)] font-medium truncate">
                    Belum isi formulir Safety?
                  </span>
                </div>

                <a
                  href={getKtaUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold shrink-0 flex items-center gap-1 shadow-xs transition-colors"
                >
                  <span>Buka Form</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* PENGINGAT JIKA BARU 1X UNGGAH DARI KEWAJIBAN */}
              {myObligation.type !== '1_KTA_OR_TTA' && (
                (myKtaRecord?.checkDetails?.check1Done && !myKtaRecord?.checkDetails?.check2Done) ||
                (!myKtaRecord?.checkDetails?.check1Done && myKtaRecord?.checkDetails?.check2Done) ||
                myKtaRecord?.checkDetails?.summaryProgress === '1/2'
              ) && (
                <div className="bg-amber-500/15 border border-amber-500/35 rounded-2xl p-2.5 px-3 flex items-start gap-2.5 text-xs animate-in fade-in">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-extrabold text-[11px] text-amber-600">
                      ⚠️ Pengingat: Baru Mengunggah 1x Laporan
                    </p>
                    <p className="text-[10px] text-[var(--text-main)] leading-relaxed mt-0.5">
                      Anda baru mengunggah <strong>1x</strong> dari total kewajiban Anda (<strong>{myObligation.label}</strong>). Silakan lengkapi 1 laporan lagi pada minggu ini (<strong>{currentActiveWeek}</strong>).
                    </p>
                  </div>
                </div>
              )}

              {/* STATUS KEWAJIBAN USER & CEKLIS PROGRESS */}
              <div className="bg-[var(--input-bg)] border border-[var(--border-main)] rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Kewajiban ({currentActiveWeek}):
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 font-extrabold text-[11px] border border-amber-500/30">
                    🎯 {myObligation.label}
                  </span>
                </div>

                {/* Checklist Progress Cards */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border-main)]">
                  {myObligation.type === '1_KTA_OR_TTA' ? (
                    <div className={`col-span-2 p-2 rounded-xl border flex items-center justify-between text-xs ${
                      myKtaRecord?.checkDetails?.check1Done
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                        : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)]'
                    }`}>
                      <span className="font-bold flex items-center gap-1.5">
                        {myKtaRecord?.checkDetails?.check1Done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-[var(--text-muted)] inline-block" />}
                        1 Laporan KTA / TTA
                      </span>
                      <span className="text-[10px] font-bold">{myKtaRecord?.checkDetails?.check1Done ? 'Terpenuhi (1/1)' : 'Belum (0/1)'}</span>
                    </div>
                  ) : myObligation.type === '2_TTA' ? (
                    <>
                      <div className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                        myKtaRecord?.checkDetails?.check1Done
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)]'
                      }`}>
                        <span className="font-bold flex items-center gap-1.5">
                          {myKtaRecord?.checkDetails?.check1Done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-[var(--text-muted)] inline-block" />}
                          TTA 1
                        </span>
                        <span className="text-[10px] font-bold">{myKtaRecord?.checkDetails?.check1Done ? '✓ Ada' : 'Kurang'}</span>
                      </div>

                      <div className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                        myKtaRecord?.checkDetails?.check2Done
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)]'
                      }`}>
                        <span className="font-bold flex items-center gap-1.5">
                          {myKtaRecord?.checkDetails?.check2Done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-[var(--text-muted)] inline-block" />}
                          TTA 2
                        </span>
                        <span className="text-[10px] font-bold">{myKtaRecord?.checkDetails?.check2Done ? '✓ Ada' : 'Kurang'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                        myKtaRecord?.checkDetails?.check1Done
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)]'
                      }`}>
                        <span className="font-bold flex items-center gap-1.5">
                          {myKtaRecord?.checkDetails?.check1Done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-[var(--text-muted)] inline-block" />}
                          1 KTA
                        </span>
                        <span className="text-[10px] font-bold">{myKtaRecord?.checkDetails?.check1Done ? '✓ Ada' : 'Kurang'}</span>
                      </div>

                      <div className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                        myKtaRecord?.checkDetails?.check2Done
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                          : 'bg-[var(--card-bg)] border-[var(--border-main)] text-[var(--text-muted)]'
                      }`}>
                        <span className="font-bold flex items-center gap-1.5">
                          {myKtaRecord?.checkDetails?.check2Done ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <span className="w-3.5 h-3.5 rounded-full border border-[var(--text-muted)] inline-block" />}
                          1 TTA
                        </span>
                        <span className="text-[10px] font-bold">{myKtaRecord?.checkDetails?.check2Done ? '✓ Ada' : 'Kurang'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* PILIHAN CEKLIS YANG INGIN DIPENUHI DENGAN 1 FOTO INI */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-main)]">
                    Centang Ceklis yang Dipenuhi dengan Foto Ini:
                  </label>
                  <span className="text-[10px] text-emerald-600 font-bold">
                    💡 1 foto bisa untuk semua ceklis
                  </span>
                </div>

                {myObligation.type === '1_KTA_AND_1_TTA' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div 
                      onClick={() => toggleChecklist('KTA')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedChecklist.includes('KTA')
                          ? 'bg-amber-500/15 border-amber-500 text-amber-600 ring-2 ring-amber-500/30 shadow-xs'
                          : 'bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-muted)] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          selectedChecklist.includes('KTA') ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-400 dark:border-slate-600'
                        }`}>
                          {selectedChecklist.includes('KTA') && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-bold text-xs leading-tight">1 KTA</p>
                          <p className="text-[9px] opacity-75">Kondisi Tidak Aman</p>
                        </div>
                      </div>
                      {myKtaRecord?.checkDetails?.check1Done && (
                        <span className="text-[9px] font-bold text-emerald-600 shrink-0">✓ Ada</span>
                      )}
                    </div>

                    <div 
                      onClick={() => toggleChecklist('TTA')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedChecklist.includes('TTA')
                          ? 'bg-rose-500/15 border-rose-500 text-rose-600 ring-2 ring-rose-500/30 shadow-xs'
                          : 'bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-muted)] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          selectedChecklist.includes('TTA') ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-400 dark:border-slate-600'
                        }`}>
                          {selectedChecklist.includes('TTA') && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-bold text-xs leading-tight">1 TTA</p>
                          <p className="text-[9px] opacity-75">Tindakan Tidak Aman</p>
                        </div>
                      </div>
                      {myKtaRecord?.checkDetails?.check2Done && (
                        <span className="text-[9px] font-bold text-emerald-600 shrink-0">✓ Ada</span>
                      )}
                    </div>
                  </div>
                )}

                {myObligation.type === '2_TTA' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div 
                      onClick={() => toggleChecklist('TTA_1')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedChecklist.includes('TTA_1')
                          ? 'bg-rose-500/15 border-rose-500 text-rose-600 ring-2 ring-rose-500/30 shadow-xs'
                          : 'bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-muted)] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          selectedChecklist.includes('TTA_1') ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-400 dark:border-slate-600'
                        }`}>
                          {selectedChecklist.includes('TTA_1') && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-bold text-xs leading-tight">TTA 1</p>
                          <p className="text-[9px] opacity-75">Laporan Pertama</p>
                        </div>
                      </div>
                      {myKtaRecord?.checkDetails?.check1Done && (
                        <span className="text-[9px] font-bold text-emerald-600 shrink-0">✓ Ada</span>
                      )}
                    </div>

                    <div 
                      onClick={() => toggleChecklist('TTA_2')}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                        selectedChecklist.includes('TTA_2')
                          ? 'bg-rose-500/15 border-rose-500 text-rose-600 ring-2 ring-rose-500/30 shadow-xs'
                          : 'bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-muted)] opacity-60 hover:opacity-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                          selectedChecklist.includes('TTA_2') ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-400 dark:border-slate-600'
                        }`}>
                          {selectedChecklist.includes('TTA_2') && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <p className="font-bold text-xs leading-tight">TTA 2</p>
                          <p className="text-[9px] opacity-75">Laporan Kedua</p>
                        </div>
                      </div>
                      {myKtaRecord?.checkDetails?.check2Done && (
                        <span className="text-[9px] font-bold text-emerald-600 shrink-0">✓ Ada</span>
                      )}
                    </div>
                  </div>
                )}

                {myObligation.type === '1_KTA_OR_TTA' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedChecklist(['KTA'])}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        selectedChecklist.includes('KTA')
                          ? 'bg-amber-500/20 border-amber-500 text-amber-600 ring-2 ring-amber-500/40 shadow-xs'
                          : 'bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-muted)]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>KTA (Kondisi Tidak Aman)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedChecklist(['TTA'])}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        selectedChecklist.includes('TTA')
                          ? 'bg-rose-500/20 border-rose-500 text-rose-600 ring-2 ring-rose-500/40 shadow-xs'
                          : 'bg-[var(--input-bg)] border-[var(--border-main)] text-[var(--text-muted)]'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                      <span>TTA (Tindakan Tidak Aman)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* UPLOAD BUKTI SCREENSHOT FORM (WITH CLIPBOARD PASTE SUPPORT) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[var(--text-main)]">
                    Lampirkan Bukti Screenshot Form:
                  </label>
                  <span className="text-[10px] text-[var(--primary)] font-semibold">
                    💡 Bisa langsung Paste (Ctrl+V)
                  </span>
                </div>

                {ktaImagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-black/40 group aspect-video max-h-52 flex items-center justify-center shadow-md">
                    <img
                      src={ktaImagePreview}
                      alt="Pratinjau Screenshot"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => { setKtaImageFile(null); setKtaImagePreview(null); }}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-rose-500 text-white text-[10px] font-bold shadow-md hover:bg-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus / Ganti
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[var(--border-main)] hover:border-[var(--primary)] bg-[var(--input-bg)] rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                    <div className="w-11 h-11 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-main)]">
                      Klik untuk pilih gambar atau tekan Ctrl + V
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-1">
                      Mendukung tangkapan layar (PNG, JPG, WebP)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setKtaImageFile(file);
                          const reader = new FileReader();
                          reader.onload = (re) => {
                            setKtaImagePreview(re.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowKtaModal(false); setKtaImageFile(null); setKtaImagePreview(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs font-bold hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingKta || (!ktaImageFile && !ktaImagePreview) || selectedChecklist.length === 0}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmittingKta ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengirim...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {selectedChecklist.length > 1 
                          ? `Kirim 1 Foto (${selectedChecklist.length} Ceklis Sekaligus)` 
                          : `Kirim Bukti (1 Ceklis: ${selectedChecklist[0]?.replace('_', ' ') || 'Laporan'})`}
                      </span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: SINGLE UPLOAD REMINDER POPUP (JIKA HANYA 1X DARI 2 KEWAJIBAN) ── */}
      {showSingleUploadReminderModal && (
        <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border-2 border-amber-500/40 rounded-3xl w-full max-w-sm sm:max-w-md overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            {/* Header with Glowing Icon */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 p-6 text-white text-center relative overflow-hidden">
              <div className="w-14 h-14 mx-auto mb-3 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg animate-bounce">
                <AlertTriangle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight">
                PENGINGAT KEWAJIBAN LAPORAN
              </h3>
              <p className="text-xs text-amber-100 mt-1 font-medium">
                Kepatuhan Keselamatan Kerja • {currentActiveWeek}
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4 text-center">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-[var(--text-main)] text-xs sm:text-sm font-semibold leading-relaxed">
                Halo <strong>{inspectorName}</strong>, Anda baru mengunggah <strong>1x</strong> dari total kewajiban <strong>{singleUploadObligationLabel || '2 Laporan'}</strong> pada <strong>{currentActiveWeek}</strong>.
              </div>

              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                Kewajiban Anda belum 100% lengkap. Mohon segera melengkapi <strong>1 laporan lagi</strong> sebelum periode minggu ini berakhir agar target kepatuhan Anda lengkap terpenuhi.
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSingleUploadReminderModal(false);
                    setShowKtaModal(true);
                  }}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 text-xs sm:text-sm transition-all cursor-pointer transform active:scale-95"
                >
                  <Camera className="w-4 h-4" />
                  <span>Upload 1 Laporan Lagi Sekarang</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSingleUploadReminderModal(false)}
                  className="w-full py-2.5 text-xs text-[var(--text-muted)] font-bold hover:text-[var(--text-main)] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Mengerti / Nanti Saja</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL 5: UPLOAD BUKTI SS FORM GENERAL INSPEKSI ── */}
      {showSsModal && (
        <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-[var(--border-main)] flex items-center justify-between bg-gradient-to-r from-blue-600/15 via-blue-500/10 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-[var(--text-main)]">
                    Upload Bukti Screenshot General Inspeksi
                  </h3>
                  <p className="text-[10px] sm:text-xs text-[var(--text-muted)]">
                    Syarat Wajib Rekapan Inspeksi • <span className="font-bold text-blue-600">{currentActiveWeek}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowSsModal(false); setSsImageFile(null); setSsImagePreview(null); }}
                className="w-8 h-8 rounded-full bg-[var(--input-bg)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitSsReport} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              
              {/* Info & Google Form Link */}
              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="text-[11px] leading-relaxed text-[var(--text-main)] min-w-0">
                  <p className="font-bold">Ketentuan Rekap Status Inspeksi:</p>
                  <p className="text-[10px] opacity-90 mt-0.5">
                    Formulir inspeksi (PDF) terekap otomatis di server. Screenshot bukti pengisian form general inspeksi wajib diunggah agar status laporan Anda dinyatakan <strong>SUDAH</strong>.
                  </p>
                </div>
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLScOJSC6wcLsJ26YcmwWndj0Hb9x5V48XHTdHWkPzbH2XwN8ww/viewform"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 self-start sm:self-center shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Form Inspeksi</span>
                </a>
              </div>

              {/* Data Personil Badge */}
              <div className="p-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-main)] flex items-center justify-between text-xs">
                <div className="min-w-0">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Pelapor:</span>
                  <p className="font-bold text-[var(--text-main)] truncate">{inspectorName} ({inspectorNik})</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Periode Minggu:</span>
                  <span className="font-mono font-bold text-blue-600">{currentActiveWeek}</span>
                </div>
              </div>

              {/* Dropzone Screenshot */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[var(--text-main)]">
                    Lampirkan Bukti Tangkapan Layar (Screenshot):
                  </label>
                  <span className="text-[10px] text-blue-600 font-semibold">
                    💡 Bisa langsung Paste (Ctrl+V)
                  </span>
                </div>

                {ssImagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-black/40 group aspect-video max-h-56 flex items-center justify-center shadow-md">
                    <img
                      src={ssImagePreview}
                      alt="Pratinjau Screenshot Form General Inspeksi"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => { setSsImageFile(null); setSsImagePreview(null); }}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-xl bg-rose-500 text-white text-[10px] font-bold shadow-md hover:bg-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus / Ganti
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-[var(--border-main)] hover:border-blue-500 bg-[var(--input-bg)] rounded-2xl p-6 sm:p-7 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-[var(--text-main)]">
                      Klik untuk pilih tangkapan layar atau tekan Ctrl + V
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)] mt-1">
                      Mendukung format PNG, JPG, JPEG, WebP
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSsImageFile(file);
                          const reader = new FileReader();
                          reader.onload = (re) => {
                            setSsImagePreview(re.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setShowSsModal(false); setSsImageFile(null); setSsImagePreview(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-[var(--text-main)] text-xs font-bold hover:bg-[var(--bg-main)] transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingSs || (!ssImageFile && !ssImagePreview)}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSubmittingSs ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Bukti Screenshot</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

{/* ── FLOATING POPUP WIDGET COMPONENT (BOTTOM-RIGHT CORNER) ── */}
export function GroupReportFloatingWidget({ inspectorName, inspectorNik, inspectorRole, inspectorSection, isDeveloper = false }: {
  inspectorName: string;
  inspectorNik: string;
  inspectorRole?: string;
  inspectorSection?: string;
  isDeveloper?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasDismissedDot, setHasDismissedDot] = useState(() => {
    try {
      return sessionStorage.getItem('group_widget_dot_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggle = () => {
    if (!isOpen) {
      setHasDismissedDot(true);
      try {
        sessionStorage.setItem('group_widget_dot_dismissed', 'true');
      } catch {}
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* FLOATING HAZARD SAFETY ICON BUTTON (POSITIONED ABOVE BOTTOM NAVBAR) */}
      <div className="fixed bottom-22 right-4 sm:bottom-24 sm:right-6 z-40">
        <button
          onClick={handleToggle}
          className="group relative w-13 h-13 sm:w-14 sm:h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 border-2 border-white/30 ring-4 ring-emerald-500/20 cursor-pointer"
          title="Grup Safety & Rekap Laporan"
        >
          {/* Notification Badge */}
          {!hasDismissedDot && !isOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-md animate-bounce">
              •
            </span>
          )}

          <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
        </button>
      </div>

      {/* FLOATING POPUP DRAWER WINDOW (POSITIONED ABOVE BOTTOM NAVBAR) */}
      {isOpen && (
        <div className="fixed bottom-[5.8rem] right-3 sm:bottom-[6.2rem] sm:right-6 w-[calc(100vw-24px)] sm:w-[480px] h-[600px] max-h-[85vh] z-50 bg-[var(--card-bg)] border border-[var(--border-main)] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 fade-in duration-300">
          <GroupReportScreen
            inspectorName={inspectorName}
            inspectorNik={inspectorNik}
            inspectorRole={inspectorRole}
            inspectorSection={inspectorSection}
            onClose={() => setIsOpen(false)}
            isFloating={true}
            isDeveloper={isDeveloper}
          />
        </div>
      )}
    </>
  );
}
