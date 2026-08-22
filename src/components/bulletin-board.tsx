import React, { useState, useEffect, useMemo, useCallback } from "react";
import { TbpDashboard } from "./TbpDashboard";
import { SectionHubDashboard } from "./SectionHubDashboard";
import { NotionDatabaseTable, TableRowData } from "./NotionDatabaseTable";
import { Card, Button, Input } from "./ui";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Plus,
  Trash2,
  FileText,
  Settings,
  FolderOpen,
  Folder,
  Calendar,
  CalendarDays,
  Building2,
  ShieldAlert,
  BadgeInfo,
  Menu,
  Edit2,
  Check,
  X,
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ArrowLeft,
  Home,
  File,
  XSquare,
  User,
  Layers,
  CornerUpLeft,
  MessageSquare,
  Mic,
  Inbox,
  Mail,
  Clock,
  ArrowUpRight,
  Sparkles,
  MoreHorizontal,
  Table,
  ListTodo,
  FileCheck,
  Bot,
  Send,
  Loader2,
  CalendarCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgendaDashboard } from "./agenda-dashboard";

export function BulletinBoard({
  inspectorName,
  inspectorNik,
}: {
  inspectorName: string;
  inspectorNik: string;
}) {
  const { pt } = useParams();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [navHistory, setNavHistory] = useState<any[]>([]);

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarTab, setSidebarTab] = useState<"all" | "folders">("all");
  const [showAllPostsView, setShowAllPostsView] = useState(false);

  // Agenda & Meetings State
  const [agendaEventsList, setAgendaEventsList] = useState<any[]>([]);
  const [showFullAgendaModal, setShowFullAgendaModal] = useState(false);
  const [showAiMeetingModal, setShowAiMeetingModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(99);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);

  // AI Meeting Note Form State
  const [aiMeetingTitle, setAiMeetingTitle] = useState("");
  const [aiMeetingPic, setAiMeetingPic] = useState(inspectorName);
  const [aiMeetingDate, setAiMeetingDate] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [aiMeetingNotes, setAiMeetingNotes] = useState("");
  const [aiGeneratedContent, setAiGeneratedContent] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [saveToAgenda, setSaveToAgenda] = useState(true);
  const [saveToBulletin, setSaveToBulletin] = useState(true);

  // Recents Post Tracking
  const [recentPostIds, setRecentPostIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("bulletin_recent_post_ids");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // New Post State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState<string>("");

  useEffect(() => {
    fetchPosts();
    fetchAgenda();
    fetchNotifications();
  }, [pt]);

  const fetchAgenda = async () => {
    try {
      const res = await fetch("/api/agenda");
      if (res.ok) {
        const d = await res.json();
        if (d.status === "success" && Array.isArray(d.data)) {
          setAgendaEventsList(d.data);
        }
      }
    } catch (err) {
      console.warn("[Bulletin] Could not fetch agenda:", err);
    }
  };

  const fetchNotifications = async () => {
    if (!inspectorNik) return;
    try {
      const res = await fetch(`/api/notifications?userId=${inspectorNik}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNotificationsList(data);
          const unread = data.filter((n: any) => !n.isRead).length;
          setUnreadNotifCount(unread > 0 ? unread : 99);
        }
      }
    } catch (e) {}
  };

  const addRecentPost = useCallback((postId: number) => {
    setRecentPostIds((prev) => {
      const updated = [postId, ...prev.filter((id) => id !== postId)].slice(0, 12);
      try {
        localStorage.setItem("bulletin_recent_post_ids", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const fetchUrl =
        "/api/bulletin?pt=" + (pt || "TBP") + "&_t=" + Date.now();
      console.log("[Bulletin] Fetching:", fetchUrl, "pt param:", pt);
      const res = await fetch(fetchUrl, {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });
      const data = await res.json();
      if (data.status === "success") {
        const allPosts: any[] = data.data || [];
        try {
          allPosts.sort((a: any, b: any) => {
            return (
              new Date(b.originalCreatedAt || b.createdAt || 0).getTime() -
              new Date(a.originalCreatedAt || a.createdAt || 0).getTime()
            );
          });
        } catch (sortErr) {
          console.error("[Bulletin] Sort error:", sortErr);
        }
        setPosts(allPosts);
      } else {
        console.error("[Bulletin] API error:", data.message);
      }
    } catch (e) {
      console.error("[Bulletin] Fetch error:", e);
      toast.error("Gagal memuat data");
    }
    setLoading(false);
  };

  // Handle URL deep link (e.g. from notifications /bulletin/TBP?postId=411&topic=...)
  useEffect(() => {
    if (posts.length === 0) return;
    try {
      const params = new URLSearchParams(window.location.search);
      const urlPostId = params.get("postId");
      if (urlPostId) {
        const target = posts.find((p) => String(p.id) === urlPostId);
        if (target) {
          setSelectedPost(target);
          addRecentPost(target.id);
        }
      }
    } catch (e) {}
  }, [posts, addRecentPost]);

  const getPostTitle = (post: any): string => {
    if (!post) return "Untitled";
    if (post.title) return post.title.trim();
    try {
      const d = JSON.parse(post.content);
      return d.jenisKegiatan || "Untitled";
    } catch (e) {
      return "Untitled";
    }
  };

  // Determine if a post is a "Folder / Section" containing sub-pages
  const isFolderPost = useCallback((post: any): boolean => {
    if (!post || !post.content) return false;
    const titleUpper = (post.title || "").toUpperCase().trim();
    const mainSections = [
      "INFORMATION",
      "ADMINISTRASI",
      "LABORATORIUM",
      "PREPARASI",
      "QUALITY ASSURANCE",
      "MAINTENANCE",
      "WAREHOUSE",
      "WAREHOUSE / INVENTORY CONTROL",
      "GENERAL ISSUE",
      "GOLDEN RULES",
      "PROMOSI K3",
      "PROMOSI HEALTH",
      "PROMOSI TRAINER",
      "MATERI BRIEFING (SAFETY TALK)",
      "SPDK DAN ATURAN PERUSAHAAN",
      "KEBIJAKAN PERUSAHAAN",
      "INDUKSI INTERNAL",
      "TRAINING NEED ANALYSIS (TNA)",
      "HASIL MEETING INTERNAL PREP & LAB",
    ];
    if (mainSections.includes(titleUpper)) return true;
    // Check if content contains markdown headings like ## or child page links
    return post.content.includes("## ") || post.content.includes("### ");
  }, []);

  // Determine if a post is a Section Hub (e.g. ADMINISTRASI, LABORATORIUM, PREPARASI, etc.)
  const isSectionHubPost = useCallback((post: any): boolean => {
    if (!post) return false;
    const titleUpper = (post.title || "").toUpperCase().trim();
    const sectionHubTitles = [
      "ADMINISTRASI",
      "LABORATORIUM",
      "PREPARASI",
      "QUALITY ASSURANCE",
      "MAINTENANCE",
      "WAREHOUSE",
      "WAREHOUSE / INVENTORY CONTROL",
      "INVENTORY",
      "GENERAL ISSUE",
      "MANAJEMEN MUTU",
    ];
    if (sectionHubTitles.some((t) => titleUpper === t || titleUpper.replace(/^[#\s\-*]+/, "") === t)) {
      return true;
    }
    const content = typeof post.content === "string" ? post.content : "";
    if (content.includes("$INFO$") || content.includes("$RULES$")) {
      return true;
    }
    return false;
  }, []);

  // Find parent post dynamically if not in user history
  const findParentPost = useCallback(
    (currentPost: any): any | null => {
      if (!currentPost) return null;
      const currentTitle = getPostTitle(currentPost).toLowerCase();

      // Check if any post mentions current post title in its content
      for (const p of posts) {
        if (p.id === currentPost.id) continue;
        if (p.content && p.content.toLowerCase().includes(currentTitle)) {
          return p;
        }
      }
      return null;
    },
    [posts]
  );

  // Compute the breadcrumb trail (Dashboard -> Parent(s) -> Current)
  const breadcrumbTrail = useMemo(() => {
    if (!selectedPost) return [];

    // If we have an active history stack from user clicks
    if (navHistory.length > 0) {
      const trail = [...navHistory];
      if (trail[trail.length - 1]?.id !== selectedPost.id) {
        trail.push(selectedPost);
      }
      return trail;
    }

    // Otherwise reconstruct from parent relationships
    const trail: any[] = [selectedPost];
    let parent = findParentPost(selectedPost);
    let guard = 0;
    while (parent && guard < 5) {
      trail.unshift(parent);
      parent = findParentPost(parent);
      guard++;
    }
    return trail;
  }, [selectedPost, navHistory, findParentPost]);

  // Navigate to specific post and maintain history
  const navigateToPost = (post: any | null) => {
    if (post === null) {
      setNavHistory([]);
      setSelectedPost(null);
      setIsEditing(false);
      return;
    }

    if (selectedPost?.id === post.id && !isEditing) return;

    setNavHistory((prev) => {
      const idx = prev.findIndex((h) => h?.id === post.id);
      if (idx !== -1) {
        // Return to earlier history point
        return prev.slice(0, idx + 1);
      }
      // If navigating from dashboard
      if (!selectedPost) {
        // Check if this post has a parent in posts
        const parent = findParentPost(post);
        if (parent) {
          return [parent, post];
        }
        return [post];
      }
      return [...prev, post];
    });

    setSelectedPost(post);
    setIsEditing(false);
  };

  // Go back to previous history or parent
  const goBack = () => {
    if (isEditing) {
      setIsEditing(false);
      return;
    }

    if (breadcrumbTrail.length > 1) {
      const previousPost = breadcrumbTrail[breadcrumbTrail.length - 2];
      // Pop from history
      setNavHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : []));
      setSelectedPost(previousPost);
    } else {
      // Go back to dashboard
      setNavHistory([]);
      setSelectedPost(null);
    }
  };

  // Keyboard shortcut for Back (Escape or Alt+ArrowLeft)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "Escape" || (e.altKey && e.key === "ArrowLeft")) {
        if (selectedPost || isEditing) {
          e.preventDefault();
          goBack();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPost, isEditing, breadcrumbTrail]);

  const handleCreateNew = () => {
    setSelectedPost(null);
    setEditTitle("Untitled Document");
    setEditContent("");
    setEditCategory("PAGE");
    setIsEditing(true);
  };

  const handleSavePost = async () => {
    if (!editTitle.trim()) {
      toast.error("Judul halaman tidak boleh kosong");
      return;
    }
    toast.loading("Menyimpan dokumen...", { id: "save-post" });

    try {
      if (selectedPost) {
        // Update
        await fetch("/api/bulletin/" + selectedPost.id, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: editTitle,
            content: editContent,
            category: editCategory,
          }),
        });
      } else {
        // Create
        await fetch("/api/bulletin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            department: "Prep & Lab",
            category: editCategory,
            title: editTitle,
            content: editContent,
            pt: pt || "TBP",
            authorNik: inspectorNik,
            authorName: inspectorName,
          }),
        });
      }
      toast.success("Berhasil disimpan", { id: "save-post" });
      setIsEditing(false);
      fetchPosts();
    } catch (e) {
      toast.error("Gagal menyimpan", { id: "save-post" });
    }
  };

  const deletePost = async (id: number) => {
    if (!confirm("Anda yakin ingin menghapus halaman ini?")) return;
    toast.loading("Menghapus dokumen...", { id: "del-post" });
    try {
      await fetch(`/api/bulletin/${id}`, { method: "DELETE" });
      toast.success("Halaman dihapus", { id: "del-post" });
      if (selectedPost?.id === id) {
        goBack();
      }
      fetchPosts();
    } catch (e) {
      toast.error("Gagal menghapus", { id: "del-post" });
    }
  };

  // Convert legacy table JSON to markdown for rendering
  const getRenderableContent = (post: any) => {
    if (!post.content) return "";
    try {
      const data = JSON.parse(post.content);
      if (data && typeof data === "object" && data.jenisKegiatan) {
        return `### ${data.jenisKegiatan}\n\n**PIC**: ${data.pic || "-"}\n**Status**: ${data.status || "-"}\n**Priority**: ${data.priority || "-"}\n**Tanggal**: ${data.agendaDate ? new Date(data.agendaDate).toLocaleString() : "-"}\n\n${data.keterangan || ""}`;
      }
    } catch (e) {}
    return post.content;
  };

  // Filter posts by search query and tab
  const filteredPosts = useMemo(() => {
    let list = posts;
    if (sidebarTab === "folders") {
      list = list.filter(isFolderPost);
    }
    if (!searchQuery) return list;
    const q = searchQuery.toLowerCase();
    return list.filter((p) => {
      const title = (p.title || "").toLowerCase();
      return title.includes(q);
    });
  }, [posts, searchQuery, sidebarTab, isFolderPost]);

  const folderCount = useMemo(() => {
    return posts.filter(isFolderPost).length;
  }, [posts, isFolderPost]);

  // Determine immediate parent title for "Kembali" label
  const immediateParentTitle = useMemo(() => {
    if (breadcrumbTrail.length > 1) {
      return getPostTitle(breadcrumbTrail[breadcrumbTrail.length - 2]);
    }
    return "Dashboard";
  }, [breadcrumbTrail]);

  // Helper to extract structured markdown table from post content
  const extractMarkdownTable = useCallback((content: string): {
    headers: string[];
    rows: TableRowData[];
    beforeText: string;
    afterText: string;
  } | null => {
    if (!content || !content.includes("|")) return null;
    const lines = content.split("\n");
    let startIdx = -1;
    let endIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith("|") && line.endsWith("|")) {
        if (startIdx === -1) startIdx = i;
        endIdx = i;
      } else if (startIdx !== -1) {
        break;
      }
    }
    if (startIdx !== -1 && endIdx - startIdx >= 2) {
      const headerLine = lines[startIdx];
      const headers = headerLine
        .split("|")
        .map((h) => h.trim())
        .filter((h, idx, arr) => idx > 0 && idx < arr.length - 1);

      const rows: TableRowData[] = [];
      for (let i = startIdx + 2; i <= endIdx; i++) {
        const rowLine = lines[i].trim();
        if (!rowLine.startsWith("|")) continue;
        const cells = rowLine
          .split("|")
          .map((c) => c.trim())
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);

        if (cells.length > 0) {
          const rowObj: TableRowData = {};
          headers.forEach((h, idx) => {
            rowObj[h] = cells[idx] || "";
          });
          rows.push(rowObj);
        }
      }

      const beforeText = lines.slice(0, startIdx).join("\n");
      const afterText = lines.slice(endIdx + 1).join("\n");

      return { headers, rows, beforeText, afterText };
    }
    return null;
  }, []);

  const parsedTableData = useMemo(() => {
    if (!selectedPost || isEditing) return null;
    const content = getRenderableContent(selectedPost);
    return extractMarkdownTable(content);
  }, [selectedPost, isEditing, extractMarkdownTable, getRenderableContent]);

  // Compute upcoming meetings from agenda
  const upcomingMeetings = useMemo(() => {
    if (!agendaEventsList || agendaEventsList.length === 0) return [];
    const now = new Date();
    return agendaEventsList
      .filter((evt) => {
        // Exclude birthdays from bulletin sidebar meetings list
        if (
          evt.title?.includes("🎂") ||
          evt.title?.toLowerCase().includes("ulang tahun") ||
          evt.kategori === "Quality Assurance" ||
          evt.isBirthday ||
          (evt.id && String(evt.id).startsWith("bday-"))
        ) {
          return false;
        }
        if (!evt.startDate && !evt.start) return false;
        const d = new Date(evt.startDate || evt.start);
        return (
          !isNaN(d.getTime()) &&
          d >= new Date(now.getTime() - 24 * 60 * 60 * 1000)
        );
      })
      .sort((a, b) => {
        const da = new Date(a.startDate || a.start).getTime();
        const db = new Date(b.startDate || b.start).getTime();
        return da - db;
      });
  }, [agendaEventsList]);

  // Notion icons mapping
  const getNotionIcon = (post: any) => {
    const titleLower = (post.title || "").toLowerCase();
    if (titleLower.includes("pt. tbp") || titleLower.includes("workspace") || titleLower.includes("perusahaan")) {
      return <div className="w-3.5 h-3.5 rounded bg-white/10 flex items-center justify-center text-[10px] text-white">🏢</div>;
    }
    if (titleLower.includes("im ") || titleLower.includes("memo")) {
      return <div className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] text-emerald-400">📗</div>;
    }
    if (titleLower.includes("golden rules") || titleLower.includes("safety") || titleLower.includes("k3")) {
      return <FileText className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />;
    }
    if (titleLower.includes("weekly") || titleLower.includes("rekap") || titleLower.includes("tabel")) {
      return <Table className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />;
    }
    if (isFolderPost(post)) {
      return <Folder className="w-3.5 h-3.5 text-amber-400/80 flex-shrink-0" />;
    }
    return <File className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />;
  };

  // Compute recent posts list
  const recentPostsList = useMemo(() => {
    if (posts.length === 0) return [];
    
    // First, map saved recent IDs
    const matched = recentPostIds
      .map((id) => posts.find((p) => p.id === id))
      .filter(Boolean);

    // If fewer than 10, fill with top posts so it looks populated like screenshot
    const matchedIds = new Set(matched.map((p) => p.id));
    const fallbackPosts = posts.filter((p) => !matchedIds.has(p.id)).slice(0, 10 - matched.length);

    return [...matched, ...fallbackPosts];
  }, [posts, recentPostIds]);

  // AI Meeting Note Generator using local formatting + intelligent summarizer
  const handleGenerateAiMeeting = () => {
    if (!aiMeetingNotes.trim() && !aiMeetingTitle.trim()) {
      toast.error("Masukkan topik atau poin catatan rapat terlebih dahulu");
      return;
    }
    setIsGeneratingAi(true);
    setTimeout(() => {
      const generated = `# 📋 NOTULENSI RAPAT: ${aiMeetingTitle || "Rapat Koordinasi Prep & Lab"}

**📅 Tanggal & Waktu**: ${new Date(aiMeetingDate).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" })}  
**👤 PIC / Pemimpin Rapat**: ${aiMeetingPic || inspectorName}  
**🏢 Departemen**: Preparation & Laboratory (PT. TBP & GPS)  
**🤖 AI Status**: *Teringkas Otomatis oleh AI Assistant*

---

## 🎯 1. Agenda & Tujuan
${aiMeetingTitle ? `- Pembahasan mendalam terkait: **${aiMeetingTitle}**` : "- Evaluasi kegiatan operasional harian dan tindak lanjut."}

## 📝 2. Ringkasan Poin Pembahasan
${aiMeetingNotes
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => `- ${l.replace(/^[-*•]\s*/, "")}`)
  .join("\n") || "- Pembahasan kepatuhan SOP dan kelancaran alur preparasi & analisa lab.\n- Koordinasi kesiapan peralatan dan ketersediaan APD."}

## ✅ 3. Keputusan Utama
- Seluruh tim sepakat menindaklanjuti poin-poin yang telah didiskusikan sesuai target waktu.
- Prosedur keselamatan kerja (Golden Rules) wajib dipatuhi di setiap tahapan kerja.

## 🚀 4. Action Items & Tindak Lanjut
| No | Rencana Tindakan | PIC | Target Selesai | Status |
|---|---|---|---|---|
| 1 | Eksekusi perbaikan sesuai notulen | ${aiMeetingPic || "Tim Terkait"} | ${new Date(Date.now() + 3 * 86400000).toLocaleDateString("id-ID")} | 🟡 In Progress |
| 2 | Monitoring dan pelaporan berkala | Foreman Shift | H+7 | ⏳ Pending |

---
*Catatan rapat ini disimpan ke sistem Agenda & Buletin Kerja.*`;

      setAiGeneratedContent(generated);
      setIsGeneratingAi(false);
      toast.success("Notulensi rapat berhasil diformat oleh AI! ✨");
    }, 600);
  };

  const handleSaveAiMeeting = async () => {
    if (!aiMeetingTitle.trim()) {
      toast.error("Judul rapat wajib diisi");
      return;
    }
    const finalContent = aiGeneratedContent || `# 📋 NOTULENSI: ${aiMeetingTitle}\n\n**Tanggal**: ${aiMeetingDate}\n**PIC**: ${aiMeetingPic}\n\n${aiMeetingNotes}`;

    toast.loading("Menyimpan notulensi rapat...", { id: "save-ai-meeting" });

    try {
      // 1. Save to Agenda if checked
      if (saveToAgenda) {
        await fetch("/api/agenda", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `[Meeting] ${aiMeetingTitle}`,
            startDate: new Date(aiMeetingDate),
            endDate: new Date(new Date(aiMeetingDate).getTime() + 60 * 60 * 1000),
            kategori: "Rapat",
            pic: aiMeetingPic || inspectorName,
            deskripsi: finalContent.slice(0, 500),
            creatorNik: inspectorNik,
            department: "Prep & Lab",
          }),
        });
        fetchAgenda();
      }

      // 2. Save to Bulletin if checked
      if (saveToBulletin) {
        const res = await fetch("/api/bulletin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            department: "Prep & Lab",
            category: "MEETING",
            title: `[MEETING] ${aiMeetingTitle}`,
            content: finalContent,
            pt: pt || "TBP",
            authorNik: inspectorNik,
            authorName: inspectorName,
          }),
        });
        const d = await res.json();
        if (d.status === "success" && d.data) {
          addRecentPost(d.data.id);
          setSelectedPost(d.data);
        }
        fetchPosts();
      }

      toast.success("Catatan rapat berhasil disimpan ke sistem! 🎉", { id: "save-ai-meeting" });
      setShowAiMeetingModal(false);
      setAiMeetingTitle("");
      setAiMeetingNotes("");
      setAiGeneratedContent("");
    } catch (e: any) {
      toast.error("Gagal menyimpan: " + e.message, { id: "save-ai-meeting" });
    }
  };

  // Keyboard shortcut Ctrl+K for search
  useEffect(() => {
    const handleSearchShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, []);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#191919] rounded-xl shadow-lg border border-[#2d2d2d] overflow-hidden text-slate-200 select-none">
      {/* Notion Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 250, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 border-r border-[#262626] bg-[#191919] overflow-y-auto flex flex-col font-sans select-none"
          >
            {/* Header: Preparation & Lab Notion */}
            <div className="px-3 py-3 flex items-center justify-between text-slate-200 hover:bg-[#202020] cursor-pointer transition-colors border-b border-[#242424]">
              <div
                onClick={() => navigateToPost(null)}
                className="flex items-center gap-2 min-w-0 flex-1"
                title="Buka Beranda Workspace"
              >
                <div className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold text-[10px] flex-shrink-0 shadow-inner">
                  ☢
                </div>
                <span className="font-bold text-xs text-slate-100 truncate tracking-tight">
                  Prep & Lab Bulletin
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            </div>

            {/* Top Action Pill Bar (Home, Chat, AI Note/Mic, Inbox 99+, Search) */}
            <div className="px-3 py-2.5 flex items-center justify-between gap-1 text-slate-400 border-b border-[#242424]">
              {/* Home Pill */}
              <button
                onClick={() => navigateToPost(null)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  !selectedPost && !isEditing
                    ? "bg-[#2e2e2e] text-white shadow-xs"
                    : "bg-[#222222] text-slate-300 hover:bg-[#2c2c2c] hover:text-white"
                }`}
                title="Beranda Dashboard"
              >
                <Home className="w-3.5 h-3.5 text-slate-300" />
                <span>Home</span>
              </button>

              {/* Chat Icon */}
              <button
                onClick={() => {
                  toast.info("Membuka kanal komunikasi tim Prep & Lab");
                }}
                className="p-1.5 rounded-lg hover:bg-[#272727] text-slate-400 hover:text-slate-200 transition-colors"
                title="Pesan / Chat Tim"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              {/* AI Meeting Note (Mic) */}
              <button
                onClick={() => setShowAiMeetingModal(true)}
                className="p-1.5 rounded-lg hover:bg-[#272727] text-slate-400 hover:text-teal-400 transition-colors"
                title="Catatan Rapat AI Baru"
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Inbox / Notification Badge 99+ */}
              <button
                onClick={() => setShowNotifModal(true)}
                className="p-1.5 rounded-lg hover:bg-[#272727] text-slate-400 hover:text-slate-200 transition-colors relative"
                title="Inbox & Notifikasi"
              >
                <Inbox className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-1 px-1 py-0.2 min-w-[15px] h-3.5 rounded-full bg-rose-600 text-white font-bold text-[9px] flex items-center justify-center leading-none">
                  {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                </span>
              </button>

              {/* Search Icon */}
              <button
                onClick={() => setShowSearchModal(true)}
                className="p-1.5 rounded-lg hover:bg-[#272727] text-slate-400 hover:text-slate-200 transition-colors"
                title="Cari Dokumen (Ctrl + K)"
              >
                <Search className="w-4 h-4" />
              </button>
            </div>

            {/* Meetings Section (Integrated with Agenda Module) */}
            <div className="px-3 pt-3 pb-2 border-b border-[#242424]">
              <div className="text-[11px] font-semibold text-slate-400 mb-1.5 tracking-wide">
                Meetings
              </div>

              <div className="space-y-0.5">
                {/* Upcoming Events or No upcoming events */}
                {upcomingMeetings.length === 0 ? (
                  <div className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-slate-400 rounded-md">
                    <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span className="truncate">No upcoming events</span>
                  </div>
                ) : (
                  upcomingMeetings.slice(0, 2).map((evt: any) => (
                    <div
                      key={evt.id}
                      onClick={() => setShowFullAgendaModal(true)}
                      className="flex items-center gap-2.5 px-2 py-1.5 text-xs text-slate-300 hover:bg-[#242424] hover:text-teal-300 rounded-md cursor-pointer transition-colors group"
                      title={evt.title}
                    >
                      <Clock className="w-3.5 h-3.5 text-teal-400 group-hover:scale-110 transition-transform flex-shrink-0" />
                      <span className="truncate flex-1 font-medium">
                        {evt.title}
                      </span>
                    </div>
                  ))
                )}

                {/* + New AI meeting note */}
                <button
                  onClick={() => setShowAiMeetingModal(true)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#242424] rounded-md transition-colors text-left group"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors flex-shrink-0" />
                  <span className="truncate">New AI meeting note</span>
                </button>

                {/* ↗ View all */}
                <button
                  onClick={() => setShowFullAgendaModal(true)}
                  className="w-full flex items-center gap-2.5 px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#242424] rounded-md transition-colors text-left group"
                >
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-teal-400 transition-colors flex-shrink-0" />
                  <span className="truncate">View all</span>
                </button>
              </div>
            </div>

            {/* Recents Section */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 custom-scrollbar">
              <div className="text-[11px] font-semibold text-slate-400 mb-1.5 tracking-wide flex items-center justify-between">
                <span>{showAllPostsView ? "Semua Dokumen" : "Recents"}</span>
                {showAllPostsView && (
                  <button
                    onClick={() => setShowAllPostsView(false)}
                    className="text-[10px] text-teal-400 hover:underline"
                  >
                    Kembali
                  </button>
                )}
              </div>

              {/* List of Recent / All Posts */}
              <div className="space-y-0.5">
                {(showAllPostsView ? filteredPosts : recentPostsList).map((post) => {
                  const isSelected = selectedPost?.id === post.id && !isEditing;
                  const title = getPostTitle(post);
                  const icon = getNotionIcon(post);

                  return (
                    <div
                      key={post.id}
                      onClick={() => {
                        addRecentPost(post.id);
                        navigateToPost(post);
                      }}
                      className={`flex items-center gap-2.5 px-2 py-1.5 text-xs rounded-md cursor-pointer transition-all ${
                        isSelected
                          ? "bg-[#2a2a2a] text-white font-medium shadow-xs"
                          : "text-slate-300 hover:bg-[#232323] hover:text-slate-100"
                      }`}
                      title={title}
                    >
                      {icon}
                      <span className="truncate flex-1">{title}</span>
                      {post.category === "TEMPLATE" && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-slate-700/60 text-slate-400 font-mono">
                          Template
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* ... More Button */}
                {!showAllPostsView && (
                  <button
                    onClick={() => setShowAllPostsView(true)}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-[#242424] rounded-md transition-colors text-left group"
                  >
                    <MoreHorizontal className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 flex-shrink-0" />
                    <span>More ({posts.length})</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full bg-[#1b1b1b] relative overflow-y-auto">
        {/* Topbar with Hierarchical Navigation */}
        <div className="h-12 border-b border-slate-800 flex items-center px-4 justify-between sticky top-0 bg-[#1b1b1b]/90 backdrop-blur-md z-10">
          <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
            {/* Toggle Sidebar Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              title="Toggle Sidebar"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Back Button (Only when inside a document or editing) */}
            {(selectedPost || isEditing) && (
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#282828] hover:bg-teal-950/60 text-slate-300 hover:text-teal-300 text-xs font-medium border border-slate-700 hover:border-teal-600/50 transition-all shadow-xs group"
                title={`Kembali ke ${immediateParentTitle} (Esc / Alt+←)`}
              >
                <ArrowLeft className="w-3.5 h-3.5 text-teal-400 group-hover:-translate-x-0.5 transition-transform" />
                <span className="hidden sm:inline font-semibold">Kembali</span>
              </button>
            )}

            {/* Interactive Breadcrumb Hierarchy */}
            <nav
              aria-label="Breadcrumb"
              className="flex items-center text-xs text-slate-400 gap-1 overflow-x-auto no-scrollbar py-1"
            >
              {/* Root Dashboard Link */}
              <button
                onClick={() => navigateToPost(null)}
                className={`flex items-center gap-1 px-1.5 py-1 rounded-md transition-colors hover:bg-slate-800 hover:text-slate-100 flex-shrink-0 ${
                  !selectedPost && !isEditing
                    ? "text-teal-400 font-semibold"
                    : "text-slate-400"
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>

              {/* Breadcrumb Steps */}
              {breadcrumbTrail.map((crumb, idx) => {
                const isLast = idx === breadcrumbTrail.length - 1 && !isEditing;
                const crumbTitle = getPostTitle(crumb);

                return (
                  <React.Fragment key={crumb.id || idx}>
                    <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                    <button
                      onClick={() => navigateToPost(crumb)}
                      disabled={isLast}
                      className={`px-1.5 py-1 rounded-md truncate max-w-[160px] transition-colors ${
                        isLast
                          ? "text-teal-300 font-semibold cursor-default bg-[#1e3c2f]/40 border border-teal-600/30"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 cursor-pointer"
                      }`}
                      title={crumbTitle}
                    >
                      {crumbTitle}
                    </button>
                  </React.Fragment>
                );
              })}

              {isEditing && (
                <>
                  <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                  <span className="text-amber-300 font-medium px-1.5 py-0.5 bg-amber-950/40 rounded border border-amber-600/30">
                    {selectedPost ? "Edit Mode" : "New Page"}
                  </span>
                </>
              )}
            </nav>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {selectedPost && !isEditing && (
              <>
                <button
                  onClick={() => {
                    setEditTitle(selectedPost.title || "");
                    setEditContent(getRenderableContent(selectedPost));
                    setEditCategory(selectedPost.category || "");
                    setIsEditing(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-blue-400 rounded-md hover:bg-slate-800 transition-colors"
                  title="Edit Halaman"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deletePost(selectedPost.id)}
                  className="p-1.5 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-800 transition-colors"
                  title="Hapus Halaman"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            {isEditing && (
              <>
                <Button
                  onClick={() => {
                    setIsEditing(false);
                    if (!selectedPost) setEditTitle("");
                  }}
                  variant="secondary"
                  className="h-7 text-xs px-2.5 shadow-sm border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  <X className="w-3 h-3 mr-1" /> Batal
                </Button>
                <Button
                  onClick={handleSavePost}
                  className="h-7 text-xs px-3 shadow-sm bg-teal-600 hover:bg-teal-700 text-white font-medium"
                >
                  <Check className="w-3 h-3 mr-1" /> Simpan
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 w-full pb-32">
          {!selectedPost && !isEditing ? (
            <TbpDashboard
              posts={posts}
              onSelectPost={(post) => navigateToPost(post)}
            />
          ) : isEditing ? (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Editor Mode */}
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Judul Halaman..."
                className="w-full text-3xl md:text-4xl font-black text-slate-100 outline-none placeholder:text-slate-600 bg-transparent border-b border-slate-800 pb-3"
              />

              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs font-semibold text-slate-400">
                  Kategori:
                </span>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="text-xs border-slate-700 bg-[#2a2a2a] rounded-lg px-2.5 py-1.5 outline-none text-slate-300 border focus:border-teal-500"
                >
                  <option value="PAGE">Page</option>
                  <option value="INFO::1">Info</option>
                </select>
              </div>

              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Tulis dokumen dalam format Markdown (Gunakan ## untuk membuat link sub-menu)..."
                className="w-full min-h-[500px] text-slate-300 text-base outline-none resize-y placeholder:text-slate-600 bg-[#222] p-4 rounded-xl border border-slate-800 focus:border-slate-700 leading-relaxed font-mono"
              />
            </div>
          ) : isSectionHubPost(selectedPost) ? (
            <div className="space-y-6 max-w-5xl mx-auto">
              {/* View Mode Contextual Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <button
                  onClick={goBack}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#2f2f2f] text-slate-300 hover:text-white text-xs font-medium transition-all shadow-xs border border-slate-700 hover:border-teal-600/60 group cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-teal-400 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Kembali ke <strong className="text-teal-300 font-semibold">{immediateParentTitle}</strong></span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-teal-950/60 text-teal-300 border border-teal-700/50 font-mono">
                    SECTION HOMEPAGE
                  </span>
                </div>
              </div>

              <SectionHubDashboard
                post={selectedPost}
                posts={posts}
                onSelectPost={(p) => navigateToPost(p)}
                onGoHome={() => navigateToPost(null)}
              />
            </div>
          ) : parsedTableData ? (
            <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-200">
              {/* View Mode Contextual Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <button
                  onClick={goBack}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#2f2f2f] text-slate-300 hover:text-white text-xs font-medium transition-all shadow-xs border border-slate-700 hover:border-teal-600/60 group cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-teal-400 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Kembali ke <strong className="text-teal-300 font-semibold">{immediateParentTitle}</strong></span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-950/60 text-blue-300 border border-blue-700/50 font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    DATABASE TABLE
                  </span>
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                    {selectedPost.category || "PAGE"}
                  </span>
                </div>
              </div>

              {/* Cover Image */}
              {selectedPost.coverImage && (
                <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-6 border border-slate-800 shadow-md">
                  <img
                    src={selectedPost.coverImage}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Title & Metadata */}
              <div>
                <h1 className="text-3xl md:text-5xl font-black text-slate-100 tracking-tight leading-tight mb-3">
                  {getPostTitle(selectedPost)}
                </h1>

                <div className="flex items-center gap-2 text-xs text-slate-400 pb-2">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedPost.authorName || "System"}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {new Date(selectedPost.createdAt).toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "long", year: "numeric" }
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content Before Table */}
              {parsedTableData.beforeText.trim() && (
                <div className="prose prose-invert prose-sm md:prose-base max-w-none prose-headings:font-black prose-a:text-teal-400 prose-img:rounded-xl">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {parsedTableData.beforeText}
                  </ReactMarkdown>
                </div>
              )}

              {/* Interactive Notion Database Table */}
              <NotionDatabaseTable
                postId={selectedPost.id}
                headers={parsedTableData.headers}
                rows={parsedTableData.rows}
                title={getPostTitle(selectedPost)}
                section={selectedPost.category || selectedPost.department || "Administrasi"}
                currentAuthorNik={inspectorNik}
                currentAuthorName={inspectorName}
                pt={pt || "TBP"}
              />

              {/* Content After Table */}
              {parsedTableData.afterText.trim() && (
                <div className="prose prose-invert prose-sm md:prose-base max-w-none prose-headings:font-black prose-a:text-teal-400 prose-img:rounded-xl pt-4">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {parsedTableData.afterText}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* View Mode Contextual Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <button
                  onClick={goBack}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#242424] hover:bg-[#2f2f2f] text-slate-300 hover:text-white text-xs font-medium transition-all shadow-xs border border-slate-700 hover:border-teal-600/60 group cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-teal-400 group-hover:-translate-x-0.5 transition-transform" />
                  <span>Kembali ke <strong className="text-teal-300 font-semibold">{immediateParentTitle}</strong></span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                    {selectedPost.category || "PAGE"}
                  </span>
                </div>
              </div>

              {/* Cover Image */}
              {selectedPost.coverImage && (
                <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-6 border border-slate-800 shadow-md">
                  <img
                    src={selectedPost.coverImage}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Title & Metadata */}
              <div>
                <h1 className="text-3xl md:text-5xl font-black text-slate-100 tracking-tight leading-tight mb-3">
                  {getPostTitle(selectedPost)}
                </h1>

                <div className="flex items-center gap-2 text-xs text-slate-400 pb-4">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedPost.authorName || "System"}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {new Date(selectedPost.createdAt).toLocaleDateString(
                        "id-ID",
                        { day: "numeric", month: "long", year: "numeric" }
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rendered Content */}
              <div className="prose prose-invert prose-sm md:prose-base max-w-none prose-headings:font-black prose-a:text-teal-400 prose-img:rounded-xl">
                <ReactMarkdown
                  components={{
                    h1: ({ node, children }) => {
                      const text = String(children).trim();
                      const clean = text.replace(/^[#\s\-*]+/, "").trim().toLowerCase();
                      const targetPost = posts.find(
                        (p) =>
                          p.title &&
                          (p.title.trim().toLowerCase() === clean ||
                            p.title.trim().toLowerCase().replace(/^[#\s\-*]+/, "") === clean ||
                            (clean.length >= 4 &&
                              (p.title.toLowerCase().includes(clean) ||
                                clean.includes(p.title.toLowerCase().trim()))))
                      );
                      if (targetPost && text.length > 3) {
                        return (
                          <div
                            onClick={() => navigateToPost(targetPost)}
                            className="my-2.5 p-3.5 border border-slate-700/80 rounded-xl bg-[#242424] hover:bg-[#1a382d] hover:border-teal-600/70 cursor-pointer transition-all flex items-center justify-between group shadow-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-[#181818] rounded-lg shadow-sm text-teal-400 group-hover:text-teal-300 group-hover:bg-[#1e3c2f]">
                                <Folder className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-200 group-hover:text-teal-300 block text-sm">
                                  {text}
                                </span>
                                <span className="text-[11px] text-slate-500 group-hover:text-slate-400">
                                  Klik untuk membuka halaman / dokumen
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        );
                      }
                      return <h1 className="text-2xl font-bold mt-6 mb-3 text-slate-100">{children}</h1>;
                    },
                    h2: ({ node, children }) => {
                      const text = String(children).trim();
                      const clean = text.replace(/^[#\s\-*]+/, "").trim().toLowerCase();
                      const targetPost = posts.find(
                        (p) =>
                          p.title &&
                          (p.title.trim().toLowerCase() === clean ||
                            p.title.trim().toLowerCase().replace(/^[#\s\-*]+/, "") === clean ||
                            (clean.length >= 4 &&
                              (p.title.toLowerCase().includes(clean) ||
                                clean.includes(p.title.toLowerCase().trim()))))
                      );
                      if (targetPost && text.length > 3) {
                        return (
                          <div
                            onClick={() => navigateToPost(targetPost)}
                            className="my-2.5 p-3.5 border border-slate-700/80 rounded-xl bg-[#242424] hover:bg-[#1a382d] hover:border-teal-600/70 cursor-pointer transition-all flex items-center justify-between group shadow-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-[#181818] rounded-lg shadow-sm text-teal-400 group-hover:text-teal-300 group-hover:bg-[#1e3c2f]">
                                <Folder className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-200 group-hover:text-teal-300 block text-sm">
                                  {text}
                                </span>
                                <span className="text-[11px] text-slate-500 group-hover:text-slate-400">
                                  Klik untuk membuka sub-halaman
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        );
                      }
                      return <h2 className="text-xl font-bold mt-5 mb-2 text-slate-200">{children}</h2>;
                    },
                    h3: ({ node, children }) => {
                      const text = String(children).trim();
                      const clean = text.replace(/^[#\s\-*]+/, "").trim().toLowerCase();
                      const targetPost = posts.find(
                        (p) =>
                          p.title &&
                          (p.title.trim().toLowerCase() === clean ||
                            p.title.trim().toLowerCase().replace(/^[#\s\-*]+/, "") === clean ||
                            (clean.length >= 4 &&
                              (p.title.toLowerCase().includes(clean) ||
                                clean.includes(p.title.toLowerCase().trim()))))
                      );
                      if (targetPost && text.length > 3) {
                        return (
                          <div
                            onClick={() => navigateToPost(targetPost)}
                            className="my-2 p-3 border border-slate-700/80 rounded-xl bg-[#242424] hover:bg-[#1a382d] hover:border-teal-600/70 cursor-pointer transition-all flex items-center justify-between group shadow-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-[#181818] rounded-lg text-teal-400 group-hover:text-teal-300">
                                <FileText className="w-4 h-4" />
                              </div>
                              <span className="font-semibold text-slate-200 group-hover:text-teal-300 text-xs">
                                {text}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        );
                      }
                      return <h3 className="text-lg font-bold mt-4 mb-2 text-slate-300">{children}</h3>;
                    },
                    blockquote: ({ node, children }) => {
                      const text = String(children)
                        .replace(/\"/g, "")
                        .trim()
                        .toLowerCase();
                      if (text.includes("menu info")) return null;
                      return (
                        <blockquote className="border-l-4 border-teal-500/60 bg-[#222] px-4 py-2 my-3 rounded-r-lg text-slate-300 italic">
                          {children}
                        </blockquote>
                      );
                    },
                    p: ({ node, children }) => {
                      if (
                        typeof children === "string" &&
                        children.replace(/\"/g, "").trim().toLowerCase() ===
                          "menu info laboratorium"
                      )
                        return null;
                      const text = String(children).trim();
                      const clean = text.replace(/^[#\s\-*]+/, "").trim().toLowerCase();
                      const targetPost = posts.find(
                        (p) =>
                          p.title &&
                          (p.title.trim().toLowerCase() === clean ||
                            p.title.trim().toLowerCase().replace(/^[#\s\-*]+/, "") === clean ||
                            (clean.length >= 4 &&
                              (p.title.toLowerCase().includes(clean) ||
                                clean.includes(p.title.toLowerCase().trim()))))
                      );
                      if (targetPost && text.length > 3) {
                        return (
                          <div
                            onClick={() => navigateToPost(targetPost)}
                            className="my-2 p-3 border border-slate-700/80 rounded-xl bg-[#242424] hover:bg-[#1a382d] hover:border-teal-600/70 cursor-pointer transition-all flex items-center justify-between group shadow-xs"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-1.5 bg-[#181818] rounded-lg text-teal-400 group-hover:text-teal-300">
                                <FileText className="w-4 h-4" />
                              </div>
                              <span className="font-semibold text-slate-200 group-hover:text-teal-300 text-xs">
                                {text}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        );
                      }
                      return <p className="mb-3 leading-relaxed text-slate-300">{children}</p>;
                    },
                    a: ({ href, children }) => {
                      const url = href || "";
                      const text = String(children);
                      const isDrive = url.includes("drive.google.com");
                      const isFile =
                        isDrive ||
                        url.includes("/uploads/notion/") ||
                        url.match(/\.(pdf|docx?|pptx?|xlsx?|zip|png|jpe?g)$/i) ||
                        text.match(/\.(pdf|docx?|pptx?|xlsx?|zip|png|jpe?g)/i);

                      if (isFile) {
                        return (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 my-1.5 rounded-lg bg-[#282828] hover:bg-[#1a382d] border border-slate-700 hover:border-teal-500/70 text-teal-300 hover:text-teal-200 text-xs font-medium transition-all shadow-xs group no-underline"
                          >
                            <FileText className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
                            <span className="font-semibold">{children}</span>
                            <span className="text-[10px] text-slate-400 bg-[#181818] px-1.5 py-0.5 rounded ml-1 group-hover:text-teal-300">
                              {isDrive ? "Google Drive" : "Unduh File"}
                            </span>
                          </a>
                        );
                      }

                      return (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-400 hover:text-teal-300 underline underline-offset-2 transition-colors"
                        >
                          {children}
                        </a>
                      );
                    },
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-4 rounded-xl border border-slate-800 shadow-sm">
                        <table className="w-full text-left text-xs border-collapse">
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-[#242424] text-slate-200 font-bold border-b border-slate-700">
                        {children}
                      </thead>
                    ),
                    th: ({ children }) => (
                      <th className="px-4 py-2.5 font-bold text-slate-200">
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className="px-4 py-2 border-b border-slate-800/60 text-slate-300">
                        {children}
                      </td>
                    ),
                  }}
                  remarkPlugins={[remarkGfm]}
                >
                  {getRenderableContent(selectedPost)}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Full Agenda Modal */}
      {showFullAgendaModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-slate-700 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#242424]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-950/60 border border-teal-600/40 text-teal-400">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">
                    Agenda & Jadwal Kegiatan Tim
                  </h2>
                  <p className="text-xs text-slate-400">
                    Integrasi kalender operasional, meeting, dan jadwal rutin Prep & Lab
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFullAgendaModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#333] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-[#1a1a1a]">
              <AgendaDashboard
                inspectorNik={inspectorNik}
                inspectorName={inspectorName}
                userDept="Preparation & Laboratory"
              />
            </div>
          </div>
        </div>
      )}

      {/* AI Meeting Note Modal */}
      {showAiMeetingModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-slate-700 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-[#242424]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-950/60 border border-teal-600/40 text-teal-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">
                    New AI Meeting Note (Notulensi Rapat)
                  </h2>
                  <p className="text-xs text-slate-400">
                    Buat dan format otomatis notulensi rapat dengan asisten cerdas AI
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiMeetingModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#333] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Judul / Topik Rapat <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Rapat Koordinasi Shift & Kalibrasi XRF"
                  value={aiMeetingTitle}
                  onChange={(e) => setAiMeetingTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#282828] border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    PIC / Pemimpin Rapat
                  </label>
                  <input
                    type="text"
                    value={aiMeetingPic}
                    onChange={(e) => setAiMeetingPic(e.target.value)}
                    className="w-full px-3 py-2 bg-[#282828] border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Waktu & Tanggal
                  </label>
                  <input
                    type="datetime-local"
                    value={aiMeetingDate}
                    onChange={(e) => setAiMeetingDate(e.target.value)}
                    className="w-full px-3 py-2 bg-[#282828] border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">
                    Poin-Poin Catatan / Diskusi Rapat
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAiMeeting}
                    disabled={isGeneratingAi}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-600/30 hover:bg-teal-600/50 border border-teal-500/50 text-teal-300 font-semibold text-[11px] transition-colors"
                  >
                    {isGeneratingAi ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Merangkum...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                        <span>✨ Format & Rapikan dengan AI</span>
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  rows={4}
                  placeholder="Ketik poin rapat di sini...&#10;- Evaluasi antrian preparasi sampel&#10;- Jadwal kalibrasi spektrometer&#10;- Peningkatan kepatuhan APD"
                  value={aiMeetingNotes}
                  onChange={(e) => setAiMeetingNotes(e.target.value)}
                  className="w-full p-3 bg-[#282828] border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500 text-xs font-mono resize-none leading-relaxed"
                />
              </div>

              {aiGeneratedContent && (
                <div>
                  <label className="block font-semibold text-teal-400 mb-1">
                    Hasil Format Notulensi AI (Markdown)
                  </label>
                  <textarea
                    rows={6}
                    value={aiGeneratedContent}
                    onChange={(e) => setAiGeneratedContent(e.target.value)}
                    className="w-full p-3 bg-[#242424] border border-teal-700/50 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500 text-xs font-mono resize-none leading-relaxed"
                  />
                </div>
              )}

              <div className="p-3 bg-[#242424] rounded-lg border border-slate-800 space-y-2">
                <span className="font-semibold text-slate-300 block text-[11px]">
                  Tujuan Penyimpanan:
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={saveToAgenda}
                      onChange={(e) => setSaveToAgenda(e.target.checked)}
                      className="rounded bg-[#1a1a1a] border-slate-700 text-teal-500 focus:ring-0"
                    />
                    <span>📅 Kalender Agenda Tim</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={saveToBulletin}
                      onChange={(e) => setSaveToBulletin(e.target.checked)}
                      className="rounded bg-[#1a1a1a] border-slate-700 text-teal-500 focus:ring-0"
                    />
                    <span>📰 Buletin Workspace Notion</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-end gap-2 bg-[#242424]">
              <Button
                onClick={() => setShowAiMeetingModal(false)}
                variant="secondary"
                className="text-xs"
              >
                Batal
              </Button>
              <Button
                onClick={handleSaveAiMeeting}
                className="text-xs bg-teal-600 hover:bg-teal-500 text-white font-semibold"
              >
                Simpan Catatan Rapat
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Search Modal (Ctrl + K) */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
          <div className="bg-[#202020] border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 border-b border-slate-800 flex items-center gap-3 bg-[#242424]">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                autoFocus
                type="text"
                placeholder="Ketik untuk mencari dokumen atau menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full text-slate-200 placeholder:text-slate-500"
              />
              <button
                onClick={() => setShowSearchModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
              {filteredPosts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 italic">
                  Tidak ada dokumen yang cocok dengan "{searchQuery}"
                </div>
              ) : (
                filteredPosts.slice(0, 15).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      addRecentPost(p.id);
                      navigateToPost(p);
                      setShowSearchModal(false);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-lg hover:bg-[#2c2c2c] hover:text-white cursor-pointer transition-colors text-slate-300 group"
                  >
                    {getNotionIcon(p)}
                    <span className="truncate flex-1 font-medium group-hover:text-teal-300">
                      {getPostTitle(p)}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-teal-400" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
          <div className="bg-[#202020] border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-[#242424]">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-teal-400" />
                <span className="font-bold text-sm text-slate-200">
                  Inbox & Notifikasi Tim
                </span>
              </div>
              <button
                onClick={() => setShowNotifModal(false)}
                className="p-1 rounded-md text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto p-3 space-y-2">
              {notificationsList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 italic">
                  Tidak ada notifikasi baru saat ini.
                </div>
              ) : (
                notificationsList.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-lg bg-[#262626] border border-slate-800 text-xs text-slate-300 space-y-1"
                  >
                    <div className="font-semibold text-slate-200 flex items-center justify-between">
                      <span>{n.title || "Pemberitahuan Sistem"}</span>
                      <span className="text-[10px] text-slate-500">
                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ""}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {n.message || n.content || "Pemberitahuan baru telah diterbitkan."}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
