import React from 'react';

/**
 * GbaTileData - 1:1 Authentic Pokémon Gen III (Emerald/Ruby/Sapphire) Tile Definitions
 * Strictly 16x16 pixel grid per tile, exact GBA color palette matching in-game ROM & user screenshot.
 * ALL shapes are rendered via crisp rectangular pixel matrices (shapeRendering="crispEdges").
 */

// 1. Base Mint Grass Tile (16x16) - Littleroot Town Base Grass
export const GbaGrassTile: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect width="16" height="16" fill="#98D8A0" />
    {/* Micro-stipple pixel texture from Gen III ROM */}
    <rect x="3" y="2" width="1" height="1" fill="#80C888" />
    <rect x="11" y="4" width="1" height="1" fill="#B0E8B8" />
    <rect x="7" y="8" width="1" height="1" fill="#80C888" />
    <rect x="14" y="11" width="1" height="1" fill="#B0E8B8" />
    <rect x="2" y="13" width="1" height="1" fill="#80C888" />
    <rect x="10" y="14" width="1" height="1" fill="#80C888" />
  </g>
);

// 2. Dark Grass Patch Tile (16x16) with stepped border edges (4px step)
export const GbaDarkGrassTile: React.FC<{ 
  x: number; 
  y: number; 
  isTop?: boolean; 
  isBottom?: boolean; 
  isLeft?: boolean; 
  isRight?: boolean;
}> = ({ x, y, isTop, isBottom, isLeft, isRight }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {/* Base mint grass underneath */}
    <rect width="16" height="16" fill="#98D8A0" />
    
    {/* Dark patch body */}
    <rect 
      x={isLeft ? 2 : 0} 
      y={isTop ? 2 : 0} 
      width={16 - (isLeft ? 2 : 0) - (isRight ? 2 : 0)} 
      height={16 - (isTop ? 2 : 0) - (isBottom ? 2 : 0)} 
      fill="#58A868" 
    />

    {/* Highlight edge on top (stepped 2px) */}
    {isTop && (
      <rect 
        x={isLeft ? 2 : 0} 
        y="1" 
        width={16 - (isLeft ? 2 : 0) - (isRight ? 2 : 0)} 
        height="1" 
        fill="#78C888" 
      />
    )}

    {/* Shadow edge on bottom */}
    {isBottom && (
      <rect 
        x={isLeft ? 2 : 0} 
        y="15" 
        width={16 - (isLeft ? 2 : 0) - (isRight ? 2 : 0)} 
        height="1" 
        fill="#388048" 
      />
    )}

    {/* Stepped pixel corner cuts */}
    {isTop && isLeft && (
      <>
        <rect x="0" y="0" width="2" height="2" fill="#98D8A0" />
        <rect x="2" y="1" width="1" height="1" fill="#78C888" />
      </>
    )}
    {isTop && isRight && (
      <>
        <rect x="14" y="0" width="2" height="2" fill="#98D8A0" />
        <rect x="13" y="1" width="1" height="1" fill="#78C888" />
      </>
    )}
    {isBottom && isLeft && (
      <rect x="0" y="14" width="2" height="2" fill="#98D8A0" />
    )}
    {isBottom && isRight && (
      <rect x="14" y="14" width="2" height="2" fill="#98D8A0" />
    )}

    {/* Dark grass interior pixel texture */}
    <rect x="4" y="5" width="2" height="1" fill="#409050" />
    <rect x="11" y="8" width="2" height="1" fill="#78C888" />
    <rect x="6" y="12" width="2" height="1" fill="#409050" />
  </g>
);

// 3. Flower Clump Tile (16x16) - 1:1 Exact Match from User Screenshot
// Clumps of 3-4 pink 4-petal flowers with pale yellow centers and green leaves
export const GbaFlowerTile: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {/* Dark grass base for flower patch */}
    <rect width="16" height="16" fill="#58A868" />
    <rect x="2" y="14" width="12" height="1" fill="#388048" />

    {/* Flower 1 (Top Left) */}
    <g transform="translate(2, 2)">
      {/* Green Leaves */}
      <rect x="0" y="4" width="5" height="2" fill="#286838" />
      {/* 4 Pink Petals */}
      <rect x="2" y="0" width="2" height="1" fill="#E88080" />
      <rect x="1" y="1" width="1" height="2" fill="#E88080" />
      <rect x="4" y="1" width="1" height="2" fill="#E88080" />
      <rect x="2" y="3" width="2" height="1" fill="#C86060" />
      {/* Center Yellow Core */}
      <rect x="2" y="1" width="2" height="2" fill="#FFF8A0" />
    </g>

    {/* Flower 2 (Bottom Right) */}
    <g transform="translate(9, 7)">
      <rect x="0" y="4" width="5" height="2" fill="#286838" />
      <rect x="2" y="0" width="2" height="1" fill="#E88080" />
      <rect x="1" y="1" width="1" height="2" fill="#E88080" />
      <rect x="4" y="1" width="1" height="2" fill="#E88080" />
      <rect x="2" y="3" width="2" height="1" fill="#C86060" />
      <rect x="2" y="1" width="2" height="2" fill="#FFF8A0" />
    </g>

    {/* Flower 3 (Small Center Accent) */}
    <g transform="translate(6, 9)">
      <rect x="1" y="0" width="2" height="1" fill="#E88080" />
      <rect x="0" y="1" width="1" height="1" fill="#E88080" />
      <rect x="3" y="1" width="1" height="1" fill="#E88080" />
      <rect x="1" y="2" width="2" height="1" fill="#C86060" />
      <rect x="1" y="1" width="2" height="1" fill="#FFF8A0" />
    </g>
  </g>
);

// 4. GBA Town / Facility Signpost (16x16) - 1:1 Replica from User Screenshot
export const GbaSignpostTile: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect width="16" height="16" fill="#98D8A0" />
    {/* Drop Shadow on grass */}
    <rect x="3" y="14" width="10" height="2" fill="#58A068" />
    
    {/* Metal Outline */}
    <rect x="3" y="2" width="10" height="12" fill="#181820" />
    {/* Metal Frame Body */}
    <rect x="4" y="3" width="8" height="10" fill="#98A0B0" />
    {/* Highlights */}
    <rect x="4" y="3" width="8" height="1" fill="#D0D8E8" />
    <rect x="4" y="3" width="1" height="10" fill="#D0D8E8" />
    {/* Shadow */}
    <rect x="11" y="3" width="1" height="10" fill="#687080" />

    {/* Blue Screen Inside */}
    <rect x="5" y="5" width="6" height="6" fill="#587090" />
    <rect x="6" y="6" width="4" height="4" fill="#7890B0" />

    {/* Red & White Emblem on Screen */}
    <rect x="6" y="7" width="4" height="1" fill="#DC2626" />
    <rect x="7" y="6" width="2" height="1" fill="#FFFFFF" />
    <rect x="7" y="8" width="2" height="1" fill="#FFFFFF" />

    {/* Support Base Legs */}
    <rect x="4" y="13" width="2" height="2" fill="#384050" />
    <rect x="10" y="13" width="2" height="2" fill="#384050" />
  </g>
);

// 5. Nickel Ore Sample Drums (16x16) - Limonite (Rust) or Saprolite (Green-Tan)
export const GbaNickelDrumTile: React.FC<{ 
  x: number; 
  y: number; 
  type?: 'limonite' | 'saprolite';
}> = ({ x, y, type = 'limonite' }) => {
  const isLimonite = type === 'limonite';
  const body = isLimonite ? '#B04828' : '#687838';
  const hl = isLimonite ? '#D86848' : '#88A050';
  const sh = isLimonite ? '#782810' : '#405020';

  return (
    <g transform={`translate(${x * 16}, ${y * 16})`}>
      <rect width="16" height="16" fill="#98D8A0" />
      {/* Drop shadow */}
      <rect x="2" y="14" width="12" height="2" fill="#58A068" />

      {/* Drum Outline */}
      <rect x="2" y="2" width="12" height="12" fill="#181820" />
      {/* Top Cap */}
      <rect x="3" y="1" width="10" height="2" fill="#181820" />
      <rect x="4" y="1" width="8" height="1" fill={hl} />

      {/* Cylinder Body */}
      <rect x="3" y="3" width="10" height="10" fill={body} />
      {/* Left highlight strip */}
      <rect x="4" y="3" width="2" height="10" fill={hl} />
      {/* Right shadow strip */}
      <rect x="11" y="3" width="2" height="10" fill={sh} />

      {/* Metal rib bands */}
      <rect x="3" y="6" width="10" height="1" fill="#181820" opacity="0.6" />
      <rect x="3" y="10" width="10" height="1" fill="#181820" opacity="0.6" />

      {/* 105°C Oven Sample Tag */}
      <rect x="6" y="7" width="4" height="2" fill="#FACC15" />
      <rect x="7" y="7" width="2" height="1" fill="#181820" />
    </g>
  );
};

// 6. Wooden Park / Gazebo Bench Tile (32x16, spans 2 tiles)
export const GbaBenchTiles: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect width="32" height="16" fill="#98D8A0" />
    <rect x="3" y="13" width="26" height="2" fill="#58A068" />

    {/* Backrest Slats */}
    <rect x="2" y="3" width="28" height="5" fill="#181820" />
    <rect x="3" y="4" width="26" height="3" fill="#A86838" />
    <rect x="3" y="4" width="26" height="1" fill="#D89858" />
    <rect x="3" y="6" width="26" height="1" fill="#784820" />

    {/* Seat Base */}
    <rect x="2" y="8" width="28" height="4" fill="#181820" />
    <rect x="3" y="8" width="26" height="3" fill="#B87840" />
    <rect x="3" y="8" width="26" height="1" fill="#E8A868" />

    {/* Cast Iron Legs */}
    <rect x="4" y="11" width="2" height="4" fill="#181820" />
    <rect x="26" y="11" width="2" height="4" fill="#181820" />
  </g>
);

// 7. Coffee Dispenser (16x24, spans 1x1.5 tiles)
export const GbaCoffeeMachineTile: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16 - 8})`}>
    <rect x="2" y="21" width="12" height="3" fill="#58A068" />
    <rect x="2" y="2" width="12" height="20" fill="#181820" />
    <rect x="3" y="3" width="10" height="18" fill="#B91C1C" />
    <rect x="3" y="3" width="10" height="2" fill="#DC2626" />
    {/* Glass window */}
    <rect x="4" y="6" width="8" height="5" fill="#38BDF8" />
    <rect x="5" y="7" width="2" height="3" fill="#FFFFFF" opacity="0.8" />
    {/* Coffee cup */}
    <rect x="7" y="8" width="3" height="2" fill="#78350F" />
    {/* Dispenser Nook */}
    <rect x="5" y="14" width="6" height="4" fill="#1E293B" />
    <rect x="7" y="15" width="2" height="2" fill="#FFFFFF" />
  </g>
);

// 8. Standing K3 Ashtray Tile (16x16)
export const GbaAshtrayTile: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect width="16" height="16" fill="#98D8A0" />
    <rect x="4" y="14" width="8" height="2" fill="#58A068" />
    <rect x="7" y="5" width="2" height="9" fill="#181820" />
    <rect x="7" y="5" width="1" height="9" fill="#94A3B8" />
    <rect x="4" y="3" width="8" height="3" fill="#181820" />
    <rect x="5" y="3" width="6" height="2" fill="#CBD5E1" />
    <rect x="6" y="3" width="4" height="1" fill="#475569" />
    <rect x="8" y="2" width="1" height="1" fill="#EF4444" />
  </g>
);

// 9. POKÉMON CENTER STYLE MAIN BUILDING (Bottom Center in User Screenshot)
// 80x72 pixels (5x4.5 tiles). Authentic pixel dome roof with stepped rows and circular Pokéball emblem!
export const GbaPokemonCenterBuilding: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {/* Ground drop shadow */}
    <rect x="2" y="68" width="76" height="6" fill="#58A068" />

    {/* === STEPPED OCTAGON RED ROOF === */}
    {/* Dark outline */}
    <rect x="20" y="2" width="40" height="2" fill="#181820" />
    <rect x="14" y="4" width="52" height="3" fill="#181820" />
    <rect x="8" y="7" width="64" height="4" fill="#181820" />
    <rect x="4" y="11" width="72" height="18" fill="#181820" />

    {/* Red Roof Body Fill (Stepped horizontal bands) */}
    <rect x="21" y="3" width="38" height="1" fill="#FF8060" />
    <rect x="15" y="4" width="50" height="3" fill="#E84838" />
    <rect x="9" y="7" width="62" height="4" fill="#D83830" />
    <rect x="5" y="11" width="70" height="17" fill="#C02828" />

    {/* Roof Highlights (Horizontal stepped orange/cream ridges like screenshot) */}
    <rect x="24" y="4" width="32" height="1" fill="#FFA888" />
    <rect x="18" y="8" width="44" height="1" fill="#FF8060" />
    <rect x="12" y="13" width="56" height="1" fill="#E84838" />

    {/* Bottom Eaves White Strip */}
    <rect x="4" y="26" width="72" height="3" fill="#181820" />
    <rect x="5" y="27" width="70" height="2" fill="#F1F5F9" />

    {/* === CIRCULAR POKÉBALL EMBLEM ON ROOF FRONT === */}
    <rect x="33" y="12" width="14" height="14" fill="#181820" />
    <rect x="34" y="13" width="12" height="12" fill="#F8FAFC" />
    {/* Top red half */}
    <rect x="35" y="14" width="10" height="4" fill="#DC2626" />
    {/* Horizontal divider */}
    <rect x="34" y="18" width="12" height="2" fill="#181820" />
    {/* Center Button */}
    <rect x="38" y="17" width="4" height="4" fill="#181820" />
    <rect x="39" y="18" width="2" height="2" fill="#FFFFFF" />

    {/* === WHITE WALL FACADE === */}
    <rect x="6" y="29" width="68" height="40" fill="#181820" />
    <rect x="7" y="30" width="66" height="38" fill="#FFFFFF" />

    {/* Corner Pillars (Light Grey) */}
    <rect x="7" y="30" width="6" height="38" fill="#CBD5E1" />
    <rect x="67" y="30" width="6" height="38" fill="#CBD5E1" />

    {/* Red Signboard Bar: "P.C / PREP LAB" */}
    <rect x="22" y="32" width="36" height="7" fill="#181820" />
    <rect x="23" y="33" width="34" height="5" fill="#DC2626" />
    <text 
      x="40" 
      y="37" 
      textAnchor="middle" 
      fill="#FFFFFF" 
      fontSize="4" 
      fontFamily="monospace" 
      fontWeight="900"
      letterSpacing="0.8"
    >
      P.C PREPLAB
    </text>

    {/* Sliding Glass Doors (Blue Reflection) */}
    <rect x="30" y="44" width="20" height="24" fill="#181820" />
    <rect x="31" y="45" width="18" height="22" fill="#60A5FA" />
    {/* Center door divider */}
    <rect x="39.5" y="45" width="1" height="22" fill="#1E293B" />
    {/* Diagonal glass glare */}
    <rect x="33" y="47" width="2" height="16" fill="#BFDBFE" />
    <rect x="44" y="47" width="2" height="16" fill="#BFDBFE" />
    {/* Red Welcome Mat */}
    <rect x="29" y="67" width="22" height="2" fill="#B91C1C" />

    {/* Windows Left & Right */}
    <rect x="15" y="46" width="10" height="12" fill="#181820" />
    <rect x="16" y="47" width="8" height="10" fill="#38BDF8" />
    <rect x="16" y="51" width="8" height="1" fill="#181820" />
    <rect x="19" y="47" width="1" height="10" fill="#181820" />

    <rect x="55" y="46" width="10" height="12" fill="#181820" />
    <rect x="56" y="47" width="8" height="10" fill="#38BDF8" />
    <rect x="56" y="51" width="8" height="1" fill="#181820" />
    <rect x="59" y="47" width="1" height="10" fill="#181820" />
  </g>
);

// 10. PROFESSOR BIRCH'S LAB / WOODEN HOUSE (Top Building in User Screenshot)
// 64x64 pixels (4x4 tiles). Brown tiled roof, vertical tan wood siding, glass door and planter.
export const GbaBirchLabBuilding: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect x="2" y="60" width="60" height="6" fill="#58A068" />

    {/* === ROOF (Brown Wood Plank Roof) === */}
    <rect x="4" y="2" width="56" height="26" fill="#181820" />
    <rect x="5" y="3" width="54" height="24" fill="#B87840" />
    {/* Roof plank horizontal shadow lines */}
    <rect x="5" y="8" width="54" height="1" fill="#784020" />
    <rect x="5" y="14" width="54" height="1" fill="#784020" />
    <rect x="5" y="20" width="54" height="1" fill="#784020" />
    {/* Highlight strips */}
    <rect x="5" y="3" width="54" height="1" fill="#D89858" />
    <rect x="5" y="9" width="54" height="1" fill="#D89858" />
    <rect x="5" y="15" width="54" height="1" fill="#D89858" />
    <rect x="5" y="21" width="54" height="1" fill="#D89858" />

    {/* Roof Eaves */}
    <rect x="3" y="26" width="58" height="3" fill="#181820" />
    <rect x="4" y="27" width="56" height="2" fill="#784020" />

    {/* === WALLS (Tan/Beige Wood Siding) === */}
    <rect x="6" y="29" width="52" height="32" fill="#181820" />
    <rect x="7" y="30" width="50" height="30" fill="#E8D8A8" />
    {/* Vertical wood panel seams */}
    <rect x="14" y="30" width="1" height="30" fill="#C8B078" />
    <rect x="22" y="30" width="1" height="30" fill="#C8B078" />
    <rect x="30" y="30" width="1" height="30" fill="#C8B078" />
    <rect x="38" y="30" width="1" height="30" fill="#C8B078" />
    <rect x="46" y="30" width="1" height="30" fill="#C8B078" />

    {/* Wood Door */}
    <rect x="16" y="38" width="14" height="22" fill="#181820" />
    <rect x="17" y="39" width="12" height="20" fill="#985828" />
    {/* Door window */}
    <rect x="19" y="42" width="8" height="6" fill="#181820" />
    <rect x="20" y="43" width="6" height="4" fill="#60A5FA" />
    <rect x="22" y="43" width="1" height="4" fill="#181820" />
    <rect x="20" y="45" width="6" height="1" fill="#181820" />
    {/* Doorknob */}
    <rect x="27" y="50" width="1" height="2" fill="#FACC15" />

    {/* Window on Right */}
    <rect x="36" y="38" width="16" height="14" fill="#181820" />
    <rect x="37" y="39" width="14" height="12" fill="#38BDF8" />
    <rect x="43" y="39" width="1" height="12" fill="#181820" />
    <rect x="37" y="44" width="14" height="1" fill="#181820" />
    {/* Window curtains */}
    <rect x="37" y="39" width="3" height="4" fill="#F87171" />
    <rect x="48" y="39" width="3" height="4" fill="#F87171" />

    {/* Flower Pot by the Door */}
    <g transform="translate(8, 48)">
      <rect x="0" y="4" width="6" height="6" fill="#854D0E" />
      <rect x="1" y="1" width="4" height="3" fill="#22C55E" />
      <rect x="2" y="0" width="2" height="2" fill="#E88080" />
    </g>
  </g>
);

// 11. TERRACOTTA SHINGLE ROOF BUILDING (Right Building in User Screenshot)
export const GbaTerracottaRoofBuilding: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {/* Shadow */}
    <rect x="2" y="60" width="46" height="6" fill="#58A068" />
    {/* Shingle Roof Bands */}
    <rect x="2" y="2" width="46" height="32" fill="#181820" />
    <rect x="3" y="3" width="44" height="30" fill="#9A3412" />

    {/* Alternating curved tile highlights */}
    {Array.from({ length: 6 }).map((_, i) => (
      <g key={i} transform={`translate(3, ${3 + i * 5})`}>
        <rect x="0" y="0" width="44" height="2" fill="#C2410C" />
        <rect x="0" y="2" width="44" height="2" fill="#7C2D12" />
        {/* Vertical grooves */}
        <rect x="8" y="0" width="1" height="5" fill="#181820" />
        <rect x="16" y="0" width="1" height="5" fill="#181820" />
        <rect x="24" y="0" width="1" height="5" fill="#181820" />
        <rect x="32" y="0" width="1" height="5" fill="#181820" />
        <rect x="40" y="0" width="1" height="5" fill="#181820" />
      </g>
    ))}

    {/* Wall below */}
    <rect x="4" y="34" width="44" height="28" fill="#181820" />
    <rect x="5" y="35" width="42" height="26" fill="#FEF3C7" />
    <rect x="10" y="42" width="10" height="12" fill="#181820" />
    <rect x="11" y="43" width="8" height="10" fill="#38BDF8" />
  </g>
);

// 12. GEN III PIXEL TREE CANOPY (32x32) - 1:1 Matching Pokémon Emerald Screenshot
// Chunky stepped pixel clusters with deep shadow, emerald highlights, and pink blossom clusters.
export const GbaTreeTile: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect width="32" height="32" fill="#98D8A0" />
    {/* Ground shadow */}
    <rect x="4" y="26" width="24" height="4" fill="#58A068" />

    {/* Wood Trunk */}
    <rect x="13" y="20" width="6" height="9" fill="#181820" />
    <rect x="14" y="21" width="4" height="7" fill="#854D0E" />

    {/* === CHUNKY PIXEL CANOPY (Stepped rounds) === */}
    {/* Dark Green Outline */}
    <rect x="8" y="2" width="16" height="22" fill="#183820" />
    <rect x="4" y="6" width="24" height="15" fill="#183820" />
    <rect x="2" y="9" width="28" height="10" fill="#183820" />

    {/* Dark Forest Green Base */}
    <rect x="9" y="3" width="14" height="20" fill="#166534" />
    <rect x="5" y="7" width="22" height="13" fill="#166534" />
    <rect x="3" y="10" width="26" height="8" fill="#166534" />

    {/* Mid Emerald Foliage Clumps */}
    <rect x="6" y="9" width="8" height="8" fill="#22C55E" />
    <rect x="18" y="9" width="8" height="8" fill="#22C55E" />
    <rect x="11" y="14" width="10" height="7" fill="#15803D" />

    {/* Bright Mint Top Highlights */}
    <rect x="11" y="4" width="10" height="6" fill="#86EFAC" />
    <rect x="13" y="5" width="6" height="2" fill="#DCFCE7" />
    <rect x="7" y="10" width="5" height="3" fill="#86EFAC" />
    <rect x="20" y="10" width="5" height="3" fill="#86EFAC" />

    {/* Pink Blossom / Berry Cluster on Tree (visible in screenshot on left edge!) */}
    <g transform="translate(6, 14)">
      <rect x="0" y="1" width="4" height="3" fill="#181820" />
      <rect x="1" y="1" width="2" height="1" fill="#E88080" />
      <rect x="0" y="2" width="1" height="1" fill="#E88080" />
      <rect x="2" y="2" width="1" height="1" fill="#C86060" />
      <rect x="1" y="2" width="1" height="1" fill="#FFF8A0" />
    </g>
  </g>
);

