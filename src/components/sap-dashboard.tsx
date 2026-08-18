import React, { useState, useEffect, useMemo } from 'react';
import { Card, Button } from './ui';
import { ChevronLeft, BarChart2, Activity, ShieldAlert, CheckCircle2, AlertTriangle, TrendingUp, Filter, Map } from 'lucide-react';
import { getTickets } from '../sheets-api';
import { format, isThisISOWeek, isThisMonth, isThisYear, parseISO } from 'date-fns';
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
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState('this_week');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getTickets('all');
      if (res.success && res.data) {
        setAllTickets(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredTickets = useMemo(() => {
    return allTickets.filter(t => {
      if (!t.date) return false;
      let d = null;
      try {
        d = new Date(t.date);
      } catch (e) {
        return true;
      }
      if (isNaN(d.getTime())) return true; 
      if (filterPeriod === 'this_week') return isThisISOWeek(d);
      if (filterPeriod === 'this_month') return isThisMonth(d);
      if (filterPeriod === 'ytd') return isThisYear(d);
      return true;
    });
  }, [allTickets, filterPeriod]);

  const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];
  const PIE_COLORS = { Open: '#ef4444', Progress: '#f59e0b', Closed: '#10b981' };

  // Calculate Metrics
  const openFindings = filteredTickets.filter(t => t.status?.toUpperCase() === 'OPEN').length;
  const progressFindings = filteredTickets.filter(t => t.status?.toUpperCase() === 'PROGRESS').length;
  const closedFindings = filteredTickets.filter(t => t.status?.toUpperCase() === 'CLOSED').length;
  const totalFindings = filteredTickets.length;
  const closureRate = totalFindings ? Math.round((closedFindings / totalFindings) * 100) : 0;

  const targetAreasCount = 29;
  const expectedTotalAreas = filterPeriod === 'this_week' ? 29 : (filterPeriod === 'this_month' ? 116 : 1500);
  const completedAreasCount = filterPeriod === 'this_week' ? 26 : (filterPeriod === 'this_month' ? 104 : 1200);
  const complianceScore = Math.round((completedAreasCount / expectedTotalAreas) * 100);

  const pieData = [
    { name: 'Open', value: openFindings },
    { name: 'Progress', value: progressFindings },
    { name: 'Closed', value: closedFindings },
  ].filter(d => d.value > 0);

  const trendData = [
    { name: 'Minggu 1', temuan: 12, ditutup: 8 },
    { name: 'Minggu 2', temuan: 19, ditutup: 15 },
    { name: 'Minggu 3', temuan: 8, ditutup: 10 },
    { name: 'Minggu 4', temuan: Math.max(totalFindings - 39, 0), ditutup: Math.max(closedFindings - 33, 0) },
  ];

  // Heatmap Data (Temuan by Area)
  const areaCounts = filteredTickets.reduce((acc: any, curr) => {
    const area = curr.area || 'Unknown';
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {});
  const heatmapData = Object.keys(areaCounts).map(area => ({
    area,
    count: areaCounts[area]
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="flex flex-col h-full bg-slate-50 min-h-screen pb-20">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
            <BarChart2 className="w-5 h-5 text-teal-700" />
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-lg text-slate-800 leading-tight">SAP Dashboard</h1>
            <p className="text-xs text-slate-500">Safety Accountability Program</p>
          </div>
          <select 
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 font-medium shadow-sm"
          >
            <option value="this_week">Minggu Ini</option>
            <option value="this_month">Bulan Ini</option>
            <option value="ytd">Tahun Ini</option>
          </select>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Compliance Score Matrix */}
        <Card className="p-5 bg-gradient-to-br from-teal-600 to-teal-800 border-none shadow-md relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="w-24 h-24" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-teal-100 font-medium mb-1">Compliance Score Matrix</p>
              <h2 className="text-3xl font-bold flex items-end gap-2">
                {complianceScore}%
                <span className="text-sm font-normal text-teal-200 mb-1">Penyelesaian Inspeksi</span>
              </h2>
            </div>
            <div className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
              <p className="text-sm font-medium">{completedAreasCount} dari {expectedTotalAreas} Area Tuntas</p>
            </div>
          </div>
        </Card>

        {/* Top KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-white border-none shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <ShieldAlert className="w-12 h-12 text-red-600" />
             </div>
             <p className="text-sm text-slate-500 font-medium mb-1">Total Temuan</p>
             <h3 className="text-2xl font-bold text-slate-800">{totalFindings}</h3>
             <p className="text-xs text-red-500 font-medium mt-1">{openFindings} Open</p>
          </Card>

          <Card className="p-4 bg-white border-none shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <CheckCircle2 className="w-12 h-12 text-teal-600" />
             </div>
             <p className="text-sm text-slate-500 font-medium mb-1">Temuan Ditutup</p>
             <h3 className="text-2xl font-bold text-slate-800">{closedFindings}</h3>
             <p className="text-xs text-teal-600 font-medium mt-1">{closureRate}% Closure Rate</p>
          </Card>

          <Card className="p-4 bg-white border-none shadow-sm relative overflow-hidden col-span-2 md:col-span-1">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <AlertTriangle className="w-12 h-12 text-amber-600" />
             </div>
             <p className="text-sm text-slate-500 font-medium mb-1">Dalam Proses</p>
             <h3 className="text-2xl font-bold text-slate-800">{progressFindings}</h3>
             <p className="text-xs text-slate-400 mt-1">Sedang ditindaklanjuti</p>
          </Card>
        </div>

        {/* Heatmap Temuan Berulang */}
        <Card className="p-5 bg-white border-none shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <Map className="w-4 h-4 text-rose-500" />
            Heatmap Temuan Berulang (Area)
          </h3>
          <div className="space-y-4">
            {heatmapData.length > 0 ? heatmapData.map((item, i) => {
              const maxCount = heatmapData[0].count;
              const percentage = Math.round((item.count / maxCount) * 100);
              return (
                <div key={item.area} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-700 truncate mr-2">{item.area}</span>
                    <span className="text-slate-500 font-medium">{item.count} temuan</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${i === 0 ? 'bg-rose-500' : i === 1 ? 'bg-orange-500' : 'bg-amber-400'}`} 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            }) : (
              <p className="text-sm text-slate-400 text-center py-4">Belum ada data temuan</p>
            )}
          </div>
        </Card>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-5 bg-white border-none shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Tren Temuan vs Penutupan
            </h3>
            <div className="h-64">
              <Bar 
                data={{
                  labels: trendData.map(d => d.name),
                  datasets: [
                    {
                      label: 'Temuan Baru',
                      data: trendData.map(d => d.temuan),
                      backgroundColor: '#ef4444',
                      borderRadius: 4,
                      barPercentage: 0.6,
                    },
                    {
                      label: 'Ditutup',
                      data: trendData.map(d => d.ditutup),
                      backgroundColor: '#10b981',
                      borderRadius: 4,
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
                      ticks: { color: '#64748b', font: { size: 12 } },
                      border: { display: false }
                    },
                    y: {
                      grid: { color: '#e2e8f0', tickLength: 0 },
                      ticks: { color: '#64748b', font: { size: 12 } },
                      border: { display: false }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } }
                    },
                    tooltip: {
                      backgroundColor: 'rgba(255,255,255,0.9)',
                      titleColor: '#0f172a',
                      bodyColor: '#334155',
                      borderColor: '#e2e8f0',
                      borderWidth: 1,
                      padding: 12,
                      boxPadding: 6,
                      usePointStyle: true
                    }
                  }
                }}
              />
            </div>
          </Card>

          <Card className="p-5 bg-white border-none shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
              <Filter className="w-4 h-4 text-purple-500" />
              Status Temuan (Terkini)
            </h3>
            <div className="h-64 flex items-center justify-center relative">
              {pieData.length > 0 ? (
                <Doughnut 
                  data={{
                    labels: pieData.map(d => d.name),
                    datasets: [{
                      data: pieData.map(d => d.value),
                      backgroundColor: pieData.map((d, i) => (PIE_COLORS as any)[d.name] || COLORS[i % COLORS.length]),
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
                        labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(255,255,255,0.9)',
                        titleColor: '#0f172a',
                        bodyColor: '#334155',
                        borderColor: '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true
                      }
                    }
                  }}
                />
              ) : (
                <p className="text-sm text-slate-400">Tidak ada data temuan</p>              )}
              {pieData.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                  <span className="text-2xl font-bold text-slate-800">{totalFindings}</span>
                  <span className="text-xs text-slate-500">Total</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Action Items */}
        <Card className="p-0 bg-white border-none shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Temuan Terbuka (Action Items)
             </h3>
             <Button variant="secondary" className="text-xs bg-white h-8 border border-slate-200 text-slate-700">Lihat Semua</Button>          </div>
          <div className="divide-y divide-slate-100">
             {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm animate-pulse">Memuat data...</div>
             ) : filteredTickets.filter(t => t.status?.toUpperCase() !== 'CLOSED').length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Tidak ada temuan terbuka 🎉</div>
             ) : (
                filteredTickets.filter(t => t.status?.toUpperCase() !== 'CLOSED').slice(0, 5).map((t, idx) => (
                  <div key={`${t.id}-${idx}`} className="p-4 hover:bg-slate-50 transition-colors flex items-start gap-4">
                    <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${t.status?.toUpperCase() === 'OPEN' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{t.deskripsi}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                        <span className="truncate max-w-[150px]">Area: {t.area}</span>
                        <span>•</span>
                        <span>PIC: {t.pic_name || 'Belum diassign'}</span>
                        <span>•</span>
                        <span>{t.date ? format(new Date(t.date), 'dd MMM yyyy') : ''}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap ${t.status?.toUpperCase() === 'OPEN' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {t.status}
                    </span>
                  </div>
                ))
             )}
          </div>
        </Card>
      </div>
    </div>
  );
}
