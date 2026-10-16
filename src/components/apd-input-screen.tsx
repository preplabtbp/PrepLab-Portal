import { toast } from 'sonner';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, AlertTriangle, Calendar, User, Save, Package, Trash2, Plus, PlusCircle, UserPlus, CheckCircle2, Upload, Loader2, ExternalLink, Download, X, FileText, ArrowLeft, Shield, ChevronLeft, ChevronRight, Lock, Table, List, Check, Pencil, ShieldCheck, History, Sparkles } from 'lucide-react';
import { ImageModal } from './image-modal';
import { Button, Input, Select } from './ui';

import { addMonths, isBefore, parseISO, format, startOfDay } from 'date-fns';
import { useApdInput, ApdEntry, getHistoryIgnoreCase } from '../features/apd/hooks/useApdInput';
import { parseGoogleDriveId } from '../lib/p5m-flyer';

import { getApdSettings, getApdHistoryByNik, recordApdTakes, getEmployees, addEmployee, generateApdDocument, uploadApdProof, uploadPhotoToDrive, updateApdHistoryDate, deleteApdHistoryEntry, addManualApdHistory } from '../sheets-api';
import { PageHeader } from './PageHeader';

const APD_TYPES = [
  "Earplug",
  "Stagen",
  "Safety Glass",
  "Filter Masker Moncong (3M)",
  "Masker Moncong (3M)",
  "Earmuff",
  "Sandal Safety",
  "Jas Laboratorium",
  "Safety Vest (Rompi)",
  "Rompi Hijau",
  "Sepatu Safety"
];

// Role check: Hanya Section Inventory Control, Developer, dan Manager yang memiliki hak akses edit/hapus/ganti tanggal
export const checkCanEditApdHistory = (
  userNik?: string | null,
  userName?: string | null,
  allEmployees: any[] = []
): { canEdit: boolean; roleLabel: string } => {
  const cleanNik = (userNik || '').trim().toUpperCase();
  const cleanName = (userName || '').trim().toLowerCase();

  // 1. Developer Check (Berdasarkan NIK terdaftar Developer & System Admin)
  const devNiks = ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN', 'MEETINGROOM', 'MEETINGROOMGTS'];
  if (devNiks.includes(cleanNik)) {
    return { canEdit: true, roleLabel: 'Developer' };
  }

  // Cek profil dari localStorage
  let savedProfile: any = null;
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('p2h_inspector_profile') : null;
    if (raw) savedProfile = JSON.parse(raw);
  } catch {}

  const profileSec = (savedProfile?.section || savedProfile?.department || savedProfile?.bagian || '').toLowerCase();
  const profileJab = (savedProfile?.jabatan || (typeof localStorage !== 'undefined' ? localStorage.getItem('p2h_inspector_jabatan') : '') || '').toLowerCase();
  const profileRole = (savedProfile?.role || '').toLowerCase();

  if (profileRole.includes('dev') || profileJab.includes('developer')) {
    return { canEdit: true, roleLabel: 'Developer' };
  }

  // 2. Manager Check
  const managerNiks = ['04D20020842']; // Pak Deni Nugraha Perdiana
  if (managerNiks.includes(cleanNik) || profileJab.includes('manager') || profileRole.includes('manager')) {
    return { canEdit: true, roleLabel: 'Manager' };
  }

  // 3. Section Inventory Control Check
  const isInventory = (text: string) => {
    const t = text.toLowerCase();
    return t.includes('inventory') || t.includes('gudang') || t.includes('warehouse') || t.includes('logistik') || t.includes('logistic');
  };

  if (isInventory(profileSec) || isInventory(profileJab) || isInventory(profileRole)) {
    return { canEdit: true, roleLabel: 'Section Inventory Control' };
  }

  // Cek pencocokan karyawan di database
  const matchedEmp = allEmployees.find(e => {
    const eNik = (e.nik || '').toUpperCase().trim();
    const eName = (e.name || e.nama || '').toLowerCase().trim();
    return (cleanNik && eNik === cleanNik) || (cleanName && eName === cleanName);
  });

  if (matchedEmp) {
    const empSec = (matchedEmp.section || matchedEmp.department || matchedEmp.bagian || '').toLowerCase();
    const empJab = (matchedEmp.jabatan || '').toLowerCase();
    const empRole = (matchedEmp.role || '').toLowerCase();

    if (empRole.includes('dev') || empJab.includes('developer')) {
      return { canEdit: true, roleLabel: 'Developer' };
    }
    if (empJab.includes('manager') || empRole.includes('manager') || (matchedEmp.nik || '').toUpperCase() === '04D20020842') {
      return { canEdit: true, roleLabel: 'Manager' };
    }
    if (isInventory(empSec) || isInventory(empJab) || isInventory(empRole)) {
      return { canEdit: true, roleLabel: 'Section Inventory Control' };
    }
  }

  return { canEdit: false, roleLabel: 'Unauthorized' };
};

const getIntervalIgnoreCase = (intervals: Record<string, number>, key: string) => {
  if (!intervals) return 0;
  const found = Object.keys(intervals).find(k => k.toLowerCase() === key.toLowerCase());
  return found ? intervals[found] : 0;
};

export interface ApdInputScreenProps {
  onBack?: () => void;
  onNav?: (tab: string) => void;
  inspectorNik?: string;
  inspectorName?: string;
}

export function ApdInputScreen({ onBack, onNav, inspectorNik, inspectorName }: ApdInputScreenProps = {}) {
  const {
    searchQuery, setSearchQuery,
    isSearching, setIsSearching,
    showAddedPopup, setShowAddedPopup,
    employeeData, setEmployeeData,
    intervals, setIntervals,
    employees, setEmployees,
    uniqueJabatan, uniqueDivisi, uniqueGrup,
    showAddEmployee, setShowAddEmployee,
    newEmployee, setNewEmployee,
    isAddingEmployee, setIsAddingEmployee,
    showDropdown, setShowDropdown,
    tanggal, setTanggal,
    entries, setEntries,
    isSubmitting, setIsSubmitting,
    signatureRef,
    uploadingApd,
    handleUploadProof
  } = useApdInput();

  // State for interactive APD PDF / Document viewer modal
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    title: string;
    date: string;
    employeeName: string;
    nik: string;
  } | null>(null);

  // State untuk jendela mengambang detail APD
  const [selectedApdModal, setSelectedApdModal] = useState<string | null>(null);
  // State untuk mode tampilan APD: 'table' (Tabel) atau 'list' (Data List)
  const [apdViewMode, setApdViewMode] = useState<'table' | 'list'>('table');
  const [apdFilterQuery, setApdFilterQuery] = useState('');
  const [apdStatusTab, setApdStatusTab] = useState<'all' | 'eligible' | 'waiting' | 'never'>('all');
  const pcScrollRef = useRef<HTMLDivElement>(null);

  // State untuk upload BA Kerusakan Barang (PDF) jika belum waktunya pengambilan
  const [baKerusakanFile, setBaKerusakanFile] = useState<{ file?: File; name: string; url?: string } | null>(null);
  const [isUploadingBa, setIsUploadingBa] = useState(false);

  // Access control: Hanya Section Inventory Control, Developer, dan Manager
  const permissionInfo = useMemo(() => {
    return checkCanEditApdHistory(inspectorNik, inspectorName, employees);
  }, [inspectorNik, inspectorName, employees]);
  const canEditApdHistory = permissionInfo.canEdit;

  // History edit & delete states
  const [editingEntryIdx, setEditingEntryIdx] = useState<number | null>(null);
  const [editDateValue, setEditDateValue] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);
  const [isDeletingHistory, setIsDeletingHistory] = useState<boolean>(false);

  const [showAddManualForm, setShowAddManualForm] = useState<boolean>(false);
  const [manualCustomDate, setManualCustomDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [isAddingManualHistory, setIsAddingManualHistory] = useState<boolean>(false);

  const handleCloseModal = () => {
    setSelectedApdModal(null);
    setBaKerusakanFile(null);
    setEditingEntryIdx(null);
    setConfirmDeleteIdx(null);
    setShowAddManualForm(false);
  };

  const handleSaveEditDate = async (histObj: any, newDateStr: string) => {
    if (!canEditApdHistory) {
      toast.error('Akses ditolak. Pengeditan riwayat hanya untuk Section Inventory Control, Developer & Manager.');
      return;
    }
    if (!newDateStr) {
      toast.error('Silakan tentukan tanggal baru');
      return;
    }
    if (!selectedApdModal || !employeeData) return;
    const apd = selectedApdModal;
    setIsSavingEdit(true);
    try {
      const rawOldDate = typeof histObj === 'string' ? histObj : histObj.date;
      const res = await updateApdHistoryDate({
        id: histObj.id,
        nik: employeeData.nik,
        itemName: apd,
        newDate: newDateStr,
        oldDate: rawOldDate,
        updaterNik: inspectorNik,
        updaterName: inspectorName
      });

      if (res && res.status === 'ok') {
        let displayFormatted = newDateStr;
        try {
          displayFormatted = format(parseISO(newDateStr), 'dd/MM/yyyy');
        } catch {}
        toast.success(`Tanggal pengambilan ${apd} berhasil diubah ke ${displayFormatted}!`);

        setEmployeeData((prev: any) => {
          if (!prev) return prev;
          const newHist = { ...prev.history };
          const list = getHistoryIgnoreCase(newHist, apd) || [];
          const foundKey = Object.keys(newHist).find(k => k.toLowerCase() === apd.toLowerCase()) || apd;

          const updatedList = list.map((item: any) => {
            const itemId = typeof item === 'object' ? item.id : undefined;
            const itemDate = typeof item === 'string' ? item : item.date;
            if ((histObj.id && itemId === histObj.id) || itemDate === rawOldDate) {
              return typeof item === 'object'
                ? { ...item, date: newDateStr }
                : { date: newDateStr, url: '' };
            }
            return item;
          });

          updatedList.sort((a: any, b: any) => {
            const dA = new Date(typeof a === 'string' ? a : a.date).getTime();
            const dB = new Date(typeof b === 'string' ? b : b.date).getTime();
            return dA - dB;
          });

          newHist[foundKey] = updatedList;
          return { ...prev, history: newHist };
        });
        setEditingEntryIdx(null);
      } else {
        toast.error(res?.error || 'Gagal mengubah tanggal riwayat');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Terjadi kesalahan saat menyimpan perubahan tanggal');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteHistory = async (histObj: any) => {
    if (!canEditApdHistory) {
      toast.error('Akses ditolak. Penghapusan riwayat hanya untuk Section Inventory Control, Developer & Manager.');
      return;
    }
    if (!selectedApdModal || !employeeData) return;
    const apd = selectedApdModal;
    setIsDeletingHistory(true);
    try {
      const rawDate = typeof histObj === 'string' ? histObj : histObj.date;
      const res = await deleteApdHistoryEntry({
        id: histObj.id,
        nik: employeeData.nik,
        itemName: apd,
        date: rawDate,
        updaterNik: inspectorNik,
        updaterName: inspectorName
      });

      if (res && res.status === 'ok') {
        toast.success(`Riwayat pengambilan ${apd} berhasil dihapus!`);

        setEmployeeData((prev: any) => {
          if (!prev) return prev;
          const newHist = { ...prev.history };
          const list = getHistoryIgnoreCase(newHist, apd) || [];
          const foundKey = Object.keys(newHist).find(k => k.toLowerCase() === apd.toLowerCase()) || apd;

          const updatedList = list.filter((item: any) => {
            const itemId = typeof item === 'object' ? item.id : undefined;
            const itemDate = typeof item === 'string' ? item : item.date;
            if (histObj.id && itemId) {
              return itemId !== histObj.id;
            }
            return itemDate !== rawDate;
          });

          newHist[foundKey] = updatedList;
          return { ...prev, history: newHist };
        });
        setConfirmDeleteIdx(null);
      } else {
        toast.error(res?.error || 'Gagal menghapus riwayat');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Terjadi kesalahan saat menghapus data riwayat');
    } finally {
      setIsDeletingHistory(false);
    }
  };

  const handleAddManualHistory = async (customDateStr: string) => {
    if (!canEditApdHistory) {
      toast.error('Akses ditolak. Penambahan riwayat hanya untuk Section Inventory Control, Developer & Manager.');
      return;
    }
    if (!customDateStr) {
      toast.error('Silakan tentukan tanggal pengambilan');
      return;
    }
    if (!selectedApdModal || !employeeData) return;
    const apd = selectedApdModal;
    setIsAddingManualHistory(true);
    try {
      const res = await addManualApdHistory({
        nik: employeeData.nik,
        nama: employeeData.nama,
        itemName: apd,
        dateTaken: customDateStr,
        updaterNik: inspectorNik
      });

      if (res && res.status === 'ok') {
        let displayFormatted = customDateStr;
        try {
          displayFormatted = format(parseISO(customDateStr), 'dd/MM/yyyy');
        } catch {}
        toast.success(`Riwayat pengambilan ${apd} pada tanggal ${displayFormatted} berhasil ditambahkan!`);

        const newEntry = res.data ? {
          id: res.data.id,
          date: customDateStr,
          url: res.data.photoUrl || ''
        } : { date: customDateStr, url: '' };

        setEmployeeData((prev: any) => {
          if (!prev) return prev;
          const newHist = { ...prev.history };
          const list = getHistoryIgnoreCase(newHist, apd) || [];
          const foundKey = Object.keys(newHist).find(k => k.toLowerCase() === apd.toLowerCase()) || apd;
          const updatedList = [...list, newEntry];
          updatedList.sort((a: any, b: any) => {
            const dA = new Date(typeof a === 'string' ? a : a.date).getTime();
            const dB = new Date(typeof b === 'string' ? b : b.date).getTime();
            return dA - dB;
          });
          newHist[foundKey] = updatedList;
          return { ...prev, history: newHist };
        });
        setShowAddManualForm(false);
      } else {
        toast.error(res?.error || 'Gagal menambahkan riwayat');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Terjadi kesalahan saat menambahkan riwayat');
    } finally {
      setIsAddingManualHistory(false);
    }
  };

  const handleUploadBaKerusakan = async (apdName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      toast.error('File BA Kerusakan harus berformat PDF (.pdf)');
      e.target.value = '';
      return;
    }
    setIsUploadingBa(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string;
          const cleanApd = apdName.replace(/[^a-zA-Z0-9]/g, '_');
          const cleanNik = (employeeData?.nik || 'NIK').replace(/[^a-zA-Z0-9]/g, '_');
          const fileName = `BA_Kerusakan_${cleanNik}_${cleanApd}_${Date.now()}.pdf`;
          const uploadedUrl = await uploadPhotoToDrive(base64, 'application/pdf', fileName, 'Dokumen APD');
          setBaKerusakanFile({
            file,
            name: file.name,
            url: uploadedUrl || '',
          });
          toast.success(`BA Kerusakan (${file.name}) berhasil diunggah!`);
        } catch (err) {
          console.error('Upload drive error:', err);
          setBaKerusakanFile({
            file,
            name: file.name,
            url: '',
          });
          toast.success(`BA Kerusakan (${file.name}) siap dilampirkan.`);
        } finally {
          setIsUploadingBa(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      toast.error('Gagal membaca file PDF');
      setIsUploadingBa(false);
    }
  };



  const handleSearch = async (e?: React.FormEvent, forceNik?: string) => {
    if (e) e.preventDefault();
    const query = forceNik || searchQuery;
    if (!query.trim()) return;
    
    setIsSearching(true);
    setEmployeeData(null);
    setEntries([]);
    setShowAddEmployee(false);
    setShowDropdown(false);
    
    // Validate if employee exists safely
    const q = query.toLowerCase().trim();
    const emp = employees.find(emp => {
      const empNik = (emp.nik || '').toLowerCase().trim();
      const empNama = (emp.nama || (emp as any).name || '').toLowerCase().trim();
      return empNik === q || empNama === q;
    });
    
    if (!emp) {
      setIsSearching(false);
      setShowAddEmployee(true);
      // Pre-fill
      const isNumeric = /^\d+$/.test(query);
      setNewEmployee({ 
        nik: isNumeric ? query : '', 
        nama: !isNumeric ? query : '', 
        jabatan: '', divisi: '', grup: '' 
      });
      return;
    }
    
    const finalNik = emp.nik;
    setSearchQuery(finalNik);

    try {
      const historyMap = await getApdHistoryByNik(finalNik);
      
      setEmployeeData({
        nama: emp.nama,
        nik: emp.nik,
        jabatan: emp.jabatan,
        divisi: emp.divisi,
        grup: emp.grup,
        history: historyMap || {}
      });
      
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil data riwayat');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingEmployee(true);
    try {
      await addEmployee(newEmployee);
      toast.success('Karyawan berhasil ditambahkan');
      setEmployees(prev => [...prev, newEmployee]);
      setShowAddEmployee(false);
      handleSearch(undefined, newEmployee.nik);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menambahkan karyawan');
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return false;
    const empNik = (emp.nik || '').toLowerCase().trim();
    const empNama = (emp.nama || (emp as any).name || '').toLowerCase().trim();
    return empNama.includes(q) || empNik.includes(q);
  }).slice(0, 5);

  // Auto-search current logged in employee when screen loads
  useEffect(() => {
    if (inspectorNik && !searchQuery && !employeeData && employees.length > 0) {
      handleSearch(undefined, inspectorNik);
    }
  }, [inspectorNik, employees.length]);

  const getIntervalWarning = (apd: string, dateStr: string, history: any = null): string | null => {
    if (!history && employeeData) {
      history = employeeData.history;
    }
    if (!history) return null;

    const lastTakenDates = getHistoryIgnoreCase(history, apd) || [];
    if (lastTakenDates.length === 0) return null;

    // Urutkan dari yang terbaru, asumsikan yang terakhir di array adalah yang terbaru
    const lastObj = lastTakenDates[lastTakenDates.length - 1];
    const lastDateStr = typeof lastObj === 'string' ? lastObj : lastObj.date;
    const lastDate = parseISO(lastDateStr);
    
    const intervalMonths = getIntervalIgnoreCase(intervals, apd) || 0;
    
    // Hitung tanggal kapan boleh ambil lagi
    const nextAllowedDate = addMonths(lastDate, intervalMonths);
    const inputDate = startOfDay(parseISO(dateStr));
    
    if (isBefore(inputDate, startOfDay(nextAllowedDate))) {
      return `Terakhir ambil ${lastDateStr}. Interval ${intervalMonths} bln (Baru boleh: ${format(nextAllowedDate, 'dd-MM-yyyy')}).`;
    } 
    return null;
  };

  const getApdSummaryItem = (apd: string) => {
    const historyList = getHistoryIgnoreCase(employeeData?.history, apd) || [];
    const totalTakes = historyList.length;
    const warningMsg = getIntervalWarning(apd, format(new Date(), 'yyyy-MM-dd'), employeeData?.history);
    const isEligible = !warningMsg;
    const intervalMonths = getIntervalIgnoreCase(intervals, apd) || 0;

    let lastDateDisplay: string | null = null;
    let nextAllowedDateDisplay: string | null = null;

    if (totalTakes > 0) {
      const lastHist = historyList[historyList.length - 1];
      const lastRaw = typeof lastHist === 'string' ? lastHist : lastHist?.date;
      if (lastRaw) {
        try {
          const parsed = parseISO(lastRaw);
          lastDateDisplay = format(parsed, 'dd/MM/yyyy');
          if (intervalMonths > 0) {
            const nextDate = addMonths(parsed, intervalMonths);
            nextAllowedDateDisplay = format(nextDate, 'dd/MM/yyyy');
          }
        } catch {
          lastDateDisplay = lastRaw;
        }
      }
    }

    const isInDraft = entries.some(e => e.apd.toLowerCase() === apd.toLowerCase());

    return {
      apd,
      historyList,
      totalTakes,
      warningMsg,
      isEligible,
      intervalMonths,
      lastDateDisplay,
      nextAllowedDateDisplay,
      isInDraft
    };
  };

  const handleQuickAddToDraft = (apd: string) => {
    const isAlreadyInDraft = entries.some(e => e.apd.toLowerCase() === apd.toLowerCase());
    if (isAlreadyInDraft) {
      toast.info(`${apd} sudah ada di dalam draft pengambilan.`);
      document.getElementById('apd-input-form')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const warningMsg = getIntervalWarning(apd, tanggal, employeeData?.history);
    if (warningMsg) {
      setSelectedApdModal(apd);
      toast.warning(`Pengambilan ${apd} belum waktunya sesuai interval. Silakan lampirkan BA Kerusakan Barang jika mendesak.`);
      return;
    }

    setEntries(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      apd: apd,
      ukuran: '-',
      jumlah: '1',
      keterangan: '',
      warningMessage: null,
      baFileUrl: '',
      baFileName: '',
    }]);
    setShowAddedPopup(apd);
    toast.success(`${apd} berhasil ditambahkan ke draft form!`);
    setTimeout(() => {
      document.getElementById('apd-input-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 120);
  };

  const allApdItems = useMemo(() => {
    if (!employeeData) return [];
    return APD_TYPES.map(apd => getApdSummaryItem(apd));
  }, [employeeData, intervals, tanggal, entries]);

  const apdCounts = useMemo(() => {
    let eligible = 0;
    let waiting = 0;
    let never = 0;
    allApdItems.forEach(item => {
      if (item.totalTakes === 0) never++;
      else if (item.isEligible) eligible++;
      else waiting++;
    });
    return { all: allApdItems.length, eligible, waiting, never };
  }, [allApdItems]);

  const filteredApdItems = useMemo(() => {
    return allApdItems.filter(item => {
      if (apdFilterQuery.trim()) {
        const q = apdFilterQuery.toLowerCase().trim();
        if (!item.apd.toLowerCase().includes(q)) return false;
      }
      if (apdStatusTab === 'eligible') {
        return item.isEligible && item.totalTakes > 0;
      }
      if (apdStatusTab === 'waiting') {
        return !item.isEligible && item.totalTakes > 0;
      }
      if (apdStatusTab === 'never') {
        return item.totalTakes === 0;
      }
      return true;
    });
  }, [allApdItems, apdFilterQuery, apdStatusTab]);

  const updateEntry = (id: string, field: keyof ApdEntry, value: string) => {
    setEntries(prev => prev.map(entry => {
      if (entry.id === id) {
        const newEntry = { ...entry, [field]: value };
        if (field === 'apd') {
          newEntry.warningMessage = getIntervalWarning(value, tanggal);
        }
        return newEntry;
      }
      return entry;
    }));
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const addEntry = () => {
    setEntries(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      apd: APD_TYPES[0],
      ukuran: '-',
      jumlah: '1',
      keterangan: '',
      warningMessage: getIntervalWarning(APD_TYPES[0], tanggal)
    }]);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dt = e.target.value;
    setTanggal(dt);
    // Update all warnings based on new date
    setEntries(prev => prev.map(entry => ({
      ...entry,
      warningMessage: getIntervalWarning(entry.apd, dt)
    })));
  };

  
  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeData || entries.length === 0) return;
    
    // Validasi: Jika ada APD yang belum waktunya diambil, wajib melampirkan file BA Kerusakan Barang (PDF)
    const unverified = entries.find(entry => entry.warningMessage && !entry.baFileName);
    if (unverified) {
      toast.error(`Pengambilan ${unverified.apd} belum memenuhi interval penggantian. Wajib melampirkan Berita Acara (BA) Kerusakan Barang (PDF)!`);
      return;
    }

    submitApdData();
  };


  const submitApdData = async () => {
    setIsSubmitting(true);
    try {
      const isPreparationOrMaintenance = employeeData.divisi === 'Preparation' || employeeData.divisi === 'Maintenance';
      const sptName = isPreparationOrMaintenance ? 'Arif Maulana Lessy' : 'Tigwa Anggawikara';
      const sptJabatan = isPreparationOrMaintenance ? 'Preparation Superintendent' : 'Laboratory Superintendent';

      const isPenggantian = entries.some(e => (getHistoryIgnoreCase(employeeData.history, e.apd) || []).length > 0);
      const pernyataanText = isPenggantian 
        ? "Dengan ini menyatakan bahwa APD milik perusahaan yang telah saya terima dan pakai sudah dalam kondisi rusak atau tidak bisa digunakan. Oleh karena itu telah dilakukan penggantian APD dengan rincian sebagai berikut :" 
        : "Dengan ini menyatakan telah melakukan serah terima APD dengan rincian sebagai berikut:";

      const items = entries.map((e, i) => {
        const h = getHistoryIgnoreCase(employeeData.history, e.apd) || [];
        const lastDate = h.length > 0 ? parseISO(typeof h[h.length - 1] === 'string' ? h[h.length - 1] : h[h.length - 1].date) : null;
        const intervalMonths = getIntervalIgnoreCase(intervals, e.apd) || 0;
        
        return {
          NO: (i + 1).toString(),
          NAMA_APD: e.apd,
          UKURAN: e.ukuran,
          JUMLAH: e.jumlah,
          TANGGALBEFORE: h.length > 0 ? format(parseISO(typeof h[h.length - 1] === 'string' ? h[h.length - 1] : h[h.length - 1].date), 'dd-MM-yyyy') : '-',
          EXPIRED: lastDate ? format(addMonths(lastDate, intervalMonths), 'dd-MM-yyyy') : '-',
          JENIS: h.length > 0 ? 'Penggantian' : 'Pengambilan Baru',
          KETERANGAN: e.keterangan || '-'
        };
      });


      const allEvents: any[] = [];
      Object.keys(employeeData.history).forEach(apd => {
        const takes = employeeData.history[apd];
        takes.forEach((take: any, idx: number) => {
          allEvents.push({
            date: typeof take === 'string' ? take : take.date,
            apd: apd,
            url: typeof take === 'string' ? '' : take.url,
            takeIndex: idx
          });
        });
      });
      // also include the current entries
      const newTakesCount: Record<string, number> = {};
      entries.forEach(entry => {
        const apdLower = entry.apd.toLowerCase();
        const h = getHistoryIgnoreCase(employeeData.history, entry.apd) || [];
        const currentCount = newTakesCount[apdLower] || 0;
        allEvents.push({
          date: tanggal,
          apd: entry.apd,
          url: '', // pending
          takeIndex: h.length + currentCount
        });
        newTakesCount[apdLower] = currentCount + 1;
      });

      allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const groupedByTakeIndex: Record<number, any[]> = {};
      allEvents.forEach(ev => {
        if (!groupedByTakeIndex[ev.takeIndex]) groupedByTakeIndex[ev.takeIndex] = [];
        groupedByTakeIndex[ev.takeIndex].push(ev);
      });
      
      const maxTakeIndex = Math.max(-1, ...Object.keys(groupedByTakeIndex).map(Number));
      const historisArray = [];

      for (let i = 0; i <= maxTakeIndex; i++) {
        const events = groupedByTakeIndex[i] || [];
        const row: any = {
          PENGAMBILAN: (i + 1).toString(),
        };
        
        let remarksArr: string[] = [];
        
        events.forEach(ev => {
          let remark = "";
          if (ev.takeIndex === 0) {
            remark = "Baru";
          } else {
            const h = getHistoryIgnoreCase(employeeData.history, ev.apd) || [];
            if (h.length >= ev.takeIndex) {
              const prevTake = h[ev.takeIndex - 1];
              const prevDate = new Date(typeof prevTake === 'string' ? prevTake : prevTake.date);
              const currDate = new Date(ev.date);
              const intervalMonths = getIntervalIgnoreCase(intervals, ev.apd);
              const nextAllowedDate = addMonths(prevDate, intervalMonths);
              if (isBefore(currDate, nextAllowedDate)) {
                remark = "Sebelum interval";
              } else {
                remark = "Sesuai interval";
              }
            } else {
              remark = "Baru";
            }
          }
          remarksArr.push(`${ev.apd}: ${remark}`);
          
          const apdLower = ev.apd.toLowerCase();
          const formattedDate = format(parseISO(ev.date), 'dd-MM-yyyy');
          if (apdLower.includes('earplug')) row.EARPLUG = formattedDate;
          else if (apdLower.includes('stagen')) row.STAGEN = formattedDate;
          else if (apdLower.includes('safety glass')) row.SAFETYGLASS = formattedDate;
          else if (apdLower.includes('filter')) row.FILTER = formattedDate;
          else if (apdLower.includes('masker moncong')) row.MONCONG = formattedDate;
          else if (apdLower.includes('earmuff')) row.EARMUFF = formattedDate;
          else if (apdLower.includes('sandal')) row.SANDAL = formattedDate;
          else if (apdLower.includes('jas')) row.JASLAB = formattedDate;
          else if (apdLower.includes('rompi') && apdLower.includes('hijau')) row.ROMPI2 = formattedDate;
          else if (apdLower.includes('rompi') || apdLower.includes('vest')) row.ROMPI1 = formattedDate;
          else if (apdLower.includes('sepatu')) row.SEPATU = formattedDate;
        });
        
        row.REMARKS = remarksArr.join(', ');
        historisArray.push(row);
      }

      const docData = {
        NAMA: employeeData.nama,
        DEPT: "Preparation & Laboratory",
        JABATAN: employeeData.jabatan,
        NIK: employeeData.nik,
        PERNYATAAN: pernyataanText,
        ITEMS: items,
        HISTORIS: historisArray,
        TANGGALTTD: new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()),
        NAMASPT: sptName,
        JABATANSPT: sptJabatan,
        TTD: ""
      };
      
      let generatedPdfUrl = "";
      try {
        const res: any = await generateApdDocument(docData);
        if (res && res.pdfUrl) {
          generatedPdfUrl = res.pdfUrl;
        }
      } catch (docErr) {
        console.error("Gagal buat dokumen PDF", docErr);
        // Continue even if document generation fails, we still record APD
      }
      
      await recordApdTakes(employeeData.nik, employeeData.nama, entries.map(ent => ({
        apd: ent.apd,
        tanggal: tanggal,
        keterangan: ent.keterangan,
        signature: ""
      })), generatedPdfUrl);
      
      toast.success(`Berhasil mencatat pengambilan ${entries.length} jenis APD untuk ${employeeData.nama}.`);
      
      const newHistory = { ...employeeData.history };
      entries.forEach(entry => {
        if (!newHistory[entry.apd]) newHistory[entry.apd] = [];
        newHistory[entry.apd].push({ date: new Date().toISOString(), url: generatedPdfUrl });
      });
      
      setEmployeeData({ ...employeeData, history: newHistory });
      setEntries([]);

    } catch (err) {
      console.error(err);
      toast.error('Gagal mencatat pengambilan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500 pb-12 max-w-7xl mx-auto px-2 sm:px-4">
      {/* Sub-module Navigation Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="py-2 px-3 rounded-xl border border-[var(--border-main)] bg-[var(--card-bg)] text-[var(--text-main)] text-xs font-bold hover:bg-[var(--input-bg)] flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4 text-purple-600" />
              <span>Kembali</span>
            </button>
          )}
          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider hidden sm:inline">
            Modul APD
          </span>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center p-1 rounded-2xl bg-[var(--input-bg)] border border-[var(--border-main)] gap-1">
          <button
            type="button"
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-xs"
          >
            Distribusi APD
          </button>
          <button
            type="button"
            onClick={() => onNav ? onNav('apd-monitoring') : window.location.assign('/apd-monitoring')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            Monitoring Dokumen
          </button>
          <button
            type="button"
            onClick={() => onNav ? onNav('apd-settings') : window.location.assign('/apd-settings')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            Pengaturan Interval
          </button>
        </div>
      </div>

      <PageHeader 
        title="Distribusi & Pengambilan APD"
        description="Kelola dan pantau riwayat pengambilan Alat Pelindung Diri (APD) seluruh personil laboratorium & preparasi."
        icon={<Shield />}
      />

      {/* Quick Self-Check Banner */}
      {inspectorNik && (!employeeData || employeeData.nik !== inspectorNik) && (
        <div className="flex items-center justify-between p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-purple-600 shrink-0" />
            <span className="text-[var(--text-main)]">
              Login sebagai <strong>{inspectorName || inspectorNik}</strong> ({inspectorNik})
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleSearch(undefined, inspectorNik)}
            className="px-3 py-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] transition-colors cursor-pointer shrink-0"
          >
            Cek Riwayat APD Saya
          </button>
        </div>
      )}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
        
        <form onSubmit={(e) => handleSearch(e)} className="space-y-4 relative">
          <div className="relative">
            <Input 
              placeholder="Masukkan NIK atau Nama Karyawan" 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
                setShowAddEmployee(false);
                setEmployeeData(null);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="pl-12"
              required
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            
            {showDropdown && searchQuery.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp, idx) => (
                    <div 
                      key={idx} 
                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                      onMouseDown={() => {
                        setSearchQuery(emp.nik);
                        setShowDropdown(false);
                      }}
                    >
                      <p className="font-semibold text-slate-800 text-sm">{emp.nama}</p>
                      <p className="text-xs text-slate-500">{emp.nik} • {emp.jabatan}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500 italic">
                    Karyawan tidak ditemukan. Klik cari untuk menambahkan.
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Button type="submit" disabled={isSearching} className="w-full">
            {isSearching ? 'Mencari...' : 'Cari Data Karyawan'}
          </Button>
        </form>
      </div>

      {showAddEmployee && (
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-slate-800">Karyawan Belum Terdaftar</h3>
          </div>
          <p className="text-sm text-slate-500 mb-6">Silakan lengkapi data karyawan baru di bawah ini agar otomatis tersimpan di database.</p>
          
          <form onSubmit={handleAddEmployee} className="space-y-4">
            <Input label="NIK" value={newEmployee.nik} onChange={e => setNewEmployee({...newEmployee, nik: e.target.value})} required />
            <Input label="Nama Lengkap" value={newEmployee.nama} onChange={e => setNewEmployee({...newEmployee, nama: e.target.value})} required />
            <Select 
              label="Jabatan" 
              value={newEmployee.jabatan} 
              onChange={e => setNewEmployee({...newEmployee, jabatan: e.target.value})}
              options={uniqueJabatan.map(j => ({ value: j, label: j }))}
              required 
            />
            <Select 
              label="Divisi" 
              value={newEmployee.divisi} 
              onChange={e => setNewEmployee({...newEmployee, divisi: e.target.value})}
              options={uniqueDivisi.map(d => ({ value: d, label: d }))}
              required 
            />
            <Select 
              label="Grup / Shift" 
              value={newEmployee.grup} 
              onChange={e => setNewEmployee({...newEmployee, grup: e.target.value})}
              options={uniqueGrup.map(g => ({ value: g, label: g }))}
              required 
            />
            
            <Button type="submit" disabled={isAddingEmployee} className="w-full bg-purple-600 hover:bg-purple-700">
              {isAddingEmployee ? 'Menyimpan...' : <><Save className="w-4 h-4" /> Simpan & Lanjutkan</>}
            </Button>
          </form>
        </div>
      )}


      {employeeData && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{employeeData.nama}</h3>
              <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md text-xs">{employeeData.nik}</span>
                <span>{employeeData.departemen}</span>
              </div>
            </div>
          </div>

          {/* Status & Riwayat Pengambilan APD: Mode Tabel & Data List */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 space-y-4">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Shield className="w-4 h-4" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-base sm:text-lg">Status &amp; Riwayat Pengambilan APD</h4>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Daftar 11 jenis APD resmi, riwayat pengambilan terakhir, dan status kelayakan masa interval penggantian.
                </p>
              </div>

              {/* Toggle Table vs Data List */}
              <div className="flex items-center gap-2 self-start md:self-auto">
                <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 gap-1">
                  <button
                    type="button"
                    onClick={() => setApdViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      apdViewMode === 'table'
                        ? 'bg-white text-purple-700 shadow-xs ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Tampilan Tabel"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Tabel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setApdViewMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      apdViewMode === 'list'
                        ? 'bg-white text-purple-700 shadow-xs ring-1 ring-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Tampilan Data List"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Data List</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Status Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setApdStatusTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    apdStatusTab === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  Semua ({apdCounts.all})
                </button>

                <button
                  type="button"
                  onClick={() => setApdStatusTab('eligible')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    apdStatusTab === 'eligible'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Bisa Diambil ({apdCounts.eligible})
                </button>

                <button
                  type="button"
                  onClick={() => setApdStatusTab('waiting')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    apdStatusTab === 'waiting'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Belum Waktunya ({apdCounts.waiting})
                </button>

                <button
                  type="button"
                  onClick={() => setApdStatusTab('never')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    apdStatusTab === 'never'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  Belum Pernah ({apdCounts.never})
                </button>
              </div>

              {/* Search Box */}
              <div className="relative w-full sm:w-64">
                <Input
                  type="text"
                  placeholder="Cari jenis APD..."
                  value={apdFilterQuery}
                  onChange={e => setApdFilterQuery(e.target.value)}
                  className="pl-8 py-1.5 text-xs h-9"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                {apdFilterQuery && (
                  <button
                    type="button"
                    onClick={() => setApdFilterQuery('')}
                    className="text-slate-400 hover:text-slate-600 text-xs absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* TABEL VIEW */}
            {apdViewMode === 'table' && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 text-[11px] uppercase tracking-wider font-extrabold select-none">
                      <th className="py-3 px-3 text-center w-12">No.</th>
                      <th className="py-3 px-4">Jenis Alat Pelindung Diri (APD)</th>
                      <th className="py-3 px-3 text-center">Masa Interval</th>
                      <th className="py-3 px-3 text-center">Total Pengambilan</th>
                      <th className="py-3 px-3 text-center">Pengambilan Terakhir</th>
                      <th className="py-3 px-3 text-center">Jadwal Penggantian</th>
                      <th className="py-3 px-3 text-center">Status Kelayakan</th>
                      <th className="py-3 px-4 text-center w-48">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredApdItems.length > 0 ? (
                      filteredApdItems.map((item, idx) => {
                        const isEmpty = item.totalTakes === 0;
                        return (
                          <tr
                            key={item.apd}
                            className={`hover:bg-purple-50/40 transition-colors ${
                              isEmpty ? 'bg-rose-50/20' : 'bg-white'
                            }`}
                          >
                            <td className="py-3 px-3 text-center font-mono font-bold text-slate-400 text-[11px]">
                              {String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                                  isEmpty
                                    ? 'bg-rose-50 text-rose-600 border-rose-200'
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                }`}>
                                  <Shield className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800 text-xs sm:text-[13px]">
                                    {item.apd}
                                  </div>
                                  {isEmpty && (
                                    <span className="text-[10px] text-rose-500 font-medium italic">
                                      Belum pernah diambil
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px] border border-slate-200/60 font-mono">
                                {item.intervalMonths > 0 ? `${item.intervalMonths} Bulan` : 'Fleksibel'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black ${
                                isEmpty
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-purple-100 text-purple-800 font-mono'
                              }`}>
                                {item.totalTakes} kali
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {item.lastDateDisplay ? (
                                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px] border border-slate-200/60">
                                  {item.lastDateDisplay}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              {isEmpty ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Siap Diambil
                                </span>
                              ) : item.isEligible ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Siap Diambil
                                </span>
                              ) : (
                                <span className="font-mono text-[11px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200/80">
                                  {item.nextAllowedDateDisplay ? `Boleh: ${item.nextAllowedDateDisplay}` : 'Menunggu Interval'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold border ${
                                isEmpty
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : item.isEligible
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  isEmpty ? 'bg-rose-500' : item.isEligible ? 'bg-emerald-500' : 'bg-amber-500'
                                }`} />
                                {isEmpty ? 'Belum Diambil' : item.isEligible ? 'Bisa Diambil' : 'Belum Waktunya'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedApdModal(item.apd)}
                                  className="py-1 px-2.5 rounded-xl border border-slate-200 hover:border-purple-300 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                  title="Lihat Rincian & Riwayat Pengambilan"
                                >
                                  <FileText className="w-3.5 h-3.5 text-purple-600" />
                                  <span>Riwayat</span>
                                </button>

                                {item.isInDraft ? (
                                  <span className="py-1 px-2.5 rounded-xl bg-purple-100 text-purple-700 font-extrabold text-xs flex items-center gap-1 border border-purple-200">
                                    <Check className="w-3.5 h-3.5" /> Draft
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAddToDraft(item.apd)}
                                    className={`py-1 px-2.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-2xs ${
                                      item.isEligible || isEmpty
                                        ? 'bg-purple-600 hover:bg-purple-700 text-white active:scale-95'
                                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                                    }`}
                                    title={item.isEligible || isEmpty ? 'Tambahkan ke draft form pengambilan' : 'Perlu upload BA Kerusakan untuk penggantian'}
                                  >
                                    {item.isEligible || isEmpty ? (
                                      <>
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>+ Ambil</span>
                                      </>
                                    ) : (
                                      <>
                                        <Lock className="w-3.5 h-3.5 text-amber-700" />
                                        <span>BA PDF</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                          Tidak ada jenis APD yang sesuai dengan filter pencarian.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* DATA LIST VIEW */}
            {apdViewMode === 'list' && (
              <div className="space-y-2.5">
                {filteredApdItems.length > 0 ? (
                  filteredApdItems.map((item, idx) => {
                    const isEmpty = item.totalTakes === 0;
                    return (
                      <div
                        key={item.apd}
                        className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3.5 shadow-2xs ${
                          isEmpty
                            ? 'bg-rose-50/25 border-rose-200/90 hover:border-rose-300'
                            : 'bg-white border-slate-200 hover:border-purple-200'
                        }`}
                      >
                        {/* Kolom Kiri: Nomor, Nama APD & Info Utama */}
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="w-6 font-mono font-bold text-slate-400 text-xs shrink-0 mt-1">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                            isEmpty
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}>
                            <Shield className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold text-slate-800 text-sm sm:text-base leading-snug">
                              {item.apd}
                            </h5>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                              <span className="font-semibold text-slate-700">
                                Interval: {item.intervalMonths > 0 ? `${item.intervalMonths} Bulan` : 'Fleksibel'}
                              </span>
                              <span>•</span>
                              <span className={`font-bold ${isEmpty ? 'text-rose-600' : 'text-purple-700'}`}>
                                {item.totalTakes}x Diambil
                              </span>
                              {item.lastDateDisplay && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono text-slate-600">
                                    Terakhir: {item.lastDateDisplay}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Kolom Tengah: Status & Jadwal Penggantian */}
                        <div className="flex items-center gap-2.5 flex-wrap pl-9 md:pl-0">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                            isEmpty
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : item.isEligible
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isEmpty ? 'bg-rose-500' : item.isEligible ? 'bg-emerald-500' : 'bg-amber-500'
                            }`} />
                            {isEmpty ? 'Belum Pernah Diambil' : item.isEligible ? 'Bisa Diambil' : 'Belum Waktunya'}
                          </span>

                          {!isEmpty && !item.isEligible && item.nextAllowedDateDisplay && (
                            <span className="font-mono text-[11px] text-amber-800 font-semibold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200/80">
                              Boleh: {item.nextAllowedDateDisplay}
                            </span>
                          )}
                        </div>

                        {/* Kolom Kanan: Tombol Aksi */}
                        <div className="flex items-center gap-2 self-end md:self-auto pl-9 md:pl-0 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedApdModal(item.apd)}
                            className="py-1.5 px-3 rounded-xl border border-slate-200 hover:border-purple-300 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-purple-600" />
                            <span>Detail &amp; Riwayat</span>
                          </button>

                          {item.isInDraft ? (
                            <span className="py-1.5 px-3 rounded-xl bg-purple-100 text-purple-700 font-extrabold text-xs flex items-center gap-1.5 border border-purple-200">
                              <Check className="w-3.5 h-3.5" /> Sudah di Draft
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleQuickAddToDraft(item.apd)}
                              className={`py-1.5 px-3.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                                item.isEligible || isEmpty
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white active:scale-95'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {item.isEligible || isEmpty ? (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Tambah ke Form</span>
                                </>
                              ) : (
                                <>
                                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                                  <span>Upload BA Kerusakan</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Tidak ada jenis APD yang sesuai dengan filter pencarian.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Jendela Mengambang (Floating Modal) Detail APD & Keterangan */}
          {selectedApdModal && (() => {
            const apd = selectedApdModal;
            const historyList = getHistoryIgnoreCase(employeeData.history, apd) || [];
            const totalTakes = historyList.length;
            const warningMsg = getIntervalWarning(apd, format(new Date(), 'yyyy-MM-dd'), employeeData.history);
            const isEligible = !warningMsg;
            const intervalMonths = getIntervalIgnoreCase(intervals, apd) || 0;
            const canAddToForm = isEligible || !!baKerusakanFile;

            return (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
                onClick={() => { setSelectedApdModal(null); setBaKerusakanFile(null); }}
              >
                <div
                  className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[88vh] overflow-hidden animate-in zoom-in-95 duration-200"
                  onClick={e => e.stopPropagation()}
                >
                  {/* Header Modal */}
                  <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 leading-snug">{apd}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Detail riwayat & kelayakan pengambilan APD</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedApdModal(null); setBaKerusakanFile(null); }}
                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Tutup"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Isi Modal: Keterangan & Riwayat Pengambilan */}
                  <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                    {/* Ringkasan Status 3 Kartu Mini */}
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Ambil</span>
                        <div className="text-lg font-black text-slate-800 mt-0.5">{totalTakes} <span className="text-[11px] font-normal text-slate-500">kali</span></div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interval</span>
                        <div className="text-lg font-black text-slate-800 mt-0.5">{intervalMonths > 0 ? `${intervalMonths} Bln` : 'Bebas'}</div>
                      </div>
                      <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200/80">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kelayakan</span>
                        <div className={`text-xs font-black mt-1 ${totalTakes === 0 ? 'text-rose-600' : isEligible ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {totalTakes === 0 ? 'Belum Ada' : isEligible ? 'Bisa Ambil' : 'Menunggu'}
                        </div>
                      </div>
                    </div>

                    {/* Alert Penjelasan Jadwal */}
                    {warningMsg ? (
                      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2.5 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Perhatian Jadwal Penggantian</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed">{warningMsg}</p>
                        </div>
                      </div>
                    ) : totalTakes > 0 ? (
                      <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-2.5 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Memenuhi Syarat Pengambilan</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed">Karyawan berhak mengambil APD ini karena telah melewati masa interval penggantian resmi.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-2.5 text-xs">
                        <Shield className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Belum Ada Pengambilan</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed">Karyawan belum memiliki catatan pengambilan untuk APD ini di sistem.</p>
                        </div>
                      </div>
                    )}

                    {/* Riwayat Pengambilan */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Riwayat Pengambilan ({totalTakes} data tanggal)
                        </h4>
                      </div>

                      {totalTakes > 0 ? (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {historyList.map((histObj: any, idx: number) => {
                            const hDate = typeof histObj === 'string' ? histObj : histObj.date;
                            const rawUrl = typeof histObj === 'string' ? null : histObj.url;
                            const hUrl = (rawUrl && typeof rawUrl === 'string' && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('/uploads/') || rawUrl.startsWith('/api/'))) ? rawUrl.trim() : null;
                            let displayDate = hDate;
                            try {
                              if (hDate.includes('T')) {
                                displayDate = format(parseISO(hDate), 'dd-MM-yyyy HH:mm');
                              } else {
                                displayDate = format(parseISO(hDate), 'dd-MM-yyyy');
                              }
                            } catch (e) {}

                            return (
                              <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100/60 transition-colors">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                    Ke-{idx + 1}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-slate-700 text-xs font-medium">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{displayDate}</span>
                                  </div>
                                </div>

                                {hUrl ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setPreviewDoc({
                                        url: hUrl,
                                        title: apd,
                                        date: displayDate,
                                        employeeName: employeeData.nama,
                                        nik: employeeData.nik
                                      });
                                    }}
                                    className="flex items-center gap-1.5 text-teal-700 bg-teal-50 shadow-xs px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-teal-200 hover:bg-teal-100 hover:border-teal-300 transition-all cursor-pointer"
                                    title="Buka dokumen bukti pengambilan"
                                  >
                                    <FileText className="w-3.5 h-3.5 text-teal-600" />
                                    <span>Bukti PDF</span>
                                    <ExternalLink className="w-3 h-3 text-teal-500" />
                                  </button>
                                ) : (
                                  <label className="cursor-pointer flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white text-purple-700 hover:bg-purple-50 border border-purple-200 text-xs font-semibold transition-colors">
                                    {uploadingApd?.nik === employeeData.nik && uploadingApd?.apd === apd && uploadingApd?.date === hDate ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Upload className="w-3.5 h-3.5" />
                                    )}
                                    <span>Upload</span>
                                    <input
                                      type="file"
                                      accept="application/pdf,image/*"
                                      className="hidden"
                                      onChange={(e) => handleUploadProof(employeeData.nik, apd, hDate, e)}
                                      disabled={!!uploadingApd}
                                    />
                                  </label>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-rose-600 bg-rose-50/70 p-4 rounded-xl border border-rose-200 border-dashed text-center">
                          Belum ada riwayat tanggal pengambilan sebelumnya.
                        </div>
                      )}
                    </div>

                    {/* Upload BA Kerusakan Barang jika belum waktunya pengambilan */}
                    {!isEligible && (
                      <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-amber-950">
                              Upload BA Kerusakan Barang (Format PDF)
                            </h4>
                            <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                              Karena belum memenuhi jadwal interval penggantian, pembuatan form baru <strong>hanya dapat diproses</strong> setelah melampirkan file Berita Acara (BA) Kerusakan Barang dengan format PDF.
                            </p>
                          </div>
                        </div>

                        {baKerusakanFile ? (
                          <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-emerald-300 shadow-2xs">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-900 truncate">{baKerusakanFile.name}</p>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> BA Kerusakan PDF Siap Dilampirkan
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {baKerusakanFile.url && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewDoc({
                                    url: baKerusakanFile.url!,
                                    title: `BA Kerusakan - ${apd}`,
                                    date: format(new Date(), 'dd-MM-yyyy'),
                                    employeeName: employeeData.nama,
                                    nik: employeeData.nik
                                  })}
                                  className="text-xs text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer"
                                >
                                  Lihat
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setBaKerusakanFile(null)}
                                className="text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1.5 rounded-lg font-semibold transition-colors cursor-pointer"
                                title="Hapus file BA"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-amber-400 bg-white hover:bg-amber-100/60 text-amber-900 text-xs font-bold transition-all cursor-pointer shadow-2xs ${isUploadingBa ? 'opacity-60 cursor-not-allowed' : ''}`}>
                              {isUploadingBa ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin text-amber-700" />
                                  <span>Mengunggah BA Kerusakan PDF...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 text-amber-700" />
                                  <span>Pilih &amp; Upload BA Kerusakan Barang (.pdf)</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="application/pdf,.pdf"
                                className="hidden"
                                disabled={isUploadingBa}
                                onChange={(e) => handleUploadBaKerusakan(apd, e)}
                              />
                            </label>
                            <p className="text-[10px] text-amber-700 mt-1 text-center font-medium">
                              Wajib format dokumen PDF (.pdf)
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Modal: Tombol Tambah ke Form Input */}
                  <div className="pt-4 border-t border-slate-100 space-y-1.5">
                    <Button
                      type="button"
                      disabled={!canAddToForm}
                      className={`w-full py-3.5 rounded-2xl text-sm font-bold gap-2 shadow-sm transition-all ${
                        !canAddToForm 
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60' 
                          : baKerusakanFile
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-md hover:shadow-lg cursor-pointer'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!canAddToForm) return;
                        setEntries(prev => [...prev, {
                          id: Math.random().toString(36).substr(2, 9),
                          apd: apd,
                          ukuran: '-',
                          jumlah: '1',
                          keterangan: baKerusakanFile ? `Penggantian Khusus (BA Kerusakan: ${baKerusakanFile.name})` : '',
                          warningMessage: getIntervalWarning(apd, tanggal, employeeData.history),
                          baFileUrl: baKerusakanFile?.url || '',
                          baFileName: baKerusakanFile?.name || '',
                        }]);
                        setShowAddedPopup(apd);
                        setSelectedApdModal(null);
                        setBaKerusakanFile(null);
                        toast.success(`${apd} berhasil ditambahkan ke draft input!`);
                        setTimeout(() => {
                          document.getElementById('apd-input-form')?.scrollIntoView({ behavior: 'smooth' });
                        }, 120);
                      }}
                    >
                      {!canAddToForm ? (
                        <>
                          <Lock className="w-4 h-4" /> Belum Waktunya Ambil (Upload BA PDF Diperlukan)
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" /> Tambah ke Form Input {baKerusakanFile ? '(Dengan BA Kerusakan)' : ''}
                        </>
                      )}
                    </Button>
                    {!canAddToForm && (
                      <p className="text-[11px] text-center text-amber-700 font-semibold">
                        Tombol dinonaktifkan: Silakan upload BA Kerusakan Barang (PDF) untuk melanjutkan.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          <form id="apd-input-form" onSubmit={handleSaveClick} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mt-8">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                <h3 className="font-semibold text-slate-800">Draft Pengambilan Baru</h3>
              </div>
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-md">
                {entries.length} Item
              </span>
            </div>
            
            <div className="p-5 space-y-4">
              <Input
                label="Tanggal Pengambilan (Berlaku untuk semua item)"
                type="date"
                value={tanggal}
                onChange={handleDateChange}
                required
              />

              <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="font-semibold text-slate-800 text-sm">Daftar APD yang Diambil</h4>
                </div>

                {entries.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500">Belum ada APD yang dipilih.</p>
                    <p className="text-xs text-slate-400 mt-1">Pilih dari riwayat di atas atau tambah manual.</p>
                  </div>
                ) : (
                  entries.map((entry, index) => (
                    <div key={entry.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 relative group transition-all">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-200 px-2 py-0.5 rounded text-[10px]">Item #{index + 1}</span>
                        <button 
                          type="button" 
                          onClick={() => removeEntry(entry.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1 bg-white rounded-md shadow-sm border border-slate-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <Select
                        label="Jenis APD"
                        value={entry.apd}
                        onChange={(e) => updateEntry(entry.id, 'apd', e.target.value)}
                        options={APD_TYPES.map(apd => ({ value: apd, label: apd }))}
                        required
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Ukuran"
                          placeholder="M, L, XL, 42, -"
                          value={entry.ukuran}
                          onChange={(e) => updateEntry(entry.id, 'ukuran', e.target.value)}
                          required
                        />
                        <Input
                          label="Jumlah"
                          type="number"
                          value={entry.jumlah}
                          onChange={(e) => updateEntry(entry.id, 'jumlah', e.target.value)}
                          required
                        />
                      </div>
                      <Input
                        label="Keterangan (Opsional)"
                        placeholder="Misal: Barang rusak, hilang, dsb."
                        value={entry.keterangan}
                        onChange={(e) => updateEntry(entry.id, 'keterangan', e.target.value)}
                      />

                      {entry.baFileName && (
                        <div className="bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl flex items-center justify-between text-xs mt-2 shadow-2xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span className="font-bold text-emerald-950 truncate">BA Kerusakan: {entry.baFileName}</span>
                          </div>
                          {entry.baFileUrl && (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({
                                url: entry.baFileUrl!,
                                title: `BA Kerusakan - ${entry.apd}`,
                                date: tanggal,
                                employeeName: employeeData?.nama || '',
                                nik: employeeData?.nik || '',
                              })}
                              className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                            >
                              Lihat PDF <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {entry.warningMessage && !entry.baFileName && (
                        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl space-y-2 mt-2 animate-in fade-in zoom-in-95">
                          <div className="flex items-start gap-2.5">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-rose-800 text-xs mb-0.5">Peringatan Interval (Wajib BA Kerusakan PDF)</h4>
                              <p className="text-[11px] text-rose-700 leading-relaxed">
                                {entry.warningMessage}
                              </p>
                            </div>
                          </div>
                          <label className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white border border-rose-300 text-rose-800 hover:bg-rose-100/50 text-xs font-bold cursor-pointer transition-colors shadow-2xs">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Upload BA Kerusakan Barang (.pdf)</span>
                            <input
                              type="file"
                              accept="application/pdf,.pdf"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
                                  toast.error('File harus berformat PDF (.pdf)');
                                  return;
                                }
                                try {
                                  const reader = new FileReader();
                                  reader.onloadend = async () => {
                                    try {
                                      const base64 = reader.result as string;
                                      const cleanApd = entry.apd.replace(/[^a-zA-Z0-9]/g, '_');
                                      const cleanNik = (employeeData?.nik || 'NIK').replace(/[^a-zA-Z0-9]/g, '_');
                                      const fileName = `BA_Kerusakan_${cleanNik}_${cleanApd}_${Date.now()}.pdf`;
                                      const uploadedUrl = await uploadPhotoToDrive(base64, 'application/pdf', fileName, 'Dokumen APD');
                                      setEntries(prev => prev.map(ent => ent.id === entry.id ? {
                                        ...ent,
                                        baFileUrl: uploadedUrl || '',
                                        baFileName: file.name,
                                        keterangan: ent.keterangan || `Penggantian Khusus (BA Kerusakan: ${file.name})`
                                      } : ent));
                                      toast.success(`BA Kerusakan (${file.name}) berhasil dilampirkan.`);
                                    } catch (err) {
                                      setEntries(prev => prev.map(ent => ent.id === entry.id ? {
                                        ...ent,
                                        baFileUrl: '',
                                        baFileName: file.name,
                                        keterangan: ent.keterangan || `Penggantian Khusus (BA Kerusakan: ${file.name})`
                                      } : ent));
                                      toast.success(`BA Kerusakan (${file.name}) siap dilampirkan.`);
                                    }
                                  };
                                  reader.readAsDataURL(file);
                                } catch (err) {
                                  toast.error('Gagal membaca file PDF');
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6 space-y-4">
                <Button type="button" onClick={addEntry} variant="secondary" className="w-full text-sm py-3 rounded-2xl gap-2 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200">
                  <Plus className="w-5 h-5" /> Tambah Manual
                </Button>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-purple-200" disabled={isSubmitting || entries.length === 0}>
                  {isSubmitting ? 'Menyimpan...' : <><Save className="w-5 h-5" /> Simpan {entries.length} Pengambilan</>}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showAddedPopup && (
        <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{showAddedPopup}</h3>
            <p className="text-sm text-slate-500 mb-6">berhasil ditambahkan ke form pengambilan APD!</p>
            <div className="space-y-3">
              <Button type="button" onClick={() => setShowAddedPopup(null)} variant="secondary" className="w-full py-3 rounded-xl">
                Tambahkan yang Lain
              </Button>
              <Button type="button" onClick={() => {
                setShowAddedPopup(null);
                setTimeout(() => {
                  document.getElementById('apd-input-form')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }} className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700">
                Selesai & Lanjut ke Form
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PREVIEW DOKUMEN PDF APD ── */}
      {previewDoc && (() => {
        const rawUrl = (previewDoc.url || '').trim();
        const isValidUrl = Boolean(rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('/uploads/') || rawUrl.startsWith('/api/')));
        const fileId = isValidUrl ? parseGoogleDriveId(rawUrl) : null;
        const embedUrl = fileId 
          ? `https://drive.google.com/file/d/${fileId}/preview`
          : (isValidUrl ? rawUrl : '');
        const viewUrl = fileId
          ? `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
          : (isValidUrl ? rawUrl : '');
        const downloadUrl = fileId
          ? `https://drive.google.com/uc?export=download&id=${fileId}`
          : (isValidUrl ? rawUrl : '');

        return (
          <div className="fixed inset-0 z-[80] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-slate-900 border-b border-slate-800 p-3 sm:p-4 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/15 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold shrink-0 shadow-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm sm:text-base text-white truncate">
                      Dokumen Bukti Pengambilan: {previewDoc.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      👤 {previewDoc.employeeName} ({previewDoc.nik}) • 📅 {previewDoc.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isValidUrl && (
                    <>
                      <a
                        href={viewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs flex items-center gap-1.5 border border-slate-700 font-semibold transition-colors"
                        title="Buka di Tab Baru"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Buka Tab Baru</span>
                      </a>
                      <a
                        href={downloadUrl}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs flex items-center gap-1.5 font-bold shadow-md shadow-emerald-950 transition-colors"
                        title="Unduh Dokumen PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Unduh PDF</span>
                      </a>
                    </>
                  )}
                  <button 
                    onClick={() => setPreviewDoc(null)} 
                    className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 flex items-center justify-center transition-colors font-bold cursor-pointer"
                    title="Tutup Pratinjau"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Viewer Body */}
              <div className="flex-1 bg-slate-950 relative min-h-0 w-full flex flex-col items-center justify-center p-2">
                {isValidUrl ? (
                  <iframe 
                    src={embedUrl} 
                    title={`Dokumen ${previewDoc.title}`}
                    className="w-full h-full rounded-2xl border border-slate-800 shadow-inner bg-slate-900"
                    allow="autoplay; encrypted-media; fullscreen"
                  />
                ) : (
                  <div className="text-center p-8 max-w-md space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto">
                      <FileText className="w-8 h-8" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Tautan Dokumen Tidak Tersedia</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Belum ada link dokumen PDF atau file Google Drive yang valid untuk item ini.
                    </p>
                    <div className="pt-2">
                      <Button
                        onClick={() => setPreviewDoc(null)}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-8 px-4 rounded-xl shadow-md"
                      >
                        Tutup
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-900 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 shrink-0">
                <span className="font-mono text-[11px]">
                  💡 Gunakan kontrol zoom dan navigasi di dalam viewer untuk melihat detail dokumen PDF.
                </span>
                <Button
                  onClick={() => setPreviewDoc(null)}
                  className="bg-teal-600 hover:bg-teal-500 text-white text-xs h-7 px-4 rounded-xl font-semibold shadow-xs"
                >
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}