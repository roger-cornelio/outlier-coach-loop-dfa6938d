/**
 * Dashboard Blocks - Componentes focados para o Dashboard OUTLIER
 * 
 * HIERARQUIA VISUAL (FINAL):
 * 1. TodayWorkoutBlock - Decisão do dia (prioridade máxima, CTA único)
 * 2. EvolutionChartBlock - Evolução do atleta (gráfico + diagnóstico)
 * 3. EvolutionFocusBlock - Focos de evolução (secundário)
 * 
 * REMOVIDOS:
 * - StatusDiagnosisBlock (absorvido pelo EvolutionChartBlock)
 * - LastWorkoutBlock (removido da home)
 */

import { motion } from 'framer-motion';
import { 
  ChevronRight, 
  Clock, 
  Zap, 
  Target, 
  TrendingUp,
  History,
  AreaChart
} from 'lucide-react';
import { Area, AreaChart as RechartsAreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import type { DayWorkout } from '@/types/outlier';
import type { EvolutionFocusPoint } from '@/hooks/useEvolutionFocus';

// ============================================
// BLOCO 1 — SEU TREINO DE HOJE (Decisão do Dia)
// CTA ÚNICO PRIMÁRIO DA TELA
// ============================================
interface TodayWorkoutBlockProps {
  workout: DayWorkout | null;
  estimatedTime: number;
  hasAdaptations: boolean;
  onStartWorkout: () => void;
  loading?: boolean;
  isViewingHistory?: boolean;
}

export function TodayWorkoutBlock({
  workout,
  estimatedTime,
  hasAdaptations,
  onStartWorkout,
  loading = false,
  isViewingHistory = false
}: TodayWorkoutBlockProps) {
  // Estado vazio
  if (!workout || loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated p-8 border-l-4 border-l-muted-foreground/30"
      >
        <h2 className="font-display text-lg text-muted-foreground/60 mb-3">
          SEU TREINO DE HOJE
        </h2>
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground text-center">
            {loading ? 'Carregando treino...' : 'Nenhum treino programado para hoje'}
          </p>
        </div>
      </motion.div>
    );
  }

  // Extrair foco do dia dos blocos
  const blockTypes = workout.blocks.map(b => b.type);
  const focusItems: string[] = [];
  if (blockTypes.includes('forca')) focusItems.push('Força');
  if (blockTypes.includes('conditioning')) focusItems.push('Condicionamento');
  if (blockTypes.includes('especifico')) focusItems.push('Específico HYROX');
  if (blockTypes.includes('corrida')) focusItems.push('Corrida');
  if (blockTypes.includes('core')) focusItems.push('Core');
  
  const focusText = focusItems.length > 0 
    ? focusItems.slice(0, 2).join(' + ') 
    : workout.stimulus || 'Treino completo';

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${minutes}min`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-elevated p-8 border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent"
    >
      <h2 className="font-display text-lg text-primary mb-4 tracking-wide">
        SEU TREINO DE HOJE
      </h2>
      
      {/* Foco do dia */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-display text-2xl tracking-tight">{focusText}</span>
        </div>
        
        {/* Duração + Ajuste */}
        <div className="flex items-center gap-4 text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>{estimatedTime > 0 ? formatTime(estimatedTime) : '~45min'}</span>
          </div>
          {hasAdaptations && (
            <div className="flex items-center gap-2 text-primary">
              <Target className="w-4 h-4" />
              <span className="text-sm">Ajuste aplicado</span>
            </div>
          )}
        </div>
      </div>

      {/* CTA Principal - ÚNICO DA TELA */}
      {!isViewingHistory && (
        <motion.button
          onClick={onStartWorkout}
          className="w-full font-display text-xl tracking-wider px-8 py-5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center justify-center gap-3"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          TREINAR AGORA
          <ChevronRight className="w-6 h-6" />
        </motion.button>
      )}

      {isViewingHistory && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 text-center">
          <History className="w-5 h-5 inline mr-2" />
          <span>Visualizando histórico</span>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// BLOCO 2 — SUA EVOLUÇÃO (Gráfico + Diagnóstico)
// ============================================
interface WeeklyEvolutionPoint {
  week: string;
  weekLabel: string;
  score: number;
  benchmarks: number;
}

interface EvolutionTrend {
  direction: 'improving' | 'stable' | 'declining';
  text: string;
}

interface EvolutionChartBlockProps {
  data: WeeklyEvolutionPoint[];
  diagnosticText: string;
  trend: EvolutionTrend;
  loading?: boolean;
  hasData: boolean;
  onViewEvolution?: () => void;
}

// Custom tooltip para o gráfico
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  
  const data = payload[0].payload;
  return (
    <div className="bg-background/95 border border-border rounded-lg px-3 py-2 shadow-lg">
      <p className="text-xs text-muted-foreground">Semana {data.weekLabel}</p>
      <p className="text-sm font-medium text-foreground">Score: {data.score}</p>
      <p className="text-xs text-muted-foreground">{data.benchmarks} benchmark(s)</p>
    </div>
  );
}

export function EvolutionChartBlock({
  data,
  diagnosticText,
  trend,
  loading = false,
  hasData,
  onViewEvolution
}: EvolutionChartBlockProps) {
  // Estado vazio ou carregando
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-elevated p-6 border-l-4 border-l-muted-foreground/30"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          SUA EVOLUÇÃO
        </h3>
        <div className="h-32 flex items-center justify-center">
          <p className="text-muted-foreground/60 text-sm">Carregando evolução...</p>
        </div>
      </motion.div>
    );
  }

  if (!hasData || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-elevated p-6 border-l-4 border-l-muted-foreground/30"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          SUA EVOLUÇÃO
        </h3>
        <div className="flex flex-col items-center justify-center py-6 gap-3">
          <AreaChart className="w-10 h-10 text-muted-foreground/30" />
          <p className="text-muted-foreground text-sm text-center max-w-xs">
            Lance seu primeiro simulado ou prova oficial para visualizar sua evolução.
          </p>
          {onViewEvolution && (
            <button
              onClick={onViewEvolution}
              className="text-sm text-primary hover:text-primary/80 flex items-center gap-2 mt-2"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Ir para Evolução</span>
            </button>
          )}
        </div>
      </motion.div>
    );
  }

  // Cor do trend
  const trendColor = trend.direction === 'improving' 
    ? 'text-emerald-500' 
    : trend.direction === 'declining' 
    ? 'text-amber-500' 
    : 'text-muted-foreground';

  const trendIcon = trend.direction === 'improving' 
    ? '📈' 
    : trend.direction === 'declining' 
    ? '📉' 
    : '➡️';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="card-elevated p-6 border-l-4 border-l-primary"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-display text-sm text-muted-foreground tracking-wide">
          SUA EVOLUÇÃO
        </h3>
        <span className={`text-xs ${trendColor} flex items-center gap-1`}>
          <span>{trendIcon}</span>
          <span>{trend.text}</span>
        </span>
      </div>

      {/* Gráfico */}
      <div className="h-28 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="evolutionGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="weekLabel" 
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="score"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#evolutionGradient)"
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: 'hsl(var(--primary))' }}
            />
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>

      {/* Diagnóstico textual obrigatório (MANDA) */}
      <div className="pt-3 border-t border-border/50">
        <p className="text-foreground text-sm font-medium">{diagnosticText}</p>
      </div>
    </motion.div>
  );
}

// ============================================
// BLOCO 3 — FOCOS DE EVOLUÇÃO (Secundário)
// Ícones monocromáticos por estação HYROX
// ============================================

// Ícones SVG monocromáticos para cada estação HYROX
function StationIcon({ metric, className = "" }: { metric: string; className?: string }) {
  const iconClass = `w-5 h-5 ${className}`;
  
  switch (metric) {
    case 'sled_push':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
          <path d="M3 17h14l4-4V7h-6l-2 4H5l-2 6z" />
          <path d="M17 17l4-4" />
        </svg>
      );
    case 'sled_pull':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
          <path d="M21 17H7l-4-4V7h6l2 4h8l2 6z" />
          <path d="M7 17l-4-4" />
        </svg>
      );
    case 'farmers':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
          <rect x="3" y="8" width="6" height="10" rx="1" />
          <rect x="15" y="8" width="6" height="10" rx="1" />
          <path d="M9 12h6" />
        </svg>
      );
    case 'sandbag':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
          <path d="M6 8h12l2 12H4L6 8z" />
          <path d="M8 8V6a4 4 0 0 1 8 0v2" />
          <path d="M8 14h8" />
        </svg>
      );
    case 'wallballs':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 4v4M12 16v4M4 12h4M16 12h4" />
        </svg>
      );
    case 'bbj':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
          <path d="M4 16h4l4-8 4 8h4" />
          <path d="M8 16v4M16 16v4" />
        </svg>
      );
    case 'row':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
          <path d="M4 16l6-4 4 2 6-6" />
          <path d="M4 12h4l2-2h6l4 2h2" />
        </svg>
      );
    case 'ski':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
          <path d="M12 4v16" />
          <path d="M8 8l4-4 4 4" />
          <path d="M6 20l6-4 6 4" />
        </svg>
      );
    case 'run_avg':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
          <circle cx="12" cy="5" r="2" />
          <path d="M7 21l3-9 3 3 5-7" />
          <path d="M10 12l-3 3" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

interface EvolutionFocusBlockProps {
  focusPoints: EvolutionFocusPoint[];
  hasData: boolean;
  loading?: boolean;
  onViewEvolution?: () => void;
}

export function EvolutionFocusBlock({
  focusPoints,
  hasData,
  loading = false,
  onViewEvolution
}: EvolutionFocusBlockProps) {
  // Estado vazio ou carregando
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-elevated p-6 border-l-4 border-l-muted-foreground/30"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          FOCOS DE EVOLUÇÃO
        </h3>
        <p className="text-muted-foreground/60 text-sm">Carregando diagnóstico...</p>
      </motion.div>
    );
  }

  if (!hasData || focusPoints.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card-elevated p-6 border-l-4 border-l-muted-foreground/30"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          FOCOS DE EVOLUÇÃO
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
      transition={{ delay: 0.2 }}
      className="card-elevated p-6 border-l-4 border-l-primary"
    >
      <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-4">
        FOCOS DE EVOLUÇÃO
      </h3>
      
      {/* Lista de pontos (máximo 2-3) */}
      <div className="space-y-4 mb-4">
        {focusPoints.map((point) => (
          <div 
            key={point.metric}
            className="flex items-start gap-3"
          >
            {/* Ícone monocromático da estação */}
            <div className="flex-shrink-0 mt-0.5">
              <StationIcon 
                metric={point.metric} 
                className="text-primary/70" 
              />
            </div>
            
            {/* Conteúdo */}
            <div className="flex flex-col">
              <span className="font-display text-sm text-foreground tracking-wide">
                {point.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {point.percentile < 25 
                  ? 'força abaixo do esperado' 
                  : point.percentile < 40 
                  ? 'espaço para melhoria' 
                  : 'foco em consistência'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Texto fixo obrigatório */}
      <p className="text-sm text-muted-foreground italic border-t border-border/50 pt-3">
        Esses pontos já estão sendo trabalhados no seu plano.
      </p>
    </motion.div>
  );
}
