import { toast } from 'sonner';
import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, Calendar, User, Save, Package, Trash2, Plus, PlusCircle, UserPlus, CheckCircle2, Upload, Loader2 } from 'lucide-react';
import { ImageModal } from './image-modal';
import { Button, Input, Select } from './ui';

import { addMonths, isBefore, parseISO, format, startOfDay } from 'date-fns';
import { useApdInput, ApdEntry, getHistoryIgnoreCase } from '../features/apd/hooks/useApdInput';

import { getApdSettings, getApdHistoryByNik, recordApdTakes, getEmployees, addEmployee, generateApdDocument, uploadApdProof } from '../sheets-api';
import { PageHeader } from './PageHeader';

const APD_TYPES = [
  "Earplug",
  "Stagen",
  "Safety Glass",
  "Filter Masker Moncong (3M)",
  "Masker Moncong (3M)",
  "Earmuff",
  "Sandal Safety",
  "Jas Laboratorium",
  "Safety Vest (Rompi)",
  "Rompi Hijau",
  "Sepatu Safety"
];




const getIntervalIgnoreCase = (intervals: Record<string, number>, key: string) => {
  if (!intervals) return 0;
  const found = Object.keys(intervals).find(k => k.toLowerCase() === key.toLowerCase());
  return found ? intervals[found] : 0;
};

export function ApdInputScreen() {
  const {
    searchQuery, setSearchQuery,
    isSearching, setIsSearching,
    showAddedPopup, setShowAddedPopup,
    employeeData, setEmployeeData,
    intervals, setIntervals,
    employees, setEmployees,
    uniqueJabatan, uniqueDivisi, uniqueGrup,
    showAddEmployee, setShowAddEmployee,
    newEmployee, setNewEmployee,
    isAddingEmployee, setIsAddingEmployee,
    showDropdown, setShowDropdown,
    tanggal, setTanggal,
    entries, setEntries,
    isSubmitting, setIsSubmitting,
    signatureRef,
    uploadingApd,
    handleUploadProof
  } = useApdInput();



  const handleSearch = async (e?: React.FormEvent, forceNik?: string) => {
    if (e) e.preventDefault();
    const query = forceNik || searchQuery;
    if (!query.trim()) return;
    
    setIsSearching(true);
    setEmployeeData(null);
    setEntries([]);
    setShowAddEmployee(false);
    setShowDropdown(false);
    
    // Validate if employee exists
    const emp = employees.find(emp => emp.nik.toLowerCase() === query.toLowerCase() || emp.nama.toLowerCase() === query.toLowerCase());
    
    if (!emp) {
      setIsSearching(false);
      setShowAddEmployee(true);
      // Pre-fill
      const isNumeric = /^\d+$/.test(query);
      setNewEmployee({ 
        nik: isNumeric ? query : '', 
        nama: !isNumeric ? query : '', 
        jabatan: '', divisi: '', grup: '' 
      });
      return;
    }
    
    const finalNik = emp.nik;
    setSearchQuery(finalNik);

    try {
      const historyMap = await getApdHistoryByNik(finalNik);
      
      setEmployeeData({
        nama: emp.nama,
        nik: emp.nik,
        jabatan: emp.jabatan,
        divisi: emp.divisi,
        grup: emp.grup,
        history: historyMap || {}
      });
      
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengambil data riwayat');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingEmployee(true);
    try {
      await addEmployee(newEmployee);
      toast.success('Karyawan berhasil ditambahkan');
      setEmployees(prev => [...prev, newEmployee]);
      setShowAddEmployee(false);
      handleSearch(undefined, newEmployee.nik);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menambahkan karyawan');
    } finally {
      setIsAddingEmployee(false);
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    emp.nik.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 5);

  const getIntervalWarning = (apd: string, dateStr: string, history: any = null): string | null => {
    if (!history && employeeData) {
      history = employeeData.history;
    }
    if (!history) return null;

    const lastTakenDates = getHistoryIgnoreCase(history, apd) || [];
    if (lastTakenDates.length === 0) return null;

    // Urutkan dari yang terbaru, asumsikan yang terakhir di array adalah yang terbaru
    const lastObj = lastTakenDates[lastTakenDates.length - 1];
    const lastDateStr = typeof lastObj === 'string' ? lastObj : lastObj.date;
    const lastDate = parseISO(lastDateStr);
    
    const intervalMonths = getIntervalIgnoreCase(intervals, apd) || 0;
    
    // Hitung tanggal kapan boleh ambil lagi
    const nextAllowedDate = addMonths(lastDate, intervalMonths);
    const inputDate = startOfDay(parseISO(dateStr));
    
    if (isBefore(inputDate, startOfDay(nextAllowedDate))) {
      return `Terakhir ambil ${lastDateStr}. Interval ${intervalMonths} bln (Baru boleh: ${format(nextAllowedDate, 'dd-MM-yyyy')}).`;
    } 
    return null;
  };

  const updateEntry = (id: string, field: keyof ApdEntry, value: string) => {
    setEntries(prev => prev.map(entry => {
      if (entry.id === id) {
        const newEntry = { ...entry, [field]: value };
        if (field === 'apd') {
          newEntry.warningMessage = getIntervalWarning(value, tanggal);
        }
        return newEntry;
      }
      return entry;
    }));
  };

  const removeEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  const addEntry = () => {
    setEntries(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      apd: APD_TYPES[0],
      ukuran: '-',
      jumlah: '1',
      keterangan: '',
      warningMessage: getIntervalWarning(APD_TYPES[0], tanggal)
    }]);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dt = e.target.value;
    setTanggal(dt);
    // Update all warnings based on new date
    setEntries(prev => prev.map(entry => ({
      ...entry,
      warningMessage: getIntervalWarning(entry.apd, dt)
    })));
  };

  
  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeData || entries.length === 0) return;
    
    // Instead of showing signature, just submit directly.
    submitApdData();

  };


  const submitApdData = async () => {
    setIsSubmitting(true);
    try {
      const isPreparationOrMaintenance = employeeData.divisi === 'Preparation' || employeeData.divisi === 'Maintenance';
      const sptName = isPreparationOrMaintenance ? 'Arif Maulana Lessy' : 'Tigwa Anggawikara';
      const sptJabatan = isPreparationOrMaintenance ? 'Preparation Superintendent' : 'Laboratory Superintendent';

      const isPenggantian = entries.some(e => (getHistoryIgnoreCase(employeeData.history, e.apd) || []).length > 0);
      const pernyataanText = isPenggantian 
        ? "Dengan ini menyatakan bahwa APD milik perusahaan yang telah saya terima dan pakai sudah dalam kondisi rusak atau tidak bisa digunakan. Oleh karena itu telah dilakukan penggantian APD dengan rincian sebagai berikut :" 
        : "Dengan ini menyatakan telah melakukan serah terima APD dengan rincian sebagai berikut:";

      const items = entries.map((e, i) => {
        const h = getHistoryIgnoreCase(employeeData.history, e.apd) || [];
        const lastDate = h.length > 0 ? parseISO(typeof h[h.length - 1] === 'string' ? h[h.length - 1] : h[h.length - 1].date) : null;
        const intervalMonths = getIntervalIgnoreCase(intervals, e.apd) || 0;
        
        return {
          NO: (i + 1).toString(),
          NAMA_APD: e.apd,
          UKURAN: e.ukuran,
          JUMLAH: e.jumlah,
          TANGGALBEFORE: h.length > 0 ? format(parseISO(typeof h[h.length - 1] === 'string' ? h[h.length - 1] : h[h.length - 1].date), 'dd-MM-yyyy') : '-',
          EXPIRED: lastDate ? format(addMonths(lastDate, intervalMonths), 'dd-MM-yyyy') : '-',
          JENIS: h.length > 0 ? 'Penggantian' : 'Pengambilan Baru',
          KETERANGAN: e.keterangan || '-'
        };
      });


      const allEvents: any[] = [];
      Object.keys(employeeData.history).forEach(apd => {
        const takes = employeeData.history[apd];
        takes.forEach((take: any, idx: number) => {
          allEvents.push({
            date: typeof take === 'string' ? take : take.date,
            apd: apd,
            url: typeof take === 'string' ? '' : take.url,
            takeIndex: idx
          });
        });
      });
      // also include the current entries
      const newTakesCount: Record<string, number> = {};
      entries.forEach(entry => {
        const apdLower = entry.apd.toLowerCase();
        const h = getHistoryIgnoreCase(employeeData.history, entry.apd) || [];
        const currentCount = newTakesCount[apdLower] || 0;
        allEvents.push({
          date: tanggal,
          apd: entry.apd,
          url: '', // pending
          takeIndex: h.length + currentCount
        });
        newTakesCount[apdLower] = currentCount + 1;
      });

      allEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      const groupedByTakeIndex: Record<number, any[]> = {};
      allEvents.forEach(ev => {
        if (!groupedByTakeIndex[ev.takeIndex]) groupedByTakeIndex[ev.takeIndex] = [];
        groupedByTakeIndex[ev.takeIndex].push(ev);
      });
      
      const maxTakeIndex = Math.max(-1, ...Object.keys(groupedByTakeIndex).map(Number));
      const historisArray = [];

      for (let i = 0; i <= maxTakeIndex; i++) {
        const events = groupedByTakeIndex[i] || [];
        const row: any = {
          PENGAMBILAN: (i + 1).toString(),
        };
        
        let remarksArr: string[] = [];
        
        events.forEach(ev => {
          let remark = "";
          if (ev.takeIndex === 0) {
            remark = "Baru";
          } else {
            const h = getHistoryIgnoreCase(employeeData.history, ev.apd) || [];
            if (h.length >= ev.takeIndex) {
              const prevTake = h[ev.takeIndex - 1];
              const prevDate = new Date(typeof prevTake === 'string' ? prevTake : prevTake.date);
              const currDate = new Date(ev.date);
              const intervalMonths = getIntervalIgnoreCase(intervals, ev.apd);
              const nextAllowedDate = addMonths(prevDate, intervalMonths);
              if (isBefore(currDate, nextAllowedDate)) {
                remark = "Sebelum interval";
              } else {
                remark = "Sesuai interval";
              }
            } else {
              remark = "Baru";
            }
          }
          remarksArr.push(`${ev.apd}: ${remark}`);
          
          const apdLower = ev.apd.toLowerCase();
          const formattedDate = format(parseISO(ev.date), 'dd-MM-yyyy');
          if (apdLower.includes('earplug')) row.EARPLUG = formattedDate;
          else if (apdLower.includes('stagen')) row.STAGEN = formattedDate;
          else if (apdLower.includes('safety glass')) row.SAFETYGLASS = formattedDate;
          else if (apdLower.includes('filter')) row.FILTER = formattedDate;
          else if (apdLower.includes('masker moncong')) row.MONCONG = formattedDate;
          else if (apdLower.includes('earmuff')) row.EARMUFF = formattedDate;
          else if (apdLower.includes('sandal')) row.SANDAL = formattedDate;
          else if (apdLower.includes('jas')) row.JASLAB = formattedDate;
          else if (apdLower.includes('rompi') && apdLower.includes('hijau')) row.ROMPI2 = formattedDate;
          else if (apdLower.includes('rompi') || apdLower.includes('vest')) row.ROMPI1 = formattedDate;
          else if (apdLower.includes('sepatu')) row.SEPATU = formattedDate;
        });
        
        row.REMARKS = remarksArr.join(', ');
        historisArray.push(row);
      }

      const docData = {
        NAMA: employeeData.nama,
        DEPT: "Preparation & Laboratory",
        JABATAN: employeeData.jabatan,
        NIK: employeeData.nik,
        PERNYATAAN: pernyataanText,
        ITEMS: items,
        HISTORIS: historisArray,
        TANGGALTTD: new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date()),
        NAMASPT: sptName,
        JABATANSPT: sptJabatan,
        TTD: ""
      };
      
      let generatedPdfUrl = "";
      try {
        const res: any = await generateApdDocument(docData);
        if (res && res.pdfUrl) {
          generatedPdfUrl = res.pdfUrl;
        }
      } catch (docErr) {
        console.error("Gagal buat dokumen PDF", docErr);
        // Continue even if document generation fails, we still record APD
      }
      
      await recordApdTakes(employeeData.nik, employeeData.nama, entries.map(ent => ({
        apd: ent.apd,
        tanggal: tanggal,
        keterangan: ent.keterangan,
        signature: ""
      })), generatedPdfUrl);
      
      toast.success(`Berhasil mencatat pengambilan ${entries.length} jenis APD untuk ${employeeData.nama}.`);
      
      const newHistory = { ...employeeData.history };
      entries.forEach(entry => {
        if (!newHistory[entry.apd]) newHistory[entry.apd] = [];
        newHistory[entry.apd].push({ date: new Date().toISOString(), url: generatedPdfUrl });
      });
      
      setEmployeeData({ ...employeeData, history: newHistory });
      setEntries([]);

    } catch (err) {
      console.error(err);
      toast.error('Gagal mencatat pengambilan');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">

      <PageHeader 
        title="Input Pengambilan APD"
        description="Cari karyawan berdasarkan Nama atau NIK untuk mencatat pengambilan APD baru."
        icon={<PlusCircle />}
      />
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200">
        
        <form onSubmit={(e) => handleSearch(e)} className="space-y-4 relative">
          <div className="relative">
            <Input 
              placeholder="Masukkan NIK atau Nama Karyawan" 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
                setShowAddEmployee(false);
                setEmployeeData(null);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="pl-12"
              required
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            
            {showDropdown && searchQuery.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp, idx) => (
                    <div 
                      key={idx} 
                      className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                      onMouseDown={() => {
                        setSearchQuery(emp.nik);
                        setShowDropdown(false);
                      }}
                    >
                      <p className="font-semibold text-slate-800 text-sm">{emp.nama}</p>
                      <p className="text-xs text-slate-500">{emp.nik} • {emp.jabatan}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500 italic">
                    Karyawan tidak ditemukan. Klik cari untuk menambahkan.
                  </div>
                )}
              </div>
            )}
          </div>
          
          <Button type="submit" disabled={isSearching} className="w-full">
            {isSearching ? 'Mencari...' : 'Cari Data Karyawan'}
          </Button>
        </form>
      </div>

      {showAddEmployee && (
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-purple-600" />
            <h3 className="font-bold text-slate-800">Karyawan Belum Terdaftar</h3>
          </div>
          <p className="text-sm text-slate-500 mb-6">Silakan lengkapi data karyawan baru di bawah ini agar otomatis tersimpan di database.</p>
          
          <form onSubmit={handleAddEmployee} className="space-y-4">
            <Input label="NIK" value={newEmployee.nik} onChange={e => setNewEmployee({...newEmployee, nik: e.target.value})} required />
            <Input label="Nama Lengkap" value={newEmployee.nama} onChange={e => setNewEmployee({...newEmployee, nama: e.target.value})} required />
            <Select 
              label="Jabatan" 
              value={newEmployee.jabatan} 
              onChange={e => setNewEmployee({...newEmployee, jabatan: e.target.value})}
              options={uniqueJabatan.map(j => ({ value: j, label: j }))}
              required 
            />
            <Select 
              label="Divisi" 
              value={newEmployee.divisi} 
              onChange={e => setNewEmployee({...newEmployee, divisi: e.target.value})}
              options={uniqueDivisi.map(d => ({ value: d, label: d }))}
              required 
            />
            <Select 
              label="Grup / Shift" 
              value={newEmployee.grup} 
              onChange={e => setNewEmployee({...newEmployee, grup: e.target.value})}
              options={uniqueGrup.map(g => ({ value: g, label: g }))}
              required 
            />
            
            <Button type="submit" disabled={isAddingEmployee} className="w-full bg-purple-600 hover:bg-purple-700">
              {isAddingEmployee ? 'Menyimpan...' : <><Save className="w-4 h-4" /> Simpan & Lanjutkan</>}
            </Button>
          </form>
        </div>
      )}


      {employeeData && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
              <User className="w-6 h-6 text-slate-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">{employeeData.nama}</h3>
              <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded-md text-xs">{employeeData.nik}</span>
                <span>{employeeData.departemen}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {APD_TYPES.map(apd => {
              const historyList = getHistoryIgnoreCase(employeeData.history, apd) || [];
              const totalTakes = historyList.length;
              
              // Calculate eligibility status
              const warningMsg = getIntervalWarning(apd, format(new Date(), 'yyyy-MM-dd'), employeeData.history);
              const isEligible = !warningMsg;

              return (
                <div key={apd} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 flex flex-col relative overflow-hidden group">
                  <div className="flex items-start justify-between mb-4 pb-3 border-b border-slate-100 gap-2">
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm leading-tight">{apd}</h4>
                      {totalTakes > 0 ? (
                        <p className={`text-[10px] font-medium mt-1 ${isEligible ? 'text-teal-600' : 'text-amber-600'}`}>
                          {isEligible ? 'Bisa diambil' : 'Belum waktunya'}
                        </p>
                      ) : (
                        <p className="text-[10px] font-medium mt-1 text-teal-600">Belum pernah diambil</p>
                      )}
                    </div>
                    <span className="bg-purple-50 text-purple-600 text-[10px] font-bold px-2 py-1 rounded-md shrink-0">
                      {totalTakes} Kali
                    </span>
                  </div>
                  
                  {totalTakes > 0 ? (
                    <div className="space-y-2 mt-auto mb-4">
                      {historyList.map((histObj: any, idx: number) => {

                        const hDate = typeof histObj === 'string' ? histObj : histObj.date;
                        const hUrl = typeof histObj === 'string' ? null : histObj.url;
                        let displayDate = hDate;
                        try {
                          if (hDate.includes('T')) {
                            displayDate = format(parseISO(hDate), 'dd-MM-yyyy HH:mm');
                          } else {
                            displayDate = format(parseISO(hDate), 'dd-MM-yyyy');
                          }
                        } catch (e) {}
                        
                        return (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-xs font-medium text-slate-500">
                            Ke-{idx + 1}
                          </span>
                          {hUrl ? (
                            <button type="button" onClick={(e) => { e.preventDefault(); window.open(hUrl, "_blank", "noopener,noreferrer"); }} className="flex items-center gap-1.5 text-teal-700 bg-teal-50 shadow-sm px-2 py-1.5 rounded-lg text-xs font-medium border border-teal-200 hover:bg-teal-100 transition-colors z-10 relative">
                              <Calendar className="w-3.5 h-3.5 text-teal-500" />
                              {displayDate}
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1.5 text-slate-700 bg-white shadow-sm px-2 py-1.5 rounded-lg text-xs font-medium border border-slate-200">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {displayDate}
                              </div>
                              <label className="cursor-pointer p-1.5 rounded-md bg-purple-50 text-purple-600 hover:bg-purple-100 border border-purple-200 transition-colors z-10 relative">
                                {uploadingApd?.nik === employeeData.nik && uploadingApd?.apd === apd && uploadingApd?.date === hDate ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Upload className="w-4 h-4" />
                                )}
                                <input 
                                  type="file" 
                                  accept="application/pdf,image/*" 
                                  className="hidden" 
                                  onChange={(e) => handleUploadProof(employeeData.nik, apd, hDate, e)} 
                                  disabled={!!uploadingApd}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-slate-100 border-dashed text-center my-auto mb-4">
                      Belum ada riwayat pengambilan
                    </div>
                  )}

                  <Button 
                    type="button" 
                    variant={isEligible ? "primary" : "secondary"}
                    className={`w-full py-2.5 rounded-xl text-xs gap-2 mt-auto ${!isEligible && 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'}`}
                    onClick={() => {
                      setEntries(prev => [...prev, {
                        id: Math.random().toString(36).substr(2, 9),
                        apd: apd,
                        ukuran: '-',
                        jumlah: '1',
                        keterangan: '',
                        warningMessage: getIntervalWarning(apd, tanggal, employeeData.history)
                      }]);
                      setShowAddedPopup(apd);
                    }}
                  >
                    <Plus className="w-4 h-4" /> Tambah ke Form Input
                  </Button>
                </div>
              );
            })}
          </div>

          <form id="apd-input-form" onSubmit={handleSaveClick} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mt-8">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                <h3 className="font-semibold text-slate-800">Draft Pengambilan Baru</h3>
              </div>
              <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-md">
                {entries.length} Item
              </span>
            </div>
            
            <div className="p-5 space-y-4">
              <Input
                label="Tanggal Pengambilan (Berlaku untuk semua item)"
                type="date"
                value={tanggal}
                onChange={handleDateChange}
                required
              />

              <div className="space-y-4 mt-6">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="font-semibold text-slate-800 text-sm">Daftar APD yang Diambil</h4>
                </div>

                {entries.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500">Belum ada APD yang dipilih.</p>
                    <p className="text-xs text-slate-400 mt-1">Pilih dari riwayat di atas atau tambah manual.</p>
                  </div>
                ) : (
                  entries.map((entry, index) => (
                    <div key={entry.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 relative group transition-all">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-200 px-2 py-0.5 rounded text-[10px]">Item #{index + 1}</span>
                        <button 
                          type="button" 
                          onClick={() => removeEntry(entry.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1 bg-white rounded-md shadow-sm border border-slate-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <Select
                        label="Jenis APD"
                        value={entry.apd}
                        onChange={(e) => updateEntry(entry.id, 'apd', e.target.value)}
                        options={APD_TYPES.map(apd => ({ value: apd, label: apd }))}
                        required
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Ukuran"
                          placeholder="M, L, XL, 42, -"
                          value={entry.ukuran}
                          onChange={(e) => updateEntry(entry.id, 'ukuran', e.target.value)}
                          required
                        />
                        <Input
                          label="Jumlah"
                          type="number"
                          value={entry.jumlah}
                          onChange={(e) => updateEntry(entry.id, 'jumlah', e.target.value)}
                          required
                        />
                      </div>
                      <Input
                        label="Keterangan (Opsional)"
                        placeholder="Misal: Barang rusak, hilang, dsb."
                        value={entry.keterangan}
                        onChange={(e) => updateEntry(entry.id, 'keterangan', e.target.value)}
                      />

                      {entry.warningMessage && (
                        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-start gap-2.5 mt-2 animate-in fade-in zoom-in-95">
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                          <div>
                            <h4 className="font-semibold text-rose-800 text-xs mb-0.5">Peringatan Interval</h4>
                            <p className="text-[11px] text-rose-700 leading-relaxed">
                              {entry.warningMessage}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-6 border-t border-slate-100 mt-6 space-y-4">
                <Button type="button" onClick={addEntry} variant="secondary" className="w-full text-sm py-3 rounded-2xl gap-2 text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200">
                  <Plus className="w-5 h-5" /> Tambah Manual
                </Button>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-purple-200" disabled={isSubmitting || entries.length === 0}>
                  {isSubmitting ? 'Menyimpan...' : <><Save className="w-5 h-5" /> Simpan {entries.length} Pengambilan</>}
                </Button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showAddedPopup && (
        <div className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-teal-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">{showAddedPopup}</h3>
            <p className="text-sm text-slate-500 mb-6">berhasil ditambahkan ke form pengambilan APD!</p>
            <div className="space-y-3">
              <Button type="button" onClick={() => setShowAddedPopup(null)} variant="secondary" className="w-full py-3 rounded-xl">
                Tambahkan yang Lain
              </Button>
              <Button type="button" onClick={() => {
                setShowAddedPopup(null);
                setTimeout(() => {
                  document.getElementById('apd-input-form')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }} className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700">
                Selesai & Lanjut ke Form
              </Button>
            </div>
          </div>
        </div>
      )}


</div>  );}