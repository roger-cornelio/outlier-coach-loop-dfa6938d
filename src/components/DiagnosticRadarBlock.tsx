/**
 * DiagnosticRadarBlock - Perfil de Performance do Atleta OUTLIER
 * 
 * HIERARQUIA VISUAL (Layout Final):
 * 1. Header Identidade (nome + categoria + coroa)
 * 2. Status Competitivo Atual (macro - 3s)
 * 3. Principal Limitador (BLOCO PRINCIPAL)
 * 4. Impacto Direto na Prova (estações afetadas)
 * 5. Projeção Competitiva (condicional)
 * 6. Perfil Fisiológico (radar colapsável)
 * 7. Indicadores de Suporte (VO₂/Lactato)
 * 8. Direcionamento do Treino
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
    summary: 'Seu desempenho atual apresenta um limitador fisiológico claro que impacta sua consistência em prova.',
  },
  mainLimiter: {
    name: 'Core & Estabilidade',
    relativePerformance: 68,
  },
  affectedStations: [
    { name: 'Sled Push', impactLevel: 'Alto' },
    { name: 'Sandbag Lunges', impactLevel: 'Alto' },
    { name: 'Wall Balls', impactLevel: 'Moderado' },
  ],
  impactExplanation: 'Sob fadiga acumulada, essas estações tendem a sofrer queda acelerada de eficiência devido à instabilidade central.',
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
  hasData
}: DiagnosticRadarBlockProps) {
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [showStationDetails, setShowStationDetails] = useState(false);

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
    <div className="space-y-4">
      
      {/* ============================================
          BLOCO 1: HEADER — IDENTIDADE
          Nome + Categoria + Coroa
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-4"
      >
        <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-wide text-foreground uppercase mb-2">
          {MOCK_ATHLETE.name}
        </h1>
        <div className="flex items-center justify-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          <span className="text-sm font-semibold text-amber-400 tracking-wider">
            {MOCK_ATHLETE.category}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">
          Nível competitivo global
        </p>
      </motion.div>

      {/* ============================================
          BLOCO 2: STATUS COMPETITIVO ATUAL
          Macro - leitura em 3 segundos
          Alto contraste - define o tom da tela
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border-l-4 border-l-primary rounded-lg p-6"
      >
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
          Status competitivo atual
        </p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-primary mb-2">
          {MOCK_DIAGNOSTIC.status.label}
        </h2>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {MOCK_DIAGNOSTIC.status.summary}
        </p>
      </motion.div>

      {/* ============================================
          BLOCO 3: PRINCIPAL LIMITADOR ATUAL
          🚨 BLOCO PRINCIPAL DA TELA
          Visual dominante - maior destaque
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-elevated p-6 border-l-4 border-l-destructive bg-destructive/5"
      >
        <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-4">
          {MOCK_DIAGNOSTIC.mainLimiter.name}
        </h3>
        
        <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
          <p>
            Este fator foi um limitador direto da sua performance nas Roxzones, onde a exigência de sustentação de força sob fadiga é determinante.
          </p>
          <p>
            Nessa variável específica, você performou abaixo de <span className="font-semibold text-destructive">{MOCK_DIAGNOSTIC.mainLimiter.relativePerformance}%</span> dos atletas da sua categoria, o que compromete drasticamente seus resultados devido à perda de estabilidade e eficiência mecânica sob fadiga.
          </p>
          <p className="text-muted-foreground text-xs italic border-l-2 border-muted-foreground/30 pl-3">
            Este diagnóstico se refere exclusivamente a esta variável e não representa seu desempenho global como atleta.
          </p>
        </div>
      </motion.div>

      {/* ============================================
          BLOCO 4: IMPACTO DIRETO NA PROVA
          Lista escaneável de estações afetadas
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card-elevated p-5 border-l-4 border-l-amber-500"
      >
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-4 h-4 text-amber-500" />
          <p className="text-sm font-semibold text-foreground">
            Onde isso mais te custa performance
          </p>
        </div>
        
        {/* Lista de estações */}
        <div className="space-y-2 mb-4">
          {MOCK_DIAGNOSTIC.affectedStations.map((station, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-background/50 border border-border/20"
            >
              <span className="text-sm font-medium text-foreground">
                {station.name}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                station.impactLevel === 'Alto' 
                  ? 'bg-destructive/15 text-destructive' 
                  : 'bg-amber-500/15 text-amber-500'
              }`}>
                {station.impactLevel}
              </span>
            </div>
          ))}
        </div>
        
        <p className="text-sm text-muted-foreground leading-relaxed">
          {MOCK_DIAGNOSTIC.impactExplanation}
        </p>
      </motion.div>

      {/* ============================================
          BLOCO 5: PROJEÇÃO COMPETITIVA
          Condicional - fala em zona, não ranking
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-elevated p-5 border-l-4 border-l-emerald-500 bg-emerald-500/5"
      >
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-semibold text-foreground">
            Projeção de performance
          </p>
        </div>
        
        <div className="space-y-3 text-sm text-foreground/90 leading-relaxed">
          <p>
            Ao corrigir este limitador, sua performance tende a se deslocar para a <span className="font-semibold text-emerald-500">zona competitiva superior</span> da categoria {MOCK_ATHLETE.category}, especialmente nas Roxzones finais, onde hoje ocorre a maior perda de rendimento.
          </p>
          <p className="text-muted-foreground text-xs italic">
            A projeção considera correção consistente deste fator específico.
          </p>
        </div>
      </motion.div>

      {/* ============================================
          BLOCO 6: PERFIL FISIOLÓGICO COMPETITIVO
          Radar colapsado por padrão
          Visual premium - evidência, não protagonista
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="card-elevated p-6 border-l-4 border-l-muted-foreground/30"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-1">
          PERFIL FISIOLÓGICO COMPETITIVO
        </h3>
        <p className="text-xs text-muted-foreground/70 mb-4">
          Baseado na sua última prova registrada
        </p>

        <Collapsible open={isRadarOpen} onOpenChange={setIsRadarOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              {isRadarOpen ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Ocultar perfil fisiológico
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Ver perfil fisiológico completo
                </>
              )}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="mt-4"
            >
              <p className="text-xs text-muted-foreground mb-4 text-center">
                Este gráfico mostra como seus sistemas fisiológicos contribuem para o diagnóstico acima.
              </p>
              
              {/* Radar Chart */}
              <div className="h-56 sm:h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={MOCK_RADAR_DATA}>
                    <PolarGrid 
                      stroke="hsl(var(--foreground))" 
                      strokeOpacity={0.15} 
                      gridType="circle" 
                      radialLines={true} 
                    />
                    <PolarAngleAxis 
                      dataKey="shortName" 
                      tick={{
                        fill: 'hsl(var(--foreground))',
                        fontSize: 11,
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
                      fillOpacity={0.5} 
                      dot={false} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Toggle para barras de estação (detalhes extras) */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setShowStationDetails(!showStationDetails)}
                >
                  {showStationDetails ? (
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
                {showStationDetails && (
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
          </CollapsibleContent>
        </Collapsible>
      </motion.div>

      {/* ============================================
          BLOCO 7: INDICADORES FISIOLÓGICOS DE SUPORTE
          Visualmente secundário - referência técnica
          ============================================ */}
      <TooltipProvider>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-muted/10 border border-border/30 rounded-lg p-4"
        >
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
            Indicadores fisiológicos de suporte
          </p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* VO₂ Max */}
            <div className="flex flex-col items-center p-3 rounded-lg bg-background/50 border border-border/20">
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
                  {MOCK_DIAGNOSTIC.vo2max}
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
            <div className="flex flex-col items-center p-3 rounded-lg bg-background/50 border border-border/20">
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
                  {MOCK_DIAGNOSTIC.lactateThreshold}
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
          
          <p className="text-xs text-muted-foreground text-center">
            Esses indicadores sustentam seu desempenho aeróbico, mas não são o principal fator limitante no cenário atual.
          </p>
        </motion.div>
      </TooltipProvider>

      {/* ============================================
          BLOCO 8: DIRECIONAMENTO DO TREINO
          Fecha a narrativa: diagnóstico → impacto → direção
          ============================================ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="card-elevated p-5 border-l-4 border-l-primary bg-primary/5"
      >
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
          Direcionamento atual
        </p>
        <p className="text-sm text-foreground/90 leading-relaxed">
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
        className="text-center pt-2"
      >
        <Button
          size="lg"
          className="w-full font-display text-xl tracking-wider px-8 py-6 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg"
        >
          <Flame className="w-6 h-6" />
          BORA TREINAR
          <ChevronRight className="w-6 h-6" />
        </Button>
        
        <p className="text-muted-foreground text-sm mt-3">
          Treinar certo muda o jogo.
        </p>
      </motion.div>
    </div>
  );
}
