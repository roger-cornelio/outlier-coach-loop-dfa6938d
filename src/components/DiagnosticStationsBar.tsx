/**
 * DiagnosticStationsBar - Barras horizontais para as 9 estações HYROX
 * 
 * CAMADA 2 - Diagnóstico Detalhado:
 * - 9 competências obrigatórias (Run, SkiErg, Sled Push, Sled Pull, BBJ, Row, Farmers, Lunges, Wall Balls)
 * - Mesma escala visual para todas
 * - Sem ranking ou comparação com outros atletas
 * - Estilo premium e técnico
 */

import { motion } from 'framer-motion';
import { type CalculatedScore } from '@/utils/hyroxPercentileCalculator';

interface DiagnosticStationsBarsProps {
  scores: CalculatedScore[];
}

// Mapeamento das 9 estações HYROX (nomes amigáveis)
const STATIONS = [
  { key: 'run_avg', label: 'Run', color: 'hsl(var(--chart-2))' },
  { key: 'ski', label: 'SkiErg', color: 'hsl(var(--primary))' },
  { key: 'sled_push', label: 'Sled Push', color: 'hsl(var(--primary))' },
  { key: 'sled_pull', label: 'Sled Pull', color: 'hsl(var(--primary))' },
  { key: 'bbj', label: 'Burpee Broad Jump', color: 'hsl(var(--primary))' },
  { key: 'row', label: 'Row', color: 'hsl(var(--primary))' },
  { key: 'farmers', label: 'Farmers Carry', color: 'hsl(var(--primary))' },
  { key: 'sandbag', label: 'Lunges', color: 'hsl(var(--primary))' },
  { key: 'wallballs', label: 'Wall Balls', color: 'hsl(var(--primary))' },
] as const;

export function DiagnosticStationsBars({ scores }: DiagnosticStationsBarsProps) {
  // Criar mapa de scores para lookup rápido
  const scoreMap = new Map<string, number>();
  scores.forEach(s => {
    scoreMap.set(s.metric, s.percentile_value);
  });

  // Montar dados das barras
  const barsData = STATIONS.map(station => ({
    ...station,
    value: scoreMap.get(station.key) ?? 0,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="space-y-3"
    >
      <h4 className="font-display text-xs text-muted-foreground tracking-wide uppercase">
        Desempenho por Estação
      </h4>
      
      <div className="space-y-2">
        {barsData.map((station, index) => (
          <motion.div
            key={station.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * index }}
            className="flex items-center gap-3"
          >
            {/* Label da estação */}
            <span className="text-xs text-muted-foreground w-28 sm:w-32 truncate">
              {station.label}
            </span>
            
            {/* Barra de progresso */}
            <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${station.value}%` }}
                transition={{ 
                  duration: 0.6, 
                  delay: 0.1 + (0.05 * index),
                  ease: 'easeOut' 
                }}
                className="h-full rounded-full"
                style={{ 
                  backgroundColor: station.key === 'run_avg' 
                    ? 'hsl(var(--chart-2))' 
                    : 'hsl(var(--primary))',
                  opacity: station.value > 0 ? 1 : 0.2
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
