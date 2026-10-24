import React, { useEffect, useRef, useState } from "react";
import { Check, ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Latar belakang Menu Tab (landing 3D) yang bisa diganti pengguna.
// Pilihan disimpan per browser & berlaku untuk semua Menu Tab sekaligus.

type BackdropId = "earth" | "default" | "teal" | "custom";

interface BackdropPreset {
  id: BackdropId;
  label: string;
  /** true = latar gelap → judul & deskripsi Menu Tab otomatis putih */
  dark: boolean;
  style: React.CSSProperties;
}

const STORAGE_KEY = "preplab_menu_tab_bg";
const CUSTOM_KEY = "preplab_menu_tab_bg_custom";
const CHANGE_EVENT = "menu-tab-bg-change";
// Bawaan terang sesuai aturan UI (.agents/rules/ui_theme_policy.md); Bumi Malam tetap bisa dipilih
const DEFAULT_ID: BackdropId = "default";
const MAX_CUSTOM_WIDTH = 1920;

const PRESETS: BackdropPreset[] = [
  {
    id: "earth",
    label: "Bumi Malam",
    dark: true,
    style: { backgroundImage: "url('/images/backgrounds/menu-tab-earth.jpg?v=3')", backgroundSize: "cover", backgroundPosition: "center 45%" },
  },
  { id: "default", label: "Putih Bersih", dark: false, style: { backgroundColor: "#ffffff" } },
  {
    id: "teal",
    label: "Teal Lembut",
    dark: false,
    style: { backgroundImage: "linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 50%, #eef2ff 100%)" },
  },
];

function readStored(): { id: BackdropId; custom: string | null } {
  try {
    const id = (localStorage.getItem(STORAGE_KEY) as BackdropId | null) || DEFAULT_ID;
    const custom = localStorage.getItem(CUSTOM_KEY);
    if (id === "custom" && !custom) return { id: DEFAULT_ID, custom: null };
    return { id, custom };
  } catch {
    return { id: DEFAULT_ID, custom: null };
  }
}

function useMenuTabBackdrop() {
  const [state, setState] = useState(readStored);

  useEffect(() => {
    const sync = () => setState(readStored());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const select = (id: BackdropId, custom?: string) => {
    try {
      if (custom) localStorage.setItem(CUSTOM_KEY, custom);
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      toast.error("Gambar terlalu besar untuk disimpan di browser ini.");
      return;
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { ...state, select };
}

// Perkecil gambar unggahan agar muat di localStorage
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("File bukan gambar yang valid"));
      img.onload = () => {
        const scale = Math.min(1, MAX_CUSTOM_WIDTH / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Letakkan sebagai anak PERTAMA kontainer Menu Tab (yang sudah `relative overflow-hidden`).
 * Melukis latar + tombol "Ganti Background" di pojok kanan atas.
 */
export function MenuTabBackdrop() {
  const { id, custom, select } = useMenuTabBackdrop();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const customPreset: BackdropPreset | null = custom
    ? { id: "custom", label: "Gambar Saya", dark: true, style: { backgroundImage: `url('${custom}')`, backgroundSize: "cover", backgroundPosition: "center" } }
    : null;
  const options = customPreset ? [...PRESETS, customPreset] : PRESETS;
  const active = options.find(p => p.id === id) || PRESETS[0];

  // ContrastGuard menghitung background dari elemen induk teks, sehingga tidak melihat gambar latar ini
  // (lapisan saudara) dan malah menggelapkan teks putih. Saat latar gelap, area Menu Tab dikecualikan
  // (data-contrast="off") dan warna yang terlanjur dikoreksi dikembalikan ke warna desain.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = rootRef.current?.parentElement;
    if (!host) return;
    if (!active.dark) {
      host.removeAttribute("data-contrast");
      return;
    }
    host.setAttribute("data-contrast", "off");
    host.querySelectorAll<HTMLElement>("[data-dc-orig]").forEach(el => {
      const orig = el.getAttribute("data-dc-orig") || "";
      if (orig) el.style.setProperty("color", orig); else el.style.removeProperty("color");
      el.style.removeProperty("-webkit-text-fill-color");
      el.removeAttribute("data-dc-orig");
    });
    return () => host.removeAttribute("data-contrast");
  }, [active.dark]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      select("custom", await resizeImage(file));
      toast.success("Background Menu Tab diperbarui");
    } catch (err: any) {
      toast.error(err?.message || "Gagal memuat gambar");
    }
  };

  return (
    <div ref={rootRef} className="menu-tab-backdrop absolute inset-0" data-dark={active.dark ? "true" : "false"}>
      <div className="absolute inset-0 transition-all duration-500" style={active.style} />
      {active.dark && <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/10 via-transparent to-[#020617]/35 pointer-events-none" />}

      <div ref={panelRef} className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30 text-left">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-[#0f172a] border border-white/60 shadow-sm hover:bg-white transition-all cursor-pointer"
          title="Ganti background Menu Tab"
        >
          <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
          <span className="hidden sm:inline">Ganti Background</span>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-[#e2e8f0] shadow-xl p-3 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0f172a]">Background Menu Tab</span>
              <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg text-[#64748b] hover:bg-[#f1f5f9] cursor-pointer" title="Tutup">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {options.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { select(p.id); setOpen(false); }}
                  className={cn(
                    "relative h-16 rounded-xl border-2 overflow-hidden cursor-pointer transition-all",
                    p.id === active.id ? "border-teal-500 ring-2 ring-teal-500/20" : "border-[#e2e8f0] hover:border-teal-300"
                  )}
                  title={p.label}
                >
                  <span className="absolute inset-0" style={p.style} />
                  <span className={cn(
                    "absolute bottom-0 inset-x-0 px-1.5 py-0.5 text-[10px] font-bold truncate",
                    p.dark ? "bg-[#020617]/50 text-white" : "bg-white/80 text-[#0f172a]"
                  )}>
                    {p.label}
                  </span>
                  {p.id === active.id && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border border-dashed border-teal-300 text-teal-700 bg-teal-50/60 hover:bg-teal-50 cursor-pointer transition-all"
            >
              <Upload className="w-3.5 h-3.5" /> Unggah Gambar Sendiri
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </div>
        )}
      </div>
    </div>
  );
}
