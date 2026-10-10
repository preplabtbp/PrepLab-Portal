import type { TableRowData } from '../NotionDatabaseTable';
export type { TableRowData };

/**
 * Formats any date string or Date object into DD-MM-YYYY format.
 * Examples: '2026-10-10' -> '10-10-2026', '2026-10-10 08:30' -> '10-10-2026 08:30'
 */
export function formatToDDMMYYYY(val: string | number | Date | null | undefined): string {
  if (!val) return '';
  const str = String(val).trim();
  if (str === '-' || str === '') return str;
  // If already DD-MM-YYYY or DD-MM-YYYY HH:mm
  if (/^\d{2}-\d{2}-\d{4}/.test(str)) {
    return str;
  }
  // If YYYY-MM-DD or YYYY-MM-DD HH:mm...
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(.*)/);
  if (isoMatch) {
    const [, y, m, d, rest] = isoMatch;
    return `${d.padStart(2, '0')}-${m.padStart(2, '0')}-${y}${rest || ''}`;
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
  return title.startsWith('logbook') || title.startsWith('log book');
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
  const parts = line.split('|').map(p => p.trim());
  const cellValues = parts.slice(1, parts.length - 1);
  if (cellValues.length === 0) return null;

  const rowObj: TableRowData = { number: '' };
  headers.forEach((h, idx) => {
    rowObj[h] = cellValues[idx] || '';
  });
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

    // 3. Exclude the section hub itself, archived posts, and meetings
    if (pTitle.startsWith('archived') || pTitle.includes('[meeting]') || pTitle === sNorm) {
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

    // Get task title for deduplication
    const titleKey = Object.keys(row).find(k => k.toLowerCase().includes('kegiatan') || k.toLowerCase() === 'title');
    const taskTitle = titleKey ? String(row[titleKey] || '').trim() : '';
    if (!taskTitle) return;

    const dedupKey = `${taskTitle.toLowerCase()}_${String(row.PIC || row.pic || '').toLowerCase()}`;
    if (seenTaskKeys.has(dedupKey)) return;
    seenTaskKeys.add(dedupKey);

    // Determine Activity and Period
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

    // Normalize keys to canonical headers
    const normalizedRow: TableRowData = {
      number: String(activeRows.length + 1),
      'Jenis kegiatan': taskTitle,
      Keterangan: String(row.Keterangan || row.keterangan || row.uraian || ''),
      'Created Time': String(row['Created Time'] || row['Created time'] || row.created_time || row.date || ''),
      'Tanggal Selesai': String(row['Tanggal Selesai'] || row['Tanggal selesai'] || row.completed || '-'),
      Status: String(row.Status || row.status || 'Open'),
      PIC: String(row.PIC || row.pic || ''),
      Priority: String(row.Priority || row.priority || 'Normal'),
      'Activity (routine/non routine)': String(row['Activity (routine/non routine)'] || row.Aktivitas || row.aktivitas || defaultActivity),
      period: String(row.period || row.Period || defaultPeriod),
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
 * Synchronizes an updated Logbook row directly back to its origin post.
 */
export async function syncLogbookRowBackToOrigin(
  updatedRow: TableRowData,
  allPosts: any[]
): Promise<boolean> {
  const originPostId = updatedRow._originPostId;
  if (!originPostId) return false;

  const originPost = allPosts.find(p => p.id === originPostId);
  if (!originPost || !originPost.content) return false;

  const parsed = parseTableFromMarkdown(originPost.content);
  if (!parsed || parsed.rows.length === 0) return false;

  // Find target row index in origin post
  let targetIdx = -1;
  const targetTitle = String(updatedRow['Jenis kegiatan'] || updatedRow.title || '').trim().toLowerCase();

  if (typeof updatedRow._originRowIndex === 'number' && parsed.rows[updatedRow._originRowIndex]) {
    const candidateTitle = String(parsed.rows[updatedRow._originRowIndex]['Jenis kegiatan'] || '').trim().toLowerCase();
    if (candidateTitle === targetTitle) {
      targetIdx = updatedRow._originRowIndex;
    }
  }

  if (targetIdx === -1) {
    targetIdx = parsed.rows.findIndex(r => {
      const rTitle = String(r['Jenis kegiatan'] || r['Jenis Kegiatan'] || r.title || '').trim().toLowerCase();
      return rTitle === targetTitle;
    });
  }

  if (targetIdx === -1) {
    console.warn(`[Logbook Sync] Could not find row "${targetTitle}" in origin post #${originPostId}`);
    return false;
  }

  // Update fields in the origin row
  const rowToUpdate = parsed.rows[targetIdx];
  const ketKey = Object.keys(rowToUpdate).find(k => k.toLowerCase() === 'keterangan') || 'Keterangan';
  const statusKey = Object.keys(rowToUpdate).find(k => k.toLowerCase() === 'status') || 'Status';
  const picKey = Object.keys(rowToUpdate).find(k => k.toLowerCase() === 'pic') || 'PIC';
  const dateKey = Object.keys(rowToUpdate).find(k => k.toLowerCase().includes('selesai')) || 'Tanggal Selesai';

  rowToUpdate[ketKey] = updatedRow.Keterangan || '';
  rowToUpdate[statusKey] = updatedRow.Status || 'Open';
  if (updatedRow.PIC) rowToUpdate[picKey] = updatedRow.PIC;
  if (updatedRow['Tanggal Selesai']) rowToUpdate[dateKey] = updatedRow['Tanggal Selesai'];

  // Re-serialize origin post table
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
  
  // Find where table ends
  let endTableIdx = lines.length;
  for (let i = separatorIdx + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed.startsWith('|') && (trimmed.startsWith('#') || trimmed.startsWith('> ') || trimmed.startsWith('```'))) {
      endTableIdx = i;
      break;
    }
  }
  const afterLines = lines.slice(endTableIdx);

  const serializedRows = parsed.rows.map(r => {
    const cells = parsed.headers.map(h => String(r[h] || '').replace(/\|/g, '\\|'));
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
      console.log(`[Logbook Sync] Successfully synced row "${targetTitle}" to origin post #${originPostId}`);
      return true;
    }
  } catch (err) {
    console.error(`[Logbook Sync] Failed to sync row back to post #${originPostId}:`, err);
  }

  return false;
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

      const titleKey = Object.keys(row).find(k => k.toLowerCase().includes('kegiatan') || k.toLowerCase() === 'title');
      const title = titleKey ? String(row[titleKey] || '').trim() : '';
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

      recommendations.push({
        id: recId,
        title,
        description: String(row.Keterangan || row.keterangan || row.uraian || ''),
        pic: String(row.PIC || row.pic || ''),
        priority: String(row.Priority || row.priority || 'Normal'),
        type: isNonRoutine ? 'Non-Routine' : 'Routine',
        cadence: defaultCadence,
        originPostId: post.id,
        originPostTitle: postTitle,
        originRowIndex: idx,
        rawRow: row,
        isAlreadyPlanned: isPlanned
      });
    });
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

        const normalized: TableRowData = {
          number: String(yesterdayTasks.length + 1),
          'Jenis kegiatan': title,
          Keterangan: String(row.Keterangan || row.keterangan || ''),
          'Created Time': formatToDDMMYYYY(row['Created Time'] || row['Created time'] || yesterdayStr),
          'Tanggal Selesai': dateVal || (isFinishedYesterday ? yesterdayStr : '-'),
          Status: isFinishedYesterday ? 'Closed' : (row.Status || 'Open'),
          PIC: String(row.PIC || row.pic || ''),
          Priority: String(row.Priority || 'Normal'),
          'Activity (routine/non routine)': String(row['Activity (routine/non routine)'] || 'Routine'),
          period: String(row.period || 'Daily'),
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
  subtasks: Array<{ title: string; completed: boolean }>;
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

  // Filter rows belonging to target date
  const dateRows = allRows.filter(r => {
    const rowDate = getRowDateDDMMYYYY(r);
    // If target date is found, match it. If row date is empty, fallback to today
    return rowDate === dateStr;
  });

  // Extract main rows and subtasks
  const mainItems: ChangelogItem[] = [];

  // Helper to check if row is a subtask
  const isSubtaskRow = (r: TableRowData): boolean => {
    const num = String(r.number || '').trim();
    return num.includes('.') || Boolean(r._parentRowIndex || r.parentNumber);
  };

  // Group subtasks with parents
  dateRows.forEach((row, idx) => {
    if (isSubtaskRow(row)) return;

    const titleKey = Object.keys(row).find(k => k.toLowerCase().includes('kegiatan') || k.toLowerCase() === 'title');
    const title = titleKey ? String(row[titleKey] || '').trim() : '';
    if (!title) return;

    const pic = String(row.PIC || row.pic || '').trim();
    const priority = String(row.Priority || row.priority || 'Normal').trim();
    const status = String(row.Status || row.status || 'Open').trim();
    const statusLower = status.toLowerCase();

    // Parse subtasks from Keterangan checklist or adjacent rows
    const rawKeterangan = String(row.Keterangan || row.keterangan || '').trim();
    const subtasks: Array<{ title: string; completed: boolean }> = [];
    const notesLines: string[] = [];

    // Split markdown lines in Keterangan
    rawKeterangan.split('\n').forEach(line => {
      const trimmed = line.trim();
      const checklistMatch = trimmed.match(/^-\s*\[([ xX])\]\s*(.*)$/);
      if (checklistMatch) {
        subtasks.push({
          completed: checklistMatch[1].toLowerCase() === 'x',
          title: checklistMatch[2].trim()
        });
      } else if (trimmed) {
        notesLines.push(trimmed);
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

    const cleanNotes = notesLines.join('\n');

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
        text += `  - Subtask: ${task.completedSubtasks}/${task.totalSubtasks} Selesai [100%]\n`;
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
        text += `  - Subtask: ${task.completedSubtasks}/${task.totalSubtasks} Selesai\n`;
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
 * Does NOT scrape or force external posts, ensuring a clean initial state.
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
  const content = logbookPost?.content || '';
  const { cleanContent } = extractLogbookMeta(content);
  const parsed = parseTableFromMarkdown(cleanContent);
  if (parsed && parsed.rows && parsed.rows.length > 0) {
    return {
      headers: parsed.headers.length > 0 ? parsed.headers : LOGBOOK_CANONICAL_HEADERS,
      rows: parsed.rows,
      beforeText: `> 📔 **Logbook Terpadu Seksi ${sectionName}**`,
      afterText: '',
      rawTable: ''
    };
  }

  return {
    headers: LOGBOOK_CANONICAL_HEADERS,
    rows: [],
    beforeText: `> 📔 **Logbook Terpadu Seksi ${sectionName}**`,
    afterText: '',
    rawTable: ''
  };
}

