/**
 * ShieldCrest — Reusable SVG shield for OUTLIER level identity
 * Extracted from LevelProgress for shared use across dashboard and journey screens.
 */

import type { ExtendedLevelKey } from '@/hooks/useJourneyProgress';

// Shield silhouette — hexagonal/angular shape matching reference exactly
const SHIELD_PATH = "M50 4 L90 20 L90 55 Q90 82 50 98 Q10 82 10 55 L10 20 Z";
const SHIELD_INNER = "M50 10 L84 24 L84 53 Q84 77 50 91 Q16 77 16 53 L16 24 Z";

interface ShieldCrestProps {
  level: ExtendedLevelKey;
  active: boolean;
  isCurrent?: boolean;
  fillPercent?: number;
  className?: string;
}

export function ShieldCrest({ level, active, isCurrent, fillPercent = 100, className }: ShieldCrestProps) {
  const id = `shield-${level}-${active ? 'on' : 'off'}-${Math.round(fillPercent)}`;
  const isLocked = !active;
  const showPartialFill = !active && fillPercent > 0 && fillPercent < 100;
  const clipY = 100 - (fillPercent / 100) * 96;

  // Colors exactly matching reference
  const ORANGE = '#FF6A00';
  const DARK_BG = level === 'OPEN' ? '#121212' : level === 'PRO' ? '#0E0E0E' : '#0A0A0A';
  const LOCKED_BORDER = '#2A2A2A';
  const LOCKED_ICON = '#2A2A2A';
  const PADLOCK_COLOR = '#888888';

  const borderColor = active ? (level === 'OPEN' ? '#3A3A3A' : ORANGE) : LOCKED_BORDER;
  const iconColor = active ? ORANGE : LOCKED_ICON;
  const strokeW = active && level === 'ELITE' ? 3 : 2.5;

  return (
    <svg viewBox="0 0 100 104" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-bevel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#666666" stopOpacity="0.6" />
          <stop offset="40%" stopColor={borderColor} stopOpacity="1" />
          <stop offset="100%" stopColor="#111111" stopOpacity="0.8" />
        </linearGradient>

        <linearGradient id={`${id}-bg`} x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor={DARK_BG} />
          <stop offset="100%" stopColor="#0A0A0A" />
        </linearGradient>

        {showPartialFill && (
          <>
            <linearGradient id={`${id}-partial`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ORANGE} stopOpacity="0.25" />
              <stop offset="100%" stopColor={ORANGE} stopOpacity="0.1" />
            </linearGradient>
            <clipPath id={`${id}-clip`}>
              <rect x="0" y={clipY} width="100" height={104 - clipY} />
            </clipPath>
          </>
        )}

        {active && level === 'ELITE' && (
          <filter id={`${id}-glow`} x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feFlood floodColor={ORANGE} floodOpacity="0.55"/>
            <feComposite in2="b" operator="in" result="glow"/>
            <feMerge>
              <feMergeNode in="glow"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        )}
      </defs>

      <path d={SHIELD_PATH}
        fill={`url(#${id}-bg)`}
        stroke={`url(#${id}-bevel)`}
        strokeWidth={strokeW}
        strokeLinejoin="round"
        filter={active && level === 'ELITE' ? `url(#${id}-glow)` : undefined}
      />

      <path d={SHIELD_INNER}
        fill="none"
        stroke={active && level !== 'OPEN' ? `${ORANGE}22` : '#333333'}
        strokeWidth="1"
      />

      {showPartialFill && (
        <g clipPath={`url(#${id}-clip)`}>
          <path d={SHIELD_PATH} fill={`url(#${id}-partial)`} />
        </g>
      )}

      {/* OPEN — Bold upward arrow */}
      {level === 'OPEN' && (
        <g opacity={isLocked ? 0.25 : 1}>
          <path d="M50 20 L30 48 L40 48 L40 75 L60 75 L60 48 L70 48 Z" fill={iconColor} />
          {active && (
            <path d="M50 24 L34 47 L42 47 L42 73 L58 73 L58 47 L66 47 Z"
              fill="none" stroke="#FFFFFF10" strokeWidth="0.8" />
          )}
        </g>
      )}

      {/* PRO — Crossed swords */}
      {level === 'PRO' && (
        <g opacity={isLocked ? 0.25 : 1} transform="translate(50,50)">
          <path d="M-22 22 L18 -22" stroke={iconColor} strokeWidth="4" strokeLinecap="round" fill="none" />
          <line x1="-14" y1="8" x2="-4" y2="18" stroke={iconColor} strokeWidth="3" strokeLinecap="round" />
          <circle cx="-20" cy="20" r="2.5" fill={iconColor} />
          <path d="M22 22 L-18 -22" stroke={iconColor} strokeWidth="4" strokeLinecap="round" fill="none" />
          <line x1="14" y1="8" x2="4" y2="18" stroke={iconColor} strokeWidth="3" strokeLinecap="round" />
          <circle cx="20" cy="20" r="2.5" fill={iconColor} />
          <path d="M18 -22 L22 -18 L16 -16 Z" fill={iconColor} />
          <path d="M-18 -22 L-22 -18 L-16 -16 Z" fill={iconColor} />
        </g>
      )}

      {/* ELITE — Crown with jewels */}
      {level === 'ELITE' && (
        <g opacity={isLocked ? 0.25 : 1} transform="translate(50,52)">
          <path d="M-28 10 L-28 0 L-18 -12 L-9 2 L0 -22 L9 2 L18 -12 L28 0 L28 10 Z" fill={iconColor} />
          <rect x="-28" y="10" width="56" height="8" rx="2" fill={iconColor} opacity="0.9" />
          {active && (
            <>
              <circle cx="0" cy="-8" r="3" fill="#FFD700" opacity="0.85" />
              <circle cx="-14" cy="-2" r="2.5" fill="#FFD700" opacity="0.7" />
              <circle cx="14" cy="-2" r="2.5" fill="#FFD700" opacity="0.7" />
            </>
          )}
        </g>
      )}

      {/* LOCKED STATE — Padlock */}
      {isLocked && (
        <g transform="translate(50, 70)">
          <path d="M-5 0 L-5 -6 Q-5 -12 0 -12 Q5 -12 5 -6 L5 0"
            fill="none" stroke={PADLOCK_COLOR} strokeWidth="2.2" strokeLinecap="round" />
          <rect x="-7.5" y="-1" width="15" height="11" rx="2.5" ry="2.5" fill={PADLOCK_COLOR} />
          <circle cx="0" cy="3.5" r="1.8" fill="#1A1A1A" />
          <rect x="-0.7" y="3.5" width="1.4" height="4" rx="0.7" fill="#1A1A1A" />
        </g>
      )}
    </svg>
  );
}
