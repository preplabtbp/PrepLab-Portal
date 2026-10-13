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

// ===== Tampilan (inline style Excel) =====
const C = { green: '#00B050', light: '#92D050', yellow: '#FFD966', border: '#000', grid: '#bfbfbf' };
const font = "Tahoma, 'Segoe UI', Verdana, sans-serif";
const cell: React.CSSProperties = { borderBottom: `1px solid ${C.grid}`, padding: '4px 8px', minHeight: 24, fontSize: 13, whiteSpace: 'nowrap' };
const vline = `1px solid ${C.border}`;

// Komponen Tabel Satu Blok untuk Editor Web
function EditableBlockTable({
  block,
  rowCount,
  canManage,
  onUpdateBlock,
  onToggleHideBlock,
}: {
  block: RecapBlock;
  rowCount: number;
  canManage?: boolean;
  onUpdateBlock: (updated: RecapBlock) => void;
  onToggleHideBlock: () => void;
}) {
  const visibleLines = block.lines.filter(l => !l.hidden);
  const hiddenCount = block.lines.filter(l => l.hidden).length;
  const pad = Math.max(0, rowCount - visibleLines.length);

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
    <div className="flex flex-col h-full bg-white rounded-lg shadow-xs overflow-hidden border border-slate-300">
      <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${C.border}`, fontFamily: font, color: '#000' }}>
        <colgroup>
          <col style={{ width: '47%' }} />
          <col style={{ width: '6%' }} />
          <col style={{ width: canManage ? '42%' : '47%' }} />
          {canManage && <col style={{ width: '5%' }} />}
        </colgroup>
        <thead>
          <tr>
            <th colSpan={canManage ? 4 : 3} style={{ background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, padding: '6px 8px', borderBottom: vline, letterSpacing: 0.3 }}>
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={block.title}
                  disabled={!canManage}
                  onChange={e => onUpdateBlock({ ...block, title: e.target.value })}
                  className="bg-transparent text-white font-bold text-center w-full focus:outline-none focus:bg-emerald-800/60 rounded px-1"
                  title="Klik untuk mengedit judul blok"
                />
                {canManage && (
                  <button
                    type="button"
                    onClick={onToggleHideBlock}
                    className="p-1 rounded text-white/80 hover:text-white hover:bg-emerald-800/80 cursor-pointer shrink-0"
                    title={`Sembunyikan ${block.title}`}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </th>
          </tr>
          <tr style={{ background: C.light, fontSize: 10, fontWeight: 700 }}>
            <th style={{ padding: '3px 4px', borderRight: vline, borderBottom: `2px solid ${C.border}` }}>Area</th>
            <th style={{ padding: '3px 4px', borderRight: vline, borderBottom: `2px solid ${C.border}` }}>Qty</th>
            <th style={{ padding: '3px 4px', borderRight: canManage ? vline : 'none', borderBottom: `2px solid ${C.border}` }}>Keterangan</th>
            {canManage && <th style={{ padding: '3px 2px', borderBottom: `2px solid ${C.border}` }}>Aksi</th>}
          </tr>
        </thead>
        <tbody>
          {visibleLines.map((l) => (
            <tr key={l.id} className="group hover:bg-emerald-50/40 transition-colors">
              <td style={{ ...cell, borderRight: vline }}>
                {canManage ? (
                  <input
                    type="text"
                    value={l.area}
                    onChange={e => updateLine(l.id, { area: e.target.value })}
                    className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 text-slate-900"
                    title="Klik untuk mengedit Area"
                  />
                ) : (
                  <span>{l.area}</span>
                )}
              </td>
              <td style={{ ...cell, borderRight: vline, textAlign: 'center', fontWeight: 700 }}>
                {canManage ? (
                  <input
                    type="number"
                    min={0}
                    value={l.qty}
                    onChange={e => updateLine(l.id, { qty: portions(e.target.value) })}
                    className="w-full text-center font-bold bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded text-slate-900"
                    title="Klik untuk mengedit Qty"
                  />
                ) : (
                  <span>{l.qty}</span>
                )}
              </td>
              <td style={{ ...cell, borderRight: canManage ? vline : 'none' }}>
                {canManage ? (
                  <input
                    type="text"
                    value={l.keterangan}
                    onChange={e => updateLine(l.id, { keterangan: e.target.value })}
                    className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1 text-slate-900"
                    title="Klik untuk mengedit Keterangan"
                  />
                ) : (
                  <span>{l.keterangan}</span>
                )}
              </td>
              {canManage && (
                <td style={{ ...cell, textAlign: 'center', padding: '2px' }}>
                  <div className="flex items-center justify-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => updateLine(l.id, { hidden: true })}
                      className="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                      title="Sembunyikan baris ini"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLine(l.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      title="Hapus baris ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}

          {Array.from({ length: pad }).map((_, i) => (
            <tr key={`pad-${i}`}>
              <td style={{ ...cell, borderRight: vline }} />
              <td style={{ ...cell, borderRight: vline }} />
              <td style={{ ...cell, borderRight: canManage ? vline : 'none' }} />
              {canManage && <td style={cell} />}
            </tr>
          ))}

          <tr style={{ background: C.yellow, fontWeight: 700 }}>
            <td style={{ padding: '5px', textAlign: 'center', fontSize: 12, borderTop: `2px solid ${C.border}`, borderRight: vline }}>TOTAL</td>
            <td style={{ padding: '5px', textAlign: 'center', fontSize: 14, borderTop: `2px solid ${C.border}`, borderRight: vline }}>{block.total}</td>
            <td colSpan={canManage ? 2 : 1} style={{ padding: '5px', textAlign: 'center', fontSize: 14, borderTop: `2px solid ${C.border}` }}>Bungkus</td>
          </tr>
        </tbody>
      </table>

      {canManage && (
        <div className="flex items-center justify-between gap-2 px-2 py-1.5 bg-slate-50 border-t border-slate-200 text-[11px]">
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold cursor-pointer py-0.5 px-1.5 rounded hover:bg-emerald-100/60 transition-colors"
            title="Tambah baris kustom di blok ini"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Baris
          </button>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={unhideAllLines}
              className="inline-flex items-center gap-1 text-amber-700 hover:text-amber-900 font-medium cursor-pointer py-0.5 px-1.5 rounded hover:bg-amber-100/60 transition-colors"
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
    <div style={{ fontFamily: font, background: '#fff', color: '#000', border: `1px solid ${C.border}`, minWidth: 1100, padding: 8 }}>
      <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, padding: '8px 4px', borderBottom: `2px solid ${C.border}`, letterSpacing: 0.2 }}>{title}</div>
      {pairs.map((pair, i) => {
        const rowCount = Math.max(...pair.map(b => b.lines.filter(l => !l.hidden).length));
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: pair.length === 1 ? '1fr' : '1fr 1fr', gap: 10, padding: '8px 0', breakInside: 'avoid' }}>
            {pair.map(b => {
              const activeLines = b.lines.filter(l => !l.hidden);
              const pad = Math.max(0, rowCount - activeLines.length);
              const total = activeLines.reduce((s, l) => s + (Number(l.qty) || 0), 0);
              return (
                <table key={b.id || b.title} style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${C.border}`, fontFamily: font, color: '#000' }}>
                  <colgroup><col style={{ width: '47%' }} /><col style={{ width: '6%' }} /><col style={{ width: '47%' }} /></colgroup>
                  <thead>
                    <tr><th colSpan={3} style={{ background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, padding: '7px 4px', borderBottom: vline, letterSpacing: 0.3 }}>{b.title}</th></tr>
                    <tr style={{ background: C.light, fontSize: 10, fontWeight: 700 }}>
                      <th style={{ padding: '3px 4px', borderRight: vline, borderBottom: `2px solid ${C.border}` }}>Area</th>
                      <th style={{ padding: '3px 4px', borderRight: vline, borderBottom: `2px solid ${C.border}` }}>Qty</th>
                      <th style={{ padding: '3px 4px', borderBottom: `2px solid ${C.border}` }}>Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeLines.map((l, idx) => (
                      <tr key={idx}>
                        <td style={{ ...cell, borderRight: vline }}>{l.area}</td>
                        <td style={{ ...cell, borderRight: vline, textAlign: 'center', fontWeight: 700 }}>{l.qty}</td>
                        <td style={cell}>{l.keterangan}</td>
                      </tr>
                    ))}
                    {Array.from({ length: pad }).map((_, idx) => (
                      <tr key={`pad-${idx}`}><td style={{ ...cell, borderRight: vline }} /><td style={{ ...cell, borderRight: vline }} /><td style={cell} /></tr>
                    ))}
                    <tr style={{ background: C.yellow, fontWeight: 700 }}>
                      <td style={{ padding: '5px', textAlign: 'center', fontSize: 12, borderTop: `2px solid ${C.border}`, borderRight: vline }}>TOTAL</td>
                      <td style={{ padding: '5px', textAlign: 'center', fontSize: 14, borderTop: `2px solid ${C.border}`, borderRight: vline }}>{total}</td>
                      <td style={{ padding: '5px', textAlign: 'center', fontSize: 14, borderTop: `2px solid ${C.border}` }}>Bungkus</td>
                    </tr>
                  </tbody>
                </table>
              );
            })}
          </div>
        );
      })}
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
    <div className="space-y-3">
      {/* Toolbar Kontrol Blok & Edit */}
      {canManage && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
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
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs transition-colors"
                  title="Tampilkan kembali semua blok dan baris yang disembunyikan"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-600" /> Tampilkan Semua
                </button>
              )}
              {onReset && (
                <button
                  type="button"
                  onClick={onReset}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs transition-colors"
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
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${b.hidden ? 'bg-slate-300 text-slate-600' : 'bg-emerald-100 text-emerald-900'}`}>
                  {b.total}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lembar Tabel Rekapan */}
      <div style={{ fontFamily: font, background: '#fff', color: '#000', border: `1px solid ${C.border}`, minWidth: 1100, padding: 8 }}>
        <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, padding: '8px 4px', borderBottom: `2px solid ${C.border}`, letterSpacing: 0.2 }}>
          {title}
        </div>
        
        {visibleBlocks.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Semua blok bungkusan sedang disembunyikan. Klik tombol "Tampilkan Semua" di atas untuk menampilkannya kembali.
          </div>
        ) : (
          pairs.map((pair, i) => {
            const rowCount = Math.max(...pair.map(b => b.lines.filter(l => !l.hidden).length));
            return (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: pair.length === 1 ? '1fr' : '1fr 1fr', gap: 10, padding: '8px 0', breakInside: 'avoid' }}>
                {pair.map(b => (
                  <EditableBlockTable
                    key={b.id || b.title}
                    block={b}
                    rowCount={rowCount}
                    canManage={canManage}
                    onUpdateBlock={updated => updateBlock(b.id, updated)}
                    onToggleHideBlock={() => toggleHideBlock(b.id)}
                  />
                ))}
              </div>
            );
          })
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
