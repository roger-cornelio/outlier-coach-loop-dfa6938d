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
  iniciante: {
    label: 'INICIANTE',
    labelColor: 'text-slate-400',
    crownColor: 'text-slate-400',
    sublabel: 'Nível base',
  },
  intermediario: {
    label: 'INTERMEDIÁRIO',
    labelColor: 'text-emerald-400',
    crownColor: 'text-emerald-400',
    sublabel: 'Nível intermediário',
  },
  avancado: {
    label: 'AVANÇADO',
    labelColor: 'text-orange-400',
    crownColor: 'text-orange-400',
    sublabel: 'Nível avançado',
  },
  hyrox_open: {
    label: 'HYROX OPEN',
    labelColor: 'text-purple-400',
    crownColor: 'text-purple-400',
    sublabel: 'Nível competitivo',
  },
  hyrox_pro: {
    label: 'HYROX PRO',
    labelColor: 'text-amber-400',
    crownColor: 'text-amber-400',
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
      className={cn('flex flex-col items-center text-center py-10 md:py-14', className)}
    >
      {/* Nome do Atleta - Grande e Bold */}
      <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-wide text-foreground uppercase mb-5">
        {name}
      </h1>
      
      {/* Badge de Status com Coroa */}
      <div className="flex items-center gap-3 mb-2">
        <StatusCrownPreset size="md" colorClass={config.crownColor} />
        <span className={cn('font-semibold text-base sm:text-lg tracking-wider', config.labelColor)}>
          {config.label}
        </span>
      </div>
      
      {/* Sublabel - Nível */}
      <p className="text-muted-foreground text-base">
        {config.sublabel}
      </p>
    </motion.div>
  );
}

export default AthleteHeroIdentity;
