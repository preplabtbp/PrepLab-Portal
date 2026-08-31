import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Activity, Users, Building2, Droplets, Wind, ShieldAlert, BadgeInfo, ChevronDown, ChevronUp, Calendar, PlusCircle, X, Search, Plane, Clock, AlertTriangle, CircleUser, UserX } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { getRosterData, addIzin } from '../sheets-api';
import { Button, Card, Input, Select, Textarea } from './ui';
import { toast } from 'sonner';

export function AdmDashboard() {
  const currentUserStr = localStorage.getItem('p2h_inspector_profile');
  const currentUserProfile = currentUserStr ? JSON.parse(currentUserStr) : null;
  const isAdministration = currentUserProfile?.section?.toLowerCase() === 'administration';
  
  const [loading, setLoading] = useState(true);
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  
  const PIE_COLORS = { Hadir: '#2A9D8F', Cuti: '#E9930D', Izin: '#DCE8F8', Sakit: '#C6D6EB', Alpa: '#F8FAFC', Libur: '#A8A29E' };

  const getChartData = (dt: any) => {
    return [
      { name: 'Hadir', value: dt.hadir },
      { name: 'Cuti', value: dt.cuti },
      { name: 'Sakit', value: dt.sakit },
      { name: 'Izin', value: dt.izin },
      { name: 'Alpa', value: dt.alfa },
      { name: 'Libur', value: dt.libur }
    ].filter(i => i.value > 0);
  };

  
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius * 1.15;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return (
      <text x={x} y={y} fill="#333333" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} className="font-semibold">
        {name} (%), {value > 0 ? (percent * 100).toFixed(2) : 0}
      </text>
    );
  };
  
  const getPercentage = (count: number, total: number) => {
    return total > 0 ? ((count / total) * 100).toFixed(2) + '%' : '0.00%';
  };

  const [activeTab, setActiveTab] = useState<'masuk' | 'cuti' | 'izin' | 'alfa' | 'libur' | 'lainnya'>('masuk');
  const [rawRoster, setRawRoster] = useState<any[]>([]);
  
  const [staffData, setStaffData] = useState<any>({ hadir: 0, cuti: 0, izin: 0, alfa: 0, sakit: 0, libur: 0, total: 0 });
  const [nonStaffData, setNonStaffData] = useState<any>({ hadir: 0, cuti: 0, izin: 0, alfa: 0, sakit: 0, libur: 0, total: 0 });
  const [data, setData] = useState<any>({
    totals: { masuk: 0, cuti: 0, izin: 0, alfa: 0, libur: 0, lainnya: 0 },
    byShift: {}
  });
  const [expandedPositions, setExpandedPositions] = useState<Set<string>>(new Set());
  
  
  // Modal Izin
  const [showIzinModal, setShowIzinModal] = useState(false);
  const [izinData, setIzinData] = useState({ nik: '', date: new Date().toISOString().split('T')[0], type: 'I', keterangan: '' });
  const [isSubmittingIzin, setIsSubmittingIzin] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [showEmpDropdown, setShowEmpDropdown] = useState(false);

  const filteredEmps = rawRoster.filter(r => 
    r.name.toLowerCase().includes(empSearch.toLowerCase()) || 
    r.nik.toLowerCase().includes(empSearch.toLowerCase())
  ).slice(0, 5);


  const toggleExpand = (id: string) => {
    setExpandedPositions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (rawRoster.length > 0) {
      processData(rawRoster, targetDate, activeTab);
    }
  }, [targetDate, activeTab, rawRoster]);

  const fetchData = async () => {
    setLoading(true);
    const { success, roster } = await getRosterData({});
    if (success && Array.isArray(roster)) {
      setRawRoster(roster);
      processData(roster, targetDate, activeTab);
    } else {
      setRawRoster([]);
      processData([], targetDate, activeTab);
    }
    setLoading(false);
  };

  const processData = (roster: any[], tDateStr: string, tab: string) => {
    const d = new Date(tDateStr);
    const parts = d.toDateString().split(' ');
    const day = parseInt(parts[2], 10);
    const formattedDate = day + ' ' + parts[1] + ' ' + parts[3].substring(2);

    let totals = { masuk: 0, cuti: 0, izin: 0, alfa: 0, libur: 0, lainnya: 0 };
    let stData = { hadir: 0, cuti: 0, izin: 0, alfa: 0, sakit: 0, libur: 0, total: 0, details: { sakit: [], izin: [], alfa: [], libur: [] } };
    let nstData = { hadir: 0, cuti: 0, izin: 0, alfa: 0, sakit: 0, libur: 0, total: 0, details: { sakit: [], izin: [], alfa: [], libur: [] } };
    
    let filteredEmployees: any[] = [];

    const currentUserStr = localStorage.getItem('p2h_inspector_profile');
    const currentUserProfile = currentUserStr ? JSON.parse(currentUserStr) : null;
    const requestorNik = localStorage.getItem('p2h_inspector_nik');
    
    let activeRoster = roster;
    const me = roster.find((r: any) => r.nik === requestorNik);
    const requestorPt = me?.pt || currentUserProfile?.pt;

    if (requestorPt === 'GTS') {
      activeRoster = roster.filter((emp: any) => emp.pt === 'GTS');
    } else if (requestorPt === 'TBP' || requestorPt === 'GPS') {
      activeRoster = roster.filter((emp: any) => emp.pt !== 'GTS');
    }

    activeRoster.forEach((emp: any) => {
      const rawShiftCode = emp.fullSchedule?.[formattedDate];
      const hasRosterEntry = rawShiftCode !== undefined && rawShiftCode !== null && typeof rawShiftCode === 'string' && rawShiftCode.trim() !== '' && rawShiftCode.trim() !== '-';

      // Jika cell roster kosong pada hari ini -> personil sudah tidak ada lagi (keluar/resign), dipisahkan ke Lain-lain dan TIDAK dimasukkan ke perhitungan rekap pie chart
      if (!hasRosterEntry) {
        totals.lainnya++;
        if (tab === 'lainnya') {
          filteredEmployees.push({ 
            ...emp, 
            currentShift: 'Roster Kosong (Personil sudah keluar)', 
            formattedDate, 
            isMasuk: false, 
            isCuti: false, 
            isKosong: true 
          });
        }
        return; // Excluded from stData and nstData totals
      }

      const shiftCode = rawShiftCode.trim();
      const upperShift = shiftCode.toUpperCase();
      
      const isCuti = ['TRV', 'TV', 'C', 'CR', 'CE', 'CT', 'CI', 'XP', 'TT'].includes(upperShift) || upperShift.startsWith('CT') || upperShift.startsWith('CE');
      const isIzin = ['I', 'IK', 'SL', 'SS'].includes(upperShift);
      const isAlfa = upperShift === 'A';
      
      const isAbsentOrOff = ['DO', 'OFF', 'NA'].includes(upperShift) || upperShift.includes('OFF');
      const isMasuk = !isCuti && !isIzin && !isAlfa && !isAbsentOrOff;

      if (isMasuk) totals.masuk++;
      if (isCuti) totals.cuti++;
      if (isIzin) totals.izin++;
      if (isAlfa) totals.alfa++;
      if (isAbsentOrOff) totals.libur++;

      // Staff determination
      const pos = emp.jabatan || emp.position || 'Crew';
      const isStaff = pos.toLowerCase().includes('manager') || pos.toLowerCase().includes('superintendent') || pos.toLowerCase().includes('supervisor') || pos.toLowerCase().includes('foreman') || pos.toLowerCase().includes('officer') || pos.toLowerCase().includes('engineer');
      const targetData = isStaff ? stData : nstData;
      
      targetData.total++;
      
      if (isMasuk) targetData.hadir++;
      if (isCuti) targetData.cuti++;
      if (isAbsentOrOff) {
         targetData.libur++;
         targetData.details.libur.push(emp);
      }
      if (isIzin && upperShift.includes('S')) {
         targetData.sakit++;
         targetData.details.sakit.push(emp);
      } else if (isIzin) {
         targetData.izin++;
         targetData.details.izin.push(emp);
      }
      if (isAlfa) {
         targetData.alfa++;
         targetData.details.alfa.push(emp);
      }

      // Dynamic calculation of Outsite, Onsite, and Masuk Kerja
      let empOutsiteDate = emp.outsiteDate;
      let empOnsiteDate = emp.onsiteDate;
      let empMasukKerjaDate = emp.masukKerjaDate;

      if (emp.fullSchedule) {
        const sched = emp.fullSchedule;
        const golUpper = (emp.gol || '').toString().trim().toUpperCase();
        const jobGradeUpper = (emp.jobGrade || '').toString().trim().toUpperCase();
        const posLower = (emp.jabatan || emp.position || '').toString().trim().toLowerCase();
        
        const isGol1 = golUpper === 'I' || golUpper === '1' || golUpper === 'I.1' || golUpper === '1.1' || golUpper === 'S1.1' || golUpper === 'S1.2' ||
          jobGradeUpper.startsWith('S1') || jobGradeUpper.startsWith('1.') || jobGradeUpper === '1' || jobGradeUpper === 'I' ||
          ((posLower.includes('crew') || posLower.includes('helper') || posLower.includes('operator') || posLower.includes('sampler') || posLower.includes('driver')) &&
           !posLower.includes('foreman') && !posLower.includes('supervisor') && !posLower.includes('admin') && !posLower.includes('superintendent') && !posLower.includes('manager') && !posLower.includes('lead') && !posLower.includes('officer') && !posLower.includes('analyst') && !posLower.includes('planner') && !posLower.includes('specialist'));

        const datesAsc = Object.keys(sched).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        const isLeaveCode = (s?: string) => {
          if (!s) return false;
          const u = s.toUpperCase().trim();
          return ['TRV', 'TV', 'C', 'CR', 'CE', 'CT', 'CI', 'XP', 'TT'].includes(u) || u.startsWith('CT') || u.startsWith('CE');
        };

        const targetIndex = datesAsc.indexOf(formattedDate);
        let activeLeaveIdx = -1;

        if (targetIndex !== -1 && isLeaveCode(sched[datesAsc[targetIndex]])) {
          activeLeaveIdx = targetIndex;
          while (activeLeaveIdx > 0 && isLeaveCode(sched[datesAsc[activeLeaveIdx - 1]])) {
            activeLeaveIdx--;
          }
        } else if (targetIndex !== -1) {
          for (let i = targetIndex; i < datesAsc.length; i++) {
            if (isLeaveCode(sched[datesAsc[i]])) {
              activeLeaveIdx = i;
              break;
            }
          }
        }

        if (activeLeaveIdx !== -1) {
          const currentLeaveBlock: string[] = [];
          let i = activeLeaveIdx;
          while (i < datesAsc.length && isLeaveCode(sched[datesAsc[i]])) {
            currentLeaveBlock.push(datesAsc[i]);
            i++;
          }

          if (currentLeaveBlock.length > 0) {
            if (!isGol1) {
              // ── GOLONGAN II KE ATAS ──
              // Outsite: first TRV or first leave day
              const firstTrv = currentLeaveBlock.find(d => {
                const code = (sched[d] || '').toUpperCase().trim();
                return code === 'TRV' || code === 'TV';
              });
              empOutsiteDate = firstTrv || currentLeaveBlock[0];

              // Onsite: TRV terakhir di dalam blok cuti
              const allTrvs = currentLeaveBlock.filter(d => {
                const code = (sched[d] || '').toUpperCase().trim();
                return code === 'TRV' || code === 'TV';
              });

              if (allTrvs.length > 1) {
                empOnsiteDate = allTrvs[allTrvs.length - 1];
              } else if (allTrvs.length === 1) {
                const trvIdx = currentLeaveBlock.indexOf(allTrvs[0]);
                if (trvIdx > 0 || currentLeaveBlock.length === 1) {
                  empOnsiteDate = allTrvs[0];
                } else {
                  empOnsiteDate = currentLeaveBlock[currentLeaveBlock.length - 1];
                }
              } else {
                empOnsiteDate = currentLeaveBlock[currentLeaveBlock.length - 1];
              }
            } else {
              // ── GOLONGAN I ──
              // Outsite: first C
              const firstC = currentLeaveBlock.find(d => {
                const code = (sched[d] || '').toUpperCase().trim();
                return code === 'C' || code.startsWith('C');
              });
              empOutsiteDate = firstC || currentLeaveBlock[0];

              // Onsite: C terakhir di dalam blok cuti
              const allC = currentLeaveBlock.filter(d => {
                const code = (sched[d] || '').toUpperCase().trim();
                return code === 'C' || code.startsWith('C');
              });
              empOnsiteDate = allC.length > 0 ? allC[allC.length - 1] : currentLeaveBlock[currentLeaveBlock.length - 1];
            }

            // Masuk Kerja: 1 hari setelah Onsite
            if (empOnsiteDate) {
              const onsiteGlobalIdx = datesAsc.indexOf(empOnsiteDate);
              if (onsiteGlobalIdx !== -1 && onsiteGlobalIdx + 1 < datesAsc.length) {
                empMasukKerjaDate = datesAsc[onsiteGlobalIdx + 1];
              } else {
                const dDate = new Date(empOnsiteDate);
                dDate.setDate(dDate.getDate() + 1);
                const dParts = dDate.toDateString().split(' ');
                const dDay = parseInt(dParts[2], 10);
                empMasukKerjaDate = `${dDay} ${dParts[1]} ${dParts[3].substring(2)}`;
              }
            }
          }
        }
      }

      const empEntry = { 
        ...emp, 
        currentShift: shiftCode, 
        formattedDate, 
        isMasuk, 
        isCuti, 
        isKosong: false,
        outsiteDate: empOutsiteDate,
        onsiteDate: empOnsiteDate,
        masukKerjaDate: empMasukKerjaDate
      };

      if (tab === 'masuk' && isMasuk) filteredEmployees.push(empEntry);
      if (tab === 'cuti' && isCuti) filteredEmployees.push(empEntry);
      if (tab === 'izin' && isIzin) filteredEmployees.push(empEntry);
      if (tab === 'alfa' && isAlfa) filteredEmployees.push(empEntry);
      if (tab === 'libur' && isAbsentOrOff) filteredEmployees.push(empEntry);
    });

    let byShift: any = {
      'Shift Siang': { total: 0, sections: {} },
      'Shift Malam': { total: 0, sections: {} },
      'Long Shift': { total: 0, sections: {} },
      'Lainnya (Non-Shift)': { total: 0, sections: {} },
      'Lain-lain (Roster Kosong / Keluar)': { total: 0, sections: {} }
    };

    filteredEmployees.forEach(emp => {
      let shiftCat = 'Lainnya (Non-Shift)';
      if (emp.isKosong) {
        shiftCat = 'Lain-lain (Roster Kosong / Keluar)';
      } else if (emp.currentShift?.toUpperCase() === 'D' || emp.currentShift?.toUpperCase() === 'S') {
        shiftCat = 'Shift Siang';
      } else if (emp.currentShift?.toUpperCase() === 'N') {
        shiftCat = 'Shift Malam';
      } else if (emp.currentShift?.toUpperCase() === 'LS') {
        shiftCat = 'Long Shift';
      }
      
      const pos = emp.jabatan || emp.position || 'Crew';
      let section = emp.department || emp.section || 'Lainnya';
      let subSection = 'General';
      
      if (section.toLowerCase().includes('preparation')) {
        section = 'Preparation';
        if (emp.department?.toLowerCase().includes('wet') || pos.toLowerCase().includes('wet')) {
          subSection = 'Wet';
        } else if (emp.department?.toLowerCase().includes('dry') || pos.toLowerCase().includes('dry')) {
          subSection = 'Dry';
        } else {
          subSection = 'General';
        }
      }

      const targetShift = byShift[shiftCat];
      targetShift.total++;
      
      if (!targetShift.sections[section]) {
        targetShift.sections[section] = { total: 0, positions: {}, subSections: {} };
      }
      targetShift.sections[section].total++;
      
      if (section === 'Preparation') {
        if (!targetShift.sections[section].subSections[subSection]) {
          targetShift.sections[section].subSections[subSection] = { total: 0, positions: {} };
        }
        targetShift.sections[section].subSections[subSection].total++;
        if (!targetShift.sections[section].subSections[subSection].positions[pos]) {
          targetShift.sections[section].subSections[subSection].positions[pos] = [];
        }
        targetShift.sections[section].subSections[subSection].positions[pos].push(emp);
      } else {
        if (!targetShift.sections[section].positions[pos]) {
          targetShift.sections[section].positions[pos] = [];
        }
        targetShift.sections[section].positions[pos].push(emp);
      }
    });

    // Helper to parse Outsite Date string (e.g. "15 Aug 26", "27 Aug 26") into numeric timestamp for sorting
    const parseOutsiteTimestamp = (dateStr?: string | null): number => {
      if (!dateStr || typeof dateStr !== 'string') return 9999999999999;
      const clean = dateStr.trim();
      if (!clean || clean === '-') return 9999999999999;

      const monthMap: Record<string, string> = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'mei': '05', 'may': '05',
        'jun': '06', 'jul': '07', 'agu': '08', 'ags': '08', 'aug': '08', 'sep': '09',
        'okt': '10', 'oct': '10', 'nov': '11', 'des': '12', 'dec': '12'
      };

      const parts = clean.split(/[\s-]+/);
      if (parts.length >= 3) {
        const day = parseInt(parts[0], 10);
        const monthKey = parts[1].substring(0, 3).toLowerCase();
        const month = monthMap[monthKey] || '01';
        let year = parseInt(parts[2], 10);
        if (year < 100) year += 2000;

        if (!isNaN(day) && !isNaN(year)) {
          return new Date(year, parseInt(month, 10) - 1, day).getTime();
        }
      }

      const parsed = Date.parse(clean);
      if (!isNaN(parsed)) return parsed;

      return 9999999999999;
    };

    const sortByOutsite = (a: any, b: any) => {
      const timeA = parseOutsiteTimestamp(a.outsiteDate || a.nextTrvDate);
      const timeB = parseOutsiteTimestamp(b.outsiteDate || b.nextTrvDate);
      if (timeA !== timeB) {
        return timeA - timeB; // Earliest Outsite first
      }
      return (a.name || '').localeCompare(b.name || '');
    };

    // Sort every position list strictly by Outsite date
    Object.values(byShift).forEach((shift: any) => {
      Object.values(shift.sections || {}).forEach((sec: any) => {
        if (sec.subSections) {
          Object.values(sec.subSections || {}).forEach((sub: any) => {
            if (sub.positions) {
              Object.keys(sub.positions).forEach((posKey) => {
                sub.positions[posKey].sort(sortByOutsite);
              });
            }
          });
        }
        if (sec.positions) {
          Object.keys(sec.positions).forEach((posKey) => {
            sec.positions[posKey].sort(sortByOutsite);
          });
        }
      });
    });

    setStaffData(stData);
    setNonStaffData(nstData);
    setData({ totals, byShift });
  };

  const handleAddIzin = async () => {
    if (!izinData.nik) {
      toast.error("Pilih karyawan");
      return;
    }
    setIsSubmittingIzin(true);
    const res = await addIzin(izinData);
    setIsSubmittingIzin(false);
    if (res.success) {
      toast.success("Berhasil menambahkan izin");
      setShowIzinModal(false);
      fetchData(); // reload
    } else {
      toast.error("Gagal menambahkan izin");
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 animate-in fade-in duration-500 pb-20 w-full">
      
      <div className="flex flex-col gap-6 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
        {/* Teal Header Line */}
        <div className="absolute top-0 left-0 w-full h-2 bg-[#2A9D8F]"></div>
        
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pt-2 relative">
          <div className="flex flex-col">
            <div className="bg-[#F7D279] text-white font-bold px-3 py-1 rounded-sm inline-block w-max text-xs tracking-wide mb-2 uppercase shadow-sm">
              Manpower
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-[#333333] leading-tight">Laboratory Administration</h2>
            <p className="text-base md:text-lg text-[#4A4A4A] mt-1 font-medium">Manpower Attendance</p>
          </div>
          <div className="text-left md:text-right shrink-0">
             <p className="font-bold text-[#2A9D8F] uppercase text-sm bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 inline-block">
               {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} 
               <span className="text-[#2A9D8F] opacity-70 ml-1.5">*week {Math.ceil(new Date().getDate() / 7)}</span>
             </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-slate-400" />
            </div>
            <input 
              type="date" 
              value={targetDate} 
              onChange={e => setTargetDate(e.target.value)} 
              className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all outline-none"
            />
          </div>
          {isAdministration && (
          <button 
            onClick={() => {
              setIzinData({ nik: '', date: targetDate, type: 'I', keterangan: '' });
              setEmpSearch('');
              setShowIzinModal(true);
            }} 
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm hover:shadow"
          >
            <PlusCircle className="w-5 h-5" /> Input Izin / Alfa
          </button>
          )}
        </div>
      </div>


      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
<div className="space-y-6">
{/* MANPOWER INFOGRAPHIC */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-8 relative overflow-hidden">
         {/* Center Dashed Divider (Desktop only) */}
         <div className="hidden md:block absolute top-0 bottom-0 left-1/2 border-l-2 border-dashed border-[#2A9D8F]/30"></div>
         <div className="hidden md:block absolute left-0 right-0 top-[60%] border-t-2 border-dashed border-[#2A9D8F]/30"></div>
         
         {/* STAFF */}
         <div className="flex flex-col relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <CircleUser className="w-16 h-16 text-[#2A9D8F]" />
              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getChartData(staffData)}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={renderCustomLabel}
                      labelLine={true}
                    >
                      {getChartData(staffData).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, "Orang"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="flex justify-between items-center border-b-[3px] border-dotted border-[#2A9D8F] pb-1 mb-3">
              <h3 className="font-bold text-lg text-[#333333]">Attendance Staff</h3>
              <div className="bg-[#2A9D8F] text-white px-3 py-1 font-bold text-lg">{getPercentage(staffData.hadir, staffData.total)}</div>
            </div>
            
            <div className="text-sm font-semibold space-y-1">
              <div className="flex"><span className="w-24 text-[#4A4A4A]">Sakit ({getPercentage(staffData.sakit, staffData.total)})</span> <span className="text-[#333333]">: {staffData.details?.sakit?.map(s=>s.name).join(', ') || '-'}</span></div>
              <div className="flex"><span className="w-24 text-[#4A4A4A]">Izin ({getPercentage(staffData.izin, staffData.total)})</span> <span className="text-[#333333]">: {staffData.details?.izin?.map(s=>s.name).join(', ') || '-'}</span></div>
              <div className="flex"><span className="w-24 text-[#4A4A4A]">Alpa ({getPercentage(staffData.alfa, staffData.total)})</span> <span className="text-[#333333]">: {staffData.details?.alfa?.map(s=>s.name).join(', ') || '-'}</span></div>
            </div>
         </div>

         {/* NON STAFF */}
         <div className="flex flex-col relative z-10">
            <div className="flex items-center gap-4 mb-4 justify-end flex-row-reverse">
              <div className="flex items-end gap-1">
                <CircleUser className="w-16 h-16 text-[#2A9D8F]" />
                <CircleUser className="w-10 h-10 text-[#2A9D8F]" />
              </div>
              <div className="h-64 w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getChartData(nonStaffData)}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={renderCustomLabel}
                      labelLine={true}
                    >
                      {getChartData(nonStaffData).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, "Orang"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="flex justify-between items-center border-b-[3px] border-dotted border-[#2A9D8F] pb-1 mb-3">
              <h3 className="font-bold text-lg text-[#333333]">Attendance Non-Staff</h3>
              <div className="bg-[#E9930D] text-white px-3 py-1 font-bold text-lg">{getPercentage(nonStaffData.hadir, nonStaffData.total)}</div>
            </div>
            
            <div className="text-sm font-semibold space-y-1">
              <div className="flex"><span className="w-24 text-[#4A4A4A]">Sakit ({getPercentage(nonStaffData.sakit, nonStaffData.total)})</span> <span className="text-[#2A9D8F] flex-1 break-words">: {nonStaffData.details?.sakit?.map(s=>s.name).join(', ') || '-'}</span></div>
              <div className="flex"><span className="w-24 text-[#4A4A4A]">Izin ({getPercentage(nonStaffData.izin, nonStaffData.total)})</span> <span className="text-[#E9930D] flex-1 break-words">: {nonStaffData.details?.izin?.map(s=>s.name).join(', ') || '-'}</span></div>
              <div className="flex"><span className="w-24 text-[#4A4A4A]">Alpa ({getPercentage(nonStaffData.alfa, nonStaffData.total)})</span> <span className="text-[#E9930D] flex-1 break-words">: {nonStaffData.details?.alfa?.map(s=>s.name).join(', ') || '-'}</span></div>
            </div>
            <div className="mt-2 text-right text-xs font-bold text-[#333333]">Note: <span className="text-[#2A9D8F]">Shift A</span>, <span className="text-[#E9930D]">Shift B</span>, Non Shift</div>
         </div>
      </div>
      <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <button 
              onClick={() => setActiveTab('masuk')}
              className={`text-left p-4 rounded-2xl border transition-all ${activeTab === 'masuk' ? 'bg-[#2A9D8F] border-[#2A9D8F] text-white shadow-md scale-105' : 'bg-white border-slate-200 text-slate-700 hover:border-[#2A9D8F]'}`}
            >
              <Users className={`w-6 h-6 mb-2 ${activeTab === 'masuk' ? 'text-[#DCE8F8]' : 'text-[#2A9D8F]'}`} />
              <p className={`text-sm font-medium ${activeTab === 'masuk' ? 'text-white' : 'text-slate-500'}`}>Masuk</p>
              <h3 className="text-3xl font-black">{data.totals.masuk}</h3>
            </button>
            <button 
              onClick={() => setActiveTab('cuti')}
              className={`text-left p-4 rounded-2xl border transition-all ${activeTab === 'cuti' ? 'bg-[#E9930D] border-[#E9930D] text-white shadow-md scale-105' : 'bg-white border-slate-200 text-slate-700 hover:border-[#E9930D]'}`}
            >
              <Plane className={`w-6 h-6 mb-2 ${activeTab === 'cuti' ? 'text-[#fff9ed]' : 'text-[#E9930D]'}`} />
              <p className={`text-sm font-medium ${activeTab === 'cuti' ? 'text-[#fff9ed]' : 'text-slate-500'}`}>Cuti</p>
              <h3 className="text-3xl font-black">{data.totals.cuti}</h3>
            </button>
            <button 
              onClick={() => setActiveTab('izin')}
              className={`text-left p-4 rounded-2xl border transition-all ${activeTab === 'izin' ? 'bg-[#DCE8F8] border-[#DCE8F8] text-white shadow-md scale-105' : 'bg-white border-slate-200 text-slate-700 hover:border-[#DCE8F8]'}`}
            >
              <Clock className={`w-6 h-6 mb-2 ${activeTab === 'izin' ? 'text-[#333333]' : 'text-[#DCE8F8]'}`} />
              <p className={`text-sm font-medium ${activeTab === 'izin' ? 'text-[#333333]' : 'text-slate-500'}`}>Izin</p>
              <h3 className="text-3xl font-black">{data.totals.izin}</h3>
            </button>
            <button 
              onClick={() => setActiveTab('alfa')}
              className={`text-left p-4 rounded-2xl border transition-all ${activeTab === 'alfa' ? 'bg-[#C6D6EB] border-[#C6D6EB] text-white shadow-md scale-105' : 'bg-white border-slate-200 text-slate-700 hover:border-[#C6D6EB]'}`}
            >
              <AlertTriangle className={`w-6 h-6 mb-2 ${activeTab === 'alfa' ? 'text-[#333333]' : 'text-[#C6D6EB]'}`} />
              <p className={`text-sm font-medium ${activeTab === 'alfa' ? 'text-[#333333]' : 'text-slate-500'}`}>Alfa</p>
              <h3 className="text-3xl font-black">{data.totals.alfa}</h3>
            </button>
            <button 
              onClick={() => setActiveTab('libur')}
              className={`text-left p-4 rounded-2xl border transition-all ${activeTab === 'libur' ? 'bg-[#A8A29E] border-[#A8A29E] text-white shadow-md scale-105' : 'bg-white border-slate-200 text-slate-700 hover:border-[#A8A29E]'}`}
            >
              <CircleUser className={`w-6 h-6 mb-2 ${activeTab === 'libur' ? 'text-[#333333]' : 'text-[#A8A29E]'}`} />
              <p className={`text-sm font-medium ${activeTab === 'libur' ? 'text-[#333333]' : 'text-slate-500'}`}>Libur</p>
              <h3 className="text-3xl font-black">{data.totals.libur}</h3>
            </button>
            <button 
              onClick={() => setActiveTab('lainnya')}
              className={`text-left p-4 rounded-2xl border transition-all ${activeTab === 'lainnya' ? 'bg-rose-600 border-rose-600 text-white shadow-md scale-105' : 'bg-white border-slate-200 text-slate-700 hover:border-rose-300'}`}
            >
              <UserX className={`w-6 h-6 mb-2 ${activeTab === 'lainnya' ? 'text-white' : 'text-rose-500'}`} />
              <p className={`text-sm font-medium ${activeTab === 'lainnya' ? 'text-rose-100' : 'text-slate-500'}`}>Lain-lain</p>
              <h3 className="text-3xl font-black">{data.totals.lainnya}</h3>
              <p className={`text-[10px] mt-0.5 leading-tight font-medium ${activeTab === 'lainnya' ? 'text-rose-200' : 'text-slate-400'}`}>Roster kosong</p>
            </button>
          </div>

          <div className="space-y-8 mt-6">
            {data.byShift && Object.keys(data.byShift).map(shiftName => {
              const shiftData = data.byShift[shiftName];
              if (shiftData.total === 0) return null;
              
              return (
                <div key={shiftName} className="space-y-4">
                  <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-2">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Users className={`w-6 h-6 ${
                        shiftName === 'Shift Siang' ? 'text-[#E9930D]' : 
                        shiftName === 'Shift Malam' ? 'text-[#2A9D8F]' : 
                        shiftName.includes('Roster Kosong') ? 'text-rose-500' : 'text-slate-500'
                      }`} /> 
                      {shiftName}
                    </h3>
                    <span className="bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-full text-sm border border-slate-200">
                      {shiftData.total} orang
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.keys(shiftData.sections).map((sectionName) => {
                      const sec = shiftData.sections[sectionName];
                      return (
                        <div key={sectionName} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                            <h4 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                              <Building2 className="w-5 h-5 text-[#2A9D8F]" />
                              {sectionName}
                            </h4>
                            <span className="bg-[#eff8f7] text-[#2A9D8F] font-bold px-3 py-1 rounded-full text-sm">
                              {sec.total} orang
                            </span>
                          </div>
                          {sectionName === 'Preparation' ? (
                            <div className="space-y-4">
                              {Object.keys(sec.subSections).map(sub => {
                                const subData = sec.subSections[sub];
                                return (
                                  <div key={sub} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                    <h5 className="font-semibold text-slate-700 flex items-center gap-2 mb-3">
                                      {sub === 'Wet' ? <Droplets className="w-4 h-4 text-[#DCE8F8]" /> : sub === 'Dry' ? <Wind className="w-4 h-4 text-[#E9930D]" /> : <BadgeInfo className="w-4 h-4 text-slate-500" />}
                                      Preparation - {sub}
                                      <span className="ml-auto text-sm bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-bold">{subData.total}</span>
                                    </h5>
                                    <div className="space-y-2">
                                      {Object.entries(subData.positions).map(([pos, emps]: any) => {
                                        const posId = `${shiftName}-${sectionName}-${sub}-${pos}`;
                                        const isExpanded = expandedPositions.has(posId);
                                        return (
                                        <div key={pos} className="flex flex-col bg-white border border-slate-100 rounded-lg overflow-hidden shadow-sm">
                                          <button onClick={() => toggleExpand(posId)} className="flex justify-between items-center text-sm p-2.5 hover:bg-slate-50 transition-colors w-full text-left">
                                            <span className="text-slate-600 font-medium flex items-center gap-1">
                                              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                              {pos}
                                            </span>
                                            <span className="font-bold text-[#2A9D8F] bg-[#eff8f7] px-2 py-0.5 rounded border border-indigo-100">{emps.length}</span>
                                          </button>
                                          {isExpanded && (
                                            <div className="bg-slate-50 border-t border-slate-100 p-2 space-y-1">
                                              {emps.map((emp: any, idx: number) => (
                                                <div key={idx} className="text-xs text-slate-600 flex flex-col pl-6 pr-2 py-1.5 bg-white rounded border border-slate-100">
                                                  <div className="flex justify-between items-center">
                                                    <span className="font-medium text-slate-700">{emp.name}</span>
                                                    <span className="text-slate-400 font-mono">{emp.nik}</span>
                                                  </div>
                                                  
                                                  <div className="flex gap-2 mt-2 flex-wrap items-center">
                                                    {emp.isKosong ? (
                                                      <span className="bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                                        Roster kosong (Personil sudah keluar)
                                                      </span>
                                                    ) : (
                                                      <>
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-bold border border-slate-200">Status: {emp.currentShift}</span>
                                                        {emp.isMasuk && (emp.outsiteDate || emp.nextTrvDate) && <span className="bg-amber-100 px-2 py-0.5 rounded text-[10px] text-amber-800 font-bold border border-amber-200">Next Outsite: {emp.outsiteDate || emp.nextTrvDate}</span>}
                                                        {emp.isCuti && emp.outsiteDate && <span className="bg-purple-100 px-2 py-0.5 rounded text-[10px] text-purple-800 font-bold border border-purple-200">Outsite: {emp.outsiteDate}</span>}
                                                        {emp.isCuti && emp.onsiteDate && <span className="bg-indigo-100 px-2 py-0.5 rounded text-[10px] text-indigo-800 font-bold border border-indigo-200">Onsite: {emp.onsiteDate}</span>}
                                                        {emp.isCuti && emp.masukKerjaDate && <span className="bg-emerald-100 px-2 py-0.5 rounded text-[10px] text-emerald-800 font-bold border border-emerald-200">Masuk Kerja: {emp.masukKerjaDate}</span>}
                                                      </>
                                                    )}
                                                  </div>
                                                  {emp.fullKeterangan && emp.fullKeterangan[emp.formattedDate] && (
                                                    <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-200 italic">
                                                      "{emp.fullKeterangan[emp.formattedDate]}"
                                                    </div>
                                                  )}

                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )})}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="space-y-2 mt-2">
                              {Object.entries(sec.positions).map(([pos, emps]: any) => {
                                const posId = `${shiftName}-${sectionName}-${pos}`;
                                const isExpanded = expandedPositions.has(posId);
                                return (
                                <div key={pos} className="flex flex-col bg-slate-50 border border-slate-100 rounded-lg overflow-hidden">
                                  <button onClick={() => toggleExpand(posId)} className="flex justify-between items-center text-sm p-2.5 hover:bg-slate-100 transition-colors w-full text-left">
                                    <span className="text-slate-600 font-medium flex items-center gap-1">
                                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                      {pos}
                                    </span>
                                    <span className="font-bold text-[#2A9D8F] bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200">{emps.length}</span>
                                  </button>
                                  {isExpanded && (
                                    <div className="bg-white border-t border-slate-100 p-2 space-y-1">
                                      {emps.map((emp: any, idx: number) => (
                                        <div key={idx} className="text-xs text-slate-600 flex flex-col pl-6 pr-2 py-1.5 bg-slate-50 rounded border border-slate-100">
                                          <div className="flex justify-between items-center">
                                            <span className="font-medium text-slate-700">{emp.name}</span>
                                            <span className="text-slate-400 font-mono">{emp.nik}</span>
                                          </div>
                                          
                                          <div className="flex gap-2 mt-2 flex-wrap items-center">
                                            {emp.isKosong ? (
                                              <span className="bg-rose-50 border border-rose-200 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                                Roster kosong (Personil sudah keluar)
                                              </span>
                                            ) : (
                                              <>
                                                <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px] text-slate-700 font-bold">Status: {emp.currentShift}</span>
                                                {emp.isMasuk && (emp.outsiteDate || emp.nextTrvDate) && <span className="bg-amber-100 px-2 py-0.5 rounded text-[10px] text-amber-800 font-bold border border-amber-200">Next Outsite: {emp.outsiteDate || emp.nextTrvDate}</span>}
                                                {emp.isCuti && emp.outsiteDate && <span className="bg-purple-100 px-2 py-0.5 rounded text-[10px] text-purple-800 font-bold border border-purple-200">Outsite: {emp.outsiteDate}</span>}
                                                {emp.isCuti && emp.onsiteDate && <span className="bg-indigo-100 px-2 py-0.5 rounded text-[10px] text-indigo-800 font-bold border border-indigo-200">Onsite: {emp.onsiteDate}</span>}
                                                {emp.isCuti && emp.masukKerjaDate && <span className="bg-emerald-100 px-2 py-0.5 rounded text-[10px] text-emerald-800 font-bold border border-emerald-200">Masuk Kerja: {emp.masukKerjaDate}</span>}
                                              </>
                                            )}
                                          </div>
                                          {emp.fullKeterangan && emp.fullKeterangan[emp.formattedDate] && (
                                            <div className="mt-2 text-[11px] text-slate-600 bg-white p-1.5 rounded border border-slate-200 italic">
                                              "{emp.fullKeterangan[emp.formattedDate]}"
                                            </div>
                                          )}

                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )})}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
</div>
      )}

      {/* Modal Izin */}
      <AnimatePresence>
        {showIzinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setShowIzinModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-lg">Input Izin / Alfa</h3>
                <button onClick={() => setShowIzinModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                
                <div className="relative">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Pilih Karyawan</label>
                  <Input 
                    type="text" 
                    placeholder="Cari Nama atau NIK..."
                    value={empSearch}
                    onChange={e => {
                      setEmpSearch(e.target.value);
                      setShowEmpDropdown(true);
                      setIzinData({...izinData, nik: ''});
                    }}
                    onFocus={() => setShowEmpDropdown(true)}
                    className="w-full"
                  />
                  {showEmpDropdown && empSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredEmps.length > 0 ? (
                        filteredEmps.map(r => (
                          <div 
                            key={r.nik} 
                            className="px-4 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0"
                            onClick={() => {
                              setIzinData({...izinData, nik: r.nik});
                              setEmpSearch(r.name + ' - ' + r.nik);
                              setShowEmpDropdown(false);
                            }}
                          >
                            <div className="font-semibold text-slate-700">{r.name}</div>
                            <div className="text-xs text-slate-500 font-mono">{r.nik}</div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-slate-500">Tidak ditemukan</div>
                      )}
                    </div>
                  )}
                  {izinData.nik && (
                    <div className="mt-2 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Karyawan terpilih
                    </div>
                  )}
                </div>


                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Tanggal</label>
                  <Input 
                    type="date" 
                    value={izinData.date}
                    onChange={e => setIzinData({...izinData, date: e.target.value})}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Jenis Izin</label>
                  <Select 
                    value={izinData.type}
                    onChange={e => setIzinData({...izinData, type: e.target.value})}
                    className="w-full"
                  >
                    <option value="I">Izin (I)</option>
                    <option value="IK">Izin Khusus (IK)</option>
                    <option value="A">Alfa (A)</option>
                    <option value="SL">Sakit Luar Site (SL)</option>
                    <option value="SS">Sakit Dalam Site (SS)</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Keterangan (Opsional)</label>
                  <Textarea 
                    placeholder="Alasan izin / alfa..."
                    value={izinData.keterangan || ''}
                    onChange={e => setIzinData({...izinData, keterangan: e.target.value})}
                    className="w-full resize-none h-20"
                  />
                </div>

              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <Button onClick={handleAddIzin} className="w-full" disabled={isSubmittingIzin}>
                  {isSubmittingIzin ? 'Menyimpan...' : 'Simpan Status'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
