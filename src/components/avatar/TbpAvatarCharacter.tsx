import React from 'react';

export interface TbpAvatarProps {
  actionState?: 'idle' | 'walk' | 'coffee' | 'inspect' | 'jump' | 'smoke' | 'sit' | 'smoke_sit' | 'coffee_sit';
  walkFrame?: number;
  facing?: 'left' | 'right';
  skinColor?: string;
  skinShadow?: string;
  headwearId?: string;
  headwearColor?: string;
  outfitId?: string;
  outfitColor?: string;
  eyeId?: string;
  accessoryId?: string;
  bootsId?: string;
  bootsColor?: string;
  userName?: string;
  userNik?: string;
  className?: string;
  width?: number;
  height?: number;
}

/**
 * TbpAvatarCharacter - Authentic Pokémon GBA (Gen III: Ruby/Sapphire/Emerald) Style
 * Overworld Trainer Pixel Art Sprite for PrepLab Nickel Mining & Laboratory Personnel.
 * 
 * Features:
 * - 16-bit GBA overworld sprite proportions (chibi trainer aesthetic like Brendan / May)
 * - Pixel-perfect rendering using SVG crispEdges (no blur, scales sharply at any resolution)
 * - TBP Mining equipment: White Hard Hat with Green Emblem, High-vis Lime Uniform, Scotlight bands
 * - Lab attire: Chemical Lab Coat, K3 Safety Vests, Respirator Mask, Safety Boots
 * - Authentic 4-direction & frame animations: Idle breathing, Walk cycle, Sit, Coffee, Smoke, Jump
 */
export const TbpAvatarCharacter: React.FC<TbpAvatarProps> = ({
  actionState = 'idle',
  walkFrame = 0,
  facing = 'right',
  skinColor = '#F1C27D',
  skinShadow = '#C68642',
  headwearId = 'helmet_white',
  headwearColor = '#FFFFFF',
  outfitId = 'uniform_tbp',
  outfitColor = '#84CC16',
  eyeId = 'glasses_k3',
  accessoryId = 'lanyard',
  bootsId = 'boots_brown',
  bootsColor = '#A26B38',
  userName = 'RANGER',
  className = '',
  width = 96,
  height = 128
}) => {
  const isSitting = actionState === 'sit' || actionState === 'smoke_sit' || actionState === 'coffee_sit';
  const isSmoking = actionState === 'smoke' || actionState === 'smoke_sit';
  const isCoffee = actionState === 'coffee' || actionState === 'coffee_sit';
  const isJumping = actionState === 'jump';
  const isWalking = actionState === 'walk';
  const isInspecting = actionState === 'inspect';

  // Walk cycle frame offsets (4 frames: 0, 1, 2, 3)
  const f = walkFrame % 4;
  let bodyY = 0;
  let legLeftOffset = 0;
  let legRightOffset = 0;
  let armLeftAngle = 0;
  let armRightAngle = 0;

  if (isSitting) {
    bodyY = 4;
  } else if (isJumping) {
    bodyY = -6;
  } else if (isWalking) {
    if (f === 0) {
      bodyY = 0;
      legLeftOffset = -2;
      legRightOffset = 2;
      armLeftAngle = 3;
      armRightAngle = -3;
    } else if (f === 1) {
      bodyY = -1;
      legLeftOffset = 0;
      legRightOffset = 0;
      armLeftAngle = 0;
      armRightAngle = 0;
    } else if (f === 2) {
      bodyY = 0;
      legLeftOffset = 2;
      legRightOffset = -2;
      armLeftAngle = -3;
      armRightAngle = 3;
    } else {
      bodyY = -1;
      legLeftOffset = 0;
      legRightOffset = 0;
      armLeftAngle = 0;
      armRightAngle = 0;
    }
  } else {
    // Idle gentle breathing: alternate 0 and -1 on frame ticks
    bodyY = (f % 2 === 0) ? 0 : -0.5;
  }

  // Palette mapping
  const skin = skinColor || '#F1C27D';
  const skinDark = skinShadow || '#C68642';
  const outline = '#1F2937'; // GBA character dark outline
  const highlight = '#FFFFFF';

  // Outfit base colors
  let shirtColor = '#84CC16'; // TBP lime green default
  let shirtDark = '#4D7C0F';
  let scotlightColor = '#E2E8F0';
  let pantsColor = '#1E293B'; // Navy trousers default
  let pantsDark = '#0F172A';

  if (outfitId === 'lab_coat') {
    shirtColor = '#F8FAFC';
    shirtDark = '#CBD5E1';
    scotlightColor = '#0D9488'; // Teal trim on lab coat
    pantsColor = '#334155';
    pantsDark = '#1E293B';
  } else if (outfitId === 'vest_orange') {
    shirtColor = '#EA580C';
    shirtDark = '#9A3412';
    scotlightColor = '#FEF08A';
    pantsColor = '#1E293B';
    pantsDark = '#0F172A';
  } else if (outfitId === 'vest_green') {
    shirtColor = '#16A34A';
    shirtDark = '#166534';
    scotlightColor = '#F8FAFC';
  } else if (outfitId === 'wearpack_navy') {
    shirtColor = '#1E3A8A';
    shirtDark = '#172554';
    scotlightColor = '#F97316';
    pantsColor = '#1E3A8A';
    pantsDark = '#172554';
  } else if (outfitId === 'wearpack_red') {
    shirtColor = '#DC2626';
    shirtDark = '#991B1B';
    scotlightColor = '#FACC15';
    pantsColor = '#DC2626';
    pantsDark = '#991B1B';
  } else if (outfitId === 'suit_spv') {
    shirtColor = '#334155';
    shirtDark = '#0F172A';
    scotlightColor = '#EF4444';
  } else if (outfitColor) {
    shirtColor = outfitColor;
  }

  // Headwear colors
  let hatColor = headwearColor || '#FFFFFF';
  let hatDark = '#CBD5E1';
  let hatEmblem = '#15803D'; // Green TBP emblem default

  if (headwearId === 'helmet_yellow') {
    hatColor = '#FACC15';
    hatDark = '#CA8A04';
    hatEmblem = '#166534';
  } else if (headwearId === 'helmet_red') {
    hatColor = '#DC2626';
    hatDark = '#991B1B';
    hatEmblem = '#FFFFFF';
  } else if (headwearId === 'helmet_blue') {
    hatColor = '#2563EB';
    hatDark = '#1D4ED8';
    hatEmblem = '#FFFFFF';
  } else if (headwearId === 'cap_navy') {
    hatColor = '#1E3A8A';
    hatDark = '#172554';
    hatEmblem = '#F97316';
  } else if (headwearId === 'hijab_k3') {
    hatColor = '#EAB308';
    hatDark = '#A16207';
    hatEmblem = '#166534';
  } else if (headwearId === 'crown_champion') {
    hatColor = '#F59E0B';
    hatDark = '#B45309';
    hatEmblem = '#DC2626';
  }

  // Boots
  let bootBase = bootsColor || '#A26B38';
  let bootDark = '#6D3D14';
  if (bootsId === 'boots_black') {
    bootBase = '#1E293B';
    bootDark = '#0F172A';
  } else if (bootsId === 'boots_grey') {
    bootBase = '#64748B';
    bootDark = '#334155';
  } else if (bootsId === 'boots_yellow') {
    bootBase = '#EAB308';
    bootDark = '#A16207';
  }

  // Flip horizontally if facing left
  const transformFlip = facing === 'left' ? 'scale(-1, 1) translate(-28, 0)' : 'none';

  return (
    <svg
      viewBox="0 0 28 36"
      width={width}
      height={height}
      className={`select-none overflow-visible ${className}`}
      style={{
        imageRendering: 'pixelated',
        shapeRendering: 'crispEdges'
      }}
    >
      <defs>
        {/* Subtle drop shadow for GBA sprites */}
        <filter id="gbaSpriteShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="0" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* 1. GBA Ground Shadow (Round oval under feet) */}
      <ellipse
        cx="14"
        cy={isSitting ? "33" : "33"}
        rx={isJumping ? "4" : "7"}
        ry={isJumping ? "1.5" : "2.5"}
        fill="#000000"
        opacity={isJumping ? "0.2" : "0.35"}
      />

      {/* 2. Main Character Body Group (with horizontal flip & vertical bounce) */}
      <g transform={`translate(0, ${bodyY})`}>
        <g transform={transformFlip}>
          {/* --- LEGS & BOOTS --- */}
          {!isSitting ? (
            <g id="legsStanding">
              {/* Left Leg */}
              <rect x="9" y={22 + legLeftOffset} width="4" height="6" fill={pantsColor} stroke={outline} strokeWidth="0.6" />
              {/* Left Knee Scotlight Band */}
              <rect x="9.3" y={24 + legLeftOffset} width="3.4" height="1" fill={scotlightColor} />
              {/* Left Boot */}
              <rect x="8.5" y={27 + legLeftOffset} width="5" height="4" fill={bootBase} stroke={outline} strokeWidth="0.6" />
              <rect x="8.5" y={30 + legLeftOffset} width="5" height="1" fill={bootDark} />
              <rect x="11.5" y={28 + legLeftOffset} width="2" height="1" fill={highlight} opacity="0.5" />

              {/* Right Leg */}
              <rect x="15" y={22 + legRightOffset} width="4" height="6" fill={pantsColor} stroke={outline} strokeWidth="0.6" />
              {/* Right Knee Scotlight Band */}
              <rect x="15.3" y={24 + legRightOffset} width="3.4" height="1" fill={scotlightColor} />
              {/* Right Boot */}
              <rect x="14.5" y={27 + legRightOffset} width="5" height="4" fill={bootBase} stroke={outline} strokeWidth="0.6" />
              <rect x="14.5" y={30 + legRightOffset} width="5" height="1" fill={bootDark} />
              <rect x="17.5" y={28 + legRightOffset} width="2" height="1" fill={highlight} opacity="0.5" />
            </g>
          ) : (
            <g id="legsSitting">
              {/* Bent Trousers Forward */}
              <rect x="8" y="24" width="12" height="4" fill={pantsColor} stroke={outline} strokeWidth="0.6" />
              <rect x="9" y="25" width="10" height="1.2" fill={scotlightColor} />
              {/* Folded Boots Front */}
              <rect x="7" y="27" width="6" height="4" fill={bootBase} stroke={outline} strokeWidth="0.6" />
              <rect x="7" y="30" width="6" height="1" fill={bootDark} />
              <rect x="15" y="27" width="6" height="4" fill={bootBase} stroke={outline} strokeWidth="0.6" />
              <rect x="15" y="30" width="6" height="1" fill={bootDark} />
            </g>
          )}

          {/* --- TORSO & SHIRT --- */}
          <g id="torso">
            {/* Base Shirt Block */}
            <rect x="8" y="13" width="12" height="10" fill={shirtColor} stroke={outline} strokeWidth="0.6" />
            <rect x="8" y="21" width="12" height="2" fill={shirtDark} />

            {/* Scotlight Bands (Horizontal Double Stripes on TBP Uniform) */}
            <rect x="8.3" y="16" width="11.4" height="1.2" fill={scotlightColor} />
            <rect x="8.3" y="19" width="11.4" height="1.2" fill={scotlightColor} />

            {/* Left Chest TBP Pocket / Badge */}
            <rect x="9.5" y="14" width="3" height="2" fill={shirtDark} stroke={outline} strokeWidth="0.4" />
            <rect x="10" y="14.5" width="1.2" height="1" fill="#15803D" />

            {/* Right Chest White Name Tag */}
            <rect x="15.5" y="14" width="3" height="1.5" fill="#FFFFFF" stroke={outline} strokeWidth="0.3" />

            {/* Central Zipper / Button Line */}
            <line x1="14" y1="13" x2="14" y2="23" stroke={outline} strokeWidth="0.5" />

            {/* Lanyard Accessory if equipped */}
            {accessoryId === 'lanyard' && (
              <g id="lanyard">
                <path d="M 12 13 L 14 17 L 16 13" fill="none" stroke="#EF4444" strokeWidth="0.6" />
                <rect x="13" y="17" width="2" height="2.5" fill="#FFFFFF" stroke={outline} strokeWidth="0.3" />
                <rect x="13.3" y="17.3" width="1.4" height="1" fill="#3B82F6" />
              </g>
            )}

            {/* Radio HT on Belt */}
            {accessoryId === 'radio_ht' && (
              <g id="radioHt">
                <rect x="19.5" y="18" width="2" height="4" fill="#374151" stroke={outline} strokeWidth="0.4" />
                <line x1="20.5" y1="18" x2="20.5" y2="15" stroke="#111827" strokeWidth="0.5" />
              </g>
            )}
          </g>

          {/* --- ARMS & HANDS --- */}
          <g id="arms">
            {/* Left Arm (Behind / Swing) */}
            <g transform={`rotate(${armLeftAngle}, 7, 14)`}>
              <rect x="5.5" y="14" width="3" height="7" fill={shirtColor} stroke={outline} strokeWidth="0.5" />
              <rect x="5.5" y="17" width="3" height="1" fill={scotlightColor} />
              <rect x="5.5" y="20" width="3" height="2" fill={skin} stroke={outline} strokeWidth="0.5" />
            </g>

            {/* Right Arm (Foreground / Interactions) */}
            <g transform={`rotate(${armRightAngle}, 21, 14)`}>
              {isSmoking ? (
                // Smoking pose: right hand raised towards mouth
                <g id="smokingArm">
                  <path d="M 19 14 L 22 17 L 18 17" fill={shirtColor} stroke={outline} strokeWidth="0.5" />
                  <rect x="16" y="15" width="2.5" height="2.5" fill={skin} stroke={outline} strokeWidth="0.4" />
                  {/* Cigarette with orange ember */}
                  <rect x="14" y="15" width="2.5" height="0.8" fill="#FFFFFF" />
                  <rect x="13.2" y="15" width="0.8" height="0.8" fill="#F97316" />
                  {/* Smoke puff */}
                  <circle cx="12" cy="14" r="0.8" fill="#E2E8F0" opacity="0.8" />
                  <circle cx="10.5" cy="12.5" r="1.2" fill="#CBD5E1" opacity="0.6" />
                </g>
              ) : isCoffee ? (
                // Coffee pose: holding mug
                <g id="coffeeArm">
                  <rect x="19.5" y="14" width="3" height="5" fill={shirtColor} stroke={outline} strokeWidth="0.5" />
                  <rect x="19.5" y="18" width="3" height="2" fill={skin} stroke={outline} strokeWidth="0.4" />
                  {/* Ceramic Coffee Mug */}
                  <rect x="18" y="16" width="3.5" height="4" fill="#FFFFFF" stroke={outline} strokeWidth="0.4" />
                  <rect x="18.5" y="16.5" width="2.5" height="1" fill="#78350F" />
                  <rect x="21.5" y="17" width="1" height="2" fill="none" stroke={outline} strokeWidth="0.4" />
                  {/* Steam curls */}
                  <path d="M 19 14 Q 20 13 19 12" fill="none" stroke="#CBD5E1" strokeWidth="0.5" opacity="0.8" />
                </g>
              ) : isInspecting ? (
                // Inspecting pose: holding magnifying glass / sample test vial
                <g id="inspectArm">
                  <rect x="19.5" y="14" width="3" height="6" fill={shirtColor} stroke={outline} strokeWidth="0.5" />
                  <rect x="19.5" y="19" width="3" height="2" fill={skin} stroke={outline} strokeWidth="0.4" />
                  <circle cx="21" cy="21" r="2" fill="#38BDF8" opacity="0.6" stroke={outline} strokeWidth="0.4" />
                  <line x1="21" y1="23" x2="21" y2="25" stroke="#78350F" strokeWidth="0.6" />
                </g>
              ) : (
                // Normal arm
                <g>
                  <rect x="19.5" y="14" width="3" height="7" fill={shirtColor} stroke={outline} strokeWidth="0.5" />
                  <rect x="19.5" y="17" width="3" height="1" fill={scotlightColor} />
                  <rect x="19.5" y="20" width="3" height="2" fill={skin} stroke={outline} strokeWidth="0.5" />
                </g>
              )}
            </g>
          </g>

          {/* --- HEAD & FACE --- */}
          <g id="head">
            {/* Neck */}
            <rect x="12" y="11" width="4" height="3" fill={skinDark} />

            {/* Head Base (Classic GBA 16-bit rounded block) */}
            <rect x="7" y="3" width="14" height="10" rx="1.5" fill={skin} stroke={outline} strokeWidth="0.6" />
            {/* Ear */}
            <rect x="5.8" y="6" width="1.5" height="2.5" fill={skin} stroke={outline} strokeWidth="0.4" />
            <rect x="20.7" y="6" width="1.5" height="2.5" fill={skin} stroke={outline} strokeWidth="0.4" />

            {/* Hair Behind Helmet (Sideburns & Back) */}
            {headwearId !== 'hijab_k3' && (
              <g id="hairBase">
                <rect x="6.5" y="5" width="2" height="4" fill="#1E293B" />
                <rect x="19.5" y="5" width="2" height="4" fill="#1E293B" />
                <rect x="8" y="10" width="12" height="2" fill="#1E293B" />
              </g>
            )}

            {/* Face Details: Eyes, Eyebrows, Nose */}
            <g id="faceFeatures">
              {eyeId === 'wink' ? (
                <>
                  {/* Left Eye: Normal */}
                  <rect x="10" y="6.5" width="1.8" height="2.2" fill="#0F172A" />
                  <rect x="10.2" y="6.7" width="0.8" height="0.8" fill="#FFFFFF" />
                  {/* Right Eye: Wink Line */}
                  <line x1="16" y1="7.5" x2="18" y2="7.5" stroke="#0F172A" strokeWidth="0.8" />
                </>
              ) : eyeId === 'happy' || eyeId === 'laugh' ? (
                <>
                  {/* Happy Curved Cheerful Eyes */}
                  <path d="M 9.5 7 Q 11 5.5 12.5 7" fill="none" stroke="#0F172A" strokeWidth="0.8" />
                  <path d="M 15.5 7 Q 17 5.5 18.5 7" fill="none" stroke="#0F172A" strokeWidth="0.8" />
                </>
              ) : (
                <>
                  {/* Standard GBA Trainer Eyes */}
                  <rect x="10" y="6.5" width="1.8" height="2.5" fill="#0F172A" />
                  <rect x="10.2" y="6.7" width="0.8" height="0.8" fill="#FFFFFF" />
                  <rect x="16.2" y="6.5" width="1.8" height="2.5" fill="#0F172A" />
                  <rect x="16.4" y="6.7" width="0.8" height="0.8" fill="#FFFFFF" />
                </>
              )}

              {/* Eyebrows */}
              <line x1="9.5" y1="5.5" x2="12" y2="5.5" stroke="#0F172A" strokeWidth="0.5" />
              <line x1="16" y1="5.5" x2="18.5" y2="5.5" stroke="#0F172A" strokeWidth="0.5" />

              {/* Cute Cheek Blush (Pokémon style) */}
              <rect x="8.5" y="8.5" width="1.5" height="1" fill="#F43F5E" opacity="0.4" />
              <rect x="18" y="8.5" width="1.5" height="1" fill="#F43F5E" opacity="0.4" />

              {/* Mouth / Smile */}
              <rect x="13.2" y="9.5" width="1.6" height="0.8" fill="#991B1B" />

              {/* Beard / Mustache if selected */}
              {eyeId === 'kumis_jenggot' && (
                <rect x="12" y="9" width="4" height="1" fill="#1E293B" />
              )}

              {/* K3 Dust Respirator Mask if equipped */}
              {accessoryId === 'mask_k3' && (
                <g id="respiratorMask">
                  <path d="M 9 8.5 L 19 8.5 L 17 11.5 L 11 11.5 Z" fill="#06B6D4" stroke={outline} strokeWidth="0.4" />
                  <circle cx="14" cy="9.8" r="0.8" fill="#FFFFFF" />
                </g>
              )}

              {/* Safety Glasses K3 */}
              {eyeId === 'glasses_k3' && (
                <g id="safetyGlasses">
                  <rect x="9" y="5.8" width="3.5" height="3" fill="#38BDF8" opacity="0.5" stroke={outline} strokeWidth="0.5" />
                  <rect x="15.5" y="5.8" width="3.5" height="3" fill="#38BDF8" opacity="0.5" stroke={outline} strokeWidth="0.5" />
                  <line x1="12.5" y1="6.8" x2="15.5" y2="6.8" stroke={outline} strokeWidth="0.5" />
                </g>
              )}
            </g>

            {/* --- HEADWEAR (HELMET / HIJAB / CAP) --- */}
            {headwearId === 'hijab_k3' ? (
              // Syari K3 Hijab (framing face in warm gold with K3 cross)
              <g id="hijabK3">
                <path d="M 6 3 Q 14 -1 22 3 L 23 12 L 20 15 L 8 15 L 5 12 Z" fill={hatColor} stroke={outline} strokeWidth="0.6" opacity="0.95" />
                {/* Face opening */}
                <ellipse cx="14" cy="7.5" rx="5" ry="4.5" fill="none" stroke={outline} strokeWidth="0.5" />
                {/* K3 Green Pin */}
                <rect x="13" y="1" width="2" height="2" fill={hatEmblem} />
              </g>
            ) : headwearId === 'crown_champion' ? (
              // Champion Golden Crown
              <g id="crownChampion">
                <polygon points="7,4 9,0 12,3 14,-1 16,3 19,0 21,4" fill={hatColor} stroke={outline} strokeWidth="0.5" />
                <rect x="7" y="3" width="14" height="2" fill={hatDark} stroke={outline} strokeWidth="0.5" />
                <circle cx="14" cy="1" r="0.8" fill="#DC2626" />
              </g>
            ) : headwearId === 'cap_navy' ? (
              // Project Cap
              <g id="projectCap">
                <path d="M 7 4 Q 14 -1 21 4 L 21 6 L 7 6 Z" fill={hatColor} stroke={outline} strokeWidth="0.6" />
                {/* Visor / Brim */}
                <path d="M 6 6 L 24 6 L 23 7.5 L 6 7.5 Z" fill={hatDark} stroke={outline} strokeWidth="0.5" />
              </g>
            ) : (
              // Official TBP Hard Hat (White/Yellow/Red/Blue) with Brim & Green Emblem
              <g id="tbpMiningHardHat">
                {/* Dome of Safety Helmet */}
                <path d="M 6.5 4 Q 14 -2 21.5 4 L 21.5 6.5 L 6.5 6.5 Z" fill={hatColor} stroke={outline} strokeWidth="0.6" />
                {/* Dome Highlight */}
                <path d="M 8 3 Q 14 0 20 3" fill="none" stroke="#FFFFFF" strokeWidth="0.7" opacity="0.8" />
                {/* Helmet Rigid Rib / Center Ridge */}
                <line x1="14" y1="-0.5" x2="14" y2="6.5" stroke={hatDark} strokeWidth="0.8" />

                {/* Stiff Protective Helmet Brim (Horizontal Overhang) */}
                <path d="M 5 6 Q 14 5 23 6 L 22.5 7.5 Q 14 6.8 5.5 7.5 Z" fill={hatDark} stroke={outline} strokeWidth="0.5" />

                {/* Official Green TBP Shield Emblem on Center Forehead */}
                <rect x="12.5" y="2.5" width="3" height="3" rx="0.5" fill={hatEmblem} stroke={outline} strokeWidth="0.4" />
                {/* Mini Cross / Star inside badge */}
                <line x1="14" y1="3" x2="14" y2="5" stroke="#FFFFFF" strokeWidth="0.6" />
                <line x1="13" y1="4" x2="15" y2="4" stroke="#FFFFFF" strokeWidth="0.6" />
              </g>
            )}
          </g>
        </g>

        {/* 3. Exclamation Bubble on Jump */}
        {isJumping && (
          <g id="jumpExclamation" transform="translate(19, -4)">
            <rect x="0" y="0" width="7" height="9" rx="2" fill="#FFFFFF" stroke={outline} strokeWidth="0.6" />
            <polygon points="1,9 4,9 0,12" fill="#FFFFFF" stroke={outline} strokeWidth="0.6" />
            <rect x="2.5" y="1.5" width="2" height="4" fill="#E11D48" />
            <rect x="2.5" y="6.5" width="2" height="1.5" fill="#E11D48" />
          </g>
        )}
      </g>
    </svg>
  );
};
