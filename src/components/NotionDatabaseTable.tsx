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
  Square,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui';
import { toast } from 'sonner';
import { uploadPhotoToDrive } from '../sheets-api';
import { ImageModal } from './image-modal';
import { parseTasklist, toggleTasklistItem } from './notion/tasklist-utils';
import { NotionTasklistView } from './notion/NotionTasklistView';
import { NotionDropdownCell } from './notion/NotionDropdownCell';
import { NotionInlineEditor } from './notion/NotionInlineEditor';
import { NotionSaveConfirmationModal } from './notion/NotionSaveConfirmationModal';
import { EnterpriseWysiwygEditor } from './notion/EnterpriseWysiwygEditor';
import {
  normalizeCadence,
  isPeriodicCadence,
  generateSubPeriods,
  getDefaultActiveSubPeriod,
  getNextSubPeriod,
  getNextDefaultTargetDate,
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

// Canonical Notion Table Column definition in exact order
export const CANONICAL_NOTION_COLUMNS = [
  'number',
  'Jenis kegiatan',
  'Keterangan',
  'PIC',
  'Priority',
  'Status',
  'Created Time',
  'Kategori',
  'Activity (routine/non routine)',
  'period'
] as const;

export const getCellValue = (row: TableRowData, colName: string): string => {
  if (!row) return '';
  if (row[colName] !== undefined && row[colName] !== '') return row[colName];

  const targetLower = colName.toLowerCase().trim();
  for (const key of Object.keys(row)) {
    const keyLower = key.toLowerCase().trim();
    if (keyLower === targetLower) return row[key];

    if (targetLower === 'number' && (keyLower === 'no' || keyLower === 'no.' || keyLower === '#' || keyLower === 'index')) {
      return row[key];
    }
    if (targetLower === 'jenis kegiatan' && (keyLower.includes('jenis kegiatan') || keyLower === 'task' || keyLower === 'judul' || keyLower === 'name' || keyLower === 'nama' || keyLower === 'kegiatan')) {
      return row[key];
    }
    if (targetLower === 'keterangan' && (keyLower.includes('keterangan') || keyLower.includes('catatan') || keyLower.includes('deskripsi') || keyLower.includes('content') || keyLower.includes('rincian'))) {
      return row[key];
    }
    if (targetLower === 'pic' && (keyLower === 'pic' || keyLower.includes('assignee') || keyLower.includes('pj') || keyLower === 'personil')) {
      return row[key];
    }
    if (targetLower === 'priority' && (keyLower.includes('prioritas') || keyLower.includes('priority'))) {
      return row[key];
    }
    if (targetLower === 'status' && keyLower.includes('status')) {
      return row[key];
    }
    if (targetLower === 'created time' && (keyLower.includes('created') || keyLower.includes('tanggal dibuat') || keyLower.includes('waktu dibuat') || keyLower === 'dibuat')) {
      return row[key];
    }
    if (targetLower === 'kategori' && (keyLower.includes('kategori') || keyLower.includes('category') || keyLower === 'dept')) {
      return row[key];
    }
    if (targetLower === 'activity (routine/non routine)' && (keyLower.includes('activity') || keyLower.includes('aktivitas'))) {
      return row[key];
    }
    if (targetLower === 'period' && (keyLower === 'period' || keyLower === 'periode')) {
      return row[key];
    }
  }
  return row[colName] || '';
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
  if (startIdx !== -1 && endIdx - startIdx >= 2) {
    const headerLine = lines[startIdx];
    const headers = headerLine
      .split('|')
      .map((h) => h.trim())
      .filter((h, idx, arr) => idx > 0 && idx < arr.length - 1);

    const rows: TableRowData[] = [];
    for (let i = startIdx + 2; i <= endIdx; i++) {
      const rowLine = lines[i].trim();
      if (!rowLine.startsWith('|')) continue;
      const cells = rowLine
        .split('|')
        .map((c) => c.trim())
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

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
  const [localRows, setLocalRows] = useState<TableRowData[]>(() => rows || []);
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

  useEffect(() => {
    if (rows) {
      setLocalRows(rows);
      setOriginalRowsBackup(JSON.parse(JSON.stringify(rows)));
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
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'board' | 'list'>('table');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRow, setSelectedRow] = useState<TableRowData | null>(null);
  const [modalTab, setModalTab] = useState<'details' | 'comments'>('details');

  // Fit to screen / Zoom Mode State
  const [fitPageMode, setFitPageMode] = useState<boolean>(false);
  const [zoomPercent, setZoomPercent] = useState<number>(100);

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

  // Helper to establish logical Notion canonical order for database columns
  const normalizeAndOrderHeaders = useCallback((inputHeaders: string[]): string[] => {
    if (!inputHeaders || inputHeaders.length === 0) {
      return [
        'number',
        'Jenis kegiatan',
        'Keterangan',
        'PIC',
        'Status',
        'Priority',
        'Activity (routine/non routine)',
        'period',
        'Created Time'
      ];
    }

    // Ensure 'number' exists
    const hasNumber = inputHeaders.some(h => {
      const l = h.toLowerCase().trim();
      return l === 'number' || l === 'no' || l === 'no.' || l === '#';
    });

    const headersWithNumber = hasNumber ? inputHeaders : ['number', ...inputHeaders];

    // Priority ordering weight for clean Notion standard layout
    const getColOrder = (colName: string): number => {
      const l = colName.toLowerCase().trim();
      if (l === 'number' || l === 'no' || l === 'no.' || l === '#') return 0;
      if (l.includes('jenis kegiatan') || l === 'task' || l === 'judul' || l === 'name' || l === 'nama') return 1;
      if (l.includes('keterangan') || l.includes('catatan') || l.includes('deskripsi') || l.includes('rincian')) return 2;
      if (l === 'pic' || l.includes('assignee') || l.includes('pj') || l === 'personil') return 3;
      if (l.includes('status')) return 4;
      if (l.includes('priority') || l.includes('prioritas')) return 5;
      if (l.includes('activity') || l.includes('aktivitas')) return 6;
      if (l.includes('target') || l.includes('deadline') || l.includes('jatuh tempo')) return 7;
      if (l.includes('aktual') || l.includes('selesai') || l.includes('actual')) return 8;
      if (l.includes('period') || l.includes('periode')) return 9;
      if (l.includes('group') || l.includes('kategori') || l.includes('category') || l.includes('dept')) return 10;
      if (l.includes('created') || l.includes('tanggal dibuat') || l.includes('waktu dibuat')) return 90;
      return 20; // other custom columns placed between standard meta and timestamp
    };

    return [...headersWithNumber].sort((a, b) => getColOrder(a) - getColOrder(b));
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

  const displayHeaders = tableHeaders;

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
    setLocalRows(prev => prev.map(r => ({ ...r, [trimmed]: defaultValue })));
    setDirtyRowIndices(new Set(Array.from({ length: localRows.length }, (_, i) => i)));
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

    setTableHeaders(prev => prev.filter(h => h !== colName));
    setDirtyRowIndices(new Set(Array.from({ length: localRows.length }, (_, i) => i)));
    toast.info(`Kolom "${colName}" telah dihapus. Jangan lupa simpan perubahan.`);
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
    setDirtyRowIndices(new Set(Array.from({ length: localRows.length }, (_, i) => i)));
    toast.success(`Kolom "${colName}" digeser ke ${direction === 'left' ? 'kiri' : 'kanan'}`);
  };

  const handleResetColumnOrder = () => {
    setTableHeaders(prev => normalizeAndOrderHeaders(prev));
    setDirtyRowIndices(new Set(Array.from({ length: localRows.length }, (_, i) => i)));
    toast.success('Urutan kolom berhasil dirapikan sesuai standar Notion!');
  };

  // Helper to read row property with fuzzy matching across header aliases
  const getRowVal = useCallback((row: TableRowData, colName: string): string => {
    if (!row) return '';
    if (row[colName] !== undefined) return row[colName];

    const targetLower = colName.toLowerCase().trim();
    for (const key of Object.keys(row)) {
      const keyLower = key.toLowerCase().trim();
      if (keyLower === targetLower) return row[key];

      if (targetLower === 'number' && (keyLower === 'no' || keyLower === 'no.' || keyLower === '#')) {
        return row[key];
      }
      if (targetLower === 'jenis kegiatan' && (keyLower.includes('jenis kegiatan') || keyLower === 'task' || keyLower === 'judul' || keyLower === 'name' || keyLower === 'nama')) {
        return row[key];
      }
      if (targetLower === 'keterangan' && (keyLower.includes('keterangan') || keyLower.includes('catatan') || keyLower.includes('deskripsi') || keyLower.includes('content') || keyLower.includes('rincian'))) {
        return row[key];
      }
      if (targetLower === 'pic' && (keyLower === 'pic' || keyLower.includes('assignee') || keyLower.includes('pj') || keyLower === 'personil')) {
        return row[key];
      }
      if (targetLower === 'priority' && (keyLower.includes('prioritas') || keyLower.includes('priority'))) {
        return row[key];
      }
      if (targetLower === 'status' && keyLower.includes('status')) {
        return row[key];
      }
      if (targetLower === 'created time' && (keyLower.includes('created') || keyLower.includes('tanggal dibuat') || keyLower.includes('waktu dibuat') || keyLower === 'dibuat')) {
        return row[key];
      }
      if (targetLower === 'kategori' && (keyLower.includes('kategori') || keyLower.includes('category') || keyLower === 'dept')) {
        return row[key];
      }
      if (targetLower === 'activity (routine/non routine)' && (keyLower.includes('activity') || keyLower.includes('aktivitas'))) {
        return row[key];
      }
      if (targetLower === 'period' && (keyLower === 'period' || keyLower === 'periode')) {
        return row[key];
      }
    }
    return '';
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

  // Comment counts per topic title (aggregates sub-periods to base topic as well)
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
    });
    return map;
  }, [allComments]);

  // Base topic title from row
  const baseTopicTitle = useMemo(() => {
    if (!selectedRow) return '';
    return (getRowVal(selectedRow, 'Jenis kegiatan') || '').trim();
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
    if (!selectedTopicTitle) return [];
    const q = selectedTopicTitle.toLowerCase().trim();
    return allComments.filter((c) => (c.topicTitle || '').toLowerCase().trim() === q);
  }, [allComments, selectedTopicTitle]);

  // Notion-style sorted comment stream (chronological oldest to newest)
  const sortedTopicComments = useMemo(() => {
    if (!selectedTopicTitle) return [];
    const q = selectedTopicTitle.toLowerCase().trim();
    const list = allComments.filter((c) => (c.topicTitle || '').toLowerCase().trim() === q);
    return [...list].sort((a, b) => {
      const tA = new Date(a.createdAt || 0).getTime();
      const tB = new Date(b.createdAt || 0).getTime();
      return tA - tB;
    });
  }, [allComments, selectedTopicTitle]);

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
      const updatedMarkdown = serializeMarkdownTable(displayHeaders, newRows, beforeText, afterText);
      const res = await fetch(`/api/bulletin/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedMarkdown })
      });
      if (res.ok) {
        onPostContentUpdate?.(updatedMarkdown);
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
        }
      }

      copy[targetRowIndex] = targetRow;

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

    setDirtyRowIndices(prev => {
      const next = new Set(prev);
      next.add(targetRowIndex);
      return next;
    });
  };

  // Toggle item checklist tasklist langsung pada baris tabel
  const handleToggleTasklistDirect = (targetRowIndex: number, colName: string, taskIndex: number) => {
    const row = localRows[targetRowIndex];
    if (!row) return;
    const currentVal = getRowVal(row, colName);
    const updatedVal = toggleTasklistItem(currentVal, taskIndex);
    handleUpdateCellDirect(targetRowIndex, colName, updatedVal);

    // Auto-check if this toggle completed the routine task (last subtask checked -> 100%)
    const prevProg = parseTasklist(currentVal);
    const newProg = parseTasklist(updatedVal);

    if (newProg.hasTasklist && newProg.total > 0 && newProg.completed === newProg.total && prevProg.completed < prevProg.total) {
      const rowAct = getRowVal(row, 'Activity (routine/non routine)') || getRowVal(row, 'period') || '';
      const rowCad = normalizeCadence(rowAct) || currentCadence;
      if (rowCad && rowCad !== 'Non-Routine') {
        const curPeriod = activeSubPeriod || detectRowSubPeriod(row, rowCad) || getDefaultActiveSubPeriod(rowCad);
        const nextPeriod = getNextSubPeriod(curPeriod, rowCad);
        const targetVal = getRowVal(row, 'Target Selesai') || getRowVal(row, 'Deadline') || getRowVal(row, 'Created Time');
        const nextTarget = getNextDefaultTargetDate(rowCad, targetVal);
        const resetDesc = resetAllTasklistItems(updatedVal);

        setRoutineCompletionModal({
          row,
          rowIndex: targetRowIndex,
          colName,
          currentPeriod: curPeriod,
          nextPeriod,
          nextTargetDate: nextTarget,
          resetKeterangan: resetDesc
        });
      }
    }
  };

  // Handler saat user konfirmasi untuk membuat kembali task routine untuk periode selanjutnya
  const handleConfirmNextPeriod = async () => {
    if (!routineCompletionModal) return;
    const { row, rowIndex, colName, nextPeriod, nextTargetDate, resetKeterangan } = routineCompletionModal;
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
              taskDate: new Date().toISOString().split('T')[0],
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
        toast.success('Perubahan tabel berhasil disimpan ke dokumen Buletin!');
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
    const nextNum = String(localRows.length + 1);
    const now = new Date();
    const createdStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    setRowFormData({
      number: nextNum,
      'Jenis kegiatan': '',
      Keterangan: '',
      PIC: currentAuthorName || '',
      Priority: 'Normal',
      Status: 'Open',
      'Created Time': createdStr,
      Kategori: section || 'Laboratorium',
      'Activity (routine/non routine)': 'Routine',
      period: 'Weekly'
    });
    setEditingRowIndex(null);
    setShowRowModal(true);
  };

  // Edit Row Handler
  const handleOpenEditModal = (row: TableRowData, index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const data: TableRowData = {};
    displayHeaders.forEach(h => {
      data[h] = getRowVal(row, h);
    });
    setRowFormData(data);
    setEditingRowIndex(index);
    setShowRowModal(true);
  };

  // Save Row (Create / Edit)
  const handleSaveRow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rowFormData['Jenis kegiatan']?.trim()) {
      toast.error('Wajib mengisi "Jenis kegiatan"');
      return;
    }

    // Auto-progress status jika berisi tasklist (kecuali jika user memilih Canceled)
    const taskProg = parseTasklist(rowFormData['Keterangan']);
    if (taskProg.hasTasklist) {
      const curSt = (rowFormData['Status'] || '').toLowerCase();
      if (!curSt.includes('cancel')) {
        rowFormData['Status'] = taskProg.percentage === 0 ? 'Open' : taskProg.percentage === 100 ? 'Closed' : 'On Progress';
      }
    }

    setIsSavingRow(true);
    try {
      let updatedRows: TableRowData[];
      if (editingRowIndex === null) {
        // Adding new row
        updatedRows = [...localRows, rowFormData];
        toast.success('Data kegiatan baru berhasil ditambahkan!');
      } else {
        // Editing existing row
        updatedRows = localRows.map((r, i) => i === editingRowIndex ? { ...r, ...rowFormData } : r);
        toast.success('Perubahan data kegiatan berhasil disimpan!');
      }

      setLocalRows(updatedRows);
      onRowsChange?.(updatedRows);
      await saveTableToBackend(updatedRows);
      setShowRowModal(false);

      if (selectedRow && editingRowIndex !== null) {
        setSelectedRow(rowFormData);
      }
    } catch (err: any) {
      toast.error('Gagal menyimpan baris data: ' + err.message);
    } finally {
      setIsSavingRow(false);
    }
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
      result = result.filter((row) => {
        return Object.values(row).some((val) => 
          (val || '').toLowerCase().includes(q)
        );
      });
    }

    // 2. Status Filter
    if (statusFilter !== 'ALL') {
      result = result.filter((row) => {
        const val = (getRowVal(row, 'Status') || '').toUpperCase().trim();
        if (statusFilter === 'ACTIVE') return !val.includes('CLOSE') && !val.includes('SELESAI') && !val.includes('DONE') && !val.includes('CANCEL') && !val.includes('BATAL');
        if (statusFilter === 'ON PROGRESS') return val.includes('PROGRESS') || val.includes('PROSES');
        if (statusFilter === 'CLOSE') return val.includes('CLOSE') || val.includes('SELESAI') || val.includes('DONE');
        if (statusFilter === 'OPEN') return val.includes('OPEN') || val.includes('BARU');
        if (statusFilter === 'CANCELED') return val.includes('CANCEL') || val.includes('BATAL');
        if (statusFilter === 'PENDING') return val.includes('PENDING') || val.includes('HOLD') || val.includes('DELAY');
        return val === statusFilter;
      });
    }

    // 3. Priority Filter
    if (priorityFilter !== 'ALL') {
      result = result.filter((row) => {
        const val = (getRowVal(row, 'Priority') || '').toUpperCase().trim();
        return val.includes(priorityFilter);
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
  }, [localRows, searchQuery, statusFilter, priorityFilter, sortColumn, sortDirection, getRowVal]);

  // Statistics calculation
  const stats = useMemo(() => {
    let total = 0;
    let onProgress = 0;
    let closed = 0;
    let open = 0;
    let canceled = 0;
    let highPriority = 0;

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

        if (p.includes('HIGH') || p.includes('URGENT') || p.includes('TINGGI')) highPriority++;
      }
    });

    return { total, onProgress, closed, open, canceled, highPriority };
  }, [localRows, getRowVal]);

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
    const finalContent = commentText.trim() || (commentFileCaption.trim() ? `📎 ${selectedFile?.name}\n\n${commentFileCaption.trim()}` : (selectedFile ? `📎 Lampiran: ${selectedFile.name}` : ''));
    if (!finalContent && !selectedFile) return;
    if (!postId || !selectedRow) return;

    const topicTitleVal = selectedTopicTitle || 'Topik';
    const picVal = (getRowVal(selectedRow, 'PIC') || '').trim();
    const activeSection = section || getRowVal(selectedRow, 'Kategori') || 'Prep & Lab';

    try {
      isSubmittingCommentRef.current = true;
      setSubmittingComment(true);
      const fileUrlPayload = selectedFile ? JSON.stringify([{
        url: selectedFile.url,
        name: selectedFile.name,
        caption: commentFileCaption.trim(),
        directUrl: selectedFile.url,
        isImage: selectedFile.isImage
      }]) : null;

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
          fileName: selectedFile?.name || null,
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
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCommentFile(true);
    toast.loading('Mengompres dan mengunggah lampiran...', { id: 'upload-comment-file' });

    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64Raw = ev.target?.result as string;
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

        setSelectedFile({
          name: file.name,
          url: uploadedUrl,
          previewUrl: isImg ? finalBase64 : undefined,
          isImage: isImg
        });
        toast.success('Lampiran berhasil diunggah! Anda dapat menambahkan caption di bawah.', { id: 'upload-comment-file' });
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('Gagal mengunggah file', { id: 'upload-comment-file' });
    } finally {
      setIsUploadingCommentFile(false);
      if (e.target) e.target.value = '';
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-950/70 text-amber-300 border border-amber-600/50 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          ON PROGRESS
        </span>
      );
    }
    if (s.includes('CLOSE') || s.includes('SELESAI') || s.includes('DONE') || s.includes('RESOLVED')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-600/50 shadow-xs">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          CLOSED
        </span>
      );
    }
    if (s.includes('CANCEL') || s.includes('BATAL')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-950/70 text-rose-300 border border-rose-600/50 shadow-xs">
          <AlertCircle className="w-3 h-3 text-rose-400" />
          CANCELED
        </span>
      );
    }
    if (s.includes('OPEN') || s.includes('BARU')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-950/70 text-blue-300 border border-blue-600/50 shadow-xs">
          <Clock className="w-3 h-3 text-blue-400" />
          OPEN
        </span>
      );
    }
    if (s.includes('PENDING') || s.includes('HOLD') || s.includes('DELAY')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-950/70 text-purple-300 border border-purple-600/50 shadow-xs">
          <AlertCircle className="w-3 h-3 text-purple-400" />
          PENDING
        </span>
      );
    }
    return (
      <span 
        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border"
        style={{
          backgroundColor: 'var(--input-bg, #334155)',
          borderColor: 'var(--border-main, #475569)',
          color: 'var(--text-main, #cbd5e1)'
        }}
      >
        {statusStr}
      </span>
    );
  };

  // Helper for Priority Badge
  const renderPriorityBadge = (pStr: string) => {
    const p = (pStr || '').toUpperCase().trim();
    if (!p || p === '-') return <span className="font-mono text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>-</span>;

    if (p.includes('HIGH') || p.includes('TINGGI') || p.includes('URGENT')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-950/80 text-red-300 border border-red-700/60">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          HIGH
        </span>
      );
    }
    if (p.includes('NORMAL') || p.includes('MEDIUM') || p.includes('SEDANG')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-700/50">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
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

  // Helper for PIC Avatar Badge
  const renderPicBadge = (picStr: string) => {
    if (!picStr || picStr === '-') return <span className="font-mono text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>-</span>;
    const initial = picStr.charAt(0).toUpperCase();
    return (
      <div 
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium"
        style={{
          backgroundColor: 'var(--input-bg, #1e293b)',
          borderColor: 'var(--border-main, #334155)',
          color: 'var(--text-main, #cbd5e1)'
        }}
      >
        <span className="w-4 h-4 rounded-full bg-teal-800 text-teal-200 text-[10px] font-bold flex items-center justify-center">
          {initial}
        </span>
        <span className="truncate max-w-[110px]">{picStr}</span>
      </div>
    );
  };

  // Helper to format multiline notes
  const renderFormattedNotes = (text: string) => {
    if (!text || text === '-' || text === '•') return <span className="font-mono text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>-</span>;
    // Normalize <br/>, <br>, <br /> to newlines
    const normalized = text.replace(/<br\s*\/?>/gi, '\n');
    const cleanText = normalized.trim();

    if (cleanText.includes('•')) {
      const items = cleanText
        .split('•')
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      return (
        <ul className="space-y-1.5 my-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-main, #cbd5e1)' }}>
              <span className="text-teal-400 font-bold leading-none mt-1">•</span>
              <span className="flex-1 whitespace-pre-wrap">{item}</span>
            </li>
          ))}
        </ul>
      );
    }

    // Split on newlines if multiple lines exist
    const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      return (
        <div className="space-y-1.5 my-1">
          {lines.map((line, idx) => {
            const isBullet = line.startsWith('- ') || line.startsWith('* ');
            const content = isBullet ? line.substring(2) : line;
            return (
              <div key={idx} className="flex items-start gap-1.5 text-xs sm:text-sm leading-relaxed" style={{ color: 'var(--text-main, #cbd5e1)' }}>
                {isBullet && <span className="text-teal-400 font-bold leading-none mt-1">•</span>}
                <span className="flex-1 whitespace-pre-wrap">{content}</span>
              </div>
            );
          })}
        </div>
      );
    }

    return <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-main, #cbd5e1)' }}>{cleanText}</p>;
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
      className="w-full rounded-2xl shadow-xl overflow-hidden my-4 border transition-colors"
      style={{
        backgroundColor: 'var(--card-bg, #181818)',
        borderColor: 'var(--border-main, #334155)',
        color: 'var(--text-main, #cbd5e1)'
      }}
    >
      {/* Top Header Bar */}
      <div 
        className="p-4 border-b flex flex-wrap items-center justify-between gap-3"
        style={{
          backgroundColor: 'var(--card-bg, #202020)',
          borderColor: 'var(--border-main, #2d2d2d)'
        }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-500/15 border border-teal-500/40 text-teal-400 shadow-sm">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm md:text-base flex items-center gap-2" style={{ color: 'var(--text-main, #f8fafc)' }}>
              <span>{title || 'Database Table'}</span>
              <span 
                className="text-[10px] px-2 py-0.5 rounded-full font-mono border"
                style={{
                  backgroundColor: 'var(--input-bg, #1e293b)',
                  color: 'var(--text-muted, #94a3b8)',
                  borderColor: 'var(--border-main, #334155)'
                }}
              >
                {filteredRows.length} baris
              </span>
            </h3>
            <p className="text-[11px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
              Urutan kolom sinkron Notion: Number • Jenis kegiatan • Keterangan • PIC • Priority • Status • Created Time • Kategori • Activity • Period
            </p>
          </div>
        </div>

        {/* View Switcher, Add Row Button, Zoom & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Direct Save Button in Header */}
          {dirtyRowIndices.size > 0 && (
            <button
              onClick={() => setShowSaveConfirmModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-950/60 animate-pulse active:scale-95 transition-all cursor-pointer"
              title="Simpan perubahan tabel langsung"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Perubahan ({dirtyRowIndices.size})</span>
            </button>
          )}

          {/* Add Row Button */}
          <button
            onClick={handleOpenAddModal}
            className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Data Kegiatan</span>
          </button>

          {/* Fit Page Mode Toggle */}
          <button
            onClick={() => setFitPageMode(!fitPageMode)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs"
            style={{
              backgroundColor: fitPageMode ? 'rgba(42, 157, 143, 0.2)' : 'var(--input-bg, #242424)',
              borderColor: fitPageMode ? 'var(--primary, #2A9D8F)' : 'var(--border-main, #334155)',
              color: fitPageMode ? 'var(--primary, #2A9D8F)' : 'var(--text-main, #cbd5e1)'
            }}
            title={fitPageMode ? "Matikan Fit Screen (Mode Scroll Lebar)" : "Aktifkan Fit Screen (Semua Kolom Muat 1 Layar Tanpa Horizontal Scroll)"}
          >
            {fitPageMode ? <Minimize2 className="w-3.5 h-3.5 text-teal-400" /> : <Maximize2 className="w-3.5 h-3.5 opacity-70" />}
            <span className="hidden sm:inline">{fitPageMode ? "Fit Screen: ON" : "Fit Screen"}</span>
          </button>

          {/* Zoom Out / In Controls */}
          <div 
            className="flex items-center p-0.5 rounded-xl border text-xs"
            style={{
              backgroundColor: 'var(--input-bg, #151515)',
              borderColor: 'var(--border-main, #334155)'
            }}
          >
            <button
              onClick={() => setZoomPercent((prev) => Math.max(70, prev - 10))}
              className="p-1 px-1.5 opacity-70 hover:opacity-100 rounded-lg transition-opacity cursor-pointer"
              style={{ color: 'var(--text-main, #cbd5e1)' }}
              title="Zoom Out (Perkecil Tampilan)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span 
              onClick={() => setZoomPercent(100)}
              className="px-1.5 font-mono text-[11px] text-teal-400 font-bold min-w-[38px] text-center cursor-pointer hover:underline"
              title="Klik untuk Reset ke 100%"
            >
              {zoomPercent}%
            </span>
            <button
              onClick={() => setZoomPercent((prev) => Math.min(130, prev + 10))}
              className="p-1 px-1.5 opacity-70 hover:opacity-100 rounded-lg transition-opacity cursor-pointer"
              style={{ color: 'var(--text-main, #cbd5e1)' }}
              title="Zoom In (Perbesar Tampilan)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <div 
            className="flex items-center p-1 rounded-xl border"
            style={{
              backgroundColor: 'var(--input-bg, #151515)',
              borderColor: 'var(--border-main, #334155)'
            }}
          >
            <button
              onClick={() => setViewMode('table')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                backgroundColor: viewMode === 'table' ? 'var(--card-bg, #282828)' : 'transparent',
                color: viewMode === 'table' ? 'var(--primary, #2A9D8F)' : 'var(--text-muted, #94a3b8)',
                boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('board')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                backgroundColor: viewMode === 'board' ? 'var(--card-bg, #282828)' : 'transparent',
                color: viewMode === 'board' ? 'var(--primary, #2A9D8F)' : 'var(--text-muted, #94a3b8)',
                boxShadow: viewMode === 'board' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}
              title="Kanban Board View"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={{
                backgroundColor: viewMode === 'list' ? 'var(--card-bg, #282828)' : 'transparent',
                color: viewMode === 'list' ? 'var(--primary, #2A9D8F)' : 'var(--text-muted, #94a3b8)',
                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}
              title="List / Card View"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="p-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer hover:opacity-80"
            style={{
              backgroundColor: 'var(--input-bg, #282828)',
              borderColor: 'var(--border-main, #334155)',
              color: 'var(--text-main, #cbd5e1)'
            }}
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div 
        className="p-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs"
        style={{
          backgroundColor: 'var(--input-bg, #1e1e1e)',
          borderColor: 'var(--border-main, #2d2d2d)'
        }}
      >
        {/* Search Input */}
        <div 
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border w-full sm:w-72"
          style={{
            backgroundColor: 'var(--card-bg, #161616)',
            borderColor: 'var(--border-main, #334155)'
          }}
        >
          <Search className="w-3.5 h-3.5 opacity-60" style={{ color: 'var(--text-muted, #94a3b8)' }} />
          <input
            type="text"
            placeholder="Cari kegiatan, PIC, keterangan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full"
            style={{ color: 'var(--text-main, #e2e8f0)' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="opacity-60 hover:opacity-100" style={{ color: 'var(--text-muted, #94a3b8)' }}>
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {[
            { key: 'ALL', label: 'Semua Status', count: stats.total },
            { key: 'ACTIVE', label: 'Sedang Aktif', count: stats.total - stats.closed - stats.canceled },
            { key: 'ON PROGRESS', label: 'On Progress', count: stats.onProgress },
            { key: 'OPEN', label: 'Open', count: stats.open },
            { key: 'CLOSE', label: 'Closed / Selesai', count: stats.closed },
            { key: 'CANCELED', label: 'Canceled', count: stats.canceled },
          ].map((st) => (
            <button
              key={st.key}
              onClick={() => setStatusFilter(st.key)}
              className="px-3 py-1 rounded-lg font-semibold text-[11px] transition-all flex-shrink-0 flex items-center gap-1.5 border cursor-pointer"
              style={{
                backgroundColor: statusFilter === st.key ? 'rgba(42, 157, 143, 0.2)' : 'var(--card-bg, #262626)',
                borderColor: statusFilter === st.key ? 'var(--primary, #2A9D8F)' : 'var(--border-main, #334155)',
                color: statusFilter === st.key ? 'var(--primary, #2A9D8F)' : 'var(--text-muted, #94a3b8)'
              }}
            >
              <span>{st.label}</span>
              {st.count !== undefined && st.count > 0 && (
                <span 
                  className="text-[10px] px-1.5 py-0.2 rounded-full font-mono"
                  style={{
                    backgroundColor: statusFilter === st.key ? 'rgba(42, 157, 143, 0.25)' : 'var(--input-bg, #1e293b)',
                    color: statusFilter === st.key ? 'var(--primary, #2A9D8F)' : 'var(--text-muted, #94a3b8)'
                  }}
                >
                  {st.count}
                </span>
              )}
            </button>
          ))}

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold outline-none cursor-pointer"
            style={{
              backgroundColor: 'var(--card-bg, #262626)',
              borderColor: 'var(--border-main, #334155)',
              color: 'var(--text-main, #cbd5e1)'
            }}
          >
            <option value="ALL">Semua Prioritas</option>
            <option value="HIGH">🔴 High Priority</option>
            <option value="NORMAL">🟡 Normal Priority</option>
            <option value="LOW">🔵 Low Priority</option>
          </select>

          {/* Quick Action: Reset & Organize Column Order to Notion Canonical */}
          <button
            type="button"
            onClick={handleResetColumnOrder}
            title="Susun ulang kolom ke urutan standar Notion (No, Judul, Keterangan, PIC, Status, dll.)"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all hover:border-teal-500 hover:text-teal-400 cursor-pointer shrink-0"
            style={{
              backgroundColor: 'var(--card-bg, #262626)',
              borderColor: 'var(--border-main, #334155)',
              color: 'var(--text-muted, #94a3b8)'
            }}
          >
            <SlidersHorizontal className="w-3 h-3 text-teal-400" />
            <span>Rapikan Kolom</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TABLE VIEW (Exact Notion Column Hierarchy & Zoom / Fit Page)            */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div 
          className="overflow-x-auto transition-all"
          style={{ zoom: zoomPercent !== 100 ? `${zoomPercent}%` : undefined }}
        >
          <table className={`w-full text-left border-collapse ${
            fitPageMode ? 'table-fixed text-[11px]' : 'text-xs'
          }`}>
            {/* Table Header */}
            <thead>
              <tr 
                className="border-b select-none"
                style={{
                  backgroundColor: 'var(--input-bg, #242424)',
                  borderColor: 'var(--border-main, #303030)',
                  color: 'var(--text-muted, #94a3b8)'
                }}
              >
                {displayHeaders.map((colHeader) => {
                  const isSorted = sortColumn === colHeader;
                  const isNum = colHeader.toLowerCase() === 'number' || colHeader.toLowerCase() === 'no';
                  const isJudul = colHeader.toLowerCase().includes('jenis kegiatan') || colHeader.toLowerCase() === 'task' || colHeader.toLowerCase() === 'judul';
                  const colLower = colHeader.toLowerCase();
                  const colIdx = displayHeaders.indexOf(colHeader);

                  // Column width classes based on fitPageMode
                  let widthClass = 'whitespace-nowrap px-3 py-2.5';
                  if (fitPageMode) {
                    if (isNum) widthClass = 'w-[4%] text-center px-1 py-2';
                    else if (isJudul) widthClass = 'w-[18%] px-2.5 py-2';
                    else if (colLower.includes('keterangan') || colLower.includes('catatan')) widthClass = 'w-[23%] px-2.5 py-2';
                    else if (colLower === 'pic' || colLower.includes('assignee')) widthClass = 'w-[11%] px-2 py-2';
                    else if (colLower.includes('priority')) widthClass = 'w-[7%] px-1.5 py-2';
                    else if (colLower.includes('status')) widthClass = 'w-[9%] px-1.5 py-2';
                    else if (colLower.includes('created')) widthClass = 'w-[9%] px-1.5 py-2';
                    else if (colLower.includes('kategori')) widthClass = 'w-[6%] px-1.5 py-2';
                    else if (colLower.includes('activity')) widthClass = 'w-[7%] px-1.5 py-2';
                    else if (colLower.includes('period')) widthClass = 'w-[5%] px-1.5 py-2';
                    else widthClass = 'w-[6%] px-1.5 py-2';
                  } else {
                    if (isNum) widthClass = 'w-16 text-center px-3.5 py-3 whitespace-nowrap';
                    else if (isJudul) widthClass = 'min-w-[240px] px-3.5 py-3 whitespace-nowrap';
                    else if (colLower.includes('keterangan')) widthClass = 'min-w-[280px] px-3.5 py-3';
                    else widthClass = 'px-3.5 py-3 whitespace-nowrap';
                  }

                  return (
                    <th
                      key={colHeader}
                      className={`font-bold hover:opacity-90 transition-opacity group/th relative ${widthClass}`}
                    >
                      <div className={`flex items-center justify-between gap-1.5 ${isNum ? 'justify-center' : ''}`}>
                        <div 
                          onClick={() => handleSort(colHeader)}
                          className="flex items-center gap-1 cursor-pointer flex-1 min-w-0"
                          title="Klik untuk mengurutkan kolom"
                        >
                          <span className="truncate">{colHeader}</span>
                          {isSorted && (
                            sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400 shrink-0" /> : <ArrowDown className="w-3 h-3 text-teal-400 shrink-0" />
                          )}
                        </div>

                        {/* Column Reorder (< and >) and Delete (X) Actions */}
                        {!isNum && (
                          <div className="opacity-0 group-hover/th:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
                            {/* Geser Kiri */}
                            {colIdx > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveColumn(colHeader, 'left');
                                }}
                                title={`Geser kolom "${colHeader}" ke kiri`}
                                className="p-0.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-teal-300 transition-all cursor-pointer"
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
                                className="p-0.5 rounded hover:bg-slate-700/50 text-slate-400 hover:text-teal-300 transition-all cursor-pointer"
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
                                className="p-0.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </th>
                  );
                })}

                {/* Add Column Header Button (+) */}
                <th className="w-10 text-center px-1 py-2 relative" ref={addColumnRef}>
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

                <th className={`text-center ${fitPageMode ? 'w-[5%] px-1 py-2' : 'w-24 px-3 py-3'}`} style={{ color: 'var(--text-muted, #94a3b8)' }}>Aksi</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody 
              className="divide-y"
              style={{
                backgroundColor: 'var(--card-bg, #1c1c1c)',
                borderColor: 'var(--border-main, #334155)'
              }}
            >
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={displayHeaders.length + 2} className="py-12 text-center italic text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>
                    Tidak ada data yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const actualRowIndex = localRows.indexOf(row) !== -1 ? localRows.indexOf(row) : idx;
                  const isDirty = dirtyRowIndices.has(actualRowIndex);
                  const topicTitle = getRowVal(row, 'Jenis kegiatan') || `Baris ${idx + 1}`;
                  const topicKey = topicTitle.toLowerCase().trim();
                  const cCount = topicCommentCounts[topicKey] || 0;

                  return (
                    <tr
                      key={idx}
                      className={`hover:opacity-95 transition-all group ${
                        isDirty ? 'bg-amber-500/5 hover:bg-amber-500/10' : ''
                      }`}
                      style={{ borderBottomColor: isDirty ? 'rgba(245, 158, 11, 0.4)' : 'var(--border-main, #334155)' }}
                    >
                      {displayHeaders.map((colName) => {
                        const val = getRowVal(row, colName);
                        const colLower = colName.toLowerCase();

                        // 1. Number Column
                        if (colLower === 'number' || colLower === 'no') {
                          return (
                            <td key={colName} className={`text-center font-mono ${
                              fitPageMode ? 'px-1 py-2 text-[10px]' : 'px-3.5 py-3 text-[11px]'
                            }`} style={{ color: isDirty ? '#f59e0b' : 'var(--text-muted, #64748b)' }}>
                              <div className="flex items-center justify-center gap-1">
                                {isDirty && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" title="Ada perubahan belum disimpan" />
                                )}
                                <span>{val || idx + 1}</span>
                              </div>
                            </td>
                          );
                        }

                        // 2. Jenis kegiatan Column (Judul)
                        if (colLower.includes('jenis kegiatan') || colLower === 'task' || colLower === 'judul') {
                          const isEditingThis = activeInlineEditor?.rowIndex === actualRowIndex && activeInlineEditor?.colName === colName;

                          return (
                            <td key={colName} className={`font-semibold transition-colors ${
                              fitPageMode ? 'px-2 py-2 overflow-hidden' : 'px-4 py-3'
                            }`} style={{ color: 'var(--text-main, #f8fafc)' }}>
                              {isEditingThis ? (
                                <NotionInlineEditor
                                  initialValue={val}
                                  fieldLabel="Judul Kegiatan"
                                  multiline={false}
                                  onSave={(newVal) => {
                                    handleUpdateCellDirect(actualRowIndex, colName, newVal);
                                    setActiveInlineEditor(null);
                                  }}
                                  onCancel={() => setActiveInlineEditor(null)}
                                />
                              ) : (
                                <div className="flex items-center justify-between gap-2 group/cell">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className={`leading-snug block ${fitPageMode ? 'line-clamp-2 break-words text-[11px]' : ''}`}>
                                      {val && val !== '-' ? val : <em style={{ color: 'var(--text-muted, #64748b)' }}>Tanpa Judul</em>}
                                    </span>
                                    
                                    {/* Dedicated Comment Button: page discussion opens ONLY here */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedRow(row);
                                        setModalTab('comments');
                                      }}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                                        cCount > 0
                                          ? 'bg-teal-950/80 border-teal-600/70 text-teal-300 hover:bg-teal-900 shadow-xs'
                                          : 'bg-slate-800/70 border-slate-700/70 text-slate-400 hover:text-teal-300 hover:border-teal-600/60'
                                      }`}
                                      title="Klik untuk membuka ruang diskusi/komentar baris ini"
                                    >
                                      <MessageSquare className="w-2.5 h-2.5" />
                                      <span>{cCount > 0 ? `${cCount} Diskusi` : 'Diskusi'}</span>
                                    </button>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveInlineEditor({ rowIndex: actualRowIndex, colName, initialValue: val, multiline: false });
                                    }}
                                    title="Edit judul langsung"
                                    className="opacity-0 group-hover/cell:opacity-100 p-1 rounded hover:bg-teal-500/15 text-slate-400 hover:text-teal-300 transition-all shrink-0 cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        }

                        // 3. Keterangan Column (dengan Smart Tasklist & Progress)
                        if (colLower.includes('keterangan') || colLower.includes('catatan') || colLower.includes('deskripsi')) {
                          const isEditingThis = activeInlineEditor?.rowIndex === actualRowIndex && activeInlineEditor?.colName === colName;
                          const taskProgress = parseTasklist(val);

                          return (
                            <td key={colName} className={`${
                              fitPageMode ? 'px-2 py-2 overflow-hidden' : 'px-4 py-3 max-w-md'
                            }`}>
                              {isEditingThis ? (
                                <NotionInlineEditor
                                  initialValue={val}
                                  fieldLabel="Keterangan & Tasklist"
                                  multiline={true}
                                  onSave={(newVal) => {
                                    handleUpdateCellDirect(actualRowIndex, colName, newVal);
                                    setActiveInlineEditor(null);
                                  }}
                                  onCancel={() => setActiveInlineEditor(null)}
                                />
                              ) : taskProgress.hasTasklist ? (
                                <div 
                                  className="relative group/cell"
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setActiveInlineEditor({ rowIndex: actualRowIndex, colName, initialValue: val, multiline: true });
                                  }}
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <NotionTasklistView
                                      progress={taskProgress}
                                      onToggleTask={(taskIdx) => handleToggleTasklistDirect(actualRowIndex, colName, taskIdx)}
                                      compact={fitPageMode}
                                      hideProgressBar={true}
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveInlineEditor({ rowIndex: actualRowIndex, colName, initialValue: val, multiline: true });
                                      }}
                                      title="Edit keterangan & tasklist langsung"
                                      className="opacity-0 group-hover/cell:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-teal-400 transition-all shrink-0 cursor-pointer"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  className="relative group/cell flex items-start justify-between gap-1"
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    setActiveInlineEditor({ rowIndex: actualRowIndex, colName, initialValue: val, multiline: true });
                                  }}
                                >
                                  <div className={fitPageMode ? 'line-clamp-2 break-words text-[10.5px] flex-1' : 'flex-1'}>
                                    {renderFormattedNotes(val)}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveInlineEditor({ rowIndex: actualRowIndex, colName, initialValue: val, multiline: true });
                                    }}
                                    title="Edit keterangan langsung"
                                    className="opacity-0 group-hover/cell:opacity-100 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-teal-400 transition-all shrink-0 cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </td>
                          );
                        }

                        // 4. PIC Column
                        if (colLower === 'pic' || colLower.includes('assignee')) {
                          return (
                            <td key={colName} className={`${fitPageMode ? 'px-1.5 py-2 overflow-hidden' : 'px-3.5 py-3 whitespace-nowrap'}`}>
                              {renderPicBadge(val)}
                            </td>
                          );
                        }

                        // 5. Priority Column (Interactive Dropdown)
                        if (colLower.includes('priority') || colLower.includes('prioritas')) {
                          return (
                            <td key={colName} className={`${fitPageMode ? 'px-1 py-2 overflow-hidden' : 'px-3.5 py-3 whitespace-nowrap'}`}>
                              <NotionDropdownCell
                                type="priority"
                                value={val}
                                compact={fitPageMode}
                                onChange={(newVal) => handleUpdateCellDirect(actualRowIndex, colName, newVal)}
                              />
                            </td>
                          );
                        }

                        // 6. Status Column (Interactive Dropdown & Progress Bar)
                        if (colLower.includes('status')) {
                          const ketVal = getRowVal(row, 'Keterangan');
                          const taskProgress = parseTasklist(ketVal);

                          return (
                            <td key={colName} className={`${fitPageMode ? 'px-1 py-1.5 overflow-hidden' : 'px-4 py-2.5 whitespace-nowrap'}`}>
                              <div className="flex flex-col items-start gap-1">
                                <NotionDropdownCell
                                  type="status"
                                  value={val}
                                  compact={fitPageMode}
                                  onChange={(newVal) => handleUpdateCellDirect(actualRowIndex, colName, newVal)}
                                />
                                {taskProgress.hasTasklist && (
                                  <div className="w-full min-w-[95px] max-w-[125px] space-y-0.5 pt-0.5">
                                    <div className="flex items-center justify-between text-[9px] font-mono leading-none">
                                      <span className={`font-bold ${
                                        taskProgress.isAllCompleted
                                          ? 'text-emerald-400'
                                          : taskProgress.percentage > 0
                                          ? 'text-amber-400'
                                          : 'text-blue-400'
                                      }`}>
                                        {taskProgress.percentage}%
                                      </span>
                                      <span className="text-slate-400">
                                        {taskProgress.completed}/{taskProgress.total}
                                      </span>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
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
                                )}
                              </div>
                            </td>
                          );
                        }

                        // 7. Created Time Column
                        if (colLower.includes('created')) {
                          return (
                            <td key={colName} className={`font-mono ${
                              fitPageMode ? 'px-1 py-2 text-[10px] truncate' : 'px-3.5 py-3 whitespace-nowrap text-[11px]'
                            }`} style={{ color: 'var(--text-muted, #94a3b8)' }}>
                              {val && val !== '-' ? (
                                <span 
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border"
                                  style={{
                                    backgroundColor: 'var(--input-bg, #1e293b)',
                                    borderColor: 'var(--border-main, #334155)',
                                    color: 'var(--text-main, #cbd5e1)'
                                  }}
                                >
                                  <Clock className="w-2.5 h-2.5 text-teal-400 shrink-0" />
                                  <span className="truncate">{val}</span>
                                </span>
                              ) : (
                                <span className="font-mono" style={{ color: 'var(--text-muted, #64748b)' }}>-</span>
                              )}
                            </td>
                          );
                        }

                        // 8. Kategori Column
                        if (colLower.includes('kategori') || colLower.includes('category')) {
                          return (
                            <td key={colName} className={`${fitPageMode ? 'px-1 py-2 truncate' : 'px-3.5 py-3 whitespace-nowrap'}`}>
                              {val && val !== '-' ? (
                                <span 
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] border truncate"
                                  style={{
                                    backgroundColor: 'var(--input-bg, #1e293b)',
                                    borderColor: 'var(--border-main, #334155)',
                                    color: 'var(--text-main, #cbd5e1)'
                                  }}
                                >
                                  {val}
                                </span>
                              ) : (
                                <span className="font-mono" style={{ color: 'var(--text-muted, #64748b)' }}>-</span>
                              )}
                            </td>
                          );
                        }

                        // 9. Activity (routine/non routine) Column (Interactive Dropdown)
                        if (colLower.includes('activity') || colLower.includes('aktivitas')) {
                          return (
                            <td key={colName} className={`${fitPageMode ? 'px-1 py-2 truncate' : 'px-3.5 py-3 whitespace-nowrap'}`}>
                              <NotionDropdownCell
                                type="activity"
                                value={val}
                                compact={fitPageMode}
                                onChange={(newVal) => {
                                  if (newVal === val) return;
                                  const targetCad = normalizeCadence(newVal);
                                  const matchingDest = sectionPeriodicalPages.find(p => p.cadence === newVal || (targetCad && p.cadence === targetCad));
                                  if (matchingDest) {
                                    openMoveModal(matchingDest.post, row, newVal);
                                    return;
                                  }
                                  handleUpdateCellDirect(actualRowIndex, colName, newVal);
                                }}
                              />
                            </td>
                          );
                        }

                        // 10. Period Column (Interactive Dropdown)
                        if (colLower.includes('period') || colLower.includes('periode')) {
                          return (
                            <td key={colName} className={`${fitPageMode ? 'px-1 py-2 truncate' : 'px-3.5 py-3 whitespace-nowrap'}`}>
                              <NotionDropdownCell
                                type="period"
                                value={val}
                                compact={fitPageMode}
                                onChange={(newVal) => handleUpdateCellDirect(actualRowIndex, colName, newVal)}
                              />
                            </td>
                          );
                        }

                        // Default custom column
                        return (
                          <td key={colName} className={`whitespace-nowrap ${
                            fitPageMode ? 'px-1 py-2 text-[10.5px]' : 'px-3.5 py-3 text-xs'
                          }`} style={{ color: 'var(--text-main, #cbd5e1)' }}>
                            {val && val !== '-' ? val : <span className="font-mono" style={{ color: 'var(--text-muted, #64748b)' }}>-</span>}
                          </td>
                        );
                      })}

                      {/* Row Action Buttons */}
                      <td className={`text-center whitespace-nowrap ${fitPageMode ? 'px-1 py-2' : 'px-3 py-3'}`}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => handleOpenEditModal(row, localRows.indexOf(row), e)}
                            className="p-1.5 rounded-lg hover:text-amber-400 transition-colors"
                            style={{ color: 'var(--text-muted, #94a3b8)' }}
                            title="Edit Data Kegiatan Ini"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteRow(localRows.indexOf(row), e)}
                            className="p-1.5 rounded-lg hover:text-rose-400 transition-colors"
                            style={{ color: 'var(--text-muted, #94a3b8)' }}
                            title="Hapus Baris Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Bottom Table Add Row Shortcut */}
          <div 
            className="p-3 border-t flex items-center justify-between"
            style={{
              backgroundColor: 'var(--card-bg, #181818)',
              borderColor: 'var(--border-main, #2d2d2d)'
            }}
          >
            <button
              onClick={handleOpenAddModal}
              className="text-xs font-semibold hover:text-teal-400 flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-all cursor-pointer"
              style={{ color: 'var(--text-muted, #94a3b8)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Baris Kegiatan Baru</span>
            </button>
            <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted, #64748b)' }}>
              Total {localRows.length} baris tercatat
            </span>
          </div>

          {/* Floating Save Action Bar when there are direct unsaved edits */}
          {dirtyRowIndices.size > 0 && (
            <div 
              className="sticky bottom-3 z-40 mx-4 my-2 p-3 px-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-200"
              style={{
                backgroundColor: 'rgba(24, 24, 27, 0.95)',
                borderColor: '#14b8a6',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
              }}
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <span>Terdapat {dirtyRowIndices.size} baris data diubah langsung di tabel</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 font-mono">
                      Belum Tersimpan
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Klik Simpan Perubahan untuk mengupdate isi dokumen buletin secara permanen.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDiscardDirectChanges}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batalkan
                </button>
                <button
                  type="button"
                  onClick={() => setShowSaveConfirmModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/50 active:scale-95 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </div>
          )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Number */}
                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1 text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                    Number / No
                  </label>
                  <input
                    type="text"
                    value={rowFormData['number'] || ''}
                    onChange={(e) => setRowFormData({ ...rowFormData, number: e.target.value })}
                    className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none"
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
                    className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none cursor-pointer"
                    style={{
                      backgroundColor: 'var(--input-bg, #141414)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-main, #f1f5f9)'
                    }}
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Jenis kegiatan */}
              <div>
                <label className="block font-bold uppercase tracking-wider mb-1 text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                  Jenis Kegiatan *
                </label>
                <input
                  type="text"
                  required
                  value={rowFormData['Jenis kegiatan'] || ''}
                  onChange={(e) => setRowFormData({ ...rowFormData, 'Jenis kegiatan': e.target.value })}
                  className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none font-medium"
                  style={{
                    backgroundColor: 'var(--input-bg, #141414)',
                    borderColor: 'var(--border-main, #334155)',
                    color: 'var(--text-main, #f1f5f9)'
                  }}
                  placeholder="Contoh: Kalibrasi XRF, Analisis Sampel Harian, dsb..."
                />
              </div>

              {/* Keterangan & Rincian (Enterprise WYSIWYG Editor) */}
              <div>
                <EnterpriseWysiwygEditor
                  value={rowFormData['Keterangan'] || ''}
                  onChange={(val) => setRowFormData({ ...rowFormData, Keterangan: val })}
                  label="Keterangan & Rincian Kegiatan"
                  allowModeSwitch={true}
                  placeholder="Deskripsi langkah, catatan temuan, atau checklist subtask..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* PIC Field with Special Role & Searchable Employee Dropdown */}
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Created Time */}
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
                  />
                </div>

                {/* Kategori */}
                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1 text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                    Kategori
                  </label>
                  <input
                    type="text"
                    value={rowFormData['Kategori'] || ''}
                    onChange={(e) => setRowFormData({ ...rowFormData, Kategori: e.target.value })}
                    className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg, #141414)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-main, #f1f5f9)'
                    }}
                    placeholder="Laboratorium"
                  />
                </div>

                {/* Activity (routine/non routine) */}
                <div>
                  <label className="block font-bold uppercase tracking-wider mb-1 text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                    Activity
                  </label>
                  <select
                    value={rowFormData['Activity (routine/non routine)'] || 'Daily'}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updated: any = { ...rowFormData, 'Activity (routine/non routine)': val };
                      if (!rowFormData['period'] || rowFormData['period'] === 'Weekly') {
                        if (val === 'Daily') updated.period = 'Daily';
                        else if (val === 'Weekly') updated.period = 'Weekly';
                        else if (val === 'Monthly') updated.period = 'Monthly';
                        else if (val === 'Quarterly') updated.period = 'Quarterly';
                        else if (val === 'Biannual') updated.period = 'Biannual';
                        else if (val === 'Yearly') updated.period = 'Yearly';
                      }
                      setRowFormData(updated);
                    }}
                    className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none cursor-pointer text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg, #141414)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-main, #f1f5f9)'
                    }}
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                    <option value="Biannual">Biannual</option>
                    <option value="Yearly">Yearly</option>
                    <option value="Non-Routine">Non-Routine</option>
                    <option value="Routine">Routine (Legacy)</option>
                  </select>
                </div>
              </div>

              {/* Period Dropdown */}
              <div>
                <label className="block font-bold uppercase tracking-wider mb-1 text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                  Period / Periode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={['Daily', 'Weekly', 'Monthly', '3 Month', '6 Month', 'Yearly'].includes(rowFormData['period'] || '') ? rowFormData['period'] : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        setRowFormData({ ...rowFormData, period: e.target.value });
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none cursor-pointer text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg, #141414)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-main, #f1f5f9)'
                    }}
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                    <option value="3 Month">3 Month</option>
                    <option value="6 Month">6 Month</option>
                    <option value="Yearly">Yearly</option>
                    <option value="custom">Kustom / Lainnya...</option>
                  </select>

                  <input
                    type="text"
                    value={rowFormData['period'] || ''}
                    onChange={(e) => setRowFormData({ ...rowFormData, period: e.target.value })}
                    className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg, #141414)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-main, #f1f5f9)'
                    }}
                    placeholder="Input periode manual jika kustom..."
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
                        <span className="text-[11px] text-teal-400 font-mono font-semibold">
                          {getRowVal(selectedRow, 'Kategori') || 'Laboratorium'}
                        </span>
                        <span style={{ color: 'var(--text-muted, #64748b)' }}>•</span>
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
                          {renderPicBadge(getRowVal(selectedRow, 'PIC'))}
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

                      {/* Rincian & Keterangan Card */}
                      {(() => {
                        const selKetVal = getRowVal(selectedRow, 'Keterangan');
                        const selTaskProg = parseTasklist(selKetVal);
                        const actualIdx = localRows.indexOf(selectedRow) !== -1 
                          ? localRows.indexOf(selectedRow)
                          : localRows.findIndex(r => getRowVal(r, 'Jenis kegiatan') === getRowVal(selectedRow, 'Jenis kegiatan'));

                        return (
                          <div 
                            className="p-4 sm:p-5 rounded-2xl border shadow-sm space-y-3"
                            style={{
                              backgroundColor: 'var(--card-bg, #171717)',
                              borderColor: 'var(--border-main, #334155)'
                            }}
                          >
                            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-main, #334155)' }}>
                              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                <span>Rincian & Keterangan Kegiatan</span>
                              </h4>
                              {selTaskProg.hasTasklist && (
                                <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-semibold border ${
                                  selTaskProg.isAllCompleted
                                    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-950/40'
                                    : selTaskProg.percentage > 0
                                    ? 'border-amber-500/40 text-amber-400 bg-amber-950/40'
                                    : 'border-blue-500/40 text-blue-400 bg-blue-950/40'
                                }`}>
                                  {selTaskProg.completed}/{selTaskProg.total} ({selTaskProg.percentage}%)
                                </span>
                              )}
                            </div>

                            {selTaskProg.hasTasklist ? (
                              <div className="space-y-3 pt-1">
                                {/* Subtask Progress Bar */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                                    <span>Progres Subtask</span>
                                    <span className={`font-bold ${
                                      selTaskProg.isAllCompleted
                                        ? 'text-emerald-400'
                                        : selTaskProg.percentage > 0
                                        ? 'text-amber-400'
                                        : 'text-blue-400'
                                    }`}>
                                      {selTaskProg.isAllCompleted
                                        ? '100% Selesai (Closed)'
                                        : selTaskProg.percentage > 0
                                        ? `${selTaskProg.percentage}% (On Progress)`
                                        : '0% (Open)'}
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
                                    <div
                                      className={`h-full transition-all duration-300 ${
                                        selTaskProg.isAllCompleted
                                          ? 'bg-emerald-500'
                                          : selTaskProg.percentage < 35
                                          ? 'bg-amber-500'
                                          : 'bg-teal-500'
                                      }`}
                                      style={{ width: `${selTaskProg.percentage}%` }}
                                    />
                                  </div>
                                </div>

                                {/* Task Checklist Items */}
                                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                                  {selTaskProg.items.map((item) => (
                                    <div
                                      key={item.index}
                                      onClick={() => {
                                        if (actualIdx !== -1) {
                                          handleToggleTasklistDirect(actualIdx, 'Keterangan', item.index);
                                        }
                                      }}
                                      className="flex items-start gap-2.5 text-xs sm:text-sm select-none p-2 rounded-xl hover:bg-slate-800/60 cursor-pointer transition-colors border border-transparent hover:border-slate-700/50"
                                    >
                                      <button
                                        type="button"
                                        className="mt-0.5 shrink-0 focus:outline-none cursor-pointer"
                                      >
                                        {item.checked ? (
                                          <CheckSquare className="w-4 h-4 text-teal-400" />
                                        ) : (
                                          <Square className="w-4 h-4 text-slate-400" />
                                        )}
                                      </button>
                                      <span
                                        className={`leading-relaxed flex-1 break-words ${
                                          item.checked
                                            ? 'line-through text-slate-500 font-normal'
                                            : 'text-slate-200 font-medium'
                                        }`}
                                      >
                                        {item.text}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="leading-relaxed text-xs sm:text-sm font-sans pt-1" style={{ color: 'var(--text-main, #e2e8f0)' }}>
                                {renderFormattedNotes(selKetVal)}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Secondary Metadata Info Cards */}
                      <div className="grid grid-cols-3 gap-2.5 text-[11px]">
                        <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--input-bg, #171717)', borderColor: 'var(--border-main, #334155)' }}>
                          <span className="text-[9px] uppercase font-bold block mb-0.5" style={{ color: 'var(--text-muted, #94a3b8)' }}>Kategori</span>
                          <span className="font-medium truncate block" style={{ color: 'var(--text-main, #cbd5e1)' }}>{getRowVal(selectedRow, 'Kategori') || '-'}</span>
                        </div>
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
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteComment(c.id)}
                                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity cursor-pointer"
                                          title="Hapus komentar ini"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-main, #1e293b)' }}>
                                    {c.content}
                                  </p>

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
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteComment(c.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity cursor-pointer"
                                            title="Hapus komentar ini"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-main, #1e293b)' }}>
                                      {c.content}
                                    </p>

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
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteComment(c.id)}
                                                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity cursor-pointer"
                                                  title="Hapus komentar ini"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              )}
                                            </div>
                                          </div>

                                          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-main, #1e293b)' }}>
                                            {c.content}
                                          </p>

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
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteComment(c.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity cursor-pointer"
                                            title="Hapus komentar ini"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-main, #1e293b)' }}>
                                      {c.content}
                                    </p>

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
                        {selectedFile && (
                          <div 
                            className="p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-2.5 animate-in fade-in shadow-xs"
                            style={{
                              backgroundColor: 'var(--input-bg, #1a1a1a)',
                              borderColor: 'rgba(20, 184, 166, 0.45)'
                            }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {selectedFile.isImage && (selectedFile.previewUrl || selectedFile.url) ? (
                                <img 
                                  src={selectedFile.previewUrl || selectedFile.url} 
                                  alt={selectedFile.name} 
                                  className="w-11 h-11 object-cover rounded-lg border border-teal-500/40 shrink-0 shadow-2xs" 
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-teal-950/80 border border-teal-700/50 flex items-center justify-center text-teal-400 shrink-0">
                                  <Paperclip className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-semibold text-teal-300 block truncate max-w-[160px]" title={selectedFile.name}>{selectedFile.name}</span>
                                <span className="text-[10px] text-teal-400/80 font-medium">Lampiran siap dikirim</span>
                              </div>
                            </div>
                            <div className="flex-1 flex items-center gap-1.5">
                              <input
                                type="text"
                                value={commentFileCaption}
                                onChange={(e) => setCommentFileCaption(e.target.value)}
                                placeholder="Tambahkan caption gambar (opsional)..."
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border focus:border-teal-500 outline-none leading-relaxed"
                                style={{
                                  backgroundColor: 'var(--card-bg, #141414)',
                                  borderColor: 'var(--border-main, #334155)',
                                  color: 'var(--text-main, #f1f5f9)'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => { setSelectedFile(null); setCommentFileCaption(''); }}
                                className="p-1.5 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
                                title="Hapus Lampiran"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
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
      />
    </div>
  );
}
