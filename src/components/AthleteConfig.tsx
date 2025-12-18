import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { DIFFICULTY_NAMES, type TrainingDifficulty, type SessionDuration, type AthleteCountry } from '@/types/outlier';
import { COUNTRY_NAMES } from '@/utils/nationalPodiumThresholds';
import { ArrowLeft } from 'lucide-react';

const difficultyOptions: { value: TrainingDifficulty; label: string; description: string }[] = [
  { value: 'leve', label: 'Leve', description: 'Volume e intensidade reduzidos' },
  { value: 'padrao', label: 'Padrão', description: 'Conforme seu status atual' },
  { value: 'forte', label: 'Forte', description: 'Volume e intensidade aumentados' },
];

const durationOptions: { value: SessionDuration; label: string }[] = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
  { value: 'ilimitado', label: 'Ilimitado' },
];

const sexOptions = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
];

const countryOptions: { value: AthleteCountry; label: string }[] = Object.entries(COUNTRY_NAMES).map(
  ([value, label]) => ({ value: value as AthleteCountry, label })
);

export function AthleteConfig() {
  const { coachStyle, athleteConfig, setAthleteConfig, setCurrentView } = useOutlierStore();
  
  // Use existing values as defaults
  const [difficulty, setDifficulty] = useState<TrainingDifficulty>(athleteConfig?.trainingDifficulty || 'padrao');
  const [duration, setDuration] = useState<SessionDuration>(athleteConfig?.sessionDuration || 60);
  const [altura, setAltura] = useState(athleteConfig?.altura?.toString() || '');
  const [peso, setPeso] = useState(athleteConfig?.peso?.toString() || '');
  const [idade, setIdade] = useState(athleteConfig?.idade?.toString() || '');
  const [sexo, setSexo] = useState<'masculino' | 'feminino' | ''>(athleteConfig?.sexo || '');
  const [pais, setPais] = useState<AthleteCountry>(athleteConfig?.pais || 'BR');

  const handleSubmit = () => {
    if (coachStyle) {
      setAthleteConfig({
        trainingDifficulty: difficulty,
        sessionDuration: duration,
        equipment: [],
        coachStyle,
        altura: altura ? parseInt(altura) : undefined,
        peso: peso ? parseFloat(peso) : undefined,
        idade: idade ? parseInt(idade) : undefined,
        sexo: sexo || undefined,
        pais,
      });
      setCurrentView('dashboard');
    }
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
          onClick={() => setCurrentView('welcome')}
          className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-4xl">CONFIGURAÇÃO</h1>
          <p className="text-muted-foreground">Personalize seu perfil de atleta</p>
        </div>
      </motion.div>

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

          {/* País */}
          <div className="col-span-2 md:col-span-4">
            <label className="block text-sm text-muted-foreground mb-2">País (para régua PRO)</label>
            <div className="flex flex-wrap gap-2">
              {countryOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPais(option.value)}
                  className={`
                    px-4 py-2 rounded-lg border transition-all duration-200 text-sm
                    ${pais === option.value
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card hover:border-muted-foreground/50'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              A régua de atletas PRO é calibrada pelo pódio nacional do seu país
            </p>
          </div>
        </div>
      </motion.section>

      {/* Difficulty Selection */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h2 className="font-display text-2xl mb-2">DIFICULDADE DO TREINO</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Ajusta volume e intensidade em relação ao seu status calculado
        </p>
        <div className="grid grid-cols-3 gap-3">
          {difficultyOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setDifficulty(option.value)}
              className={`
                p-4 rounded-lg border transition-all duration-200 text-left
                ${difficulty === option.value
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card hover:border-muted-foreground/50'
                }
              `}
            >
              <span className="font-display text-lg block">{option.label}</span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
            </button>
          ))}
        </div>
      </motion.section>

      {/* Duration Selection */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-12"
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

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <button
          onClick={handleSubmit}
          className="flex-1 font-display text-xl tracking-wider px-8 py-4 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          IR PARA DASHBOARD
        </button>
        <button
          onClick={() => setCurrentView('welcome')}
          className="px-8 py-4 rounded-lg border border-border hover:bg-secondary transition-colors font-body"
        >
          Voltar
        </button>
      </motion.div>
    </div>
  );
}
