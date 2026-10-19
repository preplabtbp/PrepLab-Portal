import React, { useRef, useState, useMemo, useEffect } from 'react';
import {
  Download,
  FileSpreadsheet,
  Copy,
  Check,
  Users,
  Loader2,
  Sliders,
  Eye,
  EyeOff,
  Edit3,
  RotateCcw,
  Plus,
  Trash2,
} from 'lucide-react';
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

export type BungkusColumnKey =
  | 'pagi'
  | 'siangPrep'
  | 'siangLabMaint'
  | 'sorePrep'
  | 'soreLabMaint'
  | 'malamPrep'
  | 'malamLabMaint';

interface BungkusColumnDef {
  key: BungkusColumnKey;
  groupKey: 'PAGI' | 'SIANG' | 'SORE' | 'MALAM';
  groupLabel: string;
  subLabel: string;
  groupBg: string;
  shortLabel: string;
}

const BUNGKUS_COLUMNS: BungkusColumnDef[] = [
  {
    key: 'pagi',
    groupKey: 'PAGI',
    groupLabel: '🌅 PAGI',
    subLabel: 'Prep, Lab & Maint',
    groupBg: 'linear-gradient(135deg, #047857 0%, #065f46 100%)',
    shortLabel: 'Pagi',
  },
  {
    key: 'siangPrep',
    groupKey: 'SIANG',
    groupLabel: '☀️ SIANG',
    subLabel: 'Preparasi',
    groupBg: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
    shortLabel: 'Siang Prep',
  },
  {
    key: 'siangLabMaint',
    groupKey: 'SIANG',
    groupLabel: '☀️ SIANG',
    subLabel: 'Lab & Maint',
    groupBg: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
    shortLabel: 'Siang Lab',
  },
  {
    key: 'sorePrep',
    groupKey: 'SORE',
    groupLabel: '🌇 SORE',
    subLabel: 'Preparasi',
    groupBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    shortLabel: 'Sore Prep',
  },
  {
    key: 'soreLabMaint',
    groupKey: 'SORE',
    groupLabel: '🌇 SORE',
    subLabel: 'Lab & Maint',
    groupBg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
    shortLabel: 'Sore Lab',
  },
  {
    key: 'malamPrep',
    groupKey: 'MALAM',
    groupLabel: '🌙 MALAM',
    subLabel: 'Preparasi',
    groupBg: 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)',
    shortLabel: 'Malam Prep',
  },
  {
    key: 'malamLabMaint',
    groupKey: 'MALAM',
    groupLabel: '🌙 MALAM',
    subLabel: 'Lab & Maint',
    groupBg: 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)',
    shortLabel: 'Malam Lab',
  },
];

const portions = (v: string | null | undefined) => {
  const n = Number(String(v || '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const isPrepSection = (r: RecipientOrderRow) => {
  const s = String(r.section || '').toLowerCase();
  return s.includes('prep') || s.includes('preparasi');
};

interface RecipientItem {
  id: string;
  nama: string;
  nik?: string;
  section?: string;
}

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

  // Mode Edit
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [newRecipientInputs, setNewRecipientInputs] = useState<Record<BungkusColumnKey, string>>({
    pagi: '',
    siangPrep: '',
    siangLabMaint: '',
    sorePrep: '',
    soreLabMaint: '',
    malamPrep: '',
    malamLabMaint: '',
  });

  // Pengaturan kelegaan kolom dinamis (User Adjustable)
  const [nameColWidth, setNameColWidth] = useState<number>(240); // 240px memastikan nama panjang muat utuh
  const [noColWidth, setNoColWidth] = useState<number>(22);       // 22px ramping & proporsional
  const [fontSize, setFontSize] = useState<number>(11);          // Ukuran font teks nama

  // Hitung awal data penerima dari order rows
  const initialData = useMemo(() => {
    const pagiList = rows
      .filter(r => portions(r.pagiLapangan) > 0 || (r.catatan || '').toLowerCase().includes('pagi'))
      .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama))
      .map((r, i) => ({ id: `pagi-${r.nik || r.nama}-${i}`, nama: r.nama, nik: r.nik, section: r.section || '' }));

    const siangAll = rows.filter(r => portions(r.siangLapangan) > 0);
    const siangPrepList = siangAll
      .filter(isPrepSection)
      .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama))
      .map((r, i) => ({ id: `siangPrep-${r.nik || r.nama}-${i}`, nama: r.nama, nik: r.nik, section: r.section || '' }));
    const siangLabMaintList = siangAll
      .filter(r => !isPrepSection(r))
      .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama))
      .map((r, i) => ({ id: `siangLab-${r.nik || r.nama}-${i}`, nama: r.nama, nik: r.nik, section: r.section || '' }));

    const soreAll = rows.filter(r => portions(r.soreLapangan) > 0 || (r.catatan || '').toLowerCase().includes('sore'));
    const sorePrepList = soreAll
      .filter(isPrepSection)
      .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama))
      .map((r, i) => ({ id: `sorePrep-${r.nik || r.nama}-${i}`, nama: r.nama, nik: r.nik, section: r.section || '' }));
    const soreLabMaintList = soreAll
      .filter(r => !isPrepSection(r))
      .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama))
      .map((r, i) => ({ id: `soreLab-${r.nik || r.nama}-${i}`, nama: r.nama, nik: r.nik, section: r.section || '' }));

    const malamAll = rows.filter(
      r => portions(r.malamLapangan) > 0 ||
        String(r.shiftKerja || '').toUpperCase() === 'MALAM' ||
        String(r.statusKerja || '').toUpperCase() === 'MALAM'
    );
    const malamPrepList = malamAll
      .filter(isPrepSection)
      .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama))
      .map((r, i) => ({ id: `malamPrep-${r.nik || r.nama}-${i}`, nama: r.nama, nik: r.nik, section: r.section || '' }));
    const malamLabMaintList = malamAll
      .filter(r => !isPrepSection(r))
      .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama))
      .map((r, i) => ({ id: `malamLab-${r.nik || r.nama}-${i}`, nama: r.nama, nik: r.nik, section: r.section || '' }));

    const res: Record<BungkusColumnKey, RecipientItem[]> = {
      pagi: pagiList,
      siangPrep: siangPrepList,
      siangLabMaint: siangLabMaintList,
      sorePrep: sorePrepList,
      soreLabMaint: soreLabMaintList,
      malamPrep: malamPrepList,
      malamLabMaint: malamLabMaintList,
    };
    return res;
  }, [rows]);

  // State data penerima (dapat diedit secara lokal)
  const [recipients, setRecipients] = useState<Record<BungkusColumnKey, RecipientItem[]>>(initialData);

  // State kolom yang disembunyikan (Hide)
  const [hiddenCols, setHiddenCols] = useState<Record<BungkusColumnKey, boolean>>({
    pagi: false,
    siangPrep: false,
    siangLabMaint: false,
    sorePrep: false,
    soreLabMaint: false,
    malamPrep: false,
    malamLabMaint: false,
  });

  // Sinkronisasi saat date atau rows berubah: reset recipients dan auto-hide kolom kosong
  useEffect(() => {
    setRecipients(initialData);
    setHiddenCols({
      pagi: initialData.pagi.length === 0,
      siangPrep: initialData.siangPrep.length === 0,
      siangLabMaint: initialData.siangLabMaint.length === 0,
      sorePrep: initialData.sorePrep.length === 0,
      soreLabMaint: initialData.soreLabMaint.length === 0,
      malamPrep: initialData.malamPrep.length === 0,
      malamLabMaint: initialData.malamLabMaint.length === 0,
    });
  }, [initialData, date]);

  // Kolom yang sedang ditampilkan
  const visibleColumns = useMemo(() => {
    return BUNGKUS_COLUMNS.filter(col => !hiddenCols[col.key]);
  }, [hiddenCols]);

  // Toggle Hide/Show Kolom
  const toggleColumnHide = (colKey: BungkusColumnKey) => {
    setHiddenCols(prev => {
      const next = { ...prev, [colKey]: !prev[colKey] };
      const activeCount = BUNGKUS_COLUMNS.filter(c => !next[c.key]).length;
      if (activeCount === 0) {
        toast.warning('Minimal harus ada 1 kolom yang ditampilkan.');
        return prev;
      }
      return next;
    });
  };

  const showAllColumns = () => {
    setHiddenCols({
      pagi: false,
      siangPrep: false,
      siangLabMaint: false,
      sorePrep: false,
      soreLabMaint: false,
      malamPrep: false,
      malamLabMaint: false,
    });
    toast.success('Semua kolom ditampilkan kembali.');
  };

  const autoHideEmptyColumns = () => {
    setHiddenCols({
      pagi: recipients.pagi.length === 0,
      siangPrep: recipients.siangPrep.length === 0,
      siangLabMaint: recipients.siangLabMaint.length === 0,
      sorePrep: recipients.sorePrep.length === 0,
      soreLabMaint: recipients.soreLabMaint.length === 0,
      malamPrep: recipients.malamPrep.length === 0,
      malamLabMaint: recipients.malamLabMaint.length === 0,
    });
    toast.success('Kolom kosong otomatis disembunyikan.');
  };

  // Operasi Edit Baris Penerima
  const handleEditName = (colKey: BungkusColumnKey, idx: number, val: string) => {
    setRecipients(prev => {
      const list = [...prev[colKey]];
      if (list[idx]) {
        list[idx] = { ...list[idx], nama: val };
      }
      return { ...prev, [colKey]: list };
    });
  };

  const handleDeleteRecipient = (colKey: BungkusColumnKey, idx: number) => {
    setRecipients(prev => {
      const list = [...prev[colKey]];
      list.splice(idx, 1);
      return { ...prev, [colKey]: list };
    });
    toast.info('Nama penerima dihapus dari kolom.');
  };

  const handleAddRecipient = (colKey: BungkusColumnKey) => {
    const val = (newRecipientInputs[colKey] || '').trim();
    if (!val) return;
    setRecipients(prev => {
      const list = [...prev[colKey]];
      list.push({
        id: `manual-${colKey}-${Date.now()}-${Math.random()}`,
        nama: val,
      });
      return { ...prev, [colKey]: list };
    });
    setNewRecipientInputs(prev => ({ ...prev, [colKey]: '' }));
    toast.success(`"${val}" ditambahkan.`);
  };

  const handleResetToOriginal = () => {
    setRecipients(initialData);
    autoHideEmptyColumns();
    toast.success('Daftar penerima dikembalikan ke data orderan awal.');
  };

  // Hitung total penerima aktif
  const totalPenerimaCount = Object.values(recipients).reduce((acc, curr) => acc + curr.length, 0);

  // Hitung max rows dari kolom yang terlihat
  const maxRows = Math.max(
    ...visibleColumns.map(col => recipients[col.key]?.length || 0),
    1
  );

  // Karyawan belum lapor
  const belumLaporList = rows
    .filter(r => r.keteranganLapor === 'Belum Lapor' || /belum\s*lapor/i.test(String(r.status || '')))
    .sort((a, b) => (a.sortNo ?? 9999) - (b.sortNo ?? 9999) || a.nama.localeCompare(b.nama));

  const titleText = `Daftar penerimaan Bungkusan karyawan Prep&Lab  ${dayName(date).toUpperCase()}, ${longDate(date).toUpperCase()}`;

  // Lebar lembar dinamis menyesuaikan kolom aktif
  const visibleColCount = Math.max(visibleColumns.length, 1);
  const sheetWidth = Math.max(860, visibleColCount * (noColWidth + nameColWidth) + 90);

  // Header groups dinamis
  const GROUPS: Array<{ key: 'PAGI' | 'SIANG' | 'SORE' | 'MALAM'; label: string; bg: string }> = [
    { key: 'PAGI', label: `🌅 PAGI (${recipients.pagi.length})`, bg: 'linear-gradient(135deg, #047857 0%, #065f46 100%)' },
    { key: 'SIANG', label: `☀️ SIANG (${recipients.siangPrep.length + recipients.siangLabMaint.length})`, bg: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)' },
    { key: 'SORE', label: `🌇 SORE (${recipients.sorePrep.length + recipients.soreLabMaint.length})`, bg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)' },
    { key: 'MALAM', label: `🌙 MALAM (${recipients.malamPrep.length + recipients.malamLabMaint.length})`, bg: 'linear-gradient(135deg, #4338ca 0%, #3730a3 100%)' },
  ];

  // Export Excel
  const exportExcel = () => {
    try {
      const aoa: any[][] = [];
      aoa.push([titleText]);
      aoa.push([]);

      // Baris Grup
      const groupRow: string[] = [];
      GROUPS.forEach(g => {
        const subColsInGroup = visibleColumns.filter(c => c.groupKey === g.key);
        if (subColsInGroup.length > 0) {
          groupRow.push(g.label);
          for (let i = 1; i < subColsInGroup.length * 2; i++) {
            groupRow.push('');
          }
        }
      });
      aoa.push(groupRow);

      // Baris Subheader
      const subHeaderRow: string[] = [];
      visibleColumns.forEach(c => {
        subHeaderRow.push('No');
        subHeaderRow.push(`${c.subLabel} (${recipients[c.key]?.length || 0})`);
      });
      aoa.push(subHeaderRow);

      // Data Rows
      for (let i = 0; i < maxRows; i++) {
        const rowData: any[] = [];
        visibleColumns.forEach(c => {
          const item = recipients[c.key]?.[i];
          rowData.push(item ? i + 1 : '');
          rowData.push(item?.nama || '');
        });
        aoa.push(rowData);
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
    const wasEditing = isEditMode;
    if (wasEditing) setIsEditMode(false);
    setDownloadingPdf(true);

    try {
      // Berikan jeda render agar elemen input beralih ke teks biasa untuk foto
      await new Promise(r => setTimeout(r, 60));
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
      if (wasEditing) setIsEditMode(true);
      setDownloadingPdf(false);
    }
  };

  const copyText = () => {
    let t = `*${titleText}*\n\n`;
    visibleColumns.forEach(c => {
      const list = recipients[c.key] || [];
      t += `*${c.groupKey} - ${c.subLabel.toUpperCase()} (${list.length})*\n`;
      if (list.length === 0) {
        t += `-(Kosong)-\n`;
      } else {
        t += list.map((r, i) => `${i + 1}. ${r.nama}`).join('\n') + '\n';
      }
      t += '\n';
    });

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
    padding: '6px 8px',
    textAlign: 'center',
    verticalAlign: 'middle',
    fontSize: '11px',
    fontWeight: 700,
    color: '#1e293b',
    backgroundColor: '#f1f5f9',
    borderBottom: '1.5px solid #cbd5e1',
    borderRight: '1.5px solid #cbd5e1',
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
    padding: '4px 6px',
    whiteSpace: 'nowrap',
    overflow: 'visible',
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
            {/* Tombol Mode Edit */}
            <button
              type="button"
              onClick={() => setIsEditMode(!isEditMode)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs ${
                isEditMode
                  ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-300'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
              }`}
              title="Edit nama penerima atau tambahkan manual"
            >
              <Edit3 className="w-4 h-4" />
              {isEditMode ? 'Selesai Edit' : 'Edit Nama / Kolom'}
            </button>

            {isEditMode && (
              <button
                type="button"
                onClick={handleResetToOriginal}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                title="Kembalikan ke data asli orderan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Data
              </button>
            )}

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

        {/* Toolbar Visibilitas Kolom & Tanda Hide */}
        <div className="flex flex-col gap-2 pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-slate-700 font-bold">
              <Eye className="w-4 h-4 text-emerald-600" />
              <span>Visibilitas Kolom (Klik untuk Hide / Tampilkan):</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={autoHideEmptyColumns}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer transition-colors"
                title="Sembunyikan semua kolom yang memiliki 0 penerima"
              >
                Sembunyikan Kolom Kosong
              </button>
              <button
                type="button"
                onClick={showAllColumns}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition-colors"
                title="Tampilkan semua kolom"
              >
                Tampilkan Semua
              </button>
            </div>
          </div>

          {/* Chips toggle per kolom */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {BUNGKUS_COLUMNS.map(col => {
              const isHidden = hiddenCols[col.key];
              const count = recipients[col.key]?.length || 0;
              return (
                <button
                  key={col.key}
                  type="button"
                  onClick={() => toggleColumnHide(col.key)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                    isHidden
                      ? 'bg-slate-100 text-slate-400 border-dashed border-slate-300 line-through'
                      : count === 0
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  }`}
                  title={isHidden ? `Klik untuk TAMPILKAN kolom ${col.shortLabel}` : `Klik untuk SEMBUNYIKAN (HIDE) kolom ${col.shortLabel}`}
                >
                  {isHidden ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-emerald-600" />}
                  <span>{col.shortLabel}</span>
                  <span className={`px-1 rounded text-[10px] ${isHidden ? 'bg-slate-200 text-slate-500' : 'bg-emerald-200/80 text-emerald-900 font-extrabold'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Adjuster Toolbar: Atur Lebar Kolom Nama & Nomor */}
        <div className="flex items-center gap-4 pt-2 border-t border-slate-100 text-xs flex-wrap">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>Ukuran Tampilan:</span>
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
              className="w-24 accent-emerald-600 cursor-pointer"
              title={`Lebar Kolom Nama saat ini: ${nameColWidth}px`}
            />
            <span className="font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
              {nameColWidth}px
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Font:</span>
            <input
              type="range"
              min={9}
              max={14}
              step={1}
              value={fontSize}
              onChange={e => setFontSize(Number(e.target.value))}
              className="w-16 accent-emerald-600 cursor-pointer"
              title={`Ukuran Font saat ini: ${fontSize}px`}
            />
            <span className="font-mono font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5">
              {fontSize}px
            </span>
          </div>

          {/* Preset Cepat */}
          <div className="flex items-center gap-1.5 sm:ml-auto">
            <span className="text-slate-400 text-[11px] mr-1">Preset:</span>
            <button
              type="button"
              onClick={() => { setNameColWidth(210); setNoColWidth(20); setFontSize(10.5); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                nameColWidth === 210 ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Standar
            </button>
            <button
              type="button"
              onClick={() => { setNameColWidth(240); setNoColWidth(22); setFontSize(11); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                nameColWidth === 240 ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Lega (Full Nama)
            </button>
            <button
              type="button"
              onClick={() => { setNameColWidth(280); setNoColWidth(24); setFontSize(12); }}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                nameColWidth === 280 ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Ekstra Luas
            </button>
          </div>
        </div>

        {isEditMode && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-center justify-between">
            <span className="font-medium">
              💡 <strong>Mode Edit Aktif:</strong> Anda dapat mengubah nama langsung pada baris tabel, menghapus nama dengan tombol tempat sampah, atau menambahkan nama baru di bagian bawah masing-masing kolom.
            </span>
            <button
              type="button"
              onClick={() => setIsEditMode(false)}
              className="px-2.5 py-1 font-bold bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] cursor-pointer"
            >
              Selesai Edit
            </button>
          </div>
        )}
      </div>

      {/* Lembar Tampilan Executive Manifest (Dinamis Sesuai Kolom yang Aktif) */}
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
                  PAGI: {recipients.pagi.length}
                </div>
                <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '4px 10px', fontSize: '10.5px', fontWeight: 800, color: '#1d4ed8' }}>
                  SIANG: {recipients.siangPrep.length + recipients.siangLabMaint.length}
                </div>
                <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '4px 10px', fontSize: '10.5px', fontWeight: 800, color: '#b45309' }}>
                  SORE: {recipients.sorePrep.length + recipients.soreLabMaint.length}
                </div>
                <div style={{ backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '6px', padding: '4px 10px', fontSize: '10.5px', fontWeight: 800, color: '#4338ca' }}>
                  MALAM: {recipients.malamPrep.length + recipients.malamLabMaint.length}
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Utama Dinamis Sesuai Kolom yang Ditampilkan */}
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
                {visibleColumns.map(col => (
                  <React.Fragment key={col.key}>
                    <col style={{ width: noColWidth }} />
                    <col style={{ width: nameColWidth }} />
                  </React.Fragment>
                ))}
              </colgroup>
              <thead>
                {/* Header Waktu Makan (Group Headers Dinamis) */}
                <tr>
                  {GROUPS.map((g, gIdx) => {
                    const subColsInGroup = visibleColumns.filter(c => c.groupKey === g.key);
                    if (subColsInGroup.length === 0) return null;
                    const isLastGroup = gIdx === GROUPS.length - 1;
                    return (
                      <th
                        key={g.key}
                        colSpan={subColsInGroup.length * 2}
                        style={{
                          ...thBase,
                          background: g.bg,
                          borderRight: isLastGroup ? 'none' : '1.5px solid #cbd5e1',
                        }}
                      >
                        {g.label}
                      </th>
                    );
                  })}
                </tr>

                {/* Subheader Bagian dengan Tombol / Tanda Hide */}
                <tr>
                  {visibleColumns.map((col, idx) => {
                    const count = recipients[col.key]?.length || 0;
                    const isLast = idx === visibleColumns.length - 1;
                    return (
                      <th
                        key={col.key}
                        colSpan={2}
                        style={{
                          ...subThBase,
                          borderRight: isLast ? 'none' : '1.5px solid #cbd5e1',
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}>
                          <span>
                            {col.subLabel} ({count})
                          </span>
                          {/* Tombol Tanda Hide Kolom */}
                          <button
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              toggleColumnHide(col.key);
                            }}
                            title={`Sembunyikan kolom ${col.subLabel} (Hide)`}
                            style={{
                              border: 'none',
                              background: '#e2e8f0',
                              color: '#64748b',
                              borderRadius: '4px',
                              padding: '2px 4px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: '10px',
                            }}
                            className="hover:bg-rose-100 hover:text-rose-700 transition-colors"
                          >
                            <EyeOff style={{ width: '12px', height: '12px', marginRight: '2px' }} />
                            <span>Hide</span>
                          </button>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: maxRows }).map((_, i) => {
                  const isZebra = i % 2 === 1;
                  const rowBg = isZebra ? '#f8fafc' : '#ffffff';
                  return (
                    <tr key={i} style={{ backgroundColor: rowBg, height: '24px' }}>
                      {visibleColumns.map((col, cIdx) => {
                        const item = recipients[col.key]?.[i];
                        const isLast = cIdx === visibleColumns.length - 1;
                        return (
                          <React.Fragment key={col.key}>
                            {/* Kolom Nomor */}
                            <td style={tdNo}>{item ? i + 1 : ''}</td>

                            {/* Kolom Nama */}
                            <td
                              style={{
                                ...tdName,
                                borderRight: isLast ? 'none' : '1.5px solid #cbd5e1',
                              }}
                              title={item?.nama || ''}
                            >
                              {item ? (
                                isEditMode ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <input
                                      type="text"
                                      value={item.nama}
                                      onChange={e => handleEditName(col.key, i, e.target.value)}
                                      style={{
                                        width: '100%',
                                        fontSize: `${fontSize}px`,
                                        padding: '2px 4px',
                                        border: '1px solid #94a3b8',
                                        borderRadius: '4px',
                                        background: '#ffffff',
                                        color: '#0f172a',
                                        boxSizing: 'border-box',
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRecipient(col.key, i)}
                                      title="Hapus nama ini"
                                      style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#ef4444',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <Trash2 style={{ width: '13px', height: '13px' }} />
                                    </button>
                                  </div>
                                ) : (
                                  <span>{item.nama}</span>
                                )
                              ) : (
                                ''
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Baris Tambah Penerima Saat Mode Edit Aktif */}
                {isEditMode && (
                  <tr style={{ backgroundColor: '#fffbeb', borderTop: '2px dashed #f59e0b' }}>
                    {visibleColumns.map((col, cIdx) => {
                      const isLast = cIdx === visibleColumns.length - 1;
                      return (
                        <React.Fragment key={`add-${col.key}`}>
                          <td style={{ ...tdNo, backgroundColor: '#fef3c7', color: '#b45309' }}>+</td>
                          <td
                            style={{
                              ...tdName,
                              backgroundColor: '#fffbeb',
                              borderRight: isLast ? 'none' : '1.5px solid #cbd5e1',
                              padding: '4px 6px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="text"
                                placeholder={`+ Nama ${col.shortLabel}...`}
                                value={newRecipientInputs[col.key] || ''}
                                onChange={e => setNewRecipientInputs(prev => ({ ...prev, [col.key]: e.target.value }))}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddRecipient(col.key);
                                  }
                                }}
                                style={{
                                  width: '100%',
                                  fontSize: '11px',
                                  padding: '2px 5px',
                                  border: '1px solid #f59e0b',
                                  borderRadius: '4px',
                                  backgroundColor: '#ffffff',
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleAddRecipient(col.key)}
                                title="Tambahkan nama ini"
                                style={{
                                  border: 'none',
                                  backgroundColor: '#f59e0b',
                                  color: '#ffffff',
                                  borderRadius: '4px',
                                  padding: '3px 6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                }}
                              >
                                <Plus style={{ width: '12px', height: '12px' }} />
                              </button>
                            </div>
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                )}
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

