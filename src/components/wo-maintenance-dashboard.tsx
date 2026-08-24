import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wrench, Activity, Clock, Package, Filter, Download, 
  Search, RefreshCw, CheckCircle2, AlertTriangle, ArrowUpRight, 
  ChevronLeft, Eye, Layers, Sparkles, SlidersHorizontal, 
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
  const [selectedPt, setSelectedPt] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'Instrument (L)' | 'Non-Instrument (PL)'>('ALL');
  const [selectedEquipmentCode, setSelectedEquipmentCode] = useState<string>('ALL');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal Detail WO Preview
  const [selectedWO, setSelectedWO] = useState<any | null>(null);

  // Helper to compute maintenance summary on client-side from raw work orders
  const computeClientSummary = (allWOs: any[], ptFilter: string, period: string, startCustom?: string, endCustom?: string) => {
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

    // Filter by PT
    let filtered = [...allWOs];
    if (ptFilter && ptFilter !== 'ALL') {
      filtered = filtered.filter(wo => (wo.pt || 'TBP').toUpperCase() === ptFilter.toUpperCase());
    }

    // Filter by period
    if (period === 'this_month') {
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

  // Fetch summary data with dual-fallback strategy
  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      let summaryResult: any = null;

      // 1. Try dedicated endpoint first
      try {
        const params = new URLSearchParams();
        params.append('pt', selectedPt);

        if (filterPeriod === 'this_month') {
          const now = new Date();
          const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          params.append('startDate', start);
        } else if (filterPeriod === 'last_30_days') {
          const past = new Date();
          past.setDate(past.getDate() - 30);
          params.append('startDate', past.toISOString());
        } else if (filterPeriod === 'this_year') {
          const start = new Date(new Date().getFullYear(), 0, 1).toISOString();
          params.append('startDate', start);
        } else if (filterPeriod === 'custom' && customStartDate && customEndDate) {
          params.append('startDate', new Date(customStartDate).toISOString());
          params.append('endDate', new Date(customEndDate).toISOString());
        }

        const res = await fetch(`/api/work-orders/maintenance-summary?${params.toString()}`, {
          headers: { 'Accept': 'application/json' }
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const json = await res.json();
          if (json.status === 'success') {
            summaryResult = json;
          }
        }
      } catch (err) {
        console.warn('Dedicated endpoint unavailable, using direct WO fallback calculation:', err);
      }

      // 2. Resilient fallback to raw /api/work-orders if dedicated endpoint returned HTML or failed
      if (!summaryResult) {
        const resRaw = await fetch('/api/work-orders', {
          headers: { 'Accept': 'application/json' }
        });
        const contentType = resRaw.headers.get('content-type') || '';
        if (resRaw.ok && contentType.includes('application/json')) {
          const rawJson = await resRaw.json();
          const allWOs = Array.isArray(rawJson) ? rawJson : [];
          summaryResult = computeClientSummary(allWOs, selectedPt, filterPeriod, customStartDate, customEndDate);
        } else {
          throw new Error('Gagal memuat data work orders dari server');
        }
      }

      setData(summaryResult);
    } catch (e: any) {
      console.error('Error fetching maintenance summary:', e);
      toast.error('Gagal mengambil data rekapitulasi maintenance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaintenanceData();
  }, [selectedPt, filterPeriod, customStartDate, customEndDate]);

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
    <div className="space-y-6 pb-20 animate-in fade-in duration-300 max-w-7xl mx-auto px-3 sm:px-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 p-5 rounded-2xl text-white shadow-md border border-slate-700/60">
        <div className="flex items-center gap-3.5">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all text-white active:scale-95 cursor-pointer"
              title="Kembali ke Menu Utama"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-500/20 border border-teal-400/30 text-teal-300">
                <Wrench className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-display font-bold tracking-tight">
                Dashboard WO Maintenance & Downtime
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Rekapitulasi breakdown alat, konsumsi sparepart, dan analisis durasi perbaikan Work Order.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Button
            onClick={fetchMaintenanceData}
            variant="secondary"
            className="!w-auto h-9 text-xs flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border-white/10 text-white cursor-pointer"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>

          <Button
            onClick={handleExportExcel}
            className="!w-auto h-9 text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <Card className="p-4 sm:p-5 border shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Filter & Parameter Rekapitulasi
            </span>
          </div>

          {/* PT Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            {[
              { key: 'ALL', label: 'Semua Site' },
              { key: 'TBP', label: 'PT TBP (70 WO)' },
              { key: 'GPS', label: 'PT GPS (9 WO)' }
            ].map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  setSelectedPt(p.key);
                  setSelectedEquipmentCode('ALL');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedPt === p.key
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {(selectedPt !== 'ALL' || selectedCategory !== 'ALL' || selectedEquipmentCode !== 'ALL' || filterPeriod !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedPt('ALL');
                setSelectedCategory('ALL');
                setSelectedEquipmentCode('ALL');
                setFilterPeriod('all');
                setSearchQuery('');
              }}
              className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer ml-auto"
            >
              Reset Semua Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* 1. Category Filter */}
          <div>
            <label className="text-[11px] font-bold block mb-1.5 text-slate-700 dark:text-slate-300">
              Kategori Alat (Klasifikasi)
            </label>
            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
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
                    setSelectedEquipmentCode('ALL'); // Reset specific equipment when category changes
                  }}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all truncate cursor-pointer ${
                    selectedCategory === cat.key
                      ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Specific Equipment Selector */}
          <div>
            <label className="text-[11px] font-bold block mb-1.5 text-slate-700 dark:text-slate-300">
              Pilih Alat yang Rusak (Detail Filter)
            </label>
            <select
              value={selectedEquipmentCode}
              onChange={e => setSelectedEquipmentCode(e.target.value)}
              className="w-full h-9.5 text-xs font-semibold px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="ALL">🌟 Semua Alat Terhitung ({availableEquipments.length} Alat)</option>
              {availableEquipments.map((eq: any) => {
                const key = `${eq.equipmentCode}___${eq.equipmentName}`;
                return (
                  <option key={key} value={key}>
                    {eq.equipmentName} ({eq.totalDowntime} Jam • {eq.woCount} WO)
                  </option>
                );
              })}
            </select>
          </div>

          {/* 3. Time Period Filter */}
          <div>
            <label className="text-[11px] font-bold block mb-1.5 text-slate-700 dark:text-slate-300">
              Rentang Waktu
            </label>
            <select
              value={filterPeriod}
              onChange={e => setFilterPeriod(e.target.value)}
              className="w-full h-9.5 text-xs font-semibold px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-teal-500/20"
            >
              <option value="all">📅 Semua Waktu</option>
              <option value="this_month">📅 Bulan Ini (Mulai Tgl 1)</option>
              <option value="last_30_days">📅 30 Hari Terakhir</option>
              <option value="this_year">📅 Tahun Berjalan (YTD)</option>
              <option value="custom">📅 Kustom Tanggal</option>
            </select>
          </div>

          {/* 4. Search Filter */}
          <div>
            <label className="text-[11px] font-bold block mb-1.5 text-slate-700 dark:text-slate-300">
              Pencarian Cepat
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
              <input
                type="text"
                placeholder="Cari WO, PIC, sparepart..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-9.5 text-xs pl-8 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none font-medium"
              />
            </div>
          </div>
        </div>

        {/* Custom Date Inputs if custom period picked */}
        {filterPeriod === 'custom' && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">Dari:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={e => setCustomStartDate(e.target.value)}
                className="text-xs px-2.5 py-1 rounded-lg border bg-white dark:bg-slate-800"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">Sampai:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={e => setCustomEndDate(e.target.value)}
                className="text-xs px-2.5 py-1 rounded-lg border bg-white dark:bg-slate-800"
              />
            </div>
          </div>
        )}
      </Card>

      {/* ACTIVE EQUIPMENT FILTER BANNER (If specific tool is chosen) */}
      {activeSelectedTool && (
        <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-teal-950 dark:text-teal-100">
                  {activeSelectedTool.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-teal-200/60 dark:bg-teal-800/60 text-teal-800 dark:text-teal-200">
                  Kode: {activeSelectedTool.code || '-'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700">
                  {activeSelectedTool.category}
                </span>
              </div>
              <p className="text-xs text-teal-800/80 dark:text-teal-300 mt-0.5">
                Total Downtime: <strong className="font-bold">{activeSelectedTool.downtime} Jam</strong> • {activeSelectedTool.woCount} Work Order • MTTR: {activeSelectedTool.mttr} Jam/kasus
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedEquipmentCode('ALL')}
            className="text-xs font-bold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 self-start sm:self-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Tampilkan Semua Alat
          </button>
        </div>
      )}

      {/* INFORMATIVE NOTICE IF ALL WORK ORDERS IN SELECTION ARE CURRENTLY OPEN */}
      {computedMetrics.openCount > 0 && computedMetrics.closedCount === 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-center gap-3 text-amber-900 dark:text-amber-200 text-xs shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <div>
            <p className="font-bold">Informasi Work Order ({selectedPt === 'GPS' ? 'Site PT GPS' : selectedPt === 'ALL' ? 'Semua Site' : `Site ${selectedPt}`}):</p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              Terdapat {computedMetrics.openCount} Work Order berstatus <strong>Open (Baru Dibuat / Menunggu Penanganan Teknisi)</strong>. Durasi downtime dan data pemakaian sparepart akan otomatis terisi & terakumulasi saat teknisi menyelesaikan dan menutup (Close) Work Order. Untuk melihat data perbaikan selesai dan grafik jam downtime historis, pilih tab <strong>PT TBP (70 WO)</strong> atau <strong>Semua Site</strong> di atas.
            </p>
          </div>
        </div>
      )}

      {/* EXECUTIVE KPI SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Card 1: Total Jam Downtime */}
        <Card className="p-4 sm:p-5 border shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-850 dark:to-slate-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Jam Downtime
            </span>
            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-display font-black text-rose-600 dark:text-rose-400">
              {computedMetrics.totalDowntime}
            </span>
            <span className="text-xs font-bold text-slate-500">Jam</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
            <span>Dari {computedMetrics.totalWOs} kasus kerusakan tercatat</span>
          </p>
        </Card>

        {/* Card 2: Total Work Orders */}
        <Card className="p-4 sm:p-5 border shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-850 dark:to-slate-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Work Order
            </span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white">
              {computedMetrics.totalWOs}
            </span>
            <span className="text-xs font-bold text-slate-500">WO</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold">
            <span className="text-emerald-600 flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" /> {computedMetrics.closedCount} Closed
            </span>
            {computedMetrics.progressCount > 0 && (
              <span className="text-amber-600 flex items-center gap-0.5">
                <Clock className="w-3 h-3" /> {computedMetrics.progressCount} Progress
              </span>
            )}
            {computedMetrics.openCount > 0 && (
              <span className="text-rose-600 flex items-center gap-0.5">
                <AlertTriangle className="w-3 h-3" /> {computedMetrics.openCount} Open
              </span>
            )}
          </div>
        </Card>

        {/* Card 3: MTTR (Mean Time to Repair) */}
        <Card className="p-4 sm:p-5 border shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-850 dark:to-slate-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              MTTR (Rata-rata Perbaikan)
            </span>
            <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-display font-black text-teal-600 dark:text-teal-400">
              {computedMetrics.mttr}
            </span>
            <span className="text-xs font-bold text-slate-500">Jam / Kasus</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Mean Time To Repair durasi teknisi
          </p>
        </Card>

        {/* Card 4: Total Sparepart Diganti */}
        <Card className="p-4 sm:p-5 border shadow-xs relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-850 dark:to-slate-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Sparepart Diganti
            </span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Package className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-display font-black text-amber-600 dark:text-amber-400">
              {computedMetrics.totalSparepartQty}
            </span>
            <span className="text-xs font-bold text-slate-500">Unit / Pcs</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Dari {computedMetrics.sortedSpareparts.length} jenis komponen sparepart
          </p>
        </Card>

      </div>

      {/* VISUAL CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Chart 1: Bar Chart Top 10 Equipment by Downtime */}
        <Card className="lg:col-span-2 p-5 border shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-sm flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-teal-600" />
                Rekapitulasi Downtime per Alat (Top Breakdown)
              </h3>
              <p className="text-xs text-slate-500">
                Alat dengan akumulasi downtime perbaikan tertinggi (Jam).
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600">
              {computedMetrics.sortedTools.length} Alat Aktif
            </span>
          </div>

          <div className="h-64 sm:h-72">
            {computedMetrics.sortedTools.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
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
        <Card className="p-5 border shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              Proporsi Downtime Kategori
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Instrument (Lab) vs Non-Instrument (Prep).
            </p>

            <div className="h-44 flex items-center justify-center">
              {computedMetrics.totalDowntime === 0 ? (
                <div className="text-xs text-slate-400">Belum ada data</div>
              ) : (
                <Doughnut
                  data={categoryDoughnutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'bottom' }
                    }
                  }}
                />
              )}
            </div>
          </div>

          {/* Quick Category Stats */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-center">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 block">Instrument</span>
              <span className="text-sm font-black text-blue-800 dark:text-blue-200">
                {data.categorySummary?.['Instrument (L)']?.totalDowntime || 0} Jam
              </span>
            </div>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30">
              <span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 block">Non-Instrument</span>
              <span className="text-sm font-black text-teal-800 dark:text-teal-200">
                {data.categorySummary?.['Non-Instrument (PL)']?.totalDowntime || 0} Jam
              </span>
            </div>
          </div>
        </Card>

      </div>

      {/* REKAPITULASI PENGGUNAAN SPAREPART ROW */}
      <Card className="p-5 border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-500" />
              Rekapitulasi Penggunaan Sparepart untuk Perbaikan WO
            </h3>
            <p className="text-xs text-slate-500">
              Daftar komponen dan suku cadang yang digunakan dalam pemulihan unit breakdown.
            </p>
          </div>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-900/40">
            Total {computedMetrics.sortedSpareparts.length} Komponen Terpakai
          </span>
        </div>

        {computedMetrics.sortedSpareparts.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed">
            Tidak ada penggunaan sparepart tercatat pada filter ini.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {computedMetrics.sortedSpareparts.slice(0, 9).map((sp, idx) => (
              <div 
                key={sp.name}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex flex-col justify-between gap-2 shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold text-xs truncate" title={sp.name}>
                      {sp.name}
                    </h4>
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                      {sp.qty} Qty
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-1" title={sp.tools.join(', ')}>
                    Digunakan pada: <strong>{sp.tools.join(', ')}</strong>
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Frekuensi: {sp.count} kali perbaikan</span>
                  <span className="font-semibold text-teal-600">Terpasang</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* DRILLDOWN TABLE: RINCIAN DETAIL WORK ORDER */}
      <Card className="p-5 border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              {activeSelectedTool 
                ? `Rincian Work Order: ${activeSelectedTool.name} (${filteredWorkOrders.length} Kasus Terhitung)`
                : `Rincian Seluruh Work Order Kerusakan (${filteredWorkOrders.length} Kasus Terhitung)`
              }
            </h3>
            <p className="text-xs text-slate-500">
              Tabel detail seluruh data Work Order yang masuk ke dalam perhitungan downtime dan sparepart di atas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">
              Menampilkan {filteredWorkOrders.length} baris
            </span>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="py-3 px-3">No. WO</th>
                <th className="py-3 px-3">Tanggal & Shift</th>
                <th className="py-3 px-3">Nama Alat & Kode</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Deskripsi Kerusakan</th>
                <th className="py-3 px-3">Tindakan Perbaikan</th>
                <th className="py-3 px-3 text-center">Downtime</th>
                <th className="py-3 px-3">Sparepart Diganti</th>
                <th className="py-3 px-3">PIC Teknisi</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredWorkOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    Tidak ada Work Order yang sesuai dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredWorkOrders.map(wo => {
                  const isInstrument = (wo.category || '').toLowerCase().includes('instrument') && !(wo.category || '').toLowerCase().includes('non');
                  const dtVal = parseFloat(String(wo.downtimeDuration || '0').replace(',', '.')) || 0;
                  
                  return (
                    <tr 
                      key={wo.id || wo.woId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* No. WO */}
                      <td className="py-3 px-3 font-mono font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap">
                        {wo.woId || '-'}
                      </td>

                      {/* Tanggal & Shift */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold">
                          {wo.date ? new Date(wo.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Shift: {wo.shift || '-'}
                        </span>
                      </td>

                      {/* Nama Alat & Kode */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1" title={wo.equipmentName}>
                          {wo.equipmentName || '-'}
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {wo.equipmentCode || '-'}
                        </span>
                      </td>

                      {/* Kategori */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isInstrument 
                            ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' 
                            : 'bg-teal-500/10 text-teal-600 border-teal-500/20'
                        }`}>
                          {isInstrument ? 'Instrument' : 'Non-Instrument'}
                        </span>
                      </td>

                      {/* Deskripsi Kerusakan */}
                      <td className="py-3 px-3 min-w-[160px] max-w-[220px]">
                        <p className="line-clamp-2 text-slate-700 dark:text-slate-300" title={wo.issueDescription}>
                          {wo.issueDescription || '-'}
                        </p>
                      </td>

                      {/* Tindakan Perbaikan */}
                      <td className="py-3 px-3 min-w-[160px] max-w-[220px]">
                        <p className="line-clamp-2 text-slate-600 dark:text-slate-400" title={wo.actionTaken}>
                          {wo.actionTaken || '-'}
                        </p>
                      </td>

                      {/* Downtime (Jam) */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-black text-rose-600 dark:text-rose-400 font-mono bg-rose-500/10 px-2 py-0.5 rounded-md">
                          {dtVal} Jam
                        </span>
                      </td>

                      {/* Sparepart Diganti */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {wo.sparepartName ? (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[11px]">
                              {wo.sparepartName} ({wo.sparepartQty || '1'})
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Teknisi PIC */}
                      <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                        {wo.technicianPic || '-'}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          (wo.status || '').toLowerCase() === 'closed'
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                            : (wo.status || '').toLowerCase().includes('progress')
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                        }`}>
                          {wo.status || 'Open'}
                        </span>
                      </td>

                      {/* Aksi / Detail Modal */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedWO(wo)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-teal-500 hover:text-white transition-colors cursor-pointer text-slate-600 dark:text-slate-300 shadow-2xs"
                          title="Lihat Detail Lengkap & Bukti Foto"
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
      </Card>

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
