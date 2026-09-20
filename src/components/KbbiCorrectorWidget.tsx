import React, { useState, useMemo } from 'react';
import { Sparkles, Check, Info, ArrowRight, Wand2, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { 
  detectTypos, 
  correctTextKBBI, 
  COMMON_DAMAGE_TEMPLATES, 
  WordCorrection 
} from '../utils/kbbi-maintenance-corrector';
import { toast } from 'sonner';

interface KbbiCorrectorWidgetProps {
  value: string;
  onChange: (newValue: string) => void;
  showTemplates?: boolean;
  compact?: boolean;
  fieldName?: string;
}

export function KbbiCorrectorWidget({
  value,
  onChange,
  showTemplates = false,
  compact = false,
  fieldName = 'Teks'
}: KbbiCorrectorWidgetProps) {
  const [showTemplateDrawer, setShowTemplateDrawer] = useState(false);

  // Deteksi typo secara realtime
  const detectedTypos = useMemo(() => {
    return detectTypos(value);
  }, [value]);

  // Handle perbaiki satu kata
  const handleApplySingleWord = (item: WordCorrection) => {
    // Regex replace kata yang dimaksud (case-insensitive)
    const regex = new RegExp(`\\b${item.word}\\b`, 'i');
    const newText = value.replace(regex, item.suggestion);
    onChange(newText);
    toast.success(`Mengganti "${item.word}" menjadi "${item.suggestion}"`);
  };

  // Handle perbaiki seluruh teks otomatis
  const handleFixAll = () => {
    if (!value || !value.trim()) {
      toast.info('Silakan ketik teks terlebih dahulu.');
      return;
    }

    const { correctedText, changesCount, replacedWords } = correctTextKBBI(value);
    if (changesCount === 0 && correctedText === value) {
      toast.info('Teks Anda sudah rapi dan sesuai istilah baku KBBI.');
      return;
    }

    onChange(correctedText);
    toast.success(
      changesCount > 0 
        ? `Berhasil merapikan ${changesCount} kata/frasa sesuai standar KBBI & Maintenance!` 
        : 'Format teks berhasil dirapikan!'
    );
  };

  // Handle insert template kerusakan
  const handleInsertTemplate = (snippet: string) => {
    if (!value.trim()) {
      onChange(snippet);
    } else {
      // Append jika sudah ada teks
      const endsWithPunct = /[.,;!?]$/.test(value.trim());
      onChange(`${value.trim()}${endsWithPunct ? ' ' : '. '}${snippet}`);
    }
    toast.success('Template deskripsi standar berhasil ditambahkan!');
  };

  return (
    <div className="space-y-2 mt-2 animate-in fade-in duration-200 select-none">
      {/* 1. NOTIFIKASI / BANNER TYPO YANG MENCOLOK */}
      {detectedTypos.length > 0 && (
        <div className="p-2.5 bg-amber-50/90 border-2 border-amber-300 rounded-xl space-y-2 shadow-xs animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-600 animate-bounce" />
              <span>Saran Perbaikan Kata (Baku KBBI & Maintenance):</span>
            </div>
            <button
              type="button"
              onClick={handleFixAll}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white shadow-xs flex items-center gap-1 transition-all cursor-pointer active:scale-95 ml-auto"
            >
              <Wand2 className="w-3 h-3" />
              <span>Perbaiki Semua Typo</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {detectedTypos.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplySingleWord(item)}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-white hover:bg-teal-50 text-slate-800 hover:text-teal-900 border-2 border-amber-300 hover:border-teal-500 px-2.5 py-1 rounded-lg shadow-xs transition-all cursor-pointer group"
                title={item.explanation}
              >
                <span className="line-through text-rose-500 font-semibold">{item.word}</span>
                <ArrowRight className="w-3 h-3 text-amber-600 group-hover:text-teal-600" />
                <span className="font-extrabold text-teal-700 underline decoration-teal-400 underline-offset-2">{item.suggestion}</span>
                <span className="text-[10px] text-teal-600 bg-teal-50 group-hover:bg-teal-100 px-1 py-0.5 rounded ml-0.5">
                  Klik Ganti
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. BARIS KONTROL & TOMBOL AKSI */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          {detectedTypos.length === 0 && value.trim().length > 3 ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Teks sudah baku & mudah dipahami tim maintenance</span>
            </span>
          ) : null}
        </div>

        {/* Tombol Aksi Koreksi Otomatis & Template */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">
          {showTemplates && (
            <button
              type="button"
              onClick={() => setShowTemplateDrawer(prev => !prev)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
                showTemplateDrawer
                  ? 'bg-teal-100 text-teal-900 border-teal-400 shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-teal-600" />
              <span>Contoh Kerusakan Standar</span>
              {showTemplateDrawer ? <ChevronUp className="w-3.5 h-3.5 ml-0.5" /> : <ChevronDown className="w-3.5 h-3.5 ml-0.5" />}
            </button>
          )}

          <button
            type="button"
            onClick={handleFixAll}
            className="text-[11px] font-bold px-3 py-1 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-2xs hover:shadow-xs flex items-center gap-1.5 transition-all cursor-pointer group active:scale-95"
            title="Koreksi otomatis typo, singkatan gaul, dan bahasa lapangan ke standar KBBI & Maintenance"
          >
            <Wand2 className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
            <span>Koreksi Otomatis KBBI</span>
          </button>
        </div>
      </div>

      {/* 2. DRAWER TEMPLATE CONTOH KERUSAKAN UMUM (DAPAT DIPILIH BAPAK2 PENGAWAS) */}
      {showTemplates && showTemplateDrawer && (
        <div className="p-3 bg-gradient-to-b from-slate-50 to-teal-50/40 border border-teal-200/80 rounded-xl space-y-2 text-xs shadow-xs animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[11px] text-teal-900 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-teal-600" />
              <span>Pilih kalimat kerusakan di bawah agar tim Maintenance langsung paham:</span>
            </span>
            <button
              type="button"
              onClick={() => setShowTemplateDrawer(false)}
              className="text-[10.5px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              Tutup ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {COMMON_DAMAGE_TEMPLATES.map((group, gIdx) => (
              <div key={gIdx} className="p-2 bg-white rounded-lg border border-slate-200/80 space-y-1.5 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block border-b pb-1">
                  {group.category}
                </span>
                <div className="space-y-1">
                  {group.items.map((item, iIdx) => (
                    <button
                      key={iIdx}
                      type="button"
                      onClick={() => handleInsertTemplate(item.snippet)}
                      className="w-full text-left p-1.5 rounded-md hover:bg-teal-50 text-[11px] text-slate-800 hover:text-teal-950 font-medium transition-colors flex items-start justify-between group cursor-pointer"
                      title={item.snippet}
                    >
                      <span className="line-clamp-1">{item.label}</span>
                      <span className="text-[9px] font-bold text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0">
                        + Tambah
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
