import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, ArrowRight, TrendingUp, Calendar, Target, Trophy, Flag } from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
import { useBenchmarkResults } from '@/hooks/useBenchmarkResults';
import { useAthleteStatus } from '@/hooks/useAthleteStatus';
import { 
  calculateProgress, 
  getProgressGradient,
  MIN_STRONG_WEEKS,
  type ProgressData 
} from '@/utils/progressSystem';
import { 
  calculateProRulerScore, 
  getProScoreDescription, 
  getNationalThresholds,
  COUNTRY_NAMES 
} from '@/utils/nationalPodiumThresholds';
import type { AthleteLevel, AthleteCountry } from '@/types/outlier';
import type { AthleteGender } from '@/utils/athleteStatusSystem';

const LEVEL_DISPLAY: Record<AthleteLevel, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
  hyrox_open: 'HYROX OPEN',
  hyrox_pro: 'HYROX PRO',
};

interface ValidationStatus {
  label: string;
  ok: boolean;
  detail: string;
}

function getValidationStatus(data: ProgressData): ValidationStatus[] {
  const { levelValidation } = data;
  
  return [
    {
      label: 'Score',
      ok: levelValidation.meetsThreshold,
      detail: levelValidation.meetsThreshold 
        ? `${data.rulerScore}/${data.currentThreshold}` 
        : `Faltam ${Math.ceil(data.currentThreshold - data.rulerScore)} pts`,
    },
    {
      label: 'Constância',
      ok: levelValidation.meetsConsistency,
      detail: levelValidation.meetsConsistency 
        ? 'Variação baixa' 
        : 'Reduza variação',
    },
    {
      label: 'Semanas STRONG+',
      ok: levelValidation.meetsWeeklyStrong,
      detail: `${levelValidation.weeksWithStrongPlus}/${MIN_STRONG_WEEKS} semanas`,
    },
  ];
}

function getNextStepRecommendation(data: ProgressData): string {
  if (data.isReadyToAdvance && data.nextLevel) {
    return `Você validou todos os critérios para ${LEVEL_DISPLAY[data.nextLevel]}!`;
  }
  
  switch (data.blockingReason) {
    case 'threshold':
      return `Eleve seu score em ${Math.ceil(data.currentThreshold - data.rulerScore)} pontos com benchmarks STRONG ou ELITE.`;
    case 'consistency':
      return 'Mantenha performance estável nos próximos benchmarks para validar constância.';
    case 'weekly_validation':
      const weeksNeeded = MIN_STRONG_WEEKS - data.levelValidation.weeksWithStrongPlus;
      return `Mantenha STRONG+ por mais ${weeksNeeded} semana${weeksNeeded > 1 ? 's' : ''} para validar o nível.`;
    default:
      return 'Continue treinando para consolidar seu progresso.';
  }
}

// Format time for display
function formatTimeMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h > 0) {
    return `${h}h${m.toString().padStart(2, '0')}`;
  }
  return `${m}min`;
}

// PRO Ruler Component
function ProRulerDisplay({ 
  timeInSeconds, 
  country, 
  gender 
}: { 
  timeInSeconds: number; 
  country: AthleteCountry; 
  gender: AthleteGender;
}) {
  const proScore = calculateProRulerScore(timeInSeconds, country, gender);
  const scoreDescription = getProScoreDescription(proScore);
  const thresholds = getNationalThresholds(country, gender);
  
  // Get gradient based on PRO score
  const getProGradient = (score: number): string => {
    if (score >= 95) return 'from-amber-400 to-yellow-300';
    if (score >= 88) return 'from-purple-500 to-pink-400';
    if (score >= 80) return 'from-blue-500 to-cyan-400';
    if (score >= 72) return 'from-green-500 to-emerald-400';
    return 'from-orange-500 to-amber-400';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
        <Flag className="w-3 h-3" />
        <span>Régua PRO - {COUNTRY_NAMES[country]}</span>
      </div>
      
      {/* Score display */}
      <div className="text-center">
        <div className={`text-5xl font-display font-bold bg-gradient-to-r ${getProGradient(proScore)} bg-clip-text text-transparent`}>
          {Math.round(proScore)}
        </div>
        <div className="text-sm text-foreground mt-1 font-medium">
          {scoreDescription}
        </div>
      </div>

      {/* Progress bar with markers */}
      <div className="relative">
        <div className="relative h-4 bg-secondary/50 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(proScore, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getProGradient(proScore)} rounded-full`}
          />
          
          {/* Threshold markers */}
          <div className="absolute top-0 bottom-0 w-0.5 bg-amber-400/50" style={{ left: '95%' }} title="Pódio" />
          <div className="absolute top-0 bottom-0 w-0.5 bg-purple-400/50" style={{ left: '88%' }} title="Elite" />
          <div className="absolute top-0 bottom-0 w-0.5 bg-blue-400/50" style={{ left: '80%' }} title="Competitivo" />
          <div className="absolute top-0 bottom-0 w-0.5 bg-green-400/50" style={{ left: '72%' }} title="Sólido" />
        </div>
        
        {/* Labels */}
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1 px-1">
          <span>65</span>
          <span>72</span>
          <span>80</span>
          <span>88</span>
          <span>95</span>
          <span>100</span>
        </div>
      </div>

      {/* National thresholds info */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
          <Trophy className="w-3 h-3 text-amber-500" />
          <div>
            <span className="text-amber-500 font-medium">Pódio</span>
            <span className="text-muted-foreground ml-1">≤{formatTimeMinutes(thresholds.podium)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded bg-purple-500/10 border border-purple-500/20">
          <Target className="w-3 h-3 text-purple-500" />
          <div>
            <span className="text-purple-500 font-medium">Elite</span>
            <span className="text-muted-foreground ml-1">≤{formatTimeMinutes(thresholds.elite)}</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground/70 text-center">
        Calibrado pelo pódio nacional {gender === 'feminino' ? 'feminino' : 'masculino'}
      </p>
    </div>
  );
}

export function ProgressRuler() {
  const { athleteConfig } = useOutlierStore();
  const { results, loading, getOfficialCompetitions } = useBenchmarkResults();
  const { status, validatingCompetition, statusSource } = useAthleteStatus();
  
  // Get latest official competition time for PRO ruler
  const officialCompetitions = getOfficialCompetitions();
  const latestOfficialTime = officialCompetitions.length > 0 
    ? officialCompetitions.sort((a, b) => 
        new Date(b.event_date || b.created_at).getTime() - 
        new Date(a.event_date || a.created_at).getTime()
      )[0]?.time_in_seconds
    : null;

  const progressData = useMemo<ProgressData | null>(() => {
    if (!status) return null;
    return calculateProgress(results, status);
  }, [results, status]);

  // Determine if we should show PRO ruler
  const isProAthlete = status === 'hyrox_pro';
  const hasOfficialTime = latestOfficialTime && latestOfficialTime > 0;
  const showProRuler = isProAthlete && hasOfficialTime;

  if (loading || !athleteConfig) {
    return null;
  }

  // Show PRO ruler if athlete is PRO with official time
  if (showProRuler && latestOfficialTime) {
    const gender: AthleteGender = athleteConfig.sexo === 'feminino' ? 'feminino' : 'masculino';
    const country: AthleteCountry = athleteConfig.pais || 'BR';
    
    return (
      <div className="space-y-5">
        <ProRulerDisplay 
          timeInSeconds={latestOfficialTime} 
          country={country}
          gender={gender}
        />
      </div>
    );
  }

  // Standard progression ruler for non-PRO athletes
  if (!progressData) {
    return null;
  }

  if (progressData.benchmarksUsed === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          Complete seu primeiro benchmark para ver seu progresso
        </p>
      </div>
    );
  }

  const validationStatus = getValidationStatus(progressData);
  const nextStep = getNextStepRecommendation(progressData);
  const nextLevelName = progressData.nextLevel ? LEVEL_DISPLAY[progressData.nextLevel] : null;

  return (
    <div className="space-y-5">
      {/* Main Progress Ruler */}
      <div className="text-center space-y-3">
        {nextLevelName && (
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Régua de progresso para {nextLevelName}
          </p>
        )}
        
        {/* Score display */}
        <div className="relative">
          <div className={`text-5xl font-display font-bold bg-gradient-to-r ${getProgressGradient(progressData.rulerScore)} bg-clip-text text-transparent`}>
            {Math.round(progressData.rulerScore)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            de {progressData.currentThreshold} para validar
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 bg-secondary/50 rounded-full overflow-hidden mx-auto max-w-xs">
          {/* Threshold marker */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-foreground/30 z-10"
            style={{ left: '100%' }}
          />
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progressData.progressToNextLevel, 100)}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getProgressGradient(progressData.rulerScore)} rounded-full`}
          />
        </div>
        
        {/* Ruler explanation */}
        <p className="text-xs text-muted-foreground/70">
          Cada benchmark STRONG/ELITE aumenta a régua
        </p>
      </div>

      {/* Validation Status */}
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide text-center">
          Validação de Nível
        </p>
        <div className="flex justify-center gap-4">
          {validationStatus.map((v) => (
            <div key={v.label} className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-1">
                {v.ok ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                )}
                <span className={`text-xs font-medium ${v.ok ? 'text-green-500' : 'text-amber-500'}`}>
                  {v.label}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {v.detail}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Next Step Recommendation */}
      <div className={`p-3 rounded-lg ${progressData.isReadyToAdvance 
        ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20' 
        : 'bg-secondary/30'}`}
      >
        <div className="flex items-start gap-2">
          {progressData.isReadyToAdvance ? (
            <TrendingUp className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
          ) : progressData.blockingReason === 'weekly_validation' ? (
            <Calendar className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          ) : progressData.blockingReason === 'threshold' ? (
            <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          ) : (
            <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          )}
          <p className={`text-sm ${progressData.isReadyToAdvance ? 'text-green-500 font-medium' : 'text-foreground'}`}>
            {nextStep}
          </p>
        </div>
      </div>
    </div>
  );
}
