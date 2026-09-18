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
  Reply
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui';
import { toast } from 'sonner';
import { uploadPhotoToDrive } from '../sheets-api';
import { ImageModal } from './image-modal';

export interface CommentAttachmentItem {
  id?: string;
  name: string;
  url: string;
  directUrl?: string;
  driveViewUrl?: string;
  driveDownloadUrl?: string;
  isImage: boolean;
  mimeType?: string;
  size?: number;
}

export const extractDriveId = (item: any): string | null => {
  if (!item) return null;
  if (item?.id && typeof item.id === 'string' && item.id.length >= 10) return item.id;
  if (item?.driveId && typeof item.driveId === 'string' && item.driveId.length >= 10) return item.driveId;
  const str = item?.fileUrl || item?.directUrl || item?.url || item?.driveViewUrl || item?.driveDownloadUrl || (typeof item === 'string' ? item : '');
  if (!str) return null;
  const match = str.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/i) ||
                str.match(/[?&]id=([a-zA-Z0-9_-]{20,})/i) ||
                str.match(/\/d\/([a-zA-Z0-9_-]{20,})/i) ||
                str.match(/\/api\/drive\/(?:view|download)\/([a-zA-Z0-9_-]{20,})/i);
  return match ? match[1] : null;
};

export const parseCommentAttachments = (fileUrl?: string | null, fileName?: string | null, contentText?: string | null): CommentAttachmentItem[] => {
  if (!fileUrl && !contentText) return [];

  // Ambil nama file dari teks content jika formatnya "📎 Lampiran Foto / Dokumen: filename.ext"
  let extractedName = '';
  if (contentText) {
    const m = contentText.match(/📎\s*(?:Lampiran Foto \/ Dokumen|Lampiran Media|Lampiran):\s*([^\n\r]+)/i);
    if (m && m[1]) {
      extractedName = m[1].trim();
    }
  }

  if (fileUrl) {
    try {
      const trimmed = fileUrl.trim();
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => {
            const name = item.name || fileName || extractedName || 'Attachment';
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
              size: item.size
            };
          });
        }
      }
    } catch (e) {}

    const driveId = extractDriveId({ fileUrl });
    const name = fileName || extractedName || (driveId ? 'Foto / Dokumen Lampiran' : 'Attachment');
    const isDoc = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|txt|csv)$/i.test(name);
    const isImg = !isDoc && (
      /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name) ||
      /\.(jpg|jpeg|png|gif|webp|svg|bmp)/i.test(fileUrl) ||
      fileUrl.startsWith('data:image/') ||
      Boolean(driveId)
    );

    const directUrl = driveId ? `/api/drive/view/${driveId}` : fileUrl;
    const driveDownloadUrl = driveId ? `/api/drive/download/${driveId}` : fileUrl;
    const driveViewUrl = driveId ? `https://drive.google.com/file/d/${driveId}/view?usp=sharing` : fileUrl;

    return [{
      id: driveId || undefined,
      name,
      url: directUrl,
      directUrl,
      driveViewUrl,
      driveDownloadUrl,
      isImage: Boolean(isImg)
    }];
  }

  return [];
};

export const AttachmentThumbnail = ({
  attachment,
  onPreview
}: {
  attachment: CommentAttachmentItem;
  onPreview: (att: CommentAttachmentItem) => void;
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [fallbackStage, setFallbackStage] = useState(0);

  const driveId = attachment.id || extractDriveId(attachment.directUrl || attachment.url);

  // Jika bukan gambar atau gagal me-render gambar, tampilkan kartu dokumen rapi
  if (!attachment.isImage || imgFailed) {
    return (
      <div
        onClick={() => onPreview(attachment)}
        className="flex items-center gap-2.5 p-2 px-3 rounded-xl border hover:border-teal-500/60 transition-all cursor-pointer group shadow-xs max-w-sm"
        style={{
          backgroundColor: 'var(--input-bg, #1a1a1a)',
          borderColor: 'var(--border-main, #334155)'
        }}
        title={`Buka / Unduh: ${attachment.name}`}
      >
        <div className="w-8 h-8 rounded-lg bg-teal-950/80 border border-teal-700/50 flex items-center justify-center text-teal-400 shrink-0 group-hover:scale-105 transition-transform">
          <FileText className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-teal-300 truncate group-hover:underline">
            {attachment.name}
          </p>
          <span className="text-[10px] text-slate-400 font-mono block">
            {attachment.size ? `${(attachment.size / 1024).toFixed(0)} KB` : 'Lampiran Berkas'}
          </span>
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-300 shrink-0" />
      </div>
    );
  }

  // Tampilan gambar foto
  const primarySrc = attachment.directUrl || attachment.url;

  return (
    <div
      onClick={() => onPreview(attachment)}
      className="relative rounded-xl overflow-hidden border hover:border-teal-500/60 max-w-xs sm:max-w-sm aspect-video block group cursor-pointer shadow-sm transition-all hover:scale-[1.01]"
      style={{
        backgroundColor: 'var(--input-bg, #141414)',
        borderColor: 'var(--border-main, #334155)'
      }}
      title={`Klik untuk memperbesar: ${attachment.name}`}
    >
      <img
        src={primarySrc}
        alt={attachment.name}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (driveId) {
            if (fallbackStage === 0) {
              setFallbackStage(1);
              target.src = `https://lh3.googleusercontent.com/d/${driveId}`;
            } else if (fallbackStage === 1) {
              setFallbackStage(2);
              target.src = `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
            } else {
              setImgFailed(true);
            }
          } else {
            setImgFailed(true);
          }
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2.5 justify-between">
        <span className="text-[11px] text-white font-medium truncate max-w-[80%] drop-shadow-sm">
          {attachment.name}
        </span>
        <Maximize2 className="w-3.5 h-3.5 text-teal-300 shrink-0" />
      </div>
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
      return String(val || '').replace(/\|/g, '\\|').replace(/\n/g, ' • ').trim();
    }).join(' | ')} |`;
  });
  
  const tableMarkdown = [headerLine, separatorLine, ...rowLines].join('\n');
  const parts = [];
  if (beforeText?.trim()) parts.push(beforeText.trim());
  parts.push(tableMarkdown);
  if (afterText?.trim()) parts.push(afterText.trim());
  return parts.join('\n\n');
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
  initialTopicTitle
}: NotionDatabaseTableProps) {
  // Local table rows for responsive instant CRUD
  const [localRows, setLocalRows] = useState<TableRowData[]>(() => rows || []);

  useEffect(() => {
    if (rows) {
      setLocalRows(rows);
    }
  }, [rows]);

  // Auto open topic drawer if initialTopicTitle is provided (e.g. from notification deep link)
  useEffect(() => {
    if (initialTopicTitle && localRows.length > 0) {
      const match = localRows.find(r => {
        const tVal = getRowVal(r, 'Jenis kegiatan') || getRowVal(r, 'keterangan') || '';
        return tVal.toLowerCase().trim() === initialTopicTitle.toLowerCase().trim() ||
               tVal.toLowerCase().includes(initialTopicTitle.toLowerCase().trim()) ||
               initialTopicTitle.toLowerCase().includes(tVal.toLowerCase().trim());
      });
      if (match) {
        setSelectedRow(match);
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
  const [selectedFile, setSelectedFile] = useState<{ name: string; url: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; driveViewUrl?: string; driveDownloadUrl?: string } | null>(null);

  // Replying state for threaded comments in discussion
  const [replyingTo, setReplyingTo] = useState<{
    id: number;
    authorNik: string;
    authorName: string;
    content: string;
  } | null>(null);

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

  // Construct standardized headers matching exact Notion requested order
  const displayHeaders = useMemo(() => {
    // Standard Canonical list
    const canonical = [
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
    ];

    // Find if there are custom extra headers in existing table not covered by canonical
    const extraHeaders: string[] = [];
    headers.forEach(h => {
      const lower = h.toLowerCase().trim();
      const isMapped = canonical.some(c => {
        const cl = c.toLowerCase();
        if (cl === 'number') return lower === 'number' || lower === 'no' || lower === 'no.' || lower === '#';
        if (cl === 'jenis kegiatan') return lower.includes('jenis kegiatan') || lower === 'task' || lower === 'judul';
        if (cl === 'keterangan') return lower.includes('keterangan') || lower.includes('catatan') || lower.includes('deskripsi');
        if (cl === 'pic') return lower === 'pic' || lower.includes('assignee') || lower.includes('pj');
        if (cl === 'priority') return lower.includes('prioritas') || lower.includes('priority');
        if (cl === 'status') return lower.includes('status');
        if (cl === 'created time') return lower.includes('created') || lower.includes('tanggal dibuat');
        if (cl === 'kategori') return lower.includes('kategori') || lower.includes('category');
        if (cl === 'activity (routine/non routine)') return lower.includes('activity') || lower.includes('aktivitas');
        if (cl === 'period') return lower.includes('period') || lower.includes('periode');
        return false;
      });
      if (!isMapped && h.trim().length > 0 && !extraHeaders.includes(h.trim())) {
        extraHeaders.push(h.trim());
      }
    });

    return [...canonical, ...extraHeaders];
  }, [headers]);

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

  // Comment counts per topic title
  const topicCommentCounts = useMemo(() => {
    const map: Record<string, number> = {};
    allComments.forEach((c) => {
      if (c.topicTitle) {
        const key = c.topicTitle.toLowerCase().trim();
        map[key] = (map[key] || 0) + 1;
      }
    });
    return map;
  }, [allComments]);

  // Active topic title for comments modal
  const selectedTopicTitle = useMemo(() => {
    if (!selectedRow) return '';
    return (getRowVal(selectedRow, 'Jenis kegiatan') || '').trim();
  }, [selectedRow, getRowVal]);

  const activeTopicComments = useMemo(() => {
    if (!selectedTopicTitle) return [];
    const q = selectedTopicTitle.toLowerCase().trim();
    return allComments.filter((c) => (c.topicTitle || '').toLowerCase().trim() === q);
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
        title: att.name,
        driveViewUrl: att.driveViewUrl,
        driveDownloadUrl: att.driveDownloadUrl
      });
    } else if (att.driveViewUrl) {
      window.open(att.driveViewUrl, '_blank');
    }
  };

  // Save changes to database
  const saveTableToBackend = async (newRows: TableRowData[]) => {
    if (!postId) return;
    try {
      const updatedMarkdown = serializeMarkdownTable(displayHeaders, newRows, beforeText, afterText);
      const res = await fetch(`/api/bulletin/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedMarkdown })
      });
      if (res.ok) {
        onPostContentUpdate?.(updatedMarkdown);
      }
    } catch (err) {
      console.error('Failed to persist table markdown to backend:', err);
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
        if (statusFilter === 'ACTIVE') return !val.includes('CLOSE') && !val.includes('SELESAI') && !val.includes('DONE');
        if (statusFilter === 'ON PROGRESS') return val.includes('PROGRESS') || val.includes('PROSES');
        if (statusFilter === 'CLOSE') return val.includes('CLOSE') || val.includes('SELESAI') || val.includes('DONE');
        if (statusFilter === 'OPEN') return val.includes('OPEN') || val.includes('BARU');
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
    let highPriority = 0;

    localRows.forEach((r) => {
      const s = (getRowVal(r, 'Status') || '').toUpperCase();
      const p = (getRowVal(r, 'Priority') || '').toUpperCase();
      const vals = Object.values(r).map((v) => (v || '').trim());
      if (vals.some((v) => v !== '' && v !== '-')) {
        total++;
        if (s.includes('PROGRESS') || s.includes('PROSES')) onProgress++;
        else if (s.includes('CLOSE') || s.includes('SELESAI') || s.includes('DONE')) closed++;
        else if (s.includes('OPEN')) open++;

        if (p.includes('HIGH') || p.includes('URGENT') || p.includes('TINGGI')) highPriority++;
      }
    });

    return { total, onProgress, closed, open, highPriority };
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
    if (!commentText.trim() || !postId || !selectedRow) return;

    const topicTitleVal = selectedTopicTitle || 'Topik';
    const picVal = (getRowVal(selectedRow, 'PIC') || '').trim();
    const activeSection = section || getRowVal(selectedRow, 'Kategori') || 'Prep & Lab';

    try {
      setSubmittingComment(true);
      const res = await fetch(`/api/bulletin/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          content: commentText.trim(),
          topicTitle: topicTitleVal,
          topicId: topicTitleVal.toLowerCase().replace(/\s+/g, '-'),
          section: activeSection,
          category: title || 'Table',
          statusUpdate: statusUpdateChoice || null,
          authorNik: currentAuthorNik || 'System',
          authorName: currentAuthorName || 'Personil',
          picNik: picVal || null,
          pt: pt || 'TBP',
          fileUrl: selectedFile?.url || null,
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
      setSubmittingComment(false);
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

  const handleGalleryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !postId || !selectedRow) return;

    setIsUploadingGallery(true);
    toast.loading('Mengompres dan mengunggah lampiran foto...', { id: 'upload-gallery' });

    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64Raw = ev.target?.result as string;
        let finalBase64 = base64Raw;

        // If image, compress with canvas
        if (file.type.startsWith('image/')) {
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

        // Post as an attachment comment for this topic
        const topicTitleVal = selectedTopicTitle || 'Topik';
        const activeSection = section || getRowVal(selectedRow, 'Kategori') || 'Prep & Lab';

        const cRes = await fetch(`/api/bulletin/${postId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            postId,
            content: `📎 Lampiran Foto / Dokumen: ${file.name}`,
            fileUrl: uploadedUrl,
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
          toast.success('Foto / lampiran berhasil ditambahkan ke galeri!');
          await fetchComments();
        } else {
          toast.error('Gagal menambahkan lampiran ke topik.');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.dismiss('upload-gallery');
      toast.error('Gagal mengunggah foto / file');
    } finally {
      setIsUploadingGallery(false);
      if (e.target) e.target.value = '';
    }
  };

  // Helper for Status Badge styling
  const renderStatusBadge = (statusStr: string) => {
    const s = (statusStr || '').toUpperCase().trim();
    if (!s || s === '-') return <span className="text-slate-500 font-mono text-xs">-</span>;

    if (s.includes('PROGRESS') || s.includes('PROSES')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-950/70 text-blue-300 border border-blue-600/50 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          ON PROGRESS
        </span>
      );
    }
    if (s.includes('CLOSE') || s.includes('SELESAI') || s.includes('DONE')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-600/50 shadow-xs">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          CLOSE
        </span>
      );
    }
    if (s.includes('OPEN') || s.includes('BARU')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-950/70 text-amber-300 border border-amber-600/50 shadow-xs">
          <Clock className="w-3 h-3 text-amber-400" />
          OPEN
        </span>
      );
    }
    if (s.includes('PENDING') || s.includes('HOLD') || s.includes('DELAY')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-950/70 text-rose-300 border border-rose-600/50 shadow-xs">
          <AlertCircle className="w-3 h-3 text-rose-400" />
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
    const cleanText = text.trim();
    if (cleanText.includes('•')) {
      const items = cleanText
        .split('•')
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      return (
        <ul className="space-y-1 my-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-xs leading-relaxed" style={{ color: 'var(--text-main, #cbd5e1)' }}>
              <span className="text-teal-400 font-bold leading-none mt-1">•</span>
              <span className="flex-1">{item}</span>
            </li>
          ))}
        </ul>
      );
    }
    return <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: 'var(--text-main, #cbd5e1)' }}>{text}</p>;
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
            { key: 'ACTIVE', label: 'Sedang Aktif', count: stats.total - stats.closed },
            { key: 'ON PROGRESS', label: 'On Progress', count: stats.onProgress },
            { key: 'OPEN', label: 'Open', count: stats.open },
            { key: 'CLOSE', label: 'Closed / Selesai', count: stats.closed },
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
                  const colLower = colHeader.toLowerCase();

                  // Column width classes based on fitPageMode
                  let widthClass = 'whitespace-nowrap px-3 py-2.5';
                  if (fitPageMode) {
                    if (isNum) widthClass = 'w-[4%] text-center px-1 py-2';
                    else if (colLower.includes('jenis kegiatan') || colLower === 'task' || colLower === 'judul') widthClass = 'w-[18%] px-2.5 py-2';
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
                    else if (colLower.includes('jenis kegiatan')) widthClass = 'min-w-[240px] px-3.5 py-3 whitespace-nowrap';
                    else if (colLower.includes('keterangan')) widthClass = 'min-w-[280px] px-3.5 py-3';
                    else widthClass = 'px-3.5 py-3 whitespace-nowrap';
                  }

                  return (
                    <th
                      key={colHeader}
                      onClick={() => handleSort(colHeader)}
                      className={`font-bold hover:opacity-80 cursor-pointer transition-opacity ${widthClass}`}
                    >
                      <div className={`flex items-center gap-1 ${isNum ? 'justify-center' : ''}`}>
                        <span className="truncate">{colHeader}</span>
                        {isSorted && (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400 shrink-0" /> : <ArrowDown className="w-3 h-3 text-teal-400 shrink-0" />
                        )}
                      </div>
                    </th>
                  );
                })}
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
                  <td colSpan={displayHeaders.length + 1} className="py-12 text-center italic text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>
                    Tidak ada data yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const topicTitle = getRowVal(row, 'Jenis kegiatan') || `Baris ${idx + 1}`;
                  const topicKey = topicTitle.toLowerCase().trim();
                  const cCount = topicCommentCounts[topicKey] || 0;

                  return (
                    <tr
                      key={idx}
                      onClick={() => {
                        setSelectedRow(row);
                        setModalTab('details');
                      }}
                      className="hover:opacity-90 transition-all cursor-pointer group"
                      style={{ borderBottomColor: 'var(--border-main, #334155)' }}
                    >
                      {displayHeaders.map((colName) => {
                        const val = getRowVal(row, colName);
                        const colLower = colName.toLowerCase();

                        // 1. Number Column
                        if (colLower === 'number' || colLower === 'no') {
                          return (
                            <td key={colName} className={`text-center font-mono ${
                              fitPageMode ? 'px-1 py-2 text-[10px]' : 'px-3.5 py-3 text-[11px]'
                            }`} style={{ color: 'var(--text-muted, #64748b)' }}>
                              {val || idx + 1}
                            </td>
                          );
                        }

                        // 2. Jenis kegiatan Column
                        if (colLower.includes('jenis kegiatan') || colLower === 'task' || colLower === 'judul') {
                          return (
                            <td key={colName} className={`font-semibold group-hover:text-teal-400 transition-colors ${
                              fitPageMode ? 'px-2 py-2 overflow-hidden' : 'px-4 py-3'
                            }`} style={{ color: 'var(--text-main, #f8fafc)' }}>
                              <div className="flex items-center gap-1.5">
                                <span className={`leading-snug block ${fitPageMode ? 'line-clamp-2 break-words text-[11px]' : ''}`}>
                                  {val && val !== '-' ? val : <em style={{ color: 'var(--text-muted, #64748b)' }}>Tanpa Judul</em>}
                                </span>
                                {cCount > 0 && (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full bg-teal-950/80 border border-teal-700/60 text-teal-300 text-[9px] font-bold shadow-xs shrink-0">
                                    <MessageSquare className="w-2 h-2" />
                                    {cCount}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        }

                        // 3. Keterangan Column
                        if (colLower.includes('keterangan') || colLower.includes('catatan') || colLower.includes('deskripsi')) {
                          return (
                            <td key={colName} className={`${
                              fitPageMode ? 'px-2 py-2 overflow-hidden' : 'px-4 py-3 max-w-md'
                            }`}>
                              <div className={fitPageMode ? 'line-clamp-2 break-words text-[10.5px]' : ''}>
                                {renderFormattedNotes(val)}
                              </div>
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

                        // 5. Priority Column
                        if (colLower.includes('priority') || colLower.includes('prioritas')) {
                          return (
                            <td key={colName} className={`${fitPageMode ? 'px-1 py-2 overflow-hidden' : 'px-3.5 py-3 whitespace-nowrap'}`}>
                              {renderPriorityBadge(val)}
                            </td>
                          );
                        }

                        // 6. Status Column
                        if (colLower.includes('status')) {
                          return (
                            <td key={colName} className={`${fitPageMode ? 'px-1 py-2 overflow-hidden' : 'px-4 py-3 whitespace-nowrap'}`}>
                              {renderStatusBadge(val)}
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

                        // 9. Activity (routine/non routine) Column
                        if (colLower.includes('activity') || colLower.includes('aktivitas')) {
                          return (
                            <td key={colName} className={`${fitPageMode ? 'px-1 py-2 truncate' : 'px-3.5 py-3 whitespace-nowrap'}`}>
                              {val && val !== '-' ? (
                                <span 
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border truncate"
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

                        // 10. Period Column
                        if (colLower.includes('period') || colLower.includes('periode')) {
                          return (
                            <td key={colName} className={`font-mono ${
                              fitPageMode ? 'px-1 py-2 text-[10px] truncate' : 'px-3.5 py-3 whitespace-nowrap text-[11px]'
                            }`} style={{ color: 'var(--text-main, #cbd5e1)' }}>
                              {val && val !== '-' ? (
                                <span 
                                  className="px-1.5 py-0.5 rounded border truncate"
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BOARD VIEW (Kanban by Status)                                          */}
      {/* ========================================================================= */}
      {viewMode === 'board' && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4" style={{ backgroundColor: 'var(--bg-main, #141414)' }}>
          {['Open', 'On Progress', 'Close'].map((laneStatus) => {
            const laneRows = filteredRows.filter((r) => {
              const s = (getRowVal(r, 'Status') || '').toUpperCase();
              if (laneStatus === 'Open') return s.includes('OPEN') || s.includes('BARU') || !s;
              if (laneStatus === 'On Progress') return s.includes('PROGRESS') || s.includes('PROSES') || s.includes('PENDING');
              if (laneStatus === 'Close') return s.includes('CLOSE') || s.includes('SELESAI') || s.includes('DONE');
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
                      laneStatus === 'Open' ? 'bg-amber-400' : laneStatus === 'On Progress' ? 'bg-blue-400' : 'bg-emerald-400'
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

              {/* Keterangan */}
              <div>
                <label className="block font-bold uppercase tracking-wider mb-1 text-[10px]" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                  Keterangan & Rincian
                </label>
                <textarea
                  rows={3}
                  value={rowFormData['Keterangan'] || ''}
                  onChange={(e) => setRowFormData({ ...rowFormData, Keterangan: e.target.value })}
                  className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none leading-relaxed"
                  style={{
                    backgroundColor: 'var(--input-bg, #141414)',
                    borderColor: 'var(--border-main, #334155)',
                    color: 'var(--text-main, #f1f5f9)'
                  }}
                  placeholder="Deskripsi langkah, catatan temuan, atau hasil pekerjaan..."
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
                    <option value="Pending">Pending</option>
                    <option value="Close">Close</option>
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
                    value={rowFormData['Activity (routine/non routine)'] || 'Routine'}
                    onChange={(e) => setRowFormData({ ...rowFormData, 'Activity (routine/non routine)': e.target.value })}
                    className="w-full p-2.5 rounded-xl border focus:border-teal-500 outline-none cursor-pointer text-xs"
                    style={{
                      backgroundColor: 'var(--input-bg, #141414)',
                      borderColor: 'var(--border-main, #334155)',
                      color: 'var(--text-main, #f1f5f9)'
                    }}
                  >
                    <option value="Routine">Routine</option>
                    <option value="Non-routine">Non-routine</option>
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
                      <h3 className="font-black text-base sm:text-xl truncate" style={{ color: 'var(--text-main, #f1f5f9)' }}>
                        {selectedTopicTitle || 'Detail Kegiatan'}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-teal-400 font-mono font-semibold">
                          {getRowVal(selectedRow, 'Kategori') || 'Laboratorium'}
                        </span>
                        <span style={{ color: 'var(--text-muted, #64748b)' }}>•</span>
                        <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                          Periode: {getRowVal(selectedRow, 'period') || 'Periodik'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
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
                          {renderStatusBadge(getRowVal(selectedRow, 'Status'))}
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
                        </div>
                      </div>

                      {/* Rincian & Keterangan Card */}
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
                        </div>

                        <div className="leading-relaxed text-xs sm:text-sm font-sans pt-1" style={{ color: 'var(--text-main, #e2e8f0)' }}>
                          {renderFormattedNotes(getRowVal(selectedRow, 'Keterangan'))}
                        </div>
                      </div>

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
                            onChange={handleGalleryFileUpload}
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
                              return (
                                <div 
                                  key={item.comment.id || idx}
                                  onClick={() => handlePreviewAttachment(item.attachment)}
                                  className="group relative rounded-xl overflow-hidden aspect-video border hover:border-teal-500/60 cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
                                  style={{
                                    backgroundColor: 'var(--input-bg, #121212)',
                                    borderColor: 'var(--border-main, #334155)'
                                  }}
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
                                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-teal-950/30">
                                      <FileText className="w-6 h-6 text-teal-400 mb-1" />
                                      <span className="text-[10px] text-teal-300 font-semibold truncate w-full px-1">{item.attachment.name}</span>
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                    <span className="text-[10px] font-bold text-white truncate">{item.attachment.name}</span>
                                    <span className="text-[9px] text-teal-300 font-mono">{item.authorName}</span>
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
                    {/* RIGHT COLUMN: DISKUSI PROGRESS & REALTIME TIMELINE                */}
                    {/* ================================================================= */}
                    <div className="lg:col-span-7 xl:col-span-7 space-y-4">
                      
                      {/* Header Discussion */}
                      <div className="flex items-center justify-between px-1">
                        <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          <span>Diskusi & Riwayat Progres ({activeTopicComments.length})</span>
                        </h4>
                        <span 
                          className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                          style={{
                            backgroundColor: 'var(--input-bg, #141414)',
                            borderColor: 'var(--border-main, #334155)',
                            color: 'var(--text-muted, #94a3b8)'
                          }}
                        >
                          ⚡ Realtime Feed
                        </span>
                      </div>

                      {/* New Comment & Status Update Form */}
                      <form 
                        onSubmit={handlePostComment} 
                        className="p-4 border rounded-2xl space-y-3 shadow-md"
                        style={{
                          backgroundColor: 'var(--card-bg, #171717)',
                          borderColor: 'var(--border-main, #334155)'
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-main, #f1f5f9)' }}>
                            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                            <span>{replyingTo ? `Balas Catatan: ${replyingTo.authorName}` : 'Kirim Update Progres / Catatan Baru'}</span>
                          </span>
                        </div>

                        {/* Replying banner */}
                        {replyingTo && (
                          <div 
                            className="flex items-center justify-between p-2.5 px-3 rounded-xl border text-xs animate-in fade-in duration-150 shadow-xs"
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

                        <textarea
                          id="notion-comment-textarea"
                          rows={3}
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder={
                            replyingTo 
                              ? `Tulis tanggapan untuk ${replyingTo.authorName}...` 
                              : `Tuliskan update progres, temuan kendala, atau hasil tindakan untuk "${selectedTopicTitle}"...`
                          }
                          className="w-full p-3 rounded-xl border focus:border-teal-500 outline-none leading-relaxed text-xs"
                          style={{
                            backgroundColor: 'var(--input-bg, #202020)',
                            borderColor: 'var(--border-main, #334155)',
                            color: 'var(--text-main, #f1f5f9)'
                          }}
                        />

                        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted, #94a3b8)' }}>Ubah Status:</span>
                            <select
                              value={statusUpdateChoice}
                              onChange={(e) => setStatusUpdateChoice(e.target.value)}
                              className="p-1.5 px-2.5 rounded-lg border text-xs outline-none cursor-pointer"
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
                            disabled={submittingComment || !commentText.trim()}
                            className="!w-auto text-xs px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg cursor-pointer"
                          >
                            {submittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : replyingTo ? <Reply className="w-3.5 h-3.5 mr-1.5 rotate-180" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                            <span>{replyingTo ? 'Kirim Balasan' : 'Kirim Update'}</span>
                          </Button>
                        </div>
                      </form>

                      {/* Activity / Comments Timeline Stream */}
                      <div className="space-y-3 pt-1">
                        {commentsLoading ? (
                          <div className="text-center py-8" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-400" />
                            <p className="text-xs">Memuat riwayat diskusi...</p>
                          </div>
                        ) : rootComments.length === 0 ? (
                          <div 
                            className="text-center py-8 px-4 rounded-2xl border border-dashed"
                            style={{
                              backgroundColor: 'var(--card-bg, #151515)',
                              borderColor: 'var(--border-main, #334155)',
                              color: 'var(--text-muted, #94a3b8)'
                            }}
                          >
                            <MessageSquare className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-teal-400" />
                            <p className="text-xs italic">Belum ada update progres atau catatan diskusi pada kegiatan ini.</p>
                          </div>
                        ) : (
                          rootComments.map((root) => {
                            const rootAtts = parseCommentAttachments(root.fileUrl, root.fileName, root.content);
                            const threadReplies = repliesMap[root.id] || [];

                            return (
                              <div 
                                key={root.id} 
                                className="p-3.5 sm:p-4 border rounded-2xl space-y-2.5 shadow-sm transition-all"
                                style={{
                                  backgroundColor: 'var(--card-bg, #171717)',
                                  borderColor: 'var(--border-main, #334155)'
                                }}
                              >
                                {/* Header Komentar Utama */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2.5">
                                    <span className="w-7 h-7 rounded-full bg-teal-900/90 border border-teal-700/60 text-teal-300 text-xs font-bold flex items-center justify-center shrink-0">
                                      {(root.authorName || 'U').charAt(0).toUpperCase()}
                                    </span>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-xs block leading-tight" style={{ color: 'var(--text-main, #f1f5f9)' }}>
                                          {root.authorName || 'Personil'}
                                        </span>
                                        {threadReplies.length > 0 && (
                                          <span className="text-[9px] px-1.5 py-0.2 rounded-full font-mono bg-teal-950/80 text-teal-300 border border-teal-600/40 font-semibold">
                                            {threadReplies.length} balasan
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                                        {new Date(root.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleStartReply(root)}
                                      className="px-2 py-0.5 rounded-lg hover:bg-teal-500/20 text-teal-400 hover:text-teal-300 font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer border border-teal-500/30"
                                      title="Balas komentar utama ini"
                                    >
                                      <Reply className="w-3 h-3 rotate-180" />
                                      <span>Balas</span>
                                    </button>
                                    {root.authorNik === currentAuthorNik && (
                                      <button
                                        onClick={() => handleDeleteComment(root.id)}
                                        className="p-1.5 rounded-lg hover:opacity-80 hover:text-rose-400 transition-colors cursor-pointer"
                                        style={{ color: 'var(--text-muted, #94a3b8)' }}
                                        title="Hapus Catatan Ini"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Isi Komentar Utama */}
                                <p className="text-xs whitespace-pre-line leading-relaxed pl-9" style={{ color: 'var(--text-main, #cbd5e1)' }}>
                                  {root.content}
                                </p>

                                {/* Media preview if root comment has file_url */}
                                {rootAtts.length > 0 && (
                                  <div className="pl-9 pt-1 space-y-2">
                                    {rootAtts.map((att, aIdx) => (
                                      <AttachmentThumbnail 
                                        key={att.id || aIdx} 
                                        attachment={att} 
                                        onPreview={handlePreviewAttachment} 
                                      />
                                    ))}
                                  </div>
                                )}

                                {/* THREADED REPLIES CONTAINER (BERSARANG DI DALAM KOMENTAR UTAMA) */}
                                {threadReplies.length > 0 && (
                                  <div className="mt-3 ml-2 sm:ml-6 pl-3 sm:pl-4 border-l-2 border-teal-500/40 space-y-2.5 pt-1">
                                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal-400 mb-1">
                                      <CornerDownRight className="w-3.5 h-3.5" />
                                      <span>Balasan Diskusi ({threadReplies.length})</span>
                                    </div>

                                    {threadReplies.map((reply: any) => {
                                      const replyAtts = parseCommentAttachments(reply.fileUrl, reply.fileName, reply.content);
                                      return (
                                        <div
                                          key={reply.id}
                                          className="p-3 rounded-xl border space-y-1.5 shadow-xs transition-all"
                                          style={{
                                            backgroundColor: 'var(--input-bg, #141414)',
                                            borderColor: 'var(--border-main, #334155)'
                                          }}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className="w-5 h-5 rounded-full bg-teal-900/90 border border-teal-600/50 text-teal-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                {(reply.authorName || 'U').charAt(0).toUpperCase()}
                                              </span>
                                              <div>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                  <span className="font-bold text-[11px]" style={{ color: 'var(--text-main, #f1f5f9)' }}>
                                                    {reply.authorName || 'Personil'}
                                                  </span>
                                                  {reply.replyToName && (
                                                    <span className="text-[10px] text-teal-400 font-medium">
                                                      membalas <span className="font-semibold">@{reply.replyToName}</span>
                                                    </span>
                                                  )}
                                                </div>
                                                <span className="text-[9px] font-mono block" style={{ color: 'var(--text-muted, #94a3b8)' }}>
                                                  {new Date(reply.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                              <button
                                                type="button"
                                                onClick={() => handleStartReply(reply)}
                                                className="px-2 py-0.5 rounded-md hover:bg-teal-500/20 text-teal-400 font-semibold text-[10px] flex items-center gap-1 transition-colors cursor-pointer border border-teal-500/30"
                                                title={`Balas tanggapan ${reply.authorName}`}
                                              >
                                                <Reply className="w-2.5 h-2.5 rotate-180" />
                                                <span>Balas</span>
                                              </button>
                                              {reply.authorNik === currentAuthorNik && (
                                                <button
                                                  onClick={() => handleDeleteComment(reply.id)}
                                                  className="p-1 rounded-md hover:opacity-80 hover:text-rose-400 transition-colors cursor-pointer"
                                                  style={{ color: 'var(--text-muted, #94a3b8)' }}
                                                  title="Hapus Tanggapan Ini"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              )}
                                            </div>
                                          </div>

                                          <p className="text-xs whitespace-pre-line leading-relaxed pl-7" style={{ color: 'var(--text-main, #cbd5e1)' }}>
                                            {reply.content}
                                          </p>

                                          {replyAtts.length > 0 && (
                                            <div className="pl-7 pt-1 space-y-1.5">
                                              {replyAtts.map((att, aIdx) => (
                                                <AttachmentThumbnail
                                                  key={att.id || aIdx}
                                                  attachment={att}
                                                  onPreview={handlePreviewAttachment}
                                                />
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>

                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
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
    </div>
  );
}
