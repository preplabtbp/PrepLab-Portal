import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Button, Input } from './ui';
import { Database, Plus, Trash2, Edit2, Save, X, RefreshCw, Users, Wrench, FileText, Activity, Shield, Search, ArrowUpDown, Settings2, Upload } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { PageHeader } from './PageHeader';

const MODULES = [
  { id: 'hr', title: 'HR & Karyawan', icon: <Users className="w-5 h-5" />, tables: ['employees', 'roster', 'pelanggaran'] },
  { id: 'asset', title: 'Asset & Alat', icon: <Wrench className="w-5 h-5" />, tables: ['equipments', 'spareparts'] },
  { id: 'wo', title: 'Work Orders', icon: <FileText className="w-5 h-5" />, tables: ['workOrders', 'tickets', 'downtime'] },
  { id: 'inspect', title: 'Inspeksi & Pantau', icon: <Activity className="w-5 h-5" />, tables: ['inspections', 'pemantauan', 'questions'] },
  { id: 'apd', title: 'Sistem APD', icon: <Shield className="w-5 h-5" />, tables: ['apdSettings', 'apdHistory', 'apdDocuments'] },
  { id: 'agenda', title: 'Agenda & Notes', icon: <FileText className="w-5 h-5" />, tables: ['agendaEvents', 'privateNotes', 'userThemes'] },
  { id: 'system', title: 'System Settings', icon: <Settings2 className="w-5 h-5" />, tables: ['appSettings', 'developerUsers'] }
];

export function AdminDashboard({ inspectorNik }: { inspectorNik?: string }) {
  const isSuperAdmin = inspectorNik === '02D25000055' || inspectorNik === '02D24000043' || inspectorNik === 'preplabadmin';
  const queryClient = useQueryClient();

  const visibleModules = MODULES.map(mod => {
    if (mod.id === 'system' && !isSuperAdmin) {
      return { ...mod, tables: mod.tables.filter(t => t !== 'developerUsers') };
    }
    return mod;
  });

  const [activeModule, setActiveModule] = useState<string>('hr');
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc'|'desc' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [employeesData, setEmployeesData] = useState<any[]>([]);

  useEffect(() => {
    const mod = visibleModules.find(m => m.id === activeModule);
    if (mod && mod.tables.length > 0) {
      setSelectedTable(mod.tables[0]);
    } else {
      setSelectedTable('');
    }
  }, [activeModule]);

  useEffect(() => {
    if (selectedTable) {
      setSearchTerm('');
      setSortConfig(null);
      fetchData();
    }
  }, [selectedTable]);

  const fetchData = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const url = `/api/admin/tables/${selectedTable}${forceRefresh ? '?refresh=1' : ''}`;
      const res = await fetch(url);
      const json = await res.json();
      const rows = Array.isArray(json) ? json : [];
      setData(rows);
      if (selectedTable === 'employees') {
        setEmployeesData(rows);
      }
      queryClient.invalidateQueries();
    } catch (e) {
      console.error(e);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus data ini?')) return;
    try {
      const res = await fetch(`/api/admin/tables/${selectedTable}/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Gagal menghapus data');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(`Yakin ingin menghapus SEMUA data dari tabel ${selectedTable}? (Ini tidak dapat dikembalikan)`)) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/tables/${selectedTable}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete all');
      toast.success('Semua data berhasil dihapus');
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error('Gagal menghapus data');
      setLoading(false);
    }
  };

  const handleSave = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/tables/${selectedTable}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to update');
      setEditingId(null);
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Gagal menyimpan data');
    }
  };

  const handleRegeneratePdf = async (id: number) => {
    const toastId = toast.loading('Sedang memproses ulang PDF...');
    try {
      const res = await fetch(`/api/admin/inspections/${id}/regenerate-pdf`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        if (data.details) {
            throw new Error(`${data.error}: ${data.details.substring(0, 100)}`);
        } else {
            throw new Error(data.error || 'Failed to regenerate PDF');
        }
      }
      toast.success('Berhasil memproses PDF', { id: toastId });
      fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Gagal memproses PDF', { id: toastId });
    } finally {
      setLoading(false);
    }
  };


  const handleAdd = async () => {
    try {
      const res = await fetch(`/api/admin/tables/${selectedTable}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to insert');
      setIsAdding(false);
      setEditForm({});
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error(e.message || 'Gagal menambah data');
    }
  };

  const TABLE_FALLBACKS: Record<string, string[]> = {
    developerUsers: ['id', 'nik', 'name', 'addedAt']
  };
  const columns = data.length > 0 ? Object.keys(data[0]) : (TABLE_FALLBACKS[selectedTable] || []);
  const currentMod = visibleModules.find(m => m.id === activeModule);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      toast.loading('Memproses file Excel...', { id: 'import-toast' });
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          let jsonData = XLSX.utils.sheet_to_json(ws);
          
          if (selectedTable === 'equipments') {
             jsonData = jsonData.map((row: any) => {
               const getVal = (possibleKeys: string[]) => {
                 for (const key of Object.keys(row)) {
                   const cleanKey = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                   for (const pk of possibleKeys) {
                     if (cleanKey === pk.toLowerCase().trim().replace(/[^a-z0-9]/g, '')) {
                       return row[key];
                     }
                   }
                 }
                 return undefined;
               };
               
               let categoryStr = getVal(['category', 'kategori']);
               // Determine category from filename if possible? We don't have filename easily here except file.name
               // But we can just default to 'Asset'
               if (!categoryStr) {
                 const fileName = file.name.toLowerCase();
                 if (fileName.includes('preparation')) categoryStr = 'Asset Preparation';
                 else if (fileName.includes('laboratory') || fileName.includes('lab')) categoryStr = 'Asset Laboratory';
                 else if (fileName.includes('hand tool') || fileName.includes('handtool')) categoryStr = 'Hand Tools';
                 else categoryStr = 'Asset';
               }

               return {
                 category: categoryStr,
                 assetCode: getVal(['assetcode', 'kodeaset']),
                 itemName: getVal(['itemname', 'namabarang']),
                 itemCode: getVal(['itemcode', 'partnumber']),
                 itemDescription: getVal(['itemdescription', 'description']),
                 uom: getVal(['uom']),
                 brand: getVal(['brand']),
                 typeSpecification: getVal(['typespesification', 'typespecification']),
                 serialNumber: String(getVal(['serialnumber']) || ''),
                 dateReceive: getVal(['datereceive', 'tanggalditerima']),
                 dateInstalled: getVal(['dateinstalled']),
                 status: getVal(['status', 'kondisi']) || 'IN USE',
                 location: getVal(['location', 'lokasi']),
                 company: getVal(['company', 'perusahaan']) || 'TBP',
                 poNumber: getVal(['ponumber']),
                 price: String(getVal(['price', 'pricerp', 'priceunit']) || ''),
                 baScrap: getVal(['bascrap']),
                 remarks: getVal(['remarks', 'keterangan'])
               };
             });
             jsonData = jsonData.filter((r: any) => r.itemName); // Must have itemName
          }
          
          
          if (selectedTable === 'spareparts') {
             jsonData = jsonData.map((row: any) => {
               const getVal = (possibleKeys: string[]) => {
                 for (const key of Object.keys(row)) {
                   const cleanKey = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                   for (const pk of possibleKeys) {
                     if (cleanKey === pk.toLowerCase().trim().replace(/[^a-z0-9]/g, '')) {
                       return row[key];
                     }
                   }
                 }
                 return undefined;
               };
               
               return {
                 status: getVal(['status']),
                 code: getVal(['code', 'kode']),
                 item: getVal(['item', 'namabarang']),
                 type: getVal(['type', 'tipe']),
                 spesifikasi: getVal(['spesifikasi', 'spesification', 'specification']),
                 materialCode: getVal(['materialcode', 'kodematerial']),
                 materialDescription: getVal(['materialdescription', 'deskripsimaterial']),
                 lokasi: getVal(['lokasi', 'location']),
                 uom: getVal(['uom', 'satuan']),
                 category: getVal(['category', 'kategori']),
                 stock: parseInt(getVal(['stock', 'stok', 'qty'])) || 0
               };
             });
             jsonData = jsonData.filter((r: any) => r.item); // Must have item
          }

          if (selectedTable === 'workOrders') {
             jsonData = jsonData.map((row: any) => {
               const getVal = (possibleKeys: string[]) => {
                 for (const key of Object.keys(row)) {
                   const cleanKey = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                   for (const pk of possibleKeys) {
                     if (cleanKey === pk.toLowerCase().trim().replace(/[^a-z0-9]/g, '')) return row[key];
                   }
                 }
                 return undefined;
               };
               return {
                 woId: getVal(['woid', 'nowo', 'nomorwo']),
                 requestorNik: String(getVal(['requestornik', 'nik', 'nikrequestor']) || 'SYSTEM'),
                 requestorName: getVal(['requestorname', 'nama', 'namarequestor']),
                 equipmentCode: getVal(['equipmentcode', 'kodealat']),
                 issueDescription: getVal(['issuedescription', 'kendala', 'deskripsi']),
                 status: getVal(['status']) || 'Open',
               };
             }).filter((r: any) => r.woId && r.issueDescription);
          }

          if (selectedTable === 'pemantauan') {
             jsonData = jsonData.map((row: any) => {
               const getVal = (possibleKeys: string[]) => {
                 for (const key of Object.keys(row)) {
                   const cleanKey = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                   for (const pk of possibleKeys) {
                     if (cleanKey === pk.toLowerCase().trim().replace(/[^a-z0-9]/g, '')) return row[key];
                   }
                 }
                 return undefined;
               };
               const tgl = getVal(['tanggal', 'date']);
               const jam = getVal(['jam', 'time']);
               const area = getVal(['lokasiarea', 'area', 'lokasi']);
               const timestampVal = getVal(['timestamp', 'waktu']);
               
               // Fallback date/time from timestamp if missing
               const finalTgl = tgl || (timestampVal ? String(timestampVal).split(' ')[0] : '');
               
               return {
                 timestamp: timestampVal,
                 idPemantauan: getVal(['idpemantauan', 'id']) || `${finalTgl}-${jam || ''}-${area || ''}`.replace(/\s+/g, '-'),
                 kategori: getVal(['kategori']),
                 tanggal: finalTgl,
                 jam: jam,
                 shift: getVal(['shift']),
                 lokasiArea: area,
                 suhuCelcius: String(getVal(['suhu', 'suhucelcius']) || ''),
                 kelembapanPersen: String(getVal(['kelembapan', 'kelembapanpersen']) || ''),
                 flowGas: String(getVal(['flowgas', 'flow']) || ''),
                 tekananGasPsi: String(getVal(['tekanangaspsi', 'tekanangas', 'tekanan']) || ''),
                 kebocoranYn: String(getVal(['kebocoranyn', 'kebocoran']) || ''),
                 catatanRemark: getVal(['catatan', 'remark', 'catatanremark']),
                 inspektorPetugas: getVal(['inspektorpetugas', 'inspektor', 'petugas']),
                 foto: getVal(['foto', 'photo']),
                 suhuUpper: String(getVal(['suhuupper']) || ''),
                 suhuLower: String(getVal(['suhulower']) || ''),
                 kelembapanUpper: String(getVal(['kelembapanupper']) || ''),
                 kelembapanLower: String(getVal(['kelembapanlower']) || ''),
                 fileReport: getVal(['filereport', 'file']),
                 ttd: getVal(['ttd', 'tandatangan', 'signature']),
               };
             }).filter((r: any) => r.tanggal || r.lokasiArea || r.kategori || r.idPemantauan);
          }

          if (selectedTable === 'inspections') {
             jsonData = jsonData.map((row: any) => {
               const getVal = (possibleKeys: string[]) => {
                 for (const key of Object.keys(row)) {
                   const cleanKey = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                   for (const pk of possibleKeys) {
                     if (cleanKey === pk.toLowerCase().trim().replace(/[^a-z0-9]/g, '')) return row[key];
                   }
                 }
                 return undefined;
               };
               const dateVal = getVal(['date', 'tanggal']);
               const shiftVal = getVal(['shift']);
               const eqCode = getVal(['equipmentcode', 'kodealat']);
               return {
                 importId: getVal(['importid']) || `INSP-${dateVal}-${shiftVal}-${eqCode}`.replace(/\s+/g, '-'),
                 inspectorName: getVal(['inspectorname', 'namainspector', 'nama']),
                 equipmentCode: eqCode,
                 shift: shiftVal,
                 type: getVal(['type', 'tipe']),
                 status: getVal(['status']),
                 keterangan: getVal(['keterangan', 'keteranganremark']),
               };
             }).filter((r: any) => r.equipmentCode);
          }

          if (jsonData.length === 0) {
             toast.error('File Excel kosong', { id: 'import-toast' });
             setLoading(false);
             return;
          }

          const res = await fetch(`/api/admin/tables/${selectedTable}/bulk`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(jsonData)
          });
          
          const result = await res.json();
          if (res.ok) {
             toast.success(`Berhasil mengimpor ${result.count} data`, { id: 'import-toast' });
             if (result.errors && result.errors.length > 0) {
                toast.warning(`${result.errors.length} baris gagal diimpor`);
             }
             fetchData();
          } else {
             toast.error(result.error || 'Gagal mengimpor data', { id: 'import-toast' });
          }
        } catch (err: any) {
           console.error(err);
           toast.error('Gagal membaca file Excel', { id: 'import-toast' });
        } finally {
           setLoading(false);
           if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error(err);
      toast.error('Gagal memproses file');
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(item => 
        Object.entries(item).some(([key, val]) => {
          if (key.toLowerCase() === 'dataf' || key.toLowerCase() === 'json') return false;
          return String(val).toLowerCase().includes(lowerSearch);
        })
      );
    }
    if (sortConfig !== null) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [data, searchTerm, sortConfig]);

  const renderCell = (val: any, col: string) => {
    if (val === null || val === undefined) return <span className="text-slate-400 italic text-xs">null</span>;
    if (typeof val === 'boolean') {
      return <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${val ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{val ? 'YES' : 'NO'}</span>;
    }
    if (col === 'id') return <span className="font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded text-xs">{val}</span>;
    
    const valStr = String(val);
    const lowerCol = col.toLowerCase();

    if (lowerCol.includes('status') || lowerCol === 'shift' || lowerCol === 'gol' || lowerCol === 'kategori' || lowerCol === 'tipeinput') {
      let colorClass = 'bg-slate-100 text-slate-700 border-slate-200';
      const v = valStr.toLowerCase();
      if (v.includes('active') || v.includes('permanent') || v.includes('aman') || v.includes('ok')) colorClass = 'bg-teal-50 text-teal-700 border-teal-200';
      else if (v.includes('inactive') || v.includes('kontrak') || v.includes('bahaya')) colorClass = 'bg-amber-50 text-amber-700 border-amber-200';
      else if (v.includes('rusak') || v.includes('nr') || v.includes('error')) colorClass = 'bg-rose-50 text-rose-700 border-rose-200';
      else if (v === 'a' || v === 'b' || v === 'c' || v === 'd') colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      
      return <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${colorClass} whitespace-nowrap shadow-sm`}>{valStr}</span>;
    }

    if (lowerCol === 'name' || lowerCol === 'nama' || lowerCol === 'judulform') {
      return <span className="font-semibold text-slate-800 flex items-center gap-2">
        {lowerCol === 'name' || lowerCol === 'nama' ? <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold shrink-0">{valStr.charAt(0).toUpperCase()}</span> : null}
        {valStr}
      </span>;
    }

    if (lowerCol === 'nik') {
      return <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 shadow-sm">{valStr}</span>;
    }

    if (lowerCol === 'pdfurl') {
      if (!valStr || valStr === '-' || valStr === 'GAS_GENERATED') {
         return <span className="text-xs text-rose-500 font-semibold bg-rose-50 px-2 py-1 rounded">Belum ada PDF</span>;
      }
      return <a href={valStr} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline truncate max-w-[150px] inline-block" title={valStr}>Lihat PDF</a>;
    }

    if (lowerCol === 'dataf') {
      return <span className="text-xs text-slate-400 italic">Hidden Data</span>;
    }

    if (lowerCol === 'item' || lowerCol === 'deskripsi') {
       return <span className="text-sm text-slate-600 block max-w-[250px] truncate" title={valStr}>{valStr}</span>;
    }

    if (valStr.length > 50 && !/^\d{4}-\d{2}-\d{2}T/.test(valStr)) {
      return <span className="text-sm text-slate-600 block max-w-[200px] truncate" title={valStr}>{valStr.substring(0, 50)}...</span>;
    }
    
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(valStr)) {
      try {
        return <span className="text-xs text-slate-500 whitespace-nowrap">
          {format(new Date(valStr), 'dd MMM yyyy, HH:mm')}
        </span>;
      } catch (e) {
        return <span className="text-sm text-slate-600">{valStr}</span>;
      }
    }
    
    if (typeof val === 'object') {
      return <span className="text-[10px] font-mono bg-slate-50 p-1 rounded block max-w-[150px] overflow-hidden overflow-ellipsis whitespace-nowrap border border-slate-100" title={JSON.stringify(val)}>{JSON.stringify(val)}</span>;
    }
    
    return <span className="text-sm text-slate-600">{valStr}</span>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 px-2 sm:px-0">
      <PageHeader 
        title="Developer Panel"
        description="Modular Panel Konfigurasi Sistem"
        icon={<Database />}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {visibleModules.map(mod => (
          <button
            key={mod.id}
            onClick={() => setActiveModule(mod.id)}
            className={`p-3 flex flex-col items-center gap-2 rounded-xl border transition-all ${activeModule === mod.id ? 'bg-teal-50 border-teal-200 text-teal-700 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <div className={`p-2 rounded-full ${activeModule === mod.id ? 'bg-teal-100' : 'bg-slate-100'}`}>
              {mod.icon}
            </div>
            <span className="text-xs font-semibold text-center">{mod.title}</span>
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {currentMod?.tables.map(t => (
          <button
            key={t}
            onClick={() => { setSelectedTable(t); setIsAdding(false); setEditingId(null); }}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${selectedTable === t ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {selectedTable && (
        <Card className="overflow-hidden shadow-sm border border-slate-200">
          <datalist id="employee-list">
          {employeesData.map(emp => (
            <option key={emp.nik} value={emp.nik}>{emp.name}</option>
          ))}
        </datalist>
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3 p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-2 shrink-0">
              <h3 className="font-black text-slate-800 capitalize flex items-center gap-1.5 text-sm sm:text-base font-display">
                Tabel {selectedTable}
              </h3>
              <span className="bg-slate-200 text-slate-700 text-xs py-0.5 px-2.5 rounded-full font-bold font-mono">
                {searchTerm ? `${filteredAndSortedData.length}/${data.length}` : `${data.length}`} records
              </span>
            </div>

            {/* Clean & Proportional Single Search Bar */}
            <div className="relative flex-1 max-w-sm w-full mx-0 lg:mx-3">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Cari di ${selectedTable} (nama, NIK, jabatan, dll)...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white text-slate-800 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-xs placeholder:text-slate-400 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  title="Hapus Kata Kunci"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap shrink-0 justify-end">
              <input type="file" className="hidden" accept=".xlsx, .xls, .csv" ref={fileInputRef} onChange={handleFileUpload} />
              <Button variant="secondary" onClick={() => setShowImportModal(true)} className="px-3 h-9 text-xs font-semibold rounded-xl" disabled={loading}>
                <Upload className="w-3.5 h-3.5 mr-1" /> Import Excel
              </Button>
              <Button variant="danger" onClick={handleDeleteAll} className="px-3 h-9 text-xs font-semibold rounded-xl" disabled={loading}>
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Semua
              </Button>
              <Button variant="secondary" onClick={() => fetchData(true)} className="px-2.5 h-9 rounded-xl" disabled={loading} title="Refresh Data">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={() => { setIsAdding(true); setEditForm({}); setEditingId(null); }} className="px-3.5 h-9 text-xs font-bold rounded-xl shadow-xs bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="w-3.5 h-3.5 mr-1" /> Data Baru
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[600px] bg-white">
            <table className="w-full text-sm text-left relative">
              <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-semibold sticky top-0 z-10 shadow-sm">
                <tr>
                  {columns.map(col => (
                    <th key={col} className="px-4 py-3 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort(col)}>
                      <div className="flex items-center gap-1">
                        {col}
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                  ))}
                  {isAdding && columns.length === 0 && <th className="px-4 py-3">Data JSON</th>}
                  <th className="px-4 py-3 text-right sticky right-0 bg-slate-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isAdding && (
                  <tr className="bg-teal-50/30">
                    {columns.length > 0 ? columns.map(col => (
                      <td key={col} className="px-4 py-2">
                        {col === 'id' || col === 'addedAt' || col === 'createdAt' ? <span className="text-slate-400 italic">auto</span> : (
                          <input 
                            type="text" 
                            className="w-full min-w-[120px] bg-white border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            value={editForm[col] || ''}
                            onChange={e => {
                               const val = e.target.value;
                               let updates = { [col]: val };
                               if (selectedTable === 'developerUsers' && col === 'nik') {
                                   const emp = employeesData.find(emp => emp.nik === val);
                                   if (emp) updates.name = emp.name;
                               }
                               setEditForm({...editForm, ...updates});
                            }}
                            placeholder={col}
                            list={selectedTable === 'developerUsers' && col === 'nik' ? 'employee-list' : undefined}
                          />
                        )}
                      </td>
                    )) : (
                      <td className="px-4 py-2">
                         <textarea 
                           className="w-full bg-white border-slate-200 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-mono"
                           value={editForm.json || ''}
                           onChange={e => setEditForm({...editForm, json: e.target.value})}
                           placeholder='{"kolom": "nilai"}'
                           rows={3}
                         />
                      </td>
                    )}
                    <td className="px-4 py-2 text-right space-x-2 sticky right-0 bg-teal-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]">
                      <button onClick={handleAdd} className="text-teal-600 hover:bg-teal-100 p-1.5 rounded transition-colors"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:bg-slate-200 p-1.5 rounded transition-colors"><X className="w-4 h-4" /></button>
                    </td>
                  </tr>
                )}
                {filteredAndSortedData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                    {columns.map(col => (
                      <td key={col} className="px-4 py-3 text-slate-700 max-w-[200px] truncate">
                        {editingId === row.id && col !== 'id' ? (
                          <input 
                            type="text" 
                            className="w-full min-w-[120px] bg-white border-slate-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                            value={editForm[col] || ''}
                            onChange={e => {
                               const val = e.target.value;
                               let updates = { [col]: val };
                               if (selectedTable === 'developerUsers' && col === 'nik') {
                                   const emp = employeesData.find(emp => emp.nik === val);
                                   if (emp) updates.name = emp.name;
                               }
                               setEditForm({...editForm, ...updates});
                            }}
                            list={selectedTable === 'developerUsers' && col === 'nik' ? 'employee-list' : undefined}
                          />
                        ) : (
                          renderCell(row[col], col)
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50 transition-colors shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.02)]">
                      {editingId === row.id ? (
                        <>
                          <button onClick={() => handleSave(row.id)} className="text-teal-600 hover:bg-teal-100 p-1.5 rounded-md shadow-sm transition-colors border border-teal-200 bg-white"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="text-slate-500 hover:bg-slate-100 p-1.5 rounded-md shadow-sm transition-colors border border-slate-200 bg-white"><X className="w-4 h-4" /></button>
                        </>
                      ) : (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-1">
                          {selectedTable === 'inspections' && (
                            <button onClick={() => handleRegeneratePdf(row.id)} title="Regenerate PDF" className="text-orange-600 hover:bg-orange-100 p-1.5 rounded-md transition-colors border border-orange-200 bg-white shadow-sm"><FileText className="w-4 h-4" /></button>
                          )}
                          <button onClick={() => { setEditingId(row.id); setEditForm(row); setIsAdding(false); }} className="text-blue-600 hover:bg-blue-100 p-1.5 rounded-md transition-colors"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(row.id)} className="text-rose-600 hover:bg-rose-100 p-1.5 rounded-md transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {loading ? (
                  <tr>
                    <td colSpan={columns.length + 1 || 2} className="px-4 py-16 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
                        <p className="text-sm font-semibold text-slate-700">Memuat data tabel <span className="text-teal-700 capitalize font-bold">{selectedTable}</span>...</p>
                        <p className="text-xs text-slate-400">Harap tunggu sebentar...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSortedData.length === 0 && !isAdding ? (
                  <tr>
                    <td colSpan={columns.length + 1 || 2} className="px-4 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Database className="w-8 h-8 text-slate-300" />
                        <p>Tidak ada data ditemukan</p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Syarat Import File Excel</h3>
            <div className="space-y-3 text-sm text-slate-600 mb-6">
              <p>Pastikan file Excel Anda memenuhi kriteria berikut agar dapat diimpor dengan benar:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Baris pertama (Header) <b>harus</b> berisi nama kolom yang sesuai dengan format database.</li>
                <li>Hapus kolom <b>id</b> atau kosongkan isinya untuk menambahkan data baru.</li>
                <li>Format file yang didukung: <b>.xlsx, .xls, .csv</b>.</li>
                <li>Tipe data untuk masing-masing kolom harus sesuai.</li>
              </ul>
              {columns.length > 0 && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-medium text-slate-700 mb-2">Kolom yang Dikenali untuk Tabel <span className="font-bold text-teal-600">{selectedTable}</span>:</p>
                  <p className="font-mono text-xs text-slate-600 leading-relaxed break-words bg-white p-2 border border-slate-100 rounded">
                    {columns.filter(c => c !== 'id' && c !== 'createdAt').join(', ')}
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowImportModal(false)}>
                Batal
              </Button>
              <Button onClick={() => {
                setShowImportModal(false);
                fileInputRef.current?.click();
              }}>
                <Upload className="w-4 h-4 mr-2" />
                Pilih File & Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
