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
 * TbpAvatarCharacter
 * High-Definition, crisp vector SVG avatar representing personnel wearing
 * the official TBP (Trimegah Bangun Persada / Harita Nickel) mining uniform:
 * - White Hard Hat with official Green TBP emblem
 * - High-vis fluorescent lime-green shirt with dual silver scotlight bands on torso & sleeves
 * - Dual flap chest pockets, left chest TBP badge, right chest name tag
 * - Dark Navy Blue trousers with horizontal reflective silver scotlight band below knees
 * - Tan/brown leather safety boots with steel toe cap & rugged lug soles
 * - Smooth, non-pixelated geometry with vector anti-aliased curves and subtle gradients
 * - Interactive states: idle, walk, coffee, inspect, jump, sit, smoke, smoke_sit, coffee_sit
 */
export const TbpAvatarCharacter: React.FC<TbpAvatarProps> = ({
  actionState = 'idle',
  walkFrame = 0,
  facing = 'right',
  skinColor = '#E0AC69', // Sawo Matang default
  skinShadow = '#8D5524',
  headwearId = 'helmet_white', // Default Helm Putih TBP
  headwearColor = '#FFFFFF',
  outfitId = 'uniform_tbp', // Default Seragam TBP
  outfitColor = '#84CC16', // Fluo lime green
  eyeId = 'glasses_k3',
  accessoryId = 'lanyard',
  bootsId = 'boots_brown', // Tan/brown leather mining boots
  bootsColor = '#A26B38',
  userName = 'RANGER',
  userNik = '',
  className = '',
  width = 160,
  height = 220
}) => {
  // Format short name for chest badge
  const shortName = (userName || 'TBP').split(' ')[0].toUpperCase().slice(0, 7);

  // States: Sitting & Smoking & Coffee
  const isSitting = actionState === 'sit' || actionState === 'smoke_sit' || actionState === 'coffee_sit';
  const isSmoking = actionState === 'smoke' || actionState === 'smoke_sit';
  const isCoffee = actionState === 'coffee' || actionState === 'coffee_sit';

  // Dynamic animation offsets based on actionState and walkFrame
  let bodyBob = 0;
  let legAngleL = 0;
  let legAngleR = 0;
  let armAngleL = 0;
  let armAngleR = 0;

  if (isSitting) {
    // Natural seated spinal relaxation (slight 4-unit settle)
    bodyBob = 4;
    armAngleL = 18;
    // Hand positioning: if smoking, raise cigarette; if drinking coffee, raise mug; otherwise rest on knee
    if (isSmoking) {
      armAngleR = -52;
    } else if (actionState === 'coffee_sit') {
      armAngleR = -68; // Lifting ceramic mug while seated
    } else {
      armAngleR = 20;
    }
  } else if (actionState === 'smoke') {
    // Standing smoking
    bodyBob = (walkFrame % 2 === 0) ? -1 : 0;
    armAngleL = 0;
    armAngleR = -52;
  } else if (actionState === 'walk') {
    // 4-frame walk cycle
    if (walkFrame === 0) {
      bodyBob = -2;
      legAngleL = 18;
      legAngleR = -18;
      armAngleL = -20;
      armAngleR = 20;
    } else if (walkFrame === 1) {
      bodyBob = -4;
      legAngleL = 0;
      legAngleR = 0;
      armAngleL = 0;
      armAngleR = 0;
    } else if (walkFrame === 2) {
      bodyBob = -2;
      legAngleL = -18;
      legAngleR = 18;
      armAngleL = 20;
      armAngleR = -20;
    } else {
      bodyBob = -4;
      legAngleL = 0;
      legAngleR = 0;
      armAngleL = 0;
      armAngleR = 0;
    }
  } else if (actionState === 'jump') {
    bodyBob = -14;
    armAngleL = -45;
    armAngleR = -45;
    legAngleL = -8;
    legAngleR = 8;
  } else if (actionState === 'coffee') {
    bodyBob = (walkFrame % 2 === 0) ? -1 : 0;
    armAngleR = -70; // lifting mug
  } else if (actionState === 'inspect') {
    bodyBob = (walkFrame % 2 === 0) ? -1 : 0;
    armAngleR = -40; // holding scanner/clipboard
  } else {
    // Idle breathing (simulated if walkFrame ticks or neutral)
    bodyBob = (walkFrame % 2 === 0) ? -1 : 0;
  }

  // TBP Uniform Colors
  const isTbpUniform = outfitId === 'uniform_tbp' || !outfitId;
  const isLabCoat = outfitId === 'lab_coat';
  const isVest = outfitId.includes('vest');

  const shirtBase = isTbpUniform ? '#74D600' : (isLabCoat ? '#F8FAFC' : outfitColor);
  const shirtShadow = isTbpUniform ? '#529A00' : (isLabCoat ? '#CBD5E1' : '#4D7C0F');
  const pantsBase = isTbpUniform ? '#1E3A8A' : (outfitId.includes('wearpack') ? outfitColor : '#1E293B');
  const pantsShadow = isTbpUniform ? '#172554' : '#0F172A';
  const scotlightColor = '#E2E8F0';
  const scotlightShine = '#FFFFFF';

  const isTbpWhiteHelmet = headwearId === 'helmet_white' || headwearId === 'helmet_tbp';
  const isHelmet = headwearId.includes('helmet');

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 160 220"
      width={width}
      height={height}
      className={`select-none overflow-visible ${className}`}
      style={{
        transform: facing === 'left' ? 'scaleX(-1)' : 'none',
        transition: 'transform 0.15s ease-out'
      }}
    >
      <defs>
        {/* Shadow under feet / chair */}
        <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>

        {/* Silver scotlight reflection gradient */}
        <linearGradient id="scotlightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="45%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        {/* Shirt Fluo Lime Gradient */}
        <linearGradient id="limeShirtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#84CC16" />
          <stop offset="50%" stopColor="#74D600" />
          <stop offset="100%" stopColor="#65A30D" />
        </linearGradient>

        {/* Navy Pants Gradient */}
        <linearGradient id="navyPantsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="100%" stopColor="#172554" />
        </linearGradient>

        {/* Leather Safety Boots Gradient */}
        <linearGradient id="bootsLeatherGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#B47A46" />
          <stop offset="60%" stopColor="#925C2B" />
          <stop offset="100%" stopColor="#6D3D14" />
        </linearGradient>

        {/* Hard Hat Glossy Shine */}
        <linearGradient id="helmetWhiteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>

        {/* TBP Emblem Logo Definition */}
        <g id="tbpLogoBadge">
          {/* Hexagonal Green Shield */}
          <path
            d="M 0 -3.5 L 3.2 -1.8 L 3.2 1.8 L 0 3.5 L -3.2 1.8 L -3.2 -1.8 Z"
            fill="#15803D"
          />
          {/* Inner Light Green Leaves */}
          <circle cx="-1" cy="0" r="1.1" fill="#4ADE80" />
          <circle cx="1" cy="0" r="1.1" fill="#86EFAC" />
          <path d="M 0 -2 L 1.2 0.5 L -1.2 0.5 Z" fill="#FFFFFF" />
        </g>

        {/* Animated Smoke Puffs & Ember Keyframes for Cigarette */}
        <style>{`
          @keyframes smokeCurlA {
            0% { transform: translate(0, 0) scale(0.6); opacity: 0.85; }
            50% { transform: translate(-3px, -14px) scale(1.1); opacity: 0.55; }
            100% { transform: translate(-1px, -32px) scale(1.8); opacity: 0; }
          }
          @keyframes smokeCurlB {
            0% { transform: translate(0, 0) scale(0.5); opacity: 0.75; }
            50% { transform: translate(4px, -16px) scale(1.2); opacity: 0.45; }
            100% { transform: translate(2px, -36px) scale(2.0); opacity: 0; }
          }
          @keyframes emberPulse {
            0%, 100% { fill: #EF4444; filter: drop-shadow(0 0 1.5px #EF4444); }
            50% { fill: #F97316; filter: drop-shadow(0 0 3.5px #FFA500); }
          }
          .smoke-puff-a {
            animation: smokeCurlA 2.2s infinite cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: 15px -11px;
          }
          .smoke-puff-b {
            animation: smokeCurlB 2.7s infinite 0.8s cubic-bezier(0.4, 0, 0.2, 1);
            transform-origin: 15px -11px;
          }
          .ember-glow {
            animation: emberPulse 1.6s infinite ease-in-out;
          }
        `}</style>
      </defs>

      {/* 1. GROUND SHADOW */}
      <ellipse cx={isSitting ? "96" : "80"} cy="214" rx={isSitting ? 46 : 38} ry={isSitting ? 8 : 6.5} fill="url(#shadowGrad)" />

      {/* GROUP: ENTIRE BODY WITH BOB OFFSET */}
      <g transform={`translate(0, ${bodyBob})`}>

        {/* 2. LEGS & NAVY TROUSERS WITH SCOTLIGHT */}
        {isSitting ? (
          <g id="sittingLegs">
            {/* Left Leg (Seated Back Leg) */}
            <g transform="translate(68, 138)">
              {/* Thigh extending forward horizontally across seat cushion */}
              <polygon points="-8,0 8,0 24,14 4,16" fill={pantsShadow} />
              {/* Knee Cap bent at edge of cushion */}
              <ellipse cx="14" cy="14" rx="9" ry="4" fill="#172554" />
              {/* Lower Leg hanging vertically down to floor */}
              <polygon points="8,14 20,14 18,58 6,58" fill={pantsShadow} />
              {/* 3M Scotlight Band on Shin */}
              <rect x="6.5" y="32" width="13" height="6" rx="1" fill="url(#scotlightGrad)" />
              {/* Left Safety Boot flat on floor */}
              <path d="M 5,58 L 19,58 L 22,63 L 26,65 L 4,65 Z" fill="url(#bootsLeatherGrad)" />
              {/* Rugged Sole flat on ground plane */}
              <rect x="3" y="64.5" width="24" height="2.5" rx="0.6" fill="#1C1917" />
            </g>

            {/* Right Leg (Seated Front Leg) */}
            <g transform="translate(88, 138)">
              {/* Thigh extending forward horizontally across seat cushion */}
              <polygon points="-8,0 8,0 26,14 6,16" fill={pantsBase} />
              <line x1="0" y1="2" x2="16" y2="14" stroke="#1E293B" strokeWidth="1" strokeDasharray="2,2" />
              {/* Prominent Front Knee Cap bent at 90 degrees */}
              <ellipse cx="16" cy="14" rx="10" ry="4" fill="#1E3A8A" />
              {/* Lower Leg hanging vertically down to floor */}
              <polygon points="10,14 22,14 20,58 8,58" fill={pantsBase} />
              {/* 3M Scotlight Band on Shin with high-visibility silver reflection */}
              <rect x="8.5" y="32" width="13" height="6" rx="1" fill="url(#scotlightGrad)" />
              <line x1="8.5" y1="35" x2="21.5" y2="35" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.85" />
              {/* Right Safety Boot flat on floor */}
              <path d="M 7,58 L 21,58 L 24,63 L 29,65 L 6,65 Z" fill="url(#bootsLeatherGrad)" />
              {/* Rugged Lug Sole flat on ground plane */}
              <rect x="5" y="64.5" width="25" height="2.5" rx="0.6" fill="#1C1917" />
              {/* Steel Toe Cap highlight */}
              <path d="M 23,61 Q 28,63 28.5,65 L 24,65 Z" fill="#D97706" opacity="0.45" />
            </g>
          </g>
        ) : (
          <>
            {/* Left Leg (Back Leg) */}
            <g transform={`translate(67, 138) rotate(${legAngleL}, 0, 0)`}>
              {/* Navy Thigh & Knee */}
              <path
                d="M -7 0 L 7 0 L 6 42 L -8 42 Z"
                fill={pantsShadow}
              />
              {/* Horizontal Scotlight Band on Left Leg below knee */}
              <rect x="-8.2" y="24" width="14.4" height="6.5" rx="1" fill="url(#scotlightGrad)" />
              {/* Left Safety Boot */}
              <g transform="translate(0, 42)">
                <path
                  d="M -8.5 0 L 5.5 0 L 7 18 L 12 24 L 12 28 L -10 28 L -10 20 Z"
                  fill="url(#bootsLeatherGrad)"
                />
                {/* Rubber Sole & Tread */}
                <rect x="-10.5" y="27" width="23" height="4" rx="1" fill="#1C1917" />
                <rect x="3" y="29" width="8" height="2" fill="#44403C" />
                {/* Steel Toe Cap highlight */}
                <path d="M 7 18 Q 11 20 11.5 25 L 8 26 Z" fill="#D97706" opacity="0.4" />
              </g>
            </g>

            {/* Right Leg (Front Leg) */}
            <g transform={`translate(93, 138) rotate(${legAngleR}, 0, 0)`}>
              {/* Navy Thigh & Knee */}
              <path
                d="M -7 0 L 7 0 L 8 42 L -6 42 Z"
                fill={pantsBase}
              />
              {/* Trouser Seam / Crease */}
              <line x1="0.5" y1="2" x2="1" y2="40" stroke="#1E293B" strokeWidth="1" strokeDasharray="3,2" />
              {/* Horizontal Scotlight Band on Right Leg below knee */}
              <rect x="-6.2" y="24" width="14.4" height="6.5" rx="1" fill="url(#scotlightGrad)" />
              <line x1="-6.2" y1="27.2" x2="8.2" y2="27.2" stroke="#FFFFFF" strokeWidth="1" opacity="0.8" />
              {/* Right Safety Boot */}
              <g transform="translate(0, 42)">
                <path
                  d="M -7 0 L 7 0 L 8.5 18 L 14 24 L 14 28 L -8.5 28 L -8.5 20 Z"
                  fill="url(#bootsLeatherGrad)"
                />
                {/* Leather Pull-on Tab & Collar */}
                <rect x="-6" y="-2" width="12" height="3" rx="1" fill="#78350F" />
                {/* Rubber Sole & Heavy Lug Tread */}
                <rect x="-9" y="27" width="23.5" height="4" rx="1" fill="#1C1917" />
                <rect x="4" y="29" width="8.5" height="2" fill="#44403C" />
                {/* Toe cap accent */}
                <path d="M 8.5 18 Q 13 20 13.5 25 L 9.5 26 Z" fill="#D97706" opacity="0.45" />
              </g>
            </g>
          </>
        )}

        {/* 3. LEFT ARM (Back Arm) */}
        <g transform={`translate(56, 80) rotate(${armAngleL}, 0, 0)`}>
          {/* Lime Green Sleeve */}
          <path
            d="M -7 0 L 7 0 L 5 36 L -5 36 Z"
            fill={isTbpUniform ? shirtShadow : shirtBase}
          />
          {/* Double Sleeve Scotlight Bands */}
          {isTbpUniform && (
            <>
              <rect x="-6.5" y="14" width="12.5" height="4" rx="0.5" fill="url(#scotlightGrad)" />
              <rect x="-5.8" y="22" width="11.2" height="4" rx="0.5" fill="url(#scotlightGrad)" />
            </>
          )}
          {/* Hand / Glove */}
          <circle cx="0" cy="40" r="5.5" fill={skinColor} />
        </g>

        {/* 4. TORSO & TBP FLUO LIME UNIFORM */}
        <g id="torsoGroup">
          {/* Main Shirt Body */}
          <path
            d="M 58 75 L 102 75 L 100 138 L 60 138 Z"
            fill={isTbpUniform ? "url(#limeShirtGrad)" : shirtBase}
          />

          {/* Shoulders / Epaulets */}
          <path d="M 54 75 Q 80 72 106 75 L 103 84 Q 80 81 57 84 Z" fill={shirtShadow} opacity="0.35" />

          {/* Center Front Placket & Buttons */}
          <rect x="78.5" y="75" width="3" height="63" fill={shirtShadow} opacity="0.4" />
          <circle cx="80" cy="85" r="1.3" fill="#166534" />
          <circle cx="80" cy="97" r="1.3" fill="#166534" />
          <circle cx="80" cy="109" r="1.3" fill="#166534" />
          <circle cx="80" cy="121" r="1.3" fill="#166534" />
          <circle cx="80" cy="133" r="1.3" fill="#166534" />

          {/* DUAL HORIZONTAL TORSO SCOTLIGHT STRIPES (TBP Signature Double Stripes) */}
          {isTbpUniform && (
            <>
              {/* Upper Torso Scotlight Band */}
              <rect x="59.5" y="102" width="41" height="6.5" rx="1" fill="url(#scotlightGrad)" />
              <line x1="60" y1="105.2" x2="100" y2="105.2" stroke="#FFFFFF" strokeWidth="1" opacity="0.85" />

              {/* Lower Torso Scotlight Band */}
              <rect x="60" y="117" width="40" height="6.5" rx="1" fill="url(#scotlightGrad)" />
              <line x1="60.5" y1="120.2" x2="99.5" y2="120.2" stroke="#FFFFFF" strokeWidth="1" opacity="0.85" />
            </>
          )}

          {/* CHEST POCKETS WITH FLAPS */}
          {/* Left Chest Flap Pocket (Viewer's Left, Person's Right) */}
          <g transform="translate(63, 85)">
            <rect x="0" y="2" width="13" height="13" rx="1.5" fill={shirtShadow} opacity="0.35" />
            <path d="M -0.5 0 L 13.5 0 L 11 4 L 2 4 Z" fill={shirtBase} stroke={shirtShadow} strokeWidth="0.8" />
            <circle cx="6.5" cy="5" r="1" fill="#166534" />
            {/* TBP Official Green Logo Emblem on Left Chest Pocket */}
            <g transform="translate(6.5, 9) scale(0.95)">
              <use href="#tbpLogoBadge" />
            </g>
          </g>

          {/* Right Chest Flap Pocket with Name Badge (Viewer's Right, Person's Left) */}
          <g transform="translate(84, 85)">
            <rect x="0" y="2" width="13" height="13" rx="1.5" fill={shirtShadow} opacity="0.35" />
            <path d="M -0.5 0 L 13.5 0 L 11 4 L 2 4 Z" fill={shirtBase} stroke={shirtShadow} strokeWidth="0.8" />
            <circle cx="6.5" cy="5" r="1" fill="#166534" />
            {/* Embroidered White/Black Name Tag Badge */}
            <rect x="-1" y="8" width="15" height="5.5" rx="1" fill="#F8FAFC" stroke="#0F172A" strokeWidth="0.6" />
            <text x="6.5" y="12.2" fontSize="3.6" fontWeight="bold" textAnchor="middle" fill="#0F172A" fontFamily="monospace">
              {shortName}
            </text>
          </g>

          {/* Neat Shirt Collar */}
          <path d="M 68 74 L 75 83 L 80 77 L 85 83 L 92 74 Z" fill={shirtBase} stroke={shirtShadow} strokeWidth="1.2" />

          {/* Trouser Waistband & Belt */}
          <rect x="60" y="136" width="40" height="4.5" fill="#0F172A" />
          <rect x="76" y="136" width="8" height="4.5" rx="1" fill="#CA8A04" />
          <rect x="78" y="137.2" width="4" height="2" fill="#0F172A" />

          {/* Dangling ID Card / Badge on Belt/Waist (as seen in photo) */}
          {accessoryId === 'lanyard' && (
            <g transform="translate(71, 137)">
              <line x1="0" y1="0" x2="0" y2="7" stroke="#1E293B" strokeWidth="1.2" />
              {/* ID Badge Holder */}
              <rect x="-4.5" y="7" width="9" height="13" rx="1.2" fill="#F8FAFC" stroke="#0F172A" strokeWidth="0.8" />
              <rect x="-3" y="8.5" width="6" height="5" fill="#0D9488" />
              <line x1="-3" y1="15" x2="3" y2="15" stroke="#334155" strokeWidth="1" />
              <line x1="-3" y1="17.5" x2="1" y2="17.5" stroke="#94A3B8" strokeWidth="0.8" />
            </g>
          )}
        </g>

        {/* 5. RIGHT ARM (Front Arm) & INTERACTIVE TOOLS */}
        <g transform={`translate(104, 80) rotate(${armAngleR}, 0, 0)`}>
          {/* Lime Green Sleeve */}
          <path
            d="M -7 0 L 7 0 L 5 36 L -5 36 Z"
            fill={isTbpUniform ? shirtBase : shirtShadow}
          />
          {/* Double Sleeve Scotlight Bands */}
          {isTbpUniform && (
            <>
              <rect x="-6" y="14" width="12" height="4" rx="0.5" fill="url(#scotlightGrad)" />
              <rect x="-5.2" y="22" width="10.8" height="4" rx="0.5" fill="url(#scotlightGrad)" />
            </>
          )}
          {/* Hand */}
          <circle cx="0" cy="40" r="5.5" fill={skinColor} />

          {/* Hand Action Item: Coffee Cup or Inspection Tablet */}
          {isCoffee && (
            <g transform="translate(4, 38)">
              {/* Ceramic Coffee Mug */}
              <rect x="-2" y="-12" width="12" height="13" rx="2" fill="#0D9488" stroke="#042F2E" strokeWidth="1" />
              <path d="M 10 -9 Q 15 -6 10 -2" fill="none" stroke="#0D9488" strokeWidth="2.5" />
              {/* Coffee Liquid & Steam */}
              <ellipse cx="4" cy="-12" rx="5" ry="1.5" fill="#451A03" />
              <path d="M 2 -15 Q 1 -20 4 -23" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
              <path d="M 6 -14 Q 8 -19 5 -22" fill="none" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.65" />
            </g>
          )}

          {actionState === 'inspect' && (
            <g transform="translate(-1, 38)">
              {/* Digital Inspection Tablet / Clipboard */}
              <rect x="-8" y="-10" width="18" height="23" rx="2" fill="#1E293B" stroke="#0284C7" strokeWidth="1.2" />
              <rect x="-6" y="-7" width="14" height="17" rx="1" fill="#0F172A" />
              <line x1="-4" y1="-3" x2="5" y2="-3" stroke="#38BDF8" strokeWidth="1.5" />
              <line x1="-4" y1="1" x2="3" y2="1" stroke="#4ADE80" strokeWidth="1.2" />
              <line x1="-4" y1="5" x2="2" y2="5" stroke="#FBBF24" strokeWidth="1.2" />
            </g>
          )}

          {actionState === 'jump' && (
            <g transform="translate(0, 35)">
              {/* Thumbs up badge */}
              <text x="6" y="-2" fontSize="12">👍</text>
            </g>
          )}

          {/* Hand Action Item: Lit Cigarette with Rising Smoke */}
          {isSmoking && (
            <g transform="translate(3, 38)">
              {/* Cigarette Body (White) */}
              <line x1="2" y1="-6" x2="16" y2="-11" stroke="#F8FAFC" strokeWidth="2.2" strokeLinecap="round" />
              {/* Tan/Amber Filter near fingers */}
              <line x1="2" y1="-6" x2="6" y2="-7.5" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" />
              {/* Glowing Red/Yellow Ember Tip */}
              <circle cx="16" cy="-11" r="1.6" className="ember-glow" />
              <circle cx="16" cy="-11" r="0.7" fill="#FEF08A" />

              {/* Dynamic Rising Smoke Curls */}
              <g className="smoke-puff-a">
                <path d="M 16 -11 Q 13 -17 16 -23 Q 19 -29 14 -35" fill="none" stroke="#E2E8F0" strokeWidth="1.8" strokeLinecap="round" opacity="0.7" />
                <circle cx="15" cy="-21" r="2.2" fill="#F8FAFC" opacity="0.4" />
              </g>
              <g className="smoke-puff-b">
                <path d="M 16 -11 Q 20 -18 17 -25 Q 13 -31 18 -38" fill="none" stroke="#CBD5E1" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
                <circle cx="18" cy="-24" r="2.5" fill="#F8FAFC" opacity="0.35" />
              </g>
            </g>
          )}
        </g>

        {/* 6. NECK & HEAD */}
        {/* Neck */}
        <rect x="74" y="65" width="12" height="12" fill={skinShadow} />

        {/* Head Base */}
        <ellipse cx="80" cy="52" rx="16" ry="17" fill={skinColor} />
        {/* Ears */}
        <circle cx="63.5" cy="53" r="3.5" fill={skinColor} />
        <circle cx="96.5" cy="53" r="3.5" fill={skinColor} />

        {/* Hair peeking beneath helmet sides & neck */}
        <path d="M 64 45 Q 63 60 67 63 Q 66 52 68 47 Z" fill="#18181B" />
        <path d="M 96 45 Q 97 60 93 63 Q 94 52 92 47 Z" fill="#18181B" />

        {/* Cheeks blush */}
        <circle cx="71" cy="56" r="3" fill="#F43F5E" opacity="0.25" />
        <circle cx="89" cy="56" r="3" fill="#F43F5E" opacity="0.25" />

        {/* EYES, EYEWEAR & FACIAL EXPRESSIONS */}
        {eyeId === 'glasses_k3' ? (
          <g id="eyesGlassesK3">
            {/* Friendly Eyes */}
            <circle cx="73" cy="51" r="2.2" fill="#0F172A" />
            <circle cx="73.8" cy="50.2" r="0.8" fill="#FFFFFF" />
            <circle cx="87" cy="51" r="2.2" fill="#0F172A" />
            <circle cx="87.8" cy="50.2" r="0.8" fill="#FFFFFF" />
            {/* Eyebrows */}
            <path d="M 69 46 Q 73 45 77 47" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <path d="M 83 47 Q 87 45 91 46" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            {/* Clear K3 Safety Glasses Frame & Reflection */}
            <rect x="67" y="47" width="11" height="8" rx="2" fill="#38BDF8" opacity="0.3" stroke="#0284C7" strokeWidth="1" />
            <rect x="82" y="47" width="11" height="8" rx="2" fill="#38BDF8" opacity="0.3" stroke="#0284C7" strokeWidth="1" />
            <line x1="78" y1="51" x2="82" y2="51" stroke="#0284C7" strokeWidth="1.2" />
            <line x1="64" y1="50" x2="67" y2="50" stroke="#0284C7" strokeWidth="1" />
            <line x1="93" y1="50" x2="96" y2="50" stroke="#0284C7" strokeWidth="1" />
          </g>
        ) : eyeId === 'happy' ? (
          <g id="eyesHappy">
            <path d="M 70 52 Q 73 48 76 52" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <path d="M 84 52 Q 87 48 90 52" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" fill="none" />
            <path d="M 69 45 Q 73 44 77 46" stroke="#0F172A" strokeWidth="1.1" strokeLinecap="round" fill="none" />
            <path d="M 83 46 Q 87 44 91 45" stroke="#0F172A" strokeWidth="1.1" strokeLinecap="round" fill="none" />
          </g>
        ) : eyeId === 'wink' ? (
          <g id="eyesWink">
            <circle cx="73" cy="51" r="2.2" fill="#0F172A" />
            <circle cx="73.8" cy="50.2" r="0.8" fill="#FFFFFF" />
            <path d="M 84 52 Q 87 48 90 52" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M 69 46 Q 73 45 77 47" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <path d="M 83 47 Q 87 45 91 46" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          </g>
        ) : eyeId === 'sunglasses' ? (
          <g id="eyesSunglasses">
            <rect x="67" y="47" width="12" height="8" rx="2" fill="#0F172A" />
            <rect x="81" y="47" width="12" height="8" rx="2" fill="#0F172A" />
            <line x1="79" y1="50" x2="81" y2="50" stroke="#0F172A" strokeWidth="1.5" />
            {/* Gloss reflection line */}
            <line x1="68" y1="49" x2="74" y2="53" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />
            <line x1="82" y1="49" x2="88" y2="53" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.6" />
          </g>
        ) : eyeId === 'goggles_furnace' ? (
          <g id="eyesFurnaceGoggles">
            {/* Orange furnace safety goggles with metallic strap */}
            <rect x="66" y="46" width="13" height="10" rx="3" fill="#EA580C" stroke="#9A3412" strokeWidth="1.2" />
            <rect x="81" y="46" width="13" height="10" rx="3" fill="#EA580C" stroke="#9A3412" strokeWidth="1.2" />
            <rect x="68" y="48" width="9" height="6" rx="1.5" fill="#FED7AA" opacity="0.75" />
            <rect x="83" y="48" width="9" height="6" rx="1.5" fill="#FED7AA" opacity="0.75" />
            <line x1="79" y1="51" x2="81" y2="51" stroke="#9A3412" strokeWidth="2" />
            <line x1="63" y1="51" x2="66" y2="51" stroke="#475569" strokeWidth="1.6" />
            <line x1="94" y1="51" x2="97" y2="51" stroke="#475569" strokeWidth="1.6" />
          </g>
        ) : eyeId === 'focus' ? (
          <g id="eyesFocus">
            {/* Focused sharp eyes */}
            <circle cx="73" cy="51" r="2.2" fill="#0F172A" />
            <circle cx="73.8" cy="50.2" r="0.8" fill="#FFFFFF" />
            <circle cx="87" cy="51" r="2.2" fill="#0F172A" />
            <circle cx="87.8" cy="50.2" r="0.8" fill="#FFFFFF" />
            {/* Strong determined eyebrows */}
            <path d="M 68 47 L 78 45" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M 82 45 L 92 47" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        ) : eyeId === 'kumis_jenggot' ? (
          <g id="eyesKumisJenggot">
            {/* Eyes */}
            <circle cx="73" cy="51" r="2.2" fill="#0F172A" />
            <circle cx="73.8" cy="50.2" r="0.8" fill="#FFFFFF" />
            <circle cx="87" cy="51" r="2.2" fill="#0F172A" />
            <circle cx="87.8" cy="50.2" r="0.8" fill="#FFFFFF" />
            <path d="M 69 46 Q 73 45 77 47" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <path d="M 83 47 Q 87 45 91 46" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            {/* Neat Mustache */}
            <path d="M 73 58 Q 80 56 87 58 Q 80 61 73 58 Z" fill="#1E293B" stroke="#0F172A" strokeWidth="0.5" />
            {/* Neat Goatee / Beard */}
            <ellipse cx="80" cy="65" rx="3.5" ry="2" fill="#1E293B" opacity="0.85" />
          </g>
        ) : eyeId === 'laugh' ? (
          <g id="eyesLaugh">
            {/* Squint laughing eyes */}
            <path d="M 70 51 Q 73 47 76 51" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M 84 51 Q 87 47 90 51" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M 69 45 Q 73 44 77 46" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <path d="M 83 46 Q 87 44 91 45" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          </g>
        ) : (
          <g id="eyesNormal">
            <circle cx="73" cy="51" r="2.2" fill="#0F172A" />
            <circle cx="73.8" cy="50.2" r="0.8" fill="#FFFFFF" />
            <circle cx="87" cy="51" r="2.2" fill="#0F172A" />
            <circle cx="87.8" cy="50.2" r="0.8" fill="#FFFFFF" />
            <path d="M 69 46 Q 73 45 77 47" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <path d="M 83 47 Q 87 45 91 46" stroke="#0F172A" strokeWidth="1.2" strokeLinecap="round" fill="none" />
          </g>
        )}

        {/* Mouth & Expression */}
        {eyeId === 'laugh' ? (
          <path d="M 75 59 Q 80 66 85 59 Z" fill="#991B1B" stroke="#0F172A" strokeWidth="1" />
        ) : eyeId === 'focus' ? (
          <line x1="77" y1="61" x2="83" y2="61" stroke={skinShadow} strokeWidth="1.6" strokeLinecap="round" />
        ) : (
          <path d="M 76 60 Q 80 63.5 84 60" stroke={skinShadow} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        )}

        {/* Respirator Dust Mask Option */}
        {accessoryId === 'mask_k3' && (
          <g transform="translate(68, 56)">
            <path d="M 0 4 Q 12 -1 24 4 L 21 15 Q 12 18 3 15 Z" fill="#06B6D4" stroke="#0891B2" strokeWidth="1" />
            <ellipse cx="12" cy="10" rx="3.5" ry="3.5" fill="#E0F2FE" />
          </g>
        )}

        {/* 7. OFFICIAL TBP SAFETY HELMET / HARD HAT */}
        {isHelmet && (
          <g id="tbpSafetyHelmet">
            {/* Helmet Drop Shadow on Forehead */}
            <path d="M 61 40 Q 80 43 99 40 Q 80 47 61 40 Z" fill="#000000" opacity="0.2" />

            {/* Main Hard Hat Dome Shell */}
            <path
              d="M 61 38 Q 60 14 80 14 Q 100 14 99 38 Z"
              fill={isTbpWhiteHelmet ? "url(#helmetWhiteGrad)" : headwearColor}
              stroke="#CBD5E1"
              strokeWidth="0.8"
            />

            {/* Top Structural Ridge */}
            <path
              d="M 77 14 Q 80 12 83 14 L 82 34 L 78 34 Z"
              fill={isTbpWhiteHelmet ? "#FFFFFF" : headwearColor}
              opacity="0.8"
            />

            {/* Wide Sun Brim / Visor (Lip) */}
            <path
              d="M 57 38 Q 80 42 103 38 Q 104 36 101 34 Q 80 38 59 34 Q 56 36 57 38 Z"
              fill={isTbpWhiteHelmet ? "#F8FAFC" : headwearColor}
              stroke="#94A3B8"
              strokeWidth="0.8"
            />

            {/* Yellow / Reflective Safety Side Stripe on Helmet Brim */}
            <path
              d="M 59 36 Q 70 38 74 38 L 74 39.5 Q 70 39.5 58 37.5 Z"
              fill="#FACC15"
            />
            <path
              d="M 86 38 Q 90 38 101 36 L 102 37.5 Q 90 39.5 86 39.5 Z"
              fill="#FACC15"
            />

            {/* OFFICIAL GREEN TBP LOGO EMBLEM ON HELMET CENTER */}
            {isTbpWhiteHelmet && (
              <g transform="translate(80, 27) scale(1.35)">
                <use href="#tbpLogoBadge" />
                {/* Crisp "TBP" Lettering beneath emblem */}
                <text
                  x="0"
                  y="6.2"
                  fontSize="3"
                  fontWeight="900"
                  textAnchor="middle"
                  fill="#15803D"
                  letterSpacing="0.4"
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  TBP
                </text>
              </g>
            )}

            {/* Helmet Chin Strap Anchor */}
            <path d="M 64 38 L 65 47 L 66 47 L 65 38" fill="#334155" />
            <path d="M 96 38 L 95 47 L 94 47 L 95 38" fill="#334155" />
          </g>
        )}

      </g>
    </svg>
  );
};
