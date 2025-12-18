import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { type TrainingLevel, type SessionDuration, OPTIONAL_EQUIPMENT_LIST } from '@/types/outlier';
import { ArrowLeft, Zap, TrendingUp, Target, AlertCircle, Settings2, ChevronDown } from 'lucide-react';
import { useAdaptationPipeline } from '@/hooks/useAdaptationPipeline';
import { toast } from 'sonner';

// Níveis de treino - sem métricas visíveis
const trainingLevelOptions: { value: TrainingLevel; label: string; description: string; icon: typeof Zap }[] = [
  { 
    value: 'base', 
    label: 'BASE', 
    description: 'Movimentos fundamentais com foco em técnica e controle',
    icon: Target
  },
  { 
    value: 'progressivo', 
    label: 'PROGRESSIVO', 
    description: 'Ritmo consistente com estímulo sustentável e evolutivo',
    icon: TrendingUp
  },
  { 
    value: 'performance', 
    label: 'PERFORMANCE', 
    description: 'Alta intensidade com desafio máximo',
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
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
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
  // Equipamentos opcionais que o atleta NÃO possui (por padrão assume que tem todos)
  const [unavailableEquipment, setUnavailableEquipment] = useState<string[]>(athleteConfig?.unavailableEquipment || []);
  const [showEquipmentSettings, setShowEquipmentSettings] = useState(false);

  const handleSubmit = () => {
    if (!coachStyle) {
      toast.error('Selecione um estilo de coach primeiro');
      return;
    }

    // Salvar configuração - assume todos equipamentos disponíveis por padrão
    const allEquipmentIds = OPTIONAL_EQUIPMENT_LIST.map(e => e.id);
    const availableEquipment = allEquipmentIds.filter(id => !unavailableEquipment.includes(id));
    
    const newConfig = {
      trainingLevel,
      sessionDuration: duration,
      equipment: availableEquipment, // Equipamentos que o atleta TEM
      unavailableEquipment, // Equipamentos que o atleta NÃO tem
      coachStyle,
      altura: altura ? parseInt(altura) : undefined,
      peso: peso ? parseFloat(peso) : undefined,
      idade: idade ? parseInt(idade) : undefined,
      sexo,
    };
    
    setAthleteConfig(newConfig);

    // Gerar treino adaptado se houver planilha base
    // Passa config diretamente para evitar race condition com o store
    if (hasBaseWorkouts) {
      const result = generateAdaptedWorkouts({ overrideConfig: newConfig });
      if (result.success) {
        toast.success('Treino calibrado para você!');
      }
    }

    setCurrentView('dashboard');
  };

  // Toggle de equipamento indisponível (marca/desmarca como NÃO disponível)
  const toggleUnavailableEquipment = (equipId: string) => {
    setUnavailableEquipment(prev => 
      prev.includes(equipId) 
        ? prev.filter(id => id !== equipId) // Agora tem o equipamento
        : [...prev, equipId] // Não tem o equipamento
    );
  };

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
                    flex-1 px-3 py-3 rounded-lg border transition-all duration-200 text-sm
                    ${sexo === option.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card hover:border-muted-foreground/50'
                    }
                  `}
                >
                  {option.label.charAt(0)}
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
          Escolha o estímulo ideal para você hoje.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {trainingLevelOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => setTrainingLevel(option.value)}
                className={`
                  p-4 rounded-lg border transition-all duration-200 text-left
                  ${trainingLevel === option.value
                    ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary/30'
                    : 'border-border bg-card hover:border-muted-foreground/50'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-5 h-5 ${trainingLevel === option.value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className="font-display text-lg">{option.label}</span>
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

      {/* Optional Equipment Settings (collapsed by default) */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-12"
      >
        <button
          onClick={() => setShowEquipmentSettings(!showEquipmentSettings)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <Settings2 className="w-4 h-4" />
          <span className="text-sm">Ajustes de equipamento (opcional)</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showEquipmentSettings ? 'rotate-180' : ''}`} />
        </button>
        
        <AnimatePresence>
          {showEquipmentSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <p className="text-xs text-muted-foreground mt-4 mb-3">
                Por padrão, assumimos que você tem acesso a todos os equipamentos HYROX. 
                Desmarque apenas os que você não possui.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {OPTIONAL_EQUIPMENT_LIST.map((equip) => {
                  const isAvailable = !unavailableEquipment.includes(equip.id);
                  return (
                    <button
                      key={equip.id}
                      onClick={() => toggleUnavailableEquipment(equip.id)}
                      className={`
                        p-3 rounded-lg border transition-all duration-200 text-left
                        ${isAvailable
                          ? 'border-primary/50 bg-primary/5 text-foreground'
                          : 'border-border bg-card text-muted-foreground opacity-50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{equip.emoji}</span>
                        <span className="text-sm">{equip.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
