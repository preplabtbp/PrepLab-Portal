/**
 * tenureUtils.ts
 * Utility untuk memproses, menghitung, dan memformat Masa Kerja
 * (Total, Jabatan Sekarang/Terakhir, dan Jabatan Sebelumnya).
 */

export function parseIndoDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s || s === '-' || s === '#N/A' || s.toLowerCase() === 'null') return null;

  // Format ISO / YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  // Indonesian & English month map
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5,
    jul: 6, agu: 7, ags: 7, aug: 7, sep: 8, okt: 9, oct: 9,
    nov: 10, des: 11, dec: 11
  };

  // Format DD-MMM-YYYY or DD-MMM-YY (e.g. 01-Sep-2016, 23-Mar-24, 26-Agu-2016)
  const parts = s.split(/[-/\s]/);
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10);
    const mStr = parts[1].toLowerCase().slice(0, 3);
    let year = parseInt(parts[2], 10);
    if (!isNaN(year) && year < 100) {
      year = year <= 40 ? 2000 + year : 1900 + year;
    }
    const month = monthMap[mStr];
    if (!isNaN(day) && month !== undefined && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }

  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function calculateDateDiffString(startDate: Date, endDate: Date): string {
  if (endDate < startDate) return '0 Bulan';

  let years = endDate.getFullYear() - startDate.getFullYear();
  let months = endDate.getMonth() - startDate.getMonth();
  const days = endDate.getDate() - startDate.getDate();

  if (days < 0) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} Tahun`);
  if (months > 0 || years === 0) parts.push(`${Math.max(0, months)} Bulan`);

  return parts.join(' ') || '0 Bulan';
}

export interface EmployeeTenureInfo {
  sekarang: {
    value: string;
    keterangan: string;
  };
  sebelumnya: {
    value: string;
    keterangan: string;
    hasPreviousRole: boolean;
  };
  total: {
    value: string;
    keterangan: string;
  };
}

export function getEmployeeTenureInfo(emp: any): EmployeeTenureInfo {
  if (!emp) {
    return {
      sekarang: { value: '-', keterangan: '-' },
      sebelumnya: { value: '-', keterangan: '-', hasPreviousRole: false },
      total: { value: '-', keterangan: '-' }
    };
  }

  const now = new Date();
  const dohDate = parseIndoDate(emp.tanggalAwalBergabung || emp.dohAwal);
  const tglJabatanBaruDate = parseIndoDate(emp.tanggalJabatanBaru);

  const hasJabatanBaru = !!tglJabatanBaruDate && (!dohDate || tglJabatanBaruDate.getTime() > dohDate.getTime());

  // 1. Total Masa Kerja
  let totalVal = emp.masaKerja && emp.masaKerja !== '-' ? emp.masaKerja : '';
  if (!totalVal && dohDate) {
    totalVal = calculateDateDiffString(dohDate, now);
  }
  if (!totalVal) totalVal = '-';

  // 2. Masa Kerja Jabatan Sekarang (Terakhir)
  let sekarangVal = emp.masaKerjaJabatanTerakhir && emp.masaKerjaJabatanTerakhir !== '-' 
    ? emp.masaKerjaJabatanTerakhir 
    : '';

  if (!sekarangVal) {
    if (tglJabatanBaruDate) {
      sekarangVal = calculateDateDiffString(tglJabatanBaruDate, now);
    } else if (dohDate) {
      // Jika belum ada tanggal jabatan baru, masa kerja jabatan sekarang sama dengan total masa kerja sejak DOH
      sekarangVal = totalVal;
    }
  }
  if (!sekarangVal) sekarangVal = '-';

  const tglBaruStr = emp.tanggalJabatanBaru && emp.tanggalJabatanBaru !== '-' ? emp.tanggalJabatanBaru : null;
  const dohStr = emp.tanggalAwalBergabung && emp.tanggalAwalBergabung !== '-' ? emp.tanggalAwalBergabung : null;

  const sekarangKet = tglBaruStr 
    ? `Jabatan saat ini • Sejak ${tglBaruStr}`
    : (dohStr ? `Jabatan saat ini • Sejak DOH Awal (${dohStr})` : 'Jabatan saat ini');

  // 3. Masa Kerja Jabatan Sebelumnya
  let sebelumnyaVal = emp.masaKerjaJabatanSebelumnya && emp.masaKerjaJabatanSebelumnya !== '-'
    ? emp.masaKerjaJabatanSebelumnya
    : '';

  let sebelumnyaKet = '';
  let hasPreviousRole = false;

  if (hasJabatanBaru && dohDate && tglJabatanBaruDate) {
    hasPreviousRole = true;
    if (!sebelumnyaVal) {
      sebelumnyaVal = calculateDateDiffString(dohDate, tglJabatanBaruDate);
    }
    sebelumnyaKet = `Jabatan sebelumnya • Periode ${dohStr} s/d ${tglBaruStr}`;
  } else if (sebelumnyaVal && sebelumnyaVal !== '-') {
    hasPreviousRole = true;
    sebelumnyaKet = 'Riwayat masa kerja jabatan sebelumnya';
  } else {
    hasPreviousRole = false;
    sebelumnyaVal = '-';
    sebelumnyaKet = 'Belum ada riwayat mutasi / promosi jabatan sebelumnya';
  }

  return {
    sekarang: {
      value: sekarangVal,
      keterangan: sekarangKet
    },
    sebelumnya: {
      value: sebelumnyaVal,
      keterangan: sebelumnyaKet,
      hasPreviousRole
    },
    total: {
      value: totalVal,
      keterangan: dohStr ? `DOH Awal: ${dohStr}` : 'Masa kerja total'
    }
  };
}
