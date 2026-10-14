import React, { useRef, useState } from 'react';
import { Download, FileSpreadsheet, Copy, Check, Users, Loader2 } from 'lucide-react';
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

  // Export Excel persis seperti spreadsheet di foto
  const exportExcel = () => {
    try {
      const aoa: any[][] = [];
      // Title
      aoa.push([titleText]);
      aoa.push([]);

      // Header row 1 (Waktu Makan)
      aoa.push(['PAGI', '', 'SIANG', '', '', '', 'SORE', '', '', '', 'MALAM', '', '', '']);
      // Header row 2 (Section)
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

  // Export PDF landscape A4
  const downloadPdf = async () => {
    if (!printRef.current) return;
    setDownloadingPdf(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const margin = 6;
      const pageW = pdf.internal.pageSize.getWidth() - margin * 2;
      const pageH = pdf.internal.pageSize.getHeight() - margin * 2;
      const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
      const w = canvas.width * ratio;
      const h = canvas.height * ratio;
      pdf.setProperties({ title: `Penerima Bungkusan ${date}`, subject: 'Daftar Penerima Bungkusan Prep&Lab', creator: 'PrepLab Portal' });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin + (pageW - w) / 2, margin + (pageH - h) / 2, w, h, undefined, 'FAST');
      pdf.save(`Daftar_Penerima_Bungkusan_${date}.pdf`);
      toast.success('File PDF berhasil didownload.');
    } catch (e: any) {
      toast.error(`Gagal export PDF: ${e?.message || e}`);
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
    t += `*MALAM PREPARASI (${malamPrep.length})*\n` + malamPrep.map((r, i) => `${i + 1}. ${r.nama}`).join('\n') + '\n\n';
    t += `*MALAM LAB & MAINT (${malamLabMaint.length})*\n` + malamLabMaint.map((r, i) => `${i + 1}. ${r.nama}`).join('\n') + '\n\n';
    if (belumLaporList.length > 0) {
      t += `*KARYAWAN BELUM LAPOR (${belumLaporList.length})*\n` + belumLaporList.map((r, i) => `${i + 1}. ${r.nama} (${r.statusKerja || r.status || 'Cuti'})`).join('\n') + '\n';
    }
    navigator.clipboard.writeText(t);
    setCopied(true);
    toast.success('Daftar penerima disalin ke clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Header Bar Kontrol */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
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
            onClick={downloadPdf}
            disabled={downloadingPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-xs transition-colors"
            title="Download PDF format cetak seperti lembar laporan"
          >
            {downloadingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download PDF
          </button>
        </div>
      </div>

      {/* Lembar Tampilan Persis Seperti Foto */}
      <div className="overflow-x-auto bg-slate-100 p-2 sm:p-4 rounded-2xl border border-slate-200 shadow-inner">
        <div
          ref={printRef}
          className="bg-white p-6 rounded-xl border border-slate-300 shadow-sm mx-auto"
          style={{ width: 1360, minWidth: 1360, fontFamily: "Calibri, Arial, sans-serif" }}
        >
          {/* Judul Utama */}
          <div className="text-center font-extrabold text-[20px] text-black tracking-wide mb-3">
            {titleText}
          </div>

          {/* Tabel Utama 7 Subkolom */}
          <table className="w-full border-collapse border border-black text-[11px] leading-[14px]">
            <thead>
              {/* Header Waktu Makan */}
              <tr>
                <th
                  colSpan={2}
                  className="border border-black py-1.5 px-2 font-black text-center text-black text-[13px] uppercase"
                  style={{ backgroundColor: '#ffff00' }}
                >
                  PAGI
                </th>
                <th
                  colSpan={4}
                  className="border border-black py-1.5 px-2 font-black text-center text-black text-[13px] uppercase"
                  style={{ backgroundColor: '#fed7aa' }}
                >
                  SIANG
                </th>
                <th
                  colSpan={4}
                  className="border border-black py-1.5 px-2 font-black text-center text-black text-[13px] uppercase"
                  style={{ backgroundColor: '#bae6fd' }}
                >
                  SORE
                </th>
                <th
                  colSpan={4}
                  className="border border-black py-1.5 px-2 font-black text-center text-white text-[13px] uppercase"
                  style={{ backgroundColor: '#1d4ed8' }}
                >
                  MALAM
                </th>
              </tr>
              {/* Subheader Bagian */}
              <tr style={{ backgroundColor: '#bbf7d0' }}>
                <th colSpan={2} className="border border-black py-1 px-2 font-bold text-center text-black">
                  Prep, Lab &amp; Maintenance
                </th>
                <th colSpan={2} className="border border-black py-1 px-2 font-bold text-center text-black">
                  Preparasi
                </th>
                <th colSpan={2} className="border border-black py-1 px-2 font-bold text-center text-black">
                  Lab &amp; Maintenance
                </th>
                <th colSpan={2} className="border border-black py-1 px-2 font-bold text-center text-black">
                  Preparasi
                </th>
                <th colSpan={2} className="border border-black py-1 px-2 font-bold text-center text-black">
                  Lab &amp; Maintenance
                </th>
                <th colSpan={2} className="border border-black py-1 px-2 font-bold text-center text-black">
                  Preparasi
                </th>
                <th colSpan={2} className="border border-black py-1 px-2 font-bold text-center text-black">
                  Lab &amp; Maintenance
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxRows }).map((_, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  {/* 1. PAGI */}
                  <td className="border border-black w-6 text-center text-slate-500 font-mono text-[10px] py-0.5">
                    {pagi[i] ? i + 1 : ''}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 text-black font-medium truncate" style={{ width: 170, maxWidth: 170 }}>
                    {pagi[i]?.nama || ''}
                  </td>

                  {/* 2. SIANG PREP */}
                  <td className="border border-black w-6 text-center text-slate-500 font-mono text-[10px] py-0.5">
                    {siangPrep[i] ? i + 1 : ''}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 text-black font-medium truncate" style={{ width: 170, maxWidth: 170 }}>
                    {siangPrep[i]?.nama || ''}
                  </td>

                  {/* 3. SIANG LAB & MAINT */}
                  <td className="border border-black w-6 text-center text-slate-500 font-mono text-[10px] py-0.5">
                    {siangLabMaint[i] ? i + 1 : ''}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 text-black font-medium truncate" style={{ width: 170, maxWidth: 170 }}>
                    {siangLabMaint[i]?.nama || ''}
                  </td>

                  {/* 4. SORE PREP */}
                  <td className="border border-black w-6 text-center text-slate-500 font-mono text-[10px] py-0.5">
                    {sorePrep[i] ? i + 1 : ''}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 text-black font-medium truncate" style={{ width: 160, maxWidth: 160 }}>
                    {sorePrep[i]?.nama || ''}
                  </td>

                  {/* 5. SORE LAB & MAINT */}
                  <td className="border border-black w-6 text-center text-slate-500 font-mono text-[10px] py-0.5">
                    {soreLabMaint[i] ? i + 1 : ''}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 text-black font-medium truncate" style={{ width: 160, maxWidth: 160 }}>
                    {soreLabMaint[i]?.nama || ''}
                  </td>

                  {/* 6. MALAM PREP */}
                  <td className="border border-black w-6 text-center text-slate-500 font-mono text-[10px] py-0.5">
                    {malamPrep[i] ? i + 1 : ''}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 text-black font-medium truncate" style={{ width: 170, maxWidth: 170 }}>
                    {malamPrep[i]?.nama || ''}
                  </td>

                  {/* 7. MALAM LAB & MAINT */}
                  <td className="border border-black w-6 text-center text-slate-500 font-mono text-[10px] py-0.5">
                    {malamLabMaint[i] ? i + 1 : ''}
                  </td>
                  <td className="border border-black px-1.5 py-0.5 text-black font-medium truncate" style={{ width: 170, maxWidth: 170 }}>
                    {malamLabMaint[i]?.nama || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Bagian Bawah: Karyawan yang belum Lapor */}
          <div className="mt-5">
            <div className="font-extrabold text-[13px] text-black mb-1.5">
              Karyawan yang belum Lapor balik Cuti Roster/Site, Izin, Sakit :
            </div>
            <table className="border-collapse border border-black text-[11px] leading-[15px]" style={{ width: '85%' }}>
              <thead>
                <tr className="bg-slate-100 font-extrabold text-black">
                  <th className="border border-black px-2 py-1 text-center w-10">NO</th>
                  <th className="border border-black px-3 py-1 text-left w-52">Nama</th>
                  <th className="border border-black px-3 py-1 text-center w-36">Status</th>
                  <th className="border border-black px-3 py-1 text-center w-56">Tanggal Absensi/Onsite</th>
                  <th className="border border-black px-3 py-1 text-center w-36">Keterangan</th>
                </tr>
              </thead>
              <tbody>
                {belumLaporList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="border border-black text-center py-2 text-slate-500 italic">
                      Tidak ada karyawan belum lapor pada tanggal ini.
                    </td>
                  </tr>
                ) : (
                  belumLaporList.map((r, idx) => (
                    <tr key={r.id || r.nik || idx} className="font-bold text-red-600">
                      <td className="border border-black text-center py-1 font-mono">{idx + 1}</td>
                      <td className="border border-black px-3 py-1 text-red-600">{r.nama}</td>
                      <td className="border border-black px-3 py-1 text-center text-red-600">
                        {r.statusKerja && r.statusKerja !== '-' ? r.statusKerja : (r.status || 'Cuti')}
                      </td>
                      <td className="border border-black px-3 py-1 text-center text-red-600">
                        {dayName(date)}, {longDate(date)}
                      </td>
                      <td className="border border-black px-3 py-1 text-center text-red-700 bg-red-100 font-extrabold">
                        Belum Lapor
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
