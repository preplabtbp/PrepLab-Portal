import React, { useState, useEffect, useMemo } from 'react';
import { UserX, CheckCircle2, Calendar } from 'lucide-react';
import { getRosterData } from '../../sheets-api';
import { formatShiftName } from './daily-performance-v2-utils';
import { DailyPerformanceRecord, ShiftType } from './daily-performance-v2-types';
import { isStaffRole } from '../daily-performance/DailyPerformanceStructuredPresentation';
import { compareEmployeesByJabatan } from '../../lib/jabatanHierarchy';

export interface AbsentPersonnelItem {
  nik: string;
  name: string;
  jabatan: string;
  section: string;
  regu: string;
  shiftSchedule: string;
  category: 'alfa' | 'izin' | 'sakit' | 'cuti';
  roleCategory: 'staff' | 'crew';
  keterangan: string;
  badgeColor: string;
  tglMasukKembali?: string;
}

interface DailyPerformanceV2AbsenteeListProps {
  selectedDate: string;
  shiftType: ShiftType;
  userPt?: string;
  dayRecord?: DailyPerformanceRecord;
  nightRecord?: DailyPerformanceRecord;
  rosterList?: any[];
}

// Helper parsing tanggal roster
function parseRosterDateKey(keyStr: string): Date | null {
  if (!keyStr) return null;
  const s = keyStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/').map(Number);
    return new Date(y, m - 1, d);
  }
  const parts = s.split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    let year = parseInt(parts[2], 10);
    if (year < 100) year += 2000;
    const mStr = parts[1].toLowerCase().slice(0, 3);
    const monthsMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
      jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11
    };
    const m = monthsMap[mStr];
    if (!isNaN(day) && m !== undefined && !isNaN(year)) {
      return new Date(year, m, day);
    }
  }
  return null;
}

function formatDateDDMMYYYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function getReturnToWorkDate(emp: any, selectedDateStr: string): string | null {
  let curDate: Date | null = null;
  if (selectedDateStr.includes('/')) {
    const [d, m, y] = selectedDateStr.split('/').map(Number);
    curDate = new Date(y, m - 1, d);
  } else if (selectedDateStr.includes('-')) {
    const [y, m, d] = selectedDateStr.split('-').map(Number);
    curDate = new Date(y, m - 1, d);
  }
  const curTime = curDate ? curDate.getTime() : 0;

  if (emp.fullSchedule && typeof emp.fullSchedule === 'object') {
    const entries: { date: Date; code: string }[] = [];
    for (const [k, v] of Object.entries(emp.fullSchedule)) {
      const parsed = parseRosterDateKey(k);
      if (parsed) {
        entries.push({ date: parsed, code: String(v || '').trim().toUpperCase() });
      }
    }
    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    const x1Entry = entries.find(e => e.date.getTime() >= curTime && (e.code === 'X1' || e.code === '1X'));
    if (x1Entry) return formatDateDDMMYYYY(x1Entry.date);

    const workEntry = entries.find(e => e.date.getTime() > curTime && (e.code === 'D' || e.code === 'N'));
    if (workEntry) return formatDateDDMMYYYY(workEntry.date);
  }

  if (Array.isArray(emp.schedule)) {
    const entries: { date: Date; code: string }[] = [];
    for (const item of emp.schedule) {
      const parsed = parseRosterDateKey(item.date || item.dateStr || item.keyDateStr);
      if (parsed) {
        entries.push({ date: parsed, code: String(item.shift || item.code || '').trim().toUpperCase() });
      }
    }
    entries.sort((a, b) => a.date.getTime() - b.date.getTime());

    const x1Entry = entries.find(e => e.date.getTime() >= curTime && (e.code === 'X1' || e.code === '1X'));
    if (x1Entry) return formatDateDDMMYYYY(x1Entry.date);

    const workEntry = entries.find(e => e.date.getTime() > curTime && (e.code === 'D' || e.code === 'N'));
    if (workEntry) return formatDateDDMMYYYY(workEntry.date);
  }

  return null;
}

export const DailyPerformanceV2AbsenteeList: React.FC<DailyPerformanceV2AbsenteeListProps> = ({
  selectedDate,
  shiftType,
  userPt = 'TBP',
  dayRecord,
  nightRecord,
  rosterList: propRosterList
}) => {
  const [internalRoster, setInternalRoster] = useState<any[]>([]);

  useEffect(() => {
    if (propRosterList && propRosterList.length > 0) return;
    let isMounted = true;
    getRosterData()
      .then((res: any) => {
        if (!isMounted) return;
        const list = Array.isArray(res) ? res : (res?.roster || []);
        setInternalRoster(list);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [propRosterList]);

  const activeRoster = propRosterList && propRosterList.length > 0 ? propRosterList : internalRoster;

  // Date keys untuk pencocokan roster
  const dateKeys = useMemo(() => {
    let day = 1;
    let monthIdx = 9;
    let year = 2026;

    if (selectedDate.includes('/')) {
      const parts = selectedDate.split('/');
      day = parseInt(parts[0], 10) || 1;
      monthIdx = (parseInt(parts[1], 10) || 10) - 1;
      year = parseInt(parts[2], 10) || 2026;
    } else if (selectedDate.includes('-')) {
      const parts = selectedDate.split('-');
      year = parseInt(parts[0], 10) || 2026;
      monthIdx = (parseInt(parts[1], 10) || 10) - 1;
      day = parseInt(parts[2], 10) || 1;
    }

    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthsId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const mEn = monthsEn[monthIdx] || 'Oct';
    const mId = monthsId[monthIdx] || 'Okt';
    const y2 = String(year).slice(-2);

    return [
      `${day} ${mEn} ${y2}`,
      `${String(day).padStart(2, '0')} ${mEn} ${y2}`,
      `${day} ${mId} ${y2}`,
      `${String(day).padStart(2, '0')} ${mId} ${y2}`,
      `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      `${String(day).padStart(2, '0')}/${String(monthIdx + 1).padStart(2, '0')}/${year}`
    ];
  }, [selectedDate]);

  // Parsing personil tidak hadir untuk shift ini
  const { alfaList, izinList, sakitList, cutiList, totalCount } = useMemo(() => {
    const isGtsUniverse = (userPt || '').toUpperCase().trim() === 'GTS';

    if (!activeRoster || activeRoster.length === 0) {
      return { alfaList: [], izinList: [], sakitList: [], cutiList: [], totalCount: 0 };
    }

    const labEmps = activeRoster.filter((emp: any) => {
      const empPt = String(emp.pt || '').toUpperCase().trim();
      const nikUpper = String(emp.nik || '').toUpperCase().trim();
      const isEmpGts = empPt === 'GTS' || nikUpper.startsWith('03D') || nikUpper.startsWith('M03');

      if (isGtsUniverse) {
        if (!isEmpGts) return false;
      } else {
        if (isEmpGts) return false;
      }

      const sec = String(emp.section || '').trim().toLowerCase();
      return (
        (sec === 'laboratory' || sec === 'laboratorium' || sec.includes('laboratory') || sec.includes('laboratorium')) &&
        !sec.includes('qa') &&
        !sec.includes('quality') &&
        !sec.includes('admin') &&
        !sec.includes('administrasi') &&
        !sec.includes('maintenance') &&
        !sec.includes('prep') &&
        !sec.includes('dry') &&
        !sec.includes('wet')
      );
    });

    const alfa: AbsentPersonnelItem[] = [];
    const izin: AbsentPersonnelItem[] = [];
    const sakit: AbsentPersonnelItem[] = [];
    const cuti: AbsentPersonnelItem[] = [];

    const isTargetPagi = shiftType === 'DAY' || shiftType === 'LS';
    const isLongShift = shiftType === 'LS';

    labEmps.forEach((emp: any) => {
      let shiftCode = '';

      if (emp.fullSchedule && typeof emp.fullSchedule === 'object') {
        for (const k of dateKeys) {
          if (emp.fullSchedule[k]) {
            shiftCode = String(emp.fullSchedule[k]).trim();
            break;
          }
        }
      }

      if (!shiftCode && Array.isArray(emp.schedule)) {
        for (const k of dateKeys) {
          const item = emp.schedule.find((s: any) => s.date === k || s.dateStr === k || s.keyDateStr === k);
          if (item && item.shift) {
            shiftCode = String(item.shift).trim();
            break;
          }
        }
      }

      const upper = (shiftCode || '').toUpperCase().trim();
      const empShift = (emp.shift || '').toString().trim().toUpperCase();
      const jab = (emp.jabatan || emp.position || '').toLowerCase();
      const isNonShift = empShift.includes('NON') || jab.includes('superintendent') || jab.includes('supervisor') || jab.includes('officer') || jab.includes('chemist');

      // Tentukan apakah personil termasuk kategori kendala tidak hadir
      const isCuti = upper.startsWith('C') || upper === 'CT' || upper === 'CR' || upper === 'CE' || upper === 'CI' || upper === 'CS' || upper.includes('CUTI');
      const isSakit = !isCuti && (['SL', 'SS', 'S1', 'S2', 'S'].includes(upper) || upper.startsWith('SAKIT'));
      const isIzin = !isCuti && !isSakit && (['I', 'IK', 'IA', 'DL', 'UL'].includes(upper) || upper.startsWith('IZIN') || upper === 'IJIN');
      const isAlfa = !isCuti && !isSakit && !isIzin && (upper === 'A' || upper === 'ALPA' || upper === 'ALPHA');

      if (!isCuti && !isSakit && !isIzin && !isAlfa) {
        return; // Hadir atau Off biasa, bukan personil kendala
      }

      // Tentukan apakah ditugaskan ke Shift Pagi atau Shift Malam
      let assignedToPagi = true;
      if (isLongShift) {
        assignedToPagi = true;
      } else if (isNonShift) {
        assignedToPagi = true;
      } else {
        const personReguLetter = (emp.regu || empShift || '').toUpperCase().replace(/[^A-D]/g, '');
        const dayReguLetter = (dayRecord?.regu || '').toUpperCase().replace(/[^A-D]/g, '');
        const nightReguLetter = (nightRecord?.regu || '').toUpperCase().replace(/[^A-D]/g, '');

        if (personReguLetter && dayReguLetter && personReguLetter === dayReguLetter) {
          assignedToPagi = true;
        } else if (personReguLetter && nightReguLetter && personReguLetter === nightReguLetter) {
          assignedToPagi = false;
        } else if (upper === 'D') {
          assignedToPagi = true;
        } else if (upper === 'N') {
          assignedToPagi = false;
        } else {
          assignedToPagi = true;
        }
      }

      // Filter sesuai shift yang sedang dirender
      if (isTargetPagi && !assignedToPagi) return;
      if (!isTargetPagi && assignedToPagi) return;

      const regu = isNonShift ? 'Non-Shift' : emp.regu ? formatShiftName(emp.regu) : (empShift === 'A' ? 'Shift A' : empShift === 'B' ? 'Shift B' : 'Shift');
      const roleCategory: 'staff' | 'crew' = isStaffRole({
        jabatan: emp.jabatan || emp.position,
        gol: emp.gol || emp.golongan,
        roleCategory: emp.roleCategory
      }) ? 'staff' : 'crew';

      let keterangan = 'Tidak Hadir';
      let badgeColor = 'bg-slate-100 text-slate-800 border-slate-300';
      let categoryType: 'alfa' | 'izin' | 'sakit' | 'cuti' = 'alfa';

      if (isAlfa) {
        categoryType = 'alfa';
        keterangan = 'Alfa';
        badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
      } else if (isIzin) {
        categoryType = 'izin';
        keterangan = upper === 'DL' ? 'Dinas Luar' : 'Izin';
        badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
      } else if (isSakit) {
        categoryType = 'sakit';
        keterangan = 'Sakit';
        badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
      } else if (isCuti) {
        categoryType = 'cuti';
        keterangan = 'Cuti';
        badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
      }

      const tglMasukKembali = isCuti ? (getReturnToWorkDate(emp, selectedDate) || undefined) : undefined;

      const item: AbsentPersonnelItem = {
        nik: emp.nik || '-',
        name: emp.name || emp.nama || 'Tanpa Nama',
        jabatan: emp.jabatan || emp.position || 'Teknisi Lab',
        section: 'Laboratory',
        regu,
        shiftSchedule: upper,
        category: categoryType,
        roleCategory,
        keterangan,
        badgeColor,
        tglMasukKembali
      };

      if (isAlfa) alfa.push(item);
      else if (isIzin) izin.push(item);
      else if (isSakit) sakit.push(item);
      else if (isCuti) cuti.push(item);
    });

    alfa.sort(compareEmployeesByJabatan);
    izin.sort(compareEmployeesByJabatan);
    sakit.sort(compareEmployeesByJabatan);
    cuti.sort(compareEmployeesByJabatan);

    return {
      alfaList: alfa,
      izinList: izin,
      sakitList: sakit,
      cutiList: cuti,
      totalCount: alfa.length + izin.length + sakit.length + cuti.length
    };
  }, [activeRoster, dateKeys, selectedDate, shiftType, dayRecord, nightRecord, userPt]);

  // Kelompok kategori berurutan baku: 1. Alfa, 2. Izin, 3. Sakit, 4. Cuti
  const categories = useMemo(() => [
    {
      key: 'alfa',
      title: 'Alfa (Mangkir)',
      items: alfaList,
      colorClasses: {
        headerBadge: 'bg-rose-600 text-white',
        countBadge: 'bg-rose-100 text-rose-800 border-rose-200',
        cardBorder: 'border-rose-200'
      }
    },
    {
      key: 'izin',
      title: 'Izin',
      items: izinList,
      colorClasses: {
        headerBadge: 'bg-blue-600 text-white',
        countBadge: 'bg-blue-100 text-blue-800 border-blue-200',
        cardBorder: 'border-blue-200'
      }
    },
    {
      key: 'sakit',
      title: 'Sakit',
      items: sakitList,
      colorClasses: {
        headerBadge: 'bg-rose-500 text-white',
        countBadge: 'bg-rose-100 text-rose-800 border-rose-200',
        cardBorder: 'border-rose-200'
      }
    },
    {
      key: 'cuti',
      title: 'Cuti',
      items: cutiList,
      colorClasses: {
        headerBadge: 'bg-amber-600 text-white',
        countBadge: 'bg-amber-100 text-amber-800 border-amber-200',
        cardBorder: 'border-amber-200'
      }
    }
  ], [alfaList, izinList, sakitList, cutiList]);

  // Saring hanya header kategori yang ada isinya (Count > 0)
  const activeCategories = useMemo(() => {
    return categories.filter(cat => cat.items.length > 0);
  }, [categories]);

  return (
    <div className="pt-3 border-t border-slate-200 space-y-3">
      {/* Title Bar Rekap Tidak Hadir */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-800">
        <div className="flex items-center gap-1.5">
          <UserX className="w-3.5 h-3.5 text-slate-600" />
          <span>Daftar Personil Tidak Hadir ({totalCount} Orang):</span>
        </div>
        {totalCount === 0 ? (
          <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200">
            Hadir Lengkap
          </span>
        ) : (
          <span className="text-[11px] text-rose-700 font-bold bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200 font-mono">
            {totalCount} Tidak Hadir
          </span>
        )}
      </div>

      {/* Kondisi Nihil: Semua personil hadir lengkap */}
      {totalCount === 0 ? (
        <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            Seluruh staff dan crew {shiftType === 'LS' ? 'Long Shift' : shiftType === 'DAY' ? 'shift pagi' : 'shift malam'} hadir bertugas lengkap (Nihil alpa, izin, sakit, atau cuti).
          </span>
        </div>
      ) : (
        /* Render per Kategori Berurutan dengan Header Ber-Angka Dinamis (1, 2, 3...) */
        <div className="space-y-3">
          {activeCategories.map((cat, catIdx) => (
            <div key={cat.key} className="space-y-1.5">
              {/* Header Ber-Angka untuk Kategori */}
              <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-lg flex items-center justify-center font-bold font-mono text-[11px] shadow-2xs ${cat.colorClasses.headerBadge}`}>
                    {catIdx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {cat.title}
                  </span>
                </div>
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${cat.colorClasses.countBadge}`}>
                  {cat.items.length} Personil
                </span>
              </div>

              {/* List Kartu Personil di Bawah Header Kategori */}
              <div className="grid grid-cols-1 gap-1.5">
                {cat.items.map(p => (
                  <div
                    key={p.nik}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs space-y-1 hover:border-slate-300 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 truncate">
                        {p.name}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${p.badgeColor} flex-shrink-0`}>
                        {p.keterangan}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span className="truncate">
                        {p.jabatan} • <strong className="uppercase text-slate-700">{p.roleCategory}</strong>
                      </span>
                      <span className="font-mono text-slate-700 font-semibold flex-shrink-0">
                        {formatShiftName(p.regu)}
                      </span>
                    </div>

                    {p.tglMasukKembali && (
                      <div className="pt-1 border-t border-slate-100 text-[10px] text-amber-800 font-medium flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-amber-600" />
                        <span className="text-slate-500">Masuk kembali:</span>
                        <strong className="font-mono font-bold text-amber-900">{p.tglMasukKembali}</strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
