// Smart Tasklist Utilities for Notion Database Tables

export interface SubtaskNote {
  id: string;
  text: string;
  date: string; // 'YYYY-MM-DD'
  time?: string; // 'HH:mm'
  author?: string;
}

export interface TaskItem {
  index: number;
  checked: boolean;
  text: string;
  rawLine: string;
  notes?: SubtaskNote[];
  note?: string; // Latest note text for convenience & backward-compat
  noteDate?: string; // Latest note date ('YYYY-MM-DD')
  checkedDate?: string; // 'YYYY-MM-DD'
}

export interface TasklistProgress {
  hasTasklist: boolean;
  total: number;
  completed: number;
  percentage: number;
  isAllCompleted: boolean;
  items: TaskItem[];
  cleanText?: string;
}

// Regex to capture markdown task list items
const TASK_REGEX = /(?:^|\n|•|\-)\s*\[([ xX])\]\s*([^\n•\r]+)/g;

/**
 * Parses markdown text to detect and extract interactive task list items with multiple notes and dates
 */
export function parseTasklist(text?: string | null): TasklistProgress {
  if (!text || typeof text !== 'string') {
    return { hasTasklist: false, total: 0, completed: 0, percentage: 0, isAllCompleted: false, items: [], cleanText: '' };
  }

  // Normalize <br/>, <br>, <br /> tags into \n
  const normalized = text.replace(/<br\s*\/?>/gi, '\n');
  const items: TaskItem[] = [];
  const lines = normalized.split(/\r?\n|•/);
  const nonTaskLines: string[] = [];
  let itemIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // First try standard markdown tasklist: - [x] or - [ ] or [x] or [ ]
    let match = trimmed.match(/^[-*•]?\s*\[([ xX])\]\s*(.+)$/);
    let isLegacyMatch = false;
    let isCheckedLegacy = false;
    let legacyText = '';

    if (!match) {
      // Check unicode checkbox: ☑ or ☐
      const uniMatch = trimmed.match(/^[-*•]?\s*([☑☐])\s*(.+)$/);
      if (uniMatch) {
        match = [uniMatch[0], uniMatch[1] === '☑' ? 'x' : ' ', uniMatch[2]];
      }
    }

    if (!match) {
      // Check legacy subtask tags: - Kegiatan **(Done)** or • Kegiatan **(OPEN)** or (Done) / (OP)
      const legacyDone = trimmed.match(/^[-*•]?\s*(.+?)\s*(?:\*\*\(?|\(?)(Done|Closed|Close|Finish|Selesai|CL)(?:\)?\*\*|\)?)\s*$/i);
      const legacyOpen = trimmed.match(/^[-*•]?\s*(.+?)\s*(?:\*\*\(?|\(?)(Open|OP|Belum|In Progress|Pending)(?:\)?\*\*|\)?)\s*$/i);
      if (legacyDone) {
        isLegacyMatch = true;
        isCheckedLegacy = true;
        legacyText = legacyDone[1].replace(/^[-*•]\s*/, '').trim();
      } else if (legacyOpen) {
        isLegacyMatch = true;
        isCheckedLegacy = false;
        legacyText = legacyOpen[1].replace(/^[-*•]\s*/, '').trim();
      }
    }

    if (match || isLegacyMatch) {
      const isChecked = match ? match[1].toLowerCase() === 'x' : isCheckedLegacy;
      let rawContent = match ? match[2].trim() : legacyText;

      // Extract notes JSON array if present: <!--notes:[...]-->
      let notes: SubtaskNote[] = [];
      const notesMatch = rawContent.match(/<!--\s*notes:\s*(\[[\s\S]*?\])\s*-->/i);
      if (notesMatch) {
        try {
          notes = JSON.parse(notesMatch[1]);
        } catch (e) {}
        rawContent = rawContent.replace(notesMatch[0], '').trim();
      }

      // Extract legacy note if present: <!--note: ...--> or {note: ...}
      let note = '';
      const noteMatch = rawContent.match(/<!--\s*note:\s*([\s\S]*?)\s*-->/i) || rawContent.match(/\{note:\s*([^\}]+)\}/i);
      if (noteMatch) {
        note = noteMatch[1].trim();
        rawContent = rawContent.replace(noteMatch[0], '').trim();
      }

      // Extract checkedDate if present: <!--checkedDate: YYYY-MM-DD--> or {date: YYYY-MM-DD}
      let checkedDate = '';
      const dateMatch = rawContent.match(/<!--\s*checkedDate:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s*-->/i) || rawContent.match(/\{date:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\}/i);
      if (dateMatch) {
        checkedDate = dateMatch[1].trim();
        rawContent = rawContent.replace(dateMatch[0], '').trim();
      }

      // Extract noteDate if present: <!--noteDate: YYYY-MM-DD--> or {noteDate: YYYY-MM-DD}
      let noteDate = '';
      const noteDateMatch = rawContent.match(/<!--\s*noteDate:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s*-->/i) || rawContent.match(/\{noteDate:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\}/i);
      if (noteDateMatch) {
        noteDate = noteDateMatch[1].trim();
        rawContent = rawContent.replace(noteDateMatch[0], '').trim();
      }

      // Strip any other HTML comments or dangling comment brackets from title
      rawContent = rawContent.replace(/<!--[\s\S]*?-->/gi, '').replace(/<!--.*$/gi, '').trim();

      // If we have legacy note and notes is empty, synthesize into notes array
      if (note && notes.length === 0) {
        notes.push({
          id: 'legacy-1',
          text: note,
          date: noteDate || '',
          time: '00:00'
        });
      }

      // Sort notes descending: newest notes always at the top
      if (notes.length > 0) {
        notes.sort((a, b) => {
          const dtA = `${a.date || ''} ${a.time || ''}`;
          const dtB = `${b.date || ''} ${b.time || ''}`;
          return dtB.localeCompare(dtA);
        });
      }

      const latestNote = notes.length > 0 ? notes[0] : null;

      items.push({
        index: itemIndex++,
        checked: isChecked,
        text: rawContent,
        rawLine: trimmed,
        notes: notes.length > 0 ? notes : undefined,
        note: latestNote ? latestNote.text : (note || undefined),
        noteDate: latestNote ? latestNote.date : (noteDate || undefined),
        checkedDate: checkedDate || undefined
      });
    } else if (trimmed) {
      nonTaskLines.push(trimmed);
    }
  }

  const total = items.length;
  const completed = items.filter(i => i.checked).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    hasTasklist: total > 0,
    total,
    completed,
    percentage,
    isAllCompleted: total > 0 && completed === total,
    items,
    cleanText: nonTaskLines.join('\n')
  };
}

/**
 * Migrates text containing legacy subtask tags like "- Task **(Done)**" into standard markdown checklists
 */
export function migrateLegacySubtaskText(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  const delimiter = /<br\s*\/?>/i.test(text) ? '<br/>' : '\n';
  const normalized = text.replace(/<br\s*\/?>/gi, '\n');
  const lines = normalized.split(/\r?\n|•/);

  const transformed = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;

    // Check if already markdown checklist
    if (/^[-*]?\s*\[([ xX])\]/.test(trimmed)) {
      return trimmed.startsWith('-') ? trimmed : `- ${trimmed}`;
    }

    const legacyDone = trimmed.match(/^[-*•]?\s*(.+?)\s*\*\*\(?(Done|Closed|Close|Finish|Selesai|CL)\)?\*\*\s*$/i);
    if (legacyDone) {
      const itemTitle = legacyDone[1].replace(/^[-*•]\s*/, '').trim();
      return `- [x] ${itemTitle}`;
    }

    const legacyOpen = trimmed.match(/^[-*•]?\s*(.+?)\s*\*\*\(?(Open|OP|Belum|In Progress|Pending)\)?\*\*\s*$/i);
    if (legacyOpen) {
      const itemTitle = legacyOpen[1].replace(/^[-*•]\s*/, '').trim();
      return `- [ ] ${itemTitle}`;
    }

    return trimmed;
  });

  return transformed.join(delimiter);
}

/**
 * Toggles a specific task checklist item in the text by index and stamps actionDate
 */
export function toggleTasklistItem(text: string, targetIndex: number, actionDate?: string): string {
  if (!text) return text;

  const hasBr = /<br\s*\/?>/i.test(text);
  const delimiter = hasBr ? '<br/>' : '\n';
  const normalized = text.replace(/<br\s*\/?>/gi, '\n');

  const todayStr = actionDate || new Date().toISOString().split('T')[0];

  let currentIndex = 0;
  const lines = normalized.split('\n');
  const updatedLines = lines.map(line => {
    // Check if line contains a task item
    const match = line.match(/^(\s*[-*•]?\s*\[)([ xX])(\]\s*)(.+)$/);
    if (match) {
      if (currentIndex === targetIndex) {
        const prefix = match[1];
        const currentChecked = match[2].toLowerCase() === 'x';
        const newCheck = currentChecked ? ' ' : 'x';
        const spaceAfterBracket = match[3];
        let content = match[4].trim();

        // Extract notes if present
        let existingNotesStr = '';
        const notesMatch = content.match(/<!--\s*notes:\s*\[[\s\S]*?\]\s*-->/i);
        if (notesMatch) {
          existingNotesStr = notesMatch[0];
          content = content.replace(notesMatch[0], '').trim();
        }

        if (newCheck === 'x') {
          // Turning to checked: add or update checkedDate
          content = content.replace(/<!--\s*checkedDate:\s*[0-9]{4}-[0-9]{2}-[0-9]{2}\s*-->/gi, '').trim();
          content = `${content} <!--checkedDate:${todayStr}-->`;
        } else {
          // Turning to unchecked: remove checkedDate
          content = content.replace(/<!--\s*checkedDate:\s*[0-9]{4}-[0-9]{2}-[0-9]{2}\s*-->/gi, '').trim();
        }

        if (existingNotesStr) {
          content = `${content} ${existingNotesStr}`;
        }

        currentIndex++;
        return `${prefix}${newCheck}${spaceAfterBracket}${content}`;
      }
      currentIndex++;
    }
    return line;
  });

  return updatedLines.join(delimiter);
}

/**
 * Adds a new note to a specific task checklist item with timestamp and records in <!--notes:[...]-->
 */
export function addSubtaskNote(
  text: string,
  targetIndex: number,
  newNoteText: string,
  actionDate?: string,
  actionTime?: string,
  author?: string
): string {
  if (!text) return text;
  // CRITICAL: Subtask notes must NOT contain newlines (\r or \n) because each subtask in markdown is a single line (- [ ] ...)
  // Any raw newline breaks the checklist line and spills into general task notes (nonTaskLines / cleanText)!
  const sanitizedNote = newNoteText.replace(/[\r\n]+/g, ' ').trim();
  if (!sanitizedNote) return text;

  const hasBr = /<br\s*\/?>/i.test(text);
  const delimiter = hasBr ? '<br/>' : '\n';
  const normalized = text.replace(/<br\s*\/?>/gi, '\n');
  const todayStr = actionDate || new Date().toISOString().split('T')[0];
  const now = new Date();
  const timeStr = actionTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  let currentIndex = 0;
  const lines = normalized.split('\n');
  const updatedLines = lines.map(line => {
    const match = line.match(/^(\s*[-*•]?\s*\[)([ xX])(\]\s*)(.+)$/);
    if (match) {
      if (currentIndex === targetIndex) {
        const prefix = match[1];
        const check = match[2];
        const spaceAfterBracket = match[3];
        let content = match[4].trim();

        // Extract existing notes
        let existingNotes: SubtaskNote[] = [];
        const notesMatch = content.match(/<!--\s*notes:\s*(\[[\s\S]*?\])\s*-->/i);
        if (notesMatch) {
          try {
            existingNotes = JSON.parse(notesMatch[1]);
          } catch (e) {}
        }

        // Also check legacy note if not already captured
        const legacyNoteMatch = content.match(/<!--\s*note:\s*([\s\S]*?)\s*-->/i);
        const legacyDateMatch = content.match(/<!--\s*noteDate:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s*-->/i);
        if (legacyNoteMatch && existingNotes.length === 0) {
          existingNotes.push({
            id: 'legacy-1',
            text: legacyNoteMatch[1].trim(),
            date: legacyDateMatch ? legacyDateMatch[1].trim() : todayStr,
            time: '00:00'
          });
        }

        // Preserve checkedDate if present
        let checkedDate = '';
        const dateMatch = content.match(/<!--\s*checkedDate:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s*-->/i);
        if (dateMatch) {
          checkedDate = dateMatch[1];
        }

        // Clean out all comments from content so subtask title is pristine
        content = content.replace(/<!--[\s\S]*?-->/gi, '').replace(/<!--.*$/gi, '').trim();

        const newNoteObj: SubtaskNote = {
          id: `note-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          text: sanitizedNote,
          date: todayStr,
          time: timeStr,
          author: author || undefined
        };

        const updatedNotes = [newNoteObj, ...existingNotes].sort((a, b) => {
          const dtA = `${a.date || ''} ${a.time || ''}`;
          const dtB = `${b.date || ''} ${b.time || ''}`;
          return dtB.localeCompare(dtA);
        });

        let commentSuffix = '';
        if (checkedDate) {
          commentSuffix += ` <!--checkedDate:${checkedDate}-->`;
        }
        commentSuffix += ` <!--notes:${JSON.stringify(updatedNotes)}-->`;
        content = `${content}${commentSuffix}`;

        currentIndex++;
        return `${prefix}${check}${spaceAfterBracket}${content}`;
      }
      currentIndex++;
    }
    return line;
  });

  return updatedLines.join(delimiter);
}

/**
 * Removes a specific subtask note by its unique ID
 */
export function removeSubtaskNote(text: string, targetIndex: number, noteId: string): string {
  if (!text) return text;
  const hasBr = /<br\s*\/?>/i.test(text);
  const delimiter = hasBr ? '<br/>' : '\n';
  const normalized = text.replace(/<br\s*\/?>/gi, '\n');

  let currentIndex = 0;
  const lines = normalized.split('\n');
  const updatedLines = lines.map(line => {
    const match = line.match(/^(\s*[-*•]?\s*\[)([ xX])(\]\s*)(.+)$/);
    if (match) {
      if (currentIndex === targetIndex) {
        const prefix = match[1];
        const check = match[2];
        const spaceAfterBracket = match[3];
        let content = match[4].trim();

        let existingNotes: SubtaskNote[] = [];
        const notesMatch = content.match(/<!--\s*notes:\s*(\[[\s\S]*?\])\s*-->/i);
        if (notesMatch) {
          try {
            existingNotes = JSON.parse(notesMatch[1]);
          } catch (e) {}
        } else {
          const legacyNoteMatch = content.match(/<!--\s*note:\s*([\s\S]*?)\s*-->/i);
          const legacyDateMatch = content.match(/<!--\s*noteDate:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s*-->/i);
          if (legacyNoteMatch) {
            existingNotes.push({
              id: 'legacy-1',
              text: legacyNoteMatch[1].trim(),
              date: legacyDateMatch ? legacyDateMatch[1].trim() : '',
              time: '00:00'
            });
          }
        }

        // Preserve checkedDate if present
        let checkedDate = '';
        const dateMatch = content.match(/<!--\s*checkedDate:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s*-->/i);
        if (dateMatch) {
          checkedDate = dateMatch[1];
        }

        content = content.replace(/<!--[\s\S]*?-->/gi, '').replace(/<!--.*$/gi, '').trim();

        const updatedNotes = existingNotes.filter(n => n.id !== noteId);
        let commentSuffix = '';
        if (checkedDate) {
          commentSuffix += ` <!--checkedDate:${checkedDate}-->`;
        }
        if (updatedNotes.length > 0) {
          commentSuffix += ` <!--notes:${JSON.stringify(updatedNotes)}-->`;
        }
        content = `${content}${commentSuffix}`;

        currentIndex++;
        return `${prefix}${check}${spaceAfterBracket}${content}`;
      }
      currentIndex++;
    }
    return line;
  });

  return updatedLines.join(delimiter);
}

/**
 * Updates or sets note on a specific task checklist item in the text by index and records noteDate
 */
export function updateTasklistItemNote(text: string, targetIndex: number, newNote: string, actionDate?: string): string {
  if (!text) return text;
  if (!newNote || !newNote.trim()) {
    // If empty string passed, clear all notes on that item
    const hasBr = /<br\s*\/?>/i.test(text);
    const delimiter = hasBr ? '<br/>' : '\n';
    const normalized = text.replace(/<br\s*\/?>/gi, '\n');

    let currentIndex = 0;
    const lines = normalized.split('\n');
    const updatedLines = lines.map(line => {
      const match = line.match(/^(\s*[-*•]?\s*\[)([ xX])(\]\s*)(.+)$/);
      if (match) {
        if (currentIndex === targetIndex) {
          const prefix = match[1];
          const check = match[2];
          const spaceAfterBracket = match[3];
          let content = match[4].trim();

          content = content.replace(/<!--\s*notes:\s*\[[\s\S]*?\]\s*-->/gi, '').trim();
          content = content.replace(/<!--\s*note:\s*[\s\S]*?\s*-->/gi, '').trim();
          content = content.replace(/<!--\s*noteDate:\s*[0-9]{4}-[0-9]{2}-[0-9]{2}\s*-->/gi, '').trim();

          currentIndex++;
          return `${prefix}${check}${spaceAfterBracket}${content}`;
        }
        currentIndex++;
      }
      return line;
    });

    return updatedLines.join(delimiter);
  }

  // Appends note
  return addSubtaskNote(text, targetIndex, newNote, actionDate);
}

/**
 * Injects a new task checklist item to the text
 */
export function appendTasklistItem(text: string, taskTitle: string): string {
  const newTaskLine = `- [ ] ${taskTitle.trim()}`;
  if (!text || text.trim() === '' || text.trim() === '-') {
    return newTaskLine;
  }
  const hasBr = /<br\s*\/?>/i.test(text);
  const delimiter = hasBr ? '<br/>' : '\n';
  return `${text.trim()}${delimiter}${newTaskLine}`;
}

/**
 * Removes a specific task checklist item from the text by its index
 */
export function removeTasklistItem(text: string, targetIndex: number): string {
  if (!text) return '';
  const hasBr = /<br\s*\/?>/i.test(text);
  const delimiter = hasBr ? '<br/>' : '\n';
  const normalized = text.replace(/<br\s*\/?>/gi, '\n');

  let currentIndex = 0;
  const lines = normalized.split('\n');
  const updatedLines = lines.filter(line => {
    const match = line.match(/^(\s*[-*•]?\s*\[)([ xX])(\]\s*)(.+)$/);
    if (match) {
      if (currentIndex === targetIndex) {
        currentIndex++;
        return false;
      }
      currentIndex++;
    }
    return true;
  });

  return updatedLines.join(delimiter);
}

/**
 * Updates the title of a specific task checklist item in the text by index, preserving existing notes and dates
 */
export function updateTasklistItemTitle(text: string, targetIndex: number, newTitle: string): string {
  if (!text) return '';
  const sanitized = newTitle.replace(/[\r\n]+/g, ' ').replace(/<!--[\s\S]*?-->/gi, '').trim();
  if (!sanitized) return text;
  const hasBr = /<br\s*\/?>/i.test(text);
  const delimiter = hasBr ? '<br/>' : '\n';
  const normalized = text.replace(/<br\s*\/?>/gi, '\n');

  let currentIndex = 0;
  const lines = normalized.split('\n');
  const updatedLines = lines.map(line => {
    const match = line.match(/^(\s*[-*•]?\s*\[)([ xX])(\]\s*)(.+)$/);
    if (match) {
      if (currentIndex === targetIndex) {
        const prefix = match[1];
        const check = match[2];
        const spaceAfterBracket = match[3];
        const oldContent = match[4].trim();

        // preserve all comments (checkedDate, notes, etc.)
        let comments = '';
        const commentsMatch = oldContent.match(/<!--[\s\S]*?-->/g);
        if (commentsMatch) {
          comments = ' ' + commentsMatch.join(' ');
        }
        currentIndex++;
        return `${prefix}${check}${spaceAfterBracket}${sanitized}${comments}`;
      }
      currentIndex++;
    }
    return line;
  });

  return updatedLines.join(delimiter);
}

/**
 * Reorders tasklist items in text given a new array of TaskItems
 */
export function reorderTasklistItems(originalText: string, newItems: TaskItem[]): string {
  if (!originalText) return '';
  const parsed = parseTasklist(originalText);
  const checklistLines = newItems.map(item => {
    let line = `- [${item.checked ? 'x' : ' '}] ${item.text}`;
    if (item.checkedDate) line += ` <!--checkedDate:${item.checkedDate}-->`;
    if (item.notes && item.notes.length > 0) {
      line += ` <!--notes:${JSON.stringify(item.notes)}-->`;
    } else if (item.note) {
      line += ` <!--note:${item.note}-->`;
      if (item.noteDate) line += ` <!--noteDate:${item.noteDate}-->`;
    }
    return line;
  });
  const delimiter = /<br\s*\/?>/i.test(originalText) ? '<br/>' : '\n';

  if (!parsed.cleanText || !parsed.cleanText.trim()) {
    return checklistLines.join(delimiter);
  }

  // If there was clean text, combine clean text and checklist lines
  return `${parsed.cleanText.trim()}${delimiter}${delimiter}${checklistLines.join(delimiter)}`;
}

// Notion color definitions for rich text highlighting (authentic Notion palette)
export const NOTION_COLORS: Record<string, { label: string; textClass: string; hex: string; bgClass: string; borderClass: string }> = {
  default: { label: 'Hitam (Default)', textClass: 'text-[#37352f]', hex: '#37352f', bgClass: 'bg-slate-100', borderClass: 'border-slate-300' },
  black: { label: 'Hitam', textClass: 'text-[#37352f]', hex: '#37352f', bgClass: 'bg-slate-100', borderClass: 'border-slate-300' },
  blue: { label: 'Biru', textClass: 'text-blue-600', hex: '#2563eb', bgClass: 'bg-blue-50', borderClass: 'border-blue-300' },
  green: { label: 'Hijau', textClass: 'text-emerald-600', hex: '#16a34a', bgClass: 'bg-emerald-50', borderClass: 'border-emerald-300' },
  orange: { label: 'Oranye', textClass: 'text-orange-600', hex: '#ea580c', bgClass: 'bg-orange-50', borderClass: 'border-orange-300' },
  red: { label: 'Merah', textClass: 'text-rose-600', hex: '#e11d48', bgClass: 'bg-rose-50', borderClass: 'border-rose-300' },
  purple: { label: 'Ungu', textClass: 'text-purple-600', hex: '#9333ea', bgClass: 'bg-purple-50', borderClass: 'border-purple-300' },
  amber: { label: 'Kuning / Amber', textClass: 'text-amber-600', hex: '#d97706', bgClass: 'bg-amber-50', borderClass: 'border-amber-300' },
  pink: { label: 'Pink', textClass: 'text-pink-600', hex: '#db2777', bgClass: 'bg-pink-50', borderClass: 'border-pink-300' },
  gray: { label: 'Abu-abu', textClass: 'text-slate-500', hex: '#787774', bgClass: 'bg-slate-50', borderClass: 'border-slate-300' }
};

const COLOR_ALIASES: Record<string, string> = {
  hitam: 'black',
  biru: 'blue',
  hijau: 'green',
  oranye: 'orange',
  merah: 'red',
  ungu: 'purple',
  kuning: 'amber',
  'abu-abu': 'gray',
  abu: 'gray'
};

/**
 * Replaces Notion color tags like [blue]text[/blue] or [color:blue]text[/color] with styled HTML spans
 */
export function formatColorTagsToHtml(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  let out = text;

  // Generic tag: [color:blue]...[/color] or [color:#hex]...[/color]
  out = out.replace(/\[color:\s*([#a-zA-Z0-9_-]+)\]([\s\S]*?)\[\/color\]/gi, (_, colorKey, content) => {
    const rawKey = colorKey.toLowerCase();
    const key = COLOR_ALIASES[rawKey] || rawKey;
    const hex = NOTION_COLORS[key]?.hex || colorKey;
    return `<span style="color: ${hex}; font-weight: 600;">${content}</span>`;
  });

  // Shorthand tags: [blue]...[/blue], [green]...[/green], [orange]...[/orange], [red]...[/red], etc.
  for (const [key, conf] of Object.entries(NOTION_COLORS)) {
    if (key === 'default') continue;
    const regex = new RegExp(`\\[${key}\\]([\\s\\S]*?)\\[\\/${key}\\]`, 'gi');
    out = out.replace(regex, `<span style="color: ${conf.hex}; font-weight: 600;">$1</span>`);
  }

  // Indonesian shorthand aliases: [biru]...[/biru], [merah]...[/merah], etc.
  for (const [idKey, enKey] of Object.entries(COLOR_ALIASES)) {
    const conf = NOTION_COLORS[enKey];
    if (conf) {
      const regex = new RegExp(`\\[${idKey}\\]([\\s\\S]*?)\\[\\/${idKey}\\]`, 'gi');
      out = out.replace(regex, `<span style="color: ${conf.hex}; font-weight: 600;">$1</span>`);
    }
  }

  return out;
}

/**
 * Strips all Notion color tags from text
 */
export function stripColorTags(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  let out = text.replace(/\[color:\s*([#a-zA-Z0-9_-]+)\]([\s\S]*?)\[\/color\]/gi, '$2');
  for (const key of Object.keys(NOTION_COLORS)) {
    const regex = new RegExp(`\\[${key}\\]([\\s\\S]*?)\\[\\/${key}\\]`, 'gi');
    out = out.replace(regex, '$1');
  }
  for (const idKey of Object.keys(COLOR_ALIASES)) {
    const regex = new RegExp(`\\[${idKey}\\]([\\s\\S]*?)\\[\\/${idKey}\\]`, 'gi');
    out = out.replace(regex, '$1');
  }
  return out;
}

/**
 * Detects if a text line has a color tag and returns the color key and clean text
 */
export function detectLineColor(line: string): { color: string; cleanText: string } {
  if (!line) return { color: 'default', cleanText: '' };
  
  for (const [key] of Object.entries(NOTION_COLORS)) {
    if (key === 'default') continue;
    const regex = new RegExp(`^\\[${key}\\]([\\s\\S]*?)\\[\\/${key}\\]$`, 'i');
    const match = line.trim().match(regex);
    if (match) {
      return { color: key, cleanText: match[1] };
    }
  }

  const genericMatch = line.trim().match(/^\[color:\s*([#a-zA-Z0-9]+)\]([\s\S]*?)\[\/color\]$/i);
  if (genericMatch) {
    const k = genericMatch[1].toLowerCase();
    return { color: NOTION_COLORS[k] ? k : 'default', cleanText: genericMatch[2] };
  }

  return { color: 'default', cleanText: line };
}

/**
 * Applies or changes the color of a single subtask text line
 */
export function applyColorToText(text: string, colorKey: string): string {
  const stripped = stripColorTags(text.trim());
  if (!stripped) return '';
  if (!colorKey || colorKey === 'default') return stripped;
  return `[${colorKey}]${stripped}[/${colorKey}]`;
}

/**
 * Converts markdown text into visual HTML for the WYSIWYG contentEditable editor and rich text viewers.
 * Ensures the user sees bold, italic, lists, badges, and colored text visually.
 */
export function markdownToVisualHtml(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';

  let html = text.replace(/\r\n/g, '\n');

  // Normalize bullet prefixes missing spaces (e.g. -**text** or •text or *text or _**text**)
  html = html.replace(/^(\s*[-*•])(?=[^\s])/gm, '$1 ');
  html = html.replace(/^(\s*_[_*])(?=[^\s])/gm, '- ');

  // Convert status badges
  html = html.replace(/\*\*\(Done\)\*\*|\[Done\]|\(Done\)/gi, '<span class="badge-done inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 mr-1 select-none">DONE</span>&nbsp;');
  html = html.replace(/\*\*\(OPEN\)\*\*|\[OPEN\]|\(OPEN\)/gi, '<span class="badge-open inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 mr-1 select-none">OPEN</span>&nbsp;');

  // Convert Color tags like [blue]...[/blue], [green]...[/green], [orange]...[/orange], etc.
  html = formatColorTagsToHtml(html);

  // Convert Bold **text** and __text__ (support multiline/embedded HTML spans)
  html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([\s\S]+?)__/g, '<strong>$1</strong>');

  // Convert Italic *text* and _text_ (excluding HTML tags)
  html = html.replace(/(^|[^\*])\*([^\*\n]+)\*([^\*]|$)/g, '$1<em>$2</em>$3');

  // Convert Strikethrough ~~text~~
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');

  // Convert Inline Code `text`
  html = html.replace(/`([^`\n]+)`/g, '<code class="px-1.5 py-0.5 bg-slate-200/80 text-teal-800 rounded font-mono text-[11px]">$1</code>');

  // Convert Line prefixes (Bullets, Ordered Lists, Blockquotes)
  const lines = html.split('\n');
  const processedLines: string[] = [];
  let inUl = false;
  let inOl = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^[•\-\*]/.test(trimmed)) {
      const content = trimmed.replace(/^[•\-\*]\s*/, '');
      if (!inUl) {
        if (inOl) { processedLines.push('</ol>'); inOl = false; }
        processedLines.push('<ul class="list-disc pl-5 space-y-1">');
        inUl = true;
      }
      processedLines.push(`<li>${content}</li>`);
    } else if (/^\d+\.\s/.test(trimmed)) {
      const content = trimmed.replace(/^\d+\.\s+/, '');
      if (!inOl) {
        if (inUl) { processedLines.push('</ul>'); inUl = false; }
        processedLines.push('<ol class="list-decimal pl-5 space-y-1">');
        inOl = true;
      }
      processedLines.push(`<li>${content}</li>`);
    } else {
      if (inUl) { processedLines.push('</ul>'); inUl = false; }
      if (inOl) { processedLines.push('</ol>'); inOl = false; }

      if (trimmed.startsWith('> ') || trimmed === '>') {
        const bqContent = trimmed.substring(1).replace(/^[>\s]+/, '').trim();
        if (!bqContent || bqContent.toLowerCase().includes('menu info')) {
          continue;
        }
        processedLines.push(`<blockquote class="border-l-4 border-teal-500 pl-3 italic text-slate-600 my-1">${bqContent}</blockquote>`);
      } else if (trimmed) {
        processedLines.push(`<div>${trimmed}</div>`);
      } else {
        processedLines.push('<div><br></div>');
      }
    }
  }

  if (inUl) processedLines.push('</ul>');
  if (inOl) processedLines.push('</ol>');

  return processedLines.join('');
}

/**
 * Converts visual HTML back to clean Markdown / text for storage.
 * Ensures data integrity and compatibility with search, diffs, and DB schemas.
 */
export function visualHtmlToMarkdown(html?: string | null): string {
  if (!html || typeof html !== 'string') return '';

  if (typeof DOMParser === 'undefined') {
    return html
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~')
      .replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~')
      .replace(/<span\s+style="color:\s*([^";]+)[^"]*">(.*?)<\/span>/gi, '[$1]$2[/$1]')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstElementChild || doc.body;

  function traverse(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Badges detection
    if (el.classList.contains('badge-done') || el.textContent?.trim() === 'DONE') {
      return '**(Done)** ';
    }
    if (el.classList.contains('badge-open') || el.textContent?.trim() === 'OPEN') {
      return '**(OPEN)** ';
    }

    let inner = '';
    el.childNodes.forEach(child => {
      inner += traverse(child);
    });

    switch (tag) {
      case 'strong':
      case 'b':
        return inner.trim() ? `**${inner.trim()}**` : '';
      case 'em':
      case 'i':
        return inner.trim() ? `*${inner.trim()}*` : '';
      case 'u':
        return inner.trim() ? `<u>${inner.trim()}</u>` : '';
      case 's':
      case 'del':
      case 'strike':
        return inner.trim() ? `~~${inner.trim()}~~` : '';
      case 'code':
        return inner.trim() ? `\`${inner.trim()}\`` : '';
      case 'span':
      case 'font': {
        const dataColor = el.getAttribute('data-color');
        if (dataColor && NOTION_COLORS[dataColor] && dataColor !== 'default') {
          return `[${dataColor}]${inner}[/${dataColor}]`;
        }

        const style = el.getAttribute('style') || '';
        const colorAttr = el.getAttribute('color') || '';
        const colorMatch = style.match(/color:\s*([^;]+)/i);
        const colorVal = colorMatch ? colorMatch[1].trim() : (colorAttr ? colorAttr.trim() : '');
        if (colorVal) {
          const c = colorVal.toLowerCase();
          let foundKey = Object.keys(NOTION_COLORS).find(k => 
            NOTION_COLORS[k].hex.toLowerCase() === c || 
            k.toLowerCase() === c
          );
          if (!foundKey && c.startsWith('rgb')) {
            const rgbMatch = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (rgbMatch) {
              const r = parseInt(rgbMatch[1], 10);
              const g = parseInt(rgbMatch[2], 10);
              const b = parseInt(rgbMatch[3], 10);
              const hex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`.toLowerCase();
              foundKey = Object.keys(NOTION_COLORS).find(k => 
                NOTION_COLORS[k].hex.toLowerCase() === hex
              );
            }
          }
          if (foundKey && foundKey !== 'default') {
            return `[${foundKey}]${inner}[/${foundKey}]`;
          }
        }
        return inner;
      }
      case 'blockquote': {
        const cleanInner = inner.trim();
        if (!cleanInner || cleanInner.toLowerCase().includes('menu info')) {
          return '';
        }
        return `> ${cleanInner}\n`;
      }
      case 'li':
        return `• ${inner.trim()}\n`;
      case 'ul':
      case 'ol':
        return `${inner}\n`;
      case 'p':
      case 'div':
        return inner ? `${inner}\n` : '\n';
      case 'br':
        return '\n';
      default:
        return inner;
    }
  }

  const result = traverse(container);
  return result.replace(/\n{3,}/g, '\n\n').trim();
}


