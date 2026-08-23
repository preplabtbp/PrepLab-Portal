import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, Loader2, Calendar, MapPin, Briefcase, Clock, Plane, PlaneTakeoff, Info, Search, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { getRosterData } from '../sheets-api';
import { Button } from './ui';
import { PageHeader } from './PageHeader';

function safeFormatDate(date: any, options: any) {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('id-ID', options);
  } catch (e) { return '-'; }
}

function parseStringDate(str: string | null | undefined) {
  if (!str || str === '-') return null;
  const parts = str.replace(/-/g, ' ').split(' ');
  if (parts.length >= 3) {
    const mmap: Record<string, number> = {Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11};
    let year = parseInt(parts[2]);
    if (year < 100) year += 2000;
    return new Date(year, mmap[parts[1]] || 0, parseInt(parts[0]));
  }
  return new Date(str);
}

export function RosterAdminScreen() {
  const [roster, setRoster] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('ALL');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch('/api/roster/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSyncFeedback({ type: 'success', message: data.message || 'Sinkronisasi Roster berhasil diperbarui!' });
        // Refresh data
        const refreshed = await getRosterData();
        setRoster(refreshed);
      } else {
        setSyncFeedback({ type: 'error', message: data.message || 'Gagal sinkronisasi data dari Google Sheets' });
      }
    } catch (e: any) {
      setSyncFeedback({ type: 'error', message: 'Koneksi gagal: ' + e.message });
    } finally {
      setIsSyncing(false);
    }
  };
  
    const getHierarchyLevel = (jabatan: string) => {
    if (!jabatan) return 6;
    const j = jabatan.toLowerCase();
    if (j.includes('manager')) return 1;
    if (j.includes('superintendent')) return 2;
    if (j.includes('supervisor') || j.includes('specialist')) return 3;
    if (j.includes('foreman') || j.includes('officer')) return 4;
    if (j.includes('admin')) return 5;
    return 6;
  };

  
  const filteredRoster = useMemo(() => {
    let list = roster;
    
    let requestorRole = currentUser?.jabatan || '';
    let requestorSection = currentUser?.section || '';
    let requestorNik = currentUser?.nik || localStorage.getItem('p2h_inspector_nik') || '';
    let requestorPt = currentUser?.pt || '';
    
    if (!currentUser) {
       const savedProfileStr = localStorage.getItem('p2h_inspector_profile');
       if (savedProfileStr) {
         try {
           const prof = JSON.parse(savedProfileStr);
           requestorRole = prof.jabatan || '';
           requestorSection = prof.section || '';
           requestorPt = prof.pt || '';
         } catch(e) {}
       }
    }
    
    // Filter by PT
    if (requestorPt === 'GTS') {
      list = list.filter(emp => emp.pt === 'GTS');
    } else if (requestorPt === 'TBP' || requestorPt === 'GPS') {
      list = list.filter(emp => emp.pt !== 'GTS');
    }

    
    const isSysAdmin = requestorNik === '02D25000055' || requestorNik === 'preplabadmin';
    const levelU = isSysAdmin ? 0 : getHierarchyLevel(requestorRole);
    const hasSectionFilter = isSysAdmin || levelU === 1 || levelU === 2 || requestorSection === 'QA' || requestorSection === 'Administration';

    list = list.filter(emp => {
      // Abaikan karyawan yang tidak memiliki jadwal roster (keterangan kosong / kemungkinan resign)
      const hasSchedule = (emp.fullSchedule && Object.keys(emp.fullSchedule).length > 0) || (emp.schedule && emp.schedule.length > 0);
      if (!hasSchedule) return false;

      if (isSysAdmin) {
        if (sectionFilter !== 'ALL') return emp.section === sectionFilter;
        return true;
      }
      
      // If a section filter is active and this user can use it, show everyone in that section
      if (hasSectionFilter && sectionFilter !== 'ALL') {
        return emp.section === sectionFilter;
      }
      
      const levelE = getHierarchyLevel(emp.jabatan);
      
      // Default rules if no filter is applied (or filter is ALL)
      if (levelU === 1) { // Manager
        // Manager sees peers (Managers), SPT, SPV
        return levelE === 1 || levelE === 2 || levelE === 3;
      }
      if (levelU === 2) { // SPT
        // SPT sees peers (SPT), SPV in their section
        return emp.section === requestorSection && (levelE === 2 || levelE === 3);
      }
      if (levelU === 3) { // SPV
        // SPV sees peers (SPV), and subordinates (Foreman, Admin, Crew) in their section
        return emp.section === requestorSection && levelE >= 3;
      }
      if (levelU === 4) { // Foreman
        // Foreman sees peers (Foreman), and subordinates (Admin, Crew) in their section
        return emp.section === requestorSection && levelE >= 4;
      }
      if (levelU === 5) { // Admin
        // Admin sees only their exact own team (exact same title)
        return levelE === 5 && emp.jabatan === requestorRole;
      }
      if (levelU === 6) { // Crew
        // Crew sees other crew in their section
        return emp.section === requestorSection && levelE === 6;
      }
      return false;
    });

    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      list = list.filter(r => 
        r.name.toLowerCase().includes(lowerQ) || 
        r.nik.toLowerCase().includes(lowerQ) || 
        (r.jabatan && r.jabatan.toLowerCase().includes(lowerQ))
      );
    }
    
    // Sort by hierarchy
    list.sort((a, b) => getHierarchyLevel(a.jabatan) - getHierarchyLevel(b.jabatan));
    
    return list;
  }, [roster, currentUser, searchQuery, sectionFilter]);

  const hasSectionFilter = useMemo(() => {
    let requestorRole = currentUser?.jabatan || '';
    let requestorSection = currentUser?.section || '';
    let requestorNik = currentUser?.nik || localStorage.getItem('p2h_inspector_nik') || '';
    if (!currentUser) {
       const savedProfileStr = localStorage.getItem('p2h_inspector_profile');
       if (savedProfileStr) {
         try {
           const prof = JSON.parse(savedProfileStr);
           requestorRole = prof.jabatan || '';
           requestorSection = prof.section || '';
         } catch(e) {}
       }
    }
    const isSysAdmin = requestorNik === '02D25000055' || requestorNik === 'preplabadmin';
    const levelU = isSysAdmin ? 0 : getHierarchyLevel(requestorRole);
    return isSysAdmin || levelU === 1 || levelU === 2 || requestorSection === 'QA' || requestorSection === 'Administration';
  }, [currentUser]);

  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const savedProfileStr = localStorage.getItem('p2h_inspector_profile');
        let requestorRole = '';
        let requestorSection = '';
        let requestorNik = localStorage.getItem('p2h_inspector_nik') || '';
        
        if (savedProfileStr) {
          const prof = JSON.parse(savedProfileStr);
          requestorRole = prof.jabatan || '';
          requestorSection = prof.section || '';
        }

        const data = await getRosterData({ requestorNik, requestorRole, requestorSection });
        if (data && data.success && data.roster) {
          setRoster(data.roster);
          const me = data.roster.find((r: any) => r.nik === requestorNik);
          if (me) setCurrentUser(me);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoster();
  }, []);

  const calculateWorkingTenure = (joinDateStr: string | undefined | null) => {
    if (!joinDateStr) return '-';
    const joinDate = new Date(joinDateStr);
    if (isNaN(joinDate.getTime())) return '-';
    const today = new Date();
    let totalMonths = (today.getFullYear() - joinDate.getFullYear()) * 12 + (today.getMonth() - joinDate.getMonth());
    if (today.getDate() < joinDate.getDate()) {
      totalMonths--;
    }
    if (totalMonths < 0) return 'Baru bergabung';
    const y = Math.floor(totalMonths / 12);
    const m = totalMonths % 12;
    let res = [];
    if (y > 0) res.push(y + " thn");
    if (m > 0) res.push(m + " bln");
    if (res.length === 0) return 'Kurang dari 1 bln';
    return res.join(' ');
  };

  const calculateLeave = (emp: any) => {
    if (!emp) return null;
    
    const EXCLUDED_NAMES_FOR_LEAVE = [
      "Nyong Dokolamo", "Roy Marten Bobrikit", "La Sapiu", "Natanel Tooli", "Khaufi Wirawan Aligora", 
      "Deni Nugraha Perdiana", "Darno La Bungahari", "Rusli Rorano", "Arsun Lantia", "Mhd. Dahlan Ahmad", 
      "Karlos Yafet", "Murti Tamisari Harun", "Christian Anggawijaya", "Arthur Paul Marnix Souisa", 
      "Moch. Siswanto", "Zaenal Abidin", "Sirajuddin", "Madraji", "Janter Jaya Barimbing", 
      "Sumarlin Muhammad", "La Alwino La Ode Pudu", "La Topo", "Daud Kedafota", "Wahyu Jabir", 
      "Jarfin Saharudin", "Sukri Koco", "Yulianus Tiku Mangando", "La Ode Dendi", "Saman Dokulamo", 
      "Sukarman A. Akil, ST", "Muhammad Amran Selang", "Hariyatno La Jaya", "Harji La Ila", 
      "La Ode Hartanto", "Iran Rumbia", "La Rifan", "Suryadi La Samusu", "Fajrin Muin", 
      "Rifandi Samsudin", "Ahmad Sudirman", "Ramadan Muhamad", "Dulmihdat Tomayou", 
      "Ahmad Jusma Azhari Annur", "La Bayu", "Ardila Rusli", "Muslim Wabula", "Aldy Aldersun Puluh", 
      "Rizal Zaelani", "Herwin Predianto", "Muhammad Fandy Septiawan", "Imran S", "Muhamad Alvin Febriansyah"
    ];

    let joinDateStr = emp.joinDate; // already mapped in api to tanggalAwalBergabung
    if (EXCLUDED_NAMES_FOR_LEAVE.includes(emp.name) && emp.permanentDate && emp.permanentDate !== '-') {
      joinDateStr = emp.permanentDate;
    }

    const joinDate = parseStringDate(joinDateStr);
    const today = new Date();
    today.setHours(0,0,0,0);

    let ctKuota = 0;
    let ctUsed = 0;
    let ciKuota = 0;
    let ciUsed = 0;
    let izinUsed = 0;
    let isYear5 = false;
    let anniversaryDate = new Date();

    if (joinDate) {
      const currentYear = today.getFullYear();
      let diffYears = currentYear - joinDate.getFullYear();
      
      anniversaryDate = new Date(joinDate);
      anniversaryDate.setFullYear(currentYear);
      
      if (anniversaryDate > today) {
        anniversaryDate.setFullYear(currentYear - 1);
        diffYears--;
      }
      
      if (diffYears >= 1) {
         if (diffYears % 5 === 0 && diffYears > 0) {
            isYear5 = true;
            ciKuota = 30;
         } else {
            ctKuota = 12;
         }
      }
    }

    const sched = emp.fullSchedule || {};
    Object.keys(sched).forEach(dateStr => {
      const d = parseStringDate(dateStr);
      if (d && d >= anniversaryDate && d <= today) {
         const status = sched[dateStr];
         if (status) {
           if (status.startsWith('CT')) {
             ctUsed++;
           } else if (status.startsWith('CI')) {
             ciUsed++;
           } else if (status === 'I' || /^I\d+$/.test(status)) {
             izinUsed++;
           }
         }
      }
    });

    let weeksOn = 8;
    const g = (emp.gol || '').toUpperCase();
    const jg = (emp.jobGrade || '').toUpperCase();
    if (jg === 'S2') weeksOn = 10;
    else if (g === 'I' || g === '1') weeksOn = 10;
    else if (g === 'IV' || g === '4' || g.includes('IV')) weeksOn = 7;
    else if (g === 'V' || g === '5' || g.includes('V')) weeksOn = 6;
    const rosterDays = weeksOn * 7;

    const lastTrv = parseStringDate(emp.lastTrvDate);
    let estimatedNextLeave = null;
    if (lastTrv) {
      estimatedNextLeave = new Date(lastTrv);
      estimatedNextLeave.setDate(estimatedNextLeave.getDate() + 1 + rosterDays);
    }

    let futureTrv = null;
    const sortedDates = Object.keys(sched).sort((a,b) => parseStringDate(a)!.getTime() - parseStringDate(b)!.getTime());
    for (const dateStr of sortedDates) {
      const d = parseStringDate(dateStr);
      if (d && d > today && (['TRV', 'TV', 'C', 'CR', 'CE', 'CT', 'CI', 'XP', 'TT'].includes(sched[dateStr]) || (sched[dateStr] && (sched[dateStr].startsWith('CT') || sched[dateStr].startsWith('CE'))))) {
        futureTrv = d;
        break;
      }
    }

    let actualCuti = futureTrv || estimatedNextLeave;
    let difference = 0;
    if (futureTrv && estimatedNextLeave) {
      difference = Math.floor((futureTrv.getTime() - estimatedNextLeave.getTime()) / (1000 * 3600 * 24));
    }

    let daysRemaining = 0;
    if (actualCuti) {
      daysRemaining = Math.floor((actualCuti.getTime() - today.getTime()) / (1000 * 3600 * 24));
    }

    const totalKuota = isYear5 ? ciKuota : ctKuota;
    const totalUsed = ctUsed + ciUsed + izinUsed;
    const remaining = Math.max(0, totalKuota - totalUsed);

    return {
      ctKuota,
      ctUsed,
      ciKuota,
      ciUsed,
      izinUsed,
      isYear5,
      totalKuota,
      totalUsed,
      remaining,
      actualCuti,
      difference,
      daysRemaining,
      hasTrv: !!futureTrv,
      joinDate
    };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <PageHeader 
        title="Informasi Roster & Cuti"
        description="Kelola data roster dan jadwal cuti tim (Otomatis sinkron setiap jam 17:00 WIT)"
        icon={<Calendar />}
      >
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          <Button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 rounded-xl text-xs font-bold px-3.5 py-2 shadow-lg shadow-indigo-900/30 transition-all border border-indigo-400/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Menyinkronkan...' : 'Sinkron Google Sheets'}
          </Button>
        </div>
      </PageHeader>

      {syncFeedback && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2 transition-all ${
          syncFeedback.type === 'success'
            ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300'
            : 'bg-rose-950/80 border border-rose-700/60 text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span className="font-medium">{syncFeedback.message}</span>
          </div>
          <button 
            onClick={() => setSyncFeedback(null)} 
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
          <p className="text-slate-500 font-medium">Memuat data rooster...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Current User Leave Info */}
          {currentUser && (
            <section className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" /> Cuti Saya
              </h2>
              
              {(() => {
                const leaveInfo = calculateLeave(currentUser);
                if (!leaveInfo) {
                  return (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                        <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                      </div>
                      <p className="text-slate-600 font-medium">Memuat info cuti...</p>
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">
                         {leaveInfo.isYear5 ? 'Kuota Cuti Istimewa (CI)' : 'Kuota Cuti Tahunan (CT)'}
                      </p>
                      <div className="flex justify-between items-end">
                        <div>
                          <p className="text-2xl font-black text-slate-800">{leaveInfo.remaining} <span className="text-sm font-semibold text-slate-500">hari</span></p>
                          <p className="text-xs text-slate-500 mt-0.5">Dari total kuota {leaveInfo.totalKuota} hari</p>
                        </div>
                        <div className="text-right">
                           <p className="text-xs font-semibold text-rose-600">Terpakai: {leaveInfo.totalUsed} hari</p>
                           {leaveInfo.izinUsed > 0 && <p className="text-[10px] text-orange-500 mt-0.5">Termasuk {leaveInfo.izinUsed} hari Izin</p>}
                           {leaveInfo.joinDate && <p className="text-[10px] text-slate-400 mt-1">Sejak {safeFormatDate(leaveInfo.joinDate, {day: 'numeric', month: 'short', year: 'numeric'})}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-md text-white">
                      <p className="text-[10px] uppercase font-bold text-blue-200 mb-1">Jadwal Cuti Berikutnya</p>
                      {leaveInfo.actualCuti ? (
                         <div>
                            <p className="text-xl font-bold text-white mb-2">
                               {safeFormatDate(leaveInfo.actualCuti, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                               <span className="px-2 py-1 bg-white/20 text-white rounded text-xs font-bold shadow-sm backdrop-blur-sm">
                                  {leaveInfo.daysRemaining >= 0 ? `Sisa ${leaveInfo.daysRemaining} hari lagi` : `Telah lewat ${Math.abs(leaveInfo.daysRemaining)} hari`}
                               </span>
                               {leaveInfo.difference !== 0 && (
                                  <span className={`px-2 py-1 rounded text-xs font-bold shadow-sm ${leaveInfo.difference > 0 ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                     {leaveInfo.difference > 0 ? `Mundur ${leaveInfo.difference} hari` : `Maju ${Math.abs(leaveInfo.difference)} hari`}
                                  </span>
                               )}
                            </div>
                            {!leaveInfo.hasTrv && (
                               <p className="text-[10px] text-blue-200 mt-3 flex items-center gap-1">
                                  <Info className="w-3 h-3" /> Berdasarkan perhitungan rotasi jadwal
                               </p>
                            )}
                            {leaveInfo.hasTrv && (
                               <p className="text-[10px] text-blue-200 mt-3 flex items-center gap-1">
                                  <Info className="w-3 h-3" /> Telah dijadwalkan oleh admin (Fixed TRV/TV)
                               </p>
                            )}
                         </div>
                      ) : (
                         <p className="text-sm text-blue-100 mt-2">Belum ada estimasi jadwal cuti (Riwayat TRV/TV tidak ditemukan)</p>
                      )}
                    </div>
                  </div>
                );
              })()}
            </section>
          )}

          {/* Team Roster */}
          <section className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-500 shrink-0" />
                {hasSectionFilter ? (
                  <div className="relative">
                    <select 
                      value={sectionFilter} 
                      onChange={(e) => setSectionFilter(e.target.value)}
                      className="text-lg font-bold text-slate-800 bg-transparent border-none py-0 pl-0 pr-6 focus:outline-none focus:ring-0 cursor-pointer appearance-none hover:text-indigo-600 transition-colors"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23475569' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5 7l5 5 5-5'/%3e%3c/svg%3e")`,
                        backgroundPosition: 'right 0 center',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: '1.25rem',
                      }}
                    >
                      <option value="ALL">Tim Anda (Semua)</option>
                      <option value="Administration">Administration</option>
                      <option value="Dry, Preparation">Dry, Preparation</option>
                      <option value="Inventory Control">Inventory Control</option>
                      <option value="Laboratory">Laboratory</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Preparation">Preparation</option>
                      <option value="QA">QA</option>
                      <option value="Wet, Preparation">Wet, Preparation</option>
                    </select>
                  </div>
                ) : (
                  <h2 className="text-lg font-bold text-slate-800">
                    {filteredRoster.length > 1 ? "Tim Anda" : "Data Karyawan"}
                  </h2>
                )}
              </div>
              <div className="relative flex-1 md:max-w-xs">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Cari nama, NIK, atau jabatan..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Rentang Jadwal:</span>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-slate-400 text-sm">s/d</span>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  max={new Date(new Date(startDate).getTime() + 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="space-y-4">
              {filteredRoster.length === 0 && (
                <div className="text-center py-8 text-slate-500">Data karyawan tidak ditemukan.</div>
              )}
              {filteredRoster.map((emp, i) => (
                <div key={i} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg leading-tight">{emp.name}</h4>
                      <p className="text-xs text-slate-500 font-mono mt-1">NIK: {emp.nik}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{emp.jabatan}</span>
                        <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-1 rounded-lg">
                          {emp.jobGrade === 'S2' ? 'S2' : `GOL ${emp.gol || '-'}`}
                        </span>
                        <span className="text-[10px] font-semibold bg-amber-50 text-amber-600 px-2 py-1 rounded-lg">
                          ⏳ {calculateWorkingTenure(emp.joinDate)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {(() => {
                    const l = calculateLeave(emp);
                    if (l && l.actualCuti) {
                      return (
                        <div className="mb-4 bg-emerald-50 border border-emerald-100 rounded-2xl p-3 flex justify-between items-center relative z-10">
                          <div className="flex items-center gap-2">
                            <Plane className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-semibold text-emerald-800">Estimasi Cuti</span>
                          </div>
                          <span className="text-sm font-bold text-emerald-700">{safeFormatDate(l.actualCuti, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="relative z-10">
                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Jadwal</p>
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      {(() => {
                        const sDate = new Date(startDate);
                        const eDate = new Date(endDate);
                        if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) return null;
                        
                        const maxDays = 31;
                        const diffDays = Math.floor((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24));
                        const effectiveEndDate = diffDays > maxDays ? new Date(sDate.getTime() + maxDays * 24 * 60 * 60 * 1000) : eDate;
                        
                        const days = [];
                        const iter = new Date(sDate);
                        while (iter <= effectiveEndDate) {
                          const parts = iter.toDateString().split(' '); 
                          const day = parseInt(parts[2], 10);
                          const formattedDate = day + ' ' + parts[1] + ' ' + parts[3].substring(2);
                          
                          let shiftCode = '-';
                          if (emp.fullSchedule && emp.fullSchedule[formattedDate]) {
                            shiftCode = emp.fullSchedule[formattedDate];
                          } else if (emp.schedule) {
                            const found = emp.schedule.find(s => s.date === formattedDate);
                            if (found) shiftCode = found.shiftCode;
                          }
                          
                          days.push({
                            dayStr: parts[0].substring(0,3),
                            shiftCode,
                            dateStr: day + ' ' + parts[1]
                          });
                          
                          iter.setDate(iter.getDate() + 1);
                        }
                        
                        return days.map((s, idx) => {
                          const isLeave = s.shiftCode.toLowerCase().includes('cuti') || s.shiftCode.toLowerCase().includes('off');
                          return (
                            <div key={idx} className={`flex-none w-14 text-center py-2 rounded-xl border shrink-0 ${isLeave ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                              <div className="text-[10px] uppercase font-bold mb-1 opacity-60">{s.dayStr} <br/> <span className="text-[9px] font-normal">{s.dateStr}</span></div>
                              <div className="text-xs font-black">{s.shiftCode || '-'}</div>
                            </div>
                          )
                        });
                      })()}
                      {(!emp.fullSchedule && (!emp.schedule || emp.schedule.length === 0)) && (
                        <p className="text-xs text-slate-400">Jadwal tidak tersedia.</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
