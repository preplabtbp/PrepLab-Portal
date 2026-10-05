import React, { useState } from 'react';
import { Sparkles, Heart, RefreshCw, Lightbulb, Quote } from 'lucide-react';
import { WidgetSize } from './types';

const TRIVIA_LIST = [
  {
    fact: "Bijih nikel laterit di Pulau Obi membutuhkan preparasi sampel dengan kontrol kelembaban ketat agar hasil XRF presisi.",
    category: "Geologi & Preparasi"
  },
  {
    fact: "Keselamatan kerja bukan sekadar kepatuhan SOP, melainkan komitmen agar kita bisa pulang dengan selamat ke pelukan keluarga.",
    category: "Safety Mindset"
  },
  {
    fact: "Minum cukup air saat bekerja di site Obi membantu mencegah kelelahan dini (*heat exhaustion*) akibat iklim tropis pesisir.",
    category: "Kesehatan Kerja"
  },
  {
    fact: "Satu tindakan KTA/TTA yang dilaporkan lebih awal dapat mencegah insiden fatal di area operasional pabrik.",
    category: "Inspeksi KTA"
  },
  {
    fact: "Kalibrasi berkala pada timbangan analitis laboratorium menjamin deviasi hasil analisa tetap berada di bawah batas toleransi 0.01%.",
    category: "Teknis Lab"
  }
];

interface SudutSantaiWidgetProps {
  size: WidgetSize;
}

export const SudutSantaiWidget: React.FC<SudutSantaiWidgetProps> = ({ size }) => {
  const [triviaIndex, setTriviaIndex] = useState<number>(0);
  const [likes, setLikes] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('preplab_trivia_likes');
      return saved ? parseInt(saved, 10) : 12;
    } catch {
      return 12;
    }
  });
  const [hasLiked, setHasLiked] = useState<boolean>(false);

  const handleNextTrivia = () => {
    setTriviaIndex((prev) => (prev + 1) % TRIVIA_LIST.length);
  };

  const handleLike = () => {
    if (!hasLiked) {
      const next = likes + 1;
      setLikes(next);
      setHasLiked(true);
      try {
        localStorage.setItem('preplab_trivia_likes', String(next));
      } catch {}
    }
  };

  const item = TRIVIA_LIST[triviaIndex];

  return (
    <div className="relative h-full flex flex-col justify-between select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[var(--border-main)]/60">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-6 rounded-lg bg-pink-500/15 text-pink-600 dark:text-pink-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-[var(--text-main)]">
            Sudut Santai &amp; Wawasan
          </span>
        </div>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-700 dark:text-pink-300 border border-pink-500/20">
          {item.category}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center my-1">
        <div className="flex items-start gap-2">
          <Quote className="w-4 h-4 text-pink-400 shrink-0 mt-0.5 rotate-180" />
          <p className="text-xs text-[var(--text-main)] leading-relaxed italic">
            "{item.fact}"
          </p>
        </div>
      </div>

      {/* Bottom Footer Controls */}
      <div className="pt-2 border-t border-[var(--border-main)]/50 flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={handleLike}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-all ${
            hasLiked 
              ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/40 font-bold' 
              : 'text-[var(--text-muted)] hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Heart className={`w-3 h-3 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
          <span>{likes}</span>
        </button>

        <button
          type="button"
          onClick={handleNextTrivia}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Ganti Fakta / Wawasan Lainnya"
        >
          <RefreshCw className="w-3 h-3" />
          <span className="text-[10px] font-semibold">Wawasan Baru</span>
        </button>
      </div>
    </div>
  );
};
