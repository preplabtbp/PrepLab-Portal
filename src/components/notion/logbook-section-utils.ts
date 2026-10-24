/**
 * Visual display translator for Indonesian section names to English
 */
export function translateDisplayText(text: string): string {
  if (!text) return text;
  return text
    .replace(/\bMANAJEMEN\s+MUTU\b/g, 'QUALITY ASSURANCE')
    .replace(/\bManajemen\s+Mutu\b/gi, 'Quality Assurance')
    .replace(/\bLABORATORIUM\b/g, 'LABORATORY')
    .replace(/\bLaboratorium\b/gi, 'Laboratory')
    .replace(/\bPREPARASI\b/g, 'PREPARATION')
    .replace(/\bPreparasi\b/gi, 'Preparation')
    .replace(/\bADMINISTRASI\b/g, 'ADMINISTRATION')
    .replace(/\bAdministrasi\b/gi, 'Administration')
    .replace(/\bPROSEDUR\b/g, 'PROCEDURE')
    .replace(/\bProsedur\b/gi, 'Procedure')
    .replace(/\bINFORMASI\b/g, 'INFORMATION')
    .replace(/\bInformasi\b/gi, 'Information')
    .replace(/\bHARIAN\b/g, 'DAILY')
    .replace(/\bHarian\b/gi, 'Daily')
    .replace(/\bMINGGUAN\b/g, 'WEEKLY')
    .replace(/\bMingguan\b/gi, 'Weekly')
    .replace(/\bBULANAN\b/g, 'MONTHLY')
    .replace(/\bBulanan\b/gi, 'Monthly')
    .replace(/\bTAHUNAN\b/g, 'YEARLY')
    .replace(/\bTahunan\b/gi, 'Yearly')
    .replace(/\bSELESAI\b/g, 'COMPLETED')
    .replace(/\bSelesai\b/gi, 'Completed')
    .replace(/\bCATATAN\b/g, 'NOTES')
    .replace(/\bCatatan\b/gi, 'Notes');
}

/**
 * Visual display translator for table column headers from Indonesian to English
 */

/**
 * Resolves a canonical section identifier supporting bilingual equivalents:
 * e.g. "Laboratorium", "Laboratory", "LABORATORY", "section-laboratorium" -> 'laboratory'
 */
export function getCanonicalSection(s: string): string {
  if (!s) return '';
  const clean = s.replace(/^[#\s\-*]+/, '').replace(/^section-/, '').replace(/-/g, ' ').trim().toLowerCase();
  
  // Distinguish sub-documents (Daily, Weekly, Logbook, SOP, etc.)
  const subPrefix = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'biannual', 'logbook', 'routine', 'non-routine', 'sop', 'ik'].find(p => clean.includes(p));

  let base = '';
  if (clean.includes('lab') || clean.includes('aas') || clean.includes('xrf')) base = 'laboratory';
  else if (clean.includes('prep') || clean.includes('crusher')) base = 'preparation';
  else if (clean.includes('admin') || clean.includes('surat') || clean.includes('cuti')) base = 'administration';
  else if (clean.includes('mutu') || clean.includes('iso') || clean.includes('qa') || clean.includes('quality')) base = 'quality_assurance';
  else if (clean.includes('maint') || clean.includes('teknik') || clean.includes('mesin')) base = 'maintenance';
  else if (clean.includes('ware') || clean.includes('gudang') || clean.includes('stok') || clean.includes('inven')) base = 'inventory';
  else if (clean.includes('prosedur') || clean.includes('procedure')) base = 'procedure';
  else if (clean.includes('general issue') || clean.includes('issue')) base = 'general_issue';
  else base = clean.replace(/[^a-z0-9]/g, '');

  return subPrefix ? base + ':' + subPrefix : base;
}

/**
 * Checks if two section strings refer to the same section (supporting English/Indonesian aliases).
 * e.g. "Laboratorium" and "Laboratory" -> true
 *      "section-laboratorium" and "LABORATORY" -> true
 */
export function isSameSection(a: string, b: string): boolean {
  if (!a || !b) return false;
  const canA = getCanonicalSection(a);
  const canB = getCanonicalSection(b);
  if (canA && canB && canA === canB) return true;
  return false;
}

export function getDisplayColumnHeader(colHeader: string): string {
  if (!colHeader) return '';
  const colLower = colHeader.toLowerCase().trim();
  
  if (
    colLower.includes('tanggal selesai') || 
    colLower.includes('completed') || 
    colLower.includes('aktual selesai') || 
    colLower === 'selesai' || 
    colLower.includes('waktu selesai')
  ) {
    return 'Completion Date';
  }
  if (
    colLower.includes('due') || 
    colLower.includes('deadline') || 
    colLower.includes('target') || 
    colLower.includes('jatuh tempo') || 
    colLower.includes('batas waktu')
  ) {
    return 'Due Date';
  }
  if (
    colLower.includes('jenis kegiatan') || 
    colLower.includes('nama kegiatan') || 
    colLower.includes('judul kegiatan') ||
    colLower === 'kegiatan'
  ) {
    return 'Activity Name';
  }
  if (colLower === 'keterangan' || colLower === 'catatan') {
    return 'Description';
  }
  if (colLower === 'prioritas' || colLower === 'priority') {
    return 'Priority';
  }
  if (colLower === 'status') {
    return 'Status';
  }
  if (colLower === 'aktivitas') {
    return 'Activity';
  }
  if (colLower === 'kategori') {
    return 'Category';
  }
  if (colLower === 'asal halaman') {
    return 'Source Page';
  }
  if (colLower === 'created time' || colLower === 'tanggal dibuat' || colLower === 'waktu dibuat') {
    return 'Created Time';
  }
  if (colLower === 'nomor' || colLower === 'no') {
    return 'Number';
  }
  return translateDisplayText(colHeader);
}


import type { TableRowData } from '../NotionDatabaseTable';
export type { TableRowData };

/**
 * Universal helper to extract task / activity title from any row,
 * supporting both English ('Activity Name', 'Activity', 'Title', 'Task') and Indonesian ('Jenis kegiatan', 'Judul', 'Kegiatan')
 */
export function getTaskRowTitle(row: TableRowData | Record<string, any>): string {
  if (!row) return '';
  const direct = row['Activity Name'] || row['Jenis kegiatan'] || row['Jenis Kegiatan'] || row['Activity'] || row['Judul'] || row['Name'] || row['Title'] || row['task'] || row['Task'];
  if (direct && typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }

  for (const k of Object.keys(row)) {
    const kl = k.toLowerCase().trim();
    if (kl.includes('routine') || kl.includes('rutin') || kl.includes('kategori')) continue;
    if (
      kl === 'activity name' ||
      kl === 'activity' ||
      kl === 'task' ||
      kl === 'title' ||
      kl === 'judul' ||
      kl === 'name' ||
      kl === 'nama' ||
      kl === 'materi' ||
      kl.includes('jenis kegiatan') ||
      kl.includes('nama kegiatan') ||
      kl.includes('judul kegiatan') ||
      (kl.includes('kegiatan') && !kl.includes('kategori'))
    ) {
      const v = row[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') {
        return String(v).trim();
      }
    }
  }
  return '';
}

export function isSubItemRow(row: TableRowData): boolean {
  if (!row) return false;
  if (row.isSubItem === 'true' || (row as any).isSubItem === true) return true;
  if (row.parentId || row.parentRowId) return true;
  const title = getTaskRowTitle(row);
  if (title.startsWith('↳') || title.startsWith('↪')) {
    return true;
  }
  return false;
}

/**
 * Formats any date string or Date object into clean DD-MM-YYYY format.
 * Examples: '2026-10-10' -> '10-10-2026', '2026-10-15T06:07:46.283Z' -> '15-10-2026'
 */
export function formatToDDMMYYYY(val: string | number | Date | null | undefined): string {
  if (!val) return '';
  const str = String(val).trim();
  if (str === '-' || str === '') return str;

  if (val instanceof Date) {
    if (isNaN(val.getTime())) return '';
    const d = String(val.getDate()).padStart(2, '0');
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const y = val.getFullYear();
    return `${d}-${m}-${y}`;
  }

  // If already starts with DD-MM-YYYY (strip any trailing ISO T... or raw milliseconds)
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (dmyMatch) {
    const [, d, m, y, hh, mm] = dmyMatch;
    const base = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    if (hh !== undefined && mm !== undefined && !str.includes('Z') && !str.includes('T')) {
      return `${base} ${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
    }
    return base;
  }

  // If YYYY-MM-DD or ISO timestamp YYYY-MM-DDTHH:mm:ss.sssZ
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{2}))?/);
  if (isoMatch) {
    const [, y, m, d, hh, mm] = isoMatch;
    const base = `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}`;
    if (hh !== undefined && mm !== undefined && !str.includes('Z') && !str.includes('T')) {
      return `${base} ${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
    }
    return base;
  }

  // Try Date parse
  const dt = new Date(str);
  if (!isNaN(dt.getTime())) {
    const d = String(dt.getDate()).padStart(2, '0');
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const y = dt.getFullYear();
    return `${d}-${m}-${y}`;
  }
  return str;
}

export function getTodayDDMMYYYY(): string {
  const dt = new Date();
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  return `${d}-${m}-${y}`;
}

export function getYesterdayDDMMYYYY(): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - 1);
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  return `${d}-${m}-${y}`;
}

/**
 * Strips all internal HTML comments (e.g. <!--task-id:...-->, <!--pin-->, <!pin>, etc.)
 * ensuring clean, human-readable text on the frontend without leaking code.
 */
export function cleanFrontEndText(str: string): string {
  if (!str) return '';
  return str
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!-?[a-zA-Z0-9_\-\s]+.*?>?/g, '')
    .replace(/<!--.*$/g, '')
    .trim();
}

export interface TaskRecommendation {
  id: string;
  title: string;
  description: string;
  pic: string;
  priority: string;
  type: 'Routine' | 'Non-Routine';
  cadence: string; // 'Daily' | 'Weekly' | 'Monthly' | etc.
  originPostId: number;
  originPostTitle: string;
  originRowIndex: number;
  rawRow: TableRowData;
  isAlreadyPlanned?: boolean;
  isPinned?: boolean;
  subtasks?: {
    id: string;
    text: string;
    checked: boolean;
  }[];
  activeSubtaskCount?: number;
  closedSubtaskCount?: number;
}

export const KNOWN_SECTIONS = [
  'Preparasi',
  'Laboratorium',
  'Manajemen Mutu',
  'Administrasi',
  'Maintenance',
  'Quality Assurance',
  'Inventory',
  'Prosedur',
  'General Issue'
] as const;

export type KnownSection = typeof KNOWN_SECTIONS[number];

/**
 * Checks whether a post is a Section Logbook post.
 */
export function isLogbookPost(post: any): boolean {
  if (!post) return false;
  if (post.isLogbook === true) return true;
  const idStr = String(post.id || '').toLowerCase();
  if (idStr.startsWith('logbook-') || idStr === 'logbook') return true;
  const title = (post.title || '').toLowerCase().trim();
  return title.includes('logbook') || title.includes('log book');
}

/**
 * Extracts section name from a post or title.
 */
export function getSectionFromPost(post: any): string {
  if (!post) return 'General';
  const title = (post.title || '').trim();
  
  // 1. Direct check in title
  for (const s of KNOWN_SECTIONS) {
    if (title.toLowerCase().includes(s.toLowerCase())) return s;
  }
  
  // 2. Section / category / department check
  const cat = (post.category || post.section || post.department || '').trim();
  for (const s of KNOWN_SECTIONS) {
    if (cat.toLowerCase().includes(s.toLowerCase())) return s;
  }

  // 3. Normalized mappings
  const tLow = title.toLowerCase();
  if (tLow.includes('prep') || tLow.includes('crusher')) return 'Preparasi';
  if (tLow.includes('lab') || tLow.includes('aas') || tLow.includes('xrf')) return 'Laboratorium';
  if (tLow.includes('mutu') || tLow.includes('iso')) return 'Manajemen Mutu';
  if (tLow.includes('admin') || tLow.includes('surat') || tLow.includes('cuti')) return 'Administrasi';
  if (tLow.includes('maint') || tLow.includes('teknik') || tLow.includes('mesin')) return 'Maintenance';
  if (tLow.includes('qa') || tLow.includes('quality')) return 'Quality Assurance';
  if (tLow.includes('ware') || tLow.includes('gudang') || tLow.includes('stok')) return 'Inventory';
  if (tLow.includes('sop') || tLow.includes('ik') || tLow.includes('jsa')) return 'Prosedur';

  return cat || 'General';
}

/**
 * Resolves allowed section names for a given user profile.
 * Non-dev and non-manager personnel are restricted to their own section's labnote.
 */
export function getUserAllowedSections(userProfile?: any): string[] {
  let profile = userProfile;
  if (!profile) {
    try {
      profile = JSON.parse(localStorage.getItem('p2h_inspector_profile') || '{}');
    } catch {}
  }
  const nik = (profile?.nik || profile?.NIK || localStorage.getItem('p2h_inspector_nik') || '').trim();
  const name = (profile?.name || profile?.nama || profile?.Nama || localStorage.getItem('p2h_inspector_name') || '').toLowerCase();
  const uname = (profile?.username || localStorage.getItem('p2h_inspector_username') || '').toLowerCase();
  const jab = (profile?.jabatan || localStorage.getItem('p2h_inspector_jabatan') || '').toLowerCase();
  const sec = (profile?.section || profile?.seksi || localStorage.getItem('p2h_inspector_section') || '').toLowerCase();
  const dept = (profile?.department || profile?.departemen || localStorage.getItem('p2h_inspector_dept') || '').toLowerCase();

  const allowed: string[] = [];

  const checkText = (text: string) => {
    if (text.includes('qa') || text.includes('mutu') || text.includes('quality') || text.includes('iso')) {
      allowed.push('Manajemen Mutu', 'Quality Assurance');
    }
    if (text.includes('maint') || text.includes('pemeliharaan') || text.includes('teknik') || text.includes('mekanik') || text.includes('listrik')) {
      allowed.push('Maintenance');
    }
    if (text.includes('invent') || text.includes('gudang') || text.includes('warehouse') || text.includes('logistic') || text.includes('logistik')) {
      allowed.push('Inventory');
    }
    if (text.includes('admin') || text.includes('adm') || text.includes('hr') || text.includes('personalia')) {
      allowed.push('Administrasi');
    }
    if (text.includes('prep') || text.includes('crush') || text.includes('dry') || text.includes('wet')) {
      allowed.push('Preparasi');
    }
    if (text.includes('lab') || text.includes('aas') || text.includes('xrf') || text.includes('analyst') || text.includes('kimia')) {
      if (!text.includes('maintenance')) {
        allowed.push('Laboratorium');
      }
    }
  };

  // 1. Cek section terlebih dahulu (paling spesifik)
  checkText(sec);

  // 2. Jika belum ditemukan, cek dept
  if (allowed.length === 0) {
    checkText(dept);
  }

  // 3. Jika belum ditemukan, cek jabatan
  if (allowed.length === 0) {
    checkText(jab);
  }

  // Hak Akses Khusus: Sarjon Jaya Putra (NIK: M0401260003) diberikan akses ke Labnote Maintenance
  if (nik === 'M0401260003' || name.includes('sarjon') || uname.includes('sarjon')) {
    allowed.push('Maintenance');
  }

  // 4. Default fallback jika masih kosong
  if (allowed.length === 0) {
    allowed.push('Preparasi');
  }

  return [...new Set(allowed)];
}

/**
 * Checks whether user has permission to access a specific labnote section.
 * Developers and Managers have unrestricted access to all sections.
 */
export function isUserAllowedToAccessSection(
  sectionName: string, 
  userProfile?: any, 
  isDevOrManager?: boolean
): boolean {
  if (isDevOrManager) return true;
  const clean = sectionName.replace(/^[#\s\-*]+/, '').trim().toLowerCase();
  if (clean === 'prosedur' || clean === 'general issue' || clean === 'general' || clean === 'information') {
    return true;
  }
  const allowed = getUserAllowedSections(userProfile);
  return allowed.some(s => isSameSection(s, clean) || s.toLowerCase() === clean || clean.includes(s.toLowerCase()));
}


/**
 * Determines if a row represents an ACTIVE task (belum selesai).
 */
export function isRowActive(row: Record<string, any>): boolean {
  if (!row) return false;

  // 1. Check Status column
  const statusKey = Object.keys(row).find(k => k.toLowerCase() === 'status');
  const statusVal = (statusKey ? String(row[statusKey] || '') : '').toLowerCase().trim();

  if (['closed', 'selesai', 'done', 'complete', 'completed', 'finish', 'finished', 'archived'].includes(statusVal)) {
    return false;
  }

  // 2. Check Tanggal Selesai column
  const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('selesai') || k.toLowerCase() === 'completed');
  const dateVal = dateKey ? String(row[dateKey] || '').trim() : '';
  if (dateVal && dateVal !== '-' && dateVal !== 'belum selesai' && !dateVal.startsWith('0000')) {
    // If completed date is filled and status is not explicitly open
    if (statusVal === 'closed' || statusVal === 'selesai' || statusVal === 'done') {
      return false;
    }
  }

  // 3. Check Subtasks in Keterangan
  const ketKey = Object.keys(row).find(k => k.toLowerCase() === 'keterangan' || k.toLowerCase() === 'uraian');
  const ketVal = ketKey ? String(row[ketKey] || '') : '';
  const subtasks: string[] = (ketVal.match(/- \[[ xX]\]/g) as string[]) || [];
  if (subtasks.length > 0) {
    const uncompletedSubtasks = subtasks.filter(s => s.includes('[ ]'));
    // If all subtasks are finished and status is closed
    if (uncompletedSubtasks.length === 0 && (statusVal === 'closed' || statusVal === 'selesai')) {
      return false;
    }
  }

  return true;
}

/**
 * Canonical headers for Unified Section Logbook tables.
 */
export const LOGBOOK_CANONICAL_HEADERS = [
  'number',
  'Jenis kegiatan',
  'Keterangan',
  'Created Time',
  'Tanggal Selesai',
  'Status',
  'PIC',
  'Priority',
  'Activity (routine/non routine)',
  'period',
  'Asal Halaman'
];

/**
 * Extracts raw table rows and headers from markdown content.
 */
export function parseTableFromMarkdown(content: string): { headers: string[]; rows: TableRowData[] } | null {
  if (!content || !content.includes('|')) return null;
  const lines = content.split('\n');
  let headerIdx = -1;
  let separatorIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (headerIdx === -1) {
        headerIdx = i;
      } else if (separatorIdx === -1 && line.includes('---')) {
        separatorIdx = i;
        break;
      }
    }
  }

  if (headerIdx === -1 || separatorIdx === -1) return null;

  const headers = lines[headerIdx]
    .split('|')
    .map(h => h.trim())
    .filter((h, idx, arr) => idx > 0 && idx < arr.length - 1);

  if (headers.length === 0) return null;

  const rows: TableRowData[] = [];
  let currentRow = '';

  for (let i = separatorIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentRow && currentRow.trim().endsWith('|')) {
        const parsed = parseRowLine(currentRow.trim(), headers);
        if (parsed) rows.push(parsed);
        currentRow = '';
      }
      continue;
    }

    if (!trimmed.startsWith('|') && (trimmed.startsWith('#') || trimmed.startsWith('> ') || trimmed.startsWith('```'))) {
      if (currentRow) {
        const parsed = parseRowLine(currentRow.trim(), headers);
        if (parsed) rows.push(parsed);
        currentRow = '';
      }
      break;
    }

    if (trimmed.startsWith('|')) {
      if (currentRow && currentRow.trim().endsWith('|')) {
        const parsed = parseRowLine(currentRow.trim(), headers);
        if (parsed) rows.push(parsed);
        currentRow = line;
      } else if (currentRow) {
        currentRow += ' ' + line;
      } else {
        currentRow = line;
      }
    } else if (currentRow) {
      currentRow += ' ' + line;
    }
  }

  if (currentRow && currentRow.trim().endsWith('|')) {
    const parsed = parseRowLine(currentRow.trim(), headers);
    if (parsed) rows.push(parsed);
  }

  return { headers, rows };
}

function parseRowLine(line: string, headers: string[]): TableRowData | null {
  const parts = line.split(/(?<!\\)\|/).map(p => p.replace(/\\\|/g, '|').trim());
  const cellValues = parts.slice(1, parts.length - 1);
  if (cellValues.length === 0) return null;

  const rowStr = cellValues.join(' ');
  const taskMatch = rowStr.match(/<!--task-id:([^>]+)-->/);
  const parentMatch = rowStr.match(/<!--parent-id:([^>]+)-->/);
  const modMatch = rowStr.match(/<!--last-modified:([^>]+)-->/);
  const isPin = rowStr.includes('<!--pin') || rowStr.includes('<!pin') || rowStr.includes('<!--pinned');
  const originIdMatch = rowStr.match(/<!--origin-id:([^>]+)-->/);
  const originTitleMatch = rowStr.match(/<!--origin-title:([^>]+)-->/);
  const originRowMatch = rowStr.match(/<!--origin-row:([^>]+)-->/);
  const parentTitleMatch = rowStr.match(/<!--parent-title:([^>]+)-->/);
  const isLogbookMatch = rowStr.match(/<!--is-logbook:([^>]+)-->/);

  const rowObj: TableRowData = { number: '' };
  headers.forEach((h, idx) => {
    rowObj[h] = cleanFrontEndText(cellValues[idx] || '');
  });

  if (taskMatch) rowObj.id = taskMatch[1].trim();
  if (parentMatch) {
    rowObj.parentId = parentMatch[1].trim();
    rowObj.parentRowId = parentMatch[1].trim();
    rowObj.isSubItem = 'true';
  }
  if (modMatch) {
    rowObj['Last Modified'] = modMatch[1].trim();
    rowObj['Date Modified'] = modMatch[1].trim();
  }
  if (isPin) {
    rowObj.isPinned = 'true';
    (rowObj as any)._pinned = 'true';
  }
  if (originIdMatch) rowObj._originPostId = originIdMatch[1].trim();
  if (originTitleMatch) {
    try {
      rowObj._originPostTitle = decodeURIComponent(originTitleMatch[1].trim());
    } catch {
      rowObj._originPostTitle = originTitleMatch[1].trim();
    }
  }
  if (originRowMatch) rowObj._originRowIndex = originRowMatch[1].trim();
  if (parentTitleMatch) {
    try {
      rowObj._parentTitle = decodeURIComponent(parentTitleMatch[1].trim());
    } catch {
      rowObj._parentTitle = parentTitleMatch[1].trim();
    }
  }
  if (isLogbookMatch) rowObj._isLogbookAggregated = 'true';

  return rowObj;
}

/**
 * Finds all task posts for a given section.
 */
export function findSectionTaskPosts(sectionName: string, allPosts: any[], targetUniverse: string = 'TBP'): any[] {
  const sNorm = sectionName.toLowerCase().trim();

  return allPosts.filter(p => {
    // 1. PT universe isolation
    const pUniv = p.pt === 'GTS' ? 'GTS' : 'TBP';
    if (targetUniverse !== 'ALL' && pUniv !== targetUniverse) return false;

    // 2. Section matching
    const pTitle = (p.title || '').toLowerCase().trim();
    const pCat = (p.category || p.section || p.department || '').toLowerCase().trim();

    const matchesSection = 
      pTitle.includes(sNorm) || 
      pCat.includes(sNorm) ||
      (sNorm.includes('prep') && (pTitle.includes('preparasi') || pCat.includes('preparasi'))) ||
      (sNorm.includes('lab') && (pTitle.includes('laboratorium') || pCat.includes('laboratorium'))) ||
      (sNorm.includes('mutu') && (pTitle.includes('mutu') || pCat.includes('mutu'))) ||
      (sNorm.includes('admin') && (pTitle.includes('administrasi') || pCat.includes('administrasi'))) ||
      (sNorm.includes('maint') && (pTitle.includes('maintenance') || pCat.includes('maintenance'))) ||
      (sNorm.includes('invent') && (pTitle.includes('inventory') || pTitle.includes('warehouse') || pCat.includes('inventory'))) ||
      (sNorm.includes('qa') && (pTitle.includes('quality') || pCat.includes('quality')));

    if (!matchesSection) return false;

    // 3. Exclude the section hub itself, archived posts, meetings, and logbook posts
    if (pTitle.startsWith('archived') || pTitle.includes('[meeting]') || pTitle === sNorm || pTitle.startsWith('logbook') || pTitle.startsWith('log book') || p.isLogbook === true) {
      return false;
    }

    // 4. Must contain a table
    const content = typeof p.content === 'string' ? p.content : '';
    return content.includes('|');
  });
}

/**
 * Aggregates all ACTIVE routine and non-routine tasks for a section.
 */
export function aggregateSectionActiveTasks(
  sectionName: string,
  allPosts: any[],
  targetUniverse: string = 'TBP',
  directLogbookPost?: any
): {
  headers: string[];
  rows: TableRowData[];
  beforeText: string;
  afterText: string;
  rawTable: string;
} {
  const matchingPosts = findSectionTaskPosts(sectionName, allPosts, targetUniverse);
  const activeRows: TableRowData[] = [];
  const seenTaskKeys = new Set<string>();

  // Helper to normalize and push row
  const pushActiveRow = (row: TableRowData, post: any, originIdx: number) => {
    if (!isRowActive(row)) return;

    // Get task title for deduplication (supports both English & Indonesian headers)
    const taskTitle = getTaskRowTitle(row);
    if (!taskTitle) return;

    const dedupKey = `${taskTitle.toLowerCase()}_${String(row.PIC || row.pic || '').toLowerCase()}`;
    if (seenTaskKeys.has(dedupKey)) return;
    seenTaskKeys.add(dedupKey);

    // Determine Activity and Period based on table location
    const postTitle = post.title || '';
    const isNonRoutine = postTitle.toLowerCase().includes('non routine') || postTitle.toLowerCase().includes('non-routine');
    const defaultActivity = isNonRoutine ? 'Non-Routine' : 'Routine';

    let defaultPeriod = 'Daily';
    const ptLow = postTitle.toLowerCase();
    if (ptLow.includes('daily')) defaultPeriod = 'Daily';
    else if (ptLow.includes('weekly')) defaultPeriod = 'Weekly';
    else if (ptLow.includes('monthly')) defaultPeriod = 'Monthly';
    else if (ptLow.includes('quarterly')) defaultPeriod = 'Quarterly';
    else if (ptLow.includes('biannual')) defaultPeriod = 'Biannual';
    else if (ptLow.includes('yearly')) defaultPeriod = 'Yearly';
    else if (isNonRoutine) defaultPeriod = 'Non-Routine';

    // Map existing activity / period or align with current position
    let finalActivity = String(row['Activity (routine/non routine)'] || row.Aktivitas || row.aktivitas || defaultActivity).trim();
    if (isNonRoutine && (finalActivity.toLowerCase() === 'routine' || finalActivity.toLowerCase() === 'rutin')) {
      finalActivity = 'Non-Routine';
    } else if (!isNonRoutine && (finalActivity.toLowerCase() === 'non-routine' || finalActivity.toLowerCase() === 'non routine')) {
      finalActivity = 'Routine';
    }

    let finalPeriod = String(row.period || row.Period || defaultPeriod).trim();
    if (isNonRoutine && (finalPeriod.toLowerCase() === 'routine' || finalPeriod.toLowerCase() === 'rutin')) {
      finalPeriod = 'Non-Routine';
    }

    // Normalize keys to canonical headers (support both English 'Activity Name' & Indonesian 'Jenis kegiatan')
    const normalizedRow: TableRowData = {
      number: String(activeRows.length + 1),
      'Activity Name': taskTitle,
      'Jenis kegiatan': taskTitle,
      'Jenis Kegiatan': taskTitle,
      Keterangan: String(row.Keterangan || row.keterangan || row.uraian || ''),
      'Created Time': String(row['Created Time'] || row['Created time'] || row.created_time || row.date || ''),
      'Tanggal Selesai': String(row['Tanggal Selesai'] || row['Tanggal selesai'] || row.completed || '-'),
      Status: String(row.Status || row.status || 'Open'),
      PIC: String(row.PIC || row.pic || ''),
      Priority: String(row.Priority || row.priority || 'Normal'),
      'Activity (routine/non routine)': finalActivity,
      period: finalPeriod,
      'Asal Halaman': postTitle,
      // Metadata for origin tracking and two-way persistence
      _originPostId: String(post.id),
      _originPostTitle: postTitle,
      _originRowIndex: String(originIdx),
      _isLogbookAggregated: 'true'
    };

    activeRows.push(normalizedRow as TableRowData);
  };

  // 1. Process matching section posts
  matchingPosts.forEach(post => {
    const parsed = parseTableFromMarkdown(post.content || '');
    if (parsed && parsed.rows) {
      parsed.rows.forEach((r, idx) => {
        pushActiveRow(r, post, idx);
      });
    }
  });

  // 2. Also process direct Logbook post if available
  if (directLogbookPost && directLogbookPost.content) {
    const parsed = parseTableFromMarkdown(directLogbookPost.content);
    if (parsed && parsed.rows) {
      parsed.rows.forEach((r, idx) => {
        pushActiveRow(r, directLogbookPost, idx);
      });
    }
  }

  // Renumber rows 1..N
  activeRows.forEach((r, idx) => {
    r.number = String(idx + 1);
  });

  const beforeText = `> 📔 **Logbook Terpadu Seksi ${sectionName}**  \n> Menampilkan **${activeRows.length} kegiatan aktif** (Routine & Non-Routine). Seluruh checklist subtask, progress, dan status tersinkronisasi langsung secara live.`;

  return {
    headers: LOGBOOK_CANONICAL_HEADERS,
    rows: activeRows,
    beforeText,
    afterText: '',
    rawTable: ''
  };
}

/**
 * Synchronizes a group of updated Logbook rows (parent tasks and child subtasks)
 * directly back to their origin post in a single atomic update.
 */
export async function syncLogbookRowsGroupToOrigin(
  originPostId: string | number,
  updatedRows: TableRowData[],
  allPosts: any[]
): Promise<boolean> {
  if (!originPostId || !updatedRows || updatedRows.length === 0) return false;

  const originPost = allPosts.find(p => String(p.id) === String(originPostId));
  if (!originPost || !originPost.content) return false;

  const parsed = parseTableFromMarkdown(originPost.content);
  if (!parsed || parsed.rows.length === 0) return false;

  const todayStr = getTodayDDMMYYYY();
  const nowIso = new Date().toISOString();
  let hasChanges = false;

  // Separate parent rows from child subtask rows
  const parentRows = updatedRows.filter(r => !isSubItemRow(r));
  const childSubRows = updatedRows.filter(r => isSubItemRow(r));

  // Helper to extract clean title
  const getCleanTitle = (title: string): string => {
    return cleanFrontEndText(
      String(title || '')
        .replace(/^[↳↪\s]+/, '')
        .replace(/^\[[ xX]\]\s*/, '')
        .trim()
    );
  };

  // Helper to find column key case-insensitively
  const findColKey = (row: TableRowData, ...candidates: string[]): string => {
    for (const cand of candidates) {
      const match = Object.keys(row).find(k => k.toLowerCase().trim() === cand.toLowerCase().trim());
      if (match) return match;
    }
    return candidates[0];
  };

  // 1. Process Parent Task updates
  for (const parent of parentRows) {
    const targetTitle = getCleanTitle(getTaskRowTitle(parent));
    let targetIdx = -1;

    // Try matching by origin index if available
    if (parent._originRowIndex !== undefined && parent._originRowIndex !== '') {
      const candIdx = Number(parent._originRowIndex);
      if (!isNaN(candIdx) && parsed.rows[candIdx]) {
        const candTitle = getCleanTitle(getTaskRowTitle(parsed.rows[candIdx]));
        if (candTitle.toLowerCase() === targetTitle.toLowerCase()) {
          targetIdx = candIdx;
        }
      }
    }

    // Match by ID if set
    if (targetIdx === -1 && parent.id) {
      targetIdx = parsed.rows.findIndex(r => r.id === parent.id);
    }

    // Match by title
    if (targetIdx === -1) {
      targetIdx = parsed.rows.findIndex(r => {
        if (isSubItemRow(r)) return false;
        const rTitle = getCleanTitle(getTaskRowTitle(r));
        return rTitle.toLowerCase() === targetTitle.toLowerCase();
      });
    }

    if (targetIdx !== -1) {
      const rowToUpdate = parsed.rows[targetIdx];
      const ketKey = findColKey(rowToUpdate, 'Keterangan', 'Uraian');
      const statusKey = findColKey(rowToUpdate, 'Status');
      const picKey = findColKey(rowToUpdate, 'PIC');
      const dateKey = findColKey(rowToUpdate, 'Tanggal Selesai', 'Tanggal selesai', 'Completed');
      const dueKey = findColKey(rowToUpdate, 'Due Date', 'due date', 'Deadline', 'Target Selesai');
      const priorityKey = findColKey(rowToUpdate, 'Priority', 'Prioritas');

      // Preserve origin checklists if origin row had checklist in Keterangan
      if (parent.Keterangan !== undefined) {
        const origKet = String(rowToUpdate[ketKey] || '');
        if (origKet.includes('- [ ]') || origKet.includes('- [x]') || origKet.includes('- [X]')) {
          // Keep existing checklists, do not overwrite with stripped Keterangan
        } else {
          rowToUpdate[ketKey] = parent.Keterangan;
        }
      }
      if (parent.Status !== undefined) rowToUpdate[statusKey] = parent.Status;
      if (parent.PIC !== undefined) rowToUpdate[picKey] = parent.PIC;
      if (parent['Tanggal Selesai'] !== undefined) rowToUpdate[dateKey] = formatToDDMMYYYY(parent['Tanggal Selesai']);
      if (parent['Due Date'] !== undefined) rowToUpdate[dueKey] = formatToDDMMYYYY(parent['Due Date']);
      if (parent.Priority !== undefined) rowToUpdate[priorityKey] = parent.Priority;
      rowToUpdate['Last Modified'] = nowIso;
      hasChanges = true;
    }
  }

  // 2. Process Child Subtask updates & insertions
  for (const sub of childSubRows) {
    const rawSubTitle = getTaskRowTitle(sub);
    const cleanSubTitle = getCleanTitle(rawSubTitle);
    if (!cleanSubTitle) continue;

    const isSubCompleted = 
      sub.isCompleted === 'true' || 
      (sub as any).isCompleted === true ||
      sub.Status === 'Closed' || 
      sub.Status === 'Selesai' || 
      rawSubTitle.includes('[x]') || 
      rawSubTitle.includes('[X]');

    const subTitleWithPrefix = `↳ [${isSubCompleted ? 'x' : ' '}] ${cleanSubTitle}`;

    // Determine parent title / reference
    const parentRefTitle = getCleanTitle(
      sub._parentTitle || 
      sub.parentTitle || 
      (parentRows.length === 1 ? getTaskRowTitle(parentRows[0]) : '')
    );
    const parentRefId = sub.parentId || sub.parentRowId || '';

    // Check if subtask already exists in parsed.rows
    let existingSubIdx = -1;
    if (sub.id) {
      existingSubIdx = parsed.rows.findIndex(r => r.id === sub.id);
    }
    if (existingSubIdx === -1) {
      existingSubIdx = parsed.rows.findIndex(r => {
        if (!isSubItemRow(r)) return false;
        const candClean = getCleanTitle(getTaskRowTitle(r));
        return candClean.toLowerCase() === cleanSubTitle.toLowerCase();
      });
    }

    if (existingSubIdx !== -1) {
      // Subtask exists: update it
      const targetSub = parsed.rows[existingSubIdx];
      const titleKey = findColKey(targetSub, 'Activity Name', 'Activity', 'Jenis kegiatan', 'Jenis Kegiatan', 'Name', 'Judul');
      const statusKey = findColKey(targetSub, 'Status');
      const dateKey = findColKey(targetSub, 'Tanggal Selesai', 'Tanggal selesai', 'Completed');
      const picKey = findColKey(targetSub, 'PIC');
      const priorityKey = findColKey(targetSub, 'Priority', 'Prioritas');
      const dueKey = findColKey(targetSub, 'Due Date', 'due date', 'Deadline');

      targetSub[titleKey] = subTitleWithPrefix;
      targetSub[statusKey] = isSubCompleted ? 'Closed' : 'Open';
      targetSub.isCompleted = isSubCompleted ? 'true' : 'false';
      if (sub.PIC !== undefined && sub.PIC !== '') targetSub[picKey] = sub.PIC;
      if (sub.Priority !== undefined && sub.Priority !== '') targetSub[priorityKey] = sub.Priority;
      if (sub['Tanggal Selesai'] && sub['Tanggal Selesai'] !== '-') {
        targetSub[dateKey] = formatToDDMMYYYY(sub['Tanggal Selesai']);
      } else if (isSubCompleted) {
        targetSub[dateKey] = todayStr;
      } else {
        targetSub[dateKey] = '-';
      }
      if (sub['Due Date']) targetSub[dueKey] = formatToDDMMYYYY(sub['Due Date']);
      targetSub['Last Modified'] = nowIso;

      // ALSO update parent checklist in Keterangan if present in origin parent
      if (parentRefTitle) {
        const pIdx = parsed.rows.findIndex(r => {
          if (isSubItemRow(r)) return false;
          const rClean = getCleanTitle(r['Jenis kegiatan'] || r['Jenis Kegiatan'] || r.Name || r.Judul || '');
          return rClean.toLowerCase() === parentRefTitle.toLowerCase() ||
            (parentRefTitle.length > 5 && (rClean.toLowerCase().includes(parentRefTitle.toLowerCase()) || parentRefTitle.toLowerCase().includes(rClean.toLowerCase())));
        });
        if (pIdx !== -1) {
          const parentRowInOrigin = parsed.rows[pIdx];
          const ketKey = findColKey(parentRowInOrigin, 'Keterangan', 'Uraian');
          if (parentRowInOrigin[ketKey]) {
            const lines = String(parentRowInOrigin[ketKey]).split('\n');
            const updatedLines = lines.map(line => {
              if (cleanFrontEndText(line).toLowerCase().includes(cleanSubTitle.toLowerCase())) {
                return line.replace(/^([*-•]?\s*\[)[ xX](\])/, `$1${isSubCompleted ? 'x' : ' '}$2`);
              }
              return line;
            });
            parentRowInOrigin[ketKey] = updatedLines.join('\n');
          }
        }
      }

      hasChanges = true;
    } else {
      // Subtask DOES NOT exist in origin post yet: INSERT IT!
      // Find parent row in origin table
      let originParentIdx = -1;
      if (parentRefId) {
        originParentIdx = parsed.rows.findIndex(r => r.id === parentRefId);
      }
      if (originParentIdx === -1 && parentRefTitle) {
        originParentIdx = parsed.rows.findIndex(r => {
          if (isSubItemRow(r)) return false;
          const rClean = getCleanTitle(getTaskRowTitle(r));
          return rClean.toLowerCase() === parentRefTitle.toLowerCase() ||
            (parentRefTitle.length > 5 && (rClean.toLowerCase().includes(parentRefTitle.toLowerCase()) || parentRefTitle.toLowerCase().includes(rClean.toLowerCase())));
        });
      }
      if (originParentIdx === -1 && sub._originRowIndex !== undefined && sub._originRowIndex !== '') {
        const candIdx = Number(sub._originRowIndex);
        if (!isNaN(candIdx) && parsed.rows[candIdx]) {
          originParentIdx = candIdx;
        }
      }

      // If parent found, insert right after the last subtask of this parent
      let insertIdx = parsed.rows.length;
      if (originParentIdx !== -1) {
        insertIdx = originParentIdx + 1;
        while (insertIdx < parsed.rows.length && isSubItemRow(parsed.rows[insertIdx])) {
          insertIdx++;
        }
      }

      // Construct origin child row conforming to origin headers
      const parentRowInOrigin = originParentIdx !== -1 ? parsed.rows[originParentIdx] : null;
      const newOriginSubRow: TableRowData = { number: '' };

      parsed.headers.forEach(h => {
        const hLower = h.toLowerCase().trim();
        const isTitle = (!hLower.includes('routine') && !hLower.includes('rutin')) && (
          hLower.includes('activity name') || hLower === 'activity' || hLower.includes('jenis kegiatan') || 
          hLower === 'task' || hLower === 'judul' || hLower === 'name' || hLower === 'nama' || hLower === 'title' || hLower.includes('kegiatan')
        );
        if (isTitle) {
          newOriginSubRow[h] = subTitleWithPrefix;
        } else if (hLower === 'status') {
          newOriginSubRow[h] = isSubCompleted ? 'Closed' : 'Open';
        } else if (hLower === 'pic') {
          newOriginSubRow[h] = sub.PIC || (parentRowInOrigin ? parentRowInOrigin.PIC : '') || '';
        } else if (hLower === 'priority') {
          newOriginSubRow[h] = sub.Priority || (parentRowInOrigin ? parentRowInOrigin.Priority : 'Normal') || 'Normal';
        } else if (hLower.includes('target') || hLower.includes('due date') || hLower.includes('deadline')) {
          newOriginSubRow[h] = formatToDDMMYYYY(sub['Due Date']) || (parentRowInOrigin ? formatToDDMMYYYY(parentRowInOrigin['Due Date']) : '-') || '-';
        } else if (hLower.includes('selesai') || hLower === 'completed') {
          newOriginSubRow[h] = formatToDDMMYYYY(sub['Tanggal Selesai']) || (isSubCompleted ? todayStr : '-');
        } else if (hLower.includes('keterangan') || hLower.includes('uraian')) {
          newOriginSubRow[h] = sub.Keterangan || '-';
        } else if (hLower.includes('created') || hLower.includes('tanggal')) {
          newOriginSubRow[h] = formatToDDMMYYYY(sub['Created Time'] || sub['Created time']) || todayStr;
        } else if (hLower.includes('activity') && !hLower.includes('name')) {
          newOriginSubRow[h] = parentRowInOrigin ? (parentRowInOrigin['Activity (routine/non routine)'] || parentRowInOrigin['Activity'] || 'Routine') : 'Routine';
        } else if (hLower === 'period') {
          newOriginSubRow[h] = parentRowInOrigin ? (parentRowInOrigin.period || 'Daily') : 'Daily';
        } else if (hLower.includes('asal') && hLower.includes('halaman')) {
          newOriginSubRow[h] = originPost.title || '';
        } else {
          newOriginSubRow[h] = sub[h] || '';
        }
      });

      const parentActualId = parentRowInOrigin ? (parentRowInOrigin.id || parentRefId) : parentRefId;
      newOriginSubRow.id = sub.id || `sub_${parentActualId || Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      if (parentActualId) {
        newOriginSubRow.parentId = parentActualId;
        newOriginSubRow.parentRowId = parentActualId;
      }
      newOriginSubRow.isSubItem = 'true';
      newOriginSubRow.isCompleted = isSubCompleted ? 'true' : 'false';
      newOriginSubRow['Last Modified'] = nowIso;

      // If origin task has checklist in Keterangan matching subtask title, update its [x] / [ ] or append if missing
      if (parentRowInOrigin) {
        const ketKey = findColKey(parentRowInOrigin, 'Keterangan', 'Uraian');
        const origKet = String(parentRowInOrigin[ketKey] || '');
        if (origKet && origKet !== '-' && (origKet.includes('- [ ]') || origKet.includes('- [x]'))) {
          if (origKet.toLowerCase().includes(cleanSubTitle.toLowerCase())) {
            const lines = origKet.split('\n');
            const updatedLines = lines.map(line => {
              if (cleanFrontEndText(line).toLowerCase().includes(cleanSubTitle.toLowerCase())) {
                return line.replace(/^([*-•]?\s*\[)[ xX](\])/, `$1${isSubCompleted ? 'x' : ' '}$2`);
              }
              return line;
            });
            parentRowInOrigin[ketKey] = updatedLines.join('\n');
          } else {
            parentRowInOrigin[ketKey] = `${origKet.trim()}\n- [${isSubCompleted ? 'x' : ' '}] ${cleanSubTitle}`;
          }
        }
      }

      parsed.rows.splice(insertIdx, 0, newOriginSubRow);
      hasChanges = true;
    }
  }

  if (!hasChanges) return true;

  // Re-serialize origin post table with preservation of id and parentId metadata tags
  const lines = originPost.content.split('\n');
  let headerIdx = -1;
  let separatorIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (headerIdx === -1) headerIdx = i;
      else if (separatorIdx === -1 && line.includes('---')) {
        separatorIdx = i;
        break;
      }
    }
  }

  if (headerIdx === -1 || separatorIdx === -1) return false;

  const headerLine = lines[headerIdx];
  const separatorLine = lines[separatorIdx];
  const beforeLines = lines.slice(0, headerIdx);
  
  // Find where table ends accurately
  let lastTableLineIdx = separatorIdx;
  for (let i = separatorIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('|')) {
      lastTableLineIdx = i;
    } else if (!trimmed) {
      const nextTableLine = lines.slice(i + 1).findIndex(l => l.trim().startsWith('|'));
      if (nextTableLine === -1) {
        break;
      }
    } else if (trimmed.startsWith('#') || trimmed.startsWith('> ') || trimmed.startsWith('```')) {
      break;
    }
  }
  const afterLines = lines.slice(lastTableLineIdx + 1);

  const serializedRows = parsed.rows.map(r => {
    const cells = parsed.headers.map(h => {
      let val = r[h] !== undefined ? String(r[h]) : '';
      const hLower = h.toLowerCase().trim();
      const isTitleCol = (!hLower.includes('routine') && !hLower.includes('rutin')) && (
        hLower.includes('activity name') || hLower === 'activity' || hLower.includes('jenis kegiatan') || 
        hLower === 'task' || hLower === 'judul' || hLower === 'name' || hLower === 'nama' || hLower === 'title' || hLower.includes('kegiatan')
      );
      if (isTitleCol && val) {
        const taskId = r.id || (r as any)._id;
        const parentId = r.parentId || r.parentRowId;
        const lastMod = r['Last Modified'] || r['Date Modified'];
        let metaTags = '';
        if (taskId && !val.includes('<!--task-id:')) {
          metaTags += ` <!--task-id:${taskId}-->`;
        }
        if (parentId && !val.includes('<!--parent-id:')) {
          metaTags += ` <!--parent-id:${parentId}-->`;
        }
        if (lastMod && !val.includes('<!--last-modified:')) {
          metaTags += ` <!--last-modified:${lastMod}-->`;
        }
        if (metaTags) {
          val = `${val.trim()}${metaTags}`;
        }
      }
      return val.replace(/\|/g, '\\|').replace(/\n/g, '<br/>').trim();
    });
    return `| ${cells.join(' | ')} |`;
  });

  const newContent = [
    ...beforeLines,
    headerLine,
    separatorLine,
    ...serializedRows,
    ...afterLines
  ].join('\n');

  try {
    const res = await fetch(`/api/bulletin/${originPostId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newContent })
    });
    if (res.ok) {
      originPost.content = newContent;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('preplab:post-updated', {
          detail: { postId: originPostId, content: newContent }
        }));
      }
      console.log(`[Logbook Sync] Successfully synced batch of ${updatedRows.length} row(s) to origin post #${originPostId}`);
      return true;
    }
  } catch (err) {
    console.error(`[Logbook Sync] Failed to sync batch back to post #${originPostId}:`, err);
  }

  return false;
}

/**
 * Synchronizes an updated Logbook row directly back to its origin post.
 */
export async function syncLogbookRowBackToOrigin(
  updatedRow: TableRowData,
  allPosts: any[]
): Promise<boolean> {
  const originPostId = updatedRow._originPostId;
  if (!originPostId) return false;
  return syncLogbookRowsGroupToOrigin(originPostId, [updatedRow], allPosts);
}

/**
 * Scans all section posts to produce smart recommendations for today's planning:
 * - Routine jobs (Daily that haven't been completed today, Weekly that haven't been completed this week, etc.)
 * - Non-routine jobs (Status is not closed)
 */
export function getSectionActiveRecommendations(
  sectionName: string,
  allPosts: any[],
  targetUniverse: string = 'TBP',
  alreadyPlannedTitles: string[] = []
): TaskRecommendation[] {
  const matchingPosts = findSectionTaskPosts(sectionName, allPosts, targetUniverse);
  const recommendations: TaskRecommendation[] = [];
  const plannedSet = new Set(alreadyPlannedTitles.map(t => t.toLowerCase().trim()));
  const seenKeys = new Set<string>();
  const todayStr = getTodayDDMMYYYY();

  matchingPosts.forEach(post => {
    const postTitle = post.title || '';
    const isNonRoutine = postTitle.toLowerCase().includes('non routine') || postTitle.toLowerCase().includes('non-routine');
    let defaultCadence = 'Daily';
    const ptLow = postTitle.toLowerCase();
    if (ptLow.includes('daily')) defaultCadence = 'Daily';
    else if (ptLow.includes('weekly')) defaultCadence = 'Weekly';
    else if (ptLow.includes('monthly')) defaultCadence = 'Monthly';
    else if (ptLow.includes('quarterly')) defaultCadence = 'Quarterly';
    else if (ptLow.includes('biannual')) defaultCadence = 'Biannual';
    else if (ptLow.includes('yearly')) defaultCadence = 'Yearly';
    else if (isNonRoutine) defaultCadence = 'Non-Routine';

    const parsed = parseTableFromMarkdown(post.content || '');
    if (!parsed || !parsed.rows) return;

    parsed.rows.forEach((row, idx) => {
      // Must be active (not closed or completed in origin)
      if (!isRowActive(row)) return;

      // 🛑 CRITICAL ENTERPRISE FIX: Skip subtask rows so they NEVER leak as top-level task recommendations!
      if (isSubItemRow(row)) return;

      const rawTitle = getTaskRowTitle(row);
      if (!rawTitle) return;

      // Clean title from any internal HTML comments
      const title = cleanFrontEndText(rawTitle);
      if (!title) return;

      // Check if already completed today
      const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('selesai') || k.toLowerCase() === 'completed');
      const dateVal = dateKey ? formatToDDMMYYYY(row[dateKey]) : '';
      if (dateVal === todayStr) {
        // Already completed today, skip from today's recommendation
        return;
      }

      const dedupKey = `${title.toLowerCase()}_${String(row.PIC || row.pic || '').toLowerCase()}`;
      if (seenKeys.has(dedupKey)) return;
      seenKeys.add(dedupKey);

      const isPlanned = plannedSet.has(title.toLowerCase());
      const recId = `rec_${post.id}_${idx}_${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;

      // Check if pinned in Labnote
      const isPinned = row.isPinned === 'true' || 
        (row as any)._pinned === 'true' || 
        JSON.stringify(row).includes('<!--pin') || 
        JSON.stringify(row).includes('<!pin');

      // Extract subtasks belonging to this parent task
      const subtasks: { id: string; text: string; checked: boolean }[] = [];
      const seenSubTexts = new Set<string>();

      // 1. From row.Keterangan (markdown checklists: - [ ] or - [x])
      const ketStr = String(row.Keterangan || row.keterangan || row.uraian || '');
      const checklistMatches = ketStr.matchAll(/- \[([ xX])\]\s*([^\n\r]+)/g);
      for (const match of checklistMatches) {
        const isChecked = match[1].toLowerCase() === 'x';
        const itemText = cleanFrontEndText(match[2].trim());
        if (itemText && !seenSubTexts.has(itemText.toLowerCase())) {
          seenSubTexts.add(itemText.toLowerCase());
          subtasks.push({
            id: `sub_${subtasks.length + 1}`,
            text: itemText,
            checked: isChecked,
          });
        }
      }

      // 2. From subsequent sub-item rows belonging to this parent row in source table
      for (let j = idx + 1; j < parsed.rows.length; j++) {
        const nextR = parsed.rows[j];
        if (!isSubItemRow(nextR)) break; // Stop when hitting next parent task
        const nextTitle = getTaskRowTitle(nextR);
        const cleanSubTitle = cleanFrontEndText(nextTitle.replace(/^[↳↪]\s*/, '').replace(/\[[ xX]\]\s*/, '').trim());
        const isSubDone = nextR.Status === 'Closed' || nextR.Status === 'Selesai' || nextR.isCompleted === 'true' || nextTitle.includes('[x]');

        if (cleanSubTitle && !seenSubTexts.has(cleanSubTitle.toLowerCase())) {
          seenSubTexts.add(cleanSubTitle.toLowerCase());
          subtasks.push({
            id: `sub_${subtasks.length + 1}`,
            text: cleanSubTitle,
            checked: isSubDone,
          });
        }
      }

      const activeSubtasks = subtasks.filter(s => !s.checked);
      const closedSubtasks = subtasks.filter(s => s.checked);

      // Clean description: strip any checklist lines (which are now extracted into subtasks) and HTML comments
      const nonChecklistLines = ketStr
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => {
          if (!l) return false;
          // Filter out markdown/bullet checklist lines (- [ ], • [x], etc.)
          if (/^[-*•]?\s*\[[ xX]\]/i.test(l)) return false;
          // Filter out legacy done/open tags
          if (/\*\*\(?(Done|Closed|Selesai|Open|OP)\)?\*\*/i.test(l)) return false;
          return true;
        });

      let cleanDescription = cleanFrontEndText(nonChecklistLines.join('\n'));
      if (cleanDescription === '-' || cleanDescription === '•' || cleanDescription === '---') {
        cleanDescription = '';
      }

      // Determine cadence & routine / non-routine from row or post
      let rowCadence = defaultCadence;
      const actVal = String(row['Activity (routine/non routine)'] || row.Aktivitas || row.aktivitas || '').trim();
      const perVal = String(row.period || row.Period || '').trim();

      const isRowNonRoutine = isNonRoutine || 
        actVal.toLowerCase().includes('non') || 
        perVal.toLowerCase().includes('non');

      if (!isRowNonRoutine) {
        const combined = `${actVal} ${perVal} ${defaultCadence}`.toLowerCase();
        if (combined.includes('weekly') || combined.includes('mingguan')) rowCadence = 'Weekly';
        else if (combined.includes('monthly') || combined.includes('bulanan')) rowCadence = 'Monthly';
        else if (combined.includes('quarterly') || combined.includes('triwulan')) rowCadence = 'Quarterly';
        else if (combined.includes('biannual') || combined.includes('semester')) rowCadence = 'Biannual';
        else if (combined.includes('yearly') || combined.includes('tahunan')) rowCadence = 'Yearly';
        else if (combined.includes('daily') || combined.includes('harian')) rowCadence = 'Daily';
        else rowCadence = defaultCadence || 'Daily';
      } else {
        rowCadence = 'Non-Routine';
      }

      recommendations.push({
        id: recId,
        title,
        description: cleanDescription,
        pic: String(row.PIC || row.pic || ''),
        priority: String(row.Priority || row.priority || 'Normal'),
        type: isRowNonRoutine ? 'Non-Routine' : 'Routine',
        cadence: rowCadence,
        originPostId: post.id,
        originPostTitle: postTitle,
        originRowIndex: idx,
        rawRow: row,
        isAlreadyPlanned: isPlanned,
        isPinned,
        subtasks,
        activeSubtaskCount: activeSubtasks.length,
        closedSubtaskCount: closedSubtasks.length,
      });
    });
  });

  const priorityWeight: Record<string, number> = {
    urgent: 4,
    high: 3,
    normal: 2,
    low: 1
  };

  recommendations.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    const wA = priorityWeight[(a.priority || '').toLowerCase()] || 2;
    const wB = priorityWeight[(b.priority || '').toLowerCase()] || 2;
    return wB - wA;
  });

  return recommendations;
}

/**
 * Parses today's planning and yesterday's progress from a Section Logbook post.
 * Rule: Today's plan is automatically blank / clean unless saved for today's date!
 */
export function parseSectionLogbookData(
  postContent: string,
  sectionName: string,
  allPosts: any[] = [],
  targetUniverse: string = 'TBP'
): {
  planDate: string;
  todayRows: TableRowData[];
  yesterdayRows: TableRowData[];
  isTodayFresh: boolean;
} {
  const todayStr = getTodayDDMMYYYY();
  const yesterdayStr = getYesterdayDDMMYYYY();

  let planDate = '';
  const dateMatch = (postContent || '').match(/<!--\s*PLANNING_DATE:\s*([^\s>]+)\s*-->/i);
  if (dateMatch) {
    planDate = dateMatch[1].trim();
  }

  // Check if saved planning is from today
  const isTodayFresh = planDate === todayStr;

  let todayRows: TableRowData[] = [];
  let yesterdayRows: TableRowData[] = [];

  if (postContent && postContent.includes('|')) {
    // Split sections if multi-table markdown exists
    const parts = postContent.split(/(?=###\s+)/i);
    for (const part of parts) {
      const partLower = part.toLowerCase();
      const parsed = parseTableFromMarkdown(part);
      if (!parsed || parsed.rows.length === 0) continue;

      if (partLower.includes('planning') || partLower.includes('hari ini')) {
        if (isTodayFresh) {
          todayRows = parsed.rows;
        }
      } else if (partLower.includes('kemarin') || partLower.includes('progress kemarin')) {
        yesterdayRows = parsed.rows;
      }
    }

    // Fallback: If only 1 table exists and planDate is today
    if (todayRows.length === 0 && isTodayFresh) {
      const parsed = parseTableFromMarkdown(postContent);
      if (parsed) todayRows = parsed.rows;
    }
  }

  // If yesterdayRows is empty, automatically build yesterday's progress recap!
  if (yesterdayRows.length === 0 && allPosts.length > 0) {
    yesterdayRows = aggregateYesterdayProgress(sectionName, allPosts, targetUniverse);
  }

  // Format all dates in rows to DD-MM-YYYY
  [...todayRows, ...yesterdayRows].forEach(r => {
    Object.keys(r).forEach(k => {
      const kl = k.toLowerCase();
      if (kl.includes('tanggal') || kl.includes('created') || kl.includes('selesai') || kl.includes('date')) {
        r[k] = formatToDDMMYYYY(r[k]);
      }
    });
  });

  return {
    planDate: isTodayFresh ? planDate : todayStr,
    todayRows,
    yesterdayRows,
    isTodayFresh
  };
}

/**
 * Aggregates yesterday's progress from origin section posts.
 */
export function aggregateYesterdayProgress(
  sectionName: string,
  allPosts: any[],
  targetUniverse: string = 'TBP'
): TableRowData[] {
  const matchingPosts = findSectionTaskPosts(sectionName, allPosts, targetUniverse);
  const yesterdayTasks: TableRowData[] = [];
  const yesterdayStr = getYesterdayDDMMYYYY();
  const seenKeys = new Set<string>();

  matchingPosts.forEach(post => {
    const parsed = parseTableFromMarkdown(post.content || '');
    if (!parsed || !parsed.rows) return;

    parsed.rows.forEach((row, idx) => {
      const titleKey = Object.keys(row).find(k => k.toLowerCase().includes('kegiatan') || k.toLowerCase() === 'title');
      const title = titleKey ? String(row[titleKey] || '').trim() : '';
      if (!title) return;

      const dateKey = Object.keys(row).find(k => k.toLowerCase().includes('selesai') || k.toLowerCase() === 'completed');
      const dateVal = dateKey ? formatToDDMMYYYY(row[dateKey]) : '';

      // Check if finished yesterday OR had recent activity
      const isFinishedYesterday = dateVal === yesterdayStr;
      const wasActive = isRowActive(row);

      if (isFinishedYesterday || wasActive) {
        const dedupKey = `${title.toLowerCase()}_${String(row.PIC || '').toLowerCase()}`;
        if (seenKeys.has(dedupKey)) return;
        seenKeys.add(dedupKey);

        const postTitle = post.title || '';
        const isNonRoutine = postTitle.toLowerCase().includes('non routine') || postTitle.toLowerCase().includes('non-routine');
        const defaultActivity = isNonRoutine ? 'Non-Routine' : 'Routine';
        const defaultPeriod = isNonRoutine ? 'Non-Routine' : 'Daily';

        const normalized: TableRowData = {
          number: String(yesterdayTasks.length + 1),
          'Jenis kegiatan': title,
          Keterangan: String(row.Keterangan || row.keterangan || ''),
          'Created Time': formatToDDMMYYYY(row['Created Time'] || row['Created time'] || yesterdayStr),
          'Tanggal Selesai': dateVal || (isFinishedYesterday ? yesterdayStr : '-'),
          Status: isFinishedYesterday ? 'Closed' : (row.Status || 'Open'),
          PIC: String(row.PIC || row.pic || ''),
          Priority: String(row.Priority || 'Normal'),
          'Activity (routine/non routine)': String(row['Activity (routine/non routine)'] || defaultActivity),
          period: String(row.period || defaultPeriod),
          'Asal Halaman': post.title || sectionName,
          _originPostId: String(post.id),
          _originRowIndex: String(idx)
        };
        yesterdayTasks.push(normalized);
      }
    });
  });

  return yesterdayTasks;
}

/**
 * Serializes today's planning and yesterday's progress into logbook markdown content.
 */
export function serializeSectionLogbookContent(
  todayRows: TableRowData[],
  yesterdayRows: TableRowData[],
  sectionName: string,
  planDate: string = getTodayDDMMYYYY()
): string {
  const formatTable = (rows: TableRowData[], title: string) => {
    let md = `### ${title}\n\n`;
    if (rows.length === 0) {
      md += `*Nihil kegiatan terdaftar.*\n\n`;
      return md;
    }
    const headers = LOGBOOK_CANONICAL_HEADERS;
    md += `| ${headers.join(' | ')} |\n`;
    md += `| ${headers.map(() => '---').join(' | ')} |\n`;
    rows.forEach((r, idx) => {
      const cells = headers.map(h => {
        if (h === 'number') return String(idx + 1);
        let val = r[h] !== undefined ? String(r[h]) : '';
        val = val.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br/>');
        return val;
      });
      md += `| ${cells.join(' | ')} |\n`;
    });
    md += '\n';
    return md;
  };

  const yesterdayDate = getYesterdayDDMMYYYY();
  return `# Logbook ${sectionName}\n\n<!-- PLANNING_DATE: ${planDate} -->\n*Logbook Terpadu Seksi ${sectionName} terbagi atas Planning Kerja Hari Ini dan Evaluasi Progress Kemarin.*\n\n` +
    formatTable(todayRows, `Planning Kerja Hari Ini (${planDate})`) +
    formatTable(yesterdayRows, `Progress yang Dikerjakan Kemarin (${yesterdayDate})`);
}

/**
 * Metadata stored in HTML comment block for Section Logbook.
 */
export interface LogbookMeta {
  generalNotes: Record<string, string>; // dateStr ('DD-MM-YYYY') -> notes
}

export function extractLogbookMeta(content: string): { meta: LogbookMeta; cleanContent: string } {
  if (!content) return { meta: { generalNotes: {} }, cleanContent: '' };
  const match = content.match(/<!--\s*LOGBOOK_META:\s*([\s\S]*?)\s*-->/);
  if (match) {
    try {
      const meta = JSON.parse(match[1]);
      const cleanContent = content.replace(/<!--\s*LOGBOOK_META:\s*[\s\S]*?\s*-->/, '').trim();
      return { meta: { generalNotes: meta?.generalNotes || {} }, cleanContent };
    } catch {
      // fallback
    }
  }
  return { meta: { generalNotes: {} }, cleanContent: content };
}

export function injectLogbookMeta(content: string, meta: LogbookMeta): string {
  const clean = content.replace(/<!--\s*LOGBOOK_META:\s*[\s\S]*?\s*-->/, '').trim();
  const metaStr = `<!-- LOGBOOK_META:\n${JSON.stringify(meta, null, 2)}\n-->`;
  return `${metaStr}\n\n${clean}`;
}

/**
 * Normalizes date from row into DD-MM-YYYY format.
 */
export function getRowDateDDMMYYYY(row: TableRowData): string {
  if (!row) return '';
  const d = String(
    row['Created Time'] ||
    row['Created time'] ||
    row['Tanggal Kerja'] ||
    row['Tanggal kerja'] ||
    row['Tanggal'] ||
    row.date ||
    ''
  ).trim();
  if (!d) return '';
  return formatToDDMMYYYY(d);
}

/**
 * Returns the most recent date before today that has recorded rows.
 */
export function getYesterdayDateWithData(allRows: TableRowData[], todayStr: string = getTodayDDMMYYYY()): string {
  const dates = new Set<string>();
  allRows.forEach(r => {
    const d = getRowDateDDMMYYYY(r);
    if (d && d !== todayStr) {
      dates.add(d);
    }
  });

  if (dates.size === 0) {
    return getYesterdayDDMMYYYY();
  }

  // Parse and sort dates descending
  const sortedDates = Array.from(dates).sort((a, b) => {
    const parse = (s: string) => {
      const parts = s.split('-').map(Number);
      if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
      return 0;
    };
    return parse(b) - parse(a);
  });

  return sortedDates[0] || getYesterdayDDMMYYYY();
}

/**
 * Returns a list of all distinct dates (DD-MM-YYYY) present in the table, sorted descending.
 */
export function getAvailableLogbookDates(allRows: TableRowData[]): string[] {
  const dates = new Set<string>();
  allRows.forEach(r => {
    const d = getRowDateDDMMYYYY(r);
    if (d) dates.add(d);
  });
  const parse = (s: string) => {
    const parts = s.split('-').map(Number);
    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    return 0;
  };
  return Array.from(dates).sort((a, b) => parse(b) - parse(a));
}

export interface ChangelogItem {
  id: string;
  title: string;
  pic: string;
  priority: string;
  status: string;
  notes: string;
  isClosed: boolean;
  progressPercent: number;
  totalSubtasks: number;
  completedSubtasks: number;
  subtasks: Array<{
    title: string;
    completed: boolean;
    completedDate?: string;
  }>;
  rawRow: TableRowData;
}

/**
 * Builds the Changelog report dataset from rows for a specific date (usually yesterday).
 */
export function buildLogbookChangelogData(
  allRows: TableRowData[],
  targetDateStr?: string
): {
  dateStr: string;
  totalTasks: number;
  completedCount: number;
  inProgressCount: number;
  completionRate: number;
  closedTasks: ChangelogItem[];
  inProgressTasks: ChangelogItem[];
} {
  const todayStr = getTodayDDMMYYYY();
  const dateStr = targetDateStr || getYesterdayDateWithData(allRows, todayStr);

  const parseDDMM = (s: string) => {
    const parts = s.split('-').map(Number);
    if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    return 0;
  };

  const isTargetFuture = parseDDMM(dateStr) > parseDDMM(todayStr);

  // Filter rows belonging to target date
  const dateRows = allRows.filter(r => {
    if (isSubItemRow(r)) return false;
    const createdDate = getRowDateDDMMYYYY(r);
    const completedDate = formatToDDMMYYYY(
      r['Tanggal Selesai'] || r['Tanggal selesai'] || r.completed || r['Aktual Selesai'] || ''
    );
    const isCompleted = r.Status === 'Closed' || r.Status === 'Selesai' || (r as any).isCompleted === 'true';

    if (isTargetFuture) {
      // Future / Tomorrow date: Show handover (completed today) and ongoing carry-over
      if (completedDate === todayStr) return true;
      if (!isCompleted) return true;
      return false;
    }

    if (dateStr === todayStr) {
      // Today: Show all tasks active today or completed today
      return true;
    }

    // Past date (e.g. yesterday):
    if (completedDate === dateStr) return true;
    if (createdDate === dateStr) return true;
    return false;
  });

  // Extract main rows and subtasks
  const mainItems: ChangelogItem[] = [];

  // Helper to check if row is a subtask
  const isSubtaskRow = (r: TableRowData): boolean => {
    return isSubItemRow(r);
  };

  // Group subtasks with parents
  dateRows.forEach((row, idx) => {
    if (isSubtaskRow(row)) return;

    const titleKey = Object.keys(row).find(k => k.toLowerCase().includes('kegiatan') || k.toLowerCase() === 'title');
    const rawTitle = titleKey ? String(row[titleKey] || '').trim() : '';
    if (!rawTitle) return;
    const title = cleanFrontEndText(rawTitle);
    if (!title) return;

    const pic = String(row.PIC || row.pic || '').trim();
    const priority = String(row.Priority || row.priority || 'Normal').trim();
    const status = String(row.Status || row.status || 'Open').trim();
    const statusLower = status.toLowerCase();

    // Parse subtasks from Keterangan checklist or relational child rows
    const rawKeterangan = String(row.Keterangan || row.keterangan || '').trim();
    const subtasks: Array<{ title: string; completed: boolean; completedDate?: string }> = [];
    const notesLines: string[] = [];

    // 1. Split markdown lines in Keterangan
    rawKeterangan.split('\n').forEach(line => {
      const trimmed = line.trim();
      const checklistMatch = trimmed.match(/^[-*•]\s*\[([ xX])\]\s*(.*)$/);
      if (checklistMatch) {
        const isDone = checklistMatch[1].toLowerCase() === 'x';
        const stTitle = cleanFrontEndText(checklistMatch[2].trim());
        const dateInParen = stTitle.match(/\((\d{2}-\d{2}-\d{4})\)/);
        subtasks.push({
          completed: isDone,
          title: stTitle,
          completedDate: isDone ? (dateInParen ? dateInParen[1] : undefined) : undefined
        });
      } else if (trimmed) {
        notesLines.push(trimmed);
      }
    });

    // 2. Collect relational subtask child rows from allRows so cross-day/persisted subtasks are linked
    const parentCode = row.id || row.taskCode || row['Task ID'] || row['ID Task'] || row.number;
    const parentTitleClean = title.toLowerCase();

    allRows.forEach(child => {
      if (isSubtaskRow(child)) {
        const matchesParent = 
          (parentCode && (child.parentId === parentCode || child.parentRowId === parentCode)) ||
          (child._parentTitle && cleanFrontEndText(child._parentTitle).toLowerCase() === parentTitleClean) ||
          child._parentRowIndex === String(idx);

        if (matchesParent) {
          const childTitle = String(child['Jenis kegiatan'] || child['Jenis Kegiatan'] || child['Name'] || child['Judul'] || '').trim();
          const cleanChildTitle = cleanFrontEndText(childTitle.replace(/^[↳↪]\s*/, '').replace(/\[[ xX]\]\s*/, '').trim());
          const isDone = 
            child.Status === 'Closed' || 
            child.Status === 'Selesai' || 
            child.isCompleted === 'true' || 
            childTitle.includes('[x]') || 
            childTitle.includes('[X]');

          const childDoneDate = 
            child['Tanggal Selesai'] || 
            child['Tanggal selesai'] || 
            child['Completed Date'] || 
            child['Completed Time'] || 
            '';
          const cleanDoneDate = (childDoneDate && childDoneDate !== '-' && childDoneDate.toLowerCase() !== 'belum selesai') 
            ? formatToDDMMYYYY(childDoneDate) 
            : undefined;

          if (cleanChildTitle && !subtasks.some(s => s.title.toLowerCase() === cleanChildTitle.toLowerCase())) {
            subtasks.push({
              title: cleanChildTitle,
              completed: isDone,
              completedDate: isDone ? cleanDoneDate : undefined
            });
          }
        }
      }
    });

    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter(s => s.completed).length;

    // Check if task is closed
    const hasSubtasks = totalSubtasks > 0;
    const isClosed = statusLower === 'closed' || statusLower === 'selesai' || 
      (hasSubtasks && completedSubtasks === totalSubtasks);

    let progressPercent = 0;
    if (isClosed) {
      progressPercent = 100;
    } else if (hasSubtasks) {
      progressPercent = Math.round((completedSubtasks / totalSubtasks) * 100);
    } else if (statusLower === 'in progress' || statusLower === 'on progress') {
      progressPercent = 50;
    }

    const cleanNotes = cleanFrontEndText(notesLines.join('\n'));

    mainItems.push({
      id: String(row.id || idx),
      title,
      pic,
      priority,
      status: isClosed ? 'Closed' : (status || 'Open'),
      notes: cleanNotes,
      isClosed,
      progressPercent,
      totalSubtasks,
      completedSubtasks,
      subtasks,
      rawRow: row
    });
  });

  const closedTasks = mainItems.filter(i => i.isClosed);
  const inProgressTasks = mainItems.filter(i => !i.isClosed);
  const totalTasks = mainItems.length;
  const completedCount = closedTasks.length;
  const inProgressCount = inProgressTasks.length;
  const completionRate = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  return {
    dateStr,
    totalTasks,
    completedCount,
    inProgressCount,
    completionRate,
    closedTasks,
    inProgressTasks
  };
}

/**
 * Generates formatted WhatsApp text for executive changelog sharing.
 */
export function generateLogbookChangelogWhatsappText({
  sectionName,
  dateStr,
  generalNote,
  closedTasks,
  inProgressTasks,
  metrics
}: {
  sectionName: string;
  dateStr: string;
  generalNote?: string;
  closedTasks: ChangelogItem[];
  inProgressTasks: ChangelogItem[];
  metrics: { total: number; closed: number; inProgress: number; percentage: number };
}): string {
  let text = `📋 *[REPORT PROGRESS KEMARIN] - Seksi ${sectionName}*\n`;
  text += `📅 Tanggal: ${dateStr}\n`;
  text += `📊 Ringkasan: ${metrics.total} Rencana • ${metrics.closed} Selesai • ${metrics.inProgress} Berlanjut (${metrics.percentage}% Capaian)\n\n`;

  if (generalNote && generalNote.trim()) {
    text += `*📢 CATATAN UMUM & KEJADIAN KHUSUS:*\n`;
    generalNote.split('\n').forEach(line => {
      const clean = line.trim();
      if (clean) text += `• _${clean}_\n`;
    });
    text += `\n`;
  }

  text += `*✅ CLOSED (SELESAI):*\n`;
  if (closedTasks.length === 0) {
    text += `_(Tidak ada task yang closed)_\n`;
  } else {
    closedTasks.forEach(task => {
      text += `• *${task.title}*`;
      if (task.pic) text += ` — _(PIC: ${task.pic})_`;
      text += `\n`;

      if (task.subtasks.length > 0) {
        text += `  - Subtask (${task.completedSubtasks}/${task.totalSubtasks} Selesai [100%]):\n`;
        task.subtasks.forEach(st => {
          text += `    ✓ ${st.title} ${st.completedDate ? `_(Selesai: ${st.completedDate})_` : '_(Selesai)_'}\n`;
        });
      }

      if (task.notes && task.notes.trim()) {
        text += `  📝 _Catatan:_ ${task.notes.replace(/\n/g, ' ')}\n`;
      }
    });
  }
  text += `\n`;

  text += `*🔄 IN PROGRESS (SEDANG BERJALAN):*\n`;
  if (inProgressTasks.length === 0) {
    text += `_(Seluruh task berhasil dituntaskan 100%)_\n`;
  } else {
    inProgressTasks.forEach(task => {
      text += `• *${task.title}*`;
      if (task.pic) text += ` — _(PIC: ${task.pic})_`;
      text += ` [Progres: ${task.progressPercent}%]\n`;

      if (task.subtasks.length > 0) {
        text += `  - Subtask (${task.completedSubtasks}/${task.totalSubtasks} Selesai):\n`;
        task.subtasks.forEach(st => {
          if (st.completed) {
            text += `    ✓ ${st.title} ${st.completedDate ? `_(Selesai: ${st.completedDate})_` : '_(Selesai)_'}\n`;
          } else {
            text += `    ⏳ ${st.title} _(Sedang Berjalan)_\n`;
          }
        });
      }

      if (task.notes && task.notes.trim()) {
        text += `  📝 _Catatan:_ ${task.notes.replace(/\n/g, ' ')}\n`;
      }
    });
  }

  return text;
}

/**
 * Extracts pure logbook table data directly from post content.
 * Guarantees a clean slate (empty table) on initial load, so the user manually selects today's focus tasks.
 */
export function getLogbookTableData(
  logbookPost: any,
  sectionName: string
): {
  headers: string[];
  rows: TableRowData[];
  beforeText: string;
  afterText: string;
  rawTable: string;
} {
  const content = typeof logbookPost?.content === 'string' ? logbookPost.content : '';
  if (content && content.includes('|')) {
    const parsed = parseTableFromMarkdown(content);
    if (parsed && parsed.headers && parsed.headers.length > 0 && parsed.rows && parsed.rows.length > 0) {
      return {
        headers: parsed.headers.length > 0 ? parsed.headers : LOGBOOK_CANONICAL_HEADERS,
        rows: parsed.rows,
        beforeText: `> 📔 **Logbook Terpadu Seksi ${sectionName}**`,
        afterText: '',
        rawTable: ''
      };
    }
  }

  return {
    headers: LOGBOOK_CANONICAL_HEADERS,
    rows: [],
    beforeText: `> 📔 **Logbook Terpadu Seksi ${sectionName}**`,
    afterText: '',
    rawTable: ''
  };
}

/**
 * Resolves the numeric or string ID of the origin Labnote post for a given row.
 * Searches row metadata, 'Asal Halaman', and all section posts by title.
 */
export function resolveOriginPostId(
  row: TableRowData,
  allPosts: any[],
  sectionName?: string
): string | null {
  if (!row || !allPosts || allPosts.length === 0) return null;
  if (row._originPostId) return String(row._originPostId);

  // 1. Check 'Asal Halaman' or '_originPostTitle' column
  const asal = String(row['Asal Halaman'] || row._originPostTitle || '').trim().toLowerCase();
  if (asal) {
    // 1A. Exact match on post.title
    const exactMatch = allPosts.find(p => {
      const pTitle = (p.title || '').trim().toLowerCase();
      if (!pTitle) return false;
      const cleanPTitle = cleanFrontEndText(pTitle).toLowerCase();
      return pTitle === asal || cleanPTitle === asal;
    });
    if (exactMatch) return String(exactMatch.id);

    // 1B. Match within matching section posts if sectionName provided
    if (sectionName) {
      const secNorm = sectionName.toLowerCase().trim();
      const sectionPosts = allPosts.filter(p => {
        const pSec = (p.category || p.department || '').toLowerCase();
        const pTitle = (p.title || '').toLowerCase();
        return pSec.includes(secNorm) || pTitle.includes(secNorm);
      });
      const secMatch = sectionPosts.find(p => {
        const pTitle = (p.title || '').trim().toLowerCase();
        if (!pTitle || pTitle.length < 3) return false;
        return (asal.length > 4 && pTitle.includes(asal)) || (pTitle.length > 4 && asal.includes(pTitle));
      });
      if (secMatch) return String(secMatch.id);
    }

    // 1C. Substring match across all posts (guaranteeing non-empty strings)
    const postByTitle = allPosts.find(p => {
      const pTitle = (p.title || '').trim().toLowerCase();
      if (!pTitle || pTitle.length < 3) return false;
      const cleanPTitle = cleanFrontEndText(pTitle).toLowerCase();
      return (asal.length > 4 && pTitle.includes(asal)) || (pTitle.length > 4 && asal.includes(pTitle)) ||
             (cleanPTitle.length > 4 && cleanPTitle.includes(asal));
    });
    if (postByTitle) return String(postByTitle.id);
  }

  // 2. Check parent title in matching section posts, then fallback to all posts with tables
  const rawTitle = row['Jenis kegiatan'] || row['Jenis Kegiatan'] || row.Name || row.Judul || '';
  const cleanTitle = cleanFrontEndText(rawTitle.replace(/^[↳↪]\s*/, '').replace(/^\[[ xX]\]\s*/, '')).toLowerCase();
  if (!cleanTitle) return null;

  const sectionPosts = sectionName ? findSectionTaskPosts(sectionName, allPosts, 'ALL') : allPosts;
  const candidatePool = [...sectionPosts, ...allPosts];
  for (const post of candidatePool) {
    if (!post.content || !post.content.includes('|') || isLogbookPost(post)) continue;
    const parsed = parseTableFromMarkdown(post.content);
    if (!parsed || !parsed.rows) continue;
    const hasRow = parsed.rows.some(r => {
      const rTitle = cleanFrontEndText(r['Jenis kegiatan'] || r['Jenis Kegiatan'] || r.Name || '').toLowerCase();
      return rTitle === cleanTitle || (cleanTitle.length > 5 && (rTitle.includes(cleanTitle) || cleanTitle.includes(rTitle)));
    });
    if (hasRow) return String(post.id);
  }

  return null;
}

/**
 * Collects and merges all rows across all Labnote posts of a section for comprehensive Changelog reporting.
 */
export function getAllSectionRowsForChangelog(
  sectionName: string,
  localRows: TableRowData[],
  allPosts: any[],
  targetUniverse: string = 'TBP'
): TableRowData[] {
  const matchingPosts = findSectionTaskPosts(sectionName, allPosts, targetUniverse);
  const rowsMap = new Map<string, TableRowData>();

  // 1. Add rows from Labnote origin posts
  matchingPosts.forEach(post => {
    const parsed = parseTableFromMarkdown(post.content || '');
    if (parsed && parsed.rows) {
      parsed.rows.forEach((row, idx) => {
        const id = row.id || `origin_${post.id}_${idx}`;
        rowsMap.set(id, {
          ...row,
          _originPostId: String(post.id),
          _originPostTitle: post.title,
          _originRowIndex: String(idx)
        });
      });
    }
  });

  // 2. Add / overwrite with localRows
  localRows.forEach(r => {
    const id = r.id || `${r['Jenis kegiatan']}_${r.number}`;
    rowsMap.set(id, r);
  });

  return Array.from(rowsMap.values());
}

export function getTaskPrefix(categoryOrSection?: string): string {
  const cat = (categoryOrSection || '').toLowerCase().trim();
  if (cat.includes('prep')) return 'P';
  if (cat.includes('qa') || cat.includes('quality') || cat.includes('mutu')) return 'Q';
  if (cat.includes('admin')) return 'A';
  if (cat.includes('invent')) return 'I';
  if (cat.includes('maint')) return 'M';
  if (cat.includes('lab')) return 'L';
  if (cat.length > 0) return cat.charAt(0).toUpperCase();
  return 'L'; // Default Laboratorium
}

/**
 * Auto-generates unique task code based on category:
 * L1 (Lab), P1 (Prep), Q1 (QA), A1 (Admin), I1 (Inventory), M1 (Maintenance)
 */
export function generateTaskCode(categoryOrSection?: string, rows?: TableRowData[]): string {
  const prefix = getTaskPrefix(categoryOrSection);

  let maxSeq = 0;
  if (rows && rows.length > 0) {
    const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
    rows.forEach(r => {
      const codeCandidates = [
        r.taskCode,
        r['Task ID'],
        r['ID Task'],
        r.id,
        r.number,
        r['number'],
        r['No']
      ];
      for (const val of codeCandidates) {
        if (!val) continue;
        const str = String(val).trim();
        const match = str.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
          break;
        }
      }
    });
  }

  return `${prefix}${maxSeq + 1}`;
}

/**
 * Normalizes all existing task rows so every task has a consistent, immutable ID Task (L1, P1, Q1, A1, I1, M1...)
 * based on its section/category.
 */
export function normalizeExistingTaskCodes(rows: TableRowData[], defaultSection?: string): { rows: TableRowData[]; hasChanges: boolean } {
  if (!rows || rows.length === 0) return { rows: [], hasChanges: false };

  let hasChanges = false;
  // Track used sequence numbers per prefix
  const usedSeqByPrefix: Record<string, Set<number>> = {};
  const currentMaxSeq: Record<string, number> = {};

  const getPrefixFor = (r: TableRowData): string => {
    const cat = r['Kategori'] || r['kategori'] || r['section'] || r['Section'] || r['Departemen'] || defaultSection;
    return getTaskPrefix(cat);
  };

  // Phase 1: Collect valid existing task codes that already conform to prefix + number
  rows.forEach(r => {
    if (isSubItemRow(r)) return;
    const targetPrefix = getPrefixFor(r);
    if (!usedSeqByPrefix[targetPrefix]) {
      usedSeqByPrefix[targetPrefix] = new Set();
      currentMaxSeq[targetPrefix] = 0;
    }

    const codeCandidates = [r.taskCode, r['Task ID'], r['ID Task']];
    for (const code of codeCandidates) {
      if (!code) continue;
      const str = String(code).trim().toUpperCase();
      const match = str.match(new RegExp(`^${targetPrefix}(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > 0) {
          usedSeqByPrefix[targetPrefix].add(num);
          if (num > currentMaxSeq[targetPrefix]) {
            currentMaxSeq[targetPrefix] = num;
          }
          break;
        }
      }
    }
  });

  // Phase 2: For each row, if it doesn't have a valid matching task code, assign the next available one
  const nextRows = rows.map(r => {
    if (isSubItemRow(r)) return r;

    const targetPrefix = getPrefixFor(r);
    if (!usedSeqByPrefix[targetPrefix]) {
      usedSeqByPrefix[targetPrefix] = new Set();
      currentMaxSeq[targetPrefix] = 0;
    }

    // Check if current row already has valid code
    let validCode: string | null = null;
    const codeCandidates = [r.taskCode, r['Task ID'], r['ID Task']];
    for (const code of codeCandidates) {
      if (!code) continue;
      const str = String(code).trim().toUpperCase();
      const match = str.match(new RegExp(`^${targetPrefix}(\\d+)$`));
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > 0) {
          validCode = `${targetPrefix}${num}`;
          break;
        }
      }
    }

    if (!validCode) {
      // Find next unused sequence number
      let nextSeq = (currentMaxSeq[targetPrefix] || 0) + 1;
      while (usedSeqByPrefix[targetPrefix].has(nextSeq)) {
        nextSeq++;
      }
      usedSeqByPrefix[targetPrefix].add(nextSeq);
      currentMaxSeq[targetPrefix] = Math.max(currentMaxSeq[targetPrefix] || 0, nextSeq);
      validCode = `${targetPrefix}${nextSeq}`;
      hasChanges = true;
    }

    // Check if row needs updating
    if (r.taskCode !== validCode || r['Task ID'] !== validCode || r['ID Task'] !== validCode) {
      hasChanges = true;
      return {
        ...r,
        taskCode: validCode,
        'Task ID': validCode,
        'ID Task': validCode
      };
    }

    return r;
  });

  return { rows: nextRows, hasChanges };
}
