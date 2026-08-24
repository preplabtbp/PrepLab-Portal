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
  Upload
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
  } catch (e) {}

  const driveId = extractDriveId({ directUrl: fileUrl });
  const isImg = /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(fileName || fileUrl || '') || fileUrl.startsWith('data:image/');
  const directUrl = driveId ? `/api/drive/view/${driveId}` : fileUrl;
  const driveDownloadUrl = driveId ? `/api/drive/download/${driveId}` : fileUrl;
  const driveViewUrl = driveId ? `https://drive.google.com/file/d/${driveId}/view?usp=sharing` : fileUrl;

  return [{
    id: driveId || undefined,
    name: fileName || 'Attachment',
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
  onRowsChange
}: NotionDatabaseTableProps) {
  // Local table rows for responsive instant CRUD
  const [localRows, setLocalRows] = useState<TableRowData[]>(() => rows || []);

  useEffect(() => {
    if (rows) {
      setLocalRows(rows);
    }
  }, [rows]);

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
          fileName: selectedFile?.name || null
        })
      });

      const json = await res.json();
      if (json.status === 'success') {
        toast.success(`Update terkirim! Notifikasi diteruskan ke personil ${activeSection}.`);
        setCommentText('');
        setStatusUpdateChoice('');
        setSelectedFile(null);
        
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
        <span className="truncate max-w-[110px]">{picStr}</span>
      </div>
    );
  };

  // Helper to format multiline notes
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
                {filteredRows.length} baris
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
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
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
              fitPageMode 
                ? 'bg-teal-600/30 text-teal-300 border-teal-500/70' 
                : 'bg-[#242424] hover:bg-[#2e2e2e] text-slate-300 border-slate-700'
            }`}
            title={fitPageMode ? "Matikan Fit Screen (Mode Scroll Lebar)" : "Aktifkan Fit Screen (Semua Kolom Muat 1 Layar Tanpa Horizontal Scroll)"}
          >
            {fitPageMode ? <Minimize2 className="w-3.5 h-3.5 text-teal-400" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">{fitPageMode ? "Fit Screen: ON" : "Fit Screen"}</span>
          </button>

          {/* Zoom Out / In Controls */}
          <div className="flex items-center bg-[#151515] p-0.5 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setZoomPercent((prev) => Math.max(70, prev - 10))}
              className="p-1 px-1.5 hover:bg-[#282828] text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
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
              className="p-1 px-1.5 hover:bg-[#282828] text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Zoom In (Perbesar Tampilan)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

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
              <tr className="bg-[#242424] border-b border-[#303030] text-slate-300 select-none">
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
                      className={`font-bold hover:bg-[#2c2c2c] cursor-pointer transition-colors ${widthClass}`}
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
                <th className={`text-center text-slate-400 ${fitPageMode ? 'w-[5%] px-1 py-2' : 'w-24 px-3 py-3'}`}>Aksi</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-800/80 bg-[#1c1c1c]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={displayHeaders.length + 1} className="py-12 text-center text-slate-500 italic text-xs">
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
                      className="hover:bg-[#262626] transition-colors cursor-pointer group"
                    >
                      {displayHeaders.map((colName) => {
                        const val = getRowVal(row, colName);
                        const colLower = colName.toLowerCase();

                        // 1. Number Column
                        if (colLower === 'number' || colLower === 'no') {
                          return (
                            <td key={colName} className={`text-center text-slate-500 font-mono ${
                              fitPageMode ? 'px-1 py-2 text-[10px]' : 'px-3.5 py-3 text-[11px]'
                            }`}>
                              {val || idx + 1}
                            </td>
                          );
                        }

                        // 2. Jenis kegiatan Column
                        if (colLower.includes('jenis kegiatan') || colLower === 'task' || colLower === 'judul') {
                          return (
                            <td key={colName} className={`font-semibold text-slate-100 group-hover:text-teal-300 transition-colors ${
                              fitPageMode ? 'px-2 py-2 overflow-hidden' : 'px-4 py-3'
                            }`}>
                              <div className="flex items-center gap-1.5">
                                <span className={`leading-snug block ${fitPageMode ? 'line-clamp-2 break-words text-[11px]' : ''}`}>
                                  {val && val !== '-' ? val : <em className="text-slate-500">Tanpa Judul</em>}
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
                            <td key={colName} className={`font-mono text-slate-400 ${
                              fitPageMode ? 'px-1 py-2 text-[10px] truncate' : 'px-3.5 py-3 whitespace-nowrap text-[11px]'
                            }`}>
                              {val && val !== '-' ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300">
                                  <Clock className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                  <span className="truncate">{val}</span>
                                </span>
                              ) : (
                                <span className="text-slate-600 font-mono">-</span>
                              )}
                            </td>
                          );
                        }

                        // 8. Kategori Column
                        if (colLower.includes('kategori') || colLower.includes('category')) {
                          return (
                            <td key={colName} className={`${fitPageMode ? 'px-1 py-2 truncate' : 'px-3.5 py-3 whitespace-nowrap'}`}>
                              {val && val !== '-' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] bg-slate-800 text-slate-300 border border-slate-700 truncate">
                                  {val}
                                </span>
                              ) : (
                                <span className="text-slate-600 font-mono">-</span>
                              )}
                            </td>
                          );
                        }

                        // 9. Activity (routine/non routine) Column
                        if (colLower.includes('activity') || colLower.includes('aktivitas')) {
                          return (
                            <td key={colName} className={`${fitPageMode ? 'px-1 py-2 truncate' : 'px-3.5 py-3 whitespace-nowrap'}`}>
                              {val && val !== '-' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800/90 text-slate-300 border border-slate-700/80 truncate">
                                  {val}
                                </span>
                              ) : (
                                <span className="text-slate-600 font-mono">-</span>
                              )}
                            </td>
                          );
                        }

                        // 10. Period Column
                        if (colLower.includes('period') || colLower.includes('periode')) {
                          return (
                            <td key={colName} className={`font-mono text-slate-300 ${
                              fitPageMode ? 'px-1 py-2 text-[10px] truncate' : 'px-3.5 py-3 whitespace-nowrap text-[11px]'
                            }`}>
                              {val && val !== '-' ? (
                                <span className="px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/60 truncate">
                                  {val}
                                </span>
                              ) : (
                                <span className="text-slate-600 font-mono">-</span>
                              )}
                            </td>
                          );
                        }

                        // Default custom column
                        return (
                          <td key={colName} className={`text-slate-300 whitespace-nowrap ${
                            fitPageMode ? 'px-1 py-2 text-[10.5px]' : 'px-3.5 py-3 text-xs'
                          }`}>
                            {val && val !== '-' ? val : <span className="text-slate-600 font-mono">-</span>}
                          </td>
                        );
                      })}

                      {/* Row Action Buttons */}
                      <td className={`text-center whitespace-nowrap ${fitPageMode ? 'px-1 py-2' : 'px-3 py-3'}`}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={(e) => handleOpenEditModal(row, localRows.indexOf(row), e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                            title="Edit Data Kegiatan Ini"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteRow(localRows.indexOf(row), e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
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
          <div className="p-3 bg-[#181818] border-t border-[#2d2d2d] flex items-center justify-between">
            <button
              onClick={handleOpenAddModal}
              className="text-xs font-semibold text-slate-400 hover:text-teal-300 flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-[#252525] transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Tambah Baris Kegiatan Baru</span>
            </button>
            <span className="text-[11px] text-slate-500 font-mono">
              Total {localRows.length} baris tercatat
            </span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BOARD VIEW (Kanban by Status)                                          */}
      {/* ========================================================================= */}
      {viewMode === 'board' && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#141414]">
          {['Open', 'On Progress', 'Close'].map((laneStatus) => {
            const laneRows = filteredRows.filter((r) => {
              const s = (getRowVal(r, 'Status') || '').toUpperCase();
              if (laneStatus === 'Open') return s.includes('OPEN') || s.includes('BARU') || !s;
              if (laneStatus === 'On Progress') return s.includes('PROGRESS') || s.includes('PROSES') || s.includes('PENDING');
              if (laneStatus === 'Close') return s.includes('CLOSE') || s.includes('SELESAI') || s.includes('DONE');
              return false;
            });

            return (
              <div key={laneStatus} className="bg-[#1e1e1e] border border-slate-800 rounded-xl p-3 flex flex-col min-h-[350px]">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      laneStatus === 'Open' ? 'bg-amber-400' : laneStatus === 'On Progress' ? 'bg-blue-400' : 'bg-emerald-400'
                    }`} />
                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-200">{laneStatus}</h4>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#161616] text-slate-400 font-mono">
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
                      className="p-3 bg-[#242424] hover:bg-[#2b2b2b] border border-slate-700/60 rounded-xl shadow-sm cursor-pointer transition-all hover:border-teal-500/50 space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-semibold text-xs text-slate-100 group-hover:text-teal-300 leading-snug">
                          {getRowVal(row, 'Jenis kegiatan') || 'Tanpa Judul'}
                        </h5>
                        {renderPriorityBadge(getRowVal(row, 'Priority'))}
                      </div>

                      {getRowVal(row, 'Keterangan') && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {getRowVal(row, 'Keterangan')}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-400">
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
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-[#141414]">
          {filteredRows.map((row, idx) => (
            <div
              key={idx}
              onClick={() => {
                setSelectedRow(row);
                setModalTab('details');
              }}
              className="p-4 bg-[#1f1f1f] hover:bg-[#252525] border border-slate-800 hover:border-teal-600/60 rounded-2xl shadow-md cursor-pointer transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161616] text-slate-400 border border-slate-800">
                    #{getRowVal(row, 'number') || idx + 1}
                  </span>
                  {renderStatusBadge(getRowVal(row, 'Status'))}
                </div>

                <h4 className="font-bold text-sm text-slate-100 leading-snug">
                  {getRowVal(row, 'Jenis kegiatan') || 'Tanpa Judul'}
                </h4>

                {getRowVal(row, 'Keterangan') && (
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {getRowVal(row, 'Keterangan')}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
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
            className="w-full max-w-xl max-h-[90vh] bg-[#1e1e1e] border border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-[#252525] border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-600/30 border border-teal-500/50 text-teal-300 flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-100">
                    {editingRowIndex === null ? 'Tambah Data Kegiatan Baru' : 'Edit Data Kegiatan'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Struktur kolom sinkron database Weekly Notion
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowRowModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRow} className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Number */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1 text-[10px]">
                    Number / No
                  </label>
                  <input
                    type="text"
                    value={rowFormData['number'] || ''}
                    onChange={(e) => setRowFormData({ ...rowFormData, number: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#141414] border border-slate-700 text-slate-200 focus:border-teal-500 outline-none"
                    placeholder="1"
                  />
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1 text-[10px]">
                    Priority
                  </label>
                  <select
                    value={rowFormData['Priority'] || 'Normal'}
                    onChange={(e) => setRowFormData({ ...rowFormData, Priority: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#141414] border border-slate-700 text-slate-200 focus:border-teal-500 outline-none cursor-pointer"
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
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1 text-[10px]">
                  Jenis Kegiatan *
                </label>
                <input
                  type="text"
                  required
                  value={rowFormData['Jenis kegiatan'] || ''}
                  onChange={(e) => setRowFormData({ ...rowFormData, 'Jenis kegiatan': e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#141414] border border-slate-700 text-slate-200 focus:border-teal-500 outline-none font-medium"
                  placeholder="Contoh: Kalibrasi XRF, Analisis Sampel Harian, dsb..."
                />
              </div>

              {/* Keterangan */}
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1 text-[10px]">
                  Keterangan & Rincian
                </label>
                <textarea
                  rows={3}
                  value={rowFormData['Keterangan'] || ''}
                  onChange={(e) => setRowFormData({ ...rowFormData, Keterangan: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[#141414] border border-slate-700 text-slate-200 focus:border-teal-500 outline-none leading-relaxed"
                  placeholder="Deskripsi langkah, catatan temuan, atau hasil pekerjaan..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* PIC Field with Special Role & Searchable Employee Dropdown */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">
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
                      className="w-full p-2.5 rounded-xl bg-[#141414] border border-slate-700 text-slate-200 focus:border-teal-500 outline-none text-xs"
                      placeholder="Ketik NIK, Nama, atau pilih Role..."
                    />
                    {rowFormData['PIC'] && (
                      <button
                        type="button"
                        onClick={() => setRowFormData({ ...rowFormData, PIC: '' })}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
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
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-20 bg-[#222222] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-100">
                        {/* Quick Role Picks */}
                        <div className="p-2 bg-[#1b1b1b]">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block px-2 pb-1.5">
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
                                className="px-2 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-teal-950/80 text-slate-300 hover:text-teal-300 border border-slate-700/60 hover:border-teal-600/50 text-[11px] font-semibold text-left transition-colors flex items-center justify-between cursor-pointer"
                              >
                                <span>{role}</span>
                                <Check className="w-2.5 h-2.5 opacity-40" />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Employee Search List */}
                        <div className="p-1.5">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block px-2 py-1">
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
                                className="w-full px-2.5 py-2 rounded-xl hover:bg-[#2d2d2d] flex items-center justify-between text-left transition-colors cursor-pointer group"
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span className="w-6 h-6 rounded-full bg-teal-900/80 border border-teal-700/60 text-teal-300 text-[10px] font-bold flex items-center justify-center shrink-0">
                                    {(emp.name || 'U').charAt(0).toUpperCase()}
                                  </span>
                                  <div className="truncate">
                                    <span className="text-xs font-semibold text-slate-200 group-hover:text-teal-300 block truncate">
                                      {emp.name}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
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
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1 text-[10px]">
                    Status
                  </label>
                  <select
                    value={rowFormData['Status'] || 'Open'}
                    onChange={(e) => setRowFormData({ ...rowFormData, Status: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#141414] border border-slate-700 text-slate-200 focus:border-teal-500 outline-none cursor-pointer text-xs"
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
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1 text-[10px]">
                    Created Time
                  </label>
                  <input
                    type="text"
                    value={rowFormData['Created Time'] || ''}
                    onChange={(e) => setRowFormData({ ...rowFormData, 'Created Time': e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#141414] border border-slate-700 text-slate-200 focus:border-teal-500 outline-none font-mono text-[11px]"
                  />
                </div>

                {/* Kategori */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1 text-[10px]">
                    Kategori
                  </label>
                  <input
                    type="text"
                    value={rowFormData['Kategori'] || ''}
                    onChange={(e) => setRowFormData({ ...rowFormData, Kategori: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#141414] border border-slate-700 text-slate-200 focus:border-teal-500 outline-none text-xs"
                    placeholder="Laboratorium"
                  />
                </div>

                {/* Activity (routine/non routine) */}
                <div>
                  <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1 text-[10px]">
                    Activity
                  </label>
                  <select
                    value={rowFormData['Activity (routine/non routine)'] || 'Routine'}
                    onChange={(e) => setRowFormData({ ...rowFormData, 'Activity (routine/non routine)': e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#141414] border border-slate-700 text-slate-200 focus:border-teal-500 outline-none cursor-pointer text-xs"
                  >
                    <option value="Routine">Routine</option>
                    <option value="Non-routine">Non-routine</option>
                  </select>
                </div>
              </div>

              {/* Period Dropdown */}
              <div>
                <label className="block text-slate-300 font-bold uppercase tracking-wider mb-1 text-[10px]">
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
                    className="w-full p-2.5 rounded-xl bg-[#141414] border border-slate-700 text-slate-200 focus:border-teal-500 outline-none cursor-pointer text-xs"
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
                    className="w-full p-2.5 rounded-xl bg-[#141414] border border-slate-700 text-slate-200 focus:border-teal-500 outline-none text-xs"
                    placeholder="Input periode manual jika kustom..."
                  />
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
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
      {selectedRow && (
        <div className="fixed inset-0 z-[120] overflow-hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setSelectedRow(null)}
          />

          {/* Right-to-Left Slide-over Panel (Wide 2-Column Layout) */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
            <div 
              className="w-screen max-w-5xl lg:max-w-6xl xl:max-w-7xl bg-[#1a1a1a] border-l border-slate-800 shadow-[-20px_0_50px_rgba(0,0,0,0.9)] flex flex-col h-full overflow-hidden animate-in slide-in-from-right duration-300 ease-out"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drawer Sticky Header */}
              <div className="p-4 sm:p-5 bg-[#222222] border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 overflow-hidden">
                  <span className="text-xs sm:text-sm font-mono px-3 py-1 rounded-xl bg-teal-950/90 text-teal-300 border border-teal-600/50 font-bold shrink-0 shadow-sm">
                    #{getRowVal(selectedRow, 'number') || '1'}
                  </span>
                  <div className="truncate">
                    <h3 className="font-black text-slate-100 text-base sm:text-xl truncate">
                      {selectedTopicTitle || 'Detail Kegiatan'}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-teal-400/90 font-mono font-semibold">
                        {getRowVal(selectedRow, 'Kategori') || 'Laboratorium'}
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Periode: {getRowVal(selectedRow, 'period') || 'Periodik'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleOpenEditModal(selectedRow, localRows.indexOf(selectedRow))}
                    className="p-2 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteRow(localRows.indexOf(selectedRow))}
                    className="p-2 px-3.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                  <button
                    onClick={() => setSelectedRow(null)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors ml-1 cursor-pointer"
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
                    <div className="grid grid-cols-2 gap-2.5 p-4 bg-[#141414] rounded-2xl border border-slate-800 shadow-inner text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5">Status</span>
                        {renderStatusBadge(getRowVal(selectedRow, 'Status'))}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5">Priority</span>
                        {renderPriorityBadge(getRowVal(selectedRow, 'Priority'))}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5">PIC</span>
                        {renderPicBadge(getRowVal(selectedRow, 'PIC'))}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1.5">Activity Type</span>
                        <span className="font-mono text-slate-300 font-semibold px-2 py-0.5 rounded bg-[#1e1e1e] border border-slate-700 inline-block truncate max-w-full text-[11px]">
                          {getRowVal(selectedRow, 'Activity (routine/non routine)') || 'Routine'}
                        </span>
                      </div>
                    </div>

                    {/* Rincian & Keterangan Card */}
                    <div className="p-4 sm:p-5 bg-[#171717] rounded-2xl border border-slate-800 shadow-sm space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                        <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span>Rincian & Keterangan Kegiatan</span>
                        </h4>
                      </div>

                      <div className="text-slate-200 leading-relaxed text-xs sm:text-sm font-sans pt-1">
                        {renderFormattedNotes(getRowVal(selectedRow, 'Keterangan'))}
                      </div>
                    </div>

                    {/* Secondary Metadata Info Cards */}
                    <div className="grid grid-cols-3 gap-2.5 text-[11px]">
                      <div className="p-3 bg-[#171717] rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Kategori</span>
                        <span className="text-slate-300 font-medium truncate block">{getRowVal(selectedRow, 'Kategori') || '-'}</span>
                      </div>
                      <div className="p-3 bg-[#171717] rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Period</span>
                        <span className="text-slate-300 font-medium truncate block">{getRowVal(selectedRow, 'period') || '-'}</span>
                      </div>
                      <div className="p-3 bg-[#171717] rounded-xl border border-slate-800">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block mb-0.5">Dibuat</span>
                        <span className="text-slate-300 font-mono text-[10px] truncate block">{getRowVal(selectedRow, 'Created Time') || '-'}</span>
                      </div>
                    </div>

                    {/* 3. GALERI & LAMPIRAN MEDIA TOPIK */}
                    <div className="p-4 sm:p-5 bg-[#171717] rounded-2xl border border-slate-800 shadow-sm space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-teal-400" />
                          <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                            Galeri & Lampiran Media ({activeTopicComments.filter((c: any) => c.fileUrl).length})
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
                      {activeTopicComments.filter((c: any) => c.fileUrl).length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                          {activeTopicComments.filter((c: any) => c.fileUrl).map((media: any, idx: number) => (
                            <div 
                              key={media.id || idx}
                              onClick={() => setPreviewImage({ url: media.fileUrl, title: media.content || 'Lampiran Kegiatan' })}
                              className="group relative rounded-xl overflow-hidden aspect-video border border-slate-800 hover:border-teal-500/60 bg-[#121212] cursor-pointer shadow-sm transition-all hover:scale-[1.02]"
                            >
                              <img 
                                src={media.fileUrl} 
                                alt={media.content || 'Lampiran'} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                <span className="text-[10px] font-bold text-white truncate">{media.content?.replace(/^📎\s*Lampiran Foto \/ Dokumen:\s*/, '') || 'Foto Kegiatan'}</span>
                                <span className="text-[9px] text-teal-300 font-mono">{media.authorName || 'Personil'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div 
                          onClick={() => galleryFileInputRef.current?.click()}
                          className="py-6 px-4 bg-[#141414] hover:bg-[#181818] rounded-xl border border-dashed border-slate-800 hover:border-teal-600/50 text-center cursor-pointer transition-colors group"
                        >
                          <ImageIcon className="w-6 h-6 mx-auto mb-1.5 text-slate-600 group-hover:text-teal-400 transition-colors" />
                          <p className="text-xs text-slate-400 font-medium group-hover:text-slate-200 transition-colors">
                            Belum ada foto atau lampiran untuk kegiatan ini
                          </p>
                          <p className="text-[10px] text-slate-600 mt-0.5">
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
                      <span className="text-[10px] text-slate-500 font-mono bg-[#141414] px-2 py-0.5 rounded-full border border-slate-800">
                        ⚡ Realtime Feed
                      </span>
                    </div>

                    {/* New Comment & Status Update Form */}
                    <form onSubmit={handlePostComment} className="p-4 bg-[#171717] border border-slate-800 rounded-2xl space-y-3 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                          <span>Kirim Update Progres / Catatan Baru</span>
                        </span>
                      </div>

                      <textarea
                        rows={3}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={`Tuliskan update progres, temuan kendala, atau hasil tindakan untuk "${selectedTopicTitle}"...`}
                        className="w-full p-3 rounded-xl bg-[#202020] border border-slate-700 text-slate-200 focus:border-teal-500 outline-none leading-relaxed text-xs"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-semibold">Ubah Status:</span>
                          <select
                            value={statusUpdateChoice}
                            onChange={(e) => setStatusUpdateChoice(e.target.value)}
                            className="p-1.5 px-2.5 rounded-lg bg-[#202020] border border-slate-700 text-slate-200 text-xs outline-none cursor-pointer"
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
                          {submittingComment ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                          <span>Kirim Update</span>
                        </Button>
                      </div>
                    </form>

                    {/* Activity / Comments Timeline Stream */}
                    <div className="space-y-3 pt-1">
                      {commentsLoading ? (
                        <div className="text-center py-8 text-slate-500">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-400" />
                          <p className="text-xs">Memuat riwayat diskusi...</p>
                        </div>
                      ) : activeTopicComments.length === 0 ? (
                        <div className="text-center py-8 px-4 bg-[#151515] rounded-2xl border border-dashed border-slate-800 text-slate-500">
                          <MessageSquare className="w-6 h-6 mx-auto mb-1.5 opacity-40 text-slate-400" />
                          <p className="text-xs italic">Belum ada update progres atau catatan diskusi pada kegiatan ini.</p>
                        </div>
                      ) : (
                        activeTopicComments.map((c) => (
                          <div key={c.id} className="p-3.5 bg-[#171717] border border-slate-800/80 rounded-2xl space-y-2 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <span className="w-7 h-7 rounded-full bg-teal-900/90 border border-teal-700/60 text-teal-300 text-xs font-bold flex items-center justify-center shrink-0">
                                  {(c.authorName || 'U').charAt(0).toUpperCase()}
                                </span>
                                <div>
                                  <span className="font-bold text-slate-200 text-xs block leading-tight">
                                    {c.authorName || 'Personil'}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {new Date(c.createdAt).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                  </span>
                                </div>
                              </div>
                              {c.authorNik === currentAuthorNik && (
                                <button
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                                  title="Hapus Catatan Ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                            
                            <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed pl-9">
                              {c.content}
                            </p>

                            {/* Media preview if comment has file_url */}
                            {c.fileUrl && (
                              <div className="pl-9 pt-1">
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage({ url: c.fileUrl, title: c.content || 'Lampiran Media' })}
                                  className="relative rounded-xl overflow-hidden border border-slate-700 hover:border-teal-500/60 max-w-xs aspect-video block group cursor-pointer"
                                >
                                  <img src={c.fileUrl} alt="Lampiran" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
