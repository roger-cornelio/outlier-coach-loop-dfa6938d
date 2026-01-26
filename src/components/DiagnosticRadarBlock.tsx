/**
 * DiagnosticRadarBlock - Diagnóstico fisiológico de duas camadas (OUTLIER)
 * 
 * CAMADA 1 (Principal) - Perfil Fisiológico:
 * - 6 valências: Cardio, Força, Potência, Anaeróbica, Core, Eficiência
 * - Cor laranja OUTLIER, preenchimento ativo (~65%), linha espessa
 * - Elemento visual dominante
 * 
 * CAMADA 2 (Secundária) - Performance na Prova:
 * - 9 métricas: 8 estações HYROX + Corrida
 * - Linha fina, sem preenchimento, cor neutra (~25-30% opacidade)
 * - Função explicativa e secundária
 * 
 * UX RULE: Usuário entende em <3s:
 * - Camada 1 = "O que eu sou fisicamente"
 * - Camada 2 = "Onde isso aparece na prova"
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

// ============================================
// TYPES
// ============================================

interface PhysiologicalDimension {
  name: string;
  shortName: string;
  value: number;
  fullMark: 100;
}

interface StationPerformance {
  shortName: string;
  fullName: string;
  value: number;
}

// ============================================
// CONSTANTS - 6 Valências Fisiológicas
// ============================================

const PHYSIOLOGICAL_DIMENSIONS = [
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
] as const;

// 9 estações HYROX para Camada 2
const STATION_METRICS = [
  { key: 'run_avg', shortName: 'Run', fullName: 'Corrida' },
  { key: 'ski', shortName: 'Ski', fullName: 'SkiErg' },
  { key: 'sled_push', shortName: 'Push', fullName: 'Sled Push' },
  { key: 'sled_pull', shortName: 'Pull', fullName: 'Sled Pull' },
  { key: 'bbj', shortName: 'BBJ', fullName: 'Burpee BJ' },
  { key: 'row', shortName: 'Row', fullName: 'Remo' },
  { key: 'farmers', shortName: 'Farm', fullName: 'Farmers' },
  { key: 'sandbag', shortName: 'Bag', fullName: 'Sandbag' },
  { key: 'wallballs', shortName: 'WB', fullName: 'Wall Balls' }
] as const;

// ============================================
// DATA PROCESSING
// ============================================

function aggregateToPhysiologicalDimensions(scores: CalculatedScore[]): PhysiologicalDimension[] {
  if (!scores || scores.length === 0) return [];

  const scoreMap = new Map<string, number>();
  scores.forEach(s => {
    scoreMap.set(s.metric, s.percentile_value);
  });

  const avgMetrics = (metrics: readonly string[]): number => {
    const values = metrics
      .map(m => scoreMap.get(m))
      .filter((v): v is number => v !== undefined && v !== null);
    return values.length > 0 
      ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
      : 50;
  };

  return PHYSIOLOGICAL_DIMENSIONS.map(dim => ({
    name: dim.name,
    shortName: dim.shortName,
    value: avgMetrics(dim.metrics),
    fullMark: 100
  }));
}

function extractStationPerformance(scores: CalculatedScore[]): StationPerformance[] {
  if (!scores || scores.length === 0) return [];

  const scoreMap = new Map<string, number>();
  scores.forEach(s => {
    scoreMap.set(s.metric, s.percentile_value);
  });

  return STATION_METRICS.map(station => ({
    shortName: station.shortName,
    fullName: station.fullName,
    value: scoreMap.get(station.key) ?? 0
  }));
}

// ============================================
// INTERPRETIVE TEXT GENERATION
// ============================================

interface InterpretationResult {
  headline: string;
  insight: string;
}

function generateInterpretation(
  physiologicalData: PhysiologicalDimension[],
  stationData: StationPerformance[]
): InterpretationResult {
  if (physiologicalData.length === 0 || stationData.length === 0) {
    return {
      headline: 'Leitura rápida',
      insight: 'Complete uma prova ou simulado para obter sua análise personalizada.'
    };
  }

  // Calculate averages
  const avgPhysiological = Math.round(
    physiologicalData.reduce((sum, d) => sum + d.value, 0) / physiologicalData.length
  );
  const avgPerformance = Math.round(
    stationData.reduce((sum, s) => sum + s.value, 0) / stationData.length
  );

  // Find weakest/strongest physiological areas
  const weakestPhysio = [...physiologicalData].sort((a, b) => a.value - b.value)[0];
  const strongestPhysio = [...physiologicalData].sort((a, b) => b.value - a.value)[0];

  // Find stations below expected (lower than avg physiological)
  const underperformingStations = stationData.filter(s => s.value < avgPhysiological - 10);

  // Gap analysis: performance vs capability
  const gap = avgPhysiological - avgPerformance;

  // Generate dynamic insight based on data
  if (gap > 15) {
    const stationNames = underperformingStations.slice(0, 2).map(s => s.fullName).join(' e ');
    return {
      headline: 'Leitura rápida',
      insight: `Seu desempenho em ${stationNames || 'algumas estações'} está abaixo do esperado para o nível fisiológico atual, indicando um possível limitador de eficiência ou estratégia sob fadiga.`
    };
  } else if (gap < -10) {
    return {
      headline: 'Leitura rápida',
      insight: `Você está maximizando seu potencial atual. Sua estratégia de prova e eficiência técnica compensam bem suas características fisiológicas.`
    };
  } else if (weakestPhysio.value < 40) {
    return {
      headline: 'Leitura rápida',
      insight: `${weakestPhysio.name} é seu maior limitador atual (percentil ${weakestPhysio.value}). Focar nessa valência pode destravar ganhos significativos nas estações relacionadas.`
    };
  } else if (strongestPhysio.value > 75 && weakestPhysio.value > 50) {
    return {
      headline: 'Leitura rápida',
      insight: `Perfil equilibrado com ${strongestPhysio.name} como ponto forte (percentil ${strongestPhysio.value}). Mantenha consistência e refine estratégia de prova para otimizar resultados.`
    };
  } else if (underperformingStations.length >= 3) {
    return {
      headline: 'Leitura rápida',
      insight: `Múltiplas estações apresentam desempenho abaixo do seu potencial. Revise estratégia de pacing e distribuição de esforço ao longo da prova.`
    };
  } else {
    return {
      headline: 'Leitura rápida',
      insight: `Seu perfil mostra ${strongestPhysio.name} como destaque e oportunidade de evolução em ${weakestPhysio.name}. O equilíbrio entre capacidade e execução está alinhado.`
    };
  }
}

// ============================================
// PHYSIOLOGICAL ESTIMATES
// ============================================

function estimateVO2Max(scores: CalculatedScore[]): { value: number; isEstimated: boolean } {
  const runScore = scores.find(s => s.metric === 'run_avg');
  if (!runScore) return { value: 0, isEstimated: true };
  
  const percentile = runScore.percentile_value;
  const vo2 = Math.round(35 + (percentile / 100) * 30);
  
  return { value: vo2, isEstimated: true };
}

function estimateLactateThreshold(scores: CalculatedScore[]): { pace: string; percentage: number; isEstimated: boolean } {
  const runScore = scores.find(s => s.metric === 'run_avg');
  if (!runScore) return { pace: '--:--', percentage: 0, isEstimated: true };
  
  const rawTimeSec = runScore.raw_time_sec;
  const paceMin = Math.floor(rawTimeSec / 60);
  const paceSec = rawTimeSec % 60;
  const paceFormatted = `${paceMin}:${paceSec.toString().padStart(2, '0')}`;
  
  const ltPercentage = Math.round(75 + (runScore.percentile_value / 100) * 15);
  
  return { pace: paceFormatted, percentage: ltPercentage, isEstimated: true };
}

// ============================================
// COMPONENT
// ============================================

export function DiagnosticRadarBlock({ 
  scores, 
  loading = false, 
  hasData 
}: DiagnosticRadarBlockProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  // Agregar scores em 6 valências fisiológicas (Camada 1)
  const radarData = useMemo(() => aggregateToPhysiologicalDimensions(scores), [scores]);
  
  // Extrair performance por estação (Camada 2)
  const stationData = useMemo(() => extractStationPerformance(scores), [scores]);
  
  // Parâmetros fisiológicos mensuráveis
  const vo2Max = useMemo(() => estimateVO2Max(scores), [scores]);
  const lactateThreshold = useMemo(() => estimateLactateThreshold(scores), [scores]);
  
  // Texto interpretativo automático
  const interpretation = useMemo(
    () => generateInterpretation(radarData, stationData),
    [radarData, stationData]
  );

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

      {/* ============================================
          RADAR DE DUAS CAMADAS
          ============================================ */}
      <div className="h-80 sm:h-96 md:h-[28rem] relative">
        {/* CAMADA 1: Perfil Fisiológico (Principal - Laranja) */}
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
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
                fontSize: 12,
                fontWeight: 600
              }}
              tickLine={false}
            />
            
            {/* CAMADA 1: Área preenchida - cor OUTLIER laranja, dominante */}
            <Radar
              name="Perfil Fisiológico"
              dataKey="value"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
              fill="hsl(var(--primary))"
              fillOpacity={0.65}
              dot={false}
            />
          </RadarChart>
        </ResponsiveContainer>

        {/* CAMADA 2: Performance na Prova (Secundária - Linha neutra) */}
        <div className="absolute inset-0 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={stationData}>
              {/* Sem grid para overlay */}
              <PolarGrid stroke="transparent" />
              
              {/* Labels das estações - sutis */}
              <PolarAngleAxis
                dataKey="shortName"
                tick={{ 
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 9,
                  fontWeight: 400
                }}
                tickLine={false}
              />
              
              {/* CAMADA 2: Linha fina, sem preenchimento, opacidade baixa */}
              <Radar
                name="Performance na Prova"
                dataKey="value"
                stroke="hsl(var(--foreground) / 0.3)"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                fill="transparent"
                fillOpacity={0}
                dot={false}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Legenda visual */}
      <div className="flex justify-center gap-6 mt-2 mb-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-3 rounded-sm bg-primary"
            style={{ opacity: 0.65 }}
          />
          <span className="text-xs text-muted-foreground">Perfil Fisiológico</span>
        </div>
        <div className="flex items-center gap-2">
          <div 
            className="w-4 h-px bg-foreground/30"
            style={{ borderTop: '2px dashed hsl(var(--foreground) / 0.3)' }}
          />
          <span className="text-xs text-muted-foreground">Estações na Prova</span>
        </div>
      </div>

      {/* Texto explicativo obrigatório */}
      <p className="text-sm text-muted-foreground text-center">
        Perfil fisiológico baseado na sua última prova registrada.
      </p>

      {/* ============================================
          LEITURA INTERPRETATIVA AUTOMÁTICA
          ============================================ */}
      <div className="mt-5 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground font-medium tracking-wider uppercase mb-2">
          {interpretation.headline}
        </p>
        <p className="text-sm text-foreground/90 leading-relaxed">
          {interpretation.insight}
        </p>
      </div>

      {/* PARÂMETROS FISIOLÓGICOS MENSURÁVEIS */}
      <TooltipProvider>
        <div className="mt-5 grid grid-cols-2 gap-3">
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
                {vo2Max.value || 45}
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
                {lactateThreshold.pace || '5:14'}
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

      {/* Toggle para Camada 2 em barras (detalhes extras) */}
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

      {/* Barras de estação (opcional, para análise detalhada) */}
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