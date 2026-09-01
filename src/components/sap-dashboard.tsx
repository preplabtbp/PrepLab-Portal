import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button, Input, Textarea } from './ui';
import { 
  ChevronLeft, BarChart2, Activity, ShieldAlert, CheckCircle2, 
  AlertTriangle, TrendingUp, Filter, Map, Search, FileText, 
  Camera, ExternalLink, RefreshCw, Share2, Check, Clock, 
  ArrowUpRight, Sparkles, Layers, Eye, Tag, X, Upload, CheckCircle
} from 'lucide-react';
import { getTickets, closeTicket } from '../sheets-api';
import { format, isThisMonth, isThisYear } from 'date-fns';
import { 
  getISOWeek, 
  getISOWeekYear, 
  isDateInISOWeek, 
  isThisISOWeek, 
  isLastISOWeek, 
  getYearISOWeeksList 
} from '../utils/iso-week';
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
import { toast } from 'sonner';
import { ImageModal } from './image-modal';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface SapDashboardProps {
  onBack?: () => void;
  inspectorNik: string;
}

export function SapDashboard({ onBack, inspectorNik }: SapDashboardProps) {
  const [allTickets, setAllTickets] = useState<any[]>([]);
  const [rekapSummary, setRekapSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('this_week');
  const [statusTab, setStatusTab] = useState<'ALL' | 'OPEN' | 'PROGRESS' | 'CLOSED'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'High' | 'Medium' | 'Low'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Close ticket modal state
  const [closingTicket, setClosingTicket] = useState<any | null>(null);
  const [closingPic, setClosingPic] = useState('');
  const [closingAction, setClosingAction] = useState('');
  const [closingPhotoBase64, setClosingPhotoBase64] = useState('');
  const [submittingClose, setSubmittingClose] = useState(false);

  const isoWeeksList = useMemo(() => getYearISOWeeksList(new Date().getFullYear()), []);
  const currentWeekNumber = getISOWeek(new Date());

  // Determine active target week tag for rekap API query
  const targetWeekTag = useMemo(() => {
    if (filterPeriod === 'this_week') return `W${currentWeekNumber}`;
    if (filterPeriod === 'last_week') return `W${Math.max(1, currentWeekNumber - 1)}`;
    if (filterPeriod.startsWith('iso_')) {
      const parts = filterPeriod.split('_');
      return `W${parts[2]}`;
    }
    return `W${currentWeekNumber}`;
  }, [filterPeriod, currentWeekNumber]);

  useEffect(() => {
    fetchData();
  }, [targetWeekTag]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 1. Fetch real safety inspection tickets
      const ticketsData = await getTickets('ALL');
      if (Array.isArray(ticketsData)) {
        setAllTickets(ticketsData);
      }

      // 2. Fetch real inspection compliance summary for the target week
      try {
        const rekapRes = await fetch(`/api/rekap-inspeksi?week=${targetWeekTag}`);
        if (rekapRes.ok) {
          const rData = await rekapRes.json();
          setRekapSummary(rData.summary);
        }
      } catch (err) {
        console.error("Failed to fetch rekap summary:", err);
      }

    } catch (e) {
      console.error("Error fetching SAP dashboard data:", e);
      toast.error("Gagal memuat data SAP Dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Filter tickets by selected period
  const filteredTicketsByPeriod = useMemo(() => {
    return allTickets.filter(t => {
      if (!t.date) return false;
      let d: Date | null = null;
      try {
        d = new Date(t.date);
      } catch (e) {
        return true;
      }
      if (isNaN(d.getTime())) return true; 

      if (filterPeriod === 'this_week' || filterPeriod === 'this_iso_week') return isThisISOWeek(d);
      if (filterPeriod === 'last_week' || filterPeriod === 'last_iso_week') return isLastISOWeek(d);
      if (filterPeriod.startsWith('iso_')) {
        const parts = filterPeriod.split('_');
        const targetYear = parseInt(parts[1], 10);
        const targetWeek = parseInt(parts[2], 10);
        if (!isNaN(targetYear) && !isNaN(targetWeek)) {
          return isDateInISOWeek(d, targetYear, targetWeek);
        }
      }
      if (filterPeriod === 'this_month') return isThisMonth(d);
      if (filterPeriod === 'ytd' || filterPeriod === 'this_year') return isThisYear(d);
      return true;
    });
  }, [allTickets, filterPeriod]);

  // Metric Computations based on filtered period
  const openFindings = filteredTicketsByPeriod.filter(t => (t.status || '').toUpperCase() === 'OPEN').length;
  const progressFindings = filteredTicketsByPeriod.filter(t => (t.status || '').toUpperCase() === 'PROGRESS').length;
  const closedFindings = filteredTicketsByPeriod.filter(t => (t.status || '').toUpperCase() === 'CLOSED').length;
  const unclosedCount = openFindings + progressFindings;
  const totalFindings = filteredTicketsByPeriod.length;
  const closureRate = totalFindings ? Math.round((closedFindings / totalFindings) * 100) : 0;
  
  const highPriorityCount = filteredTicketsByPeriod.filter(t => 
    (t.priority || '').toUpperCase() === 'HIGH' || 
    (t.risk || '').toLowerCase().includes('tinggi') || 
    (t.risk || '').toLowerCase().includes('fatality')
  ).length;

  // Real Compliance Score Matrix
  const complianceScore = rekapSummary ? rekapSummary.percentage : (totalFindings > 0 ? closureRate : 0);
  const completedPersonsCount = rekapSummary ? rekapSummary.sudah : closedFindings;
  const expectedTotalCount = rekapSummary ? rekapSummary.total : totalFindings;
  const cutiCount = rekapSummary ? (rekapSummary.cutiCount || 0) : 0;

  // Real Heatmap Data (Temuan by Area)
  const heatmapData = useMemo(() => {
    const areaCounts = filteredTicketsByPeriod.reduce((acc: Record<string, number>, curr) => {
      const area = (curr.location && curr.location !== '-') ? curr.location.trim() : (curr.area || 'General / Lainnya');
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {});
    
    return Object.keys(areaCounts).map(area => ({
      area,
      count: areaCounts[area]
    })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [filteredTicketsByPeriod]);

  // Real Category Breakdown
  const categoryData = useMemo(() => {
    const catCounts = filteredTicketsByPeriod.reduce((acc: Record<string, number>, curr) => {
      let cat = (curr.category || 'Inspeksi Umum').trim();
      if (cat.toLowerCase().includes('perkakas')) cat = 'Perkakas Tangan';
      else if (cat.toLowerCase().includes('apd')) cat = 'Kepatuhan APD';
      else if (cat.toLowerCase().includes('housekeeping') || cat.toLowerCase().includes('kebersihan')) cat = 'Housekeeping 5S';
      else if (cat.toLowerCase().includes('p3k')) cat = 'Kotak P3K';
      else if (cat.toLowerCase().includes('apar') || cat.toLowerCase().includes('hydrant')) cat = 'Proteksi Kebakaran';
      else if (cat.toLowerCase().includes('lab')) cat = 'Area Laboratorium';
      else if (cat.toLowerCase().includes('prep')) cat = 'Area Preparasi';
      
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    return Object.keys(catCounts).map(name => ({
      name,
      value: catCounts[name]
    })).sort((a, b) => b.value - a.value);
  }, [filteredTicketsByPeriod]);

  // Real Dynamic Weekly Trend (computed from past 4 weeks)
  const trendData = useMemo(() => {
    const weekLabels: { label: string; weekNum: number; year: number }[] = [];
    const now = new Date();
    const currW = getISOWeek(now);
    const currY = getISOWeekYear(now);

    for (let i = 3; i >= 0; i--) {
      let w = currW - i;
      let y = currY;
      if (w <= 0) {
        w += 52;
        y -= 1;
      }
      weekLabels.push({ label: `W${w}`, weekNum: w, year: y });
    }

    return weekLabels.map(wl => {
      const ticketsInWeek = allTickets.filter(t => {
        if (!t.date) return false;
        try {
          const d = new Date(t.date);
          return isDateInISOWeek(d, wl.year, wl.weekNum);
        } catch (e) {
          return false;
        }
      });

      const temuan = ticketsInWeek.length;
      const ditutup = ticketsInWeek.filter(t => (t.status || '').toUpperCase() === 'CLOSED').length;
      return {
        name: wl.label,
        temuan,
        ditutup
      };
    });
  }, [allTickets]);

  // Interactive Ticket List with Search & Filters
  const visibleTickets = useMemo(() => {
    return filteredTicketsByPeriod.filter(t => {
      // Status Tab filter
      if (statusTab === 'OPEN' && (t.status || '').toUpperCase() !== 'OPEN') return false;
      if (statusTab === 'PROGRESS' && (t.status || '').toUpperCase() !== 'PROGRESS') return false;
      if (statusTab === 'CLOSED' && (t.status || '').toUpperCase() !== 'CLOSED') return false;

      // Priority filter
      if (priorityFilter !== 'ALL') {
        const p = (t.priority || '').toUpperCase();
        const r = (t.risk || '').toLowerCase();
        if (priorityFilter === 'High' && p !== 'HIGH' && !r.includes('tinggi') && !r.includes('fatality')) return false;
        if (priorityFilter === 'Medium' && p !== 'MEDIUM' && !r.includes('sedang')) return false;
        if (priorityFilter === 'Low' && p !== 'LOW' && !r.includes('rendah')) return false;
      }

      // Search Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchId = (t.ticketId || '').toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchLoc = (t.location || '').toLowerCase().includes(q);
        const matchReq = (t.requestorName || '').toLowerCase().includes(q);
        const matchCat = (t.category || '').toLowerCase().includes(q);
        if (!matchId && !matchDesc && !matchLoc && !matchReq && !matchCat) return false;
      }

      return true;
    });
  }, [filteredTicketsByPeriod, statusTab, priorityFilter, searchQuery]);

  // Handle Close Ticket Submission
  const handleSubmitCloseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingTicket) return;
    if (!closingAction.trim()) {
      toast.error('Wajib mengisi Tindakan / Catatan Perbaikan.');
      return;
    }

    try {
      setSubmittingClose(true);
      const loadingToast = toast.loading('Menyimpan penutupan temuan...', { id: 'close-ticket' });

      // Call API to close ticket
      const res = await fetch(`/api/tickets/${closingTicket.ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CLOSED',
          actionTaken: closingAction.trim(),
          pic: closingPic.trim() || inspectorNik || 'Inspector',
          closingPhoto: closingPhotoBase64 || '-',
          completionDate: new Date()
        })
      });

      if (!res.ok) throw new Error('Gagal memperbarui tiket');

      const updated = await res.json();
      toast.success(`Tiket ${closingTicket.ticketId} berhasil ditutup! 🎉`, { id: 'close-ticket' });

      // Update local state
      setAllTickets(prev => prev.map(t => t.ticketId === closingTicket.ticketId ? { ...t, ...updated, status: 'CLOSED' } : t));
      setClosingTicket(null);
      setClosingAction('');
      setClosingPic('');
      setClosingPhotoBase64('');
    } catch (err: any) {
      console.error(err);
      toast.error(`Gagal menutup tiket: ${err.message}`, { id: 'close-ticket' });
    } finally {
      setSubmittingClose(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 5MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setClosingPhotoBase64(reader.result as string);
      toast.success('Foto bukti perbaikan berhasil dimuat');
    };
    reader.readAsDataURL(file);
  };

  const PIE_COLORS: Record<string, string> = { 
    Open: '#ef4444', 
    Progress: '#f59e0b', 
    Closed: '#10b981' 
  };
  const DOUGHNUT_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

  const statusPieData = [
    { name: 'Open', value: openFindings },
    { name: 'Progress', value: progressFindings },
    { name: 'Closed', value: closedFindings },
  ].filter(d => d.value > 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen pb-24">
      {/* Top Navigation Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3.5 sticky top-0 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack} 
                className="p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                title="Kembali"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-teal-600/30">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base md:text-lg text-slate-900 leading-tight">SAP Dashboard</h1>
                <span className="bg-teal-100 text-teal-800 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-teal-200">
                  Live K3
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Safety Accountability Program & Rekap Temuan Terbuka</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="secondary"
              onClick={handleRefresh}
              className="h-8.5 px-3 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl border border-slate-200 flex items-center gap-1.5"
              title="Perbarui data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>

            <select 
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 font-semibold shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <optgroup label="⚡ Filter Cepat">
                <option value="this_week">⚡ Minggu Ini (W{String(currentWeekNumber).padStart(2, '0')}) [Aktif]</option>
                <option value="last_week">⏮️ Minggu Lalu (W{String(Math.max(1, currentWeekNumber - 1)).padStart(2, '0')})</option>
                <option value="this_month">🗓️ Bulan Ini</option>
                <option value="ytd">📆 Tahun Ini (YTD)</option>
                <option value="all">📅 Semua Waktu</option>
              </optgroup>
              <optgroup label="📋 Pilih Minggu ISO">
                {isoWeeksList.map(iw => (
                  <option key={iw.value} value={iw.value}>
                    {iw.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* 1. Hero Card: Compliance Score Matrix */}
        <Card className="p-5 md:p-6 bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 border-none shadow-lg relative overflow-hidden text-white rounded-3xl">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <Activity className="w-36 h-36" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="bg-teal-500/30 text-teal-200 text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full backdrop-blur-md border border-teal-400/30">
                  {targetWeekTag} Compliance Status
                </span>
                {cutiCount > 0 && (
                  <span className="bg-amber-500/20 text-amber-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border border-amber-400/30">
                    {cutiCount} Cuti/Off
                  </span>
                )}
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold flex items-baseline gap-2 text-white">
                {complianceScore}%
                <span className="text-sm sm:text-base font-normal text-teal-200">Tingkat Kepatuhan Inspeksi</span>
              </h2>
              <p className="text-xs sm:text-sm text-teal-100/90 leading-relaxed">
                Persentase inspeksi terencana yang telah terselesaikan oleh personil pengawas dan tim K3 Prep & Lab.
              </p>
            </div>

            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/20 flex flex-col items-center md:items-end justify-center min-w-[200px] text-center md:text-right shadow-inner">
              <span className="text-xs text-teal-200 font-semibold uppercase tracking-wider mb-0.5">Status Penyelesaian</span>
              <p className="text-lg sm:text-xl font-bold text-white">
                {completedPersonsCount} <span className="text-xs font-normal text-teal-200">dari</span> {expectedTotalCount} Personil/Area
              </p>
              <div className="w-full bg-white/20 h-2 rounded-full mt-2 overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, Math.max(0, complianceScore))}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* 2. Top Metric KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            onClick={() => setStatusTab('ALL')}
            className={`p-4.5 bg-white border cursor-pointer hover:border-slate-400 hover:shadow-md transition-all relative overflow-hidden rounded-2xl ${
              statusTab === 'ALL' ? 'ring-2 ring-slate-900 border-transparent shadow-sm' : 'border-slate-200'
            }`}
          >
            <div className="absolute top-2 right-2 p-2 opacity-10">
              <ShieldAlert className="w-10 h-10 text-slate-700" />
            </div>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-1">Total Temuan</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">{totalFindings}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-slate-600 font-medium">Semua temuan di periode</span>
            </div>
          </Card>

          <Card 
            onClick={() => setStatusTab('OPEN')}
            className={`p-4.5 bg-white border cursor-pointer hover:border-rose-300 hover:shadow-md transition-all relative overflow-hidden rounded-2xl ${
              statusTab === 'OPEN' ? 'ring-2 ring-rose-500 border-transparent shadow-sm bg-rose-50/20' : 'border-slate-200'
            }`}
          >
            <div className="absolute top-2 right-2 p-2 opacity-10">
              <AlertTriangle className="w-10 h-10 text-rose-600" />
            </div>
            <p className="text-xs text-rose-600 font-bold uppercase tracking-wider mb-1">Belum Ditutup (Open)</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-rose-600">{openFindings}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Perlu Tindak Lanjut 🚨
              </span>
            </div>
          </Card>

          <Card 
            onClick={() => setStatusTab('PROGRESS')}
            className={`p-4.5 bg-white border cursor-pointer hover:border-amber-300 hover:shadow-md transition-all relative overflow-hidden rounded-2xl ${
              statusTab === 'PROGRESS' ? 'ring-2 ring-amber-500 border-transparent shadow-sm bg-amber-50/20' : 'border-slate-200'
            }`}
          >
            <div className="absolute top-2 right-2 p-2 opacity-10">
              <Clock className="w-10 h-10 text-amber-600" />
            </div>
            <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mb-1">Dalam Proses</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-amber-600">{progressFindings}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-amber-700 font-medium">Sedang ditindaklanjuti PIC</span>
            </div>
          </Card>

          <Card 
            onClick={() => setStatusTab('CLOSED')}
            className={`p-4.5 bg-white border cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all relative overflow-hidden rounded-2xl ${
              statusTab === 'CLOSED' ? 'ring-2 ring-emerald-500 border-transparent shadow-sm bg-emerald-50/20' : 'border-slate-200'
            }`}
          >
            <div className="absolute top-2 right-2 p-2 opacity-10">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-1">Temuan Ditutup</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-emerald-600">{closedFindings}</h3>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {closureRate}% Closure Rate
              </span>
            </div>
          </Card>
        </div>

        {/* 3. Heatmap & Visualizations Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Heatmap Temuan per Area */}
          <Card className="p-5 bg-white border border-slate-200 shadow-xs rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Map className="w-4 h-4 text-rose-500" />
                  Heatmap Temuan Berulang (Area)
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">{heatmapData.length} Area Teridentifikasi</span>
              </div>

              <div className="space-y-3.5">
                {heatmapData.length > 0 ? heatmapData.map((item, i) => {
                  const maxCount = heatmapData[0].count;
                  const percentage = maxCount > 0 ? Math.round((item.count / maxCount) * 100) : 0;
                  return (
                    <div 
                      key={item.area} 
                      onClick={() => setSearchQuery(item.area)}
                      className="flex flex-col gap-1 p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                      title="Klik untuk filter temuan di area ini"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-800 truncate mr-2 flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-rose-500' : i === 1 ? 'bg-orange-500' : 'bg-amber-400'}`} />
                          {item.area}
                        </span>
                        <span className="text-slate-600 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                          {item.count} temuan
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            i === 0 ? 'bg-rose-500' : i === 1 ? 'bg-orange-500' : 'bg-amber-400'
                          }`} 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-8 text-slate-400 text-xs">Belum ada temuan di area ini 🎉</div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
              <span>*Urutan berdasarkan frekuensi temuan</span>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="text-teal-600 font-bold hover:underline"
                >
                  Reset Filter Area
                </button>
              )}
            </div>
          </Card>

          {/* Bar Chart: Tren Temuan vs Penutupan Mingguan */}
          <Card className="p-5 bg-white border border-slate-200 shadow-xs rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Tren Temuan vs Penutupan (4 Minggu)
              </h3>
            </div>
            
            <div className="h-60">
              <Bar 
                data={{
                  labels: trendData.map(d => d.name),
                  datasets: [
                    {
                      label: 'Temuan Baru',
                      data: trendData.map(d => d.temuan),
                      backgroundColor: '#ef4444',
                      borderRadius: 6,
                      barPercentage: 0.6,
                    },
                    {
                      label: 'Ditutup (Closed)',
                      data: trendData.map(d => d.ditutup),
                      backgroundColor: '#10b981',
                      borderRadius: 6,
                      barPercentage: 0.6,
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { color: '#64748b', font: { size: 11, weight: 'bold' } },
                      border: { display: false }
                    },
                    y: {
                      grid: { color: '#f1f5f9' },
                      ticks: { color: '#64748b', font: { size: 11 }, precision: 0 },
                      border: { display: false }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { usePointStyle: true, boxWidth: 8, font: { size: 11, weight: 'bold' } }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      titleColor: '#fff',
                      bodyColor: '#e2e8f0',
                      padding: 10,
                      cornerRadius: 8,
                      usePointStyle: true
                    }
                  }
                }}
              />
            </div>
          </Card>

          {/* Doughnut Chart: Distribusi Status & Kategori */}
          <Card className="p-5 bg-white border border-slate-200 shadow-xs rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Filter className="w-4 h-4 text-purple-500" />
                  Status & Kategori Temuan
                </h3>
              </div>

              <div className="h-52 flex items-center justify-center relative my-2">
                {statusPieData.length > 0 ? (
                  <Doughnut 
                    data={{
                      labels: statusPieData.map(d => d.name),
                      datasets: [{
                        data: statusPieData.map(d => d.value),
                        backgroundColor: statusPieData.map((d) => PIE_COLORS[d.name] || '#64748b'),
                        borderWidth: 0,
                        hoverOffset: 4
                      }]
                    }}
                    options={{
                      cutout: '75%',
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { usePointStyle: true, boxWidth: 8, font: { size: 11, weight: 'bold' } }
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="text-center text-slate-400 text-xs">Tidak ada data temuan</div>
                )}
                {statusPieData.length > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                    <span className="text-2xl font-extrabold text-slate-900">{totalFindings}</span>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Category Badges */}
            <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
              {categoryData.slice(0, 4).map(c => (
                <button
                  key={c.name}
                  onClick={() => setSearchQuery(c.name)}
                  className="text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md transition-colors"
                >
                  {c.name} ({c.value})
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* 4. Action Items & Safety Findings Table / Cards */}
        <Card className="p-0 bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          {/* Header & Filter Controls */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                  Daftar Temuan Inspeksi & Action Items
                </h3>
                <p className="text-xs text-slate-500">
                  Daftar seluruh tiket ketidaksesuaian hasil inspeksi K3 yang memerlukan penanganan dan penutupan.
                </p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold bg-teal-100 text-teal-800 px-3 py-1 rounded-full border border-teal-200">
                  {visibleTickets.length} Ditampilkan
                </span>
              </div>
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
              {/* Status Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setStatusTab('ALL')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    statusTab === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({totalFindings})
                </button>
                <button
                  onClick={() => setStatusTab('OPEN')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    statusTab === 'OPEN' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-600 hover:bg-rose-50'
                  }`}
                >
                  <span>🚨 Open ({openFindings})</span>
                </button>
                <button
                  onClick={() => setStatusTab('PROGRESS')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    statusTab === 'PROGRESS' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  <span>In Progress ({progressFindings})</span>
                </button>
                <button
                  onClick={() => setStatusTab('CLOSED')}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    statusTab === 'CLOSED' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <span>✅ Closed ({closedFindings})</span>
                </button>
              </div>

              {/* Search & Priority Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari ID, Area, Deskripsi..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs text-slate-800 placeholder:text-slate-400"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={priorityFilter}
                  onChange={(e: any) => setPriorityFilter(e.target.value)}
                  className="text-xs border border-slate-200 rounded-xl px-2.5 py-1.5 bg-white text-slate-700 font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="ALL">Semua Prioritas</option>
                  <option value="High">🔴 High Priority</option>
                  <option value="Medium">🟡 Medium Priority</option>
                  <option value="Low">🟢 Low Priority</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ticket Items List */}
          <div className="divide-y divide-slate-100">
            {loading ? (
              <div className="p-12 text-center text-slate-500 text-sm animate-pulse space-y-2">
                <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin mx-auto" />
                <p className="font-semibold text-slate-700">Memuat Rekapan Temuan K3...</p>
              </div>
            ) : visibleTickets.length === 0 ? (
              <div className="p-12 text-center space-y-2 bg-slate-50/50">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-800 text-base">Tidak Ada Temuan Sesuai Filter</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Semua temuan pada kategori ini telah selesai ditindaklanjuti atau tidak ditemukan data yang cocok.
                </p>
              </div>
            ) : (
              visibleTickets.map((t, idx) => {
                const isOpen = (t.status || '').toUpperCase() === 'OPEN';
                const isProgress = (t.status || '').toUpperCase() === 'PROGRESS';
                const isClosed = (t.status || '').toUpperCase() === 'CLOSED';
                const isHigh = (t.priority || '').toUpperCase() === 'HIGH' || (t.risk || '').toLowerCase().includes('tinggi');
                
                return (
                  <div 
                    key={`${t.ticketId || t.id}-${idx}`}
                    className={`p-4 sm:p-5 hover:bg-slate-50/80 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      isOpen ? 'border-l-4 border-l-rose-500' : isProgress ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-emerald-500'
                    }`}
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider ${
                          isOpen ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                          isProgress ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}>
                          {t.status || 'OPEN'}
                        </span>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isHigh ? 'bg-red-50 text-red-700 border border-red-200 font-black' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {t.risk || t.priority || 'Medium Risk'}
                        </span>

                        <span className="text-xs font-mono font-bold text-slate-600">
                          {t.ticketId}
                        </span>

                        <span className="text-xs text-slate-400 font-medium">
                          • {t.date ? format(new Date(t.date), 'dd MMM yyyy, HH:mm') : '-'}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">
                          {t.description || 'Temuan Inspeksi K3'}
                        </h4>
                        {t.initialControl && (
                          <p className="text-xs text-teal-700 font-medium mt-1 flex items-center gap-1">
                            <span className="font-bold text-slate-500">Rekomendasi:</span> {t.initialControl}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Map className="w-3.5 h-3.5 text-slate-400" />
                          {t.location || t.area || 'General Area'}
                        </span>
                        <span>•</span>
                        <span className="text-slate-600">
                          Pelapor: <strong className="text-slate-800">{t.requestorName || 'Inspector'}</strong>
                        </span>
                        {t.pic && (
                          <>
                            <span>•</span>
                            <span className="text-emerald-700 font-medium">
                              PIC: <strong>{t.pic}</strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                      {t.photoUrl && t.photoUrl !== '-' && (
                        <Button
                          variant="secondary"
                          onClick={() => setSelectedImage(t.photoUrl)}
                          className="h-8 px-2.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1"
                          title="Lihat Foto Temuan"
                        >
                          <Camera className="w-3.5 h-3.5 text-slate-600" />
                          <span>Foto</span>
                        </Button>
                      )}

                      {t.documentLink && (
                        <a
                          href={t.documentLink}
                          target="_blank"
                          rel="noreferrer"
                          className="h-8 px-2.5 text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 font-semibold rounded-lg flex items-center gap-1 transition-colors"
                          title="Lihat Dokumen PDF Laporan"
                        >
                          <FileText className="w-3.5 h-3.5 text-teal-600" />
                          <span>PDF Laporan</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      )}

                      {!isClosed ? (
                        <Button
                          onClick={() => {
                            setClosingTicket(t);
                            setClosingPic(t.pic || '');
                            setClosingAction(t.actionTaken || '');
                            setClosingPhotoBase64('');
                          }}
                          className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Tutup Tiket</span>
                        </Button>
                      ) : (
                        <span className="h-8 px-3 text-xs bg-emerald-100 text-emerald-800 font-bold rounded-lg flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Tuntas</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </main>

      {/* Quick Close Modal */}
      {closingTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                  Penutupan Temuan K3
                </span>
                <h3 className="font-bold text-slate-900 text-base mt-1">
                  {closingTicket.ticketId}
                </h3>
              </div>
              <button 
                onClick={() => setClosingTicket(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl text-xs space-y-1.5 border border-slate-200">
              <p className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Temuan Awal</p>
              <p className="font-bold text-slate-900">{closingTicket.description}</p>
              <p className="text-slate-600">Lokasi: <strong className="text-slate-800">{closingTicket.location}</strong></p>
            </div>

            <form onSubmit={handleSubmitCloseTicket} className="space-y-4">
              <Input
                label="Nama PIC / Penanggung Jawab Penutupan"
                placeholder="Contoh: Muhammad Ardiyan Syah"
                value={closingPic}
                onChange={(e) => setClosingPic(e.target.value)}
                required
              />

              <Textarea
                label="Tindakan Perbaikan yang Dilakukan (Action Taken)"
                placeholder="Jelaskan secara rinci tindakan perbaikan yang telah selesai dilakukan..."
                value={closingAction}
                onChange={(e) => setClosingAction(e.target.value)}
                rows={3}
                required
              />

              <div>
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-600 block mb-1.5">
                  Foto Bukti Perbaikan Selesai (Opsional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="text-xs file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 cursor-pointer"
                />
                {closingPhotoBase64 && (
                  <div className="mt-2 relative w-full h-32 bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                    <img 
                      src={closingPhotoBase64} 
                      alt="Preview Closing" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setClosingTicket(null)}
                  className="h-10 px-4 text-xs font-semibold rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={submittingClose}
                  className="h-10 px-5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{submittingClose ? 'Menyimpan...' : 'Tutup & Selesaikan Tiket'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      <ImageModal 
        imageUrl={selectedImage} 
        onClose={() => setSelectedImage(null)} 
      />
    </div>
  );
}
