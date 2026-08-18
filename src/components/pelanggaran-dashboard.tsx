import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { AlertTriangle, PlusCircle, X, Save, Trash2, Clock, RefreshCw, LogIn, FileText, Filter, ShieldAlert } from 'lucide-react';
import { getAccessToken, googleSignIn } from '../google-auth';
import { getPelanggaranData } from '../sheets-api';


const mapStatusToCategory = (status: string) => {
  const s = status.toLowerCase();
  if (s.includes('sppt') || s.includes('pertama dan terakhir')) return 'SPPT (SP 3)';
  if (s.includes('sp 3') || s.includes('sp3')) return 'SPPT (SP 3)';
  if (s.includes('sp 2') || s.includes('sp2')) return 'SP 2';
  if (s.includes('sp 1') || s.includes('sp1')) return 'SP 1';
  if (s.includes('sp')) return 'SP 1';
  if (s.includes('teguran')) return 'Surat Teguran';
  if (s.includes('konseling 3')) return 'Konseling 3';
  if (s.includes('konseling 2')) return 'Konseling 2';
  if (s.includes('konseling 1')) return 'Konseling 1';
  if (s.includes('konseling')) return 'Konseling 1';
  return 'Lainnya';
};

export function PelanggaranDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'AKTIF' | 'SEMUA'>('AKTIF');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPelanggaran, setNewPelanggaran] = useState({ nama: '', status: '', tanggal: '', penjelasan: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pelanggaran');
      if (!res.ok) throw new Error("Gagal mengambil data pelanggaran");
      const rows = await res.json();
      
      const allList = [];
      const now = new Date();

      // Parse dates and filter invalid
      let validRows = rows.map((r: any) => {
        let tgl = new Date(r.tanggal);
        return { ...r, parsedDate: tgl, isInvalid: isNaN(tgl.getTime()) };
      }).filter((r: any) => !r.isInvalid);
      
      // Group by person
      const byPerson: Record<string, any[]> = {};
      for (const row of validRows) {
        const key = row.nama.trim().toUpperCase();
        if (!byPerson[key]) byPerson[key] = [];
        byPerson[key].push(row);
      }
      
      const rankMap: Record<string, number> = {
        'Konseling 1': 1,
        'Konseling 2': 2,
        'Konseling 3': 3,
        'Surat Teguran': 4,
        'SP 1': 5,
        'SP 2': 6,
        'SPPT (SP 3)': 7
      };

      // Process chronologically for each person
      for (const key in byPerson) {
        const personRows = byPerson[key];
        personRows.sort((a: any, b: any) => a.parsedDate.getTime() - b.parsedDate.getTime());
        
        let history: any[] = [];
        
        for (const row of personRows) {
          const { id, nama, status, penjelasan, parsedDate } = row;
          const category = mapStatusToCategory(status);
          const rank = rankMap[category] || 0;
          
          let expiryDate = new Date(parsedDate);
          let escalatedFrom = undefined;
          let escalatedTo = undefined;

          // Find active violations at the time of this new violation (allow 7 days grace period for administrative delays)
          const activeAtThisTime = history.filter(v => v.isActive && parsedDate.getTime() <= v.rawExpiryDate.getTime() + (7 * 24 * 60 * 60 * 1000));
          
          if (activeAtThisTime.length > 0) {
            // Find the highest rank active violation
            const highestActive = activeAtThisTime.reduce((prev, current) => (prev.rank > current.rank) ? prev : current);
            
            if (rank >= highestActive.rank) {
              // Escalation!
              expiryDate = new Date(highestActive.rawExpiryDate);
              expiryDate.setMonth(expiryDate.getMonth() + 3);
              
              escalatedFrom = highestActive.status;
              
              // Deactivate the ones that were escalated
              for (const v of activeAtThisTime) {
                v.isActive = false;
                if (!v.escalatedTo) {
                  v.escalatedTo = status;
                }
              }
            } else {
              // Not an escalation (lower rank). Standard 3 months from its own date.
              // It doesn't affect existing higher-rank violations.
              expiryDate.setMonth(expiryDate.getMonth() + 3);
            }
          } else {
            // No active violations. Standard 3 months from its own date.
            expiryDate.setMonth(expiryDate.getMonth() + 3);
          }
          
          history.push({
            id,
            nama,
            status,
            category,
            rank,
            penjelasan,
            parsedDate,
            rawExpiryDate: expiryDate,
            escalatedFrom,
            escalatedTo: undefined,
            isActive: true // tentatively active
          });
        }
        
        // Evaluate which ones are active AS OF TODAY (now)
        const activeToday = history.filter(v => v.isActive && now <= v.rawExpiryDate);
        
        if (activeToday.length > 1) {
           // Only the highest rank should be visible as active
           const highestToday = activeToday.reduce((prev, current) => (prev.rank > current.rank) ? prev : current);
           for (const v of activeToday) {
             if (v !== highestToday) {
               v.isActive = false;
               v.hiddenDueToHigher = highestToday.status;
             }
           }
        }
        
        // Finalize the rows for allList
        for (const v of history) {
           // If it was tentatively active but expired, it should be inactive
           if (v.isActive && now > v.rawExpiryDate) {
             v.isActive = false;
           }
           
           const timeDiff = v.rawExpiryDate.getTime() - now.getTime();
           const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));
           
           allList.push({
             id: v.id,
             nama: v.nama,
             status: v.status,
             tanggal: v.parsedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
             expiryDate: v.rawExpiryDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
             daysLeft,
             monthsValidity: 3,
             penjelasan: v.penjelasan,
             isActive: v.isActive,
             category: v.category,
             rawDate: v.parsedDate,
             escalatedTo: v.escalatedTo,
             escalatedFrom: v.escalatedFrom,
             hiddenDueToHigher: v.hiddenDueToHigher
           });
        }
      }

      allList.sort((a, b) => b.isActive === a.isActive ? a.daysLeft - b.daysLeft : (a.isActive ? -1 : 1));
      setData(allList);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal memuat data');
    }
    setLoading(false);
  };

  
  
  const handleMigrate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pelanggaran/migrate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal migrasi");
      toast.success(`Berhasil migrasi ${data.migrated} data pelanggaran.`);
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Gagal melakukan migrasi.');
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPelanggaran.nama || !newPelanggaran.status || !newPelanggaran.tanggal) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/pelanggaran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: newPelanggaran.nama,
          status: newPelanggaran.status,
          tanggal: newPelanggaran.tanggal,
          penjelasan: newPelanggaran.penjelasan
        })
      });
      if (!res.ok) throw new Error("Gagal menambah data");
      setShowAddForm(false);
      setNewPelanggaran({ nama: '', status: '', tanggal: '', penjelasan: '' });
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    
    try {
      await fetch(`/api/pelanggaran/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

    const firstFiltered = activeFilter === 'AKTIF' ? data.filter(d => d.isActive) : data;
  
  // Aggregate data for chart
  const chartDataObj: Record<string, number> = {
    'Konseling 1': 0,
    'Konseling 2': 0,
    'Konseling 3': 0,
    'Surat Teguran': 0,
    'SP 1': 0,
    'SP 2': 0,
    'SPPT (SP 3)': 0
  };
  
  firstFiltered.forEach(d => {
    if (chartDataObj[d.category] !== undefined) {
      chartDataObj[d.category]++;
    }
  });
  
  const chartData = Object.keys(chartDataObj).map(key => ({
    name: key,
    count: chartDataObj[key]
  }));
  
  const filteredData = selectedCategory ? firstFiltered.filter(d => d.category === selectedCategory) : [];
  filteredData.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());


  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="px-1 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-display font-semibold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-600" /> Dashboard Pelanggaran
          </h2>
          <p className="text-sm text-slate-500 mt-1">Daftar Personel dengan Sanksi Indisipliner</p>
        </div>
        
        
        <div className="flex gap-2">
          <button onClick={handleMigrate} className="p-2 bg-blue-50 text-blue-600 rounded-full border border-blue-200 hover:bg-blue-100 flex items-center gap-2 px-4 text-sm font-bold">
            <RefreshCw className="w-5 h-5" /> Migrasi Data
          </button>
          <button onClick={() => setShowAddForm(true)} className="p-2 bg-rose-50 text-rose-600 rounded-full border border-rose-200 hover:bg-rose-100 flex items-center gap-2 px-4 text-sm font-bold">
            <PlusCircle className="w-5 h-5" /> Tambah
          </button>
          <button onClick={fetchData} className="p-2 bg-white rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>


      </div>

      
      {showAddForm && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Tambah Pelanggaran</h3>
              <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Personel</label>
                <input type="text" required value={newPelanggaran.nama} onChange={e => setNewPelanggaran({...newPelanggaran, nama: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500" placeholder="Masukkan nama..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status / Jenis Pelanggaran</label>
                <select required value={newPelanggaran.status} onChange={e => setNewPelanggaran({...newPelanggaran, status: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500">
                  <option value="">Pilih Status</option>
                  <option value="Konseling 1">Konseling 1</option>
                  <option value="Konseling 2">Konseling 2</option>
                  <option value="Konseling 3">Konseling 3</option>
                  <option value="Surat Teguran">Surat Teguran</option>
                  <option value="SP 1">SP 1</option>
                  <option value="SP 2">SP 2</option>
                  <option value="SP 3">SP 3</option>
                  <option value="SPPT">SPPT</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal Kejadian / Surat</label>
                <input type="date" required value={newPelanggaran.tanggal} onChange={e => setNewPelanggaran({...newPelanggaran, tanggal: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi Pelanggaran</label>
                <textarea rows={3} required value={newPelanggaran.penjelasan} onChange={e => setNewPelanggaran({...newPelanggaran, penjelasan: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500" placeholder="Masukkan detail pelanggaran..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Deskripsi Pelanggaran</label>
                <textarea rows={3} required value={newPelanggaran.penjelasan} onChange={e => setNewPelanggaran({...newPelanggaran, penjelasan: e.target.value})} className="w-full border border-slate-300 rounded-xl px-4 py-2.5 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500" placeholder="Masukkan detail pelanggaran..." />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl font-medium text-slate-600 hover:bg-slate-50">Batal</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-medium shadow-sm disabled:opacity-50 flex justify-center items-center gap-2">
                  {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-sm flex gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold">Gagal memuat data</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600"></div>
        </div>
      ) : (
        <div className="space-y-4">
                    <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-max mb-6">
            <button onClick={() => { setActiveFilter('AKTIF'); setSelectedCategory(null); }} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeFilter === 'AKTIF' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Sanksi Aktif</button>
            <button onClick={() => { setActiveFilter('SEMUA'); setSelectedCategory(null); }} className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${activeFilter === 'SEMUA' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Semua Sanksi</button>
          </div>

          {/* Chart Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
            <h3 className="text-base font-bold text-slate-800 mb-4">Statistik Pelanggaran {activeFilter === 'AKTIF' ? 'Aktif' : 'Semua'}</h3>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} angle={-45} textAnchor="end" height={60} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60} onClick={(data: any) => {
                    const name = data?.activePayload?.[0]?.payload?.name || data?.payload?.name || data?.name;
                    if (name) {
                      setSelectedCategory(selectedCategory === name ? null : name);
                    }
                  }}>
                    {
                      chartData.map((entry, index) => {
                        const isActive = selectedCategory === entry.name;
                        const isOthersActive = selectedCategory !== null && !isActive;
                        let color = '#3b82f6'; // default
                        if (entry.name === 'SPPT (SP 3)') color = '#e11d48';
                        else if (entry.name.includes('SP')) color = '#f59e0b';
                        
                        return <Cell key={`cell-${index}`} fill={color} opacity={isOthersActive ? 0.3 : 1} style={{ cursor: 'pointer', transition: 'opacity 0.2s' }} onClick={() => setSelectedCategory(selectedCategory === entry.name ? null : entry.name)} />;
                      })
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-400 mt-4 text-center">Klik pada batang grafik untuk melihat detail pelanggaran</p>
          </div>

          {selectedCategory && (
            <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-slate-400" />
                <span className="font-semibold text-slate-700">Menampilkan Detail: <span className="text-slate-900">{selectedCategory}</span></span>
              </div>
              <button onClick={() => setSelectedCategory(null)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}


                    {!selectedCategory ? null : filteredData.length === 0 ? (
            <div className="bg-white p-10 rounded-2xl border border-slate-200 text-center flex flex-col items-center">
              <ShieldAlert className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Tidak ada pelanggaran dalam kategori ini.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Personel</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tgl Kejadian</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Berlaku s/d</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredData.map((item, idx) => (
                      <React.Fragment key={idx}>
                        <tr onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className={`hover:bg-slate-50 transition-colors cursor-pointer ${!item.isActive ? 'opacity-60 bg-slate-50/50' : ''}`}>
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-800">{item.nama}</div>
                            {!item.isActive && <div className="text-[10px] font-medium text-slate-500 mt-0.5">{item.escalatedTo ? `Tidak Aktif (Eskalasi menjadi ${item.escalatedTo})` : item.hiddenDueToHigher ? `Tidak Aktif (Ada ${item.hiddenDueToHigher})` : 'Masa Berlaku Selesai'}</div>}
                            {item.isActive && item.daysLeft < 30 && <div className="text-[10px] font-medium text-rose-600 mt-0.5">Berakhir dalam {item.daysLeft} hari</div>}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-start">
                              <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                                item.monthsValidity === 15 ? 'bg-rose-100 text-rose-700' : 
                                item.monthsValidity === 6 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {item.status}
                              </span>
                              {item.escalatedFrom && (
                                <span className="text-[10px] font-medium text-amber-600 mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                  Eskalasi dari {item.escalatedFrom}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-medium">{item.tanggal}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 font-medium">{item.expiryDate}</td>
                          <td className="px-6 py-4 text-center">
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {expandedId === item.id && (
                          <tr>
                            <td colSpan={5} className="px-6 py-4 bg-slate-50/50 border-t-0">
                              <div className="flex gap-3">
                                <FileText className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                <div>
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Detail Pelanggaran</h4>
                                  <p className="text-sm text-slate-700 leading-relaxed max-w-3xl">{item.penjelasan || 'Tidak ada penjelasan detail.'}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200 text-xs mt-6 flex gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            <p>
              <strong>Aturan Eskalasi:</strong> Masa berlaku SP (SP 1, 2, 3, SPPT) adalah 3 bulan. Jika personil melakukan pelanggaran lagi selama masa berlakunya status sekarang, maka sanksi akan otomatis meningkat ke tingkat selanjutnya dan masa berlaku akan ditambahkan 3 bulan dari sisa masa berlaku sebelumnya.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
