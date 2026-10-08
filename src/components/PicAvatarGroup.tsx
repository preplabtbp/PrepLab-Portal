import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { User } from 'lucide-react';

export interface PicItem {
  nik?: string;
  name: string;
}

interface PicAvatarGroupProps {
  pics: PicItem[] | string | null | undefined;
  employeesList?: any[];
  maxDisplay?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

// Generate consistent aesthetic colors for avatars without photo
const AVATAR_GRADIENTS = [
  'from-teal-600 to-emerald-700',
  'from-indigo-600 to-blue-700',
  'from-purple-600 to-violet-700',
  'from-rose-600 to-pink-700',
  'from-amber-600 to-orange-700',
  'from-cyan-600 to-teal-700',
  'from-blue-600 to-cyan-700',
  'from-slate-700 to-slate-900',
];

function getGradientForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx];
}

export function PicAvatarGroup({
  pics,
  employeesList = [],
  maxDisplay = 5,
  size = 'sm',
  className = ''
}: PicAvatarGroupProps) {
  // Parse input if string or array with intelligent NIK & name extraction
  const parsedPics: PicItem[] = useMemo(() => {
    if (!pics) return [];
    if (Array.isArray(pics)) {
      return pics.filter(p => p && p.name && p.name.trim() !== '' && p.name !== '-');
    }
    if (typeof pics === 'string') {
      const trimmed = pics.trim();
      if (!trimmed || trimmed === '-' || trimmed === '•') return [];
      return trimmed
        .split(/[,;\n]+/)
        .map(s => s.trim())
        .filter(s => s && s !== '-' && s !== '•')
        .map(raw => {
          // Check if string contains NIK in parenthesis e.g. "Name (12345)"
          const parenMatch = raw.match(/^(.*?)\s*\((\d+)\)$/);
          if (parenMatch) {
            return { name: parenMatch[1].trim(), nik: parenMatch[2].trim() };
          }
          // Check if string is "12345 - Name"
          const dashMatch = raw.match(/^(\d+)\s*[-–]\s*(.*)$/);
          if (dashMatch) {
            return { name: dashMatch[2].trim(), nik: dashMatch[1].trim() };
          }
          // Check if string is purely numeric (NIK)
          if (/^\d+$/.test(raw)) {
            return { name: raw, nik: raw };
          }
          return { name: raw };
        });
    }
    return [];
  }, [pics]);

  // Current user info from localStorage if available
  const currentUserNik = typeof window !== 'undefined' ? (localStorage.getItem('inspector_nik') || '').trim() : '';
  const currentUserName = typeof window !== 'undefined' ? (localStorage.getItem('inspector_name') || '').trim().toLowerCase() : '';

  // Hover state for portal tooltip card
  const [hoveredPic, setHoveredPic] = useState<{
    rect: DOMRect;
    pic: PicItem;
    employee: any;
  } | null>(null);

  // Fallback state for broken images
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Helper to match employee from master list
  const getEmployeeData = (pic: PicItem) => {
    if (!employeesList || employeesList.length === 0) return null;
    const picNik = (pic.nik || '').trim();
    const picName = (pic.name || '').trim().toLowerCase();

    // Priority 1: Match strictly by NIK
    if (picNik) {
      const byNik = employeesList.find(emp => emp.nik === picNik || String(emp.nik) === picNik);
      if (byNik) return byNik;
    }

    // Priority 2: Match strictly by exact Name
    if (picName) {
      const byExact = employeesList.find(emp => {
        const empName = (emp.name || emp.nama || '').trim().toLowerCase();
        return empName === picName;
      });
      if (byExact) return byExact;

      // Priority 3: Match whole word (e.g. "Gusti" matches "Gusti Nur Firdaus", but NOT partial substring in middle of unrelated word)
      if (picName.length >= 3) {
        const byWords = employeesList.find(emp => {
          const empName = (emp.name || emp.nama || '').trim().toLowerCase();
          const words = empName.split(/\s+/);
          return words.includes(picName) || empName.startsWith(picName);
        });
        if (byWords) return byWords;
      }
    }

    return null;
  };

  if (parsedPics.length === 0) {
    return <span className="text-slate-400 font-mono text-xs">-</span>;
  }

  const visiblePics = parsedPics.slice(0, maxDisplay);
  const remainingCount = parsedPics.length - maxDisplay;

  // Size dimensions
  const circleDimensions = size === 'xs' 
    ? 'w-5 h-5 text-[9px]' 
    : size === 'md' 
    ? 'w-8 h-8 text-xs' 
    : 'w-[26px] h-[26px] text-[10px]';

  return (
    <div className={`inline-flex items-center -space-x-1.5 hover:space-x-0.5 transition-all duration-200 select-none py-0.5 ${className}`}>
      {visiblePics.map((p, idx) => {
        const emp = getEmployeeData(p);
        // Prioritize original pic name so custom or exact name is never hijacked
        const resolvedName = p.name && p.name !== '-' ? p.name : (emp?.name || emp?.nama || 'PIC');
        const initial = resolvedName ? resolvedName.charAt(0).toUpperCase() : '?';
        const photoUrl = emp?.avatar || emp?.photo || (emp?.nik ? `/api/employees/photo/${emp.nik}` : null);
        const imgKey = emp?.nik || p.nik || p.name;
        const isBroken = brokenImages[imgKey];
        const gradient = getGradientForName(resolvedName);

        return (
          <div
            key={idx}
            className={`relative rounded-full ring-2 ring-white dark:ring-[#191919] shadow-xs cursor-pointer shrink-0 transition-transform duration-150 hover:scale-125 hover:z-30 ${circleDimensions}`}
            onMouseEnter={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredPic({ rect, pic: p, employee: emp });
            }}
            onMouseLeave={() => setHoveredPic(null)}
          >
            {photoUrl && !isBroken ? (
              <img
                src={photoUrl}
                alt={resolvedName}
                onError={() => setBrokenImages(prev => ({ ...prev, [imgKey]: true }))}
                className="w-full h-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className={`w-full h-full rounded-full bg-gradient-to-br ${gradient} text-white font-black flex items-center justify-center uppercase shadow-inner`}>
                {initial}
              </div>
            )}
          </div>
        );
      })}

      {/* Overflow indicator if more than maxDisplay */}
      {remainingCount > 0 && (
        <div
          className={`relative rounded-full ring-2 ring-white dark:ring-[#191919] bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono font-bold flex items-center justify-center cursor-pointer shrink-0 shadow-xs hover:scale-110 hover:z-30 transition-transform ${circleDimensions}`}
          title={`${remainingCount} PIC lainnya: ${parsedPics.slice(maxDisplay).map(p => p.name).join(', ')}`}
        >
          +{remainingCount}
        </div>
      )}

      {/* Portal Tooltip / Hover Card (Rendered at Body level to prevent clipping) */}
      {hoveredPic && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed pointer-events-none z-[99999] animate-in fade-in zoom-in-95 duration-150"
          style={{
            // Position above if space available, otherwise below
            top: hoveredPic.rect.top > 160 
              ? `${hoveredPic.rect.top - 10}px` 
              : `${hoveredPic.rect.bottom + 10}px`,
            left: `${Math.max(140, Math.min(window.innerWidth - 140, hoveredPic.rect.left + hoveredPic.rect.width / 2))}px`,
            transform: hoveredPic.rect.top > 160 ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
          }}
        >
          {(() => {
            const emp = hoveredPic.employee;
            const pic = hoveredPic.pic;
            const name = emp?.name || emp?.nama || pic.name;
            const nik = emp?.nik || pic.nik || null;
            const jabatan = emp?.jabatan || emp?.role || emp?.position || null;
            const section = emp?.section || emp?.department || emp?.seksi || 'General';
            const pt = emp?.pt || null;
            const photoUrl = emp?.avatar || emp?.photo || (nik ? `/api/employees/photo/${nik}` : null);
            const initial = name ? name.charAt(0).toUpperCase() : '?';
            const gradient = getGradientForName(name);

            const isSelf = (nik && currentUserNik && nik === currentUserNik) || 
                           (name && currentUserName && name.toLowerCase() === currentUserName);

            const localTimeStr = new Intl.DateTimeFormat('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            }).format(new Date()) + ' WITA local time';

            return (
              <div className="bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-slate-100 rounded-2xl p-3.5 shadow-2xl border-2 border-slate-300 dark:border-slate-700 w-76 flex items-center gap-3 backdrop-blur-xl">
                {/* Left: Large Avatar Image */}
                <div className="w-[52px] h-[52px] rounded-full overflow-hidden shrink-0 border-2 border-slate-200 dark:border-slate-700 shadow-sm bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${gradient} text-white font-black text-xl flex items-center justify-center uppercase shadow-inner`}>
                      {initial}
                    </div>
                  )}
                </div>

                {/* Right: Info Stack matching screenshot */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <h4 className="font-black text-sm text-slate-950 dark:text-white leading-tight truncate" title={name}>
                    {name} {isSelf && <span className="font-bold text-teal-600 dark:text-teal-400">(You)</span>}
                  </h4>

                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
                    {section} {pt ? `(${pt})` : ''}
                  </p>

                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                    {jabatan ? `${jabatan} • ` : ''}{localTimeStr}
                  </p>

                  {nik && (
                    <div className="pt-0.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.2 rounded border border-slate-300 dark:border-slate-700">
                        NIK: {nik}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>,
        document.body
      )}
    </div>
  );
}
