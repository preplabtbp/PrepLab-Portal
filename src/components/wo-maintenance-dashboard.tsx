import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, Activity, Clock, Package, Filter, Download, 
  Search, RefreshCw, CheckCircle2, AlertTriangle, ArrowUpRight, 
  ChevronLeft, ChevronRight, Eye, Layers, Sparkles, SlidersHorizontal, 
  Calendar, FileSpreadsheet, X, ShieldAlert, Check, Cpu, Hammer, BarChart2
} from 'lucide-react';
import { Card, Button, Input, Select } from './ui';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { 
  getISOWeek, 
  getISOWeekYear, 
  isDateInISOWeek, 
  isThisISOWeek, 
  isLastISOWeek, 
  getYearISOWeeksList, 
  getISOWeekRange,
  formatISOWeekLabel 
} from '../utils/iso-week';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface WOMaintenanceDashboardProps {
  onBack?: () => void;
  inspectorNik?: string;
  onNavigateToWO?: (woId: string) => void;
}

export function WOMaintenanceDashboard({ onBack, inspectorNik, onNavigateToWO }: WOMaintenanceDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    summary?: any;
    categorySummary?: Record<string, { totalDowntime: number; woCount: number }>;
    equipmentList?: any[];
    sparepartsList?: any[];
    rawWorkOrders?: any[];
  }>({});

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'Instrument (L)' | 'Non-Instrument (PL)'>('ALL');
  const [selectedEquipmentCode, setSelectedEquipmentCode] = useState<string>('ALL');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal Detail WO Preview
  const [selectedWO, setSelectedWO] = useState<any | null>(null);

  // Pagination & Search for Bottom Drilldown Table
  const [tableCurrentPage, setTableCurrentPage] = useState<number>(1);
  const [tableSearchQuery, setTableSearchQuery] = useState<string>('');
  const ITEMS_PER_PAGE = 20;

  const isoWeeksList = useMemo(() => getYearISOWeeksList(new Date().getFullYear()), []);

  // Reset pagination to page 1 whenever any filter or search changes
  useEffect(() => {
    setTableCurrentPage(1);
  }, [selectedCategory, selectedEquipmentCode, filterPeriod, customStartDate, customEndDate, searchQuery, tableSearchQuery]);

  // Helper to filter out testing/dummy work orders
  const isDummyOrTestWO = (wo: any): boolean => {
    if (!wo) return false;
    const desc = String(wo.issueDescription || wo.issue_description || '').toLowerCase().trim();
    const action = String(wo.actionTaken || wo.action_taken || '').toLowerCase().trim();
    const eqName = String(wo.equipmentName || wo.equipment_name || '').toLowerCase().trim();
    const woId = String(wo.woId || wo.wo_id || '').toLowerCase().trim();

    // Test keywords to filter out
    const testKeywords = [
      'testing', 'test', 'dummy', 'percobaan', 'coba', 'tes wo', 'testing wo',
      'test wa', 'testing wa', 'trial', 'hanya tes', 'hanya test', 'ujicoba'
    ];

    for (const kw of testKeywords) {
      if (desc.includes(kw) || action.includes(kw) || eqName.includes(kw) || woId.includes(kw)) {
        return true;
      }
    }

    // Repetitive single character patterns e.g. "dddddd", "aaaa", "zzzz"
    if (/^([a-z0-9])\1{2,}$/i.test(desc)) {
      return true;
    }

    // Keyboard smash patterns e.g. "asdf", "qwerty", "zxcv"
    if (/^(asdf|qwerty|zxcv|1234)/i.test(desc)) {
      return true;
    }

    return false;
  };

  // Helper to compute maintenance summary from all raw work orders (Unified TBP & GPS)
  const computeClientSummary = (allWOs: any[], period: string, startCustom?: string, endCustom?: string) => {
    const normalizeCategory = (cat: string | null | undefined): 'Instrument (L)' | 'Non-Instrument (PL)' => {
      if (!cat) return 'Non-Instrument (PL)';
      const c = cat.toLowerCase();
      if (c.includes('instrument') && !c.includes('non')) return 'Instrument (L)';
      return 'Non-Instrument (PL)';
    };

    const parseDowntime = (d: any): number => {
      if (d === null || d === undefined) return 0;
      const str = String(d).trim().replace(',', '.');
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    };

    const parseQty = (q: any): number => {
      if (q === null || q === undefined) return 0;
      const str = String(q).trim().replace(',', '.');
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    };

    // Filter out dummy/testing entries
    let filtered = allWOs.filter(wo => !isDummyOrTestWO(wo));
    
    // Filter by period
    if (period === 'this_iso_week' || period === 'this_week') {
      filtered = filtered.filter(wo => wo.date && isThisISOWeek(wo.date));
    } else if (period === 'last_iso_week' || period === 'last_week') {
      filtered = filtered.filter(wo => wo.date && isLastISOWeek(wo.date));
    } else if (period.startsWith('iso_')) {
      const parts = period.split('_'); // e.g. iso_2026_34
      const targetYear = parseInt(parts[1], 10);
      const targetWeek = parseInt(parts[2], 10);
      if (!isNaN(targetYear) && !isNaN(targetWeek)) {
        filtered = filtered.filter(wo => wo.date && isDateInISOWeek(wo.date, targetYear, targetWeek));
      }
    } else if (period === 'this_month') {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      filtered = filtered.filter(wo => wo.date && new Date(wo.date) >= start);
    } else if (period === 'last_30_days') {
      const past = new Date();
      past.setDate(past.getDate() - 30);
      filtered = filtered.filter(wo => wo.date && new Date(wo.date) >= past);
    } else if (period === 'this_year') {
      const start = new Date(new Date().getFullYear(), 0, 1);
      filtered = filtered.filter(wo => wo.date && new Date(wo.date) >= start);
    } else if (period === 'custom' && startCustom && endCustom) {
      const s = new Date(startCustom);
      const e = new Date(endCustom);
      e.setHours(23, 59, 59, 999);
      filtered = filtered.filter(wo => {
        if (!wo.date) return false;
        const d = new Date(wo.date);
        return d >= s && d <= e;
      });
    }

    let totalDowntimeHours = 0;
    let totalSparepartUnits = 0;
    const categorySummary: Record<string, { totalDowntime: number; woCount: number; openCount: number; inProgressCount: number; closedCount: number }> = {
      'Instrument (L)': { totalDowntime: 0, woCount: 0, openCount: 0, inProgressCount: 0, closedCount: 0 },
      'Non-Instrument (PL)': { totalDowntime: 0, woCount: 0, openCount: 0, inProgressCount: 0, closedCount: 0 }
    };

    const equipmentMap = new Map<string, any>();
    const sparepartMap = new Map<string, any>();

    for (const wo of filtered) {
      const cat = normalizeCategory(wo.category);
      const dt = parseDowntime(wo.downtimeDuration ?? wo.downtime_duration);
      const qty = parseQty(wo.sparepartQty ?? wo.sparepart_qty);
      const status = wo.status || 'Closed';
      const isClosed = status === 'Closed' || status === 'Resolved';
      const isInProgress = status === 'In Progress';
      const isOpen = status === 'Open';

      totalDowntimeHours += dt;
      totalSparepartUnits += qty;

      if (categorySummary[cat]) {
        categorySummary[cat].totalDowntime += dt;
        categorySummary[cat].woCount += 1;
        if (isClosed) categorySummary[cat].closedCount += 1;
        if (isInProgress) categorySummary[cat].inProgressCount += 1;
        if (isOpen) categorySummary[cat].openCount += 1;
      }

      const eqCode = (wo.equipmentCode ?? wo.equipment_code ?? '').trim() || 'General';
      const eqName = (wo.equipmentName ?? wo.equipment_name ?? '').trim() || 'Peralatan Lainnya';
      const eqKey = `${eqCode}___${eqName}`;

      if (!equipmentMap.has(eqKey)) {
        equipmentMap.set(eqKey, {
          equipmentCode: eqCode,
          equipmentName: eqName,
          category: cat,
          woCount: 0,
          totalDowntime: 0,
          openCount: 0,
          inProgressCount: 0,
          closedCount: 0,
          spareparts: {},
          mttr: 0
        });
      }

      const eqStat = equipmentMap.get(eqKey);
      eqStat.woCount += 1;
      eqStat.totalDowntime += dt;
      if (isClosed) eqStat.closedCount += 1;
      if (isInProgress) eqStat.inProgressCount += 1;
      if (isOpen) eqStat.openCount += 1;

      const spName = (wo.sparepartName ?? wo.sparepart_name ?? '').trim();
      if (spName) {
        eqStat.spareparts[spName] = (eqStat.spareparts[spName] || 0) + qty;

        if (!sparepartMap.has(spName)) {
          sparepartMap.set(spName, {
            sparepartName: spName,
            totalQty: 0,
            usedCount: 0,
            equipments: new Set<string>()
          });
        }
        const spStat = sparepartMap.get(spName);
        spStat.totalQty += qty;
        spStat.usedCount += 1;
        spStat.equipments.add(eqName);
      }
    }

    const equipmentList = Array.from(equipmentMap.values()).map(eq => ({
      ...eq,
      totalDowntime: Number(eq.totalDowntime.toFixed(1)),
      mttr: eq.woCount > 0 ? Number((eq.totalDowntime / eq.woCount).toFixed(1)) : 0
    })).sort((a, b) => b.totalDowntime - a.totalDowntime);

    const sparepartsList = Array.from(sparepartMap.values()).map(sp => ({
      sparepartName: sp.sparepartName,
      totalQty: Number(sp.totalQty.toFixed(0)),
      usedCount: sp.usedCount,
      equipments: Array.from(sp.equipments)
    })).sort((a, b) => b.totalQty - a.totalQty);

    const totalWOs = filtered.length;
    const mttrHours = totalWOs > 0 ? Number((totalDowntimeHours / totalWOs).toFixed(1)) : 0;

    return {
      status: 'success',
      summary: {
        totalWorkOrders: totalWOs,
        totalDowntimeHours: Number(totalDowntimeHours.toFixed(1)),
        mttrHours,
        totalSparepartUnits: Number(totalSparepartUnits.toFixed(0)),
        totalEquipmentsWithDowntime: equipmentList.length,
        topDowntimeEquipment: equipmentList[0] || null
      },
      categorySummary,
      equipmentList,
      sparepartsList,
      rawWorkOrders: filtered.map(w => ({
        id: w.id,
        woId: w.woId || w.wo_id,
        date: w.date,
        shift: w.shift,
        pt: w.pt || 'TBP',
        equipmentCode: w.equipmentCode || w.equipment_code,
        equipmentName: w.equipmentName || w.equipment_name,
        category: normalizeCategory(w.category),
        issueDescription: w.issueDescription || w.issue_description,
        actionTaken: w.actionTaken || w.action_taken,
        downtimeDuration: parseDowntime(w.downtimeDuration ?? w.downtime_duration),
        sparepartName: w.sparepartName || w.sparepart_name,
        sparepartQty: parseQty(w.sparepartQty ?? w.sparepart_qty),
        technicianPic: w.technicianPic || w.technician_pic,
        status: w.status || 'Closed',
        photoUrl: w.photoUrl || w.photo_url,
        closingPhoto: w.closingPhoto || w.closing_photo,
        pdfUrl: w.pdfUrl || w.pdf_url
      }))
    };
  };

  // Fetch all work orders directly and compute unified maintenance summary
  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      // 1. Try pre-calculated maintenance summary
      try {
        const summaryRes = await fetch('/api/work-orders/maintenance-summary', {
          headers: { 'Accept': 'application/json' }
        });
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          if (summaryData && Array.isArray(summaryData.rawWorkOrders) && summaryData.rawWorkOrders.length > 0) {
            const clientRes = computeClientSummary(summaryData.rawWorkOrders, filterPeriod, customStartDate, customEndDate);
            setData(clientRes);
            return;
          }
        }
      } catch (err) {
        console.warn('Fallback to direct work-orders query:', err);
      }

      // 2. Direct fetch fallback
      const resRaw = await fetch('/api/work-orders?pt=ALL', {
        headers: { 'Accept': 'application/json' }
      });
      const contentType = resRaw.headers.get('content-type') || '';
      if (resRaw.ok && contentType.includes('application/json')) {
        const rawJson = await resRaw.json();
        const allWOs = Array.isArray(rawJson) ? rawJson : [];
        const summaryResult = computeClientSummary(allWOs, filterPeriod, customStartDate, customEndDate);
        setData(summaryResult);
      } else {
        throw new Error('Gagal memuat data work orders dari server');
      }
    } catch (e: any) {
      console.error('Error fetching maintenance data:', e);
      toast.error('Gagal mengambil data rekapitulasi maintenance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceData();
  }, [filterPeriod, customStartDate, customEndDate]);

  // List of all raw WOs from backend
  const rawWorkOrders = useMemo(() => data.rawWorkOrders || [], [data.rawWorkOrders]);

  // Available unique equipments from list
  const availableEquipments = useMemo(() => {
    const list = data.equipmentList || [];
    if (selectedCategory === 'ALL') return list;
    return list.filter(eq => eq.category === selectedCategory);
  }, [data.equipmentList, selectedCategory]);

  // Filtered WOs based on Category, Equipment Selection, and Search Query
  const filteredWorkOrders = useMemo(() => {
    return rawWorkOrders.filter(wo => {
      // Exclude dummy / test work orders
      if (isDummyOrTestWO(wo)) return false;

      // Category Filter
      if (selectedCategory !== 'ALL') {
        const woCat = (wo.category || '').toLowerCase();
        if (selectedCategory === 'Instrument (L)') {
          if (!woCat.includes('instrument') || woCat.includes('non')) return false;
        } else if (selectedCategory === 'Non-Instrument (PL)') {
          if (!woCat.includes('non') && !woCat.includes('prep') && woCat.includes('instrument')) return false;
        }
      }

      // Equipment Code / Key Filter
      if (selectedEquipmentCode !== 'ALL') {
        const eqCode = (wo.equipmentCode || '').trim();
        const eqName = (wo.equipmentName || '').trim();
        const key = `${eqCode}___${eqName}`;
        if (eqCode !== selectedEquipmentCode && key !== selectedEquipmentCode && eqName !== selectedEquipmentCode) {
          return false;
        }
      }

      // Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchWO = (wo.woId || '').toLowerCase().includes(q);
        const matchTool = (wo.equipmentName || '').toLowerCase().includes(q);
        const matchIssue = (wo.issueDescription || '').toLowerCase().includes(q);
        const matchAction = (wo.actionTaken || '').toLowerCase().includes(q);
        const matchPic = (wo.technicianPic || '').toLowerCase().includes(q);
        const matchSp = (wo.sparepartName || '').toLowerCase().includes(q);
        if (!matchWO && !matchTool && !matchIssue && !matchAction && !matchPic && !matchSp) {
          return false;
        }
      }

      return true;
    });
  }, [rawWorkOrders, selectedCategory, selectedEquipmentCode, searchQuery]);

  // Dynamically computed KPI metrics for the filtered view
  const computedMetrics = useMemo(() => {
    let totalDowntime = 0;
    let totalSparepartQty = 0;
    let closedCount = 0;
    let progressCount = 0;
    let openCount = 0;

    const toolDowntimeMap: Record<string, { code: string; name: string; category: string; downtime: number; woCount: number }> = {};
    const sparepartsAgg: Record<string, { qty: number; count: number; tools: Set<string> }> = {};

    filteredWorkOrders.forEach(wo => {
      let dt = 0;
      if (wo.downtimeDuration) {
        const parsed = parseFloat(String(wo.downtimeDuration).replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) dt = parsed;
      }
      if (dt === 0 && wo.repairStart && wo.repairEnd) {
        const diffMs = new Date(wo.repairEnd).getTime() - new Date(wo.repairStart).getTime();
        if (diffMs > 0) dt = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
      }

      totalDowntime += dt;

      const st = (wo.status || 'Open').toLowerCase();
      if (st === 'closed') closedCount++;
      else if (st.includes('progress')) progressCount++;
      else openCount++;

      // Tool breakdown
      const eqName = wo.equipmentName?.trim() || 'Alat Tanpa Nama';
      const eqCode = wo.equipmentCode?.trim() || '-';
      const key = `${eqCode}___${eqName}`;
      if (!toolDowntimeMap[key]) {
        toolDowntimeMap[key] = {
          code: eqCode,
          name: eqName,
          category: wo.category || 'Non-Instrument (PL)',
          downtime: 0,
          woCount: 0
        };
      }
      toolDowntimeMap[key].downtime += dt;
      toolDowntimeMap[key].woCount += 1;

      // Spareparts breakdown
      if (wo.sparepartName && wo.sparepartName.trim()) {
        const rawNames = wo.sparepartName.split(/[,;\n+]/).map((s: string) => s.trim()).filter(Boolean);
        const qtyVal = parseFloat(String(wo.sparepartQty || '1').replace(',', '.')) || 1;
        const perPartQty = rawNames.length > 0 ? qtyVal / rawNames.length : qtyVal;

        rawNames.forEach((sp: string) => {
          totalSparepartQty += perPartQty;
          if (!sparepartsAgg[sp]) {
            sparepartsAgg[sp] = { qty: 0, count: 0, tools: new Set() };
          }
          sparepartsAgg[sp].qty += perPartQty;
          sparepartsAgg[sp].count += 1;
          sparepartsAgg[sp].tools.add(eqName);
        });
      }
    });

    const sortedTools = Object.values(toolDowntimeMap).map(t => ({
      ...t,
      downtime: Math.round(t.downtime * 10) / 10,
      mttr: t.woCount > 0 ? Math.round((t.downtime / t.woCount) * 10) / 10 : 0
    })).sort((a, b) => b.downtime - a.downtime);

    const sortedSpareparts = Object.entries(sparepartsAgg).map(([name, data]) => ({
      name,
      qty: Math.round(data.qty * 10) / 10,
      count: data.count,
      tools: Array.from(data.tools)
    })).sort((a, b) => b.qty - a.qty);

    const mttr = filteredWorkOrders.length > 0
      ? Math.round((totalDowntime / filteredWorkOrders.length) * 10) / 10
      : 0;

    return {
      totalDowntime: Math.round(totalDowntime * 10) / 10,
      totalWOs: filteredWorkOrders.length,
      mttr,
      totalSparepartQty: Math.round(totalSparepartQty * 10) / 10,
      closedCount,
      progressCount,
      openCount,
      sortedTools,
      sortedSpareparts,
      topTool: sortedTools[0] || null
    };
  }, [filteredWorkOrders]);

  // Selected tool object if specific equipment is picked
  const activeSelectedTool = useMemo(() => {
    if (selectedEquipmentCode === 'ALL') return null;
    return computedMetrics.sortedTools.find(
      t => t.code === selectedEquipmentCode || `${t.code}___${t.name}` === selectedEquipmentCode || t.name === selectedEquipmentCode
    ) || null;
  }, [selectedEquipmentCode, computedMetrics.sortedTools]);

  // Chart Data 1: Top 10 Equipment by Downtime (Bar Chart)
  const equipmentBarChartData = useMemo(() => {
    const topTools = computedMetrics.sortedTools.slice(0, 10);
    return {
      labels: topTools.map(t => t.name.length > 20 ? t.name.substring(0, 18) + '...' : t.name),
      datasets: [
        {
          label: 'Total Downtime (Jam)',
          data: topTools.map(t => t.downtime),
          backgroundColor: topTools.map(t => 
            (t.category || '').toLowerCase().includes('instrument') && !(t.category || '').toLowerCase().includes('non')
              ? '#0284c7' 
              : '#0d9488'
          ),
          borderRadius: 6,
        }
      ]
    };
  }, [computedMetrics.sortedTools]);

  // Chart Data 2: Category Share (Doughnut Chart)
  const categoryDoughnutData = useMemo(() => {
    let instrumentDowntime = 0;
    let nonInstrumentDowntime = 0;

    filteredWorkOrders.forEach(wo => {
      let dt = parseFloat(String(wo.downtimeDuration || '0').replace(',', '.')) || 0;
      const c = (wo.category || '').toLowerCase();
      if (c.includes('instrument') && !c.includes('non')) {
        instrumentDowntime += dt;
      } else {
        nonInstrumentDowntime += dt;
      }
    });

    return {
      labels: ['Instrument (L)', 'Non-Instrument (PL)'],
      datasets: [
        {
          data: [
            Math.round(instrumentDowntime * 10) / 10, 
            Math.round(nonInstrumentDowntime * 10) / 10
          ],
          backgroundColor: ['#0284c7', '#0d9488'],
          borderColor: ['#ffffff', '#ffffff'],
          borderWidth: 2
        }
      ]
    };
  }, [filteredWorkOrders]);

  // Chart Data 3: Top Spareparts Used
  const sparepartsBarChartData = useMemo(() => {
    const topSp = computedMetrics.sortedSpareparts.slice(0, 8);
    return {
      labels: topSp.map(s => s.name),
      datasets: [
        {
          label: 'Total Qty Diganti (Unit/Pcs)',
          data: topSp.map(s => s.qty),
          backgroundColor: '#f59e0b',
          borderRadius: 6,
        }
      ]
    };
  }, [computedMetrics.sortedSpareparts]);

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const exportData = filteredWorkOrders.map((wo, idx) => ({
        'No': idx + 1,
        'No. WO': wo.woId || '-',
        'Tanggal Kerusakan': wo.date ? new Date(wo.date).toLocaleString('id-ID') : '-',
        'Shift': wo.shift || '-',
        'Kode Alat': wo.equipmentCode || '-',
        'Nama Alat': wo.equipmentName || '-',
        'Kategori': wo.category || '-',
        'Lokasi Area': wo.location || '-',
        'Deskripsi Kerusakan': wo.issueDescription || '-',
        'Tindakan Perbaikan': wo.actionTaken || '-',
        'Downtime (Jam)': wo.downtimeDuration || '0',
        'Sparepart Diganti': wo.sparepartName || '-',
        'Qty Sparepart': wo.sparepartQty || '-',
        'Teknisi PIC': wo.technicianPic || '-',
        'Mulai Perbaikan': wo.repairStart ? new Date(wo.repairStart).toLocaleString('id-ID') : '-',
        'Selesai Perbaikan': wo.repairEnd ? new Date(wo.repairEnd).toLocaleString('id-ID') : '-',
        'Status': wo.status || 'Open',
        'Pelapor (Requestor)': wo.requestorName || '-'
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Downtime WO');
      
      const fileName = `Rekap_WO_Maintenance_${selectedCategory}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Data berhasil diexport ke file ${fileName}`);
    } catch (e: any) {
      console.error('Error exporting Excel:', e);
      toast.error('Gagal mengekspor data Excel');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 animate-in fade-in duration-300 max-w-7xl mx-auto px-2.5 sm:px-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 p-4 sm:p-5 rounded-2xl sm:rounded-3xl text-white shadow-md border border-slate-700/60">
        <div className="flex items-start sm:items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white active:scale-95 cursor-pointer shrink-0 mt-0.5 sm:mt-0"
              title="Kembali ke Menu Utama"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 sm:p-1.5 rounded-lg bg-teal-500/20 border border-teal-400/30 text-teal-300 shrink-0">
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              <h1 className="text-base sm:text-2xl font-display font-bold tracking-tight leading-tight">
                Dashboard WO Maintenance & Downtime
              </h1>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-1 line-clamp-1 sm:line-clamp-none">
              Rekapitulasi breakdown alat, konsumsi sparepart, dan durasi perbaikan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-center justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-700/50">
          <Button
            onClick={fetchMaintenanceData}
            variant="secondary"
            className="flex-1 sm:!w-auto h-8 sm:h-9 text-xs flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 border-white/10 text-white cursor-pointer rounded-xl"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button
            onClick={handleExportExcel}
            className="flex-1 sm:!w-auto h-8 sm:h-9 text-xs flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm cursor-pointer rounded-xl"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Export Excel</span>
          </Button>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <Card className="p-3.5 sm:p-5 border shadow-xs space-y-3.5 rounded-2xl">
        <div 
          className="flex items-center justify-between gap-2 pb-2.5 border-b"
          style={{ borderColor: 'var(--border-main, #E2E8F0)' }}
        >
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span 
              className="text-[11px] sm:text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-main, #0f172a)' }}
            >
              Filter Parameter
            </span>
          </div>

          {(selectedCategory !== 'ALL' || selectedEquipmentCode !== 'ALL' || filterPeriod !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('ALL');
                setSelectedEquipmentCode('ALL');
                setFilterPeriod('all');
                setSearchQuery('');
              }}
              className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer ml-auto"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          
          {/* 1. Category Filter */}
          <div>
            <label 
              className="text-[10px] sm:text-[11px] font-bold block mb-1 uppercase tracking-wide"
              style={{ color: 'var(--text-main, #0f172a)' }}
            >
              Kategori Alat
            </label>
            <div 
              className="grid grid-cols-3 gap-1 p-1 rounded-xl border"
              style={{ 
                backgroundColor: 'var(--input-bg, #F8FAFC)',
                borderColor: 'var(--border-main, #CBD5E1)' 
              }}
            >
              {[
                { key: 'ALL', label: 'Semua' },
                { key: 'Instrument (L)', label: 'Instrument' },
                { key: 'Non-Instrument (PL)', label: 'Non-Instr' }
              ].map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat.key as any);
                    setSelectedEquipmentCode('ALL');
                  }}
                  className={`py-1.5 px-1.5 rounded-lg text-xs font-bold transition-all truncate cursor-pointer text-center ${
                    selectedCategory === cat.key
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'hover:bg-slate-200/80'
                  }`}
                  style={selectedCategory === cat.key ? {} : { color: 'var(--text-main, #0f172a)' }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Specific Equipment Selector */}
          <div>
            <label 
              className="text-[10px] sm:text-[11px] font-bold block mb-1 uppercase tracking-wide"
              style={{ color: 'var(--text-main, #0f172a)' }}
            >
              Pilih Alat Spesifik
            </label>
            <select
              value={selectedEquipmentCode}
              onChange={e => setSelectedEquipmentCode(e.target.value)}
              className="w-full h-9.5 text-xs font-bold px-3 rounded-xl border outline-none focus:ring-2 focus:ring-teal-500/30 shadow-2xs cursor-pointer"
              style={{
                backgroundColor: 'var(--input-bg, #FFFFFF)',
                color: 'var(--text-main, #0f172a)',
                borderColor: 'var(--border-main, #CBD5E1)'
              }}
            >
              <option value="ALL" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                🌟 Semua Alat ({availableEquipments.length} Alat)
              </option>
              {availableEquipments.map((eq: any) => {
                const key = `${eq.equipmentCode}___${eq.equipmentName}`;
                return (
                  <option key={key} value={key} style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                    {eq.equipmentName} ({eq.totalDowntime} Jam • {eq.woCount} WO)
                  </option>
                );
              })}
            </select>
          </div>

          {/* 3. Time Period Filter */}
          <div>
            <label 
              className="text-[10px] sm:text-[11px] font-bold block mb-1 uppercase tracking-wide"
              style={{ color: 'var(--text-main, #0f172a)' }}
            >
              Rentang Waktu
            </label>
            <select
              value={filterPeriod}
              onChange={e => setFilterPeriod(e.target.value)}
              className="w-full h-9.5 text-xs font-bold px-3 rounded-xl border outline-none focus:ring-2 focus:ring-teal-500/30 shadow-2xs cursor-pointer"
              style={{
                backgroundColor: 'var(--input-bg, #FFFFFF)',
                color: 'var(--text-main, #0f172a)',
                borderColor: 'var(--border-main, #CBD5E1)'
              }}
            >
              <optgroup label="⚡ Filter Cepat & Minggu ISO">
                <option value="all" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>📅 Semua Waktu</option>
                <option value="this_iso_week" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>⚡ Minggu ISO Ini (W{String(getISOWeek(new Date())).padStart(2, '0')})</option>
                <option value="last_iso_week" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>⏮️ Minggu ISO Lalu (W{String(Math.max(1, getISOWeek(new Date()) - 1)).padStart(2, '0')})</option>
                <option value="this_month" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>🗓️ Bulan Ini (Mulai Tgl 1)</option>
                <option value="last_30_days" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>⏱️ 30 Hari Terakhir</option>
                <option value="this_year" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>📆 Tahun Berjalan ({new Date().getFullYear()})</option>
                <option value="custom" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>🎯 Kustom Rentang Tanggal...</option>
              </optgroup>
              <optgroup label="📋 Pilih Spesifik Minggu ISO">
                {isoWeeksList.map(iw => (
                  <option key={iw.value} value={iw.value} style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                    {iw.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* 4. Search Filter */}
          <div>
            <label 
              className="text-[10px] sm:text-[11px] font-bold block mb-1 uppercase tracking-wide"
              style={{ color: 'var(--text-main, #0f172a)' }}
            >
              Pencarian Cepat
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Cari No. WO, alat, PIC..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9.5 text-xs pl-8 pr-3 rounded-xl border placeholder:text-slate-400 outline-none font-semibold focus:ring-2 focus:ring-teal-500/30 shadow-2xs"
                style={{
                  backgroundColor: 'var(--input-bg, #FFFFFF)',
                  color: 'var(--text-main, #0f172a)',
                  borderColor: 'var(--border-main, #CBD5E1)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Custom Date Inputs if custom period picked */}
        {filterPeriod === 'custom' && (
          <div 
            className="flex flex-wrap items-center gap-2.5 pt-2.5 border-t"
            style={{ borderColor: 'var(--border-main, #E2E8F0)' }}
          >
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold" style={{ color: 'var(--text-main, #0f172a)' }}>Dari:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="text-xs px-2.5 py-1 rounded-lg border font-semibold"
                style={{
                  backgroundColor: 'var(--input-bg, #FFFFFF)',
                  color: 'var(--text-main, #0f172a)',
                  borderColor: 'var(--border-main, #CBD5E1)'
                }}
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold" style={{ color: 'var(--text-main, #0f172a)' }}>Sampai:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="text-xs px-2.5 py-1 rounded-lg border font-semibold"
                style={{
                  backgroundColor: 'var(--input-bg, #FFFFFF)',
                  color: 'var(--text-main, #0f172a)',
                  borderColor: 'var(--border-main, #CBD5E1)'
                }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* ACTIVE EQUIPMENT FILTER BANNER (If specific tool is chosen) */}
      {activeSelectedTool && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-xs sm:text-sm text-teal-950">
                  {activeSelectedTool.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-teal-200 text-teal-900 border border-teal-300">
                  {activeSelectedTool.code || '-'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300">
                  {activeSelectedTool.category}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-teal-900 mt-0.5 font-medium">
                Total Downtime: <strong className="font-bold text-teal-950">{activeSelectedTool.downtime} Jam</strong> • {activeSelectedTool.woCount} WO • MTTR: {activeSelectedTool.mttr} Jam/kasus
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedEquipmentCode('ALL')}
            className="text-xs font-bold text-teal-800 hover:text-teal-950 hover:underline flex items-center gap-1 self-start sm:self-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Tampilkan Semua Alat
          </button>
        </div>
      )}

      {/* EXECUTIVE KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        
        {/* Card 1: Total Jam Downtime */}
        <Card className="p-3 sm:p-5 border shadow-xs relative overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span 
              className="text-[10px] sm:text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-muted, #475569)' }}
            >
              Total Downtime
            </span>
            <span className="p-1.5 sm:p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-3xl font-display font-black text-rose-700">
              {computedMetrics.totalDowntime}
            </span>
            <span 
              className="text-[11px] sm:text-xs font-bold"
              style={{ color: 'var(--text-muted, #475569)' }}
            >
              Jam
            </span>
          </div>
          <p 
            className="text-[10px] sm:text-[11px] font-semibold mt-1 truncate"
            style={{ color: 'var(--text-muted, #475569)' }}
          >
            Dari {computedMetrics.totalWOs} kasus kerusakan
          </p>
        </Card>

        {/* Card 2: Total Work Orders */}
        <Card className="p-3 sm:p-5 border shadow-xs relative overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span 
              className="text-[10px] sm:text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-muted, #475569)' }}
            >
              Total Work Order
            </span>
            <span className="p-1.5 sm:p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span 
              className="text-xl sm:text-3xl font-display font-black"
              style={{ color: 'var(--text-main, #0f172a)' }}
            >
              {computedMetrics.totalWOs}
            </span>
            <span 
              className="text-[11px] sm:text-xs font-bold"
              style={{ color: 'var(--text-muted, #475569)' }}
            >
              WO
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[9px] sm:text-[10px] font-bold flex-wrap">
            <span className="text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 flex items-center gap-0.5">
              <CheckCircle2 className="w-2.5 h-2.5" /> {computedMetrics.closedCount} Done
            </span>
            {computedMetrics.openCount > 0 && (
              <span className="text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300 flex items-center gap-0.5">
                <AlertTriangle className="w-2.5 h-2.5" /> {computedMetrics.openCount} Open
              </span>
            )}
          </div>
        </Card>

        {/* Card 3: MTTR (Mean Time to Repair) */}
        <Card className="p-3 sm:p-5 border shadow-xs relative overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span 
              className="text-[10px] sm:text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-muted, #475569)' }}
            >
              MTTR Perbaikan
            </span>
            <span className="p-1.5 sm:p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-3xl font-display font-black text-teal-700">
              {computedMetrics.mttr}
            </span>
            <span 
              className="text-[11px] sm:text-xs font-bold"
              style={{ color: 'var(--text-muted, #475569)' }}
            >
              Jam/Kasus
            </span>
          </div>
          <p 
            className="text-[10px] sm:text-[11px] font-semibold mt-1 truncate"
            style={{ color: 'var(--text-muted, #475569)' }}
          >
            Rata-rata waktu henti
          </p>
        </Card>

        {/* Card 4: Total Sparepart Diganti */}
        <Card className="p-3 sm:p-5 border shadow-xs relative overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span 
              className="text-[10px] sm:text-xs font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-muted, #475569)' }}
            >
              Sparepart Diganti
            </span>
            <span className="p-1.5 sm:p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl sm:text-3xl font-display font-black text-amber-700">
              {computedMetrics.totalSparepartQty}
            </span>
            <span 
              className="text-[11px] sm:text-xs font-bold"
              style={{ color: 'var(--text-muted, #475569)' }}
            >
              Unit
            </span>
          </div>
          <p 
            className="text-[10px] sm:text-[11px] font-semibold mt-1 truncate"
            style={{ color: 'var(--text-muted, #475569)' }}
          >
            {computedMetrics.sortedSpareparts.length} jenis komponen
          </p>
        </Card>

      </div>

      {/* VISUAL CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 sm:gap-4">
        
        {/* Chart 1: Bar Chart Top Equipment by Downtime */}
        <Card className="lg:col-span-2 p-4 sm:p-5 border shadow-xs rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 
                className="font-bold text-xs sm:text-sm flex items-center gap-1.5"
                style={{ color: 'var(--text-main, #0f172a)' }}
              >
                <BarChart2 className="w-4 h-4 text-teal-600" />
                Downtime per Alat (Top Breakdown)
              </h3>
              <p 
                className="text-[11px] font-medium mt-0.5"
                style={{ color: 'var(--text-muted, #475569)' }}
              >
                Akumulasi jam henti perbaikan tertinggi.
              </p>
            </div>
            <span 
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border"
              style={{ 
                backgroundColor: 'var(--input-bg, #F1F5F9)',
                color: 'var(--text-main, #0f172a)',
                borderColor: 'var(--border-main, #CBD5E1)'
              }}
            >
              {computedMetrics.sortedTools.length} Alat
            </span>
          </div>

          <div className="h-56 sm:h-72">
            {computedMetrics.sortedTools.length === 0 ? (
              <div 
                className="h-full flex items-center justify-center text-xs font-semibold"
                style={{ color: 'var(--text-muted, #64748B)' }}
              >
                Tidak ada data downtime pada filter ini
              </div>
            ) : (
              <Bar 
                data={equipmentBarChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => ` Total Downtime: ${ctx.raw} Jam`
                      }
                    }
                  },
                  scales: {
                    x: {
                      ticks: {
                        maxRotation: 35,
                        minRotation: 0,
                        font: { size: 10 }
                      }
                    },
                    y: {
                      beginAtZero: true,
                      title: { display: true, text: 'Jam' }
                    }
                  }
                }} 
              />
            )}
          </div>
        </Card>

        {/* Chart 2: Category Share (Doughnut Chart) */}
        <Card className="p-4 sm:p-5 border shadow-xs flex flex-col justify-between rounded-2xl">
          <div>
            <h3 
              className="font-bold text-xs sm:text-sm mb-0.5 flex items-center gap-1.5"
              style={{ color: 'var(--text-main, #0f172a)' }}
            >
              <Layers className="w-4 h-4 text-teal-600" />
              Proporsi Downtime Kategori
            </h3>
            <p 
              className="text-[11px] mb-3 font-medium"
              style={{ color: 'var(--text-muted, #475569)' }}
            >
              Instrument (Lab) vs Non-Instrument (Prep).
            </p>

            <div className="h-44 sm:h-48 flex items-center justify-center relative">
              {computedMetrics.totalDowntime === 0 ? (
                <div 
                  className="text-xs font-semibold"
                  style={{ color: 'var(--text-muted, #64748B)' }}
                >
                  Belum ada data
                </div>
              ) : (
                <Doughnut
                  data={categoryDoughnutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { 
                        position: 'bottom',
                        labels: { boxWidth: 10, font: { size: 10 } }
                      }
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Quick Category Stats */}
          <div 
            className="mt-3 pt-2.5 border-t grid grid-cols-2 gap-2 text-center"
            style={{ borderColor: 'var(--border-main, #E2E8F0)' }}
          >
            <div className="p-2 rounded-xl bg-blue-50 border border-blue-200">
              <span className="text-[10px] font-bold text-blue-900 block">Instrument</span>
              <span className="text-xs sm:text-sm font-black text-blue-950">
                {data.categorySummary?.['Instrument (L)']?.totalDowntime || 0} Jam
              </span>
            </div>
            <div className="p-2 rounded-xl bg-teal-50 border border-teal-200">
              <span className="text-[10px] font-bold text-teal-900 block">Non-Instrument</span>
              <span className="text-xs sm:text-sm font-black text-teal-950">
                {data.categorySummary?.['Non-Instrument (PL)']?.totalDowntime || 0} Jam
              </span>
            </div>
          </div>
        </Card>

      </div>

      {/* REKAPITULASI PENGGUNAAN SPAREPART ROW */}
      <Card className="p-4 sm:p-5 border shadow-xs rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-3.5">
          <div>
            <h3 
              className="font-bold text-xs sm:text-sm flex items-center gap-1.5"
              style={{ color: 'var(--text-main, #0f172a)' }}
            >
              <Package className="w-4 h-4 text-amber-600" />
              Rekapitulasi Penggunaan Sparepart
            </h3>
            <p 
              className="text-[11px] font-medium"
              style={{ color: 'var(--text-muted, #475569)' }}
            >
              Komponen suku cadang yang digunakan dalam pemulihan unit.
            </p>
          </div>
          <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-lg border border-amber-300 self-start sm:self-center">
            {computedMetrics.sortedSpareparts.length} Komponen Terpakai
          </span>
        </div>

        {computedMetrics.sortedSpareparts.length === 0 ? (
          <div 
            className="p-6 text-center text-xs font-semibold rounded-xl border border-dashed"
            style={{ 
              backgroundColor: 'var(--input-bg, #F8FAFC)',
              borderColor: 'var(--border-main, #CBD5E1)',
              color: 'var(--text-muted, #64748B)'
            }}
          >
            Tidak ada penggunaan sparepart tercatat pada filter ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {computedMetrics.sortedSpareparts.slice(0, 9).map((sp) => (
              <div 
                key={sp.name}
                className="p-3 rounded-xl border hover:border-amber-400 flex flex-col justify-between gap-2 shadow-2xs transition-all"
                style={{
                  backgroundColor: 'var(--card-bg, #FFFFFF)',
                  borderColor: 'var(--border-main, #CBD5E1)'
                }}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 
                      className="font-bold text-xs truncate" 
                      title={sp.name}
                      style={{ color: 'var(--text-main, #0f172a)' }}
                    >
                      {sp.name}
                    </h4>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                      {sp.qty} Qty
                    </span>
                  </div>
                  <p 
                    className="text-[11px] mt-1 line-clamp-1" 
                    title={sp.tools.join(', ')}
                    style={{ color: 'var(--text-muted, #475569)' }}
                  >
                    Untuk: <strong className="font-bold" style={{ color: 'var(--text-main, #0f172a)' }}>{sp.tools.join(', ')}</strong>
                  </p>
                </div>
                <div 
                  className="pt-1.5 border-t flex items-center justify-between text-[10px] font-semibold"
                  style={{ 
                    borderColor: 'var(--border-main, #E2E8F0)',
                    color: 'var(--text-muted, #64748B)'
                  }}
                >
                  <span>Frekuensi: {sp.count}x perbaikan</span>
                  <span className="font-bold text-teal-700">Terpasang</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* DRILLDOWN WORK ORDER LIST (MOBILE CARDS + DESKTOP TABLE) */}
      {(() => {
        const tableFilteredWorkOrders = filteredWorkOrders.filter(wo => {
          if (!tableSearchQuery.trim()) return true;
          const q = tableSearchQuery.toLowerCase();
          const str = [
            wo.woId, wo.equipmentName, wo.equipmentCode, wo.category,
            wo.issueDescription, wo.actionTaken, wo.sparepartName,
            wo.technicianPic, wo.status, wo.requestorName, wo.shift
          ].filter(Boolean).join(' ').toLowerCase();
          return str.includes(q);
        });

        const totalTablePages = Math.max(1, Math.ceil(tableFilteredWorkOrders.length / ITEMS_PER_PAGE));
        const startIndex = (tableCurrentPage - 1) * ITEMS_PER_PAGE;
        const paginatedWorkOrders = tableFilteredWorkOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

        return (
          <Card className="p-3.5 sm:p-5 border shadow-xs space-y-3.5 rounded-2xl">
            <div 
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b pb-3"
              style={{ borderColor: 'var(--border-main, #E2E8F0)' }}
            >
              <div>
                <h3 
                  className="font-bold text-xs sm:text-sm flex items-center gap-1.5"
                  style={{ color: 'var(--text-main, #0f172a)' }}
                >
                  <Layers className="w-4 h-4 text-teal-600" />
                  <span>Rincian Seluruh Work Order</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-900 border border-teal-300">
                    {tableFilteredWorkOrders.length} Kasus
                  </span>
                </h3>
                <p 
                  className="text-[11px] font-medium mt-0.5"
                  style={{ color: 'var(--text-muted, #475569)' }}
                >
                  Menampilkan 20 data per halaman.
                </p>
              </div>

              {/* Table Search & Range Summary */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Cari dalam daftar WO..."
                    value={tableSearchQuery}
                    onChange={e => {
                      setTableSearchQuery(e.target.value);
                      setTableCurrentPage(1);
                    }}
                    className="w-full h-8 text-xs pl-8 pr-3 rounded-lg border placeholder:text-slate-400 outline-none font-semibold focus:ring-2 focus:ring-teal-500/30"
                    style={{
                      backgroundColor: 'var(--input-bg, #FFFFFF)',
                      color: 'var(--text-main, #0f172a)',
                      borderColor: 'var(--border-main, #CBD5E1)'
                    }}
                  />
                  {tableSearchQuery && (
                    <button 
                      onClick={() => { setTableSearchQuery(''); setTableCurrentPage(1); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <span 
                  className="text-[11px] font-bold whitespace-nowrap"
                  style={{ color: 'var(--text-muted, #475569)' }}
                >
                  {tableFilteredWorkOrders.length > 0
                    ? `${startIndex + 1}-${Math.min(startIndex + ITEMS_PER_PAGE, tableFilteredWorkOrders.length)}/${tableFilteredWorkOrders.length}`
                    : '0'
                  }
                </span>
              </div>
            </div>

            {/* 1. MOBILE CARDS VIEW (< md screens) */}
            <div className="block md:hidden space-y-2.5">
              {paginatedWorkOrders.length === 0 ? (
                <div 
                  className="py-8 text-center text-xs font-semibold rounded-xl border border-dashed"
                  style={{ 
                    backgroundColor: 'var(--input-bg, #F8FAFC)',
                    borderColor: 'var(--border-main, #CBD5E1)',
                    color: 'var(--text-muted, #64748B)'
                  }}
                >
                  Tidak ada Work Order yang sesuai.
                </div>
              ) : (
                paginatedWorkOrders.map(wo => {
                  const isInstrument = (wo.category || '').toLowerCase().includes('instrument') && !(wo.category || '').toLowerCase().includes('non');
                  const dtVal = parseFloat(String(wo.downtimeDuration || '0').replace(',', '.')) || 0;
                  const st = (wo.status || 'Open').toLowerCase();

                  return (
                    <div 
                      key={wo.id || wo.woId}
                      className="p-3.5 rounded-2xl border space-y-2.5 shadow-2xs"
                      style={{
                        backgroundColor: 'var(--card-bg, #FFFFFF)',
                        borderColor: 'var(--border-main, #CBD5E1)'
                      }}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-900 px-2 py-0.5 rounded border border-teal-300">
                            {wo.woId || '-'}
                          </span>
                          {wo.date && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300">
                              W{String(getISOWeek(wo.date)).padStart(2, '0')}
                            </span>
                          )}
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          st === 'closed'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : st.includes('progress')
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-rose-100 text-rose-900 border-rose-300'
                        }`}>
                          {wo.status || 'Open'}
                        </span>
                      </div>

                      {/* Equipment & Description */}
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 
                            className="font-bold text-xs line-clamp-1"
                            style={{ color: 'var(--text-main, #0f172a)' }}
                          >
                            {wo.equipmentName || '-'}
                          </h4>
                          <span 
                            className="text-[10px] font-mono font-bold"
                            style={{ color: 'var(--text-muted, #475569)' }}
                          >
                            ({wo.equipmentCode || '-'})
                          </span>
                        </div>
                        {wo.issueDescription && (
                          <p 
                            className="text-[11px] mt-1 line-clamp-2 font-medium"
                            style={{ color: 'var(--text-main, #1e293b)' }}
                          >
                            {wo.issueDescription}
                          </p>
                        )}
                      </div>

                      {/* Meta Footer */}
                      <div 
                        className="pt-2 border-t flex items-center justify-between gap-2"
                        style={{ borderColor: 'var(--border-main, #E2E8F0)' }}
                      >
                        <div 
                          className="flex items-center gap-2 text-[10px] font-semibold"
                          style={{ color: 'var(--text-muted, #475569)' }}
                        >
                          {dtVal > 0 && (
                            <span className="font-black text-rose-900 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                              ⏱️ {dtVal} Jam
                            </span>
                          )}
                          <span>
                            PIC: <strong className="font-bold" style={{ color: 'var(--text-main, #0f172a)' }}>{wo.technicianPic || '-'}</strong>
                          </span>
                        </div>

                        <button
                          onClick={() => setSelectedWO(wo)}
                          className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Detail</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 2. DESKTOP TABLE VIEW (>= md screens) */}
            <div 
              className="hidden md:block overflow-x-auto rounded-xl border shadow-2xs"
              style={{ borderColor: 'var(--border-main, #CBD5E1)' }}
            >
              <table className="w-full text-left text-xs">
                <thead 
                  className="font-bold border-b text-[11px]"
                  style={{ 
                    backgroundColor: 'var(--input-bg, #F8FAFC)',
                    color: 'var(--text-main, #0f172a)',
                    borderColor: 'var(--border-main, #CBD5E1)'
                  }}
                >
                  <tr>
                    <th className="py-3 px-3.5 whitespace-nowrap">No. WO</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Tanggal & Shift</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Nama Alat & Kode</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Kategori</th>
                    <th className="py-3 px-3.5">Deskripsi Kerusakan</th>
                    <th className="py-3 px-3.5">Tindakan Perbaikan</th>
                    <th className="py-3 px-3.5 text-center whitespace-nowrap">Downtime</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Sparepart</th>
                    <th className="py-3 px-3.5 whitespace-nowrap">Teknisi</th>
                    <th className="py-3 px-3.5 text-center whitespace-nowrap">Status</th>
                    <th className="py-3 px-3.5 text-center whitespace-nowrap">Aksi</th>
                  </tr>
                </thead>
                <tbody 
                  className="divide-y"
                  style={{ 
                    backgroundColor: 'var(--card-bg, #FFFFFF)',
                    borderColor: 'var(--border-main, #E2E8F0)'
                  }}
                >
                  {paginatedWorkOrders.length === 0 ? (
                    <tr>
                      <td 
                        colSpan={11} 
                        className="py-8 text-center font-medium"
                        style={{ color: 'var(--text-muted, #64748B)' }}
                      >
                        Tidak ada Work Order yang sesuai.
                      </td>
                    </tr>
                  ) : (
                    paginatedWorkOrders.map(wo => {
                      const isInstrument = (wo.category || '').toLowerCase().includes('instrument') && !(wo.category || '').toLowerCase().includes('non');
                      const dtVal = parseFloat(String(wo.downtimeDuration || '0').replace(',', '.')) || 0;
                      const st = (wo.status || 'Open').toLowerCase();
                      
                      return (
                        <tr 
                          key={wo.id || wo.woId}
                          className="hover:bg-slate-100/60 transition-colors"
                        >
                          <td className="py-3 px-3.5 font-mono font-bold text-teal-900 whitespace-nowrap">
                            <span className="bg-teal-100 px-2 py-0.5 rounded border border-teal-300">
                              {wo.woId || '-'}
                            </span>
                          </td>

                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <div 
                              className="flex items-center gap-1 font-bold"
                              style={{ color: 'var(--text-main, #0f172a)' }}
                            >
                              <span>{wo.date ? new Date(wo.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '-'}</span>
                              {wo.date && (
                                <span className="text-[10px] font-mono font-bold px-1 py-0.2 rounded bg-indigo-100 text-indigo-900 border border-indigo-300">
                                  W{String(getISOWeek(wo.date)).padStart(2, '0')}
                                </span>
                              )}
                            </div>
                            <span 
                              className="text-[10px] font-medium"
                              style={{ color: 'var(--text-muted, #64748B)' }}
                            >
                              Shift {wo.shift || '-'}
                            </span>
                          </td>

                          <td className="py-3 px-3.5">
                            <div 
                              className="font-bold line-clamp-1" 
                              title={wo.equipmentName}
                              style={{ color: 'var(--text-main, #0f172a)' }}
                            >
                              {wo.equipmentName || '-'}
                            </div>
                            <span 
                              className="text-[10px] font-mono font-bold"
                              style={{ color: 'var(--text-muted, #64748B)' }}
                            >
                              {wo.equipmentCode || '-'}
                            </span>
                          </td>

                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              isInstrument 
                                ? 'bg-blue-100 text-blue-900 border-blue-300' 
                                : 'bg-teal-100 text-teal-900 border-teal-300'
                            }`}>
                              {isInstrument ? 'Instrument' : 'Non-Instrument'}
                            </span>
                          </td>

                          <td className="py-3 px-3.5 min-w-[140px] max-w-[200px]">
                            <p 
                              className="line-clamp-2 text-[11px] font-medium" 
                              title={wo.issueDescription}
                              style={{ color: 'var(--text-main, #1e293b)' }}
                            >
                              {wo.issueDescription || '-'}
                            </p>
                          </td>

                          <td className="py-3 px-3.5 min-w-[140px] max-w-[200px]">
                            <p 
                              className="line-clamp-2 text-[11px] font-medium" 
                              title={wo.actionTaken}
                              style={{ color: 'var(--text-muted, #475569)' }}
                            >
                              {wo.actionTaken || '-'}
                            </p>
                          </td>

                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            {dtVal > 0 ? (
                              <span className="font-black text-rose-900 font-mono bg-rose-100 px-2 py-0.5 rounded border border-rose-300 text-[11px]">
                                {dtVal} Jam
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted, #94A3B8)' }} className="text-[10px]">-</span>
                            )}
                          </td>

                          <td className="py-3 px-3.5 whitespace-nowrap">
                            {wo.sparepartName ? (
                              <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 text-[10px]">
                                {wo.sparepartName}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted, #94A3B8)' }} className="text-[10px]">-</span>
                            )}
                          </td>

                          <td 
                            className="py-3 px-3.5 whitespace-nowrap font-bold text-[11px]"
                            style={{ color: 'var(--text-main, #0f172a)' }}
                          >
                            {wo.technicianPic || '-'}
                          </td>

                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              st === 'closed'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : st.includes('progress')
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-rose-100 text-rose-900 border-rose-300'
                            }`}>
                              {wo.status || 'Open'}
                            </span>
                          </td>

                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            <button
                              onClick={() => setSelectedWO(wo)}
                              className="p-1 rounded-lg bg-slate-100 hover:bg-teal-700 hover:text-white transition-colors cursor-pointer text-slate-700 border border-slate-300"
                              title="Lihat Detail"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            {totalTablePages > 1 && (
              <div 
                className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t"
                style={{ borderColor: 'var(--border-main, #E2E8F0)' }}
              >
                <div 
                  className="text-[11px] font-medium"
                  style={{ color: 'var(--text-muted, #475569)' }}
                >
                  Halaman <strong style={{ color: 'var(--text-main, #0f172a)' }}>{tableCurrentPage}</strong> dari <strong style={{ color: 'var(--text-main, #0f172a)' }}>{totalTablePages}</strong> ({tableFilteredWorkOrders.length} Total WO)
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTableCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={tableCurrentPage <= 1}
                    className="h-7.5 px-2 rounded-lg border bg-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center gap-1 transition-colors"
                    style={{
                      backgroundColor: 'var(--card-bg, #FFFFFF)',
                      color: 'var(--text-main, #0f172a)',
                      borderColor: 'var(--border-main, #CBD5E1)'
                    }}
                  >
                    <ChevronLeft className="w-3 h-3" />
                    <span className="hidden sm:inline">Sebelumnya</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalTablePages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalTablePages || (p >= tableCurrentPage - 1 && p <= tableCurrentPage + 1))
                      .map((pageNum, idx, arr) => {
                        const showEllipsisBefore = idx > 0 && pageNum - arr[idx - 1] > 1;
                        return (
                          <React.Fragment key={pageNum}>
                            {showEllipsisBefore && <span className="px-1 text-slate-400 text-xs">...</span>}
                            <button
                              onClick={() => setTableCurrentPage(pageNum)}
                              className={`h-7.5 w-7.5 rounded-lg text-xs font-bold transition-all ${
                                tableCurrentPage === pageNum
                                  ? 'bg-teal-700 text-white shadow-xs'
                                  : 'border hover:bg-slate-100'
                              }`}
                              style={tableCurrentPage === pageNum ? {} : {
                                backgroundColor: 'var(--card-bg, #FFFFFF)',
                                color: 'var(--text-main, #0f172a)',
                                borderColor: 'var(--border-main, #CBD5E1)'
                              }}
                            >
                              {pageNum}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setTableCurrentPage(prev => Math.min(totalTablePages, prev + 1))}
                    disabled={tableCurrentPage >= totalTablePages}
                    className="h-7.5 px-2 rounded-lg border bg-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 flex items-center gap-1 transition-colors"
                    style={{
                      backgroundColor: 'var(--card-bg, #FFFFFF)',
                      color: 'var(--text-main, #0f172a)',
                      borderColor: 'var(--border-main, #CBD5E1)'
                    }}
                  >
                    <span className="hidden sm:inline">Berikutnya</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        );
      })()}

      {/* DETAIL WORK ORDER POPUP MODAL */}
      {selectedWO && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-850 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
                    <Wrench className="w-5 h-5" />
                  </span>
                  <h3 className="text-lg font-bold">
                    Detail Work Order: {selectedWO.woId}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Dilaporkan oleh: <strong>{selectedWO.requestorName || '-'}</strong> ({selectedWO.requestorNik || '-'})
                </p>
              </div>
              <button
                onClick={() => setSelectedWO(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5 opacity-70" />
              </button>
            </div>

            {/* Modal Content Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              
              <div className="space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Nama Alat</span>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedWO.equipmentName || '-'}</p>
                <p className="font-mono text-[11px] text-slate-500">Kode: {selectedWO.equipmentCode || '-'}</p>
              </div>

              <div className="space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Kategori & Lokasi</span>
                <p className="font-bold text-slate-900 dark:text-white">{selectedWO.category || '-'}</p>
                <p className="text-slate-500">{selectedWO.location || '-'}</p>
              </div>

              <div className="space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Durasi Downtime</span>
                <p className="font-black text-rose-600 text-sm">{selectedWO.downtimeDuration || '0'} Jam</p>
                <p className="text-slate-500">
                  {selectedWO.repairStart ? new Date(selectedWO.repairStart).toLocaleString('id-ID') : '-'} s/d {selectedWO.repairEnd ? new Date(selectedWO.repairEnd).toLocaleString('id-ID') : '-'}
                </p>
              </div>

              <div className="space-y-1 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Sparepart & PIC Teknisi</span>
                <p className="font-bold text-amber-600">{selectedWO.sparepartName ? `${selectedWO.sparepartName} (Qty: ${selectedWO.sparepartQty || '1'})` : 'Tidak ada sparepart'}</p>
                <p className="text-slate-500">Teknisi: {selectedWO.technicianPic || '-'}</p>
              </div>

            </div>

            {/* Issue Description & Action Taken */}
            <div className="space-y-3">
              <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/50 dark:bg-rose-950/20 text-xs">
                <span className="font-bold text-rose-700 dark:text-rose-300 block mb-1">
                  Deskripsi Kerusakan / Issue:
                </span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedWO.issueDescription || '-'}
                </p>
              </div>

              <div className="p-3 rounded-xl border border-emerald-100 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs">
                <span className="font-bold text-emerald-700 dark:text-emerald-300 block mb-1">
                  Tindakan Perbaikan (Action Taken):
                </span>
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedWO.actionTaken || 'Belum ada catatan tindakan perbaikan.'}
                </p>
              </div>
            </div>

            {/* Photos & Document Link */}
            <div className="space-y-2">
              <span className="text-xs font-bold block">Bukti Foto & Dokumen</span>
              <div className="flex flex-wrap items-center gap-3">
                {selectedWO.photoUrl && (
                  <a 
                    href={selectedWO.photoUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-teal-600 hover:underline border"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Foto Kerusakan Awal
                  </a>
                )}
                {selectedWO.closingPhoto && (
                  <a 
                    href={selectedWO.closingPhoto} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-emerald-600 hover:underline border"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Foto Selesai Perbaikan
                  </a>
                )}
                {selectedWO.pdfUrl && (
                  <a 
                    href={selectedWO.pdfUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-blue-600 hover:underline border"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Dokumen PDF Resmi
                  </a>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="secondary"
                onClick={() => setSelectedWO(null)}
                className="!w-auto text-xs px-5 cursor-pointer"
              >
                Tutup
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
