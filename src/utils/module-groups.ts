// Kelompokkan item modul di dalam satu kategori menu berdasarkan field `group` (urutan dipertahankan).
// Item tanpa `group` dikumpulkan dalam kelompok tanpa judul.
export function groupModuleItems<T extends object>(items: readonly T[]): { name: string; items: T[] }[] {
  const groups: { name: string; items: T[] }[] = [];
  for (const item of items) {
    const name = (item as { group?: string }).group || '';
    const existing = groups.find(g => g.name === name);
    if (existing) existing.items.push(item);
    else groups.push({ name, items: [item] });
  }
  return groups;
}
