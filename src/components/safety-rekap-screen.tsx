import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ClipboardList, RefreshCw, Download, Search, ArrowLeft, Table2, Users, Pencil, X, Save,
  RotateCcw, CheckCircle2, CircleDashed, Palmtree, ShieldCheck, ClipboardCheck, CalendarDays
} from 'lucide-react';
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
const EDITOR_NIKS = ['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'preplabadmin'];

// Nilai sel tanggal: 'YYYY-MM-DD', '√' (sudah tanpa tanggal), '' (wajib tapi belum), null (tidak wajib → sel gelap)
type DateVal = string | null;

interface RekapValues {
  isCuti: boolean;
  ktaDone: boolean;
  tglKta: DateVal;
  tglTta1: DateVal;
  tglTta2: DateVal;
  inspeksiDone: boolean;
  keteranganInspeksi: string;
  tglInspeksi: DateVal;
}

interface RekapRow extends RekapValues {
  nik: string;
  name: string;
  jabatan: string;
  auto: RekapValues;
  edit?: any;
}

type StatusFilter = 'ALL' | 'BELUM' | 'LENGKAP' | 'CUTI';

function toIsoDate(ts: any): string {
  if (!ts) return '';
  const d = new Date(ts);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatShortDate(v: DateVal): string {
  if (!v || v === '√') return v || '';
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return v;
  return `${d}-${MONTHS_SHORT[m - 1]}-${String(y).slice(-2)}`;
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
function buildKtaCells(emp: any): Pick<RekapValues, 'ktaDone' | 'tglKta' | 'tglTta1' | 'tglTta2'> {
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

  const cell = (sub: Sub | undefined, required: boolean): DateVal => {
    if (sub) return toIsoDate(sub.ts) || '√';
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

// Data edit tersimpan → nilai efektif. Tanggal: null = otomatis, '-' = tidak wajib, '' = kosong
function applyEdit(auto: RekapValues, edit: any): RekapValues {
  if (!edit) return auto;
  const date = (stored: any, fallback: DateVal): DateVal =>
    stored === null || stored === undefined ? fallback : stored === '-' ? null : stored;
  const bool = (stored: any, fallback: boolean) => (typeof stored === 'boolean' ? stored : fallback);
  return {
    isCuti: bool(edit.isCuti, auto.isCuti),
    ktaDone: bool(edit.ktaDone, auto.ktaDone),
    tglKta: date(edit.tglKta, auto.tglKta),
    tglTta1: date(edit.tglTta1, auto.tglTta1),
    tglTta2: date(edit.tglTta2, auto.tglTta2),
    inspeksiDone: bool(edit.inspeksiDone, auto.inspeksiDone),
    keteranganInspeksi: edit.keteranganInspeksi ?? auto.keteranganInspeksi,
    tglInspeksi: date(edit.tglInspeksi, auto.tglInspeksi)
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

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

// ─── Dialog edit baris ────────────────────────────────────────────────────────

type DateMode = 'date' | 'empty' | 'na';

function dateToForm(v: DateVal): { mode: DateMode; date: string } {
  if (v === null) return { mode: 'na', date: '' };
  if (v === '' ) return { mode: 'empty', date: '' };
  return { mode: 'date', date: v === '√' ? '' : v };
}

function DateField({ label, value, onChange }: { label: string; value: { mode: DateMode; date: string }; onChange: (v: { mode: DateMode; date: string }) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</label>
      <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-[var(--input-bg)] border border-[var(--border-main)]">
        {([['date', 'Tanggal'], ['empty', 'Belum'], ['na', 'Tdk Wajib']] as const).map(([m, l]) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange({ ...value, mode: m })}
            className={`py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${value.mode === m ? 'bg-[var(--card-bg)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          >
            {l}
          </button>
        ))}
      </div>
      {value.mode === 'date' && (
        <input
          type="date"
          value={value.date}
          onChange={e => onChange({ mode: 'date', date: e.target.value })}
          className="w-full h-9 px-2.5 rounded-lg border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        />
      )}
    </div>
  );
}

function StatusToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</label>
      <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-[var(--input-bg)] border border-[var(--border-main)]">
        {[true, false].map(v => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v)}
            className={`py-1.5 rounded-md text-xs font-bold cursor-pointer transition-colors ${
              value === v
                ? v ? 'bg-emerald-600 text-white shadow-sm' : 'bg-rose-600 text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            {v ? 'Lengkap' : 'Belum'}
          </button>
        ))}
      </div>
    </div>
  );
}

interface EditDialogProps {
  row: RekapRow;
  week: string;
  year: number;
  editorNik: string;
  editorName: string;
  onClose: () => void;
  onSaved: () => void;
}

function EditRowDialog({ row, week, year, editorNik, editorName, onClose, onSaved }: EditDialogProps) {
  const [isCuti, setIsCuti] = useState(row.isCuti);
  const [ktaDone, setKtaDone] = useState(row.ktaDone);
  const [tglKta, setTglKta] = useState(dateToForm(row.tglKta));
  const [tglTta1, setTglTta1] = useState(dateToForm(row.tglTta1));
  const [tglTta2, setTglTta2] = useState(dateToForm(row.tglTta2));
  const [inspeksiDone, setInspeksiDone] = useState(row.inspeksiDone);
  const [keterangan, setKeterangan] = useState(row.keteranganInspeksi);
  const [tglInspeksi, setTglInspeksi] = useState(dateToForm(row.tglInspeksi));
  const [catatan, setCatatan] = useState<string>(row.edit?.catatan || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Simpan hanya nilai yang berbeda dari data otomatis (null = ikut otomatis)
  const diffDate = (form: { mode: DateMode; date: string }, auto: DateVal): string | null => {
    const autoForm = dateToForm(auto);
    if (form.mode === autoForm.mode && (form.mode !== 'date' || form.date === autoForm.date)) return null;
    if (form.mode === 'na') return '-';
    if (form.mode === 'empty') return '';
    return form.date || null;
  };
  const diffBool = (v: boolean, auto: boolean) => (v === auto ? null : v);

  const handleSave = async () => {
    if ([tglKta, tglTta1, tglTta2, tglInspeksi].some(f => f.mode === 'date' && !f.date)) {
      toast.error('Isi tanggal atau pilih "Belum" / "Tdk Wajib"');
      return;
    }
    setSaving(true);
    try {
      const a = row.auto;
      const res = await fetch('/api/safety-rekap/edits', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week, year, nik: row.nik, name: row.name,
          isCuti: diffBool(isCuti, a.isCuti),
          ktaDone: diffBool(ktaDone, a.ktaDone),
          tglKta: diffDate(tglKta, a.tglKta),
          tglTta1: diffDate(tglTta1, a.tglTta1),
          tglTta2: diffDate(tglTta2, a.tglTta2),
          inspeksiDone: diffBool(inspeksiDone, a.inspeksiDone),
          keteranganInspeksi: keterangan.trim() === a.keteranganInspeksi.trim() ? null : keterangan.trim(),
          tglInspeksi: diffDate(tglInspeksi, a.tglInspeksi),
          catatan: catatan.trim() || null,
          editorNik, editorName
        })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Gagal menyimpan');
      toast.success(`Rekap ${row.name} berhasil diperbarui`);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menyimpan perubahan');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/safety-rekap/edits?week=${week}&year=${year}&nik=${encodeURIComponent(row.nik)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Gagal mereset');
      toast.success(`Rekap ${row.name} dikembalikan ke data otomatis`);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Gagal mereset data');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[92dvh] flex flex-col bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-main)]">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Edit Rekap · {week} {year}</p>
            <h3 className="text-base font-bold text-[var(--text-main)] truncate">{row.name}</h3>
            <p className="text-xs text-[var(--text-muted)] truncate">{row.nik} · {row.jabatan}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--input-bg)] cursor-pointer" title="Tutup">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <label className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] cursor-pointer">
            <span className="flex items-center gap-2 text-sm font-semibold text-[var(--text-main)]">
              <Palmtree className="w-4 h-4 text-sky-500" /> Personil sedang cuti / off minggu ini
            </span>
            <input type="checkbox" checked={isCuti} onChange={e => setIsCuti(e.target.checked)} className="w-4 h-4 accent-sky-600 cursor-pointer" />
          </label>

          <fieldset disabled={isCuti} className={`space-y-5 ${isCuti ? 'opacity-40' : ''}`}>
            <section className="space-y-3">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                <ShieldCheck className="w-4 h-4" /> Observasi KTA / TTA
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <StatusToggle label="Status KTA/TTA" value={ktaDone} onChange={setKtaDone} />
                <DateField label="Tanggal KTA" value={tglKta} onChange={setTglKta} />
                <DateField label="Tanggal TTA 1" value={tglTta1} onChange={setTglTta1} />
                <DateField label="Tanggal TTA 2" value={tglTta2} onChange={setTglTta2} />
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <ClipboardCheck className="w-4 h-4" /> Inspeksi Terencana
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <StatusToggle label="Status Inspeksi" value={inspeksiDone} onChange={setInspeksiDone} />
                <DateField label="Tanggal Inspeksi" value={tglInspeksi} onChange={setTglInspeksi} />
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Keterangan Inspeksi</label>
                  <input
                    value={keterangan}
                    onChange={e => setKeterangan(e.target.value)}
                    placeholder="Contoh: Inspeksi Umum Terencana Gudang Laboratorium"
                    className="w-full h-9 px-3 rounded-lg border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                </div>
              </div>
            </section>
          </fieldset>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-muted)]">Catatan Perubahan (opsional)</label>
            <textarea
              value={catatan}
              onChange={e => setCatatan(e.target.value)}
              rows={2}
              placeholder="Alasan koreksi, mis. bukti dikirim via WhatsApp"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30 resize-none"
            />
          </div>

          {row.edit && (
            <p className="text-[11px] text-[var(--text-muted)]">
              Terakhir diedit oleh <span className="font-semibold">{row.edit.updatedByName || row.edit.updatedByNik}</span>
              {row.edit.updatedAt ? ` · ${new Date(row.edit.updatedAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-[var(--border-main)] bg-[var(--input-bg)]">
          {row.edit ? (
            <button
              onClick={handleReset}
              disabled={saving}
              className="h-9 px-3 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset ke Otomatis
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-[var(--border-main)] bg-[var(--card-bg)] text-xs font-bold text-[var(--text-main)] cursor-pointer">
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="h-9 px-4 rounded-lg bg-[var(--primary)] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Simpan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Layar utama ─────────────────────────────────────────────────────────────

export function SafetyRekapScreen({ inspectorNik, inspectorName, inspectorRole, inspectorSection, onBack }: SafetyRekapScreenProps) {
  const today = useMemo(() => new Date(), []);
  const currentYear = useMemo(() => getISOWeekYear(today), [today]);
  const currentWeek = useMemo(() => getISOWeek(today), [today]);
  const weekOptions = useMemo(() => buildWeekOptions(currentYear, currentWeek), [currentYear, currentWeek]);

  const [view, setView] = useState<'tabel' | 'detail'>('tabel');
  const [selectedWeek, setSelectedWeek] = useState(`W${currentWeek}`);
  const [inspeksiData, setInspeksiData] = useState<{ rekapList: any[]; cutiList: any[] }>({ rekapList: [], cutiList: [] });
  const [ktaData, setKtaData] = useState<{ rekapList: any[]; cutiList: any[] }>({ rekapList: [], cutiList: [] });
  const [edits, setEdits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [editingRow, setEditingRow] = useState<RekapRow | null>(null);

  const canEdit = useMemo(() => {
    const role = (inspectorRole || '').toLowerCase();
    const section = (inspectorSection || '').toLowerCase();
    return EDITOR_NIKS.includes(inspectorNik) || inspectorNik.startsWith('02D24') ||
      ['manager', 'superintendent', 'admin', 'safety'].some(k => role.includes(k)) || section.includes('admin');
  }, [inspectorNik, inspectorRole, inspectorSection]);

  const weekNum = parseInt(selectedWeek.replace(/\D/g, ''), 10) || currentWeek;
  const weekRange = useMemo(() => getISOWeekRange(currentYear, weekNum), [currentYear, weekNum]);
  // Bulan laporan mengikuti hari Kamis (penentu minggu ISO)
  const reportMonth = useMemo(() => {
    const thu = new Date(weekRange.start);
    thu.setDate(thu.getDate() + 3);
    return `${MONTHS_FULL[thu.getMonth()]} ${thu.getFullYear()}`;
  }, [weekRange]);
  const rangeLabel = useMemo(() => {
    const s = weekRange.start, e = weekRange.end;
    const startPart = s.getMonth() === e.getMonth() ? `${s.getDate()}` : `${s.getDate()} ${MONTHS_FULL[s.getMonth()]}`;
    return `${startPart} - ${e.getDate()} ${MONTHS_FULL[e.getMonth()]} ${e.getFullYear()}`;
  }, [weekRange]);

  const fetchEdits = useCallback(async (week: string) => {
    try {
      const res = await fetch(`/api/safety-rekap/edits?week=${week}&year=${currentYear}`);
      setEdits(res.ok ? await res.json() : []);
    } catch {
      setEdits([]);
    }
  }, [currentYear]);

  const fetchData = useCallback(async (week: string, refresh = false) => {
    setLoading(true);
    try {
      const q = `week=${week}${refresh ? '&refresh=true' : ''}`;
      const [inspRes, ktaRes] = await Promise.all([
        fetch(`/api/rekap-inspeksi?${q}`),
        fetch(`/api/rekap-kta?${q}`),
        fetchEdits(week)
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
  }, [fetchEdits]);

  useEffect(() => {
    if (view === 'tabel') fetchData(selectedWeek);
  }, [selectedWeek, view, fetchData]);

  const allRows = useMemo<RekapRow[]>(() => {
    const map = new Map<string, { nik: string; name: string; jabatan: string; auto: RekapValues }>();
    const ensure = (emp: any, isCuti: boolean) => {
      const key = (emp.nik || '').toString().trim().toUpperCase();
      let entry = map.get(key);
      if (!entry) {
        entry = {
          nik: emp.nik, name: emp.name || '-', jabatan: emp.jabatan || '-',
          auto: {
            isCuti, ktaDone: false, tglKta: '', tglTta1: '', tglTta2: null,
            inspeksiDone: false, keteranganInspeksi: '', tglInspeksi: ''
          }
        };
        map.set(key, entry);
      }
      if (isCuti) entry.auto.isCuti = true;
      return entry;
    };

    inspeksiData.rekapList.filter(isValidEmployee).forEach(emp => {
      const { auto } = ensure(emp, false);
      const cd = emp.checkDetails || {};
      auto.inspeksiDone = emp.status === 'SUDAH';
      auto.keteranganInspeksi = emp.pdfTitle || cd.pdfTitle || '';
      auto.tglInspeksi = toIsoDate(cd.pdfTimestamp || cd.ssTimestamp || emp.completedAt);
    });
    ktaData.rekapList.filter(isValidEmployee).forEach(emp => {
      Object.assign(ensure(emp, false).auto, buildKtaCells(emp));
    });
    [...inspeksiData.cutiList, ...ktaData.cutiList].filter(isValidEmployee).forEach(emp => ensure(emp, true));

    const editMap = new Map(edits.map(e => [String(e.nik).trim().toUpperCase(), e]));
    return Array.from(map.entries())
      .map(([key, e]) => {
        const edit = editMap.get(key);
        return { ...e, ...applyEdit(e.auto, edit), edit };
      })
      .sort((a, b) => jabatanRank(a.jabatan) - jabatanRank(b.jabatan) || a.name.localeCompare(b.name));
  }, [inspeksiData, ktaData, edits]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRows.filter(r => {
      if (q && !r.name.toLowerCase().includes(q) && !(r.nik || '').toLowerCase().includes(q) && !r.jabatan.toLowerCase().includes(q)) return false;
      if (statusFilter === 'CUTI') return r.isCuti;
      if (statusFilter === 'LENGKAP') return !r.isCuti && r.ktaDone && r.inspeksiDone;
      if (statusFilter === 'BELUM') return !r.isCuti && (!r.ktaDone || !r.inspeksiDone);
      return true;
    });
  }, [allRows, search, statusFilter]);

  const summary = useMemo(() => {
    const active = allRows.filter(r => !r.isCuti);
    const kta = active.filter(r => r.ktaDone).length;
    const insp = active.filter(r => r.inspeksiDone).length;
    return {
      total: active.length,
      cuti: allRows.length - active.length,
      kta, insp,
      lengkap: active.filter(r => r.ktaDone && r.inspeksiDone).length,
      belum: active.filter(r => !r.ktaDone || !r.inspeksiDone).length,
      ktaPct: active.length ? Math.round((kta / active.length) * 100) : 0,
      inspPct: active.length ? Math.round((insp / active.length) * 100) : 0
    };
  }, [allRows]);

  const handleDownloadExcel = () => {
    try {
      const header = ['NO', 'Nama Karyawan', 'NIK', 'Jabatan', '(KTA/TTA)', 'TANGGAL KTA', 'TANGGAL TTA 1', 'TANGGAL TTA 2', '(INSPEKSI)', 'KETERANGAN INSPEKSI', 'TANGGAL INSPEKSI'];
      const dateVal = (v: DateVal, cuti: boolean) => (cuti ? 'CUTI' : v === null ? '-' : formatShortDate(v));
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
          r.isCuti ? '' : formatShortDate(r.tglInspeksi)
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

  // ─── Cell renderers ───
  const td = 'px-3 py-2.5 border-b border-[var(--border-main)] text-[13px] align-middle';
  const naStyle: React.CSSProperties = {
    backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 6px, transparent 6px 12px)'
  };

  const statusBadge = (done: boolean) => done ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/25 text-[11px] font-bold">
      <CheckCircle2 className="w-3.5 h-3.5" /> Lengkap
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-700 dark:text-rose-400 ring-1 ring-inset ring-rose-500/25 text-[11px] font-bold">
      <CircleDashed className="w-3.5 h-3.5" /> Belum
    </span>
  );

  const dateCell = (v: DateVal, key: string) => {
    if (v === null) {
      return <td key={key} className={`${td} bg-slate-900 dark:bg-black border-l border-l-slate-800`} style={naStyle} title="Tidak wajib" />;
    }
    if (v === '') {
      return <td key={key} className={`${td} text-center border-l border-l-[var(--border-main)]`}><span className="text-rose-400 dark:text-rose-500 font-bold">—</span></td>;
    }
    return (
      <td key={key} className={`${td} text-center whitespace-nowrap tabular-nums font-medium border-l border-l-[var(--border-main)]`}>
        {v === '√' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" /> : formatShortDate(v)}
      </td>
    );
  };

  const filterChips: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'ALL', label: 'Semua', count: allRows.length },
    { id: 'BELUM', label: 'Belum Lengkap', count: summary.belum },
    { id: 'LENGKAP', label: 'Lengkap', count: summary.lengkap },
    { id: 'CUTI', label: 'Cuti', count: summary.cuti }
  ];

  const th = 'px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-b border-[var(--border-main)] whitespace-nowrap';
  const colCount = canEdit ? 11 : 10;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 w-full px-2 sm:px-4 lg:px-6">
      <PageHeader
        title="Rekap KTA/TTA & Inspeksi"
        description="Kepatuhan mingguan laporan observasi KTA/TTA dan inspeksi terencana Prep & Lab"
        icon={<ClipboardList />}
      >
        {onBack && (
          <button onClick={onBack} className="h-9 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        )}
      </PageHeader>

      <div className="inline-grid grid-cols-2 gap-1 bg-[var(--input-bg)] p-1 rounded-xl border border-[var(--border-main)]">
        {([
          { id: 'tabel', label: 'Tabel Rekap', icon: <Table2 className="w-3.5 h-3.5" /> },
          { id: 'detail', label: 'Detail & Aksi Personil', icon: <Users className="w-3.5 h-3.5" /> }
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`py-1.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              view === t.id ? 'bg-[var(--card-bg)] text-[var(--text-main)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
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
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Personil Wajib</p>
              <p className="text-2xl font-black text-[var(--text-main)] mt-1">{summary.total}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">{summary.lengkap} lengkap · {summary.belum} belum</p>
            </div>
            {[
              { label: 'KTA / TTA', done: summary.kta, pct: summary.ktaPct, bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
              { label: 'Inspeksi Terencana', done: summary.insp, pct: summary.inspPct, bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' }
            ].map(k => (
              <div key={k.label} className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-4 shadow-sm">
                <div className="flex items-baseline justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{k.label}</p>
                  <p className={`text-sm font-black ${k.text}`}>{k.pct}%</p>
                </div>
                <p className="text-2xl font-black text-[var(--text-main)] mt-1">{k.done}<span className="text-base text-[var(--text-muted)] font-bold">/{summary.total}</span></p>
                <div className="h-1.5 mt-2 rounded-full bg-[var(--input-bg)] overflow-hidden">
                  <div className={`h-full rounded-full ${k.bar} transition-all duration-500`} style={{ width: `${k.pct}%` }} />
                </div>
              </div>
            ))}
            <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl p-4 shadow-sm">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Cuti / Off</p>
              <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">{summary.cuti}</p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Tidak dihitung dalam target</p>
            </div>
          </div>

          {/* Tabel */}
          <div className="bg-[var(--card-bg)] border border-[var(--border-main)] rounded-2xl shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col xl:flex-row xl:items-center gap-3 p-3 sm:p-4 border-b border-[var(--border-main)]">
              <div className="flex items-center gap-3 min-w-0 xl:mr-auto">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-black text-[var(--text-main)] leading-tight">{reportMonth}</h2>
                  <p className="text-xs text-[var(--text-muted)]">{selectedWeek} · {rangeLabel}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="sm:w-64 [&>div]:mb-0">
                  <Select value={selectedWeek} onChange={e => setSelectedWeek(e.target.value)}>
                    {weekOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </div>
                <div className="relative sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Cari nama, NIK, jabatan..."
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] text-sm text-[var(--text-main)] outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchData(selectedWeek, true)}
                    disabled={loading}
                    className="h-10 flex-1 sm:flex-none px-3 rounded-xl border border-[var(--border-main)] bg-[var(--input-bg)] hover:bg-[var(--bg-main)] text-[var(--text-main)] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Segarkan
                  </button>
                  <button
                    onClick={handleDownloadExcel}
                    disabled={loading || rows.length === 0}
                    className="h-10 flex-1 sm:flex-none px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Excel
                  </button>
                </div>
              </div>
            </div>

            {/* Filter status */}
            <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-[var(--border-main)] bg-[var(--input-bg)]/50">
              {filterChips.map(c => (
                <button
                  key={c.id}
                  onClick={() => setStatusFilter(c.id)}
                  className={`h-7 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    statusFilter === c.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : 'bg-[var(--card-bg)] text-[var(--text-muted)] border border-[var(--border-main)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {c.label}
                  <span className={`px-1.5 rounded-full text-[10px] ${statusFilter === c.id ? 'bg-white/20 dark:bg-slate-900/15' : 'bg-[var(--input-bg)]'}`}>{c.count}</span>
                </button>
              ))}
              {!canEdit && (
                <span className="ml-auto text-[11px] text-[var(--text-muted)]">Mode lihat saja</span>
              )}
            </div>

            <div className="overflow-auto max-h-[72vh]">
              <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-[var(--text-main)]">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th colSpan={3} className={`${th} text-left`}>Identitas Karyawan</th>
                    <th colSpan={4} className={`${th} text-center border-l border-l-[var(--border-main)] !text-amber-700 dark:!text-amber-400`}>
                      <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Observasi KTA / TTA</span>
                    </th>
                    <th colSpan={3} className={`${th} text-center border-l border-l-[var(--border-main)] !text-emerald-700 dark:!text-emerald-400`}>
                      <span className="inline-flex items-center gap-1.5"><ClipboardCheck className="w-3.5 h-3.5" /> Inspeksi Terencana</span>
                    </th>
                    {canEdit && <th className={`${th} border-l border-l-[var(--border-main)]`} />}
                  </tr>
                  <tr>
                    <th className={`${th} w-12 text-center`}>No</th>
                    <th className={`${th} text-left`}>Nama / NIK</th>
                    <th className={`${th} text-left`}>Jabatan</th>
                    <th className={`${th} text-center border-l border-l-[var(--border-main)]`}>Status</th>
                    <th className={`${th} text-center border-l border-l-[var(--border-main)]`}>Tgl KTA</th>
                    <th className={`${th} text-center border-l border-l-[var(--border-main)]`}>Tgl TTA 1</th>
                    <th className={`${th} text-center border-l border-l-[var(--border-main)]`}>Tgl TTA 2</th>
                    <th className={`${th} text-center border-l border-l-[var(--border-main)]`}>Status</th>
                    <th className={`${th} text-left border-l border-l-[var(--border-main)]`}>Keterangan Inspeksi</th>
                    <th className={`${th} text-center border-l border-l-[var(--border-main)]`}>Tgl Inspeksi</th>
                    {canEdit && <th className={`${th} w-16 text-center border-l border-l-[var(--border-main)]`}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading && allRows.length === 0 ? (
                    <tr>
                      <td colSpan={colCount} className="px-3 py-16 text-center text-sm text-[var(--text-muted)]">
                        <RefreshCw className="w-4 h-4 animate-spin inline mr-2" /> Memuat rekap {selectedWeek}...
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={colCount} className="px-3 py-16 text-center text-sm text-[var(--text-muted)]">Tidak ada data yang cocok untuk {selectedWeek}.</td>
                    </tr>
                  ) : rows.map((r, i) => (
                    <tr key={r.nik} className="group hover:bg-[var(--input-bg)]/70 transition-colors">
                      <td className={`${td} text-center text-[var(--text-muted)] tabular-nums`}>{i + 1}</td>
                      <td className={td}>
                        <div className="flex items-center gap-2.5 min-w-[200px]">
                          <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-slate-700 dark:text-slate-100 text-[11px] font-black flex items-center justify-center">
                            {initials(r.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold leading-tight flex items-center gap-1.5">
                              {r.name}
                              {r.edit && (
                                <span title={`Diedit oleh ${r.edit.updatedByName || r.edit.updatedByNik}${r.edit.catatan ? ` — ${r.edit.catatan}` : ''}`} className="inline-flex items-center gap-0.5 px-1.5 py-px rounded bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[9px] font-bold uppercase">
                                  <Pencil className="w-2.5 h-2.5" /> Edit
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] font-mono text-[var(--text-muted)]">{r.nik}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`${td} text-[var(--text-muted)] min-w-[180px]`}>{r.jabatan}</td>

                      {r.isCuti ? (
                        <td colSpan={7} className={`${td} border-l border-l-[var(--border-main)] bg-sky-500/[0.06]`}>
                          <div className="flex items-center justify-center gap-2 text-sky-700 dark:text-sky-400 text-xs font-bold">
                            <Palmtree className="w-4 h-4" /> CUTI / OFF ROSTER — tidak termasuk target minggu ini
                          </div>
                        </td>
                      ) : (
                        <>
                          <td className={`${td} text-center border-l border-l-[var(--border-main)]`}>{statusBadge(r.ktaDone)}</td>
                          {dateCell(r.tglKta, 'kta')}
                          {dateCell(r.tglTta1, 'tta1')}
                          {dateCell(r.tglTta2, 'tta2')}
                          <td className={`${td} text-center border-l border-l-[var(--border-main)]`}>{statusBadge(r.inspeksiDone)}</td>
                          <td className={`${td} border-l border-l-[var(--border-main)] min-w-[260px]`}>
                            {r.keteranganInspeksi || <span className="text-[var(--text-muted)] italic">Belum ada laporan</span>}
                          </td>
                          {dateCell(r.tglInspeksi, 'insp')}
                        </>
                      )}

                      {canEdit && (
                        <td className={`${td} text-center border-l border-l-[var(--border-main)]`}>
                          <button
                            onClick={() => setEditingRow(r)}
                            className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 cursor-pointer transition-colors"
                            title={`Edit rekap ${r.name}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-2.5 border-t border-[var(--border-main)] text-[11px] text-[var(--text-muted)]">
              <span>Menampilkan <b className="text-[var(--text-main)]">{rows.length}</b> dari {allRows.length} personil</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-slate-900 inline-block rounded-sm" style={naStyle} /> Tidak wajib</span>
              <span className="flex items-center gap-1.5"><span className="text-rose-500 font-bold">—</span> Belum dipenuhi</span>
              <span className="flex items-center gap-1.5"><Pencil className="w-3 h-3 text-amber-600" /> Dikoreksi manual</span>
            </div>
          </div>
        </>
      )}

      {editingRow && (
        <EditRowDialog
          row={editingRow}
          week={selectedWeek}
          year={currentYear}
          editorNik={inspectorNik}
          editorName={inspectorName}
          onClose={() => setEditingRow(null)}
          onSaved={() => { setEditingRow(null); fetchEdits(selectedWeek); }}
        />
      )}
    </div>
  );
}
