import { toast } from 'sonner';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Card, Button, Input, Select } from './ui';
import { 
  getRekapanPemantauan, 
  buatPdfRekapan, 
  submitPemantauanBatch, 
  uploadPhotoToDrive, 
  updatePemantauanSignature,
  updatePemantauanRecord,
  deletePemantauanRecord
} from '../sheets-api';
import { 
  Loader2, FileDown, CalendarRange, ThermometerSun, Wind, Calendar,
  PlusCircle, AlertTriangle, CheckCircle2, XCircle, Clock, User, 
  FileText, X, ChevronRight, Filter, Sparkles, RefreshCw, AlertCircle, Edit3,
  Check, Info, Copy, ArrowRight, ArrowLeft, PenTool, Trash2, CheckSquare,
  Search, Database, Shield, QrCode
} from 'lucide-react';
import { GuestBarcodeModal } from './GuestBarcodeModal';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const RUANGAN_SUHU = ["Balance Room", "XRF Room", "Chiller Room", "Fusion Room", "Chemical Room"];
const TABUNG_GAS = ["Tabung Gas Zetium A (Argon)", "Tabung Gas Zetium B (Argon)", "Tabung Gas Epsilon C (Helium)"];

export const ACCEPTABLE_RANGES: Record<string, { sLow?: number | null; sUp?: number | null; kLow?: number | null; kUp?: number | null; refText: string }> = {
  'Balance Room': { sLow: 10, sUp: 30, kLow: 15, kUp: 80, refText: '10°C - 30°C (RH 15-80%) • Ref: Pioneer Balance EN-8' },
  'R. Timbang': { sLow: 10, sUp: 30, kLow: 15, kUp: 80, refText: '10°C - 30°C (RH 15-80%) • Ref: Pioneer Balance EN-8' },
  'XRF Room': { sLow: 5, sUp: 35, kLow: 20, kUp: 80, refText: '5°C - 35°C (RH 20-80%) • Ref: Epsilon 4 Spec hal. 2' },
  'R. XRF': { sLow: 5, sUp: 35, kLow: 20, kUp: 80, refText: '5°C - 35°C (RH 20-80%) • Ref: Epsilon 4 Spec hal. 2' },
  'Chiller Room': { sLow: 10, sUp: 42, kLow: null, kUp: null, refText: '10°C - 42°C • Ref: Sigma-C 9 hal. 1/2' },
  'R. Chiller': { sLow: 10, sUp: 42, kLow: null, kUp: null, refText: '10°C - 42°C • Ref: Sigma-C 9 hal. 1/2' },
  'Chemical Room': { sLow: null, sUp: 25, kLow: null, kUp: null, refText: '≤ 25°C • Ref: SDS Alkohol 70% hal. 3/7' },
  'R. Chemical': { sLow: null, sUp: 25, kLow: null, kUp: null, refText: '≤ 25°C • Ref: SDS Alkohol 70% hal. 3/7' },
  'Fusion Room': { sLow: 5, sUp: 40, kLow: null, kUp: null, refText: '5°C - 40°C • Ref: Oven Memmert UNb hal. 7/27' },
  'R. Fusion': { sLow: 5, sUp: 40, kLow: null, kUp: null, refText: '5°C - 40°C • Ref: Oven Memmert UNb hal. 7/27' },
};

/**
 * Menghitung jadwal shift (Shift A vs Shift B) berdasarkan relasi minggu ISO ganjil/genap
 * Rotasi mingguan sesuai siklus ISO Week:
 * - Week Genap (e.g. W40, minggu berjalan s.d 04 Okt 2026): Pagi = Shift A, Malam = Shift B
 * - Week Ganjil (e.g. W41, minggu berikutnya mulai 05 Okt 2026): Pagi = Shift B, Malam = Shift A
 */
export function getRosterShiftForDate(dateStr: string): { pagi: 'Shift A' | 'Shift B'; malam: 'Shift A' | 'Shift B' } {
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d, 12, 0, 0);
  const isoWeek = getISOWeek(targetDate);
  const isEvenWeek = isoWeek % 2 === 0;

  // Di week genap: Pagi = Shift A, Malam = Shift B
  // Di week ganjil: Pagi = Shift B, Malam = Shift A
  const pagi = isEvenWeek ? 'Shift A' : 'Shift B';
  const malam = isEvenWeek ? 'Shift B' : 'Shift A';
  return { pagi, malam };
}

interface DateStatusItem {
  dateStr: string; // YYYY-MM-DD
  formattedDate: string; // e.g. "Kamis, 01 Okt 2026"
  dayName: string;
  hasSuhu: boolean;
  hasGas: boolean; // true if gas has 2 shifts or Long-Shift
  hasGasPartial: boolean; // true if gas only has 1 shift
  gasShiftCount: number;
  gasShifts: string[];
  isComplete: boolean;
  statusType: 'KOSONG_TOTAL' | 'SUHU_KOSONG' | 'GAS_KOSONG' | 'LENGKAP';
  statusShift: string; // e.g. 'Shift B belum mengisi (Malam)' | 'Shift A belum mengisi (Pagi)' | 'Lengkap'
  statusShiftType: 'LENGKAP' | 'PAGI_BELUM' | 'MALAM_BELUM' | 'SEMUA_BELUM';
  petugas: string[];
  shifts: string[];
  suhuCount: number;
  gasCount: number;
  totalRecords: number;
  hasSignature: boolean;
  isSignatureMissing: boolean;
}

export function MonitoringDashboard({ 
  inspectorNik, 
  inspectorName,
  isDeveloper 
}: { 
  inspectorNik?: string; 
  inspectorName?: string; 
  isDeveloper?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [generatingTarget, setGeneratingTarget] = useState<string>('');
  const [selectedGasOption, setSelectedGasOption] = useState<string>('ALL');
  const [selectedSuhuOption, setSelectedSuhuOption] = useState<string>('ALL');
  const [dataSuhu, setDataSuhu] = useState<Record<string, any>>({});
  const [dataGas, setDataGas] = useState<Record<string, any>>({});
  const [rawRecords, setRawRecords] = useState<any[]>([]);
  const [pdfLinks, setPdfLinks] = useState<any[]>([]);
  const [showGuestQrModal, setShowGuestQrModal] = useState<boolean>(false);

  // Verifikasi akun dev: tabel DB dan fitur edit DB langsung hanya muncul jika akun adalah dev
  const isDev = Boolean(
    isDeveloper ||
    inspectorNik === '02D25000055' ||
    inspectorNik === '02D24000043' ||
    inspectorNik === '04D21001047' ||
    inspectorNik === '04D24000042' ||
    inspectorNik === 'M0403240177' ||
    inspectorNik === 'preplabadmin' ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('p2h_is_developer') === 'true' ||
      sessionStorage.getItem('p2h_is_developer') === 'true'
    ))
  );

  // Edit DB Record Modal state (Khusus Dev)
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);

  // Default dates
  const td = new Date();
  const defEnd = td.toISOString().split('T')[0];
  const tm = new Date();
  tm.setDate(td.getDate() - 30);
  const defStart = tm.toISOString().split('T')[0];

  const [tglMulai, setTglMulai] = useState(defStart);
  const [tglAkhir, setTglAkhir] = useState(defEnd);
  const [selectedIsoWeek, setSelectedIsoWeek] = useState<string>('');

  // Missing dates filter state
  const [missingFilterTab, setMissingFilterTab] = useState<'all_missing' | 'kosong_total' | 'suhu_kosong' | 'gas_kosong' | 'ttd_kurang' | 'all'>('all_missing');

  // Raw Database Records Viewer state
  const [rawSearchQuery, setRawSearchQuery] = useState('');
  const [rawCategoryFilter, setRawCategoryFilter] = useState<'ALL' | 'GAS' | 'SUHU'>('ALL');
  const [showRawTable, setShowRawTable] = useState(true);

  // Manual Input Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTanggal, setModalTanggal] = useState('');
  const [modalJam, setModalJam] = useState('08:00');
  const [modalShift, setModalShift] = useState('Pagi');
  const [modalPetugas, setModalPetugas] = useState('');
  const [modalCatatan, setModalCatatan] = useState('');
  const [modalMode, setModalMode] = useState<'BOTH' | 'SUHU' | 'GAS'>('BOTH');
  const [modalForceOverwrite, setModalForceOverwrite] = useState(false);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const [modalSuhuData, setModalSuhuData] = useState<Record<string, { suhu: string; kel: string }>>({});
  const [modalGasData, setModalGasData] = useState<Record<string, { flow: string; pressure: string; leak: 'Y' | 'N'; catatan: string }>>({});

  // Signature Pad Ref for manual input modal
  const manualSigPadRef = useRef<SignatureCanvas>(null);

  // Dedicated Backfill Signature Modal state
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [sigModalDate, setSigModalDate] = useState('');
  const [sigModalPetugas, setSigModalPetugas] = useState('');
  const [sigModalApplyAll, setSigModalApplyAll] = useState(true);
  const [sigModalSubmitting, setSigModalSubmitting] = useState(false);
  const dedicatedSigPadRef = useRef<SignatureCanvas>(null);

  const defaultPetugasName = useMemo(() => {
    return inspectorName || localStorage.getItem('inspectorName') || 'Personil Lab';
  }, [inspectorName]);

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

  const nowRef = useMemo(() => new Date(), []);
  const currMonthName = MONTH_NAMES[nowRef.getMonth()];
  const currYear = nowRef.getFullYear();

  const lastMonthDate = useMemo(() => new Date(nowRef.getFullYear(), nowRef.getMonth() - 1, 1), [nowRef]);
  const lastMonthName = MONTH_NAMES[lastMonthDate.getMonth()];
  const lastMonthYear = lastMonthDate.getFullYear();

  const handleAutoFilterSelect = (val: string) => {
    setSelectedIsoWeek(val);
    if (!val) return;

    let start = '';
    let end = '';

    const formatDateYMD = (d: Date) => {
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    };

    if (val === 'this_month') {
      const now = new Date();
      start = formatDateYMD(new Date(now.getFullYear(), now.getMonth(), 1));
      end = formatDateYMD(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    } else if (val === 'last_month') {
      const now = new Date();
      start = formatDateYMD(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      end = formatDateYMD(new Date(now.getFullYear(), now.getMonth(), 0));
    } else if (val.startsWith('month_')) {
      const parts = val.split('_');
      const targetYear = parseInt(parts[1], 10);
      const targetMonth = parseInt(parts[2], 10);
      if (!isNaN(targetYear) && !isNaN(targetMonth)) {
        start = formatDateYMD(new Date(targetYear, targetMonth - 1, 1));
        end = formatDateYMD(new Date(targetYear, targetMonth, 0));
      }
    } else if (val === 'this_iso_week') {
      const now = new Date();
      const range = getISOWeekRange(now.getFullYear(), getISOWeek(now));
      start = formatDateYMD(range.start);
      end = formatDateYMD(range.end);
    } else if (val === 'last_iso_week') {
      const now = new Date();
      const lastWeek = Math.max(1, getISOWeek(now) - 1);
      const range = getISOWeekRange(now.getFullYear(), lastWeek);
      start = formatDateYMD(range.start);
      end = formatDateYMD(range.end);
    } else if (val.startsWith('iso_')) {
      const parts = val.split('_');
      const targetYear = parseInt(parts[1], 10);
      const targetWeek = parseInt(parts[2], 10);
      if (!isNaN(targetYear) && !isNaN(targetWeek)) {
        const range = getISOWeekRange(targetYear, targetWeek);
        start = formatDateYMD(range.start);
        end = formatDateYMD(range.end);
      }
    }

    if (start && end) {
      setTglMulai(start);
      setTglAkhir(end);
      handleFilter(start, end);
    }
  };

  const normalizeDateStr = (row: any): string => {
    let val = row.tanggal || row.date || row.timestamp;
    if (!val) return '';
    let dateStr = '';
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      dateStr = val.substring(0, 10);
    } else if (typeof val === 'string' && /^\d{5}$/.test(val)) {
      const d = new Date(Math.round((parseInt(val, 10) - 25569) * 86400 * 1000));
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dateStr = `${yy}-${mm}-${dd}`;
    } else if (typeof val === 'number' && val > 40000 && val < 50000) {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dateStr = `${yy}-${mm}-${dd}`;
    } else {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        }
      } catch (e) {}
    }
    if (!dateStr) return '';

    // Logika Cut-Off Jam 06:00 Pagi:
    // Jika record tercatat dengan jam dini hari (00:01 s/d 05:59) pada Shift Malam,
    // dan tanggalnya belum disesuaikan ke hari operasional (sama dengan tanggal timestamp pembuatan),
    // maka masuk ke Shift Malam hari operasional kemarin (H-1).
    if (row.jam && typeof row.jam === 'string' && row.jam.trim() !== '0:00' && row.jam.trim() !== '00:00') {
      const m = row.jam.trim().match(/^(\d{1,2}):(\d{1,2})/);
      if (m) {
        const hr = parseInt(m[1], 10);
        const sLower = String(row.shift || '').toLowerCase();
        const isNight = sLower.includes('malam') || sLower.includes('ns') || sLower === '3';
        if (hr < 6 && isNight) {
          let shouldShift = true;
          if (row.timestamp) {
            const tsDate = new Date(row.timestamp);
            if (!isNaN(tsDate.getTime())) {
              const witTs = new Date(tsDate.getTime() + 9 * 3600 * 1000);
              const tsYMD = witTs.toISOString().substring(0, 10);
              if (dateStr !== tsYMD) {
                shouldShift = false;
              }
            }
          }
          if (shouldShift) {
            const [y, mm, dd] = dateStr.split('-').map(Number);
            const prev = new Date(y, mm - 1, dd - 1, 12, 0, 0);
            const py = prev.getFullYear();
            const pm = String(prev.getMonth() + 1).padStart(2, '0');
            const pd = String(prev.getDate()).padStart(2, '0');
            return `${py}-${pm}-${pd}`;
          }
        }
      }
    }

    return dateStr;
  };

  const handleFilter = async (customStart?: string, customEnd?: string) => {
    setLoading(true);
    setPdfLinks([]);
    try {
      const activeStart = (typeof customStart === 'string' && customStart) ? customStart : tglMulai;
      const activeEnd = (typeof customEnd === 'string' && customEnd) ? customEnd : tglAkhir;
      const resp = await getRekapanPemantauan(activeStart, activeEnd);
      const safeResp = Array.isArray(resp) ? resp : [];
      setRawRecords(safeResp);

      const parsedSuhu: any = {};
      const parsedGas: any = {};

      const parseDateTimeForSort = (row: any) => {
        let tglValue = row.tanggal || row.date || row.timestamp;
        let datePart = '';
        if (typeof tglValue === 'string' && /^\d{5}$/.test(tglValue)) {
            const d = new Date(Math.round((parseInt(tglValue) - 25569) * 86400 * 1000));
            datePart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else if (typeof tglValue === 'number' && tglValue > 40000 && tglValue < 50000) {
            const d = new Date(Math.round((tglValue - 25569) * 86400 * 1000));
            datePart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        } else if (typeof tglValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(tglValue)) {
            datePart = tglValue.substring(0, 10);
        } else {
            const d = new Date(tglValue);
            if (!isNaN(d.getTime())) {
              datePart = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
        }

        const shiftStr = String(row.shift || '').toLowerCase();
        let shiftPriority = 2; // default
        if (shiftStr.includes('pagi') || shiftStr.includes('ds') || shiftStr === '1') shiftPriority = 1;
        else if (shiftStr.includes('siang') || shiftStr === '2') shiftPriority = 2;
        else if (shiftStr.includes('malam') || shiftStr.includes('ns') || shiftStr === '3') shiftPriority = 3;

        let hour = 12;
        let minute = 0;
        if (row.jam && typeof row.jam === 'string') {
          const match = row.jam.trim().match(/^(\d{1,2}):(\d{1,2})/);
          if (match) {
            hour = parseInt(match[1], 10);
            minute = parseInt(match[2], 10);
          }
        } else if (shiftPriority === 1) {
          hour = 7;
        } else if (shiftPriority === 3) {
          hour = 19;
        }

        // Shift Malam dini hari (00:00 - 05:59) terjadi setelah shift malam petang (18:00 - 23:59)
        let effectiveHour = hour;
        if (shiftPriority === 3 && hour < 6) {
          effectiveHour = hour + 24;
        }

        const dateObj = new Date(`${datePart || '2000-01-01'}T${String(effectiveHour % 24).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
        let timeMs = isNaN(dateObj.getTime()) ? 0 : dateObj.getTime();
        if (effectiveHour >= 24) {
          timeMs += 24 * 3600 * 1000;
        }
        return { timeMs, shiftPriority, id: Number(row.id) || 0 };
      };

      const sortedResp = [...safeResp].sort((a: any, b: any) => {
        const aInfo = parseDateTimeForSort(a);
        const bInfo = parseDateTimeForSort(b);
        if (aInfo.timeMs !== bInfo.timeMs) {
          return aInfo.timeMs - bInfo.timeMs;
        }
        if (aInfo.shiftPriority !== bInfo.shiftPriority) {
          return aInfo.shiftPriority - bInfo.shiftPriority;
        }
        return aInfo.id - bInfo.id;
      });

      const parseVal = (v: any) => (v === '-' || !v) ? null : parseFloat(v);
      sortedResp.forEach((row: any) => {
        let tglValue = row.tanggal || row.date || row.timestamp;
        
        // Handle Excel date format (e.g. "45432" or 45432)
        if (typeof tglValue === 'string' && /^\d{5}$/.test(tglValue)) {
            tglValue = new Date(Math.round((parseInt(tglValue) - 25569) * 86400 * 1000));
        } else if (typeof tglValue === 'number' && tglValue > 40000 && tglValue < 50000) {
            tglValue = new Date(Math.round((tglValue - 25569) * 86400 * 1000));
        }

        const dObjDate = new Date(tglValue);
        const tMulaiFilter = new Date(activeStart);
        const tAkhirFilter = new Date(activeEnd);
        tAkhirFilter.setHours(23,59,59,999);
        if (dObjDate < tMulaiFilter || dObjDate > tAkhirFilter) return;
        const dObj = new Date(tglValue);
        const dayStr = dObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        const lok = row.lokasiArea || row.lokasi;
        const jamFormatted = row.jam ? String(row.jam).trim() : '';
        const shiftName = row.shift ? String(row.shift).trim() : '';
        const shiftPart = shiftName ? (jamFormatted ? `${jamFormatted} ${shiftName}` : shiftName) : (jamFormatted || '');
        const displayLabel = shiftPart ? `${dayStr} (${shiftPart})` : dayStr;

        const pointMeta = {
          id: row.id,
          idPemantauan: row.idPemantauan || '-',
          tanggal: row.tanggal || (typeof tglValue === 'string' ? tglValue.substring(0, 10) : ''),
          jam: row.jam || '-',
          shift: row.shift || '-',
          petugas: row.inspektorPetugas || '-',
          catatan: row.catatanRemark || '-',
          timestamp: row.timestamp || null,
          lokasi: lok
        };

        if (row.kategori === 'SUHU') {
          if (!parsedSuhu[lok]) parsedSuhu[lok] = { labels: [], suhu: [], kelembapan: [], sUp: [], sLow: [], kUp: [], kLow: [], meta: [] };
          parsedSuhu[lok].labels.push(displayLabel);
          parsedSuhu[lok].suhu.push(parseVal(row.suhuCelcius || row.suhu));
          parsedSuhu[lok].kelembapan.push(parseVal(row.kelembapanPersen || row.kelembapan));
          parsedSuhu[lok].meta.push(pointMeta);
          
          const std: any = ACCEPTABLE_RANGES[lok] || {};
          const sUpVal = parseVal(row.suhuUpper) ?? (typeof std.sUp === 'number' ? std.sUp : null);
          const sLowVal = parseVal(row.suhuLower) ?? (typeof std.sLow === 'number' ? std.sLow : null);
          const kUpVal = parseVal(row.kelembapanUpper) ?? (typeof std.kUp === 'number' ? std.kUp : null);
          const kLowVal = parseVal(row.kelembapanLower) ?? (typeof std.kLow === 'number' ? std.kLow : null);

          parsedSuhu[lok].sUp.push(sUpVal);
          parsedSuhu[lok].sLow.push(sLowVal);
          parsedSuhu[lok].kUp.push(kUpVal);
          parsedSuhu[lok].kLow.push(kLowVal);
        } else if (row.kategori === 'GAS') {
          if (!parsedGas[lok]) parsedGas[lok] = { labels: [], flow: [], pressure: [], meta: [] };
          parsedGas[lok].labels.push(displayLabel);
          parsedGas[lok].flow.push(parseVal(row.flowGas || row.flow));
          parsedGas[lok].pressure.push(parseVal(row.tekananGasPsi || row.tekananGas));
          parsedGas[lok].meta.push(pointMeta);
        }
      });

      setDataSuhu(parsedSuhu);
      setDataGas(parsedGas);
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat rekap pemantauan');
    }
    setLoading(false);
  };

  useEffect(() => {
    handleFilter();
  }, []);

  const getActivePeriodLabel = () => {
    if (selectedIsoWeek === 'this_month') {
      return `${currMonthName}_${currYear}`;
    }
    if (selectedIsoWeek === 'last_month') {
      return `${lastMonthName}_${lastMonthYear}`;
    }
    if (selectedIsoWeek.startsWith('month_')) {
      const parts = selectedIsoWeek.split('_');
      const targetYear = parseInt(parts[1], 10);
      const targetMonth = parseInt(parts[2], 10);
      if (!isNaN(targetYear) && !isNaN(targetMonth)) {
        return `${MONTH_NAMES[targetMonth - 1]}_${targetYear}`;
      }
    }
    if (selectedIsoWeek === 'this_iso_week') {
      return `Minggu_ISO_W${String(getISOWeek(new Date())).padStart(2, '0')}_${new Date().getFullYear()}`;
    }
    if (selectedIsoWeek === 'last_iso_week') {
      const lastWeek = Math.max(1, getISOWeek(new Date()) - 1);
      return `Minggu_ISO_W${String(lastWeek).padStart(2, '0')}_${new Date().getFullYear()}`;
    }
    if (selectedIsoWeek.startsWith('iso_')) {
      const parts = selectedIsoWeek.split('_');
      return `Minggu_ISO_W${String(parts[2]).padStart(2, '0')}_${parts[1]}`;
    }
    if (tglMulai && tglAkhir) {
      const [sY, sM, sD] = tglMulai.split('-').map(Number);
      const [eY, eM, eD] = tglAkhir.split('-').map(Number);
      if (sY === eY && sM === eM && sD === 1) {
        const lastDayOfM = new Date(sY, sM, 0).getDate();
        if (eD === lastDayOfM) {
          return `${MONTH_NAMES[sM - 1]}_${sY}`;
        }
      }
      return `${tglMulai}_sd_${tglAkhir}`;
    }
    return '';
  };

  const generatePDF = async (tipe: string, targetLokasi?: string) => {
    setGeneratingPdf(true);
    const locName = targetLokasi && targetLokasi !== 'ALL' ? targetLokasi : '';
    setGeneratingTarget(locName ? `${tipe} ${locName}` : tipe);
    try {
      const periodLabel = getActivePeriodLabel();
      const res = await buatPdfRekapan(tglMulai, tglAkhir, tipe, periodLabel, locName || undefined);
      if (res.status === 'error') {
        toast.error(res.message || `Tidak ada data ${tipe}${locName ? ' (' + locName + ')' : ''} pada rentang waktu tersebut.`);
      } else {
        setPdfLinks(res.links || []);
        const targetDesc = locName ? locName : `Semua ${tipe}`;
        toast.success(`PDF ${targetDesc} (${periodLabel.replace(/_/g, ' ') || 'Periode Terpilih'}) berhasil dibuat! Silakan cek daftar link di bawah.`);
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal membuat PDF');
    }
    setGeneratingPdf(false);
    setGeneratingTarget('');
  };

  // Generate range of dates YYYY-MM-DD capped at today
  const datesInRange = useMemo(() => {
    const dates: string[] = [];
    if (!tglMulai || !tglAkhir) return dates;

    const today = new Date();
    const yyyyToday = today.getFullYear();
    const mmToday = String(today.getMonth() + 1).padStart(2, '0');
    const ddToday = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyyToday}-${mmToday}-${ddToday}`;

    // Capping at today so future days are not falsely marked as missing
    const effectiveEndStr = tglAkhir > todayStr ? todayStr : tglAkhir;

    const [sY, sM, sD] = tglMulai.split('-').map(Number);
    const [eY, eM, eD] = effectiveEndStr.split('-').map(Number);

    if (isNaN(sY) || isNaN(eY)) return dates;

    const curr = new Date(sY, sM - 1, sD, 12, 0, 0);
    const end = new Date(eY, eM - 1, eD, 12, 0, 0);

    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  }, [tglMulai, tglAkhir]);

  // Index raw records by normalized YYYY-MM-DD
  const recordsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    rawRecords.forEach(r => {
      const d = normalizeDateStr(r);
      if (!d) return;
      if (!map[d]) map[d] = [];
      map[d].push(r);
    });
    return map;
  }, [rawRecords]);

  // Build analysis for each date in range
  const dateStatuses = useMemo(() => {
    const dates = [...datesInRange].reverse(); // Latest date first

    return dates.map((dStr): DateStatusItem => {
      const rows = recordsByDate[dStr] || [];
      const suhuRows = rows.filter(r => r.kategori === 'SUHU');
      const gasRows = rows.filter(r => r.kategori === 'GAS');
      // Suhu hanya dicek 1x per hari
      const hasSuhu = suhuRows.length > 0;

      // Evaluasi shift gas: pemeriksaan gas wajib mencakup 2 shift per hari (Pagi & Malam),
      // KECUALI jika ada Long-Shift / LS, maka tidak perlu ada pengecekan shift malam
      const gasShiftSet = new Set<string>();
      gasRows.forEach(r => {
        const s = String(r.shift || '').trim();
        if (s) gasShiftSet.add(s);
      });
      const gasShifts = Array.from(gasShiftSet);
      
      const allShifts = rows.map(r => String(r.shift || '').trim().toLowerCase());
      const hasLongShift = gasShifts.some(s => {
        const l = s.toLowerCase();
        return l.includes('long') || l === 'ls';
      }) || allShifts.some(s => s.includes('long') || s === 'ls');

      // Cek kelengkapan shift pagi dan malam untuk gas
      const hasShiftPagi = gasShifts.some(s => {
        const l = s.toLowerCase();
        return l.includes('pagi') || l.includes('ds') || l === '1';
      });
      const hasShiftMalam = gasShifts.some(s => {
        const l = s.toLowerCase();
        return l.includes('malam') || l.includes('ns') || l === '2' || l === '3';
      });

      // Roster shift (Shift A / Shift B) berdasarkan rotasi mingguan week ISO
      const roster = getRosterShiftForDate(dStr);

      let statusShift = 'Lengkap';
      let statusShiftType: 'LENGKAP' | 'PAGI_BELUM' | 'MALAM_BELUM' | 'SEMUA_BELUM' = 'LENGKAP';

      if (hasLongShift) {
        statusShift = 'Lengkap (Long-Shift)';
        statusShiftType = 'LENGKAP';
      } else if (!hasShiftPagi && !hasShiftMalam) {
        statusShift = `${roster.pagi} (Pagi) & ${roster.malam} (Malam) belum mengisi`;
        statusShiftType = 'SEMUA_BELUM';
      } else if (!hasShiftPagi && hasShiftMalam) {
        statusShift = `${roster.pagi} belum mengisi (Pagi)`;
        statusShiftType = 'PAGI_BELUM';
      } else if (hasShiftPagi && !hasShiftMalam) {
        statusShift = `${roster.malam} belum mengisi (Malam)`;
        statusShiftType = 'MALAM_BELUM';
      } else {
        statusShift = 'Lengkap';
        statusShiftType = 'LENGKAP';
      }

      // Jika Long-Shift, tidak perlu ada pengecekan shift malam (cukup 1x inspeksi Long-Shift)
      const hasGasComplete = (gasRows.length > 0 && hasLongShift) || gasShiftSet.size >= 2;
      const gasShiftCount = hasLongShift ? 2 : gasShiftSet.size;
      const hasGasPartial = gasRows.length > 0 && !hasGasComplete;
      const hasGas = hasGasComplete;

      let statusType: 'KOSONG_TOTAL' | 'SUHU_KOSONG' | 'GAS_KOSONG' | 'LENGKAP' = 'LENGKAP';
      if (!hasSuhu && gasRows.length === 0) statusType = 'KOSONG_TOTAL';
      else if (!hasSuhu && gasRows.length > 0) statusType = 'SUHU_KOSONG';
      else if (hasSuhu && !hasGasComplete) statusType = 'GAS_KOSONG';

      const [y, m, d] = dStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d, 12, 0, 0);
      const formattedDate = dt.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const dayName = dt.toLocaleDateString('id-ID', { weekday: 'long' });

      const petugasSet = new Set<string>();
      const shiftSet = new Set<string>();
      rows.forEach(r => {
        if (r.inspektorPetugas) petugasSet.add(r.inspektorPetugas);
        if (r.shift) shiftSet.add(r.shift);
      });

      const rowsWithSig = rows.filter(r => Boolean(r.ttd || r.foto));
      const hasSignature = rows.length > 0 && rowsWithSig.length === rows.length;
      const isSignatureMissing = rows.length > 0 && rowsWithSig.length < rows.length;

      return {
        dateStr: dStr,
        formattedDate,
        dayName,
        hasSuhu,
        hasGas,
        hasGasPartial,
        gasShiftCount,
        gasShifts,
        isComplete: hasSuhu && hasGasComplete,
        statusType,
        statusShift,
        statusShiftType,
        petugas: Array.from(petugasSet),
        shifts: Array.from(shiftSet),
        suhuCount: suhuRows.length,
        gasCount: gasRows.length,
        totalRecords: rows.length,
        hasSignature,
        isSignatureMissing
      };
    });
  }, [datesInRange, recordsByDate]);

  // Summary counts
  const totalDays = dateStatuses.length;
  const completeDays = dateStatuses.filter(d => d.isComplete).length;
  const missingDays = dateStatuses.filter(d => !d.isComplete).length;
  const kosongTotalDays = dateStatuses.filter(d => d.statusType === 'KOSONG_TOTAL').length;
  const suhuKosongDays = dateStatuses.filter(d => d.statusType === 'SUHU_KOSONG').length;
  const gasKosongDays = dateStatuses.filter(d => !d.hasGas).length;
  const missingSignatureDays = dateStatuses.filter(d => d.isSignatureMissing).length;

  // Filtered date list based on selected tab
  const filteredDateStatuses = useMemo(() => {
    switch (missingFilterTab) {
      case 'all_missing':
        return dateStatuses.filter(d => !d.isComplete);
      case 'kosong_total':
        return dateStatuses.filter(d => d.statusType === 'KOSONG_TOTAL');
      case 'suhu_kosong':
        return dateStatuses.filter(d => d.statusType === 'SUHU_KOSONG');
      case 'gas_kosong':
        return dateStatuses.filter(d => !d.hasGas);
      case 'ttd_kurang':
        return dateStatuses.filter(d => d.isSignatureMissing);
      case 'all':
      default:
        return dateStatuses;
    }
  }, [dateStatuses, missingFilterTab]);

  // Filtered raw database records for table viewer
  const filteredRawRecords = useMemo(() => {
    return rawRecords.filter(r => {
      // 1. Date range filter
      let tgl = r.tanggal || r.date;
      if (typeof tgl === 'string' && /^\d{4}-\d{2}-\d{2}/.test(tgl)) {
        tgl = tgl.substring(0, 10);
      }
      if (tgl && tglMulai && tglAkhir) {
        if (tgl < tglMulai || tgl > tglAkhir) return false;
      }
      // 2. Category filter
      if (rawCategoryFilter !== 'ALL' && r.kategori !== rawCategoryFilter) return false;
      // 3. Search query
      if (!rawSearchQuery.trim()) return true;
      const q = rawSearchQuery.toLowerCase().trim();
      const matchId = String(r.id || '').includes(q) || String(r.idPemantauan || '').toLowerCase().includes(q);
      const matchTgl = String(r.tanggal || '').toLowerCase().includes(q);
      const matchJam = String(r.jam || '').toLowerCase().includes(q);
      const matchShift = String(r.shift || '').toLowerCase().includes(q);
      const matchLokasi = String(r.lokasiArea || r.lokasi || '').toLowerCase().includes(q);
      const matchPetugas = String(r.inspektorPetugas || '').toLowerCase().includes(q);
      return matchId || matchTgl || matchJam || matchShift || matchLokasi || matchPetugas;
    });
  }, [rawRecords, tglMulai, tglAkhir, rawCategoryFilter, rawSearchQuery]);

  const createChartTooltipOptions = (metaList: any[], yTitle?: string) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 12,
          font: { size: 11, weight: 'bold' as const },
          color: '#334155'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleFont: { size: 12, weight: 'bold' as const },
        bodyFont: { size: 11 },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          title: (items: any) => {
            const idx = items[0]?.dataIndex;
            const m = metaList?.[idx];
            if (m) {
              return `📅 ${m.tanggal} • ${m.shift} (Jam: ${m.jam})`;
            }
            return items[0]?.label || '';
          },
          afterBody: (items: any) => {
            const idx = items[0]?.dataIndex;
            const m = metaList?.[idx];
            if (!m) return [];
            const lines = [
              `👤 Petugas: ${m.petugas}`,
              `🆔 ID Database: #${m.id} (${m.idPemantauan || '-'})`
            ];
            if (m.timestamp) {
              try {
                const dt = new Date(m.timestamp);
                if (!isNaN(dt.getTime())) {
                  const wit = new Date(dt.getTime() + 9 * 3600 * 1000);
                  const timeStr = wit.toISOString().replace('T', ' ').substring(0, 19) + ' WIT';
                  lines.push(`⏱️ Waktu Input Real: ${timeStr}`);
                }
              } catch (e) {}
            }
            if (m.catatan && m.catatan !== '-' && m.catatan.trim() !== '') {
              lines.push(`📝 Catatan: ${m.catatan}`);
            }
            return lines;
          }
        }
      }
    },
    scales: {
      y: { 
        beginAtZero: false,
        title: yTitle ? { display: true, text: yTitle, color: '#0284c7', font: { weight: 'bold' as const } } : undefined,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { font: { weight: 'bold' as const }, color: '#475569' }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 }, color: '#64748b' }
      }
    }
  });

  // Open modal with prefilled date & mode
  const handleOpenManualModal = (dateStr?: string, defaultMode?: 'BOTH' | 'SUHU' | 'GAS') => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const targetDate = dateStr || todayStr;
    const existingDateRows = recordsByDate[targetDate] || [];
    const existingGasRows = existingDateRows.filter(r => r.kategori === 'GAS');
    const existingGasShifts = existingGasRows.map(r => String(r.shift || '').toLowerCase().trim());

    // Cerdas memilih shift yang belum diisi untuk gas jika ada
    let preselectedShift = 'Pagi';
    let preselectedJam = '08:00';
    if (existingGasShifts.some(s => s.includes('pagi') || s.includes('ds') || s === '1')) {
      preselectedShift = 'Malam';
      preselectedJam = '20:00';
    } else if (existingGasShifts.some(s => s.includes('malam') || s.includes('ns') || s === '3')) {
      preselectedShift = 'Pagi';
      preselectedJam = '08:00';
    }

    setModalTanggal(targetDate);
    setModalJam(preselectedJam);
    setModalShift(preselectedShift);
    setModalPetugas(defaultPetugasName);
    setModalCatatan('');
    setModalMode(defaultMode || 'BOTH');
    setModalForceOverwrite(false);

    // Reset suhu & gas inputs
    const initialSuhu: Record<string, { suhu: string; kel: string }> = {};
    RUANGAN_SUHU.forEach(r => { initialSuhu[r] = { suhu: '', kel: '' }; });
    setModalSuhuData(initialSuhu);

    const initialGas: Record<string, { flow: string; pressure: string; leak: 'Y' | 'N'; catatan: string }> = {};
    TABUNG_GAS.forEach(g => { initialGas[g] = { flow: '', pressure: '', leak: 'N', catatan: '' }; });
    setModalGasData(initialGas);

    setModalOpen(true);
  };

  const handleSuhuInputChange = (room: string, field: 'suhu' | 'kel', val: string) => {
    setModalSuhuData(prev => ({
      ...prev,
      [room]: {
        ...prev[room],
        [field]: val
      }
    }));
  };

  const handleGasInputChange = (gas: string, field: 'flow' | 'pressure' | 'leak' | 'catatan', val: string) => {
    setModalGasData(prev => ({
      ...prev,
      [gas]: {
        ...prev[gas],
        leak: prev[gas]?.leak || 'N',
        catatan: prev[gas]?.catatan || '',
        [field]: val
      }
    }));
  };

  // H-1 and H+1 neighbor dates based on modalTanggal
  const neighborInfo = useMemo(() => {
    if (!modalTanggal) return { prevDateStr: '', nextDateStr: '', prevDisplay: 'H-1', nextDisplay: 'H+1' };
    const [y, m, d] = modalTanggal.split('-').map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return { prevDateStr: '', nextDateStr: '', prevDisplay: 'H-1', nextDisplay: 'H+1' };

    const prevDt = new Date(y, m - 1, d - 1, 12, 0, 0);
    const nextDt = new Date(y, m - 1, d + 1, 12, 0, 0);

    const prevDateStr = `${prevDt.getFullYear()}-${String(prevDt.getMonth() + 1).padStart(2, '0')}-${String(prevDt.getDate()).padStart(2, '0')}`;
    const nextDateStr = `${nextDt.getFullYear()}-${String(nextDt.getMonth() + 1).padStart(2, '0')}-${String(nextDt.getDate()).padStart(2, '0')}`;

    const prevDisplay = prevDt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    const nextDisplay = nextDt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

    return { prevDateStr, nextDateStr, prevDisplay, nextDisplay };
  }, [modalTanggal]);

  const getSuhuReference = (room: string) => {
    const { prevDateStr, nextDateStr } = neighborInfo;
    const prevRows = recordsByDate[prevDateStr] || [];
    const nextRows = recordsByDate[nextDateStr] || [];

    const prevItem = prevRows.find(r => r.kategori === 'SUHU' && (r.lokasiArea === room || r.lokasi === room));
    const nextItem = nextRows.find(r => r.kategori === 'SUHU' && (r.lokasiArea === room || r.lokasi === room));

    return {
      prev: prevItem ? {
        suhu: String(prevItem.suhuCelcius || prevItem.suhu || ''),
        kel: String(prevItem.kelembapanPersen || prevItem.kelembapan || '')
      } : null,
      next: nextItem ? {
        suhu: String(nextItem.suhuCelcius || nextItem.suhu || ''),
        kel: String(nextItem.kelembapanPersen || nextItem.kelembapan || '')
      } : null,
    };
  };

  const getGasReference = (gas: string) => {
    const { prevDateStr, nextDateStr } = neighborInfo;
    const prevRows = recordsByDate[prevDateStr] || [];
    const nextRows = recordsByDate[nextDateStr] || [];

    const prevItem = prevRows.find(r => r.kategori === 'GAS' && (r.lokasiArea === gas || r.lokasi === gas));
    const nextItem = nextRows.find(r => r.kategori === 'GAS' && (r.lokasiArea === gas || r.lokasi === gas));

    return {
      prev: prevItem ? {
        flow: String(prevItem.flowGas || prevItem.flow || ''),
        pressure: String(prevItem.tekananGasPsi || prevItem.tekananGas || ''),
        leak: (prevItem.kebocoranYn || prevItem.kebocoran || 'N') as 'Y' | 'N',
        catatan: String(prevItem.catatanRemark || prevItem.catatan || '')
      } : null,
      next: nextItem ? {
        flow: String(nextItem.flowGas || nextItem.flow || ''),
        pressure: String(nextItem.tekananGasPsi || nextItem.tekananGas || ''),
        leak: (nextItem.kebocoranYn || nextItem.kebocoran || 'N') as 'Y' | 'N',
        catatan: String(nextItem.catatanRemark || nextItem.catatan || '')
      } : null,
    };
  };

  const copySuhuRef = (room: string, ref: { suhu: string; kel: string }) => {
    handleSuhuInputChange(room, 'suhu', ref.suhu);
    handleSuhuInputChange(room, 'kel', ref.kel);
    toast.success(`Nilai referensi disalin ke ${room}`);
  };

  const copyGasRef = (gas: string, ref: { flow: string; pressure: string; leak: 'Y' | 'N'; catatan?: string }) => {
    setModalGasData(prev => ({
      ...prev,
      [gas]: {
        flow: ref.flow,
        pressure: ref.pressure,
        leak: ref.leak || 'N',
        catatan: ref.catatan || ''
      }
    }));
    toast.success(`Nilai referensi disalin ke ${gas}`);
  };

  const copyAllSuhu = (type: 'prev' | 'next') => {
    let count = 0;
    setModalSuhuData(prev => {
      const updated = { ...prev };
      RUANGAN_SUHU.forEach(r => {
        const ref = getSuhuReference(r)[type];
        if (ref && (ref.suhu || ref.kel)) {
          updated[r] = { suhu: ref.suhu, kel: ref.kel };
          count++;
        }
      });
      return updated;
    });
    if (count > 0) {
      toast.success(`Data suhu ${count} ruangan berhasil disalin dari ${type === 'prev' ? `H-1 (${neighborInfo.prevDisplay})` : `H+1 (${neighborInfo.nextDisplay})`}`);
    } else {
      toast.error(`Tidak ada data suhu pada ${type === 'prev' ? 'H-1' : 'H+1'}`);
    }
  };

  const copyAllGas = (type: 'prev' | 'next') => {
    let count = 0;
    setModalGasData(prev => {
      const updated = { ...prev };
      TABUNG_GAS.forEach(g => {
        const ref = getGasReference(g)[type];
        if (ref && (ref.flow || ref.pressure || ref.catatan)) {
          updated[g] = { flow: ref.flow, pressure: ref.pressure, leak: ref.leak, catatan: ref.catatan || '' };
          count++;
        }
      });
      return updated;
    });
    if (count > 0) {
      toast.success(`Data ${count} tabung gas berhasil disalin dari ${type === 'prev' ? `H-1 (${neighborInfo.prevDisplay})` : `H+1 (${neighborInfo.nextDisplay})`}`);
    } else {
      toast.error(`Tidak ada data gas pada ${type === 'prev' ? 'H-1' : 'H+1'}`);
    }
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTanggal) {
      return toast.error('Tanggal pemantauan wajib diisi');
    }
    if (!modalShift) {
      return toast.error('Shift pemantauan wajib dipilih');
    }
    if (!modalPetugas.trim()) {
      return toast.error('Nama petugas wajib diisi');
    }

    // Check at least one entry exists
    const hasSuhuEntries = modalMode !== 'GAS' && Object.values(modalSuhuData).some(v => v.suhu || v.kel);
    const hasGasEntries = modalMode !== 'SUHU' && Object.values(modalGasData).some(v => v.flow || v.pressure);

    if (modalMode === 'SUHU' && !hasSuhuEntries) {
      return toast.error('Mohon isi minimal satu parameter suhu ruangan');
    }
    if (modalMode === 'GAS' && !hasGasEntries) {
      return toast.error('Mohon isi minimal satu parameter tekanan gas');
    }
    if (modalMode === 'BOTH' && !hasSuhuEntries && !hasGasEntries) {
      return toast.error('Mohon isi minimal satu data suhu ruangan atau tekanan gas');
    }
    if (manualSigPadRef.current?.isEmpty()) {
      return toast.error('Tanda tangan petugas wajib dibubuhkan');
    }

    setModalSubmitting(true);
    try {
      let sigUrl = '';
      if (manualSigPadRef.current && !manualSigPadRef.current.isEmpty()) {
        const sigBase64 = manualSigPadRef.current.getCanvas().toDataURL('image/png').split(',')[1];
        if (sigBase64) {
          sigUrl = await uploadPhotoToDrive(
            sigBase64,
            'image/png',
            `Sig_Manual_${modalPetugas.trim().replace(/\s+/g, '_')}_${Date.now()}.png`,
            'Pemantauan'
          );
        }
      }

      await submitPemantauanBatch({
        inspectorName: modalPetugas.trim(),
        shift: modalShift,
        catatan: modalCatatan.trim() || '-',
        suhuData: (modalMode === 'BOTH' || modalMode === 'SUHU') ? modalSuhuData : undefined,
        gasData: (modalMode === 'BOTH' || modalMode === 'GAS') ? modalGasData : undefined,
        tanggal: modalTanggal,
        jam: modalJam || '08:00',
        sigUrl,
        forceOverwrite: modalForceOverwrite,
        isOperationalDate: true
      });

      toast.success(`Laporan pemantauan tanggal ${modalTanggal} berhasil disimpan!`);
      setModalOpen(false);
      // Refresh dashboard immediately
      await handleFilter();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menyimpan laporan pemantauan');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleOpenSigModal = (dateStr?: string, defaultPetugas?: string) => {
    setSigModalDate(dateStr || '');
    setSigModalPetugas(defaultPetugas || defaultPetugasName);
    setSigModalApplyAll(true);
    setSigModalOpen(true);
    setTimeout(() => dedicatedSigPadRef.current?.clear(), 100);
  };

  const handleSubmitSigModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dedicatedSigPadRef.current?.isEmpty()) {
      return toast.error('Silakan bubuhkan tanda tangan terlebih dahulu');
    }
    setSigModalSubmitting(true);
    try {
      const sigBase64 = dedicatedSigPadRef.current?.getCanvas().toDataURL('image/png').split(',')[1];
      if (!sigBase64) throw new Error('Gagal mengambil data tanda tangan');

      const sigUrl = await uploadPhotoToDrive(
        sigBase64,
        'image/png',
        `Sig_Backfill_${sigModalPetugas.trim().replace(/\s+/g, '_')}_${Date.now()}.png`,
        'Pemantauan'
      );

      await updatePemantauanSignature({
        tanggal: sigModalApplyAll ? undefined : (sigModalDate || undefined),
        inspektor: sigModalPetugas.trim(),
        sigUrl,
        updateAllForInspector: sigModalApplyAll
      });

      toast.success(
        sigModalApplyAll
          ? `Tanda tangan berhasil diterapkan ke seluruh data pemantauan ${sigModalPetugas} yang belum bertanda tangan!`
          : `Tanda tangan berhasil disimpan untuk tanggal ${sigModalDate}!`
      );
      setSigModalOpen(false);
      await handleFilter();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal memperbarui tanda tangan');
    } finally {
      setSigModalSubmitting(false);
    }
  };

  // Handler buka modal edit record database langsung (Khusus Developer)
  const handleOpenEditModal = (record: any) => {
    setEditingRecord(record);
    setEditFormData({
      id: record.id,
      idPemantauan: record.idPemantauan || '',
      kategori: record.kategori || 'GAS',
      tanggal: record.tanggal || '',
      jam: record.jam || '',
      shift: record.shift || 'Pagi',
      lokasiArea: record.lokasiArea || record.lokasi || '',
      flowGas: record.flowGas ?? '',
      tekananGasPsi: record.tekananGasPsi ?? '',
      suhuCelcius: record.suhuCelcius ?? '',
      kelembapanPersen: record.kelembapanPersen ?? '',
      inspektorPetugas: record.inspektorPetugas || '',
      catatanRemark: record.catatanRemark || '',
      kebocoranYn: record.kebocoranYn || 'N'
    });
  };

  const handleSaveEditRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setIsSavingEdit(true);
    try {
      await updatePemantauanRecord(editingRecord.id, editFormData);
      setRawRecords(prev => prev.map(rec => rec.id === editingRecord.id ? { ...rec, ...editFormData } : rec));
      toast.success(`Record #${editingRecord.id} berhasil diperbarui di database!`);
      setEditingRecord(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menyimpan perubahan record ke database');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteRecord = async (record: any) => {
    if (!record) return;
    const confirmDelete = window.confirm(`Yakin ingin menghapus record pemantauan ID #${record.id} (${record.tanggal} - ${record.lokasiArea || record.kategori}) dari database?`);
    if (!confirmDelete) return;

    setIsDeletingRecord(true);
    try {
      await deletePemantauanRecord(record.id);
      setRawRecords(prev => prev.filter(rec => rec.id !== record.id));
      if (editingRecord && editingRecord.id === record.id) {
        setEditingRecord(null);
      }
      toast.success(`Record #${record.id} berhasil dihapus dari database.`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal menghapus record dari database');
    } finally {
      setIsDeletingRecord(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 pb-20">
      {/* Header */}
      <div className="px-1 flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-800 leading-tight">Dashboard Monitoring</h2>
          <p className="text-xs text-slate-500">Rekap Suhu, Kelembapan, Tekanan Gas & Status Kelengkapan</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setShowGuestQrModal(true)} 
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 dark:text-slate-200 font-semibold text-xs px-3 py-2 flex items-center gap-1.5 shadow-2xs"
            title="Cetak Barcode / QR Code Khusus Tamu & Auditor"
          >
            <QrCode className="w-4 h-4 text-cyan-600" />
            <span>QR Code Tamu / Auditor</span>
          </Button>

          <Button 
            onClick={() => handleOpenManualModal()} 
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs px-3 py-2 flex items-center gap-1.5 shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Input Manual Susulan</span>
          </Button>
        </div>
      </div>

      {/* Filter Card */}
      <Card className="border-t-4 border-t-cyan-500 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <h4 className="font-semibold text-slate-700 flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-cyan-500" /> Filter Waktu & Otomatis
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Filter Otomatis:</span>
            <select
              value={selectedIsoWeek}
              onChange={e => handleAutoFilterSelect(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-cyan-500/20 cursor-pointer shadow-2xs"
            >
              <option value="">-- Pilih Filter Otomatis --</option>
              
              <optgroup label="📅 Filter Bulanan">
                <option value="this_month">📅 Bulan Ini ({currMonthName} {currYear})</option>
                <option value="last_month">⏮️ Bulan Lalu ({lastMonthName} {lastMonthYear})</option>
                {monthsList.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </optgroup>

              <optgroup label="⚡ Filter Cepat Minggu ISO">
                <option value="this_iso_week">⚡ Minggu ISO Ini (W{String(getISOWeek(new Date())).padStart(2, '0')})</option>
                <option value="last_iso_week">⏮️ Minggu ISO Lalu (W{String(Math.max(1, getISOWeek(new Date()) - 1)).padStart(2, '0')})</option>
              </optgroup>

              <optgroup label="📋 Daftar Minggu ISO">
                {isoWeeksList.map(iw => (
                  <option key={iw.value} value={iw.value}>{iw.label}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1"><Input type="date" label="Mulai" value={tglMulai} onChange={e => { setTglMulai(e.target.value); setSelectedIsoWeek(''); }} /></div>
          <div className="flex-1"><Input type="date" label="Akhir" value={tglAkhir} onChange={e => { setTglAkhir(e.target.value); setSelectedIsoWeek(''); }} /></div>
        </div>
        <Button onClick={() => handleFilter()} disabled={loading} className="w-full bg-cyan-600 hover:bg-cyan-700 font-semibold focus:ring-cyan-500">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />} Terapkan Filter
        </Button>

        {Object.keys(dataSuhu).length > 0 || Object.keys(dataGas).length > 0 ? (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileDown className="w-4 h-4 text-rose-500" /> Ekspor Dokumen Rekap PDF:
              </span>
              <span className="text-[11px] text-slate-500">Pilih per instrumen/ruangan atau buat sekaligus semua</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Opsi PDF Gas */}
              {Object.keys(dataGas).length > 0 && (
                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <Wind className="w-3.5 h-3.5 text-emerald-600" /> Tabung Gas
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {Object.keys(dataGas).length} Instrumen
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <select
                      value={selectedGasOption}
                      onChange={e => setSelectedGasOption(e.target.value)}
                      className="flex-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-emerald-300 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-2xs cursor-pointer"
                    >
                      <option value="ALL">⚡ Buat Semua Tabung Gas Sekaligus</option>
                      {Object.keys(dataGas).map(lok => (
                        <option key={lok} value={lok}>🎯 Hanya {lok}</option>
                      ))}
                    </select>
                    <Button 
                      onClick={() => generatePDF('GAS', selectedGasOption)} 
                      variant="secondary" 
                      disabled={generatingPdf} 
                      className="border-emerald-300 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs px-3 shadow-2xs whitespace-nowrap"
                    >
                      {generatingPdf && (generatingTarget === `GAS ${selectedGasOption}` || (!generatingTarget && selectedGasOption === 'ALL')) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      )} 
                      {selectedGasOption === 'ALL' ? 'Cetak Semua' : 'Cetak'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Opsi PDF Suhu */}
              {Object.keys(dataSuhu).length > 0 && (
                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                      <ThermometerSun className="w-3.5 h-3.5 text-blue-600" /> Suhu & Kelembapan
                    </span>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                      {Object.keys(dataSuhu).length} Ruangan
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <select
                      value={selectedSuhuOption}
                      onChange={e => setSelectedSuhuOption(e.target.value)}
                      className="flex-1 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-blue-300 bg-white text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs cursor-pointer"
                    >
                      <option value="ALL">⚡ Buat Semua Ruangan Sekaligus</option>
                      {Object.keys(dataSuhu).map(lok => (
                        <option key={lok} value={lok}>🎯 Hanya {lok}</option>
                      ))}
                    </select>
                    <Button 
                      onClick={() => generatePDF('SUHU', selectedSuhuOption)} 
                      variant="secondary" 
                      disabled={generatingPdf} 
                      className="border-blue-300 text-blue-700 hover:bg-blue-100 font-semibold text-xs px-3 shadow-2xs whitespace-nowrap"
                    >
                      {generatingPdf && (generatingTarget === `SUHU ${selectedSuhuOption}` || (!generatingTarget && selectedSuhuOption === 'ALL')) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5 mr-1 text-blue-600" />
                      )} 
                      {selectedSuhuOption === 'ALL' ? 'Cetak Semua' : 'Cetak'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Card>

      {/* PDF Links */}
      {pdfLinks.length > 0 && (
        <Card className="border-l-4 border-l-rose-500 bg-rose-50/50">
           <h4 className="font-bold text-rose-700 mb-3 text-sm">Hasil Generate PDF</h4>
           <div className="space-y-2">
             {pdfLinks.map((link, idx) => (
               <button key={idx} type="button" onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")} className="flex items-center p-2 bg-white rounded border border-rose-100 hover:border-rose-300 hover:shadow-sm transition-all text-sm font-medium text-slate-700">
                  <FileDown className="w-4 h-4 text-rose-500 mx-2" />
                  {link.nama || link.name || `Download PDF (${idx + 1})`}
               </button>
             ))}
           </div>
        </Card>
      )}

      {/* Charts Section */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex flex-col items-center py-10 bg-white rounded-2xl border border-slate-100 p-8 shadow-xs">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mb-2" />
            <p className="text-sm font-medium text-slate-500">Memuat Data Grafik & Rekap...</p>
          </div>
        ) : (
          <>
            {/* Render SUHU */}
            {Object.keys(dataSuhu).map(lok => {
              const d = dataSuhu[lok];
              const std = ACCEPTABLE_RANGES[lok];

              const suhuDatasets: any[] = [
                { 
                  label: "Suhu (°C)", 
                  data: d.suhu, 
                  borderColor: "#0284c7", 
                  backgroundColor: "rgba(2, 132, 199, 0.08)", 
                  tension: 0.35,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  pointBackgroundColor: "#0284c7",
                  borderWidth: 2.5,
                  fill: true
                }
              ];
              if (d.sUp && d.sUp.some((v: any) => v !== null && v !== undefined)) {
                suhuDatasets.push({ 
                  label: `Limit Atas (${std?.sUp ?? 'Max'}°C)`, 
                  data: d.sUp, 
                  borderColor: "rgba(239, 68, 68, 0.85)", 
                  borderDash: [6, 6], 
                  pointRadius: 0, 
                  borderWidth: 2, 
                  fill: false 
                });
              }
              if (d.sLow && d.sLow.some((v: any) => v !== null && v !== undefined)) {
                suhuDatasets.push({ 
                  label: `Limit Bawah (${std?.sLow ?? 'Min'}°C)`, 
                  data: d.sLow, 
                  borderColor: "rgba(59, 130, 246, 0.85)", 
                  borderDash: [6, 6], 
                  pointRadius: 0, 
                  borderWidth: 2, 
                  fill: false 
                });
              }

              const kelDatasets: any[] = [
                { 
                  label: "Kelembapan (%)", 
                  data: d.kelembapan, 
                  borderColor: "#059669", 
                  backgroundColor: "rgba(5, 150, 105, 0.08)", 
                  tension: 0.35,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  pointBackgroundColor: "#059669",
                  borderWidth: 2.5,
                  fill: true
                }
              ];
              if (d.kUp && d.kUp.some((v: any) => v !== null && v !== undefined)) {
                kelDatasets.push({ 
                  label: `Limit Atas (${std?.kUp ?? 'Max'}%)`, 
                  data: d.kUp, 
                  borderColor: "rgba(245, 158, 11, 0.85)", 
                  borderDash: [6, 6], 
                  pointRadius: 0, 
                  borderWidth: 2, 
                  fill: false 
                });
              }
              if (d.kLow && d.kLow.some((v: any) => v !== null && v !== undefined)) {
                kelDatasets.push({ 
                  label: `Limit Bawah (${std?.kLow ?? 'Min'}%)`, 
                  data: d.kLow, 
                  borderColor: "rgba(16, 185, 129, 0.85)", 
                  borderDash: [6, 6], 
                  pointRadius: 0, 
                  borderWidth: 2, 
                  fill: false 
                });
              }

              const suhuData = {
                labels: d.labels,
                datasets: suhuDatasets
              };
              const kelData = {
                labels: d.labels,
                datasets: kelDatasets
              };

              return (
                <Card key={lok} className="border-l-4 border-l-blue-500 shadow-sm p-4 bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-blue-700 flex items-center gap-2">
                        <ThermometerSun className="w-4 h-4" /> {lok}
                      </h4>
                      {std?.refText && (
                        <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-md">
                          Acceptable Range: {std.refText}
                        </span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={generatingPdf}
                      onClick={() => generatePDF('SUHU', lok)}
                      className="border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold text-xs px-2.5 py-1 h-auto shrink-0 shadow-2xs"
                    >
                      {generatingPdf && generatingTarget === `SUHU ${lok}` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                      )}
                      Cetak PDF {lok}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="h-64 sm:h-72 p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                      <Line 
                        data={suhuData as any} 
                        options={createChartTooltipOptions(d.meta || [], 'Suhu (°C)') as any} 
                      />
                    </div>
                    <div className="h-64 sm:h-72 p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                      <Line 
                        data={kelData as any} 
                        options={createChartTooltipOptions(d.meta || [], 'Kelembapan (%)') as any} 
                      />
                    </div>
                  </div>
                </Card>
              );
            })}

            {/* Render GAS */}
            {Object.keys(dataGas).map(lok => {
              const d = dataGas[lok];
              const flowData = {
                labels: d.labels,
                datasets: [{ 
                  label: "Flow Rate (L/min)", 
                  data: d.flow, 
                  borderColor: "#059669", 
                  backgroundColor: "rgba(5, 150, 105, 0.08)", 
                  tension: 0.35,
                  pointRadius: 4,
                  pointHoverRadius: 6,
                  borderWidth: 2.5,
                  fill: true
                }]
              };
              const presData = {
                labels: d.labels,
                datasets: [
                  { 
                    label: "Tekanan (psi / Bar)", 
                    data: d.pressure, 
                    borderColor: "#0284c7", 
                    backgroundColor: "rgba(2, 132, 199, 0.08)", 
                    tension: 0.35,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2.5,
                    fill: true
                  }
                ]
              };

              return (
                <Card key={lok} className="border-l-4 border-l-emerald-500 shadow-sm p-4 bg-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <h4 className="font-bold text-emerald-700 flex items-center gap-2">
                      <Wind className="w-4 h-4" /> {lok}
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={generatingPdf}
                      onClick={() => generatePDF('GAS', lok)}
                      className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs px-2.5 py-1 h-auto shrink-0 shadow-2xs"
                    >
                      {generatingPdf && generatingTarget === `GAS ${lok}` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <FileDown className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                      )}
                      Cetak PDF {lok}
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="h-64 sm:h-72 p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                      <Line 
                        data={presData as any} 
                        options={createChartTooltipOptions(d.meta || [], 'Tekanan (psi/Bar)') as any} 
                      />
                    </div>
                    <div className="h-64 sm:h-72 p-2 bg-slate-50/50 rounded-xl border border-slate-100">
                      <Line 
                        data={flowData as any} 
                        options={createChartTooltipOptions(d.meta || [], 'Flow (L/min)') as any} 
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </div>

      {/* ============================================================== */}
      {/* TABEL DATA RIWAYAT INPUT REAL & DATABASE (KHUSUS DEVELOPER)   */}
      {/* ============================================================== */}
      {isDev && (
        <Card className="border-t-4 border-t-cyan-500 space-y-4 shadow-sm bg-gradient-to-b from-cyan-50/20 to-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-cyan-100 text-cyan-700 rounded-xl mt-0.5">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-800 text-sm">
                    Tabel Riwayat Data Input Real (Database Records)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                    <Shield className="w-3 h-3 text-amber-700" /> Mode Developer
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
                    {filteredRawRecords.length} Data Terdata
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tersedia untuk akun Dev: Anda dapat mencari ID record dan <strong>mengedit data pemantauan langsung di database</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={rawSearchQuery}
                  onChange={e => setRawSearchQuery(e.target.value)}
                  placeholder="Cari ID, tgl 12, Epsilon, petugas..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
                {rawSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setRawSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setRawCategoryFilter('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-all ${rawCategoryFilter === 'ALL' ? 'bg-white text-slate-800 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setRawCategoryFilter('GAS')}
                  className={`px-2.5 py-1 rounded-md transition-all ${rawCategoryFilter === 'GAS' ? 'bg-white text-emerald-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Gas
                </button>
                <button
                  type="button"
                  onClick={() => setRawCategoryFilter('SUHU')}
                  className={`px-2.5 py-1 rounded-md transition-all ${rawCategoryFilter === 'SUHU' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Suhu
                </button>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowRawTable(!showRawTable)}
                className="text-xs font-semibold"
              >
                {showRawTable ? 'Sembunyikan' : 'Tampilkan'}
              </Button>
            </div>
          </div>

          {showRawTable && (
            filteredRawRecords.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-xl">
                {rawSearchQuery ? `Tidak ada data input yang sesuai dengan pencarian "${rawSearchQuery}".` : 'Tidak ada data pemantauan pada rentang waktu ini.'}
              </div>
            ) : (
              <div className="overflow-hidden border border-slate-200 rounded-xl">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 z-10 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-3 py-2.5">ID DB</th>
                        <th className="px-3 py-2.5">Tgl Operasional</th>
                        <th className="px-3 py-2.5">Jam & Shift</th>
                        <th className="px-3 py-2.5">Lokasi / Tabung</th>
                        <th className="px-3 py-2.5">Parameter Terukur</th>
                        <th className="px-3 py-2.5">Petugas</th>
                        <th className="px-3 py-2.5">Waktu Input Real (Sistem)</th>
                        <th className="px-3 py-2.5">Catatan</th>
                        <th className="px-3 py-2.5 text-right">Aksi DB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredRawRecords.map(r => {
                        const isGas = r.kategori === 'GAS';
                        let realTimeStr = '-';
                        if (r.timestamp) {
                          try {
                            const dt = new Date(r.timestamp);
                            if (!isNaN(dt.getTime())) {
                              const wit = new Date(dt.getTime() + 9 * 3600 * 1000);
                              realTimeStr = wit.toISOString().replace('T', ' ').substring(0, 19) + ' WIT';
                            }
                          } catch (e) {}
                        }

                        return (
                          <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-3 py-2 font-mono font-bold text-slate-700 whitespace-nowrap">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                                #{r.id}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">
                              <div>{r.tanggal || '-'}</div>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                String(r.shift || '').toLowerCase().includes('malam') 
                                  ? 'bg-indigo-100 text-indigo-700' 
                                  : String(r.shift || '').toLowerCase().includes('long')
                                  ? 'bg-teal-100 text-teal-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {r.jam || '-'} • {r.shift || '-'}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-medium text-slate-700">
                              <div className="flex items-center gap-1.5">
                                {isGas ? <Wind className="w-3 h-3 text-emerald-600 shrink-0" /> : <ThermometerSun className="w-3 h-3 text-blue-600 shrink-0" />}
                                <span>{r.lokasiArea || r.lokasi || '-'}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 font-mono text-[11px]">
                              {isGas ? (
                                <span>Flow: <strong>{r.flowGas || r.flow || '-'}</strong> L/min • Press: <strong>{r.tekananGasPsi || r.tekananGas || '-'}</strong> psi</span>
                              ) : (
                                <span>Suhu: <strong>{r.suhuCelcius || r.suhu || '-'}°C</strong> • RH: <strong>{r.kelembapanPersen || r.kelembapan || '-'}%</strong></span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-slate-700 font-medium whitespace-nowrap">
                              {r.inspektorPetugas || '-'}
                            </td>
                            <td className="px-3 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                              {realTimeStr}
                            </td>
                            <td className="px-3 py-2 text-slate-500 italic max-w-xs truncate" title={r.catatanRemark || ''}>
                              {r.catatanRemark || '-'}
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(r)}
                                  title="Edit record database ini langsung"
                                  className="px-2.5 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                >
                                  <Edit3 className="w-3 h-3 text-cyan-700" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRecord(r)}
                                  disabled={isDeletingRecord}
                                  title="Hapus record ini dari database"
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </Card>
      )}

      {/* ============================================================== */}
      {/* BAGIAN BAWAH: REKAPAN TANGGAL KOSONG & INPUT SUSULAN           */}
      {/* ============================================================== */}
      <Card className="border-t-4 border-t-amber-500 space-y-5 shadow-sm">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl mt-0.5">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-base">Rekapitulasi Tanggal Kosong / Terlewat</h3>
                <span className={`px-2 py-0.5 text-xs font-black rounded-full ${missingDays > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {missingDays > 0 ? `${missingDays} Hari Terlewat` : 'Semua Lengkap'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar tanggal pemantauan yang belum lengkap pada rentang <strong className="text-slate-700">{tglMulai}</strong> s/d <strong className="text-slate-700">{tglAkhir}</strong>. Tambahkan laporan susulan untuk personil yang terlewat atau kendala jaringan.
              </p>
            </div>
          </div>
          <Button
            onClick={() => handleOpenManualModal()}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-3.5 py-2.5 flex items-center justify-center gap-2 shrink-0 shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Input Laporan Susulan</span>
          </Button>
        </div>

        {/* Statistic Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Hari Periode</p>
            <p className="text-xl font-black text-slate-800 mt-1">{totalDays} <span className="text-xs font-semibold text-slate-400">Hari</span></p>
          </div>
          <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
            <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Hari Lengkap
            </p>
            <p className="text-xl font-black text-emerald-800 mt-1">{completeDays} <span className="text-xs font-semibold text-emerald-600">Hari</span></p>
          </div>
          <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3">
            <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Kosong Total
            </p>
            <p className="text-xl font-black text-rose-800 mt-1">{kosongTotalDays} <span className="text-xs font-semibold text-rose-600">Hari</span></p>
          </div>
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
            <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Parsial / Belum Lengkap
            </p>
            <p className="text-xl font-black text-amber-800 mt-1">{suhuKosongDays + gasKosongDays} <span className="text-xs font-semibold text-amber-600">Hari</span></p>
          </div>
          {missingSignatureDays > 0 && (
            <div className="bg-rose-50/80 border border-rose-200/90 rounded-xl p-3 cursor-pointer hover:bg-rose-100/80 transition-colors" onClick={() => setMissingFilterTab('ttd_kurang')}>
              <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
                <PenTool className="w-3.5 h-3.5 text-rose-600" /> Belum Bertanda Tangan
              </p>
              <p className="text-xl font-black text-rose-800 mt-1">{missingSignatureDays} <span className="text-xs font-semibold text-rose-600">Hari</span></p>
            </div>
          )}
        </div>

        {/* Tab Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-xl text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setMissingFilterTab('all_missing')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              missingFilterTab === 'all_missing'
                ? 'bg-white text-slate-800 shadow-xs font-bold'
                : 'hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            Semua Terlewat ({missingDays})
          </button>
          <button
            type="button"
            onClick={() => setMissingFilterTab('kosong_total')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              missingFilterTab === 'kosong_total'
                ? 'bg-white text-rose-700 shadow-xs font-bold'
                : 'hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
            Kosong Total ({kosongTotalDays})
          </button>
          <button
            type="button"
            onClick={() => setMissingFilterTab('suhu_kosong')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              missingFilterTab === 'suhu_kosong'
                ? 'bg-white text-blue-700 shadow-xs font-bold'
                : 'hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ThermometerSun className="w-3.5 h-3.5 text-blue-500" />
            Suhu Kosong ({suhuKosongDays})
          </button>
          <button
            type="button"
            onClick={() => setMissingFilterTab('gas_kosong')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              missingFilterTab === 'gas_kosong'
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-emerald-600" />
            Gas Kosong ({gasKosongDays})
          </button>
          {missingSignatureDays > 0 && (
            <button
              type="button"
              onClick={() => setMissingFilterTab('ttd_kurang')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                missingFilterTab === 'ttd_kurang'
                  ? 'bg-rose-600 text-white shadow-xs font-bold'
                  : 'text-rose-700 bg-rose-100/70 hover:bg-rose-200/80 font-bold'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              Belum TTD ({missingSignatureDays})
            </button>
          )}
          <button
            type="button"
            onClick={() => setMissingFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              missingFilterTab === 'all'
                ? 'bg-white text-slate-800 shadow-xs font-bold'
                : 'hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Semua Tanggal ({totalDays})
          </button>
        </div>

        {/* Banner Alert: Missing Signatures */}
        {missingSignatureDays > 0 && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                <PenTool className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  Perhatian: Ada {missingSignatureDays} tanggal dengan rekapan yang belum memiliki tanda tangan petugas!
                </h4>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Tanda tangan diperlukan agar kolom tanda tangan pada dokumen cetak PDF terverifikasi (✓ TTD). Anda dapat membubuhkan tanda tangan sekaligus untuk semua data tersebut.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => handleOpenSigModal(undefined, defaultPetugasName)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>✍️ Lengkapi TTD Sekaligus</span>
            </Button>
          </div>
        )}

        {/* Date List Table / Cards */}
        {filteredDateStatuses.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Tanggal Kosong</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1">
              {missingFilterTab === 'all_missing'
                ? 'Seluruh tanggal pada periode filter ini telah memiliki catatan pemantauan suhu dan gas secara lengkap.'
                : 'Tidak ada tanggal yang sesuai dengan filter kategori ini.'}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-4 py-3">Tanggal</th>
                    <th className="px-3 py-3">Status Suhu</th>
                    <th className="px-3 py-3">Status Gas</th>
                    <th className="px-3 py-3">Status Shift</th>
                    <th className="px-3 py-3">Shift Terdata</th>
                    <th className="px-3 py-3">Status TTD</th>
                    <th className="px-4 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredDateStatuses.map(d => {
                    const isTotalMissing = d.statusType === 'KOSONG_TOTAL';
                    const isSuhuMissing = !d.hasSuhu;
                    const isGasMissing = !d.hasGas;

                    // Recommend mode for quick input
                    let targetMode: 'BOTH' | 'SUHU' | 'GAS' = 'BOTH';
                    if (isSuhuMissing && !isGasMissing) targetMode = 'SUHU';
                    else if (isGasMissing && !isSuhuMissing) targetMode = 'GAS';

                    return (
                      <tr key={d.dateStr} className={`hover:bg-slate-50/80 transition-colors ${isTotalMissing ? 'bg-rose-50/20' : ''}`}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800 text-xs">{d.dayName}, {d.formattedDate}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{d.dateStr}</div>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {d.hasSuhu ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3" /> Lengkap (1x Sehari)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              <X className="w-3 h-3" /> Belum Diinput
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {d.gasCount === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              <X className="w-3 h-3" /> Belum Diinput
                            </span>
                          ) : d.hasGasPartial ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300"
                              title={`Gas membutuhkan 2 shift per hari (Pagi & Malam) atau 1x Long-Shift. Baru terdata shift: ${d.gasShifts.join(', ')}`}
                            >
                              <AlertCircle className="w-3 h-3 text-amber-600" /> Kurang 1 Shift (Baru: {d.gasShifts.join(', ')})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <Check className="w-3 h-3" /> {d.gasShifts.some(s => s.toLowerCase().includes('long') || s.toLowerCase() === 'ls') ? 'Lengkap (Long-Shift)' : `Lengkap (2 Shift: ${d.gasShifts.join(', ')})`}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {d.statusShiftType === 'MALAM_BELUM' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{d.statusShift}</span>
                            </span>
                          ) : d.statusShiftType === 'PAGI_BELUM' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{d.statusShift}</span>
                            </span>
                          ) : d.statusShiftType === 'SEMUA_BELUM' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                              <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>{d.statusShift}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{d.statusShift}</span>
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-600">
                          {d.shifts.length > 0 ? (
                            <div className="flex gap-1 flex-wrap items-center">
                              {d.shifts.map((s, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                  {s}
                                </span>
                              ))}
                              {d.petugas.length > 0 && (
                                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[130px] block" title={d.petugas.join(', ')}>
                                  ({d.petugas.join(', ')})
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {d.totalRecords === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          ) : d.hasSignature ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" /> Ada
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenSigModal(d.dateStr, d.petugas[0] || defaultPetugasName)}
                              title="Klik untuk membubuhkan tanda tangan susulan"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition-colors shadow-2xs group cursor-pointer"
                            >
                              <PenTool className="w-3 h-3 text-amber-700" />
                              <span>Belum Ada</span>
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {d.isSignatureMissing && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenSigModal(d.dateStr, d.petugas[0] || defaultPetugasName)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-2xs inline-flex items-center gap-1"
                              >
                                <PenTool className="w-3 h-3" />
                                <span>Lengkapi TTD</span>
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleOpenManualModal(d.dateStr, targetMode)}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-2xs inline-flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Input Susulan</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card>

      {/* ============================================================== */}
      {/* MODAL INPUT SUSULAN / MANUAL PEMANTAUAN                        */}
      {/* ============================================================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                  <CalendarRange className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Input Manual Susulan Pemantauan</h3>
                  <p className="text-xs text-amber-100 font-medium">
                    Untuk personil terlewat input atau terkendala koneksi jaringan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitManual} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Form Baris 1: Tanggal, Jam, Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Tanggal Pemantauan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={modalTanggal}
                    onChange={e => setModalTanggal(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Jam Input <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={modalJam}
                    onChange={e => setModalJam(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Pilih Shift <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={modalShift}
                    onChange={e => setModalShift(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs"
                  >
                    <option value="Pagi">Pagi (06:00 - 18:00)</option>
                    <option value="Malam">Malam (18:00 - 06:00)</option>
                    <option value="Long-Shift">Long-Shift</option>
                  </select>
                </div>
              </div>

              {modalShift === 'Malam' && (
                <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-2.5 text-[11px] text-amber-800 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Cut-Off Operasional 06:00 WIT:</strong> Pemeriksaan Shift Malam (termasuk jam 00:00 - 05:59 dini hari) dihitung masuk ke hari operasional <strong>{modalTanggal}</strong>.
                  </span>
                </div>
              )}

              {/* Form Baris 2: Petugas & Catatan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Nama Petugas / Inspektor <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={modalPetugas}
                    onChange={e => setModalPetugas(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Catatan Umum (Opsional)
                  </label>
                  <input
                    type="text"
                    value={modalCatatan}
                    onChange={e => setModalCatatan(e.target.value)}
                    placeholder="Catatan umum (opsional)"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Kategori Pemantauan yang Diinput:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode('BOTH')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      modalMode === 'BOTH'
                        ? 'bg-amber-50 border-amber-500 text-amber-700 ring-2 ring-amber-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Keduanya (Suhu & Gas)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('SUHU')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      modalMode === 'SUHU'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ThermometerSun className="w-3.5 h-3.5" />
                    Hanya Suhu & RH
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('GAS')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      modalMode === 'GAS'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Wind className="w-3.5 h-3.5" />
                    Hanya Tekanan Gas
                  </button>
                </div>
              </div>

              {/* Reference Header Banner */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/90 rounded-2xl p-3.5 flex items-start gap-3 shadow-2xs">
                <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                  <Info className="w-4 h-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-800 text-xs">Data Referensi Terdekat:</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px]">
                      <ArrowLeft className="w-3 h-3 text-amber-600" />
                      H-1: {neighborInfo.prevDisplay} ({neighborInfo.prevDateStr || '-'})
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300 font-bold text-[11px]">
                      H+1: {neighborInfo.nextDisplay} ({neighborInfo.nextDateStr || '-'})
                      <ArrowRight className="w-3 h-3 text-cyan-600" />
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Data pada tanggal H-1 dan H+1 ditampilkan di bawah tiap parameter sebagai acuan. Anda dapat mengklik tombol <strong>Salin</strong> atau tombol cepat di atas untuk mengisi nilai secara instan.
                  </p>
                </div>
              </div>

              {/* Suhu & RH Inputs */}
              {(modalMode === 'BOTH' || modalMode === 'SUHU') && (
                <div className="border border-blue-200 bg-blue-50/30 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-100 pb-2">
                    <div className="flex items-center gap-2">
                      <ThermometerSun className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                        Parameter Suhu & Kelembapan Ruangan
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => copyAllSuhu('prev')}
                        className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold border border-amber-300 transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Salin Semua H-1 ({neighborInfo.prevDisplay})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyAllSuhu('next')}
                        className="px-2.5 py-1 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-800 text-[10px] font-bold border border-cyan-300 transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Salin Semua H+1 ({neighborInfo.nextDisplay})</span>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {RUANGAN_SUHU.map(ruang => {
                      const ref = getSuhuReference(ruang);
                      return (
                        <div key={ruang} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-2xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-700 sm:w-44">{ruang}</span>
                            <div className="flex gap-2 flex-1">
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  step="0.1"
                                  placeholder="Suhu (cth: 22.5)"
                                  value={modalSuhuData[ruang]?.suhu || ''}
                                  onChange={e => handleSuhuInputChange(ruang, 'suhu', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">°C</span>
                              </div>
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  step="1"
                                  placeholder="RH (cth: 55)"
                                  value={modalSuhuData[ruang]?.kel || ''}
                                  onChange={e => handleSuhuInputChange(ruang, 'kel', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] font-bold">%</span>
                              </div>
                            </div>
                          </div>

                          {/* Reference Bar H-1 & H+1 */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-[11px]">
                            <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-500" /> Ref:
                            </span>

                            {ref.prev && (ref.prev.suhu || ref.prev.kel) ? (
                              <button
                                type="button"
                                onClick={() => copySuhuRef(ruang, ref.prev!)}
                                title="Klik untuk menyalin nilai H-1 ini"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/90 hover:bg-amber-100 text-amber-900 border border-amber-200 font-medium transition-colors text-left group cursor-pointer"
                              >
                                <span className="font-bold text-amber-700">H-1 ({neighborInfo.prevDisplay}):</span>
                                <span>{ref.prev.suhu ? `${ref.prev.suhu}°C` : '-'} / {ref.prev.kel ? `${ref.prev.kel}%` : '-'}</span>
                                <span className="text-[9px] bg-amber-200 text-amber-800 group-hover:bg-amber-300 font-bold px-1.5 py-0.5 rounded transition-colors ml-1">
                                  Salin
                                </span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400 border border-slate-200/60 text-[10px]">
                                <span className="font-semibold text-slate-500">H-1 ({neighborInfo.prevDisplay}):</span> Tidak ada data
                              </span>
                            )}

                            {ref.next && (ref.next.suhu || ref.next.kel) ? (
                              <button
                                type="button"
                                onClick={() => copySuhuRef(ruang, ref.next!)}
                                title="Klik untuk menyalin nilai H+1 ini"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-50/90 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 font-medium transition-colors text-left group cursor-pointer"
                              >
                                <span className="font-bold text-cyan-700">H+1 ({neighborInfo.nextDisplay}):</span>
                                <span>{ref.next.suhu ? `${ref.next.suhu}°C` : '-'} / {ref.next.kel ? `${ref.next.kel}%` : '-'}</span>
                                <span className="text-[9px] bg-cyan-200 text-cyan-800 group-hover:bg-cyan-300 font-bold px-1.5 py-0.5 rounded transition-colors ml-1">
                                  Salin
                                </span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400 border border-slate-200/60 text-[10px]">
                                <span className="font-semibold text-slate-500">H+1 ({neighborInfo.nextDisplay}):</span> Tidak ada data
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Gas Inputs */}
              {(modalMode === 'BOTH' || modalMode === 'GAS') && (
                <div className="border border-emerald-200 bg-emerald-50/30 rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-2">
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                        Parameter Tekanan & Kebocoran Tabung Gas
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => copyAllGas('prev')}
                        className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold border border-amber-300 transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Salin Semua H-1 ({neighborInfo.prevDisplay})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyAllGas('next')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold border border-emerald-300 transition-colors flex items-center gap-1 shadow-2xs"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Salin Semua H+1 ({neighborInfo.nextDisplay})</span>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {TABUNG_GAS.map(gas => {
                      const ref = getGasReference(gas);
                      return (
                        <div key={gas} className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-2 shadow-2xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-700 sm:w-44 leading-tight">{gas}</span>
                            <div className="flex gap-2 flex-1">
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  step="0.1"
                                  placeholder="Flow"
                                  value={modalGasData[gas]?.flow || ''}
                                  onChange={e => handleGasInputChange(gas, 'flow', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-2.5 pr-8 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[9px] font-bold">L/m</span>
                              </div>
                              <div className="relative flex-1">
                                <input
                                  type="number"
                                  step="1"
                                  placeholder="Pressure"
                                  value={modalGasData[gas]?.pressure || ''}
                                  onChange={e => handleGasInputChange(gas, 'pressure', e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[9px] font-bold">psi</span>
                              </div>
                              <div className="w-24">
                                <select
                                  value={modalGasData[gas]?.leak || 'N'}
                                  onChange={e => handleGasInputChange(gas, 'leak', e.target.value as 'Y' | 'N')}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 focus:bg-white focus:outline-none"
                                >
                                  <option value="N">Aman (N)</option>
                                  <option value="Y">Bocor (Y)</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Keterangan Khusus Tabung Gas Ini */}
                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[11px] font-bold text-slate-500 shrink-0">Keterangan:</span>
                            <input
                              type="text"
                              value={modalGasData[gas]?.catatan || ''}
                              onChange={e => handleGasInputChange(gas, 'catatan', e.target.value)}
                              placeholder={gas.includes('Helium') ? "Cth: Penggantian tabung gas helium" : `Keterangan ${gas} (opsional)`}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                            />
                          </div>

                          {/* Reference Bar H-1 & H+1 */}
                          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-[11px]">
                            <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider flex items-center gap-1">
                              <Clock className="w-3 h-3 text-emerald-500" /> Ref:
                            </span>

                            {ref.prev && (ref.prev.flow || ref.prev.pressure || ref.prev.catatan) ? (
                              <button
                                type="button"
                                onClick={() => copyGasRef(gas, ref.prev!)}
                                title="Klik untuk menyalin nilai H-1 ini"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50/90 hover:bg-amber-100 text-amber-900 border border-amber-200 font-medium transition-colors text-left group cursor-pointer"
                              >
                                <span className="font-bold text-amber-700">H-1 ({neighborInfo.prevDisplay}):</span>
                                <span>Flow {ref.prev.flow || '-'} L/m, {ref.prev.pressure || '-'} psi (Leak: {ref.prev.leak}){ref.prev.catatan && ref.prev.catatan !== '-' ? ` • Ket: "${ref.prev.catatan}"` : ''}</span>
                                <span className="text-[9px] bg-amber-200 text-amber-800 group-hover:bg-amber-300 font-bold px-1.5 py-0.5 rounded transition-colors ml-1">
                                  Salin
                                </span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400 border border-slate-200/60 text-[10px]">
                                <span className="font-semibold text-slate-500">H-1 ({neighborInfo.prevDisplay}):</span> Tidak ada data
                              </span>
                            )}

                            {ref.next && (ref.next.flow || ref.next.pressure || ref.next.catatan) ? (
                              <button
                                type="button"
                                onClick={() => copyGasRef(gas, ref.next!)}
                                title="Klik untuk menyalin nilai H+1 ini"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-medium transition-colors text-left group cursor-pointer"
                              >
                                <span className="font-bold text-emerald-700">H+1 ({neighborInfo.nextDisplay}):</span>
                                <span>Flow {ref.next.flow || '-'} L/m, {ref.next.pressure || '-'} psi (Leak: {ref.next.leak}){ref.next.catatan && ref.next.catatan !== '-' ? ` • Ket: "${ref.next.catatan}"` : ''}</span>
                                <span className="text-[9px] bg-emerald-200 text-emerald-800 group-hover:bg-emerald-300 font-bold px-1.5 py-0.5 rounded transition-colors ml-1">
                                  Salin
                                </span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-50 text-slate-400 border border-slate-200/60 text-[10px]">
                                <span className="font-semibold text-slate-500">H+1 ({neighborInfo.nextDisplay}):</span> Tidak ada data
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tanda Tangan Petugas */}
              <div className="border border-slate-200 bg-slate-50/70 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PenTool className="w-4 h-4 text-amber-600" />
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Tanda Tangan Petugas <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => manualSigPadRef.current?.clear()}
                    className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Ulangi / Hapus
                  </button>
                </div>
                <div className="border-2 border-dashed border-amber-300 rounded-xl bg-white overflow-hidden shadow-inner">
                  <SignatureCanvas
                    ref={manualSigPadRef}
                    penColor="#1e293b"
                    canvasProps={{ className: 'w-full h-36 block touch-none cursor-crosshair' }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 text-center font-medium">
                  Bubuhkan tanda tangan di dalam area garis putus-putus. Tanda tangan ini otomatis tersimpan dan terverifikasi pada dokumen PDF (✓ TTD).
                </p>
              </div>

              {/* Overwrite option */}
              <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                <input
                  type="checkbox"
                  id="forceOverwrite"
                  checked={modalForceOverwrite}
                  onChange={e => setModalForceOverwrite(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                />
                <label htmlFor="forceOverwrite" className="text-xs font-medium text-slate-600 cursor-pointer select-none">
                  Timpa/perbarui data jika tanggal dan kategori ini sudah ada sebelumnya
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  disabled={modalSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <Button
                  type="submit"
                  disabled={modalSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {modalSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Laporan Pemantauan</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL LENGKAPI TANDA TANGAN (BACKFILL / SUSULAN TTD)           */}
      {/* ============================================================== */}
      {sigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                  <PenTool className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Lengkapi Tanda Tangan</h3>
                  <p className="text-xs text-indigo-100 font-medium">
                    {sigModalDate ? `Untuk data pemantauan tanggal ${sigModalDate}` : 'Terapkan tanda tangan ke data pemantauan yang belum bertanda tangan'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSigModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmitSigModal} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Nama Petugas / Inspektor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={sigModalPetugas}
                  onChange={e => setSigModalPetugas(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-2xs"
                />
              </div>

              {/* Signature Pad */}
              <div className="border border-slate-200 bg-slate-50/70 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Bubuhkan Tanda Tangan <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => dedicatedSigPadRef.current?.clear()}
                    className="px-2.5 py-1 text-[11px] font-bold text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Ulangi / Hapus
                  </button>
                </div>
                <div className="border-2 border-dashed border-indigo-300 rounded-xl bg-white overflow-hidden shadow-inner">
                  <SignatureCanvas
                    ref={dedicatedSigPadRef}
                    penColor="#1e293b"
                    canvasProps={{ className: 'w-full h-40 block touch-none cursor-crosshair' }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 text-center font-medium">
                  Tanda tangani di area di atas dengan jari atau stylus
                </p>
              </div>

              {/* Batch Apply Checkbox */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3 flex items-start gap-2.5 cursor-pointer" onClick={() => setSigModalApplyAll(!sigModalApplyAll)}>
                <input
                  type="checkbox"
                  id="sigModalApplyAll"
                  checked={sigModalApplyAll}
                  onChange={e => setSigModalApplyAll(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-indigo-300 cursor-pointer mt-0.5"
                />
                <label htmlFor="sigModalApplyAll" className="text-xs font-medium text-indigo-950 cursor-pointer select-none leading-relaxed">
                  <strong>Terapkan ke SEMUA data susulan saya</strong> yang belum memiliki tanda tangan di database (termasuk tanggal 13 Sep, 16 Sep, 17 Sep, 01 Okt).
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSigModalOpen(false)}
                  disabled={sigModalSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <Button
                  type="submit"
                  disabled={sigModalSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  {sigModalSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan TTD...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan & Terapkan TTD</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL EDIT RECORD DATABASE LANGSUNG (KHUSUS DEVELOPER)         */}
      {/* ============================================================== */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full flex flex-col overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-600 to-blue-700 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Edit Record Database #{editingRecord.id}</h3>
                  <p className="text-xs text-cyan-100 font-medium">
                    ID Pemantauan: {editingRecord.idPemantauan || '-'} • Kategori: {editingRecord.kategori || 'GAS'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSaveEditRecord} className="p-5 sm:p-6 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Tanggal Operasional <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editFormData.tanggal || ''}
                    onChange={e => setEditFormData({ ...editFormData, tanggal: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Jam Pemeriksaan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="08:00"
                    value={editFormData.jam || ''}
                    onChange={e => setEditFormData({ ...editFormData, jam: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Shift <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editFormData.shift || 'Pagi'}
                    onChange={e => setEditFormData({ ...editFormData, shift: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="Pagi">Pagi</option>
                    <option value="Malam">Malam</option>
                    <option value="Longshift">Longshift</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Lokasi / Ruangan / Tabung Gas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.lokasiArea || ''}
                  onChange={e => setEditFormData({ ...editFormData, lokasiArea: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>

              {/* Sensor Parameters */}
              {editingRecord.kategori === 'GAS' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Flow Gas (L/min)
                    </label>
                    <input
                      type="text"
                      placeholder="1.50"
                      value={editFormData.flowGas ?? ''}
                      onChange={e => setEditFormData({ ...editFormData, flowGas: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Tekanan Gas (psi)
                    </label>
                    <input
                      type="text"
                      placeholder="149"
                      value={editFormData.tekananGasPsi ?? ''}
                      onChange={e => setEditFormData({ ...editFormData, tekananGasPsi: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Suhu (°C)
                    </label>
                    <input
                      type="text"
                      placeholder="22.5"
                      value={editFormData.suhuCelcius ?? ''}
                      onChange={e => setEditFormData({ ...editFormData, suhuCelcius: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                      Kelembapan (% RH)
                    </label>
                    <input
                      type="text"
                      placeholder="55"
                      value={editFormData.kelembapanPersen ?? ''}
                      onChange={e => setEditFormData({ ...editFormData, kelembapanPersen: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold text-slate-800 bg-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Nama Petugas / Inspektor <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.inspektorPetugas || ''}
                  onChange={e => setEditFormData({ ...editFormData, inspektorPetugas: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Catatan / Remark
                </label>
                <input
                  type="text"
                  placeholder="Catatan tambahan (opsional)"
                  value={editFormData.catatanRemark || ''}
                  onChange={e => setEditFormData({ ...editFormData, catatanRemark: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteRecord(editingRecord)}
                  disabled={isDeletingRecord}
                  className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Dari DB</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingRecord(null)}
                    disabled={isSavingEdit}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Batal
                  </button>
                  <Button
                    type="submit"
                    disabled={isSavingEdit}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    {isSavingEdit ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Simpan Perubahan</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guest & Auditor Master Barcode Modal */}
      <GuestBarcodeModal 
        isOpen={showGuestQrModal} 
        onClose={() => setShowGuestQrModal(false)} 
      />
    </div>
  );
}
