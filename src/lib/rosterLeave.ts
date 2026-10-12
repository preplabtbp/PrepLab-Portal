/**
 * Perhitungan cuti berbasis roster — dipakai bersama oleh modul Roster & Cuti
 * dan Database Karyawan agar Jatuh Tempo Cuti selalu konsisten.
 */

export function parseRosterDateString(str: string | null | undefined): Date | null {
  if (!str || str === '-') return null;
  const parts = str.replace(/-/g, ' ').split(' ');
  if (parts.length >= 3) {
    const mmap: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    let year = parseInt(parts[2]);
    if (year < 100) year += 2000;
    return new Date(year, mmap[parts[1]] || 0, parseInt(parts[0]));
  }
  return new Date(str);
}

export interface RosterLeaveInfo {
  isYear5: boolean;
  totalKuota: number;
  totalUsed: number;
  izinUsed: number;
  remaining: number;
  /** Estimasi tanggal cuti berikutnya (jatuh tempo cuti) */
  actualCuti: Date | null;
  difference: number;
  daysRemaining: number;
  hasTrv: boolean;
  joinDate: Date | null;
}

export function calculateRosterLeave(emp: any): RosterLeaveInfo | null {
  if (!emp) return null;
  let joinDate: Date | null = null;
  const rawJoin = emp.tgl_masuk_format || emp.tanggalAwalBergabung || emp.joinDate || emp.tgl_masuk;
  if (rawJoin && rawJoin !== '-') {
    try {
      joinDate = new Date(rawJoin);
      if (isNaN(joinDate.getTime())) joinDate = parseRosterDateString(rawJoin);
    } catch (e) {
      joinDate = parseRosterDateString(rawJoin);
    }
  }

  let isYear5 = false;
  if (joinDate && !isNaN(joinDate.getTime())) {
    const diffMs = new Date().getTime() - joinDate.getTime();
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    if (diffYears >= 5) isYear5 = true;
  }

  const sched = emp.fullSchedule || {};
  let ctUsed = 0;
  let ciUsed = 0;
  let izinUsed = 0;

  let futureTrv: string | null = null;
  let pastTrv: string | null = null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedDatesAsc = Object.keys(sched).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  sortedDatesAsc.forEach(dateStr => {
    const code = (sched[dateStr] || '').toUpperCase();
    const d = new Date(dateStr);

    if (code === 'CT' || code.startsWith('CT')) ctUsed++;
    else if (code === 'CI' || code.startsWith('CI')) ciUsed++;
    else if (code === 'I' || code.startsWith('IZIN') || code === 'CR' || code === 'XP') izinUsed++;

    if (['TRV', 'TV', 'C', 'CR', 'CE', 'CT', 'CI', 'XP', 'TT'].includes(code) || code.startsWith('CT') || code.startsWith('CE')) {
      if (d >= today && !futureTrv) futureTrv = dateStr;
      if (d <= today) pastTrv = dateStr;
    }
  });

  if (emp.total_cuti_tahunan && !isNaN(parseFloat(emp.total_cuti_tahunan))) ctUsed = parseFloat(emp.total_cuti_tahunan);
  if (emp.total_izin && !isNaN(parseFloat(emp.total_izin))) izinUsed = parseFloat(emp.total_izin);

  let actualCuti: Date | null = null;
  let planDate: Date | null = null;

  if (emp.nextTrvDate) actualCuti = new Date(emp.nextTrvDate);
  else if (futureTrv) actualCuti = new Date(futureTrv);

  if (emp.cuti_plan_format && emp.cuti_plan_format !== '-') planDate = new Date(emp.cuti_plan_format);

  if (!actualCuti && !planDate && (emp.lastTrvDate || pastTrv)) {
    const lTrv = new Date(emp.lastTrvDate || pastTrv!);
    if (!isNaN(lTrv.getTime())) {
      let tourCycle = 56;
      const rotStr = String(emp.rotation || emp.rotasi || '').trim();
      const match = rotStr.match(/^(\d+)\s*:\s*(\d+)$/);
      if (match) {
        const workWeeks = parseInt(match[1], 10);
        tourCycle = (workWeeks === 8 || (workWeeks === 7 && parseInt(match[2], 10) === 1)) ? 56 : workWeeks * 7;
      } else {
        const golUpper = String(emp.gol || emp.golongan || emp.jobGrade || '').trim().toUpperCase();
        const jabLower = String(emp.jabatan || emp.position || emp.role || '').trim().toLowerCase();
        if (
          golUpper === 'I' || golUpper === '1' || golUpper === 'I.1' || golUpper === '1.1' ||
          ((jabLower.includes('crew') || jabLower.includes('helper') || jabLower.includes('operator')) &&
           !jabLower.includes('foreman') && !jabLower.includes('supervisor') && !jabLower.includes('officer') && !jabLower.includes('admin'))
        ) {
          tourCycle = 70;
        } else if (
          golUpper === 'III' || golUpper === '3' || golUpper === 'IV' || golUpper === '4' || golUpper === 'V' || golUpper === '5' ||
          jabLower.includes('superintendent') || jabLower.includes('manager')
        ) {
          tourCycle = 42;
        } else {
          tourCycle = 56;
        }
      }
      actualCuti = new Date(lTrv.getTime() + (tourCycle * 24 * 60 * 60 * 1000));
    }
  }

  let daysRemaining = 0;
  let difference = 0;

  if (actualCuti && !isNaN(actualCuti.getTime())) {
    const target = new Date(actualCuti);
    target.setHours(0, 0, 0, 0);
    daysRemaining = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  if (planDate && actualCuti && !isNaN(planDate.getTime()) && !isNaN(actualCuti.getTime())) {
    difference = Math.round((actualCuti.getTime() - planDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const totalKuota = isYear5 ? 24 : 12;
  const totalUsed = isYear5 ? ciUsed : ctUsed;
  const remaining = Math.max(0, totalKuota - totalUsed);

  return {
    isYear5,
    totalKuota,
    totalUsed,
    izinUsed,
    remaining,
    actualCuti,
    difference,
    daysRemaining,
    hasTrv: !!futureTrv || !!emp.nextTrvDate,
    joinDate
  };
}
