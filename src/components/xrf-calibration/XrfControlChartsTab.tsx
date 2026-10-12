import React, { useState, useEffect } from 'react';
import { 
  LineChart, Sliders, RefreshCw, Calendar, ArrowLeftRight, 
  HelpCircle, Sparkles, Filter 
} from 'lucide-react';
import { toast } from 'sonner';
import { XrfQcChartCard, XrfChartLimitData, XrfChartStatData, XrfPointData } from './XrfQcChartCard';

interface XrfControlChartsTabProps {
  instruments: Array<{ code: string; name: string }>;
  standards: Array<{ code: string; name: string }>;
}

const ALL_ELEMENTS = ['Cr2O3', 'Ni', 'Co', 'Fe', 'SiO2', 'Al2O3', 'MgO', 'CaO', 'MnO', 'P', 'S'];

export const XrfControlChartsTab: React.FC<XrfControlChartsTabProps> = ({
  instruments,
  standards,
}) => {
  // Filters
  const [selectedElement, setSelectedElement] = useState('Cr2O3');
  const [instLeft, setInstLeft] = useState('EPSILON_A');
  const [instRight, setInstRight] = useState('EPSILON_B');
  const [selectedStandards, setSelectedStandards] = useState<string[]>(['LIM01', 'LIM02', 'LIM03', 'LIM04', 'LIM05']);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Response Grid Data
  const [gridData, setGridData] = useState<Record<string, Record<string, any>>>({});
  const [allElementsData, setAllElementsData] = useState<Record<string, Record<string, Record<string, any>>>>({});

  // Fetch chart data from backend (fetches all 11 elements in a single optimized pass)
  const fetchChartData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('element', selectedElement);
      params.set('instruments', `${instLeft},${instRight}`);
      params.set('standards', selectedStandards.join(','));
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/xrf/qc-chart-data?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        if (json.allElementsData) {
          setAllElementsData(json.allElementsData);
        }
        if (json.gridData) {
          setGridData(json.gridData);
        }
      }
    } catch (err: any) {
      toast.error('Gagal mengambil data grafik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch only when instruments, standards, or date filters change.
  // Switching elements uses in-memory cache (0ms instant response).
  useEffect(() => {
    fetchChartData();
  }, [instLeft, instRight, selectedStandards, startDate, endDate]);

  // Handle instant element change from local cache
  const handleSelectElement = (el: string) => {
    setSelectedElement(el);
    if (allElementsData[el]) {
      setGridData(allElementsData[el]);
    }
  };

  // Active grid data for selected element
  const currentGridData = allElementsData[selectedElement] || gridData;

  // Names of Left & Right Instruments
  const leftObj = instruments.find(i => i.code === instLeft) || { name: 'EPSILON C' };
  const rightObj = instruments.find(i => i.code === instRight) || { name: 'EPSILON E' };

  // Toggle Standard selection
  const toggleStandard = (code: string) => {
    if (selectedStandards.includes(code)) {
      if (selectedStandards.length === 1) {
        toast.info("Minimal 1 standar harus dipilih.");
        return;
      }
      setSelectedStandards(selectedStandards.filter(s => s !== code));
    } else {
      setSelectedStandards([...selectedStandards, code]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter & Control Ribbon (Persis Header Gambar 6) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <LineChart className="w-5 h-5 text-teal-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Inter-Instrument Quality Control Comparison (Shewhart Chart)
              </h2>
              <p className="text-xs text-slate-500">
                Komparasi performa dan deteksi pergeseran kalibrasi alat XRF secara side-by-side (±2σ Warning & ±3σ Action Limit)
              </p>
            </div>
          </div>

          <button
            onClick={fetchChartData}
            disabled={loading}
            className="self-start md:self-auto px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Grafik
          </button>
        </div>

        {/* Filter Controls Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. Element Selector (Pills) */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Pilih Parameter / Unsur (Element)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_ELEMENTS.map(el => (
                <button
                  key={el}
                  onClick={() => handleSelectElement(el)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedElement === el
                      ? 'bg-teal-600 text-white shadow-xs scale-105'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {el}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Left Instrument Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Instrumen Kiri (Alat 1)
            </label>
            <select
              value={instLeft}
              onChange={e => setInstLeft(e.target.value)}
              className="w-full bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-300 dark:border-cyan-800 rounded-xl px-3 py-2 text-xs font-bold text-cyan-900 dark:text-cyan-200 focus:ring-2 focus:ring-cyan-500"
            >
              {instruments.map(inst => (
                <option key={`left-${inst.code}`} value={inst.code}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Right Instrument Selector */}
          <div>
            <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Instrumen Kanan (Alat 2)
            </label>
            <select
              value={instRight}
              onChange={e => setInstRight(e.target.value)}
              className="w-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl px-3 py-2 text-xs font-bold text-amber-900 dark:text-amber-200 focus:ring-2 focus:ring-amber-500"
            >
              {instruments.map(inst => (
                <option key={`right-${inst.code}`} value={inst.code}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Standard CRM Multi-selector Checklist */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
            Tampilkan Standar Sample:
          </label>
          <div className="flex flex-wrap gap-2">
            {standards.slice(0, 10).map(std => {
              const active = selectedStandards.includes(std.code);
              return (
                <button
                  key={`std-chk-${std.code}`}
                  onClick={() => toggleStandard(std.code)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    active
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent font-bold'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                  }`}
                >
                  {std.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Comparison Header (Persis Header Warna Cyan & Kuning di Gambar 6) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-cyan-500 text-slate-950 font-black text-center py-2.5 px-4 rounded-xl shadow-xs uppercase tracking-widest text-sm border-2 border-cyan-600">
          {leftObj.name}
        </div>
        <div className="bg-yellow-400 text-slate-950 font-black text-center py-2.5 px-4 rounded-xl shadow-xs uppercase tracking-widest text-sm border-2 border-yellow-500">
          {rightObj.name}
        </div>
      </div>

      {/* Dynamic Grid of Side-by-Side Charts for Each Selected Standard */}
      <div className="space-y-8">
        {selectedStandards.map(stdCode => {
          const stdData = currentGridData[stdCode] || {};
          const leftData = stdData[instLeft] || {
            limits: { nominalValue: 2.303, stdevFixed: 0.089, upperAction: 2.603, upperWarning: 2.503, lowerWarning: 2.103, lowerAction: 2.003 },
            statistics: { count: 0, mean: 0, median: 0, min: 0, max: 0, actualStdev: 0 },
            points: [],
          };
          const rightData = stdData[instRight] || {
            limits: { nominalValue: 2.303, stdevFixed: 0.089, upperAction: 2.603, upperWarning: 2.503, lowerWarning: 2.103, lowerAction: 2.003 },
            statistics: { count: 0, mean: 0, median: 0, min: 0, max: 0, actualStdev: 0 },
            points: [],
          };

          const stdObj = standards.find(s => s.code === stdCode) || { name: stdCode };

          return (
            <div key={`compare-row-${stdCode}`} className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Instrument Card */}
                <XrfQcChartCard
                  standardCode={stdObj.name}
                  instrumentName={leftObj.name}
                  instrumentCode={instLeft}
                  headerColorClass="bg-cyan-500 text-slate-950 font-black"
                  limits={leftData.limits}
                  statistics={leftData.statistics}
                  points={leftData.points}
                />

                {/* Right Instrument Card */}
                <XrfQcChartCard
                  standardCode={stdObj.name}
                  instrumentName={rightObj.name}
                  instrumentCode={instRight}
                  headerColorClass="bg-yellow-400 text-slate-950 font-black"
                  limits={rightData.limits}
                  statistics={rightData.statistics}
                  points={rightData.points}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
