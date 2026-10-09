import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Download, 
  Plus, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Tag, 
  Calendar, 
  Layers, 
  Table as TableIcon, 
  Kanban, 
  LayoutList, 
  X, 
  ChevronRight, 
  ExternalLink, 
  Sparkles, 
  ClipboardList, 
  FileText, 
  MessageSquare, 
  Send, 
  Trash2, 
  Bell, 
  Loader2, 
  CornerDownRight, 
  Activity, 
  Check, 
  Paperclip, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  FileDown, 
  Maximize2, 
  Minimize2, 
  ZoomIn, 
  ZoomOut, 
  FileCheck, 
  Edit2, 
  Save,
  Upload,
  Reply,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  CheckSquare,
  CalendarDays,
  MoreVertical,
  MoreHorizontal,
  Sun,
  Moon,
  RotateCcw,
  TableProperties,
  GripVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui';
import { toast } from 'sonner';
import { uploadPhotoToDrive } from '../sheets-api';
import { ImageModal } from './image-modal';
import { parseTasklist, toggleTasklistItem, formatColorTagsToHtml, NOTION_COLORS, TasklistProgress, markdownToVisualHtml, migrateLegacySubtaskText } from './notion/tasklist-utils';
import { NotionTasklistView } from './notion/NotionTasklistView';
import { NotionDropdownCell } from './notion/NotionDropdownCell';
import { NotionInlineEditor } from './notion/NotionInlineEditor';
import { NotionSaveConfirmationModal } from './notion/NotionSaveConfirmationModal';
import { EnterpriseWysiwygEditor } from './notion/EnterpriseWysiwygEditor';
import { SharedSubtaskManager } from './notion/SharedSubtaskManager';
import { FloatingSelectionToolbar, FormatAction, formatSelectedText } from './notion/FloatingSelectionToolbar';
import { PicAvatarGroup, smartSplitPicString } from './PicAvatarGroup';
import {
  normalizeCadence,
  isPeriodicCadence,
  generateSubPeriods,
  getDefaultActiveSubPeriod,
  getNextSubPeriod,
  getNextDefaultTargetDate,
  getNextPeriodSchedule,
  resetAllTasklistItems,
  detectRowSubPeriod,
  getTopicSubPeriods,
  RoutineCadence
} from './notion/period-utils';

export interface CommentAttachmentItem {
  id?: string;
  name: string;
  url: string;
  directUrl?: string;
  driveViewUrl?: string;
  driveDownloadUrl?: string;
  isImage?: boolean;
  mimeType?: string;
  size?: number;
  caption?: string;
}

export function formatNotionCommentTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < 0) return 'Just now';
  
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffHours < 1) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Ekstraksi Google Drive ID dari link / format Drive
export const extractDriveId = (item: any): string | null => {
  if (!item) return null;
  if (typeof item === 'string') {
    const directMatch = item.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (directMatch) return directMatch[1];
    const idMatch = item.match(/id=([a-zA-Z0-9_-]+)/);
    if (idMatch) return idMatch[1];
    const viewMatch = item.match(/\/view\/([a-zA-Z0-9_-]+)/);
    if (viewMatch) return viewMatch[1];
    if (/^[a-zA-Z0-9_-]{25,}$/.test(item.trim())) return item.trim();
    return null;
  }
  if (typeof item === 'object') {
    if (item.id && /^[a-zA-Z0-9_-]{25,}$/.test(String(item.id).trim())) {
      return String(item.id).trim();
    }
    const candidate = item.directUrl || item.url || item.driveViewUrl || item.fileUrl;
    if (candidate && typeof candidate === 'string') {
      return extractDriveId(candidate);
    }
  }
  return null;
};

// Parser seragam untuk mengekstrak lampiran file dari komentar
export const parseCommentAttachments = (fileUrl?: string | null, fileName?: string | null, content?: string | null): CommentAttachmentItem[] => {
  let extractedUrl = fileUrl;
  let extractedName = fileName;

  if (content && (!extractedUrl || extractedUrl.trim() === '')) {
    const mdLinkMatch = content.match(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/);
    if (mdLinkMatch) {
      extractedName = mdLinkMatch[1];
      extractedUrl = mdLinkMatch[2];
    } else {
      const rawUrlMatch = content.match(/(https?:\/\/[^\s]+)/);
      if (rawUrlMatch) {
        extractedUrl = rawUrlMatch[1];
      }
    }
  }

  const targetUrl = extractedUrl || fileUrl;
  if (!targetUrl && !content) return [];

  // Ambil nama file & caption dari teks content jika formatnya "📎 Lampiran Foto / Dokumen: filename.ext"
  let contentExtractedName = '';
  let fallbackCaption = '';
  if (content) {
    const m = content.match(/📎\s*(?:Lampiran Foto \/ Dokumen|Lampiran Media|Lampiran):\s*([^\n\r]+)/i);
    if (m && m[1]) {
      contentExtractedName = m[1].trim();
    }
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 1 && lines[0].startsWith('📎')) {
      fallbackCaption = lines.slice(1).join(' ').replace(/^caption:\s*/i, '');
    } else {
      const capMatch = content.match(/(?:caption|keterangan):\s*([^\n\r]+)/i);
      if (capMatch) fallbackCaption = capMatch[1].trim();
    }
  }

  if (targetUrl) {
    try {
      const trimmed = targetUrl.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => {
            const name = item.name || extractedName || contentExtractedName || 'Attachment';
            const driveId = extractDriveId(item);
            const isImg = 
              item.category === 'image' || 
              (item.mimeType && item.mimeType.startsWith('image/')) ||
              /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name) ||
              (item.directUrl && (item.directUrl.includes('lh3.googleusercontent.com') || item.directUrl.startsWith('data:image/')));
            
            const directUrl = driveId ? `/api/drive/view/${driveId}` : (item.directUrl || item.url || item.fileUrl || '');
            const driveDownloadUrl = driveId ? `/api/drive/download/${driveId}` : (item.driveDownloadUrl || item.url || item.fileUrl || '');
            const driveViewUrl = driveId ? `https://drive.google.com/file/d/${driveId}/view?usp=sharing` : (item.driveViewUrl || item.url || item.fileUrl || '');

            return {
              id: driveId || item.id,
              name,
              url: directUrl,
              directUrl,
              driveViewUrl,
              driveDownloadUrl,
              isImage: Boolean(isImg),
              mimeType: item.mimeType,
              size: item.size,
              caption: item.caption || item.description || fallbackCaption || undefined
            };
          });
        }
      }
    } catch (e) {}

    const driveId = extractDriveId({ fileUrl: targetUrl });
    const name = extractedName || contentExtractedName || (driveId ? 'Foto / Dokumen Lampiran' : 'Attachment');
    const isDoc = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|txt|csv)$/i.test(name);
    const isImg = !isDoc && (
      /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name) ||
      /\.(jpg|jpeg|png|gif|webp|svg|bmp)/i.test(targetUrl) ||
      targetUrl.startsWith('data:image/') ||
      Boolean(driveId)
    );

    const directUrl = driveId ? `/api/drive/view/${driveId}` : targetUrl;
    const driveDownloadUrl = driveId ? `/api/drive/download/${driveId}` : targetUrl;
    const driveViewUrl = driveId ? `https://drive.google.com/file/d/${driveId}/view?usp=sharing` : targetUrl;

    return [{
      id: driveId || undefined,
      name,
      url: directUrl,
      directUrl,
      driveViewUrl,
      driveDownloadUrl,
      isImage: Boolean(isImg),
      caption: fallbackCaption || undefined
    }];
  }

  return [];
};

export const NotionAttachmentThumbnail = ({
  attachment,
  onPreview,
  overlayBadge
}: {
  attachment: CommentAttachmentItem;
  onPreview: (att: CommentAttachmentItem) => void;
  overlayBadge?: string;
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [fallbackStage, setFallbackStage] = useState(0);

  const driveId = attachment.id || extractDriveId(attachment.directUrl || attachment.url);

  if (!attachment.isImage || imgFailed) {
    return (
      <div className="flex flex-col items-start gap-1">
        <div
          onClick={() => onPreview(attachment)}
          className="flex items-center gap-1.5 p-1.5 px-2.5 rounded-lg border hover:border-teal-500/60 transition-all cursor-pointer group shadow-xs max-w-xs text-xs"
          style={{
            backgroundColor: 'var(--input-bg, #1a1a1a)',
            borderColor: 'var(--border-main, #334155)'
          }}
          title={`Buka / Unduh: ${attachment.name}`}
        >
          <div className="w-5 h-5 rounded bg-teal-950/80 border border-teal-700/50 flex items-center justify-center text-teal-400 shrink-0">
            <FileText className="w-3 h-3" />
          </div>
          <span className="text-[11px] font-semibold text-teal-300 truncate max-w-[150px] group-hover:underline">
            {attachment.name}
          </span>
        </div>
        {attachment.caption && (
          <span className="text-[10px] text-teal-300/80 italic font-normal line-clamp-2 max-w-[200px] pl-1">
            "{attachment.caption}"
          </span>
        )}
      </div>
    );
  }

  const primarySrc = attachment.directUrl || attachment.url;

  return (
    <div className="flex flex-col items-start gap-1">
      <div
        onClick={() => onPreview(attachment)}
        className="relative rounded-lg overflow-hidden border hover:border-teal-500/80 w-16 h-16 sm:w-20 sm:h-20 block group cursor-pointer shadow-xs transition-all hover:scale-[1.03] shrink-0"
        style={{
          backgroundColor: 'var(--input-bg, #161616)',
          borderColor: 'var(--border-main, #334155)'
        }}
        title={`Klik untuk memperbesar: ${attachment.name}${attachment.caption ? ` - ${attachment.caption}` : ''}`}
      >
        <img
          src={primarySrc}
        alt={attachment.name}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (driveId) {
            if (fallbackStage === 0) {
              setFallbackStage(1);
              target.src = `https://lh3.googleusercontent.com/d/${driveId}`;
            } else if (fallbackStage === 1) {
              setFallbackStage(2);
              target.src = `https://drive.google.com/thumbnail?id=${driveId}&sz=w600`;
            } else {
              setImgFailed(true);
            }
          } else {
            setImgFailed(true);
          }
        }}
      />
      {overlayBadge ? (
        <div className="absolute inset-0 bg-black/65 backdrop-blur-[1px] flex items-center justify-center text-white font-bold text-xs sm:text-sm tracking-wide">
          {overlayBadge}
        </div>
      ) : (
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Maximize2 className="w-3.5 h-3.5 text-white drop-shadow" />
        </div>
      )}
      </div>
      {attachment.caption && (
        <span className="text-[10px] text-teal-300/90 italic font-medium line-clamp-2 max-w-[160px] leading-tight" title={attachment.caption}>
          "{attachment.caption}"
        </span>
      )}
    </div>
  );
};

export const NotionAttachmentGrid = ({
  attachments,
  onPreview
}: {
  attachments: CommentAttachmentItem[];
  onPreview: (att: CommentAttachmentItem) => void;
}) => {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((a) => a.isImage);
  const docs = attachments.filter((a) => !a.isImage);

  const maxVisibleImages = 3;
  const visibleImages = images.slice(0, maxVisibleImages);
  const overflowImage = images.length > maxVisibleImages ? images[maxVisibleImages] : null;
  const overflowCount = images.length - maxVisibleImages;

  return (
    <div className="space-y-1.5 pt-1">
      {images.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {visibleImages.map((att, idx) => (
            <NotionAttachmentThumbnail
              key={att.id || idx}
              attachment={att}
              onPreview={onPreview}
            />
          ))}
          {overflowImage && (
            <NotionAttachmentThumbnail
              key={overflowImage.id || 'overflow'}
              attachment={overflowImage}
              onPreview={onPreview}
              overlayBadge={`+${overflowCount}`}
            />
          )}
        </div>
      )}

      {docs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {docs.map((att, idx) => (
            <NotionAttachmentThumbnail
              key={att.id || `doc-${idx}`}
              attachment={att}
              onPreview={onPreview}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export interface TableRowData {
  [key: string]: string;
}

export const isSubItemRow = (row: TableRowData): boolean => {
  if (!row) return false;
  if (row.isSubItem === 'true' || (row as any).isSubItem === true) return true;
  if (row.parentId || row.parentRowId) return true;
  const title = (getCellValue(row, 'Jenis kegiatan') || getCellValue(row, 'Jenis Kegiatan') || getCellValue(row, 'Name') || getCellValue(row, 'Judul') || '').trim();
  if (title.startsWith('↳') || title.startsWith('↪')) {
    return true;
  }
  return false;
};

export const isSubItemCompleted = (row: TableRowData): boolean => {
  if (!row) return false;
  if (row.isCompleted === 'true' || (row as any).isCompleted === true) return true;
  const statusStr = (getCellValue(row, 'Status') || '').toUpperCase();
  if (statusStr.includes('CLOSE') || statusStr.includes('SELESAI') || statusStr.includes('DONE')) return true;
  const title = (getCellValue(row, 'Jenis kegiatan') || getCellValue(row, 'Jenis Kegiatan') || '').trim();
  if (title.startsWith('↳ [x]') || title.startsWith('↳ [X]') || title.startsWith('↪ [x]') || title.startsWith('↪ [X]')) return true;
  return false;
};

export const getDisplayTitle = (title: string): string => {
  if (!title) return '';
  return title.replace(/^[↳↪\s]+/, '').replace(/^\[[ xX]\]\s*/, '').trim();
};

// Canonical Notion Table Column definition in exact order
export const CANONICAL_NOTION_COLUMNS = [
  'number',
  'Jenis kegiatan',
  'Keterangan',
  'PIC',
  'Priority',
  'Status',
  'Created Time',
  'Activity (routine/non routine)',
  'period'
] as const;

export const getPriorityWeight = (priority: string): number => {
  const p = (priority || '').toLowerCase().trim();
  if (p.includes('urgent') || p.includes('kritis') || p.includes('critical')) return 1;
  if (p.includes('high') || p.includes('tinggi')) return 2;
  if (p.includes('medium') || p.includes('sedang')) return 3;
  if (p.includes('normal') || p.includes('biasa')) return 4;
  if (p.includes('low') || p.includes('rendah')) return 5;
  return 6;
};

export const getCellValue = (row: TableRowData, colName: string): string => {
  if (!row) return '';
  if (row[colName] !== undefined && row[colName] !== '') return row[colName];

  const targetLower = colName.toLowerCase().trim();
  let fallbackVal: string | undefined = undefined;

  for (const key of Object.keys(row)) {
    const val = row[key];
    const keyLower = key.toLowerCase().trim();

    if (keyLower === targetLower) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }

    if (targetLower === 'number' && (keyLower === 'no' || keyLower === 'no.' || keyLower === '#' || keyLower === 'index')) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }
    if ((targetLower === 'jenis kegiatan' || targetLower === 'judul') && (keyLower.includes('jenis kegiatan') || keyLower === 'task' || keyLower === 'judul' || keyLower === 'name' || keyLower === 'nama' || keyLower === 'kegiatan')) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }
    if (targetLower === 'keterangan' && (keyLower.includes('keterangan') || keyLower.includes('catatan') || keyLower.includes('deskripsi') || keyLower.includes('content') || keyLower.includes('rincian'))) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }
    if (targetLower === 'pic' && (keyLower === 'pic' || keyLower.includes('assignee') || keyLower.includes('pj') || keyLower === 'personil')) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }
    if (targetLower === 'priority' && (keyLower.includes('prioritas') || keyLower.includes('priority'))) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }
    if (targetLower === 'status' && keyLower.includes('status')) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }
    if (targetLower === 'created time' && (keyLower.includes('created') || keyLower.includes('tanggal dibuat') || keyLower.includes('waktu dibuat') || keyLower === 'dibuat')) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }
    if (targetLower === 'kategori' && (keyLower.includes('kategori') || keyLower.includes('category') || keyLower === 'dept')) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }
    if (targetLower === 'activity (routine/non routine)' && (keyLower.includes('activity') || keyLower.includes('aktivitas'))) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }
    if (targetLower === 'period' && (keyLower === 'period' || keyLower === 'periode')) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }
  }
  return fallbackVal ?? row[colName] ?? '';
};

export function serializeMarkdownTable(
  headers: string[], 
  rows: TableRowData[], 
  beforeText = '', 
  afterText = ''
): string {
  const cleanHeaders = headers.filter(h => h && h.trim().length > 0);
  const headerLine = `| ${cleanHeaders.join(' | ')} |`;
  const separatorLine = `| ${cleanHeaders.map(() => '---').join(' | ')} |`;
  const rowLines = rows.map(row => {
    return `| ${cleanHeaders.map(h => {
      const val = getCellValue(row, h);
      return String(val || '').replace(/\|/g, '\\|').replace(/\n/g, '<br/>').trim();
    }).join(' | ')} |`;
  });
  
  const tableMarkdown = [headerLine, separatorLine, ...rowLines].join('\n');
  const parts = [];
  if (beforeText?.trim()) parts.push(beforeText.trim());
  parts.push(tableMarkdown);
  if (afterText?.trim()) parts.push(afterText.trim());
  return parts.join('\n\n');
}

export function migrateChecklistsInRows(
  inputRows: TableRowData[],
  defaultSection?: string
): { migratedCount: number; rows: TableRowData[] } {
  let migratedCount = 0;
  const newRows: TableRowData[] = [];

  for (let i = 0; i < inputRows.length; i++) {
    const row = { ...inputRows[i] };
    const isSub = isSubItemRow(row);

    if (isSub) {
      newRows.push(row);
      continue;
    }

    const ketVal = getCellValue(row, 'Keterangan') || '';
    const taskProg = parseTasklist(ketVal);

    if (taskProg.hasTasklist && taskProg.items.length > 0) {
      // Strip tasklist lines from parent row's Keterangan, keep non-checklist text
      row['Keterangan'] = taskProg.cleanText || '';
      newRows.push(row);

      const parentIndex = newRows.length - 1;
      const parentCat = getCellValue(row, 'Kategori') || defaultSection || 'Laboratorium';
      const parentPIC = getCellValue(row, 'PIC') || '';
      const parentAct = getCellValue(row, 'Activity (routine/non routine)') || 'Monthly';
      const parentPeriod = getCellValue(row, 'period') || 'Monthly';
      const now = new Date();
      const createdStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      // Create a sub-item row for each checklist item
      taskProg.items.forEach(item => {
        const subTitle = `↳ ${item.checked ? '[x] ' : '[ ] '}${item.text}`;
        const subRow: TableRowData = {
          number: '',
          'Jenis kegiatan': subTitle,
          'Jenis Kegiatan': subTitle,
          Keterangan: item.note || '',
          PIC: parentPIC,
          Priority: 'Normal',
          Status: item.checked ? 'Closed' : 'Open',
          'Created Time': createdStr,
          Kategori: parentCat,
          'Activity (routine/non routine)': parentAct,
          period: parentPeriod,
          isSubItem: 'true',
          parentId: String(parentIndex)
        };
        newRows.push(subRow);
        migratedCount++;
      });
    } else {
      newRows.push(row);
    }
  }

  return { migratedCount, rows: newRows };
}

export function splitMarkdownRow(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  const rawCells = inner.split(/(?<!\\)\|/);
  return rawCells.map(c => c.trim().replace(/\\\|/g, '|'));
}

// Helper untuk mengekstrak tabel markdown dari string konten
export function extractMarkdownTableFromContent(content: string): {
  headers: string[];
  rows: TableRowData[];
  beforeText: string;
  afterText: string;
} {
  if (!content || !content.includes('|')) {
    return { headers: [], rows: [], beforeText: content || '', afterText: '' };
  }
  const lines = content.split('\n');
  let startIdx = -1;
  let endIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (startIdx === -1) startIdx = i;
      endIdx = i;
    } else if (startIdx !== -1) {
      break;
    }
  }
  if (startIdx !== -1 && endIdx - startIdx >= 1) {
    const headerLine = lines[startIdx];
    const headers = splitMarkdownRow(headerLine);

    const rows: TableRowData[] = [];
    for (let i = startIdx + 2; i <= endIdx; i++) {
      const rowLine = lines[i].trim();
      if (!rowLine.startsWith('|')) continue;
      const cells = splitMarkdownRow(rowLine);

      if (cells.length > 0) {
        const rowObj: TableRowData = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cells[idx] || '';
        });
        rows.push(rowObj);
      }
    }

    const beforeText = lines.slice(0, startIdx).join('\n');
    const afterText = lines.slice(endIdx + 1).join('\n');
    return { headers, rows, beforeText, afterText };
  }
  return { headers: [], rows: [], beforeText: content || '', afterText: '' };
}

interface NotionDatabaseTableProps {
  postId?: number;
  headers: string[];
  rows: TableRowData[];
  title?: string;
  section?: string;
  currentAuthorNik?: string;
  currentAuthorName?: string;
  pt?: string;
  beforeText?: string;
  afterText?: string;
  onPostContentUpdate?: (newContent: string) => void;
  onRowsChange?: (newRows: TableRowData[]) => void;
  initialTopicTitle?: string;
  allPosts?: any[];
  onNavigateToPost?: (post: any) => void;
}

/**
 * Compact Notion-style hover tooltip helper
 */
function NotionTooltip({ 
  children, 
  content, 
  position = 'top' 
}: { 
  children: React.ReactNode; 
  content: string; 
  position?: 'top' | 'bottom';
}) {
  return (
    <div className="relative group/tooltip inline-flex items-center justify-center">
      {children}
      <div 
        className={`pointer-events-none absolute ${
          position === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
        } left-1/2 -translate-x-1/2 z-50 opacity-0 group-hover/tooltip:opacity-100 transition-all duration-150 transform scale-95 group-hover/tooltip:scale-100 px-2 py-1 bg-[#191919] text-white text-[11px] font-medium rounded-md shadow-xl whitespace-nowrap border border-neutral-700/60 backdrop-blur-xs select-none`}
      >
        {content}
      </div>
    </div>
  );
}

export function NotionDatabaseTable({
  postId,
  headers,
  rows,
  title,
  section,
  currentAuthorNik,
  currentAuthorName,
  pt,
  beforeText = '',
  afterText = '',
  onPostContentUpdate,
  onRowsChange,
  initialTopicTitle,
  allPosts,
  onNavigateToPost
}: NotionDatabaseTableProps) {
  // Local table rows for responsive instant CRUD
  const [localRows, setLocalRows] = useState<TableRowData[]>(() => {
    if (!rows || rows.length === 0) return [];
    const { rows: prepped } = migrateChecklistsInRows(rows, section);
    return prepped;
  });
  const [dirtyRowIndices, setDirtyRowIndices] = useState<Set<number>>(new Set());
  const [originalRowsBackup, setOriginalRowsBackup] = useState<TableRowData[]>(() => rows ? JSON.parse(JSON.stringify(rows)) : []);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState<boolean>(false);
  const [isPersistingChanges, setIsPersistingChanges] = useState<boolean>(false);
  const [activeInlineEditor, setActiveInlineEditor] = useState<{
    rowIndex: number;
    colName: string;
    initialValue: string;
    multiline: boolean;
  } | null>(null);

  // Direct Inline Click-to-Edit for PIC Column
  const [activeInlinePicCell, setActiveInlinePicCell] = useState<{ rowIndex: number; colName: string } | null>(null);
  const [inlinePicSearch, setInlinePicSearch] = useState<string>('');

  // Row Action 3-Dots Dropdown Menu State
  const [activeActionMenuRowIndex, setActiveActionMenuRowIndex] = useState<number | string | null>(null);

  // Floating Selection Toolbar State for "Edit Data Kegiatan" Modal
  const [activeModalSelection, setActiveModalSelection] = useState<{
    field: 'jenisKegiatan' | 'keterangan';
    start: number;
    end: number;
    selectedText: string;
  } | null>(null);

  const handleModalSelectText = (
    e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>,
    field: 'jenisKegiatan' | 'keterangan'
  ) => {
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    if (end > start) {
      const selectedText = target.value.substring(start, end);
      setActiveModalSelection({ field, start, end, selectedText });
    } else {
      setActiveModalSelection(null);
    }
  };

  const handleApplyModalFormat = (
    field: 'jenisKegiatan' | 'keterangan',
    action: FormatAction
  ) => {
    if (!activeModalSelection) return;
    const { start, end } = activeModalSelection;

    if (field === 'jenisKegiatan') {
      const currentVal = rowFormData['Jenis kegiatan'] || rowFormData['Jenis Kegiatan'] || '';
      const res = formatSelectedText(currentVal, start, end, action);
      setRowFormData(prev => ({
        ...prev,
        'Jenis kegiatan': res.newText,
        'Jenis Kegiatan': res.newText
      }));
      setActiveModalSelection({
        field,
        start: res.newStart,
        end: res.newEnd,
        selectedText: res.newText.substring(res.newStart, res.newEnd)
      });
    } else if (field === 'keterangan') {
      const currentVal = rowFormData['Keterangan'] || '';
      const res = formatSelectedText(currentVal, start, end, action);
      setRowFormData(prev => ({
        ...prev,
        Keterangan: res.newText
      }));
      setActiveModalSelection({
        field,
        start: res.newStart,
        end: res.newEnd,
        selectedText: res.newText.substring(res.newStart, res.newEnd)
      });
    }
  };



  useEffect(() => {
    if (rows) {
      const { migratedCount, rows: prepped } = migrateChecklistsInRows(rows, section);
      if (migratedCount > 0) {
        setLocalRows(prepped);
        setOriginalRowsBackup(JSON.parse(JSON.stringify(prepped)));
        saveTableToBackend(prepped);
      } else {
        setLocalRows(rows);
        setOriginalRowsBackup(JSON.parse(JSON.stringify(rows)));
      }
      setDirtyRowIndices(new Set());
    }
  }, [rows]);

  // Routine & Cadence States (Sub-Period Navigator)
  const [activeSubPeriod, setActiveSubPeriod] = useState<string>('');
  const [customPeriodsMap, setCustomPeriodsMap] = useState<Record<string, string[]>>({});
  const [isMovingTopic, setIsMovingTopic] = useState(false);
  const [showMovePopover, setShowMovePopover] = useState(false);

  // Routine Completion & Next Period Confirmation Modal State
  interface RoutineCompletionModalData {
    row: TableRowData;
    rowIndex: number;
    colName: string;
    currentPeriod: string;
    nextPeriod: string;
    nextStartDate: string;
    nextTargetDate: string;
    resetKeterangan: string;
  }
  const [routineCompletionModal, setRoutineCompletionModal] = useState<RoutineCompletionModalData | null>(null);

  // Auto open topic drawer if initialTopicTitle is provided (e.g. from notification deep link)
  useEffect(() => {
    if (initialTopicTitle && localRows.length > 0) {
      let cleanTitle = initialTopicTitle.trim();
      let detectedSubPeriod = '';
      if (cleanTitle.includes(' - ')) {
        const parts = cleanTitle.split(' - ');
        cleanTitle = parts[0].trim();
        detectedSubPeriod = parts.slice(1).join(' - ').trim();
      }
      const match = localRows.find(r => {
        const tVal = getRowVal(r, 'Jenis kegiatan') || getRowVal(r, 'keterangan') || '';
        return tVal.toLowerCase().trim() === cleanTitle.toLowerCase().trim() ||
               tVal.toLowerCase().includes(cleanTitle.toLowerCase().trim()) ||
               cleanTitle.toLowerCase().includes(tVal.toLowerCase().trim());
      });
      if (match) {
        setSelectedRow(match);
        if (detectedSubPeriod) {
          setActiveSubPeriod(detectedSubPeriod);
        }
      }
    }
  }, [initialTopicTitle, localRows]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['ACTIVE']);
  const [selectedPriorities, setSelectedPriorities] = useState<string[]>([]);
  const [selectedPics, setSelectedPics] = useState<string[]>([]);
  const [picSearchQuery, setPicSearchQuery] = useState('');

  // Backward-compatibility aliases for statusFilter and priorityFilter
  const statusFilter = useMemo(() => {
    if (selectedStatuses.length === 0 || selectedStatuses.includes('ALL')) return 'ALL';
    if (selectedStatuses.length === 1) return selectedStatuses[0];
    return selectedStatuses.join(',');
  }, [selectedStatuses]);

  const priorityFilter = useMemo(() => {
    if (selectedPriorities.length === 0 || selectedPriorities.includes('ALL')) return 'ALL';
    if (selectedPriorities.length === 1) return selectedPriorities[0];
    return selectedPriorities.join(',');
  }, [selectedPriorities]);

  const setStatusFilter = (val: string) => {
    if (val === 'ALL') setSelectedStatuses(['ALL']);
    else setSelectedStatuses([val]);
  };

  const setPriorityFilter = (val: string) => {
    if (val === 'ALL') setSelectedPriorities([]);
    else setSelectedPriorities([val]);
  };
  const [viewMode, setViewMode] = useState<'table' | 'board' | 'list'>('table');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRow, setSelectedRow] = useState<TableRowData | null>(null);
  const [selectedRowIndices, setSelectedRowIndices] = useState<Set<number>>(new Set());
  const [isSelectionModeActive, setIsSelectionModeActive] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'details' | 'comments'>('details');

  // Font Size Controller State (Hanya mengatur ukuran font keseluruhan modul LabNote)
  const [labNoteFontSize, setLabNoteFontSize] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('preplab_labnote_font_size');
      return saved ? Number(saved) : 13;
    } catch {
      return 13;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('preplab_labnote_font_size', String(labNoteFontSize));
    } catch {}
  }, [labNoteFontSize]);

  // Notion Minimalist Header Toolbar Popovers
  const [isSearchInputOpen, setIsSearchInputOpen] = useState(false);
  const [isFilterPopoverOpen, setIsFilterPopoverOpen] = useState(false);
  const [isSortPopoverOpen, setIsSortPopoverOpen] = useState(false);
  const [isFullToolsPopoverOpen, setIsFullToolsPopoverOpen] = useState(false);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.group\\/pic') && !target.closest('.notion-pic-popover')) {
        setActiveInlinePicCell(null);
      }
      if (!target.closest('.notion-row-action-menu-container')) {
        setActiveActionMenuRowIndex(null);
      }
      if (!target.closest('.notion-filter-popover-container')) {
        setIsFilterPopoverOpen(false);
      }
      if (!target.closest('.notion-sort-popover-container')) {
        setIsSortPopoverOpen(false);
      }
      if (!target.closest('.notion-fulltools-popover-container')) {
        setIsFullToolsPopoverOpen(false);
      }
      if (!target.closest('.notion-search-container') && !searchQuery) {
        setIsSearchInputOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveActionMenuRowIndex(null);
        setActiveModalSelection(null);
        setIsFilterPopoverOpen(false);
        setIsSortPopoverOpen(false);
        setIsFullToolsPopoverOpen(false);
        if (!searchQuery) setIsSearchInputOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [searchQuery]);

  // Notion Aesthetic Theme Mode (Default to Notion Clean Light per Management Request)
  const [themeMode, setThemeMode] = useState<'notion-light' | 'dark-studio'>('notion-light');
  const isNotionLight = themeMode === 'notion-light';

  // Notion Collapsible Groups State
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const toggleGroup = (grp: string) => {
    setCollapsedGroups(prev => ({ ...prev, [grp]: !prev[grp] }));
  };

  // Sub-items (Sub-kegiatan) Collapsible State & Inline Creator
  const [expandedParents, setExpandedParents] = useState<Record<string | number, boolean>>({});
  const [creatingSubItemForParent, setCreatingSubItemForParent] = useState<number | null>(null);
  const [newSubItemTitle, setNewSubItemTitle] = useState<string>('');

  // Helper to categorize rows into Notion Database Groups (e.g. 'Non Routine Lainnya', 'PTK GTS')
  const getRowGroup = useCallback((row: TableRowData): string => {
    const gVal = 
      getRowVal(row, 'group') ||
      getRowVal(row, 'Group') ||
      getRowVal(row, 'kategori') ||
      getRowVal(row, 'Kategori') ||
      getRowVal(row, 'category') ||
      getRowVal(row, 'Category') ||
      getRowVal(row, 'cadence') ||
      getRowVal(row, 'Cadence') ||
      getRowVal(row, 'subseksi') ||
      getRowVal(row, 'bagian');

    if (gVal && gVal !== '-' && gVal.trim() !== '') return gVal.trim();

    const titleVal = (getRowVal(row, 'Jenis kegiatan') || getRowVal(row, 'task') || getRowVal(row, 'judul') || '').toUpperCase();
    if (titleVal.includes('PTK GTS') || titleVal.includes('PENGAJUAN PTK')) {
      return 'PTK GTS';
    }

    return title || section || 'Non Routine Lainnya';
  }, [title, section]);

  // Clear or prune selection if rows change
  useEffect(() => {
    setSelectedRowIndices((prev) => {
      if (prev.size === 0) return prev;
      const validIndices = new Set<number>();
      prev.forEach((idx) => {
        if (idx < localRows.length) validIndices.add(idx);
      });
      return validIndices.size !== prev.size ? validIndices : prev;
    });
  }, [localRows.length]);

  // Fit to screen / Zoom Mode State
  const [fitPageMode, setFitPageMode] = useState<boolean>(false);
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // Table Edit Mode State (Toggle to show column reorder and delete tools)
  const [isTableEditMode, setIsTableEditMode] = useState<boolean>(false);

  // Confirmation Modal when checking the last subtask before parent task is closed
  const [lastSubtaskConfirmModal, setLastSubtaskConfirmModal] = useState<{
    isOpen: boolean;
    topicTitle: string;
    onConfirm: () => void;
  } | null>(null);

  // Add / Edit Row Modal State
  const [showRowModal, setShowRowModal] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const [rowFormData, setRowFormData] = useState<TableRowData>({});
  const [isSavingRow, setIsSavingRow] = useState(false);

  // Employees List for PIC Dropdown & Search
  const [employeesList, setEmployeesList] = useState<any[]>([]);
  const [isPicDropdownOpen, setIsPicDropdownOpen] = useState(false);

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setEmployeesList(data);
        }
      })
      .catch(err => console.error('Failed to load employees for PIC dropdown:', err));
  }, []);

  // Comments / Updates State
  const [allComments, setAllComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [statusUpdateChoice, setStatusUpdateChoice] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const isSubmittingCommentRef = useRef(false);
  const isUploadingGalleryRef = useRef(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; url: string; previewUrl?: string; isImage?: boolean } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Array<{ name: string; url: string; previewUrl?: string; isImage?: boolean; caption?: string }>>([]);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState<string>('');
  const [commentFileCaption, setCommentFileCaption] = useState('');
  const [isUploadingCommentFile, setIsUploadingCommentFile] = useState(false);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; driveViewUrl?: string; driveDownloadUrl?: string } | null>(null);
  const [showAllReplies, setShowAllReplies] = useState(false);

  // Pending file upload with caption for Gallery
  const [pendingUploadFile, setPendingUploadFile] = useState<{
    file: File;
    previewUrl: string;
    caption: string;
    isImage: boolean;
  } | null>(null);

  // Replying state for threaded comments in discussion
  const [replyingTo, setReplyingTo] = useState<{
    id: number;
    authorNik: string;
    authorName: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    setShowAllReplies(false);
    setReplyingTo(null);
  }, [selectedRow]);

  const handleStartReply = (c: any) => {
    setReplyingTo({
      id: c.id,
      authorNik: c.authorNik || '',
      authorName: c.authorName || 'Personil',
      content: c.content || ''
    });
    setTimeout(() => {
      const el = document.getElementById('notion-comment-textarea');
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  // Column templates definition
  const POPULAR_COLUMN_TEMPLATES = [
    { name: 'Status', icon: '🏷️', defaultValue: 'Open', desc: 'Dropdown status progress tugas' },
    { name: 'Completed Time', icon: '✓', defaultValue: '-', desc: 'Tanggal atau waktu penyelesaian tugas' },
    { name: 'Priority', icon: '⚡', defaultValue: 'Normal', desc: 'Tingkat urgensi kegiatan' },
    { name: 'PIC', icon: '👤', defaultValue: '', desc: 'Personil penanggung jawab' },
    { name: 'Activity (routine/non routine)', icon: '🔄', defaultValue: 'Routine', desc: 'Klasifikasi aktivitas rutin/non-rutin' },
    { name: 'period', icon: '⏱️', defaultValue: 'Weekly', desc: 'Periode waktu kegiatan' },
    { name: 'Deadline', icon: '📅', defaultValue: '-', desc: 'Batas tanggal penyelesaian tugas' },
    { name: 'Lokasi / Area', icon: '📍', defaultValue: 'Site Obi', desc: 'Lokasi fisik pelaksanaan tugas' },
    { name: 'Departemen', icon: '🏢', defaultValue: 'Laboratorium', desc: 'Seksi atau departemen pelaksana' },
    { name: 'Catatan Tambahan', icon: '📝', defaultValue: '-', desc: 'Rincian atau catatan ekstra' },
    { name: 'Estimasi Biaya', icon: '💰', defaultValue: '-', desc: 'Anggaran atau estimasi biaya (opsional)' },
  ];

  // Helper to establish logical Notion canonical order for database columns:
  // number -> jenis kegiatan -> keterangan -> Created Time -> Completed Time -> Status -> PIC -> Priority -> Aktivitas
  const normalizeAndOrderHeaders = useCallback((inputHeaders: string[]): string[] => {
    // 1. Remove redundant 'Progress' / 'progres' and 'Target Selesai' / 'target' column
    const filtered = (inputHeaders || []).filter(h => {
      const l = h.toLowerCase().trim();
      if (l.includes('progress') || l.includes('progres') || l.includes('capaian')) return false;
      if (l.includes('target') || l.includes('deadline') || l.includes('jatuh tempo')) return false;
      return true;
    }).map(h => {
      const l = h.toLowerCase().trim();
      if (l.includes('completed') || l.includes('aktual selesai') || l === 'selesai' || l.includes('waktu selesai')) {
        return 'Tanggal Selesai';
      }
      return h;
    });

    if (filtered.length === 0) {
      return [
        'Number',
        'Jenis kegiatan',
        'Keterangan',
        'Created Time',
        'Tanggal Selesai',
        'Status',
        'PIC',
        'Priority',
        'Aktivitas'
      ];
    }

    // Ensure 'number' exists
    const hasNumber = filtered.some(h => {
      const l = h.toLowerCase().trim();
      return l === 'number' || l === 'no' || l === 'no.' || l === '#';
    });

    const headersWithNumber = hasNumber ? filtered : ['Number', ...filtered];

    // Ensure 'Tanggal Selesai' exists
    const hasCompleted = headersWithNumber.some(h => {
      const l = h.toLowerCase().trim();
      return l.includes('completed') || l.includes('aktual selesai') || l === 'selesai' || l.includes('waktu selesai') || l.includes('tanggal selesai');
    });

    const headersWithMeta = hasCompleted ? headersWithNumber : [...headersWithNumber, 'Tanggal Selesai'];

    // Priority ordering weight:
    // 0: Number
    // 1: Jenis Kegiatan
    // 2: Keterangan
    // 3: Created Time
    // 4: Tanggal Selesai
    // 5: Status
    // 6: PIC
    // 7: Priority
    // 8: Aktivitas
    const getColOrder = (colName: string): number => {
      const l = colName.toLowerCase().trim();
      if (l === 'number' || l === 'no' || l === 'no.' || l === '#') return 0;
      if (l.includes('jenis kegiatan') || l === 'task' || l === 'judul' || l === 'name' || l === 'nama') return 1;
      if (l.includes('keterangan') || l.includes('catatan') || l.includes('deskripsi') || l.includes('rincian') || l.includes('notes')) return 2;
      if (l.includes('created') || l.includes('tanggal dibuat') || l.includes('waktu dibuat')) return 3;
      if (l.includes('completed') || l.includes('aktual selesai') || l === 'selesai' || l.includes('waktu selesai') || l.includes('tanggal selesai')) return 4;
      if (l.includes('status')) return 5;
      if (l === 'pic' || l.includes('assignee') || l.includes('pj') || l === 'personil') return 6;
      if (l.includes('priority') || l.includes('prioritas')) return 7;
      if (l.includes('activity') || l.includes('aktivitas')) return 8;
      if (l.includes('period') || l.includes('periode')) return 9;
      if (l.includes('group') || l.includes('kategori') || l.includes('category') || l.includes('dept')) return 10;
      return 20; // other custom columns
    };

    return [...headersWithMeta].sort((a, b) => getColOrder(a) - getColOrder(b));
  }, []);

  // Dynamic Table Headers State (Allows Adding, Deleting, and Reordering Columns)
  const [tableHeaders, setTableHeaders] = useState<string[]>(() => {
    return normalizeAndOrderHeaders(headers || []);
  });

  useEffect(() => {
    if (headers && headers.length > 0) {
      setTableHeaders(normalizeAndOrderHeaders(headers));
    }
  }, [headers, normalizeAndOrderHeaders]);

  // Interactive Column Widths & Resizer State
  const tableStorageKey = `preplab_col_widths_${postId || title || 'default'}`;
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`preplab_col_widths_${postId || title || 'default'}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const resizeInfoRef = useRef<{
    colHeader: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, colHeader: string, currentDomWidth: number) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const initialWidth = columnWidths[colHeader] || currentDomWidth || 180;
    resizeInfoRef.current = { colHeader, startX: clientX, startWidth: initialWidth };
    setResizingCol(colHeader);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
      const info = resizeInfoRef.current;
      if (!info) return;
      const currentX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const deltaX = currentX - info.startX;
      const newWidth = Math.max(40, Math.min(1200, Math.round(info.startWidth + deltaX)));

      setColumnWidths((prev) => ({
        ...prev,
        [info.colHeader]: newWidth
      }));
    };

    const handleMouseUp = () => {
      if (resizeInfoRef.current) {
        setColumnWidths((prev) => {
          try {
            localStorage.setItem(tableStorageKey, JSON.stringify(prev));
          } catch {}
          return prev;
        });
      }
      resizeInfoRef.current = null;
      setResizingCol(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove, { passive: false });
    window.addEventListener('touchend', handleMouseUp);
  };

  // Helper for applying custom dragged column widths to <th> and <td>
  const getColStyle = (colName: string): React.CSSProperties | undefined => {
    const customW = columnWidths[colName];
    if (!customW) return undefined;

    if (fitPageMode) {
      // In fitPageMode, allow user-defined column width while letting other columns flex and absorb remaining width
      return {
        width: `${customW}px`,
        minWidth: '40px'
      };
    }

    return {
      width: `${customW}px`,
      minWidth: `${customW}px`,
      maxWidth: `${customW}px`,
    };
  };

  // Ensure Progress, Target Selesai, and redundant Kategori columns are never rendered in displayHeaders
  const displayHeaders = useMemo(() => {
    return tableHeaders.filter(h => {
      const l = h.toLowerCase().trim();
      return !l.includes('progress') && !l.includes('progres') && !l.includes('capaian') &&
             !l.includes('target') && !l.includes('deadline') && !l.includes('jatuh tempo') &&
             !l.includes('kategori') && !l.includes('category');
    });
  }, [tableHeaders]);

  // Floating Synchronized Horizontal Scrollbar (Tetap di bawah viewport, transparan saat idle, muncul saat disentuh kursor)
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const floatingScrollRef = useRef<HTMLDivElement>(null);
  const [tableScrollWidth, setTableScrollWidth] = useState(0);
  const [tableClientWidth, setTableClientWidth] = useState(0);
  const [isTableVisible, setIsTableVisible] = useState(true);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);
  const isSyncingScrollRef = useRef(false);

  const handleTableScroll = useCallback(() => {
    if (isSyncingScrollRef.current) return;
    isSyncingScrollRef.current = true;
    if (tableScrollRef.current && floatingScrollRef.current) {
      floatingScrollRef.current.scrollLeft = tableScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  }, []);

  const handleFloatingScroll = useCallback(() => {
    if (isSyncingScrollRef.current) return;
    isSyncingScrollRef.current = true;
    if (tableScrollRef.current && floatingScrollRef.current) {
      tableScrollRef.current.scrollLeft = floatingScrollRef.current.scrollLeft;
    }
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  }, []);

  useEffect(() => {
    const checkOverflow = () => {
      if (tableScrollRef.current) {
        const sWidth = tableScrollRef.current.scrollWidth;
        const cWidth = tableScrollRef.current.clientWidth;
        setTableScrollWidth(sWidth);
        setTableClientWidth(cWidth);
        setHasHorizontalOverflow(sWidth > cWidth + 6);
      }
    };

    checkOverflow();
    const el = tableScrollRef.current;
    if (!el) return;

    const ro = new ResizeObserver(checkOverflow);
    ro.observe(el);

    const io = new IntersectionObserver(([entry]) => {
      setIsTableVisible(entry.isIntersecting);
    }, { threshold: 0.05 });
    io.observe(el);

    window.addEventListener('resize', checkOverflow);

      return () => {
        ro.disconnect();
        io.disconnect();
        window.removeEventListener('resize', checkOverflow);
      };
    }, [localRows, displayHeaders, zoomPercent, fitPageMode]);

  // Scroll Chaining: Delegate wheel events to outer page scroll container until table top reaches threshold
  useEffect(() => {
    const tableEl = tableScrollRef.current;
    if (!tableEl) return;

    const handleWheel = (e: WheelEvent) => {
      // Horizontal scrolling should remain untouched
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      // Find outer scrollable parent
      let parent = tableEl.parentElement;
      let scrollParent: HTMLElement | null = null;
      while (parent) {
        const style = window.getComputedStyle(parent);
        const isScrollable = (style.overflowY === 'auto' || style.overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight;
        if (isScrollable) {
          scrollParent = parent;
          break;
        }
        parent = parent.parentElement;
      }

      const outerContainer = scrollParent || (document.scrollingElement as HTMLElement) || document.documentElement;
      const isWindowScroll = !scrollParent;

      const containerTop = scrollParent ? scrollParent.getBoundingClientRect().top : 0;
      const tableRect = tableEl.getBoundingClientRect();
      const topThreshold = containerTop + 65;

      if (e.deltaY > 0) {
        // Scrolling DOWN:
        // If table has not yet scrolled to the top of viewport / container and outer container can still scroll down
        const canOuterScrollDown = isWindowScroll
          ? (window.scrollY + window.innerHeight < document.documentElement.scrollHeight - 4)
          : (outerContainer.scrollTop + outerContainer.clientHeight < outerContainer.scrollHeight - 4);

        if (tableRect.top > topThreshold && canOuterScrollDown) {
          if (isWindowScroll) {
            window.scrollBy({ top: e.deltaY });
          } else {
            outerContainer.scrollTop += e.deltaY;
          }
          e.preventDefault();
        }
      } else if (e.deltaY < 0) {
        // Scrolling UP:
        // If table is at the top of its internal scroll, pass scroll to outer container
        if (tableEl.scrollTop <= 0) {
          const canOuterScrollUp = isWindowScroll ? window.scrollY > 0 : outerContainer.scrollTop > 0;
          if (canOuterScrollUp) {
            if (isWindowScroll) {
              window.scrollBy({ top: e.deltaY });
            } else {
              outerContainer.scrollTop += e.deltaY;
            }
            e.preventDefault();
          }
        }
      }
    };

    tableEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      tableEl.removeEventListener('wheel', handleWheel);
    };
  }, [viewMode]);

  // Frozen Header & Sticky Controls States (Freeze toolbar, filter bar, and column headers)
  const headerControlRef = useRef<HTMLDivElement>(null);
  const [headerControlHeight, setHeaderControlHeight] = useState(140);

  useEffect(() => {
    const el = headerControlRef.current;
    if (!el) return;
    const updateH = () => {
      if (headerControlRef.current) {
        setHeaderControlHeight(headerControlRef.current.offsetHeight);
      }
    };
    updateH();
    const ro = new ResizeObserver(updateH);
    ro.observe(el);
    window.addEventListener('resize', updateH);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateH);
    };
  }, [viewMode, searchQuery, statusFilter, priorityFilter]);

  const [showAddColumnPopover, setShowAddColumnPopover] = useState(false);
  const [customColumnName, setCustomColumnName] = useState('');
  const addColumnRef = useRef<HTMLTableHeaderCellElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (addColumnRef.current && !addColumnRef.current.contains(e.target as Node)) {
        setShowAddColumnPopover(false);
      }
    };
    if (showAddColumnPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAddColumnPopover]);

  const handleAddColumn = (name: string, defaultValue = '') => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Nama kolom tidak boleh kosong');
      return;
    }
    if (tableHeaders.some(h => h.toLowerCase() === trimmed.toLowerCase())) {
      toast.warning(`Kolom "${trimmed}" sudah ada di tabel`);
      return;
    }

    setTableHeaders(prev => [...prev, trimmed]);
    const updated = localRows.map(r => ({ ...r, [trimmed]: defaultValue }));
    setLocalRows(updated);
    onRowsChange?.(updated);
    saveTableToBackend(updated);
    setShowAddColumnPopover(false);
    setCustomColumnName('');
    toast.success(`Kolom "${trimmed}" berhasil ditambahkan ke tabel!`);
  };

  const handleDeleteColumn = (colName: string) => {
    const colLower = colName.toLowerCase();
    if (colLower === 'number' || colLower === 'no') {
      toast.error('Kolom Nomor (#) tidak dapat dihapus');
      return;
    }
    if (colLower.includes('jenis kegiatan') || colLower === 'task' || colLower === 'judul') {
      toast.error('Kolom Judul/Kegiatan adalah kolom utama dan tidak dapat dihapus');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus kolom "${colName}" dari tabel?`)) {
      return;
    }

    const updatedHeaders = tableHeaders.filter(h => h !== colName);
    setTableHeaders(updatedHeaders);
    onRowsChange?.(localRows);
    saveTableToBackend(localRows);
    toast.info(`Kolom "${colName}" telah dihapus.`);
  };

  const handleMoveColumn = (colName: string, direction: 'left' | 'right') => {
    const idx = tableHeaders.indexOf(colName);
    if (idx === -1) return;

    // Prevent moving 'number' or moving to/before 'number' (keep index 0 for number)
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx <= 0 || targetIdx >= tableHeaders.length) return;

    const newHeaders = [...tableHeaders];
    const [moved] = newHeaders.splice(idx, 1);
    newHeaders.splice(targetIdx, 0, moved);

    setTableHeaders(newHeaders);
    onRowsChange?.(localRows);
    saveTableToBackend(localRows);
    toast.success(`Kolom "${colName}" digeser ke ${direction === 'left' ? 'kiri' : 'kanan'}`);
  };

  const handleResetColumnOrder = () => {
    const normalized = normalizeAndOrderHeaders(tableHeaders);
    setTableHeaders(normalized);
    setColumnWidths({});
    try {
      localStorage.removeItem(tableStorageKey);
    } catch {}
    onRowsChange?.(localRows);
    saveTableToBackend(localRows);
    toast.success('Urutan dan lebar kolom berhasil dirapikan sesuai standar Notion!');
  };

  // Helper to read row property with fuzzy matching across header aliases
  const getRowVal = useCallback((row: TableRowData, colName: string): string => {
    if (!row) return '';
    if (row[colName] !== undefined && row[colName] !== '') return row[colName];

    const targetLower = colName.toLowerCase().trim();
    const cleanTarget = targetLower.replace(/^[^a-z0-9]+/i, '').trim();
    let fallbackVal: string | undefined = undefined;

    for (const key of Object.keys(row)) {
      const val = row[key];
      const keyLower = key.toLowerCase().trim();
      const cleanKey = keyLower.replace(/^[^a-z0-9]+/i, '').trim();

      if (keyLower === targetLower || (cleanKey && cleanKey === cleanTarget)) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }

      if (targetLower === 'number' && (keyLower === 'no' || keyLower === 'no.' || keyLower === '#' || keyLower === 'index' || cleanKey === 'no' || cleanKey === 'number')) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }
      if ((targetLower === 'jenis kegiatan' || targetLower === 'judul' || targetLower === 'name' || targetLower === 'title') && 
          (cleanKey.includes('jenis kegiatan') || cleanKey === 'task' || cleanKey === 'judul' || cleanKey === 'name' || cleanKey === 'nama' || cleanKey === 'kegiatan' || cleanKey === 'title' || cleanKey === 'materi')) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }
      if (targetLower === 'keterangan' && (cleanKey.includes('keterangan') || cleanKey.includes('catatan') || cleanKey.includes('deskripsi') || cleanKey.includes('content') || cleanKey.includes('rincian'))) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }
      if (targetLower === 'pic' && (cleanKey === 'pic' || cleanKey.includes('assignee') || cleanKey.includes('pj') || cleanKey === 'personil')) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }
      if (targetLower === 'priority' && (cleanKey.includes('prioritas') || cleanKey.includes('priority'))) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }
      if (targetLower === 'status' && cleanKey.includes('status')) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }
      if (targetLower === 'created time' && (cleanKey.includes('created') || cleanKey.includes('tanggal dibuat') || cleanKey.includes('waktu dibuat') || cleanKey === 'dibuat')) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }
      if (targetLower === 'kategori' && (cleanKey.includes('kategori') || cleanKey.includes('category') || cleanKey === 'dept')) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }
      if (targetLower === 'activity (routine/non routine)' && (cleanKey.includes('activity') || cleanKey.includes('aktivitas'))) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }
      if (targetLower === 'period' && (cleanKey === 'period' || cleanKey === 'periode')) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }
    }
    return fallbackVal ?? row[colName] ?? '';
  }, []);

  // Fetch comments from backend
  const fetchComments = useCallback(async () => {
    if (!postId) return;
    try {
      setCommentsLoading(true);
      const res = await fetch(`/api/bulletin/${postId}/comments`);
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        setAllComments(json.data);
      }
    } catch (e) {
      console.error('Failed to load topic comments:', e);
    } finally {
      setCommentsLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Comment counts per topic title and topic ID (aggregates sub-periods to base topic as well)
  const topicCommentCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allComments.forEach((c) => {
      if (c.topicTitle) {
        const fullKey = c.topicTitle.toLowerCase().trim();
        map[fullKey] = (map[fullKey] || 0) + 1;
        if (fullKey.includes(' - ')) {
          const baseKey = fullKey.split(' - ')[0].trim();
          map[baseKey] = (map[baseKey] || 0) + 1;
        }
      }
      if (c.topicId) {
        const idKey = c.topicId.toLowerCase().trim();
        map[idKey] = (map[idKey] || 0) + 1;
      }
    });
    return map;
  }, [allComments]);

  // Base topic title from row
  const baseTopicTitle = useMemo(() => {
    if (!selectedRow) return '';
    const cand = getRowVal(selectedRow, 'Jenis kegiatan')
      || getRowVal(selectedRow, 'Judul')
      || getRowVal(selectedRow, 'Name')
      || getRowVal(selectedRow, 'Title')
      || getRowVal(selectedRow, 'Kegiatan')
      || getRowVal(selectedRow, 'Materi')
      || (selectedRow['Name'] || selectedRow['= Name'] || selectedRow['name'] || selectedRow['title'] || selectedRow['Judul'])
      || Object.values(selectedRow).find(v => typeof v === 'string' && v.trim().length > 0 && !v.startsWith('http') && v !== '-')
      || '';
    return (cand || '').trim();
  }, [selectedRow, getRowVal]);

  // Current normalized cadence (prioritize page title itself, e.g. "Weekly Manajemen Mutu" -> Weekly)
  const currentCadence = useMemo(() => {
    const pageCadence = normalizeCadence(title);
    if (pageCadence) return pageCadence;

    if (!selectedRow) return null;
    const actVal = getRowVal(selectedRow, 'Activity (routine/non routine)') || getRowVal(selectedRow, 'period') || '';
    return normalizeCadence(actVal);
  }, [title, selectedRow, getRowVal]);

  // Is periodic cadence (Weekly, Monthly, Quarterly, Biannual, Yearly, Daily)
  const isPeriodic = useMemo(() => {
    return isPeriodicCadence(currentCadence);
  }, [currentCadence]);

  // Available sub-periods for active row (only shows periods assigned, discussed, or rolled over for this topic)
  const availableSubPeriods = useMemo(() => {
    if (!selectedRow || !currentCadence || !isPeriodic) return [];
    const baseT = (getRowVal(selectedRow, 'Jenis kegiatan') || '').trim();
    const customList = customPeriodsMap[baseT] || [];
    return getTopicSubPeriods(baseT, selectedRow, currentCadence, allComments, customList);
  }, [selectedRow, currentCadence, isPeriodic, customPeriodsMap, allComments, getRowVal]);

  // Keep activeSubPeriod pointing to the topic's detected period when opening a row
  const prevSelectedRowRef = useRef<TableRowData | null>(null);
  useEffect(() => {
    if (selectedRow && isPeriodic && currentCadence) {
      if (prevSelectedRowRef.current !== selectedRow) {
        prevSelectedRowRef.current = selectedRow;
        const baseT = (getRowVal(selectedRow, 'Jenis kegiatan') || '').trim();
        const customList = customPeriodsMap[baseT] || [];
        const detected = getTopicSubPeriods(baseT, selectedRow, currentCadence, allComments, customList);
        if (detected.length > 0) {
          if (!activeSubPeriod || !detected.includes(activeSubPeriod)) {
            setActiveSubPeriod(detected[detected.length - 1]);
          }
        }
      }
    } else if (!selectedRow) {
      prevSelectedRowRef.current = null;
    }
  }, [selectedRow, isPeriodic, currentCadence, allComments, customPeriodsMap, getRowVal, activeSubPeriod]);

  // Available periodical pages within this section to move topics into
  const sectionPeriodicalPages = useMemo(() => {
    if (!allPosts || allPosts.length === 0) return [];
    const sec = (section || '').trim();
    const currentUniverse = pt === 'GTS' ? 'GTS' : 'TBP';
    const eligible = allPosts.filter(p => (p.pt === 'GTS' ? 'GTS' : 'TBP') === currentUniverse);

    const cadences: { cadence: RoutineCadence; label: string; icon: string }[] = [
      { cadence: 'Daily', label: 'Daily', icon: '📐' },
      { cadence: 'Weekly', label: 'Weekly', icon: '📅' },
      { cadence: 'Monthly', label: 'Monthly', icon: '🗓️' },
      { cadence: 'Quarterly', label: 'Quarterly', icon: '📊' },
      { cadence: 'Biannual', label: 'Biannual', icon: '🌓' },
      { cadence: 'Yearly', label: 'Yearly', icon: '📆' },
      { cadence: 'Non-Routine', label: 'Non Routine', icon: '📑' },
    ];

    const results: { cadence: RoutineCadence; label: string; icon: string; post: any }[] = [];

    cadences.forEach(c => {
      const found = eligible.find(p => {
        const pTitle = (p.title || '').toLowerCase();
        const pCat = (p.category || p.department || '').toLowerCase();
        const cStr = c.cadence.toLowerCase().replace(/[^a-z0-9]/g, '');
        const secStr = sec.toLowerCase().replace(/prep\s*(&|dan)\s*lab/gi, '').trim();

        const titleMatches = pTitle.includes(c.cadence.toLowerCase()) || (cStr === 'nonroutine' && pTitle.includes('non'));
        const secMatches = secStr ? (pTitle.includes(secStr) || pCat.includes(secStr)) : true;
        return titleMatches && secMatches;
      }) || eligible.find(p => {
        const pTitle = (p.title || '').toLowerCase().trim();
        return pTitle === c.cadence.toLowerCase() || (c.cadence === 'Non-Routine' && pTitle === 'non routine');
      });

      if (found && found.id !== postId) {
        results.push({ ...c, post: found });
      }
    });

    return results;
  }, [allPosts, section, pt, postId]);

  // Move Topic Modal State (allows choosing between new topic or existing topic in target page)
  interface MoveTopicModalData {
    sourceRow: TableRowData;
    targetPost: any;
    targetCadence: string;
    targetSubPeriod: string;
    existingTopicsInTarget: string[];
  }
  const [moveModalData, setMoveModalData] = useState<MoveTopicModalData | null>(null);
  const [moveMode, setMoveMode] = useState<'new_topic' | 'existing_topic'>('new_topic');
  const [selectedExistingTopic, setSelectedExistingTopic] = useState<string>('');
  const [customNewTopicTitle, setCustomNewTopicTitle] = useState<string>('');

  // Opens the move topic selection modal
  const openMoveModal = (targetPost: any, sourceRowParam?: TableRowData, forcedCadence?: string) => {
    const rowToMove = sourceRowParam || selectedRow;
    if (!rowToMove || !postId || !targetPost || targetPost.id === postId) return;

    const targetCadence = forcedCadence || normalizeCadence(targetPost.title) || 'Routine';
    const targetSubPeriod = targetCadence && isPeriodicCadence(targetCadence) 
      ? getDefaultActiveSubPeriod(targetCadence) 
      : '';

    const targetContent = targetPost.content || '';
    const parsedTarget = extractMarkdownTableFromContent(targetContent);
    const existingTopics = Array.from(new Set(
      parsedTarget.rows
        .map(r => (getRowVal(r, 'Jenis kegiatan') || '').trim())
        .filter(t => Boolean(t && t !== '-'))
    ));

    const currentTitle = (getRowVal(rowToMove, 'Jenis kegiatan') || '').trim();
    const hasExact = existingTopics.some(t => t.toLowerCase() === currentTitle.toLowerCase());

    setMoveModalData({
      sourceRow: rowToMove,
      targetPost,
      targetCadence,
      targetSubPeriod,
      existingTopicsInTarget: existingTopics
    });

    if (hasExact) {
      setMoveMode('existing_topic');
      setSelectedExistingTopic(existingTopics.find(t => t.toLowerCase() === currentTitle.toLowerCase()) || existingTopics[0] || '');
    } else {
      setMoveMode('new_topic');
      setSelectedExistingTopic(existingTopics[0] || '');
    }
    setCustomNewTopicTitle(currentTitle);
    setShowMovePopover(false);
  };

  // Executes the topic move after user chooses new topic vs existing topic
  const handleExecuteMoveTopic = async () => {
    if (!moveModalData || !postId) return;
    const { sourceRow, targetPost, targetCadence, targetSubPeriod } = moveModalData;

    const originalTaskName = getRowVal(sourceRow, 'Jenis kegiatan') || 'Kegiatan';
    const finalTopicTitle = moveMode === 'new_topic' 
      ? (customNewTopicTitle.trim() || originalTaskName)
      : selectedExistingTopic;

    if (!finalTopicTitle) {
      toast.error('Judul topik tujuan tidak boleh kosong');
      return;
    }

    setIsMovingTopic(true);
    toast.loading(`Memindahkan topik ke ${targetPost.title}...`, { id: 'move-topic' });

    try {
      const targetContent = targetPost.content || '';
      const parsedTarget = extractMarkdownTableFromContent(targetContent);
      const targetHeaders = parsedTarget.headers.length > 0 ? parsedTarget.headers : displayHeaders;

      let updatedTargetRows: TableRowData[];

      if (moveMode === 'new_topic') {
        // Buat baris kegiatan baru di halaman tujuan
        const rowCopy: TableRowData = { ...sourceRow };
        rowCopy['number'] = String(parsedTarget.rows.length + 1);
        rowCopy['Jenis kegiatan'] = finalTopicTitle;
        if (targetCadence) {
          rowCopy['Activity (routine/non routine)'] = targetCadence;
          rowCopy['Activity'] = targetCadence;
          rowCopy['Aktivitas'] = targetCadence;
          rowCopy['period'] = targetCadence;
          rowCopy['Periode'] = targetCadence;

          targetHeaders.forEach(h => {
            const hLower = h.toLowerCase();
            if (hLower.includes('activ') || hLower.includes('aktiv') || hLower.includes('period')) {
              rowCopy[h] = targetCadence;
            }
          });

          Object.keys(rowCopy).forEach(k => {
            const kLower = k.toLowerCase();
            if (kLower.includes('activ') || kLower.includes('aktiv') || kLower.includes('period')) {
              rowCopy[k] = targetCadence;
            }
          });
        }
        updatedTargetRows = [...parsedTarget.rows, rowCopy];
      } else {
        // Masukkan ke topik yang sudah ada: update kolom aktivitas topik tersebut
        updatedTargetRows = parsedTarget.rows.map(r => {
          const name = (getRowVal(r, 'Jenis kegiatan') || '').trim().toLowerCase();
          if (name === finalTopicTitle.toLowerCase()) {
            const updated = { ...r };
            if (targetCadence) {
              targetHeaders.forEach(h => {
                const hLower = h.toLowerCase();
                if (hLower.includes('activ') || hLower.includes('aktiv') || hLower.includes('period')) {
                  updated[h] = targetCadence;
                }
              });
            }
            return updated;
          }
          return r;
        });
      }

      const newTargetMarkdown = serializeMarkdownTable(targetHeaders, updatedTargetRows, parsedTarget.beforeText, parsedTarget.afterText);

      const putTargetRes = await fetch(`/api/bulletin/${targetPost.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newTargetMarkdown })
      });
      if (!putTargetRes.ok) throw new Error('Gagal memperbarui data di halaman tujuan');

      // Hapus baris dari halaman asal
      const updatedCurrentRows = localRows.filter(r => r !== sourceRow);
      const reindexedCurrent = updatedCurrentRows.map((r, i) => ({ ...r, number: String(i + 1) }));
      await saveTableToBackend(reindexedCurrent);
      setLocalRows(reindexedCurrent);
      setOriginalRowsBackup(JSON.parse(JSON.stringify(reindexedCurrent)));
      setDirtyRowIndices(new Set());
      onRowsChange?.(reindexedCurrent);

      // Migrasi komentar, lampiran & link logbook di backend
      try {
        await fetch('/api/bulletin/move-topic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromPostId: postId,
            toPostId: targetPost.id,
            topicTitle: originalTaskName,
            newTopicTitle: finalTopicTitle,
            targetCadence,
            targetSubPeriod
          })
        });
      } catch (e) {
        console.warn('Comments/logbook migration non-fatal warning:', e);
      }

      targetPost.content = newTargetMarkdown;

      if (moveMode === 'existing_topic') {
        toast.success(`Data topik berhasil digabungkan ke topik "${finalTopicTitle}" di "${targetPost.title}" ${targetSubPeriod ? `(Sub-topik: ${targetSubPeriod})` : ''}!`, {
          id: 'move-topic',
          action: onNavigateToPost ? {
            label: 'Buka Halaman',
            onClick: () => onNavigateToPost(targetPost)
          } : undefined
        });
      } else {
        toast.success(`Topik "${finalTopicTitle}" berhasil dibuat di "${targetPost.title}" ${targetSubPeriod ? `(Sub-topik: ${targetSubPeriod})` : ''}!`, {
          id: 'move-topic',
          action: onNavigateToPost ? {
            label: 'Buka Halaman',
            onClick: () => onNavigateToPost(targetPost)
          } : undefined
        });
      }

      if (selectedRow === sourceRow) {
        setSelectedRow(null);
      }
      setMoveModalData(null);
      setShowMovePopover(false);
    } catch (err: any) {
      toast.error('Gagal memindahkan topik: ' + (err.message || err), { id: 'move-topic' });
    } finally {
      setIsMovingTopic(false);
    }
  };

  // Active topic title for comments modal (incorporates sub-period if active for isolated threads)
  const selectedTopicTitle = useMemo(() => {
    if (!baseTopicTitle) return '';
    if (activeSubPeriod && activeSubPeriod.trim()) {
      return `${baseTopicTitle} - ${activeSubPeriod.trim()}`;
    }
    return baseTopicTitle;
  }, [baseTopicTitle, activeSubPeriod]);

  const activeTopicComments = useMemo(() => {
    if (!baseTopicTitle && !selectedRow?.id) return [];
    const baseQ = baseTopicTitle.toLowerCase().trim();
    const selQ = selectedTopicTitle ? selectedTopicTitle.toLowerCase().trim() : '';
    const rowId = (selectedRow?.id || '').toLowerCase().trim();

    return allComments.filter((c) => {
      const cTopic = (c.topicTitle || '').toLowerCase().trim();
      const cTopicId = (c.topicId || '').toLowerCase().trim();
      if (rowId && cTopicId && cTopicId === rowId) return true;
      if (selQ && cTopic === selQ) return true;
      if (baseQ && cTopic === baseQ) return true;
      return false;
    });
  }, [allComments, selectedTopicTitle, baseTopicTitle, selectedRow]);

  // Notion-style sorted comment stream (chronological oldest to newest)
  const sortedTopicComments = useMemo(() => {
    return [...activeTopicComments].sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return tA - tB;
    });
  }, [activeTopicComments]);

  // Ekstrak semua lampiran file dari komentar topik untuk Galeri Media
  const galleryItems = useMemo(() => {
    const list: { comment: any; attachment: CommentAttachmentItem; authorName: string }[] = [];
    activeTopicComments.forEach((c: any) => {
      if (c.fileUrl) {
        const atts = parseCommentAttachments(c.fileUrl, c.fileName, c.content);
        atts.forEach((att) => {
          list.push({ comment: c, attachment: att, authorName: c.authorName || 'Personil' });
        });
      }
    });
    return list;
  }, [activeTopicComments]);

  // Strukturkan komentar topik menjadi Root Comments & Nested Replies (Threaded)
  const { rootComments, repliesMap } = useMemo(() => {
    const roots: any[] = [];
    const replies: Record<number, any[]> = {};

    const commentIdMap = new Map<number, any>();
    activeTopicComments.forEach((c) => commentIdMap.set(c.id, c));

    // Cari ID komentar induk paling atas jika ada multi-level reply
    const findRootId = (item: any): number => {
      let curr = item;
      const visited = new Set<number>();
      while (curr && curr.replyToId && commentIdMap.has(curr.replyToId)) {
        if (visited.has(curr.id)) break;
        visited.add(curr.id);
        curr = commentIdMap.get(curr.replyToId);
      }
      return curr ? curr.id : item.id;
    };

    activeTopicComments.forEach((c) => {
      if (c.replyToId && commentIdMap.has(c.replyToId)) {
        const rootId = findRootId(c);
        if (!replies[rootId]) replies[rootId] = [];
        replies[rootId].push(c);
      } else {
        roots.push(c);
      }
    });

    // Urutkan balasan secara kronologis (dari yang terlama ke terbaru)
    Object.keys(replies).forEach((rId) => {
      replies[Number(rId)].sort((a, b) => {
        const tA = new Date(a.createdAt || 0).getTime();
        const tB = new Date(b.createdAt || 0).getTime();
        return tA - tB;
      });
    });

    return { rootComments: roots, repliesMap: replies };
  }, [activeTopicComments]);

  // Handler seragam untuk preview attachment (gambar via ImageModal, dokumen via tab baru)
  const handlePreviewAttachment = (att: CommentAttachmentItem) => {
    if (att.isImage) {
      setPreviewImage({
        url: att.directUrl || att.url,
        title: att.caption ? `${att.name} — "${att.caption}"` : att.name,
        driveViewUrl: att.driveViewUrl,
        driveDownloadUrl: att.driveDownloadUrl
      });
    } else if (att.driveViewUrl) {
      window.open(att.driveViewUrl, '_blank');
    }
  };

  // Save changes to database
  const saveTableToBackend = async (newRows: TableRowData[]): Promise<boolean> => {
    if (!postId) return false;
    try {
      const { rows: preppedRows } = migrateChecklistsInRows(newRows, section);
      // Normalize any legacy format subtask tags in Keterangan to canonical markdown checklists
      const normalizedRows = preppedRows.map(r => {
        const ket = getRowVal(r, 'Keterangan');
        if (ket && (ket.includes('**(Done)**') || ket.includes('**(OPEN)**') || ket.includes('**(Closed)**') || ket.includes('**(OP)**'))) {
          return {
            ...r,
            Keterangan: migrateLegacySubtaskText(ket)
          };
        }
        return r;
      });

      const updatedMarkdown = serializeMarkdownTable(displayHeaders, normalizedRows, beforeText, afterText);
      const res = await fetch(`/api/bulletin/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedMarkdown })
      });
      if (res.ok) {
        onPostContentUpdate?.(updatedMarkdown);

        // Instant background sync directly to logbook to guarantee zero delay
        fetch('/api/logbook/sync-from-bulletin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bulletinPostId: postId,
            section: section || '',
            userNik: currentAuthorNik || '',
            userName: currentAuthorName || ''
          })
        }).catch(err => console.warn('Instant logbook sync non-fatal:', err));

        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to persist table markdown to backend:', err);
      return false;
    }
  };

  // Handler untuk mengedit sel secara langsung di tabel tanpa membuka modal
  const handleUpdateCellDirect = (targetRowIndex: number, colName: string, newValue: string) => {
    setLocalRows(prev => {
      const copy = [...prev];
      if (!copy[targetRowIndex]) return prev;
      const targetRow = { ...copy[targetRowIndex] };
      
      const colLower = colName.toLowerCase().trim();
      let keyToSet = colName;
      for (const k of Object.keys(targetRow)) {
        if (k.toLowerCase().trim() === colLower) {
          keyToSet = k;
          break;
        }
      }
      targetRow[keyToSet] = newValue;
      if (colLower === 'jenis kegiatan' || colLower === 'judul' || colLower === 'task' || colLower === 'nama kegiatan') {
        targetRow['Jenis kegiatan'] = newValue;
        targetRow['Jenis Kegiatan'] = newValue;
      }

      // Smart Tasklist Auto-progress:
      // Otomatis open jika 0%, on progress jika progress berjalan (>0% & <100%), closed ketika 100%
      if (colLower.includes('keterangan') || colLower.includes('catatan') || colLower.includes('deskripsi') || colLower.includes('rincian')) {
        const taskProg = parseTasklist(newValue);
        if (taskProg.hasTasklist) {
          const autoStatus = taskProg.percentage === 0 ? 'Open' : taskProg.percentage === 100 ? 'Closed' : 'On Progress';
          let statusKey = 'Status';
          for (const k of Object.keys(targetRow)) {
            if (k.toLowerCase().trim() === 'status') {
              statusKey = k;
              break;
            }
          }
          targetRow[statusKey] = autoStatus;

          // Auto-sync Tanggal Selesai column
          let compKey = 'Tanggal Selesai';
          for (const k of Object.keys(targetRow)) {
            const kl = k.toLowerCase().trim();
            if (kl.includes('tanggal selesai') || kl.includes('completed') || kl.includes('aktual selesai') || kl === 'selesai' || kl.includes('waktu selesai')) {
              compKey = k;
              break;
            }
          }

          if (autoStatus === 'Closed') {
            const dates = taskProg.items.map(i => i.checkedDate).filter((d): d is string => Boolean(d)).sort();
            targetRow[compKey] = dates.length > 0 ? dates[dates.length - 1] : new Date().toISOString().slice(0, 10);
          } else if (autoStatus === 'Open' || autoStatus === 'On Progress') {
            targetRow[compKey] = '-';
          }
        }
      }

      // Auto-sync Tanggal Selesai when Status column is updated directly
      if (colLower.includes('status')) {
        const stUpper = (newValue || '').toUpperCase();
        let compKey = 'Tanggal Selesai';
        for (const k of Object.keys(targetRow)) {
          const kl = k.toLowerCase().trim();
          if (kl.includes('tanggal selesai') || kl.includes('completed') || kl.includes('aktual selesai') || kl === 'selesai' || kl.includes('waktu selesai')) {
            compKey = k;
            break;
          }
        }

        if (stUpper.includes('CLOSE') || stUpper.includes('SELESAI') || stUpper.includes('DONE')) {
          const curVal = targetRow[compKey];
          if (!curVal || curVal === '-') {
            targetRow[compKey] = new Date().toISOString().slice(0, 10);
          }

          // Trigger routine task rollover for routine tasks when closed directly
          const rowAct = getRowVal(targetRow, 'Activity (routine/non routine)') || getRowVal(targetRow, 'period') || getRowVal(targetRow, 'Frekuensi') || '';
          const rowCad = normalizeCadence(rowAct) || currentCadence;
          if (rowCad && rowCad !== 'Non-Routine') {
            const curPeriod = activeSubPeriod || detectRowSubPeriod(targetRow, rowCad) || getDefaultActiveSubPeriod(rowCad);
            const targetVal = getRowVal(targetRow, 'Target Selesai') || getRowVal(targetRow, 'Deadline') || getRowVal(targetRow, 'Created Time');
            const schedule = getNextPeriodSchedule(rowCad, curPeriod, targetVal);
            const curKeterangan = getRowVal(targetRow, 'Keterangan') || getRowVal(targetRow, 'Description') || '';
            const resetDesc = resetAllTasklistItems(curKeterangan);

            setRoutineCompletionModal({
              row: targetRow,
              rowIndex: targetRowIndex,
              colName: 'Keterangan',
              currentPeriod: curPeriod,
              nextPeriod: schedule.nextPeriod,
              nextStartDate: schedule.nextStartDate,
              nextTargetDate: schedule.nextTargetDate,
              resetKeterangan: resetDesc
            });
          }
        } else if (stUpper.includes('OPEN') || stUpper.includes('PROGRESS')) {
          targetRow[compKey] = '-';
        }
      }

      copy[targetRowIndex] = targetRow;

      // Auto-save perubahan sel langsung ke backend & parent
      saveTableToBackend(copy);
      onRowsChange?.(copy);

      // Keep Topic Discussion drawer in sync if open
      if (selectedRow) {
        const curSelectedTitle = getRowVal(selectedRow, 'Jenis kegiatan');
        const updatedTitle = getRowVal(targetRow, 'Jenis kegiatan');
        if (curSelectedTitle && curSelectedTitle === updatedTitle) {
          setSelectedRow(targetRow);
        }
      }

      return copy;
    });
  };

  // Toggle item checklist tasklist langsung pada baris tabel
  const handleToggleTasklistDirect = (targetRowIndex: number, colName: string, taskIndex: number) => {
    const row = localRows[targetRowIndex];
    if (!row) return;
    const currentVal = getRowVal(row, colName);
    const prevProg = parseTasklist(currentVal);
    const willBeCompleted = prevProg.items[taskIndex] && !prevProg.items[taskIndex].checked && (prevProg.completed + 1 === prevProg.total);

    const executeToggle = () => {
      const updatedVal = toggleTasklistItem(currentVal, taskIndex);
      handleUpdateCellDirect(targetRowIndex, colName, updatedVal);

      // Auto-check if this toggle completed the routine task (last subtask checked -> 100%)
      const newProg = parseTasklist(updatedVal);
      if (newProg.hasTasklist && newProg.total > 0 && newProg.completed === newProg.total && prevProg.completed < prevProg.total) {
        const rowAct = getRowVal(row, 'Activity (routine/non routine)') || getRowVal(row, 'period') || '';
        const rowCad = normalizeCadence(rowAct) || currentCadence;
        if (rowCad && rowCad !== 'Non-Routine') {
          const curPeriod = activeSubPeriod || detectRowSubPeriod(row, rowCad) || getDefaultActiveSubPeriod(rowCad);
          const targetVal = getRowVal(row, 'Target Selesai') || getRowVal(row, 'Deadline') || getRowVal(row, 'Created Time');
          const schedule = getNextPeriodSchedule(rowCad, curPeriod, targetVal);
          const resetDesc = resetAllTasklistItems(updatedVal);

          setRoutineCompletionModal({
            row,
            rowIndex: targetRowIndex,
            colName,
            currentPeriod: curPeriod,
            nextPeriod: schedule.nextPeriod,
            nextStartDate: schedule.nextStartDate,
            nextTargetDate: schedule.nextTargetDate,
            resetKeterangan: resetDesc
          });
        }
      }
    };

    if (willBeCompleted) {
      const rowTitle = getDisplayTitle(getRowVal(row, 'Jenis kegiatan') || getRowVal(row, 'Name') || 'Kegiatan');
      setLastSubtaskConfirmModal({
        isOpen: true,
        topicTitle: rowTitle,
        onConfirm: executeToggle
      });
    } else {
      executeToggle();
    }
  };

  // Handler saat user konfirmasi untuk membuat kembali task routine untuk periode selanjutnya
  const handleConfirmNextPeriod = async () => {
    if (!routineCompletionModal) return;
    const { row, rowIndex, colName, nextPeriod, nextStartDate, nextTargetDate, resetKeterangan } = routineCompletionModal;
    const baseTopic = (getRowVal(row, 'Jenis kegiatan') || '').trim();

    // 1. Tambah periode selanjutnya ke customPeriodsMap
    setCustomPeriodsMap(prev => ({
      ...prev,
      [baseTopic]: [...(prev[baseTopic] || []).filter(p => p !== nextPeriod), nextPeriod]
    }));

    // 2. Alihkan sub-period aktif ke periode baru tersebut
    setActiveSubPeriod(nextPeriod);

    // 3. Update baris tabel: reset checklist subtask, reset status ke Open, update target selesai
    const updatedRows = [...localRows];
    if (updatedRows[rowIndex]) {
      const targetRow = { ...updatedRows[rowIndex] };

      // Update Keterangan
      let keyToSet = colName;
      const colLower = colName.toLowerCase().trim();
      for (const k of Object.keys(targetRow)) {
        if (k.toLowerCase().trim() === colLower) {
          keyToSet = k;
          break;
        }
      }
      targetRow[keyToSet] = resetKeterangan;

      // Update Status ke Open
      for (const k of Object.keys(targetRow)) {
        if (k.toLowerCase().trim() === 'status') {
          targetRow[k] = 'Open';
          break;
        }
      }

      // Update Target Selesai
      let targetFound = false;
      for (const k of Object.keys(targetRow)) {
        const kl = k.toLowerCase().trim();
        if (kl.includes('target') || kl.includes('deadline')) {
          targetRow[k] = nextTargetDate;
          targetFound = true;
          break;
        }
      }
      if (!targetFound) {
        targetRow['Target Selesai'] = nextTargetDate;
      }

      updatedRows[rowIndex] = targetRow;
      setLocalRows(updatedRows);
      if (selectedRow) {
        setSelectedRow(targetRow);
      }
      setDirtyRowIndices(prev => {
        const next = new Set(prev);
        next.add(rowIndex);
        return next;
      });

      // Simpan perubahan tabel ke backend
      await saveTableToBackend(updatedRows);
      onRowsChange?.(updatedRows);
    }

    // 4. Buat room diskusi awal untuk periode baru agar traceability mandiri tercatat
    if (postId && baseTopic) {
      try {
        await fetch(`/api/bulletin/${postId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topicTitle: `${baseTopic} - ${nextPeriod}`,
            content: `🎯 Periode baru **${nextPeriod}** telah dibuka dengan target penyelesaian ${nextTargetDate}. Seluruh checklist subtask telah siap kembali.`,
            authorNik: currentAuthorNik || 'SYSTEM',
            authorName: currentAuthorName || 'Sistem Routine',
            statusUpdate: 'Open'
          })
        });
        fetchComments();
      } catch (e) {
        console.warn('Initial period comment creation warning:', e);
      }
    }

    // 5. Cek apakah ada task logbook terhubung dan sinkronkan rollover ke logbook
    try {
      const res = await fetch(`/api/logbook/tasks?bulletinPostId=${postId}`);
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data?.todayTasks)) {
        const matched = json.data.todayTasks.find((t: any) => 
          (t.title && t.title.toLowerCase().trim() === baseTopic.toLowerCase().trim()) ||
          (t.bulletinTopicTitle && t.bulletinTopicTitle.toLowerCase().trim().startsWith(baseTopic.toLowerCase().trim()))
        );
        if (matched) {
          await fetch('/api/logbook/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: matched.title,
              description: resetKeterangan,
              section: matched.section,
              assigneeNik: matched.assigneeNik,
              assigneeName: matched.assigneeName,
              assignedByNik: matched.assignedByNik || currentAuthorNik,
              assignedByName: matched.assignedByName || currentAuthorName,
              priority: matched.priority || 'Normal',
              activityType: matched.activityType || currentCadence || 'Yearly',
              taskDate: nextStartDate || nextTargetDate,
              plannedDate: nextStartDate || nextTargetDate,
              targetDate: nextTargetDate,
              targetTime: matched.targetTime || '23:59',
              status: 'Open',
              progressPercent: 0,
              pt: matched.pt,
              bulletinPostId: postId,
              bulletinTopicTitle: `${baseTopic} - ${nextPeriod}`
            })
          });
        }
      }
    } catch (e) {
      console.warn('Connected logbook rollover non-fatal warning:', e);
    }

    toast.success(`🎉 Periode baru "${nextPeriod}" berhasil dibuka dengan subtask yang telah direset!`);
    setRoutineCompletionModal(null);
  };

  // Batalkan semua perubahan langsung
  const handleDiscardDirectChanges = () => {
    setLocalRows(JSON.parse(JSON.stringify(originalRowsBackup)));
    setDirtyRowIndices(new Set());
    setActiveInlineEditor(null);
    setShowSaveConfirmModal(false);
    toast.info('Perubahan tabel telah dibatalkan');
  };

  // Simpan perubahan langsung setelah konfirmasi modal
  const handleConfirmSaveDirectChanges = async () => {
    setIsPersistingChanges(true);
    try {
      const success = await saveTableToBackend(localRows);
      if (success) {
        setOriginalRowsBackup(JSON.parse(JSON.stringify(localRows)));
        setDirtyRowIndices(new Set());
        setShowSaveConfirmModal(false);
        onRowsChange?.(localRows);
        toast.success('Perubahan tabel berhasil disimpan ke dokumen Labnote!');
      } else {
        toast.error('Gagal menyimpan perubahan ke server');
      }
    } catch (err: any) {
      toast.error('Gagal menyimpan perubahan: ' + (err.message || err));
    } finally {
      setIsPersistingChanges(false);
    }
  };

  // Add Row Handler
  const handleOpenAddModal = () => {
    setSelectedRow(null);
    const nextNum = String(localRows.length + 1);
    const now = new Date();
    const createdStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const inheritedCadence = currentCadence || normalizeCadence(title) || 'Monthly';
    const inheritedPeriod = (inheritedCadence && inheritedCadence !== 'Non-Routine')
      ? inheritedCadence
      : 'Monthly';

    setRowFormData({
      number: nextNum,
      'Jenis kegiatan': '',
      'Jenis Kegiatan': '',
      Keterangan: '',
      PIC: currentAuthorName || '',
      Priority: 'Normal',
      Status: 'Open',
      'Created Time': createdStr,
      Kategori: section || 'Laboratorium',
      'Activity (routine/non routine)': inheritedCadence,
      period: inheritedPeriod
    });
    setEditingRowIndex(null);
    setShowRowModal(true);
  };

  // Add Sub-Item Handler (Sub-kegiatan di bawah baris kegiatan induk)
  const handleAddSubItem = async (parentRowOrIndex: TableRowData | number, subItemTitle: string) => {
    const cleanTitle = subItemTitle.trim();
    if (!cleanTitle) {
      setCreatingSubItemForParent(null);
      return;
    }

    let parentRow: TableRowData | undefined;
    let actualParentIdx = -1;

    if (typeof parentRowOrIndex === 'number') {
      actualParentIdx = parentRowOrIndex;
      parentRow = localRows[parentRowOrIndex];
    } else {
      parentRow = parentRowOrIndex;
      actualParentIdx = localRows.indexOf(parentRowOrIndex);
      if (actualParentIdx === -1) {
        actualParentIdx = localRows.findIndex(r => 
          (parentRowOrIndex.id && r.id === parentRowOrIndex.id) || 
          (parentRowOrIndex['Jenis kegiatan'] && r['Jenis kegiatan'] === parentRowOrIndex['Jenis kegiatan'])
        );
      }
    }

    if (!parentRow) return;
    if (actualParentIdx === -1) actualParentIdx = 0;

    const parentCat = getRowVal(parentRow, 'Kategori') || section || 'Laboratorium';
    const parentPIC = getRowVal(parentRow, 'PIC') || currentAuthorName || '';
    const parentAct = getRowVal(parentRow, 'Activity (routine/non routine)') || 'Monthly';
    const parentPeriod = getRowVal(parentRow, 'period') || 'Monthly';
    
    const now = new Date();
    const createdStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const parentId = parentRow.id || `parent-${actualParentIdx}-${parentRow['Jenis kegiatan'] || ''}`;
    const formattedTitle = `↳ ${cleanTitle}`;
    const newSubRow: TableRowData = {
      number: '',
      'Jenis kegiatan': formattedTitle,
      'Jenis Kegiatan': formattedTitle,
      Keterangan: '',
      PIC: parentPIC,
      Priority: 'Normal',
      Status: 'Open',
      'Created Time': createdStr,
      Kategori: parentCat,
      'Activity (routine/non routine)': parentAct,
      period: parentPeriod,
      isSubItem: 'true',
      parentId: parentId
    };

    // Cari posisi sisip: tepat setelah sub-item terakhir dari parent ini
    let insertIdx = actualParentIdx + 1;
    while (insertIdx < localRows.length && isSubItemRow(localRows[insertIdx])) {
      insertIdx++;
    }

    const nextRows = [...localRows];
    nextRows.splice(insertIdx, 0, newSubRow);

    setLocalRows(nextRows);
    const updatedDirty = new Set(dirtyRowIndices);
    updatedDirty.add(insertIdx);
    setDirtyRowIndices(updatedDirty);

    // Pastikan parent dalam keadaan expanded
    setExpandedParents(prev => ({
      ...prev,
      [actualParentIdx]: true,
      [parentId]: true
    }));

    setCreatingSubItemForParent(null);
    setNewSubItemTitle('');

    onRowsChange?.(nextRows);
    await saveTableToBackend(nextRows);

    toast.success(`Sub-kegiatan "${cleanTitle}" berhasil ditambahkan`);
  };

  // Helper to migrate existing checklists in Keterangan to hierarchical sub-items
  const migrateRowsSubtasksInternal = (inputRows: TableRowData[]) => {
    let migratedCount = 0;
    const newRows: TableRowData[] = [];

    for (let i = 0; i < inputRows.length; i++) {
      const row = { ...inputRows[i] };
      const isSub = isSubItemRow(row);

      if (isSub) {
        newRows.push(row);
        continue;
      }

      const ketVal = getRowVal(row, 'Keterangan') || '';
      const taskProg = parseTasklist(ketVal);

      if (taskProg.hasTasklist && taskProg.items.length > 0) {
        // Strip tasklist lines from parent row's Keterangan, keep non-checklist text
        row['Keterangan'] = taskProg.cleanText || '-';
        newRows.push(row);

        const parentIndex = newRows.length - 1;
        const parentCat = getRowVal(row, 'Kategori') || section || 'Laboratorium';
        const parentPIC = getRowVal(row, 'PIC') || '';
        const parentAct = getRowVal(row, 'Activity (routine/non routine)') || 'Monthly';
        const parentPeriod = getRowVal(row, 'period') || 'Monthly';
        const now = new Date();
        const createdStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // Create a sub-item row for each checklist item
        taskProg.items.forEach(item => {
          const subTitle = `↳ ${item.checked ? '[x] ' : '[ ] '}${item.text}`;
          const subRow: TableRowData = {
            number: '',
            'Jenis kegiatan': subTitle,
            'Jenis Kegiatan': subTitle,
            Keterangan: item.note || '-',
            PIC: parentPIC,
            Priority: 'Normal',
            Status: item.checked ? 'Closed' : 'Open',
            'Created Time': createdStr,
            Kategori: parentCat,
            'Activity (routine/non routine)': parentAct,
            period: parentPeriod,
            isSubItem: 'true',
            parentId: String(parentIndex)
          };
          newRows.push(subRow);
          migratedCount++;
        });
      } else {
        newRows.push(row);
      }
    }

    return { newRows, migratedCount };
  };

  // Manual migration handler available via button, auto-migration disabled to prevent unintended row mutations

  // Migrate existing checklists in Keterangan to hierarchical sub-items
  const handleMigrateChecklistsToSubItems = () => {
    const { newRows, migratedCount } = migrateRowsSubtasksInternal(localRows);

    if (migratedCount > 0) {
      setLocalRows(newRows);
      saveTableToBackend(newRows);
      toast.success(`Berhasil memindahkan ${migratedCount} subtask ke model baris sub-kegiatan baru!`);
    } else {
      toast.info('Tidak ada checklist di dalam Keterangan yang perlu dipindahkan.');
    }
  };

  // Toggle Checklist Sub-Item Completed Status & Sinkronkan Progres Task Utama
  const handleToggleSubItemCompleted = (subRowIndex: number, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;
    const subRow = localRows[subRowIndex];
    if (!subRow) return;

    // Temukan baris kegiatan utama (parent) untuk sub-item ini
    let parentIdx = -1;
    for (let i = subRowIndex - 1; i >= 0; i--) {
      if (!isSubItemRow(localRows[i])) {
        parentIdx = i;
        break;
      }
    }

    // Helper untuk sinkronisasi tanggal selesai ke semua variasi alias kolom tanggal selesai
    const setRowCompletedDate = (targetRow: TableRowData, dateVal: string) => {
      let matched = false;
      for (const k of Object.keys(targetRow)) {
        const kl = k.toLowerCase().trim();
        if (kl.includes('tanggal selesai') || kl.includes('completed') || kl.includes('aktual selesai') || kl === 'selesai' || kl.includes('waktu selesai')) {
          targetRow[k] = dateVal;
          matched = true;
        }
      }
      displayHeaders.forEach(h => {
        const hl = h.toLowerCase().trim();
        if (hl.includes('tanggal selesai') || hl.includes('completed') || hl.includes('aktual selesai') || hl === 'selesai' || hl.includes('waktu selesai')) {
          targetRow[h] = dateVal;
          matched = true;
        }
      });
      targetRow['Tanggal Selesai'] = dateVal;
    };

    const executeToggle = async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const updatedRow = { ...subRow };
      updatedRow.isCompleted = nextCompleted ? 'true' : 'false';
      updatedRow.Status = nextCompleted ? 'Closed' : 'Open';

      // Also update sub-item title prefix ↳ [x] vs ↳ [ ]
      const currentTitle = getRowVal(subRow, 'Jenis kegiatan') || getRowVal(subRow, 'Jenis Kegiatan') || '';
      if (currentTitle) {
        const cleanTitle = getDisplayTitle(currentTitle);
        const newTitle = `↳ [${nextCompleted ? 'x' : ' '}] ${cleanTitle}`;
        if (updatedRow['Jenis kegiatan'] !== undefined) updatedRow['Jenis kegiatan'] = newTitle;
        if (updatedRow['Jenis Kegiatan'] !== undefined) updatedRow['Jenis Kegiatan'] = newTitle;
        if (updatedRow['Name'] !== undefined) updatedRow['Name'] = newTitle;
        if (updatedRow['Judul'] !== undefined) updatedRow['Judul'] = newTitle;
      }
      
      // 1. Masukan tanggal selesai di baris subtask jika subtask diceklis, atau reset '-' jika batal diceklis
      setRowCompletedDate(updatedRow, nextCompleted ? todayStr : '-');

      const nextRows = [...localRows];
      nextRows[subRowIndex] = updatedRow;

      if (parentIdx !== -1) {
        const siblingSubIndices: number[] = [];
        for (let i = parentIdx + 1; i < nextRows.length; i++) {
          if (isSubItemRow(nextRows[i])) {
            siblingSubIndices.push(i);
          } else {
            break;
          }
        }

        const totalSubs = siblingSubIndices.length;
        const completedSubs = siblingSubIndices.filter(idx => isSubItemCompleted(nextRows[idx])).length;

        const parentRow = { ...nextRows[parentIdx] };
        const currentParentStatus = (getRowVal(parentRow, 'Status') || '').toUpperCase();

        if (!currentParentStatus.includes('CANCEL')) {
          if (totalSubs > 0 && completedSubs === totalSubs) {
            parentRow.Status = 'Closed';
            // 2. Masukan tanggal selesai di baris tugas utama jika SEMUA subtask diceklis
            setRowCompletedDate(parentRow, todayStr);
            toast.success(`Semua subtask selesai! Status kegiatan "${getDisplayTitle(getRowVal(parentRow, 'Jenis kegiatan') || '')}" otomatis diubah menjadi Closed.`);
          } else if (completedSubs > 0) {
            parentRow.Status = 'On Progress';
            // Reset tanggal selesai tugas utama jika belum semua subtask diceklis
            setRowCompletedDate(parentRow, '-');
          } else {
            parentRow.Status = 'Open';
            // Reset tanggal selesai tugas utama jika belum ada subtask diceklis
            setRowCompletedDate(parentRow, '-');
          }
          nextRows[parentIdx] = parentRow;
        }
      }

      const updatedDirty = new Set(dirtyRowIndices);
      updatedDirty.add(subRowIndex);
      if (parentIdx !== -1) updatedDirty.add(parentIdx);
      setDirtyRowIndices(updatedDirty);

      setLocalRows(nextRows);
      onRowsChange?.(nextRows);
      await saveTableToBackend(nextRows);
    };

    // Cek apakah aksi ini akan menyelesaikan subtask TERAKHIR dan otomatis menutup task utama
    if (nextCompleted && parentIdx !== -1) {
      const siblingSubIndices: number[] = [];
      for (let i = parentIdx + 1; i < localRows.length; i++) {
        if (isSubItemRow(localRows[i])) {
          siblingSubIndices.push(i);
        } else {
          break;
        }
      }

      const totalSubs = siblingSubIndices.length;
      const otherCompletedSubs = siblingSubIndices.filter(idx => idx !== subRowIndex && isSubItemCompleted(localRows[idx])).length;
      const willBeAllCompleted = totalSubs > 0 && (otherCompletedSubs + 1 === totalSubs);

      if (willBeAllCompleted) {
        const parentTopicTitle = getDisplayTitle(getRowVal(localRows[parentIdx], 'Jenis kegiatan') || getRowVal(localRows[parentIdx], 'Name') || 'Kegiatan');
        setLastSubtaskConfirmModal({
          isOpen: true,
          topicTitle: parentTopicTitle,
          onConfirm: executeToggle
        });
        return;
      }
    }

    executeToggle();
  };

  // Edit Row Handler
  const handleOpenEditModal = (row: TableRowData, index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedRow(null);
    const data: TableRowData = {};
    displayHeaders.forEach(h => {
      data[h] = getRowVal(row, h);
    });
    // Ensure both casing variants of title are explicitly populated
    const titleVal = getRowVal(row, 'Jenis Kegiatan') || getRowVal(row, 'Jenis kegiatan') || '';
    data['Jenis Kegiatan'] = titleVal;
    data['Jenis kegiatan'] = titleVal;
    setRowFormData(data);
    setEditingRowIndex(index);
    setShowRowModal(true);
  };

  // Save Row (Create / Edit)
  const handleSaveRow = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = (rowFormData['Jenis kegiatan'] || rowFormData['Jenis Kegiatan'] || '').trim();
    if (!title) {
      toast.error('Wajib mengisi "Jenis kegiatan"');
      return;
    }

    const cleanedRow = { ...rowFormData };
    // Synchronize title across both casing keys and any matching header
    cleanedRow['Jenis kegiatan'] = title;
    cleanedRow['Jenis Kegiatan'] = title;
    displayHeaders.forEach(h => {
      const hLower = h.toLowerCase().trim();
      if (hLower === 'jenis kegiatan' || hLower === 'judul' || hLower === 'task' || hLower === 'nama kegiatan') {
        cleanedRow[h] = title;
      }
    });

    // Auto-progress status jika berisi tasklist (kecuali jika user memilih Canceled)
    const taskProg = parseTasklist(cleanedRow['Keterangan']);
    if (taskProg.hasTasklist) {
      const curSt = (cleanedRow['Status'] || '').toLowerCase();
      if (!curSt.includes('cancel')) {
        cleanedRow['Status'] = taskProg.percentage === 0 ? 'Open' : taskProg.percentage === 100 ? 'Closed' : 'On Progress';
      }
    }

    setIsSavingRow(true);
    try {
      let updatedRows: TableRowData[];
      if (editingRowIndex === null) {
        // Adding new row -> place at TOP (#1, nomor paling sedikit)
        let parentCounter = 1;
        cleanedRow.number = String(parentCounter++);

        const adjustedExisting = localRows.map(r => {
          if (isSubItemRow(r)) return r;
          return { ...r, number: String(parentCounter++) };
        });

        updatedRows = [cleanedRow, ...adjustedExisting];
        toast.success('Data kegiatan baru berhasil ditambahkan di nomor paling atas (#1)!');
      } else {
        // Editing existing row
        updatedRows = localRows.map((r, i) => i === editingRowIndex ? { ...r, ...cleanedRow } : r);
        toast.success('Perubahan data kegiatan berhasil disimpan!');
      }

      setLocalRows(updatedRows);
      onRowsChange?.(updatedRows);
      await saveTableToBackend(updatedRows);
      setShowRowModal(false);

      if (selectedRow && editingRowIndex !== null) {
        setSelectedRow(cleanedRow);
      }
    } catch (err: any) {
      toast.error('Gagal menyimpan baris data: ' + err.message);
    } finally {
      setIsSavingRow(false);
    }
  };

  // Insert Blank Row Inline directly into table (starts manual inline editing immediately)
  const handleInsertBlankRow = (insertAtIndex: number = 0) => {
    const now = new Date();
    const createdStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const inheritedCadence = currentCadence || 'Non Routine';

    const blankRow: TableRowData = {
      number: '1',
      'Jenis kegiatan': '',
      'Jenis Kegiatan': '',
      Keterangan: '-',
      PIC: currentAuthorName || '',
      Priority: 'Normal',
      Status: 'Open',
      'Created Time': createdStr,
      Kategori: section || 'Laboratorium',
      'Activity (routine/non routine)': inheritedCadence,
      period: inheritedCadence
    };

    displayHeaders.forEach(h => {
      if (blankRow[h] === undefined) {
        blankRow[h] = '-';
      }
    });

    const nextRows = [...localRows];
    nextRows.splice(insertAtIndex, 0, blankRow);

    // Renumber parent rows sequentially starting from 1
    let parentNum = 1;
    const renumbered = nextRows.map(r => {
      if (isSubItemRow(r)) return r;
      return { ...r, number: String(parentNum++) };
    });

    setLocalRows(renumbered);
    onRowsChange?.(renumbered);
    saveTableToBackend(renumbered);

    // Immediately activate inline editor on the new empty cell
    setActiveInlineEditor({
      rowIndex: insertAtIndex,
      colName: 'Jenis kegiatan',
      initialValue: '',
      multiline: false
    });

    toast.success('Baris kosong baru ditambahkan. Silakan ketik langsung nama kegiatan di tabel.');
  };

  // Delete Row Handler
  const handleDeleteRow = async (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetRow = localRows[index];
    const taskName = targetRow ? getRowVal(targetRow, 'Jenis kegiatan') : `Baris #${index + 1}`;

    if (!window.confirm(`Apakah Anda yakin ingin menghapus data kegiatan: "${taskName}"?`)) {
      return;
    }

    try {
      const updatedRows = localRows.filter((_, i) => i !== index);
      // Re-index number column
      const reindexed = updatedRows.map((r, i) => ({
        ...r,
        number: String(i + 1)
      }));

      setLocalRows(reindexed);
      onRowsChange?.(reindexed);
      await saveTableToBackend(reindexed);

      toast.success(`Data kegiatan "${taskName}" berhasil dihapus!`);
      if (selectedRow === targetRow) {
        setSelectedRow(null);
      }
    } catch (err) {
      toast.error('Gagal menghapus baris');
    }
  };

  // Map setiap baris sub-item ke baris parent-nya di localRows
  const rowToParentMap = useMemo(() => {
    const map = new Map<TableRowData, TableRowData>();
    let activeParentRef: TableRowData | null = null;
    localRows.forEach(r => {
      if (isSubItemRow(r)) {
        if (activeParentRef) {
          map.set(r, activeParentRef);
        }
      } else {
        activeParentRef = r;
      }
    });
    return map;
  }, [localRows]);

  // Filter and sort rows
  const filteredRows = useMemo(() => {
    let result = [...localRows];

    // Filter out completely empty separator or blank rows
    result = result.filter((row) => {
      const vals = Object.values(row).map((v) => (v || '').trim());
      return vals.some((v) => v !== '' && v !== '-' && v !== '---');
    });

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      // Simpan parent atau subtask yang cocok
      const matchingRows = new Set<TableRowData>();
      result.forEach((row) => {
        const matches = Object.values(row).some((val) => 
          (val || '').toLowerCase().includes(q)
        );
        if (matches) {
          matchingRows.add(row);
          if (isSubItemRow(row)) {
            const p = rowToParentMap.get(row);
            if (p) matchingRows.add(p);
          }
        }
      });
      result = result.filter((row) => {
        if (matchingRows.has(row)) return true;
        if (isSubItemRow(row)) {
          const p = rowToParentMap.get(row);
          return p ? matchingRows.has(p) : false;
        }
        return false;
      });
    }

    // 2. Status Multi-Select Filter (Subtask tak terpisahkan dari parent-nya)
    if (selectedStatuses.length > 0 && !selectedStatuses.includes('ALL')) {
      const passingParentRows = new Set<TableRowData>();
      localRows.forEach((row) => {
        if (!isSubItemRow(row)) {
          const val = (getRowVal(row, 'Status') || '').toUpperCase().trim();
          const matches = selectedStatuses.some((st) => {
            if (st === 'ACTIVE') return !val.includes('CLOSE') && !val.includes('SELESAI') && !val.includes('DONE') && !val.includes('CANCEL') && !val.includes('BATAL');
            if (st === 'ON PROGRESS') return val.includes('PROGRESS') || val.includes('PROSES');
            if (st === 'CLOSE') return val.includes('CLOSE') || val.includes('SELESAI') || val.includes('DONE');
            if (st === 'OPEN') return val.includes('OPEN') || val.includes('BARU');
            if (st === 'CANCELED') return val.includes('CANCEL') || val.includes('BATAL');
            if (st === 'PENDING') return val.includes('PENDING') || val.includes('HOLD') || val.includes('DELAY');
            return val === st;
          });
          if (matches) passingParentRows.add(row);
        }
      });

      result = result.filter((row) => {
        if (!isSubItemRow(row)) {
          return passingParentRows.has(row);
        }
        // Sub-item selalu mengikuti parent-nya agar tidak terpisah/hilang saat diceklis
        const parent = rowToParentMap.get(row);
        return parent ? passingParentRows.has(parent) : true;
      });
    }

    // 3. Priority Multi-Select Filter
    if (selectedPriorities.length > 0 && !selectedPriorities.includes('ALL')) {
      const passingParentRows = new Set<TableRowData>();
      localRows.forEach((row) => {
        if (!isSubItemRow(row)) {
          const val = (getRowVal(row, 'Priority') || '').toUpperCase().trim();
          const matches = selectedPriorities.some((pKey) => {
            if (pKey === 'URGENT') return val.includes('URGENT') || val.includes('KRITIS') || val.includes('CRITICAL');
            if (pKey === 'HIGH') return (val.includes('HIGH') || val.includes('TINGGI')) && !val.includes('URGENT');
            if (pKey === 'MEDIUM') return val.includes('MEDIUM') || val.includes('SEDANG');
            if (pKey === 'NORMAL') return (val.includes('NORMAL') || val.includes('BIASA')) && !val.includes('MEDIUM');
            if (pKey === 'LOW') return val.includes('LOW') || val.includes('RENDAH');
            return val.includes(pKey);
          });
          if (matches) passingParentRows.add(row);
        }
      });

      result = result.filter((row) => {
        if (!isSubItemRow(row)) {
          return passingParentRows.has(row);
        }
        const parent = rowToParentMap.get(row);
        return parent ? passingParentRows.has(parent) : true;
      });
    }

    // 3b. PIC Multi-Select Filter
    if (selectedPics.length > 0 && !selectedPics.includes('ALL')) {
      const passingParentRows = new Set<TableRowData>();
      localRows.forEach((row) => {
        if (!isSubItemRow(row)) {
          const rawPic = (getRowVal(row, 'PIC') || getRowVal(row, 'pic') || '').trim();
          const matches = selectedPics.some((p) => {
            if (p === '(Tanpa PIC)') {
              return !rawPic || rawPic === '-';
            }
            return rawPic.toLowerCase() === p.toLowerCase() || rawPic.toLowerCase().includes(p.toLowerCase());
          });
          if (matches) passingParentRows.add(row);
        }
      });

      result = result.filter((row) => {
        if (!isSubItemRow(row)) {
          return passingParentRows.has(row);
        }
        const parent = rowToParentMap.get(row);
        return parent ? passingParentRows.has(parent) : true;
      });
    }

    // 4. Sort
    if (sortColumn) {
      result.sort((a, b) => {
        const rawA = (getRowVal(a, sortColumn) || '').trim();
        const rawB = (getRowVal(b, sortColumn) || '').trim();

        // If numeric column (number)
        if (sortColumn.toLowerCase() === 'number' || sortColumn.toLowerCase() === 'no') {
          const numA = parseFloat(rawA) || 0;
          const numB = parseFloat(rawB) || 0;
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        // If priority column (weighted: Urgent > High > Medium > Normal > Low)
        if (sortColumn.toLowerCase().includes('priorit') || sortColumn.toLowerCase() === 'priority') {
          const wA = getPriorityWeight(rawA);
          const wB = getPriorityWeight(rawB);
          return sortDirection === 'asc' ? wA - wB : wB - wA;
        }

        // If date/time column
        const timeA = Date.parse(rawA);
        const timeB = Date.parse(rawB);
        if (!isNaN(timeA) && !isNaN(timeB)) {
          return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
        }

        const valA = rawA.toLowerCase();
        const valB = rawB.toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [localRows, searchQuery, selectedStatuses, selectedPriorities, selectedPics, sortColumn, sortDirection, getRowVal]);

  // Grouped rows for Notion Database Sections (e.g. 'Non Routine Lainnya (22)', 'PTK GTS (2)')
  const groupedRowsData = useMemo(() => {
    const map = new Map<string, TableRowData[]>();
    filteredRows.forEach(row => {
      const grp = getRowGroup(row);
      if (!map.has(grp)) map.set(grp, []);
      map.get(grp)!.push(row);
    });
    return Array.from(map.entries()).map(([groupName, groupRows]) => ({
      groupName,
      groupRows
    }));
  }, [filteredRows, getRowGroup]);

  // Statistics calculation with full Priority counts
  const stats = useMemo(() => {
    let total = 0;
    let onProgress = 0;
    let closed = 0;
    let open = 0;
    let canceled = 0;
    let highPriority = 0;
    let urgent = 0;
    let high = 0;
    let medium = 0;
    let normal = 0;
    let low = 0;

    localRows.forEach((r) => {
      const s = (getRowVal(r, 'Status') || '').toUpperCase();
      const p = (getRowVal(r, 'Priority') || '').toUpperCase();
      const vals = Object.values(r).map((v) => (v || '').trim());
      if (vals.some((v) => v !== '' && v !== '-')) {
        total++;
        if (s.includes('PROGRESS') || s.includes('PROSES')) onProgress++;
        else if (s.includes('CLOSE') || s.includes('SELESAI') || s.includes('DONE') || s.includes('RESOLVED')) closed++;
        else if (s.includes('CANCEL') || s.includes('BATAL')) canceled++;
        else if (s.includes('OPEN') || s.includes('BARU')) open++;

        if (p.includes('URGENT') || p.includes('KRITIS') || p.includes('CRITICAL')) {
          urgent++;
          highPriority++;
        } else if (p.includes('HIGH') || p.includes('TINGGI')) {
          high++;
          highPriority++;
        } else if (p.includes('MEDIUM') || p.includes('SEDANG')) {
          medium++;
        } else if (p.includes('LOW') || p.includes('RENDAH')) {
          low++;
        } else {
          normal++;
        }
      }
    });

    return { total, onProgress, closed, open, canceled, highPriority, urgent, high, medium, normal, low };
  }, [localRows, getRowVal]);

  // Dynamic list of available PICs with row counts
  const availablePics = useMemo(() => {
    const counts: Record<string, number> = {};
    localRows.forEach(r => {
      const pic = (getRowVal(r, 'PIC') || getRowVal(r, 'pic') || '').trim();
      const key = pic || '(Tanpa PIC)';
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [localRows, getRowVal]);

  // Multiple Row Selection Helpers for Bulk Actions
  const isAllSelected = useMemo(() => {
    if (filteredRows.length === 0) return false;
    return filteredRows.every((row) => {
      const idx = localRows.indexOf(row);
      return idx !== -1 && selectedRowIndices.has(idx);
    });
  }, [filteredRows, localRows, selectedRowIndices]);

  const isSomeSelected = useMemo(() => {
    if (filteredRows.length === 0) return false;
    return filteredRows.some((row) => {
      const idx = localRows.indexOf(row);
      return idx !== -1 && selectedRowIndices.has(idx);
    }) && !isAllSelected;
  }, [filteredRows, localRows, selectedRowIndices, isAllSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowIndices((prev) => {
        const next = new Set(prev);
        filteredRows.forEach((row) => {
          const idx = localRows.indexOf(row);
          if (idx !== -1) next.delete(idx);
        });
        if (next.size === 0) setIsSelectionModeActive(false);
        return next;
      });
    } else {
      setIsSelectionModeActive(true);
      setSelectedRowIndices((prev) => {
        const next = new Set(prev);
        filteredRows.forEach((row) => {
          const idx = localRows.indexOf(row);
          if (idx !== -1) next.add(idx);
        });
        return next;
      });
    }
  };

  const handleToggleSelectRow = (actualRowIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRowIndices((prev) => {
      const next = new Set(prev);
      if (next.has(actualRowIndex)) {
        next.delete(actualRowIndex);
        if (next.size === 0) setIsSelectionModeActive(false);
      } else {
        next.add(actualRowIndex);
        setIsSelectionModeActive(true);
      }
      return next;
    });
  };

  const handleSelectAllInPage = () => {
    setIsSelectionModeActive(true);
    const next = new Set<number>();
    localRows.forEach((_, i) => next.add(i));
    setSelectedRowIndices(next);
  };

  const handleClearSelection = () => {
    setSelectedRowIndices(new Set());
    setIsSelectionModeActive(false);
  };

  const handleDeleteSelectedRows = async () => {
    if (selectedRowIndices.size === 0) return;
    const count = selectedRowIndices.size;
    const isDeletingAll = count === localRows.length;
    const confirmMessage = isDeletingAll
      ? `Apakah Anda yakin ingin MENGHAPUS SEMUA (${count}) topik/kegiatan di halaman ini? Tabel akan dikosongkan.`
      : `Apakah Anda yakin ingin menghapus ${count} topik/kegiatan yang dipilih?`;

    if (!window.confirm(confirmMessage)) return;

    try {
      const updatedRows = localRows.filter((_, idx) => !selectedRowIndices.has(idx));
      // Re-index number column
      const reindexed = updatedRows.map((r, i) => ({
        ...r,
        number: String(i + 1)
      }));

      setLocalRows(reindexed);
      onRowsChange?.(reindexed);
      if (selectedRow && selectedRowIndices.has(localRows.indexOf(selectedRow))) {
        setSelectedRow(null);
      }
      setSelectedRowIndices(new Set());
      setIsSelectionModeActive(false);

      await saveTableToBackend(reindexed);
      toast.success(isDeletingAll ? 'Semua topik berhasil dibersihkan!' : `${count} topik berhasil dihapus!`);
    } catch (err) {
      console.error(err);
      toast.error('Gagal menghapus topik terpilih');
    }
  };

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else {
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  // Submit comment / progress update
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingComment || isSubmittingCommentRef.current) return;
    const hasFiles = selectedFiles.length > 0 || selectedFile !== null;
    const finalContent = commentText.trim() || (commentFileCaption.trim() ? `📎 ${selectedFile?.name || 'Lampiran'}\n\n${commentFileCaption.trim()}` : (hasFiles ? `📎 Lampiran` : ''));
    if (!finalContent && !hasFiles) return;
    if (!postId || !selectedRow) return;

    const topicTitleVal = selectedTopicTitle || 'Topik';
    const picVal = (getRowVal(selectedRow, 'PIC') || '').trim();
    const activeSection = section || getRowVal(selectedRow, 'Kategori') || 'Prep & Lab';

    try {
      isSubmittingCommentRef.current = true;
      setSubmittingComment(true);
      const allFilesPayload = selectedFiles.length > 0
        ? selectedFiles.map((f, idx) => ({
            url: f.url,
            name: f.name,
            caption: idx === 0 ? commentFileCaption.trim() : (f.caption || ''),
            directUrl: f.url,
            isImage: f.isImage
          }))
        : selectedFile ? [{
            url: selectedFile.url,
            name: selectedFile.name,
            caption: commentFileCaption.trim(),
            directUrl: selectedFile.url,
            isImage: selectedFile.isImage
          }] : null;

      const fileUrlPayload = allFilesPayload ? JSON.stringify(allFilesPayload) : null;

      const res = await fetch(`/api/bulletin/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          content: finalContent,
          topicTitle: topicTitleVal,
          topicId: topicTitleVal.toLowerCase().replace(/\s+/g, '-'),
          section: activeSection,
          category: title || 'Table',
          statusUpdate: statusUpdateChoice || null,
          authorNik: currentAuthorNik || 'System',
          authorName: currentAuthorName || 'Personil',
          picNik: picVal || null,
          pt: pt || 'TBP',
          fileUrl: fileUrlPayload,
          fileName: selectedFiles[0]?.name || selectedFile?.name || null,
          replyToId: replyingTo?.id || null,
          replyToNik: replyingTo?.authorNik || null,
          replyToName: replyingTo?.authorName || null,
          replyToContent: replyingTo?.content ? replyingTo.content.substring(0, 150) : null,
        })
      });

      const json = await res.json();
      if (json.status === 'success') {
        if (replyingTo) {
          toast.success(`Tanggapan terkirim! Notifikasi otomatis masuk ke ${replyingTo.authorName}.`);
        } else {
          toast.success(`Update terkirim! Notifikasi diteruskan ke personil ${activeSection}.`);
        }
        setCommentText('');
        setStatusUpdateChoice('');
        setSelectedFile(null);
        setSelectedFiles([]);
        setCommentFileCaption('');
        setReplyingTo(null);
        
        // Update local row status if changed
        if (statusUpdateChoice) {
          const rowIndex = localRows.findIndex(r => r === selectedRow);
          if (rowIndex !== -1) {
            const updated = [...localRows];
            updated[rowIndex] = { ...updated[rowIndex], Status: statusUpdateChoice };
            setLocalRows(updated);
            setSelectedRow(updated[rowIndex]);
            await saveTableToBackend(updated);
          }
        }
        await fetchComments();
      } else {
        toast.error('Gagal mengirim update: ' + (json.message || 'Error'));
      }
    } catch (err) {
      toast.error('Gagal menghubungi server untuk mengirim update.');
    } finally {
      isSubmittingCommentRef.current = false;
      setSubmittingComment(false);
    }
  };

  // Upload file inside discussion comment box with caption
  const handleCommentFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files ? Array.from(e.target.files) : [];
    if (rawFiles.length === 0) return;

    setIsUploadingCommentFile(true);
    toast.loading(`Mengompres dan mengunggah ${rawFiles.length} lampiran...`, { id: 'upload-comment-file' });

    try {
      const uploadedItems: Array<{ name: string; url: string; previewUrl?: string; isImage?: boolean }> = [];

      for (const file of rawFiles) {
        const reader = new FileReader();
        const base64Raw = await new Promise<string>((resolve, reject) => {
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        let finalBase64 = base64Raw;
        const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name);

        if (isImg) {
          const img = new Image();
          await new Promise((resolve) => {
            img.onload = resolve;
            img.src = base64Raw;
          });

          const canvas = document.createElement('canvas');
          const maxW = 1600;
          const maxH = 1200;
          let w = img.width;
          let h = img.height;

          if (w > maxW || h > maxH) {
            if (w > h) {
              h = Math.round((h * maxW) / w);
              w = maxW;
            } else {
              w = Math.round((w * maxH) / h);
              h = maxH;
            }
          }

          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            finalBase64 = canvas.toDataURL('image/jpeg', 0.85);
          }
        }

        let uploadedUrl = finalBase64;
        try {
          const upRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              base64Data: finalBase64,
              mimeType: file.type || 'image/jpeg',
              filename: file.name,
              folderName: 'Bulletin Attachments'
            })
          });
          const upJson = await upRes.json();
          if (upJson.url) {
            uploadedUrl = upJson.url;
          }
        } catch (uErr) {}

        uploadedItems.push({
          name: file.name,
          url: uploadedUrl,
          previewUrl: isImg ? finalBase64 : undefined,
          isImage: isImg
        });
      }

      setSelectedFiles(prev => [...prev, ...uploadedItems]);
      if (uploadedItems.length > 0) {
        setSelectedFile(uploadedItems[0]);
      }
      toast.success(`${uploadedItems.length} lampiran berhasil diunggah!`, { id: 'upload-comment-file' });
    } catch (err) {
      toast.error('Gagal mengunggah file', { id: 'upload-comment-file' });
    } finally {
      setIsUploadingCommentFile(false);
      if (e.target) e.target.value = '';
    }
  };

  // Edit comment
  const handleSaveEditComment = async (commentId: number) => {
    if (!editingCommentContent.trim()) {
      toast.error('Konten komentar tidak boleh kosong');
      return;
    }
    try {
      const res = await fetch(`/api/bulletin/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorNik: currentAuthorNik,
          content: editingCommentContent.trim()
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Komentar berhasil diperbarui');
        setEditingCommentId(null);
        setEditingCommentContent('');
        await fetchComments();
      } else {
        toast.error(data.message || 'Gagal memperbarui komentar');
      }
    } catch (e) {
      toast.error('Gagal memperbarui komentar');
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: number) => {
    if (!confirm('Hapus update/komentar ini?')) return;
    try {
      const res = await fetch(`/api/bulletin/comments/${commentId}?deleterNik=${encodeURIComponent(currentAuthorNik || '')}&deleterName=${encodeURIComponent(currentAuthorName || '')}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Update/komentar dihapus');
        await fetchComments();
      }
    } catch (e) {
      toast.error('Gagal menghapus komentar');
    }
  };

  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  // Gallery file select: opens Caption modal before submitting
  const handleGalleryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !postId || !selectedRow) return;

    const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name);
    let previewUrl = '';
    if (isImg) {
      previewUrl = URL.createObjectURL(file);
    }

    setPendingUploadFile({
      file,
      previewUrl,
      caption: '',
      isImage: isImg
    });

    if (e.target) e.target.value = '';
  };

  // Execute upload after user enters caption in Gallery modal
  const handleExecuteGalleryUpload = async () => {
    if (isUploadingGallery || isUploadingGalleryRef.current) return;
    if (!pendingUploadFile || !postId || !selectedRow) return;

    isUploadingGalleryRef.current = true;
    setIsUploadingGallery(true);
    toast.loading('Mengompres dan mengunggah lampiran foto...', { id: 'upload-gallery' });

    try {
      const { file, caption, isImage: isImg, previewUrl } = pendingUploadFile;

      const base64Raw = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      let finalBase64 = base64Raw;

      // If image, compress with canvas
      if (isImg) {
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = base64Raw;
        });

        const canvas = document.createElement('canvas');
        const maxW = 1600;
        const maxH = 1200;
        let w = img.width;
        let h = img.height;

        if (w > maxW || h > maxH) {
          if (w > h) {
            h = Math.round((h * maxW) / w);
            w = maxW;
          } else {
            w = Math.round((w * maxH) / h);
            h = maxH;
          }
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          finalBase64 = canvas.toDataURL('image/jpeg', 0.85);
        }
      }

      // Upload to /api/upload or Google Drive
      let uploadedUrl = finalBase64;
      try {
        const upRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data: finalBase64,
            mimeType: file.type || 'image/jpeg',
            filename: file.name,
            folderName: 'Bulletin Attachments'
          })
        });
        const upJson = await upRes.json();
        if (upJson.url) {
          uploadedUrl = upJson.url;
        }
      } catch (uErr) {
        // Fallback to compressed base64
      }

      // Post as an attachment comment with caption for this topic
      const topicTitleVal = selectedTopicTitle || 'Topik';
      const activeSection = section || getRowVal(selectedRow, 'Kategori') || 'Prep & Lab';

      const cRes = await fetch(`/api/bulletin/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          content: caption.trim() ? `📎 ${file.name}\n\n${caption.trim()}` : `📎 Lampiran Foto / Dokumen: ${file.name}`,
          fileUrl: JSON.stringify([{
            url: uploadedUrl,
            name: file.name,
            caption: caption.trim(),
            directUrl: uploadedUrl,
            isImage: isImg
          }]),
          fileName: file.name,
          topicTitle: topicTitleVal,
          topicId: topicTitleVal.toLowerCase().replace(/\s+/g, '-'),
          section: activeSection,
          category: getRowVal(selectedRow, 'Kategori') || 'Laboratorium',
          authorName: currentAuthorName || 'Personil',
          authorNik: currentAuthorNik || 'NOT_SET'
        })
      });

      toast.dismiss('upload-gallery');
      if (cRes.ok) {
        toast.success('Foto dengan caption berhasil ditambahkan ke galeri!');
        if (previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
        }
        setPendingUploadFile(null);
        await fetchComments();
      } else {
        toast.error('Gagal menambahkan lampiran ke topik.');
      }
    } catch (err) {
      toast.dismiss('upload-gallery');
      toast.error('Gagal mengunggah foto / file');
    } finally {
      isUploadingGalleryRef.current = false;
      setIsUploadingGallery(false);
    }
  };

  // Handler untuk menghapus lampiran dari topik (menjaga teks komentar jika ada)
  const handleDeleteAttachment = async (commentId: number, attachmentUrl: string, attachmentName: string) => {
    if (!confirm(`Hapus lampiran "${attachmentName}" dari topik ini?\n\nCatatan: Teks komentar Anda (jika ada) akan tetap tersimpan.`)) return;

    try {
      const res = await fetch(`/api/bulletin/comments/${commentId}/attachment?attachmentUrl=${encodeURIComponent(attachmentUrl)}&deleterNik=${encodeURIComponent(currentAuthorNik || '')}&deleterName=${encodeURIComponent(currentAuthorName || '')}`, {
        method: 'DELETE'
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success(
          json.action === 'attachment_detached_text_kept'
            ? 'Lampiran berhasil dihapus. Teks komentar Anda tetap disimpan.'
            : 'Lampiran berhasil dihapus dari galeri.'
        );
        await fetchComments();
      } else {
        toast.error('Gagal menghapus lampiran: ' + (json.message || 'Error'));
      }
    } catch (e) {
      toast.error('Gagal menghapus lampiran');
    }
  };

  // Helper for Status Badge styling
  const renderStatusBadge = (statusStr: string) => {
    const s = (statusStr || '').toUpperCase().trim();
    if (!s || s === '-') return <span className="text-slate-500 font-mono text-xs">-</span>;

    if (s.includes('PROGRESS') || s.includes('PROSES')) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase select-none shadow-2xs"
          style={{ backgroundColor: '#FDECC8', color: '#8F6B12' }}
        >
          <RotateCcw className="w-2.5 h-2.5 shrink-0" style={{ color: '#8F6B12' }} />
          ON PROGRESS
        </span>
      );
    }
    if (s.includes('CLOSE') || s.includes('SELESAI') || s.includes('RESOLVED')) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase select-none shadow-2xs"
          style={{ backgroundColor: '#D3E5EF', color: '#235A80' }}
        >
          <CheckCircle2 className="w-2.5 h-2.5 shrink-0" style={{ color: '#235A80' }} />
          CLOSE
        </span>
      );
    }
    if (s.includes('DONE')) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase select-none shadow-2xs"
          style={{ backgroundColor: '#DBEDDB', color: '#286641' }}
        >
          <Check className="w-2.5 h-2.5 shrink-0" style={{ color: '#286641' }} />
          DONE
        </span>
      );
    }
    if (s.includes('CANCEL') || s.includes('BATAL')) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase select-none shadow-2xs"
          style={{ backgroundColor: '#FFE2DD', color: '#9B3E37' }}
        >
          <AlertCircle className="w-2.5 h-2.5 shrink-0" style={{ color: '#9B3E37' }} />
          CANCELED
        </span>
      );
    }
    if (s.includes('OPEN') || s.includes('BARU')) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase select-none shadow-2xs"
          style={{ backgroundColor: '#E3E2E0', color: '#5A5A58' }}
        >
          <Clock className="w-2.5 h-2.5 shrink-0" style={{ color: '#5A5A58' }} />
          OPEN
        </span>
      );
    }
    if (s.includes('PENDING') || s.includes('HOLD') || s.includes('DELAY')) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase select-none shadow-2xs"
          style={{ backgroundColor: '#E8DEEE', color: '#6940A5' }}
        >
          <AlertCircle className="w-2.5 h-2.5 shrink-0" style={{ color: '#6940A5' }} />
          PENDING
        </span>
      );
    }
    return (
      <span 
        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase select-none shadow-2xs"
        style={{
          backgroundColor: '#E3E2E0',
          color: '#5A5A58'
        }}
      >
        {s}
      </span>
    );
  };

  // Helper to calculate duration for closed/completed tasks in Notion Table
  const getRowDurationInfo = (row: TableRowData, taskProgress?: TasklistProgress) => {
    const createdStr = getRowVal(row, 'Created Time') || getRowVal(row, 'Tanggal Dibuat') || getRowVal(row, 'Waktu Dibuat') || getRowVal(row, 'Created') || getRowVal(row, 'Tanggal') || '';
    let completedStr = getRowVal(row, 'Tanggal Selesai') || getRowVal(row, 'Completed Time') || getRowVal(row, 'Aktual Selesai') || getRowVal(row, 'Waktu Selesai') || getRowVal(row, 'Selesai') || getRowVal(row, 'Completed') || '';

    // If completedStr not in column, check if tasklist items have checkedDate
    if ((!completedStr || completedStr === '-') && taskProgress?.items && taskProgress.items.length > 0) {
      const dates = taskProgress.items.map(i => i.checkedDate).filter((d): d is string => Boolean(d)).sort();
      if (dates.length > 0) {
        completedStr = dates[dates.length - 1];
      }
    }

    const parseDateVal = (s: string): Date | null => {
      if (!s || s === '-') return null;
      const clean = s.trim();
      const d = new Date(clean);
      if (!isNaN(d.getTime())) return d;
      // Handle DD/MM/YYYY or DD-MM-YYYY
      const m = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
      if (m) {
        return new Date(parseInt(m[3], 10), parseInt(m[2], 10) - 1, parseInt(m[1], 10));
      }
      return null;
    };

    const dStart = parseDateVal(createdStr);
    const dEnd = parseDateVal(completedStr) || new Date();

    if (dStart && dEnd) {
      const diffMs = dEnd.getTime() - dStart.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        if (diffHours >= 1) {
          return {
            label: `${diffHours} Jam`,
            short: `${diffHours} Jam`,
            detail: `Mulai: ${createdStr} • Selesai: ${completedStr || 'Hari ini'}`
          };
        }
        return {
          label: '1 Hari',
          short: '1 Hari',
          detail: `Mulai: ${createdStr} • Selesai: ${completedStr || 'Hari ini'}`
        };
      }

      const totalDays = diffDays + 1;
      return {
        label: `${totalDays} Hari`,
        short: `${totalDays} Hari`,
        detail: `Mulai: ${createdStr} • Selesai: ${completedStr || 'Hari ini'}`
      };
    }

    if (completedStr) {
      return {
        label: completedStr,
        short: completedStr,
        detail: `Waktu selesai: ${completedStr}`
      };
    }

    return {
      label: 'Selesai',
      short: 'Selesai',
      detail: 'Tugas telah selesai'
    };
  };

  // Helper for Priority Badge
  const renderPriorityBadge = (pStr: string) => {
    const p = (pStr || '').toUpperCase().trim();
    if (!p || p === '-') return <span className="font-mono text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>-</span>;

    if (p.includes('URGENT') || p.includes('KRITIS') || p.includes('CRITICAL')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-600/70 shadow-xs animate-pulse">
          <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
          URGENT
        </span>
      );
    }
    if (p.includes('HIGH') || p.includes('TINGGI')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-700/60 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          HIGH
        </span>
      );
    }
    if (p.includes('MEDIUM') || p.includes('SEDANG')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-950/70 text-blue-300 border border-blue-600/50 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          MEDIUM
        </span>
      );
    }
    if (p.includes('NORMAL') || p.includes('BIASA')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-950/60 text-teal-300 border border-teal-700/50 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
          NORMAL
        </span>
      );
    }
    if (p.includes('LOW') || p.includes('RENDAH')) {
      return (
        <span 
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border"
          style={{
            backgroundColor: 'var(--input-bg, #1e293b)',
            borderColor: 'var(--border-main, #334155)',
            color: 'var(--text-muted, #94a3b8)'
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          LOW
        </span>
      );
    }
    return <span className="text-xs" style={{ color: 'var(--text-main, #cbd5e1)' }}>{pStr}</span>;
  };

  // Helper for Notion Canonical Column Icons
  const getNotionColumnIcon = (colHeader: string) => {
    const colLower = colHeader.toLowerCase();
    if (colLower === 'number' || colLower === 'no' || colLower === '#') return <span className="font-mono text-slate-400 font-bold mr-1">#</span>;
    if (colLower.includes('jenis kegiatan') || colLower === 'task' || colLower === 'judul') return <span className="text-slate-400 mr-1 text-xs">≡</span>;
    if (colLower.includes('keterangan') || colLower.includes('catatan') || colLower.includes('deskripsi')) return <span className="text-slate-400 mr-1 text-xs">≡</span>;
    if (colLower.includes('created') || colLower.includes('tanggal dibuat') || colLower.includes('waktu dibuat')) return <span className="text-slate-400 mr-1 text-xs">📅</span>;
    if (colLower.includes('completed') || colLower.includes('aktual selesai') || colLower === 'selesai' || colLower.includes('waktu selesai')) return <span className="text-emerald-500 mr-1 text-xs">✓</span>;
    if (colLower.includes('status')) return <span className="text-slate-400 mr-1 text-xs">⭕</span>;
    if (colLower.includes('pic') || colLower.includes('assignee')) return <span className="text-slate-400 mr-1 text-xs">≡</span>;
    if (colLower.includes('priority') || colLower.includes('prioritas')) return <span className="text-slate-400 mr-1 text-xs">↓</span>;
    if (colLower.includes('activity') || colLower.includes('aktivitas')) return <span className="text-slate-400 mr-1 text-xs">≡</span>;
    return <span className="text-slate-400 mr-1 text-xs">≡</span>;
  };

  // Helper for PIC Avatar Badge (Hanya menampilkan avatar lingkaran di dalam cell, nama muncul saat hover)
  const renderPicBadge = (picStr: string, size: 'xs' | 'sm' | 'md' = 'sm', showNameText: boolean = false) => {
    if (!picStr || picStr === '-') return <span className="font-mono text-xs text-slate-400">-</span>;
    const names = smartSplitPicString(picStr);
    const displayName = names.length > 0 
      ? names.map(n => n.split(',')[0].trim().split(' ')[0]).join(', ')
      : picStr;

    return (
      <div className="flex items-center gap-1.5 min-w-0" title={picStr}>
        <PicAvatarGroup
          pics={picStr}
          employeesList={employeesList}
          size={size}
        />
        {showNameText && (
          <span 
            className={`truncate font-medium max-w-[130px] ${
              isNotionLight ? 'text-slate-800' : 'text-slate-200'
            } ${fitPageMode ? 'text-[11.5px]' : 'text-xs'}`}
            title={picStr}
          >
            {displayName}
          </span>
        )}
      </div>
    );
  };

  // Helper to format multiline notes with text color support, bold, italic, code, and bullet formatting
  // Default font size, font family, and color match Created Time column (#475569, font-sans, font-normal, 13px / 12px)
  // When collapsed (!isExpanded), clamped strictly with ellipsis (...) right at cell boundary
  // When expanded, preserves bullet points and lines separated by enter as distinct points
  const renderFormattedNotes = (text: string, isExpanded: boolean = true) => {
    if (!text || text === '-' || text === '•') return <span className="font-sans text-xs text-slate-400">-</span>;
    // Normalize <br/>, <br>, <br /> to newlines
    const normalized = text.replace(/<br\s*\/?>/gi, '\n');
    const cleanText = normalized.trim();

    if (!isExpanded) {
      // Build clean single-line preview for collapsed rows:
      // strips HTML comments, status tags, checklists, and joins bullets/lines with ' • '
      const singleLine = cleanText
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\*\*\(Done\)\*\*|\[Done\]|\(Done\)/gi, '')
        .replace(/\*\*\(OPEN\)\*\*|\[OPEN\]|\(OPEN\)/gi, '')
        .replace(/^[-*•]?\s*\[[ xX]\]\s*/gm, '')
        .replace(/\[\/?(?:red|blue|green|orange|yellow|purple|pink|gray|brown|default)\]/gi, '')
        .replace(/\*\*|__/g, '')
        .replace(/[*_~`]/g, '')
        .split('\n')
        .map(line => line.trim().replace(/^[•\-\*]\s*/, ''))
        .filter(Boolean)
        .join(' • ');

      return (
        <div 
          className={`w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap block ${fitPageMode ? 'text-xs' : 'text-[13px]'} ${isNotionLight ? 'text-[#475569]' : 'text-slate-300'}`}
          style={{ 
            fontSize: fitPageMode ? '12px' : '13px',
            fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
            color: isNotionLight ? '#475569' : 'var(--text-muted, #94a3b8)',
            lineHeight: '1.5',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
            maxWidth: '100%'
          }}
          title={cleanText}
        >
          {singleLine || cleanText}
        </div>
      );
    }

    return (
      <div 
        className={`leading-relaxed font-sans font-normal space-y-1 block w-full ${fitPageMode ? 'text-xs' : 'text-[13px]'} ${isNotionLight ? 'text-[#475569]' : 'text-slate-300'}`}
        style={{ 
          fontSize: fitPageMode ? '12px' : '13px',
          fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          color: isNotionLight ? '#475569' : 'var(--text-muted, #94a3b8)',
          lineHeight: '1.6'
        }}
        dangerouslySetInnerHTML={{ __html: markdownToVisualHtml(cleanText) }}
      />
    );
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    const csvHeaders = displayHeaders.join(',');
    const csvRows = filteredRows.map((row) => {
      return displayHeaders
        .map((h) => {
          const val = (getRowVal(row, h) || '').replace(/"/g, '""');
          return `"${val}"`;
        })
        .join(',');
    });
    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'Notion_Table'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Tabel berhasil diekspor ke CSV!');
  };

  return (
    <div 
      className={`w-full my-0 mb-0 border-b transition-all font-sans antialiased ${
        isNotionLight 
          ? 'bg-white border-[#e9e9e8] text-[#37352f]' 
          : 'bg-[#181818] border-[#2d2d2d] text-slate-200'
      }`}
      style={{
        fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif'
      }}
    >
      {/* ========================================================================= */}
      {/* NOTION MINIMALIST DATABASE HEADER (Icon-First with Smart Hover Tooltips)  */}
      {/* ========================================================================= */}
      <div 
        className={`sticky top-0 md:top-12 z-30 transition-all border-b shadow-xs backdrop-blur-md ${
          isNotionLight ? 'bg-white/95 border-[#e9e9e8]' : 'bg-[#191919]/95 border-[#2d2d2d]'
        }`}
      >
        {/* Main Clean Row: Left (Title & View Tabs) | Right (Essential Icon Tools, Full Tools Logo, + New) */}
        <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2.5">
          {/* Left Anchor: Database Title & View Tabs */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-base select-none">📋</span>
              <h3 className={`font-semibold text-sm flex items-center gap-1.5 ${isNotionLight ? 'text-[#37352f]' : 'text-slate-100'}`}>
                <span>{title || 'Database Table'}</span>
                <span 
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono border font-semibold ${
                    isNotionLight ? 'bg-slate-100 border-slate-200 text-slate-600' : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  {filteredRows.length}
                </span>
              </h3>
            </div>

            {/* Notion View Switcher Tabs */}
            <div className={`flex items-center p-0.5 rounded-lg border transition-colors ${
              isNotionLight ? 'bg-[#f7f7f5] border-[#e9e9e8]' : 'bg-[#151515] border-[#2d2d2d]'
            }`}>
              <NotionTooltip content="Tampilan Tabel" position="bottom">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? isNotionLight
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'bg-[#262626] text-teal-400 shadow-2xs font-semibold'
                      : isNotionLight
                      ? 'text-slate-500 hover:text-slate-800'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
              </NotionTooltip>

              <NotionTooltip content="Tampilan Kanban Board" position="bottom">
                <button
                  type="button"
                  onClick={() => setViewMode('board')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    viewMode === 'board'
                      ? isNotionLight
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'bg-[#262626] text-teal-400 shadow-2xs font-semibold'
                      : isNotionLight
                      ? 'text-slate-500 hover:text-slate-800'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Board</span>
                </button>
              </NotionTooltip>

              <NotionTooltip content="Tampilan Kartu" position="bottom">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? isNotionLight
                        ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                        : 'bg-[#262626] text-teal-400 shadow-2xs font-semibold'
                      : isNotionLight
                      ? 'text-slate-500 hover:text-slate-800'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </NotionTooltip>
            </div>
          </div>

          {/* Right Anchor: Essential Tools Icons + Dedicated Full Tools Logo + + New Button */}
          <div className="flex items-center gap-1 relative">
            {/* 1. SEARCH TOOL (Expandable inline input or icon button) */}
            <div className="relative notion-search-container">
              {isSearchInputOpen || searchQuery ? (
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs transition-all w-48 sm:w-60 shadow-2xs ${
                  isNotionLight ? 'bg-white border-teal-500/60 ring-1 ring-teal-500/20' : 'bg-[#202020] border-teal-500/60 ring-1 ring-teal-500/20'
                }`}>
                  <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Cari kegiatan, PIC..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs w-full text-slate-800 dark:text-slate-200 placeholder-slate-400"
                  />
                  {searchQuery ? (
                    <button 
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setIsSearchInputOpen(false);
                      }} 
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={() => setIsSearchInputOpen(false)} 
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : (
                <NotionTooltip content="Cari Data Kegiatan (Search)" position="bottom">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsSearchInputOpen(true);
                      setTimeout(() => {
                        const inputEl = document.querySelector('.notion-search-container input') as HTMLInputElement;
                        if (inputEl) inputEl.focus();
                      }, 50);
                    }}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      isNotionLight 
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-[#efefed]' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </NotionTooltip>
              )}
            </div>

            {/* 2. FILTER TOOL (Popover with active indicator dot) */}
            <div className="relative notion-filter-popover-container">
              <NotionTooltip content="Filter Status, Prioritas & PIC" position="bottom">
                <button
                  type="button"
                  onClick={() => {
                    setIsFilterPopoverOpen(!isFilterPopoverOpen);
                    setIsSortPopoverOpen(false);
                    setIsFullToolsPopoverOpen(false);
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${
                    (selectedStatuses.length > 0 && !selectedStatuses.includes('ALL')) || selectedPriorities.length > 0 || selectedPics.length > 0
                      ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50'
                      : isNotionLight
                      ? 'text-[#37352f] hover:bg-[#efefed]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  {((selectedStatuses.length > 0 && !selectedStatuses.includes('ALL')) || selectedPriorities.length > 0 || selectedPics.length > 0) && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  )}
                </button>
              </NotionTooltip>

              {/* Filter Popover Content */}
              {isFilterPopoverOpen && (
                <div 
                  className={`absolute right-0 top-full mt-1.5 w-80 sm:w-96 max-h-[82vh] overflow-y-auto rounded-2xl shadow-2xl border p-3.5 z-50 transition-all text-left space-y-3 ${
                    isNotionLight ? 'bg-white border-[#e9e9e7] text-[#37352f]' : 'bg-[#202020] border-[#333333] text-slate-100'
                  }`}
                  style={{
                    fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-[#37352f] dark:text-slate-100">
                      <Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      Filter Kegiatan (Multi-Select)
                    </span>
                    {((selectedStatuses.length > 0 && !selectedStatuses.includes('ALL')) || selectedPriorities.length > 0 || selectedPics.length > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStatuses(['ALL']);
                          setSelectedPriorities([]);
                          setSelectedPics([]);
                          setPicSearchQuery('');
                        }}
                        className="text-[10px] text-rose-500 hover:underline font-semibold cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>

                  {/* 1. Status Options (Multi-select) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Status Kegiatan</label>
                      <span className="text-[10px] text-slate-400">Pilih 1 atau lebih</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { key: 'ALL', label: 'Semua', count: stats.total },
                        { key: 'ACTIVE', label: 'Aktif', count: stats.total - stats.closed - stats.canceled },
                        { key: 'ON PROGRESS', label: 'On Progress', count: stats.onProgress },
                        { key: 'OPEN', label: 'Open', count: stats.open },
                        { key: 'CLOSE', label: 'Selesai', count: stats.closed },
                        { key: 'CANCELED', label: 'Batal', count: stats.canceled },
                      ].map((st) => {
                        const isSelected = st.key === 'ALL'
                          ? (selectedStatuses.length === 0 || selectedStatuses.includes('ALL'))
                          : selectedStatuses.includes(st.key);
                        return (
                          <button
                            key={st.key}
                            type="button"
                            onClick={() => {
                              if (st.key === 'ALL') {
                                setSelectedStatuses(['ALL']);
                                return;
                              }
                              if (st.key === 'ACTIVE') {
                                if (selectedStatuses.includes('ACTIVE')) {
                                  setSelectedStatuses(['ALL']);
                                } else {
                                  setSelectedStatuses(['ACTIVE']);
                                }
                                return;
                              }
                              const cleaned = selectedStatuses.filter(s => s !== 'ALL' && s !== 'ACTIVE');
                              if (cleaned.includes(st.key)) {
                                const next = cleaned.filter(s => s !== st.key);
                                setSelectedStatuses(next.length === 0 ? ['ALL'] : next);
                              } else {
                                setSelectedStatuses([...cleaned, st.key]);
                              }
                            }}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer border ${
                              isSelected
                                ? 'bg-[#37352f] text-white border-[#37352f] dark:bg-teal-600 dark:border-teal-500 shadow-2xs'
                                : isNotionLight
                                ? 'bg-[#f7f7f5] hover:bg-[#efefed] text-[#37352f] border-[#e9e9e7]'
                                : 'bg-[#282828] hover:bg-[#333333] text-slate-300 border-slate-700'
                            }`}
                          >
                            <span>{st.label}</span>
                            <span className="text-[10px] opacity-75 font-mono">({st.count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Priority Options (Multi-select) */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">Tingkat Prioritas</label>
                      <span className="text-[10px] text-slate-400">Pilih 1 atau lebih</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {[
                        { key: 'ALL', label: 'Semua Prioritas', count: stats.total },
                        { key: 'URGENT', label: '🚨 Urgent', count: stats.urgent || 0 },
                        { key: 'HIGH', label: '🔴 High', count: stats.high || 0 },
                        { key: 'MEDIUM', label: '🔵 Medium', count: stats.medium || 0 },
                        { key: 'NORMAL', label: '🟢 Normal', count: stats.normal || 0 },
                        { key: 'LOW', label: '⚪ Low', count: stats.low || 0 },
                      ].map((p) => {
                        const isSelected = p.key === 'ALL'
                          ? selectedPriorities.length === 0
                          : selectedPriorities.includes(p.key);
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => {
                              if (p.key === 'ALL') {
                                setSelectedPriorities([]);
                                return;
                              }
                              const cleaned = selectedPriorities.filter(x => x !== 'ALL');
                              if (cleaned.includes(p.key)) {
                                setSelectedPriorities(cleaned.filter(x => x !== p.key));
                              } else {
                                setSelectedPriorities([...cleaned, p.key]);
                              }
                            }}
                            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer border ${
                              isSelected
                                ? 'bg-[#37352f] text-white border-[#37352f] dark:bg-teal-600 dark:border-teal-500 shadow-2xs'
                                : isNotionLight
                                ? 'bg-[#f7f7f5] hover:bg-[#efefed] text-[#37352f] border-[#e9e9e7]'
                                : 'bg-[#282828] hover:bg-[#333333] text-slate-300 border-slate-700'
                            }`}
                          >
                            <span>{p.label}</span>
                            <span className="text-[10px] opacity-75 font-mono">({p.count})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. PIC Filter (Multi-select with Search) */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                        Pemilihan PIC (Assignee)
                      </label>
                      {selectedPics.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedPics([])}
                          className="text-[10px] text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer"
                        >
                          Semua PIC
                        </button>
                      )}
                    </div>

                    <div className="relative mb-1">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Cari nama PIC..."
                        value={picSearchQuery}
                        onChange={(e) => setPicSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-2.5 py-1 rounded-lg border text-[11px] outline-none focus:border-teal-500 font-sans"
                        style={{
                          backgroundColor: isNotionLight ? '#fbfbfa' : '#1a1a1a',
                          borderColor: isNotionLight ? '#e9e9e7' : '#333333',
                          color: isNotionLight ? '#37352f' : '#f1f5f9'
                        }}
                      />
                    </div>

                    <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1">
                      <button
                        type="button"
                        onClick={() => setSelectedPics([])}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all border cursor-pointer ${
                          selectedPics.length === 0
                            ? 'bg-[#37352f] text-white border-[#37352f] dark:bg-teal-600 dark:border-teal-500 shadow-2xs'
                            : isNotionLight
                            ? 'bg-[#f7f7f5] hover:bg-[#efefed] text-[#37352f] border-[#e9e9e7]'
                            : 'bg-[#282828] hover:bg-[#333333] text-slate-300 border-slate-700'
                        }`}
                      >
                        Semua PIC
                      </button>
                      {availablePics
                        .filter((p) => !picSearchQuery.trim() || p.name.toLowerCase().includes(picSearchQuery.toLowerCase()))
                        .map((p) => {
                          const isSelected = selectedPics.includes(p.name);
                          return (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedPics(selectedPics.filter(x => x !== p.name));
                                } else {
                                  setSelectedPics([...selectedPics, p.name]);
                                }
                              }}
                              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#37352f] text-white border-[#37352f] dark:bg-teal-600 dark:border-teal-500 shadow-2xs'
                                  : isNotionLight
                                  ? 'bg-[#f7f7f5] hover:bg-[#efefed] text-[#37352f] border-[#e9e9e7]'
                                  : 'bg-[#282828] hover:bg-[#333333] text-slate-300 border-slate-700'
                              }`}
                            >
                              <User className="w-2.5 h-2.5 opacity-60" />
                              <span className="truncate max-w-[130px]">{p.name}</span>
                              <span className="text-[10px] opacity-75 font-mono">({p.count})</span>
                            </button>
                          );
                        })}
                      {availablePics.filter((p) => !picSearchQuery.trim() || p.name.toLowerCase().includes(picSearchQuery.toLowerCase())).length === 0 && (
                        <span className="text-[11px] text-slate-400 py-1 italic">Tidak ada PIC yang cocok</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. SORT TOOL (Popover with active indicator) */}
            <div className="relative notion-sort-popover-container">
              <NotionTooltip content="Urutkan Kolom (Sort)" position="bottom">
                <button
                  type="button"
                  onClick={() => {
                    setIsSortPopoverOpen(!isSortPopoverOpen);
                    setIsFilterPopoverOpen(false);
                    setIsFullToolsPopoverOpen(false);
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${
                    sortColumn
                      ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50'
                      : isNotionLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-[#efefed]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <ArrowUpDown className="w-4 h-4" />
                  {sortColumn && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-teal-500" />
                  )}
                </button>
              </NotionTooltip>

              {/* Sort Popover Content */}
              {isSortPopoverOpen && (
                <div 
                  className={`absolute right-0 top-full mt-1.5 w-64 rounded-xl shadow-2xl border p-3 z-50 transition-all text-left ${
                    isNotionLight ? 'bg-white border-[#e9e9e8] text-slate-800' : 'bg-[#202020] border-[#333333] text-slate-100'
                  }`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5 text-teal-500" />
                      Urutkan Data
                    </span>
                    {sortColumn && (
                      <button
                        type="button"
                        onClick={() => {
                          setSortColumn(null);
                          setSortDirection('asc');
                        }}
                        className="text-[10px] text-rose-500 hover:underline font-semibold cursor-pointer"
                      >
                        Reset Sort
                      </button>
                    )}
                  </div>

                  <div className="space-y-1 mb-2.5">
                    <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pilih Kolom</label>
                    {[
                      { key: 'Tanggal Selesai', label: '📅 Tanggal Selesai' },
                      { key: 'Status', label: '⭕ Status' },
                      { key: 'Priority', label: '⚡ Prioritas' },
                      { key: 'Jenis kegiatan', label: '📝 Jenis Kegiatan' },
                      { key: 'Number', label: '# Nomor Baris' },
                    ].map((col) => {
                      const isSelected = sortColumn === col.key;
                      return (
                        <button
                          key={col.key}
                          type="button"
                          onClick={() => {
                            if (sortColumn === col.key) {
                              setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortColumn(col.key);
                              setSortDirection('asc');
                            }
                          }}
                          className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-left flex items-center justify-between transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-bold'
                              : isNotionLight
                              ? 'hover:bg-slate-100 text-slate-700'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <span>{col.label}</span>
                          {isSelected && (
                            <span className="text-[11px] font-mono">
                              {sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {sortColumn && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSortDirection('asc')}
                        className={`flex-1 py-1 rounded text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                          sortDirection === 'asc'
                            ? 'bg-slate-900 text-white dark:bg-teal-600'
                            : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        ↑ Naik (A-Z)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortDirection('desc')}
                        className={`flex-1 py-1 rounded text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                          sortDirection === 'desc'
                            ? 'bg-slate-900 text-white dark:bg-teal-600'
                            : 'text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        ↓ Turun (Z-A)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. FIT SCREEN TOGGLE (Icon Only) */}
            <NotionTooltip content={fitPageMode ? "Matikan Fit Screen (Mode Scroll Lebar)" : "Fit Screen (Semua Kolom Muat 1 Layar)"} position="bottom">
              <button
                type="button"
                onClick={() => setFitPageMode(!fitPageMode)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  fitPageMode
                    ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50'
                    : isNotionLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-[#efefed]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {fitPageMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </NotionTooltip>

            {/* 5. EDIT TABLE TOGGLE (Icon Only) */}
            <NotionTooltip content={isTableEditMode ? "Selesai Edit Tabel (Kunci Kolom)" : "Mode Edit Tabel (Atur Posisi & Hapus Kolom)"} position="bottom">
              <button
                type="button"
                onClick={() => setIsTableEditMode(!isTableEditMode)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer relative ${
                  isTableEditMode
                    ? 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 ring-1 ring-amber-500/50'
                    : isNotionLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-[#efefed]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <TableProperties className="w-4 h-4" />
                {isTableEditMode && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </button>
            </NotionTooltip>

            {/* 6. THE 1 DEDICATED LOGO FOR FULL TOOLS (SlidersHorizontal) */}
            <div className="relative notion-fulltools-popover-container">
              <NotionTooltip content="Semua Tools & Pengaturan (Full Tools)" position="bottom">
                <button
                  type="button"
                  onClick={() => {
                    setIsFullToolsPopoverOpen(!isFullToolsPopoverOpen);
                    setIsFilterPopoverOpen(false);
                    setIsSortPopoverOpen(false);
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isFullToolsPopoverOpen
                      ? 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50'
                      : isNotionLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-[#efefed]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </NotionTooltip>

              {/* Full Tools Menu Popover */}
              {isFullToolsPopoverOpen && (
                <div 
                  className="absolute right-0 top-full mt-1.5 w-80 rounded-2xl shadow-2xl border p-3.5 z-50 transition-all text-left space-y-3.5"
                  style={{
                    backgroundColor: isNotionLight ? '#ffffff' : '#1e1e1e',
                    borderColor: isNotionLight ? '#e2e8f0' : '#334155',
                    color: isNotionLight ? '#0f172a' : '#f8fafc'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Popover Header */}
                  <div 
                    className="flex items-center justify-between pb-2 border-b"
                    style={{ borderColor: isNotionLight ? '#f1f5f9' : '#334155' }}
                  >
                    <span 
                      className="text-xs font-bold flex items-center gap-1.5"
                      style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-teal-500" />
                      Semua Tools & Pengaturan
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsFullToolsPopoverOpen(false)}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ color: isNotionLight ? '#64748b' : '#94a3b8' }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Section 1: Tampilan & Tata Letak */}
                  <div className="space-y-2">
                    <span 
                      className="text-[10px] font-bold uppercase tracking-wider block"
                      style={{ color: isNotionLight ? '#64748b' : '#94a3b8' }}
                    >
                      Tampilan & Tata Letak
                    </span>
                    
                    {/* Zoom Controller */}
                    <div 
                      className="flex items-center justify-between p-2 rounded-xl border"
                      style={{
                        backgroundColor: isNotionLight ? '#f8fafc' : '#262626',
                        borderColor: isNotionLight ? '#e2e8f0' : '#383838'
                      }}
                    >
                      <span 
                        className="text-xs font-medium"
                        style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}
                      >
                        Skala Tampilan (Zoom)
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setZoomPercent((prev) => Math.max(70, prev - 10))}
                          className="p-1 rounded cursor-pointer hover:opacity-80 transition-all border"
                          style={{
                            backgroundColor: isNotionLight ? '#e2e8f0' : '#383838',
                            color: isNotionLight ? '#0f172a' : '#f8fafc',
                            borderColor: isNotionLight ? '#cbd5e1' : '#4f4f4f'
                          }}
                          title="Perkecil"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span 
                          onClick={() => setZoomPercent(100)}
                          className="font-mono text-xs font-bold min-w-[40px] text-center cursor-pointer hover:underline text-teal-600 dark:text-teal-400"
                          title="Klik untuk Reset ke 100%"
                        >
                          {zoomPercent}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setZoomPercent((prev) => Math.min(130, prev + 10))}
                          className="p-1 rounded cursor-pointer hover:opacity-80 transition-all border"
                          style={{
                            backgroundColor: isNotionLight ? '#e2e8f0' : '#383838',
                            color: isNotionLight ? '#0f172a' : '#f8fafc',
                            borderColor: isNotionLight ? '#cbd5e1' : '#4f4f4f'
                          }}
                          title="Perbesar"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Font Size Controller */}
                    <div 
                      className="flex items-center justify-between p-2 rounded-xl border"
                      style={{
                        backgroundColor: isNotionLight ? '#f8fafc' : '#262626',
                        borderColor: isNotionLight ? '#e2e8f0' : '#383838'
                      }}
                    >
                      <div className="flex flex-col">
                        <span 
                          className="text-xs font-medium"
                          style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}
                        >
                          Ukuran Huruf (Font Size)
                        </span>
                        <span 
                          className="text-[10px]"
                          style={{ color: isNotionLight ? '#64748b' : '#94a3b8' }}
                        >
                          Hanya teks, tanpa mengubah ukuran UI
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLabNoteFontSize((prev) => Math.max(10, prev - 1))}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer hover:opacity-80 transition-all shadow-2xs"
                          style={{
                            backgroundColor: isNotionLight ? '#e2e8f0' : '#383838',
                            color: isNotionLight ? '#0f172a' : '#f8fafc',
                            borderColor: isNotionLight ? '#cbd5e1' : '#4f4f4f'
                          }}
                          title="Perkecil Huruf (A-)"
                        >
                          A-
                        </button>
                        <span 
                          onClick={() => setLabNoteFontSize(13)}
                          className="font-mono text-xs font-bold min-w-[38px] text-center cursor-pointer hover:underline text-teal-600 dark:text-teal-400"
                          title="Klik untuk Reset ke 13px"
                        >
                          {labNoteFontSize}px
                        </span>
                        <button
                          type="button"
                          onClick={() => setLabNoteFontSize((prev) => Math.min(18, prev + 1))}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer hover:opacity-80 transition-all shadow-2xs"
                          style={{
                            backgroundColor: isNotionLight ? '#e2e8f0' : '#383838',
                            color: isNotionLight ? '#0f172a' : '#f8fafc',
                            borderColor: isNotionLight ? '#cbd5e1' : '#4f4f4f'
                          }}
                          title="Perbesar Huruf (A+)"
                        >
                          A+
                        </button>
                      </div>
                    </div>

                    {/* Rapikan Kolom Button */}
                    <button
                      type="button"
                      onClick={() => {
                        handleResetColumnOrder();
                        setIsFullToolsPopoverOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer hover:border-teal-500/60"
                      style={{
                        backgroundColor: isNotionLight ? '#f8fafc' : '#262626',
                        borderColor: isNotionLight ? '#e2e8f0' : '#383838',
                        color: isNotionLight ? '#0f172a' : '#f8fafc'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-teal-500" />
                        <span style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}>
                          Rapikan Kolom ke Standar Notion
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5" style={{ color: isNotionLight ? '#64748b' : '#94a3b8' }} />
                    </button>

                    {/* Mode Edit Tabel (Atur Kolom) Toggle */}
                    <button
                      type="button"
                      onClick={() => setIsTableEditMode(!isTableEditMode)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                        isTableEditMode 
                          ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                          : 'hover:border-teal-500/60'
                      }`}
                      style={{
                        backgroundColor: isTableEditMode ? undefined : (isNotionLight ? '#f8fafc' : '#262626'),
                        borderColor: isTableEditMode ? undefined : (isNotionLight ? '#e2e8f0' : '#383838'),
                        color: isTableEditMode ? undefined : (isNotionLight ? '#0f172a' : '#f8fafc')
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <TableProperties className="w-3.5 h-3.5 text-amber-500" />
                        <span>Mode Edit Tabel (Atur Kolom)</span>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isTableEditMode ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {isTableEditMode ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </button>

                    {/* Theme Switcher Button */}
                    <button
                      type="button"
                      onClick={() => setThemeMode(isNotionLight ? 'dark-studio' : 'notion-light')}
                      className="w-full flex items-center justify-between p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer hover:border-teal-500/60"
                      style={{
                        backgroundColor: isNotionLight ? '#f8fafc' : '#262626',
                        borderColor: isNotionLight ? '#e2e8f0' : '#383838',
                        color: isNotionLight ? '#0f172a' : '#f8fafc'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {isNotionLight ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                        <span style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}>
                          Tema Tampilan
                        </span>
                      </div>
                      <span 
                        className="text-[11px] font-semibold"
                        style={{ color: isNotionLight ? '#475569' : '#cbd5e1' }}
                      >
                        {isNotionLight ? '⚪ Notion Light' : '⚫ Dark Studio'}
                      </span>
                    </button>
                  </div>

                  {/* Section 2: Data & Aksi Tabel */}
                  <div 
                    className="space-y-2 pt-1 border-t"
                    style={{ borderColor: isNotionLight ? '#f1f5f9' : '#334155' }}
                  >
                    <span 
                      className="text-[10px] font-bold uppercase tracking-wider block"
                      style={{ color: isNotionLight ? '#64748b' : '#94a3b8' }}
                    >
                      Data & Manajemen
                    </span>

                    {/* Export CSV */}
                    <button
                      type="button"
                      onClick={() => {
                        handleExportCsv();
                        setIsFullToolsPopoverOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer hover:border-teal-500/60"
                      style={{
                        backgroundColor: isNotionLight ? '#f8fafc' : '#262626',
                        borderColor: isNotionLight ? '#e2e8f0' : '#383838',
                        color: isNotionLight ? '#0f172a' : '#f8fafc'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-teal-500" />
                        <span style={{ color: isNotionLight ? '#0f172a' : '#f8fafc' }}>
                          Ekspor Data ke File CSV
                        </span>
                      </div>
                      <span 
                        className="text-[10.5px] font-mono px-1.5 py-0.5 rounded border"
                        style={{
                          backgroundColor: isNotionLight ? '#e2e8f0' : '#333333',
                          borderColor: isNotionLight ? '#cbd5e1' : '#475569',
                          color: isNotionLight ? '#475569' : '#cbd5e1'
                        }}
                      >
                        .csv
                      </span>
                    </button>

                    {/* Migrasi Subtask */}
                    <button
                      type="button"
                      onClick={() => {
                        handleMigrateChecklistsToSubItems();
                        setIsFullToolsPopoverOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer hover:opacity-90"
                      style={{
                        backgroundColor: isNotionLight ? '#fef3c7' : '#291800',
                        borderColor: isNotionLight ? '#fcd34d' : '#78350f',
                        color: isNotionLight ? '#92400e' : '#fef08a'
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <CornerDownRight className="w-3.5 h-3.5 text-amber-600" />
                        <span style={{ color: isNotionLight ? '#92400e' : '#fef08a' }}>
                          Migrasi Checklist Subtask
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                    </button>

                    {/* Multiple Selection Actions */}
                    {localRows.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="flex-1 py-1.5 px-2 rounded-xl border text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                          style={{
                            backgroundColor: isAllSelected 
                              ? (isNotionLight ? '#0f172a' : '#0d9488') 
                              : (isNotionLight ? '#ffffff' : '#262626'),
                            borderColor: isNotionLight ? '#cbd5e1' : '#4f4f4f',
                            color: isAllSelected 
                              ? '#ffffff' 
                              : (isNotionLight ? '#0f172a' : '#f8fafc')
                          }}
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>{isAllSelected ? 'Batal Pilih' : 'Pilih Semua'}</span>
                        </button>

                        {selectedRowIndices.size > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              handleDeleteSelectedRows();
                              setIsFullToolsPopoverOpen(false);
                            }}
                            className="py-1.5 px-2.5 rounded-xl border border-red-500/40 bg-red-600/15 hover:bg-red-600/25 text-red-500 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus ({selectedRowIndices.size})</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 7. PRIMARY "+ New" BUTTON ALA NOTION */}
            <NotionTooltip content="Tambah Baris Kegiatan Baru" position="bottom">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-1 shadow-2xs active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </NotionTooltip>
          </div>
        </div>
      </div>

      {/* Banner Mode Edit Tabel Aktif */}
      {viewMode === 'table' && isTableEditMode && (
        <div className="mb-2 px-3 py-1.5 rounded-xl text-xs flex items-center justify-between border bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <TableProperties className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              <strong>Mode Edit Tabel Aktif:</strong> Tombol atur posisi (<span className="px-1 py-0.5 rounded bg-amber-500/20 font-mono font-bold">&lt;</span> <span className="px-1 py-0.5 rounded bg-amber-500/20 font-mono font-bold">&gt;</span>) dan hapus kolom (<span className="px-1 py-0.5 rounded bg-amber-500/20 font-mono font-bold">×</span>) aktif pada header kolom.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsTableEditMode(false)}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-[11px] transition-colors cursor-pointer shadow-xs ml-3 shrink-0"
          >
            Selesai Edit
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TABLE VIEW (Exact Notion Column Hierarchy & Zoom / Fit Page)            */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div 
          ref={tableScrollRef}
          onScroll={handleTableScroll}
          className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-210px)] w-full transition-all notion-table-scroll-freeze rounded-b-xl border border-[#e9e9e8] dark:border-[#2d2d2d]"
          style={{ zoom: zoomPercent !== 100 ? `${zoomPercent}%` : undefined }}
        >
          <style>{`
            .notion-table-scroll-freeze {
              scrollbar-width: thin;
              scrollbar-color: rgba(13, 148, 136, 0.4) transparent;
            }
            .notion-table-scroll-freeze::-webkit-scrollbar {
              width: 6px;
              height: 0px;
            }
            .notion-table-scroll-freeze::-webkit-scrollbar-track {
              background: transparent;
            }
            .notion-table-scroll-freeze::-webkit-scrollbar-thumb {
              background: rgba(13, 148, 136, 0.4);
              border-radius: 9999px;
            }
            .notion-table-scroll-freeze::-webkit-scrollbar-thumb:hover {
              background: rgba(13, 148, 136, 0.7);
            }

            .notion-floating-scroll-light {
              scrollbar-color: #0d9488 rgba(241, 245, 249, 0.85);
              scrollbar-width: thin;
            }
            .notion-floating-scroll-light::-webkit-scrollbar {
              height: 7px;
            }
            .notion-floating-scroll-light::-webkit-scrollbar-track {
              background: rgba(241, 245, 249, 0.85);
              border-radius: 9999px;
            }
            .notion-floating-scroll-light::-webkit-scrollbar-thumb {
              background: #0d9488;
              border-radius: 9999px;
              box-shadow: 0 1px 4px rgba(13, 148, 136, 0.45);
            }
            .notion-floating-scroll-light::-webkit-scrollbar-thumb:hover {
              background: #0f766e;
              box-shadow: 0 0 8px rgba(15, 118, 110, 0.65);
            }

            .notion-floating-scroll-dark {
              scrollbar-color: #14b8a6 rgba(24, 24, 27, 0.85);
              scrollbar-width: thin;
            }
            .notion-floating-scroll-dark::-webkit-scrollbar {
              height: 7px;
            }
            .notion-floating-scroll-dark::-webkit-scrollbar-track {
              background: rgba(24, 24, 27, 0.85);
              border-radius: 9999px;
            }
            .notion-floating-scroll-dark::-webkit-scrollbar-thumb {
              background: #14b8a6;
              border-radius: 9999px;
              box-shadow: 0 1px 6px rgba(20, 184, 166, 0.5);
            .notion-font-scope {
              color: ${isNotionLight ? '#37352f' : '#f1f5f9'};
            }
            .notion-font-scope th,
            .notion-font-scope td,
            .notion-font-scope input,
            .notion-font-scope textarea {
              font-size: inherit;
            }
          `}</style>
          <table 
            className={`w-full ${fitPageMode ? 'table-fixed max-w-full leading-normal' : 'min-w-max table-auto leading-relaxed'} text-left border-collapse notion-font-scope`}
            style={{
              fontSize: `${labNoteFontSize}px`,
              fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
              letterSpacing: '-0.005em',
              color: isNotionLight ? '#37352f' : '#f1f5f9'
            }}
          >
            {/* Table Header */}
            <thead>
              <tr 
                className={`border-b select-none transition-colors ${
                  isNotionLight ? 'border-[#e9e9e8]' : 'border-[#303030]'
                }`}
              >
                {/* 0. Dedicated Action Gutter (+, ::, [ ]) Column Header ala Notion */}
                <th 
                  className={`sticky top-0 z-20 text-center shadow-2xs border-b border-r select-none ${
                    isNotionLight ? 'bg-[#fbfbfa] text-[#37352f] border-[#e9e9e8]' : 'bg-[#202020] text-slate-300 border-[#303030]'
                  } ${fitPageMode ? 'w-14 min-w-[56px] max-w-[56px] px-1 py-2.5' : 'w-16 min-w-[62px] max-w-[62px] px-1.5 py-3'}`}
                >
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isSomeSelected;
                      }}
                      onChange={handleToggleSelectAll}
                      className={`w-3.5 h-3.5 rounded cursor-pointer accent-teal-600 opacity-60 hover:opacity-100 transition-opacity ${
                        isNotionLight ? 'border-slate-300' : 'bg-slate-800 border-slate-600'
                      }`}
                      title={isAllSelected ? "Batalkan pilihan semua" : "Pilih semua baris"}
                    />
                  </div>
                </th>
                {displayHeaders.map((colHeader) => {
                  const isSorted = sortColumn === colHeader;
                  const isNum = colHeader.toLowerCase() === 'number' || colHeader.toLowerCase() === 'no';
                  const cleanHeader = colHeader.toLowerCase().replace(/^[^a-z0-9]+/i, '').trim();
                  const isJudul = cleanHeader.includes('jenis kegiatan') || cleanHeader === 'task' || cleanHeader === 'judul' || cleanHeader === 'name' || cleanHeader === 'title' || cleanHeader === 'nama' || cleanHeader === 'materi';
                  const colLower = colHeader.toLowerCase();
                  const colIdx = displayHeaders.indexOf(colHeader);

                  // Column width classes based on fitPageMode
                  let widthClass = 'whitespace-nowrap px-3.5 py-3';
                  if (fitPageMode) {
                    if (isNum) widthClass = 'w-[5%] text-center px-1 py-2.5';
                    else if (isJudul) widthClass = 'w-[25%] px-2.5 py-2.5';
                    else if (colLower.includes('keterangan') || colLower.includes('catatan')) widthClass = 'w-[22%] px-2.5 py-2.5';
                    else if (colLower.includes('created')) widthClass = 'w-[9%] px-1.5 py-2.5';
                    else if (colLower.includes('completed') || colLower.includes('aktual selesai') || colLower === 'selesai' || colLower.includes('tanggal selesai')) widthClass = 'w-[9%] px-1.5 py-2.5';
                    else if (colLower.includes('status')) widthClass = 'w-[9%] px-1.5 py-2.5';
                    else if (colLower === 'pic' || colLower.includes('assignee')) widthClass = 'w-[11%] px-1.5 py-2.5';
                    else if (colLower.includes('priority') || colLower.includes('prioritas')) widthClass = 'w-[6%] px-1.5 py-2.5';
                    else if (colLower.includes('activity') || colLower.includes('aktivitas')) widthClass = 'w-[7%] px-1.5 py-2.5';
                    else widthClass = 'w-[6%] px-1.5 py-2.5';
                  } else {
                    if (isNum) widthClass = 'w-16 text-center px-3.5 py-3 whitespace-nowrap';
                    else if (isJudul) widthClass = 'min-w-[260px] px-3.5 py-3 whitespace-nowrap';
                    else if (colLower.includes('keterangan')) widthClass = 'w-[360px] min-w-[280px] max-w-[450px] px-3.5 py-3 overflow-hidden';
                    else widthClass = 'px-3.5 py-3 whitespace-nowrap';
                  }

                  return (
                    <th
                      key={colHeader}
                      style={getColStyle(colHeader)}
                      className={`sticky top-0 z-20 shadow-2xs font-semibold hover:opacity-90 transition-opacity group/th relative border-b border-r text-[13px] ${
                        isNotionLight ? 'bg-[#fbfbfa] text-[#37352f] border-[#e9e9e8]' : 'bg-[#202020] text-slate-200 border-[#303030]'
                      } ${widthClass}`}
                    >
                      <div className={`flex items-center justify-between gap-1.5 ${isNum ? 'justify-center' : ''}`}>
                        <div 
                          onClick={() => handleSort(colHeader)}
                          className="flex items-center gap-1 cursor-pointer flex-1 min-w-0"
                          title="Klik untuk mengurutkan kolom"
                        >
                          {getNotionColumnIcon(colHeader)}
                          <span className={`truncate font-semibold ${isNotionLight ? 'text-[#37352f]' : 'text-slate-300'}`}>
                            {colLower.includes('tanggal selesai') || colLower.includes('completed') || colLower.includes('aktual selesai') || colLower === 'selesai' || colLower.includes('waktu selesai')
                              ? 'Tanggal Selesai'
                              : colHeader}
                          </span>
                          {isSorted && (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" /> : <ArrowDown className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                          )}
                        </div>

                        {/* Quick Add Blank Row at top (#1) on Number Header */}
                        {isNum && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInsertBlankRow(0);
                            }}
                            className="p-0.5 rounded hover:bg-teal-500/20 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer shrink-0 ml-0.5"
                            title="Tambah baris kosong baru di nomor paling atas (#1)"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Column Reorder (< and >) and Delete (X) Actions - HANYA MUNCUL DI MODE EDIT TABEL */}
                        {!isNum && isTableEditMode && (
                          <div className="flex items-center gap-0.5 shrink-0 bg-slate-800/80 dark:bg-slate-900/90 rounded px-1 py-0.5 border border-slate-700/50 shadow-xs ml-1">
                            {/* Geser Kiri */}
                            {colIdx > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveColumn(colHeader, 'left');
                                }}
                                title={`Geser kolom "${colHeader}" ke kiri`}
                                className="p-0.5 rounded hover:bg-slate-700 text-slate-300 hover:text-teal-300 transition-all cursor-pointer"
                              >
                                <ChevronLeft className="w-3 h-3" />
                              </button>
                            )}

                            {/* Geser Kanan */}
                            {colIdx < displayHeaders.length - 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveColumn(colHeader, 'right');
                                }}
                                title={`Geser kolom "${colHeader}" ke kanan`}
                                className="p-0.5 rounded hover:bg-slate-700 text-slate-300 hover:text-teal-300 transition-all cursor-pointer"
                              >
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}

                            {/* Hapus Kolom (Non-protected) */}
                            {!isJudul && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteColumn(colHeader);
                                }}
                                title={`Hapus kolom "${colHeader}"`}
                                className="p-0.5 rounded hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 transition-all cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Column Resizer Handle (Draggable Divider) */}
                      <div
                        onMouseDown={(e) => handleResizeStart(e, colHeader, (e.currentTarget.parentElement?.offsetWidth || 180))}
                        onTouchStart={(e) => handleResizeStart(e, colHeader, (e.currentTarget.parentElement?.offsetWidth || 180))}
                        onClick={(e) => e.stopPropagation()}
                        title={`Geser untuk atur lebar kolom "${colHeader}"`}
                        className={`absolute right-0 top-0 bottom-0 w-3 cursor-col-resize select-none flex items-center justify-center z-20 group/resizer hover:bg-teal-500/30 ${
                          resizingCol === colHeader ? 'bg-teal-500/50 w-2.5' : ''
                        }`}
                      >
                        <div className={`w-[2px] h-4 rounded-full transition-colors ${
                          resizingCol === colHeader 
                            ? 'bg-teal-400' 
                            : 'bg-slate-300 dark:bg-slate-600 group-hover/resizer:bg-teal-400'
                        }`} />
                      </div>
                    </th>
                  );
                })}

                {/* Add Column Header Button (+) */}
                <th 
                  className={`sticky top-0 z-20 w-10 text-center px-1.5 py-2.5 relative shadow-2xs border-b border-r ${
                    isNotionLight ? 'bg-[#fbfbfa] border-[#e9e9e8]' : 'bg-[#202020] border-[#303030]'
                  }`} 
                  ref={addColumnRef}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddColumnPopover(!showAddColumnPopover);
                    }}
                    title="Tambah Kolom Baru (Template atau Kustom)"
                    className="p-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/25 border border-teal-500/30 text-teal-400 hover:text-teal-300 transition-all cursor-pointer flex items-center justify-center mx-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>

                  {/* Add Column Popover Dropdown (100% Solid Card) */}
                  {showAddColumnPopover && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 z-50 mt-1 w-64 rounded-2xl border shadow-2xl p-2.5 text-left text-xs font-sans animate-in fade-in zoom-in-95 duration-150"
                      style={{
                        backgroundColor: 'var(--card-bg, #ffffff)',
                        borderColor: 'var(--border-main, #cbd5e1)',
                        color: 'var(--text-main, #0f172a)',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.15)'
                      }}
                    >
                      <div 
                        className="px-1.5 py-1 text-[11px] font-bold border-b pb-1.5 mb-1.5 flex items-center justify-between"
                        style={{
                          borderColor: 'var(--border-main, #e2e8f0)',
                          color: 'var(--text-main, #0f172a)'
                        }}
                      >
                        <span>Tambah Kolom Baru</span>
                      </div>

                      {/* Custom Column Input */}
                      <div 
                        className="p-1.5 mb-2 rounded-xl border"
                        style={{
                          backgroundColor: 'var(--input-bg, #f8fafc)',
                          borderColor: 'var(--border-main, #e2e8f0)'
                        }}
                      >
                        <label 
                          className="text-[10px] block px-1 mb-1 font-semibold"
                          style={{ color: 'var(--text-muted, #64748b)' }}
                        >
                          Kolom Kustom
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={customColumnName}
                            onChange={(e) => setCustomColumnName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddColumn(customColumnName);
                              }
                            }}
                            placeholder="Nama kolom..."
                            className="flex-1 text-xs px-2 py-1 rounded-lg border outline-none font-medium"
                            style={{
                              backgroundColor: 'var(--card-bg, #ffffff)',
                              borderColor: 'var(--border-main, #cbd5e1)',
                              color: 'var(--text-main, #0f172a)'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleAddColumn(customColumnName)}
                            className="px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
                          >
                            Tambah
                          </button>
                        </div>
                      </div>

                      {/* Template Options */}
                      <div 
                        className="text-[10px] px-1 mb-1 font-bold uppercase tracking-wider"
                        style={{ color: 'var(--text-muted, #64748b)' }}
                      >
                        Template Kolom Populer
                      </div>
                      <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                        {POPULAR_COLUMN_TEMPLATES.map((tmpl) => {
                          const isAlreadyAdded = tableHeaders.some(h => h.toLowerCase() === tmpl.name.toLowerCase());
                          return (
                            <button
                              key={tmpl.name}
                              type="button"
                              disabled={isAlreadyAdded}
                              onClick={() => handleAddColumn(tmpl.name, tmpl.defaultValue)}
                              className={`w-full flex items-center justify-between p-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                                isAlreadyAdded 
                                  ? 'opacity-40 cursor-not-allowed'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                              style={{
                                color: 'var(--text-main, #0f172a)'
                              }}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-sm shrink-0">{tmpl.icon}</span>
                                <div className="min-w-0">
                                  <p className="font-semibold text-xs truncate">{tmpl.name}</p>
                                  <p className="text-[10px] truncate" style={{ color: 'var(--text-muted, #64748b)' }}>{tmpl.desc}</p>
                                </div>
                              </div>
                              {isAlreadyAdded ? (
                                <span className="text-[10px] italic" style={{ color: 'var(--text-muted, #94a3b8)' }}>Ada</span>
                              ) : (
                                <Plus className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </th>

                <th 
                  className={`sticky top-0 z-20 text-center shadow-2xs border-b text-[13px] ${fitPageMode ? 'w-[5%] px-1.5 py-2.5' : 'w-24 px-3 py-3'} ${
                    isNotionLight ? 'bg-[#fbfbfa] text-slate-700 font-semibold border-[#e9e9e8]' : 'bg-[#202020] text-slate-300 font-bold border-[#303030]'
                  }`}
                >
                  Aksi
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody 
              className={`transition-colors ${
                isNotionLight ? 'bg-white' : 'bg-[#1c1c1c]'
              }`}
            >
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={displayHeaders.length + 3} className="py-12 text-center text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>
                    {localRows.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-6">
                        <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                          <Plus className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <p className={`font-semibold text-sm ${isNotionLight ? 'text-slate-800' : 'text-slate-100'}`}>Belum Ada Topik / Baris Kegiatan</p>
                          <p className="text-xs mt-1 max-w-sm mx-auto text-slate-500">Semua topik dalam tabel ini kosong. Klik tombol di bawah untuk menambahkan topik baru ke tabel ini.</p>
                        </div>
                        <button
                          type="button"
                          onClick={handleOpenAddModal}
                          className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow-md transition-all cursor-pointer active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Tambah Baris Kegiatan Baru</span>
                        </button>
                      </div>
                    ) : (
                      <span className="italic">Tidak ada data yang sesuai dengan pencarian atau filter.</span>
                    )}
                  </td>
                </tr>
              ) : (
                groupedRowsData.map(({ groupName, groupRows }) => {
                  const isCollapsed = collapsedGroups[groupName];

                  return (
                    <React.Fragment key={groupName}>
                      {/* Notion Group Header Row */}
                      <tr
                        onClick={() => toggleGroup(groupName)}
                        className={`cursor-pointer select-none transition-colors border-b font-medium text-xs ${
                          isNotionLight
                            ? 'bg-[#fbfbfa] hover:bg-[#f3f3f1] text-slate-800 border-[#e9e9e8]'
                            : 'bg-[#202020] hover:bg-[#282828] text-slate-200 border-[#303030]'
                        }`}
                      >
                        <td colSpan={displayHeaders.length + 3} className="px-3.5 py-2.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 select-none">
                                {isCollapsed ? '▶' : '▼'}
                              </span>
                              <span className={`font-semibold ${isNotionLight ? 'text-slate-800' : 'text-slate-200'}`}>
                                {groupName}
                              </span>
                              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                isNotionLight ? 'bg-slate-200/80 text-slate-700' : 'bg-slate-800 text-slate-300'
                              }`}>
                                {groupRows.length}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAddModal();
                              }}
                              className={`p-1 rounded transition-colors ${
                                isNotionLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-700 text-slate-400'
                              }`}
                              title={`Tambah kegiatan baru di ${groupName}`}
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Group Rows (Hierarchical Parent & Sub-items) */}
                      {!isCollapsed && (() => {
                        // Susun baris hierarkis: Parent -> SubItems (menggunakan rowToParentMap yang stabil)

                        const hierarchicalItems: Array<{
                          parentRow: TableRowData;
                          parentIndex: number;
                          subItems: Array<{ row: TableRowData; actualIndex: number }>;
                        }> = [];

                        let currentParentItem: {
                          parentRow: TableRowData;
                          parentIndex: number;
                          subItems: Array<{ row: TableRowData; actualIndex: number }>;
                        } | null = null;

                        const seenSubItemRows = new Set<TableRowData>();

                        groupRows.forEach((row) => {
                          const actualRowIndex = localRows.indexOf(row) !== -1 ? localRows.indexOf(row) : 0;
                          const isSub = isSubItemRow(row);

                          if (isSub) {
                            if (seenSubItemRows.has(row)) return;
                            seenSubItemRows.add(row);

                            const designatedParent = rowToParentMap.get(row);
                            const existingParent = designatedParent 
                              ? hierarchicalItems.find(h => h.parentRow === designatedParent || (designatedParent.id && h.parentRow.id && h.parentRow.id === designatedParent.id)) 
                              : null;

                            if (existingParent) {
                              existingParent.subItems.push({
                                row,
                                actualIndex: actualRowIndex
                              });
                            } else if (currentParentItem && (!designatedParent || designatedParent === currentParentItem.parentRow)) {
                              currentParentItem.subItems.push({
                                row,
                                actualIndex: actualRowIndex
                              });
                            } else if (designatedParent) {
                              const parentIdx = localRows.indexOf(designatedParent);
                              const newParent = {
                                parentRow: designatedParent,
                                parentIndex: parentIdx !== -1 ? parentIdx : 0,
                                subItems: [{ row, actualIndex: actualRowIndex }]
                              };
                              hierarchicalItems.push(newParent);
                              currentParentItem = newParent;
                            } else if (currentParentItem) {
                              currentParentItem.subItems.push({
                                row,
                                actualIndex: actualRowIndex
                              });
                            } else {
                              currentParentItem = {
                                parentRow: row,
                                parentIndex: actualRowIndex,
                                subItems: []
                              };
                              hierarchicalItems.push(currentParentItem);
                            }
                          } else {
                            // Prevent duplicating parent row if already registered by prior sub-items
                            const existingParent = hierarchicalItems.find(h => 
                              h.parentRow === row || 
                              (row.id && h.parentRow.id && h.parentRow.id === row.id)
                            );
                            if (existingParent) {
                              currentParentItem = existingParent;
                            } else {
                              currentParentItem = {
                                parentRow: row,
                                parentIndex: actualRowIndex,
                                subItems: []
                              };
                              hierarchicalItems.push(currentParentItem);
                            }
                          }
                        });

                        // Helper render item baris (parent atau sub-item)
                        const renderRowItem = (
                          row: TableRowData,
                          actualRowIndex: number,
                          isSubItem: boolean,
                          hasChildren: boolean,
                          isExpanded: boolean,
                          subItemsList?: Array<{ row: TableRowData; actualIndex: number }>,
                          onToggleExpand?: (e: React.MouseEvent) => void
                        ) => {
                          const isDirty = dirtyRowIndices.has(actualRowIndex);
                          const isSelected = selectedRowIndices.has(actualRowIndex);
                          const isSubCompleted = isSubItem ? isSubItemCompleted(row) : false;
                          const rawTitle = (getRowVal(row, 'Jenis kegiatan') || getRowVal(row, 'Name') || getRowVal(row, 'Judul') || row['Name'] || row['= Name'] || `Baris ${actualRowIndex + 1}`).trim();
                          const displayTitle = getDisplayTitle(rawTitle);
                          const topicKey = displayTitle.toLowerCase().trim();
                          const rowIdKey = (row.id || '').toLowerCase().trim();
                          const cCount = topicCommentCounts[topicKey] || (rowIdKey ? topicCommentCounts[rowIdKey] : 0) || 0;

                          return (
                            <tr
                              key={isSubItem ? `sub-${actualRowIndex}-${row.id || ''}` : `row-${actualRowIndex}-${row.id || ''}`}
                              className={`transition-all group border-b ${
                                isSelected 
                                  ? 'bg-teal-500/10 hover:bg-teal-500/15' 
                                  : isDirty 
                                    ? 'bg-amber-500/5 hover:bg-amber-500/10' 
                                    : isSubItem
                                      ? isNotionLight ? 'hover:bg-slate-50/90 bg-[#fafafa]/80' : 'hover:bg-slate-800/30 bg-[#161616]/40'
                                      : isNotionLight
                                      ? 'hover:bg-[#fbfbfa] bg-white'
                                      : 'hover:bg-slate-800/40 bg-transparent'
                              } ${
                                isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                              }`}
                              style={{ 
                                borderBottomColor: isSelected 
                                  ? 'rgba(20, 184, 166, 0.4)' 
                                  : isDirty 
                                    ? 'rgba(245, 158, 11, 0.4)' 
                                    : isNotionLight
                                    ? '#e9e9e8'
                                    : 'var(--border-main, #334155)' 
                              }}
                            >
                              {/* 0. Dedicated Action Gutter (+, ::, [ ]) Column ala Notion */}
                              <td 
                                className={`border-r select-none transition-colors ${
                                  isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                } ${fitPageMode ? 'w-14 min-w-[56px] max-w-[56px] px-0.5 py-1' : 'w-16 min-w-[62px] max-w-[62px] px-1 py-1'}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center justify-center gap-1">
                                  {/* + Button: Insert new task/row */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleInsertBlankRow(actualRowIndex + 1);
                                    }}
                                    className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                                    title="Tambah baris tugas baru di bawah ini"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>

                                  {/* :: Grip Vertical Handle */}
                                  <div 
                                    className="p-0.5 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 cursor-grab active:cursor-grabbing transition-opacity opacity-0 group-hover:opacity-100"
                                    title="Geser posisi baris"
                                  >
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>

                                  {/* [ ] Select Checkbox */}
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => handleToggleSelectRow(actualRowIndex, e as any)}
                                    className={`w-3.5 h-3.5 rounded cursor-pointer accent-teal-600 transition-opacity ${
                                      isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                    } ${
                                      isNotionLight ? 'border-slate-300' : 'bg-slate-800 border-slate-600'
                                    }`}
                                    title={isSelected ? "Batalkan pilihan" : "Pilih baris ini"}
                                  />
                                </div>
                              </td>

                              {displayHeaders.map((colName) => {
                                const val = getRowVal(row, colName);
                                const colLower = colName.toLowerCase();
                                const cleanCol = colLower.replace(/^[^a-z0-9]+/i, '').trim();

                                // 1. Number Column
                                if (colLower === 'number' || colLower === 'no') {
                                  return (
                                    <td 
                                      key={colName} 
                                      style={{ ...getColStyle(colName), color: isDirty ? '#f59e0b' : isNotionLight ? '#64748b' : 'var(--text-muted, #64748b)' }} 
                                      className={`text-center font-mono border-r ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${
                                        fitPageMode ? 'px-1.5 py-2.5 text-xs' : 'px-3 py-3 text-[13px]'
                                      }`}
                                    >
                                      <div className="flex items-center justify-center gap-1 relative group/num">
                                        {isDirty && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" title="Ada perubahan belum disimpan" />
                                        )}
                                        {!isSubItem && (
                                          <span>{val || actualRowIndex + 1}</span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                }

                                // 2. Jenis kegiatan Column (Judul / Name / Materi)
                                if (cleanCol.includes('jenis kegiatan') || cleanCol === 'task' || cleanCol === 'judul' || cleanCol === 'name' || cleanCol === 'title' || cleanCol === 'nama' || cleanCol === 'materi') {
                                  const isEditingThis = activeInlineEditor?.rowIndex === actualRowIndex && activeInlineEditor?.colName === colName;

                                  return (
                                    <td 
                                      key={colName} 
                                      style={{ ...getColStyle(colName), fontSize: `${labNoteFontSize}px`, color: isNotionLight ? '#0f172a' : 'var(--text-main, #f8fafc)' }} 
                                      className={`font-medium transition-colors border-r ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${
                                        fitPageMode ? 'px-2.5 py-2.5 overflow-hidden' : 'px-4 py-3'
                                      } ${!isEditingThis && onToggleExpand ? 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/20' : ''}`}
                                      onClick={(e) => {
                                        if (!isEditingThis && onToggleExpand) {
                                          onToggleExpand(e);
                                        }
                                      }}
                                      title={!isEditingThis && onToggleExpand ? (isExpanded ? "Klik untuk menutup subtask dan keterangan" : "Klik untuk membuka subtask dan keterangan lengkap") : undefined}
                                    >
                                      {isEditingThis ? (
                                        <NotionInlineEditor
                                          initialValue={displayTitle || val}
                                          fieldLabel={isSubItem ? "Judul Sub-kegiatan" : "Judul Kegiatan"}
                                          multiline={false}
                                          isNotionLight={isNotionLight}
                                          onSave={(newVal) => {
                                            const formattedVal = isSubItem ? `↳ ${getDisplayTitle(newVal)}` : newVal;
                                            handleUpdateCellDirect(actualRowIndex, colName, formattedVal);
                                            setActiveInlineEditor(null);
                                          }}
                                          onCancel={() => setActiveInlineEditor(null)}
                                        />
                                      ) : (
                                        <div className={`flex items-center justify-between gap-2 group/cell ${isSubItem ? 'pl-6' : ''}`}>
                                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                            {/* Toggle Chevron for Parent Item */}
                                            {!isSubItem && (
                                              <button
                                                type="button"
                                                onClick={(e) => onToggleExpand ? onToggleExpand(e) : null}
                                                className="p-0.5 -ml-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer select-none shrink-0"
                                                title={isExpanded ? 'Tutup sub-kegiatan' : 'Buka sub-kegiatan'}
                                              >
                                                <span className="text-[10px] inline-block select-none leading-none font-bold">
                                                  {isExpanded ? '▼' : '▶'}
                                                </span>
                                              </button>
                                            )}

                                            {/* Sub-item Checklist Checkbox */}
                                            {isSubItem && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleToggleSubItemCompleted(actualRowIndex, isSubCompleted);
                                                }}
                                                className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                                  isSubCompleted
                                                    ? 'bg-teal-600 border-teal-600 text-white shadow-2xs'
                                                    : isNotionLight
                                                    ? 'border-slate-400 hover:border-teal-500 bg-white'
                                                    : 'border-slate-500 hover:border-teal-400 bg-slate-800'
                                                }`}
                                                title={isSubCompleted ? "Tandai sub-kegiatan belum selesai" : "Tandai sub-kegiatan selesai (Checklist)"}
                                              >
                                                {isSubCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                              </button>
                                            )}

                                            {/* Notion Document Icon */}
                                            <span className="text-slate-400 select-none text-xs shrink-0">📄</span>

                                            <span 
                                              style={{ fontSize: `${labNoteFontSize}px` }}
                                              className={`leading-normal block font-semibold transition-all ${
                                                isSubCompleted 
                                                  ? 'line-through text-slate-400 dark:text-slate-500 font-normal' 
                                                  : isNotionLight 
                                                    ? 'text-[#37352f] font-semibold' 
                                                    : 'text-slate-100'
                                              } ${fitPageMode ? 'break-words' : ''}`}
                                            >
                                              {displayTitle ? displayTitle : <em style={{ color: 'var(--text-muted, #64748b)' }}>Tanpa Judul</em>}
                                            </span>
                                            
                                            {/* Open Badge / Button */}
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedRow(row);
                                                setModalTab('details');
                                              }}
                                              className={`ml-1 opacity-80 group-hover/cell:opacity-100 px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all uppercase tracking-wider cursor-pointer shadow-2xs shrink-0 ${
                                                isNotionLight
                                                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                                                  : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300'
                                              }`}
                                              title="Buka dokumen / detail halaman"
                                            >
                                              OPEN
                                            </button>

                                            {cCount > 0 && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedRow(row);
                                                  setModalTab('comments');
                                                }}
                                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                                                  isNotionLight
                                                    ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                                                    : 'bg-teal-950/80 border-teal-600/70 text-teal-300 hover:bg-teal-900 shadow-xs'
                                                }`}
                                                title="Klik untuk membuka ruang diskusi/komentar baris ini"
                                              >
                                                <MessageSquare className="w-2.5 h-2.5" />
                                                <span>{cCount}</span>
                                              </button>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveInlineEditor({ rowIndex: actualRowIndex, colName, initialValue: displayTitle || val, multiline: false });
                                              }}
                                              title="Edit judul langsung"
                                              className="opacity-0 group-hover/cell:opacity-100 p-1 rounded hover:bg-teal-500/15 text-slate-400 hover:text-teal-400 transition-all cursor-pointer"
                                            >
                                              <Edit2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                  );
                                }

                                // 3. Keterangan Column (dengan Smart Tasklist & Pewarnaan Teks)
                                if (colLower.includes('keterangan') || colLower.includes('catatan') || colLower.includes('deskripsi')) {
                                  const isEditingThis = activeInlineEditor?.rowIndex === actualRowIndex && activeInlineEditor?.colName === colName;
                                  const taskProgress = parseTasklist(val);

                                  return (
                                    <td 
                                      key={colName} 
                                      style={{ ...getColStyle(colName), color: isNotionLight ? '#475569' : 'var(--text-muted, #94a3b8)' }} 
                                      className={`font-sans border-r ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${
                                        fitPageMode ? 'px-2 py-2 text-xs overflow-hidden' : 'px-3.5 py-2.5 w-[360px] min-w-[280px] max-w-[450px] overflow-hidden text-[13px]'
                                      }`}
                                    >
                                      {isEditingThis ? (
                                        <NotionInlineEditor
                                          initialValue={val}
                                          fieldLabel="Keterangan"
                                          multiline={true}
                                          isNotionLight={isNotionLight}
                                          allowTasklistMode={false}
                                          onSave={(newVal) => {
                                            handleUpdateCellDirect(actualRowIndex, colName, newVal);
                                            setActiveInlineEditor(null);
                                          }}
                                          onCancel={() => setActiveInlineEditor(null)}
                                        />
                                      ) : (
                                        <div 
                                          className="relative group/cell flex items-start justify-between gap-1 cursor-pointer font-sans w-full min-w-0 overflow-hidden"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveInlineEditor({ rowIndex: actualRowIndex, colName, initialValue: val, multiline: true });
                                          }}
                                        >
                                          <div className={`flex-1 min-w-0 overflow-hidden font-sans ${fitPageMode ? 'text-xs break-words' : 'text-[13px]'} leading-normal`}>
                                            {renderFormattedNotes(val, isExpanded)}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setActiveInlineEditor({ rowIndex: actualRowIndex, colName, initialValue: val, multiline: true });
                                            }}
                                            title="Edit keterangan langsung"
                                            className="opacity-0 group-hover/cell:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-teal-400 transition-all shrink-0 cursor-pointer"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  );
                                }

                                // 4. Tanggal Selesai Column
                                if (colLower.includes('completed') || colLower.includes('aktual selesai') || colLower === 'selesai' || colLower.includes('waktu selesai') || colLower.includes('tanggal selesai')) {
                                  const isEditingThis = activeInlineEditor?.rowIndex === actualRowIndex && activeInlineEditor?.colName === colName;

                                  let displayDate = val && val !== '-' ? val : '';
                                  if (!displayDate) {
                                    const statusStr = (getRowVal(row, 'Status') || '').toUpperCase();
                                    if (statusStr.includes('CLOSE') || statusStr.includes('SELESAI') || statusStr.includes('DONE')) {
                                      const ketVal = getRowVal(row, 'Keterangan');
                                      const taskProg = parseTasklist(ketVal);
                                      if (taskProg.items.length > 0) {
                                        const dates = taskProg.items.map(i => i.checkedDate).filter((d): d is string => Boolean(d)).sort();
                                        if (dates.length > 0) {
                                          displayDate = dates[dates.length - 1];
                                        }
                                      }
                                    }
                                  }

                                  return (
                                    <td key={colName} style={{ ...getColStyle(colName), color: isNotionLight ? '#475569' : 'var(--text-muted, #94a3b8)' }} className={`font-sans border-r ${
                                      isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                    } ${
                                      fitPageMode ? 'px-2 py-2 text-xs truncate' : 'px-3.5 py-2.5 whitespace-nowrap text-[13px]'
                                    }`}>
                                      {isEditingThis ? (
                                        <NotionInlineEditor
                                          initialValue={val}
                                          fieldLabel="Tanggal Selesai"
                                          multiline={false}
                                          isNotionLight={isNotionLight}
                                          onSave={(newVal) => {
                                            handleUpdateCellDirect(actualRowIndex, colName, newVal);
                                            setActiveInlineEditor(null);
                                          }}
                                          onCancel={() => setActiveInlineEditor(null)}
                                        />
                                      ) : displayDate ? (
                                        <span 
                                          onClick={() => setActiveInlineEditor({ rowIndex: actualRowIndex, colName, initialValue: displayDate, multiline: false })}
                                          className="inline-flex items-center gap-1.5 cursor-pointer hover:underline font-sans font-medium text-slate-700 dark:text-slate-300"
                                          title="Klik untuk mengubah Tanggal Selesai"
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                          <span>{displayDate}</span>
                                        </span>
                                      ) : (
                                        <span 
                                          onClick={() => {
                                            const todayStr = new Date().toISOString().slice(0, 10);
                                            handleUpdateCellDirect(actualRowIndex, colName, todayStr);
                                          }}
                                          className="font-mono text-slate-400 hover:text-emerald-500 cursor-pointer text-xs transition-colors"
                                          title="Klik untuk isi tanggal selesai hari ini"
                                        >
                                          -
                                        </span>
                                      )}
                                    </td>
                                  );
                                }

                                // 5. PIC Column (Interactive Inline Click-to-Edit)
                                if (colLower === 'pic' || colLower.includes('assignee')) {
                                  const isEditingPic = activeInlinePicCell?.rowIndex === actualRowIndex && activeInlinePicCell?.colName === colName;
                                  const isManajemenMutu = (section || '').toUpperCase().includes('QA') || 
                                                         (section || '').toUpperCase().includes('MUTU') || 
                                                         (title || '').toUpperCase().includes('MUTU') || 
                                                         (title || '').toUpperCase().includes('MANAJEMEN MUTU') || 
                                                         (initialTopicTitle || '').toUpperCase().includes('MUTU');

                                  const filteredEmployees = employeesList
                                    .filter((emp) => {
                                      const q = inlinePicSearch.toLowerCase().trim();
                                      if (!q) return true;
                                      return (
                                        (emp.name || '').toLowerCase().includes(q) ||
                                        (emp.nik || '').toLowerCase().includes(q) ||
                                        (emp.jabatan || '').toLowerCase().includes(q) ||
                                        (emp.section || '').toLowerCase().includes(q)
                                      );
                                    });

                                  const picTooltip = val && val !== '-' 
                                    ? `PIC: ${val} (Klik untuk mengganti)` 
                                    : 'Belum ada PIC (Klik untuk menetapkan)';

                                  return (
                                    <td 
                                      key={colName} 
                                      style={getColStyle(colName)} 
                                      className={`relative border-r ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${fitPageMode ? 'px-2 py-2 overflow-visible' : 'px-3.5 py-2.5 whitespace-nowrap overflow-visible'}`}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <div 
                                        onClick={() => {
                                          setActiveInlinePicCell(isEditingPic ? null : { rowIndex: actualRowIndex, colName });
                                          setInlinePicSearch('');
                                        }}
                                        className="cursor-pointer inline-block group/pic transition-transform hover:scale-105"
                                        title={picTooltip}
                                      >
                                        {renderPicBadge(val, 'sm', false)}
                                      </div>

                                      {isEditingPic && (
                                        <div 
                                          className={`notion-pic-popover absolute left-0 top-full mt-1 w-72 max-h-72 overflow-y-auto rounded-xl shadow-2xl border p-2.5 z-50 text-left ${
                                            isNotionLight ? 'bg-white border-slate-300 text-slate-800' : 'bg-[#1e293b] border-slate-700 text-slate-100'
                                          }`}
                                        >
                                          {/* Header & Hapus/Kosongkan PIC Action */}
                                          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-700/60">
                                            <span className="text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400">
                                              Pengaturan PIC
                                            </span>
                                            {val && val !== '-' && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  handleUpdateCellDirect(actualRowIndex, colName, '-');
                                                  setActiveInlinePicCell(null);
                                                }}
                                                className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                                                title="Kosongkan atau hapus PIC ini"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                                <span>Hapus PIC</span>
                                              </button>
                                            )}
                                          </div>

                                          {/* Current Active PIC Chips with Remove X */}
                                          {val && val !== '-' && (() => {
                                            const activePicList = smartSplitPicString(val).filter(p => p && p !== '-');
                                            if (activePicList.length === 0) return null;
                                            return (
                                              <div className="mb-2">
                                                <div className="text-[10px] text-slate-400 mb-1 font-medium">PIC Terpilih:</div>
                                                <div className="flex flex-wrap gap-1">
                                                  {activePicList.map((pName) => (
                                                    <span 
                                                      key={pName} 
                                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20"
                                                    >
                                                      <span className="truncate max-w-[120px]">{pName}</span>
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          const rem = activePicList.filter(p => p.trim().toLowerCase() !== pName.trim().toLowerCase());
                                                          const nextVal = rem.length > 0 ? rem.join(', ') : '-';
                                                          handleUpdateCellDirect(actualRowIndex, colName, nextVal);
                                                        }}
                                                        className="hover:text-rose-500 rounded p-0.5 transition-colors cursor-pointer"
                                                        title={`Hapus ${pName}`}
                                                      >
                                                        <X className="w-3 h-3" />
                                                      </button>
                                                    </span>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          })()}

                                          {/* Search Box */}
                                          <div className="relative mb-2">
                                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
                                            <input
                                              type="text"
                                              autoFocus
                                              value={inlinePicSearch}
                                              onChange={(e) => setInlinePicSearch(e.target.value)}
                                              placeholder="Cari nama karyawan / NIK..."
                                              className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-lg border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                            />
                                          </div>

                                          {/* Employee Selection List */}
                                          <div className="space-y-1">
                                            {filteredEmployees.slice(0, 15).map((emp) => {
                                              const empName = emp.name || emp.nik;
                                              const isAlreadyPic = val && val !== '-' && smartSplitPicString(val).some(p => p.trim().toLowerCase() === empName.trim().toLowerCase());

                                              return (
                                                <div
                                                  key={emp.id || emp.nik}
                                                  className="flex items-center justify-between rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 px-2 py-1.5 transition-colors group/item"
                                                >
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      // Ganti PIC secara langsung
                                                      handleUpdateCellDirect(actualRowIndex, colName, empName);
                                                      setActiveInlinePicCell(null);
                                                    }}
                                                    className="flex-1 text-left min-w-0 pr-2 cursor-pointer"
                                                    title={`Ganti PIC menjadi ${empName}`}
                                                  >
                                                    <div className="flex items-center gap-1.5">
                                                      <span className={`font-medium text-xs truncate ${isAlreadyPic ? 'text-teal-600 dark:text-teal-400 font-semibold' : ''}`}>
                                                        {emp.name}
                                                      </span>
                                                      {isAlreadyPic && <Check className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 font-mono block truncate">
                                                      {emp.section || emp.nik} • Klik untuk ganti
                                                    </span>
                                                  </button>

                                                  {/* Tombol Tambah sebagai Co-PIC */}
                                                  {!isAlreadyPic && val && val !== '-' && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const existing = smartSplitPicString(val).filter(p => p && p !== '-');
                                                        const nextVal = `${existing.join(', ')}, ${empName}`;
                                                        handleUpdateCellDirect(actualRowIndex, colName, nextVal);
                                                      }}
                                                      className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10 transition-colors cursor-pointer"
                                                      title={`Tambah ${empName} sebagai Co-PIC bersama`}
                                                    >
                                                      + Co-PIC
                                                    </button>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                  );
                                }

                                // 6. Priority Column (Interactive Dropdown)
                                if (colLower.includes('priority') || colLower.includes('prioritas')) {
                                  if (isSubItem) {
                                    return (
                                      <td key={colName} style={getColStyle(colName)} className={`text-center font-mono border-r ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${fitPageMode ? 'px-1.5 py-2 text-xs' : 'px-3.5 py-2 text-[13px]'}`}>
                                        <span className="text-slate-400 font-mono">-</span>
                                      </td>
                                    );
                                  }

                                  return (
                                    <td key={colName} style={getColStyle(colName)} className={`border-r ${
                                      isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                    } ${fitPageMode ? 'px-2 py-2 overflow-hidden' : 'px-3.5 py-2.5 whitespace-nowrap'}`}>
                                      <NotionDropdownCell
                                        type="priority"
                                        value={val}
                                        compact={fitPageMode}
                                        onChange={(newVal) => handleUpdateCellDirect(actualRowIndex, colName, newVal)}
                                      />
                                    </td>
                                  );
                                }

                                // 7. Status Column (Interactive Dropdown & Progress Bar / Duration when Closed)
                                if (colLower.includes('status')) {
                                  // Jika baris adalah sub-kegiatan: status disatukan dengan kegiatan utama (tidak memunculkan dropdown status sendiri)
                                  if (isSubItem) {
                                    return (
                                      <td key={colName} style={getColStyle(colName)} className={`text-center font-mono border-r ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${fitPageMode ? 'px-1.5 py-2 text-xs' : 'px-4 py-2 text-[13px]'}`}>
                                        {isSubCompleted ? (
                                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Selesai</span>
                                          </span>
                                        ) : (
                                          <span className="text-slate-400 font-mono text-xs">-</span>
                                        )}
                                      </td>
                                    );
                                  }

                                  const ketVal = getRowVal(row, 'Keterangan');
                                  const taskProgress = parseTasklist(ketVal);
                                  const isClosed = (val || '').toUpperCase().includes('CLOSE') || 
                                                   (val || '').toUpperCase().includes('SELESAI') || 
                                                   (val || '').toUpperCase().includes('DONE');
                                  const durationInfo = isClosed ? getRowDurationInfo(row, taskProgress) : null;

                                  // Hitung progres sub-kegiatan milik kegiatan utama ini
                                  const hasSubs = Boolean(subItemsList && subItemsList.length > 0);
                                  const totalSubs = subItemsList ? subItemsList.length : 0;
                                  const completedSubs = subItemsList ? subItemsList.filter(s => isSubItemCompleted(s.row)).length : 0;
                                  const pctSubs = totalSubs > 0 ? Math.round((completedSubs / totalSubs) * 100) : 0;

                                  return (
                                    <td key={colName} style={getColStyle(colName)} className={`border-r ${
                                      isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                    } ${fitPageMode ? 'px-2 py-2 overflow-hidden' : 'px-4 py-2.5 whitespace-nowrap'}`}>
                                      <div className="flex flex-col items-start gap-1">
                                        <NotionDropdownCell
                                          type="status"
                                          value={val}
                                          compact={fitPageMode}
                                          onChange={(newVal) => handleUpdateCellDirect(actualRowIndex, colName, newVal)}
                                        />
                                        {/* Progress Sub-kegiatan bila ada */}
                                        {hasSubs && (
                                          <div className="w-full min-w-[95px] max-w-[130px] space-y-0.5 pt-0.5" title={`Progres Sub-kegiatan: ${completedSubs} dari ${totalSubs} selesai`}>
                                            <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                                              <span className={`font-bold ${
                                                completedSubs === totalSubs && totalSubs > 0
                                                  ? 'text-emerald-500 dark:text-emerald-400'
                                                  : completedSubs > 0
                                                  ? 'text-amber-500 dark:text-amber-400'
                                                  : 'text-teal-600 dark:text-teal-400'
                                              }`}>
                                                Sub: {completedSubs}/{totalSubs}
                                              </span>
                                              <span className="text-slate-400 font-bold">
                                                {pctSubs}%
                                              </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300/60 dark:border-slate-700/60">
                                              <div
                                                className={`h-full transition-all duration-300 ${
                                                  completedSubs === totalSubs && totalSubs > 0
                                                    ? 'bg-emerald-500'
                                                    : completedSubs > 0
                                                    ? 'bg-amber-500'
                                                    : 'bg-teal-500'
                                                }`}
                                                style={{ width: `${pctSubs}%` }}
                                              />
                                            </div>
                                          </div>
                                        )}

                                        {isClosed ? (
                                          <div 
                                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition-colors shadow-2xs select-none ${
                                              isNotionLight
                                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300/80 hover:bg-emerald-100'
                                                : 'bg-emerald-950/70 text-emerald-300 border-emerald-600/50 hover:bg-emerald-900/80'
                                            }`}
                                            title={durationInfo?.detail || `Durasi pengerjaan: ${durationInfo?.label}`}
                                          >
                                            <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                            <span className="truncate max-w-[130px]">{durationInfo?.label}</span>
                                          </div>
                                        ) : !hasSubs && taskProgress.hasTasklist ? (
                                          <div className="w-full min-w-[95px] max-w-[125px] space-y-0.5 pt-0.5">
                                            <div className="flex items-center justify-between text-[10px] font-mono leading-none">
                                              <span className={`font-bold ${
                                                taskProgress.isAllCompleted
                                                  ? 'text-emerald-500 dark:text-emerald-400'
                                                  : taskProgress.percentage > 0
                                                  ? 'text-amber-500 dark:text-amber-400'
                                                  : 'text-blue-500 dark:text-blue-400'
                                              }`}>
                                                {taskProgress.percentage}%
                                              </span>
                                              <span className="text-slate-400">
                                                {taskProgress.completed}/{taskProgress.total}
                                              </span>
                                            </div>
                                            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300/60 dark:border-slate-700/60">
                                              <div
                                                className={`h-full transition-all duration-300 ${
                                                  taskProgress.isAllCompleted
                                                    ? 'bg-emerald-500'
                                                    : taskProgress.percentage < 35
                                                    ? 'bg-amber-500'
                                                    : 'bg-teal-500'
                                                }`}
                                                style={{ width: `${taskProgress.percentage}%` }}
                                              />
                                            </div>
                                          </div>
                                        ) : null}
                                      </div>
                                    </td>
                                  );
                                }

                                // 8. Created Time Column (Tanggal saja, tanpa jam dan menit)
                                if (colLower.includes('created')) {
                                  const displayDate = (() => {
                                    if (!val || val === '-') return '-';
                                    const trimmed = String(val).trim();
                                    const match = trimmed.match(/^(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
                                    if (match) return match[1];
                                    if (trimmed.includes(' ') || trimmed.includes('T')) {
                                      return trimmed.split(/[ T]/)[0];
                                    }
                                    return trimmed;
                                  })();

                                  return (
                                    <td key={colName} style={{ ...getColStyle(colName), color: isNotionLight ? '#475569' : 'var(--text-muted, #94a3b8)' }} className={`font-sans border-r ${
                                      isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                    } ${
                                      fitPageMode ? 'px-2 py-2 text-xs truncate' : 'px-3.5 py-2.5 whitespace-nowrap text-[13px]'
                                    }`}>
                                      {displayDate !== '-' ? (
                                        <span className="inline-flex items-center gap-1.5 font-sans">
                                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span>{displayDate}</span>
                                        </span>
                                      ) : (
                                        <span className="font-mono text-slate-400">-</span>
                                      )}
                                    </td>
                                  );
                                }

                                // 9. Kategori Column
                                if (colLower.includes('kategori') || colLower.includes('category')) {
                                  if (isSubItem) {
                                    return (
                                      <td key={colName} style={getColStyle(colName)} className={`text-center font-mono border-r ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${fitPageMode ? 'px-1.5 py-2 text-xs' : 'px-3.5 py-2 text-[13px]'}`}>
                                        <span className="text-slate-400 font-mono">-</span>
                                      </td>
                                    );
                                  }

                                  return (
                                    <td key={colName} style={getColStyle(colName)} className={`border-r ${
                                      isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                    } ${fitPageMode ? 'px-2 py-2 truncate' : 'px-3.5 py-2.5 whitespace-nowrap'}`}>
                                      {val && val !== '-' ? (
                                        <span 
                                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border truncate ${
                                            isNotionLight
                                              ? 'bg-slate-100 border-slate-200 text-slate-700'
                                              : 'bg-[#1e293b] border-[#334155] text-[#cbd5e1]'
                                          }`}
                                        >
                                          {val}
                                        </span>
                                      ) : (
                                        <span className="font-mono text-slate-400">-</span>
                                      )}
                                    </td>
                                  );
                                }

                                // 10. Activity Column (Interactive Dropdown)
                                if (colLower.includes('activity') || colLower.includes('aktivitas')) {
                                  if (isSubItem) {
                                    return (
                                      <td key={colName} style={getColStyle(colName)} className={`text-center font-mono border-r ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${fitPageMode ? 'px-1.5 py-2 text-xs' : 'px-3.5 py-2 text-[13px]'}`}>
                                        <span className="text-slate-400 font-mono">-</span>
                                      </td>
                                    );
                                  }

                                  return (
                                    <td key={colName} style={getColStyle(colName)} className={`border-r ${
                                      isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                    } ${fitPageMode ? 'px-2 py-2 truncate' : 'px-3.5 py-2.5 whitespace-nowrap'}`}>
                                      <NotionDropdownCell
                                        type="activity"
                                        value={val}
                                        compact={fitPageMode}
                                        onChange={(newVal) => {
                                          if (newVal === val) return;
                                          handleUpdateCellDirect(actualRowIndex, colName, newVal);
                                        }}
                                      />
                                    </td>
                                  );
                                }

                                // 11. Period Column (Interactive Dropdown)
                                if (colLower.includes('period') || colLower.includes('periode')) {
                                  if (isSubItem) {
                                    return (
                                      <td key={colName} style={getColStyle(colName)} className={`text-center font-mono border-r ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${fitPageMode ? 'px-1.5 py-2 text-xs' : 'px-3.5 py-2 text-[13px]'}`}>
                                        <span className="text-slate-400 font-mono">-</span>
                                      </td>
                                    );
                                  }

                                  return (
                                    <td key={colName} style={getColStyle(colName)} className={`border-r ${
                                      isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                    } ${fitPageMode ? 'px-2 py-2 truncate' : 'px-3.5 py-2.5 whitespace-nowrap'}`}>
                                      <NotionDropdownCell
                                        type="period"
                                        value={val}
                                        compact={fitPageMode}
                                        onChange={(newVal) => handleUpdateCellDirect(actualRowIndex, colName, newVal)}
                                      />
                                    </td>
                                  );
                                }

                                // 12. Risk Assessment Column
                                if (colLower.includes('risk') || colLower.includes('resiko') || colLower.includes('assessment')) {
                                  if (isSubItem) {
                                    return (
                                      <td key={colName} style={getColStyle(colName)} className={`text-center font-mono border-r ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${fitPageMode ? 'px-1.5 py-2 text-xs' : 'px-3.5 py-2 text-[13px]'}`}>
                                        <span className="text-slate-400 font-mono">-</span>
                                      </td>
                                    );
                                  }

                                  return (
                                    <td key={colName} style={{ ...getColStyle(colName), color: isNotionLight ? '#334155' : 'var(--text-main, #cbd5e1)' }} className={`whitespace-nowrap border-r ${
                                      isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                    } ${
                                      fitPageMode ? 'px-2 py-2 text-xs' : 'px-3.5 py-2.5 text-[13px]'
                                    }`}>
                                      {val && val !== '-' ? val : <span className="font-mono text-slate-400">-</span>}
                                    </td>
                                  );
                                }

                                // Default custom column
                                return (
                                  <td key={colName} style={{ ...getColStyle(colName), color: isNotionLight ? '#334155' : 'var(--text-main, #cbd5e1)' }} className={`whitespace-nowrap border-r ${
                                    isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                  } ${
                                    fitPageMode ? 'px-2 py-2 text-xs' : 'px-3.5 py-2.5 text-[13px]'
                                  }`}>
                                    {val && val !== '-' ? val : <span className="font-mono text-slate-400">-</span>}
                                  </td>
                                );
                              })}

                              {/* Spacer cell for Add Column (+) header */}
                              <td className={`w-10 px-1 py-2 text-center border-r ${
                                isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                              }`} />

                               {/* Row Action Buttons - Menu Titik Tiga */}
                               <td className={`text-center whitespace-nowrap relative notion-row-action-menu-container ${fitPageMode ? 'px-1 py-2' : 'px-2 py-2.5'}`} onClick={(e) => e.stopPropagation()}>
                                 {(() => {
                                   const rowActionKey = `${actualRowIndex}-${isSubItem ? 'sub' : 'parent'}`;
                                   return (
                                     <div className="relative inline-block">
                                       <button
                                         type="button"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setActiveActionMenuRowIndex(activeActionMenuRowIndex === rowActionKey ? null : rowActionKey);
                                         }}
                                         className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-300 text-black dark:text-black hover:text-black transition-colors cursor-pointer"
                                         title="Pilihan Aksi"
                                       >
                                         <MoreVertical className="w-4 h-4 text-black dark:text-black" />
                                       </button>

                                       {activeActionMenuRowIndex === rowActionKey && (
                                     <div 
                                       className={`absolute right-0 top-full mt-1 w-52 rounded-xl shadow-2xl border p-1 z-50 text-left transition-all ${
                                         isNotionLight ? 'bg-white border-slate-200 text-slate-800 shadow-slate-300/60' : 'bg-[#202020] border-slate-700 text-slate-100 shadow-black/80'
                                       }`}
                                       onClick={(e) => e.stopPropagation()}
                                     >
                                       {!isSubItem && (
                                         <button
                                           type="button"
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             setExpandedParents(prev => ({ ...prev, [actualRowIndex]: true }));
                                             setCreatingSubItemForParent(actualRowIndex);
                                             setNewSubItemTitle('');
                                             setActiveActionMenuRowIndex(null);
                                           }}
                                           className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-400 font-medium transition-colors cursor-pointer"
                                           title="Tambah Sub-kegiatan di bawah kegiatan ini"
                                         >
                                           <Plus className="w-3.5 h-3.5 shrink-0 text-teal-500" />
                                           <span>Tambah Sub-kegiatan</span>
                                         </button>
                                       )}
                                       <button
                                         type="button"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           setIsSelectionModeActive(true);
                                           setSelectedRowIndices(prev => {
                                             const next = new Set(prev);
                                             if (next.has(actualRowIndex)) {
                                               next.delete(actualRowIndex);
                                               if (next.size === 0) setIsSelectionModeActive(false);
                                             } else {
                                               next.add(actualRowIndex);
                                             }
                                             return next;
                                           });
                                           setActiveActionMenuRowIndex(null);
                                         }}
                                         className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
                                         title="Pilih baris kegiatan ini (Select)"
                                       >
                                         <CheckSquare className="w-3.5 h-3.5 shrink-0 text-teal-500" />
                                         <span>{selectedRowIndices.has(actualRowIndex) ? 'Batal Pilih Baris' : 'Pilih Baris (Select)'}</span>
                                       </button>
                                       <button
                                         type="button"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           handleOpenEditModal(row, actualRowIndex, e);
                                           setActiveActionMenuRowIndex(null);
                                         }}
                                         className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-medium transition-colors cursor-pointer"
                                         title="Edit Data Kegiatan Ini"
                                       >
                                         <Edit2 className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                         <span>Edit Data Kegiatan</span>
                                       </button>
                                       <button
                                         type="button"
                                         onClick={(e) => {
                                           e.stopPropagation();
                                           handleDeleteRow(actualRowIndex, e);
                                           setActiveActionMenuRowIndex(null);
                                         }}
                                         className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-medium transition-colors cursor-pointer"
                                         title={isSubItem ? "Hapus Sub-kegiatan Ini" : "Hapus Baris Ini"}
                                       >
                                         <Trash2 className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                                         <span>{isSubItem ? "Hapus Sub-kegiatan" : "Hapus Baris Ini"}</span>
                                       </button>
                                     </div>
                                   )}
                                 </div>
                               );
                             })()}
                           </td>
                         </tr>
                          );
                        };

                        return hierarchicalItems.map((hItem) => {
                          const parentRow = hItem.parentRow;
                          const parentIndex = hItem.parentIndex;
                          const parentKey = parentRow.id || `${parentIndex}-${parentRow['Jenis kegiatan'] || ''}`;
                          const isParentExpanded = Boolean(expandedParents[parentIndex] || expandedParents[parentKey]);

                          return (
                            <React.Fragment key={`parent-${parentKey}`}>
                              {/* Render Parent Row */}
                              {renderRowItem(
                                parentRow,
                                parentIndex,
                                false,
                                hItem.subItems.length > 0,
                                isParentExpanded,
                                hItem.subItems,
                                (e) => {
                                  e.stopPropagation();
                                  setExpandedParents(prev => ({
                                    ...prev,
                                    [parentIndex]: !isParentExpanded,
                                    [parentKey]: !isParentExpanded
                                  }));
                                }
                              )}

                              {/* Render Sub-items if Parent is expanded */}
                              {isParentExpanded && hItem.subItems.map((sub) => {
                                const subKey = sub.row.id || `${sub.actualIndex}-${sub.row['Jenis kegiatan'] || ''}`;
                                const isSubExpanded = Boolean(expandedParents[`sub-${sub.actualIndex}`] || expandedParents[`sub-${subKey}`]);
                                return (
                                  <React.Fragment key={`sub-${subKey}`}>
                                    {renderRowItem(
                                      sub.row, 
                                      sub.actualIndex, 
                                      true, 
                                      false, 
                                      isSubExpanded, 
                                      undefined,
                                      (e) => {
                                        e.stopPropagation();
                                        setExpandedParents(prev => ({
                                          ...prev,
                                          [`sub-${sub.actualIndex}`]: !isSubExpanded,
                                          [`sub-${subKey}`]: !isSubExpanded
                                        }));
                                      }
                                    )}
                                  </React.Fragment>
                                );
                              })}

                              {/* + New sub-item row if Parent is expanded */}
                              {isParentExpanded && (
                                <tr
                                  key={`new-sub-row-${parentKey}`}
                                  className={`transition-colors border-b select-none ${
                                    isNotionLight
                                      ? 'hover:bg-[#fbfbfa]/80 bg-white/40 border-[#e9e9e8]'
                                      : 'hover:bg-slate-800/30 bg-transparent border-[#2d2d2d]'
                                  }`}
                                >
                                  {(isSelectionModeActive || selectedRowIndices.size > 0) && (
                                    <td className={`px-2 py-1 text-center border-r ${isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'}`} />
                                  )}
                                  <td className={`px-3 py-1 text-center font-mono text-slate-400 text-xs border-r ${isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'}`} />
                                  <td colSpan={displayHeaders.length + 1} className="px-4 py-2">
                                    {creatingSubItemForParent === parentIndex ? (
                                      <div className="flex items-center gap-2 pl-6" onClick={(e) => e.stopPropagation()}>
                                        <span className="text-slate-400 text-xs select-none">📄</span>
                                        <input
                                          type="text"
                                          autoFocus
                                          value={newSubItemTitle}
                                          onChange={(e) => setNewSubItemTitle(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.preventDefault();
                                              handleAddSubItem(parentRow, newSubItemTitle);
                                            } else if (e.key === 'Escape') {
                                              setCreatingSubItemForParent(null);
                                              setNewSubItemTitle('');
                                            }
                                          }}
                                          placeholder="Nama sub-kegiatan baru... (Tekan Enter)"
                                          className={`px-3 py-1.5 text-[13px] rounded-lg border outline-none font-sans w-72 max-w-sm ${
                                            isNotionLight
                                              ? 'bg-white border-teal-500 text-slate-900 shadow-xs ring-1 ring-teal-500/20'
                                              : 'bg-[#181818] border-teal-500 text-slate-100 shadow-xs ring-1 ring-teal-500/20'
                                          }`}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleAddSubItem(parentIndex, newSubItemTitle)}
                                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                                        >
                                          Simpan
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setCreatingSubItemForParent(null);
                                            setNewSubItemTitle('');
                                          }}
                                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                                        >
                                          Batal
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="pl-6">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCreatingSubItemForParent(parentIndex);
                                            setNewSubItemTitle('');
                                          }}
                                          className="inline-flex items-center gap-1.5 py-1 px-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors cursor-pointer rounded hover:bg-slate-100 dark:hover:bg-slate-800/60 group/subbtn"
                                        >
                                          <Plus className="w-3.5 h-3.5 text-slate-400 group-hover/subbtn:text-teal-500 transition-colors" />
                                          <span className="text-xs">New sub-item</span>
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        });
                      })()}

                      {/* + New page button at bottom of group */}
                      {!isCollapsed && (
                        <tr
                          onClick={() => handleOpenAddModal()}
                          className={`cursor-pointer transition-colors border-b select-none ${
                            isNotionLight
                              ? 'hover:bg-[#f7f7f5] text-slate-600 border-[#e9e9e8]'
                              : 'hover:bg-slate-800/40 text-slate-400 border-[#2d2d2d]'
                          }`}
                        >
                          <td colSpan={displayHeaders.length + 3} className="px-3.5 py-2.5 text-xs">
                            <div className="flex items-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                              <Plus className="w-4 h-4 text-slate-500" />
                              <span className="font-semibold text-xs tracking-wide">New page</span>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Bottom Table Add Row Shortcut & Select All (Natural at end of table) */}
          <div 
            className={`p-3 border-t flex items-center justify-between transition-colors ${
              isNotionLight ? 'bg-[#fafafa] border-[#e9e9e8] text-slate-700' : 'bg-[#181818] border-[#2d2d2d] text-slate-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenAddModal}
                className={`text-xs font-semibold flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-all cursor-pointer ${
                  isNotionLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60' : 'text-slate-400 hover:text-teal-400 hover:bg-slate-800'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tambah Baris Kegiatan Baru</span>
              </button>
              {localRows.length > 0 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className={`text-xs font-medium flex items-center gap-1 py-1 px-2 rounded-lg transition-all cursor-pointer ${
                    isNotionLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60' : 'text-slate-400 hover:text-teal-400 hover:bg-slate-800'
                  }`}
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{isAllSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selectedRowIndices.size > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelectedRows}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1 transition-all cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus Terpilih ({selectedRowIndices.size})</span>
                </button>
              )}
              <span className={`text-[11px] font-mono ${isNotionLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Total {localRows.length} baris tercatat {selectedRowIndices.size > 0 && `(${selectedRowIndices.size} dipilih)`}
              </span>
            </div>
          </div>

          {/* Floating Bulk Selection Action Bar */}
          {selectedRowIndices.size > 0 && (
            <div 
              className="sticky bottom-3 z-40 mx-4 my-2 p-3 px-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-200"
              style={{
                backgroundColor: 'rgba(24, 24, 27, 0.96)',
                borderColor: 'rgba(239, 68, 68, 0.6)',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-100 flex items-center gap-2">
                    <span>
                      {selectedRowIndices.size === localRows.length
                        ? `Semua ${localRows.length} topik dipilih`
                        : `${selectedRowIndices.size} dari ${localRows.length} topik dipilih`}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-red-500/20 text-red-300 font-mono">
                      Pilihan Aktif
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {selectedRowIndices.size === localRows.length
                      ? 'Klik Hapus untuk membersihkan semua topik di tabel ini sekaligus.'
                      : 'Hapus topik yang dipilih atau pilih semua topik untuk membersihkan tabel.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                {selectedRowIndices.size < localRows.length && (
                  <button
                    type="button"
                    onClick={handleSelectAllInPage}
                    className="px-3 py-1.5 rounded-xl border text-xs font-medium hover:bg-slate-800 transition-colors cursor-pointer text-teal-400 border-teal-500/30"
                  >
                    Pilih Semua ({localRows.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleDeleteSelectedRows}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50 active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {selectedRowIndices.size === localRows.length
                      ? `Hapus Semua (${selectedRowIndices.size})`
                      : `Hapus Terpilih (${selectedRowIndices.size})`}
                  </span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Floating Horizontal Viewport Scrollbar (Pinned to bottom of viewport, transparent when idle, appears on bottom hover) */}
      {viewMode === 'table' && hasHorizontalOverflow && isTableVisible && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 group/floating-scroll py-1 px-4 flex justify-center pointer-events-none transition-all duration-300"
          style={{ zIndex: 45 }}
        >
          <div
            ref={floatingScrollRef}
            onScroll={handleFloatingScroll}
            className={`w-full max-w-[1700px] overflow-x-auto overflow-y-hidden transition-all duration-300 pointer-events-auto opacity-0 group-hover/floating-scroll:opacity-100 hover:opacity-100 rounded-full ${
              isNotionLight ? 'notion-floating-scroll-light' : 'notion-floating-scroll-dark'
            }`}
            style={{
              height: '14px',
              backgroundColor: 'transparent',
            }}
            title="Scroll horizontal tabel (Geser kanan/kiri)"
          >
            <div style={{ width: `${tableScrollWidth}px`, height: '1px' }} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BOARD VIEW (Kanban by Status)                                          */}
      {/* ========================================================================= */}
      {viewMode === 'board' && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" style={{ backgroundColor: 'var(--bg-main, #141414)' }}>
          {['Open', 'On Progress', 'Closed', 'Canceled'].map((laneStatus) => {
            const laneRows = filteredRows.filter((r) => {
              const s = (getRowVal(r, 'Status') || '').toUpperCase();
              if (laneStatus === 'Open') return (s.includes('OPEN') || s.includes('BARU') || !s) && !s.includes('CANCEL') && !s.includes('PROGRESS') && !s.includes('CLOSE');
              if (laneStatus === 'On Progress') return s.includes('PROGRESS') || s.includes('PROSES');
              if (laneStatus === 'Closed') return s.includes('CLOSE') || s.includes('SELESAI') || s.includes('DONE') || s.includes('RESOLVED');
              if (laneStatus === 'Canceled') return s.includes('CANCEL') || s.includes('BATAL');
              return false;
            });

            return (
              <div 
                key={laneStatus} 
                className="border rounded-xl p-3 flex flex-col min-h-[350px]"
                style={{
                  backgroundColor: 'var(--card-bg, #1e1e1e)',
                  borderColor: 'var(--border-main, #334155)'
                }}
              >
                <div 
                  className="flex items-center justify-between pb-2 mb-3 border-b"
                  style={{ borderColor: 'var(--border-main, #334155)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      laneStatus === 'Open' 
                        ? 'bg-blue-400' 
                        : laneStatus === 'On Progress' 
                        ? 'bg-amber-400' 
                        : laneStatus === 'Closed' 
                        ? 'bg-emerald-400' 
                        : 'bg-rose-400'
                    }`} />
                    <h4 className="font-bold text-xs uppercase tracking-wider" style={{ color: 'var(--text-main, #f1f5f9)' }}>{laneStatus}</h4>
                  </div>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full font-mono border"
                    style={{
                      backgroundColor: 'var(--input-bg, #161616)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-muted, #94a3b8)'
                    }}
                  >
                    {laneRows.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px]">
                  {laneRows.map((row, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSelectedRow(row);
                        setModalTab('details');
                      }}
                      className="p-3 border rounded-xl shadow-sm cursor-pointer transition-all hover:border-teal-500/50 space-y-2 group"
                      style={{
                        backgroundColor: 'var(--input-bg, #242424)',
                        borderColor: 'var(--border-main, #334155)'
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h5 
                          className="font-semibold text-xs group-hover:text-teal-400 leading-snug"
                          style={{ color: 'var(--text-main, #f1f5f9)' }}
                        >
                          {getRowVal(row, 'Jenis kegiatan') || 'Tanpa Judul'}
                        </h5>
                        {renderPriorityBadge(getRowVal(row, 'Priority'))}
                      </div>

                      {getRowVal(row, 'Keterangan') && (
                        <p className="text-[11px] line-clamp-2 leading-relaxed" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                          {getRowVal(row, 'Keterangan')}
                        </p>
                      )}

                      <div 
                        className="pt-2 border-t flex items-center justify-between text-[10px]"
                        style={{
                          borderColor: 'var(--border-main, #334155)',
                          color: 'var(--text-muted, #94a3b8)'
                        }}
                      >
                        {renderPicBadge(getRowVal(row, 'PIC'))}
                        <span className="font-mono">{getRowVal(row, 'period') || getRowVal(row, 'Created Time')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CARDS / LIST VIEW                                                      */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5" style={{ backgroundColor: 'var(--bg-main, #141414)' }}>
          {filteredRows.map((row, idx) => (
            <div
              key={idx}
              onClick={() => {
                setSelectedRow(row);
                setModalTab('details');
              }}
              className="p-4 border hover:border-teal-500/60 rounded-2xl shadow-md cursor-pointer transition-all space-y-3 flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--card-bg, #1f1f1f)',
                borderColor: 'var(--border-main, #334155)'
              }}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span 
                    className="text-[10px] font-mono px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: 'var(--input-bg, #161616)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-muted, #94a3b8)'
                    }}
                  >
                    #{getRowVal(row, 'number') || idx + 1}
                  </span>
                  {renderStatusBadge(getRowVal(row, 'Status'))}
                </div>

                <h4 className="font-bold text-sm leading-snug" style={{ color: 'var(--text-main, #f1f5f9)' }}>
                  {getRowVal(row, 'Jenis kegiatan') || 'Tanpa Judul'}
                </h4>

                {getRowVal(row, 'Keterangan') && (
                  <p className="text-xs line-clamp-3 leading-relaxed" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                    {getRowVal(row, 'Keterangan')}
                  </p>
                )}
              </div>

              <div 
                className="pt-3 border-t flex items-center justify-between text-xs"
                style={{
                  borderColor: 'var(--border-main, #334155)',
                  color: 'var(--text-muted, #94a3b8)'
                }}
              >
                {renderPicBadge(getRowVal(row, 'PIC'))}
                {renderPriorityBadge(getRowVal(row, 'Priority'))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PILIH TUJUAN PEMINDAHAN TOPIK (NEW TOPIC vs EXISTING TOPIC)        */}
      {/* ========================================================================= */}
      {moveModalData && (
        <div 
          className="fixed inset-0 z-[160] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
          onClick={() => !isMovingTopic && setMoveModalData(null)}
        >
          <div 
            className="w-full max-w-lg border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: 'var(--card-bg, #1e1e1e)',
              borderColor: 'var(--border-main, #334155)',
              color: 'var(--text-main, #cbd5e1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="p-4 border-b flex items-center justify-between shrink-0"
              style={{
                backgroundColor: 'var(--input-bg, #252525)',
                borderColor: 'var(--border-main, #334155)'
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-600/30 border border-teal-500/50 text-teal-300 flex items-center justify-center font-bold">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--text-main, #f1f5f9)' }}>
                    Pindahkan ke {moveModalData.targetPost.title}
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                    Pilih apakah ingin membuat topik baru atau memasukkan ke topik yang sudah ada
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setMoveModalData(null)}
                disabled={isMovingTopic}
                className="p-1.5 rounded-full hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50"
                style={{ color: 'var(--text-muted, #94a3b8)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
              {/* Info Topik Asal */}
              <div 
                className="p-3 rounded-2xl border text-xs space-y-1"
                style={{
                  backgroundColor: 'var(--input-bg, #161616)',
                  borderColor: 'var(--border-main, #2d3748)'
                }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Topik Yang Dipindahkan:</div>
                <div className="font-bold text-sm" style={{ color: 'var(--text-main, #f8fafc)' }}>
                  {getRowVal(moveModalData.sourceRow, 'Jenis kegiatan') || 'Kegiatan'}
                </div>
                {moveModalData.targetSubPeriod && (
                  <div className="text-[11px] flex items-center gap-1.5 pt-1 text-amber-300">
                    <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Data & komentar otomatis menjadi sub-topik: <strong>{moveModalData.targetSubPeriod}</strong></span>
                  </div>
                )}
              </div>

              {/* Pilihan 1: Masukkan ke Topik yang Sudah Ada (Existing Topic) */}
              <div 
                onClick={() => {
                  if (moveModalData.existingTopicsInTarget.length > 0) {
                    setMoveMode('existing_topic');
                  }
                }}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  moveMode === 'existing_topic'
                    ? 'border-teal-500 bg-teal-500/10 shadow-md'
                    : 'border-slate-700 hover:border-slate-600 bg-transparent opacity-80 hover:opacity-100'
                } ${moveModalData.existingTopicsInTarget.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="moveMode"
                    value="existing_topic"
                    checked={moveMode === 'existing_topic'}
                    disabled={moveModalData.existingTopicsInTarget.length === 0}
                    onChange={() => setMoveMode('existing_topic')}
                    className="mt-1 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>🔗 Masukkan ke Topik yang Sudah Ada</span>
                        <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                          {moveModalData.existingTopicsInTarget.length} Topik Tersedia
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Topik ini tidak akan membuat baris baru. Data dan diskusinya akan digabungkan ke bawah topik yang dipilih di halaman tujuan {moveModalData.targetSubPeriod ? `(Sub-topik: ${moveModalData.targetSubPeriod})` : ''}.
                      </p>
                    </div>

                    {moveMode === 'existing_topic' && (
                      <div className="pt-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Pilih Topik Tujuan di {moveModalData.targetPost.title}:
                        </label>
                        <select
                          value={selectedExistingTopic}
                          onChange={(e) => setSelectedExistingTopic(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-xs font-semibold focus:border-teal-500 outline-none"
                        >
                          {moveModalData.existingTopicsInTarget.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Pilihan 2: Buat Topik Baru (New Topic) */}
              <div 
                onClick={() => setMoveMode('new_topic')}
                className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer ${
                  moveMode === 'new_topic'
                    ? 'border-teal-500 bg-teal-500/10 shadow-md'
                    : 'border-slate-700 hover:border-slate-600 bg-transparent opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="moveMode"
                    value="new_topic"
                    checked={moveMode === 'new_topic'}
                    onChange={() => setMoveMode('new_topic')}
                    className="mt-1 text-teal-600 focus:ring-teal-500 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>➕ Buat Topik Baru di Halaman Tujuan</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Membuat baris kegiatan baru tersendiri di tabel {moveModalData.targetPost.title}.
                      </p>
                    </div>

                    {moveMode === 'new_topic' && (
                      <div className="pt-1">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Nama Judul Kegiatan di Halaman Tujuan:
                        </label>
                        <input
                          type="text"
                          value={customNewTopicTitle}
                          onChange={(e) => setCustomNewTopicTitle(e.target.value)}
                          placeholder="Masukkan judul kegiatan..."
                          className="w-full p-2.5 rounded-xl border border-slate-700 bg-slate-900 text-white text-xs font-semibold focus:border-teal-500 outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div 
              className="p-4 border-t flex items-center justify-end gap-2.5 shrink-0"
              style={{
                backgroundColor: 'var(--input-bg, #252525)',
                borderColor: 'var(--border-main, #334155)'
              }}
            >
              <button
                type="button"
                onClick={() => setMoveModalData(null)}
                disabled={isMovingTopic}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleExecuteMoveTopic}
                disabled={isMovingTopic || (moveMode === 'existing_topic' && !selectedExistingTopic)}
                className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isMovingTopic ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memindahkan...</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Pindahkan Topik</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: LAST SUBTASK COMPLETED WARNING (CLOSING MAIN TASK)                */}
      {/* ========================================================================= */}
      {lastSubtaskConfirmModal && lastSubtaskConfirmModal.isOpen && (
        <div 
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setLastSubtaskConfirmModal(null)}
        >
          <div 
            className="w-full max-w-md border rounded-2xl shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: isNotionLight ? '#ffffff' : '#1e1e1e',
              borderColor: isNotionLight ? '#e2e8f0' : '#334155',
              color: isNotionLight ? '#0f172a' : '#f8fafc'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${
                isNotionLight 
                  ? 'bg-amber-50 border border-amber-200 text-amber-600' 
                  : 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
              }`}>
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-bold leading-snug ${
                  isNotionLight ? 'text-slate-900' : 'text-slate-100'
                }`}>
                  Selesaikan Subtask Terakhir?
                </h3>
                <p className={`text-xs mt-2 leading-relaxed ${
                  isNotionLight ? 'text-slate-600' : 'text-slate-300'
                }`}>
                  Subtask ini merupakan tugas terakhir untuk topik <strong className="font-semibold text-teal-600 dark:text-teal-400">"{lastSubtaskConfirmModal.topicTitle}"</strong>.
                </p>
                <div className={`mt-3 p-3 rounded-xl border text-xs leading-relaxed ${
                  isNotionLight 
                    ? 'bg-amber-50/80 border-amber-200/80 text-amber-900' 
                    : 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                }`}>
                  ⚠️ <strong>Perhatian:</strong> Jika subtask ini diceklis, seluruh subtask telah rampung (100%) dan status kegiatan utama otomatis berubah menjadi <strong>Closed</strong>. Topik ini akan <strong>hilang dari filter Pekerjaan Aktif</strong>.
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setLastSubtaskConfirmModal(null)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                  isNotionLight 
                    ? 'border-slate-200 hover:bg-slate-100 text-slate-700' 
                    : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const cb = lastSubtaskConfirmModal.onConfirm;
                  setLastSubtaskConfirmModal(null);
                  cb();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-all shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Ya, Selesaikan & Tutup Task</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ROUTINE TASK COMPLETED -> CREATE NEXT PERIOD CONFIRMATION         */}
      {/* ========================================================================= */}
      {routineCompletionModal && (
        <div 
          className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
          onClick={() => setRoutineCompletionModal(null)}
        >
          <div 
            className="w-full max-w-lg border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: 'var(--card-bg, #1a1a1a)',
              borderColor: 'var(--border-main, #334155)',
              color: 'var(--text-main, #cbd5e1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div 
              className="p-5 border-b flex items-center justify-between"
              style={{
                backgroundColor: 'var(--input-bg, #222222)',
                borderColor: 'var(--border-main, #334155)'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-400 flex items-center justify-center shadow-inner">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg flex items-center gap-2" style={{ color: 'var(--text-main, #f1f5f9)' }}>
                    <span>Routine Task Selesai!</span>
                    <span className="text-sm">🎉</span>
                  </h3>
                  <p className="text-xs text-teal-400 font-medium">
                    Semua checklist subtask telah 100% selesai
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setRoutineCompletionModal(null)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-teal-950/30 border border-teal-500/30 space-y-2">
                <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider block">
                  Topik Kegiatan
                </span>
                <h4 className="font-bold text-sm sm:text-base text-white">
                  {getRowVal(routineCompletionModal.row, 'Jenis kegiatan') || 'Kegiatan Rutin'}
                </h4>
                <div className="flex items-center gap-2 text-[11px] text-teal-200">
                  <span>Periode saat ini:</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/40 font-mono font-bold">
                    {routineCompletionModal.currentPeriod}
                  </span>
                  <span className="text-slate-500">•</span>
                  <span className="text-emerald-400 font-semibold">100% Selesai [Closed]</span>
                </div>
              </div>

              <div className="text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-main, #e2e8f0)' }}>
                Apakah Anda ingin membuat kembali task routine ini untuk periode selanjutnya?
              </div>

              {/* Next Period Preview Card */}
              <div 
                className="p-3.5 rounded-2xl border space-y-2"
                style={{
                  backgroundColor: 'var(--input-bg, #141414)',
                  borderColor: 'var(--border-main, #334155)'
                }}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Rencana Periode Baru
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Sub-Judul Periode Baru:</span>
                    <span className="font-mono font-bold text-teal-400 text-sm">
                      {routineCompletionModal.nextPeriod}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Target Selesai Default:</span>
                    <span className="font-mono font-bold text-teal-300 text-sm">
                      {routineCompletionModal.nextTargetDate}
                    </span>
                  </div>
                </div>
                <div className="pt-2 border-t text-[11px] text-slate-400 space-y-1" style={{ borderColor: 'var(--border-main, #262626)' }}>
                  <div>✓ Daftar subtask sama, semua checklist direset belum dicentang (0%)</div>
                  <div>✓ Target selesai default disesuaikan untuk periode selanjutnya</div>
                  <div>✓ Ruang diskusi & dokumentasi terpisah untuk periode {routineCompletionModal.nextPeriod}</div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div 
              className="p-4 border-t flex items-center justify-end gap-2.5"
              style={{
                backgroundColor: 'var(--input-bg, #222222)',
                borderColor: 'var(--border-main, #334155)'
              }}
            >
              <button
                type="button"
                onClick={() => setRoutineCompletionModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
              >
                Tidak, Selesai
              </button>
              <button
                type="button"
                onClick={handleConfirmNextPeriod}
                className="px-5 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-950/50 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ya, Buka Periode {routineCompletionModal.nextPeriod}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: ADD / EDIT ROW FORM                                             */}
      {/* ========================================================================= */}
      {showRowModal && (
        <div 
          className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150"
          onClick={() => setShowRowModal(false)}
        >
          <div 
            className="w-full max-w-xl max-h-[90vh] border rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: 'var(--card-bg, #1e1e1e)',
              borderColor: 'var(--border-main, #334155)',
              color: 'var(--text-main, #cbd5e1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div 
              className="p-4 border-b flex items-center justify-between shrink-0"
              style={{
                backgroundColor: 'var(--input-bg, #252525)',
                borderColor: 'var(--border-main, #334155)'
              }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-600/30 border border-teal-500/50 text-teal-300 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base" style={{ color: 'var(--text-main, #f1f5f9)' }}>
                    {editingRowIndex === null ? 'Tambah Data Kegiatan Baru' : 'Edit Data Kegiatan'}
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                    Struktur kolom sinkron database Weekly Notion
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowRowModal(false)}
                className="p-1.5 rounded-full hover:opacity-80 transition-opacity"
                style={{ color: 'var(--text-muted, #94a3b8)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRow} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* 1. Jenis kegiatan */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                    Jenis Kegiatan <span className="text-rose-500">*</span>
                  </label>
                  {(rowFormData['Jenis kegiatan'] || rowFormData['Jenis Kegiatan']) && (
                    <span className="text-[10px] text-teal-400 font-sans">
                      Blok teks untuk styling
                    </span>
                  )}
                </div>

                <div className="relative">
                  {activeModalSelection?.field === 'jenisKegiatan' && (
                    <FloatingSelectionToolbar
                      onFormat={(action) => handleApplyModalFormat('jenisKegiatan', action)}
                      onClose={() => setActiveModalSelection(null)}
                    />
                  )}
                  <input
                    type="text"
                    required
                    value={rowFormData['Jenis kegiatan'] || rowFormData['Jenis Kegiatan'] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRowFormData({ 
                        ...rowFormData, 
                        'Jenis kegiatan': val,
                        'Jenis Kegiatan': val 
                      });
                    }}
                    onSelect={(e) => handleModalSelectText(e, 'jenisKegiatan')}
                    onKeyUp={(e) => handleModalSelectText(e, 'jenisKegiatan')}
                    onMouseUp={(e) => handleModalSelectText(e, 'jenisKegiatan')}
                    className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none font-medium text-xs shadow-2xs"
                    style={{
                      backgroundColor: 'var(--input-bg, #141414)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-main, #f1f5f9)'
                    }}
                    placeholder="Contoh: Kalibrasi XRF, Analisis Sampel Harian, dsb..."
                  />
                </div>

                {/* Live visual preview if formatting tags or colors exist */}
                {(() => {
                  const val = rowFormData['Jenis kegiatan'] || rowFormData['Jenis Kegiatan'] || '';
                  const hasFormat = /(\*\*|\*|~~|`|\[color|\[biru|\[merah|\[hijau|\[kuning|\[ungu|\[abu|\[orange|\[pink)/i.test(val);
                  if (!hasFormat) return null;
                  return (
                    <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px] flex items-center gap-1.5">
                      <span className="text-[9.5px] uppercase font-bold text-teal-600 dark:text-teal-400 shrink-0">Pratinjau:</span>
                      <span 
                        className="truncate text-slate-900 dark:text-slate-100 font-medium"
                        dangerouslySetInnerHTML={{ __html: formatColorTagsToHtml(markdownToVisualHtml(val)) }}
                      />
                    </div>
                  );
                })()}
              </div>

              {/* 2. Number & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Number */}
                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1 text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                    Number / No
                  </label>
                  <input
                    type="text"
                    value={rowFormData['number'] || ''}
                    onChange={(e) => setRowFormData({ ...rowFormData, number: e.target.value })}
                    className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg, #141414)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-main, #f1f5f9)'
                    }}
                    placeholder="1"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1 text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                    Priority
                  </label>
                  <select
                    value={rowFormData['Priority'] || 'Normal'}
                    onChange={(e) => setRowFormData({ ...rowFormData, Priority: e.target.value })}
                    className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none cursor-pointer text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg, #141414)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-main, #f1f5f9)'
                    }}
                  >
                    <option value="Urgent">🚨 Urgent</option>
                    <option value="High">🔴 High</option>
                    <option value="Medium">🔵 Medium</option>
                    <option value="Normal">🟢 Normal</option>
                    <option value="Low">⚪ Low</option>
                  </select>
                </div>
              </div>

              {/* 3. Keterangan / Catatan Ringkas */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                    Keterangan / Catatan Ringkas
                  </label>
                  <span className="text-[10px] text-slate-400 font-sans">
                    (Opsional - blok teks untuk styling)
                  </span>
                </div>

                <div className="relative">
                  {activeModalSelection?.field === 'keterangan' && (
                    <FloatingSelectionToolbar
                      onFormat={(action) => handleApplyModalFormat('keterangan', action)}
                      onClose={() => setActiveModalSelection(null)}
                    />
                  )}
                  <textarea
                    rows={3}
                    value={rowFormData['Keterangan'] || ''}
                    onChange={(e) => setRowFormData({ ...rowFormData, Keterangan: e.target.value })}
                    onSelect={(e) => handleModalSelectText(e, 'keterangan')}
                    onKeyUp={(e) => handleModalSelectText(e, 'keterangan')}
                    onMouseUp={(e) => handleModalSelectText(e, 'keterangan')}
                    className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none text-xs leading-relaxed resize-y"
                    style={{
                      backgroundColor: 'var(--input-bg, #141414)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-main, #f1f5f9)'
                    }}
                    placeholder="Catatan, rincian teknis, parameter khusus, atau instruksi kerja..."
                  />
                </div>

                {/* Live visual preview if formatting tags or colors exist */}
                {(() => {
                  const val = rowFormData['Keterangan'] || '';
                  const hasFormat = /(\*\*|\*|~~|`|\[color|\[biru|\[merah|\[hijau|\[kuning|\[ungu|\[abu|\[orange|\[pink)/i.test(val);
                  if (!hasFormat) return null;
                  return (
                    <div className="mt-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-[11px]">
                      <span className="text-[9.5px] uppercase font-bold text-teal-600 dark:text-teal-400 block mb-0.5">Pratinjau Keterangan:</span>
                      <div 
                        className="line-clamp-3 leading-relaxed text-slate-900 dark:text-slate-100 font-medium"
                        dangerouslySetInnerHTML={{ __html: formatColorTagsToHtml(markdownToVisualHtml(val)) }}
                      />
                    </div>
                  );
                })()}
              </div>

              {/* 4. PIC & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* PIC Field with Searchable Suggestion Dropdown */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                      PIC (Penanggung Jawab)
                    </label>
                    <span className="text-[9px] text-teal-400 font-mono">Cari Nama / NIK</span>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      value={rowFormData['PIC'] || ''}
                      onFocus={() => setIsPicDropdownOpen(true)}
                      onChange={(e) => {
                        setRowFormData({ ...rowFormData, PIC: e.target.value });
                        setIsPicDropdownOpen(true);
                      }}
                      className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none text-xs"
                      style={{
                        backgroundColor: 'var(--input-bg, #141414)',
                        borderColor: 'var(--border-main, #334155)',
                        color: 'var(--text-main, #f1f5f9)'
                      }}
                      placeholder="Ketik NIK, Nama, atau pilih Role..."
                    />
                    {rowFormData['PIC'] && (
                      <button
                        type="button"
                        onClick={() => setRowFormData({ ...rowFormData, PIC: '' })}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100"
                        style={{ color: 'var(--text-muted, #94a3b8)' }}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* PIC Suggestions Dropdown */}
                  {isPicDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setIsPicDropdownOpen(false)} 
                      />
                      <div 
                        className="absolute left-0 right-0 top-full mt-1.5 z-20 border rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y animate-in fade-in zoom-in-95 duration-100"
                        style={{
                          backgroundColor: 'var(--card-bg, #222222)',
                          borderColor: 'var(--border-main, #334155)'
                        }}
                      >
                        {/* Quick Role Picks */}
                        <div className="p-2" style={{ backgroundColor: 'var(--input-bg, #1b1b1b)' }}>
                          <span className="text-[9px] font-bold uppercase tracking-wider block px-2 pb-1.5" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                            Role Khusus
                          </span>
                          <div className="grid grid-cols-2 gap-1">
                            {['All Foreman', 'Foreman Up', 'SPV', 'SPV Up', 'All Supervisor', 'All Personil'].map((role) => (
                              <button
                                key={role}
                                type="button"
                                onClick={() => {
                                  setRowFormData({ ...rowFormData, PIC: role });
                                  setIsPicDropdownOpen(false);
                                }}
                                className="px-2 py-1.5 rounded-lg border text-[11px] font-semibold text-left transition-colors flex items-center justify-between cursor-pointer"
                                style={{
                                  backgroundColor: 'var(--card-bg, #2a2a2a)',
                                  borderColor: 'var(--border-main, #334155)',
                                  color: 'var(--text-main, #f1f5f9)'
                                }}
                              >
                                <span>{role}</span>
                                <Check className="w-2.5 h-2.5 opacity-40 text-teal-400" />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Employee Search List */}
                        <div className="p-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider block px-2 py-1" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                            Daftar Karyawan ({employeesList.length})
                          </span>
                          {employeesList
                            .filter((emp) => {
                              const q = (rowFormData['PIC'] || '').toLowerCase().trim();
                              if (!q) return true;
                              return (
                                (emp.name || '').toLowerCase().includes(q) ||
                                (emp.nik || '').toLowerCase().includes(q) ||
                                (emp.jabatan || '').toLowerCase().includes(q) ||
                                (emp.section || '').toLowerCase().includes(q)
                              );
                            })
                            .slice(0, 15)
                            .map((emp) => (
                              <button
                                key={emp.id || emp.nik}
                                type="button"
                                onClick={() => {
                                  setRowFormData({ ...rowFormData, PIC: emp.name || emp.nik });
                                  setIsPicDropdownOpen(false);
                                }}
                                className="w-full px-2.5 py-2 rounded-xl hover:opacity-80 flex items-center justify-between text-left transition-opacity cursor-pointer group"
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span className="w-6 h-6 rounded-full bg-teal-900/80 border border-teal-700/60 text-teal-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {(emp.name || 'U').charAt(0).toUpperCase()}
                                  </span>
                                  <div className="truncate">
                                    <span className="text-xs font-semibold block truncate" style={{ color: 'var(--text-main, #f1f5f9)' }}>
                                      {emp.name}
                                    </span>
                                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                                      {emp.nik} • {emp.jabatan || emp.section || 'Personil'}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Status */}
                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1 text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                    Status
                  </label>
                  <select
                    value={rowFormData['Status'] || 'Open'}
                    onChange={(e) => setRowFormData({ ...rowFormData, Status: e.target.value })}
                    className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none cursor-pointer text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg, #141414)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-main, #f1f5f9)'
                    }}
                  >
                    <option value="Open">Open</option>
                    <option value="On Progress">On Progress</option>
                    <option value="Closed">Closed</option>
                    <option value="Canceled">Canceled</option>
                  </select>
                </div>
              </div>

              {/* 5. Tipe Aktivitas & Periode (Hanya 2 pilihan utama: Routine vs Non Routine) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tipe Aktivitas */}
                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1 text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                    Tipe Aktivitas
                  </label>
                  <select
                    value={
                      (rowFormData['Activity (routine/non routine)'] || '').toLowerCase().includes('non') ||
                      (rowFormData['period'] || '').toLowerCase().includes('non')
                        ? 'Non Routine'
                        : 'Routine'
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'Non Routine') {
                        setRowFormData({
                          ...rowFormData,
                          'Activity (routine/non routine)': 'Non Routine',
                          period: 'Non-Routine'
                        });
                      } else {
                        const currentCad = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Biannual', 'Yearly'].includes(rowFormData['period'] || '')
                          ? rowFormData['period']
                          : 'Daily';
                        setRowFormData({
                          ...rowFormData,
                          'Activity (routine/non routine)': currentCad,
                          period: currentCad
                        });
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none cursor-pointer text-xs font-semibold"
                    style={{
                      backgroundColor: 'var(--input-bg, #141414)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-main, #f1f5f9)'
                    }}
                  >
                    <option value="Routine">Routine</option>
                    <option value="Non Routine">Non Routine</option>
                  </select>
                </div>

                {/* Cadence Periode (Pilihan lanjutan daily s/d yearly jika Routine) */}
                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1 text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                    Periode / Cadence
                  </label>
                  {((rowFormData['Activity (routine/non routine)'] || '').toLowerCase().includes('non') ||
                    (rowFormData['period'] || '').toLowerCase().includes('non')) ? (
                    <div 
                      className="w-full p-2.5 rounded-xl border text-xs font-medium opacity-70 cursor-not-allowed"
                      style={{
                        backgroundColor: 'var(--input-bg, #141414)',
                        borderColor: 'var(--border-main, #334155)',
                        color: 'var(--text-muted, #94a3b8)'
                      }}
                    >
                      Non Routine
                    </div>
                  ) : (
                    <select
                      value={['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Biannual', 'Yearly'].includes(rowFormData['period'] || '') ? rowFormData['period'] : 'Daily'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRowFormData({
                          ...rowFormData,
                          'Activity (routine/non routine)': val,
                          period: val
                        });
                      }}
                      className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none cursor-pointer text-xs font-semibold"
                      style={{
                        backgroundColor: 'var(--input-bg, #141414)',
                        borderColor: 'var(--border-main, #334155)',
                        color: 'var(--text-main, #f1f5f9)'
                      }}
                    >
                      <option value="Daily">Daily (Harian)</option>
                      <option value="Weekly">Weekly (Mingguan)</option>
                      <option value="Monthly">Monthly (Bulanan)</option>
                      <option value="Quarterly">Quarterly (Triwulan)</option>
                      <option value="Biannual">Biannual (Semesteran)</option>
                      <option value="Yearly">Yearly (Tahunan)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* 6. Created Time */}
              <div>
                <label className="block font-bold uppercase tracking-wider mb-1 text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                  Created Time
                </label>
                <input
                  type="text"
                  value={rowFormData['Created Time'] || ''}
                  onChange={(e) => setRowFormData({ ...rowFormData, 'Created Time': e.target.value })}
                  className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none font-mono text-[11px]"
                  style={{
                    backgroundColor: 'var(--input-bg, #141414)',
                    borderColor: 'var(--border-main, #334155)',
                    color: 'var(--text-main, #f1f5f9)'
                  }}
                  placeholder="YYYY-MM-DD HH:mm"
                />
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border-main, #334155)' }}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowRowModal(false)}
                  className="!w-auto text-xs px-4"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingRow}
                  className="!w-auto text-xs px-5 bg-teal-600 hover:bg-teal-500 text-white font-bold"
                >
                  {isSavingRow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
                  <span>{editingRowIndex === null ? 'Simpan Baris Baru' : 'Simpan Perubahan'}</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SLIDE-OVER DRAWER (RIGHT-TO-LEFT): ROW DETAILS & TOPIC DISCUSSION       */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedRow && (
          <div className="fixed inset-0 z-[120] overflow-hidden">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
              onClick={() => setSelectedRow(null)}
            />

            {/* Right-to-Left Slide-over Panel (Wide 2-Column Layout) */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10 pointer-events-none">
              <motion.div 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                className="w-screen max-w-5xl lg:max-w-6xl xl:max-w-7xl border-l shadow-[-20px_0_50px_rgba(0,0,0,0.5)] flex flex-col h-full overflow-hidden pointer-events-auto"
                style={{
                  backgroundColor: 'var(--card-bg, #1a1a1a)',
                  borderColor: 'var(--border-main, #334155)',
                  color: 'var(--text-main, #cbd5e1)'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drawer Sticky Header */}
                <div 
                  className="p-4 sm:p-5 border-b flex items-center justify-between shrink-0"
                  style={{
                    backgroundColor: 'var(--input-bg, #222222)',
                    borderColor: 'var(--border-main, #334155)'
                  }}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <span className="text-xs sm:text-sm font-mono px-3 py-1 rounded-xl bg-teal-950/90 text-teal-300 border border-teal-600/50 font-bold shrink-0 shadow-sm">
                      #{getRowVal(selectedRow, 'number') || '1'}
                    </span>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base sm:text-xl truncate" style={{ color: 'var(--text-main, #f1f5f9)' }}>
                          {baseTopicTitle || 'Detail Kegiatan'}
                        </h3>
                        {activeSubPeriod && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-teal-500/20 text-teal-300 border border-teal-500/50 font-bold shrink-0">
                            {activeSubPeriod}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                          Aktivitas: {getRowVal(selectedRow, 'Activity (routine/non routine)') || 'Routine'}
                        </span>
                        <span style={{ color: 'var(--text-muted, #64748b)' }}>•</span>
                        <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                          Periode: {getRowVal(selectedRow, 'period') || 'Periodik'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Move Topic to Section Periodical Page Button */}
                    {sectionPeriodicalPages.length > 0 && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowMovePopover(!showMovePopover)}
                          disabled={isMovingTopic}
                          className="p-2 px-3 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm disabled:opacity-50"
                          title="Pindahkan kegiatan ini ke halaman periodik seksi lain (Weekly, Daily, Monthly, dll)"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Pindah Halaman</span>
                          <ChevronDown className="w-3 h-3 opacity-70" />
                        </button>

                        {showMovePopover && (
                          <>
                            <div 
                              className="fixed inset-0 z-30" 
                              onClick={() => setShowMovePopover(false)} 
                            />
                            <div 
                              className="absolute right-0 top-full mt-1.5 z-40 w-64 border rounded-2xl shadow-2xl overflow-hidden p-1.5 animate-in fade-in zoom-in-95 duration-100"
                              style={{
                                backgroundColor: 'var(--card-bg, #202020)',
                                borderColor: 'var(--border-main, #334155)'
                              }}
                            >
                              <div className="px-2.5 py-1.5 border-b mb-1" style={{ borderColor: 'var(--border-main, #334155)' }}>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 block">
                                  Pindah ke Halaman Periodik:
                                </span>
                                <span className="text-[11px] text-slate-400 block truncate">
                                  {section || 'Seksi Ini'}
                                </span>
                              </div>
                              <div className="space-y-0.5 max-h-56 overflow-y-auto">
                                {sectionPeriodicalPages.map((dest) => (
                                  <button
                                    key={dest.post.id}
                                    type="button"
                                    onClick={() => openMoveModal(dest.post, selectedRow)}
                                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs font-medium hover:bg-teal-500/15 hover:text-teal-300 transition-colors flex items-center justify-between group cursor-pointer"
                                    style={{ color: 'var(--text-main, #cbd5e1)' }}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="text-sm shrink-0">{dest.icon}</span>
                                      <span className="truncate">{dest.post.title}</span>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-300 shrink-0" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => handleOpenEditModal(selectedRow, localRows.indexOf(selectedRow))}
                      className="p-2 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteRow(localRows.indexOf(selectedRow))}
                      className="p-2 px-3.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                    <button
                      onClick={() => setSelectedRow(null)}
                      className="p-2 rounded-xl border hover:opacity-80 transition-opacity ml-1 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--card-bg, #1e293b)',
                        borderColor: 'var(--border-main, #334155)',
                        color: 'var(--text-muted, #94a3b8)'
                      }}
                      title="Tutup Panel (ESC)"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Drawer Body: Wide 2-Column Responsive Layout */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* ================================================================= */}
                    {/* LEFT COLUMN: DETAIL TOPIK & RINCIAN KEGIATAN                      */}
                    {/* ================================================================= */}
                    <div className="lg:col-span-5 xl:col-span-5 space-y-5">
                      
                      {/* Key Highlights Grid */}
                      <div 
                        className="grid grid-cols-2 gap-2.5 p-4 rounded-2xl border shadow-inner text-xs"
                        style={{
                          backgroundColor: 'var(--input-bg, #141414)',
                          borderColor: 'var(--border-main, #334155)'
                        }}
                      >
                        <div>
                          <span className="text-[10px] uppercase font-bold block mb-1.5" style={{ color: 'var(--text-muted, #94a3b8)' }}>Status</span>
                          {(() => {
                            const actualIdx = localRows.indexOf(selectedRow) !== -1 
                              ? localRows.indexOf(selectedRow)
                              : localRows.findIndex(r => getRowVal(r, 'Jenis kegiatan') === getRowVal(selectedRow, 'Jenis kegiatan'));
                            
                            if (actualIdx !== -1) {
                              return (
                                <NotionDropdownCell
                                  type="status"
                                  value={getRowVal(selectedRow, 'Status')}
                                  onChange={(newVal) => handleUpdateCellDirect(actualIdx, 'Status', newVal)}
                                />
                              );
                            }
                            return renderStatusBadge(getRowVal(selectedRow, 'Status'));
                          })()}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold block mb-1.5" style={{ color: 'var(--text-muted, #94a3b8)' }}>Priority</span>
                          {renderPriorityBadge(getRowVal(selectedRow, 'Priority'))}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold block mb-1.5" style={{ color: 'var(--text-muted, #94a3b8)' }}>PIC</span>
                          {renderPicBadge(getRowVal(selectedRow, 'PIC'), 'sm', true)}
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold block mb-1.5" style={{ color: 'var(--text-muted, #94a3b8)' }}>Activity Type</span>
                          {(() => {
                            const actualIdx = localRows.indexOf(selectedRow) !== -1 
                              ? localRows.indexOf(selectedRow)
                              : localRows.findIndex(r => getRowVal(r, 'Jenis kegiatan') === getRowVal(selectedRow, 'Jenis kegiatan'));
                            
                            if (actualIdx !== -1) {
                              return (
                                <NotionDropdownCell
                                  type="activity"
                                  value={getRowVal(selectedRow, 'Activity (routine/non routine)')}
                                  onChange={(newVal) => {
                                    const curVal = getRowVal(selectedRow, 'Activity (routine/non routine)');
                                    if (newVal === curVal) return;
                                    const targetCad = normalizeCadence(newVal);
                                    const matchingDest = sectionPeriodicalPages.find(p => p.cadence === newVal || (targetCad && p.cadence === targetCad));
                                    if (matchingDest) {
                                      openMoveModal(matchingDest.post, selectedRow, newVal);
                                      return;
                                    }
                                    handleUpdateCellDirect(actualIdx, 'Activity (routine/non routine)', newVal);
                                    const cad = normalizeCadence(newVal);
                                    if (cad && isPeriodicCadence(cad)) {
                                      setActiveSubPeriod(getDefaultActiveSubPeriod(cad));
                                    } else {
                                      setActiveSubPeriod('');
                                    }
                                  }}
                                />
                              );
                            }
                            return (
                              <span 
                                className="font-mono font-semibold px-2 py-0.5 rounded border inline-block truncate max-w-full text-[11px]"
                                style={{
                                  backgroundColor: 'var(--card-bg, #1e1e1e)',
                                  borderColor: 'var(--border-main, #334155)',
                                  color: 'var(--text-main, #cbd5e1)'
                                }}
                              >
                                {getRowVal(selectedRow, 'Activity (routine/non routine)') || 'Routine'}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Sub-Period Navigator Card (when cadence is periodic) */}
                      {isPeriodic && (
                        <div 
                          className="p-4 rounded-2xl border shadow-sm space-y-3"
                          style={{
                            backgroundColor: 'var(--card-bg, #181818)',
                            borderColor: 'var(--border-main, #334155)'
                          }}
                        >
                          <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-main, #2d2d2d)' }}>
                            <div className="flex items-center gap-2">
                              <CalendarDays className="w-4 h-4 text-teal-400" />
                              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                                Sub-Judul Periode ({currentCadence})
                              </h4>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-950/80 text-teal-300 border border-teal-700/50">
                              Traceability Mandiri
                            </span>
                          </div>

                          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                            Setiap sub-judul memiliki ruang diskusi, PIC, dan galeri media tersendiri:
                          </p>

                          {/* Sub-period pills */}
                          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                            <button
                              type="button"
                              onClick={() => setActiveSubPeriod('')}
                              className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                activeSubPeriod === ''
                                  ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-950/50'
                                  : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-teal-500/60'
                              }`}
                            >
                              <span>📋 Topik Umum</span>
                              {(() => {
                                const count = topicCommentCounts[baseTopicTitle.toLowerCase().trim()] || 0;
                                return count > 0 ? (
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                    activeSubPeriod === '' ? 'bg-slate-950 text-teal-300' : 'bg-slate-800 text-slate-400'
                                  }`}>
                                    {count}
                                  </span>
                                ) : null;
                              })()}
                            </button>

                            {availableSubPeriods.map((subP) => {
                              const isSelected = activeSubPeriod === subP;
                              const subKey = `${baseTopicTitle} - ${subP}`.toLowerCase().trim();
                              const subCount = topicCommentCounts[subKey] || 0;

                              return (
                                <button
                                  key={subP}
                                  type="button"
                                  onClick={() => setActiveSubPeriod(subP)}
                                  className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isSelected
                                      ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md shadow-teal-950/50 scale-[1.03]'
                                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-teal-500/60'
                                  }`}
                                >
                                  <span>{subP}</span>
                                  {subCount > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                      isSelected ? 'bg-slate-950 text-teal-300' : 'bg-teal-950 text-teal-400 border border-teal-700/60'
                                    }`}>
                                      {subCount}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Active Sub-Period PIC Banner */}
                          {activeSubPeriod && (
                            <div className="p-2.5 rounded-xl border bg-teal-950/20 border-teal-500/30 flex items-center justify-between text-xs mt-2">
                              <div className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-teal-400" />
                                <span className="text-[11px] text-teal-200">
                                  PIC Sub-Judul ({activeSubPeriod}): <strong>{getRowVal(selectedRow, 'PIC') || 'Belum Ditentukan'}</strong>
                                </span>
                              </div>
                              <span className="text-[10px] text-teal-400/80 font-mono">
                                {activeTopicComments.length} update
                              </span>
                            </div>
                          )}

                          {/* Custom sub-period quick adder */}
                          <div className="pt-1 flex items-center gap-2">
                            <input
                              type="text"
                              id="custom-subperiod-input"
                              placeholder={`Tambah sub-judul kustom (cth: ${currentCadence === 'Weekly' ? 'W53 2026' : currentCadence === 'Quarterly' ? 'Q1 Revisi' : 'Kustom'})...`}
                              className="flex-1 px-2.5 py-1.5 rounded-xl border text-[11px] outline-none focus:border-teal-500"
                              style={{
                                backgroundColor: 'var(--input-bg, #141414)',
                                borderColor: 'var(--border-main, #334155)',
                                color: 'var(--text-main, #f1f5f9)'
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = (e.currentTarget.value || '').trim();
                                  if (val) {
                                    setCustomPeriodsMap(prev => ({
                                      ...prev,
                                      [baseTopicTitle]: [...(prev[baseTopicTitle] || []), val]
                                    }));
                                    setActiveSubPeriod(val);
                                    e.currentTarget.value = '';
                                    toast.success(`Sub-judul "${val}" berhasil ditambahkan!`);
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const inputEl = document.getElementById('custom-subperiod-input') as HTMLInputElement;
                                if (inputEl && inputEl.value.trim()) {
                                  const val = inputEl.value.trim();
                                  setCustomPeriodsMap(prev => ({
                                    ...prev,
                                    [baseTopicTitle]: [...(prev[baseTopicTitle] || []), val]
                                  }));
                                  setActiveSubPeriod(val);
                                  inputEl.value = '';
                                  toast.success(`Sub-judul "${val}" berhasil ditambahkan!`);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold cursor-pointer shrink-0"
                            >
                              + Tambah
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Rincian & Keterangan Subtask Manager (Sinergi Penuh dengan Log Book) */}
                      {(() => {
                        const selKetVal = getRowVal(selectedRow, 'Keterangan');
                        const actualIdx = localRows.indexOf(selectedRow) !== -1 
                          ? localRows.indexOf(selectedRow)
                          : localRows.findIndex(r => getRowVal(r, 'Jenis kegiatan') === getRowVal(selectedRow, 'Jenis kegiatan'));

                        return (
                          <SharedSubtaskManager
                            value={selKetVal}
                            onChange={(newVal) => {
                              if (actualIdx !== -1) {
                                handleUpdateCellDirect(actualIdx, 'Keterangan', newVal);
                              }
                            }}
                            label="Rincian & Checklist Subtask Kegiatan"
                            currentUser={{ nik: currentAuthorNik || '', name: currentAuthorName || getRowVal(selectedRow, 'PIC') || 'PIC' }}
                            selectedDate={new Date().toISOString().split('T')[0]}
                            allowModeSwitch={true}
                            defaultMode="checklist"
                            showProgressBar={true}
                            placeholder="Tambah butir subtask langsung di sini lalu tekan Enter..."
                          />
                        );
                      })()}

                      {/* Secondary Metadata Info Cards */}
                      <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                        <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--input-bg, #171717)', borderColor: 'var(--border-main, #334155)' }}>
                          <span className="text-[9px] uppercase font-bold block mb-0.5" style={{ color: 'var(--text-muted, #94a3b8)' }}>Period</span>
                          <span className="font-medium truncate block" style={{ color: 'var(--text-main, #cbd5e1)' }}>{getRowVal(selectedRow, 'period') || '-'}</span>
                        </div>
                        <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--input-bg, #171717)', borderColor: 'var(--border-main, #334155)' }}>
                          <span className="text-[9px] uppercase font-bold block mb-0.5" style={{ color: 'var(--text-muted, #94a3b8)' }}>Dibuat</span>
                          <span className="font-mono text-[10px] truncate block" style={{ color: 'var(--text-main, #cbd5e1)' }}>{getRowVal(selectedRow, 'Created Time') || '-'}</span>
                        </div>
                      </div>

                      {/* 3. GALERI & LAMPIRAN MEDIA TOPIK */}
                      <div 
                        className="p-4 sm:p-5 rounded-2xl border shadow-sm space-y-3"
                        style={{
                          backgroundColor: 'var(--card-bg, #171717)',
                          borderColor: 'var(--border-main, #334155)'
                        }}
                      >
                        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-main, #334155)' }}>
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-teal-400" />
                            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                              Galeri & Lampiran Media ({galleryItems.length})
                            </h4>
                          </div>
                          
                          <input
                            type="file"
                            ref={galleryFileInputRef}
                            onChange={handleGalleryFileSelect}
                            accept="image/*,.pdf,.doc,.docx"
                            className="hidden"
                          />
                          <button
                            type="button"
                            disabled={isUploadingGallery}
                            onClick={() => galleryFileInputRef.current?.click()}
                            className="px-2.5 py-1 rounded-lg bg-teal-950/80 hover:bg-teal-900 text-teal-300 border border-teal-600/50 text-[10px] font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                          >
                            {isUploadingGallery ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            <span>+ Upload Lampiran / Foto</span>
                          </button>
                        </div>

                        {/* Gallery Items Grid */}
                        {galleryItems.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                            {galleryItems.map((item, idx) => {
                              const driveId = item.attachment.id || extractDriveId(item.attachment.directUrl || item.attachment.url);
                              const targetUrl = item.attachment.directUrl || item.attachment.url || item.attachment.name;
                              const canDelete = 
                                !item.comment.authorNik || 
                                item.comment.authorNik === currentAuthorNik || 
                                item.comment.authorName === currentAuthorName;

                              return (
                                <div 
                                  key={item.comment.id ? `gal-${item.comment.id}-${idx}` : idx}
                                  onClick={() => handlePreviewAttachment(item.attachment)}
                                  className="group relative rounded-xl overflow-hidden aspect-video border hover:border-teal-500/60 cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
                                  style={{
                                    backgroundColor: 'var(--input-bg, #121212)',
                                    borderColor: 'var(--border-main, #334155)'
                                  }}
                                  title={`Klik untuk melihat: ${item.attachment.name}${item.attachment.caption ? ` (${item.attachment.caption})` : ''}`}
                                >
                                  {item.attachment.isImage ? (
                                    <img 
                                      src={item.attachment.directUrl || item.attachment.url} 
                                      alt={item.attachment.name}
                                      loading="lazy"
                                      referrerPolicy="no-referrer"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (driveId) {
                                          if (!target.src.includes('googleusercontent.com')) {
                                            target.src = `https://lh3.googleusercontent.com/d/${driveId}`;
                                          } else if (!target.src.includes('thumbnail')) {
                                            target.src = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
                                          }
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-teal-950/30">
                                      <FileText className="w-6 h-6 text-teal-400 mb-1" />
                                      <span className="text-[10px] text-teal-300 font-semibold truncate w-full px-1">{item.attachment.name}</span>
                                    </div>
                                  )}

                                  {/* Caption Badge */}
                                  {item.attachment.caption && (
                                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[9px] text-teal-300 font-medium z-10 shadow-xs border border-teal-500/30">
                                      💬 Caption
                                    </div>
                                  )}

                                  {/* Delete Attachment Button on Thumbnail */}
                                  {canDelete && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteAttachment(item.comment.id, targetUrl, item.attachment.name);
                                      }}
                                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 z-20 cursor-pointer shadow-md border border-white/20 hover:border-rose-400 active:scale-90"
                                      title="Hapus lampiran ini dari galeri (teks komentar tetap tersimpan)"
                                    >
                                      <Trash2 className="w-3 h-3 stroke-[2.5]" />
                                    </button>
                                  )}

                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5 pointer-events-none">
                                    {item.attachment.caption ? (
                                      <>
                                        <span className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
                                          "{item.attachment.caption}"
                                        </span>
                                        <span className="text-[9px] text-slate-300 truncate mt-0.5">{item.attachment.name}</span>
                                      </>
                                    ) : (
                                      <span className="text-[10px] font-bold text-white truncate">{item.attachment.name}</span>
                                    )}
                                    <span className="text-[9px] text-teal-300 font-mono mt-0.5">{item.authorName}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div 
                            onClick={() => galleryFileInputRef.current?.click()}
                            className="py-6 px-4 rounded-xl border border-dashed text-center cursor-pointer transition-colors group"
                            style={{
                              backgroundColor: 'var(--input-bg, #141414)',
                              borderColor: 'var(--border-main, #334155)'
                            }}
                          >
                            <ImageIcon className="w-6 h-6 mx-auto mb-1.5 text-teal-400 transition-colors" />
                            <p className="text-xs font-medium transition-colors" style={{ color: 'var(--text-main, #cbd5e1)' }}>
                              Belum ada foto atau lampiran untuk kegiatan ini
                            </p>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted, #64748b)' }}>
                              Klik di sini untuk mengunggah foto dokumentasi / hasil inspeksi
                            </p>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* ================================================================= */}
                    {/* RIGHT COLUMN: NOTION-STYLE DISCUSSION & REPLIES                   */}
                    {/* ================================================================= */}
                    <div className="lg:col-span-7 xl:col-span-7 space-y-4">
                      
                      {/* Header Comments */}
                      <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-main, #334155)' }}>
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-teal-500" />
                          <h4 
                            className="text-xs font-bold uppercase tracking-wider"
                            style={{ color: 'var(--text-main, #0f172a)' }}
                          >
                            Comments ({sortedTopicComments.length})
                          </h4>
                        </div>
                        <span 
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: 'var(--input-bg, #141414)',
                            borderColor: 'var(--border-main, #334155)',
                            color: 'var(--text-muted, #94a3b8)'
                          }}
                        >
                          ⚡ Threaded Replies
                        </span>
                      </div>

                      {/* Comments Timeline Stream */}
                      <div className="space-y-2 pt-1">
                        {commentsLoading ? (
                          <div className="text-center py-8" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-400" />
                            <p className="text-xs">Memuat riwayat diskusi...</p>
                          </div>
                        ) : sortedTopicComments.length === 0 ? (
                          <div 
                            className="text-center py-8 px-4 rounded-2xl border border-dashed"
                            style={{
                              backgroundColor: 'var(--card-bg, #151515)',
                              borderColor: 'var(--border-main, #334155)',
                              color: 'var(--text-muted, #94a3b8)'
                            }}
                          >
                            <MessageSquare className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-teal-400" />
                            <p className="text-xs italic">Belum ada komentar atau update diskusi pada kegiatan ini.</p>
                          </div>
                        ) : sortedTopicComments.length <= 2 ? (
                          sortedTopicComments.map((c, idx) => {
                            const atts = parseCommentAttachments(c.fileUrl, c.fileName, c.content);
                            return (
                              <div 
                                key={c.id ? `comment-${c.id}-${idx}` : `comment-${idx}`} 
                                className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-500/5 transition-colors group"
                                style={{
                                  borderBottom: '1px solid var(--border-main, rgba(51, 65, 85, 0.25))'
                                }}
                              >
                                <div 
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 shadow-xs"
                                  style={{
                                    backgroundColor: 'var(--input-bg, #f1f5f9)',
                                    border: '1px solid var(--border-main, #cbd5e1)',
                                    color: 'var(--text-main, #0f172a)'
                                  }}
                                >
                                  {(c.authorName || 'U').charAt(0).toUpperCase()}
                                </div>

                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap text-xs">
                                    <span 
                                      className="font-bold text-xs"
                                      style={{ color: 'var(--text-main, #0f172a)' }}
                                    >
                                      {c.authorName || 'Personil'}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 leading-tight">
                                      Guest
                                    </span>
                                    <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted, #64748b)' }}>
                                      {formatNotionCommentTime(c.createdAt)}
                                    </span>

                                    <div className="ml-auto flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleStartReply(c)}
                                        className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-500/10 transition-opacity flex items-center gap-1 cursor-pointer font-medium"
                                        title={`Balas tanggapan ${c.authorName}`}
                                      >
                                        <Reply className="w-2.5 h-2.5 rotate-180" />
                                        <span>Balas</span>
                                      </button>
                                      {c.authorNik === currentAuthorNik && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingCommentId(c.id);
                                              setEditingCommentContent(c.content);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-sky-500 transition-opacity cursor-pointer"
                                            title="Edit komentar ini"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteComment(c.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity cursor-pointer"
                                            title="Hapus komentar ini"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {editingCommentId === c.id ? (
                                      <div className="space-y-2 mt-1">
                                        <textarea
                                          value={editingCommentContent}
                                          onChange={(e) => setEditingCommentContent(e.target.value)}
                                          className="w-full text-xs p-2 rounded-lg border focus:ring-1 focus:ring-sky-500 outline-none leading-relaxed min-h-[60px]"
                                          style={{
                                            backgroundColor: 'var(--input-bg, #1a1a1a)',
                                            borderColor: 'var(--border-main, #334155)',
                                            color: 'var(--text-main, #f1f5f9)'
                                          }}
                                        />
                                        <div className="flex items-center gap-2 justify-end">
                                          <button
                                            type="button"
                                            onClick={() => { setEditingCommentId(null); setEditingCommentContent(''); }}
                                            className="px-2 py-1 text-xs rounded border border-slate-600 text-slate-300 hover:bg-slate-700 cursor-pointer"
                                          >
                                            Batal
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSaveEditComment(c.id)}
                                            className="px-2.5 py-1 text-xs rounded bg-sky-600 hover:bg-sky-500 text-white font-medium cursor-pointer"
                                          >
                                            Simpan
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-main, #1e293b)' }}>
                                        {c.content}
                                      </p>
                                    )}

                                  {atts.length > 0 && (
                                    <NotionAttachmentGrid attachments={atts} onPreview={handlePreviewAttachment} />
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="space-y-2">
                            {/* First / Earliest Comment */}
                            {(() => {
                              const c = sortedTopicComments[0];
                              const atts = parseCommentAttachments(c.fileUrl, c.fileName, c.content);
                              return (
                                <div 
                                  key={c.id ? `first-${c.id}` : 'first-item'} 
                                  className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-500/5 transition-colors group"
                                  style={{
                                    borderBottom: '1px solid var(--border-main, rgba(51, 65, 85, 0.25))'
                                  }}
                                >
                                  <div 
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 shadow-xs"
                                    style={{
                                      backgroundColor: 'var(--input-bg, #f1f5f9)',
                                      border: '1px solid var(--border-main, #cbd5e1)',
                                      color: 'var(--text-main, #0f172a)'
                                    }}
                                  >
                                    {(c.authorName || 'U').charAt(0).toUpperCase()}
                                  </div>

                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap text-xs">
                                      <span 
                                        className="font-bold text-xs"
                                        style={{ color: 'var(--text-main, #0f172a)' }}
                                      >
                                        {c.authorName || 'Personil'}
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 leading-tight">
                                        Guest
                                      </span>
                                      <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted, #64748b)' }}>
                                        {formatNotionCommentTime(c.createdAt)}
                                      </span>

                                      <div className="ml-auto flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleStartReply(c)}
                                          className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-500/10 transition-opacity flex items-center gap-1 cursor-pointer font-medium"
                                          title={`Balas tanggapan ${c.authorName}`}
                                        >
                                          <Reply className="w-2.5 h-2.5 rotate-180" />
                                          <span>Balas</span>
                                        </button>
                                        {c.authorNik === currentAuthorNik && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingCommentId(c.id);
                                              setEditingCommentContent(c.content);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-sky-500 transition-opacity cursor-pointer"
                                            title="Edit komentar ini"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteComment(c.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity cursor-pointer"
                                            title="Hapus komentar ini"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </>
                                      )}
                                      </div>
                                    </div>

                                    {editingCommentId === c.id ? (
                                      <div className="space-y-2 mt-1">
                                        <textarea
                                          value={editingCommentContent}
                                          onChange={(e) => setEditingCommentContent(e.target.value)}
                                          className="w-full text-xs p-2 rounded-lg border focus:ring-1 focus:ring-sky-500 outline-none leading-relaxed min-h-[60px]"
                                          style={{
                                            backgroundColor: 'var(--input-bg, #1a1a1a)',
                                            borderColor: 'var(--border-main, #334155)',
                                            color: 'var(--text-main, #f1f5f9)'
                                          }}
                                        />
                                        <div className="flex items-center gap-2 justify-end">
                                          <button
                                            type="button"
                                            onClick={() => { setEditingCommentId(null); setEditingCommentContent(''); }}
                                            className="px-2 py-1 text-xs rounded border border-slate-600 text-slate-300 hover:bg-slate-700 cursor-pointer"
                                          >
                                            Batal
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSaveEditComment(c.id)}
                                            className="px-2.5 py-1 text-xs rounded bg-sky-600 hover:bg-sky-500 text-white font-medium cursor-pointer"
                                          >
                                            Simpan
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-main, #1e293b)' }}>
                                        {c.content}
                                      </p>
                                    )}

                                    {atts.length > 0 && (
                                      <NotionAttachmentGrid attachments={atts} onPreview={handlePreviewAttachment} />
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Collapsible toggle bar */}
                            <div className="pl-9 py-1">
                              <button
                                type="button"
                                onClick={() => setShowAllReplies(!showAllReplies)}
                                className="text-xs font-semibold flex items-center gap-1.5 py-1 px-2.5 -ml-2.5 rounded-lg transition-all cursor-pointer group border border-dashed hover:border-teal-500/50"
                                style={{
                                  color: 'var(--text-muted, #64748b)',
                                  borderColor: 'var(--border-main, rgba(51, 65, 85, 0.4))'
                                }}
                              >
                                {showAllReplies ? (
                                  <>
                                    <ChevronUp className="w-3.5 h-3.5 text-teal-500" />
                                    <span>Sembunyikan {sortedTopicComments.length - 2} balasan</span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3.5 h-3.5 text-teal-500 group-hover:translate-y-0.5 transition-transform" />
                                    <span style={{ color: 'var(--text-main, #0f172a)' }}>Show {sortedTopicComments.length - 2} replies</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Intermediate comments */}
                            <AnimatePresence>
                              {showAllReplies && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="space-y-2 overflow-hidden"
                                >
                                  {sortedTopicComments.slice(1, sortedTopicComments.length - 1).map((c, midx) => {
                                    const atts = parseCommentAttachments(c.fileUrl, c.fileName, c.content);
                                    return (
                                      <div 
                                        key={c.id ? `mid-${c.id}-${midx}` : `mid-${midx}`} 
                                        className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-500/5 transition-colors group"
                                        style={{
                                          borderBottom: '1px solid var(--border-main, rgba(51, 65, 85, 0.25))'
                                        }}
                                      >
                                        <div 
                                          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 shadow-xs"
                                          style={{
                                            backgroundColor: 'var(--input-bg, #f1f5f9)',
                                            border: '1px solid var(--border-main, #cbd5e1)',
                                            color: 'var(--text-main, #0f172a)'
                                          }}
                                        >
                                          {(c.authorName || 'U').charAt(0).toUpperCase()}
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                          <div className="flex items-center gap-2 flex-wrap text-xs">
                                            <span 
                                              className="font-bold text-xs"
                                              style={{ color: 'var(--text-main, #0f172a)' }}
                                            >
                                              {c.authorName || 'Personil'}
                                            </span>
                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 leading-tight">
                                              Guest
                                            </span>
                                            <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted, #64748b)' }}>
                                              {formatNotionCommentTime(c.createdAt)}
                                            </span>

                                            <div className="ml-auto flex items-center gap-1">
                                              <button
                                                type="button"
                                                onClick={() => handleStartReply(c)}
                                                className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-500/10 transition-opacity flex items-center gap-1 cursor-pointer font-medium"
                                                title={`Balas tanggapan ${c.authorName}`}
                                              >
                                                <Reply className="w-2.5 h-2.5 rotate-180" />
                                                <span>Balas</span>
                                              </button>
                                              {c.authorNik === currentAuthorNik && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingCommentId(c.id);
                                              setEditingCommentContent(c.content);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-sky-500 transition-opacity cursor-pointer"
                                            title="Edit komentar ini"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteComment(c.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity cursor-pointer"
                                            title="Hapus komentar ini"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </>
                                      )}
                                            </div>
                                          </div>

                                          {editingCommentId === c.id ? (
                                      <div className="space-y-2 mt-1">
                                        <textarea
                                          value={editingCommentContent}
                                          onChange={(e) => setEditingCommentContent(e.target.value)}
                                          className="w-full text-xs p-2 rounded-lg border focus:ring-1 focus:ring-sky-500 outline-none leading-relaxed min-h-[60px]"
                                          style={{
                                            backgroundColor: 'var(--input-bg, #1a1a1a)',
                                            borderColor: 'var(--border-main, #334155)',
                                            color: 'var(--text-main, #f1f5f9)'
                                          }}
                                        />
                                        <div className="flex items-center gap-2 justify-end">
                                          <button
                                            type="button"
                                            onClick={() => { setEditingCommentId(null); setEditingCommentContent(''); }}
                                            className="px-2 py-1 text-xs rounded border border-slate-600 text-slate-300 hover:bg-slate-700 cursor-pointer"
                                          >
                                            Batal
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSaveEditComment(c.id)}
                                            className="px-2.5 py-1 text-xs rounded bg-sky-600 hover:bg-sky-500 text-white font-medium cursor-pointer"
                                          >
                                            Simpan
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-main, #1e293b)' }}>
                                        {c.content}
                                      </p>
                                    )}

                                          {atts.length > 0 && (
                                            <NotionAttachmentGrid attachments={atts} onPreview={handlePreviewAttachment} />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Latest / Newest Comment */}
                            {(() => {
                              const c = sortedTopicComments[sortedTopicComments.length - 1];
                              const atts = parseCommentAttachments(c.fileUrl, c.fileName, c.content);
                              return (
                                <div 
                                  key={c.id ? `last-${c.id}` : 'last-item'} 
                                  className="flex items-start gap-2.5 p-2.5 rounded-xl hover:bg-slate-500/5 transition-colors group"
                                  style={{
                                    borderBottom: '1px solid var(--border-main, rgba(51, 65, 85, 0.25))'
                                  }}
                                >
                                  <div 
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 shadow-xs"
                                    style={{
                                      backgroundColor: 'var(--input-bg, #f1f5f9)',
                                      border: '1px solid var(--border-main, #cbd5e1)',
                                      color: 'var(--text-main, #0f172a)'
                                    }}
                                  >
                                    {(c.authorName || 'U').charAt(0).toUpperCase()}
                                  </div>

                                  <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap text-xs">
                                      <span 
                                        className="font-bold text-xs"
                                        style={{ color: 'var(--text-main, #0f172a)' }}
                                      >
                                        {c.authorName || 'Personil'}
                                      </span>
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 leading-tight">
                                        Guest
                                      </span>
                                      <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted, #64748b)' }}>
                                        {formatNotionCommentTime(c.createdAt)}
                                      </span>

                                      <div className="ml-auto flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => handleStartReply(c)}
                                          className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 hover:bg-teal-500/10 transition-opacity flex items-center gap-1 cursor-pointer font-medium"
                                          title={`Balas tanggapan ${c.authorName}`}
                                        >
                                          <Reply className="w-2.5 h-2.5 rotate-180" />
                                          <span>Balas</span>
                                        </button>
                                        {c.authorNik === currentAuthorNik && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingCommentId(c.id);
                                              setEditingCommentContent(c.content);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-sky-500 transition-opacity cursor-pointer"
                                            title="Edit komentar ini"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteComment(c.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity cursor-pointer"
                                            title="Hapus komentar ini"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </>
                                      )}
                                      </div>
                                    </div>

                                    {editingCommentId === c.id ? (
                                      <div className="space-y-2 mt-1">
                                        <textarea
                                          value={editingCommentContent}
                                          onChange={(e) => setEditingCommentContent(e.target.value)}
                                          className="w-full text-xs p-2 rounded-lg border focus:ring-1 focus:ring-sky-500 outline-none leading-relaxed min-h-[60px]"
                                          style={{
                                            backgroundColor: 'var(--input-bg, #1a1a1a)',
                                            borderColor: 'var(--border-main, #334155)',
                                            color: 'var(--text-main, #f1f5f9)'
                                          }}
                                        />
                                        <div className="flex items-center gap-2 justify-end">
                                          <button
                                            type="button"
                                            onClick={() => { setEditingCommentId(null); setEditingCommentContent(''); }}
                                            className="px-2 py-1 text-xs rounded border border-slate-600 text-slate-300 hover:bg-slate-700 cursor-pointer"
                                          >
                                            Batal
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleSaveEditComment(c.id)}
                                            className="px-2.5 py-1 text-xs rounded bg-sky-600 hover:bg-sky-500 text-white font-medium cursor-pointer"
                                          >
                                            Simpan
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-main, #1e293b)' }}>
                                        {c.content}
                                      </p>
                                    )}

                                    {atts.length > 0 && (
                                      <NotionAttachmentGrid attachments={atts} onPreview={handlePreviewAttachment} />
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      {/* Notion Bottom Comment Box */}
                      <form 
                        onSubmit={handlePostComment} 
                        className="p-3.5 sm:p-4 border rounded-2xl space-y-2.5 shadow-md mt-4"
                        style={{
                          backgroundColor: 'var(--card-bg, #171717)',
                          borderColor: 'var(--border-main, #334155)'
                        }}
                      >
                        {/* Replying banner */}
                        {replyingTo && (
                          <div 
                            className="flex items-center justify-between p-2 px-3 rounded-xl border text-xs animate-in fade-in duration-150 shadow-xs"
                            style={{
                              backgroundColor: 'rgba(20, 184, 166, 0.12)',
                              borderColor: 'rgba(20, 184, 166, 0.35)',
                              color: 'var(--text-main, #f1f5f9)'
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Reply className="w-3.5 h-3.5 text-teal-400 shrink-0 rotate-180" />
                              <span className="truncate">
                                Membalas <strong className="text-teal-300 font-semibold">{replyingTo.authorName}</strong>: <span className="opacity-85 italic font-normal">"{replyingTo.content.substring(0, 60)}{replyingTo.content.length > 60 ? '...' : ''}"</span>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReplyingTo(null)}
                              className="p-1 hover:bg-teal-500/20 rounded-md text-teal-300 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                              title="Batal Membalas"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Selected Attachment Preview with Caption */}
                        {(selectedFiles.length > 0 || selectedFile) && (
                          <div 
                            className="p-2.5 rounded-xl border space-y-2 animate-in fade-in shadow-xs"
                            style={{
                              backgroundColor: 'var(--input-bg, #1a1a1a)',
                              borderColor: 'rgba(20, 184, 166, 0.45)'
                            }}
                          >
                            <div className="flex items-center justify-between text-xs font-semibold text-teal-400">
                              <span>Lampiran ({selectedFiles.length || 1} file siap dikirim):</span>
                              <button
                                type="button"
                                onClick={() => { setSelectedFiles([]); setSelectedFile(null); setCommentFileCaption(''); }}
                                className="text-[11px] text-rose-400 hover:underline cursor-pointer"
                              >
                                Hapus Semua
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(selectedFiles.length > 0 ? selectedFiles : (selectedFile ? [selectedFile] : [])).map((f, fIdx) => (
                                <div key={fIdx} className="relative flex items-center gap-2 p-1.5 pr-2.5 rounded-lg bg-teal-950/40 border border-teal-500/30">
                                  {f.isImage && (f.previewUrl || f.url) ? (
                                    <img src={f.previewUrl || f.url} alt={f.name} className="w-8 h-8 object-cover rounded border border-teal-500/40 shrink-0" />
                                  ) : (
                                    <Paperclip className="w-4 h-4 text-teal-400 shrink-0" />
                                  )}
                                  <span className="text-[11px] font-medium text-teal-200 truncate max-w-[120px]" title={f.name}>{f.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = selectedFiles.filter((_, idx) => idx !== fIdx);
                                      setSelectedFiles(updated);
                                      if (updated.length === 0) setSelectedFile(null);
                                    }}
                                    className="p-0.5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5 pt-1">
                              <input
                                type="text"
                                value={commentFileCaption}
                                onChange={(e) => setCommentFileCaption(e.target.value)}
                                placeholder="Tambahkan caption gambar/lampiran (opsional)..."
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border focus:border-teal-500 outline-none leading-relaxed"
                                style={{
                                  backgroundColor: 'var(--card-bg, #141414)',
                                  borderColor: 'var(--border-main, #334155)',
                                  color: 'var(--text-main, #f1f5f9)'
                                }}
                              />
                            </div>
                          </div>
                        )}

                        <textarea
                          id="notion-comment-textarea"
                          rows={2}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder={
                            replyingTo 
                              ? `Tulis tanggapan untuk ${replyingTo.authorName}...` 
                              : selectedFile
                              ? `Tulis catatan tambahan untuk lampiran (opsional)...`
                              : `Add a comment for "${selectedTopicTitle}"...`
                          }
                          className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none leading-relaxed text-xs resize-none"
                          style={{
                            backgroundColor: 'var(--input-bg, #202020)',
                            borderColor: 'var(--border-main, #334155)',
                            color: 'var(--text-main, #f1f5f9)'
                          }}
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              ref={commentFileInputRef}
                              onChange={handleCommentFileSelect}
                              accept="image/*,.pdf,.doc,.docx"
                              multiple
                              className="hidden"
                            />
                            <button
                              type="button"
                              disabled={isUploadingCommentFile}
                              onClick={() => commentFileInputRef.current?.click()}
                              className="p-1 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 hover:border-teal-500/60 transition-colors cursor-pointer"
                              style={{
                                backgroundColor: 'var(--input-bg, #202020)',
                                borderColor: 'var(--border-main, #334155)',
                                color: 'var(--text-muted, #94a3b8)'
                              }}
                              title="Lampirkan foto atau dokumen ke diskusi"
                            >
                              {isUploadingCommentFile ? <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" /> : <Paperclip className="w-3.5 h-3.5 text-teal-400" />}
                              <span>{isUploadingCommentFile ? 'Mengunggah...' : 'Lampirkan Foto'}</span>
                            </button>

                            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted, #94a3b8)' }}>Status:</span>
                            <select
                              value={statusUpdateChoice}
                              onChange={(e) => setStatusUpdateChoice(e.target.value)}
                              className="p-1 px-2 rounded-lg border text-xs outline-none cursor-pointer"
                              style={{
                                backgroundColor: 'var(--input-bg, #202020)',
                                borderColor: 'var(--border-main, #334155)',
                                color: 'var(--text-main, #f1f5f9)'
                              }}
                            >
                              <option value="">Status Tetap ({getRowVal(selectedRow, 'Status') || 'Open'})</option>
                              <option value="On Progress">⏩ Ubah ke On Progress</option>
                              <option value="Close">✅ Ubah ke Closed / Selesai</option>
                              <option value="Pending">⏳ Ubah ke Pending</option>
                              <option value="Open">⭕ Ubah ke Open</option>
                            </select>
                          </div>

                          <Button
                            type="submit"
                            disabled={submittingComment || isUploadingCommentFile || (!commentText.trim() && !selectedFile)}
                            className="!w-auto text-xs px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {submittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : replyingTo ? <Reply className="w-3.5 h-3.5 mr-1.5 rotate-180" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                            <span>{replyingTo ? 'Kirim Balasan' : 'Comment'}</span>
                          </Button>
                        </div>
                      </form>

                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Upload Lampiran / Foto dengan Caption (Gallery) */}
      <AnimatePresence>
        {pendingUploadFile && (
          <div className="fixed inset-0 z-[150] overflow-y-auto flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => {
                if (!isUploadingGallery) {
                  if (pendingUploadFile.previewUrl && pendingUploadFile.previewUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(pendingUploadFile.previewUrl);
                  }
                  setPendingUploadFile(null);
                }
              }}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-lg rounded-2xl border shadow-2xl p-5 z-10 space-y-4"
              style={{
                backgroundColor: 'var(--card-bg, #1a1a1a)',
                borderColor: 'var(--border-main, #334155)',
                color: 'var(--text-main, #f1f5f9)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-main, #334155)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-teal-300">Upload Lampiran dengan Caption</h3>
                    <p className="text-[11px] text-slate-400">Tambahkan penjelasan atau caption untuk foto ini</p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isUploadingGallery}
                  onClick={() => {
                    if (pendingUploadFile.previewUrl && pendingUploadFile.previewUrl.startsWith('blob:')) {
                      URL.revokeObjectURL(pendingUploadFile.previewUrl);
                    }
                    setPendingUploadFile(null);
                  }}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview Thumbnail */}
              <div className="space-y-3">
                {pendingUploadFile.isImage && pendingUploadFile.previewUrl ? (
                  <div className="relative rounded-xl overflow-hidden border max-h-56 flex items-center justify-center bg-black/40" style={{ borderColor: 'var(--border-main, #334155)' }}>
                    <img 
                      src={pendingUploadFile.previewUrl} 
                      alt={pendingUploadFile.file.name} 
                      className="w-full h-full max-h-56 object-contain" 
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border flex items-center gap-3 bg-slate-900/60" style={{ borderColor: 'var(--border-main, #334155)' }}>
                    <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-700/50 flex items-center justify-center text-teal-400 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-xs text-teal-300 block truncate">{pendingUploadFile.file.name}</span>
                      <span className="text-[10px] text-slate-400">{(pendingUploadFile.file.size / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-slate-400 truncate flex items-center justify-between">
                  <span className="truncate max-w-[300px]"><strong>File:</strong> {pendingUploadFile.file.name}</span>
                  <span>{(pendingUploadFile.file.size / 1024).toFixed(0)} KB</span>
                </div>

                {/* Caption Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-teal-300">
                    Caption / Keterangan Gambar (Opsional):
                  </label>
                  <textarea
                    rows={3}
                    autoFocus
                    value={pendingUploadFile.caption}
                    onChange={(e) => setPendingUploadFile({ ...pendingUploadFile, caption: e.target.value })}
                    placeholder="Contoh: Kondisi bearing motor setelah dibersihkan dan siap dipasang kembali..."
                    className="w-full p-2.5 rounded-xl border text-xs outline-none focus:border-teal-500 leading-relaxed resize-none"
                    style={{
                      backgroundColor: 'var(--input-bg, #141414)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-main, #f1f5f9)'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleExecuteGalleryUpload();
                      }
                    }}
                  />
                  <span className="text-[10px] text-slate-500 italic block">
                    Tekan Ctrl+Enter atau klik tombol di bawah untuk mengunggah.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--border-main, #334155)' }}>
                <button
                  type="button"
                  disabled={isUploadingGallery}
                  onClick={() => {
                    if (pendingUploadFile.previewUrl && pendingUploadFile.previewUrl.startsWith('blob:')) {
                      URL.revokeObjectURL(pendingUploadFile.previewUrl);
                    }
                    setPendingUploadFile(null);
                  }}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--border-main, #334155)' }}
                >
                  Batal
                </button>
                <Button
                  type="button"
                  disabled={isUploadingGallery}
                  onClick={handleExecuteGalleryUpload}
                  className="!w-auto text-xs px-5 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {isUploadingGallery ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload & Simpan Caption</span>
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      {previewImage && (
        <ImageModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          title={previewImage.title}
          driveViewUrl={previewImage.driveViewUrl}
          driveDownloadUrl={previewImage.driveDownloadUrl}
        />
      )}

      {/* Save Confirmation Modal Popup */}
      <NotionSaveConfirmationModal
        isOpen={showSaveConfirmModal}
        onConfirm={handleConfirmSaveDirectChanges}
        onDiscard={handleDiscardDirectChanges}
        onClose={() => setShowSaveConfirmModal(false)}
        dirtyRowCount={dirtyRowIndices.size}
        isSaving={isPersistingChanges}
        tableName={title}
        isNotionLight={isNotionLight}
      />
    </div>
  );
}
