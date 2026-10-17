import { eq } from "drizzle-orm";
import { db } from "../../src/db/index.js";
import { employees, developerUsers } from "../../src/db/schema.js";

// Hak edit modul Safety "Jadwal Inspeksi" & "Rekap KTA/TTA & Inspeksi":
// hanya Section Administration, Developer, dan Manager. Selain itu hanya melihat data dirinya sendiri.
const DEVELOPER_NIKS = new Set(['02D25000055', '02D24000043', '04D21001047', '04D24000042', 'M0403240177', 'PREPLABADMIN']);

export interface SafetyUser { nik?: string; isDeveloper?: boolean; section?: string | null; department?: string | null; jabatan?: string | null }

export async function canEditSafety(user?: SafetyUser | null): Promise<boolean> {
  const nik = String(user?.nik || '').trim().toUpperCase();
  if (!nik) return false;
  if (DEVELOPER_NIKS.has(nik) || user?.isDeveloper) return true;
  try {
    const dev = await db.select({ nik: developerUsers.nik }).from(developerUsers).where(eq(developerUsers.nik, nik)).limit(1);
    if (dev.length) return true;
  } catch {}
  let section = user?.section || '', department = user?.department || '', jabatan = user?.jabatan || '';
  try {
    const emp = await db.select({ section: employees.section, department: employees.department, jabatan: employees.jabatan })
      .from(employees).where(eq(employees.nik, nik)).limit(1);
    if (emp[0]) {
      section = emp[0].section || section;
      department = emp[0].department || department;
      jabatan = emp[0].jabatan || jabatan;
    }
  } catch {}
  const isAdministration = /admin/i.test(section || '') || /admin/i.test(department || '');
  const isManager = /manager/i.test(jabatan || '');
  return isAdministration || isManager;
}
