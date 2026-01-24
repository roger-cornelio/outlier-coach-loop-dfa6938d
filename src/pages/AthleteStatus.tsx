/**
 * AthleteStatus - Tela de Status do Atleta
 * 
 * Responsabilidades:
 * - Categoria HYROX
 * - Nível atual
 * - Histórico resumido
 */

import { Trophy, Target, TrendingUp, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { useOutlierStore } from '@/store/outlierStore';
import { useDiagnosticScores } from '@/hooks/useDiagnosticScores';
import { StatusCrownPreset } from '@/components/ui/StatusCrownPreset';
import { LEVEL_NAMES } from '@/types/outlier';

export default function AthleteStatus() {
  const { status, rulerScore, confidence } = useAthleteStatus();
  const { athleteConfig } = useOutlierStore();
  const { lastResultDate, hasData } = useDiagnosticScores();

  const levelName = status ? LEVEL_NAMES[status] : 'Não definido';
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Sem registro';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-8 h-8 text-amber-500" />
        <h1 className="text-2xl font-display tracking-wide">Status do Atleta</h1>
      </div>

      {/* Current Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated p-6 mb-6"
      >
        <div className="flex items-center gap-4 mb-6">
          <StatusCrownPreset size="lg" />
          <div>
            <h2 className="text-2xl font-display">{levelName}</h2>
            <p className="text-muted-foreground">Seu nível atual</p>
          </div>
        </div>

        {/* Ruler Score */}
        {rulerScore !== null && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Pontuação</span>
              <span className="font-display text-lg">{rulerScore}/100</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${rulerScore}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-primary rounded-full"
              />
            </div>
          </div>
        )}

        {/* Confidence */}
        {confidence && (
          <p className="text-sm text-muted-foreground">
            Confiança: <span className="text-foreground">{confidence}</span>
          </p>
        )}
      </motion.div>

      {/* Info Cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Training Level */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-elevated p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-sm text-muted-foreground">Nível de Treino</span>
          </div>
          <p className="font-display text-lg capitalize">
            {athleteConfig?.trainingLevel || 'Não definido'}
          </p>
        </motion.div>

        {/* Session Duration */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card-elevated p-4"
        >
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Duração da Sessão</span>
          </div>
          <p className="font-display text-lg capitalize">
            {athleteConfig?.sessionDuration || 'Não definido'}
          </p>
        </motion.div>

        {/* Last Result */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-elevated p-4 sm:col-span-2"
        >
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            <span className="text-sm text-muted-foreground">Última Prova/Simulado</span>
          </div>
          <p className="font-display text-lg">
            {hasData ? formatDate(lastResultDate) : 'Nenhum registro'}
          </p>
        </motion.div>
      </div>

      {/* CTA */}
      {!hasData && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-4 rounded-lg bg-muted/50 border border-border text-center"
        >
          <p className="text-muted-foreground text-sm">
            Registre seu primeiro simulado ou prova oficial para desbloquear seu diagnóstico completo.
          </p>
        </motion.div>
      )}
    </div>
  );
}
