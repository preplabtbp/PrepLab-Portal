/**
 * Urutan Hirarki Jabatan Resmi (Berdasarkan Struktur Organisasi Preparation & Laboratory)
 * Sesuai bagan urutan jabatan:
 * 1. Preparation & Laboratory Manager
 * 2. Preparation Superintendent
 * 3. Laboratory Superintendent
 * 4. Preparation Supervisor, Wet
 * 5. Preparation Supervisor, Dry
 * 6. Laboratory Supervisor
 * 7. Quality Assurance Specialist
 * 8. Inventory Control Supervisor
 * 9. Laboratory Maintenance Supervisor
 * 10. Preparation Foreman, Wet
 * 11. Preparation Foreman, Dry
 * 12. Laboratory Foreman
 * 13. Quality Assurance Officer
 * 14. Laboratory Maintenance Foreman
 * 15. Admin, Inventory Control
 * 16. Admin, Preparation & Laboratory
 * 17. Crew, Laboratory Maintenance
 * 18. Crew, Preparation & Laboratory
 */

export const OFFICIAL_JABATAN_ORDER = [
  'Preparation & Laboratory Manager',
  'Preparation Superintendent',
  'Laboratory Superintendent',
  'Preparation Supervisor, Wet',
  'Preparation Supervisor, Dry',
  'Laboratory Supervisor',
  'Quality Assurance Specialist',
  'Inventory Control Supervisor',
  'Laboratory Maintenance Supervisor',
  'Preparation Foreman, Wet',
  'Preparation Foreman, Dry',
  'Laboratory Foreman',
  'Quality Assurance Officer',
  'Laboratory Maintenance Foreman',
  'Admin, Inventory Control',
  'Admin, Preparation & Laboratory',
  'Crew, Laboratory Maintenance',
  'Crew, Preparation & Laboratory',
] as const;

/**
 * Menghitung bobot / ranking urutan jabatan
 * 0 = Tertinggi (Preparation & Laboratory Manager)
 * 17 = Terendah (Crew, Preparation & Laboratory)
 * 999 = Jabatan lainnya / tidak terdefinisi
 */
export function getJabatanRank(rawJabatan?: string | null): number {
  if (!rawJabatan) return 999;

  // Normalisasi string
  const j = String(rawJabatan)
    .toLowerCase()
    .replace(/laboratorium/g, 'laboratory')
    .replace(/[^\w\s&]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!j || j === '-') return 999;

  // 1. Preparation & Laboratory Manager
  if (j.includes('manager')) return 0;

  // 2. Preparation Superintendent
  if (j.includes('preparation') && j.includes('superintendent')) return 1;

  // 3. Laboratory Superintendent
  if (j.includes('laboratory') && j.includes('superintendent')) return 2;
  if (j.includes('superintendent')) return 2;

  // 4. Preparation Supervisor, Wet
  if ((j.includes('preparation') || j.includes('wet')) && j.includes('supervisor') && j.includes('wet')) return 3;

  // 5. Preparation Supervisor, Dry
  if ((j.includes('preparation') || j.includes('dry')) && j.includes('supervisor') && j.includes('dry')) return 4;

  // 6. Laboratory Supervisor (bukan maintenance)
  if (j.includes('laboratory') && j.includes('supervisor') && !j.includes('maintenance')) return 5;

  // 7. Quality Assurance Specialist / Quality Assurance Supervisor
  if ((j.includes('quality assurance') || j.includes('qa')) && (j.includes('specialist') || j.includes('supervisor'))) return 6;

  // 8. Inventory Control Supervisor
  if (j.includes('inventory') && j.includes('supervisor')) return 7;

  // 9. Laboratory Maintenance Supervisor
  if (j.includes('maintenance') && j.includes('supervisor')) return 8;

  // 10. Preparation Foreman, Wet (Wet Preparation Foreman)
  if (j.includes('wet') && j.includes('foreman')) return 9;

  // 11. Preparation Foreman, Dry (Dry Preparation Foreman)
  if (j.includes('dry') && j.includes('foreman')) return 10;

  // 12. Laboratory Foreman (bukan maintenance)
  if (j.includes('laboratory') && j.includes('foreman') && !j.includes('maintenance')) return 11;

  // 13. Quality Assurance Officer
  if ((j.includes('quality assurance') || j.includes('qa')) && (j.includes('officer') || !j.includes('specialist'))) return 12;

  // 14. Laboratory Maintenance Foreman
  if (j.includes('maintenance') && j.includes('foreman')) return 13;

  // 15. Admin, Inventory Control / Inventory Control Staff
  if (j.includes('inventory') && (j.includes('admin') || j.includes('staff'))) return 14;

  // 16. Admin, Preparation & Laboratory / Preparation Admin
  if (j.includes('admin') || j.includes('preparation admin')) return 15;

  // 17. Crew, Laboratory Maintenance
  if (j.includes('crew') && j.includes('maintenance')) return 16;

  // 18. Crew, Preparation & Laboratory
  if (j.includes('crew')) return 17;

  // Fallback berdasarkan kata kunci peran jika ada variasi lain
  if (j.includes('supervisor')) return 7.5;
  if (j.includes('foreman')) return 11.5;
  if (j.includes('staff') || j.includes('officer')) return 14.5;
  if (j.includes('operator') || j.includes('technician') || j.includes('helper')) return 17.5;

  return 999;
}

/**
 * Pembanding (comparator) karyawan berdasarkan urutan hirarki jabatan resmi,
 * dan sekunder berdasarkan nama (A-Z).
 */
export function compareEmployeesByJabatan(a: any, b: any): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const jabA = a.jabatan || a['Jabatan'] || a['Jabatan Baru'] || '';
  const jabB = b.jabatan || b['Jabatan'] || b['Jabatan Baru'] || '';

  const rankA = getJabatanRank(jabA);
  const rankB = getJabatanRank(jabB);

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  // Jika ranking sama, urutkan nama secara alfabetis
  const nameA = String(a.name || a.nama || a['Nama'] || '').trim();
  const nameB = String(b.name || b.nama || b['Nama'] || '').trim();
  return nameA.localeCompare(nameB, 'id', { sensitivity: 'base' });
}
