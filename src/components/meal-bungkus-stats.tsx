import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CalendarDays, Download, Loader2, Package, TrendingUp, Truck, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { MEAL_SLOTS, MEAL_SLOT_LABEL, type MealSlot } from '../utils/meal-bungkus-counts';
import { getISOWeek, getISOWeekYear } from '../utils/iso-week';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// ===== Rekapan Bungkusan: list & diagram bungkusan per hari / minggu / bulan =====
// Data harian dari /api/meal-orders/bungkus-stats (disimpan per tanggal × perusahaan × waktu makan di server).

interface DailyRow { orderDate: string; company: string; slot: MealSlot; lapangan: number; bungkusKantin: number; makanKantin: number; karyawan: number }
type Granularity = 'day' | 'week' | 'month';
type CompanyFilter = 'all' | 'TBP' | 'GPS';

interface PeriodRow {
  key: string; label: string; sub: string; date?: string;
  slots: Record<MealSlot, number>; lapangan: number; bungkusKantin: number; makanKantin: number; total: number;
  days: number; karyawan: number;
}

const SLOT_COLOR: Record<MealSlot, string> = { pagi: '#0ea5e9', sahur: '#8b5cf6', siang: '#f59e0b', sore: '#10b981', takjil: '#ec4899', malam: '#475569' };
const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const parseYmd = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd)); };
const toYmd = (d: Date) => d.toISOString().slice(0, 10);
const shortDate = (d: string) => { const x = parseYmd(d); return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]}`; };
const emptySlots = (): Record<MealSlot, number> => ({ pagi: 0, sahur: 0, siang: 0, sore: 0, takjil: 0, malam: 0 });
// Minggu ISO dihitung dari tengah hari lokal agar tanggal tidak bergeser zona waktu
const isoWeekOf = (d: string) => { const [y, m, dd] = d.split('-').map(Number); const local = new Date(y, m - 1, dd, 12); return { year: getISOWeekYear(local), week: getISOWeek(local) }; };

const UI = {
  panel: 'rounded-2xl bg-white border border-slate-200/80 shadow-sm',
  seg: 'inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1',
  segBtn: (on: boolean) => `h-8 px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${on ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-900'}`,
  input: 'h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-600/15',
  btn: 'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
  stat: 'rounded-xl bg-white border border-slate-200/80 px-4 py-3 shadow-sm',
  th: 'px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600 bg-slate-50 border-b border-slate-200 whitespace-nowrap',
  td: 'px-3 py-2 text-xs text-slate-700 border-b border-slate-100 whitespace-nowrap tabular-nums',
};

export function MealBungkusStats({ date, onOpenDate }: { date: string; onOpenDate?: (date: string) => void }) {
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [company, setCompany] = useState<CompanyFilter>('all');
  const [month, setMonth] = useState(() => date.slice(0, 7));
  const [year, setYear] = useState(() => Number(date.slice(0, 4)));

  // Rentang data: Harian = 1 bulan; Mingguan & Bulanan = 1 tahun
  const range = useMemo(() => {
    if (granularity === 'day') {
      const [y, m] = month.split('-').map(Number);
      return { from: toYmd(new Date(Date.UTC(y, m - 1, 1))), to: toYmd(new Date(Date.UTC(y, m, 0))) };
    }
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }, [granularity, month, year]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['meal-bungkus-stats', range.from, range.to],
    queryFn: async (): Promise<DailyRow[]> => {
      const res = await fetch(`/api/meal-orders/bungkus-stats?from=${range.from}&to=${range.to}`);
      const json = await res.json();
      if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Gagal memuat Rekapan Bungkusan');
      return json.data;
    },
    staleTime: 60 * 1000,
  });

  const rows = useMemo(() => (data || []).filter(r => company === 'all' || r.company === company), [data, company]);

  // Kelompokkan per hari / minggu ISO / bulan
  const periods = useMemo<PeriodRow[]>(() => {
    const map = new Map<string, PeriodRow & { dates: Set<string>; staffByDate: Map<string, number> }>();
    for (const r of rows) {
      let key: string, label: string, sub: string, d: string | undefined;
      if (granularity === 'day') {
        key = r.orderDate; d = r.orderDate;
        const x = parseYmd(r.orderDate);
        label = `${DAYS_SHORT[x.getUTCDay()]}, ${shortDate(r.orderDate)}`; sub = '';
      } else if (granularity === 'week') {
        const { year: wy, week } = isoWeekOf(r.orderDate);
        key = `${wy}-W${String(week).padStart(2, '0')}`; label = `W${String(week).padStart(2, '0')}`; sub = '';
      } else {
        const x = parseYmd(r.orderDate);
        key = r.orderDate.slice(0, 7); label = `${MONTHS_LONG[x.getUTCMonth()]} ${x.getUTCFullYear()}`; sub = '';
      }
      const p = map.get(key) || { key, label, sub, date: d, slots: emptySlots(), lapangan: 0, bungkusKantin: 0, makanKantin: 0, total: 0, days: 0, karyawan: 0, dates: new Set<string>(), staffByDate: new Map<string, number>() };
      const b = r.lapangan + r.bungkusKantin;
      p.slots[r.slot] += b; p.lapangan += r.lapangan; p.bungkusKantin += r.bungkusKantin; p.makanKantin += r.makanKantin; p.total += b;
      // karyawan sama untuk setiap slot di tanggal & perusahaan yang sama → hitung sekali per (tanggal, perusahaan)
      const sk = `${r.orderDate}|${r.company}`;
      if (!p.staffByDate.has(sk)) p.staffByDate.set(sk, r.karyawan);
      map.set(key, p);
    }
    return Array.from(map.values())
      .map(p => {
        const perDate = new Map<string, number>();
        p.staffByDate.forEach((n, k) => { const dd = k.split('|')[0]; perDate.set(dd, (perDate.get(dd) || 0) + n); });
        const workDays = Array.from(perDate.entries()).filter(([, n]) => n > 0);
        const dateList = Array.from(perDate.keys()).sort();
        const sub = granularity === 'week' && dateList.length ? `${shortDate(dateList[0])} – ${shortDate(dateList[dateList.length - 1])}` : p.sub;
        return { ...p, sub, days: workDays.length, karyawan: workDays.length ? Math.round(workDays.reduce((s, [, n]) => s + n, 0) / workDays.length) : 0 };
      })
      .filter(p => p.days > 0 || p.total > 0)
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [rows, granularity]);

  const visibleSlots = useMemo(() => MEAL_SLOTS.filter(s => periods.some(p => p.slots[s] > 0) || ['pagi', 'siang', 'sore', 'malam'].includes(s)), [periods]);
  const grand = useMemo(() => {
    const g = { slots: emptySlots(), lapangan: 0, bungkusKantin: 0, makanKantin: 0, total: 0, days: 0 };
    for (const p of periods) {
      MEAL_SLOTS.forEach(s => { g.slots[s] += p.slots[s]; });
      g.lapangan += p.lapangan; g.bungkusKantin += p.bungkusKantin; g.makanKantin += p.makanKantin; g.total += p.total; g.days += p.days;
    }
    return g;
  }, [periods]);
  const peak = useMemo(() => periods.reduce<PeriodRow | null>((m, p) => (!m || p.total > m.total ? p : m), null), [periods]);
  const unit = granularity === 'day' ? 'hari' : granularity === 'week' ? 'minggu' : 'bulan';

  const chartData = useMemo(() => ({
    labels: periods.map(p => p.label),
    datasets: visibleSlots.map(s => ({
      label: MEAL_SLOT_LABEL[s], data: periods.map(p => p.slots[s]),
      backgroundColor: SLOT_COLOR[s], borderRadius: 4, maxBarThickness: 46, stack: 'bungkus',
    })),
  }), [periods, visibleSlots]);

  const exportExcel = async () => {
    if (periods.length === 0) return;
    const XLSX = await import('xlsx');
    const head = ['Periode', ...(granularity === 'day' ? [] : ['Rentang', 'Hari Order']), ...visibleSlots.map(s => MEAL_SLOT_LABEL[s]), 'B. Lapangan', 'B. Kantin', 'Total Bungkus', 'Makan Kantin (CR)', 'Rata-rata Karyawan'];
    const body = periods.map(p => [
      granularity === 'day' ? p.date : p.label, ...(granularity === 'day' ? [] : [p.sub, p.days]),
      ...visibleSlots.map(s => p.slots[s]), p.lapangan, p.bungkusKantin, p.total, p.makanKantin, p.karyawan,
    ]);
    const total = ['TOTAL', ...(granularity === 'day' ? [] : ['', grand.days]), ...visibleSlots.map(s => grand.slots[s]), grand.lapangan, grand.bungkusKantin, grand.total, grand.makanKantin, ''];
    const ws = XLSX.utils.aoa_to_sheet([head, ...body, total]);
    ws['!cols'] = head.map((_, i) => ({ wch: i === 0 ? 14 : 11 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Rekap ${unit}`);
    const scope = company === 'all' ? 'Gabungan' : company;
    XLSX.writeFile(wb, `Rekapan_Bungkusan_${unit}_${granularity === 'day' ? month : year}_${scope}.xlsx`);
    toast.success('Rekapan Bungkusan diexport');
  };

  const years = useMemo(() => { const y = new Date().getFullYear(); return [y + 1, y, y - 1, y - 2]; }, []);

  return (
    <div className="space-y-4">
      {/* Kontrol */}
      <div className={`${UI.panel} p-4 sm:p-5`}>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-900 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-700" />Rekapan Bungkusan {isFetching && !isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}</p>
            <p className="text-xs text-slate-500 mt-0.5">Data bungkus tersimpan per hari dari Orderan Makanan · Bungkus Lapangan + Bungkus Kantin (NR)</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={UI.seg}>
              {([['day', 'Per Hari'], ['week', 'Per Minggu'], ['month', 'Per Bulan']] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setGranularity(k)} className={UI.segBtn(granularity === k)}>{l}</button>
              ))}
            </div>
            <div className={UI.seg}>
              {([['all', 'Gabungan'], ['TBP', 'PT TBP'], ['GPS', 'PT GPS']] as const).map(([k, l]) => (
                <button key={k} type="button" onClick={() => setCompany(k)} className={UI.segBtn(company === k)}>{l}</button>
              ))}
            </div>
            {granularity === 'day' ? (
              <input type="month" value={month} onChange={e => e.target.value && setMonth(e.target.value)} className={UI.input} title="Bulan" />
            ) : (
              <select value={year} onChange={e => setYear(Number(e.target.value))} className={`${UI.input} cursor-pointer`} title="Tahun">
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
            <button type="button" onClick={exportExcel} disabled={periods.length === 0} className={UI.btn}><Download className="w-4 h-4 text-slate-500" /> Export Excel</button>
          </div>
        </div>
      </div>

      {error ? (
        <div className={`${UI.panel} p-8 text-center text-sm text-rose-600`}>{(error as Error).message}</div>
      ) : isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />)}</div>
      ) : periods.length === 0 ? (
        <div className={`${UI.panel} p-10 text-center`}>
          <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">Belum ada data bungkusan pada {granularity === 'day' ? `${MONTHS_LONG[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}` : `tahun ${year}`}</p>
          <p className="text-xs text-slate-500 mt-0.5">Rekapan tersimpan otomatis setiap kali Orderan Makanan suatu tanggal terisi.</p>
        </div>
      ) : (
        <>
          {/* Kartu ringkasan periode */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className={UI.stat}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1"><Package className="w-3 h-3" />Total Bungkusan</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700">{grand.total.toLocaleString('id-ID')} <span className="text-xs font-normal text-slate-400">bungkus</span></p>
              <p className="text-[11px] text-slate-500">{periods.length} {unit} · {grand.days} hari order</p>
            </div>
            <div className={UI.stat}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1"><CalendarDays className="w-3 h-3" />Rata-rata per Hari</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{grand.days ? Math.round(grand.total / grand.days).toLocaleString('id-ID') : 0} <span className="text-xs font-normal text-slate-400">bungkus</span></p>
              <p className="text-[11px] text-slate-500">dari hari yang ada orderannya</p>
            </div>
            <div className={UI.stat}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" />Tertinggi</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{peak?.total.toLocaleString('id-ID') || 0} <span className="text-xs font-normal text-slate-400">bungkus</span></p>
              <p className="text-[11px] text-slate-500 truncate">{peak ? `${peak.label}${peak.sub ? ` · ${peak.sub}` : ''}` : '-'}</p>
            </div>
            <div className={UI.stat}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1"><Truck className="w-3 h-3" />Lapangan · Kantin</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{grand.lapangan.toLocaleString('id-ID')}<span className="text-sm font-medium text-slate-400"> · {grand.bungkusKantin.toLocaleString('id-ID')}</span></p>
              <p className="text-[11px] text-slate-500 flex items-center gap-1"><Utensils className="w-3 h-3" />Makan kantin (CR): {grand.makanKantin.toLocaleString('id-ID')}</p>
            </div>
          </div>

          {/* Diagram */}
          <div className={`${UI.panel} p-4 sm:p-5`}>
            <p className="text-sm font-bold text-slate-900">Diagram Bungkusan per {unit === 'hari' ? 'Hari' : unit === 'minggu' ? 'Minggu' : 'Bulan'}</p>
            <p className="text-xs text-slate-500 mb-3">Bertumpuk per waktu makan · {company === 'all' ? 'TBP & GPS' : `PT ${company}`}</p>
            <div className="h-[320px]">
              <Bar
                data={chartData}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11 } } },
                    tooltip: { callbacks: { footer: items => `Total: ${items.reduce((s, i) => s + Number(i.raw || 0), 0)} bungkus` } },
                  },
                  scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0, autoSkip: true } },
                    y: { stacked: true, beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 }, precision: 0 } },
                  },
                }}
              />
            </div>
          </div>

          {/* List */}
          <div className={`${UI.panel} p-4 sm:p-5 space-y-3`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-900">List Bungkusan per {unit === 'hari' ? 'Hari' : unit === 'minggu' ? 'Minggu' : 'Bulan'}</p>
                {granularity === 'day' && onOpenDate && <p className="text-xs text-slate-500">Klik baris untuk membuka Orderan Makanan tanggal tersebut</p>}
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse text-center">
                <thead>
                  <tr>
                    <th className={`${UI.th} text-left`}>{granularity === 'day' ? 'Tanggal' : granularity === 'week' ? 'Minggu' : 'Bulan'}</th>
                    {granularity !== 'day' && <th className={UI.th}>Hari Order</th>}
                    {visibleSlots.map(s => (
                      <th key={s} className={UI.th}><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: SLOT_COLOR[s] }} />{MEAL_SLOT_LABEL[s]}</span></th>
                    ))}
                    <th className={UI.th}>B. Lapangan</th>
                    <th className={UI.th}>B. Kantin</th>
                    <th className={`${UI.th} !text-emerald-800`}>Total</th>
                    <th className={UI.th}>Makan Kantin</th>
                    <th className={UI.th}>Karyawan</th>
                  </tr>
                </thead>
                <tbody>
                  {periods.map(p => {
                    const clickable = granularity === 'day' && !!onOpenDate && !!p.date;
                    return (
                      <tr key={p.key} onClick={clickable ? () => onOpenDate!(p.date!) : undefined} className={`hover:bg-slate-50 ${clickable ? 'cursor-pointer' : ''} ${p.date === date ? 'bg-emerald-50/60' : ''}`}>
                        <td className={`${UI.td} text-left`}>
                          <span className="font-semibold text-slate-900">{p.label}</span>
                          {p.sub && <span className="block text-[10px] text-slate-500">{p.sub}</span>}
                        </td>
                        {granularity !== 'day' && <td className={UI.td}>{p.days}</td>}
                        {visibleSlots.map(s => <td key={s} className={UI.td}>{p.slots[s] || <span className="text-slate-300">-</span>}</td>)}
                        <td className={UI.td}>{p.lapangan}</td>
                        <td className={UI.td}>{p.bungkusKantin}</td>
                        <td className={`${UI.td} font-bold text-emerald-700`}>{p.total}</td>
                        <td className={`${UI.td} text-slate-500`}>{p.makanKantin}</td>
                        <td className={`${UI.td} text-slate-500`}>{p.karyawan || '-'}{granularity !== 'day' && p.karyawan ? <span className="text-[10px]"> /hari</span> : null}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-bold text-slate-900">
                    <td className={`${UI.td} text-left !text-slate-900 border-t-2 border-slate-200`}>TOTAL</td>
                    {granularity !== 'day' && <td className={`${UI.td} border-t-2 border-slate-200`}>{grand.days}</td>}
                    {visibleSlots.map(s => <td key={s} className={`${UI.td} border-t-2 border-slate-200`}>{grand.slots[s]}</td>)}
                    <td className={`${UI.td} border-t-2 border-slate-200`}>{grand.lapangan}</td>
                    <td className={`${UI.td} border-t-2 border-slate-200`}>{grand.bungkusKantin}</td>
                    <td className={`${UI.td} border-t-2 border-slate-200 !text-emerald-700`}>{grand.total}</td>
                    <td className={`${UI.td} border-t-2 border-slate-200`}>{grand.makanKantin}</td>
                    <td className={`${UI.td} border-t-2 border-slate-200`} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
