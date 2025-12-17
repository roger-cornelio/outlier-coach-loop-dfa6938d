import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { LEVEL_NAMES, type AthleteLevel, type SessionDuration } from '@/types/outlier';
import { ArrowLeft } from 'lucide-react';

const levelOptions: AthleteLevel[] = ['iniciante', 'intermediario', 'avancado', 'hyrox_pro'];
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

export function AthleteConfig() {
  const { coachStyle, athleteConfig, setAthleteConfig, setCurrentView } = useOutlierStore();
  
  // Use existing values as defaults
  const [level, setLevel] = useState<AthleteLevel>(athleteConfig?.level || 'intermediario');
  const [duration, setDuration] = useState<SessionDuration>(athleteConfig?.sessionDuration || 60);
  const [altura, setAltura] = useState(athleteConfig?.altura?.toString() || '');
  const [peso, setPeso] = useState(athleteConfig?.peso?.toString() || '');
  const [idade, setIdade] = useState(athleteConfig?.idade?.toString() || '');
  const [sexo, setSexo] = useState<'masculino' | 'feminino' | ''>(athleteConfig?.sexo || '');

  const handleSubmit = () => {
    if (coachStyle) {
      setAthleteConfig({
        level,
        sessionDuration: duration,
        equipment: [],
        coachStyle,
        altura: altura ? parseInt(altura) : undefined,
        peso: peso ? parseFloat(peso) : undefined,
        idade: idade ? parseInt(idade) : undefined,
        sexo: sexo || undefined,
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
        </div>
      </motion.section>

      {/* Level Selection */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h2 className="font-display text-2xl mb-4">NÍVEL DO ATLETA</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {levelOptions.map((option) => (
            <button
              key={option}
              onClick={() => setLevel(option)}
              className={`
                p-4 rounded-lg border transition-all duration-200
                ${level === option
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card hover:border-muted-foreground/50'
                }
              `}
            >
              <span className="font-display text-lg">{LEVEL_NAMES[option]}</span>
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
