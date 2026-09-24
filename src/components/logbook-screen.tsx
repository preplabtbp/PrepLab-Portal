import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ClipboardCheck, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  Plus, 
  Search, 
  Filter, 
  User, 
  Share2, 
  Copy, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  FileText, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  Edit3, 
  CheckSquare, 
  Square, 
  RefreshCw, 
  SlidersHorizontal, 
  Check, 
  X, 
  TrendingUp, 
  Briefcase, 
  Building2, 
  Flame, 
  Send 
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui';
import { parseTasklist, toggleTasklistItem } from './notion/tasklist-utils';
import { NotionDropdownCell } from './notion/NotionDropdownCell';

interface LogbookTask {
  id: number;
  universe: string;
  pt: string;
  section: string;
  bulletinPostId: number | null;
  bulletinTopicTitle: string | null;
  title: string;
  description: string;
  assignedByNik: string;
  assignedByName: string;
  assigneeNik: string;
  assigneeName: string;
  status: string;
  priority: string;
  activityType: string;
  progressPercent: number;
  taskDate: string;
  targetDate: string;
  actualCompletedDate: string | null;
  yesterdayNotes: string | null;
  todayNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LogbookScreenProps {
  inspectorNik: string;
  inspectorName: string;
  userPt?: string;
  onNav?: (tab: string) => void;
  onBack?: () => void;
}

const SECTION_OPTIONS = [
  'Semua Seksi',
  'Preparation',
  'Laboratory',
  'Maintenance',
  'Quality Control (QA)',
  'Sampling',
  'General'
];

const PRIORITY_OPTIONS = ['Normal', 'Urgent', 'High', 'Medium', 'Low'];
const ACTIVITY_OPTIONS = ['Routine', 'Non Routine', 'Periodic', 'Special Task'];

export function LogbookScreen({
  inspectorNik,
  inspectorName,
  userPt = 'TBP',
  onNav,
  onBack
}: LogbookScreenProps) {
  // Current active date (YYYY-MM-DD)
  const getTodayStr = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [selectedSection, setSelectedSection] = useState<string>('Semua Seksi');
  const [selectedPt, setSelectedPt] = useState<string>(userPt === 'GTS' ? 'GTS' : 'TBP');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [picFilter, setPicFilter] = useState<string>('ALL');

  // Loading & Data states
  const [loading, setLoading] = useState(true);
  const [todayTasks, setTodayTasks] = useState<LogbookTask[]>([]);
  const [yesterdayTasks, setYesterdayTasks] = useState<LogbookTask[]>([]);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Employees master list for PIC dropdown
  const [employeesList, setEmployeesList] = useState<any[]>([]);

  // Bulletin posts list for link sync
  const [bulletinList, setBulletinList] = useState<any[]>([]);

  // Quick Assign Task State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newSection, setNewSection] = useState(selectedSection !== 'Semua Seksi' ? selectedSection : 'Preparation');
  const [newAssigneeNik, setNewAssigneeNik] = useState('');
  const [newAssigneeName, setNewAssigneeName] = useState('');
  const [newPriority, setNewPriority] = useState('Normal');
  const [newActivityType, setNewActivityType] = useState('Routine');
  const [newTargetDate, setNewTargetDate] = useState('17:00 WITA');
  const [selectedBulletinPostId, setSelectedBulletinPostId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);

  // Fetch employees list
  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setEmployeesList(data);
      })
      .catch(err => console.error('Failed to load employees:', err));
  }, []);

  // Fetch bulletin posts for linking
  useEffect(() => {
    fetch(`/api/bulletin?pt=${selectedPt}`)
      .then(res => res.json())
      .then(json => {
        if (json.status === 'success' && Array.isArray(json.data)) {
          setBulletinList(json.data);
        }
      })
      .catch(err => console.error('Failed to load bulletin posts for linking:', err));
  }, [selectedPt]);

  // Fetch Logbook tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      queryParams.set('date', selectedDate);
      if (selectedSection !== 'Semua Seksi') queryParams.set('section', selectedSection);
      if (selectedPt !== 'ALL') queryParams.set('pt', selectedPt);

      const res = await fetch(`/api/logbook/tasks?${queryParams.toString()}`);
      const json = await res.json();
      if (json.status === 'success' && json.data) {
        setTodayTasks(json.data.todayTasks || []);
        setYesterdayTasks(json.data.yesterdayTasks || []);
        setSummaryData(json.data.summary || null);
      }
    } catch (e) {
      console.error('Failed to fetch logbook tasks:', e);
      toast.error('Gagal memuat daftar tugas meeting pagi');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedSection, selectedPt]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Date Shift Helpers (-1 day, +1 day)
  const shiftDate = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  // Handle Quick Assign Task Submit
  const handleAssignTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Judul tugas / arahan kegiatan tidak boleh kosong');
      return;
    }
    if (!newAssigneeNik || !newAssigneeName) {
      toast.error('Harap pilih personil bawahan (PIC) yang ditugaskan');
      return;
    }

    try {
      setIsSubmitting(true);
      toast.loading('Menugaskan arahan kegiatan & menyinkronkan ke Buletin...', { id: 'assign-task' });

      const res = await fetch('/api/logbook/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim(),
          section: newSection,
          assigneeNik: newAssigneeNik,
          assigneeName: newAssigneeName,
          assignedByNik: inspectorNik || 'SUPERVISOR',
          assignedByName: inspectorName || 'Atasan / Manajemen',
          priority: newPriority,
          activityType: newActivityType,
          taskDate: selectedDate,
          targetDate: newTargetDate.trim() || '17:00 WITA',
          pt: selectedPt,
          bulletinPostId: selectedBulletinPostId ? parseInt(selectedBulletinPostId) : null
        })
      });

      const json = await res.json();
      if (json.status === 'success') {
        toast.success(`Tugas berhasil ditugaskan ke ${newAssigneeName}!`, { id: 'assign-task' });
        setShowAssignModal(false);
        setNewTitle('');
        setNewDescription('');
        fetchTasks();
      } else {
        toast.error(json.message || 'Gagal menugaskan task', { id: 'assign-task' });
      }
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengirim tugas', { id: 'assign-task' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle Subtask Checklist in Description
  const handleToggleSubtask = async (task: LogbookTask, itemIndex: number) => {
    const updatedDesc = toggleTasklistItem(task.description || '', itemIndex);
    const progress = parseTasklist(updatedDesc);

    // Optimistic UI Update
    setTodayTasks(prev => prev.map(t => t.id === task.id ? { ...t, description: updatedDesc, progressPercent: progress.percentage } : t));

    try {
      await fetch(`/api/logbook/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: updatedDesc,
          progressPercent: progress.percentage,
          updaterNik: inspectorNik
        })
      });
    } catch (e) {
      console.error('Failed to sync checklist update:', e);
      toast.error('Gagal menyinkronkan checklist ke server');
      fetchTasks();
    }
  };

  // Update Status Directly
  const handleStatusChange = async (taskId: number, newStatus: string) => {
    // Optimistic Update
    setTodayTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    setYesterdayTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    try {
      const res = await fetch(`/api/logbook/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          updaterNik: inspectorNik
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success(`Status diubah menjadi [${newStatus}] & tersinkron ke Buletin!`);
      }
    } catch (e) {
      toast.error('Gagal memperbarui status');
      fetchTasks();
    }
  };

  // Carry Over Yesterday Task to Today
  const handleCarryOverTask = async (task: LogbookTask) => {
    try {
      toast.loading(`Memindahkan fokus "${task.title}" ke hari ini...`, { id: 'carry-over' });
      const res = await fetch('/api/logbook/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          section: task.section,
          assigneeNik: task.assigneeNik,
          assigneeName: task.assigneeName,
          assignedByNik: inspectorNik,
          assignedByName: inspectorName,
          priority: task.priority,
          activityType: task.activityType,
          taskDate: selectedDate,
          targetDate: task.targetDate,
          pt: task.pt,
          bulletinPostId: task.bulletinPostId
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        toast.success('Tugas berhasil dimasukkan ke daftar fokus hari ini!', { id: 'carry-over' });
        fetchTasks();
      }
    } catch (e) {
      toast.error('Gagal carry-over tugas', { id: 'carry-over' });
    }
  };

  // Copy P5M Meeting Summary to WhatsApp / Clipboard
  const handleCopyMeetingSummary = () => {
    const formattedDate = new Date(selectedDate).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let text = `*📋 NOTULENSI MEETING PAGI / P5M SECTION*\n`;
    text += `*Tanggal*: ${formattedDate}\n`;
    text += `*Seksi*: ${selectedSection} (${selectedPt})\n`;
    text += `*Pimpinan Rapat*: ${inspectorName || 'Supervisor'}\n\n`;

    text += `*1️⃣ EVALUASI PEKERJAAN KEMARIN:*\n`;
    if (yesterdayTasks.length === 0) {
      text += `- Belum ada catatan evaluasi kemarin.\n`;
    } else {
      yesterdayTasks.forEach((t, i) => {
        text += `${i + 1}. [${t.status.toUpperCase()}] ${t.title} - PIC: ${t.assigneeName}\n`;
        if (t.yesterdayNotes) text += `   _Catatan_: ${t.yesterdayNotes}\n`;
      });
    }

    text += `\n*2️⃣ FOKUS & ON-GOING TASK HARI INI:*\n`;
    if (todayTasks.length === 0) {
      text += `- Tidak ada task aktif hari ini.\n`;
    } else {
      todayTasks.forEach((t, i) => {
        text += `${i + 1}. [${t.priority}] ${t.title} (PIC: ${t.assigneeName}) - Target: ${t.targetDate || 'Hari ini'} [${t.status}]\n`;
        const parsed = parseTasklist(t.description || '');
        if (parsed.hasTasklist) {
          parsed.items.forEach(item => {
            text += `   ${item.completed ? '✅' : '◻️'} ${item.text}\n`;
          });
        }
      });
    }

    text += `\n_Generated via Prep & Lab Portal Log Book Hub_`;

    navigator.clipboard.writeText(text);
    toast.success('Notulensi meeting pagi berhasil disalin ke clipboard! Siap dikirim ke WhatsApp.');
  };

  // Filtered Today & Yesterday Lists
  const filteredToday = useMemo(() => {
    return todayTasks.filter(t => {
      const matchSearch = !searchQuery || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.assigneeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPic = picFilter === 'ALL' || t.assigneeNik === picFilter || t.assigneeName === picFilter;
      return matchSearch && matchPic;
    });
  }, [todayTasks, searchQuery, picFilter]);

  const filteredYesterday = useMemo(() => {
    return yesterdayTasks.filter(t => {
      const matchSearch = !searchQuery || 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.assigneeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchPic = picFilter === 'ALL' || t.assigneeNik === picFilter || t.assigneeName === picFilter;
      return matchSearch && matchPic;
    });
  }, [yesterdayTasks, searchQuery, picFilter]);

  // Unique PICs in current tasks
  const uniquePics = useMemo(() => {
    const map = new Map<string, string>();
    [...todayTasks, ...yesterdayTasks].forEach(t => {
      if (t.assigneeNik && t.assigneeName) map.set(t.assigneeNik, t.assigneeName);
    });
    return Array.from(map.entries()).map(([nik, name]) => ({ nik, name }));
  }, [todayTasks, yesterdayTasks]);

  return (
    <div className="w-full min-h-screen pb-24 font-sans text-xs sm:text-sm" style={{ backgroundColor: 'var(--bg-main, #f8fafc)', color: 'var(--text-main, #0f172a)' }}>
      {/* Top Banner Navigation Header */}
      <div 
        className="sticky top-0 z-30 border-b shadow-xs transition-colors backdrop-blur-md"
        style={{ 
          backgroundColor: 'var(--header-bg, var(--card-bg, #ffffff))',
          borderColor: 'var(--border-main, #e2e8f0)'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          {/* Title & Back */}
          <div className="flex items-center gap-3">
            {onBack && (
              <button 
                onClick={onBack}
                className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                title="Kembali ke Dashboard"
              >
                <ArrowLeft className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  <ClipboardCheck className="w-4 h-4" />
                </span>
                <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                  <span>Log Book Section & Morning Briefing Hub</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                    P5M Pagi
                  </span>
                </h1>
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                Tinjauan Tugas Kemarin, Fokus Hari Ini, dan Penugasan Terintegrasi Buletin
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyMeetingSummary}
              title="Salin notulensi meeting pagi ke WhatsApp"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-all cursor-pointer shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #cbd5e1)'
              }}
            >
              <Copy className="w-3.5 h-3.5 text-teal-500" />
              <span className="hidden sm:inline">Salin Notulensi P5M</span>
            </button>

            <button
              onClick={() => setShowAssignModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs tracking-wide transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Arahan Tugas Baru</span>
            </button>
          </div>
        </div>

        {/* Date Selector & Filters Bar */}
        <div 
          className="border-t px-4 py-2 bg-slate-500/5"
          style={{ borderColor: 'var(--border-main, #e2e8f0)' }}
        >
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Date Selector Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => shiftDate(-1)}
                className="p-1 rounded-lg border hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                title="Hari Sebelumnya"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>

              <div 
                className="flex items-center gap-2 px-3 py-1 rounded-xl border shadow-xs"
                style={{
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  borderColor: 'var(--border-main, #cbd5e1)'
                }}
              >
                <Calendar className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent outline-none font-bold text-xs cursor-pointer"
                  style={{ color: 'var(--text-main, #0f172a)' }}
                />
              </div>

              <button
                onClick={() => shiftDate(1)}
                className="p-1 rounded-lg border hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                title="Hari Berikutnya"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {selectedDate !== getTodayStr() && (
                <button
                  onClick={() => setSelectedDate(getTodayStr())}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 transition-colors cursor-pointer"
                >
                  Kembali ke Hari Ini
                </button>
              )}
            </div>

            {/* Section & Universe Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Section Filter */}
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="px-2.5 py-1 rounded-xl border text-xs font-semibold outline-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  borderColor: 'var(--border-main, #cbd5e1)',
                  color: 'var(--text-main, #0f172a)'
                }}
              >
                {SECTION_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* PT / Universe Filter */}
              <select
                value={selectedPt}
                onChange={(e) => setSelectedPt(e.target.value)}
                className="px-2.5 py-1 rounded-xl border text-xs font-semibold outline-none cursor-pointer"
                style={{
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  borderColor: 'var(--border-main, #cbd5e1)',
                  color: 'var(--text-main, #0f172a)'
                }}
              >
                <option value="TBP">Universe TBP / GPS</option>
                <option value="GTS">Universe GTS</option>
                <option value="ALL">Semua Universe</option>
              </select>

              {/* PIC Filter (if tasks available) */}
              {uniquePics.length > 0 && (
                <select
                  value={picFilter}
                  onChange={(e) => setPicFilter(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border text-xs font-semibold outline-none cursor-pointer"
                  style={{
                    backgroundColor: 'var(--card-bg, #ffffff)',
                    borderColor: 'var(--border-main, #cbd5e1)',
                    color: 'var(--text-main, #0f172a)'
                  }}
                >
                  <option value="ALL">Semua PIC ({uniquePics.length})</option>
                  {uniquePics.map(p => (
                    <option key={p.nik} value={p.nik}>{p.name}</option>
                  ))}
                </select>
              )}

              {/* Search Bar */}
              <div 
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border"
                style={{
                  backgroundColor: 'var(--card-bg, #ffffff)',
                  borderColor: 'var(--border-main, #cbd5e1)'
                }}
              >
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kegiatan/PIC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent outline-none text-xs w-28 sm:w-36 font-medium"
                  style={{ color: 'var(--text-main, #0f172a)' }}
                />
              </div>

              <button
                onClick={fetchTasks}
                className="p-1 rounded-xl border hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                title="Muat ulang data"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto px-4 py-5 space-y-6">
        {/* KPI Summary Cards */}
        {summaryData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div 
              className="p-3 rounded-2xl border shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #e2e8f0)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted, #64748b)' }}>Fokus Hari Ini</span>
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Clock className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xl font-black mt-1">{summaryData.totalToday} <span className="text-xs font-normal font-sans text-slate-400">task</span></p>
              <p className="text-[10px] text-blue-500 font-medium mt-0.5">{summaryData.openToday} Open • {summaryData.inProgressToday} In Progress</p>
            </div>

            <div 
              className="p-3 rounded-2xl border shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #e2e8f0)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted, #64748b)' }}>Selesai Hari Ini</span>
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xl font-black mt-1 text-emerald-600 dark:text-emerald-400">{summaryData.completedToday}</p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Resolved & Closed</p>
            </div>

            <div 
              className="p-3 rounded-2xl border shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #e2e8f0)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted, #64748b)' }}>Evaluasi Kemarin</span>
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <RotateCcw className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xl font-black mt-1">{summaryData.completedYesterday} / {summaryData.totalYesterday}</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">{summaryData.pendingYesterday} pending carry-over</p>
            </div>

            <div 
              className="p-3 rounded-2xl border shadow-xs"
              style={{
                backgroundColor: 'var(--card-bg, #ffffff)',
                borderColor: 'var(--border-main, #e2e8f0)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted, #64748b)' }}>Penyelesaian</span>
                <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                </span>
              </div>
              <p className="text-xl font-black mt-1 text-teal-600 dark:text-teal-400">
                {summaryData.totalToday > 0 ? Math.round((summaryData.completedToday / summaryData.totalToday) * 100) : 0}%
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Target harian P5M</p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TWO-COLUMN LAYOUT: YESTERDAY EVALUATION vs TODAY ON-GOING FOCUS           */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* 1. COLUMN KIRI: EVALUASI PEKERJAAN KEMARIN */}
          <div 
            className="rounded-3xl border shadow-sm p-4 space-y-4"
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              borderColor: 'var(--border-main, #e2e8f0)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
              <div>
                <h2 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>1. Evaluasi Tugas Kemarin</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    {summaryData?.yesterdayDate || 'Kemarin'}
                  </span>
                </h2>
                <p className="text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                  Evaluasi hasil kerja, hambatan di lapangan, dan penyelesaian tugas
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                {filteredYesterday.length} Task
              </span>
            </div>

            {/* Yesterday Task List */}
            {filteredYesterday.length === 0 ? (
              <div className="py-12 text-center text-xs italic" style={{ color: 'var(--text-muted, #64748b)' }}>
                Tidak ada data tugas yang tercatat pada hari kemarin.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredYesterday.map((task) => {
                  const parsed = parseTasklist(task.description || '');
                  const isDone = task.status === 'Resolved' || task.status === 'Done' || task.status === 'Closed';

                  return (
                    <div 
                      key={task.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isDone 
                          ? 'border-emerald-500/30 bg-emerald-500/5' 
                          : 'border-amber-500/30 bg-amber-500/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold font-mono border bg-slate-500/10 text-slate-600 dark:text-slate-300">
                              {task.section}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              task.priority === 'Urgent' ? 'bg-rose-500/15 text-rose-600' :
                              task.priority === 'High' ? 'bg-amber-500/15 text-amber-600' :
                              'bg-slate-500/10 text-slate-500'
                            }`}>
                              {task.priority}
                            </span>
                          </div>
                          <h3 className="font-bold text-xs sm:text-sm leading-tight text-slate-900 dark:text-slate-100">
                            {task.title}
                          </h3>
                        </div>

                        {/* Dropdown Status */}
                        <div className="shrink-0">
                          <NotionDropdownCell
                            type="status"
                            value={task.status}
                            onChange={(newVal) => handleStatusChange(task.id, newVal)}
                          />
                        </div>
                      </div>

                      {/* PIC & Assigner Details */}
                      <div className="mt-2.5 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px]" style={{ borderColor: 'var(--border-main, #e2e8f0)', color: 'var(--text-muted, #64748b)' }}>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-teal-500" />
                          <span>PIC: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{task.assigneeName}</strong></span>
                        </div>
                        <div>
                          <span>Arahan: <em className="italic">{task.assignedByName}</em></span>
                        </div>
                      </div>

                      {/* Subtasks Progress if any */}
                      {parsed.hasTasklist && (
                        <div className="mt-2 pt-2 border-t space-y-1.5" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span style={{ color: 'var(--text-muted, #64748b)' }}>Subtask Checklist:</span>
                            <span className="font-bold">{parsed.completed}/{parsed.total} ({parsed.percent}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${parsed.percent}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Carry over action if not yet done */}
                      {!isDone && (
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleCarryOverTask(task)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 transition-colors cursor-pointer"
                          >
                            <ArrowRight className="w-3 h-3" />
                            <span>Lanjutkan ke Fokus Hari Ini</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. COLUMN KANAN: FOKUS & ON-GOING HARI INI */}
          <div 
            className="rounded-3xl border shadow-sm p-4 space-y-4"
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              borderColor: 'var(--border-main, #e2e8f0)'
            }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
              <div>
                <h2 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse" />
                  <span>2. Fokus & On-Going Task Hari Ini</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                    {summaryData?.todayDate || 'Hari Ini'}
                  </span>
                </h2>
                <p className="text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                  Daftar arahan kegiatan yang dieksekusi hari ini oleh bawahan & PIC
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(true)}
                className="p-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Tambah arahan tugas baru"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tambah</span>
              </button>
            </div>

            {/* Today Task List */}
            {filteredToday.length === 0 ? (
              <div className="py-12 text-center text-xs italic" style={{ color: 'var(--text-muted, #64748b)' }}>
                Belum ada tugas yang ditugaskan untuk hari ini. Klik <strong className="text-teal-600 cursor-pointer" onClick={() => setShowAssignModal(true)}>+ Arahan Tugas Baru</strong> untuk menambahkan.
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredToday.map((task) => {
                  const parsed = parseTasklist(task.description || '');
                  const isDone = task.status === 'Resolved' || task.status === 'Done' || task.status === 'Closed';

                  return (
                    <div 
                      key={task.id}
                      className="p-4 rounded-2xl border shadow-xs transition-all hover:border-teal-500/50"
                      style={{
                        backgroundColor: 'var(--input-bg, #f8fafc)',
                        borderColor: 'var(--border-main, #e2e8f0)'
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-bold font-mono border bg-slate-500/10 text-slate-700 dark:text-slate-300">
                              {task.section}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                              task.priority === 'Urgent' ? 'bg-rose-500/15 text-rose-600 animate-pulse' :
                              task.priority === 'High' ? 'bg-amber-500/15 text-amber-600' :
                              'bg-slate-500/10 text-slate-500'
                            }`}>
                              {task.priority}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-blue-500/10 text-blue-600">
                              Target: {task.targetDate || 'Hari ini'}
                            </span>
                          </div>
                          
                          <h3 className="font-bold text-sm sm:text-base leading-snug text-slate-900 dark:text-slate-100">
                            {task.title}
                          </h3>
                        </div>

                        {/* Dropdown Status Selector (Realtime Sync to Bulletin) */}
                        <div className="shrink-0">
                          <NotionDropdownCell
                            type="status"
                            value={task.status}
                            onChange={(newVal) => handleStatusChange(task.id, newVal)}
                          />
                        </div>
                      </div>

                      {/* Interactive Subtask Checklist Items (Direct Checkable in Log Book) */}
                      {parsed.hasTasklist && (
                        <div className="mt-3 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-mono">
                            <span className="font-semibold text-slate-500">Progress Checklist:</span>
                            <span className="font-bold text-teal-600 dark:text-teal-400">{parsed.completed}/{parsed.total} ({parsed.percentage}%)</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${parsed.percentage}%` }} />
                          </div>

                          <div className="space-y-1.5 pt-1">
                            {parsed.items.map((item) => (
                              <label
                                key={item.index}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-start gap-2 text-xs cursor-pointer select-none group/item hover:text-teal-600 transition-colors"
                              >
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={() => handleToggleSubtask(task, item.index)}
                                  className="mt-0.5 w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                                />
                                <span className={`flex-1 ${item.checked ? 'line-through opacity-50' : 'font-medium'}`}>
                                  {item.text}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* PIC & Assigner Footer */}
                      <div className="mt-3 pt-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-[11px]" style={{ borderColor: 'var(--border-main, #e2e8f0)', color: 'var(--text-muted, #64748b)' }}>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-teal-500" />
                          <span>PIC: <strong className="text-slate-800 dark:text-slate-200 font-bold">{task.assigneeName}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Ditugaskan oleh: <strong className="text-slate-600 dark:text-slate-400">{task.assignedByName}</strong></span>
                          {task.bulletinPostId && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono text-teal-600 dark:text-teal-400">
                              <FileText className="w-3 h-3" />
                              <span>Synced</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ASSIGN NEW TASK / ARAHAN MEETING PAGI                              */}
      {/* ========================================================================= */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            style={{
              backgroundColor: 'var(--card-bg, #ffffff)',
              borderColor: 'var(--border-main, #cbd5e1)',
              color: 'var(--text-main, #0f172a)'
            }}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                  <Briefcase className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base">Assign Tugas / Arahan Meeting Pagi</h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                    Tugaskan kegiatan ke bawahan & otomatis sinkronkan ke dokumen Buletin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAssignTaskSubmit} className="p-4 sm:p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Judul Kegiatan */}
              <div className="space-y-1">
                <label className="text-xs font-bold block">Judul Kegiatan / Arahan *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Kalibrasi Furnace & Pembuatan Reagen Baru..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-medium focus:border-teal-500"
                  style={{
                    backgroundColor: 'var(--input-bg, #f8fafc)',
                    borderColor: 'var(--border-main, #cbd5e1)'
                  }}
                />
              </div>

              {/* Seksi & PIC Bawahan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold block">Seksi Pelaksana</label>
                  <select
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: 'var(--input-bg, #f8fafc)',
                      borderColor: 'var(--border-main, #cbd5e1)'
                    }}
                  >
                    {SECTION_OPTIONS.filter(s => s !== 'Semua Seksi').map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold block">Pilih PIC Bawahan *</label>
                  <select
                    required
                    value={newAssigneeNik}
                    onChange={(e) => {
                      setNewAssigneeNik(e.target.value);
                      const emp = employeesList.find(x => x.nik === e.target.value);
                      if (emp) setNewAssigneeName(emp.name);
                    }}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: 'var(--input-bg, #f8fafc)',
                      borderColor: 'var(--border-main, #cbd5e1)'
                    }}
                  >
                    <option value="">-- Pilih Karyawan PIC --</option>
                    {employeesList.map(emp => (
                      <option key={emp.nik} value={emp.nik}>
                        {emp.name} ({emp.section || emp.department || 'Personil'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prioritas & Target Jam */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold block">Prioritas</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: 'var(--input-bg, #f8fafc)',
                      borderColor: 'var(--border-main, #cbd5e1)'
                    }}
                  >
                    {PRIORITY_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold block">Target Waktu Selesai</label>
                  <input
                    type="text"
                    placeholder="Contoh: 17:00 WITA atau Besok Siang"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-medium focus:border-teal-500"
                    style={{
                      backgroundColor: 'var(--input-bg, #f8fafc)',
                      borderColor: 'var(--border-main, #cbd5e1)'
                    }}
                  />
                </div>
              </div>

              {/* Rincian Arahan & Subtask Checklist */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold block">Rincian & Subtask Checklist</label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewDescription(prev => (prev ? prev + '\n- [ ] ' : '- [ ] '));
                    }}
                    className="text-[10px] text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer"
                  >
                    + Sisipkan Checklist
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder={`Contoh:\n- [ ] Siapkan sampel standar\n- [ ] Lakukan verifikasi timbangan analitik\n- [ ] Input data ke portal`}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-mono focus:border-teal-500"
                  style={{
                    backgroundColor: 'var(--input-bg, #f8fafc)',
                    borderColor: 'var(--border-main, #cbd5e1)'
                  }}
                />
                <p className="text-[10px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                  Gunakan format <code>- [ ]</code> untuk membuat item checklist yang bisa diceklis bawahan.
                </p>
              </div>

              {/* Hubungkan ke Dokumen Buletin (Sinkronisasi Otomatis) */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-bold block">Hubungkan ke Tabel Buletin (Opsional)</label>
                <select
                  value={selectedBulletinPostId}
                  onChange={(e) => setSelectedBulletinPostId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border outline-none text-xs font-medium cursor-pointer"
                  style={{
                    backgroundColor: 'var(--input-bg, #f8fafc)',
                    borderColor: 'var(--border-main, #cbd5e1)'
                  }}
                >
                  <option value="">-- Buat di Log Book Saja (Tanpa Buletin Tertentu) --</option>
                  {bulletinList.map(b => (
                    <option key={b.id} value={b.id}>
                      #{b.id} {b.title || b.category} ({b.department})
                    </option>
                  ))}
                </select>
                <p className="text-[10px]" style={{ color: 'var(--text-muted, #64748b)' }}>
                  Jika dipilih, tugas akan otomatis disisipkan ke tabel database dokumen buletin tersebut.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border-main, #e2e8f0)' }}>
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--border-main, #cbd5e1)' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Menugaskan...' : 'Tugaskan & Terbitkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
