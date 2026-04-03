/**
 * PRE-WORKOUT SCREEN
 * 
 * Experiência de pré-treino antes do início do treino do dia.
 * Exibe mensagem motivacional gerada com base no resumo técnico do treino.
 * 
 * REGRAS:
 * - Aparece após login (se coach_style já existir)
 * - Ou ao clicar em "Começar meu treino"
 * - Mensagem coerente com o treino do dia
 * - NÃO genérica, NÃO inventa estímulos inexistentes
 */
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { useAuth } from '@/hooks/useAuth';
import { useCoachWorkouts } from '@/hooks/useCoachWorkouts';
import type { CoachStyle, DayOfWeek, DayWorkout } from '@/types/outlier';
import { Flame, Heart, Zap, Loader2, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { buildSemanticSummary } from '@/utils/workoutSemanticSummary';

// Coach icons mapping
const coachIcons: Record<CoachStyle, typeof Flame> = {
  IRON: Flame,
  PULSE: Heart,
  SPARK: Zap,
};

// Get current day of week in Portuguese format
function getCurrentDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  return days[new Date().getDay()];
}

// Generate workout technical summary for AI using semantic extraction
function generateWorkoutSummary(workout: DayWorkout | undefined): string {
  if (!workout || workout.blocks.length === 0) {
    return 'Sem treino programado para hoje.';
  }
  return buildSemanticSummary(workout.blocks as any);
}

interface PreWorkoutScreenProps {
  onContinue?: () => void;
}

export function PreWorkoutScreen({ onContinue }: PreWorkoutScreenProps) {
  const { setCurrentView, coachStyle, athleteConfig, baseWorkouts, setBaseWorkouts } = useOutlierStore();
  const { profile } = useAuth();
  const { fetchAvailableWorkouts } = useCoachWorkouts();
  
  const [preWorkoutMessage, setPreWorkoutMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(false);

  const currentDay = getCurrentDayOfWeek();
  const currentCoachStyle = (coachStyle || profile?.coach_style || 'PULSE') as CoachStyle;
  const CoachIcon = coachIcons[currentCoachStyle];

  // Find today's workout
  const todayWorkout = useMemo(() => {
    return baseWorkouts.find(w => w.day === currentDay);
  }, [baseWorkouts, currentDay]);

  // Load workouts from database if not available
  useEffect(() => {
    async function loadWorkouts() {
      if (baseWorkouts.length > 0) return;
      
      setIsLoadingWorkouts(true);
      try {
        const workoutsFromDb = await fetchAvailableWorkouts();
        if (workoutsFromDb.length > 0) {
          setBaseWorkouts(workoutsFromDb);
        }
      } catch (err) {
        console.error('[PreWorkoutScreen] Error loading workouts:', err);
      } finally {
        setIsLoadingWorkouts(false);
      }
    }
    
    loadWorkouts();
  }, [baseWorkouts.length, fetchAvailableWorkouts, setBaseWorkouts]);

  // Generate pre-workout message
  useEffect(() => {
    async function generateMessage() {
      setIsLoading(true);
      
      try {
        const workoutSummary = generateWorkoutSummary(todayWorkout);
        
        const { data, error } = await supabase.functions.invoke('generate-preworkout-message', {
          body: {
            coachStyle: currentCoachStyle,
            workoutSummary,
            hasWorkout: !!todayWorkout,
            sex: athleteConfig?.sexo,
          },
        });

        if (error) throw error;
        
        if (data?.message) {
          setPreWorkoutMessage(data.message);
        } else {
          // Fallback messages
          const fallbacks: Record<CoachStyle, string> = {
            IRON: 'O treino está pronto. Agora é com você.',
            PULSE: 'Mais um dia de evolução. Vamos construir juntos.',
            SPARK: 'Energia no máximo! Bora fazer acontecer! 🔥',
          };
          setPreWorkoutMessage(fallbacks[currentCoachStyle]);
        }
      } catch (err) {
        console.error('[PreWorkoutScreen] Error generating message:', err);
        // Fallback
        const fallbacks: Record<CoachStyle, string> = {
          IRON: 'O treino está pronto. Agora é com você.',
          PULSE: 'Mais um dia de evolução. Vamos construir juntos.',
          SPARK: 'Energia no máximo! Bora fazer acontecer! 🔥',
        };
        setPreWorkoutMessage(fallbacks[currentCoachStyle]);
      } finally {
        setIsLoading(false);
      }
    }
    
    // Only generate when we have coach style and finished loading workouts
    if (currentCoachStyle && !isLoadingWorkouts) {
      generateMessage();
    }
  }, [currentCoachStyle, todayWorkout, athleteConfig?.sexo, isLoadingWorkouts]);

  const handleContinue = () => {
    if (onContinue) {
      onContinue();
    } else {
      console.log(`[NAV][PreWorkoutScreen] from_view=preWorkout to_view=dashboard first_setup_completed=${profile?.first_setup_completed} coachStyle=${currentCoachStyle} reason=user_clicked_bora_treinar ts=${new Date().toISOString()}`);
      setCurrentView('dashboard');
    }
  };

  const handleSkipToConfig = () => {
    console.log(`[NAV][PreWorkoutScreen] from_view=preWorkout to_view=config first_setup_completed=${profile?.first_setup_completed} coachStyle=${currentCoachStyle} reason=user_clicked_ir_para_config ts=${new Date().toISOString()}`);
    setCurrentView('config');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: 'var(--gradient-glow)' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center z-10 max-w-lg w-full"
      >
        {/* Coach Icon with pulse animation */}
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ 
            duration: 1.2, 
            ease: 'easeInOut',
            repeat: Infinity,
            repeatDelay: 2
          }}
          className="mb-4 sm:mb-6 p-4 sm:p-6 rounded-full bg-primary/20 ring-4 ring-primary/30 shadow-lg shadow-primary/20"
        >
          <CoachIcon className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
        </motion.div>

        {/* Coach Name */}
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-display text-2xl sm:text-3xl md:text-4xl uppercase tracking-[0.2em] font-bold text-primary mb-4"
        >
          {currentCoachStyle}
        </motion.h1>

        {/* Message Container */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full px-8 py-10 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 border border-primary/30 shadow-xl shadow-primary/10 mb-10"
        >
          {isLoading || isLoadingWorkouts ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">
                {isLoadingWorkouts ? 'Carregando treino...' : 'Preparando sua mensagem...'}
              </p>
            </div>
          ) : (
            <p className="text-xl md:text-2xl text-white font-medium italic text-center leading-relaxed">
              "{preWorkoutMessage}"
            </p>
          )}
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          onClick={handleContinue}
          disabled={isLoading || isLoadingWorkouts}
          className={`
            font-display text-xl md:text-2xl tracking-widest px-12 py-5 rounded-xl
            transition-all duration-300 flex items-center justify-center gap-3
            ${!isLoading && !isLoadingWorkouts
              ? 'bg-primary text-primary-foreground hover:brightness-110 shadow-xl shadow-primary/40 ring-2 ring-primary/40' 
              : 'bg-muted text-muted-foreground cursor-not-allowed'
            }
          `}
          whileHover={!isLoading && !isLoadingWorkouts ? { scale: 1.03 } : {}}
          whileTap={!isLoading && !isLoadingWorkouts ? { scale: 0.98 } : {}}
        >
          BORA TREINAR
          <ChevronRight className="w-6 h-6" />
        </motion.button>

        {/* Skip to settings link */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={handleSkipToConfig}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
        >
          Ir para configurações
        </motion.button>
      </motion.div>
    </div>
  );
}
