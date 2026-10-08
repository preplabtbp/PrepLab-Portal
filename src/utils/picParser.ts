// List of common academic titles and abbreviations in Indonesia & International
const KNOWN_DEGREES = new Set([
  'st', 's.t', 's.t.', 'se', 's.e', 's.e.', 'sh', 's.h', 's.h.',
  'ssi', 's.si', 's.si.', 'skom', 's.kom', 's.kom.', 'sp', 's.p', 's.p.',
  'spd', 's.pd', 's.pd.', 'ss', 's.s', 's.s.', 'skm', 's.k.m', 's.k.m.',
  'stp', 's.t.p', 's.t.p.', 'sos', 's.sos', 's.sos.', 'si', 's.i', 's.i.',
  'mt', 'm.t', 'm.t.', 'msi', 'm.si', 'm.si.', 'mm', 'm.m', 'm.m.',
  'mba', 'm.b.a', 'm.b.a.', 'mkom', 'm.kom', 'm.kom.', 'mpd', 'm.pd', 'm.pd.',
  'mh', 'm.h', 'm.h.', 'msc', 'm.sc', 'm.sc.', 'meng', 'm.eng', 'm.eng.',
  'phd', 'ph.d', 'ph.d.', 'dr', 'dr.', 'dra', 'dra.', 'drs', 'drs.', 'ir', 'ir.',
  'amd', 'a.md', 'a.md.', 'amg', 'a.mg', 'a.mg.', 'apt', 'apt.'
]);

export function isAcademicDegree(token: string): boolean {
  if (!token) return false;
  const clean = token.trim().toLowerCase().replace(/\s+/g, '');
  if (KNOWN_DEGREES.has(clean)) return true;
  // Regex pattern for titles like S.T., M.Sc., A.Md. Kom., etc.
  if (/^s\.?[a-z]{1,4}\.?$/i.test(clean)) return true;
  if (/^m\.?[a-z]{1,4}\.?$/i.test(clean)) return true;
  if (/^a\.?md\.?$/i.test(clean)) return true;
  return false;
}

/**
 * Splits a string containing one or more PIC names (separated by commas, semicolons, or newlines)
 * while properly preserving academic titles following a comma (e.g. "Sukarman A. Akil, ST").
 */
export function splitPicNames(nameStr?: string | null): string[] {
  if (!nameStr) return [];
  const trimmed = nameStr.trim();
  if (!trimmed || trimmed === '-' || trimmed === '•') return [];

  // Split on commas, semicolons, or newlines
  const rawParts = trimmed.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  const result: string[] = [];

  for (const part of rawParts) {
    if (result.length > 0 && isAcademicDegree(part)) {
      // Re-attach academic degree to the previous name instead of treating it as a new person
      result[result.length - 1] = `${result[result.length - 1]}, ${part}`;
    } else {
      result.push(part);
    }
  }

  return result.filter(n => n && n !== '-' && n !== '•');
}

export interface ParsedPic {
  nik: string;
  name: string;
}

/**
 * Parses NIK and Name strings into structured PIC list
 */
export function parsePicList(nikStr?: string | null, nameStr?: string | null): ParsedPic[] {
  if (!nameStr && !nikStr) return [];
  const names = splitPicNames(nameStr);
  const niks = (nikStr || '').split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);

  const len = Math.max(names.length, niks.length);
  const list: ParsedPic[] = [];

  for (let i = 0; i < len; i++) {
    const rawName = names[i] || niks[i] || 'Personil';
    // Double check that rawName itself isn't a standalone degree
    if (isAcademicDegree(rawName) && list.length > 0) {
      list[list.length - 1].name += `, ${rawName}`;
      continue;
    }
    list.push({
      nik: niks[i] || '',
      name: rawName
    });
  }

  return list;
}
