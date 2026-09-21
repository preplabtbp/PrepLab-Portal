import React from 'react';

export interface ParsedFindingItem {
  type: 'apd' | 'general';
  number: number;
  raw: string;
  name?: string;
  role?: string;
  items?: string[];
  note?: string;
}

/**
 * Utility to parse finding descriptions into structured list items.
 * Handles:
 * 1. Numbered lists on one line or multiline ("1. ... 2. ... 3. ...")
 * 2. Newline separated items ("Item A\nItem B")
 * 3. Bullet points ("• Item A\n• Item B" or "- Item A\n- Item B")
 * 4. Specific APD non-compliance format:
 *    "Ketidakpatuhan APD: [Nama] ([Role/Seksi]) - Tidak lengkap: [APD 1, APD 2], Ket: [Catatan]"
 */
export function parseFindingDescription(rawDescription?: string | null): ParsedFindingItem[] {
  if (!rawDescription) return [];
  const text = String(rawDescription).trim();
  if (!text) return [];

  // 1. Check if text has numbered items like "1. ... 2. ..." or "1) ... 2) ..."
  const hasNumberedList = /^\s*1[\.\)]\s+/m.test(text) || /(?:^|\s+)2[\.\)]\s+/.test(text);

  let rawItems: string[] = [];

  if (hasNumberedList) {
    // Split on numbered prefixes: start of string or whitespace followed by digit + . or )
    rawItems = text
      .split(/(?:^|\s+)(?=\d+[\.\)]\s+)/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(p => p.replace(/^\d+[\.\)]\s*/, '').trim());
  } else if (text.includes('\n') || text.includes('•')) {
    // Split by newlines or bullet dots
    rawItems = text
      .split(/\n+/)
      .flatMap(line => line.split(/\s*•\s*/))
      .map(l => l.replace(/^[-*•]\s*/, '').trim())
      .filter(Boolean);
  } else {
    rawItems = [text];
  }

  // Fallback if split produced empty
  if (rawItems.length === 0) {
    rawItems = [text];
  }

  return rawItems.map((str, idx) => {
    // Check if it's APD pattern: "Ketidakpatuhan APD: Name (Role) - Tidak lengkap: X, Y, Ket: Z"
    const apdMatch = str.match(/Ketidakpatuhan APD:\s*([^(]+?)(?:\s*\(([^)]+)\))?\s*-\s*Tidak lengkap:\s*(.*?)(?:,\s*Ket:\s*(.+))?$/i);
    if (apdMatch) {
      const name = apdMatch[1]?.trim() || '';
      const role = apdMatch[2]?.trim() || '';
      const apdItems = (apdMatch[3] || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const note = apdMatch[4]?.trim();

      return {
        type: 'apd',
        number: idx + 1,
        raw: str,
        name,
        role,
        items: apdItems,
        note
      };
    }

    return {
      type: 'general',
      number: idx + 1,
      raw: str
    };
  });
}

interface StructuredFindingListProps {
  description?: string | null;
  className?: string;
}

/**
 * Clean & minimalist finding description list.
 * Displays clean numbered list lines without bulky gradients, heavy boxes, or flashy elements.
 */
export function StructuredFindingList({
  description,
  className = ''
}: StructuredFindingListProps) {
  const items = parseFindingDescription(description);

  if (items.length === 0) {
    return (
      <p className="text-sm italic text-slate-400">Tidak ada rincian deskripsi temuan.</p>
    );
  }

  // If there's only 1 general item without any list format
  if (items.length === 1 && items[0].type === 'general') {
    return (
      <p className={`text-sm font-medium text-rose-600 dark:text-rose-400 leading-relaxed whitespace-pre-line break-words ${className}`}>
        {items[0].raw}
      </p>
    );
  }

  return (
    <ol className={`space-y-1.5 text-sm text-slate-800 dark:text-slate-200 ${className}`}>
      {items.map((item, idx) => (
        <li key={idx} className="flex items-start gap-2 leading-relaxed">
          <span className="font-bold text-rose-600 dark:text-rose-400 shrink-0 select-none min-w-[1.25rem]">
            {item.number}.
          </span>
          <div className="flex-1">
            {item.type === 'apd' ? (
              <span>
                <strong className="text-slate-900 dark:text-slate-100 font-semibold">{item.name}</strong>
                {item.role && <span className="text-slate-500 text-xs ml-1">({item.role})</span>}
                <span className="text-slate-400 mx-1.5">—</span>
                <span className="text-rose-600 dark:text-rose-400 font-medium">
                  Tidak lengkap: {item.items?.join(', ')}
                </span>
                {item.note && (
                  <span className="text-slate-500 text-xs ml-1.5 italic">
                    (Ket: {item.note})
                  </span>
                )}
              </span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 font-medium whitespace-pre-line break-words">
                {item.raw}
              </span>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Compact preview for cards and table previews
 */
export function CompactFindingPreview({
  description,
  maxItems = 2,
  className = ''
}: {
  description?: string | null;
  maxItems?: number;
  className?: string;
}) {
  const items = parseFindingDescription(description);

  if (items.length === 0) {
    return <span className="text-slate-400 italic">Tidak ada deskripsi</span>;
  }

  if (items.length === 1 && items[0].type === 'general') {
    return (
      <span className={`line-clamp-2 leading-relaxed ${className}`}>
        {items[0].raw}
      </span>
    );
  }

  const displayed = items.slice(0, maxItems);
  const remaining = items.length - maxItems;

  return (
    <div className={`space-y-1 ${className}`}>
      {displayed.map((item, idx) => (
        <div key={idx} className="flex items-start gap-1.5 text-xs">
          <span className="font-bold text-rose-600 shrink-0">
            {item.number}.
          </span>
          <span className="line-clamp-1 text-slate-700 dark:text-slate-300">
            {item.type === 'apd' ? (
              <>
                <strong className="text-slate-900 dark:text-white font-medium">{item.name}</strong>
                {item.items && item.items.length > 0 ? `: ${item.items.join(', ')}` : ''}
              </>
            ) : (
              item.raw
            )}
          </span>
        </div>
      ))}
      {remaining > 0 && (
        <p className="text-[11px] text-rose-600 font-medium pl-3.5">
          +{remaining} temuan lainnya...
        </p>
      )}
    </div>
  );
}
