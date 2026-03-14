/**
 * DiagnosticStationsBars - Barras horizontais para as 9 estações HYROX
 * 
 * CAMADA 2 - Diagnóstico Detalhado:
 * - 9 estações HYROX obrigatórias
 * - Mesma escala visual para todas
 * - Sem ranking ou comparação com outros atletas
 * - Destaque visual apenas para pontos críticos
 * - Data labels com tempo real (raw_time_sec) quando disponível
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

/** Format seconds to MM:SS or HH:MM:SS */
function formatTimeSec(sec: number): string {
  if (!sec || sec <= 0) return '—';
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.round(sec % 60);
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function DiagnosticStationsBars({ scores }: DiagnosticStationsBarsProps) {
  // Criar mapa de scores para lookup rápido
  const scoreMap = new Map<string, CalculatedScore>();
  scores.forEach(s => {
    scoreMap.set(s.metric, s);
  });

  // Montar dados das barras
  const barsData = STATIONS.map(station => {
    const score = scoreMap.get(station.key);
    return {
      ...station,
      value: score?.percentile_value ?? 0,
      rawTimeSec: score?.raw_time_sec ?? 0,
    };
  });

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
            
            {/* Barra de progresso + data label */}
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 h-4 bg-muted/20 rounded-r-md overflow-hidden">
                {station.value > 0 ? (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${station.value}%` }}
                    transition={{ 
                      duration: 0.5, 
                      delay: 0.08 + (0.03 * index),
                      ease: 'easeOut' 
                    }}
                    className="h-full rounded-r-md"
                    style={{ backgroundColor: getBarColor(station.value) }}
                  />
                ) : (
                  <div className="h-full w-full bg-muted/5 rounded-r-md" />
                )}
              </div>
              
              {/* Data label: tempo real se disponível, senão percentil ou traço */}
              <span className="text-[10px] tabular-nums text-muted-foreground shrink-0 min-w-[42px] text-right">
                {station.rawTimeSec > 0
                  ? formatTimeSec(station.rawTimeSec)
                  : station.value > 0
                    ? `${station.value}%`
                    : '—'}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
