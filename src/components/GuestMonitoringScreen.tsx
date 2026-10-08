import React, { useState, useEffect, useMemo } from 'react';
import { 
  ThermometerSun, Wind, ShieldCheck, CheckCircle2, AlertTriangle, 
  XCircle, Clock, User, Calendar, FileDown, RefreshCw, Loader2, 
  Sparkles, Info, Eye, Layers, ExternalLink, Printer, CheckSquare, 
  Activity, ArrowRight, Filter, ChevronDown, Check, Gauge
} from 'lucide-react';
import { Card, Button } from './ui';
import { getRekapanPemantauan, buatPdfRekapan, cekPdfRekapanPeriode } from '../sheets-api';
import { ACCEPTABLE_RANGES } from './monitoring-dashboard';
import { 
  getISOWeek, 
  getISOWeekYear, 
  getISOWeekRange, 
  getYearISOWeeksList 
} from '../utils/iso-week';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { toast } from 'sonner';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export type AreaCategory = 'balance-room' | 'xrf-room' | 'chiller-room' | 'fusion-room' | 'chemical-room' | 'gas-station' | 'all-matrix';

export interface AreaConfig {
  id: AreaCategory;
  name: string;
  shortName: string;
  icon: string;
  category: 'SUHU' | 'GAS' | 'ALL';
  roomKey?: string;
  refText: string;
  standardSuhu?: string;
  standardRH?: string;
}

export const AREA_LIST: AreaConfig[] = [
  {
    id: 'balance-room',
    name: 'Balance Room (R. Timbang)',
    shortName: 'R. Timbang',
    icon: '⚖️',
    category: 'SUHU',
    roomKey: 'Balance Room',
    refText: '10°C - 30°C (RH 15-80%) • Standar Pioneer Balance EN-8',
    standardSuhu: '10°C - 30°C',
    standardRH: '15% - 80%'
  },
  {
    id: 'xrf-room',
    name: 'XRF Room (R. Spektrometri)',
    shortName: 'R. XRF',
    icon: '🔬',
    category: 'SUHU',
    roomKey: 'XRF Room',
    refText: '5°C - 35°C (RH 20-80%) • Standar Epsilon 4 Spec hal. 2',
    standardSuhu: '5°C - 35°C',
    standardRH: '20% - 80%'
  },
  {
    id: 'chiller-room',
    name: 'Chiller Room',
    shortName: 'R. Chiller',
    icon: '❄️',
    category: 'SUHU',
    roomKey: 'Chiller Room',
    refText: '10°C - 42°C • Standar Sigma-C 9 hal. 1/2',
    standardSuhu: '10°C - 42°C',
    standardRH: 'Sesuai Ventilasi'
  },
  {
    id: 'fusion-room',
    name: 'Fusion Room',
    shortName: 'R. Fusion',
    icon: '🔥',
    category: 'SUHU',
    roomKey: 'Fusion Room',
    refText: '5°C - 40°C • Standar Oven Memmert UNb hal. 7/27',
    standardSuhu: '5°C - 40°C',
    standardRH: 'Sesuai Ventilasi'
  },
  {
    id: 'chemical-room',
    name: 'Chemical Room',
    shortName: 'R. Chemical',
    icon: '🧪',
    category: 'SUHU',
    roomKey: 'Chemical Room',
    refText: '≤ 25°C • Standar SDS Alkohol 70% hal. 3/7',
    standardSuhu: '≤ 25°C',
    standardRH: 'Sesuai Ventilasi'
  },
  {
    id: 'gas-station',
    name: 'Central Gas Station (Argon & Helium)',
    shortName: 'Tabung Gas',
    icon: '💨',
    category: 'GAS',
    refText: 'Zetium A/B (Argon) & Epsilon C (Helium) • Deteksi Kebocoran N95/K3',
    standardSuhu: 'N/A',
    standardRH: 'N/A'
  },
  {
    id: 'all-matrix',
    name: 'Matriks Ringkasan Semua Ruangan',
    shortName: 'Semua Ruangan',
    icon: '📊',
    category: 'ALL',
    refText: 'Matriks kesesuaian parameter seluruh laboratorium terpadu',
    standardSuhu: 'Beragam',
    standardRH: 'Beragam'
  }
];

export interface NormalizedRecord {
  id: number;
  idPemantauan: string;
  kategori: 'SUHU' | 'GAS';
  tanggal: string;
  jam: string;
  shift: string;
  lokasiArea: string;
  suhu: string;
  kelembaban: string;
  flowGas: string;
  tekananGasPsi: string;
  kebocoran: string;
  catatanRemark: string;
  inspektorPetugas: string;
  foto?: string;
  ttd?: string;
}

export function normalizeRecord(r: any): NormalizedRecord {
  return {
    id: r.id || 0,
    idPemantauan: r.idPemantauan || r.id_pemantauan || '',
    kategori: ((r.kategori || 'SUHU') as string).toUpperCase() === 'GAS' ? 'GAS' : 'SUHU',
    tanggal: (r.tanggal || '').substring(0, 10),
    jam: (r.jam || '').trim(),
    shift: (r.shift || '').trim(),
    lokasiArea: (r.lokasi_area || r.lokasiArea || r.lokasi || r.ruangan || r.tabungGas || '').trim(),
    suhu: (r.suhu_celcius ?? r.suhuCelcius ?? r.suhu ?? '').toString().trim(),
    kelembaban: (r.kelembapan_persen ?? r.kelembapanPersen ?? r.kelembaban ?? r.kelembapan ?? '').toString().trim(),
    flowGas: (r.flow_gas ?? r.flowGas ?? r.flowRate ?? r.flow ?? '').toString().trim(),
    tekananGasPsi: (r.tekanan_gas_psi ?? r.tekananGasPsi ?? r.tekanan ?? '').toString().trim(),
    kebocoran: (r.kebocoran_yn ?? r.kebocoranYn ?? r.kebocoran ?? 'N').toString().trim().toUpperCase(),
    catatanRemark: (r.catatan_remark ?? r.catatanRemark ?? r.catatan ?? '').toString().trim(),
    inspektorPetugas: (r.inspektor_petugas ?? r.inspektorPetugas ?? r.petugas ?? '').toString().trim(),
    foto: r.foto || '',
    ttd: r.ttd || ''
  };
}

export function matchRoom(record: NormalizedRecord, area: AreaConfig): boolean {
  if (record.kategori !== 'SUHU') return false;
  const lok = record.lokasiArea.toLowerCase();
  if (!lok) return false;

  if (area.id === 'balance-room') {
    return lok.includes('balance') || lok.includes('timbang');
  }
  if (area.id === 'xrf-room') {
    return lok.includes('xrf') || lok.includes('spektro');
  }
  if (area.id === 'chiller-room') {
    return lok.includes('chiller');
  }
  if (area.id === 'fusion-room') {
    return lok.includes('fusion') || lok.includes('peleburan');
  }
  if (area.id === 'chemical-room') {
    return lok.includes('chemical') || lok.includes('asam');
  }
  return false;
}

export const GAS_CYLINDERS = [
  { id: 'zetium-a', name: 'Tabung Gas Zetium A (Argon)', shortName: 'Zetium A', gas: 'Argon (Ar)', app: 'Zetium Spectrometer' },
  { id: 'zetium-b', name: 'Tabung Gas Zetium B (Argon)', shortName: 'Zetium B', gas: 'Argon (Ar)', app: 'Zetium Spectrometer' },
  { id: 'epsilon-c', name: 'Tabung Gas Epsilon C (Helium)', shortName: 'Epsilon C', gas: 'Helium (He)', app: 'Epsilon Spectrometer' },
];

export function matchGas(record: NormalizedRecord, cylinderId: string): boolean {
  if (record.kategori !== 'GAS') return false;
  const lok = record.lokasiArea.toLowerCase();
  if (cylinderId === 'zetium-a') return lok.includes('zetium') && lok.includes('a');
  if (cylinderId === 'zetium-b') return lok.includes('zetium') && lok.includes('b');
  if (cylinderId === 'epsilon-c') return lok.includes('epsilon') || lok.includes('helium');
  return false;
}

export const GuestMonitoringScreen: React.FC = () => {
  const [selectedArea, setSelectedArea] = useState<AreaCategory>('all-matrix');
  const [selectedGasCylinder, setSelectedGasCylinder] = useState<string>('ALL');
  const [rawRecords, setRawRecords] = useState<NormalizedRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfLinks, setPdfLinks] = useState<any[]>([]);
  const [existingPdfsMap, setExistingPdfsMap] = useState<Record<string, { name: string; url: string; createdTime?: string }>>({});
  const [isCheckingPdfs, setIsCheckingPdfs] = useState<boolean>(false);

  // Time Range States (ISO Week, Monthly, Custom)
  const [selectedPreset, setSelectedPreset] = useState<string>('this_month');
  const [tglMulai, setTglMulai] = useState<string>('');
  const [tglAkhir, setTglAkhir] = useState<string>('');

  const MONTH_NAMES = useMemo(() => [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ], []);

  const isoWeeksList = useMemo(() => getYearISOWeeksList(new Date().getFullYear()), []);

  const monthsList = useMemo(() => {
    const year = new Date().getFullYear();
    return MONTH_NAMES.map((name, idx) => {
      const monthNum = idx + 1;
      const mm = String(monthNum).padStart(2, '0');
      return {
        value: `month_${year}_${mm}`,
        label: `🗓️ ${name} ${year}`,
        monthNum,
        year
      };
    });
  }, [MONTH_NAMES]);

  // Helper date formatter
  const formatDateYMD = (d: Date) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  // Generate complete calendar day sequence if start and end dates are specified (e.g. Month or Week)
  const generateDateRangeList = (start: string, end: string, fallbackDates: string[]): string[] => {
    if (start && end) {
      const [sY, sM, sD] = start.split('-').map(Number);
      const [eY, eM, eD] = end.split('-').map(Number);
      if (!isNaN(sY) && !isNaN(eY) && !isNaN(sD) && !isNaN(eD)) {
        const cur = new Date(sY, sM - 1, sD);
        const stop = new Date(eY, eM - 1, eD);
        const diffDays = Math.round((stop.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 62) {
          const list: string[] = [];
          const d = new Date(sY, sM - 1, sD);
          while (d <= stop) {
            const yy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            list.push(`${yy}-${mm}-${dd}`);
            d.setDate(d.getDate() + 1);
          }
          return list;
        }
      }
    }
    return [...fallbackDates].sort();
  };

  // Preset calculation handler
  const applyPresetDates = (preset: string) => {
    setSelectedPreset(preset);
    if (!preset) return;

    const now = new Date();
    let start = '';
    let end = '';

    if (preset === 'all') {
      start = '';
      end = '';
    } else if (preset === 'this_iso_week') {
      const range = getISOWeekRange(now.getFullYear(), getISOWeek(now));
      start = formatDateYMD(range.start);
      end = formatDateYMD(range.end);
    } else if (preset === 'last_iso_week') {
      const lastWeek = Math.max(1, getISOWeek(now) - 1);
      const range = getISOWeekRange(now.getFullYear(), lastWeek);
      start = formatDateYMD(range.start);
      end = formatDateYMD(range.end);
    } else if (preset === 'this_month') {
      start = formatDateYMD(new Date(now.getFullYear(), now.getMonth(), 1));
      end = formatDateYMD(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (preset === 'last_month') {
      start = formatDateYMD(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      end = formatDateYMD(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (preset.startsWith('iso_')) {
      const parts = preset.split('_');
      const targetYear = parseInt(parts[1], 10);
      const targetWeek = parseInt(parts[2], 10);
      if (!isNaN(targetYear) && !isNaN(targetWeek)) {
        const range = getISOWeekRange(targetYear, targetWeek);
        start = formatDateYMD(range.start);
        end = formatDateYMD(range.end);
      }
    } else if (preset.startsWith('month_')) {
      const parts = preset.split('_');
      const targetYear = parseInt(parts[1], 10);
      const targetMonth = parseInt(parts[2], 10);
      if (!isNaN(targetYear) && !isNaN(targetMonth)) {
        start = formatDateYMD(new Date(targetYear, targetMonth - 1, 1));
        end = formatDateYMD(new Date(targetYear, targetMonth, 0));
      }
    }

    setTglMulai(start);
    setTglAkhir(end);
  };

  // Initialize with current month
  useEffect(() => {
    applyPresetDates('this_month');
  }, []);

  // Fetch monitoring records from API
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRekapanPemantauan('', '');
      if (Array.isArray(data)) {
        const normalized = data.map(normalizeRecord);
        setRawRecords(normalized);
      } else {
        setRawRecords([]);
      }
    } catch (err: any) {
      console.error(err);
      setError('Gagal memuat data pemantauan real-time');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter records by date range
  const filteredRecords = useMemo(() => {
    if (!tglMulai && !tglAkhir) return rawRecords;
    return rawRecords.filter(r => {
      if (!r.tanggal) return false;
      if (tglMulai && r.tanggal < tglMulai) return false;
      if (tglAkhir && r.tanggal > tglAkhir) return false;
      return true;
    });
  }, [rawRecords, tglMulai, tglAkhir]);

  // Fallback to all records if filtered is completely empty
  const recordsToUse = useMemo(() => {
    return filteredRecords.length > 0 ? filteredRecords : rawRecords;
  }, [filteredRecords, rawRecords]);

  // Current active area configuration
  const currentArea = useMemo(() => {
    return AREA_LIST.find(a => a.id === selectedArea) || AREA_LIST[0];
  }, [selectedArea]);

  // Matching records for the selected room within period
  const selectedRoomRecords = useMemo(() => {
    if (currentArea.category !== 'SUHU') return [];
    const matched = recordsToUse.filter(r => matchRoom(r, currentArea));
    // Sort descending by date, then shift, then jam, then id
    matched.sort((a, b) => {
      if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
      return (b.id || 0) - (a.id || 0);
    });
    return matched;
  }, [recordsToUse, currentArea]);

  // Latest single record for the selected area
  const latestAreaRecord = useMemo(() => {
    return selectedRoomRecords[0] || null;
  }, [selectedRoomRecords]);

  // Compliance status for latest area record
  const currentAreaCompliance = useMemo(() => {
    if (!latestAreaRecord || currentArea.category !== 'SUHU') return { isCompliant: true, reason: 'Normal' };
    const range = ACCEPTABLE_RANGES[currentArea.roomKey || ''] || ACCEPTABLE_RANGES[currentArea.shortName || ''];
    if (!range) return { isCompliant: true, reason: 'Normal' };

    const sVal = parseFloat(latestAreaRecord.suhu);
    const kVal = parseFloat(latestAreaRecord.kelembaban);

    if (!isNaN(sVal)) {
      if (range.sLow != null && sVal < range.sLow) return { isCompliant: false, reason: `Suhu < ${range.sLow}°C` };
      if (range.sUp != null && sVal > range.sUp) return { isCompliant: false, reason: `Suhu > ${range.sUp}°C` };
    }
    if (!isNaN(kVal)) {
      if (range.kLow != null && kVal < range.kLow) return { isCompliant: false, reason: `RH < ${range.kLow}%` };
      if (range.kUp != null && kVal > range.kUp) return { isCompliant: false, reason: `RH > ${range.kUp}%` };
    }

    return { isCompliant: true, reason: 'Normal' };
  }, [latestAreaRecord, currentArea]);

  // 1. TERPISAH: GRAFIK SUHU RUANGAN DENGAN BATAS ATAS & BATAS BAWAH
  const chartSuhuData = useMemo(() => {
    if (currentArea.category !== 'SUHU') return null;
    const matched = [...selectedRoomRecords];
    if (matched.length === 0) return null;

    const dateMap: Record<string, number> = {};
    matched.forEach(r => {
      if (r.tanggal && r.suhu && dateMap[r.tanggal] === undefined) {
        const s = parseFloat(r.suhu);
        if (!isNaN(s)) dateMap[r.tanggal] = s;
      }
    });

    const sortedDates = generateDateRangeList(tglMulai, tglAkhir, Object.keys(dateMap));
    if (sortedDates.length === 0) return null;

    const labels = sortedDates.map(d => {
      const parts = d.split('-');
      return `${parts[2]}/${parts[1]}`;
    });
    const suhuValues = sortedDates.map(d => dateMap[d] ?? null);

    const std = ACCEPTABLE_RANGES[currentArea.roomKey || ''] || ACCEPTABLE_RANGES[currentArea.shortName || ''];

    const datasets: any[] = [
      {
        label: 'Suhu Aktual (°C)',
        data: suhuValues,
        borderColor: '#0284c7',
        backgroundColor: 'rgba(2, 132, 199, 0.08)',
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#0284c7',
        borderWidth: 2.5,
        fill: true,
        spanGaps: true
      }
    ];

    if (std?.sUp != null) {
      datasets.push({
        label: `Batas Atas (${std.sUp}°C)`,
        data: sortedDates.map(() => std.sUp),
        borderColor: 'rgba(239, 68, 68, 0.85)',
        borderDash: [6, 6],
        pointRadius: 0,
        borderWidth: 2,
        fill: false
      });
    }

    if (std?.sLow != null) {
      datasets.push({
        label: `Batas Bawah (${std.sLow}°C)`,
        data: sortedDates.map(() => std.sLow),
        borderColor: 'rgba(59, 130, 246, 0.85)',
        borderDash: [6, 6],
        pointRadius: 0,
        borderWidth: 2,
        fill: false
      });
    }

    return { labels, datasets };
  }, [selectedRoomRecords, currentArea, tglMulai, tglAkhir]);

  // 2. TERPISAH: GRAFIK KELEMBABAN RH DENGAN BATAS ATAS & BATAS BAWAH
  const chartRHData = useMemo(() => {
    if (currentArea.category !== 'SUHU') return null;
    const matched = [...selectedRoomRecords];
    if (matched.length === 0) return null;

    const dateMap: Record<string, number> = {};
    matched.forEach(r => {
      if (r.tanggal && r.kelembaban && dateMap[r.tanggal] === undefined) {
        const k = parseFloat(r.kelembaban);
        if (!isNaN(k)) dateMap[r.tanggal] = k;
      }
    });

    const sortedDates = generateDateRangeList(tglMulai, tglAkhir, Object.keys(dateMap));
    if (sortedDates.length === 0) return null;

    const labels = sortedDates.map(d => {
      const parts = d.split('-');
      return `${parts[2]}/${parts[1]}`;
    });
    const kelValues = sortedDates.map(d => dateMap[d] ?? null);

    const std = ACCEPTABLE_RANGES[currentArea.roomKey || ''] || ACCEPTABLE_RANGES[currentArea.shortName || ''];

    const datasets: any[] = [
      {
        label: 'Kelembaban RH (%)',
        data: kelValues,
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.08)',
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#059669',
        borderWidth: 2.5,
        fill: true,
        spanGaps: true
      }
    ];

    if (std?.kUp != null) {
      datasets.push({
        label: `Batas Atas (${std.kUp}%)`,
        data: sortedDates.map(() => std.kUp),
        borderColor: 'rgba(245, 158, 11, 0.85)',
        borderDash: [6, 6],
        pointRadius: 0,
        borderWidth: 2,
        fill: false
      });
    }

    if (std?.kLow != null) {
      datasets.push({
        label: `Batas Bawah (${std.kLow}%)`,
        data: sortedDates.map(() => std.kLow),
        borderColor: 'rgba(16, 185, 129, 0.85)',
        borderDash: [6, 6],
        pointRadius: 0,
        borderWidth: 2,
        fill: false
      });
    }

    return { labels, datasets };
  }, [selectedRoomRecords, currentArea, tglMulai, tglAkhir]);

  // 3. TABUNG GAS 1 PER SATU: DETAIL & 2 GRAFIK TERPISAH PER TABUNG
  const cylinderDetailsWithCharts = useMemo(() => {
    const gasRecords = recordsToUse.filter(r => r.kategori === 'GAS');

    return GAS_CYLINDERS.map(cyl => {
      const matched = gasRecords.filter(r => matchGas(r, cyl.id));
      matched.sort((a, b) => {
        if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
        return (b.id || 0) - (a.id || 0);
      });
      const latest = matched[0] || null;

      // Extract chronological dates for this specific cylinder
      const dateMapPres: Record<string, number> = {};
      const dateMapFlow: Record<string, number> = {};
      matched.forEach(r => {
        if (r.tanggal) {
          if (r.tekananGasPsi && dateMapPres[r.tanggal] === undefined) {
            const val = parseFloat(r.tekananGasPsi);
            if (!isNaN(val)) dateMapPres[r.tanggal] = val;
          }
          if (r.flowGas && dateMapFlow[r.tanggal] === undefined) {
            const val = parseFloat(r.flowGas);
            if (!isNaN(val)) dateMapFlow[r.tanggal] = val;
          }
        }
      });

      const uniqueDates = Array.from(new Set([...Object.keys(dateMapPres), ...Object.keys(dateMapFlow)]));
      const sortedDates = generateDateRangeList(tglMulai, tglAkhir, uniqueDates);
      const labels = sortedDates.map(d => {
        const parts = d.split('-');
        return `${parts[2]}/${parts[1]}`;
      });

      const presChart = labels.length > 0 ? {
        labels,
        datasets: [
          {
            label: `Tekanan ${cyl.shortName} (Bar)`,
            data: sortedDates.map(d => dateMapPres[d] ?? null),
            borderColor: '#0284c7',
            backgroundColor: 'rgba(2, 132, 199, 0.08)',
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#0284c7',
            borderWidth: 2.5,
            fill: true,
            spanGaps: true
          }
        ]
      } : null;

      const flowChart = labels.length > 0 ? {
        labels,
        datasets: [
          {
            label: `Flow Rate ${cyl.shortName} (L/min)`,
            data: sortedDates.map(d => dateMapFlow[d] ?? null),
            borderColor: '#059669',
            backgroundColor: 'rgba(5, 150, 105, 0.08)',
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#059669',
            borderWidth: 2.5,
            fill: true,
            spanGaps: true
          }
        ]
      } : null;

      return {
        ...cyl,
        latest,
        totalInspections: matched.length,
        records: matched,
        presChart,
        flowChart
      };
    });
  }, [recordsToUse, tglMulai, tglAkhir]);

  const displayedCylinders = useMemo(() => {
    if (selectedGasCylinder === 'ALL') return cylinderDetailsWithCharts;
    return cylinderDetailsWithCharts.filter(c => c.id === selectedGasCylinder);
  }, [cylinderDetailsWithCharts, selectedGasCylinder]);

  // All room latest statuses for Matrix view
  const allRoomsMatrix = useMemo(() => {
    return AREA_LIST.filter(a => a.category === 'SUHU').map(area => {
      const matched = recordsToUse.filter(r => matchRoom(r, area));
      matched.sort((a, b) => {
        if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
        return (b.id || 0) - (a.id || 0);
      });
      const latest = matched[0] || null;

      let isCompliant = true;
      let statusDesc = 'Normal';

      if (latest) {
        const range = ACCEPTABLE_RANGES[area.roomKey || ''] || ACCEPTABLE_RANGES[area.shortName || ''];
        const sVal = parseFloat(latest.suhu);
        const kVal = parseFloat(latest.kelembaban);
        if (range) {
          if (range.sLow != null && !isNaN(sVal) && sVal < range.sLow) { isCompliant = false; statusDesc = `Suhu < ${range.sLow}°C`; }
          if (range.sUp != null && !isNaN(sVal) && sVal > range.sUp) { isCompliant = false; statusDesc = `Suhu > ${range.sUp}°C`; }
          if (range.kLow != null && !isNaN(kVal) && kVal < range.kLow) { isCompliant = false; statusDesc = `RH < ${range.kLow}%`; }
          if (range.kUp != null && !isNaN(kVal) && kVal > range.kUp) { isCompliant = false; statusDesc = `RH > ${range.kUp}%`; }
        }
      }

      return {
        ...area,
        latest,
        totalRecords: matched.length,
        isCompliant,
        statusDesc
      };
    });
  }, [recordsToUse]);

  // Get active period display label
  const periodDisplayLabel = useMemo(() => {
    if (selectedPreset === 'all' || (!tglMulai && !tglAkhir)) {
      return 'Semua Riwayat Log';
    }
    if (selectedPreset === 'this_iso_week') {
      const currW = getISOWeek(new Date());
      return `Minggu ISO Ini (W${String(currW).padStart(2, '0')})`;
    }
    if (selectedPreset === 'last_iso_week') {
      const lastW = Math.max(1, getISOWeek(new Date()) - 1);
      return `Minggu ISO Lalu (W${String(lastW).padStart(2, '0')})`;
    }
    if (selectedPreset === 'this_month') {
      return `Bulan Ini (${MONTH_NAMES[new Date().getMonth()]} ${new Date().getFullYear()})`;
    }
    if (selectedPreset === 'last_month') {
      const prev = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
      return `Bulan Lalu (${MONTH_NAMES[prev.getMonth()]} ${prev.getFullYear()})`;
    }
    if (selectedPreset.startsWith('iso_')) {
      const parts = selectedPreset.split('_');
      return `Minggu ISO ${parts[2]} (${parts[1]})`;
    }
    if (selectedPreset.startsWith('month_')) {
      const parts = selectedPreset.split('_');
      const mIdx = parseInt(parts[2], 10) - 1;
      return `${MONTH_NAMES[mIdx]} ${parts[1]}`;
    }
    return `${tglMulai} s/d ${tglAkhir}`;
  }, [selectedPreset, tglMulai, tglAkhir, MONTH_NAMES]);

  // Check if official PDF already exists in Google Drive for this period
  const checkExistingPdfs = async () => {
    setIsCheckingPdfs(true);
    try {
      const periodLabel = periodDisplayLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
      const tipe = currentArea.category === 'GAS' ? 'GAS' : (currentArea.category === 'SUHU' ? 'SUHU' : 'ALL');
      const res = await cekPdfRekapanPeriode(tglMulai, tglAkhir, tipe, periodLabel);
      if (res && res.status === 'success' && res.filesByLocation) {
        setExistingPdfsMap(res.filesByLocation);
      } else {
        setExistingPdfsMap({});
      }
    } catch (err) {
      console.error('Check existing PDFs error:', err);
    } finally {
      setIsCheckingPdfs(false);
    }
  };

  useEffect(() => {
    checkExistingPdfs();
  }, [tglMulai, tglAkhir, currentArea.category, periodDisplayLabel]);

  // Active existing PDF for currently selected view
  const currentActivePdf = useMemo(() => {
    if (currentArea.category === 'SUHU') {
      if (currentArea.roomKey && existingPdfsMap[currentArea.roomKey]) {
        return existingPdfsMap[currentArea.roomKey];
      }
      return existingPdfsMap['general'] || null;
    }
    if (currentArea.category === 'GAS') {
      if (selectedGasCylinder !== 'ALL') {
        const c = GAS_CYLINDERS.find(g => g.id === selectedGasCylinder);
        if (c && existingPdfsMap[c.name]) return existingPdfsMap[c.name];
      }
      return existingPdfsMap['general'] || null;
    }
    return existingPdfsMap['general'] || Object.values(existingPdfsMap)[0] || null;
  }, [currentArea, selectedGasCylinder, existingPdfsMap]);

  // Export PDF Handler (Resmi Google Docs / Google Drive Template Seperti Dashboard Internal)
  const handleExportPdf = async (specificLoc?: string) => {
    setIsExportingPdf(true);
    try {
      const now = new Date();
      const start = tglMulai || formatDateYMD(new Date(now.getFullYear(), now.getMonth(), 1));
      const end = tglAkhir || formatDateYMD(now);
      const tipe = currentArea.category === 'GAS' ? 'GAS' : 'SUHU';
      const locName = specificLoc 
        ? specificLoc 
        : (currentArea.id === 'all-matrix' ? '' : (currentArea.category === 'GAS' ? '' : currentArea.roomKey));
      const periodLabel = periodDisplayLabel.replace(/[^a-zA-Z0-9_-]/g, '_');

      toast.info(`Sedang membuat dokumen laporan PDF resmi ${locName || tipe}...`);
      const res = await buatPdfRekapan(start, end, tipe, periodLabel, locName || undefined);
      
      if (res && res.status === 'error') {
        toast.error(res.message || 'Tidak ada data pemantauan pada rentang waktu tersebut.');
      } else if (res && res.links && res.links.length > 0) {
        setPdfLinks(res.links);
        window.open(res.links[0].url, '_blank', 'noopener,noreferrer');
        toast.success(`PDF resmi berhasil dibuat (${res.links.length} dokumen)!`);
        checkExistingPdfs();
      } else if (res && res.url) {
        window.open(res.url, '_blank', 'noopener,noreferrer');
        toast.success('Dokumen PDF resmi berhasil dibuka!');
        checkExistingPdfs();
      } else {
        toast.error('Tidak ada dokumen PDF yang dapat dibuat.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal membuat PDF resmi dari server');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans select-none antialiased">
      {/* ----------------- TOP AUDITOR HEADER BAR ----------------- */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Logo & Brand Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-700 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 leading-tight">
                <span className="font-display font-black text-base text-slate-900">PrepLab</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                  HARITA
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Portal Pemantauan Lingkungan Laboratorium
              </p>
            </div>
          </div>

          {/* Right Action & Auditor Badge */}
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-teal-50 text-teal-900 border border-teal-200">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span>Akses Tamu &amp; Auditor (Read-Only)</span>
            </span>

            <Button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 shadow-2xs flex items-center gap-1.5"
              title="Perbarui Data Real-time"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-700 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Segarkan</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ----------------- SUB-HERO BANNER ----------------- */}
      <section className="bg-teal-900 text-white px-4 py-2.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-300 shrink-0" />
            <span className="font-semibold text-teal-50">
              Sistem Pengawasan Standar ASTM D3302 &bull; Suhu, Kelembaban, &amp; Gas Instrumen
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-teal-100">
            <span>Log Database:</span>
            <strong className="text-white bg-teal-800/80 px-2 py-0.5 rounded border border-teal-700">
              {rawRecords.length} Record
            </strong>
          </div>
        </div>
      </section>

      {/* ----------------- MAIN CONTENT CONTAINER ----------------- */}
      <main className="max-w-6xl mx-auto px-4 py-5 flex-1 w-full space-y-4">

        {/* SECTION 1: FILTER TIME RANGE (WEEK ISO & BULANAN) */}
        <Card className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Filter Dropdown */}
            <div className="flex-1 max-w-md">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-1 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-teal-700" />
                <span>Filter Rentang Waktu (ISO Week / Bulan):</span>
              </label>
              <select
                value={selectedPreset}
                onChange={e => applyPresetDates(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 cursor-pointer shadow-2xs"
              >
                <optgroup label="⚡ Filter Cepat Minggu ISO">
                  <option value="this_iso_week">⚡ Minggu ISO Ini (W{String(getISOWeek(new Date())).padStart(2, '0')})</option>
                  <option value="last_iso_week">⏮️ Minggu ISO Lalu (W{String(Math.max(1, getISOWeek(new Date()) - 1)).padStart(2, '0')})</option>
                </optgroup>

                <optgroup label="📅 Filter Cepat Bulanan">
                  <option value="this_month">📅 Bulan Ini ({MONTH_NAMES[new Date().getMonth()]} {new Date().getFullYear()})</option>
                  <option value="last_month">⏮️ Bulan Lalu</option>
                  <option value="all">🌐 Semua Riwayat Log (Tanpa Batas Tanggal)</option>
                </optgroup>

                <optgroup label="📋 Daftar Minggu ISO (Tahun Ini)">
                  {isoWeeksList.map(iw => (
                    <option key={iw.value} value={iw.value}>{iw.label}</option>
                  ))}
                </optgroup>

                <optgroup label="🗓️ Daftar Bulan (Tahun Ini)">
                  {monthsList.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Custom Date Pickers */}
            <div className="flex items-center gap-2">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Mulai:
                </label>
                <input
                  type="date"
                  value={tglMulai}
                  onChange={e => {
                    setTglMulai(e.target.value);
                    setSelectedPreset('custom');
                  }}
                  className="bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Selesai:
                </label>
                <input
                  type="date"
                  value={tglAkhir}
                  onChange={e => {
                    setTglAkhir(e.target.value);
                    setSelectedPreset('custom');
                  }}
                  className="bg-slate-50 border-2 border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                />
              </div>
            </div>

            {/* Status & PDF Export */}
            <div className="flex items-center gap-2 self-end md:self-end">
              {currentActivePdf ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    onClick={() => {
                      window.open(currentActivePdf.url, '_blank', 'noopener,noreferrer');
                      toast.success(`Membuka dokumen laporan PDF resmi...`);
                    }}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2 transition-all hover:scale-[1.02]"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Lihat Laporan PDF Resmi</span>
                  </Button>
                  <Button
                    onClick={() => handleExportPdf()}
                    disabled={isExportingPdf}
                    title="Buat ulang dokumen PDF terbaru dari database"
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1"
                  >
                    {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" /> : <RefreshCw className="w-3.5 h-3.5 text-slate-600" />}
                    <span className="hidden sm:inline text-[11px]">Buat Ulang</span>
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => handleExportPdf()}
                  disabled={isExportingPdf}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs flex items-center gap-2"
                >
                  {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                  <span>Buat Laporan PDF Resmi</span>
                </Button>
              )}
            </div>
          </div>

          {/* Active Period Status Pill */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-medium text-slate-600">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800">Periode Aktif:</span>
              <span className="bg-teal-50 text-teal-800 font-bold px-2.5 py-0.5 rounded-lg border border-teal-200">
                {periodDisplayLabel}
              </span>
            </div>
            <div>
              Ditemukan <strong className="text-teal-800 font-bold">{recordsToUse.length}</strong> catatan inspeksi
            </div>
          </div>
        </Card>

        {/* SECTION 2: OFFICIAL GENERATED PDF DOWNLOAD CARDS (JIKA ADA) */}
        {pdfLinks.length > 0 && (
          <Card className="p-4 rounded-2xl bg-rose-50/70 border-2 border-rose-200 shadow-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-rose-900 flex items-center gap-2">
                <FileDown className="w-4 h-4 text-rose-600" />
                <span>Dokumen PDF Resmi Berhasil Digenerate ({pdfLinks.length} File):</span>
              </h4>
              <span className="text-[11px] text-rose-700 font-semibold">Tersimpan di Google Drive Resmi</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pdfLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-white rounded-xl border border-rose-200 hover:border-rose-400 hover:shadow-xs transition-all text-xs font-bold text-slate-800"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileDown className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="truncate">{link.nama || link.name || `Download Laporan PDF (${idx + 1})`}</span>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                </a>
              ))}
            </div>
          </Card>
        )}

        {/* SECTION 3: AREA SELECTOR PILL BUTTONS (HIGH CONTRAST & READABLE) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <span>PILIH AREA PEMANTAUAN LABORATORIUM:</span>
            </h3>
            <span className="text-xs text-teal-700 font-bold">
              Sentuh ruangan untuk melihat data
            </span>
          </div>

          {/* Horizontal Area Pill Scroll with High Contrast */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            {AREA_LIST.map(area => {
              const isSelected = selectedArea === area.id;

              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => setSelectedArea(area.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer border-2 shadow-xs ${
                    isSelected
                      ? 'bg-teal-700 text-white border-teal-800 shadow-md ring-2 ring-teal-500/20'
                      : 'bg-white text-slate-800 border-slate-300 hover:border-teal-500 hover:text-teal-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base">{area.icon}</span>
                  <span className="font-extrabold tracking-tight">{area.shortName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: VIEW DETAIL OR MATRIX */}
        {loading ? (
          <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-700" />
            <p className="text-xs font-bold text-slate-600">Menyinkronkan data pemantauan laboratorium...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center bg-rose-50 rounded-2xl border-2 border-rose-300 text-rose-900 text-xs space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto text-rose-600" />
            <p className="font-bold">{error}</p>
            <Button onClick={fetchData} className="text-xs bg-rose-700 text-white font-bold">Coba Lagi</Button>
          </div>
        ) : selectedArea === 'all-matrix' ? (
          /* ----------------- ALL ROOMS SUMMARY MATRIX ----------------- */
          <div className="space-y-4 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                  <span>Matriks Kepatuhan Parameter Lingkungan</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-900 font-bold border border-teal-300">
                    Semua Ruangan
                  </span>
                </h2>
                <p className="text-xs text-slate-600 font-medium">
                  Ringkasan status seluruh ruangan laboratorium pada periode berjalan
                </p>
              </div>
            </div>

            {/* Matrix Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {allRoomsMatrix.map(item => (
                <Card 
                  key={item.id}
                  className="p-4 rounded-2xl border-2 border-slate-200 space-y-3 bg-white hover:border-teal-500 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => setSelectedArea(item.id)}
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{item.icon}</span>
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {item.name}
                      </h4>
                    </div>
                    {item.isCompliant ? (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Sesuai
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shrink-0">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> {item.statusDesc}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[11px] text-slate-600 uppercase font-bold tracking-wider">Suhu Aktual</div>
                      <div className="text-2xl font-black text-sky-800 font-display mt-0.5">
                        {item.latest?.suhu ? `${item.latest.suhu}°C` : '-'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold mt-1">{item.standardSuhu}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="text-[11px] text-slate-600 uppercase font-bold tracking-wider">Kelembaban RH</div>
                      <div className="text-2xl font-black text-emerald-800 font-display mt-0.5">
                        {item.latest?.kelembaban ? `${item.latest.kelembaban}%` : '-'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-semibold mt-1">{item.standardRH}</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 flex items-center justify-between pt-2 border-t border-slate-100 font-medium">
                    <span>
                      Petugas: <strong className="text-slate-800">{item.latest?.inspektorPetugas || '-'}</strong>
                    </span>
                    <span className="text-teal-700 font-bold flex items-center gap-1 hover:text-teal-900">
                      Detail <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : selectedArea === 'gas-station' ? (
          /* ----------------- CENTRAL GAS STATION: 1 PER SATU TABUNG GAS DENGAN 2 GRAFIK MANDIRI ----------------- */
          <div className="space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 font-display">
                  <span>Central Gas Station &bull; Inspeksi 3 Tabung Gas Mandiri</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                    Argon &amp; Helium
                  </span>
                </h2>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Pemantauan spesifik per tabung dilengkapi 2 grafik mandiri (Tekanan &amp; Flow Rate)
                </p>
              </div>

              {/* Sub-selector Filter Tabung Gas */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedGasCylinder('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    selectedGasCylinder === 'ALL'
                      ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  Semua 3 Tabung
                </button>
                {GAS_CYLINDERS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedGasCylinder(c.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      selectedGasCylinder === c.id
                        ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {c.shortName}
                  </button>
                ))}
              </div>
            </div>

            {/* DAFTAR TABUNG GAS 1 PER SATU */}
            <div className="space-y-8">
              {displayedCylinders.map((cyl) => {
                const rec = cyl.latest;
                const isLeaking = rec?.kebocoran === 'Y';

                return (
                  <div key={cyl.id} className="space-y-4 p-5 rounded-3xl bg-white border-2 border-slate-200 shadow-xs">
                    {/* Header Tabung */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold text-lg">
                          💨
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 font-display">
                              {cyl.name}
                            </h3>
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 ${
                              isLeaking 
                                ? 'bg-rose-100 text-rose-900 border-rose-300' 
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}>
                              {isLeaking ? <AlertTriangle className="w-3.5 h-3.5 text-rose-700" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                              {isLeaking ? 'Bocor (Perhatian)' : 'Aman (No Leak)'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            Gas: <strong className="text-slate-700">{cyl.gas}</strong> &bull; Peruntukan: <strong className="text-teal-700">{cyl.app}</strong> &bull; Total Log: <strong className="text-slate-800">{cyl.totalInspections} Catatan</strong>
                          </p>
                        </div>
                      </div>

                      {existingPdfsMap[cyl.name] ? (
                        <div className="flex items-center gap-1.5 self-start sm:self-center">
                          <Button
                            onClick={() => {
                              window.open(existingPdfsMap[cyl.name].url, '_blank', 'noopener,noreferrer');
                              toast.success(`Membuka laporan PDF resmi ${cyl.shortName}`);
                            }}
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Lihat PDF {cyl.shortName}</span>
                          </Button>
                          <Button
                            onClick={() => handleExportPdf(cyl.name)}
                            disabled={isExportingPdf}
                            title={`Buat ulang PDF ${cyl.shortName}`}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold p-1.5 rounded-xl border border-slate-300 shadow-2xs"
                          >
                            {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleExportPdf(cyl.name)}
                          disabled={isExportingPdf}
                          className="bg-slate-100 hover:bg-teal-50 text-teal-800 border border-teal-300 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 self-start sm:self-center shadow-2xs"
                        >
                          <FileDown className="w-3.5 h-3.5 text-teal-700" />
                          <span>Cetak PDF {cyl.shortName}</span>
                        </Button>
                      )}
                    </div>

                    {/* Metric Cards Tabung */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                        <div className="text-[11px] text-slate-600 uppercase font-bold tracking-wider">Tekanan Aktual</div>
                        <div className="text-2xl font-black text-sky-800 font-display mt-0.5">
                          {rec?.tekananGasPsi ? `${rec.tekananGasPsi} Bar` : '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold mt-1">Standar &gt; 30 Bar</div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                        <div className="text-[11px] text-slate-600 uppercase font-bold tracking-wider">Flow Rate Aktual</div>
                        <div className="text-2xl font-black text-emerald-800 font-display mt-0.5">
                          {rec?.flowGas ? `${rec.flowGas} L/m` : '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold mt-1">Regulator Normal</div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                        <div className="text-[11px] text-slate-600 uppercase font-bold tracking-wider">Waktu Terakhir</div>
                        <div className="text-sm font-bold text-slate-900 font-display mt-1">
                          {rec?.tanggal || '-'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-semibold mt-1">{rec?.shift || 'Pagi'} (Jam: {rec?.jam || '-'})</div>
                      </div>

                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                        <div className="text-[11px] text-slate-600 uppercase font-bold tracking-wider">Petugas Pemeriksa</div>
                        <div className="text-sm font-bold text-teal-900 font-display mt-1 truncate">
                          {rec?.inspektorPetugas || 'Petugas Lab'}
                        </div>
                        <div className="text-[11px] text-emerald-700 font-bold mt-1">Terverifikasi Database</div>
                      </div>
                    </div>

                    {/* DUA GRAFIK TERPISAH KHUSUS TABUNG INI */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
                      {/* Grafik Tekanan Tabung */}
                      {cyl.presChart && (
                        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                          <div className="border-b border-slate-200 pb-2">
                            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Gauge className="w-4 h-4 text-sky-700" />
                              <span>Grafik Tekanan {cyl.shortName} (Bar)</span>
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Tren tekanan gas operasional harian
                            </p>
                          </div>
                          <div className="h-60 w-full pt-1">
                            <Line
                              data={cyl.presChart}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'top' as const,
                                    labels: { boxWidth: 12, color: '#1e293b', font: { size: 11, weight: 'bold' } }
                                  }
                                },
                                scales: {
                                  y: {
                                    beginAtZero: false,
                                    title: { display: true, text: 'Tekanan (Bar)', color: '#0284c7', font: { weight: 'bold' } },
                                    grid: { color: 'rgba(0,0,0,0.06)' },
                                    ticks: { color: '#334155', font: { weight: 'bold' } }
                                  },
                                  x: { grid: { display: false }, ticks: { color: '#334155' } }
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Grafik Flow Rate Tabung */}
                      {cyl.flowChart && (
                        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                          <div className="border-b border-slate-200 pb-2">
                            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <Wind className="w-4 h-4 text-emerald-700" />
                              <span>Grafik Flow Rate {cyl.shortName} (L/min)</span>
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              Laju aliran gas menuju spektrometri laboratorium
                            </p>
                          </div>
                          <div className="h-60 w-full pt-1">
                            <Line
                              data={cyl.flowChart}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'top' as const,
                                    labels: { boxWidth: 12, color: '#1e293b', font: { size: 11, weight: 'bold' } }
                                  }
                                },
                                scales: {
                                  y: {
                                    beginAtZero: false,
                                    title: { display: true, text: 'Flow (L/min)', color: '#059669', font: { weight: 'bold' } },
                                    grid: { color: 'rgba(0,0,0,0.06)' },
                                    ticks: { color: '#334155', font: { weight: 'bold' } }
                                  },
                                  x: { grid: { display: false }, ticks: { color: '#334155' } }
                                }
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ----------------- SPECIFIC ROOM DETAIL VIEW ----------------- */
          <div className="space-y-5 animate-in fade-in">
            {/* Header Ruangan */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{currentArea.icon}</span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                    {currentArea.name}
                  </h2>
                  {currentAreaCompliance.isCompliant ? (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Memenuhi Syarat
                    </span>
                  ) : (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" /> {currentAreaCompliance.reason}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-1 flex items-center gap-1 font-medium">
                  <Info className="w-3.5 h-3.5 text-teal-700" />
                  <span>{currentArea.refText}</span>
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 font-medium">
                  Total Catatan Periode: <strong className="text-teal-800 font-bold">{selectedRoomRecords.length} Data</strong>
                </div>
                {currentArea.roomKey && (
                  existingPdfsMap[currentArea.roomKey] ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        onClick={() => {
                          window.open(existingPdfsMap[currentArea.roomKey!].url, '_blank', 'noopener,noreferrer');
                          toast.success(`Membuka laporan PDF resmi ${currentArea.shortName}`);
                        }}
                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Lihat PDF {currentArea.shortName}</span>
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleExportPdf(currentArea.roomKey)}
                        disabled={isExportingPdf}
                        title={`Buat ulang PDF ${currentArea.shortName}`}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-1.5 rounded-xl border border-slate-300 shadow-2xs"
                      >
                        {isExportingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-700" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleExportPdf(currentArea.roomKey)}
                      disabled={isExportingPdf}
                      className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-300 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs"
                    >
                      <FileDown className="w-3.5 h-3.5 text-teal-700" />
                      <span>Cetak PDF {currentArea.shortName}</span>
                    </Button>
                  )
                )}
              </div>
            </div>

            {/* Parameter Reading Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Card 1: Suhu */}
              <Card className="p-4 rounded-2xl border-2 border-slate-200 bg-white shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                  <span className="flex items-center gap-1.5">
                    <ThermometerSun className="w-4 h-4 text-sky-700" /> Suhu Ruangan
                  </span>
                  <span className="text-[10px] font-bold text-sky-900 bg-sky-100 px-2 py-0.5 rounded border border-sky-300">
                    Aktual
                  </span>
                </div>
                <div className="text-3xl font-black text-sky-800 font-display">
                  {latestAreaRecord?.suhu ? `${latestAreaRecord.suhu}°C` : '-'}
                </div>
                <div className="text-xs text-slate-600 pt-2 border-t border-slate-100 font-medium">
                  Batas Toleransi: <strong className="text-slate-900">{currentArea.standardSuhu}</strong>
                </div>
              </Card>

              {/* Card 2: Kelembaban */}
              <Card className="p-4 rounded-2xl border-2 border-slate-200 bg-white shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Wind className="w-4 h-4 text-emerald-700" /> Kelembaban (RH)
                  </span>
                  <span className="text-[10px] font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    Aktual
                  </span>
                </div>
                <div className="text-3xl font-black text-emerald-800 font-display">
                  {latestAreaRecord?.kelembaban ? `${latestAreaRecord.kelembaban}%` : '-'}
                </div>
                <div className="text-xs text-slate-600 pt-2 border-t border-slate-100 font-medium">
                  Batas Toleransi: <strong className="text-slate-900">{currentArea.standardRH}</strong>
                </div>
              </Card>

              {/* Card 3: Waktu Pengecekan */}
              <Card className="p-4 rounded-2xl border-2 border-slate-200 bg-white shadow-xs space-y-2">
                <div className="text-xs text-slate-600 font-bold flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-600" /> Waktu Inspeksi Shift
                </div>
                <div className="text-xl font-bold text-slate-900 font-display">
                  {latestAreaRecord ? `${latestAreaRecord.jam || '-'} (${latestAreaRecord.shift || '-'})` : '-'}
                </div>
                <div className="text-xs text-slate-600 pt-2 border-t border-slate-100 font-medium">
                  Tanggal: <strong className="text-slate-900">{latestAreaRecord?.tanggal || '-'}</strong>
                </div>
              </Card>

              {/* Card 4: Petugas & Verifikasi */}
              <Card className="p-4 rounded-2xl border-2 border-slate-200 bg-white shadow-xs space-y-2">
                <div className="text-xs text-slate-600 font-bold flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-teal-700" /> Petugas Pengawas
                </div>
                <div className="text-base font-bold text-teal-900 font-display truncate">
                  {latestAreaRecord?.inspektorPetugas || 'Petugas Laboratorium'}
                </div>
                <div className="text-xs text-emerald-800 font-bold pt-2 border-t border-slate-100 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Tervalidasi Database</span>
                </div>
              </Card>
            </div>

            {/* DUA GRAFIK TERPISAH: GRAFIK SUHU & GRAFIK KELEMBABAN RH DENGAN BATAS ATAS & BAWAH */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Grafik 1: Suhu (°C) */}
              {chartSuhuData && (
                <Card className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-white shadow-xs space-y-3">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                      <ThermometerSun className="w-4 h-4 text-sky-700" />
                      <span>Grafik Tren Suhu Ruangan (°C)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Suhu aktual dilengkapi garis batas atas &amp; batas bawah toleransi standar
                    </p>
                  </div>

                  <div className="h-64 sm:h-72 w-full pt-2">
                    <Line 
                      data={chartSuhuData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { 
                            position: 'top' as const, 
                            labels: { 
                              boxWidth: 14, 
                              color: '#1e293b',
                              font: { size: 11, weight: 'bold' } 
                            } 
                          },
                          tooltip: {
                            backgroundColor: '#0f172a',
                            titleColor: '#f8fafc',
                            bodyColor: '#cbd5e1',
                            borderColor: '#cbd5e1',
                            borderWidth: 1
                          }
                        },
                        scales: {
                          y: { 
                            beginAtZero: false, 
                            title: { display: true, text: 'Suhu (°C)', color: '#0284c7', font: { weight: 'bold' } },
                            grid: { color: 'rgba(0,0,0,0.06)' },
                            ticks: { color: '#334155', font: { weight: 'bold' } }
                          },
                          x: { 
                            grid: { display: false },
                            ticks: { color: '#334155', font: { weight: 'bold' } }
                          }
                        }
                      }} 
                    />
                  </div>
                </Card>
              )}

              {/* Grafik 2: Kelembaban RH (%) */}
              {chartRHData && (
                <Card className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-white shadow-xs space-y-3">
                  <div className="border-b border-slate-200 pb-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-display flex items-center gap-2">
                      <Wind className="w-4 h-4 text-emerald-700" />
                      <span>Grafik Tren Kelembaban RH (%)</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Kelembaban relatif aktual dilengkapi garis batas toleransi operasional
                    </p>
                  </div>

                  <div className="h-64 sm:h-72 w-full pt-2">
                    <Line 
                      data={chartRHData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { 
                            position: 'top' as const, 
                            labels: { 
                              boxWidth: 14, 
                              color: '#1e293b',
                              font: { size: 11, weight: 'bold' } 
                            } 
                          },
                          tooltip: {
                            backgroundColor: '#0f172a',
                            titleColor: '#f8fafc',
                            bodyColor: '#cbd5e1',
                            borderColor: '#cbd5e1',
                            borderWidth: 1
                          }
                        },
                        scales: {
                          y: { 
                            beginAtZero: false, 
                            title: { display: true, text: 'Kelembaban (%)', color: '#059669', font: { weight: 'bold' } },
                            grid: { color: 'rgba(0,0,0,0.06)' },
                            ticks: { color: '#334155', font: { weight: 'bold' } }
                          },
                          x: { 
                            grid: { display: false },
                            ticks: { color: '#334155', font: { weight: 'bold' } }
                          }
                        }
                      }} 
                    />
                  </div>
                </Card>
              )}
            </div>

            {/* TABEL LOG RIWAYAT INSPEKSI UNTUK AUDITOR */}
            <Card className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-teal-700" />
                    <span>Log Riwayat Pemeriksaan Terperinci ({selectedRoomRecords.length} Data)</span>
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Daftar kronologis pencatatan kondisi ruangan pada periode {periodDisplayLabel}
                  </p>
                </div>
              </div>

              {selectedRoomRecords.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-600 space-y-2">
                  <Info className="w-6 h-6 mx-auto text-slate-400" />
                  <p className="font-semibold">Tidak ada data catatan pemantauan pada rentang tanggal terpilih.</p>
                  <Button 
                    onClick={() => applyPresetDates('all')}
                    className="text-xs bg-teal-700 hover:bg-teal-800 text-white font-bold"
                  >
                    Tampilkan Semua Riwayat Data
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-800 font-extrabold border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-3">Tanggal &amp; Waktu</th>
                        <th className="py-3 px-3">Shift</th>
                        <th className="py-3 px-3 text-sky-800 font-bold">Suhu (°C)</th>
                        <th className="py-3 px-3 text-emerald-800 font-bold">Kelembaban (%)</th>
                        <th className="py-3 px-3">Status Kepatuhan</th>
                        <th className="py-3 px-3">Petugas Pengawas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedRoomRecords.map((r, i) => {
                        const sVal = parseFloat(r.suhu);
                        const kVal = parseFloat(r.kelembaban);
                        const range = ACCEPTABLE_RANGES[currentArea.roomKey || ''] || ACCEPTABLE_RANGES[currentArea.shortName || ''];
                        
                        let ok = true;
                        if (range) {
                          if (range.sLow != null && !isNaN(sVal) && sVal < range.sLow) ok = false;
                          if (range.sUp != null && !isNaN(sVal) && sVal > range.sUp) ok = false;
                          if (range.kLow != null && !isNaN(kVal) && kVal < range.kLow) ok = false;
                          if (range.kUp != null && !isNaN(kVal) && kVal > range.kUp) ok = false;
                        }

                        return (
                          <tr key={r.id || i} className="hover:bg-teal-50/40 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                              {r.tanggal} {r.jam ? `• ${r.jam}` : ''}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-200">
                                {r.shift || 'Pagi'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-sky-800 text-sm">
                              {r.suhu ? `${r.suhu}°C` : '-'}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-emerald-800 text-sm">
                              {r.kelembaban ? `${r.kelembaban}%` : '-'}
                            </td>
                            <td className="py-2.5 px-3">
                              {ok ? (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-700" /> Sesuai
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-amber-700" /> Out of Spec
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 font-semibold">
                              {r.inspektorPetugas || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>
        )}
      </main>

      {/* ----------------- GUEST FOOTER ----------------- */}
      <footer className="border-t border-slate-200 bg-white py-4 px-4 text-center text-xs text-slate-600 space-y-1 mt-6">
        <p className="font-bold text-slate-800">
          Laboratorium Preparasi Batubara &bull; PT Trimegah Bangun Persada (Harita Nickel)
        </p>
        <p className="text-[11px] text-slate-500">
          Sistem Terintegrasi Pemantauan K3 &bull; Akses Audit Tamu Terbuka &bull; Dokumen Rahasia Perusahaan Terproteksi
        </p>
      </footer>
    </div>
  );
};

export default GuestMonitoringScreen;
