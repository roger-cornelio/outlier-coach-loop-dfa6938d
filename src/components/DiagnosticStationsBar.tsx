/**
 * DiagnosticStationsBars - Barras horizontais para as 9 estações HYROX
 * 
 * CAMADA 2 - Diagnóstico Detalhado:
 * - 9 estações HYROX obrigatórias
 * - Mesma escala visual para todas
 * - Sem ranking ou comparação com outros atletas
 * - Destaque visual apenas para pontos críticos
 */

import { motion } from 'framer-motion';
import { type CalculatedScore } from '@/utils/hyroxPercentileCalculator';

interface DiagnosticStationsBarsProps {
  scores: CalculatedScore[];
}

// Mapeamento das 9 estações HYROX (nomes oficiais)
const STATIONS = [
  { key: 'run_avg', label: 'Run' },
  { key: 'ski', label: 'SkiErg' },
  { key: 'sled_push', label: 'Sled Push' },
  { key: 'sled_pull', label: 'Sled Pull' },
  { key: 'bbj', label: 'Burpee Broad Jump' },
  { key: 'row', label: 'Row' },
  { key: 'farmers', label: 'Farmers Carry' },
  { key: 'sandbag', label: 'Sandbag Lunges' },
  { key: 'wallballs', label: 'Wall Balls' },
] as const;

// Determina cor da barra baseado no percentile (destaque para pontos críticos)
function getBarColor(value: number): string {
  if (value < 25) return 'hsl(var(--destructive))'; // Crítico - vermelho
  if (value < 40) return 'hsl(var(--chart-2))'; // Atenção - laranja
  return 'hsl(var(--primary))'; // Normal - cor primária
}

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
      className="space-y-4"
    >
      <p className="text-xs text-muted-foreground text-center">
        Análise detalhada por estação da última prova.
      </p>
      
      <div className="space-y-2.5">
        {barsData.map((station, index) => (
          <motion.div
            key={station.key}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.03 * index }}
            className="flex items-center gap-3"
          >
            {/* Label da estação */}
            <span className="text-xs text-muted-foreground w-32 sm:w-36 truncate">
              {station.label}
            </span>
            
            {/* Barra de progresso */}
            <div className="flex-1 h-2.5 bg-muted/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${station.value}%` }}
                transition={{ 
                  duration: 0.5, 
                  delay: 0.08 + (0.03 * index),
                  ease: 'easeOut' 
                }}
                className="h-full rounded-full"
                style={{ 
                  backgroundColor: getBarColor(station.value),
                  opacity: station.value > 0 ? 1 : 0.15
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
