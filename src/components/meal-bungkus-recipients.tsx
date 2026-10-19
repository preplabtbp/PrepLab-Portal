import React, { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Copy, Check, Users, Loader2, Sliders } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const parseYmd = (d: string) => { const [y, m, dd] = d.split('-').map(Number); return new Date(Date.UTC(y, m - 1, dd)); };
const dayName = (d: string) => DAYS[parseYmd(d).getUTCDay()];
const longDate = (d: string) => { const x = parseYmd(d); return `${x.getUTCDate()} ${MONTHS[x.getUTCMonth()]} ${x.getUTCFullYear()}`; };

export interface RecipientOrderRow {
  id?: number;
  nik: string;
  nama: string;
  section?: string | null;
  shiftKerja?: string | null;
  statusKerja?: string | null;
  status?: string | null;
  keteranganLapor?: string | null;
  pagiLapangan?: string | null;
  siangLapangan?: string | null;
  soreLapangan?: string | null;
  malamLapangan?: string | null;
  catatan?: string | null;
  sortNo?: number | null;
  orderDate?: string;
}

const portions = (v: string | null | undefined) => {
  const n = Number(String(v || '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const isPrepSection = (r: RecipientOrderRow) => {
  const s = String(r.section || '').toLowerCase();
  return s.includes('prep') || s.includes('preparasi');
};

export function MealBungkusRecipientsTable({
  date,
  rows,
}: {
  date: string;
  rows: RecipientOrderRow[];
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  // Pengaturan kelegaan kolom dinamis (User Adjustable)
  const [nameColWidth, setNameColWidth] = useState<number>(240); // 240px memastikan nama panjang muat utuh
  const [noColWidth, setNoColWidth] = useState<number>(22);       // 22px ramping & proporsional
  const [fontSize, setFontSize] = useState<number>(11);          // Ukuran font teks nama

  // Hitung total lebar lembar secara dinamis agar 14 kolom muat dengan sangat lega
  const sheetWidth = Math.max(1780, 7 * (noColWidth + nameColWidth) + 60);

  // Filter & Urutkan daftar penerima sesuai porsi lapangan / bungkusan
  // 1. PAGI: Semua Preparasi, Laboratorium & Maintenance
  const pagi = rows
    .filter(r => portions(r.pagiLapangan) > 0 || (r.catatan || '').toLowerCase().includes('pagi'))
    .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama));

  // 2. SIANG: Terbagi Preparasi vs Lab & Maintenance
  const siangAll = rows.filter(r => portions(r.siangLapangan) > 0);
  const siangPrep = siangAll
    .filter(isPrepSection)
    .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama));
  const siangLabMaint = siangAll
    .filter(r => !isPrepSection(r))
    .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama));

  // 3. SORE: Terbagi Preparasi vs Lab & Maintenance
  const soreAll = rows.filter(r => portions(r.soreLapangan) > 0 || (r.catatan || '').toLowerCase().includes('sore'));
  const sorePrep = soreAll
    .filter(isPrepSection)
    .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama));
  const soreLabMaint = soreAll
    .filter(r => !isPrepSection(r))
    .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama));

  // 4. MALAM: Terbagi Preparasi vs Lab & Maintenance
  const malamAll = rows.filter(
    r => portions(r.malamLapangan) > 0 ||
      String(r.shiftKerja || '').toUpperCase() === 'MALAM' ||
      String(r.statusKerja || '').toUpperCase() === 'MALAM'
  );
  const malamPrep = malamAll
    .filter(isPrepSection)
    .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama));
  const malamLabMaint = malamAll
    .filter(r => !isPrepSection(r))
    .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama));

  // 5. Karyawan yang belum Lapor
  const belumLaporList = rows
    .filter(r => r.keteranganLapor === 'Belum Lapor' || /belum\s*lapor/i.test(String(r.status || '')))
    .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama));

  const maxRows = Math.max(
    pagi.length,
    siangPrep.length,
    siangLabMaint.length,
    sorePrep.length,
    soreLabMaint.length,
    malamPrep.length,
    malamLabMaint.length,
    1
  );

  const titleText = `Daftar penerimaan Bungkusan karyawan Prep&Lab  ${dayName(date).toUpperCase()}, ${longDate(date).toUpperCase()}`;

  const totalPenerimaCount = pagi.length + siangAll.length + soreAll.length + malamAll.length;

  // Export Excel
  const exportExcel = () => {
    try {
      const aoa: any[][] = [];
      aoa.push([titleText]);
      aoa.push([]);

      aoa.push(['PAGI', '', 'SIANG', '', '', '', 'SORE', '', '', '', 'MALAM', '', '', '']);
      aoa.push([
        'No', 'Prep, Lab & Maintenance',
        'No', 'Preparasi',
        'No', 'Lab & Maintenance',
        'No', 'Preparasi',
        'No', 'Lab & Maintenance',
        'No', 'Preparasi',
        'No', 'Lab & Maintenance',
      ]);

      for (let i = 0; i < maxRows; i++) {
        aoa.push([
          pagi[i] ? i + 1 : '', pagi[i]?.nama || '',
          siangPrep[i] ? i + 1 : '', siangPrep[i]?.nama || '',
          siangLabMaint[i] ? i + 1 : '', siangLabMaint[i]?.nama || '',
          sorePrep[i] ? i + 1 : '', sorePrep[i]?.nama || '',
          soreLabMaint[i] ? i + 1 : '', soreLabMaint[i]?.nama || '',
          malamPrep[i] ? i + 1 : '', malamPrep[i]?.nama || '',
          malamLabMaint[i] ? i + 1 : '', malamLabMaint[i]?.nama || '',
        ]);
      }

      aoa.push([]);
      aoa.push(['Karyawan yang belum Lapor balik Cuti Roster/Site, Izin, Sakit :']);
      aoa.push(['NO', 'Nama', 'Status', 'Tanggal Absensi/Onsite', 'Keterangan']);

      belumLaporList.forEach((r, idx) => {
        aoa.push([
          idx + 1,
          r.nama,
          r.statusKerja || r.status || 'Cuti',
          `${dayName(date)}, ${longDate(date)}`,
          'Belum Lapor',
        ]);
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Penerima Bungkusan');
      XLSX.writeFile(wb, `Daftar_Penerima_Bungkusan_${date}.xlsx`);
      toast.success('File Excel berhasil didownload.');
    } catch (e: any) {
      toast.error(`Gagal export Excel: ${e?.message || e}`);
    }
  };

  // Export Foto / Gambar PNG Resolusi Tinggi (Anti-oklch error)
  const downloadImage = async () => {
    if (!printRef.current) return;
    setDownloadingPdf(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Daftar_Penerima_Bungkusan_${date}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Foto / Gambar Daftar Penerima berhasil didownload.');
    } catch (e: any) {
      toast.error(`Gagal download foto/gambar: ${e?.message || e}`);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const copyText = () => {
    let t = `*${titleText}*\n\n`;
    t += `*PAGI (${pagi.length})*\n` + pagi.map((r, i) => `${i + 1}. ${r.nama}`).join('\n') + '\n\n';
    t += `*SIANG PREPARASI (${siangPrep.length})*\n` + siangPrep.map((r, i) => `${i + 1}. ${r.nama}`).join('\n') + '\n\n';
    t += `*SIANG LAB & MAINT (${siangLabMaint.length})*\n` + siangLabMaint.map((r, i) => `${i + 1}. ${r.nama}`).join('\n') + '\n\n';
    if (sorePrep.length > 0) t += `*SORE PREPARASI (${sorePrep.length})*\n` + sorePrep.map((r, i) => `${i + 1}. ${r.nama}`).join('\n') + '\n\n';
    t += `*SORE LAB & MAINT (${soreLabMaint.length})*\n` + soreLabMaint.map((r, i) => `${i + 1}. ${r.nama}`).join('\n') + '\n\n';
    if (malamPrep.length > 0) t += `*MALAM PREPARASI (${malamPrep.length})*\n` + malamPrep.map((r, i) => `${i + 1}. ${r.nama}`).join('\n') + '\n\n';
    t += `*MALAM LAB & MAINT (${malamLabMaint.length})*\n` + malamLabMaint.map((r, i) => `${i + 1}. ${r.nama}`).join('\n') + '\n\n';
    if (belumLaporList.length > 0) {
      t += `*KARYAWAN BELUM LAPOR (${belumLaporList.length})*\n` + belumLaporList.map((r, i) => `${i + 1}. ${r.nama} (${r.statusKerja || r.status || 'Cuti'})`).join('\n') + '\n';
    }
    navigator.clipboard.writeText(t);
    setCopied(true);
    toast.success('Daftar penerima disalin ke clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  // Gaya cell base untuk stabilitas render canvas dan web (HEX murni, anti oklch)
  const thBase: React.CSSProperties = {
    padding: '7px 8px',
    textAlign: 'center',
    verticalAlign: 'middle',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.6px',
    color: '#ffffff',
    borderRight: '1.5px solid #cbd5e1',
    boxSizing: 'border-box',
  };

  const subThBase: React.CSSProperties = {
    padding: '6px 6px',
    textAlign: 'center',
    verticalAlign: 'middle',
    fontSize: '10.5px',
    fontWeight: 700,
    color: '#334155',
    backgroundColor: '#f1f5f9',
    borderBottom: '1.5px solid #cbd5e1',
    borderRight: '1px solid #e2e8f0',
    boxSizing: 'border-box',
  };

  const tdNo: React.CSSProperties = {
    width: noColWidth,
    maxWidth: noColWidth,
    textAlign: 'center',
    verticalAlign: 'middle',
    fontFamily: 'monospace',
    fontSize: '10px',
    fontWeight: 700,
    color: '#64748b',
    padding: '4px 1px',
    borderRight: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0',
    boxSizing: 'border-box',
  };

  const tdName: React.CSSProperties = {
    width: nameColWidth,
    minWidth: nameColWidth,
    textAlign: 'left',
    verticalAlign: 'middle',
    fontSize: `${fontSize}px`,
    fontWeight: 600,
    color: '#0f172a',
    padding: '4px 8px',
    whiteSpace: 'nowrap',
    overflow: 'visible', // Full nama tanpa terpotong ...
    borderRight: '1.5px solid #cbd5e1',
    borderBottom: '1px solid #e2e8f0',
    boxSizing: 'border-box',
  };

  return (
    <div className="space-y-4">
      {/* Header Bar Kontrol & Pengatur Lebar Kolom */}
      <div className="flex flex-col gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-700" />
              <h2 className="text-base font-extrabold text-slate-900">Daftar Penerima Bungkusan Karyawan</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Format laporan nama penerima per waktu makan &amp; per bagian · {dayName(date)}, {longDate(date)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={copyText}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
              title="Salin ringkasan ke clipboard (WhatsApp format)"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Tersalin' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={exportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer transition-colors"
              title="Download Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" /> Excel
            </button>
            <button
              type="button"
              onClick={downloadImage}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-xs transition-colors"
              title="Download lembar dalam format Foto / Gambar (PNG) untuk WhatsApp & GA"
            >
              {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download Foto (PNG)
            </button>
          </div>
        </div>

        {/* Adjuster Toolbar: Atur Lebar Kolom Nama & Nomor Sesuai Kebutuhan */}
        <div className="flex items-center gap-4 pt-2.5 border-t border-slate-100 text-xs flex-wrap">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>Pengaturan Lebar Kolom:</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Lebar Kolom Nama:</span>
            <input
              type="range"
              min={180}
              max={320}
              step={5}
              value={nameColWidth}
              onChange={e => setNameColWidth(Number(e.target.value))}
              className="w-28 accent-emerald-600 cursor-pointer"
              title={`Lebar Kolom Nama saat ini: ${nameColWidth}px`}
            />
            <span className="font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
              {nameColWidth}px
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Kolom No:</span>
            <input
              type="range"
              min={18}
              max={30}
              step={1}
              value={noColWidth}
              onChange={e => setNoColWidth(Number(e.target.value))}
              className="w-16 accent-emerald-600 cursor-pointer"
              title={`Lebar Kolom Nomor saat ini: ${noColWidth}px`}
            />
            <span className="font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
              {noColWidth}px
            </span>
          </div>

          {/* Preset Cepat */}
          <div className="flex items-center gap-1.5 sm:ml-auto">
            <span className="text-slate-400 text-[11px] mr-1">Preset:</span>
            <button
              type="button"
              onClick={() => { setNameColWidth(210); setNoColWidth(20); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                nameColWidth === 210 ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Standar
            </button>
            <button
              type="button"
              onClick={() => { setNameColWidth(240); setNoColWidth(22); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                nameColWidth === 240 ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Lega (Full Nama)
            </button>
            <button
              type="button"
              onClick={() => { setNameColWidth(280); setNoColWidth(24); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                nameColWidth === 280 ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Ekstra Luas
            </button>
          </div>
        </div>
      </div>

      {/* Lembar Tampilan Executive Manifest (Dibuat Ekstra Lebar & Full Tanpa Terpotong) */}
      <div className="overflow-x-auto bg-slate-100/80 p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-inner">
        <div
          ref={printRef}
          style={{
            width: sheetWidth,
            minWidth: sheetWidth,
            background: '#ffffff',
            padding: '26px 30px',
            borderRadius: '16px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
            fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
            boxSizing: 'border-box',
            margin: '0 auto',
            color: '#0f172a',
          }}
        >
          {/* Header Kop Eksekutif */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '14px',
            borderBottom: '3px solid #047857',
            marginBottom: '16px',
          }}>
            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '10.5px',
                fontWeight: 800,
                letterSpacing: '1px',
                color: '#047857',
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                padding: '3px 10px',
                borderRadius: '6px',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}>
                PREP &amp; LAB TBP · MEAL DISTRIBUTION MANIFEST
              </div>
              <div style={{
                fontSize: '22px',
                fontWeight: 900,
                color: '#0f172a',
                letterSpacing: '-0.3px',
                lineHeight: '26px',
              }}>
                DAFTAR PENERIMA BUNGKUSAN KARYAWAN
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#64748b',
                marginTop: '3px',
              }}>
                {dayName(date).toUpperCase()}, {longDate(date).toUpperCase()}
              </div>
            </div>

            {/* Quick KPI Bar di Kop */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                padding: '8px 16px',
                textAlign: 'center',
                minWidth: '130px',
              }}>
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  TOTAL PENERIMA
                </div>
                <div style={{ fontSize: '24px', fontWeight: 900, color: '#047857', lineHeight: '26px', marginTop: '2px' }}>
                  {totalPenerimaCount} <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Orang</span>
                </div>
              </div>

              {/* Mini Badges Per Waktu Makan */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px', padding: '4px 10px', fontSize: '10.5px', fontWeight: 800, color: '#047857' }}>
                  PAGI: {pagi.length}
                </div>
                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '4px 10px', fontSize: '10.5px', fontWeight: 800, color: '#1d4ed8' }}>
                  SIANG: {siangAll.length}
                </div>
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '4px 10px', fontSize: '10.5px', fontWeight: 800, color: '#b45309' }}>
                  SORE: {soreAll.length}
                </div>
                <div style={{ backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '4px 10px', fontSize: '10.5px', fontWeight: 800, color: '#4338ca' }}>
                  MALAM: {malamAll.length}
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Utama 7 Subkolom dengan Desain Eksekutif */}
          <div style={{
            border: '1.5px solid #cbd5e1',
            borderRadius: '10px',
            overflow: 'hidden',
            backgroundColor: '#ffffff',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              textAlign: 'left',
            }}>
              <colgroup>
                {/* 1. PAGI */}
                <col style={{ width: noColWidth }} />
                <col style={{ width: nameColWidth }} />
                {/* 2. SIANG PREP */}
                <col style={{ width: noColWidth }} />
                <col style={{ width: nameColWidth }} />
                {/* 3. SIANG LAB & MAINT */}
                <col style={{ width: noColWidth }} />
                <col style={{ width: nameColWidth }} />
                {/* 4. SORE PREP */}
                <col style={{ width: noColWidth }} />
                <col style={{ width: nameColWidth }} />
                {/* 5. SORE LAB & MAINT */}
                <col style={{ width: noColWidth }} />
                <col style={{ width: nameColWidth }} />
                {/* 6. MALAM PREP */}
                <col style={{ width: noColWidth }} />
                <col style={{ width: nameColWidth }} />
                {/* 7. MALAM LAB & MAINT */}
                <col style={{ width: noColWidth }} />
                <col style={{ width: nameColWidth }} />
              </colgroup>
              <thead>
                {/* Header Waktu Makan */}
                <tr>
                  <th colSpan={2} style={{ ...thBase, background: 'linear-gradient(135deg, #047857 0%, #065f46 100%)' }}>
                    🌅 PAGI ({pagi.length})
                  </th>
                  <th colSpan={4} style={{ ...thBase, background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)' }}>
                    ☀️ SIANG ({siangAll.length})
                  </th>
                  <th colSpan={4} style={{ ...thBase, background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' }}>
                    🌇 SORE ({soreAll.length})
                  </th>
                  <th colSpan={4} style={{ ...thBase, background: 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)', borderRight: 'none' }}>
                    🌙 MALAM ({malamAll.length})
                  </th>
                </tr>

                {/* Subheader Bagian */}
                <tr>
                  <th colSpan={2} style={subThBase}>Prep, Lab &amp; Maint</th>
                  <th colSpan={2} style={subThBase}>Preparasi ({siangPrep.length})</th>
                  <th colSpan={2} style={subThBase}>Lab &amp; Maint ({siangLabMaint.length})</th>
                  <th colSpan={2} style={subThBase}>Preparasi ({sorePrep.length})</th>
                  <th colSpan={2} style={subThBase}>Lab &amp; Maint ({soreLabMaint.length})</th>
                  <th colSpan={2} style={subThBase}>Preparasi ({malamPrep.length})</th>
                  <th colSpan={2} style={{ ...subThBase, borderRight: 'none' }}>Lab &amp; Maint ({malamLabMaint.length})</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxRows }).map((_, i) => {
                  const isZebra = i % 2 === 1;
                  const rowBg = isZebra ? '#f8fafc' : '#ffffff';
                  return (
                    <tr key={i} style={{ backgroundColor: rowBg, height: '24px' }}>
                      {/* 1. PAGI */}
                      <td style={tdNo}>{pagi[i] ? i + 1 : ''}</td>
                      <td style={tdName} title={pagi[i]?.nama || ''}>{pagi[i]?.nama || ''}</td>

                      {/* 2. SIANG PREP */}
                      <td style={tdNo}>{siangPrep[i] ? i + 1 : ''}</td>
                      <td style={tdName} title={siangPrep[i]?.nama || ''}>{siangPrep[i]?.nama || ''}</td>

                      {/* 3. SIANG LAB & MAINT */}
                      <td style={tdNo}>{siangLabMaint[i] ? i + 1 : ''}</td>
                      <td style={tdName} title={siangLabMaint[i]?.nama || ''}>{siangLabMaint[i]?.nama || ''}</td>

                      {/* 4. SORE PREP */}
                      <td style={tdNo}>{sorePrep[i] ? i + 1 : ''}</td>
                      <td style={tdName} title={sorePrep[i]?.nama || ''}>{sorePrep[i]?.nama || ''}</td>

                      {/* 5. SORE LAB & MAINT */}
                      <td style={tdNo}>{soreLabMaint[i] ? i + 1 : ''}</td>
                      <td style={tdName} title={soreLabMaint[i]?.nama || ''}>{soreLabMaint[i]?.nama || ''}</td>

                      {/* 6. MALAM PREP */}
                      <td style={tdNo}>{malamPrep[i] ? i + 1 : ''}</td>
                      <td style={tdName} title={malamPrep[i]?.nama || ''}>{malamPrep[i]?.nama || ''}</td>

                      {/* 7. MALAM LAB & MAINT */}
                      <td style={tdNo}>{malamLabMaint[i] ? i + 1 : ''}</td>
                      <td style={{ ...tdName, borderRight: 'none' }} title={malamLabMaint[i]?.nama || ''}>{malamLabMaint[i]?.nama || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Bagian Bawah: Card Karyawan yang Belum Lapor (Operational Compliance Card) */}
          <div style={{
            marginTop: '18px',
            backgroundColor: '#fff8f8',
            border: '1.5px solid #fecdd3',
            borderRadius: '10px',
            padding: '14px 18px',
            boxSizing: 'border-box',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 900,
                color: '#991b1b',
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#dc2626',
                }} />
                Karyawan yang Belum Lapor Balik (Cuti Roster / Site, Izin, Sakit)
              </div>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                color: '#991b1b',
                backgroundColor: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                padding: '2px 8px',
              }}>
                {belumLaporList.length} Orang
              </span>
            </div>

            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              tableLayout: 'fixed',
              fontSize: '11px',
              border: '1px solid #fecdd3',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              overflow: 'hidden',
            }}>
              <thead>
                <tr style={{ backgroundColor: '#fee2e2', height: '28px', color: '#991b1b' }}>
                  <th style={{ width: 44, textAlign: 'center', verticalAlign: 'middle', fontWeight: 800, borderRight: '1px solid #fecdd3' }}>NO</th>
                  <th style={{ width: 220, textAlign: 'center', verticalAlign: 'middle', fontWeight: 800, borderRight: '1px solid #fecdd3' }}>Nama Karyawan</th>
                  <th style={{ width: 140, textAlign: 'center', verticalAlign: 'middle', fontWeight: 800, borderRight: '1px solid #fecdd3' }}>Status</th>
                  <th style={{ width: 200, textAlign: 'center', verticalAlign: 'middle', fontWeight: 800, borderRight: '1px solid #fecdd3' }}>Tanggal Absensi / Onsite</th>
                  <th style={{ width: 130, textAlign: 'center', verticalAlign: 'middle', fontWeight: 800 }}>Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {belumLaporList.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '10px', color: '#64748b', fontStyle: 'italic', fontSize: '11px' }}>
                      Semua karyawan telah melapor secara tertib (Tidak ada yang berstatus belum lapor).
                    </td>
                  </tr>
                ) : (
                  belumLaporList.map((r, idx) => (
                    <tr key={r.id || r.nik || idx} style={{ height: '26px', borderTop: '1px solid #fecdd3' }}>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', fontFamily: 'monospace', fontWeight: 700, color: '#991b1b', borderRight: '1px solid #fecdd3' }}>
                        {idx + 1}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, color: '#991b1b', borderRight: '1px solid #fecdd3' }}>
                        {r.nama}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', color: '#7f1d1d', borderRight: '1px solid #fecdd3' }}>
                        {r.statusKerja && r.statusKerja !== '-' ? r.statusKerja : (r.status || 'Cuti')}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', color: '#7f1d1d', borderRight: '1px solid #fecdd3' }}>
                        {dayName(date)}, {longDate(date)}
                      </td>
                      <td style={{ textAlign: 'center', verticalAlign: 'middle', padding: '3px' }}>
                        <span style={{
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          border: '1px solid #f87171',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontWeight: 800,
                          fontSize: '10px',
                          display: 'inline-block',
                        }}>
                          Belum Lapor
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Laporan */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '14px',
            paddingTop: '8px',
            borderTop: '1px solid #e2e8f0',
            fontSize: '10px',
            color: '#64748b',
          }}>
            <span>
              <strong style={{ color: '#0f172a' }}>PrepLab Portal</strong> · Sistem Rekapitulasi Bungkusan &amp; Logistik Makanan
            </span>
            <span style={{ fontWeight: 600 }}>
              Dokumen Resmi Departemen Preparation &amp; Laboratory
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
