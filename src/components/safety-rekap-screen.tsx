import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { ClipboardList, RefreshCw, Download, Search, ArrowLeft, Table2, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { PageHeader } from './PageHeader';
import { Select } from './ui';
import { GroupReportScreen, getKtaObligation } from './GroupReportScreen';
import { getISOWeek, getISOWeekYear, getISOWeekRange } from '../utils/iso-week';

interface SafetyRekapScreenProps {
  inspectorNik: string;
  inspectorName: string;
  inspectorRole?: string;
  inspectorSection?: string;
  onBack?: () => void;
}

const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

// Personil yang dikecualikan dari rekap (sama dengan filter di modul SAP)
const EXCLUDED_NIKS = ['04D24000052', '02D23000050', '04D25000062', '04D25000045', 'M0405240291', 'M0210190719'];

// Nilai sel tanggal: string tanggal, '' (wajib tapi belum), atau null (tidak berlaku → sel hitam)
type DateCell = string | '' | null;

interface RekapRow {
  nik: string;
  name: string;
  jabatan: string;
  isCuti: boolean;
  ktaDone: boolean;
  tglKta: DateCell;
  tglTta1: DateCell;
  tglTta2: DateCell;
  inspeksiDone: boolean;
  keteranganInspeksi: string;
  tglInspeksi: string;
}

function formatShortDate(ts: any): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()}-${MONTHS_SHORT[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
}

function isValidEmployee(emp: any): boolean {
  const rawNik = (emp.nik || '').toString().trim();
  const rawName = (emp.name || '').toString().trim();
  const rawSection = (emp.section || '').toString().trim();
  const rawStatus = (emp.statusKaryawan || '').toString().trim().toUpperCase();
  if (!rawNik || rawNik.includes('#N/A') || rawNik.toUpperCase() === 'N/A' || rawName.includes('#N/A')) return false;
  if (rawSection.includes('#N/A') || rawSection.toUpperCase() === 'N/A') return false;
  if (rawStatus.includes('RESIGN') || rawStatus.includes('PHK') || rawStatus.includes('KELUAR') || rawStatus.includes('INACTIVE')) return false;
  if (EXCLUDED_NIKS.includes(rawNik)) return false;
  const nikLower = rawNik.toLowerCase();
  const nameLower = rawName.toLowerCase();
  if (
    nikLower.includes('demo') || nameLower.includes('demo') || nameLower.includes('staging') ||
    nameLower.includes('test') || nikLower.includes('admin') || nameLower.includes('admin')
  ) return false;
  return true;
}

// Urutan jabatan: Manager → Superintendent → Supervisor → Foreman → lainnya
function jabatanRank(jabatan: string): number {
  const j = (jabatan || '').toLowerCase();
  if (j.includes('manager')) return 0;
  if (j.includes('superintendent')) return 1;
  if (j.includes('supervisor')) return 2;
  if (j.includes('foreman')) return 3;
  return 4;
}

// Tentukan kolom KTA / TTA 1 / TTA 2 berdasarkan kewajiban & laporan aktual
function buildKtaCells(emp: any): Pick<RekapRow, 'ktaDone' | 'tglKta' | 'tglTta1' | 'tglTta2'> {
  const obligation = emp.obligation || getKtaObligation(emp.nik, emp.jabatan, emp.section);
  const cd = emp.checkDetails || {};
  const isDone = emp.status === 'SUDAH';

  type Sub = { type: 'KTA' | 'TTA'; ts: any };
  let subs: Sub[] = [];
  if (Array.isArray(emp.reports) && emp.reports.length > 0) {
    subs = emp.reports.map((r: any) => ({
      type: String(r.reportType || 'KTA').toUpperCase().includes('TTA') ? 'TTA' : 'KTA',
      ts: r.timestamp || r.date || null
    }));
  } else {
    if (cd.check1Done && cd.check1Label) subs.push({ type: String(cd.check1Label).toUpperCase().includes('TTA') ? 'TTA' : 'KTA', ts: cd.check1Timestamp || emp.completedAt });
    if (cd.check2Done && cd.check2Label) subs.push({ type: String(cd.check2Label).toUpperCase().includes('TTA') ? 'TTA' : 'KTA', ts: cd.check2Timestamp || emp.completedAt });
  }
  subs.sort((a, b) => (a.ts ? new Date(a.ts).getTime() : 0) - (b.ts ? new Date(b.ts).getTime() : 0));

  const ktaSub = subs.find(s => s.type === 'KTA');
  const ttaSubs = subs.filter(s => s.type === 'TTA');

  let needKta = false, needTta1 = false, needTta2 = false;
  if (obligation.type === '1_KTA_AND_1_TTA') {
    const viaTwoTta = isDone && !ktaSub && ttaSubs.length >= 2;
    needKta = !viaTwoTta;
    needTta1 = true;
    needTta2 = viaTwoTta;
  } else if (obligation.type === '2_TTA') {
    needTta1 = true;
    needTta2 = true;
  } else if (!isDone) {
    // 1_KTA_OR_TTA: cukup salah satu
    needKta = true;
    needTta1 = true;
  } else if (subs.length === 0) {
    needKta = true;
  }

  const cell = (sub: Sub | undefined, required: boolean): DateCell => {
    if (sub) return formatShortDate(sub.ts) || '√';
    if (required) return emp.isManualOverride && isDone ? '√' : '';
    return null;
  };

  return {
    ktaDone: isDone,
    tglKta: cell(ktaSub, needKta),
    tglTta1: cell(ttaSubs[0], needTta1),
    tglTta2: cell(ttaSubs[1], needTta2)
  };
}

function buildWeekOptions(year: number, currentWeek: number) {
  const options: { value: string; label: string }[] = [];
  const start = Math.max(1, currentWeek - 8);
  const end = Math.min(53, currentWeek + 1);
  for (let w = end; w >= start; w--) {
    const { start: s, end: e } = getISOWeekRange(year, w);
    options.push({
      value: `W${w}`,
      label: `Week ${w} (${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} - ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]})${w === currentWeek ? ' [Aktif]' : ''}`
    });
  }
  return options;
}

export function SafetyRekapScreen({ inspectorNik, inspectorName, inspectorRole, inspectorSection, onBack }: SafetyRekapScreenProps) {
  const today = useMemo(() => new Date(), []);
  const currentYear = useMemo(() => getISOWeekYear(today), [today]);
  const currentWeek = useMemo(() => getISOWeek(today), [today]);
  const weekOptions = useMemo(() => buildWeekOptions(currentYear, currentWeek), [currentYear, currentWeek]);

  const [view, setView] = useState<'tabel' | 'detail'>('tabel');
  const [selectedWeek, setSelectedWeek] = useState(`W${currentWeek}`);
  const [inspeksiData, setInspeksiData] = useState<{ rekapList: any[]; cutiList: any[] }>({ rekapList: [], cutiList: [] });
  const [ktaData, setKtaData] = useState<{ rekapList: any[]; cutiList: any[] }>({ rekapList: [], cutiList: [] });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const weekNum = parseInt(selectedWeek.replace(/\D/g, ''), 10) || currentWeek;
  const weekRange = useMemo(() => getISOWeekRange(currentYear, weekNum), [currentYear, weekNum]);
  // Bulan laporan mengikuti hari Kamis (penentu minggu ISO)
  const reportMonth = useMemo(() => {
    const thu = new Date(weekRange.start);
    thu.setDate(thu.getDate() + 3);
    return MONTHS_FULL[thu.getMonth()];
  }, [weekRange]);
  const rangeLabel = useMemo(() => {
    const s = weekRange.start, e = weekRange.end;
    const startPart = s.getMonth() === e.getMonth() ? `${s.getDate()}` : `${s.getDate()} ${MONTHS_FULL[s.getMonth()]}`;
    return `${startPart} - ${e.getDate()} ${MONTHS_FULL[e.getMonth()]} ${e.getFullYear()}`;
  }, [weekRange]);

  const fetchData = useCallback(async (week: string, refresh = false) => {
    setLoading(true);
    try {
      const q = `week=${week}${refresh ? '&refresh=true' : ''}`;
      const [inspRes, ktaRes] = await Promise.all([
        fetch(`/api/rekap-inspeksi?${q}`),
        fetch(`/api/rekap-kta?${q}`)
      ]);
      const inspJson = inspRes.ok ? await inspRes.json() : {};
      const ktaJson = ktaRes.ok ? await ktaRes.json() : {};
      setInspeksiData({ rekapList: inspJson.rekapList || [], cutiList: inspJson.cutiList || [] });
      setKtaData({ rekapList: ktaJson.rekapList || [], cutiList: ktaJson.cutiList || [] });
      if (!inspRes.ok || !ktaRes.ok) toast.error('Sebagian data rekap gagal dimuat');
    } catch (err) {
      console.error('Error fetching rekap safety:', err);
      toast.error('Gagal memuat rekap KTA/TTA & Inspeksi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'tabel') fetchData(selectedWeek);
  }, [selectedWeek, view, fetchData]);

  const rows = useMemo<RekapRow[]>(() => {
    const map = new Map<string, RekapRow>();
    const keyOf = (emp: any) => (emp.nik || '').toString().trim().toUpperCase();
    const ensure = (emp: any, isCuti: boolean): RekapRow => {
      const key = keyOf(emp);
      let row = map.get(key);
      if (!row) {
        row = {
          nik: emp.nik, name: emp.name || '-', jabatan: emp.jabatan || '-', isCuti,
          ktaDone: false, tglKta: '', tglTta1: '', tglTta2: null,
          inspeksiDone: false, keteranganInspeksi: '', tglInspeksi: ''
        };
        map.set(key, row);
      }
      if (isCuti) row.isCuti = true;
      return row;
    };

    inspeksiData.rekapList.filter(isValidEmployee).forEach(emp => {
      const row = ensure(emp, false);
      const cd = emp.checkDetails || {};
      row.inspeksiDone = emp.status === 'SUDAH';
      row.keteranganInspeksi = emp.pdfTitle || cd.pdfTitle || '';
      row.tglInspeksi = formatShortDate(cd.pdfTimestamp || cd.ssTimestamp || emp.completedAt);
    });
    ktaData.rekapList.filter(isValidEmployee).forEach(emp => {
      Object.assign(ensure(emp, false), buildKtaCells(emp));
    });
    [...inspeksiData.cutiList, ...ktaData.cutiList].filter(isValidEmployee).forEach(emp => ensure(emp, true));

    const q = search.trim().toLowerCase();
    return Array.from(map.values())
      .filter(r => !q || r.name.toLowerCase().includes(q) || (r.nik || '').toLowerCase().includes(q) || r.jabatan.toLowerCase().includes(q))
      .sort((a, b) => jabatanRank(a.jabatan) - jabatanRank(b.jabatan) || a.name.localeCompare(b.name));
  }, [inspeksiData, ktaData, search]);

  const summary = useMemo(() => {
    const active = rows.filter(r => !r.isCuti);
    return {
      total: active.length,
      cuti: rows.length - active.length,
      kta: active.filter(r => r.ktaDone).length,
      inspeksi: active.filter(r => r.inspeksiDone).length
    };
  }, [rows]);

  const handleDownloadExcel = () => {
    try {
      const header = ['NO', 'Nama Karyawan', 'NIK', 'Jabatan', '(KTA/TTA)', 'TANGGAL KTA', 'TANGGAL TTA 1', 'TANGGAL TTA 2', '(INSPEKSI)', 'KETERANGAN INSPEKSI', 'TANGGAL INSPEKSI'];
      const dateVal = (v: DateCell, cuti: boolean) => (cuti ? 'CUTI' : v === null ? '-' : v);
      const aoa: any[][] = [
        [reportMonth],
        [rangeLabel],
        header,
        ...rows.map((r, i) => [
          i + 1, r.name, r.nik, r.jabatan,
          r.isCuti ? 'CUTI' : r.ktaDone ? '√' : '',
          dateVal(r.tglKta, r.isCuti), dateVal(r.tglTta1, r.isCuti), dateVal(r.tglTta2, r.isCuti),
          r.isCuti ? 'CUTI' : r.inspeksiDone ? '√' : '',
          r.isCuti ? 'CUTI' : r.keteranganInspeksi,
          r.isCuti ? '' : r.tglInspeksi
        ])
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: header.length - 1 } }
      ];
      ws['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 14 }, { wch: 34 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 11 }, { wch: 55 }, { wch: 16 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Rekap_${selectedWeek}`);
      XLSX.writeFile(wb, `Rekap_KTA_TTA_Inspeksi_${selectedWeek}_${currentYear}.xlsx`);
      toast.success('File Excel berhasil diunduh');
    } catch (err) {
      console.error('Error exporting rekap safety:', err);
      toast.error('Gagal mengunduh file Excel');
    }
  };

  const th = 'px-2 py-2 border border-slate-300 dark:border-slate-600 font-bold text-[10px] sm:text-xs uppercase text-slate-800 dark:text-slate-100 bg-slate-200 dark:bg-slate-800 whitespace-nowrap';
  const td = 'px-2 py-1.5 border border-slate-300 dark:border-slate-700 text-xs whitespace-nowrap';
  const check = <span className="text-base font-bold leading-none text-emerald-600 dark:text-emerald-400">√</span>;
  const cutiCell = <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400">CUTI</span>;

  const renderDateCell = (v: DateCell, isCuti: boolean) => {
    if (isCuti) return <td className={`${td} text-center bg-sky-50 dark:bg-sky-950/30`}>{cutiCell}</td>;
    if (v === null) return <td className={`${td} bg-black dark:bg-black`} />;
    if (v === '') return <td className={`${td} bg-rose-50 dark:bg-rose-950/30`} />;
    return <td className={`${td} text-center`}>{v === '√' ? check : v}</td>;
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 w-full max-w-7xl mx-auto px-2 sm:px-4">
      <PageHeader
        title="Rekap KTA/TTA & Inspeksi"
        description="Rekap mingguan laporan observasi KTA/TTA dan inspeksi terencana Prep & Lab"
        icon={<ClipboardList />}
      >
        {onBack && (
          <button onClick={onBack} className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        )}
      </PageHeader>

      <div className="grid grid-cols-2 gap-2 bg-[var(--input-bg)] p-1 rounded-2xl border border-[var(--border-main)]">
        {([
          { id: 'tabel', label: 'Tabel Rekap', icon: <Table2 className="w-3.5 h-3.5" /> },
          { id: 'detail', label: 'Detail & Aksi Personil', icon: <Users className="w-3.5 h-3.5" /> }
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              view === t.id ? 'bg-[var(--primary)] text-white shadow-md' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {view === 'detail' ? (
        <GroupReportScreen
          mode="rekap"
          inspectorName={inspectorName}
          inspectorNik={inspectorNik}
          inspectorRole={inspectorRole}
          inspectorSection={inspectorSection}
        />
      ) : (
        <>
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="sm:w-72 [&>div]:mb-0">
              <Select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}>
                {weekOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </div>
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari nama, NIK, atau jabatan..."
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchData(selectedWeek, true)}
                disabled={loading}
                className="h-10 px-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
              </button>
              <button
                onClick={handleDownloadExcel}
                disabled={loading || rows.length === 0}
                className="h-10 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <Download className="w-3.5 h-3.5" /> Excel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'Personil Wajib', value: summary.total, cls: 'text-[var(--text-main)]' },
              { label: 'KTA/TTA Lengkap', value: `${summary.kta}/${summary.total}`, cls: 'text-amber-600 dark:text-amber-400' },
              { label: 'Inspeksi Lengkap', value: `${summary.inspeksi}/${summary.total}`, cls: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Cuti', value: summary.cuti, cls: 'text-sky-600 dark:text-sky-400' }
            ].map(s => (
              <div key={s.label} className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-3 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{s.label}</p>
                <p className={`text-xl font-black ${s.cls}`}>{s.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white dark:bg-slate-900 border border-[var(--border-main)] rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-slate-800 dark:text-slate-200">
                <thead>
                  <tr>
                    <th colSpan={11} className="px-2 py-2 border border-slate-300 dark:border-slate-600 bg-slate-300 dark:bg-slate-700 text-lg sm:text-2xl font-black text-slate-900 dark:text-white">
                      {reportMonth}
                    </th>
                  </tr>
                  <tr>
                    <th colSpan={11} className="px-2 py-1.5 border border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white">
                      {rangeLabel}
                    </th>
                  </tr>
                  <tr>
                    <th className={th}>No</th>
                    <th className={`${th} min-w-[180px]`}>Nama Karyawan</th>
                    <th className={th}>NIK</th>
                    <th className={`${th} min-w-[180px]`}>Jabatan</th>
                    <th className={th}>(KTA/TTA)</th>
                    <th className={th}>Tanggal KTA</th>
                    <th className={th}>Tanggal TTA 1</th>
                    <th className={th}>Tanggal TTA 2</th>
                    <th className={th}>(Inspeksi)</th>
                    <th className={`${th} min-w-[280px]`}>Keterangan Inspeksi</th>
                    <th className={th}>Tanggal Inspeksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-10 text-center text-sm text-[var(--text-muted)]">
                        <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Memuat rekap {selectedWeek}...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-3 py-10 text-center text-sm text-[var(--text-muted)]">Tidak ada data rekap untuk {selectedWeek}.</td>
                    </tr>
                  ) : rows.map((r, i) => (
                    <tr key={r.nik} className="odd:bg-white even:bg-sky-50/60 dark:odd:bg-slate-900 dark:even:bg-slate-800/50">
                      <td className={`${td} text-center`}>{i + 1}</td>
                      <td className={td}>{r.name}</td>
                      <td className={`${td} font-mono`}>{r.nik}</td>
                      <td className={td}>{r.jabatan}</td>
                      <td className={`${td} text-center ${!r.isCuti && !r.ktaDone ? 'bg-rose-50 dark:bg-rose-950/30' : ''}`}>
                        {r.isCuti ? cutiCell : r.ktaDone ? check : null}
                      </td>
                      {renderDateCell(r.tglKta, r.isCuti)}
                      {renderDateCell(r.tglTta1, r.isCuti)}
                      {renderDateCell(r.tglTta2, r.isCuti)}
                      <td className={`${td} text-center ${!r.isCuti && !r.inspeksiDone ? 'bg-rose-50 dark:bg-rose-950/30' : ''}`}>
                        {r.isCuti ? cutiCell : r.inspeksiDone ? check : null}
                      </td>
                      <td className={`${td} text-center`}>{r.isCuti ? cutiCell : r.keteranganInspeksi}</td>
                      <td className={`${td} text-center`}>{r.isCuti ? '' : r.tglInspeksi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 border-t border-[var(--border-main)] text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-black inline-block rounded-sm" /> Tidak wajib</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 bg-rose-100 border border-rose-300 inline-block rounded-sm" /> Belum dipenuhi</span>
              <span className="flex items-center gap-1"><span className="font-bold text-emerald-600">√</span> Sudah lengkap</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
