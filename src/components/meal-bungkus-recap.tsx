import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// ===== Rekapan Bungkusan harian (Dept. Preparation & Laboratory) =====
// Satu blok per waktu makan (Pagi, Siang, Sore, [Takjil], T Malam) berisi:
// - Kantin Seroja "Untuk NR MESS" (karyawan non-CR: Pagi/Sore = kolom 1 (B.Pagi)/1 (B.Sore), Siang = Kantin)
// - Per section: Crew (Gol I) & Staff (Gol II-III) Dilapangan = jumlah porsi Lapangan
// - Gol IV-V yang punya porsi Lapangan di Pagi/Siang/Sore → baris tersendiri "Kotakan di <section>"
// Style inline agar tampilan layar & PDF (dialog cetak) identik.

export interface RecapOrderRow {
  nik: string;
  nama: string;
  statusMess: string | null;
  section: string | null;
  siangKantin: string | null;
  pagiLapangan: string | null;
  siangLapangan: string | null;
  soreLapangan: string | null;
  takjilLapangan: string | null;
  malamLapangan: string | null;
  batchPagi: string | null;
  batchSore: string | null;
}
export interface RecapEmployee { nik?: string | null; gol?: string | null; jobGrade?: string | null; jabatan?: string | null; position?: string | null }

interface RecapLine { area: React.ReactNode; qty: number; keterangan: React.ReactNode }
interface RecapBlock { title: string; lines: RecapLine[]; total: number }

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
// Preparasi dulu, lalu Laboratorium, lalu section lain (urut abjad)
const sectionRank = (s: string) => (/prep/i.test(s) ? 0 : /lab/i.test(s) ? 1 : 2);

type MealSlot = { title: string; key: 'pagiLapangan' | 'siangLapangan' | 'soreLapangan' | 'takjilLapangan' | 'malamLapangan'; seroja?: (rows: RecapOrderRow[]) => number; kotakan?: boolean; kotakanNote?: string };

export function buildBungkusRecap(rows: RecapOrderRow[], employees: RecapEmployee[]): RecapBlock[] {
  const empByNik = new Map(employees.map(e => [String(e.nik || '').trim().toUpperCase(), e]));
  const level = (r: RecapOrderRow) => golLevel(empByNik.get(r.nik.trim().toUpperCase()));
  const sections = Array.from(new Set(rows.map(r => (r.section || '').trim()).filter(Boolean)))
    .sort((a, b) => sectionRank(a) - sectionRank(b) || a.localeCompare(b));

  const slots: MealSlot[] = [
    { title: 'BUNGKUSAN PAGI', key: 'pagiLapangan', seroja: rs => rs.filter(r => !isCR(r)).reduce((s, r) => s + portions(r.batchPagi), 0), kotakan: true, kotakanNote: 'Healthy Breakfast' },
    { title: 'BUNGKUSAN SIANG', key: 'siangLapangan', seroja: rs => rs.filter(r => !isCR(r) && String(r.siangKantin || '').trim()).length, kotakan: true },
    { title: 'BUNGKUSAN SORE', key: 'soreLapangan', seroja: rs => rs.filter(r => !isCR(r)).reduce((s, r) => s + portions(r.batchSore), 0), kotakan: true },
    ...(rows.some(r => portions(r.takjilLapangan) > 0) ? [{ title: 'BUNGKUSAN TAKJIL', key: 'takjilLapangan' } as MealSlot] : []),
    { title: 'BUNGKUSAN T MALAM', key: 'malamLapangan' },
  ];

  return slots.map(slot => {
    const lines: RecapLine[] = [];
    if (slot.seroja) lines.push({ area: 'Kantin Seroja', qty: slot.seroja(rows), keterangan: 'Untuk NR MESS' });
    // Gol IV-V dengan porsi Lapangan → baris kotakan sendiri (tidak dihitung di Staff)
    const kotakan = slot.kotakan ? rows.filter(r => level(r) >= 4 && portions(r[slot.key]) > 0) : [];
    const kotakanNik = new Set(kotakan.map(r => r.nik));
    for (const section of sections) {
      const inSection = rows.filter(r => (r.section || '').trim() === section && !kotakanNik.has(r.nik));
      const sum = (pred: (lv: number) => boolean) => inSection.filter(r => pred(level(r))).reduce((s, r) => s + portions(r[slot.key]), 0);
      lines.push({ area: section, qty: sum(lv => lv <= 1), keterangan: `Crew ${section} Dilapangan` });
      lines.push({ area: section, qty: sum(lv => lv >= 2), keterangan: `Staff ${section} Dilapangan` });
    }
    for (const r of kotakan) {
      const section = (r.section || '').trim() || 'Laboratorium Krishna';
      const emp = empByNik.get(r.nik.trim().toUpperCase());
      lines.push({
        area: <>{section} (<b>{executiveTitle(emp)} - {shortName(r.nama)}</b>)</>,
        qty: portions(r[slot.key]),
        keterangan: slot.kotakanNote ? <>Kotakan di {section} (<b>{slot.kotakanNote}</b>)</> : `Kotakan di ${section}`,
      });
    }
    return { title: slot.title, lines, total: lines.reduce((s, l) => s + l.qty, 0) };
  });
}

// ===== Tampilan (inline style) =====
const C = { green: '#00B050', light: '#92D050', yellow: '#FFD966', border: '#000', grid: '#bfbfbf' };
const font = "Tahoma, 'Segoe UI', Verdana, sans-serif";
const cell: React.CSSProperties = { borderBottom: `1px solid ${C.grid}`, padding: '5px 10px', height: 22, fontSize: 13, whiteSpace: 'nowrap' };
const vline = `1px solid ${C.border}`;

function BlockTable({ block, rowCount }: { block: RecapBlock; rowCount: number }) {
  const pad = Math.max(0, rowCount - block.lines.length);
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', border: `2px solid ${C.border}`, fontFamily: font, color: '#000' }}>
      <colgroup><col style={{ width: '47%' }} /><col style={{ width: '5%' }} /><col style={{ width: '48%' }} /></colgroup>
      <thead>
        <tr><th colSpan={3} style={{ background: C.green, color: '#fff', fontSize: 13, fontWeight: 700, padding: '7px 4px', borderBottom: vline, letterSpacing: 0.3 }}>{block.title}</th></tr>
        <tr style={{ background: C.light, fontSize: 10, fontWeight: 700 }}>
          <th style={{ padding: '3px 4px', borderRight: vline, borderBottom: `2px solid ${C.border}` }}>Area</th>
          <th style={{ padding: '3px 4px', borderRight: vline, borderBottom: `2px solid ${C.border}` }}>Qty</th>
          <th style={{ padding: '3px 4px', borderBottom: `2px solid ${C.border}` }}>Keterangan</th>
        </tr>
      </thead>
      <tbody>
        {block.lines.map((l, i) => (
          <tr key={i}>
            <td style={{ ...cell, borderRight: vline }}>{l.area}</td>
            <td style={{ ...cell, borderRight: vline, textAlign: 'center', fontWeight: 700 }}>{l.qty}</td>
            <td style={cell}>{l.keterangan}</td>
          </tr>
        ))}
        {Array.from({ length: pad }).map((_, i) => (
          <tr key={`pad-${i}`}><td style={{ ...cell, borderRight: vline }} /><td style={{ ...cell, borderRight: vline }} /><td style={cell} /></tr>
        ))}
        <tr style={{ background: C.yellow, fontWeight: 700 }}>
          <td style={{ padding: '4px', textAlign: 'center', fontSize: 12, borderTop: `2px solid ${C.border}`, borderRight: vline }}>TOTAL</td>
          <td style={{ padding: '4px', textAlign: 'center', fontSize: 14, borderTop: `2px solid ${C.border}`, borderRight: vline }}>{block.total}</td>
          <td style={{ padding: '4px', textAlign: 'center', fontSize: 14, borderTop: `2px solid ${C.border}` }}>Bungkus</td>
        </tr>
      </tbody>
    </table>
  );
}

export function BungkusRecapSheet({ title, blocks }: { title: string; blocks: RecapBlock[] }) {
  const pairs: RecapBlock[][] = [];
  for (let i = 0; i < blocks.length; i += 2) pairs.push(blocks.slice(i, i + 2));
  return (
    <div style={{ fontFamily: font, background: '#fff', color: '#000', border: `1px solid ${C.border}`, minWidth: 1100 }}>
      <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, padding: '6px 4px', borderBottom: `2px solid ${C.border}`, letterSpacing: 0.2 }}>{title}</div>
      {pairs.map((pair, i) => {
        const rowCount = Math.max(...pair.map(b => b.lines.length));
        return (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 0 10px', breakInside: 'avoid' }}>
            {pair.map(b => <BlockTable key={b.title} block={b} rowCount={rowCount} />)}
          </div>
        );
      })}
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

// PDF lewat dialog cetak browser (A4 landscape) → "Simpan sebagai PDF"
export function printBungkusRecap(date: string, blocks: RecapBlock[]): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;
  const markup = renderToStaticMarkup(<BungkusRecapSheet title={recapTitle(date)} blocks={blocks} />);
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Rekap_Bungkusan_${date}</title>
<style>@page{size:A4 landscape;margin:8mm}html,body{margin:0;background:#fff}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}
body>div{min-width:0!important;zoom:.92}</style></head><body>${markup}
<script>window.onload=function(){setTimeout(function(){window.print()},150)};window.onafterprint=function(){window.close()}</script></body></html>`);
  win.document.close();
  return true;
}
