import React from 'react';

/**
 * Pokémon GBA (Gen III: Ruby/Sapphire/Emerald) 16-Bit Pixel Art Furniture & Props
 * for PrepLab Nickel Mining & Laboratory Facility.
 * 
 * Rendered using crisp pixel blocks, authentic GBA color palette (warm woods, emerald grass,
 * red tile roofing, steel drums, and safety signs).
 */

// 1. TEAK PARK BENCH (Bangku Kayu Gazebo & Taman K3 GBA)
export const TeakParkBench: React.FC<{
  facing?: 'left' | 'right';
  className?: string;
  isHovered?: boolean;
}> = ({ facing = 'right', className = '', isHovered = false }) => {
  return (
    <svg
      viewBox="0 0 44 26"
      className={`select-none overflow-visible transition-all duration-150 ${className} ${
        isHovered ? 'filter drop-shadow(0 0 5px #F59E0B)' : 'filter drop-shadow(0 2px 2px rgba(0,0,0,0.35))'
      }`}
      style={{
        transform: facing === 'left' ? 'scaleX(-1)' : 'none',
        transformOrigin: 'center',
        shapeRendering: 'crispEdges',
        imageRendering: 'pixelated'
      }}
    >
      {/* Ground Shadow */}
      <ellipse cx="22" cy="24" rx="18" ry="2" fill="#000000" opacity="0.3" />

      {/* Cast Iron Bench Legs */}
      <rect x="6" y="14" width="2" height="9" fill="#1F2937" />
      <rect x="36" y="14" width="2" height="9" fill="#1F2937" />
      <rect x="10" y="18" width="2" height="5" fill="#111827" />
      <rect x="32" y="18" width="2" height="5" fill="#111827" />

      {/* Backrest Wood Slats (Warm Teak Wood Palette) */}
      <rect x="4" y="3" width="36" height="3" fill="#B45309" stroke="#1F2937" strokeWidth="0.6" />
      <rect x="5" y="3.5" width="34" height="1" fill="#FBBF24" opacity="0.5" />

      <rect x="4" y="7" width="36" height="3" fill="#B45309" stroke="#1F2937" strokeWidth="0.6" />
      <rect x="5" y="7.5" width="34" height="1" fill="#FBBF24" opacity="0.5" />

      {/* Armrests */}
      <rect x="3" y="9" width="3" height="6" fill="#78350F" stroke="#1F2937" strokeWidth="0.6" />
      <rect x="38" y="9" width="3" height="6" fill="#78350F" stroke="#1F2937" strokeWidth="0.6" />

      {/* Seat Plank Base */}
      <rect x="4" y="13" width="36" height="4" fill="#92400E" stroke="#1F2937" strokeWidth="0.6" />
      <rect x="5" y="13.5" width="34" height="1.2" fill="#F59E0B" />
      <rect x="4" y="16" width="36" height="1" fill="#451A03" />
    </svg>
  );
};

// 2. STANDING ASHTRAY (Asbak Berdiri Stainless Gazebo K3 dengan Efek Asap Pixel)
export const StandingAshtray: React.FC<{
  className?: string;
  isHovered?: boolean;
}> = ({ className = '', isHovered = false }) => {
  return (
    <svg
      viewBox="0 0 16 32"
      className={`select-none overflow-visible transition-all duration-150 ${className} ${
        isHovered ? 'filter drop-shadow(0 0 4px #F59E0B)' : 'filter drop-shadow(0 2px 2px rgba(0,0,0,0.3))'
      }`}
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
    >
      {/* Ground Shadow */}
      <ellipse cx="8" cy="30" rx="5" ry="1.5" fill="#000000" opacity="0.3" />

      {/* Heavy Base Plate */}
      <rect x="4" y="27" width="8" height="3" rx="0.5" fill="#475569" stroke="#1E293B" strokeWidth="0.5" />
      <rect x="5" y="27.5" width="6" height="1" fill="#94A3B8" />

      {/* Vertical Stainless Post */}
      <rect x="7" y="10" width="2" height="17" fill="#64748B" stroke="#1E293B" strokeWidth="0.5" />
      <rect x="7" y="10" width="0.8" height="17" fill="#CBD5E1" />

      {/* Top Ashtray Bowl / Grille */}
      <rect x="3" y="6" width="10" height="4" fill="#475569" stroke="#1E293B" strokeWidth="0.5" />
      <rect x="4" y="5" width="8" height="2" fill="#334155" stroke="#1E293B" strokeWidth="0.5" />
      {/* Sand / Mesh Top */}
      <rect x="4.5" y="5.2" width="7" height="1" fill="#1E293B" />
      {/* Tiny Orange Ember */}
      <rect x="6" y="5" width="1" height="0.8" fill="#F97316" />

      {/* Rising Pixel Smoke Puffs */}
      <circle cx="6" cy="3" r="0.8" fill="#E2E8F0" opacity="0.8" />
      <circle cx="5" cy="1" r="1.1" fill="#CBD5E1" opacity="0.6" />
      <circle cx="7" cy="-1" r="1.3" fill="#94A3B8" opacity="0.4" />
    </svg>
  );
};

// 3. ROUND COFFEE TABLE (Meja Kopi Bundar Kayu dengan Cangkir & Teko K3)
export const RoundCoffeeTable: React.FC<{
  className?: string;
  isHovered?: boolean;
}> = ({ className = '', isHovered = false }) => {
  return (
    <svg
      viewBox="0 0 38 28"
      className={`select-none overflow-visible transition-all duration-150 ${className} ${
        isHovered ? 'filter drop-shadow(0 0 5px #F59E0B)' : 'filter drop-shadow(0 2px 3px rgba(0,0,0,0.35))'
      }`}
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
    >
      {/* Ground Shadow */}
      <ellipse cx="19" cy="25" rx="14" ry="2.5" fill="#000000" opacity="0.3" />

      {/* Cross Center Leg Base */}
      <rect x="18" y="14" width="2" height="10" fill="#451A03" />
      <polygon points="12,24 26,24 24,26 14,26" fill="#271003" />

      {/* Tabletop Surface (Warm GBA Picnic Table) */}
      <ellipse cx="19" cy="12" rx="16" ry="6" fill="#B45309" stroke="#1F2937" strokeWidth="0.6" />
      <ellipse cx="19" cy="11.5" rx="14.5" ry="4.8" fill="#D97706" />
      <ellipse cx="19" cy="11" rx="12" ry="3.5" fill="#F59E0B" opacity="0.3" />

      {/* Ceramic Coffee Mug on Table */}
      <rect x="12" y="8" width="3" height="3.5" fill="#FFFFFF" stroke="#1F2937" strokeWidth="0.4" />
      <rect x="12.5" y="8.5" width="2" height="1" fill="#78350F" />
      <rect x="15" y="9" width="0.8" height="1.5" fill="#1F2937" />

      {/* Second Cup */}
      <rect x="23" y="9" width="3" height="3" fill="#38BDF8" stroke="#1F2937" strokeWidth="0.4" />
      <rect x="23.5" y="9.5" width="2" height="0.8" fill="#0D9488" />

      {/* Snack Plate with Fried Banana / Pisang Goreng */}
      <ellipse cx="19" cy="13" rx="4" ry="1.8" fill="#F8FAFC" stroke="#1F2937" strokeWidth="0.4" />
      <rect x="17" y="12" width="4" height="1.5" rx="0.5" fill="#F59E0B" />
    </svg>
  );
};

// 4. WOODEN DINING CHAIR (Kursi Kayu GBA)
export const WoodenDiningChair: React.FC<{
  facing?: 'left' | 'right';
  className?: string;
  isHovered?: boolean;
}> = ({ facing = 'right', className = '', isHovered = false }) => {
  return (
    <svg
      viewBox="0 0 22 26"
      className={`select-none overflow-visible transition-all duration-150 ${className} ${
        isHovered ? 'filter drop-shadow(0 0 4px #F59E0B)' : 'filter drop-shadow(0 2px 2px rgba(0,0,0,0.3))'
      }`}
      style={{
        transform: facing === 'left' ? 'scaleX(-1)' : 'none',
        transformOrigin: 'center',
        shapeRendering: 'crispEdges',
        imageRendering: 'pixelated'
      }}
    >
      {/* Shadow */}
      <ellipse cx="11" cy="24" rx="8" ry="1.5" fill="#000000" opacity="0.3" />

      {/* Chair Legs */}
      <rect x="4" y="14" width="2" height="10" fill="#451A03" />
      <rect x="16" y="14" width="2" height="10" fill="#451A03" />

      {/* Backrest Uprights & Slats */}
      <rect x="3" y="2" width="2" height="14" fill="#78350F" stroke="#1F2937" strokeWidth="0.5" />
      <rect x="3" y="3" width="14" height="3" fill="#B45309" stroke="#1F2937" strokeWidth="0.5" />
      <rect x="3" y="7" width="14" height="2.5" fill="#B45309" stroke="#1F2937" strokeWidth="0.5" />

      {/* Cushion / Seat */}
      <rect x="3" y="12" width="16" height="3.5" rx="0.5" fill="#D97706" stroke="#1F2937" strokeWidth="0.5" />
      <rect x="4" y="12.5" width="14" height="1" fill="#FBBF24" opacity="0.5" />
    </svg>
  );
};

// 5. MODULAR LOUNGE SOFA (Sofa Santai Rehat Lab GBA)
export const ModularLoungeSofa: React.FC<{
  facing?: 'left' | 'right';
  className?: string;
  isHovered?: boolean;
}> = ({ facing = 'right', className = '', isHovered = false }) => {
  return (
    <svg
      viewBox="0 0 48 28"
      className={`select-none overflow-visible transition-all duration-150 ${className} ${
        isHovered ? 'filter drop-shadow(0 0 5px #38BDF8)' : 'filter drop-shadow(0 2px 3px rgba(0,0,0,0.35))'
      }`}
      style={{
        transform: facing === 'left' ? 'scaleX(-1)' : 'none',
        transformOrigin: 'center',
        shapeRendering: 'crispEdges',
        imageRendering: 'pixelated'
      }}
    >
      {/* Ground Shadow */}
      <ellipse cx="24" cy="26" rx="20" ry="2" fill="#000000" opacity="0.3" />

      {/* Wood Base Feet */}
      <rect x="4" y="22" width="3" height="3" fill="#451A03" />
      <rect x="41" y="22" width="3" height="3" fill="#451A03" />

      {/* Backrest Upholstered Cushion (Cyan-Teal Lab Aesthetic) */}
      <rect x="3" y="5" width="42" height="11" rx="2" fill="#0E7490" stroke="#164E63" strokeWidth="0.6" />
      <rect x="4" y="6" width="40" height="2" fill="#22D3EE" opacity="0.6" />
      {/* Cushion Stitching Lines */}
      <line x1="17" y1="6" x2="17" y2="15" stroke="#164E63" strokeWidth="0.8" />
      <line x1="31" y1="6" x2="31" y2="15" stroke="#164E63" strokeWidth="0.8" />

      {/* Armrests */}
      <rect x="2" y="10" width="5" height="11" rx="1.5" fill="#0891B2" stroke="#164E63" strokeWidth="0.6" />
      <rect x="41" y="10" width="5" height="11" rx="1.5" fill="#0891B2" stroke="#164E63" strokeWidth="0.6" />

      {/* Seat Cushions */}
      <rect x="6" y="14" width="36" height="8" rx="1.5" fill="#06B6D4" stroke="#164E63" strokeWidth="0.6" />
      <rect x="7" y="14.5" width="34" height="2" fill="#A5F3FC" opacity="0.5" />
      <line x1="18" y1="15" x2="18" y2="22" stroke="#164E63" strokeWidth="0.8" />
      <line x1="30" y1="15" x2="30" y2="22" stroke="#164E63" strokeWidth="0.8" />
    </svg>
  );
};

// 6. BEVERAGE BAR COUNTER (Stasiun Minuman Dispenser Kopi & Teh ala Poké Mart)
export const BeverageBarCounter: React.FC<{
  className?: string;
  isHovered?: boolean;
}> = ({ className = '', isHovered = false }) => {
  return (
    <svg
      viewBox="0 0 54 34"
      className={`select-none overflow-visible transition-all duration-150 ${className} ${
        isHovered ? 'filter drop-shadow(0 0 6px #10B981)' : 'filter drop-shadow(0 3px 4px rgba(0,0,0,0.35))'
      }`}
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
    >
      {/* Shadow */}
      <ellipse cx="27" cy="32" rx="24" ry="2" fill="#000000" opacity="0.3" />

      {/* Main Wood & Stainless Steel Counter Body */}
      <rect x="3" y="12" width="48" height="19" rx="1" fill="#334155" stroke="#0F172A" strokeWidth="0.8" />
      {/* Countertop Trim */}
      <rect x="2" y="10" width="50" height="3.5" rx="1" fill="#E2E8F0" stroke="#0F172A" strokeWidth="0.8" />
      <rect x="3" y="10.5" width="48" height="1" fill="#FFFFFF" />

      {/* Cabinet Panels */}
      <rect x="6" y="15" width="18" height="14" fill="#475569" stroke="#1E293B" strokeWidth="0.6" />
      <rect x="28" y="15" width="20" height="14" fill="#475569" stroke="#1E293B" strokeWidth="0.6" />
      <rect x="21" y="21" width="1.5" height="3" fill="#E2E8F0" />
      <rect x="30" y="21" width="1.5" height="3" fill="#E2E8F0" />

      {/* Drink Dispenser Machine on Left Countertop (Coffee / Hot Water) */}
      <rect x="7" y="2" width="10" height="9" fill="#DC2626" stroke="#0F172A" strokeWidth="0.6" />
      <rect x="8" y="3" width="8" height="3" fill="#1E293B" />
      <rect x="9.5" y="7" width="1.5" height="2" fill="#CBD5E1" />
      <rect x="13" y="7" width="1.5" height="2" fill="#CBD5E1" />

      {/* Water Gallon Dispenser on Right Countertop */}
      <rect x="35" y="3" width="7" height="8" rx="2" fill="#38BDF8" opacity="0.85" stroke="#0284C7" strokeWidth="0.6" />
      <rect x="36" y="4" width="2" height="6" fill="#FFFFFF" opacity="0.6" />
      <rect x="37" y="9" width="3" height="2" fill="#F8FAFC" />

      {/* Paper Cups Stack */}
      <rect x="21" y="5" width="3" height="6" fill="#FFFFFF" stroke="#0F172A" strokeWidth="0.4" />
      <line x1="21" y1="7" x2="24" y2="7" stroke="#CBD5E1" strokeWidth="0.4" />
      <line x1="21" y1="9" x2="24" y2="9" stroke="#CBD5E1" strokeWidth="0.4" />
    </svg>
  );
};

// 7. NICKEL SAMPLE ORE DRUMS (Drum Penampung Sampel Limonite & Saprolite)
export const GbaNickelSampleDrums: React.FC<{
  className?: string;
  isHovered?: boolean;
}> = ({ className = '', isHovered = false }) => {
  return (
    <svg
      viewBox="0 0 34 26"
      className={`select-none overflow-visible transition-all duration-150 ${className} ${
        isHovered ? 'filter drop-shadow(0 0 5px #F59E0B)' : 'filter drop-shadow(0 2px 2px rgba(0,0,0,0.3))'
      }`}
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
    >
      {/* Ground Shadow */}
      <ellipse cx="17" cy="24" rx="14" ry="2" fill="#000000" opacity="0.3" />

      {/* Drum 1 (Left - Blue Barrel for Limonite Nickel Ore) */}
      <rect x="3" y="7" width="13" height="16" rx="1.5" fill="#1D4ED8" stroke="#0F172A" strokeWidth="0.6" />
      <ellipse cx="9.5" cy="7" rx="6.5" ry="2" fill="#3B82F6" stroke="#0F172A" strokeWidth="0.5" />
      {/* Barrel Ridges */}
      <line x1="3" y1="12" x2="16" y2="12" stroke="#0F172A" strokeWidth="0.6" />
      <line x1="3" y1="17" x2="16" y2="17" stroke="#0F172A" strokeWidth="0.6" />
      {/* Limonite Red/Brown Ore Label */}
      <rect x="6" y="13" width="7" height="3" fill="#B45309" stroke="#0F172A" strokeWidth="0.4" />
      <text x="9.5" y="15.2" fill="#FEF08A" fontSize="2" fontWeight="bold" textAnchor="middle">LIM</text>

      {/* Drum 2 (Right - Yellow Barrel for Saprolite Nickel Ore) */}
      <rect x="17" y="5" width="14" height="18" rx="1.5" fill="#EAB308" stroke="#0F172A" strokeWidth="0.6" />
      <ellipse cx="24" cy="5" rx="7" ry="2" fill="#FDE047" stroke="#0F172A" strokeWidth="0.5" />
      {/* Barrel Ridges */}
      <line x1="17" y1="11" x2="31" y2="11" stroke="#0F172A" strokeWidth="0.6" />
      <line x1="17" y1="16" x2="31" y2="16" stroke="#0F172A" strokeWidth="0.6" />
      {/* Saprolite Green/Yellow Ore Label */}
      <rect x="20" y="12" width="8" height="3" fill="#15803D" stroke="#0F172A" strokeWidth="0.4" />
      <text x="24" y="14.2" fill="#FFFFFF" fontSize="2" fontWeight="bold" textAnchor="middle">SAP</text>
    </svg>
  );
};

// 8. K3 SAFETY SIGNPOST (Plang Rambu Keselamatan K3 GBA)
export const GbaK3SignPost: React.FC<{
  className?: string;
  isHovered?: boolean;
}> = ({ className = '', isHovered = false }) => {
  return (
    <svg
      viewBox="0 0 20 28"
      className={`select-none overflow-visible transition-all duration-150 ${className} ${
        isHovered ? 'filter drop-shadow(0 0 5px #10B981)' : 'filter drop-shadow(0 2px 2px rgba(0,0,0,0.3))'
      }`}
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
    >
      {/* Shadow */}
      <ellipse cx="10" cy="26" rx="4" ry="1.5" fill="#000000" opacity="0.3" />

      {/* Wooden / Steel Post */}
      <rect x="9" y="12" width="2" height="14" fill="#78350F" stroke="#1F2937" strokeWidth="0.5" />

      {/* Signboard Panel */}
      <rect x="2" y="2" width="16" height="12" rx="1" fill="#FFFFFF" stroke="#1F2937" strokeWidth="0.8" />
      <rect x="3" y="3" width="14" height="10" fill="#F0FDF4" />

      {/* Green Cross K3 Safety First Symbol */}
      <rect x="8.5" y="4.5" width="3" height="7" fill="#16A34A" />
      <rect x="6.5" y="6.5" width="7" height="3" fill="#16A34A" />
      {/* White Inner Dot */}
      <rect x="9" y="7" width="2" height="2" fill="#FFFFFF" />
    </svg>
  );
};

// 9. GAZEBO GHOST NPC (Hantu Pojok Kiri Bawah - Bot Suwit Gunting-Batu-Kertas GBA)
export const GbaLoungeGhostNpc: React.FC<{
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  className?: string;
  isHovered?: boolean;
  onClick?: () => void;
}> = ({ x = 0, y = 0, width = 14, height = 18, className = '', isHovered = false, onClick }) => {
  return (
    <svg
      x={x}
      y={y}
      width={width}
      height={height}
      viewBox="0 0 24 30"
      onClick={onClick}
      className={`select-none overflow-visible transition-all duration-200 cursor-pointer ${className} ${
        isHovered 
          ? 'filter drop-shadow(0 0 4px #A855F7)' 
          : 'filter drop-shadow(0 0 2px rgba(168,85,247,0.45))'
      }`}
      style={{ 
        shapeRendering: 'crispEdges', 
        imageRendering: 'pixelated',
        transformOrigin: 'bottom center'
      }}
    >
      <title>👻 Si Mba Hantu Pojok (Klik untuk duel Gunting-Batu-Kertas!)</title>

      {/* Ground Spooky Shadow */}
      <ellipse cx="12" cy="27" rx="6" ry="1.8" fill="#581C87" opacity="0.45" />

      {/* Floating Ghost Outer Silhouette (Deep Lavender/Purple) */}
      <path
        d="M 12 4 C 7 4 4 8 4 14 C 4 20 4 24 6 24 C 7.5 24 8.5 22 10 22 C 11.5 22 12.5 24 14 24 C 15.5 24 16.5 22 18 22 C 19.5 22 20.5 24 22 24 C 24 24 24 20 24 14 C 24 8 21 4 12 4 Z"
        fill="#A855F7"
        opacity="0.85"
      />

      {/* Inner Glowing Body (Pale Lavender/White) */}
      <path
        d="M 12 6 C 8 6 6 9 6 14 C 6 19 6.5 22 8 22 C 9 22 10 20.5 11 20.5 C 12 20.5 12.8 22 14 22 C 15.2 22 16 20.5 17 20.5 C 18 20.5 18.5 22 20 22 C 21.5 22 22 19 22 14 C 22 9 19 6 12 6 Z"
        fill="#F3E8FF"
      />

      {/* Spooky Glowing Eyes */}
      <rect x="8" y="10" width="2.5" height="3.5" rx="0.5" fill="#3B0764" />
      <rect x="13.5" y="10" width="2.5" height="3.5" rx="0.5" fill="#3B0764" />
      {/* Yellow/Red Radiant Pupils */}
      <rect x="8.5" y="10.5" width="1.2" height="1.2" fill="#FACC15" />
      <rect x="14" y="10.5" width="1.2" height="1.2" fill="#FACC15" />

      {/* Playful Ghostly Smile */}
      <path d="M 10 16 Q 12 18.5 14 16" stroke="#581C87" strokeWidth="0.9" fill="none" />

      {/* Rosy Cheek Blush */}
      <rect x="6.5" y="13.5" width="1.5" height="1" fill="#F472B6" opacity="0.6" />
      <rect x="16" y="13.5" width="1.5" height="1" fill="#F472B6" opacity="0.6" />

      {/* Magical Floating Sparkle Particles */}
      <circle cx="3" cy="8" r="0.8" fill="#C084FC" opacity="0.8">
        <animate attributeName="opacity" values="0.3;1;0.3" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="21" cy="6" r="0.7" fill="#67E8F9" opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.4s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
};

// 7. UNDERGROUND 4-SEATER DOMINO (GAPLE) TABLE WITH 4 WOODEN CHAIRS
export const GbaUndergroundDominoTable: React.FC<{
  x?: number;
  y?: number;
  className?: string;
  isHovered?: boolean;
  activeSeat?: 'top' | 'bottom' | 'left' | 'right' | null;
  onClick?: () => void;
  onSeatClick?: (seat: 'top' | 'bottom' | 'left' | 'right') => void;
}> = ({ x = 0, y = 0, className = '', isHovered = false, activeSeat = null, onClick, onSeatClick }) => {
  return (
    <svg
      x={x}
      y={y}
      width={56}
      height={42}
      viewBox="0 0 56 42"
      className={`select-none overflow-visible transition-all duration-200 cursor-pointer ${className} ${
        isHovered ? 'filter drop-shadow(0 0 5px #10B981)' : 'filter drop-shadow(0 3px 3px rgba(0,0,0,0.4))'
      }`}
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      onClick={onClick}
    >
      <title>🀄 Meja Gaple 4 Kursi (Klik untuk duduk & bermain Gaple)</title>

      {/* Ground Ambient Shadow */}
      <ellipse cx="28" cy="24" rx="26" ry="16" fill="#000000" opacity="0.45" />

      {/* ── SEAT TOP (UTARA) ── */}
      <g 
        className="cursor-pointer group/top"
        onClick={(e) => {
          if (onSeatClick) {
            e.stopPropagation();
            onSeatClick('top');
          }
        }}
      >
        <title>Kursi Atas (Utara)</title>
        <rect x="21" y="2" width="14" height="6" rx="1" fill="#78350F" stroke="#451A03" strokeWidth="0.6" />
        <rect x="22" y="3" width="12" height="2" fill="#B45309" />
        {activeSeat === 'top' && (
          <rect x="21" y="2" width="14" height="6" fill="#10B981" opacity="0.4" />
        )}
      </g>

      {/* ── SEAT BOTTOM (SELATAN) ── */}
      <g 
        className="cursor-pointer group/bot"
        onClick={(e) => {
          if (onSeatClick) {
            e.stopPropagation();
            onSeatClick('bottom');
          }
        }}
      >
        <title>Kursi Bawah (Selatan)</title>
        <rect x="21" y="34" width="14" height="6" rx="1" fill="#78350F" stroke="#451A03" strokeWidth="0.6" />
        <rect x="22" y="35" width="12" height="2" fill="#B45309" />
        {activeSeat === 'bottom' && (
          <rect x="21" y="34" width="14" height="6" fill="#10B981" opacity="0.4" />
        )}
      </g>

      {/* ── SEAT LEFT (BARAT) ── */}
      <g 
        className="cursor-pointer group/left"
        onClick={(e) => {
          if (onSeatClick) {
            e.stopPropagation();
            onSeatClick('left');
          }
        }}
      >
        <title>Kursi Kiri (Barat)</title>
        <rect x="2" y="15" width="6" height="14" rx="1" fill="#78350F" stroke="#451A03" strokeWidth="0.6" />
        <rect x="3" y="16" width="2" height="12" fill="#B45309" />
        {activeSeat === 'left' && (
          <rect x="2" y="15" width="6" height="14" fill="#10B981" opacity="0.4" />
        )}
      </g>

      {/* ── SEAT RIGHT (TIMUR) ── */}
      <g 
        className="cursor-pointer group/right"
        onClick={(e) => {
          if (onSeatClick) {
            e.stopPropagation();
            onSeatClick('right');
          }
        }}
      >
        <title>Kursi Kanan (Timur)</title>
        <rect x="48" y="15" width="6" height="14" rx="1" fill="#78350F" stroke="#451A03" strokeWidth="0.6" />
        <rect x="49" y="16" width="2" height="12" fill="#B45309" />
        {activeSeat === 'right' && (
          <rect x="48" y="15" width="6" height="14" fill="#10B981" opacity="0.4" />
        )}
      </g>

      {/* ── TABLE LEGS & SOLID BASE ── */}
      <rect x="12" y="27" width="3" height="7" fill="#2E1065" />
      <rect x="41" y="27" width="3" height="7" fill="#2E1065" />
      <rect x="14" y="29" width="28" height="2" fill="#1E0E45" />

      {/* ── SOLID MAHOGANY TABLE RIM ── */}
      <rect x="9" y="9" width="38" height="24" rx="2" fill="#451A03" stroke="#1E0E45" strokeWidth="0.8" />
      <rect x="10" y="10" width="36" height="22" rx="1" fill="#78350F" />
      <rect x="11" y="11" width="34" height="20" rx="1" fill="#92400E" />

      {/* ── GREEN FELT (KAPUK HIJAU MEJA GAPLE) ── */}
      <rect x="12" y="12" width="32" height="18" rx="1" fill="#065F46" stroke="#047857" strokeWidth="0.5" />
      <rect x="13" y="13" width="30" height="16" fill="#047857" />
      <rect x="14" y="14" width="28" height="14" fill="#059669" opacity="0.65" />

      {/* Golden Thread Inlay Border */}
      <rect x="14" y="14" width="28" height="14" fill="none" stroke="#FBBF24" strokeWidth="0.4" strokeDasharray="1 1" opacity="0.7" />

      {/* Mini Domino Tiles Placed on Table Center */}
      {/* Tile 1: 6-6 balak vertical */}
      <g transform="translate(23, 17)">
        <rect x="0" y="0" width="4" height="8" rx="0.4" fill="#FFFDF7" stroke="#334155" strokeWidth="0.3" />
        <line x1="0" y1="4" x2="4" y2="4" stroke="#DC2626" strokeWidth="0.3" />
        <circle cx="1.2" cy="1.5" r="0.35" fill="#DC2626" />
        <circle cx="2.8" cy="1.5" r="0.35" fill="#DC2626" />
        <circle cx="1.2" cy="2.5" r="0.35" fill="#DC2626" />
        <circle cx="2.8" cy="2.5" r="0.35" fill="#DC2626" />
        <circle cx="1.2" cy="5.5" r="0.35" fill="#DC2626" />
        <circle cx="2.8" cy="5.5" r="0.35" fill="#DC2626" />
        <circle cx="1.2" cy="6.5" r="0.35" fill="#DC2626" />
        <circle cx="2.8" cy="6.5" r="0.35" fill="#DC2626" />
      </g>
      {/* Tile 2: 6-3 horizontal connected */}
      <g transform="translate(28, 19)">
        <rect x="0" y="0" width="8" height="4" rx="0.4" fill="#FFFDF7" stroke="#334155" strokeWidth="0.3" />
        <line x1="4" y1="0" x2="4" y2="4" stroke="#DC2626" strokeWidth="0.3" />
        <circle cx="1.5" cy="1.2" r="0.35" fill="#DC2626" />
        <circle cx="1.5" cy="2.8" r="0.35" fill="#DC2626" />
        <circle cx="2.5" cy="2" r="0.35" fill="#DC2626" />
        <circle cx="5.5" cy="1.2" r="0.35" fill="#DC2626" />
        <circle cx="6.5" cy="2" r="0.35" fill="#DC2626" />
        <circle cx="7.5" cy="2.8" r="0.35" fill="#DC2626" />
      </g>
    </svg>
  );
};

// 8. UNDERGROUND 2-SEATER CHESS TABLE WITH 2 WOODEN CHAIRS
export const GbaUndergroundChessTable: React.FC<{
  x?: number;
  y?: number;
  className?: string;
  isHovered?: boolean;
  activeSeat?: 'left' | 'right' | null;
  onClick?: () => void;
  onSeatClick?: (seat: 'left' | 'right') => void;
}> = ({ x = 0, y = 0, className = '', isHovered = false, activeSeat = null, onClick, onSeatClick }) => {
  return (
    <svg
      x={x}
      y={y}
      width={44}
      height={36}
      viewBox="0 0 44 36"
      className={`select-none overflow-visible transition-all duration-200 cursor-pointer ${className} ${
        isHovered ? 'filter drop-shadow(0 0 5px #F59E0B)' : 'filter drop-shadow(0 3px 3px rgba(0,0,0,0.4))'
      }`}
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      onClick={onClick}
    >
      <title>♟️ Meja Catur 2 Kursi (Klik untuk duduk & bermain Catur)</title>

      {/* Ground Shadow */}
      <ellipse cx="22" cy="22" rx="19" ry="12" fill="#000000" opacity="0.45" />

      {/* ── SEAT LEFT (PEMAIN PUTIH) ── */}
      <g 
        className="cursor-pointer group/cleft"
        onClick={(e) => {
          if (onSeatClick) {
            e.stopPropagation();
            onSeatClick('left');
          }
        }}
      >
        <title>Kursi Kiri (Pemain Putih)</title>
        <rect x="2" y="11" width="6" height="14" rx="1" fill="#78350F" stroke="#451A03" strokeWidth="0.6" />
        <rect x="3" y="12" width="2" height="12" fill="#B45309" />
        {activeSeat === 'left' && (
          <rect x="2" y="11" width="6" height="14" fill="#F59E0B" opacity="0.4" />
        )}
      </g>

      {/* ── SEAT RIGHT (PEMAIN HITAM) ── */}
      <g 
        className="cursor-pointer group/cright"
        onClick={(e) => {
          if (onSeatClick) {
            e.stopPropagation();
            onSeatClick('right');
          }
        }}
      >
        <title>Kursi Kanan (Pemain Hitam)</title>
        <rect x="36" y="11" width="6" height="14" rx="1" fill="#78350F" stroke="#451A03" strokeWidth="0.6" />
        <rect x="37" y="12" width="2" height="12" fill="#B45309" />
        {activeSeat === 'right' && (
          <rect x="36" y="11" width="6" height="14" fill="#F59E0B" opacity="0.4" />
        )}
      </g>

      {/* ── SOLID TABLE BASE ── */}
      <rect x="19" y="24" width="6" height="8" fill="#2E1065" />
      <rect x="17" y="30" width="10" height="2" rx="1" fill="#1E0E45" />

      {/* ── MAHOGANY TABLE TOP (SQUARE) ── */}
      <rect x="11" y="7" width="22" height="22" rx="2" fill="#451A03" stroke="#1E0E45" strokeWidth="0.7" />
      <rect x="12" y="8" width="20" height="20" fill="#78350F" />
      <rect x="13" y="9" width="18" height="18" fill="#92400E" />

      {/* ── 8x8 CHESSBOARD PATTERN ── */}
      <rect x="14" y="10" width="16" height="16" fill="#F3E8D2" stroke="#451A03" strokeWidth="0.5" />
      {/* 8x8 alternating squares */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((row) =>
        [0, 1, 2, 3, 4, 5, 6, 7].map((col) => {
          const isDark = (row + col) % 2 === 1;
          return isDark ? (
            <rect
              key={`cb-${row}-${col}`}
              x={14 + col * 2}
              y={10 + row * 2}
              width={2}
              height={2}
              fill="#78350F"
            />
          ) : null;
        })
      )}

      {/* Mini Pixel Chess Pieces */}
      {/* White King / Queen on table */}
      <rect x="17" y="20.5" width="1.2" height="2.2" fill="#FFFFFF" />
      <rect x="21" y="20.5" width="1.2" height="2.2" fill="#FFFFFF" />
      {/* Black King / Queen on table */}
      <rect x="17" y="11.5" width="1.2" height="2.2" fill="#1E1B2E" />
      <rect x="21" y="11.5" width="1.2" height="2.2" fill="#1E1B2E" />
    </svg>
  );
};

// 9. UNDERGROUND MINING LADDER (Tangga Naik ke Gazebo Atas)
export const GbaUndergroundLadder: React.FC<{
  x?: number;
  y?: number;
  className?: string;
  isHovered?: boolean;
  onClick?: () => void;
}> = ({ x = 0, y = 0, className = '', isHovered = false, onClick }) => {
  return (
    <svg
      x={x}
      y={y}
      width={18}
      height={34}
      viewBox="0 0 18 34"
      className={`select-none overflow-visible transition-all duration-200 cursor-pointer ${className} ${
        isHovered ? 'filter drop-shadow(0 0 5px #F59E0B)' : ''
      }`}
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      onClick={onClick}
    >
      <title>🪜 Tangga Tambang (Klik untuk naik kembali ke Gazebo)</title>
      {/* Ceiling Hole Trim */}
      <rect x="1" y="0" width="16" height="3" fill="#090518" stroke="#6B21A8" strokeWidth="0.6" />
      <rect x="3" y="0" width="12" height="2" fill="#3B0764" />

      {/* Vertical Wooden Rails */}
      <rect x="3" y="2" width="2.5" height="30" fill="#78350F" stroke="#451A03" strokeWidth="0.5" />
      <rect x="12.5" y="2" width="2.5" height="30" fill="#78350F" stroke="#451A03" strokeWidth="0.5" />
      <rect x="3.5" y="2" width="1" height="30" fill="#B45309" />
      <rect x="13" y="2" width="1" height="30" fill="#B45309" />

      {/* Iron Rungs */}
      {[6, 11, 16, 21, 26].map((ry) => (
        <g key={`rung-${ry}`}>
          <rect x="4.5" y={ry} width="9" height="2" fill="#64748B" stroke="#1E293B" strokeWidth="0.4" />
          <rect x="5.5" y={ry + 0.3} width="7" height="0.8" fill="#CBD5E1" />
        </g>
      ))}

      {/* Up Arrow Pulsing Badge */}
      <g transform="translate(6, 14)">
        <polygon points="3,0 6,4 4,4 4,7 2,7 2,4 0,4" fill="#FBBF24" opacity="0.9">
          <animate attributeName="opacity" values="0.4;1;0.4" dur="1.2s" repeatCount="indefinite" />
          <animate attributeName="transform" type="translate" values="0,0; 0,-2; 0,0" dur="1.2s" repeatCount="indefinite" />
        </polygon>
      </g>
    </svg>
  );
};

// 10. UNDERGROUND MINER LANTERN (Lentera Besi Berkedip Hangat)
export const GbaUndergroundLantern: React.FC<{
  x?: number;
  y?: number;
}> = ({ x = 0, y = 0 }) => {
  return (
    <svg
      x={x}
      y={y}
      width={12}
      height={18}
      viewBox="0 0 12 18"
      className="select-none overflow-visible"
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
    >
      {/* Hanging Chain */}
      <line x1="6" y1="0" x2="6" y2="4" stroke="#475569" strokeWidth="0.8" strokeDasharray="1 1" />

      {/* Ambient Warm Flame Glow */}
      <circle cx="6" cy="10" r="7" fill="#F59E0B" opacity="0.25">
        <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.18;0.32;0.18" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* Iron Cap */}
      <rect x="3" y="4" width="6" height="2" fill="#1E293B" />
      <rect x="4" y="3" width="4" height="1" fill="#334155" />

      {/* Glass Body & Flame */}
      <rect x="3.5" y="6" width="5" height="6" fill="#FEF08A" opacity="0.85" />
      <rect x="4.5" y="7.5" width="3" height="3" fill="#F97316">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="0.8s" repeatCount="indefinite" />
      </rect>

      {/* Iron Cage Guard */}
      <rect x="3" y="6" width="6" height="6" fill="none" stroke="#1E293B" strokeWidth="0.6" />
      <line x1="6" y1="6" x2="6" y2="12" stroke="#1E293B" strokeWidth="0.5" />

      {/* Iron Base */}
      <rect x="3" y="12" width="6" height="2" fill="#1E293B" />
    </svg>
  );
};


