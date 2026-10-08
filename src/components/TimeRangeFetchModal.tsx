import React, { useState, useMemo } from 'react';
import { 
  X, Calendar, CalendarRange, Download, RefreshCw, 
  CheckCircle2, AlertTriangle, FileSpreadsheet, Filter, 
  Layers, Clock, ArrowRight, Sparkles, Building2,
  FileImage, BarChart3, Activity, ShieldAlert, HeartHandshake,
  PieChart, Users, AlertOctagon, FileText
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
    
    // Dept breakdown for comparative clustered chart
    const deptMap: Record<string, { izin: number; sakit: number; alpa: number; count: number }> = {};

    const spdkCounts = {
      st: 0,
      sp1: 0,
      sp2: 0,
      sp3: 0,
      sppt: 0,
      phk: 0
    };

    filteredEmployees.forEach(emp => {
      const deptKey = emp.department || emp.section || 'General';
      if (!deptMap[deptKey]) {
        deptMap[deptKey] = { izin: 0, sakit: 0, alpa: 0, count: 0 };
      }
      deptMap[deptKey].count++;

      const att26 = emp.attendance2026 || emp.attendance?.['2026'] || emp.attendance?.[2026] || emp.attendanceData?.['2026'] || {};
      
      // Izin
      const rawIzin = [...parseDateList(att26.tanggalIzin || att26.tanggal_izin), ...parseDateList(att26.tanggalIzinKhusus || att26.tanggal_izin_khusus)];
      const filteredIzin = rawIzin.filter(isDateInRange);
      if (filteredIzin.length > 0) {
        totalIzinDays += filteredIzin.length;
        deptMap[deptKey].izin += filteredIzin.length;
        izinByEmp.push({
          nik: emp.nik,
          name: emp.name || emp.nama || emp.nik,
          dept: deptKey,
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
        deptMap[deptKey].sakit += totalSakit;
        sakitByEmp.push({
          nik: emp.nik,
          name: emp.name || emp.nama || emp.nik,
          dept: deptKey,
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
        deptMap[deptKey].alpa += filteredAlpa.length;
        alpaByEmp.push({
          nik: emp.nik,
          name: emp.name || emp.nama || emp.nik,
          dept: deptKey,
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
      spdkCounts,
      deptBreakdown: Object.entries(deptMap).map(([dept, data]) => ({ dept, ...data }))
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
        ['LAPORAN DATA REKAPITULASI MANPOWER & ABSENSI - PREPLAB PORTAL'],
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

  // 2. Export Ultra-HD Official Management Reporting Diagram (PNG 2400x1680 High-Res)
  const handleExportPngChart = () => {
    setIsExportingPng(true);
    toast.info('Menyusun Diagram Pelaporan Resmi Resolusi Tinggi (HD)...');

    setTimeout(() => {
      try {
        const width = 2400;
        const height = 1680;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context tidak tersedia');

        // Font constant for ultra crisp typography
        const FONT_FAMILY = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif';

        // Document Paper Background (Ultra Clean Formal Executive White)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, width, height);

        // Document Border Frame
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(35, 35, width - 70, height - 70);
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.strokeRect(35, 35, width - 70, height - 70);

        // Helper: Rounded Rectangle with optional top-only or all rounded
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

        // --- 1. OFFICIAL CORPORATE HEADER ---
        const headGrad = ctx.createLinearGradient(35, 35, width - 35, 35);
        headGrad.addColorStop(0, '#0a2e35');
        headGrad.addColorStop(0.5, '#135e69');
        headGrad.addColorStop(1, '#0e7490');
        ctx.fillStyle = headGrad;
        ctx.fillRect(35, 35, width - 70, 130);

        // Header Company Logo Box
        drawRoundedRect(65, 55, 90, 90, 16, '#ffffff', '#e2e8f0', 1.5);
        ctx.fillStyle = '#135e69';
        ctx.font = `bold 44px ${FONT_FAMILY}`;
        ctx.textAlign = 'center';
        ctx.fillText('PL', 110, 116);
        ctx.textAlign = 'left';

        // Header Titles
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 32px ${FONT_FAMILY}`;
        ctx.fillText('DIAGRAM & LAPORAN ANALISIS ABSENSI, KEDISIPLINAN & MANPOWER', 180, 92);

        ctx.fillStyle = '#ccfbf1';
        ctx.font = `17px ${FONT_FAMILY}`;
        ctx.fillText('PREPLAB PORTAL ENTERPRISE • PT TRIMEGAH BANGUN PERSADA Tbk & PT GANE PERMAI SENTOSA', 180, 126);

        // Metadata Header Table Box (Right Side)
        drawRoundedRect(width - 540, 52, 480, 96, 10, 'rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.3)', 1);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 14px ${FONT_FAMILY}`;
        ctx.fillText(`NO. LAPORAN : RPT/PLP/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${Math.floor(1000 + Math.random() * 9000)}`, width - 520, 78);
        ctx.font = `13px ${FONT_FAMILY}`;
        ctx.fillText(`PERIODE        : ${startDate} s/d ${endDate} (${calculateDays()} Hari Kerja)`, width - 520, 102);
        ctx.fillText(`CAKUPAN PT : ${selectedPt === 'ALL' ? 'Semua PT (TBP & GTS)' : 'PT ' + selectedPt}   •   Cetak: ${now.toLocaleDateString('id-ID')}`, width - 520, 126);

        // --- 2. EXECUTIVE SUMMARY KPI INDICATOR STRIP (VERTICAL CLEAN NO OVERLAP) ---
        const kpis = [
          { label: 'TOTAL TENAGA KERJA', val: `${rangeAggregates.totalEmployees}`, sub: 'Karyawan Aktif', color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4' },
          { label: 'TOTAL HARI IZIN', val: `${rangeAggregates.totalIzinDays}`, sub: `${rangeAggregates.izinByEmp.length} Karyawan Izin`, color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd' },
          { label: 'TOTAL HARI SAKIT', val: `${rangeAggregates.totalSakitDays}`, sub: `Site: ${rangeAggregates.totalSakitSiteDays}h • Luar: ${rangeAggregates.totalSakitLuarDays}h`, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
          { label: 'TOTAL ALPA (MANGKIR)', val: `${rangeAggregates.totalAlpaDays}`, sub: rangeAggregates.totalAlpaDays === 0 ? 'Disiplin 100%' : `${rangeAggregates.alpaByEmp.length} Karyawan Alpa`, color: '#e11d48', bg: '#fff1f2', border: '#fecdd3' },
          { label: 'SPDK & SANKSI AKTIF', val: `${rangeAggregates.totalActiveSpdk}`, sub: 'Kasus Dalam Pembinaan', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' }
        ];

        const kpiW = (width - 140 - 48) / 5;
        kpis.forEach((kpi, idx) => {
          const kx = 70 + idx * (kpiW + 12);
          const ky = 185;
          drawRoundedRect(kx, ky, kpiW, 105, 12, kpi.bg, kpi.border, 1.5);

          // 1. Label Top
          ctx.fillStyle = '#475569';
          ctx.font = `bold 12px ${FONT_FAMILY}`;
          ctx.fillText(kpi.label, kx + 16, ky + 28);

          // 2. Large Number Middle
          ctx.fillStyle = kpi.color;
          ctx.font = `bold 36px ${FONT_FAMILY}`;
          ctx.fillText(kpi.val, kx + 16, ky + 68);

          // 3. Subtext Bottom
          ctx.fillStyle = '#64748b';
          ctx.font = `bold 12px ${FONT_FAMILY}`;
          ctx.fillText(kpi.sub, kx + 16, ky + 92);
        });

        // --- 3. 4 REPORTING DIAGRAM BLOCKS (2x2 GRID) ---
        const colW = (width - 140 - 24) / 2;
        const colH = 540;
        const row1Y = 310;
        const row2Y = 870;

        // ================= DIAGRAM 1: CLUSTERED COLUMN CHART (KOMPARASI PER DEPARTEMEN) =================
        const d1x = 70;
        const d1y = row1Y;
        drawRoundedRect(d1x, d1y, colW, colH, 14, '#ffffff', '#cbd5e1', 1.5);

        // Diagram 1 Header
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 19px ${FONT_FAMILY}`;
        ctx.fillText('DIAGRAM 1: Komparasi Absensi per Departemen / Section (Hari)', d1x + 24, d1y + 38);
        
        // Legend Box
        const d1Legends = [
          { label: 'Izin', color: '#0284c7' },
          { label: 'Sakit', color: '#d97706' },
          { label: 'Alpa', color: '#e11d48' }
        ];
        d1Legends.forEach((leg, i) => {
          const lx = d1x + colW - 270 + i * 85;
          ctx.fillStyle = leg.color;
          drawRoundedRect(lx, d1y + 24, 14, 14, 3, leg.color);
          ctx.fillStyle = '#334155';
          ctx.font = `bold 13px ${FONT_FAMILY}`;
          ctx.fillText(leg.label, lx + 22, d1y + 36);
        });

        // Diagram 1 Chart Plot Area
        const chartPlotX = d1x + 65;
        const chartPlotY = d1y + 75;
        const chartPlotW = colW - 95;
        const chartPlotH = colH - 160;

        // Grid lines Y
        const maxValD1 = Math.max(
          ...rangeAggregates.deptBreakdown.map(d => Math.max(d.izin, d.sakit, d.alpa)),
          5
        );
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1.5;
        for (let i = 0; i <= 4; i++) {
          const gy = chartPlotY + chartPlotH - (i / 4) * chartPlotH;
          ctx.beginPath();
          ctx.moveTo(chartPlotX, gy);
          ctx.lineTo(chartPlotX + chartPlotW, gy);
          ctx.stroke();

          ctx.fillStyle = '#64748b';
          ctx.font = `bold 12px ${FONT_FAMILY}`;
          ctx.textAlign = 'right';
          ctx.fillText(String(Math.round((i / 4) * maxValD1)), chartPlotX - 10, gy + 4);
        }
        ctx.textAlign = 'left';

        // Plot Clustered Bars
        const deptsToShow = rangeAggregates.deptBreakdown.slice(0, 5);
        if (deptsToShow.length === 0) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = `italic 15px ${FONT_FAMILY}`;
          ctx.fillText('Tidak ada data absensi departemen pada rentang waktu ini.', d1x + 120, d1y + 250);
        } else {
          const groupW = chartPlotW / deptsToShow.length;
          const barW = Math.min(28, (groupW - 24) / 3);

          deptsToShow.forEach((d, idx) => {
            const gx = chartPlotX + idx * groupW + (groupW - barW * 3 - 8) / 2;
            const baseY = chartPlotY + chartPlotH;

            // Bar 1: Izin
            const hIzin = Math.max(4, (d.izin / maxValD1) * chartPlotH);
            if (d.izin > 0) {
              drawRoundedRect(gx, baseY - hIzin, barW, hIzin, 4, '#0284c7');
              ctx.fillStyle = '#0f172a';
              ctx.font = `bold 12px ${FONT_FAMILY}`;
              ctx.textAlign = 'center';
              ctx.fillText(String(d.izin), gx + barW / 2, baseY - hIzin - 6);
            }

            // Bar 2: Sakit
            const hSakit = Math.max(4, (d.sakit / maxValD1) * chartPlotH);
            if (d.sakit > 0) {
              drawRoundedRect(gx + barW + 4, baseY - hSakit, barW, hSakit, 4, '#d97706');
              ctx.fillStyle = '#0f172a';
              ctx.font = `bold 12px ${FONT_FAMILY}`;
              ctx.textAlign = 'center';
              ctx.fillText(String(d.sakit), gx + barW + 4 + barW / 2, baseY - hSakit - 6);
            }

            // Bar 3: Alpa
            const hAlpa = Math.max(4, (d.alpa / maxValD1) * chartPlotH);
            if (d.alpa > 0) {
              drawRoundedRect(gx + (barW + 4) * 2, baseY - hAlpa, barW, hAlpa, 4, '#e11d48');
              ctx.fillStyle = '#0f172a';
              ctx.font = `bold 12px ${FONT_FAMILY}`;
              ctx.textAlign = 'center';
              ctx.fillText(String(d.alpa), gx + (barW + 4) * 2 + barW / 2, baseY - hAlpa - 6);
            }

            // X Axis Label
            ctx.fillStyle = '#1e293b';
            ctx.font = `bold 13px ${FONT_FAMILY}`;
            ctx.textAlign = 'center';
            const shortDept = d.dept.length > 16 ? d.dept.substring(0, 14) + '..' : d.dept;
            ctx.fillText(shortDept, gx + (barW * 3 + 8) / 2, baseY + 26);
            ctx.fillStyle = '#64748b';
            ctx.font = `11px ${FONT_FAMILY}`;
            ctx.fillText(`(${d.count} Karyawan)`, gx + (barW * 3 + 8) / 2, baseY + 44);
          });
          ctx.textAlign = 'left';
        }

        // ================= DIAGRAM 2: DONUT CHART (DISTRIBUSI SPDK & TINGKAT SANKSI) =================
        const d2x = 70 + colW + 24;
        const d2y = row1Y;
        drawRoundedRect(d2x, d2y, colW, colH, 14, '#ffffff', '#cbd5e1', 1.5);

        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 19px ${FONT_FAMILY}`;
        ctx.fillText('DIAGRAM 2: Distribusi Sanksi Disiplin & SPDK Berjalan', d2x + 24, d2y + 38);

        const spList = [
          { name: 'Surat Teguran (ST)', count: rangeAggregates.spdkCounts.st, color: '#eab308' },
          { name: 'Surat Peringatan 1 (SP1)', count: rangeAggregates.spdkCounts.sp1, color: '#f97316' },
          { name: 'Surat Peringatan 2 (SP2)', count: rangeAggregates.spdkCounts.sp2, color: '#f43f5e' },
          { name: 'Surat Peringatan 3 (SP3)', count: rangeAggregates.spdkCounts.sp3, color: '#dc2626' },
          { name: 'Sanksi SP-PT', count: rangeAggregates.spdkCounts.sppt, color: '#be123c' },
          { name: 'Pemutusan Hub. Kerja (PHK)', count: rangeAggregates.spdkCounts.phk, color: '#881337' }
        ];

        const totalSpCases = spList.reduce((sum, s) => sum + s.count, 0);
        const donutCenterX = d2x + 210;
        const donutCenterY = d2y + 280;
        const outerR = 150;
        const innerR = 90;

        if (totalSpCases === 0) {
          ctx.beginPath();
          ctx.arc(donutCenterX, donutCenterY, outerR, 0, Math.PI * 2);
          ctx.fillStyle = '#22c55e';
          ctx.fill();

          ctx.beginPath();
          ctx.arc(donutCenterX, donutCenterY, innerR, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.fillStyle = '#15803d';
          ctx.font = `bold 18px ${FONT_FAMILY}`;
          ctx.textAlign = 'center';
          ctx.fillText('NIHIL SPDK', donutCenterX, donutCenterY - 6);
          ctx.font = `13px ${FONT_FAMILY}`;
          ctx.fillText('100% Kondusif', donutCenterX, donutCenterY + 18);
          ctx.textAlign = 'left';
        } else {
          let startAngle = -Math.PI / 2;
          spList.forEach(sp => {
            if (sp.count > 0) {
              const sliceAngle = (sp.count / totalSpCases) * Math.PI * 2;
              ctx.beginPath();
              ctx.arc(donutCenterX, donutCenterY, outerR, startAngle, startAngle + sliceAngle);
              ctx.arc(donutCenterX, donutCenterY, innerR, startAngle + sliceAngle, startAngle, true);
              ctx.closePath();
              ctx.fillStyle = sp.color;
              ctx.fill();
              startAngle += sliceAngle;
            }
          });

          // Inner white hole
          ctx.beginPath();
          ctx.arc(donutCenterX, donutCenterY, innerR, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.font = `bold 32px ${FONT_FAMILY}`;
          ctx.textAlign = 'center';
          ctx.fillText(String(totalSpCases), donutCenterX, donutCenterY + 4);
          ctx.fillStyle = '#64748b';
          ctx.font = `bold 13px ${FONT_FAMILY}`;
          ctx.fillText('TOTAL SANKSI', donutCenterX, donutCenterY + 26);
          ctx.textAlign = 'left';
        }

        // Donut Legend Table on Right Side
        const legTableX = d2x + 400;
        const legTableY = d2y + 85;
        const legTableW = colW - 430;

        drawRoundedRect(legTableX, legTableY, legTableW, 410, 10, '#f8fafc', '#e2e8f0', 1);
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 14px ${FONT_FAMILY}`;
        ctx.fillText('RINCIAN TINGKAT SANKSI', legTableX + 18, legTableY + 30);

        spList.forEach((sp, idx) => {
          const sy = legTableY + 68 + idx * 54;
          drawRoundedRect(legTableX + 18, sy - 12, 14, 14, 3, sp.color);

          ctx.fillStyle = '#334155';
          ctx.font = `14px ${FONT_FAMILY}`;
          ctx.fillText(sp.name, legTableX + 42, sy);

          ctx.fillStyle = sp.count > 0 ? '#0f172a' : '#94a3b8';
          ctx.font = `bold 14px ${FONT_FAMILY}`;
          ctx.textAlign = 'right';
          const pct = totalSpCases > 0 ? Math.round((sp.count / totalSpCases) * 100) : 0;
          ctx.fillText(`${sp.count} (${pct}%)`, legTableX + legTableW - 18, sy);
          ctx.textAlign = 'left';

          ctx.strokeStyle = '#f1f5f9';
          ctx.beginPath();
          ctx.moveTo(legTableX + 18, sy + 16);
          ctx.lineTo(legTableX + legTableW - 18, sy + 16);
          ctx.stroke();
        });

        // ================= DIAGRAM 3: TOP RANKED HORIZONTAL BAR (IZIN & SAKIT) =================
        const d3x = 70;
        const d3y = row2Y;
        drawRoundedRect(d3x, d3y, colW, colH, 14, '#ffffff', '#cbd5e1', 1.5);

        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 19px ${FONT_FAMILY}`;
        ctx.fillText('DIAGRAM 3: Peringkat Karyawan dengan Izin Tertinggi', d3x + 24, d3y + 38);

        const topCombined = rangeAggregates.izinByEmp.slice(0, 5);
        const maxComb = Math.max(...topCombined.map(d => d.count), 5);

        if (topCombined.length === 0) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = `italic 15px ${FONT_FAMILY}`;
          ctx.fillText('Tidak ada rekaman izin khusus dalam periode pelaporan ini.', d3x + 50, d3y + 150);
        } else {
          topCombined.forEach((item, idx) => {
            const by = d3y + 80 + idx * 82;
            // Rank Number Badge
            drawRoundedRect(d3x + 24, by + 4, 36, 36, 8, '#f1f5f9', '#cbd5e1', 1);
            ctx.fillStyle = '#0f172a';
            ctx.font = `bold 16px ${FONT_FAMILY}`;
            ctx.textAlign = 'center';
            ctx.fillText(String(idx + 1), d3x + 42, by + 28);
            ctx.textAlign = 'left';

            // Employee Name & Dept
            ctx.fillStyle = '#0f172a';
            ctx.font = `bold 15px ${FONT_FAMILY}`;
            ctx.fillText(item.name, d3x + 72, by + 18);
            ctx.fillStyle = '#64748b';
            ctx.font = `12px ${FONT_FAMILY}`;
            ctx.fillText(`${item.dept} • NIK: ${item.nik}`, d3x + 72, by + 38);

            // Progress Bar
            const barStartX = d3x + 360;
            const barMaxW = colW - 480;
            const bw = Math.max(20, (item.count / maxComb) * barMaxW);
            drawRoundedRect(barStartX, by + 14, barMaxW, 20, 5, '#f1f5f9');
            drawRoundedRect(barStartX, by + 14, bw, 20, 5, '#0284c7');

            // Count Tag
            ctx.fillStyle = '#0f172a';
            ctx.font = `bold 15px ${FONT_FAMILY}`;
            ctx.fillText(`${item.count} Hari`, barStartX + barMaxW + 16, by + 29);
          });
        }

        // ================= DIAGRAM 4: EXECUTIVE SUMMARY MATRIX TABLE =================
        const d4x = 70 + colW + 24;
        const d4y = row2Y;
        drawRoundedRect(d4x, d4y, colW, colH, 14, '#ffffff', '#cbd5e1', 1.5);

        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 19px ${FONT_FAMILY}`;
        ctx.fillText('DIAGRAM 4: Matriks Evaluasi & Ringkasan Pelaporan', d4x + 24, d4y + 38);

        // Matrix Table Headers
        const tX = d4x + 24;
        const tY = d4y + 70;
        const tW = colW - 48;
        
        drawRoundedRect(tX, tY, tW, 44, 8, '#0f3a42');
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 13px ${FONT_FAMILY}`;
        ctx.fillText('KOMPONEN PELAPORAN', tX + 18, tY + 28);
        ctx.fillText('VOLUME', tX + 320, tY + 28);
        ctx.fillText('STATUS / EVALUASI', tX + 480, tY + 28);
        ctx.fillText('TINGKAT RISIKO', tX + tW - 160, tY + 28);

        const matrixRows = [
          {
            name: 'Kehadiran & Manpower Aktif',
            vol: `${rangeAggregates.totalEmployees} Orang`,
            stat: 'Tercatat Sesuai Master',
            risk: 'NORMAL (A)',
            riskColor: '#16a34a',
            riskBg: '#dcfce7'
          },
          {
            name: 'Ketidakhadiran Karena Izin',
            vol: `${rangeAggregates.totalIzinDays} Hari`,
            stat: `${rangeAggregates.izinByEmp.length} Karyawan Terdata`,
            risk: rangeAggregates.totalIzinDays > 20 ? 'PERHATIAN' : 'TERKENDALI',
            riskColor: rangeAggregates.totalIzinDays > 20 ? '#d97706' : '#16a34a',
            riskBg: rangeAggregates.totalIzinDays > 20 ? '#fef3c7' : '#dcfce7'
          },
          {
            name: 'Sakit Site (SS) & Luar (SL)',
            vol: `${rangeAggregates.totalSakitDays} Hari`,
            stat: `SS: ${rangeAggregates.totalSakitSiteDays}h, SL: ${rangeAggregates.totalSakitLuarDays}h`,
            risk: rangeAggregates.totalSakitDays > 15 ? 'EVALUASI MEDIS' : 'TERKENDALI',
            riskColor: rangeAggregates.totalSakitDays > 15 ? '#d97706' : '#16a34a',
            riskBg: rangeAggregates.totalSakitDays > 15 ? '#fef3c7' : '#dcfce7'
          },
          {
            name: 'Pelanggaran Alpa (Mangkir)',
            vol: `${rangeAggregates.totalAlpaDays} Hari`,
            stat: rangeAggregates.totalAlpaDays === 0 ? 'Disiplin Sempurna' : 'Perlu Konseling',
            risk: rangeAggregates.totalAlpaDays === 0 ? 'AMAT BAIK' : 'KRITIS (SPDK)',
            riskColor: rangeAggregates.totalAlpaDays === 0 ? '#16a34a' : '#dc2626',
            riskBg: rangeAggregates.totalAlpaDays === 0 ? '#dcfce7' : '#fee2e2'
          },
          {
            name: 'Sanksi Disiplin & SPDK Berjalan',
            vol: `${rangeAggregates.totalActiveSpdk} Kasus`,
            stat: rangeAggregates.totalActiveSpdk === 0 ? 'Kondusif 100%' : 'Dalam Pembinaan',
            risk: rangeAggregates.totalActiveSpdk > 5 ? 'PERHATIAN KHUSUS' : 'TERKONTROL',
            riskColor: rangeAggregates.totalActiveSpdk > 5 ? '#dc2626' : '#16a34a',
            riskBg: rangeAggregates.totalActiveSpdk > 5 ? '#fee2e2' : '#dcfce7'
          }
        ];

        matrixRows.forEach((r, idx) => {
          const ry = tY + 56 + idx * 72;
          drawRoundedRect(tX, ry, tW, 60, 8, idx % 2 === 0 ? '#ffffff' : '#f8fafc', '#e2e8f0', 1);

          ctx.fillStyle = '#0f172a';
          ctx.font = `bold 14px ${FONT_FAMILY}`;
          ctx.fillText(r.name, tX + 18, ry + 36);

          ctx.fillStyle = '#0284c7';
          ctx.font = `bold 14px ${FONT_FAMILY}`;
          ctx.fillText(r.vol, tX + 320, ry + 36);

          ctx.fillStyle = '#475569';
          ctx.font = `13px ${FONT_FAMILY}`;
          ctx.fillText(r.stat, tX + 480, ry + 36);

          // Risk Badge
          drawRoundedRect(tX + tW - 165, ry + 16, 150, 28, 6, r.riskBg);
          ctx.fillStyle = r.riskColor;
          ctx.font = `bold 12px ${FONT_FAMILY}`;
          ctx.textAlign = 'center';
          ctx.fillText(r.risk, tX + tW - 90, ry + 35);
          ctx.textAlign = 'left';
        });

        // --- 4. OFFICIAL SIGNATURE & APPROVAL BLOCK ---
        const sigY = 1440;
        const sigBoxW = (width - 140 - 48) / 3;

        // Signer 1: Administrator / Inspector
        drawRoundedRect(70, sigY, sigBoxW, 160, 10, '#ffffff', '#cbd5e1', 1.5);
        ctx.fillStyle = '#475569';
        ctx.font = `bold 13px ${FONT_FAMILY}`;
        ctx.fillText('DIBUAT OLEH (INSPECTOR / ADMIN):', 95, sigY + 32);
        ctx.strokeStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(95, sigY + 120);
        ctx.lineTo(70 + sigBoxW - 25, sigY + 120);
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 14px ${FONT_FAMILY}`;
        ctx.fillText(`NIK: ${inspectorNik || 'ADMINISTRATOR'}`, 95, sigY + 142);

        // Signer 2: Superintendent / Section Head
        drawRoundedRect(70 + sigBoxW + 24, sigY, sigBoxW, 160, 10, '#ffffff', '#cbd5e1', 1.5);
        ctx.fillStyle = '#475569';
        ctx.font = `bold 13px ${FONT_FAMILY}`;
        ctx.fillText('DIPERIKSA OLEH (SECTION HEAD):', 70 + sigBoxW + 48, sigY + 32);
        ctx.strokeStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(70 + sigBoxW + 48, sigY + 120);
        ctx.lineTo(70 + sigBoxW * 2, sigY + 120);
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 14px ${FONT_FAMILY}`;
        ctx.fillText('SUPERINTENDENT / SECTION HEAD', 70 + sigBoxW + 48, sigY + 142);

        // Signer 3: Section Manager
        drawRoundedRect(70 + (sigBoxW + 24) * 2, sigY, sigBoxW, 160, 10, '#ffffff', '#cbd5e1', 1.5);
        ctx.fillStyle = '#475569';
        ctx.font = `bold 13px ${FONT_FAMILY}`;
        ctx.fillText('DISETUJUI OLEH (SECTION MANAGER):', 70 + (sigBoxW + 24) * 2 + 25, sigY + 32);
        ctx.strokeStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(70 + (sigBoxW + 24) * 2 + 25, sigY + 120);
        ctx.lineTo(width - 95, sigY + 120);
        ctx.stroke();
        ctx.fillStyle = '#0f172a';
        ctx.font = `bold 14px ${FONT_FAMILY}`;
        ctx.fillText('SECTION MANAGER PREPARATION LAB', 70 + (sigBoxW + 24) * 2 + 25, sigY + 142);

        // Footer Legal & Authenticity Text
        ctx.fillStyle = '#94a3b8';
        ctx.font = `12px ${FONT_FAMILY}`;
        ctx.fillText('Dokumen ini digenerate secara otomatis oleh PrepLab Portal Enterprise • Bersifat Rahasia Internal Perusahaan • Sah Tanpa Perubahan.', 70, height - 16);

        // Download PNG Diagram
        const imgUrl = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = imgUrl;
        link.download = `Diagram_Pelaporan_Manpower_${selectedPt}_${startDate}_sd_${endDate}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Diagram Pelaporan HD (2400x1680) berhasil diunduh!');
      } catch (err: any) {
        toast.error('Gagal mengekspor diagram pelaporan: ' + err.message);
      } finally {
        setIsExportingPng(false);
      }
    }, 200);
  };

  if (!isOpen) return null;

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
                  Tentukan rentang tanggal untuk sinkronisasi data atau ekspor laporan Excel &amp; Diagram Pelaporan PNG.
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

        {/* Footer Actions (2 Pilihan Ekspor: Excel & Diagram Pelaporan PNG + Tarik Data) */}
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
                title="Ekspor Diagram Pelaporan Lengkap (Komparasi Absensi, SPDK, Evaluasi Matrix, Approval)"
              >
                <FileImage className="w-4 h-4 text-indigo-600" />
                <span>{isExportingPng ? 'Menyusun Diagram...' : 'Ekspor PNG Diagram'}</span>
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
