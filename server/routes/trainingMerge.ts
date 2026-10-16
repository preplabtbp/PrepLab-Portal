// Logika penggabungan data training (murni, tanpa database) — dipakai oleh upsert massal di training.ts.
import type { ParsedTrainingRow, TrainingProgram } from "../../src/utils/training-import.js";

export const PROFILE_FIELDS = ['nama', 'jabatan', 'gol', 'shift', 'bagian', 'pt'] as const;
export const PROGRAM_FIELDS: Record<TrainingProgram, readonly (keyof ParsedTrainingRow)[]> = {
  sap: ['hazid', 'hazidStatus', 'jsa', 'jsaStatus', 'iutOtt', 'iutOttStatus', 'iai', 'iaiStatus', 'bfa', 'bfaStatus', 'bs', 'bsStatus', 'sapDetails'],
  k3: ['wah', 'wahStatus', 'loto', 'lotoStatus', 'confinedSpace', 'confinedSpaceStatus', 'fireFighting', 'fireFightingStatus'],
  pra_pop: ['popData'],
  pop: ['popData'],
};
// Kolom flag keikutsertaan & nomor urut per program
export const PROGRAM_FLAG = { sap: 'inSap', k3: 'inK3', pra_pop: 'inPop', pop: 'inPop' } as const;
export const PROGRAM_NO = { sap: 'no', k3: 'noK3', pra_pop: 'noPop', pop: 'noPop' } as const;

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
// - Profil: Training SAP menimpa; Training K3 hanya mengisi yang kosong (kecuali Bagian & PT dari file K3);
//   file satu-training & Sertifikasi POP hanya mengisi yang kosong.
export function mergeTrainingRow(
  rec: ParsedTrainingRow,
  existing: Record<string, any> | undefined,
  { programs, updatedBy, now, fillProfileOnly = false }: MergeOptions
): Record<string, unknown> {
  const sapIsSource = programs.includes('sap');
  const fillOnly = fillProfileOnly || (!sapIsSource && !programs.includes('k3'));
  const row: Record<string, unknown> = { nik: rec.nik, updatedBy, updatedAt: now };

  PROFILE_FIELDS.forEach(f => {
    const incoming = rec[f] ?? null;
    const current = existing ? existing[f] ?? null : null;
    const preferIncoming = !fillOnly && (sapIsSource || f === 'bagian' || f === 'pt');
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
  // Nomor urut hanya dari file utama program tsb (bukan file satu-training)
  (Object.keys(PROGRAM_NO) as TrainingProgram[]).forEach(p => {
    const col = PROGRAM_NO[p];
    const fromSource = programs.length === 1 && programs[0] === p && rec.no != null && !fillProfileOnly;
    row[col] = fromSource ? rec.no : existing?.[col] ?? null;
  });
  (Object.keys(PROGRAM_FLAG) as TrainingProgram[]).forEach(p => {
    const col = PROGRAM_FLAG[p];
    row[col] = programs.includes(p) || !!existing?.[col];
  });
  return row;
}
