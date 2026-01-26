/**
 * DiagnosticRadarBlock - Diagnóstico fisiológico OUTLIER (Radar Limpo)
 * 
 * ARQUITETURA VISUAL:
 * - Radar único com 6 valências fisiológicas (o "motor" do atleta)
 * - Texto interpretativo como camada explicativa principal
 * - Barras de estação detalhadas no expandível
 * 
 * REGRA DE PRODUTO:
 * - Radar = capacidade fisiológica
 * - Estação = consequência (nunca no mesmo plano geométrico)
 * 
 * UX RULE: Usuário entende em <3s:
 * - "O que eu sou fisicamente" (radar)
 * - "Onde isso impacta" (texto + barras)
 */

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { Activity, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { type CalculatedScore } from '@/utils/hyroxPercentileCalculator';
import { DiagnosticStationsBars } from './DiagnosticStationsBar';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
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
  stationImpact: readonly string[];
}

// ============================================
// CONSTANTS - 6 Valências Fisiológicas + Mapeamento de Impacto
// ============================================

const PHYSIOLOGICAL_DIMENSIONS = [{
  name: 'Resistência Cardiovascular',
  shortName: 'Cardio',
  metrics: ['run_avg'],
  stationImpact: ['Corrida', 'SkiErg'] as const
}, {
  name: 'Força & Resistência Muscular',
  shortName: 'Força',
  metrics: ['sled_push', 'sled_pull', 'farmers'],
  stationImpact: ['Sled Push', 'Sled Pull', 'Farmers'] as const
}, {
  name: 'Potência & Vigor',
  shortName: 'Potência',
  metrics: ['ski', 'row'],
  stationImpact: ['SkiErg', 'Remo'] as const
}, {
  name: 'Capacidade Anaeróbica',
  shortName: 'Anaeróbica',
  metrics: ['bbj', 'wallballs'],
  stationImpact: ['Burpee BJ', 'Wall Balls'] as const
}, {
  name: 'Core & Estabilidade',
  shortName: 'Core',
  metrics: ['sandbag'],
  stationImpact: ['Sandbag Lunges', 'Wall Balls'] as const
}, {
  name: 'Coordenação sob Fadiga',
  shortName: 'Eficiência',
  metrics: ['run_avg', 'ski', 'sled_push', 'sled_pull', 'bbj', 'row', 'farmers', 'sandbag', 'wallballs'],
  stationImpact: ['Todas as estações'] as const
}] as const;

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
    const values = metrics.map(m => scoreMap.get(m)).filter((v): v is number => v !== undefined && v !== null);
    return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 50;
  };
  return PHYSIOLOGICAL_DIMENSIONS.map(dim => ({
    name: dim.name,
    shortName: dim.shortName,
    value: avgMetrics(dim.metrics),
    fullMark: 100 as const,
    stationImpact: dim.stationImpact
  }));
}

// ============================================
// INTERPRETIVE TEXT GENERATION (FOCUS ON STATION IMPACT)
// ============================================

interface InterpretationResult {
  headline: string;
  insight: string;
}
function generateInterpretation(physiologicalData: PhysiologicalDimension[]): InterpretationResult {
  if (physiologicalData.length === 0) {
    return {
      headline: 'Leitura rápida',
      insight: 'Complete uma prova ou simulado para obter sua análise personalizada.'
    };
  }

  // Find weakest/strongest physiological areas
  const sorted = [...physiologicalData].sort((a, b) => a.value - b.value);
  const weakestPhysio = sorted[0];
  const strongestPhysio = sorted[sorted.length - 1];

  // Calculate average
  const avgPhysiological = Math.round(physiologicalData.reduce((sum, d) => sum + d.value, 0) / physiologicalData.length);

  // Get station impact for weakest dimension
  const impactedStations = weakestPhysio.stationImpact.slice(0, 2).join(' e ');

  // Generate dynamic insight based on data - ALWAYS mention station impact
  if (weakestPhysio.value < 35) {
    return {
      headline: 'Leitura rápida',
      insight: `Seu principal limitador fisiológico atual é ${weakestPhysio.name} (percentil ${weakestPhysio.value}), o que impacta diretamente estações como ${impactedStations}.`
    };
  } else if (weakestPhysio.value < 50) {
    return {
      headline: 'Leitura rápida',
      insight: `${weakestPhysio.name} é sua maior oportunidade de evolução (percentil ${weakestPhysio.value}). Ganhos nessa valência refletirão em ${impactedStations}.`
    };
  } else if (strongestPhysio.value > 75 && weakestPhysio.value > 55) {
    const strongImpact = strongestPhysio.stationImpact.slice(0, 2).join(' e ');
    return {
      headline: 'Leitura rápida',
      insight: `Perfil equilibrado com ${strongestPhysio.name} como ponto forte (percentil ${strongestPhysio.value}). Isso se traduz em vantagem competitiva em ${strongImpact}.`
    };
  } else if (avgPhysiological < 45) {
    return {
      headline: 'Leitura rápida',
      insight: `Perfil em desenvolvimento. Foco em ${weakestPhysio.name} trará ganhos rápidos em ${impactedStations} e elevará seu desempenho geral.`
    };
  } else {
    return {
      headline: 'Leitura rápida',
      insight: `Seu perfil mostra ${strongestPhysio.name} como destaque e oportunidade de evolução em ${weakestPhysio.name}, que impacta ${impactedStations}.`
    };
  }
}

// ============================================
// PHYSIOLOGICAL ESTIMATES
// ============================================

function estimateVO2Max(scores: CalculatedScore[]): {
  value: number;
  isEstimated: boolean;
} {
  const runScore = scores.find(s => s.metric === 'run_avg');
  if (!runScore) return {
    value: 0,
    isEstimated: true
  };
  const percentile = runScore.percentile_value;
  const vo2 = Math.round(35 + percentile / 100 * 30);
  return {
    value: vo2,
    isEstimated: true
  };
}
function estimateLactateThreshold(scores: CalculatedScore[]): {
  pace: string;
  percentage: number;
  isEstimated: boolean;
} {
  const runScore = scores.find(s => s.metric === 'run_avg');
  if (!runScore) return {
    pace: '--:--',
    percentage: 0,
    isEstimated: true
  };
  const rawTimeSec = runScore.raw_time_sec;
  const paceMin = Math.floor(rawTimeSec / 60);
  const paceSec = rawTimeSec % 60;
  const paceFormatted = `${paceMin}:${paceSec.toString().padStart(2, '0')}`;
  const ltPercentage = Math.round(75 + runScore.percentile_value / 100 * 15);
  return {
    pace: paceFormatted,
    percentage: ltPercentage,
    isEstimated: true
  };
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

  // Agregar scores em 6 valências fisiológicas
  const radarData = useMemo(() => aggregateToPhysiologicalDimensions(scores), [scores]);

  // Parâmetros fisiológicos mensuráveis
  const vo2Max = useMemo(() => estimateVO2Max(scores), [scores]);
  const lactateThreshold = useMemo(() => estimateLactateThreshold(scores), [scores]);

  // Texto interpretativo automático (com foco em impacto nas estações)
  const interpretation = useMemo(() => generateInterpretation(radarData), [radarData]);

  // Estado carregando
  if (loading) {
    return <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="card-elevated p-6 border-l-4 border-l-muted-foreground/30">
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          PERFIL FISIOLÓGICO
        </h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground/60 text-sm">Carregando diagnóstico...</p>
        </div>
      </motion.div>;
  }

  // Estado vazio
  if (!hasData || radarData.length === 0) {
    return <motion.div initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} className="card-elevated p-6 border-l-4 border-l-muted-foreground/30">
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          PERFIL FISIOLÓGICO
        </h3>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Activity className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm text-center max-w-xs">
            Lance seu primeiro simulado ou prova oficial para ver seu perfil fisiológico completo.
          </p>
        </div>
      </motion.div>;
  }
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} className="card-elevated p-6 border-l-4 border-l-primary">
      <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-2">PERFIL DO ATLETA</h3>

      {/* ============================================
          RADAR ÚNICO CIRCULAR - SOMENTE PERFIL FISIOLÓGICO
          ============================================ */}
      <div className="h-80 sm:h-96 md:h-[28rem] relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            {/* Grid circular com linhas mais visíveis */}
            <PolarGrid stroke="hsl(var(--foreground))" strokeOpacity={0.15} gridType="circle" radialLines={true} />
            
            {/* Labels das valências - tipografia legível */}
            <PolarAngleAxis dataKey="shortName" tick={{
            fill: 'hsl(var(--foreground))',
            fontSize: 12,
            fontWeight: 600
          }} tickLine={false} />
            
            {/* Área preenchida - cor OUTLIER laranja, dominante */}
            <Radar name="Perfil Fisiológico" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} fill="hsl(var(--primary))" fillOpacity={0.65} dot={false} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Texto explicativo obrigatório */}
      <p className="text-sm text-muted-foreground text-center mt-2">
        Perfil fisiológico baseado na sua última prova registrada.
      </p>

      {/* ============================================
          LEITURA INTERPRETATIVA AUTOMÁTICA
          (Camada explicativa principal para estações)
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

      {/* Toggle para barras de estação (detalhes extras) */}
      <div className="mt-5 pt-4 border-t border-border/50">
        <Button variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-foreground" onClick={() => setShowDetails(!showDetails)}>
          {showDetails ? <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Ocultar análise por estação
            </> : <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Ver análise detalhada por estação
            </>}
        </Button>
      </div>

      {/* Barras de estação (opcional, para análise detalhada) */}
      <AnimatePresence>
        {showDetails && <motion.div initial={{
        opacity: 0,
        height: 0
      }} animate={{
        opacity: 1,
        height: 'auto'
      }} exit={{
        opacity: 0,
        height: 0
      }} transition={{
        duration: 0.3
      }} className="mt-4 overflow-hidden">
            <DiagnosticStationsBars scores={scores} />
          </motion.div>}
      </AnimatePresence>
    </motion.div>;
}