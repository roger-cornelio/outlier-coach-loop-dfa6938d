/**
 * Custom SVG icons representing real HYROX station equipment.
 * Each icon is designed to be recognizable at a glance during a race simulation.
 */

interface IconProps {
  className?: string;
}

/** Running figure in motion */
export function RunIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Head */}
      <circle cx="28" cy="8" r="4" />
      {/* Body */}
      <path d="M24 16 L22 28" />
      {/* Arms - running motion */}
      <path d="M16 18 L24 16 L30 22" />
      {/* Front leg - extended */}
      <path d="M22 28 L30 36 L34 44" />
      {/* Back leg - kicked back */}
      <path d="M22 28 L14 36 L10 42" />
    </svg>
  );
}

/** SkiErg machine - vertical pull handles */
export function SkiErgIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Machine body/stand */}
      <rect x="20" y="4" width="8" height="36" rx="2" />
      {/* Base */}
      <path d="M14 40 L34 40" />
      <path d="M16 44 L32 44" />
      {/* Left handle/rope pulled down */}
      <path d="M20 12 L10 24 L12 32" />
      {/* Right handle/rope pulled down */}
      <path d="M28 12 L38 24 L36 32" />
      {/* Fan/flywheel circle */}
      <circle cx="24" cy="12" r="5" strokeWidth="2" />
    </svg>
  );
}

/** Sled being pushed forward */
export function SledPushIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Sled body */}
      <rect x="4" y="24" width="20" height="12" rx="2" />
      {/* Sled runners */}
      <path d="M2 38 L26 38" />
      {/* Weight plates on sled */}
      <rect x="8" y="26" width="4" height="8" rx="1" />
      <rect x="14" y="26" width="4" height="8" rx="1" />
      {/* Push handles */}
      <path d="M24 24 L32 16" />
      <path d="M24 30 L32 22" />
      {/* Person pushing (arms) */}
      <circle cx="38" cy="10" r="3.5" />
      <path d="M36 14 L32 22 L32 16" />
      {/* Arrow showing push direction */}
      <path d="M10 42 L4 42" />
      <path d="M7 40 L4 42 L7 44" />
    </svg>
  );
}

/** Sled with rope being pulled */
export function SledPullIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Sled body (far side) */}
      <rect x="4" y="24" width="16" height="10" rx="2" />
      {/* Sled runners */}
      <path d="M2 36 L22 36" />
      {/* Weight on sled */}
      <rect x="8" y="26" width="8" height="6" rx="1" />
      {/* Rope from sled to person */}
      <path d="M20 28 L30 20 L38 20" strokeDasharray="3 2" />
      {/* Person pulling */}
      <circle cx="42" cy="12" r="3.5" />
      <path d="M42 16 L42 28" />
      {/* Arms pulling rope */}
      <path d="M38 20 L42 22" />
      <path d="M42 22 L46 18" />
      {/* Legs planted */}
      <path d="M42 28 L38 36" />
      <path d="M42 28 L46 36" />
    </svg>
  );
}

/** Burpee broad jump - figure jumping forward */
export function BurpeeJumpIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Head */}
      <circle cx="24" cy="8" r="4" />
      {/* Body arched forward */}
      <path d="M24 12 L22 22" />
      {/* Arms reaching forward/up */}
      <path d="M22 16 L14 10" />
      <path d="M22 16 L30 10" />
      {/* Legs - jumping */}
      <path d="M22 22 L16 32 L12 38" />
      <path d="M22 22 L28 30 L32 38" />
      {/* Ground line */}
      <path d="M8 42 L40 42" strokeWidth="1.5" />
      {/* Jump arc arrow */}
      <path d="M14 38 C18 28, 30 28, 34 38" strokeDasharray="2 2" strokeWidth="1.5" />
      <path d="M32 36 L34 38 L32 40" strokeWidth="1.5" />
    </svg>
  );
}

/** Rowing ergometer machine */
export function RowingIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Rail / slide */}
      <path d="M4 36 L44 36" strokeWidth="2" />
      {/* Seat on rail */}
      <rect x="22" y="30" width="8" height="4" rx="2" />
      {/* Flywheel housing */}
      <circle cx="8" cy="28" r="6" />
      <circle cx="8" cy="28" r="3" strokeWidth="1.5" />
      {/* Handle chain */}
      <path d="M14 28 L22 24" />
      {/* Person sitting */}
      <circle cx="30" cy="16" r="3.5" />
      {/* Torso */}
      <path d="M30 20 L26 30" />
      {/* Arms pulling */}
      <path d="M26 22 L22 24" />
      {/* Legs on foot stretcher */}
      <path d="M26 32 L18 38" />
      <path d="M28 32 L20 38" />
      {/* Foot plate */}
      <rect x="16" y="38" width="6" height="3" rx="1" />
    </svg>
  );
}

/** Person carrying kettlebells/weights at sides */
export function FarmersCarryIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Head */}
      <circle cx="24" cy="8" r="4" />
      {/* Body */}
      <path d="M24 12 L24 28" />
      {/* Arms hanging down with weight */}
      <path d="M24 16 L14 22 L14 30" />
      <path d="M24 16 L34 22 L34 30" />
      {/* Left kettlebell */}
      <circle cx="14" cy="34" r="4" />
      <path d="M11 30 Q14 28 17 30" strokeWidth="2" />
      {/* Right kettlebell */}
      <circle cx="34" cy="34" r="4" />
      <path d="M31 30 Q34 28 37 30" strokeWidth="2" />
      {/* Legs walking */}
      <path d="M24 28 L20 40" />
      <path d="M24 28 L28 40" />
    </svg>
  );
}

/** Person lunging with sandbag on shoulder */
export function SandbagLungeIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Head */}
      <circle cx="24" cy="8" r="4" />
      {/* Sandbag on shoulders */}
      <rect x="16" y="12" width="16" height="6" rx="3" fill="currentColor" fillOpacity="0.15" />
      {/* Arms holding sandbag */}
      <path d="M18 18 L20 14" />
      <path d="M30 18 L28 14" />
      {/* Torso */}
      <path d="M24 18 L24 28" />
      {/* Front leg - lunging */}
      <path d="M24 28 L32 36 L32 44" />
      {/* Back knee on ground */}
      <path d="M24 28 L16 38 L16 44" />
      {/* Back knee touching ground indicator */}
      <circle cx="16" cy="42" r="1.5" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

/** Person throwing medicine ball at wall target */
export function WallBallIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {/* Wall */}
      <path d="M40 4 L40 44" strokeWidth="3" />
      {/* Target line on wall */}
      <path d="M38 12 L42 12" strokeWidth="2" />
      {/* Ball in the air */}
      <circle cx="34" cy="10" r="3.5" fill="currentColor" fillOpacity="0.15" />
      {/* Person */}
      <circle cx="20" cy="12" r="3.5" />
      {/* Body - squatting/standing */}
      <path d="M20 16 L20 26" />
      {/* Arms throwing up */}
      <path d="M20 18 L28 12" />
      <path d="M20 18 L26 14" />
      {/* Legs in squat */}
      <path d="M20 26 L14 36 L16 42" />
      <path d="M20 26 L26 36 L24 42" />
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
