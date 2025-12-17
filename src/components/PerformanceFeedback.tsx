import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import type { PerformanceRating, CoachStyle } from '@/types/outlier';
import { Flame, CheckCircle, AlertTriangle, XCircle, ArrowLeft, Home, Settings } from 'lucide-react';

const ratingConfig: Record<PerformanceRating, { icon: React.ReactNode; label: string; colorClass: string }> = {
  excellent: {
    icon: <Flame className="w-12 h-12" />,
    label: 'EXCELENTE',
    colorClass: 'text-status-excellent',
  },
  good: {
    icon: <CheckCircle className="w-12 h-12" />,
    label: 'DENTRO DO ESPERADO',
    colorClass: 'text-status-good',
  },
  attention: {
    icon: <AlertTriangle className="w-12 h-12" />,
    label: 'ATENÇÃO',
    colorClass: 'text-status-attention',
  },
  below: {
    icon: <XCircle className="w-12 h-12" />,
    label: 'ABAIXO DO ESPERADO',
    colorClass: 'text-status-below',
  },
};

const coachMessages: Record<CoachStyle, Record<PerformanceRating, { main: string; suggestions: string[] }>> = {
  IRON: {
    excellent: {
      main: 'Resultado sólido. Você provou que está no caminho certo. Não relaxe.',
      suggestions: ['Mantenha a consistência', 'Aumente a intensidade no próximo ciclo', 'Registre esse benchmark'],
    },
    good: {
      main: 'Aceitável. Você cumpriu o esperado. Agora é hora de superar.',
      suggestions: ['Revise seu pacing', 'Trabalhe os pontos fracos', 'Próximo treino: sem desculpas'],
    },
    attention: {
      main: 'Não foi bom o suficiente. Identifique onde perdeu tempo e corrija.',
      suggestions: ['Analise cada transição', 'Foque na respiração', 'Descanse adequadamente'],
    },
    below: {
      main: 'Abaixo do aceitável. Você é melhor que isso. Prove.',
      suggestions: ['Revise alimentação e sono', 'Considere reduzir volume temporariamente', 'Foco total no próximo'],
    },
  },
  PULSE: {
    excellent: {
      main: 'Incrível! Você se superou hoje. Esse é o resultado de consistência e dedicação.',
      suggestions: ['Celebre essa conquista', 'Use isso como motivação', 'Continue o bom trabalho'],
    },
    good: {
      main: 'Bom trabalho! Você está evoluindo no ritmo certo. Continue firme.',
      suggestions: ['Pequenos ajustes fazem diferença', 'Confie no processo', 'O próximo vai ser ainda melhor'],
    },
    attention: {
      main: 'Dia difícil, mas você terminou. Isso já é uma vitória. Vamos analisar juntos.',
      suggestions: ['Todo treino ensina algo', 'Como estava seu corpo hoje?', 'Descanso é parte do treino'],
    },
    below: {
      main: 'Nem todo dia é perfeito, e tudo bem. O importante é não desistir.',
      suggestions: ['Ouça seu corpo', 'Amanhã é uma nova chance', 'Você é mais forte do que pensa'],
    },
  },
  SPARK: {
    excellent: {
      main: '🔥 BOOOOM! Você destruiu esse WOD! Isso sim é performance de outlier!',
      suggestions: ['Hora de comemorar! 🎉', 'Print no story, você merece', 'Próximo desafio: manter esse nível'],
    },
    good: {
      main: 'Muito bom! Treino sólido, atleta! Você está no jogo! 💪',
      suggestions: ['Bora para o próximo!', 'Cada treino conta', 'A evolução é real'],
    },
    attention: {
      main: 'Ei, nem todo dia a gente arrebenta, né? Faz parte! O importante é ter feito. 🤝',
      suggestions: ['Descansa direito hoje', 'Hidratação em dia?', 'Amanhã você volta mais forte'],
    },
    below: {
      main: 'Opa, dia complicado! Mas calma, campeão não é feito em um dia. 💫',
      suggestions: ['Respira fundo', 'Analisa o que rolou', 'Volta com tudo no próximo!'],
    },
  },
};

export function PerformanceFeedback() {
  const { selectedWorkout, workoutResults, athleteConfig, setCurrentView } = useOutlierStore();

  const feedback = useMemo(() => {
    if (!selectedWorkout || !athleteConfig) return null;

    const mainWod = selectedWorkout.blocks.find((b) => b.isMainWod);
    if (!mainWod) return null;

    const latestResult = workoutResults
      .filter((r) => r.blockId === mainWod.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!latestResult) return null;

    let rating: PerformanceRating = 'good';

    if (!latestResult.completed) {
      rating = 'below';
    } else if (latestResult.timeInSeconds && mainWod.referenceTime) {
      const reference = mainWod.referenceTime[athleteConfig.level];
      const ratio = latestResult.timeInSeconds / reference;

      if (ratio <= 0.9) rating = 'excellent';
      else if (ratio <= 1.1) rating = 'good';
      else if (ratio <= 1.3) rating = 'attention';
      else rating = 'below';
    }

    const messages = coachMessages[athleteConfig.coachStyle][rating];

    return {
      rating,
      time: latestResult.timeInSeconds,
      completed: latestResult.completed,
      referenceTime: mainWod.referenceTime?.[athleteConfig.level],
      messages,
    };
  }, [selectedWorkout, workoutResults, athleteConfig]);

  if (!feedback || !athleteConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Nenhum resultado para exibir</p>
      </div>
    );
  }

  const config = ratingConfig[feedback.rating];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('dashboard')}
              className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-display text-2xl">FEEDBACK</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          {/* Rating Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className={`inline-flex p-6 rounded-full bg-secondary mb-6 ${config.colorClass}`}
          >
            {config.icon}
          </motion.div>

          {/* Rating Label */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className={`font-display text-4xl mb-2 ${config.colorClass}`}
          >
            {config.label}
          </motion.h2>

          {/* Time Comparison */}
          {feedback.time && feedback.referenceTime && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mb-6"
            >
              <p className="text-2xl font-display mb-1">{formatTime(feedback.time)}</p>
              <p className="text-muted-foreground text-sm">
                Referência: {formatTime(feedback.referenceTime)}
              </p>
            </motion.div>
          )}

          {/* Coach Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card-elevated p-6 mb-6 text-left"
          >
            <p className="text-foreground mb-4 leading-relaxed">
              {feedback.messages.main}
            </p>
            <ul className="space-y-2">
              {feedback.messages.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-muted-foreground text-sm">
                  <span className="text-primary mt-0.5">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Coach Badge */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-sm text-muted-foreground mb-8"
          >
            Coach {athleteConfig.coachStyle}
          </motion.p>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex gap-4"
          >
            <button
              onClick={() => setCurrentView('dashboard')}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg bg-primary text-primary-foreground font-display text-lg hover:opacity-90 transition-opacity"
            >
              <Home className="w-5 h-5" />
              DASHBOARD
            </button>
            <button
              onClick={() => setCurrentView('config')}
              className="px-6 py-4 rounded-lg border border-border hover:bg-secondary transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
