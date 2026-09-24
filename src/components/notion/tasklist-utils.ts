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
}

// Regex to capture markdown task list items
const TASK_REGEX = /(?:^|\n|•|\-)\s*\[([ xX])\]\s*([^\n•\r]+)/g;

/**
 * Parses markdown text to detect and extract interactive task list items
 */
export function parseTasklist(text?: string | null): TasklistProgress {
  if (!text || typeof text !== 'string') {
    return { hasTasklist: false, total: 0, completed: 0, percentage: 0, isAllCompleted: false, items: [] };
  }

  // Normalize <br/>, <br>, <br /> tags into \n
  const normalized = text.replace(/<br\s*\/?>/gi, '\n');
  const items: TaskItem[] = [];
  const lines = normalized.split(/\r?\n|•/);
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
    items
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
