import React from 'react';

export interface GbaCharacterSpriteProps {
  direction?: 'down' | 'up' | 'left' | 'right';
  walkFrame?: number; // 0, 1, 2
  actionState?: 'idle' | 'walk' | 'sit' | 'coffee' | 'smoke';
  skinColor?: string;
  headwearId?: string;
  headwearColor?: string;
  outfitId?: string;
  outfitColor?: string;
  bootsColor?: string;
  width?: number;
  height?: number;
  className?: string;
}

/**
 * GbaCharacterSprite - 1:1 Pixel-Exact Pokémon Gen III (Emerald/Ruby) Overworld Trainer
 * Crafted with exact 16x21 pixel matrix matching Brendan in Littleroot Town.
 */
export const GbaCharacterSprite: React.FC<GbaCharacterSpriteProps> = ({
  direction = 'down',
  walkFrame = 0,
  actionState = 'idle',
  skinColor = '#F8C898',
  headwearId = 'helmet_white',
  headwearColor = '#FFFFFF',
  outfitId = 'uniform_tbp',
  outfitColor = '#84CC16',
  bootsColor = '#22C55E',
  width = 32, // default 2x scale of 16px
  height = 42, // default 2x scale of 21px
  className = ''
}) => {
  const isWalking = actionState === 'walk';
  const isSitting = actionState === 'sit';
  const isCoffee = actionState === 'coffee';
  const isSmoking = actionState === 'smoke';

  // Allow sitting avatars to face down, left, or right as specified
  const effectiveDirection = direction;

  // Walk bobbing (0 = standing, 1 = left step, 2 = right step)
  const step = isWalking ? (walkFrame % 3) : 0;
  const bobY = isSitting ? 2 : (step > 0 ? 0 : 0);

  // Palettes
  const skin = skinColor || '#F8C898';
  const skinDark = '#D89868';
  const darkOutline = '#181820'; // Gen III 1px black outline
  const hairColor = '#282830'; // Dark brown/black hair like Brendan

  // Helmet colors
  let helmetBase = headwearColor || '#FFFFFF';
  let helmetShade = '#CBD5E1';
  let helmetBadge = '#15803D'; // Harita green badge

  if (headwearId === 'helmet_yellow') {
    helmetBase = '#FACC15';
    helmetShade = '#CA8A04';
  } else if (headwearId === 'helmet_red') {
    helmetBase = '#DC2626';
    helmetShade = '#991B1B';
  } else if (headwearId === 'helmet_blue') {
    helmetBase = '#2563EB';
    helmetShade = '#1D4ED8';
  } else if (headwearId === 'cap_navy') {
    helmetBase = '#1E3A8A';
    helmetShade = '#172554';
  }

  // Outfit colors
  let shirt = outfitColor || '#84CC16'; // TBP Fluo-Lime
  let shirtShade = '#4D7C0F';
  let scotlight = '#E2E8F0'; // Silver reflective band
  let pants = '#1E293B'; // Dark navy trousers
  let pantsShade = '#0F172A';

  if (outfitId === 'lab_coat') {
    shirt = '#F8FAFC';
    shirtShade = '#CBD5E1';
    scotlight = '#0D9488'; // Teal trim
    pants = '#334155';
    pantsShade = '#1E293B';
  } else if (outfitId === 'vest_orange') {
    shirt = '#EA580C';
    shirtShade = '#9A3412';
    scotlight = '#F8FAFC';
  }

  // Shoes
  const shoes = bootsColor || '#22C55E'; // Emerald green running shoes
  const shoesShade = '#15803D';

  // -------------------------------------------------------------
  // 1. DIRECTION: DOWN (FACING CAMERA - Exact Brendan Pose)
  // -------------------------------------------------------------
  if (effectiveDirection === 'down') {
    return (
      <svg 
        viewBox="0 0 16 21" 
        width={width} 
        height={height} 
        className={className}
        style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      >
        {/* Drop shadow on ground (neutral shade, hidden when sitting on a bench) */}
        {!isSitting && (
          <ellipse cx="8" cy="20" rx="5" ry="1.2" fill="#000000" opacity="0.3" />
        )}

        <g transform={`translate(0, ${bobY})`}>
          {/* --- HELMET / HAT (Rows 1 - 4) --- */}
          {/* Outline */}
          <rect x="5" y="1" width="6" height="1" fill={darkOutline} />
          <rect x="4" y="2" width="8" height="1" fill={darkOutline} />
          <rect x="3" y="3" width="10" height="2" fill={darkOutline} />

          {/* Helmet Dome */}
          <rect x="5" y="2" width="6" height="1" fill={helmetBase} />
          <rect x="4" y="3" width="8" height="1" fill={helmetBase} />
          {/* Helmet Brim / Band */}
          <rect x="4" y="4" width="8" height="1" fill={helmetShade} />
          {/* Center Harita Safety Emblem */}
          <rect x="7" y="3" width="2" height="2" fill={helmetBadge} />

          {/* Hair peeking from sides */}
          <rect x="3" y="4" width="1" height="3" fill={hairColor} />
          <rect x="12" y="4" width="1" height="3" fill={hairColor} />

          {/* --- FACE (Rows 5 - 7) --- */}
          {/* Face Base */}
          <rect x="4" y="5" width="8" height="2" fill={skin} />
          <rect x="5" y="7" width="6" height="1" fill={skinDark} />
          {/* Eyes (2 vertical black dots matching Gen III) */}
          <rect x="5" y="5" width="1" height="2" fill={darkOutline} />
          <rect x="10" y="5" width="1" height="2" fill={darkOutline} />
          {/* Nose/mouth shadow */}
          <rect x="7" y="7" width="2" height="1" fill={darkOutline} />

          {/* --- TORSO & UNIFORM (Rows 8 - 12) --- */}
          {/* Torso Outline */}
          <rect x="3" y="8" width="10" height="1" fill={darkOutline} />
          <rect x="2" y="9" width="12" height="4" fill={darkOutline} />

          {/* Shirt Body (TBP Lime Fluo) */}
          <rect x="4" y="8" width="8" height="4" fill={shirt} />
          <rect x="3" y="9" width="1" height="3" fill={shirtShade} />
          <rect x="12" y="9" width="1" height="3" fill={shirtShade} />

          {/* Reflective Scotlight Stripe */}
          <rect x="4" y="10" width="8" height="1" fill={scotlight} />
          {/* Collar Notch */}
          <rect x="7" y="8" width="2" height="1" fill={skin} />

          {/* Hands */}
          <rect x="2" y="11" width="2" height="2" fill={skin} />
          <rect x="12" y="11" width="2" height="2" fill={skin} />

          {/* Belt */}
          <rect x="4" y="12" width="8" height="1" fill={darkOutline} />
          <rect x="7" y="12" width="2" height="1" fill="#FACC15" />

          {/* --- PANTS & LEGS (Rows 13 - 17) --- */}
          {isSitting ? (
            /* Sitting legs bent forward */
            <g>
              <rect x="3" y="13" width="10" height="3" fill={pants} />
              <rect x="3" y="14" width="10" height="1" fill={pantsShade} />
              <rect x="3" y="16" width="4" height="2" fill={shoes} />
              <rect x="9" y="16" width="4" height="2" fill={shoes} />
            </g>
          ) : (
            /* Standing / Walking Legs */
            <g>
              {/* Left Leg */}
              <rect x="4" y="13" width="3" height={step === 1 ? 4 : 3} fill={pants} />
              <rect x="4" y="13" width="1" height={step === 1 ? 4 : 3} fill={pantsShade} />
              {/* Right Leg */}
              <rect x="9" y="13" width="3" height={step === 2 ? 4 : 3} fill={pants} />
              <rect x="11" y="13" width="1" height={step === 2 ? 4 : 3} fill={pantsShade} />

              {/* Shoes (Gen III Running Shoes with white sole) */}
              {/* Left Shoe */}
              <rect x="4" y={step === 1 ? 17 : 16} width="3" height="2" fill={shoes} />
              <rect x="4" y={step === 1 ? 18 : 17} width="3" height="1" fill="#FFFFFF" />
              {/* Right Shoe */}
              <rect x="9" y={step === 2 ? 17 : 16} width="3" height="2" fill={shoes} />
              <rect x="9" y={step === 2 ? 18 : 17} width="3" height="1" fill="#FFFFFF" />
            </g>
          )}

          {/* Special Props: Coffee Mug */}
          {isCoffee && (
            <g transform="translate(11, 9)">
              <rect x="0" y="0" width="3" height="3" fill="#FFFFFF" />
              <rect x="1" y="1" width="1" height="1" fill="#78350F" />
              {/* Steam dots */}
              <rect x="1" y="-2" width="1" height="1" fill="#FFFFFF" opacity="0.8" />
              <rect x="2" y="-3" width="1" height="1" fill="#FFFFFF" opacity="0.6" />
            </g>
          )}

          {/* Special Props: Cigarette for Gazebo */}
          {isSmoking && (
            <g transform="translate(9, 6)">
              <rect x="0" y="1" width="4" height="1" fill="#FFFFFF" />
              {/* Burning cherry */}
              <rect x="4" y="1" width="1" height="1" fill="#EF4444" />
              {/* Smoke puff */}
              <circle cx="5" cy="-1" r="1.5" fill="#E2E8F0" opacity="0.7" />
            </g>
          )}
        </g>
      </svg>
    );
  }

  // -------------------------------------------------------------
  // 2. DIRECTION: UP (FACING AWAY - Backpack Visible)
  // -------------------------------------------------------------
  if (effectiveDirection === 'up') {
    return (
      <svg 
        viewBox="0 0 16 21" 
        width={width} 
        height={height} 
        className={className}
        style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
      >
        {/* Drop shadow on ground (neutral shade, hidden when sitting) */}
        {!isSitting && (
          <ellipse cx="8" cy="20" rx="5" ry="1.2" fill="#000000" opacity="0.3" />
        )}

        <g transform={`translate(0, ${bobY})`}>
          {/* Helmet from Behind */}
          <rect x="5" y="1" width="6" height="1" fill={darkOutline} />
          <rect x="4" y="2" width="8" height="1" fill={darkOutline} />
          <rect x="3" y="3" width="10" height="3" fill={darkOutline} />
          <rect x="5" y="2" width="6" height="1" fill={helmetBase} />
          <rect x="4" y="3" width="8" height="2" fill={helmetBase} />
          <rect x="4" y="5" width="8" height="1" fill={helmetShade} />

          {/* Dark Hair Nape */}
          <rect x="4" y="6" width="8" height="2" fill={hairColor} />

          {/* Torso & Backpack */}
          <rect x="3" y="8" width="10" height="5" fill={darkOutline} />
          <rect x="4" y="8" width="8" height="4" fill={shirt} />
          {/* Big Field Backpack (like Brendan's green/yellow backpack) */}
          <rect x="5" y="8" width="6" height="5" fill="#15803D" />
          <rect x="6" y="9" width="4" height="3" fill="#22C55E" />
          <rect x="6" y="11" width="4" height="1" fill="#FACC15" />

          {/* Arms at sides */}
          <rect x="2" y="9" width="2" height="3" fill={shirtShade} />
          <rect x="12" y="9" width="2" height="3" fill={shirtShade} />

          {/* Legs & Shoes */}
          <rect x="4" y="13" width="3" height={step === 1 ? 4 : 3} fill={pants} />
          <rect x="9" y="13" width="3" height={step === 2 ? 4 : 3} fill={pants} />
          <rect x="4" y={step === 1 ? 17 : 16} width="3" height="2" fill={shoes} />
          <rect x="9" y={step === 2 ? 17 : 16} width="3" height="2" fill={shoes} />
        </g>
      </svg>
    );
  }

  // -------------------------------------------------------------
  // 3. DIRECTION: LEFT or RIGHT (PROFILE WALK)
  // -------------------------------------------------------------
  const isRight = effectiveDirection === 'right';
  const flip = isRight ? 'scale(-1, 1) translate(-16, 0)' : '';

  return (
    <svg 
      viewBox="0 0 16 21" 
      width={width} 
      height={height} 
      className={className}
      style={{ shapeRendering: 'crispEdges', imageRendering: 'pixelated' }}
    >
      {/* Drop shadow on ground (neutral shade, hidden when sitting) */}
      {!isSitting && (
        <ellipse cx="8" cy="20" rx="5" ry="1.2" fill="#000000" opacity="0.3" />
      )}

      <g transform={`translate(0, ${bobY}) ${flip}`}>
        {/* Helmet Profile */}
        <rect x="4" y="1" width="7" height="1" fill={darkOutline} />
        <rect x="3" y="2" width="9" height="1" fill={darkOutline} />
        <rect x="2" y="3" width="10" height="2" fill={darkOutline} />
        <rect x="4" y="2" width="7" height="1" fill={helmetBase} />
        <rect x="3" y="3" width="8" height="2" fill={helmetBase} />
        {/* Brim extending to the left */}
        <rect x="1" y="4" width="3" height="1" fill={helmetShade} />

        {/* Face Profile */}
        <rect x="2" y="5" width="7" height="2" fill={skin} />
        {/* Eye */}
        <rect x="3" y="5" width="1" height="2" fill={darkOutline} />
        {/* Hair at back of head */}
        <rect x="8" y="4" width="3" height="3" fill={hairColor} />

        {/* Torso & Backpack on Back */}
        <rect x="3" y="8" width="7" height="5" fill={shirt} />
        <rect x="4" y="10" width="6" height="1" fill={scotlight} />
        {/* Backpack hanging behind */}
        <rect x="9" y="8" width="3" height="4" fill="#15803D" />

        {/* Arm swinging */}
        {step === 1 ? (
          <rect x="2" y="9" width="3" height="3" fill={shirtShade} />
        ) : step === 2 ? (
          <rect x="6" y="9" width="3" height="3" fill={shirtShade} />
        ) : (
          <rect x="4" y="9" width="2" height="4" fill={shirtShade} />
        )}
        <rect x={step === 1 ? 1 : step === 2 ? 7 : 4} y="11" width="2" height="2" fill={skin} />

        {/* Legs Profile */}
        {isSitting ? (
          /* Sitting Profile: Thigh extends forward towards face direction, shin drops down */
          <g>
            <rect x="2" y="13" width="6" height="3" fill={pants} />
            <rect x="2" y="14" width="6" height="1" fill={pantsShade} />
            <rect x="2" y="16" width="3" height="2" fill={shoes} />
            <rect x="2" y="17" width="3" height="1" fill={shoesShade} />
          </g>
        ) : step === 1 ? (
          /* Stride forward */
          <g>
            <rect x="2" y="13" width="3" height="3" fill={pants} />
            <rect x="1" y="16" width="4" height="2" fill={shoes} />
            <rect x="7" y="13" width="3" height="3" fill={pantsShade} />
            <rect x="7" y="16" width="3" height="2" fill={shoesShade} />
          </g>
        ) : step === 2 ? (
          /* Stride backward */
          <g>
            <rect x="6" y="13" width="3" height="3" fill={pants} />
            <rect x="6" y="16" width="4" height="2" fill={shoes} />
            <rect x="2" y="13" width="3" height="3" fill={pantsShade} />
            <rect x="1" y="16" width="3" height="2" fill={shoesShade} />
          </g>
        ) : (
          /* Standing */
          <g>
            <rect x="4" y="13" width="4" height="3" fill={pants} />
            <rect x="3" y="16" width="5" height="2" fill={shoes} />
            <rect x="3" y="17" width="5" height="1" fill="#FFFFFF" />
          </g>
        )}
      </g>
    </svg>
  );
};
