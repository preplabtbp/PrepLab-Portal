import React, { useState, useMemo } from 'react';
import { 
  X, Calendar, CalendarRange, Download, RefreshCw, 
  CheckCircle2, AlertTriangle, FileSpreadsheet, Filter, 
  Layers, Clock, ArrowRight, Sparkles, Building2,
  FileImage, BarChart3, Activity, ShieldAlert, HeartHandshake,
  PieChart, Users, AlertOctagon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface TimeRangeFetchModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectorNik: string;
  employees: any[];
  onSuccess: () => Promise<void>;
  isSectionManager: boolean;
}

export function TimeRangeFetchModal({
  isOpen,
  onClose,
  inspectorNik,
  employees,
  onSuccess,
  isSectionManager
}: TimeRangeFetchModalProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const todayStr = now.toISOString().split('T')[0];
  const firstDayThisMonth = `${currentYear}-${currentMonth}-01`;

  const [startDate, setStartDate] = useState(firstDayThisMonth);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'attendance' | 'spdk' | 'manpower'>('all');
  const [selectedPt, setSelectedPt] = useState<'ALL' | 'TBP' | 'GTS'>('ALL');
  const [isFetching, setIsFetching] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [fetchSuccess, setFetchSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  // Preset Handlers
  const handlePreset = (type: 'thisMonth' | 'lastMonth' | 'last30' | 'thisQuarter' | 'thisYear') => {
    const d = new Date();
    if (type === 'thisMonth') {
      setStartDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
      setEndDate(d.toISOString().split('T')[0]);
    } else if (type === 'lastMonth') {
      const prevMonthDate = new Date(d.getFullYear(), d.getMonth() - 1, 1);
      const lastDayPrevMonth = new Date(d.getFullYear(), d.getMonth(), 0);
      setStartDate(prevMonthDate.toISOString().split('T')[0]);
      setEndDate(lastDayPrevMonth.toISOString().split('T')[0]);
    } else if (type === 'last30') {
      const past30 = new Date(d.getTime() - (30 * 24 * 60 * 60 * 1000));
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(d.toISOString().split('T')[0]);
    } else if (type === 'thisQuarter') {
      const currentQ = Math.floor(d.getMonth() / 3);
      const startQ = new Date(d.getFullYear(), currentQ * 3, 1);
      setStartDate(startQ.toISOString().split('T')[0]);
      setEndDate(d.toISOString().split('T')[0]);
    } else if (type === 'thisYear') {
      setStartDate(`${d.getFullYear()}-01-01`);
      setEndDate(`${d.getFullYear()}-12-31`);
    }
  };

  // Calculate day difference
  const calculateDays = () => {
    try {
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return isNaN(diffDays) ? 0 : diffDays;
    } catch {
      return 0;
    }
  };

  // Helper date parser & range checker
  const parseToDateObj = (str: string): Date | null => {
    if (!str) return null;
    const clean = String(str).trim().toLowerCase();
    if (clean === '-' || clean === '0' || clean === '#n/a') return null;

    const iso = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (iso) {
      return new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
    }

    const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
    if (dmy) {
      let y = parseInt(dmy[3], 10);
      if (y < 100) y += 2000;
      return new Date(y, parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
    }

    const MONTH_MAP: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6,
      agu: 7, ags: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11
    };
    const dMonY = clean.match(/^(\d{1,2})[-\s/]([a-zA-Z]+)[-\s/](\d{2,4})/);
    if (dMonY) {
      let y = parseInt(dMonY[3], 10);
      if (y < 100) y += 2000;
      const mStr = dMonY[2].substring(0, 3);
      const m = MONTH_MAP[mStr];
      if (m !== undefined) {
        return new Date(y, m, parseInt(dMonY[1], 10));
      }
    }

    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  };

  const isDateInRange = (dateInput: string | Date): boolean => {
    const dObj = typeof dateInput === 'string' ? parseToDateObj(dateInput) : dateInput;
    if (!dObj) return false;
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    const t = dObj.getTime();
    return t >= s.getTime() && t <= e.getTime();
  };

  const parseDateList = (raw: any): string[] => {
    if (!raw) return [];
    return String(raw)
      .split(/[\r\n,;]+/)
      .map(s => s.trim())
      .filter(s => s && s !== '-' && s !== '0');
  };

  const isGtsEmp = (e: any) => {
    if (!e) return false;
    const ptStr = (e.pt || '').toString().trim().toUpperCase();
    const nikStr = (e.nik || '').toString().trim().toUpperCase();
    const secStr = (e.section || '').toString().trim().toUpperCase();
    return ptStr === 'GTS' || nikStr.startsWith('03') || nikStr.startsWith('M03') || secStr.includes('GTS');
  };

  // Filtered employees according to PT selector
  const filteredEmployees = useMemo(() => {
    let list = employees || [];
    if (selectedPt === 'GTS') return list.filter(e => isGtsEmp(e));
    if (selectedPt === 'TBP') return list.filter(e => !isGtsEmp(e));
    return list;
  }, [employees, selectedPt]);

  // Aggregate metrics within date range
  const rangeAggregates = useMemo(() => {
    let totalIzinDays = 0;
    let totalSakitSiteDays = 0;
    let totalSakitLuarDays = 0;
    let totalAlpaDays = 0;
    let totalActiveSpdk = 0;

    const izinByEmp: { nik: string; name: string; dept: string; count: number; dates: string[] }[] = [];
    const sakitByEmp: { nik: string; name: string; dept: string; siteCount: number; luarCount: number; total: number }[] = [];
    const alpaByEmp: { nik: string; name: string; dept: string; count: number; dates: string[] }[] = [];
    
    const spdkCounts = {
      st: 0,
      sp1: 0,
      sp2: 0,
      sp3: 0,
      sppt: 0,
      phk: 0
    };

    filteredEmployees.forEach(emp => {
      const att26 = emp.attendance2026 || emp.attendance?.['2026'] || emp.attendance?.[2026] || emp.attendanceData?.['2026'] || {};
      
      // Izin
      const rawIzin = [...parseDateList(att26.tanggalIzin || att26.tanggal_izin), ...parseDateList(att26.tanggalIzinKhusus || att26.tanggal_izin_khusus)];
      const filteredIzin = rawIzin.filter(isDateInRange);
      if (filteredIzin.length > 0) {
        totalIzinDays += filteredIzin.length;
        izinByEmp.push({
          nik: emp.nik,
          name: emp.name || emp.nama || emp.nik,
          dept: emp.department || emp.section || 'General',
          count: filteredIzin.length,
          dates: filteredIzin
        });
      }

      // Sakit Site (SS) & Sakit Luar (SL)
      const rawSS = parseDateList(att26.tanggalSakitSite || att26.tanggal_sakit_site);
      const filteredSS = rawSS.filter(isDateInRange);
      const rawSL = parseDateList(att26.tanggalSakitLuar || att26.tanggal_sakit_luar);
      const filteredSL = rawSL.filter(isDateInRange);
      const totalSakit = filteredSS.length + filteredSL.length;
      if (totalSakit > 0) {
        totalSakitSiteDays += filteredSS.length;
        totalSakitLuarDays += filteredSL.length;
        sakitByEmp.push({
          nik: emp.nik,
          name: emp.name || emp.nama || emp.nik,
          dept: emp.department || emp.section || 'General',
          siteCount: filteredSS.length,
          luarCount: filteredSL.length,
          total: totalSakit
        });
      }

      // Alpa
      const rawAlpa = parseDateList(att26.tanggalAlpa || att26.tanggal_alpa || att26.alpa);
      const filteredAlpa = rawAlpa.filter(isDateInRange);
      if (filteredAlpa.length > 0) {
        totalAlpaDays += filteredAlpa.length;
        alpaByEmp.push({
          nik: emp.nik,
          name: emp.name || emp.nama || emp.nik,
          dept: emp.department || emp.section || 'General',
          count: filteredAlpa.length,
          dates: filteredAlpa
        });
      }

      // SPDK & Sanksi
      const c = emp.counselingSpdk || emp.counseling || {};
      const st = String(c.st || '').trim();
      const sp1 = String(c.sp1 || c.sp_1 || '').trim();
      const sp2 = String(c.sp2 || c.sp_2 || '').trim();
      const sp3 = String(c.sp3 || c.sp_3 || '').trim();
      const sppt = String(c.sppt || c.sp_pt || '').trim();
      const phk = String(c.phk || '').trim();
      const statusSanksi = String(c.statusSanksi || c.status_sanksi || '').toLowerCase().trim();

      const isNotExpired = !statusSanksi.includes('selesai') && !statusSanksi.includes('kadaluarsa') && !statusSanksi.includes('pemutihan');
      
      let empHasActiveSp = false;
      if (isNotExpired) {
        if (st && st !== '-' && st !== '0') { spdkCounts.st++; empHasActiveSp = true; }
        if (sp1 && sp1 !== '-' && sp1 !== '0') { spdkCounts.sp1++; empHasActiveSp = true; }
        if (sp2 && sp2 !== '-' && sp2 !== '0') { spdkCounts.sp2++; empHasActiveSp = true; }
        if (sp3 && sp3 !== '-' && sp3 !== '0') { spdkCounts.sp3++; empHasActiveSp = true; }
        if (sppt && sppt !== '-' && sppt !== '0') { spdkCounts.sppt++; empHasActiveSp = true; }
        if (phk && phk !== '-' && phk !== '0') { spdkCounts.phk++; empHasActiveSp = true; }
        if (empHasActiveSp) totalActiveSpdk++;
      }
    });

    izinByEmp.sort((a, b) => b.count - a.count);
    sakitByEmp.sort((a, b) => b.total - a.total);
    alpaByEmp.sort((a, b) => b.count - a.count);

    return {
      totalEmployees: filteredEmployees.length,
      totalIzinDays,
      totalSakitSiteDays,
      totalSakitLuarDays,
      totalSakitDays: totalSakitSiteDays + totalSakitLuarDays,
      totalAlpaDays,
      totalActiveSpdk,
      izinByEmp,
      sakitByEmp,
      alpaByEmp,
      spdkCounts
    };
  }, [filteredEmployees, startDate, endDate]);

  // Live Fetch & Sync Data with backend
  const handleFetchData = async () => {
    if (!startDate || !endDate) {
      toast.error('Silakan tentukan rentang tanggal awal dan akhir.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Tanggal mulai tidak boleh lebih besar dari tanggal selesai.');
      return;
    }

    setIsFetching(true);
    setFetchSuccess(null);

    try {
      const res = await fetch('/api/roster/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-nik': inspectorNik
        },
        body: JSON.stringify({
          editorNik: inspectorNik,
          startDate,
          endDate,
          category: selectedCategory,
          pt: selectedPt
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFetchSuccess(`Data periode ${startDate} s/d ${endDate} berhasil ditarik dan disinkronkan!`);
        toast.success(`Penarikan data periode berhasil (${calculateDays()} hari)!`);
        await onSuccess();
      } else {
        throw new Error(data.message || 'Gagal menarik data dari server');
      }
    } catch (err: any) {
      toast.error('Penarikan data gagal: ' + err.message);
    } finally {
      setIsFetching(false);
    }
  };

  // 1. Export filtered dataset to Excel CSV
  const handleExportExcel = () => {
    setIsExportingExcel(true);
    try {
      const rows: string[][] = [
        ['REKAP DATA MANPOWER & ABSENSI PREPLAB PORTAL'],
        [`Periode: ${startDate} s/d ${endDate}`, `Cakupan PT: ${selectedPt}`, `Total Karyawan: ${filteredEmployees.length}`],
        [''],
        [
          'NIK',
          'Nama Karyawan',
          'Perusahaan (PT)',
          'Jabatan',
          'Section',
          'Department',
          'Status Karyawan',
          'Status Kontrak',
          'Total Izin (Hari)',
          'Total Sakit Site (Hari)',
          'Total Sakit Luar (Hari)',
          'Total Sakit Gabungan (Hari)',
          'Total Alpa (Hari)',
          'Status SPDK & Sanksi',
          'Rincian Tanggal Izin Periode',
          'Rincian Tanggal Sakit Periode',
          'Rincian Tanggal Alpa Periode',
          'Periode Awal',
          'Periode Akhir'
        ]
      ];

      filteredEmployees.forEach(emp => {
        const att26 = emp.attendance2026 || emp.attendance?.['2026'] || emp.attendance?.[2026] || emp.attendanceData?.['2026'] || {};
        const c = emp.counselingSpdk || emp.counseling || {};

        const rawIzin = [...parseDateList(att26.tanggalIzin || att26.tanggal_izin), ...parseDateList(att26.tanggalIzinKhusus || att26.tanggal_izin_khusus)].filter(isDateInRange);
        const rawSS = parseDateList(att26.tanggalSakitSite || att26.tanggal_sakit_site).filter(isDateInRange);
        const rawSL = parseDateList(att26.tanggalSakitLuar || att26.tanggal_sakit_luar).filter(isDateInRange);
        const rawAlpa = parseDateList(att26.tanggalAlpa || att26.tanggal_alpa || att26.alpa).filter(isDateInRange);

        const spList: string[] = [];
        if (c.st && c.st !== '-' && c.st !== '0') spList.push(`ST (${c.st})`);
        if (c.sp1 && c.sp1 !== '-' && c.sp1 !== '0') spList.push(`SP1 (${c.sp1})`);
        if (c.sp2 && c.sp2 !== '-' && c.sp2 !== '0') spList.push(`SP2 (${c.sp2})`);
        if (c.sp3 && c.sp3 !== '-' && c.sp3 !== '0') spList.push(`SP3 (${c.sp3})`);
        if (c.sppt && c.sppt !== '-' && c.sppt !== '0') spList.push(`SP-PT (${c.sppt})`);
        if (c.phk && c.phk !== '-' && c.phk !== '0') spList.push(`PHK (${c.phk})`);

        rows.push([
          `"${emp.nik || ''}"`,
          `"${(emp.name || emp.nama || '').replace(/"/g, '""')}"`,
          `"${emp.pt || (isGtsEmp(emp) ? 'GTS' : 'TBP')}"`,
          `"${(emp.jabatan || '').replace(/"/g, '""')}"`,
          `"${(emp.section || '').replace(/"/g, '""')}"`,
          `"${(emp.department || '').replace(/"/g, '""')}"`,
          `"${emp.statusKaryawan || emp.status || 'Active'}"`,
          `"${emp.statusKontrak || ''}"`,
          `${rawIzin.length}`,
          `${rawSS.length}`,
          `${rawSL.length}`,
          `${rawSS.length + rawSL.length}`,
          `${rawAlpa.length}`,
          `"${spList.length > 0 ? spList.join(', ') : 'Tidak Ada'}"`,
          `"${rawIzin.join('; ')}"`,
          `"${[...rawSS.map(d => `${d} (SS)`), ...rawSL.map(d => `${d} (SL)`)].join('; ')}"`,
          `"${rawAlpa.join('; ')}"`,
          `"${startDate}"`,
          `"${endDate}"`
        ]);
      });

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(e => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Rekap_Data_Manpower_Absensi_${startDate}_sd_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('File Rekap Data Excel (.csv) berhasil diekspor!');
    } catch (err: any) {
      toast.error('Gagal mengekspor data Excel: ' + err.message);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // 2. Export High-Resolution PNG Grafik (Semua Grafik: Izin, SPDK, Sakit, Alpa)
  const handleExportPngChart = () => {
    setIsExportingPng(true);
    toast.info('Menyiapkan grafik beresolusi tinggi...');

    setTimeout(() => {
      try {
        const width = 1600;
        const height = 1150;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context tidak tersedia');

        // Background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(0.5, '#1e293b');
        bgGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Grid Accent Pattern
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
        for (let y = 0; y < height; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
          ctx.stroke();
        }

        // Helper: Rounded Rectangle
        const drawRoundedRect = (
          x: number, 
          y: number, 
          w: number, 
          h: number, 
          r: number, 
          fill: string, 
          stroke?: string, 
          lineWidth = 1
        ) => {
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + w - r, y);
          ctx.quadraticCurveTo(x + w, y, x + w, y + r);
          ctx.lineTo(x + w, y + h - r);
          ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
          ctx.lineTo(x + r, y + h);
          ctx.quadraticCurveTo(x, y + h, x, y + h - r);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.closePath();
          ctx.fillStyle = fill;
          ctx.fill();
          if (stroke) {
            ctx.strokeStyle = stroke;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
          }
        };

        // --- HEADER SECTION ---
        drawRoundedRect(40, 30, width - 80, 100, 16, 'rgba(30, 41, 59, 0.85)', 'rgba(56, 189, 248, 0.3)', 1.5);
        
        // Header Accent Badge
        drawRoundedRect(60, 48, 64, 64, 14, 'rgba(34, 197, 94, 0.15)', '#22c55e', 2);
        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 30px sans-serif';
        ctx.fillText('📊', 76, 90);

        // Header Titles
        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('LAPORAN GRAFIK ANALISIS MANPOWER & ABSENSI', 140, 68);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText(`Rentang Periode: ${startDate} s/d ${endDate} (${calculateDays()} Hari)   •   Cakupan PT: ${selectedPt === 'ALL' ? 'Semua PT (TBP, GPS, GTS)' : 'PT ' + selectedPt}   •   Total Manpower: ${rangeAggregates.totalEmployees} Orang`, 140, 96);

        // Generated Watermark Badge
        drawRoundedRect(width - 290, 52, 230, 56, 10, 'rgba(15, 23, 42, 0.8)', 'rgba(148, 163, 184, 0.3)');
        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('PREPLAB PORTAL ANALYTICS', width - 275, 74);
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText(`Export: ${now.toLocaleDateString('id-ID')} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`, width - 275, 94);

        // --- TOP KPI CARDS SECTION ---
        const kpis = [
          { label: 'TOTAL KARYAWAN', value: rangeAggregates.totalEmployees, unit: 'Orang', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)', border: 'rgba(56, 189, 248, 0.3)' },
          { label: 'TOTAL IZIN KARYAWAN', value: rangeAggregates.totalIzinDays, unit: 'Hari', color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.1)', border: 'rgba(45, 212, 191, 0.3)' },
          { label: 'TOTAL SAKIT (SITE+LUAR)', value: rangeAggregates.totalSakitDays, unit: 'Hari', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)' },
          { label: 'TOTAL ALPA / MANGKIR', value: rangeAggregates.totalAlpaDays, unit: 'Hari', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)', border: 'rgba(244, 63, 94, 0.3)' },
          { label: 'SPDK & SANKSI AKTIF', value: rangeAggregates.totalActiveSpdk, unit: 'Kasus', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.1)', border: 'rgba(192, 132, 252, 0.3)' }
        ];

        const cardW = (width - 80 - 40) / 5;
        kpis.forEach((kpi, i) => {
          const cx = 40 + i * (cardW + 10);
          const cy = 145;
          drawRoundedRect(cx, cy, cardW, 85, 12, kpi.bg, kpi.border, 1.5);

          ctx.fillStyle = '#94a3b8';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(kpi.label, cx + 14, cy + 26);

          ctx.fillStyle = kpi.color;
          ctx.font = 'bold 28px sans-serif';
          ctx.fillText(String(kpi.value), cx + 14, cy + 62);

          ctx.fillStyle = '#64748b';
          ctx.font = '12px sans-serif';
          const valWidth = ctx.measureText(String(kpi.value)).width;
          ctx.fillText(kpi.unit, cx + 20 + valWidth, cy + 62);
        });

        // --- 4 MAIN CHARTS (2x2 GRID) ---
        const gridW = (width - 80 - 20) / 2;
        const gridH = 410;
        const topY = 245;
        const bottomY = 675;

        // ================= CHART 1: IZIN KARYAWAN (TOP LEFT) =================
        const c1x = 40;
        const c1y = topY;
        drawRoundedRect(c1x, c1y, gridW, gridH, 16, 'rgba(30, 41, 59, 0.7)', 'rgba(45, 212, 191, 0.3)', 1.5);
        
        ctx.fillStyle = '#2dd4bf';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('📋 Distribusi & Top Izin Karyawan', c1x + 20, c1y + 36);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText(`Total: ${rangeAggregates.totalIzinDays} Hari Kejadian pada Periode Terpilih`, c1x + 20, c1y + 58);

        // Chart 1 Bars (Top 5 Izin)
        const topIzin = rangeAggregates.izinByEmp.slice(0, 5);
        const maxIzin = Math.max(...topIzin.map(d => d.count), 5);
        if (topIzin.length === 0) {
          ctx.fillStyle = '#64748b';
          ctx.font = 'italic 14px sans-serif';
          ctx.fillText('Tidak ada data izin pada rentang tanggal ini.', c1x + 20, c1y + 120);
        } else {
          topIzin.forEach((item, idx) => {
            const barY = c1y + 85 + idx * 60;
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText(`${idx + 1}. ${item.name}`, c1x + 20, barY + 12);
            ctx.fillStyle = '#64748b';
            ctx.font = '11px sans-serif';
            ctx.fillText(`${item.dept} • NIK: ${item.nik}`, c1x + 20, barY + 28);

            // Bar background & progress
            const maxBarWidth = gridW - 240;
            const barWidth = Math.max(12, (item.count / maxIzin) * maxBarWidth);
            drawRoundedRect(c1x + 180, barY + 4, maxBarWidth, 20, 6, 'rgba(15, 23, 42, 0.6)');
            drawRoundedRect(c1x + 180, barY + 4, barWidth, 20, 6, '#14b8a6');

            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`${item.count} Hari`, c1x + 190 + maxBarWidth, barY + 18);
          });
        }

        // ================= CHART 2: SPDK & SANKSI AKTIF (TOP RIGHT) =================
        const c2x = 40 + gridW + 20;
        const c2y = topY;
        drawRoundedRect(c2x, c2y, gridW, gridH, 16, 'rgba(30, 41, 59, 0.7)', 'rgba(192, 132, 252, 0.3)', 1.5);

        ctx.fillStyle = '#c084fc';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('⚖️ Rekapitulasi SPDK & Sanksi Disiplin', c2x + 20, c2y + 36);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText(`Total Kasus Aktif: ${rangeAggregates.totalActiveSpdk} Karyawan Terkena Sanksi`, c2x + 20, c2y + 58);

        const spData = [
          { label: 'Surat Teguran (ST)', count: rangeAggregates.spdkCounts.st, color: '#facc15' },
          { label: 'Surat Peringatan 1 (SP1)', count: rangeAggregates.spdkCounts.sp1, color: '#fb923c' },
          { label: 'Surat Peringatan 2 (SP2)', count: rangeAggregates.spdkCounts.sp2, color: '#f87171' },
          { label: 'Surat Peringatan 3 (SP3)', count: rangeAggregates.spdkCounts.sp3, color: '#ef4444' },
          { label: 'Sanksi SP-PT', count: rangeAggregates.spdkCounts.sppt, color: '#e11d48' },
          { label: 'Pemutusan Hub. Kerja (PHK)', count: rangeAggregates.spdkCounts.phk, color: '#881337' }
        ];
        const maxSp = Math.max(...spData.map(d => d.count), 5);

        spData.forEach((sp, idx) => {
          const barY = c2y + 85 + idx * 50;
          ctx.fillStyle = '#f8fafc';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(sp.label, c2x + 20, barY + 16);

          const maxBarWidth = gridW - 250;
          const barWidth = sp.count > 0 ? Math.max(10, (sp.count / maxSp) * maxBarWidth) : 0;
          drawRoundedRect(c2x + 190, barY + 2, maxBarWidth, 18, 5, 'rgba(15, 23, 42, 0.6)');
          if (barWidth > 0) {
            drawRoundedRect(c2x + 190, barY + 2, barWidth, 18, 5, sp.color);
          }

          ctx.fillStyle = sp.count > 0 ? sp.color : '#64748b';
          ctx.font = 'bold 12px sans-serif';
          ctx.fillText(`${sp.count} Kasus`, c2x + 200 + maxBarWidth, barY + 16);
        });

        // ================= CHART 3: SAKIT SITE VS LUAR (BOTTOM LEFT) =================
        const c3x = 40;
        const c3y = bottomY;
        drawRoundedRect(c3x, c3y, gridW, gridH, 16, 'rgba(30, 41, 59, 0.7)', 'rgba(251, 191, 36, 0.3)', 1.5);

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('🏥 Analisis Sakit Karyawan (Site vs Luar)', c3x + 20, c3y + 36);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText(`Total: ${rangeAggregates.totalSakitDays} Hari (Sakit Site: ${rangeAggregates.totalSakitSiteDays} | Sakit Luar: ${rangeAggregates.totalSakitLuarDays})`, c3x + 20, c3y + 58);

        // Mini Comparison Badges
        drawRoundedRect(c3x + 20, c3y + 80, (gridW - 60) / 2, 50, 10, 'rgba(245, 158, 11, 0.15)', '#f59e0b');
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('SAKIT SITE (SS)', c3x + 35, c3y + 100);
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`${rangeAggregates.totalSakitSiteDays} Hari`, c3x + 35, c3y + 122);

        drawRoundedRect(c3x + 30 + (gridW - 60) / 2, c3y + 80, (gridW - 60) / 2, 50, 10, 'rgba(249, 115, 22, 0.15)', '#f97316');
        ctx.fillStyle = '#f97316';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('SAKIT LUAR (SL)', c3x + 45 + (gridW - 60) / 2, c3y + 100);
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`${rangeAggregates.totalSakitLuarDays} Hari`, c3x + 45 + (gridW - 60) / 2, c3y + 122);

        // Top Sakit List
        const topSakit = rangeAggregates.sakitByEmp.slice(0, 4);
        if (topSakit.length === 0) {
          ctx.fillStyle = '#64748b';
          ctx.font = 'italic 14px sans-serif';
          ctx.fillText('Tidak ada rekap sakit pada rentang tanggal ini.', c3x + 20, c3y + 170);
        } else {
          topSakit.forEach((item, idx) => {
            const barY = c3y + 145 + idx * 55;
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText(`${idx + 1}. ${item.name}`, c3x + 20, barY + 14);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px sans-serif';
            ctx.fillText(`${item.dept} • SS: ${item.siteCount}h, SL: ${item.luarCount}h`, c3x + 20, barY + 30);

            const maxBarWidth = gridW - 240;
            const barWidth = Math.max(10, (item.total / Math.max(topSakit[0].total, 5)) * maxBarWidth);
            drawRoundedRect(c3x + 180, barY + 4, maxBarWidth, 18, 5, 'rgba(15, 23, 42, 0.6)');
            drawRoundedRect(c3x + 180, barY + 4, barWidth, 18, 5, '#f59e0b');

            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`${item.total} Hari`, c3x + 190 + maxBarWidth, barY + 18);
          });
        }

        // ================= CHART 4: ALPA & PELANGGARAN KEHADIRAN (BOTTOM RIGHT) =================
        const c4x = 40 + gridW + 20;
        const c4y = bottomY;
        drawRoundedRect(c4x, c4y, gridW, gridH, 16, 'rgba(30, 41, 59, 0.7)', 'rgba(244, 63, 94, 0.3)', 1.5);

        ctx.fillStyle = '#f43f5e';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('⚠️ Rekapitulasi Alpa & Pelanggaran Kehadiran', c4x + 20, c4y + 36);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.fillText(`Total: ${rangeAggregates.totalAlpaDays} Hari Mangkir Tanpa Keterangan`, c4x + 20, c4y + 58);

        const topAlpa = rangeAggregates.alpaByEmp.slice(0, 5);
        const maxAlpa = Math.max(...topAlpa.map(d => d.count), 5);

        if (topAlpa.length === 0) {
          drawRoundedRect(c4x + 20, c4y + 90, gridW - 40, 100, 12, 'rgba(34, 197, 94, 0.1)', 'rgba(34, 197, 94, 0.3)');
          ctx.fillStyle = '#22c55e';
          ctx.font = 'bold 16px sans-serif';
          ctx.fillText('✨ DISIPLIN 100% - TIDAK ADA ALPA', c4x + 40, c4y + 130);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '13px sans-serif';
          ctx.fillText('Seluruh karyawan hadir sesuai jadwal kerja pada rentang tanggal ini.', c4x + 40, c4y + 155);
        } else {
          topAlpa.forEach((item, idx) => {
            const barY = c4y + 85 + idx * 60;
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 13px sans-serif';
            ctx.fillText(`${idx + 1}. ${item.name}`, c4x + 20, barY + 12);
            ctx.fillStyle = '#64748b';
            ctx.font = '11px sans-serif';
            ctx.fillText(`${item.dept} • NIK: ${item.nik}`, c4x + 20, barY + 28);

            const maxBarWidth = gridW - 240;
            const barWidth = Math.max(12, (item.count / maxAlpa) * maxBarWidth);
            drawRoundedRect(c4x + 180, barY + 4, maxBarWidth, 20, 6, 'rgba(15, 23, 42, 0.6)');
            drawRoundedRect(c4x + 180, barY + 4, barWidth, 20, 6, '#f43f5e');

            ctx.fillStyle = '#f43f5e';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(`${item.count} Hari`, c4x + 190 + maxBarWidth, barY + 18);
          });
        }

        // --- FOOTER SECTION ---
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.fillText('Laporan Grafik Resmi PrepLab Portal • PT Trimegah Bangun Persada & PT Gane Permai Sentosa • Confidential Internal Report', 40, height - 20);

        // Download PNG
        const imgUrl = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = imgUrl;
        link.download = `Laporan_Grafik_Manpower_${selectedPt}_${startDate}_sd_${endDate}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Grafik PNG (High Resolution) berhasil diunduh!');
      } catch (err: any) {
        toast.error('Gagal mengekspor grafik PNG: ' + err.message);
      } finally {
        setIsExportingPng(false);
      }
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col"
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-[#135e69] via-[#1a7684] to-[#22a7b8] p-5 sm:p-6 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/30 flex items-center justify-center backdrop-blur-md text-white shadow-inner">
                <CalendarRange className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                  <span>Penarikan &amp; Ekspor Data Time Range</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 border border-white/30 text-teal-100">
                    Periode Khusus
                  </span>
                </h3>
                <p className="text-xs text-teal-100/90 mt-0.5">
                  Tentukan rentang tanggal untuk sinkronisasi data atau ekspor laporan Excel &amp; PNG grafik.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh] custom-scrollbar">
          {/* Quick Preset Chips */}
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#22a7b8]" />
              <span>Preset Rentang Cepat</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handlePreset('thisMonth')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-[#135e69] hover:border-teal-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => handlePreset('lastMonth')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-[#135e69] hover:border-teal-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
              >
                Bulan Lalu
              </button>
              <button
                type="button"
                onClick={() => handlePreset('last30')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-[#135e69] hover:border-teal-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
              >
                30 Hari Terakhir
              </button>
              <button
                type="button"
                onClick={() => handlePreset('thisQuarter')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-[#135e69] hover:border-teal-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
              >
                Kuartal Ini
              </button>
              <button
                type="button"
                onClick={() => handlePreset('thisYear')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-teal-50 hover:text-[#135e69] hover:border-teal-200 border border-slate-200 text-xs font-semibold text-slate-700 transition-all cursor-pointer"
              >
                Tahun 2026 Full
              </button>
            </div>
          </div>

          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#135e69]" />
                <span>Tanggal Mulai (From)</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#135e69]" />
                <span>Tanggal Selesai (To)</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 text-xs font-medium bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
              />
            </div>

            <div className="col-span-1 sm:col-span-2 pt-1 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Rentang Waktu:</span>
              <span className="font-bold font-mono text-[#135e69] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                {calculateDays()} Hari Kerja
              </span>
            </div>
          </div>

          {/* Scope PT & Kategori Filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Pilihan Perusahaan */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                <span>Cakupan Perusahaan (PT)</span>
              </label>
              <select
                value={selectedPt}
                onChange={e => setSelectedPt(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
              >
                {isSectionManager && <option value="ALL">Semua PT (TBP, GPS, GTS)</option>}
                <option value="TBP">PT TBP &amp; GPS</option>
                <option value="GTS">PT GTS</option>
              </select>
            </div>

            {/* Pilihan Kategori Data */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                <span>Kategori Data Sinkronisasi</span>
              </label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value as any)}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#22a7b8]"
              >
                <option value="all">Semua Data (Full Dataset)</option>
                <option value="attendance">Rekap Absensi (Izin, Sakit, Alpa)</option>
                <option value="spdk">Sanksi Disiplin &amp; SPDK</option>
                <option value="manpower">Master Manpower &amp; Profil</option>
              </select>
            </div>
          </div>

          {/* Real-Time Period Summary Cards */}
          <div className="p-4 bg-gradient-to-br from-slate-50 to-teal-50/40 rounded-2xl border border-teal-100 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#135e69]" />
                <span>Ringkasan Data Periode ({startDate} s/d {endDate})</span>
              </span>
              <span className="text-[11px] font-mono text-[#135e69] bg-white px-2 py-0.5 rounded-full border border-teal-200">
                {rangeAggregates.totalEmployees} Karyawan
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-teal-600 uppercase block">Total Izin</span>
                <span className="text-base font-black text-slate-800">{rangeAggregates.totalIzinDays}</span>
                <span className="text-[10px] text-slate-400 font-medium ml-1">Hari</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-600 uppercase block">Total Sakit</span>
                <span className="text-base font-black text-slate-800">{rangeAggregates.totalSakitDays}</span>
                <span className="text-[10px] text-slate-400 font-medium ml-1">Hari</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-rose-600 uppercase block">Total Alpa</span>
                <span className="text-base font-black text-slate-800">{rangeAggregates.totalAlpaDays}</span>
                <span className="text-[10px] text-slate-400 font-medium ml-1">Hari</span>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold text-purple-600 uppercase block">SPDK Aktif</span>
                <span className="text-base font-black text-slate-800">{rangeAggregates.totalActiveSpdk}</span>
                <span className="text-[10px] text-slate-400 font-medium ml-1">Kasus</span>
              </div>
            </div>
          </div>

          {fetchSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">{fetchSuccess}</span>
            </div>
          )}
        </div>

        {/* Footer Actions (2 Pilihan Ekspor: Excel & PNG Grafik + Tarik Data) */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* 2 Opsi Ekspor */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleExportExcel}
                disabled={isExportingExcel || isFetching}
                className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                title="Ekspor Seluruh Rekap Data Absensi & Karyawan ke Format Excel / CSV"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Ekspor Data Excel</span>
              </button>

              <button
                type="button"
                onClick={handleExportPngChart}
                disabled={isExportingPng || isFetching}
                className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl bg-white hover:bg-indigo-50 text-indigo-800 border border-indigo-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                title="Ekspor Grafik Analisis (Izin, SPDK, Sakit, Alpa) ke Gambar PNG High Resolution"
              >
                <FileImage className="w-4 h-4 text-indigo-600" />
                <span>{isExportingPng ? 'Memproses...' : 'Ekspor PNG Grafik'}</span>
              </button>
            </div>

            {/* Tombol Batal & Tarik Data */}
            <div className="flex items-center gap-2 w-full sm:w-auto ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isFetching}
                className="px-3.5 py-2.5 rounded-xl bg-transparent hover:bg-slate-200/60 text-slate-600 text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleFetchData}
                disabled={isFetching}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#135e69] to-[#22a7b8] hover:from-[#0f4d56] hover:to-[#1a8997] text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-60"
              >
                {isFetching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menarik Data...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Tarik &amp; Sinkronkan Data</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
