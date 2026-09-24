import React, { useRef, useEffect } from 'react';

/**
 * GmSymbioteCanvas - Animasi Living Symbiote Tentacles khusus Game Master
 * Diadaptasi dari simulasi canvas 2D dengan optimasi performa tinggi:
 * - Hardware-accelerated CSS filter drop-shadow
 * - Auto pause saat offscreen (IntersectionObserver) dan saat tab background (visibilitychange)
 * - Skala dinamis tentakel berdasarkan prop `size`
 */
const GmSymbioteCanvas: React.FC<{ size: number; isLocked: boolean }> = ({ size, isLocked }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let isMounted = true;

    // Ukuran kanvas dibuat hanya 1.35x dari diameter avatar agar sulur rapat dan tidak mekar terlalu jauh
    const canvasSize = Math.max(50, Math.round(size * 1.35));
    canvas.width = canvasSize;
    canvas.height = canvasSize;

    const cx = canvasSize / 2;
    const cy = canvasSize / 2;

    class Tentacle {
      x: number;
      y: number;
      angle: number;
      segments: number;
      baseWidth: number;
      time: number;
      speed: number;

      constructor(x: number, y: number, angle: number) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        // Segmen pendek (6 sampai 9 ruas) agar panjangnya hanya sedikit keluar dari frame
        this.segments = Math.floor(Math.random() * 4) + 6;
        const scaleFactor = Math.max(0.6, size / 80);
        this.baseWidth = (Math.random() * 1.6 + 2.0) * scaleFactor;
        this.time = Math.random() * 100;
        this.speed = Math.random() * 0.035 + 0.018; // Gerakan tenang dan berwibawa
      }

      update() {
        this.time += this.speed;
      }

      draw(context: CanvasRenderingContext2D) {
        let prevX = this.x;
        let prevY = this.y;
        let curAngle = this.angle;
        const scale = Math.max(0.6, size / 80);

        context.lineCap = 'round';
        context.lineJoin = 'round';
        context.strokeStyle = isLocked ? '#475569' : '#030303'; // Hitam pekat obsidian

        for (let i = 0; i < this.segments; i++) {
          // Gelombang bergelung halus dan teratur (tidak liar)
          const wave1 = Math.sin(this.time + i * 0.32) * 0.07;
          const wave2 = Math.cos(this.time * 0.75 + i * 0.18) * 0.05;
          curAngle += wave1 + wave2;

          const segLen = (1.2 + i * 0.15) * scale;
          const nextX = prevX + Math.cos(curAngle) * segLen;
          const nextY = prevY + Math.sin(curAngle) * segLen;

          // Tapering eksponensial: pangkal tebal (baseWidth), meruncing tajam bagai jarum di ujung (0.35px)
          const t = i / this.segments;
          const segWidth = Math.max(0.35, this.baseWidth * Math.pow(1 - t, 1.35));

          context.beginPath();
          context.moveTo(prevX, prevY);
          context.lineTo(nextX, nextY);
          context.lineWidth = segWidth;
          context.stroke();

          prevX = nextX;
          prevY = nextY;
        }
      }
    }

    const tentacles: Tentacle[] = [];
    const numTentacles = size > 60 ? 22 : 14;
    const radius = size / 2;

    for (let i = 0; i < numTentacles; i++) {
      const angle = (i / numTentacles) * Math.PI * 2;
      const startX = cx + Math.cos(angle) * (radius - 2);
      const startY = cy + Math.sin(angle) * (radius - 2);
      tentacles.push(new Tentacle(startX, startY, angle));
    }

    let isVisible = true;
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
      });
      observer.observe(canvas);
    }

    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const animate = () => {
      if (!isMounted) return;
      if (isVisible) {
        ctx.clearRect(0, 0, canvasSize, canvasSize);

        for (let i = 0; i < tentacles.length; i++) {
          tentacles[i].update();
          tentacles[i].draw(ctx);
        }
      }
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      isMounted = false;
      cancelAnimationFrame(animationId);
      if (observer) observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [size, isLocked]);

  const canvasPx = Math.max(50, Math.round(size * 1.35));

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0"
      style={{
        width: `${canvasPx}px`,
        height: `${canvasPx}px`,
        filter: isLocked 
          ? 'grayscale(1) opacity(0.3)' 
          : 'drop-shadow(0 0 5px rgba(0, 0, 0, 0.98)) drop-shadow(0 0 2px rgba(0, 0, 0, 1))'
      }}
    />
  );
};

export interface DynamicAvatarFrameProps {
  frameId?: string | null;
  tierLevel?: number; // 1 = Bronze, 2 = Silver, 3 = Gold, 4 = Master
  size?: number; // pixel width/height (e.g. 36, 40, 48, 56, 80, 96)
  isUnlocked?: boolean;
  showPreview?: boolean; // if true, shows signature silhouette even when locked
  className?: string;
  children?: React.ReactNode;
}

export const DynamicAvatarFrame: React.FC<DynamicAvatarFrameProps> = ({
  frameId = 'default',
  tierLevel = 1,
  size = 48,
  isUnlocked = true,
  showPreview = false,
  className = '',
  children
}) => {
  const currentTier = Math.max(1, Math.min(4, tierLevel || 1));
  const activeFrame = frameId || 'default';

  // Sizing ratios
  const borderWidth = Math.max(2, Math.round(size * 0.055));
  const crownSize = Math.round(size * 0.52);
  const laurelWidth = Math.round(size * 0.32);
  const starSize = Math.round(size * 0.22);
  const rivetSize = Math.max(3, Math.round(size * 0.08));

  // Determine state
  const isLocked = !isUnlocked;
  const showEffects = isUnlocked || showPreview;

  // Render Theme Specific Decorative Elements
  const renderFrameDecorations = () => {
    if (!showEffects) return null;

    switch (activeFrame) {
      // =========================================================================
      // 1. MYTHIC FLAMING CROWN (Crown + Animated Flames: Api Redup -> Membara)
      // =========================================================================
      case 'frame_mythic_crown': {
        // Crown color palettes by tier
        const crownColors = {
          1: { base: '#b45309', fill: '#d97706', accent: '#fbbf24', gem: '#92400e', glow: 'rgba(217, 119, 6, 0.4)' },
          2: { base: '#64748b', fill: '#cbd5e1', accent: '#f8fafc', gem: '#38bdf8', glow: 'rgba(203, 213, 225, 0.5)' },
          3: { base: '#d97706', fill: '#fbbf24', accent: '#fef08a', gem: '#ef4444', glow: 'rgba(251, 191, 36, 0.7)' },
          4: { base: '#b45309', fill: '#ffd700', accent: '#ffffff', gem: '#dc2626', glow: 'rgba(255, 215, 0, 0.95)' }
        }[currentTier];

        // Flame styles and animations by tier
        const flameConfig = {
          1: { anim: 'animate-flame-soft', opacity: 0.65, filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.4))' },
          2: { anim: 'animate-flame-medium', opacity: 0.8, filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.6))' },
          3: { anim: 'animate-flame-medium', opacity: 0.92, filter: 'drop-shadow(0 0 14px rgba(251, 191, 36, 0.8))' },
          4: { anim: 'animate-flame-inferno', opacity: 1, filter: 'drop-shadow(0 0 20px rgba(239, 68, 68, 0.95))' }
        }[currentTier];

        return (
          <>
            {/* Animated Flame Tongue Ring (Lidah Api Hidup) */}
            <div 
              className={`absolute -inset-2.5 pointer-events-none z-0 ${isLocked ? 'opacity-30 grayscale' : flameConfig.anim}`}
              style={{ filter: isLocked ? 'none' : flameConfig.filter }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <defs>
                  <linearGradient id={`flameGrad_${currentTier}`} x1="0%" y1="100%" x2="0%" y2="0%">
                    {currentTier === 1 && (
                      <>
                        <stop offset="0%" stopColor="#78350f" stopOpacity="0.8" />
                        <stop offset="60%" stopColor="#d97706" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.4" />
                      </>
                    )}
                    {currentTier === 2 && (
                      <>
                        <stop offset="0%" stopColor="#ea580c" stopOpacity="0.9" />
                        <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#fde047" stopOpacity="0.7" />
                      </>
                    )}
                    {currentTier === 3 && (
                      <>
                        <stop offset="0%" stopColor="#dc2626" stopOpacity="0.95" />
                        <stop offset="40%" stopColor="#f97316" stopOpacity="0.9" />
                        <stop offset="80%" stopColor="#fbbf24" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.8" />
                      </>
                    )}
                    {currentTier === 4 && (
                      <>
                        <stop offset="0%" stopColor="#991b1b" stopOpacity="1" />
                        <stop offset="35%" stopColor="#dc2626" stopOpacity="0.95" />
                        <stop offset="70%" stopColor="#f59e0b" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
                      </>
                    )}
                  </linearGradient>
                </defs>

                {/* Primary Fire Tongue Crests around Perimeter */}
                <path
                  d="M50 8 C47 18 42 16 38 24 C34 18 28 22 24 30 C18 26 14 34 12 44 C8 52 10 62 14 70 C18 78 26 86 36 90 C44 93 56 93 64 90 C74 86 82 78 86 70 C90 62 92 52 88 44 C86 34 82 26 76 30 C72 22 66 18 62 24 C58 16 53 18 50 8 Z"
                  fill={`url(#flameGrad_${currentTier})`}
                  opacity={flameConfig.opacity}
                />

                {/* Additional inner flame licks for Tier 3 & 4 (Api Membara) */}
                {currentTier >= 3 && (
                  <path
                    d="M50 14 C48 22 44 21 41 27 C37 23 33 26 30 32 C25 36 22 43 21 51 C20 60 25 68 31 74 C37 80 44 83 50 83 C56 83 63 80 69 74 C75 68 80 60 79 51 C78 43 75 36 70 32 C67 26 63 23 59 27 C56 21 52 22 50 14 Z"
                    fill="#fef08a"
                    opacity={currentTier === 4 ? 0.75 : 0.55}
                    className="mix-blend-overlay"
                  />
                )}

                {/* Flying Ember Particles for Tier 4 */}
                {currentTier === 4 && (
                  <>
                    <circle cx="28" cy="18" r="1.5" fill="#fde047" opacity="0.9" />
                    <circle cx="72" cy="16" r="1.8" fill="#f97316" opacity="0.85" />
                    <circle cx="86" cy="40" r="1.4" fill="#fbbf24" opacity="0.9" />
                    <circle cx="14" cy="46" r="1.6" fill="#ef4444" opacity="0.8" />
                  </>
                )}
              </svg>
            </div>

            {/* Royal Crown Perched Atop (Mahkota Kerajaan) */}
            <div 
              className={`absolute -top-[24%] left-1/2 -translate-x-1/2 pointer-events-none z-30 transition-transform ${isLocked ? 'opacity-40 grayscale' : 'animate-crown-gleam'}`}
              style={{ width: crownSize, height: Math.round(crownSize * 0.75) }}
            >
              <svg viewBox="0 0 64 48" className="w-full h-full drop-shadow-md">
                <defs>
                  <linearGradient id={`crownGrad_${currentTier}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={crownColors.accent} />
                    <stop offset="50%" stopColor={crownColors.fill} />
                    <stop offset="100%" stopColor={crownColors.base} />
                  </linearGradient>
                </defs>

                {/* Crown Body with 5 Spikes */}
                <path
                  d="M6 38 L10 16 L22 28 L32 6 L42 28 L54 16 L58 38 Z"
                  fill={`url(#crownGrad_${currentTier})`}
                  stroke={crownColors.base}
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />

                {/* Crown Base Velvet Headband */}
                <path
                  d="M6 38 Q32 43 58 38 L58 44 Q32 49 6 44 Z"
                  fill={currentTier === 4 ? '#7f1d1d' : crownColors.base}
                  stroke={crownColors.accent}
                  strokeWidth="1"
                />

                {/* Crown Peak Pearls/Stars */}
                <circle cx="10" cy="16" r="2.2" fill={crownColors.accent} />
                <circle cx="22" cy="28" r="1.8" fill={crownColors.accent} />
                <circle cx="32" cy="6" r="3" fill={crownColors.accent} stroke={crownColors.base} strokeWidth="0.8" />
                <circle cx="42" cy="28" r="1.8" fill={crownColors.accent} />
                <circle cx="54" cy="16" r="2.2" fill={crownColors.accent} />

                {/* Center Royal Gem Jewel */}
                <polygon
                  points="32,24 35,28 32,32 29,28"
                  fill={crownColors.gem}
                  stroke={crownColors.accent}
                  strokeWidth="0.8"
                />

                {/* Tier 3 & 4 Side Gems */}
                {currentTier >= 3 && (
                  <>
                    <circle cx="20" cy="38" r="1.8" fill={currentTier === 4 ? '#2563eb' : '#10b981'} />
                    <circle cx="44" cy="38" r="1.8" fill={currentTier === 4 ? '#2563eb' : '#10b981'} />
                  </>
                )}
              </svg>
            </div>
          </>
        );
      }

      // =========================================================================
      // 2. GRAND FIELD MARSHAL LAUREL (Golden Laurel Wreath & Commander Stars)
      // =========================================================================
      case 'frame_grand_marshal': {
        const laurelColor = {
          1: '#cd7f32',
          2: '#94a3b8',
          3: '#fbbf24',
          4: '#ffd700'
        }[currentTier];

        const starCount = currentTier === 1 ? 1 : currentTier === 2 ? 2 : currentTier === 3 ? 3 : 5;

        return (
          <>
            {/* Left Laurel Branch */}
            <div 
              className={`absolute -left-[16%] top-[10%] bottom-[10%] pointer-events-none z-20 ${isLocked ? 'opacity-30 grayscale' : ''}`}
              style={{ width: laurelWidth }}
            >
              <svg viewBox="0 0 30 70" className="w-full h-full drop-shadow-sm">
                <path d="M22 6 C15 15 10 32 12 58 C13 62 16 66 20 68" fill="none" stroke={laurelColor} strokeWidth="1.8" strokeLinecap="round" />
                {/* Laurel Leaves */}
                <path d="M20 10 Q10 12 12 20 Q18 16 20 10 Z" fill={laurelColor} />
                <path d="M16 22 Q6 26 8 34 Q15 30 16 22 Z" fill={laurelColor} />
                <path d="M14 36 Q4 42 7 50 Q14 45 14 36 Z" fill={laurelColor} />
                <path d="M13 50 Q5 56 10 62 Q16 57 13 50 Z" fill={laurelColor} />
              </svg>
            </div>

            {/* Right Laurel Branch */}
            <div 
              className={`absolute -right-[16%] top-[10%] bottom-[10%] pointer-events-none z-20 ${isLocked ? 'opacity-30 grayscale' : ''}`}
              style={{ width: laurelWidth }}
            >
              <svg viewBox="0 0 30 70" className="w-full h-full drop-shadow-sm scale-x-[-1]">
                <path d="M22 6 C15 15 10 32 12 58 C13 62 16 66 20 68" fill="none" stroke={laurelColor} strokeWidth="1.8" strokeLinecap="round" />
                <path d="M20 10 Q10 12 12 20 Q18 16 20 10 Z" fill={laurelColor} />
                <path d="M16 22 Q6 26 8 34 Q15 30 16 22 Z" fill={laurelColor} />
                <path d="M14 36 Q4 42 7 50 Q14 45 14 36 Z" fill={laurelColor} />
                <path d="M13 50 Q5 56 10 62 Q16 57 13 50 Z" fill={laurelColor} />
              </svg>
            </div>

            {/* Commander Stars at Bottom Crest */}
            <div className={`absolute -bottom-[14%] left-1/2 -translate-x-1/2 flex items-center justify-center gap-0.5 z-30 pointer-events-none ${isLocked ? 'opacity-30 grayscale' : ''}`}>
              {Array.from({ length: starCount }).map((_, i) => (
                <svg key={i} viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-amber-400 drop-shadow-md animate-pulse">
                  <polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9" />
                </svg>
              ))}
            </div>
          </>
        );
      }

      // =========================================================================
      // 3. BIOHAZARD WARNING RING (Hazard Stripes & Rotating Radiation Trefoil)
      // =========================================================================
      case 'frame_biohazard_neon': {
        return (
          <>
            {/* Diagonal Caution Hazard Chevron Ring */}
            <div 
              className={`absolute -inset-1.5 rounded-full pointer-events-none z-0 ${currentTier >= 2 && !isLocked ? 'animate-hazard-spin' : ''}`}
              style={{
                background: isLocked
                  ? 'repeating-linear-gradient(45deg, #334155, #334155 4px, #475569 4px, #475569 8px)'
                  : 'repeating-linear-gradient(45deg, #000000, #000000 4px, #eab308 4px, #eab308 8px)',
                padding: '3px',
                WebkitMask: 'radial-gradient(circle, transparent 62%, black 64%)',
                mask: 'radial-gradient(circle, transparent 62%, black 64%)'
              }}
            />

            {/* Biohazard Trefoil Symbol at 12 o'clock */}
            <div className={`absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none z-30 ${isLocked ? 'opacity-30 grayscale' : 'animate-pulse'}`}>
              <div className="w-5 h-5 rounded-full bg-slate-950 border border-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-500/40">
                <span className="text-[10px] leading-none text-yellow-400 font-bold">☣</span>
              </div>
            </div>

            {/* Toxic Pulse Glow for Tier 3 & 4 */}
            {currentTier >= 3 && !isLocked && (
              <div className="absolute -inset-2 rounded-full border border-yellow-400/40 animate-ping pointer-events-none" />
            )}
          </>
        );
      }

      // =========================================================================
      // HAZARD REMEDIATION AEGIS (Target Crosshairs, Tactical Brackets & Shield Core)
      // =========================================================================
      case 'frame_hazard_aegis': {
        return (
          <>
            {/* 4 Tactical Target Brackets */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-emerald-400 rounded-full z-30 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 bg-emerald-400 rounded-full z-30 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-1 h-4 bg-emerald-400 rounded-full z-30 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <div className="absolute top-1/2 -right-1 -translate-y-1/2 w-1 h-4 bg-emerald-400 rounded-full z-30 pointer-events-none shadow-[0_0_8px_rgba(16,185,129,0.8)]" />

            {/* Target Reticle Badge at 12 o'clock */}
            <div className={`absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none z-30 ${isLocked ? 'opacity-30' : 'animate-pulse'}`}>
              <div className="w-5 h-5 rounded-full bg-slate-950 border border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                <span className="text-[10px] leading-none text-emerald-400 font-bold">🎯</span>
              </div>
            </div>

            {/* High-tier remediation pulse aura */}
            {currentTier >= 3 && !isLocked && (
              <div className="absolute -inset-2 rounded-full border border-emerald-400/40 animate-ping pointer-events-none" />
            )}
          </>
        );
      }

      // =========================================================================
      // 4. HEAVY ARMORED BASTION (Titanium Plates, Corner Rivets & Hex Shield)
      // =========================================================================
      case 'frame_living_bastion': {
        return (
          <>
            {/* Industrial Corner Steel Rivets */}
            <div className="absolute top-0 left-0 rounded-full bg-slate-400 border border-slate-700 shadow-xs z-30 pointer-events-none" style={{ width: rivetSize, height: rivetSize }} />
            <div className="absolute top-0 right-0 rounded-full bg-slate-400 border border-slate-700 shadow-xs z-30 pointer-events-none" style={{ width: rivetSize, height: rivetSize }} />
            <div className="absolute bottom-0 left-0 rounded-full bg-slate-400 border border-slate-700 shadow-xs z-30 pointer-events-none" style={{ width: rivetSize, height: rivetSize }} />
            <div className="absolute bottom-0 right-0 rounded-full bg-slate-400 border border-slate-700 shadow-xs z-30 pointer-events-none" style={{ width: rivetSize, height: rivetSize }} />

            {/* Hexagonal Armor Plating Rim */}
            <div 
              className={`absolute -inset-1 rounded-full border-2 border-indigo-400/80 pointer-events-none z-10 ${currentTier >= 3 && !isLocked ? 'shadow-[0_0_15px_rgba(99,102,241,0.7)]' : ''}`}
              style={{
                borderStyle: currentTier >= 2 ? 'double' : 'solid',
                borderWidth: `${borderWidth}px`
              }}
            />

            {/* Kinetic Energy Barrier for Tier 4 */}
            {currentTier === 4 && !isLocked && (
              <div className="absolute -inset-2 rounded-full border border-cyan-400/50 animate-pulse pointer-events-none shadow-[0_0_20px_rgba(6,182,212,0.6)]" />
            )}
          </>
        );
      }

      // =========================================================================
      // 5. HOLOGRAPHIC MATRIX CYBER (Cyber HUD Brackets & Scanning Laser)
      // =========================================================================
      case 'frame_cyber_matrix': {
        return (
          <>
            {/* Corner Sci-Fi HUD Brackets */}
            <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-400 z-20 pointer-events-none" />
            <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-400 z-20 pointer-events-none" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-400 z-20 pointer-events-none" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-400 z-20 pointer-events-none" />

            {/* Animated Vertical Scanline Beam */}
            {!isLocked && (
              <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none z-20">
                <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-matrix-scan" />
              </div>
            )}
          </>
        );
      }

      // =========================================================================
      // 6. COSMIC VIOLET NEBULA (Galactic Vortex & Twinkling Stardust)
      // =========================================================================
      case 'frame_cosmic_nebula': {
        return (
          <>
            {/* Swirling Galaxy Vortex */}
            <div 
              className={`absolute -inset-2 rounded-full pointer-events-none z-0 ${!isLocked ? 'animate-nebula-swirl' : ''}`}
              style={{
                background: 'conic-gradient(from 0deg, #7c3aed, #c026d3, #4338ca, #7c3aed)',
                opacity: isLocked ? 0.3 : 0.7,
                filter: 'blur(3px)'
              }}
            />
            {/* Twinkling Star Accent */}
            <div className={`absolute -top-1 right-1 text-fuchsia-300 text-xs pointer-events-none z-30 ${!isLocked ? 'animate-ping' : 'opacity-30'}`}>
              ✦
            </div>
            <div className={`absolute -bottom-1 left-1 text-purple-300 text-[10px] pointer-events-none z-30 ${!isLocked ? 'animate-pulse' : 'opacity-30'}`}>
              ★
            </div>
          </>
        );
      }

      // =========================================================================
      // 7. PRISMATIC CHROMA RGB (Smooth Liquid 360° Rainbow Chroma Spin)
      // =========================================================================
      case 'frame_prismatic_rgb': {
        return (
          <div 
            className={`absolute -inset-1.5 rounded-full pointer-events-none z-0 ${!isLocked ? 'animate-chroma-spin' : 'opacity-40 grayscale'}`}
            style={{
              background: 'conic-gradient(from 0deg, #ff0055, #ff9900, #ffee00, #00ff66, #00ccff, #7700ff, #ff0055)',
              padding: `${borderWidth}px`,
              filter: isLocked ? 'none' : 'drop-shadow(0 0 10px rgba(236,72,153,0.65))',
              WebkitMask: 'radial-gradient(circle, transparent 63%, black 65%)',
              mask: 'radial-gradient(circle, transparent 63%, black 65%)'
            }}
          />
        );
      }

      // =========================================================================
      // 8. TACTICAL RADAR SCANNER (Sonar Sweep & Crosshairs)
      // =========================================================================
      case 'frame_tactical_radar': {
        return (
          <>
            {/* Radar Circular Grid Rim */}
            <div className="absolute -inset-1 rounded-full border border-sky-400/60 pointer-events-none z-10" />

            {/* 360° Rotating Radar Sweep Wedge Beam */}
            {!isLocked && (
              <div 
                className="absolute inset-0 rounded-full overflow-hidden pointer-events-none z-20 animate-radar-sweep"
                style={{
                  background: 'conic-gradient(from 0deg, rgba(56,189,248,0.55) 0deg, rgba(56,189,248,0) 55deg, transparent 55deg)'
                }}
              />
            )}

            {/* Cardinal Compass Ticks (N, E, S, W) */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-sky-400 z-20 pointer-events-none" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-sky-400 z-20 pointer-events-none" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-1.5 bg-sky-400 z-20 pointer-events-none" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 w-1.5 bg-sky-400 z-20 pointer-events-none" />
          </>
        );
      }

      // =========================================================================
      // 9. SONIC PULSE ORATOR (Concentric Acoustic Soundwaves)
      // =========================================================================
      case 'frame_sonic_wave': {
        return (
          <>
            {!isLocked && (
              <>
                <div className="absolute -inset-2 rounded-full border border-teal-400/60 animate-sonic-ripple pointer-events-none z-0" />
                <div className="absolute -inset-3.5 rounded-full border border-teal-400/40 animate-sonic-ripple pointer-events-none z-0 [animation-delay:0.6s]" />
              </>
            )}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-teal-400 text-xs font-bold pointer-events-none z-30">
              🎙️
            </div>
          </>
        );
      }

      // =========================================================================
      // 10. TACTICAL DISPATCH SHIELD (WO Creation / Orange Energy HUD Brackets & Shield)
      // =========================================================================
      case 'frame_wo_dispatcher': {
        const shieldColor = {
          1: '#c2410c',
          2: '#ea580c',
          3: '#f97316',
          4: '#ffedd5'
        }[currentTier];

        return (
          <>
            {/* Top Crest: Tactical Shield Badge */}
            <div 
              className={`absolute -top-[18%] left-1/2 -translate-x-1/2 pointer-events-none z-30 transition-transform ${isLocked ? 'opacity-30 grayscale' : 'drop-shadow-[0_2px_8px_rgba(249,115,22,0.8)]'}`}
              style={{ width: Math.round(size * 0.42), height: Math.round(size * 0.42) }}
            >
              <svg viewBox="0 0 24 24" className="w-full h-full">
                <path
                  d="M12 2L4 5V11C4 16.5 7.4 21.6 12 23C16.6 21.6 20 16.5 20 11V5L12 2Z"
                  fill={currentTier >= 3 ? '#ea580c' : '#9a3412'}
                  stroke={shieldColor}
                  strokeWidth="1.5"
                />
                <path
                  d="M12 7V13M10 10L14 10"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            {/* 4 Corner HUD Brackets */}
            <div className={`absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-orange-500 pointer-events-none z-20 ${!isLocked ? 'animate-pulse' : 'opacity-40'}`} />
            <div className={`absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-orange-500 pointer-events-none z-20 ${!isLocked ? 'animate-pulse' : 'opacity-40'}`} />
            <div className={`absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-orange-500 pointer-events-none z-20 ${!isLocked ? 'animate-pulse' : 'opacity-40'}`} />
            <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-orange-500 pointer-events-none z-20 ${!isLocked ? 'animate-pulse' : 'opacity-40'}`} />
            {/* Ambient Orange Glow Ring */}
            {!isLocked && (
              <div className="absolute -inset-1.5 rounded-full border border-orange-400/40 pointer-events-none z-0 shadow-[0_0_15px_rgba(249,115,22,0.5)]" />
            )}
          </>
        );
      }

      // =========================================================================
      // 11. HEAVY APEX CORE SCOPE (WO Resolution / Cyan Mechanical Gear Core & Plasma Reticle)
      // =========================================================================
      case 'frame_apex_engineer': {
        const coreColor = {
          1: '#0891b2',
          2: '#06b6d4',
          3: '#22d3ee',
          4: '#a5f3fc'
        }[currentTier];

        return (
          <>
            {/* Rotating / Static Mechanical Gear Scope Ring */}
            <div 
              className={`absolute -inset-2 pointer-events-none z-0 flex items-center justify-center ${!isLocked ? 'animate-spin-slow' : 'opacity-30'}`}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <circle cx="50" cy="50" r="46" fill="none" stroke={coreColor} strokeWidth="1.5" strokeDasharray="6, 6" />
                <circle cx="50" cy="50" r="41" fill="none" stroke={coreColor} strokeWidth="0.8" opacity="0.6" />
              </svg>
            </div>
            {/* Glowing Fusion Plasma Core at 12 o'clock */}
            <div 
              className={`absolute -top-[16%] left-1/2 -translate-x-1/2 pointer-events-none z-30 transition-transform flex flex-col items-center ${isLocked ? 'opacity-30' : 'drop-shadow-[0_0_10px_rgba(6,182,212,0.9)]'}`}
              style={{ width: Math.round(size * 0.38), height: Math.round(size * 0.38) }}
            >
              <svg viewBox="0 0 24 24" className="w-full h-full">
                <circle cx="12" cy="12" r="7" fill={currentTier >= 3 ? '#06b6d4' : '#0e7490'} stroke={coreColor} strokeWidth="2" />
                <circle cx="12" cy="12" r="3" fill="#ffffff" />
              </svg>
            </div>
            {/* 4 Directional Precision Crosshair Ticks */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-0.5 bg-cyan-400 z-20 pointer-events-none" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-0.5 bg-cyan-400 z-20 pointer-events-none" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-cyan-400 z-20 pointer-events-none" />
          </>
        );
      }

      // =========================================================================
      // 12. THE ETERNAL SENTINEL (Login Streak / Clockwork Chronometer & Crimson Ember Rim)
      // =========================================================================
      case 'frame_eternal_sentinel': {
        return (
          <>
            <div 
              className={`absolute -inset-2.5 rounded-full pointer-events-none z-0 ${!isLocked ? 'shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse' : 'opacity-30'}`}
              style={{
                background: 'radial-gradient(circle, transparent 58%, rgba(220, 38, 38, 0.4) 85%, transparent 100%)'
              }}
            />
            <div className={`absolute -top-2 left-1/2 -translate-x-1/2 text-xs font-black text-red-500 pointer-events-none z-30 ${!isLocked ? 'drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]' : 'opacity-40'}`}>
              ⏳
            </div>
            <div className="absolute -inset-1 rounded-full border border-red-500/50 pointer-events-none z-10" style={{ borderStyle: 'dotted' }} />
          </>
        );
      }

      // =========================================================================
      // 13. SOLAR SUNRISE HALO (Dawn Shift / Rising Sun & Morning Star)
      // =========================================================================
      case 'frame_dawn_aurora': {
        return (
          <>
            <div 
              className={`absolute -inset-2 rounded-full pointer-events-none z-0 ${!isLocked ? 'shadow-[0_0_18px_rgba(251,146,60,0.8)] animate-pulse' : 'opacity-30'}`}
              style={{
                background: 'radial-gradient(circle, transparent 55%, rgba(251, 146, 60, 0.45) 85%, transparent 100%)'
              }}
            />
            <div className={`absolute -top-2 left-1/2 -translate-x-1/2 text-xs pointer-events-none z-30 ${!isLocked ? 'drop-shadow-[0_0_8px_rgba(251,191,36,1)]' : 'opacity-40'}`}>
              🌅
            </div>
          </>
        );
      }

      // =========================================================================
      // 14. CYBERPUNK ARCADE GLITCH (Retro Arcade Sleuth / Pixel Synthwave)
      // =========================================================================
      case 'frame_arcade_neon': {
        return (
          <>
            <div className={`absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-lime-400 pointer-events-none z-20 ${!isLocked ? 'shadow-[0_0_8px_rgba(163,230,53,0.8)]' : 'opacity-40'}`} />
            <div className={`absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-fuchsia-400 pointer-events-none z-20 ${!isLocked ? 'shadow-[0_0_8px_rgba(232,121,249,0.8)]' : 'opacity-40'}`} />
            <div className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] pointer-events-none z-30 ${!isLocked ? 'animate-bounce' : 'opacity-40'}`}>
              👾
            </div>
          </>
        );
      }

      // =========================================================================
      // 15. SOLAR AEGIS COG (The Restless Sentinel / Dedikasi Akhir Pekan)
      // =========================================================================
      case 'frame_weekend_sentinel': {
        return (
          <>
            <div className={`absolute -inset-2 rounded-full border-2 border-dashed border-amber-400/80 pointer-events-none z-0 ${!isLocked ? 'animate-spin-slow shadow-[0_0_16px_rgba(251,191,36,0.6)]' : 'opacity-30'}`} />
            <div className={`absolute -top-2 left-1/2 -translate-x-1/2 text-xs pointer-events-none z-30 ${!isLocked ? 'drop-shadow-[0_0_8px_rgba(251,191,36,1)]' : 'opacity-40'}`}>
              ⚡
            </div>
          </>
        );
      }

      // =========================================================================
      // 16. PRISMATIC TETRAHEDRON CORE (Omni-Discipline Polymath / Master Segala Lini)
      // =========================================================================
      case 'frame_omni_polymath': {
        return (
          <>
            <div 
              className={`absolute -inset-2 rounded-full pointer-events-none z-0 ${!isLocked ? 'shadow-[0_0_20px_rgba(192,38,211,0.7)] animate-pulse' : 'opacity-30'}`}
              style={{
                background: 'conic-gradient(from 0deg, #ec4899, #8b5cf6, #06b6d4, #10b981, #f59e0b, #ec4899)'
              }}
            />
            <div className="absolute -inset-1 rounded-full bg-slate-950 pointer-events-none z-0" />
            <div className={`absolute -top-2 left-1/2 -translate-x-1/2 text-xs pointer-events-none z-30 ${!isLocked ? 'drop-shadow-[0_0_8px_rgba(236,72,153,1)]' : 'opacity-40'}`}>
              🌐
            </div>
          </>
        );
      }

      // =========================================================================
      // 17. PRECISION LASER MARKSMAN (Combat Red Laser & Target Lock)
      // =========================================================================
      case 'frame_laser_crosshair': {
        return (
          <>
            {/* Pulsing Red Laser Diode Dot at 12 o'clock */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center">
              <div className={`w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)] ${!isLocked ? 'animate-laser-pulse' : ''}`} />
              <div className="w-0.5 h-2 bg-rose-500/80" />
            </div>
            {/* Tactical Targeting Corner Dots */}
            <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-rose-500 pointer-events-none z-20" />
            <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-rose-500 pointer-events-none z-20" />
            <div className="absolute bottom-1 left-1 w-1 h-1 rounded-full bg-rose-500 pointer-events-none z-20" />
            <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-rose-500 pointer-events-none z-20" />
          </>
        );
      }

      // =========================================================================
      // 18. ABYSSAL VOID ECLIPSE (Celestial Eclipse Corona & Crescent Moon)
      // =========================================================================
      case 'frame_shadow_eclipse': {
        return (
          <>
            {/* Deep Violet Eclipse Corona */}
            <div 
              className={`absolute -inset-2 rounded-full pointer-events-none z-0 ${!isLocked ? 'shadow-[0_0_20px_rgba(147,51,234,0.8)]' : ''}`}
              style={{
                background: 'radial-gradient(circle, transparent 55%, rgba(88, 28, 135, 0.75) 85%, transparent 100%)'
              }}
            />
            {/* Crescent Moon Crest at 11 o'clock */}
            <div className={`absolute -top-1.5 -left-1.5 text-purple-300 text-sm pointer-events-none z-30 ${!isLocked ? 'drop-shadow-[0_0_6px_rgba(216,180,254,0.9)]' : 'opacity-40'}`}>
              🌙
            </div>
          </>
        );
      }

      // =========================================================================
      // SUPREME GM EXCLUSIVE: ABYSSAL SYMBIOTE (Venom Living Canvas Tentacles)
      // =========================================================================
      case 'frame_gm_symbiote': {
        return (
          <>
            {/* Living Symbiote Tentacles Canvas (Rapat & Meruncing Tajam) */}
            <GmSymbioteCanvas size={size} isLocked={isLocked} />

            {/* Glowing Deep Obsidian Black Smoke Aura Ring (Rapat Membungkus Frame) */}
            <div 
              className={`absolute -inset-1 rounded-full pointer-events-none z-0 ${!isLocked ? 'shadow-[0_0_14px_rgba(0,0,0,0.95)]' : 'opacity-20'}`}
              style={{
                background: 'radial-gradient(circle, transparent 60%, rgba(0, 0, 0, 0.88) 86%, transparent 100%)'
              }}
            />

            {/* Directional Stealth Black/Silver Core Ticks */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-0.5 bg-zinc-500 z-20 pointer-events-none shadow-[0_0_4px_rgba(0,0,0,0.9)]" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-0.5 bg-zinc-500 z-20 pointer-events-none shadow-[0_0_4px_rgba(0,0,0,0.9)]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-1.5 bg-zinc-500 z-20 pointer-events-none shadow-[0_0_4px_rgba(0,0,0,0.9)]" />
          </>
        );
      }

      // =========================================================================
      // STANDARD FRAMES
      // =========================================================================
      case 'golden_halo':
        return (
          <div className="absolute -inset-1 rounded-full border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)] animate-pulse pointer-events-none z-10" />
        );

      case 'cyber_neon':
        return (
          <div className="absolute -inset-1 rounded-full border-2 border-teal-400 shadow-[0_0_12px_rgba(45,212,191,0.7)] pointer-events-none z-10" />
        );

      case 'emerald_aurora':
        return (
          <div className="absolute -inset-1 rounded-full border-2 border-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)] pointer-events-none z-10" />
        );

      case 'commander_crimson':
        return (
          <div className="absolute -inset-1 rounded-full border-2 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.7)] animate-pulse pointer-events-none z-10" />
        );

      case 'obsidian_dark':
        return (
          <div className="absolute -inset-1 rounded-full border-2 border-slate-700 dark:border-slate-300 shadow-md pointer-events-none z-10" />
        );

      default:
        return (
          <div className="absolute -inset-0.5 rounded-full border border-slate-300 dark:border-slate-700 pointer-events-none z-10" />
        );
    }
  };

  // Base Ring Border Styling
  const getBaseRingClass = () => {
    if (isLocked) {
      return 'border-dashed border-slate-400 dark:border-slate-600 opacity-60';
    }

    switch (activeFrame) {
      case 'frame_mythic_crown':
        return currentTier === 4
          ? 'border-yellow-300 ring-2 ring-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.8)]'
          : currentTier === 3
          ? 'border-amber-400 ring-2 ring-amber-400/60 shadow-[0_0_15px_rgba(245,158,11,0.6)]'
          : currentTier === 2
          ? 'border-slate-200 ring-2 ring-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
          : 'border-amber-700 ring-1 ring-amber-600/30';
      case 'frame_grand_marshal':
        return currentTier >= 3
          ? 'border-amber-400 ring-2 ring-amber-400/70 shadow-[0_0_15px_rgba(251,191,36,0.6)]'
          : 'border-amber-600 ring-1 ring-amber-500/40';
      case 'frame_hazard_aegis':
        return 'border-emerald-400 ring-2 ring-emerald-500/70 shadow-[0_0_18px_rgba(16,185,129,0.7)]';
      case 'frame_biohazard_neon':
        return 'border-yellow-400 ring-2 ring-yellow-400/60 shadow-[0_0_15px_rgba(234,179,8,0.7)]';
      case 'frame_living_bastion':
        return 'border-indigo-400 ring-2 ring-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.6)]';
      case 'frame_cyber_matrix':
        return 'border-emerald-400 ring-2 ring-emerald-400/60 shadow-[0_0_15px_rgba(52,211,153,0.7)]';
      case 'frame_cosmic_nebula':
        return 'border-fuchsia-400 ring-2 ring-fuchsia-500/60 shadow-[0_0_15px_rgba(217,70,239,0.7)]';
      case 'frame_prismatic_rgb':
        return 'border-pink-400 ring-2 ring-violet-500/60 shadow-[0_0_18px_rgba(236,72,153,0.7)]';
      case 'frame_tactical_radar':
        return 'border-sky-400 ring-2 ring-sky-400/60 shadow-[0_0_15px_rgba(56,189,248,0.7)]';
      case 'frame_sonic_wave':
        return 'border-teal-400 ring-2 ring-teal-400/60 shadow-[0_0_15px_rgba(45,212,191,0.7)]';
      case 'frame_wo_dispatcher':
        return 'border-orange-500 ring-2 ring-orange-500/70 shadow-[0_0_18px_rgba(249,115,22,0.7)]';
      case 'frame_apex_engineer':
        return 'border-cyan-400 ring-2 ring-cyan-500/70 shadow-[0_0_18px_rgba(6,182,212,0.7)]';
      case 'frame_eternal_sentinel':
        return 'border-red-500 ring-2 ring-red-600/80 shadow-[0_0_20px_rgba(239,68,68,0.8)]';
      case 'frame_dawn_aurora':
        return 'border-amber-300 ring-2 ring-orange-400/70 shadow-[0_0_18px_rgba(251,146,60,0.7)]';
      case 'frame_arcade_neon':
        return 'border-lime-400 ring-2 ring-emerald-500/70 shadow-[0_0_18px_rgba(132,204,22,0.7)]';
      case 'frame_weekend_sentinel':
        return 'border-amber-400 ring-2 ring-yellow-500/70 shadow-[0_0_18px_rgba(251,191,36,0.7)]';
      case 'frame_omni_polymath':
        return 'border-fuchsia-400 ring-2 ring-cyan-400/70 shadow-[0_0_20px_rgba(192,38,211,0.75)]';
      case 'frame_laser_crosshair':
        return 'border-rose-500 ring-2 ring-rose-500/70 shadow-[0_0_15px_rgba(244,63,94,0.7)]';
      case 'frame_shadow_eclipse':
        return 'border-purple-600 ring-2 ring-indigo-900/80 shadow-[0_0_18px_rgba(147,51,234,0.7)]';
      case 'frame_gm_symbiote':
        return 'border-zinc-950 ring-2 ring-zinc-800 shadow-[0_0_12px_rgba(0,0,0,0.95)]';
      default:
        return 'border-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div 
      className={`relative shrink-0 flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Dynamic Frame Decorations (Crown, Flames, Laurels, Radar, etc.) */}
      {renderFrameDecorations()}

      {/* Inner Avatar Circular Container */}
      <div 
        className={`w-full h-full rounded-full overflow-hidden relative z-10 flex items-center justify-center border transition-all ${getBaseRingClass()}`}
        style={{ borderWidth: `${borderWidth}px` }}
      >
        {children}
      </div>
    </div>
  );
};
