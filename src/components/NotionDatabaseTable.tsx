import { translateDisplayText, getDisplayColumnHeader } from './notion/logbook-section-utils';
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
  EyeOff,
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  AlertTriangle, 
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
  GripVertical,
  Pin,
  Lock,
  Target,
  ClipboardCheck,
Link2,
  PlaneTakeoff,
  Coffee
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui';
import { toast } from 'sonner';
import { uploadPhotoToDrive } from '../sheets-api';
import { ImageModal } from './image-modal';
import { parseTasklist, toggleTasklistItem, formatColorTagsToHtml, formatTitleToVisualHtml, stripColorTags, NOTION_COLORS, TasklistProgress, markdownToVisualHtml, migrateLegacySubtaskText } from './notion/tasklist-utils';
import { NotionTasklistView } from './notion/NotionTasklistView';
import { NotionDropdownCell, STATUS_OPTIONS, PRIORITY_OPTIONS } from './notion/NotionDropdownCell';
import { NotionDueDateCell, NotionCompletionDateCell, calculateTaskKpiStatus, parseDateToMidnight } from './notion/NotionDueDateCell';
import { NotionInlineEditor } from './notion/NotionInlineEditor';
import { NotionSaveConfirmationModal } from './notion/NotionSaveConfirmationModal';
import { NotionDeleteConfirmationModal } from './notion/NotionDeleteConfirmationModal';
import { NotionRecycleBinModal } from './notion/NotionRecycleBinModal';
import { EnterpriseWysiwygEditor } from './notion/EnterpriseWysiwygEditor';
import { SharedSubtaskManager } from './notion/SharedSubtaskManager';
import { 
  syncLogbookRowBackToOrigin, 
  syncLogbookRowsGroupToOrigin,
  formatToDDMMYYYY, 
  getTodayDDMMYYYY,
  getYesterdayDDMMYYYY,
  getYesterdayDateWithData,
  getRowDateDDMMYYYY,
  extractLogbookMeta,
  injectLogbookMeta,
  LogbookMeta,
  generateTaskCode,
  normalizeExistingTaskCodes,
  resolveOriginPostId,
  getAllSectionRowsForChangelog
} from './notion/logbook-section-utils';
import { LogbookTaskRecommendationModal } from './notion/LogbookTaskRecommendationModal';
import { LogbookChangelogCard } from './notion/LogbookChangelogCard';
import { LogbookDailyNotesCard } from './notion/LogbookDailyNotesCard';
import { FloatingSelectionToolbar, FormatAction, formatSelectedText } from './notion/FloatingSelectionToolbar';
import { PicAvatarGroup, smartSplitPicString } from './PicAvatarGroup';
import { FindingResolutionModal } from './notion/FindingResolutionModal';
import { CreateFindingModal } from './notion/CreateFindingModal';
import { LinkModuleModal, LinkedModuleInfo } from './notion/LinkModuleModal';
import { getGlobalSocket } from '../lib/socketClient';
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
  previewUrl?: string;
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
              Boolean(item.isImage) ||
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

  // Notion-style Document / File Attachment Block (Image 2 style)
  if (!attachment.isImage || imgFailed) {
    return (
      <div className="flex flex-col items-start gap-1">
        <div
          onClick={() => onPreview(attachment)}
          className="flex items-center gap-2.5 p-2 px-3 rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] bg-white dark:bg-[#202020] hover:bg-[#F7F7F5] dark:hover:bg-[#252525] transition-colors cursor-pointer group shadow-xs max-w-sm text-xs"
          title={`Buka / Unduh: ${attachment.name}`}
        >
          <div className="w-7 h-7 rounded bg-[#F1F1EF] dark:bg-[#2F2F2F] flex items-center justify-center text-[#5A5A55] dark:text-[#9B9A97] shrink-0">
            <FileSpreadsheet className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-semibold text-[#37352F] dark:text-[#E6E6E5] truncate block group-hover:underline">
              {attachment.name}
            </span>
            <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block">
              {attachment.size ? `${Math.round(attachment.size / 1024)} KB` : 'Document'}
            </span>
          </div>
          <MoreHorizontal className="w-3.5 h-3.5 text-[#787774] dark:text-[#9B9A97] shrink-0 opacity-70 group-hover:opacity-100" />
        </div>
        {attachment.caption && (
          <span className="text-[11px] text-[#787774] dark:text-[#9B9A97] italic line-clamp-2 max-w-[240px] pl-1">
            "{attachment.caption}"
          </span>
        )}
      </div>
    );
  }

  const primarySrc = attachment.directUrl || attachment.url;

  // Notion-style Image Thumbnail
  return (
    <div className="flex flex-col items-start gap-1">
      <div
        onClick={() => onPreview(attachment)}
        className="relative rounded-lg overflow-hidden border border-[#EDEDEC] dark:border-[#2F2F2F] hover:border-[#B4B4B0] dark:hover:border-[#5A5A55] w-20 h-20 sm:w-24 sm:h-24 block group cursor-pointer shadow-xs transition-all hover:scale-[1.02] shrink-0 bg-[#F1F1EF] dark:bg-[#202020]"
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
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center text-white font-bold text-xs sm:text-sm tracking-wide">
            {overlayBadge}
          </div>
        ) : (
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Maximize2 className="w-3.5 h-3.5 text-white drop-shadow" />
          </div>
        )}
      </div>
      {attachment.caption && (
        <span className="text-[11px] text-[#787774] dark:text-[#9B9A97] italic line-clamp-2 max-w-[180px] leading-tight" title={attachment.caption}>
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
  onPreview: (att: CommentAttachmentItem, contextImages?: CommentAttachmentItem[]) => void;
}) => {
  if (!attachments || attachments.length === 0) return null;

  const images = attachments.filter((a) => a.isImage);
  const docs = attachments.filter((a) => !a.isImage);

  const maxVisibleImages = 3;
  const visibleImages = images.slice(0, maxVisibleImages);
  const overflowImage = images.length > maxVisibleImages ? images[maxVisibleImages] : null;
  const overflowCount = images.length - maxVisibleImages;

  return (
    <div className="space-y-2 pt-1.5">
      {images.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {visibleImages.map((att, idx) => (
            <NotionAttachmentThumbnail
              key={att.id || idx}
              attachment={att}
              onPreview={(target) => onPreview(target, images)}
            />
          ))}
          {overflowImage && (
            <NotionAttachmentThumbnail
              key={overflowImage.id || 'overflow'}
              attachment={overflowImage}
              onPreview={(target) => onPreview(target, images)}
              overlayBadge={`+${overflowCount}`}
            />
          )}
        </div>
      )}

      {docs.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
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
  return title
    .replace(/^[↳↪\s]+/, '')
    .replace(/^\[[ xX]\]\s*/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!-?[a-zA-Z0-9_\-\s]+.*?>?/g, '')
    .replace(/<!--.*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

export const extractLinkedTicketId = (row: TableRowData): string | null => {
  if (!row) return null;
  const rawTitle = (
    getCellValue(row, 'Activity Name') || 
    getCellValue(row, 'Jenis kegiatan') || 
    getCellValue(row, 'Jenis Kegiatan') || 
    getCellValue(row, 'Name') || 
    getCellValue(row, 'Judul') || 
    ''
  );
  const linkIdMatch = rawTitle.match(/<!--link-id:([^\s>]+)-->/i);
  if (linkIdMatch && linkIdMatch[1].toUpperCase().startsWith('TKT-')) {
    return linkIdMatch[1].trim();
  }
  const bracketMatch = rawTitle.match(/\[(TKT-[^\]]+)\]/i);
  if (bracketMatch) {
    return bracketMatch[1].trim();
  }
  const ket = getCellValue(row, 'Keterangan') || getCellValue(row, 'Description') || '';
  const ketLinkId = ket.match(/<!--link-id:([^\s>]+)-->/i) || ket.match(/\[(TKT-[^\]]+)\]/i);
  if (ketLinkId && ketLinkId[1].toUpperCase().startsWith('TKT-')) {
    return ketLinkId[1].trim();
  }
  return null;
};

export const extractRowLinkInfo = (row: TableRowData): LinkedModuleInfo | null => {
  if (!row) return null;
  const rawTitle = (
    getCellValue(row, 'Activity Name') || 
    getCellValue(row, 'Jenis kegiatan') || 
    getCellValue(row, 'Jenis Kegiatan') || 
    getCellValue(row, 'Name') || 
    getCellValue(row, 'Judul') || 
    ''
  );
  const typeMatch = rawTitle.match(/<!--link-type:([a-z0-9_-]+)-->/i);
  const idMatch = rawTitle.match(/<!--link-id:([^>]+)-->/i) || rawTitle.match(/\[(TKT-[^\]]+)\]/i);
  const urlMatch = rawTitle.match(/<!--link-url:([^>]+)-->/i);
  const labelMatch = rawTitle.match(/<!--link-label:([^>]+)-->/i);

  if (typeMatch || idMatch || urlMatch) {
    const type = (typeMatch?.[1] as any) || (idMatch?.[1]?.toUpperCase().startsWith('TKT-') ? 'ticket' : 'url');
    return {
      type,
      id: idMatch?.[1]?.trim(),
      url: urlMatch?.[1]?.trim(),
      label: labelMatch ? decodeURIComponent(labelMatch[1]) : (idMatch?.[1]?.trim() || (type === 'ticket' ? 'Tiket Temuan' : 'Tautan'))
    };
  }
  return null;
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
  'Tanggal Selesai',
  'Due Date',
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
  const targetLower = colName.toLowerCase().trim();

  if (targetLower === 'description' || targetLower === 'keterangan') {
    if (row[colName] !== undefined && row[colName] !== '' && row[colName] !== '-') {
      return row[colName];
    }
    for (const key of Object.keys(row)) {
      const val = row[key];
      const keyLower = key.toLowerCase().trim();
      if (
        keyLower.includes('keterangan') || 
        keyLower.includes('description') || 
        keyLower.includes('deskripsi') || 
        keyLower.includes('catatan') || 
        keyLower.includes('rincian')
      ) {
        if (val !== undefined && val !== '' && val !== '-') return val;
      }
    }
    return row[colName] ?? '-';
  }

  if (row[colName] !== undefined && row[colName] !== '') return row[colName];

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
    if ((targetLower === 'jenis kegiatan' || targetLower === 'judul' || targetLower === 'activity name' || targetLower === 'nama kegiatan' || targetLower === 'task') && 
        !keyLower.includes('routine') && !keyLower.includes('rutin') &&
        (keyLower.includes('jenis kegiatan') || keyLower.includes('activity name') || keyLower === 'task' || keyLower === 'judul' || keyLower === 'name' || keyLower === 'nama' || keyLower === 'kegiatan')) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }
    if ((targetLower === 'description' || targetLower === 'keterangan') && (keyLower.includes('keterangan') || keyLower.includes('catatan') || keyLower.includes('deskripsi') || keyLower.includes('description') || keyLower.includes('content') || keyLower.includes('rincian'))) {
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
    if ((targetLower === 'due date' || targetLower === 'target selesai' || targetLower === 'deadline' || targetLower === 'batas waktu') && (keyLower.includes('due') || keyLower.includes('target') || keyLower.includes('deadline') || keyLower.includes('jatuh tempo') || keyLower.includes('batas waktu'))) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }
    if ((targetLower === 'completion date' || targetLower === 'tanggal selesai' || targetLower === 'completed time' || targetLower === 'completed date') && (keyLower.includes('completed') || keyLower.includes('completion') || keyLower.includes('aktual selesai') || keyLower === 'selesai' || keyLower.includes('waktu selesai') || keyLower.includes('tanggal selesai'))) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }
    if ((targetLower === 'remarks' || targetLower === 'keterangan batas waktu') && (keyLower === 'remarks' || keyLower.includes('keterangan batas') || keyLower === 'remark')) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }
    if (targetLower === 'kategori' && (keyLower.includes('kategori') || keyLower.includes('category') || keyLower === 'dept')) {
      if (val !== undefined && val !== '') return val;
      if (fallbackVal === undefined) fallbackVal = val;
    }
    if ((targetLower === 'activity (routine/non routine)' || targetLower === 'activity type' || targetLower === 'aktivitas') && !keyLower.includes('name') && !keyLower.includes('judul') && (keyLower.includes('activity') || keyLower.includes('aktivitas') || keyLower.includes('routine') || keyLower.includes('rutin'))) {
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
      let val = getCellValue(row, h);
      const hLower = h.toLowerCase().trim();
      const isTitleCol = hLower.includes('jenis kegiatan') || hLower.includes('activity name') || hLower === 'activity' || hLower === 'task' || hLower === 'judul' || hLower === 'name' || hLower === 'nama';
      
      // Embed persistent ID metadata into the primary title cell
      if (isTitleCol && val) {
        const taskId = row.id || (row as any)._id;
        const parentId = row.parentId || row.parentRowId;
        const lastMod = row['Last Modified'] || row['Date Modified'];
        
        let metaTags = '';
        if (taskId && !val.includes(`<!--task-id:`)) {
          metaTags += ` <!--task-id:${taskId}-->`;
        }
        if (parentId && !val.includes(`<!--parent-id:`)) {
          metaTags += ` <!--parent-id:${parentId}-->`;
        }
        if (lastMod && !val.includes(`<!--last-modified:`)) {
          metaTags += ` <!--last-modified:${lastMod}-->`;
        }
        if (row._originPostId && !val.includes(`<!--origin-id:`)) {
          metaTags += ` <!--origin-id:${row._originPostId}-->`;
        }
        if (row._originPostTitle && !val.includes(`<!--origin-title:`)) {
          metaTags += ` <!--origin-title:${encodeURIComponent(row._originPostTitle)}-->`;
        }
        if (row._originRowIndex !== undefined && row._originRowIndex !== '' && !val.includes(`<!--origin-row:`)) {
          metaTags += ` <!--origin-row:${row._originRowIndex}-->`;
        }
        if (row._parentTitle && !val.includes(`<!--parent-title:`)) {
          metaTags += ` <!--parent-title:${encodeURIComponent(row._parentTitle)}-->`;
        }
        if (row._isLogbookAggregated && !val.includes(`<!--is-logbook:`)) {
          metaTags += ` <!--is-logbook:true-->`;
        }
        if (metaTags) {
          val = `${val.trim()}${metaTags}`;
        }
      }

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
  const seenSubUnderParent = new Set<string>();

  for (let i = 0; i < inputRows.length; i++) {
    const row = { ...inputRows[i] };
    const isSub = isSubItemRow(row);

    if (isSub) {
      // Deduplicate sub-items under the parent
      const subTitle = (getCellValue(row, 'Jenis kegiatan') || getCellValue(row, 'Jenis Kegiatan') || '').replace(/^↳\s*/, '').replace(/<!--[^>]+-->/g, '').replace(/\[[ xX]\]\s*/, '').trim().toLowerCase();
      const parentKey = row.parentId || row.parentRowId || 'unknown';
      const dedupeKey = `${parentKey}:::${subTitle}`;
      if (seenSubUnderParent.has(dedupeKey)) {
        continue;
      }
      seenSubUnderParent.add(dedupeKey);
      newRows.push(row);
      continue;
    }

    // Ensure parent row has stable unique ID
    if (!row.id) {
      const rowCode = row.taskCode || row['Task ID'] || row['ID Task'] || '';
      const cleanTitle = (getCellValue(row, 'Jenis kegiatan') || getCellValue(row, 'Name') || getCellValue(row, 'Judul') || '').replace(/^↳\s*/, '').replace(/<!--[^>]+-->/g, '').trim();
      const safeTitle = cleanTitle.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      row.id = rowCode ? `task_${rowCode}` : `task_${defaultSection || 'sec'}_${i}_${safeTitle}`;
    }

    newRows.push(row);

    // Check if inputRows ALREADY has sub-item rows for this parent
    let hasExistingSubRows = false;
    for (let j = i + 1; j < inputRows.length; j++) {
      const nextR = inputRows[j];
      if (isSubItemRow(nextR)) {
        if (!nextR.parentId || nextR.parentId === row.id || nextR.parentRowId === row.id) {
          hasExistingSubRows = true;
          break;
        }
      } else {
        break; // Reached next parent task
      }
    }

    const ketVal = getCellValue(row, 'Keterangan') || '';
    const taskProg = parseTasklist(ketVal);

    // ONLY synthesize sub-items if inputRows does NOT already have sub-item rows for this parent!
    if (!hasExistingSubRows && taskProg.hasTasklist && taskProg.items.length > 0) {
      const parentCat = getCellValue(row, 'Kategori') || defaultSection || 'Laboratorium';
      const parentPIC = getCellValue(row, 'PIC') || '';
      const parentAct = getCellValue(row, 'Activity (routine/non routine)') || 'Monthly';
      const parentPeriod = getCellValue(row, 'period') || 'Monthly';
      const createdStr = getTodayDDMMYYYY();

      taskProg.items.forEach((item, subIdx) => {
        const safeSubText = (item.text || '').slice(0, 25).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const subId = `sub_${row.id}_${subIdx}_${safeSubText}`;
        const subTitle = `↳ ${item.checked ? '[x] ' : '[ ] '}${item.text}`;
        const dedupeKey = `${row.id}:::${(item.text || '').trim().toLowerCase()}`;

        if (!seenSubUnderParent.has(dedupeKey)) {
          seenSubUnderParent.add(dedupeKey);
          const subRow: TableRowData = {
            number: '',
            id: subId,
            parentId: row.id,
            parentRowId: row.id,
            'Jenis kegiatan': subTitle,
            'Jenis Kegiatan': subTitle,
            Keterangan: item.note || '-',
            PIC: parentPIC,
            Priority: 'Normal',
            Status: item.checked ? 'Closed' : 'Open',
            isCompleted: item.checked ? 'true' : 'false',
            'Created Time': createdStr,
            'Created time': createdStr,
            'Tanggal Selesai': item.checked ? createdStr : '-',
            'Tanggal selesai': item.checked ? createdStr : '-',
            'Due Date': getCellValue(row, 'Due Date') || getCellValue(row, 'due date') || createdStr,
            'due date': getCellValue(row, 'Due Date') || getCellValue(row, 'due date') || createdStr,
            Kategori: parentCat,
            'Activity (routine/non routine)': parentAct,
            period: parentPeriod,
            'Asal Halaman': row['Asal Halaman'] || row._originPostTitle || '',
            isSubItem: 'true',
            _originPostId: row._originPostId,
            _originPostTitle: row._originPostTitle || row['Asal Halaman'] || '',
            _originRowIndex: row._originRowIndex,
            _parentTitle: getDisplayTitle(row['Jenis kegiatan'] || row['Jenis Kegiatan'] || row.Name || ''),
            _isLogbookAggregated: row._isLogbookAggregated
          };
          newRows.push(subRow);
          migratedCount++;
        }
      });

      // Enterprise Best Practice: Clean extracted checklists from parent's Keterangan so they do not duplicate
      const nonChecklist = ketVal
        .split('\n')
        .filter(l => !l.trim().match(/^[-*•]\s*\[([ xX])\]/))
        .join('\n')
        .trim();
      const cleanVal = nonChecklist || '-';
      row['Keterangan'] = cleanVal;
      if (row['Description'] !== undefined) row['Description'] = cleanVal;
    } else if (hasExistingSubRows && taskProg.hasTasklist && taskProg.items.length > 0) {
      // Subtasks already exist as relational rows; sanitize parent's Keterangan from duplicate checklist lines
      const nonChecklist = ketVal
        .split('\n')
        .filter(l => !l.trim().match(/^[-*•]\s*\[([ xX])\]/))
        .join('\n')
        .trim();
      const cleanVal = nonChecklist || '-';
      row['Keterangan'] = cleanVal;
      if (row['Description'] !== undefined) row['Description'] = cleanVal;
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

// Helper untuk mengekstrak tabel markdown dari string konten dengan Persistent ID
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

        // Extract persistent Unique ID and metadata from cells
        const rowStr = cells.join(' ');
        const taskMatch = rowStr.match(/<!--task-id:([^>]+)-->/);
        const parentMatch = rowStr.match(/<!--parent-id:([^>]+)-->/);
        const modMatch = rowStr.match(/<!--last-modified:([^>]+)-->/);
        const originIdMatch = rowStr.match(/<!--origin-id:([^>]+)-->/);
        const originTitleMatch = rowStr.match(/<!--origin-title:([^>]+)-->/);
        const originRowMatch = rowStr.match(/<!--origin-row:([^>]+)-->/);
        const parentTitleMatch = rowStr.match(/<!--parent-title:([^>]+)-->/);
        const isLogbookMatch = rowStr.match(/<!--is-logbook:([^>]+)-->/);

        const isPin = rowStr.includes('<!--pin') || rowStr.includes('<!pin') || rowStr.includes('<!--pinned');
        const cleanTitle = (rowObj['Activity Name'] || rowObj['Activity'] || rowObj['Jenis kegiatan'] || rowObj['Jenis Kegiatan'] || rowObj['Name'] || rowObj['Judul'] || '')
          .replace(/^↳\s*/, '')
          .replace(/<!--[\s\S]*?-->/g, '')
          .replace(/<!-?[a-zA-Z0-9_\-\s]+.*?>?/g, '')
          .replace(/<!--.*$/g, '')
          .trim();
        const safeTitle = cleanTitle.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

        rowObj.id = taskMatch ? taskMatch[1].trim() : `task_${i}_${safeTitle}`;
        if (parentMatch) {
          rowObj.parentId = parentMatch[1].trim();
          rowObj.parentRowId = parentMatch[1].trim();
          rowObj.isSubItem = 'true';
        }
        if (modMatch) {
          rowObj['Last Modified'] = modMatch[1].trim();
          rowObj['Date Modified'] = modMatch[1].trim();
        }
        if (isPin) {
          rowObj.isPinned = 'true';
          (rowObj as any)._pinned = 'true';
        }
        if (originIdMatch) rowObj._originPostId = originIdMatch[1].trim();
        if (originTitleMatch) {
          try {
            rowObj._originPostTitle = decodeURIComponent(originTitleMatch[1].trim());
          } catch {
            rowObj._originPostTitle = originTitleMatch[1].trim();
          }
        }
        if (originRowMatch) rowObj._originRowIndex = originRowMatch[1].trim();
        if (parentTitleMatch) {
          try {
            rowObj._parentTitle = decodeURIComponent(parentTitleMatch[1].trim());
          } catch {
            rowObj._parentTitle = parentTitleMatch[1].trim();
          }
        }
        if (isLogbookMatch) rowObj._isLogbookAggregated = 'true';

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
  postId?: number | string;
  headers: string[];
  rows: TableRowData[];
  title?: string;
  section?: string;
  currentAuthorNik?: string;
  currentAuthorName?: string;
  userJabatan?: string;
  userRole?: string;
  isDeveloper?: boolean;
  pt?: string;
  beforeText?: string;
  afterText?: string;
  onPostContentUpdate?: (newContent: string) => void;
  onRowsChange?: (newRows: TableRowData[]) => void;
  initialTopicTitle?: string;
  onClearInitialTopic?: () => void;
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
  userJabatan,
  userRole,
  isDeveloper = false,
  pt,
  beforeText = '',
  afterText = '',
  onPostContentUpdate,
  onRowsChange,
  initialTopicTitle,
  onClearInitialTopic,
  allPosts,
  onNavigateToPost
}: NotionDatabaseTableProps) {
  // Ref untuk melacak topik deep link yang sudah pernah dibuka otomatis agar tidak berulang kali terbuka
  const consumedTopicRef = useRef<string | null>(null);

  // Local table rows for responsive instant CRUD
  const [localRows, setLocalRows] = useState<TableRowData[]>(() => {
    if (!rows || rows.length === 0) return [];
    const { rows: prepped } = migrateChecklistsInRows(rows, section);
    return prepped;
  });
  const subtaskSaveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const localRowsRef = useRef(localRows);
  useEffect(() => {
    localRowsRef.current = localRows;
  }, [localRows]);

  useEffect(() => {
    return () => {
      if (subtaskSaveDebounceRef.current) {
        clearTimeout(subtaskSaveDebounceRef.current);
      }
    };
  }, []);
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

  // User Identity & Role Permissions for Deletion / Recycle Bin
  const effectiveNik = currentAuthorNik || localStorage.getItem('p2h_inspector_nik') || '';
  const effectiveName = currentAuthorName || localStorage.getItem('p2h_inspector_name') || 'User';
  const effectiveJabatan = userJabatan || localStorage.getItem('p2h_inspector_jabatan') || '';
  const isSuperUser = Boolean(
    isDeveloper ||
    effectiveNik === '02D24000043' || 
    effectiveNik === '02D25000055' || 
    effectiveNik === 'M0403240177' || 
    effectiveNik === 'preplabadmin'
  );
  const jabatanLower = effectiveJabatan.toLowerCase();
  const isForemanOrAbove = Boolean(
    isSuperUser ||
    jabatanLower.includes('foreman') || 
    jabatanLower.includes('supervisor') || 
    jabatanLower.includes('spv') || 
    jabatanLower.includes('manager') || 
    jabatanLower.includes('superintendent') || 
    jabatanLower.includes('lead') ||
    userRole?.toLowerCase().includes('admin') ||
    userRole?.toLowerCase().includes('foreman')
  );

  // Modern Delete Confirmation Modal State
  const [deleteConfirmModalState, setDeleteConfirmModalState] = useState<{
    isOpen: boolean;
    rowIndex?: number;
    isBatch?: boolean;
    rowIndices?: number[];
    taskName?: string;
    subtaskCount?: number;
    subtasks?: TableRowData[];
    isSubItem?: boolean;
    isDeleting?: boolean;
  }>({
    isOpen: false
  });

  // Developer Recycle Bin Modal State
  const [recycleBinModalState, setRecycleBinModalState] = useState<{
    isOpen: boolean;
    items: any[];
    isLoading: boolean;
    isRestoringId?: number | null;
    filter: 'all' | 'current';
  }>({
    isOpen: false,
    items: [],
    isLoading: false,
    isRestoringId: null,
    filter: 'current'
  });

  // Logbook Smart Task Recommendation Modal State
  const [showLogbookRecModal, setShowLogbookRecModal] = useState<boolean>(false);
  const isLogbookTable = useMemo(() => {
    const t = (title || '').toLowerCase();
    const s = (section || '').toLowerCase();
    return t.startsWith('logbook') || t.startsWith('log book') || s.includes('logbook');
  }, [title, section]);

  // Exclude quick shortcuts strictly from Weekly Maintenance
  const isWeeklyMaintenanceTable = useMemo(() => {
    const t = (title || '').toLowerCase().trim();
    const s = (section || '').toLowerCase().trim();
    return (
      (t.includes('maintenance') && t.includes('weekly')) ||
      (s.includes('maintenance') && t.includes('weekly'))
    );
  }, [title, section]);

  // Strict check for Labnote - Administration - Daily
  const isAdministrationDaily = useMemo(() => {
    const t = String(title || '').toLowerCase().trim();
    const s = String(section || '').toLowerCase().trim();
    const isDaily = t.includes('daily') && !t.includes('weekly') && !t.includes('monthly');
    const isAdmin = s.includes('admin') || s.includes('info') || s.includes('administrasi') || t.includes('admin') || String(postId) === '425';
    return isDaily && isAdmin;
  }, [title, section, postId]);

  // Dedicated validator for Rekapan Keterlambatan shortcut (Strictly only for Task = Update Keterlambatan Karyawan in Labnote - Administration - Daily)
  const checkIsTardinessShortcut = useCallback((text: string) => {
    if (!text) return false;
    const t = text.toLowerCase().trim();
    // Strictly exclude KTA/TTA
    if (t.includes('kta') || t.includes('tta')) return false;

    // Must strictly be in Labnote - Administration - Daily
    if (!isAdministrationDaily) return false;

    // Must strictly be Task = Update Keterlambatan Karyawan (or keterlambatan karyawan / pulang cepat)
    return (
      t.includes('update keterlambatan karyawan') ||
      (t.includes('keterlambatan') && t.includes('karyawan')) ||
      t.includes('pulang cepat') ||
      t.includes('tardiness')
    );
  }, [isAdministrationDaily]);

  // Logbook Dynamic Meta & Date View Filter State
  const [logbookActiveTab, setLogbookActiveTab] = useState<'changelog' | 'planning'>('planning');
  const [logbookDateFilter, setLogbookDateFilter] = useState<'today' | 'yesterday' | 'all'>('today');
  const [logbookFilterMode, setLogbookFilterMode] = useState<'focus' | 'all' | 'completed'>('focus');
  const [expandedCompletedSubtasks, setExpandedCompletedSubtasks] = useState<Record<string, boolean>>({});
  const [logbookMeta, setLogbookMeta] = useState<LogbookMeta>(() => extractLogbookMeta(beforeText || '').meta);

  useEffect(() => {
    if (beforeText) {
      setLogbookMeta(extractLogbookMeta(beforeText).meta);
    }
  }, [beforeText]);

  // Direct Inline Click-to-Edit for PIC Column
  const [activeInlinePicCell, setActiveInlinePicCell] = useState<{ rowIndex: number; colName: string } | null>(null);
  const [inlinePicSearch, setInlinePicSearch] = useState<string>('');

  // Row Action 3-Dots Dropdown Menu State
  const [activeActionMenuRowIndex, setActiveActionMenuRowIndex] = useState<number | string | null>(null);

  // Ticket metadata mapping for auto-syncing Created Time, Completion Date, and Due Date
  const [ticketMetadataMap, setTicketMetadataMap] = useState<Record<string, { date?: string; createdAt?: string; completionDate?: string; targetDate?: string }>>({});

  useEffect(() => {
    let isMounted = true;
    fetch('/api/tickets')
      .then(r => r.ok ? r.json() : [])
      .then((allTickets: any[]) => {
        if (!isMounted || !Array.isArray(allTickets)) return;
        const map: Record<string, any> = {};
        allTickets.forEach(t => {
          if (t && t.ticketId) {
            map[t.ticketId.toUpperCase()] = {
              date: t.date || t.createdAt,
              createdAt: t.createdAt || t.date,
              completionDate: t.completionDate,
              targetDate: t.targetDate
            };
          }
        });
        setTicketMetadataMap(map);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  // Finding Resolution Modal State (Mandatory Photo Upload upon subtask check)
  const [findingResolutionModalState, setFindingResolutionModalState] = useState<{
    isOpen: boolean;
    ticket: any | null;
    ticketId?: string;
    subRowIndex?: number;
    initialMode?: 'view' | 'resolve';
  }>({
    isOpen: false,
    ticket: null,
    initialMode: 'resolve'
  });

  // Create Finding Modal State (Direct Input for Sidak Management / Inspeksi Gabungan)
  const [createFindingModalState, setCreateFindingModalState] = useState<{
    isOpen: boolean;
    parentRowIndex?: number;
    parentTaskId?: string;
  }>({
    isOpen: false
  });

  // Generic Row / Subtask Linking Modal State
  const [linkModuleModalState, setLinkModuleModalState] = useState<{
    isOpen: boolean;
    rowIndex: number;
    rowTitle: string;
    currentLink: LinkedModuleInfo | null;
  }>({
    isOpen: false,
    rowIndex: -1,
    rowTitle: '',
    currentLink: null
  });

  const isReconcilingRef = useRef<boolean>(false);

  // Floating Selection Toolbar State for "Edit Data Kegiatan" Modal
  const [activeModalSelection, setActiveModalSelection] = useState<{
    field: 'jenisKegiatan' | 'keterangan';
    start: number;
    end: number;
    selectedText: string;
  } | null>(null);

  // Hidden columns feature (hides column without deleting row data or resetting details)
  const isCoreMandatoryColumn = useCallback((col: string): boolean => {
    const cl = col.toLowerCase().trim();
    const clean = cl.replace(/^[^a-z0-9]+/i, '').trim();
    return (
      cl === 'number' || cl === 'no' || cl === '#' ||
      clean.includes('activity name') || clean.includes('jenis kegiatan') || clean === 'task' || clean === 'judul' || clean === 'name' || clean === 'title' ||
      clean.includes('description') || clean.includes('keterangan') || clean.includes('deskripsi') || clean.includes('catatan') ||
      clean.includes('status')
    );
  }, []);

  const [hiddenColumns, setHiddenColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`notion_hidden_cols_${section || 'default'}`);
      if (!saved) return [];
      const parsed: string[] = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      // Clean up any mandatory core columns from saved hidden columns
      return parsed.filter(c => {
        const cl = c.toLowerCase().trim();
        const clean = cl.replace(/^[^a-z0-9]+/i, '').trim();
        const isCore = 
          cl === 'number' || cl === 'no' || cl === '#' ||
          clean.includes('activity name') || clean.includes('jenis kegiatan') || clean === 'task' || clean === 'judul' || clean === 'name' || clean === 'title' ||
          clean.includes('description') || clean.includes('keterangan') || clean.includes('deskripsi') || clean.includes('catatan') ||
          clean.includes('status');
        return !isCore;
      });
    } catch {
      return [];
    }
  });

  const handleToggleHideColumn = (colName: string) => {
    const colLower = colName.toLowerCase().trim();
    const clean = colLower.replace(/^[^a-z0-9]+/i, '').trim();
    if (colLower === 'number' || colLower === 'no' || colLower === '#') {
      toast.error('Kolom Nomor (#) tidak dapat disembunyikan');
      return;
    }
    if (clean.includes('activity name') || clean.includes('jenis kegiatan') || clean === 'task' || clean === 'judul' || clean === 'name' || clean === 'title') {
      toast.error('Kolom Judul/Kegiatan adalah kolom utama dan tidak dapat disembunyikan');
      return;
    }
    if (clean.includes('description') || clean.includes('keterangan') || clean.includes('deskripsi') || clean.includes('catatan')) {
      toast.error('Kolom Keterangan/Deskripsi adalah kolom utama dan tidak dapat disembunyikan');
      return;
    }
    if (clean.includes('status')) {
      toast.error('Kolom Status adalah kolom utama dan tidak dapat disembunyikan');
      return;
    }

    setHiddenColumns(prev => {
      let next: string[];
      if (prev.some(c => c.toLowerCase() === colLower)) {
        next = prev.filter(c => c.toLowerCase() !== colLower);
        toast.success(`Kolom "${colName}" ditampilkan kembali di tabel.`);
      } else {
        next = [...prev, colName];
        toast.info(`Kolom "${colName}" disembunyikan dari tabel (data detail tetap aman).`);
      }
      try {
        localStorage.setItem(`notion_hidden_cols_${section || 'default'}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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
      setActiveModalSelection(prev => (prev !== null ? null : prev));
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
      const currentVal = rowFormData['Keterangan'] || rowFormData['Description'] || '';
      const res = formatSelectedText(currentVal, start, end, action);
      setRowFormData(prev => ({
        ...prev,
        Keterangan: res.newText,
        Description: res.newText,
        Deskripsi: res.newText
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
      let targetRows = rows;

      const { rows: prepped } = migrateChecklistsInRows(targetRows, section);
      targetRows = prepped;

      const { rows: normalizedRows } = normalizeExistingTaskCodes(targetRows, section);
      targetRows = normalizedRows;

      setLocalRows(targetRows);
      setOriginalRowsBackup(JSON.parse(JSON.stringify(targetRows)));
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
        setShowAddColumnPopover(false);
        setActiveInlineEditor(null);
        setCreatingSubItemForParent(null);
        setNewSubItemTitle('');
        setShowRowModal(false);
        setEditingRowIndex(null);
        setShowSaveConfirmModal(false);
        setLastSubtaskConfirmModal(null);
        setIsPicDropdownOpen(false);
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

  // Helper to read row property with fuzzy matching across header aliases
  const getRowVal = useCallback((row: TableRowData, colName: string): string => {
    if (!row) return '';
    const targetLower = colName.toLowerCase().trim();

    if (targetLower === 'description' || targetLower === 'keterangan') {
      if (row[colName] !== undefined && row[colName] !== '' && row[colName] !== '-') {
        return row[colName];
      }
      for (const key of Object.keys(row)) {
        const val = row[key];
        const keyLower = key.toLowerCase().trim();
        const cleanKey = keyLower.replace(/^[^a-z0-9]+/i, '').trim();
        if (
          cleanKey.includes('keterangan') || 
          cleanKey.includes('description') || 
          cleanKey.includes('deskripsi') || 
          cleanKey.includes('catatan') || 
          cleanKey.includes('rincian')
        ) {
          if (val !== undefined && val !== '' && val !== '-') return val;
        }
      }
      return row[colName] || '';
    }

    if (row[colName] !== undefined && row[colName] !== '') return row[colName];

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
      if ((targetLower === 'activity name' || targetLower === 'jenis kegiatan' || targetLower === 'judul' || targetLower === 'name' || targetLower === 'title' || targetLower === 'nama kegiatan') && 
          (!cleanKey.includes('routine') && !cleanKey.includes('rutin')) &&
          (cleanKey.includes('jenis kegiatan') || cleanKey.includes('activity name') || cleanKey === 'task' || cleanKey === 'judul' || cleanKey === 'name' || cleanKey === 'nama' || cleanKey === 'kegiatan' || cleanKey === 'title' || cleanKey === 'materi')) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }
      if ((targetLower === 'description' || targetLower === 'keterangan') && (cleanKey.includes('keterangan') || cleanKey.includes('catatan') || cleanKey.includes('deskripsi') || cleanKey.includes('description') || cleanKey.includes('content') || cleanKey.includes('rincian'))) {
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
      if ((targetLower === 'due date' || targetLower === 'target selesai' || targetLower === 'deadline' || targetLower === 'batas waktu') && 
          (cleanKey.includes('due') || cleanKey.includes('deadline') || cleanKey.includes('target') || cleanKey.includes('jatuh tempo') || cleanKey.includes('batas waktu'))) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }
      if ((targetLower === 'completion date' || targetLower === 'tanggal selesai' || targetLower === 'completed time' || targetLower === 'completed date') && 
          (cleanKey.includes('completed') || cleanKey.includes('completion') || cleanKey.includes('aktual selesai') || cleanKey === 'selesai' || cleanKey.includes('waktu selesai') || cleanKey.includes('tanggal selesai'))) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }
      if ((targetLower === 'remarks' || targetLower === 'keterangan batas waktu') && 
          (cleanKey === 'remarks' || cleanKey.includes('keterangan batas') || cleanKey === 'remark')) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }
      if (targetLower === 'kategori' && (cleanKey.includes('kategori') || cleanKey.includes('category') || cleanKey === 'dept')) {
        if (val !== undefined && val !== '') return val;
        if (fallbackVal === undefined) fallbackVal = val;
      }
      if ((targetLower === 'activity (routine/non routine)' || targetLower === 'aktivitas') && 
          !cleanKey.includes('name') && !cleanKey.includes('judul') && !cleanKey.includes('task') &&
          (cleanKey.includes('activity') || cleanKey.includes('aktivitas') || cleanKey.includes('routine') || cleanKey.includes('rutin'))) {
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

  // ── PIN TASK TOOLS (Maksimal 10 task per halaman / tidak terpengaruh filter) ──
  const tablePinStorageKey = useMemo(() => {
    return `preplab_pinned_tasks_${postId || section || title || 'default'}`;
  }, [postId, section, title]);

  const [pinnedRowKeys, setPinnedRowKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`preplab_pinned_tasks_${postId || section || title || 'default'}`);
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) return arr;
      }
    } catch {}
    return [];
  });

  // Helpers untuk mendapatkan judul dan keterangan baris sebelum deklarasi getRowVal
  const getRawRowTitle = useCallback((r: TableRowData): string => {
    if (!r) return '';
    return (
      r['Activity Name'] || 
      r['Jenis kegiatan'] || 
      r['Jenis Kegiatan'] || 
      r['Name'] || 
      r['= Name'] || 
      r['Judul'] || 
      r['Title'] || 
      r['Nama kegiatan'] || 
      r['Task'] || 
      ''
    ).trim();
  }, []);

  const getRawRowDesc = useCallback((r: TableRowData): string => {
    if (!r) return '';
    return (
      r['Description'] || 
      r['Keterangan'] || 
      r['Deskripsi'] || 
      r['Catatan'] || 
      r['Rincian'] || 
      ''
    ).trim();
  }, []);

  // Helper untuk mengecek apakah baris di-pin
  const isRowPinned = useCallback((row: TableRowData): boolean => {
    if (!row) return false;

    // 1. Explicit unpinned takes absolute priority!
    if (
      row.isPinned === 'false' || 
      (row as any).isPinned === false || 
      (row as any)._pinned === 'false' || 
      (row as any)._pinned === false
    ) {
      return false;
    }

    // 2. Explicit pinned status
    if (
      row.isPinned === 'true' || 
      (row as any).isPinned === true || 
      (row as any)._pinned === 'true' || 
      (row as any)._pinned === true
    ) {
      return true;
    }

    // 3. Persistent key in pinnedRowKeys
    const rowId = row.id ? String(row.id) : '';
    if (rowId && pinnedRowKeys.includes(rowId)) return true;

    const rawTitle = getRawRowTitle(row);
    const cleanTitle = getDisplayTitle(rawTitle);
    const strippedTitle = stripColorTags(cleanTitle);
    if (cleanTitle && pinnedRowKeys.includes(cleanTitle)) return true;
    if (strippedTitle && pinnedRowKeys.includes(strippedTitle)) return true;

    const taskCode = row.taskCode || row['Task ID'] || row['ID Task'];
    if (taskCode && pinnedRowKeys.includes(String(taskCode))) return true;

    // 4. HTML comment tags in cells (Keterangan, Description, Jenis kegiatan, Activity Name)
    const ket = getRawRowDesc(row);
    if (ket.includes('<!--pin') || ket.includes('<!pin') || ket.includes('<!--pinned')) return true;

    const jk = getRawRowTitle(row);
    if (jk.includes('<!--pin') || jk.includes('<!pin') || jk.includes('<!--pinned')) return true;

    return false;
  }, [pinnedRowKeys, getRawRowTitle, getRawRowDesc]);

  // Sinkronisasi baris dengan penanda <!--pin--> ke pinnedRowKeys saat rows prop dimuat
  useEffect(() => {
    if (!rows || rows.length === 0) return;
    setPinnedRowKeys(prevKeys => {
      const nextKeys = [...prevKeys];
      let changed = false;
      rows.forEach(r => {
        if (!isSubItemRow(r)) {
          // If explicitly unpinned, do not restore!
          if (
            r.isPinned === 'false' || 
            (r as any).isPinned === false || 
            (r as any)._pinned === 'false' || 
            (r as any)._pinned === false
          ) {
            return;
          }
          const ket = getRawRowDesc(r);
          const jk = getRawRowTitle(r);
          const isPinTag = 
            r.isPinned === 'true' || 
            (r as any).isPinned === true || 
            ket.includes('<!--pin') || 
            ket.includes('<!pin') || 
            ket.includes('<!--pinned') || 
            jk.includes('<!--pin') || 
            jk.includes('<!pin');

          const cleanTitle = stripColorTags(getDisplayTitle(jk));
          const key = r.id ? String(r.id) : cleanTitle;
          if (isPinTag && key && !nextKeys.includes(key)) {
            nextKeys.push(key);
            changed = true;
          }
        }
      });
      if (changed) {
        try {
          localStorage.setItem(tablePinStorageKey, JSON.stringify(nextKeys));
        } catch {}
        return nextKeys;
      }
      return prevKeys;
    });
  }, [rows, tablePinStorageKey, getRawRowTitle, getRawRowDesc]);

  // Handler toggle pin / unpin baris task
  const handleTogglePinRow = async (targetRowOrIndex: TableRowData | number) => {
    let targetRow: TableRowData | undefined;
    let rowIndex = -1;

    if (typeof targetRowOrIndex === 'number') {
      rowIndex = targetRowOrIndex;
      targetRow = localRows[rowIndex];
    } else {
      targetRow = targetRowOrIndex;
      rowIndex = localRows.indexOf(targetRow);
    }

    if (!targetRow || rowIndex === -1) return;

    // Jika yang diklik adalah subtask, pin parent task utamanya
    if (isSubItemRow(targetRow)) {
      const p = rowToParentMap.get(targetRow);
      if (p) {
        const pIdx = localRows.indexOf(p);
        if (pIdx !== -1) {
          targetRow = p;
          rowIndex = pIdx;
        }
      }
    }

    const currentlyPinned = isRowPinned(targetRow);

    if (!currentlyPinned) {
      // Validasi: Maksimal 10 task yang dapat di-pin per halaman
      const currentPinnedCount = localRows.filter(r => !isSubItemRow(r) && isRowPinned(r)).length;
      if (currentPinnedCount >= 10) {
        toast.warning('Maksimal 10 task yang dapat di-pin per halaman', {
          description: 'Lepas pin (unpin) salah satu task terlebih dahulu untuk menyematkan task ini.'
        });
        return;
      }
    }

    const newPinnedState = !currentlyPinned;
    const rowId = targetRow.id ? String(targetRow.id) : '';
    const rawTitle = getRawRowTitle(targetRow);
    const cleanTitle = getDisplayTitle(rawTitle);
    const strippedTitle = stripColorTags(cleanTitle);
    const taskCode = targetRow.taskCode || targetRow['Task ID'] || targetRow['ID Task'] || '';

    // Bersihkan semua kemungkinan key untuk task ini agar tidak ada duplikasi atau residual
    const keysToRemove = new Set<string>();
    if (rowId) keysToRemove.add(rowId);
    if (rawTitle) keysToRemove.add(rawTitle);
    if (cleanTitle) keysToRemove.add(cleanTitle);
    if (strippedTitle) keysToRemove.add(strippedTitle);
    if (taskCode) keysToRemove.add(String(taskCode));

    let nextPinnedKeys = pinnedRowKeys.filter(k => {
      const kClean = stripColorTags(getDisplayTitle(k));
      return !keysToRemove.has(k) && !keysToRemove.has(kClean);
    });

    if (newPinnedState) {
      const keyToAdd = rowId || strippedTitle || cleanTitle || (taskCode ? String(taskCode) : '');
      if (keyToAdd && !nextPinnedKeys.includes(keyToAdd)) {
        nextPinnedKeys.push(keyToAdd);
      }
    }

    setPinnedRowKeys(nextPinnedKeys);
    try {
      localStorage.setItem(tablePinStorageKey, JSON.stringify(nextPinnedKeys));
    } catch {}

    // Update data baris lokal
    const nextRows = [...localRows];
    const updatedRow = { ...targetRow };
    updatedRow.isPinned = newPinnedState ? 'true' : 'false';
    (updatedRow as any)._pinned = newPinnedState ? 'true' : 'false';

    if (newPinnedState) {
      // Find the description or remarks column to append <!--pin-->
      const descKey = Object.keys(updatedRow).find(k => {
        const kl = k.toLowerCase().trim();
        return kl === 'keterangan' || kl === 'description' || kl === 'deskripsi' || kl === 'catatan';
      }) || 'Keterangan';
      let curDesc = updatedRow[descKey] || '';
      if (!curDesc.includes('<!--pin-->')) {
        updatedRow[descKey] = `${curDesc} <!--pin-->`.trim();
      }
    } else {
      // Clean ALL pin comments from ALL properties of this row
      for (const k of Object.keys(updatedRow)) {
        if (typeof updatedRow[k] === 'string') {
          updatedRow[k] = updatedRow[k]
            .replace(/<!--\s*pin.*?-->/gi, '')
            .replace(/<!-?\s*pinned.*?-->/gi, '')
            .replace(/<!pin.*?>/gi, '')
            .trim();
        }
      }
    }

    nextRows[rowIndex] = updatedRow;
    setLocalRows(nextRows);
    onRowsChange?.(nextRows);
    await saveTableToBackend(nextRows);

    if (newPinnedState) {
      toast.success('Task berhasil disematkan (pinned) ke posisi teratas!', {
        description: 'Task ini tidak akan terpengaruh oleh filter status atau pencarian.'
      });
    } else {
      toast.info('Sematkan (pin) task telah dilepas.');
    }
  };

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
  const activeCommentUploadsCountRef = useRef(0);
  const commentFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ 
    url: string; 
    title: string; 
    driveViewUrl?: string; 
    driveDownloadUrl?: string;
    images?: Array<{ url: string; title?: string; driveViewUrl?: string; driveDownloadUrl?: string }>;
    currentIndex?: number;
  } | null>(null);
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [showModalKeterangan, setShowModalKeterangan] = useState(false);
  const [showModalMedia, setShowModalMedia] = useState(false);

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
    setShowModalKeterangan(false);
    setShowModalMedia(false);
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
    { name: 'Created Time', icon: '🕒', defaultValue: '-', desc: 'Tanggal pembuatan tugas (otomatis saat dibuat)' },
    { name: 'Status', icon: '🏷️', defaultValue: 'Open', desc: 'Dropdown status progress tugas' },
    { name: 'Completed Time', icon: '✓', defaultValue: '-', desc: 'Tanggal atau waktu penyelesaian tugas' },
    { name: 'Priority', icon: '⚡', defaultValue: 'Normal', desc: 'Tingkat urgensi kegiatan' },
    { name: 'PIC', icon: '👤', defaultValue: '', desc: 'Personil penanggung jawab' },
    { name: 'Activity (routine/non routine)', icon: '🔄', defaultValue: 'Routine', desc: 'Klasifikasi aktivitas rutin/non-rutin' },
    { name: 'period', icon: '⏱️', defaultValue: 'Weekly', desc: 'Periode waktu kegiatan' },
    { name: 'Due Date', icon: '🎯', defaultValue: '-', desc: 'Batas tanggal penyelesaian tugas (Parameter Wajib KPI SLA)' },
    { name: 'Lokasi / Area', icon: '📍', defaultValue: 'Site Obi', desc: 'Lokasi fisik pelaksanaan tugas' },
    { name: 'Departemen', icon: '🏢', defaultValue: 'Laboratorium', desc: 'Seksi atau departemen pelaksana' },
    { name: 'Catatan Tambahan', icon: '📝', defaultValue: '-', desc: 'Rincian atau catatan ekstra' },
    { name: 'Estimasi Biaya', icon: '💰', defaultValue: '-', desc: 'Anggaran atau estimasi biaya (opsional)' },
  ];

  // Canonical order weight for explicitly resetting column order via 'Rapikan Urutan Kolom'
  const getColOrder = (colName: string): number => {
    const l = colName.toLowerCase().trim();
    if (l === 'number' || l === 'no' || l === 'no.' || l === '#') return 0;
    if (l.includes('activity name') || l.includes('jenis kegiatan') || l === 'task' || l === 'judul' || l === 'name' || l === 'nama') return 1;
    if (l.includes('keterangan') || l.includes('catatan') || l.includes('deskripsi') || l.includes('description') || l.includes('rincian') || l.includes('notes')) return 2;
    if (l.includes('created') || l.includes('tanggal dibuat') || l.includes('waktu dibuat')) return 3;
    if (l.includes('completion') || l.includes('completed') || l.includes('aktual selesai') || l === 'selesai' || l.includes('waktu selesai') || l.includes('tanggal selesai')) return 4;
    if (l.includes('due') || l.includes('deadline') || l.includes('target') || l.includes('jatuh tempo') || l.includes('batas waktu')) return 5;
    if (l.includes('status')) return 6;
    if (l === 'pic' || l.includes('assignee') || l.includes('pj') || l === 'personil') return 7;
    if (l.includes('priority') || l.includes('prioritas')) return 8;
    if (!l.includes('name') && (l.includes('activity') || l.includes('aktivitas'))) return 9;
    if (l.includes('period') || l.includes('periode')) return 10;
    if (l.includes('group') || l.includes('kategori') || l.includes('category') || l.includes('dept')) return 11;
    return 20; // other custom columns
  };

  // Helper to normalize headers while preserving user-defined column order
  const normalizeAndOrderHeaders = useCallback((inputHeaders: string[]): string[] => {
    // 1. Remove redundant 'Progress' / 'progres' column and standardize aliases to English
    const filtered = (inputHeaders || []).filter(h => {
      const l = h.toLowerCase().trim();
      if (l.includes('progress') || l.includes('progres') || l.includes('capaian')) return false;
      return true;
    }).map(h => {
      const l = h.toLowerCase().trim();
      const clean = l.replace(/^[^a-z0-9]+/i, '').trim();
      if (clean.includes('completed') || clean.includes('completion') || clean.includes('aktual selesai') || clean === 'selesai' || clean.includes('waktu selesai') || clean.includes('tanggal selesai')) {
        return 'Completion Date';
      }
      if (clean.includes('due') || clean.includes('deadline') || clean.includes('target') || clean.includes('jatuh tempo') || clean.includes('batas waktu')) {
        return 'Due Date';
      }
      if (clean.includes('jenis kegiatan') || clean.includes('activity name')) {
        return 'Activity Name';
      }
      if (clean.includes('keterangan') || clean.includes('catatan') || clean.includes('deskripsi') || clean.includes('description')) {
        return 'Description';
      }
      return h;
    });

    // Deduplicate headers by semantic clean name
    const uniqueFiltered: string[] = [];
    filtered.forEach(h => {
      const cleanH = h.toLowerCase().replace(/^[^a-z0-9]+/i, '').trim();
      if (!uniqueFiltered.some(u => {
        const cleanU = u.toLowerCase().replace(/^[^a-z0-9]+/i, '').trim();
        return cleanU === cleanH;
      })) {
        uniqueFiltered.push(h);
      }
    });

    if (uniqueFiltered.length === 0) {
      return [
        'Number',
        'Activity Name',
        'Description',
        'Created Time',
        'Completion Date',
        'Due Date',
        'Status',
        'PIC',
        'Priority',
        'Period'
      ];
    }

    // Ensure 'Number' exists at the beginning
    const hasNumber = uniqueFiltered.some(h => {
      const l = h.toLowerCase().trim();
      return l === 'number' || l === 'no' || l === 'no.' || l === '#';
    });

    const headersWithNumber = hasNumber ? uniqueFiltered : ['Number', ...uniqueFiltered];

    // Ensure 'Created Time' exists
    const hasCreatedTime = headersWithNumber.some(h => {
      const l = h.toLowerCase().trim();
      return l.includes('created') || l.includes('tanggal dibuat') || l.includes('waktu dibuat') || l === 'dibuat';
    });

    // Place 'Created Time' right after Keterangan or Jenis Kegiatan if missing
    let headersWithCreated = headersWithNumber;
    if (!hasCreatedTime) {
      const ketIdx = headersWithNumber.findIndex(h => {
        const l = h.toLowerCase().trim();
        return l.includes('keterangan') || l.includes('catatan') || l.includes('deskripsi') || l.includes('description') || l.includes('rincian');
      });
      if (ketIdx !== -1) {
        headersWithCreated = [
          ...headersWithNumber.slice(0, ketIdx + 1),
          'Created Time',
          ...headersWithNumber.slice(ketIdx + 1)
        ];
      } else {
        headersWithCreated = [...headersWithNumber, 'Created Time'];
      }
    }

    // Ensure 'Completion Date' exists
    const hasCompleted = headersWithCreated.some(h => {
      const l = h.toLowerCase().trim();
      return l.includes('completed') || l.includes('completion') || l.includes('aktual selesai') || l === 'selesai' || l.includes('waktu selesai') || l.includes('tanggal selesai');
    });

    let headersWithCompleted = headersWithCreated;
    if (!hasCompleted) {
      const createdIdx = headersWithCreated.findIndex(h => h.toLowerCase().includes('created'));
      if (createdIdx !== -1) {
        headersWithCompleted = [
          ...headersWithCreated.slice(0, createdIdx + 1),
          'Completion Date',
          ...headersWithCreated.slice(createdIdx + 1)
        ];
      } else {
        headersWithCompleted = [...headersWithCreated, 'Completion Date'];
      }
    }

    // Ensure 'Due Date' exists (Mandatory column for KPI parameter)
    const hasDueDate = headersWithCompleted.some(h => {
      const l = h.toLowerCase().trim();
      return l.includes('due') || l.includes('deadline') || l.includes('target') || l.includes('jatuh tempo') || l.includes('batas waktu');
    });

    let finalHeaders = headersWithCompleted;
    if (!hasDueDate) {
      const compIdx = headersWithCompleted.findIndex(h => {
        const l = h.toLowerCase().trim();
        return l.includes('selesai') || l.includes('completed') || l.includes('completion');
      });
      if (compIdx !== -1) {
        finalHeaders = [
          ...headersWithCompleted.slice(0, compIdx + 1),
          'Due Date',
          ...headersWithCompleted.slice(compIdx + 1)
        ];
      } else {
        const createdIdx = headersWithCompleted.findIndex(h => h.toLowerCase().includes('created'));
        if (createdIdx !== -1) {
          finalHeaders = [
            ...headersWithCompleted.slice(0, createdIdx + 1),
            'Due Date',
            ...headersWithCompleted.slice(createdIdx + 1)
          ];
        } else {
          finalHeaders = [...headersWithCompleted, 'Due Date'];
        }
      }
    }

    // Ensure 'Remarks' exists next to 'Completion Date' (Evaluasi Batas Waktu: On Time vs Late)
    const hasRemarks = finalHeaders.some(h => {
      const l = h.toLowerCase().trim();
      return l === 'remarks' || l === 'keterangan batas waktu';
    });

    if (!hasRemarks) {
      const compIdx = finalHeaders.findIndex(h => {
        const l = h.toLowerCase().trim();
        return l.includes('completed') || l.includes('completion') || l.includes('aktual selesai') || l === 'selesai' || l.includes('waktu selesai') || l.includes('tanggal selesai');
      });
      if (compIdx !== -1) {
        finalHeaders = [
          ...finalHeaders.slice(0, compIdx + 1),
          'Remarks',
          ...finalHeaders.slice(compIdx + 1)
        ];
      } else {
        const dueIdx = finalHeaders.findIndex(h => {
          const l = h.toLowerCase().trim();
          return l.includes('due') || l.includes('deadline') || l.includes('target');
        });
        if (dueIdx !== -1) {
          finalHeaders = [
            ...finalHeaders.slice(0, dueIdx),
            'Remarks',
            ...finalHeaders.slice(dueIdx)
          ];
        } else {
          finalHeaders = [...finalHeaders, 'Remarks'];
        }
      }
    }

    // Jaga urutan custom/manual pengguna, jangan dipaksa disortir otomatis ulang
    return finalHeaders;
  }, []);

  // Dynamic Table Headers State (Allows Adding, Deleting, and Reordering Columns)
  const [tableHeaders, setTableHeaders] = useState<string[]>(() => {
    return normalizeAndOrderHeaders(headers || []);
  });

  useEffect(() => {
    if (headers && headers.length > 0) {
      const normalized = normalizeAndOrderHeaders(headers);
      setTableHeaders(prev => {
        // Jangan timpa urutan jika jumlah dan nama kolom sama
        if (prev.length === normalized.length && prev.every(p => normalized.includes(p))) {
          return prev;
        }
        return normalized;
      });
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

  // Ensure Progress, redundant Kategori, and hiddenColumns are never rendered in displayHeaders
  // (Due Date is mandatory and always visible for KPI SLA tracking)
  const displayHeaders = useMemo(() => {
    const raw = tableHeaders.filter(h => {
      const l = h.toLowerCase().trim();
      const clean = l.replace(/^[^a-z0-9]+/i, '').trim();

      // Core mandatory columns CANNOT be hidden under any circumstances
      const isCoreMandatory = 
        l === 'number' || l === 'no' || l === '#' ||
        clean.includes('activity name') || clean.includes('jenis kegiatan') || clean === 'task' || clean === 'judul' || clean === 'name' || clean === 'title' ||
        clean.includes('keterangan') || clean.includes('description') || clean.includes('deskripsi') || clean.includes('catatan') ||
        clean.includes('status');

      if (!isCoreMandatory && hiddenColumns.some(hc => hc.toLowerCase().trim() === l)) return false;
      if (l.includes('due') || l.includes('deadline') || l.includes('target') || l.includes('jatuh tempo') || l.includes('batas waktu')) return true;
      return !l.includes('progress') && !l.includes('progres') && !l.includes('capaian') &&
             !l.includes('kategori') && !l.includes('category');
    });

    // Deduplicate semantically to prevent duplicate Completion Date / Tanggal Selesai or Activity Name
    const seen = new Set<string>();
    const deduplicated: string[] = [];
    for (const h of raw) {
      const clean = h.toLowerCase().replace(/^[^a-z0-9]+/i, '').trim();
      let semanticKey = clean;
      if (clean.includes('tanggal selesai') || clean.includes('completed') || clean.includes('completion') || clean === 'selesai' || clean.includes('waktu selesai')) {
        semanticKey = 'completion date';
      } else if (clean.includes('activity name') || clean.includes('jenis kegiatan') || clean === 'task' || clean === 'judul' || clean === 'name' || clean === 'title' || clean === 'nama' || clean === 'materi') {
        semanticKey = 'activity name';
      } else if (clean.includes('keterangan') || clean.includes('catatan') || clean.includes('deskripsi') || clean.includes('description')) {
        semanticKey = 'description';
      }
      if (!seen.has(semanticKey)) {
        seen.add(semanticKey);
        deduplicated.push(h);
      }
    }

    // Emergency Failsafe Recovery: If hiddenColumns or filtering somehow reduced visible columns to <= 1
    if (deduplicated.length <= 1 && tableHeaders.length > 1) {
      const fallbackSeen = new Set<string>();
      const recovered: string[] = [];
      for (const h of tableHeaders) {
        const l = h.toLowerCase().trim();
        if (l.includes('progress') || l.includes('progres') || l.includes('kategori') || l.includes('category')) continue;
        const clean = l.replace(/^[^a-z0-9]+/i, '').trim();
        let semanticKey = clean;
        if (clean.includes('tanggal selesai') || clean.includes('completed') || clean.includes('completion') || clean === 'selesai') {
          semanticKey = 'completion date';
        } else if (clean.includes('activity name') || clean.includes('jenis kegiatan') || clean === 'task' || clean === 'judul' || clean === 'name') {
          semanticKey = 'activity name';
        } else if (clean.includes('keterangan') || clean.includes('catatan') || clean.includes('deskripsi') || clean.includes('description')) {
          semanticKey = 'description';
        }
        if (!fallbackSeen.has(semanticKey)) {
          fallbackSeen.add(semanticKey);
          recovered.push(h);
        }
      }
      if (recovered.length > deduplicated.length) return recovered;
    }

    return deduplicated;
  }, [tableHeaders, hiddenColumns]);

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
    // If this column is hidden, unhide it and show to user
    if (hiddenColumns.some(hc => hc.toLowerCase() === trimmed.toLowerCase())) {
      handleToggleHideColumn(trimmed);
      setShowAddColumnPopover(false);
      setCustomColumnName('');
      return;
    }
    if (tableHeaders.some(h => h.toLowerCase() === trimmed.toLowerCase())) {
      toast.warning(`Kolom "${trimmed}" sudah ada di tabel`);
      return;
    }

    const updatedHeaders = [...tableHeaders, trimmed];
    setTableHeaders(updatedHeaders);
    const updated = localRows.map(r => ({ ...r, [trimmed]: defaultValue }));
    setLocalRows(updated);

    const updatedDisplayHeaders = updatedHeaders.filter(h => {
      const l = h.toLowerCase().trim();
      return !l.includes('progress') && !l.includes('progres') && !l.includes('capaian') &&
             !l.includes('target') && !l.includes('deadline') && !l.includes('jatuh tempo') &&
             !l.includes('kategori') && !l.includes('category');
    });

    onRowsChange?.(updated);
    saveTableToBackend(updated, updatedDisplayHeaders);
    setShowAddColumnPopover(false);
    setCustomColumnName('');
    toast.success(`Kolom "${trimmed}" berhasil ditambahkan ke tabel!`);
  };

  const handleDeleteColumn = async (colName: string) => {
    const colLower = colName.toLowerCase().trim();
    if (colLower === 'number' || colLower === 'no') {
      toast.error('Kolom Nomor (#) tidak dapat dihapus');
      return;
    }
    if (colLower.includes('jenis kegiatan') || colLower === 'task' || colLower === 'judul' || colLower === 'name') {
      toast.error('Kolom Judul/Kegiatan adalah kolom utama dan tidak dapat dihapus');
      return;
    }

    // Proteksi Kolom Wajib: Sembunyikan (Hide) bukan Hapus (Delete) agar data detail task tidak hilang / tereset
    const isMandatoryCol = (c: string) => {
      const cl = c.toLowerCase().trim();
      return (
        cl === 'keterangan' || cl === 'description' || cl === 'rincian' ||
        cl === 'status' ||
        cl === 'pic' || cl === 'assignee' ||
        cl === 'priority' || cl === 'prioritas' ||
        cl.includes('routine') || cl === 'activity' || cl === 'period' ||
        cl.includes('created') || cl.includes('selesai') || cl.includes('modified') ||
        cl.includes('due') || cl.includes('deadline') || cl.includes('target') || cl.includes('jatuh tempo') || cl.includes('batas waktu')
      );
    };

    if (isMandatoryCol(colName)) {
      if (colLower.includes('due') || colLower.includes('deadline') || colLower.includes('target') || colLower.includes('jatuh tempo') || colLower.includes('batas waktu')) {
        toast.error('Kolom "Due Date" adalah kolom wajib dan parameter KPI SLA. Tidak dapat dihapus.');
        return;
      }
      handleToggleHideColumn(colName);
      toast.info(`Kolom wajib "${colName}" disembunyikan (bukan dihapus) agar data detail task tetap aman.`);
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus kolom "${colName}" dari tabel?`)) {
      return;
    }

    const updatedHeaders = tableHeaders.filter(h => h !== colName);
    setTableHeaders(updatedHeaders);

    // Hapus juga kunci kolom ini dari setiap baris di localRows
    const updatedRows = localRows.map(r => {
      const copy = { ...r };
      delete copy[colName];
      return copy;
    });
    setLocalRows(updatedRows);

    const updatedDisplayHeaders = updatedHeaders.filter(h => {
      const l = h.toLowerCase().trim();
      return !l.includes('progress') && !l.includes('progres') && !l.includes('capaian') &&
             !l.includes('target') && !l.includes('deadline') && !l.includes('jatuh tempo') &&
             !l.includes('kategori') && !l.includes('category');
    });

    onRowsChange?.(updatedRows);
    await saveTableToBackend(updatedRows, updatedDisplayHeaders);
    toast.info(`Kolom "${colName}" telah dihapus.`);
  };

  const handleMoveColumn = async (colName: string, direction: 'left' | 'right') => {
    const idx = tableHeaders.indexOf(colName);
    if (idx === -1) return;

    // Prevent moving 'number' or moving to/before 'number' (keep index 0 for number)
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx <= 0 || targetIdx >= tableHeaders.length) return;

    const newHeaders = [...tableHeaders];
    const [moved] = newHeaders.splice(idx, 1);
    newHeaders.splice(targetIdx, 0, moved);

    setTableHeaders(newHeaders);

    const newDisplayHeaders = newHeaders.filter(h => {
      const l = h.toLowerCase().trim();
      return !l.includes('progress') && !l.includes('progres') && !l.includes('capaian') &&
             !l.includes('target') && !l.includes('deadline') && !l.includes('jatuh tempo') &&
             !l.includes('kategori') && !l.includes('category');
    });

    onRowsChange?.(localRows);
    await saveTableToBackend(localRows, newDisplayHeaders);
    toast.success(`Kolom "${colName}" digeser ke ${direction === 'left' ? 'kiri' : 'kanan'}`);
  };

  const handleResetColumnOrder = async () => {
    // Terapkan standard Notion order hanya ketika tombol ini ditekan secara eksplisit
    const normalized = [...tableHeaders].sort((a, b) => getColOrder(a) - getColOrder(b));
    setTableHeaders(normalized);
    setColumnWidths({});
    try {
      localStorage.removeItem(tableStorageKey);
    } catch {}

    const newDisplayHeaders = normalized.filter(h => {
      const l = h.toLowerCase().trim();
      return !l.includes('progress') && !l.includes('progres') && !l.includes('capaian') &&
             !l.includes('target') && !l.includes('deadline') && !l.includes('jatuh tempo') &&
             !l.includes('kategori') && !l.includes('category');
    });

    onRowsChange?.(localRows);
    await saveTableToBackend(localRows, newDisplayHeaders);
    toast.success('Urutan dan lebar kolom berhasil dirapikan sesuai standar Notion!');
  };

  // Auto open topic drawer if initialTopicTitle is provided (e.g. from notification deep link)
  useEffect(() => {
    if (initialTopicTitle && localRows.length > 0) {
      const rawTitle = initialTopicTitle.trim();
      // Cegah pembukaan berulang jika topik ini sudah pernah dibuka secara otomatis
      if (consumedTopicRef.current === rawTitle) return;

      let cleanTitle = rawTitle;
      let detectedSubPeriod = '';
      if (cleanTitle.includes(' - ')) {
        const parts = cleanTitle.split(' - ');
        cleanTitle = parts[0].trim();
        detectedSubPeriod = parts.slice(1).join(' - ').trim();
      }
      const targetT = cleanTitle.toLowerCase().trim();
      const match = localRows.find(r => {
        const rawT = getRowVal(r, 'Jenis kegiatan') || getRowVal(r, 'Name') || getRowVal(r, 'Judul') || getRowVal(r, 'keterangan') || '';
        const dispT = getDisplayTitle(rawT).toLowerCase().trim();
        const strippedT = stripColorTags(dispT).toLowerCase().trim();
        return strippedT === targetT ||
               strippedT.includes(targetT) ||
               targetT.includes(strippedT) ||
               rawT.toLowerCase().includes(targetT);
      });
      if (match) {
        consumedTopicRef.current = rawTitle;
        setSelectedRow(match);
        if (detectedSubPeriod) {
          setActiveSubPeriod(detectedSubPeriod);
        }
      }
    }
  }, [initialTopicTitle, localRows, getRowVal]);

  // Helper to ensure both Keterangan, Description, and any matching column are kept 100% in sync
  const setRowDescription = useCallback((targetRow: TableRowData, textVal: string) => {
    const val = textVal || '-';
    targetRow['Keterangan'] = val;
    targetRow['Description'] = val;
    targetRow['Deskripsi'] = val;
    for (const k of Object.keys(targetRow)) {
      const kl = k.toLowerCase().trim();
      if (
        kl.includes('keterangan') || 
        kl.includes('description') || 
        kl.includes('deskripsi') || 
        kl.includes('catatan') || 
        kl.includes('rincian')
      ) {
        targetRow[k] = val;
      }
    }
    displayHeaders.forEach(h => {
      const hl = h.toLowerCase().trim();
      if (
        hl.includes('keterangan') || 
        hl.includes('description') || 
        hl.includes('deskripsi') || 
        hl.includes('catatan') || 
        hl.includes('rincian')
      ) {
        targetRow[h] = val;
      }
    });
  }, [displayHeaders]);

  // Logbook Parent Task Metrics for Enterprise Focus Mode
  const logbookTaskCounts = useMemo(() => {
    let active = 0;
    let closed = 0;
    let total = 0;
    localRows.forEach(r => {
      if (!isSubItemRow(r)) {
        const title = (getRowVal(r, 'Jenis kegiatan') || getRowVal(r, 'Name') || getRowVal(r, 'Judul') || '').trim();
        if (title.length > 0) {
          total++;
          const status = (getRowVal(r, 'Status') || '').toUpperCase().trim();
          const isClosed = status.includes('CLOSE') || status.includes('SELESAI') || status.includes('DONE') || status.includes('RESOLVED');
          if (isClosed) {
            closed++;
          } else {
            active++;
          }
        }
      }
    });
    return { active, closed, total };
  }, [localRows, getRowVal]);

  // Task & KPI Delivery Metrics (KPI SLA & On-time performance)
  const kpiMetrics = useMemo(() => {
    let totalPlanned = 0;
    let onTimeCount = 0;
    let overdueCount = 0;
    let dueTodayCount = 0;
    let unsetDueCount = 0;

    localRows.forEach(r => {
      if (!isSubItemRow(r)) {
        const title = (getRowVal(r, 'Jenis kegiatan') || getRowVal(r, 'Name') || getRowVal(r, 'Judul') || '').trim();
        if (title.length > 0) {
          totalPlanned++;
          const dueVal = getRowVal(r, 'Due Date') || getRowVal(r, 'Deadline') || getRowVal(r, 'Target Selesai');
          const compVal = getRowVal(r, 'Tanggal Selesai') || getRowVal(r, 'Completed Time');
          const statusVal = getRowVal(r, 'Status');
          const calc = calculateTaskKpiStatus(dueVal, compVal, statusVal);

          if (calc.status === 'ON_TIME') onTimeCount++;
          else if (calc.status === 'OVERDUE') overdueCount++;
          else if (calc.status === 'DUE_TODAY') dueTodayCount++;
          else if (calc.status === 'UNSET') unsetDueCount++;
        }
      }
    });

    const evaluatedTasks = onTimeCount + overdueCount;
    const onTimeRate = evaluatedTasks > 0 ? Math.round((onTimeCount / evaluatedTasks) * 100) : 100;

    return {
      totalPlanned,
      onTimeCount,
      overdueCount,
      dueTodayCount,
      unsetDueCount,
      onTimeRate
    };
  }, [localRows, getRowVal]);

  // Helper to determine real numeric post ID (fallback to row's _originPostId for aggregated/virtual views)
  const getEffectivePostId = useCallback((targetRow?: TableRowData | null): number | null => {
    if (typeof postId === 'number' && !isNaN(postId)) return postId;
    if (typeof postId === 'string' && /^\d+$/.test(postId.trim())) {
      const p = parseInt(postId.trim(), 10);
      if (!isNaN(p)) return p;
    }
    const rowCandidate = targetRow || selectedRow;
    const origin = rowCandidate?._originPostId;
    if (origin) {
      const p = parseInt(String(origin).trim(), 10);
      if (!isNaN(p)) return p;
    }
    return null;
  }, [postId, selectedRow]);

  // Fetch comments from backend
  const fetchComments = useCallback(async (overridePostId?: number | null) => {
    const targetPostId = overridePostId !== undefined ? overridePostId : getEffectivePostId();
    if (!targetPostId) return;
    try {
      setCommentsLoading(true);
      const res = await fetch(`/api/bulletin/${targetPostId}/comments`);
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        setAllComments(json.data);
      }
    } catch (e) {
      console.error('Failed to load topic comments:', e);
    } finally {
      setCommentsLoading(false);
    }
  }, [getEffectivePostId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Comment counts per topic title, task ID, and clean title (aggregates sub-periods to base topic as well)
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

        // Extracted task-id from HTML comments in topicTitle
        const taskMatch = c.topicTitle.match(/<!--task-id:([^>]+)-->/);
        if (taskMatch) {
          const tId = taskMatch[1].toLowerCase().trim();
          map[tId] = (map[tId] || 0) + 1;
        }

        // Extracted parent-id from HTML comments in topicTitle
        const parentMatch = c.topicTitle.match(/<!--parent-id:([^>]+)-->/);
        if (parentMatch) {
          const pId = parentMatch[1].toLowerCase().trim();
          map[`parent_${pId}`] = (map[`parent_${pId}`] || 0) + 1;
        }

        // Clean display title (stripped of ↳, [ ], [x], and all HTML comments)
        const cleanTitle = getDisplayTitle(c.topicTitle).toLowerCase().trim();
        if (cleanTitle) {
          map[cleanTitle] = (map[cleanTitle] || 0) + 1;
          if (cleanTitle.includes(' - ')) {
            const baseClean = cleanTitle.split(' - ')[0].trim();
            map[baseClean] = (map[baseClean] || 0) + 1;
          }
        }
      }
      if (c.topicId) {
        const idKey = c.topicId.toLowerCase().trim();
        map[idKey] = (map[idKey] || 0) + 1;
        const tidMatch = c.topicId.match(/task-id:([^>]+)/);
        if (tidMatch) {
          map[tidMatch[1].toLowerCase().trim()] = (map[tidMatch[1].toLowerCase().trim()] || 0) + 1;
        }
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
    const cleanRowTitle = getDisplayTitle(baseTopicTitle).toLowerCase().trim();
    const cleanSelTitle = getDisplayTitle(selectedTopicTitle).toLowerCase().trim();

    return allComments.filter((c) => {
      const cTopic = (c.topicTitle || '').toLowerCase().trim();
      const cTopicId = (c.topicId || '').toLowerCase().trim();
      const cCleanTitle = getDisplayTitle(c.topicTitle || '').toLowerCase().trim();

      // 1. Direct Task ID match (both from explicit topicId and extracted from HTML comment <!--task-id:...-->)
      if (rowId) {
        if (cTopicId === rowId) return true;
        if (cTopicId.includes(rowId)) return true;
        const taskMatch = (c.topicTitle || '').match(/<!--task-id:([^>]+)-->/);
        if (taskMatch && taskMatch[1].toLowerCase().trim() === rowId) return true;
      }

      // 2. Clean Title match (resilient against checkbox toggle [ ] <-> [x], ↳ prefix, and <!--last-modified:...--> changes)
      if (cleanSelTitle && cCleanTitle === cleanSelTitle) return true;
      if (cleanRowTitle && cCleanTitle === cleanRowTitle) return true;
      if (cleanRowTitle && (cCleanTitle.startsWith(`${cleanRowTitle} - `) || cCleanTitle.startsWith(`${cleanRowTitle}  - `))) return true;

      // Base title match (strip sub-period date suffix like " - 15 Okt 2026")
      const baseOfCClean = cCleanTitle.split(' - ')[0].trim();
      if (cleanRowTitle && baseOfCClean === cleanRowTitle) return true;

      // 3. Fallback raw string match
      if (selQ && cTopic === selQ) return true;
      if (baseQ && cTopic === baseQ) return true;

      // 4. If selected row is a parent item, also include comments belonging to its child subtasks
      if (rowId && !selectedRow?.parentId) {
        const parentMatch = (c.topicTitle || '').match(/<!--parent-id:([^>]+)-->/);
        if (parentMatch && parentMatch[1].toLowerCase().trim() === rowId) return true;
      }

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

  // Filter khusus lampiran gambar dari komentar topik untuk mode galeri lightbox
  const imageGalleryList = useMemo(() => {
    return galleryItems
      .filter((item) => item.attachment.isImage)
      .map((item) => {
        const att = item.attachment;
        return {
          url: att.directUrl || att.url,
          title: att.caption ? `${att.name} — "${att.caption}"` : att.name,
          driveViewUrl: att.driveViewUrl,
          driveDownloadUrl: att.driveDownloadUrl
        };
      });
  }, [galleryItems]);

  // Handler seragam untuk preview attachment (gambar via ImageModal dengan gallery list, dokumen via tab baru)
  const handlePreviewAttachment = (
    att: CommentAttachmentItem,
    contextImages?: Array<{ name?: string; url?: string; previewUrl?: string; isImage?: boolean; directUrl?: string; driveViewUrl?: string; driveDownloadUrl?: string; caption?: string }>
  ) => {
    if (att.isImage) {
      const targetUrl = att.previewUrl || att.directUrl || att.url;
      const targetDriveId = att.id || extractDriveId(targetUrl);

      // Gunakan contextImages jika disediakan (misal dari foto-foto yang sedang ter-paste di selectedFiles atau grup attachment)
      const activeGallery = (contextImages && contextImages.length > 0)
        ? contextImages
            .filter((f) => f.isImage !== false)
            .map((f) => {
              const u = f.previewUrl || f.directUrl || f.url || '';
              const dId = extractDriveId(u);
              return {
                url: u,
                title: f.caption ? `${f.name || 'Foto'} — "${f.caption}"` : (f.name || 'Foto'),
                driveViewUrl: f.driveViewUrl || (dId ? `https://drive.google.com/file/d/${dId}/view?usp=sharing` : undefined),
                driveDownloadUrl: f.driveDownloadUrl || (dId ? `https://drive.google.com/uc?id=${dId}&export=download` : undefined)
              };
            })
        : imageGalleryList;

      const foundIdx = activeGallery.findIndex((img) => {
        if (img.url === targetUrl) return true;
        if (att.url && img.url === att.url) return true;
        if (att.previewUrl && img.url === att.previewUrl) return true;
        if (targetDriveId && (img.url.includes(targetDriveId) || (img.driveViewUrl && img.driveViewUrl.includes(targetDriveId)))) return true;
        if (att.driveViewUrl && img.driveViewUrl === att.driveViewUrl) return true;
        return false;
      });

      const currentIndex = foundIdx >= 0 ? foundIdx : 0;
      const fallbackItem = {
        url: targetUrl,
        title: att.caption ? `${att.name} — "${att.caption}"` : att.name,
        driveViewUrl: att.driveViewUrl,
        driveDownloadUrl: att.driveDownloadUrl
      };

      setPreviewImage({
        ...(foundIdx >= 0 ? activeGallery[foundIdx] : fallbackItem),
        images: activeGallery.length > 0 ? activeGallery : [fallbackItem],
        currentIndex: currentIndex
      });
    } else if (att.driveViewUrl) {
      window.open(att.driveViewUrl, '_blank');
    }
  };

  // Save changes to database
  const saveTableToBackend = async (newRows: TableRowData[], headersToSave?: string[]): Promise<boolean> => {
    if (!postId) return false;
    try {
      const preppedRows = newRows;
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

      // Two-way live sync for any rows aggregated from origin posts (Logbook Unified View)
      const rowsWithOrigin = normalizedRows.map(r => {
        if (!r._originPostId) {
          const resId = resolveOriginPostId(r, allPosts || [], section);
          if (resId) r._originPostId = resId;
        }
        return r;
      }).filter(r => r._originPostId);
      if (rowsWithOrigin.length > 0 && allPosts && allPosts.length > 0) {
        // Group by _originPostId to eliminate race conditions and synchronize parent & subtasks in batch
        const originGroups = new Map<string, TableRowData[]>();
        for (const row of rowsWithOrigin) {
          const originId = String(row._originPostId);
          if (!originGroups.has(originId)) {
            originGroups.set(originId, []);
          }
          originGroups.get(originId)!.push(row);
        }

        Promise.all(
          Array.from(originGroups.entries()).map(([originId, groupedRows]) =>
            syncLogbookRowsGroupToOrigin(originId, groupedRows, allPosts)
          )
        ).catch(err => {
          console.warn('[Logbook Sync] Error syncing back to origin posts:', err);
        });
      }

      const targetHeaders = headersToSave || displayHeaders;
      const updatedMarkdown = serializeMarkdownTable(targetHeaders, normalizedRows, beforeText, afterText);

      // If postId is a real numeric post ID (or numeric string), persist to backend API
      if (typeof postId === 'number' || (typeof postId === 'string' && /^\d+$/.test(postId))) {
        const res = await fetch(`/api/bulletin/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: updatedMarkdown })
        });
        if (res.ok) {
          onPostContentUpdate?.(updatedMarkdown);
          return true;
        }
      } else {
        // Synthetic / virtual post ID (e.g. logbook-preparasi), persist to localStorage & notify parent state
        const postIdStr = String(postId || '');
        if (postIdStr.startsWith('logbook-')) {
          try {
            localStorage.setItem(`preplab_logbook_content_${postIdStr}`, updatedMarkdown);
          } catch {}
        }
        onPostContentUpdate?.(updatedMarkdown);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to persist table markdown to backend:', err);
      return false;
    }
  };

  // Reconcile open/closed findings between /api/tickets and Labnote tasks
  const reconcileFindingsWithTickets = useCallback(async () => {
    if (isReconcilingRef.current) return;
    isReconcilingRef.current = true;
    try {
      const res = await fetch('/api/tickets');
      if (!res.ok) return;
      const allTickets: any[] = await res.json();
      if (!Array.isArray(allTickets)) return;

      setLocalRows(currentRows => {
        let hasChanges = false;
        const nextRows = [...currentRows];

        // 1. Process "Review temuan SAP"
        const sapParentIdx = nextRows.findIndex(r => 
          !isSubItemRow(r) && (
            (getRowVal(r, 'Jenis kegiatan') || getRowVal(r, 'Name') || '').toLowerCase().includes('review temuan sap') ||
            (r['Jenis kegiatan'] || r['Name'] || '').toLowerCase().includes('review temuan sap')
          )
        );

        // 2. Process "Review temuan inspeksi gabungan"
        const gabunganParentIdx = nextRows.findIndex(r => 
          !isSubItemRow(r) && (
            (getRowVal(r, 'Jenis kegiatan') || getRowVal(r, 'Name') || '').toLowerCase().includes('review temuan inspeksi gabungan') ||
            (r['Jenis kegiatan'] || r['Name'] || '').toLowerCase().includes('review temuan inspeksi gabungan')
          )
        );

        if (sapParentIdx === -1 && gabunganParentIdx === -1) {
          return currentRows;
        }

        const syncParentWithTickets = (pIdx: number, targetTickets: any[], parentTitle: string) => {
          if (pIdx === -1) return;
          const parentRow = nextRows[pIdx];
          const rawParentTitle = getRowVal(parentRow, 'Jenis kegiatan') || getRowVal(parentRow, 'Name') || '';
          const parentTaskId = (rawParentTitle.match(/<!--task-id:([^>]+)-->/)?.[1]) || parentRow.id || `task_${Date.now()}`;

          // Find existing subtasks for this parent
          const existingSubIndices: number[] = [];
          for (let i = pIdx + 1; i < nextRows.length; i++) {
            if (isSubItemRow(nextRows[i])) {
              existingSubIndices.push(i);
            } else {
              break;
            }
          }

          const existingTicketMap = new Map<string, number>();
          existingSubIndices.forEach(idx => {
            const row = nextRows[idx];
            const tId = extractLinkedTicketId(row);
            if (tId) {
              existingTicketMap.set(tId.toUpperCase(), idx);
            }
          });

          const openTickets = targetTickets.filter(t => (t.status || '').toUpperCase() !== 'CLOSED');
          const closedTickets = targetTickets.filter(t => (t.status || '').toUpperCase() === 'CLOSED');

          // A. Mark completed subtasks and backfill metadata (Created Time, Due Date, Completion Date)
          targetTickets.forEach(t => {
            const sIdx = existingTicketMap.get(t.ticketId.toUpperCase());
            if (sIdx !== undefined) {
              const subRow = { ...nextRows[sIdx] };
              let rowChanged = false;

              // Backfill / Clean Created Time from ticket's actual creation date
              const rawCreated = t.date ? formatToDDMMYYYY(t.date) : (t.createdAt ? formatToDDMMYYYY(t.createdAt) : '');
              const createdDateFormatted = rawCreated ? (rawCreated.match(/^(\d{2}-\d{2}-\d{4})/)?.[1] || rawCreated) : '';
              const currentCreated = subRow['Created Time'] || subRow['Tanggal Dibuat'] || '';
              const needsCreatedCleanup = currentCreated.includes('T') || currentCreated.includes('Z') || currentCreated === '-' || !currentCreated;
              if (createdDateFormatted && needsCreatedCleanup) {
                subRow['Created Time'] = createdDateFormatted;
                subRow['Tanggal Dibuat'] = createdDateFormatted;
                rowChanged = true;
              }

              // Backfill Due Date if missing
              if (t.targetDate && (!subRow['Due Date'] || subRow['Due Date'] === '-' || !subRow['Batas Waktu'] || subRow['Batas Waktu'] === '-')) {
                const dueFormatted = formatToDDMMYYYY(t.targetDate);
                subRow['Due Date'] = dueFormatted;
                subRow['Batas Waktu'] = dueFormatted;
                rowChanged = true;
              }

              // Mark completed for closed tickets
              const isClosed = (t.status || '').toUpperCase() === 'CLOSED';
              if (isClosed && !isSubItemCompleted(subRow)) {
                subRow.isCompleted = 'true';
                subRow.Status = 'Closed';
                const titleVal = getRowVal(subRow, 'Jenis kegiatan') || getRowVal(subRow, 'Name') || '';
                const cleanT = getDisplayTitle(titleVal);
                const newT = `↳ [x] ${cleanT}`;
                if (subRow['Jenis kegiatan'] !== undefined) subRow['Jenis kegiatan'] = newT;
                if (subRow['Jenis Kegiatan'] !== undefined) subRow['Jenis Kegiatan'] = newT;
                if (subRow['Name'] !== undefined) subRow['Name'] = newT;
                rowChanged = true;
              }

              // Backfill Completion Date if ticket is closed and date exists
              if (isClosed && t.completionDate && (!subRow['Completion Date'] || subRow['Completion Date'] === '-' || !subRow['Tanggal Selesai'] || subRow['Tanggal Selesai'] === '-')) {
                const compFormatted = formatToDDMMYYYY(t.completionDate);
                subRow['Completion Date'] = compFormatted;
                subRow['Tanggal Selesai'] = compFormatted;
                rowChanged = true;
              }

              // Preserve and two-way sync PIC: If subRow has PIC and ticket does not, sync to ticket; if ticket has PIC and subRow is empty, backfill subRow
              const subPic = subRow['PIC'] || '';
              const ticketPic = t.pic || '';
              if (ticketPic && (!subPic || subPic === '-')) {
                subRow['PIC'] = ticketPic;
                rowChanged = true;
              } else if (subPic && subPic !== '-' && !ticketPic) {
                // Ticket in DB hasn't received PIC yet, update it
                fetch(`/api/tickets/${encodeURIComponent(t.ticketId)}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ pic: subPic })
                }).catch(() => {});
              }

              if (rowChanged) {
                nextRows[sIdx] = subRow;
                hasChanges = true;
              }
            }
          });

          // B. Add new subtasks for open tickets not yet in subtasks
          const newSubRowsToAdd: TableRowData[] = [];
          openTickets.forEach(t => {
            if (!existingTicketMap.has(t.ticketId.toUpperCase())) {
              const cleanDesc = (t.description || '').replace(/\r?\n/g, ' ').slice(0, 70);
              const subTitle = `↳ [ ] [${t.ticketId}] ${t.location ? t.location + ' - ' : ''}${cleanDesc} <!--link-type:ticket--> <!--link-id:${t.ticketId}--> <!--parent-id:${parentTaskId}-->`;
              const rawCreated = t.date ? formatToDDMMYYYY(t.date) : (t.createdAt ? formatToDDMMYYYY(t.createdAt) : getTodayDDMMYYYY());
              const createdDateFormatted = rawCreated.match(/^(\d{2}-\d{2}-\d{4})/)?.[1] || rawCreated;
              const newSubRow: TableRowData = {
                id: `sub_${parentTaskId}_${t.ticketId}_${Date.now()}`,
                'Jenis kegiatan': subTitle,
                'Jenis Kegiatan': subTitle,
                'Name': subTitle,
                'Activity Name': subTitle,
                'Keterangan': t.description || '-',
                'Description': t.description || '-',
                'PIC': t.pic || '-',
                'Priority': t.priority || t.risk || 'Normal',
                'Status': 'Open',
                'Tanggal Selesai': '-',
                'Completion Date': '-',
                'Created Time': createdDateFormatted,
                'Tanggal Dibuat': createdDateFormatted,
                'Remarks': '-',
                'Due Date': t.targetDate ? formatToDDMMYYYY(t.targetDate) : getTodayDDMMYYYY(),
                'Aktivitas': 'Daily',
                'isSubItem': 'true',
                'isCompleted': 'false',
                'parentId': parentTaskId,
                'parentRowId': parentTaskId,
                '_parentTitle': parentTitle
              };
              newSubRowsToAdd.push(newSubRow);
              hasChanges = true;
            }
          });

          if (newSubRowsToAdd.length > 0) {
            const insertPosition = existingSubIndices.length > 0
              ? existingSubIndices[existingSubIndices.length - 1] + 1
              : pIdx + 1;
            nextRows.splice(insertPosition, 0, ...newSubRowsToAdd);
          }
        };

        // Routine SAP tickets
        const sapTickets = allTickets.filter(t => 
          (t.source === 'inspeksi' || (t.ticketId || '').includes('SAP') || (t.ticketId || '').includes('W42Y26')) && 
          (t.category || '').toLowerCase() !== 'inspeksi gabungan' &&
          t.source !== 'sidak_management'
        );
        syncParentWithTickets(sapParentIdx, sapTickets, 'Review temuan SAP');

        // Inspeksi Gabungan / Sidak Management tickets
        const gabunganTickets = allTickets.filter(t => 
          (t.category || '').toLowerCase().includes('inspeksi gabungan') || 
          t.source === 'sidak_management'
        );
        syncParentWithTickets(gabunganParentIdx, gabunganTickets, 'Review temuan inspeksi gabungan');

        if (hasChanges) {
          saveTableToBackend(nextRows);
          onRowsChange?.(nextRows);
          return nextRows;
        }
        return currentRows;
      });
    } catch (err) {
      console.error('[Findings Reconciliation] Error:', err);
    } finally {
      isReconcilingRef.current = false;
    }
  }, [saveTableToBackend, onRowsChange, getRowVal]);

  // Real-time WebSocket sync for findings tickets
  useEffect(() => {
    reconcileFindingsWithTickets();

    const socket = getGlobalSocket();

    const handleTicketClosed = (payload: { ticketId: string }) => {
      if (!payload?.ticketId) return;
      const targetTkt = payload.ticketId.toUpperCase();
      setLocalRows(currentRows => {
        let modified = false;
        const nextRows = currentRows.map(row => {
          const tktId = extractLinkedTicketId(row);
          if (tktId && tktId.toUpperCase() === targetTkt) {
            if (!isSubItemCompleted(row)) {
              modified = true;
              const updated = { ...row };
              updated.isCompleted = 'true';
              updated.Status = 'Closed';
              const rawT = getRowVal(updated, 'Jenis kegiatan') || getRowVal(updated, 'Name') || '';
              const cleanT = getDisplayTitle(rawT);
              const newT = `↳ [x] ${cleanT}`;
              if (updated['Jenis kegiatan'] !== undefined) updated['Jenis kegiatan'] = newT;
              if (updated['Jenis Kegiatan'] !== undefined) updated['Jenis Kegiatan'] = newT;
              if (updated['Name'] !== undefined) updated['Name'] = newT;
              return updated;
            }
          }
          return row;
        });

        if (modified) {
          saveTableToBackend(nextRows);
          toast.info(`Temuan ${payload.ticketId} telah diselesaikan dari modul temuan. Subtask otomatis dicentang!`);
          return nextRows;
        }
        return currentRows;
      });
    };

    const handleTicketUpdated = () => {
      reconcileFindingsWithTickets();
    };

    socket.on('ticket:closed', handleTicketClosed);
    socket.on('ticket:updated', handleTicketUpdated);
    window.addEventListener('refresh-tickets', handleTicketUpdated);

    return () => {
      socket.off('ticket:closed', handleTicketClosed);
      socket.off('ticket:updated', handleTicketUpdated);
      window.removeEventListener('refresh-tickets', handleTicketUpdated);
    };
  }, [reconcileFindingsWithTickets, saveTableToBackend, getRowVal]);

  // Direct Complete Sub Row for Finding Resolution
  const handleDirectCompleteSubRow = async (rowIndex: number, updatedTicket?: any) => {
    const subRow = localRows[rowIndex];
    if (!subRow) return;

    const todayStr = getTodayDDMMYYYY();
    const nowIso = new Date().toISOString();
    const updatedRow = { ...subRow };
    updatedRow.isCompleted = 'true';
    updatedRow.Status = 'Closed';
    updatedRow['Last Modified'] = nowIso;

    let parentIdx = -1;
    for (let i = rowIndex - 1; i >= 0; i--) {
      if (!isSubItemRow(localRows[i])) {
        parentIdx = i;
        break;
      }
    }

    const setRowCompletedDate = (targetRow: TableRowData, dateVal: string) => {
      for (const k of Object.keys(targetRow)) {
        const kl = k.toLowerCase().trim();
        if (kl.includes('tanggal selesai') || kl.includes('completed') || kl.includes('aktual selesai') || kl === 'selesai' || kl.includes('waktu selesai')) {
          targetRow[k] = dateVal;
        }
      }
      displayHeaders.forEach(h => {
        const hl = h.toLowerCase().trim();
        if (hl.includes('tanggal selesai') || hl.includes('completed') || hl.includes('aktual selesai') || hl === 'selesai' || hl.includes('waktu selesai')) {
          targetRow[h] = dateVal;
        }
      });
      targetRow['Tanggal Selesai'] = dateVal;
    };
    setRowCompletedDate(updatedRow, todayStr);

    const currentTitle = getRowVal(subRow, 'Jenis kegiatan') || getRowVal(subRow, 'Jenis Kegiatan') || getRowVal(subRow, 'Name') || '';
    if (currentTitle) {
      const cleanTitle = getDisplayTitle(currentTitle);
      const newTitle = `↳ [x] ${cleanTitle}`;
      if (updatedRow['Jenis kegiatan'] !== undefined) updatedRow['Jenis kegiatan'] = newTitle;
      if (updatedRow['Jenis Kegiatan'] !== undefined) updatedRow['Jenis Kegiatan'] = newTitle;
      if (updatedRow['Name'] !== undefined) updatedRow['Name'] = newTitle;
      if (updatedRow['Judul'] !== undefined) updatedRow['Judul'] = newTitle;
    }

    const nextRows = [...localRows];
    nextRows[rowIndex] = updatedRow;

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
      parentRow['Last Modified'] = nowIso;
      const currentParentStatus = (getRowVal(parentRow, 'Status') || '').toUpperCase();

      if (!currentParentStatus.includes('CANCEL')) {
        if (totalSubs > 0 && completedSubs === totalSubs) {
          parentRow.Status = 'Closed';
          setRowCompletedDate(parentRow, todayStr);
        } else if (completedSubs > 0) {
          parentRow.Status = 'On Progress';
        }
      }
      nextRows[parentIdx] = parentRow;
    }

    setLocalRows(nextRows);
    onRowsChange?.(nextRows);
    await saveTableToBackend(nextRows);

    const pRow = parentIdx !== -1 ? nextRows[parentIdx] : null;
    const originId = updatedRow._originPostId || pRow?._originPostId || resolveOriginPostId(pRow || updatedRow, allPosts || [], section);
    if (originId && allPosts && allPosts.length > 0) {
      syncLogbookRowsGroupToOrigin(originId, pRow ? [pRow, updatedRow] : [updatedRow], allPosts);
    }

    toast.success('Temuan berhasil diselesaikan dan subtask telah dicentang!');
  };

  const handleFindingResolved = async (updatedTicket: any) => {
    const { subRowIndex } = findingResolutionModalState;
    setFindingResolutionModalState({ isOpen: false, ticket: null });

    if (subRowIndex !== undefined && subRowIndex >= 0 && subRowIndex < localRows.length) {
      handleDirectCompleteSubRow(subRowIndex, updatedTicket);
    } else {
      const tktId = updatedTicket?.ticketId;
      if (tktId) {
        const foundIdx = localRows.findIndex(r => {
          const id = extractLinkedTicketId(r);
          return id && id.toUpperCase() === tktId.toUpperCase();
        });
        if (foundIdx !== -1) {
          handleDirectCompleteSubRow(foundIdx, updatedTicket);
        }
      }
    }
  };

  const handleCreateFindingSuccess = async (newTicket: any) => {
    const { parentRowIndex, parentTaskId } = createFindingModalState;
    setCreateFindingModalState({ isOpen: false });

    let pIdx = parentRowIndex !== undefined && parentRowIndex >= 0 ? parentRowIndex : -1;
    if (pIdx === -1 || pIdx >= localRows.length) {
      pIdx = localRows.findIndex(r => 
        !isSubItemRow(r) && (
          (getRowVal(r, 'Jenis kegiatan') || getRowVal(r, 'Name') || '').toLowerCase().includes('review temuan inspeksi gabungan') ||
          (r['Jenis kegiatan'] || r['Name'] || '').toLowerCase().includes('review temuan inspeksi gabungan')
        )
      );
    }

    if (pIdx === -1) {
      toast.success(`Temuan Sidak Management (${newTicket.ticketId}) berhasil dibuat!`);
      return;
    }

    const parentRow = localRows[pIdx];
    const rawParentTitle = getRowVal(parentRow, 'Jenis kegiatan') || getRowVal(parentRow, 'Name') || '';
    const pTaskId = parentTaskId || (rawParentTitle.match(/<!--task-id:([^>]+)-->/)?.[1]) || parentRow.id || `task_${Date.now()}`;

    let insertIdx = pIdx + 1;
    while (insertIdx < localRows.length && isSubItemRow(localRows[insertIdx])) {
      insertIdx++;
    }

    const cleanDesc = (newTicket.description || '').replace(/\r?\n/g, ' ').slice(0, 70);
    const subTitle = `↳ [ ] [${newTicket.ticketId}] ${newTicket.location ? newTicket.location + ' - ' : ''}${cleanDesc} <!--link-type:ticket--> <!--link-id:${newTicket.ticketId}--> <!--parent-id:${pTaskId}-->`;
    const rawCreated = newTicket.date ? formatToDDMMYYYY(newTicket.date) : (newTicket.createdAt ? formatToDDMMYYYY(newTicket.createdAt) : getTodayDDMMYYYY());
    const createdDateFormatted = rawCreated.match(/^(\d{2}-\d{2}-\d{4})/)?.[1] || rawCreated;
    const newSubRow: TableRowData = {
      id: `sub_${pTaskId}_${newTicket.ticketId}_${Date.now()}`,
      'Jenis kegiatan': subTitle,
      'Jenis Kegiatan': subTitle,
      'Name': subTitle,
      'Activity Name': subTitle,
      'Keterangan': newTicket.description || '-',
      'Description': newTicket.description || '-',
      'PIC': newTicket.pic || '-',
      'Priority': newTicket.priority || 'Normal',
      'Status': 'Open',
      'Tanggal Selesai': '-',
      'Completion Date': '-',
      'Created Time': createdDateFormatted,
      'Tanggal Dibuat': createdDateFormatted,
      'Remarks': '-',
      'Due Date': newTicket.targetDate ? formatToDDMMYYYY(newTicket.targetDate) : getTodayDDMMYYYY(),
      'Aktivitas': 'Daily',
      'isSubItem': 'true',
      'isCompleted': 'false',
      'parentId': pTaskId,
      'parentRowId': pTaskId,
      '_parentTitle': 'Review temuan inspeksi gabungan'
    };

    const nextRows = [...localRows];
    nextRows.splice(insertIdx, 0, newSubRow);

    const pKey = parentRow.id || String(pIdx);
    setExpandedParents(prev => ({
      ...prev,
      [pIdx]: true,
      [pKey]: true
    }));

    setLocalRows(nextRows);
    onRowsChange?.(nextRows);
    await saveTableToBackend(nextRows);
    toast.success(`Temuan Sidak Management (${newTicket.ticketId}) berhasil dibuat dan ditambahkan ke subtask!`);
  };

  const handleSaveRowLink = async (linkInfo: LinkedModuleInfo | null) => {
    const { rowIndex } = linkModuleModalState;
    if (rowIndex < 0 || rowIndex >= localRows.length) {
      setLinkModuleModalState(prev => ({ ...prev, isOpen: false }));
      return;
    }

    const targetRow = { ...localRows[rowIndex] };
    const currentTitle = getRowVal(targetRow, 'Jenis kegiatan') || getRowVal(targetRow, 'Jenis Kegiatan') || getRowVal(targetRow, 'Name') || '';

    let cleanedTitle = currentTitle
      .replace(/<!--link-type:[^>]*-->/gi, '')
      .replace(/<!--link-id:[^>]*-->/gi, '')
      .replace(/<!--link-url:[^>]*-->/gi, '')
      .replace(/<!--link-label:[^>]*-->/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (linkInfo) {
      let metaTags = `<!--link-type:${linkInfo.type}-->`;
      if (linkInfo.id) metaTags += ` <!--link-id:${linkInfo.id}-->`;
      if (linkInfo.url) metaTags += ` <!--link-url:${linkInfo.url}-->`;
      if (linkInfo.label) metaTags += ` <!--link-label:${encodeURIComponent(linkInfo.label)}-->`;
      cleanedTitle = `${cleanedTitle} ${metaTags}`;
    }

    if (targetRow['Jenis kegiatan'] !== undefined) targetRow['Jenis kegiatan'] = cleanedTitle;
    if (targetRow['Jenis Kegiatan'] !== undefined) targetRow['Jenis Kegiatan'] = cleanedTitle;
    if (targetRow['Name'] !== undefined) targetRow['Name'] = cleanedTitle;
    if (targetRow['Judul'] !== undefined) targetRow['Judul'] = cleanedTitle;
    if (targetRow['Activity Name'] !== undefined) targetRow['Activity Name'] = cleanedTitle;

    const nextRows = [...localRows];
    nextRows[rowIndex] = targetRow;
    setLocalRows(nextRows);
    onRowsChange?.(nextRows);
    await saveTableToBackend(nextRows);

    setLinkModuleModalState(prev => ({ ...prev, isOpen: false }));
    toast.success(linkInfo ? 'Tautan modul berhasil disimpan!' : 'Tautan modul berhasil dihapus.');
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
      const wasPinned = isRowPinned(copy[targetRowIndex]);
      if (wasPinned) {
        targetRow.isPinned = 'true';
        (targetRow as any)._pinned = 'true';
      }

      const isDescCol = colLower.includes('keterangan') || colLower.includes('description') || colLower.includes('catatan') || colLower.includes('deskripsi') || colLower.includes('rincian');

      if (isDescCol && wasPinned) {
        let finalVal = newValue;
        if (!finalVal.includes('<!--pin-->')) {
          finalVal = `${finalVal} <!--pin-->`.trim();
        }
        setRowDescription(targetRow, finalVal);
      } else if (isDescCol) {
        setRowDescription(targetRow, newValue);
      } else {
        targetRow[keyToSet] = newValue;
      }

      if (colLower === 'jenis kegiatan' || colLower === 'judul' || colLower === 'task' || colLower === 'nama kegiatan' || colLower === 'activity name') {
        targetRow['Jenis kegiatan'] = newValue;
        targetRow['Jenis Kegiatan'] = newValue;
        if (targetRow['Activity Name'] !== undefined) targetRow['Activity Name'] = newValue;
      }

      // Smart Tasklist Auto-progress:
      // Otomatis open jika 0%, on progress jika progress berjalan (>0% & <100%), closed ketika 100%
      if (isDescCol) {
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
            targetRow[compKey] = dates.length > 0 ? formatToDDMMYYYY(dates[dates.length - 1]) : getTodayDDMMYYYY();
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

        const isClosedStatus = stUpper.includes('CLOSE') || stUpper.includes('SELESAI') || stUpper.includes('DONE');
        
        // Sync checklist indicator for subtask title
        const currentTitle = targetRow['Jenis kegiatan'] || targetRow['Activity Name'] || '';
        if (currentTitle.startsWith('↳')) {
          const nextTitle = isClosedStatus 
            ? currentTitle.replace(/↳\s*\[\s*\]/, '↳ [x]')
            : currentTitle.replace(/↳\s*\[x\]/i, '↳ [ ]');
          targetRow['Jenis kegiatan'] = nextTitle;
          if (targetRow['Activity Name'] !== undefined) targetRow['Activity Name'] = nextTitle;
        }

        // Sync status to linked inspection ticket
        const linkedTicketId = extractLinkedTicketId(targetRow);
        if (linkedTicketId) {
          fetch(`/api/tickets/${encodeURIComponent(linkedTicketId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              status: isClosedStatus ? 'Closed' : newValue,
              completionDate: isClosedStatus ? (targetRow[compKey] || getTodayDDMMYYYY()) : null
            })
          }).catch(err => console.warn('[Status Sync] Failed to update ticket status:', err));
        }

        if (stUpper.includes('CLOSE') || stUpper.includes('SELESAI') || stUpper.includes('DONE')) {
          const curVal = targetRow[compKey];
          if (!curVal || curVal === '-') {
            targetRow[compKey] = getTodayDDMMYYYY();
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

      // Auto-sync PIC update to backend inspection ticket if this row is a linked finding
      if (colLower === 'pic' || colLower.includes('assignee')) {
        targetRow['PIC'] = newValue;
        const linkedTicketId = extractLinkedTicketId(targetRow);
        if (linkedTicketId) {
          fetch(`/api/tickets/${encodeURIComponent(linkedTicketId)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pic: newValue === '-' ? '' : newValue })
          }).catch(err => console.warn('[PIC Sync] Failed to update ticket PIC:', err));
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
    const effectiveTargetPostId = getEffectivePostId();
    if (effectiveTargetPostId && baseTopic) {
      try {
        await fetch(`/api/bulletin/${effectiveTargetPostId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId: effectiveTargetPostId,
            topicTitle: `${baseTopic} - ${nextPeriod}`,
            content: `🎯 Periode baru **${nextPeriod}** telah dibuka dengan target penyelesaian ${nextTargetDate}. Seluruh checklist subtask telah siap kembali.`,
            authorNik: currentAuthorNik || 'SYSTEM',
            authorName: currentAuthorName || 'Sistem Routine',
            statusUpdate: 'Open'
          })
        });
        fetchComments(effectiveTargetPostId);
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

  // Open Manual Row Modal (Buka Form Input Tabel Lengkap)
  const handleOpenManualRowModal = () => {
    setSelectedRow(null);
    const targetCat = section || 'Laboratorium';
    const autoTaskCode = generateTaskCode(targetCat, localRows);
    const now = new Date();
    const createdStr = getTodayDDMMYYYY();

    const inheritedCadence = currentCadence || normalizeCadence(title) || 'Monthly';
    const inheritedPeriod = (inheritedCadence && inheritedCadence !== 'Non-Routine')
      ? inheritedCadence
      : 'Monthly';

    setRowFormData({
      taskCode: autoTaskCode,
      number: autoTaskCode,
      'Task ID': autoTaskCode,
      'ID Task': autoTaskCode,
      'Jenis kegiatan': '',
      'Jenis Kegiatan': '',
      Keterangan: '',
      PIC: currentAuthorName || '',
      Priority: 'Normal',
      Status: 'Open',
      'Created Time': createdStr,
      'Tanggal Selesai': '-',
      'Due Date': formatToDDMMYYYY(now),
      Kategori: targetCat,
      'Activity (routine/non routine)': inheritedCadence,
      period: inheritedPeriod
    });
    setEditingRowIndex(null);
    setShowRowModal(true);
  };

  // Add Row Handler (Prioritizes Active Section Activities list for Logbook, or opens manual modal)
  const handleOpenAddModal = () => {
    if (isLogbookTable) {
      setShowLogbookRecModal(true);
      return;
    }
    handleOpenManualRowModal();
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
    
    const createdStr = getTodayDDMMYYYY();

    const parentId = parentRow.id || `task_${Date.now()}_${actualParentIdx}_${Math.random().toString(36).substr(2, 6)}`;
    parentRow.id = parentId;
    const nowIso = new Date().toISOString();
    parentRow['Last Modified'] = nowIso;

    // Enterprise Best Practice: Subtasks exist strictly as relational child rows (parentId: parentId).
    // Clean any legacy checklist lines from parent's Keterangan if present so it remains strictly narrative.
    const currentKet = getRowVal(parentRow, 'Keterangan') || '';
    const cleanKet = currentKet
      .replace(/<br\s*\/?>/gi, '\n')
      .split('\n')
      .filter(l => !l.trim().match(/^[-*•]\s*\[([ xX])\]/))
      .join('\n')
      .trim();
    setRowDescription(parentRow, cleanKet || '-');

    const subId = `sub_${parentId}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const formattedTitle = `↳ [ ] ${cleanTitle}`;
    const parentRawTitle = getRowVal(parentRow, 'Jenis kegiatan') || getRowVal(parentRow, 'Jenis Kegiatan') || getRowVal(parentRow, 'Name') || getRowVal(parentRow, 'Judul') || '';
    const cleanParentTitle = getDisplayTitle(parentRawTitle);

    // Resolve origin post ID and title if not yet attached
    const resolvedOriginId = parentRow._originPostId || resolveOriginPostId(parentRow, allPosts || [], section);
    if (resolvedOriginId) {
      parentRow._originPostId = resolvedOriginId;
    }
    const resolvedOriginTitle = parentRow._originPostTitle || parentRow['Asal Halaman'] || '';
    if (resolvedOriginTitle) {
      parentRow._originPostTitle = resolvedOriginTitle;
      parentRow['Asal Halaman'] = resolvedOriginTitle;
    }

    const newSubRow: TableRowData = {
      number: '',
      id: subId,
      parentId: parentId,
      parentRowId: parentId,
      'Jenis kegiatan': formattedTitle,
      'Jenis Kegiatan': formattedTitle,
      Keterangan: '-',
      PIC: parentPIC,
      Priority: 'Normal',
      Status: 'Open',
      status: 'Open',
      isCompleted: 'false',
      'Created Time': createdStr,
      'Created time': createdStr,
      'Tanggal Selesai': '-',
      'Tanggal selesai': '-',
      'Due Date': getRowVal(parentRow, 'Due Date') || getRowVal(parentRow, 'due date') || createdStr,
      'due date': getRowVal(parentRow, 'Due Date') || getRowVal(parentRow, 'due date') || createdStr,
      Kategori: parentCat,
      'Activity (routine/non routine)': parentAct,
      Aktivitas: parentAct,
      period: parentPeriod,
      'Asal Halaman': resolvedOriginTitle,
      isSubItem: 'true',
      'Last Modified': nowIso,
      // Inherit origin tracking metadata from parent so subtask can sync back to origin Labnote table
      _originPostId: resolvedOriginId,
      _originPostTitle: resolvedOriginTitle,
      _originRowIndex: parentRow._originRowIndex,
      _parentTitle: cleanParentTitle,
      _isLogbookAggregated: parentRow._isLogbookAggregated
    };

    // Cari posisi sisip: tepat setelah sub-item terakhir dari parent ini
    let insertIdx = actualParentIdx + 1;
    while (insertIdx < localRows.length && isSubItemRow(localRows[insertIdx])) {
      insertIdx++;
    }

    const nextRows = [...localRows];
    nextRows[actualParentIdx] = { ...parentRow };
    nextRows.splice(insertIdx, 0, newSubRow);

    if (selectedRow && (selectedRow === parentRow || selectedRow.id === parentRow.id)) {
      setSelectedRow(nextRows[actualParentIdx]);
    }

    setLocalRows(nextRows);
    const updatedDirty = new Set(dirtyRowIndices);
    updatedDirty.add(actualParentIdx);
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

    // Direct mutation to origin Labnote post immediately
    const originToSync = newSubRow._originPostId;
    if (originToSync && allPosts && allPosts.length > 0) {
      syncLogbookRowsGroupToOrigin(originToSync, [parentRow, newSubRow], allPosts).then(success => {
        if (success) {
          console.log(`[Logbook Direct Mutation] Subtask "${cleanTitle}" synced directly to origin post #${originToSync}`);
        }
      });
    }

    toast.success(`Sub-kegiatan "${cleanTitle}" berhasil ditambahkan`);
  };

  // Handler for adding selected tasks from LogbookTaskRecommendationModal
  const handleAddRecommendedTasks = async (tasksToAdd: TableRowData[]) => {
    try {
      const { rows: migratedTasks } = migrateChecklistsInRows(tasksToAdd, section);
      const combined = [...localRows, ...migratedTasks];
      const { rows: normalizedRows } = normalizeExistingTaskCodes(combined, section);
      let mainNum = 1;
      normalizedRows.forEach(r => {
        if (!isSubItemRow(r)) {
          r.number = String(mainNum++);
        }
      });
      setLocalRows(normalizedRows);
      onRowsChange?.(normalizedRows);
      await saveTableToBackend(normalizedRows);

      // Prioritize pinned tasks in pinnedRowKeys so they float to the very top immediately
      const pinnedKeys = migratedTasks
        .filter(t => !isSubItemRow(t) && (t.isPinned === 'true' || String(t['Jenis kegiatan']).includes('<!--pin')))
        .map(t => t.id || getDisplayTitle(t['Jenis kegiatan'] || ''));
      if (pinnedKeys.length > 0) {
        setPinnedRowKeys(prev => Array.from(new Set([...pinnedKeys, ...prev])));
      }

      setLogbookActiveTab('planning');
      toast.success(`🎉 Berhasil menambahkan ${tasksToAdd.length} rencana tugas ke logbook!`);
      setShowLogbookRecModal(false);
    } catch (err: any) {
      console.error('Error adding recommended tasks:', err);
      toast.error('Gagal menambahkan rencana tugas: ' + (err?.message || 'Error'));
    }
  };

  // Carry over an unfinished task from yesterday/previous date into today's planning
  const handleCarryOverTask = async (task: TableRowData) => {
    try {
      const todayStr = getTodayDDMMYYYY();
      const newParentId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const carriedTask: TableRowData = {
        ...task,
        id: newParentId,
        _id: newParentId,
        'Created Time': todayStr,
        createdTime: todayStr,
        Status: 'In Progress',
        status: 'In Progress',
        'Tanggal Selesai': '-',
        'Tanggal selesai': '-',
        'Due Date': todayStr,
        'due date': todayStr,
        completed: '-',
        'Aktual Selesai': '-',
      };

      // Also carry over its subtasks if any
      const relatedSubtasks = localRows.filter(r => isSubItemRow(r) && r.parentRowId === (task.id || task._id));
      const carriedSubtasks: TableRowData[] = relatedSubtasks.map(sub => ({
        ...sub,
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        parentRowId: newParentId,
        'Created Time': todayStr,
        createdTime: todayStr,
        isCompleted: 'false',
        'Tanggal Selesai': '-',
        'Tanggal selesai': '-',
        'Due Date': todayStr,
        'due date': todayStr,
        completed: '-',
      }));

      const nextRows = [...localRows, carriedTask, ...carriedSubtasks];
      let mainNum = 1;
      nextRows.forEach(r => {
        if (!isSubItemRow(r)) {
          r.number = String(mainNum++);
        }
      });
      setLocalRows(nextRows);
      onRowsChange?.(nextRows);
      await saveTableToBackend(nextRows);
      toast.success(`Tugas "${carriedTask['Jenis kegiatan'] || carriedTask['Jenis Kegiatan'] || 'Tugas'}" berhasil dilanjutkan ke hari ini!`);
      setLogbookDateFilter('today');
      setLogbookActiveTab('planning');
    } catch (err: any) {
      console.error('Error carry over task:', err);
      toast.error('Gagal melanjutkan tugas: ' + (err?.message || 'Error'));
    }
  };

  // Save daily notes (General notes / Kejadian Khusus)
  const handleSaveDailyNotes = async (dateStr: string, notes: string) => {
    try {
      const updatedMeta: LogbookMeta = {
        ...logbookMeta,
        generalNotes: {
          ...logbookMeta.generalNotes,
          [dateStr]: notes
        }
      };
      setLogbookMeta(updatedMeta);

      // Inject into beforeText and save post
      const nextBeforeText = injectLogbookMeta(beforeText || '', updatedMeta);
      const targetHeaders = displayHeaders;
      const updatedMarkdown = serializeMarkdownTable(targetHeaders, localRows, nextBeforeText, afterText);

      if (typeof postId === 'number' || (typeof postId === 'string' && /^\d+$/.test(postId))) {
        await fetch(`/api/bulletin/${postId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: updatedMarkdown })
        });
      }
      onPostContentUpdate?.(updatedMarkdown);
      toast.success('Catatan harian logbook berhasil disimpan!');
    } catch (err: any) {
      console.error('Error saving daily notes:', err);
      toast.error('Gagal menyimpan catatan harian: ' + (err?.message || 'Error'));
    }
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
        setRowDescription(row, taskProg.cleanText || '-');
        newRows.push(row);

        const parentIndex = newRows.length - 1;
        const parentCat = getRowVal(row, 'Kategori') || section || 'Laboratorium';
        const parentPIC = getRowVal(row, 'PIC') || '';
        const parentAct = getRowVal(row, 'Activity (routine/non routine)') || 'Monthly';
        const parentPeriod = getRowVal(row, 'period') || 'Monthly';
        const createdStr = getTodayDDMMYYYY();

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

  // 1-SOURCE OF TRUTH: Sinkronisasi Subtask dari Discussion Modal / Drawer ke Baris Tabel & Backend
  const handleSyncModalSubtasks = async (parentRowOrIndex: TableRowData | number, newKetVal: string) => {
    let parentIdx = -1;
    let parentRow: TableRowData | undefined;

    if (typeof parentRowOrIndex === 'number') {
      parentIdx = parentRowOrIndex;
      parentRow = localRows[parentRowOrIndex];
    } else {
      parentRow = parentRowOrIndex;
      parentIdx = localRows.indexOf(parentRowOrIndex);
      if (parentIdx === -1 && parentRowOrIndex.id) {
        parentIdx = localRows.findIndex(r => r.id === parentRowOrIndex.id);
      }
      if (parentIdx === -1) {
        parentIdx = localRows.findIndex(r => 
          (getRowVal(r, 'Jenis kegiatan') || '').trim() === (getRowVal(parentRowOrIndex, 'Jenis kegiatan') || '').trim()
        );
      }
    }

    if (!parentRow || parentIdx === -1) return;

    // Parse subtasks from the new Keterangan markdown
    const prog = parseTasklist(newKetVal || '');
    const nowIso = new Date().toISOString();
    const todayStr = getTodayDDMMYYYY();

    const parentId = parentRow.id || `task_${Date.now()}_${parentIdx}_${Math.random().toString(36).substr(2, 6)}`;
    const updatedParentRow: TableRowData = { ...parentRow, id: parentId };
    const cleanKet = (newKetVal || '')
      .replace(/<br\s*\/?>/gi, '\n')
      .split('\n')
      .filter(l => !l.trim().match(/^[-*•]\s*\[([ xX])\]/))
      .join('\n')
      .trim();
    setRowDescription(updatedParentRow, cleanKet || '-');
    updatedParentRow['Last Modified'] = nowIso;

    // Temukan range sub-items lama di bawah parentIdx
    const oldSubIndices: number[] = [];
    for (let i = parentIdx + 1; i < localRows.length; i++) {
      if (isSubItemRow(localRows[i])) {
        oldSubIndices.push(i);
      } else {
        break;
      }
    }

    // Bangun daftar baris sub-items baru berdasarkan prog.items
    const parentCat = getRowVal(parentRow, 'Kategori') || section || 'Laboratorium';
    const parentPIC = getRowVal(parentRow, 'PIC') || currentAuthorName || '';
    const parentAct = getRowVal(parentRow, 'Activity (routine/non routine)') || 'Monthly';
    const parentPeriod = getRowVal(parentRow, 'period') || 'Monthly';

    const newSubRows: TableRowData[] = prog.items.map((item, idx) => {
      // Coba cocokkan dengan sub-item lama untuk preserve ID jika ada
      const existingSub = oldSubIndices[idx] !== undefined ? localRows[oldSubIndices[idx]] : undefined;
      const subId = existingSub?.id || `sub_${parentId}_${idx}_${Math.random().toString(36).substr(2, 6)}`;
      const formattedTitle = `↳ [${item.checked ? 'x' : ' '}] ${item.text}`;

      return {
        number: '',
        id: subId,
        parentId: parentId,
        parentRowId: parentId,
        'Jenis kegiatan': formattedTitle,
        'Jenis Kegiatan': formattedTitle,
        Keterangan: item.note || '-',
        PIC: parentPIC,
        Priority: 'Normal',
        Status: item.checked ? 'Closed' : 'Open',
        isCompleted: item.checked ? 'true' : 'false',
        'Created Time': existingSub?.['Created Time'] || getTodayDDMMYYYY(),
        'Tanggal Selesai': item.checked ? (existingSub?.['Tanggal Selesai'] || todayStr) : '-',
        Kategori: parentCat,
        'Activity (routine/non routine)': parentAct,
        period: parentPeriod,
        isSubItem: 'true',
        'Last Modified': nowIso
      };
    });

    // Perbarui status parent
    const totalSubs = newSubRows.length;
    const completedSubs = newSubRows.filter(r => r.isCompleted === 'true').length;
    const currentParentStatus = (getRowVal(updatedParentRow, 'Status') || '').toUpperCase();

    if (!currentParentStatus.includes('CANCEL')) {
      if (totalSubs > 0 && completedSubs === totalSubs) {
        updatedParentRow.Status = 'Closed';
        updatedParentRow['Tanggal Selesai'] = todayStr;
      } else if (completedSubs > 0) {
        updatedParentRow.Status = 'On Progress';
        updatedParentRow['Tanggal Selesai'] = '-';
      } else if (totalSubs > 0) {
        updatedParentRow.Status = 'Open';
        updatedParentRow['Tanggal Selesai'] = '-';
      }
    }

    // Susun array nextRows
    const nextRows = [...localRows];
    nextRows[parentIdx] = updatedParentRow;

    // Gantikan sub-items lama dengan newSubRows
    if (oldSubIndices.length > 0) {
      nextRows.splice(parentIdx + 1, oldSubIndices.length, ...newSubRows);
    } else if (newSubRows.length > 0) {
      nextRows.splice(parentIdx + 1, 0, ...newSubRows);
    }

    setLocalRows(nextRows);
    if (selectedRow) {
      setSelectedRow(updatedParentRow);
    }
    onRowsChange?.(nextRows);

    if (subtaskSaveDebounceRef.current) {
      clearTimeout(subtaskSaveDebounceRef.current);
    }
    subtaskSaveDebounceRef.current = setTimeout(async () => {
      await saveTableToBackend(nextRows);
    }, 600);
  };

  // Handler to close detail modal and flush any pending subtask saves
  const handleCloseDetailModal = useCallback(() => {
    if (subtaskSaveDebounceRef.current) {
      clearTimeout(subtaskSaveDebounceRef.current);
      subtaskSaveDebounceRef.current = null;
      saveTableToBackend(localRowsRef.current);
    }
    // Hapus parameter query 'topic' dari URL browser agar modal tidak muncul kembali saat berpindah halaman
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('topic')) {
        url.searchParams.delete('topic');
        window.history.replaceState({}, '', url.toString());
      }
    } catch {}

    onClearInitialTopic?.();
    setSelectedRow(null);
  }, [onClearInitialTopic]);

  // Toggle Checklist Sub-Item Completed Status & Sinkronkan Progres Task Utama
  const handleToggleSubItemCompleted = (subRowIndex: number, currentCompleted: boolean) => {
    const nextCompleted = !currentCompleted;
    const subRow = localRows[subRowIndex];
    if (!subRow) return;

    // Intercept: If subtask is linked to a ticket, completing it requires mandatory photo upload in FindingResolutionModal
    const linkedTicketId = extractLinkedTicketId(subRow);
    if (nextCompleted && linkedTicketId) {
      setFindingResolutionModalState({
        isOpen: true,
        ticket: null,
        ticketId: linkedTicketId,
        subRowIndex,
        initialMode: 'resolve'
      });
      return;
    }

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
      const todayStr = getTodayDDMMYYYY();
      const nowIso = new Date().toISOString();
      const updatedRow = { ...subRow };
      updatedRow.isCompleted = nextCompleted ? 'true' : 'false';
      updatedRow.Status = nextCompleted ? 'Closed' : 'Open';
      updatedRow['Last Modified'] = nowIso;

      // Inherit or resolve origin tracking metadata from parent if missing
      const pRow = parentIdx !== -1 ? localRows[parentIdx] : null;
      const originId = updatedRow._originPostId || pRow?._originPostId || resolveOriginPostId(pRow || updatedRow, allPosts || [], section);
      if (originId) {
        updatedRow._originPostId = originId;
        if (pRow) {
          pRow._originPostId = originId;
          updatedRow._originPostTitle = pRow._originPostTitle;
          updatedRow._originRowIndex = pRow._originRowIndex;
          updatedRow._parentTitle = getDisplayTitle(getRowVal(pRow, 'Jenis kegiatan') || getRowVal(pRow, 'Jenis Kegiatan') || '');
          updatedRow._isLogbookAggregated = pRow._isLogbookAggregated;
        }
      }

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
        parentRow['Last Modified'] = nowIso;
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
        }

        // Enterprise Best Practice: Subtasks exist strictly as child rows, NEVER duplicated into Keterangan.
        // Clean any legacy checklist lines from parent's Keterangan so it stays strictly narrative.
        const existingKet = getRowVal(parentRow, 'Keterangan') || '';
        const cleanKet = existingKet
          .replace(/<br\s*\/?>/gi, '\n')
          .split('\n')
          .filter(line => !line.trim().match(/^[-*•]\s*\[([ xX])\]/))
          .join('\n')
          .trim();
        setRowDescription(parentRow, cleanKet || '-');
        nextRows[parentIdx] = parentRow;

        // Auto-expand completed subtasks drawer so user has instant visual confirmation (no "disappearing shock")
        if (nextCompleted) {
          const pKey = parentRow.id || String(parentIdx);
          setExpandedCompletedSubtasks(prev => ({
            ...prev,
            [pKey]: true,
            [parentIdx]: true
          }));
        }

        if (selectedRow && (selectedRow === localRows[parentIdx] || (selectedRow.id && selectedRow.id === parentRow.id))) {
          setSelectedRow(parentRow);
        }
      }

      const updatedDirty = new Set(dirtyRowIndices);
      updatedDirty.add(subRowIndex);
      if (parentIdx !== -1) updatedDirty.add(parentIdx);
      setDirtyRowIndices(updatedDirty);

      setLocalRows(nextRows);
      onRowsChange?.(nextRows);
      await saveTableToBackend(nextRows);

      // Direct mutation to origin Labnote post immediately
      if (originId && allPosts && allPosts.length > 0) {
        const parentToSync = parentIdx !== -1 ? nextRows[parentIdx] : null;
        syncLogbookRowsGroupToOrigin(originId, parentToSync ? [parentToSync, updatedRow] : [updatedRow], allPosts).then(success => {
          if (success) {
            console.log(`[Logbook Direct Mutation] Subtask toggle synced directly to origin post #${originId}`);
          }
        });
      }
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
    const data: TableRowData = { ...row };
    displayHeaders.forEach(h => {
      data[h] = getRowVal(row, h);
    });
    // Explicitly preserve pin status
    const pinned = isRowPinned(row);
    if (pinned) {
      data.isPinned = 'true';
      (data as any)._pinned = 'true';
    }
    // Clean comments and pin tags from the textarea so user gets clean text without comment tags
    if (typeof data['Keterangan'] === 'string') {
      data['Keterangan'] = data['Keterangan']
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<!-?[a-zA-Z0-9_\-\s]+.*?>?/g, '')
        .replace(/<!--.*$/g, '')
        .trim();
    }
    // Ensure both casing variants of title are explicitly populated and clean of comments
    const titleVal = (getRowVal(row, 'Jenis Kegiatan') || getRowVal(row, 'Jenis kegiatan') || '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<!-?[a-zA-Z0-9_\-\s]+.*?>?/g, '')
      .replace(/<!--.*$/g, '')
      .trim();
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

    const targetCat = cleanedRow.Kategori || section || 'Laboratorium';
    const finalTaskCode = (cleanedRow.taskCode || cleanedRow['Task ID'] || cleanedRow['ID Task'] || cleanedRow['number'] || generateTaskCode(targetCat, localRows)).trim();
    cleanedRow.taskCode = finalTaskCode;
    cleanedRow['Task ID'] = finalTaskCode;
    cleanedRow['ID Task'] = finalTaskCode;
    cleanedRow.number = finalTaskCode;
    if (!cleanedRow.id) {
      cleanedRow.id = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    }
    cleanedRow['Last Modified'] = new Date().toISOString();

    const finalDesc = cleanedRow['Keterangan'] || cleanedRow['Description'] || '';
    setRowDescription(cleanedRow, finalDesc);

    // Check if row being edited was pinned
    const wasPinned = (editingRowIndex !== null && localRows[editingRowIndex] && isRowPinned(localRows[editingRowIndex])) || 
                      isRowPinned(cleanedRow) || 
                      String(cleanedRow.isPinned) === 'true';

    if (wasPinned) {
      cleanedRow.isPinned = 'true';
      (cleanedRow as any)._pinned = 'true';
      let curKet = cleanedRow['Keterangan'] || cleanedRow['Description'] || '';
      if (!curKet.includes('<!--pin-->')) {
        const pinKet = `${curKet} <!--pin-->`.trim();
        setRowDescription(cleanedRow, pinKet);
      }
      const pKey = cleanedRow.id ? String(cleanedRow.id) : (cleanedRow['Jenis kegiatan'] || '').replace(/^↳\s*/, '').trim();
      if (pKey && !pinnedRowKeys.includes(pKey)) {
        setPinnedRowKeys(prev => {
          const next = [...prev, pKey];
          try { localStorage.setItem(tablePinStorageKey, JSON.stringify(next)); } catch {}
          return next;
        });
      }
    }

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
        // Adding new row -> place at TOP (#1, row 1)
        updatedRows = [cleanedRow, ...localRows];
        toast.success(`Data kegiatan baru (${finalTaskCode}) berhasil ditambahkan di Baris #1!`);
      } else {
        // Editing existing row: pastikan targetIndex cocok dengan id / referensi row yang diedit
        let targetIndex = editingRowIndex;
        if (targetIndex < 0 || targetIndex >= localRows.length || (cleanedRow.id && localRows[targetIndex]?.id !== cleanedRow.id)) {
          const foundIdx = localRows.findIndex(r => (cleanedRow.id && r.id === cleanedRow.id) || r === rowFormData);
          if (foundIdx !== -1) {
            targetIndex = foundIdx;
          }
        }
        updatedRows = localRows.map((r, i) => i === targetIndex ? { ...r, ...cleanedRow } : r);
        toast.success(`Perubahan data kegiatan (${finalTaskCode}) berhasil disimpan!`);
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

  // Insert Blank Row Inline directly into table (starts manual inline editing immediately at row #1)
  const handleInsertBlankRow = (_insertAtIndex: number = 0) => {
    const now = new Date();
    const createdStr = getTodayDDMMYYYY();
    const inheritedCadence = currentCadence || 'Non Routine';
    const targetCat = section || 'Laboratorium';
    const autoTaskCode = generateTaskCode(targetCat, localRows);
    const uniqueTaskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const blankRow: TableRowData = {
      id: uniqueTaskId,
      taskCode: autoTaskCode,
      'Task ID': autoTaskCode,
      number: autoTaskCode,
      'Activity Name': '',
      'Jenis kegiatan': '',
      'Jenis Kegiatan': '',
      Keterangan: '-',
      PIC: currentAuthorName || '',
      Priority: 'Normal',
      Status: 'Open',
      isCompleted: 'false',
      'Created Time': createdStr,
      'Tanggal Selesai': '-',
      'Due Date': formatToDDMMYYYY(now),
      Kategori: targetCat,
      'Activity (routine/non routine)': inheritedCadence,
      period: inheritedCadence,
      'Last Modified': nowIso
    };

    displayHeaders.forEach(h => {
      const hl = h.toLowerCase().trim();
      const isTitle = hl.includes('activity name') || hl.includes('jenis kegiatan') || hl === 'task' || hl === 'judul' || hl === 'name';
      if (blankRow[h] === undefined) {
        blankRow[h] = isTitle ? '' : '-';
      }
    });

    // Sisipkan di posisi paling atas (#1)
    const nextRows = [blankRow, ...localRows];

    setLocalRows(nextRows);
    onRowsChange?.(nextRows);
    saveTableToBackend(nextRows);

    // Immediately activate inline editor on the new empty cell at row 0
    const titleColHeader = displayHeaders.find(h => {
      const hl = h.toLowerCase().trim();
      return hl.includes('activity name') || hl.includes('jenis kegiatan') || hl === 'task' || hl === 'judul';
    }) || 'Activity Name';

    setActiveInlineEditor({
      rowIndex: 0,
      colName: titleColHeader,
      initialValue: '',
      multiline: false
    });

    toast.success(`Kegiatan baru (${autoTaskCode}) ditambahkan di Baris #1! Silakan ketik nama kegiatan.`);
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
        // HANYA jadikan row sebagai activeParentRef jika row tersebut memiliki judul kegiatan nyata
        // Baris kosong baru (tanpa judul) TIDAK PERNAH boleh mengadopsi subtask dari task lain
        const title = (getRowVal(r, 'Jenis kegiatan') || getRowVal(r, 'Name') || getRowVal(r, 'Judul') || r['Jenis kegiatan'] || r['Jenis Kegiatan'] || '').trim();
        if (title.length > 0) {
          activeParentRef = r;
        }
      }
    });
    return map;
  }, [localRows, getRowVal]);

  // Request Delete for a single row (opens modern confirmation dialog with subtask cascade detection)
  const handleRequestDeleteRow = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const targetRow = localRows[index];
    if (!targetRow) return;

    const isSub = isSubItemRow(targetRow);
    const taskName = (getRowVal(targetRow, 'Jenis kegiatan') || getRowVal(targetRow, 'Name') || getRowVal(targetRow, 'Judul') || `Baris #${index + 1}`).trim();

    // Find all nested subtasks under this parent
    const subtasks: TableRowData[] = [];
    if (!isSub) {
      for (let i = index + 1; i < localRows.length; i++) {
        const nextRow = localRows[i];
        if (!isSubItemRow(nextRow)) break; // reached next parent row
        if (rowToParentMap.get(nextRow) === targetRow || !rowToParentMap.has(nextRow)) {
          subtasks.push(nextRow);
        }
      }
    }

    setDeleteConfirmModalState({
      isOpen: true,
      rowIndex: index,
      isBatch: false,
      taskName,
      subtaskCount: subtasks.length,
      subtasks,
      isSubItem: isSub
    });
  };

  // Alias for backward compatibility
  const handleDeleteRow = handleRequestDeleteRow;

  // Request Batch Delete for selected rows
  const handleRequestBatchDelete = () => {
    if (selectedRowIndices.size === 0) return;
    setDeleteConfirmModalState({
      isOpen: true,
      isBatch: true,
      rowIndices: Array.from(selectedRowIndices),
      taskName: `${selectedRowIndices.size} kegiatan terpilih`,
      subtaskCount: 0,
      subtasks: [],
      isSubItem: false
    });
  };

  // Execute Confirmed Delete: Logs to Recycle Bin & Removes from Table
  const executeConfirmedDelete = async () => {
    if (!deleteConfirmModalState.isOpen) return;
    const { isBatch, rowIndex, rowIndices, taskName, subtasks, subtaskCount } = deleteConfirmModalState;
    setDeleteConfirmModalState(prev => ({ ...prev, isDeleting: true }));

    try {
      const rowsToRemoveIndices = new Set<number>();
      const recyclePayloadItems: any[] = [];

      if (isBatch && rowIndices && rowIndices.length > 0) {
        rowIndices.forEach(idx => rowsToRemoveIndices.add(idx));
        rowIndices.forEach(idx => {
          const r = localRows[idx];
          if (r) {
            recyclePayloadItems.push({
              postId,
              postTitle: title || 'Daily Laboratory',
              section: section || 'LABORATORIUM',
              taskTitle: (getRowVal(r, 'Jenis kegiatan') || getRowVal(r, 'Name') || `Baris #${idx + 1}`).trim(),
              rowData: r,
              subtasksData: null,
              subtaskCount: 0
            });
          }
        });
      } else if (rowIndex !== undefined && rowIndex >= 0) {
        rowsToRemoveIndices.add(rowIndex);
        const targetRow = localRows[rowIndex];

        // Also remove any cascade subtasks
        if (subtasks && subtasks.length > 0) {
          subtasks.forEach(s => {
            const sIdx = localRows.indexOf(s);
            if (sIdx !== -1) rowsToRemoveIndices.add(sIdx);
          });
        }

        if (targetRow) {
          recyclePayloadItems.push({
            postId,
            postTitle: title || 'Daily Laboratory',
            section: section || 'LABORATORIUM',
            taskTitle: taskName || 'Kegiatan',
            rowData: targetRow,
            subtasksData: subtasks && subtasks.length > 0 ? subtasks : null,
            subtaskCount: subtaskCount || 0
          });
        }
      }

      if (rowsToRemoveIndices.size === 0) {
        setDeleteConfirmModalState({ isOpen: false, isDeleting: false });
        return;
      }

      // 1. Audit Trail: Send to Recycle Bin API
      fetch('/api/bulletin/recycle-bin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: recyclePayloadItems,
          deletedByNik: effectiveNik,
          deletedByName: effectiveName,
          deletedByJabatan: effectiveJabatan
        })
      }).catch(err => {
        console.warn('[RecycleBin] Error logging to recycle bin:', err);
      });

      // 2. Remove rows locally & re-index number
      const updatedRows = localRows.filter((_, idx) => !rowsToRemoveIndices.has(idx));
      const reindexed = updatedRows.map((r, i) => ({
        ...r,
        number: String(i + 1),
        Number: String(i + 1)
      }));

      setLocalRows(reindexed);
      onRowsChange?.(reindexed);
      await saveTableToBackend(reindexed);

      // Reset selection
      setSelectedRowIndices(new Set());
      setIsSelectionModeActive(false);
      setDeleteConfirmModalState({ isOpen: false, isDeleting: false });

      toast.success(
        subtaskCount && subtaskCount > 0 
          ? `Kegiatan "${taskName}" & ${subtaskCount} sub-kegiatan dipindahkan ke Recycle Bin!`
          : `Kegiatan "${taskName}" dipindahkan ke Recycle Bin!`
      );
      if (selectedRow && rowsToRemoveIndices.has(localRows.indexOf(selectedRow))) {
        setSelectedRow(null);
      }
    } catch (err) {
      console.error('Error during deletion:', err);
      toast.error('Gagal menghapus kegiatan');
      setDeleteConfirmModalState(prev => ({ ...prev, isDeleting: false }));
    }
  };

  // Open Developer Recycle Bin Modal
  const handleOpenRecycleBin = async (filterMode: 'all' | 'current' = 'current') => {
    setRecycleBinModalState(prev => ({ ...prev, isOpen: true, isLoading: true, filter: filterMode }));
    try {
      const url = filterMode === 'current' && postId
        ? `/api/bulletin/recycle-bin?postId=${postId}`
        : '/api/bulletin/recycle-bin';
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'success' && Array.isArray(json.data)) {
        setRecycleBinModalState(prev => ({ ...prev, items: json.data, isLoading: false }));
      } else {
        setRecycleBinModalState(prev => ({ ...prev, items: [], isLoading: false }));
      }
    } catch (err) {
      console.error('Error fetching recycle bin:', err);
      toast.error('Gagal memuat Recycle Bin');
      setRecycleBinModalState(prev => ({ ...prev, items: [], isLoading: false }));
    }
  };

  // Restore deleted item from Recycle Bin (Developer)
  const handleRestoreRecycleItem = async (itemId: number) => {
    setRecycleBinModalState(prev => ({ ...prev, isRestoringId: itemId }));
    try {
      const res = await fetch(`/api/bulletin/recycle-bin/${itemId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restoredByNik: effectiveNik,
          restoredByName: effectiveName
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success(json.message || 'Kegiatan berhasil dipulihkan!');
        setRecycleBinModalState(prev => ({
          ...prev,
          items: prev.items.map(it => it.id === itemId ? { ...it, restoreStatus: 'RESTORED' as const } : it),
          isRestoringId: null
        }));
        if (json.newContent && onPostContentUpdate) {
          onPostContentUpdate(json.newContent);
        }
        if (json.restoredPostId === postId && json.newContent) {
          const parsed = extractMarkdownTableFromContent(json.newContent);
          if (parsed.rows && parsed.rows.length > 0) {
            setLocalRows(parsed.rows);
            onRowsChange?.(parsed.rows);
          }
        }
      } else {
        toast.error(json.message || 'Gagal memulihkan kegiatan');
        setRecycleBinModalState(prev => ({ ...prev, isRestoringId: null }));
      }
    } catch (err: any) {
      console.error('Error restoring recycle item:', err);
      toast.error('Gagal memulihkan item: ' + err.message);
      setRecycleBinModalState(prev => ({ ...prev, isRestoringId: null }));
    }
  };

  // Filter and sort rows
  const filteredRows = useMemo(() => {
    let result = [...localRows];

    // Filter out completely empty separator or blank rows
    result = result.filter((row) => {
      const vals = Object.values(row).map((v) => (typeof v === 'string' ? v.trim() : String(v ?? '').trim()));
      return vals.some((v) => v !== '' && v !== '-' && v !== '---');
    });

    // Helper: Cek apakah baris ini atau parent-nya di-pin (bebas dari semua filter)
    const isPinnedOrChildOfPinned = (row: TableRowData) => {
      if (isRowPinned(row)) return true;
      if (isSubItemRow(row)) {
        const p = rowToParentMap.get(row);
        return p ? isRowPinned(p) : false;
      }
      return false;
    };

    // 0. Logbook Focus Mode Filter (Focus Area vs All vs Completed)
    if (isLogbookTable) {
      if (logbookFilterMode === 'focus') {
        const passingParentRows = new Set<TableRowData>();
        localRows.forEach(r => {
          if (isPinnedOrChildOfPinned(r)) {
            passingParentRows.add(r);
            return;
          }
          if (!isSubItemRow(r)) {
            const status = (getRowVal(r, 'Status') || '').toUpperCase().trim();
            const isClosed = status.includes('CLOSE') || status.includes('SELESAI') || status.includes('DONE') || status.includes('RESOLVED');
            if (!isClosed) {
              passingParentRows.add(r);
            }
          }
        });

        result = result.filter(row => {
          if (isPinnedOrChildOfPinned(row)) return true;
          if (!isSubItemRow(row)) {
            return passingParentRows.has(row);
          }
          const parent = rowToParentMap.get(row);
          return parent ? passingParentRows.has(parent) : false;
        });
      } else if (logbookFilterMode === 'completed') {
        const passingParentRows = new Set<TableRowData>();
        localRows.forEach(r => {
          if (isPinnedOrChildOfPinned(r)) {
            passingParentRows.add(r);
            return;
          }
          if (!isSubItemRow(r)) {
            const status = (getRowVal(r, 'Status') || '').toUpperCase().trim();
            const isClosed = status.includes('CLOSE') || status.includes('SELESAI') || status.includes('DONE') || status.includes('RESOLVED');
            if (isClosed) {
              passingParentRows.add(r);
            }
          }
        });

        result = result.filter(row => {
          if (isPinnedOrChildOfPinned(row)) return true;
          if (!isSubItemRow(row)) {
            return passingParentRows.has(row);
          }
          const parent = rowToParentMap.get(row);
          return parent ? passingParentRows.has(parent) : false;
        });
      }
    }

    // 1. Search Query Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      // Simpan parent atau subtask yang cocok
      const matchingRows = new Set<TableRowData>();
      result.forEach((row) => {
        if (isPinnedOrChildOfPinned(row)) {
          matchingRows.add(row);
          return;
        }
        const matches = Object.values(row).some((val) => 
          (typeof val === 'string' ? val : String(val ?? '')).toLowerCase().includes(q)
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
        if (isPinnedOrChildOfPinned(row)) return true;
        if (matchingRows.has(row)) return true;
        if (isSubItemRow(row)) {
          const p = rowToParentMap.get(row);
          return p ? matchingRows.has(p) : false;
        }
        return false;
      });
    }

    // 2. Status Multi-Select Filter (Subtask tak terpisahkan dari parent-nya, Pinned task bebas filter)
    if (selectedStatuses.length > 0 && !selectedStatuses.includes('ALL')) {
      const passingParentRows = new Set<TableRowData>();
      localRows.forEach((row) => {
        if (isPinnedOrChildOfPinned(row)) {
          passingParentRows.add(row);
          return;
        }
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
        if (isPinnedOrChildOfPinned(row)) return true;
        if (!isSubItemRow(row)) {
          return passingParentRows.has(row);
        }
        const parent = rowToParentMap.get(row);
        return parent ? passingParentRows.has(parent) : true;
      });
    }

    // 3. Priority Multi-Select Filter (Pinned task bebas filter)
    if (selectedPriorities.length > 0 && !selectedPriorities.includes('ALL')) {
      const passingParentRows = new Set<TableRowData>();
      localRows.forEach((row) => {
        if (isPinnedOrChildOfPinned(row)) {
          passingParentRows.add(row);
          return;
        }
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
        if (isPinnedOrChildOfPinned(row)) return true;
        if (!isSubItemRow(row)) {
          return passingParentRows.has(row);
        }
        const parent = rowToParentMap.get(row);
        return parent ? passingParentRows.has(parent) : true;
      });
    }

    // 3b. PIC Multi-Select Filter (Pinned task bebas filter)
    if (selectedPics.length > 0 && !selectedPics.includes('ALL')) {
      const passingParentRows = new Set<TableRowData>();
      localRows.forEach((row) => {
        if (isPinnedOrChildOfPinned(row)) {
          passingParentRows.add(row);
          return;
        }
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
        if (isPinnedOrChildOfPinned(row)) return true;
        if (!isSubItemRow(row)) {
          return passingParentRows.has(row);
        }
        const parent = rowToParentMap.get(row);
        return parent ? passingParentRows.has(parent) : true;
      });
    }

    // 4. Sort (Pinned row selalu berada di posisi paling atas terlepas dari sort kolom)
    // PENTING: Subtask tidak boleh lepas dari task utamanya
    result.sort((a, b) => {
      const aPin = isPinnedOrChildOfPinned(a);
      const bPin = isPinnedOrChildOfPinned(b);
      if (aPin && !bPin) return -1;
      if (!aPin && bPin) return 1;

      // Temukan parent efektif
      const pA = rowToParentMap.get(a);
      const pB = rowToParentMap.get(b);

      // Jika keduanya milik parent yang sama:
      if (pA && pB && pA === pB) {
        return localRows.indexOf(a) - localRows.indexOf(b);
      }
      // Jika a adalah subtask dari b:
      if (pA === b) return 1;
      // Jika b adalah subtask dari a:
      if (pB === a) return -1;

      const effA = pA || a;
      const effB = pB || b;

      if (sortColumn) {
        const rawA = (getRowVal(effA, sortColumn) || effA[sortColumn] || '').trim();
        const rawB = (getRowVal(effB, sortColumn) || effB[sortColumn] || '').trim();

        // 1. Sort by Last Modified
        if (sortColumn === 'Last Modified' || sortColumn.toLowerCase().includes('modified')) {
          const timeA = Date.parse(effA['Last Modified'] || effA['Date Modified'] || effA['Created Time'] || '') || 0;
          const timeB = Date.parse(effB['Last Modified'] || effB['Date Modified'] || effB['Created Time'] || '') || 0;
          return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
        }

        // 2. If numeric column (number)
        if (sortColumn.toLowerCase() === 'number' || sortColumn.toLowerCase() === 'no') {
          const numA = parseFloat(rawA) || 0;
          const numB = parseFloat(rawB) || 0;
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        }

        // 3. If priority column (weighted: Urgent > High > Medium > Normal > Low)
        if (sortColumn.toLowerCase().includes('priorit') || sortColumn.toLowerCase() === 'priority') {
          const wA = getPriorityWeight(rawA);
          const wB = getPriorityWeight(rawB);
          return sortDirection === 'asc' ? wA - wB : wB - wA;
        }

        // 4. If date/time column
        const timeA = Date.parse(rawA);
        const timeB = Date.parse(rawB);
        if (!isNaN(timeA) && !isNaN(timeB)) {
          return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
        }

        const valA = rawA.toLowerCase();
        const valB = rawB.toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return result;
  }, [localRows, searchQuery, selectedStatuses, selectedPriorities, selectedPics, sortColumn, sortDirection, getRowVal, isRowPinned, rowToParentMap, isLogbookTable, logbookFilterMode]);

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
      const vals = Object.values(r).map((v) => (typeof v === 'string' ? v.trim() : String(v ?? '').trim()));
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
    const finalContent = commentText.trim() || (
      commentFileCaption.trim() 
        ? `📎 ${selectedFiles.length > 1 ? `${selectedFiles.length} Lampiran Foto` : (selectedFiles[0]?.name || selectedFile?.name || 'Lampiran')}\n\n${commentFileCaption.trim()}`
        : (hasFiles ? (selectedFiles.length > 1 ? `📎 ${selectedFiles.length} Lampiran Foto` : `📎 ${selectedFiles[0]?.name || selectedFile?.name || 'Lampiran'}`) : '')
    );
    if (!finalContent && !hasFiles) return;
    const targetPostId = getEffectivePostId(selectedRow);
    if (!targetPostId) {
      toast.error('Tidak dapat mengirim update: Tugas ini berada di halaman logbook virtual dan belum memiliki dokumen fisik terhubung.');
      return;
    }

    const topicTitleVal = selectedTopicTitle || 'Topik';
    const picVal = (getRowVal(selectedRow, 'PIC') || '').trim();
    const activeSection = section || getRowVal(selectedRow, 'Kategori') || 'Prep & Lab';

    try {
      isSubmittingCommentRef.current = true;
      setSubmittingComment(true);
      const filesToSave = selectedFiles.length > 0 ? selectedFiles : (selectedFile ? [selectedFile] : []);
      const allFilesPayload = filesToSave.length > 0
        ? filesToSave.map((f) => ({
            url: f.url,
            name: f.name,
            caption: (f as any).caption || '',
            directUrl: f.url,
            isImage: f.isImage !== false
          }))
        : selectedFile ? [{
            url: selectedFile.url,
            name: selectedFile.name,
            caption: commentFileCaption.trim(),
            directUrl: selectedFile.url,
            isImage: selectedFile.isImage !== false
          }] : null;

      const fileUrlPayload = allFilesPayload ? JSON.stringify(allFilesPayload) : null;

      const res = await fetch(`/api/bulletin/${targetPostId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: targetPostId,
          content: finalContent,
          topicTitle: topicTitleVal,
          topicId: selectedRow?.id || topicTitleVal.toLowerCase().replace(/\s+/g, '-'),
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
        await fetchComments(targetPostId);
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

  // Helper memproses & mengunggah file lampiran komentar diskusi (bisa dari input file maupun Paste/Ctrl+V)
  const processAndUploadCommentFiles = async (rawFiles: File[]) => {
    if (rawFiles.length === 0) return;

    activeCommentUploadsCountRef.current += 1;
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
          try {
            const img = new Image();
            await new Promise((resolve) => {
              img.onload = () => resolve(true);
              img.onerror = () => resolve(false);
              img.src = base64Raw;
            });

            const canvas = document.createElement('canvas');
            const maxW = 1600;
            const maxH = 1200;
            let w = img.width || 1200;
            let h = img.height || 900;

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
          } catch (cErr) {
            console.warn('Canvas compression fallback', cErr);
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
        } catch (uErr) {
          console.warn('Upload fallback to compressed base64 url', uErr);
        }

        uploadedItems.push({
          name: file.name,
          url: uploadedUrl,
          previewUrl: isImg ? finalBase64 : undefined,
          isImage: isImg
        });
      }

      // Selalu gabungkan (append) lampiran yang baru di-paste dengan lampiran yang sudah ada sebelumnya
      setSelectedFiles(prev => {
        const next = [...prev, ...uploadedItems];
        setSelectedFile(next[0] || null);
        return next;
      });
      toast.success(`${uploadedItems.length} lampiran siap dikirim! (Bisa paste screenshot lagi)`, { id: 'upload-comment-file' });
    } catch (err) {
      toast.error('Gagal mengunggah file', { id: 'upload-comment-file' });
    } finally {
      activeCommentUploadsCountRef.current = Math.max(0, activeCommentUploadsCountRef.current - 1);
      if (activeCommentUploadsCountRef.current === 0) {
        setIsUploadingCommentFile(false);
      }
    }
  };

  // Upload file inside discussion comment box with caption
  const handleCommentFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files ? Array.from(e.target.files) : [];
    if (rawFiles.length === 0) return;
    await processAndUploadCommentFiles(rawFiles);
    if (e.target) e.target.value = '';
  };

  // Handler copy-paste langsung gambar di kolom komentar (Ctrl+V tanpa perlu choose file)
  const handleCommentPaste = async (e: React.ClipboardEvent<any>) => {
    const rawFiles = e.clipboardData?.files ? Array.from(e.clipboardData.files) : [];
    const rawItems = e.clipboardData?.items ? Array.from(e.clipboardData.items) : [];

    const imageFiles: File[] = [];

    // 1. Cek jika clipboard langsung berisi file image (misal multi-copy di Explorer)
    for (const f of rawFiles) {
      if (f.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name)) {
        imageFiles.push(f);
      }
    }

    // 2. Jika tidak ada file langsung, cek clipboard items (buffer screenshot Snipping Tool / PrtScn)
    if (imageFiles.length === 0 && rawItems.length > 0) {
      for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const randSuffix = Math.random().toString(36).substring(2, 6);
            const ext = blob.type.split('/')[1] || 'png';
            const filename = blob.name && blob.name !== 'image.png' && blob.name !== 'blob'
              ? blob.name 
              : `pasted_image_${timestamp}_${i + 1}_${randSuffix}.${ext}`;
            imageFiles.push(new File([blob], filename, { type: blob.type }));
          }
        }
      }
    }

    if (imageFiles.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      await processAndUploadCommentFiles(imageFiles);

      // Auto-focus textarea agar user bisa langsung mengetik pesan atau menekan Enter
      setTimeout(() => {
        const el = document.getElementById('notion-comment-textarea');
        if (el) el.focus();
      }, 50);
    }
  };

  // Listen to global portal:image_pasted when task detail modal is open
  useEffect(() => {
    if (!selectedRow) return;

    const handlePortalImagePasted = async (e: Event) => {
      const customEvent = e as CustomEvent<{ file: File; base64: string }>;
      if (customEvent.detail?.file) {
        customEvent.preventDefault();
        customEvent.stopPropagation();
        await processAndUploadCommentFiles([customEvent.detail.file]);
      }
    };

    window.addEventListener('portal:image_pasted', handlePortalImagePasted);
    return () => {
      window.removeEventListener('portal:image_pasted', handlePortalImagePasted);
    };
  }, [selectedRow]);

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
      const targetPostId = getEffectivePostId(selectedRow);
      if (!targetPostId) {
        toast.dismiss('upload-gallery');
        toast.error('Tidak dapat mengunggah: Tugas ini berada di halaman logbook virtual dan belum memiliki dokumen fisik terhubung.');
        return;
      }

      const topicTitleVal = selectedTopicTitle || 'Topik';
      const activeSection = section || getRowVal(selectedRow, 'Kategori') || 'Prep & Lab';

      const cRes = await fetch(`/api/bulletin/${targetPostId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: targetPostId,
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
          topicId: selectedRow?.id || topicTitleVal.toLowerCase().replace(/\s+/g, '-'),
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
        await fetchComments(targetPostId);
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
    // 1. Data hasil migrasi dari Notion tidak perlu dikalkulasi waktu selesainya
    const isMigratedFromNotion = 
      row.isMigrated === 'true' || 
      row.isNotionMigration === 'true' || 
      row.source === 'notion' || 
      (getRowVal(row, 'Keterangan') || '').includes('<!--notion-migrated-->') ||
      (getRowVal(row, 'Source') || '').toLowerCase().includes('notion') ||
      (row.id && String(row.id).startsWith('notion-'));

    if (isMigratedFromNotion) {
      return null;
    }

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

    // Akumulasi pending freeze (hari)
    const pendingDays = parseFloat(getRowVal(row, 'Pending Days') || (row as any).pendingDays || '0') || 0;

    if (dStart && dEnd) {
      const diffMs = dEnd.getTime() - dStart.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        if (diffHours >= 1) {
          return {
            label: `${diffHours} Jam`,
            short: `${diffHours} Jam`,
            detail: `Mulai: ${createdStr} • Selesai: ${completedStr || 'Hari ini'}${pendingDays > 0 ? ` • Freeze: ${pendingDays} Hari` : ''}`
          };
        }
        return {
          label: '1 Hari',
          short: '1 Hari',
          detail: `Mulai: ${createdStr} • Selesai: ${completedStr || 'Hari ini'}${pendingDays > 0 ? ` • Freeze: ${pendingDays} Hari` : ''}`
        };
      }

      const totalDays = diffDays + 1;
      const workingDays = Math.max(1, Math.round(totalDays - pendingDays));
      return {
        label: pendingDays > 0 ? `${workingDays} Hari (Freeze: ${pendingDays}h)` : `${totalDays} Hari`,
        short: `${workingDays} Hari`,
        detail: `Mulai: ${createdStr} • Selesai: ${completedStr || 'Hari ini'}${pendingDays > 0 ? ` • Freeze Pending: ${pendingDays} Hari` : ''}`
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
    if (colLower.includes('jenis kegiatan') || colLower.includes('activity name') || colLower === 'task' || colLower === 'judul' || colLower === 'name') return <span className="text-slate-400 mr-1 text-xs">≡</span>;
    if (colLower.includes('keterangan') || colLower.includes('catatan') || colLower.includes('deskripsi') || colLower.includes('description')) return <span className="text-slate-400 mr-1 text-xs">≡</span>;
    if (colLower.includes('created') || colLower.includes('tanggal dibuat') || colLower.includes('waktu dibuat')) return <span className="text-slate-400 mr-1 text-xs">📅</span>;
    if (colLower.includes('completed') || colLower.includes('completion') || colLower.includes('aktual selesai') || colLower === 'selesai' || colLower.includes('waktu selesai') || colLower.includes('tanggal selesai')) return <span className="text-emerald-500 mr-1 text-xs">✓</span>;
    if (colLower.includes('remarks') || colLower.includes('keterangan batas')) return <span className="text-teal-500 mr-1 text-xs">⚡</span>;
    if (colLower.includes('due') || colLower.includes('deadline') || colLower.includes('target') || colLower.includes('jatuh tempo') || colLower.includes('batas waktu')) return <span className="text-amber-500 mr-1 text-xs">🎯</span>;
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
  // Khusus tabel pada dokumen/artikel Labnote (!isLogbookTable), kolom description langsung auto-expanded
  const renderFormattedNotes = (text: string, isExpanded: boolean = true) => {
    if (!text || text === '-' || text === '•') return <span className="font-sans text-xs text-slate-400">-</span>;
    // Normalize <br/>, <br>, <br /> to newlines
    const normalized = text.replace(/<br\s*\/?>/gi, '\n');
    const cleanText = normalized
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<!-?[a-zA-Z0-9_\-\s]+.*?>?/g, '')
      .replace(/<!--.*$/g, '')
      .trim();

    if (!cleanText || cleanText === '-' || cleanText === '•' || cleanText === '---') {
      return <span className="font-sans text-xs text-slate-400">-</span>;
    }

    // Auto-expanded: tabel Labnote (!isLogbookTable) langsung auto-expanded utuh, tabel logbook mengikuti status isExpanded
    const shouldExpand = !isLogbookTable || isExpanded;

    return (
      <div 
        className={`leading-relaxed font-sans font-normal block w-full transition-all ${
          !shouldExpand ? 'max-h-[36px] overflow-hidden line-clamp-1' : 'space-y-1'
        } ${fitPageMode ? 'text-xs' : 'text-[13px]'} ${isNotionLight ? 'text-[#475569]' : 'text-slate-300'}`}
        style={{ 
          fontSize: fitPageMode ? '12px' : '13px',
          fontFamily: 'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
          color: isNotionLight ? '#475569' : 'var(--text-muted, #94a3b8)',
          lineHeight: '1.6'
        }}
        dangerouslySetInnerHTML={{ __html: markdownToVisualHtml(cleanText) }}
        title={cleanText}
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
                <span>{translateDisplayText(title) || 'Database Table'}</span>
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
            {/* Logbook Smart Task Recommendations Button */}
            {isLogbookTable && (
              <button
                type="button"
                onClick={() => {
                  setLogbookActiveTab('planning');
                  setShowLogbookRecModal(true);
                }}
                className="h-7 px-2.5 rounded-lg bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 border border-teal-400/30 mr-1"
                title="Buka Seleksi Tugas Fokus Hari Ini dari Labnote (Routine & Non-Routine Aktif)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span className="hidden sm:inline">+ Tambah Tugas Fokus</span>
                <span className="sm:hidden">+ Fokus</span>
              </button>
            )}
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
                        { key: 'ALL', label: 'Semua', count: stats.total, isMeta: true },
                        { key: 'ACTIVE', label: 'Aktif', count: stats.total - stats.closed - stats.canceled, isMeta: true },
                        { 
                          key: 'ON PROGRESS', 
                          label: 'On Progress', 
                          count: stats.onProgress, 
                          bgColor: '#FDECC8', 
                          textColor: '#8F6B12',
                          icon: <RotateCcw className="w-2.5 h-2.5 shrink-0" style={{ color: '#8F6B12' }} /> 
                        },
                        { 
                          key: 'OPEN', 
                          label: 'Open', 
                          count: stats.open, 
                          bgColor: '#E3E2E0', 
                          textColor: '#5A5A58',
                          icon: <Clock className="w-2.5 h-2.5 shrink-0" style={{ color: '#5A5A58' }} /> 
                        },
                        { 
                          key: 'CLOSE', 
                          label: 'Selesai', 
                          count: stats.closed, 
                          bgColor: '#D3E5EF', 
                          textColor: '#235A80',
                          icon: <CheckCircle2 className="w-2.5 h-2.5 shrink-0" style={{ color: '#235A80' }} /> 
                        },
                        { 
                          key: 'CANCELED', 
                          label: 'Batal', 
                          count: stats.canceled, 
                          bgColor: '#FFE2DD', 
                          textColor: '#9B3E37',
                          icon: <AlertCircle className="w-2.5 h-2.5 shrink-0" style={{ color: '#9B3E37' }} /> 
                        },
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
                            style={!st.isMeta ? { backgroundColor: st.bgColor, color: st.textColor } : undefined}
                            className={`px-2 py-1 rounded-md text-[11px] transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                              st.isMeta
                                ? isSelected
                                  ? 'bg-[#37352f] text-white border border-[#37352f] dark:bg-teal-600 dark:border-teal-500 shadow-2xs font-semibold'
                                  : isNotionLight
                                  ? 'bg-[#f7f7f5] hover:bg-[#efefed] text-[#37352f] border border-[#e9e9e7] opacity-80 hover:opacity-100 font-medium'
                                  : 'bg-[#282828] hover:bg-[#333333] text-slate-300 border border-slate-700 opacity-80 hover:opacity-100 font-medium'
                                : isSelected
                                ? 'font-semibold ring-2 ring-slate-800/80 dark:ring-white/80 ring-offset-1 shadow-xs scale-[1.02] border border-transparent opacity-100'
                                : 'font-medium border border-transparent opacity-65 hover:opacity-100 hover:shadow-2xs'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="w-3 h-3 stroke-[2.5] shrink-0" style={!st.isMeta ? { color: st.textColor } : undefined} />
                            ) : (
                              st.icon
                            )}
                            <span>{st.label}</span>
                            <span className="text-[10px] opacity-80 font-mono font-normal">({st.count})</span>
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
                        { key: 'ALL', label: 'Semua Prioritas', count: stats.total, isMeta: true },
                        { 
                          key: 'URGENT', 
                          label: 'Urgent', 
                          count: stats.urgent || 0, 
                          bgColor: '#FFE2DD', 
                          textColor: '#9B3E37',
                          icon: <AlertCircle className="w-2.5 h-2.5 shrink-0" style={{ color: '#9B3E37' }} />
                        },
                        { 
                          key: 'HIGH', 
                          label: 'High', 
                          count: stats.high || 0, 
                          bgColor: '#FADEC9', 
                          textColor: '#9A5826',
                          icon: <AlertTriangle className="w-2.5 h-2.5 shrink-0" style={{ color: '#9A5826' }} />
                        },
                        { 
                          key: 'MEDIUM', 
                          label: 'Medium', 
                          count: stats.medium || 0, 
                          bgColor: '#D3E5EF', 
                          textColor: '#235A80',
                          icon: <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#235A80' }} />
                        },
                        { 
                          key: 'NORMAL', 
                          label: 'Normal', 
                          count: stats.normal || 0, 
                          bgColor: '#DBEDDB', 
                          textColor: '#286641',
                          icon: <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#286641' }} />
                        },
                        { 
                          key: 'LOW', 
                          label: 'Low', 
                          count: stats.low || 0, 
                          bgColor: '#E3E2E0', 
                          textColor: '#5A5A58',
                          icon: <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#5A5A58' }} />
                        },
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
                            style={!p.isMeta ? { backgroundColor: p.bgColor, color: p.textColor } : undefined}
                            className={`px-2 py-1 rounded-md text-[11px] transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                              p.isMeta
                                ? isSelected
                                  ? 'bg-[#37352f] text-white border border-[#37352f] dark:bg-teal-600 dark:border-teal-500 shadow-2xs font-semibold'
                                  : isNotionLight
                                  ? 'bg-[#f7f7f5] hover:bg-[#efefed] text-[#37352f] border border-[#e9e9e7] opacity-80 hover:opacity-100 font-medium'
                                  : 'bg-[#282828] hover:bg-[#333333] text-slate-300 border border-slate-700 opacity-80 hover:opacity-100 font-medium'
                                : isSelected
                                ? 'font-semibold ring-2 ring-slate-800/80 dark:ring-white/80 ring-offset-1 shadow-xs scale-[1.02] border border-transparent opacity-100'
                                : 'font-medium border border-transparent opacity-65 hover:opacity-100 hover:shadow-2xs'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="w-3 h-3 stroke-[2.5] shrink-0" style={!p.isMeta ? { color: p.textColor } : undefined} />
                            ) : (
                              p.icon
                            )}
                            <span>{p.label}</span>
                            <span className="text-[10px] opacity-80 font-mono font-normal">({p.count})</span>
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
                      { key: 'Last Modified', label: '🕒 Terakhir Diubah (Last Modified)' },
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
                              setSortDirection(col.key === 'Last Modified' ? 'desc' : 'asc');
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
                              handleRequestBatchDelete();
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

            {/* Developer-only Recycle Bin Button */}
            {isSuperUser && (
              <NotionTooltip content="Recycle Bin (Pemulihan Data Terhapus)" position="bottom">
                <button
                  type="button"
                  onClick={() => handleOpenRecycleBin('current')}
                  className="ml-1 px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0 border border-rose-500/30 hover:border-rose-500/60 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span className="hidden sm:inline font-bold">Recycle Bin</span>
                </button>
              </NotionTooltip>
            )}

            {/* Dedicated Primary "+ New" Button in Top-Right Corner */}
            <NotionTooltip content="Tambah Baris Kegiatan Baru" position="bottom">
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="ml-1 sm:ml-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer shrink-0 border border-teal-500/50"
                style={{
                  backgroundColor: '#0d9488',
                  color: '#ffffff'
                }}
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" style={{ color: '#ffffff' }} />
                <span className="font-bold tracking-wide" style={{ color: '#ffffff' }}>New Task</span>
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

      {/* Logbook Unified 2-Tab Navigation (Changelog Harian vs Planning Hari Ini) */}
      {isLogbookTable && (
        <div className="mb-4 space-y-3">
          {/* Top Segmented Control Tab Switcher */}
          <div className={`p-1.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 shadow-2xs ${
            isNotionLight ? 'bg-slate-100/90 border-slate-200/90' : 'bg-slate-900/90 border-slate-800'
          }`}>
            <div className="flex items-center gap-1.5 flex-1 max-w-xl">
              <button
                type="button"
                onClick={() => setLogbookActiveTab('changelog')}
                className={`flex-1 py-2 px-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  logbookActiveTab === 'changelog'
                    ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm border border-slate-200/70 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <ClipboardCheck className={`w-4 h-4 ${logbookActiveTab === 'changelog' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                <span>Changelog & Evaluasi Harian</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-500/20">
                  Audit
                </span>
              </button>

              <button
                type="button"
                onClick={() => setLogbookActiveTab('planning')}
                className={`flex-1 py-2 px-3.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  logbookActiveTab === 'planning'
                    ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 shadow-sm border border-slate-200/70 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Target className={`w-4 h-4 ${logbookActiveTab === 'planning' ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400'}`} />
                <span>Planning Hari Ini (Focus Area)</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                  {logbookTaskCounts.active} Aktif
                </span>
              </button>
            </div>

            <div className="hidden lg:flex items-center gap-2 pr-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-block w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span>{logbookActiveTab === 'changelog' ? 'Review & salin laporan evaluasi kinerja' : 'Kelola rencana & eksekusi tugas hari ini'}</span>
            </div>
          </div>

          {/* TAB 1: Changelog Harian with Interactive Date Filter */}
          {logbookActiveTab === 'changelog' && (
            <LogbookChangelogCard
              sectionName={section || title || 'Prep & Lab'}
              allRows={getAllSectionRowsForChangelog(
                section || title || 'Prep & Lab',
                localRows,
                allPosts || [],
                pt === 'GTS' ? 'GTS' : 'TBP'
              )}
              generalNotes={logbookMeta.generalNotes || {}}
              onCarryOverTask={handleCarryOverTask}
              onSwitchToPlanning={() => setLogbookActiveTab('planning')}
              onViewRawTable={() => {
                setLogbookActiveTab('planning');
                setLogbookFilterMode('all');
              }}
              isNotionLight={isNotionLight}
            />
          )}

          {/* TAB 2: Planning Hari Ini Focus Area View Switcher Bar */}
          {logbookActiveTab === 'planning' && (
            <div className={`px-3 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs transition-all ${
              isNotionLight 
                ? 'bg-slate-50/90 border-slate-200/80 text-slate-700 shadow-2xs' 
                : 'bg-slate-900/60 border-slate-800 text-slate-300 shadow-2xs'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">Mode Focus Area:</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                    {logbookFilterMode === 'focus' 
                      ? '🎯 Focus Area — Menampilkan tugas & subtask aktif, subtask selesai otomatis diringkas'
                      : logbookFilterMode === 'completed'
                      ? '✅ Arsip Selesai — Menampilkan riwayat tugas yang telah selesai'
                      : '📋 Semua Tugas — Menampilkan seluruh tugas aktif dan selesai'}
                  </span>
                </div>
              </div>

              <div className={`flex items-center p-0.5 rounded-lg border ${
                isNotionLight ? 'bg-white border-slate-200' : 'bg-slate-800/80 border-slate-700'
              }`}>
                <button
                  type="button"
                  onClick={() => setLogbookFilterMode('focus')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    logbookFilterMode === 'focus'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                  title="Tampilkan hanya tugas yang belum selesai"
                >
                  <span>🎯 Focus Area</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    logbookFilterMode === 'focus' ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {logbookTaskCounts.active}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLogbookFilterMode('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    logbookFilterMode === 'all'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                  title="Tampilkan seluruh tugas"
                >
                  <span>Semua Tugas</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    logbookFilterMode === 'all' ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {logbookTaskCounts.total}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLogbookFilterMode('completed')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    logbookFilterMode === 'completed'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                  title="Tampilkan tugas yang sudah selesai"
                >
                  <span>Selesai</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    logbookFilterMode === 'completed' ? 'bg-white/25 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {logbookTaskCounts.closed}
                  </span>
                </button>

                {/* KPI On-Time Delivery Indicator */}
                <div 
                  className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border select-none ${
                    kpiMetrics.overdueCount > 0
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60'
                  }`}
                  title={`Parameter KPI SLA Logbook: ${kpiMetrics.onTimeCount} tepat waktu, ${kpiMetrics.overdueCount} terlambat (${kpiMetrics.onTimeRate}% on-time rate)`}
                >
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  <span>KPI SLA:</span>
                  <span className="font-mono font-bold">{kpiMetrics.onTimeRate}%</span>
                  {kpiMetrics.overdueCount > 0 && (
                    <span className="text-[10px] px-1 py-0.2 rounded bg-rose-500 text-white font-mono font-bold">
                      {kpiMetrics.overdueCount} Overdue
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. TABLE VIEW (Exact Notion Column Hierarchy & Zoom / Fit Page)            */}
      {/* ========================================================================= */}
      {(!isLogbookTable || logbookActiveTab === 'planning') && viewMode === 'table' && (
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
                  const isJudul = cleanHeader.includes('activity name') || cleanHeader.includes('jenis kegiatan') || cleanHeader === 'task' || cleanHeader === 'judul' || cleanHeader === 'name' || cleanHeader === 'title' || cleanHeader === 'nama' || cleanHeader === 'materi';
                  const colLower = colHeader.toLowerCase();
                  const colIdx = displayHeaders.indexOf(colHeader);

                  // Column width classes based on fitPageMode
                  let widthClass = 'whitespace-nowrap px-3.5 py-3';
                  if (fitPageMode) {
                    if (isNum) widthClass = 'w-[5%] text-center px-1 py-2.5';
                    else if (isJudul) widthClass = 'w-[25%] px-2.5 py-2.5';
                    else if (colLower.includes('keterangan') || colLower.includes('catatan') || colLower.includes('description') || colLower.includes('deskripsi')) widthClass = 'w-[22%] px-2.5 py-2.5';
                    else if (colLower.includes('created')) widthClass = 'w-[9%] px-1.5 py-2.5';
                    else if (colLower.includes('completed') || colLower.includes('completion') || colLower.includes('aktual selesai') || colLower === 'selesai' || colLower.includes('tanggal selesai') || colLower.includes('waktu selesai')) widthClass = 'w-[9%] px-1.5 py-2.5';
                    else if (colLower.includes('due') || colLower.includes('deadline') || colLower.includes('target') || colLower.includes('jatuh tempo') || colLower.includes('batas waktu')) widthClass = 'w-[10%] px-1.5 py-2.5';
                    else if (colLower.includes('status')) widthClass = 'w-[9%] px-1.5 py-2.5';
                    else if (colLower === 'pic' || colLower.includes('assignee')) widthClass = 'w-[11%] px-1.5 py-2.5';
                    else if (colLower.includes('priority') || colLower.includes('prioritas')) widthClass = 'w-[6%] px-1.5 py-2.5';
                    else if (!colLower.includes('name') && (colLower.includes('activity') || colLower.includes('aktivitas'))) widthClass = 'w-[7%] px-1.5 py-2.5';
                    else widthClass = 'w-[6%] px-1.5 py-2.5';
                  } else {
                    if (isNum) widthClass = 'w-16 text-center px-3.5 py-3 whitespace-nowrap';
                    else if (isJudul) widthClass = 'min-w-[260px] px-3.5 py-3 whitespace-nowrap';
                    else if (colLower.includes('keterangan') || colLower.includes('description') || colLower.includes('deskripsi')) widthClass = 'w-[360px] min-w-[280px] max-w-[450px] px-3.5 py-3 overflow-hidden';
                    else if (colLower.includes('due') || colLower.includes('deadline') || colLower.includes('target') || colLower.includes('jatuh tempo') || colLower.includes('batas waktu')) widthClass = 'min-w-[145px] px-3.5 py-3 whitespace-nowrap';
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
                            {(() => {
                              const clean = colLower.replace(/^[^a-z0-9]+/i, '').trim();
                              if (clean.includes('activity name') || clean.includes('jenis kegiatan') || clean === 'task' || clean === 'judul' || clean === 'name') return 'Activity Name';
                              if (clean.includes('keterangan') || clean.includes('deskripsi') || clean.includes('description') || clean.includes('catatan')) return 'Description';
                              if (clean.includes('tanggal selesai') || clean.includes('completed') || clean.includes('completion') || clean === 'selesai' || clean.includes('waktu selesai')) return 'Completion Date';
                              if (clean === 'remarks' || clean.includes('remarks') || clean.includes('keterangan batas')) return 'Remarks';
                              if (clean.includes('due') || clean.includes('deadline') || clean.includes('target') || clean.includes('jatuh tempo') || clean.includes('batas waktu')) return 'Due Date';
                              if (clean === 'number' || clean === 'no') return 'Number';
                              if (clean.includes('created')) return 'Created Time';
                              if (clean.includes('status')) return 'Status';
                              if (clean === 'pic' || clean.includes('assignee')) return 'PIC';
                              if (clean.includes('priority') || clean.includes('prioritas')) return 'Priority';
                              if (clean.includes('period') || clean.includes('periode')) return 'Period';
                              if (!clean.includes('name') && (clean.includes('activity') || clean.includes('aktivitas'))) return 'Activity Type';
                              return colHeader.replace(/^=\s*/, '');
                            })()}
                          </span>
                          {isSorted && (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" /> : <ArrowDown className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                          )}
                        </div>

                        {/* Quick Create Task button inside Jenis kegiatan column header */}
                        {isJudul && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInsertBlankRow(0);
                            }}
                            title="Quick Create Task: Tambah kegiatan baru langsung di Baris #1"
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold text-white shadow-xs transition-all cursor-pointer shrink-0 ml-1 active:scale-95 border border-teal-500/50"
                            style={{
                              backgroundColor: '#0d9488',
                              color: '#ffffff'
                            }}
                          >
                            <Plus className="w-3 h-3 stroke-[2.5]" style={{ color: '#ffffff' }} />
                            <span className="hidden sm:inline" style={{ color: '#ffffff' }}>Quick</span>
                          </button>
                        )}

                        {/* Column Reorder (< and >) and Sembunyikan (EyeOff) Actions - HANYA MUNCUL DI MODE EDIT TABEL */}
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

                            {/* Sembunyikan Kolom (Non-protected) */}
                            {!isJudul && !cleanHeader.includes('keterangan') && !cleanHeader.includes('description') && !cleanHeader.includes('status') && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleHideColumn(colHeader);
                                }}
                                title={`Sembunyikan kolom "${colHeader}" (data tersimpan aman)`}
                                className="p-0.5 rounded hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 transition-all cursor-pointer"
                              >
                                <EyeOff className="w-3 h-3" />
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

                      {/* Kolom Tersembunyi Section (Jika ada kolom yang disembunyikan) */}
                      {hiddenColumns.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                          <div className="text-[10px] px-1 mb-1.5 font-bold uppercase tracking-wider text-amber-500 flex items-center justify-between">
                            <span>Kolom Tersembunyi ({hiddenColumns.length})</span>
                            <button
                              type="button"
                              onClick={() => {
                                setHiddenColumns([]);
                                try {
                                  localStorage.removeItem(`notion_hidden_cols_${section || 'default'}`);
                                } catch {}
                                toast.success('Semua kolom ditampilkan kembali');
                              }}
                              className="text-[10px] text-teal-500 hover:text-teal-400 font-semibold cursor-pointer underline hover:no-underline"
                            >
                              Tampilkan Semua
                            </button>
                          </div>
                          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                            {hiddenColumns.map(colName => (
                              <div 
                                key={colName}
                                className="flex items-center justify-between p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs"
                              >
                                <span className="truncate font-medium text-amber-300">{colName}</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleHideColumn(colName)}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-semibold cursor-pointer transition-colors shrink-0"
                                  title={`Tampilkan kembali kolom "${colName}"`}
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>Tampilkan</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </th>

                <th 
                  className={`sticky top-0 z-20 text-center shadow-2xs border-b text-[13px] ${fitPageMode ? 'w-[5%] px-1.5 py-2.5' : 'w-24 px-3 py-3'} ${
                    isNotionLight ? 'bg-[#fbfbfa] text-slate-700 font-semibold border-[#e9e9e8]' : 'bg-[#202020] text-slate-300 font-bold border-[#303030]'
                  }`}
                >
                  Actions
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
                      isLogbookTable ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-10">
                          <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-sm">
                            <Sparkles className="w-7 h-7 text-teal-500 animate-pulse" />
                          </div>
                          <div className="text-center max-w-md">
                            <p className={`font-bold text-base ${isNotionLight ? 'text-slate-800' : 'text-slate-100'}`}>
                              Belum Ada Tugas yang Difokuskan Hari Ini
                            </p>
                            <p className="text-xs mt-1.5 leading-relaxed text-slate-500 dark:text-slate-400">
                              Awali hari dengan memilih tugas dari Labnote yang menjadi prioritas kerja hari ini. Tugas yang tersemat (Pinned) akan otomatis berada di posisi teratas.
                            </p>
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                setLogbookActiveTab('planning');
                                setShowLogbookRecModal(true);
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-teal-900/20 transition-all cursor-pointer active:scale-95"
                            >
                              <Sparkles className="w-4 h-4 text-amber-300" />
                              <span>+ Tambah Tugas Fokus Hari Ini</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleOpenAddModal}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Buat Tugas Manual</span>
                            </button>
                          </div>
                        </div>
                      ) : (
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
                      )
                    ) : (
                      <span className="italic">Tidak ada data yang sesuai dengan pencarian atau filter.</span>
                    )}
                  </td>
                </tr>
              ) : (() => {
                let runningParentNumber = 0;
                return groupedRowsData.map(({ groupName, groupRows }, gIdx) => {
                  const isCollapsed = collapsedGroups[groupName];

                  return (
                    <React.Fragment key={groupName ? `grp-${groupName}` : `grp-idx-${gIdx}`}>
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
                                {translateDisplayText(groupName)}
                              </span>
                              <span className={`text-[11px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                                isNotionLight ? 'bg-slate-200/80 text-slate-700' : 'bg-slate-800 text-slate-300'
                              }`}>
                                {groupRows.length}
                              </span>
                            </div>
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

                            const isCurrentParentValid = currentParentItem && (
                              (getRowVal(currentParentItem.parentRow, 'Jenis kegiatan') || '').trim().length > 0
                            );

                            if (existingParent) {
                              existingParent.subItems.push({
                                row,
                                actualIndex: actualRowIndex
                              });
                            } else if (isCurrentParentValid && (!designatedParent || designatedParent === currentParentItem.parentRow)) {
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
                            } else if (isCurrentParentValid) {
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

                        // Prioritaskan baris yang di-pin berdasarkan urutan pin (FIFO) dan terapkan sortColumn ke tugas utama
                        hierarchicalItems.sort((a, b) => {
                          const aPin = isRowPinned(a.parentRow);
                          const bPin = isRowPinned(b.parentRow);
                          if (aPin && !bPin) return -1;
                          if (!aPin && bPin) return 1;
                          if (aPin && bPin) {
                            const aKey = a.parentRow.id ? String(a.parentRow.id) : (a.parentRow['Jenis kegiatan'] || '').replace(/^↳\s*/, '').trim();
                            const bKey = b.parentRow.id ? String(b.parentRow.id) : (b.parentRow['Jenis kegiatan'] || '').replace(/^↳\s*/, '').trim();
                            const aIdx = pinnedRowKeys.indexOf(aKey);
                            const bIdx = pinnedRowKeys.indexOf(bKey);
                            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                            if (aIdx !== -1) return -1;
                            if (bIdx !== -1) return 1;
                          }

                          if (sortColumn) {
                            const rawA = (getRowVal(a.parentRow, sortColumn) || a.parentRow[sortColumn] || '').trim();
                            const rawB = (getRowVal(b.parentRow, sortColumn) || b.parentRow[sortColumn] || '').trim();

                            // 1. Sort by Last Modified (Terakhir Diubah)
                            if (sortColumn === 'Last Modified' || sortColumn.toLowerCase().includes('modified')) {
                              const timeA = Date.parse(a.parentRow['Last Modified'] || a.parentRow['Date Modified'] || a.parentRow['Created Time'] || '') || 0;
                              const timeB = Date.parse(b.parentRow['Last Modified'] || b.parentRow['Date Modified'] || b.parentRow['Created Time'] || '') || 0;
                              return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
                            }

                            // 2. Sort by Nomor Baris (#)
                            if (sortColumn.toLowerCase() === 'number' || sortColumn.toLowerCase() === 'no') {
                              const numA = parseFloat(rawA) || 0;
                              const numB = parseFloat(rawB) || 0;
                              return sortDirection === 'asc' ? numA - numB : numB - numA;
                            }

                            // 3. Sort by Prioritas
                            if (sortColumn.toLowerCase().includes('priorit') || sortColumn.toLowerCase() === 'priority') {
                              const wA = getPriorityWeight(rawA);
                              const wB = getPriorityWeight(rawB);
                              return sortDirection === 'asc' ? wA - wB : wB - wA;
                            }

                            // 4. Sort by Date/Time
                            const timeA = Date.parse(rawA);
                            const timeB = Date.parse(rawB);
                            if (!isNaN(timeA) && !isNaN(timeB)) {
                              return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
                            }

                            // 5. Sort Alphabetical
                            const valA = rawA.toLowerCase();
                            const valB = rawB.toLowerCase();
                            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
                            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
                          }
                          return 0;
                        });

                        // Helper render item baris (parent atau sub-item)
                        const renderRowItem = (
                          row: TableRowData,
                          actualRowIndex: number,
                          isSubItem: boolean,
                          hasChildren: boolean,
                          isExpanded: boolean,
                          subItemsList?: Array<{ row: TableRowData; actualIndex: number }>,
                          onToggleExpand?: (e: React.MouseEvent) => void,
                          displayRowNumber?: number
                        ) => {
                          const isDirty = dirtyRowIndices.has(actualRowIndex);
                          const isSelected = selectedRowIndices.has(actualRowIndex);
                          const isSubCompleted = isSubItem ? isSubItemCompleted(row) : false;
                          const rawTitle = (
                            getRowVal(row, 'Activity Name') || 
                            getRowVal(row, 'Jenis kegiatan') || 
                            getRowVal(row, 'Name') || 
                            getRowVal(row, 'Judul') || 
                            row['Activity Name'] || 
                            row['Jenis kegiatan'] || 
                            row['Jenis Kegiatan'] || 
                            row['Name'] || 
                            row['= Name'] || 
                            `Baris ${actualRowIndex + 1}`
                          ).trim();
                          const displayTitle = getDisplayTitle(rawTitle);
                          const topicKey = displayTitle.toLowerCase().trim();
                          const rawKey = rawTitle.toLowerCase().trim();
                          const rowIdKey = (row.id || (rawTitle.match(/<!--task-id:([^>]+)-->/)?.[1]) || '').toLowerCase().trim();
                          const cCount = (rowIdKey ? topicCommentCounts[rowIdKey] : 0) || 
                                         topicCommentCounts[topicKey] || 
                                         topicCommentCounts[rawKey] || 
                                         (!isSubItem && rowIdKey ? topicCommentCounts[`parent_${rowIdKey}`] : 0) || 
                                         0;

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
                                <div className="flex items-center justify-center gap-1.5">
                                  {/* Pin Button: Menggantikan logo drag handle GripVertical */}
                                  {!isSubItem ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTogglePinRow(row);
                                      }}
                                      className={`p-0.5 rounded transition-all cursor-pointer ${
                                        isRowPinned(row)
                                          ? 'text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-950/50 opacity-100 shadow-2xs'
                                          : 'text-slate-400 hover:text-amber-500 opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700'
                                      }`}
                                      title={isRowPinned(row) ? 'Lepas Pin Task (Unpin)' : 'Pin Task ke Atas (Maks. 10 task)'}
                                    >
                                      <Pin className={`w-3.5 h-3.5 ${isRowPinned(row) ? 'fill-amber-500 rotate-45 text-amber-500' : ''}`} />
                                    </button>
                                  ) : (
                                    <div className="w-3.5 h-3.5" />
                                  )}

                                  {/* [ ] Select Checkbox */}
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => handleToggleSelectRow(actualRowIndex, e as any)}
                                    className={`w-3.5 h-3.5 rounded cursor-pointer accent-teal-600 transition-opacity ${
                                      isSelected ? 'opacity-100' : 'opacity-50 sm:opacity-0 group-hover:opacity-100 hover:opacity-100'
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
                                let isEditingThis = activeInlineEditor?.rowIndex === actualRowIndex && activeInlineEditor?.colName === colName;
                                let startInlineEdit = (e?: React.MouseEvent) => {
                                  if (e) e.stopPropagation();
                                  setActiveInlineEditor({
                                    rowIndex: actualRowIndex,
                                    colName,
                                    initialValue: val && val !== '-' ? val : '',
                                    multiline: false
                                  });
                                };

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
                                          <span>{displayRowNumber ?? (actualRowIndex + 1)}</span>
                                        )}
                                      </div>
                                    </td>
                                  );
                                }

                                // 2. Jenis kegiatan Column (Judul / Name / Materi / Activity Name)
                                if (cleanCol.includes('activity name') || cleanCol.includes('jenis kegiatan') || cleanCol === 'task' || cleanCol === 'judul' || cleanCol === 'name' || cleanCol === 'title' || cleanCol === 'nama' || cleanCol === 'materi') {
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
                                        const tLower = String(displayTitle || val || '').toLowerCase();
                                        if (tLower.includes('jadwal off')) {
                                          e.stopPropagation();
                                          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                                          window.location.href = `/roster-admin?view=off_schedule&returnTo=${returnUrl}`;
                                          return;
                                        }
                                        if (
                                          tLower.includes('kta/tta') ||
                                          tLower.includes('kta-tta') ||
                                          (tLower.includes('keterlambatan') && tLower.includes('kta')) ||
                                          tLower.includes('rekap kta')
                                        ) {
                                          e.stopPropagation();
                                          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                                          window.location.href = `/safety-rekap?returnTo=${returnUrl}`;
                                          return;
                                        }
                                        if (checkIsTardinessShortcut(tLower)) {
                                          e.stopPropagation();
                                          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                                          window.location.href = `/keterlambatan?returnTo=${returnUrl}`;
                                          return;
                                        }
                                        if (!isEditingThis && onToggleExpand) {
                                          onToggleExpand(e);
                                        }
                                      }}
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setActiveInlineEditor({
                                          rowIndex: actualRowIndex,
                                          colName,
                                          initialValue: displayTitle || val,
                                          multiline: false
                                        });
                                      }}
                                      title={!isEditingThis ? (onToggleExpand ? (isExpanded ? "Klik untuk menutup subtask. Klik 2x (double-click) untuk edit judul." : "Klik untuk membuka subtask. Klik 2x (double-click) untuk edit judul.") : "Klik 2x (double-click) untuk edit judul.") : undefined}
                                    >
                                      {isEditingThis ? (
                                        <NotionInlineEditor
                                          initialValue={displayTitle || val}
                                          fieldLabel={isSubItem ? "Judul Sub-kegiatan" : "Judul Kegiatan"}
                                          multiline={false}
                                          isNotionLight={isNotionLight}
                                          isPinned={isRowPinned(row) && !isSubItem}
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
                                              style={{ 
                                                fontSize: `${labNoteFontSize}px`,
                                                color: (isRowPinned(row) && !isSubItem)
                                                  ? (isNotionLight ? '#2563eb' : '#60a5fa')
                                                  : undefined
                                              }}
                                              className={`leading-normal block transition-all ${
                                                isSubCompleted 
                                                  ? 'line-through text-slate-400 dark:text-slate-500 font-normal' 
                                                  : (isRowPinned(row) && !isSubItem)
                                                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                                                    : isNotionLight 
                                                      ? 'text-[#37352f] font-semibold' 
                                                      : 'text-slate-100 font-semibold'
                                              } ${fitPageMode ? 'break-words' : ''}`}
                                              dangerouslySetInnerHTML={{
                                                __html: (isRowPinned(row) && !isSubItem)
                                                  ? (formatTitleToVisualHtml(stripColorTags(displayTitle)) || (displayTitle ? displayTitle : `<em style="color: var(--text-muted, #64748b)">Tanpa Judul</em>`))
                                                  : (formatTitleToVisualHtml(displayTitle) || (displayTitle ? displayTitle : `<em style="color: var(--text-muted, #64748b)">Tanpa Judul</em>`))
                                              }}
                                            />

                                            {/* Pinned Badge */}
                                            {isRowPinned(row) && !isSubItem && (
                                              <span 
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700/80 select-none shrink-0 shadow-2xs"
                                                title="Task disematkan (pinned) ke posisi teratas dan tidak terpengaruh filter"
                                              >
                                                <Pin className="w-2.5 h-2.5 fill-amber-500 text-amber-600 dark:text-amber-400 rotate-45" />
                                                <span>PINNED</span>
                                              </span>
                                            )}

                                            {/* Linked Module Badge (ExternalLink) */}
                                            {(() => {
                                              const linkInfo = extractRowLinkInfo(row);
                                              if (!linkInfo) return null;
                                              const isTicket = linkInfo.type === 'ticket' || (linkInfo.id && linkInfo.id.toUpperCase().startsWith('TKT-'));
                                              return (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isTicket) {
                                                      setFindingResolutionModalState({
                                                        isOpen: true,
                                                        ticket: null,
                                                        ticketId: linkInfo.id,
                                                        subRowIndex: isSubItem ? actualRowIndex : undefined,
                                                        initialMode: isSubCompleted ? 'view' : 'resolve'
                                                      });
                                                    } else if (linkInfo.type === 'wo' && linkInfo.id) {
                                                      window.open(`/wo-maintenance-dashboard?wo=${encodeURIComponent(linkInfo.id)}`, '_blank');
                                                    } else if (linkInfo.type === 'route' && linkInfo.url) {
                                                      window.location.href = linkInfo.url;
                                                    } else if (linkInfo.url) {
                                                      window.open(linkInfo.url, '_blank', 'noopener,noreferrer');
                                                    }
                                                  }}
                                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all cursor-pointer shrink-0 shadow-2xs ${
                                                    isTicket
                                                      ? isSubCompleted
                                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100'
                                                      : 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800 hover:bg-sky-100'
                                                  }`}
                                                  title={isTicket ? `Buka detail temuan inspeksi (${linkInfo.id})` : `Buka tautan modul: ${linkInfo.label || linkInfo.url}`}
                                                >
                                                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                                  <span className="truncate max-w-[130px]">{linkInfo.id || linkInfo.label || 'Tautan'}</span>
                                                </button>
                                              );
                                            })()}

                                            {/* Button Input Temuan Sidak Management (Only on parent task "Review temuan inspeksi gabungan") */}
                                            {!isSubItem && (displayTitle.toLowerCase().includes('review temuan inspeksi gabungan') || rawTitle.toLowerCase().includes('review temuan inspeksi gabungan')) && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const parentTaskId = (rawTitle.match(/<!--task-id:([^>]+)-->/)?.[1]) || row.id || `task_${Date.now()}`;
                                                  setCreateFindingModalState({
                                                    isOpen: true,
                                                    parentRowIndex: actualRowIndex,
                                                    parentTaskId
                                                  });
                                                }}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white shadow-2xs transition-all cursor-pointer shrink-0 ml-1"
                                                title="Input temuan baru Sidak Management (Inspeksi Gabungan)"
                                              >
                                                <Plus className="w-3 h-3 stroke-[3]" />
                                                <span>+ Input Temuan Sidak</span>
                                              </button>
                                            )}
                                            
                                            {/* Quick Module Shortcut Buttons (Enabled everywhere except Weekly Maintenance) */}
                                            {(() => {
                                              if (isWeeklyMaintenanceTable) {
                                                return (
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedRow(row);
                                                      setModalTab('details');
                                                    }}
                                                    className={`ml-1 opacity-0 group-hover/cell:opacity-100 px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all uppercase tracking-wider cursor-pointer shadow-2xs shrink-0 ${
                                                      isNotionLight
                                                        ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                                                        : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300'
                                                    }`}
                                                    title="Buka dokumen / detail halaman"
                                                  >
                                                    OPEN
                                                  </button>
                                                );
                                              }

                                              const taskText = String(displayTitle || val || '').toLowerCase();
                                              const isLeaveShortcut = taskText.includes('jadwal cuti');
                                              const isOffShortcut = taskText.includes('jadwal off');
                                              const isPermissionShortcut = (
                                                taskText.includes('tidak masuk') ||
                                                taskText.includes('izin karyawan') ||
                                                taskText.includes('rekap izin')
                                              );
                                              const isTrainingShortcut = (
                                                /\bsap\b/i.test(taskText) ||
                                                taskText.includes('training') ||
                                                taskText.includes('permintaan training')
                                              );
                                              const isInspectionScheduleShortcut = (
                                                taskText.includes('jadwal inspeksi staff preparasi') ||
                                                (taskText.includes('jadwal inspeksi') && taskText.includes('staff') && taskText.includes('minggu'))
                                              );
                                              const isSafetyRekapShortcut = (
                                                taskText.includes('kta/tta') ||
                                                taskText.includes('kta-tta') ||
                                                (taskText.includes('keterlambatan') && taskText.includes('kta')) ||
                                                taskText.includes('rekap kta')
                                              );
                                              const isTardinessShortcut = checkIsTardinessShortcut(taskText);
                                              const hasModuleShortcut = isLeaveShortcut || isOffShortcut || isPermissionShortcut || isTrainingShortcut || isInspectionScheduleShortcut || isSafetyRekapShortcut || isTardinessShortcut;

                                              return (
                                                <>
                                                  {/* Quick Open Jadwal Cuti Sheet button */}
                                                  {isLeaveShortcut && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                                                        window.location.href = `/roster-admin?view=leave_schedule&returnTo=${returnUrl}`;
                                                      }}
                                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-teal-500/15 hover:bg-teal-500/25 text-teal-700 dark:text-teal-300 border border-teal-500/30 transition-all cursor-pointer shadow-2xs shrink-0"
                                                      title="Klik untuk membuka Modul Jadwal Cuti di Roster"
                                                    >
                                                      <PlaneTakeoff className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
                                                      <span>Buka Jadwal Cuti</span>
                                                    </button>
                                                  )}

                                                  {/* Quick Open Jadwal Off Sheet button */}
                                                  {isOffShortcut && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                                                        window.location.href = `/roster-admin?view=off_schedule&returnTo=${returnUrl}`;
                                                      }}
                                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 border border-amber-500/30 transition-all cursor-pointer shadow-2xs shrink-0"
                                                      title="Klik untuk membuka Modul Jadwal Off Karyawan di Roster"
                                                    >
                                                      <Coffee className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                                      <span>Buka Jadwal Off</span>
                                                    </button>
                                                  )}

                                                  {/* Quick Open Rekapan Izin Karyawan button */}
                                                  {isPermissionShortcut && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                                                        window.location.href = `/employee-leaves?returnTo=${returnUrl}`;
                                                      }}
                                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 transition-all cursor-pointer shadow-2xs shrink-0"
                                                      title="Klik untuk membuka Modul Rekapan Izin Karyawan"
                                                    >
                                                      <FileSpreadsheet className="w-2.5 h-2.5 text-indigo-600 dark:text-indigo-400" />
                                                      <span>Buka Rekapan Izin</span>
                                                    </button>
                                                  )}

                                                  {/* Quick Open Form Permintaan Training button (Strict word match to prevent false matches like 'hisapan') */}
                                                  {isTrainingShortcut && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                                                        window.location.href = '/training-database?tab=form_permintaan&returnTo=' + returnUrl;
                                                      }}
                                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-all cursor-pointer shadow-2xs shrink-0"
                                                      title="Klik untuk membuka Form Permintaan Training"
                                                    >
                                                      <FileSpreadsheet className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400" />
                                                      <span>Buka Form Training</span>
                                                    </button>
                                                  )}

                                                  {/* Quick Open Jadwal Inspeksi button (Khusus task: Jadwal Inspeksi Staff Preparasi & Lab Setiap Minggu) */}
                                                  {isInspectionScheduleShortcut && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                                                        window.location.href = `/inspection-schedule?returnTo=${returnUrl}`;
                                                      }}
                                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/30 transition-all cursor-pointer shadow-2xs shrink-0"
                                                      title="Klik untuk membuka Modul Jadwal Inspeksi"
                                                    >
                                                      <CalendarDays className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                                      <span>Buka Jadwal Inspeksi</span>
                                                    </button>
                                                  )}

                                                    {/* Quick Open Rekap KTA/TTA & Inspeksi button */}
                                                    {isSafetyRekapShortcut && (
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                                                          window.location.href = `/safety-rekap?returnTo=${returnUrl}`;
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-500/30 transition-all cursor-pointer shadow-2xs shrink-0"
                                                        title="Klik untuk membuka Modul Rekap KTA/TTA & Inspeksi"
                                                      >
                                                        <ClipboardList className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                                                        <span>Buka Rekap KTA/TTA</span>
                                                      </button>
                                                    )}

                                                    {/* Quick Open Rekapan Keterlambatan & Pulang Cepat button */}
                                                    {isTardinessShortcut && (
                                                      <button
                                                        type="button"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                                                          window.location.href = `/keterlambatan?returnTo=${returnUrl}`;
                                                        }}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-bold bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 transition-all cursor-pointer shadow-2xs shrink-0"
                                                        title="Klik untuk membuka Modul Rekapan Keterlambatan & Pulang Cepat"
                                                      >
                                                        <Clock className="w-2.5 h-2.5 text-rose-600 dark:text-rose-400" />
                                                        <span>Buka Rekap Keterlambatan</span>
                                                      </button>
                                                    )}

                                                  {/* Open Badge / Button (Only displayed when NO shortcut exists) */}
                                                  {!hasModuleShortcut && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedRow(row);
                                                        setModalTab('details');
                                                      }}
                                                      className={`ml-1 opacity-0 group-hover/cell:opacity-100 px-1.5 py-0.5 rounded text-[9.5px] font-bold border transition-all uppercase tracking-wider cursor-pointer shadow-2xs shrink-0 ${
                                                        isNotionLight
                                                          ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                                                          : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-300'
                                                      }`}
                                                      title="Buka dokumen / detail halaman"
                                                    >
                                                      OPEN
                                                    </button>
                                                  )}
                                                </>
                                              );
                                            })()}

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
                                            {/* Link Module Action Button */}
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setLinkModuleModalState({
                                                  isOpen: true,
                                                  rowIndex: actualRowIndex,
                                                  rowTitle: String(row['Jenis kegiatan'] || row['Name'] || row['Activity Name'] || 'Kegiatan'),
                                                  currentLink: extractRowLinkInfo(row)
                                                });
                                              }}
                                              title="Tautkan baris ini ke Tiket K3/SAP, WO, atau Modul Lain"
                                              className={`opacity-0 group-hover/cell:opacity-100 p-1 rounded transition-all cursor-pointer ${
                                                extractRowLinkInfo(row)
                                                  ? 'text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-950/50'
                                                  : 'text-slate-400 hover:text-sky-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                              }`}
                                            >
                                              <Link2 className="w-3 h-3" />
                                            </button>

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

                                // 3. Keterangan / Description Column (dengan Smart Tasklist & Pewarnaan Teks)
                                if (
                                  colLower.includes('keterangan') || 
                                  colLower.includes('description') || 
                                  colLower.includes('catatan') || 
                                  colLower.includes('deskripsi') ||
                                  colLower.includes('content') ||
                                  colLower.includes('rincian')
                                ) {
                                  // (isEditingThis already declared above)
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
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        const cleanInitial = val
                                          .replace(/<!--[\s\S]*?-->/g, '')
                                          .replace(/<!-?[a-zA-Z0-9_\-\s]+.*?>?/g, '')
                                          .replace(/<!--.*$/g, '')
                                          .trim();
                                        setActiveInlineEditor({ rowIndex: actualRowIndex, colName, initialValue: cleanInitial, multiline: true });
                                      }}
                                    >
                                      {isEditingThis ? (
                                        <NotionInlineEditor
                                          initialValue={val
                                            .replace(/<!--[\s\S]*?-->/g, '')
                                            .replace(/<!-?[a-zA-Z0-9_\-\s]+.*?>?/g, '')
                                            .replace(/<!--.*$/g, '')
                                            .trim()}
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
                                          className="relative group/cell flex items-start justify-between gap-1 cursor-pointer font-sans w-full min-w-0"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const cleanInitial = val
                                              .replace(/<!--[\s\S]*?-->/g, '')
                                              .replace(/<!-?[a-zA-Z0-9_\-\s]+.*?>?/g, '')
                                              .replace(/<!--.*$/g, '')
                                              .trim();
                                            setActiveInlineEditor({ rowIndex: actualRowIndex, colName, initialValue: cleanInitial, multiline: true });
                                          }}
                                        >
                                          <div className={`flex-1 min-w-0 font-sans ${fitPageMode ? 'text-xs break-words' : 'text-[13px]'} leading-normal`}>
                                            {renderFormattedNotes(val, isExpanded)}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const cleanInitial = val
                                                .replace(/<!--[\s\S]*?-->/g, '')
                                                .replace(/<!-?[a-zA-Z0-9_\-\s]+.*?>?/g, '')
                                                .replace(/<!--.*$/g, '')
                                                .trim();
                                              setActiveInlineEditor({ rowIndex: actualRowIndex, colName, initialValue: cleanInitial, multiline: true });
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

                                // 4. Tanggal Selesai / Completion Date Column (Interactive Date Picker Calendar)
                                if (
                                  colLower.includes('completion') || 
                                  colLower.includes('completed') || 
                                  colLower.includes('aktual selesai') || 
                                  colLower === 'selesai' || 
                                  colLower.includes('waktu selesai') || 
                                  colLower.includes('tanggal selesai')
                                ) {
                                  let effectiveCompDate = val && val !== '-' ? val : '';
                                  if (!effectiveCompDate) {
                                    const linkedId = extractLinkedTicketId(row);
                                    if (linkedId && ticketMetadataMap[linkedId.toUpperCase()]?.completionDate) {
                                      effectiveCompDate = formatToDDMMYYYY(ticketMetadataMap[linkedId.toUpperCase()].completionDate);
                                    }
                                  }
                                  if (!effectiveCompDate) {
                                    const statusStr = (getRowVal(row, 'Status') || '').toUpperCase();
                                    if (statusStr.includes('CLOSE') || statusStr.includes('SELESAI') || statusStr.includes('DONE')) {
                                      const ketVal = getRowVal(row, 'Keterangan');
                                      const taskProg = parseTasklist(ketVal);
                                      if (taskProg.items.length > 0) {
                                        const dates = taskProg.items.map(i => i.checkedDate).filter((d) => Boolean(d)).sort();
                                        if (dates.length > 0) {
                                          effectiveCompDate = formatToDDMMYYYY(dates[dates.length - 1]);
                                        }
                                      }
                                    }
                                  }

                                  return (
                                    <td 
                                      key={colName} 
                                      style={{ ...getColStyle(colName), color: isNotionLight ? '#047857' : '#34d399' }} 
                                      className={`font-sans border-r cursor-pointer ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${
                                        fitPageMode ? 'px-2 py-2 text-xs truncate' : 'px-3.5 py-2.5 whitespace-nowrap text-[13px]'
                                      }`}
                                      title="Klik atau klik 2x (double-click) untuk memilih tanggal selesai"
                                    >
                                      <NotionCompletionDateCell
                                        value={effectiveCompDate || val}
                                        isNotionLight={isNotionLight}
                                        onChange={(newDate) => {
                                          handleUpdateCellDirect(actualRowIndex, colName, newDate);
                                        }}
                                      />
                                    </td>
                                  );
                                }

                                // 4a. Remarks Column (Evaluasi Waktu Penyelesaian: Due Date dikurang Completion Date)
                                if (colLower === 'remarks' || colLower.includes('remarks') || colLower.includes('keterangan batas')) {
                                  const dueDateVal = getRowVal(row, 'Due Date') || getRowVal(row, 'Batas Waktu') || getRowVal(row, 'Target Date') || row['Due Date'];
                                  let compDateVal = getRowVal(row, 'Completion Date') || getRowVal(row, 'Tanggal Selesai') || getRowVal(row, 'Completed Time') || row['Completion Date'];
                                  if (!compDateVal || compDateVal === '-') {
                                    const linkedId = extractLinkedTicketId(row);
                                    if (linkedId && ticketMetadataMap[linkedId.toUpperCase()]?.completionDate) {
                                      compDateVal = formatToDDMMYYYY(ticketMetadataMap[linkedId.toUpperCase()].completionDate);
                                    }
                                  }

                                  const due = parseDateToMidnight(dueDateVal);
                                  const comp = parseDateToMidnight(compDateVal);

                                  let badgeNode = <span className="font-mono text-slate-400">-</span>;

                                  if (comp && due) {
                                    // Selisih: Due Date dikurang Completion Date
                                    const diffMs = due.getTime() - comp.getTime();
                                    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                                    if (diffDays >= 0) {
                                      // Selesai sebelum atau tepat pada Due Date -> On Time
                                      badgeNode = (
                                        <span 
                                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap shadow-2xs"
                                          title={`Selesai tepat waktu (${diffDays === 0 ? 'Hari H' : `${diffDays} hari lebih cepat`})`}
                                        >
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                          <span>On Time</span>
                                        </span>
                                      );
                                    } else {
                                      // Melewati batas waktu -> Late
                                      const daysLate = Math.abs(diffDays);
                                      badgeNode = (
                                        <span 
                                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 whitespace-nowrap shadow-2xs"
                                          title={`Terlambat ${daysLate} hari melewati batas waktu`}
                                        >
                                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                          <span>Late</span>
                                        </span>
                                      );
                                    }
                                  } else if (comp && !due) {
                                    badgeNode = (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap shadow-2xs">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                        <span>On Time</span>
                                      </span>
                                    );
                                  } else if (!comp && due) {
                                    // Belum selesai, cek jika hari ini sudah melewati due date
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const diffMs = due.getTime() - today.getTime();
                                    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                                    if (diffDays < 0) {
                                      const daysOverdue = Math.abs(diffDays);
                                      badgeNode = (
                                        <span 
                                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 whitespace-nowrap shadow-2xs"
                                          title={`Belum selesai dan sudah melewati batas waktu (${daysOverdue} hari lalu)`}
                                        >
                                          <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                          <span>Late</span>
                                        </span>
                                      );
                                    } else {
                                      badgeNode = <span className="font-mono text-slate-400">-</span>;
                                    }
                                  }

                                  return (
                                    <td 
                                      key={colName} 
                                      style={getColStyle(colName)} 
                                      className={`font-sans border-r ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${
                                        fitPageMode ? 'px-2 py-2 text-xs truncate' : 'px-3.5 py-2.5 whitespace-nowrap text-[13px]'
                                      }`}
                                    >
                                      {badgeNode}
                                    </td>
                                  );
                                }

                                // 4b. Due Date Column (Batas Waktu / Parameter Wajib KPI)
                                if (colLower.includes('due') || colLower.includes('deadline') || colLower.includes('target') || colLower.includes('jatuh tempo') || colLower.includes('batas waktu')) {
                                  const compVal = getRowVal(row, 'Tanggal Selesai') || getRowVal(row, 'Completed Time');
                                  const statusVal = getRowVal(row, 'Status');
                                  // (isEditingThis already declared above)

                                  // Check fallback from linked ticket if val is empty or '-'
                                  const linkedId = extractLinkedTicketId(row);
                                  let effectiveDueDate = val && val !== '-' ? val : '';
                                  if (!effectiveDueDate && linkedId && ticketMetadataMap[linkedId.toUpperCase()]?.targetDate) {
                                    effectiveDueDate = formatToDDMMYYYY(ticketMetadataMap[linkedId.toUpperCase()].targetDate);
                                  }

                                  const startInlineEdit = (e?: React.MouseEvent) => {
                                    if (e) e.stopPropagation();
                                    setActiveInlineEditor({
                                      rowIndex: actualRowIndex,
                                      colName,
                                      initialValue: effectiveDueDate || (val && val !== '-' ? val : ''),
                                      multiline: false
                                    });
                                  };

                                  return (
                                    <td 
                                      key={colName} 
                                      style={getColStyle(colName)} 
                                      className={`font-sans border-r cursor-pointer ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${
                                        fitPageMode ? 'px-2 py-2 truncate' : 'px-3.5 py-2.5 whitespace-nowrap'
                                      }`}
                                      onDoubleClick={startInlineEdit}
                                      title="Klik untuk buka kalender, atau klik 2x (double-click) untuk edit langsung"
                                    >
                                      {isEditingThis ? (
                                        <NotionInlineEditor
                                          initialValue={effectiveDueDate || (val && val !== '-' ? val : '')}
                                          fieldLabel="Batas Waktu (Due Date)"
                                          multiline={false}
                                          isNotionLight={isNotionLight}
                                          onSave={(newVal) => {
                                            handleUpdateCellDirect(actualRowIndex, colName, newVal);
                                            setActiveInlineEditor(null);
                                          }}
                                          onCancel={() => setActiveInlineEditor(null)}
                                        />
                                      ) : (
                                        <NotionDueDateCell
                                          value={effectiveDueDate || val}
                                          completedDate={compVal}
                                          status={statusVal}
                                          isSubItem={isSubItem}
                                          compact={fitPageMode}
                                          isNotionLight={isNotionLight}
                                          onDoubleClick={startInlineEdit}
                                          onChange={(newDate) => {
                                            handleUpdateCellDirect(actualRowIndex, colName, newDate);
                                          }}
                                        />
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
                                      className={`relative border-r cursor-pointer select-none transition-colors ${
                                        isNotionLight ? 'border-[#e9e9e8] hover:bg-slate-100/60' : 'border-[#2d2d2d] hover:bg-slate-800/40'
                                      } ${fitPageMode ? 'px-2 py-1.5 overflow-visible' : 'px-3.5 py-2 whitespace-nowrap overflow-visible'}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if ((e.target as HTMLElement).closest('.notion-pic-popover')) {
                                          return;
                                        }
                                        setActiveInlinePicCell(isEditingPic ? null : { rowIndex: actualRowIndex, colName });
                                        setInlinePicSearch('');
                                      }}
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        if ((e.target as HTMLElement).closest('.notion-pic-popover')) {
                                          return;
                                        }
                                        setActiveInlinePicCell({ rowIndex: actualRowIndex, colName });
                                        setInlinePicSearch('');
                                      }}
                                      title={picTooltip}
                                    >
                                      <div className="w-full h-full min-h-[26px] flex items-center group/pic">
                                        <div className="transition-transform group-hover/pic:scale-105 inline-flex items-center">
                                          {renderPicBadge(val, 'sm', false)}
                                        </div>
                                      </div>

                                      {isEditingPic && (
                                        <div 
                                          onClick={(e) => e.stopPropagation()}
                                          className={`notion-pic-popover absolute left-0 top-full mt-1 w-72 max-h-72 overflow-y-auto rounded-xl shadow-2xl border p-2.5 z-50 text-left cursor-default select-text ${
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

                                  return (
                                    <td 
                                      key={colName} 
                                      style={getColStyle(colName)} 
                                      className={`border-r cursor-pointer ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${fitPageMode ? 'px-2 py-2 overflow-hidden' : 'px-3.5 py-2.5 whitespace-nowrap'}`}
                                      onDoubleClick={startInlineEdit}
                                      title="Klik untuk memilih opsi prioritas, atau klik 2x (double-click) untuk edit langsung"
                                    >
                                      {isEditingThis ? (
                                        <NotionInlineEditor
                                          initialValue={val && val !== '-' ? val : ''}
                                          fieldLabel="Prioritas"
                                          multiline={false}
                                          isNotionLight={isNotionLight}
                                          onSave={(newVal) => {
                                            handleUpdateCellDirect(actualRowIndex, colName, newVal);
                                            setActiveInlineEditor(null);
                                          }}
                                          onCancel={() => setActiveInlineEditor(null)}
                                        />
                                      ) : (
                                        <NotionDropdownCell
                                          type="priority"
                                          value={val}
                                          compact={fitPageMode}
                                          onDoubleClick={startInlineEdit}
                                          onChange={(newVal) => handleUpdateCellDirect(actualRowIndex, colName, newVal)}
                                        />
                                      )}
                                    </td>
                                  );
                                }

                                // 7. Status Column (Interactive Dropdown & Progress Bar / Duration when Closed)
                                if (colLower.includes('status')) {

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
                                    <td 
                                      key={colName} 
                                      style={getColStyle(colName)} 
                                      className={`border-r cursor-pointer ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${fitPageMode ? 'px-2 py-2 overflow-hidden' : 'px-4 py-2.5 whitespace-nowrap'}`}
                                      onDoubleClick={startInlineEdit}
                                      title="Klik untuk memilih status, atau klik 2x (double-click) untuk edit langsung"
                                    >
                                      {isEditingThis ? (
                                        <NotionInlineEditor
                                          initialValue={val && val !== '-' ? val : ''}
                                          fieldLabel="Status"
                                          multiline={false}
                                          isNotionLight={isNotionLight}
                                          onSave={(newVal) => {
                                            handleUpdateCellDirect(actualRowIndex, colName, newVal);
                                            setActiveInlineEditor(null);
                                          }}
                                          onCancel={() => setActiveInlineEditor(null)}
                                        />
                                      ) : (
                                        <div className="flex flex-col items-start gap-1">
                                          <NotionDropdownCell
                                            type="status"
                                            value={val}
                                            compact={fitPageMode}
                                            onDoubleClick={startInlineEdit}
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
                                    )}
                                  </td>
                                );
                                }

                                // 8. Created Time Column (Tanggal dibuat sesuai tanggal tiket / pembuatan)
                                if (colLower.includes('created')) {
                                  const displayDate = (() => {
                                    let raw = (val && val !== '-') ? val : '';
                                    if (!raw) {
                                      const linkedId = extractLinkedTicketId(row);
                                      if (linkedId) {
                                        const meta = ticketMetadataMap[linkedId.toUpperCase()];
                                        raw = meta?.date || meta?.createdAt || '';
                                      }
                                    }
                                    if (!raw) return '-';
                                    const formatted = formatToDDMMYYYY(raw);
                                    if (!formatted || formatted === '-') return '-';
                                    // Pastikan hanya tanggal DD-MM-YYYY yang ditampilkan agar bersih dari sisa format ISO T...Z
                                    const dmyMatch = formatted.match(/^(\d{2}-\d{2}-\d{4})/);
                                    return dmyMatch ? dmyMatch[1] : formatted;
                                  })();

                                  return (
                                    <td 
                                      key={colName} 
                                      style={{ ...getColStyle(colName), color: isNotionLight ? '#475569' : 'var(--text-muted, #94a3b8)' }} 
                                      className={`font-sans border-r cursor-pointer ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${
                                        fitPageMode ? 'px-2 py-2 text-xs truncate' : 'px-3.5 py-2.5 whitespace-nowrap text-[13px]'
                                      }`}
                                      onDoubleClick={(e) => {
                                        e.stopPropagation();
                                        setActiveInlineEditor({
                                          rowIndex: actualRowIndex,
                                          colName,
                                          initialValue: displayDate !== '-' ? displayDate : '',
                                          multiline: false
                                        });
                                      }}
                                      title="Klik 2x (double-click) untuk edit Tanggal Dibuat"
                                    >
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

                                // 10. Activity Column (Interactive Dropdown for Routine / Non-Routine)
                                if (!cleanCol.includes('activity name') && !colLower.includes('name') && !cleanCol.includes('judul') && (colLower.includes('activity') || colLower.includes('aktivitas'))) {

                                  return (
                                    <td 
                                      key={colName} 
                                      style={getColStyle(colName)} 
                                      className={`border-r cursor-pointer ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${fitPageMode ? 'px-2 py-2 truncate' : 'px-3.5 py-2.5 whitespace-nowrap'}`}
                                      onDoubleClick={startInlineEdit}
                                      title="Klik untuk memilih aktivitas, atau klik 2x (double-click) untuk edit langsung"
                                    >
                                      {isEditingThis ? (
                                        <NotionInlineEditor
                                          initialValue={val && val !== '-' ? val : ''}
                                          fieldLabel="Aktivitas"
                                          multiline={false}
                                          isNotionLight={isNotionLight}
                                          onSave={(newVal) => {
                                            handleUpdateCellDirect(actualRowIndex, colName, newVal);
                                            setActiveInlineEditor(null);
                                          }}
                                          onCancel={() => setActiveInlineEditor(null)}
                                        />
                                      ) : (
                                        <NotionDropdownCell
                                          type="activity"
                                          value={val}
                                          compact={fitPageMode}
                                          onDoubleClick={startInlineEdit}
                                          onChange={(newVal) => {
                                            if (newVal === val) return;
                                            handleUpdateCellDirect(actualRowIndex, colName, newVal);
                                          }}
                                        />
                                      )}
                                    </td>
                                  );
                                }

                                // 11. Period Column (Interactive Dropdown)
                                if (colLower.includes('period') || colLower.includes('periode')) {

                                  return (
                                    <td 
                                      key={colName} 
                                      style={getColStyle(colName)} 
                                      className={`border-r cursor-pointer ${
                                        isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                      } ${fitPageMode ? 'px-2 py-2 truncate' : 'px-3.5 py-2.5 whitespace-nowrap'}`}
                                      onDoubleClick={startInlineEdit}
                                      title="Klik untuk memilih periode, atau klik 2x (double-click) untuk edit langsung"
                                    >
                                      {isEditingThis ? (
                                        <NotionInlineEditor
                                          initialValue={val && val !== '-' ? val : ''}
                                          fieldLabel="Periode"
                                          multiline={false}
                                          isNotionLight={isNotionLight}
                                          onSave={(newVal) => {
                                            handleUpdateCellDirect(actualRowIndex, colName, newVal);
                                            setActiveInlineEditor(null);
                                          }}
                                          onCancel={() => setActiveInlineEditor(null)}
                                        />
                                      ) : (
                                        <NotionDropdownCell
                                          type="period"
                                          value={val}
                                          compact={fitPageMode}
                                          onDoubleClick={startInlineEdit}
                                          onChange={(newVal) => handleUpdateCellDirect(actualRowIndex, colName, newVal)}
                                        />
                                      )}
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

                                // Asal Halaman Column (Badge rapi dengan icon dokumen)
                                if (colLower.includes('asal') && colLower.includes('halaman')) {
                                  const asalVal = val || row['Asal Halaman'] || row._originPostTitle || '';
                                  return (
                                    <td key={colName} style={getColStyle(colName)} className={`border-r ${
                                      isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                    } ${fitPageMode ? 'px-2 py-2 text-xs truncate' : 'px-3.5 py-2.5 whitespace-nowrap text-[13px]'}`}>
                                      {asalVal && asalVal !== '-' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                                          <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                                          <span className="truncate max-w-[140px]">{asalVal}</span>
                                        </span>
                                      ) : (
                                        <span className="font-mono text-slate-400">-</span>
                                      )}
                                    </td>
                                  );
                                }

                                // Default custom column (e.g. Group, etc.)
                                const cleanCustomVal = (val || '')
                                  .replace(/<!--[\s\S]*?-->/g, '')
                                  .replace(/<!-?[a-zA-Z0-9_\-\s]+.*?>?/g, '')
                                  .replace(/<!--.*$/g, '')
                                  .trim();
                                const isEditingCustom = activeInlineEditor?.rowIndex === actualRowIndex && activeInlineEditor?.colName === colName;

                                return (
                                  <td 
                                    key={colName} 
                                    style={{ ...getColStyle(colName), color: isNotionLight ? '#334155' : 'var(--text-main, #cbd5e1)' }} 
                                    className={`whitespace-nowrap border-r cursor-pointer ${
                                      isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'
                                    } ${
                                      fitPageMode ? 'px-2 py-2 text-xs' : 'px-3.5 py-2.5 text-[13px]'
                                    }`}
                                    onDoubleClick={(e) => {
                                      e.stopPropagation();
                                      setActiveInlineEditor({
                                        rowIndex: actualRowIndex,
                                        colName,
                                        initialValue: cleanCustomVal && cleanCustomVal !== '-' ? cleanCustomVal : '',
                                        multiline: false
                                      });
                                    }}
                                    title="Klik 2x (double-click) untuk edit langsung"
                                  >
                                    {isEditingCustom ? (
                                      <NotionInlineEditor
                                        initialValue={cleanCustomVal && cleanCustomVal !== '-' ? cleanCustomVal : ''}
                                        fieldLabel={colName}
                                        multiline={false}
                                        isNotionLight={isNotionLight}
                                        onSave={(newVal) => {
                                          handleUpdateCellDirect(actualRowIndex, colName, newVal);
                                          setActiveInlineEditor(null);
                                        }}
                                        onCancel={() => setActiveInlineEditor(null)}
                                      />
                                    ) : (
                                      cleanCustomVal && cleanCustomVal !== '-' ? cleanCustomVal : <span className="font-mono text-slate-400">-</span>
                                    )}
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
                                   const rowActionKey = row.id ? `action-${row.id}` : `${actualRowIndex}-${isSubItem ? 'sub' : 'parent'}-${(row['Jenis kegiatan'] || row['Name'] || '').slice(0, 20)}`;
                                   return (
                                     <div className="relative inline-flex items-center gap-0.5">
                                        {isForemanOrAbove && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRequestDeleteRow(actualRowIndex, e);
                                            }}
                                            className="p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                            title={isSubItem ? "Hapus Sub-kegiatan Ini" : "Hapus Kegiatan Ini"}
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
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
                                             handleTogglePinRow(row);
                                             setActiveActionMenuRowIndex(null);
                                           }}
                                           className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                                             isRowPinned(row)
                                               ? 'hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold'
                                               : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                           }`}
                                           title={isRowPinned(row) ? "Lepas sematan (unpin) task ini" : "Sematkan task ini ke posisi teratas (Maks. 10 task)"}
                                         >
                                           <Pin className={`w-3.5 h-3.5 shrink-0 ${isRowPinned(row) ? 'text-amber-500 fill-amber-500 rotate-45' : 'text-slate-400'}`} />
                                           <span>{isRowPinned(row) ? 'Lepas Pin (Unpin Task)' : 'Pin Task ke Atas (Maks 10)'}</span>
                                         </button>
                                       )}
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
                                           setLinkModuleModalState({
                                             isOpen: true,
                                             rowIndex: actualRowIndex,
                                              rowTitle: String(row["Jenis kegiatan"] || row["Name"] || row["Activity Name"] || "Kegiatan"),
                                             currentLink: extractRowLinkInfo(row)
                                           });
                                           setActiveActionMenuRowIndex(null);
                                         }}
                                         className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-lg hover:bg-sky-50 dark:hover:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-medium transition-colors cursor-pointer"
                                         title="Tautkan dengan Tiket K3, Work Order, atau Modul Lain"
                                       >
                                         <Link2 className="w-3.5 h-3.5 shrink-0 text-sky-500" />
                                         <span>{extractRowLinkInfo(row) ? 'Ubah Tautan Modul' : 'Tautkan Modul'}</span>
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

                        return hierarchicalItems.map((hItem, hIdx) => {
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
                                },
                                ++runningParentNumber
                              )}

                              {/* Render Sub-items if Parent is expanded */}
                              {isParentExpanded && (() => {
                                const activeSubItems = hItem.subItems.filter(sub => !isSubItemCompleted(sub.row));
                                const completedSubItems = hItem.subItems.filter(sub => isSubItemCompleted(sub.row));
                                const isCompletedCollapsed = isLogbookTable && logbookFilterMode === 'focus' && !expandedCompletedSubtasks[parentKey];

                                return (
                                  <>
                                    {/* 1. Active (Unfinished) Subtasks - Always on top for Focus */}
                                    {activeSubItems.map((sub) => {
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

                                    {/* 2. Completed Subtasks Collapsible Summary / Divider in Focus Mode */}
                                    {completedSubItems.length > 0 && isLogbookTable && logbookFilterMode === 'focus' && (
                                      <tr
                                        key={`toggle-completed-${parentKey}`}
                                        className={`border-b text-xs transition-colors cursor-pointer select-none ${
                                          isNotionLight
                                            ? 'hover:bg-slate-100/80 bg-slate-50/60 text-slate-500 border-[#e9e9e8]'
                                            : 'hover:bg-slate-800/60 bg-slate-900/40 text-slate-400 border-[#2d2d2d]'
                                        }`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setExpandedCompletedSubtasks(prev => ({
                                            ...prev,
                                            [parentKey]: !prev[parentKey]
                                          }));
                                        }}
                                        title={isCompletedCollapsed ? "Klik untuk melihat subtask yang sudah selesai" : "Klik untuk meringkas subtask selesai"}
                                      >
                                        {(isSelectionModeActive || selectedRowIndices.size > 0) && (
                                          <td className={`px-2 py-1 text-center border-r ${isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'}`} />
                                        )}
                                        <td className={`px-3 py-1 text-center font-mono text-slate-400 text-xs border-r ${isNotionLight ? 'border-[#e9e9e8]' : 'border-[#2d2d2d]'}`} />
                                        <td colSpan={displayHeaders.length + 1} className="px-6 py-1.5">
                                          <div className="flex items-center gap-2 text-[11px] font-medium">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold shadow-2xs">
                                              <Check className="w-3 h-3 text-emerald-500" />
                                              <span>{completedSubItems.length} Subtask Selesai</span>
                                            </span>
                                            <span className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 font-sans">
                                              {isCompletedCollapsed ? (
                                                <><span>(Klik untuk lihat {completedSubItems.length} subtask)</span><ChevronDown className="w-3 h-3" /></>
                                              ) : (
                                                <><span>(Klik untuk ringkas)</span><ChevronUp className="w-3 h-3" /></>
                                              )}
                                            </span>
                                          </div>
                                        </td>
                                      </tr>
                                    )}

                                    {/* 3. Completed Subtasks (Shown when expanded or outside Focus mode) */}
                                    {(!isCompletedCollapsed || !isLogbookTable || logbookFilterMode !== 'focus') && completedSubItems.map((sub) => {
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
                                  </>
                                );
                              })()}

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

                    </React.Fragment>
                  );
                });
              })()}
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
                type="button"
                onClick={handleOpenAddModal}
                className={`text-xs font-semibold flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-all cursor-pointer ${
                  isNotionLight
                    ? 'text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200'
                    : 'text-teal-400 bg-teal-950/40 hover:bg-teal-900/60 border border-teal-800/60'
                }`}
                title="Tambah Baris Kegiatan Baru"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>+ Tambah Baris Kegiatan</span>
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
                  onClick={handleRequestBatchDelete}
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
                  onClick={handleRequestBatchDelete}
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
      {(!isLogbookTable || logbookActiveTab === 'planning') && viewMode === 'table' && hasHorizontalOverflow && isTableVisible && (
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
      {(!isLogbookTable || logbookActiveTab === 'planning') && viewMode === 'board' && (
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
                          className={`font-semibold text-xs leading-snug ${
                            isRowPinned(row) ? 'text-blue-600 dark:text-blue-400 font-bold' : 'group-hover:text-teal-400'
                          }`}
                          style={{ 
                            color: isRowPinned(row) 
                              ? (isNotionLight ? '#2563eb' : '#60a5fa') 
                              : 'var(--text-main, #f1f5f9)' 
                          }}
                          dangerouslySetInnerHTML={{
                            __html: isRowPinned(row)
                              ? (formatTitleToVisualHtml(stripColorTags(getRowVal(row, 'Jenis kegiatan'))) || 'Tanpa Judul')
                              : (formatTitleToVisualHtml(getRowVal(row, 'Jenis kegiatan')) || 'Tanpa Judul')
                          }}
                        />
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
      {(!isLogbookTable || logbookActiveTab === 'planning') && viewMode === 'list' && (
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

                <h4 
                  className={`font-bold text-sm leading-snug ${
                    isRowPinned(row) ? 'text-blue-600 dark:text-blue-400' : ''
                  }`} 
                  style={{ 
                    color: isRowPinned(row) 
                      ? (isNotionLight ? '#2563eb' : '#60a5fa') 
                      : 'var(--text-main, #f1f5f9)' 
                  }}
                  dangerouslySetInnerHTML={{
                    __html: isRowPinned(row)
                      ? (formatTitleToVisualHtml(stripColorTags(getRowVal(row, 'Jenis kegiatan'))) || 'Tanpa Judul')
                      : (formatTitleToVisualHtml(getRowVal(row, 'Jenis kegiatan')) || 'Tanpa Judul')
                  }}
                />

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
                    Activity Name <span className="text-rose-500">*</span>
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
                      isNotionLight={isNotionLight}
                    />
                  )}
                  <input
                    type="text"
                    required
                    value={rowFormData['Jenis kegiatan'] || rowFormData['Jenis Kegiatan'] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const cursor = e.target.selectionStart;
                      setRowFormData(prev => ({ 
                        ...prev, 
                        'Jenis kegiatan': val,
                        'Jenis Kegiatan': val 
                      }));
                      if (cursor !== null) {
                        requestAnimationFrame(() => {
                          e.target.setSelectionRange(cursor, cursor);
                        });
                      }
                    }}
                    onSelect={(e) => {
                      const target = e.currentTarget;
                      if ((target.selectionEnd ?? 0) > (target.selectionStart ?? 0)) {
                        handleModalSelectText(e, 'jenisKegiatan');
                      }
                    }}
                    onKeyUp={(e) => {
                      if (e.shiftKey || ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
                        handleModalSelectText(e, 'jenisKegiatan');
                      }
                    }}
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

              {/* 2. Task ID & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* ID Task (Auto Generated) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold uppercase tracking-wider text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                      ID Task (Kode Unik)
                    </label>
                    <span className="text-[9.5px] font-mono text-teal-500 font-bold">Auto Format (L1, P1, Q1, A1, I1, M1)</span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={rowFormData['taskCode'] || rowFormData['Task ID'] || rowFormData['ID Task'] || rowFormData['number'] || ''}
                      className="w-full p-2.5 pr-8 rounded-xl border outline-none text-xs font-mono font-bold cursor-not-allowed opacity-85 select-none"
                      style={{
                        backgroundColor: 'var(--input-bg, #141414)',
                        borderColor: 'var(--border-main, #334155)',
                        color: 'var(--text-main, #f1f5f9)'
                      }}
                      placeholder="Auto generated (L1, P1, Q1, A1, I1, M1)"
                    />
                    <Lock className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
                  </div>
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
                    Description / Notes
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
                      isNotionLight={isNotionLight}
                    />
                  )}
                  <textarea
                    rows={3}
                    value={rowFormData['Keterangan'] || rowFormData['Description'] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const cursor = e.target.selectionStart;
                      setRowFormData(prev => ({ ...prev, Keterangan: val, Description: val }));
                      if (cursor !== null) {
                        requestAnimationFrame(() => {
                          e.target.setSelectionRange(cursor, cursor);
                        });
                      }
                    }}
                    onKeyDown={(e) => {
                      const textarea = e.currentTarget;
                      const { selectionStart, selectionEnd } = textarea;
                      const val = rowFormData['Keterangan'] || rowFormData['Description'] || '';

                      if (e.key === 'Enter' && selectionStart === selectionEnd && !e.shiftKey) {
                        const lineStart = val.lastIndexOf('\n', selectionStart - 1) + 1;
                        const currentLine = val.substring(lineStart, selectionStart);
                        const bulletMatch = currentLine.match(/^(\s*[•\-\*]\s+)/);

                        if (bulletMatch) {
                          const bulletPrefix = bulletMatch[1];
                          const textAfterBullet = currentLine.substring(bulletPrefix.length).trim();

                          if (!textAfterBullet) {
                            // Bullet kosong -> hapus bullet pada baris ini jadi baris biasa
                            e.preventDefault();
                            const before = val.substring(0, lineStart);
                            const after = val.substring(selectionStart);
                            const newVal = before + after;
                            setRowFormData(prev => ({ ...prev, Keterangan: newVal, Description: newVal }));
                            requestAnimationFrame(() => {
                              textarea.setSelectionRange(lineStart, lineStart);
                            });
                            return;
                          } else {
                            // Lanjutkan bullet ke baris berikutnya
                            e.preventDefault();
                            const before = val.substring(0, selectionStart);
                            const after = val.substring(selectionEnd);
                            const insertText = '\n' + bulletPrefix;
                            const newVal = before + insertText + after;
                            const newCursor = selectionStart + insertText.length;
                            setRowFormData(prev => ({ ...prev, Keterangan: newVal, Description: newVal }));
                            requestAnimationFrame(() => {
                              textarea.setSelectionRange(newCursor, newCursor);
                            });
                            return;
                          }
                        }
                      }

                      // Jika tombol Backspace ditekan saat bullet kosong, hapus bullet jadi baris biasa
                      if (e.key === 'Backspace' && selectionStart === selectionEnd) {
                        const lineStart = val.lastIndexOf('\n', selectionStart - 1) + 1;
                        const currentLine = val.substring(lineStart, selectionStart);
                        const bulletMatch = currentLine.match(/^(\s*[•\-\*]\s+)$/);
                        if (bulletMatch && selectionStart === lineStart + bulletMatch[1].length) {
                          e.preventDefault();
                          const before = val.substring(0, lineStart);
                          const after = val.substring(selectionStart);
                          const newVal = before + after;
                          setRowFormData(prev => ({ ...prev, Keterangan: newVal, Description: newVal }));
                          requestAnimationFrame(() => {
                            textarea.setSelectionRange(lineStart, lineStart);
                          });
                          return;
                        }
                      }
                    }}
                    onSelect={(e) => {
                      const target = e.currentTarget;
                      if ((target.selectionEnd ?? 0) > (target.selectionStart ?? 0)) {
                        handleModalSelectText(e, 'keterangan');
                      }
                    }}
                    onKeyUp={(e) => {
                      if (e.shiftKey || ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
                        handleModalSelectText(e, 'keterangan');
                      }
                    }}
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
                  const val = rowFormData['Keterangan'] || rowFormData['Description'] || '';
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
                    Activity Type
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
                    Period / Cadence
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

              <div className="grid grid-cols-2 gap-3">
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
                    placeholder="YYYY-MM-DD"
                  />
                </div>

                {/* 7. Due Date (Batas Waktu KPI) */}
                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1 text-[10px] text-teal-600 dark:text-teal-400">
                    Due Date (Required KPI)
                  </label>
                  <input
                    type="text"
                    value={rowFormData['Due Date'] || rowFormData['Target Selesai'] || rowFormData['Deadline'] || ''}
                    onChange={(e) => setRowFormData({ ...rowFormData, 'Due Date': e.target.value })}
                    className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none font-mono text-[11px]"
                    style={{
                      backgroundColor: 'var(--input-bg, #141414)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-main, #f1f5f9)'
                    }}
                    placeholder="DD-MM-YYYY"
                  />
                </div>
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
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => handleCloseDetailModal()}
            />

            {/* Right-to-Left Slide-over Panel (Clean Notion Page Document Layout) */}
            <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10 pointer-events-none">
              <motion.div 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="w-screen max-w-3xl lg:max-w-4xl xl:max-w-5xl border-l border-[#EDEDEC] dark:border-[#2F2F2F] bg-white dark:bg-[#191919] text-[#37352F] dark:text-[#E6E6E5] shadow-2xl flex flex-col h-full overflow-hidden pointer-events-auto"
                onClick={(e) => e.stopPropagation()}
                onPaste={handleCommentPaste}
              >
                {/* Minimalist Notion Sticky Topbar */}
                <div 
                  className="px-4 sm:px-6 py-2.5 border-b border-[#EDEDEC] dark:border-[#2F2F2F] bg-white/95 dark:bg-[#191919]/95 backdrop-blur-sm flex items-center justify-between shrink-0 z-10"
                >
                  <div className="flex items-center gap-2 overflow-hidden text-xs text-[#787774] dark:text-[#9B9A97]">
                    <span className="font-mono px-2 py-0.5 rounded bg-[#F1F1EF] dark:bg-[#2F2F2F] text-[#5A5A55] dark:text-[#9B9A97] font-semibold shrink-0">
                      #{getRowVal(selectedRow, 'number') || '1'}
                    </span>
                    <span className="truncate">
                      {section || 'Kegiatan'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Move Topic to Section Periodical Page Button */}
                    {sectionPeriodicalPages.length > 0 && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowMovePopover(!showMovePopover)}
                          disabled={isMovingTopic}
                          className="px-2.5 py-1 rounded-md text-xs font-medium text-[#37352F] dark:text-[#E6E6E5] hover:bg-[#F1F1EF] dark:hover:bg-[#252525] border border-[#EDEDEC] dark:border-[#2F2F2F] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                          title="Pindahkan kegiatan ini ke halaman periodik seksi lain"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#787774]" />
                          <span className="hidden sm:inline">Pindah Halaman</span>
                          <ChevronDown className="w-3 h-3 opacity-60" />
                        </button>

                        {showMovePopover && (
                          <>
                            <div 
                              className="fixed inset-0 z-30" 
                              onClick={() => setShowMovePopover(false)} 
                            />
                            <div 
                              className="absolute right-0 top-full mt-1.5 z-40 w-64 border border-[#EDEDEC] dark:border-[#2F2F2F] rounded-xl shadow-xl overflow-hidden p-1.5 bg-white dark:bg-[#202020] animate-in fade-in zoom-in-95 duration-100"
                            >
                              <div className="px-2.5 py-1.5 border-b border-[#EDEDEC] dark:border-[#2F2F2F] mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#787774] dark:text-[#9B9A97] block">
                                  Pindah ke Halaman Periodik:
                                </span>
                                <span className="text-[11px] text-[#37352F] dark:text-[#E6E6E5] font-medium block truncate">
                                  {section || 'Seksi Ini'}
                                </span>
                              </div>
                              <div className="space-y-0.5 max-h-56 overflow-y-auto">
                                {sectionPeriodicalPages.map((dest) => (
                                  <button
                                    key={dest.post.id}
                                    type="button"
                                    onClick={() => openMoveModal(dest.post, selectedRow)}
                                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs font-medium hover:bg-[#F1F1EF] dark:hover:bg-[#2F2F2F] transition-colors flex items-center justify-between group cursor-pointer text-[#37352F] dark:text-[#E6E6E5]"
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="text-sm shrink-0">{dest.icon}</span>
                                      <span className="truncate">{dest.post.title}</span>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 text-[#787774] group-hover:text-[#37352F] dark:group-hover:text-white shrink-0" />
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
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-[#37352F] dark:text-[#E6E6E5] hover:bg-[#F1F1EF] dark:hover:bg-[#252525] border border-[#EDEDEC] dark:border-[#2F2F2F] flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Edit Data Kegiatan"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#787774]" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    <button
                      onClick={() => handleDeleteRow(localRows.indexOf(selectedRow))}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-[#EB5757] hover:bg-[#FFE2DD] dark:hover:bg-[#4A201C] border border-[#EDEDEC] dark:border-[#2F2F2F] flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Hapus Kegiatan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Hapus</span>
                    </button>

                    <button
                      onClick={() => handleCloseDetailModal()}
                      className="p-1 rounded-md text-[#787774] hover:text-[#37352F] dark:hover:text-white hover:bg-[#F1F1EF] dark:hover:bg-[#252525] transition-colors ml-1 cursor-pointer"
                      title="Tutup (ESC)"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Drawer Body: Notion Page Document */}
                <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
                  <div className="max-w-3xl mx-auto space-y-6">

                    {/* Judul Kegiatan (Large Prominent Header) */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {activeSubPeriod && (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#EDF3EC] text-[#2B593F] dark:bg-[#1C3829] dark:text-[#4EA672]">
                            {activeSubPeriod}
                          </span>
                        )}
                      </div>
                      <h2 
                        className={`text-2xl sm:text-3xl font-bold tracking-tight leading-snug ${
                          selectedRow && isRowPinned(selectedRow) ? 'text-blue-600 dark:text-blue-400' : 'text-[#37352F] dark:text-white'
                        }`} 
                        dangerouslySetInnerHTML={{
                          __html: selectedRow && isRowPinned(selectedRow)
                            ? (formatTitleToVisualHtml(stripColorTags(getDisplayTitle(baseTopicTitle))) || 'Detail Kegiatan')
                            : (formatTitleToVisualHtml(getDisplayTitle(baseTopicTitle)) || 'Detail Kegiatan')
                        }}
                      />
                    </div>

                    {/* Integrated Rekapan Izin Karyawan Banner */}
                    {selectedRow && (
                      String(baseTopicTitle || '').toLowerCase().includes('tidak masuk') ||
                      String(baseTopicTitle || '').toLowerCase().includes('izin karyawan') ||
                      String(baseTopicTitle || '').toLowerCase().includes('rekap izin')
                    ) && (
                      <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-indigo-600 text-white shrink-0">
                            <FileSpreadsheet className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                              Modul Terhubung: Rekapan Izin Karyawan
                            </div>
                            <div className="text-[11px] text-indigo-700 dark:text-indigo-300">
                              Lihat, verifikasi absensi, kelola izin, serta pantau diagram ketidakhadiran karyawan langsung di portal.
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                            window.location.href = `/employee-leaves?returnTo=${returnUrl}`;
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                        >
                          <span>Buka Rekapan Izin</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Integrated Roster Off Banner */}
                    {selectedRow && String(baseTopicTitle || '').toLowerCase().includes('jadwal off') && (
                      <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-amber-600 text-white shrink-0">
                            <Coffee className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                              Modul Terhubung: Jadwal Off Karyawan (Nonshift)
                            </div>
                            <div className="text-[11px] text-amber-700 dark:text-amber-300">
                              Akses langsung rekapitulasi jadwal off personil Nonshift PT TBP & GPS pada minggu berjalan.
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                            window.location.href = `/roster-admin?view=off_schedule&returnTo=${returnUrl}`;
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                        >
                          <span>Buka Jadwal Off</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Integrated Roster Leave Banner */}
                    {selectedRow && String(baseTopicTitle || '').toLowerCase().includes('jadwal cuti') && (
                      <div className="p-3.5 rounded-xl border border-teal-500/30 bg-teal-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-teal-600 text-white shrink-0">
                            <PlaneTakeoff className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-teal-900 dark:text-teal-200">
                              Modul Terhubung: Jadwal Cuti & Onsite Karyawan
                            </div>
                            <div className="text-[11px] text-teal-700 dark:text-teal-300">
                              Akses langsung lembar kerja Jadwal Cuti Gol I dan Gol II-V yang tersinkronisasi dengan Roster.
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                            window.location.href = `/roster-admin?view=leave_schedule&returnTo=${returnUrl}`;
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                        >
                          <span>Buka Jadwal Cuti</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Integrated Jadwal Inspeksi Banner (Khusus task: Jadwal Inspeksi Staff Preparasi & Lab Setiap Minggu) */}
                    {selectedRow && (() => {
                      const t = String(baseTopicTitle || '').toLowerCase();
                      return (
                        t.includes('jadwal inspeksi staff preparasi') ||
                        (t.includes('jadwal inspeksi') && t.includes('staff') && t.includes('minggu'))
                      );
                    })() && (
                      <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-amber-600 text-white shrink-0">
                            <CalendarDays className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                              Modul Terhubung: Jadwal Inspeksi Mingguan (Prep & Lab)
                            </div>
                            <div className="text-[11px] text-amber-700 dark:text-amber-300">
                              Akses langsung 29 agenda jadwal inspeksi terencana mingguan Preparasi & Laboratorium.
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                            window.location.href = `/inspection-schedule?returnTo=${returnUrl}`;
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                        >
                          <span>Buka Jadwal Inspeksi</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Integrated Rekap KTA/TTA Banner */}
                    {selectedRow && (() => {
                      const t = String(baseTopicTitle || '').toLowerCase();
                      return (
                        t.includes('kta/tta') ||
                        t.includes('kta-tta') ||
                        (t.includes('keterlambatan') && t.includes('kta')) ||
                        t.includes('rekap kta')
                      );
                    })() && (
                      <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-amber-600 text-white shrink-0">
                            <ClipboardList className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
                              Modul Terhubung: Rekap KTA/TTA & Inspeksi
                            </div>
                            <div className="text-[11px] text-amber-700 dark:text-amber-300">
                              Akses langsung rekapitulasi data kepatuhan KTA/TTA, jadwal inspeksi, dan diagram capaian SAP personil.
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                            window.location.href = `/safety-rekap?returnTo=${returnUrl}`;
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                        >
                          <span>Buka Rekap KTA/TTA</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Integrated Rekapan Keterlambatan & Pulang Cepat Banner */}
                    {selectedRow && checkIsTardinessShortcut(String(baseTopicTitle || '')) && (
                      <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
                              Modul Terhubung: Rekapan Keterlambatan &amp; Pulang Cepat
                            </div>
                            <div className="text-[11px] text-rose-700 dark:text-rose-300">
                              Akses langsung rekapitulasi data keterlambatan finger masuk dan kepulangan cepat karyawan Preparation &amp; Laboratory.
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const returnUrl = encodeURIComponent(window.location.pathname + window.location.search);
                            window.location.href = `/keterlambatan?returnTo=${returnUrl}`;
                          }}
                          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer"
                        >
                          <span>Buka Rekap Keterlambatan</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Notion Property Table (Image 2 style) */}
                    <div className="space-y-1 py-1 text-xs border-y border-[#EDEDEC] dark:border-[#2F2F2F]">
                      {/* Row: Aktivitas */}
                      <div className="flex items-center py-1 hover:bg-[#F7F7F5] dark:hover:bg-[#242424] rounded-md px-2 -mx-2 transition-colors">
                        <div className="w-36 sm:w-44 flex items-center gap-2 text-[#787774] dark:text-[#9B9A97] shrink-0">
                          <Activity className="w-3.5 h-3.5" />
                          <span>Aktivitas</span>
                        </div>
                        <div className="flex-1 min-w-0">
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
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#F1F1EF] text-[#5A5A55] dark:bg-[#2F2F2F] dark:text-[#9B9A97]">
                                {getRowVal(selectedRow, 'Activity (routine/non routine)') || 'Routine'}
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Row: Status */}
                      <div className="flex items-center py-1 hover:bg-[#F7F7F5] dark:hover:bg-[#242424] rounded-md px-2 -mx-2 transition-colors">
                        <div className="w-36 sm:w-44 flex items-center gap-2 text-[#787774] dark:text-[#9B9A97] shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Status</span>
                        </div>
                        <div className="flex-1 min-w-0">
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
                      </div>

                      {/* Row: PIC */}
                      <div className="flex items-center py-1 hover:bg-[#F7F7F5] dark:hover:bg-[#242424] rounded-md px-2 -mx-2 transition-colors">
                        <div className="w-36 sm:w-44 flex items-center gap-2 text-[#787774] dark:text-[#9B9A97] shrink-0">
                          <User className="w-3.5 h-3.5" />
                          <span>PIC</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {getRowVal(selectedRow, 'PIC') ? (
                            renderPicBadge(getRowVal(selectedRow, 'PIC'), 'sm', true)
                          ) : (
                            <span className="text-[#9B9A97] dark:text-[#5A5A55]">Empty</span>
                          )}
                        </div>
                      </div>

                      {/* Row: Priority */}
                      <div className="flex items-center py-1 hover:bg-[#F7F7F5] dark:hover:bg-[#242424] rounded-md px-2 -mx-2 transition-colors">
                        <div className="w-36 sm:w-44 flex items-center gap-2 text-[#787774] dark:text-[#9B9A97] shrink-0">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Priority</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {getRowVal(selectedRow, 'Priority') ? (
                            renderPriorityBadge(getRowVal(selectedRow, 'Priority'))
                          ) : (
                            <span className="text-[#9B9A97] dark:text-[#5A5A55]">Empty</span>
                          )}
                        </div>
                      </div>

                      {/* Row: Period */}
                      <div className="flex items-center py-1 hover:bg-[#F7F7F5] dark:hover:bg-[#242424] rounded-md px-2 -mx-2 transition-colors">
                        <div className="w-36 sm:w-44 flex items-center gap-2 text-[#787774] dark:text-[#9B9A97] shrink-0">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Period</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {getRowVal(selectedRow, 'period') ? (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#EDF3EC] text-[#2B593F] dark:bg-[#1C3829] dark:text-[#4EA672]">
                              {getRowVal(selectedRow, 'period')}
                            </span>
                          ) : (
                            <span className="text-[#9B9A97] dark:text-[#5A5A55]">Empty</span>
                          )}
                        </div>
                      </div>

                      {/* Row: Created time */}
                      <div className="flex items-center py-1 hover:bg-[#F7F7F5] dark:hover:bg-[#242424] rounded-md px-2 -mx-2 transition-colors">
                        <div className="w-36 sm:w-44 flex items-center gap-2 text-[#787774] dark:text-[#9B9A97] shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Created time</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          {getRowVal(selectedRow, 'Created Time') || getRowVal(selectedRow, 'Tanggal Dibuat') ? (
                            <span className="text-[#37352F] dark:text-[#E6E6E5] font-mono text-[11px]">
                              {getRowVal(selectedRow, 'Created Time') || getRowVal(selectedRow, 'Tanggal Dibuat')}
                            </span>
                          ) : (
                            <span className="text-[#9B9A97] dark:text-[#5A5A55]">Empty</span>
                          )}
                        </div>
                      </div>

                      {/* Row: Sub-Periode (periodic cadence) */}
                      {isPeriodic && (
                        <div className="flex items-start py-1.5 hover:bg-[#F7F7F5] dark:hover:bg-[#242424] rounded-md px-2 -mx-2 transition-colors">
                          <div className="w-36 sm:w-44 flex items-center gap-2 text-[#787774] dark:text-[#9B9A97] shrink-0 pt-0.5">
                            <CalendarDays className="w-3.5 h-3.5" />
                            <span>Sub-Periode</span>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto">
                              <button
                                type="button"
                                onClick={() => setActiveSubPeriod('')}
                                className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                                  activeSubPeriod === ''
                                    ? 'bg-[#37352F] text-white dark:bg-white dark:text-[#191919] border-transparent'
                                    : 'bg-[#F1F1EF] text-[#5A5A55] dark:bg-[#2F2F2F] dark:text-[#9B9A97] border-transparent hover:bg-[#EAEAEA] dark:hover:bg-[#383838]'
                                }`}
                              >
                                📋 Topik Umum
                              </button>
                              {availableSubPeriods.map((subP) => {
                                const isSelected = activeSubPeriod === subP;
                                return (
                                  <button
                                    key={subP}
                                    type="button"
                                    onClick={() => setActiveSubPeriod(subP)}
                                    className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-[#37352F] text-white dark:bg-white dark:text-[#191919] border-transparent'
                                        : 'bg-[#F1F1EF] text-[#5A5A55] dark:bg-[#2F2F2F] dark:text-[#9B9A97] border-transparent hover:bg-[#EAEAEA] dark:hover:bg-[#383838]'
                                    }`}
                                  >
                                    {subP}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Collapsible Sections: Keterangan & Media Gallery */}
                    {(() => {
                      const actualIdx = localRows.indexOf(selectedRow) !== -1 
                        ? localRows.indexOf(selectedRow)
                        : localRows.findIndex(r => 
                            (selectedRow.id && r.id === selectedRow.id) || 
                            getRowVal(r, 'Jenis kegiatan') === getRowVal(selectedRow, 'Jenis kegiatan')
                          );

                      const liveRow = actualIdx !== -1 ? localRows[actualIdx] : selectedRow;
                      let canonicalKetVal = (getRowVal(liveRow, 'Keterangan') || getRowVal(liveRow, 'Description') || '').replace(/<br\s*\/?>/gi, '\n');

                      if (actualIdx !== -1) {
                        const childRows: TableRowData[] = [];
                        for (let i = actualIdx + 1; i < localRows.length; i++) {
                          if (isSubItemRow(localRows[i])) {
                            childRows.push(localRows[i]);
                          } else {
                            break;
                          }
                        }
                        if (childRows.length > 0) {
                          const nonChecklistLines = canonicalKetVal.split('\n').filter(line => !line.trim().match(/^[-*]\s*\[([ xX])\]/));
                          const childChecklistLines = childRows.map(cRow => {
                            const isComp = isSubItemCompleted(cRow);
                            const cleanTitle = getDisplayTitle(getRowVal(cRow, 'Jenis kegiatan') || getRowVal(cRow, 'Jenis Kegiatan') || '');
                            return `- [${isComp ? 'x' : ' '}] ${cleanTitle}`;
                          });
                          canonicalKetVal = [...nonChecklistLines, ...childChecklistLines].join('\n').trim();
                        }
                      }

                      const checklistLines = canonicalKetVal.split('\n').filter((l: string) => l.trim().match(/^[-*]\s*\[([ xX])\]/));
                      const totalSubtasks = checklistLines.length;
                      const completedSubtasks = checklistLines.filter((l: string) => l.trim().match(/^[-*]\s*\[[xX]\]/)).length;
                      const hasTextNotes = canonicalKetVal.split('\n').some((l: string) => l.trim().length > 0 && !l.trim().match(/^[-*]\s*\[([ xX])\]/));

                      return (
                        <div className="space-y-2">
                          {/* Toggle 1: Keterangan & Checklist Subtask */}
                          <div className="rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] overflow-hidden bg-white dark:bg-[#1E1E1E] transition-all">
                            <button
                              type="button"
                              onClick={() => setShowModalKeterangan(!showModalKeterangan)}
                              className="w-full flex items-center justify-between p-2.5 px-3 hover:bg-[#F7F7F5] dark:hover:bg-[#252525] text-left transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <ChevronRight 
                                  className={`w-4 h-4 text-[#787774] dark:text-[#9B9A97] transition-transform duration-150 shrink-0 ${
                                    showModalKeterangan ? 'rotate-90' : ''
                                  }`} 
                                />
                                <FileText className="w-4 h-4 text-[#787774] dark:text-[#9B9A97] shrink-0" />
                                <span className="text-xs sm:text-sm font-medium text-[#37352F] dark:text-[#E6E6E5]">
                                  Keterangan & Checklist Subtask
                                </span>
                                {totalSubtasks > 0 ? (
                                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#EDF3EC] text-[#2B593F] dark:bg-[#1C3829] dark:text-[#4EA672] font-semibold shrink-0">
                                    {completedSubtasks}/{totalSubtasks} Selesai ({Math.round((completedSubtasks / totalSubtasks) * 100)}%)
                                  </span>
                                ) : hasTextNotes ? (
                                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#F1F1EF] text-[#5A5A55] dark:bg-[#2F2F2F] dark:text-[#9B9A97] shrink-0">
                                    Catatan Tersedia
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-[#9B9A97] dark:text-[#5A5A55] italic shrink-0">
                                    Belum ada rincian
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-[#787774] dark:text-[#9B9A97] shrink-0 group-hover:text-[#37352F] dark:group-hover:text-white">
                                {showModalKeterangan ? 'Tutup' : 'Buka & Edit'}
                              </span>
                            </button>

                            <AnimatePresence>
                              {showModalKeterangan && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden border-t border-[#EDEDEC] dark:border-[#2F2F2F] p-3 sm:p-4 bg-[#FAFAFA] dark:bg-[#181818]"
                                >
                                  <SharedSubtaskManager
                                    value={canonicalKetVal}
                                    onChange={(newVal) => {
                                      if (actualIdx !== -1) {
                                        handleSyncModalSubtasks(actualIdx, newVal);
                                      } else {
                                        handleSyncModalSubtasks(selectedRow, newVal);
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
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Toggle 2: Galeri & Lampiran Media */}
                          <div className="rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] overflow-hidden bg-white dark:bg-[#1E1E1E] transition-all">
                            <button
                              type="button"
                              onClick={() => setShowModalMedia(!showModalMedia)}
                              className="w-full flex items-center justify-between p-2.5 px-3 hover:bg-[#F7F7F5] dark:hover:bg-[#252525] text-left transition-colors cursor-pointer group"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <ChevronRight 
                                  className={`w-4 h-4 text-[#787774] dark:text-[#9B9A97] transition-transform duration-150 shrink-0 ${
                                    showModalMedia ? 'rotate-90' : ''
                                  }`} 
                                />
                                <ImageIcon className="w-4 h-4 text-[#787774] dark:text-[#9B9A97] shrink-0" />
                                <span className="text-xs sm:text-sm font-medium text-[#37352F] dark:text-[#E6E6E5]">
                                  Galeri & Lampiran Media
                                </span>
                                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#F1F1EF] text-[#5A5A55] dark:bg-[#2F2F2F] dark:text-[#9B9A97] shrink-0">
                                  {galleryItems.length} File / Foto
                                </span>
                              </div>
                              <span className="text-xs text-[#787774] dark:text-[#9B9A97] shrink-0 group-hover:text-[#37352F] dark:group-hover:text-white">
                                {showModalMedia ? 'Tutup' : 'Buka Galeri'}
                              </span>
                            </button>

                            <AnimatePresence>
                              {showModalMedia && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden border-t border-[#EDEDEC] dark:border-[#2F2F2F] p-3 sm:p-4 bg-[#FAFAFA] dark:bg-[#181818] space-y-3"
                                >
                                  <div className="flex items-center justify-between pb-2 border-b border-[#EDEDEC] dark:border-[#2F2F2F]">
                                    <span className="text-xs font-semibold text-[#37352F] dark:text-[#E6E6E5]">
                                      Dokumentasi Foto & File ({galleryItems.length})
                                    </span>
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
                                      className="px-2.5 py-1 rounded-md bg-[#2383E2] hover:bg-[#1D70C2] text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                    >
                                      {isUploadingGallery ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                      <span>+ Upload Foto / Lampiran</span>
                                    </button>
                                  </div>

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
                                            className="group relative rounded-lg overflow-hidden aspect-video border border-[#EDEDEC] dark:border-[#2F2F2F] bg-white dark:bg-[#121212] hover:border-[#B4B4B0] dark:hover:border-[#5A5A55] cursor-pointer shadow-xs transition-all hover:scale-[1.02]"
                                            title={`Klik untuk melihat: ${item.attachment.name}`}
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
                                              <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-[#F1F1EF] dark:bg-[#252525]">
                                                <FileText className="w-6 h-6 text-[#787774] dark:text-[#9B9A97] mb-1" />
                                                <span className="text-[10px] text-[#37352F] dark:text-[#E6E6E5] font-medium truncate w-full px-1">{item.attachment.name}</span>
                                              </div>
                                            )}

                                            {item.attachment.caption && (
                                              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[9px] text-white font-medium z-10 shadow-xs">
                                                💬 Caption
                                              </div>
                                            )}

                                            {canDelete && (
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleDeleteAttachment(item.comment.id, targetUrl, item.attachment.name);
                                                }}
                                                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-black/75 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-20 cursor-pointer shadow-md"
                                                title="Hapus lampiran ini"
                                              >
                                                <Trash2 className="w-3 h-3 stroke-[2.5]" />
                                              </button>
                                            )}

                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none">
                                              <span className="text-[10px] font-bold text-white truncate">{item.attachment.name}</span>
                                              <span className="text-[9px] text-slate-300 font-mono mt-0.5">{item.authorName}</span>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div 
                                      onClick={() => galleryFileInputRef.current?.click()}
                                      className="py-6 px-4 rounded-lg border border-dashed border-[#EDEDEC] dark:border-[#2F2F2F] text-center cursor-pointer hover:bg-[#F1F1EF] dark:hover:bg-[#202020] transition-colors"
                                    >
                                      <ImageIcon className="w-6 h-6 mx-auto mb-1.5 text-[#787774] dark:text-[#9B9A97]" />
                                      <p className="text-xs font-medium text-[#37352F] dark:text-[#E6E6E5]">Belum ada foto atau lampiran untuk kegiatan ini</p>
                                      <p className="text-[10px] text-[#787774] dark:text-[#9B9A97] mt-0.5">Klik di sini untuk mengunggah foto dokumentasi / lampiran</p>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Main Canvas: Notion Comments Section */}
                    <div className="pt-2 space-y-4">
                      {/* Comments Section Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-[#EDEDEC] dark:border-[#2F2F2F]">
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-[#787774] dark:text-[#9B9A97]" />
                          <h3 className="text-sm font-semibold text-[#37352F] dark:text-[#E6E6E5]">
                            Comments ({sortedTopicComments.length})
                          </h3>
                        </div>
                        {sortedTopicComments.length > 2 && (
                          <button
                            type="button"
                            onClick={() => setShowAllReplies(!showAllReplies)}
                            className="text-xs font-medium text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            {showAllReplies ? (
                              <>
                                <ChevronUp className="w-3.5 h-3.5" />
                                <span>Sembunyikan {sortedTopicComments.length - 2} balasan</span>
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3.5 h-3.5" />
                                <span>Tampilkan semua ({sortedTopicComments.length} komentar)</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Comments List Stream */}
                      <div className="space-y-1">
                        {(() => {
                          const renderCommentItem = (c: any, idx: number) => {
                            const atts = parseCommentAttachments(c.fileUrl, c.fileName, c.content);
                            const isEditing = editingCommentId === c.id;
                            const isAuthor = c.authorNik === currentAuthorNik;

                            return (
                              <div 
                                key={c.id ? `comment-${c.id}-${idx}` : `comment-${idx}`} 
                                className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-[#F7F7F5] dark:hover:bg-[#252525] transition-colors group"
                                style={{
                                  borderBottom: '1px solid rgba(55, 53, 47, 0.06)'
                                }}
                              >
                                <div 
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 mt-0.5 bg-[#E3E2E0] dark:bg-[#3F3F3F] text-[#37352F] dark:text-[#E6E6E5]"
                                >
                                  {(c.authorName || 'U').charAt(0).toUpperCase()}
                                </div>

                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap text-xs">
                                    <span className="font-semibold text-xs text-[#37352F] dark:text-[#E6E6E5]">
                                      {c.authorName || 'Personil'}
                                    </span>
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-normal bg-[#F1F1EF] dark:bg-[#2F2F2F] text-[#787774] dark:text-[#9B9A97] leading-tight">
                                      Guest
                                    </span>
                                    <span className="text-[11px] text-[#787774] dark:text-[#9B9A97] font-mono">
                                      {formatNotionCommentTime(c.createdAt)}
                                    </span>

                                    <div className="ml-auto flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleStartReply(c)}
                                        className="opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white hover:bg-[#F1F1EF] dark:hover:bg-[#2F2F2F] transition-all flex items-center gap-1 cursor-pointer font-medium"
                                        title={`Balas tanggapan ${c.authorName}`}
                                      >
                                        <Reply className="w-2.5 h-2.5 rotate-180" />
                                        <span>Balas</span>
                                      </button>
                                      {isAuthor && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingCommentId(c.id);
                                              setEditingCommentContent(c.content);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-[#787774] hover:text-[#2383E2] transition-opacity cursor-pointer rounded hover:bg-[#F1F1EF] dark:hover:bg-[#2F2F2F]"
                                            title="Edit komentar ini"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteComment(c.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-[#787774] hover:text-rose-500 transition-opacity cursor-pointer rounded hover:bg-[#FFE2DD] dark:hover:bg-[#4A201C]"
                                            title="Hapus komentar ini"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  {isEditing ? (
                                    <div className="space-y-2 mt-1">
                                      <textarea
                                        value={editingCommentContent}
                                        onChange={(e) => setEditingCommentContent(e.target.value)}
                                        className="w-full text-xs p-2 rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] focus:border-[#B4B4B0] dark:focus:border-[#5A5A55] outline-none leading-relaxed min-h-[60px] bg-white dark:bg-[#1E1E1E] text-[#37352F] dark:text-[#E6E6E5]"
                                      />
                                      <div className="flex items-center gap-2 justify-end">
                                        <button
                                          type="button"
                                          onClick={() => { setEditingCommentId(null); setEditingCommentContent(''); }}
                                          className="px-2.5 py-1 text-xs rounded border border-[#EDEDEC] dark:border-[#2F2F2F] text-[#787774] dark:text-[#9B9A97] hover:bg-[#F1F1EF] dark:hover:bg-[#2F2F2F] cursor-pointer"
                                        >
                                          Batal
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleSaveEditComment(c.id)}
                                          className="px-3 py-1 text-xs rounded bg-[#2383E2] hover:bg-[#1D70C2] text-white font-medium cursor-pointer shadow-xs"
                                        >
                                          Simpan
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-[#37352F] dark:text-[#E6E6E5]">
                                      {c.content}
                                    </p>
                                  )}

                                  {atts.length > 0 && (
                                    <NotionAttachmentGrid attachments={atts} onPreview={handlePreviewAttachment} />
                                  )}
                                </div>
                              </div>
                            );
                          };

                          if (commentsLoading) {
                            return (
                              <div className="text-center py-8 text-[#787774] dark:text-[#9B9A97]">
                                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#2383E2]" />
                                <p className="text-xs">Memuat riwayat diskusi...</p>
                              </div>
                            );
                          }

                          if (sortedTopicComments.length === 0) {
                            return (
                              <div className="text-center py-8 px-4 rounded-lg border border-dashed border-[#EDEDEC] dark:border-[#2F2F2F] text-[#787774] dark:text-[#9B9A97]">
                                <MessageSquare className="w-5 h-5 mx-auto mb-1.5 opacity-40 text-[#787774]" />
                                <p className="text-xs italic">Belum ada komentar atau diskusi pada kegiatan ini.</p>
                              </div>
                            );
                          }

                          if (sortedTopicComments.length <= 2 || showAllReplies) {
                            return sortedTopicComments.map((c, idx) => renderCommentItem(c, idx));
                          }

                          return (
                            <div className="space-y-1">
                              {renderCommentItem(sortedTopicComments[0], 0)}
                              <div className="pl-8 py-1">
                                <button
                                  type="button"
                                  onClick={() => setShowAllReplies(true)}
                                  className="text-xs font-medium text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white flex items-center gap-1.5 py-1 px-2.5 rounded-md hover:bg-[#F1F1EF] dark:hover:bg-[#252525] transition-colors cursor-pointer border border-[#EDEDEC] dark:border-[#2F2F2F]"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                  <span>Tampilkan {sortedTopicComments.length - 2} balasan lainnya</span>
                                </button>
                              </div>
                              {renderCommentItem(sortedTopicComments[sortedTopicComments.length - 1], sortedTopicComments.length - 1)}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Notion Bottom Comment Input Box */}
                      <form 
                        onSubmit={handlePostComment} 
                        onPaste={handleCommentPaste}
                        className="p-3 sm:p-3.5 border border-[#EDEDEC] dark:border-[#2F2F2F] rounded-xl space-y-2.5 shadow-xs bg-white dark:bg-[#202020] mt-4"
                      >
                        {/* Replying banner */}
                        {replyingTo && (
                          <div className="flex items-center justify-between p-2 px-3 rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] bg-[#F7F7F5] dark:bg-[#252525] text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <Reply className="w-3.5 h-3.5 text-[#787774] shrink-0 rotate-180" />
                              <span className="truncate text-[#37352F] dark:text-[#E6E6E5]">
                                Membalas <strong className="font-semibold">{replyingTo.authorName}</strong>: <span className="text-[#787774] dark:text-[#9B9A97] italic font-normal">"{replyingTo.content.substring(0, 60)}{replyingTo.content.length > 60 ? '...' : ''}"</span>
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setReplyingTo(null)}
                              className="p-1 hover:bg-[#EFEFED] dark:hover:bg-[#333333] rounded text-[#787774] hover:text-[#37352F] dark:hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
                              title="Batal Membalas"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Selected Attachment Preview with Caption */}
                        {(selectedFiles.length > 0 || selectedFile) && (
                          <div className="p-2.5 rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] bg-[#FAFAFA] dark:bg-[#181818] space-y-2 text-xs">
                            <div className="flex items-center justify-between font-medium text-[#787774] dark:text-[#9B9A97]">
                              <span>Lampiran ({selectedFiles.length || 1} file siap dikirim):</span>
                              <button
                                type="button"
                                onClick={() => { setSelectedFiles([]); setSelectedFile(null); setCommentFileCaption(''); }}
                                className="text-rose-500 hover:underline cursor-pointer"
                              >
                                Hapus Semua
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(selectedFiles.length > 0 ? selectedFiles : (selectedFile ? [selectedFile] : [])).map((f, fIdx) => (
                                <div key={fIdx} className="relative flex items-center gap-2 p-1.5 pr-2.5 rounded-md bg-white dark:bg-[#222222] border border-[#EDEDEC] dark:border-[#2F2F2F]">
                                  {f.isImage && (f.previewUrl || f.url) ? (
                                    <img src={f.previewUrl || f.url} alt={f.name} className="w-8 h-8 object-cover rounded border border-[#EDEDEC] dark:border-[#2F2F2F] shrink-0" />
                                  ) : (
                                    <Paperclip className="w-4 h-4 text-[#787774] shrink-0" />
                                  )}
                                  <span className="text-[11px] font-medium text-[#37352F] dark:text-[#E6E6E5] truncate max-w-[120px]" title={f.name}>{f.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = selectedFiles.filter((_, idx) => idx !== fIdx);
                                      setSelectedFiles(updated);
                                      setSelectedFile(updated[0] || null);
                                    }}
                                    className="p-0.5 hover:bg-rose-500/10 text-[#787774] hover:text-rose-500 rounded cursor-pointer"
                                    title="Hapus file ini"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="pt-1">
                              <input
                                type="text"
                                value={commentFileCaption}
                                onChange={(e) => setCommentFileCaption(e.target.value)}
                                placeholder="Tambahkan caption gambar/lampiran (opsional)..."
                                className="w-full text-xs px-2.5 py-1.5 rounded-md border border-[#EDEDEC] dark:border-[#2F2F2F] focus:border-[#B4B4B0] dark:focus:border-[#5A5A55] outline-none leading-relaxed bg-white dark:bg-[#1E1E1E] text-[#37352F] dark:text-[#E6E6E5]"
                              />
                            </div>
                          </div>
                        )}

                        <textarea
                          id="notion-comment-textarea"
                          rows={2}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          onPaste={handleCommentPaste}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handlePostComment(e);
                            }
                          }}
                          placeholder={
                            replyingTo 
                              ? `Tulis tanggapan untuk ${replyingTo.authorName}... (Bisa paste gambar / Ctrl+V)` 
                              : selectedFiles.length > 0 || selectedFile
                              ? `Tulis catatan tambahan untuk lampiran (opsional, tekan Enter untuk kirim)...`
                              : `Tulis komentar... (Bisa langsung paste gambar / Ctrl+V)`
                          }
                          className="w-full p-2 rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] focus:border-[#B4B4B0] dark:focus:border-[#5A5A55] outline-none leading-relaxed text-xs sm:text-sm resize-none bg-[#FAFAFA] dark:bg-[#191919] text-[#37352F] dark:text-[#E6E6E5] placeholder-[#9B9A97]"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
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
                              className="p-1 px-2.5 rounded-md border border-[#EDEDEC] dark:border-[#2F2F2F] text-xs font-medium flex items-center gap-1.5 hover:bg-[#F7F7F5] dark:hover:bg-[#252525] text-[#787774] dark:text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white transition-colors cursor-pointer"
                              title="Lampirkan foto atau dokumen ke diskusi"
                            >
                              {isUploadingCommentFile ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2383E2]" /> : <Paperclip className="w-3.5 h-3.5" />}
                              <span>{isUploadingCommentFile ? 'Mengunggah...' : 'Lampirkan Foto'}</span>
                            </button>

                            <span className="text-[11px] font-medium text-[#787774] dark:text-[#9B9A97]">Status:</span>
                            <select
                              value={statusUpdateChoice}
                              onChange={(e) => setStatusUpdateChoice(e.target.value)}
                              className="p-1 px-2 rounded-md border border-[#EDEDEC] dark:border-[#2F2F2F] text-xs outline-none cursor-pointer bg-white dark:bg-[#191919] text-[#37352F] dark:text-[#E6E6E5]"
                            >
                              <option value="">Status Tetap ({getRowVal(selectedRow, 'Status') || 'Open'})</option>
                              <option value="On Progress">⏩ Ubah ke On Progress</option>
                              <option value="Close">✅ Ubah ke Closed / Selesai</option>
                              <option value="Pending">⏳ Ubah ke Pending</option>
                              <option value="Open">⭕ Ubah ke Open</option>
                            </select>
                          </div>

                          <button
                            type="submit"
                            disabled={submittingComment || isUploadingCommentFile || (!commentText.trim() && selectedFiles.length === 0 && !selectedFile)}
                            className="text-xs px-4 py-1.5 bg-[#2383E2] hover:bg-[#1D70C2] text-white font-semibold rounded-lg shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                          >
                            {submittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : replyingTo ? <Reply className="w-3.5 h-3.5 rotate-180" /> : <Send className="w-3.5 h-3.5" />}
                            <span>{replyingTo ? 'Kirim Balasan' : 'Comment'}</span>
                          </button>
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
              className="relative w-full max-w-lg rounded-xl border border-[#EDEDEC] dark:border-[#2F2F2F] shadow-2xl p-5 z-10 space-y-4 bg-white dark:bg-[#1E1E1E] text-[#37352F] dark:text-[#E6E6E5]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#EDEDEC] dark:border-[#2F2F2F]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#F1F1EF] dark:bg-[#2F2F2F] flex items-center justify-center text-[#5A5A55] dark:text-[#9B9A97]">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#37352F] dark:text-white">Upload Lampiran dengan Caption</h3>
                    <p className="text-xs text-[#787774] dark:text-[#9B9A97]">Tambahkan penjelasan atau caption untuk foto/file ini</p>
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
                  className="p-1.5 rounded-md hover:bg-[#F1F1EF] dark:hover:bg-[#252525] text-[#787774] hover:text-[#37352F] dark:hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview Thumbnail */}
              <div className="space-y-3">
                {pendingUploadFile.isImage && pendingUploadFile.previewUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-[#EDEDEC] dark:border-[#2F2F2F] max-h-56 flex items-center justify-center bg-[#FAFAFA] dark:bg-black/40">
                    <img 
                      src={pendingUploadFile.previewUrl} 
                      alt={pendingUploadFile.file.name} 
                      className="w-full h-full max-h-56 object-contain" 
                    />
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] flex items-center gap-3 bg-[#FAFAFA] dark:bg-[#141414]">
                    <div className="w-10 h-10 rounded-lg bg-[#F1F1EF] dark:bg-[#2F2F2F] flex items-center justify-center text-[#5A5A55] dark:text-[#9B9A97] shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-xs text-[#37352F] dark:text-[#E6E6E5] block truncate">{pendingUploadFile.file.name}</span>
                      <span className="text-[10px] text-[#787774] dark:text-[#9B9A97]">{(pendingUploadFile.file.size / 1024).toFixed(0)} KB</span>
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-[#787774] dark:text-[#9B9A97] truncate flex items-center justify-between">
                  <span className="truncate max-w-[300px]"><strong>File:</strong> {pendingUploadFile.file.name}</span>
                  <span>{(pendingUploadFile.file.size / 1024).toFixed(0)} KB</span>
                </div>

                {/* Caption Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#37352F] dark:text-[#E6E6E5]">
                    Caption / Keterangan Gambar (Opsional):
                  </label>
                  <textarea
                    rows={3}
                    autoFocus
                    value={pendingUploadFile.caption}
                    onChange={(e) => setPendingUploadFile({ ...pendingUploadFile, caption: e.target.value })}
                    placeholder="Contoh: Kondisi bearing motor setelah dibersihkan dan siap dipasang kembali..."
                    className="w-full p-2.5 rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] text-xs outline-none focus:border-[#B4B4B0] dark:focus:border-[#5A5A55] leading-relaxed resize-none bg-[#FAFAFA] dark:bg-[#141414] text-[#37352F] dark:text-[#E6E6E5]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleExecuteGalleryUpload();
                      }
                    }}
                  />
                  <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] italic block">
                    Tekan Ctrl+Enter atau klik tombol di bawah untuk mengunggah.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#EDEDEC] dark:border-[#2F2F2F]">
                <button
                  type="button"
                  disabled={isUploadingGallery}
                  onClick={() => {
                    if (pendingUploadFile.previewUrl && pendingUploadFile.previewUrl.startsWith('blob:')) {
                      URL.revokeObjectURL(pendingUploadFile.previewUrl);
                    }
                    setPendingUploadFile(null);
                  }}
                  className="px-4 py-2 rounded-lg border border-[#EDEDEC] dark:border-[#2F2F2F] text-xs font-medium text-[#787774] dark:text-[#9B9A97] hover:bg-[#F1F1EF] dark:hover:bg-[#252525] transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isUploadingGallery}
                  onClick={handleExecuteGalleryUpload}
                  className="text-xs px-5 py-2 bg-[#2383E2] hover:bg-[#1D70C2] text-white font-semibold rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors disabled:opacity-50"
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
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Preview Modal with Gallery Navigation */}
      {previewImage && (
        <ImageModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          title={previewImage.title}
          driveViewUrl={previewImage.driveViewUrl}
          driveDownloadUrl={previewImage.driveDownloadUrl}
          images={previewImage.images}
          currentIndex={previewImage.currentIndex}
        />
      )}

      {/* Logbook Task Recommendation Modal */}
      {isLogbookTable && (
        <LogbookTaskRecommendationModal
          isOpen={showLogbookRecModal}
          onClose={() => setShowLogbookRecModal(false)}
          sectionName={section || 'Preparasi'}
          allPosts={allPosts || []}
          targetUniverse={pt === 'GTS' ? 'GTS' : 'TBP'}
          existingRows={localRows}
          onAddSelectedTasks={handleAddRecommendedTasks}
          onOpenManualAddTaskModal={handleOpenManualRowModal}
          employeesList={employeesList}
          currentUserNik={currentAuthorNik}
          currentUserName={currentAuthorName}
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

      {/* Finding Resolution Modal (Mandatory Photo Upload & Resolution Details) */}
      <FindingResolutionModal
        isOpen={findingResolutionModalState.isOpen}
        ticket={findingResolutionModalState.ticket}
        ticketId={findingResolutionModalState.ticketId}
        initialMode={findingResolutionModalState.initialMode}
        currentUserName={currentAuthorName}
        currentUserNik={currentAuthorNik}
        employeesList={employeesList}
        onClose={() => setFindingResolutionModalState({ isOpen: false, ticket: null })}
        onResolved={handleFindingResolved}
      />

      {/* Create Finding Modal (Direct Input for Sidak Management / Inspeksi Gabungan) */}
      <CreateFindingModal
        isOpen={createFindingModalState.isOpen}
        currentUserName={currentAuthorName}
        currentUserNik={currentAuthorNik}
        defaultCategory="Inspeksi Gabungan"
        employeesList={employeesList}
        onClose={() => setCreateFindingModalState({ isOpen: false })}
        onCreated={handleCreateFindingSuccess}
      />

      {/* Link Module Modal (Generic linking to Tiket, WO, Route, or URL) */}
      <LinkModuleModal
        isOpen={linkModuleModalState.isOpen}
        rowTitle={linkModuleModalState.rowTitle}
        currentLink={linkModuleModalState.currentLink}
        onClose={() => setLinkModuleModalState(prev => ({ ...prev, isOpen: false }))}
        onSaveLink={handleSaveRowLink}
      />

      {/* Modern Delete Confirmation Modal */}
      <NotionDeleteConfirmationModal
        isOpen={deleteConfirmModalState.isOpen}
        onClose={() => setDeleteConfirmModalState({ isOpen: false, isDeleting: false })}
        onConfirm={executeConfirmedDelete}
        taskName={deleteConfirmModalState.taskName}
        subtaskCount={deleteConfirmModalState.subtaskCount}
        isBatch={deleteConfirmModalState.isBatch}
        batchCount={deleteConfirmModalState.rowIndices?.length || 0}
        isSubItem={deleteConfirmModalState.isSubItem}
        isDeleting={deleteConfirmModalState.isDeleting}
        isNotionLight={isNotionLight}
        deleterName={effectiveName}
        deleterJabatan={effectiveJabatan}
      />

      {/* Developer Recycle Bin Modal */}
      <NotionRecycleBinModal
        isOpen={recycleBinModalState.isOpen}
        onClose={() => setRecycleBinModalState(prev => ({ ...prev, isOpen: false }))}
        items={recycleBinModalState.items}
        isLoading={recycleBinModalState.isLoading}
        isRestoringId={recycleBinModalState.isRestoringId}
        onRestore={handleRestoreRecycleItem}
        onRefresh={handleOpenRecycleBin}
        currentPostTitle={title || 'Daily Laboratory'}
        currentPostId={postId}
        isNotionLight={isNotionLight}
      />
    </div>
  );
}
