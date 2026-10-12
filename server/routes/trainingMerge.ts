// Logika penggabungan data training (murni, tanpa database) — dipakai oleh upsert massal di training.ts.
import type { ParsedTrainingRow, TrainingProgram } from "../../src/utils/training-import.js";

export const PROFILE_FIELDS = ['nama', 'jabatan', 'gol', 'shift', 'bagian', 'pt'] as const;
export const PROGRAM_FIELDS: Record<TrainingProgram, readonly (keyof ParsedTrainingRow)[]> = {
  sap: ['hazid', 'hazidStatus', 'jsa', 'jsaStatus', 'iutOtt', 'iutOttStatus', 'iai', 'iaiStatus', 'bfa', 'bfaStatus', 'bs', 'bsStatus', 'sapDetails'],
  k3: ['wah', 'wahStatus', 'loto', 'lotoStatus', 'confinedSpace', 'confinedSpaceStatus', 'fireFighting', 'fireFightingStatus'],
};

export interface MergeOptions {
  programs: TrainingProgram[];
  updatedBy: string | null;
  now: Date;
  // File satu-training (mis. Basic Safety) hanya mengisi profil yang kosong, tidak menimpa nama/jabatan
  fillProfileOnly?: boolean;
}

// Gabungkan satu baris sumber dengan data lama (bila ada) menjadi baris lengkap untuk di-upsert.
// - Field program yang ADA di sumber diganti; yang tidak ada (mis. kolom BS di file lama) dipertahankan.
// - Detail skor (sapDetails) digabung per training.
// - Profil: Training SAP menimpa, Training K3 & file satu-training hanya mengisi yang kosong
//   (kecuali Bagian & PT yang memang bersumber dari file K3).
export function mergeTrainingRow(
  rec: ParsedTrainingRow,
  existing: Record<string, any> | undefined,
  { programs, updatedBy, now, fillProfileOnly = false }: MergeOptions
): Record<string, unknown> {
  const sapIsSource = programs.includes('sap');
  const row: Record<string, unknown> = { nik: rec.nik, updatedBy, updatedAt: now };

  PROFILE_FIELDS.forEach(f => {
    const incoming = rec[f] ?? null;
    const current = existing ? existing[f] ?? null : null;
    const preferIncoming = !fillProfileOnly && (sapIsSource || f === 'bagian' || f === 'pt');
    row[f] = preferIncoming ? (incoming ?? current) : (current ?? incoming);
  });
  (Object.keys(PROGRAM_FIELDS) as TrainingProgram[]).forEach(p => PROGRAM_FIELDS[p].forEach(f => {
    const fromSource = programs.includes(p) && f in rec;
    const current = existing ? existing[f] ?? null : null;
    if (f === 'sapDetails') {
      const incoming = fromSource && rec.sapDetails ? rec.sapDetails : null;
      row[f] = incoming ? { ...(current || {}), ...incoming } : current;
      return;
    }
    row[f] = fromSource ? rec[f] ?? null : current;
  }));
  row.no = sapIsSource && rec.no != null && !fillProfileOnly ? rec.no : existing?.no ?? null;
  row.noK3 = !sapIsSource && programs.includes('k3') && rec.no != null && !fillProfileOnly ? rec.no : existing?.noK3 ?? null;
  row.inSap = programs.includes('sap') || !!existing?.inSap;
  row.inK3 = programs.includes('k3') || !!existing?.inK3;
  return row;
}
