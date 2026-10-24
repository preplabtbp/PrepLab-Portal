import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface ColumnDef {
  id: string;
  defaultWidth: number;
  minWidth?: number;
  maxWidth?: number;
  label?: string;
  align?: 'left' | 'center' | 'right';
}

interface UseTableColumnResizeOptions {
  tableId: string;
  columns: ColumnDef[];
  storageKey?: string;
}

export function useTableColumnResize({
  tableId,
  columns,
  storageKey
}: UseTableColumnResizeOptions) {
  const finalStorageKey = storageKey || `preplab_col_widths_${tableId}_v2`;
  const defaultWidths = useMemo(() => {
    const map: Record<string, number> = {};
    columns.forEach(col => {
      map[col.id] = col.defaultWidth;
    });
    return map;
  }, [columns]);

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(finalStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          return { ...defaultWidths, ...parsed };
        }
      }
    } catch {}
    return defaultWidths;
  });

  const [isAutofit, setIsAutofit] = useState<boolean>(false);
  const [resizingCol, setResizingCol] = useState<string | null>(null);

  const resizeStartXRef = useRef<number>(0);
  const resizeStartWidthRef = useRef<number>(0);
  const resizingColRef = useRef<string | null>(null);

  // Sync default widths if columns change
  useEffect(() => {
    setColWidths(prev => {
      const next = { ...prev };
      let changed = false;
      columns.forEach(c => {
        if (next[c.id] === undefined) {
          next[c.id] = c.defaultWidth;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [columns]);

  const saveWidths = useCallback((widths: Record<string, number>) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(finalStorageKey, JSON.stringify(widths));
      }
    } catch {}
  }, [finalStorageKey]);

  const getColWidth = useCallback((colId: string): number => {
    return colWidths[colId] || defaultWidths[colId] || 120;
  }, [colWidths, defaultWidths]);

  const handleResizeStart = useCallback((
    e: React.MouseEvent | React.TouchEvent,
    colId: string,
    currentDomWidth?: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const initialWidth = currentDomWidth && currentDomWidth > 0 ? currentDomWidth : getColWidth(colId);

    resizeStartXRef.current = clientX;
    resizeStartWidthRef.current = initialWidth;
    resizingColRef.current = colId;
    setResizingCol(colId);
    setIsAutofit(false);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const colConfig = columns.find(c => c.id === colId);
    const minW = colConfig?.minWidth || 45;
    const maxW = colConfig?.maxWidth || 800;

    const onMove = (moveEvent: MouseEvent | TouchEvent) => {
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : (moveEvent as MouseEvent).clientX;
      const deltaX = currentX - resizeStartXRef.current;
      const newWidth = Math.max(minW, Math.min(maxW, Math.round(resizeStartWidthRef.current + deltaX)));

      setColWidths(prev => {
        const next = { ...prev, [colId]: newWidth };
        return next;
      });
    };

    const onEnd = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      setResizingCol(null);
      resizingColRef.current = null;

      setColWidths(curr => {
        saveWidths(curr);
        return curr;
      });
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, [getColWidth, columns, saveWidths]);

  const handleResetCol = useCallback((colId: string) => {
    const def = defaultWidths[colId] || 120;
    setColWidths(prev => {
      const next = { ...prev, [colId]: def };
      saveWidths(next);
      return next;
    });
  }, [defaultWidths, saveWidths]);

  const handleResetAll = useCallback(() => {
    setColWidths(defaultWidths);
    setIsAutofit(false);
    saveWidths(defaultWidths);
  }, [defaultWidths, saveWidths]);

  const handleToggleAutofit = useCallback(() => {
    setIsAutofit(prev => !prev);
  }, []);

  const isAnyResized = useMemo(() => {
    return Object.keys(colWidths).some(k => colWidths[k] !== defaultWidths[k]);
  }, [colWidths, defaultWidths]);

  const totalTableWidth = useMemo(() => {
    return columns.reduce((sum, col) => sum + (colWidths[col.id] || col.defaultWidth), 0);
  }, [columns, colWidths]);

  return {
    colWidths,
    setColWidths,
    getColWidth,
    handleResizeStart,
    handleResetCol,
    handleResetAll,
    handleResetAllColumns: handleResetAll,
    handleToggleAutofit,
    isAutofit,
    setIsAutofit,
    resizingCol,
    isAnyResized,
    isAnyColumnResized: isAnyResized,
    totalTableWidth
  };
}

export function ColumnResizeHandle({
  colId,
  isResizing,
  onResizeStart,
  onResetCol,
  title
}: {
  colId: string;
  isResizing: boolean;
  onResizeStart: (e: React.MouseEvent | React.TouchEvent, colId: string, currentDomWidth?: number) => void;
  onResetCol: (colId: string) => void;
  title?: string;
}) {
  return React.createElement(
    'div',
    {
      onMouseDown: (e: React.MouseEvent) => onResizeStart(e, colId, (e.currentTarget.parentElement?.offsetWidth)),
      onTouchStart: (e: React.TouchEvent) => onResizeStart(e, colId, (e.currentTarget.parentElement?.offsetWidth)),
      onClick: (e: React.MouseEvent) => e.stopPropagation(),
      onDoubleClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onResetCol(colId);
      },
      title: title || 'Geser untuk menyesuaikan lebar kolom. Klik ganda untuk reset.',
      className: `absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center z-20 group/resizer hover:bg-teal-500/25 active:bg-teal-500/40 transition-colors ${
        isResizing ? 'bg-teal-500/35 w-3.5' : ''
      }`
    },
    React.createElement('div', {
      className: `w-[2px] transition-all rounded-full ${
        isResizing
          ? 'bg-teal-600 dark:bg-teal-400 h-full'
          : 'bg-slate-300 dark:bg-slate-600 h-3.5 group-hover/resizer:bg-teal-500 group-hover/resizer:h-5'
      }`
    })
  );
}
