/**
 * DailyBriefingCard — Mensagem conversacional do Coach no topo do Dashboard
 * 
 * Tudo client-side, zero IA, instantâneo.
 * Calcula: tipo do treino, tempo estimado, bloco mais pesado, nota na semana.
 * Monta frase natural no tom do coach + frase final rotativa.
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Flame, Heart, Zap } from 'lucide-react';
import { useOutlierStore } from '@/store/outlierStore';
import type { CoachStyle, DayOfWeek, DayWorkout, WorkoutBlock } from '@/types/outlier';
import { identifyMainBlock, estimateBlockDuration } from '@/utils/mainBlockIdentifier';
import { estimateWorkout, getUserBiometrics } from '@/utils/workoutEstimation';
import { BLOCK_CATEGORIES } from '@/utils/categoryValidation';
import { getBlockDisplayTitle } from '@/utils/blockDisplayUtils';

// ============================================
// POOL DE FRASES FINAIS (rotação por dia)
// ============================================

const CLOSING_PHRASES: Record<CoachStyle, string[]> = {
  IRON: [
    'Sem desculpa. Só execução.',
    'Hoje é dia de fritar. Não quero ver moleza.',
    'O ferro não mente. Você aguenta ou não aguenta.',
    'Menos conversa, mais trabalho.',
    'Foco total. Sem margem pra erro.',
    'Quem quer resultado, paga o preço.',
    'Não vim aqui pra te agradar. Vim pra te fazer melhor.',
    'A dor é passageira. O resultado fica.',
    'Hora de provar do que você é feito.',
    'Sem atalho. O caminho é por dentro.',
    'Cada rep é um tijolo. Construa.',
    'Hoje não é dia de descanso. É dia de guerra.',
    'Vai doer. E vai valer.',
    'O treino não pede licença. Ele cobra.',
    'Fez o combinado? Então vai.',
  ],
  PULSE: [
    'Confia no processo. Cada rep te aproxima.',
    'Hoje é construção. Tijolo por tijolo.',
    'Você já provou que consegue. Mais uma vez.',
    'O caminho é longo, mas cada passo conta.',
    'Consistência vence talento. Sempre.',
    'Seu corpo agradece cada treino. Vai lá.',
    'Não precisa ser perfeito. Precisa ser feito.',
    'A evolução não para. Nem você.',
    'Mais um dia, mais um degrau.',
    'Você está mais forte do que pensa.',
    'O segredo é não parar. Segue firme.',
    'Hoje é dia de cuidar de quem você quer ser.',
    'Cada sessão é um investimento em você.',
    'Sem pressa, mas sem pausa.',
    'Vamos juntos. Um treino de cada vez.',
  ],
  SPARK: [
    'Bora meter bronca! 🔥',
    'Hoje o treino é teu! 💪 Sem freio!',
    'Energia lá em cima! 🚀 Vamos!',
    'Chega de desculpa, bora suar! 🔥',
    'Dia de brilhar! ✨ Manda ver!',
    'Tá na hora do show! 💥',
    'Vai com tudo que hoje é dia! 🚀',
    'Simbora que o treino tá chamando! 🏋️',
    'Acelera que é pra ontem! ⚡',
    'Hoje tem festa de endorfina! 🎉',
    'Mete o shape! 💪🔥',
    'Bora acordar esse corpo! 🌟',
    'Sem mimimi, só resultado! 🚀',
    'Vai ser épico! Eu acredito em você! ✨',
    'Modo turbo ativado! ⚡ Partiu!',
  ],
};

// Coach icons
const coachIcons: Record<CoachStyle, typeof Flame> = {
  IRON: Flame,
  PULSE: Heart,
  SPARK: Zap,
};

// ============================================
// HELPERS
// ============================================

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
}

function getClosingPhrase(style: CoachStyle): string {
  const pool = CLOSING_PHRASES[style];
  const index = (getDayOfYear() + getWeekNumber()) % pool.length;
  return pool[index];
}

function getCurrentDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  return days[new Date().getDay()];
}

/** Get unique block type labels for the day */
function getWorkoutTypes(blocks: WorkoutBlock[]): string {
  const typeLabels: Record<string, string> = {};
  for (const cat of BLOCK_CATEGORIES) {
    typeLabels[cat.value] = cat.label;
  }
  
  const types = new Set<string>();
  for (const b of blocks) {
    if (b.type === 'notas' || b.type === 'aquecimento') continue;
    types.add(typeLabels[b.type] || b.type);
  }
  
  const arr = Array.from(types);
  if (arr.length === 0) return 'treino geral';
  if (arr.length === 1) return arr[0].toLowerCase();
  if (arr.length === 2) return `${arr[0].toLowerCase()} e ${arr[1].toLowerCase()}`;
  return arr.slice(0, -1).map(s => s.toLowerCase()).join(', ') + ' e ' + arr[arr.length - 1].toLowerCase();
}

/** Calculate intensity score 1-10 comparing today vs. week */
function calculateIntensityScore(
  todayWorkout: DayWorkout,
  allWorkouts: DayWorkout[],
  athleteConfig: any,
  effectiveLevel: string
): number {
  const todayEst = estimateWorkout(todayWorkout, athleteConfig, effectiveLevel as any);
  if (!todayEst) return 5;
  
  const todayScore = (todayEst.totals.estimatedMinutesTotal || 0) + (todayEst.totals.estimatedKcalTotal || 0) / 50;
  
  let maxScore = todayScore;
  let minScore = todayScore;
  
  for (const w of allWorkouts) {
    if (w.isRestDay || w.blocks.length === 0) continue;
    const est = estimateWorkout(w, athleteConfig, effectiveLevel as any);
    if (!est) continue;
    const s = (est.totals.estimatedMinutesTotal || 0) + (est.totals.estimatedKcalTotal || 0) / 50;
    if (s > maxScore) maxScore = s;
    if (s < minScore) minScore = s;
  }
  
  const range = maxScore - minScore;
  if (range < 1) return 5;
  
  const normalized = (todayScore - minScore) / range;
  return Math.max(1, Math.min(10, Math.round(normalized * 9 + 1)));
}

/** Get main block description */
function getMainBlockDescription(blocks: WorkoutBlock[]): string | null {
  const result = identifyMainBlock(blocks);
  if (!result.block) return null;
  
  const title = getBlockDisplayTitle(result.block);
  const content = result.block.content;
  
  // Try to extract meaningful details from content
  const roundsMatch = content.match(/(\d+)\s*rounds?/i);
  const amrapMatch = content.match(/amrap\s*(\d+)/i);
  const emomMatch = content.match(/emom\s*(\d+)/i);
  // Extract weight mentions
  const weightMatch = content.match(/(\d+)\s*kg/i);
  
  const details: string[] = [];
  if (roundsMatch) details.push(`${roundsMatch[1]} rounds`);
  if (amrapMatch) details.push(`AMRAP ${amrapMatch[1]}'`);
  if (emomMatch) details.push(`EMOM ${emomMatch[1]}'`);
  if (weightMatch) details.push(`${weightMatch[1]}kg`);
  
  if (details.length > 0) {
    return `${title} — ${details.join(', ')}`;
  }
  return title;
}

// ============================================
// TEMPLATE BUILDERS POR COACH STYLE
// ============================================

interface BriefingData {
  types: string;
  estimatedMinutes: number;
  mainBlockDesc: string | null;
  intensityScore: number;
  isRestDay: boolean;
}

function buildIronMessage(data: BriefingData): string {
  if (data.isRestDay) return 'Sem treino hoje. Recupere. Amanhã a conta chega.';
  
  const time = data.estimatedMinutes > 0 ? `, uns ${data.estimatedMinutes} minutos` : '';
  const peak = data.mainBlockDesc ? ` O pico vai ser no ${data.mainBlockDesc}.` : '';
  const intensity = data.intensityScore >= 7 
    ? ` Na semana, esse é dos mais pesados — ${data.intensityScore} de 10.`
    : data.intensityScore <= 3
    ? ` Na semana, esse é mais leve — ${data.intensityScore} de 10. Aproveita pra caprichar na técnica.`
    : ` Na semana, esse pesa ${data.intensityScore} de 10.`;
  
  return `Hoje é ${data.types}${time}.${peak}${intensity} ${getClosingPhrase('IRON')}`;
}

function buildPulseMessage(data: BriefingData): string {
  if (data.isRestDay) return 'Hoje é dia de recuperação. Seu corpo precisa desse tempo — aproveite bem.';
  
  const time = data.estimatedMinutes > 0 ? `, cerca de ${data.estimatedMinutes} minutos` : '';
  const peak = data.mainBlockDesc ? ` O momento mais intenso vai ser no ${data.mainBlockDesc}.` : '';
  const intensity = data.intensityScore >= 7
    ? ` Comparado com a semana, esse treino pesa ${data.intensityScore} de 10.`
    : data.intensityScore <= 3
    ? ` Hoje é mais tranquilo — ${data.intensityScore} de 10 na semana. Ótimo pra focar na qualidade.`
    : ` Na semana, esse fica em ${data.intensityScore} de 10.`;
  
  return `Seu treino hoje é ${data.types}${time}.${peak}${intensity} ${getClosingPhrase('PULSE')}`;
}

function buildSparkMessage(data: BriefingData): string {
  if (data.isRestDay) return 'Dia off! ✨ Descansa, hidrata e volta com tudo amanhã!';
  
  const time = data.estimatedMinutes > 0 ? `, ~${data.estimatedMinutes} min` : '';
  const peak = data.mainBlockDesc ? ` O bicho pega no ${data.mainBlockDesc}!` : '';
  const intensity = data.intensityScore >= 7
    ? ` Na semana esse é ${data.intensityScore}/10 em peso!`
    : data.intensityScore <= 3
    ? ` Hoje é mais relax, ${data.intensityScore}/10 — mas não vacila!`
    : ` Na semana esse é ${data.intensityScore}/10.`;
  
  return `Bora! Hoje tem ${data.types}${time}.${peak}${intensity} ${getClosingPhrase('SPARK')}`;
}

const MESSAGE_BUILDERS: Record<CoachStyle, (data: BriefingData) => string> = {
  IRON: buildIronMessage,
  PULSE: buildPulseMessage,
  SPARK: buildSparkMessage,
};

// ============================================
// COMPONENT
// ============================================

export function DailyBriefingCard() {
  const { baseWorkouts, adaptedWorkouts, athleteConfig, coachStyle: storeCoachStyle } = useOutlierStore();
  
  const currentCoachStyle: CoachStyle = (athleteConfig?.coachStyle || storeCoachStyle || 'PULSE') as CoachStyle;
  const CoachIcon = coachIcons[currentCoachStyle];
  
  const displayWorkouts = adaptedWorkouts.length > 0 ? adaptedWorkouts : baseWorkouts;
  const currentDay = getCurrentDayOfWeek();
  const todayWorkout = displayWorkouts.find(w => w.day === currentDay);
  
  const message = useMemo(() => {
    const isRestDay = !todayWorkout || todayWorkout.isRestDay || todayWorkout.blocks.length === 0;
    
    const data: BriefingData = {
      types: isRestDay ? '' : getWorkoutTypes(todayWorkout!.blocks),
      estimatedMinutes: 0,
      mainBlockDesc: null,
      intensityScore: 5,
      isRestDay,
    };
    
    if (!isRestDay && todayWorkout) {
      // Estimate time
      const est = estimateWorkout(todayWorkout, athleteConfig || null, 'open' as any);
      data.estimatedMinutes = Math.round(est?.totals.estimatedMinutesTotal || 0);
      
      // Main block
      data.mainBlockDesc = getMainBlockDescription(todayWorkout.blocks);
      
      // Intensity vs week
      if (displayWorkouts.length > 0) {
        data.intensityScore = calculateIntensityScore(todayWorkout, displayWorkouts, athleteConfig, 'open');
      }
    }
    
    const builder = MESSAGE_BUILDERS[currentCoachStyle];
    return builder(data);
  }, [todayWorkout, displayWorkouts, athleteConfig, currentCoachStyle]);
  
  // Don't show if no workouts at all
  if (displayWorkouts.length === 0) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl bg-gradient-to-br from-primary/12 via-primary/8 to-primary/4 border border-primary/20 px-5 py-4 shadow-sm"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-full bg-primary/15 shrink-0">
          <CoachIcon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-primary/70 uppercase tracking-wider mb-1.5">
            {currentCoachStyle}
          </p>
          <p className="text-sm sm:text-base text-foreground leading-relaxed italic">
            "{message}"
          </p>
        </div>
      </div>
    </motion.div>
  );
}
