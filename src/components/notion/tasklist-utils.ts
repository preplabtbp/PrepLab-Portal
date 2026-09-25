// Smart Tasklist Utilities for Notion Database Tables

export interface TaskItem {
  index: number;
  checked: boolean;
  text: string;
  rawLine: string;
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
 * Parses markdown text to detect and extract interactive task list items
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
    const match = trimmed.match(/^[-*]?\s*\[([ xX])\]\s*(.+)$/);
    if (match) {
      const isChecked = match[1].toLowerCase() === 'x';
      const itemText = match[2].trim();
      items.push({
        index: itemIndex++,
        checked: isChecked,
        text: itemText,
        rawLine: trimmed
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
 * Toggles a specific task checklist item in the text by index
 */
export function toggleTasklistItem(text: string, targetIndex: number): string {
  if (!text) return text;

  const hasBr = /<br\s*\/?>/i.test(text);
  const delimiter = hasBr ? '<br/>' : '\n';
  const normalized = text.replace(/<br\s*\/?>/gi, '\n');

  let currentIndex = 0;
  const lines = normalized.split('\n');
  const updatedLines = lines.map(line => {
    // Check if line contains a task item
    const match = line.match(/^(\s*[-*•]?\s*\[)([ xX])(\]\s*.+)$/);
    if (match) {
      if (currentIndex === targetIndex) {
        const currentChecked = match[2].toLowerCase() === 'x';
        const newCheck = currentChecked ? ' ' : 'x';
        currentIndex++;
        return `${match[1]}${newCheck}${match[3]}`;
      }
      currentIndex++;
    }
    return line;
  });

  // If text had bullet-separated format (e.g. "• [ ] task1 • [x] task2")
  if (currentIndex <= targetIndex && normalized.includes('•')) {
    let bulletIdx = 0;
    const bulletParts = normalized.split('•');
    const updatedParts = bulletParts.map(part => {
      const match = part.match(/^(\s*\[)([ xX])(\]\s*.+)$/);
      if (match) {
        if (bulletIdx === targetIndex) {
          const currentChecked = match[2].toLowerCase() === 'x';
          const newCheck = currentChecked ? ' ' : 'x';
          bulletIdx++;
          return `${match[1]}${newCheck}${match[3]}`;
        }
        bulletIdx++;
      }
      return part;
    });
    return updatedParts.join('•');
  }

  return updatedLines.join(delimiter);
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
 * Reorders tasklist items in text given a new array of TaskItems
 */
export function reorderTasklistItems(originalText: string, newItems: TaskItem[]): string {
  if (!originalText) return '';
  const parsed = parseTasklist(originalText);
  const checklistLines = newItems.map(item => `- [${item.checked ? 'x' : ' '}] ${item.text}`);
  const delimiter = /<br\s*\/?>/i.test(originalText) ? '<br/>' : '\n';

  if (!parsed.cleanText || !parsed.cleanText.trim()) {
    return checklistLines.join(delimiter);
  }

  // If there was clean text, combine clean text and checklist lines
  return `${parsed.cleanText.trim()}${delimiter}${delimiter}${checklistLines.join(delimiter)}`;
}

/**
 * Converts markdown text into visual HTML for the WYSIWYG contentEditable editor and rich text viewers.
 * Ensures the user sees bold, italic, lists, and badges visually instead of raw tokens like **bold**.
 */
export function markdownToVisualHtml(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';

  let html = text.replace(/\r\n/g, '\n');

  // Convert status badges
  html = html.replace(/\*\*\(Done\)\*\*|\[Done\]|\(Done\)/gi, '<span class="badge-done inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 mr-1 select-none">DONE</span>&nbsp;');
  html = html.replace(/\*\*\(OPEN\)\*\*|\[OPEN\]|\(OPEN\)/gi, '<span class="badge-open inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 mr-1 select-none">OPEN</span>&nbsp;');

  // Convert Bold **text** and __text__
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

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
    if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const content = trimmed.replace(/^[•\-\*]\s+/, '');
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

      if (trimmed.startsWith('> ')) {
        processedLines.push(`<blockquote class="border-l-4 border-teal-500 pl-3 italic text-slate-600 my-1">${trimmed.substring(2)}</blockquote>`);
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
      case 'blockquote':
        return inner.trim() ? `> ${inner.trim()}\n` : '';
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

