import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOutlierStore } from '@/store/outlierStore';
import { EQUIPMENT_LIST, LEVEL_NAMES, type AthleteLevel, type SessionDuration } from '@/types/outlier';
import { ArrowLeft, Check } from 'lucide-react';

const levelOptions: AthleteLevel[] = ['iniciante', 'intermediario', 'avancado', 'hyrox_pro'];
const durationOptions: { value: SessionDuration; label: string }[] = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
  { value: 'ilimitado', label: 'Ilimitado' },
];

export function AthleteConfig() {
  const { coachStyle, setAthleteConfig, setCurrentView } = useOutlierStore();
  const [level, setLevel] = useState<AthleteLevel>('intermediario');
  const [duration, setDuration] = useState<SessionDuration>(60);
  const [equipment, setEquipment] = useState<string[]>([]);

  const toggleEquipment = (id: string) => {
    setEquipment((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (coachStyle) {
      setAthleteConfig({
        level,
        sessionDuration: duration,
        equipment,
        coachStyle,
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

      {/* Level Selection */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
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
        transition={{ delay: 0.2 }}
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
        transition={{ delay: 0.3 }}
        className="mb-12"
      >
        <h2 className="font-display text-2xl mb-4">EQUIPAMENTOS DISPONÍVEIS</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {EQUIPMENT_LIST.map((item) => (
            <button
              key={item.id}
              onClick={() => toggleEquipment(item.id)}
              className={`
                p-4 rounded-lg border transition-all duration-200 text-left flex items-center gap-3
                ${equipment.includes(item.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-muted-foreground/50'
                }
              `}
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="font-body text-sm flex-1">{item.name}</span>
              {equipment.includes(item.id) && (
                <Check className="w-4 h-4 text-primary" />
              )}
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
