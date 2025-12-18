import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { type TrainingLevel, type SessionDuration, EQUIPMENT_LIST } from '@/types/outlier';
import { ArrowLeft, Zap, TrendingUp, Target, AlertCircle } from 'lucide-react';
import { useAdaptationPipeline } from '@/hooks/useAdaptationPipeline';
import { toast } from 'sonner';

// NOVO: Níveis de treino baseados no prompt OUTLIER
const trainingLevelOptions: { value: TrainingLevel; label: string; description: string; multiplier: string; icon: typeof Zap }[] = [
  { 
    value: 'base', 
    label: 'BASE', 
    description: 'Volume reduzido, movimentos simplificados, mais controle',
    multiplier: '65%',
    icon: Target
  },
  { 
    value: 'progressivo', 
    label: 'PROGRESSIVO', 
    description: 'Ritmo consistente, estímulo sustentável e evolutivo',
    multiplier: '80%',
    icon: TrendingUp
  },
  { 
    value: 'performance', 
    label: 'PERFORMANCE', 
    description: 'Alta densidade, ritmos agressivos, estímulo máximo',
    multiplier: '100%',
    icon: Zap
  },
];

const durationOptions: { value: SessionDuration; label: string }[] = [
  { value: 45, label: 'até 45 min' },
  { value: 60, label: 'até 60 min' },
  { value: 90, label: 'até 90 min' },
  { value: 'ilimitado', label: 'Sem limite' },
];

const sexOptions = [
  { value: 'masculino', label: 'Masculino', multiplier: '100%' },
  { value: 'feminino', label: 'Feminino', multiplier: '85%' },
];

export function AthleteConfig() {
  const { coachStyle, athleteConfig, setAthleteConfig, setCurrentView, baseWorkouts } = useOutlierStore();
  const { generateAdaptedWorkouts, hasBaseWorkouts } = useAdaptationPipeline();
  
  // Use existing values as defaults
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>(
    athleteConfig?.trainingLevel || athleteConfig?.trainingDifficulty || 'progressivo'
  );
  const [duration, setDuration] = useState<SessionDuration>(athleteConfig?.sessionDuration || 60);
  const [altura, setAltura] = useState(athleteConfig?.altura?.toString() || '');
  const [peso, setPeso] = useState(athleteConfig?.peso?.toString() || '');
  const [idade, setIdade] = useState(athleteConfig?.idade?.toString() || '');
  const [sexo, setSexo] = useState<'masculino' | 'feminino'>(athleteConfig?.sexo || 'masculino');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(athleteConfig?.equipment || []);

  const handleSubmit = () => {
    if (!coachStyle) {
      toast.error('Selecione um estilo de coach primeiro');
      return;
    }

    // Salvar configuração
    const newConfig = {
      trainingLevel,
      sessionDuration: duration,
      equipment: selectedEquipment,
      coachStyle,
      altura: altura ? parseInt(altura) : undefined,
      peso: peso ? parseFloat(peso) : undefined,
      idade: idade ? parseInt(idade) : undefined,
      sexo,
    };
    
    setAthleteConfig(newConfig);

    // Gerar treino adaptado se houver planilha base
    if (hasBaseWorkouts) {
      // Pequeno delay para garantir que o store atualizou
      setTimeout(() => {
        const result = generateAdaptedWorkouts();
        if (result.success && result.summary) {
          const levelPercent = Math.round(result.summary.levelMultiplier * 100);
          const genderPercent = Math.round(result.summary.genderMultiplier * 100);
          const finalPercent = Math.round(result.summary.levelMultiplier * result.summary.genderMultiplier * 100);
          
          toast.success('Treino adaptado!', {
            description: `${finalPercent}% do volume (${trainingLevel.toUpperCase()} + ${sexo === 'feminino' ? 'F' : 'M'})`,
          });
        }
      }, 100);
    }

    setCurrentView('dashboard');
  };

  const toggleEquipment = (equipId: string) => {
    setSelectedEquipment(prev => 
      prev.includes(equipId) 
        ? prev.filter(id => id !== equipId)
        : [...prev, equipId]
    );
  };

  // Calcular multiplicador final para preview
  const levelMult = trainingLevel === 'base' ? 0.65 : trainingLevel === 'progressivo' ? 0.80 : 1.00;
  const genderMult = sexo === 'feminino' ? 0.85 : 1.00;
  const finalMult = Math.round(levelMult * genderMult * 100);

  return (
    <div className="min-h-screen px-6 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        <button
          onClick={() => setCurrentView('dashboard')}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-4xl">CONFIGURAÇÃO</h1>
          <p className="text-muted-foreground">Ajuste seu treino</p>
        </div>
      </motion.div>

      {/* Volume Preview Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 p-4 rounded-lg bg-primary/10 border border-primary/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Volume do seu treino</p>
              <p className="font-display text-2xl text-primary">{finalMult}%</p>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p>{trainingLevel.toUpperCase()}: {Math.round(levelMult * 100)}%</p>
            <p>{sexo === 'feminino' ? 'Feminino' : 'Masculino'}: {Math.round(genderMult * 100)}%</p>
          </div>
        </div>
      </motion.div>

      {/* Warning if no base workouts */}
      {!hasBaseWorkouts && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-amber-500">Sem treinos disponíveis</p>
            <p className="text-sm text-muted-foreground">
              Aguarde seu coach publicar a programação da semana.
            </p>
          </div>
        </motion.div>
      )}

      {/* Athlete Data */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8"
      >
        <h2 className="font-display text-2xl mb-4">DADOS DO ATLETA</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Altura */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Altura (cm)</label>
            <input
              type="number"
              value={altura}
              onChange={(e) => setAltura(e.target.value)}
              placeholder="175"
              min="100"
              max="250"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border font-body text-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Peso */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Peso (kg)</label>
            <input
              type="number"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              placeholder="75"
              min="30"
              max="200"
              step="0.1"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border font-body text-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Idade */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Idade</label>
            <input
              type="number"
              value={idade}
              onChange={(e) => setIdade(e.target.value)}
              placeholder="30"
              min="14"
              max="100"
              className="w-full px-4 py-3 rounded-lg bg-secondary border border-border font-body text-lg focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Sexo */}
          <div>
            <label className="block text-sm text-muted-foreground mb-2">Sexo</label>
            <div className="flex gap-2">
              {sexOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSexo(option.value as 'masculino' | 'feminino')}
                  className={`
                    flex-1 px-3 py-3 rounded-lg border transition-all duration-200 text-sm relative
                    ${sexo === option.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card hover:border-muted-foreground/50'
                    }
                  `}
                >
                  {option.label.charAt(0)}
                  {sexo === option.value && (
                    <span className="absolute -top-2 -right-2 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                      {option.multiplier}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Training Level Selection - NOVO SISTEMA OUTLIER */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h2 className="font-display text-2xl mb-2">NÍVEL DO TREINO</h2>
        <p className="text-sm text-muted-foreground mb-4">
          A planilha do coach representa PERFORMANCE (100%). Escolha seu nível para hoje.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {trainingLevelOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setTrainingLevel(option.value)}
                className={`
                  p-4 rounded-lg border transition-all duration-200 text-left relative
                  ${trainingLevel === option.value
                    ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary/30'
                    : 'border-border bg-card hover:border-muted-foreground/50'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${trainingLevel === option.value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-display text-lg">{option.label}</span>
                  <span className={`ml-auto text-sm font-mono ${trainingLevel === option.value ? 'text-primary' : 'text-muted-foreground'}`}>
                    {option.multiplier}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground leading-relaxed">{option.description}</span>
              </button>
            );
          })}
        </div>
      </motion.section>

      {/* Duration Selection */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <h2 className="font-display text-2xl mb-4">TEMPO DISPONÍVEL</h2>
        <div className="flex flex-wrap gap-3">
          {durationOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setDuration(option.value)}
              className={`
                px-6 py-3 rounded-lg border transition-all duration-200
                ${duration === option.value
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card hover:border-muted-foreground/50'
                }
              `}
            >
              <span className="font-body font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </motion.section>

      {/* Equipment Selection */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-12"
      >
        <h2 className="font-display text-2xl mb-2">EQUIPAMENTOS DISPONÍVEIS</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Marque os equipamentos que você tem acesso hoje.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {EQUIPMENT_LIST.map((equip) => (
            <button
              key={equip.id}
              onClick={() => toggleEquipment(equip.id)}
              className={`
                p-3 rounded-lg border transition-all duration-200 text-left
                ${selectedEquipment.includes(equip.id)
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card hover:border-muted-foreground/50 opacity-60'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{equip.emoji}</span>
                <span className="text-sm">{equip.name}</span>
              </div>
            </button>
          ))}
        </div>
      </motion.section>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <button
          onClick={handleSubmit}
          className="flex-1 font-display text-xl tracking-wider px-8 py-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          {hasBaseWorkouts ? 'GERAR TREINO ADAPTADO' : 'IR PARA DASHBOARD'}
        </button>
        <button
          onClick={() => setCurrentView('dashboard')}
          className="px-8 py-4 rounded-lg border border-border hover:bg-secondary transition-colors font-body"
        >
          Voltar
        </button>
      </motion.div>
    </div>
  );
}
