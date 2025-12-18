import { motion } from 'framer-motion';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import type { AthleteStatus } from '@/types/outlier';

// Level-specific visual configurations
const LEVEL_VISUALS: Record<AthleteStatus, {
  gradient: string;
  particles: number;
  particleColor: string;
  glowIntensity: number;
  hasSecondaryGlow: boolean;
  hasParticles: boolean;
  ambientAnimation: boolean;
}> = {
  iniciante: {
    gradient: 'from-cyan-500/10 via-transparent to-blue-500/5',
    particles: 0,
    particleColor: 'bg-cyan-400',
    glowIntensity: 0.15,
    hasSecondaryGlow: false,
    hasParticles: false,
    ambientAnimation: false,
  },
  intermediario: {
    gradient: 'from-emerald-500/15 via-transparent to-green-500/10',
    particles: 4,
    particleColor: 'bg-green-400',
    glowIntensity: 0.2,
    hasSecondaryGlow: false,
    hasParticles: true,
    ambientAnimation: true,
  },
  avancado: {
    gradient: 'from-orange-500/20 via-amber-500/10 to-red-500/10',
    particles: 8,
    particleColor: 'bg-orange-400',
    glowIntensity: 0.3,
    hasSecondaryGlow: true,
    hasParticles: true,
    ambientAnimation: true,
  },
  hyrox_open: {
    gradient: 'from-purple-500/25 via-violet-500/15 to-fuchsia-500/10',
    particles: 10,
    particleColor: 'bg-purple-400',
    glowIntensity: 0.35,
    hasSecondaryGlow: true,
    hasParticles: true,
    ambientAnimation: true,
  },
  hyrox_pro: {
    gradient: 'from-amber-400/30 via-yellow-500/20 to-orange-500/15',
    particles: 15,
    particleColor: 'bg-amber-300',
    glowIntensity: 0.45,
    hasSecondaryGlow: true,
    hasParticles: true,
    ambientAnimation: true,
  },
};

// Floating particle component
const FloatingParticle = ({ color, delay, size = 'small' }: { color: string; delay: number; size?: 'small' | 'medium' | 'large' }) => {
  const sizeClasses = {
    small: 'w-1 h-1',
    medium: 'w-2 h-2',
    large: 'w-3 h-3',
  };

  return (
    <motion.div
      className={`absolute rounded-full ${sizeClasses[size]} ${color} opacity-40 blur-[1px]`}
      initial={{ 
        x: `${Math.random() * 100}%`,
        y: '110%',
        scale: Math.random() * 0.5 + 0.5,
      }}
      animate={{ 
        y: '-10%',
        opacity: [0, 0.6, 0.4, 0],
      }}
      transition={{ 
        duration: 8 + Math.random() * 6,
        repeat: Infinity,
        delay: delay,
        ease: 'linear',
      }}
    />
  );
};

// Ambient glow orb
const GlowOrb = ({ 
  position, 
  color, 
  size, 
  animate = false 
}: { 
  position: string; 
  color: string; 
  size: string; 
  animate?: boolean;
}) => (
  <motion.div
    className={`absolute ${position} ${size} ${color} rounded-full blur-3xl pointer-events-none`}
    animate={animate ? {
      scale: [1, 1.2, 1],
      opacity: [0.3, 0.5, 0.3],
    } : {}}
    transition={{
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
  />
);

export function LevelBackground({ children }: { children: React.ReactNode }) {
  const { status } = useAthleteStatus();
  const visuals = LEVEL_VISUALS[status];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Base gradient overlay */}
      <div className={`fixed inset-0 bg-gradient-to-b ${visuals.gradient} pointer-events-none z-0`} />
      
      {/* Primary ambient glow */}
      <GlowOrb
        position="-top-40 -right-40"
        color={`bg-gradient-to-br ${getGlowGradient(status)}`}
        size="w-96 h-96"
        animate={visuals.ambientAnimation}
      />
      
      {/* Secondary ambient glow */}
      {visuals.hasSecondaryGlow && (
        <GlowOrb
          position="-bottom-32 -left-32"
          color={`bg-gradient-to-tr ${getGlowGradient(status)}`}
          size="w-80 h-80"
          animate={visuals.ambientAnimation}
        />
      )}

      {/* Floating particles */}
      {visuals.hasParticles && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-10">
          {Array.from({ length: visuals.particles }).map((_, i) => (
            <FloatingParticle
              key={i}
              color={visuals.particleColor}
              delay={i * 0.8}
              size={i % 3 === 0 ? 'large' : i % 2 === 0 ? 'medium' : 'small'}
            />
          ))}
        </div>
      )}

      {/* Special effects for elite levels */}
      {status === 'hyrox_pro' && <EliteEffects />}
      {status === 'hyrox_open' && <CompetitorEffects />}

      {/* Content */}
      <div className="relative z-20">
        {children}
      </div>
    </div>
  );
}

// Get gradient colors based on status
function getGlowGradient(status: AthleteStatus): string {
  switch (status) {
    case 'iniciante':
      return 'from-cyan-500/20 to-blue-500/10';
    case 'intermediario':
      return 'from-emerald-500/25 to-green-500/15';
    case 'avancado':
      return 'from-orange-500/30 to-amber-500/20';
    case 'hyrox_open':
      return 'from-purple-500/35 to-violet-500/25';
    case 'hyrox_pro':
      return 'from-amber-400/40 to-yellow-500/30';
  }
}

// Elite level special effects
function EliteEffects() {
  return (
    <>
      {/* Golden shimmer line */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent z-30"
        animate={{ 
          opacity: [0.3, 0.8, 0.3],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      
      {/* Corner accents */}
      <div className="fixed top-0 left-0 w-32 h-32 bg-gradient-to-br from-amber-400/10 to-transparent pointer-events-none z-10" />
      <div className="fixed top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-400/10 to-transparent pointer-events-none z-10" />
      
      {/* Ambient golden dust */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(251, 191, 36, 0.03) 0%, transparent 50%)',
          backgroundSize: '100px 100px',
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </>
  );
}

// Competitor level effects
function CompetitorEffects() {
  return (
    <>
      {/* Purple accent line */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent z-30"
        animate={{ 
          opacity: [0.2, 0.6, 0.2],
        }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      
      {/* Subtle vignette */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)] pointer-events-none z-10" />
    </>
  );
}
