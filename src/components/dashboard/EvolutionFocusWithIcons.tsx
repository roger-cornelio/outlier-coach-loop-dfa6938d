/**
 * EvolutionFocusWithIcons - Focos de Evolução com ícones por estação
 * 
 * Exibir lista de estações HYROX com ícones próprios:
 * - 🛷 Sled Pull — força abaixo do esperado
 * - 🎒 Sandbag Lunges — força abaixo do esperado
 * 
 * Regras visuais:
 * - Um ícone por estação (visual universal)
 * - Cor vermelha para pontos fracos
 * - Texto curto e direto
 * 
 * Rodapé: "Esses pontos já estão sendo atacados no seu plano atual."
 */

import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import type { EvolutionFocusPoint } from '@/hooks/useEvolutionFocus';

interface EvolutionFocusWithIconsProps {
  focusPoints: EvolutionFocusPoint[];
  hasData: boolean;
  loading?: boolean;
  onViewEvolution?: () => void;
}

// Ícones visuais por estação HYROX
const STATION_ICONS: Record<string, string> = {
  run_avg: '🏃',
  ski: '⛷️',
  sled_push: '🛒',
  sled_pull: '🛷',
  bbj: '🦘',
  row: '🚣',
  farmers: '🧺',
  sandbag: '🎒',
  wallballs: '🏀',
  roxzone: '⏱️',
};

// Labels amigáveis das estações
const STATION_LABELS: Record<string, string> = {
  run_avg: 'Run',
  ski: 'SkiErg',
  sled_push: 'Sled Push',
  sled_pull: 'Sled Pull',
  bbj: 'Burpee Broad Jump',
  row: 'Row',
  farmers: 'Farmers Carry',
  sandbag: 'Sandbag Lunges',
  wallballs: 'Wall Balls',
  roxzone: 'Roxzone',
};

export function EvolutionFocusWithIcons({
  focusPoints,
  hasData,
  loading = false,
  onViewEvolution
}: EvolutionFocusWithIconsProps) {
  // Estado carregando
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated p-6"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-4">
          FOCOS DE EVOLUÇÃO
        </h3>
        <div className="space-y-3">
          <div className="h-8 bg-muted/20 rounded animate-pulse" />
          <div className="h-8 bg-muted/20 rounded animate-pulse" />
        </div>
      </motion.div>
    );
  }

  // Estado vazio
  if (!hasData || focusPoints.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated p-6 border-l-4 border-l-muted-foreground/30"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          ONDE VOCÊ PERDE TEMPO NA PROVA
        </h3>
        <p className="text-muted-foreground text-sm mb-3">
          Lance um simulado ou prova oficial para ver seus pontos de evolução.
        </p>
        {onViewEvolution && (
          <button
            onClick={onViewEvolution}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Ir para Evolução</span>
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated p-6 border-l-4 border-l-destructive"
    >
      <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-4">
        ONDE VOCÊ PERDE TEMPO NA PROVA
      </h3>
      
      {/* Lista de focos com ícones */}
      <div className="space-y-3 mb-4">
        {focusPoints.map((point, index) => {
          const icon = STATION_ICONS[point.metric] || '📍';
          const label = STATION_LABELS[point.metric] || point.label;
          
          // Determinar severidade visual
          const isCritical = point.percentile < 25;
          const textColor = isCritical ? 'text-destructive' : 'text-amber-500';
          
          return (
            <motion.div
              key={point.metric}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index }}
              className="flex items-start gap-3"
            >
              {/* Ícone visual da estação */}
              <span className="text-xl">{icon}</span>
              
              {/* Label e descrição */}
              <div className="flex-1">
                <span className={`font-semibold ${textColor}`}>
                  {label}
                </span>
                <span className="text-muted-foreground"> — </span>
                <span className="text-foreground text-sm">
                  {point.description.split('—')[1]?.trim() || 'força abaixo do esperado'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Texto fixo obrigatório */}
      <p className="text-sm text-muted-foreground italic border-t border-border/50 pt-3">
        Esses pontos já estão sendo atacados no seu plano atual.
      </p>
    </motion.div>
  );
}
