import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Maximize2, RotateCcw, ExternalLink, Info, Volume2, Gamepad2, Sparkles, CheckCircle2 } from 'lucide-react';

interface ParampaaArcadeScreenProps {
  onBack?: () => void;
  inspectorName?: string;
}

export function ParampaaArcadeScreen({ onBack, inspectorName }: ParampaaArcadeScreenProps) {
  const [activeGame, setActiveGame] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [gameKey, setGameKey] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  // Load Ruffle JS dynamically once
  useEffect(() => {
    let isMounted = true;

    const loadRuffleScript = async (): Promise<any> => {
      if ((window as any).RufflePlayer) {
        return (window as any).RufflePlayer;
      }

      return new Promise((resolve, reject) => {
        const existingScript = document.querySelector('script[src*="ruffle.js"]');
        if (existingScript) {
          existingScript.addEventListener('load', () => resolve((window as any).RufflePlayer));
          existingScript.addEventListener('error', (e) => reject(e));
          return;
        }

        const script = document.createElement('script');
        script.src = '/parampaa/ruffle/ruffle.js';
        script.async = true;
        script.onload = () => resolve((window as any).RufflePlayer);
        script.onerror = (err) => reject(new Error('Gagal memuat engine Ruffle lokal.'));
        document.head.appendChild(script);
      });
    };

    const mountGame = async () => {
      setIsLoading(true);
      setLoadingError(null);

      try {
        const ruffle = await loadRuffleScript();
        if (!isMounted || !containerRef.current) return;

        // Cleanup previous player
        if (playerRef.current) {
          try {
            playerRef.current.remove();
          } catch (e) {}
          playerRef.current = null;
        }
        containerRef.current.innerHTML = '';

        const ruffleInstance = ruffle.newest();
        const player = ruffleInstance.createPlayer();
        playerRef.current = player;

        player.style.width = '100%';
        player.style.height = '100%';
        player.style.display = 'block';
        player.style.outline = 'none';

        containerRef.current.appendChild(player);

        const swfPath = activeGame === 1 ? '/parampaa/games/parampaa1.swf' : '/parampaa/games/parampaa2.swf';

        await player.load({
          url: swfPath,
          parameters: '',
          autoplay: 'on',
          backgroundColor: '#000000',
          letterbox: 'on',
          allowFullscreen: true,
          openUrlMode: 'confirm'
        });

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error('[Parampaa] Error loading game:', err);
        if (isMounted) {
          setLoadingError(err?.message || 'Gagal memuat game.');
          setIsLoading(false);
        }
      }
    };

    mountGame();

    return () => {
      isMounted = false;
      if (playerRef.current) {
        try {
          playerRef.current.remove();
        } catch (e) {}
        playerRef.current = null;
      }
    };
  }, [activeGame, gameKey]);

  const handleRestart = () => {
    setGameKey(prev => prev + 1);
  };

  const handleFullscreen = () => {
    if (playerRef.current && playerRef.current.requestFullscreen) {
      playerRef.current.requestFullscreen();
    } else if (containerRef.current && containerRef.current.requestFullscreen) {
      containerRef.current.requestFullscreen();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 cursor-pointer"
                title="Kembali ke Menu Utama"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-lg shadow-lg shadow-emerald-500/20">
                👾
              </div>
              <div>
                <h1 className="font-extrabold text-base sm:text-lg text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">
                  Kuis Parampaa Arcade
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Game Asah Otak Offline — Karya Masova
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              100% Offline
            </span>
            <button
              type="button"
              onClick={handleRestart}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer hover:border-slate-600"
              title="Muat Ulang Level"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Mulai Ulang</span>
            </button>
            <button
              type="button"
              onClick={handleFullscreen}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition-all shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
              title="Layar Penuh"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Layar Penuh</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 flex flex-col gap-4">
        {/* Game Switcher Tabs */}
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto w-full">
          <button
            type="button"
            onClick={() => setActiveGame(1)}
            className={`py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border cursor-pointer ${
              activeGame === 1
                ? 'bg-gradient-to-r from-emerald-600/30 to-teal-600/30 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-500/15'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span>🟢</span>
            <span>Parampaa 1 (Level 1–100)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveGame(2)}
            className={`py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 border cursor-pointer ${
              activeGame === 2
                ? 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/15'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <span>🎃</span>
            <span>Parampaa 2 (Level 101–200)</span>
          </button>
        </div>

        {/* Arcade Stage Canvas */}
        <div className="relative w-full rounded-2xl overflow-hidden border-2 border-slate-800 bg-black shadow-2xl shadow-black/90 flex flex-col items-center justify-center">
          {/* Game Viewport Container */}
          <div 
            className="w-full relative bg-black flex items-center justify-center"
            style={{ height: 'min(68vh, 600px)', minHeight: '440px' }}
          >
            {/* Loading Indicator (Non-blocking, disappears immediately) */}
            {isLoading && (
              <div className="absolute inset-0 z-10 bg-slate-950 flex flex-col items-center justify-center gap-3 pointer-events-none">
                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
                <p className="text-xs font-semibold text-slate-400">
                  Memuat Flash Engine Ruffle & Soal {activeGame === 1 ? 'Parampaa 1' : 'Parampaa 2'}...
                </p>
              </div>
            )}

            {/* Error Message if any */}
            {loadingError && (
              <div className="absolute inset-0 z-20 bg-slate-950 flex flex-col items-center justify-center p-6 text-center gap-3">
                <p className="text-sm text-rose-400 font-semibold">{loadingError}</p>
                <button
                  type="button"
                  onClick={handleRestart}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {/* Direct Ruffle Player Container */}
            <div 
              ref={containerRef} 
              className="w-full h-full flex items-center justify-center"
              style={{ minHeight: '100%', minWidth: '100%' }}
            />
          </div>

          {/* Under-canvas quick help bar */}
          <div className="w-full bg-slate-900/90 border-t border-slate-800/80 px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Klik langsung pada area game (tekan <strong>START!!</strong> untuk memulai)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-slate-500">Audio aktif saat game diklik</span>
              <a
                href={`/parampaa/index.html#game${activeGame}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Buka Jendela Penuh</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Tips & Rules Accordion */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <h3 className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
              💡 Petunjuk Kuis Parampaa
            </h3>
            <p className="text-slate-400 leading-relaxed">
              Jawaban seringkali bukan yang tampak di layar. Awas jebakan logika, permainan kata, dan tombol yang berpindah atau tersembunyi!
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/60">
            <h3 className="font-bold text-amber-400 mb-1 flex items-center gap-1.5">
              🎮 Kontrol Interaktif
            </h3>
            <p className="text-slate-400 leading-relaxed">
              Gunakan klik kiri mouse untuk menjawab. Pada beberapa level khusus, Anda mungkin perlu mengetik angka atau huruf menggunakan keyboard.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default ParampaaArcadeScreen;
