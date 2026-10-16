import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Plus, Edit3, Trash2, Loader2, X, Search, ShieldCheck, AlertTriangle, Clock, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Input, Select, Textarea, Button } from './ui';
import {
  CERT_TYPES, CERT_META, certStatus, certWarningDate, defaultCertExpired, type CertType, type TrainingCertification,
} from '../utils/training-certifications';

// ===== Sertifikasi K3 & Kompetensi (Training External) =====
// Satu grup per jenis sertifikat (Ahli K3 Kimia, Petugas K3 Kimia, Proteksi Radiasi, Teknisi K3 Listrik, Juru Las III)

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const fmtDate = (d: string | null) => {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return '-';
  const [y, m, dd] = d.split('-').map(Number);
  return `${String(dd).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`;
};
const todayYmd = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const STATUS_UI = {
  active: { label: 'Aktif', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  soon: { label: 'Warning', cls: 'bg-amber-50 text-amber-800 border-amber-300' },
  expired: { label: 'Expired', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  unknown: { label: 'Masa berlaku ?', cls: 'bg-slate-50 text-slate-500 border-slate-200' },
} as const;

type FormState = { id?: number; certType: CertType; nama: string; nik: string; jabatan: string; pt: string; tanggal: string; keterangan: string; expired: string; note: string };
const emptyForm = (certType: CertType): FormState => ({ certType, nama: '', nik: '', jabatan: '', pt: 'TBP', tanggal: '', keterangan: 'Lulus', expired: '', note: '' });

export function TrainingCertificationsPanel() {
  const queryClient = useQueryClient();
  const today = todayYmd();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CertType | 'all'>('all');
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrainingCertification | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['training-certifications'],
    queryFn: async (): Promise<{ data: TrainingCertification[]; access: { viewAll: boolean; canManage: boolean } }> => {
      const res = await fetch('/api/training-certifications');
      const json = await res.json();
      if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Gagal memuat data sertifikasi');
      return json;
    },
    staleTime: 60 * 1000,
  });
  const rows = data?.data ?? [];
  const canManage = !!data?.access?.canManage;

  // Master karyawan untuk isi otomatis form (NIK, jabatan, PT)
  const { data: employees = [] } = useQuery({
    queryKey: ['employees-master-lite'],
    queryFn: async (): Promise<any[]> => { const r = await fetch('/api/employees'); const j = await r.json(); return Array.isArray(j) ? j : []; },
    enabled: !!form,
    staleTime: 10 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => (typeFilter === 'all' || r.certType === typeFilter)
      && (!q || [r.nama, r.nik, r.jabatan, r.pt].some(v => String(v || '').toLowerCase().includes(q))));
  }, [rows, search, typeFilter]);

  const stats = useMemo(() => {
    const s = { total: rows.length, people: new Set(rows.map(r => r.nik || r.nama.toLowerCase())).size, active: 0, soon: 0, expired: 0 };
    for (const r of rows) {
      const st = certStatus(r.expired, today).status;
      if (st === 'active') s.active++; else if (st === 'soon') s.soon++; else if (st === 'expired') s.expired++;
    }
    return s;
  }, [rows, today]);

  const updateForm = (key: keyof FormState, value: string) => setForm(prev => {
    if (!prev) return prev;
    const next = { ...prev, [key]: value } as FormState;
    // Pilih karyawan dari master → NIK, jabatan & PT terisi otomatis
    if (key === 'nama') {
      const emp = employees.find(e => String(e.name || '').trim().toLowerCase() === value.trim().toLowerCase());
      if (emp) { next.nik = emp.nik || ''; next.jabatan = prev.jabatan || emp.jabatan || emp.position || ''; next.pt = String(emp.pt || prev.pt || '').toUpperCase().includes('GPS') ? 'GPS' : 'TBP'; }
    }
    return next;
  });
  const autoExpired = form ? defaultCertExpired(form.certType, form.tanggal) : null;

  const submit = async () => {
    if (!form) return;
    if (!form.nama.trim()) { toast.error('Nama karyawan wajib diisi'); return; }
    setSaving(true);
    try {
      const body = { ...form, expired: form.expired || autoExpired || '' };
      const res = await fetch(form.id ? `/api/training-certifications/${form.id}` : '/api/training-certifications', {
        method: form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Gagal menyimpan');
      toast.success(form.id ? 'Data sertifikasi diperbarui' : `${form.nama} ditambahkan ke ${CERT_META[form.certType].title}`);
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ['training-certifications'] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/training-certifications/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || json.status !== 'success') throw new Error(json.message || 'Gagal menghapus');
      toast.success(`${deleteTarget.nama} dihapus dari ${CERT_META[deleteTarget.certType]?.title || 'sertifikasi'}`);
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['training-certifications'] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    const aoa: (string | number)[][] = [];
    for (const meta of CERT_TYPES) {
      const list = rows.filter(r => r.certType === meta.type);
      if (list.length === 0) continue;
      aoa.push([`${meta.title.toUpperCase()} — Masa Berlaku ${meta.validYears ?? '?'} Tahun (${meta.issuer})`]);
      aoa.push(['Nama Karyawan', 'NIK', 'Jabatan', 'PT', 'Tanggal Training/Ujian', 'Keterangan', 'Tanggal Expired', 'Status', 'Note']);
      for (const r of list) aoa.push([r.nama, r.nik || '', r.jabatan || '', r.pt || '', r.tanggal || '', r.keterangan || '', r.expired || '', STATUS_UI[certStatus(r.expired, today).status].label, r.note || '']);
      aoa.push([]);
    }
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 32 }, { wch: 6 }, { wch: 20 }, { wch: 12 }, { wch: 16 }, { wch: 15 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Sertifikasi K3');
    XLSX.writeFile(wb, `Sertifikasi_K3_Kompetensi_${today}.xlsx`);
  };

  const th = 'px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap border-b border-slate-200';
  const td = 'px-3 py-2 text-xs text-slate-700 border-b border-slate-100 align-middle';

  return (
    <div className="space-y-4">
      {/* Ringkasan */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: <Award className="w-3.5 h-3.5" />, label: 'Sertifikat Tercatat', value: stats.total, hint: `${stats.people} personel · ${CERT_TYPES.length} jenis`, tone: 'text-slate-900' },
          { icon: <ShieldCheck className="w-3.5 h-3.5" />, label: 'Aktif', value: stats.active, hint: 'masa berlaku > 1 tahun', tone: 'text-emerald-700' },
          { icon: <Clock className="w-3.5 h-3.5" />, label: 'Warning Expired', value: stats.soon, hint: '≤ 1 tahun lagi', tone: 'text-amber-700' },
          { icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Expired', value: stats.expired, hint: 'perlu diperpanjang', tone: 'text-rose-600' },
        ].map(c => (
          <div key={c.label} className="rounded-2xl bg-white border border-slate-200/80 shadow-sm px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1">{c.icon}{c.label}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${c.tone}`}>{c.value}</p>
            <p className="text-[11px] text-slate-500">{c.hint}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-4 flex flex-col lg:flex-row lg:items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama, NIK, jabatan, PT..." className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm sm:text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-600/15" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as CertType | 'all')} className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold cursor-pointer">
          <option value="all">Semua Sertifikat</option>
          {CERT_TYPES.map(c => <option key={c.type} value={c.type}>{c.title}</option>)}
        </select>
        <button type="button" onClick={exportExcel} disabled={rows.length === 0} className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 cursor-pointer disabled:opacity-50">
          <Download className="w-4 h-4 text-slate-500" /> Export Excel
        </button>
        {canManage && (
          <button type="button" onClick={() => setForm(emptyForm(typeFilter === 'all' ? 'ahli_k3_kimia' : typeFilter))} className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-lg bg-[#23a1af] text-white text-xs font-bold shadow-sm hover:bg-[#1b808c] cursor-pointer transition-all">
            <Plus className="w-4 h-4" /> Tambah Peserta
          </button>
        )}
      </div>

      {error ? (
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-sm text-rose-600">{(error as Error).message}</div>
      ) : isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-slate-100 animate-pulse" />)}</div>
      ) : (
        CERT_TYPES.filter(meta => typeFilter === 'all' || meta.type === typeFilter).map(meta => {
          const list = filtered.filter(r => r.certType === meta.type);
          if (list.length === 0 && (search || typeFilter === 'all') && !canManage) return null;
          return (
            <div key={meta.type} className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200" style={{ backgroundColor: meta.color }}>
                <div>
                  <p className="text-sm font-bold text-slate-900 uppercase tracking-wide">{meta.title}</p>
                  <p className="text-[11px] text-slate-600">*Masa Berlaku Sertifikasi {meta.validYears ?? '?'} Tahun ({meta.issuer}) · {list.length} peserta</p>
                </div>
                {canManage && (
                  <button type="button" onClick={() => setForm(emptyForm(meta.type))} className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-white/80 border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-white cursor-pointer shrink-0">
                    <Plus className="w-3.5 h-3.5" /> Peserta
                  </button>
                )}
              </div>
              {list.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-slate-400 italic">Belum ada peserta{search ? ' yang cocok dengan pencarian' : ''}</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={th}>Nama Karyawan</th>
                        <th className={th}>Jabatan</th>
                        <th className={`${th} text-center`}>PT</th>
                        <th className={`${th} text-center`}>Tanggal Training/Ujian</th>
                        <th className={`${th} text-center`}>Keterangan</th>
                        <th className={`${th} text-center`}>Tanggal Expired</th>
                        <th className={`${th} text-center text-amber-800`}>Tanggal Warning</th>
                        <th className={`${th} text-center`}>Status</th>
                        <th className={th}>Note</th>
                        {canManage && <th className={th} />}
                      </tr>
                    </thead>
                    <tbody>
                      {list.map(r => {
                        const { status, daysLeft } = certStatus(r.expired, today);
                        const ui = STATUS_UI[status];
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70">
                            <td className={`${td} whitespace-nowrap`}>
                              <span className="font-semibold text-slate-900">{r.nama}</span>
                              {r.nik && <span className="block text-[10px] font-mono text-slate-400">{r.nik}</span>}
                            </td>
                            <td className={`${td} whitespace-nowrap`}>{r.jabatan || '-'}</td>
                            <td className={`${td} text-center`}>{r.pt || '-'}</td>
                            <td className={`${td} text-center whitespace-nowrap tabular-nums`}>{fmtDate(r.tanggal)}</td>
                            <td className={`${td} text-center`}>{r.keterangan || <span className="text-slate-300">-</span>}</td>
                            <td className={`${td} text-center whitespace-nowrap tabular-nums font-semibold`}>{fmtDate(r.expired)}</td>
                            <td className={`${td} text-center whitespace-nowrap tabular-nums font-semibold text-amber-800`}>{fmtDate(certWarningDate(r.expired))}</td>
                            <td className={`${td} text-center whitespace-nowrap`}>
                              <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-semibold ${ui.cls}`} title={daysLeft != null ? (daysLeft < 0 ? `Lewat ${-daysLeft} hari` : `${daysLeft} hari lagi`) : undefined}>
                                {ui.label}{status === 'soon' && daysLeft != null ? ` · ${daysLeft} hr` : ''}
                              </span>
                            </td>
                            <td className={`${td} text-slate-600 whitespace-pre-line min-w-[180px]`}>{r.note || ''}</td>
                            {canManage && (
                              <td className={`${td} whitespace-nowrap`}>
                                <div className="flex items-center justify-end gap-1">
                                  <button type="button" onClick={() => setForm({ id: r.id, certType: r.certType, nama: r.nama, nik: r.nik || '', jabatan: r.jabatan || '', pt: r.pt || '', tanggal: r.tanggal || '', keterangan: r.keterangan || '', expired: r.expired || '', note: r.note || '' })} className="p-1.5 rounded-md text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer" title="Edit"><Edit3 className="w-3.5 h-3.5" /></button>
                                  <button type="button" onClick={() => setDeleteTarget(r)} className="p-1.5 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Form tambah / edit */}
      {form && (
        <div className="fixed inset-0 z-[80] bg-slate-950/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => !saving && setForm(null)}>
          <div className="w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-5 py-4 bg-white border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center"><Award className="w-4 h-4" /></div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{form.id ? 'Edit Data Sertifikasi' : 'Tambah Peserta Sertifikasi'}</h3>
                  <p className="text-xs text-slate-500">{CERT_META[form.certType].title}</p>
                </div>
              </div>
              <button type="button" onClick={() => setForm(null)} className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer" title="Tutup"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              <div className="sm:col-span-2">
                <Select label="Jenis Sertifikat" value={form.certType} onChange={e => updateForm('certType', e.target.value)}>
                  {CERT_TYPES.map(c => <option key={c.type} value={c.type}>{c.title} — {c.validYears ?? '?'} tahun ({c.issuer})</option>)}
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Input label="Nama Karyawan" value={form.nama} onChange={e => updateForm('nama', e.target.value)} list="cert-employee-names" placeholder="Ketik nama — NIK, jabatan & PT terisi otomatis" />
                <datalist id="cert-employee-names">{employees.map(e => <option key={e.nik} value={e.name} />)}</datalist>
              </div>
              <Input label="NIK" value={form.nik} onChange={e => updateForm('nik', e.target.value)} placeholder="Otomatis dari Database Karyawan" />
              <Select label="PT" value={form.pt} onChange={e => updateForm('pt', e.target.value)}>
                <option value="TBP">TBP</option>
                <option value="GPS">GPS</option>
              </Select>
              <div className="sm:col-span-2"><Input label="Jabatan" value={form.jabatan} onChange={e => updateForm('jabatan', e.target.value)} /></div>
              <Input label="Tanggal Training / Ujian" type="date" value={form.tanggal} onChange={e => updateForm('tanggal', e.target.value)} />
              <Select label="Keterangan" value={form.keterangan} onChange={e => updateForm('keterangan', e.target.value)}>
                <option value="">-</option>
                <option value="Lulus">Lulus</option>
                <option value="Tidak Lulus">Tidak Lulus</option>
                <option value="Proses">Proses</option>
              </Select>
              <div className="sm:col-span-2">
                <Input label="Tanggal Expired" type="date" value={form.expired} onChange={e => updateForm('expired', e.target.value)} />
                <p className="text-[11px] text-slate-500 -mt-1 mb-2">
                  {form.expired ? 'Diisi manual sesuai sertifikat.' : autoExpired ? `Kosongkan untuk otomatis: ${fmtDate(autoExpired)} (tanggal training + ${CERT_META[form.certType].validYears} tahun).` : 'Masa berlaku sertifikat ini belum diketahui — isi manual bila ada.'}
                </p>
              </div>
              <div className="sm:col-span-2"><Textarea label="Note" value={form.note} onChange={e => updateForm('note', e.target.value)} rows={2} placeholder="mis. Ujian pertama tgl ..., ujian ulang tgl ..." /></div>
            </div>
            <div className="sticky bottom-0 flex gap-2 justify-end px-5 py-3 bg-slate-50 border-t border-slate-100">
              <Button variant="secondary" onClick={() => setForm(null)} disabled={saving}>Batal</Button>
              <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Simpan'}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi hapus */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[80] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3"><Trash2 className="w-5 h-5" /></div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Hapus data sertifikasi?</h3>
            <p className="text-xs text-slate-600 mb-5"><b>{deleteTarget.nama}</b> akan dihapus dari {CERT_META[deleteTarget.certType]?.title}.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Batal</Button>
              <Button variant="danger" onClick={confirmDelete}>Hapus</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
