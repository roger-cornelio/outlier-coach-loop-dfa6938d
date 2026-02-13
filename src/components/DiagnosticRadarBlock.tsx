/**
 * DiagnosticRadarBlock - Perfil de Performance do Atleta OUTLIER
 * 
 * HIERARQUIA VISUAL (Dashboard Executivo):
 * - Scan rápido em 5 segundos
 * - Profundidade sob demanda (collapsibles)
 * - Visual premium, não relatório
 * 
 * Conectado a dados reais via props (scores) e hooks (useAuth, useAthleteStatus)
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { Activity, ChevronDown, ChevronUp, Info, Target, Crown, TrendingUp, Flame, ChevronRight } from 'lucide-react';
import { type CalculatedScore } from '@/utils/hyroxPercentileCalculator';
import { DiagnosticStationsBars } from './DiagnosticStationsBar';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { useAuth } from '@/hooks/useAuth';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useOutlierStore } from '@/store/outlierStore';
import { useJourneyProgress } from '@/hooks/useJourneyProgress';

// ============================================
// MAPAS DE MÉTRICAS → LABELS E ANÁLISE
// ============================================

const METRIC_LABELS: Record<string, string> = {
  run_avg: 'Corrida',
  roxzone: 'Roxzone',
  ski: 'Ski Erg',
  sled_push: 'Sled Push',
  sled_pull: 'Sled Pull',
  bbj: 'Burpee Broad Jump',
  row: 'Remo',
  farmers: 'Farmer\'s Carry',
  sandbag: 'Sandbag Lunges',
  wallballs: 'Wall Balls',
};

const STATUS_LABELS: Record<string, string> = {
  iniciante: 'INICIANTE',
  intermediario: 'INTERMEDIÁRIO',
  avancado: 'AVANÇADO',
  hyrox_open: 'HYROX OPEN',
  hyrox_pro: 'HYROX PRO',
  elite: 'ELITE',
};

const STATUS_SUMMARY: Record<string, string> = {
  iniciante: 'Você está construindo as bases para competir. Continue evoluindo.',
  intermediario: 'Você compete em um nível consistente dentro da sua categoria.',
  avancado: 'Seu nível de performance te coloca entre os atletas mais preparados.',
  hyrox_open: 'Você compete no nível OPEN com resultados validados em prova.',
  hyrox_pro: 'Você compete no nível PRO com resultados validados em prova.',
  elite: 'Você está entre os atletas de elite da modalidade.',
};

// Radar axes mapping from scores
const RADAR_AXES = [
  { key: 'run_avg', name: 'Resistência Cardiovascular', shortName: 'Cardio' },
  { key: 'sled_push', name: 'Força & Resistência Muscular', shortName: 'Força' },
  { key: 'ski', name: 'Potência & Vigor', shortName: 'Potência' },
  { key: 'row', name: 'Capacidade Anaeróbica', shortName: 'Anaeróbica' },
  { key: 'roxzone', name: 'Core & Estabilidade', shortName: 'Core' },
  { key: 'wallballs', name: 'Coordenação sob Fadiga', shortName: 'Eficiência' },
];

// ============================================
// COMPONENT PROPS
// ============================================

interface DiagnosticRadarBlockProps {
  scores: CalculatedScore[];
  loading?: boolean;
  hasData: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function DiagnosticRadarBlock({
  scores,
  loading = false,
  hasData: hasDataProp
}: DiagnosticRadarBlockProps) {
  // Real data from hooks
  const { profile } = useAuth();
  const { status, outlierScore } = useAthleteStatus();
  const { athleteConfig } = useOutlierStore();
  const journeyData = useJourneyProgress();
  
  // Use real hasData prop
  const hasData = hasDataProp && scores.length > 0;
  
  // Collapsible states
  const [isLimiterExpanded, setIsLimiterExpanded] = useState(false);
  const [isImpactExpanded, setIsImpactExpanded] = useState(false);
  const [isProjectionExpanded, setIsProjectionExpanded] = useState(false);
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [showStationDetails, setShowStationDetails] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

  // ============================================
  // DERIVED DATA FROM REAL SCORES
  // ============================================
  
  // Athlete identity from real data
  const athleteName = profile?.name?.toUpperCase() || 'ATLETA';
  const athleteCategory = useMemo(() => {
    const gender = athleteConfig?.sexo === 'feminino' ? 'WOMEN' : 'MEN';
    const level = status === 'hyrox_pro' ? 'PRO' : 'OPEN';
    return `HYROX ${level} ${gender}`;
  }, [athleteConfig?.sexo, status]);
  
  // Status info from real data
  const statusLabel = STATUS_LABELS[status] || 'INTERMEDIÁRIO';
  const statusSummary = STATUS_SUMMARY[status] || STATUS_SUMMARY.intermediario;
  
  // Find the main limiter (lowest percentile station)
  const mainLimiter = useMemo(() => {
    if (!scores.length) return null;
    
    const sorted = [...scores].sort((a, b) => a.percentile_value - b.percentile_value);
    const weakest = sorted[0];
    
    return {
      metric: weakest.metric,
      name: METRIC_LABELS[weakest.metric] || weakest.metric,
      percentile: weakest.percentile_value,
      relativePerformance: 100 - weakest.percentile_value, // % of athletes you're below
    };
  }, [scores]);
  
  // Affected stations (stations with percentile < 50)
  const affectedStations = useMemo(() => {
    return scores
      .filter(s => s.percentile_value < 50)
      .sort((a, b) => a.percentile_value - b.percentile_value)
      .slice(0, 5)
      .map(s => ({
        name: METRIC_LABELS[s.metric] || s.metric,
        percentile: s.percentile_value,
        impactLevel: s.percentile_value < 25 ? 'Alto' : 'Moderado',
      }));
  }, [scores]);
  
  const topStations = affectedStations.slice(0, 2);
  const hasMoreStations = affectedStations.length > 2;
  
  // Radar data from real scores
  const radarData = useMemo(() => {
    return RADAR_AXES.map(axis => {
      const score = scores.find(s => s.metric === axis.key);
      return {
        name: axis.name,
        shortName: axis.shortName,
        value: score?.percentile_value || 50,
        fullMark: 100,
      };
    });
  }, [scores]);
  
  // VO2max and lactate estimation from run performance
  const vo2maxEstimate = useMemo(() => {
    const runScore = scores.find(s => s.metric === 'run_avg');
    if (!runScore) return null;
    // Rough estimate: percentile 50 = 45 ml/kg/min, +/- 0.3 per percentile point
    const base = 45;
    const delta = (runScore.percentile_value - 50) * 0.3;
    return Math.round(base + delta);
  }, [scores]);
  
  const lactateThresholdEstimate = useMemo(() => {
    const runScore = scores.find(s => s.metric === 'run_avg');
    if (!runScore) return null;
    // Rough estimate: percentile 50 = 5:30/km, improving with higher percentile
    const baseSeconds = 330; // 5:30
    const delta = (runScore.percentile_value - 50) * 2; // ~2 sec per percentile
    const totalSeconds = Math.max(baseSeconds - delta, 180); // min 3:00
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.round(totalSeconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [scores]);
  
  // Training focus based on limiter
  const trainingFocus = useMemo(() => {
    if (!mainLimiter) return 'Foco em desenvolver todas as capacidades de forma equilibrada.';
    return `O foco do próximo ciclo será ${mainLimiter.name.toLowerCase()}, visando maior consistência nas estações onde hoje ocorre a maior perda de rendimento.`;
  }, [mainLimiter]);

  // Estado carregando
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated p-6 border-l-4 border-l-muted-foreground/30"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          PERFIL DE PERFORMANCE
        </h3>
        <div className="h-64 flex items-center justify-center">
          <p className="text-muted-foreground/60 text-sm">Carregando diagnóstico...</p>
        </div>
      </motion.div>
    );
  }

  // Estado vazio
  if (!hasData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated p-6 border-l-4 border-l-muted-foreground/30"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          PERFIL DE PERFORMANCE
        </h3>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Activity className="w-12 h-12 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm text-center max-w-xs">
            Lance seu primeiro simulado ou prova oficial para ver seu perfil de performance completo.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      
      {/* ============================================
          BLOCO 1: HEADER — IDENTIDADE
          Sempre visível, compacto
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-3"
      >
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-wide text-foreground uppercase mb-1">
          {athleteName}
        </h1>
        <div className="flex items-center justify-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-amber-400 tracking-wider">
            {athleteCategory}
          </span>
        </div>
      </motion.div>

      {/* ============================================
          BLOCO 2: STATUS COMPETITIVO ATUAL
          Sempre visível, NÃO expansível
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border-l-4 border-l-primary rounded-lg px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
              Status competitivo
            </p>
            <h2 className="font-display text-lg sm:text-xl font-bold text-primary">
              {statusLabel}
            </h2>
          </div>
        </div>
        <p className="text-xs text-foreground/70 mt-1 line-clamp-1">
          {statusSummary}
        </p>
      </motion.div>

      {/* ============================================
          BLOCO 2.5: JORNADA OUTLIER
          Progresso rumo ao próximo nível
          Sempre visível, não colapsável
          ============================================ */}
      {(() => {
        const journey = journeyData;
        if (journey.loading || journey.allLevels.length === 0) return null;

        const { targetLevel, currentLevelLabel, targetLevelLabel, progressToTarget, isAtTop, isCapped } = journey;
        const missingBenchmarks = Math.max(0, targetLevel.benchmarksRequired - targetLevel.benchmarksCompleted);
        const missingSessions = Math.max(0, targetLevel.trainingRequired - targetLevel.trainingSessions);

        // 2 worst metrics from scores
        const worstMetrics = [...scores]
          .sort((a, b) => a.percentile_value - b.percentile_value)
          .slice(0, 2);

        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.075 }}
            className="card-elevated rounded-2xl overflow-hidden"
          >
            <div className="px-4 py-3">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-orange-500" fill="currentColor" />
                  <span className="text-[10px] font-bold tracking-wider uppercase text-orange-500">
                    Jornada Outlier
                  </span>
                </div>
                <span className="text-[10px] font-bold font-display uppercase tracking-wide text-foreground/70">
                  {currentLevelLabel} → {targetLevelLabel}
                </span>
              </div>

              {/* ELITE state */}
              {isAtTop ? (
                <div className="text-center py-4">
                  <Crown className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">Você está no topo</p>
                  <p className="text-xs text-muted-foreground mt-1">Modo manutenção — mantenha sua consistência.</p>
                </div>
              ) : (
                <>
                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">Progresso</span>
                      <span className="text-sm font-bold text-foreground">{progressToTarget}%</span>
                    </div>
                    <div className="relative h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressToTarget}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                      />
                      {isCapped && (
                        <div 
                          className="absolute top-0 h-full w-px bg-destructive"
                          style={{ left: `${journey.capPercent}%` }}
                        />
                      )}
                    </div>
                    {isCapped && (
                      <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Travado em {journey.capPercent}% sem prova oficial
                      </p>
                    )}
                  </div>

                  {/* Mini barras de Benchmarks e Treinos */}
                  <div className="space-y-2 mb-3">
                    {/* Benchmarks */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-muted-foreground">Benchmarks</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {targetLevel.benchmarksCompleted}/{targetLevel.benchmarksRequired}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${targetLevel.benchmarksRequired > 0 ? Math.min(100, (targetLevel.benchmarksCompleted / targetLevel.benchmarksRequired) * 100) : 100}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.5 }}
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
                        />
                      </div>
                    </div>
                    {/* Treinos */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-muted-foreground">Treinos</span>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {targetLevel.trainingSessions}/{targetLevel.trainingRequired}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${targetLevel.trainingRequired > 0 ? Math.min(100, (targetLevel.trainingSessions / targetLevel.trainingRequired) * 100) : 100}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.7 }}
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Último Marco */}
                  <div className="bg-background/50 rounded-lg px-3 py-2 mb-3 border border-border/20">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">📌 Último Marco Atingido</p>
                    <p className="text-xs font-medium text-foreground">
                      Nível atual: <span className="font-bold text-primary">{currentLevelLabel}</span>
                    </p>
                  </div>

                  {/* Requisitos faltantes */}
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                      🎯 Para chegar em {targetLevelLabel} faltam:
                    </p>
                    <ul className="space-y-1.5">
                      {worstMetrics.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-foreground/80">
                          <ChevronRight className="w-3 h-3 text-orange-500 mt-0.5 shrink-0" />
                          <span>Melhorar <span className="font-semibold">{METRIC_LABELS[m.metric] || m.metric}</span> (percentil {m.percentile_value})</span>
                        </li>
                      ))}
                      {missingBenchmarks > 0 && (
                        <li className="flex items-start gap-2 text-xs text-foreground/80">
                          <ChevronRight className="w-3 h-3 text-orange-500 mt-0.5 shrink-0" />
                          <span>Completar mais {missingBenchmarks} benchmark{missingBenchmarks > 1 ? 's' : ''} (tem {targetLevel.benchmarksCompleted})</span>
                        </li>
                      )}
                      {missingSessions > 0 && (
                        <li className="flex items-start gap-2 text-xs text-foreground/80">
                          <ChevronRight className="w-3 h-3 text-orange-500 mt-0.5 shrink-0" />
                          <span>Completar mais {missingSessions} sessões de treino</span>
                        </li>
                      )}
                      {targetLevel.officialRaceRequired && !targetLevel.hasOfficialRace && (
                        <li className="flex items-start gap-2 text-xs text-foreground/80">
                          <ChevronRight className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                          <span className="font-semibold text-destructive">Completar uma prova oficial HYROX</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        );
      })()}

      {/* ============================================
          BLOCO 6: PERFIL FISIOLÓGICO COMPETITIVO
          Radar colapsado por padrão (como já estava)
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-elevated border-l-4 border-l-muted-foreground/20 overflow-hidden"
      >
        <Collapsible open={isRadarOpen} onOpenChange={setIsRadarOpen}>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xs text-muted-foreground tracking-wide">
                  PERFIL FISIOLÓGICO
                </h3>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                  Baseado na última prova registrada
                </p>
              </div>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                >
                  {isRadarOpen ? (
                    <>
                      Ocultar
                      <ChevronUp className="w-3 h-3 ml-1" />
                    </>
                  ) : (
                    <>
                      Ver perfil
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          
          <CollapsibleContent>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="px-4 pb-4"
            >
              <p className="text-xs text-muted-foreground mb-3 text-center">
                Este gráfico mostra como seus sistemas fisiológicos contribuem para o diagnóstico acima.
              </p>
              
              {/* Radar Chart */}
              <div className="h-48 sm:h-56 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                    <PolarGrid 
                      stroke="hsl(var(--foreground))" 
                      strokeOpacity={0.12} 
                      gridType="circle" 
                      radialLines={true} 
                    />
                    <PolarAngleAxis 
                      dataKey="shortName" 
                      tick={{
                        fill: 'hsl(var(--foreground))',
                        fontSize: 10,
                        fontWeight: 500
                      }} 
                      tickLine={false} 
                    />
                    <Radar 
                      name="Perfil Fisiológico" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2} 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.4} 
                      dot={false} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Toggle para barras de estação */}
              <div className="mt-3 pt-3 border-t border-border/30">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground h-7"
                  onClick={() => setShowStationDetails(!showStationDetails)}
                >
                  {showStationDetails ? (
                    <>
                      <ChevronUp className="w-3 h-3 mr-1" />
                      Ocultar estações
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3 mr-1" />
                      Análise por estação
                    </>
                  )}
                </Button>
              </div>

              <AnimatePresence>
                {showStationDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-3 overflow-hidden"
                  >
                    <DiagnosticStationsBars scores={scores} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>

      {/* ============================================
          BLOCO ANÁLISE ÚLTIMA PROVA
          Concentra Limitador + Projeção + Impacto
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card-elevated overflow-hidden"
      >
        <Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Análise última prova</span>
              </div>
              {isAnalysisOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-2 pb-3 space-y-3"
            >
              {/* LIMITADOR */}
              <div className="card-elevated border-l-4 border-l-destructive bg-destructive/5 overflow-hidden">
                <Collapsible open={isLimiterExpanded} onOpenChange={setIsLimiterExpanded}>
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
                          {mainLimiter?.name || 'Análise não disponível'}
                        </h3>
                        <p className="text-xs text-foreground/70 mt-0.5 line-clamp-1">
                          {mainLimiter ? `Limitador direto identificado com base nos seus resultados.` : 'Registre uma prova para ver seu limitador.'}
                        </p>
                      </div>
                      <CollapsibleTrigger asChild>
                        <button className="text-xs text-destructive hover:text-destructive/80 font-medium flex items-center gap-1 shrink-0 transition-colors">
                          {isLimiterExpanded ? (
                            <>
                              Ocultar
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              Ver análise
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  
                  <CollapsibleContent>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="px-4 pb-4 pt-1 border-t border-destructive/10"
                    >
                      <div className="space-y-3 text-sm text-foreground/90 leading-relaxed">
                        <p>
                          {mainLimiter?.name} foi identificado como o principal fator limitante da sua performance atual, onde a exigência de sustentação de força sob fadiga é determinante.
                        </p>
                        <p>
                          Nessa variável específica, você performou abaixo de <span className="font-semibold text-destructive">{mainLimiter?.relativePerformance || 0}%</span> dos atletas da sua categoria, o que compromete drasticamente seus resultados devido à perda de estabilidade e eficiência mecânica sob fadiga.
                        </p>
                        <p className="text-muted-foreground text-xs italic border-l-2 border-muted-foreground/30 pl-3">
                          Este diagnóstico se refere exclusivamente a esta variável e não representa seu desempenho global como atleta.
                        </p>
                      </div>
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* PROJEÇÃO */}
              <div className="card-elevated border-l-4 border-l-emerald-500 bg-emerald-500/5 overflow-hidden">
                <Collapsible open={isProjectionExpanded} onOpenChange={setIsProjectionExpanded}>
                  <div className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                          <p className="text-xs font-semibold text-foreground">
                            Projeção
                          </p>
                        </div>
                        <p className="text-xs text-foreground/80 leading-relaxed">
                          Correção deste limitador desloca sua performance para a zona competitiva superior.
                        </p>
                      </div>
                      <CollapsibleTrigger asChild>
                        <button className="text-xs text-emerald-500 hover:text-emerald-400 font-medium flex items-center gap-1 shrink-0 transition-colors">
                          {isProjectionExpanded ? (
                            <>
                              Menos
                              <ChevronUp className="w-3 h-3" />
                            </>
                          ) : (
                            <>
                              Entender
                              <ChevronDown className="w-3 h-3" />
                            </>
                          )}
                        </button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                  
                  <CollapsibleContent>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="px-4 pb-3 pt-1 border-t border-emerald-500/10"
                    >
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        Ao corrigir este limitador, sua performance tende a se deslocar para a <span className="font-semibold text-emerald-500">zona competitiva superior</span> da categoria {athleteCategory}, especialmente nas estações onde hoje ocorre a maior perda de rendimento.
                      </p>
                      <p className="text-muted-foreground text-xs italic mt-2">
                        A projeção considera correção consistente deste fator específico.
                      </p>
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {/* IMPACTO NA PROVA */}
              <div className="card-elevated border-l-4 border-l-amber-500 overflow-hidden">
                <Collapsible open={isImpactExpanded} onOpenChange={setIsImpactExpanded}>
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-amber-500" />
                        <p className="text-xs font-semibold text-foreground">
                          Impacto na prova
                        </p>
                      </div>
                      {hasMoreStations && (
                        <CollapsibleTrigger asChild>
                          <button className="text-xs text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1 transition-colors">
                            {isImpactExpanded ? (
                              <>
                                Menos
                                <ChevronUp className="w-3 h-3" />
                              </>
                            ) : (
                              <>
                                Ver todas
                                <ChevronDown className="w-3 h-3" />
                              </>
                            )}
                          </button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                    
                    {/* Top 2 stations always visible */}
                    <div className="flex flex-wrap gap-2">
                      {topStations.map((station, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-background/50 border border-border/20"
                        >
                          <span className="text-xs font-medium text-foreground">
                            {station.name}
                          </span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                            station.impactLevel === 'Alto' 
                              ? 'bg-destructive/15 text-destructive' 
                              : 'bg-amber-500/15 text-amber-500'
                          }`}>
                            {station.impactLevel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <CollapsibleContent>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="px-4 pb-3 pt-1"
                    >
                      {/* Remaining stations */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {affectedStations.slice(2).map((station, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-background/50 border border-border/20"
                          >
                            <span className="text-xs font-medium text-foreground">
                              {station.name}
                            </span>
                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              station.impactLevel === 'Alto' 
                                ? 'bg-destructive/15 text-destructive' 
                                : 'bg-amber-500/15 text-amber-500'
                            }`}>
                              {station.impactLevel}
                            </span>
                          </div>
                        ))}
                      </div>
                      
                      {/* Explanation text - only when expanded */}
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Sob fadiga acumulada, essas estações tendem a sofrer queda acelerada de eficiência devido à instabilidade central.
                      </p>
                    </motion.div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>


      {/* ============================================
          BLOCO 7: INDICADORES FISIOLÓGICOS DE SUPORTE
          Cards individuais com hierarquia visual clara
          Visual secundário (suporte técnico)
          ============================================ */}
      <TooltipProvider>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          {/* Cards Container - Centralized */}
          <div className="grid grid-cols-2 gap-3">
            {/* VO₂ Max Card */}
            <div className="bg-card/60 border border-border/30 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  VO₂ máx (estimado)
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground/50 cursor-help hover:text-muted-foreground/70 transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">Capacidade máxima de consumo de oxigênio.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-xl font-semibold text-foreground/85">
                  {vo2maxEstimate || '—'}
                </span>
                <span className="text-xs text-muted-foreground/60 font-medium">
                  ml/kg/min
                </span>
              </div>
            </div>

            {/* Limiar de Lactato Card */}
            <div className="bg-card/60 border border-border/30 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Limiar de lactato
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3 h-3 text-muted-foreground/50 cursor-help hover:text-muted-foreground/70 transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">Ritmo máximo sustentável sem acúmulo de lactato.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-xl font-semibold text-foreground/85">
                  {lactateThresholdEstimate || '—'}
                </span>
                <span className="text-xs text-muted-foreground/60 font-medium">
                  /km
                </span>
              </div>
            </div>
          </div>

          {/* Explanatory Note - Below cards, lower visual weight */}
          <p className="text-[11px] text-muted-foreground/50 text-center leading-relaxed px-2">
            Esses indicadores sustentam seu desempenho aeróbico, mas não são o principal fator limitante no cenário atual.
          </p>
        </motion.div>
      </TooltipProvider>

      {/* ============================================
          BLOCO 8: DIRECIONAMENTO DO TREINO
          Sempre visível (fecha a narrativa)
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-primary/5 border-l-4 border-l-primary rounded-lg px-4 py-3"
      >
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
          Direcionamento
        </p>
        <p className="text-xs text-foreground/90 leading-relaxed">
          {trainingFocus}
        </p>
      </motion.div>

      {/* ============================================
          BLOCO 9: CTA FINAL — BORA TREINAR 🔥
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="pt-1"
      >
        <Button
          size="lg"
          className="w-full font-display text-lg tracking-wider px-6 py-5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg"
        >
          <Flame className="w-5 h-5" />
          BORA TREINAR
          <ChevronRight className="w-5 h-5" />
        </Button>
        
        <p className="text-muted-foreground/60 text-xs text-center mt-2">
          Treinar certo muda o jogo.
        </p>
      </motion.div>
    </div>
  );
}
