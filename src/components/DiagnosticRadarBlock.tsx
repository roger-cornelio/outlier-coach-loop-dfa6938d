/**
 * DiagnosticRadarBlock - Diagnóstico em duas camadas (Valências Fisiológicas)
 * 
 * CAMADA 1 - Perfil Fisiológico (Radar Principal):
 * - 6 valências fisiológicas HYROX obrigatórias
 * - Radar visualmente maior, estilo premium
 * - Sem números ou escala visível
 * 
 * CAMADA 2 - Diagnóstico por Estação (Detalhado):
 * - Barras horizontais para as 9 estações HYROX
 * - Mesma escala visual para todas
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  Radar, 
  ResponsiveContainer 
} from 'recharts';
import { Activity, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { type CalculatedScore } from '@/utils/hyroxPercentileCalculator';
import { DiagnosticStationsBars } from './DiagnosticStationsBar';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface DiagnosticRadarBlockProps {
  scores: CalculatedScore[];
  loading?: boolean;
  hasData: boolean;
}

// Agregação de métricas em 6 valências fisiológicas HYROX
interface PhysiologicalDimension {
  name: string;
  shortName: string;
  value: number;
  fullMark: 100;
}

/**
 * Mapeia métricas HYROX para 6 valências fisiológicas reais
 * 
 * 1. Resistência Cardiovascular / Aeróbica → Run
 * 2. Força & Resistência Muscular Local → Sled Push, Sled Pull, Farmers
 * 3. Potência & Vigor → SkiErg, Row (power output)
 * 4. Capacidade Anaeróbica → BBJ, Wall Balls (alta intensidade)
 * 5. Core & Estabilidade → Sandbag Lunges
 * 6. Coordenação & Eficiência sob Fadiga → Média geral (consistência)
 */
function aggregateToPhysiologicalDimensions(scores: CalculatedScore[]): PhysiologicalDimension[] {
  if (!scores || scores.length === 0) return [];

  const scoreMap = new Map<string, number>();
  scores.forEach(s => {
    scoreMap.set(s.metric, s.percentile_value);
  });

  // Helper para calcular média de métricas
  const avgMetrics = (metrics: string[]): number => {
    const values = metrics
      .map(m => scoreMap.get(m))
      .filter((v): v is number => v !== undefined && v !== null);
    return values.length > 0 
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 50;
  };

  // 6 Valências Fisiológicas HYROX (obrigatórias)
  const dimensions: { name: string; shortName: string; metrics: string[] }[] = [
    { 
      name: 'Resistência Cardiovascular', 
      shortName: 'Cardio',
      metrics: ['run_avg'] 
    },
    { 
      name: 'Força & Resistência Muscular', 
      shortName: 'Força',
      metrics: ['sled_push', 'sled_pull', 'farmers'] 
    },
    { 
      name: 'Potência & Vigor', 
      shortName: 'Potência',
      metrics: ['ski', 'row'] 
    },
    { 
      name: 'Capacidade Anaeróbica', 
      shortName: 'Anaeróbica',
      metrics: ['bbj', 'wallballs'] 
    },
    { 
      name: 'Core & Estabilidade', 
      shortName: 'Core',
      metrics: ['sandbag'] 
    },
    { 
      name: 'Coordenação sob Fadiga', 
      shortName: 'Eficiência',
      metrics: ['run_avg', 'ski', 'sled_push', 'sled_pull', 'bbj', 'row', 'farmers', 'sandbag', 'wallballs'] 
    }
  ];

  return dimensions.map(dim => ({
    name: dim.name,
    shortName: dim.shortName,
    value: avgMetrics(dim.metrics),
    fullMark: 100
  }));
}

/**
 * Estima VO₂ Max baseado na performance de corrida
 * Fórmula simplificada baseada em ritmo médio de 1km
 */
function estimateVO2Max(scores: CalculatedScore[]): { value: number; isEstimated: boolean } {
  const runScore = scores.find(s => s.metric === 'run_avg');
  if (!runScore) return { value: 0, isEstimated: true };
  
  // Estimativa baseada no percentil de corrida (simplificado)
  // P90 ≈ 60 ml/kg/min, P50 ≈ 45 ml/kg/min, P10 ≈ 35 ml/kg/min
  const percentile = runScore.percentile_value;
  const vo2 = Math.round(35 + (percentile / 100) * 30);
  
  return { value: vo2, isEstimated: true };
}

/**
 * Estima Limiar de Lactato baseado no ritmo de corrida
 * Retorna ritmo em formato mm:ss/km
 */
function estimateLactateThreshold(scores: CalculatedScore[]): { pace: string; percentage: number; isEstimated: boolean } {
  const runScore = scores.find(s => s.metric === 'run_avg');
  if (!runScore) return { pace: '--:--', percentage: 0, isEstimated: true };
  
  // Estima ritmo baseado no tempo raw (run_avg é média de 1km)
  const rawTimeSec = runScore.raw_time_sec;
  const paceMin = Math.floor(rawTimeSec / 60);
  const paceSec = rawTimeSec % 60;
  const paceFormatted = `${paceMin}:${paceSec.toString().padStart(2, '0')}`;
  
  // Percentual do VO₂ no limiar (tipicamente 75-90%)
  const ltPercentage = Math.round(75 + (runScore.percentile_value / 100) * 15);
  
  return { pace: paceFormatted, percentage: ltPercentage, isEstimated: true };
}

export function DiagnosticRadarBlock({ 
  scores, 
  loading = false, 
  hasData 
}: DiagnosticRadarBlockProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Agregar scores em 6 valências fisiológicas
  const radarData = useMemo(() => aggregateToPhysiologicalDimensions(scores), [scores]);
  
  // Parâmetros fisiológicos mensuráveis
  const vo2Max = useMemo(() => estimateVO2Max(scores), [scores]);
  const lactateThreshold = useMemo(() => estimateLactateThreshold(scores), [scores]);

  // Estado carregando
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated p-6 border-l-4 border-l-muted-foreground/30"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          PERFIL FISIOLÓGICO
        </h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground/60 text-sm">Carregando diagnóstico...</p>
        </div>
      </motion.div>
    );
  }

  // Estado vazio
  if (!hasData || radarData.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated p-6 border-l-4 border-l-muted-foreground/30"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          PERFIL FISIOLÓGICO
        </h3>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Activity className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm text-center max-w-xs">
            Lance seu primeiro simulado ou prova oficial para ver seu perfil fisiológico completo.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated p-6 border-l-4 border-l-primary"
    >
      <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-2">
        PERFIL FISIOLÓGICO
      </h3>

      {/* CAMADA 1 - Perfil Fisiológico (Radar Grande) */}
      <div className="h-80 sm:h-96 md:h-[28rem]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            {/* Grid sutil sem números */}
            <PolarGrid 
              stroke="hsl(var(--border))" 
              strokeOpacity={0.25}
              gridType="polygon"
            />
            
            {/* Labels das valências - tipografia legível */}
            <PolarAngleAxis
              dataKey="shortName"
              tick={{ 
                fill: 'hsl(var(--foreground))',
                fontSize: 11,
                fontWeight: 500
              }}
              tickLine={false}
            />
            
            {/* Área preenchida - cor HYROX PRO (amarelo/dourado) */}
            <Radar
              name="Perfil"
              dataKey="value"
              stroke="#FBBF24"
              strokeWidth={3}
              fill="#FBBF24"
              fillOpacity={0.2}
              dot={false}
              style={{ filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.4))' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Texto explicativo obrigatório */}
      <p className="text-sm text-muted-foreground mt-2 text-center">
        Perfil fisiológico baseado na sua última prova registrada.
      </p>

      {/* PARÂMETROS FISIOLÓGICOS MENSURÁVEIS */}
      <TooltipProvider>
        <div className="mt-6 grid grid-cols-2 gap-3">
          {/* VO₂ Max */}
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/20 border border-border/20">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                VO₂ Max
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  <p className="text-xs">Capacidade máxima de consumo de oxigênio. Indica o potencial aeróbico do atleta.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-xl font-semibold text-foreground">
                45
              </span>
              <span className="text-[10px] text-muted-foreground">
                ml/kg/min
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground/60 italic">
              estimado
            </span>
          </div>

          {/* Limiar de Lactato */}
          <div className="flex flex-col items-center p-3 rounded-lg bg-muted/20 border border-border/20">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">
                Limiar de Lactato
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px]">
                  <p className="text-xs">Ritmo máximo que pode ser sustentado sem acúmulo excessivo de lactato.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-xl font-semibold text-foreground">
                5:14
              </span>
              <span className="text-[10px] text-muted-foreground">
                /km
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground/60 italic">
              ritmo sustentável
            </span>
          </div>
        </div>
      </TooltipProvider>

      {/* Toggle para Camada 2 */}
      <div className="mt-5 pt-4 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={() => setShowDetails(!showDetails)}
        >
          {showDetails ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Ocultar análise por estação
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Ver análise detalhada por estação
            </>
          )}
        </Button>
      </div>

      {/* CAMADA 2 - Diagnóstico por Estação (Barras) */}
      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 overflow-hidden"
          >
            <DiagnosticStationsBars scores={scores} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
