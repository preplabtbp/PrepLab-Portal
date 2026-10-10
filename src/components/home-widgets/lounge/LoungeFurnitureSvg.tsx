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
