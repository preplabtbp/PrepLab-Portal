// Hitungan bungkus Orderan Makanan — SATU sumber untuk kartu ringkasan, Export TBP/GPS (browser)
// dan Rekapan Bungkusan harian/mingguan/bulanan (server), agar angkanya selalu sama.
//  lapangan      = porsi kolom Lapangan (Bungkus Lapangan)
//  bungkusKantin = Bungkus Kantin karyawan non-CR (NR): Pagi/Sore dari 1 (B.Pagi)/1 (B.Sore) atau "1" di Kantin; Siang/Sahur dari kolom Kantin
//  makanKantin   = makan di kantin (karyawan Mess CR yang kolom Kantin-nya terisi)

export type MealSlot = 'pagi' | 'sahur' | 'siang' | 'sore' | 'takjil' | 'malam';
export const MEAL_SLOTS: MealSlot[] = ['pagi', 'sahur', 'siang', 'sore', 'takjil', 'malam'];
export const MEAL_SLOT_LABEL: Record<MealSlot, string> = { pagi: 'Pagi', sahur: 'Sahur', siang: 'Siang', sore: 'Sore', takjil: 'Takjil', malam: 'Malam' };
export const MEAL_SLOT_BY_GROUP: Record<string, MealSlot> = { Pagi: 'pagi', Sahur: 'sahur', Siang: 'siang', Sore: 'sore', Takjil: 'takjil', Malam: 'malam' };

export type MealCompany = 'TBP' | 'GPS';

export interface MealCountRow {
  statusMess: string | null;
  batchPagi: string | null;
  batchSore: string | null;
  pagiKantin: string | null; pagiLapangan: string | null;
  sahurKantin?: string | null; sahurLapangan?: string | null;
  siangKantin: string | null; siangLapangan: string | null;
  soreKantin: string | null; soreLapangan: string | null;
  takjilLapangan: string | null;
  malamLapangan: string | null;
}

export interface MealSlotCount { lapangan: number; bungkusKantin: number; makanKantin: number }

export const mealPortions = (v: unknown) => { const n = Number(String(v ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : 0; };
export const isCRMess = (r: { statusMess: string | null }) => ['CR', 'MESS'].includes(String(r.statusMess || '').trim().toUpperCase());

export function mealCounts(r: MealCountRow, slot: MealSlot): MealSlotCount {
  const lapangan = mealPortions((r as any)[`${slot}Lapangan`]);
  if (slot === 'takjil' || slot === 'malam') return { lapangan, bungkusKantin: 0, makanKantin: 0 };
  const kantin = String((r as any)[`${slot}Kantin`] || '').trim();
  if (isCRMess(r)) return { lapangan, bungkusKantin: 0, makanKantin: kantin && kantin !== '-' ? 1 : 0 };
  let bungkusKantin = 0;
  if (slot === 'pagi' || slot === 'sore') bungkusKantin = mealPortions(slot === 'pagi' ? r.batchPagi : r.batchSore) || (kantin === '1' ? 1 : 0);
  else if (slot === 'siang') bungkusKantin = kantin && kantin !== '-' ? 1 : 0;
  else bungkusKantin = kantin === '1' ? 1 : 0;
  return { lapangan, bungkusKantin, makanKantin: 0 };
}

/** Total bungkus satu waktu makan = Bungkus Lapangan + Bungkus Kantin */
export const bungkusCount = (r: MealCountRow, slot: MealSlot) => { const c = mealCounts(r, slot); return c.lapangan + c.bungkusKantin; };

/** Perusahaan dari kolom PT orderan, cadangan PT di Database Karyawan, default TBP */
export function resolveMealCompany(pt: string | null | undefined, employeePt?: string | null): MealCompany {
  const p = String(pt || '').trim().toUpperCase();
  if (p.includes('GPS')) return 'GPS';
  if (p.includes('TBP')) return 'TBP';
  return String(employeePt || '').trim().toUpperCase().includes('GPS') ? 'GPS' : 'TBP';
}
