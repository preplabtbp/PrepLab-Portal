import React from 'react';
import { AlertCircle, User, ShieldAlert, FileText, Info } from 'lucide-react';

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
  isCompact?: boolean;
}

export function StructuredFindingList({
  description,
  className = '',
  isCompact = false
}: StructuredFindingListProps) {
  const items = parseFindingDescription(description);

  if (items.length === 0) {
    return (
      <p className="text-sm italic text-slate-400">Tidak ada rincian deskripsi temuan.</p>
    );
  }

  // If there's only 1 general item without any special formatting
  if (items.length === 1 && items[0].type === 'general') {
    return (
      <div className={`p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 ${className}`}>
        <p className="text-sm font-medium leading-relaxed whitespace-pre-line break-words">
          {items[0].raw}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {items.map((item, idx) => {
        if (item.type === 'apd') {
          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-gradient-to-r from-rose-50/80 via-white to-rose-50/30 dark:from-rose-950/25 dark:via-slate-900 dark:to-rose-950/10 border border-rose-200 dark:border-rose-900/50 shadow-xs hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-3">
                {/* Number Badge */}
                <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  {item.number}
                </span>

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Personil Header */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-sm">
                      <User className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{item.name}</span>
                    </div>

                    {item.role && (
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                        {item.role}
                      </span>
                    )}
                  </div>

                  {/* Missing APD Badges */}
                  {item.items && item.items.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                        <span>Tidak Lengkap:</span>
                      </span>
                      {item.items.map((apd, aIdx) => (
                        <span
                          key={aIdx}
                          className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/40 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800/60 shadow-2xs"
                        >
                          <span className="text-[10px] text-rose-600">✕</span>
                          {apd}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Notes / Keterangan */}
                  {item.note && (
                    <div className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 px-2.5 py-1.5 rounded-lg">
                      <Info className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        <strong className="text-amber-800 dark:text-amber-300">Ket:</strong> {item.note}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        }

        // General finding list item
        return (
          <div
            key={idx}
            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-3 hover:border-slate-300 transition-colors"
          >
            <span className="w-6 h-6 rounded-lg bg-slate-700 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              {item.number}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line break-words">
                {item.raw}
              </p>
            </div>
          </div>
        );
      })}
    </div>
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
    <div className={`space-y-1.5 ${className}`}>
      {displayed.map((item, idx) => (
        <div key={idx} className="flex items-start gap-1.5 text-xs">
          <span className="w-4 h-4 rounded bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
            {item.number}
          </span>
          <span className="line-clamp-1 font-medium text-slate-700 dark:text-slate-300">
            {item.type === 'apd' ? (
              <>
                <strong className="text-slate-900 dark:text-white">{item.name}</strong>
                {item.items && item.items.length > 0 ? `: ${item.items.join(', ')}` : ''}
              </>
            ) : (
              item.raw
            )}
          </span>
        </div>
      ))}
      {remaining > 0 && (
        <p className="text-[11px] text-rose-600 font-semibold pl-5">
          +{remaining} temuan personil lainnya...
        </p>
      )}
    </div>
  );
}
