import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Trophy, ArrowRight, AlertTriangle } from 'lucide-react';
import { formatTime } from './simulatorConstants';

const MIN_VALID_SIM_SECONDS = 1800;

const COACH_NAMES: Record<string, string> = {
  IRON: 'IRON',
  PULSE: 'PULSE',
  SPARK: 'SPARK',
};

const VALID_MESSAGES: Record<string, string[]> = {
  IRON: [
    'Simulado registrado. Agora você tem um dado real. Use.',
    'Concluído. Esse tempo é seu novo ponto de referência. Melhore.',
    'Feito. O número não mente — agora trabalha pra derrubar ele.',
  ],
  PULSE: [
    'Parabéns por completar o simulado. Esse tempo vai servir como referência real da sua evolução.',
    'Simulado concluído com sucesso. Agora sua régua de evolução vai refletir esse resultado.',
    'Bom trabalho. Com esse dado, sua jornada até a meta ficou mais clara.',
  ],
  SPARK: [
    'SIMULADO FEITO! 🔥 Agora sim a régua vai mexer! Bora evoluir!',
    'ARRASOU! 🚀 Esse tempo é seu novo ponto de partida! Próxima vez você derruba!',
    'DONE! 💪 Agora temos dado real pra medir sua evolução! Vamo que vamo!',
  ],
};

const INVALID_MESSAGES: Record<string, string[]> = {
  IRON: [
    'Esse tempo não é real. Menos de 30 minutos não vale como simulado. Faz direito ou não faz.',
    'Resultado descartado. Simulado de verdade leva tempo de verdade.',
    'Sem atalhos. Abaixo de 30 minutos não entra na conta.',
  ],
  PULSE: [
    'Esse simulado ficou abaixo de 30 minutos e não será contabilizado na sua evolução. Para medir seu progresso real, faça o simulado completo.',
    'Resultado não validado — precisa ter pelo menos 30 minutos para refletir uma prova real. Tenta de novo com calma.',
    'Esse tempo não representa um HYROX de verdade. Quando fizer o simulado completo, sua régua vai avançar.',
  ],
  SPARK: [
    'Eiii! 😅 Menos de 30 min não conta como simulado de verdade! Bora fazer um completo pra régua avançar! 🔥',
    'Esse tempo foi rápido demais! 🚀 Pra valer na evolução, precisa ser um simulado completo (30min+). Bora!',
    'Resultado não validado! ⚡ Faz o simulado inteiro que aí sim a régua vai voar!',
  ],
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface SimulationResultScreenProps {
  totalTime: number;
  roxzoneTime: number;
  coachStyle: string;
  onContinue: () => void;
}

export function SimulationResultScreen({ totalTime, roxzoneTime, coachStyle, onContinue }: SimulationResultScreenProps) {
  const style = (coachStyle?.toUpperCase() || 'PULSE') as keyof typeof COACH_NAMES;
  const validStyle = COACH_NAMES[style] ? style : 'PULSE';
  const isValid = totalTime >= MIN_VALID_SIM_SECONDS;

  const message = useMemo(() => {
    const pool = isValid ? VALID_MESSAGES[validStyle] : INVALID_MESSAGES[validStyle];
    return pickRandom(pool);
  }, [isValid, validStyle]);

  const coachName = COACH_NAMES[validStyle];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm p-6"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20 }}
        className="w-full max-w-md space-y-6 text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: 'spring', damping: 12 }}
          className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${
            isValid ? 'bg-primary/20' : 'bg-destructive/20'
          }`}
        >
          {isValid ? (
            <Trophy className="w-10 h-10 text-primary" />
          ) : (
            <AlertTriangle className="w-10 h-10 text-destructive" />
          )}
        </motion.div>

        {/* Time */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-1">
            {isValid ? 'Simulado Concluído' : 'Simulado Não Validado'}
          </p>
          <p className={`text-5xl font-bold font-mono ${isValid ? 'text-primary' : 'text-destructive'}`}>
            {formatTime(totalTime)}
          </p>
          {roxzoneTime > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Roxzone: {formatTime(roxzoneTime)}
            </p>
          )}
        </motion.div>

        {/* Coach message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className={`rounded-xl p-5 text-left ${
            isValid
              ? 'bg-primary/5 border border-primary/20'
              : 'bg-destructive/5 border border-destructive/20'
          }`}
        >
          <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${
            isValid ? 'text-primary' : 'text-destructive'
          }`}>
            Coach {coachName}
          </p>
          <p className={`text-sm leading-relaxed ${
            isValid ? 'text-foreground' : 'text-destructive'
          }`}>
            {message}
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <Button
            onClick={onContinue}
            className="w-full h-12 text-base font-semibold gap-2"
          >
            Continuar
            <ArrowRight className="w-4 h-4" />
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
