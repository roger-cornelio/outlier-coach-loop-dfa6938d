/**
 * SecondaryActions - Ações secundárias discretas do Dashboard
 * 
 * Abaixo do CTA principal:
 * - Ver Treino Semanal
 * - Ajustar treino para o meu box
 * 
 * Esses botões são secundários, menor contraste visual.
 */

import { motion } from 'framer-motion';
import { Calendar, Wrench } from 'lucide-react';

interface SecondaryActionsProps {
  onViewWeeklyTraining: () => void;
  onAdjustTraining: () => void;
  hasWorkouts?: boolean;
}

export function SecondaryActions({
  onViewWeeklyTraining,
  onAdjustTraining,
  hasWorkouts = true
}: SecondaryActionsProps) {
  if (!hasWorkouts) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col sm:flex-row justify-center gap-3"
    >
      {/* Ver Treino Semanal */}
      <button
        onClick={onViewWeeklyTraining}
        className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all text-sm"
      >
        <Calendar className="w-4 h-4" />
        <span>Ver Treino Semanal</span>
      </button>

      {/* Ajustar treino */}
      <button
        onClick={onAdjustTraining}
        className="flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border/50 text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all text-sm"
      >
        <Wrench className="w-4 h-4" />
        <span>Ajustar treino para o meu box</span>
      </button>
    </motion.div>
  );
}
