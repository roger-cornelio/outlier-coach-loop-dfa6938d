/**
 * Professional SVG icons for HYROX station equipment.
 * Style: outline, stroke 2px, fitness/sport app aesthetic.
 */

interface IconProps {
  className?: string;
}

/** Running figure — dynamic stride */
export function RunIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="36" cy="10" r="5" />
      <path d="M32 18l-3 12" />
      <path d="M29 30l-10 10-4 8" />
      <path d="M29 30l8 8 2 10" />
      <path d="M32 18l-10 6" />
      <path d="M32 18l8 6" />
    </svg>
  );
}

/** SkiErg — athlete pulling two handles downward on vertical machine */
export function SkiErgIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Machine column */}
      <rect x="28" y="2" width="8" height="46" rx="2" />
      {/* Flywheel */}
      <circle cx="32" cy="12" r="6" />
      <circle cx="32" cy="12" r="2.5" strokeWidth="1.5" />
      {/* Left cable + handle */}
      <path d="M28 14L16 30" />
      <line x1="14" y1="28" x2="18" y2="32" strokeWidth="2.5" />
      {/* Right cable + handle */}
      <path d="M36 14L48 30" />
      <line x1="46" y1="28" x2="50" y2="32" strokeWidth="2.5" />
      {/* Base platform */}
      <path d="M22 48h20" strokeWidth="2.5" />
      <path d="M20 52h24" strokeWidth="2" />
      {/* Athlete silhouette (arms pulling) */}
      <circle cx="32" cy="24" r="3.5" strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}

/** Sled Push — athlete leaning into heavy sled */
export function SledPushIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Sled body */}
      <path d="M6 32h22v14H6z" strokeLinejoin="round" />
      <rect x="10" y="34" width="6" height="10" rx="1" strokeWidth="1.5" />
      <rect x="18" y="34" width="6" height="10" rx="1" strokeWidth="1.5" />
      {/* Sled runners */}
      <path d="M4 48h26" strokeWidth="2.5" />
      {/* Push handles */}
      <path d="M28 32l8-10" />
      <path d="M28 38l8-10" />
      {/* Athlete */}
      <circle cx="44" cy="14" r="4" />
      <path d="M44 18l-4 8" />
      <path d="M40 26l-4 2" />
      <path d="M40 26l-6 12" />
      <path d="M40 26l2 14" />
      {/* Direction arrow */}
      <path d="M14 54l-6 0" strokeWidth="1.5" opacity="0.4" />
      <path d="M11 52l-3 2 3 2" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

/** Sled Pull — athlete pulling sled via rope, hand-over-hand */
export function SledPullIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Sled */}
      <path d="M4 30h16v10H4z" strokeLinejoin="round" />
      <rect x="7" y="32" width="4" height="6" rx="1" strokeWidth="1.5" />
      <rect x="13" y="32" width="4" height="6" rx="1" strokeWidth="1.5" />
      <path d="M2 42h20" strokeWidth="2.5" />
      {/* Rope */}
      <path d="M20 34c4-1 8-3 14-6 4-2 8-4 10-4" strokeDasharray="3 2.5" />
      {/* Athlete standing, pulling */}
      <circle cx="50" cy="14" r="4" />
      <path d="M50 18v14" />
      <path d="M50 22l-6 2" />
      <path d="M44 24l-4-2" strokeWidth="2.5" />
      <path d="M50 32l-5 12" />
      <path d="M50 32l5 12" />
    </svg>
  );
}

/** Burpee Broad Jump — figure mid-jump */
export function BurpeeJumpIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="32" cy="10" r="4.5" />
      <path d="M32 15v12" />
      {/* Arms reaching forward */}
      <path d="M32 19l-8-4" />
      <path d="M32 19l8-4" />
      {/* Legs tucked in jump */}
      <path d="M32 27l-7 8-3 8" />
      <path d="M32 27l7 8 3 8" />
      {/* Ground */}
      <line x1="10" y1="50" x2="54" y2="50" strokeWidth="1.5" opacity="0.4" />
      {/* Jump arc */}
      <path d="M18 46c6-10 22-10 28 0" strokeDasharray="2 2" strokeWidth="1.5" opacity="0.35" />
      <path d="M44 44l2 2-2 2" strokeWidth="1.5" opacity="0.35" />
    </svg>
  );
}

/** Rowing Ergometer — athlete seated on erg, pulling handle */
export function RowingIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Rail */}
      <line x1="4" y1="42" x2="60" y2="42" strokeWidth="2" />
      {/* Flywheel housing */}
      <circle cx="10" cy="32" r="7" />
      <circle cx="10" cy="32" r="3" strokeWidth="1.5" />
      {/* Chain / cable */}
      <path d="M17 32h14" strokeWidth="1.5" />
      {/* Seat */}
      <rect x="30" y="36" width="8" height="4" rx="2" />
      {/* Athlete torso */}
      <path d="M34 36l-2-12" />
      <circle cx="31" cy="18" r="4" />
      {/* Arms pulling */}
      <path d="M32 24l-1 4" />
      {/* Legs on footplate */}
      <path d="M34 38l-8 6" />
      <path d="M36 38l-6 6" />
      {/* Foot stretcher */}
      <rect x="24" y="44" width="6" height="3" rx="1" strokeWidth="1.5" />
    </svg>
  );
}

/** Farmers Carry — athlete walking upright with kettlebells in each hand */
export function FarmersCarryIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="32" cy="8" r="4.5" />
      <path d="M32 13v16" />
      {/* Arms straight down */}
      <path d="M32 17l-10 8v8" />
      <path d="M32 17l10 8v8" />
      {/* Left kettlebell */}
      <circle cx="22" cy="38" r="4.5" />
      <path d="M19 33a4 3 0 0 1 6 0" strokeWidth="2" />
      {/* Right kettlebell */}
      <circle cx="42" cy="38" r="4.5" />
      <path d="M39 33a4 3 0 0 1 6 0" strokeWidth="2" />
      {/* Legs walking stride */}
      <path d="M32 29l-6 16" />
      <path d="M32 29l6 16" />
    </svg>
  );
}

/** Sandbag Lunges — athlete in lunge position with sandbag across shoulders */
export function SandbagLungeIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="32" cy="8" r="4.5" />
      {/* Sandbag on shoulders */}
      <rect x="22" y="13" width="20" height="6" rx="3" />
      <line x1="24" y1="13" x2="24" y2="19" strokeWidth="1" opacity="0.4" />
      <line x1="32" y1="13" x2="32" y2="19" strokeWidth="1" opacity="0.4" />
      <line x1="40" y1="13" x2="40" y2="19" strokeWidth="1" opacity="0.4" />
      {/* Arms gripping sandbag */}
      <path d="M26 19l-2-3" strokeWidth="1.5" />
      <path d="M38 19l2-3" strokeWidth="1.5" />
      {/* Torso */}
      <path d="M32 19v12" />
      {/* Front leg lunging */}
      <path d="M32 31l8 10v8" />
      {/* Back leg kneeling */}
      <path d="M32 31l-8 12v6" />
      <circle cx="24" cy="50" r="1.5" fill="currentColor" fillOpacity="0.25" />
    </svg>
  );
}

/** Wall Balls — athlete in squat throwing medicine ball upward at wall target */
export function WallBallIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Wall */}
      <line x1="54" y1="2" x2="54" y2="58" strokeWidth="3" opacity="0.3" />
      {/* Target mark */}
      <line x1="51" y1="14" x2="57" y2="14" strokeWidth="2.5" opacity="0.5" />
      {/* Medicine ball (in air) */}
      <circle cx="44" cy="10" r="4.5" />
      <path d="M41 7l6 6" strokeWidth="1" opacity="0.3" />
      <path d="M47 7l-6 6" strokeWidth="1" opacity="0.3" />
      {/* Athlete */}
      <circle cx="26" cy="14" r="4" />
      <path d="M26 18v10" />
      {/* Arms extended upward toward ball */}
      <path d="M26 20l8-6" />
      <path d="M26 22l8-4" />
      {/* Legs in squat */}
      <path d="M26 28l-8 10v8" />
      <path d="M26 28l8 10v8" />
    </svg>
  );
}

/** Returns the appropriate HYROX station icon with color */
export function getHyroxIcon(iconKey: string, size: 'sm' | 'lg' = 'lg') {
  const cls = size === 'lg' ? "w-10 h-10 sm:w-14 sm:h-14" : "w-4 h-4";
  switch (iconKey) {
    case 'run': return <RunIcon className={`${cls} text-blue-400`} />;
    case 'ski': return <SkiErgIcon className={`${cls} text-cyan-400`} />;
    case 'sled_push': return <SledPushIcon className={`${cls} text-orange-400`} />;
    case 'sled_pull': return <SledPullIcon className={`${cls} text-orange-400`} />;
    case 'burpee': return <BurpeeJumpIcon className={`${cls} text-red-400`} />;
    case 'row': return <RowingIcon className={`${cls} text-green-400`} />;
    case 'farmers': return <FarmersCarryIcon className={`${cls} text-yellow-400`} />;
    case 'sandbag': return <SandbagLungeIcon className={`${cls} text-purple-400`} />;
    case 'wallballs': return <WallBallIcon className={`${cls} text-pink-400`} />;
    default: return <RunIcon className={`${cls} text-blue-400`} />;
  }
}
