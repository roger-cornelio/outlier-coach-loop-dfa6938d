import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { StatusCrownPreset } from '@/components/ui/StatusCrownPreset';
import type { AthleteStatus } from '@/types/outlier';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AthleteHeroIdentity — Bloco Hero de Identidade do Atleta
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Exibe o nome do atleta em destaque + badge de status HYROX.
 * Estilo: Nome grande, bold, uppercase + coroa com nível.
 */

interface AthleteHeroIdentityProps {
  name: string;
  status: AthleteStatus;
  className?: string;
}

// Configuração visual por status
const STATUS_CONFIG: Record<AthleteStatus, {
  label: string;
  labelColor: string;
  crownColor: string;
  sublabel: string;
}> = {
  open: {
    label: 'OPEN',
    labelColor: 'text-purple-400',
    crownColor: 'text-purple-400',
    sublabel: 'Nível competitivo',
  },
  pro: {
    label: 'PRO',
    labelColor: 'text-amber-400',
    crownColor: 'text-amber-400',
    sublabel: 'Nível profissional',
  },
  elite: {
    label: 'ELITE',
    labelColor: 'text-yellow-300',
    crownColor: 'text-yellow-300',
    sublabel: 'Nível mundial',
  },
};

export function AthleteHeroIdentity({
  name,
  status,
  className,
}: AthleteHeroIdentityProps) {
  const config = STATUS_CONFIG[status];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex flex-col items-center text-center py-6', className)}
    >
      {/* Nome do Atleta - Grande e Bold */}
      <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-wide text-foreground uppercase mb-3">
        {name}
      </h1>
      
      {/* Badge de Status com Coroa */}
      <div className="flex items-center gap-2 mb-1">
        <StatusCrownPreset status={status} size="sm" colorClass={config.crownColor} />
        <span className={cn('font-semibold text-sm sm:text-base tracking-wider', config.labelColor)}>
          {config.label}
        </span>
      </div>
      
      {/* Sublabel - Nível */}
      <p className="text-muted-foreground text-sm">
        {config.sublabel}
      </p>
    </motion.div>
  );
}

export default AthleteHeroIdentity;
