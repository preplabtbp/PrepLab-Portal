import React from 'react';

/**
 * GbaSectionRooms - High-Complexity Pixel Art Tiles & Machinery for Pokémon Gen III Aesthetics
 * Specifically customized for PT Harita Nickel Preparation & Laboratory Department:
 * 1. Laboratory Room (XRF, 1050°C Fusion Muffle Furnace, 4-decimal Balance, Fume Hood)
 * 2. Preparation Room (Jaw Crusher, Pulverizer Ring Mill 200 Mesh, 105°C Drying Oven, Jones Splitter)
 * 3. Maintenance Workshop (Steel Workbench with Vise, Pegboard Tool Rack, LOTO Panel, V-Belts)
 * 4. Warehouse IC / Gudang (High Pallet Racks with Lithium Tetraborate Flux, XRF Cups, Binder Tablets)
 * 5. QA / Admin Office (Dual LCD Monitor Workstation with LIMS Curve & 2-Sigma Charts, ISO 17025 Plaque)
 * 6. Nickel Mine Rest Gazebo (Open-Pit Nickel Laterite Soil, Gazebo Timber & Zinc Roof, Asbak K3 with Smoke, Hot Coffee Urn)
 *
 * Strict 16x16 tile grid, crispEdges rendering, multi-tone GBA shading (outline, dark, base, highlight, specular shine).
 */

// ---------------------------------------------------------------------------
// 1. BASE WALL & FLOOR TILES (HIGH COMPLEXITY PIXEL ART)
// ---------------------------------------------------------------------------

/**
 * Laboratory Wall (16x16)
 * Upper sterile mint/white wall, grey wainscot border, dark baseboard kickplate
 */
export const GbaLabWallTile: React.FC<{ x: number; y: number; isTop?: boolean }> = ({ x, y, isTop }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {isTop ? (
      <>
        {/* Top wall crown moulding */}
        <rect width="16" height="3" fill="#304858" />
        <rect x="0" y="3" width="16" height="2" fill="#507080" />
        <rect x="0" y="5" width="16" height="11" fill="#D0E4EC" />
        {/* Subtle vertical tile seam */}
        <rect x="15" y="5" width="1" height="11" fill="#B8D0DC" />
        <rect x="7" y="7" width="2" height="1" fill="#E8F4F8" />
      </>
    ) : (
      <>
        {/* Mid wall and bottom kickplate baseboard */}
        <rect width="16" height="8" fill="#D0E4EC" />
        <rect x="15" y="0" width="1" height="8" fill="#B8D0DC" />
        {/* Dado rail trim */}
        <rect x="0" y="8" width="16" height="2" fill="#7898A8" />
        <rect x="0" y="10" width="16" height="2" fill="#486878" />
        {/* Dark PVC cleanroom baseboard */}
        <rect x="0" y="12" width="16" height="4" fill="#203040" />
        <rect x="0" y="12" width="16" height="1" fill="#385060" />
      </>
    )}
  </g>
);

/**
 * Laboratory Floor Tile (16x16)
 * Shiny checkerboard cleanroom vinyl/ceramic tile with specular reflection glints
 */
export const GbaLabFloorTile: React.FC<{ x: number; y: number; alt?: boolean }> = ({ x, y, alt }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect width="16" height="16" fill={alt ? '#E0EEF4' : '#F0F8FA'} />
    {/* Grout line grid (Right & Bottom) */}
    <rect x="15" y="0" width="1" height="16" fill="#B0CCD8" />
    <rect x="0" y="15" width="16" height="1" fill="#B0CCD8" />
    {/* Highlight shine glint (Top-Left) */}
    <rect x="2" y="2" width="4" height="1" fill="#FFFFFF" opacity="0.9" />
    <rect x="2" y="3" width="1" height="2" fill="#FFFFFF" opacity="0.9" />
    {/* Subtle depth stipple */}
    <rect x="10" y="9" width="1" height="1" fill="#C8DCE4" />
    <rect x="6" y="12" width="1" height="1" fill="#C8DCE4" />
  </g>
);

/**
 * Preparation Industrial Wall (16x16)
 * Reinforced concrete / brick wall with utility conduit pipe
 */
export const GbaPrepWallTile: React.FC<{ x: number; y: number; isTop?: boolean; hasPipe?: boolean }> = ({ x, y, isTop, hasPipe }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {isTop ? (
      <>
        <rect width="16" height="4" fill="#282C34" />
        <rect x="0" y="4" width="16" height="12" fill="#787C84" />
        <rect x="0" y="4" width="16" height="1" fill="#989CA4" />
        <rect x="0" y="9" width="16" height="1" fill="#585C64" />
        <rect x="8" y="4" width="1" height="5" fill="#585C64" />
        <rect x="15" y="10" width="1" height="6" fill="#585C64" />
      </>
    ) : (
      <>
        <rect width="16" height="11" fill="#686C74" />
        <rect x="0" y="5" width="16" height="1" fill="#484C54" />
        <rect x="7" y="0" width="1" height="5" fill="#484C54" />
        {/* Heavy steel kickplate with anchor bolts */}
        <rect x="0" y="11" width="16" height="5" fill="#30343C" />
        <rect x="0" y="11" width="16" height="1" fill="#50545C" />
        <rect x="3" y="13" width="2" height="2" fill="#E5E7EB" />
        <rect x="11" y="13" width="2" height="2" fill="#E5E7EB" />
      </>
    )}
    {/* Galvanized electrical conduit */}
    {hasPipe && (
      <g>
        <rect x="6" y="0" width="4" height="16" fill="#181820" />
        <rect x="7" y="0" width="2" height="16" fill="#CBD5E1" />
        <rect x="7" y="6" width="3" height="2" fill="#F59E0B" />
      </g>
    )}
  </g>
);

/**
 * Preparation Floor Tile (16x16)
 * Heavy reinforced concrete floor with safety zone yellow borders
 */
export const GbaPrepFloorTile: React.FC<{ 
  x: number; 
  y: number; 
  hasHazardBorder?: 'top' | 'bottom' | 'left' | 'right';
  hasDrain?: boolean;
}> = ({ x, y, hasHazardBorder, hasDrain }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect width="16" height="16" fill="#909498" />
    {/* Concrete stipple grain */}
    <rect x="2" y="3" width="1" height="1" fill="#787C80" />
    <rect x="8" y="1" width="1" height="1" fill="#A8ACB0" />
    <rect x="12" y="7" width="1" height="1" fill="#787C80" />
    <rect x="4" y="11" width="1" height="1" fill="#A8ACB0" />
    <rect x="10" y="13" width="1" height="1" fill="#787C80" />

    {/* K3 Yellow/Black Hazard Warning Stripe */}
    {hasHazardBorder === 'top' && (
      <g>
        <rect x="0" y="0" width="16" height="3" fill="#EAB308" />
        <polygon points="0,0 3,0 0,3" fill="#181820" />
        <polygon points="4,0 7,0 4,3 1,3" fill="#181820" />
        <polygon points="8,0 11,0 8,3 5,3" fill="#181820" />
        <polygon points="12,0 15,0 12,3 9,3" fill="#181820" />
        <polygon points="16,0 16,1 14,3 13,3" fill="#181820" />
      </g>
    )}
    {hasHazardBorder === 'bottom' && (
      <g>
        <rect x="0" y="13" width="16" height="3" fill="#EAB308" />
        <polygon points="0,13 3,13 0,16" fill="#181820" />
        <polygon points="4,13 7,13 4,16 1,16" fill="#181820" />
        <polygon points="8,13 11,13 8,16 5,16" fill="#181820" />
        <polygon points="12,13 15,13 12,16 9,16" fill="#181820" />
      </g>
    )}

    {/* Cast iron trench drain grate */}
    {hasDrain && (
      <g>
        <rect x="3" y="3" width="10" height="10" fill="#202428" />
        <rect x="4" y="4" width="8" height="8" fill="#383C44" />
        <rect x="5" y="5" width="6" height="1" fill="#101418" />
        <rect x="5" y="7" width="6" height="1" fill="#101418" />
        <rect x="5" y="9" width="6" height="1" fill="#101418" />
        <rect x="5" y="11" width="6" height="1" fill="#101418" />
      </g>
    )}
  </g>
);

/**
 * Workshop Steel Diamond Plate / Bordes Floor Tile (16x16)
 */
export const GbaWorkshopFloorTile: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect width="16" height="16" fill="#586068" />
    <rect x="0" y="15" width="16" height="1" fill="#303840" />
    <rect x="15" y="0" width="1" height="16" fill="#303840" />
    {/* Diamond tread lugs (Bordes steel pattern) */}
    <rect x="2" y="2" width="3" height="1" fill="#808890" />
    <rect x="3" y="3" width="2" height="1" fill="#384048" />
    <rect x="10" y="2" width="3" height="1" fill="#808890" />
    <rect x="11" y="3" width="2" height="1" fill="#384048" />
    <rect x="6" y="8" width="3" height="1" fill="#808890" />
    <rect x="7" y="9" width="2" height="1" fill="#384048" />
    <rect x="2" y="12" width="3" height="1" fill="#808890" />
    <rect x="3" y="13" width="2" height="1" fill="#384048" />
    <rect x="10" y="12" width="3" height="1" fill="#808890" />
    <rect x="11" y="13" width="2" height="1" fill="#384048" />
  </g>
);

/**
 * Warehouse Epoxy Floor Tile with Staging Line (16x16)
 */
export const GbaWarehouseFloorTile: React.FC<{ x: number; y: number; isLine?: boolean }> = ({ x, y, isLine }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect width="16" height="16" fill="#4B6584" />
    <rect x="1" y="1" width="14" height="1" fill="#6482A2" opacity="0.6" />
    <rect x="15" y="0" width="1" height="16" fill="#2D435B" />
    <rect x="0" y="15" width="16" height="1" fill="#2D435B" />
    {/* Epoxy gloss glint */}
    <rect x="3" y="4" width="2" height="1" fill="#93B2D2" />
    {isLine && (
      <rect x="0" y="7" width="16" height="2" fill="#FACC15" />
    )}
  </g>
);

/**
 * QA & Admin Wood Parquet / Carpet Floor Tile (16x16)
 * Warm GBA Pokémon Gen III interior wood flooring (Birch lab / player room)
 */
export const GbaWoodFloorTile: React.FC<{ x: number; y: number; alt?: boolean }> = ({ x, y, alt }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect width="16" height="16" fill={alt ? '#D89050' : '#E8A060'} />
    {/* Wood plank horizontal lines */}
    <rect x="0" y="7" width="16" height="1" fill="#A86830" />
    <rect x="0" y="15" width="16" height="1" fill="#884818" />
    {/* Staggered vertical seams */}
    {alt ? (
      <>
        <rect x="5" y="0" width="1" height="7" fill="#A86830" />
        <rect x="11" y="8" width="1" height="7" fill="#A86830" />
      </>
    ) : (
      <>
        <rect x="12" y="0" width="1" height="7" fill="#A86830" />
        <rect x="4" y="8" width="1" height="7" fill="#A86830" />
      </>
    )}
    {/* Highlight wood grain */}
    <rect x="1" y="1" width="6" height="1" fill="#F8B878" />
    <rect x="2" y="9" width="6" height="1" fill="#F8B878" />
  </g>
);

/**
 * Pure 1:1 Pixel-Art Pokémon FireRed / GBA Lab Paving Pattern (Oak's Lab)
 * Seamless 16x16 tile matching exact diagonal slanting brick courses, highlights, and mortar.
 * Spans 2.625 tiles per trainer height (21px), exactly matching the authentic GBA game proportion.
 */
export const GBA_GAZEBO_PAVING_BASE64 = 
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAWUlEQVQ4jWOoSEn7///Ht/+fnjyC42eXzoHxnI6O/4TkGYhRhE+egVibcMkzkOJcbPIMpPoZXZ4BxoBJ4jIElzwDsiQum/DJM8A4uJxLSJ5hNB38H00Haf8BlJVDst9xizoAAAAASUVORK5CYII=';

export const GbaGazeboTerraceTile: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect width="16" height="16" fill="url(#gba-gazebo-paving-pattern)" />
  </g>
);


// ---------------------------------------------------------------------------
// 2. LABORATORY EQUIPMENT (HIGH DETAIL PIXEL ART)
// ---------------------------------------------------------------------------

/**
 * XRF Spectrometer (32x32 - 2x2 Tiles)
 * Primary analytical instrument for Nickel & Iron assaying
 */
export const GbaXrfSpectrometer: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {/* Machine Base Drop Shadow */}
    <rect x="2" y="28" width="28" height="4" fill="#0F172A" opacity="0.4" />

    {/* Main Cabinet (Chassis) */}
    <rect x="2" y="4" width="28" height="26" fill="#1E293B" />
    <rect x="3" y="5" width="26" height="24" fill="#E2E8F0" />
    {/* Left Highlight Edge */}
    <rect x="3" y="5" width="2" height="24" fill="#F8FAFC" />
    {/* Right Shadow Edge */}
    <rect x="27" y="5" width="2" height="24" fill="#94A3B8" />

    {/* Upper Section: Cathode Ray / Multi-Channel Analyzer Screen */}
    <rect x="5" y="7" width="14" height="10" fill="#0F172A" />
    <rect x="6" y="8" width="12" height="8" fill="#042F2E" />
    {/* Glowing Green XRF Spectrum Peak Graph */}
    <path d="M 7 14 L 8 13 L 9 14 L 10 9 L 11 14 L 12 11 L 13 14 L 14 15 L 16 15" stroke="#10B981" strokeWidth="1" fill="none" />
    <rect x="10" y="8" width="1" height="1" fill="#34D399" />
    <rect x="12" y="10" width="1" height="1" fill="#34D399" />

    {/* Digital Status LEDs & Gauge */}
    <rect x="21" y="7" width="6" height="3" fill="#0F172A" />
    <rect x="22" y="8" width="2" height="1" fill="#22C55E" /> {/* Ready LED */}
    <rect x="25" y="8" width="1" height="1" fill="#EAB308" /> {/* High Voltage LED */}
    <rect x="21" y="12" width="6" height="4" fill="#0284C7" />
    <rect x="22" y="13" width="4" height="2" fill="#E0F2FE" />
    <rect x="23" y="14" width="2" height="1" fill="#0369A1" />

    {/* Middle Section: Automated Sample Cup Carousel Chamber */}
    <rect x="5" y="19" width="22" height="8" fill="#475569" />
    <rect x="6" y="20" width="20" height="6" fill="#1E293B" />
    {/* Sample Cup Holder Turntable */}
    <circle cx="12" cy="23" r="2.5" fill="#CBD5E1" />
    <circle cx="12" cy="23" r="1.5" fill="#F59E0B" /> {/* Nickel Sample Pressed Pellet */}
    <circle cx="19" cy="23" r="2.5" fill="#64748B" />
    {/* Safety Interlock Handle */}
    <rect x="24" y="20" width="2" height="6" fill="#EF4444" />

    {/* Machine Label Plate: XRF Ni/Fe HARITA */}
    <rect x="7" y="27" width="18" height="1.5" fill="#3B82F6" />
    <rect x="8" y="27" width="4" height="1" fill="#FFFFFF" />
  </g>
);

/**
 * Fusion Bead Muffle Furnace 1050°C (32x32 - 2x2 Tiles)
 * High-temperature fusion furnace for XRF glass beads
 */
export const GbaFusionFurnace: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {/* Drop Shadow */}
    <rect x="2" y="28" width="28" height="4" fill="#0F172A" opacity="0.4" />

    {/* Heavy Stainless Enclosure */}
    <rect x="3" y="4" width="26" height="26" fill="#181820" />
    <rect x="4" y="5" width="24" height="24" fill="#475569" />
    <rect x="4" y="5" width="24" height="2" fill="#94A3B8" />

    {/* Furnace Chamber Heavy Counter-Balanced Door */}
    <rect x="6" y="8" width="20" height="14" fill="#1E293B" />
    <rect x="7" y="9" width="18" height="12" fill="#334155" />

    {/* Glowing Quartz Peep-Hole showing 1050°C Incandescent Core */}
    <rect x="12" y="12" width="8" height="6" fill="#7C2D12" />
    <rect x="13" y="13" width="6" height="4" fill="#EA580C" />
    <rect x="14" y="14" width="4" height="2" fill="#FDE047" /> {/* White-Hot Core */}

    {/* Heavy Thermal Lever Handle */}
    <rect x="8" y="18" width="16" height="2" fill="#1E293B" />
    <rect x="21" y="16" width="3" height="5" fill="#DC2626" />

    {/* Digital Temperature Controller: "1050" LED Display */}
    <rect x="7" y="23" width="12" height="4" fill="#0F172A" />
    <rect x="8" y="24" width="10" height="2" fill="#EF4444" />
    {/* Text simulation 1050 */}
    <rect x="9" y="24" width="1" height="2" fill="#FEE2E2" />
    <rect x="11" y="24" width="1" height="2" fill="#FEE2E2" />
    <rect x="13" y="24" width="1" height="2" fill="#FEE2E2" />
    <rect x="15" y="24" width="1" height="2" fill="#FEE2E2" />

    {/* Power Switch & Alarm Lamp */}
    <circle cx="23" cy="25" r="1.5" fill="#22C55E" />
    <rect x="20" y="24" width="1" height="2" fill="#EF4444" />
  </g>
);

/**
 * Analytical Balance 4-Decimal (16x16 - 1 Tile)
 * High precision 0.0001g weighing balance with glass draft shield
 */
export const GbaAnalyticalBalance: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect x="2" y="13" width="12" height="2" fill="#0F172A" opacity="0.3" />
    {/* Base Chassis */}
    <rect x="2" y="9" width="12" height="6" fill="#1E293B" />
    <rect x="3" y="10" width="10" height="4" fill="#E2E8F0" />
    {/* Blue Backlit LCD Display 0.0000g */}
    <rect x="4" y="11" width="6" height="2" fill="#0284C7" />
    <rect x="5" y="11" width="4" height="1" fill="#BAE6FD" />
    {/* Leveling bubble */}
    <circle cx="11" cy="12" r="0.8" fill="#22C55E" />

    {/* Glass Windshield Draft Shield */}
    <rect x="3" y="2" width="10" height="8" fill="#1E293B" />
    <rect x="4" y="3" width="8" height="6" fill="#7DD3FC" opacity="0.5" />
    {/* Glass Corner Glint */}
    <rect x="4" y="3" width="1" height="5" fill="#FFFFFF" opacity="0.9" />
    <rect x="4" y="3" width="7" height="1" fill="#FFFFFF" opacity="0.9" />
    {/* Stainless Steel Pan & Crucible */}
    <rect x="6" y="7" width="4" height="1" fill="#64748B" />
    <rect x="7" y="5" width="2" height="2" fill="#F59E0B" /> {/* Flux Powder */}
  </g>
);

/**
 * Fume Hood / Lemari Asam (32x32 - 2x2 Tiles)
 * Ventilated chemical hood with reagent bottles
 */
export const GbaFumeHood: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {/* Main Hood Cabinet */}
    <rect x="2" y="0" width="28" height="30" fill="#1E293B" />
    <rect x="3" y="1" width="26" height="5" fill="#CBD5E1" />
    {/* Exhaust Airflow Duct & Blower Status */}
    <rect x="10" y="2" width="12" height="3" fill="#64748B" />
    <circle cx="25" cy="3.5" r="1.5" fill="#22C55E" /> {/* Blower ON green */}

    {/* Clear Acrylic Sliding Sash Window */}
    <rect x="4" y="6" width="24" height="16" fill="#0F172A" />
    <rect x="5" y="7" width="22" height="14" fill="#38BDF8" opacity="0.3" />
    {/* Sash Glass Glint */}
    <line x1="6" y1="8" x2="16" y2="18" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" />
    {/* Sash Handle Bar */}
    <rect x="5" y="16" width="22" height="2" fill="#94A3B8" />

    {/* Inside Reagent Bottles */}
    <rect x="7" y="13" width="3" height="4" fill="#0284C7" /> {/* CuSO4 Blue */}
    <rect x="8" y="12" width="1" height="1" fill="#E2E8F0" />
    <rect x="12" y="13" width="3" height="4" fill="#D97706" /> {/* Amber Reagent */}
    <rect x="13" y="12" width="1" height="1" fill="#E2E8F0" />
    <rect x="17" y="13" width="4" height="4" fill="#10B981" /> {/* Acid Green */}
    <rect x="18" y="12" width="2" height="1" fill="#E2E8F0" />

    {/* Stainless Counter Base & Storage Cabinet */}
    <rect x="3" y="22" width="26" height="8" fill="#475569" />
    <rect x="4" y="23" width="12" height="6" fill="#334155" />
    <rect x="17" y="23" width="12" height="6" fill="#334155" />
    <rect x="10" y="25" width="1" height="3" fill="#94A3B8" />
    <rect x="18" y="25" width="1" height="3" fill="#94A3B8" />
  </g>
);

// ---------------------------------------------------------------------------
// 3. PREPARATION EQUIPMENT (HIGH DETAIL PIXEL ART)
// ---------------------------------------------------------------------------

/**
 * Heavy-Duty Jaw Crusher (32x32 - 2x2 Tiles)
 * Primary crushing unit for nickel ore rocks (Limonite & Saprolite)
 */
export const GbaJawCrusher: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {/* Drop Shadow */}
    <rect x="2" y="28" width="28" height="4" fill="#0F172A" opacity="0.4" />

    {/* Heavy Cast Steel Frame (Industrial Green TBP) */}
    <rect x="3" y="4" width="26" height="26" fill="#14281A" />
    <rect x="4" y="5" width="24" height="24" fill="#15803D" />
    <rect x="4" y="5" width="24" height="2" fill="#4ADE80" />
    <rect x="26" y="5" width="2" height="24" fill="#14532D" />

    {/* Top Feed Hopper Chute with Ore Rocks */}
    <polygon points="6,6 26,6 22,14 10,14" fill="#1E293B" />
    {/* Nickel Ore Rocks in Hopper */}
    <rect x="11" y="8" width="3" height="3" fill="#B45309" /> {/* Limonite rust */}
    <rect x="15" y="9" width="4" height="3" fill="#4D7C0F" /> {/* Saprolite green */}
    <rect x="13" y="11" width="3" height="2" fill="#78350F" />

    {/* Massive Cast-Iron Flywheel on Side */}
    <circle cx="25" cy="18" r="6" fill="#0F172A" />
    <circle cx="25" cy="18" r="5" fill="#64748B" />
    <circle cx="25" cy="18" r="4" fill="#334155" />
    <circle cx="25" cy="18" r="1.5" fill="#E2E8F0" />
    {/* Flywheel Spokes */}
    <line x1="25" y1="13" x2="25" y2="23" stroke="#94A3B8" strokeWidth="1" />
    <line x1="20" y1="18" x2="30" y2="18" stroke="#94A3B8" strokeWidth="1" />

    {/* Crushing Jaw Mechanism & Discharge Chute */}
    <rect x="8" y="16" width="14" height="10" fill="#1E293B" />
    <polygon points="10,17 14,24 12,24 8,17" fill="#94A3B8" /> {/* Manganese steel jaw plate */}
    <polygon points="20,17 16,24 18,24 22,17" fill="#64748B" />

    {/* Emergency Stop Switch (Red Mushroom Button) */}
    <rect x="5" y="17" width="2" height="3" fill="#EAB308" />
    <circle cx="6" cy="16" r="1.5" fill="#EF4444" />
  </g>
);

/**
 * Pulverizer Ring Mill 200 Mesh (32x32 - 2x2 Tiles)
 * High-speed pulverizing unit to reduce ore to fine 200-mesh powder
 */
export const GbaPulverizerMill: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {/* Drop Shadow */}
    <rect x="2" y="28" width="28" height="4" fill="#0F172A" opacity="0.4" />

    {/* Acoustic Sound-Dampening Enclosure Box (Industrial Blue) */}
    <rect x="3" y="4" width="26" height="26" fill="#0F172A" />
    <rect x="4" y="5" width="24" height="24" fill="#2563EB" />
    <rect x="4" y="5" width="24" height="2" fill="#60A5FA" />
    <rect x="26" y="5" width="2" height="24" fill="#1D4ED8" />

    {/* Pneumatic Clamping Arm Top Hood */}
    <rect x="6" y="7" width="20" height="4" fill="#1E293B" />
    <rect x="7" y="8" width="18" height="2" fill="#94A3B8" />
    <rect x="14" y="5" width="4" height="3" fill="#EAB308" /> {/* Lock clamp lever */}

    {/* Tungsten Carbide / Hardened Steel Ring Mill Bowl */}
    <rect x="8" y="12" width="16" height="11" fill="#0F172A" />
    <rect x="9" y="13" width="14" height="9" fill="#475569" />
    {/* Concentric Pulverizer Rings */}
    <circle cx="16" cy="17.5" r="4.5" fill="#64748B" />
    <circle cx="16" cy="17.5" r="3" fill="#334155" />
    <circle cx="16" cy="17.5" r="1.5" fill="#CBD5E1" /> {/* Center Puck Core */}

    {/* 200 MESH QC Badge & Digital Timer Display */}
    <rect x="6" y="24" width="8" height="4" fill="#0F172A" />
    <rect x="7" y="25" width="6" height="2" fill="#22C55E" />
    <rect x="8" y="25" width="4" height="1" fill="#E0F2FE" /> {/* "180s" */}

    {/* Start Green & Stop Red Pushbuttons */}
    <circle cx="18" cy="26" r="1.5" fill="#22C55E" />
    <circle cx="22" cy="26" r="1.5" fill="#EF4444" />
  </g>
);

/**
 * Drying Oven 105°C (32x32 - 2x2 Tiles)
 * Moisture content determination & moisture drying oven with digital thermostat
 */
export const GbaDryingOven: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect x="2" y="28" width="28" height="4" fill="#0F172A" opacity="0.4" />

    {/* Stainless Double-Door Cabinet */}
    <rect x="3" y="3" width="26" height="27" fill="#1E293B" />
    <rect x="4" y="4" width="24" height="25" fill="#CBD5E1" />
    <rect x="4" y="4" width="24" height="2" fill="#F8FAFC" />
    <rect x="26" y="4" width="2" height="25" fill="#94A3B8" />

    {/* Dual Glass Observation Doors */}
    <rect x="6" y="7" width="9" height="15" fill="#1E293B" />
    <rect x="7" y="8" width="7" height="13" fill="#38BDF8" opacity="0.3" />
    <rect x="17" y="7" width="9" height="15" fill="#1E293B" />
    <rect x="18" y="8" width="7" height="13" fill="#38BDF8" opacity="0.3" />

    {/* Sample Trays inside glowing with heating elements */}
    <rect x="8" y="11" width="5" height="1" fill="#EA580C" />
    <rect x="8" y="15" width="5" height="1" fill="#EA580C" />
    <rect x="19" y="11" width="5" height="1" fill="#EA580C" />
    <rect x="19" y="15" width="5" height="1" fill="#EA580C" />

    {/* Door Handles */}
    <rect x="13" y="13" width="1" height="4" fill="#0F172A" />
    <rect x="18" y="13" width="1" height="4" fill="#0F172A" />

    {/* Digital Temperature Controller "105.0°C" */}
    <rect x="7" y="23" width="18" height="5" fill="#0F172A" />
    <rect x="8" y="24" width="11" height="3" fill="#DC2626" />
    {/* Red LED 105.0 */}
    <rect x="9" y="25" width="1" height="1" fill="#FEE2E2" />
    <rect x="11" y="25" width="1" height="1" fill="#FEE2E2" />
    <rect x="13" y="25" width="1" height="1" fill="#FEE2E2" />
    <rect x="15" y="25" width="1" height="1" fill="#FEE2E2" />
    <rect x="17" y="25" width="1" height="1" fill="#FEE2E2" />
    {/* Green Run Status LED */}
    <circle cx="22" cy="25.5" r="1" fill="#22C55E" />
  </g>
);

/**
 * Jones Riffle Splitter Bench (32x16 - 2x1 Tiles)
 * Precision sample divider with catch pans
 */
export const GbaJonesSplitter: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect x="2" y="13" width="28" height="3" fill="#0F172A" opacity="0.3" />

    {/* Stand Table */}
    <rect x="3" y="10" width="26" height="5" fill="#334155" />
    <rect x="5" y="13" width="2" height="3" fill="#1E293B" />
    <rect x="25" y="13" width="2" height="3" fill="#1E293B" />

    {/* Splitter Hopper with Alternating Chutes */}
    <polygon points="8,2 24,2 21,9 11,9" fill="#94A3B8" />
    <polygon points="9,3 23,3 20,8 12,8" fill="#E2E8F0" />
    {/* Chute vanes */}
    <line x1="13" y1="3" x2="13" y2="8" stroke="#64748B" strokeWidth="1" />
    <line x1="15" y1="3" x2="15" y2="8" stroke="#64748B" strokeWidth="1" />
    <line x1="17" y1="3" x2="17" y2="8" stroke="#64748B" strokeWidth="1" />
    <line x1="19" y1="3" x2="19" y2="8" stroke="#64748B" strokeWidth="1" />

    {/* Left & Right Stainless Catch Pans */}
    <rect x="6" y="8" width="6" height="4" fill="#CBD5E1" />
    <rect x="7" y="9" width="4" height="2" fill="#B45309" /> {/* Limonite split */}
    <rect x="20" y="8" width="6" height="4" fill="#CBD5E1" />
    <rect x="21" y="9" width="4" height="2" fill="#B45309" />
  </g>
);

// ---------------------------------------------------------------------------
// 4. MAINTENANCE WORKSHOP EQUIPMENT (HIGH DETAIL PIXEL ART)
// ---------------------------------------------------------------------------

/**
 * Heavy Steel Workbench with Vise & Pegboard Tools (32x32 - 2x2 Tiles)
 */
export const GbaWorkshopBench: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect x="2" y="28" width="28" height="4" fill="#0F172A" opacity="0.4" />

    {/* Pegboard Wall Backing */}
    <rect x="3" y="1" width="26" height="15" fill="#475569" />
    {/* Pegboard Holes */}
    <circle cx="6" cy="4" r="0.5" fill="#1E293B" />
    <circle cx="10" cy="4" r="0.5" fill="#1E293B" />
    <circle cx="14" cy="4" r="0.5" fill="#1E293B" />
    <circle cx="18" cy="4" r="0.5" fill="#1E293B" />
    <circle cx="22" cy="4" r="0.5" fill="#1E293B" />
    <circle cx="26" cy="4" r="0.5" fill="#1E293B" />

    {/* Hanging Tools: Wrench, Hammer, Screwdrivers */}
    <rect x="6" y="5" width="2" height="7" fill="#CBD5E1" /> {/* Wrench */}
    <rect x="5" y="5" width="4" height="2" fill="#94A3B8" />
    <rect x="12" y="5" width="2" height="7" fill="#B45309" /> {/* Hammer handle */}
    <rect x="11" y="5" width="5" height="2" fill="#1E293B" /> {/* Hammer head */}
    <rect x="19" y="5" width="1" height="6" fill="#EF4444" /> {/* Screwdriver */}
    <rect x="22" y="5" width="1" height="6" fill="#F59E0B" />

    {/* Heavy Cast-Iron Bench Vise on Left Corner */}
    <rect x="4" y="13" width="6" height="4" fill="#0F172A" />
    <rect x="5" y="14" width="4" height="2" fill="#3B82F6" />
    <rect x="4" y="13" width="2" height="2" fill="#94A3B8" /> {/* Vise jaws */}
    <rect x="8" y="13" width="2" height="2" fill="#94A3B8" />
    <rect x="10" y="14" width="2" height="1" fill="#E2E8F0" /> {/* Lead screw handle */}

    {/* Solid Hardwood / Steel Table Top */}
    <rect x="3" y="16" width="26" height="4" fill="#78350F" />
    <rect x="3" y="16" width="26" height="1" fill="#D97706" />

    {/* Heavy Steel Legs & Lower Storage Shelf */}
    <rect x="4" y="20" width="3" height="10" fill="#1E293B" />
    <rect x="25" y="20" width="3" height="10" fill="#1E293B" />
    <rect x="7" y="25" width="18" height="3" fill="#334155" />
    {/* Spare Motor V-Belt & Grease Can */}
    <ellipse cx="12" cy="26" rx="3" ry="1.5" fill="#181820" />
    <rect x="19" y="23" width="3" height="4" fill="#DC2626" /> {/* Grease can */}
  </g>
);

/**
 * LOTO (Lockout / Tagout) Safety Board (16x16 - 1 Tile)
 */
export const GbaLotoStation: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {/* Yellow K3 LOTO Board */}
    <rect x="2" y="2" width="12" height="12" fill="#181820" />
    <rect x="3" y="3" width="10" height="10" fill="#EAB308" />
    <rect x="3" y="3" width="10" height="1" fill="#FEF08A" />
    <rect x="4" y="4" width="8" height="2" fill="#DC2626" /> {/* "LOTO" Header */}
    <rect x="5" y="4" width="6" height="1" fill="#FFFFFF" />

    {/* Hanging Red Padlocks with Tags */}
    <rect x="4" y="7" width="2" height="3" fill="#EF4444" />
    <rect x="4" y="10" width="2" height="2" fill="#FFFFFF" /> {/* Tag */}
    <rect x="7" y="7" width="2" height="3" fill="#EF4444" />
    <rect x="7" y="10" width="2" height="2" fill="#FFFFFF" />
    <rect x="10" y="7" width="2" height="3" fill="#EF4444" />
    <rect x="10" y="10" width="2" height="2" fill="#FFFFFF" />
  </g>
);

// ---------------------------------------------------------------------------
// 5. WAREHOUSE IC / GUDANG EQUIPMENT (HIGH DETAIL PIXEL ART)
// ---------------------------------------------------------------------------

/**
 * High Industrial Pallet Rack (32x32 - 2x2 Tiles)
 * Loaded with Lithium Tetraborate Flux boxes, XRF sample cups, and binder tablets
 */
export const GbaWarehouseRack: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {/* Upright Steel Beams (Orange Heavy Duty) */}
    <rect x="2" y="2" width="3" height="28" fill="#1E293B" />
    <rect x="3" y="2" width="2" height="28" fill="#EA580C" />
    <rect x="27" y="2" width="3" height="28" fill="#1E293B" />
    <rect x="27" y="2" width="2" height="28" fill="#EA580C" />

    {/* Cross Bracing Struts */}
    <line x1="5" y1="6" x2="27" y2="14" stroke="#C2410C" strokeWidth="1" />
    <line x1="5" y1="14" x2="27" y2="6" stroke="#C2410C" strokeWidth="1" />
    <line x1="5" y1="18" x2="27" y2="26" stroke="#C2410C" strokeWidth="1" />
    <line x1="5" y1="26" x2="27" y2="18" stroke="#C2410C" strokeWidth="1" />

    {/* Top Shelf Beam & Cargo: Flux Boxes */}
    <rect x="2" y="14" width="28" height="2" fill="#F97316" />
    {/* Wooden Pallet */}
    <rect x="6" y="12" width="20" height="2" fill="#B45309" />
    {/* Boxes of Lithium Tetraborate Flux (White/Blue) */}
    <rect x="7" y="6" width="6" height="6" fill="#0284C7" />
    <rect x="8" y="7" width="4" height="2" fill="#FFFFFF" />
    <rect x="14" y="6" width="6" height="6" fill="#0284C7" />
    <rect x="15" y="7" width="4" height="2" fill="#FFFFFF" />
    <rect x="20" y="8" width="5" height="4" fill="#0284C7" />

    {/* Bottom Shelf Beam & Cargo: XRF Cups & Binder Tablets */}
    <rect x="2" y="26" width="28" height="2" fill="#F97316" />
    <rect x="5" y="24" width="22" height="2" fill="#B45309" />
    {/* XRF Cups Carton (Kraft Brown) */}
    <rect x="6" y="18" width="8" height="6" fill="#D97706" />
    <rect x="7" y="19" width="6" height="1" fill="#78350F" />
    {/* Reagent Drum (Blue Polyethylene) */}
    <rect x="16" y="17" width="6" height="7" fill="#1D4ED8" />
    <rect x="17" y="16" width="4" height="1" fill="#93C5FD" />
    <rect x="16" y="19" width="6" height="1" fill="#1E3A8A" />
    {/* Binder Tablet Box */}
    <rect x="23" y="20" width="4" height="4" fill="#10B981" />
  </g>
);

// ---------------------------------------------------------------------------
// 6. QA / ADMIN OFFICE EQUIPMENT (HIGH DETAIL PIXEL ART)
// ---------------------------------------------------------------------------

/**
 * QA Multi-Monitor Computer Workstation (32x32 - 2x2 Tiles)
 * Dual screens displaying LIMS spectrum & 2-sigma control charts
 */
export const GbaQaWorkstation: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect x="2" y="28" width="28" height="4" fill="#0F172A" opacity="0.4" />

    {/* Left Monitor (LIMS Database System) */}
    <rect x="4" y="6" width="11" height="9" fill="#0F172A" />
    <rect x="5" y="7" width="9" height="7" fill="#0369A1" />
    {/* Table rows of LIMS samples */}
    <rect x="6" y="8" width="7" height="1" fill="#E0F2FE" />
    <rect x="6" y="10" width="7" height="1" fill="#BAE6FD" />
    <rect x="6" y="12" width="5" height="1" fill="#22C55E" /> {/* PASS badge */}
    <rect x="8" y="15" width="3" height="2" fill="#334155" />
    <rect x="7" y="17" width="5" height="1" fill="#64748B" />

    {/* Right Monitor (QC Control Chart 2-Sigma Curve) */}
    <rect x="17" y="6" width="11" height="9" fill="#0F172A" />
    <rect x="18" y="7" width="9" height="7" fill="#064E3B" />
    {/* 2-Sigma Upper & Lower Limits */}
    <line x1="19" y1="8.5" x2="26" y2="8.5" stroke="#EF4444" strokeWidth="0.5" strokeDasharray="1,1" />
    <line x1="19" y1="12.5" x2="26" y2="12.5" stroke="#EF4444" strokeWidth="0.5" strokeDasharray="1,1" />
    {/* Center Valid Trend Line */}
    <polyline points="19,11 21,10 23,10.5 25,10" stroke="#34D399" strokeWidth="1" fill="none" />
    <rect x="21" y="15" width="3" height="2" fill="#334155" />
    <rect x="20" y="17" width="5" height="1" fill="#64748B" />

    {/* Contemporary Office Desk (Laminate Teak Top) */}
    <rect x="2" y="17" width="28" height="4" fill="#92400E" />
    <rect x="2" y="17" width="28" height="1" fill="#F59E0B" />

    {/* Keyboard, Mouse, and Coffee Mug */}
    <rect x="9" y="18" width="8" height="2" fill="#1E293B" />
    <rect x="18" y="18" width="2" height="2" fill="#475569" />
    <rect x="24" y="17" width="2" height="3" fill="#DC2626" /> {/* Coffee Mug */}

    {/* PC Tower on Floor */}
    <rect x="22" y="21" width="6" height="9" fill="#0F172A" />
    <rect x="23" y="22" width="4" height="7" fill="#1E293B" />
    <circle cx="25" cy="23.5" r="0.8" fill="#38BDF8" /> {/* Power LED */}
    <rect x="24" y="25" width="2" height="1" fill="#64748B" /> {/* Optical drive */}

    {/* Desk Drawer Unit on Left */}
    <rect x="4" y="21" width="7" height="9" fill="#78350F" />
    <rect x="5" y="23" width="5" height="2" fill="#92400E" />
    <rect x="7" y="24" width="1" height="1" fill="#E2E8F0" />
    <rect x="5" y="26" width="5" height="2" fill="#92400E" />
    <rect x="7" y="27" width="1" height="1" fill="#E2E8F0" />
  </g>
);

/**
 * ISO/IEC 17025 Accreditation Plaque (16x16 - 1 Tile)
 */
export const GbaIsoPlaque: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect x="2" y="2" width="12" height="10" fill="#181820" />
    <rect x="3" y="3" width="10" height="8" fill="#F59E0B" />
    <rect x="4" y="4" width="8" height="6" fill="#FEF3C7" />
    <rect x="5" y="5" width="6" height="1" fill="#1E293B" />
    <rect x="5" y="7" width="6" height="1" fill="#047857" /> {/* KAN / ISO seal */}
    <rect x="6" y="8" width="4" height="1" fill="#1E293B" />
  </g>
);

/**
 * Open-Pit Nickel Mine Tropical Panorama (Continuous 192x32 Pixel Art Landscape)
 * Authentic Pokémon Ruby/Sapphire (GBA Gen III) lush tropical island mountain panorama
 * Features soft distant blue ridges, lush rainforest slopes, warm laterite terraces, and soft clouds
 */
export const GbaMineVistaPanorama: React.FC<{ width?: number; height?: number }> = ({ width = 192, height = 32 }) => (
  <g pointerEvents="none">
    {/* 1. Tropical Azure Sky Gradient (Smooth GBA palette) */}
    <rect x="0" y="0" width={width} height={height} fill="#5A96D8" />
    <rect x="0" y="6" width={width} height={6} fill="#6EA8E4" />
    <rect x="0" y="12" width={width} height={6} fill="#88BCF0" />
    <rect x="0" y="18" width={width} height={6} fill="#A2D0F8" />
    <rect x="0" y="24" width={width} height={8} fill="#C0E2FC" />

    {/* 2. Soft Cirrus Cloud Bands (Pixel-dithered high clouds) */}
    {/* Cloud Cluster 1 */}
    <rect x="12" y="3" width="28" height="2" fill="#FFFFFF" opacity="0.6" />
    <rect x="18" y="2" width="16" height="1" fill="#FFFFFF" opacity="0.8" />
    <rect x="8" y="5" width="22" height="1" fill="#E0F0FE" opacity="0.5" />
    {/* Cloud Cluster 2 */}
    <rect x="84" y="4" width="36" height="2" fill="#FFFFFF" opacity="0.65" />
    <rect x="92" y="3" width="20" height="1" fill="#FFFFFF" opacity="0.85" />
    <rect x="80" y="6" width="30" height="1" fill="#E0F0FE" opacity="0.5" />
    {/* Cloud Cluster 3 */}
    <rect x="148" y="2" width="32" height="2" fill="#FFFFFF" opacity="0.6" />
    <rect x="156" y="1" width="18" height="1" fill="#FFFFFF" opacity="0.8" />

    {/* 3. Deep Distant Mountain Ridge (Hazy Indigo Blue - 100% smooth continuous natural curves) */}
    <path
      d={`M 0 18 
          C 25 11, 45 13, 65 9 
          C 85 5, 110 8, 130 6 
          C 155 4, 175 10, ${width} 8 
          L ${width} 32 L 0 32 Z`}
      fill="#3A5C78"
    />
    <path
      d={`M 0 19 
          C 30 13, 50 15, 70 11 
          C 95 7, 120 10, 140 8 
          C 165 7, 180 12, ${width} 10 
          L ${width} 32 L 0 32 Z`}
      fill="#486D8C"
    />

    {/* 4. Midground Tropical Rainforest Ridge (Lush Emerald & Moss Green Canopy) */}
    <path
      d={`M 0 22 
          C 20 17, 38 18, 55 15 
          C 72 12, 90 16, 112 13 
          C 135 11, 158 16, 175 14 
          C 185 13, 190 15, ${width} 15 
          L ${width} 32 L 0 32 Z`}
      fill="#285034"
    />
    <path
      d={`M 0 24 
          C 22 19, 42 20, 60 17 
          C 78 14, 98 18, 118 15 
          C 140 13, 162 18, ${width} 16 
          L ${width} 32 L 0 32 Z`}
      fill="#386A44"
    />

    {/* 5. Nickel Ore Deposit Terraces (Warm, Gentle Organic Laterite Slopes - NOT rigid step-blocks) */}
    {/* Natural sloping red-brown laterite hill */}
    <path
      d={`M 0 25 
          C 28 22, 50 25, 78 20 
          C 105 16, 135 22, 160 19 
          C 175 18, 185 20, ${width} 19 
          L ${width} 32 L 0 32 Z`}
      fill="#78341E"
    />
    <path
      d={`M 0 27 
          C 25 24, 48 26, 75 22 
          C 102 18, 132 23, 155 21 
          C 172 20, 184 21, ${width} 21 
          L ${width} 32 L 0 32 Z`}
      fill="#964426"
    />
    {/* Upper laterite sunlit highlight crest */}
    <path
      d={`M 0 28 
          C 24 25, 46 27, 72 23 
          C 98 20, 128 24, 150 22 
          C 170 21, 182 23, ${width} 22 
          L ${width} 32 L 0 32 Z`}
      fill="#B85834"
    />

    {/* 6. Distant Haul Road & Tiny Island Palm Trees (Subtle pixel scale accents) */}
    {/* Distant palm tree 1 */}
    <line x1="28" y1="18" x2="28" y2="22" stroke="#482818" strokeWidth="1" />
    <polygon points="26,17 30,17 28,15" fill="#2E6838" />
    {/* Distant palm tree 2 */}
    <line x1="32" y1="19" x2="32" y2="23" stroke="#482818" strokeWidth="1" />
    <polygon points="30,18 34,18 32,16" fill="#387A44" />
    {/* Distant palm tree 3 */}
    <line x1="168" y1="17" x2="168" y2="21" stroke="#482818" strokeWidth="1" />
    <polygon points="166,16 170,16 168,14" fill="#2E6838" />

    {/* Smooth ore haul road strip along the base */}
    <path
      d={`M 0 30 C 50 29, 100 30, 150 28 C 170 28, 185 29, ${width} 29 L ${width} 32 L 0 32 Z`}
      fill="#682A16"
    />
  </g>
);

/**
 * Backward compatibility fallback for single-tile vista
 */
export const GbaMineVistaTile: React.FC<{ x: number; y: number; step?: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect width="16" height="16" fill="#88BCF0" />
    <path d="M 0 10 C 5 8, 11 9, 16 7 L 16 16 L 0 16 Z" fill="#486D8C" />
    <path d="M 0 13 C 6 11, 12 12, 16 10 L 16 16 L 0 16 Z" fill="#386A44" />
    <path d="M 0 15 C 6 13, 10 14, 16 12 L 16 16 L 0 16 Z" fill="#964426" />
  </g>
);

/**
 * Gazebo Wooden Pillar & Timber Overhead Beam (16x16)
 */
export const GbaGazeboPillarTile: React.FC<{ x: number; y: number; isTop?: boolean }> = ({ x, y, isTop }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {isTop ? (
      <>
        {/* Timber Roof Rafter & Zinc Edge */}
        <rect width="16" height="5" fill="#1E293B" />
        <rect x="0" y="1" width="16" height="3" fill="#64748B" /> {/* Corrugated zinc roof */}
        <rect x="0" y="5" width="16" height="3" fill="#854D0E" /> {/* Timber beam */}
        <rect x="6" y="8" width="4" height="8" fill="#713F12" /> {/* Pillar post */}
        <rect x="7" y="8" width="2" height="8" fill="#A16207" /> {/* Highlight grain */}
      </>
    ) : (
      <>
        <rect x="6" y="0" width="4" height="14" fill="#713F12" />
        <rect x="7" y="0" width="2" height="14" fill="#A16207" />
        {/* Pillar Concrete Foundation Footing */}
        <rect x="4" y="12" width="8" height="4" fill="#475569" />
        <rect x="5" y="13" width="6" height="3" fill="#94A3B8" />
      </>
    )}
  </g>
);

/**
 * Prominent Plaque / Decorative Signboard: "PREPARATION & LABORATORY"
 * Placed along the main overhead beam of the gazebo
 */
export const GbaPrepLabBanner: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {/* Drop shadow */}
    <rect x="1" y="2" width="102" height="13" rx="2" fill="#000000" opacity="0.45" />

    {/* Polished Teak / Mahogany Plaque Frame */}
    <rect x="0" y="1" width="102" height="12" rx="2" fill="#451A03" stroke="#F59E0B" strokeWidth="1" />
    <rect x="2" y="2" width="98" height="10" rx="1" fill="#78350F" />
    <rect x="2" y="2" width="98" height="1" fill="#D97706" />

    {/* Left Icon: Safety Green Cross (K3 Zero Accident Emblem) */}
    <rect x="4" y="4" width="7" height="6" fill="#15803D" rx="1" />
    <rect x="6.5" y="4.5" width="2" height="5" fill="#FFFFFF" />
    <rect x="5" y="6" width="5" height="2" fill="#FFFFFF" />

    {/* Center High-Contrast Crisp Monospace Text: PREPARATION & LABORATORY */}
    <text
      x="54"
      y="9.2"
      textAnchor="middle"
      fontSize="4.4"
      fontFamily="monospace"
      fontWeight="900"
      letterSpacing="0.4"
      fill="#FEF08A"
    >
      PREPARATION &amp; LABORATORY
    </text>

    {/* Right Icon: Chemical Lab Flask / Analytical Assay Icon */}
    <rect x="91" y="4" width="7" height="6" fill="#0369A1" rx="1" />
    <polygon points="93,9 96,9 95.5,6.5 93.5,6.5" fill="#38BDF8" />
    <rect x="94" y="4.5" width="1" height="2" fill="#E0F2FE" />
  </g>
);

/**
 * Communal Round/Rectangular Coffee & Snack Table (With Fried Bananas, Snacks & Steaming Coffee)
 * Positioned in the center of the gazebo so personnel can sit together
 */
export const GbaGazeboTable: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    {/* Cast shadow on red soil */}
    <ellipse cx="18" cy="18" rx="18" ry="6" fill="#000000" opacity="0.3" />

    {/* Solid Teak Wood Tabletop with Beveled Rim */}
    <rect x="2" y="4" width="32" height="12" rx="3" fill="#381808" />
    <rect x="3" y="5" width="30" height="10" rx="2" fill="#78350F" />
    <rect x="4" y="6" width="28" height="8" rx="1.5" fill="#9A4515" />

    {/* Tablecloth / K3 Green Runner */}
    <rect x="10" y="5" width="16" height="10" fill="#166534" />
    <rect x="11" y="6" width="14" height="8" fill="#15803D" />
    <rect x="10" y="5" width="16" height="1" fill="#86EFAC" />

    {/* Center Snack Plate: Warm Crisp Fried Bananas (Pisang Goreng & Bakwan) */}
    <ellipse cx="14" cy="9.5" rx="4.5" ry="3" fill="#FEF3C7" stroke="#B45309" strokeWidth="0.5" />
    {/* Golden crispy fried bananas */}
    <rect x="11.5" y="8" width="3" height="2" rx="0.5" fill="#D97706" />
    <rect x="12" y="8.2" width="2" height="1" fill="#FDE047" />
    <rect x="14" y="9" width="3.5" height="2" rx="0.5" fill="#D97706" />
    <rect x="14.5" y="9.2" width="2" height="1" fill="#FBBF24" />

    {/* Stainless Teapot & Coffee Mugs with rising vapor */}
    {/* Silver Coffee Kettle */}
    <rect x="20" y="6.5" width="4" height="5" rx="0.8" fill="#CBD5E1" stroke="#334155" strokeWidth="0.5" />
    <rect x="20.5" y="7" width="1.5" height="4" fill="#F8FAFC" />
    <rect x="23.5" y="7.5" width="1.5" height="3" fill="#64748B" /> {/* Kettle handle */}
    {/* Hot Ceramic Cups (Red & Yellow) */}
    <rect x="18" y="10" width="2.5" height="2.5" rx="0.5" fill="#DC2626" />
    <rect x="18.5" y="9.5" width="1.5" height="1" fill="#451A03" /> {/* Black coffee */}
    <rect x="24" y="10" width="2.5" height="2.5" rx="0.5" fill="#EAB308" />
    <rect x="24.5" y="9.5" width="1.5" height="1" fill="#451A03" />

    {/* Rising aroma steam vapor pixels */}
    <rect x="18.5" y="7" width="1" height="1" fill="#FFFFFF" opacity="0.75" />
    <rect x="24.5" y="7" width="1" height="1" fill="#FFFFFF" opacity="0.75" />

    {/* Sturdy Table Legs */}
    <rect x="5" y="14" width="2.5" height="5" fill="#451A03" />
    <rect x="28.5" y="14" width="2.5" height="5" fill="#451A03" />
  </g>
);

/**
 * Gazebo Teak Wood Slatted Bench (32x16 - 2 Tiles)
 * Fits 2-3 personnel sitting side-by-side
 */
export const GbaGazeboBench: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect x="2" y="13" width="28" height="3" fill="#0F172A" opacity="0.3" />

    {/* Backrest Slats */}
    <rect x="3" y="3" width="26" height="4" fill="#181820" />
    <rect x="4" y="4" width="24" height="2" fill="#92400E" />
    <rect x="4" y="4" width="24" height="1" fill="#D97706" />

    {/* Solid Bench Seat Planks */}
    <rect x="3" y="8" width="26" height="5" fill="#181820" />
    <rect x="4" y="9" width="24" height="3" fill="#B45309" />
    <rect x="4" y="9" width="24" height="1" fill="#F59E0B" />

    {/* Cast-Iron Legs */}
    <rect x="5" y="12" width="2" height="4" fill="#181820" />
    <rect x="25" y="12" width="2" height="4" fill="#181820" />
  </g>
);

/**
 * Extra Cozy Front/Center Bench (32x16) for Group Seating
 */
export const GbaGazeboLowBench: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16})`}>
    <rect x="2" y="11" width="28" height="3" fill="#0F172A" opacity="0.25" />
    {/* Bench Planks */}
    <rect x="3" y="6" width="26" height="6" fill="#1E293B" rx="1" />
    <rect x="4" y="7" width="24" height="4" fill="#B45309" />
    <rect x="4" y="7" width="24" height="1" fill="#FBBF24" />
    <rect x="4" y="9" width="24" height="1" fill="#78350F" />
    {/* Legs */}
    <rect x="5" y="11" width="2" height="4" fill="#1E293B" />
    <rect x="25" y="11" width="2" height="4" fill="#1E293B" />
  </g>
);

/**
 * K3 Drinking Water Cooler & Gallon Dispenser (16x24 - 1 Tile)
 * Blue mineral water gallon with safety hydration sign
 */
export const GbaWaterCooler: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16 - 8})`}>
    <rect x="2" y="21" width="12" height="3" fill="#000000" opacity="0.3" />

    {/* White / Stainless Dispenser Cabinet */}
    <rect x="3" y="10" width="10" height="12" rx="1" fill="#1E293B" />
    <rect x="4" y="11" width="8" height="10" fill="#E2E8F0" />
    <rect x="4" y="11" width="2" height="10" fill="#FFFFFF" />

    {/* Water Catch Basin & Faucets */}
    <rect x="5" y="14" width="6" height="4" fill="#334155" />
    <rect x="6" y="14.5" width="1.5" height="2" fill="#EF4444" /> {/* Hot Tap */}
    <rect x="8.5" y="14.5" width="1.5" height="2" fill="#3B82F6" /> {/* Cold Tap */}

    {/* Blue Inverted 19L Mineral Water Gallon */}
    <rect x="4" y="3" width="8" height="8" rx="2" fill="#0284C7" stroke="#0369A1" strokeWidth="0.5" />
    <rect x="5" y="4" width="2" height="6" fill="#38BDF8" opacity="0.6" />
    {/* Gallon Cap */}
    <rect x="6" y="9" width="4" height="2" fill="#E0F2FE" />

    {/* K3 Hydration Sign Badge */}
    <rect x="5" y="19" width="6" height="1.5" fill="#16A34A" />
  </g>
);

/**
 * K3 Safety Notice & Shift Schedule Board (16x20)
 * Mounted wooden bulletin board with shift roster & zero accident tracker
 */
export const GbaShiftBoard: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16 - 6})`}>
    <rect x="1" y="2" width="14" height="18" fill="#3E1E08" rx="1" />
    <rect x="2" y="3" width="12" height="16" fill="#D97706" />

    {/* Green Header: UTAMAKAN KESELAMATAN K3 */}
    <rect x="3" y="4" width="10" height="3" fill="#15803D" />
    <rect x="7" y="4.5" width="2" height="2" fill="#FFFFFF" />

    {/* Pinned Shift Notices */}
    <rect x="3.5" y="8" width="4" height="5" fill="#FEF3C7" />
    <circle cx="5.5" cy="8.5" r="0.6" fill="#DC2626" />
    <rect x="8.5" y="8" width="4" height="5" fill="#E0F2FE" />
    <circle cx="10.5" cy="8.5" r="0.6" fill="#2563EB" />

    {/* Zero Accident Graph Bar */}
    <rect x="3.5" y="14" width="9" height="3" fill="#1E293B" />
    <rect x="4.5" y="15" width="7" height="1" fill="#22C55E" />
  </g>
);

/**
 * Acoustic Guitar Leaning Against Pillar (16x20)
 * Relaxed atmosphere instrument for break time
 */
export const GbaAcousticGuitar: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16 - 6})`}>
    {/* Guitar shadow */}
    <ellipse cx="9" cy="19" rx="5" ry="2" fill="#000000" opacity="0.3" />

    {/* Guitar Neck & Headstock */}
    <line x1="8" y1="2" x2="8" y2="10" stroke="#78350F" strokeWidth="1.5" />
    <rect x="7" y="1" width="2" height="2.5" fill="#451A03" />

    {/* Soundboard (Acoustic Body) */}
    <ellipse cx="8" cy="14" rx="4.5" ry="5.5" fill="#D97706" stroke="#451A03" strokeWidth="0.8" />
    <ellipse cx="8" cy="14" rx="1.5" ry="1.8" fill="#1E1B4B" /> {/* Soundhole */}
    <rect x="6.5" y="17" width="3" height="1" fill="#451A03" /> {/* Bridge */}
  </g>
);

/**
 * Stainless Steel Ashtray with Animated Smoke Embers (16x24)
 */
export const GbaNickelAshtray: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16 - 8})`}>
    <rect x="4" y="21" width="8" height="3" fill="#0F172A" opacity="0.3" />

    {/* Ashtray Standing Pedestal Base */}
    <rect x="5" y="19" width="6" height="3" fill="#1E293B" />
    <rect x="6" y="19" width="4" height="2" fill="#64748B" />

    {/* Stainless Steel Column Pipe */}
    <rect x="7" y="9" width="2" height="10" fill="#334155" />
    <rect x="7" y="9" width="1" height="10" fill="#E2E8F0" />

    {/* Top Stainless Water Basin Bowl */}
    <rect x="3" y="5" width="10" height="4" fill="#0F172A" />
    <rect x="4" y="6" width="8" height="2" fill="#CBD5E1" />
    <rect x="5" y="6" width="6" height="1" fill="#475569" />

    {/* Burning Ember (Red/Orange Pixel) */}
    <rect x="7" y="5" width="1" height="1" fill="#EF4444" />
    <rect x="8" y="5" width="1" height="1" fill="#F97316" />

    {/* Drifting Pixel Smoke Particles */}
    <rect x="7" y="3" width="1" height="1" fill="#E2E8F0" opacity="0.8" />
    <rect x="6" y="1" width="1" height="1" fill="#CBD5E1" opacity="0.6" />
    <rect x="8" y="0" width="1" height="1" fill="#94A3B8" opacity="0.4" />
  </g>
);

/**
 * Steaming Coffee Percolator & Refreshment Urn (16x24)
 */
export const GbaCoffeeUrn: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x * 16}, ${y * 16 - 8})`}>
    {/* Wooden Support Counter Stand */}
    <rect x="2" y="16" width="12" height="7" fill="#78350F" />
    <rect x="3" y="17" width="10" height="5" fill="#92400E" />

    {/* Stainless Coffee Urn Cylinder */}
    <rect x="3" y="5" width="10" height="11" fill="#0F172A" />
    <rect x="4" y="6" width="8" height="9" fill="#E2E8F0" />
    <rect x="4" y="6" width="2" height="9" fill="#FFFFFF" />
    <rect x="10" y="6" width="2" height="9" fill="#94A3B8" />

    {/* Top Lid & Handle */}
    <rect x="4" y="3" width="8" height="2" fill="#0F172A" />
    <rect x="5" y="4" width="6" height="1" fill="#CBD5E1" />
    <rect x="7" y="2" width="2" height="2" fill="#0F172A" />

    {/* Sight Glass Liquid Level (Rich Black Coffee) */}
    <rect x="7" y="7" width="2" height="7" fill="#181820" />
    <rect x="7" y="9" width="2" height="5" fill="#451A03" />

    {/* Dispenser Spigot Tap */}
    <rect x="11" y="12" width="3" height="2" fill="#DC2626" />
    <rect x="12" y="14" width="2" height="2" fill="#FEF08A" /> {/* Cup */}

    {/* Steaming Coffee Vapor Pixels */}
    <rect x="6" y="0" width="1" height="1" fill="#FFFFFF" opacity="0.7" />
    <rect x="8" y="1" width="1" height="1" fill="#FFFFFF" opacity="0.6" />
  </g>
);
