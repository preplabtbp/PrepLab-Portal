import { translateDisplayText } from './notion/logbook-section-utils';
import React, { useState, useMemo } from 'react';
import { 
  Home, 
  Calendar, 
  ExternalLink, 
  ChevronRight,
  ChevronLeft,
  Link as LinkIcon,
  CheckCircle2,
  MessageSquare,
  CalendarDays,
  Clock,
  MapPin,
  Camera,
  Image as ImageIcon,
  Sparkles,
  X,
  Check,
  GripVertical,
  ArrowUpDown,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Pencil,
  Plus,
  Trash2,
  Edit3,
  Settings2,
  Loader2,
  Palette,
  Pipette
} from 'lucide-react';
import { toast } from 'sonner';
import { PortalImagePickerModal } from './PortalImagePickerModal';
import { BannerCover } from './BannerCover';


export const TITLE_COLOR_PALETTE = [
  { hex: '#0f172a', label: 'Hitam / Slate (Default)' },
  { hex: '#0d9488', label: 'Teal Harita' },
  { hex: '#2563eb', label: 'Biru Safir' },
  { hex: '#0284c7', label: 'Sky Blue' },
  { hex: '#16a34a', label: 'Hijau Emerald' },
  { hex: '#7c3aed', label: 'Ungu Modern' },
  { hex: '#e11d48', label: 'Rose / Merah' },
  { hex: '#ea580c', label: 'Oranye Hangat' },
  { hex: '#d97706', label: 'Amber / Emas' },
];

export const COVER_PRESETS = [
  { id: 'mining_site', name: 'Site Tambang Nikel', url: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?q=80&w=1600&auto=format&fit=crop' },
  { id: 'lab_modern', name: 'Laboratorium Kimia Modern', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop' },
  { id: 'metallurgy', name: 'Analisis Spektrum XRF', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=1600&auto=format&fit=crop' },
  { id: 'industrial', name: 'Industrial & Crusher Plant', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=1600&auto=format&fit=crop' },
  { id: 'mineral_rock', name: 'Geologi Ore & Mineral', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600&auto=format&fit=crop' },
  { id: 'teal_gradient', name: 'Minimalist Teal Glow', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop' }
];

interface SectionHubDashboardProps {
  post: any;
  posts: any[];
  activePt?: string;
  onSelectPost: (post: any) => void;
  onGoHome: () => void;
  agendaEvents?: any[];
  onOpenCalendar?: () => void;
}

interface HubItem {
  title: string;
  icon: string;
  isLogbook?: boolean;
  searchKeywords?: string[];
  linkUrl?: string;
}

// Helper to load and save custom menu items (order + customized title/icon/linkUrl) per section hub
function loadOrderedHubItems(section: string, type: 'info' | 'rules', defaultItems: HubItem[]): HubItem[] {
  try {
    const cleanSec = (section || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const translatedCleanSec = (translateDisplayText(section) || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const key = `preplab_hub_custom_items_${cleanSec}_${type}`;
    let raw = localStorage.getItem(key);
    if (!raw && translatedCleanSec !== cleanSec) {
      raw = localStorage.getItem(`preplab_hub_custom_items_${translatedCleanSec}_${type}`);
    }
    if (raw) {
      const parsed: HubItem[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Backward compatibility: check if order-only was saved
    const legacyKey = `preplab_hub_order_${cleanSec}_${type}`;
    const legacyRaw = localStorage.getItem(legacyKey);
    if (legacyRaw) {
      const titlesOrder: string[] = JSON.parse(legacyRaw);
      const itemMap = new Map(defaultItems.map(i => [i.title, i]));
      const ordered: HubItem[] = [];
      titlesOrder.forEach(t => {
        if (itemMap.has(t)) {
          ordered.push(itemMap.get(t)!);
          itemMap.delete(t);
        }
      });
      itemMap.forEach(i => ordered.push(i));
      return ordered;
    }
    return defaultItems;
  } catch {
    return defaultItems;
  }
}

function saveOrderedHubItems(section: string, type: 'info' | 'rules', items: HubItem[]): void {
  try {
    const cleanSec = (section || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const key = `preplab_hub_custom_items_${cleanSec}_${type}`;
    localStorage.setItem(key, JSON.stringify(items));
    // Also save legacy key for compatibility
    const legacyKey = `preplab_hub_order_${cleanSec}_${type}`;
    localStorage.setItem(legacyKey, JSON.stringify(items.map(i => i.title)));
  } catch {}
}


export function SectionHubDashboard({
  post,
  posts,
  activePt,
  onSelectPost,
  onGoHome,
  agendaEvents = [],
  onOpenCalendar
}: SectionHubDashboardProps) {
  const sectionTitle = (post?.title || '').toUpperCase().trim();

  // Strict PT universe isolation: GTS vs TBP/GPS
  const currentUniverse = (activePt === 'GTS' || post?.pt === 'GTS' || post?.universe === 'GTS') ? 'GTS' : 'TBP';
  const eligiblePosts = posts.filter(p => {
    const pUniverse = (p.pt === 'GTS' || p.universe === 'GTS') ? 'GTS' : 'TBP';
    return pUniverse === currentUniverse;
  });

  // Cover Image Customization State
  const [currentCover, setCurrentCover] = useState<string>(post?.coverImage || '');
  const [showCoverModal, setShowCoverModal] = useState<boolean>(false);
  const [coverInputUrl, setCoverInputUrl] = useState<string>('');
  const [isSavingCover, setIsSavingCover] = useState<boolean>(false);

  const handleSaveCover = async (urlToSave: string) => {
    if (!post?.id) return;
    setIsSavingCover(true);
    try {
      const res = await fetch(`/api/bulletin/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...post,
          coverImage: urlToSave
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setCurrentCover(urlToSave);
        if (post) post.coverImage = urlToSave;
        setShowCoverModal(false);
        toast.success('Cover gambar Labnote berhasil disimpan!');
      } else {
        toast.error(json.message || 'Gagal menyimpan cover gambar');
      }
    } catch {
      toast.error('Gagal memperbarui cover gambar');
    } finally {
      setIsSavingCover(false);
    }
  };

  // State for Double-Click Inline Editing of Section Title & Font Color
  const getInitialTitleColor = (): string => {
    const cleanSec = (post?.title || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const translatedCleanSec = (translateDisplayText(post?.title || '') || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const tagColor = (post?.tags || []).find((t: string) => t.startsWith('titleColor:'))?.replace('titleColor:', '');
    if (tagColor) return tagColor;
    try {
      let cached = localStorage.getItem(`preplab_hub_title_color_${cleanSec}`);
      if (!cached && translatedCleanSec !== cleanSec) {
        cached = localStorage.getItem(`preplab_hub_title_color_${translatedCleanSec}`);
      }
      if (cached) return cached;
    } catch {}
    return '#0f172a';
  };

  const [displayedTitle, setDisplayedTitle] = useState<string>(post?.title || '');
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [titleInput, setTitleInput] = useState<string>(post?.title || '');
  const [isSavingTitle, setIsSavingTitle] = useState<boolean>(false);
  const [titleColor, setTitleColor] = useState<string>(getInitialTitleColor);
  const [editingTitleColor, setEditingTitleColor] = useState<string>(getInitialTitleColor);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);

  // Sync title & color when post changes
  React.useEffect(() => {
    setDisplayedTitle(post?.title || '');
    setTitleInput(post?.title || '');
    const col = getInitialTitleColor();
    setTitleColor(col);
    setEditingTitleColor(col);
  }, [post?.title, post?.tags]);

  const handleStartEditTitle = () => {
    setTitleInput(displayedTitle || post?.title || '');
    setEditingTitleColor(titleColor);
    setIsEditingTitle(true);
    setShowColorPicker(false);
  };

  const handleSaveTitle = async () => {
    const trimmed = titleInput.trim();
    if (!trimmed) {
      toast.error('Judul seksi tidak boleh kosong');
      return;
    }
    const colorChanged = editingTitleColor !== titleColor;
    if (trimmed === displayedTitle && !colorChanged) {
      setIsEditingTitle(false);
      setShowColorPicker(false);
      return;
    }

    const cleanSec = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const existingTags = (post?.tags || []).filter((t: string) => !t.startsWith('titleColor:'));
    if (editingTitleColor && editingTitleColor !== '#0f172a' && editingTitleColor !== 'default') {
      existingTags.push(`titleColor:${editingTitleColor}`);
    }

    try {
      const translatedCleanSec = (translateDisplayText(trimmed) || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      localStorage.setItem(`preplab_hub_title_color_${cleanSec}`, editingTitleColor);
      if (translatedCleanSec !== cleanSec) {
        localStorage.setItem(`preplab_hub_title_color_${translatedCleanSec}`, editingTitleColor);
      }
    } catch {}

    if (!post?.id) {
      setDisplayedTitle(trimmed);
      setTitleColor(editingTitleColor);
      setIsEditingTitle(false);
      setShowColorPicker(false);
      return;
    }

    setIsSavingTitle(true);
    try {
      const res = await fetch(`/api/bulletin/${post.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...post,
          title: trimmed,
          tags: existingTags
        })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setDisplayedTitle(trimmed);
        setTitleColor(editingTitleColor);
        if (post) {
          post.title = trimmed;
          post.tags = existingTags;
        }
        setIsEditingTitle(false);
        setShowColorPicker(false);
        toast.success(`Judul & warna berhasil disimpan`);
      } else {
        toast.error(json.message || 'Gagal menyimpan perubahan');
      }
    } catch {
      toast.error('Terjadi kesalahan saat menyimpan perubahan');
    } finally {
      setIsSavingTitle(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingTitle(false);
      setShowColorPicker(false);
      setTitleInput(displayedTitle);
      setEditingTitleColor(titleColor);
    }
  };

  // Calendar State for Section Agenda
  const [currentCalDate, setCurrentCalDate] = useState(() => new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<{ dateStr: string; events: any[] } | null>(null);

  // Helper to find target post from database by keywords or title
  const findPost = (keywords: string[] | string): any => {
    const rawList = Array.isArray(keywords) ? keywords : [keywords];
    const expandedList: string[] = [];
    
    rawList.forEach(k => {
      expandedList.push(k);
      const kLower = k.toLowerCase();
      if (kLower.includes('warehouse')) {
        expandedList.push(k.replace(/warehouse/gi, 'Inventory'));
      }
      if (kLower.includes('inventory')) {
        expandedList.push(k.replace(/inventory/gi, 'Warehouse'));
      }
    });

    for (const kw of expandedList) {
      const q = kw.toLowerCase().trim();
      
      // Look for candidates that match by numeric ID strictly in the same PT universe, then fallback to all posts
      if (/^\d+$/.test(q)) {
        const idNum = parseInt(q, 10);
        const idMatch = eligiblePosts.find((p) => p.id === idNum) || posts.find((p) => p.id === idNum);
        if (idMatch) return idMatch;
      }

      // 1. Exact matches (cleaned title)
      const exactMatches = eligiblePosts.filter(
        (p) => (p.title || '').replace(/^[#\s\-*]+/, '').toLowerCase().trim() === q
      );
      if (exactMatches.length > 0) {
        const sorted = [...exactMatches].sort((a, b) => (b.content?.length || 0) - (a.content?.length || 0));
        const tableMatch = sorted.find((p) => p.content && p.content.includes('|'));
        return tableMatch || sorted[0];
      }

      // 2. Exact match with section prefix or suffix (e.g. "Daily Laboratorium" or "Daily")
      const sectionMatches = eligiblePosts.filter((p) => {
        const t = (p.title || '').replace(/^[#\s\-*]+/, '').toLowerCase().trim();
        return t === `${q} ${sectionTitle.toLowerCase()}` || t === `${sectionTitle.toLowerCase()} ${q}`;
      });
      if (sectionMatches.length > 0) {
        const tableMatch = sectionMatches.find((p) => p.content && p.content.includes('|'));
        return tableMatch || sectionMatches[0];
      }

      // 3. Match containing both keyword and section
      const bothMatches = eligiblePosts.filter((p) => {
        const t = (p.title || '').replace(/^[#\s\-*]+/, '').toLowerCase().trim();
        return t.includes(q) && (t.includes(sectionTitle.toLowerCase()) || sectionTitle.toLowerCase().includes(t));
      });
      if (bothMatches.length > 0) {
        const tableMatch = bothMatches.find((p) => p.content && p.content.includes('|'));
        return tableMatch || bothMatches[0];
      }

      // 4. Slug match (e.g. "daily-laboratory" matching "Daily Laboratory")
      const qSlug = q.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (qSlug.length > 2) {
        const slugMatch = eligiblePosts.find((p) => {
          const pSlug = (p.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          return pSlug === qSlug;
        }) || posts.find((p) => {
          const pSlug = (p.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          return pSlug === qSlug;
        });
        if (slugMatch) return slugMatch;
      }

      // 5. General match within same PT
      const generalMatches = eligiblePosts.filter((p) => (p.title || '').replace(/^[#\s\-*]+/, '').toLowerCase().trim().includes(q));
      if (generalMatches.length > 0) {
        const tableMatch = generalMatches.find((p) => p.content && p.content.includes('|'));
        return tableMatch || generalMatches[0];
      }
    }
    return null;
  };

  const handleItemClick = async (item: HubItem) => {
    if (item.linkUrl) {
      window.open(item.linkUrl, '_blank');
      return;
    }
    // If posts are still loading in background, findPost will return null and seamlessly open fallbackPost
    if (item.isLogbook || item.title.toLowerCase().includes('logbook')) {
      const logbookTitle = item.title;
      const logbookId = `logbook-${sectionTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      let cachedContent = '';
      try {
        cachedContent = localStorage.getItem(`preplab_logbook_content_${logbookId}`) || '';
      } catch {}
      const defaultContent = `# ${logbookTitle}\n\n*Integrated Section Logbook (${sectionTitle}): Active Routine & Non-Routine tasks.*\n\n| Number | Activity Name | Description | Created Time | Completion Date | Remarks | Due Date | Status | PIC | Priority | Activity | Period | Source Page |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n`;
      const target = findPost(item.searchKeywords || logbookTitle) || {
        id: logbookId,
        title: logbookTitle,
        department: 'Prep & Lab',
        category: sectionTitle,
        isLogbook: true,
        content: (cachedContent && cachedContent.includes('|')) ? cachedContent : defaultContent
      };
      onSelectPost(target);
      return;
    }

    const target = findPost(item.searchKeywords || item.title);
    if (target) {
      onSelectPost(target);
      return;
    }

    // Direct fetch fallback if post is not yet loaded in memory but has an explicit numeric ID (e.g. 519 for Weekly Admin)
    const numericId = (item.searchKeywords || []).find((k) => /^\d+$/.test(k));
    if (numericId) {
      const loadingToast = toast.loading(`Membuka ${item.title}...`);
      try {
        const res = await fetch(`/api/bulletin/${numericId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'success' && json.data) {
            toast.dismiss(loadingToast);
            onSelectPost(json.data);
            return;
          }
        }
      } catch (err) {
        console.warn(`[SectionHub] Direct fetch for post ${numericId} notice:`, err);
      } finally {
        toast.dismiss(loadingToast);
      }

      const fallbackWithId = {
        id: parseInt(numericId, 10),
        title: item.title,
        department: 'Prep & Lab',
        category: sectionTitle,
        content: `### ${item.title}\n\n*Halaman dokumentasi untuk ${item.title} (${sectionTitle}).*\n\nSilakan klik tombol **Edit Dokumen** di kanan atas untuk mulai menulis dokumen ini.`,
        pt: currentUniverse
      };
      onSelectPost(fallbackWithId);
      return;
    }

    const fallbackPost = {
      id: `doc-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      title: item.title,
      department: 'Prep & Lab',
      category: sectionTitle,
      content: `### ${item.title}\n\n*Halaman dokumentasi untuk ${item.title} (${sectionTitle}).*\n\nSilakan klik tombol **Edit Dokumen** di kanan atas untuk mulai menulis dokumen ini.`,
      pt: currentUniverse
    };
    onSelectPost(fallbackPost);
  };

  // Section configurations matching exact Notion designs from Screenshots
  const getSectionConfig = () => {
    // 1. PROSEDUR (Image 1) - Single Column INFO with 9 items
    if (sectionTitle.includes('PROSEDUR') || sectionTitle.includes('PROCEDURE') || sectionTitle === 'SOP') {
      return {
        icon: '📙',
        bannerUrl: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Procedure Logbook', icon: '📔', isLogbook: true, searchKeywords: ['Procedure Logbook', 'Logbook Prosedur', 'Logbook'] },
          { title: 'SOP Preparation', icon: '📐', searchKeywords: ['SOP Preparation', 'SOP Preparasi', 'Preparasi Basah', 'Preparasi Kering'] },
          { title: 'JSA', icon: '💼', searchKeywords: ['JSA', 'Job Safety Analysis'] },
          { title: 'SOP Laboratory', icon: '💈', searchKeywords: ['SOP Laboratory', 'SOP Laboratorium', 'ED-XRF', 'LOI', 'Fused Bead'] },
          { title: 'SOP Smelter', icon: '🌐', searchKeywords: ['SOP Smelter', 'HJF', 'KPS'] },
          { title: 'Other SOPs', icon: '🔗', searchKeywords: ['Other SOPs', 'SOP Lainnya', 'SOP Lain'] },
          { title: 'Work Instruction Preparation (IK)', icon: '📐', searchKeywords: ['Work Instruction Preparation', 'IK Preparasi', 'Jaw Crusher', 'Pulverizer', 'Oven'] },
          { title: 'Work Instruction Laboratory (IK)', icon: '💈', searchKeywords: ['Work Instruction Laboratory', 'IK Laboratorium', 'Zetium', 'Epsilon', 'Muffle'] },
          { title: 'Flow Chart', icon: '🔀', searchKeywords: ['Flow Chart', 'Flow Sheet'] },
          { title: 'Guidance', icon: '</>', searchKeywords: ['Guidance', 'Panduan'] },
        ],
        rulesTitle: '',
        rulesItems: [],
        showAgenda: false,
        extraLinks: []
      };
    }

    // 2. INFORMATION (Image 2) - Single Column INFO with complete Notion items
    if (sectionTitle === 'INFORMATION' || sectionTitle.includes('INFORMASI')) {
      return {
        icon: '📘',
        bannerUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Logbook Information', icon: '📔', isLogbook: true, searchKeywords: ['Logbook Information', 'Logbook'] },
          { title: 'INFORMATION', icon: '📜', searchKeywords: ['Information', 'Pengumuman'] },
          { title: 'INFORMASI IT', icon: '💻', searchKeywords: ['Informasi IT', 'IT'] },
          { title: 'HARITA CORE', icon: '💎', searchKeywords: ['Harita Core', 'Core'] },
          { title: 'QR CODE', icon: '📱', searchKeywords: ['QR Code'] },
          { title: 'GOLDEN RULES', icon: '👷', searchKeywords: ['Golden Rules'] },
          { title: 'PROMOSI K3', icon: '⚠️', searchKeywords: ['Promosi K3', 'K3'] },
          { title: 'PROMOSI TRAINER', icon: '👨‍🏫', searchKeywords: ['Promosi Trainer', 'Trainer'] },
          { title: 'PROMOSI HEALTH', icon: '🏥', searchKeywords: ['Promosi Health', 'Health'] },
          { title: 'MATERI BRIEFING (SAFETY TALK)', icon: '📢', searchKeywords: ['Materi Briefing', 'Safety Talk'] },
          { title: 'SAFETY FLASH & ALERT', icon: '🚨', searchKeywords: ['Safety Flash', 'Safety Alert'] },
          { title: 'ENVORMASI COMIC', icon: '🌍', searchKeywords: ['Envormasi Comic', 'Comic'] },
          { title: 'STANDARD METHODS', icon: '📑', searchKeywords: ['Standard Methods', 'SNI'] },
          { title: 'MANUAL BOOK INSTRUMENT DAN ALAT', icon: '📘', searchKeywords: ['Manual Book', 'Instrument'] },
          { title: 'CRM', icon: '⚠️', searchKeywords: ['CRM'] },
          { title: 'INHOUSE', icon: '🏢', searchKeywords: ['Inhouse'] },
          { title: 'SPDK DAN ATURAN PERUSAHAAN', icon: '⚖️', searchKeywords: ['SPDK', 'Aturan Perusahaan'] },
          { title: 'JOB DESCRIPTION', icon: '📋', searchKeywords: ['Job Description', 'Jobdesk'] },
          { title: 'JOB PENDING', icon: '⏳', searchKeywords: ['Job Pending', 'Pending'] },
          { title: 'IM IT', icon: '📗', searchKeywords: ['IM IT', 'Internal Memo IT'] },
          { title: 'IM HR', icon: '📕', searchKeywords: ['IM HR', 'Internal Memo HR'] },
          { title: 'IM SAFETY', icon: '📘', searchKeywords: ['IM Safety', 'Internal Memo Safety'] },
          { title: 'EM QC', icon: '📙', searchKeywords: ['EM QC', 'Edaran Mutu'] },
          { title: 'KEBIJAKAN PERUSAHAAN', icon: '🏛️', searchKeywords: ['Kebijakan Perusahaan'] },
          { title: 'INDUKSI INTERNAL', icon: '🎓', searchKeywords: ['Induksi Internal'] },
          { title: 'TRAINING NEED ANALYSIS (TNA)', icon: '📈', searchKeywords: ['TNA', 'Training Need Analysis'] },
          { title: 'IDENTIFIKASI BAHAYA DAN PENGENDALIAN RESIKO (IBPR)', icon: '❗', searchKeywords: ['IBPR', 'Identifikasi Bahaya'] },
          { title: 'IDENTIFIKASI ,EVALUASI ASPEK DAN DAMPAK LINGKUNGAN (IADL)', icon: '❄️', searchKeywords: ['IADL', 'Aspek dan Dampak Lingkungan'] },
          { title: 'SECURITY RISK ASSESMENT (SRA)', icon: '🔒', searchKeywords: ['SRA', 'Security Risk Assesment'] },
          { title: 'HASIL MEETING INTERNAL PREP & LAB', icon: '👥', searchKeywords: ['Hasil Meeting Internal', 'Meeting'] },
        ],
        rulesTitle: '',
        rulesItems: [],
        showAgenda: false,
        extraLinks: []
      };
    }

    // 3. LABORATORIUM (Image 3) - 2 Columns: Soft Blue INFO + Soft Cream RULES + Agenda
    if (sectionTitle.includes('LABORATORIUM') || sectionTitle.includes('LABORATORY') || sectionTitle === 'LAB') {
      return {
        icon: '🥼',
        bannerUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Laboratory Logbook', icon: '📔', isLogbook: true, searchKeywords: ['Laboratory Logbook', 'Logbook Laboratorium', 'Logbook Lab', 'Logbook'] },
          { title: 'Non Routine Laboratory', icon: '▌', searchKeywords: ['535', '414', 'Non Routine Laboratory', 'Non Routine Laboratorium', 'Non Routine'] },
          { title: 'Daily Laboratory', icon: '▌', searchKeywords: ['541', '450', 'Daily Laboratory', 'Daily Laboratorium', 'Daily'] },
          { title: 'Routine Laboratory (Tentative)', icon: '▌', searchKeywords: ['538', 'Routine Laboratory (Tentative)', 'Routine Laboratorium (Tentative)', 'Routine Laboratorium'] },
          { title: 'Weekly Laboratory', icon: '▌', searchKeywords: ['542', '418', 'Weekly Laboratory', 'Weekly Laboratorium'] },
          { title: 'Monthly Laboratory', icon: '▌', searchKeywords: ['543', '413', 'Monthly Laboratory', 'Monthly Laboratorium'] },
          { title: 'Quarterly Laboratory', icon: '▌', searchKeywords: ['545', '415', 'Quarterly Laboratory', 'Quarterly Laboratorium'] },
          { title: 'Yearly Laboratory', icon: '▌', searchKeywords: ['549', '474', 'Yearly Laboratory', 'Yearly Laboratorium'] },
          { title: 'Biannual Laboratory', icon: '▌', searchKeywords: ['564', '473', 'Biannual Laboratory', 'Biannual Laboratorium'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Kedatangan Visitor/Vendor', icon: '✈️', searchKeywords: ['Kedatangan Visitor/Vendor', 'Visitor', 'Vendor'] },
          { title: 'Sampel Check Assay (CA)', icon: '📝', searchKeywords: ['Sampel Check Assay', 'CA', 'Check Assay'] },
          { title: 'Pengiriman TLD Badge ke BRIN', icon: '📋', searchKeywords: ['Pengiriman TLD Badge ke BRIN', 'TLD Badge BRIN', 'BRIN'] },
          { title: 'Pengiriman TLD Badge ke Gamaxindo', icon: '📋', searchKeywords: ['Pengiriman TLD Badge ke Gamaxindo', 'Gamaxindo'] },
          { title: 'Pengiriman Surveymeter & Pendose', icon: '🖊️', searchKeywords: ['Pengiriman Surveymeter & Pendose', 'Surveymeter', 'Pendose'] },
          { title: 'Penghapusan data Asset', icon: '🗑️', searchKeywords: ['Penghapusan data Asset', 'Data Asset', 'Asset'] },
          { title: 'Laboratory Information', icon: '📦', searchKeywords: ['Laboratory Information', 'Information Laboratorium', '576'] },
        ],
        showAgenda: true,
        extraLinks: []
      };
    }

    // 4. ADMINISTRASI
    if (sectionTitle.includes('ADMINISTRASI') || sectionTitle.includes('ADMINISTRATION') || sectionTitle === 'ADMIN') {
      return {
        icon: '📋',
        bannerUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Logbook Administrasi', icon: '📔', isLogbook: true, searchKeywords: ['Logbook Administrasi', 'Logbook Admin', 'Logbook'] },
          { title: 'Non Routine', icon: '▌', searchKeywords: ['517', 'Non Routine Administrasi', 'Non Routine Admin', 'Non Routine'] },
          { title: 'Daily', icon: '▌', searchKeywords: ['425', 'Daily Administrasi', 'Daily Admin', 'Daily'] },
          { title: 'Weekly', icon: '▌', searchKeywords: ['519', 'Weekly Administrasi', 'Weekly Admin', 'Weekly'] },
          { title: 'Monthly', icon: '▌', searchKeywords: ['520', 'Monthly Administrasi', 'Monthly Admin', 'Monthly'] },
          { title: 'Biannual', icon: '▌', searchKeywords: ['521', 'Biannual Administrasi', 'Biannual Admin', 'Biannual'] },
          { title: 'Yearly', icon: '▌', searchKeywords: ['522', 'Yearly Administrasi', 'Yearly Admin', 'Yearly'] },
          { title: 'Archived', icon: '▌', searchKeywords: ['523', 'Archived Administrasi', 'Archived Admin', 'Archived'] },
          { title: 'PIC Job Admin', icon: '▌', searchKeywords: ['PIC Job Admin', 'Job Admin'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Karyawan Baru', icon: '💃', searchKeywords: ['524', 'Karyawan Baru'] },
          { title: 'Cuti Karyawan', icon: '✈', searchKeywords: ['525', 'Cuti Karyawan'] },
          { title: 'Induksi Online Karyawan Balik Cuti', icon: '📝', searchKeywords: ['526', 'Induksi Online'] },
          { title: 'TES SIMPER', icon: '🚒', searchKeywords: ['527', 'TES SIMPER', 'SIMPER'] },
          { title: 'Interview Kandidat', icon: '⁉', searchKeywords: ['528', 'Interview'] },
          { title: 'Pengajuan PTK', icon: '➕', searchKeywords: ['529', 'Pengajuan PTK', 'PTK'] },
          { title: 'Penilaian Karyawan', icon: '🎴', searchKeywords: ['530', 'Penilaian Karyawan'] },
          { title: 'Meal Order', icon: '🍲', searchKeywords: ['531', 'Meal Order'] },
          { title: 'Information Administrasi', icon: '📄', searchKeywords: ['532', 'Information Administrasi'] },
          { title: 'Jam Kerja Karyawan', icon: '⏰', searchKeywords: ['533', 'Jam Kerja Karyawan'] },
        ],
        showAgenda: true,
        extraLinks: [
          { title: 'Linktree Administrasi PrepLab', url: 'https://linktr.ee/Administrasi.PrepLab' }
        ]
      };
    }

    // 5. PREPARASI
    if (sectionTitle.includes('PREPARASI') || sectionTitle.includes('PREPARATION') || sectionTitle === 'PREP') {
      return {
        icon: '🪨',
        bannerUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Preparation Logbook', icon: '📔', isLogbook: true, searchKeywords: ['Preparation Logbook', 'Logbook Preparasi', 'Logbook Prep', 'Logbook'] },
          { title: 'Non Routine Preparation', icon: '▌', searchKeywords: ['Non Routine Preparation', 'Non Routine Preparasi', '636'] },
          { title: 'Daily Preparation', icon: '▌', searchKeywords: ['Daily Preparation', 'Daily Preparasi', '637'] },
          { title: 'Weekly Preparation', icon: '▌', searchKeywords: ['Weekly Preparation', 'Weekly Preparasi', '638'] },
          { title: 'Monthly Preparation', icon: '▌', searchKeywords: ['Monthly Preparation', 'Monthly Preparasi', '639'] },
          { title: 'Quarterly Preparation', icon: '▌', searchKeywords: ['Quarterly Preparation', 'Quarterly Preparasi', '640'] },
          { title: 'Biannual Preparation', icon: '▌', searchKeywords: ['Biannual Preparation', 'Biannual Preparasi', '641'] },
          { title: 'Yearly Preparation', icon: '▌', searchKeywords: ['Yearly Preparation', 'Yearly Preparasi', '642'] },
          { title: 'Archived', icon: '▌', searchKeywords: ['Archived Preparation', 'Archived Preparasi', '634', 'Archived'] },
          { title: 'Preparation Information', icon: '▌', searchKeywords: ['Preparation Information', 'Information Preparasi', '643'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Pengangkutan Remainder', icon: '🚜', searchKeywords: ['PENGANGKUTAN REMAINDER', '632'] },
          { title: 'Pengerjaan Batuan/Boulder (LIM/SAP/BLEND)', icon: '🪨', searchKeywords: ['PENGERJAAN BATUAN', 'Boulder', '633'] },
        ],
        showAgenda: true,
        extraLinks: []
      };
    }

    // 6. QUALITY ASSURANCE
    if (sectionTitle.includes('QUALITY ASSURANCE') || sectionTitle === 'QA') {
      return {
        icon: '🛡️',
        bannerUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Quality Assurance Logbook', icon: '📔', isLogbook: true, searchKeywords: ['Quality Assurance Logbook', 'Logbook Quality Assurance', 'Logbook QA', 'Logbook'] },
          { title: 'Non Routine Quality Assurance', icon: '▌', searchKeywords: ['Non Routine Quality Assurance', '406'] },
          { title: 'Daily Quality Assurance', icon: '▌', searchKeywords: ['Daily Quality Assurance', '448'] },
          { title: 'Weekly Quality Assurance', icon: '▌', searchKeywords: ['Weekly Quality Assurance', '423'] },
          { title: 'Monthly Quality Assurance', icon: '▌', searchKeywords: ['Monthly Quality Assurance', '426'] },
          { title: 'Quarterly Quality Assurance', icon: '▌', searchKeywords: ['Quarterly Quality Assurance', '439'] },
          { title: 'Biannual Quality Assurance', icon: '▌', searchKeywords: ['Biannual Quality Assurance', '472'] },
          { title: 'Yearly Quality Assurance', icon: '▌', searchKeywords: ['Yearly Quality Assurance', '438'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Quality Assurance Information', icon: '📄', searchKeywords: ['Quality Assurance Information', 'Information Quality Assurance', '445'] },
          { title: 'Pengajuan PTK QA', icon: '➕', searchKeywords: ['Pengajuan PTK', '77'] },
          { title: 'Weekly Mutu', icon: '🏆', searchKeywords: ['weekly mutu', '582'] },
          { title: 'Standard QC & QA SOP', icon: '📘', searchKeywords: ['Standard Methods'] },
        ],
        showAgenda: true,
        extraLinks: []
      };
    }

    // 7. MAINTENANCE
    if (sectionTitle.includes('MAINTENANCE')) {
      return {
        icon: '🔧',
        bannerUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Logbook Maintenance', icon: '📔', isLogbook: true, searchKeywords: ['Logbook Maintenance', 'Logbook'] },
          { title: 'Non Routine Maintenance', icon: '▌', searchKeywords: ['Non Routine Maintenance', '412'] },
          { title: 'Daily Maintenance', icon: '▌', searchKeywords: ['Daily Maintenance', '427'] },
          { title: 'Weekly Maintenance', icon: '▌', searchKeywords: ['Weekly Maintenance', '424'] },
          { title: 'Monthly Maintenance', icon: '▌', searchKeywords: ['Monthly Maintenance', '422'] },
          { title: 'Quarterly Maintenance', icon: '▌', searchKeywords: ['Quarterly Maintenance', '428'] },
          { title: 'Biannual Maintenance', icon: '▌', searchKeywords: ['Biannual Maintenance', '465'] },
          { title: 'Yearly Maintenance', icon: '▌', searchKeywords: ['Yearly Maintenance', '464'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Information Maintenance', icon: '📄', searchKeywords: ['Information Maintenance', '443'] },
          { title: 'Pembersihan AC Press Room', icon: '❄️', searchKeywords: ['Pembersihan AC', '537'] },
          { title: 'Pembangunan Workshop Maintenance', icon: '🏗️', searchKeywords: ['workshop maintenance', '107'] },
          { title: 'Monitoring PO GTS', icon: '📦', searchKeywords: ['Monitoring PO GTS', '408'] },
        ],
        showAgenda: true,
        extraLinks: []
      };
    }

    // 8. WAREHOUSE / INVENTORY
    if (sectionTitle.includes('WAREHOUSE') || sectionTitle.includes('INVENTORY')) {
      return {
        icon: '📦',
        bannerUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Inventory Logbook', icon: '📔', isLogbook: true, searchKeywords: ['Inventory Logbook', 'Logbook Inventory', 'Logbook Warehouse', 'Logbook'] },
          { title: 'Non Routine Inventory', icon: '▌', searchKeywords: ['Non Routine Inventory', '668', 'Non Routine Warehouse', '432', 'Non Routine'] },
          { title: 'Daily Inventory', icon: '▌', searchKeywords: ['Daily Inventory', '669', 'Daily Warehouse', '463', 'Daily'] },
          { title: 'Weekly Inventory', icon: '▌', searchKeywords: ['Weekly Inventory', '670', 'Weekly Warehouse', '431', 'Weekly'] },
          { title: 'Monthly Inventory', icon: '▌', searchKeywords: ['Monthly Inventory', '671', 'Monthly Warehouse', '462', 'Monthly'] },
          { title: 'Quarterly Inventory', icon: '▌', searchKeywords: ['Quarterly Inventory', '672', 'Quarterly Warehouse', '461', 'Quarterly'] },
          { title: 'Biannual Inventory', icon: '▌', searchKeywords: ['Biannual Inventory', '673', 'Biannual Warehouse', '460', 'Biannual'] },
          { title: 'Yearly Inventory', icon: '▌', searchKeywords: ['Yearly Inventory', '674', 'Yearly Warehouse', '459', 'Yearly'] },
          { title: 'Inventory Information', icon: '▌', searchKeywords: ['Inventory Information', '683', 'Information Warehouse', '441'] },
        ],
        rulesTitle: 'MONITORING PO & ASSET',
        rulesItems: [
          { title: 'Data Asset', icon: '📊', searchKeywords: ['Data Asset', '681', '76'] },
          { title: 'Scrap', icon: '🗑️', searchKeywords: ['Scrap', '682'] },
          { title: 'Monitoring PO TBP', icon: '📦', searchKeywords: ['Monitoring PO TBP', '675'] },
          { title: 'Monitoring PO GPS', icon: '📦', searchKeywords: ['Monitoring PO GPS', '676'] },
          { title: 'Monitoring PO GTS', icon: '📦', searchKeywords: ['Monitoring PO GTS', '677'] },
          { title: 'Monitoring PO JMP', icon: '📦', searchKeywords: ['Monitoring PO JMP', '678'] },
          { title: 'Kawasi - Monitoring Centralized', icon: '📍', searchKeywords: ['Kawasi - Monitoring Centralized', '679'] },
          { title: 'Outer - Monitoring Centralized', icon: '📍', searchKeywords: ['Outer - Monitoring Centralized', '680'] },
          { title: 'CARNAVAL TBP GPS', icon: '🎪', searchKeywords: ['CARNAVAL TBP GPS', '684'] },
          { title: 'Prosedur Pengajuan BA SCRAB (Alat Prep & Lab)', icon: '📜', searchKeywords: ['Prosedur Pengajuan BA SCRAB', '685'] },
          { title: 'Prosedur Pembuangan Barang SCRAB (Mandiri)', icon: '📜', searchKeywords: ['Prosedur Pembuangan Barang SCRAB', '686'] },
          { title: 'Prosedur Pembuatan Nermi', icon: '📜', searchKeywords: ['Prosedur Pembuatan Nermi', '687'] },
          { title: 'Prosedur Pengajuan UR RAB dan IM', icon: '📜', searchKeywords: ['Prosedur Pengajuan UR RAB dan IM', '688'] },
          { title: 'Prosedur Order Barang Internal', icon: '📜', searchKeywords: ['Prosedur Order Barang Internal', '689'] },
        ],
        showAgenda: true,
        extraLinks: []
      };
    }

    // 9. MANAJEMEN MUTU
    if (sectionTitle.includes('MANAJEMEN MUTU') || sectionTitle.includes('MUTU')) {
      return {
        icon: '🚀',
        bannerUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1600&q=80',
        infoTitle: 'INFO',
        infoItems: [
          { title: 'Logbook Manajemen Mutu', icon: '📔', isLogbook: true, searchKeywords: ['Logbook Manajemen Mutu', 'Logbook Mutu', 'Logbook'] },
          { title: 'Non Routine Manajemen Mutu', icon: '▌', searchKeywords: ['Non Routine Manajemen Mutu', '585'] },
          { title: 'Daily Manajemen Mutu', icon: '▌', searchKeywords: ['Daily Manajemen Mutu', '586'] },
          { title: 'Weekly Manajemen Mutu', icon: '▌', searchKeywords: ['Weekly Manajemen Mutu', '587'] },
          { title: 'Monthly Manajemen Mutu', icon: '▌', searchKeywords: ['Monthly Manajemen Mutu', '588'] },
          { title: 'Quarterly Manajemen Mutu', icon: '▌', searchKeywords: ['Quarterly Manajemen Mutu', '589'] },
          { title: 'Biannual Manajemen Mutu', icon: '▌', searchKeywords: ['Biannual Manajemen Mutu', '590'] },
          { title: 'Yearly Manajemen Mutu', icon: '▌', searchKeywords: ['Yearly Manajemen Mutu', '591'] },
          { title: 'Information Manajemen Mutu', icon: '▌', searchKeywords: ['Information Manajemen Mutu', '592'] },
          { title: 'Monthly Report', icon: '▌', searchKeywords: ['Monthly Report', '593'] },
        ],
        rulesTitle: 'RULES',
        rulesItems: [
          { title: 'Audit ISO 45001', icon: '⏳', searchKeywords: ['Audit ISO 45001', '594'] },
          { title: 'Audit ISO 14001', icon: '⏳', searchKeywords: ['Audit ISO 14001', '595'] },
          { title: 'Rules Alat Baru', icon: '⏳', searchKeywords: ['Rules Alat Baru', '596'] },
          { title: 'Rules Kalibrasi & Uji Riksa', icon: '⏳', searchKeywords: ['Rules Kalibrasi & Uji Riksa', '597'] },
          { title: 'Rules Perizinan XRF', icon: '⏳', searchKeywords: ['Rules Perizinan XRF', '598'] },
        ],
        showAgenda: true,
        extraLinks: []
      };
    }

    // Default configuration for general section hubs
    const cleanSection = sectionTitle.replace(/^[#\s\-*]+/, '').trim();
    return {
      icon: '📂',
      bannerUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
      infoTitle: 'INFO',
      infoItems: [
        { title: `Logbook ${cleanSection}`, icon: '📔', isLogbook: true, searchKeywords: [`Logbook ${cleanSection}`, 'Logbook'] },
        { title: 'Non Routine', icon: '▌', searchKeywords: ['Non Routine'] },
        { title: 'Daily', icon: '▌', searchKeywords: ['Daily'] },
        { title: 'Weekly', icon: '▌', searchKeywords: ['Weekly'] },
        { title: 'Monthly', icon: '▌', searchKeywords: ['Monthly'] },
        { title: 'Quarterly', icon: '▌', searchKeywords: ['Quarterly'] },
        { title: 'Biannual', icon: '▌', searchKeywords: ['Biannual'] },
        { title: 'Yearly', icon: '▌', searchKeywords: ['Yearly'] },
      ],
      rulesTitle: 'RULES',
      rulesItems: [
        { title: 'Kebijakan Perusahaan', icon: '📜', searchKeywords: ['Kebijakan Perusahaan'] },
        { title: 'Induksi Internal', icon: '🎓', searchKeywords: ['Induksi Internal'] },
        { title: 'Golden Rules', icon: '⭐', searchKeywords: ['Golden Rules'] },
        { title: 'Standard Methods', icon: '📘', searchKeywords: ['Standard Methods'] },
      ],
      showAgenda: true,
      extraLinks: []
    };
  };

  const config = getSectionConfig();
  const hasRules = Boolean(config.rulesItems && config.rulesItems.length > 0);

  // Reordering states for drag and drop
  const [isReorderingInfo, setIsReorderingInfo] = useState(false);
  const [isReorderingRules, setIsReorderingRules] = useState(false);
  const [draggedInfoIdx, setDraggedInfoIdx] = useState<number | null>(null);
  const [dragOverInfoIdx, setDragOverInfoIdx] = useState<number | null>(null);
  const [draggedRulesIdx, setDraggedRulesIdx] = useState<number | null>(null);
  const [dragOverRulesIdx, setDragOverRulesIdx] = useState<number | null>(null);

  // Active items initialized from saved localStorage order
  const [infoItems, setInfoItems] = useState<HubItem[]>(() => {
    return loadOrderedHubItems(sectionTitle, 'info', config.infoItems);
  });

  const [rulesItems, setRulesItems] = useState<HubItem[]>(() => {
    return loadOrderedHubItems(sectionTitle, 'rules', config.rulesItems || []);
  });

  // Sync items when sectionTitle or post changes
  React.useEffect(() => {
    setInfoItems(loadOrderedHubItems(sectionTitle, 'info', config.infoItems));
    setRulesItems(loadOrderedHubItems(sectionTitle, 'rules', config.rulesItems || []));
    setIsReorderingInfo(false);
    setIsReorderingRules(false);
  }, [sectionTitle]);

  const handleDragStartInfo = (idx: number, e: React.DragEvent) => {
    setDraggedInfoIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOverInfo = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverInfoIdx !== idx) {
      setDragOverInfoIdx(idx);
    }
  };

  const handleDropInfo = (dropIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedInfoIdx === null || draggedInfoIdx === dropIdx) {
      setDraggedInfoIdx(null);
      setDragOverInfoIdx(null);
      return;
    }
    const newItems = [...infoItems];
    const [moved] = newItems.splice(draggedInfoIdx, 1);
    newItems.splice(dropIdx, 0, moved);
    setInfoItems(newItems);
    saveOrderedHubItems(sectionTitle, 'info', newItems);
    setDraggedInfoIdx(null);
    setDragOverInfoIdx(null);
    toast.success('Urutan menu berhasil diubah');
  };

  const handleDragEndInfo = () => {
    setDraggedInfoIdx(null);
    setDragOverInfoIdx(null);
  };

  const moveInfoItem = (idx: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= infoItems.length) return;
    const newItems = [...infoItems];
    const temp = newItems[idx];
    newItems[idx] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    setInfoItems(newItems);
    saveOrderedHubItems(sectionTitle, 'info', newItems);
  };

  // State for Editing / Adding Menu Item Modal
  const [editingModal, setEditingModal] = useState<{
    isOpen: boolean;
    type: 'info' | 'rules';
    index: number | null; // null means adding a new item
    title: string;
    icon: string;
    linkUrl: string;
    isLogbook: boolean;
  }>({
    isOpen: false,
    type: 'info',
    index: null,
    title: '',
    icon: '📘',
    linkUrl: '',
    isLogbook: false
  });

  const openAddItemModal = (type: 'info' | 'rules') => {
    setEditingModal({
      isOpen: true,
      type,
      index: null,
      title: '',
      icon: type === 'info' ? '📘' : '📋',
      linkUrl: '',
      isLogbook: false
    });
  };

  const openEditItemModal = (type: 'info' | 'rules', index: number) => {
    const item = type === 'info' ? infoItems[index] : rulesItems[index];
    if (!item) return;
    setEditingModal({
      isOpen: true,
      type,
      index,
      title: item.title,
      icon: item.icon || '📘',
      linkUrl: item.linkUrl || '',
      isLogbook: Boolean(item.isLogbook)
    });
  };

  const handleSaveItemModal = () => {
    if (!editingModal.title.trim()) {
      toast.error('Judul menu tidak boleh kosong');
      return;
    }
    const currentList = editingModal.type === 'info' ? [...infoItems] : [...rulesItems];
    const newItem: HubItem = {
      title: editingModal.title.trim(),
      icon: editingModal.icon.trim() || '📘',
      linkUrl: editingModal.linkUrl.trim() || undefined,
      isLogbook: editingModal.isLogbook || undefined,
      searchKeywords: [editingModal.title.trim()]
    };

    if (editingModal.index === null) {
      // Add new
      currentList.push(newItem);
      toast.success(`Menu "${newItem.title}" berhasil ditambahkan`);
    } else {
      // Edit existing
      currentList[editingModal.index] = {
        ...currentList[editingModal.index],
        ...newItem
      };
      toast.success(`Menu "${newItem.title}" berhasil diperbarui`);
    }

    if (editingModal.type === 'info') {
      setInfoItems(currentList);
      saveOrderedHubItems(sectionTitle, 'info', currentList);
    } else {
      setRulesItems(currentList);
      saveOrderedHubItems(sectionTitle, 'rules', currentList);
    }

    setEditingModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleDeleteItem = (type: 'info' | 'rules', index: number) => {
    const list = type === 'info' ? infoItems : rulesItems;
    const itemToDelete = list[index];
    if (!itemToDelete) return;
    if (confirm(`Yakin ingin menghapus menu "${itemToDelete.title}"?`)) {
      const updated = list.filter((_, idx) => idx !== index);
      if (type === 'info') {
        setInfoItems(updated);
        saveOrderedHubItems(sectionTitle, 'info', updated);
      } else {
        setRulesItems(updated);
        saveOrderedHubItems(sectionTitle, 'rules', updated);
      }
      toast.success(`Menu "${itemToDelete.title}" telah dihapus`);
    }
  };

  const resetInfoOrder = () => {
    setInfoItems(config.infoItems);
    try {
      const cleanSec = (sectionTitle || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      localStorage.removeItem(`preplab_hub_custom_items_${cleanSec}_info`);
      localStorage.removeItem(`preplab_hub_order_${cleanSec}_info`);
    } catch {}
    toast.success('Menu INFO dikembalikan ke default');
  };

  const resetRulesOrder = () => {
    setRulesItems(config.rulesItems || []);
    try {
      const cleanSec = (sectionTitle || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '_');
      localStorage.removeItem(`preplab_hub_custom_items_${cleanSec}_rules`);
      localStorage.removeItem(`preplab_hub_order_${cleanSec}_rules`);
    } catch {}
    toast.success('Menu RULES dikembalikan ke default');
  };

  // Same for Rules
  const handleDragStartRules = (idx: number, e: React.DragEvent) => {
    setDraggedRulesIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleDragOverRules = (idx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverRulesIdx !== idx) {
      setDragOverRulesIdx(idx);
    }
  };

  const handleDropRules = (dropIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedRulesIdx === null || draggedRulesIdx === dropIdx) {
      setDraggedRulesIdx(null);
      setDragOverRulesIdx(null);
      return;
    }
    const newItems = [...rulesItems];
    const [moved] = newItems.splice(draggedRulesIdx, 1);
    newItems.splice(dropIdx, 0, moved);
    setRulesItems(newItems);
    saveOrderedHubItems(sectionTitle, 'rules', newItems);
    setDraggedRulesIdx(null);
    setDragOverRulesIdx(null);
    toast.success('Urutan menu RULES berhasil diubah');
  };

  const handleDragEndRules = () => {
    setDraggedRulesIdx(null);
    setDragOverRulesIdx(null);
  };

  const moveRulesItem = (idx: number, dir: 'up' | 'down') => {
    const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= rulesItems.length) return;
    const newItems = [...rulesItems];
    const temp = newItems[idx];
    newItems[idx] = newItems[targetIdx];
    newItems[targetIdx] = temp;
    setRulesItems(newItems);
    saveOrderedHubItems(sectionTitle, 'rules', newItems);
  };


  // Month navigation helpers for Section Calendar
  const prevCalMonth = () => {
    setCurrentCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const nextCalMonth = () => {
    setCurrentCalDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  const resetCalToToday = () => {
    setCurrentCalDate(new Date());
  };

  const formatIsoDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Filter agenda events relevant to this section / department
  const sectionAgendaEvents = useMemo(() => {
    const sLower = sectionTitle.toLowerCase();
    return (agendaEvents || []).filter(evt => {
      const cat = (evt.kategori || evt.department || '').toLowerCase();
      const t = (evt.title || '').toLowerCase();
      if (sLower.includes('lab') && (cat.includes('lab') || t.includes('lab'))) return true;
      if (sLower.includes('prep') && (cat.includes('prep') || t.includes('prep'))) return true;
      if (sLower.includes('admin') && (cat.includes('admin') || t.includes('admin'))) return true;
      if (sLower.includes('maint') && (cat.includes('maint') || t.includes('maint'))) return true;
      if (sLower.includes('ware') || sLower.includes('inven')) {
        if (cat.includes('ware') || cat.includes('inven') || t.includes('ware') || t.includes('inven')) return true;
      }
      if (sLower.includes('mutu') && (cat.includes('mutu') || t.includes('mutu') || cat.includes('qa'))) return true;
      // Default include if general or non-birthday
      return !evt.isBirthday && !t.includes('🎂');
    });
  }, [agendaEvents, sectionTitle]);

  // Calendar cells generation (Sunday to Saturday, matching Notion Image 3)
  const calendarGrid = useMemo(() => {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay(); // 0=Sun, 6=Sat (matching Image 3: Sun, Mon, Tue, Wed, Thu, Fri, Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: Array<{
      dayNum: number;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: any[];
    }> = [];

    const todayStr = formatIsoDate(new Date());

    // Previous month padding
    for (let i = startDay - 1; i >= 0; i--) {
      const dNum = daysInPrevMonth - i;
      const prevD = new Date(year, month - 1, dNum);
      const key = formatIsoDate(prevD);
      cells.push({
        dayNum: dNum,
        dateKey: key,
        isCurrentMonth: false,
        isToday: key === todayStr,
        events: []
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const curD = new Date(year, month, day);
      const key = formatIsoDate(curD);
      const evts = sectionAgendaEvents.filter(e => {
        const rawDate = e.startDate || e.start;
        if (!rawDate) return false;
        return formatIsoDate(new Date(rawDate)) === key;
      });

      cells.push({
        dayNum: day,
        dateKey: key,
        isCurrentMonth: true,
        isToday: key === todayStr,
        events: evts
      });
    }

    // Next month padding to fill grid
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const remaining = totalCells - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const nextD = new Date(year, month + 1, day);
      const key = formatIsoDate(nextD);
      cells.push({
        dayNum: day,
        dateKey: key,
        isCurrentMonth: false,
        isToday: key === todayStr,
        events: []
      });
    }

    return cells;
  }, [currentCalDate, sectionAgendaEvents]);

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-300 pb-20 bg-white min-h-screen">
      {/* 1. Cover Banner Image (Matching Notion Banner Aesthetics - Full Width with Adjustable Position) */}
      <BannerCover
        coverImage={currentCover && currentCover.startsWith('http') ? currentCover : (post?.coverImage && post.coverImage.startsWith('http') ? post.coverImage : config.bannerUrl)}
        postId={post?.id || `section_${post?.category || 'hub'}`}
        alt={sectionTitle}
        heightClass="h-48 sm:h-60 md:h-72 lg:h-80 rounded-2xl"
        onOpenChangeModal={() => {
          setCoverInputUrl(currentCover || post?.coverImage || config.bannerUrl);
          setShowCoverModal(true);
        }}
        onSavePosition={(newPos) => {
          const bannerUrl = currentCover || post?.coverImage || config.bannerUrl;
          const cleanUrl = bannerUrl.replace(/#pos=\d+/, '');
          if (cleanUrl && post?.id) {
            const urlWithPos = `${cleanUrl}#pos=${newPos}`;
            fetch(`/api/bulletin/${post.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...post, coverImage: urlWithPos })
            }).catch(() => {});
          }
        }}
      />

      {/* 2. Header Area: Floating Icon, Metadata Actions, Big Title, Home Button */}
      <div className="px-2 sm:px-4 md:px-6 space-y-2">
        {/* Floating Page Icon */}
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white border border-slate-200/90 shadow-md flex items-center justify-center text-3xl md:text-4xl -mt-10 md:-mt-12 relative z-10">
          {config.icon}
        </div>

        {/* Action / Verification Row */}
        <div className="flex items-center gap-4 text-xs text-slate-400 font-medium pt-1">
          <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors cursor-pointer">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Add verification</span>
          </span>
          <span className="flex items-center gap-1.5 hover:text-slate-600 transition-colors cursor-pointer">
            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>Add comment</span>
          </span>
        </div>

        {/* Section Title (Double Click to Edit & Change Font Color) */}
        <div className="pt-1 group/title relative max-w-fit">
          {isEditingTitle ? (
            <div className="flex items-center gap-2 flex-wrap relative">
              {/* Color Picker Popover Button */}
              <div className="relative">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setShowColorPicker(!showColorPicker);
                  }}
                  className="w-9 h-9 rounded-xl border-2 shadow-xs flex items-center justify-center cursor-pointer hover:scale-105 transition-all"
                  style={{
                    backgroundColor: editingTitleColor,
                    borderColor: editingTitleColor === '#ffffff' || editingTitleColor === '#0f172a' ? '#cbd5e1' : editingTitleColor
                  }}
                  title="Pilih Warna Font Judul"
                >
                  <Palette className="w-4 h-4 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
                </button>

                {/* Color Palette Dropdown */}
                {showColorPicker && (
                  <div
                    className="absolute top-full left-0 mt-2 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xl z-50 w-64 animate-in fade-in zoom-in-95 duration-100"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                        Warna Font Judul
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowColorPicker(false)}
                        className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-5 gap-2 mb-2.5">
                      {TITLE_COLOR_PALETTE.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => {
                            setEditingTitleColor(c.hex);
                            setShowColorPicker(false);
                          }}
                          className={`w-7 h-7 rounded-full border transition-all hover:scale-110 cursor-pointer flex items-center justify-center ${
                            editingTitleColor.toLowerCase() === c.hex.toLowerCase()
                              ? 'ring-2 ring-blue-500 ring-offset-2 scale-105'
                              : 'border-slate-200'
                          }`}
                          style={{ backgroundColor: c.hex }}
                          title={c.label}
                        >
                          {editingTitleColor.toLowerCase() === c.hex.toLowerCase() && (
                            <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
                          )}
                        </button>
                      ))}

                      {/* Custom Color Selector via Native Color Picker */}
                      <label
                        className="w-7 h-7 rounded-full border border-dashed border-slate-400 hover:scale-110 transition-transform cursor-pointer flex items-center justify-center relative overflow-hidden bg-gradient-to-tr from-amber-400 via-rose-400 to-teal-400 shadow-2xs"
                        title="Pilih Warna Kustom..."
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        <Pipette className="w-3.5 h-3.5 text-slate-800" />
                        <input
                          type="color"
                          value={editingTitleColor.startsWith('#') && editingTitleColor.length === 7 ? editingTitleColor : '#0f172a'}
                          onChange={(e) => {
                            setEditingTitleColor(e.target.value);
                          }}
                          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                        />
                      </label>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Warna terpilih:</span>
                      <span className="font-mono font-bold uppercase" style={{ color: editingTitleColor }}>
                        {editingTitleColor}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Title Text Input */}
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                disabled={isSavingTitle}
                autoFocus
                placeholder="Masukkan judul seksi..."
                className="text-2xl md:text-3xl lg:text-4xl font-black tracking-tight px-3 py-1 bg-white border-2 border-blue-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-100 shadow-md min-w-[280px] md:min-w-[420px] transition-colors"
                style={{ color: editingTitleColor }}
              />

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // prevent input blur before save
                  handleSaveTitle();
                }}
                disabled={isSavingTitle}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                title="Simpan Perubahan Judul & Warna (Enter)"
              >
                {isSavingTitle ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Simpan</span>
              </button>

              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setIsEditingTitle(false);
                  setShowColorPicker(false);
                  setTitleInput(displayedTitle);
                  setEditingTitleColor(titleColor);
                }}
                disabled={isSavingTitle}
                className="inline-flex items-center gap-1 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                title="Batal (Esc)"
              >
                <X className="w-3.5 h-3.5" />
                <span>Batal</span>
              </button>
            </div>
          ) : (
            <div
              onDoubleClick={handleStartEditTitle}
              className="flex items-center gap-2.5 cursor-pointer rounded-xl px-1.5 py-0.5 -mx-1.5 hover:bg-slate-100/70 transition-all select-none"
              title="Double klik untuk mengedit judul atau warna teks"
            >
              <h1 
                className="text-3xl md:text-4xl lg:text-5xl font-black tracking-tight transition-colors"
                style={{ color: titleColor }}
              >
                {displayedTitle ? translateDisplayText(displayedTitle.toUpperCase().trim()) : translateDisplayText(sectionTitle)}
              </h1>
              <span className="opacity-0 group-hover/title:opacity-100 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all text-xs font-semibold flex items-center gap-1 shrink-0 border border-transparent hover:border-blue-200 shadow-2xs">
                <Pencil className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px] text-slate-500 font-normal">Double klik untuk edit judul & warna</span>
              </span>
            </div>
          )}
        </div>

        {/* Home Navigation Pill: HOME TBP & GPS + Logbook Seksi */}
        <div className="pt-2 flex items-center gap-2 flex-wrap">
          <button
            onClick={onGoHome}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-xs transition-all cursor-pointer group"
          >
            <Home className="w-3.5 h-3.5 text-slate-600 group-hover:scale-110 transition-transform" />
            <span>{currentUniverse === 'GTS' ? 'HOME GTS' : 'HOME TBP & GPS'}</span>
          </button>

          <button
            onClick={() => {
              const logbookItem = config.infoItems.find(i => i.isLogbook || i.title.toLowerCase().startsWith('logbook')) || {
                title: `Logbook ${sectionTitle}`,
                icon: '📔',
                isLogbook: true,
                searchKeywords: [`Logbook ${sectionTitle}`, 'Logbook']
              };
              handleItemClick(logbookItem);
            }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition-all cursor-pointer group"
            title={`Buka Logbook Terpadu ${sectionTitle}`}
          >
            <span className="text-sm">📔</span>
            <span>Logbook {translateDisplayText(sectionTitle)}</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-teal-800 text-teal-100 font-mono">
              Aktif
            </span>
          </button>
        </div>
      </div>

      {/* 3. Section Content Columns:
          - If hasRules: 2 Columns side-by-side (INFO in soft blue, RULES in soft cream)
          - If !hasRules (e.g. PROSEDUR, INFORMATION): Single column spanning full width matching Notion screenshots
      */}
      <div className="px-2 sm:px-4 md:px-6 pt-4">
        {hasRules ? (
          /* Two Column Layout (Laboratorium, Administrasi, Preparasi, etc.) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Column 1: INFO (Soft Pastel Sky Blue) */}
            <div className="space-y-3">
              {/* INFO Title Banner Bar */}
              <div className="bg-[#eef5fc] border border-[#dcecfb] rounded-lg px-4 py-2.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="font-serif italic font-normal text-2xl md:text-3xl text-[#1e3a5f] tracking-wide">
                    {config.infoTitle || 'INFO'}
                  </span>
                  <span className="text-[11px] font-mono font-medium text-sky-800 bg-sky-100/70 border border-sky-200/60 px-2 py-0.5 rounded-md">
                    {infoItems.length} Items
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsReorderingInfo(prev => !prev)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      isReorderingInfo
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white hover:bg-sky-50 text-sky-800 border border-sky-200/80 shadow-2xs'
                    }`}
                    title={isReorderingInfo ? 'Selesai Mengatur' : 'Atur Urutan & Edit Menu'}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>{isReorderingInfo ? 'Selesai' : 'Atur Menu'}</span>
                  </button>
                  {isReorderingInfo && (
                    <>
                      <button
                        type="button"
                        onClick={() => openAddItemModal('info')}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer shadow-2xs transition-all"
                        title="Tambah Menu Baru"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </button>
                      <button
                        type="button"
                        onClick={resetInfoOrder}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 cursor-pointer shadow-2xs transition-all"
                        title="Reset ke Urutan & Menu Default"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Items List (Normal Pill Rows or Reordering Mode) */}
              <div className="space-y-1.5">
                {infoItems.map((item, idx) => {
                  if (isReorderingInfo) {
                    return (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStartInfo(idx, e)}
                        onDragOver={(e) => handleDragOverInfo(idx, e)}
                        onDrop={(e) => handleDropInfo(idx, e)}
                        onDragEnd={handleDragEndInfo}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all select-none ${
                          draggedInfoIdx === idx
                            ? 'opacity-40 border-dashed border-blue-400 bg-blue-50/50'
                            : dragOverInfoIdx === idx
                            ? 'border-blue-500 bg-blue-100/60 ring-2 ring-blue-400 shadow-md scale-[1.01]'
                            : 'bg-white hover:bg-sky-50/70 border-sky-200/80 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate flex-1">
                          <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-blue-600 rounded transition-colors">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-base shrink-0">{item.icon || '📘'}</span>
                          <span className="text-sm font-medium text-slate-800 truncate">
                            {translateDisplayText(item.title)}
                          </span>
                          {item.isLogbook && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                              LOGBOOK
                            </span>
                          )}
                          {item.linkUrl && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-0.5">
                              <ExternalLink className="w-2.5 h-2.5" /> Link
                            </span>
                          )}
                        </div>

                        {/* Action buttons: Edit, Delete, Up, Down */}
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => openEditItemModal('info', idx)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 cursor-pointer transition-all"
                            title="Edit Menu Ini"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem('info', idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition-all"
                            title="Hapus Menu Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="h-4 w-px bg-slate-200 mx-0.5" />
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveInfoItem(idx, 'up')}
                            className={`p-1.5 rounded-lg border text-slate-600 transition-all ${
                              idx === 0
                                ? 'opacity-30 cursor-not-allowed border-transparent'
                                : 'hover:bg-sky-100 hover:text-sky-800 border-slate-200 cursor-pointer'
                            }`}
                            title="Geser ke Atas"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === infoItems.length - 1}
                            onClick={() => moveInfoItem(idx, 'down')}
                            className={`p-1.5 rounded-lg border text-slate-600 transition-all ${
                              idx === infoItems.length - 1
                                ? 'opacity-30 cursor-not-allowed border-transparent'
                                : 'hover:bg-sky-100 hover:text-sky-800 border-slate-200 cursor-pointer'
                            }`}
                            title="Geser ke Bawah"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // Normal Clickable Button
                  return item.isLogbook ? (
                    <button
                      key={idx}
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50/50 hover:from-teal-100 hover:via-emerald-100 hover:to-teal-100/70 border-2 border-teal-500/40 hover:border-teal-500/70 text-slate-900 text-sm font-semibold transition-all group shadow-xs text-left cursor-pointer mb-2"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-700 text-sm shrink-0 group-hover:scale-105 transition-transform">
                          <span className="text-base">{item.icon}</span>
                        </div>
                        <div className="truncate">
                          <div className="flex items-center gap-2">
                            <span className="truncate group-hover:text-teal-900 transition-colors">
                              {translateDisplayText(item.title)}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-600 text-white shadow-2xs shrink-0">
                              Aktif
                            </span>
                          </div>
                          <p className="text-[11px] font-normal text-teal-700/80 truncate">
                            Semua kegiatan Routine & Non-Routine aktif
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-teal-700 group-hover:text-teal-900 group-hover:translate-x-0.5 transition-all flex items-center gap-1 shrink-0">
                        Buka <ChevronRight className="w-4 h-4 text-teal-600" />
                      </span>
                    </button>
                  ) : (
                    <button
                      key={idx}
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#f0f6fc] hover:bg-[#e4effa] border border-[#dcecfb] hover:border-sky-300 text-slate-800 text-sm font-medium transition-all group shadow-2xs hover:shadow-xs text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span className="w-1.5 h-4 bg-sky-600 rounded-full shrink-0 group-hover:scale-y-110 transition-transform" />
                        <span className="truncate group-hover:text-sky-950 transition-colors">
                          {translateDisplayText(item.title)}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-sky-400 group-hover:text-sky-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 2: RULES (Soft Warm Cream / Vanilla Latte) */}
            <div className="space-y-3">
              {/* RULES Title Banner Bar */}
              <div className="bg-[#fcf8ee] border border-[#f5ecd5] rounded-lg px-4 py-2.5 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-3">
                  <span className="font-serif italic font-normal text-2xl md:text-3xl text-[#5c4018] tracking-wide">
                    {config.rulesTitle || 'RULES'}
                  </span>
                  <span className="text-[11px] font-mono font-medium text-amber-900 bg-amber-100/70 border border-amber-200/60 px-2 py-0.5 rounded-md">
                    {rulesItems.length} Items
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsReorderingRules(prev => !prev)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer ${
                      isReorderingRules
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white hover:bg-amber-50 text-amber-900 border border-amber-200/80 shadow-2xs'
                    }`}
                    title={isReorderingRules ? 'Selesai Mengatur' : 'Atur Urutan & Edit Menu'}
                  >
                    <ArrowUpDown className="w-3.5 h-3.5" />
                    <span>{isReorderingRules ? 'Selesai' : 'Atur Menu'}</span>
                  </button>
                  {isReorderingRules && (
                    <>
                      <button
                        type="button"
                        onClick={() => openAddItemModal('rules')}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer shadow-2xs transition-all"
                        title="Tambah Menu Baru"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah</span>
                      </button>
                      <button
                        type="button"
                        onClick={resetRulesOrder}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 cursor-pointer shadow-2xs transition-all"
                        title="Reset ke Urutan & Menu Default"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Items List (Soft Warm Cream Rounded Pill Rows) */}
              <div className="space-y-1.5">
                {rulesItems.map((item, idx) => {
                  if (isReorderingRules) {
                    return (
                      <div
                        key={idx}
                        draggable
                        onDragStart={(e) => handleDragStartRules(idx, e)}
                        onDragOver={(e) => handleDragOverRules(idx, e)}
                        onDrop={(e) => handleDropRules(idx, e)}
                        onDragEnd={handleDragEndRules}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all select-none ${
                          draggedRulesIdx === idx
                            ? 'opacity-40 border-dashed border-amber-400 bg-amber-50/50'
                            : dragOverRulesIdx === idx
                            ? 'border-amber-500 bg-amber-100/60 ring-2 ring-amber-400 shadow-md scale-[1.01]'
                            : 'bg-white hover:bg-amber-50/70 border-amber-200/80 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate flex-1">
                          <div className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-amber-600 rounded transition-colors">
                            <GripVertical className="w-4 h-4" />
                          </div>
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-mono font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-base shrink-0">{item.icon || '📋'}</span>
                          <span className="text-sm font-medium text-slate-800 truncate">
                            {translateDisplayText(item.title)}
                          </span>
                          {item.linkUrl && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-0.5">
                              <ExternalLink className="w-2.5 h-2.5" /> Link
                            </span>
                          )}
                        </div>

                        {/* Action buttons: Edit, Delete, Up, Down */}
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => openEditItemModal('rules', idx)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 border border-transparent hover:border-amber-200 cursor-pointer transition-all"
                            title="Edit Menu Ini"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem('rules', idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition-all"
                            title="Hapus Menu Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="h-4 w-px bg-slate-200 mx-0.5" />
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveRulesItem(idx, 'up')}
                            className={`p-1.5 rounded-lg border text-slate-600 transition-all ${
                              idx === 0
                                ? 'opacity-30 cursor-not-allowed border-transparent'
                                : 'hover:bg-amber-100 hover:text-amber-900 border-slate-200 cursor-pointer'
                            }`}
                            title="Geser ke Atas"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === rulesItems.length - 1}
                            onClick={() => moveRulesItem(idx, 'down')}
                            className={`p-1.5 rounded-lg border text-slate-600 transition-all ${
                              idx === rulesItems.length - 1
                                ? 'opacity-30 cursor-not-allowed border-transparent'
                                : 'hover:bg-amber-100 hover:text-amber-900 border-slate-200 cursor-pointer'
                            }`}
                            title="Geser ke Bawah"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#fdfbf6] hover:bg-[#f6f0df] border border-[#f5ecd5] hover:border-amber-300 text-slate-800 text-sm font-medium transition-all group shadow-2xs hover:shadow-xs text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 truncate">
                        <span className="w-1.5 h-4 bg-amber-600 rounded-full shrink-0 group-hover:scale-y-110 transition-transform" />
                        <span className="truncate group-hover:text-amber-950 transition-colors">
                          {translateDisplayText(item.title)}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-amber-400 group-hover:text-amber-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Single Column Layout (PROSEDUR, INFORMATION, MAINTENANCE, etc.) - FULL FLUID WIDTH */
          <div className="w-full space-y-3">
            {/* INFO Title Banner Bar */}
            <div className="bg-[#eef5fc] border border-[#dcecfb] rounded-lg px-4 py-2.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <span className="font-serif italic font-normal text-2xl md:text-3xl text-[#1e3a5f] tracking-wide">
                  {config.infoTitle || 'INFO'}
                </span>
                <span className="text-[11px] font-mono font-medium text-sky-800 bg-sky-100/70 border border-sky-200/60 px-2.5 py-0.5 rounded-md">
                  {infoItems.length} Dokumen & Modul
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsReorderingInfo(prev => !prev)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                    isReorderingInfo
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white hover:bg-sky-50 text-sky-800 border border-sky-200/80 shadow-2xs'
                  }`}
                  title={isReorderingInfo ? 'Selesai Mengatur' : 'Atur Urutan & Edit Menu'}
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span>{isReorderingInfo ? 'Selesai' : 'Atur Menu'}</span>
                </button>
                {isReorderingInfo && (
                  <>
                    <button
                      type="button"
                      onClick={() => openAddItemModal('info')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer shadow-2xs transition-all"
                      title="Tambah Menu Baru"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Menu</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetInfoOrder}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 cursor-pointer shadow-2xs transition-all"
                      title="Reset ke Urutan & Menu Default"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Vertical List of Soft Sky Blue Pills */}
            <div className="space-y-1.5">
              {infoItems.map((item, idx) => {
                if (isReorderingInfo) {
                  return (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => handleDragStartInfo(idx, e)}
                      onDragOver={(e) => handleDragOverInfo(idx, e)}
                      onDrop={(e) => handleDropInfo(idx, e)}
                      onDragEnd={handleDragEndInfo}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all select-none ${
                        draggedInfoIdx === idx
                          ? 'opacity-40 border-dashed border-blue-400 bg-blue-50/50'
                          : dragOverInfoIdx === idx
                          ? 'border-blue-500 bg-blue-100/60 ring-2 ring-blue-400 shadow-md scale-[1.01]'
                          : 'bg-white hover:bg-sky-50/70 border-sky-200/80 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate flex-1">
                        <div className="cursor-grab active:cursor-grabbing p-1.5 text-slate-400 hover:text-blue-600 rounded transition-colors">
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-lg shrink-0">{item.icon || '📘'}</span>
                        <div className="truncate flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800 truncate">
                              {translateDisplayText(item.title)}
                            </span>
                            {item.isLogbook && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                LOGBOOK
                              </span>
                            )}
                            {item.linkUrl && (
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> External Link
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons: Edit, Delete, Up, Down */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        <button
                          type="button"
                          onClick={() => openEditItemModal('info', idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 cursor-pointer transition-all"
                          title="Edit Judul/Icon/Link"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem('info', idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer transition-all"
                          title="Hapus Menu Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="h-5 w-px bg-slate-200 mx-1" />
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveInfoItem(idx, 'up')}
                          className={`p-1.5 rounded-lg border text-slate-600 transition-all ${
                            idx === 0
                              ? 'opacity-30 cursor-not-allowed border-transparent'
                              : 'hover:bg-sky-100 hover:text-sky-800 border-slate-200 cursor-pointer'
                          }`}
                          title="Geser ke Atas"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === infoItems.length - 1}
                          onClick={() => moveInfoItem(idx, 'down')}
                          className={`p-1.5 rounded-lg border text-slate-600 transition-all ${
                            idx === infoItems.length - 1
                              ? 'opacity-30 cursor-not-allowed border-transparent'
                              : 'hover:bg-sky-100 hover:text-sky-800 border-slate-200 cursor-pointer'
                          }`}
                          title="Geser ke Bawah"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return item.isLogbook ? (
                  <button
                    key={idx}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50/50 hover:from-teal-100 hover:via-emerald-100 hover:to-teal-100/70 border-2 border-teal-500/40 hover:border-teal-500/70 text-slate-900 text-sm font-semibold transition-all group shadow-xs text-left cursor-pointer mb-2"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-700 text-sm shrink-0 group-hover:scale-105 transition-transform">
                        <span className="text-base">{item.icon}</span>
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="truncate group-hover:text-teal-900 transition-colors">
                            {translateDisplayText(item.title)}
                          </span>
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-teal-600 text-white shadow-2xs shrink-0">
                            Aktif
                          </span>
                        </div>
                        <p className="text-[11px] font-normal text-teal-700/80 truncate">
                          Semua kegiatan Routine & Non-Routine aktif
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-teal-700 group-hover:text-teal-900 group-hover:translate-x-0.5 transition-all flex items-center gap-1 shrink-0">
                      Buka <ChevronRight className="w-4 h-4 text-teal-600" />
                    </span>
                  </button>
                ) : (
                  <button
                    key={idx}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#f0f6fc] hover:bg-[#e4effa] border border-[#dcecfb] hover:border-sky-300 text-slate-800 text-sm font-medium transition-all group shadow-2xs hover:shadow-xs text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <span className="w-1.5 h-4 bg-sky-600 rounded-full shrink-0 group-hover:scale-y-110 transition-transform" />
                      <span className="truncate group-hover:text-sky-950 transition-colors">
                        {translateDisplayText(item.title)}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-sky-400 group-hover:text-sky-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4. Section Agenda / Calendar View (Matching Image 3: "Agenda Laboratorium") */}
      {config.showAgenda && (
        <div className="px-2 sm:px-4 md:px-6 pt-8 space-y-4">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                Agenda {translateDisplayText(sectionTitle.charAt(0) + sectionTitle.slice(1).toLowerCase())}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-semibold text-slate-700 capitalize">
                  {currentCalDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={prevCalMonth}
                    className="p-1 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Bulan Lalu"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={resetCalToToday}
                    className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Today
                  </button>
                  <button
                    onClick={nextCalMonth}
                    className="p-1 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    title="Bulan Depan"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Manage in Calendar Button (Matching Image 3) */}
            <button
              onClick={() => {
                if (onOpenCalendar) {
                  onOpenCalendar();
                } else {
                  window.location.href = '/agenda';
                }
              }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 shadow-xs transition-all cursor-pointer group"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-600 group-hover:scale-110 transition-transform" />
              <span>Manage in Calendar</span>
            </button>
          </div>

          {/* Calendar Grid (Clean Notion White Style with Sun..Sat Headers) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {/* Days Header: Sun, Mon, Tue, Wed, Thu, Fri, Sat */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/60 text-center py-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                <span key={i} className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {d}
                </span>
              ))}
            </div>

            {/* Cells Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
              {calendarGrid.map((cell, idx) => {
                const hasEvts = cell.events.length > 0;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (hasEvts) {
                        setSelectedDayEvents({ dateStr: cell.dateKey, events: cell.events });
                      }
                    }}
                    className={`min-h-[72px] sm:min-h-[85px] p-2 flex flex-col justify-between transition-colors ${
                      cell.isCurrentMonth ? 'bg-white' : 'bg-slate-50/40 text-slate-400'
                    } ${cell.isToday ? 'bg-sky-50/40' : ''} ${hasEvts ? 'cursor-pointer hover:bg-sky-50/60' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold leading-none ${
                        cell.isToday 
                          ? 'w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold'
                          : cell.isCurrentMonth ? 'text-slate-800' : 'text-slate-400'
                      }`}>
                        {cell.dayNum}
                      </span>
                      {hasEvts && (
                        <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-100 px-1.5 py-0.2 rounded-full">
                          {cell.events.length}
                        </span>
                      )}
                    </div>

                    {/* Event Preview Chips */}
                    {hasEvts && (
                      <div className="space-y-1 mt-1 overflow-hidden">
                        {cell.events.slice(0, 2).map((ev: any, evIdx: number) => (
                          <div 
                            key={evIdx}
                            className="text-[10px] truncate px-1.5 py-0.5 rounded bg-sky-100/80 text-sky-900 border border-sky-200/50 font-medium"
                            title={ev.title}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {cell.events.length > 2 && (
                          <span className="text-[9px] text-slate-400 pl-1 font-mono">
                            +{cell.events.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Date Modal/Popover if user clicks an event date */}
          {selectedDayEvents && (
            <div className="p-4 rounded-xl bg-[#f0f6fd] border border-[#dcecfb] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-sky-700" />
                  <span className="text-sm font-bold text-slate-800">
                    Agenda Terjadwal: {new Date(selectedDayEvents.dateStr).toLocaleDateString('id-ID', { dateStyle: 'full' })}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedDayEvents(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded bg-white border border-slate-200 cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedDayEvents.events.map((ev: any, idx: number) => (
                  <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs space-y-1">
                    <div className="font-semibold text-xs text-slate-800">{ev.title}</div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                      {ev.time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{ev.time}</span>
                        </span>
                      )}
                      {ev.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{ev.location}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. HARITA WAYS Banner (Soft Natural Sage/Emerald Notion Callout) */}
      <div className="px-2 sm:px-4 md:px-6 pt-4">
        <div className="rounded-2xl border border-emerald-200 bg-[#f0fdf4] p-4 shadow-2xs flex items-center justify-between">
          <div className="flex items-start sm:items-center gap-3 w-full">
            <div className="p-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-base shrink-0 mt-0.5 sm:mt-0">
              🌟
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-serif italic font-bold text-sm tracking-wider text-emerald-900">
                  HARITA WAYS
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold font-mono">
                  Core Values
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium leading-relaxed flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>(<strong className="text-emerald-800 font-bold">H</strong>umility)</span>
                <span className="text-emerald-400 hidden sm:inline">•</span>
                <span>(<strong className="text-emerald-800 font-bold">A</strong>chievement oriented)</span>
                <span className="text-emerald-400 hidden sm:inline">•</span>
                <span>(<strong className="text-emerald-800 font-bold">R</strong>espect for every individual)</span>
                <span className="text-emerald-400 hidden sm:inline">•</span>
                <span>(<strong className="text-emerald-800 font-bold">I</strong>ntegrity)</span>
                <span className="text-emerald-400 hidden sm:inline">•</span>
                <span>(<strong className="text-emerald-800 font-bold">T</strong>eamwork)</span>
                <span className="text-emerald-400 hidden sm:inline">•</span>
                <span>(<strong className="text-emerald-800 font-bold">A</strong>ccountability)</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. Extra Links / Bookmarks if present */}
      {config.extraLinks && config.extraLinks.length > 0 && (
        <div className="px-2 sm:px-4 md:px-6 pt-2">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-700">
                <LinkIcon className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  {config.extraLinks[0].title}
                </h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  {config.extraLinks[0].url}
                </p>
              </div>
            </div>
            <a
              href={config.extraLinks[0].url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition-colors"
            >
              <span>Buka Tautan</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* 6. Universal Google Drive Galeri & Upload Cover Modal */}
      <PortalImagePickerModal
        isOpen={showCoverModal}
        onClose={() => setShowCoverModal(false)}
        onSelectImage={(url) => handleSaveCover(url)}
        currentImage={currentCover || post?.coverImage || config.bannerUrl}
        title={`Ubah Banner Cover - ${sectionTitle}`}
        description="Pilih foto dari Galeri Portal Google Drive, upload foto baru, atau gunakan preset tema resmi."
        allowClear={true}
        onClearImage={() => handleSaveCover(config.bannerUrl)}
      />

      {/* Modal Dialog: Tambah / Edit Menu Item */}
      {editingModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-sky-50/50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  {editingModal.index === null ? <Plus className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingModal.index === null ? 'Tambah Menu Baru' : 'Edit Menu'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kategori: <span className="font-semibold uppercase text-sky-800">{editingModal.type}</span> di {sectionTitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Judul Menu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingModal.title}
                  onChange={(e) => setEditingModal(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Contoh: Quarterly Maintenance, SOP XRF, dll."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-2xs"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Icon / Emoji
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingModal.icon}
                    onChange={(e) => setEditingModal(prev => ({ ...prev, icon: e.target.value }))}
                    placeholder="📘"
                    className="w-20 px-3.5 py-2 text-center text-lg rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-2xs"
                  />
                  <div className="flex gap-1.5 flex-wrap flex-1">
                    {['📘', '📋', '⚙️', '🔬', '📊', '⚡', '📝', '🔒', '💡', '🏷️'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setEditingModal(prev => ({ ...prev, icon: emoji }))}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm border hover:bg-sky-50 transition-colors cursor-pointer ${
                          editingModal.icon === emoji ? 'border-blue-500 bg-blue-50' : 'border-slate-200'
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Link URL Eksternal (Opsional)
                </label>
                <input
                  type="url"
                  value={editingModal.linkUrl}
                  onChange={(e) => setEditingModal(prev => ({ ...prev, linkUrl: e.target.value }))}
                  placeholder="https://... (Kosongkan jika dokumen internal)"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-2xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Jika diisi, klik menu ini akan langsung membuka URL di tab baru.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Jadikan Tipe Logbook</span>
                  <span className="text-[11px] text-slate-400">Tampilan card hijau emerald khusus logbook</span>
                </div>
                <input
                  type="checkbox"
                  checked={editingModal.isLogbook}
                  onChange={(e) => setEditingModal(prev => ({ ...prev, isLogbook: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setEditingModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveItemModal}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
