/**
 * PhysiologicalMetrics - Métricas fisiológicas objetivas (VO2 Max, Limiar de Lactato)
 * 
 * Exibir valores objetivos fora do radar:
 * - VO₂ Max: XX ml/kg/min
 * - Limiar de Lactato: XX km/h ou XX min/km
 * 
 * Formato de cards pequenos ou linha horizontal discreta.
 * Reforça credibilidade científica.
 */

import { motion } from 'framer-motion';
import { Heart, Zap } from 'lucide-react';

interface PhysiologicalMetricsProps {
  /** VO2 Max em ml/kg/min - null se não disponível */
  vo2Max?: number | null;
  /** Limiar de lactato em min/km ou km/h - null se não disponível */
  lactatoThreshold?: string | null;
  /** Se está carregando */
  loading?: boolean;
}

export function PhysiologicalMetrics({
  vo2Max,
  lactatoThreshold,
  loading = false
}: PhysiologicalMetricsProps) {
  // Se não tem dados, não renderiza (componente futuro)
  if (loading) {
    return (
      <div className="flex justify-center gap-6 py-4">
        <div className="h-16 w-32 bg-muted/20 rounded-lg animate-pulse" />
        <div className="h-16 w-32 bg-muted/20 rounded-lg animate-pulse" />
      </div>
    );
  }

  // Se não tem valores, mostrar placeholder discreto
  const hasData = vo2Max || lactatoThreshold;
  
  if (!hasData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex justify-center gap-4 py-4"
      >
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/10 border border-border/30">
          <Heart className="w-4 h-4 text-muted-foreground/40" />
          <div className="text-left">
            <p className="text-xs text-muted-foreground/60">VO₂ Max</p>
            <p className="text-sm text-muted-foreground/40">—</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/10 border border-border/30">
          <Zap className="w-4 h-4 text-muted-foreground/40" />
          <div className="text-left">
            <p className="text-xs text-muted-foreground/60">Limiar Lactato</p>
            <p className="text-sm text-muted-foreground/40">—</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="flex justify-center gap-4 py-4"
    >
      {/* VO2 Max */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-primary/5 border border-primary/20">
        <Heart className="w-4 h-4 text-primary" />
        <div className="text-left">
          <p className="text-xs text-muted-foreground">VO₂ Max</p>
          <p className="text-sm font-semibold text-foreground">
            {vo2Max ? `${vo2Max} ml/kg/min` : '—'}
          </p>
        </div>
      </div>

      {/* Limiar de Lactato */}
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
        <Zap className="w-4 h-4 text-amber-500" />
        <div className="text-left">
          <p className="text-xs text-muted-foreground">Limiar Lactato</p>
          <p className="text-sm font-semibold text-foreground">
            {lactatoThreshold || '—'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
