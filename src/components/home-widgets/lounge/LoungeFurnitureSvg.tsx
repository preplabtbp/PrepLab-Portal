import React from 'react';

/**
 * High-Definition 2.5D Vector SVG Furniture Models for PrepLab Enterprise Lounge
 * Crafted with realistic perspective, wood grain gradients, metallic finishes,
 * cushions, shadows, and authentic mining camp / executive lounge aesthetic.
 */

// 1. TEAK PARK BENCH (Bangku Kayu Merokok K3)
export const TeakParkBench: React.FC<{
  facing?: 'left' | 'right';
  className?: string;
  isHovered?: boolean;
}> = ({ facing = 'right', className = '', isHovered = false }) => {
  return (
    <svg
      viewBox="0 0 130 80"
      className={`select-none overflow-visible transition-all duration-200 ${className} ${
        isHovered ? 'filter drop-shadow(0 0 8px rgba(245, 158, 11, 0.7))' : 'filter drop-shadow(0 4px 6px rgba(0,0,0,0.4))'
      }`}
      style={{
        transform: facing === 'left' ? 'scaleX(-1)' : 'none',
        transformOrigin: 'center'
      }}
    >
      <defs>
        {/* Wood Slat Gradient */}
        <linearGradient id="slatWoodGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="35%" stopColor="#B45309" />
          <stop offset="70%" stopColor="#92400E" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>

        {/* Cast Iron Frame Gradient */}
        <linearGradient id="castIronGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="50%" stopColor="#1F2937" />
          <stop offset="100%" stopColor="#111827" />
        </linearGradient>

        {/* Leather Cushion Gradient */}
        <linearGradient id="cushionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#92400E" />
          <stop offset="50%" stopColor="#78350F" />
          <stop offset="100%" stopColor="#451A03" />
        </linearGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="65" cy="74" rx="58" ry="4" fill="#000000" opacity="0.45" />

      {/* Backrest Slats (Angled in 2.5D perspective) */}
      <g id="backrestSlats">
        {/* Slat 1 (Top) */}
        <path d="M 16 16 L 114 16 L 112 22 L 18 22 Z" fill="url(#slatWoodGrad)" stroke="#451A03" strokeWidth="0.8" />
        <line x1="17" y1="17" x2="113" y2="17" stroke="#FDE68A" strokeWidth="0.6" opacity="0.6" />

        {/* Slat 2 */}
        <path d="M 18 25 L 112 25 L 110 31 L 20 31 Z" fill="url(#slatWoodGrad)" stroke="#451A03" strokeWidth="0.8" />
        <line x1="19" y1="26" x2="111" y2="26" stroke="#FDE68A" strokeWidth="0.6" opacity="0.6" />

        {/* Slat 3 */}
        <path d="M 20 34 L 110 34 L 108 40 L 22 40 Z" fill="url(#slatWoodGrad)" stroke="#451A03" strokeWidth="0.8" />
        <line x1="21" y1="35" x2="109" y2="35" stroke="#FDE68A" strokeWidth="0.6" opacity="0.6" />
      </g>

      {/* Cast Iron Back Uprights */}
      <path d="M 26 14 L 28 44 L 25 44 Z" fill="url(#castIronGrad)" />
      <path d="M 104 14 L 102 44 L 105 44 Z" fill="url(#castIronGrad)" />

      {/* Seat Cushion Surface (Horizontal in 2.5D perspective at y=40, exactly 34px from floor y=74) */}
      <g id="seatSurface">
        {/* Padded Seat Base */}
        <path d="M 14 40 L 116 40 L 120 54 L 10 54 Z" fill="url(#cushionGrad)" stroke="#271003" strokeWidth="1" />
        {/* Front Edge Lip of Seat */}
        <path d="M 10 54 L 120 54 L 119 58 L 11 58 Z" fill="#451A03" />
        <line x1="12" y1="54.8" x2="118" y2="54.8" stroke="#FDE68A" strokeWidth="0.8" opacity="0.4" />
        {/* Tufting / Stitching Lines */}
        <line x1="42" y1="41" x2="40" y2="54" stroke="#271003" strokeWidth="1.2" opacity="0.5" />
        <line x1="65" y1="41" x2="65" y2="54" stroke="#271003" strokeWidth="1.2" opacity="0.5" />
        <line x1="88" y1="41" x2="90" y2="54" stroke="#271003" strokeWidth="1.2" opacity="0.5" />
      </g>

      {/* Left Cast-Iron Armrest & Front Leg */}
      <g id="leftIronFrame">
        {/* Curved Armrest */}
        <path d="M 14 28 Q 8 34 12 46 L 12 50 Q 7 46 9 34 Z" fill="url(#castIronGrad)" />
        {/* Armrest Cap / Grip */}
        <rect x="8" y="34" width="6" height="13" rx="2" fill="#D97706" stroke="#451A03" strokeWidth="0.6" />
        {/* Front Leg */}
        <path d="M 11 54 L 10 72 L 14 73 L 15 54 Z" fill="url(#castIronGrad)" />
        <circle cx="12" cy="73" r="2.5" fill="#1F2937" />
        {/* Rear Leg (Diagonal) */}
        <path d="M 24 44 L 17 71 L 21 71 L 27 44 Z" fill="#111827" />
      </g>

      {/* Right Cast-Iron Armrest & Front Leg */}
      <g id="rightIronFrame">
        {/* Curved Armrest */}
        <path d="M 116 28 Q 122 34 118 46 L 118 50 Q 123 46 121 34 Z" fill="url(#castIronGrad)" />
        {/* Armrest Cap */}
        <rect x="116" y="34" width="6" height="13" rx="2" fill="#D97706" stroke="#451A03" strokeWidth="0.6" />
        {/* Front Leg */}
        <path d="M 119 54 L 120 72 L 116 73 L 115 54 Z" fill="url(#castIronGrad)" />
        <circle cx="118" cy="73" r="2.5" fill="#1F2937" />
        {/* Rear Leg (Diagonal) */}
        <path d="M 106 44 L 113 71 L 109 71 L 103 44 Z" fill="#111827" />
      </g>

      {/* Structural Cross Stretcher Bar below seat */}
      <path d="M 16 63 L 114 63 L 114 66 L 16 66 Z" fill="#111827" />
    </svg>
  );
};

// 2. STANDING STAINLESS STEEL ASHTRAY (Asbak Berdiri K3)
export const StandingAshtray: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg viewBox="0 0 50 110" className={`select-none overflow-visible ${className}`}>
      <defs>
        {/* Stainless Steel Pole Gradient */}
        <linearGradient id="ssPoleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="25%" stopColor="#CBD5E1" />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset="75%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>

        {/* Chrome Bowl Gradient */}
        <linearGradient id="chromeBowlGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="40%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="25" cy="106" rx="16" ry="3.5" fill="#000000" opacity="0.45" />

      {/* Dynamic Animated Rising Smoke Plumes */}
      <g className="pointer-events-none">
        <g className="smoke-asbak-a" transform="translate(23, 10)">
          <path d="M 2 24 Q -2 16 3 8 Q 8 2 1 -6 Q -4 -14 2 -22" fill="none" stroke="#E2E8F0" strokeWidth="2.2" strokeLinecap="round" opacity="0.65" />
          <circle cx="1" cy="-4" r="2.5" fill="#F8FAFC" opacity="0.4" />
          <circle cx="2" cy="-16" r="3.2" fill="#F8FAFC" opacity="0.3" />
        </g>
        <g className="smoke-asbak-b" transform="translate(27, 10)">
          <path d="M -1 24 Q 4 15 -1 7 Q -5 0 2 -8 Q 6 -16 -1 -24" fill="none" stroke="#CBD5E1" strokeWidth="2.0" strokeLinecap="round" opacity="0.55" />
          <circle cx="1" cy="-7" r="2.8" fill="#F8FAFC" opacity="0.35" />
        </g>
      </g>

      {/* Heavy Steel Base Plate */}
      <ellipse cx="25" cy="103" rx="14" ry="4" fill="url(#ssPoleGrad)" stroke="#475569" strokeWidth="0.8" />
      <ellipse cx="25" cy="101" rx="12" ry="3" fill="#64748B" />

      {/* Vertical Stanchion Column */}
      <rect x="22.5" y="38" width="5" height="64" fill="url(#ssPoleGrad)" stroke="#475569" strokeWidth="0.5" />
      <line x1="24.5" y1="38" x2="24.5" y2="102" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.8" />

      {/* Mid Accent Ring */}
      <ellipse cx="25" cy="72" rx="4.5" ry="1.5" fill="#334155" />

      {/* Collector Bowl / Funnel Top */}
      <path d="M 13 36 L 37 36 L 29 48 L 21 48 Z" fill="url(#chromeBowlGrad)" stroke="#475569" strokeWidth="0.8" />

      {/* Ashtray Top Rim & Sand Basin */}
      <ellipse cx="25" cy="35" rx="13" ry="4.5" fill="url(#chromeBowlGrad)" stroke="#334155" strokeWidth="0.8" />
      {/* Inner Black Sand / Ash Basin */}
      <ellipse cx="25" cy="35" rx="10.5" ry="3.2" fill="#1C1917" />

      {/* Smoldering Cigarette Stubs with Glowing Embers */}
      <line x1="21" y1="34" x2="26" y2="36" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="26" cy="36" r="1.2" fill="#EF4444" className="animate-pulse" filter="drop-shadow(0 0 2px #EF4444)" />
      <circle cx="26" cy="36" r="0.6" fill="#FDE047" />

      <line x1="27" y1="33" x2="23" y2="35" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="23" cy="35" r="1" fill="#F97316" />

      {/* K3 Badge on Stem */}
      <rect x="21" y="52" width="8" height="6" rx="1" fill="#15803D" stroke="#FFFFFF" strokeWidth="0.4" />
      <text x="25" y="56.5" fontSize="3.2" fontWeight="bold" textAnchor="middle" fill="#FFFFFF" fontFamily="sans-serif">K3</text>
    </svg>
  );
};

// 3. ROUND COFFEE TABLE WITH MUGS & FRIED BANANA SNACKS
export const RoundCoffeeTable: React.FC<{ className?: string; isHovered?: boolean }> = ({ className = '', isHovered = false }) => {
  return (
    <svg 
      viewBox="0 0 160 100" 
      className={`select-none overflow-visible transition-all duration-200 ${className} ${
        isHovered ? 'filter drop-shadow(0 0 12px rgba(16, 185, 129, 0.7))' : 'filter drop-shadow(0 6px 10px rgba(0,0,0,0.45))'
      }`}
    >
      <defs>
        {/* Solid Teak Top Gradient */}
        <radialGradient id="teakTableGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#B45309" />
          <stop offset="50%" stopColor="#92400E" />
          <stop offset="85%" stopColor="#78350F" />
          <stop offset="100%" stopColor="#451A03" />
        </radialGradient>

        {/* Polished Rim Gradient */}
        <linearGradient id="tableRimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="50%" stopColor="#78350F" />
          <stop offset="100%" stopColor="#271003" />
        </linearGradient>

        {/* Banana Fritter (Pisang Goreng) Gradient */}
        <linearGradient id="pisangGorengGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="80" cy="94" rx="68" ry="6" fill="#000000" opacity="0.4" />

      {/* Sturdy Quad Fluted Pedestal Base */}
      <g id="tablePedestal">
        <path d="M 74 54 L 86 54 L 92 88 L 68 88 Z" fill="#1F2937" stroke="#111827" strokeWidth="1" />
        {/* Fluting highlights */}
        <line x1="77" y1="55" x2="73" y2="87" stroke="#374151" strokeWidth="1" />
        <line x1="80" y1="55" x2="80" y2="87" stroke="#4B5563" strokeWidth="1.5" />
        <line x1="83" y1="55" x2="87" y2="87" stroke="#374151" strokeWidth="1" />

        {/* Heavy Flared Base with Brass Feet */}
        <ellipse cx="80" cy="88" rx="28" ry="6" fill="#111827" />
        <ellipse cx="80" cy="87" rx="26" ry="5" fill="#1F2937" />
        {/* Brass Ring */}
        <ellipse cx="80" cy="86" rx="20" ry="3.5" fill="#CA8A04" />
      </g>

      {/* Tabletop Edge / Apron (Perspective 2.5D Rim) */}
      <path d="M 12 40 C 12 56, 148 56, 148 40 L 148 48 C 148 64, 12 64, 12 48 Z" fill="url(#tableRimGrad)" stroke="#271003" strokeWidth="1" />

      {/* Main Oval Tabletop Surface */}
      <ellipse cx="80" cy="40" rx="68" ry="20" fill="url(#teakTableGrad)" stroke="#451A03" strokeWidth="1.2" />

      {/* Beveled Edge Highlight Ring */}
      <ellipse cx="80" cy="39.5" rx="66.5" ry="19" fill="none" stroke="#FDE68A" strokeWidth="0.8" opacity="0.45" />

      {/* Teak Wood Grain Rings */}
      <ellipse cx="78" cy="40" rx="48" ry="13.5" fill="none" stroke="#78350F" strokeWidth="1" opacity="0.35" />
      <ellipse cx="82" cy="40" rx="28" ry="8" fill="none" stroke="#B45309" strokeWidth="0.8" opacity="0.4" />

      {/* TABLE ITEMS: MUGS, PLATE WITH PISANG GORENG & TEA CANISTER */}
      <g id="tableItems">
        {/* Porcelain Serving Plate with Pisang Goreng (Banana Fritters) */}
        <g transform="translate(80, 41)">
          {/* Porcelain Plate */}
          <ellipse cx="0" cy="0" rx="24" ry="8.5" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="0.8" />
          <ellipse cx="0" cy="0" rx="21" ry="7" fill="#F1F5F9" />

          {/* Golden Pisang Goreng Pieces */}
          {/* Piece 1 */}
          <path d="M -16 -1 Q -10 -5 2 -3 Q 8 -1 4 3 Q -6 5 -16 -1 Z" fill="url(#pisangGorengGrad)" stroke="#78350F" strokeWidth="0.6" />
          <circle cx="-6" cy="0" r="0.8" fill="#FEF08A" />
          <circle cx="-2" cy="-2" r="0.6" fill="#FEF08A" />

          {/* Piece 2 */}
          <path d="M -4 1 Q 6 -3 15 0 Q 18 3 12 5 Q 2 6 -4 1 Z" fill="url(#pisangGorengGrad)" stroke="#78350F" strokeWidth="0.6" />
          <circle cx="8" cy="1" r="0.7" fill="#FEF08A" />

          {/* Piece 3 (Top Crispy) */}
          <path d="M -9 -3 Q -1 -7 8 -4 Q 10 -1 5 1 Q -4 0 -9 -3 Z" fill="#F59E0B" stroke="#92400E" strokeWidth="0.5" />
          <circle cx="0" cy="-4" r="0.6" fill="#FEF08A" />
        </g>

        {/* PrepLab Ceramic Coffee Mug 1 (Left) with Animated Steam */}
        <g transform="translate(44, 34)">
          {/* Animated Steam */}
          <g className="steam-coffee pointer-events-none">
            <path d="M 0 -3 Q -3 -8 1 -13 Q 5 -18 0 -22" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
            <path d="M 4 -2 Q 7 -7 3 -12 Q -1 -17 3 -21" fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" opacity="0.5" />
          </g>

          {/* Mug Body (Teal PrepLab Ceramic) */}
          <rect x="-6" y="-3" width="12" height="14" rx="2.5" fill="#0D9488" stroke="#042F2E" strokeWidth="1" />
          {/* Mug Handle */}
          <path d="M -6 0 Q -11 3 -6 8" fill="none" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" />
          {/* Mug Rim & Hot Coffee Liquid */}
          <ellipse cx="0" cy="-3" rx="6" ry="2.2" fill="#042F2E" />
          <ellipse cx="0" cy="-3" rx="5" ry="1.6" fill="#3B1502" />
        </g>

        {/* Ceramic Coffee Mug 2 (Right) with Animated Steam */}
        <g transform="translate(116, 35)">
          <g className="steam-coffee pointer-events-none">
            <path d="M 0 -3 Q 3 -8 -1 -13 Q -5 -18 0 -22" fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
          </g>
          {/* Mug Body (Amber Stoneware) */}
          <rect x="-6" y="-3" width="12" height="14" rx="2.5" fill="#D97706" stroke="#78350F" strokeWidth="1" />
          <path d="M 6 0 Q 11 3 6 8" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="0" cy="-3" rx="6" ry="2.2" fill="#78350F" />
          <ellipse cx="0" cy="-3" rx="5" ry="1.6" fill="#3B1502" />
        </g>
      </g>
    </svg>
  );
};

// 4. SCANDINAVIAN PADDED WOODEN CHAIR (Kursi Ngopi)
export const WoodenDiningChair: React.FC<{
  facing?: 'left' | 'right';
  className?: string;
  isHovered?: boolean;
}> = ({ facing = 'right', className = '', isHovered = false }) => {
  return (
    <svg
      viewBox="0 0 70 80"
      className={`select-none overflow-visible transition-all duration-200 ${className} ${
        isHovered ? 'filter drop-shadow(0 0 8px rgba(16, 185, 129, 0.7))' : 'filter drop-shadow(0 4px 6px rgba(0,0,0,0.35))'
      }`}
      style={{
        transform: facing === 'left' ? 'scaleX(-1)' : 'none',
        transformOrigin: 'center'
      }}
    >
      <ellipse cx="35" cy="74" rx="26" ry="3.5" fill="#000000" opacity="0.35" />

      {/* Curved Bentwood Backrest */}
      <path d="M 14 14 Q 35 8 56 14 L 56 26 Q 35 20 14 26 Z" fill="#92400E" stroke="#451A03" strokeWidth="1" />
      <path d="M 16 15 Q 35 10 54 15 L 54 18 Q 35 13 16 18 Z" fill="#D97706" opacity="0.5" />

      {/* Backrest Spindles / Struts */}
      <path d="M 24 25 L 26 42 L 24 42 Z" fill="#78350F" />
      <path d="M 35 23 L 35 42 L 33 42 Z" fill="#78350F" />
      <path d="M 46 25 L 44 42 L 46 42 Z" fill="#78350F" />

      {/* Padded Seat Cushion (Dark Forest Green / Emerald Leather at y=40, exactly 34px from floor y=74) */}
      <ellipse cx="35" cy="42" rx="24" ry="8.5" fill="#065F46" stroke="#047857" strokeWidth="1" />
      <ellipse cx="35" cy="41" rx="22" ry="7" fill="#047857" />
      {/* Front Seat Lip */}
      <path d="M 11 42 C 11 50, 59 50, 59 42 L 59 46 C 59 54, 11 54, 11 46 Z" fill="#064E3B" />

      {/* Tapered Wooden Legs with Brass Ferrules */}
      {/* Front Left Leg */}
      <path d="M 17 48 L 13 72 L 17 72 L 21 48 Z" fill="#92400E" />
      <rect x="13" y="69" width="4" height="3" fill="#EAB308" />

      {/* Front Right Leg */}
      <path d="M 53 48 L 57 72 L 53 72 L 49 48 Z" fill="#92400E" />
      <rect x="53" y="69" width="4" height="3" fill="#EAB308" />

      {/* Rear Left Leg */}
      <path d="M 23 44 L 19 69 L 21 69 L 25 44 Z" fill="#451A03" />
      {/* Rear Right Leg */}
      <path d="M 47 44 L 51 69 L 49 69 L 45 44 Z" fill="#451A03" />
    </svg>
  );
};

// 5. MODULAR EXECUTIVE LOUNGE SOFA (Sofa Rehat Lab)
export const ModularLoungeSofa: React.FC<{ className?: string; isHovered?: boolean }> = ({ className = '', isHovered = false }) => {
  return (
    <svg
      viewBox="0 0 200 80"
      className={`select-none overflow-visible transition-all duration-200 ${className} ${
        isHovered ? 'filter drop-shadow(0 0 12px rgba(6, 182, 212, 0.75))' : 'filter drop-shadow(0 8px 14px rgba(0,0,0,0.5))'
      }`}
    >
      <defs>
        {/* Petrol Teal Leather Gradient */}
        <linearGradient id="sofaLeatherGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0891B2" />
          <stop offset="40%" stopColor="#0E7490" />
          <stop offset="80%" stopColor="#155E75" />
          <stop offset="100%" stopColor="#164E63" />
        </linearGradient>

        {/* Cushion Surface Gradient */}
        <linearGradient id="sofaCushionGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0E7490" />
          <stop offset="60%" stopColor="#155E75" />
          <stop offset="100%" stopColor="#164E63" />
        </linearGradient>

        {/* Brass Legs Gradient */}
        <linearGradient id="brassLegGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#EAB308" />
          <stop offset="50%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
      </defs>

      {/* Ground Shadow */}
      <ellipse cx="100" cy="74" rx="90" ry="4.5" fill="#000000" opacity="0.45" />

      {/* Tapered Brass Metal Legs */}
      <polygon points="30,62 26,73 29,73 34,62" fill="url(#brassLegGrad)" />
      <polygon points="170,62 174,73 171,73 166,62" fill="url(#brassLegGrad)" />
      <polygon points="100,62 100,73 102,73 102,62" fill="url(#brassLegGrad)" />

      {/* Main Sofa Base Platform */}
      <rect x="20" y="54" width="160" height="9" rx="2" fill="#083344" stroke="#042F2E" strokeWidth="1" />

      {/* Sofa Backrest (Tufted Panels with Depth) */}
      <g id="sofaBackrest">
        {/* Back Frame Structure */}
        <path d="M 24 16 L 176 16 Q 180 16 178 44 L 22 44 Q 20 16 24 16 Z" fill="url(#sofaLeatherGrad)" stroke="#083344" strokeWidth="1.2" />

        {/* Vertical Channel Tufting Seams */}
        <line x1="55" y1="17" x2="53" y2="43" stroke="#083344" strokeWidth="1.8" />
        <line x1="56" y1="17" x2="54" y2="43" stroke="#38BDF8" strokeWidth="0.8" opacity="0.5" />

        <line x1="85" y1="17" x2="84" y2="43" stroke="#083344" strokeWidth="1.8" />
        <line x1="86" y1="17" x2="85" y2="43" stroke="#38BDF8" strokeWidth="0.8" opacity="0.5" />

        <line x1="115" y1="17" x2="116" y2="43" stroke="#083344" strokeWidth="1.8" />
        <line x1="116" y1="17" x2="117" y2="43" stroke="#38BDF8" strokeWidth="0.8" opacity="0.5" />

        <line x1="145" y1="17" x2="147" y2="43" stroke="#083344" strokeWidth="1.8" />
        <line x1="146" y1="17" x2="148" y2="43" stroke="#38BDF8" strokeWidth="0.8" opacity="0.5" />
      </g>

      {/* Deep Seat Cushions (3 Modular Padded Blocks at y=40, exactly 34px from floor y=74) */}
      <g id="seatCushions">
        {/* Cushion 1 (Left) */}
        <path d="M 30 40 L 74 40 L 72 55 L 26 55 Z" fill="url(#sofaCushionGrad)" stroke="#083344" strokeWidth="1" />
        <path d="M 26 55 L 72 55 L 72 58 L 26 58 Z" fill="#083344" />
        <line x1="28" y1="41" x2="72" y2="41" stroke="#38BDF8" strokeWidth="0.8" opacity="0.5" />

        {/* Cushion 2 (Center) */}
        <path d="M 74 40 L 126 40 L 126 55 L 72 55 Z" fill="url(#sofaCushionGrad)" stroke="#083344" strokeWidth="1" />
        <path d="M 72 55 L 126 55 L 126 58 L 72 58 Z" fill="#083344" />
        <line x1="74" y1="41" x2="124" y2="41" stroke="#38BDF8" strokeWidth="0.8" opacity="0.5" />

        {/* Cushion 3 (Right) */}
        <path d="M 126 40 L 170 40 L 174 55 L 126 55 Z" fill="url(#sofaCushionGrad)" stroke="#083344" strokeWidth="1" />
        <path d="M 126 55 L 174 55 L 174 58 L 126 58 Z" fill="#083344" />
        <line x1="128" y1="41" x2="170" y2="41" stroke="#38BDF8" strokeWidth="0.8" opacity="0.5" />
      </g>

      {/* Left Thick Rolled Armrest */}
      <g id="leftArmrest">
        <path d="M 16 32 Q 14 26 24 26 L 29 26 Q 33 26 32 55 L 19 55 Q 15 55 16 32 Z" fill="url(#sofaLeatherGrad)" stroke="#083344" strokeWidth="1.2" />
        <ellipse cx="24" cy="30" rx="5" ry="2.8" fill="#38BDF8" opacity="0.35" />
      </g>

      {/* Right Thick Rolled Armrest */}
      <g id="rightArmrest">
        <path d="M 184 32 Q 186 26 176 26 L 171 26 Q 167 26 168 55 L 181 55 Q 185 55 184 32 Z" fill="url(#sofaLeatherGrad)" stroke="#083344" strokeWidth="1.2" />
        <ellipse cx="176" cy="30" rx="5" ry="2.8" fill="#38BDF8" opacity="0.35" />
      </g>

      {/* Plush Throw Pillows */}
      {/* Yellow Mustard Accent Pillow */}
      <g transform="translate(38, 38) rotate(-14)">
        <rect x="-7" y="-8" width="14" height="16" rx="3" fill="#EAB308" stroke="#CA8A04" strokeWidth="0.8" />
        <line x1="0" y1="-6" x2="0" y2="6" stroke="#FEF08A" strokeWidth="0.8" opacity="0.7" />
      </g>

      {/* Slate Grey Pillow (Right) */}
      <g transform="translate(162, 38) rotate(14)">
        <rect x="-7" y="-8" width="14" height="16" rx="3" fill="#64748B" stroke="#475569" strokeWidth="0.8" />
      </g>
    </svg>
  );
};

// 6. BEVERAGE REFRESHMENT BAR COUNTER (Bar Minuman & Dispenser)
export const BeverageBarCounter: React.FC<{ className?: string; isHovered?: boolean }> = ({ className = '', isHovered = false }) => {
  return (
    <svg 
      viewBox="0 0 120 90" 
      className={`select-none overflow-visible transition-all duration-200 ${className} ${
        isHovered ? 'filter drop-shadow(0 0 10px rgba(168, 85, 247, 0.7))' : 'filter drop-shadow(0 6px 8px rgba(0,0,0,0.4))'
      }`}
    >
      <defs>
        {/* Quartz Countertop Gradient */}
        <linearGradient id="quartzTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>

        {/* Stainless Machine Gradient */}
        <linearGradient id="dispenserSsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#64748B" />
          <stop offset="30%" stopColor="#CBD5E1" />
          <stop offset="60%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>

      <ellipse cx="60" cy="86" rx="52" ry="4" fill="#000000" opacity="0.4" />

      {/* Slatted Oak Cabinet Base */}
      <rect x="14" y="46" width="92" height="38" rx="2" fill="#581C87" stroke="#3B0764" strokeWidth="1" />
      {/* Slat Lines on Cabinet */}
      <line x1="28" y1="47" x2="28" y2="83" stroke="#3B0764" strokeWidth="1.2" />
      <line x1="42" y1="47" x2="42" y2="83" stroke="#3B0764" strokeWidth="1.2" />
      <line x1="56" y1="47" x2="56" y2="83" stroke="#3B0764" strokeWidth="1.2" />
      <line x1="70" y1="47" x2="70" y2="83" stroke="#3B0764" strokeWidth="1.2" />
      <line x1="84" y1="47" x2="84" y2="83" stroke="#3B0764" strokeWidth="1.2" />
      <line x1="98" y1="47" x2="98" y2="83" stroke="#3B0764" strokeWidth="1.2" />
      {/* Brass Kickplate */}
      <rect x="14" y="81" width="92" height="4" fill="#CA8A04" />

      {/* Quartz Countertop with Beveled Front Edge */}
      <path d="M 10 40 L 110 40 L 114 47 L 6 47 Z" fill="url(#quartzTopGrad)" stroke="#94A3B8" strokeWidth="0.8" />
      <path d="M 6 47 L 114 47 L 114 50 L 6 50 Z" fill="#CBD5E1" />

      {/* ITEMS ON COUNTERTOP: WATER DISPENSER, DRIPPER, GLASS CARAFE */}
      {/* Commercial Stainless Water Dispenser Unit */}
      <g transform="translate(32, 14)">
        {/* Machine Main Body */}
        <rect x="-10" y="0" width="20" height="27" rx="2" fill="url(#dispenserSsGrad)" stroke="#334155" strokeWidth="0.8" />
        {/* Top Dispenser Cap */}
        <rect x="-9" y="1" width="18" height="4" rx="1" fill="#1E293B" />
        {/* Digital Temp Display (95°C) */}
        <rect x="-6" y="7" width="12" height="4" rx="0.5" fill="#0F172A" />
        <text x="0" y="10.2" fontSize="2.8" fontWeight="bold" textAnchor="middle" fill="#22C55E" fontFamily="monospace">95°C</text>
        {/* Hot / Cold Indicator LEDs */}
        <circle cx="-3" cy="13" r="0.9" fill="#EF4444" className="animate-pulse" />
        <circle cx="3" cy="13" r="0.9" fill="#38BDF8" />
        {/* Faucet Levers (Red & Blue) */}
        <rect x="-5" y="15" width="3" height="4" rx="0.5" fill="#EF4444" />
        <rect x="2" y="15" width="3" height="4" rx="0.5" fill="#0284C7" />
        {/* Drip Tray Grill */}
        <rect x="-8" y="23" width="16" height="3" fill="#1E293B" />
      </g>

      {/* Glass Coffee Carafe & Dripper */}
      <g transform="translate(68, 26)">
        <path d="M -5 14 L 5 14 L 7 5 L -7 5 Z" fill="#451A03" opacity="0.85" stroke="#CBD5E1" strokeWidth="0.6" />
        <path d="M -6 5 L 6 5 L 8 -4 L -8 -4 Z" fill="#F8FAFC" stroke="#64748B" strokeWidth="0.6" />
        <path d="M 6 8 Q 11 10 6 13" fill="none" stroke="#64748B" strokeWidth="1.4" />
      </g>

      {/* Stacked Clean Mugs */}
      <g transform="translate(94, 34)">
        <rect x="-4" y="2" width="8" height="6" rx="1" fill="#0D9488" stroke="#042F2E" strokeWidth="0.6" />
        <rect x="-4" y="-3" width="8" height="6" rx="1" fill="#D97706" stroke="#78350F" strokeWidth="0.6" />
      </g>
    </svg>
  );
};
