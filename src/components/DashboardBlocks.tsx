/**
 * Dashboard Blocks - Componentes focados para o Dashboard OUTLIER
 * 
 * HIERARQUIA VISUAL:
 * 1. TodayWorkoutBlock - Ação principal (prioridade máxima)
 * 2. StatusDiagnosisBlock - Diagnóstico rápido
 * 3. EvolutionFocusBlock - Focos de evolução
 * 4. LastWorkoutBlock - Continuidade
 */

import { motion } from 'framer-motion';
import { 
  ChevronRight, 
  Clock, 
  Zap, 
  Target, 
  TrendingUp, 
  History,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import type { DayWorkout } from '@/types/outlier';
import type { EvolutionFocusPoint } from '@/hooks/useEvolutionFocus';
import type { LastWorkoutInfo } from '@/hooks/useLastWorkout';
import type { AthleteDiagnosis } from '@/hooks/useAthleteDiagnosis';

// ============================================
// BLOCO 1 — SEU TREINO DE HOJE (Ação Principal)
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

      {/* CTA Principal */}
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
// BLOCO 2 — STATUS ATUAL (Diagnóstico Rápido)
// ============================================
interface StatusDiagnosisBlockProps {
  diagnosis: AthleteDiagnosis;
}

export function StatusDiagnosisBlock({ diagnosis }: StatusDiagnosisBlockProps) {
  const bgColor = diagnosis.type === 'positive' 
    ? 'bg-emerald-500/10 border-l-emerald-500'
    : diagnosis.type === 'attention'
    ? 'bg-amber-500/10 border-l-amber-500'
    : 'bg-secondary border-l-muted-foreground';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={`card-elevated p-6 border-l-4 ${bgColor}`}
    >
      <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
        STATUS ATUAL
      </h3>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{diagnosis.icon}</span>
        <p className="text-foreground font-medium">{diagnosis.text}</p>
      </div>
    </motion.div>
  );
}

// ============================================
// BLOCO 3 — FOCOS DE EVOLUÇÃO
// ============================================
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
      className="card-elevated p-6 border-l-4 border-l-purple-500"
    >
      <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-4">
        FOCOS DE EVOLUÇÃO
      </h3>
      
      {/* Lista de pontos */}
      <div className="space-y-3 mb-4">
        {focusPoints.map((point, idx) => (
          <div 
            key={point.metric}
            className="flex items-start gap-3"
          >
            <span className="text-lg">{point.emoji}</span>
            <span className="text-foreground">{point.description}</span>
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

// ============================================
// BLOCO 4 — ÚLTIMO TREINO (Continuidade)
// ============================================
interface LastWorkoutBlockProps {
  lastWorkout: LastWorkoutInfo | null;
  loading?: boolean;
  onViewDetails?: () => void;
}

export function LastWorkoutBlock({
  lastWorkout,
  loading = false,
  onViewDetails
}: LastWorkoutBlockProps) {
  // Estado vazio
  if (loading || !lastWorkout) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card-elevated p-6 border-l-4 border-l-muted-foreground/30"
      >
        <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
          ÚLTIMO TREINO
        </h3>
        <p className="text-muted-foreground/60 text-sm">
          {loading ? 'Carregando...' : 'Nenhum treino registrado ainda'}
        </p>
      </motion.div>
    );
  }

  const StatusIcon = lastWorkout.status === 'completed' ? CheckCircle2 : AlertCircle;
  const statusColor = lastWorkout.status === 'completed' 
    ? 'text-emerald-500' 
    : 'text-amber-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="card-elevated p-6 border-l-4 border-l-muted-foreground/50"
    >
      <h3 className="font-display text-sm text-muted-foreground tracking-wide mb-3">
        ÚLTIMO TREINO
      </h3>
      
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground font-medium">{lastWorkout.title}</p>
          <p className="text-sm text-muted-foreground">{lastWorkout.relativeDate}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${statusColor}`} />
          <span className={`text-sm font-medium ${statusColor}`}>
            {lastWorkout.statusLabel}
          </span>
        </div>
      </div>

      {/* CTA Secundário 
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
        >
          <span>Ver detalhes</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
      */}
    </motion.div>
  );
}
