import React, { useState, useEffect, useMemo } from "react";
import { TbpDashboard } from "./TbpDashboard";
import { Card, Button, Input } from "./ui";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Plus,
  Trash2,
  FileText,
  Settings,
  FolderOpen,
  Calendar,
  Building2,
  ShieldAlert,
  BadgeInfo,
  Menu,
  Edit2,
  Check,
  X,
  Image as ImageIcon,
  ChevronRight,
  File,
  XSquare,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // New Post State
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState<string>("");

  useEffect(() => {
    fetchPosts();
  }, [pt]);

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
      console.log(
        "[Bulletin] API response status:",
        data.status,
        "count:",
        data.data?.length,
      );
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
        console.log("[Bulletin] Setting posts:", allPosts.length);
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

  const getPostTitle = (post: any): string => {
    if (post.title) return post.title;
    try {
      const d = JSON.parse(post.content);
      return d.jenisKegiatan || "Untitled";
    } catch (e) {
      return "Untitled";
    }
  };

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
        setSelectedPost(null);
        setIsEditing(false);
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
    // Plain markdown content
    return post.content;
  };

  // Filter posts by search query
  const filteredPosts = useMemo(() => {
    if (!searchQuery) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter((p) => {
      const title = (p.title || "").toLowerCase();
      return title.includes(q);
    });
  }, [posts, searchQuery]);

  return (
    <div className="flex h-[calc(100vh-80px)] bg-[#1e1e1e] rounded-xl shadow-sm border border-slate-800 overflow-hidden text-slate-200">
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex-shrink-0 border-r border-slate-800 bg-[#2a2a2a] overflow-y-auto flex flex-col"
          >
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="font-semibold text-slate-200 text-sm truncate">
                {pt === "GTS" ? "GTS Workspace" : "TBP Workspace"}
              </div>
            </div>

            <div className="p-2 space-y-4 flex-1">
              <div className="px-2">
                <div className="flex items-center gap-2 px-2 py-1.5 bg-[#1e1e1e] rounded-md border border-slate-700 text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                  <input
                    type="text"
                    placeholder="Search pages..."
                    className="bg-transparent border-none outline-none text-xs w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Pages Section */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="mb-4">
                <div className="px-2 mb-2 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Pages ({posts.length})</span>
                  <Plus
                    className="w-3.5 h-3.5 cursor-pointer hover:text-slate-600"
                    onClick={handleCreateNew}
                  />
                </div>
                <div className="space-y-0.5">
                  {loading ? (
                    <div className="text-xs text-slate-400 px-2 italic py-4 text-center">
                      Memuat data...
                    </div>
                  ) : filteredPosts.length === 0 ? (
                    <div className="text-xs text-slate-400 px-2 italic py-2">
                      No pages found.
                    </div>
                  ) : (
                    filteredPosts.map((post) => {
                      const isSelected =
                        selectedPost?.id === post.id && !isEditing;
                      const postTitle = getPostTitle(post);
                      return (
                        <div
                          key={post.id}
                          onClick={() => {
                            setSelectedPost(post);
                            setIsEditing(false);
                          }}
                          className={`flex items-center gap-2 px-2 py-1.5 text-sm rounded-md cursor-pointer transition-colors ${isSelected ? "bg-[#1e3c2f] text-teal-400 font-medium" : "text-slate-400 hover:bg-[#333] hover:text-slate-200"}`}
                        >
                          <FileText
                            className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-teal-500" : "opacity-50"}`}
                          />
                          <span className="truncate flex-1 text-xs">
                            {postTitle}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] relative overflow-y-auto">
        {/* Topbar */}
        <div className="h-12 border-b border-slate-800 flex items-center px-4 justify-between sticky top-0 bg-[#1e1e1e]/80 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Breadcrumb */}
            {selectedPost && !isEditing && (
              <div className="flex items-center text-xs text-slate-500 gap-1 ml-2">
                <span>Prep & Lab</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-200 font-medium truncate max-w-[200px]">
                  {getPostTitle(selectedPost)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedPost && !isEditing && (
              <>
                <button
                  onClick={() => {
                    setEditTitle(selectedPost.title || "");
                    setEditContent(getRenderableContent(selectedPost));
                    setEditCategory(selectedPost.category || "");
                    setIsEditing(true);
                  }}
                  className="p-1.5 text-slate-500 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deletePost(selectedPost.id)}
                  className="p-1.5 text-slate-500 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
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
                  className="h-7 text-xs px-2 shadow-sm border"
                >
                  <X className="w-3 h-3 mr-1" /> Cancel
                </Button>
                <Button
                  onClick={handleSavePost}
                  className="h-7 text-xs px-3 shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Check className="w-3 h-3 mr-1" /> Save Page
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
              onSelectPost={(post) => {
                setSelectedPost(post);
                setIsEditing(false);
              }}
            />
          ) : isEditing ? (
            <div className="space-y-6">
              {/* Editor Mode */}
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Page Title..."
                className="w-full text-4xl font-black text-slate-100 outline-none placeholder:text-slate-600 bg-transparent"
              />

              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs font-semibold text-slate-500">
                  Category:
                </span>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="text-xs border-slate-700 bg-[#2a2a2a] rounded px-2 py-1 outline-none text-slate-300"
                >
                  <option value="PAGE">Page</option>
                  <option value="INFO::1">Info</option>
                </select>
              </div>

              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder="Start writing in markdown, or press '/' for commands..."
                className="w-full min-h-[500px] text-slate-300 text-base outline-none resize-y placeholder:text-slate-600 bg-transparent leading-relaxed"
                style={{ fontFamily: "var(--font-sans)" }}
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* View Mode */}

              {selectedPost.coverImage && (
                <div className="w-full h-48 md:h-64 rounded-xl overflow-hidden mb-8">
                  <img
                    src={selectedPost.coverImage}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <h1 className="text-4xl md:text-5xl font-black text-slate-100 tracking-tight leading-tight">
                {getPostTitle(selectedPost)}
              </h1>

              <div className="flex items-center gap-2 text-xs text-slate-500 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />{" "}
                  {selectedPost.authorName || "System"}
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />{" "}
                  {new Date(selectedPost.createdAt).toLocaleDateString(
                    "id-ID",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                </div>
              </div>

              <div className="prose prose-invert prose-sm md:prose-base max-w-none prose-headings:font-black prose-a:text-blue-400 prose-img:rounded-xl">
                <ReactMarkdown
                  components={{
                    h1: ({ node, children }) => {
                      const text = String(children).trim();
                      const targetPost = posts.find(
                        (p) =>
                          p.title &&
                          p.title.trim().toLowerCase() === text.toLowerCase(),
                      );
                      if (targetPost && text.length > 3) {
                        return (
                          <div
                            onClick={() => {
                              setSelectedPost(targetPost);
                              setIsEditing(false);
                            }}
                            className="my-2 p-3 border border-slate-700 rounded-lg bg-[#2a2a2a] hover:bg-[#1e3c2f] hover:border-teal-700 cursor-pointer transition-colors flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-[#1e1e1e] rounded-md shadow-sm text-teal-400 group-hover:text-teal-300">
                                <FileText className="w-5 h-5" />
                              </div>
                              <span className="font-semibold text-slate-300 group-hover:text-teal-400">
                                {text}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                          </div>
                        );
                      }
                      return <h1>{children}</h1>;
                    },
                    h2: ({ node, children }) => {
                      const text = String(children).trim();
                      const targetPost = posts.find(
                        (p) =>
                          p.title &&
                          p.title.trim().toLowerCase() === text.toLowerCase(),
                      );
                      if (targetPost && text.length > 3) {
                        return (
                          <div
                            onClick={() => {
                              setSelectedPost(targetPost);
                              setIsEditing(false);
                            }}
                            className="my-2 p-3 border border-slate-700 rounded-lg bg-[#2a2a2a] hover:bg-[#1e3c2f] hover:border-teal-700 cursor-pointer transition-colors flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-[#1e1e1e] rounded-md shadow-sm text-teal-400 group-hover:text-teal-300">
                                <FileText className="w-5 h-5" />
                              </div>
                              <span className="font-semibold text-slate-300 group-hover:text-teal-400">
                                {text}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                          </div>
                        );
                      }
                      return <h2>{children}</h2>;
                    },
                    h3: ({ node, children }) => {
                      const text = String(children).trim();
                      const targetPost = posts.find(
                        (p) =>
                          p.title &&
                          p.title.trim().toLowerCase() === text.toLowerCase(),
                      );
                      if (targetPost && text.length > 3) {
                        return (
                          <div
                            onClick={() => {
                              setSelectedPost(targetPost);
                              setIsEditing(false);
                            }}
                            className="my-2 p-3 border border-slate-700 rounded-lg bg-[#2a2a2a] hover:bg-[#1e3c2f] hover:border-teal-700 cursor-pointer transition-colors flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-[#1e1e1e] rounded-md shadow-sm text-teal-400 group-hover:text-teal-300">
                                <FileText className="w-5 h-5" />
                              </div>
                              <span className="font-semibold text-slate-300 group-hover:text-teal-400">
                                {text}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                          </div>
                        );
                      }
                      return <h3>{children}</h3>;
                    },
                    blockquote: ({ node, children }) => {
                      const text = String(children)
                        .replace(/\"/g, "")
                        .trim()
                        .toLowerCase();
                      if (text.includes("menu info")) return null;
                      return <blockquote>{children}</blockquote>;
                    },
                    p: ({ node, children }) => {
                      if (
                        typeof children === "string" &&
                        children.replace(/\"/g, "").trim().toLowerCase() ===
                          "menu info laboratorium"
                      )
                        return null;
                      const text = String(children).trim();
                      const targetPost = posts.find(
                        (p) =>
                          p.title &&
                          p.title.trim().toLowerCase() === text.toLowerCase(),
                      );
                      if (targetPost && text.length > 3) {
                        return (
                          <div
                            onClick={() => {
                              setSelectedPost(targetPost);
                              setIsEditing(false);
                            }}
                            className="my-2 p-3 border border-slate-200 rounded-lg bg-slate-50 hover:bg-teal-50 hover:border-teal-200 cursor-pointer transition-colors flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-md shadow-sm text-teal-600 group-hover:text-teal-700">
                                <FileText className="w-5 h-5" />
                              </div>
                              <span className="font-semibold text-slate-700 group-hover:text-teal-800">
                                {text}
                              </span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600" />
                          </div>
                        );
                      }
                      return <p>{children}</p>;
                    },
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
    </div>
  );
}
