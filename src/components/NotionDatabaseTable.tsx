import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
  FileCheck
} from 'lucide-react';
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

const extractDriveId = (item: any): string | null => {
  if (item?.id && typeof item.id === 'string' && item.id.length >= 10) return item.id;
  const str = item?.directUrl || item?.driveViewUrl || item?.driveDownloadUrl || (typeof item === 'string' ? item : '');
  const match = str.match(/\/d\/([a-zA-Z0-9_-]+)/) || str.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

export const parseCommentAttachments = (fileUrl?: string | null, fileName?: string | null): CommentAttachmentItem[] => {
  if (!fileUrl) return [];
  try {
    const trimmed = fileUrl.trim();
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => {
          const name = item.name || fileName || 'Attachment';
          const driveId = extractDriveId(item);
          const isImg = 
            item.category === 'image' || 
            (item.mimeType && item.mimeType.startsWith('image/')) ||
            /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name) ||
            (item.directUrl && (item.directUrl.includes('lh3.googleusercontent.com') || item.directUrl.startsWith('data:image/')));
          
          const directUrl = driveId ? `/api/drive/view/${driveId}` : (item.directUrl || item.url || '');
          const driveDownloadUrl = driveId ? `/api/drive/download/${driveId}` : (item.driveDownloadUrl || item.url || '');
          const driveViewUrl = driveId ? `https://drive.google.com/file/d/${driveId}/view?usp=sharing` : (item.driveViewUrl || item.url || '');

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
  } catch (e) {
    // fallback
  }

  const name = fileName || 'Attachment';
  const driveId = extractDriveId(fileUrl);
  const isImg = 
    fileUrl.startsWith('data:image/') || 
    fileUrl.includes('lh3.googleusercontent.com') ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(name) ||
    /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileUrl);

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
};

export interface TableRowData {
  [key: string]: string;
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
  onAddRow?: (newRow: TableRowData) => void;
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
  onAddRow
}: NotionDatabaseTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'board' | 'list'>('table');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRow, setSelectedRow] = useState<TableRowData | null>(null);
  const [modalTab, setModalTab] = useState<'details' | 'comments'>('details');

  // Comments / Updates State
  const [allComments, setAllComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [statusUpdateChoice, setStatusUpdateChoice] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{ name: string; url: string } | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; driveViewUrl?: string; driveDownloadUrl?: string } | null>(null);

  // Normalize column names to find common properties
  const validHeaders = useMemo(() => {
    return headers.map((h) => h.trim()).filter((h) => h.length > 0 && h !== '-');
  }, [headers]);

  const colKeys = useMemo(() => {
    return validHeaders.map((h) => ({
      raw: h,
      clean: h.trim(),
      lower: h.trim().toLowerCase()
    }));
  }, [validHeaders]);

  // Primary Title column (Topic / Task Name / Subject)
  // MUST prioritize 'Jenis Kegiatan', 'Nama', 'Task', 'Judul', 'Title', 'Rencana Tindakan'
  // NEVER use 'Aktivitas' if other meaningful title columns exist!
  const titleCol = useMemo(() => {
    const priorityChecks = [
      (c: { lower: string }) => c.lower === 'jenis kegiatan' || c.lower.includes('jenis kegiatan'),
      (c: { lower: string }) => c.lower === 'nama' || c.lower === 'name' || c.lower === 'item name' || c.lower.includes('nama barang'),
      (c: { lower: string }) => c.lower === 'rencana tindakan' || c.lower.includes('tindakan'),
      (c: { lower: string }) => c.lower === 'task' || c.lower.includes('task') || c.lower === 'judul' || c.lower === 'title',
      (c: { lower: string }) => c.lower.includes('kegiatan') && !c.lower.includes('jenis'),
      (c: { lower: string }) => c.lower === 'description' || c.lower === 'deskripsi' || c.lower === 'content',
      (c: { lower: string }) => c.lower.includes('topic') || c.lower.includes('subjek') || c.lower.includes('subject'),
      (c: { lower: string }) => c.lower === 'aktivitas' || c.lower.includes('aktivitas')
    ];

    for (const check of priorityChecks) {
      const match = colKeys.find(check);
      if (match) return match.raw;
    }

    return validHeaders.length > 0 ? validHeaders[validHeaders.length - 1] : '';
  }, [colKeys, validHeaders]);

  // Distinct Activity column (e.g. Routine / Non Routine)
  const activityCol = useMemo(() => {
    const match = colKeys.find((c) => c.lower === 'aktivitas' || c.lower.includes('aktivitas'));
    return match && match.raw !== titleCol ? match.raw : '';
  }, [colKeys, titleCol]);

  const statusCol = useMemo(() => colKeys.find((c) => c.lower.includes('status') && c.raw !== titleCol)?.raw || '', [colKeys, titleCol]);
  const priorityCol = useMemo(() => colKeys.find((c) => (c.lower.includes('prioritas') || c.lower.includes('priority')) && c.raw !== titleCol)?.raw || '', [colKeys, titleCol]);
  const picCol = useMemo(() => colKeys.find((c) => (c.lower.includes('pic') || c.lower.includes('assignee') || c.lower.includes('pj') || c.lower === 'personil') && c.raw !== titleCol)?.raw || '', [colKeys, titleCol]);
  const categoryCol = useMemo(() => colKeys.find((c) => (c.lower.includes('kategori') || c.lower.includes('category') || c.lower === 'group' || c.lower === 'dept' || c.lower === 'divisi') && c.raw !== titleCol)?.raw || '', [colKeys, titleCol]);
  const descCol = useMemo(() => colKeys.find((c) => (c.lower.includes('keterangan') || c.lower.includes('catatan') || c.lower.includes('remark') || c.lower.includes('updates')) && c.raw !== titleCol)?.raw || '', [colKeys, titleCol]);
  const targetDateCol = useMemo(() => colKeys.find((c) => (c.lower.includes('target') || c.lower.includes('due date') || c.lower.includes('deadline')) && c.raw !== titleCol)?.raw || '', [colKeys, titleCol]);
  const actualDateCol = useMemo(() => colKeys.find((c) => (c.lower.includes('aktual') || (c.lower.includes('selesai') && !c.lower.includes('target'))) && c.raw !== titleCol)?.raw || '', [colKeys, titleCol]);

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

  // Active topic comments for modal
  const selectedTopicTitle = useMemo(() => {
    if (!selectedRow || !titleCol) return '';
    return (selectedRow[titleCol] || '').trim();
  }, [selectedRow, titleCol]);

  const activeTopicComments = useMemo(() => {
    if (!selectedTopicTitle) return [];
    const q = selectedTopicTitle.toLowerCase().trim();
    return allComments.filter((c) => (c.topicTitle || '').toLowerCase().trim() === q);
  }, [allComments, selectedTopicTitle]);

  // Auto-open topic from URL search param if present
  useEffect(() => {
    if (rows.length === 0 || !titleCol) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTopic = params.get('topic');
      if (urlTopic) {
        const q = urlTopic.toLowerCase().trim();
        const match = rows.find((r) => (r[titleCol] || '').toLowerCase().trim() === q);
        if (match) {
          setSelectedRow(match);
          setModalTab('comments');
        }
      }
    } catch (e) {}
  }, [rows, titleCol]);

  // Filter and sort rows
  const filteredRows = useMemo(() => {
    let result = [...rows];

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
    if (statusFilter !== 'ALL' && statusCol) {
      result = result.filter((row) => {
        const val = (row[statusCol] || '').toUpperCase().trim();
        if (statusFilter === 'ACTIVE') return !val.includes('CLOSE') && !val.includes('SELESAI') && !val.includes('DONE');
        if (statusFilter === 'ON PROGRESS') return val.includes('PROGRESS') || val.includes('PROSES');
        if (statusFilter === 'CLOSE') return val.includes('CLOSE') || val.includes('SELESAI') || val.includes('DONE');
        if (statusFilter === 'OPEN') return val.includes('OPEN') || val.includes('BARU');
        if (statusFilter === 'PENDING') return val.includes('PENDING') || val.includes('HOLD') || val.includes('DELAY');
        return val === statusFilter;
      });
    }

    // 3. Priority Filter
    if (priorityFilter !== 'ALL' && priorityCol) {
      result = result.filter((row) => {
        const val = (row[priorityCol] || '').toUpperCase().trim();
        return val.includes(priorityFilter);
      });
    }

    // 4. Sort
    if (sortColumn) {
      result.sort((a, b) => {
        const valA = (a[sortColumn] || '').toLowerCase();
        const valB = (b[sortColumn] || '').toLowerCase();
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [rows, searchQuery, statusFilter, priorityFilter, sortColumn, sortDirection, statusCol, priorityCol]);

  // Statistics calculation
  const stats = useMemo(() => {
    let total = 0;
    let onProgress = 0;
    let closed = 0;
    let open = 0;
    let highPriority = 0;

    rows.forEach((r) => {
      const s = (statusCol ? r[statusCol] || '' : '').toUpperCase();
      const p = (priorityCol ? r[priorityCol] || '' : '').toUpperCase();
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
  }, [rows, statusCol, priorityCol]);

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
    const picVal = (picCol && selectedRow[picCol] ? selectedRow[picCol] : '').trim();
    const activeSection = section || selectedRow[categoryCol] || 'Prep & Lab';

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
          fileName: selectedFile?.name || null
        })
      });

      const json = await res.json();
      if (json.status === 'success') {
        toast.success(`Update terkirim! Notifikasi diteruskan ke personil ${activeSection}.`);
        setCommentText('');
        setStatusUpdateChoice('');
        setSelectedFile(null);
        // Locally update status if changed
        if (statusUpdateChoice && statusCol) {
          selectedRow[statusCol] = statusUpdateChoice;
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
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
        {statusStr}
      </span>
    );
  };

  // Helper for Priority Badge
  const renderPriorityBadge = (pStr: string) => {
    const p = (pStr || '').toUpperCase().trim();
    if (!p || p === '-') return <span className="text-slate-600 font-mono text-xs">-</span>;

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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          LOW
        </span>
      );
    }
    return <span className="text-xs text-slate-300">{pStr}</span>;
  };

  // Helper for PIC Avatar Badge
  const renderPicBadge = (picStr: string) => {
    if (!picStr || picStr === '-') return <span className="text-slate-600 font-mono text-xs">-</span>;
    const initial = picStr.charAt(0).toUpperCase();
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-800/90 border border-slate-700 text-slate-200 text-xs font-medium">
        <span className="w-4 h-4 rounded-full bg-teal-800 text-teal-200 text-[10px] font-bold flex items-center justify-center">
          {initial}
        </span>
        <span className="truncate max-w-[100px]">{picStr}</span>
      </div>
    );
  };

  // Helper to format multiline bullet notes
  const renderFormattedNotes = (text: string) => {
    if (!text || text === '-' || text === '•') return <span className="text-slate-600 font-mono text-xs">-</span>;
    const cleanText = text.trim();
    if (cleanText.includes('•')) {
      const items = cleanText
        .split('•')
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      return (
        <ul className="space-y-1 my-1">
          {items.map((item, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-xs text-slate-300 leading-relaxed">
              <span className="text-teal-400 font-bold leading-none mt-1">•</span>
              <span className="flex-1">{item}</span>
            </li>
          ))}
        </ul>
      );
    }
    return <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">{text}</p>;
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (filteredRows.length === 0) {
      toast.error('Tidak ada data untuk diekspor');
      return;
    }
    const csvHeaders = validHeaders.join(',');
    const csvRows = filteredRows.map((row) => {
      return validHeaders
        .map((h) => {
          const val = (row[h] || '').replace(/"/g, '""');
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
    <div className="w-full bg-[#181818] border border-slate-800 rounded-2xl shadow-xl overflow-hidden my-4 text-slate-200">
      {/* Top Header Bar */}
      <div className="p-4 bg-[#202020] border-b border-[#2d2d2d] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-teal-950/60 border border-teal-700/50 text-teal-400 shadow-sm">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm md:text-base flex items-center gap-2">
              <span>{title || 'Database Table'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                {filteredRows.length} items
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Interactive Notion Database Table dengan dukungan komentar per-topik & notifikasi tim.
            </p>
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#151515] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table' ? 'bg-[#282828] text-teal-300 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'board' ? 'bg-[#282828] text-teal-300 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Kanban Board View"
            >
              <Kanban className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'list' ? 'bg-[#282828] text-teal-300 shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="List / Card View"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="p-1.5 px-2.5 rounded-lg bg-[#282828] hover:bg-[#333] border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-3 bg-[#1e1e1e] border-b border-[#2d2d2d] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[#161616] rounded-xl border border-slate-700/80 text-slate-300 w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            placeholder="Cari kegiatan, PIC, keterangan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-slate-200 placeholder:text-slate-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-300">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {statusCol && (
            <>
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
                  className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all flex-shrink-0 flex items-center gap-1.5 ${
                    statusFilter === st.key
                      ? 'bg-teal-600/30 text-teal-300 border border-teal-500/60 shadow-xs'
                      : 'bg-[#262626] text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  <span>{st.label}</span>
                  {st.count !== undefined && st.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      statusFilter === st.key ? 'bg-teal-500/20 text-teal-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {st.count}
                    </span>
                  )}
                </button>
              ))}
            </>
          )}

          {priorityCol && (
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[#262626] border border-slate-700/60 text-slate-300 text-[11px] font-semibold outline-none cursor-pointer"
            >
              <option value="ALL">Semua Prioritas</option>
              <option value="HIGH">🔴 High Priority</option>
              <option value="NORMAL">🟡 Normal Priority</option>
              <option value="LOW">🔵 Low Priority</option>
            </select>
          )}
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'table' && (
        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse min-w-[900px]">
            {/* Table Headers */}
            <thead className="bg-[#242424] text-slate-300 font-bold border-b border-slate-800 sticky top-0 z-10 select-none">
              <tr>
                <th className="w-12 px-3.5 py-3 text-center text-slate-500 font-mono">#</th>
                
                {/* Primary Title Column (Jenis Kegiatan / Task Topic) */}
                {titleCol && (
                  <th
                    onClick={() => handleSort(titleCol)}
                    className="px-4 py-3 font-bold text-slate-100 hover:bg-[#2c2c2c] cursor-pointer transition-colors min-w-[260px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-teal-400" />
                      <span>{titleCol}</span>
                      {sortColumn === titleCol ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30" />
                      )}
                    </div>
                  </th>
                )}

                {/* Status Column */}
                {statusCol && (
                  <th
                    onClick={() => handleSort(statusCol)}
                    className="px-4 py-3 font-bold text-slate-200 hover:bg-[#2c2c2c] cursor-pointer transition-colors w-36"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Status</span>
                      {sortColumn === statusCol && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />
                      )}
                    </div>
                  </th>
                )}

                {/* Priority Column */}
                {priorityCol && (
                  <th
                    onClick={() => handleSort(priorityCol)}
                    className="px-3.5 py-3 font-bold text-slate-200 hover:bg-[#2c2c2c] cursor-pointer transition-colors w-28"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Prioritas</span>
                      {sortColumn === priorityCol && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />
                      )}
                    </div>
                  </th>
                )}

                {/* PIC Column */}
                {picCol && (
                  <th className="px-3.5 py-3 font-bold text-slate-200 w-36">
                    PIC
                  </th>
                )}

                {/* Category Column */}
                {categoryCol && (
                  <th className="px-3.5 py-3 font-bold text-slate-200 w-32">
                    Kategori
                  </th>
                )}

                {/* Aktivitas Column (e.g. Routine / Non Routine) */}
                {activityCol && (
                  <th className="px-3.5 py-3 font-bold text-slate-200 w-28">
                    Aktivitas
                  </th>
                )}

                {/* Target Date Column */}
                {targetDateCol && (
                  <th className="px-3.5 py-3 font-bold text-slate-200 w-32">
                    Target Selesai
                  </th>
                )}

                {/* Actual Date Column */}
                {actualDateCol && (
                  <th className="px-3.5 py-3 font-bold text-slate-200 w-32">
                    Aktual Selesai
                  </th>
                )}

                {/* Description Column */}
                {descCol && (
                  <th className="px-4 py-3 font-bold text-slate-200 min-w-[280px]">
                    Keterangan & Rincian
                  </th>
                )}

                {/* Other columns */}
                {validHeaders
                  .filter((h) => 
                    h !== titleCol && 
                    h !== statusCol && 
                    h !== priorityCol && 
                    h !== picCol && 
                    h !== categoryCol && 
                    h !== activityCol && 
                    h !== targetDateCol && 
                    h !== actualDateCol && 
                    h !== descCol
                  )
                  .map((h) => (
                    <th
                      key={h}
                      onClick={() => handleSort(h)}
                      className="px-3.5 py-3 font-bold text-slate-300 hover:bg-[#2c2c2c] cursor-pointer transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{h}</span>
                        {sortColumn === h && (
                          sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-teal-400" /> : <ArrowDown className="w-3 h-3 text-teal-400" />
                        )}
                      </div>
                    </th>
                  ))}

                <th className="w-20 px-3 py-3 text-center text-slate-400">Aksi</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/80 bg-[#1c1c1c]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={validHeaders.length + 2} className="py-12 text-center text-slate-500 italic text-xs">
                    Tidak ada data yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => {
                  const topicKey = (titleCol && row[titleCol] ? row[titleCol] : '').toLowerCase().trim();
                  const cCount = topicCommentCounts[topicKey] || 0;

                  return (
                    <tr
                      key={idx}
                      onClick={() => {
                        setSelectedRow(row);
                        setModalTab('details');
                      }}
                      className="hover:bg-[#262626] transition-colors cursor-pointer group"
                    >
                      {/* Index Number */}
                      <td className="px-3.5 py-3 text-center text-slate-500 font-mono text-[11px]">
                        {idx + 1}
                      </td>

                      {/* Primary Title (Jenis Kegiatan / Task Topic) */}
                      {titleCol && (
                        <td className="px-4 py-3 font-semibold text-slate-100 group-hover:text-teal-300 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="leading-snug block">
                              {row[titleCol] && row[titleCol] !== '-' ? row[titleCol] : <em className="text-slate-500">Tanpa Judul</em>}
                            </span>
                            {cCount > 0 && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-teal-950/80 border border-teal-700/60 text-teal-300 text-[10px] font-bold shadow-xs">
                                <MessageSquare className="w-2.5 h-2.5" />
                                {cCount}
                              </span>
                            )}
                          </div>
                        </td>
                      )}

                      {/* Status */}
                      {statusCol && (
                        <td className="px-4 py-3 whitespace-nowrap">
                          {renderStatusBadge(row[statusCol])}
                        </td>
                      )}

                      {/* Priority */}
                      {priorityCol && (
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {renderPriorityBadge(row[priorityCol])}
                        </td>
                      )}

                      {/* PIC */}
                      {picCol && (
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {renderPicBadge(row[picCol])}
                        </td>
                      )}

                      {/* Category */}
                      {categoryCol && (
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {row[categoryCol] && row[categoryCol] !== '-' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-slate-800 text-slate-300 border border-slate-700">
                              {row[categoryCol]}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-mono">-</span>
                          )}
                        </td>
                      )}

                      {/* Aktivitas (Routine / Non Routine) */}
                      {activityCol && (
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {row[activityCol] && row[activityCol] !== '-' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800/90 text-slate-300 border border-slate-700/80">
                              {row[activityCol]}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-mono">-</span>
                          )}
                        </td>
                      )}

                      {/* Target Date */}
                      {targetDateCol && (
                        <td className="px-3.5 py-3 whitespace-nowrap font-mono text-xs text-slate-300">
                          {row[targetDateCol] && row[targetDateCol] !== '-' ? (
                            <span className="inline-flex items-center gap-1 text-slate-300">
                              <Calendar className="w-3 h-3 text-slate-500" />
                              {row[targetDateCol]}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-mono">-</span>
                          )}
                        </td>
                      )}

                      {/* Actual Date */}
                      {actualDateCol && (
                        <td className="px-3.5 py-3 whitespace-nowrap font-mono text-xs text-slate-300">
                          {row[actualDateCol] && row[actualDateCol] !== '-' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              {row[actualDateCol]}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-mono">-</span>
                          )}
                        </td>
                      )}

                      {/* Notes / Description */}
                      {descCol && (
                        <td className="px-4 py-3 max-w-sm">
                          {renderFormattedNotes(row[descCol])}
                        </td>
                      )}

                      {/* Other Columns */}
                      {validHeaders
                        .filter((h) => 
                          h !== titleCol && 
                          h !== statusCol && 
                          h !== priorityCol && 
                          h !== picCol && 
                          h !== categoryCol && 
                          h !== activityCol && 
                          h !== targetDateCol && 
                          h !== actualDateCol && 
                          h !== descCol
                        )
                        .map((h) => (
                          <td key={h} className="px-3.5 py-3 text-slate-300 text-xs whitespace-nowrap">
                            {row[h] && row[h] !== '-' ? row[h] : <span className="text-slate-600 font-mono">-</span>}
                          </td>
                        ))}

                      {/* Action Button */}
                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRow(row);
                              setModalTab('comments');
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              cCount > 0 
                                ? 'text-teal-300 bg-teal-950/60 hover:bg-teal-900/80 border border-teal-700/50' 
                                : 'text-slate-500 hover:text-teal-300 hover:bg-slate-800'
                            }`}
                            title="Update Progres & Diskusi"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRow(row);
                              setModalTab('details');
                            }}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-teal-300 hover:bg-slate-800 transition-colors"
                            title="Lihat Rincian"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Board / Kanban View */}
      {viewMode === 'board' && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#181818] min-h-[350px]">
          {['ON PROGRESS', 'OPEN', 'CLOSE'].map((stKey) => {
            const groupRows = filteredRows.filter((r) => {
              const s = (statusCol ? r[statusCol] || '' : '').toUpperCase();
              if (stKey === 'ON PROGRESS') return s.includes('PROGRESS') || s.includes('PROSES');
              if (stKey === 'CLOSE') return s.includes('CLOSE') || s.includes('SELESAI') || s.includes('DONE');
              return s.includes('OPEN') || s === '' || s === '-';
            });

            return (
              <div key={stKey} className="bg-[#222] rounded-xl border border-slate-800 p-3 flex flex-col">
                <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800 font-bold text-xs">
                  <div className="flex items-center gap-2">
                    {renderStatusBadge(stKey)}
                  </div>
                  <span className="font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full text-[10px]">
                    {groupRows.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar">
                  {groupRows.map((r, i) => {
                    const topicKey = (titleCol && r[titleCol] ? r[titleCol] : '').toLowerCase().trim();
                    const cCount = topicCommentCounts[topicKey] || 0;

                    return (
                      <div
                        key={i}
                        onClick={() => {
                          setSelectedRow(r);
                          setModalTab('details');
                        }}
                        className="p-3.5 bg-[#282828] hover:bg-[#303030] rounded-xl border border-slate-700/80 cursor-pointer transition-all space-y-2 group shadow-sm"
                      >
                        <div className="font-bold text-slate-100 group-hover:text-teal-300 text-xs line-clamp-2 leading-snug">
                          {titleCol && r[titleCol] && r[titleCol] !== '-' ? r[titleCol] : 'Tanpa Judul'}
                        </div>

                        {/* Sub-tags */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {activityCol && r[activityCol] && r[activityCol] !== '-' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                              {r[activityCol]}
                            </span>
                          )}
                          {categoryCol && r[categoryCol] && r[categoryCol] !== '-' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-950/60 text-teal-400 border border-teal-800/40">
                              {r[categoryCol]}
                            </span>
                          )}
                        </div>

                        {descCol && r[descCol] && r[descCol] !== '-' && (
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {r[descCol]}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-700/60 text-[10px]">
                          {picCol && r[picCol] && r[picCol] !== '-' ? renderPicBadge(r[picCol]) : <span />}
                          <div className="flex items-center gap-2">
                            {cCount > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-teal-400 font-semibold">
                                <MessageSquare className="w-3 h-3" />
                                {cCount}
                              </span>
                            )}
                            {priorityCol && r[priorityCol] && renderPriorityBadge(r[priorityCol])}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List / Card View */}
      {viewMode === 'list' && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#181818]">
          {filteredRows.map((row, idx) => {
            const topicKey = (titleCol && row[titleCol] ? row[titleCol] : '').toLowerCase().trim();
            const cCount = topicCommentCounts[topicKey] || 0;

            return (
              <div
                key={idx}
                onClick={() => {
                  setSelectedRow(row);
                  setModalTab('details');
                }}
                className="p-4 bg-[#232323] hover:bg-[#2a2a2a] rounded-xl border border-slate-800 hover:border-teal-600/60 cursor-pointer transition-all space-y-2.5 shadow-sm group"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-slate-100 group-hover:text-teal-300 text-xs leading-snug">
                    {titleCol && row[titleCol] && row[titleCol] !== '-' ? row[titleCol] : `Item #${idx + 1}`}
                  </h4>
                  {statusCol && renderStatusBadge(row[statusCol])}
                </div>

                {descCol && row[descCol] && row[descCol] !== '-' && (
                  <div className="text-xs text-slate-400 line-clamp-3">
                    {renderFormattedNotes(row[descCol])}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-xs">
                  <div className="flex items-center gap-2">
                    {picCol && row[picCol] && renderPicBadge(row[picCol])}
                    {activityCol && row[activityCol] && row[activityCol] !== '-' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        {row[activityCol]}
                      </span>
                    )}
                    {categoryCol && row[categoryCol] && row[categoryCol] !== '-' && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {row[categoryCol]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {cCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-teal-400 font-semibold">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {cCount} update
                      </span>
                    )}
                    {priorityCol && renderPriorityBadge(row[priorityCol])}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Row Detail & Comments Modal */}
      {selectedRow && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#202020] border border-slate-700 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header Bar with Tabs */}
            <div className="px-5 py-3.5 bg-[#262626] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-teal-950/60 border border-teal-600/40 text-teal-400">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div className="flex items-center bg-[#181818] p-1 rounded-xl border border-slate-700/80">
                  <button
                    onClick={() => setModalTab('details')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      modalTab === 'details' ? 'bg-[#2b2b2b] text-teal-300 shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Rincian Data</span>
                  </button>
                  <button
                    onClick={() => setModalTab('comments')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      modalTab === 'comments' ? 'bg-[#2b2b2b] text-teal-300 shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Diskusi & Progres</span>
                    {activeTopicComments.length > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-teal-600 text-white text-[10px] font-mono">
                        {activeTopicComments.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setSelectedRow(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1 custom-scrollbar">
              {/* Task Title Header */}
              <div className="bg-[#242424] p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
                  Topik / Jenis Kegiatan:
                </span>
                <h2 className="text-base md:text-lg font-black text-slate-100 leading-snug">
                  {selectedTopicTitle || 'Tanpa Judul'}
                </h2>

                {/* Badges Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-700/60">
                  {statusCol && renderStatusBadge(selectedRow[statusCol])}
                  {priorityCol && renderPriorityBadge(selectedRow[priorityCol])}
                  {picCol && renderPicBadge(selectedRow[picCol])}
                  {activityCol && selectedRow[activityCol] && selectedRow[activityCol] !== '-' && (
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedRow[activityCol]}
                    </span>
                  )}
                  {categoryCol && selectedRow[categoryCol] && selectedRow[categoryCol] !== '-' && (
                    <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 font-mono text-xs">
                      📁 {selectedRow[categoryCol]}
                    </span>
                  )}
                </div>
              </div>

              {/* TAB 1: DETAILS */}
              {modalTab === 'details' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Grid of details */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {validHeaders.map((h) => {
                      if (h === titleCol || h === descCol) return null;
                      const val = selectedRow[h];
                      return (
                        <div key={h} className="p-3 rounded-xl bg-[#252525] border border-slate-800 space-y-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            {h}
                          </span>
                          <span className="font-semibold text-slate-200 text-xs block">
                            {val && val !== '-' ? val : <em className="text-slate-600 font-mono">-</em>}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Description / Notes Box */}
                  {descCol && selectedRow[descCol] && selectedRow[descCol] !== '-' && (
                    <div className="space-y-2 pt-2">
                      <span className="text-xs font-bold text-slate-300 block">
                        Keterangan & Catatan Rinci:
                      </span>
                      <div className="p-4 rounded-xl bg-[#252525] border border-slate-800 text-slate-200 leading-relaxed text-xs whitespace-pre-line font-sans shadow-inner">
                        {renderFormattedNotes(selectedRow[descCol])}
                      </div>
                    </div>
                  )}

                  {/* Quick Action to Comment Tab */}
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => setModalTab('comments')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#282828] hover:bg-teal-950/80 hover:border-teal-600/70 border border-slate-700 text-teal-300 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Buka Kolom Diskusi & Update Progres ({activeTopicComments.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: COMMENTS & PROGRESS UPDATES */}
              {modalTab === 'comments' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* System Sync Banner */}
                  <div className="p-3 rounded-xl bg-teal-950/40 border border-teal-700/50 flex items-start gap-2.5 text-xs text-teal-200">
                    <Bell className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Tersinkronisasi dengan Notifikasi Sistem</span>
                      <p className="text-[11px] text-teal-300/80 leading-relaxed">
                        Setiap update progres atau komentar yang diposting di sini akan otomatis mengirimkan notifikasi kepada seluruh personil tim section <strong>{section || selectedRow[categoryCol] || 'terkait'}</strong> dan PIC <strong>{selectedRow[picCol] || 'PIC'}</strong>.
                      </p>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-300 text-xs flex items-center justify-between">
                      <span>Riwayat Update & Diskusi</span>
                      <span className="font-mono text-slate-500 text-[11px]">
                        {activeTopicComments.length} entri
                      </span>
                    </h4>

                    {commentsLoading ? (
                      <div className="p-8 text-center text-slate-500 space-y-2">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto text-teal-400" />
                        <span className="text-xs">Memuat riwayat update...</span>
                      </div>
                    ) : activeTopicComments.length === 0 ? (
                      <div className="p-8 bg-[#252525] rounded-xl border border-slate-800 text-center text-slate-400 space-y-1">
                        <MessageSquare className="w-6 h-6 mx-auto text-slate-600 mb-2" />
                        <span className="font-semibold block text-slate-300">Belum ada update atau komentar</span>
                        <p className="text-[11px] text-slate-500">
                          Jadilah yang pertama memberikan update progres, kendala, atau tanggapan untuk topik ini.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {activeTopicComments.map((c) => {
                          const isMe = c.authorNik === currentAuthorNik;
                          const attachments = parseCommentAttachments(c.fileUrl, c.fileName);
                          const imageAttachments = attachments.filter(a => a.isImage);
                          const docAttachments = attachments.filter(a => !a.isImage);

                          return (
                            <div
                              key={c.id}
                              className="p-3.5 bg-[#252525] hover:bg-[#2a2a2a] rounded-xl border border-slate-800 transition-all space-y-2.5 shadow-sm"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  {c.authorAvatar ? (
                                    <img
                                      src={c.authorAvatar}
                                      alt={c.authorName}
                                      className="w-6 h-6 rounded-full object-cover border border-teal-500/50"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-teal-900 border border-teal-700/60 flex items-center justify-center text-[10px] font-bold text-teal-200">
                                      {(c.authorName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-bold text-slate-200 block leading-tight">
                                      {c.authorName || 'Personil'}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                      {c.authorJabatan || c.authorSection || c.section || 'Prep & Lab'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {c.createdAt ? new Date(c.createdAt).toLocaleString('id-ID', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : ''}
                                  </span>

                                  {isMe && (
                                    <button
                                      onClick={() => handleDeleteComment(c.id)}
                                      className="text-slate-600 hover:text-red-400 p-1 transition-colors"
                                      title="Hapus update"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Status Update Tag if present */}
                              {c.statusUpdate && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-950/70 text-blue-300 border border-blue-700/50 text-[10px] font-bold">
                                  <Activity className="w-3 h-3 text-blue-400" />
                                  <span>Update Status: {c.statusUpdate}</span>
                                </div>
                              )}

                              {/* Comment Content */}
                              {c.content && (
                                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                                  {c.content}
                                </p>
                              )}

                              {/* Attachments Section */}
                              {attachments.length > 0 && (
                                <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                                  {/* Image Attachments Preview */}
                                  {imageAttachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2.5">
                                      {imageAttachments.map((att, idx) => (
                                        <div
                                          key={idx}
                                          onClick={() => setPreviewImage({
                                            url: att.directUrl || att.url,
                                            title: att.name,
                                            driveViewUrl: att.driveViewUrl,
                                            driveDownloadUrl: att.driveDownloadUrl
                                          })}
                                          className="group/img relative rounded-xl border border-slate-700 bg-black/40 overflow-hidden cursor-pointer hover:border-teal-400 transition-all shadow-md max-w-[260px] w-full"
                                          title={`Klik untuk memperbesar gambar: ${att.name}`}
                                        >
                                          <div className="w-full h-40 bg-slate-900 flex items-center justify-center overflow-hidden">
                                            <img
                                              src={att.directUrl || att.url}
                                              alt={att.name}
                                              loading="lazy"
                                              referrerPolicy="no-referrer"
                                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                                              onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                if (att.id && !target.src.includes('googleusercontent.com')) {
                                                  target.src = `https://lh3.googleusercontent.com/d/${att.id}`;
                                                } else if (att.id && !target.src.includes('thumbnail')) {
                                                  target.src = `https://drive.google.com/thumbnail?id=${att.id}&sz=w1000`;
                                                }
                                              }}
                                            />
                                          </div>
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col justify-between p-2">
                                            <div className="flex justify-end">
                                              <span className="p-1 rounded-md bg-black/60 text-white shadow">
                                                <Maximize2 className="w-3.5 h-3.5" />
                                              </span>
                                            </div>
                                            <span className="text-[10px] text-white font-medium truncate drop-shadow">
                                              {att.name}
                                            </span>
                                          </div>
                                          <div className="px-2.5 py-1 bg-slate-900 border-t border-slate-800 flex items-center gap-1.5 text-[10px] text-slate-300">
                                            <ImageIcon className="w-3 h-3 text-teal-400 shrink-0" />
                                            <span className="truncate">{att.name}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Document Attachments (Spreadsheets, PDFs, Word, Files) */}
                                  {docAttachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {docAttachments.map((att, idx) => {
                                        const lowerName = att.name.toLowerCase();
                                        const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv');
                                        const isPdf = lowerName.endsWith('.pdf');

                                        return (
                                          <div
                                            key={idx}
                                            className="inline-flex items-center gap-2 px-3 py-2 bg-[#1b1b1b] hover:bg-[#222222] border border-slate-700/90 hover:border-teal-500/60 rounded-xl transition-all shadow-sm max-w-full"
                                          >
                                            <div className={`p-1.5 rounded-lg ${isExcel ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50' : isPdf ? 'bg-rose-950/80 text-rose-400 border border-rose-700/50' : 'bg-blue-950/80 text-blue-400 border border-blue-700/50'}`}>
                                              {isExcel ? <FileSpreadsheet className="w-4 h-4" /> : isPdf ? <FileText className="w-4 h-4" /> : <FileDown className="w-4 h-4" />}
                                            </div>
                                            
                                            <div className="min-w-0 pr-1">
                                              <span className="text-[11px] font-semibold text-slate-200 block truncate max-w-[220px]" title={att.name}>
                                                {att.name}
                                              </span>
                                              {att.size ? (
                                                <span className="text-[9px] text-slate-500 font-mono">
                                                  {(att.size / 1024).toFixed(0)} KB • Google Drive
                                                </span>
                                              ) : (
                                                <span className="text-[9px] text-teal-400/80 font-mono">
                                                  Google Drive File
                                                </span>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0 pl-1 border-l border-slate-800">
                                              {att.driveViewUrl && (
                                                <a
                                                  href={att.driveViewUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="p-1 text-slate-400 hover:text-teal-300 hover:bg-slate-800 rounded transition-colors"
                                                  title="Buka Dokumen di Google Drive"
                                                >
                                                  <ExternalLink className="w-3.5 h-3.5" />
                                                </a>
                                              )}
                                              {att.driveDownloadUrl && (
                                                <a
                                                  href={att.driveDownloadUrl}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="p-1 text-slate-400 hover:text-teal-300 hover:bg-slate-800 rounded transition-colors"
                                                  title="Download File"
                                                >
                                                  <Download className="w-3.5 h-3.5" />
                                                </a>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add New Comment / Progress Form */}
                  <form onSubmit={handlePostComment} className="p-4 bg-[#252525] rounded-xl border border-slate-700/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-teal-300 flex items-center gap-1.5">
                        <Send className="w-3.5 h-3.5" />
                        Tulis Update Progres / Komentar
                      </span>

                      {/* Status Change Selector */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Ubah Status:</span>
                        <select
                          value={statusUpdateChoice}
                          onChange={(e) => setStatusUpdateChoice(e.target.value)}
                          className="bg-[#181818] border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-200 outline-none cursor-pointer"
                        >
                          <option value="">(Status Tetap)</option>
                          <option value="ON PROGRESS">⚡ ON PROGRESS</option>
                          <option value="CLOSE">✓ CLOSE</option>
                          <option value="OPEN">⏳ OPEN</option>
                          <option value="PENDING">⏸ PENDING</option>
                        </select>
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder={`Tulis catatan tindakan, progres pekerjaan, kendala, atau koordinasi...`}
                      className="w-full bg-[#181818] border border-slate-700/80 rounded-xl p-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-teal-500 transition-colors resize-none"
                    />

                    {/* Attached file indicator */}
                    {selectedFile && (
                      <div className="flex items-center justify-between px-3 py-1.5 bg-teal-950/40 border border-teal-700/50 rounded-lg text-xs text-teal-300">
                        <div className="flex items-center gap-2 truncate">
                          <Paperclip className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                          <span className="truncate font-mono text-[11px]">{selectedFile.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="p-1 hover:text-red-400 transition-colors"
                          title="Hapus lampiran"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-teal-400" />
                          <span>Sebagai: <strong>{currentAuthorName || 'Personil'}</strong></span>
                        </div>

                        {/* File attachment upload button */}
                        <label className={`cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${uploadingFile ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-teal-300 border-slate-700'}`}>
                          {uploadingFile ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin text-teal-400" />
                              <span>Mengupload...</span>
                            </>
                          ) : (
                            <>
                              <Paperclip className="w-3 h-3 text-teal-400" />
                              <span>Lampirkan File</span>
                            </>
                          )}
                          <input
                            type="file"
                            disabled={uploadingFile}
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              try {
                                setUploadingFile(true);
                                toast.loading('Mengupload lampiran ke Google Drive...', { id: 'file-upload' });
                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                  try {
                                    const base64 = ev.target?.result as string;
                                    const base64Data = base64.split(',')[1];
                                    const url = await uploadPhotoToDrive(base64Data, file.type || 'application/octet-stream', file.name, 'Bulletin Board');
                                    setSelectedFile({ name: file.name, url });
                                    toast.success('Lampiran berhasil diupload!', { id: 'file-upload' });
                                  } catch (err) {
                                    console.error(err);
                                    toast.error('Gagal mengupload file ke Google Drive', { id: 'file-upload' });
                                  } finally {
                                    setUploadingFile(false);
                                  }
                                };
                                reader.readAsDataURL(file);
                              } catch (err) {
                                setUploadingFile(false);
                                toast.error('Gagal memproses file', { id: 'file-upload' });
                              }
                            }}
                          />
                        </label>
                      </div>

                      <Button
                        type="submit"
                        disabled={submittingComment || uploadingFile || !commentText.trim()}
                        className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-4 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {submittingComment ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Mengirim...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Kirim & Notifikasi</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-[#262626] border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-400">
                <span>Section: <strong>{section || selectedRow[categoryCol] || 'Prep & Lab'}</strong></span>
              </div>
              <Button
                onClick={() => setSelectedRow(null)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox Preview Modal with Zoom, Pan, Rotate */}
      {previewImage && (
        <ImageModal
          imageUrl={previewImage.url}
          title={previewImage.title}
          driveViewUrl={previewImage.driveViewUrl}
          driveDownloadUrl={previewImage.driveDownloadUrl}
          onClose={() => setPreviewImage(null)}
        />
      )}
    </div>
  );
}
