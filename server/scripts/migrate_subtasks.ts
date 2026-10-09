import { db } from '../../src/db/index.js';
import { bulletinPosts, logbookTasks } from '../../src/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { parseMarkdownTableRows } from '../routes/logbook.js';

// Regex to detect and extract checklists from Keterangan
export function extractChecklistsFromKeterangan(ket: string) {
  if (!ket || ket.trim() === '' || ket.trim() === '-') return { hasChecklists: false, items: [], cleanKeterangan: ket };
  
  // Normalize line breaks
  const normalized = ket.replace(/<br\s*\/?>/gi, '\n');
  const lines = normalized.split(/\r?\n/);
  
  const items: Array<{ checked: boolean; title: string }> = [];
  const remainingLines: string[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Pattern 1: - [x] or - [ ] or [x] or [ ]
    const boxMatch = trimmed.match(/^[-*•]?\s*\[([ xX])\]\s*(.+)$/);
    if (boxMatch) {
      const checked = boxMatch[1].toLowerCase() === 'x';
      let title = boxMatch[2].trim();
      title = title.replace(/^['"]/, '').replace(/['"]$/, '').trim();
      items.push({ checked, title });
      continue;
    }

    // Pattern 2: Unicode checkbox ☑ or ☐
    const uniMatch = trimmed.match(/^[-*•]?\s*([☑☐])\s*(.+)$/);
    if (uniMatch) {
      const checked = uniMatch[1] === '☑';
      let title = uniMatch[2].trim();
      items.push({ checked, title });
      continue;
    }

    // Pattern 3: Legacy tag e.g. "Item (Done)" or "Item (OP)" or "1. Item (OP)" or "Item (CLOSE)"
    const legacyDone = trimmed.match(/^[-*•]?\s*(.+?)\s*\(?(Done|Closed|Close|Finish|Selesai|CL)\)?\s*$/i);
    const legacyOpen = trimmed.match(/^[-*•]?\s*(.+?)\s*\(?(Open|OP|Belum|In Progress|Pending)\)?\s*$/i);
    if (legacyDone) {
      let title = legacyDone[1].replace(/^[-*•]\s*/, '').trim();
      items.push({ checked: true, title });
      continue;
    } else if (legacyOpen) {
      let title = legacyOpen[1].replace(/^[-*•]\s*/, '').trim();
      items.push({ checked: false, title });
      continue;
    }

    // Otherwise it's normal note text
    remainingLines.push(trimmed);
  }

  const cleanKeterangan = remainingLines.join('<br/>').trim() || '-';
  return {
    hasChecklists: items.length > 0,
    items,
    cleanKeterangan
  };
}

export function migrateTableRows(headers: string[], rows: Record<string, string>[]) {
  const newRows: Record<string, string>[] = [];
  let migratedItemsCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = { ...rows[i] };
    const title = (row['Jenis Kegiatan'] || row['Jenis kegiatan'] || row['Name'] || row['Judul'] || '').trim();
    const isSub = title.startsWith('↳');

    if (isSub) {
      newRows.push(row);
      continue;
    }

    const ket = row['Keterangan'] || row['catatan'] || row['Catatan'] || '';
    const extraction = extractChecklistsFromKeterangan(ket);

    if (extraction.hasChecklists && extraction.items.length > 0) {
      // Update parent row's Keterangan with remaining text
      row['Keterangan'] = extraction.cleanKeterangan;
      newRows.push(row);

      // Add each checklist item as child sub-item row
      extraction.items.forEach(item => {
        const subTitle = `↳ ${item.checked ? '[x] ' : '[ ] '}${item.title}`;
        const subRow: Record<string, string> = { ...row };
        
        // Clear primary identifier
        if (subRow['number'] !== undefined) subRow['number'] = '';
        if (subRow['No'] !== undefined) subRow['No'] = '';
        if (subRow['no'] !== undefined) subRow['no'] = '';

        if (subRow['Jenis kegiatan'] !== undefined) subRow['Jenis kegiatan'] = subTitle;
        if (subRow['Jenis Kegiatan'] !== undefined) subRow['Jenis Kegiatan'] = subTitle;
        if (subRow['Judul'] !== undefined) subRow['Judul'] = subTitle;
        if (subRow['Name'] !== undefined) subRow['Name'] = subTitle;

        subRow['Keterangan'] = '-';
        subRow['Status'] = item.checked ? 'Closed' : 'Open';
        if (!item.checked) {
          if (subRow['Tanggal Selesai']) subRow['Tanggal Selesai'] = '-';
          if (subRow['Aktual Selesai']) subRow['Aktual Selesai'] = '-';
        }

        newRows.push(subRow);
        migratedItemsCount++;
      });
    } else {
      newRows.push(row);
    }
  }

  return { newRows, migratedItemsCount };
}

function serializeMarkdownTable(
  headers: string[],
  rows: Record<string, string>[],
  beforeText: string = '',
  afterText: string = ''
): string {
  if (!headers || headers.length === 0) return '';
  const headerLine = `| ${headers.join(' | ')} |`;
  const separatorLine = `| ${headers.map(() => '---').join(' | ')} |`;
  const dataLines = rows.map(r => {
    const rowCells = headers.map(h => {
      let cell = r[h] !== undefined ? r[h] : '';
      cell = String(cell).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br/>');
      return cell;
    });
    return `| ${rowCells.join(' | ')} |`;
  });

  const tableMarkdown = [headerLine, separatorLine, ...dataLines].join('\n');
  let result = '';
  if (beforeText && beforeText.trim()) result += beforeText.trim() + '\n\n';
  result += tableMarkdown;
  if (afterText && afterText.trim()) result += '\n\n' + afterText.trim();
  return result;
}

async function run() {
  console.log('--- STARTING SUBTASK & LOGBOOK MIGRATION ---');

  // 1. Migrate all bulletin posts
  const posts = await db.select().from(bulletinPosts);
  let updatedPostsCount = 0;
  let totalMigratedSubtasks = 0;

  for (const post of posts) {
    if (!post.content || !post.content.includes('|')) continue;
    const parsed = parseMarkdownTableRows(post.content);
    if (!parsed || !parsed.rows || parsed.rows.length === 0) continue;

    const { newRows, migratedItemsCount } = migrateTableRows(parsed.headers, parsed.rows);
    if (migratedItemsCount > 0) {
      const newContent = serializeMarkdownTable(parsed.headers, newRows, parsed.beforeText, parsed.afterText);
      await db.update(bulletinPosts)
        .set({ content: newContent })
        .where(eq(bulletinPosts.id, post.id));
      
      console.log(`[Post #${post.id} "${post.title}"] Migrated ${migratedItemsCount} subtasks from Keterangan to child rows.`);
      updatedPostsCount++;
      totalMigratedSubtasks += migratedItemsCount;
    }
  }

  console.log(`Bulletin Posts Migration: ${updatedPostsCount} posts updated, ${totalMigratedSubtasks} subtasks migrated.`);

  // 2. Delete orphaned subtask records in logbook_tasks (those starting with ↳)
  const deleteRes = await db.delete(logbookTasks).where(sql`title LIKE '↳%'`);
  console.log('Logbook Tasks: Deleted orphaned rows starting with ↳.');

  console.log('--- MIGRATION COMPLETED SUCCESSFULLY ---');
}

run().then(() => process.exit(0)).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
