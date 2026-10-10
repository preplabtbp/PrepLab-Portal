// Utilities for Unified Section Logbooks in LabNote
// Combines active Routine and Non-Routine tasks into a seamless NotionDatabaseTable view.

import { TableRowData } from '../NotionDatabaseTable';

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
