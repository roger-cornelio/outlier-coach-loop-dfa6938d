/**
 * AthleteDashboard - Dashboard principal do atleta (refatorado)
 * 
 * Apenas diagnóstico e experiência:
 * - Radar de valências (diagnóstico)
 * - Diagnóstico por estação
 * - Evolução
 * - Focos de evolução
 * - CTA único: BORA TREINAR
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Flame, ChevronRight, Loader2 } from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
import { useAthleteProfile } from '@/hooks/useAthleteProfile';
import { useAthletePlan } from '@/hooks/useAthletePlan';
import { useDiagnosticScores } from '@/hooks/useDiagnosticScores';
import { useEvolutionFocus } from '@/hooks/useEvolutionFocus';
import { useWeeklyEvolution } from '@/hooks/useWeeklyEvolution';
import { useLevelUpDetection } from '@/hooks/useLevelUpDetection';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { DiagnosticRadarBlock } from '@/components/DiagnosticRadarBlock';
import { EvolutionChartBlock, EvolutionFocusBlock } from '@/components/DashboardBlocks';
import { LevelUpModal } from '@/components/LevelUpModal';

export default function AthleteDashboard() {
  const navigate = useNavigate();
  const {
    setBaseWorkouts,
    clearBaseWorkouts,
    hasHydrated,
    setCurrentView,
  } = useOutlierStore();

  const { status } = useAthleteStatus();
  const { showModal: showLevelUpModal, newLevel, acknowledgeLevel } = useLevelUpDetection(status);
  
  // Load athlete profile
  useAthleteProfile();

  // Dashboard data hooks
  const diagnosticScores = useDiagnosticScores();
  const evolutionFocus = useEvolutionFocus();
  const weeklyEvolution = useWeeklyEvolution();

  // Plan data (for checking if workouts exist)
  const {
    workouts: planWorkouts,
    loading: loadingPlan,
    debugInfo,
  } = useAthletePlan();

  // Sync workouts on load
  const selectedWeekStart = debugInfo?.selectedWeekStart;
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (!hasHydrated || loadingPlan) return;

    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      if (planWorkouts.length > 0) {
        setBaseWorkouts(planWorkouts);
      }
      return;
    }

    if (planWorkouts.length > 0) {
      setBaseWorkouts(planWorkouts);
    } else {
      clearBaseWorkouts();
    }
  }, [hasHydrated, selectedWeekStart, loadingPlan]);

  const hasAnyWorkouts = planWorkouts.length > 0;

  const handleStartTraining = () => {
    navigate('/app/treino');
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Level Up Modal */}
      <LevelUpModal
        isOpen={showLevelUpModal}
        newStatus={newLevel}
        onContinue={acknowledgeLevel}
      />

      {/* BLOCO 1 — DIAGNÓSTICO (Radar Chart + Parâmetros Fisiológicos) */}
      <section className="mb-6">
        <DiagnosticRadarBlock
          scores={diagnosticScores.scores}
          loading={diagnosticScores.loading}
          hasData={diagnosticScores.hasData}
          // Parâmetros fisiológicos estimados (placeholder para dados reais futuros)
          vo2Max={diagnosticScores.hasData ? 52 : null}
          vo2MaxSource="estimated"
          lactateThreshold={diagnosticScores.hasData ? 276 : null} // 4:36 / km
        />
      </section>

      {/* BLOCO 2 — SUA EVOLUÇÃO (Gráfico de Linha) */}
      <section className="mb-6">
        <EvolutionChartBlock
          data={weeklyEvolution.data}
          diagnosticText={weeklyEvolution.diagnosticText}
          trend={weeklyEvolution.trend}
          loading={weeklyEvolution.loading}
          hasData={weeklyEvolution.hasData}
          onViewEvolution={() => setCurrentView('benchmarks')}
        />
      </section>

      {/* BLOCO 3 — FOCOS DE EVOLUÇÃO */}
      <section className="mb-6">
        <EvolutionFocusBlock
          focusPoints={evolutionFocus.focusPoints}
          hasData={evolutionFocus.hasData}
          loading={evolutionFocus.loading}
          onViewEvolution={() => setCurrentView('benchmarks')}
        />
      </section>

      {/* BLOCO 4 — CTA ÚNICO: BORA TREINAR */}
      <section className="mb-6">
        {loadingPlan ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <motion.button
              onClick={handleStartTraining}
              disabled={!hasAnyWorkouts}
              className="w-full font-display text-2xl tracking-wider px-8 py-6 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-4 shadow-lg"
              whileHover={{ scale: hasAnyWorkouts ? 1.02 : 1 }}
              whileTap={{ scale: hasAnyWorkouts ? 0.98 : 1 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Flame className="w-7 h-7" />
              BORA TREINAR
              <ChevronRight className="w-7 h-7" />
            </motion.button>
            {!hasAnyWorkouts && (
              <p className="text-center text-muted-foreground text-sm mt-3">
                Nenhum treino programado para esta semana
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
