/**
 * DashboardSecondaryActions - Ações secundárias do Dashboard
 * 
 * Função: Links discretos para navegação secundária
 * 
 * Conteúdo:
 * - Ver Treino Semanal
 * - Ajustar treino para o meu box
 * 
 * Visual: menor contraste, não compete com CTA principal
 */

import { Link } from 'react-router-dom';
import { Calendar, Wrench } from 'lucide-react';
import { motion } from 'framer-motion';

export function DashboardSecondaryActions() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3 }}
      className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6"
    >
      <Link
        to="/app/treino"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <Calendar className="w-4 h-4" />
        <span>Ver treino semanal</span>
      </Link>

      <span className="hidden sm:block text-muted-foreground/30">|</span>

      <Link
        to="/app/ajustes"
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <Wrench className="w-4 h-4" />
        <span>Ajustar treino para o meu box</span>
      </Link>
    </motion.div>
  );
}
