import React, { useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Eye, EyeOff, Plus, Trash2, RotateCcw, Edit2 } from 'lucide-react';
import { isTuesdayWednesdaySaturday } from '../utils/meal-roster-sync';

// ===== Rekapan Bungkusan harian (Dept. Preparation & Laboratory) =====
// Satu blok per waktu makan (Pagi, Siang, Sore, [Takjil], T Malam) berisi:
// - Kantin Seroja "Untuk NR MESS"
// - Per section: Crew & Staff Dilapangan
// - Kotakan eksekutif Gol IV-V
// Fitur:
// - Setiap blok bisa di-Hide (misal Bungkusan Takjil)
// - Setiap baris bisa di-Hide
// - Tiap kolom (Area, Qty, Keterangan) bisa langsung di-Edit
// - Penambahan baris manual
// - Export PDF akurat mencerminkan blok & baris aktif yang tidak di-hide

export interface RecapOrderRow {
  nik: string;
  nama: string;
  statusMess: string | null;
  section: string | null;
  siangKantin: string | null;
  pagiLapangan: string | null;
  siangLapangan: string | null;
  soreLapangan: string | null;
  sahurLapangan?: string | null;
  takjilLapangan: string | null;
  malamLapangan: string | null;
  batchPagi: string | null;
  batchSore: string | null;
}
export interface RecapEmployee { nik?: string | null; gol?: string | null; jobGrade?: string | null; jabatan?: string | null; position?: string | null; section?: string | null }

export interface RecapLine {
  id: string;
  area: string;
  qty: number;
  keterangan: string;
  hidden?: boolean;
}

export interface RecapBlock {
  id: string;
  title: string;
  lines: RecapLine[];
  total: number;
  hidden?: boolean;
}

const portions = (v: string | null | undefined) => { const n = Number(String(v || '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : 0; };
const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5 };

// Level golongan 1-5 dari kolom gol → job grade → jabatan
function golLevel(emp: RecapEmployee | undefined): number {
  const gol = String(emp?.gol || '').trim().toUpperCase();
  const roman = gol.match(/^(V|IV|I{1,3})\b/);
  if (roman) return ROMAN[roman[1]];
  const digit = gol.match(/^([1-5])\b/) || String(emp?.jobGrade || '').trim().toUpperCase().match(/^S?([1-5])/);
  if (digit) return Number(digit[1]);
  const pos = String(emp?.jabatan || emp?.position || '').toLowerCase();
  if (pos.includes('manager')) return 5;
  if (pos.includes('superintendent')) return 4;
  const leader = ['foreman', 'supervisor', 'admin', 'officer', 'specialist', 'analyst', 'technician', 'chemist'].some(k => pos.includes(k));
  return leader ? 2 : 1;
}

function executiveTitle(emp: RecapEmployee | undefined): string {
  const pos = String(emp?.jabatan || emp?.position || '').toLowerCase();
  if (pos.includes('manager')) return 'Manager';
  if (pos.includes('superintendent') || /\bspt\b/.test(pos)) return 'SPT';
  return `Gol ${String(emp?.gol || '').trim().toUpperCase() || 'IV-V'}`;
}

// "Deni Nugraha Perdiana" → "Deni Nugraha P"; gelar setelah koma dibuang
function shortName(nama: string): string {
  const words = nama.split(',')[0].trim().split(/\s+/);
  return words.length > 2 ? `${words.slice(0, 2).join(' ')} ${words[2][0]}` : words.join(' ');
}

const isCR = (r: RecapOrderRow) => ['CR', 'MESS'].includes(String(r.statusMess || '').trim().toUpperCase());

export const RECAP_AREAS = ['Preparasi Krishna', 'Laboratorium Krishna'] as const;
export type RecapArea = (typeof RECAP_AREAS)[number];

export function classifyRecapArea(r: RecapOrderRow, emp?: RecapEmployee): RecapArea {
  const sec = String(r.section || emp?.section || '').trim().toLowerCase();
  const jab = String(emp?.jabatan || emp?.position || '').toLowerCase();

  if (sec.includes('preparasi') || sec.includes('preparation')) return 'Preparasi Krishna';
  if (sec.includes('laboratorium') || sec.includes('laboratory')) return 'Laboratorium Krishna';

  if (sec.includes('maint') || sec.includes('admin') || sec.includes('invent') || sec.includes('qa') || sec.includes('manager')) {
    return 'Laboratorium Krishna';
  }

  if (sec.includes('crew')) {
    if (jab.includes('maintenance')) return 'Laboratorium Krishna';
    return 'Preparasi Krishna';
  }

  if (jab.includes('lab') && !jab.includes('prep')) return 'Laboratorium Krishna';
  if (jab.includes('prep')) return 'Preparasi Krishna';

  return 'Laboratorium Krishna';
}

type MealSlot = { title: string; key: 'pagiLapangan' | 'sahurLapangan' | 'siangLapangan' | 'soreLapangan' | 'takjilLapangan' | 'malamLapangan'; seroja?: (rows: RecapOrderRow[]) => number; kotakan?: boolean; kotakanNote?: string };

export function buildBungkusRecap(rows: RecapOrderRow[], employees: RecapEmployee[], date: string): RecapBlock[] {
  const empByNik = new Map(employees.map(e => [String(e.nik || '').trim().toUpperCase(), e]));
  const level = (r: RecapOrderRow) => golLevel(empByNik.get(r.nik.trim().toUpperCase()));
  const healthyBreakfast = isTuesdayWednesdaySaturday(date) ? 'Healthy Breakfast' : undefined;

  const slots: MealSlot[] = [
    { title: 'BUNGKUSAN PAGI', key: 'pagiLapangan', seroja: rs => rs.filter(r => !isCR(r)).reduce((s, r) => s + portions(r.batchPagi), 0), kotakan: true, kotakanNote: healthyBreakfast },
    ...(rows.some(r => portions(r.sahurLapangan) > 0) ? [{ title: 'BUNGKUSAN SAHUR', key: 'sahurLapangan' } as MealSlot] : []),
    { title: 'BUNGKUSAN SIANG', key: 'siangLapangan', seroja: rs => rs.filter(r => !isCR(r) && String(r.siangKantin || '').trim()).length, kotakan: true },
    { title: 'BUNGKUSAN SORE', key: 'soreLapangan', seroja: rs => rs.filter(r => !isCR(r)).reduce((s, r) => s + portions(r.batchSore), 0), kotakan: true },
    ...(rows.some(r => portions(r.takjilLapangan) > 0) ? [{ title: 'BUNGKUSAN TAKJIL', key: 'takjilLapangan' } as MealSlot] : []),
    { title: 'BUNGKUSAN T MALAM', key: 'malamLapangan' },
  ];

  return slots.map(slot => {
    const lines: RecapLine[] = [];
    if (slot.seroja) {
      lines.push({
        id: `${slot.key}-seroja`,
        area: 'Kantin Seroja',
        qty: slot.seroja(rows),
        keterangan: 'Untuk NR MESS',
      });
    }

    const kotakan = slot.kotakan ? rows.filter(r => level(r) >= 4 && portions(r[slot.key]) > 0) : [];
    const kotakanNik = new Set(kotakan.map(r => r.nik));

    for (const area of RECAP_AREAS) {
      const inArea = rows.filter(r => classifyRecapArea(r, empByNik.get(r.nik.trim().toUpperCase())) === area && !kotakanNik.has(r.nik));
      const sum = (pred: (lv: number) => boolean) => inArea.filter(r => pred(level(r))).reduce((s, r) => s + portions(r[slot.key]), 0);
      lines.push({
        id: `${slot.key}-${area}-crew`,
        area,
        qty: sum(lv => lv <= 1),
        keterangan: `Crew ${area} Dilapangan`,
      });
      lines.push({
        id: `${slot.key}-${area}-staff`,
        area,
        qty: sum(lv => lv >= 2),
        keterangan: `Staff ${area} Dilapangan`,
      });
    }

    for (const r of kotakan) {
      const emp = empByNik.get(r.nik.trim().toUpperCase());
      const area = classifyRecapArea(r, emp);
      const title = executiveTitle(emp);
      const name = shortName(r.nama);
      lines.push({
        id: `${slot.key}-kotakan-${r.nik}`,
        area: `${area} (${title} - ${name})`,
        qty: portions(r[slot.key]),
        keterangan: slot.kotakanNote ? `Kotakan di ${area} (${slot.kotakanNote})` : `Kotakan di ${area}`,
      });
    }

    // Baris dengan Qty 0 tidak ditampilkan secara default
    const filled = lines.filter(l => l.qty > 0);
    return {
      id: slot.key,
      title: slot.title,
      lines: filled,
      total: filled.reduce((s, l) => s + l.qty, 0),
      hidden: false,
    };
  });
}

// ===== Tampilan Modern Rekap Bungkusan =====
const C = {
  emeraldDark: '#065f46',
  emeraldHeader: '#059669',
  emeraldSub: '#ecfdf5',
  emeraldBorder: '#a7f3d0',
  border: '#cbd5e1',
  grid: '#e2e8f0',
  amberBg: '#fef3c7',
  amberBorder: '#fde68a',
  amberText: '#78350f',
};

const cellBase: React.CSSProperties = {
  borderBottom: `1px solid ${C.grid}`,
  padding: '8px 12px',
  fontSize: 13,
  whiteSpace: 'nowrap',
};

// Komponen Tabel Satu Blok untuk Editor Web
function EditableBlockTable({
  block,
  canManage,
  onUpdateBlock,
  onToggleHideBlock,
}: {
  block: RecapBlock;
  canManage?: boolean;
  onUpdateBlock: (updated: RecapBlock) => void;
  onToggleHideBlock: () => void;
}) {
  const visibleLines = block.lines.filter(l => !l.hidden);
  const hiddenCount = block.lines.filter(l => l.hidden).length;

  const updateLine = (lineId: string, patch: Partial<RecapLine>) => {
    const nextLines = block.lines.map(l => (l.id === lineId ? { ...l, ...patch } : l));
    const active = nextLines.filter(l => !l.hidden);
    const newTotal = active.reduce((s, l) => s + (Number(l.qty) || 0), 0);
    onUpdateBlock({ ...block, lines: nextLines, total: newTotal });
  };

  const removeLine = (lineId: string) => {
    const nextLines = block.lines.filter(l => l.id !== lineId);
    const active = nextLines.filter(l => !l.hidden);
    const newTotal = active.reduce((s, l) => s + (Number(l.qty) || 0), 0);
    onUpdateBlock({ ...block, lines: nextLines, total: newTotal });
  };

  const addLine = () => {
    const newLine: RecapLine = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      area: 'Laboratorium Krishna',
      qty: 1,
      keterangan: 'Pesanan Tambahan',
    };
    const nextLines = [...block.lines, newLine];
    const active = nextLines.filter(l => !l.hidden);
    const newTotal = active.reduce((s, l) => s + (Number(l.qty) || 0), 0);
    onUpdateBlock({ ...block, lines: nextLines, total: newTotal });
  };

  const unhideAllLines = () => {
    const nextLines = block.lines.map(l => ({ ...l, hidden: false }));
    const newTotal = nextLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
    onUpdateBlock({ ...block, lines: nextLines, total: newTotal });
  };

  return (
    <div className="flex flex-col bg-white rounded-xl shadow-xs hover:shadow-md transition-all overflow-hidden border border-slate-200">
      <table className="w-full border-collapse text-left">
        <colgroup>
          <col style={{ width: canManage ? '40%' : '44%' }} />
          <col style={{ width: '12%' }} />
          <col style={{ width: canManage ? '38%' : '44%' }} />
          {canManage && <col style={{ width: '10%' }} />}
        </colgroup>
        <thead>
          <tr>
            <th
              colSpan={canManage ? 4 : 3}
              className="bg-emerald-600 text-white font-bold text-sm px-4 py-2.5 tracking-wide"
            >
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={block.title}
                  disabled={!canManage}
                  onChange={e => onUpdateBlock({ ...block, title: e.target.value })}
                  className="bg-transparent text-white font-bold text-center w-full focus:outline-none focus:bg-emerald-700/60 rounded px-2 py-0.5 tracking-wide uppercase text-sm sm:text-base"
                  title="Klik untuk mengedit judul blok"
                />
                {canManage && (
                  <button
                    type="button"
                    onClick={onToggleHideBlock}
                    className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-700/80 cursor-pointer shrink-0 transition-colors"
                    title={`Sembunyikan ${block.title}`}
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                )}
              </div>
            </th>
          </tr>
          <tr className="bg-emerald-50 text-emerald-900 text-xs font-bold uppercase tracking-wider border-b border-emerald-200">
            <th className="py-2.5 px-3 border-r border-emerald-200/70">Area</th>
            <th className="py-2.5 px-3 border-r border-emerald-200/70 text-center">Qty</th>
            <th className="py-2.5 px-3 border-r border-emerald-200/70">Keterangan</th>
            {canManage && <th className="py-2.5 px-2 text-center">Aksi</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {visibleLines.length === 0 ? (
            <tr>
              <td colSpan={canManage ? 4 : 3} className="text-center py-6 text-xs text-slate-400 italic">
                Tidak ada pesanan di waktu ini
              </td>
            </tr>
          ) : (
            visibleLines.map(l => (
              <tr key={l.id} className="group hover:bg-emerald-50/40 transition-colors">
                <td style={{ ...cellBase, borderRight: `1px solid ${C.grid}` }}>
                  {canManage ? (
                    <input
                      type="text"
                      value={l.area}
                      onChange={e => updateLine(l.id, { area: e.target.value })}
                      className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5 text-slate-900 font-medium"
                      title="Klik untuk mengedit Area"
                    />
                  ) : (
                    <span className="font-medium text-slate-900">{l.area}</span>
                  )}
                </td>
                <td style={{ ...cellBase, borderRight: `1px solid ${C.grid}`, textAlign: 'center' }}>
                  {canManage ? (
                    <input
                      type="number"
                      min={0}
                      value={l.qty}
                      onChange={e => updateLine(l.id, { qty: portions(e.target.value) })}
                      className="w-full text-center font-extrabold text-sm bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded text-slate-900"
                      title="Klik untuk mengedit Qty"
                    />
                  ) : (
                    <span className="font-extrabold text-sm text-slate-900">{l.qty}</span>
                  )}
                </td>
                <td style={{ ...cellBase, borderRight: canManage ? `1px solid ${C.grid}` : 'none' }}>
                  {canManage ? (
                    <input
                      type="text"
                      value={l.keterangan}
                      onChange={e => updateLine(l.id, { keterangan: e.target.value })}
                      className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5 text-slate-700"
                      title="Klik untuk mengedit Keterangan"
                    />
                  ) : (
                    <span className="text-slate-700">{l.keterangan}</span>
                  )}
                </td>
                {canManage && (
                  <td style={{ ...cellBase, textAlign: 'center', padding: '4px' }}>
                    <div className="flex items-center justify-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => updateLine(l.id, { hidden: true })}
                        className="p-1 rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50 cursor-pointer transition-colors"
                        title="Sembunyikan baris ini"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeLine(l.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                        title="Hapus baris ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}

          {/* Baris Total: Menggunakan aksen amber lembut & font tebal */}
          <tr className="bg-amber-100/90 font-bold border-t-2 border-amber-300">
            <td className="py-2.5 px-3 text-center text-xs font-black uppercase tracking-wider text-amber-900 border-r border-amber-200">
              TOTAL
            </td>
            <td className="py-2.5 px-3 text-center text-base font-black text-amber-950 border-r border-amber-200">
              {block.total}
            </td>
            <td
              colSpan={canManage ? 2 : 1}
              className="py-2.5 px-3 text-center text-xs font-bold uppercase tracking-wider text-amber-900"
            >
              Bungkus
            </td>
          </tr>
        </tbody>
      </table>

      {canManage && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50/80 border-t border-slate-200/80 text-xs">
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer py-1 px-2.5 rounded-lg hover:bg-emerald-100/70 border border-emerald-200/60 transition-colors"
            title="Tambah baris kustom di blok ini"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Baris
          </button>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={unhideAllLines}
              className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 font-medium cursor-pointer py-1 px-2.5 rounded-lg hover:bg-amber-100/70 border border-amber-200/60 transition-colors"
              title="Tampilkan kembali baris yang disembunyikan di blok ini"
            >
              <Eye className="w-3.5 h-3.5" /> {hiddenCount} baris tersembunyi
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Komponen Print / Static untuk HTML2Canvas dan PDF
export function BungkusRecapPrintSheet({ title, blocks }: { title: string; blocks: RecapBlock[] }) {
  const visibleBlocks = blocks.filter(b => !b.hidden);
  const pairs: RecapBlock[][] = [];
  for (let i = 0; i < visibleBlocks.length; i += 2) pairs.push(visibleBlocks.slice(i, i + 2));

  return (
    <div style={{ fontFamily: "Inter, -apple-system, 'Segoe UI', Roboto, sans-serif", background: '#fff', color: '#0f172a', border: '1px solid #cbd5e1', minWidth: 1100, padding: 16 }}>
      <div style={{ textAlign: 'center', fontSize: 20, fontWeight: 800, padding: '12px 4px', borderBottom: '2px solid #059669', letterSpacing: 0.5, color: '#0f172a' }}>
        {title}
      </div>
      {pairs.map((pair, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: pair.length === 1 ? '1fr' : '1fr 1fr', gap: 14, padding: '10px 0', breakInside: 'avoid', alignItems: 'start' }}>
          {pair.map(b => {
            const activeLines = b.lines.filter(l => !l.hidden);
            const total = activeLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
            return (
              <div key={b.id || b.title} style={{ border: '1px solid #cbd5e1', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: '#0f172a' }}>
                  <colgroup>
                    <col style={{ width: '44%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '44%' }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th colSpan={3} style={{ background: '#059669', color: '#fff', fontSize: 13, fontWeight: 700, padding: '8px 10px', letterSpacing: 0.4, textAlign: 'center' }}>
                        {b.title}
                      </th>
                    </tr>
                    <tr style={{ background: '#ecfdf5', fontSize: 11, fontWeight: 700, color: '#065f46', borderBottom: '1px solid #a7f3d0' }}>
                      <th style={{ padding: '6px 10px', borderRight: '1px solid #cbd5e1', textAlign: 'left' }}>Area</th>
                      <th style={{ padding: '6px 10px', borderRight: '1px solid #cbd5e1', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '6px 10px', textAlign: 'left' }}>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLines.map((l, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 10px', borderRight: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600 }}>{l.area}</td>
                        <td style={{ padding: '6px 10px', borderRight: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 800, fontSize: 13 }}>{l.qty}</td>
                        <td style={{ padding: '6px 10px', fontSize: 12 }}>{l.keterangan}</td>
                      </tr>
                    ))}
                    <tr style={{ background: '#fef3c7', fontWeight: 700, borderTop: '2px solid #fde68a' }}>
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#78350f', borderRight: '1px solid #fde68a' }}>TOTAL</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#78350f', borderRight: '1px solid #fde68a' }}>{total}</td>
                      <td style={{ padding: '7px 10px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#78350f' }}>Bungkus</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Komponen Utama yang Ditampilkan di Tab Rekapan
export function BungkusRecapSheet({
  title,
  blocks,
  onChangeBlocks,
  canManage = true,
  onReset,
}: {
  title: string;
  blocks: RecapBlock[];
  onChangeBlocks?: (next: RecapBlock[]) => void;
  canManage?: boolean;
  onReset?: () => void;
}) {
  const visibleBlocks = blocks.filter(b => !b.hidden);
  const hiddenBlocksCount = blocks.filter(b => b.hidden).length;

  const toggleHideBlock = (blockId: string) => {
    if (!onChangeBlocks) return;
    const next = blocks.map(b => (b.id === blockId ? { ...b, hidden: !b.hidden } : b));
    onChangeBlocks(next);
  };

  const updateBlock = (blockId: string, updated: RecapBlock) => {
    if (!onChangeBlocks) return;
    const next = blocks.map(b => (b.id === blockId ? updated : b));
    onChangeBlocks(next);
  };

  const showAllBlocksAndLines = () => {
    if (!onChangeBlocks) return;
    const next = blocks.map(b => ({
      ...b,
      hidden: false,
      lines: b.lines.map(l => ({ ...l, hidden: false })),
      total: b.lines.reduce((s, l) => s + (Number(l.qty) || 0), 0),
    }));
    onChangeBlocks(next);
  };

  const pairs: RecapBlock[][] = [];
  for (let i = 0; i < visibleBlocks.length; i += 2) pairs.push(visibleBlocks.slice(i, i + 2));

  return (
    <div className="space-y-4">
      {/* Toolbar Kontrol Blok & Edit */}
      {canManage && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Tampilan Blok Rekapan</span>
              <span className="text-[11px] text-slate-500">· Klik tombol mata untuk menyembunyikan blok (seperti Bungkusan Takjil)</span>
            </div>
            <div className="flex items-center gap-2">
              {(hiddenBlocksCount > 0 || blocks.some(b => b.lines.some(l => l.hidden))) && (
                <button
                  type="button"
                  onClick={showAllBlocksAndLines}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs transition-colors"
                  title="Tampilkan kembali semua blok dan baris yang disembunyikan"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-600" /> Tampilkan Semua
                </button>
              )}
              {onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs transition-colors"
                  title="Kembalikan semua teks, baris, dan blok ke hitungan otomatis database"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-blue-600" /> Reset ke Otomatis
                </button>
              )}
            </div>
          </div>

          {/* Pill Toggle per Blok */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {blocks.map(b => (
              <button
                key={b.id || b.title}
                type="button"
                onClick={() => toggleHideBlock(b.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all border ${
                  b.hidden
                    ? 'bg-slate-200/70 border-slate-300 text-slate-500 line-through opacity-75'
                    : 'bg-white border-emerald-300 text-emerald-800 shadow-xs hover:border-emerald-400'
                }`}
                title={b.hidden ? `Tampilkan kembali ${b.title}` : `Sembunyikan ${b.title}`}
              >
                {b.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
                <span>{b.title}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${b.hidden ? 'bg-slate-300 text-slate-600' : 'bg-emerald-100 text-emerald-900'}`}>
                  {b.total}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lembar Tabel Rekapan Modern */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-sm p-4 sm:p-6 space-y-4 min-w-[1000px]">
        <div className="text-center py-2 border-b-2 border-emerald-600/70">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
            {title}
          </h2>
        </div>
        
        {visibleBlocks.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Semua blok bungkusan sedang disembunyikan. Klik tombol "Tampilkan Semua" di atas untuk menampilkannya kembali.
          </div>
        ) : (
          pairs.map((pair, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {pair.map(b => (
                <EditableBlockTable
                  key={b.id || b.title}
                  block={b}
                  canManage={canManage}
                  onUpdateBlock={updated => updateBlock(b.id, updated)}
                  onToggleHideBlock={() => toggleHideBlock(b.id)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const DAYS = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];
const MONTHS = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
export function recapTitle(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `BUNGKUSAN DEPT. PREPARATION & LABORATORY ${DAYS[dt.getUTCDay()]}, ${d} ${MONTHS[m - 1]} ${y}`;
}

// Download langsung file PDF (A4 landscape): Hanya blok & baris aktif yang dicetak ke PDF
export async function downloadBungkusRecapPdf(date: string, blocks: RecapBlock[]): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:1400px;background:#fff';

  const visibleBlocks = blocks
    .filter(b => !b.hidden)
    .map(b => {
      const activeLines = b.lines.filter(l => !l.hidden);
      return {
        ...b,
        lines: activeLines,
        total: activeLines.reduce((s, l) => s + (Number(l.qty) || 0), 0),
      };
    });

  host.innerHTML = renderToStaticMarkup(<BungkusRecapPrintSheet title={recapTitle(date)} blocks={visibleBlocks} />);
  document.body.appendChild(host);
  try {
    const canvas = await html2canvas(host.firstElementChild as HTMLElement, { scale: 2, backgroundColor: '#ffffff', logging: false });
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const margin = 8;
    const pageW = pdf.internal.pageSize.getWidth() - margin * 2;
    const pageH = pdf.internal.pageSize.getHeight() - margin * 2;
    const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
    const w = canvas.width * ratio;
    const h = canvas.height * ratio;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin + (pageW - w) / 2, margin, w, h);
    pdf.save(`Rekap_Bungkusan_${date}.pdf`);
  } finally {
    host.remove();
  }
}
