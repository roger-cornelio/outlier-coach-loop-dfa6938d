/**
 * DiagnosticRadarBlock - Perfil de Performance do Atleta OUTLIER
 * 
 * HIERARQUIA VISUAL (Dashboard Executivo):
 * - Scan rápido em 5 segundos
 * - Profundidade sob demanda (collapsibles)
 * - Visual premium, não relatório
 * 
 * ⚠️ Layout-only: usa dados mockados, sem lógica real
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';
import { Activity, ChevronDown, ChevronUp, Info, Target, Crown, TrendingUp, Flame, ChevronRight } from 'lucide-react';
import { type CalculatedScore } from '@/utils/hyroxPercentileCalculator';
import { DiagnosticStationsBars } from './DiagnosticStationsBar';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';

// ============================================
// MOCK DATA — Layout only, sem lógica real
// ============================================

const MOCK_ATHLETE = {
  name: 'LUCAS MOREIRA',
  category: 'HYROX PRO MEN',
};

const MOCK_DIAGNOSTIC = {
  status: {
    label: 'INTERMEDIÁRIO',
    // Valorization text - no mention of failures or limitations
    summary: 'Você compete em um nível consistente dentro da sua categoria.',
  },
  mainLimiter: {
    name: 'Core & Estabilidade',
    relativePerformance: 68,
    shortImpact: 'Limitador direto nas Roxzones sob fadiga.',
    fullAnalysis: [
      'Este fator foi um limitador direto da sua performance nas Roxzones, onde a exigência de sustentação de força sob fadiga é determinante.',
      'Nessa variável específica, você performou abaixo de {relativePerformance}% dos atletas da sua categoria, o que compromete drasticamente seus resultados devido à perda de estabilidade e eficiência mecânica sob fadiga.',
      'Este diagnóstico se refere exclusivamente a esta variável e não representa seu desempenho global como atleta.',
    ],
  },
  affectedStations: [
    { name: 'Sled Push', impactLevel: 'Alto' },
    { name: 'Sandbag Lunges', impactLevel: 'Alto' },
    { name: 'Wall Balls', impactLevel: 'Moderado' },
  ],
  impactExplanation: 'Sob fadiga acumulada, essas estações tendem a sofrer queda acelerada de eficiência devido à instabilidade central.',
  projection: {
    keyPhrase: 'Correção deste limitador desloca sua performance para a zona competitiva superior.',
    fullText: 'Ao corrigir este limitador, sua performance tende a se deslocar para a zona competitiva superior da categoria {category}, especialmente nas Roxzones finais, onde hoje ocorre a maior perda de rendimento. A projeção considera correção consistente deste fator específico.',
  },
  vo2max: 48,
  lactateThreshold: '5:14',
  trainingFocus: 'O foco do próximo ciclo será estabilidade central sob fadiga, visando maior consistência nas estações finais da prova.',
};

const MOCK_RADAR_DATA = [
  { name: 'Resistência Cardiovascular', shortName: 'Cardio', value: 72, fullMark: 100 },
  { name: 'Força & Resistência Muscular', shortName: 'Força', value: 65, fullMark: 100 },
  { name: 'Potência & Vigor', shortName: 'Potência', value: 58, fullMark: 100 },
  { name: 'Capacidade Anaeróbica', shortName: 'Anaeróbica', value: 61, fullMark: 100 },
  { name: 'Core & Estabilidade', shortName: 'Core', value: 32, fullMark: 100 },
  { name: 'Coordenação sob Fadiga', shortName: 'Eficiência', value: 55, fullMark: 100 },
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
  // TEMP: Force hasData to true to preview full layout with mock data
  // TODO: Remove this when connecting to real data
  const hasData = true; // hasDataProp;
  // Collapsible states
  const [isLimiterExpanded, setIsLimiterExpanded] = useState(false);
  const [isImpactExpanded, setIsImpactExpanded] = useState(false);
  const [isProjectionExpanded, setIsProjectionExpanded] = useState(false);
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [showStationDetails, setShowStationDetails] = useState(false);

  // Top 2 stations for compact view
  const topStations = MOCK_DIAGNOSTIC.affectedStations.slice(0, 2);
  const hasMoreStations = MOCK_DIAGNOSTIC.affectedStations.length > 2;

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
          {MOCK_ATHLETE.name}
        </h1>
        <div className="flex items-center justify-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-amber-400 tracking-wider">
            {MOCK_ATHLETE.category}
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
              {MOCK_DIAGNOSTIC.status.label}
            </h2>
          </div>
        </div>
        <p className="text-xs text-foreground/70 mt-1 line-clamp-1">
          {MOCK_DIAGNOSTIC.status.summary}
        </p>
      </motion.div>

      {/* ============================================
          BLOCO 3: PRINCIPAL LIMITADOR ATUAL
          Compacto por padrão, expandível
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-elevated border-l-4 border-l-destructive bg-destructive/5 overflow-hidden"
      >
        <Collapsible open={isLimiterExpanded} onOpenChange={setIsLimiterExpanded}>
          <div className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground">
                  {MOCK_DIAGNOSTIC.mainLimiter.name}
                </h3>
                <p className="text-xs text-foreground/70 mt-0.5 line-clamp-1">
                  {MOCK_DIAGNOSTIC.mainLimiter.shortImpact}
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
                  {MOCK_DIAGNOSTIC.mainLimiter.fullAnalysis[0]}
                </p>
                <p>
                  Nessa variável específica, você performou abaixo de <span className="font-semibold text-destructive">{MOCK_DIAGNOSTIC.mainLimiter.relativePerformance}%</span> dos atletas da sua categoria, o que compromete drasticamente seus resultados devido à perda de estabilidade e eficiência mecânica sob fadiga.
                </p>
                <p className="text-muted-foreground text-xs italic border-l-2 border-muted-foreground/30 pl-3">
                  {MOCK_DIAGNOSTIC.mainLimiter.fullAnalysis[2]}
                </p>
              </div>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>

      {/* ============================================
          BLOCO 4: PROJEÇÃO COMPETITIVA (SOLUÇÃO IMEDIATA)
          Movido para logo após o diagnóstico
          Transforma diagnóstico em direção/motivação
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card-elevated border-l-4 border-l-emerald-500 bg-emerald-500/5 overflow-hidden"
      >
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
                  {MOCK_DIAGNOSTIC.projection.keyPhrase}
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
                Ao corrigir este limitador, sua performance tende a se deslocar para a <span className="font-semibold text-emerald-500">zona competitiva superior</span> da categoria {MOCK_ATHLETE.category}, especialmente nas Roxzones finais, onde hoje ocorre a maior perda de rendimento.
              </p>
              <p className="text-muted-foreground text-xs italic mt-2">
                A projeção considera correção consistente deste fator específico.
              </p>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>

      {/* ============================================
          BLOCO 5: IMPACTO DIRETO NA PROVA
          Contexto prático após a projeção
          Reforça "o que muda se eu corrigir"
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-elevated border-l-4 border-l-amber-500 overflow-hidden"
      >
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
                {MOCK_DIAGNOSTIC.affectedStations.slice(2).map((station, index) => (
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
                {MOCK_DIAGNOSTIC.impactExplanation}
              </p>
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      </motion.div>

      {/* ============================================
          BLOCO 6: PERFIL FISIOLÓGICO COMPETITIVO
          Radar colapsado por padrão (como já estava)
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
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
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={MOCK_RADAR_DATA}>
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
                  {MOCK_DIAGNOSTIC.vo2max}
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
                  {MOCK_DIAGNOSTIC.lactateThreshold}
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
          {MOCK_DIAGNOSTIC.trainingFocus}
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
